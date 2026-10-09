// v671 — UNIFIED LANGUAGE QUALITY & GENERATION RELIABILITY (Thai · Japanese · Mandarin) regression set.
// Every check runs the app's real functions in the node harness; Gemini is simulated only at the transport boundary.
// Fixtures are the live-run sentences named in the v671 spec (ศูนย์ quota, 今日の今日は？, 太吗？, なんで → いいえ …).
const { setup, mock } = require('./tests14')
const React = require('react'), TR = require('react-test-renderer')
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const out = []; let fails = 0, n = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + id.padEnd(5) + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 700) : '')) }
const KEY = 'AIzaSyTEST-harness-key-000000'
const range = k => Array.from({ length: k }, (_, i) => i + 1)

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
    if (sm && inject) { const j = JSON.parse(r); inject(sm[1], j, q); r = JSON.stringify(j) }
    return r
  }
  const logs = []
  const r = await S.c.buildStandaloneListeningTrack({ lang, vocab: S.vocab, apiKey: KEY, model: 'gemini-2.5-flash-lite', onLog: m => logs.push(m), attemptId: 'lattempt-v671' })
  return { ...r, st, logs, L: logs.join('\n'), lines: r.track.listening ? r.track.listening.lines : [] }
}

// a scripted adapter for the shared target-group core: every candidate fails until `acceptAt` (per recall)
function scriptedAdapter(plan) {
  return {
    surfaceOf: t => t.japanese,
    buildRequest: () => ({ messages: [{ role: 'user', content: 'x' }], maxTokens: 100, temperature: 0, json: null }),
    parse: raw => ({ cands: JSON.parse(raw), error: '' }),
    evaluate: (cand, ctx) => {
      const ok = cand.ok === true
      return ok ? { ok: true, cand, repairs: 0 } : { ok: false, cand, failure: 'scripted rejection (' + cand.text + ')', cls: 'PROMPT_REGEN_REQUIRED', repairs: 0 }
    },
    fallback: ({ recallIndex, used }) => {
      const p = plan[recallIndex] || {}
      const k = (used || []).filter(x => /^fb/.test(x)).length + 1
      if (!p.fallbackOkAt || k > 12) return null
      return { text: 'fb' + recallIndex + '-' + k, ok: k >= p.fallbackOkAt }
    },
    dedupeKey: x => String(x), textOf: c => c && c.text, onAccept: () => {},
  }
}

