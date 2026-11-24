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
// the Japanese plan screen ("Scene Ready": Generate Track from this Scene, the target chips, the Conversation basics): the real JapaneseGenerator, only the scene call answered
async function planScreen(cc, vocab, store) {
  cc.generateJapaneseScene = async () => ({ scene: 'Two friends meet', setting: 'a cafe', characterA: 'Daiki', characterB: 'Mio', opening: 'こんにちは', opening_english: 'Hello', premise: 'x' })
  await cc.stSet('tt-migrations', { 'ja-grammar-curriculum-v1': { status: 'done' } })
  await cc.stSet('tt-ja-grammar-srs', store || {})
  const targets = vocab.slice(0, 5).map(w => ({ ...w, selectionRole: 'review' }))
  let R; await TR.act(async () => { R = TR.create(React.createElement(cc.JapaneseGenerator, { vocab, targets, selection: null, trackMode: 'daily', tracks: [], register: 'natural', cred: { geminiKey: 'k' }, onGenerated() {}, onBack() {} })); for (let i = 0; i < 80; i++) await new Promise(x => setImmediate(x)) })
  return { R, text: textOf(R.toJSON()).replace(/\s+/g, ' ') }
}
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
    T('A9', 'the old "normal inflection of allowed words (is|are) free" sentence is not left in the system prompt to contradict it, and the structure otherwise stays (the closed vocabulary line, the ids line for "blocks", the register contract)',
      !/normal inflection of allowed words (is|are) free/i.test(pr1.system) && /CLOSED VOCABULARY/.test(pr1.system) && /GRAMMAR ids for "blocks"/.test(pr1.user) && /ALLOWED CONTENT \(/.test(pr1.user) && /REGISTER/.test(pr1.system), pr1.system.split('\n').filter(l => /GRAMMAR|inflection/i.test(l)))
    T('A10', 'the single-sentence writer (recovery, repair) gets the same instruction; day one lists no taught entries and says so',
      /use ONLY this grammar/.test(pr1one.user) && g1.planned.every(x => pr1one.user.includes(x.label)) && /use ONLY this grammar/.test(pr0.user) && !/TAUGHT ALREADY:\s*[^\n]*〜/.test(pr0.user) && !/normal inflection of allowed words (is|are) free/i.test(pr1one.system + pr1one.user), pr0.user.split('\n').filter(l => /TAUGHT|NEW THIS/.test(l)))
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

  // ═══ C — SIMPLE FIRST, RICHER AS TAUGHT ════════════════════════════════════════════════════════════════════════════════════════════
  try {
    const S = setup('ja'); quiet(S.c); const c = S.c, ev = x => c.ev(x)
    // the table
    const TABLE = [[0, 'first steps', 12, 2], [5, 'first steps', 12, 2], [6, 'early', 16, 2], [14, 'early', 16, 2], [15, 'growing', 22, 3], [29, 'growing', 22, 3], [30, 'broad', 30, 3], [101, 'broad', 30, 3]]
    T('C1', 'the stage ceilings: 0–5 introduced ⇒ 12 characters · 6–14 ⇒ 16 · 15–29 ⇒ 22 · 30+ ⇒ 30 — and at most 2 gated entries per sentence below 15 introduced, 3 from 15 on',
      TABLE.every(([k, name, ch, g]) => { const s = c.jaGrammarStageFor(k); return s.name === name && s.maxChars === ch && s.maxGated === g }), TABLE.map(([k]) => k + ':' + JSON.stringify(c.jaGrammarStageFor(k))))
    const storeWith = (cnt, must) => { const st = {}; must.forEach(id => c.jaGrammarIntroduce(st, 'buildingBlock', id, '2026-09-01'))
      for (const e of ev('JA_GRAMMAR_CURRICULUM')) { if (Object.keys(st).length >= cnt) break; if (!st['buildingBlock:' + e.id]) c.jaGrammarIntroduce(st, 'buildingBlock', e.id, '2026-09-01') } return st }
    const gateN = (cnt, must, reg) => c.jaGrammarGateContext(learner(c, 200), storeWith(cnt, must || []), { register: reg || 'natural', today: TODAY })
    const chk = (s, g) => c.jaGrammarCheckSentence(s, g, { words: S.vocab })
    T('C2', 'the context carries the stage that matches the number of introduced entries (day one: first steps, 10 introduced: early, 40: broad)',
      gateOf(c, LV.L0).ceilings.name === 'first steps' && gateOf(c, LV.L1).ceilings.name === 'early' && gateOf(c, LV.L2).ceilings.name === 'broad' && gateOf(c, LV.L1).ceilings.maxChars === 16 && gateOf(c, LV.L2).ceilings.maxGated === 3)
    // length: exactly at the ceiling passes, one more fails, at every stage boundary
    const LEN = k => '私は' + '本'.repeat(k - 4) + 'です。'
    const lenBad = []
    ;[[0, 12], [5, 12], [6, 16], [14, 16], [15, 22], [29, 22], [30, 30], [60, 30]].forEach(([cnt, max]) => { const g = gateN(cnt)
      if (!chk(LEN(max), g).ok) lenBad.push(cnt + ': ' + max + ' refused'); const r = chk(LEN(max + 1), g)
      if (r.ok || !r.problems.some(p => p.kind === 'long' && /too long for this stage/.test(p.text) && p.text.includes(String(max + 1)) && p.text.includes('at most ' + max))) lenBad.push(cnt + ': ' + (max + 1) + ' not refused as too long: ' + JSON.stringify(r.problems.map(p => p.text))) })
    T('C3', 'length ceiling per stage: a sentence of exactly 12 / 16 / 22 / 30 characters passes at its stage and one more is refused with "too long for this stage" (at 0, 5, 6, 14, 15, 29, 30 and 60 introduced)', lenBad.length === 0, lenBad)
    // gated count: 2 below 15 introduced, 3 from 15 on
    const S3 = '行きたいけど、行かない。', S4 = '行きたいけど、忙しいから行かない。', S2 = '昨日は忙しかったけど、楽しかった。'
    const MUST = ['tai', 'kedo', 'nai', 'kara', 'past']
    const g14 = gateN(14, MUST), g15 = gateN(15, MUST), g30 = gateN(30, MUST)
    const many = r => r.problems.find(p => p.kind === 'many')
    T('C4', 'complexity ceiling: three gated entries in one sentence (〜たい 〜けど 〜ない) are refused with "too many new grammar points in one sentence" while 14 entries are introduced, and pass from 15 on; two always pass',
      !chk(S3, g14).ok && many(chk(S3, g14)) && /too many new grammar points in one sentence/.test(many(chk(S3, g14)).text) && many(chk(S3, g14)).ids.length === 3 && chk(S3, g15).ok && chk(S2, g14).ok && chk(S2, g15).ok, { s3_14: chk(S3, g14).problems.map(p => p.text), s3_15: chk(S3, g15).problems.map(p => p.text), s2: chk(S2, g14).problems.map(p => p.text) })
    T('C5', 'four gated entries in one sentence (〜たい 〜けど 〜から 〜ない) are refused at every stage, 15 introduced and 30 introduced included (at most 3 after 15)',
      !chk(S4, g14).ok && !chk(S4, g15).ok && !chk(S4, g30).ok && many(chk(S4, g15)) && many(chk(S4, g15)).ids.length === 4 && /at most 3/.test(many(chk(S4, g15)).text) && /at most 2/.test(many(chk(S4, g14)).text), chk(S4, g15).problems.map(p => p.text))
    // a line of several sentences is read one sentence at a time (the ceiling is per sentence)
    T('C6', 'a line of several sentences is judged sentence by sentence: two 11-character sentences pass at the 12-character stage (22 in all), three one-entry sentences pass where three entries in ONE sentence would not, and one sentence of 13 is still refused',
      chk(LEN(11) + LEN(11), gateN(0)).ok && chk('行きたい。行かない。行った。', g14).ok && !chk('行きたい。行かない。行った。', g14).problems.length && !chk(LEN(13) + LEN(5), gateN(0)).ok && chk(LEN(13) + LEN(5), gateN(0)).problems[0].chars === 13)
    // what never counts: ね / よ, the short reactions, the whole free core, the polite ます in a polite style
    const natural = ['ねえ、行くよね？', 'えっ、本当？', 'ええと、水、飲むよ。', 'うん、いいね。', 'でも、行く？', 'だから、私は行くよ。', 'あの、これは本です。', 'へえ、だね。']
    T('C7', 'keeping it natural: ね, よ, よね, だ, です, でも, だから and the short reactions (えっ ええと ねえ へえ あの うん) are never counted, at the strictest stage',
      natural.every(s => chk(s, gateN(0)).ok), natural.filter(s => !chk(s, gateN(0)).ok).map(s => s + ' ' + JSON.stringify(chk(s, gateN(0)).problems.map(p => p.text))))
    T('C8', 'in a polite speech style the ます form is the present verb: it is free and not counted (食べます。 passes on day one in a polite track and is refused in a natural one)',
      chk('食べます。', gateN(0, [], 'polite')).ok && !chk('食べます。', gateN(0, [], 'natural')).ok && gateN(0, [], 'polite').coreIds.includes('masu') && !gateN(0, [], 'natural').coreIds.includes('masu'))
    // the writer is told the stage in words
    const tg = S.vocab.find(v => v.japanese === '飲む'), inv = c.japaneseLearnerInventory(S.vocab, [tg]), slots = [1, 2, 3].map(k => ({ recallIndex: k, lastFailure: '', failedSentences: [] }))
    const pr = lv => c.buildJapaneseGroupPrompt(tg, slots, inv, S.vocab, 'natural', { initial: true, acceptedForTarget: [], usedInTrack: [], rejected: [], objectives: '', grammarProgress: {}, grammarGate: gateOf(c, LV[lv]) }).user
    T('C9', 'the writer\'s prompt states the stage in words: day one "first steps … at most 12 characters … at most 2 grammar points that are not FREE"; 90 words "early … 16"; 200 words "broad … 30 … 3"',
      /STAGE — first steps: this learner has been taught 0 grammar points so far[\s\S]*at most 12 characters[\s\S]*at most 2 grammar points that are not FREE/.test(pr('L0')) && /STAGE — early: this learner has been taught 10 grammar points[\s\S]*at most 16 characters/.test(pr('L1')) &&
      /STAGE — broad: this learner has been taught 40 grammar points[\s\S]*at most 30 characters[\s\S]*at most 3 grammar points/.test(pr('L2')), pr('L0').split('\n').filter(l => /STAGE/.test(l)))
    // through the ladder and the group core: too long ⇒ refused with a plain reason, retried through the existing path; at the cap kept and flagged
    const g0 = gateOf(c, LV.L0)
    const CL = { 1: mkRecall('水を飲む？', 'Do you want some water?'), 2: mkRecall('明日、飲むよ。', 'I will drink tomorrow.'), 3: mkRecall('飲むね。', 'I will drink, okay?') }
    const LONGS = [mkRecall('今日は友達と一緒に駅で水を飲むよ。', 'I will drink water with a friend at the station today.'), mkRecall('明日の朝は友達と一緒に学校で水を飲むよ。', 'Tomorrow morning I will drink water with a friend at school.'), mkRecall('今日の昼は友達と一緒に駅の店で水を飲むよ。', 'At noon today I will drink water with a friend in a shop at the station.')]
    const R1 = await runGroup(S, '飲む', (k, sl) => sl.map(s => s === 2 && k === 1 ? LONGS[0] : CL[s]), g0)
    T('C10', 'too long ⇒ refused with the plain reason, written again through the existing retry (slot only), accepted the second time — 2 paid requests',
      R1.grp.paidCalls === 2 && R1.grp.slots.every(s => s.state === 'accepted') && /PREVIOUS FAILURES[\s\S]*GRAMMAR_STAGE: too long for this stage \(16 characters; at most 12 at this stage\)/.test(R1.calls[1] || '') && /REPLACEMENT ONLY/.test(R1.calls[1] || '') && !R1.grp.slots.some(s => s.pair._grammarFlag),
      { paid: R1.grp.paidCalls, retry: (R1.calls[1] || '').slice(0, 500), slots: R1.grp.slots.map(s => s.state) })
    const R2 = await runGroup(S, '飲む', (k, sl) => sl.map(s => s === 2 ? LONGS[Math.min(k, 3) - 1] : CL[s]), g0)
    const s2 = R2.grp.slots.find(s => s.recallIndex === 2)
    T('C11', 'a line that is still too long at the cap is KEPT with its flag (the existing 3 attempts, no new loop), the other two recalls are untouched',
      R2.grp.slots.every(s => s.state === 'accepted') && s2.paidRequests === 3 && R2.grp.paidCalls === 3 && s2.pair._grammarFlag && s2.pair._grammarFlag.some(f => f.kind === 'long') && R2.grp.slots.filter(s => s.recallIndex !== 2).every(s => !s.pair._grammarFlag),
      { paid: R2.grp.paidCalls, flag: s2.pair && s2.pair._grammarFlag, log: R2.logs.slice(-3) })
    // the finished track names them
    const cf = fresh(), vocab = learner(cf, 25); await cf.jaGrammarMigrateV1(vocab)
    const L0 = levelOf(cf, LV.L0), gate = cf.jaGrammarGateContext(L0.vocab, L0.store, { register: 'natural', today: TODAY })
    const fin = await cf.jaGrammarFinaliseTrack(trackOf('2026-11-17T09:04:11.270Z', { trackContext: { trackId: '2026-11-17T09:04:11.270Z', language: 'ja', grammarGate: gate } }), { vocab: L0.vocab, today: TODAY })
    const txt = exportText(cf, fin), gl = txt.split('\n').filter(l => /^GRAMMAR STAGE:/.test(l)), sf = fin.grammarInTrack.gate.stageFlags
    const words0 = L0.vocab.filter(w => /^[おご]/.test(w.japanese))
    T('C12', 'the export lists every line that breaks a ceiling: "GRAMMAR STAGE: pair N is too long for this stage (…)" and "… combines N new grammar points (…)" — the same set the check finds in the final sentences',
      sf.length > 0 && gl.length === sf.length && gl.every(l => /^GRAMMAR STAGE: pair \d\d (is too long for this stage \(\d+ characters; at most 12 at this stage\)|combines \d new grammar points \(.+; at most 2 at this stage\))$/.test(l)) &&
      FIXJ.every(l => { const r = cf.jaGrammarCheckSentence(l.ja, gate, { words: words0 }), want = r.problems.filter(p => p.kind !== 'locked').map(p => p.kind).sort().join(), got = sf.filter(x => x.n === l.n).map(x => x.kind).sort().join(); return want === got }), { n: sf.length, lines: gl.slice(0, 3) })
    T('C13', 'a line over a ceiling never blocks the track: the same 99 pairs, 90 target pairs, 30 words, and the same readiness line as the track without any flag',
      fin.pairs.length === 99 && fin.pairs.filter(p => cf.jaGrammarIsTargetPair(p)).length === 90 && fin.keywords.length === 30 && JSON.stringify(fin.pairs) === JSON.stringify(trackOf().pairs) &&
      cf.trackReadinessExportLines(fin)[0] === cf.trackReadinessExportLines({ ...trackOf('2026-11-17T09:04:11.270Z'), integrity: fin.integrity, trackContext: fin.trackContext })[0])
    T('C14', 'the same flags are on the track screen', await (async () => { let R; await TR.act(async () => { R = TR.create(React.createElement(cf.JaGrammarInTrack, { track: fin })); await flush(3) }); const j = textOf(R.toJSON()); return /pair\s+\d\d\s+is too long for this stage/.test(j) && /GRAMMAR STAGE/.test(j) })())
    // the fixture at the three levels, with the stage (reported)
    for (const k of ['L0', 'L1', 'L2']) {
      const gg = gateOf(c, LV[k]), kinds = { locked: 0, many: 0, long: 0 }, lines = new Set()
      FIXJ.forEach(l => { const r = c.jaGrammarCheckSentence(l.ja, gg, { words: S.vocab }); r.problems.forEach(p => { kinds[p.kind]++; lines.add(l.n) }) })
      info('FIXTURE with the stage, ' + k + ' (' + LV[k].label + ', ceilings ' + gg.ceilings.maxChars + ' characters / ' + gg.ceilings.maxGated + ' gated): ' + lines.size + ' of 99 lines refused — outside the list ' + kinds.locked + ' · too many points ' + kinds.many + ' · too long ' + kinds.long)
    }
    // the switch is its own
    { const cc = fresh(); cc.jaGrammarStageSetEnabled(false); const L = levelOf(cc, LV.L0), gs = cc.jaGrammarGateContext(L.vocab, L.store, { register: 'natural', today: TODAY })
      T('C15', 'the stage switch is its own: off ⇒ a sentence of 25 characters passes, a locked entry is still refused, and the prompt has no STAGE line',
        cc.jaGrammarStageOn() === false && cc.jaGrammarCheckSentence(LEN(25), gs, {}).ok && !cc.jaGrammarCheckSentence('行ったら言ってね。', gs, {}).ok && !/STAGE —/.test(cc.jaGrammarGatePromptBlock(gs)) && /use ONLY this grammar/.test(cc.jaGrammarGatePromptBlock(gs))) }
    { const cc = fresh(); cc.jaGrammarGateSetEnabled(false); const L = levelOf(cc, LV.L0), gs = cc.jaGrammarGateContext(L.vocab, L.store, { register: 'natural', today: TODAY })
      const tg2 = S.vocab.find(v => v.japanese === '飲む'), inv2 = cc.japaneseLearnerInventory(S.vocab, [tg2])
      const p2 = cc.buildJapaneseGroupPrompt(tg2, slots, inv2, S.vocab, 'natural', { initial: true, acceptedForTarget: [], usedInTrack: [], rejected: [], objectives: '', grammarProgress: {}, grammarGate: gs })
      T('C16', 'with only the stage on: a locked entry passes, a long sentence is refused, the prompt carries the stage but no "use ONLY" list, no planned entries, and the old grammar sentence of the system prompt is untouched',
        gs && gs.gate === false && gs.stage === true && gs.plannedIds.length === 0 && cc.jaGrammarCheckSentence('行ったら言ってね。', gs, {}).ok && !cc.jaGrammarCheckSentence(LEN(13), gs, {}).ok && /STAGE — first steps/.test(p2.user) && !/use ONLY this grammar/.test(p2.user) && /normal inflection of allowed words (is|are) free/i.test(p2.system)) }
    { const cc = fresh(); cc.jaGrammarGateSetEnabled(false); cc.jaGrammarStageSetEnabled(false); const L = levelOf(cc, LV.L0)
      T('C17', 'both off ⇒ no context at all (v773 behaviour)', cc.jaGrammarGateContext(L.vocab, L.store, { register: 'natural', today: TODAY }) === null) }
  } catch (e) { T('C!', 'section C stopped: ' + String(e && e.message).split('\n')[0], false, String(e && e.stack).slice(0, 500)) }

  // ═══ D — KNOWN AFTER 3 SIGHTINGS ════════════════════════════════════════════════════════════════════════════════════════════════
  try {
    const c = fresh(), ev = x => c.ev(x)
    const TARA3 = ['行ったら言ってね。', '友達に会ったら教えてね。', '雨が降ったら行かないよ。']       // 3 sentences that use 〜たら
    const mk = lines => lines.map((s, i) => ({ speaker: 'A', japanese: s, thai: s, targetId: 3000 + i, wordId: 3000 + i, isTargetPair: true, recallIndex: 1 }))
    const trk = (id, lines) => ({ language: 'ja', createdAt: id, date: id.slice(0, 10), mode: 'daily', speechStyle: 'natural', trackContext: { trackId: id, language: 'ja' }, keywords: [{ japanese: 'w', wordId: 1, rating: null }], selectedTargetIds: [1], pairs: mk(lines), buildingBlocks: [] })
    const intro = (store, ids) => ids.forEach(id => c.jaGrammarIntroduce(store, 'buildingBlock', id, '2026-09-01'))
    const rec = (store, an, trackId, day) => c.jaGrammarRecordSightings(store, an, trackId, day || TODAY)
    const R = ev('JA_GRAMMAR_KNOWN_RULE')
    T('D1', 'the rule is written down: known at 3 sentences across 2 different tracks', R.minSentences === 3 && R.minTracks === 2)
    // 3 uses in ONE track do not make it known; 3 uses across 2 tracks do
    { const st = {}; intro(st, ['tara'])
      const anA = c.jaGrammarAnalyseTrack(mk(TARA3)); const r1 = rec(st, anA, 'track-A')
      const x = st['buildingBlock:tara']
      T('D2', 'three sentences in ONE track do NOT make an entry known: 3 sightings, 1 track, no known date',
        x.sightings === 3 && x.sightingTracks.length === 1 && !x.knownAt && r1.becameKnown.length === 0 && r1.changes >= 1, x) }
    { const st = {}; intro(st, ['tara'])
      rec(st, c.jaGrammarAnalyseTrack(mk(TARA3.slice(0, 1))), 'track-A')
      const mid = JSON.stringify(st['buildingBlock:tara'])
      const r2 = rec(st, c.jaGrammarAnalyseTrack(mk(TARA3.slice(1))), 'track-B', '2026-11-25'), x = st['buildingBlock:tara']
      T('D3', 'three sentences across TWO tracks (1 + 2) make it known: 3 sightings, tracks A and B, the day it became known; one sentence and then one more (2 in all) is not enough',
        !JSON.parse(mid).knownAt && x.sightings === 3 && x.sightingTracks.join() === 'track-A,track-B' && x.knownAt === '2026-11-25' && r2.becameKnown.join() === 'tara', { mid, x })
      const st2 = {}; intro(st2, ['tara']); rec(st2, c.jaGrammarAnalyseTrack(mk(TARA3.slice(0, 1))), 'track-A'); rec(st2, c.jaGrammarAnalyseTrack(mk(TARA3.slice(1, 2))), 'track-B')
      const x2 = JSON.parse(JSON.stringify(st2['buildingBlock:tara'])); rec(st2, c.jaGrammarAnalyseTrack(mk(TARA3.slice(2))), 'track-C', '2026-11-26')
      T('D4', 'one sentence in each of three tracks is known at the third (3 sentences, 3 tracks); two sentences in two tracks are not', !x2.knownAt && x2.sightings === 2 && st2['buildingBlock:tara'].knownAt === '2026-11-26' && st2['buildingBlock:tara'].sightingTracks.length === 3) }
    // a track is never counted twice
    { const st = {}; intro(st, ['tara']); const an = c.jaGrammarAnalyseTrack(mk(TARA3.slice(0, 2)))
      rec(st, an, 'track-A'); const once = JSON.stringify(st); const r = rec(st, an, 'track-A'); rec(st, an, 'track-A')
      T('D5', 'idempotent: recording the same track again changes nothing (same counters, same track list, no second count)', JSON.stringify(st) === once && r.changes === 0 && st['buildingBlock:tara'].sightings === 2, st['buildingBlock:tara']) }
    // only introduced entries count; existing records keep everything they had
    { const st = {}; intro(st, ['wa']); st['buildingBlock:wa'] = { ...st['buildingBlock:wa'], interval: 7, dueDate: '2026-12-01', exposures: 9, status: 'learning', note: 'mine' }
      const before = JSON.stringify(st['buildingBlock:wa']); rec(st, c.jaGrammarAnalyseTrack(mk(['私は行く。'])), 'track-A')
      const w = st['buildingBlock:wa']
      T('D6', 'an entry that is not introduced gets no sightings (〜たら here), and an introduced one keeps every field it had (interval, due date, exposures, status, extra fields) — it starts at 0 sightings, no invented history',
        !st['buildingBlock:tara'] && w.interval === 7 && w.dueDate === '2026-12-01' && w.exposures === 9 && w.status === 'learning' && w.note === 'mine' && w.sightings === 1 && JSON.parse(before).sightings === undefined, w) }
    // known entries leave NEW and REVIEW, take no review slot
    const knownStore = () => { const st = {}; intro(st, ['wa', 'ka', 'ne', 'yo', 'da']);
      ;['wa', 'ka', 'ne'].forEach((id, i) => { Object.assign(st['buildingBlock:' + id], { dueDate: ['2026-11-20', '2026-11-21', '2026-11-22'][i], interval: 3, status: 'learning' }) })
      Object.assign(st['buildingBlock:wa'], { knownAt: '2026-11-10', sightings: 6, sightingTracks: ['a', 'b'] }); return st }
    { const st = knownStore(), p = c.jaGrammarPlan(c.jaGrammarAnalyseTrack(mk(['私は行くか。', '水は飲むね。', 'これは本だね。', 'あれは本だよ。', '私は行くよ。'])), { known: 90, store: st, today: TODAY })
      T('D7', 'a known entry leaves the NEW and REVIEW lists and takes no review slot: は is due but known, so the two review slots go to か and ね, and は is listed as known',
        p.review.map(x => x.id).join() === 'ka,ne' && !p.new.some(x => x.id === 'wa') && p.knownGrammar.map(x => x.id).join() === 'wa' && !p.alsoUsed.some(x => x.id === 'wa'), { review: p.review.map(x => x.id), known: p.knownGrammar.map(x => x.id) })
      const due = c.jaGrammarDue(st, 'buildingBlock', TODAY).map(r => r.itemId).join(), tp = c.jaGrammarTrackPlan(st, 90, { today: TODAY })
      T('D8', 'anything that reads "due" skips it (the due list, the overdue count behind "no new entries while more than 6 are overdue", the review list on the plan screen) — and anything that reads "introduced" still counts it (allowed, never planned again, still satisfies a prerequisite)',
        due === 'ka,ne' && tp.review.map(x => x.id).join() === 'ka,ne' && tp.overdue === 2 && !tp.next.some(x => x.id === 'wa') && c.jaGrammarIntroducedIds(st).includes('wa') && c.jaGrammarGateContext(learner(c, 90), st, { register: 'natural', today: TODAY }).introducedIds.includes('wa') &&
        c.jaBlocksAvailable(learner(c, 90), st).some(b => b.id === 'mo'), { due, tp: tp.review.map(x => x.id), overdue: tp.overdue })
      const many = knownStore(); ;['plain-present', 'san', 'wo', 'ni', 'no', 'de'].forEach(id => { intro(many, [id]); Object.assign(many['buildingBlock:' + id], { dueDate: '2026-11-01', interval: 2 }) })
      Object.assign(many['buildingBlock:ka'], { knownAt: '2026-11-10' }); Object.assign(many['buildingBlock:ne'], { knownAt: '2026-11-10' })
      const od = c.jaGrammarTrackPlan(many, 90, { today: TODAY })
      const offK = fresh(); offK.jaGrammarKnownSetEnabled(false); const od0 = offK.jaGrammarTrackPlan(many, 90, { today: TODAY })
      T('D9', 'known entries do not count as overdue: 9 entries are overdue, 3 of them known, so 6 count and new entries are still planned (7 or more would hold them back; with the known rule off the same store counts 9 and holds)', od.overdue === 6 && od.held === false && od.next.length > 0 && od0.overdue === 9 && od0.held === true && od0.next.length === 0, { on: od.overdue, off: od0.overdue })
      const ln = c.jaItemStatus(st['buildingBlock:wa'], TODAY)
      T('D10', 'the status shown for a known entry is LEARNED (it was DUE)', ln === 'LEARNED' && c.jaItemStatus({ ...st['buildingBlock:wa'], knownAt: null }, TODAY) === 'DUE', ln) }
    // the real finaliser: two tracks, the second makes it known; the summary and the export say so; one track finalised twice counts once
    {
      const cc = fresh(), vocab = learner(cc, 90); await cc.jaGrammarMigrateV1(vocab)
      const st0 = await cc.jaGrammarLoad(); const snap = JSON.stringify(st0)
      const A = await cc.jaGrammarFinaliseTrack(trk('2026-11-20T10:00:00.000Z', ['私は水を飲む？', '私は行くよ。', 'これは私の本だよ。']), { vocab, today: '2026-11-20' })
      const stA = await cc.jaGrammarLoad()
      const wa1 = stA['buildingBlock:wa']
      const A2 = await cc.jaGrammarFinaliseTrack(trk('2026-11-20T10:00:00.000Z', ['私は水を飲む？', '私は行くよ。', 'これは私の本だよ。']), { vocab, today: '2026-11-20' })   // an equal track without its grammar section: finalised "again"
      const stA2 = await cc.jaGrammarLoad()
      T('D11', 'finalised twice (a second copy of the same track, without the grammar section the first one received): the sightings and the track list do not change, the track is not counted again',
        wa1 && wa1.sightings === 3 && wa1.sightingTracks.join() === '2026-11-20T10:00:00.000Z' && stA2['buildingBlock:wa'].sightings === 3 && stA2['buildingBlock:wa'].sightingTracks.length === 1 && !stA2['buildingBlock:wa'].knownAt, { wa1, wa2: stA2['buildingBlock:wa'] })
      const B = await cc.jaGrammarFinaliseTrack(trk('2026-11-22T10:00:00.000Z', ['私は寝る。']), { vocab, today: '2026-11-22' })
      const stB = await cc.jaGrammarLoad(), wa = stB['buildingBlock:wa']
      T('D12', 'a second track that uses は once more makes it known (4 sentences, 2 tracks): the record carries the counters, the two track ids and the date, and the track summary names it as having become known',
        wa.sightings === 4 && wa.sightingTracks.length === 2 && wa.knownAt === '2026-11-22' && B.grammarInTrack.becameKnown && B.grammarInTrack.becameKnown.some(x => x.id === 'wa' && x.sightings === 4 && x.tracks === 2) && !A.grammarInTrack.becameKnown, { wa, b: B.grammarInTrack.becameKnown })
      T('D13', 'nothing was deleted or overwritten: every record that existed before is still there, every field it had keeps its value except the new counters',
        Object.keys(JSON.parse(snap)).every(k => stB[k] && Object.keys(JSON.parse(snap)[k]).every(f => JSON.stringify(stB[k][f]) === JSON.stringify(JSON.parse(snap)[k][f]) || ['exposures', 'productiveExposures', 'lastSeen', 'dueDate', 'autoScheduled', 'sightings', 'sightingTracks', 'knownAt', 'seenInPassing', 'lastPassing', 'introducedAt', 'status', 'interval'].includes(f))) &&
        Object.keys(JSON.parse(snap)).every(k => JSON.parse(snap)[k].introducedAt ? stB[k].introducedAt === JSON.parse(snap)[k].introducedAt : true))
      // the third track: は is known now — not NEW, not REVIEW, listed as known, and exposures still counted
      const C3 = await cc.jaGrammarFinaliseTrack(trk('2026-11-25T10:00:00.000Z', ['私は走る。', '私は行く？']), { vocab, today: '2026-11-25' })
      const g3 = C3.grammarInTrack
      T('D14', 'in the next track は is KNOWN: it is in neither NEW nor REVIEW nor ALSO USED, it is listed as known, it takes no review slot — and a known entry\'s sightings keep counting',
        g3.knownUsed && g3.knownUsed.some(x => x.id === 'wa') && !g3.new.concat(g3.review, g3.alsoUsed).some(x => x.id === 'wa') && (await cc.jaGrammarLoad())['buildingBlock:wa'].sightings === 6, { known: g3.knownUsed && g3.knownUsed.map(x => x.id) })
      const txt = exportText(cc, B), txt3 = exportText(cc, C3)
      T('D15', 'the export says so: "BECAME KNOWN WITH THIS TRACK" in the track that made it known, "KNOWN (…not reviewed)" in the next one',
        /\nBECAME KNOWN WITH THIS TRACK/.test(txt) && /は \[wa\]|は — topic marker/.test(txt.slice(txt.indexOf('BECAME KNOWN'))) && /\nKNOWN \(/.test(txt3) && !/\nBECAME KNOWN/.test(txt3), txt.split('\n').filter(l => /KNOWN/.test(l)))
      // the Known grammar list in the Japanese Words area
      await cc.stSet('tt-ja-grammar-srs', stB)
      const lst = cc.jaGrammarKnownList(stB)
      T('D16', 'the Known grammar list has, for each known entry, its short explanation, how many sightings (and tracks) and the day it became known: は (4 sentences, 2 tracks) and the plain present (3, 2)', lst.length === 2 && lst[0].id === 'wa' && lst[0].label === 'は' && lst[0].explain.length > 5 && lst[0].sightings === 4 && lst[0].tracks === 2 && lst[0].knownAt === '2026-11-22' && lst[1].id === 'plain-present' && lst[1].sightings === 3 && lst[1].explain.length > 5, lst)
      let W; await TR.act(async () => { W = TR.create(React.createElement(cc.WordListView, { vocab: [], lang: 'ja', initialFilter: 'all', onBack() {} })); await flush(10) })
      let j = textOf(W.toJSON())
      T('D17', 'the Japanese Words area carries one slim row "Known grammar (2)", closed by default (the least intrusive place that already exists: the word list the Words / Known tiles open)', /Known grammar \(\s*2\s*\)/.test(j) && !j.includes(lst[0].explain))
      const tog = W.root.findAll(x => x.props && x.props['data-known-grammar-toggle'] && typeof x.props.onClick === 'function')[0]
      await TR.act(async () => { tog.props.onClick(); await flush(3) }); j = textOf(W.toJSON())
      T('D18', 'opened, it lists は with its explanation, "4 sightings in 2 tracks" and "known since 2026-11-22"', j.includes(lst[0].explain) && /4\s+sightings/.test(j) && /2\s+tracks/.test(j) && /2026-11-22/.test(j), j.slice(0, 400))
      let Wt; await TR.act(async () => { Wt = TR.create(React.createElement(cc.WordListView, { vocab: [], lang: 'th', initialFilter: 'all', onBack() {} })); await flush(5) })
      T('D19', 'the other languages\' word lists are untouched: no Known grammar row in the Thai list', !/Known grammar/.test(textOf(Wt.toJSON())))
      // the empty state
      const ce = fresh(); let We; await TR.act(async () => { We = TR.create(React.createElement(ce.WordListView, { vocab: [], lang: 'ja', initialFilter: 'all', onBack() {} })); await flush(10) })
      const te = We.root.findAll(x => x.props && x.props['data-known-grammar-toggle'] && typeof x.props.onClick === 'function')[0]; await TR.act(async () => { te.props.onClick(); await flush(3) })
      T('D20', 'with nothing known yet the row says so and tells the rule (3 sentences across 2 tracks)', /Known grammar \(\s*0\s*\)/.test(textOf(We.toJSON())) && /3\s+sentences/.test(textOf(We.toJSON())) && /2\s+(different\s+)?tracks/.test(textOf(We.toJSON())))
    }
    // the switch
    { const cc = fresh(); cc.jaGrammarKnownSetEnabled(false); const st = knownStore(), vocab = learner(cc, 90); await cc.jaGrammarMigrateV1(vocab)
      const p = cc.jaGrammarPlan(cc.jaGrammarAnalyseTrack(mk(['私は行く？', '水は飲む？', 'これはいいね。', 'あれは本だよ。'])), { known: 90, store: st, today: TODAY })
      const f1 = await cc.jaGrammarFinaliseTrack(trk('2026-11-20T10:00:00.000Z', ['私は水を飲む？', '私は行くよ。']), { vocab, today: '2026-11-20' }), f2 = await cc.jaGrammarFinaliseTrack(trk('2026-11-22T10:00:00.000Z', ['私は寝る。', '私は走る。']), { vocab, today: '2026-11-22' })
      const stx = await cc.jaGrammarLoad()
      let We; await TR.act(async () => { We = TR.create(React.createElement(cc.WordListView, { vocab: [], lang: 'ja', initialFilter: 'all', onBack() {} })); await flush(10) })
      T('D21', 'known switch off: a known flag is ignored (は is due and takes a review slot as before), no counters are written however many tracks are finalised, nothing becomes known, and the Known grammar row is not shown',
        cc.jaGrammarKnownOn() === false && cc.jaGrammarDue(st, 'buildingBlock', TODAY).map(r => r.itemId).join() === 'wa,ka,ne' && p.review.some(x => x.id === 'wa') && !p.knownGrammar.length &&
        Object.values(stx).every(r => r.sightings === undefined && r.sightingTracks === undefined && r.knownAt === undefined) && !f1.grammarInTrack.becameKnown && !f2.grammarInTrack.becameKnown && !f2.grammarInTrack.knownUsed && !/Known grammar/.test(textOf(We.toJSON()))) }
  } catch (e) { T('D!', 'section D stopped: ' + String(e && e.message).split('\n')[0], false, String(e && e.stack).slice(0, 500)) }

  // ═══ E — THE PLAN-SCREEN PREVIEW ═══════════════════════════════════════════════════════════════════════════════════════════════════
  try {
    const cj = fresh(), ev = x => cj.ev(x)
    const Ldue = levelOf(cj, LV.L1, st => { ;['wa', 'ka'].forEach((id, i) => { Object.assign(st['buildingBlock:' + id], { dueDate: ['2026-01-02', '2026-01-03'][i], interval: 2, status: 'learning' }) }) })
    const planNow = cj.jaGrammarTrackPlan(Ldue.store, cj.jaGrammarKnownCount(Ldue.vocab), {})
    const P = await planScreen(cj, Ldue.vocab, Ldue.store), t = P.text
    T('E1', 'the Japanese plan screen (Generate Track from this Scene, the target chips) carries a "Grammar for this track" block, labelled as a PREVIEW, that says the final list is fixed after the sentences are written',
      /Generate Track from this Scene/.test(t) && /Grammar for this track/i.test(t) && /preview/i.test(t) && /final list is fixed after the sentences are written/i.test(t), t.slice(0, 700))
    const iBlock = t.indexOf('Grammar for this track'), blk = iBlock >= 0 ? t.slice(iBlock) : ''
    T('E2', 'it shows the grammar due for review (は and か here, the most overdue first) and the next entries the learner\'s level would introduce, up to 5 points — every one by its label, with the points used',
      /due for review/i.test(blk) && blk.indexOf('は') >= 0 && planNow.review.map(x => x.label).every(l => blk.includes(l)) && planNow.next.length > 0 && planNow.next.every(x => blk.includes(x.label)) && new RegExp(planNow.budget.spent + '\\s+of\\s+5\\s+points').test(blk) && planNow.review.length === 2, blk.slice(0, 600))
    // the same function behind the prompt: the preview lists exactly what the writer is sent
    const vocab = Ldue.vocab, gate = cj.jaGrammarGateContext(vocab, Ldue.store, { register: 'natural' })
    const S = setup('ja'); quiet(S.c); const tg = S.vocab.find(v => v.japanese === '行く'), inv = S.c.japaneseLearnerInventory(S.vocab, [tg]), slots = [1, 2, 3].map(k => ({ recallIndex: k, lastFailure: '', failedSentences: [] }))
    const wp = S.c.buildJapaneseGroupPrompt(tg, slots, inv, S.vocab, 'natural', { initial: true, acceptedForTarget: [], usedInTrack: [], rejected: [], objectives: '', grammarProgress: {}, grammarGate: JSON.parse(JSON.stringify(gate)) }).user
    const idsOf = attr => [...new Set(P.R.root.findAll(x => x.props && typeof x.props[attr] === 'string').map(x => x.props[attr]))]
    const shownNext = idsOf('data-preview-next'), shownReview = idsOf('data-preview-review')
    T('E3', 'the preview matches what the writer is sent: the same entries (the same function), in the same order, and the writer\'s prompt names each of them as new in this track',
      blk.length > 0 && gate.plannedIds.join() === planNow.next.map(x => x.id).join() && planNow.next.every(x => wp.includes(x.label)) && shownNext.join() === planNow.next.map(x => x.id).join() && shownReview.join() === planNow.review.map(x => x.id).join() &&
      gate.review.map(x => x.id).join() === planNow.review.map(x => x.id).join(), { gate: gate.plannedIds, plan: planNow.next.map(x => x.id) })
    await TR.act(async () => { P.R.unmount() })
    // the rule that holds new points back is shown, not hidden
    const Lh = levelOf(cj, LV.L1, st => { ;['wa', 'ka', 'ne', 'yo', 'da', 'plain-present', 'san'].forEach(id => { Object.assign(st['buildingBlock:' + id], { dueDate: '2026-01-01', interval: 2 }) }) })
    const H = await planScreen(cj, Lh.vocab, Lh.store), th = H.text.slice(H.text.indexOf('Grammar for this track'))
    T('E4', 'with more than 6 reviews overdue the preview says no new points this track and why (7 reviews are overdue), and lists none',
      /no new/i.test(th) && /7 reviews are overdue/.test(th) && cj.jaGrammarTrackPlan(Lh.store, 90, {}).next.length === 0, th.slice(0, 500))
    await TR.act(async () => { H.R.unmount() })
    // day one: nothing taught yet — は か ね よ だ are what a first track introduces
    const L0 = levelOf(cj, LV.L0), Z = await planScreen(cj, L0.vocab, L0.store), tz = Z.text.slice(Z.text.indexOf('Grammar for this track'))
    T('E5', 'day one: the preview lists は か ね よ だ as the next entries (5 points) and nothing due', ['は', 'か', 'ね', 'よ', 'だ'].every(l => tz.includes(l)) && /5\s+of\s+5\s+points/.test(tz), tz.slice(0, 400))
    await TR.act(async () => { Z.R.unmount() })
    // the screen is the plan screen only: the component renders nothing without progress, and the other languages' plan screens are the same functions as before (F1 holds their sha)
    T('E6', 'it renders nothing until the progress is loaded (no flash of a wrong list) and nothing for a switched-off preview',
      (() => { const r1 = TR.create(React.createElement(cj.JaGrammarPreview, { vocab: Ldue.vocab, store: null })); const nothing = r1.toJSON() === null
        cj.jaGrammarPreviewSetEnabled(false); const r2 = TR.create(React.createElement(cj.JaGrammarPreview, { vocab: Ldue.vocab, store: Ldue.store })); const off = r2.toJSON() === null; cj.jaGrammarPreviewSetEnabled(true); return nothing && off })())
    { const cc = fresh(); cc.jaGrammarPreviewSetEnabled(false); const L = levelOf(cc, LV.L1), X = await planScreen(cc, L.vocab, L.store)
      T('E7', 'preview switch off: the plan screen has no "Grammar for this track" block, and the rest of the screen is the screen v773 showed', !/Grammar for this track/i.test(X.text) && cc.jaGrammarPreviewOn() === false, X.text.slice(0, 300))
      await TR.act(async () => { X.R.unmount() }) }
    { const cc = fresh(); cc.jaGrammarGateSetEnabled(false); const L = levelOf(cc, LV.L1), X = await planScreen(cc, L.vocab, L.store), tx = X.text.slice(X.text.indexOf('Grammar for this track'))
      T('E8', 'with the gate off the preview still shows (its own switch) but says plainly that the writer is not limited to this list', /Grammar for this track/i.test(X.text) && /not limited/i.test(tx), tx.slice(0, 500))
      await TR.act(async () => { X.R.unmount() }) }
  } catch (e) { T('E!', 'section E stopped: ' + String(e && e.message).split('\n')[0], false, String(e && e.stack).slice(0, 500)) }

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
      const cp = fresh(); allOff(cp); const Lp = levelOf(cp, LV.L1); const ps = await planScreen(cp, Lp.vocab, Lp.store); await TR.act(async () => { ps.R.unmount() })
      const gens = ['Generator', 'MandarinGenerator', 'CantoneseGenerator'].map(k => sha(cp.ev('(' + k + ')').toString())).join('/')
      return { plan: sha(ps.text), gens, group: sha(gp.system + '\n' + gp.user), recall: sha(rp.system + '\n' + rp.user), run: sha(R.grp.slots.map(s => s.pair.japanese).join('|') + '/' + R.grp.paidCalls + '/' + R.calls.length), summary: sha(JSON.stringify(fin.grammarInTrack)), exportText: sha(exp), due, stored: sha(JSON.stringify(Object.keys(st).sort())) }
    }
    if (process.env.TT_PROBE) { console.log(JSON.stringify(await probe(), null, 1)); process.exit(0) }
    const V773 = { plan: 'cdbffd9b0509d9fa', gens: 'd1f42a7582826659/96f46784417b0789/944745366a992693', group: '82396c1188b4a02d', recall: 'ed7a69ba464225b4', run: '8c40c4f24537ed29', summary: 'd00d840bdeb46b37', exportText: 'ccbbf305dbb0cd21', due: 'wa,ka', stored: '2269a76dcff8f5db' }
    const now = await probe()
    T('F1', 'all four switches off: the writer\'s prompts, a scripted target group (sentences, requests), the track\'s grammar summary and export, the due list, the stored records, the Japanese plan screen and the Thai / Mandarin / Cantonese generator screens are exactly what v773 produced',
      Object.keys(V773).every(k => now[k] === V773[k]), { now, V773 })
    const c = fresh(); const names = ['Gate', 'Stage', 'Known', 'Preview']
    T('F2', 'each switch has a named setter and a reader and is ON by default (jaGrammarGateSetEnabled · jaGrammarStageSetEnabled · jaGrammarKnownSetEnabled · jaGrammarPreviewSetEnabled)',
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
      const run = async on => { const S = setup('ja'); quiet(S.c); const c2 = S.c; if (!on) { c2.jaGrammarGateSetEnabled(false); c2.jaGrammarStageSetEnabled(false) } mock(S, 'ja')
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
