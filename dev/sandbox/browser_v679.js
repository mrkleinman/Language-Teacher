#!/usr/bin/env node
// v679 — the Japanese "Use the new generator (test)" switch in the REAL page (headless Chromium, served over http).
// Gemini is faked at the network: the scene request gets a fixed scene; every other request is recorded by its prompt
// tag and refused with HTTP 402, so the screen stops right after choosing its pipeline (no lesson is built here — the
// full generation path is covered by the Node app-path runs, which call the same jaGen2MainTrack).
//   S1  the app boots on Japanese with no page errors
//   S2  "Daily Track" → Scene Ready; the switch is present and OFF by default; the button reads "Generate Track…"
//   S3  switch OFF → Generate sends the STANDARD generator's request first (no gen2 request)
//   S4  turning the switch ON changes the button label and stores tt-ja-gen2 = true; it survives a reload
//   S5  switch ON → Generate sends a Gen2 request ([task: gen2-daily-probe]) and no standard generation request
//   S6  no track is saved (tt-ja-tracks unchanged) and the error screen offers a way back
'use strict'
const fs = require('fs'), path = require('path'), http = require('http')
const { chromium } = require('playwright')
const ROOT = path.join(__dirname, '..')
const checks = []
const ok = (n, c, d) => { checks.push({ n, pass: !!c, d: d == null ? null : d }); console.log((c ? 'PASS ' : 'FAIL ') + n + (d != null ? ' — ' + (typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 300) : '')) }
const SCENE = { scene: 'Two friends meet at a café after work.', characterA: 'Ken, a Japanese man', characterB: 'Yui, a Japanese woman', opening: 'こんにちは。', opening_reading: 'こんにちは',
  opening_romaji: 'konnichiwa', opening_english: 'Hello.', opening_prompt: 'Ken greets Yui', reply: 'こんにちは。', reply_reading: 'こんにちは', reply_romaji: 'konnichiwa', reply_english: 'Hello.',
  reply_prompt: 'Yui greets Ken', closing: 'じゃあね。', closing_reply: 'またね。', closing_english: 'See you.', closing_reply_english: 'See you later.' }
