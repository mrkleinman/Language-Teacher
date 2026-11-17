// Tests for the track runner. Plain node, no framework:   node dev/server-runner/test/run.js   (from anywhere)
// Needs: playwright with its chromium, python3 (builds the page with dev/build_index.py into /tmp/runner-test, never a release folder), the stand-in model
// (test/fake-model-server.js). No real model, no key, no network: the page's only outside connection is the stand-in on 127.0.0.1.
//   A  a job is validated (languages, fields, storage keys, model settings, server address)
//   B  the service: token, CORS, body cap, queue (one at a time), lifecycle, cancel, purge, restart, secret scrubbing (no browser: the job function is replaced)
//   C  the real page in a real headless Chromium with the stand-in model: the Cantonese Daily and Revision flows, the AI review stage, failures, time limit, cancel,
//      the Gemini path, and a canary credential that must appear NOWHERE
//   D  the Thai Daily and Revision flows with the Thai stand-in (set RUNNER_TEST_SKIP_THAI=1 to skip: about 8 minutes), and the languages without a driver
'use strict'
const fs = require('fs'), os = require('os'), path = require('path'), http = require('http')
const { execFileSync, spawn } = require('child_process')
const { createServer, loadServerConfig } = require('../server')
const { runJob, loadConfig } = require('../runner')
const { validateJob, LANGUAGE_KEYS, allowedKeys } = require('../jobspec')
const { makeScrubber } = require('../scrub')
const { MemoryFileStore } = require('../store')
const { startFakeModel } = require('./fake-model-server')
const { thaiHandlers } = require('./thai-stand-in')

const ROOT = path.resolve(__dirname, '..', '..')
const PAGE_DIR = path.join(os.tmpdir(), 'runner-test'), PAGE = process.env.RUNNER_TEST_PAGE || path.join(PAGE_DIR, 'index.html')
const CANARY = 'CANARY-access-7f3a9c41d2e8', GKEY = ['AIza', 'SyCANARYgeminikey0123456789abcdef'].join('')   // made up at run time: a Gemini-key-shaped canary, never a real key, TOKEN = 'runner-token-CANARY-5521'
let n = 0, fails = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; console.log((pass ? 'PASS ' : 'FAIL ') + id + '  ' + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 600) : '')) }
const sleep = ms => new Promise(r => setTimeout(r, ms))
const tmpDir = p => fs.mkdtempSync(path.join(os.tmpdir(), 'lt-runner-test-' + p + '-'))

// everything the process prints while the tests run is kept, so a canary printed anywhere is found
const printed = []
for (const k of ['log', 'error', 'warn', 'info']) { const o = console[k].bind(console); console[k] = (...a) => { const s = a.map(String).join(' '); if (!/^(PASS|FAIL) /.test(s)) printed.push(s); o(...a) } }

async function http1(port, method, p, { token = TOKEN, body, headers, raw } = {}) {
  const h = Object.assign({}, headers || {}); if (token !== null) h['x-runner-token'] = token
  if (body !== undefined && !h['content-type']) h['content-type'] = 'application/json'
  const r = await fetch('http://127.0.0.1:' + port + p, { method, headers: h, body: raw !== undefined ? raw : body !== undefined ? JSON.stringify(body) : undefined })
  const text = await r.text(); let json = null; try { json = JSON.parse(text) } catch (e) {}
  return { status: r.status, json, text, headers: r.headers }
}
async function waitState(port, id, states, ms) {
  const t0 = Date.now(); let last = null
  while (Date.now() - t0 < (ms || 60000)) { const r = await http1(port, 'GET', '/jobs/' + id); last = r.json; if (r.json && states.includes(r.json.state)) return r.json; await sleep(150) }
  return last
}
const dirText = dir => fs.readdirSync(dir).map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n')

// the app's own Thai word bank, with every word it ships as "learning" marked as introduced and seen (so a Revision track has words to revise)
async function thaiSeedVocab() {
  const { chromium } = require('playwright')
  const D = path.join(ROOT, 'node_modules') + path.sep, rd = f => fs.readFileSync(D + f)
  const vend = [[/babel/, '@babel/standalone/babel.min.js'], [/react-dom/, 'react-dom/umd/react-dom.production.min.js'], [/unpkg\.com\/react@/, 'react/umd/react.production.min.js']]
  const b = await chromium.launch()
  try {
    const ctx = await b.newContext({ serviceWorkers: 'block' }), p = await ctx.newPage()
    await p.route('**/*', r => { const u = r.request().url(); for (const [rx, f] of vend) if (/unpkg|cdn/.test(u) && rx.test(u)) return r.fulfill({ status: 200, contentType: 'application/javascript', body: rd(f) }); return u.startsWith('file://') ? r.continue() : r.abort() })
    await p.addInitScript(() => { localStorage.setItem('tt-active-language', JSON.stringify('th')) })
    await p.goto('file://' + PAGE, { waitUntil: 'domcontentloaded' })
    await p.waitForFunction(() => typeof initVocab === 'function', null, { timeout: 180000 })
    return await p.evaluate(() => initVocab().map(w => w.status === 'learning' || w.status === 'known' ? Object.assign({}, w, { introducedAt: '2026-10-01', lastSeen: '2026-11-01', repCount: Math.max(3, w.repCount || 0) }) : w))
  } finally { await b.close() }
}

const BASE_JOB = { language: 'yue', mode: 'daily', model: { model: 'claude-haiku-5-5', serverUrl: 'https://example-model.run.app', accessCode: CANARY } }
const yueVocab = () => Array.from({ length: 60 }, (_, i) => ({ id: i + 1, status: 'learning', lastSeen: '2026-11-01', introducedAt: '2026-10-01', repCount: 3, okStreak: 1, dueDate: '2026-11-12' }))

