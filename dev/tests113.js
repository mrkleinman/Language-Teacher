// 24 Nov — JAPANESE: THE GRAMMAR A TRACK MAY USE (v774). v773 read the finished sentences and reported their grammar; it did not stop the writer from using grammar the learner had never been taught
// (the owner's 17 Nov export used 〜たら, 〜と思う and 〜てもいい long before their unlock levels), and nothing made early sentences simpler than later ones.
// Real application functions throughout (the curriculum, the detector, the plan, the prompt builders, the per-sentence ladder, the target-group generator, the finaliser, the export, the screens);
// the only thing scripted is the model transport (geminiRequest), as in tests18 / tests112.
//   A  ALLOWED GRAMMAR    the free core + what is introduced + what THIS track will introduce (chosen before writing); the writer's prompt says "use ONLY this grammar"
//   B  CHECK AFTER WRITING  an entry outside the allowed set rejects a candidate (plain reason naming it), the existing retry path regenerates it, a line that still fails at the cap is KEPT and
//                           flagged in the export (GRAMMAR NOT YET TAUGHT: pair N uses X), it never blocks READY, and the check is pure code (no extra model call)
//   C  STAGE              at most 2 / 3 gated entries per sentence, and a length ceiling that rises with the number of introduced entries
//   D  KNOWN              3 sentences across 2 tracks make an entry KNOWN; it leaves NEW / REVIEW; a Known grammar list in the Japanese Words area
//   E  PREVIEW            "Grammar for this track" on the Japanese plan screen, from the same selection function the writer's prompt uses
//   F  SAFETY AND SWITCHES  each switch off restores v773 exactly; the 30 words, the 90 pairs and the closed-vocabulary check never change because of grammar
//   node tests113.js            (current build: tt.compiled.js, or TT_FILE)      TT_PROBE=1 prints the v773 reference values this suite compares against
'use strict'
const fs = require('fs')
const crypto = require('crypto')
const { load } = require('./harness')
const { setup, mock } = require('./tests14')
const React = require('react'), TR = require('react-test-renderer')
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const out = []; let fails = 0, n = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + String(id).padEnd(4) + ' ' + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 900) : '')) }
const info = m => out.push('     · ' + m)
const FILE = process.env.TT_FILE || 'tt.compiled.js'
const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex').slice(0, 16)
const FIXJ = JSON.parse(fs.readFileSync(__dirname + '/fixtures/ja-grammar-lines-2026-11-17.json', 'utf8')).lines
const SRC = fs.readFileSync(__dirname + '/tt.jsx', 'utf8')
const KEY = 'AIzaSyTEST-harness-key-000000', MODEL = 'gemini-2.5-flash-lite'
const TODAY = '2026-11-24'
const textOf = x => x == null ? '' : typeof x === 'string' ? x : Array.isArray(x) ? x.map(textOf).join(' ') : textOf(x.children)
const flush = async (k = 20) => { for (let i = 0; i < k; i++) await new Promise(r => setImmediate(r)) }
const quiet = c => { c.console.info = () => {}; c.console.warn = () => {}; c.console.error = () => {}; return c }
const fresh = () => quiet(load(FILE, { realBelt: true, React }))
// a learner with `known` words known (the measure the grammar unlock always used: known + learning)
const learner = (c, known) => c.initJapaneseVocab().map((w, i) => i < known ? { ...w, status: 'known' } : w)
// the three learner levels used throughout: nothing taught yet · early · well on the way · everything taught
const LV = { L0: { label: '25 words · 0 grammar points introduced', known: 25, intro: 0 }, L1: { label: '90 words · 10 introduced', known: 90, intro: 10 },
  L2: { label: '200 words · 40 introduced', known: 200, intro: 40 }, L3: { label: '200 words · all 101 introduced', known: 200, intro: 101 } }
const levelOf = (c, lv, mutate) => {
  const vocab = learner(c, lv.known), store = {}
  c.ev('JA_GRAMMAR_CURRICULUM').slice(0, lv.intro).forEach(e => c.jaGrammarIntroduce(store, 'buildingBlock', e.id, '2026-09-01'))
  if (mutate) mutate(store)
  return { vocab, store }
}
const gateOf = (c, lv, o) => { const L = levelOf(c, lv, o && o.mutate); return c.jaGrammarGateContext(L.vocab, L.store, { register: (o && o.register) || 'natural', today: TODAY }) }
const setEq = (a, b) => { const x = new Set(a), y = new Set(b); return x.size === y.size && [...x].every(v => y.has(v)) }
const SWITCHES = ['jaGrammarGateSetEnabled', 'jaGrammarStageSetEnabled', 'jaGrammarKnownSetEnabled', 'jaGrammarPreviewSetEnabled']
const allOff = c => SWITCHES.forEach(f => typeof c[f] === 'function' && c[f](false))
// the track of the owner's 17 Nov export: 99 pairs, 90 of them target pairs (framing and bridge lines carry no target)
const pairsOf = () => FIXJ.map(l => ({ speaker: l.n % 2 ? 'A' : 'B', japanese: l.ja, thai: l.ja, reading: '', romaji: '', english: '', prompt: '',
  ...(l.kind === 'target' ? { targetId: 1000 + l.n, wordId: 1000 + l.n, isTargetPair: true, _target: 'x', recallIndex: 1 } : l.kind === 'bridge' ? { pairType: 'bridge', isTargetPair: false } : { _framing: true, pairType: 'framing', isTargetPair: false, _target: 'greeting' }) }))
const trackOf = (id, extra) => ({ language: 'ja', date: '2026-11-17', createdAt: id || '2026-11-17T09:04:11.270Z', mode: 'daily', speechStyle: 'natural', pairs: pairsOf(),
  keywords: Array.from({ length: 30 }, (_, i) => ({ japanese: 'w' + i, wordId: 1000 + i, rating: null })), selectedTargetIds: Array.from({ length: 30 }, (_, i) => 1000 + i),
  buildingBlocks: [{ form: 'は', romaji: 'wa', meaning: 'topic marker' }, { form: 'か', romaji: 'ka', meaning: 'question marker' }], ...(extra || {}) })
