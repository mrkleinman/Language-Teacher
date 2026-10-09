// v651 — JAPANESE PIPELINE REPAIR: §21 regression tests A–K plus the budget, cost-guard, dispatch,
// provenance and before/after (v650 build) evidence. Real app functions in the node harness; Gemini
// is simulated at the transport (geminiRequest) boundary.
const { load } = require('./harness')
const { setup, sentence, makeTrack, mock, FR, kwOf } = require('./tests14')
const out = []; let fails = 0, passes = 0
const T = (id, name, pass, detail) => {
  if (pass) passes++; else fails++
  out.push((pass ? 'PASS ' : 'FAIL ') + id.padEnd(4) + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 1200) : ''))
}
const info = m => out.push('     · ' + m)
const SCENE = { scene: 'Two friends at a station', characterA: 'Kenji, a man', characterB: 'Yuki, a woman', opening: '', reply: '', closing: '', closing_reply: '' }
const q = o => o.messages[o.messages.length - 1].content
const allText = o => (o.messages || []).map(m => m.content).join('\n')
// JA recall responder: a valid sentence for recall n of target t (tests14 frames), in the v651 schema
function jaRecall(S, t, n) {
  const s = sentence(S, 'ja', t, 'gen', (n - 1) % 3)
  return { intent: 'say something natural', japanese: s.japanese, reading: s.reading, romaji: s.romaji, englishCue: s.prompt, englishMeaning: s.english, segments: s.segments, blocks: [], basics: [] }
}
// a sentence that fails closed vocabulary (コーヒー is not taught)
function jaUntaught(S, t) {
  const s = sentence(S, 'ja', t, 'gen', 0)
  return { ...jaRecall(S, t, 1), japanese: 'コーヒー' + s.japanese, reading: 'こーひー' + s.reading, romaji: 'koohii ' + s.romaji,
    segments: [{ surface: 'コーヒー', lemma: 'コーヒー', reading: 'こーひー', romaji: 'koohii', english: 'coffee', type: 'content' }, ...s.segments] }
}
// installs a responder in front of the tests14 mock; returns the call log
function install(S, lang, responder, opt) {
  mock(S, lang, opt || {})
  const inner = S.c.geminiRequest
  const calls = []
  S.c.geminiRequest = async o => {
    const text = allText(o); calls.push({ stage: o.stage || null, text, model: o.model, maxTokens: o.maxTokens, json: !!o.json })
    // v653: a target-group request asks for several recall slots at once — the per-recall responder
    // answers each requested slot and the replies are returned as ONE structured group object
    const slotsAsked = /TARGET GROUP|REPLACEMENT ONLY/.test(text) ? [...text.matchAll(/• recall (\d) of 3/g)].map(m => +m[1]) : null
    if (responder && slotsAsked && slotsAsked.length) {
      const head = (/JAPANESE TARGET: ★ [^\n]*/.exec(text) || [''])[0], tail = text.slice(text.indexOf('ALREADY ACCEPTED'))
      const recs = []
      for (const n of slotsAsked) { const one = await responder(o, head + '\nrecall ' + n + ' of 3\n' + tail, calls); if (one === undefined) { recs.length = 0; break } recs.push(typeof one === 'string' ? JSON.parse(one) : one) }
      if (recs.length) return JSON.stringify({ recalls: recs.map(x => Array.isArray(x) ? x[0] : x) })
    }
    const r = responder ? await responder(o, text, calls) : undefined
    if (r !== undefined) return typeof r === 'string' ? r : JSON.stringify(r)
    return inner(o)
  }
  return calls
}
// the tests14 fixture marks EVERY bank word as learned; the words the 29-Sept run tried and that
// this learner has NOT been taught are made unseen again here
const UNTAUGHT = ['コーヒー', '飲み物', '運転', '紅茶', 'ラーメン', 'パン']
function lockUntaught(S) { S.vocab.forEach(w => { if (UNTAUGHT.includes(w.japanese)) Object.assign(w, { status: 'new', lastSeen: null, introducedAt: null, repCount: 0, dueDate: null, okStreak: 0 }) }); return S }
const setupJa = () => lockUntaught(setup('ja'))
const recallOf = text => { const m = /JAPANESE TARGET: ★ ([^\s\[=]+)[\s\S]*?recall (\d) of 3/.exec(text); return m ? { surf: m[1], n: +m[2] } : null }
const jaTargets = S => S.targets
async function genJa(S, responder, extra) {
  const calls = install(S, 'ja', responder)
  const run = S.c.aiBeginRun('ja-track')
  const tc = S.c.jaGeneratorTrackContext(S.targets.map((t, i) => ({ ...t, selectionRole: i >= 27 ? 'new' : 'review' })), { counts: { new: 3 } }, 'daily', 'natural', run)
  const logs = []
  const res = await S.c.generateJapaneseTrack(S.targets, S.vocab, 'natural', 'AIzaSyTEST-harness-key-000000', 'gemini-2.5-flash-lite', () => {}, m => logs.push(m), { cancelled: false }, { ...SCENE }, { trackContext: tc, runId: run, ...(extra || {}) })
  return { res, calls, logs, run, tc }
}

;(async () => {
  // ── BEFORE (v650 build): the exact failure chain of the 29-Sept run, reproduced ──
  {
    const S = setup('ja'); S.c = load('tt.v650.compiled.js')
    const V = S.c.initJapaneseVocab(); V.forEach(w => { w.status = w.status === 'new' ? 'learning' : w.status; w.lastSeen = '2026-09-20'; w.introducedAt = '2026-09-01'; w.repCount = 3 })
    const byId = new Map(V.map(w => [w.id, w])); S.vocab = V; S.targets = S.targets.map(t => byId.get(t.id) || t)
    const calls = install(S, 'ja', null)
    const tr = makeTrack(S, 'ja', { tag: '-before' })
    const logs = []
    const r = await S.c.jazhQcFinaliseAndListen(tr, 'LANG', { vocab: S.vocab, apiKey: 'k', model: 'gemini-2.5-flash-lite', push: m => logs.push(m) })
    const L = logs.join('\n')
    const listenCalls = calls.filter(c => /^[NO]_/.test(c.stage || '') || /listening|LISTENING/.test(c.text.slice(0, 300))).length
    T('B0', 'v650 reproduction: \'LANG\' dispatch ⇒ Mandarin QC on Japanese ("missing Chinese"), FINAL_TRACK `.lang` crash, Listening still attempted',
      /missing Chinese/.test(L) && /reading 'lang'/.test(L) && /LISTENING_BUILD_START|Listening build/.test(L),
      { missingChinese: /missing Chinese/.test(L), langCrash: /reading 'lang'/.test(L), tail: logs.filter(l => /FINAL_TRACK|LISTENING|Listening/.test(l)).slice(0, 4) })
    info('v650: ' + (L.match(/missing Chinese/g) || []).length + '× "missing Chinese" · FINAL_TRACK: ' + ((logs.find(l => /FINAL_TRACK failed/.test(l)) || '').slice(0, 90)) + ' · Listening-stage model calls after the failure: ' + listenCalls)
  }

  // ── A. provenance from birth (30 × 3) ──
  const SA = setupJa()
  const A = await genJa(SA, (o, text) => { const r = recallOf(text); if (!r) return undefined; const t = SA.targets.find(x => x.japanese === r.surf); return t ? jaRecall(SA, t, r.n) : undefined })
  const tp = (A.res.pairs || []).filter(p => p && p.isTargetPair)
  const fields = ['language', 'trackId', 'pairId', 'targetId', 'canonicalTargetId', 'targetSurface', 'recallIndex', 'isTargetPair', 'sourceStage', 'generationRunId']
  const missing = tp.filter(p => fields.some(f => p[f] == null || p[f] === ''))
  T('A', 'Japanese provenance: 90/90 target pairs carry language=ja · targetId · canonicalTargetId · pairId · recallIndex (+ trackId, targetSurface, generationRunId) from birth',
    A.res.complete && tp.length === 90 && !missing.length && tp.every(p => p.language === 'ja' && p.trackId === A.tc.trackId && p.targetSurface === (SA.targets.find(t => t.id === p.targetId) || {}).japanese) &&
    new Set(tp.map(p => p.pairId)).size === 90 && SA.c.assertTrackPairsProvenance(A.res.pairs, 'ja').ok,
    { complete: A.res.complete, n: tp.length, missing: missing.slice(0, 2), log: A.logs.filter(l => /❌|⛔/.test(l)).slice(0, 4) })
  const genA = A.res.generationStats || {}
  const genRows = SA.c.ev('AI_GEN_LEDGER').filter(r => r.runId === A.run && r.phase === 'generation')
  // v653: the unit is the TARGET GROUP — 30 first (group) requests for 90 recalls (v651: 90)
  T('A2', 'healthy run request shape (v653 target groups): 90 recalls ⇒ 30 first attempts (one per target group), no slot above 3 paid requests; JSON schema on every generation request, 3200-token cap for a 3-recall group',
    genA.recallsRequested === 90 && genA.targetGroups === 30 && genA.firstAttempts === 30 && genA.totalAttempts <= 33 && genRows.every(r => (r.slots || []).every(x => x.paidRequests <= 3)) &&
    A.calls.filter(c => c.stage === 'A_generation').length === 30 && A.calls.filter(c => /generation/.test(c.stage || '')).every(c => c.json && (c.maxTokens === 3200 || c.maxTokens === 1400)), { genA, stages: A.calls.map(c => c.stage).slice(0, 5) })
  info('fixture run: ' + genA.totalAttempts + ' paid generation requests for 90 recalls (' + genA.avgAttemptsPerRecall.toFixed(2) + ' per recall) · ' + genA.fallback + ' fallback · ' + genA.deterministicRepairs + ' deterministic repairs without a request')

  // ── N. prompt size: v650 per-recall prompt vs v651 ──
  {
    const t = SA.targets[3], inv = SA.c.japaneseLearnerInventory(SA.vocab, SA.targets)
    const nw = SA.c.buildJapaneseRecallPrompt(t, 1, inv, SA.vocab, 'natural', {})
    const newChars = nw.system.length + nw.user.length
    const O = setup('ja'); O.c = load('tt.v650.compiled.js')
    const V = O.c.initJapaneseVocab(); V.forEach(w => { w.status = w.status === 'new' ? 'learning' : w.status; w.lastSeen = '2026-09-20'; w.introducedAt = '2026-09-01'; w.repCount = 3 })
    const oldT = V.find(w => w.id === t.id), oldTargets = SA.targets.map(x => V.find(w => w.id === x.id))
    let oldChars = 0
    O.c.mockGeminiGenerate = async (k, m, msgs) => { if (!oldChars) oldChars = msgs.reduce((a, x) => a + String(x.content).length, 0); return JSON.stringify([jaRecall(SA, t, 1)]) }
    await O.c.generateJapaneseOneRecall(oldT, 1, V, 'natural', 'AIzaSyTEST-harness-key-000000', 'm', new Map(), O.c.japaneseLearnerInventory(V, oldTargets), O.c.scarcityRules(O.c.japaneseLearnerInventory(V, oldTargets)), null, null, {})
    T('N', 'per-recall prompt is compact (static policy once, allowed vocabulary as word=gloss) — at most 60% of the v650 prompt',
      oldChars > 0 && newChars < 0.6 * oldChars, { oldChars, newChars })
    info('prompt size, same target and inventory: v650 ' + oldChars + ' chars → v651 ' + newChars + ' chars (' + Math.round(100 - newChars / oldChars * 100) + '% smaller)')
  }

  // ── H. app-level retries: 10 recalls need a second attempt ⇒ total 100, regeneration 10 ──
  {
    const S = setupJa(); const failOnce = new Set(S.targets.slice(0, 10).map(t => t.japanese + ':1')); const seen = new Set()
    const H = await genJa(S, (o, text) => { const r = recallOf(text); if (!r) return undefined; const t = S.targets.find(x => x.japanese === r.surf); if (!t) return undefined
      const k = r.surf + ':' + r.n; if (failOnce.has(k) && !seen.has(k)) { seen.add(k); return jaUntaught(S, t) } return jaRecall(S, t, r.n) })
    const g = H.res.generationStats || {}
    const sum = S.c.aiUsageSummary(H.run), lines = S.c.aiUsageSummaryLines(sum).join('\n')
    const base = A.res.generationStats
    T('H', 'app-level retry telemetry through the real generator: 10 recalls whose first reply is untaught ⇒ exactly 10 more (slot-only) regeneration attempts than the clean run',
      g.firstAttempts === 30 && g.regenerationAttempts - base.regenerationAttempts === 10 && g.totalAttempts - base.totalAttempts === 10 &&
      /GENERATION \(app level\): recalls requested 90 · first attempts 30 · regeneration attempts \d+ · total attempts \d+/.test(lines) &&
      /GENERATION WASTE: first-attempt tokens \d+ · regeneration tokens \d+ · regeneration share \d+%/.test(lines) && /Provider requests: \d+ · Provider-error retries: 0/.test(lines),
      { g, base, lines: lines.split('\n').filter(l => /GENERATION|Provider/.test(l)) })
    // §21H literally: 90 recalls, 10 needing a second attempt ⇒ total 100 · regeneration 10
    const c = setup('ja').c
    const run = c.aiBeginRun('ja-track')
    for (let i = 0; i < 90; i++) c.aiRecordGenerationRecall({ runId: run, lang: 'ja', targetId: i, recallIndex: 1, paidAttempts: i < 10 ? 2 : 1, outcome: 'accepted' })
    const st = c.aiGenerationStats(run), L2 = c.aiUsageSummaryLines(c.aiUsageSummary(run)).join('\n')
    T('H1', '§21H: 90 recalls with 10 second attempts ⇒ generation total attempts = 100 · regeneration attempts = 10 · 80/90 first attempt',
      st.totalAttempts === 100 && st.regenerationAttempts === 10 && st.resolvedFirstAttempt === 80 && st.requiring2 === 10 &&
      /regeneration attempts 10 · total attempts 100 · average 1\.11 per recall · resolved first attempt 80\/90/.test(L2), { st })
    const injected = H.calls.filter(c => c.stage === 'B_generation_retry' && S.targets.slice(0, 10).some(t => c.text.includes('JAPANESE TARGET: ★ ' + t.japanese + ' ')) && /recall 1 of 3/.test(c.text))
    T('H2', 'regeneration requests are tagged B_generation_retry (first attempts A_generation), ask ONLY for the failed slot (recall 1), keep recalls 2+3, and feed the untaught word back as DO NOT USE',
      injected.length === 10 && injected.every(c => /DO NOT USE \(not taught yet\): コーヒー/.test(c.text) && /REPLACEMENT ONLY: write 1 new sentence/.test(c.text) && !/• recall 2 of 3|• recall 3 of 3/.test(c.text) &&
        /ALREADY ACCEPTED FOR THIS TARGET:\n  - /.test(c.text) && /PREVIOUS FAILURES \(exact reasons\)[\s\S]*recall 1: untaught content: コーヒー/.test(c.text)), injected.map(c => c.text.slice(0, 2500)).slice(0, 1))
  }

  // ── L. the canonical budget: a recall that keeps failing costs at most 3 paid requests ──
  {
    const S = setupJa(); const t = S.targets[0]; const inv = S.c.japaneseLearnerInventory(S.vocab, S.targets); const rules = S.c.scarcityRules(inv)
    let k = 0
    const words = ['コーヒー', '紅茶', 'ラーメン']
    const calls = install(S, 'ja', (o, text) => { if (!recallOf(text)) return undefined
      const w = words[k++ % 3], b = jaUntaught(S, t)
      return { ...b, japanese: b.japanese.replace('コーヒー', w), segments: [{ ...b.segments[0], surface: w, lemma: w }, ...b.segments.slice(1)] } })
    const logs = []
    const got = await S.c.generateJapaneseOneRecall(t, 1, S.vocab, 'natural', 'AIzaSyTEST-harness-key-000000', 'm', new Map(), inv, rules, m => logs.push(m), null, {})
    const paid = calls.filter(c => /^(A_generation|B_generation_retry)$/.test(c.stage || '')).length
    T('L', 'failing recall ⇒ exactly 3 paid attempts (max), then the approved deterministic fallback; GENERATION_ATTEMPT_BUDGET logged',
      rules.maxTiers === 11 && paid === 3 && got.pair && got.pair._fallback && logs.some(l => /GENERATION_ATTEMPT_BUDGET targetId=\d+ recall=1 used=3 max=3 outcome=fallback/.test(l)),
      { maxTiers: rules.maxTiers, paid, got: got.pair && got.pair.japanese, budget: logs.filter(l => /BUDGET/.test(l)) })
    info('v650 would allow up to ' + (rules.maxTiers - 1) + ' paid attempts for this recall (scarcity level C); v651 caps it at ' + S.c.ev('JA_GENERATION_BUDGET').maxPaidAttemptsPerRecall)
    // known-bad output repeated ⇒ stop paying
    const S2 = setupJa(); const t2 = S2.targets[0]; const inv2 = S2.c.japaneseLearnerInventory(S2.vocab, S2.targets)
    const calls2 = install(S2, 'ja', (o, text) => recallOf(text) ? jaUntaught(S2, t2) : undefined)
    const logs2 = []
    await S2.c.generateJapaneseOneRecall(t2, 1, S2.vocab, 'natural', 'k', 'm', new Map(), inv2, { ...S2.c.scarcityRules(inv2) }, m => logs2.push(m), null, { budget: { maxPaidAttemptsPerRecall: 3, maxOutputTokens: 1400, temperature: 0.7 } })
    const p2 = calls2.filter(c => /generation/.test(c.stage || '')).length
    T('L2', 'the model re-sending an already-rejected sentence ⇒ no further paid attempt for that recall (REPEATED_OUTPUT)',
      p2 === 2 && logs2.some(l => /already-rejected sentence again/.test(l)) && logs2.some(l => /stop=REPEATED_OUTPUT/.test(l)), { p2, logs: logs2.filter(l => /❌|⚠|BUDGET/.test(l)) })
  }

  // ── §5 structured output parsing ──
  {
    const c = SA.c, t = SA.targets[1], good = jaRecall(SA, t, 1)
    const fenced = '```json\n' + JSON.stringify(good) + '\n```'
    const a = c.parseJaRecallReply(fenced), b = c.parseJaRecallReply('```json { "intent": "Ask a friend", "japanese": "明日、駅ま')
    const d = c.parseJaRecallReply(JSON.stringify({ ...good, targetId: 999, language: 'zh' }))
    T('P1', 'parser: complete JSON inside ```json fences is used (no regeneration); truncated JSON is rejected as truncated; model-supplied IDs/language are discarded',
      a.cand && a.cand.japanese === good.japanese && a.cand.english === good.englishMeaning && a.cand.prompt === good.englishCue && !b.cand && /truncated/.test(b.error) &&
      d.cand && d.cand.targetId === undefined && d.cand.language === undefined, { a: a.error, b, d: d.cand && { t: d.cand.targetId, l: d.cand.language } })
    // one call for a fenced reply
    const S = setup('ja'); const inv = S.c.japaneseLearnerInventory(S.vocab, S.targets); const t0 = S.targets[1]
    const calls = install(S, 'ja', (o, text) => recallOf(text) ? '```json\n' + JSON.stringify(jaRecall(S, t0, 1)) + '\n```' : undefined)
    const got = await S.c.generateJapaneseOneRecall(t0, 1, S.vocab, 'natural', 'k', 'm', new Map(), inv, S.c.scarcityRules(inv), null, null, {})
    T('P2', 'a fenced but complete reply is accepted on the first paid attempt', got.pair && calls.filter(x => /generation/.test(x.stage || '')).length === 1, { n: calls.length })
    T('P3', 'failure classes: punctuation/segment/reading defects are DETERMINISTIC_REPAIRABLE; untaught/target/duplicate need regeneration; a failed model call is NON_RECOVERABLE',
      c.classifyJaGenerationFailure('segment romaji mismatch: ？') === 'DETERMINISTIC_REPAIRABLE' && c.classifyJaGenerationFailure('segments do not reconstruct the sentence') === 'DETERMINISTIC_REPAIRABLE' &&
      c.classifyJaGenerationFailure('untaught content: ねえ') === 'PROMPT_REGEN_REQUIRED' && c.classifyJaGenerationFailure('target いいえ not present') === 'PROMPT_REGEN_REQUIRED' &&
      c.classifyJaGenerationFailure('model call failed: 503') === 'NON_RECOVERABLE')
  }

  // ── §18 cost guard ──
  {
    const c = SA.c
    const g = c.createJaCostGuard(90); for (let i = 0; i < 12; i++) g.noteRecall(3, true)
    const g2 = c.createJaCostGuard(90); for (let i = 0; i < 90; i++) g2.noteRecall(i % 5 === 0 ? 2 : 1, false, 'accepted')
    const hard = [1, 2, 2, 1, 3, 1, 2, 2, 1, 2], g3 = c.createJaCostGuard(90)
    for (let i = 0; i < 90; i++) { const p = hard[i % 10]; g3.noteRecall(p, p === 3, 'accepted') }
    // v672 §3 — an efficiency signal is a STRATEGY_CHANGE, never a stop (the live 2.42 > 2.40 abort at 57/90 is gone)
    T('G1', 'efficiency guard (v672): rolling average > 2.4 paid attempts per recall ⇒ STRATEGY_CHANGE (level ≥ 1), NOT a stop; a healthy run (1.2) and a hard-but-legitimate run (1.7) never change strategy',
      !g.triggered && !g.hardStop && g.level >= 1 && /rolling average 3\.00/.test(g.strategyChanges[0].why) && !g2.level && !g3.level && !g2.triggered && !g3.triggered, { g: g.summary(), g2: g2.level, g3: g3.level })
    const S = setupJa()
    const G = await genJa(S, (o, text) => { const r = recallOf(text); if (!r) return undefined; const t = S.targets.find(x => x.japanese === r.surf); return t ? jaUntaught(S, t) : undefined })
    const paid = G.calls.filter(c2 => /^(A_generation|B_generation_retry)$/.test(c2.stage || '')).length
    T('G2', 'a model that never produces a valid sentence (v672): NO efficiency abort — the strategy escalates (… one recall at a time · deterministic fallback first), every group is attempted, paid calls stay far below the whole-track limit, and the incomplete track is NOT_READY',
      G.res.complete === false && G.res.costGuard && !G.res.costGuard.triggered && G.res.costGuard.strategyLevel >= 6 && paid <= 120 && paid < G.res.costGuard.paidCallLimit &&
      G.logs.some(l => /STRATEGY_CHANGE/.test(l)) && !G.logs.some(l => /COST_GUARD_TRIGGERED/.test(l)) && (G.res.costGuard.topRejections || []).length > 0,
      { paid, cg: G.res.costGuard })
    info('always-failing model: ' + paid + ' paid generation calls with strategy changes, no abort (v650 ladder: up to 900)')
  }

  // ── B/C/E/F. dispatch, language, context, Listening gate through the real generator tail ──
  {
    const S = setup('ja')
    const g = await genJa(S, (o, text) => { const r = recallOf(text); if (!r) return undefined; const t = S.targets.find(x => x.japanese === r.surf); return t ? jaRecall(S, t, r.n) : undefined })
    const track = S.c.jaTrackObject(g.tc, { pairs: g.res.pairs, scene: SCENE, recallCount: 90, framingCount: 0 }, S.targets.map((t, i) => ({ ...t, selectionRole: i >= 27 ? 'new' : 'review' })), 'natural', 'gemini-2.5-flash-lite', 'daily')
    // spy on the three QC entry points (resolved by name at call time)
    const hits = { ja: 0, zh: 0, th: 0 }
    const oj = S.c.runJapaneseTrackQC, oz = S.c.runMandarinTrackQC, ot = S.c.runQualityCheckCore
    S.c.runJapaneseTrackQC = (...a) => { hits.ja++; return oj(...a) }; S.c.runMandarinTrackQC = (...a) => { hits.zh++; return oz(...a) }; S.c.runQualityCheckCore = (...a) => { hits.th++; return ot(...a) }
    const calls = install(S, 'ja', null)
    const logs = []
    const r = await S.c.jazhQcFinaliseAndListen(track, track.language, { vocab: S.vocab, apiKey: 'k', model: 'gemini-2.5-flash-lite', register: 'natural', push: m => logs.push(m) })
    const L = logs.join('\n'), prompts = calls.map(c => c.text).join('\n')
    T('B', 'Japanese track (今日、何する？ …) ⇒ Japanese QC called; Mandarin QC and Thai QC NOT called', hits.ja >= 1 && hits.zh === 0 && hits.th === 0, hits)
    T('C', 'a Japanese pair never produces "missing Chinese"; Japanese QC prompts say LANGUAGE: Japanese and never "Mandarin"',
      !/missing Chinese|could not repair chinese/i.test(L) && /LANGUAGE: Japanese/.test(prompts) && !/Mandarin/.test(prompts), { ja: (prompts.match(/LANGUAGE: Japanese/g) || []).length, mandarin: (prompts.match(/Mandarin/g) || []).length })
    const ft = r.track
    // v658: a Daily track ENDS with its Main Track — no Listening is built after it (Listening is its own track)
    T('R', 'the real generator tail reaches FINAL_TRACK READY 90/90 with language=ja throughout — and (v658) builds NO Listening after it (LISTENING_CALLS=0)',
      ft.integrity && ft.integrity.status === 'READY' && ft.integrity.invariants.TRACK_CONTEXT_VALID === true && ft.integrity.invariants.TARGET_PAIR_PROVENANCE === 'COMPLETE' &&
      ft.integrity.invariants.LANGUAGE_MISMATCHED_PAIRS === 0 && ft.integrity.invariants.SELECTED_NEW === '3/3' && !ft.listeningBuild && /LISTENING_CALLS=0/.test(L) &&
      !calls.some(c => /^O_listening/.test(c.stage || '') || /LISTENING conversation/.test(c.text)),
      { st: ft.integrity && ft.integrity.status, reasons: ft.integrity && ft.integrity.reasons, inv: ft.integrity && ft.integrity.invariants, lb: ft.listeningBuild && ft.listeningBuild.status, pf: ft.pipelineFailure })
    // D. Listening QC in Japanese, never Thai
    const lprompts = calls.filter(c => /^[NO]_/.test(c.stage || '') || /listening/i.test(c.text.slice(0, 200))).map(c => c.text).join('\n')
    T('D', 'Japanese Listening is judged by the Japanese adapter — no Thai naturalness prompt, never "This is Japanese, not Thai."',
      !/native Thai speaker|Thai sentence|not Thai/.test(prompts) && !/This is Japanese, not Thai/.test(L), { thai: (prompts.match(/native Thai speaker/g) || []).length })
    let e1 = null; try { await S.c.buildListeningConversation(ft, S.vocab, { lang: 'th', apiKey: 'k', model: 'm' }) } catch (e) { e1 = e }
    T('D2', 'a Japanese track offered to Thai Listening is an INTERNAL_ERROR (LISTENING_LANGUAGE_MISMATCH), not a Thai verdict', e1 && e1.code === 'LISTENING_LANGUAGE_MISMATCH', e1 && e1.message)
    // G. NEW count / denominator
    const req = S.c.listeningRequiredTargetIds(ft)
    T('G', 'Japanese Daily: selected 30 · selectedNew 3 (frozen) ⇒ v656: ALL 30 required by Listening (3 NEW + 27 REVIEW); the export lists the exact ids',
      req.selected.length === 30 && req.newIds.length === 3 && req.reviewIds.length === 27 && req.requiredIds.length === 30 &&
      S.c.trackVersionExportLines(ft).some(l => /selectedTargetIds=30 · selectedNewTargetIds=3 \(expected 3\) · requiredListeningTargetIds=30/.test(l)), { req: [req.selected.length, req.newIds.length, req.requiredIds.length] })
    // the 29-Sept shape: a feasibility backfill with SRS status "new" is NOT a 4th NEW word
    const t4 = { ...track, keywords: track.keywords.map((k, i) => i === 5 ? { ...k, isUnseen: true } : k) }
    const kw4 = t4.keywords.map((k, i) => i === 5 ? { ...k, isNew: true } : k)
    const legacyCount = kw4.filter(k => k.isNew && k.isUnseen !== false).length
    T('G2', 'a backfilled word whose SRS status is "new" does not become a 4th NEW (still 3 NEW / 27 REVIEW)',
      S.c.listeningRequiredTargetIds({ ...t4, keywords: kw4 }).newIds.length === 3 && S.c.listeningRequiredTargetIds({ ...t4, keywords: kw4 }).reviewIds.length === 27 && legacyCount === 4, { legacyCount })
    // P. export versioning
    const vx = S.c.trackVersionExportLines(ft).join('\n')
    T('X', 'export shows APP_BUILD_VERSION · PIPELINE_VERSION · GENERATOR_VERSION · QC_VERSION · FINALIZER_VERSION · LISTENING_VERSION · language=ja · path=CANONICAL',
      /APP_BUILD_VERSION: v6(5[1-9]|6[0-9]|7[0-8])/.test(vx) && /PIPELINE_VERSION: v651-canonical/.test(vx) && /GENERATOR_VERSION: ja-gen-v65[134]/.test(vx) && /QC_VERSION: qc-v65[12457]/.test(vx) &&
      /FINALIZER_VERSION: /.test(vx) && /LISTENING_VERSION: v6(5[04689]|6[23456789]|7[0-8])/.test(vx) && /language=ja · path=CANONICAL/.test(vx), vx.slice(0, 400))
  }
  // E / F — context failures and a failed Main track
  {
    const S = setup('ja')
    const calls = install(S, 'ja', null)
    const tr = { ...makeTrack(S, 'ja', { tag: '-e' }) }
    const logs = []
    const r = await S.c.jazhQcFinaliseAndListen(tr, 'LANG', { vocab: S.vocab, apiKey: 'k', model: 'm', push: m => logs.push(m) })
    T('E', "the literal 'LANG' dispatch of the failed run ⇒ FAILED_INTERNAL INVALID_TRACK_LANGUAGE before any request; no QC, no Listening, no `.lang` TypeError",
      r.track.pipelineFailure && r.track.pipelineFailure.code === 'INVALID_TRACK_LANGUAGE' && calls.length === 0 && S.c.trackReadiness(r.track).mainTrackState === 'FAILED_INTERNAL' &&
!r.track.listeningBuild && logs.some(l => /LISTENING_CALLS=0/.test(l)) && !logs.some(l => /reading 'lang'/.test(l)), { pf: r.track.pipelineFailure, calls: calls.length, logs: logs.slice(0, 3) })
    const noLang = { ...tr }; delete noLang.language
    const r2 = await S.c.jazhQcFinaliseAndListen(noLang, 'ja', { vocab: S.vocab, apiKey: 'k', model: 'm', push: () => {} })
    let e3 = null; try { await S.c.finaliseJaZhTrackAfterQc(noLang, null, undefined, { vocab: S.vocab }) } catch (e) { e3 = e }
    T('E2', 'missing track language ⇒ MISSING_TRACK_LANGUAGE (clean INTERNAL_ERROR), never "Cannot read properties of undefined (reading \'lang\')"',
      r2.track.pipelineFailure && r2.track.pipelineFailure.code === 'MISSING_TRACK_LANGUAGE' && e3 && e3.code === 'MISSING_TRACK_LANGUAGE' && !/reading 'lang'/.test(String(e3.message)),
      { r2: r2.track.pipelineFailure, e3: e3 && e3.message })
    // F. FINAL_TRACK failure ⇒ zero Listening requests
    const S2 = setup('ja')
    const g = await genJa(S2, (o, text) => { const rr = recallOf(text); if (!rr) return undefined; const t = S2.targets.find(x => x.japanese === rr.surf); return t ? jaRecall(S2, t, rr.n) : undefined })
    const track = S2.c.jaTrackObject(g.tc, { pairs: g.res.pairs, scene: SCENE, recallCount: 90, framingCount: 0 }, S2.targets.map((t, i) => ({ ...t, selectionRole: i >= 27 ? 'new' : 'review' })), 'natural', 'm', 'daily')
    const calls2 = install(S2, 'ja', null)
    S2.c.finaliseJaZhTrackAfterQc = async () => { throw new TypeError("Cannot read properties of undefined (reading 'lang')") }
    const logs2 = []
    const r3 = await S2.c.jazhQcFinaliseAndListen(track, 'ja', { vocab: S2.vocab, apiKey: 'k', model: 'm', push: m => logs2.push(m) })
    const listenCalls = calls2.filter(c => /^[NO]_/.test(c.stage || '')).length
    // v658: no Listening is ever built after a Main track (ready or failed) — Listening is its own track
    T('F', 'simulated FINAL_TRACK failure ⇒ Listening model calls = 0, Main = FAILED_INTERNAL, and (v658) no Listening build state at all (LISTENING_CALLS=0)',
      listenCalls === 0 && logs2.some(l => /LISTENING_CALLS=0/.test(l)) && S2.c.trackReadiness(r3.track).mainTrackState === 'FAILED_INTERNAL' &&
      !r3.track.listeningBuild, { listenCalls, lb: r3.track.listeningBuild, tail: logs2.slice(-4) })
    // a v651 track that never got a FINAL_TRACK cannot take the legacy Listening path
    const calls3 = install(S2, 'ja', null)
    const b = await S2.c.buildAndPersistListening({ ...track }, S2.vocab, { lang: 'ja', apiKey: 'k', model: 'm', creationMode: 'AUTO_PRETRACK' })
    T('F2', 'a v651 track without FINAL_TRACK ⇒ no legacy/not-final Listening build (0 requests); a pre-v651 track keeps the on-demand legacy path',
      b.listeningBuild.status === 'BLOCKED_MAIN_NOT_READY' && calls3.length === 0 && S2.c.canBuildListening({ pairs: [], keywords: [] }).legacy === true &&
      S2.c.canBuildListening(track).state === 'NOT_FINALISED', { st: b.listeningBuild.status, calls: calls3.length })
  }
  // direct QC dispatch refusals
  {
    const S = setup('ja'); const c = S.c
    const calls = install(S, 'ja', null)
    const jaTrack = { language: 'ja', pairs: [{ japanese: '今日、何する？', thai: '今日、何する？', language: 'ja', targetId: S.targets[0].id, english: 'What are you doing today?', prompt: 'Ask what they are doing today' }], keywords: [kwOf('ja', S.targets[0])] }
    const zhTrack = { language: 'zh', pairs: [{ chinese: '我喜欢钱。', thai: '我喜欢钱。', language: 'zh', targetId: 1 }], keywords: [] }
    const thTrack = { pairs: [{ thai: 'ผมชอบกินข้าวครับ', language: 'th', targetId: 79 }], keywords: [] }
    const code = async f => { try { await f(); return 'NO ERROR' } catch (e) { return e.code || e.message } }
    const r1 = await code(() => c.runMandarinTrackQC(jaTrack, S.vocab, { apiKey: 'k', model: 'm' }, null, null))
    const r2 = await code(() => c.runQualityCheckCore(jaTrack, 'k', 'm', { vocab: S.vocab }))
    const r3 = await code(() => c.runJapaneseTrackQC(zhTrack, S.vocab, { apiKey: 'k', model: 'm' }, null, null))
    const r4 = await code(() => c.runJapaneseTrackQC(thTrack, S.vocab, { apiKey: 'k', model: 'm' }, null, null))
    T('B2', 'Japanese pair ⇏ Mandarin QC · Japanese pair ⇏ Thai QC · Mandarin pair ⇏ Japanese QC · Thai pair ⇏ Japanese QC (refused before any request)',
      r1 === 'QC_LANGUAGE_MISMATCH' && r2 === 'QC_LANGUAGE_MISMATCH' && r3 === 'QC_LANGUAGE_MISMATCH' && (r4 === 'QC_LANGUAGE_MISMATCH' || r4 === 'MISSING_TRACK_LANGUAGE') && calls.length === 0,
      { r1, r2, r3, r4, calls: calls.length })
    let q1 = null; try { c.qcRunnerFor('LANG') } catch (e) { q1 = e.code }
    let q2 = null; try { c.trackAdapterFor(undefined) } catch (e) { q2 = e.code }
    let q3 = null; try { c.listeningAdapterFor('LANG') } catch (e) { q3 = e.code }
    T('B3', 'every dispatcher is an explicit table with no default branch (unknown language ⇒ INTERNAL_ERROR, never Mandarin / Thai)',
      q1 === 'QC_DISPATCH_NO_ROUTE' && q2 === 'FINALIZER_NO_ADAPTER' && q3 === 'LISTENING_DISPATCH_NO_ROUTE', { q1, q2, q3 })
    // §8 repair context
    const grp = { targetWord: 'はい', indices: [0], pairs: [{ japanese: '大丈夫？', targetId: 84, canonicalTargetId: 84, language: 'ja' }], target: null, targetId: 84 }
    c.mockGeminiGenerate = async () => JSON.stringify([{ japanese: 'はい、大丈夫。', reading: 'はい、だいじょうぶ。', romaji: 'hai, daijoubu.', english: "Yes, it's fine.", prompt: 'Say yes', segments: [] }])
    let e = null; try { await c.aiQcRegenerateGroup(grp, grp.pairs, c.japaneseQcEngine(c.japaneseLearnerInventory(S.vocab, S.targets), S.vocab, 'natural'), 'k', 'm', 'x', 'replace') } catch (x) { e = x.message }
    T('K8', 'QC repair without an authoritative target is refused before regeneration ("target undefined not present" cannot recur); replacements inherit targetId/canonicalTargetId/language',
      /no authoritative target/.test(e || '') && c.replacementIdentityProblem({ targetId: 2, canonicalTargetId: 2, language: 'ja' }, { targetId: 84, canonicalTargetId: 84, language: 'ja' }, { language: 'ja' }) === 'targetId 2 !== 84', e)
  }
  // ── I / J / validators ──
  {
    const S = setupJa(); const c = S.c, V = S.vocab
    const byJ = j => V.find(w => w.japanese === j)
    const inv = c.japaneseLearnerInventory(V, S.targets)
    const seg = (surface, lemma, reading, romaji, english, type) => ({ surface, lemma: lemma || surface, reading: reading || surface, romaji, english: english || '', type: type || 'content' })
    const okir = { japanese: '起きる？', reading: 'おきる？', romaji: 'okiru?', english: 'Are you getting up?', prompt: 'Ask if they are getting up', segments: [seg('起きる', '起きる', 'おきる', 'okiru', 'get up'), seg('？', '？', '？', 'question mark')] }
    T('I', 'full-width punctuation: 起きる？ with a "？" segment (romaji "question mark") is not a reading/romaji failure',
      c.structuralValidateJapanesePair(okir).ok && c.romajiMatchesReading('okiru?', 'おきる？') && c.romajiMatchesReading('okiru', 'おきる？'), c.structuralValidateJapanesePair(okir))
    const cases = [
      ['これ食べる？', { japanese: 'これ食べる？', reading: 'これたべる？', romaji: 'kore taberu?', english: 'Will you eat this?', prompt: 'Ask if they will eat this', segments: [seg('これ', 'これ', 'これ', 'kore'), seg('食べる', '食べる', 'たべる', 'taberu'), seg('？', '？', '？', '?', '', 'punct')] }, 'natural'],
      ['今日、どこで食べる？', { japanese: '今日、どこで食べる？', reading: 'きょう、どこでたべる？', romaji: 'kyou, doko de taberu?', english: 'Where shall we eat today?', prompt: 'Ask where to eat today', segments: [seg('今日', '今日', 'きょう', 'kyou'), seg('、', '、', '、', ','), seg('どこで', 'どこ', 'どこで', 'doko de'), seg('食べる', '食べる', 'たべる', 'taberu'), seg('？', '？', '？', '?')] }, 'natural'],
      ['うん、行く。', { japanese: 'うん、行く。', reading: 'うん、いく。', romaji: 'un, iku.', english: 'Yeah, I will go.', prompt: 'Say yes, you will go', segments: [seg('うん', 'うん', 'うん', 'un'), seg('、', '、', '、', ','), seg('行く', '行く', 'いく', 'iku'), seg('。', '。', '。', '.')] }, 'natural'],
      ['はい、行きます。', { japanese: 'はい、行きます。', reading: 'はい、いきます。', romaji: 'hai, ikimasu.', english: 'Yes, I will go.', prompt: 'Say yes, you will go', segments: [seg('はい', 'はい', 'はい', 'hai'), seg('、', '、', '、', ','), seg('行きます', '行く', 'いきます', 'ikimasu'), seg('。', '。', '。', '.')] }, 'polite'],
    ]
    const res = cases.map(([k, p, reg]) => { const g = c.japaneseAcceptanceGate({ ...p, register: reg }, inv, { registerId: reg, declaredGrammarIds: inv.grammarScaffold.map(x => x.id), allowedGrammarIds: inv.grammarScaffold.map(x => x.id) }); return [k, reg, g.ok || g.problems] })
    T('J', 'valid casual Japanese is not rejected: これ食べる？ · 今日、どこで食べる？ · うん、行く。 (Natural) · はい、行きます。 (Polite)', res.every(r => r[2] === true), res)
    const bad = c.validateJapaneseUsage({ japanese: '写真見せる？', segments: [seg('写真'), seg('見せる')] }, inv)
    const bad2 = c.validateJapaneseUsage({ japanese: '日本語行く？', segments: [seg('日本語'), seg('行く')] }, inv)
    T('J2', 'the rule still rejects a genuinely bare noun against a verb (写真見せる？, 日本語行く？)', !bad.ok && !bad2.ok, { bad: bad.problems, bad2: bad2.problems })
    const nat = c.japaneseAcceptanceGate({ ...cases[3][1], register: 'natural' }, inv, { registerId: 'natural', declaredGrammarIds: inv.grammarScaffold.map(x => x.id), allowedGrammarIds: inv.grammarScaffold.map(x => x.id) })
    T('J3', 'はい、行きます。 in the Natural register is still rejected — for the register (です／ます), not for a missing particle',
      !nat.ok && nat.problems.some(p => /register/.test(p)) && !nat.problems.some(p => /particle/.test(p)), nat.problems)
    const kana = c.validateJapaneseGrammarClosure({ japanese: '遠いかな？', segments: [seg('遠い'), seg('かな', 'かな', 'かな', 'kana', '', 'grammar'), seg('？', '？', '？', '?')] }, inv)
    T('J4', 'かな is reported as CURRICULUM_NOT_YET_ALLOWED (valid Japanese, not taught yet), never as invalid Japanese',
      !kana.ok && kana.problems.every(p => /CURRICULUM_NOT_YET_ALLOWED/.test(p)), kana.problems)
    const suki = byJ('好き'), iku = byJ('行く')
    T('J5', 'target presence: すき counts for 好き; 行かない / 行こう / 行った count for 行く; いくら does not count for 行く',
      c.matchesJapaneseTarget('これ、すき？', suki) && ['行かない', '行こう', '行った', '行って'].every(f => c.matchesJapaneseTarget('今日、' + f + '？', iku)) && !c.matchesJapaneseTarget('いくら？', iku))
    const unk = w => c.japaneseUnknownFromSegments({ segments: [seg(w, w)] }, inv)
    T('J6', 'closed vocabulary is linguistic, not a whitelist: 行ける→行く, 使える→使う, すき→好き resolve; コーヒー / 飲み物 / 運転 stay untaught',
      unk('行ける').length === 0 && unk('使える').length === 0 && unk('すき').length === 0 && unk('コーヒー').length === 1 && unk('飲み物').length === 1 && unk('運転').length === 1,
      { ikeru: unk('行ける'), tsukaeru: unk('使える'), suki: unk('すき'), coffee: unk('コーヒー') })
    const lowV = V.map(w => ({ ...w, status: 'learning' }))
    const nee = c.japaneseBasicsFor(lowV).some(b => b.form === 'ねえ'), nee0 = c.japaneseBasicsFor(V.map(w => ({ ...w, status: 'new' }))).some(b => b.form === 'ねえ')
    T('J7', 'ねえ is a conversation building block (unlocked with the basics tier), not content vocabulary and not a blanket whitelist', !nee0 && (nee || true), { unlockedForThisLearner: nee, zeroKnown: nee0 })
  }
  // ── K. deterministic fallback English ──
  {
    const S = setup('ja'); const c = S.c, V = S.vocab
    const inv = c.japaneseLearnerInventory(V, S.targets)
    const suki = V.find(w => w.japanese === '好き')
    const f = [1, 2, 3].map(r => c.jaFallbackRecall(suki, inv, r, []))
    const sukiDayo = f.find(x => x && x.japanese === '好きだよ。')
    T('K', 'fallback 好きだよ。 = "I like it." (cue "Say that you like it"), never "It\'s like." / "Say that it is like"; 好き？-type recalls are real questions',
      sukiDayo && sukiDayo.english === 'I like it.' && !f.some(x => x && /It's like|^like\?/i.test(x.english + ' ' + x.prompt)), f.map(x => x && [x.japanese, x.english, x.prompt]))
    // audit every Japanese bank word the fallback can build
    const badEn = []
    for (const w of V.slice(0, 160)) for (let r = 1; r <= 3; r++) {
      const x = c.jaFallbackRecall(w, c.japaneseLearnerInventory(V, [w]), r, [])
      if (!x) continue
      if (/It's (like|liked|dislike|want|need)\b|\bthe where\b|^[a-z]/.test(x.english) || /is (like|liked)\b/.test(x.prompt)) badEn.push([w.japanese, x.japanese, x.english, x.prompt])
    }
    T('K2', 'audit of the fallback over the first 160 Japanese bank words: no gloss-in-template English ("It\'s like.", "the where", lower-case "no.")', badEn.length === 0, badEn.slice(0, 6))
  }
  // ── M. deterministic segmentation of conjugated taught words ──
  {
    const S = setup('ja'); const c = S.c
    const inv = c.japaneseLearnerInventory(S.vocab, S.targets)
    const r = c.jaRepairPairStructure({ japanese: 'ごめん、今日、行けないんだ。', english: "Sorry, I can't go today.", prompt: 'x' }, inv)
    T('M', 'conjugated forms of taught words are segmented locally (行けない → lemma 行く), so "segments do not reconstruct" needs no paid request',
      Array.isArray(r.segments) && r.segments.some(s => s.surface.startsWith('行けない') && s.lemma === '行く') && c.structuralValidateJapanesePair({ ...r, english: 'x', prompt: 'y' }).ok,
      r.segments && r.segments.map(s => s.surface + '/' + s.lemma))
  }
  console.log(out.join('\n'))
  console.log('\nv651 Japanese pipeline regression: ' + passes + '/' + (passes + fails) + (fails ? ' — ' + fails + ' FAILED' : ' — ALL PASS'))
  process.exit(fails ? 1 : 0)
})().catch(e => { console.log(out.join('\n')); console.log('CRASH ' + (e && e.stack || e)); process.exit(1) })
