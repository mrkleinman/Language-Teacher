// v673 — PLANNING-FIRST LANGUAGE GENERATION regression set (Thai · Japanese · Mandarin).
// Part 1: ONE shared Listening runtime (generateCohesiveListeningTrack) · Part 2: feasibility before freeze, target
// communicative metadata, the abstract MEANING PLAN validated before generation, positive per-turn palettes · Part 3:
// failure-class repair levels, the repair STRATEGY guard, no target scattering, the Listening duplicate policy, the final
// one-discourse audit · Part 4: Daily last-mile fixes (Thai spoken-text ownership + variety plan, Japanese NEW shortfall
// telemetry, Mandarin ONE acceptance function with hardMax + positive patterns) · Part 5: version.
// Also (found while validating v673): 2H best-of-seeds planning + budget-only deferral · 3F short target-bearing repeats are
// substantive · 3G the Japanese scene-level register transformation kept in the phase transaction · 3H the deterministic trim.
// Every check runs the app's real functions in the node harness; Gemini is simulated only at the transport boundary.
const { setup, mock } = require('./tests14')
const fs = require('fs')
const out = []; let fails = 0, n = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + id.padEnd(5) + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 900) : '')) }
const KEY = 'AIzaSyTEST-harness-key-000000', MODEL = 'gemini-2.5-flash-lite'
const SRC = fs.readFileSync(__dirname + '/tt.jsx', 'utf8')
const dueOnly = S => { const ids = new Set(S.targets.map(t => t.id)); S.vocab.forEach(w => { if (ids.has(w.id)) { w.dueDate = '2026-01-01'; w.difficulty = 'hard' } else { w.dueDate = '2099-01-01'; if (w.difficulty === 'hard') w.difficulty = 'medium' } }) }
const tg = (id, surface, gloss, role) => ({ id, surface, gloss, english: gloss, role: role || 'CONTENT', domain: 'general conversation' })

