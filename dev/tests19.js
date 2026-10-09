// v654 — SHARED LESSON QUALITY REPAIR regression (§30 Thai targets · §31 Japanese mix · §32 Listening
// structure A–E) plus suitability, tokenizer, scene planning, Main coherence invariant, NEW count,
// contextual opening repair, reporting labels and cost counters. The model is simulated at the Gemini
// boundary (tests14 responder); every gate, planner, validator and repair is the app's own code.
const { setup, sentence, makeTrack, mock, FR, kwOf, txt } = require('./tests14.js')
let fails = 0, passes = 0
const out = []
const T = (id, name, pass, detail) => {
  if (pass) passes++; else fails++
  out.push((pass ? 'PASS ' : 'FAIL ') + id.padEnd(4) + name + (detail !== undefined && !pass ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 1200) : ''))
}
const ADAPTER = (S, lang) => S.c.ev('TRACK_ADAPTERS')[lang]
const fin = async (S, lang, track, extra = {}) => {
  const log = []
  const t = await S.c.finaliseMainTrack(track, ADAPTER(S, lang), { vocab: S.vocab, apiKey: 'k', model: 'gemini-2.5-flash-lite', qcRan: true, onLog: m => log.push(m), ...extra })
  return { t, log }
}
// a three-scene Main plan over the fixture targets (10 / 10 / 10)
// v657: the coherence-repair checks (M1/M2) need a failing scene whose TARGET CLUSTER is valid — an invalid
// cluster is re-clustered instead of rewritten (tests22 covers that path). Scene 1 here is targets 10–19.
const planValidFirst = S => ({ source: 'model', scenes: [[10, 'at the market'], [20, 'back at home'], [0, 'planning the day']].map(([o, pu], k) => ({ sceneId: 'S' + (k + 1), purpose: pu, targetIds: S.targets.slice(o, o + 10).map(t => t.id) })) })
const planOf = S => ({ source: 'model', scenes: [0, 1, 2].map(k => ({ sceneId: 'S' + (k + 1), purpose: ['planning the day', 'at the market', 'back at home'][k], targetIds: S.targets.slice(k * 10, k * 10 + 10).map(t => t.id) })) })
// wrap the tests14 responder so a test can post-process one kind of reply
const wrap = (S, fn) => { const base = S._mockFn; const seen = []; S.c.mockGeminiGenerate = S._mockFn = async (k, m, msgs, max, o) => { const q = msgs[msgs.length - 1].content; seen.push({ q, stage: o && o.stage }); const r = await base(k, m, msgs, max, o); return fn ? fn(q, r, o) : r }; return seen }

