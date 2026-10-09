#!/usr/bin/env node
// v676 (Step 0) — END-TO-END test of the in-app benchmark in real headless Chromium, served over http like the hosted app.
//
// Gemini is replaced at the NETWORK boundary by a fake server that answers from the v674 UI-path simulator cassettes
// (random 0–250 ms latency, so requests complete out of order as they do live). Nothing here is a teaching-quality
// result; it proves the MECHANICS of the live-capture process:
//   P1  a learner profile is seeded into the browser's real storage; the normal app boots
//   P2  #tt-benchmark: sandbox active, key found, 6 fixtures, Thai labelled RECONSTRUCTED
//   P3  every fixture, REPLAY mode in a worker page: faithful (no mismatch, nothing unused), content = the Node outcome
//   P4  every fixture, LIVE mode through the app's fetch + the app's own key: the fake server sees only known requests,
//       always the stored key; the recorded browser cassette then replays FAITHFULLY in Node with identical content
//   P5  the real "Run all 18" button: 18 runs, 18 per-run files saved, bundle well-formed, the key appears in no file
//   P6  device-snapshot button builds DEVICE_SNAPSHOT fixtures (exact state, read-only)
//   P7  after everything, the browser's real storage is byte-identical to before, and the normal app still boots
//   node benchmark/browser_bench_test.js [--skip-all]   → benchmark/results/v676-browser-bench.json
'use strict'
const fs = require('fs'), path = require('path'), http = require('http'), crypto = require('crypto')
const ROOT = path.join(__dirname, '..')
const { chromium } = require(process.env.PW_PATH || '/home/claude/.npm-global/lib/node_modules/playwright')
const { runOnceUi, loadFixture, compareContent } = require('./run')
const { load } = require('../harness')
const SKIP_ALL = process.argv.includes('--skip-all')
const TEST_KEY = 'AIzaSyTEST-browser-bench-key-0000001'   // a fake key: it never reaches Google (the network is faked)
const FIX = ['th-daily', 'ja-daily', 'zh-daily', 'th-listening', 'ja-listening', 'zh-listening'].map(s => s + '-2026-10-08')
const checks = []
const ok = (name, cond, detail) => { checks.push({ name, pass: !!cond, detail: detail == null ? null : detail }); console.log((cond ? 'PASS ' : 'FAIL ') + name + (detail != null ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 300) : '')) }

const cassettes = Object.fromEntries(FIX.map(id => [id, JSON.parse(fs.readFileSync(path.join(__dirname, 'cassettes', id + '.ui.sim.json'), 'utf8'))]))
// the fake Gemini: model + canonical body → recorded responses (FIFO per identical request), shared by all fixtures
const canon = b => { try { return JSON.stringify(JSON.parse(b)) } catch (e) { return String(b) } }
const modelOf = u => (String(u).match(/models\/([^:?]+):/) || [])[1] || ''
function fakeGemini() {
  const q = new Map()
  for (const id of FIX) for (const e of cassettes[id].cassette.entries) { const k = e.model + '\n' + JSON.stringify(e.request); if (!q.has(k)) q.set(k, []); q.get(k).push(e) }
  const stats = { served: 0, unknown: 0, wrongKey: 0, unknownSamples: [] }
  let seed = 7
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  const handler = async route => {
    const req = route.request(), url = req.url()
    const key = (url.match(/[?&]key=([^&]+)/) || [])[1]
    if (key !== TEST_KEY) stats.wrongKey++
    const k = modelOf(url) + '\n' + canon(req.postData())
    const list = q.get(k)
    await new Promise(r => setTimeout(r, Math.floor(rnd() * 250)))
    if (!list || !list.length) { stats.unknown++; if (stats.unknownSamples.length < 3) stats.unknownSamples.push(canon(req.postData()).slice(0, 200)); return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: { message: 'FAKE_GEMINI: unknown request' } }) }) }
    const e = list.length > 1 ? list.shift() : list[0]          // identical requests re-served (several fixtures × runs)
    stats.served++
    return route.fulfill({ status: e.response.status, contentType: 'application/json', body: JSON.stringify(e.response.body) })
  }
  return { handler, stats }
}

