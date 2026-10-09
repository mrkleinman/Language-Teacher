#!/usr/bin/env node
// v676 (Step 0) — prepares the 114 golden items for NATIVE-SPEAKER review.
//   • each item keeps its exact text, target, speakers, level and source reference
//   • CONTEXT is added, verbatim from the same 8-Oct log (content only — never the app's verdicts):
//       Daily      the track's scene (Thai: the scene contract · Japanese: the mini-scene plan · Mandarin: none exists)
//                  and the other sentences the app accepted for the same target in that track
//       Listening  the scene's situation and phase, and every planned turn of that scene in order
//   • MODEL LABELS ARE NOT IN THE PACK: the reviewer judges blind. They stay in golden-v1.json (annotator A) and
//     golden-v1.annotator-b.json, marked as model labels; human labels are imported into a SEPARATE file
//     (golden-v1.human-labels.json) by import_human_labels.js and never overwrite a model label.
//   • items are shuffled per language (seeded) so no grouping by origin (accepted / rejected / fallback) is visible
//   node benchmark/evaluator/golden/build_review_pack.js → golden-v1.review-pack.json + golden-v1-review.html
'use strict'
const fs = require('fs'), path = require('path'), crypto = require('crypto')
const { RUBRIC_VERSION, DIMENSIONS, ERROR_CATEGORIES, CLARIFICATIONS } = require('../rubric')
const HIST = path.join(__dirname, '..', '..', 'historical', '2026-10-08-v674')
const golden = JSON.parse(fs.readFileSync(path.join(__dirname, 'golden-v1.json'), 'utf8'))
const logs = {}
const linesOf = f => logs[f] || (logs[f] = fs.readFileSync(path.join(HIST, f), 'utf8').split('\n'))

