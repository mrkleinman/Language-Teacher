// v650: real-browser smoke test. Loads index.html in headless Chromium with the CDN scripts served
// from local node_modules (same versions: React 18.3.1, Babel standalone 7.23.10). Reports page
// errors, whether the app rendered, and (optionally) the header chip.
const path = require('path'), fs = require('fs')
const { chromium } = require(process.env.PW_PATH || '/home/claude/.npm-global/lib/node_modules/playwright')
;(async () => {
  const file = process.argv[2] || 'index.html'
  const browser = await chromium.launch()
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', e => errors.push('pageerror: ' + e.message))
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)) })
  const local = { 'react.production.min.js': 'node_modules/react/umd/react.production.min.js', 'react-dom.production.min.js': 'node_modules/react-dom/umd/react-dom.production.min.js', 'babel.min.js': 'node_modules/@babel/standalone/babel.min.js' }
  await page.route('**/*', route => {
    const u = route.request().url()
    const k = Object.keys(local).find(k => u.endsWith(k))
    if (k) return route.fulfill({ path: path.resolve(local[k]), contentType: 'application/javascript' })
    if (u.startsWith('file://')) return route.continue()
    return route.fulfill({ status: 404, body: '' })
  })
  await page.addInitScript(() => { try { localStorage.setItem('tt-gemini-key', JSON.stringify('AIzaSyTEST-browser-smoke-000000000')); localStorage.setItem('tt-last-track-ai-usage', JSON.stringify({ trackId: 't', currency: 'SGD', estimatedUsd: 0.0518, estimatedSgd: 0.0673, usdToSgd: 1.3, totalRequests: 224, inputTokens: 309978, outputTokens: 58780, totalTokens: 368758, modelBreakdown: { 'gemini-2.5-flash-lite': 224 }, createdAt: '2026-09-29' })) } catch (e) {} })
  const t0 = Date.now()
  await page.goto('file://' + path.resolve(file))
  let bootMs = null
  for (let i = 0; i < 240; i++) { await page.waitForTimeout(500); const ok = await page.evaluate(() => /Words/.test(document.body.innerText)); if (ok) { bootMs = Date.now() - t0; break } }
  const chain = await page.evaluate(async () => { try { if (typeof aiCallerChain !== 'function') return 'n/a'; async function probeCaller() { await null; return aiCallerChain(new Error('probe')) } return await probeCaller() } catch (e) { return 'err ' + e.message } })
  if (process.env.EXTRA) { try { const r = await page.evaluate(process.env.EXTRA); console.log('EXTRA ' + JSON.stringify(r)) } catch (e) { console.log('EXTRA error ' + e.message) } }
  const text = await page.evaluate(() => document.body.innerText.slice(0, 600))
  const header = await page.evaluate(() => { const b = document.querySelector('button[aria-label="Last track Gemini cost"]'); return b ? b.innerText : null })
  console.log(JSON.stringify({ bootMs, chain, ms: Date.now() - t0, errors: errors.slice(0, 8), header, text: text.replace(/\s+/g, ' ').slice(0, 300) }, null, 1))
  await browser.close()
})()
