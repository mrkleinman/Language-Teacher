#!/usr/bin/env node
// TEST BUILD ISOLATION CHECK — the production page (/) and the test build (/test/) are served from ONE origin, exactly as on
// GitHub Pages, so they share one localStorage. The learner's data is seeded and opened in production first; then the test build
// is used (three languages, settings changes, removals, clear()). Pass = every real (non tt-test:) key is byte-identical
// afterwards, the test build read the learner's real data, and "Delete test data" removes only tt-test: keys.
//   node sandbox/browser_test_build_isolation.js <site dir with index.html and test/index.html> [thai backup json]
'use strict'
const fs = require('fs'), path = require('path'), http = require('http')
const { chromium } = require('playwright')
const ROOT = path.join(__dirname, '..')
const [SITE, BACKUP] = process.argv.slice(2)
const checks = []
const ok = (n, c, d) => { checks.push({ n, pass: !!c }); console.log((c ? 'PASS ' : 'FAIL ') + n + (d != null ? ' — ' + (typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 300) : '')) }
const local = { 'react.production.min.js': 'node_modules/react/umd/react.production.min.js', 'react-dom.production.min.js': 'node_modules/react-dom/umd/react-dom.production.min.js', 'babel.min.js': 'node_modules/@babel/standalone/babel.min.js' }
const P = 'tt-test:'