;(async () => {
  // ───────────────────────────── A: validation
  {
    const ok = validateJob(Object.assign({}, BASE_JOB, { data: { 'tt-yue-vocab': yueVocab() } }), {})
    T('A1', 'a valid Cantonese job is accepted and normalised', !!ok.spec && ok.spec.language === 'yue' && ok.spec.model.accessCode === CANARY, ok.errors)
    T('A2', 'an unknown language is refused', !!validateJob(Object.assign({}, BASE_JOB, { language: 'xx' })).errors && !!validateJob(Object.assign({}, BASE_JOB, { language: 'ko' })).errors)
    T('A3', 'an unknown top-level field, mode or model field is refused', !!validateJob(Object.assign({}, BASE_JOB, { script: 'alert(1)' })).errors && !!validateJob(Object.assign({}, BASE_JOB, { mode: 'listening' })).errors
      && !!validateJob(Object.assign({}, BASE_JOB, { model: Object.assign({}, BASE_JOB.model, { extra: 1 }) })).errors)
    T('A4', 'a storage key of another language, a credential key or a path is refused as data', !!validateJob(Object.assign({}, BASE_JOB, { data: { 'tt-vocab': [] } })).errors
      && !!validateJob(Object.assign({}, BASE_JOB, { data: { 'tt-gemini-key': 'x' } })).errors && !!validateJob(Object.assign({}, BASE_JOB, { data: { '../x': [] } })).errors
      && !!validateJob(Object.assign({}, BASE_JOB, { data: { '__proto__': [] } })).errors === false)
    T('A5', 'data of the wrong shape is refused (vocabulary must be a list of objects, daily-new needs wordIds)', !!validateJob(Object.assign({}, BASE_JOB, { data: { 'tt-yue-vocab': 'x' } })).errors
      && !!validateJob(Object.assign({}, BASE_JOB, { data: { 'tt-yue-daily-new': { date: 'x' } } })).errors)
    const lm = Object.assign({}, BASE_JOB, { model: { model: 'claude-haiku-5-5', serverUrl: 'http://127.0.0.1:9', accessCode: CANARY } })
    T('A6', 'a server address on this computer is refused unless the runner allows it; http to the internet is always refused', !!validateJob(lm, {}).errors && !!validateJob(lm, { allowLocalModel: true }).spec
      && !!validateJob(Object.assign({}, BASE_JOB, { model: { model: 'claude-haiku-5-5', serverUrl: 'http://example.com', accessCode: CANARY } }), { allowLocalModel: true }).errors)
    T('A7', 'the optional model needs address + access code; a Gemini job needs a key; an unknown model is refused', !!validateJob(Object.assign({}, BASE_JOB, { model: { model: 'claude-haiku-5-5' } })).errors
      && !!validateJob(Object.assign({}, BASE_JOB, { model: { model: 'gemini-2.5-flash-lite' } })).errors && !!validateJob(Object.assign({}, BASE_JOB, { model: { model: 'gpt-x', serverUrl: 'https://a.b', accessCode: 'abcd' } })).errors
      && !!validateJob(Object.assign({}, BASE_JOB, { model: { model: 'gemini-2.5-flash-lite', geminiKey: GKEY } })).spec)
    T('A8', 'an allowed-hosts list restricts the model address', !!validateJob(BASE_JOB, { allowedModelHosts: ['other.run.app'] }).errors && !!validateJob(BASE_JOB, { allowedModelHosts: ['example-model.run.app'] }).spec)
    // the key table must match the page
    const src = fs.readFileSync(path.join(ROOT, 'tt.jsx'), 'utf8')
    const lit = re => { const m = re.exec(src); return m ? m[1] : null }
    const okKeys = [
      ['th vocab', lit(/stGet\('(tt-vocab)'\)/), LANGUAGE_KEYS.th.vocab], ['th tracks', lit(/stGet\('(tt-tracks)'\)/), LANGUAGE_KEYS.th.tracks], ['th daily-new', lit(/stGet\('(tt-daily-new)'\)/), LANGUAGE_KEYS.th.dailyNew],
      ['th settings', lit(/getItem\('(thaiTeacherSettings)'\)/), LANGUAGE_KEYS.th.extra[0]],
      ['ja', lit(/const JA = \{\s*vocab:'([^']+)'/), LANGUAGE_KEYS.ja.vocab], ['ja tracks', lit(/const JA = \{[^}]*?tracks:'([^']+)'/s), LANGUAGE_KEYS.ja.tracks], ['ja dailyNew', lit(/const JA = \{[^}]*?dailyNew:'([^']+)'/s), LANGUAGE_KEYS.ja.dailyNew],
      ['ja register', lit(/const JA = \{[^}]*?register:'([^']+)'/s), LANGUAGE_KEYS.ja.extra[0]],
      ['zh vocab', lit(/const ZH = \{\s*vocab:'([^']+)'/), LANGUAGE_KEYS.zh.vocab], ['zh tracks', lit(/const ZH = \{[^}]*?tracks:'([^']+)'/s), LANGUAGE_KEYS.zh.tracks], ['zh dailyNew', lit(/const ZH = \{[^}]*?dailyNew:'([^']+)'/s), LANGUAGE_KEYS.zh.dailyNew],
      ['zh grammar', lit(/const ZH = \{[^}]*?grammar:'([^']+)'/s), LANGUAGE_KEYS.zh.extra[0]], ['zh settings', lit(/const ZH = \{[^}]*?settings:'([^']+)'/s), LANGUAGE_KEYS.zh.extra[1]],
      ['yue vocab', lit(/const YUE = \{ vocab:'([^']+)'/), LANGUAGE_KEYS.yue.vocab], ['yue tracks', lit(/const YUE = \{[^}]*?tracks:'([^']+)'/), LANGUAGE_KEYS.yue.tracks], ['yue dailyNew', lit(/const YUE = \{[^}]*?dailyNew:'([^']+)'/), LANGUAGE_KEYS.yue.dailyNew],
      ['yue settings', lit(/const YUE = \{[^}]*?settings:'([^']+)'/), LANGUAGE_KEYS.yue.extra[0]],
    ]
    const bad = okKeys.filter(([, a, b]) => a !== b)
    T('A9', 'the storage keys this service knows match the keys in tt.jsx', bad.length === 0, bad)
    const sc = makeScrubber([CANARY, GKEY])
    T('A10', 'the scrubber removes a secret in plain, URL-encoded and JSON-escaped form, key=… in a URL and a key-shaped string', !/CANARY|AIza/.test(sc.text('x ' + CANARY + ' ' + encodeURIComponent(CANARY) + ' https://g/v1?key=' + GKEY + ' AIza' + 'SyZZZZZZZZZZZZZZZZZZZZZZZZZZ1234'))
      && !JSON.stringify(sc.deep({ a: [CANARY], [CANARY]: 1 })).includes('CANARY'))
  }

  // ───────────────────────────── B: the service, with the job function replaced (no browser)
  {
    const dir = tmpDir('B')
    const gates = new Map()          // job language+mode tag -> { release(result) | reject(err) }
    let started = [], aborted = []
    const fakeRun = async (spec, hooks) => {
      const tag = spec.mode + ':' + spec.language; started.push(tag)
      hooks.onLog('using the code ' + spec.model.accessCode + ' at ' + spec.model.serverUrl + '?key=' + GKEY)
      hooks.onProgress({ phase: 'working ' + spec.model.accessCode, wordsDone: 1, wordsTotal: 3, requests: 2, costUsd: 0.01 })
      if (spec.data && spec.data['tt-yue-vocab'] && spec.data['tt-yue-vocab'].length === 7) throw new Error('boom ' + spec.model.accessCode + ' and ' + GKEY)
      await new Promise((res, rej) => {
        gates.set(tag, { res, rej })
        hooks.signal.addEventListener('abort', () => { aborted.push(tag); rej(new Error('cancelled')) }, { once: true })
      })
      return { language: spec.language, mode: spec.mode, track: { createdAt: 't1', note: 'code was ' + spec.model.accessCode }, newTracks: [], storage: { 'tt-yue-tracks': [{ createdAt: 't1' }] }, changedKeys: ['tt-yue-tracks'], usage: { requests: 2, costUsd: 0.01 } }
    }
    const cfg = Object.assign(loadServerConfig({ RUNNER_TOKEN: TOKEN, RUNNER_ALLOWED_ORIGINS: 'https://app.example', RUNNER_DATA_DIR: dir, RUNNER_MAX_BODY_BYTES: '20000', RUNNER_MAX_QUEUE: '2', RUNNER_RESULT_TTL_SEC: '2', RUNNER_SWEEP_SEC: '3600' }))
    const app = createServer({ config: cfg, run: fakeRun }); const port = await app.listen(0, '127.0.0.1')
    const job = (extra) => Object.assign({}, BASE_JOB, extra || {})
    let r = await http1(port, 'POST', '/jobs', { token: null, body: job() })
    T('B1', 'no token → 401, and nothing is created', r.status === 401 && r.json.error.code === 'unauthorized')
    r = await http1(port, 'GET', '/jobs/' + 'a'.repeat(32), { token: 'wrong' })
    T('B2', 'wrong token → 401 on every route (the token is checked before the job id is looked at)', r.status === 401)
    let nTok = 0; for (const [m, p] of [['GET', '/healthz'], ['GET', '/jobs'], ['DELETE', '/jobs/x'], ['POST', '/jobs/x/result']]) { const x = await http1(port, m, p, { token: '' }); if (x.status === 401) nTok++ }
    T('B3', 'an empty token is refused everywhere', nTok === 4)
    r = await http1(port, 'GET', '/healthz'); T('B4', 'a valid token on an unknown route → 404', r.status === 404)
    r = await http1(port, 'OPTIONS', '/jobs', { token: null, headers: { origin: 'https://app.example', 'access-control-request-method': 'POST' } })
    T('B5', 'CORS preflight from the app origin → 204 with the origin echoed and x-runner-token allowed', r.status === 204 && r.headers.get('access-control-allow-origin') === 'https://app.example' && /x-runner-token/i.test(r.headers.get('access-control-allow-headers')))
    r = await http1(port, 'OPTIONS', '/jobs', { token: null, headers: { origin: 'https://evil.example' } })
    T('B6', 'CORS preflight from another origin → 403, no allow-origin', r.status === 403 && !r.headers.get('access-control-allow-origin'))
    r = await http1(port, 'GET', '/jobs/' + 'a'.repeat(32), { headers: { origin: 'https://evil.example' } })
    T('B7', 'a request from another origin is refused even with the token', r.status === 403)
    r = await http1(port, 'POST', '/jobs', { raw: 'x'.repeat(30000), headers: { 'content-type': 'application/json' } })
    T('B8', 'a body over the cap → 413', r.status === 413, r.status)
    r = await http1(port, 'POST', '/jobs', { raw: '{nope', headers: { 'content-type': 'application/json' } }); T('B9', 'invalid JSON → 400', r.status === 400)
    r = await http1(port, 'POST', '/jobs', { raw: '{}', headers: { 'content-type': 'text/plain' } }); T('B10', 'a non-JSON content type → 415', r.status === 415)
    r = await http1(port, 'POST', '/jobs', { body: job({ language: 'ko' }) }); T('B11', 'an unknown language → 400 with the reason', r.status === 400 && /language/.test(JSON.stringify(r.json.details)))
    r = await http1(port, 'POST', '/jobs', { body: job({ model: { model: 'claude-haiku-5-5', serverUrl: 'ftp://x', accessCode: CANARY } }) })
    T('B12', 'an invalid job reply never echoes the access code', r.status === 400 && !r.text.includes(CANARY))
    // lifecycle + queue
    const a = await http1(port, 'POST', '/jobs', { body: job({ mode: 'daily' }) })
    T('B13', 'a valid job → 202 with an id', a.status === 202 && /^[a-f0-9]{32}$/.test(a.json.id), a.text)
    await waitState(port, a.json.id, ['running'])
    const b = await http1(port, 'POST', '/jobs', { body: job({ mode: 'revision' }) })
    const c = await http1(port, 'POST', '/jobs', { body: job({ language: 'zh' }) })
    const d = await http1(port, 'POST', '/jobs', { body: job({ language: 'ja' }) })
    T('B14', 'jobs run one at a time: the second and third wait in the queue; a full queue → 429', started.length === 1 && b.json.state === 'queued' && c.json.state === 'queued' && d.status === 429, { started, d: d.status })
    let sa = (await http1(port, 'GET', '/jobs/' + a.json.id)).json
    T('B15', 'status shows state, progress counters and the (scrubbed) log', sa.state === 'running' && sa.progress.wordsDone === 1 && sa.progress.requests === 2 && sa.log.length >= 1 && sa.queuePosition === null, sa)
    const sb = (await http1(port, 'GET', '/jobs/' + b.json.id)).json
    T('B16', 'a waiting job reports its queue position', sb.state === 'queued' && sb.queuePosition >= 1, sb)
    r = await http1(port, 'GET', '/jobs/' + a.json.id + '/result'); T('B17', 'the result of an unfinished job → 409', r.status === 409 && r.json.state === 'running')
    gates.get('daily:yue').res()
    sa = await waitState(port, a.json.id, ['done']); T('B18', 'the job finishes → done', sa && sa.state === 'done' && sa.finishedAt && sa.expiresAt, sa)
    r = await http1(port, 'GET', '/jobs/' + a.json.id + '/result'); T('B19', 'the result is returned', r.status === 200 && r.json.track.createdAt === 't1' && r.json.changedKeys[0] === 'tt-yue-tracks')
    await waitState(port, b.json.id, ['running']); T('B20', 'the next waiting job starts by itself', started.join() === 'daily:yue,revision:yue', started)
    // cancel a running job
    r = await http1(port, 'DELETE', '/jobs/' + b.json.id)
    await sleep(150)
    T('B21', 'DELETE on a running job cancels it (its abort signal fires) and purges it (404 afterwards)', r.status === 200 && aborted.includes('revision:yue') && (await http1(port, 'GET', '/jobs/' + b.json.id)).status === 404 && (await http1(port, 'GET', '/jobs/' + b.json.id + '/result')).status === 404)
    await waitState(port, c.json.id, ['running']); T('B22', 'the queue moves on after a cancel', started.includes('daily:zh'))
    // delete a queued job
    const e = await http1(port, 'POST', '/jobs', { body: job({ language: 'ja' }) })
    r = await http1(port, 'DELETE', '/jobs/' + e.json.id); T('B23', 'DELETE on a waiting job removes it; it never runs', r.status === 200 && (await http1(port, 'GET', '/jobs/' + e.json.id)).status === 404)
    gates.get('daily:zh').res(); await waitState(port, c.json.id, ['done'])
    await sleep(200); T('B24', 'the deleted waiting job did not start', !started.includes('daily:ja'), started)
    // a failing job, with credentials in its error text
    const f = await http1(port, 'POST', '/jobs', { body: job({ data: { 'tt-yue-vocab': Array.from({ length: 7 }, (_, i) => ({ id: i })) } }) })
    const sf = await waitState(port, f.json.id, ['failed'])
    T('B25', 'a job that throws → failed, with a reason', sf && sf.state === 'failed' && /boom/.test(sf.error), sf)
    r = await http1(port, 'GET', '/jobs/' + f.json.id + '/result'); T('B26', 'a failed job has no result (409, with the reason)', r.status === 409 && r.json.state === 'failed')
    // scrubbing: everything that left the service or reached the disk
    const allText = [JSON.stringify(sa), JSON.stringify(sf), (await http1(port, 'GET', '/jobs/' + a.json.id)).text, (await http1(port, 'GET', '/jobs/' + a.json.id + '/result')).text, (await http1(port, 'GET', '/jobs/' + f.json.id)).text, dirText(dir)].join('\n')
    T('B27', 'the access code and the Gemini key appear in no status, log line, error, result or stored file', !allText.includes(CANARY) && !allText.includes(GKEY) && !/AIza/.test(allText), allText.match(/.{0,40}(CANARY|AIza).{0,20}/))
    T('B28', 'the job files on disk are not world-readable', fs.readdirSync(dir).every(x => (fs.statSync(path.join(dir, x)).mode & 0o077) === 0))
    // purge after the time to live
    await sleep(2300); await app.sweep()
    T('B29', 'a finished job is purged after its time to live (here 2 s; 24 h by default)', (await http1(port, 'GET', '/jobs/' + a.json.id)).status === 404 && fs.readdirSync(dir).filter(x => x.endsWith('.json')).length === 0, fs.readdirSync(dir))
    // restart: an unfinished job is failed, a finished one survives
    const g = await http1(port, 'POST', '/jobs', { body: job({ mode: 'daily' }) }); await waitState(port, g.json.id, ['running'])
    const dir2 = tmpDir('B2'); for (const x of fs.readdirSync(dir)) fs.copyFileSync(path.join(dir, x), path.join(dir2, x))
    const doneRec = { id: 'b'.repeat(32), state: 'done', language: 'yue', mode: 'daily', createdAt: new Date().toISOString(), finishedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 3600e3).toISOString(), progress: {}, log: [], error: null, result: { track: { createdAt: 'kept' } } }
    fs.writeFileSync(path.join(dir2, doneRec.id + '.json'), JSON.stringify(doneRec))
    await app.close()
    const app2 = createServer({ config: Object.assign({}, cfg, { dataDir: dir2 }), run: fakeRun }); const port2 = await app2.listen(0, '127.0.0.1')
    const gs = await http1(port2, 'GET', '/jobs/' + g.json.id), ds = await http1(port2, 'GET', '/jobs/' + doneRec.id + '/result')
    T('B30', 'after a restart: an unfinished job is reported failed ("submit it again"), a finished result is still served', gs.json && gs.json.state === 'failed' && /restarted/.test(gs.json.error) && ds.status === 200 && ds.json.track.createdAt === 'kept', { gs: gs.text.slice(0, 200), ds: ds.status })
    await app2.close()
    let threw = false; try { createServer({ config: Object.assign({}, cfg, { token: '' }), run: fakeRun }) } catch (x) { threw = true }
    T('B31', 'the service refuses to start without a token', threw)
    const memStore = new MemoryFileStore(null); await memStore.put('c'.repeat(32), { a: 1 })
    const got = await memStore.get('c'.repeat(32)), ids = await memStore.listIds(); await memStore.delete('c'.repeat(32))
    T('B32', 'the storage interface works in memory only (no directory)', got.a === 1 && ids.length === 1 && (await memStore.get('c'.repeat(32))) === null)
  }

  // ───────────────────────────── C: the real page, real Chromium, stand-in model
  console.log('building the page …')
  fs.mkdirSync(path.dirname(PAGE), { recursive: true })
  if (!process.env.RUNNER_TEST_PAGE) execFileSync('python3', [path.join(ROOT, 'build_index.py'), path.join(ROOT, 'tt.jsx'), path.join(ROOT, 'build', 'index-1.shell.html'), PAGE, 'v999'], { stdio: 'pipe' })
  const browsers = []
  const dataDir = tmpDir('C')
  const geminiStandIn = await startFakeModel({ geminiKey: GKEY })
  const mkApp = (extra) => {
    const rc = Object.assign(loadConfig({ RUNNER_PAGE: PAGE, RUNNER_ALLOW_LOCAL_MODEL: '1', RUNNER_JOB_TIME_LIMIT_SEC: '240', RUNNER_TEST_GEMINI_BASE: geminiStandIn.url }), { onBrowser: b => browsers.push(b) }, extra || {})
    const cfg = loadServerConfig({ RUNNER_TOKEN: TOKEN, RUNNER_DATA_DIR: dataDir, RUNNER_JOB_TIME_LIMIT_SEC: '240' }); cfg.runner = rc; cfg.allowedModelHosts = []
    return createServer({ config: cfg })
  }
  const app = mkApp(); const port = await app.listen(0, '127.0.0.1')
  const submit = async (body) => { const r = await http1(port, 'POST', '/jobs', { body }); if (r.status !== 202) throw new Error('submit failed: ' + r.text); return r.json.id }
  const finish = async (id, ms) => waitState(port, id, ['done', 'failed'], ms || 120000)
  const resultOf = async id => (await http1(port, 'GET', '/jobs/' + id + '/result')).json
  const outputs = []             // every status / result text seen, for the canary search

  {
    const model = await startFakeModel({ accessCode: CANARY, yueFlags: { 2: { kind: 'meaning', reason: 'stand-in flag' } } })
    const id = await submit({ language: 'yue', mode: 'daily', timezone: 'Asia/Singapore', data: { 'tt-yue-vocab': yueVocab() }, model: { model: 'claude-haiku-5-5', serverUrl: model.url, accessCode: CANARY, limitUsd: 0.5, limitRequests: 100 } })
    const first = (await http1(port, 'GET', '/jobs/' + id)).json
    const st = await finish(id); outputs.push(JSON.stringify(st))
    T('C1', 'Cantonese Daily through the real page: the job is done', st && st.state === 'done', st && (st.error || st.log.slice(-5)))
    const res = await resultOf(id); outputs.push(JSON.stringify(res))
    const track = res && res.track
    const nT = track ? (track.keywords || []).length : 0
    T('C2', 'the saved track is the app\'s own: 3 recalls for every target + the greeting / parting lines, language yue, written from modules', track && track.language === 'yue' && nT > 0 && track.recallCount === 3 * nT && track.pairs.length === track.recallCount + track.framingCount && track.framingCount === 4 && track.provider === 'modules' && /^yue-modules/.test(track.pipelineVersion), track && { nT, rc: track.recallCount, pairs: track.pairs.length })
    T('C3', 'the AI review stage ran through the stand-in: ONE request, status done, the flagged line is recorded', track && track.qualityReview && track.qualityReview.status === 'done' && track.qualityReview.requests === 1 && track.qualityReview.flagged === 1 && track.qualityReview.model === 'claude-haiku-5-5', track && track.qualityReview)
    T('C4', 'the stand-in saw exactly one request, with the right access code, and refused none', model.stats.anthropic === 1 && model.stats.codeSeen && model.stats.denied === 0, model.stats)
    T('C5', 'progress counters: recalls done = recalls total = the track\'s recalls, 1 request, a cost; log lines from the page', st && track && st.progress.wordsDone === st.progress.wordsTotal && st.progress.wordsTotal === track.recallCount && st.progress.requests === 1 && st.progress.costUsd > 0 && st.log.some(l => /Track complete/.test(l)), st && st.progress)
    T('C6', 'the result carries what the app saved: tracks, daily-new slots and vocabulary; usage; no unknown keys', res && res.changedKeys.includes('tt-yue-tracks') && res.changedKeys.includes('tt-yue-daily-new') && Array.isArray(res.storage['tt-yue-tracks']) && res.storage['tt-yue-tracks'].length === 1
      && Array.isArray(res.storage['tt-yue-daily-new'].wordIds) && res.storage['tt-yue-daily-new'].wordIds.length > 0 && res.usage.requests === 1, res && { ch: res.changedKeys, u: res.usage })
    const hr = track && track.pairs.find(p => p._framing)
    T('C7', 'the device clock the app used is the job\'s time zone (the greeting hour in the log is Singapore time)', st && st.log.some(l => { const m = /clock hour (\d+)/.exec(l); return m && Math.abs(+m[1] - ((new Date().getUTCHours() + 8) % 24)) <= 1 }), st && st.log.filter(l => /clock hour/.test(l)))
    T('C8', 'the browser of the finished job is closed', browsers.length >= 1 && browsers.every(b => !b.isConnected()))
    T('C9', 'the access code reached the stand-in only as the request header; it is in no status, log or result text', outputs.every(t => !t.includes(CANARY)) && JSON.stringify(first).indexOf(CANARY) < 0, outputs.map(t => t.indexOf(CANARY)))
    await model.close()
  }
  {
    // Revision needs learned words; uses the same stand-in
    const model = await startFakeModel({ accessCode: CANARY })
    const id = await submit({ language: 'yue', mode: 'revision', data: { 'tt-yue-vocab': yueVocab() }, model: { model: 'claude-haiku-5-5', serverUrl: model.url, accessCode: CANARY } })
    const st = await finish(id); outputs.push(JSON.stringify(st)); const res = await resultOf(id); if (res) outputs.push(JSON.stringify(res))
    const tr = res && res.track
    T('C10', 'Cantonese Revision through the real page: done, a revision track with the review (no flags from this stand-in)', st && st.state === 'done' && tr && tr.mode === 'revision' && tr.qualityReview && tr.qualityReview.status === 'done' && tr.qualityReview.flagged === 0, st && (st.error || st.log.slice(-4)))
    T('C11', 'a revision job does not touch the daily-new slots', res && !res.changedKeys.includes('tt-yue-daily-new'), res && res.changedKeys)
    await model.close()
  }
  {
    // the learner's own earlier tracks and slots come back through the merge keys: seed one track, expect two
    const model = await startFakeModel({ accessCode: CANARY })
    const old = { createdAt: '2026-11-10T08:00:00.000Z', date: '2026-11-10', language: 'yue', mode: 'daily', pairs: [], keywords: [], rated: true }
    const id = await submit({ language: 'yue', mode: 'daily', data: { 'tt-yue-vocab': yueVocab(), 'tt-yue-tracks': [old] }, model: { model: 'claude-haiku-5-5', serverUrl: model.url, accessCode: CANARY } })
    const st = await finish(id); const res = await resultOf(id); if (res) outputs.push(JSON.stringify(res)); outputs.push(JSON.stringify(st))
    T('C12', 'the learner\'s earlier tracks are kept in the saved list, the new one is added and reported as newTracks', st.state === 'done' && res.storage['tt-yue-tracks'].length === 2 && res.newTracks.length === 1 && res.storage['tt-yue-tracks'][0].createdAt === old.createdAt, st.error)
    await model.close()
  }
  {
    // Gemini path: the key is in the page's request URL; the stand-in answers; the key must not be logged
    const id = await submit({ language: 'yue', mode: 'daily', data: { 'tt-yue-vocab': yueVocab() }, model: { model: 'gemini-2.5-flash-lite', geminiKey: GKEY } })
    const st = await finish(id); const res = await resultOf(id); outputs.push(JSON.stringify(st)); if (res) outputs.push(JSON.stringify(res))
    T('C13', 'the Gemini path: the review is answered by the Gemini stand-in (key checked there), the track is saved with provider gemini; the key is in no output', st.state === 'done' && geminiStandIn.stats.gemini === 1 && res.track.qualityReview.status === 'done' && res.track.qualityReview.provider === 'gemini' && ![st, res].some(x => JSON.stringify(x).includes(GKEY)), st.error || geminiStandIn.stats)
  }
  {
    // the page's own failure: the stand-in rejects the access code → the review fails (the track is still saved) and the job says so in notes
    const model = await startFakeModel({ accessCode: 'some-other-code-entirely' })
    const id = await submit({ language: 'yue', mode: 'daily', data: { 'tt-yue-vocab': yueVocab() }, model: { model: 'claude-haiku-5-5', serverUrl: model.url, accessCode: CANARY } })
    const st = await finish(id); const res = await resultOf(id); outputs.push(JSON.stringify(st)); if (res) outputs.push(JSON.stringify(res))
    T('C14', 'a wrong access code: the app\'s review fails in its own words, the track is still saved, the job is done with a note, and the code is not in any output',
      st.state === 'done' && res.track.qualityReview.status === 'failed' && /access code/i.test(res.track.qualityReview.reason) && res.notes.some(x => /could not be completed/.test(x)) && model.stats.denied >= 1 && ![st, res].some(x => JSON.stringify(x).includes(CANARY)), st.error || res && res.track.qualityReview)
    await model.close()
  }
  {
    // the app's own refusal: three Daily tracks already today → its generator screen shows "You already have 3 tracks for today" and offers no Build button
    const model = await startFakeModel({ accessCode: CANARY })
    const stamp = new Date().toISOString(), todays = [0, 1, 2].map(i => ({ createdAt: stamp.replace(/\.\d+Z$/, '.00' + i + 'Z'), date: stamp.slice(0, 10), language: 'yue', mode: 'daily', trackMode: 'daily', pairs: [], keywords: [], rated: true }))
    const id = await submit({ language: 'yue', mode: 'daily', data: { 'tt-yue-vocab': yueVocab(), 'tt-yue-tracks': todays }, model: { model: 'claude-haiku-5-5', serverUrl: model.url, accessCode: CANARY } })
    const st = await finish(id); outputs.push(JSON.stringify(st))
    T('C15', 'when the app refuses a Daily track (3 already today) the job fails with the app\'s own words, and no model request was made', st.state === 'failed' && /already have 3 tracks for today/.test(st.error) && model.stats.anthropic === 0, st.error || st.state)
    const id2 = await submit({ language: 'yue', mode: 'revision', data: {}, model: { model: 'claude-haiku-5-5', serverUrl: model.url, accessCode: CANARY } })
    const st2 = await finish(id2); outputs.push(JSON.stringify(st2))
    T('C16', 'a Revision job for a learner who has learned nothing fails with the app\'s reason', st2.state === 'failed' && /no learned Cantonese words/.test(st2.error), st2.error)
    await model.close()
  }
  {
    // time limit: the stand-in answers after 90 s; the job limit is 30 s
    const model = await startFakeModel({ accessCode: CANARY, latencyMs: 90000 })
    const before = browsers.length
    const id = await submit({ language: 'yue', mode: 'daily', timeLimitSec: 30, data: { 'tt-yue-vocab': yueVocab() }, model: { model: 'claude-haiku-5-5', serverUrl: model.url, accessCode: CANARY } })
    const st = await finish(id, 100000); outputs.push(JSON.stringify(st))
    T('C17', 'the job time limit stops a job that is waiting for the model: failed with the reason, and its browser is closed', st.state === 'failed' && /time limit/.test(st.error) && browsers.slice(before).every(b => !b.isConnected()), st.error)
    await model.close()
  }
  {
    // cancel while the model is busy; the next job (queued behind it) then runs to the end
    const slow = await startFakeModel({ accessCode: CANARY, latencyMs: 60000 }), quick = await startFakeModel({ accessCode: CANARY })
    const before = browsers.length
    const id1 = await submit({ language: 'yue', mode: 'daily', data: { 'tt-yue-vocab': yueVocab() }, model: { model: 'claude-haiku-5-5', serverUrl: slow.url, accessCode: CANARY } })
    const id2 = await submit({ language: 'yue', mode: 'daily', data: { 'tt-yue-vocab': yueVocab() }, model: { model: 'claude-haiku-5-5', serverUrl: quick.url, accessCode: CANARY } })
    const t0 = Date.now(); let s1 = null
    while (Date.now() - t0 < 60000) { s1 = (await http1(port, 'GET', '/jobs/' + id1)).json; if (s1 && s1.progress && s1.progress.phase === 'quality review') break; await sleep(200) }
    await sleep(500)
    const del = await http1(port, 'DELETE', '/jobs/' + id1)
    const gone = (await http1(port, 'GET', '/jobs/' + id1)).status
    const st2 = await finish(id2); outputs.push(JSON.stringify(st2)); const res2 = await resultOf(id2); if (res2) outputs.push(JSON.stringify(res2))
    T('C18', 'cancelling a running job closes its browser and purges it; the job queued behind it then runs and finishes', del.status === 200 && gone === 404 && st2.state === 'done' && browsers.slice(before)[0] && !browsers.slice(before)[0].isConnected() && browsers.slice(before).every(b => !b.isConnected()), { del: del.status, gone, st2: st2.state, err: st2.error })
    await slow.close(); await quick.close()
  }
  {
    // the model function answers only the app's own site: a page opened from a file has the origin "null" and is refused; RUNNER_PAGE_ORIGIN serves the same file under the app's origin
    const model = await startFakeModel({ accessCode: CANARY, allowedOrigin: 'https://app.example' })
    const jobBody = { language: 'yue', mode: 'daily', data: { 'tt-yue-vocab': yueVocab() }, model: { model: 'claude-haiku-5-5', serverUrl: model.url, accessCode: CANARY } }
    const idFile = await submit(jobBody); const stFile = await finish(idFile); const resFile = await resultOf(idFile)
    // the flags switch off Chrome's Private Network Access checks, which only apply because this stand-in is on THIS computer (a public https page reaching 127.0.0.1); the real model function is public
    const app2 = mkApp({ pageOrigin: 'https://app.example', chromiumArgs: ['--disable-features=PrivateNetworkAccessSendPreflights,PrivateNetworkAccessRespectPreflightResults,BlockInsecurePrivateNetworkRequests,PrivateNetworkAccessForWorkers,LocalNetworkAccessChecks'] }); const port2 = await app2.listen(0, '127.0.0.1')
    const r2 = await http1(port2, 'POST', '/jobs', { body: jobBody }); const st2 = await waitState(port2, r2.json.id, ['done', 'failed'], 120000)
    const res2 = (await http1(port2, 'GET', '/jobs/' + r2.json.id + '/result')).json
    outputs.push(JSON.stringify(stFile), JSON.stringify(st2), JSON.stringify(res2 || {}), JSON.stringify(resFile || {}))
    T('C19', 'a page opened from a file is refused by a model function that checks the origin; with RUNNER_PAGE_ORIGIN the same page is served under the app\'s origin and the review runs',
      stFile.state === 'done' && resFile.track.qualityReview.status === 'failed' && st2.state === 'done' && res2.track.qualityReview.status === 'done' && model.stats.origins.includes('https://app.example'), { file: resFile && resFile.track.qualityReview, origins: model.stats.origins })
    await app2.close(); await model.close()
  }
  if (!process.env.RUNNER_TEST_SKIP_THAI) {
    // Thai through the real page: the scene, the 30-word generation (the app's own gap-fill modules answer some words with no request), the judges and recovery are
    // answered by the Thai stand-in; the app's own validators run for real. Whether every target pair passes depends on the stand-in's fixed sentence frames, so the test
    // asserts that the flow ran to the app's save, not that the track is READY; the readiness note is printed.
    const seen = { unhandled: [], handled: {} }
    const model = await startFakeModel({ accessCode: CANARY, handlers: thaiHandlers(seen) })
    const gate = { th: {} }
    const thVocab = await thaiSeedVocab()          // a learner who has been taught words (the app's bank with learned words marked as introduced), so Revision has words to revise
    for (const mode of ['daily', 'revision']) {
      const id = await submit({ language: 'th', mode, timezone: 'Asia/Singapore', data: mode === 'revision' ? { 'tt-vocab': thVocab } : {}, model: { model: 'claude-haiku-5-5', serverUrl: model.url, accessCode: CANARY, limitUsd: 5, limitRequests: 2000 } })
      const st = await finish(id, 12 * 60 * 1000); const res = await resultOf(id); outputs.push(JSON.stringify(st)); if (res) outputs.push(JSON.stringify(res))
      const tr = res && res.track
      gate.th[mode] = st.state + (st.error ? ': ' + st.error : '') + (res && res.notes && res.notes.length ? ' · ' + res.notes.join(' | ') : ' · track ready')
      T('D' + (mode === 'daily' ? 1 : 2), 'Thai ' + mode + ' through the real page: the job is done, the app saved a Thai track (' + (tr ? tr.pairs.length : '?') + ' lines), requests counted' + (mode === 'daily' ? ', daily-new slots saved' : ', slots untouched'),
        st.state === 'done' && tr && tr.pairs.length >= 60 && res.changedKeys.includes('tt-tracks') && res.usage.requests > 30 && st.progress.requests === res.usage.requests
        && (mode === 'daily' ? res.changedKeys.includes('tt-daily-new') : !res.changedKeys.includes('tt-daily-new')) && (tr.mode === mode || tr.trackMode === mode) && ![st, res].some(x => JSON.stringify(x).includes(CANARY)), st.error || st.log.slice(-4))
      console.log('      Thai ' + mode + ': ' + gate.th[mode] + ' · ' + (res ? res.usage.requests + ' requests' : ''))
    }
    T('D3', 'the Thai stand-in answered the scene, the plan, the generation, the judges and the recovery; every kind of prompt it did not know is listed (' + seen.unhandled.length + ')', seen.handled.generation > 0 && seen.handled['cue-check'] > 0 && seen.handled.naturalness > 0 && seen.handled['group-eval'] > 0, seen.handled)
    if (seen.unhandled.length) console.log('      Thai prompts the stand-in did not know: ' + seen.unhandled.length + ' (e.g. ' + JSON.stringify(seen.unhandled.slice(0, 2).map(u => u.k.slice(-70))) + ')')
    await model.close()
  }
  {
    // Japanese / Mandarin have no verified driver: the service accepts the job and fails it at once with a clear reason (it never hangs)
    const model = await startFakeModel({ accessCode: CANARY })
    const out = {}, nb0 = browsers.length
    for (const lang of ['ja', 'zh']) {
      const id = await submit({ language: lang, mode: 'daily', data: {}, model: { model: 'claude-haiku-5-5', serverUrl: model.url, accessCode: CANARY } })
      const st = await finish(id, 90000); out[lang] = st.state + ': ' + (st.error || 'ok')
    }
    T('D4', 'Japanese and Mandarin jobs fail at once with "not driven yet" (no driver is verified for them) and no browser is started for them', Object.values(out).every(x => /^failed: the (Japanese|Mandarin) flow is not driven yet/.test(x)) && browsers.length === nb0, out)
    await model.close()
  }
  // the whole tests' printed output and the job files hold no secret
  const files = dirText(dataDir)
  T('Z1', 'no credential in any job file on disk, in any status or result text collected above, or in anything these tests printed', ![CANARY, GKEY, TOKEN].some(s => files.includes(s) || outputs.some(o => o.includes(s)) || printed.some(p => p.includes(s))), { f: [CANARY, GKEY].map(s => files.indexOf(s)), p: printed.filter(p => p.includes(CANARY) || p.includes(GKEY)).length })
  await app.close(); await geminiStandIn.close()

  // a real process: starts only with a token, answers with it, prints no credential
  {
    const port3 = await new Promise(r => { const s = http.createServer().listen(0, () => { const p = s.address().port; s.close(() => r(p)) }) })
    const noTok = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], { env: Object.assign({}, process.env, { RUNNER_TOKEN: '', PORT: String(port3) }) })
    const code = await new Promise(r => { noTok.on('exit', c => r(c)); setTimeout(() => { noTok.kill(); r('timeout') }, 5000) })
    const dir3 = tmpDir('P')
    const child = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], { env: Object.assign({}, process.env, { RUNNER_TOKEN: TOKEN, PORT: String(port3), RUNNER_DATA_DIR: dir3, RUNNER_PAGE: PAGE, RUNNER_ALLOWED_ORIGINS: 'https://app.example' }) })
    let out = ''; child.stdout.on('data', d => out += d); child.stderr.on('data', d => out += d)
    for (let i = 0; i < 50 && !/listening/.test(out); i++) await sleep(100)
    const r1 = await http1(port3, 'POST', '/jobs', { body: BASE_JOB, token: null }), r2 = await http1(port3, 'GET', '/jobs/' + 'a'.repeat(32))
    const bad = await http1(port3, 'POST', '/jobs', { body: Object.assign({}, BASE_JOB, { language: 'xx' }) })
    child.kill('SIGTERM'); await sleep(300)
    T('Z2', 'the service process: exits without RUNNER_TOKEN; with it answers (401 without the header, 404 for an unknown job); prints no credential', code === 1 && r1.status === 401 && r2.status === 404 && bad.status === 400 && !out.includes(CANARY) && !out.includes(TOKEN), { code, r1: r1.status, r2: r2.status, out: out.slice(0, 200) })
  }
  console.log('\n' + (n - fails) + ' / ' + n + ' passed')
  process.exit(fails ? 1 : 0)
})().catch(e => { console.error('TEST RUN CRASHED', e && e.stack || e); process.exit(2) })
