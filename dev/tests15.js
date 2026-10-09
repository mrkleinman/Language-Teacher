// v650 — CUMULATIVE REPAIR: the §13 regression matrix. The app's real functions run in the
// node harness; Gemini is simulated at the transport boundary (tests14 mock + targeted overrides).
// Usage: node tests15.js [th,ja,zh]
const { load } = require('./harness')
const { setup, sentence, makeTrack, mock, FR, kwOf, txt } = require('./tests14')
const out = []; let fails = 0; const results = {}
const T = (lang, id, name, pass, detail) => {
  if (!pass) fails++
  results[lang] = results[lang] || { pass: 0, fail: 0 }; results[lang][pass ? 'pass' : 'fail']++
  out.push((pass ? 'PASS ' : 'FAIL ') + lang.toUpperCase() + ' ' + id.padEnd(4) + name + (detail !== undefined && !pass ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 900) : ''))
}
const LANG = process.argv[2] ? process.argv[2].split(',') : ['th', 'ja', 'zh']
const ADAPTER = (S, lang) => S.c.ev('TRACK_ADAPTERS')[lang]
const fin = async (S, lang, track, extra = {}, adapterOverride) => {
  const log = []
  const t = await S.c.finaliseMainTrack(track, adapterOverride || ADAPTER(S, lang), { vocab: S.vocab, apiKey: 'k', model: 'gemini-2.5-flash-lite', qcRan: true, onLog: m => log.push(m), ...extra })
  return { t, log }
}
const NOREC = (S, lang) => ({ ...ADAPTER(S, lang), recoverTargetPairs: async () => ({ accepted: [], reasons: ['recovery unavailable in this test'] }) })
// 4 framing lines (2 greetings + 2 more), as in the live 86 + 4 = 90 case
const with4Framing = track => { const f = track.pairs.filter(p => p && (p.pairType === 'framing' || p._framing)); track.pairs.push(...f.map((p, k) => ({ ...p, _pairKey: 'fx' + k }))); return track }
const flashCalls = c => (c.__geminiMockCalls || []).filter(x => /gemini-2\.5-flash(?!-lite)/.test(String(x.model || ''))).length

