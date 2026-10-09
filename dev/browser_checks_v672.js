// v672 §1 — RENDERED-UI verification of the 11-check model in a real browser (headless Chromium, the built index.html with
// React 18 + Babel served locally). For Thai, Japanese and Mandarin it renders the REAL pill components (ThaiTargetTile,
// JapaneseTargetPill, MandarinTargetPill) for a recall accepted at every stage 1…11, three recalls with independent
// colours, a valid check-11 fallback, an invalid check-11 fallback (UNRESOLVED), and a reload (JSON round trip of the
// saved pairs). It compares the rendered DOM + computed colours across the three languages and writes a screenshot.
const path = require('path'), fs = require('fs')
const { chromium } = require(process.env.PW_PATH || '/home/claude/.npm-global/lib/node_modules/playwright')
;(async () => {
  const file = process.argv[2] || 'index.html', shot = process.argv[3] || 'results/v672-check-strips.png'
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } })
  const errors = []
  page.on('pageerror', e => errors.push('pageerror: ' + e.message))
  const local = { 'react.production.min.js': 'node_modules/react/umd/react.production.min.js', 'react-dom.production.min.js': 'node_modules/react-dom/umd/react-dom.production.min.js', 'babel.min.js': 'node_modules/@babel/standalone/babel.min.js' }
  await page.route('**/*', route => {
    const u = route.request().url(); const k = Object.keys(local).find(k => u.endsWith(k))
    if (k) return route.fulfill({ path: path.resolve(local[k]), contentType: 'application/javascript' })
    if (u.startsWith('file://')) return route.continue()
    return route.fulfill({ status: 404, body: '' })
  })
  await page.goto('file://' + path.resolve(file))
  for (let i = 0; i < 240; i++) { await page.waitForTimeout(500); if (await page.evaluate(() => /Words/.test(document.body.innerText))) break }
  const res = await page.evaluate(async () => {
    const h = React.createElement
    const E = (k, outcome) => Array.from({ length: k }, (_, i) => checkEntry(i + 1, i === k - 1 ? (outcome || 'accepted') : 'rejected', i === k - 1 ? 'passed' : 'rejected'))
    // the SAME saved pairs for every language (a reload is a JSON round trip of exactly these)
    const pairsFor = (tid, k1, k2, k3) => [{ targetId: tid, recallIndex: 1, _checkHistory: E(k1) }, { targetId: tid, recallIndex: 2, _checkHistory: E(k2) }, { targetId: tid, recallIndex: 3, _checkHistory: E(k3), _fallback: k3 === 11 }]
    const stages = Array.from({ length: 11 }, (_, i) => i + 1)
    const pill = (lang, w, recalls) => lang === 'th' ? h(ThaiTargetTile, { w: { thai: w, status: 'review' }, phonetic: '', done: true, chipColor: checkStyle(Math.max(...recalls.map(r => r.checkTier))).color, recalls, slots: 3 })
      : lang === 'ja' ? h(JapaneseTargetPill, { w: { japanese: w, romaji: '' }, state: 'done', srcColor: checkStyle(Math.max(...recalls.map(r => r.checkTier))).color, recalls, slots: 3 })
      : h(MandarinTargetPill, { w: { chinese: w, pinyin: '' }, state: 'done', srcColor: checkStyle(Math.max(...recalls.map(r => r.checkTier))).color, recalls, slots: 3 })
    const words = { th: 'ศูนย์', ja: '行く', zh: '拿' }
    const host = document.createElement('div'); host.id = 'v672-checks'; host.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#111;color:#eee;padding:10px;overflow:auto;font:11px sans-serif'
    document.body.appendChild(host)
    const rows = []
    ;['th', 'ja', 'zh'].forEach(lang => {
      const cells = stages.map(k => { const recalls = recallsFromPairs(JSON.parse(JSON.stringify(pairsFor(1, k, Math.max(1, k - 1), k))), 1); return h('div', { key: k, 'data-lang': lang, 'data-stage': k, style: { display: 'inline-block', margin: 3 } }, pill(lang, words[lang], recalls)) })
      // three recalls with independent colours (1 · 5 · 11-fallback) and an UNRESOLVED recall (11 rejected, no pair)
      const indep = recallsFromPairs(pairsFor(2, 1, 5, 11), 2)
      cells.push(h('div', { key: 'indep', 'data-lang': lang, 'data-stage': 'indep', style: { display: 'inline-block', margin: 3, outline: '1px dashed #666' } }, pill(lang, words[lang], indep)))
      cells.push(h('div', { key: 'unres', 'data-lang': lang, 'data-stage': 'unresolved', style: { display: 'inline-block', margin: 3, outline: '1px dashed #a33' } },
        h(CheckHistoryStrip, { history: E(11, 'unresolved'), label: 'UNRESOLVED', size: 6 })))
      rows.push(h('div', { key: lang }, h('div', null, lang.toUpperCase() + ' — accepted at check 1…11 · independent recalls (1 · 5 · 11 fallback) · UNRESOLVED after 11'), ...cells))
    })
    const root = ReactDOM.createRoot(host)
    root.render(h('div', null, ...rows))
    await new Promise(r => setTimeout(r, 300))
    const sig = el => [...el.querySelectorAll('[data-check]')].map(c => c.getAttribute('data-check') + ':' + c.getAttribute('data-lit') + ':' + (c.getAttribute('data-outcome') || '') + ':' + getComputedStyle(c).backgroundColor).join('|')
    const circ = el => [...el.querySelectorAll('span[title^="Recall"]')].filter(c => getComputedStyle(c).borderRadius === '50%').map(c => getComputedStyle(c).backgroundColor).join(',')
    const out = {}
    ;['th', 'ja', 'zh'].forEach(lang => { out[lang] = [...host.querySelectorAll('[data-lang="' + lang + '"]')].map(el => ({ stage: el.getAttribute('data-stage'), strip: sig(el), circles: circ(el) })) })
    const seq = CHECK_BELT_SEQUENCE.map(b => b.color)
    return { out, seq, n: host.querySelectorAll('[data-check]').length }
  })
  await page.screenshot({ path: shot, fullPage: false })
  const { out } = res
  const same = ['ja', 'zh'].every(l => JSON.stringify(out[l]) === JSON.stringify(out.th))
  const stageOk = Array.from({ length: 11 }, (_, i) => i + 1).every(k => { const s = out.th[k - 1].strip.split('|'); const r1 = s.slice(0, 11); return r1.filter(x => /:1:/.test(x)).length === k && /accepted/.test(r1[k - 1]) })
  const indep = out.th.find(x => x.stage === 'indep')
  const unres = out.th.find(x => x.stage === 'unresolved')
  console.log(JSON.stringify({ errors, sameAcrossLanguages: same, everyStage1to11: stageOk, independentCircles: indep && indep.circles, unresolved: unres && unres.strip.split('|').filter(x => /unresolved/.test(x)), cells: res.n, screenshot: shot }, null, 1))
  await browser.close()
  process.exit(errors.length || !same || !stageOk ? 1 : 0)
})()
