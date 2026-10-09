#!/usr/bin/env node
// Stage 1 — mechanical audit of the 18 live v677 runs (deterministic measures only; linguistic judgements are
// recorded separately and labelled as uncalibrated model judgements).
//   node benchmark/audit_v677.js → benchmark/results/v677-audit/metrics.json + metrics.md
'use strict'
const fs = require('fs'), path = require('path')
const { load } = require('../harness')
const DIR = path.join(__dirname, 'live', 'v677'), OUT = path.join(__dirname, 'results', 'v677-audit')
const c = load(path.join(__dirname, '..', 'benchmark', 'results', 'tt.v677.compiled.js'), { realBelt: true })
const BANK = { th: c.initVocab(), ja: c.initJapaneseVocab(), zh: c.initMandarinVocab() }
const F = { th: 'thai', ja: 'japanese', zh: 'chinese' }
const norm = s => String(s || '').toLowerCase().replace(/["'“”‘’.,!?;:()\-—…]/g, '').replace(/\s+/g, ' ').trim()
// a cue that simply restates the English answer gives the learner nothing to recall FROM (they read the answer)
const INSTRUCTION = /^(say|ask|tell|suggest|reply|answer|agree|refuse|invite|offer|apologi[sz]e|thank|greet|explain|express|confirm|check|propose|describe|mention|point|admit|warn|complain|request|state|respond|react|insist|accept|decline)\b/i
const fillerJa = s => String(s || '').replace(/^(あれ|え|ねえ|じゃあ|うん|あ|ああ|そう|ほら)[？?、。!！]*/u, '').replace(/[。、！？!?\s]/g, '')
const fillerZh = s => String(s || '').replace(/^(嗯|啊|哦|那|好)[，,。！？!?]*/u, '').replace(/[。，！？!?\s]/g, '')
const fillerTh = s => String(s || '').replace(/(ครับ|ค่ะ|คะ|นะ|จ้ะ)+$/u, '').replace(/[\s?!.]/g, '')
const core = { ja: fillerJa, zh: fillerZh, th: fillerTh }
const rows = []
for (const f of fs.readdirSync(DIR).filter(x => x.endsWith('.json')).sort()) {
  const r = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'))
  const lang = r.fixtureId.slice(0, 2), type = /daily/.test(r.fixtureId) ? 'daily' : 'listening'
  const c0 = r.outcome.content, log = r.outcome.log || []
  const byId = new Map(BANK[lang].map(w => [w.id, w]))
  const row = { run: f.replace(/^tt-bench-|-v677\.json$/g, ''), lang, type, status: (r.outcome.stop) || (c0 && c0.status) || 'ERROR',
    requests: r.cassette.entries.length, costUsd: r.outcome.telemetry && r.outcome.telemetry.costUsd }
  if (type === 'daily' && c0) {
    const tp = c0.pairs.filter(p => p && p.targetId != null)
    row.targetPairs = tp.length
    const copy = tp.filter(p => p.cue && p.english && norm(p.cue) === norm(p.english))
    const instr = tp.filter(p => p.cue && INSTRUCTION.test(String(p.cue).trim()))
    row.cueCopiesEnglish = copy.length; row.cueInstruction = instr.length; row.cueOther = tp.length - copy.length - instr.length
    row.cueCopiesEnglishExamples = copy.slice(0, 6).map(p => p.text + ' | ' + p.cue)
    // the same core sentence used for two different recalls (inside the track)
    const seen = new Map(), dups = []
    tp.forEach(p => { const k = core[lang](p.text); if (seen.has(k)) dups.push(seen.get(k).text + ' ≈ ' + p.text + ' (targets ' + seen.get(k).targetId + ' / ' + p.targetId + ')'); else seen.set(k, p) })
    row.nearDuplicateRecalls = dups.length; row.nearDuplicateExamples = dups.slice(0, 6)
    // target presence (surface string) — the app's own audit may judge inflected forms differently
    row.surfaceAbsent = tp.filter(p => { const w = byId.get(p.targetId); return w && !String(p.text).includes(w[F[lang]]) }).map(p => byId.get(p.targetId)[F[lang]] + ' → ' + p.text).slice(0, 12)
    // per target: how many of its 3 recalls are mechanically distinct sentences
    const perT = new Map(); tp.forEach(p => { if (!perT.has(p.targetId)) perT.set(p.targetId, []); perT.get(p.targetId).push(core[lang](p.text)) })
    row.targetsWith3Distinct = [...perT.values()].filter(v => new Set(v).size >= 3).length
  }
  if (type === 'listening' && c0) {
    row.coverage = c0.coverage ? c0.coverage.covered + '/' + c0.coverage.required : null; row.lines = c0.lines.length
    row.failedChecks = c0.failedChecks
    row.scenes = [...new Set(c0.lines.map(l => l.scene))].length
  }
  // rejected-candidate repetition: the SAME sentence rejected more than once in one run
  const rej = new Map()
  log.forEach(l => { const m = /(?:❌|⛔|REJECT|rejected)[^"“]*["“]([^"”]{2,60})["”]/.exec(l); if (m) rej.set(m[1], (rej.get(m[1]) || 0) + 1) })
  const reps = [...rej.entries()].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1])
  row.rejectedRepeatedSentences = reps.length; row.rejectedRepeatedTotal = reps.reduce((a, [, n]) => a + n - 1, 0); row.rejectedRepeatedTop = reps.slice(0, 5).map(([s, n]) => s + ' ×' + n)
  // Japanese target-presence flags on する
  if (lang === 'ja') row.suruPresenceFlags = log.filter(l => /する/.test(l) && /(target[^\n]{0,40}(absent|missing|not present)|TARGET_ABSENT|target concept presence|wrong-form|TARGET_PRESENCE)/i.test(l)).slice(0, 8).map(l => l.slice(0, 220))
  rows.push(row)
}
fs.mkdirSync(OUT, { recursive: true })
fs.writeFileSync(path.join(OUT, 'metrics.json'), JSON.stringify(rows, null, 1))
const md = ['# v677 live runs — mechanical audit', '',
  '| Run | Status | Req | USD | Target pairs | Cue copies English | Cue instruction | Near-duplicate recalls | Targets with 3 distinct | Rejected sentence repeated (extra rejections) | Coverage / lines |', '|---|---|---|---|---|---|---|---|---|---|---|',
  ...rows.map(r => '| ' + r.run + ' | ' + r.status + ' | ' + r.requests + ' | ' + (r.costUsd != null ? r.costUsd.toFixed(4) : '') + ' | ' + (r.targetPairs != null ? r.targetPairs : '') + ' | ' + (r.cueCopiesEnglish != null ? r.cueCopiesEnglish : '') +
    ' | ' + (r.cueInstruction != null ? r.cueInstruction : '') + ' | ' + (r.nearDuplicateRecalls != null ? r.nearDuplicateRecalls : '') + ' | ' + (r.targetsWith3Distinct != null ? r.targetsWith3Distinct + '/30' : '') + ' | ' + r.rejectedRepeatedSentences + ' (' + r.rejectedRepeatedTotal + ')' +
    ' | ' + (r.coverage ? r.coverage + ' · ' + r.lines + ' lines · ' + r.scenes + ' scenes' : '') + ' |')]
fs.writeFileSync(path.join(OUT, 'metrics.md'), md.join('\n') + '\n')
console.log(md.join('\n'))
