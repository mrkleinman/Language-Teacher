#!/usr/bin/env node
// v678 — CONTROLLED COMPARISON: the current generator vs the Gen2 shadow pilot, on the same fixtures (same vocabulary,
// same fixed targets, same belt). Reads benchmark run files (the in-app panel's per-run files, either pipeline).
//
//   node benchmark/compare_gen.js --old benchmark/live/v677 --new benchmark/live/v678-gen2 [--labels review.json …]
//
// Deterministic measures are computed here with the SAME functions for both sides (from the current build):
//   status · targets / recalls · cue copies the answer · cue not an intent · near-duplicate recalls · targets with three
//   distinct applications · target absent (morphology-aware) · Listening coverage / lines / scenes · requests, tokens,
//   cost, requests per accepted recall.
// Linguistic quality comes ONLY from label files (an independent evaluator or native speakers) and is reported with the
// label source; model labels are marked UNCALIBRATED. `--emit-review DIR` writes the items to be labelled (both sides,
// shuffled, pipeline hidden) so a reviewer cannot tell which generator wrote what.
'use strict'
const fs = require('fs'), path = require('path'), crypto = require('crypto')
const { load } = require('../harness')
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d }
const args = n => process.argv.map((a, i) => a === '--' + n ? process.argv[i + 1] : null).filter(Boolean)
const c = load(path.join(__dirname, '..', 'tt.compiled.js'), { realBelt: true })
const BANK = { th: c.initVocab(), ja: c.initJapaneseVocab(), zh: c.initMandarinVocab() }
const F = { th: 'thai', ja: 'japanese', zh: 'chinese' }
function readRuns(dir) {
  if (!dir || !fs.existsSync(dir)) return []
  return fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))).filter(r => r && r.format === 'tt-benchmark-run/1')
}
function measure(r) {
  const lang = r.fixtureId.slice(0, 2), daily = /daily/.test(r.fixtureId), cnt = r.outcome && r.outcome.content
  const byId = new Map(BANK[lang].map(w => [w.id, w]))
  const es = (r.cassette && r.cassette.entries) || []
  const tok = es.reduce((a, e) => { const u = e.response && e.response.body && e.response.body.usageMetadata; if (u) { a.in += u.promptTokenCount || 0; a.out += u.candidatesTokenCount || 0 } return a }, { in: 0, out: 0 })
  const m = { fixture: r.fixtureId, run: r.runNo, pipeline: r.pipeline || 'production', status: (r.outcome && r.outcome.stop) || (cnt && cnt.status) || 'ERROR', requests: es.length,
    tokensIn: tok.in, tokensOut: tok.out, costUsd: r.outcome && r.outcome.telemetry ? r.outcome.telemetry.costUsd : null }
  if (daily) {
    const tp = cnt ? cnt.pairs.filter(p => p && p.targetId != null) : []
    m.recalls = tp.length; m.targets = new Set(tp.map(p => p.targetId)).size
    m.cueCopiesAnswer = tp.filter(p => c.gen2CueProblem(p.cue, p.english, lang) === 'cue-copies-answer').length
    m.cueNotIntent = tp.filter(p => c.gen2CueProblem(p.cue, p.english, lang) === 'cue-not-an-intent').length
    const cores = tp.map(p => c.gen2Core(lang, p.text))
    m.nearDuplicateRecalls = cores.length - new Set(cores).size
    const per = new Map(); tp.forEach(p => { if (!per.has(p.targetId)) per.set(p.targetId, []); per.get(p.targetId).push(p) })
    m.targetsWith3Distinct = [...per.values()].filter(v => c.gen2PickDistinct(lang, v.map(p => ({ text: p.text, function: '' })), 3).length >= 3).length
    m.targetAbsent = tp.filter(p => { const w = byId.get(p.targetId); return w && !c.gen2TargetPresent(lang, p.text, w, BANK[lang]) }).length
    m.requestsPerAcceptedRecall = tp.length ? +(es.length / tp.length).toFixed(2) : null
    m.deferred = r.outcome && r.outcome.gen2 ? (r.outcome.gen2.deferred || []).length : null
  } else if (cnt) {
    m.coverage = cnt.coverage ? cnt.coverage.covered : 0; m.lines = cnt.lines.length; m.scenes = new Set(cnt.lines.map(l => l.scene)).size
    m.deferred = r.outcome && r.outcome.gen2 ? (r.outcome.gen2.deferred || []).length : null
  }
  return m
}
function items(r) {
  const lang = r.fixtureId.slice(0, 2), cnt = r.outcome && r.outcome.content
  if (!cnt) return []
  const byId = new Map(BANK[lang].map(w => [w.id, w]))
  if (cnt.pairs) return cnt.pairs.filter(p => p && p.targetId != null).map((p, i) => ({ key: (r.pipeline || 'production') + '|' + r.fixtureId + '|' + r.runNo + '|' + i, kind: 'daily', language: lang,
    target: (byId.get(p.targetId) || {})[F[lang]], gloss: (byId.get(p.targetId) || {}).english, speaker: p.speaker, text: p.text, english: p.english, cue: p.cue }))
  const scenes = {}
  cnt.lines.forEach(l => { (scenes[l.scene] = scenes[l.scene] || []).push(l) })
  return Object.entries(scenes).map(([s, ls]) => ({ key: (r.pipeline || 'production') + '|' + r.fixtureId + '|' + r.runNo + '|scene' + s, kind: 'listening-scene', language: lang,
    lines: ls.map(l => ({ speaker: l.speaker, text: l.text, english: l.english })) }))
}
const median = a => { const b = a.filter(x => x != null).sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : null }
function summarise(ms) {
  const g = {}
  ms.forEach(m => { const k = m.fixture.replace(/-2026-10-08$/, '') + ' · ' + m.pipeline; (g[k] = g[k] || []).push(m) })
  return Object.entries(g).sort().map(([k, v]) => ({ group: k, runs: v.length, ready: v.filter(m => m.status === 'READY').length,
    recallsMedian: median(v.map(m => m.recalls)), coverageTotal: v.some(m => m.coverage != null) ? v.reduce((a, m) => a + (m.coverage || 0), 0) : null,
    cueCopiesAnswer: v.some(m => m.cueCopiesAnswer != null) ? v.reduce((a, m) => a + m.cueCopiesAnswer, 0) : null,
    nearDuplicates: v.some(m => m.nearDuplicateRecalls != null) ? v.reduce((a, m) => a + m.nearDuplicateRecalls, 0) : null,
    distinctMedian: median(v.map(m => m.targetsWith3Distinct)), targetAbsent: v.some(m => m.targetAbsent != null) ? v.reduce((a, m) => a + m.targetAbsent, 0) : null,
    requestsMedian: median(v.map(m => m.requests)), costMedian: median(v.map(m => m.costUsd)), deferredTotal: v.some(m => m.deferred != null) ? v.reduce((a, m) => a + (m.deferred || 0), 0) : null }))
}
function applyLabels(files, allItems) {
  const out = []
  files.forEach(f => {
    const L = JSON.parse(fs.readFileSync(f, 'utf8'))
    const src = L.evaluator || L.labelKind || 'unknown'
    const calibrated = /HUMAN/i.test(src) && !/UNCALIBRATED/i.test(src)
    const by = {}
    ;(L.items || []).forEach(v => {
      // run-local ids from the Stage-1 review ("<fixture>-run<k>#NN", production runs) map onto the same item order
      const rm = /^(.*)-run(\d+)#(\d+)$/.exec(String(v.id || ''))
      const key = v.key || (rm ? 'production|' + rm[1] + '|' + rm[2] + '|' + (+rm[3] - 1) : null)
      const it = allItems.find(x => (key && x.key === key) || x.blindId === v.id); if (!it) return
      const p = it.key.split('|')[0], k = p + ' · ' + it.language + ' · ' + it.kind; const s = by[k] = by[k] || { n: 0, grammarError: 0, unnatural: 0, marginal: 0, misleading: 0, cueBad: 0, incoherent: 0, unanswered: 0 }
      s.n++; if (v.grammar === 'error') s.grammarError++; if (v.naturalness === 'unnatural' || v.natural === 'unnatural') s.unnatural++; if (v.naturalness === 'marginal' || v.natural === 'marginal') s.marginal++
      if (v.translation === 'misleading') s.misleading++; if (v.cue && v.cue !== 'useful') s.cueBad++; if (v.coherent === 'no' || v.coherence === 'incoherent') s.incoherent++; if (v.unansweredQuestions) s.unanswered += +v.unansweredQuestions || 0 })
    out.push({ source: src, calibrated, groups: by })
  })
  return out
}
module.exports = { measure, items, summarise }
if (require.main === module) {
  const oldRuns = readRuns(arg('old')), newRuns = readRuns(arg('new'))
  const ms = [...oldRuns, ...newRuns].map(measure)
  const sum = summarise(ms)
  const all = [...oldRuns, ...newRuns].flatMap(items)
  const emit = arg('emit-review')
  if (emit) {
    fs.mkdirSync(emit, { recursive: true })
    const h = s => crypto.createHash('sha256').update('blind|' + s).digest('hex')
    const blind = all.map(it => ({ ...it, blindId: h(it.key).slice(0, 12) })).sort((a, b) => a.blindId.localeCompare(b.blindId))
    fs.writeFileSync(path.join(emit, 'blind-items.json'), JSON.stringify(blind.map(({ key, ...rest }) => rest), null, 1))
    fs.writeFileSync(path.join(emit, 'blind-key.json'), JSON.stringify(blind.map(b => ({ blindId: b.blindId, key: b.key })), null, 1))
  }
  const labels = applyLabels(args('labels'), all.map(it => ({ ...it, blindId: crypto.createHash('sha256').update('blind|' + it.key).digest('hex').slice(0, 12) })))
  const out = { at: new Date().toISOString(), old: arg('old'), new: arg('new'), runs: ms, summary: sum, labels }
  const file = arg('out', path.join(__dirname, 'results', 'compare-gen.json'))
  fs.writeFileSync(file, JSON.stringify(out, null, 1))
  console.log('| Group | Runs | READY | Recalls (median) | Listening coverage (total) | Cue copies answer | Near-dup recalls | 3-distinct targets (median) | Target absent | Requests (median) | USD (median) | Deferred |')
  console.log('|---|---|---|---|---|---|---|---|---|---|---|---|')
  sum.forEach(s => console.log('| ' + [s.group, s.runs, s.ready, s.recallsMedian, s.coverageTotal, s.cueCopiesAnswer, s.nearDuplicates, s.distinctMedian, s.targetAbsent, s.requestsMedian, s.costMedian != null ? s.costMedian.toFixed(4) : '', s.deferredTotal].map(x => x == null ? '–' : x).join(' | ') + ' |'))
  labels.forEach(l => { console.log('\nLABELS: ' + l.source + (l.calibrated ? '' : ' — UNCALIBRATED')); Object.entries(l.groups).forEach(([k, v]) => console.log('  ' + k + ' ' + JSON.stringify(v))) })
}