const exportText = (cc, track) => { cc.Blob = class { constructor(parts) { cc.__blob = parts.join('') } }; cc.URL = { createObjectURL: () => 'b', revokeObjectURL() {} }; cc.document.createElement = () => ({ style: {}, click() {}, setAttribute() {} }); cc.document.body.appendChild = () => {}; cc.document.body.removeChild = () => {}; cc.__blob = ''; cc.downloadJapaneseTrack(track); return cc.__blob }

// ── a scripted target group: the real adapter + the real generateTargetGroup, only the transport answers ──────────────────────────────
// answer(callNo, slotsAsked, promptText) → one recall object per slot (or null to leave the request unanswered). The learner of tests14's setup('ja') has been taught every word, so only grammar differs.
const mkRecall = (jp, en) => ({ intent: 'say it', japanese: jp, reading: '', romaji: '', englishCue: 'Say: ' + en, englishMeaning: en, segments: [] })
async function runGroup(S, targetWord, answer, gate, o) {
  const c = S.c, vocab = S.vocab, t = vocab.find(v => v.japanese === targetWord), inv = c.japaneseLearnerInventory(vocab, [t]), rules = c.scarcityRules(inv)
  const logs = [], calls = []
  c.geminiRequest = async req => {
    const text = (req.messages || []).map(m => m.content).join('\n'); calls.push(text)
    const slots = [...text.matchAll(/• recall (\d) of 3/g)].map(m => +m[1])
    return JSON.stringify({ recalls: answer(calls.length, slots, text) })
  }
  const adapter = c.japaneseTargetGroupAdapter({ vocab, registerId: (o && o.register) || 'natural', inv, rules, seenMap: new Map(), trackUsed: [], apiKey: KEY, model: MODEL, onLog: m => logs.push(m),
    opts: { grammarGate: gate || undefined, grammarProgress: (o && o.store) || {} } })
  const grp = await c.generateTargetGroup({ language: 'ja', target: t, recallCount: 3, adapter, paidMaxPerRecall: 3, apiKey: KEY, model: MODEL, onLog: m => logs.push(m), ledger: c.beginGenerationLedger('ja'), runId: c.aiBeginRun('ja-track') })
  return { grp, logs, calls, inv, t }
}
const asCand = r => ({ ...r, english: r.englishMeaning, prompt: r.englishCue })
const CLEAN = { 1: mkRecall('今日は行く？', 'Are you going today?'), 2: mkRecall('明日、行くよ。', 'I am going tomorrow.'), 3: mkRecall('行くね。', 'I will go, okay?') }
const TARA = mkRecall('行ったら言ってね。', 'Tell me when you go.')

