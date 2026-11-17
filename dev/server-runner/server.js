// The track-writing runner service: a small HTTP API in front of runner.js. No framework.
//
//   POST   /jobs              submit a job (JSON body, see README)            -> 202 { id, state }
//   GET    /jobs/:id          state, progress, log lines, error               -> 200
//   GET    /jobs/:id/result   the finished track(s) and changed saved data    -> 200 (409 until the job is done)
//   DELETE /jobs/:id          cancel (if running) and purge                   -> 200 { deleted: true }
//
// Every request except the CORS preflight needs the header x-runner-token equal to the environment variable RUNNER_TOKEN. Jobs run one at a time (one Chromium per
// instance); the rest wait in a short queue. A job's credentials (access code / Gemini key) are held in memory for that job only and are scrubbed from everything
// that is stored or returned. Results are kept RUNNER_RESULT_TTL_SEC (24 h) and then purged.
'use strict'
const http = require('http')
const crypto = require('crypto')
const os = require('os')
const path = require('path')
const { makeScrubber } = require('./scrub')
const { MemoryFileStore, SAFE_ID } = require('./store')
const { validateJob } = require('./jobspec')
const { runJob, loadConfig, RunnerError } = require('./runner')

const LOG_KEEP = 300

function loadServerConfig(env) {
  env = env || process.env
  const num = (v, d) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : d }
  return {
    token: env.RUNNER_TOKEN || '',
    origins: String(env.RUNNER_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean),
    port: num(env.PORT || env.RUNNER_PORT, 8080),
    dataDir: env.RUNNER_DATA_DIR === '' ? null : (env.RUNNER_DATA_DIR || path.join(os.tmpdir(), 'lt-runner-jobs')),
    maxBodyBytes: num(env.RUNNER_MAX_BODY_BYTES, 8 * 1024 * 1024),
    maxQueue: num(env.RUNNER_MAX_QUEUE, 5),
    resultTtlSec: num(env.RUNNER_RESULT_TTL_SEC, 24 * 3600),
    sweepSec: num(env.RUNNER_SWEEP_SEC, 60),
    allowedModelHosts: String(env.RUNNER_ALLOWED_MODEL_HOSTS || '').split(',').map(s => s.trim()).filter(Boolean),
    runner: loadConfig(env),
  }
}

const sameToken = (a, b) => {
  const x = crypto.createHash('sha256').update(String(a || '')).digest(), y = crypto.createHash('sha256').update(String(b || '')).digest()
  return crypto.timingSafeEqual(x, y) && String(b || '').length > 0
}