async function shared(lang) {
  // ── R1 / R2: 86 + 4 = 90 playable ⇒ NOT_READY; 90 + 4 ⇒ READY (the ONE readiness object) ──
  {
    const S = setup(lang); mock(S, lang, { noRecovery: true })
    const counts = {}; S.targets.slice(0, 4).forEach(t => { counts[t.id] = 2 })
    const { t } = await fin(S, lang, with4Framing(makeTrack(S, lang, { counts, tag: '-r86' })), {}, NOREC(S, lang))
    const rd = S.c.trackReadiness(t), h = S.c.trackReadyHeadline(t)
    T(lang, 'R1', '86 TARGET PAIRS + 4 framing = 90 playable ⇒ NOT_READY; headline never "ready"; unresolved targets exposed',
      rd.validTargetPairs === 86 && rd.playableLines === 90 && rd.framingLines === 4 && rd.mainTrackState === 'NOT_READY' && !rd.ready && !S.c.listeningAllowed(t) &&
      h.state === 'NOT_READY' && h.text === 'Track not ready (86/90)' && !/Track ready/i.test(h.text) && rd.unresolvedTargetIds.length === 4 &&
      t.integrity.invariants.EVERY_TARGET_3_OF_3 === false && rd.reasons.some(r => /TARGET_PAIR_QUOTA=86\/90/.test(r)) && S.c.trackReadinessExportLines(t)[0].includes('every target 3/3: NO'),
      { valid: rd.validTargetPairs, playable: rd.playableLines, state: rd.mainTrackState, h, unresolved: rd.unresolvedTargetIds, reasons: rd.reasons })
    const S2 = setup(lang); mock(S2, lang)
    const { t: t2 } = await fin(S2, lang, with4Framing(makeTrack(S2, lang, { tag: '-r90' })))
    const rd2 = S2.c.trackReadiness(t2)
    T(lang, 'R2', '90 TARGET PAIRS + 4 framing ⇒ READY; headline "Track ready"', rd2.ready && rd2.validTargetPairs === 90 && rd2.playableLines === 94 && S2.c.trackReadyHeadline(t2).text === 'Track ready',
      { valid: rd2.validTargetPairs, playable: rd2.playableLines, reasons: rd2.reasons })
    // R3 — every UI surface reads the SAME object: a finalised NOT_READY track can never render "Track Ready"
    T(lang, 'R3', 'headline states: no track / finalising ⇒ CHECKING; stale ⇒ not ready', S.c.trackReadyHeadline(null).state === 'CHECKING' &&
      S.c.trackReadyHeadline(t2, { finalising: true }).state === 'CHECKING' &&
      S.c.trackReadyHeadline({ ...t2, pairs: t2.pairs.slice(0, -1) }).state !== 'READY', S.c.trackReadyHeadline({ ...t2, pairs: t2.pairs.slice(0, -1) }))

    // ── L1: Main 86/90 ⇒ Listening BLOCKED_MAIN_NOT_READY, nothing persisted ──
    const lg = []
    const r = await S.c.buildAndPersistListening(t, S.vocab, { lang, apiKey: 'k', model: 'gemini-2.5-flash-lite', onLog: m => lg.push(m) })
    const saved = await S.c.listeningVersionsFor(lang, S.c.listeningTrackId(t))
    T(lang, 'L1', 'Main 86/90 ⇒ Listening BLOCKED_MAIN_NOT_READY, no Listening build or version persisted',
      r.listeningBuild && r.listeningBuild.status === 'BLOCKED_MAIN_NOT_READY' && !r.listeningTrack && (saved || []).length === 0 && lg.some(l => /LISTENING_BUILD_BLOCKED/.test(l)),
      { st: r.listeningBuild && r.listeningBuild.status, saved: (saved || []).length, lg: lg.slice(0, 3) })
  }
  // ── L2 (v656): 30 selected / 5 NEW ⇒ TARGET COVERAGE 30/30, multi-turn, coherence PASS ⇒ READY; 0 Flash ──
  {
    const S = setup(lang); mock(S, lang)
    const newIds = S.targets.slice(25).map(t => t.id)
    const { t } = await fin(S, lang, makeTrack(S, lang, { tag: '-l25', newIds }))
    const lg = []
    const r = await S.c.buildAndPersistListening(t, S.vocab, { lang, apiKey: 'k', model: 'gemini-2.5-flash-lite', onLog: m => lg.push(m) })
    const b = r.listeningBuild || {}, lt = r.listeningTrack || {}
    const ds = lt.dialogueStats || {}
    const saved = await S.c.listeningVersionsFor(lang, S.c.listeningTrackId(t))
    T(lang, 'L2', '30 selected / 5 NEW ⇒ TARGET COVERAGE 30/30 · multi-turn (no one-line scenes, both speakers) · coherence PASS ⇒ READY and persisted',
      t.integrity.status === 'READY' && b.status === 'READY' && b.requiredTargetCount === 30 && b.coveredTargetCount === 30 && lt.readiness === 'READY' && ds.singleLineScenes === 0 &&
      ds.speakers && ds.speakers.A > 0 && ds.speakers.B > 0 && !lt.compositionFailure && lt.coherenceAudit && lt.coherenceAudit.passed && (saved || []).length === 1,
      { main: t.integrity.status, st: b.status, req: b.requiredTargetCount, cov: b.coveredTargetCount, ds, q: lt.listeningQuality, reason: b.failureReason, saved: (saved || []).length })
    T(lang, 'F0', 'normal mode: 0 gemini-2.5-flash requests across Main finalise + Listening (Flash-Lite only)', flashCalls(S.c) === 0 && S.c.__geminiMockCalls.length > 0,
      { flash: flashCalls(S.c), models: [...new Set(S.c.__geminiMockCalls.map(x => x.model))] })
  }
  // ── L3 (v656): one line per scene ⇒ NO_SINGLETON_SCENES FAIL ⇒ NOT_READY (never READY) ──
  {
    const S = setup(lang); mock(S, lang, { ln: { singletons: true, noRepair: true } })
    const { t } = await fin(S, lang, makeTrack(S, lang, { tag: '-l1', newIds: S.targets.slice(25).map(t => t.id) }))
    const r = await S.c.buildAndPersistListening(t, S.vocab, { lang, apiKey: 'k', model: 'gemini-2.5-flash-lite' })
    const b = r.listeningBuild || {}, lt = r.listeningTrack || {}
    T(lang, 'L3', 'a composer that returns one line per scene ⇒ compositionFailure ⇒ PARTIAL, never READY',
      b.status !== 'READY' && lt.readiness === 'NOT_READY' && lt.compositionFailure === true && lt.gates && lt.gates.NO_SINGLETON_SCENES === false && /NO_SINGLETON_SCENES=FAIL/.test(String(lt.listeningQuality)),
      { st: b.status, q: lt.listeningQuality, ds: lt.dialogueStats })
  }
  // ── G1: generic recovery state — a construction failing twice changes strategy; prompt excludes it ──
  {
    const S = setup(lang); const kw = kwOf(lang, S.targets[0], false)
    const st = S.c.createRecoveryState(kw, { sense: 'money' })
    const bad = lang === 'th' ? 'ผมมี' + S.targets[0].thai + 'เรื่องครับ' : lang === 'ja' ? S.targets[0].japanese + 'の話だよ。' : '我的' + S.targets[0].chinese + '故事。'
    const a = S.c.recordRecoveryFailure(st, { code: 'CLOSED_VOCABULARY', text: bad, tokens: ['X1'] })
    const b = S.c.recordRecoveryFailure(st, { code: 'CLOSED_VOCABULARY', text: bad, tokens: ['X1'] })
    const p = S.c.recoveryStrategyPromptLines(st, {})
    T(lang, 'G1', 'recovery state: same token + construction fail twice ⇒ RECOVERY_STRATEGY_CHANGE; next prompt forbids the token and the failed sentence',
      !a.strategyChange && b.strategyChange && st.strategyIndex === 1 && p.includes('DO NOT USE') && p.includes('X1') && p.includes(bad) && /RECOVERY_STRATEGY_CHANGE 1: CHANGE THE LEXICAL CONSTRUCTION/.test(p),
      { a, b, p })
  }
  // ── D1: dedupe telemetry — identical prompt deduplicated; intentionally different prompts both sent ──
  {
    const KEY = 'AIzaSyTEST-harness-key-000000'
    const c = load('tt.compiled.js'); const fetches = []
    c.fetch = async (url, o) => { fetches.push(1); return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: '[{"i":1,"s":5,"note":"ok"}]' }] } }], usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 } }) } }
    const run = c.aiBeginRun(lang + '-dedupe')
    const one = lang === 'th' ? [{ thai: 'ผมชอบกินข้าวครับ', english: 'I like eating rice.', prompt: 'He says he likes eating rice' }] : lang === 'ja' ? [{ japanese: '食べるね。', english: 'I eat.' }] : [{ chinese: '我吃饭。', english: 'I eat.' }]
    const two = lang === 'th' ? [{ thai: 'ผมชอบดื่มน้ำครับ', english: 'I like drinking water.', prompt: 'He says he likes drinking water' }] : lang === 'ja' ? [{ japanese: '飲むね。', english: 'I drink.' }] : [{ chinese: '我喝水。', english: 'I drink water.' }]
    const J = x => lang === 'th' ? c._finalNaturalnessJudge(x, KEY, 'gemini-2.5-flash-lite') : c._lnGenericVerdicts(lang, x, { apiKey: KEY, model: 'gemini-2.5-flash-lite' })
    await Promise.all([J(one), J(one)]); await J(two)
    const s = c.aiUsageSummary(run)
    T(lang, 'D1', 'dedupe telemetry: duplicateCandidates 1 · duplicatesPrevented 1 · duplicateRequestsActuallySent 0; a different prompt is still sent',
      fetches.length === 2 && s.duplicateCandidates === 1 && s.duplicatesPrevented === 1 && s.duplicateRequestsActuallySent === 0, { fetches: fetches.length, s: { c: s.duplicateCandidates, p: s.duplicatesPrevented, a: s.duplicateRequestsActuallySent } })
  }
  // ── P1: target-to-scene plan before generation ──
  {
    const S = setup(lang); const st = mock(S, lang)
    const tg = S.targets.slice(0, 8).map(t => ({ ...t }))
    const plan = await S.c.planTargetScenes(tg, { premise: 'two friends plan a trip', characters: [{ speaker: 'A', name: 'Somchai' }, { speaker: 'B', name: 'Nida' }] }, { apiKey: 'k', model: 'gemini-2.5-flash-lite', lang })
    const ord = S.c.orderTargetsByPlan(tg, plan)
    const none = await S.c.planTargetScenes(tg, null, { lang })
    T(lang, 'P1', 'scene plan: every target placed once, generation order follows the mini-scenes; no key ⇒ deterministic single scene',
      // v657: SCENE_CLUSTER_VALIDATION may split a planner scene whose targets share no everyday situation, so the
      // plan has ≥ 2 scenes (not exactly the planner's 2); every scene is cluster-valid and generation follows it
      plan.source === 'model' && plan.scenes.length >= 2 && plan.scenes.every(sc => sc.clusterValidation && /PASS|SPLIT/.test(sc.clusterValidation.compatibility)) &&
      ord.length === 8 && new Set(ord.map(t => t.id)).size === 8 && ord[0]._sceneIndex === 1 && ord.every((t, k) => !k || t._sceneIndex >= ord[k - 1]._sceneIndex) && ord[7]._sceneIndex === plan.scenes.length && none.source === 'deterministic' && st.plan === 1,
      { plan, idx: ord.map(t => t._sceneIndex) })
  }
  // ── N6 (JA / ZH): scene proper names are authorised scene entities, stripped before closed-vocabulary checks ──
  if (lang !== 'th') {
    const S = setup(lang)
    const scene = lang === 'ja'
      ? { scene: 'Two friends at a cafe', characterA: 'Kenji, a man', characterB: 'Yuki, a woman', opening: 'ユキさん、こんにちは。', reply: 'ケンジさん、こんにちは。' }
      : { scene: 'Two friends at a cafe', characterA: 'Wei, a man', characterB: 'Lin, a woman', nameA_zh: '小伟', nameB_zh: '小林', opening: '小林，你好。', reply: '小伟，你好。' }
    const sc = S.c.buildSceneContract(scene, lang, { vocab: S.vocab })
    const names = sc.allowedSceneEntities.map(e => e.surface)
    const stripped = S.c.stripSceneEntities(scene.opening, sc.allowedSceneEntities)
    T(lang, 'N6', 'scene names (' + names.join('/') + ') are SCENE_PROPER_NAME entities, never vocabulary; stripped before the line checker',
      names.length === 2 && sc.allowedSceneEntities.every(e => e.type === 'SCENE_PROPER_NAME') && !names.some(n => stripped.includes(n)) &&
      !S.vocab.some(w => names.includes(w.japanese || w.chinese)), { names, stripped })
  }
  // ── S1: Listening speed default 0.80×, persisted, same for all languages ──
  {
    const c = load('tt.compiled.js')
    const d0 = c.listeningPlaybackSpeed(); c.saveListeningPlaybackSpeed(1.2); const d1 = c.listeningPlaybackSpeed()
    T(lang, 'S1', 'Listening playback: first-time default 0.8×, presets 0.8/1.0/1.2, choice persisted', d0 === 0.8 && d1 === 1.2 && JSON.stringify(c.ev('LISTENING_SPEED_PRESETS')) === '[0.8,1,1.2]', { d0, d1 })
  }
}

