// Runs ONE track-writing job in a headless Chromium: the REAL app page (the same index.html the phone loads) is opened, the learner's saved data and the
// model settings are put where the app keeps them, and the app is driven like a user until it has saved the track. Nothing of the app is ported.
//
//   runJob(spec, hooks, cfg) -> result      (throws RunnerError with a plain-words message on failure)
//     spec   a validated job (jobspec.js validateJob)
//     hooks  { signal, onProgress(patch), onLog(line) }   everything passed to them is already scrubbed
//     cfg    see loadConfig()
//
// Safety: one browser per call, closed in `finally` whatever happens; a context with nothing on disk (no profile, no cache, no service worker); the network is an
// allowlist (the page, the react / babel files, the job's own model server, and Gemini only for a Gemini job); the job's secrets exist only in this call.
'use strict'
const fs = require('fs')
const path = require('path')
const { makeScrubber } = require('./scrub')
const { LANGUAGE_KEYS, resultKeys, OPTIONAL_MODEL } = require('./jobspec')
const drivers = require('./drivers')

class RunnerError extends Error { constructor(message, code) { super(message); this.code = code || 'failed' } }

const GEMINI_HOST = 'generativelanguage.googleapis.com'
const UNPKG = [
  [/^https:\/\/unpkg\.com\/react@[^/]+\/umd\/react\.production\.min\.js/, 'react/umd/react.production.min.js'],
  [/^https:\/\/unpkg\.com\/react-dom@[^/]+\/umd\/react-dom\.production\.min\.js/, 'react-dom/umd/react-dom.production.min.js'],
  [/^https:\/\/unpkg\.com\/@babel\/standalone@[^/]+\/babel\.min\.js/, '@babel/standalone/babel.min.js'],
]

function loadConfig(env) {
  env = env || process.env
  const num = (v, d) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : d }
  return {
    page: env.RUNNER_PAGE || '',                                               // path of the built index.html, or its https URL
    vendorDir: env.RUNNER_VENDOR_DIR || '',                                    // folder holding react/, react-dom/, @babel/standalone/ (default: node_modules next to this file, then ../node_modules)
    jobTimeLimitSec: num(env.RUNNER_JOB_TIME_LIMIT_SEC, 25 * 60),
    chromiumArgs: String(env.RUNNER_CHROMIUM_ARGS || '').split(/\s+/).filter(Boolean),   // e.g. "--no-sandbox --disable-dev-shm-usage" inside the container
    allowLocalModel: env.RUNNER_ALLOW_LOCAL_MODEL === '1',                     // tests only: let a job point at http://127.0.0.1
    geminiBase: env.RUNNER_TEST_GEMINI_BASE || '',                             // tests only: answer the page's Gemini calls from this stand-in instead
    headless: env.RUNNER_HEADED === '1' ? false : true,
  }
}

function vendorFiles(cfg) {
  const roots = [cfg.vendorDir, path.join(__dirname, 'node_modules'), path.join(__dirname, '..', 'node_modules')].filter(Boolean)
  const out = []
  for (const [rx, rel] of UNPKG) {
    let body = null
    for (const r of roots) { try { body = fs.readFileSync(path.join(r, rel)); break } catch (e) {} }
    out.push([rx, body])
  }
  return out
}

