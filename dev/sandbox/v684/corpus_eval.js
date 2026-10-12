#!/usr/bin/env node
// v684 regression corpus — offline, no model calls.
//  A. the 270 exported v683 exercises (+ framing lines), audited (AI review + mechanical; owner items confirmed) → how many of
//     the audited problems the DETERMINISTIC part of the final gate catches per criterion, and how many lines it flags that
//     the audit called clean for that criterion (false alarms).
//  B. candidates earlier validators rejected that the phase-2/3 blind reviewers judged GOOD → how many v684 would also block,
//     and why (closed vocabulary is a legitimate block; anything else counts as a false rejection).
//  C. the reference fixtures (designed, not model output) → every deterministic criterion must pass.
// The AI-judge half of the gate cannot be measured without paid calls; it is reported as untested here.
//   node sandbox/v684/corpus_eval.js [--app tt.compiled.js]
'use strict'
const fs = require('fs'), path = require('path'), { load } = require('../../harness'), V = require('./lib')
const ai = process.argv.indexOf('--app'), APP = ai > 0 ? path.resolve(process.argv[ai + 1]) : path.join(V.ROOT, 'tt.compiled.js')
const c = load(APP, { realBelt: true })
const AUD = path.join(__dirname, 'audit'), audit = JSON.parse(fs.readFileSync(path.join(AUD, 'audit.json'), 'utf8'))
const CRIT_OF = { pronunciation: 9, speaker: 7, distinct: 8, cue: 4, coherence: 10, sense: 1, grammar: 2 }
const out = { A: {}, B: {}, C: {} }
// ── A ──
for (const lang of ['th', 'ja', 'zh']) {
  const g = V.gateContext(c, lang + '-daily-2026-10-12'), rows = audit.rows[lang], recBy = new Map(g.ctx.recs.map(r => [r.surface, r]))
  const relation = 'friend'                                    // all three v683 lessons are conversations between friends
  const lines = rows.map((r, i) => ({ id: 'p' + r.pair, exchange: 'lesson', idx: i, voice: String(r.speaker || (i % 2 ? 'B' : 'A')).slice(0, 1), role: 'friend', addressee: 'friend', relation,
    situation: '', purpose: '', text: r.text, english: r.en, cue: r.cue,
    reading: lang === 'ja' ? r.pron : undefined, romaji: lang === 'ja' ? r.spoken : undefined, pinyin: lang === 'zh' ? r.pron : undefined, spoken: lang === 'zh' ? (r.spoken || '') : undefined, ph: lang === 'th' ? r.pron : undefined,
    target: r.type === 'content' && recBy.get(r.target) ? { id: recBy.get(r.target).id, surface: r.target, recall: r.recall, functionId: '', sense: recBy.get(r.target).gloss } : null }))
  // Mandarin content pairs carry no speaker in the export; alternate as playback does
  if (lang === 'zh') lines.forEach((l, i) => { l.voice = i % 2 ? 'B' : 'A' })
  if (lang === 'th') { const names = c.ev('THAI_NAME_PHONETIC'); Object.entries(names).forEach(([k, v]) => g.ctx.thLex.set(k, v)); g.vocab.push(...Object.keys(names).map(k => ({ thai: k }))) }
  const det = c.v684Deterministic(lang, lines, g.ctx)
  // the v683 convention for 一 in the dictionary line is accepted here: only real pronunciation errors count
  if (lang === 'zh') lines.forEach(l => { const r = det.get(l.id); delete r[9]; const p = c.v684ZhVerify(l, g.ctx.zhLexicon, { yi: 'either' }); if (p.length) r[9] = p })
  const per = {}
  Object.entries(CRIT_OF).forEach(([name, cno]) => {
    const auditBad = new Set(rows.filter(r => r.issues.some(i => i.criterion === name && (i.severity === 'critical' || i.severity === 'major'))).map(r => 'p' + r.pair))
    const flagged = new Set(lines.filter(l => (det.get(l.id)[cno] || []).length).map(l => l.id))
    const tp = [...flagged].filter(x => auditBad.has(x)), fa = [...flagged].filter(x => !auditBad.has(x)), fn = [...auditBad].filter(x => !flagged.has(x))
    per[cno + ' ' + name] = { auditProblems: auditBad.size, caught: tp.length, missed: fn.length, flaggedNotInAudit: fa.length,
      flaggedNotInAuditExamples: fa.slice(0, 6).map(id => { const l = lines.find(x => x.id === id); return id + ' ' + l.text + ' — ' + (det.get(id)[cno] || []).join('; ') }) }
  })
  const c6 = lines.filter(l => l.target && (det.get(l.id)[6] || []).length).length
  out.A[lang] = { exercises: lines.filter(l => l.target).length, perCriterion: per, noPlannedIntent: c6 + ' of ' + lines.filter(l => l.target).length + ' exercises have no planned communicative purpose (v683 has no plan)' }
}
// ── B ── rejected candidates judged good
const items = [], seen = new Set()
;[['v683p3', 'rejected-blind-items.json', 'rejected-labels.json', 'p3-rejected-key.json'], ['v683-acceptance', 'rejected-blind-items.json', 'rejected-labels.json', 'rejected-key.json']].forEach(([dir, it, lb, ky]) => {
  const D = path.join(V.ROOT, 'sandbox', 'compare', dir)
  const I = JSON.parse(fs.readFileSync(path.join(D, it), 'utf8')), Lb = new Map(JSON.parse(fs.readFileSync(path.join(D, lb), 'utf8')).map(x => [x.id, x])), K = new Map(JSON.parse(fs.readFileSync(path.join(D, ky), 'utf8')).map(x => [x.id, x]))
  I.forEach(x => { if (seen.has(x.lang + x.text)) return; seen.add(x.lang + x.text); items.push({ ...x, label: Lb.get(x.id), key: K.get(x.id) }) })
})
for (const lang of ['ja', 'zh', 'th']) {
  const g = V.gateContext(c, lang + '-daily-2026-10-08'), recBy = new Map(g.ctx.recs.map(r => [r.surface, r]))
  const good = items.filter(x => x.lang === lang && x.label && x.label.goodRecall === true)
  const why = {}, blocked = []
  good.forEach((x, i) => {
    const rec = recBy.get(x.target)
    const voice = lang === 'th' && /(ค่ะ|คะ|ดิฉัน|ฉัน)/.test(x.text) ? 'B' : 'A'
    const l = { id: 'r' + i, exchange: 'r' + i, idx: 0, voice, role: 'friend', addressee: 'friend', relation: 'friend', situation: '', purpose: 'a planned purpose stands in for this check', text: x.text, english: x.english, cue: x.cue,
      target: rec ? { id: rec.id, surface: x.target, recall: 1, functionId: 'f', sense: rec.gloss } : null }
    c.v684FillPronunciation(lang, l, g.ctx)
    const r = c.v684Deterministic(lang, [l], g.ctx).get(l.id)
    delete r[10]                                               // a single sentence is not an exchange
    const crit = Object.keys(r)
    if (crit.length) { blocked.push({ text: x.text, target: x.target, criteria: crit.map(k => c.ev('V684_CRITERIA')[k] + ': ' + r[k].join('; ')), earlierReason: x.key && x.key.reason }); crit.forEach(k => { why[k] = (why[k] || 0) + 1 }) }
  })
  // legitimate blocks: untaught words (closed vocabulary, and pronunciation that cannot be verified BECAUSE a word is untaught),
  // and the owner's register rule (Decision 1: polite words / です・ます / はい・いいえ are not used with a friend)
  const untaught = s => /^closed vocabulary/.test(s) || (/^pronunciation/.test(s) && /unverified|outside the taught|no reading|does not segment|without a dictionary phonetic/.test(s))
  const ownerRule = s => /^speaker \/ register/.test(s) && /polite|はい|です/.test(s)
  const lengthRule = s => /^complexity/.test(s)
  const nonVocab = blocked.filter(b => !b.criteria.every(s => untaught(s) || ownerRule(s) || lengthRule(s)))
  out.B[lang + '-ownerRegisterRule'] = blocked.filter(b => b.criteria.some(ownerRule) && b.criteria.every(s => untaught(s) || ownerRule(s))).length
  out.B[lang] = { judgedGood: good.length, blockedByV684: blocked.length, blockedForUntaughtWordsOrOwnerRegisterRule: blocked.length - nonVocab.length, possibleFalseRejections: nonVocab.length, byCriterion: why, examples: nonVocab.slice(0, 12) }
}
// ── C ── reference fixtures
const ref = JSON.parse(fs.readFileSync(path.join(__dirname, 'reference-fixtures.json'), 'utf8'))
for (const lang of ['ja', 'zh', 'th']) {
  const g = V.gateContext(c, lang + '-daily-2026-10-12', ref[lang].map(t => t.target.surface))
  const lines = V.referenceLesson(lang, ref[lang], g.ctx)
  const det = c.v684Deterministic(lang, lines, g.ctx)
  const bad = lines.filter(l => Object.keys(det.get(l.id)).length)
  out.C[lang] = { recalls: lines.filter(l => l.target).length, lines: lines.length, deterministicFailures: bad.map(l => l.id + ' ' + l.text + ' ' + JSON.stringify(det.get(l.id))) }
}
fs.writeFileSync(path.join(__dirname, 'corpus-results.json'), JSON.stringify(out, null, 1))
for (const lang of ['th', 'ja', 'zh']) {
  console.log('A ' + lang + ': ' + Object.entries(out.A[lang].perCriterion).map(([k, v]) => k + ' ' + v.caught + '/' + v.auditProblems + (v.flaggedNotInAudit ? ' (+' + v.flaggedNotInAudit + ' not in audit)' : '')).join(' · '))
}
for (const lang of ['ja', 'zh', 'th']) console.log('B ' + lang + ': judged good ' + out.B[lang].judgedGood + ' · blocked ' + out.B[lang].blockedByV684 + ' (untaught words / owner register rule ' + out.B[lang].blockedForUntaughtWordsOrOwnerRegisterRule + ') · possible false rejections ' + out.B[lang].possibleFalseRejections + ' ' + JSON.stringify(out.B[lang].byCriterion))
for (const lang of ['ja', 'zh', 'th']) console.log('C ' + lang + ': ' + out.C[lang].recalls + ' recalls · deterministic failures ' + out.C[lang].deterministicFailures.length)