function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      const p = decodeURIComponent(req.url.split('?')[0].split('#')[0])
      const f = p === '/' ? path.join(ROOT, 'index.html') : path.join(ROOT, p)
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); return rsp.end() }
      rsp.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html; charset=utf-8' : f.endsWith('.json') ? 'application/json' : 'application/octet-stream' })
      fs.createReadStream(f).pipe(rsp)
    })
    srv.listen(0, '127.0.0.1', () => res(srv))
  })
}

// a realistic learner profile for the browser's REAL storage (it must come out untouched)
function learnerProfile() {
  const c = load(path.join(ROOT, 'tt.compiled.js'))
  const prog = (v, n) => v.map((w, i) => i < n ? { ...w, status: i % 7 === 0 ? 'known' : 'learning', repCount: 3 + (i % 5), okStreak: i % 4, interval: 1 + (i % 9), lastSeen: '2026-10-0' + (1 + i % 7), dueDate: '2026-10-1' + (i % 9), introducedAt: '2026-08-15' } : w)
  return {
    'tt-gemini-key': JSON.stringify(TEST_KEY),
    'tt-vocab': JSON.stringify(prog(c.initVocab(), 140)),
    'tt-ja-vocab': JSON.stringify(prog(c.initJapaneseVocab(), 90)),
    'tt-zh-vocab': JSON.stringify(prog(c.initMandarinVocab(), 70)),
    'tt-tracks': JSON.stringify([{ date: '7 Oct 2026', mode: 'daily', createdAt: '2026-10-07T08:00:00.000Z', rated: true, keywords: [], pairs: [] }]),
    'tt-completed-lessons': JSON.stringify(['l1', 'l2']), 'tt-speed': '0.8', 'thaiTeacherSettings': JSON.stringify({ voice: 'f' }),
  }
}

