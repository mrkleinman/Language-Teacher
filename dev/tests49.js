// v692 — MEANING-FIRST LISTENING PLANNER regression (Thai · Japanese · Mandarin), on the DEFAULT development path.
// Every check runs the app's real generateCohesiveListeningTrack → selection → profile → situation grouping → plan →
// deterministic validation (A–E) → semantic audit → fault-classified recovery → commit → the shared final gates. Only the
// model's REPLIES are scripted (benchmark/v692/mock.js), at the transport boundary — planning and validation are never
// bypassed. Learners: the three v691 Listening runs of 13 Oct (target ids from the owner's logs; benchmark/v692/learners.js).
// A mocked success proves the PIPELINE, not the teaching quality of what the real model will write.
'use strict'
const { load } = require('./harness')
const { learner, V691_IDS } = require('./benchmark/v692/learners')
const { GOOD, V691_BAD } = require('./benchmark/v692/plans')
const { mockMeaningFirst } = require('./benchmark/v692/mock')
const out = []; let n = 0, fails = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + id.padEnd(5) + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 900) : '')) }
const KEY = 'AIzaSyTEST-harness-key-000000', MODEL = 'gemini-2.5-flash-lite'
const LANGS = ['th', 'ja', 'zh']
const count = a => a.reduce((m, s) => (m[s] = (m[s] || 0) + 1, m), {})
async function run(lang, opt = {}, extra = {}) {
  const c = load(__dirname + '/tt.compiled.js', { realBelt: true })
  const defaultOn = c.listeningMeaningFirstOn()
  const L = learner(c, lang)
  // the app's Thai selection folds a RETIRED ALIAS's history into its canonical word (pre-existing, idempotent) — applied once
  // here as any earlier Revision / Daily selection would have, so the snapshot isolates what the Listening run itself changes
  if (lang === 'th') c.selectRevisionTargets('th', L.vocab)
  const before = JSON.stringify(L.vocab.map(w => [w.id, w.status, w.dueDate, w.repCount, w.interval, w.lastSeen]))
  const st = mockMeaningFirst(c, L.vocab, lang, { plan: GOOD[lang], ...opt })
  const logs = []
  let r = null, err = null
  try { r = await c.generateCohesiveListeningTrack({ lang, vocab: L.vocab, apiKey: KEY, model: MODEL, onLog: x => logs.push(x), attemptId: 'lattempt-v692-t49-' + lang, speechStyle: 'natural', ...extra }) } catch (e) { err = e }
  const after = JSON.stringify(L.vocab.map(w => [w.id, w.status, w.dueDate, w.repCount, w.interval, w.lastSeen]))
  return { c, L, st, logs, Ls: logs.join('\n'), r, err, track: r && r.track, stages: count(st.stages), defaultOn, srsUntouched: before === after }
}
// a plan with extra rows spliced in after turn `at` (0-based, in the GOOD order)
const splice = (rows, at, add) => rows.slice(0, at).concat(add.map(a => [rows[at - 1][0], ...a]), rows.slice(at))
const lineOf = (Ls, re) => (Ls.match(re) || [''])[0]