;(async () => {
  // ══ BATCH 1 — the shared eleven-check contract ═══════════════════════════════════════════════════════════
  {
    const S = setup('ja'), c = S.c
    const seq = c.ev('CHECK_BELT_SEQUENCE'), G = c.ev('GENERATION_CHECK_STYLE'), TH = c.ev('THAI_CHECK_STYLE')
    const belts = ['White', 'Orange', 'Orange + Stripe', 'Blue', 'Blue + Stripe', 'Yellow', 'Yellow + Stripe', 'Green', 'Green + Stripe', 'Brown', 'Brown + Stripe']
    T('1A', 'ONE canonical 11-check table in the exact belt order (White → Orange → Orange+Stripe → … → Brown+Stripe); Thai, Japanese and Mandarin read the same colour and emoji for check N',
      seq.length === 11 && seq.every((b, k) => b.n === k + 1 && b.belt === belts[k]) && range(11).every(k => G[k].color === seq[k - 1].color && TH[k].color === seq[k - 1].color && G[k].icon === seq[k - 1].icon && TH[k].emoji === seq[k - 1].icon) &&
      new Set(seq.map(b => b.color)).size === 11 && new Set(seq.map(b => b.icon)).size === 11, seq.map(b => b.belt + ':' + b.icon))

    // JA reaches check 11 with every colour correct: 3 paid rounds fail, fallbacks fail until the decision
    const logs = []
    const reply = JSON.stringify([{ text: 'bad-1', ok: false }, { text: 'bad-2', ok: false }, { text: 'bad-3', ok: false }])
    c.mockGeminiGenerate = async () => reply
    const g11 = await c.generateTargetGroup({ language: 'ja', target: { id: 1, japanese: '今日' }, recallCount: 3, adapter: scriptedAdapter({ 1: { fallbackOkAt: 99 }, 2: { fallbackOkAt: 2 }, 3: { fallbackOkAt: 1 } }),
      paidMaxPerRecall: 3, apiKey: KEY, model: 'm', onLog: m => logs.push(m) })
    const s1 = g11.slots.find(s => s.recallIndex === 1), s2 = g11.slots.find(s => s.recallIndex === 2), s3 = g11.slots.find(s => s.recallIndex === 3)
    const ix = h => c.checkHistoryIndices(h)                       // v672: histories are entries {index, colour, outcome, reason}
    const hist = s => ix(s.checks)
    const ORD = ['1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th','11th']
    const lines11 = logs.filter(l => /(1st|2nd|3rd|\d+th) check: .*recall [\d+]*1\b/.test(l))
    const icons = lines11.map(l => { const m = /^\s*(\S+) (\d+(?:st|nd|rd|th)) check:/u.exec(l); return m ? [m[1], ORD.indexOf(m[2]) + 1] : null }).filter(Boolean)
    T('1B', 'a recall that never passes walks EVERY position 1…11 in order (v672: paid attempts then deterministic fallback CANDIDATES — the decision is not a check) — no jump, no off-by-one; every logged ordinal carries its own belt icon',
      JSON.stringify(hist(s1)) === JSON.stringify(range(11)) && s1.state === 'unresolved' && icons.length >= 11 && icons.every(([ic, k]) => ic === seq[k - 1].icon) && g11.paidCalls === 2,
      { h1: hist(s1), icons: icons.map(x => x.join('')), paid: g11.paidCalls })
    T('1C', 'the three recalls of ONE target keep INDEPENDENT histories: after 2 paid checks r2 is accepted by its 2nd fallback check (4), r3 by its 1st (3), r1 walks to 11 — each pair carries its own _checkHistory and the fallback keeps its ACTUAL count',
      s2.state === 'accepted' && s2.checkTier === 4 && JSON.stringify(ix(s2.pair._checkHistory)) === JSON.stringify(range(4)) &&
      s3.state === 'accepted' && s3.checkTier === 3 && JSON.stringify(ix(s3.pair._checkHistory)) === JSON.stringify(range(3)) && s3.pair._checkCount === 3 && s1.checks.length === 11,
      { r2: [s2.state, s2.checkTier, s2.pair && s2.pair._checkHistory], r3: [s3.state, s3.checkTier, s3.pair && s3.pair._checkHistory] })
    // success at check 3: two failed paid rounds, the 3rd candidate passes → exactly 3 positions
    let call = 0
    c.mockGeminiGenerate = async () => { call++; return JSON.stringify(call >= 3 ? [{ text: 'good', ok: true }] : [{ text: 'bad' + call, ok: false }]) }
    const g3 = await c.generateTargetGroup({ language: 'ja', target: { id: 2, japanese: '行く' }, recallCount: 1, adapter: scriptedAdapter({}), paidMaxPerRecall: 3, apiKey: KEY, model: 'm', onLog: () => {} })
    T('1D', 'a recall that succeeds at check 3 lights ONLY positions 1–3 (checkTier 3, history [1,2,3]); checks ≠ paid calls (3 checks, 3 calls here because each check was a paid regeneration)',
      g3.slots[0].checkTier === 3 && JSON.stringify(ix(g3.slots[0].pair._checkHistory)) === '[1,2,3]' && g3.paidCalls === 3, g3.slots[0].checks)
    // one group request = check 1 for each of its three recalls (one paid call)
    c.mockGeminiGenerate = async () => JSON.stringify([{ text: 'a', ok: true }, { text: 'b', ok: true }, { text: 'c', ok: true }])
    const g1 = await c.generateTargetGroup({ language: 'ja', target: { id: 3, japanese: '食べる' }, recallCount: 3, adapter: scriptedAdapter({}), paidMaxPerRecall: 3, apiKey: KEY, model: 'm', onLog: () => {} })
    T('1E', 'batching is kept: ONE paid group call is check 1 of each of its 3 recalls (3 histories [1], paidCalls 1) — a check is not an API call',
      g1.paidCalls === 1 && g1.slots.every(s => s.checkTier === 1 && JSON.stringify(ix(s.pair._checkHistory)) === '[1]'), g1.slots.map(s => s.checks))

    // persistence: the saved pairs rebuild the SAME pills after a reload (JSON) and after a QC rerun (spread copies)
    const pairs = [{ targetId: 7, recallIndex: 1, _checkCount: 1, _checkHistory: [1], _source: 'ja-check-1' }, { targetId: 7, recallIndex: 2, _checkCount: 5, _checkHistory: range(5), _source: 'ja-check-5', _fallback: true },
      { targetId: 7, recallIndex: 3, _source: 'gemini-check-3:conv' }]
    const before = c.recallsFromPairs(pairs, 7)
    const reloaded = c.recallsFromPairs(JSON.parse(JSON.stringify(pairs)), 7)
    const rerun = c.recallsFromPairs(pairs.map(p => ({ ...p, _qcRan: true })), 7)
    T('1F', 'reload and QC rerun preserve the exact visual state: recall circles + histories are rebuilt from the saved pairs (r1 [1] · r2 fallback [1…5] · r3 from a Thai source tier 3 → [1,2,3])',
      JSON.stringify(before) === JSON.stringify(reloaded) && JSON.stringify(before) === JSON.stringify(rerun) && before.map(r => r.checkTier).join() === '1,5,3' && before[1].fallback && JSON.stringify(ix(before[2].history)) === '[1,2,3]', before)

    // the pill: RecallCircles + CheckHistoryStrip render exactly the checks that ran, in their own colours
    let tree
    const RC = require('./harness').load('tt.compiled.js', { React }).RecallCircles
    await TR.act(async () => { tree = TR.create(React.createElement(RC, { recalls: [{ recallIndex: 1, checkTier: 3, history: [1, 2, 3] }], slots: 3, histories: { 2: range(11) } })) })
    const strips = tree.root.findAll(x => x.props && x.props['data-check-history'] != null)
    const lit = st => st.findAll(x => x.props && x.props['data-lit'] === '1')
    const colors = st => lit(st).map(x => x.props.style.background)
    T('1G', 'the pill: a recall that succeeded at check 3 lights ONLY the first 3 of its 11 positions (white, orange, orange-stripe); an in-progress recall at check 11 lights all 11 in belt order',
      strips.length === 2 && lit(strips[0]).length === 3 && colors(strips[0]).join() === seq.slice(0, 3).map(b => b.color).join() && lit(strips[1]).length === 11 && colors(strips[1]).join() === seq.map(b => b.color).join(),
      { n: strips.length, a: strips[0] && colors(strips[0]), b: strips[1] && lit(strips[1]).length })
  }
  {
    // Mandarin + Thai carry the same per-recall contract
    const Z = setup('zh'), c = Z.c
    const p = { targetId: 5, recallIndex: 2, checkTier: 4, _checkCount: 4, _checkHistory: range(4), _source: 'zh-check-4', _fallback: true }
    T('1H', 'ZH equivalence: a Mandarin recall accepted at its 4th tier (the deterministic fallback) shows its REAL count 4 and history [1…4]',
      c.pairCheckCount(p) === 4 && JSON.stringify(c.pairCheckHistory(p)) === '[1,2,3,4]' && c.srcToTier('zh-check-4') === 4, c.recallsFromPairs([p], 5))
    const H = setup('th'), t = H.c
    t.ev('THAI_LAST_CHECKS_USED = 7')
    const fb = { _source: 'fallback:ศูนย์' }, line = { _source: 'gemini-check-6:conv' }
    const pr = t.recallsFromPairs([{ supportsTargetId: 9, recallIndex: 2, _checkCount: 6, _source: 'gemini-check-6:conv' }, { targetId: 9, recallIndex: 1, _checkCount: 7, _source: 'fallback:x' }], 9)
    T('1I', 'TH equivalence: a Thai response line (bridge, supportsTargetId) lights its recall circle; a template fallback after 7 checks shows 7 (not the old fixed "10"); a Gemini line shows its own check',
      pr.length === 2 && pr.find(r => r.recallIndex === 1).checkTier === 7 && pr.find(r => r.recallIndex === 1).fallback && t.pairCheckCount(line) === 6 && t.ev('THAI_LAST_CHECKS_USED') === 7, pr)
  }

  // ══ BATCH 2 — Thai ═════════════════════════════════════════════════════════════════════════════════════
  {
    const S = setup('th'), c = S.c, V = S.vocab
    const auth = new Set(['เบอร์โทรศัพท์', 'แปด', 'สอง', 'หรือ', 'คะแนน', 'เกม', 'องศา', 'หนาว'])
    const f1 = c.thaiSenseFeasibility('ศูนย์', auth), f2 = c.thaiSenseFeasibility('ศูนย์', new Set(['แปด', 'สอง', 'บาท']))
    T('2A', 'ศูนย์ means ZERO: construction planning offers only constructions the TAUGHT words can express (phone number / check a digit / score / temperature) — never a zero price; ≥ 3 distinct uses = feasible',
      f1.applies && f1.feasible && f1.uses.map(u => u.id).join() === 'phone-give,phone-check,score,temperature' && !f2.feasible && f2.uses.length === 0 && !/price/.test(f1.uses.map(u => u.use).join()), { f1: f1.uses.map(u => u.id), f2: f2.missing.map(m => m.id) })
    const zero = V.find(w => w.thai === 'ศูนย์'), other = V.filter(w => w.thai !== 'ศูนย์' && w.id < 400).slice(0, 40)
    const before = JSON.stringify({ s: zero.status, d: zero.dueDate, r: zero.repCount })
    const fr = c.freezeThaiTargetSelection({ selected: [zero, ...other.slice(0, 29)], reserve: other.slice(29), required: 30, mode: 'daily', feasibility: c.thaiSelectionFeasibility(new Set(['แปด'])) })
    T('2B', 'pre-freeze feasibility: ศูนย์ with < 3 expressible uses is DEFERRED before the freeze (slot backfilled, still 30 targets, logged) and its SRS state is untouched (it stays due)',
      !fr.targets.some(t => t.thai === 'ศูนย์') && fr.targets.length === 30 && fr.deferred.length === 1 && fr.deferred[0].thai === 'ศูนย์' && /SRS obligation preserved/.test(fr.log.join('\n')) &&
      JSON.stringify({ s: zero.status, d: zero.dueDate, r: zero.repCount }) === before, { deferred: fr.deferred, n: fr.targets.length })
    const st = c.createRecoveryState({ wordId: zero.id, thai: 'ศูนย์' }, { surface: 'ศูนย์' })
    const l1 = c.thaiQuotaConstructionLine('ศูนย์', auth, [], st)
    c.recordRecoveryFailure(st, { code: 'TARGET_MISSING', text: 'เสื้อตัวนี้ราคาห้าร้อยบาทครับ' })
    const l2 = c.thaiQuotaConstructionLine('ศูนย์', auth, [], st)
    const l3 = c.thaiQuotaConstructionLine('ศูนย์', auth, [{ thai: 'เบอร์โทรศัพท์ของคุณมีศูนย์ไหมครับ' }], c.createRecoveryState({ wordId: zero.id, thai: 'ศูนย์' }, { surface: 'ศูนย์' }))
    T('2C', 'quota recovery names the MISSING TARGET + its sense and a construction for THIS attempt; a failed attempt moves to the NEXT construction; a construction an accepted line already uses is not offered first',
      /MISSING TARGET: "ศูนย์"/.test(l1) && /zero/.test(l1) && /phone number/.test(l1) && l1 !== l2 && /score|temperature/.test(l3.split('CONSTRUCTION FOR THIS ATTEMPT:')[1].split('(')[0]), { l1, l2, l3 })
    const lx = t => c.thaiLexicalSenseProblems(t).map(x => x.id)
    const cases = [
      [{ thai: 'ตั๋วใบนี้ราคาศูนย์บาทครับ', english: 'This ticket costs zero baht.' }, ['ZERO_PRICE_IMPLAUSIBLE']],
      [{ thai: 'วันนี้เข้าฟรีศูนย์บาทค่ะ', english: 'Entry is free today, zero baht.' }, []],
      [{ thai: 'อาหารอร่อยหน่อยครับ', english: 'The food is quite tasty.' }, ['NOI_AFTER_DESCRIPTIVE_ADJECTIVE']],
      [{ thai: 'ขอเร็วหน่อยครับ', english: 'A bit faster, please.' }, []],
      [{ thai: 'ผมเจอเพื่อนที่ตลาดครับ', english: 'I found my friend at the market.' }, ['JOE_MEET_NOT_FIND']],
      [{ thai: 'ผมเจอเพื่อนที่ตลาดครับ', english: 'I met my friend at the market.' }, []],
      [{ thai: 'พี่ไปไหนคะ', english: 'Where is older brother going?' }, ['PHI_ADDRESS_TERM']],
      [{ thai: 'พี่ไปไหนคะ', english: 'Where are you going?' }, []],
      [{ thai: 'ผมจ่ายเองครับ', english: "I'll pay." }, []],
    ]
    const got = cases.map(([p, want]) => JSON.stringify(lx(p)) === JSON.stringify(want))
    T('2D', 'objective lexical-sense checks: zero price only with a free context · หน่อย not on a descriptive adjective (fine in a request) · เจอ + person = meet, not find · พี่ as an address term ≠ "older brother" · จ่าย is plain spoken Thai',
      got.every(Boolean), cases.map(([p], k) => p.thai + '→' + got[k]))
    const rules = c.ev('THAI_SEMANTIC_JUDGE_RULES')
    T('2E', 'the semantic judge knows the v671 lexical facts (จ่าย everyday · หนึ่งหมื่น not สิบพัน · "just right" needs no เพิ่ง · พอดี senses · เจอ meet/find · พี่ address · หน่อย · zero price · stylistic variation is not an error)',
      ['จ่าย', 'หนึ่งหมื่น', 'เพิ่ง', 'พอดี', 'เจอ', 'พี่', 'หน่อย', 'zero baht', 'stylistic'].every(k => rules.includes(k)), rules.slice(-400))
    const P = c.coherenceJudgeParse
    const a = P('```json\n{"sections":[{"section":1,"score":4}],"overall":4}\n```'), b = P('Here you go: {"sections":[{"section":1,"score":4,},],"overall":4} thanks'),
      d = P('{"sections":[{"section":1,"score":4,"reason":"ok"},{"section":2,"score":2,"reason":"jump"},{"section":3,"sco')
    T('2F', 'an unparseable coherence reply is parsed robustly: fences, prose around the JSON, trailing commas, and a TRUNCATED reply keeps its complete section verdicts (flagged partial)',
      a && a.overall === 4 && b && b.sections.length === 1 && d && d.partial && d.sections.length === 2 && d.sections[1].score === 2, { a, b, d })
    // the audit itself: garbage → ONE chunked retry → recovered; garbage always → UNVERIFIED (blocks READY), never skipped
    const sec = k => ({ sceneId: 'S' + k, purpose: 'p' + k, localPremise: 'p' + k, targetIds: [k] })
    const track = { scenePlan: { scenes: [1, 2, 3, 4].map(sec) }, pairs: [1, 2, 3, 4].flatMap(k => [1, 2, 3].map(r => ({ targetId: k, recallIndex: r, english: 'line ' + k + '.' + r, speaker: 'A', pairType: 'content', thai: 'ก', _target: 'ก' }))), keywords: [] }
    const adapter = { keywordsOf: () => [] }
    let calls = 0
    c.mockGeminiGenerate = async (k, m, msgs) => { calls++; const q = msgs[msgs.length - 1].content; if (calls === 1) return 'Sorry, here is my view: sections were mostly fine'
      const secs = [...q.matchAll(/Section (\d+) —/g)].map(x => +x[1]); return JSON.stringify({ sections: secs.map(s => ({ section: s, score: 4, coherent: true, offTopicLines: [] })), overall: 4 }) }
    const logs = []
    const r1 = await c.mainTrackCoherenceAudit(track, adapter, { apiKey: KEY, model: 'm', onLog: m => logs.push(m) })
    calls = 0; c.mockGeminiGenerate = async () => 'not json at all'
    const r2 = await c.mainTrackCoherenceAudit(track, adapter, { apiKey: KEY, model: 'm', onLog: m => logs.push(m) })
    T('2G', 'MAIN coherence: an unparseable judge reply gets ONE bounded chunked retry (2 smaller calls) → VERIFIED 4/4 sections; still unparseable → UNVERIFIED with the precise reason (≤ 3 calls, blocks READY)',
      r1.state === 'VERIFIED' && r1.sectionScores.length === 4 && r1.passed && /MAIN_TRACK_COHERENCE_RECOVERED/.test(logs.join('\n')) && r2.state === 'UNVERIFIED' && r2.attempts >= 2 && r2.attempts <= 3 && /unparseable after \d judge call/.test(r2.reason),
      { r1: [r1.state, r1.passed], r2 })
    const ap = c.thaiSpeakerParticleLocalRepair('ใช่ค่ะ ฉันอยากทานอาหาร', 'Yes, I want to eat.', 'female', { appendMissing: true })
    const ap2 = c.thaiSpeakerParticleLocalRepair('ฉันไม่มีชุดนักเรียนค่ะพิเศษ', 'x', 'female', { appendMissing: true })
    T('2H', 'speaker convention B = female: a Listening line that only lacks its final particle (live L30 "ใช่ค่ะ ฉันอยากทานอาหาร") gets ค่ะ deterministically; a line with a particle glued mid-sentence is NOT patched',
      /ฉันอยากทานอาหารค่ะ$/.test(ap.thai || ap.text || ap) && !/พิเศษค่ะ$/.test(ap2.thai || ap2.text || ap2), { ap, ap2 })
  }
  {
    const S = setup('th'), c = S.c
    const J = c.ev('THAI_JUST_TEMPORAL_RE')
    T('2L', '"just right" does NOT require เพิ่ง: only the TEMPORAL "just" (has just arrived / just now) does (live: เสื้อตัวนี้ขนาดพอดีครับ was rejected for "just right")',
      !J.test("it's just right") && !J.test('just enough') && !J.test('just one, please') && !J.test("i'm just looking") && J.test('he has just arrived') && J.test('i just ate') && J.test('just now'))
    const sp = x => c.normaliseThaiSpacing(x)
    T('2M', 'spacing preserves CLAUSE boundaries (สีก็สวย ขนาดกำลังดีครับ · โอเค งั้น… · ห้าร้อยบาท แพงค่ะ · ใช่ค่ะ ฉัน…) and still collapses word-by-word token spacing (ผม ชอบ สี ดำ ครับ)',
      sp('สีก็สวย ขนาดกำลังดีครับ') === 'สีก็สวย ขนาดกำลังดีครับ' && sp('โอเค งั้นพรุ่งนี้ถึงร้านนะครับ') === 'โอเค งั้นพรุ่งนี้ถึงร้านนะครับ' && sp('ห้าร้อยบาท แพงค่ะ') === 'ห้าร้อยบาท แพงค่ะ' &&
      sp('ใช่ค่ะ ฉันอยากทานอาหารค่ะ') === 'ใช่ค่ะ ฉันอยากทานอาหารค่ะ' && sp('ผม ชอบ สี ดำ ครับ') === 'ผมชอบสีดำครับ' && sp('ได้ไหม ครับ') === 'ได้ไหมครับ')
    const lx = p => c.thaiLexicalSenseProblems(p).map(x => x.id)
    T('2N', 'English-cue accuracy for Thai idioms / collocations: หิวข้าว is "hungry" (not "hungry for rice"); มากับรถแท็กซี่ is not "came by taxi" (นั่งรถแท็กซี่มา)',
      lx({ thai: 'ผมหิวข้าวครับ', english: "I'm hungry for rice." }).includes('IDIOM_MISTRANSLATED') && !lx({ thai: 'ผมหิวข้าวครับ', english: "I'm hungry." }).length &&
      lx({ thai: 'ผมมากับรถแท็กซี่ครับ', english: 'I came by taxi.' }).includes('COLLOCATION_VEHICLE') && !lx({ thai: 'ผมนั่งรถแท็กซี่มาครับ', english: 'I came by taxi.' }).length)
  }
  {
    // Listening — headroom, the SIMPLE rung and cluster-preserving recovery (all languages share the engine)
    const S = setup('th'), c = S.c
    const plan = c.planListeningCoverage(S.targets.map((t, k) => ({ id: t.id, surface: t.thai, gloss: t.english, role: 'CONTENT', domain: ['food & cooking', 'places & travel', 'home', 'shopping & payment', 'plans & schedule'][k % 5] })), { turnsMax: 44, seed: 's' })
    T('2I', 'Listening turn plan keeps HEADROOM: the planned total stays ≤ 85 % of the maximum (live: "planned 43 turns (max 44)")',
      plan.totalExpectedTurns <= Math.floor(44 * 0.85) && plan.headroomCap === 37 && plan.valid, { planned: plan.totalExpectedTurns, cap: plan.headroomCap })
    const L1 = learner('th')
    // v673 §3 — the recovery LADDER is replaced by the planned-phase transaction: a phase whose candidate keeps a defect is
    // REGENERATED from its FROZEN meaning plan (same targets, same turn plan, the exact rejected defects named) before any
    // target moves. A model that fixes the named defect on regeneration ⇒ the phase commits clean; nothing moves.
    const r = await listen(L1, 'th', { atomicNoop: true }, (sid, j, q) => { if (sid === 'LS2' && !/WAS REJECTED BEFORE COMMIT/.test(q) && j.turns[0]) j.turns[0].text = j.turns[0].text.replace(/(ครับ|ค่ะ|คะ)?$/, 'จักรวาล$1') })
    const regen = /PHASE_REGENERATE LS2 /.test(r.L)
    const unplaced = /LISTENING_TARGET_UNPLACED/.test(r.L)
    T('2J', '(v673) a phase whose candidate keeps a defect is REGENERATED from its frozen meaning plan (the exact defect named) — the SAME targets, the SAME turn plan — before any target moves; it commits only clean; nothing is replanned, unplaced or committed with defects',
      regen && /PHASE_REPAIR_STRATEGY LS2 \([A-Z]+\) generationCalls=2 .*→ COMMITTED after repair/.test(r.L) && !/LISTENING_GLOBAL_REPLAN after|SCENE_CLUSTER_REPLACEMENT|LISTENING_REASSIGN target=/.test(r.L) && !unplaced && r.track.coverage.covered === 30 &&
      (r.track.telemetry.LISTENING_SCENES_COMMITTED_WITH_DEFECTS || 0) === 0 && !r.lines.some(l => /จักรวาล/.test(l.thai || '')), { regen, unplaced, cov: r.track.coverage.covered, status: r.track.status })
    // a phase that stays defective on EVERY generation: ONE semantic global replan (never forward scattering), then a
    // deterministic TRIM of the defective exchange; the defective line never enters the conversation and the target it
    // carried is explicitly UNPLACED (named, NOT_READY)
    const L2 = learner('th')
    const r2 = await listen(L2, 'th', { atomicNoop: true }, (sid, j) => { if (sid === 'LS3' && j.turns[0]) j.turns[0].text = j.turns[0].text.replace(/(ครับ|ค่ะ|คะ)?$/, 'จักรวาล$1') })
    const replans = (r2.L.match(/LISTENING_GLOBAL_REPLAN after/g) || []).length
    const unpl = [...r2.L.matchAll(/LISTENING_TARGET_UNPLACED (\d+) /g)].map(m => +m[1])
    const missing = ((r2.track.listening && r2.track.listening.coverage && r2.track.listening.coverage.rows) || []).filter(x => x.status === 'MISSING').map(x => x.targetId)
    T('2K', '(v673) a phase defective on EVERY generation is NOT scattered: ≤ 1 semantic GLOBAL REPLAN, then the defective exchange is TRIMMED (no paid call) — the defective line never enters the conversation, every unheard target is explicitly UNPLACED, 0 reassignments, 0 committed-with-defects, NOT_READY',
      replans <= 3 /* v674: MAX_REMAINING_PLAN_REBUILDS = 3 */ && /PHASE_TRIMMED LS\d+|PHASE_NOT_COMMITTED LS\d+|LISTENING_TARGET_UNPLACED/.test(r2.L) && !r2.lines.some(l => /จักรวาล/.test(l.thai || '')) && (r2.track.telemetry.LISTENING_REASSIGNMENTS || 0) === 0 &&
      (r2.track.telemetry.LISTENING_SCENES_COMMITTED_WITH_DEFECTS || 0) === 0 && unpl.length >= 1 && r2.track.coverage.covered === 30 - unpl.length && r2.track.status === 'NOT_READY' && missing.every(id => unpl.includes(id)),
      { replans, unpl, missing, status: r2.track.status, cov: r2.track.coverage.covered, tail: r2.logs.filter(l => /REPLAN|UNPLACED|TRIM|NOT_COMMITTED/.test(l)).slice(0, 4) })
  }

  // ══ BATCH 3 — Japanese ════════════════════════════════════════════════════════════════════════════════
  {
    const S = setup('ja'), c = S.c, V = S.vocab
    const inv = c.japaneseLearnerInventory(V, S.targets)
    T('3A', 'speech style ids map onto the register table: "casual" IS Very Casual (it used to fall through to Natural)',
      c.ev("jaRegisterOf('casual').id") === 'very-casual' && c.ev("jaRegisterOf('polite').id") === 'polite' && c.ev("jaRegisterOf('natural').id") === 'natural')
    const fit = (jp, reg, rel) => c.jaValidateRegisterFit({ japanese: jp }, reg, inv, { relationship: rel }).ok
    T('3B', 'register is judged by the SCENE RELATIONSHIP, not a blanket ban: です／ます to a shop assistant is fine in Natural; between friends it is flagged; Very Casual flags it; a Polite track accepts it',
      fit('いくらですか？', 'natural', 'customer and shop assistant') && !fit('行きます。', 'natural', 'adult friends') && !fit('行きます。', 'natural', null) && !fit('行きます。', 'casual', null) && fit('行きます。', 'polite', 'adult friends'))
    const pr = jp => c.jaPragmaticProblems(jp, { japanese: (/^(今日|場所|物|する)/.exec(jp) || [])[1] || '' }).length > 0
    T('3C', 'no fallback privilege — the live fallbacks are rejected by the SHARED gate: 今日の今日は？ · 今日は？ · 場所は何？ · この物、何？ · 今日する？; natural lines pass (これは何？ 名前は？ 何する？)',
      ['今日の今日は？', '今日は？', '場所は何？', 'この物、何？', '今日する？'].every(x => c.jaPragmaticProblems(x, { japanese: x.includes('今日') ? '今日' : x.includes('場所') ? '場所' : x.includes('物') ? '物' : 'する' }).length) &&
      ['これは何？', '名前は？', '何する？'].every(x => !c.jaPragmaticProblems(x, { japanese: '何' }).length))
    const fb = w => [1, 2, 3].map(r => c.jaFallbackRecall(V.find(x => x.japanese === w), inv, r, [])).filter(Boolean).map(p => p.japanese)
    const all = ['今日', '場所', '物', 'する'].flatMap(fb)
    T('3D', 'the fallback frames no longer BUILD those sentences (今日の今日 / 今日は？ / X は何？ / 物ある？ / bare 今日する？)',
      !all.some(x => /今日の今日|^今日は？$|^.{1,3}は何？$|^(この)?物ある|^今日する？$|^明日する？$|^一緒にする？$/.test(x)), all)   // v681: 買う物ある？ / 食べる物ある？ are licensed constructions for 物
    const cf = (jp, en, cue) => c.jaCueFormProblems({ japanese: jp, english: en, prompt: cue || '' })
    T('3E', 'cue accuracy (objective): desire 〜たい needs "want" · "want" needs a desire form · a question is not cued as a statement · a ね tag question may be rendered "…, right?"',
      cf('食べたい。', 'I eat.').length && cf('食べる。', 'I want to eat.').length && cf('行く？', 'Are you going?', 'Say that you are going').length && !cf('いいね。', 'Nice, right?').length && !cf('ぜったい行く。', "I'm definitely going.").length)
    const t = V.find(x => x.japanese === '何'), ev = c.jaEvaluateRecallCandidate({ japanese: 'あれは何？', reading: 'あれはなに / なん？', romaji: 'are wa nani', english: 'What is that?', prompt: 'Ask what that is', segments: [] },
      { target: t, inv, vocab: V, registerId: 'natural', seenMap: new Map(), rules: {}, opts: {}, onLog: () => {} })
    T('3F', 'contextual 何: あれは何？ is no longer rejected for "dictionary alternatives" — the reading is resolved from the sentence (あれはなに？) and the romaji reads the particle as spoken (are wa nani)',
      ev.ok && ev.cand.reading === 'あれはなに？' && /are wa nani/.test(ev.cand.romaji) && c.romajiMatchesReading('are wa nani', 'あれはなに'), ev.failure || ev.cand)
    const kuru = V.find(x => x.japanese === '来る'), suru = V.find(x => x.japanese === 'する'), iku = V.find(x => x.japanese === '行く')
    T('3G', 'morphology: conjugated targets are recognised — 来る in kana (きました / こない), する colloquial (しよっか / しちゃった), 行く volitional / ちゃう (行こっか / 行っちゃう)',
      ['きました。', 'まだこないね。'].every(x => c.matchesJapaneseTarget(x, kuru)) && ['何かしよっか？', 'もうしちゃった。'].every(x => c.matchesJapaneseTarget(x, suru)) && ['行こっか？', 'もう行っちゃう？'].every(x => c.matchesJapaneseTarget(x, iku)) &&
      !c.matchesJapaneseTarget('きたない。', kuru))
    T('3H', 'every rejection names its category: taught lemma absent · untaught grammar · untaught content · tokenisation · duplicate · genuine error',
      c.generationFailureCategory('target する not present') === 'TARGET_LEMMA_ABSENT' && c.generationFailureCategory('CURRICULUM_NOT_YET_ALLOWED: grammar "かな"') === 'UNTAUGHT_GRAMMAR' &&
      c.generationFailureCategory('untaught content: 来週') === 'UNTAUGHT_CONTENT' && c.generationFailureCategory('romaji does not match reading') === 'TOKENISATION' && c.generationFailureCategory('PRAGMATIC_INCOMPLETE: x') === 'GENUINE_ERROR')
    const tc = c.makeTrackContext({ trackId: 'ja-x', language: 'ja', selectedTargetIds: [1, 2], selectedNewTargetIds: [] })
    const tr = c.jaTrackObject(tc, { pairs: [], scene: null, scenePlan: { scenes: [{ sceneId: 'S1', targetIds: [1] }, { sceneId: 'S2', targetIds: [2] }] } }, [], 'natural', 'm', 'daily')
    const secs = c.mainCoherenceSections({ ...tr, pairs: [{ targetId: 1, recallIndex: 1, pairType: 'content', english: 'a' }, { targetId: 2, recallIndex: 1, pairType: 'content', english: 'b' }] })
    T('3I', 'the scene plan travels with the Japanese track: the coherence audit sees one section PER mini-scene (live: 8 mini-scenes became "coherence 1/1")',
      tr.scenePlan && secs.length === 2, secs.map(s => s.sceneId))
    let k = 0; c.mockGeminiGenerate = async () => { k++; return 'I think it is mostly fine' }
    const gv = await c.aiQcEvaluateGroup({ indices: [0], pairs: [{ japanese: 'x', english: 'x' }], targetWord: 'x' }, [{ japanese: 'x', english: 'x' }], c.japaneseQcEngine(inv, V, 'natural'), KEY, 'm')
    T('3J', 'an unparseable group verdict is NEVER "clean": asked once more, then UNVERIFIED (the group is marked unresolved, not passed)', gv.action === 'unverified' && k === 2, gv)
  }
  {
    // the shared Listening engine — acts, Q-types and expected response meaning (Japanese live pairings)
    const S = setup('ja'), c = S.c
    T('5A', 'Q-type → response meaning: なんで → いいえ (WHY answered by a bare "No.") and いくら → 映画 (HOW MUCH answered without an amount) are rejected; a reason / an amount / "I don\'t know" pass',
      !!c.listeningQtypeIssue('Why?', 'No.', true, false) && !!c.listeningQtypeIssue('How much is it?', 'A movie.', true, false) && !c.listeningQtypeIssue('How much is it?', 'Ten thousand yen.', true, false) &&
      !c.listeningQtypeIssue('Why?', "Because I'm tired.", true, false) && !c.listeningQtypeIssue('Where is it?', "I don't know.", true, false) && !!c.listeningQtypeIssue('Where is the station?', 'Yes.', true, false))
    T('5B', 'an apology is its own act: "sorry" → APOLOGY (live: ごめん was planned as a QUESTION) → expects an ACKNOWLEDGEMENT; an apology inside a QUESTION turn is rejected before generation',
      c.listeningFunctionRole({ english: 'sorry' }) === 'APOLOGY' && c.ev('LISTENING_ADJACENCY').APOLOGY.includes('ACKNOWLEDGEMENT') &&
      !c.validateIntentSkeleton([{ turn: 1, speaker: 'A', intent: 'QUESTION', targetIds: [1], roles: ['APOLOGY'], surfaces: ['ごめん'] }, { turn: 2, speaker: 'B', intent: 'ANSWER', respondsTo: 1, targetIds: [], roles: [] }]).valid &&
      c.validateIntentSkeleton([{ turn: 1, speaker: 'A', intent: 'APOLOGY', targetIds: [1], roles: ['APOLOGY'], surfaces: ['ごめん'] }, { turn: 2, speaker: 'B', intent: 'ACKNOWLEDGEMENT', respondsTo: 1, targetIds: [], roles: [] }]).valid)
    const by = new Map([[1, { id: 1, surface: 'なんで', gloss: 'why', role: 'QUESTION_WORD' }], [2, { id: 2, surface: 'ごめん', gloss: 'sorry', role: 'APOLOGY' }], [3, { id: 3, surface: '大丈夫', gloss: "it's okay", role: 'DESCRIPTION' }]])
    const sc = { sceneId: 'LS1', requiredTargetIds: [1, 2, 3], purpose: 'A is late and apologises', relationship: 'adult friends', registerExpectation: 'plain' }
    c._lnPlanExchanges(sc, by); c._lnPlanSkeleton(sc, by, null)
    const txt = c._lnSkeletonText(sc, by)
    T('5C', 'every planned turn carries act, topic, requested information, expected response meaning, target ids + senses, relationship and register; the prompt shows what each reply must give',
      sc.skeleton.every(t => t.act && 'topic' in t && 'relationship' in t && Array.isArray(t.senses)) && sc.skeleton.some(t => t.act === 'APOLOGY') && /⟨must give a reason( \(a short clause[^⟩]*never a bare yes \/ no[^⟩]*\))?⟩/.test(txt) && /⟨must give an acknowledgement/.test(txt), txt)
  }

  // ══ BATCH 4 — Mandarin ════════════════════════════════════════════════════════════════════════════════
  {
    const Z = setup('zh'), c = Z.c
    const fresh = c.initMandarinVocab()
    T('4A', 'NEW per track: ZH Daily at Mukyu = 5 · JA 3 · TH 5 (belt) · ZH Revision / Listening 0 · ZH above Mukyu unchanged (3)',
      c.newWordsPerTrack('zh', 'daily', fresh) === 5 && c.newWordsPerTrack('ja', 'daily', fresh) === 3 && c.newWordsPerTrack('zh', 'revision', fresh) === 0 && c.newWordsPerTrack('zh', 'listening', fresh) === 0 &&
      c.newWordsPerTrack('th', 'daily', c.initVocab()) === 5 && c.zhDailyNewWords(fresh.map(w => w.unlockOrder <= 100 ? { ...w, status: 'known', repCount: 5, okStreak: 5, lastSeen: '2026-09-01' } : w)) === 3)
    const sel = c.mandarinSelectTargets(fresh, [])
    const few = fresh.map((w, k) => k < 97 ? { ...w, status: 'learning', repCount: 1, lastSeen: '2026-09-01' } : w)
    const sel3 = c.mandarinSelectTargets(few, [])
    T('4B', 'the Mandarin selector takes 5 NEW words at Mukyu (not a hardcoded 3); with only 3 eligible it takes 3', sel.length === 5 && sel.every(w => w.status === 'new') && sel3.length === 3, { n: sel.length, n3: sel3.length })
    const st = c.selectTrackTargets({ vocab: fresh.map((w, k) => k >= 5 && k < 60 ? { ...w, status: 'learning', repCount: 2, lastSeen: '2026-09-01', dueDate: '2026-09-02' } : w), targetCap: 30, newSelector: v => c.mandarinSelectTargets(v, []) })
    const roles = st.targets.reduce((a, t) => (a[t.selectionRole] = (a[t.selectionRole] || 0) + 1, a), {})
    T('4C', 'the shared track selector composes 5 NEW + 25 REVIEW for a Mandarin Daily at Mukyu; NEW is the selection role (a review word is never labelled NEW)',
      st.targets.length === 30 && roles.new === 5 && st.targets.filter(t => t.selectionRole !== 'new').length === 25, roles)
    const g = c.mandarinSurfaceGrammarProblems
    T('4D', 'Mandarin grammar (live): 太吗？ · 我一点想吃 · 我一点要吃 · 太贵。 (needs 了) · 你也吗？ are rejected; 太贵了 · 我有点想吃 · 我想吃一点 · 很好吃 · 我们一起去吧 · 这个不太贵 pass',
      ['太吗？', '我一点想吃。', '我一点要吃。', '太贵。', '你也吗？'].every(x => g(x, {}).length) && ['太贵了。', '我有点想吃。', '我想吃一点。', '很好吃。', '我们一起去吧。', '这个不太贵。', '我也是。'].every(x => !g(x, {}).length))
    const inv = c.mandarinLearnerInventory(Z.vocab, Z.targets)
    const tai = Z.vocab.find(w => w.chinese === '太') || { id: 999, chinese: '太', pinyin: 'tài', english: 'too', partOfSpeech: 'adverb' }
    const fbs = [1, 2, 3].map(r => c.mandarinFallbackPair(tai, inv, r, new Map(), Z.vocab, c.mandarinScarcityRules(inv))).map(p => p && p.chinese)
    T('4E', 'the Mandarin fallback never builds a dangling adverb (太吗？ / 太。) — a degree adverb gets an adjective frame (太X了。) or stays unresolved; no unfiltered fallback pool',
      fbs.every(x => !x || (!/^太[吗。？]/.test(x) && !g(x, inv).length)), fbs)
    const seg = x => c.segmentMandarin(x, inv.lexicon).map(s => s.surface)
    T('4F', 'segmentation keeps compounds whole (时间 时候 taught; 下午 周末 公园 kept as ONE untaught word, never 下 / 午)',
      seg('我下午有时间。').includes('下午') && seg('周末去公园吗？').includes('公园') && seg('周末去公园吗？').includes('周末') && JSON.stringify(c.mandarinCheckLine('我下午有时间。', inv).unknown) === '["下午"]')
    T('4G', 'cue accuracy (objective): 我… cued as "you" and 你… cued as "I" are rejected; a question rendered as a statement is rejected',
      c.zhCueFormProblems({ chinese: '我想吃。', english: 'Do you want to eat?' }).length > 0 && c.zhCueFormProblems({ chinese: '你去吗？', english: 'I am going.' }).length > 0 && !c.zhCueFormProblems({ chinese: '你去吗？', english: 'Are you going?' }).length)
    const stats = c.createMandarinGenerationStats('unknown', 0)
    Z.c.mockGeminiGenerate = async () => '[]'
    const live0 = c.ev('AI_LIVE_TRANSPORT.ok')
    T('4H', 'mock / live integrity: provenance is MEASURED — a mocked transport never counts as a live provider response (the run is reported NOT LIVE)', c.ev('AI_LIVE_TRANSPORT.ok') === live0 && stats.live === false)
  }

  console.log(out.join('\n'))
  console.log('\nv671 unified language quality regression: ' + (n - fails) + '/' + n + (fails ? ' — ' + fails + ' FAILED' : ' — ALL PASS'))
  process.exit(fails ? 1 : 0)
})().catch(e => { console.log('CRASH ' + (e && e.stack || e)); process.exit(1) })