;(async () => {
  const srv = await serve(), base = 'http://127.0.0.1:' + srv.address().port + '/index.html'
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ acceptDownloads: true })
  const local = { 'react.production.min.js': 'node_modules/react/umd/react.production.min.js', 'react-dom.production.min.js': 'node_modules/react-dom/umd/react-dom.production.min.js', 'babel.min.js': 'node_modules/@babel/standalone/babel.min.js' }
  const fake = fakeGemini()
  await ctx.route('**/*', route => {
    const u = route.request().url()
    const k = Object.keys(local).find(k => u.endsWith(k))
    if (k) return route.fulfill({ path: path.join(ROOT, local[k]), contentType: 'application/javascript' })
    if (/generativelanguage\.googleapis\.com/.test(u)) return fake.handler(route)
    if (u.startsWith('http://127.0.0.1')) return route.continue()
    return route.fulfill({ status: 404, body: '' })
  })
  const errors = []
  const watch = p => { p.on('pageerror', e => errors.push(p.url().split('#')[1] + ' pageerror: ' + e.message)) }
  const snapshotStorage = async p => p.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k) } return o })
  const bootApp = async p => { await p.goto(base); for (let i = 0; i < 240; i++) { await p.waitForTimeout(500); if (await p.evaluate(() => /Words/.test(document.body.innerText))) return true } return false }

  // P1 — seed the real storage, boot the normal app, let it settle, snapshot
  const app = await ctx.newPage(); watch(app)
  await app.goto(base)
  await app.evaluate(p => { localStorage.clear(); for (const k in p) localStorage.setItem(k, p[k]) }, learnerProfile())
  ok('P1 normal app boots with the seeded learner', await bootApp(app))
  await app.waitForTimeout(3000)
  const before = await snapshotStorage(app)
  await app.close()
  const sha = o => crypto.createHash('sha256').update(JSON.stringify(Object.keys(o).sort().map(k => [k, o[k]]))).digest('hex').slice(0, 16)
  ok('P1 real storage snapshot taken', Object.keys(before).length >= 8, Object.keys(before).length + ' keys · sha ' + sha(before))

  // P2 — the panel
  const panel = await ctx.newPage(); watch(panel)
  const downloads = []
  panel.on('download', d => downloads.push(d))
  await panel.goto(base + '#tt-benchmark')
  let ready = false
  for (let i = 0; i < 240 && !ready; i++) { await panel.waitForTimeout(500); ready = await panel.evaluate(() => /KEY FOUND/.test(document.body.innerText)) }
  const ptxt = await panel.evaluate(() => document.body.innerText)
  ok('P2 panel shows SANDBOX ACTIVE', /SANDBOX ACTIVE/.test(ptxt))
  ok('P2 panel finds the Gemini key (and never shows it)', ready && !ptxt.includes(TEST_KEY))
  const fxs = await panel.evaluate(() => window.ttBenchPanel.fixtures().map(f => ({ id: f.id, cls: f.fidelity.class, exact: f.fidelity.exactLearnerState })))
  ok('P2 six historical fixtures offered', fxs.length === 6 && FIX.every(id => fxs.some(f => f.id === id)), fxs.map(f => f.id + ':' + f.cls))
  ok('P2 Thai fixtures are labelled RECONSTRUCTED, none claims an exact learner state', fxs.filter(f => /^th-/.test(f.id)).every(f => f.cls === 'RECONSTRUCTED') && fxs.every(f => f.exact === false) && (ptxt.match(/RECONSTRUCTED/g) || []).length >= 2)
  const panelSandbox = await panel.evaluate(() => TT_BENCH_SANDBOX.summary())
  ok('P2 panel read only the key name from real storage', JSON.stringify(panelSandbox.realReadKeys) === JSON.stringify(['tt-gemini-key']), panelSandbox)

  // P3 — replay mode, one fixture at a time
  const live = {}
  for (const id of FIX) {
    const cas = cassettes[id]
    const r = await panel.evaluate(([id, c]) => window.ttBenchPanel.runOne(id, 9, { replayCassette: c }), [id, cas.cassette])
    const cmp = compareContent(cas.outcome.content, r.outcome && r.outcome.content)
    ok('P3 ' + id + ' browser REPLAY faithful + content identical to Node', r.replay && r.replay.faithful && cmp.identical,
      { replay: r.replay && { served: r.replay.served, recorded: r.replay.recorded, mismatches: r.replay.mismatches.length, unused: r.replay.unused.length }, error: r.error || (r.outcome && r.outcome.error) || null, diffAt: cmp.firstDiffAt })
  }
  // P9 — the shadow pilot (Gen2) runs in the same sandboxed worker: browser replay of the Node Gen2 cassettes is faithful
  for (const id of ['zh-daily-2026-10-08', 'ja-listening-2026-10-08', 'th-daily-2026-10-08']) {
    const g = JSON.parse(fs.readFileSync(path.join(__dirname, 'cassettes', 'gen2', id + '.gen2.sim.json'), 'utf8'))
    const r = await panel.evaluate(([id, c]) => window.ttBenchPanel.runOne(id, 9, { pipeline: 'gen2', replayCassette: c }), [id, g.cassette])
    const cmp = compareContent(g.outcome.content, r.outcome && r.outcome.content)
    ok('P9 ' + id + ' Gen2 pilot in the browser worker: replay faithful + content identical to Node, pipeline recorded as gen2, sandbox intact',
      r.pipeline === 'gen2' && r.replay && r.replay.faithful && cmp.identical && r.sandbox && r.sandbox.installed && r.sandbox.realWriteAttemptsBlocked === 0,
      { pipeline: r.pipeline, replay: r.replay && { served: r.replay.served, recorded: r.replay.recorded, mismatches: r.replay.mismatches.length }, diffAt: cmp.firstDiffAt, error: r.error || null })
  }
  // P4 — live mode through the app's fetch and stored key; then the browser cassette must replay in Node
  for (const id of FIX) {
    const s0 = { ...fake.stats }
    const r = await panel.evaluate(id => window.ttBenchPanel.runOne(id, 1), id)
    live[id] = r
    const unknown = fake.stats.unknown - s0.unknown, wrong = fake.stats.wrongKey - s0.wrongKey
    const cmpLive = compareContent(cassettes[id].outcome.content, r.outcome && r.outcome.content)
    ok('P4 ' + id + ' live-mode run: only known requests, always the stored key, content = Node', !r.error && unknown === 0 && wrong === 0 && cmpLive.identical,
      { requests: r.cassette && r.cassette.entries.length, unknown, wrongKey: wrong, error: r.error || null, diffAt: cmpLive.firstDiffAt, sample: fake.stats.unknownSamples[0] || null })
    const keyless = JSON.stringify(r).includes(TEST_KEY) === false
    ok('P4 ' + id + ' result file contains no key', keyless)
    const rs = r.sandbox || {}
    ok('P4 ' + id + ' worker sandbox: installed, 0 blocked writes, real reads = key names only', rs.installed && rs.realWriteAttemptsBlocked === 0 && rs.realReadKeys.every(k => /^tt-gemini-(key|fallback-key)$/.test(k)), rs)
    const node = await runOnceUi(loadFixture(id), { mode: 'replay', cassette: r.cassette })
    const cmpNode = compareContent(r.outcome.content, node.content)
    ok('P4 ' + id + ' browser-recorded cassette replays FAITHFULLY in Node', node.replay.faithful && cmpNode.identical,
      { served: node.replay.served, recorded: node.replay.recorded, mismatches: node.replay.mismatches.slice(0, 1), unused: node.replay.unused.length, diffAt: cmpNode.firstDiffAt })
    fs.writeFileSync(path.join(__dirname, 'results', 'browser-live-mode.' + id + '.json'), JSON.stringify({ note: 'browser LIVE-MODE recording against the FAKE Gemini (simulator responses) — mechanics only, not teaching quality', run: r }))
  }

  // P5 — the real button: Run all 18
  if (!SKIP_ALL) {
    const t0 = Date.now()
    await panel.click('#go')
    let done = 0
    for (let i = 0; i < 3600 && done < 18; i++) { await panel.waitForTimeout(1000); done = await panel.evaluate(() => window.ttBenchPanel.state.results.length) }
    const st = await panel.evaluate(() => window.ttBenchPanel.state.results.map(r => ({ id: r.fixtureId, n: r.runNo, err: r.error || (r.outcome && r.outcome.error) || null, status: r.outcome && r.outcome.content && r.outcome.content.status, req: r.cassette && r.cassette.entries.length })))
    ok('P5 "Run all 18" completed 18 runs (order: run 1 of every type, then 2, then 3)', done === 18 && st.slice(0, 6).every(x => x.n === 1) && st.slice(12).every(x => x.n === 3), { seconds: Math.round((Date.now() - t0) / 1000), first: st.slice(0, 6).map(x => x.id + '#' + x.n) })
    ok('P5 no run errored', st.every(x => !x.err), st.filter(x => x.err).slice(0, 2))
    // three runs of one fixture against the same responses are identical (determinism of the in-app path)
    const res = await panel.evaluate(() => window.ttBenchPanel.state.results.map(r => ({ id: r.fixtureId, n: r.runNo, c: JSON.stringify(r.outcome.content) })))
    ok('P5 the 3 runs of each fixture are identical when the model answers identically', FIX.every(id => new Set(res.filter(x => x.id === id).map(x => x.c)).size === 1))
    await panel.waitForTimeout(1500)
    ok('P5 one file saved per run', downloads.length === 18, downloads.length + ' downloads')
    const runDir = path.join(__dirname, 'results', 'browser-run-files'); fs.rmSync(runDir, { recursive: true, force: true }); fs.mkdirSync(runDir, { recursive: true })
    for (const d of downloads) await d.saveAs(path.join(runDir, d.suggestedFilename()))
    // P8 — resume after an interruption: a NEW panel page loads the saved run files and does not repeat them
    const p2 = await ctx.newPage(); watch(p2)
    await p2.goto(base + '#tt-benchmark')
    for (let i = 0; i < 240; i++) { await p2.waitForTimeout(500); if (await p2.evaluate(() => /KEY FOUND/.test(document.body.innerText))) break }
    await p2.setInputFiles('#ld', fs.readdirSync(runDir).map(f => path.join(runDir, f)))
    await p2.waitForTimeout(1500)
    const resumed = await p2.evaluate(() => ({ n: window.ttBenchPanel.state.results.length, goDisabled: document.getElementById('go').disabled, text: document.body.innerText.match(/Done \d+\/\d+/)[0] }))
    ok('P8 resume: a new panel page loads the 18 saved run files; nothing is left to run', resumed.n === 18 && resumed.goDisabled && resumed.text === 'Done 18/18', resumed)
    await p2.close()
    const [dl] = await Promise.all([panel.waitForEvent('download'), panel.click('#dl')])
    const bundlePath = path.join(__dirname, 'results', 'browser-bundle-sample.json')
    await dl.saveAs(bundlePath)
    const raw = fs.readFileSync(bundlePath, 'utf8'), b = JSON.parse(raw)
    ok('P5 bundle: format, 18 runs, fidelity per fixture, no key anywhere', b.format === 'tt-benchmark-bundle/1' && b.runs.length === 18 && b.fixtures.every(f => f.fidelity && f.fidelity.class) && !raw.includes(TEST_KEY),
      { bytes: raw.length, classes: b.fixtures.map(f => f.id + ':' + f.fidelity.class) })
    // the Node importer accepts the bundle and every run replays faithfully
    const imp = require('./import_bundle')
    const rep = await imp.importBundle(b, { outDir: path.join(__dirname, 'results', 'import-sample'), verify: true, label: 'browser-test (FAKE Gemini — not a baseline)' })
    ok('P5 import_bundle: 18 runs imported, all replay faithfully in Node', rep.runs.length === 18 && rep.runs.every(x => x.replayFaithful && x.contentIdentical), rep.runs.filter(x => !(x.replayFaithful && x.contentIdentical)).slice(0, 2))
  }

  // P6 — device snapshot fixtures (read-only)
  await panel.click('#dev')
  await panel.waitForTimeout(1500)
  const dev = await panel.evaluate(() => window.ttBenchPanel.fixtures().filter(f => f.fidelity.class === 'DEVICE_SNAPSHOT').map(f => ({ id: f.id, exact: f.fidelity.exactLearnerState, words: f.wordState.length, belt: f.belt.rank, targets: f.targets.length })))
  ok('P6 device snapshot: 6 DEVICE_SNAPSHOT fixtures with exact per-word state', dev.length === 6 && dev.every(d => d.exact && d.words > 0 && d.targets === 30), dev)
  const ps2 = await panel.evaluate(() => TT_BENCH_SANDBOX.summary())
  ok('P6 panel real reads = key + the three vocab keys (names only), 0 blocked writes', ps2.realWriteAttemptsBlocked === 0 && ['tt-vocab', 'tt-ja-vocab', 'tt-zh-vocab'].every(k => ps2.realReadKeys.includes(k)), ps2.realReadKeys)
  await panel.close()

  // P7 — real storage untouched; the normal app still boots
  const app2 = await ctx.newPage(); watch(app2)
  const booted = await bootApp(app2)
  await app2.waitForTimeout(3000)
  const after = await snapshotStorage(app2)
  const changed = Object.keys({ ...before, ...after }).filter(k => before[k] !== after[k])
  ok('P7 real browser storage identical after benchmark mode (every key, every value)', changed.length === 0, { before: sha(before), after: sha(after), changed })
  ok('P7 normal app still boots', booted)
  ok('P7 no page errors in any page', errors.length === 0, errors.slice(0, 4))
  await browser.close(); srv.close()
  const pass = checks.every(c => c.pass)
  fs.writeFileSync(path.join(__dirname, 'results', 'v676-browser-bench.json'), JSON.stringify({ at: new Date().toISOString(), note: 'headless Chromium; Gemini faked at the network from v674 UI-path SIMULATOR cassettes — mechanics only', fakeGemini: fake.stats, pass, checks }, null, 1))
  console.log((pass ? 'ALL PASS' : 'FAILURES') + ' — ' + checks.filter(c => c.pass).length + '/' + checks.length)
  process.exit(pass ? 0 : 1)
})().catch(e => { console.error(e); process.exit(1) })