;(async () => {
  // ═══ A — THE ALLOWED GRAMMAR ═══════════════════════════════════════════════════════════════════════════════════════════════════════
  try {
    const c = fresh(), ev = s => c.ev(s)
    const CORE = ['wa', 'ga', 'wo', 'ni', 'de', 'no', 'to', 'mo', 'ka', 'ne', 'yo', 'da', 'desu', 'plain-present', 'demo', 'dakara']
    const core = ev('JA_GRAMMAR_CORE')
    T('A1', 'the free core is は が を に で の と も か ね よ だ です, the plain present, でも and だから (and よね, which is ね and よ together) — and nothing that has to be taught: no past, no negative, no て-form, no ます, no 〜たら',
      CORE.every(id => core.includes(id)) && core.includes('yone') && core.length === 17 && ['past', 'nai', 'te', 'masu', 'tara', 'toomou', 'temoii', 'tai', 'kara', 'kedo'].every(id => !core.includes(id)) && core.every(id => ev('jaGrammarEntryById')(id)), core)
    const gates = { L0: gateOf(c, LV.L0), L1: gateOf(c, LV.L1), L2: gateOf(c, LV.L2), L3: gateOf(c, LV.L3) }
    const allowedOf = g => new Set([...g.coreIds, ...g.introducedIds, ...g.plannedIds])
    T('A2', 'allowed set, day one (25 words, nothing introduced): the free core, plus the entries this track will introduce (は か ね よ だ, the first in curriculum order); nothing else — 〜た, 〜ない, 〜て, 〜ます, 〜たら are not in it',
      gates.L0.introducedIds.length === 0 && setEq(gates.L0.plannedIds, ['wa', 'ka', 'ne', 'yo', 'da']) && CORE.every(id => allowedOf(gates.L0).has(id)) && ['past', 'nai', 'te', 'masu', 'tara', 'tai'].every(id => !allowedOf(gates.L0).has(id)), gates.L0)
    T('A3', 'allowed set, mid (90 words, 10 introduced): core + the 10 introduced + the next entries of this track; later entries (〜たら, 〜と思う, 〜てもいい) are not in it',
      gates.L1.introducedIds.length === 10 && gates.L1.plannedIds.length > 0 && gates.L1.plannedIds.every(id => !gates.L1.introducedIds.includes(id)) && gates.L1.introducedIds.every(id => allowedOf(gates.L1).has(id)) && gates.L1.plannedIds.every(id => allowedOf(gates.L1).has(id)) &&
      ['tara', 'toomou', 'temoii', 'past', 'masu'].every(id => !allowedOf(gates.L1).has(id)), { introduced: gates.L1.introducedIds, planned: gates.L1.plannedIds })
    T('A4', 'allowed set, high (200 words, 40 introduced): the 40 introduced are allowed, the next entries are planned, and 〜たら / 〜と思う / 〜てもいい are still not allowed until their turn',
      gates.L2.introducedIds.length === 40 && gates.L2.plannedIds.length > 0 && ['past', 'te', 'teru', 'tai'].every(id => allowedOf(gates.L2).has(id)) && ['tara', 'toomou', 'temoii'].every(id => !allowedOf(gates.L2).has(id)) && allowedOf(gates.L2).size > allowedOf(gates.L1).size && allowedOf(gates.L1).size > allowedOf(gates.L0).size,
      { l0: allowedOf(gates.L0).size, l1: allowedOf(gates.L1).size, l2: allowedOf(gates.L2).size, planned: gates.L2.plannedIds })
    info('allowed grammar entries (free core 17 + introduced + planned): L0 ' + allowedOf(gates.L0).size + ' · L1 ' + allowedOf(gates.L1).size + ' · L2 ' + allowedOf(gates.L2).size + ' · L3 ' + allowedOf(gates.L3).size)
    info('planned at L0: ' + gates.L0.planned.map(x => x.label).join(' ') + ' · L1: ' + gates.L1.planned.map(x => x.label).join(' ') + ' · L2: ' + gates.L2.planned.map(x => x.label).join(' '))
    // the selection rule, stated independently of the code
    const refPlan = (store, known, budget = 5) => {
      const cur = ev('JA_GRAMMAR_CURRICULUM'), intro = id => !!(store['buildingBlock:' + id] && store['buildingBlock:' + id].introducedAt), pick = []; let spent = 0
      for (const e of cur) { if (intro(e.id)) continue; if (known < e.minKnown) break; if (!e.prereq.every(p => intro(p) || pick.includes(p))) continue; if (spent + e.cost > budget) break; pick.push(e.id); spent += e.cost; if (spent >= budget) break }
      return { pick, spent }
    }
    const bad = []
    for (const [k, lv] of Object.entries(LV)) {
      const L = levelOf(c, lv), plan = c.jaGrammarTrackPlan(L.store, c.jaGrammarKnownCount(L.vocab), { today: TODAY }), ref = refPlan(L.store, lv.known)
      const cost = plan.next.reduce((a, x) => a + x.cost, 0)
      if (plan.next.map(x => x.id).join() !== ref.pick.join()) bad.push(k + ' differs from the rule: ' + plan.next.map(x => x.id).join(' ') + ' vs ' + ref.pick.join(' '))
      if (cost > 5 || cost !== plan.budget.spent) bad.push(k + ' cost ' + cost)
      plan.next.forEach((x, i) => { const e = ev('JA_GRAMMAR_CURRICULUM').find(y => y.id === x.id); if (lv.known < e.minKnown) bad.push(k + ' ' + x.id + ' locked'); if (L.store['buildingBlock:' + x.id]) bad.push(k + ' ' + x.id + ' introduced already')
        if (i && e.order < ev('JA_GRAMMAR_CURRICULUM').find(y => y.id === plan.next[i - 1].id).order) bad.push(k + ' order at ' + x.id) })
    }
    T('A5', 'the entries this track will introduce are the NEXT ones in curriculum order, up to 5 points (light 1, heavy 2): unlocked for this learner, not introduced yet, every prerequisite introduced or chosen just before, at every level',
      bad.length === 0 && c.jaGrammarTrackPlan(levelOf(c, LV.L3).store, 200, { today: TODAY }).next.length === 0, bad)
    // a prerequisite that is not taught yet holds an entry back; a heavy entry that does not fit the budget ends the list (strict order)
    const gap = levelOf(c, { known: 200, intro: 0 }, st => { ev('JA_GRAMMAR_CURRICULUM').filter(e => e.id !== 'plain-present' && e.minKnown <= 40).forEach(e => c.jaGrammarIntroduce(st, 'buildingBlock', e.id, '2026-09-01')) })
    const gp = c.jaGrammarTrackPlan(gap.store, 200, { today: TODAY })
    T('A6', 'order is strict: with every early entry taught except the plain present, the next list starts with the plain present (and the entries that need it only follow once it is in the list)',
      gp.next.length > 0 && gp.next[0].id === 'plain-present' && gp.next.every((x, i) => { const e = ev('JA_GRAMMAR_CURRICULUM').find(y => y.id === x.id); return (e.prereq || []).every(p => !!gap.store['buildingBlock:' + p] || gp.next.slice(0, i).some(y => y.id === p)) }), gp.next.map(x => x.id))
    // more than 6 reviews overdue: nothing new is planned (the same rule the picker uses after writing)
    const overdueL = levelOf(c, LV.L1, st => { ;['wa', 'ka', 'ne', 'yo', 'da', 'plain-present', 'san'].forEach(id => { st['buildingBlock:' + id].dueDate = '2026-11-01'; st['buildingBlock:' + id].interval = 2 }) })
    const od = c.jaGrammarTrackPlan(overdueL.store, 90, { today: TODAY })
    T('A7', 'no new entries are planned while more than 6 reviews are overdue (7 overdue ⇒ none planned, the reason is reported); the writer may then use only the core and what is taught',
      od.held === true && od.next.length === 0 && od.overdue === 7 && (() => { const g = c.jaGrammarGateContext(overdueL.vocab, overdueL.store, { register: 'natural', today: TODAY }); return g.plannedIds.length === 0 && g.held === true })(), od)

    // the writer's prompt
    const S = setup('ja'); quiet(S.c)
    const sc = S.c, tg = S.vocab.find(v => v.japanese === '行く'), inv = sc.japaneseLearnerInventory(S.vocab, [tg])
    const slots = [1, 2, 3].map(k => ({ recallIndex: k, lastFailure: '', failedSentences: [] }))
    const gp0 = { initial: true, acceptedForTarget: [], usedInTrack: [], rejected: [], objectives: '', grammarProgress: {}, scenePremise: '' }
    const g0 = gateOf(sc, LV.L0), g1 = gateOf(sc, LV.L1)
    const pr0 = sc.buildJapaneseGroupPrompt(tg, slots, inv, S.vocab, 'natural', { ...gp0, grammarGate: g0 }), pr1 = sc.buildJapaneseGroupPrompt(tg, slots, inv, S.vocab, 'natural', { ...gp0, grammarGate: g1 })
    const pr1one = sc.buildJapaneseRecallPrompt(tg, 1, inv, S.vocab, 'natural', { objectives: '', grammarProgress: {}, grammarGate: g1 })
    const lab = id => ev('jaGrammarEntryById')(id).label
    T('A8', 'the group writer\'s prompt says "use ONLY this grammar" and lists the free core, every entry taught, and the entries new in this track (labelled as new); a later entry (〜たら) is not in it',
      /use ONLY this grammar/.test(pr1.user) && /は が を に で の と も か ね よ だ です/.test(pr1.user) && g1.introducedIds.every(id => pr1.user.includes(lab(id))) && g1.planned.every(x => pr1.user.includes(x.label)) &&
      /NEW THIS TRACK/.test(pr1.user) && /TAUGHT ALREADY/.test(pr1.user) && !pr1.user.includes(lab('tara')) && !pr1.user.includes(lab('toomou')), pr1.user.split('\n').filter(l => /GRAMMAR|FREE|TAUGHT|NEW THIS|STAGE/.test(l)))
    T('A9', 'the old "normal inflection of allowed words is free" sentence is not left in the system prompt to contradict it, and the structure otherwise stays (the closed vocabulary line, the ids line for "blocks", the register contract)',
      !/normal inflection of allowed words is free/i.test(pr1.system) && /CLOSED VOCABULARY/.test(pr1.system) && /GRAMMAR ids for "blocks"/.test(pr1.user) && /ALLOWED CONTENT \(/.test(pr1.user) && /REGISTER/.test(pr1.system), pr1.system.split('\n').filter(l => /GRAMMAR|inflection/i.test(l)))
    T('A10', 'the single-sentence writer (recovery, repair) gets the same instruction; day one lists no taught entries and says so',
      /use ONLY this grammar/.test(pr1one.user) && g1.planned.every(x => pr1one.user.includes(x.label)) && /use ONLY this grammar/.test(pr0.user) && !/TAUGHT ALREADY:\s*[^\n]*〜/.test(pr0.user) && !/normal inflection of allowed words is free/i.test(pr1one.system + pr1one.user), pr0.user.split('\n').filter(l => /TAUGHT|NEW THIS/.test(l)))
    const ad = sc.japaneseTargetGroupAdapter({ vocab: S.vocab, registerId: 'natural', inv, rules: sc.scarcityRules(inv), seenMap: new Map(), trackUsed: [], apiKey: KEY, model: MODEL, onLog: null, opts: { grammarGate: g1 } })
    const req = ad.buildRequest({ target: tg, slots, accepted: [], initial: true, strategy: null }), reqNo = sc.japaneseTargetGroupAdapter({ vocab: S.vocab, registerId: 'natural', inv, rules: sc.scarcityRules(inv), seenMap: new Map(), trackUsed: [], apiKey: KEY, model: MODEL, onLog: null, opts: {} }).buildRequest({ target: tg, slots, accepted: [], initial: true, strategy: null })
    T('A11', 'the adapter that writes the track puts the instruction into every request it sends (and sends nothing extra without a gate)',
      req.messages.map(m => m.content).join('\n').includes('use ONLY this grammar') && !reqNo.messages.map(m => m.content).join('\n').includes('use ONLY this grammar'))
    // the whole generator: the first request of a real track carries the plan, and that plan equals the one the preview function returns for the same progress
    {
      const S2 = setup('ja'); quiet(S2.c); const c2 = S2.c
      mock(S2, 'ja'); const inner = c2.geminiRequest, calls = []
      c2.geminiRequest = async o => { calls.push((o.messages || []).map(m => m.content).join('\n')); return inner(o) }
      const tc = c2.jaGeneratorTrackContext(S2.targets.slice(0, 3).map(t => ({ ...t, selectionRole: 'review' })), { counts: { new: 0 } }, 'daily', 'natural', c2.aiBeginRun('ja-track'))
      const res = await c2.generateJapaneseTrack(S2.targets.slice(0, 3), S2.vocab, 'natural', KEY, MODEL, () => {}, () => {}, { cancelled: false }, { scene: 'Two friends at a station', characterA: 'Kenji, a man', characterB: 'Yuki, a woman', opening: '', reply: '', closing: '', closing_reply: '' }, { trackContext: tc, runId: tc.generationRunId })
      const st = await c2.jaGrammarLoad(), plan = c2.jaGrammarTrackPlan(st, c2.jaGrammarKnownCount(S2.vocab), { today: new Date().toISOString().slice(0, 10) })
      const first = calls.find(x => /JAPANESE TARGET: ★/.test(x)) || ''
      T('A12', 'a real track: the request the writer receives lists exactly the entries jaGrammarTrackPlan returns for the stored progress (the one function behind both the preview and the prompt), and the track context carries the same list',
        res.complete === true && plan.next.length > 0 && plan.next.every(x => first.includes(x.label)) && /use ONLY this grammar/.test(first) && !!tc.grammarGate && tc.grammarGate.plannedIds.join() === plan.next.map(x => x.id).join(), { complete: res.complete, planned: plan.next.map(x => x.id), gate: tc.grammarGate && tc.grammarGate.plannedIds })
    }
  } catch (e) { T('A!', 'section A stopped: ' + String(e && e.message).split('\n')[0], false, String(e && e.stack).slice(0, 500)) }

  // ═══ B — THE CHECK AFTER WRITING ═══════════════════════════════════════════════════════════════════════════════════════════════════
  try {
    const S = setup('ja'); quiet(S.c); const c = S.c
    const labelOf = id => c.ev('jaGrammarEntryById')(id).label
    const g0 = gateOf(c, LV.L0), g1 = gateOf(c, LV.L1), g2 = gateOf(c, LV.L2), g3 = gateOf(c, LV.L3)
    const chk = (s, g) => c.jaGrammarCheckSentence(s, g, {})
    const free = ['今日は学校に行く？', 'これは本です。', 'うん、いいよね。', 'でも、行く。', 'ねえ、水を飲む？', '友達と行くよ。', '駅で待つ。', '私の本だよ。', 'じゃあ、またね。']
    T('B1', 'sentences made of the free core only are never refused, at any level (は が を に で の と も か ね よ だ です, plain present, でも, じゃあ, ねえ, うん, またね)',
      free.every(s => chk(s, g0).ok && chk(s, g1).ok), free.filter(s => !chk(s, g0).ok).map(s => s + ' ' + JSON.stringify(chk(s, g0).problems)))
    const LOCK = [['行ったら言ってね。', 'tara'], ['行くと思う。', 'toomou'], ['食べてもいい？', 'temoii'], ['今日は行かない。', 'nai'], ['昨日行った。', 'past'], ['食べます。', 'masu'], ['行きたい。', 'tai'], ['高いけど、買う。', 'kedo'], ['明日行くから。', 'kara']]
    const r0 = LOCK.map(([s, id]) => ({ s, id, r: chk(s, g0) }))
    T('B2', 'day one: a sentence that uses an entry outside the allowed set is refused, and the reason is plain and NAMES the entry (〜たら, 〜と思う, 〜てもいい, 〜ない, 〜た, 〜ます, 〜たい, 〜けど, 〜から)',
      r0.every(x => x.r.ok === false && x.r.problems.some(p => p.kind === 'locked' && p.ids.includes(x.id) && p.text.includes(labelOf(x.id)))), r0.filter(x => x.r.ok || !x.r.problems.some(p => p.ids && p.ids.includes(x.id))).map(x => x.s + ' → ' + JSON.stringify(x.r.problems)))
    const reasonTara = chk('行ったら言ってね。', g0).problems[0].text
    T('B3', 'the reason is written for the writer: it says not taught yet, names 〜たら and tells it what to do (a rule with no extra model call)', /〜たら/.test(reasonTara) && /not taught yet/i.test(reasonTara) && /GRAMMAR_NOT_YET_TAUGHT/.test(reasonTara), reasonTara)
    // an entry becomes allowed when it is introduced OR chosen for this track
    const gTara = gateOf(c, LV.L1, { mutate: st => { c.ev('JA_GRAMMAR_CURRICULUM').slice(0, 60).forEach(e => c.jaGrammarIntroduce(st, 'buildingBlock', e.id, '2026-09-01')) } })
    const gPast = gateOf(c, { known: 60, intro: 0 }, { mutate: st => { c.ev('JA_GRAMMAR_CURRICULUM').filter(e => !['past', 'past-nai'].includes(e.id) && e.order < c.ev('jaGrammarEntryById')('past').order).forEach(e => c.jaGrammarIntroduce(st, 'buildingBlock', e.id, '2026-09-01')) } })
    T('B4', 'an entry is allowed once it is introduced (〜た is, after the first 60 entries) and also when this track introduces it (〜た is the next entry here), and the entries after it are still refused (〜たい)',
      gPast.plannedIds.includes('past') && chk('昨日行った。', gPast).ok === true && chk('行きたい。', gPast).ok === false && chk('昨日行った。', gTara).ok === true && gTara.introducedIds.includes('past'), { planned: gPast.plannedIds })
    T('B5', 'when everything is taught nothing is refused: the same sentences pass at the top level', LOCK.every(([s]) => chk(s, g3).ok), LOCK.filter(([s]) => !chk(s, g3).ok).map(x => x[0]))
    // お茶 / ご飯 are words, not the polite prefix; a set phrase is not grammar
    const W = S.vocab.filter(v => /^[おご]/.test(v.japanese)).slice(0, 3)
    T('B6', 'a word that starts with お / ご and is taught as a word (お茶, ご飯 …) is not the polite prefix, and a set phrase (お願いします) is not read as grammar',
      ['お茶を飲む？', 'ご飯を食べる。', 'お願いします。'].every(s => c.jaGrammarCheckSentence(s, g0, { words: S.vocab }).ok) && W.length >= 0)

    // the ladder: a candidate passes every other check, the grammar check refuses it, the existing retry path asks again, and the reason reaches the writer
    const ctxFor = (gate, t) => ({ target: t, inv: c.japaneseLearnerInventory(S.vocab, [t]), vocab: S.vocab, registerId: 'natural', seenMap: new Map(), rules: c.scarcityRules(c.japaneseLearnerInventory(S.vocab, [t])), opts: { grammarGate: gate }, onLog: null, recallIndex: 1 })
    const t1 = S.vocab.find(v => v.japanese === '行く'), cand = asCand(TARA)
    const evOn = c.jaEvaluateRecallCandidate(cand, ctxFor(g0, t1)), evOff = c.jaEvaluateRecallCandidate(cand, ctxFor(null, t1)), evOk = c.jaEvaluateRecallCandidate(asCand(CLEAN[1]), ctxFor(g0, t1))
    T('B7', 'in the per-sentence ladder: a candidate that is right in every other way but uses 〜たら is refused with the reason (and marked as grammar-only), the same candidate passes without a gate, and a clean candidate passes with it',
      evOn.ok === false && evOn.grammarOnly === true && /〜たら/.test(evOn.failure) && evOn.cls === 'PROMPT_REGEN_REQUIRED' && evOff.ok === true && evOk.ok === true, { on: evOn.failure, off: evOff.ok, ok: evOk.ok })
    // retried: recall 2 comes back with 〜たら once, then clean
    const R1 = await runGroup(S, '行く', (k, slots) => slots.map(s => s === 2 && k === 1 ? TARA : CLEAN[s]), g0)
    const retry = R1.calls[1] || ''
    T('B8', 'rejected, then retried through the existing path: the group asks again for recall 2 ONLY (slot-only regeneration), tells the writer the exact reason (〜たら is not taught yet), and the second answer is accepted — 2 paid requests, no extra loop',
      R1.grp.paidCalls === 2 && R1.grp.slots.every(s => s.state === 'accepted') && /REPLACEMENT ONLY: write 1 new sentence/.test(retry) && /• recall 2 of 3/.test(retry) && /PREVIOUS FAILURES[\s\S]*GRAMMAR_NOT_YET_TAUGHT[\s\S]*〜たら/.test(retry) && !R1.grp.slots.some(s => s.pair && s.pair._grammarFlag),
      { paid: R1.grp.paidCalls, retry: retry.slice(0, 600), slots: R1.grp.slots.map(s => s.state) })
    // the cap: recall 2 always uses 〜たら
    const TARAS = [mkRecall('行ったら言ってね。', 'Tell me when you go.'), mkRecall('明日行ったら、また来るよ。', 'If I go tomorrow, I will come again.'), mkRecall('友達と行ったら、楽しいよ。', 'If I go with a friend, it is fun.')]
    const R2 = await runGroup(S, '行く', (k, slots) => slots.map(s => s === 2 ? TARAS[Math.min(k, 3) - 1] : CLEAN[s]), g0)
    const s2 = R2.grp.slots.find(s => s.recallIndex === 2)
    T('B9', 'a line that still fails at the cap is KEPT, not dropped: recall 2 uses the existing per-line limit (3 paid attempts), is accepted with its grammar flag naming 〜たら, the other two recalls are untouched, and nothing loops',
      R2.grp.slots.every(s => s.state === 'accepted') && s2.paidRequests === 3 && R2.grp.paidCalls === 3 && s2.pair && s2.pair._grammarFlag && s2.pair._grammarFlag.some(f => f.id === 'tara') && R2.grp.slots.filter(s => s.recallIndex !== 2).every(s => !s.pair._grammarFlag) && R2.logs.some(l => /kept with a grammar flag/.test(l)),
      { paid: R2.grp.paidCalls, s2: s2 && { state: s2.state, paid: s2.paidRequests, flag: s2.pair && s2.pair._grammarFlag }, log: R2.logs.filter(l => /grammar/i.test(l)).slice(-3) })
    // pure code: no extra model request for the check itself; a clean group is one request with the gate and without it
    const R3 = await runGroup(S, '行く', (k, slots) => slots.map(s => CLEAN[s]), g0), R4 = await runGroup(S, '行く', (k, slots) => slots.map(s => CLEAN[s]), null)
    T('B10', 'the check costs no model request: a clean group is ONE request with the gate on and ONE with it off; the sentences are identical', R3.calls.length === 1 && R4.calls.length === 1 && R3.grp.slots.map(s => s.pair.japanese).join() === R4.grp.slots.map(s => s.pair.japanese).join(), { on: R3.calls.length, off: R4.calls.length })
    const t0 = Date.now(); FIXJ.forEach(l => chk(l.ja, g1)); const dt = Date.now() - t0
    T('B11', 'the check is fast: the 99 lines of the export are read in well under 2 seconds', dt < 2000, dt)

    // the finished track: flags in the export, READY untouched
    const cf = fresh(), vocab = learner(cf, 90)
    await cf.jaGrammarMigrateV1(vocab)
    const L1 = levelOf(cf, LV.L1), gate = cf.jaGrammarGateContext(L1.vocab, L1.store, { register: 'natural', today: TODAY })
    const track = trackOf('2026-11-17T09:04:11.270Z', { trackContext: { trackId: '2026-11-17T09:04:11.270Z', language: 'ja', grammarGate: gate } })
    const fin = await cf.jaGrammarFinaliseTrack(track, { vocab: L1.vocab, today: TODAY })
    const txt = exportText(cf, fin), lines = txt.split('\n').filter(l => /^GRAMMAR NOT YET TAUGHT:/.test(l))
    const g = fin.grammarInTrack && fin.grammarInTrack.gate
    T('B12', 'the export names every line that still uses grammar outside the allowed list, one line each: "GRAMMAR NOT YET TAUGHT: pair N uses <entry>" — and it is the same set the check finds in the final sentences',
      !!g && lines.length > 0 && lines.every(l => /^GRAMMAR NOT YET TAUGHT: pair \d\d uses \S/.test(l)) && lines.length === g.notTaught.length &&
      FIXJ.every(l => { const r = cf.jaGrammarCheckSentence(l.ja, gate, { words: L1.vocab.filter(w => /^[おご]/.test(w.japanese)) }), got = g.notTaught.filter(x => x.n === l.n).map(x => x.id).sort().join(); const want = r.problems.filter(p => p.kind === 'locked').flatMap(p => p.ids).sort().join(); return got === want }), { lines: lines.slice(0, 4), count: g && g.notTaught.length })
    const plain = trackOf('2026-11-17T09:04:11.270Z'), finPlain = await fresh().jaGrammarFinaliseTrack(plain, { vocab: L1.vocab, today: TODAY })
    T('B13', 'a flagged line never blocks the track: the track keeps all 99 pairs (90 target pairs), the same words, and the readiness line and invariants are the same with and without the flags',
      fin.pairs.length === 99 && fin.pairs.filter(p => cf.jaGrammarIsTargetPair(p)).length === 90 && fin.keywords.length === 30 && JSON.stringify(fin.pairs) === JSON.stringify(trackOf().pairs) &&
      cf.trackReadinessExportLines(fin)[0] === cf.trackReadinessExportLines({ ...finPlain, trackContext: fin.trackContext })[0] && JSON.stringify(fin.integrity) === JSON.stringify(finPlain.integrity), { a: cf.trackReadinessExportLines(fin)[0], b: cf.trackReadinessExportLines(finPlain)[0] })
    T('B14', 'it is not hidden: the same flagged lines are also on the track screen (GRAMMAR IN THIS TRACK lists them)', await (async () => {
      let R; await TR.act(async () => { R = TR.create(React.createElement(cf.JaGrammarInTrack, { track: fin })); await flush(3) })
      const j = textOf(R.toJSON()); return /NOT YET TAUGHT/i.test(j) && g.notTaught.slice(0, 2).every(x => j.includes(x.label))
    })())

    // the fixture at three learner levels (reported)
    const rep = {}
    for (const k of ['L0', 'L1', 'L2']) {
      const gg = gateOf(c, LV[k]), rej = []
      FIXJ.forEach(l => { const r = c.jaGrammarCheckSentence(l.ja, gg, { words: S.vocab }); if (!r.ok) rej.push({ n: l.n, ja: l.ja, why: r.problems.map(p => p.kind === 'locked' ? p.ids.map(labelOf).join(' ') : p.kind).join(' + ') }) })
      rep[k] = rej
      info('FIXTURE ' + k + ' (' + LV[k].label + '): ' + rej.length + ' of 99 lines refused — ' + Object.entries(rej.reduce((a, x) => { x.why.split(' + ').forEach(w => { a[w] = (a[w] || 0) + 1 }); return a }, {})).sort((a, b) => b[1] - a[1]).map(([w, k2]) => w + '×' + k2).join(' · '))
      rej.slice(0, 40).forEach(x => info('   pair ' + String(x.n).padStart(2, '0') + '  ' + x.ja + '   ← ' + x.why))
    }
    T('B15', 'the 99-line fixture through the check at three levels: a learner further on is refused less (day one most, high least, all-taught none), and the lines that use 〜たら, 〜と思う and 〜てもいい are refused at the first two levels',
      rep.L0.length >= rep.L1.length && rep.L1.length >= rep.L2.length && rep.L0.length > rep.L2.length && FIXJ.filter(l => c.jaGrammarCheckSentence(l.ja, g3, { words: S.vocab }).problems.some(p => p.kind === 'locked')).length === 0 &&
      [27, 70, 81, 88].every(nn => rep.L0.some(x => x.n === nn) && rep.L1.some(x => x.n === nn)), { l0: rep.L0.length, l1: rep.L1.length, l2: rep.L2.length })
  } catch (e) { T('B!', 'section B stopped: ' + String(e && e.message).split('\n')[0], false, String(e && e.stack).slice(0, 500)) }

  // ═══ F — SAFETY AND SWITCHES ═════════════════════════════════════════════════════════════════════════════════════════════════════
  try {
    // values of the v773 build (TT_PROBE=1 on the unchanged build prints them)
    const probe = async () => {
      const S = setup('ja'); quiet(S.c); const c = S.c; allOff(c)
      const tg = S.vocab.find(v => v.japanese === '行く'), inv = c.japaneseLearnerInventory(S.vocab, [tg]), slots = [1, 2, 3].map(k => ({ recallIndex: k, lastFailure: '', failedSentences: [] }))
      const gp = c.buildJapaneseGroupPrompt(tg, slots, inv, S.vocab, 'natural', { initial: true, acceptedForTarget: [], usedInTrack: [], rejected: [], objectives: '', grammarProgress: {}, scenePremise: '' })
      const rp = c.buildJapaneseRecallPrompt(tg, 1, inv, S.vocab, 'natural', { objectives: '', grammarProgress: {} })
      const R = await runGroup(S, '行く', (k, sl) => sl.map(s => s === 2 && k === 1 ? TARA : (s === 2 ? mkRecall('行くよ。', 'I am going.') : CLEAN[s])), null)
      const cf = fresh(); allOff(cf); const vocab = learner(cf, 90); await cf.jaGrammarMigrateV1(vocab)
      const fin = await cf.jaGrammarFinaliseTrack(trackOf(), { vocab, today: TODAY })
      const exp = exportText(cf, fin)
      const st = await cf.jaGrammarLoad(), due = cf.jaGrammarDue({ 'buildingBlock:wa': { type: 'buildingBlock', itemId: 'wa', introducedAt: '2026-09-01', dueDate: '2026-11-20', knownAt: '2026-11-01', sightings: 5 }, 'buildingBlock:ka': { type: 'buildingBlock', itemId: 'ka', introducedAt: '2026-09-01', dueDate: '2026-11-21' } }, 'buildingBlock', TODAY).map(r => r.itemId).join()
      return { group: sha(gp.system + '\n' + gp.user), recall: sha(rp.system + '\n' + rp.user), run: sha(R.grp.slots.map(s => s.pair.japanese).join('|') + '/' + R.grp.paidCalls + '/' + R.calls.length), summary: sha(JSON.stringify(fin.grammarInTrack)), exportText: sha(exp), due, stored: sha(JSON.stringify(Object.keys(st).sort())) }
    }
    if (process.env.TT_PROBE) { console.log(JSON.stringify(await probe(), null, 1)); process.exit(0) }
    const V773 = { group: '82396c1188b4a02d', recall: 'ed7a69ba464225b4', run: '8c40c4f24537ed29', summary: 'd00d840bdeb46b37', exportText: 'ccbbf305dbb0cd21', due: 'wa,ka', stored: '2269a76dcff8f5db' }
    const now = await probe()
    T('F1', 'all four switches off: the writer\'s prompts, a scripted target group (sentences, requests), the track\'s grammar summary and export, the due list and the stored records are exactly what v773 produced',
      Object.keys(V773).every(k => now[k] === V773[k]), { now, V773 })
    const c = fresh(); const names = ['Gate']
    T('F2', 'each switch has a named setter and a reader and is ON by default (jaGrammarGateSetEnabled)',
      names.every(nm => typeof c['jaGrammar' + nm + 'SetEnabled'] === 'function' && typeof c['jaGrammar' + nm + 'On'] === 'function' && c['jaGrammar' + nm + 'On']() === true))
    { const cc = fresh(); cc.jaGrammarGateSetEnabled(false); const L = levelOf(cc, LV.L0), g = cc.jaGrammarGateContext(L.vocab, L.store, { register: 'natural', today: TODAY }), a = typeof cc.jaGrammarStageOn === 'function' ? cc.jaGrammarStageOn() : true
      T('F3', 'the gate switch is its own: off ⇒ no allowed list, no planned entries, a locked entry is not refused (the stage and the others stay on)', (g === null || (g.plannedIds.length === 0 && g.gate === false)) && a === true && (!g || cc.jaGrammarCheckSentence('行ったら言ってね。', g, {}).ok === true)) }
    { const cc = fresh(); cc.jaGrammarFromSentencesSetEnabled(false); const L = levelOf(cc, LV.L0)
      T('F4', 'with the v773 picker switched off nothing here applies either (the up-front list belongs to the picker): no gate is built', cc.jaGrammarGateContext(L.vocab, L.store, { register: 'natural', today: TODAY }) === null) }
    // grammar never touches the words, the slots, the pairs or the closed-vocabulary check
    {
      const cc = fresh(), L = levelOf(cc, LV.L1); await cc.jaGrammarMigrateV1(L.vocab)
      const gate = cc.jaGrammarGateContext(L.vocab, L.store, { register: 'natural', today: TODAY })
      const inv0 = cc.japaneseLearnerInventory(L.vocab, L.vocab.slice(0, 30)), before = FIXJ.map(l => JSON.stringify(cc.japaneseCheckLine(l.ja, inv0)))
      const track = trackOf('2026-11-17T09:04:11.270Z', { trackContext: { trackId: '2026-11-17T09:04:11.270Z', language: 'ja', grammarGate: gate } })
      const sel0 = JSON.stringify(track.selectedTargetIds), kw0 = JSON.stringify(track.keywords), pairs0 = JSON.stringify(track.pairs), vocab0 = JSON.stringify(L.vocab)
      const fin = await cc.jaGrammarFinaliseTrack(track, { vocab: L.vocab, today: TODAY })
      const inv1 = cc.japaneseLearnerInventory(L.vocab, L.vocab.slice(0, 30)), after = FIXJ.map(l => JSON.stringify(cc.japaneseCheckLine(l.ja, inv1)))
      T('F5', 'grammar never changes the 30 target words, their 3 uses each, the 90 target pairs or the closed-vocabulary check: the same words and ids, the same 99 pairs, the same verdicts on all 99 lines before and after, the planned entries are in no word list and use no slot',
        JSON.stringify(fin.selectedTargetIds) === sel0 && JSON.stringify(fin.keywords) === kw0 && JSON.stringify(fin.pairs) === pairs0 && fin.pairs.filter(p => cc.jaGrammarIsTargetPair(p)).length === 90 && fin.keywords.length === 30 &&
        JSON.stringify(before) === JSON.stringify(after) && JSON.stringify(L.vocab) === vocab0 && gate.plannedIds.every(id => !fin.keywords.some(k => k.japanese === id)) && (await cc.stGet('tt-ja-vocab')) == null)
    }
    { // the same words / pairs from a real generation, gate on or off
      const run = async on => { const S = setup('ja'); quiet(S.c); const c2 = S.c; on ? 0 : c2.jaGrammarGateSetEnabled(false); mock(S, 'ja')
        const tc = c2.jaGeneratorTrackContext(S.targets.slice(0, 5).map(t => ({ ...t, selectionRole: 'review' })), { counts: { new: 0 } }, 'daily', 'natural', c2.aiBeginRun('ja-track'))
        const res = await c2.generateJapaneseTrack(S.targets.slice(0, 5), S.vocab, 'natural', KEY, MODEL, () => {}, () => {}, { cancelled: false }, { scene: 'Two friends at a station', characterA: 'Kenji, a man', characterB: 'Yuki, a woman', opening: '', reply: '', closing: '', closing_reply: '' }, { trackContext: tc, runId: tc.generationRunId })
        return { res, tc, S } }
      const a = await run(true), b = await run(false)
      const tp = r => r.res.pairs.filter(p => p.isTargetPair)
      T('F6', 'a real generation with the gate on and off: both complete with 5 targets × 3 = 15 target pairs, the same targets, 3 uses each; grammar is not a target and adds no pair',
        a.res.complete && b.res.complete && tp(a).length === 15 && tp(b).length === 15 && a.S.targets.slice(0, 5).every(t => [1, 2, 3].every(r => tp(a).some(p => p.targetId === t.id && p.recallIndex === r))) &&
        tp(a).map(p => p.targetId).join() === tp(b).map(p => p.targetId).join() && !!a.tc.grammarGate && !b.tc.grammarGate)
    }
    // the rules of the repo: no key, no access code, no model names in comments
    const added = SRC.slice(SRC.indexOf('v774 — THE GRAMMAR A TRACK MAY USE'))
    T('F7', 'no key and no access code in the new code (nothing that looks like an API key, a token or an access code)', SRC.includes('v774 — THE GRAMMAR A TRACK MAY USE') && !/AIza[0-9A-Za-z_-]{20,}|sk-ant-|access[ _-]?code/i.test(added.slice(0, 60000)))
  } catch (e) { T('F!', 'section F stopped: ' + String(e && e.message).split('\n')[0], false, String(e && e.stack).slice(0, 500)) }

  out.forEach(l => console.log(l))
  console.log('\n' + (n - fails) + '/' + n + ' passed' + (fails ? ' · ' + fails + ' FAILED' : ' — ALL PASS'))
  process.exit(fails ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
