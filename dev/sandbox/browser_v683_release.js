#!/usr/bin/env node
// v683 RELEASE SMOKE TEST — the deployed v682 page and the release candidate are opened on IDENTICAL saved learner data
// (headless Chromium, no Gemini request answered). For each learner it compares, old vs new:
//   • every stored learner record after the dashboards are opened (vocabulary / SRS, saved tracks, drafts, settings)
//   • what the dashboard shows (new-word quota, Next targets)
//   node sandbox/browser_v683_release.js <old index.html> <new index.html> [thai backup json]
'use strict'
const fs = require('fs'), path = require('path'), http = require('http')
const { chromium } = require('playwright')
const ROOT = path.join(__dirname, '..')
const [OLD, NEW, BACKUP] = process.argv.slice(2)
const checks = []
const ok = (n, c, d) => { checks.push({ n, pass: !!c }); console.log((c ? 'PASS ' : 'FAIL ') + n + (d != null ? ' — ' + (typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 400) : '')) }
function serve(indexFile) {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      const p = decodeURIComponent(req.url.split('?')[0].split('#')[0])
      const f = p === '/' ? path.resolve(indexFile) : path.join(ROOT, p)
      if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); return rsp.end() }
      rsp.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream' }); fs.createReadStream(f).pipe(rsp)
    })
    srv.listen(0, '127.0.0.1', () => res(srv))
  })
}
const local = { 'react.production.min.js': 'node_modules/react/umd/react.production.min.js', 'react-dom.production.min.js': 'node_modules/react-dom/umd/react-dom.production.min.js', 'babel.min.js': 'node_modules/@babel/standalone/babel.min.js' }
const FIXED_NOW = Date.parse('2026-10-12T09:00:00Z')
async function open(browser, base, seed, marker, gem) {
  const ctx = await browser.newContext(), page = await ctx.newPage(), errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.route('**/*', async route => {
    const u = route.request().url(), k = Object.keys(local).find(k => u.endsWith(k))
    if (k) return route.fulfill({ path: path.join(ROOT, local[k]), contentType: 'application/javascript' })
    if (u.startsWith(base)) return route.continue()
    if (/generativelanguage\.googleapis\.com/.test(u)) { gem.n++; return route.fulfill({ status: 402, body: '{}' }) }
    return route.fulfill({ status: 404, body: '' })
  })
  // same clock for both builds, so date-based SRS logic sees the same "today"
  await page.addInitScript(([seed, now]) => {
    const D = Date, off = now - D.now()
    class FD extends D { constructor(...a) { super(...(a.length ? a : [D.now() + off])) } static now() { return D.now() + off } }
    window.Date = FD
    try { if (!sessionStorage.getItem('seeded')) { localStorage.clear(); Object.entries(seed).forEach(([k, v]) => localStorage.setItem(k, v)); sessionStorage.setItem('seeded', '1') } } catch (e) {}
  }, [seed, FIXED_NOW])
  await page.goto(base)
  let txt = ''
  for (let i = 0; i < 240; i++) { txt = await page.evaluate(() => document.body.innerText); if (marker.test(txt)) break; await page.waitForTimeout(250) }
  await page.waitForTimeout(1500)
  txt = await page.evaluate(() => document.body.innerText)
  const store = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter(k => k.startsWith('tt-')).map(k => [k, localStorage.getItem(k)])))
  await ctx.close()
  return { txt, store, errors }
}
;(async () => {
  const browser = await chromium.launch()
  const sOld = await serve(OLD), sNew = await serve(NEW)
  const bOld = 'http://127.0.0.1:' + sOld.address().port + '/', bNew = 'http://127.0.0.1:' + sNew.address().port + '/'
  const key = { 'tt-gemini-key': JSON.stringify('AIzaSyTEST-release-smoke-00000000000') }
  // default banks as the deployed v682 page creates them (identical starting data for both builds)
  const g0 = { n: 0 }
  const fresh = async lang => (await open(browser, bOld, { ...key, 'tt-active-language': JSON.stringify(lang) }, lang === 'th' ? /Daily|Track/ : /Next targets|Daily/, g0)).store
  const zhBase = await fresh('zh'), jaBase = await fresh('ja')
  const today = '2026-10-12', y = '2026-10-11'
  const zv = JSON.parse(zhBase['tt-zh-vocab']); zv.slice().sort((a, b) => (a.unlockOrder || a.id) - (b.unlockOrder || b.id)).slice(0, 35).forEach(w => Object.assign(w, { status: 'learning', repCount: 3, okCount: 1, lastSeen: y, dueDate: today }))
  const jv = JSON.parse(jaBase['tt-ja-vocab']); jv.forEach(w => { if ((w.belt || 'White') === 'White') Object.assign(w, { status: 'known', repCount: 6, okStreak: 4, interval: 30, lastSeen: '2026-10-01', dueDate: '2026-10-30', introducedAt: '2026-09-01' }) })
  const learners = [
    { name: 'Mandarin learner, 35 words met (Mukyu)', lang: 'zh', seed: { ...key, 'tt-active-language': JSON.stringify('zh'), 'tt-zh-vocab': JSON.stringify(zv) }, marker: /Next targets/ },
    { name: 'Japanese learner, White belt complete (10th Kyu)', lang: 'ja', seed: { ...key, 'tt-active-language': JSON.stringify('ja'), 'tt-ja-vocab': JSON.stringify(jv) }, marker: /new words/i },
  ]
  // a Thai Mukyu beginner (first 20 words met) — the approved Thai Mukyu policy: 3 new words
  const thBase = await fresh('th'), tv = JSON.parse(thBase['tt-vocab'])
  tv.filter(w => w.curriculumIndex >= 1 && w.curriculumIndex <= 20).forEach(w => Object.assign(w, { status: 'learning', repCount: 2, okStreak: 1, lastSeen: y, dueDate: today }))
  learners.push({ name: 'Thai Mukyu beginner (20 words met)', lang: 'th', expectNew: 3, seed: { ...key, 'tt-active-language': JSON.stringify('th'), 'tt-vocab': JSON.stringify(tv) }, marker: /Daily|Track/ })
  if (BACKUP && fs.existsSync(BACKUP)) { const b = JSON.parse(fs.readFileSync(BACKUP, 'utf8'))
    learners.push({ name: 'Thai learner from a real device backup (' + b.vocab.length + ' words, ' + (b.tracks || []).length + ' saved track)', lang: 'th', expectNew: 5, seed: { ...key, 'tt-active-language': JSON.stringify('th'), 'tt-vocab': JSON.stringify(b.vocab), 'tt-tracks': JSON.stringify(b.tracks || []) }, marker: /Daily|Track/ }) }
  for (const L of learners) {
    const gO = { n: 0 }, gN = { n: 0 }
    const o = await open(browser, bOld, L.seed, L.marker, gO), n = await open(browser, bNew, L.seed, L.marker, gN)
    const keys = [...new Set([...Object.keys(o.store), ...Object.keys(n.store)])].sort()
    // a one-time migration stamps the moment it ran ('at' / 'savedAt'); the moment is not learner data
    const norm = v => v == null ? v : v.replace(/"(at|savedAt)":"\d{4}-\d\d-\d\dT[\d:.]+Z"/g, '"$1":"<time>"')
    const diff = keys.filter(k => norm(o.store[k]) !== norm(n.store[k]))
    const changedFromSeed = keys.filter(k => L.seed[k] != null && n.store[k] !== L.seed[k])
    ok('[' + L.name + '] every stored learner record is identical after opening in v682 and in v683 (' + keys.length + ' keys)', !diff.length, diff)
    ok('[' + L.name + '] v683 changes no stored learner record that v682 would not change' + (changedFromSeed.length ? ' (both builds rewrite: ' + changedFromSeed.join(', ') + ')' : ' (nothing rewritten)'), !diff.length)
    ok('[' + L.name + '] no page errors; no Gemini request from opening the dashboard', !o.errors.length && !n.errors.length && !gO.n && !gN.n, { old: o.errors, new: n.errors, gem: [gO.n, gN.n] })
    if (L.lang === 'zh') {
      const m = /Next targets \((\d+)\) · (\d+) new · (\d+) review/i.exec(n.txt), mOld = /Next targets[^\n]*/.exec(o.txt)
      ok('[' + L.name + '] v683 "Next targets" shows all 30 words: 5 new · 25 review (v682 showed: "' + (mOld && mOld[0]) + '")', m && +m[1] === 30 && +m[2] === 5 && +m[3] === 25, m && m[0])
      const learn = t => ((/Learn New Words\s*\n([^\n]+)/.exec(t) || [])[1] || '')
      ok('[' + L.name + '] the Learn New Words card is the same in both builds (5 new words)', learn(o.txt) === learn(n.txt) && learn(n.txt).split('·').filter(x => x.trim()).length === 5, learn(n.txt))
    }
    if (L.lang === 'ja') {
      const m = /Introducing (\d+) new words?/i.exec(n.txt), mo = /Introducing (\d+) new words?/i.exec(o.txt)
      ok('[' + L.name + '] v683 introduces 5 new words per Daily Track (v682: ' + (mo && mo[1]) + ')', m && +m[1] === 5, m && m[0])
    }
    if (process.env.DUMP) fs.writeFileSync(process.env.DUMP + '-' + L.lang + (L.expectNew || '') + '.json', JSON.stringify({ oldTxt: o.txt, newTxt: n.txt, diff: diff.map(k => [k, (o.store[k] || '').slice(0, 3000), (n.store[k] || '').slice(0, 3000)]) }, null, 1))
    if (L.lang === 'th') {
      const m = /Introducing (\d+) new words?/i.exec(n.txt), mo = /Introducing (\d+) new words?/i.exec(o.txt)
      const rank = (/(Mukyu|\d+(?:st|nd|rd|th) Kyu)\n/.exec(n.txt) || [])[1]
      ok('[' + L.name + '] dashboard rank ' + rank + ': v683 introduces ' + L.expectNew + ' new words per Daily Track (owner table; v682: ' + (mo && mo[1]) + ')', m && +m[1] === L.expectNew, m && m[0])
      const strip = t => t.replace(/v68[2-8]/g, '').replace(/Introducing \d+ new words?/gi, '')
      ok('[' + L.name + '] otherwise the Thai dashboard is identical in both builds (only the new-word line and the version label may differ)', strip(o.txt) === strip(n.txt), (() => { const a = strip(o.txt), b = strip(n.txt); let i = 0; while (i < a.length && a[i] === b[i]) i++; return a === b ? '' : 'first difference: old «' + a.slice(Math.max(0, i - 60), i + 80) + '» new «' + b.slice(Math.max(0, i - 60), i + 80) + '»' })())
    }
  }
  await browser.close(); sOld.close(); sNew.close()
  const f = checks.filter(c => !c.pass).length
  console.log('\nv683 release smoke test: ' + (checks.length - f) + '/' + checks.length + (f ? ' — ' + f + ' FAILED' : ' — ALL PASS'))
  process.exit(f ? 1 : 0)
})().catch(e => { console.error('CRASH ' + (e && e.stack || e)); process.exit(2) })
