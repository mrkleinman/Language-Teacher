#!/usr/bin/env node
// v676 (Step 0) — checks the native-speaker review page in headless Chromium: it shows no model label, structural n/a
// defaults are pre-set, answers export as a human-label file, the importer keeps them SEPARATE from the model labels,
// and calibrate.js reports "NOT CALIBRATED" until ≥30 human items per language exist.
'use strict'
const fs = require('fs'), path = require('path'), crypto = require('crypto')
const { chromium } = require(process.env.PW_PATH || '/home/claude/.npm-global/lib/node_modules/playwright')
const { importFiles } = require('./import_human_labels')
const cal = require('../calibrate')
const checks = []
const ok = (n, c, d) => { checks.push({ name: n, pass: !!c, detail: d == null ? null : d }); console.log((c ? 'PASS ' : 'FAIL ') + n + (d != null ? ' — ' + JSON.stringify(d).slice(0, 200) : '')) }
;(async () => {
  const html = path.join(__dirname, 'golden-v1-review.html')
  const goldenSha0 = crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, 'golden-v1.json'))).digest('hex')
  const golden = JSON.parse(fs.readFileSync(path.join(__dirname, 'golden-v1.json'), 'utf8'))
  const src = fs.readFileSync(html, 'utf8')
  // no model label may appear in the page: no "expected", no rationale, no annotator text
  const leaked = golden.items.filter(it => it.rationale && src.includes(JSON.stringify(it.rationale).slice(1, -1))).length
  ok('R1 the review page carries no model label (no expected verdicts, no rationale, no annotator)', !/"expected":\{|"labels":\[|"rationale":"|"errorCategories":\["[A-Z]/.test(src) && leaked === 0, { leakedRationales: leaked })
  const b = await chromium.launch(), ctx = await b.newContext({ acceptDownloads: true }), p = await ctx.newPage()
  const errs = []; p.on('pageerror', e => errs.push(e.message))
  await p.goto('file://' + html)
  await p.fill('#nm', 'Test Reviewer'); await p.fill('#nl', 'Thai'); await p.check('#nat')
  await p.click('[data-l="th"]'); await p.click('#go')
  const first = await p.evaluate(() => document.body.innerText)
  ok('R2 Thai review starts at item 1 of 35 with context shown', /item 1 of 35/.test(first) && /Context/.test(first))
  // answer the first 2 items fully
  for (let k = 0; k < 2; k++) {
    const dims = await p.evaluate(() => [...new Set([...document.querySelectorAll('[data-d]')].map(b => b.dataset.d))])
    for (const d of dims) { const on = await p.$('[data-d="' + d + '"].on'); if (!on) await p.click('[data-d="' + d + '"]') }
    await p.click('#nx')
  }
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#ex')])
  const out = path.join(__dirname, '..', '..', 'results', 'review-tool-sample-answers.json')
  await dl.saveAs(out)
  const ans = JSON.parse(fs.readFileSync(out, 'utf8'))
  ok('R3 export: human-label file, reviewer recorded, 2 complete items, label kind HUMAN', ans.format === 'tt-golden-human-labels/1' && ans.reviewer.name === 'Test Reviewer' && ans.items.filter(i => i.complete).length === 2 && /HUMAN/.test(ans.labelKind))
  const { db, problems } = importFiles([ans], null)
  ok('R4 importer: labels stored separately as HUMAN, rubric-valid', db.labels.filter(l => l.complete).length === 2 && db.labels.every(l => l.labelKind === 'HUMAN' && !l.invalidValues.length) && db.counts.th === 2 && !problems.length, { problems })
  const g2 = cal.withHumanLabels(golden, db)
  const r = cal.compare(g2, golden, { label: 'annotator A (model)' })
  ok('R5 calibration with 2 human items → NOT CALIBRATED (needs ≥30 per language)', /NOT CALIBRATED/.test(r.calibrationStatus) && r.byProvenance.HUMAN.items === 2, r.calibrationStatus)
  const goldenSha1 = crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, 'golden-v1.json'))).digest('hex')
  ok('R6 golden-v1.json (model labels) unchanged by review / import / calibration', goldenSha0 === goldenSha1)
  ok('R7 no page errors', !errs.length, errs)
  await b.close()
  fs.writeFileSync(path.join(__dirname, '..', '..', 'results', 'v676-review-tool-test.json'), JSON.stringify({ pass: checks.every(c => c.pass), checks }, null, 1))
  process.exit(checks.every(c => c.pass) ? 0 : 1)
})().catch(e => { console.error(e); process.exit(1) })
