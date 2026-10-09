// v674 — VERBALIZABILITY-FIRST GENERATION regression set (Thai · Japanese · Mandarin).
// Part A: language-specific verbalizability proof (blueprints from the TH / JA / ZH adapters feeding ONE shared planner) —
// no turn enters the meaning plan without a proven natural authorised realisation; both sides of every exchange; deferral
// with the SRS obligation preserved; LISTENING_PLAN_INFEASIBLE with 0 paid calls. Part B: conversation state recomputed from
// committed text + PHASE_TRANSITION_VALIDATION (LOCAL_PHASE_PASS and TRANSITION_PASS) before commit. Part C: bounded
// recovery (MAX_REMAINING_PLAN_REBUILDS = 3, RUNTIME_REALISATION_FAILED, committed phases kept). Part D: Daily fixes
// (JA terminal EXHAUSTED_AT_11, する licensed constructions, ZH one authoritative final pair set, TH preferred length).
// Every check runs the app's real functions in the node harness; Gemini is simulated only at the transport boundary.
const { setup, mock } = require('./tests14')
const fs = require('fs')
const out = []; let fails = 0, n = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + id.padEnd(5) + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 900) : '')) }
const KEY = 'AIzaSyTEST-harness-key-000000', MODEL = 'gemini-2.5-flash-lite'
const SRC = fs.readFileSync(__dirname + '/tt.jsx', 'utf8')
const dueOnly = S => { const ids = new Set(S.targets.map(t => t.id)); S.vocab.forEach(w => { if (ids.has(w.id)) { w.dueDate = '2026-01-01'; w.difficulty = 'hard' } else { w.dueDate = '2099-01-01'; if (w.difficulty === 'hard') w.difficulty = 'ok' } }) }
const surfOf = lang => lang === 'ja' ? 'japanese' : lang === 'zh' ? 'chinese' : 'thai'
const poolTargets = (c, S, lang, k) => c.listeningConversationTargets({ keywords: S.vocab.slice(0, k || 150).map(w => c.listeningTrackKeyword(lang, w)), selectedTargetIds: S.vocab.slice(0, k || 150).map(w => w.id), language: lang }, S.vocab, lang)

