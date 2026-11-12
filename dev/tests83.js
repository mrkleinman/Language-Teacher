// 12 Nov — a phone browser freezes a hidden / locked page, so a request made then fails ("Failed to fetch") and used to burn all three attempts in
// seconds ("CLAUDE HAIKU UNREACHABLE ... after 3 tries"). Now: the screen is kept on while requests run, and a failure that happened while the page was
// hidden / offline is NOT counted as an attempt: the request waits for the page and retries. Real transport function; only fetch and the page state are simulated.
const { load } = require('./harness')
const fs = require('fs')
const SRC = fs.readFileSync('tt.jsx', 'utf8')
let n = 0, fails = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; console.log((pass ? 'PASS ' : 'FAIL ') + id + '  ' + name + (!pass && detail !== undefined ? '  ' + JSON.stringify(detail) : '')) }
const KEY = 'AIzaSyTEST-harness-key-000000'
const okBody = { candidates: [{ content: { parts: [{ text: 'hello' }] } }], usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 2, totalTokenCount: 7 } }
function page() {
  const listeners = {}
  const doc = { hidden: false, body: { appendChild() {}, removeChild() {} }, head: {}, querySelector: () => null, getElementById: () => ({ style: {}, appendChild() {}, setAttribute() {} }),
    createElement: () => ({ style: {}, setAttribute() {}, parentNode: null }),
    addEventListener: (t, f) => { (listeners[t] = listeners[t] || []).push(f) }, removeEventListener: (t, f) => { listeners[t] = (listeners[t] || []).filter(x => x !== f) },
    fire: t => (listeners[t] || []).slice().forEach(f => f()) }
  return doc
}
async function run(script, opts = {}) {
  const doc = page(); const calls = []
  const nav = { serviceWorker: null, userAgent: 'node', onLine: true, wakeLock: opts.wake ? { request: async () => { opts.wake.requested++; return { release() { opts.wake.released++ }, addEventListener() {} } } } : undefined }
  const c = load('tt.compiled.js', { globals: { document: doc, navigator: nav, fetch: async u => { calls.push(u); return script(calls.length, doc, nav) } } })
  c.addEventListener = () => {}; c.removeEventListener = () => {}
  let text = null, err = null
  try { text = await c.geminiRequest({ apiKey: KEY, model: 'gemini-2.5-flash-lite', maxTokens: 50, messages: [{ role: 'user', content: 'hi' }], stage: 'test' }) } catch (e) { err = e }
  return { c, calls, text, err, doc }
}
const okRes = () => ({ ok: true, status: 200, json: async () => okBody })

;(async () => {
  // 1 — hidden while the request was in flight: not counted, retried once the page is back
  {
    const r = await run((k, doc) => { if (k === 1) { doc.hidden = true; doc.fire('visibilitychange'); doc.hidden = false; doc.fire('visibilitychange'); throw new TypeError('Failed to fetch') } return okRes() })
    T('P1', 'a request that failed while the page was hidden is retried when it is back and succeeds (2 fetches, answer returned)', r.calls.length === 2 && r.text === 'hello' && !r.err, { calls: r.calls.length, text: r.text, err: r.err && r.err.message })
    const rows = r.c.ev('AI_LEDGER').filter(x => /paused, not counted/.test(String(x.error || '')))
    T('P2', 'the failed try is recorded in the ledger as "paused, not counted as an attempt"', rows.length === 1, rows.map(x => x.error))
  }
  // 2 — many hidden periods in a row never use up the attempts (4 paused tries, then success)
  {
    const r = await run((k, doc) => { if (k <= 4) { doc.hidden = true; doc.fire('visibilitychange'); doc.hidden = false; doc.fire('visibilitychange'); throw new TypeError('Failed to fetch') } return okRes() })
    T('P3', 'four hidden-page failures in a row do not exhaust the 3 attempts: the 5th request succeeds', r.calls.length === 5 && r.text === 'hello', { calls: r.calls.length, err: r.err && r.err.message })
  }
  // 3 — a real network failure with the page visible still counts (3 attempts, then the usual error)
  {
    const r = await run(() => { throw new TypeError('Failed to fetch') })
    T('P4', 'a failure with the page visible and online is NOT paused: it uses the 3 attempts and then reports the error', r.calls.length === 3 && !!r.err && /GEMINI_UNAVAILABLE/.test(r.err.message), { calls: r.calls.length, err: r.err && r.err.message })
  }
  // 4 — the screen wake lock is requested while requests run
  {
    const w = { requested: 0, released: 0 }
    const r = await run(() => okRes(), { wake: w })
    await new Promise(res => setImmediate(res))
    T('P5', 'the screen wake lock is requested when a request starts (kept on while a track is generating)', w.requested >= 1, w)
  }
  // 5 — no wake lock API: nothing breaks
  {
    const r = await run(() => okRes())
    T('P6', 'a browser without the wake lock API works as before', r.text === 'hello')
  }
  // 6 — the Anthropic request loop has the same rule
  T('P7', 'the Claude Haiku request loop uses the same pause rule (source)', /_pauses < 60 && aiPageStateFailure\(_t0\)[\s\S]{0,220}await aiWaitForPage\(signal, runCtl\); attempt--; continue/.test(SRC.slice(SRC.indexOf('anthropicServerUrl(), { method'), SRC.indexOf('anthropicServerUrl(), { method') + 3000) + SRC.slice(SRC.indexOf('let why = null, lastErr = null, _pauses'), SRC.indexOf('let why = null, lastErr = null, _pauses') + 4500)))
  console.log(fails ? 'FAILED ' + fails + '/' + n : 'ALL PASS ' + n + '/' + n); process.exit(fails ? 1 : 0)
})()