async function main() {
  // ══ §3–6 / §30 — TARGET ACTIVITY SUITABILITY (Thai fixtures) ══════════════════════════════
  {
    const S = setup('th')
    const w = t => S.vocab.find(x => x.thai === t)
    const pf = t => S.c.targetActivityPreflight(w(t), 'th', { activity: 'spokenConversation', register: 'natural', evidence: {} })
    const exp = { 'ซึ่ง': 'TARGET_UNSUITABLE_FOR_ACTIVITY', 'ขอให้เป็นวันที่ดี': 'TARGET_UNSUITABLE_FOR_ACTIVITY', 'ขอให้สนุกกับวันนี้': 'CURRICULUM_QUALITY_REVIEW_REQUIRED',
      'เท่านั้น': 'SUITABLE', 'ตกลง': 'SUITABLE', 'หมายถึง': 'SUITABLE', 'มีด': 'SUITABLE' }
    const got = Object.fromEntries(Object.keys(exp).map(t => [t, pf(t).status]))
    T('S1', '§30 preflight: ซึ่ง / ขอให้เป็นวันที่ดี unsuitable for spoken conversation · ขอให้สนุกกับวันนี้ needs curriculum review · เท่านั้น ตกลง หมายถึง มีด suitable',
      Object.keys(exp).every(t => got[t] === exp[t]), got)
    // v655: ซึ่ง is WRITTEN_DOMINANT (graded register); an unexplained RECOGNITION entry is flagged for metadata review
    T('S2', 'rejection reasons come from bank metadata: ซึ่ง = WRITTEN_DOMINANT · ขอให้เป็นวันที่ดี = RECOGNITION_ONLY_ENTRY · ขอให้สนุกกับวันนี้ = TARGET_CANONICAL_ENTRY_SUSPECT',
      pf('ซึ่ง').reason === 'WRITTEN_DOMINANT' && /^RECOGNITION_ONLY_ENTRY/.test(pf('ขอให้เป็นวันที่ดี').reason) && pf('ขอให้สนุกกับวันนี้').reason === 'TARGET_CANONICAL_ENTRY_SUSPECT',
      { a: pf('ซึ่ง').reason, b: pf('ขอให้เป็นวันที่ดี').reason, c: pf('ขอให้สนุกกับวันนี้').reason })
    // selection: only ~67 words are learnable, the 7 fixtures among them ⇒ 30 selected, no unsuitable one
    const keep = new Set(Object.keys(exp).map(t => w(t).id))
    const suitable = S.vocab.filter(x => x.status !== 'locked' && !keep.has(x.id) && S.c.targetActivityPreflight(x, 'th', { evidence: {} }).status === 'SUITABLE').slice(0, 60).map(x => x.id)
    suitable.forEach(id => keep.add(id))
    const V = S.vocab.map(x => keep.has(x.id) ? x : { ...x, status: 'new', lastSeen: null, introducedAt: null, repCount: 0 })
    const r = S.c.selectThaiRevisionTargets(V, 30)
    const bad = ['ซึ่ง', 'ขอให้เป็นวันที่ดี', 'ขอให้สนุกกับวันนี้'].map(t => w(t).id)
    const pool = S.c.thaiEligibleCandidatePool(V)
    // the export lines for every preflight verdict on these fixtures (the selection's own skipped list + the pool's)
    const lines = S.c.thaiSelectionLogLines({ skippedCandidates: [...(r.skippedCandidates || []), ...pool.skipped.filter(x => bad.includes(x.id) && !(r.skippedCandidates || []).some(y => y.id === x.id))], backfills: r.selectionBackfills || [] })
    T('S3', 'TARGET_ACTIVITY_PREFLIGHT runs before generation: unsuitable targets are backfilled, exactly 30 selected (SRS obligation kept)',
      r.targets.length === 30 && bad.every(id => !r.targets.some(t => t.id === id)) && (r.skippedCandidates || []).some(x => x.preflight) && bad.every(id => pool.skipped.some(x => x.id === id && x.preflight)),
      { n: r.targets.length, skipped: (r.skippedCandidates || []).filter(x => x.preflight).map(x => x.thai) })
    T('S4', '§5 export: TARGET_METADATA_QUALITY_FAIL target/reason/suggestedReview for the suspect entry · TARGET_PREFLIGHT_REJECT for the others · TARGET_PREFLIGHT_REJECTIONS / TARGETS_BACKFILLED_FOR_ACTIVITY counters',
      lines.some(l => /^TARGET_METADATA_QUALITY_FAIL target=ขอให้สนุกกับวันนี้ .*reason=.*suggestedReview=/.test(l)) && lines.some(l => /^TARGET_PREFLIGHT_REJECT target=ซึ่ง .*WRITTEN_DOMINANT/.test(l)) &&
      lines.some(l => /TARGET_PREFLIGHT_REJECTIONS=\d+ CANDIDATES_REJECTED_DURING_SEARCH=\d+ ACTUAL_SELECTED_SLOTS_BACKFILLED=\d+/.test(l)), lines.filter(l => /TARGET_/.test(l)))
    // evidence: one judgement never changes metadata; corroborated evidence (3 verdicts / 2 runs) does
    const tgt = w('หมายถึง')
    const ev1 = { TARGET_USAGE_UNSUITABLE_FOR_REGISTER: { verdicts: 1, runs: ['r1'], notes: ['too formal'] } }
    const ev3 = { TARGET_USAGE_UNSUITABLE_FOR_REGISTER: { verdicts: 3, runs: ['r1', 'r2'], notes: ['too formal'] } }
    T('S5', '§28 escalation needs repeated evidence: 1 verdict ⇒ still SUITABLE · 3 verdicts over 2 runs ⇒ UNSUITABLE (TARGET_USAGE_UNSUITABLE_FOR_REGISTER)',
      S.c.targetActivityPreflight(tgt, 'th', { evidence: ev1 }).status === 'SUITABLE' && S.c.targetActivityPreflight(tgt, 'th', { evidence: ev3 }).reason === 'TARGET_USAGE_UNSUITABLE_FOR_REGISTER')
    const evL = { TARGET_UNSUITABLE_FOR_CURRENT_LEXICON: { verdicts: 3, runs: ['r1', 'r2'], notes: ['needs untaught words'], lexiconSize: 200 } }
    T('S6', '§7 TARGET_UNSUITABLE_FOR_CURRENT_LEXICON holds for the same lexicon and EXPIRES when the lexicon grows >15%',
      S.c.targetActivityPreflight(tgt, 'th', { evidence: evL, lexiconSize: 210 }).status === 'TARGET_UNSUITABLE_FOR_CURRENT_LEXICON' && S.c.targetActivityPreflight(tgt, 'th', { evidence: evL, lexiconSize: 260 }).status === 'SUITABLE')
  }
  // ══ §27/§28 — RECOVERY ECONOMICS: a target blamed twice for itself is escalated, not re-generated ══
  {
    const S = setup('th'); const st = mock(S, 'th')
    const track = makeTrack(S, 'th', { tag: '-esc' })
    const [tA, tB] = S.targets
    let hit = { [tA.id]: 1, [tB.id]: 1 }
    track.pairs = track.pairs.map(p => { if (p.targetId != null && hit[p.targetId] > 0) { hit[p.targetId]--; return { ...p, _semanticState: 'REJECTED', _semanticUnverified: { stage: 'test', reason: 'QC rejected' } } } return p })
    S.c.noteTargetIssue('th', tA.id, 'TARGET_USAGE_UNSUITABLE_FOR_REGISTER', 'formal written word')
    S.c.noteTargetIssue('th', tA.id, 'TARGET_USAGE_UNSUITABLE_FOR_REGISTER', 'formal written word')
    S.c.noteTargetIssue('th', tB.id, 'TARGET_USAGE_UNSUITABLE_FOR_REGISTER', 'one verdict only')
    const { t, log } = await fin(S, 'th', track)
    T('R1', '§27 two corroborating TARGET_USAGE_UNSUITABLE_FOR_REGISTER verdicts ⇒ recovery stopped for that target (0 recovery calls), RECOVERY_CALLS_AVOIDED counted, track NOT_READY (never padded)',
      !st.rec[tA.id] && log.some(l => /⛔ TARGET_USAGE_UNSUITABLE_FOR_REGISTER .*RECOVERY_CALLS_AVOIDED\+=/.test(l)) && t.integrity.status === 'NOT_READY' && t.integrity.costGuard.RECOVERY_CALLS_AVOIDED > 0,
      { rec: st.rec[tA.id], st: t.integrity.status, cg: t.integrity.costGuard, log: log.filter(l => /UNSUITABLE|AVOIDED/.test(l)).slice(0, 3) })
    T('R2', '§28 a single verdict never changes the target\'s treatment: the other target is recovered normally (3/3)',
      st.rec[tB.id] >= 1 && t.integrity.quota.rows.find(r => r.targetId === tB.id).valid === 3, { rec: st.rec[tB.id] })
    const gs = S.c.ev('GEMINI_SCHEMAS').verdicts
    T('R3', '§28 the naturalness judge can name the fault: SENTENCE_UNNATURAL / TARGET_USAGE_UNSUITABLE_FOR_REGISTER / TARGET_CANONICAL_ENTRY_SUSPECT (verdict schema has "issue")',
      JSON.stringify(gs).includes('"issue"') && /TARGET_USAGE_UNSUITABLE_FOR_REGISTER/.test(S.c.ev('_naturalnessPromptText').toString()))
  }
  // ══ §8 — TOKENIZER ════════════════════════════════════════════════════════════════════
  {
    const S = setup('th')
    const seg = t => S.c.segmentThaiWithDiagnostics(t, S.vocab, null, null, true).map(x => x.matchedSpan)
    const a = seg('ผมมีบัตรสมาชิกครับ'), b = seg('เย็นๆสักแก้วไหมคะ')
    T('K1', 'สมาชิก is one token (never สมา | ชิก)', a.includes('สมาชิก') && !a.includes('สมา') && !a.includes('ชิก'), a)
    T('K2', 'ๆ is its own repetition mark: never ๆสัก', b.includes('ๆ') && !b.some(x => /ๆ./.test(x)) && b.includes('สัก'), b)
    const v = S.c.validateThaiVocabulary ? S.c.validateThaiVocabulary('ผมมีบัตรสมาชิกครับ', new Set(['ผม', 'มี', 'บัตร', 'ครับ']), S.vocab) : null
    const diag = JSON.stringify(v || {})
    T('K3', 'no whitelisting of fragments: the segmentation lexicon authorises nothing — untaught สมาชิก is still reported (whole), not allowed',
      !!v && /สมาชิก/.test(diag) && !/"สมา"|"ชิก"/.test(diag) && (v.ok === false || v.valid === false || (v.blocked || v.unknown || v.untaught || []).length > 0), diag.slice(0, 400))
    const tk = seg('โหตั้งสามคันเลยครับ')
    const cat = tk.map((x, k) => S.c.thaiSupportLanguageCategory(tk, k, { vocab: S.vocab, sceneEntities: [] }))
    T('K4', '§7 support language: โห = DISCOURSE_BUILDING_BLOCK · คัน after a number = CLASSIFIER_BUILDING_BLOCK · an untaught content word = UNAUTHORISED (only explicit categories pass)',
      cat[tk.indexOf('โห')] === 'DISCOURSE_BUILDING_BLOCK' && cat[tk.indexOf('คัน')] === 'CLASSIFIER_BUILDING_BLOCK' && S.c.ev('THAI_SUPPORT_CATEGORIES').length === 7 &&
      S.c.thaiSupportLanguageCategory(['สมาชิก'], 0, { vocab: [] }) === 'UNAUTHORISED', tk.map((x, k) => x + ':' + cat[k]))
    const ents = S.c.extractSceneEntities({ characterA: 'Somchai, a Thai man', characterB: 'Nida, a Thai woman', opening: 'สวัสดีครับคุณนิดา', reply: 'สวัสดีค่ะคุณสมชาย' }, 'th', S.vocab).map(e => e.surface)
    T('K5', 'SCENE_PROPER_NAME is the whole name (สมชาย), never the fragment สม', ents.includes('สมชาย') && !ents.includes('สม'), ents)
  }
  // ══ §9 — SCENE PLANNING ════════════════════════════════════════════════════════════════
  {
    const S = setup('th')
    const tg = S.targets
    const log = []
    const fp = S.c.finaliseScenePlan([{ purpose: 'at the market', targetIds: tg.slice(0, 12).map(t => t.id) }, { purpose: 'back home', targetIds: tg.slice(12, 20).map(t => t.id) }], tg, { log: m => log.push(m), lang: 'th', contract: { premise: 'two friends shopping' } })
    const placed = fp.scenes.flatMap(s => s.targetIds)
    const lastBefore = tg.slice(12, 20).map(t => t.id)
    T('P1', '"unplaced → last scene" is gone: 10 unplaced targets are re-clustered or get their own mini-scene; the last planned scene keeps only its own targets; every target placed once',
      placed.length === 30 && new Set(placed).size === 30 && !fp.scenes.some(s => s.targetIds.length > 10) && fp.audit.unplaced === 10 && (fp.audit.reclustered + fp.scenes.length > 2) &&
      !log.some(l => /unplaced → last scene/.test(l)) && fp.scenes.find(s => s.purpose === 'back home').targetIds.every(id => lastBefore.includes(id) || fp.audit.reclustered),
      { scenes: fp.scenes.map(s => s.purpose + '[' + s.targetIds.length + ']'), audit: fp.audit })
    T('P2', 'SCENE_ID / SCENE_PURPOSE / TARGET_IDS / TARGET_ROLES exported for every scene (log + plan)',
      fp.scenes.every(s => /^S\d+$/.test(s.sceneId) && s.purpose && s.targetIds.length && s.targetIds.every(id => typeof s.targetRoles[id] === 'string')) &&
      log.filter(l => /SCENE_ID=S\d+ SCENE_PURPOSE=".*" TARGET_IDS=[\d,]+ TARGET_ROLES=/.test(l)).length === fp.scenes.length, log.slice(-3))
    const big = S.c.finaliseScenePlan([{ purpose: 'everything', targetIds: tg.map(t => t.id) }], tg, { lang: 'th' })
    T('P3', 'an oversized mixed-domain scene (30 targets) is split into coherent mini-scenes by semantic domain', big.scenes.length > 1 && big.audit.splitScenes === 1, big.scenes.map(s => s.purpose + '[' + s.targetIds.length + ']'))
    // the model planner forgets 4 ids ⇒ no dumping into the last scene
    mock(S, 'th')
    const seen = wrap(S, (q, r) => /Plan a language lesson conversation/.test(q) ? JSON.stringify({ scenes: [{ purpose: 'shopping', targetIds: tg.slice(0, 13).map(t => t.id) }, { purpose: 'dinner', targetIds: tg.slice(13, 26).map(t => t.id) }] }) : r)
    const lg2 = []
    const plan = await S.c.planTargetScenes(tg, { premise: 'two friends' }, { apiKey: 'k', model: 'gemini-2.5-flash-lite', lang: 'th', onLog: m => lg2.push(m) })
    T('P4', 'model plan with 4 unplaced ids ⇒ SCENE_PLAN_RECLUSTER / SCENE_PLAN_ADDED_MINI_SCENE, never appended to the last scene',
      plan.scenes.flatMap(s => s.targetIds).length === 30 && lg2.some(l => /SCENE_PLAN_RECLUSTER|SCENE_PLAN_ADDED_MINI_SCENE/.test(l)) && !lg2.some(l => /last scene/.test(l)) && plan.scenes.every(s => s.sceneId),
      lg2.filter(l => /SCENE_PLAN/.test(l)).slice(0, 5))
  }
  // ══ §10/§11 — MAIN COHERENCE IS A READY INVARIANT ══════════════════════════════════════
  for (const lang of ['th', 'ja']) {
    {
      const S = setup(lang); const st = mock(S, lang, { incoherentMain: { fixAfter: 99 } })
      const track = { ...makeTrack(S, lang, { tag: '-coh1' }), scenePlan: planValidFirst(S) }
      const { t, log } = await fin(S, lang, track)
      const mc = t.integrity.mainCoherence
      T('M1' + lang, '[' + lang + '] Main coherence 1/5 ⇒ MAIN_TRACK_COHERENCE_REPAIR for the failing scene only ⇒ still failing ⇒ NOT_READY (never "TRACK INTEGRITY READY" after 1/5)',
        t.integrity.status === 'NOT_READY' && t.integrity.reasons.some(r => /^MAIN_TRACK_COHERENCE=FAIL/.test(r)) && log.some(l => /MAIN_TRACK_COHERENCE_REPAIR S1 /.test(l)) &&
        !log.some(l => /MAIN_TRACK_COHERENCE_REPAIR S[23] /.test(l)) && !log.some(l => /TRACK INTEGRITY \(\w+\): READY/.test(l)) && mc.overall === 1,
        { st: t.integrity.status, reasons: t.integrity.reasons, mc: mc && { overall: mc.overall, repair: mc.repair }, log: log.filter(l => /COHERENCE/.test(l)).slice(0, 4) })
    }
    {
      const S = setup(lang); mock(S, lang, { incoherentMain: { fixAfter: 1 } })
      const track = { ...makeTrack(S, lang, { tag: '-coh2' }), scenePlan: planValidFirst(S) }
      const before = track.pairs.map(p => txt(lang, p))
      const { t, log } = await fin(S, lang, track)
      const mc = t.integrity.mainCoherence
      const changed = t.pairs.filter(p => p && p.sourceStage === 'coherence-repair')
      const s1 = new Set(planValidFirst(S).scenes[0].targetIds)
      T('M2' + lang, '[' + lang + '] scene repair rewrites ONLY the off-topic lines of the failing scene (through recovery QC) ⇒ re-audit PASS ⇒ READY · 90/90 kept',
        t.integrity.status === 'READY' && mc.passed && mc.before && mc.before.overall === 1 && mc.repair.replaced >= 1 && changed.length === mc.repair.replaced &&
        changed.every(p => s1.has(p.targetId)) && t.integrity.counts.targetPairs === 90 && t.integrity.costGuard.MAIN_COHERENCE_REPAIR_CALLS >= 1,
        { st: t.integrity.status, reasons: t.integrity.reasons, mc: mc && { passed: mc.passed, before: mc.before, repair: mc.repair }, changed: changed.map(p => p.targetId) })
      const L = S.c.trackIntegrityLines(t).join('\n')
      T('M3' + lang, '[' + lang + '] §29 labels: MAIN_TRACK line reports status + COHERENCE PASS with the before-repair score and repair cost',
        /MAIN_TRACK: READY · TARGET PAIRS 90\/90 · COHERENCE PASS overall \d\/5 .*before repair 1\/5 · repair \d+ line\(s\) \/ \d+ call\(s\)/.test(L), L.slice(0, 500))
    }
  }
  // ══ §12 — NEW COUNT ═══════════════════════════════════════════════════════════════════
  {
    const S = setup('ja')
    const jv = S.c.initJapaneseVocab()
    const newW = jv.filter(w => w.status === 'new').slice(0, 5).map(w => w.id)
    T('N1', 'newWordsPerTrack(ja, daily) = 3 · japaneseSlotsFor = 3 · revision = 0 · Thai Daily keeps its belt allowance (5)',
      S.c.newWordsPerTrack('ja', 'daily', jv) === 3 && S.c.japaneseSlotsFor(jv) === 3 && S.c.newWordsPerTrack('ja', 'revision', jv) === 0 && S.c.newWordsPerTrack('th', 'daily', S.c.initVocab()) === 5)
    T('N2', '5 slots saved under the old allowance ⇒ still exactly 3 NEW selected', S.c.japaneseSelectNewSlots(jv, newW).length === 3 && S.c.japaneseSelectNewSlots(jv, []).length === 3)
    // §31 — 30 selected: 3 NEW, 27 REVIEW, with the response-token / question / content mix
    const mixW = ['はい', 'うん', 'いいえ', '好き', 'また', '今日', '食べる', '何', '飲む', '一緒'].map(j => S.vocab.find(w => w.japanese === j))
    const roles = Object.fromEntries(mixW.map(w => [w.japanese, S.c.targetConversationRole(w, 'ja')]))
    T('N3', '§31 target roles: はい / うん / いいえ = RESPONSE_TOKEN · 何 = QUESTION_WORD · 好き 食べる 飲む 今日 = CONTENT',
      ['はい', 'うん', 'いいえ'].every(j => roles[j] === 'RESPONSE_TOKEN') && roles['何'] === 'QUESTION_WORD' && ['好き', '食べる', '飲む', '今日'].every(j => roles[j] === 'CONTENT'), roles)
    const tc = S.c.jaGeneratorTrackContext(S.targets.map((t, i) => ({ ...t, selectionRole: i < 3 ? 'new' : 'reinforce' })), { counts: { new: 3 } }, 'daily', 'natural')
    const trk = { ...makeTrack(S, 'ja', { tag: '-n31', newIds: S.targets.slice(0, 3).map(t => t.id) }), trackContext: tc, pipelineVersion: 'v651-canonical' }
    const req = S.c.listeningRequiredTargetIds(trk)
    T('N4', '§31 30 selected · 3 NEW · 27 REVIEW (frozen selectedNewTargetIds) ⇒ v656 Listening requires ALL 30 (3 NEW + 27 REVIEW)', tc.selectedNewTargetIds.length === 3 && tc.expectedNewCount === 3 && req.requiredIds.length === 30 && req.newIds.length === 3 && req.reviewIds.length === 27, { newIds: req.newIds, req: req.requiredIds.length })
  }
  // ══ §9 (JA) — scene plan in the Japanese generator: prompt + assembly by scene ══════════
  {
    const S = setup('ja')
    const t0 = { ...S.targets[0], _scenePurpose: 'ordering lunch' }
    const inv = S.c.japaneseLearnerInventory(S.vocab, S.targets)
    const pr = S.c.buildJapaneseGroupPrompt(t0, [{ recallIndex: 1 }, { recallIndex: 2 }, { recallIndex: 3 }], inv, S.vocab, 'natural', { initial: true, scenePremise: 'two friends at a cafe' })
    T('J1', 'Japanese target-group prompt carries the lesson theme and THIS SCENE (scene purpose)', /LESSON THEME \(broad\): two friends at a cafe/.test(pr.user) && /THIS SCENE: ordering lunch/.test(pr.user))
    const tg = S.targets.slice(0, 6)
    const per = tg.map(t => [1, 2, 3].map(r => ({ targetId: t.id, recallIndex: r, speaker: 'A', japanese: t.japanese + r })))
    const plan = { scenes: [{ sceneId: 'S1', purpose: 'cafe', targetIds: [tg[0].id, tg[2].id, tg[4].id] }, { sceneId: 'S2', purpose: 'station', targetIds: [tg[1].id, tg[3].id, tg[5].id] }] }
    const rec = S.c.assembleRecallsByScene(per, tg, plan, { alternateSpeakers: true })
    const s1 = rec.slice(0, 9), s2 = rec.slice(9)
    T('J2', 'Japanese recalls are assembled scene by scene (rounds interleaved inside a scene), stamped with sceneId, and alternate A/B (no single-speaker Main Track)',
      rec.length === 18 && s1.every(p => p.sceneId === 'S1') && s2.every(p => p.sceneId === 'S2') && s1[0].recallIndex === 1 && s1[3].recallIndex === 2 &&
      Math.abs(rec.filter(p => p.speaker === 'A').length - rec.filter(p => p.speaker === 'B').length) <= 2 && [s1, s2].every(x => x.every((p, k) => k === 0 || p.speaker !== x[k - 1].speaker)), rec.map(p => p.sceneId + ':' + p.targetId + '/' + p.recallIndex + ':' + p.speaker))
  }
  // ══ §26 — CONTEXTUAL_OPENING_REPAIR ══════════════════════════════════════════════════
  {
    const S = setup('ja'); mock(S, 'ja')
    const inv = S.c.japaneseLearnerInventory(S.vocab, S.targets)
    const basic = (inv.conversationBasics || [])[0]
    const good = basic ? basic.form : 'こんにちは。'
    const seen = wrap(S, (q, r) => /Rewrite these Japanese conversation-framing lines/.test(q) ? JSON.stringify({ lines: [{ key: 'opening', japanese: good, reading: good, romaji: 'x', english: 'Hello.' }, { key: 'reply', japanese: '元気やあ。', english: 'Hey' }] }) : r)
    const scene = { scene: 'two friends meet at a cafe', opening: 'やあ、元気？', reply: '元気だよ。' }
    const bad = ['opening', 'reply'].map(k => ({ k, chk: S.c.japaneseCheckLine(scene[k], inv) }))
    const fixed = await S.c.jaContextualOpeningRepair(scene, bad.filter(b => !b.chk.ok), inv, { apiKey: 'k', model: 'gemini-2.5-flash-lite', registerId: 'natural', entities: [] })
    T('O1', 'an opening with untaught words is REWRITTEN in context (one batched call), the rewrite passes the closed-vocabulary gate; a rewrite that is still untaught is not accepted',
      bad.some(b => !b.chk.ok) && fixed.opening && fixed.opening.japanese === good && !fixed.reply && seen.filter(x => /Rewrite these Japanese conversation-framing/.test(x.q)).length === 1,
      { bad: bad.map(b => b.k + ':' + b.chk.ok), fixed })
  }
  // ══ §14–25 / §32 — LISTENING STRUCTURE A–E ═══════════════════════════════════════════
  const listenOf = async (lang, o = {}) => {
    const S = setup(lang); const st = mock(S, lang, o.mock || {})
    const newIds = S.targets.slice(0, 3).map(t => t.id)
    const { t } = await fin(S, lang, { ...makeTrack(S, lang, { tag: '-ln' + (o.tag || ''), newIds }), scenePlan: planOf(S), sceneContract: { premise: 'two friends spend a day in town', characters: [{ speaker: 'A', name: 'Ken', role: 'friend' }, { speaker: 'B', name: 'Aya', role: 'friend' }], allowedSceneEntities: [] } })
    if (o.prep) o.prep(S, t)
    const seen = wrap(S, o.post || null)
    const lg = []
    const r = await S.c.buildAndPersistListening(t, S.vocab, { lang, apiKey: 'k', model: 'gemini-2.5-flash-lite', onLog: m => lg.push(m) })
    return { S, t, r, lt: r.listeningTrack || {}, b: r.listeningBuild || {}, lg, seen, st }
  }
  // v656 — the anchor composer these checks targeted (scene re-voicing, anchor rows, NEEDS_COMPOSED_USAGE) is
  // retired. The same §32 A–E properties are asserted against the fresh-conversation builder instead.
  // v668 §53/§74 — the whole-conversation composer is retired too: every Listening conversation is written scene by
  // scene (closed-world transactions). The same §32 properties are asserted against that one flow.
  const isCompose = q => /Write SCENE LS\d+ .* LISTENING conversation/.test(q)
  const isRepair = q => /ATOMIC REPAIR of .* LISTENING lines|REPAIR SCENE \S+ of a .* LISTENING conversation/.test(q)
  {
    // A — fragmentation: one line per scene ⇒ NO_SINGLETON_SCENES FAIL ⇒ a local repair (merge_scenes) is asked for;
    // when the repair does nothing the track is NOT_READY ("Listening track needs repair"), never READY
    // v673: a 1-line candidate is a PHASE-class failure — it is regenerated from the frozen plan (no scene-repair call); the
    // model that obeys the regeneration ⇒ READY · the model that never does ⇒ NOT_READY (never committed as one line)
    const fixed = await listenOf('ja', { mock: { ln: { singletons: 'once' } }, tag: 'A1' })
    const stuck = await listenOf('ja', { mock: { ln: { singletons: true, noRepair: true } }, tag: 'A2' })
    T('LA', '§32 A (v668) — a 1-line scene candidate ⇒ fundamentally invalid ⇒ REGENERATED before commit (same targets / palette, stronger constraints) ⇒ READY; a repair that changes nothing ⇒ NOT_READY, PARTIAL, "Listening track needs repair"',
      fixed.seen.some(x => isCompose(x.q) && /WAS REJECTED BEFORE COMMIT/.test(x.q)) && fixed.lt.readiness === 'READY' && fixed.lt.dialogueStats.singleLineScenes === 0 &&
      stuck.lt.readiness === 'NOT_READY' && stuck.lt.gates.NO_SINGLETON_SCENES === false && stuck.b.status === 'PARTIAL' && stuck.lt.uiMessage === 'Listening track needs repair' &&
      (stuck.lt.telemetry.LISTENING_REPAIR_CALLS >= 1 || stuck.lt.telemetry.LISTENING_SCENE_REGENERATIONS >= 1),
      { fixed: fixed.lt.listeningQuality, fixedRegen: fixed.seen.some(x => isCompose(x.q) && /WAS REJECTED BEFORE COMMIT/.test(x.q)), fixedSingle: fixed.lt.dialogueStats && fixed.lt.dialogueStats.singleLineScenes, stuck: stuck.lt.listeningQuality, stuckB: stuck.b.status, ui: stuck.lt.uiMessage, rc: stuck.lt.telemetry && stuck.lt.telemetry.LISTENING_REPAIR_CALLS })
  }
  {
    // B — speakers: a composer that gives every turn to A ⇒ ONE_SPEAKER ⇒ HARD FAIL (NOT_READY)
    const { lt, b } = await listenOf('ja', { mock: { ln: { oneSpeaker: true } }, tag: 'B' })
    // v669 §17: every one-speaker candidate is INVALID — none is committed (never re-voiced), so nothing is playable
    T('LB', '§32 B (v656) — every turn by speaker A ⇒ ONE_SPEAKER HARD FAIL ⇒ (v669) no candidate is committed ⇒ never READY (build not READY, reason UNCOMMITTED_SCENE); it is never re-voiced into a fake dialogue',
      b.status !== 'READY' && !(lt.lines || []).length && /UNCOMMITTED_SCENE/.test(b.failureReason || '') && /STRUCTURE every turn is speaker|structure/.test(b.failureReason || ''),
      { st: b.status, why: b.failureReason })
    const ok = await listenOf('ja', { tag: 'B2' })
    const ls = ok.lt.lines || []
    T('LB2', '§23 every turn persists lineId · sceneId · speakerId · speakerRole · voice · turnIndex · text · translation · pronunciation · coveredTargetIds (speakerRole from the sceneContract)',
      ls.length > 0 && ls.every(l => l.lineId && (l.speakerId === 'A' || l.speakerId === 'B') && l.speakerRole && (l.voice === 'a' || l.voice === 'b') && Number.isInteger(l.turnIndex) && /^LS?\d+$/.test(l.sceneId) &&
        l.japanese && l.translation && l.reading && l.romaji && Array.isArray(l.coveredTargetIds)) &&
      ls.some(l => /Ken/.test(l.speakerRole)) && ls.some(l => /Aya/.test(l.speakerRole)), ls.slice(0, 2))
  }
  {
    // C — duplicates: the composer repeats a line ⇒ EXACT_DUPLICATE ⇒ the repair deletes it ⇒ no duplicate survives
    const { lt, seen } = await listenOf('ja', { mock: { ln: { dup: true } }, tag: 'C' })
    const content = (lt.lines || []).filter(l => !l.intentionalRepetition).map(l => String(l.japanese).replace(/\s+/g, ''))
    T('LC', '§32 C (v656) — a repeated sentence is flagged (EXACT_DUPLICATE) and removed by local repair; no duplicate content line survives; READY',
      // v674: a candidate with a duplicate may also be REGENERATED (never committed) when it breaks the phase budget first
      content.length > 20 && new Set(content).size === content.length && (seen.some(x => isRepair(x.q) && /EXACT_DUPLICATE/.test(x.q)) || seen.filter(x => isCompose(x.q)).length > (lt.scenes || []).length) && lt.readiness === 'READY',
      { dups: content.length - new Set(content).size, q: lt.listeningQuality })
  }
  {
    // D — response tokens (はい / うん / いいえ): role RESPONSE_TOKEN ⇒ the composer is asked to use them as REPLIES; coverage is counted from the final lines
    const S2 = setup('ja')
    const resp = ['はい', 'うん', 'いいえ'].map(j => S2.vocab.find(w => w.japanese === j))
    const S = setup('ja'); mock(S, 'ja')
    S.targets = S.targets.slice(0, 27).concat(resp.map(w => S.vocab.find(v => v.id === w.id)))
    const tr = { ...makeTrack(S, 'ja', { tag: '-lnD2', newIds: S.targets.slice(0, 3).map(t => t.id) }), scenePlan: planOf(S) }
    const { t } = await fin(S, 'ja', tr)
    const seen2 = wrap(S)
    const R = await S.c.buildListeningConversation(t, S.vocab, { lang: 'ja', apiKey: 'k', model: 'gemini-2.5-flash-lite' })
    const L = R.listeningTrack || {}
    const composeQ = seen2.filter(x => isCompose(x.q)).map(x => x.q).join('\n')
    const covered = (L.coverage || {}).coveredTargetIds || []
    T('LD', '§21/§22 (v656) response tokens はい / うん / いいえ ⇒ role RESPONSE_TOKEN ⇒ allocated as REPLY turns in the composer prompt ⇒ covered, counted from the final lines',
      resp.every(w => new RegExp('^T' + w.id + ' \\| ' + w.japanese + '( \\[[^\\]]*\\])? \\| .* \\| RESPONSE_TOKEN', 'm').test(composeQ)) && resp.every(w => new RegExp('B (ANSWER|RESPONSE)(\\([^)]*\\))? \\(to \\d+\\) — uses [^·]*' + w.japanese).test(composeQ) || new RegExp('T\\d+ [AB] (ANSWER|RESPONSE|ACKNOWLEDGEMENT|REACTION) — [^\\n]*\\(using [^)]*' + w.japanese).test(composeQ)) &&   // v668: the intent skeleton plans them as ANSWERS
      /Response words .* REPLIES/.test(composeQ) && resp.every(w => covered.includes(w.id)) &&
      resp.every(w => (L.lines || []).some(l => l.coveredTargetIds.includes(w.id) && String(l.japanese).includes(w.japanese))),
      { covered: resp.map(w => covered.includes(w.id)), rows: composeQ.split('\n').filter(l => /RESPONSE_TOKEN/.test(l)).slice(0, 3) })
  }
  {
    // E — whole-conversation coherence is a HARD gate: FAIL ⇒ NOT_READY; lines are never split into standalone 1-line scenes
    const { lt, b } = await listenOf('th', { mock: { cohFail: true }, tag: 'E' })
    const sizes = [...new Set((lt.lines || []).map(l => l.scene))].map(s => lt.lines.filter(l => l.scene === s).length)
    T('LE', '§32 E (v656) — coherence FAIL ⇒ WHOLE_CONVERSATION_COHERENCE=FAIL ⇒ NOT_READY / PARTIAL, "Listening track needs repair"; no 1-line scenes',
      // v674: the same judge gates every phase BEFORE commit — failing everything stops the composition (FAILED, nothing playable)
      ((lt.gates && lt.gates.WHOLE_CONVERSATION_COHERENCE === 'FAIL' && lt.coherenceAudit.passed === false && lt.readiness === 'NOT_READY' && b.status === 'PARTIAL' && lt.uiMessage === 'Listening track needs repair') ||
        (/^(FAILED|NOT_READY|PARTIAL)$/.test(b.status || '') && !(lt.lines || []).length)) && sizes.every(n => n >= 2),
      { q: lt.listeningQuality, sizes, st: b.status })
  }
  {
    // healthy build: telemetry and the inherited lesson context
    const { lt, b, seen } = await listenOf('ja', { tag: 'F' })
    const tel = lt.telemetry || {}
    const composeQ = seen.filter(x => isCompose(x.q)).map(x => x.q).join('\n')   // v668: one prompt per scene
    T('LF', '§25 (v656) telemetry: LISTENING_GENERATION_CALLS=1 · REPAIR=0 · QC ≥ 1 · TOTAL_PAID = sum; healthy run READY 30/30',
      tel.LISTENING_GENERATION_CALLS === tel.LISTENING_SCENE_GENERATION_CALLS && tel.LISTENING_GENERATION_CALLS === (lt.scenes || []).length && tel.LISTENING_REPAIR_CALLS === 0 && tel.LISTENING_QC_CALLS >= 1 &&
      tel.LISTENING_TOTAL_PAID_CALLS === tel.LISTENING_GENERATION_CALLS + tel.LISTENING_REPAIR_CALLS + tel.LISTENING_QC_CALLS &&
      b.status === 'READY' && lt.readiness === 'READY' && b.coveredTargetCount === 30 && b.requiredTargetCount === 30, { tel, st: b.status, q: lt.listeningQuality })
    T('LG', '§14 (v656) Listening inherits ONLY the lesson context: premise, speakers (Ken / Aya), register, all 30 target ids, allocation by the Main scene-plan topics — and no Main Track sentence is handed over as an anchor',
      /^WHOLE CONVERSATION: two friends spend a day in town/m.test(composeQ) && /SPEAKERS: A = Ken \(friend\) · B = Aya \(friend\)/.test(composeQ) && /^REGISTER: /m.test(composeQ) && (composeQ.match(/^T\d+ \| /gm) || []).length === 30 &&
      !/anchor/i.test(composeQ) && lt.sceneGroups.length >= 1 && lt.sceneGroups.length * 3 <= lt.lines.length, { scenes: lt.sceneGroups && lt.sceneGroups.length, lines: lt.lines && lt.lines.length, head: composeQ.slice(0, 300) })
  }
  // ══ §29 — REPORTING LABELS (Thai QC export) ══════════════════════════════════════════
  {
    const S = setup('th'); mock(S, 'th', { incoherentMain: { fixAfter: 99 } })
    const { t } = await fin(S, 'th', { ...makeTrack(S, 'th', { tag: '-lab' }), scenePlan: planOf(S) })
    const L = S.c.trackIntegrityLines(t).join('\n'), X = S.c.trackIntegrityExportLines(t).join('\n')
    T('RP', '§29 a Main Track at coherence 1/5 reports MAIN_TRACK: NOT_READY · COHERENCE FAIL (never READY), and the export names MAIN TRACK COHERENCE FAIL',
      /MAIN_TRACK: NOT_READY/.test(L) && /COHERENCE FAIL overall 1\/5/.test(L) && /MAIN TRACK COHERENCE: FAIL/.test(X) && /MAIN_TRACK_COHERENCE=FAIL/.test(X), L.slice(0, 400))
  }
  console.log(out.join('\n'))
  console.log('v654 shared lesson quality repair regression: ' + passes + '/' + (passes + fails) + (fails ? ' — ' + fails + ' FAILED' : ' — ALL PASS'))
  process.exitCode = fails ? 1 : 0
}
main().catch(e => { console.error(e); process.exitCode = 1 })
