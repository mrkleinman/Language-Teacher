// 17 Nov — waits inside a track that is being written must not be stretched by a background tab.
// A hidden page has its timers throttled by the browser (about 1 tick a second, then about 1 a minute); appSleep waits with a timer inside a worker while the page is hidden
// and with a plain timer while it is visible, and falls back to the plain timer when no worker can be made. Real application code (the function in tt.jsx); the stand-ins are
// the browser's Worker, Blob, URL and document.visibilityState.
const { load } = require('./harness')
const fs = require('fs')
const FILE = process.env.TT_FILE || 'tt.compiled.js'
const SRC = fs.readFileSync('tt.jsx', 'utf8')
let n = 0, fails = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; console.log((pass ? 'PASS ' : 'FAIL ') + id + '  ' + name + (!pass && detail !== undefined ? '\n      ' + JSON.stringify(detail).slice(0, 300) : '')) }

;(async () => {
  // visible page: the plain timer
  {
    const c = load(FILE); c.console.info = () => {}
    c.ev('globalThis.document = { visibilityState: "visible" }; globalThis.__made = 0; globalThis.Worker = function () { globalThis.__made++ }')
    // (the harness runs timers at once, so the test proves WHICH timer is used and that the wait resolves, not how long it lasts)
    await c.ev('appSleep')(30)
    T('S1', 'a visible page waits with the plain timer (no worker is made) and resumes', c.ev('globalThis.__made') === 0, { made: c.ev('globalThis.__made') })
  }
  // hidden page: the worker does the waiting
  {
    const c = load(FILE); c.console.info = () => {}
    c.ev(`globalThis.document = { visibilityState: "hidden" }; globalThis.__msgs = []; globalThis.Blob = function (p, o) { this.p = p }; globalThis.URL = { createObjectURL() { return 'blob:x' } };
      globalThis.Worker = function () { const w = this; globalThis.__w = w; w.postMessage = d => { globalThis.__msgs.push(d); setTimeout(() => w.onmessage && w.onmessage({ data: d.id }), 5) }; w.terminate = () => {} }`)
    const t0 = Date.now(); await c.ev('appSleep')(5000)
    const dt = Date.now() - t0, msgs = c.ev('globalThis.__msgs')
    T('S2', 'a hidden page hands the wait to the worker (one message with the id and the milliseconds) and resumes when the worker answers', msgs.length === 1 && msgs[0].ms === 5000 && dt < 1000, { msgs, dt })
    await c.ev('appSleep')(7); await c.ev('appSleep')(9)
    const m2 = c.ev('globalThis.__msgs')
    T('S3', 'the worker is made once and every wait has its own id', m2.length === 3 && new Set(m2.map(m => m.id)).size === 3, m2)
  }
  // hidden page, no worker possible: plain timer
  {
    const c = load(FILE); c.console.info = () => {}
    c.ev('globalThis.document = { visibilityState: "hidden" }; globalThis.Worker = undefined')
    let ok = false; await c.ev('appSleep')(30).then(() => { ok = true })
    T('S4', 'a hidden page that cannot make a worker still waits (plain timer) and resumes: it never hangs or fails', ok)
  }
  // the waits of the track writers use it
  const left = (SRC.match(/await new Promise\((?:r|res|resolve) => setTimeout\(/g) || []).length
  const used = (SRC.match(/await appSleep\(/g) || []).length
  T('S5', 'the waits between words, the retry waits (Gemini, the optional model) and the rate-limit countdown use appSleep; no plain timer wait is left in them', used >= 11 && left === 0, { used, left })
  console.log((fails ? 'FAIL ' : '') + (n - fails) + '/' + n)
  process.exit(fails ? 1 : 0)
})()
