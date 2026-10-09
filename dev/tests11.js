// v645 — 30-TARGET CONTRACT: eligibility before selection, backfill, frozen selection (A–J) + live replay.
// Real app code (compiled tt.jsx); v644 compiled for before/after. No model calls needed except J (mocked lines).
const { load } = require('./harness')
const fs = require('fs')
const out = []; let fails = 0
const T = (id, name, pass, detail) => { if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + id.padEnd(4) + name + (detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')) }
const DAY = '2026-09-28'
// learner: curriculum 1–311 introduced and due, everything later unseen (as in tests7)
function learner(c) {
  const v = c.initVocab().map(w => ({ ...w }))
  v.forEach(w => { const ci = w.curriculumIndex
    if (ci >= 1 && ci <= 311) { w.status = 'learning'; w.introducedAt = '2026-08-01'; w.lastSeen = '2026-09-20'; w.okStreak = 1; w.interval = 3; w.dueDate = '2026-09-2' + (ci % 7) }
    else { if (w.status !== 'locked') w.status = 'new'; w.lastSeen = null; w.introducedAt = null; w.dueDate = null; w.okStreak = 0 } })
  return v
}
const learnerOnly = (c, ids) => { const keep = new Set(ids); return learner(c).map(w => keep.has(w.id)
  ? { ...w, status: 'learning', introducedAt: '2026-08-01', lastSeen: '2026-09-20', okStreak: 1, interval: 3, dueDate: '2026-09-21' }
  : { ...w, status: 'locked', introducedAt: null, lastSeen: null, okStreak: 0, repCount: 0, dueDate: null, interval: 0 }) }
// the Generator's contract path, exactly: pickWords → freezeThaiTargetSelection → thaiTargetCounts
function daily(c, vocab, mode = 'daily') {
  const pw = c.pickWords(vocab, mode, [])
  const f = c.freezeThaiTargetSelection({ selected: pw.targets, reserve: pw.reserve, required: 30, mode })
  const cnt = c.thaiTargetCounts({ requested: 30, selectedTargets: f.targets, generationTargets: f.targets, unresolved: [], mode,
    candidateStats: pw.candidateStats, skippedCandidates: pw.skippedCandidates, backfills: f.backfills, blocked: f.blocked, contract: true })
  return { pw, f, cnt, line: c.thaiTargetCountsLine(cnt), log: c.thaiSelectionLogLines(cnt) }
}

;(async () => {
  const c = load('tt.compiled.js'), c644 = load('tt.v644.compiled.js')
  const raw = c.ev('RAW_VOCAB'), unverified = raw.filter(d => d.semanticQc !== 'PASS' && d.curriculumIndex > 0).map(d => d.id)

  // ════ LIVE REPLAY: the four words ════════════════════════════════════════════
  const FOUR = [67, 108, 324, 1626]
  const base644 = c644.pickWords(learner(c644), 'daily', []).targets.filter(w => !FOUR.includes(w.id)).slice(0, 26)
  const live644 = base644.concat(FOUR.map(id => ({ ...learner(c644).find(w => w.id === id), status: 'learning', lastSeen: '2026-09-20', introducedAt: '2026-08-01' })))
  const r644 = c644.resolveThaiTargetSet(live644, [])
  const cnt644 = c644.thaiTargetCounts({ requested: 30, selectedTargets: live644, generationTargets: r644.targets, unresolved: r644.skipped, mode: 'daily' })
  T('R1', 'v644 reproduces the live bug: a 30-word selection containing สาย ถูก รองเท้า วันพฤหัสบดี is shrunk AFTER selection by resolveThaiTargetSet → 26',
    cnt644.selectedTargetCount === 30 && cnt644.generationTargetCount === 26 && r644.skipped.map(s => s.thai).sort().join() === ['ถูก', 'รองเท้า', 'วันพฤหัสบดี', 'สาย'].sort().join(),
    c644.thaiTargetCountsLine(cnt644))
  // v645, same 30 with the four records as they WERE (unrepaired) — architecture alone: backfill keeps 30
  const saved = FOUR.map(id => { const d = raw.find(x => x.id === id); return [d, { semanticQc: d.semanticQc, qcStatus: d.qcStatus, qcIssues: d.qcIssues }] })
  const unrepair = () => saved.forEach(([d]) => { const a = c.ev('THAI_LEXICON_AUDIT_V645').find(x => x.id === d.id); Object.assign(d, { semanticQc: a.before.semanticQc, qcStatus: a.before.qcStatus, qcIssues: a.before.qcIssues }) })
  const repair = () => saved.forEach(([d, s]) => Object.assign(d, s))
  unrepair()
  const lv = learner(c)
  const pwR = c.pickWords(lv, 'daily', [])
  const live645 = pwR.targets.filter(w => !FOUR.includes(w.id)).slice(0, 26).concat(FOUR.map(id => ({ ...lv.find(w => w.id === id), status: 'learning', lastSeen: '2026-09-20', introducedAt: '2026-08-01', _selectorStage: 'belt-due' })))
  const fR = c.freezeThaiTargetSelection({ selected: live645, reserve: pwR.reserve, required: 30, mode: 'daily' })
  T('R2', 'v645, same selection with the four records UNREPAIRED: each is replaced from the reserve (TARGET_BACKFILL) — still 30 generation targets',
    fR.targets.length === 30 && !fR.blocked && fR.backfills.length === 4 && fR.backfills.every(b => b.replacementId != null && /^VOCAB_/.test(b.reason)) &&
    !fR.targets.some(t => FOUR.includes(t.id)), fR.log)
  // v645 Daily selection from the pool with the four UNREPAIRED: they are skipped candidates, never selected
  const lv4 = learner(c); FOUR.forEach(id => { const w = lv4.find(x => x.id === id); Object.assign(w, { status: 'learning', dueDate: '2026-09-01', lastSeen: '2026-08-20', introducedAt: '2026-08-01', difficulty: 'hard', lapses: 1 }) })
  const d4 = daily(c, lv4)
  repair()
  const d4r = daily(c, lv4)
  T('R3', 'v645 with the four records repaired (evidence-based audit) they are ordinary eligible candidates; unrepaired they would be skipped before selection',
    FOUR.every(id => c.thaiVocabEligibility({ id }).ok) && d4r.cnt.generationTargetCount === 30 && d4.cnt.generationTargetCount === 30,
    { unrepaired: d4.line, repaired: d4r.line })

  // ════ 10. REQUIRED TESTS ════════════════════════════════════════════════════
  // A: 30 preferred (due), 4 invalid, 40+ valid lower-priority words available
  const five = [32, 1477, 447, 1633, 329], four = five.slice(0, 4)
  const verified = raw.filter(d => d.curriculumIndex >= 330 && d.curriculumIndex <= 470 && c.thaiVocabEligibility({ id: d.id }).ok).map(d => d.id)
  const thirty = verified.slice(0, 30)
  const preferred26 = verified.slice(0, 26), lower = verified.slice(26, 70)          // 44 valid lower-priority words
  const vA = learnerOnly(c, preferred26.concat(four, lower))
  vA.forEach(w => { if (preferred26.includes(w.id) || four.includes(w.id)) { w.dueDate = '2026-09-01'; w.difficulty = 'hard' } else if (lower.includes(w.id)) { w.dueDate = '2026-12-01'; w.lastSeen = '2026-09-27' } })
  const dA = daily(c, vA)
  const sbA = dA.pw.selectionBackfills
  T('A', '30 preferred, 4 invalid, 40+ valid ⇒ skip the 4, take the next 4 ⇒ selected 30 ⇒ generation 30 ⇒ 90 pairs (BACKFILL slot/bucket logged)',
    dA.f.targets.length === 30 && dA.cnt.generationTargetCount === 30 && dA.cnt.expectedTargetPairs === 90 && !dA.f.targets.some(t => four.includes(t.id)) &&
    preferred26.every(id => dA.f.targets.some(t => t.id === id)) && dA.f.targets.filter(t => lower.includes(t.id)).length === 4 &&
    sbA.length === 4 && sbA.every(b => four.includes(b.removedId) && b.replacementId != null && /^VOCAB_/.test(b.reason)) && !dA.f.blocked,
    dA.log.slice(0, 1).concat(sbA.map(b => c.thaiBackfillLine(b))).join('\n      '))
  // B: one preferred target becomes invalid during preflight ⇒ same-bucket backfill
  const lB = learner(c); const pB = c.pickWords(lB, 'daily', [])
  const victim = pB.targets.find(t => !c.isGenuinelyNew(t) && pB.reserve.some(r => r._selectorStage === t._selectorStage))
  const vRec = raw.find(d => d.id === victim.id), vSave = { semanticQc: vRec.semanticQc, qcStatus: vRec.qcStatus }
  vRec.semanticQc = 'NEEDS_REVIEW'; vRec.qcStatus = 'NEEDS_REVIEW'
  const fB = c.freezeThaiTargetSelection({ selected: pB.targets, reserve: pB.reserve, required: 30, mode: 'daily' })
  Object.assign(vRec, vSave)
  const bB = fB.backfills[0] || {}
  T('B', '30 preferred + one becomes invalid during preflight ⇒ backfilled from the SAME SRS bucket ⇒ still 30 (TARGET_BACKFILL logged)',
    fB.targets.length === 30 && fB.backfills.length === 1 && bB.removedId === victim.id && bB.replacementBucket === bB.bucket && bB.reason === 'VOCAB_UNVERIFIED' &&
    !fB.targets.some(t => t.id === victim.id), fB.log)
  // B2 (spec B): the same SRS bucket lacks enough replacements ⇒ expand to the next allowed bucket ⇒ still 30
  const lB2 = learner(c); const pB2 = c.pickWords(lB2, 'daily', [])
  const revSlots = pB2.targets.filter(t => !c.isGenuinelyNew(t)).slice(0, 3)
  const bkt = 'belt-due'
  const selB2 = pB2.targets.map(t => revSlots.includes(t) ? { ...t, _selectorStage: bkt } : t)
  const resB2 = pB2.reserve.map((w, i) => ({ ...w, _selectorStage: i === 0 ? bkt : (w._selectorStage === bkt ? 'belt-review' : w._selectorStage) }))
  const sv2 = revSlots.map(t => { const d = raw.find(x => x.id === t.id); const o = { d, q: d.semanticQc, s: d.qcStatus }; d.semanticQc = 'NEEDS_REVIEW'; d.qcStatus = 'NEEDS_REVIEW'; return o })
  const fB2 = c.freezeThaiTargetSelection({ selected: selB2, reserve: resB2, required: 30, mode: 'daily' })
  sv2.forEach(o => { o.d.semanticQc = o.q; o.d.qcStatus = o.s })
  T('B2', 'same SRS bucket has only 1 replacement for 3 failures ⇒ 1 same-bucket, then the next priority bucket (sameBucketExhausted=true) ⇒ still 30',
    fB2.targets.length === 30 && fB2.backfills.length === 3 && fB2.backfills[0].replacementBucket === bkt && !fB2.backfills[0].sameBucketExhausted &&
    fB2.backfills.slice(1).every(b => b.sameBucketExhausted && b.replacementBucket !== bkt) && !fB2.blocked, fB2.log)
  // C: Daily with 5 NEW
  const dC = daily(c, learner(c))
  T('C', 'Daily with 5 NEW ⇒ exactly 5 valid NEW + exactly 25 valid non-NEW = 30 · generation 30 · expected target pairs 90',
    dC.cnt.selectedTargetCount === 30 && dC.cnt.newTargetCount === 5 && dC.cnt.generationTargetCount === 30 && dC.cnt.expectedTargetPairs === 90 &&
    /SELECTED_TARGETS=30 GENERATION_TARGETS=30 NEW_TARGETS=5 REVIEW_TARGETS=25 LISTENING_REQUIRED_TARGETS=30 EXPECTED_TARGET_PAIRS=90/.test(dC.line) && dC.f.targets.filter(t => !c.isGenuinelyNew(t)).length === 25, dC.line)
  // C2: a NEW slot that fails preflight is backfilled with a NEW word (NEW count preserved)
  const newVictim = dC.pw.targets.find(t => c.isGenuinelyNew(t))
  const nRec = raw.find(d => d.id === newVictim.id), nSave = { semanticQc: nRec.semanticQc, qcStatus: nRec.qcStatus }
  nRec.semanticQc = 'NEEDS_REVIEW'; nRec.qcStatus = 'NEEDS_REVIEW'
  const fC2 = c.freezeThaiTargetSelection({ selected: dC.pw.targets, reserve: dC.pw.reserve, required: 30, mode: 'daily' })
  Object.assign(nRec, nSave)
  T('C2', 'a NEW target failing preflight is replaced by the next eligible NEW word ⇒ NEW stays 5, total 30',
    fC2.targets.length === 30 && fC2.targets.filter(t => c.isGenuinelyNew(t)).length === 5 && fC2.backfills[0] && fC2.backfills[0].bucket === 'belt-new', fC2.log)
  // D: Revision
  const rv = c.selectThaiRevisionTargets(learner(c), 30)
  const rvAll = c.selectThaiRevisionTargets(learner(c), 100000)
  const fD = c.freezeThaiTargetSelection({ selected: rv.targets, reserve: rvAll.targets.filter(w => !rv.targets.some(t => t.id === w.id)), required: 30, mode: 'revision' })
  const cD = c.thaiTargetCounts({ requested: 30, selectedTargets: fD.targets, generationTargets: fD.targets, unresolved: [], mode: 'revision', candidateStats: rv.candidateStats, skippedCandidates: rv.skippedCandidates, contract: true })
  T('D', 'Revision ⇒ selected 30 · generation 30 (ineligible candidates skipped before selection)',
    cD.selectedTargetCount === 30 && cD.generationTargetCount === 30 && cD.newTargetCount === 0 && cD.expectedTargetPairs === 90 && cD.consistent, c.thaiTargetCountsLine(cD))
  // E: retired id with canonical replacement (431 วันพฤหัสฯ → 1626 วันพฤหัสบดี)
  const lE = learner(c)
  const w431 = lE.find(w => w.id === 431), w1626 = lE.find(w => w.id === 1626)
  Object.assign(w431, { status: 'learning', lastSeen: '2026-09-25', introducedAt: '2026-07-01', repCount: 9, okStreak: 2, interval: 12, dueDate: '2026-09-27', _mergedInto: undefined })
  Object.assign(w1626, { status: 'new', lastSeen: null, introducedAt: null, repCount: 0, interval: 0 })
  const selE = dC.pw.targets.filter(t => t.id !== 1626 && t.id !== 431).slice(0, 29).concat([{ ...w431, _selectorStage: 'beyond-review' }])
  const poolE = c.thaiEligibleCandidatePool(lE, DAY)           // history fold (what load / the pool does)
  const fE = c.freezeThaiTargetSelection({ selected: selE, reserve: dC.pw.reserve, required: 30, mode: 'daily' })
  const tE = fE.targets.find(t => t.id === 1626)
  T('E', 'retired id with a canonical replacement ⇒ selection migrates to the canonical id, count stays 30, learning history preserved',
    fE.targets.length === 30 && tE && !fE.targets.some(t => t.id === 431) && tE.status === 'learning' && tE.lastSeen === '2026-09-25' && tE.repCount === 9 &&
    poolE.migrated.some(m => m.fromId === 431 && m.toId === 1626) && poolE.skipped.some(s => s.id === 431 && s.reason === 'VOCAB_RETIRED_ALIAS'),
    { migrated: poolE.migrated.find(m => m.fromId === 431), target: tE && { id: tE.id, thai: tE.thai, status: tE.status, lastSeen: tE.lastSeen, repCount: tE.repCount } })
  // F: unverified candidate excluded before selection
  const lF = learner(c); const wF = lF.find(w => w.id === 1477)            // ตรงข้าม, curriculum 468, unverified
  Object.assign(wF, { status: 'learning', dueDate: '2026-09-01', lastSeen: '2026-08-20', introducedAt: '2026-08-01', difficulty: 'hard', lapses: 2 })
  const dF = daily(c, lF)
  T('F', 'unverified candidate ⇒ excluded before selection ⇒ NOT selected, NOT unresolved (listed as a skipped candidate)',
    !dF.f.targets.some(t => t.id === 1477) && dF.cnt.unresolvedTargets.length === 0 && dF.cnt.generationTargetCount === 30 &&
    c.thaiVocabEligibility({ id: 1477 }).reason === 'VOCAB_UNVERIFIED' && !/UNRESOLVED/.test(dF.line), dF.log.slice(0, 4).join('\n      '))
  // G (spec G): the preferred active belt holds only 27 eligible words ⇒ the cascade continues — never BLOCKED
  const g27 = thirty.slice(0, 27).concat(five)
  const vG1 = learner(c)                                                // plenty of other learned words elsewhere
  const dG1 = daily(c, vG1)
  const vG2 = learnerOnly(c, g27)                                       // the WHOLE learned vocabulary is only 27 eligible words
  const dG2 = daily(c, vG2)
  const unv = t => !c.thaiVocabEligibility({ id: t.id }).ok
  T('G', 'a priority bucket / the learned pool running short never blocks: 27 eligible learned words ⇒ still 30 (review first; unseen words only as a logged NEW_CEILING_OVERFLOW when no review word exists)',
    !dG1.f.blocked && dG1.f.targets.length === 30 && !dG2.f.blocked && dG2.f.targets.length === 30 && dG2.cnt.generationTargetCount === 30 &&
    thirty.slice(0, 27).every(id => dG2.f.targets.some(t => t.id === id)) && !dG2.f.targets.some(unv) && dG2.cnt.newCeilingOverflow === 3 &&
    /NEW_CEILING_OVERFLOW=3/.test(dG2.line) && !/TRACK_SELECTION_BLOCKED/.test(dG1.line + dG2.line),
    { plentyOfReview: dG1.line, only27Learned: dG2.line })
  // G2: the ONLY remaining block — the whole eligible pool is exhausted. Revision may never use unseen
  // words, so a learner with 27 eligible introduced words in the entire bank cannot have a 30-word Revision.
  const rvG = c.selectThaiRevisionTargets(learnerOnly(c, g27), 100000)
  const fG2 = c.freezeThaiTargetSelection({ selected: rvG.targets.slice(0, 30), reserve: rvG.targets.slice(30), required: 30, mode: 'revision', noNewOverflow: true })
  T('G2', 'only a WHOLE-pool exhaustion blocks (Revision, 27 introduced eligible words in the entire bank) — scope ELIGIBLE_POOL_EXHAUSTED, never one bucket',
    fG2.blocked && fG2.blocked.scope === 'ELIGIBLE_POOL_EXHAUSTED' && fG2.blocked.eligible === 27 &&
    /if \(_selection\.blocked && !resumeDraft\) \{\s*setPhase\('error'\)/.test(fs.readFileSync('tt.jsx', 'utf8')), fG2.log.slice(-1))
  // E2 (spec E): an unverified candidate is never used merely to fill the quota — even when the pool is starved
  T('E2', 'unverified candidates are never used to fill the quota (starved pool: overflow uses valid unseen words, never the 5 unverified)',
    ![dA, dG1, dG2].some(d => d.f.targets.some(t => five.includes(t.id) || unv(t))) && dG2.pw.skippedCandidates.every(x => five.includes(x.id)))
  // F (spec F): no normal track reports GENERATION_TARGETS < 30 — 40 randomised learner states
  const bad = []
  for (let k = 0; k < 40; k++) {
    let seed = 1000 + k * 7919; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
    const vF = learner(c); const top = 60 + Math.floor(rnd() * 500)
    vF.forEach(w => { const ci = w.curriculumIndex
      if (ci >= 1 && ci <= top) { if (rnd() < 0.85) Object.assign(w, { status: rnd() < 0.2 ? 'known' : 'learning', introducedAt: '2026-08-01', lastSeen: '2026-09-' + String(1 + Math.floor(rnd() * 27)).padStart(2, '0'),
        dueDate: '2026-' + (rnd() < 0.5 ? '09' : '10') + '-' + String(1 + Math.floor(rnd() * 28)).padStart(2, '0'), difficulty: rnd() < 0.2 ? 'hard' : 'ok', lapses: rnd() < 0.1 ? 2 : 0 }) } })
    const d = daily(c, vF, k % 5 === 0 ? 'weak' : 'daily')
    if (d.cnt.generationTargetCount !== 30 || d.f.blocked || d.f.targets.some(unv) || new Set(d.f.targets.map(t => t.id)).size !== 30) bad.push(k + ': ' + d.line)
  }
  T('F', 'no normal track reports GENERATION_TARGETS < 30 (40 randomised learner states, Daily + Weak): always 30 distinct valid targets, never blocked', bad.length === 0, bad.slice(0, 3))
  // H: no shared code emits SKIPPED_UNVERIFIED_REVISION_TARGET
  const src = fs.readFileSync('tt.jsx', 'utf8')
  const un = c.resolveCanonicalTarget({ id: 1477, thai: 'ตรงข้าม', status: 'learning' })
  T('H', 'no code emits SKIPPED_UNVERIFIED_REVISION_TARGET; reasons are mode-neutral VOCAB_*',
    !/SKIPPED_UNVERIFIED_REVISION_TARGET/.test(src) && un.skipped && un.skipped.reason === 'VOCAB_UNVERIFIED' &&
    c.thaiVocabEligibility({ id: 32 }).reason === 'VOCAB_AMBIGUOUS_SENSE' && c.thaiVocabEligibility({ id: 1380 }).reason === 'VOCAB_INVALID_FRAGMENT' &&
    c.thaiVocabEligibility({ id: 517 }).reason === 'VOCAB_MALFORMED_SURFACE' && c.thaiVocabEligibility({ id: 431 }).reason === 'VOCAB_RETIRED_ALIAS',
    { 1477: un.skipped && un.skipped.reason, 32: c.thaiVocabEligibility({ id: 32 }).reason, 1380: c.thaiVocabEligibility({ id: 1380 }).reason, 517: c.thaiVocabEligibility({ id: 517 }).reason })
  // I: selectedTargetIds cannot shrink after preflight
  let threw = false; try { dC.f.selectedTargetIds.pop() } catch (e) { threw = true }
  const kw = c.buildTrackKeywords(dC.f.targets, dC.f.targets, [], w => ({ thai: w.thai, english: w.english, wordId: w.id, isNew: c.isGenuinelyNew(w) }))
  T('I', 'selectedTargetIds is frozen after preflight (cannot shrink); the lesson keeps all 30 as TARGET WORDS, none unresolved',
    Object.isFrozen(dC.f.selectedTargetIds) && threw && dC.f.selectedTargetIds.length === 30 && kw.length === 30 && !kw.some(k => k.unresolved))
  // J: generation progress Word 1…30 of 30 and pairs 0/90 … 90/90 (before QC/bridge/framing transformations)
  const cJ = load('tt.compiled.js'); const vJ = learner(cJ); const dJ = daily(cJ, vJ)
  cJ.generateWordLines = async (t) => [
    { speaker: 'A', thai: 'ผมชอบ' + t.thai + 'ครับ', english: 'x', prompt: 'He says x', phonetic: 'x' },
    { speaker: 'B', thai: 'จริงเหรอคะ', english: 'Really?', prompt: 'She asks', phonetic: 'x' },
    { speaker: 'A', thai: 'ครับ ' + t.thai + 'ดีมากครับ', english: 'x', prompt: 'He says x', phonetic: 'x' }]
  const tg = dJ.f.targets.map(t => ({ ...t }))
  Object.defineProperty(tg, '_targetCounts', { value: dJ.cnt })
  const statuses = [], totals = new Set(), logs = []; let lastDone = 0
  await cJ.generateConversationTrack(tg, [], 'k', (d, t, meta) => { totals.add(t); if (typeof d === 'number') lastDone = Math.max(lastDone, d)
    if (meta && meta.wordStatus) statuses.push(meta.wordStatus); if (meta && meta.apiError) logs.push(meta.apiError) }, vJ, 'm', null, null)
  const pm0 = cJ.trackProgressModel({ targetCount: 30, coreDone: 0, phase: 'streaming' }), pm90 = cJ.trackProgressModel({ targetCount: 30, coreDone: 90, phase: 'streaming' })
  T('J', 'generation progress: word 1/30 … 30/30, pairs 0 of 90 … 90 of 90; start log shows SELECTED 30 / GENERATION 30 / EXPECTED_TARGET_PAIRS 90 and never "26 of 30"',
    statuses.length === 30 && /1\/30: /.test(statuses[0]) && /30\/30: /.test(statuses[29]) && [...totals].every(t => t === 90) && lastDone >= 90 &&
    pm0.statusLine === '0 of 90 pairs' && pm90.statusLine === '90 of 90 pairs' &&
    logs.some(l => /SELECTED_TARGETS=30 GENERATION_TARGETS=30 NEW_TARGETS=5 REVIEW_TARGETS=25 LISTENING_REQUIRED_TARGETS=30 EXPECTED_TARGET_PAIRS=90/.test(l)),
    { first: statuses[0], last: statuses[29], totals: [...totals], lastDone, startLog: logs.filter(l => /CANDIDATES|SKIPPED|SELECTED_TARGETS/.test(l)).slice(0, 4) })
  // K: lexicon audit record for the report
  const audit = c.ev('THAI_LEXICON_AUDIT_V645')
  T('K', 'the four records were repaired from bank evidence (not blind): before/after kept; ids unchanged; Thursday duplicate 431 retired into 1626',
    audit.every(a => a.applied && a.before && a.evidence) && raw.find(d => d.id === 108).ph === 'sǎai' && raw.find(d => d.id === 108).e.startsWith('late') &&
    raw.find(d => d.id === 67).e === 'cheap' && raw.find(d => d.id === 324).ph === 'rɔɔng-tháo' && /bɔɔ-dii/.test(raw.find(d => d.id === 1626).ph) &&
    c.thaiCanonicalId(431) === 1626, audit.map(a => a.id + ' ' + a.thai + ': ' + JSON.stringify(a.before.e) + ' → ' + JSON.stringify(raw.find(d => d.id === a.id).e) + ', ph ' + a.before.ph + ' → ' + raw.find(d => d.id === a.id).ph))
  // S: สาย stored as "late" with an explicit sense, and every generation-side hint agrees
  const sai = raw.find(d => d.id === 108), srcS = fs.readFileSync('tt.jsx', 'utf8')
  const tS = c.resolveCanonicalTarget({ id: 108, thai: 'สาย', english: 'line', status: 'learning', lastSeen: '2026-09-20', repCount: 4 })
  T('S', 'สาย (108) = "late": gloss, senseId, note, excluded senses (line/cord/route/type), usage frame, generation hint and fallbacks all say "late"; history fields untouched',
    sai.e === 'late' && sai.senseId === 'สาย:late' && /มาสาย/.test(sai.note) && JSON.stringify(sai.excludedSenses) === JSON.stringify(['line', 'cord', 'route', 'type/category']) &&
    tS.target && tS.target.english === 'late' && tS.target.senseId === 'สาย:late' && tS.target.repCount === 4 && tS.target.lastSeen === '2026-09-20' &&
    /USAGE OF "สาย" — sense: late/.test(c.thaiUsageFrameLine({ thai: 'สาย' })) && /'สาย':"สาย = LATE/.test(srcS) && !/สาย means line/.test(srcS) &&
    c.makeFallbackPairs({ ...tS.target }).every(p => /มาสาย|ตื่นสาย/.test(p.thai)) && c.classifyWord({ thai: 'สาย', english: 'late' }) !== 'object',
    { gloss: sai.e, note: sai.note, frame: c.thaiUsageFrameLine({ thai: 'สาย' }).trim().split('\n')[0], fallbacks: c.makeFallbackPairs({ ...tS.target }).map(p => p.thai) })
  // L: JA/ZH selector unchanged when no `eligible` is passed
  const cz = c644.selectRevisionTrackTargets({ vocab: learner(c644), maxTargets: 30, today: DAY }), cz2 = c.selectRevisionTrackTargets({ vocab: learner(c), maxTargets: 30, today: DAY })
  T('L', 'the shared revision selector without `eligible` (Japanese/Mandarin path) returns exactly what v644 returned',
    JSON.stringify(cz.targets.map(t => t.id)) === JSON.stringify(cz2.targets.map(t => t.id)) && cz2.reserve === undefined && cz2.skippedCandidates === undefined)
  // M: the real Generator (server-rendered with React) — the lesson header the learner sees
  const React = require('react'), RDS = require('react-dom/server')
  const cr = load('tt.compiled.js', { React })
  const gen = (vocab, mode, customTargets) => RDS.renderToStaticMarkup(React.createElement(cr.Generator, { vocab, mode, customTargets, onGenerated() {}, onBack() {}, apiKey: 'k', tracks: [], dailyNewWords: null, onSaveDailyNewWords() {} }))
    .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
  const hDaily = gen(learner(cr), 'daily'), hRev = gen(learner(cr), 'revision', cr.selectThaiRevisionTargets(learner(cr), 30).targets), hBlk = gen(learnerOnly(cr, g27), 'daily')
  const lbl = h => (h.match(/Targeting[^✦↻]{0,120}/) || [''])[0].trim()
  T('M', 'Generator header: Daily, Revision AND the 27-learned-word learner all show "Targeting 30 words" — never "Targeting 26 of 30", never blocked',
    [hDaily, hRev, hBlk].every(h => /^Targeting 30 words/.test(lbl(h)) && !/Targeting \d+ of 30/.test(h) && !/TRACK_SELECTION_BLOCKED/.test(h)),
    { daily: lbl(hDaily), revision: lbl(hRev), blocked: lbl(hBlk) })
  console.log(out.join('\n') + '\n\n' + (fails ? fails + ' FAILED' : 'all passed') + ' (' + out.filter(l => /^(PASS|FAIL)/.test(l)).length + ' checks)')
})().catch(e => { console.error(e); process.exit(1) })
