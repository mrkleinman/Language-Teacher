// v692 — MEANING-FIRST LISTENING PLANNER regression (Thai · Japanese · Mandarin), on the DEFAULT development path.
// Every check runs the app's real generateCohesiveListeningTrack → selection → profile → situation grouping → plan →
// deterministic validation (A–E) → semantic audit → fault-classified recovery → commit → the shared final gates. Only the
// model's REPLIES are scripted (benchmark/v692/mock.js), at the transport boundary — planning and validation are never
// bypassed. Learners: the three v691 Listening runs of 13 Oct (target ids from the owner's logs; benchmark/v692/learners.js).
// A mocked success proves the PIPELINE, not the teaching quality of what the real model will write.
// v694 (section J): the plan is requested ONE SITUATION AT A TIME (compact format, bounded output); learners and model replies
// modelled on the three v693 runs (benchmark/v692/learners.js V693_IDS · benchmark/v694/plans.js, incl. the plan Claude Haiku
// actually returned for the Japanese v693 run).
'use strict'
const SRC_TT = require('fs').readFileSync(__dirname + '/tt.jsx', 'utf8')
const { load } = require('./harness')
const { learner, V691_IDS, V693_IDS, V693_DEFERRED } = require('./benchmark/v692/learners')
const { GOOD693, JA_V693 } = require('./benchmark/v694/plans')
const { GOOD, V691_BAD } = require('./benchmark/v692/plans')
const { mockMeaningFirst } = require('./benchmark/v692/mock')
const out = []; let n = 0, fails = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + id.padEnd(5) + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 900) : '')) }
const KEY = 'AIzaSyTEST-harness-key-000000', MODEL = 'gemini-2.5-flash-lite'
const LANGS = ['th', 'ja', 'zh']
const count = a => a.reduce((m, s) => (m[s] = (m[s] || 0) + 1, m), {})
async function run(lang, opt = {}, extra = {}, lopt) {
  const c = load(__dirname + '/tt.compiled.js', { realBelt: true })
  const defaultOn = c.listeningMeaningFirstOn()
  const L = learner(c, lang, lopt)
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
const SALV = x => ({ st: x.track.status, fc: x.track.failedChecks, cov: x.track.coverage, salv: (x.Ls.match(/[^\n]*(LISTENING_SALVAGE|SALVAGE_FLOOR|LISTENING_SALVAGED|PLAN_BLOCKED|STORY_JUDGE)[^\n]*/g) || []).map(l => l.slice(0, 400)) })

;(async () => {
  if (process.env.T49_ONLY !== 'K') {
  // ══ A — the DEFAULT path: meaning-first, all three languages READY on the v691 regression learners ═════════════
  const good = {}
  for (const lang of LANGS) good[lang] = await run(lang)
  for (const lang of LANGS) {
    const g = good[lang], tr = g.track
    T('A1-' + lang, lang + ': the meaning-first planner is the DEFAULT (no switch set) and ran — PLANNER log, one plan request per situation (v694) + the audit stage, architecture meaning-first-v692; no legacy scene composer, no legacy preflight',
      g.defaultOn === true && /LISTENING_PLANNER planner=meaning-first-3/.test(g.Ls) && g.stages.O_listening_meaning_plan === (g.Ls.match(/LISTENING_SITUATION S\d/g) || []).length && g.stages.O_listening_semantic_audit >= 1 && !g.stages.O_listening_scene &&
      !/SCENE_PREFLIGHT|LISTENING_VERBALIZABILITY PROVEN|LISTENING_COMPOSITION scene/.test(g.Ls) && tr.listening && tr.listening.architecture === 'meaning-first-v692', { stages: g.stages, arch: tr && tr.listening && tr.listening.architecture })
    T('A2-' + lang, lang + ': READY with 30/30 targets heard, every final gate passing, 24–44 turns, ≤3 targets per turn, both speakers', tr.status === 'READY' && tr.coverage.covered === 30 && tr.failedChecks.length === 0 &&
      tr.listening.lines.length >= 24 && tr.listening.lines.length <= 44 && tr.listening.gates.MAX_TARGETS_PER_TURN <= 3 && tr.listening.gates.BOTH_SPEAKERS, { status: tr.status, cov: tr.coverage, failed: tr.failedChecks })
    T('A3-' + lang, lang + ': exactly 30 selected revision targets, 0 new; SRS history / status / due dates of every word unchanged by the run', tr.selectedTargetIds.length === 30 && tr.targetCounts.newTargetCount === 0 && g.srsUntouched)
    T('A4-' + lang, lang + ': the plan was proven before commit — STRUCTURAL_VALIDATION PASS and SEMANTIC_AUDIT PASS, then SCENE_ACCEPTED / SCENE_COMMITTED, MEANING_PLAN_VALIDATED gate PASS',
      /STRUCTURAL_VALIDATION \(candidate\) PASS/.test(g.Ls) && /SEMANTIC_AUDIT \(candidate\) PASS/.test(g.Ls) && /state=APPROVED/.test(g.Ls) && /SCENE_ACCEPTED LS1/.test(g.Ls) && /SCENE_COMMITTED LS1/.test(g.Ls) && tr.listening.gates.MEANING_PLAN_VALIDATED === 'PASS')
    // v694: the plan is requested one situation at a time (v693's single whole-conversation request hit the 16000-token cap)
    const nSit = (g.Ls.match(/LISTENING_SITUATION S\d/g) || []).length
    T('A5-' + lang, lang + ': situations + 2 model calls in all (1 plan request per situation · 1 semantic audit · 1 final coherence judge) — no re-plans, no repair calls when the plan is valid',
      nSit >= 4 && g.stages.O_listening_meaning_plan === nSit && g.stages.O_listening_semantic_audit === 1 && (g.stages.O_listening_coherence || 0) === 1 && !g.stages.O_listening_plan_repair && /LISTENING_MF_SCENE_REPLANS=0/.test(g.Ls), { nSit, stages: g.stages })
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
    // v700 SALVAGE: a defective exchange that survives the repair rounds is CUT (its lesson words, if heard nowhere else, are moved to
    // Revision) — the track is never thrown away for it, and a defective line is still never committed
    const finalTexts = x => x.track.listening ? x.track.listening.lines.map(l => l.thai || l.japanese || l.chinese) : []
    const badTexts = { th: V691_BAD.th.map(r => r[4]), ja: V691_BAD.ja.map(r => r[4]), zh: V691_BAD.zh.map(r => r[4]) }
    T('C10', 'no defective line is committed: every v691 defective sentence is absent from the final text — the run is either SALVAGED (cut, re-checked, READY with every remaining line passing) or BLOCKED (NOT_READY) — and NO legacy fallback (no scene composer, no preflight)',
      LANGS.every(l => !finalTexts(bad[l]).some(t => badTexts[l].includes(t)) && ((bad[l].track.status === 'READY' && /LISTENING_SALVAGE_OK/.test(bad[l].Ls)) || (bad[l].track.status === 'NOT_READY' && /LISTENING_PLAN_BLOCKED/.test(bad[l].Ls))) &&
        !/SCENE_PREFLIGHT|LISTENING_COMPOSITION scene/.test(bad[l].Ls) && !bad[l].stages.O_listening_scene),
      LANGS.map(l => SALV(bad[l])))
    T('C11', 'the salvage names what it cut and why (fault class per cut line), states which lesson words move to Revision, and checks the rest again with the same checks — no paid scene generation',
      LANGS.every(l => /LISTENING_SALVAGE \(after [^\n]*\((GRAMMAR|SEMANTIC|QUESTION_ANSWER|SURFACE)\)[^\n]*moved to Revision: [^\n]*the remaining turns are validated and audited again/.test(bad[l].Ls) && !bad[l].stages.O_listening_scene), LANGS.map(l => SALV(bad[l]).salv[0]))
  }
  // ══ D — RECOVERY by fault class ═══════════════════════════════════════════════════════════════════════════════
  {
    // D1 · a QUESTION_ANSWER fault → the WHOLE exchange is repaired (one call), re-validated and re-audited → READY
    const ja1 = await run('ja', { plan: splice(GOOD.ja, 7, V691_BAD.ja.slice(0, 2)), repair: () => [['A', 'ASK', 'TIME', 'we', 'いつ行く？', 'When shall we go?'], ['B', 'ANSWER', '', 'we', '明日、行こう。', 'Let\'s go tomorrow.']] })
    // v694: with no number words 何時 is an INFEASIBLE INTENTION on any turn — the part is repaired at the INTENTION level (a
    // different question), not as a surface / answer patch of the same clock-time question
    T('D1', 'ja: 何時→明日 is caught as ANSWER_TYPE + INFEASIBLE_INTENTION, repaired as a new INTENTION (いつ→明日), passes both gates, READY — 1 repair call, every other turn kept',
      ja1.track.status === 'READY' && /SCENE_LOCAL_CHECK S\d FAIL[^\n]*INFEASIBLE_INTENTION/.test(ja1.Ls) && /MEANING_REPAIR round 1\/3 · 1 part\(s\): x1 intention \[[A-Z_+]*QUESTION_ANSWER/.test(ja1.Ls) && /PART_REPAIRED x1 \(intention/.test(ja1.Ls) && ja1.stages.O_listening_plan_repair === 1, { st: ja1.track.status, r: ja1.track.failureReason, s: ja1.stages })
    // D2 · a GRAMMAR fault → a line repair keeps the protected lesson words
    const zh1 = await run('zh', { plan: splice(GOOD.zh, 6, [['A', 'INFORM', '', 'I', '我现在一起到。', 'I now together arrive.'], ['B', 'REACT', '', '', '真的吗？', 'Really?']]), repair: () => [['A', 'INFORM', '', 'I', '我现在到了。', 'I\'m here now.'], ['B', 'REACT', '', 'we', '好，我们一起去吧！', 'Great, let\'s go together!']] })
    T('D2', 'zh: 我现在一起到 (GRAMMAR + more than 3 lesson words) → repaired into two turns (我现在到了 / 好，我们一起去吧) keeping 现在 + 一起 + 到 → READY', zh1.track.status === 'READY' && /PART_REPAIRED x1 \([a-z]+ · [A-Z+_]*GRAMMAR/.test(zh1.Ls), { st: zh1.track.status, r: zh1.track.failureReason })
    // D3 · the repair returns the SAME rejected sentence → caught at once, bounded, BLOCKED (no loop)
    const zh2 = await run('zh', { plan: splice(GOOD.zh, 6, [['A', 'INFORM', '', 'I', '我现在一起到。', 'I now together arrive.'], ['B', 'REACT', '', '', '真的吗？', 'Really?']]), repair: () => [['A', 'INFORM', '', 'I', '我现在一起到。', 'I now together arrive.']] })
    T('D3', 'a repair that brings back a REJECTED sentence is rejected at once (REPEATED_REJECTED_SENTENCE), the loop stops within 3 rounds (no repeated failure spiral); v700: the exchange is then CUT by the salvage — 我现在一起到 never reaches the final text',
      /REPEATED_REJECTED_SENTENCE/.test(zh2.Ls) && (zh2.stages.O_listening_plan_repair || 0) <= 3 && !(zh2.track.listening ? zh2.track.listening.lines : []).some(l => /我现在一起到/.test(l.chinese || '')) &&
        ((zh2.track.status === 'READY' && /LISTENING_SALVAGE \(after[^\n]*我现在一起到/.test(zh2.Ls)) || (zh2.track.status === 'NOT_READY' && /LISTENING_PLAN_BLOCKED/.test(zh2.Ls))), SALV(zh2))
    // D4 · a repair that drops the protected lesson word is rejected and escalates (never silently lost)
    const zh3 = await run('zh', { plan: splice(GOOD.zh, 6, [['A', 'INFORM', '', 'I', '我现在一起到。', 'I now together arrive.'], ['B', 'REACT', '', '', '真的吗？', 'Really?']]),
      repair: (scope, head, q, st) => st.repair === 1 ? [['A', 'INFORM', '', 'I', '我们去吧。', 'Let\'s go.']] : [['A', 'INFORM', '', 'I', '我现在到了。', 'I\'m here now.'], ['B', 'REACT', '', 'we', '好，我们一起去吧！', 'Great, let\'s go together!']] })
    T('D4', 'a repair that LOSES a protected lesson word is rejected (PROTECTED_TARGET_LOST, old turns kept), the part ESCALATES to a wider scope next round, then succeeds',
      /PART_REJECTED x1 \([a-z]+\) — PROTECTED_TARGET_LOST/.test(zh3.Ls) && /round 2\/3 · 1 part\(s\): x1 (exchange|intention|scene)/.test(zh3.Ls) && zh3.track.status === 'READY', { st: zh3.track.status, r: zh3.track.failureReason })
    // D4b · v697 (live Haiku relay, Japanese run 3): a patch rejected for an UNKNOWN WORD gets one corrected retry in the same
    // round, told the exact reason and shown its rejected version; the retry is applied → READY in one round
    const zh4 = await run('zh', { plan: splice(GOOD.zh, 6, [['A', 'INFORM', '', 'I', '我现在一起到。', 'I now together arrive.'], ['B', 'REACT', '', '', '真的吗？', 'Really?']]),
      repair: (scope, head, q, st) => st.repair === 1 ? [['A', 'INFORM', '', 'we', '我们现在一起到咖啡馆了。', 'We\'ve arrived at the café together now.']] : [['A', 'INFORM', '', 'we', '我们现在一起到了。', 'We\'ve arrived together now.']] })
    const zr = zh4.st.calls.filter(x => x.stage === 'O_listening_plan_repair')
    T('D4b', 'a patch rejected for an unknown word (CLOSED_VOCAB) is retried ONCE in the same round with the exact reason and its rejected version → applied → READY in ONE round (2 repair calls)',
      /PART_REJECTED x1 \([a-z]+\) — PATCH_INVALID — CLOSED_VOCAB/.test(zh4.Ls) && /PATCH_RETRY round \d+ · x1/.test(zh4.Ls) && zr.length >= 2 && /YOUR LAST VERSION OF THIS PART WAS REJECTED[^\n]*CLOSED_VOCAB/.test(zr[1].prompt) && /rejected version: 我们现在一起到咖啡馆了。/.test(zr[1].prompt) &&
      /PART_REPAIRED x1 \(line/.test(zh4.Ls) && zr.length === 2 && !/MEANING_REPAIR round 2/.test(zh4.Ls) && zh4.track.status === 'READY', { st: zh4.track.status, r: zh4.track.failureReason, n: zr.length })
    // D4c · v697 (live Haiku relay, Mandarin run 3: a boundary patch came back A / B / B / A): a patch whose own turns put one
    // speaker twice in a row is rejected (SPEAKER_ALTERNATION) and retried with that reason → the alternating version is applied
    const ja5 = await run('ja', { plan: splice(GOOD.ja, 7, V691_BAD.ja.slice(0, 2)), repair: (scope, head, q, st) => st.repair === 1
      ? [['A', 'ASK', 'TIME', 'we', 'いつ行く？', 'When shall we go?'], ['A', 'ANSWER', '', 'we', '明日、行こう。', 'Let\'s go tomorrow.']]
      : [['A', 'ASK', 'TIME', 'we', 'いつ行く？', 'When shall we go?'], ['B', 'ANSWER', '', 'we', '明日、行こう。', 'Let\'s go tomorrow.']] })
    const jr = ja5.st.calls.filter(x => x.stage === 'O_listening_plan_repair')
    T('D4c', 'a patch whose own turns put one speaker twice in a row (A / A) is rejected (SPEAKER_ALTERNATION), retried once with "the speakers alternate", and the A / B version is applied → READY',
      /PART_REJECTED x1 \([a-z]+\) — PATCH_INVALID — [^\n]*SPEAKER_ALTERNATION/.test(ja5.Ls) && jr.length === 2 && /the speakers alternate/.test(jr[1].prompt) && /PART_REPAIRED x1/.test(ja5.Ls) && ja5.track.status === 'READY', { st: ja5.track.status, r: ja5.track.failureReason, n: jr.length })
    // D4d · v697 (live Haiku relay, Mandarin run 4): 到朋友的地方 failed "到 needs a place" twice — a possessor + place noun is a place
    { const c = load(__dirname + '/tt.compiled.js', { realBelt: true }), adj = new Set(['大', '好', '小']), w = t => (c.lnMfZhProblems(t, '', adj) || []).map(x => x.word)
      T('D4d', 'zh: 到 + a possessor + place noun is a place (到朋友的地方吧 · 到他家吗 · 我们到朋友家了 pass); a bare 到 still fails (我到。· 我现在一起到。)',
        !w('到朋友的地方吧。').includes('到') && !w('到他家吗？').includes('到') && !w('我们到朋友家了。').includes('到') && w('我到。').includes('到') && w('我现在一起到。').includes('到')) }
    // D4e · v699 (live relay run 6, Japanese): an apology answered by an acknowledgement + a follow-up question was rejected three
    // repair rounds running ("ごめん、昨日、来なかった。" → "うん、分かった。なんで来なかったの？") and blocked the whole track
    { const c = load(__dirname + '/tt.compiled.js', { realBelt: true }), q = (a, b) => c.listeningQtypeIssue(a, b, false, true)
      T('D4e', 'an apology may be answered by an acknowledgement + a question about it ("Yeah, got it. Why didn\'t you come?" · "Why?" pass); a question that ignores the apology still fails ("Do you like movies?" · "Shall we go by train?")',
        q("Sorry, I didn't come yesterday.", "Yeah, got it. Why didn't you come?") === null && q("Sorry, I didn't eat with you yesterday.", 'Why?') === null &&
        /APOLOGY expects/.test(q("Sorry, I'm late.", 'Do you like movies?') || '') && /APOLOGY expects/.test(q('Sorry.', 'Shall we go by train?') || '')) }
    // D4f · v700 (live v699 Thai, 15 Oct): repair parts that overlapped (a scene part T37–T40 and an exchange part T40) rewrote the same
    // turn, and the corrected retry of one pointed at a turn the other had replaced — it crashed ("reading 'n'") in two of three rounds
    { const c = load(__dirname + '/tt.compiled.js', { realBelt: true })
      const Tu = (n, sp, scene, resp) => ({ id: 't' + n, n, speaker: sp, scene, targetIds: [n], intent: 'INFORM', respondsToId: resp || null })
      const flat = [Tu(35, 'A', 'S5'), Tu(36, 'B', 'S5', 't35'), Tu(37, 'A', 'S6'), Tu(38, 'B', 'S6', 't37'), Tu(39, 'A', 'S6', 't38'), Tu(40, 'B', 'S6')]
      const mp = { flat, scenes: [{ key: 'S5', situation: 'EAT', turns: flat.slice(0, 2), targetIds: [35, 36] }, { key: 'S6', situation: 'PART', turns: flat.slice(2), targetIds: [37, 38, 39, 40] }] }
      const env = { mf: { attempts: new Map(), moves: new Map(), released: new Set() }, byId: new Map(flat.map(t => [t.n, { surface: 'w' + t.n, gloss: 'g' }])), mfProfiles: new Map(), turnsMax: 44, log: () => {} }
      const sc = c.lnMfScopes(env, mp, [{ fault: 6, code: 'SEMANTIC_AUDIT', turnIds: ['t38', 't39'], detail: 'x' }, { fault: 6, code: 'SEMANTIC_AUDIT', turnIds: ['t40'], detail: 'x' }, { fault: 7, code: 'SCENE_INCOHERENT', turnIds: ['t37', 't38', 't39', 't40'], detail: 'x' }])
      const overlap = sc.some((a, i) => sc.some((b, j) => j > i && a.kind !== 'add' && b.kind !== 'add' && a.turnIds.some(id => b.turnIds.includes(id))))
      T('D4f', 'repair parts never overlap: a scene part (T37–T40) and an exchange part (T40) of the same situation become ONE part — no turn is rewritten twice, the corrected retry never points at a replaced turn',
        !overlap && sc.length === 1 && sc[0].kind === 'scene' && sc[0].turnIds.join() === 't37,t38,t39,t40' && /PATCH_RETRY_SKIPPED/.test(SRC_TT), sc.map(s => [s.id, s.kind, s.turnIds])) }
    // D4g · v700 (live v699 Thai): เชิญนั่ง "please sit" was grouped into the goodbye and แล้วคุยกัน "talk later" into "agreeing when" —
    // neither can be said there, and no repair could save them. Hosting phrases go where someone arrives / sits down; "talk later" parts.
    { const c = load(__dirname + '/tt.compiled.js', { realBelt: true }), S = c.ev('LN_MF_SITUATIONS'), pr = (th, en) => { const t = { id: 1, surface: th, gloss: en, english: en }; t.role = c.listeningTargetRole(t, 'th'); return c.lnMfProfile(t, 'th') }
      const best = p => S.map(s => [s.key, c.lnMfSituationScore(p, s)]).sort((a, b) => b[1] - a[1])
      const sit = best(pr('เชิญนั่ง', 'please sit')), talk = best(pr('แล้วคุยกัน', 'talk later')), appt = best(pr('มีนัดกับ', 'have an appointment with'))
      T('D4g', 'situations a word can be said in: "please sit" fits meeting / eating, never the goodbye; "talk later" fits the goodbye (a parting phrase); "have an appointment" fits agreeing a time or the goodbye',
        ['MEET', 'EAT'].includes(sit[0][0]) && sit[0][1] >= 2 && sit.find(x => x[0] === 'PART')[1] < 2 && talk[0][0] === 'PART' && talk.find(x => x[0] === 'TIME')[1] < 0 && ['TIME', 'PART'].includes(appt[0][0]), { sit: sit.slice(0, 3), talk: talk.slice(0, 3), appt: appt.slice(0, 3) }) }
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
    T('E2', 'ja: the same line judged "awkward" FAILS (only natural / acceptable pass) — v700: it never reaches the final text (cut by the salvage, its lesson word moved to Revision if heard nowhere else) or the track is NOT_READY',
      /SEMANTIC_AUDIT \(candidate\) FAIL/.test(ja4.Ls) && (ja4.track.status === 'NOT_READY' || (/LISTENING_SALVAGE \(after[^\n]*いいえ/.test(ja4.Ls) && !(ja4.track.listening ? ja4.track.listening.lines : []).some(l => /いいえ/.test(l.japanese || '')))), SALV(ja4))
    const zh4 = await run('zh', { audit: (t, n, st) => st.audit === 1 && /我们去哪里/.test(t) ? '__omit__' : null })
    T('E3', 'a turn the audit returned NO verdict for is never treated as passed: SEMANTIC_UNVERIFIED (fault 9) → audited again → committed only after a real verdict',
      /SEMANTIC_UNVERIFIED/.test(zh4.Ls) && zh4.stages.O_listening_semantic_audit >= 2 && zh4.track.status === 'READY' && !zh4.stages.O_listening_plan_repair, { st: zh4.track.status, s: zh4.stages })
    const zh5 = await run('zh', { audit: t => /我们去哪里/.test(t) ? '__omit__' : null })
    T('E4', 'a turn that NEVER gets a verdict never passes (UNVERIFIED is not a pass): it is cut by the salvage and absent from the final text, or the track is NOT_READY',
      /SEMANTIC_UNVERIFIED/.test(zh5.Ls) && !(zh5.track.listening ? zh5.track.listening.lines : []).some(l => /我们去哪里/.test(l.chinese || '')) && (zh5.track.status === 'NOT_READY' || /LISTENING_SALVAGE \(after[^\n]*我们去哪里/.test(zh5.Ls)), SALV(zh5))
  }
  // ══ F — beginner repetition is acceptable; G — readiness is judged on the FINAL output ══════════════════════════
  {
    const z = good.zh.track.listening
    const texts = z.lines.map(l => l.chinese || l.thai)
    T('F1', 'zh: the Mukyu conversation repeats short words / replies (好 · 明天 · 去 …) and still passes the duplicate policy (repetition ≠ duplicate)', texts.filter(t => /好/.test(t)).length >= 5 && z.gates.NO_DUPLICATES === true)
    const coh = await run('zh', { cohFail: true })
    T('G1', 'a plan approved by validation + audit is still NOT_READY when the FINAL whole-conversation coherence judge fails every part (readiness is the final output\'s; v700: the salvage cannot keep any part, so the floor stops it)',
      coh.track.status === 'NOT_READY' && (/WHOLE_CONVERSATION_COHERENCE=FAIL/.test(coh.track.failedChecks.join(' ')) || /LISTENING_PLAN_BLOCKED — SALVAGE_FLOOR/.test(coh.Ls)), SALV(coh))
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
      thrown && thrown.fatalProvider && /TECHNICAL_FAILURE \(fault 9\) during meaning plan \(situation S1\) — provider=anthropic reason=UNREACHABLE/.test(logs.join('\n')) && /NOT a language or planning verdict/.test(logs.join('\n')))
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
  // ══ J — v694: PLAN ONE SITUATION AT A TIME, on learners modelled on the three v693 runs ═══════════════════════════
  {
    const L693 = lang => ({ dueIds: V693_IDS[lang].concat(V693_DEFERRED[lang]) })
    const sceneRows = (rows, key) => rows.filter(r => r[0] === key).map(r => r.slice(1))
    const planCalls = g => g.st.calls.filter(x => x.stage === 'O_listening_meaning_plan')
    const g693 = {}
    for (const lang of LANGS) g693[lang] = await run(lang, { plan: GOOD693[lang] }, {}, L693(lang))
    for (const lang of LANGS) {
      const g = g693[lang], tr = g.track, nSit = (g.Ls.match(/LISTENING_SITUATION S\d/g) || []).length, pc = planCalls(g)
      // demonstrations 1 · 2 · 3 · 5 · 12
      T('J1-' + lang, lang + ' (v693 learner): READY 30/30 from ONE request per situation — ' + nSit + ' plan requests, each for exactly one situation, each with a bounded budget (≤ 2700 tokens — v695 added the separate pron field so a romanisation has its own place instead of the sentence field; v693 asked 7000 for everything), the compact turn format (no addressee / context / expects fields), every situation after the first sees the turns before it',
        tr.status === 'READY' && tr.coverage.covered === 30 && tr.failedChecks.length === 0 && pc.length === nSit && nSit >= 4 &&
        pc.every(x => x.max <= 2700 && (x.prompt.match(/^PLAN SITUATION S\d+ of/gm) || []).length === 1 && /"turns":\[\{"speaker"/.test(x.prompt) && !/"addressee"|"expects"|"context"/.test(x.prompt)) &&
        pc.slice(1).every(x => /^SO FAR/m.test(x.prompt)) && !/^SO FAR/m.test(pc[0].prompt), { status: tr.status, failed: tr.failedChecks, n: pc.length, nSit, max: pc.map(x => x.max) })
      T('J2-' + lang, lang + ': the situations ASSEMBLE into one conversation — every situation passed its local check, then ONE whole-conversation validation + semantic audit, then the final gates on the final text (24–44 turns, ≤3 targets per turn, closed vocabulary, both speakers, final coherence judge)',
        (g.Ls.match(/SCENE_LOCAL_CHECK S\d STATUS=PASS ·/g) || []).length === nSit && /STRUCTURAL_VALIDATION \(candidate\) PASS/.test(g.Ls) && /SEMANTIC_AUDIT \(candidate\) PASS/.test(g.Ls) && g.stages.O_listening_semantic_audit === 1 && g.stages.O_listening_coherence === 1 &&
        tr.listening.lines.length >= 24 && tr.listening.lines.length <= 44 && tr.listening.gates.MAX_TARGETS_PER_TURN <= 3 && tr.listening.gates.CLOSED_VOCAB === true && tr.listening.gates.BOTH_SPEAKERS && tr.listening.gates.ONE_CONVERSATION === 'PASS', tr.listening && tr.listening.gates)
    }
    // A5 · the deferral review against the run's own vocabulary (demonstration 9)
    {
      const th = g693.th, ja = g693.ja, zh = g693.zh
      const covered = (g, id) => !!(g.track && g.track.listening) && g.track.listening.coverage.rows.some(r => r.targetId === id && r.status === 'COVERED')
      T('J3', 'deferral review: เพราะ (because), 話す (speak), 做 (do) — deferred in v693 because no situation pattern covered them — are now SELECTED and heard in the final text (เพราะเดินมากค่ะ · 日本語で話した · 你回家做什么); いくら / 何時 / 多少 stay DEFERRED (no number words), ขนาด stays deferred (its shop / looking situations are not in this conversation) — every deferral keeps its SRS obligation, and the run changes no SRS data',
        th.track.selectedTargetIds.includes(676) && covered(th, 676) && ja.track.selectedTargetIds.includes(36) && covered(ja, 36) && zh.track.selectedTargetIds.includes(49) && covered(zh, 49) &&
        /LISTENING_TARGET_DEFERRED target=1524 ขนาด[^\n]*srsObligationPreserved=true/.test(th.Ls) && /target=22 いくら[^\n]*srsObligationPreserved=true/.test(ja.Ls) && /target=45 何時[^\n]*srsObligationPreserved=true/.test(ja.Ls) && /target=29 多少[^\n]*srsObligationPreserved=true/.test(zh.Ls) &&
        !/TARGET_DEFERRED target=(676|36|49) /.test(th.Ls + ja.Ls + zh.Ls) && th.srsUntouched && ja.srsUntouched && zh.srsUntouched && LANGS.every(l => g693[l].track.targetCounts.newTargetCount === 0),
        { th: th.track.selectedTargetIds.includes(676), ja: ja.track.selectedTargetIds.includes(36), zh: zh.track.selectedTargetIds.includes(49) })
      T('J4', 'Thai has number words: นานเท่าไหร่ (how long) → ยี่สิบนาที is a feasible question (no INFEASIBLE_INTENTION); feasibility is decided by the learner\'s words, not by question type alone', !/INFEASIBLE_INTENTION/.test(th.Ls) && th.track.status === 'READY')
    }
    // the plan Claude Haiku actually returned for the Japanese v693 run (demonstrations 6 · 7 · 11); the replans are a little
    // shorter than GOOD693 so that v693's long S2 (11 turns) still fits the 24–44 budget
    const JA_REPLAN = GOOD693.ja.filter(r => !['大丈夫。好きな本だから。', 'ありがとう。', 'うん、じゃあね。'].includes(r[5]))
    {
      const ja = await run('ja', { plan: (n, q, key, replan) => replan ? JA_REPLAN : JA_V693 }, {}, L693('ja'))
      const finals = ja.track.listening ? ja.track.listening.lines.map(l => l.japanese) : []
      T('J5', 'ja v693 plan: the situation checks catch what v693 only found after a full plan — なる / 二千 (unauthorised) in S1 / S5 and これ、いくら？ as an INFEASIBLE INTENTION (an UNTARGETED line asking a price with no number words) — each defective situation is REPLANNED once, the replans pass, READY with 0 repair calls',
        /SCENE_LOCAL_CHECK S1 FAIL[^\n]*なる/.test(ja.Ls) && /SCENE_LOCAL_CHECK S5 FAIL[^\n]*INFEASIBLE_INTENTION[^\n]*いくら/.test(ja.Ls) && /SCENE_LOCAL_CHECK S5 \(replan\) PASS · the replanned version is kept/.test(ja.Ls) &&
        ja.track.status === 'READY' && !ja.stages.O_listening_plan_repair && /LISTENING_MF_SCENE_REPLANS=2/.test(ja.Ls) && !finals.some(t => /いくら|二千|なる/.test(t)), { st: ja.track.status, r: ja.track.failureReason, scenes: ja.st.scenes })
      T('J6', 'validated situations are NOT regenerated: S2–S4 of the v693 plan passed their checks and were requested once each — their turns are in the final conversation word for word',
        ['S2', 'S3', 'S4'].every(k => ja.st.scenes.filter(x => x === k).length === 1 && !ja.st.scenes.includes(k + 'r')) && ['S2', 'S3', 'S4'].every(k => sceneRows(JA_V693, k).every(r => finals.includes(r[4]))), ja.st.scenes)
      // the replan brings the price question back with an honest "I don't know"; the repair brings it back AGAIN → the same
      // failure signature escalates (intention → scene) and the rejected sentence never returns
      const priceS5 = sceneRows(JA_REPLAN, 'S5'); priceS5.splice(1, 0, ['A', 'ASK', 'PRICE', 'this', 'これ、いくら？', 'How much is this?'], ['B', 'ANSWER', '', 'this', '分からない。', 'I don\'t know.'])
      const ja2 = await run('ja', { plan: (n, q, key, replan) => key === 'S5' && replan ? priceS5.map(r => ['S5', ...r]) : replan ? JA_REPLAN : JA_V693,
        repair: (scope, head, q, st) => st.repair === 1 ? [['A', 'ASK', 'PRICE', 'this', 'これ、いくら？', 'How much is this?'], ['B', 'ANSWER', '', 'this', 'ちょっと高いね。', 'A little expensive, huh.']] : /\(scene\)/.test(head) ? sceneRows(JA_REPLAN, 'S5') : null }, {}, L693('ja'))
      const f2 = ja2.track.listening ? ja2.track.listening.lines.map(l => l.japanese) : []
      T('J7', 'ja: an unworkable exchange is REPLANNED, not endlessly surface-repaired — INFEASIBLE_INTENTION → an intention repair; the repair returns the same price question → REPEATED_FAILURE_SIGNATURE, the rejected sentence is caught at once, and the part ESCALATES to a scene replan, which succeeds → READY, いくら never in the final text, ≤ 3 rounds',
        /x1 intention \[SEMANTIC/.test(ja2.Ls) && /REPEATED_FAILURE_SIGNATURE [^\n]*INFEASIBLE_INTENTION/.test(ja2.Ls) && /REPEATED_REJECTED_SENTENCE[^\n]*いくら/.test(ja2.Ls) && /MEANING_REPAIR round 2\/3 [^\n]*scene/.test(ja2.Ls) &&
        ja2.track.status === 'READY' && (ja2.stages.O_listening_plan_repair || 0) <= 3 && !f2.some(t => /いくら/.test(t)), { st: ja2.track.status, r: ja2.track.failureReason, s: ja2.stages })
    }
    // technical failures (demonstrations 8 · 10 · 11)
    {
      const zh = await run('zh', { plan: GOOD693.zh, scenePlan: (key, st) => key === 'S3' && st.scenes.filter(x => x === 'S3').length === 1 ? '__truncated__' : null }, {}, L693('zh'))
      T('J8', 'zh: a CUT-OFF reply for S3 is a TECHNICAL failure (fault 9) — never parsed or validated — S3 alone is requested again (S1 / S2 are kept, not requested again), the retry asks for a shorter reply, READY',
        /SCENE_PLAN_TRUNCATED S3 attempt 1 — the reply was cut off: a TECHNICAL failure \(fault 9\); a cut-off plan is never parsed, validated or kept/.test(zh.Ls) && zh.st.scenes.join(',') === 'S1,S2,S3,S3,S4,S5,S6' &&
        /was too long and was cut off/.test(planCalls(zh)[3].prompt) && zh.track.status === 'READY' && /LISTENING_MF_TRUNCATIONS=1/.test(zh.Ls), { st: zh.track.status, scenes: zh.st.scenes })
      const th = await run('th', { plan: GOOD693.th, scenePlan: key => key === 'S4' ? '__truncated__' : null }, {}, L693('th'))
      // v700: a situation that cannot be planned (technical) is SKIPPED — the conversation goes on without it; its lesson words are
      // placed elsewhere or moved to Revision (honestly reported); nothing from a cut-off reply is ever parsed or kept
      const cov9 = th.track.coverage || {}
      T('J9', 'th: S4 cut off twice → SITUATION_SKIPPED as TECHNICAL (fault 9) — never parsed; S1–S3 are kept and S5 / S6 are still planned; the result is a usable track: READY with S4\'s lesson words moved to Revision and stated (coverage 26/30 + 4 deferred), no legacy fallback',
        /SITUATION_SKIPPED S4 [^\n]*could not be planned after 2 attempts \(technical\)/.test(th.Ls) && th.st.scenes.join(',') === 'S1,S2,S3,S4,S4,S5,S6' && !/SCENE_PREFLIGHT|LISTENING_COMPOSITION scene/.test(th.Ls) &&
        th.track.status === 'READY' && cov9.covered + (cov9.deferred || []).length === 30 && (cov9.deferred || []).length === 4 && (cov9.deferredDetail || []).every(d => d.reason),
        { ...SALV(th), scenes: th.st.scenes })
    }
    // Japanese closed-vocabulary false positives seen in the v693 repairs (the words are reported correctly or accepted)
    {
      const c = good.ja.c, V = learner(c, 'ja').vocab
      const un = t => c.validateClosedWorldCandidate('ja', t, V, []).unknown
      T('J10', 'ja segmentation: 使いすぎ / 食べすぎた are 使う / 食べる + 〜すぎ (grammar, as 高すぎる already was), じゃあね is じゃあ + ね — no longer すぐ / 姉; an unauthorised ところで is reported as ところで (not 頃); すぐ on its own is still unknown (closed vocabulary not weakened)',
        !un('お金、使いすぎじゃない？').length && !un('食べすぎた。').length && !un('うん、じゃあね。').length && un('ところで、明日できる？').join() === 'ところで' && un('すぐ行く。').join() === 'すぐ',
        { a: un('お金、使いすぎじゃない？'), b: un('うん、じゃあね。'), c: un('ところで、明日できる？'), d: un('すぐ行く。') })
    }
  }
  } // end of sections A–J (T49_ONLY=K runs section K alone)
  // ══ K — v695: the three v694 Listening failures, end to end (learners + model replies from the owner's v694 logs) ════════
  // every run goes through the real selection → grouping → per-situation plan → local check → validation → audit → repair →
  // commit → final gates; only the model's replies are scripted (benchmark/v695/plans.js)
  {
    const F = require('./benchmark/v695/plans')
    const L694 = lang => ({ dueIds: F.V694_IDS[lang].concat(F.V694_DEFERRED[lang]), dueOrder: true })
    const swapT = (rows, pairs) => rows.map(r => { const p = pairs.find(x => x[0] === r[5]); return p ? p[1] : r })
    const sit = (rows, key) => rows.filter(r => r[0] === key)
    // the text of one part of a repair request ("[x2] turns 6, 7 (exchange …)" up to the next part)
    const block = (q, scope) => { const i = q.indexOf('[' + scope + '] '); if (i < 0) return ''; const j = q.indexOf('\n[x', i + 1); return q.slice(i, j < 0 ? q.indexOf('\nNEVER', i) : j) }
    const TH_TOURIST = [['B', 'ANSWER', '', 'I', 'สวัสดีค่ะ ฉันเป็นนักท่องเที่ยวค่ะ', 'Hello, I\'m a tourist.'], ['A', 'ASK', 'STATE', 'trip', 'ไปเที่ยวมาเป็นอย่างไรครับ', 'How was the trip?']]
    const TH_YOUALL = [['A', 'ASK', 'AGE', 'you', 'คุณอายุเท่าไหร่ครับ', 'How old are you?'], ['B', 'ANSWER', '', 'age', 'ยี่สิบเจ็ดปีค่ะ แล้วพวกคุณล่ะคะ', 'Twenty-seven. And you all?']]
    const thRewrite = (scope, q) => { const b = block(q, scope); return !/exactly \d+ turns/.test(b) ? null : /นักท่องเที่ยว/.test(b.split('lesson words that must be heard')[1] || '') ? TH_TOURIST : /พวกคุณ/.test(b.split('lesson words that must be heard')[1] || '') ? TH_YOUALL : null }
    const TH_PHONE2 = [['A', 'REQUEST', '', 'phone number', 'ขอเบอร์โทรศัพท์หน่อยได้ไหมครับ', 'Could I have your phone number?'], ['B', 'ACCEPT', '', 'phone number', 'ได้ค่ะ อันนี้คือเบอร์โทรศัพท์ของฉันค่ะ', 'Sure, this is my phone number.']]
    const repCalls = g => g.st.calls.filter(x => x.stage === 'O_listening_plan_repair')
    const planCalls = g => g.st.calls.filter(x => x.stage === 'O_listening_meaning_plan')
    const finalTexts = (g, f) => g.track.listening ? g.track.listening.lines.map(l => l[f]) : []
    const contract = (g, lang) => { const tr = g.track, L = tr.listening
      return tr.status === 'READY' && tr.coverage.covered === 30 && tr.selectedTargetIds.length === 30 && tr.targetCounts.newTargetCount === 0 && g.srsUntouched && tr.failedChecks.length === 0 &&
        L.lines.length >= 24 && L.lines.length <= 44 && L.gates.MAX_TARGETS_PER_TURN <= 3 && L.gates.BOTH_SPEAKERS && L.gates.ONE_CONVERSATION === 'PASS' && L.gates.CLOSED_VOCAB === true && L.gates.LENGTH_PASS !== false &&
        /LISTENING_PLANNER planner=meaning-first-3/.test(g.Ls) && L.architecture === 'meaning-first-v692' }
    // every FAILED situation status is followed by an explicit re-check on the final plan — never approved silently
    const failedCleared = g => { const failed = [...g.Ls.matchAll(/SCENE_LOCAL_CHECK (S\d) STATUS=FAILED/g)].map(m => m[1])
      return failed.every(k => new RegExp('SCENE_STATUS ' + k + ' FAILED [^\\n]*CLEARED_BY_GLOBAL_VALIDATION · re-checked on the final plan').test(g.Ls)) }
    const thBase = { plan: [], scenePlan: (key, st, q, replan) => key === 'S1' && replan ? F.TH_FIX.S1 : key === 'S6' && replan ? F.TH_FIX.S6 : key === 'S2' ? swapT(sit(F.TH_V694, 'S2'), [F.TH_FIX.S2first]) : sit(F.TH_V694, key) }
    const jaBase = { plan: [], scenePlan: (key, st, q, replan) => replan && F.JA_FIX[key] ? swapT(sit(F.JA_V694, key), F.JA_FIX[key]) : sit(F.JA_V694, key), repair: (scope, head) => /BOUNDARY/.test(head) ? F.JA_FIX.boundary : null }
    const zhBase = { plan: [], scenePlan: key => sit(F.ZH_V694, key) }

    // ── THAI ──
    const th = await run('th', thBase, {}, L694('th'))
    T('K1-th', 'th v694: S1 without พวกคุณ / นักท่องเที่ยว is NOT accepted — SCENE_TARGET_MISSING names both words, S1 is replanned with the defects named, and only the replan that carries them passes (status PASS_AFTER_REPLAN); v694 logged "S1 PASS"',
      /SCENE_LOCAL_CHECK S1 FAIL 2: SCENE_TARGET_MISSING — พวกคุณ[^\n]*SCENE_TARGET_MISSING — นักท่องเที่ยว/.test(th.Ls) && /SCENE_LOCAL_CHECK S1 \(replan\) PASS/.test(th.Ls) && /SCENE_LOCAL_CHECK S1 STATUS=PASS_AFTER_REPLAN/.test(th.Ls) &&
      /SCENE_TARGET_MISSING: พวกคุณ/.test(planCalls(th).find(x => /HAD THESE DEFECTS/.test(x.prompt) && /PLAN SITUATION S1 of/.test(x.prompt)).prompt), lineOf(th.Ls, /SCENE_LOCAL_CHECK S1[^\n]*/))
    T('K2-th', 'th v694: "เบอร์โทรศัพท์ของคุณคืออะไรครับ" (what IS your number?) is caught BEFORE the audit as an INFEASIBLE_INTENTION in S6 (asking for the digits) — the replan asks FOR the number and promises to send it; no "what is the number" question in the final text',
      /SCENE_LOCAL_CHECK S6 FAIL[^\n]*INFEASIBLE_INTENTION — "เบอร์โทรศัพท์ของคุณคืออะไรครับ"/.test(th.Ls) && /SCENE_LOCAL_CHECK S6 \(replan\) PASS/.test(th.Ls) &&
      !finalTexts(th, 'thai').some(t => /เบอร์\S*คืออะไร/.test(t)) && finalTexts(th, 'thai').some(t => /ขอเบอร์โทรศัพท์/.test(t)) && finalTexts(th, 'thai').some(t => /จะส่งให้/.test(t)), finalTexts(th, 'thai').slice(-5))
    T('K3-th', 'th v694 learner: FULL ASSEMBLY → READY — 30/30 heard in the final text, 0 new, SRS untouched, 24–44 turns, ≤3 targets per turn, two speakers, one conversation, closed vocabulary, hard length 8; every situation that ended its local check FAILED was re-checked on the final plan and named (never approved silently)',
      contract(th, 'th') && failedCleared(th) && /COMPLEXITY_HARD_MAX=8/.test(th.Ls), { st: th.track.status, r: th.track.failureReason, f: th.track.failedChecks })
    // the reserve: S1 still misses its words after the replan; the words move on (logged) and at the end a missing word is fixed by a
    // same-size REWRITE (the plan is already near 40 turns) — never an add that pushes the plan past the reserve (v694: 41 → 45)
    {
      let rew = 0
      const g = await run('th', { ...thBase, scenePlan: (key, st, q, replan) => key === 'S1' ? sit(F.TH_V694, 'S1') : thBase.scenePlan(key, st, q, replan),
        repair: (scope, head, q) => { const r = thRewrite(scope, q); if (r) rew++; return r } }, {}, L694('th'))
      const turnsAfter = [...g.Ls.matchAll(/STRUCTURAL_VALIDATION[^\n]*/g)].length
      T('K4-th', 'th: missing lesson words that no later situation carried are NOT added as extra turns past the reserve — TURN_RESERVE: a same-size rewrite of a target-free exchange (exactly N turns) is asked instead; the plan never exceeds 44 turns at any point; READY 30/30',
        /LISTENING_TARGET_REASSIGNED [^\n]*พวกคุณ|LISTENING_TARGET_REASSIGNED [^\n]*นักท่องเที่ยว/.test(g.Ls) && /TURN_RESERVE/.test(g.Ls) && rew >= 1 && !/45 turns|4[5-9] turns — the conversation must have/.test(g.Ls) && contract(g, 'th'),
        { st: g.track.status, r: g.track.failureReason, reserve: lineOf(g.Ls, /[^\n]*TURN_RESERVE[^\n]*/), rew })
    }
    // the v694 repair reply for the phone exchange ("what is your number?" / digits with an unknown word) is validated BEFORE it is
    // applied and rejected; the next round's patch is applied
    {
      const g = await run('th', { ...thBase, scenePlan: (key, st, q, replan) => key === 'S6' ? sit(F.TH_V694, 'S6') : thBase.scenePlan(key, st, q, replan),
        repair: (scope, head, q, st) => st.repair === 1 ? [['A', 'ASK', 'THING', 'phone number', 'เบอร์โทรศัพท์ของคุณคืออะไรครับ', 'What is your phone number?'], ['B', 'ANSWER', '', 'phone number', 'เบอร์ของฉันคือ ศูนย์แปด เก้าสี่ สองค่ะ', 'My number is 08 94 2.']]
          : /\(scene\)/.test(head) ? F.TH_FIX.S6.map(r => r.slice(1)) : TH_PHONE2 }, {}, L694('th'))
      T('K5-th', 'th: a malformed / invalid repair patch is REJECTED before it is applied (PART_REJECTED … PATCH_INVALID — the phone question and the unknown เบอร์), the old turns stay, the next round\'s valid patch (ask for the number + promise) is applied and validated in place → READY',
        /PART_REJECTED x\d \([a-z]+\) — PATCH_INVALID[^\n]*(INFEASIBLE_INTENTION|CLOSED_VOCAB)/.test(g.Ls) && /PART_REPAIRED x\d [^\n]*validated in place[^\n]*ขอเบอร์โทรศัพท์/.test(g.Ls) && contract(g, 'th') && !finalTexts(g, 'thai').some(t => /คืออะไร|ศูนย์แปด/.test(t)),
        { st: g.track.status, r: g.track.failureReason, rej: lineOf(g.Ls, /[^\n]*PART_REJECTED[^\n]*/) })
    }
    // bounded repairs: a request with two parts is cut off → it is SPLIT, each half asked on its own (never the same request again);
    // a single part that is cut off is asked once more with a shorter instruction, then left (PARTS_TECHNICAL) — never published
    {
      const g = await run('th', { ...thBase, scenePlan: (key, st, q, replan) => key === 'S1' || key === 'S6' ? sit(F.TH_V694, key) : thBase.scenePlan(key, st, q, replan),
        repair: (scope, head, q) => (q.match(/^\[x\d+\]/gm) || []).length > 1 ? '__truncated__' : thRewrite(scope, q) || (/\(intention\)|\(exchange\)/.test(head) ? TH_PHONE2 : null) }, {}, L694('th'))
      const rc = repCalls(g), prompts = rc.map(x => x.prompt)
      T('K6-th', 'th: a cut-off repair with 2+ parts → REPAIR_TRUNCATED + REPAIR_SPLIT, each half sent alone; every repair request is DIFFERENT (the same oversized request is never resent), each bounded (≤ ' + 2500 + ' tokens) → READY',
        /REPAIR_TRUNCATED/.test(g.Ls) && /REPAIR_SPLIT/.test(g.Ls) && new Set(prompts).size === prompts.length && rc.every(x => x.max <= 2500) && contract(g, 'th'), { st: g.track.status, r: g.track.failureReason, n: rc.length, max: rc.map(x => x.max) })
      const g2 = await run('th', { ...thBase, scenePlan: (key, st, q, replan) => key === 'S6' ? sit(F.TH_V694, 'S6') : thBase.scenePlan(key, st, q, replan), repair: () => '__truncated__' }, {}, L694('th'))
      const p2 = repCalls(g2).map(x => x.prompt)
      T('K7-th', 'th: a single part cut off every time → one shorter retry per round ("was cut off … ONLY the N new turns"), never the identical request; the part keeps its old turns (PARTS_TECHNICAL), the plan is BLOCKED → NOT_READY, nothing from a cut-off reply is validated or published',
        /REPAIR_TRUNCATED/.test(g2.Ls) && /PARTS_TECHNICAL/.test(g2.Ls) && p2.some(p => /Your previous reply was cut off/.test(p)) && new Set(p2).size === p2.length && g2.track.status === 'NOT_READY' && /LISTENING_PLAN_BLOCKED/.test(g2.Ls) && !(g2.track.listening && g2.track.listening.lines && g2.track.listening.lines.length),
        { st: g2.track.status, n: p2.length })
    }

    // ── JAPANESE ──
    const ja = await run('ja', jaBase, {}, L694('ja'))
    const jaFinal = finalTexts(ja, 'japanese')
    T('K8-ja', 'ja v694: ごめん、聞いちゃった。 is no longer an unknown 聞 (〜ちゃう forms of a godan verb resolve to 聞く); こっち / こと are still unauthorised (S3 / S6 replanned) — closed vocabulary not weakened',
      !/unknown words: 聞/.test(ja.Ls) && /SCENE_LOCAL_CHECK S1 STATUS=PASS/.test(ja.Ls) && /SCENE_LOCAL_CHECK S3 FAIL[^\n]*unknown words: こっち/.test(ja.Ls) && /SCENE_LOCAL_CHECK S6 FAIL[^\n]*unknown words: こと/.test(ja.Ls), lineOf(ja.Ls, /SCENE_LOCAL_CHECK S1[^\n]*/))
    const bnd = repCalls(ja)
    T('K9-ja', 'ja v694: the "today agreed → tomorrow?" contradiction is found deterministically (STATE_CONTRADICTION at S4, not only by the audit in the last round) and fixed by ONE bounded BOUNDARY repair — the end of S3 + the start of S4 (4 turns) in one request; no situation is rebuilt; the rest of the plan is unchanged',
      /SCENE_LOCAL_CHECK S4 FAIL 1: STATE_CONTRADICTION — the plan for 今日 was agreed/.test(ja.Ls) && /MEANING_REPAIR round 1\/3 · 1 part\(s\): x1 boundary \[TRANSITION\]/.test(ja.Ls) && /PART_REPAIRED x1 \(boundary · TRANSITION\) 4 turn\(s\) → 4 new/.test(ja.Ls) &&
      bnd.length === 1 && /BOUNDARY between S3 and S4: return exactly 4 turns/.test(bnd[0].prompt) && !/ scene \[/.test(lineOf(ja.Ls, /MEANING_REPAIR round[^\n]*/)) && jaFinal.includes('じゃ、あそこ行こう。') && !jaFinal.includes('じゃ、今日あそこ行こう。') && jaFinal.includes('明日、行かない？'),
      { r: lineOf(ja.Ls, /MEANING_REPAIR round[^\n]*/), n: bnd.length })
    T('K10-ja', 'ja v694 learner: FULL ASSEMBLY → READY — 30/30, 0 new, SRS untouched, 24–44 turns, ≤3 targets per turn, two speakers, hard length 7, every FAILED situation re-checked and named',
      contract(ja, 'ja') && failedCleared(ja) && /COMPLEXITY_HARD_MAX=7/.test(ja.Ls), { st: ja.track.status, r: ja.track.failureReason, f: ja.track.failedChecks })
    // v697 (live Haiku relay, Japanese runs 3–5: できる in the shop was never natural) — a flexible word with situations it fits is
    // moved, alone, to one of them that has room; every other word keeps its situation
    T('K10b-ja', 'ja v694 learner: できる (fits: catching up · eating · looking around) is grouped into S1 MEET, not the shop; the shop keeps 買う + お金, and the conversation keeps its 6 situations',
      /LISTENING_SITUATION S1 MEET[^\n]*できる/.test(ja.Ls) && /LISTENING_SITUATION S6 SHOP [^\n]*targets=\[買う, お金\]/.test(ja.Ls) && !/LISTENING_SITUATION S7 /.test(ja.Ls), lineOf(ja.Ls, /LISTENING_SITUATION S\d SHOP[^\n]*/))
    // the repair is the boundary even when it fails once (second attempt is again a boundary repair, never "rewrite S4 only")
    {
      const g = await run('ja', { ...jaBase, repair: (scope, head, q, st) => !/BOUNDARY/.test(head) ? null : st.repair === 1 ? F.JA_FIX.boundary.slice(0, 3) : F.JA_FIX.boundary }, {}, L694('ja'))
      // v697: the second attempt is the corrected retry in the SAME round (told why the patch was rejected) — still a BOUNDARY repair
      const gr = repCalls(g)
      T('K11-ja', 'ja: a boundary patch with the wrong number of turns / a lost lesson word (まだ) is rejected before it is applied; the second attempt (the corrected retry, told the exact reason) is again a BOUNDARY repair (not a whole-situation rewrite) and succeeds → READY',
        /PART_REJECTED x1 \(boundary\)/.test(g.Ls) && /PATCH_RETRY round 1 · x1/.test(g.Ls) && gr.length === 2 && /BOUNDARY between/.test(gr[1].prompt) && /YOUR LAST VERSION OF THIS PART WAS REJECTED/.test(gr[1].prompt) && /PART_REPAIRED x1 \(boundary/.test(g.Ls) && contract(g, 'ja'), { st: g.track.status, r: g.track.failureReason, n: gr.length })
    }

    // ── MANDARIN ──
    const zh = await run('zh', zhBase, {}, L694('zh'))
    T('K12-zh', 'zh v694: 好，一起去。(reply ellipsis after 我跟你去) is accepted — S4 passes its first local check (v694: GRAMMAR_CONTRACT "一起 needs a plural subject" → replan → 你知道哪里吗 also rejected)',
      /SCENE_LOCAL_CHECK S4 STATUS=PASS ·/.test(zh.Ls) && !/GRAMMAR_CONTRACT[^\n]*好，一起去/.test(zh.Ls) && finalTexts(zh, 'chinese').includes('好，一起去。'), lineOf(zh.Ls, /SCENE_LOCAL_CHECK S4[^\n]*/))
    T('K13-zh', 'zh v694 learner: FULL ASSEMBLY → READY — 30/30, 0 new, SRS untouched, 24–44 turns, ≤3 targets per turn, two speakers, hard length 6, every FAILED situation re-checked and named; the final continuity check reads the PLANNED replies (今天不可以，明天吧 → 好，明天 is an acceptance, not a contradiction)',
      contract(zh, 'zh') && failedCleared(zh) && /COMPLEXITY_HARD_MAX=6/.test(zh.Ls), { st: zh.track.status, r: zh.track.failureReason, f: zh.track.failedChecks })
    {
      const g = await run('zh', { ...zhBase, scenePlan: key => key === 'S4' ? sit(F.ZH_V694, 'S4').map(r => r[5] === '去哪里？' ? F.ZH_ELLIPSIS.embedded : r).filter(r => r[5] !== '你家。') :
        key === 'S5' ? sit(F.ZH_V694, 'S5').map(r => r[5] === '我给你钱，好吗？' ? ['S5', 'A', 'REQUEST', '', 'this one', '你拿这个，好吗？', 'Take this one, okay?'] : r[5] === '好，你拿这个。' ? F.ZH_ELLIPSIS.take : r) : sit(F.ZH_V694, key) }, {}, L694('zh'))
      const c = g.c, P = (t, p) => c.lnMfZhProblems(t, p, new Set())
      T('K14-zh', 'zh: the over-broad v694 rules are narrowed, not removed — 你知道哪里吗？ (embedded question) and 好，我拿。 after 你拿这个 (object ellipsis) pass in a full run; out of context the rules still fire: 你去哪里吗？ (wh + 吗), 我一起去。 (lone 我 + 一起), 我拿。 with nothing named before it',
        !/GRAMMAR_CONTRACT[^\n]*(你知道哪里吗|好，我拿)/.test(g.Ls) && g.track.status === 'READY' && !P('你知道哪里吗？', '').length && !P('好，一起去。', '我跟你去。').length && !P('好，我拿。', '你拿这个，好吗？').length &&
        P('你去哪里吗？', '').length > 0 && P('我一起去。', '').length > 0 && P('我拿。', '你好！').length > 0, { st: g.track.status, r: g.track.failureReason, a: P('你去哪里吗？', ''), b: P('我一起去。', ''), c: P('我拿。', '你好！') })
    }
    // the audit's v694 findings + the v694 repair replies verbatim ("中文 (pinyin)" in the sentence field)
    {
      const bad = { '我做工作。': { sense: 'bad', responds: 'no', usage: 'incorrect', fault: 6, note: '做工作 is not a natural way to say worked' }, '好，我用钱买。': { usage: 'awkward', note: 'using money to buy is odd' } }
      const g = await run('zh', { ...zhBase, audit: t => bad[t] || null,
        repair: (scope, head, q) => /做工作/.test(block(q, scope)) ? F.ZH_REPAIR_V694.work : /using money/.test(block(q, scope)) ? [['B', 'ACCEPT', '', 'buying', '好，我用钱买这个。(hǎo, wǒ yòng qián mǎi zhège.)', 'Okay, I\'ll pay for this one.']] : null }, {}, L694('zh'))
      const fin = finalTexts(g, 'chinese')
      T('K15-zh', 'zh v694: repair replies with pinyin in the sentence field are CLEANED deterministically before validation (PATCH_TEXT_CLEANED "我工作了。(wǒ gōngzuò le.)" → "我工作了。"), length is measured on the Chinese only (no TOO_COMPLEX 16–31 words), no Latin script in any final line → READY 30/30',
        /PATCH_TEXT_CLEANED[^\n]*我工作了。\(wǒ gōngzuò le\.\)" → "我工作了。"/.test(g.Ls) && !/TOO_COMPLEX/.test(g.Ls) && !/SCRIPT_CONTAMINATION/.test(g.Ls) && fin.includes('我工作了。') && !fin.some(t => /[A-Za-zāáǎàōóǒòēéěèīíǐìūúǔù]/.test(t)) && contract(g, 'zh'),
        { st: g.track.status, r: g.track.failureReason, cl: lineOf(g.Ls, /[^\n]*PATCH_TEXT_CLEANED[^\n]*/) })
      const g2 = await run('zh', { ...zhBase, audit: t => bad[t] || null,
        repair: (scope, head, q, st) => /做工作/.test(block(q, scope)) ? (st.repair === 1 ? [F.ZH_REPAIR_V694.work[0], F.ZH_REPAIR_V694.leading] : [['A', 'ASK', 'THING', 'yesterday', '你昨天做什么了？', 'What did you do yesterday?'], ['B', 'ANSWER', '', 'work', '我工作了。(wǒ gōngzuò le.)', 'I worked.']]) :
          /using money/.test(block(q, scope)) ? [['B', 'ACCEPT', '', 'buying', '好，我用钱买这个。', 'Okay, I\'ll pay for this one.']] : null }, {}, L694('zh'))
      T('K16-zh', 'zh: a romanisation that cannot be removed safely ("wǒ gōngzuò le 我工作了。" — Latin first) makes that PATCH invalid: it is rejected before it is applied (the old lines stay, nothing Latin reaches the plan), the next round\'s patch is cleaned and applied → READY; no final line has Latin script',
        /PART_REJECTED x\d \([a-z]+\) — PATCH_INVALID[^\n]*(LINE_QUALITY|SCRIPT|TOO_COMPLEX)/.test(g2.Ls) && !finalTexts(g2, 'chinese').some(t => /[A-Za-zāáǎàōóǒòēéěèīíǐìūúǔù]/.test(t)) && contract(g2, 'zh'),
        { st: g2.track.status, r: g2.track.failureReason, rej: lineOf(g2.Ls, /[^\n]*PART_REJECTED[^\n]*/) })
    }
    T('K17', 'scene planning keeps the same safeguards: every situation request is bounded (≤ 2700 tokens), the text field rule forbids romanisation / labels / notes and gives the reading its own "pron" field, the phone rule is in every prompt',
      [th, ja, zh].every(g => planCalls(g).every(x => x.max <= 2700 && /no romanisation/.test(x.prompt) && /"pron"/.test(x.prompt) && /phone number/i.test(x.prompt))), planCalls(zh)[0].prompt.slice(-600))
  }
  // ══ S — v700 SALVAGE: one faulty exchange never throws a whole Listening track away ═══════════════════════════════
  if (process.env.T49_ONLY !== 'K') {
    const c = load(__dirname + '/tt.compiled.js', { realBelt: true })
    const mk = () => { const tu = (id, scene, speaker, intent, resp) => ({ id, scene, speaker, intent, respondsToId: resp || null, targetIds: [], text: id, english: id })
      return c.lnMfRenumber({ scenes: [
        { key: 'S1', turns: [tu('t1', 'S1', 'A', 'ASK'), tu('t2', 'S1', 'B', 'ANSWER', 't1'), tu('t3', 'S1', 'A', 'INFORM'), tu('t4', 'S1', 'B', 'REACT', 't3')] },
        { key: 'S2', turns: [tu('t5', 'S2', 'A', 'ASK'), tu('t6', 'S2', 'B', 'ANSWER', 't5'), tu('t7', 'S2', 'A', 'PROPOSE'), tu('t8', 'S2', 'B', 'ACCEPT', 't7')] },
        { key: 'S3', turns: [tu('t9', 'S3', 'A', 'INFORM'), tu('t10', 'S3', 'B', 'REACT', 't9')] }] }) }
    const ids = mp => mp.flat.map(t => t.id).join(',')
    let m = mk(); const a = c.lnMfSalvageCut({}, m, [{ fault: 3, code: 'CLOSED_VOCAB', turnIds: ['t2'], scene: 'S1' }])
    let m2 = mk(); const b = c.lnMfSalvageCut({}, m2, [{ fault: 6, code: 'ADJACENCY', turnIds: ['t9'], scene: 'S3' }])
    let m3 = mk(); const d = c.lnMfSalvageCut({}, m3, [{ fault: 7, code: 'SCENE_INCOHERENT', turnIds: ['t5', 't6', 't7', 't8'], scene: 'S2' }])
    let m4 = mk(); const e = c.lnMfSalvageCut({}, m4, ['S1', 'S2', 'S3'].map(k => ({ fault: 7, code: 'SCENE_INCOHERENT', turnIds: [], scene: k })))
    T('S1', 'the salvage cuts the WHOLE exchange: a failing answer takes the question it answers (no unanswered question left), a failing turn takes the replies to it; a situation left with < 2 turns is dropped; an incoherent situation is dropped; nothing left → no salvage',
      ids(m) === 't3,t4,t5,t6,t7,t8,t9,t10' && a.removed.length === 2 && ids(m2) === 't1,t2,t3,t4,t5,t6,t7,t8' && b.droppedScenes.join() === 'S3' && ids(m3) === 't1,t2,t3,t4,t9,t10' && d.droppedScenes.join() === 'S2' && e === null && m.flat.every((t, i) => t.n === i + 1),
      { a: ids(m), b: ids(m2), d: ids(m3), e })
    // a line that fails in every round is cut; its lesson word, heard nowhere else, is DEFERRED with a reason; READY on the rest
    const ja4 = await run('ja', { audit: t => /いいえ/.test(t) ? { usage: 'awkward', note: 'odd here' } : null, repair: () => null })
    const cv = ja4.track.coverage || {}, sum = ja4.c.listeningTrackSummary(ja4.track)
    T('S2', 'ja: a line judged awkward in every round is CUT (not the whole track): the track is READY on the remaining lines, the lesson word heard nowhere else is moved to Revision WITH its reason, coverage says so honestly ("covered + deferred = 30"), and the SRS of every word is untouched',
      ja4.track.status === 'READY' && cv.covered + (cv.deferred || []).length === 30 && (cv.deferredDetail || []).length >= 1 && cv.deferredDetail.every(x => x.reason && x.target) && ja4.srsUntouched &&
      /stay due for Revision/.test(sum) && ja4.track.listening.gates.SALVAGE_FLOOR === true && (ja4.track.listening.lines || []).length >= 16,
      { st: ja4.track.status, cov: cv, sum, gates: ja4.track.listening && ja4.track.listening.gates })
    const ex = ja4.c.listeningCoverageExportLines(ja4.track.listening).join('\n')
    T('S3', 'the export states the salvage plainly: what was cut and why, and each word that stays due for Revision', /SALVAGE: \d+ turn\(s\) cut/.test(ex) && /MOVED TO REVISION [^\n]*still due in SRS/.test(ex) && /CUT "[^"]*いいえ/.test(ex), ex.split('\n').filter(l => /SALVAGE|MOVED|CUT/.test(l)).join(' | '))
    // too little left → the floor stops it: never a tiny "READY" track
    const zh9 = await run('zh', { audit: t => /[我你他她们]/.test(t) ? { usage: 'awkward', note: 'odd' } : null, repair: () => null })
    T('S4', 'the FLOOR: when cutting would leave too little (fewer than 16 lines, 2 situations, or half the lesson words), the track is NOT_READY with the reason named — never a tiny track called READY',
      zh9.track.status === 'NOT_READY' && /LISTENING_PLAN_BLOCKED — (SALVAGE_FLOOR|\d+ unresolved after [^\n]*salvage)/.test(zh9.Ls), SALV(zh9))
  }
  console.log(out.join('\n'))
  console.log('\n' + (n - fails) + '/' + n + ' passed')
  process.exit(fails ? 1 : 0)
})().catch(e => { console.error(e); process.exit(2) })
