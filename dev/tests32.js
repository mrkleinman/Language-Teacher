// v669 Part 27 — THAI LINGUISTIC REGRESSION SET (fixtures A–R), run through the app's real functions in the node harness.
// Linguistic fixtures use reviewed expectations only (the sense policy, the reviewed bank glosses and objective rules);
// nothing here turns a stylistic opinion into a deterministic truth. Listening fixtures run the real scene transaction
// with Gemini simulated at the transport boundary (tests14 responder).
const { setup, mock, makeTrack } = require('./tests14')
const out = []; let fails = 0, n = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + id.padEnd(4) + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 1400) : '')) }
const KEY = 'AIzaSyTEST-harness-key-000000'

function learner(lang) {
  const S = setup(lang)
  const ids = new Set(S.targets.map(t => t.id))
  S.vocab.forEach(w => { if (ids.has(w.id)) { w.dueDate = '2026-01-01'; w.difficulty = 'hard' } else { w.dueDate = '2099-01-01'; if (w.difficulty === 'hard') w.difficulty = 'medium' } })
  return S
}
async function listen(S, lang, ln, inject) {
  const st = mock(S, lang, { ln })
  const inner = S._mockFn
  S.c.mockGeminiGenerate = async (k, m, msgs, max, o) => {
    const q = msgs[msgs.length - 1].content
    let r = await inner(k, m, msgs, max, o)
    const sm = q.match(/^Write SCENE (LS\d+) /)
    if (sm && inject) { const j = JSON.parse(r); inject(sm[1], j); r = JSON.stringify(j) }
    return r
  }
  const logs = []
  const r = await S.c.buildStandaloneListeningTrack({ lang, vocab: S.vocab, apiKey: KEY, model: 'gemini-2.5-flash-lite', onLog: m => logs.push(m), attemptId: 'lattempt-v669' })
  const lines = r.track.listening ? r.track.listening.lines : []
  return { ...r, st, logs, L: logs.join('\n'), lines, text: l => l.thai || l.japanese || l.chinese || '' }
}