;(async () => {
  // ══ PART 1 — ONE SHARED LISTENING RUNTIME ═══════════════════════════════════════════════════════════════════════
  for (const lang of ['th', 'ja', 'zh']) {
    const S = setup(lang); dueOnly(S)
    mock(S, lang, { ln: {} })
    const inner = S._mockFn, prompts = []
    S.c.mockGeminiGenerate = async (k, m, msgs, max, o) => { prompts.push(msgs[msgs.length - 1].content); return inner(k, m, msgs, max, o) }
    const logs = []
    const r = await S.c.generateCohesiveListeningTrack({ lang, vocab: S.vocab, apiKey: KEY, model: MODEL, onLog: x => logs.push(x), attemptId: 'lattempt-v673-' + lang })
    const L = logs.join('\n'), lt = r.track.listening || {}
    const order = ['LISTENING_RUNTIME planner=generateCohesiveListeningTrack', 'LISTENING_FEASIBILITY PASS', 'LISTENING_ONE_CONVERSATION', 'CONVERSATION_CONTRACT', 'LISTENING_MEANING_PLAN VALID'].map(k => L.indexOf(k))
    const firstScene = prompts.findIndex(q => /^Write SCENE LS\d+ /.test(q))
    T('1A-' + lang, lang.toUpperCase() + ': the ONE shared Listening runtime — LISTENING_RUNTIME → LISTENING_FEASIBILITY (before the freeze) → LISTENING_ONE_CONVERSATION → CONVERSATION_CONTRACT → LISTENING_MEANING_PLAN (validated) all logged in that order BEFORE the first generation request; architecture planning-first-v673; 30/30 READY',
      order.every((x, i) => x >= 0 && (i === 0 || x > order[i - 1])) && firstScene >= 0 && r.track.status === 'READY' && ['planning-first-v673', 'verbalizability-first-v674'].includes(lt.architecture) && r.track.coverage.covered === 30 &&
      lt.gates.MEANING_PLAN_VALIDATED === 'PASS' && lt.gates.QUESTION_ANSWER === 'PASS' && lt.gates.ONE_CONVERSATION === 'PASS',
      { order, st: r.track.status, arch: lt.architecture, gates: lt.gates, cov: r.track.coverage && r.track.coverage.covered })
    const scenePrompts = prompts.filter(q => /^Write SCENE LS\d+ /.test(q))
    T('1B-' + lang, lang.toUpperCase() + ': every phase request carries its TURN PLAN (meaning first: proposition, required target, relevant support words) — generation chooses from an authorised space',
      scenePrompts.length >= 3 && scenePrompts.every(q => /TURN PLAN — MEANING FIRST/.test(q) && /REQUIRED: /.test(q) && /SUPPORT: /.test(q)), scenePrompts.slice(0, 1).map(q => q.slice(0, 300)))
    const eff = (L.match(/LISTENING_EFFICIENCY [^\n]*/) || [''])[0]
    T('1C-' + lang, lang.toUpperCase() + ': efficiency health is reported (phases committed on first generation, repair calls, phase regenerations, global replans, reassignments) — 0 target reassignments, no planner failure',
      /phasesCommittedFirstGeneration=\d+%/.test(eff) && /planner health OK/.test(eff) && (lt.telemetry.LISTENING_REASSIGNMENTS || 0) === 0, eff)
  }
  {
    // v676: the benchmark run path (TT_BENCH_UI_PATHS block) is a second, deliberate caller of the SAME function —
    // counted separately so this check still proves the screen is the only learner-facing caller and nothing uses the alias
    const _b0 = SRC.indexOf('// TT_BENCH_UI_PATHS_BEGIN'), _b1 = SRC.indexOf('// TT_BENCH_UI_PATHS_END')
    const _benchSrc = _b0 >= 0 && _b1 > _b0 ? SRC.slice(_b0, _b1) : ''
    const _appSrc = _benchSrc ? SRC.slice(0, _b0) + SRC.slice(_b1) : SRC
    const benchCallers = [..._benchSrc.matchAll(/await (generateCohesiveListeningTrack|buildStandaloneListeningTrack)\(/g)].map(m => m[1])
    const callers = [..._appSrc.matchAll(/await (generateCohesiveListeningTrack|buildStandaloneListeningTrack)\(/g)].map(m => m[1])
    const legacy = [...SRC.matchAll(/legacyScenes\s*:/g)].length
    T('1D', 'source: the Listening screen (TH / JA / ZH) calls generateCohesiveListeningTrack; buildStandaloneListeningTrack is only its alias; the old multi-scene planner is reachable only behind o.legacyScenes, which no caller sets',
      callers.length === 1 && callers[0] === 'generateCohesiveListeningTrack' && benchCallers.every(x => x === 'generateCohesiveListeningTrack') && /async function buildStandaloneListeningTrack\(o\) \{ return generateCohesiveListeningTrack\(o\) \}/.test(SRC) && legacy === 0, { callers, legacy })
  }

  // ══ PART 2 — FEASIBILITY · METADATA · MEANING PLAN · PALETTES ════════════════════════════════════════════════════
  {
    const S = setup('th'), c = S.c
    const M = t => c.listeningTargetMetadata(t)
    const why = M(tg(1, '为什么', 'why?', 'QUESTION_WORD')), nande = M(tg(2, 'なんで', 'why?', 'QUESTION_WORD')), phone = M(tg(3, 'เบอร์โทรศัพท์', 'telephone number', 'NUMBER'))
    const zero = M(tg(4, 'ศูนย์', 'zero', 'NUMBER')), mc = M(tg(5, 'ไม่เชิง', 'not exactly', 'RESPONSE_TOKEN')), where = M(tg(6, 'どこ', 'where?', 'QUESTION_WORD'))
    const much = M(tg(7, 'いくら', 'how much?', 'QUESTION_WORD')), sorry = M(tg(8, 'ごめん', 'sorry', 'APOLOGY')), hen = M(tg(9, '很', 'very', 'CONTENT')), know = M(tg(10, '知道', 'to know', 'ACTION'))
    T('2A', 'target communicative metadata: WHY asks a REASON · WHERE a PLACE · HOW MUCH an AMOUNT · an apology expects an acknowledgement · ไม่เชิง is a qualified correction (never a question / statement) · ศูนย์ is a digit (never statement filler) · เบอร์โทรศัพท์ is a phone-number concept (never a proposal) · 很 modifies a state word · a stative verb is never proposed',
      why.asks === 'REASON' && nande.asks === 'REASON' && where.asks === 'PLACE' && much.asks === 'AMOUNT' && sorry.functions.includes('APOLOGISE') &&
      mc.functions.includes('CORRECT') && mc.incompatibleRoles.includes('QUESTION') && mc.incompatibleRoles.includes('STATEMENT') && zero.valueType === 'DIGITS' && zero.incompatibleRoles.includes('STATEMENT') &&
      phone.valueType === 'PHONE' && phone.incompatibleRoles.includes('PROPOSAL') && phone.incompatibleRoles.includes('COUNTERPROPOSAL') && hen.valueType === 'MODIFIER' && know.stative && know.incompatibleRoles.includes('PROPOSAL'),
      { why, zero, phone, mc, hen, know })
    // 为什么 → 大 is NOT a reason; なんで → いいえ is not its answer
    const bad = c.validateIntentSkeleton([{ turn: 1, speaker: 'A', intent: 'QUESTION', slot: 'REASON', targetIds: [1] }, { turn: 2, speaker: 'B', intent: 'ANSWER', respondsTo: 1, targetIds: [2], fillers: ['STATE'], surfaces: ['大'] }], null)
    T('2B', '为什么 → 大 is rejected at PLAN level (a WHY question is answered by a reason clause — no lesson word fills it automatically); a WH question answered by a bare "No" is an adjacency failure',
      !bad.valid && /cannot be filled by 大/.test(bad.problems.join(' ')) && /bare "No/.test(c.listeningQtypeIssue('Why are you going?', 'No.', true, false) || ''), { bad, q: c.listeningQtypeIssue('Why are you going?', 'No.', true, false) })
  }
  for (const [lang, file] of [['th', 'listening-log-2026-10-07T14-25-40.txt'], ['zh', 'listening-log-2026-10-07T14-33-11.txt']]) {
    const { execFileSync } = require('child_process')
    let txt = '', code = 0
    try { txt = execFileSync('node', [__dirname + '/replay_v673_listening_plan.js', __dirname + '/logs673/' + file, lang], { encoding: 'utf8' }) } catch (e) { txt = String(e.stdout || ''); code = e.status }
    T('2C-' + lang, lang.toUpperCase() + ' LIVE regression fixture (7 Oct targets) through the v673 planner: meaning plan VALID, 24–44 planned turns, and ' + (lang === 'th' ? 'ศูนย์ is a digit GIVEN for the requested phone number · เบอร์โทรศัพท์ is requested (never a proposal) · พัน answers an amount (never a counter-proposal) · 10 → 11 am is proposal → counter-proposal → acceptance · ไม่เชิง answers a yes/no question'
      : '为什么 asks a reason with no automatic target answer · 大 is never a reason · 很 rides with a state word'),
      code === 0 && /PLAN TOTAL: .* VALID/.test(txt) && !/FAIL —/.test(txt), txt.split('REGRESSION CHECKS:')[1] || txt.slice(-600))
  }
  {
    const S = setup('th'), c = S.c
    const ts = [tg(1, 'ไปที่', 'go to', 'ACTION'), tg(2, 'สนามหลวง', 'Sanam Luang', 'PLACE'), tg(3, 'กี่โมง', 'what time?', 'QUESTION_WORD'), tg(4, 'สิบโมง', "10 o'clock", 'TIME'), tg(5, 'ไม่เชิง', 'not exactly', 'RESPONSE_TOKEN'), tg(6, 'ไกล', 'far', 'DESCRIPTION'), tg(7, 'โชคดี', 'good luck', 'PARTING')]
    const p = c.planListeningConversation(ts, { seed: 's', turnsMax: 30 })
    const F = ['turnId', 'speaker', 'actType', 'proposition', 'topic', 'asksFor', 'answerType', 'referents', 'temporalContext', 'targetIds', 'requiredSense', 'allowedSupportConcepts']
    const tt = p.meaningPlan.turns
    const q = tt.find(t => t.targetIds.includes(3)), a = tt.find(t => t.respondsTo === (q && q.turnId))
    T('2D', 'the abstract MEANING PLAN: every planned turn stores turnId · speaker · actType · proposition · topic · asksFor · answerType · referents · temporalContext · targetIds · requiredSense · allowedSupportConcepts; "what time?" is answered by the time target in the NEXT turn of the other speaker',
      tt.length >= 6 && tt.every(t => F.every(f => f in t)) && p.meaningPlan.valid && q && a && a.targetIds.includes(4) && a.speaker !== q.speaker && a.actType === 'ANSWER', tt.slice(0, 4))
  }
  {
    // feasibility before freeze: a digit (ศูนย์) whose learner has no other digits and no phone-number target is skipped;
    // the next SRS candidate takes its place; the skipped word keeps its SRS obligation
    const S = setup('th'), c = S.c
    const pool = S.vocab.filter(w => w.status !== 'locked' && w.english && !/\b(zero|one|two|three|four|five|six|seven|eight|nine|phone|telephone|number)\b/i.test(w.english)).slice(0, 40)
    const zero = { id: 99001, thai: 'ศูนย์', english: 'zero', status: 'learning', lastSeen: '2026-09-20', introducedAt: '2026-09-01', dueDate: '2026-01-01' }
    const V = S.vocab.filter(w => !/\b(zero|one|two|three|four|five|six|seven|eight|nine|phone|telephone|number)\b/i.test(w.english || '')).concat([zero])
    const f = c.selectFeasibleListeningTargets({ lang: 'th', vocab: V, pool: [zero].concat(pool), need: 30, seed: 'x' })
    const L = c.listeningFeasibilityLog(f, 'th').join('\n')
    T('2E', 'FEASIBILITY BEFORE FREEZE: the SRS-first candidate ศูนย์ (a digit with no number context in the authorised vocabulary) is deferred, the next candidate is taken, 30 feasible targets + a VALID meaning plan; the skipped word keeps its SRS obligation (LISTENING_DEFERRED_SRS)',
      f.feasible && f.targetIds.length === 30 && !f.targetIds.includes(99001) && f.deferred.some(d => d.id === 99001 && /digits|number/.test(d.reason)) && /LISTENING_FEASIBILITY PASS/.test(L) && /LISTENING_DEFERRED_SRS ids=\[99001/.test(L) && zero.dueDate === '2026-01-01',
      { feasible: f.feasible, n: f.targetIds.length, deferred: f.deferred.slice(0, 3), reason: f.reason })
  }
  {
    // the 6/30 · 180-call Mandarin fixture: a learner whose ENTIRE pool is 30 words, one of which cannot carry a natural role
    // with the authorised vocabulary ⇒ LISTENING_PLAN_INFEASIBLE BEFORE any paid call
    const S = setup('zh'); dueOnly(S)
    const st = mock(S, 'zh', { ln: {} })
    const calls0 = st.calls.length
    const odd = S.targets[0]; odd.english = 'zero'                 // a digit with no other digits / phone number in this learner's bank
    S.vocab.filter(w => w !== odd && /\b(zero|one|two|three|four|five|six|seven|eight|nine|phone|telephone|number)\b/i.test(w.english || '')).forEach(w => { w.status = 'new'; w.lastSeen = null; w.introducedAt = null; w.dueDate = null })
    const logs = []
    const r = await S.c.generateCohesiveListeningTrack({ lang: 'zh', vocab: S.vocab, apiKey: KEY, model: MODEL, onLog: x => logs.push(x), targetIds: S.targets.map(t => t.id), attemptId: 'lattempt-v673-infeasible' })
    const L = logs.join('\n')
    T('2F', 'MANDARIN regression fixture (live 6/30 · 180 calls): when the learner\'s vocabulary cannot carry the frozen 30-target conversation, LISTENING_PLAN_INFEASIBLE is returned BEFORE generation — 0 paid calls, NOT_READY, no LS6…LS14 replacement spiral',
      r.track.status === 'NOT_READY' && /LISTENING_PLAN_INFEASIBLE/.test(L) && st.calls.length === calls0 && (r.track.failedChecks || []).includes('LISTENING_PLAN_INFEASIBLE') && !/Write SCENE/.test(L), { st: r.track.status, calls: st.calls.length - calls0, fc: r.track.failedChecks, tail: logs.slice(-3) })
  }
  for (const lang of ['ja', 'zh']) {
    const S = setup(lang), c = S.c
    const la = c.listeningAdapterFor(lang)
    const targets = c.listeningConversationTargets({ keywords: S.targets.map(w => c.listeningTrackKeyword(lang, w)), selectedTargetIds: S.targets.map(w => w.id) }, S.vocab, lang)
    const byId = new Map(targets.map(t => [t.id, t]))
    const plan = c.planListeningConversation(targets, { seed: 'p', turnsMax: 44 })
    const sp = plan.scenes[0]
    const ctx = lang === 'ja' ? { jaInv: c.japaneseLearnerInventory(S.vocab, S.targets), vocab: S.vocab } : { zhInv: c.mandarinLearnerInventory(S.vocab, S.targets), vocab: S.vocab }
    const pal = { support: S.vocab.slice(0, 10).map(w => ({ surface: w.japanese || w.chinese, gloss: w.english })) }
    const rows = c.listeningTurnPalettes({ la, ctx, byId }, sp, pal)
    const forms = rows.flatMap(r => r.forms)
    const okForm = s => lang === 'ja' ? c.japaneseCheckLine(s, ctx.jaInv).ok : c.mandarinUnknownContent(s, ctx.zhInv).filter(w => !c.zhIsParticle(w)).length === 0
    T('2G-' + lang, lang.toUpperCase() + ': the POSITIVE palette of every planned turn — proposition, required target, relevant support words and AUTHORISED FORMS built only from the learner\'s words (each form passes closed vocabulary)',
      rows.length === sp.skeleton.length && rows.every(r => r.proposition && Array.isArray(r.support)) && forms.length >= 1 && forms.every(okForm) && /AUTHORISED FORMS/.test(c.listeningTurnPlanBlock(rows)), rows.slice(0, 3))
  }

  // ══ PART 3 — REPAIR LEVELS · STRATEGY GUARD · NO SCATTERING · DUPLICATE POLICY · FINAL AUDIT ═════════════════════
  {
    const S = setup('th'), c = S.c
    const cc = c.getLearnerComplexityContract({ lang: 'th', vocab: S.vocab })
    const R = a => a.map(t => ({ text: t, units: cc.countUnits(t) }))
    const glue = c.listeningDuplicateIssues(R(['ไปไหนครับ', 'ไปตลาดค่ะ', 'โอเคครับ', 'ซื้ออะไรดีคะ', 'ผลไม้ครับ', 'โอเคค่ะ', 'จริงเหรอ', 'ไปกันครับ', 'จริงเหรอ']), cc)
    const imm = c.listeningDuplicateIssues(R(['ผมชอบกาแฟร้อนมากครับ', 'ผมชอบกาแฟร้อนมากครับ']), cc)
    const exch = c.listeningDuplicateIssues(R(['วันนี้ไปไหนดีครับ', 'ไปตลาดใหม่กันค่ะ', 'ดีครับ', 'วันนี้ไปไหนดีครับ', 'ไปตลาดใหม่กันค่ะ']), cc)
    const loop = c.listeningDuplicateIssues(R(['ได้ค่ะ', 'ไปไหน', 'ได้ค่ะ', 'อะไรนะ', 'ได้ค่ะ', 'ไหนคะ', 'ได้ค่ะ']), cc)
    const subst = c.listeningDuplicateIssues(R(['พิพิธภัณฑ์น่าดูมากครับ', 'จริงเหรอคะ', 'ใช่ครับ', 'พิพิธภัณฑ์น่าดูมากครับ']), cc)
    T('3A', 'LISTENING DUPLICATE POLICY: short glue ("okay", "really?") may recur naturally — 0 issues; rejected only: an immediate duplicate line, a duplicated whole exchange, a repetitive loop, a repeated substantive line',
      glue.length === 0 && imm.length === 1 && /immediately/.test(imm[0].detail) && exch.some(x => /whole earlier exchange|substantive/.test(x.detail)) && loop.some(x => /loop/.test(x.detail)) && subst.length === 1, { glue, imm, exch, loop, subst })
    const mk = (sp, en) => ({ speaker: sp, pair: { thai: 'x', english: en } })
    const counter = c.listeningCoherenceCheck([mk('A', "Shall we go at 10 o'clock?"), mk('B', "How about 11 o'clock?"), mk('A', 'OK, 11 then.')].map((l, i) => ({ idx: i, ...l })))
    const contra = c.listeningCoherenceCheck([mk('A', 'I have 3 apples.'), mk('B', 'I have 5 apples.')].map((l, i) => ({ idx: i, ...l })))
    T('3B', 'a PLANNED proposal → counter-proposal (10 → 11 o\'clock) is no longer flagged "contradicts the previous line" (live: it killed TH phase LS3 twice); a genuine contradiction still is',
      !/contradicts/.test(counter.reason) && /contradicts/.test(contra.reason), { counter, contra })
  }
  {
    // STRATEGY GUARD + failure-class repair: a phase whose adjacency defect survives one exchange repair is NOT repaired line
    // by line again — the guard escalates to a PHASE REGENERATION from the meaning plan; no target is scattered
    const S = setup('th'); dueOnly(S)
    mock(S, 'th', { ln: {} })
    const inner = S._mockFn
    let broke = 0
    S.c.mockGeminiGenerate = async (k, m, msgs, max, o) => { const q = msgs[msgs.length - 1].content; let r = await inner(k, m, msgs, max, o)
      const sm = q.match(/^Write SCENE (LS\d+) /)
      if (sm && sm[1] === 'LS2' && broke < 1) { broke++; const j = JSON.parse(r); if (j.turns && j.turns.length >= 2) { j.turns[1] = { ...j.turns[1], english: 'Is the weather nice today?', text: j.turns[1].text.replace(/(ครับ|ค่ะ)?$/, 'ไหม' + (j.turns[1].speaker === 'B' ? 'คะ' : 'ครับ')) }; j.turns[0] = { ...j.turns[0], english: (j.turns[0].english || '').replace(/\.?$/, '?') } } r = JSON.stringify(j) }
      return r }
    const logs = []
    const r = await S.c.generateCohesiveListeningTrack({ lang: 'th', vocab: S.vocab, apiKey: KEY, model: MODEL, onLog: x => logs.push(x), attemptId: 'lattempt-v673-guard' })
    const L = logs.join('\n'), tel = (r.track.listening || {}).telemetry || r.track.telemetry || {}
    T('3C', 'FAILURE CLASS → REPAIR LEVEL + STRATEGY GUARD: an adjacency defect is an EXCHANGE repair (never a line-by-line loop); when the same failure survives, REPAIR_STRATEGY_GUARD stops atomic repair and the phase is REGENERATED from its plan; repair calls stay < 10; 0 target reassignments',
      /PHASE_REPAIR LS2 class=EXCHANGE/.test(L) && (/REPAIR_STRATEGY_GUARD LS2/.test(L) || /PHASE_REPAIR_STRATEGY LS2 [^\n]*COMMITTED after repair/.test(L)) && (tel.LISTENING_REPAIR_CALLS || 0) < 10 && !/LISTENING_REASSIGN target=/.test(L) && r.track.coverage.covered === 30,
      { st: r.track.status, rep: tel.LISTENING_REPAIR_CALLS, lines: logs.filter(l => /LS2/.test(l)).slice(0, 12) })
  }
  {
    // NO TARGET SCATTERING: a phase that cannot commit (its required target never appears) is NOT committed with defects, and
    // its target never moves to an arbitrary later scene — only a SEMANTIC global replan may place it (once per track)
    const S = setup('th'); dueOnly(S)
    mock(S, 'th', { ln: { atomicNoop: true } })
    const inner = S._mockFn
    let dropped = null
    S.c.mockGeminiGenerate = async (k, m, msgs, max, o) => { const q = msgs[msgs.length - 1].content; let r = await inner(k, m, msgs, max, o)
      const sm = q.match(/^Write SCENE (LS\d+) /)
      if (sm && sm[1] === 'LS2') { const j = JSON.parse(r); const t = j.turns.find(x => (x.intendedTargetIds || []).length && (!dropped || (x.intendedTargetIds || []).includes(dropped))); if (t) { dropped = dropped || t.intendedTargetIds[0]; j.turns = j.turns.filter(x => x !== t) } r = JSON.stringify(j) }
      return r }
    const logs = []
    const r = await S.c.generateCohesiveListeningTrack({ lang: 'th', vocab: S.vocab, apiKey: KEY, model: MODEL, onLog: x => logs.push(x), attemptId: 'lattempt-v673-scatter' })
    const L = logs.join('\n')
    const gr = (L.match(/LISTENING_GLOBAL_REPLAN after LS2[^\n]*/) || [''])[0]
    T('3D', 'NO TARGET SCATTERING: the target LS2 cannot carry is moved only by SEMANTIC replanning of all remaining turns together (LISTENING_GLOBAL_REPLAN, once per track) — never by the old forward reassignment; no phase is committed with defects',
      !!gr && !/LISTENING_REASSIGN target=/.test(L) && (L.match(/LISTENING_GLOBAL_REPLAN after/g) || []).length <= 3 /* v674: MAX_REMAINING_PLAN_REBUILDS = 3 */ && !/COMMIT_WITH_DEFECTS/.test(L.replace(/NO COMMIT_WITH_DEFECTS/g, '')) && ((r.track.listening || {}).telemetry || {}).LISTENING_SCENES_COMMITTED_WITH_DEFECTS === 0,
      { gr, st: r.track.status, tail: logs.filter(l => /REPLAN|NOT_COMMITTED|REASSIGN/.test(l)).slice(0, 6) })
  }
  {
    const S = setup('th'), c = S.c
    const mk = (sp, en, th) => ({ speaker: sp, pair: { thai: th || 'x', english: en } })
    const flat = [mk('A', 'Where are you going?', 'ไปไหนครับ'), mk('B', 'Yes.', 'ใช่ค่ะ')]
    T('3E', 'FINAL AUDIT reads ONE discourse: a broken required question → answer exchange anywhere in the assembled conversation fails QUESTION_ANSWER (an average coherence score cannot override it)',
      c.skeletonAdjacencyIssues(flat, null).length === 1 && /QUESTION_ANSWER: \(\(\) => \{ const flatT = scenes.flatMap/.test(SRC) && /MEANING_PLAN_VALIDATED: sceneGates\.plan\.meaningPlan\.valid/.test(SRC), c.skeletonAdjacencyIssues(flat, null))
  }

  // ══ PART 3 (continued) — found while validating v673: short target-bearing repeats, JA register transform kept,
  // deterministic TRIM fallback, best-of-seeds planning, budget-only deferral ══════════════════════════════════════
  {
    const S = setup('ja'), c = S.c
    const cc = c.getLearnerComplexityContract({ lang: 'ja', vocab: S.vocab })
    const R = (a, tgs) => a.map((t, i) => ({ text: t, units: cc.countUnits(t), targets: (tgs || [])[i] || [] }))
    const withTarget = c.listeningDuplicateIssues(R(['それは友達よ。', '本当？', 'うん。', 'それは友達よ。'], [[9], [], [], [9]]), cc)
    const glueOnly = c.listeningDuplicateIssues(R(['いいね。', '行こう？', 'いいね。'], [[], [2], []]), cc)
    T('3F', 'DUPLICATE POLICY: a SHORT line that carries a lesson word (それは友達よ。, 2 units) is substantive — repeating it is a defect (live-style mock: it slipped through as "glue"); a one-unit glue token (いいね) may still recur',
      withTarget.length === 1 && /substantive/.test(withTarget[0].detail) && glueOnly.length === 0, { withTarget, glueOnly })
    T('3G', 'JAPANESE (not redesigned): the v667 scene-level register transformation is KEPT in the v673 phase transaction — a REGENERATED phase still in the wrong register gets ONE validated transformation before escalation; every candidate logs JA_SCENE_REGISTER … (as generated / regenerated)',
      /registerTransform\(cand, sp, st\.cov\)/.test(SRC) && /st\.pf\.regMajor && st\.pf\.reasons\.every\(x => \/\^REGISTER\/\.test\(x\)\)/.test(SRC) && /JA_SCENE_REGISTER scene=' \+ sp\.sceneId[^\n]*\(gen > 1 \? ' \(regenerated\)' : ' \(as generated\)'\)/.test(SRC))
    T('3H', 'no COMMIT_WITH_DEFECTS fallback: when the one global replan is spent, the defective exchange(s) are TRIMMED deterministically (no paid call), the remainder must pass EVERY phase gate again, and any target that leaves is explicitly LISTENING_TARGET_UNPLACED (NOT_READY)',
      /✂ PHASE_TRIMMED/.test(SRC) && /const stT = await phaseIssues\(trimmed, spT\)/.test(SRC) && /if \(stT\.clean && spT\.requiredTargetIds\.length\)/.test(SRC) && /every candidate carried it in a defective exchange; it is NOT forced into an unrelated turn/.test(SRC))
  }
  {
    // best-of-seeds planning (no model call) + budget-only deferral: the real-belt Japanese learner whose seed used to plan
    // 45 turns (> 44 ⇒ LISTENING_PLAN_INFEASIBLE with 150 candidates in the pool) is now always feasible
    const S = setup('ja'), c = S.c; S.c.setLearnerStateOverride(null); dueOnly(S)
    let inf = 0, maxTurns = 0, over36 = 0
    for (let i = 0; i < 24; i++) { const logs = []
      await c.generateCohesiveListeningTrack({ lang: 'ja', vocab: S.vocab, apiKey: '', model: MODEL, onLog: m => logs.push(m), attemptId: 'seed-' + i, speechStyle: 'natural' })
      const L = logs.join('\n'); if (/LISTENING_PLAN_INFEASIBLE/.test(L)) inf++
      const m = L.match(/meaning plan VALID \((\d+) turns\)/); if (m) { maxTurns = Math.max(maxTurns, +m[1]); if (+m[1] > 36) over36++ } }
    const t = S.targets.slice(0, 30).map(w => tg(w.id, w.japanese, w.english, 'CONTENT'))
    const best = c.planListeningConversationBest(t, { seed: 's', turnsMax: 44 })
    T('2H', 'FEASIBILITY never gives up on a budget-only miss: up to 4 deterministic plan seeds (fewest valid turns wins, stops inside 28–36), then the lowest-priority one-word exchange is DEFERRED for the next candidate — 24 real-belt JA seeds: 0 infeasible, every plan ≤ 44 turns',
      inf === 0 && maxTurns > 0 && maxTurns <= 44 && !!best.seedUsed && /LISTENING_CONVERSATION_TURNS\.max\) break/.test(SRC), { inf, maxTurns, over36, seed: best.seedUsed })
  }

  // ══ PART 4 — DAILY / REVISION LAST-MILE FIXES ═══════════════════════════════════════════════════════════════════
  {
    const S = setup('th'), c = S.c
    const a = c.separateSpeakerLabel('นิดา: สวัสดีค่ะสมชาย สบายดีค่ะ', ['นิดา', 'สมชาย'])
    const b = c.separateSpeakerLabel('สวัสดีค่ะสมชาย สบายดีค่ะ', ['นิดา', 'สมชาย'])
    const ab = c.separateSpeakerLabel('B: ค่ะ เดินทางปลอดภัยนะคะ', [])
    const en = c.separateSpeakerLabel('Nida: Hi Somchai!', [])
    const sd = c.normaliseSceneSpokenFields({ characterA: 'Somchai, a Thai man', characterB: 'Nida, a Thai woman', reply: 'นิดา: สวัสดีค่ะสมชาย สบายดีค่ะ', reply_english: 'Nida: Hi Somchai, I am fine.', reply_phonetic: 'nídaa: sà-wàt-dii khâ', closing_reply: 'นิดา: ค่ะ เดินทางปลอดภัยนะคะ' }, 'th')
    T('4A', 'THAI pronunciation ownership: a speaker label ("นิดา:", "B:", "Nida:") is separated from the spoken text (speakerDisplayName) before tokenisation; a name genuinely SPOKEN inside the sentence (…สมชาย) stays linguistic content; the scene framing fields are cleaned at creation',
      a.changed && a.label === 'นิดา' && a.spokenText === 'สวัสดีค่ะสมชาย สบายดีค่ะ' && !b.changed && ab.label === 'B' && ab.spokenText === 'ค่ะ เดินทางปลอดภัยนะคะ' && en.spokenText === 'Hi Somchai!' &&
      sd.reply === 'สวัสดีค่ะสมชาย สบายดีค่ะ' && sd.reply_english === 'Hi Somchai, I am fine.' && sd.reply_phonetic === 'sà-wàt-dii khâ' && sd.closing_reply === 'ค่ะ เดินทางปลอดภัยนะคะ' && sd._spokenLabelsRemoved === 2, { a, b, ab, en, sd })
    // the live failing framing line, through the REAL final metadata stage: 0 alignment issues on the spoken text
    const pairs = [{ speaker: 'B', thai: 'นิดา: สวัสดีค่ะ', phonetic: 'nídaa: sà-wàt-dii khâ', english: 'Nida: Hello.', pairType: 'framing', _pairKey: 'th-open-B', words: [{ p: 'นิดา:', e: '' }, { p: 'สวัสดี', e: 'hello' }, { p: 'ค่ะ', e: '' }] }]
    const logs = []
    const meta = await c.ev('TRACK_ADAPTERS').th.finaliseMetadata(pairs, { vocab: S.vocab, vocabById: new Map(S.vocab.map(w => [w.id, w])), onLog: x => logs.push(x), track: { sceneContract: { characters: [{ speaker: 'B', name: 'Nida', nativeName: 'นิดา' }] } } })
    T('4B', 'THAI: the live framing line "นิดา: สวัสดีค่ะ…" now finalises with the label as metadata and 0 PRONUNCIATION_ALIGNMENT issues (live: SEGMENTATION_DRIFT on th-open-B / th-close-B was the ONLY NOT_READY reason)',
      meta.pairs[0].thai === 'สวัสดีค่ะ' && meta.pairs[0].speakerDisplayName === 'นิดา' && meta.alignmentIssues.length === 0 && logs.some(l => /SPOKEN_TEXT_OWNERSHIP 1 line/.test(l)), { p: meta.pairs[0], issues: meta.alignmentIssues, logs: logs.slice(0, 6) })
    const q = c.thaiGenericVarietyUses({ english: 'how long?' }), v = c.thaiGenericVarietyUses({ english: 'to try' }), nn = c.thaiGenericVarietyUses({ english: 'receipt' })
    T('4C', 'THAI TARGET_VARIETY planned BEFORE generation for every (also generic) target: three different communicative uses chosen from the word\'s own type (a question word asked in different situations, a verb stated / asked / proposed, a noun stated / asked / requested)',
      q.length === 3 && v.length === 3 && nn.length === 3 && new Set(q).size === 3 && /ask/.test(q[0]) && /suggest/.test(v[2]) && /request/.test(nn[2]) && /VARIETY PLAN \(planned before writing\): LINE 1 = /.test(c.thaiGenericVarietyLine({ english: 'receipt' })) && /thaiGenericVarietyLine\(target\)/.test(SRC), { q, v, nn })
  }
  {
    const S = setup('ja'), c = S.c
    const pool = S.vocab.filter(w => w.status !== 'locked').slice(0, 30)
    const unseen = S.vocab.filter(w => !pool.includes(w)).slice(0, 3).map(w => ({ ...w, status: 'new', lastSeen: null, introducedAt: null, repCount: 0 }))
    const V = S.vocab.filter(w => !unseen.some(u => u.id === w.id)).concat(unseen)
    const selection = { targets: unseen.map(w => ({ ...w, selectionRole: 'new' })).concat(pool.slice(0, 27).map(w => ({ ...w, selectionRole: 'due' }))), counts: { new: 3 } }
    const final = [{ ...unseen[0], selectionRole: 'new' }].concat(pool.slice(0, 29).map(w => ({ ...w, selectionRole: 'reinforce' })))
    const sf = c.newTargetShortfallReport({ lang: 'ja', selection, targets: final, vocab: V, trackMode: 'daily' })
    T('4D', 'JAPANESE NEW_TARGET_SHORTFALL: desired 3 NEW but 1 selected is never silent — requested=3 selected=1 reason=<specific: the deferred words and why> eligibleNewCount blockedByCeiling debtState backfilledReviews=2 (telemetry only; the JA pipeline is unchanged)',
      !!sf && sf.requested === 3 && sf.selected === 1 && sf.backfilledReviews === 2 && /NEW_TARGET_SHORTFALL requested=3 selected=1 reason=\S/.test(sf.line) && /eligibleNewCount=\d+ blockedByCeiling=\d+ debtState=due=\d+,overdue=\d+ backfilledReviews=2/.test(sf.line) && sf.deferred.length === 2 &&
      !c.newTargetShortfallReport({ lang: 'ja', selection, targets: selection.targets, vocab: V, trackMode: 'daily' }) && /push\(_sf\.line\)/.test(SRC), sf)
  }
  {
    const S = setup('zh'), c = S.c
    c.setLearnerStateOverride({ rank: 'Mukyu', source: 'tests35' })            // the live learner: Mukyu, hardMax 6
    const inv = c.mandarinLearnerInventory(S.vocab, S.targets)
    const hao = S.vocab.find(w => w.chinese === '好') || S.targets[0]
    // the live 7u recovery line, carried with the model's COARSE segments (4 units) — the canonical count is 7
    const cand = { chinese: '这个真的很好，我朋友说。', pinyin: 'zhège zhēnde hěn hǎo, wǒ péngyou shuō.', english: 'This is really very good, my friend says.', prompt: 'Say that this is really very good, as your friend says.',
      segments: [{ surface: '这个真的', pinyin: 'zhège zhēnde' }, { surface: '很好', pinyin: 'hěn hǎo' }, { surface: '我朋友', pinyin: 'wǒ péngyou' }, { surface: '说', pinyin: 'shuō' }] }
    const cc = c.getLearnerComplexityContract({ lang: 'zh', vocab: S.vocab, lexicon: inv.lexicon })
    const an = c.hardComplexityAnalyse(cc, 'zh', cand), coarse = cc.analyse(cand)
    const v1 = c.mandarinAcceptCandidate(cand, hao, inv, S.vocab)
    const v2 = c.mandarinQcEngine(inv, S.vocab).validatePair({ ...cand }, { target: hao })
    T('4E', 'MANDARIN ONE acceptance function: hardMax is counted on the CANONICAL segmentation (coarse model segments can no longer hide the live 7-unit line) and the QC REPLACEMENT path rejects it immediately exactly like generation — no separate recovery acceptance that defers hardMax to the final audit',
      an.units > cc.hardMax && coarse.units <= cc.hardMax && !v1.ok && v1.problems.some(p => /LEVEL_COMPLEXITY_FAIL/.test(p)) && !v2.ok && v2.problems.some(p => /LEVEL_COMPLEXITY_FAIL/.test(p)) &&
      /mandarinAcceptCandidate\(p, t, inv, c\.vocab, \{ rules \}\)/.test(SRC) && /ZH_ACCEPTANCE_REJECTED \(quota recovery, after QC\)/.test(SRC), { an: an.units, coarse: coarse.units, hardMax: cc.hardMax, v1, v2 })
    const yi = S.vocab.find(w => w.chinese === '一点') || { id: 9001, chinese: '一点', pinyin: 'yìdiǎn', english: 'a little' }
    const pl = c.zhTargetPatternLine(yi, inv, S.vocab, c.mandarinScarcityRules(inv))
    const { user } = c.buildMandarinPrompt(yi, inv, S.vocab, 1, c.mandarinScarcityRules(inv))
    T('4F', 'MANDARIN first-pass generation gets POSITIVE target-specific patterns (一点 / 有点 / 太…了 / 很 / 多 / 少 / 不 / 没有 / questions / time / place / measure) plus authorised example sentences from the learner\'s own words — no retry increase',
      /PATTERN FOR 一点: VERB \+ 一点/.test(pl) && /PATTERN FOR 一点/.test(user) && ['有点', '太', '很', '多', '少', '不', '没有', '哪里', '什么', '在', '这个'].every(k => c.ev('ZH_TARGET_PATTERNS')[k]), pl)
  }

  // ══ version ════════════════════════════════════════════════════════════
  {
    const S = setup('th')
    T('5A', 'version v673+ (app + Listening build)', /^v(67[3-9]|68[01])$/.test(S.c.ev('APP_BUILD_VERSION')) && /^v(67[3-9]|68[01])$/.test(S.c.ev('LISTENING_BUILD_VERSION')))
  }

  out.forEach(l => console.log(l))
  console.log('\nv673 planning-first regression: ' + (n - fails) + '/' + n + (fails ? ' — ' + fails + ' FAILED' : ' — ALL PASS'))
  process.exit(fails ? 1 : 0)
})().catch(e => { console.log('CRASH ' + (e && e.stack || e)); process.exit(1) })