// opts: { config, store, run }  (run is the job function, replaced in tests; default is runner.runJob)
function createServer(opts) {
  opts = opts || {}
  const cfg = opts.config || loadServerConfig(process.env)
  if (!cfg.token) throw new Error('RUNNER_TOKEN is not set: the runner refuses to start without a shared secret')
  const store = opts.store || new MemoryFileStore(cfg.dataDir)
  const run = opts.run || runJob
  const live = new Map()          // id -> { rec, spec (secrets: memory only), controller }
  const queue = []
  let working = false, closed = false

  const now = () => Date.now()
  const iso = t => new Date(t).toISOString()

  async function persist(rec) { try { await store.put(rec.id, rec) } catch (e) { /* storage trouble must not stop a job */ } }
  const publicView = (rec, position) => ({ id: rec.id, state: rec.state, language: rec.language, mode: rec.mode, createdAt: rec.createdAt, startedAt: rec.startedAt || null,
    finishedAt: rec.finishedAt || null, expiresAt: rec.expiresAt || null, queuePosition: position != null ? position : null, progress: rec.progress, log: rec.log.slice(-LOG_KEEP), error: rec.error || null })

  // startup: anything a previous process left unfinished cannot be resumed (its credentials were in that process's memory only)
  const ready = (async () => {
    for (const id of await store.listIds()) {
      const rec = await store.get(id); if (!rec) continue
      if (rec.state === 'queued' || rec.state === 'running') {
        rec.state = 'failed'; rec.finishedAt = iso(now()); rec.expiresAt = iso(now() + cfg.resultTtlSec * 1000)
        rec.error = 'the runner restarted before this job finished; submit it again'; await persist(rec)
      }
    }
  })()

  async function pump() {
    if (working || closed) return
    const id = queue.shift(); if (!id) return
    const item = live.get(id); if (!item) return pump()
    working = true
    const rec = item.rec
    rec.state = 'running'; rec.startedAt = iso(now()); await persist(rec)
    const scrub = item.scrub
    let lastWrite = 0
    const hooks = {
      signal: item.controller.signal,
      onLog: line => { rec.log.push(scrub.text(line)); if (rec.log.length > 2 * LOG_KEEP) rec.log.splice(0, rec.log.length - LOG_KEEP) },
      onProgress: patch => { rec.progress = Object.assign({}, rec.progress, scrub.deep(patch)); if (now() - lastWrite > 3000) { lastWrite = now(); persist(rec) } },
    }
    try {
      const result = await run(item.spec, hooks, cfg.runner)
      if (!item.purged) { rec.result = scrub.deep(result); rec.state = 'done'; rec.progress.phase = 'done' }
    } catch (e) {
      rec.state = 'failed'
      rec.error = scrub.text(e instanceof RunnerError || (e && e.code) ? String(e.message) : 'the job failed: ' + String((e && e.message) || e).split('\n')[0]).slice(0, 500)
      rec.progress.phase = 'failed'
    } finally {
      // the job's credentials leave memory with the job
      if (item.spec) { try { item.spec.model = null; item.spec.data = null } catch (e) {} }
      item.spec = null
      rec.finishedAt = iso(now()); rec.expiresAt = iso(now() + cfg.resultTtlSec * 1000)
      if (!item.purged) await persist(rec); else await store.delete(rec.id)
      live.delete(id)
      working = false
      setImmediate(pump)
    }
  }

  // purge: finished jobs after their time to live; also any record whose time has passed
  async function sweep() {
    for (const id of await store.listIds()) {
      const rec = await store.get(id); if (!rec) continue
      if (live.has(id)) continue
      const exp = rec.expiresAt ? Date.parse(rec.expiresAt) : Date.parse(rec.createdAt) + (cfg.resultTtlSec * 2 + 3600) * 1000
      if (exp <= now()) await store.delete(id)
    }
  }
  const sweeper = setInterval(() => { sweep().catch(() => {}) }, cfg.sweepSec * 1000); sweeper.unref()

  function send(res, status, obj, extraHeaders) {
    const b = obj === undefined ? '' : JSON.stringify(obj)
    res.writeHead(status, Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }, res.__cors || {}, extraHeaders || {}))
    res.end(b)
  }
  const fail = (res, status, code, message, extra) => send(res, status, Object.assign({ error: { code, message } }, extra || {}))

  function readBody(req, limit) {
    return new Promise((resolve, reject) => {
      const declared = Number(req.headers['content-length'])
      if (Number.isFinite(declared) && declared > limit) { req.resume(); return reject(Object.assign(new Error('too large'), { status: 413 })) }
      const chunks = []; let size = 0
      req.on('data', c => { size += c.length; if (size > limit) { req.destroy(); reject(Object.assign(new Error('too large'), { status: 413 })) } else chunks.push(c) })
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
      req.on('error', reject)
    })
  }

  async function handle(req, res) {
    const origin = req.headers.origin
    const originOk = !origin || cfg.origins.includes(origin)
    res.__cors = origin && originOk ? { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin' } : { 'Vary': 'Origin' }
    if (req.method === 'OPTIONS') {
      if (!origin || !originOk) { res.writeHead(403); return res.end() }
      res.writeHead(204, Object.assign({ 'Access-Control-Allow-Headers': 'Content-Type, x-runner-token', 'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS', 'Access-Control-Max-Age': '3600' }, res.__cors)); return res.end()
    }
    if (!originOk) return fail(res, 403, 'origin_not_allowed', 'this site is not allowed to use the runner (set RUNNER_ALLOWED_ORIGINS)')
    if (!sameToken(req.headers['x-runner-token'], cfg.token)) return fail(res, 401, 'unauthorized', 'missing or wrong x-runner-token')
    await ready
    const url = new URL(req.url, 'http://runner'), parts = url.pathname.split('/').filter(Boolean)
    if (parts[0] !== 'jobs' || parts.length > 3) return fail(res, 404, 'not_found', 'no such route')

    if (parts.length === 1) {
      if (req.method !== 'POST') return fail(res, 405, 'method_not_allowed', 'POST /jobs submits a job')
      if (closed) return fail(res, 503, 'shutting_down', 'the runner is shutting down')
      if (!/^application\/json\b/i.test(String(req.headers['content-type'] || ''))) return fail(res, 415, 'unsupported_media_type', 'send Content-Type: application/json')
      let raw
      try { raw = await readBody(req, cfg.maxBodyBytes) } catch (e) { return fail(res, e.status || 400, e.status === 413 ? 'request_too_large' : 'bad_request', e.status === 413 ? 'request body over ' + cfg.maxBodyBytes + ' bytes' : 'could not read the body') }
      let body; try { body = JSON.parse(raw) } catch (e) { return fail(res, 400, 'bad_json', 'the body is not JSON') }
      const v = validateJob(body, { allowLocalModel: cfg.runner.allowLocalModel, maxTimeLimitSec: cfg.runner.jobTimeLimitSec, allowedModelHosts: cfg.allowedModelHosts })
      if (!v.spec) {
        const sc = makeScrubber([body && body.model && body.model.accessCode, body && body.model && body.model.geminiKey])
        return fail(res, 400, 'invalid_job', 'the job is not valid', { details: v.errors.map(x => sc.text(x)) })
      }
      if (queue.length >= cfg.maxQueue) return fail(res, 429, 'queue_full', 'the runner has ' + queue.length + ' jobs waiting; try again later')
      const id = crypto.randomBytes(16).toString('hex')
      const createdAt = iso(now())
      const rec = { id, state: 'queued', language: v.spec.language, mode: v.spec.mode, createdAt, startedAt: null, finishedAt: null, expiresAt: iso(now() + (cfg.resultTtlSec * 2 + 3600) * 1000),
        progress: { phase: 'queued', wordsDone: 0, wordsTotal: 0, requests: 0, costUsd: 0 }, log: [], error: null, result: null }
      const scrub = makeScrubber([v.spec.model.accessCode, v.spec.model.geminiKey])
      live.set(id, { rec, spec: v.spec, controller: new AbortController(), scrub, purged: false })
      queue.push(id)
      await persist(rec)
      setImmediate(pump)
      return send(res, 202, { id, state: 'queued', queuePosition: queue.indexOf(id) + (working ? 1 : 0) })
    }

    const id = parts[1]
    if (!SAFE_ID.test(id)) return fail(res, 404, 'not_found', 'no such job')
    const item = live.get(id)
    const rec = item ? (item.purged ? null : item.rec) : await store.get(id)
    if (!rec) return fail(res, 404, 'not_found', 'no such job (it may have expired)')

    if (parts.length === 2 && req.method === 'GET') {
      const qp = queue.indexOf(id)
      return send(res, 200, publicView(rec, qp >= 0 ? qp + (working ? 1 : 0) : null))
    }
    if (parts.length === 3 && parts[2] === 'result' && req.method === 'GET') {
      if (rec.state !== 'done') return fail(res, 409, 'not_ready', rec.state === 'failed' ? 'the job failed' : 'the job is not finished', { state: rec.state, jobError: rec.error || null })
      return send(res, 200, rec.result)
    }
    if (parts.length === 2 && req.method === 'DELETE') {
      if (item) {
        item.purged = true
        const qi = queue.indexOf(id); if (qi >= 0) queue.splice(qi, 1)
        item.controller.abort()
        if (qi >= 0) { live.delete(id); item.spec = null }       // never started: nothing is running for it
      }
      await store.delete(id)
      return send(res, 200, { deleted: true })
    }
    return fail(res, 405, 'method_not_allowed', 'method not allowed here')
  }

  const server = http.createServer((req, res) => {
    handle(req, res).catch(e => { try { fail(res, 500, 'server_error', 'unexpected error') } catch (x) {} })
  })
  server.requestTimeout = 120000
  return {
    server, store, ready,
    listen: (port, host) => new Promise(r => server.listen(port === undefined ? cfg.port : port, host || '0.0.0.0', () => r(server.address().port))),
    close: async () => {
      closed = true; clearInterval(sweeper)
      for (const [, it] of live) { try { it.controller.abort() } catch (e) {} }
      await new Promise(r => { server.close(r); server.closeAllConnections && server.closeAllConnections() })
      // let a running job finish closing its browser
      for (let i = 0; i < 100 && working; i++) await new Promise(r => setTimeout(r, 100))
    },
    sweep, stats: () => ({ queued: queue.length, working, live: live.size }),
  }
}

module.exports = { createServer, loadServerConfig }

if (require.main === module) {
  const cfg = loadServerConfig(process.env)
  let app
  try { app = createServer({ config: cfg }) } catch (e) { console.error(e.message); process.exit(1) }
  app.listen().then(port => console.log('track runner listening on ' + port + ' (origins: ' + (cfg.origins.join(', ') || 'none') + ')'))
  const bye = () => { app.close().then(() => process.exit(0)) }
  process.on('SIGTERM', bye); process.on('SIGINT', bye)
}