;(async () => {
  const S = setup('th'), c = S.c, V = S.vocab
  const w = th => V.find(x => x.thai === th)

  // ── A. natural colloquial จ่าย is accepted ─────────────────────────────────────────────────────────────────
  {
    const p = { thai: 'ผมจ่ายเองครับ', english: "I'll pay.", _target: 'จ่าย', wordId: w('จ่าย').id }
    const v1 = c.thaiAdjudicateRegisterClaim(p, { s: 2, note: 'จ่าย sounds too formal for casual speech' })
    const v2 = c.thaiAdjudicateRegisterClaim(p, { s: 2, note: 'ungrammatical: the verb needs an object here' })
    T('A1', 'จ่าย: a blanket "too formal" rejection is overruled (reviewed everyday spoken Thai) → 4/5 REGISTER_CLAIM_OVERRULED; a real grammar complaint is NOT overruled',
      v1.s === 4 && v1.adjudicated === 'REGISTER_CLAIM_OVERRULED' && v2.s === 2 && !v2.adjudicated, { v1, v2 })
    const items = [{ thai: 'คุณจ่ายเท่าไหร่ครับ', english: 'How much did you pay?', _target: 'จ่าย' }, { thai: 'ผมจ่ายเงินแล้วครับ', english: 'I have paid already.', _target: 'จ่าย' }]
    const ver = new Map([[0, { s: 3, note: 'a bit unnatural' }], [1, { s: 3, note: 'odd' }]])
    let asked = null
    await c.thaiControlledAdjudication(items, ver, async q => { asked = q; return [{ i: 1, s: 2, construction: 'จ่ายเงินเยอะ', reason: 'not in the sentence' }, { i: 2, s: 2, construction: 'จ่ายเงินแล้ว', reason: 'should be จ่ายแล้ว', alternative: 'ผมจ่ายแล้วครับ' }] })
    T('A2', 'controlled adjudication: a 3/5 rejection must quote a span that IS in the Thai — an unsubstantiated one is overruled (4/5), a quoted one is CONFIRMED',
      !!asked && /CONTROLLED ADJUDICATION/.test(asked) && ver.get(0).s === 4 && ver.get(0).adjudicated === 'UNSUBSTANTIATED_OVERRULED' && ver.get(1).adjudicated === 'CONFIRMED' && ver.get(1).s <= 3,
      { a: ver.get(0), b: ver.get(1) })
    const rules = c.ev('THAI_SEMANTIC_JUDGE_RULES')
    T('A3', 'the semantic judge must justify a rejection (construction + reason + alternative); register opinions about a single word are not enough',
      /construction/i.test(rules) && /alternative/i.test(rules), rules.slice(0, 200))
  }

  // ── B. สี inside colour expressions + full closed-vocab validation ──────────────────────────────────────
  {
    const a = c.thaiTargetConceptPresent('สี', 'ผมชอบสีส้มครับ', V), b = c.thaiTargetConceptPresent('สี', 'รถคันนี้สีดำค่ะ', V)
    const n0 = c.thaiTargetConceptPresent('สี', 'ผมชอบเสื้อตัวนี้ครับ', V)
    T('B1', 'สี is heard inside the colour words สีส้ม / สีดำ (productive head, the compound\'s own gloss is a colour); absent when no colour word is used',
      a.present && b.present && a.form === 'COMPOUND_PRODUCTIVE_HEAD' && !n0.present, { a, b, n0 })
    // the compound itself must still be an authorised word: an untaught colour compound is blocked by the closed vocabulary
    const V2 = V.map(x => x.thai === 'สีส้ม' ? { ...x, status: 'new', introducedAt: null, lastSeen: null, repCount: 0, okStreak: 0, manualKnown: false } : x)
    const ctx = c.buildThaiTrackVocabContext(V2, [{ ...w('สี'), wordId: w('สี').id }], [])
    let blocked = []
    try { blocked = c.validateThaiVocabulary([{ thai: 'ผมชอบสีส้มครับ' }], ctx).blocked } catch (e) { blocked = ['ERR ' + e.message] }
    const ctxOk = c.buildThaiTrackVocabContext(V, [{ ...w('สี'), wordId: w('สี').id }], [])
    let blockedOk = []
    try { blockedOk = c.validateThaiVocabulary([{ thai: 'ผมชอบสีส้มครับ' }], ctxOk).blocked } catch (e) { blockedOk = ['ERR ' + e.message] }
    T('B2', 'compound matching does NOT bypass the closed vocabulary: สีส้ม untaught → blocked; taught → allowed',
      blocked.length > 0 && !blockedOk.length, { blocked, blockedOk })
  }

  // ── C/D/E. polysemous senses: ศูนย์, พอดี, พี่ ───────────────────────────────────────────────────────────
  {
    const si = th => c.thaiTargetSenseInfo({ wordId: w(th).id, thai: th, english: w(th).english }, V)
    const z = si('ศูนย์'), p = si('พอดี'), k = si('พี่')
    T('C1', 'ศูนย์ (bank gloss "centre; zero") is practised in ONE named sense: zero — the "centre" sense is named as NOT this one; an implausible zero price is excluded',
      /zero/.test(z.targetSense) && /centre/.test(z.targetNotSense) && /price/.test(z.targetNotSense) && z.targetGloss === 'centre; zero', z)
    T('D1', 'พอดี: intended sense "just right / fits exactly"; the "happen to" use is named as a different meaning', /just right|fits exactly/.test(p.targetSense) && /happen to/.test(p.targetNotSense), p)
    T('E1', 'พี่: older sibling OR a friendly address to someone a little older (relationship); never a younger person; the English must say which', /older/.test(k.targetSense) && /younger/.test(k.targetNotSense) && /English must say which/.test(k.targetUsageNote), k)
    const line = c.thaiTargetSense({ wordId: w('ศูนย์').id, thai: 'ศูนย์' }, V)
    T('C2', 'the intended sense (with its NOT clause) is the line generation, recovery and QC all receive', /zero/.test(line) && /NOT:/.test(line), line)
    // Listening targets carry the sense too
    const tr = makeTrack(S, 'th', { tag: '-sense' })
    tr.keywords = tr.keywords.concat([{ wordId: w('ศูนย์').id, thai: 'ศูนย์', english: w('ศูนย์').english }])
    tr.selectedTargetIds = tr.keywords.map(x => x.wordId)
    let lt = []
    try { lt = c.listeningConversationTargets(tr, V, 'th') } catch (e) { lt = [] }
    const zt = lt.find(t => t.surface === 'ศูนย์')
    T('C3', 'a Listening target carries the same intended sense (ศูนย์ → zero, NOT centre) into the scene prompt rows', !!zt && /zero/.test(zt.sense || '') && /NOT/.test(zt.sense || ''), zt && zt.sense)
  }

  // ── F. สิบพัน vs หนึ่งหมื่น (objective number composition) ─────────────────────────────────────────────
  {
    const bad = c.thaiNumberExpressionProblems('ผมมีเงินสิบพันบาทครับ'), good = c.thaiNumberExpressionProblems('ผมมีเงินหนึ่งหมื่นบาทครับ')
    const plant = c.thaiNumberExpressionProblems('พันธุ์ไม้นี้สวยครับ')
    const v = c.validateThaiTargetPair({ thai: 'ผมมีเงินสิบพันบาทครับ', english: 'I have ten thousand baht.', prompt: 'He says how much money he has', speaker: 'A', pairType: 'content', targetId: w('พัน').id }, { thai: 'พัน', wordId: w('พัน').id }, { vocab: V }, 'final')
    T('F1', 'สิบพัน is INVALID_NUMBER_EXPRESSION (→ หมื่น / หนึ่งหมื่น); หนึ่งหมื่น passes; พันธุ์ is not a number; the pair contract fails COMPOSITION',
      bad.length === 1 && bad[0].id === 'INVALID_NUMBER_EXPRESSION' && /หมื่น/.test(bad[0].why) && !good.length && !plant.length && v.dimensions.COMPOSITION === 'FAIL', { bad, good, plant, comp: v.dimensions.COMPOSITION })
  }

  // ── G. male / female polite particle consistency ────────────────────────────────────────────────────────
  {
    const m = c.thaiSpeakerParticleLocalRepair('ผมจะไปตลาดค่ะ', "I'm going to the market.", 'male')
    const f = c.thaiSpeakerParticleLocalRepair('ฉันจะไปตลาดครับ', "I'm going to the market.", 'female')
    const fq = c.thaiSpeakerParticleLocalRepair('คุณจะไปตลาดไหมครับ', 'Are you going to the market?', 'female')
    const ok = c.thaiSpeakerParticleLocalRepair('ผมจะไปตลาดครับ', "I'm going to the market.", 'male')
    const v = c.validateThaiTargetPair({ thai: 'ผมจ่ายเองค่ะ', english: "I'll pay.", prompt: 'He says he will pay himself', speaker: 'A', pairType: 'content', targetId: w('จ่าย').id }, { thai: 'จ่าย', wordId: w('จ่าย').id }, { vocab: V }, 'final')
    T('G1', 'a man\'s line ends with ครับ, a woman\'s with ค่ะ (statement) / คะ (question) — repaired locally; a correct line is untouched; ผม + ค่ะ on speaker A fails SPEAKER_REGISTER',
      m.thai === 'ผมจะไปตลาดครับ' && f.thai === 'ฉันจะไปตลาดค่ะ' && fq.thai === 'คุณจะไปตลาดไหมคะ' && !ok.changed && v.dimensions.SPEAKER_REGISTER === 'FAIL', { m, f, fq, sr: v.dimensions.SPEAKER_REGISTER })
  }

  // ── H. the English cue matches the Thai's form (question ↔ statement) ──────────────────────────────────
  {
    const q = { thai: 'คุณจ่ายเท่าไหร่ครับ', english: 'How much did you pay?', prompt: 'He says how much he paid' }
    const s = { thai: 'ผมจ่ายแล้วครับ', english: 'I already paid.', prompt: 'He asks whether you paid' }
    const okQ = { ...q, prompt: 'He asks how much you paid' }, emb = { thai: 'ไม่รู้ว่าอยู่ที่ไหนครับ', english: "I don't know where it is.", prompt: 'He says he does not know where it is' }
    T('H1', 'a statement cue for a Thai question (and a question cue for a statement) is CUE_FORM_MISMATCH; matching cues and embedded questions pass',
      c.thaiCueFormProblems(q).length === 1 && c.thaiCueFormProblems(s).length === 1 && !c.thaiCueFormProblems(okQ).length && !c.thaiCueFormProblems(emb).length)
    T('H2', 'the deterministic fix rebuilds the cue from the line\'s own English in the right form (never a "Say: …" template)',
      c.thaiCueFormRepair(q) === 'Ask: How much did you pay?' && c.thaiCueFormRepair(s) === 'Tell the other person: I already paid.' && !/^Say:/.test(c.thaiCueFormRepair(s)), [c.thaiCueFormRepair(q), c.thaiCueFormRepair(s)])
    const v = c.validateThaiTargetPair({ ...q, speaker: 'A', pairType: 'content', targetId: w('จ่าย').id, _semanticState: 'VERIFIED' }, { thai: 'จ่าย', wordId: w('จ่าย').id }, { vocab: V }, 'final')
    const audit = await c.finalPairSemanticAudit([{ ...q, speaker: 'A', pairType: 'content', targetId: w('จ่าย').id, _target: 'จ่าย' }], null, null, null, { label: 'h' })
    T('H3', 'a mismatched cue cannot count toward 90 (CUE_CONSISTENT=FAIL, even when the judge passed it); the final audit rebuilds it BEFORE judging (THAI_CUE_FORM_REPAIRED)',
      v.dimensions.CUE_CONSISTENT === 'FAIL' && audit.pairs[0] && audit.pairs[0].prompt === 'Ask: How much did you pay?' && audit.pairs[0]._cueFormRepairedFrom === q.prompt,
      { cc: v.dimensions.CUE_CONSISTENT, p: audit.pairs[0] && audit.pairs[0].prompt })
    // v668 live: [042] เขาบอกว่าไม่ต้องจ่ายค่ะ was DROPPED for its "Say: …" cue — the slot that left จ่าย at 2/3 (89/90)
    const kw = { wordId: w('จ่าย').id, thai: 'จ่าย', english: 'to pay' }
    const fp = { thai: 'เขาบอกว่าไม่ต้องจ่ายค่ะ', english: "He said we don't have to pay.", prompt: "Say: He said we don't have to pay", speaker: 'B', pairType: 'content', targetId: kw.wordId, wordId: kw.wordId, recallGroupId: 'rg-' + kw.wordId, phonetic: 'khao bok wa mai tong jai kha' }
    const fa = c.thaiFinalTrackAudit([fp], { keywords: [kw], vocab: V, stage: 'final' })
    const kept = (fa.pairs || fa.out || []).find(x => x && x.thai === fp.thai)
    T('H4', 'a valid line whose ONLY defect is the generic "Say: …" cue keeps its slot: the final audit rebuilds the cue from its own English (FINAL_CUE_REBUILT), never drops it',
      !!kept && kept.prompt === "Tell the other person: He said we don't have to pay." && kept._cueRebuiltFrom === fp.prompt, { keys: Object.keys(fa), kept })
  }

  // ── I. clause-aware Thai spacing ─────────────────────────────────────────────────────────────────────────
  {
    const a = c.normaliseThaiSpacing('สวัสดีครับ คุณ สบาย ดี ไหม ครับ'), b = c.normaliseThaiSpacing('ผม ชอบ กิน ข้าว ครับ')
    T('I1', 'spaces inside a clause are removed; ONE space is kept after a clause-final particle (ครับ / ค่ะ / นะ …)', a === 'สวัสดีครับ คุณสบายดีไหมครับ' && b === 'ผมชอบกินข้าวครับ', [a, b])
  }

  // ── J. Daily 30 × 3 = 90 ─────────────────────────────────────────────────────────────────────────────────
  {
    const AD = c.ev('TRACK_ADAPTERS').th
    const fin = t => c.finaliseMainTrack(t, AD, { vocab: V, apiKey: 'k', model: 'gemini-2.5-flash-lite', qcRan: true, onLog: () => {} })
    mock(S, 'th', {})
    const full = await fin(makeTrack(S, 'th', { tag: '-j90' }))
    const short = await fin(makeTrack(S, 'th', { tag: '-j89', counts: { [S.targets[4].id]: 2 } }))
    const r1 = c.trackReadiness(full.track || full), r2 = c.trackReadiness(short.track || short)
    T('J1', 'the Daily contract is 30 targets × 3 valid target pairs = 90 (framing never counts); 90/90 READY · 89/90 → the missing slot is recovered (READY with quotaRecovered ≥ 1) or NOT_READY naming the target 2/3',
      c.ev('TRACK_CONTRACT').TARGETS === 30 && c.ev('TRACK_CONTRACT').PAIRS_PER_TARGET === 3 && r1.expectedTargetPairs === 90 && r1.validTargetPairs === 90 && r1.ready &&
      // 89/90 → quota recovery repairs the ONE missing slot (READY only with a recovered pair), else NOT_READY naming it
      (r2.ready ? r2.validTargetPairs === 90 && ((short.track || short).integrity.counts.quotaRecovered || 0) >= 1 : r2.validTargetPairs === 89 && r2.unresolvedTargetIds.includes(S.targets[4].id)), { r1: [r1.validTargetPairs, r1.mainTrackState], r2: [r2.validTargetPairs, r2.mainTrackState, r2.unresolvedTargetIds, ((short.track || short).integrity || {}).counts] })
    const have = [{ thai: 'ไม่ต้องจ่ายครับ', english: "You don't have to pay." }, { thai: 'ไม่ต้องจ่ายเลยค่ะ', english: "You don't need to pay at all." }]
    const line = c.thaiMissingFunctionLine(have)
    T('J2', 'the missing SLOT is repaired with a DIFFERENT communicative use than the two valid lines (not ไม่ต้องจ่าย + a particle again)', /negative statement/.test(line) && /question/.test(line) && /DIFFERENT/.test(line), line)
  }

  // ── K. a Listening question is answered by an appropriate response ──────────────────────────────────────
  {
    const sk = (filler, intent2) => [{ turn: 1, speaker: 'A', intent: 'QUESTION', slot: 'AGE', targetIds: [1], roles: ['QUESTION_WORD'], surfaces: ['คุณอายุเท่าไหร่'] },
      { turn: 2, speaker: 'B', intent: intent2 || 'ANSWER', respondsTo: 1, slot: 'AGE', targetIds: [2], roles: ['CONTENT'], surfaces: ['x'], fillers: [filler] }]
    const good = c.validateIntentSkeleton(sk('AMOUNT'), null), bad = c.validateIntentSkeleton(sk('PLACE'), null), unrelated = c.validateIntentSkeleton(sk('AMOUNT', 'QUESTION'), null)
    const misuse = c.validateIntentSkeleton([{ turn: 1, speaker: 'A', intent: 'STATEMENT', targetIds: [1], roles: ['QUESTION_WORD'], surfaces: ['คุณอายุเท่าไหร่'] }, { turn: 2, speaker: 'B', intent: 'REACTION', respondsTo: 1, targetIds: [], roles: [], surfaces: [], fillers: [] }], null)
    T('K1', '"how old are you?" (QUESTION(age)) must be answered by an age/amount — a place does not fill it, a question is not an answer, a question phrase cannot be a statement',
      good.valid && !bad.valid && !unrelated.valid && !misuse.valid && /can only be asked/.test(misuse.problems.join(' ')), { bad: bad.problems, unrelated: unrelated.problems, misuse: misuse.problems })
    const R = t => c.listeningFunctionRole({ english: t })
    T('K2', 'function roles from the reviewed gloss: คุณอายุเท่าไหร่ "how old are you?" → QUESTION_WORD · ไม่เชิง "not exactly" → RESPONSE_TOKEN · โชคดี "good luck" → PARTING · ไม่ทราบว่า "may I ask…" → QUESTION_WORD',
      R('how old are you?') === 'QUESTION_WORD' && R('not exactly') === 'RESPONSE_TOKEN' && R('good luck') === 'PARTING' && R('may I ask…') === 'QUESTION_WORD', [R('how old are you?'), R('not exactly'), R('good luck'), R('may I ask…')])
    const turns = [{ speaker: 'A', pair: { thai: 'คุณอายุเท่าไหร่ครับ', english: 'How old are you?' } }, { speaker: 'B', pair: { thai: 'ร้านอาหารอยู่ที่ไหนคะ', english: 'Where is the restaurant?' } }]
    const iss = c.skeletonAdjacencyIssues(turns, { skeleton: [{ turn: 1, intent: 'QUESTION' }] })
    T('K3', 'a written scene where the answer is an unrelated question is an ADJACENCY defect at that line', iss.length === 1 && iss[0].line === 2, iss)
  }

  // ── L/M. reassignment only to a compatible scene ────────────────────────────────────────────────────────
  {
    const dom = th => c.listeningTopicDomain(w(th), c.targetSemanticDomain(w(th)))
    const squid = dom('ปลาหมึก'), plaus = c._lnScenePlausible
    T('L1', 'an unrelated target is rejected: squid (' + squid + ') cannot join an identity scene or a big-amounts scene',
      squid === 'food & cooking' && !plaus(['identity & names', squid]) && !plaus(['big amounts', squid]), { squid })
    T('M1', 'a missing target is reassigned only where the situation carries it: squid joins a home-cooking or a food-plans scene; a topic-neutral word fits anywhere',
      plaus(['home', squid]) && plaus(['plans & schedule', squid]) && plaus(['big amounts', 'general conversation']), { squid })
  }

  // ── N–R. the Listening scene transaction (Thai, real builder; Gemini simulated) ──────────────────────────
  {
    const S1 = learner('th')
    const r = await listen(S1, 'th', { dup: true, noRepair: true, persist: 'all' })
    const lines = r.lines.map(r.text)
    // v673 §3: no COMMIT_WITH_DEFECTS — a defective candidate is never committed AS WRITTEN: it is regenerated from its frozen
    // plan, re-planned ONCE globally, or its defective exchange is TRIMMED deterministically (no paid call). The repeated
    // line never enters the track; READY iff every gate is clean (a trim that keeps every target heard may be READY).
    const handled = L => /SCENE_NOT_COMMITTED LS\d INVALID_CANDIDATE residual=.*dup|PHASE_TRIMMED LS\d|PHASE_NOT_COMMITTED LS\d/.test(L)
    T('N1', 'a defective scene is NOT committed as written: a duplicate in every candidate of every scene → (v673) regenerated / replanned once / the duplicate exchange TRIMMED (or not committed) — no repeated line ever enters the track; 0 committed-with-defects; READY iff every gate passes',
      handled(r.L) && /DUPLICATE_FAIL/.test(r.L) && new Set(lines).size === lines.length && (r.track.telemetry.LISTENING_SCENES_COMMITTED_WITH_DEFECTS || 0) === 0 && (r.track.status === 'READY') === (r.track.failedChecks.length === 0),
      { st: r.track.status, failed: r.track.failedChecks })
    const S2 = learner('th')
    const r2 = await listen(S2, 'th', { dup: true, noRepair: true, persist: true })
    const unc = (r2.track.listening && r2.track.listening.uncommittedScenes) || []
    const l2 = r2.lines.map(r2.text)
    T('N2', 'an INVALID LS1 candidate (persistent duplicate) is never committed as written (v673: regenerated / replanned / trimmed, or UNCOMMITTED); no repeated line in the track; READY only if every LS1 target is verified in a clean committed line',
      (unc.some(u => u.sceneId === 'LS1') || /PHASE_TRIMMED LS1 |PHASE_REGENERATE LS1 |LISTENING_GLOBAL_REPLAN after LS1 /.test(r2.L)) && new Set(l2).size === l2.length && (r2.track.status === 'READY') === (r2.track.failedChecks.length === 0) &&
      (r2.track.status !== 'READY' || r2.track.coverage.covered === 30), { st: r2.track.status, unc })
  }
  {
    // O — the patch validator: a protected target may leave its line when it is still heard elsewhere in the conversation
    const S3 = learner('th'), c3 = S3.c
    const tg = S3.targets.slice(0, 3)
    const la = c3.listeningAdapterFor('th')
    const mk = (th, sp) => ({ speaker: sp, pair: la.makeLine({ text: th, english: 'x' }, sp) })
    const t0 = tg[0].thai, t1 = tg[1].thai, t2 = tg[2].thai
    const sc = { sceneId: 'LS1', turns: [mk('ผม' + t0 + 'ครับ', 'A'), mk('ฉัน' + t1 + 'ค่ะ', 'B'), mk('ผม' + t0 + 'ด้วยครับ', 'A'), mk('ฉัน' + t2 + 'ค่ะ', 'B')] }
    const env = { la, log: null, tel: {}, targets: tg.map(t => ({ id: t.id, surface: t.thai, gloss: t.english })), ctx: { complexity: c3.getLearnerComplexityContract({ lang: 'th', vocab: S3.vocab }), inventory: null, exposed: S3.vocab },
      byId: new Map(tg.map(t => [t.id, { id: t.id, surface: t.thai }])), scenePlanById: new Map(), acceptedOthers: [] }
    env.ctx.lang = 'th'
    let res = null, err = null
    try {
      const flat = c3._lnFlat([sc])
      const u = { line: 3, scope: [3], codes: ['UNNATURAL'], protectedIds: [tg[0].id], sceneId: 'LS1' }
      const nb = new Map([[3, { pair: la.makeLine({ text: 'ผมก็ด้วยครับ', english: 'Me too.' }, 'A') }]])
      res = c3._lnValidatePatch(env, flat, u, nb)
      const u2 = { line: 1, scope: [1], codes: ['UNNATURAL'], protectedIds: [tg[0].id], sceneId: 'LS1' }
      const sc2 = { sceneId: 'LS1', turns: [mk('ผม' + t0 + 'ครับ', 'A'), mk('ฉัน' + t1 + 'ค่ะ', 'B')] }
      const res2 = c3._lnValidatePatch(env, c3._lnFlat([sc2]), u2, new Map([[1, { pair: la.makeLine({ text: 'ผมก็ด้วยครับ', english: 'Me too.' }, 'A') }]]))
      res = { a: res, b: res2 }
    } catch (e) { err = e.message }
    T('O1', 'a repair may move a protected target off its line when it is still heard elsewhere (global coverage kept); losing its ONLY occurrence is PROTECTED_TARGET_LOST',
      !err && res && res.a.ok === true && res.b.ok === false && /PROTECTED_TARGET_LOST/.test(res.b.reason), { err, res })
  }
  {
    const F = 'จักรวาล'
    const S4 = learner('th')
    const r = await listen(S4, 'th', { atomicNoop: true }, (sid, j) => { if (j.turns[1]) j.turns[1].text = j.turns[1].text.replace(/(ครับ|ค่ะ|คะ)?$/, m => F + m) })
    T('P1', 'CLOSED_VOCAB stays a hard gate: an untaught word the model never removes is caught as generated (CLOSED_VOCAB_FAIL) and never reaches the track — no scene with it is committed, NOT_READY',
      /CLOSED_VOCAB_FAIL scene=LS\d .*\(as generated\)/.test(r.L) && !r.lines.some(l => r.text(l).includes(F)) && r.track.status === 'NOT_READY', { st: r.track.status, failed: r.track.failedChecks })
    const S5 = learner('th')
    const r5 = await listen(S5, 'th', { max4: true })
    T('Q1', 'max3 stays enforced: a 4-target turn is repaired (split) before commit · no committed line carries more than 3 targets · READY',
      r5.track.status === 'READY' && r5.lines.every(l => (l.coversTargetIds || []).length <= 3) && r5.track.listening.gates.MAX3_PASS === true, { st: r5.track.status, failed: r5.track.failedChecks })
    T('R1', 'pronunciation stays aligned: every committed line has a romanisation and PRONUNCIATION passes (generated after the text is frozen)',
      r5.track.listening.gates.PRONUNCIATION === true && r5.lines.every(l => l.phonetic || l.romanization || l.romaji), { g: r5.track.listening.gates.PRONUNCIATION })
  }

  console.log(out.join('\n'))
  console.log('\nv669 Thai linguistic regression set (Part 27 A–R): ' + (n - fails) + '/' + n + (fails ? ' — ' + fails + ' FAILED' : ' — ALL PASS'))
  process.exit(fails ? 1 : 0)
})().catch(e => { console.log('CRASH ' + (e && e.stack || e)); process.exit(1) })