async function thaiOnly() {
  const lang = 'th'
  // ── N1: นิดา is a SCENE_PROPER_NAME — authorised for the lesson, never vocabulary ──
  {
    const S = setup('th')
    const scene = { scene: 'Somchai meets Nida at the market', characterA: 'Somchai, a Thai man', characterB: 'Nida, a Thai woman',
      opening: 'สวัสดีครับคุณนิดา วันนี้เป็นยังไงบ้างครับ', opening_english: 'Hello Nida, how are you today?', reply: 'สวัสดีค่ะคุณสมชาย สบายดีค่ะ', reply_english: 'Hello Somchai, I am well.' }
    const sc = S.c.buildSceneContract(scene, 'th', { vocab: S.vocab })
    const names = sc.allowedSceneEntities.map(e => e.surface)
    const ctxWith = S.c.buildThaiTrackVocabContext(S.vocab, S.targets, sc.allowedSceneEntities)
    const ctxWithout = S.c.buildThaiTrackVocabContext(S.vocab, S.targets, [])
    const vW = S.c.validateThaiVocabulary([{ thai: 'สวัสดีครับคุณนิดา' }], ctxWith), vO = S.c.validateThaiVocabulary([{ thai: 'สวัสดีครับคุณนิดา' }], ctxWithout)
    const diag = (vW.diagnostics || []).find(d => d.token === 'นิดา')
    T(lang, 'N1', 'scene contract names นิดา/สมชาย as SCENE_PROPER_NAME; "สวัสดีครับคุณนิดา" passes closed vocabulary only through that authorisation',
      names.includes('นิดา') && names.includes('สมชาย') && sc.allowedSceneEntities.every(e => e.type === 'SCENE_PROPER_NAME') && vW.ok && !vO.ok && diag && diag.classification === 'SCENE_PROPER_NAME' &&
      sc.approvedOpening.A.text === scene.opening && sc.characters[1].nativeName === 'นิดา',
      { names, vW: vW.ok, vO: vO.blocked, diag })
    T(lang, 'N2', 'a scene name is never vocabulary: not in the bank, not a target, not a keyword, not counted as coverage',
      !S.vocab.some(w => w.thai === 'นิดา') && !S.targets.some(t => t.thai === 'นิดา') && !ctxWith.trackTargets.some(t => (t.thai || t) === 'นิดา'), null)
    // closed-vocabulary enforcement keeps the approved opening intact
    const fr = [{ pairType: 'framing', _target: 'greeting', speaker: 'A', thai: scene.opening, english: scene.opening_english, prompt: 'greeting' },
                { pairType: 'framing', _target: 'reply', speaker: 'B', thai: scene.reply, english: scene.reply_english, prompt: 'reply' }]
    const r = S.c.enforceThaiClosedVocabulary(fr, ctxWith, { sceneContract: sc, stage: 'test' })
    const kept = (r.pairs || r).map ? (r.pairs || r) : []
    T(lang, 'N3', 'contextual greeting survives closed-vocabulary enforcement (names kept, not collapsed to สวัสดีครับ)',
      kept.length === 2 && kept[0].thai === scene.opening && kept[1].thai === scene.reply, kept.map(p => p && p.thai))
    // repair: an opening with an unauthorised word keeps the other character's name (contextual framing)
    const V2 = S.vocab.map(w => w.thai === 'อากาศ' ? { ...w, status: 'locked', lastSeen: null, introducedAt: null, repCount: 0, dueDate: null } : w)
    const ctx2 = S.c.buildThaiTrackVocabContext(V2, S.targets, sc.allowedSceneEntities)
    const bad = [{ pairType: 'framing', _target: 'greeting', speaker: 'A', thai: 'สวัสดีครับคุณนิดา วันนี้อากาศดีมากครับ', english: 'Hello Nida, the weather is great today.', prompt: 'greeting' }]
    const pre = S.c.validateThaiVocabulary([{ thai: bad[0].thai }], ctx2)
    const r2 = S.c.enforceThaiClosedVocabulary(bad, ctx2, { sceneContract: sc, stage: 'test' })
    const p2 = (r2.pairs || [])[0]
    T(lang, 'N4', 'framing repair keeps the scene context: "สวัสดีครับคุณนิดา …" (contextual), never a bare สวัสดีครับ',
      !pre.ok && p2 && /คุณนิดา/.test(p2.thai) && p2._source === 'closed-vocab-framing:contextual' && r2.stats.framingContextKept === 1, { pre: pre.blocked, p2: p2 && p2.thai, src: p2 && p2._source, stats: r2.stats })
    // SCENE_CONTRACT_DRIFT
    const tr = { sceneContract: sc, pairs: [{ pairType: 'framing', _target: 'greeting', speaker: 'A', thai: 'สวัสดีครับ' }, { pairType: 'framing', _target: 'reply', speaker: 'B', thai: scene.reply }] }
    const d1 = S.c.sceneContractDriftAudit(tr)
    const d2 = S.c.sceneContractDriftAudit({ ...tr, pairs: [{ ...tr.pairs[0], thai: scene.opening }, tr.pairs[1]] })
    T(lang, 'N5', 'SCENE_CONTRACT_DRIFT: opening collapsed to สวัสดีครับ (name lost) is flagged; the approved opening is not',
      d1.drift && d1.reasons.some(x => /นิดา/.test(x)) && !d2.drift, { d1, d2 })
  }
  // ── K1: tokenizer — fragments of an unseen compound are ONE reported token; interjection อ้อ allowed ──
  {
    const S = setup('th'); const ctx = S.c.buildThaiTrackVocabContext(S.vocab, S.targets, [])
    const v = S.c.validateThaiVocabulary([{ thai: 'ผมชอบวิทยาศาสตร์ครับ' }], ctx)
    const frag = (v.blocked || []).filter(b => ['วิท', 'ยา', 'ศาสต'].includes(b))
    T(lang, 'K1', 'unseen compound วิทยาศาสตร์ is blocked as ONE span, never as the fragments วิท / ยา / ศาสต',
      !v.ok && frag.length === 0 && (v.blocked || []).some(b => /วิทยาศาสต/.test(b)), v.blocked)
    const v2 = S.c.validateThaiVocabulary([{ thai: 'อ้อ ดีมากครับ' }], ctx)
    T(lang, 'K2', 'discourse interjection อ้อ is grammar, not blocked vocabulary', v2.ok, v2.blocked)
  }
  // ── E1: เชื่อ — recovery rejects a เรื่อง sentence, the next request forbids เรื่อง and the failed sentence ──
  {
    const S = setup('th')
    const w = id => S.vocab.find(x => x.id === id)
    // เรื่อง untaught for this learner (as in the 29-Sept live run)
    const ru = S.vocab.find(x => x.thai === 'เรื่อง'); Object.assign(ru, { status: 'locked', lastSeen: null, introducedAt: null, repCount: 0, dueDate: null })
    S.targets[0] = w(183)            // เชื่อ believe
    const st = mock(S, 'th')
    const prompts = [], badSent = 'ผมเชื่อเรื่องนี้ครับ'
    const base = S.c.mockGeminiGenerate
    let calls = 0
    const inner = S.c.geminiRequest
    S.c.geminiRequest = async o => {
      const q = o.messages[o.messages.length - 1].content
      if (/QUOTA RECOVERY — Thai/.test(q) && /TARGET WORD: "เชื่อ"/.test(q)) {
        prompts.push(q); calls++
        if (calls <= 2) return JSON.stringify([{ speaker: 'A', thai: badSent, english: 'I believe this story.', prompt: 'He says he believes this story' }])
        return JSON.stringify([['A', 'ผมเชื่อคุณครับ', 'I believe you.'], ['B', 'ฉันเชื่อค่ะ', 'I believe it.'], ['A', 'ผมไม่เชื่อครับ', 'I do not believe it.']]
          .map(([sp, th, en]) => ({ speaker: sp, thai: th, english: en, prompt: (sp === 'A' ? 'He says: ' : 'She says: ') + en.replace(/^I /, sp === 'A' ? 'he ' : 'she ').replace(/\.$/, '') })))
      }
      return inner(o)
    }
    const counts = { [S.targets[0].id]: 0 }
    const { t, log } = await fin(S, 'th', makeTrack(S, 'th', { counts, tag: '-e1' }))
    const p2 = prompts[1] || '', p3 = prompts[2] || ''
    const finalHas = t.pairs.some(p => p && /เรื่อง/.test(p.thai || ''))
    T(lang, 'E1', 'เชื่อ recovery: after a เรื่อง rejection the next prompt says DO NOT USE เรื่อง and lists the rejected sentence',
      prompts.length >= 2 && /DO NOT USE[^\n]*เรื่อง/.test(p2) && p2.includes(badSent) && /Use "เชื่อ" ONLY in this sense: believe/.test(prompts[0]), { n: prompts.length, p2: p2.slice(-900) })
    T(lang, 'E2', 'the same failed construction twice ⇒ RECOVERY_STRATEGY_CHANGE; the third request is different; final track has no เรื่อง sentence and เชื่อ is 3/3',
      log.some(l => /RECOVERY_STRATEGY_CHANGE/.test(l)) && /RECOVERY_STRATEGY_CHANGE 1/.test(p3) && !finalHas && t.integrity.quota.rows.find(r => r.targetId === 183).valid === 3,
      { change: log.filter(l => /RECOVERY_STRATEGY/.test(l)), row: t.integrity.quota.rows.find(r => r.targetId === 183), finalHas, status: t.integrity.status, tail: log.filter(l => /QUOTA|⛔/.test(l)).slice(0, 10) })
  }
  // ── W1: เบา / สบาย sense — the judge sees the intended sense; a wrong-sense sentence is dropped ──
  {
    const S = setup('th'); const prompts = []
    S.c.mockGeminiGenerate = async (k, m, msgs) => {
      const q = msgs[msgs.length - 1].content; prompts.push(q)
      const items = [...q.matchAll(/^(\d+)\. /gm)].map(x => +x[1]); const blocks = q.split(/\n(?=\d+\. )/)
      return JSON.stringify(items.map(i => { const b = blocks.find(l => l.startsWith(i + '. ')) || ''
        return { i, s: 5, note: 'ok', wrongSense: /wrongSense/.test(q) && /เงินเบา|ร้านสบาย/.test(b) } }))
    }
    const mk = (th, en, tgt, sense) => ({ thai: th, english: en, prompt: 'He says: ' + en, speaker: 'A', _target: tgt, _targetSense: sense, targetId: 1, pairType: 'content' })
    const pairs = [mk('กระเป๋าใบนี้เบามากครับ', 'This bag is very light.', 'เบา', 'light / gentle (weight)'), mk('เงินเบามากครับ', 'The money is light.', 'เบา', 'light / gentle (weight)'),
                   mk('วันนี้ผมสบายดีครับ', 'I am well today.', 'สบาย', 'comfortable / well'), mk('ร้านสบายมากครับ', 'The shop is very comfortable.', 'สบาย', 'comfortable / well')]
    const r = await S.c.finalPairSemanticAudit(pairs, 'k', 'gemini-2.5-flash-lite', null, {})
    const kept = r.pairs.map(p => p.thai)
    const natPrompt = prompts.find(q => /native Thai speaker/.test(q)) || ''
    T(lang, 'W1', 'เบา / สบาย: the naturalness judge receives "intended sense"; wrong-sense sentences dropped as WRONG_SENSE, correct-sense kept',
      /Target word: เบา — intended sense: light/.test(natPrompt) && /Target word: สบาย — intended sense: comfortable/.test(natPrompt) &&
      kept.includes('กระเป๋าใบนี้เบามากครับ') && kept.includes('วันนี้ผมสบายดีครับ') && !kept.includes('เงินเบามากครับ') && !kept.includes('ร้านสบายมากครับ') && r.stats.wrongSense === 2,
      { kept, stats: { w: r.stats.wrongSense, f: r.stats.failures } })
    const st = S.c.createRecoveryState({ wordId: 1597, thai: 'เบา', english: 'light / gentle' }, {})
    S.c.recordRecoveryFailure(st, { code: S.c._thaiFailCode('WRONG_SENSE: target used in the wrong sense'), text: 'เงินเบามากครับ', reason: 'money is not light' })
    const pl = S.c.recoveryStrategyPromptLines(st, {})
    T(lang, 'W2', 'a WRONG_SENSE failure feeds the next recovery prompt (sense + "do not repeat that meaning")',
      /ONLY in this sense: light/.test(pl) && /WRONG sense[\s\S]*เงินเบามากครับ/.test(pl), pl)
  }
  // ── M1: metadata — romanisation rebuilt from the dictionary (no J_ request); gloss fill only for words missing English ──
  {
    const S = setup('th'); mock(S, 'th')
    const t0 = S.targets[1] // เงิน
    const lg = []
    const pairs = [{ thai: 'ผมชอบ' + t0.thai + 'ครับ', english: 'I like money.', prompt: 'x', speaker: 'A', phonetic: '', words: [{ p: 'ผม', e: 'I' }, { p: 'ชอบ', e: 'like' }, { p: t0.thai, e: t0.english }, { p: 'ครับ', e: 'polite' }], targetId: t0.id }]
    S.c.__geminiMockCalls.length = 0
    const r = await S.c._thFinaliseMetadata(pairs, { vocab: S.vocab, apiKey: 'k', model: 'gemini-2.5-flash-lite', onLog: m => lg.push(m) })
    const stages = S.c.__geminiMockCalls.map(x => x.stage || '')
    const outp = (r.pairs || r)[0] || {}
    T(lang, 'M1', 'broken romanisation rebuilt from the canonical dictionary with 0 romanisation requests; 0 gloss requests when every word has English',
      !stages.some(s => /^J_/.test(s)) && !stages.some(s => /^K_/.test(s)) && outp.phonetic && outp.phonetic.trim().length > 0 && lg.some(l => /GLOSS FILL: 0 of/.test(l)),
      { stages, ph: outp.phonetic, lg: lg.slice(0, 6) })
    T(lang, 'M2', 'model routing: GEMINI_STAGE_MODELS has no full-Flash route', JSON.stringify(S.c.ev('GEMINI_STAGE_MODELS')) === '{}', S.c.ev('GEMINI_STAGE_MODELS'))
  }
  // ── C1: header cost chip — S$0.067 from the last track's estimated cost, no minus sign ──
  {
    const React = require('react'), RDS = require('react-dom/server')
    const c = load('tt.compiled.js', { React })
    const rate = c.ev('AI_USD_TO_SGD')
    const sum = { trackId: 'th-1', costUsd: 0.0673 / rate, total: 41, inputTokens: 90000, outputTokens: 20000, byModel: { 'gemini-2.5-flash-lite': 41 }, ranked: [], dedupedRequests: 3 }
    const u = await c.recordLastTrackAiUsage(sum, 'th-1', 'th')
    const back = await c.stGet(c.ev('LAST_TRACK_AI_USAGE_KEY'))
    const chip = c.formatSgdChip(back.estimatedSgd)
    const html = RDS.renderToStaticMarkup(React.createElement(c.LastTrackCostChip)).replace(/\s+/g, ' ')
    T(lang, 'C1', 'lastTrackAiUsage persisted {trackId, currency SGD, estimatedUsd, estimatedSgd, totalRequests, tokens, modelBreakdown, stageBreakdown, createdAt}; chip shows S$0.067, no minus',
      chip === 'S$0.067' && back.trackId === 'th-1' && back.currency === 'SGD' && back.totalRequests === 41 && back.totalTokens === 110000 && back.modelBreakdown['gemini-2.5-flash-lite'] === 41 &&
      Array.isArray(back.stageBreakdown) && back.createdAt && !/-/.test(chip) && /aria-label="Gemini"/.test(html) && /aria-label="Last track Gemini cost"/.test(html) && !/-\$/.test(html),
      { chip, back, html: html.slice(0, 300) })
  }
}

;(async () => {
  for (const lang of LANG) {
    try { await shared(lang) } catch (e) { fails++; out.push('FAIL ' + lang.toUpperCase() + ' suite crashed: ' + String(e && e.stack || e).slice(0, 700)) }
    if (lang === 'th') try { await thaiOnly() } catch (e) { fails++; out.push('FAIL TH thai-only suite crashed: ' + String(e && e.stack || e).slice(0, 700)) }
  }
  console.log(out.join('\n'))
  console.log('\nv650 §13 regression: ' + Object.entries(results).map(([l, r]) => l.toUpperCase() + ' ' + r.pass + '/' + (r.pass + r.fail)).join(' · ') + (fails ? ' — ' + fails + ' FAILED' : ' — ALL PASS'))
  process.exit(fails ? 1 : 0)
})()