function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      const p = decodeURIComponent(req.url.split('?')[0].split('#')[0])
      const f = p === '/' ? path.join(ROOT, 'index.html') : path.join(ROOT, p)
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); return rsp.end() }
      rsp.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream' }); fs.createReadStream(f).pipe(rsp)
    })
    srv.listen(0, '127.0.0.1', () => res(srv))
  })
}
;(async () => {
  const srv = await serve(), base = 'http://127.0.0.1:' + srv.address().port + '/'
  const browser = await chromium.launch({ executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? undefined : undefined })
  const ctx = await browser.newContext(), page = await ctx.newPage()
  const errors = [], seen = []
  page.on('pageerror', e => errors.push(e.message))
  const local = { 'react.production.min.js': 'node_modules/react/umd/react.production.min.js', 'react-dom.production.min.js': 'node_modules/react-dom/umd/react-dom.production.min.js', 'babel.min.js': 'node_modules/@babel/standalone/babel.min.js' }
  await page.route('**/*', async route => {
    const u = route.request().url()
    const k = Object.keys(local).find(k => u.endsWith(k))
    if (k) return route.fulfill({ path: path.join(ROOT, local[k]), contentType: 'application/javascript' })
    if (u.startsWith(base)) return route.continue()
    if (/generativelanguage\.googleapis\.com/.test(u)) {
      const body = route.request().postData() || ''
      let q = ''; try { q = JSON.parse(body).contents.map(c => c.parts.map(p => p.text).join('')).join('\n') } catch (e) {}
      const tag = (q.match(/^\[task: ([^\]]+)\]/) || [])[1] || null
      const isScene = /"closing_reply":"\.\.\.","closing_reply_reading"/.test(q)
      seen.push({ tag, isScene, head: q.slice(0, 80) })
      if (isScene) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(SCENE) }] } }], usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 10, totalTokenCount: 20 } }) })
      return route.fulfill({ status: 402, contentType: 'application/json', body: JSON.stringify({ error: { code: 402, status: 'PAYMENT_REQUIRED', message: 'browser test: stop here' } }) })
    }
    return route.fulfill({ status: 404, body: '' })
  })
  await page.addInitScript(() => { try { if (!localStorage.getItem('tt-gemini-key')) { localStorage.setItem('tt-gemini-key', JSON.stringify('AIzaSyTEST-browser-v679-0000000000')); localStorage.setItem('tt-active-language', JSON.stringify('ja')) } } catch (e) {} })
  const waitText = async (re, ms = 120000) => { for (let i = 0; i < ms / 250; i++) { if (re.test(await page.evaluate(() => document.body.innerText))) return true; await page.waitForTimeout(250) } return false }
  const toScene = async () => {
    const booted = await waitText(/Daily Track/)
    await page.getByText('Daily Track', { exact: true }).first().click()
    return booted && await waitText(/Scene Ready/)
  }
  await page.goto(base)
  const s2 = await toScene()
  ok('S1 boots on Japanese with no page errors', s2 && !errors.length, errors.slice(0, 3))
  const box = page.locator('label:has-text("Use the new generator") input[type=checkbox]')
  ok('S2 Scene Ready shows the switch, OFF by default, button "Generate Track from this Scene"', s2 && await box.count() === 1 && !(await box.isChecked()) && await page.getByText('Generate Track from this Scene').count() === 1)
  const tracksBefore = await page.evaluate(() => localStorage.getItem('tt-ja-tracks'))
  seen.length = 0
  await page.getByText('Generate Track from this Scene').click()
  for (let i = 0; i < 80 && !seen.length; i++) await page.waitForTimeout(250)
  ok('S3 switch OFF → the STANDARD generator runs (first request untagged, no gen2 request)', seen.length > 0 && !seen.some(s => /^gen2-/.test(s.tag || '')), seen.slice(0, 2))
  // back to a fresh Scene Ready, turn the switch on
  await page.goto(base); await toScene()
  await box.check()
  const label = await page.getByText('Generate with the NEW generator (test)').count()
  await page.waitForTimeout(300)
  const stored = await page.evaluate(() => localStorage.getItem('tt-ja-gen2'))
  await page.goto(base); await toScene()
  ok('S4 switch ON relabels the button, stores tt-ja-gen2=true and survives a reload', label === 1 && stored === 'true' && await box.isChecked(), { label, stored })
  seen.length = 0
  await page.getByText('Generate with the NEW generator (test)').click()
  for (let i = 0; i < 80 && !seen.some(s => s.tag); i++) await page.waitForTimeout(250)
  await page.waitForTimeout(1500)
  const g2 = seen.filter(s => /^gen2-daily-probe/.test(s.tag || '')).length, std = seen.filter(s => !s.tag && !s.isScene).length
  ok('S5 switch ON → Generate sends Gen2 requests and no standard generation request', g2 > 0 && std === 0, { gen2: g2, standard: std, first: seen[0] })
  const errShown = await waitText(/new generator could not build|Back|Try again/i, 30000)
  const tracksAfter = await page.evaluate(() => localStorage.getItem('tt-ja-tracks'))
  ok('S6 nothing is saved (tt-ja-tracks unchanged) and the screen offers a way back', tracksAfter === tracksBefore && errShown, { errShown })
  ok('S7 no page errors during the whole test', !errors.length, errors.slice(0, 3))
  await browser.close(); srv.close()
  const pass = checks.filter(c => c.pass).length
  console.log('\nv679 browser switch test: ' + pass + '/' + checks.length + (pass === checks.length ? ' — ALL PASS' : ' — FAILED'))
  fs.writeFileSync(path.join(__dirname, 'logs', 'browser_v679.json'), JSON.stringify(checks, null, 1))
  process.exit(pass === checks.length ? 0 : 1)
})().catch(e => { console.log('CRASH ' + (e && e.stack || e)); process.exit(1) })
