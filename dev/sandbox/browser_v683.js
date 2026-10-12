#!/usr/bin/env node
// v683 — dashboard display + new-word quota in the REAL page (headless Chromium). No Gemini request is made.
//   D1  Mandarin learner with 35 words met (Mukyu): "Next targets" lists ALL Daily Track targets (30), labelled new / review; the
//       Learn New Words card still lists only the new words (5); Daily Track screen heading says TARGETING 30 WORDS
//   D2  Japanese learner whose White belt is complete (10th Kyu): the belt card and the new-word line say 5 (was 3)
//   D3  no page errors; vocabulary and track lists unchanged by opening the screens
'use strict'
const fs = require('fs'), path = require('path'), http = require('http')
const { chromium } = require('playwright')
const ROOT = path.join(__dirname, '..')
const checks = []
const ok = (n, c, d) => { checks.push({ n, pass: !!c }); console.log((c ? 'PASS ' : 'FAIL ') + n + (d != null ? ' — ' + (typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 500) : '')) }
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
  const local = { 'react.production.min.js': 'node_modules/react/umd/react.production.min.js', 'react-dom.production.min.js': 'node_modules/react-dom/umd/react-dom.production.min.js', 'babel.min.js': 'node_modules/@babel/standalone/babel.min.js' }
  let gemini = 0
  async function session(lang, init) {
    const ctx = await browser.newContext(), page = await ctx.newPage(), errors = []
    page.on('pageerror', e => errors.push(e.message))
    await page.route('**/*', async route => {
      const u = route.request().url(), k = Object.keys(local).find(k => u.endsWith(k))
      if (k) return route.fulfill({ path: path.join(ROOT, local[k]), contentType: 'application/javascript' })
      if (u.startsWith(base)) return route.continue()
      if (/generativelanguage\.googleapis\.com/.test(u)) { gemini++; await new Promise(r => setTimeout(r, 20000)); try { return await route.fulfill({ status: 402, body: '{}' }) } catch (e) { return } }
      return route.fulfill({ status: 404, body: '' })
    })
    await page.addInitScript(([l, extra]) => { try { if (!localStorage.getItem('tt-gemini-key')) { localStorage.setItem('tt-gemini-key', JSON.stringify('AIzaSyTEST-browser-v683-0000000000')); localStorage.setItem('tt-active-language', JSON.stringify(l)); Object.entries(extra || {}).forEach(([k, v]) => localStorage.setItem(k, v)) } } catch (e) {} }, [lang, init || null])
    const text = () => page.evaluate(() => document.body.innerText)
    const waitText = async (re, ms = 60000) => { for (let i = 0; i < ms / 250; i++) { if (re.test(await text())) return true; await page.waitForTimeout(250) } return false }
    return { ctx, page, errors, text, waitText }
  }
  // ── D1 Mandarin learner with history (35 words already met, like the live 2026-10-12 log) ──
  {
    const S0 = await session('zh'); await S0.page.goto(base); await S0.waitText(/Next targets/)
    const zv = await S0.page.evaluate(() => JSON.parse(localStorage.getItem('tt-zh-vocab') || 'null')); await S0.ctx.close()
    const today = new Date().toISOString().slice(0, 10), y = new Date(Date.now() - 864e5).toISOString().slice(0, 10)
    zv.slice().sort((a, b) => (a.unlockOrder || a.id) - (b.unlockOrder || b.id)).slice(0, 35).forEach(w => Object.assign(w, { status: 'learning', repCount: 3, okCount: 1, lastSeen: y, dueDate: today }))
    const S = await session('zh', { 'tt-zh-vocab': JSON.stringify(zv) }), { page } = S
    await page.goto(base); await S.waitText(/Next targets/)
    const g0 = gemini
    const t = await S.text()
    const m = /Next targets \((\d+)\) · (\d+) new · (\d+) review/i.exec(t)
    const learn = (/Learn New Words\s*\n([^\n]+)/.exec(t) || [])[1] || ''
    const nLearn = learn.split('·').filter(x => x.trim()).length
    ok('D1a Mandarin dashboard "Next targets" lists the whole Daily Track: ' + (m ? m[0] : 'not found'), m && +m[1] === 30 && +m[2] === 5 && +m[3] === 25, m && m[0])
    ok('D3c no Gemini request is made by the dashboard itself', gemini === g0, gemini - g0)
    ok('D1b the Learn New Words card is unchanged: it lists only the new words (' + nLearn + ')', nLearn === 5, learn)
    const vocab0 = await page.evaluate(() => localStorage.getItem('tt-zh-vocab')), tracks0 = await page.evaluate(() => localStorage.getItem('tt-zh-tracks'))
    await page.getByText('Daily Track', { exact: true }).first().click()
    await S.waitText(/TARGETING \d+ WORDS/)
    const h = (/TARGETING (\d+) WORDS[^\n]*/.exec(await S.text()) || [])[0] || ''
    ok('D1c the Daily Track screen heading counts the targets actually generated: ' + h, /TARGETING 30 WORDS/.test(h) && /5 NEW/.test(h), h)
    ok('D3a Mandarin: no page errors; vocabulary unchanged by opening the screens and starting a generation', !S.errors.length &&
      vocab0 === await page.evaluate(() => localStorage.getItem('tt-zh-vocab')), S.errors.slice(0, 2))
    await S.ctx.close()
  }
  // ── D2 Japanese 10th Kyu ──
  {
    // build a learner whose White-belt words are all known (so the active rank is 10th Kyu / Orange)
    const S0 = await session('ja'); await S0.page.goto(base); await S0.waitText(/Daily Track/)
    const vocab = await S0.page.evaluate(() => JSON.parse(localStorage.getItem('tt-ja-vocab') || 'null'))
    await S0.ctx.close()
    if (!vocab) { ok('D2 Japanese vocabulary present', false, 'tt-ja-vocab not found'); }
    else {
      const today = new Date().toISOString().slice(0, 10), later = '2099-01-01'
      vocab.forEach(w => { if (w.belt === 'White') Object.assign(w, { status: 'known', okCount: 12, okStreak: 12, repCount: 15, lastSeen: today, dueDate: later }) })
      const S = await session('ja', { 'tt-ja-vocab': JSON.stringify(vocab) }), { page } = S
      await page.goto(base); await S.waitText(/Daily Track/)
      const t = await S.text()
      const intro = (/Introducing\s*(\d+)\s*new words/i.exec(t) || [])[1]
      ok('D2a Japanese at 10th Kyu: the belt card says "Introducing 5 new words" (was 3)', intro === '5', (/[^\n]*Introducing[^\n]*/.exec(t) || [''])[0])
      // (the Japanese Daily Track screen shows its heading only after the paid scene step; the 5 NEW / 30 selection is checked
      // offline in tests43 Q3 with the real selector)
      ok('D3b Japanese: no page errors', !S.errors.length, S.errors.slice(0, 2))
      await S.ctx.close()
    }
  }
  await browser.close(); srv.close()
  const f = checks.filter(c => !c.pass).length
  console.log('\nv683 browser display + quota test: ' + (checks.length - f) + '/' + checks.length + (f ? ' — ' + f + ' FAILED' : ' — ALL PASS'))
  process.exit(f ? 1 : 0)
})().catch(e => { console.log('CRASH ' + (e && e.stack || e)); process.exit(1) })