// ── context extraction (content lines only) ──
const DAILY_ACCEPT = [/✅ \d+(?:st|nd|rd|th) check passed: (.+)$/, /✅ recall \d (?:passed|deterministic fallback)[^:]*: (.+)$/, /✅ QUOTA RECOVERY [^:]+: \+\d+ TARGET PAIR\(S\)[^—]*— (.+)$/]
function dailyScene(it) {
  const L = linesOf(it.source.file)
  if (it.language === 'th') { const l = L.find(x => /SCENE_CONTRACT premise=/.test(x)); const m = l && /premise="([^"]*)"?(.*)$/.exec(l); return m ? 'Scene: ' + m[1].replace(/,$/, '') + ' · A = สมชาย (male, ครับ) · B = นิดา (female, ค่ะ)' : null }
  if (it.language === 'ja') { const l = L.find(x => /SCENE_PLAN \d+ mini-scene/.test(x)); return l ? 'Scene plan: ' + l.replace(/^.*SCENE_PLAN /, '').replace(/\s*\[\d+\]/g, '') : null }
  return 'No scene: a Mandarin Daily track is a set of short independent sentences (no conversation scene).'
}
function otherSentencesForTarget(it) {
  const L = linesOf(it.source.file), surf = it.target.surface, own = new Set(it.turns.map(t => t.text))
  const out = [], add = s => { s = s.trim().replace(/^"|"$/g, ''); if (s && s.includes(surf) && !own.has(s) && !out.includes(s)) out.push(s) }
  L.forEach(x => {
    if (!x.includes(surf)) return
    for (const rx of DAILY_ACCEPT) { const m = rx.exec(x); if (m) { m[1].split(' / ').forEach(add); break } }
  })
  if (it.language === 'th') {
    // Thai logs print each generated candidate as JSON ("thai": "…") inside the target's block (━━ 💬 n/30: target)
    const start = L.findIndex(x => new RegExp('━━ 💬 \\d+/30: ' + surf.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' \\[').test(x))
    if (start >= 0) for (let i = start + 1; i < L.length && !/━━ 💬 \d+\/30:/.test(L[i]); i++) { const m = /"thai": "([^"]+)"/.exec(L[i]); if (m) add(m[1]) }
  }
  return out.slice(0, 6)
}
function sceneOfListening(it) {
  const L = linesOf(it.source.file), i0 = it.source.line - 1
  let ls = (/LISTENING_TARGET_TRACE (LS\d+)/.exec(L[i0] || '') || [])[1]
  for (let i = i0; !ls && i >= Math.max(0, i0 - 40); i--) ls = (/scene=(LS\d+)/.exec(L[i]) || /\b(LS\d+)\b/.exec(L[i]) || [])[1]
  if (!ls) return null
  const plan = L.find(x => new RegExp('LISTENING_SCENE_PLAN ' + ls + ' ').test(x))
  const pm = plan && /phase=(\w+) .*?· (.+)$/.exec(plan)
  const turns = L.filter(x => new RegExp('LISTENING_TARGET_TRACE ' + ls + ' ').test(x)).map(x => { const m = /LS\d+ \w+ t(\d+) (\w+) \[[^\]]*\] proven="([^"]*)"/.exec(x); return m ? { turn: +m[1], function: m[2], text: m[3] } : null })
    .filter(Boolean).sort((a, b) => a.turn - b.turn)
  return { scene: ls, phase: pm ? pm[1] : null, situation: pm ? pm[2].trim() : null, plannedTurns: turns }
}
function contextOf(it) {
  if (it.trackType === 'daily') { const o = otherSentencesForTarget(it)
    return { kind: 'daily', scene: dailyScene(it), otherSentencesForThisTarget: o,
      note: 'Daily tracks are mostly independent sentences: judge this item on its own. ' + (o.length ? 'The other sentences are what the app wrote for the same word in the same lesson (not all of them were kept).' : 'The log shows no other sentence for this word.') } }
  const s = sceneOfListening(it)
  if (s && !s.plannedTurns.length) s.situation = s.situation || null
  return { kind: 'listening', scene: s ? s.scene : null, phase: s ? s.phase : null, situation: s ? s.situation : null,
    plannedTurnsOfThisScene: s ? s.plannedTurns : [],
    note: s && s.plannedTurns.length ? 'Listening tracks are one connected conversation. The planned turns of this scene are listed in order (the app later writes the final lines from this plan; some may differ).'
      : 'Listening tracks are one connected conversation, but the log does not record the other lines of this scene: judge the item as a turn in a friendly conversation.' }
}
// ── deterministic shuffle per language ──
const h = s => crypto.createHash('sha256').update('review-pack-v1|' + s).digest('hex')
const items = golden.items.map(it => ({
  id: it.id, language: it.language, trackType: it.trackType, kind: it.kind, level: it.level, speakers: it.speakers,
  target: it.target, turns: it.turns, cue: it.cue, reviewContext: contextOf(it),
  source: { file: it.source.file, line: it.source.line },              // a reference only; the origin (accepted / rejected …) is withheld
})).sort((a, b) => a.language.localeCompare(b.language) || h(a.id).localeCompare(h(b.id)))
const CLARIFY = CLARIFICATIONS   // one definition, shared with the model evaluator (rubric.js)
const pack = { format: 'tt-golden-review-pack/1', golden: 'golden-v1', rubric: RUBRIC_VERSION, createdAt: '2026-10-08',
  counts: items.reduce((a, it) => { a[it.language] = (a[it.language] || 0) + 1; return a }, {}),
  labelPolicy: 'BLIND REVIEW. The pack carries no model labels. Model labels (annotator A = claude-opus-5-5, author of the pipeline; annotator B = a blind model annotator of the same family) stay in golden-v1.json / golden-v1.annotator-b.json, labelled as model labels. Human labels are stored separately (golden-v1.human-labels.json) with the reviewer’s name and native language; calibration is claimed only against human labels.',
  dimensions: Object.fromEntries(Object.entries(DIMENSIONS).map(([k, d]) => [k, { values: d.values, question: d.question, clarification: CLARIFY[k] || null }])),
  errorCategories: ERROR_CATEGORIES, items }
fs.writeFileSync(path.join(__dirname, 'golden-v1.review-pack.json'), JSON.stringify(pack, null, 1))
const tpl = fs.readFileSync(path.join(__dirname, 'review_template.html'), 'utf8')
fs.writeFileSync(path.join(__dirname, 'golden-v1-review.html'), tpl.replace('/*__PACK__*/null', () => JSON.stringify(pack).replace(/</g, '\\u003c')))
console.log('review pack: ' + items.length + ' items ' + JSON.stringify(pack.counts) + ' · context: ' +
  items.filter(i => i.reviewContext.kind === 'listening' ? i.reviewContext.plannedTurnsOfThisScene.length : (i.reviewContext.otherSentencesForThisTarget.length || i.reviewContext.scene)).length + '/' + items.length + ' with context')
module.exports = { contextOf }
