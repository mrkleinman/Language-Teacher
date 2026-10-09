#!/usr/bin/env node
// v680 — the Thai and Mandarin "Use the new generator (test)" switches in the REAL page (headless Chromium, served over http).
// Gemini is faked at the network: the scene request gets a fixed scene; every other request is recorded by its prompt
// tag and refused with HTTP 402, so the screen stops right after choosing its pipeline (no lesson is built here — the
// full generation path is covered by the Node app-path runs, which call the same jaGen2MainTrack).
//   T1  Thai boots; Daily Track → scene preview shows the switch, OFF; the button reads "Generate Track from this Scene"
//   T2  switch OFF → Generate sends the STANDARD Thai generator's request (no gen2 request)
//   T3  switch ON → button relabelled, tt-th-gen2 = true stored, survives a reload
//   T4  switch ON → Generate sends Gen2 requests and no standard generation request; nothing saved; a way back is offered
//   M1  Mandarin dashboard shows the switch, OFF by default
//   M2  switch OFF → Daily Track sends the STANDARD Mandarin request (no gen2 request)
//   M3  switch ON → tt-zh-gen2 = true stored; Daily Track sends Gen2 requests and no standard request; nothing saved
//   M4  Japanese switch untouched (tt-ja-gen2 never written by these steps); no page errors
'use strict'
const fs = require('fs'), path = require('path'), http = require('http')
const { chromium } = require('playwright')
const ROOT = path.join(__dirname, '..')
const checks = []
const ok = (n, c, d) => { checks.push({ n, pass: !!c, d: d == null ? null : d }); console.log((c ? 'PASS ' : 'FAIL ') + n + (d != null ? ' — ' + (typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 300) : '')) }
const SCENE_UNUSED = { scene: 'Two friends meet at a café after work.', characterA: 'Ken, a Japanese man', characterB: 'Yui, a Japanese woman', opening: 'こんにちは。', opening_reading: 'こんにちは',
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
  const browser = await chromium.launch()
  const THSCENE = { scene: 'Two friends planning a weekend trip.', characterA: 'Somchai, a Thai man', characterB: 'Nida, a Thai woman', opening: 'สวัสดีครับ', opening_phonetic: '', opening_english: 'Hello.', opening_prompt: 'Somchai greets Nida',
    reply: 'สวัสดีค่ะ', reply_phonetic: '', reply_english: 'Hello.', reply_prompt: 'Nida greets him', closing: 'แล้วเจอกันครับ', closing_phonetic: '', closing_english: 'See you later.', closing_prompt: 'Somchai says goodbye',
    closing_reply: 'แล้วเจอกันค่ะ', closing_reply_phonetic: '', closing_reply_english: 'See you later.', closing_reply_prompt: 'Nida says goodbye' }
  const local = { 'react.production.min.js': 'node_modules/react/umd/react.production.min.js', 'react-dom.production.min.js': 'node_modules/react-dom/umd/react-dom.production.min.js', 'babel.min.js': 'node_modules/@babel/standalone/babel.min.js' }
  async function session(lang) {
    const ctx = await browser.newContext(), page = await ctx.newPage(), errors = [], seen = []
    page.on('pageerror', e => errors.push(e.message))
    await page.route('**/*', async route => {
      const u = route.request().url()
      const k = Object.keys(local).find(k => u.endsWith(k))
      if (k) return route.fulfill({ path: path.join(ROOT, local[k]), contentType: 'application/javascript' })
      if (u.startsWith(base)) return route.continue()
      if (/generativelanguage\.googleapis\.com/.test(u)) {
        let q = ''; try { q = JSON.parse(route.request().postData() || '').contents.map(c => c.parts.map(p => p.text).join('')).join('\n') } catch (e) {}
        const tag = (q.match(/^\[task: ([^\]]+)\]/) || [])[1] || null
        const isScene = /You design Thai language lesson scenarios/.test(q)
        seen.push({ tag, isScene, head: q.slice(0, 80) })
        if (isScene) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(THSCENE) }] } }], usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 10, totalTokenCount: 20 } }) })
        return route.fulfill({ status: 402, contentType: 'application/json', body: JSON.stringify({ error: { code: 402, status: 'PAYMENT_REQUIRED', message: 'browser test: stop here' } }) })
      }
      return route.fulfill({ status: 404, body: '' })
    })
    await page.addInitScript(l => { try { if (!localStorage.getItem('tt-gemini-key')) { localStorage.setItem('tt-gemini-key', JSON.stringify('AIzaSyTEST-browser-v680-0000000000')); localStorage.setItem('tt-active-language', JSON.stringify(l)) } } catch (e) {} }, lang)
    const waitText = async (re, ms = 120000) => { for (let i = 0; i < ms / 250; i++) { if (re.test(await page.evaluate(() => document.body.innerText))) return true; await page.waitForTimeout(250) } return false }
    const settle = async () => { for (let i = 0; i < 80 && !seen.some(s => !s.isScene); i++) await page.waitForTimeout(250); await page.waitForTimeout(1500) }
    return { ctx, page, errors, seen, waitText, settle }
  }
  const std = seen => seen.filter(s => !s.tag && !s.isScene).length, g2 = seen => seen.filter(s => /^gen2-daily-probe/.test(s.tag || '')).length
  // ── Thai ──
  {
    const S = await session('th'), { page } = S
    const box = page.locator('label:has-text("Use the new generator") input[type=checkbox]')
    const toScene = async () => { const b = await S.waitText(/Daily Track/); await page.getByText('Daily Track', { exact: true }).first().click(); return b && await S.waitText(/Generate Track from this Scene|Generate with the NEW generator/) }
    await page.goto(base)
    const ok1 = await toScene()
    ok('T1 Thai: scene preview shows the switch, OFF by default, button "Generate Track from this Scene"', ok1 && await box.count() === 1 && !(await box.isChecked()) && await page.getByText('Generate Track from this Scene').count() === 1, S.errors.slice(0, 2))
    S.seen.length = 0
    await page.getByText('Generate Track from this Scene').click(); await S.settle()
    ok('T2 Thai switch OFF → the STANDARD generator runs (no gen2 request)', S.seen.length > 0 && g2(S.seen) === 0 && std(S.seen) > 0, S.seen.slice(0, 2))
    await page.goto(base); await toScene()
    await box.check(); await page.waitForTimeout(300)
    const label = await page.getByText('Generate with the NEW generator (test)').count(), stored = await page.evaluate(() => localStorage.getItem('tt-th-gen2'))
    await page.goto(base); await toScene()
    ok('T3 Thai switch ON relabels the button, stores tt-th-gen2=true and survives a reload', label === 1 && stored === 'true' && await box.isChecked(), { label, stored })
    const tracksBefore = await page.evaluate(() => JSON.stringify(Object.keys(localStorage).filter(k => /track/i.test(k)).map(k => [k, localStorage.getItem(k)])))
    S.seen.length = 0
    await page.getByText('Generate with the NEW generator (test)').click(); await S.settle()
    const back = await S.waitText(/new generator could not build|Back|Try again|stop here/i, 30000)
    const tracksAfter = await page.evaluate(() => JSON.stringify(Object.keys(localStorage).filter(k => /track/i.test(k) && k !== 'tt-gen-draft').map(k => [k, localStorage.getItem(k)])))
    ok('T4 Thai switch ON → Gen2 requests, no standard generation request, nothing saved, a way back offered', g2(S.seen) > 0 && std(S.seen) === 0 && back &&
      tracksAfter === JSON.stringify(JSON.parse(tracksBefore).filter(([k]) => k !== 'tt-gen-draft')), { gen2: g2(S.seen), standard: std(S.seen) })
    ok('T5 Thai: no page errors; the Japanese switch was never written', !S.errors.length && await page.evaluate(() => localStorage.getItem('tt-ja-gen2')) === null, S.errors.slice(0, 3))
    await S.ctx.close()
  }
  // ── Mandarin ──
  {
    const S = await session('zh'), { page } = S
    const box = page.locator('label:has-text("Use the new generator") input[type=checkbox]')
    await page.goto(base)
    const booted = await S.waitText(/Daily Track/)
    ok('M1 Mandarin dashboard shows the switch, OFF by default', booted && await box.count() === 1 && !(await box.isChecked()), S.errors.slice(0, 2))
    S.seen.length = 0
    await page.getByText('Daily Track', { exact: true }).first().click(); await S.settle()
    ok('M2 Mandarin switch OFF → Daily Track runs the STANDARD generator (no gen2 request)', S.seen.length > 0 && g2(S.seen) === 0 && std(S.seen) > 0, S.seen.slice(0, 2))
    await page.goto(base); await S.waitText(/Daily Track/)
    await box.check(); await page.waitForTimeout(300)
    const stored = await page.evaluate(() => localStorage.getItem('tt-zh-gen2'))
    await page.goto(base); await S.waitText(/Daily Track/)
    const kept = await box.isChecked()
    const before = await page.evaluate(() => localStorage.getItem('tt-zh-tracks'))
    S.seen.length = 0
    await page.getByText('Daily Track', { exact: true }).first().click(); await S.settle()
    const back = await S.waitText(/new generator could not build|Back|Try again|stop here/i, 30000)
    ok('M3 Mandarin switch ON → stored (tt-zh-gen2=true, survives reload); Daily Track sends Gen2 requests, no standard request; nothing saved', stored === 'true' && kept && g2(S.seen) > 0 && std(S.seen) === 0 && back &&
      await page.evaluate(() => localStorage.getItem('tt-zh-tracks')) === before, { stored, kept, gen2: g2(S.seen), standard: std(S.seen) })
    ok('M4 Mandarin: no page errors; the Japanese switch was never written', !S.errors.length && await page.evaluate(() => localStorage.getItem('tt-ja-gen2')) === null, S.errors.slice(0, 3))
    await S.ctx.close()
  }
  await browser.close(); srv.close()
  const pass = checks.filter(c => c.pass).length
  console.log('\nv680 browser switch test (Thai + Mandarin): ' + pass + '/' + checks.length + (pass === checks.length ? ' — ALL PASS' : ' — FAILED'))
  fs.mkdirSync(path.join(__dirname, 'logs'), { recursive: true }); fs.writeFileSync(path.join(__dirname, 'logs', 'browser_v680.json'), JSON.stringify(checks, null, 1))
  process.exit(pass === checks.length ? 0 : 1)
})().catch(e => { console.log('CRASH ' + (e && e.stack || e)); process.exit(1) })
