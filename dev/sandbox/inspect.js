#!/usr/bin/env node
// Human inspection sheet for one sandbox Daily run, side by side with a v677 live run on the SAME fixture.
//
//   node sandbox/inspect.js sandbox/runs/<runId> [--v677 benchmark/live/v677/tt-bench-ja-daily-2026-10-08-run1-v677.json]
//
// Writes <runDir>/inspection.md and <runDir>/bench-run.json (tt-benchmark-run/1, for benchmark/compare_gen.js).
// Every recall is re-checked here with the PRODUCTION checkers (closed vocabulary, target presence, length) — not with
// Gen2's own verdicts — and pronunciation presence is reported as found (Gen2 writes none).
'use strict'
const fs = require('fs'), path = require('path')
const { load } = require('../harness')
const DEV = path.join(__dirname, '..')
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d }
const dir = path.resolve(process.argv[2])
const run = JSON.parse(fs.readFileSync(path.join(dir, 'run.json'), 'utf8')), sum = JSON.parse(fs.readFileSync(path.join(dir, 'summary.json'), 'utf8'))
const fx = JSON.parse(fs.readFileSync(path.join(DEV, 'benchmark/fixtures', sum.fixture + '.json'), 'utf8'))
const lang = fx.language, F = { th: 'thai', ja: 'japanese', zh: 'chinese' }[lang]
const c = load(path.join(DEV, 'tt.compiled.js'), { realBelt: true })
const vocab = c.ttBenchApplyFixture(c.ttBenchBank(lang), require('../benchmark/embed_fixtures').compact(fx))
const byId = new Map(vocab.map(w => [w.id, w]))
const g2 = run.outcome.gen2 || {}
// the inventory Gen2 was allowed (fixed targets + reserve pool), rebuilt the production way
const pool = (g2.frozen || []).concat(g2.deferred || []).map(r => byId.get(r.id)).filter(Boolean)
const fixed = fx.targets.map(t => byId.get(t.id)).filter(Boolean)
const invTargets = [...new Map(fixed.concat(pool).map(w => [w.id, w])).values()]
function prodCheck(text, w) {
  const p = []
  if (lang === 'ja') { const inv = c.japaneseLearnerInventory(vocab, invTargets); const r = c.japaneseCheckLine(text, inv); if (!r.ok) p.push('untaught: ' + r.unknown.join(' ')) ; if (!c.matchesJapaneseTarget(text, w) && !c.gen2TargetPresent(lang, text, w, vocab)) p.push('target absent') }
  if (lang === 'zh') { const inv = c.mandarinLearnerInventory(vocab, invTargets); const r = c.mandarinCheckLine(text, inv); if (!r.ok) p.push('untaught: ' + r.unknown.join(' ')) }
  const cc = c.getLearnerComplexityContract({ lang, vocab }), a = cc.analyse(text)
  if (a.overHardMax) p.push('too long ' + a.units + '>' + cc.hardMax)
  return p
}
const pairs = (run.outcome.content && run.outcome.content.pairs || []).filter(p => p && p.targetId != null)
const byT = new Map(); pairs.forEach(p => { if (!byT.has(p.targetId)) byT.set(p.targetId, []); byT.get(p.targetId).push(p) })
let old = null
const oldFile = arg('v677', path.join(DEV, 'benchmark/live/v677/tt-bench-' + sum.fixture + '-run1-v677.json'))
if (fs.existsSync(oldFile)) { old = new Map(); JSON.parse(fs.readFileSync(oldFile, 'utf8')).outcome.content.pairs.filter(p => p && p.targetId != null).forEach(p => { if (!old.has(p.targetId)) old.set(p.targetId, []); old.get(p.targetId).push(p) }) }
const L = []
L.push('# Inspection: ' + sum.runId, '')
L.push('- Pipeline executed: **' + sum.pipelineExecuted + '** (' + sum.gen2Version + ') · generator ' + (sum.models && sum.models.generator) + ' · judge ' + (sum.models && sum.models.judge))
L.push('- Status: **' + sum.status + '** · recalls ' + sum.recalls + ' · deferred ' + sum.deferred.length + ' · requests ' + sum.spend.requestsSent + ' · cost US$' + sum.spend.costUsd + ' (cap ' + sum.spend.capUsd + ')')
L.push('- Replay of the recording: faithful=' + sum.replay.faithful + ', identical content=' + sum.replay.contentIdentical)
L.push('- Pronunciation (romaji/pinyin/phonetic) present on ' + pairs.filter(p => p.pron).length + ' / ' + pairs.length + ' recalls', '')
if (sum.deferred.length) { L.push('## Deferred targets', ''); sum.deferred.forEach(d => L.push('- ' + d)); L.push('') }
const counts = { recalls: pairs.length, prodViolations: 0, cueProblems: 0 }
L.push('## Recalls by target (Gen2, then v677 run 1 for the same target)', '')
const order = [...byT.keys()]
order.forEach((id, k) => {
  const w = byId.get(id), rec = (g2.frozen || []).find(r => r.id === id) || {}
  L.push('### ' + (k + 1) + '. ' + w[F] + ' — "' + w.english + '" · ' + (rec.wordClass || '') + (rec.replacement ? ' · REPLACEMENT (not a fixed target)' : '') +
    ' · probes ' + rec.probes + ', candidates ' + rec.candidates + ', judged ' + rec.judged + ', accepted ' + rec.accepted)
  byT.get(id).forEach(p => {
    const pc = prodCheck(p.text, w), cp = c.gen2CueProblem(p.cue, p.english, lang)
    if (pc.length) counts.prodViolations++
    if (cp) counts.cueProblems++
    L.push('- **' + p.text + '** [' + p.speaker + ']  ' + (p.pron ? '`' + p.pron + '`' : '_(no romaji)_'))
    L.push('  - EN: ' + p.english + '  ·  CUE: ' + p.cue + (cp ? '  ⚠ ' + cp : '') + (pc.length ? '  ⚠ PROD-CHECK: ' + pc.join('; ') : ''))
  })
  if (old && old.has(id)) L.push('- _v677:_ ' + old.get(id).map(p => p.text + ' ⟨' + p.cue + '⟩').join(' · '))
  else if (old) L.push('- _v677: target not in v677 run 1_')
  L.push('')
})
L.push('## Counts', '', '```', JSON.stringify(counts, null, 1), '```')
fs.writeFileSync(path.join(dir, 'inspection.md'), L.join('\n'))
// tt-benchmark-run/1 for compare_gen.js
const bench = { format: 'tt-benchmark-run/1', fixtureId: sum.fixture, runNo: sum.runId, pipeline: sum.pipelineExecuted, provider: 'LIVE gemini (sandbox)', appBuild: sum.app && sum.app.appBuild,
  outcome: { content: run.outcome.content, telemetry: { costUsd: sum.spend.costUsd }, log: run.outcome.log, error: run.outcome.error, stop: sum.stop, gen2: run.outcome.gen2 }, cassette: run.cassette }
fs.writeFileSync(path.join(dir, 'bench-run.json'), JSON.stringify(bench))
console.log(path.relative(DEV, path.join(dir, 'inspection.md')) + ' · ' + JSON.stringify(counts))