function pageTarget(cfg) {
  const p = String(cfg.page || '')
  if (!p) throw new RunnerError('the runner has no page configured (set RUNNER_PAGE)', 'not_configured')
  if (/^https:\/\//i.test(p)) return { url: p, origin: new URL(p).origin, dir: null }
  const abs = path.resolve(p)
  if (!fs.existsSync(abs)) throw new RunnerError('the page file does not exist (RUNNER_PAGE)', 'not_configured')
  return { url: 'file://' + abs, origin: null, dir: path.dirname(abs) }
}

// what the page finds in its storage when it starts: the learner's data exactly as the app keeps it (JSON text), the language, and the model settings the way
// Settings -> AI Generation Model saves them (a preference object, the site access code, the Gemini key).
function buildSeed(spec) {
  const local = {}
  Object.keys(spec.data).forEach(k => { local[k] = JSON.stringify(spec.data[k]) })
  local['tt-active-language'] = JSON.stringify(spec.language)
  const m = spec.model, pref = { model: m.model }
  if (m.limitUsd) pref.limitUsd = m.limitUsd
  if (m.limitRequests) pref.limitRequests = m.limitRequests
  if (m.model === OPTIONAL_MODEL && m.serverUrl) pref.serverUrl = m.serverUrl.replace(/\/+$/, '')
  local['tt-generation-model'] = JSON.stringify(pref)
  if (m.accessCode) local['tt-anthropic-site-access'] = JSON.stringify(m.accessCode.replace(/\s+/g, ''))
  if (m.geminiKey) local['tt-gemini-key'] = JSON.stringify(m.geminiKey)
  // The Thai / Japanese / Mandarin generators only enter their model path when a Gemini key is present on the screen. With the optional model selected no request
  // goes to Gemini (the app routes every request of the run to the model function), so a non-secret marker value is enough to open that path.
  else if (m.model === OPTIONAL_MODEL && spec.language !== 'yue') local['tt-gemini-key'] = JSON.stringify('optional-model-selected-no-gemini-key')
  return { local: Object.entries(local), session: [['tt-active-language', spec.language]] }
}

function deepEqual(a, b) { try { return JSON.stringify(a) === JSON.stringify(b) } catch (e) { return false } }
// the app's own track identity (stTrackId in tt.jsx)
const trackId = t => t && (t.id != null ? t.id : (t.createdAt || ((t.date || '') + ':' + ((t.pairs && t.pairs.length) || 0))))

async function runJob(spec, hooks, cfg) {
  cfg = cfg || loadConfig(process.env)
  hooks = hooks || {}
  const driver = drivers[spec.language]
  if (!driver) throw new RunnerError('no driver for language ' + spec.language, 'unsupported')
  const secrets = [spec.model.accessCode, spec.model.geminiKey]
  const scrub = makeScrubber(secrets)
  const log = line => { try { hooks.onLog && hooks.onLog(scrub.text(line).slice(0, 400)) } catch (e) {} }
  const progress = patch => { try { hooks.onProgress && hooks.onProgress(scrub.deep(patch)) } catch (e) {} }
  const target = pageTarget(cfg)
  const limitMs = (spec.timeLimitSec || cfg.jobTimeLimitSec) * 1000
  const { chromium } = require('playwright')
  let browser = null, context = null, page = null, timer = null, poller = null, finished = false
  const state = { reqs: 0 }
  const fail = (message, code) => { throw new RunnerError(scrub.text(message), code) }
  try {
    if (hooks.signal && hooks.signal.aborted) fail('cancelled', 'cancelled')
    progress({ phase: 'starting the browser' })
    browser = await chromium.launch({ headless: cfg.headless, args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'].concat(cfg.chromiumArgs) })
    if (cfg.onBrowser) { try { cfg.onBrowser(browser) } catch (e) {} }          // tests: lets a test check the browser is closed afterwards
    const geminiJob = spec.model.model !== OPTIONAL_MODEL
    context = await browser.newContext({ viewport: { width: 420, height: 900 }, serviceWorkers: 'block', acceptDownloads: false, permissions: [], locale: 'en-US',
      timezoneId: spec.timezone || 'UTC', ignoreHTTPSErrors: false })
    page = await context.newPage()
    page.setDefaultTimeout(30000)
    // ── the network allowlist
    const vendor = vendorFiles(cfg)
    const modelOrigin = spec.model.serverUrl ? new URL(spec.model.serverUrl).origin : null
    const blockedHosts = new Set()
    await context.route('**/*', async route => {
      const url = route.request().url()
      try {
        if (url.startsWith('file://')) {
          const p = decodeURIComponent(new URL(url).pathname)
          if (target.dir && (p === target.dir || p.startsWith(target.dir + path.sep))) return route.continue()
          return route.abort()
        }
        for (const [rx, body] of vendor) if (rx.test(url)) return body ? route.fulfill({ status: 200, contentType: 'application/javascript', body }) : route.continue()
        const u = new URL(url)
        if (target.origin && u.origin === target.origin) return route.continue()
        if (modelOrigin && u.origin === modelOrigin) return route.continue()
        if (u.hostname === GEMINI_HOST && geminiJob) {
          if (cfg.geminiBase) {                                                   // tests: the page's Gemini call is answered by the stand-in
            const r = await route.fetch({ url: cfg.geminiBase.replace(/\/+$/, '') + u.pathname + u.search })
            return route.fulfill({ response: r })
          }
          return route.continue()
        }
        blockedHosts.add(u.hostname)
      } catch (e) {}
      return route.abort()
    })
    page.on('dialog', d => { d.dismiss().catch(() => {}) })
    page.on('console', m => {
      const t = m.text()
      if (/^\[ai-call\]/.test(t)) log(t.replace(/\s+(promptTokenCount|INPUT_CHARS|OUTPUT_CHARS)=.*$/, '').slice(0, 260))
    })
    if (cfg.debugConsole) page.on('console', m => { try { cfg.debugConsole(m.type(), m.text()) } catch (e) {} })          // tests: see everything the page prints
    page.on('pageerror', e => log('page error: ' + String((e && e.message) || e).slice(0, 240)))
    const seed = buildSeed(spec)
    await page.addInitScript(s => {
      try { if (window.top !== window) return; s.local.forEach(([k, v]) => localStorage.setItem(k, v)); s.session.forEach(([k, v]) => sessionStorage.setItem(k, v)) } catch (e) {}
    }, seed)
    // ── time limit and cancel
    const stop = new Promise((_, rej) => {
      timer = setTimeout(() => rej(new RunnerError('the job time limit (' + Math.round(limitMs / 60000) + ' min) was reached before the track was saved', 'time_limit')), limitMs)
      if (hooks.signal) hooks.signal.addEventListener('abort', () => rej(new RunnerError('cancelled', 'cancelled')), { once: true })
    })
    stop.catch(() => {})
    const crash = new Promise((_, rej) => page.once('crash', () => rej(new RunnerError('the browser page crashed', 'crashed')))); crash.catch(() => {})
    const guard = p => Promise.race([p, stop, crash])
    // ── open the app
    progress({ phase: 'opening the app' })
    await guard(page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 120000 }))
    const ctx = { cfg, page, spec, scrub, log, progress, guard, fail, trackId, deepEqual, seedTrackIds: new Set(((spec.data[LANGUAGE_KEYS[spec.language].tracks]) || []).map(trackId)) }
    await guard(driver.waitHome(ctx))
    await guard(driver.instrument(ctx))
    // ── progress poller: counters and log lines the page produced
    let drained = 0
    const poll = async () => {
      if (finished || !page || page.isClosed()) return
      try {
        const s = await page.evaluate(() => {
          const R = window.__ltRunner || { lines: [], done: 0, total: 0 }
          let reqs = 0, cost = 0
          try { AI_LEDGER.forEach(r => { if (!r.latched && !r.deduped && !r.cancelled) { reqs++; cost += r.costUsd || 0 } }) } catch (e) {}
          return { lines: R.lines.slice(), done: R.done, total: R.total, reqs, cost }
        })
        s.lines.slice(drained).forEach(l => log(l)); drained = s.lines.length
        const total = Math.max(0, s.total), done = Math.max(0, Math.min(s.done, total || s.done))
        progress({ wordsDone: done, wordsTotal: total, requests: s.reqs, costUsd: Math.round(s.cost * 1e6) / 1e6 })
      } catch (e) {}
    }
    poller = setInterval(poll, 1000)
    // ── drive the language's flow until the app has saved the track
    const outcome = await guard(driver.run(ctx))
    await poll()
    if (cfg.onDone) { try { await cfg.onDone(page) } catch (e) {} }       // tests: look at the page before it is closed
    // ── collect what the app saved
    const keys = resultKeys(spec.language)
    const raw = await page.evaluate(ks => Object.fromEntries(ks.map(k => [k, localStorage.getItem(k)])), keys)
    const storage = {}, changed = [], unchanged = []
    keys.forEach(k => {
      let v = null; try { v = raw[k] == null ? null : JSON.parse(raw[k]) } catch (e) {}
      if (v == null) return
      const before = spec.data[k]
      if (before !== undefined && deepEqual(before, v)) unchanged.push(k); else { storage[k] = v; changed.push(k) }
    })
    const tracksAfter = Array.isArray(storage[LANGUAGE_KEYS[spec.language].tracks]) ? storage[LANGUAGE_KEYS[spec.language].tracks] : []
    const newTracks = tracksAfter.filter(t => !ctx.seedTrackIds.has(trackId(t)))
    if (!newTracks.length) fail('the app finished without saving a track', 'no_track')
    const usage = await page.evaluate(() => { let reqs = 0, cost = 0; try { AI_LEDGER.forEach(r => { if (!r.latched && !r.deduped && !r.cancelled) { reqs++; cost += r.costUsd || 0 } }) } catch (e) {} return { requests: reqs, costUsd: cost } }).catch(() => ({ requests: 0, costUsd: 0 }))
    if (blockedHosts.size) log('blocked network hosts: ' + [...blockedHosts].join(', '))
    finished = true
    return scrub.deep({ language: spec.language, mode: spec.mode, track: newTracks[newTracks.length - 1], newTracks, storage, changedKeys: changed, unchangedKeys: unchanged,
      usage: { requests: usage.requests, costUsd: Math.round(usage.costUsd * 1e6) / 1e6 }, notes: outcome && outcome.notes || [], finishedAt: new Date().toISOString() })
  } catch (e) {
    if (e instanceof RunnerError) throw e
    const msg = String((e && e.message) || e)
    if (/Target (page, context or browser )?has been closed|browser has been closed|Browser closed/i.test(msg) && hooks.signal && hooks.signal.aborted) throw new RunnerError('cancelled', 'cancelled')
    throw new RunnerError(scrub.text(msg).split('\n')[0].slice(0, 400), 'failed')
  } finally {
    finished = true
    clearTimeout(timer); clearInterval(poller)
    // close the browser whatever happened; never let a stuck close hold the queue
    if (browser) { await Promise.race([browser.close().catch(() => {}), new Promise(r => setTimeout(r, 10000))]) }
  }
}

module.exports = { runJob, loadConfig, RunnerError, buildSeed, trackId }