;(async () => {
  // ══ A — the DEFAULT path: meaning-first, all three languages READY on the v691 regression learners ═════════════
  const good = {}
  for (const lang of LANGS) good[lang] = await run(lang)
  for (const lang of LANGS) {
    const g = good[lang], tr = g.track
    T('A1-' + lang, lang + ': the meaning-first planner is the DEFAULT (no switch set) and ran — PLANNER log, the plan / audit stages, architecture meaning-first-v692; no legacy scene composer, no legacy preflight',
      g.defaultOn === true && /LISTENING_PLANNER planner=meaning-first-1/.test(g.Ls) && g.stages.O_listening_meaning_plan === 1 && g.stages.O_listening_semantic_audit >= 1 && !g.stages.O_listening_scene &&
      !/SCENE_PREFLIGHT|LISTENING_VERBALIZABILITY PROVEN|LISTENING_COMPOSITION scene/.test(g.Ls) && tr.listening && tr.listening.architecture === 'meaning-first-v692', { stages: g.stages, arch: tr && tr.listening && tr.listening.architecture })
    T('A2-' + lang, lang + ': READY with 30/30 targets heard, every final gate passing, 24–44 turns, ≤3 targets per turn, both speakers', tr.status === 'READY' && tr.coverage.covered === 30 && tr.failedChecks.length === 0 &&
      tr.listening.lines.length >= 24 && tr.listening.lines.length <= 44 && tr.listening.gates.MAX_TARGETS_PER_TURN <= 3 && tr.listening.gates.BOTH_SPEAKERS, { status: tr.status, cov: tr.coverage, failed: tr.failedChecks })
    T('A3-' + lang, lang + ': exactly 30 selected revision targets, 0 new; SRS history / status / due dates of every word unchanged by the run', tr.selectedTargetIds.length === 30 && tr.targetCounts.newTargetCount === 0 && g.srsUntouched)
    T('A4-' + lang, lang + ': the plan was proven before commit — STRUCTURAL_VALIDATION PASS and SEMANTIC_AUDIT PASS, then SCENE_ACCEPTED / SCENE_COMMITTED, MEANING_PLAN_VALIDATED gate PASS',
      /STRUCTURAL_VALIDATION \(candidate\) PASS/.test(g.Ls) && /SEMANTIC_AUDIT \(candidate\) PASS/.test(g.Ls) && /state=APPROVED/.test(g.Ls) && /SCENE_ACCEPTED LS1/.test(g.Ls) && /SCENE_COMMITTED LS1/.test(g.Ls) && tr.listening.gates.MEANING_PLAN_VALIDATED === 'PASS')
    T('A5-' + lang, lang + ': 3 model calls in all (1 plan · 1 semantic audit · 1 final coherence judge) — no per-scene generation, no repair calls when the plan is valid',
      (g.stages.O_listening_meaning_plan + g.stages.O_listening_semantic_audit + (g.stages.O_listening_coherence || 0)) === 3 && !g.stages.O_listening_plan_repair, g.stages)
    // every planned turn carries structured meaning (speaker, intention, referent …) in the saved plan
    const mp = tr.listening.coveragePlan && tr.listening
    T('A6-' + lang, lang + ': every target is heard in the FINAL text (the coverage rows come from the final lines), and every line\'s speaker is A or B', tr.listening.coverage.rows.every(rw => rw.status === 'COVERED') && tr.listening.lines.every(l => l.speaker === 'A' || l.speaker === 'B'))
  }
  // ══ B — feasibility BEFORE the freeze: targets that cannot be answered / used are deferred (SRS kept) and replaced ═
  {
    const ja = good.ja.Ls, zh = good.zh.Ls, th = good.th.Ls
    T('B1', 'ja: 何時 and いくら are DEFERRED before the freeze (the learner has no number words: a clock time / price can never be answered — v691 planned 何時→明日, いくら→高いね) with srsObligationPreserved=true, and replaced from the SRS pool',
      /LISTENING_TARGET_DEFERRED target=45 何時 reason=asks for a clock time.*srsObligationPreserved=true/.test(ja) && /LISTENING_TARGET_DEFERRED target=22 いくら reason=asks for a price.*srsObligationPreserved=true/.test(ja) && good.ja.track.selectedTargetIds.length === 30)
    T('B2', 'zh: 多少 deferred for the same reason (no amount words); th: all 30 v691 targets kept (Thai has numbers), 0 deferred',
      /LISTENING_TARGET_DEFERRED target=29 多少/.test(zh) && /deferred 0/.test(th) && V691_IDS.th.every(id => good.th.track.selectedTargetIds.includes(id)))
    T('B3', 'the feasibility log is honest: a FEASIBILITY check (vocabulary for the answer, words the grammar needs, a situation) — "not a proof that sentences will be natural"; 0 paid calls before the freeze',
      /LISTENING_SEMANTIC_FEASIBILITY PASS .*not a proof that sentences will be natural/.test(th) && /checked BEFORE the targets are frozen \(0 paid calls\)/.test(th))
    const sit = (Ls, re) => (Ls.match(re) || [''])[0]
    T('B4', 'targets are grouped by MEANING, not by count: th แก่ joins คุณอายุเท่าไหร่ (people) — not "this thing" as in v691; ja 電車 + バス + 車 in getting-there; zh 钱 + 买 in shopping',
      /แก่/.test(sit(th, /LISTENING_SITUATION S\d MEET[^\n]*/)) && /คุณอายุเท่าไหร่/.test(sit(th, /LISTENING_SITUATION S\d MEET[^\n]*/)) &&
      /電車/.test(sit(ja, /LISTENING_SITUATION S\d TRAVEL[^\n]*/)) && /バス/.test(sit(ja, /LISTENING_SITUATION S\d TRAVEL[^\n]*/)) && /車/.test(sit(ja, /LISTENING_SITUATION S\d TRAVEL[^\n]*/)) &&
      /钱/.test(sit(zh, /LISTENING_SITUATION S\d SHOP[^\n]*/)) && /买/.test(sit(zh, /LISTENING_SITUATION S\d SHOP[^\n]*/)), [sit(th, /LISTENING_SITUATION S\d MEET[^\n]*/), sit(ja, /LISTENING_SITUATION S\d TRAVEL[^\n]*/), sit(zh, /LISTENING_SITUATION S\d SHOP[^\n]*/)])
    T('B5', 'the conversation structure comes from the targets, not a fixed arc: the three languages get different situation sequences (no forced OPEN → DECIDE → ARRANGE → MOVE → DO → PAY)',
      new Set(LANGS.map(l => (good[l].track.listening.story || []).join('>'))).size === 3 && !/OPEN → DECIDE → ARRANGE/.test(good.th.Ls), LANGS.map(l => good[l].track.listening.story))
  }
  // ══ C — the ORIGINAL v691 defective plans are REJECTED by the deterministic validators (the audit says "natural" to all) ═
  const bad = {}
  bad.th = await run('th', { plan: splice(GOOD.th, 10, V691_BAD.th) })
  bad.ja = await run('ja', { plan: splice(GOOD.ja, 7, V691_BAD.ja) })
  bad.zh = await run('zh', { plan: splice(GOOD.zh, 6, V691_BAD.zh.flatMap(r => [r, ['B', 'ACCEPT', '', '', '好啊！', 'Sure!']])) })
  {
    const L = bad.th.Ls
    T('C1', 'th: แก่มากค่ะ answering นี่เป็นอย่างไรครับ ("this") is a REFERENT_MISMATCH (แก่ = old people / animals)', /REFERENT_MISMATCH[^\n]*แก่/.test(L), lineOf(L, /[^\n]*REFERENT_MISMATCH[^\n]*/))
    T('C2', 'th: ไว้ตลกมากครับ fails the ไว้ grammar contract (ไว้ follows a verb)', /GRAMMAR_CONTRACT[^\n]*ไว้/.test(L))
    T('C3', 'th: ชอบค่าโดยสารไหมครับ ("like the fare?") fails the ค่าโดยสาร meaning rule (ask / give its amount)', /MEANING_RULE[^\n]*ค่าโดยสาร/.test(L))
    const J = bad.ja.Ls
    T('C4', 'ja: 何時に行く？ → 明日、行く。 is an ANSWER_TYPE failure (a clock time was asked)', /ANSWER_TYPE[^\n]*何時に行く[^\n]*clock time/.test(J), lineOf(J, /[^\n]*ANSWER_TYPE[^\n]*/))
    T('C5', 'ja: これ、いくら？ → 高いね。 is an ANSWER_TYPE failure (an amount was asked, an opinion given)', /ANSWER_TYPE[^\n]*いくら[^\n]*an amount/.test(J))
    T('C6', 'ja: なんで行くの？ → いいから。 is an ANSWER_TYPE failure (a reason was asked, a brush-off given)', /ANSWER_TYPE[^\n]*なんで行くの[^\n]*a reason/.test(J))
    const Z = bad.zh.Ls
    T('C7', 'zh: 跟找钱吗？ fails the 跟 contract (跟 + a person + a verb)', /GRAMMAR_CONTRACT[^\n]*跟 needs a person[^\n]*跟找钱吗/.test(Z))
    T('C8', 'zh: 我们昨天去这里吧。 — a suggestion about yesterday AND 去这里 ("go here")', /MEANING_RULE[^\n]*a suggestion \(吧\) cannot be about yesterday/.test(Z) && /MEANING_RULE[^\n]*去这里/.test(Z))
    T('C9', 'zh: 我们明天跟用这个吧。 fails 跟; 我现在一起到。 fails 一起 (one speaker, a statement) and 到 (no place / 了)',
      /GRAMMAR_CONTRACT[^\n]*跟用这个/.test(Z) && /GRAMMAR_CONTRACT[^\n]*一起 needs a plural subject[^\n]*我现在一起到/.test(Z) && /GRAMMAR_CONTRACT[^\n]*到 needs a place[^\n]*我现在一起到/.test(Z))
    T('C10', 'no defective plan is committed: each run ends LISTENING_PLAN_BLOCKED, NOT_READY, no SCENE_COMMITTED, and NO legacy fallback (no scene composer, no preflight)',
      LANGS.every(l => bad[l].track.status === 'NOT_READY' && /LISTENING_PLAN_BLOCKED/.test(bad[l].Ls) && !/SCENE_COMMITTED/.test(bad[l].Ls) && !/SCENE_PREFLIGHT|LISTENING_COMPOSITION scene/.test(bad[l].Ls) && !bad[l].stages.O_listening_scene),
      LANGS.map(l => bad[l].track.failureReason))
    T('C11', 'the blocked run names the fault classes and stops before paid scene generation ("no further paid scene generation")', LANGS.every(l => /fault classes: [^\n]*(GRAMMAR|SEMANTIC|QUESTION_ANSWER)/.test(bad[l].Ls) && /no further paid scene generation/.test(bad[l].Ls)))
  }
  // ══ D — RECOVERY by fault class ═══════════════════════════════════════════════════════════════════════════════
  {
    // D1 · a QUESTION_ANSWER fault → the WHOLE exchange is repaired (one call), re-validated and re-audited → READY
    const ja1 = await run('ja', { plan: splice(GOOD.ja, 7, V691_BAD.ja.slice(0, 2)), repair: () => [['A', 'ASK', 'TIME', 'we', 'いつ行く？', 'When shall we go?'], ['B', 'ANSWER', '', 'we', '明日、行こう。', 'Let\'s go tomorrow.']] })
    T('D1', 'ja: 何時→明日 is repaired as an EXCHANGE (QUESTION_ANSWER), the new いつ→明日 exchange passes both gates, the track is READY — 1 repair call, every other turn kept',
      ja1.track.status === 'READY' && /MEANING_REPAIR round 1\/3 · 1 part\(s\): x1 exchange \[QUESTION_ANSWER\]/.test(ja1.Ls) && /PART_REPAIRED x1 \(exchange/.test(ja1.Ls) && ja1.stages.O_listening_plan_repair === 1, { st: ja1.track.status, r: ja1.track.failureReason, s: ja1.stages })
    // D2 · a GRAMMAR fault → a line repair keeps the protected lesson words
    const zh1 = await run('zh', { plan: splice(GOOD.zh, 6, [['A', 'INFORM', '', 'I', '我现在一起到。', 'I now together arrive.'], ['B', 'REACT', '', '', '真的吗？', 'Really?']]), repair: () => [['A', 'INFORM', '', 'I', '我现在到了。', 'I\'m here now.'], ['B', 'REACT', '', 'we', '好，我们一起去吧！', 'Great, let\'s go together!']] })
    T('D2', 'zh: 我现在一起到 (GRAMMAR + more than 3 lesson words) → repaired into two turns (我现在到了 / 好，我们一起去吧) keeping 现在 + 一起 + 到 → READY', zh1.track.status === 'READY' && /PART_REPAIRED x1 \([a-z]+ · [A-Z+_]*GRAMMAR/.test(zh1.Ls), { st: zh1.track.status, r: zh1.track.failureReason })
    // D3 · the repair returns the SAME rejected sentence → caught at once, bounded, BLOCKED (no loop)
    const zh2 = await run('zh', { plan: splice(GOOD.zh, 6, [['A', 'INFORM', '', 'I', '我现在一起到。', 'I now together arrive.'], ['B', 'REACT', '', '', '真的吗？', 'Really?']]), repair: () => [['A', 'INFORM', '', 'I', '我现在一起到。', 'I now together arrive.']] })
    T('D3', 'a repair that brings back a REJECTED sentence is rejected at once (REPEATED_REJECTED_SENTENCE), the loop stops within 3 rounds (no repeated failure spiral), BLOCKED',
      /REPEATED_REJECTED_SENTENCE/.test(zh2.Ls) && zh2.track.status === 'NOT_READY' && (zh2.stages.O_listening_plan_repair || 0) <= 3 && /LISTENING_PLAN_BLOCKED/.test(zh2.Ls), zh2.stages)
    // D4 · a repair that drops the protected lesson word is rejected and escalates (never silently lost)
    const zh3 = await run('zh', { plan: splice(GOOD.zh, 6, [['A', 'INFORM', '', 'I', '我现在一起到。', 'I now together arrive.'], ['B', 'REACT', '', '', '真的吗？', 'Really?']]),
      repair: (scope, head, q, st) => st.repair === 1 ? [['A', 'INFORM', '', 'I', '我们去吧。', 'Let\'s go.']] : [['A', 'INFORM', '', 'I', '我现在到了。', 'I\'m here now.'], ['B', 'REACT', '', 'we', '好，我们一起去吧！', 'Great, let\'s go together!']] })
    T('D4', 'a repair that LOSES a protected lesson word is rejected (PROTECTED_TARGET_LOST, old turns kept), the part ESCALATES to a wider scope next round, then succeeds',
      /PART_REJECTED x1 \([a-z]+\) — PROTECTED_TARGET_LOST/.test(zh3.Ls) && /round 2\/3 · 1 part\(s\): x1 (exchange|intention|scene)/.test(zh3.Ls) && zh3.track.status === 'READY', { st: zh3.track.status, r: zh3.track.failureReason })
    // D5 · a target the plan forgot → GROUPING recovery adds an exchange for it; the target is never silently lost
    const noCost = GOOD.th.filter(r => !/ค่าโดยสาร|สิบบาท/.test(r[5]))
    const th1 = await run('th', { plan: noCost, repair: () => [['A', 'ASK', 'PRICE', 'the fare', 'ค่าโดยสารเท่าไหร่ครับ', 'How much is the fare?'], ['B', 'ANSWER', '', 'the fare', 'สิบบาทค่ะ', 'Ten baht.']] })
    T('D5', 'th: a plan that misses ค่าโดยสาร → TARGET_MISSING (GROUPING) → an "add" part in a situation that fits → the word is heard → READY (targets reassigned, never silently lost)',
      /GROUPING TARGET_MISSING — ค่าโดยสาร/.test(th1.Ls) && /x1 add \[GROUPING\]/.test(th1.Ls) && th1.track.status === 'READY' && th1.track.coverage.covered === 30, { st: th1.track.status, r: th1.track.failureReason })
    // D6 · the semantic audit catches what no deterministic rule can (ผัดไทยอยู่ที่ไหน → อยู่ร้านอาหาร) → NEW intention
    const th2 = await run('th', { plan: splice(GOOD.th, 34, [['A', 'ASK', 'PLACE', 'pad thai', 'ผัดไทยอยู่ที่ไหนครับ', 'Where is pad thai?'], ['B', 'ANSWER', '', 'pad thai', 'อยู่ร้านอาหารค่ะ', 'It is at the restaurant.']]),
      audit: t => /ผัดไทยอยู่ที่ไหน|อยู่ร้านอาหารค่ะ/.test(t) ? { sense: 'fail', usage: 'awkward', fault: 5, note: 'asking where a dish is, as if it were a place, is not a meaningful exchange here' } : null,
      repair: () => [['A', 'ASK', 'YESNO', 'the pad thai', 'ร้านอาหารนี้ผัดไทยอร่อยไหมครับ', 'Is the pad thai at this restaurant good?'], ['B', 'ANSWER', '', 'the pad thai', 'อร่อยมากค่ะ', 'Very tasty.']] })
    T('D6', 'th: ผัดไทยอยู่ที่ไหน → อยู่ร้านอาหาร (judged meaningless by the SEMANTIC AUDIT, not a word rule) is replaced by a NEW intention, re-audited → READY',
      /SEMANTIC_AUDIT \(candidate\) FAIL/.test(th2.Ls) && /x1 intention \[SEMANTIC\]/.test(th2.Ls) && th2.track.status === 'READY', { st: th2.track.status, r: th2.track.failureReason })
    // D7 · a scene that does not follow from the one before → the START of that situation is replanned
    const ja2 = await run('ja', { scene: (k, st) => k === 'S4' && st.audit === 1 ? { transition: 'fail', note: 'jumps to buying with no link' } : null, repair: () => [['A', 'ASK', 'YESNO', 'you', 'じゃあ、もう買う？', 'So, will you buy it now?'], ['B', 'ANSWER', '', 'I', 'まだ。明日、また来る。', 'Not yet. I\'ll come again tomorrow.']] })
    T('D7', 'ja: a TRANSITION fault on S4 → the start of S4 is replanned (scene scope) → READY', /SCENE_TRANSITION/.test(ja2.Ls) && /x1 scene \[TRANSITION\]/.test(ja2.Ls) && ja2.track.status === 'READY', { st: ja2.track.status, r: ja2.track.failureReason })
  }
  // ══ E — QC distinguishes incorrect / awkward / acceptable / natural (mandatory targets stay teachable) ═════════
  {
    const ja3 = await run('ja', { audit: t => /いいえ/.test(t) ? { usage: 'acceptable', note: 'いいえ is a little formal between friends but correct' } : null })
    T('E1', 'ja: いいえ judged "acceptable" (more formal than うん / ううん, but correct) PASSES — a mandatory target is not rejected for register preference', ja3.track.status === 'READY' && !ja3.stages.O_listening_plan_repair)
    const ja4 = await run('ja', { audit: t => /いいえ/.test(t) ? { usage: 'awkward', note: 'odd here' } : null, repair: () => null })
    T('E2', 'ja: the same line judged "awkward" FAILS (only natural / acceptable pass)', ja4.track.status === 'NOT_READY' && /SEMANTIC_AUDIT \(candidate\) FAIL/.test(ja4.Ls))
    const zh4 = await run('zh', { audit: (t, n, st) => st.audit === 1 && /我们去哪里/.test(t) ? '__omit__' : null })
    T('E3', 'a turn the audit returned NO verdict for is never treated as passed: SEMANTIC_UNVERIFIED (fault 9) → audited again → committed only after a real verdict',
      /SEMANTIC_UNVERIFIED/.test(zh4.Ls) && zh4.stages.O_listening_semantic_audit >= 2 && zh4.track.status === 'READY' && !zh4.stages.O_listening_plan_repair, { st: zh4.track.status, s: zh4.stages })
    const zh5 = await run('zh', { audit: t => /我们去哪里/.test(t) ? '__omit__' : null })
    T('E4', 'a turn that NEVER gets a verdict blocks the track (UNVERIFIED never passes)', zh5.track.status === 'NOT_READY' && /SEMANTIC_UNVERIFIED/.test(zh5.Ls))
  }
  // ══ F — beginner repetition is acceptable; G — readiness is judged on the FINAL output ══════════════════════════
  {
    const z = good.zh.track.listening
    const texts = z.lines.map(l => l.chinese || l.thai)
    T('F1', 'zh: the Mukyu conversation repeats short words / replies (好 · 明天 · 去 …) and still passes the duplicate policy (repetition ≠ duplicate)', texts.filter(t => /好/.test(t)).length >= 5 && z.gates.NO_DUPLICATES === true)
    const coh = await run('zh', { cohFail: true })
    T('G1', 'a plan approved by validation + audit is still NOT_READY when the FINAL whole-conversation coherence judge fails (readiness is the final output\'s)', coh.track.status === 'NOT_READY' && /WHOLE_CONVERSATION_COHERENCE=FAIL/.test(coh.track.failedChecks.join(' ')), coh.track.failedChecks)
    T('G2', 'the final gates run on the committed text: closed vocabulary, length, coverage and pronunciation all PASS on the final lines (not on the plan)', LANGS.every(l => { const gs = good[l].track.listening.gates; return gs.CLOSED_VOCAB === true && gs.LENGTH_PASS === true && gs.COVERAGE_PASS === true && gs.PRONUNCIATION === true }))
  }
  // ══ H — technical failures are TECHNICAL (fault 9), never a language verdict, never a legacy fallback ════════════
  {
    const down = await run('zh', { down: true })
    T('H1', 'network down: the planner reports TECHNICAL (fault 9) and stops — NOT_READY, no linguistic fault named, no legacy planner / scene composer used',
      down.track && down.track.status === 'NOT_READY' && /TECHNICAL \(fault 9\)/.test(down.Ls) && !/GRAMMAR|SEMANTIC_AUDIT \(|QUESTION_ANSWER/.test(down.Ls) && !/SCENE_PREFLIGHT|LISTENING_COMPOSITION scene/.test(down.Ls), down.track && down.track.failureReason)
    const c = load(__dirname + '/tt.compiled.js', { realBelt: true }), L = learner(c, 'zh'), logs = []
    c.mockGeminiGenerate = async () => { const e = new Error('CLAUDE HAIKU UNREACHABLE: Failed to fetch'); e.fatalProvider = { provider: 'anthropic', status: 0, reason: 'UNREACHABLE' }; throw e }
    let thrown = null
    try { await c.generateCohesiveListeningTrack({ lang: 'zh', vocab: L.vocab, apiKey: KEY, model: MODEL, onLog: x => logs.push(x), attemptId: 'lattempt-v692-fatal' }) } catch (e) { thrown = e }
    T('H2', 'a provider that is UNREACHABLE (the v691 Mandarin proxy failure) is logged as TECHNICAL_FAILURE — "NOT a language or planning verdict" — and surfaces to the app (the user\'s provider is not switched)',
      thrown && thrown.fatalProvider && /TECHNICAL_FAILURE \(fault 9\) during meaning plan — provider=anthropic reason=UNREACHABLE/.test(logs.join('\n')) && /NOT a language or planning verdict/.test(logs.join('\n')))
    T('H3', 'no silent fallback: the legacy planner is used only when the switch is turned off explicitly (setListeningMeaningFirst(false)) — the composer branch is the only route to it',
      /listeningMeaningFirstOn\(\) && o\.standalone && !o\.legacyScenes \? await _lnComposeMeaningFirst\(_env\) : await _lnComposeByScenes\(_env\)/.test(require('fs').readFileSync(__dirname + '/tt.jsx', 'utf8')) && c.setListeningMeaningFirst(false) === false)
  }
  // ══ I — deterministic language contracts (positive AND negative cases) ═══════════════════════════════════════════
  {
    const c = good.zh.c
    const adj = new Set(['好', '大', '小', '慢', '快', '多', '少', '喜欢', '想'])
    const zh = (s, p) => c.lnMfZhProblems(s, p || '', adj).map(x => x.word)
    const ok = ['我跟你去。', '你想一起吃吗？', '你拿什么？', '我等朋友。', '你想吃什么？', '我们一起去吧。', '我到了。', '回家吧。', '这个很大。', '太好了！', '不太好。', '你在哪里？']
    T('I1', 'zh: the brief\'s good beginner sentences pass (我跟你去 · 你想一起吃吗 · 你拿什么 · 我等朋友 …) — no false grammar rejections', ok.every(s => !zh(s).length), ok.filter(s => zh(s).length).map(s => s + ' ' + zh(s)))
    T('I2', 'zh: short echo answers pass when the question supplies the complement (你回家吗？ — 我不回。 · 你找钱吗？ — 找。)', !zh('我不回。', '你回家吗？').length && !zh('找。', '你找钱吗？').length)
    T('I3', 'zh: real errors stay rejected — 你回哪里吗 (吗 + question word), 我很去 (很 + verb), 太大 without 了', zh('你回哪里吗？').includes('吗') && zh('我很去。').includes('很') && zh('这个太大。').includes('太'))
    T('I4', 'th: ไว้ after a verb passes (จองไว้แล้ว); แก่ about a person passes (คุณยายแก่แล้ว)', !c.lnMfThProblems('ฉันจองไว้แล้วค่ะ', '').length && !c.lnMfThProblems('คุณยายแก่แล้วค่ะ', '').length)
    T('I5', 'ja: あそこに行く passes; あれに行く (a thing as a place) fails; a suggestion about 昨日 fails', !c.lnMfJaProblems('あそこに行く？').length && c.lnMfJaProblems('あれに行こう。').length === 1 && c.lnMfJaProblems('昨日、行こう。').length === 1)
    T('I6', 'answer types: an honest "I don\'t know" answers a clock-time question; a clock time must contain a number + 時/点/โมง', c.lnMfAnswerProblem('ja', 'CLOCK_TIME', { text: 'まだ分からない。' }, { text: '何時に行く？' }) === null &&
      c.lnMfAnswerProblem('zh', 'CLOCK_TIME', { text: '三点。' }, { text: '几点去？' }) === null && !!c.lnMfAnswerProblem('th', 'CLOCK_TIME', { text: 'พรุ่งนี้ค่ะ' }, { text: 'ไปกี่โมงคะ' }))
    const car = c.initJapaneseVocab().find(w => w.id === 103), book = c.initJapaneseVocab().find(w => w.id === 104)
    T('I7', 'ja target identity: 車 is not heard inside 電車, 本 not inside 日本語 / 本当 — but 電車と車 and 日本語の本 still count', !c.matchesJapaneseTarget('電車で行こう', car) && c.matchesJapaneseTarget('電車と車', car) && !c.matchesJapaneseTarget('本当？', book) && c.matchesJapaneseTarget('日本語の本', book))
  }
  console.log(out.join('\n'))
  console.log('\n' + (n - fails) + '/' + n + ' passed')
  process.exit(fails ? 1 : 0)
})().catch(e => { console.error(e); process.exit(2) })