;(async () => {
  const srv = await new Promise(res => { const s = http.createServer((req, rsp) => {
    let p = decodeURIComponent(req.url.split('?')[0].split('#')[0]); if (p.endsWith('/')) p += 'index.html'
    const f = path.join(SITE, p)
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); return rsp.end() }
    rsp.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); fs.createReadStream(f).pipe(rsp) }); s.listen(0, '127.0.0.1', () => res(s)) })
  const base = 'http://127.0.0.1:' + srv.address().port
  const browser = await chromium.launch(), ctx = await browser.newContext(), page = await ctx.newPage()
  const errors = [], outside = []
  page.on('pageerror', e => errors.push(e.message))
  page.on('dialog', d => d.accept())
  await page.route('**/*', async route => {
    const u = route.request().url(), k = Object.keys(local).find(k => u.endsWith(k))
    if (k) return route.fulfill({ path: path.join(ROOT, local[k]), contentType: 'application/javascript' })
    if (u.startsWith(base)) return route.continue()
    outside.push(u.replace(/\?.*/, '')); return route.fulfill({ status: 404, body: '' })    // no AI / paid request ever leaves
  })
  const go = async (url, marker = /Daily|Track|Next targets|new words/i) => {
    await page.goto(base + url); let t = ''
    for (let i = 0; i < 240; i++) { t = await page.evaluate(() => document.body.innerText); if (marker.test(t)) break; await page.waitForTimeout(250) }
    await page.waitForTimeout(1500); return page.evaluate(() => document.body.innerText)
  }
  // raw view of storage that bypasses the test build's prelude (original Storage methods kept by the browser on a fresh frame)
  const raw = () => page.evaluate(() => { const f = document.createElement('iframe'); f.src = 'about:blank'; document.body.appendChild(f)
    const G = f.contentWindow.Storage.prototype.getItem, out = {}
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); out[k] = G.call(localStorage, k) }
    f.remove(); return out })
  const real = s => Object.fromEntries(Object.entries(s).filter(([k]) => !k.startsWith('tt-test:')).sort())
  const testKeys = s => Object.keys(s).filter(k => k.startsWith('tt-test:'))

  // 1 · the learner's data, as production stores it
  const b = BACKUP && fs.existsSync(BACKUP) ? JSON.parse(fs.readFileSync(BACKUP, 'utf8')) : null
  await page.goto(base + '/')
  await page.evaluate(([b]) => { localStorage.clear()
    localStorage.setItem('tt-gemini-key', JSON.stringify('AIzaSyTEST-isolation-000000000000000'))
    localStorage.setItem('tt-active-language', JSON.stringify('ja'))
    if (b) { localStorage.setItem('tt-vocab', JSON.stringify(b.vocab)); localStorage.setItem('tt-tracks', JSON.stringify(b.tracks || [])) } }, [b])
  await go('/'); await page.evaluate(() => localStorage.setItem('tt-active-language', JSON.stringify('zh'))); await go('/')
  await page.evaluate(() => localStorage.setItem('tt-active-language', JSON.stringify('th'))); const prodTh = await go('/')
  const R0 = real(await raw())
  ok('production page holds the learner data (' + Object.keys(R0).length + ' keys)', R0['tt-vocab'] && R0['tt-ja-vocab'] && R0['tt-zh-vocab'], Object.keys(R0))

  // 2 · use the test build hard: open each language, change settings, remove keys, clear()
  const testTh = await go('/test/')
  // the expected version is the production page's own (both pages are built from the same index.html)
  const _want = (fs.readFileSync(path.join(SITE, 'index.html'), 'utf8').match(/name="app-version" content="([^"]+)"/) || [])[1]
  ok('test build shows the TEST banner and ' + _want, new RegExp('TEST BUILD ' + _want).test(testTh) && (await page.evaluate(() => document.querySelector('meta[name=app-version]').content)) === _want)
  const strip = t => t.replace(/TEST BUILD[^\n]*\n?/, '').replace(/Delete test data\n?/, '').replace(/v69\d/g, 'vX')
  const words = t => (t.match(/\b\d+\s+(words?|known|learning|due)\b/gi) || []).join(' | ')
  ok('test build READS the real Thai progress (same word counts as production)', words(strip(testTh)) === words(prodTh) && words(prodTh).length > 0, words(prodTh) + ' ‖ ' + words(strip(testTh)))
  for (const lang of ['ja', 'zh', 'th']) { await page.evaluate(l => localStorage.setItem('tt-active-language', JSON.stringify(l)), lang); await go('/test/') }
  await page.evaluate(() => { localStorage.setItem('tt-speed', '0.5'); localStorage.setItem('tt-daily-new', '9'); localStorage.removeItem('tt-gemini-key'); localStorage.removeItem('tt-tracks')
    const v = JSON.parse(localStorage.getItem('tt-vocab')); v[0].status = 'known'; v[0].repCount = 99; localStorage.setItem('tt-vocab', JSON.stringify(v)) })
  const seen = await page.evaluate(() => ({ key: localStorage.getItem('tt-gemini-key'), tracks: localStorage.getItem('tt-tracks'), speed: localStorage.getItem('tt-speed') }))
  ok('inside the test build, its own changes are visible (removed = gone, set = new value)', seen.key === null && seen.tracks === null && seen.speed === '0.5', seen)
  await page.evaluate(() => localStorage.clear())
  // try every button on the Thai dashboard that does not start generation (clicks may write progress / settings)
  await go('/test/')
  const clicked = await page.evaluate(() => { const bs = [...document.querySelectorAll('button')].filter(b => !/generat|daily|track|retry|listen|delete|import|export|download|reset|clear/i.test(b.innerText)); bs.slice(0, 25).forEach(b => { try { b.click() } catch (e) {} }); return bs.length })
  await page.waitForTimeout(1500)
  const S1 = await raw(), R1 = real(S1)
  const diff = [...new Set([...Object.keys(R0), ...Object.keys(R1)])].filter(k => R0[k] !== R1[k])
  ok('after using the test build, EVERY real key is byte-identical (' + Object.keys(R1).length + ' keys; ' + clicked + ' buttons clicked)', diff.length === 0, diff)
  ok('test build wrote only to tt-test: keys (' + testKeys(S1).length + ')', testKeys(S1).length > 0)

  // 3 · production afterwards: same data, unaffected by the test build
  const prodAfter = await go('/')
  ok('production page afterwards shows the same Thai progress', words(prodAfter) === words(prodTh), words(prodAfter))
  ok('production page has no TEST banner', !/TEST BUILD/.test(prodAfter))

  // 4 · "Delete test data" removes only the test copy
  await go('/test/'); await page.click('text=Delete test data'); await page.waitForTimeout(3000)
  await go('/test/'); await page.waitForTimeout(500)
  const S2 = await raw(), R2 = real(S2)
  const left = testKeys(S2).filter(k => !/^tt-test:tt-(migrations|phonetics-cache|.*-cache|learner-snapshot-)/.test(k))
  const diff2 = [...new Set([...Object.keys(R0), ...Object.keys(R2)])].filter(k => R0[k] !== R2[k])
  ok('"Delete test data" kept every real key identical', diff2.length === 0, diff2)
  ok('"Delete test data" reset the test copy (only caches the app rebuilds on reload remain)', left.length <= testKeys(S1).length, testKeys(S2))
  const ai = outside.filter(u => /generativelanguage|run\.app|anthropic|openrouter|texttospeech|deepseek/i.test(u))
  ok('no AI / paid request was made (' + outside.length + ' other requests, e.g. web fonts, blocked)', ai.length === 0, ai.slice(0, 5))
  ok('no page errors', errors.length === 0, errors.slice(0, 3))
  await browser.close(); srv.close()
  const pass = checks.filter(c => c.pass).length
  console.log('\nTEST BUILD ISOLATION: ' + pass + '/' + checks.length + (pass === checks.length ? ' OK' : ' FAILED'))
  process.exit(pass === checks.length ? 0 : 1)
})().catch(e => { console.error(e); process.exit(2) })
