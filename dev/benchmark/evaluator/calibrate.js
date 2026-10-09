#!/usr/bin/env node
// Step 0 — CALIBRATION / AGREEMENT REPORT. Compares a verdict source with the golden dataset's expected verdicts, per
// rubric dimension: raw agreement, Cohen's kappa, and the disagreeing items. The golden labels are split by provenance:
//   HUMAN   — a native speaker reviewed the item (item.humanReview.verdicts)
//   MODEL   — labelled by a model (annotator A = the author of the pipeline under review; NOT independent)
// "Calibrated" is claimed ONLY against HUMAN labels, and only when enough exist (MIN_HUMAN_ITEMS per language).
//
//   node benchmark/evaluator/calibrate.js --golden golden/golden-v1.json --against <evaluation.json | annotator labels.json> [--human golden/golden-v1.human-labels.json]
//   (model annotator A vs humans: --against golden/golden-v1.json --human …)
'use strict'
const fs = require('fs')
const { DIMENSIONS } = require('./rubric')
const MIN_HUMAN_ITEMS = 30, CALIBRATION_AGREEMENT = 0.85

function kappa(pairs) {
  if (!pairs.length) return null
  const cats = [...new Set(pairs.flatMap(p => [p[0], p[1]]))]
  const po = pairs.filter(p => p[0] === p[1]).length / pairs.length
  const pe = cats.reduce((a, c) => a + (pairs.filter(p => p[0] === c).length / pairs.length) * (pairs.filter(p => p[1] === c).length / pairs.length), 0)
  return pe === 1 ? (po === 1 ? 1 : 0) : (po - pe) / (1 - pe)
}
// a verdict source → Map(id → {dim: value})
function verdictsOf(src) {
  const m = new Map()
  if (src.items && src.items[0] && src.items[0].aggregate) src.items.forEach(r => m.set(r.id, Object.fromEntries(Object.entries(r.aggregate.dims).map(([k, v]) => [k, v.value]))))
  else (src.items || src.labels || []).forEach(r => m.set(r.id, r.verdicts || r.expected))
  return m
}
function compare(golden, against, o = {}) {
  const V = verdictsOf(against), report = { againstLabel: o.label || null, byProvenance: {} }
  const groups = { HUMAN: golden.items.filter(it => it.humanReview && it.humanReview.verdicts).map(it => ({ it, exp: it.humanReview.verdicts })),
    MODEL: golden.items.map(it => ({ it, exp: it.expected })) }
  Object.entries(groups).forEach(([prov, rows]) => {
    const dims = {}
    Object.keys(DIMENSIONS).forEach(d => {
      const pairs = rows.filter(r => V.has(r.it.id) && r.exp && r.exp[d] != null && V.get(r.it.id)[d] != null && !['UNVERIFIED', 'TIE'].includes(V.get(r.it.id)[d])).map(r => [r.exp[d], V.get(r.it.id)[d], r.it.id])
      const unjudged = rows.filter(r => V.has(r.it.id) && ['UNVERIFIED', 'TIE'].includes((V.get(r.it.id) || {})[d])).length
      dims[d] = { n: pairs.length, unjudged, agreement: pairs.length ? pairs.filter(p => p[0] === p[1]).length / pairs.length : null, kappa: kappa(pairs.map(p => [p[0], p[1]])),
        disagreements: pairs.filter(p => p[0] !== p[1]).map(p => p[2] + ': golden=' + p[0] + ' vs ' + p[1]) }
    })
    const perLang = {}; rows.forEach(r => { perLang[r.it.language] = (perLang[r.it.language] || 0) + 1 })
    report.byProvenance[prov] = { items: rows.length, perLanguage: perLang, dims }
  })
  const h = report.byProvenance.HUMAN
  const enough = h.items && Object.values(h.perLanguage).length === 3 && Object.values(h.perLanguage).every(n => n >= MIN_HUMAN_ITEMS)
  const agree = enough && Object.values(h.dims).every(d => d.agreement == null || d.agreement >= CALIBRATION_AGREEMENT)
  report.calibrationStatus = !h.items ? 'NOT CALIBRATED — no human-reviewed golden labels exist yet (model-labelled agreement only)'
    : !enough ? 'NOT CALIBRATED — human-reviewed labels exist but fewer than ' + MIN_HUMAN_ITEMS + ' per language'
    : agree ? 'CALIBRATED against human labels (every dimension ≥ ' + CALIBRATION_AGREEMENT * 100 + '% agreement)' : 'CALIBRATION FAILED — agreement with human labels below ' + CALIBRATION_AGREEMENT * 100 + '% on some dimension'
  return report
}
// v676 — human labels live in a SEPARATE file (golden/golden-v1.human-labels.json, from import_human_labels.js). They are
// attached in memory as item.humanReview (first complete label per item; a second reviewer's labels feed the human-vs-
// human agreement below). golden-v1.json itself is never rewritten.
function withHumanLabels(golden, human) {
  const byId = new Map()
  ;(human.labels || []).filter(l => l.complete && l.labelKind === 'HUMAN').forEach(l => { if (!byId.has(l.id)) byId.set(l.id, []); byId.get(l.id).push(l) })
  return { ...golden, items: golden.items.map(it => byId.has(it.id) ? { ...it, humanReview: { verdicts: byId.get(it.id)[0].verdicts, reviewer: byId.get(it.id)[0].reviewer, others: byId.get(it.id).slice(1) } } : it) }
}
function humanVsHuman(human) {
  const byId = new Map()
  ;(human.labels || []).filter(l => l.complete).forEach(l => { if (!byId.has(l.id)) byId.set(l.id, []); byId.get(l.id).push(l) })
  const multi = [...byId.values()].filter(v => v.length > 1)
  return Object.fromEntries(Object.keys(DIMENSIONS).map(d => { const pairs = multi.map(v => [v[0].verdicts[d], v[1].verdicts[d]])
    return [d, { n: pairs.length, agreement: pairs.length ? pairs.filter(p => p[0] === p[1]).length / pairs.length : null, kappa: kappa(pairs) }] }))
}
// per-language status (calibration is per language: a Thai reviewer says nothing about Japanese)
function perLanguageStatus(report, golden) {
  const out = {}
  for (const lang of ['th', 'ja', 'zh']) {
    const items = golden.items.filter(it => it.language === lang && it.humanReview && it.humanReview.verdicts)
    out[lang] = items.length < MIN_HUMAN_ITEMS ? 'NOT CALIBRATED — ' + items.length + ' human-reviewed item(s), ' + MIN_HUMAN_ITEMS + ' needed' : 'ENOUGH HUMAN LABELS (' + items.length + ') — see agreement'
  }
  return out
}
module.exports = { compare, kappa, verdictsOf, withHumanLabels, humanVsHuman, perLanguageStatus, MIN_HUMAN_ITEMS, CALIBRATION_AGREEMENT }
if (require.main === module) {
  const arg = n => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : null }
  let g = JSON.parse(fs.readFileSync(arg('golden'), 'utf8')), a = JSON.parse(fs.readFileSync(arg('against'), 'utf8'))
  const human = arg('human') ? JSON.parse(fs.readFileSync(arg('human'), 'utf8')) : null
  if (human) g = withHumanLabels(g, human)
  const r = compare(g, a, { label: arg('label') || arg('against') })
  if (human) { r.humanVsHuman = humanVsHuman(human); r.perLanguage = perLanguageStatus(r, g) }
  if (arg('out')) fs.writeFileSync(arg('out'), JSON.stringify(r, null, 1))
  console.log(r.calibrationStatus)
  Object.entries(r.byProvenance).forEach(([p, x]) => { console.log(p + ' items ' + x.items + ' ' + JSON.stringify(x.perLanguage))
    Object.entries(x.dims).forEach(([d, v]) => v.n && console.log('  ' + d.padEnd(12) + ' n=' + String(v.n).padEnd(4) + ' agreement=' + (v.agreement * 100).toFixed(0) + '% kappa=' + (v.kappa == null ? '-' : v.kappa.toFixed(2)) + (v.unjudged ? ' unjudged=' + v.unjudged : ''))) })
}