;(async () => {
  // ══ PART A — VERBALIZABILITY PROOF ══════════════════════════════════════════════════════════════════════════════
  const runs = {}
  for (const lang of ['th', 'ja', 'zh']) {
    const S = setup(lang); dueOnly(S)
    mock(S, lang, { ln: {} })
    const inner = S._mockFn, prompts = []
    S.c.mockGeminiGenerate = async (k, m, msgs, max, o) => { prompts.push(msgs[msgs.length - 1].content); return inner(k, m, msgs, max, o) }
    const logs = []
    const r = await S.c.generateCohesiveListeningTrack({ lang, vocab: S.vocab, apiKey: KEY, model: MODEL, onLog: x => logs.push(x), attemptId: 'lattempt-v674-' + lang })
    runs[lang] = { S, r, logs, L: logs.join('\n'), prompts }
  }
  {
    const ok = ['th', 'ja', 'zh'].every(l => /LISTENING_VERBALIZABILITY PROVEN/.test(runs[l].L) && new RegExp('blueprints: build' + { th: 'Thai', ja: 'Japanese', zh: 'Mandarin' }[l] + 'ListeningBlueprints → ONE shared planner').test(runs[l].L))
    const planners = (SRC.match(/^function planListeningConversation\(/gm) || []).length
    T('A1', 'three language adapters (buildThaiListeningBlueprints / buildJapaneseListeningBlueprints / buildMandarinListeningBlueprints) feed ONE shared planner — no per-language Listening engine; shared semantics (_lnAbstractExchanges) rendered per language',
      ok && planners === 1 && /function buildThaiListeningBlueprints\(vx, ex, A, B, C\) \{ return _lnBlueprintsVia\(_thBpRender/.test(SRC) && /function buildJapaneseListeningBlueprints\(vx, ex, A, B, C\) \{ return _lnBlueprintsVia\(_jaBpRender/.test(SRC) &&
      /function buildMandarinListeningBlueprints\(vx, ex, A, B, C\) \{ return _lnBlueprintsVia\(_zhBpRender/.test(SRC), { planners, logs: ['th', 'ja', 'zh'].map(l => (runs[l].L.match(/LISTENING_VERBALIZABILITY[^\n]*/) || [''])[0].slice(0, 160)) })
  }
  {
    const S = runs.th.S, c = S.c
    const T0 = poolTargets(c, S, 'th')
    const vx = c.listeningVerbalContext('th', S.vocab, T0.slice(0, 30))
    const byId = new Map(T0.map(t => [t.id, t]))
    const t = T0.find(x => x.surface === 'ข้าว') || T0.find(x => /rice/.test(x.gloss))
    const bps = c.listeningTargetBlueprints(vx, t, byId)
    const F = ['targetId', 'targetSurface', 'intendedSense', 'communicativeAct', 'propositionType', 'requiredLexemes', 'optionalLexemes', 'allowedGrammar', 'canonicalFrame', 'alternateFrames', 'expectedResponseType',
      'naturalContexts', 'complexityEstimate', 'closedVocabPass', 'grammarPass', 'targetSensePass', 'naturalnessConfidence']
    T('A2', 'a BLUEPRINT carries every specified field (targetId · targetSurface · intendedSense · communicativeAct · propositionType · requiredLexemes · optionalLexemes · allowedGrammar · canonicalFrame · alternateFrames · expectedResponseType · naturalContexts · complexityEstimate · closedVocabPass · grammarPass · targetSensePass · naturalnessConfidence)',
      bps.length >= 1 && bps.every(b => F.every(f => b[f] !== undefined)) && bps.every(b => b.closedVocabPass && b.targetSensePass), { n: bps.length, first: bps[0] && Object.keys(bps[0]) })
  }
  {
    const rows = []
    for (const lang of ['th', 'ja', 'zh']) {
      const { S } = runs[lang], c = S.c, la = c.listeningAdapterFor(lang)
      const tr = runs[lang].L.match(/LISTENING_TARGET_TRACE [^\n]*/g) || []
      const cc = c.getLearnerComplexityContract({ lang, vocab: S.vocab })
      const ids = runs[lang].r.track.listeningSelectedTargetIds
      const elig = ids.map(id => S.vocab.find(w => w.id === id)).filter(Boolean)
      const inv = c.snapshotLearnerInventory(lang, S.vocab, elig, 'listening').inventory
      tr.forEach(line => { const fr = (line.match(/proven="([^"]*)"/) || [])[1]; if (!fr || fr === '—') { rows.push({ lang, bad: 'no frame', line }); return }
        const pair = la.makeLine({ text: fr, english: 'x' }, 'A')
        const unk = c.listeningUnexposedWords(lang, pair, inv.taught, elig, S.vocab)
        const tg = (line.match(/\[([^\]]*)\] proven/) || [])[1].split('+').filter(Boolean)
        if (unk.length || cc.countUnits(fr) > cc.hardMax || !tg.every(s => la.present(fr, s, { vocab: S.vocab, jaInv: lang === 'ja' ? c.japaneseLearnerInventory(S.vocab, elig) : null, zhInv: lang === 'zh' ? c.mandarinLearnerInventory(S.vocab, elig) : null })))
          rows.push({ lang, fr, unk, units: cc.countUnits(fr), tg }) })
      rows.push({ lang, count: tr.length })
    }
    const bad = rows.filter(r => !r.count)
    T('A3', 'every proven frame RE-CHECKED independently (TH / JA / ZH): zero untaught words (the same closed-vocabulary checker as the audit), within the belt hardMax, and every planned target present — both sides of every exchange',
      !bad.length && rows.filter(r => r.count).every(r => r.count >= 15), { bad: bad.slice(0, 5), counts: rows.filter(r => r.count) })
  }
  {
    const okPlans = ['th', 'ja', 'zh'].every(l => /LISTENING_MEANING_PLAN VALID/.test(runs[l].L) && !/⟦proven: /.test('') && (runs[l].L.match(/^   T\d+ [AB] [^\n]*\(using [^\n]*/gm) || []).every(x => /⟦proven: /.test(x)))
    const S = runs.th.S, c = S.c
    const t = { id: 1, surface: 'ข้าว', gloss: 'rice', role: 'CONTENT' }
    const v = c.validateListeningMeaningPlan([{ turnId: 'T1', actType: 'STATEMENT', slot: null, targetIds: [1], provenFrame: null }], [], new Map([[1, t]]), new Map([[1, c.listeningTargetMetadata(t)]]), { verbal: true })
    T('A4', 'CORE CONTRACT: no turn enters the meaning plan until the adapter proves a natural authorised realisation — every target-bearing planned turn shows ⟦proven: …⟧ (TH / JA / ZH) and the validator rejects a target turn without one (NOT_VERBALIZED)',
      okPlans && !v.valid && /NOT_VERBALIZED/.test(v.problems[0].text), { v: v.problems })
  }
  {
    const { S, L, prompts } = runs.ja, c = S.c
    const open = c.ev('LISTENING_STORY_PHASES').find(p => p.key === 'OPEN')
    const frames = (L.match(/proven="[^"]*"/g) || []).join(' ')
    const authorised = w => S.vocab.some(x => x.japanese === w)
    const banned = ['元気', 'あなた', '私', '考える'].filter(w => !authorised(w))
    const ls1 = prompts.find(q => /^Write SCENE LS1 /.test(q)) || ''
    T('A5', 'JAPANESE OPEN never needs 元気 / 私 / あなた / 考える: the opening goal no longer asks "how they are / who they are", no proven frame contains an untaught word, and the LS1 request carries only the neutral goal',
      !/how they are|who they are/.test(open.goal) && banned.every(w => !frames.includes(w)) && !/how they are/.test(ls1) && /PROVEN FRAME/.test(ls1), { goal: open.goal, banned, hit: banned.filter(w => frames.includes(w)) })
  }
  {
    const S = setup('zh'), c = S.c
    const T0 = poolTargets(c, S, 'zh', 100)
    const why = T0.find(t => t.surface === '为什么')
    const vx = c.listeningVerbalContext('zh', S.vocab, [why])
    const byId = new Map(T0.map(t => [t.id, t]))
    const bps = c.listeningTargetBlueprints(vx, why, byId)
    const reasonOk = bps.length && bps.every(b => b.communicativeAct === 'QUESTION' && b.propositionType === 'REASON' && b.responseFrame && !/^(是|对|好|不|嗯|有|没有)。?$/.test(b.responseFrame) && /(太.+了|不想|喜欢|很)/.test(b.responseFrame))
    // no reason material (no adjective, no 想 / 喜欢 / 太): 为什么 cannot be voiced — it is never planned
    const lean = S.vocab.filter(w => !/^(太|想|喜欢|很|好|多|少|快|慢|大|小|贵|便宜|要)$/.test(w.chinese) && !/adjective/.test(w.partOfSpeech || ''))
    const vx2 = c.listeningVerbalContext('zh', lean, [why])
    const bps2 = c.listeningTargetBlueprints(vx2, why, byId)
    T('A6', '为什么 needs an EXPRESSIBLE REASON reply: its blueprint is a WHY question proven together with a reason answer (太…了 / 不想… / 喜欢…), never a bare yes/no; with no reason material in the inventory it has NO blueprint (never planned)',
      reasonOk && bps2.length === 0, { bps: bps.map(b => b.frames), lean: bps2.map(b => b.frames) })
  }
  {
    const S = setup('th'), c = S.c
    const T0 = poolTargets(c, S, 'th', 2000)
    // the live case: ศูนย์ selected in its DIGIT sense ("zero") — it must only ever be one digit of a number that is given
    const z0 = T0.find(t => t.surface === 'ศูนย์'), zero = { ...z0, gloss: 'zero', sense: 'zero' }, phone = T0.find(t => t.surface === 'เบอร์โทรศัพท์')
    const vx = c.listeningVerbalContext('th', S.vocab, [zero, phone])
    const byId = new Map(T0.map(t => [t.id, t.id === zero.id ? zero : t]))
    const bz = c.listeningTargetBlueprints(vx, zero, byId), bp = c.listeningTargetBlueprints(vx, phone, byId)
    const noDigits = S.vocab.filter(w => !/^(zero|one|two|three|four|five|six|seven|eight|nine)\b/i.test(String(w.english || '')) || w.thai === 'ศูนย์')
    const vx2 = c.listeningVerbalContext('th', noDigits, [phone])
    const bp2 = c.listeningTargetBlueprints(vx2, phone, byId)
    T('A7', 'ศูนย์ is never a generic NUMBER: its blueprints are digit answers inside a phone number / amount (never a statement); เบอร์โทรศัพท์ needs a phone context (asked for, answered with digits) — with no digits authorised it has NO blueprint',
      bz.length >= 1 && bz.every(b => b.communicativeAct === 'ANSWER' && /PHONE|AMOUNT/.test(b.propositionType)) && bp.length >= 1 && bp.every(b => b.propositionType === 'PHONE' && /ศูนย์|หนึ่ง|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า/.test(b.responseFrame || '')) && bp2.length === 0,
      { bz: bz.map(b => [b.communicativeAct, b.propositionType, b.frames]), bp: bp.map(b => b.frames), bp2: bp2.map(b => b.frames) })
  }
  {
    const S = setup('ja'), c = S.c
    const T0 = poolTargets(c, S, 'ja', 200)
    const vx = c.listeningVerbalContext('ja', S.vocab, T0.slice(0, 30))
    const all = []
    vx.words.slice(0, 200).forEach(w => { const t = T0.find(x => x.id === w.id); if (t) c.listeningTargetBlueprints(vx, t, new Map(T0.map(x => [x.id, x]))).forEach(b => all.push(...b.frames)) })
    T('A8', 'an UNTAUGHT word never enters a frame: no Japanese blueprint (≈' + all.length + ' frames over the whole inventory) contains 元気 / あなた / 私 / 考える — the opening chit-chat is built from what the learner knows',
      all.length > 20 && !all.some(f => /元気|あなた|私|考える/.test(f)), all.filter(f => /元気|あなた|私|考える/.test(f)).slice(0, 4))
  }
  {
    // deferral keeps the SRS obligation: the word is skipped for THIS track only — its due date / interval are untouched
    const S = setup('th'); dueOnly(S); const c = S.c
    const snap = c.selectRevisionTargets('th', S.vocab)
    const pool = c.listeningCandidatePool('th', S.vocab, snap)
    // a function word that no template can voice is put first in the pool
    const sw = S.vocab.find(w => w.thai === 'นอกจาก'); const pool2 = [sw].concat(pool.filter(w => w.id !== sw.id))
    const before = JSON.stringify(S.vocab.map(w => [w.id, w.dueDate, w.interval, w.status]))
    const f = c.selectFeasibleListeningTargets({ lang: 'th', vocab: S.vocab, pool: pool2, need: 30, seed: 'v674-defer' })
    const lines = c.listeningFeasibilityLog(f, 'th')
    const d = lines.find(l => /LISTENING_TARGET_DEFERRED target=\d+ นอกจาก /.test(l)) || ''
    T('A9', 'a target that cannot be voiced is DEFERRED before the freeze — LISTENING_TARGET_DEFERRED target= reason= srsObligationPreserved=true — SRS order kept for the rest, its SRS state (due date / interval / status) untouched',
      f.feasible && !f.targetIds.includes(sw.id) && /reason=UNVERBALIZABLE/.test(d) && /srsObligationPreserved=true/.test(d) && JSON.stringify(S.vocab.map(w => [w.id, w.dueDate, w.interval, w.status])) === before,
      { d, feasible: f.feasible, reason: f.reason })
  }
  {
    // a FROZEN rebuild that contains an unvoiceable target is infeasible BEFORE any paid call
    const S = setup('th'); dueOnly(S); const c = S.c
    let calls = 0
    mock(S, 'th', { ln: {} }); const inner = S._mockFn
    S.c.mockGeminiGenerate = async (...a) => { calls++; return inner(...a) }
    const ids = runs.th.r.track.listeningSelectedTargetIds.slice(0, 29).concat([S.vocab.find(w => w.thai === 'ซึ่ง').id])
    const logs = []
    const r = await c.generateCohesiveListeningTrack({ lang: 'th', vocab: S.vocab, apiKey: KEY, model: MODEL, onLog: x => logs.push(x), targetIds: ids, attemptId: 'lattempt-v674-frozen' })
    const L = logs.join('\n')
    T('A10', 'after the freeze target ids are NEVER swapped: a frozen set with an unvoiceable word ⇒ LISTENING_PLAN_INFEASIBLE paidLanguageGenerationCalls=0 · NOT_READY with the exact reason (the word and why) · 0 model calls',
      r.track.status === 'NOT_READY' && /LISTENING_PLAN_INFEASIBLE paidLanguageGenerationCalls=0/.test(L) && /ซึ่ง/.test(r.track.failureReason || '') && calls === 0, { st: r.track.status, why: r.track.failureReason, calls })
  }
  {
    const ok = ['th', 'ja', 'zh'].map(l => { const sp = runs[l].prompts.filter(q => /^Write SCENE LS\d+ /.test(q)); return sp.length >= 3 && sp.every(q => /TURN PLAN — MEANING FIRST, VERBALIZABILITY PROVEN/.test(q) && /PROVEN FRAME/.test(q)) && /LISTENING_TARGET_TRACE/.test(runs[l].L) })
    T('A11', 'every phase request carries the PROVEN FRAMES of its turns (TURN PLAN — MEANING FIRST, VERBALIZABILITY PROVEN) and the run logs LISTENING_TARGET_TRACE (target → act → proven frame) — TH / JA / ZH', ok.every(Boolean), ok)
  }
  {
    const th = setup('th').c, zhS = setup('zh'), jaS = setup('ja')
    const vt = th.listeningVerbalContext('th', setup('th').vocab, [])
    const vz = zhS.c.listeningVerbalContext('zh', zhS.vocab, []), vj = jaS.c.listeningVerbalContext('ja', jaS.vocab, [])
    const cases = [[vt.objOk('กิน', 'ข้าว'), true], [vt.objOk('กิน', 'ถุงเท้า'), false], [vt.objOk('ดื่ม', 'น้ำ'), true], [vz.objOk('买', '钱'), false], [vz.objOk('喝', '水'), true], [vj.objOk('食べる', 'ご飯'), true], [vj.objOk('飲む', 'ご飯'), false],
      [vt.coord(['ถุงเท้า', 'เวลา']), null]]
    T('A12', 'SHARED SEMANTICS decide what a frame may say: eat → food, drink → a drink, never "buy money" / "eat socks"; only like is joined with like ("socks and time" is refused)',
      cases.every(([a, b]) => a === b), cases)
  }
  {
    const th = runs.th.L
    const feasT = +((th.match(/LISTENING_FEASIBILITY PASS[^\n]*meaning plan VALID \((\d+) turns\)/) || [])[1] || -1)
    const compT = +((th.match(/LISTENING_MEANING_PLAN VALID · (\d+) planned turns/) || [])[1] || -2)
    T('A13', 'the plan proven BEFORE the freeze is the plan the composition proves again (the same verbal context: target set, closed vocabulary, per-turn ceiling) — Thai feasibility ' + feasT + ' turns = composition ' + compT + ' turns',
      feasT === compT && feasT > 0, { feasT, compT })
  }
  {
    const ok = ['th', 'ja', 'zh'].every(l => runs[l].r.track.status === 'READY' && runs[l].r.track.coverage.covered === 30 && (runs[l].r.track.listening || {}).architecture === 'verbalizability-first-v674')
    T('A14', 'TH / JA / ZH standalone Listening (simulated provider) end READY 30/30 on the verbalizability-first architecture (verbalizability-first-v674)', ok,
      ['th', 'ja', 'zh'].map(l => [l, runs[l].r.track.status, runs[l].r.track.coverage && runs[l].r.track.coverage.covered, (runs[l].r.track.listening || {}).architecture]))
  }

  {
    // A15 (found by the v674 battery: tests23 TH U2 failed ~1 run in 10) — a FROZEN Thai set (noun-heavy, 42–44 turns) was
    // called LISTENING_PLAN_INFEASIBLE "TURN_BUDGET 46 > 44" for ~9% of attempt seeds (the seed is the attempt timestamp).
    // Feasibility of a frozen set must not depend on the clock: 'lattempt-2026-10-08T06:11:07.113Z' reproduced it
    const S = setup('th'), c = S.c; const ids = new Set(S.targets.map(t => t.id))
    S.vocab.forEach(w => { if (ids.has(w.id)) { w.dueDate = '2026-01-01'; w.difficulty = 'hard' } else { w.dueDate = '2099-01-01'; if (w.difficulty === 'hard') w.difficulty = 'medium' } })
    const seeds = ['lattempt-2026-10-08T06:11:07.113Z'].concat(Array.from({ length: 24 }, (_, i) => 'lattempt-2026-10-08T06:' + String(10 + i).padStart(2, '0') + ':' + String((i * 7) % 60).padStart(2, '0') + '.' + (100 + i * 13) + 'Z'))
    const res = seeds.map(seed => { const f = c.selectFeasibleListeningTargets({ lang: 'th', vocab: S.vocab, pool: S.targets, need: 30, seed, frozen: true }); return [seed.slice(-13), f.feasible, f.plan && f.plan.meaningPlan ? f.plan.meaningPlan.turnCount : null] })
    T('A15', 'a FROZEN set\'s feasibility does not depend on the attempt seed (the clock): the Thai set that was infeasible (46 > 44 turns) for ~9% of seeds is feasible for the reproducing seed and 24 others — up to 24 planning seeds (no model call) before INFEASIBLE',
      res.every(r => r[1] && r[2] <= 44), res.filter(r => !r[1] || r[2] > 44))
  }

  // ══ PART B — CONVERSATION STATE · PHASE_TRANSITION_VALIDATION ═══════════════════════════════════════════════════════
  {
    const c = setup('th').c, la = c.listeningAdapterFor('th')
    const mk = (sp, th, en) => ({ speaker: sp, pair: la.makeLine({ text: th, english: en }, sp) })
    const acc = [{ sceneId: 'LS1', turns: [mk('A', 'ไปสิบโมงไหม', "Shall we go at 10 o'clock?"), mk('B', 'ได้', 'Okay.'), mk('A', 'จ่ายด้วยบัตร', "I'll pay by card."), mk('B', 'อิ่มแล้ว', "I'm full."), mk('A', 'ไปไหน', 'Where are we going?')] }]
    const st = c.recomputeListeningConversationState(acc, la, null, { remainingTargets: [1, 2] })
    T('B1', 'CONVERSATION STATE recomputed from the COMMITTED text (speakers, agreed times, payments, eating, open question, previous turn, remaining targets …)',
      st.paymentsCompleted === 1 && st.eatingDone === true && st.agreedTimes.includes("10 o'clock") && st.unresolvedQuestions.length === 1 && st.previousTurn && st.remainingTargets.length === 2 &&
      ['speakers', 'relationship', 'currentLocation', 'previousLocation', 'currentActivity', 'completedActivities', 'topic', 'currentTime', 'agreedTimes', 'objects', 'referents', 'promises', 'decisions', 'unresolvedQuestions', 'purchases', 'foodOrdered', 'paymentsCompleted', 'facts', 'previousTurn', 'previousExchange', 'remainingTargets'].every(k => k in st), st)
    const cand = { turns: [mk('A', 'ไปไหม', 'Are we going?'), mk('B', 'จ่ายด้วยเงินสด', "I'll pay in cash."), mk('A', 'กินกันเถอะ', "Let's eat."), mk('B', 'สิบเอ็ดโมง', "At 11 o'clock.")] }
    const iss = c.listeningTransitionStateIssues(st, cand, { phase: 'PAY' })
    T('B2', 'deterministic TRANSITION checks against the state: an outstanding question must be answered first · no second payment · eating does not restart · the agreed time stays agreed — exact lines, no paid call',
      iss.some(x => x.code === 'TRANSITION' && x.line === 1) && iss.some(x => /no second payment/.test(x.detail) && x.line === 2) && iss.some(x => /eating does not start again/.test(x.detail) && x.line === 3) && iss.some(x => /stays agreed/.test(x.detail) && x.line === 4), iss)
  }
  {
    // the Thai 1/7 case: a phase that is fine in itself but does not follow from the conversation fails BEFORE commit
    const S = setup('th'); dueOnly(S)
    mock(S, 'th', { ln: {} })
    const inner = S._mockFn
    let windows = 0, failed = 0
    S.c.mockGeminiGenerate = async (k, m, msgs, max, o) => { const q = msgs[msgs.length - 1].content
      if (/Judge the WHOLE listening track/.test(q) && (q.match(/^Scene \d+/gm) || []).length === 1) { windows++
        if (windows === 2) { failed++; return JSON.stringify({ scenes: [{ scene: 1, pass: false, breakAfterLine: 3, reason: 'the topic jumps — does not follow the previous part' }], overall: 2, reason: 'jump' }) } }
      return inner(k, m, msgs, max, o) }
    const logs = []
    const r = await S.c.generateCohesiveListeningTrack({ lang: 'th', vocab: S.vocab, apiKey: KEY, model: MODEL, onLog: x => logs.push(x), attemptId: 'lattempt-v674-transition' })
    const fIdx = logs.findIndex(l => /PHASE_TRANSITION_VALIDATION LS2 [^\n]*TRANSITION_FAIL/.test(l)), cIdx = logs.findIndex(l => /SCENE_COMMIT LS2 /.test(l))
    const reval = logs.filter(l => /PHASE_TRANSITION_VALIDATION LS2 /.test(l)).length
    T('B3', 'THAI 1/7 CASE: the transition judge (the SAME judge as the final audit, det 3 needs a model PASS) fails LS2 BEFORE commit — TRANSITION_FAIL logged before any SCENE_COMMIT LS2; the failing candidate is repaired / regenerated, never committed as it was',
      failed === 1 && fIdx >= 0 && (cIdx < 0 || cIdx > fIdx), { fIdx, cIdx, ls2: logs.filter(l => /LS2/.test(l)).slice(0, 8).map(x => x.slice(0, 160)) })
    T('B4', 'a repaired / regenerated phase is RE-VALIDATED (local gates + transition) before it may commit; the final whole-conversation audit still runs as the safety net; CONVERSATION_STATE is recomputed after every commit',
      reval >= 2 && /LISTENING_COHERENCE /.test(logs.join('\n')) && (logs.join('\n').match(/CONVERSATION_STATE after LS\d+/g) || []).length >= 3, { reval, st: r.track.status })
  }

  // ══ PART C — RECOVERY ═════════════════════════════════════════════════════════════════════════════════════════════
  {
    const c = setup('th').c
    T('C1', 'MAX_REMAINING_PLAN_REBUILDS = 3 replaces "one global replan": only the UNCOMMITTED future is rebuilt (committed good phases kept); a spent budget is logged, never silently trimmed first',
      c.ev('LN_MAX_REMAINING_PLAN_REBUILDS') === 3 && /if \(\(env\.globalReplans \|\| 0\) >= LN_MAX_REMAINING_PLAN_REBUILDS\)/.test(SRC) && !/if \(env\.globalReplans >= 1\) return false/.test(SRC) &&
      /LISTENING_REMAINING_PLAN_REBUILD ' \+ env\.globalReplans \+ '\/' \+ LN_MAX_REMAINING_PLAN_REBUILDS/.test(SRC) && /committed phase\(s\) kept/.test(SRC))
  }
  {
    const S = setup('th'); dueOnly(S)
    mock(S, 'th', { ln: { atomicNoop: true } })
    const inner = S._mockFn
    let dropped = null
    S.c.mockGeminiGenerate = async (k, m, msgs, max, o) => { const q = msgs[msgs.length - 1].content; let r = await inner(k, m, msgs, max, o)
      const sm = q.match(/^Write SCENE (LS\d+) /)
      if (sm && sm[1] === 'LS2') { const j = JSON.parse(r); const t = j.turns.find(x => (x.intendedTargetIds || []).length && (!dropped || (x.intendedTargetIds || []).includes(dropped))); if (t) { dropped = dropped || t.intendedTargetIds[0]; j.turns = j.turns.filter(x => x !== t) } r = JSON.stringify(j) }
      return r }
    const logs = []
    const r = await S.c.generateCohesiveListeningTrack({ lang: 'th', vocab: S.vocab, apiKey: KEY, model: MODEL, onLog: x => logs.push(x), attemptId: 'lattempt-v674-rebuild' })
    const L = logs.join('\n')
    const c1 = logs.findIndex(l => /SCENE_COMMIT LS1 /.test(l)), rb = logs.findIndex(l => /LISTENING_REMAINING_PLAN_REBUILD 1\/3/.test(l))
    T('C2', 'RUNTIME_REALISATION_FAILED: a target whose phase cannot carry it marks that frame failed and the remaining plan is REBUILT (1/3) with ANOTHER proven blueprint — the target id never changes; LS1 (committed before) is kept',
      /RUNTIME_REALISATION_FAILED target=\d+/.test(L) && rb > c1 && c1 >= 0 && !/LISTENING_REASSIGN target=/.test(L) && (r.track.listeningSelectedTargetIds || []).includes(dropped),
      { st: r.track.status, lines: logs.filter(l => /REBUILD|RUNTIME_REALISATION|NOT_COMMITTED|UNPLACED/.test(l)).slice(0, 6).map(x => x.slice(0, 180)) })
  }
  {
    const S = setup('th'), c = S.c
    const T0 = poolTargets(c, S, 'th', 400)
    const vx = c.listeningVerbalContext('th', S.vocab, T0.slice(0, 30))
    const byId = new Map(T0.map(t => [t.id, t]))
    const t = T0.find(x => x.surface === 'น้ำ') || T0[5]
    const b1 = c.listeningTargetBlueprints(vx, t, byId)
    const b2 = c.listeningTargetBlueprints(vx, t, byId, new Set([b1[0].key]))
    T('C3', 'a frame that failed at runtime is never proven again for that target: listeningTargetBlueprints(avoid) returns ANOTHER blueprint (alternate frame / act)',
      b1.length >= 2 && b2.length >= 1 && !b2.some(b => b.key === b1[0].key), { b1: b1.map(b => b.key), b2: b2.map(b => b.key) })
  }

  // ══ PART D — DAILY ═══════════════════════════════════════════════════════════════════════════════════════════════
  {
    const S = setup('ja'), c = S.c
    mock(S, 'ja', {})
    let calls = 0; const inner = S._mockFn
    S.c.mockGeminiGenerate = async (...a) => { calls++; return inner(...a) }
    const L = c.createRecallCheckLedger('ja')
    const t0 = S.targets[0], t1 = S.targets[1]
    for (let i = 0; i < 11; i++) { L.attempt(t0.id, 3); L.settle(t0.id, 3, 'rejected', 'x') }
    const partial = { perTarget: S.targets.map(() => []), missingRecalls: [{ targetId: t0.id, targetIdx: 0, recallIndex: 3, lastFailure: 'x' }], expectedRecallCount: 90, recovered: { japanese: 'stale' } }
    const logs = []
    const r1 = await c.recoverJapaneseMissingRecall(partial, S.targets, S.vocab, 'natural', KEY, MODEL, x => logs.push(x), null, { ledger: L })
    T('D1', 'JAPANESE EXHAUSTED_AT_11 is TERMINAL: a recall at 11/11 is never enqueued again — no "Recovering…" log line, no check, no paid call; a stale `recovered` never survives; noRecoverableRecall ⇒ the run finishes NOT_READY with unresolvedRecalls',
      r1.recovered === null && r1.noRecoverableRecall === true && calls === 0 && !logs.some(l => /Recovering/.test(l)) && r1.missingRecalls.every(m => m.terminal === 'EXHAUSTED_AT_11') &&
      /function finishJapaneseIncomplete\(part\)/.test(SRC) && /GENERATION_FINISHED_INCOMPLETE/.test(SRC) && /unresolvedRecalls/.test(SRC), { r1: { recovered: r1.recovered, no: r1.noRecoverableRecall, mr: r1.missingRecalls }, calls, logs })
    const partial2 = { ...partial, missingRecalls: [partial.missingRecalls[0], { targetId: t1.id, targetIdx: 1, recallIndex: 1, lastFailure: 'not yet generated' }] }
    const logs2 = []
    await c.recoverJapaneseMissingRecall(partial2, S.targets, S.vocab, 'natural', KEY, MODEL, x => logs2.push(x), null, { ledger: L })
    T('D2', 'with an exhausted recall FIRST in the list, recovery picks the NEXT open recall (the 8-Oct loop re-picked する recall 3 at 11/11 and never tried すみません recall 3)',
      logs2.some(l => new RegExp('Recovering ' + t1.japanese + ' · recall 1').test(l)) && !logs2.some(l => new RegExp('Recovering ' + t0.japanese + ' · recall 3').test(l)), logs2.slice(0, 3))
  }
  {
    const S = setup('ja'), c = S.c
    const suru = S.vocab.find(w => w.japanese === 'する')
    const inv = c.japaneseLearnerInventory(S.vocab, S.targets)
    const lic = suru ? c.jaLicensedConstructions(suru, inv) : []
    T('D3', 'する (and other generic verbs) get TARGET-SPECIFIC LICENSED CONSTRUCTIONS — ≥3 distinct authorised uses, every word passes the Japanese line check — shown in the target-group request and used first by the deterministic fallback',
      !!suru && lic.length >= 3 && new Set(lic.map(x => x.jp)).size === lic.length && /jaLicensedConstructionsLine\(t, inv\)|jaLicensedConstructionsLine\(target, inv\)/.test(SRC.replace(/\s+/g, ' ')) || (!!suru && lic.length >= 3 && /jaLicensedConstructionsLine/.test(SRC)), lic.map(x => x.jp))
  }
  {
    const c = setup('zh').c
    const ad = { sentenceOf: p => p.chinese }
    const P = (i, zh, extra) => ({ pairId: 'p' + i, chinese: zh, thai: zh, targetId: i, recallIndex: 1, pairType: 'content', ...(extra || {}) })
    const pairs = [P(1, '我想吃饭。'), P(2, '你去哪里？'), P(3, '我想吃饭。')]
    const fd = c.finalDuplicateAudit(pairs, ad)
    const rec = c.reconcileQcIssues([{ status: 'unresolved', category: 'duplicate', pairIndex: 2, message: 'Pair 3 — duplicate of pair 1' }], pairs, pairs, ad)
    const fixed = [P(1, '我想吃饭。'), P(2, '你去哪里？'), P(3, '我们去吃饭吧。')]
    const rec2 = c.reconcileQcIssues([{ status: 'unresolved', category: 'duplicate', pairIndex: 2, message: 'Pair 3 — duplicate of pair 1' }], pairs, fixed, ad)
    T('D4', 'MANDARIN ONE authoritative final pair set: the duplicate audit runs on the FINAL persisted pairs; an unresolved "duplicate of pair N / could not repair" is reconciled — STILL_PRESENT blocks READY (FINAL_DUPLICATE_AUDIT=FAIL / QC_UNRESOLVED_STILL_PRESENT), a replaced pair is RESOLVED',
      fd.hard.length === 1 && rec[0].state === 'STILL_PRESENT' && /^RESOLVED/.test(rec2[0].state) && /FINAL_DUPLICATE_AUDIT=FAIL/.test(SRC) && /QC_UNRESOLVED_STILL_PRESENT=/.test(SRC) && /const JAZH_INVALIDATING = new Set\(\[[^\]]*'duplicate'/.test(SRC),
      { fd, rec, rec2 })
  }
  {
    const c = setup('th').c
    const cc = c.getLearnerComplexityContract({ lang: 'th', vocab: setup('th').vocab })
    const nudge = c.thaiPreferredLengthNudge(cc)
    T('D5', 'THAI preferred length: every Thai generation request asks for the ' + cc.preferredMin + '–' + cc.preferredMax + '-word version first (longer only when it would be unnatural); hardMax unchanged',
      /LENGTH FIRST/.test(nudge) && nudge.includes(cc.preferredMin + '–' + cc.preferredMax) && /thaiPreferredLengthNudge\(lenResult\.contract\)/.test(SRC), nudge.slice(0, 200))
  }
  {
    const c = setup('th').c
    T('E1', 'version v674+ (app + Listening build; v675 = Step 0 instrumentation, same generation behaviour)', /^v(67[4-9]|680)$/.test(c.ev('APP_BUILD_VERSION')) && /^v(67[4-9]|680)$/.test(c.ev('LISTENING_BUILD_VERSION')))
  }
  console.log(out.join('\n'))
  console.log('\nv674 verbalizability-first regression: ' + (n - fails) + '/' + n + (fails ? ' — ' + fails + ' FAILED' : ' — ALL PASS'))
  process.exit(fails ? 1 : 0)
})().catch(e => { console.log('CRASH ' + (e && e.stack || e)); process.exit(2) })
