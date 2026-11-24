// 24 Nov — JAPANESE GRAMMAR: REAL JAPANESE ON THE TWO ENGLISH-ONLY ROWS (v778). Two of the 101 grammar entries had names in English only, so every list showed no Japanese for them:
//   plain-present   label "plain present"           romaji ""   meaning "plain present / future"
//   noun-modify     label "noun-modifying clause"    romaji ""   meaning "clause describing a noun"
// The learner asked why there is no Japanese on "plain present". The fix is DISPLAY TEXT ONLY, behind one switch (jaGrammarShownLabelSetEnabled, on by default):
//   plain-present   食べる · 行く · する          taberu · iku · suru     meaning stays "plain present / future"
//   noun-modify     買った本                      katta hon               meaning "clause describing a noun (the book I bought)"
// The entry ids, prerequisites, unlock levels, costs and order, and above all the DETECTOR that finds these forms in sentences, do not change. Every place that shows an entry's name goes through ONE
// helper (jaGrammarShownLabel / jaGrammarShownRomaji / jaGrammarShownMeaning), so no place is missed; this suite also scans every row builder and the source for a place that still copies the raw name.
// Real application functions throughout (the curriculum, the plan, the picker, the finaliser, the gate, the prompt block, the refusal reasons, the export, the screens, the storage merge); the only thing
// scripted is the model transport, and only in the tests that run a real generation. The states are built with the application's own record writers, plus records shaped exactly as earlier builds stored them.
//   A  THE TEXT       the switch (default ON) and the helper · the exact new strings · the other 99 entries and the curriculum itself (ids, prerequisites, unlock levels, costs, order) are untouched
//   B  EVERY PLACE    plan-screen preview, plan screen, Grammar review, All grammar rows, Known grammar, rating card, GRAMMAR IN THIS TRACK (screen and export), the writer's prompt block, the refusal reasons,
//                     the generation log lines, the practice objectives, the old building-block pill, a track stored by v777 (shown with the new text)
//   C  NO PLACE MISSED  every row builder is scanned for the English-only name · the source is scanned for a raw copy of an entry's name
//   D  ROMAJI         the new romaji shows when the romaji switch is on and nothing when it is off, as for every other entry; the four two-form entries are untouched
//   E  THE RULES      the detector (the 99 lines of the 17 Nov export, GOLD of tests112), the markers, the plan, the gate's allowed ids and its verdicts are identical with the switch on and off
//   F  STORED RECORDS  no new field and no new key anywhere (progress store, track summary, track context, storage keys)
//   G  OTHER LANGUAGES  Thai, Mandarin and Cantonese screens are exactly the v777 ones
//   H  SAFETY         switch off = the unchanged v777 build (fixtures/ja-grammar-v777-reference.json) · the 30 words, the 90 pairs and the closed-vocabulary check · the new code keeps to the project rules
//   node tests117.js            (current build: tt.compiled.js, or TT_FILE)      TT_PROBE=1 prints the v777 reference values this suite compares against (run it on the unchanged v777 build)
'use strict'
const fs = require('fs')
const crypto = require('crypto')
const { load } = require('./harness')
const { setup, mock } = require('./tests14')
const React = require('react'), TR = require('react-test-renderer')
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const out = []; let fails = 0, n = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + String(id).padEnd(4) + ' ' + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 1200) : '')) }
const info = m => out.push('     · ' + m)
const FILE = process.env.TT_FILE || 'tt.compiled.js'
const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex').slice(0, 16)
const FIXJ = JSON.parse(fs.readFileSync(__dirname + '/fixtures/ja-grammar-lines-2026-11-17.json', 'utf8')).lines
const SRC = fs.readFileSync(__dirname + '/tt.jsx', 'utf8')
const KEY = 'AIza' + 'SyTEST-harness-key-000000', MODEL = 'gemini-2.5-flash-lite'     // the harness's stand-in (never a real key), built here so no key-shaped text sits in the file
const TODAY = '2026-11-24'
const KS = 'tt-ja-grammar-srs', MIGK = 'tt-migrations', MIGID = 'ja-grammar-curriculum-v1'
const DONE = { [MIGID]: { status: 'done' } }
const textOf = x => x == null ? '' : typeof x === 'string' ? x : Array.isArray(x) ? x.map(textOf).join(' ') : textOf(x.children)
const flush = async (k = 20) => { for (let i = 0; i < k; i++) await new Promise(r => setImmediate(r)) }
const quiet = c => { c.console.info = () => {}; c.console.warn = () => {}; c.console.error = () => {}; return c }
const fresh = () => quiet(load(FILE, { realBelt: true, React }))
const has = (c, name) => typeof c[name] === 'function'
const learner = (c, known) => c.initJapaneseVocab().map((w, i) => i < known ? { ...w, status: 'known' } : w)
const ws = s => String(s).replace(/\s+/g, ' ')
const CURr = c => c.ev('JA_GRAMMAR_CURRICULUM')
const IDS = c => CURr(c).map(e => e.id)
const entry = (c, id) => c.ev('jaGrammarEntryById')(id)
const clone = x => JSON.parse(JSON.stringify(x))
const sortKeys = x => Array.isArray(x) ? x.map(sortKeys) : x && typeof x === 'object' ? Object.keys(x).sort().reduce((o, k) => { o[k] = sortKeys(x[k]); return o }, {}) : x
const same = (a, b) => JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b))
const SWITCH = 'jaGrammarShownLabel'
const setShown = (c, on) => { has(c, SWITCH + 'SetEnabled') && c[SWITCH + 'SetEnabled'](on); return c }      // absent on the unchanged v777 build: nothing to switch
const SEP = ' · '
// the two entries: the text the learner read before (v777) and the text the learner reads now
const OLD = { 'plain-present': { label: 'plain present', romaji: '', meaning: 'plain present / future' }, 'noun-modify': { label: 'noun-modifying clause', romaji: '', meaning: 'clause describing a noun' } }
const NEW = { 'plain-present': { label: '食べる' + SEP + '行く' + SEP + 'する', romaji: 'taberu' + SEP + 'iku' + SEP + 'suru', meaning: 'plain present / future' },
  'noun-modify': { label: '買った本', romaji: 'katta hon', meaning: 'clause describing a noun (the book I bought)' } }
const PP = 'plain-present', NM = 'noun-modify', TWO = [PP, NM]
// the English-only names must not be left on a screen / in a text (the word "plain present" is also the start of the meaning "plain present / future", which stays)
const oldPP = t => /plain present(?! \/)/.test(t), oldNM = t => /noun-modifying clause/.test(t)
const noOld = t => !oldPP(t) && !oldNM(t)

// a record as v774 stored an introduced point that was never rated: introduced, practised in a track, the automatic first review date (+2 days) — and nothing else
const V774REC = (id, o) => ({ key: 'buildingBlock:' + id, type: 'buildingBlock', itemId: id, status: 'learning', interval: 0, dueDate: '2026-11-22', lastSeen: '2026-11-20', introducedAt: '2026-11-20', okStreak: 0, lapses: 0,
  exposures: 2, productiveExposures: 2, autoScheduled: true, ...(o || {}) })
// a record as the first-run migration (jaGrammarMigrateV1) stored it: introduced, never practised, no date at all
const MIGREC = (id, type) => ({ key: (type || 'buildingBlock') + ':' + id, type: type || 'buildingBlock', itemId: id, status: 'learning', interval: 0, dueDate: null, lastSeen: null, introducedAt: '2026-10-20', okStreak: 0, lapses: 0, exposures: 0, productiveExposures: 0 })
// a record as a rating leaves it (fixed dates, so the references never depend on the day the suite runs)
const RATED = (id, o) => V774REC(id, { interval: 3, okStreak: 1, dueDate: '2026-11-20', ratedAt: '2026-11-17', autoScheduled: undefined, ...(o || {}) })
const MIG15 = ['wa', 'ka', 'ne', 'yo', 'wo', 'ni', 'no', 'mo', 'masu', 'nai', 'past', 'te', 'tai', 'kedo', 'tara']
const TRK17 = ['da', 'plain-present', 'san', 'desu', 'janai', 'chan-kun', 'de', 'ga', 'to', 'demo', 'deshita', 'yone', 'he', 'masen', 'made', 'janakatta', 'mashou']
const learner32 = () => {
  const st = {}
  MIG15.forEach(id => { st['buildingBlock:' + id] = MIGREC(id) })
  TRK17.forEach((id, i) => { st['buildingBlock:' + id] = V774REC(id, i < 9 ? { introducedAt: '2026-11-17', dueDate: '2026-11-19', lastSeen: '2026-11-17' } : {}) })
  ;['konnichiwa', 'un', 'matane', 'jaa'].forEach(id => { st['conversationBasic:' + id] = MIGREC(id, 'conversationBasic') })
  ;['nee', 'e'].forEach(id => { st['conversationBasic:' + id] = { ...V774REC(id), key: 'conversationBasic:' + id, type: 'conversationBasic' } })
  return st
}
// THE STATES: where the two entries are, one state each (every place they can show is reached by at least one of them)
//   n32       the real learner's 32 points introduced and never rated (the plain present among them, NEW)               · known words 150
//   n0        nothing taught, nothing marked                                                                             · 150
//   next6     the first five points marked known: the plain present is the first of the next new points                  · 150
//   bothNew   the plain present, 〜た and the noun-modifying clause introduced, never rated (NEW), を rated                 · 200
//   bothDue   the same three rated and due                                                                               · 200
//   bothLater the same three rated, next review far away (used again, not due)                                           · 200
//   bothKnown the plain present known by EASY, the noun-modifying clause marked known, 〜た known                          · 200
//   nmNext    all the other 100 points marked known: the noun-modifying clause is the one next new point                  · 200
const tick = (c, st, list, day) => { list.forEach(id => c.jaGrammarMarkKnown(st, id, day || '2026-11-20')); return st }
const STATES = () => {
  const c = fresh(), S = {}
  S.n32 = { store: learner32(), known: 150 }
  S.n0 = { store: {}, known: 150 }
  S.next6 = { store: tick(c, {}, ['wa', 'ka', 'ne', 'yo', 'da']), known: 150 }
  S.bothNew = { store: { 'buildingBlock:wo': RATED('wo'), 'buildingBlock:past': V774REC('past'), 'buildingBlock:plain-present': V774REC('plain-present'), 'buildingBlock:noun-modify': V774REC('noun-modify') }, known: 200 }
  S.bothDue = { store: { 'buildingBlock:past': RATED('past', { dueDate: '2026-11-21' }), 'buildingBlock:plain-present': RATED('plain-present', { dueDate: '2026-11-19' }), 'buildingBlock:noun-modify': RATED('noun-modify') }, known: 200 }
  S.bothLater = { store: { 'buildingBlock:past': RATED('past', { dueDate: '2099-12-30' }), 'buildingBlock:plain-present': RATED('plain-present', { dueDate: '2099-12-30' }), 'buildingBlock:noun-modify': RATED('noun-modify', { dueDate: '2099-12-30' }) }, known: 200 }
  S.bothKnown = { store: tick(c, { 'buildingBlock:plain-present': RATED('plain-present', { interval: 30, okStreak: 3, dueDate: '2027-01-01', status: 'known', knownAt: '2026-11-18', knownVia: 'easy' }), 'buildingBlock:past': V774REC('past', { knownAt: '2026-11-17', sightings: 4, sightingTracks: ['a', 'b'] }) }, [NM], '2026-11-19'), known: 200 }
  S.nmNext = { store: tick(c, {}, IDS(c).filter(id => id !== NM)), known: 200 }
  return S
}
// the plan a track would make, from a hand-made analysis (the detector never reads the noun-modifying clause, so a test that needs it in every bucket hands the picker the uses itself)
const synAn = (ids, nPairs) => ({ perPair: Array.from({ length: nPairs }, (_, i) => ({ n: i + 1, target: true, ids: ids.slice(), hits: ids.map((id, k) => ({ id, at: k, implied: false })), basics: [], unsure: [] })),
  uses: ids.reduce((o, id) => { o[id] = { id, target: Array.from({ length: nPairs }, (_, i) => i + 1), all: Array.from({ length: nPairs }, (_, i) => i + 1) }; return o }, {}), basicUses: {} })
// [case, state, known words, the ids the three hand-made pairs use]
const SYN = [['new+locked', 'n0', 120, [PP, NM, 'tai']], ['needs', 'n0', 150, ['tai', NM]], ['still', 'bothNew', 200, [PP, NM]], ['due', 'bothDue', 200, [PP, NM]], ['also', 'bothLater', 200, [PP, NM]],
  ['known', 'bothKnown', 200, [PP, NM]], ['newNM', 'nmNext', 200, [NM]], ['newPP', 'next6', 150, [PP]]]
const trackOf = (id, extra) => ({ language: 'ja', date: '2026-11-17', createdAt: id || '2026-11-17T09:04:11.270Z', mode: 'daily', speechStyle: 'natural',
  pairs: FIXJ.map(l => ({ speaker: l.n % 2 ? 'A' : 'B', japanese: l.ja, thai: l.ja, reading: '', romaji: '', english: '', prompt: '',
    ...(l.kind === 'target' ? { targetId: 1000 + l.n, wordId: 1000 + l.n, isTargetPair: true, _target: 'x', recallIndex: 1 } : l.kind === 'bridge' ? { pairType: 'bridge', isTargetPair: false } : { _framing: true, pairType: 'framing', isTargetPair: false, _target: 'greeting' }) })),
  keywords: Array.from({ length: 30 }, (_, i) => ({ japanese: 'w' + i, wordId: 1000 + i, rating: null })), selectedTargetIds: Array.from({ length: 30 }, (_, i) => 1000 + i),
  buildingBlocks: [{ form: 'は', romaji: 'wa', meaning: 'topic marker' }, { form: 'か', romaji: 'ka', meaning: 'question marker' }], ...(extra || {}) })
// a short hand-made track (3 target pairs) whose grammar section is built by the application from the hand-made analysis
const miniTrack = (extra) => ({ language: 'ja', date: '2026-11-24', createdAt: '2026-11-24T08:00:00.000Z', mode: 'daily', speechStyle: 'natural',
  pairs: [1, 2, 3].map(i => ({ speaker: i % 2 ? 'A' : 'B', japanese: '行く。', thai: '行く。', reading: '', romaji: '', english: '', prompt: '', targetId: 2000 + i, wordId: 2000 + i, isTargetPair: true, _target: 'x', recallIndex: 1 })),
  keywords: [], selectedTargetIds: [], ...(extra || {}) })
const exportText = (cc, track) => { cc.Blob = class { constructor(parts) { cc.__blob = parts.join('') } }; cc.URL = { createObjectURL: () => 'b', revokeObjectURL() {} }; cc.document.createElement = () => ({ style: {}, click() {}, setAttribute() {} }); cc.document.body.appendChild = () => {}; cc.document.body.removeChild = () => {}; cc.__blob = ''; cc.downloadJapaneseTrack(track); return cc.__blob }
const mount = async (cc, el, k) => { let R; await TR.act(async () => { R = TR.create(el); await flush(k || 12) }); return R }
const tx = inst => ws(textOf(inst && inst.children))
const click = async (b) => { if (!b) return false; await TR.act(async () => { b.props.onClick(); await flush(14) }); return true }
const unmount = async R => { await TR.act(async () => { R.unmount() }) }
const snap = c => { const o = {}; for (let i = 0; i < c.localStorage.length; i++) { const k = c.localStorage.key(i); o[k] = c.localStorage.getItem(k) } return o }
const rawKS = c => JSON.parse(c.localStorage.getItem(KS) || '{}')
const EXTRA = { 'tt-ja-vocab': [{ id: 1, japanese: '行く', status: 'known' }, { id: 2, japanese: '水', status: 'learning' }], 'tt-ja-tracks': [{ createdAt: '2026-11-17T09:04:11.270Z', language: 'ja', pairs: [{ japanese: 'こんにちは' }] }],
  'tt-ja-register': 'natural', 'tt-ja-daily-new': { day: '2026-11-23', n: 3 }, 'tt-vocab': [{ id: 7, thai: 'น้ำ', status: 'known' }], 'tt-zh-vocab': [{ id: 1, chinese: '水' }], 'tt-yue-vocab': [{ id: 1, chinese: '水' }] }
async function ctxWith(store, o) {
  const c = fresh(); const opt = o || {}
  if (opt.setup) opt.setup(c)
  await c.stSet(MIGK, DONE)
  await c.stSet(KS, clone(store))
  const extra = opt.extra === undefined ? EXTRA : opt.extra
  for (const k of Object.keys(extra || {})) await c.stSet(k, extra[k])
  await c.jaGrammarLoad()
  return c
}
const planScreen = async (cc, vocab, store) => {
  cc.generateJapaneseScene = async () => ({ scene: 'Two friends meet', setting: 'a cafe', characterA: 'Daiki', characterB: 'Mio', opening: 'こんにちは', opening_english: 'Hello', premise: 'x' })
  await cc.stSet(MIGK, DONE); await cc.stSet(KS, store || {})
  const targets = vocab.slice(0, 5).map(w => ({ ...w, selectionRole: 'review' }))
  let R; await TR.act(async () => { R = TR.create(React.createElement(cc.JapaneseGenerator, { vocab, targets, selection: null, trackMode: 'daily', tracks: [], register: 'natural', cred: { geminiKey: 'k' }, onGenerated() {}, onBack() {} })); for (let i = 0; i < 80; i++) await new Promise(x => setImmediate(x)) })
  return { R, text: textOf(R.toJSON()).replace(/\s+/g, ' ') }
}
const wordsList = async (c, lang, open, vocab) => mount(c, React.createElement(c.WordListView, { vocab: vocab || [], lang, initialFilter: open ? 'due' : 'all', onBack() {} }), 8)
const KNOWNTOG = x => x.props && x.props['data-known-grammar-toggle'] && typeof x.props.onClick === 'function'
const ckToggle = R => R.root.findAll(x => x.type === 'button' && x.props && x.props['data-checklist-toggle'] === '1' && typeof x.props.onClick === 'function')[0]
const rowEl = (R, id) => R.root.findAll(x => x.type === 'div' && x.props && x.props['data-checklist-row'] === id)[0]
const CK = R => R.root.findAll(x => x.props && x.props['data-ja-grammar-checklist'] === '1')[0]
// the Japanese Words list the way a learner opens it: Grammar review open, All grammar open, Known grammar open
const fullWords = async (c) => { const R = await wordsList(c, 'ja', true); await click(ckToggle(R)); await click(R.root.findAll(KNOWNTOG)[0]); return R }
const gateOf = (c, vocab, st) => c.jaGrammarGateContext(vocab, clone(st), { register: 'natural', today: TODAY })
// the gate with an empty free core: nothing is free, so each hand-made hit is judged on its own (the refusal reasons name the entries)
const strictGate = (c, vocab, st) => { const g = gateOf(c, vocab, st); return { ...g, coreIds: [] } }
const refuseOf = (c, vocab, st) => { const g = strictGate(c, vocab, st), hits = ids => ids.map((id, k) => ({ id, at: k, implied: false }))
  return [[PP], [NM], [PP, NM, 'tai'], [NM, 'tai', 'te']].map(ids => { const r = c.jaGrammarCheckSentence('行く。', g, { hits: hits(ids) }); return { ids, ok: r.ok, lockedIds: r.lockedIds, text: r.text, kinds: r.problems.map(p => p.kind), labels: r.problems.map(p => p.labels || null) } }) }
const detectAll = c => FIXJ.map(l => { const d = c.jaGrammarDetect(l.ja); return { n: l.n, ids: d.ids, basics: d.basics.map(b => b.id), unsure: d.unsure, hits: d.hits.map(h => [h.id, h.at, !!h.implied]) } })
const jaSrc = (c, names) => names.map(k => sha(c.ev('(' + k + ')').toString())).join('/')

// ── THE v777 REFERENCE: what the unchanged v777 build shows, writes and says for the eight states. TT_PROBE=1 prints them on the unchanged build; H1 compares the new build with the switch off to the file the probe wrote ──
// back: when given, every text is passed through it BEFORE it is hashed (H2 puts the old text back into the new build's screens and expects the v777 hashes)
async function probe(on, back) {
  const hs = x => sha(back ? back(String(x)) : String(x))
  const R = {}, STS = STATES(), c0 = fresh()
  const syn = async (name, sname, known, uses, mk) => {      // the section a track would carry, from the hand-made analysis, and every place that shows it
    const st = STS[sname].store, c = await mk(), vocab = learner(c, known), an = synAn(uses, 3)
    const plan = c.jaGrammarPlan(an, { known, store: clone(st), today: TODAY }), sum = c.jaGrammarSummary(plan, an), track = miniTrack({ grammarInTrack: sum })
    const gate = strictGate(c, vocab, st); sum.gate = c.jaGrammarGateReport(track, gate, an, plan, [])
    R['syn_' + name + '_summary'] = hs(JSON.stringify(sum)); R['syn_' + name + '_export'] = hs(exportText(c, track))
    { const Rn = await mount(c, React.createElement(c.JaGrammarInTrack, { track }), 4); R['syn_' + name + '_screen'] = hs(textOf(Rn.toJSON())); await unmount(Rn) }
    { const Rn = await mount(c, React.createElement(c.JaGrammarReview, { track })); R['syn_' + name + '_card'] = hs(textOf(Rn.toJSON())); await unmount(Rn) }
  }
  for (const name of Object.keys(STS)) {
    const { store, known } = STS[name], vocab = learner(c0, known), mk = async () => setShown(await ctxWith(store), on)
    { const c = await mk(); const Rn = await fullWords(c); R['words_' + name] = hs(textOf(Rn.toJSON())); await unmount(Rn) }
    { const c = await mk(); const Rn = await mount(c, React.createElement(c.JaGrammarPreview, { vocab, store: clone(store) }), 4); R['preview_' + name] = hs(textOf(Rn.toJSON())); await unmount(Rn) }
    { const c = await mk(); const ps = await planScreen(c, vocab, clone(store)); R['planScreen_' + name] = hs(ps.text); await unmount(ps.R) }
    { const c = await mk(), plan = c.jaGrammarTrackPlan(clone(store), known, { today: TODAY }), gate = gateOf(c, vocab, store)
      R['plan_' + name] = hs(JSON.stringify(plan)); R['gate_' + name] = hs(JSON.stringify(gate)); R['prompt_' + name] = hs(c.jaGrammarGatePromptBlock(gate)); R['refuse_' + name] = hs(JSON.stringify(refuseOf(c, vocab, store)))
      R['list_' + name] = hs(JSON.stringify([c.jaGrammarKnownList(clone(store)), c.jaGrammarChecklistRows(clone(store)), c.jaGrammarReviewAreaList(clone(store), TODAY)]))
      const lines = [], fin = await c.jaGrammarFinaliseTrack(trackOf('2026-11-24T08:00:00.000Z', { trackContext: { trackId: '2026-11-24T08:00:00.000Z', language: 'ja', grammarGate: gate } }), { vocab, today: TODAY, push: m => lines.push(m) })
      R['finLog_' + name] = hs(lines.join('\n')); R['summary_' + name] = hs(JSON.stringify(fin.grammarInTrack)); R['export_' + name] = hs(exportText(c, fin))
      { const Rn = await mount(c, React.createElement(c.JaGrammarInTrack, { track: fin }), 4); R['trackScreen_' + name] = hs(textOf(Rn.toJSON())); await unmount(Rn) }
      { const Rn = await mount(c, React.createElement(c.JaGrammarReview, { track: fin })); R['card_' + name] = hs(textOf(Rn.toJSON())); await unmount(Rn) } }
  }
  for (const [cn, sname, known, uses] of SYN) await syn(cn, sname, known, uses, async () => setShown(await ctxWith(STS[sname].store), on))
  // a v777 track (the section stored as v777 wrote it) shown by this build: the screens, the export and the card
  { const c = await ctxWith(STS.bothNew.store); setShown(c, on); const an = synAn([PP, NM, 'tai'], 3), plan = c.jaGrammarPlan(an, { known: 200, store: clone(STS.bothNew.store), today: TODAY }); const track = miniTrack({ grammarInTrack: c.jaGrammarSummary(plan, an) })
    R.v777track_export = hs(exportText(c, track)); { const Rn = await mount(c, React.createElement(c.JaGrammarInTrack, { track }), 4); R.v777track_screen = hs(textOf(Rn.toJSON())); await unmount(Rn) } }
  // the writer's whole request and the generation log, from a real generation (only the model transport scripted)
  for (const name of ['next6', 'bothNew', 'nmNext', 'bothDue']) {
    const S = setup('ja'); quiet(S.c); const c = S.c; setShown(c, on)
    await c.stSet(MIGK, DONE); await c.stSet(KS, clone(STS[name].store)); await c.jaGrammarLoad()
    mock(S, 'ja'); const calls = [], logs = [], inner = c.geminiRequest; c.geminiRequest = async o => { calls.push((o.messages || []).map(m => m.content).join('\n')); return inner(o) }
    const tc = c.jaGeneratorTrackContext(S.targets.slice(0, 3).map(t => ({ ...t, selectionRole: 'review' })), { counts: { new: 0 } }, 'daily', 'natural', c.aiBeginRun('ja-track'))
    const res = await c.generateJapaneseTrack(S.targets.slice(0, 3), S.vocab, 'natural', KEY, MODEL, () => {}, m => logs.push(m), { cancelled: false }, { scene: 'Two friends at a station', characterA: 'Kenji, a man', characterB: 'Yuki, a woman', opening: '', reply: '', closing: '', closing_reply: '' }, { trackContext: tc, runId: tc.generationRunId })
    const first = calls.find(x => /JAPANESE TARGET: ★/.test(x)) || '', pick = re => first.split('\n').filter(l => re.test(l)).join('\n')
    R['gen_' + name] = hs([pick(/GRAMMAR FOR THIS LEARNER|FREE from day one|TAUGHT ALREADY|NEW THIS TRACK|STAGE —/), pick(/PRACTICE OBJECTIVES/), logs.filter(l => /GRAMMAR/.test(l)).join('\n'), JSON.stringify(tc.grammarGate, (k, v) => k === 'at' ? undefined : v), String(res.complete)].join('\n#\n'))
  }
  // what no other language and no rule may change
  { const c = setShown(await ctxWith(learner32()), on), banks = { th: c.initVocab().slice(0, 12), zh: c.initMandarinVocab().slice(0, 12), yue: c.initCantoneseVocab().slice(0, 12) }
    for (const lang of ['th', 'zh', 'yue']) { const Rn = await wordsList(c, lang, false, banks[lang]); R['words_' + lang] = hs(textOf(Rn.toJSON())); await unmount(Rn) }
    R.gens = jaSrc(c, ['Generator', 'MandarinGenerator', 'CantoneseGenerator']); R.jaGen = sha(c.ev('(JapaneseGenerator)').toString()); R.wordList = sha(c.ev('(WordListView)').toString())
    R.curriculum = sha(JSON.stringify(c.ev('JA_GRAMMAR_CURRICULUM'))); R.markers = sha(JSON.stringify(c.ev('JA_GRAMMAR_MARKERS'))); R.romajiBoth = sha(JSON.stringify(c.ev('JA_GRAMMAR_ROMAJI_BOTH')))
    R.detect = sha(JSON.stringify(detectAll(c))); R.detectSrc = jaSrc(c, ['jaGrammarDetect', 'japaneseGrammarUsed'])
    R.scaffolds = sha(JSON.stringify([c.ev('JAPANESE_GRAMMAR_SCAFFOLD'), c.ev('JAPANESE_MORPHOLOGY_SCAFFOLD')])); R.blocks = sha(JSON.stringify([c.ev('JA_BUILDING_BLOCKS'), c.ev('JA_GRAMMAR_SEQUENCE')])) }
  return R
}

;(async () => {
  if (process.env.TT_PROBE) { console.log(JSON.stringify(await probe(false), null, 1)); process.exit(0) }
  // each test runs on its own: one that cannot even start (a function that does not exist yet) fails by itself and says why, the rest go on
  const TT = async (id, name, fn) => { try { const r = await fn(); T(id, name, !!(r && r[0]), r && r[1]) } catch (e) { T(id, name, false, 'threw: ' + String(e && e.message).split('\n')[0]) } }
  const MISSING = f => f + ' does not exist in this build'
  const STS = STATES()
  const ST = name => STS[name], VOC = (c, name) => learner(c, STS[name].known)
  // the pieces of the screens (found by what they are, never by where they sit)
  const prev = (R, kind, id) => R.root.findAll(x => x.props && x.props['data-preview-' + kind] === id)[0]
  const areaCard = (R, kind, id) => R.root.findAll(x => x.props && x.props['data-review-area-' + kind] === id)[0]
  const knownRow = (R, id) => R.root.findAll(x => x.props && x.props['data-known-grammar-entry'] === id)[0]
  const SHOWS = (t, id) => t.includes(NEW[id].label) && t.includes(NEW[id].meaning)
  const SHOWSR = (t, id) => SHOWS(t, id) && t.includes(NEW[id].romaji)
  const trackScreenText = async (c, track) => { const Rn = await mount(c, React.createElement(c.JaGrammarInTrack, { track }), 4), t = ws(textOf(Rn.toJSON())); await unmount(Rn); return t }
  const cardText = async (c, track) => { const Rn = await mount(c, React.createElement(c.JaGrammarReview, { track })), t = ws(textOf(Rn.toJSON())); await unmount(Rn); return t }
  // the section of a track from the hand-made analysis (the application's own picker and summary), with the gate report of the strict gate
  const synTrack = async (cn) => { const [, sname, known, uses] = SYN.find(x => x[0] === cn), c = await ctxWith(STS[sname].store), vocab = learner(c, known), an = synAn(uses, 3)
    const plan = c.jaGrammarPlan(an, { known, store: clone(STS[sname].store), today: TODAY }), sum = c.jaGrammarSummary(plan, an), track = miniTrack({ grammarInTrack: sum }); sum.gate = c.jaGrammarGateReport(track, strictGate(c, vocab, STS[sname].store), an, plan, [])
    return { c, track, sum, plan } }
  // every object anywhere in a value that is a row of one of the two entries (an id and a label)
  const rowsOf = (v, acc) => { acc = acc || []; if (Array.isArray(v)) v.forEach(x => rowsOf(x, acc)); else if (v && typeof v === 'object') { if (TWO.includes(v.id) && typeof v.label === 'string') acc.push(v); Object.keys(v).forEach(k => rowsOf(v[k], acc)) } return acc }
  const rowOk = r => r.label === NEW[r.id].label && r.meaning === NEW[r.id].meaning

  // ═══ A — THE TEXT ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
  await TT('A0', 'the switch exists (a setter and a reader) and is ON by default; the three helpers (name, reading, meaning) exist',
    async () => { const c = fresh(), want = ['jaGrammarShownLabel', 'jaGrammarShownRomaji', 'jaGrammarShownMeaning']
      return [has(c, SWITCH + 'SetEnabled') && has(c, SWITCH + 'On') && c[SWITCH + 'On']() === true && want.every(f => has(c, f)), { missing: [SWITCH + 'SetEnabled', SWITCH + 'On'].concat(want).filter(f => !has(c, f)) }] })
  await TT('A1', 'with the switch ON the helpers give exactly the new text for the two entries: "食べる · 行く · する" / "taberu · iku · suru" / "plain present / future" and "買った本" / "katta hon" / "clause describing a noun (the book I bought)"',
    async () => { const c = fresh(); if (!has(c, 'jaGrammarShownLabel')) return [false, MISSING('jaGrammarShownLabel')]
      const got = {}; TWO.forEach(id => { const e = entry(c, id); got[id] = { label: c.jaGrammarShownLabel(e), romaji: c.jaGrammarShownRomaji(e), meaning: c.jaGrammarShownMeaning(e) } })
      return [same(got, NEW), got] })
  await TT('A2', 'the other 99 entries are untouched: with the switch on the helpers return exactly the stored name, reading and meaning of every one of them; and a row that is only an id and a name (a stored row, an unknown id) is handed back as it is',
    async () => { const c = fresh(); if (!has(c, 'jaGrammarShownLabel')) return [false, MISSING('jaGrammarShownLabel')]
      const bad = CURr(c).filter(e => !TWO.includes(e.id)).filter(e => c.jaGrammarShownLabel(e) !== e.label || c.jaGrammarShownRomaji(e) !== (e.romaji || '') || c.jaGrammarShownMeaning(e) !== e.meaning).map(e => e.id)
      const odd = [c.jaGrammarShownLabel({ id: 'zzz', label: 'x' }), c.jaGrammarShownLabel({ label: 'plain present' }), c.jaGrammarShownMeaning({ id: 'zzz', meaning: 'm' })]
      return [bad.length === 0 && CURr(c).length === 101 && odd.join('|') === 'x|plain present|m', { bad, odd }] })
  await TT('A3', 'with the switch OFF the helpers give the stored text for all 101 entries (the two English-only names, no reading, the old meaning of the noun-modifying clause): the build is v777',
    async () => { const c = setShown(fresh(), false); if (!has(c, 'jaGrammarShownLabel')) return [false, MISSING('jaGrammarShownLabel')]
      const bad = CURr(c).filter(e => c.jaGrammarShownLabel(e) !== e.label || c.jaGrammarShownRomaji(e) !== (e.romaji || '') || c.jaGrammarShownMeaning(e) !== e.meaning).map(e => e.id)
      const two = TWO.map(id => [c.jaGrammarShownLabel(entry(c, id)), c.jaGrammarShownRomaji(entry(c, id)), c.jaGrammarShownMeaning(entry(c, id))])
      return [bad.length === 0 && same(two, TWO.map(id => [OLD[id].label, OLD[id].romaji, OLD[id].meaning])), { bad, two }] })
  const V777 = JSON.parse(fs.readFileSync(__dirname + '/fixtures/ja-grammar-v777-reference.json', 'utf8'))
  await TT('A4', 'the curriculum itself is the v777 one, byte for byte, with the switch on or off (ids, prerequisites, unlock levels, costs, order, explanations, the stored names): only what is SHOWN changes; the 101 ids are in the same order; the JA_BUILDING_BLOCKS rows and the sequence are the v777 ones',
    async () => { const c = fresh(), a = sha(JSON.stringify(CURr(c))), b = sha(JSON.stringify(c.ev('JA_BUILDING_BLOCKS')) + JSON.stringify(c.ev('JA_GRAMMAR_SEQUENCE'))); setShown(c, false); const a2 = sha(JSON.stringify(CURr(c)))
      const e = id => entry(c, id), meta = id => ({ id, prereq: e(id).prereq, minKnown: e(id).minKnown, cost: e(id).cost, order: e(id).order, kind: e(id).kind })
      return [a === V777.curriculum && a2 === V777.curriculum && sha(JSON.stringify(c.ev('JA_BUILDING_BLOCKS'))) === sha(JSON.stringify(c.ev('JA_BUILDING_BLOCKS'))) && V777.blocks === sha(JSON.stringify([c.ev('JA_BUILDING_BLOCKS'), c.ev('JA_GRAMMAR_SEQUENCE')])) && IDS(c).length === 101 &&
        same(meta(PP), { id: PP, prereq: [], minKnown: 0, cost: 1, order: 60, kind: 'form' }) && same(meta(NM), { id: NM, prereq: ['past'], minKnown: 140, cost: 2, order: 1010, kind: 'construction' }) && e(PP).label === OLD[PP].label && e(NM).label === OLD[NM].label, { a, a2, v777: V777.curriculum, b, blocks: V777.blocks, pp: meta(PP), nm: meta(NM) }] })

  // ═══ B — EVERY PLACE ════════════════════════════════════════════════════════════════════════════════════════════════════════════
  await TT('B1', 'the plan-screen preview "Grammar for this track": the plain present in Next new points, in Still NEW and in Due for review, and the noun-modifying clause in the same three — each row shows the Japanese, the reading and the English meaning, and no English-only name',
    async () => { const bad = []
      const cases = [['next6', 'next', PP], ['nmNext', 'next', NM], ['bothNew', 'still-new', PP], ['bothNew', 'still-new', NM], ['bothDue', 'review', PP], ['bothDue', 'review', NM]]
      for (const [sname, kind, id] of cases) { const c = await ctxWith(ST(sname).store), R = await mount(c, React.createElement(c.JaGrammarPreview, { vocab: VOC(c, sname), store: clone(ST(sname).store) }), 4), row = prev(R, kind, id), t = row ? tx(row) : '', all = ws(textOf(R.toJSON()))
        if (!SHOWSR(t, id) || !noOld(all)) bad.push(sname + '/' + kind + '/' + id + ': ' + (row ? t : 'no row')); await unmount(R) }
      return [bad.length === 0, bad] })
  await TT('B2', 'the real plan screen (the Japanese generator): the preview inside it shows the new text for the plain present (next new points) and for the noun-modifying clause',
    async () => { const a = await planScreen(await ctxWith(ST('next6').store), VOC(fresh(), 'next6'), clone(ST('next6').store)), b = await planScreen(await ctxWith(ST('nmNext').store), VOC(fresh(), 'nmNext'), clone(ST('nmNext').store))
      const ok = /Grammar for this track/.test(a.text) && SHOWSR(a.text, PP) && noOld(a.text) && /Grammar for this track/.test(b.text) && SHOWSR(b.text, NM) && noOld(b.text); const info2 = [a.text.slice(0, 500), b.text.slice(0, 500)]; await unmount(a.R); await unmount(b.R); return [ok, info2] })
  await TT('B3', 'the Grammar review part of the Japanese Words list: the cards of the points still NEW and of the points due show the new text, the reading, the meaning and the explanation unchanged',
    async () => { const bad = []
      for (const [sname, kind] of [['bothNew', 'new'], ['bothDue', 'due']]) { const c = await ctxWith(ST(sname).store), R = await wordsList(c, 'ja', true)
        for (const id of TWO) { const card = areaCard(R, kind, id), t = card ? tx(card) : ''; if (!SHOWSR(t, id) || !t.includes(entry(c, id).explain) || !noOld(t)) bad.push(sname + '/' + id + ': ' + t.slice(0, 200)) } await unmount(R) }
      return [bad.length === 0, bad] })
  await TT('B4', 'the All grammar checklist: the row of the plain present reads "食べる · 行く · する taberu · iku · suru plain present / future NOT TAUGHT" and the row of the noun-modifying clause "買った本 katta hon clause describing a noun (the book I bought) NOT TAUGHT"; the Japanese is in the .jp span, the reading in the .phon span',
    async () => { const c = await ctxWith({}), R = await wordsList(c, 'ja', false); await click(ckToggle(R)); const pp = rowEl(R, PP), nm = rowEl(R, NM), t = [pp, nm].map(r => r ? tx(r) : null)
      const jp = r => r && r.findAll(x => x.type === 'span' && x.props.className === 'jp').map(tx).join('|'), rm = r => r && r.findAll(x => x.type === 'span' && x.props['data-grammar-romaji'] === r.props['data-checklist-row']).map(x => tx(x) + ':' + x.props.className).join('|')
      const got = { t, jp: [jp(pp), jp(nm)], rm: [rm(pp), rm(nm)] }; await unmount(R)
      return [t[0] === NEW[PP].label + ' ' + NEW[PP].romaji + ' ' + NEW[PP].meaning + ' NOT TAUGHT' && t[1] === NEW[NM].label + ' ' + NEW[NM].romaji + ' ' + NEW[NM].meaning + ' NOT TAUGHT' && got.jp[0] === NEW[PP].label && got.jp[1] === NEW[NM].label && got.rm[0] === NEW[PP].romaji + ':phon' && got.rm[1] === NEW[NM].romaji + ':phon', got] })
  await TT('B5', 'the checklist rows follow the status: the two rows show the new text whatever the label says (KNOWN, NEW, LEARNING, NOT TAUGHT), and the data of the row builder (jaGrammarChecklistRows) carries the new name and meaning',
    async () => { const bad = []
      for (const sname of ['bothNew', 'bothDue', 'bothKnown', 'n0']) { const c = await ctxWith(ST(sname).store), R = await wordsList(c, 'ja', false); await click(ckToggle(R))
        for (const id of TWO) { const r = rowEl(R, id), t = r ? tx(r) : ''; if (!t.startsWith(NEW[id].label + ' ' + NEW[id].romaji + ' ' + NEW[id].meaning + ' ')) bad.push(sname + '/' + id + ': ' + t) } await unmount(R)
        const rows = c.jaGrammarChecklistRows(clone(ST(sname).store)); TWO.forEach(id => { const r = rows.find(x => x.id === id); if (!r || !rowOk(r)) bad.push(sname + '/row/' + id) }) }
      return [bad.length === 0, bad] })
  await TT('B6', 'the Known grammar list: a point known by EASY (the plain present) and a point marked known (the noun-modifying clause) show the new text, the reading and the meaning when the list is opened',
    async () => { const c = await ctxWith(ST('bothKnown').store), R = await wordsList(c, 'ja', false); await click(R.root.findAll(KNOWNTOG)[0]); const t = TWO.map(id => { const r = knownRow(R, id); return r ? tx(r) : '' }), all = ws(textOf(R.toJSON())); await unmount(R)
      const list = c.jaGrammarKnownList(clone(ST('bothKnown').store)); return [TWO.every((id, i) => SHOWSR(t[i], id)) && noOld(all) && TWO.every(id => { const r = list.find(x => x.id === id); return r && rowOk(r) }), { t, list: list.map(x => x.label) }] })
  await TT('B7', 'the rating card (JaGrammarReview) at the end of a track: the plain present and the noun-modifying clause, as new, as still NEW and as review, show the new text, the reading and the meaning; the explanation is unchanged',
    async () => { const bad = []
      for (const cn of ['still', 'due', 'newNM', 'newPP']) { const s = await synTrack(cn), t = await cardText(s.c, s.track), ids = Object.keys(s.sum).length ? TWO.filter(id => ['new', 'review', 'stillNew'].some(k => (s.sum[k] || []).some(x => x.id === id))) : []
        if (!ids.length) { bad.push(cn + ': no row to rate'); continue }
        ids.forEach(id => { if (!SHOWSR(t, id) || !t.includes(entry(s.c, id).explain)) bad.push(cn + '/' + id + ': ' + t.slice(0, 300)) }); if (!noOld(t)) bad.push(cn + ': English-only name left') }
      return [bad.length === 0, bad] })
  await TT('B8', 'the rating card of an old-style track (grammar from sentences switched off: the building blocks the pairs declared) shows the new text for the two entries as well',
    async () => { const c = await ctxWith(ST('bothNew').store); c.jaGrammarFromSentencesSetEnabled(false)
      const track = { ...miniTrack(), pairs: [1, 2, 3].map(i => ({ japanese: '行く。', targetId: 2000 + i, wordId: 2000 + i, isTargetPair: true, _target: 'x', buildingBlockIds: [PP, NM] })) }
      const t = await cardText(c, track); return [SHOWS(t, PP) && SHOWS(t, NM) && noOld(t), t.slice(0, 400)] })
  await TT('B9', 'GRAMMAR IN THIS TRACK on the track screen: every section (NEW, STILL NEW, REVIEW, SEEN IN PASSING with its "needs … first" reason, NOT YET UNLOCKED, also used, known, planned before writing, grammar not yet taught) shows the new text for the two entries',
    async () => { const bad = [], seen = new Set()
      for (const [cn] of SYN) { const s = await synTrack(cn), t = await trackScreenText(s.c, s.track); const where = []; ['new', 'review', 'alsoUsed', 'passing', 'locked', 'knownUsed', 'stillNew'].forEach(k => (s.sum[k] || []).forEach(x => { if (TWO.includes(x.id)) { where.push(k + ':' + x.id); seen.add(k + ':' + x.id) } }))
        ;((s.sum.gate && s.sum.gate.planned) || []).forEach(x => { if (TWO.includes(x.id)) seen.add('planned:' + x.id) }); ;((s.sum.gate && s.sum.gate.notTaught) || []).forEach(x => { if (TWO.includes(x.id)) seen.add('notTaught:' + x.id) })
        TWO.filter(id => where.some(w => w.endsWith(':' + id))).forEach(id => { if (!SHOWS(t, id)) bad.push(cn + '/' + id + ' not shown') }); if (!noOld(t)) bad.push(cn + ': an English-only name is left: ' + (t.match(/plain present(?! \/)|noun-modifying clause/g) || []).join(',')) }
      const need = ['new:' + PP, 'new:' + NM, 'stillNew:' + PP, 'stillNew:' + NM, 'review:' + PP, 'review:' + NM, 'alsoUsed:' + PP, 'alsoUsed:' + NM, 'knownUsed:' + PP, 'knownUsed:' + NM, 'locked:' + NM, 'passing:' + NM, 'notTaught:' + PP, 'notTaught:' + NM].filter(k => !seen.has(k))
      return [bad.length === 0 && need.length === 0, { bad, notReached: need }] })
  await TT('B10', 'the reason a point is held back names the Japanese, not the English-only name: a point that needs the plain present first says "needs 食べる · 行く · する first", the noun-modifying clause says "needs 〜た first"',
    async () => { const s = await synTrack('needs'), why = (s.sum.passing || []).map(x => x.id + ': ' + x.why), t = await trackScreenText(s.c, s.track)
      const tai = (s.sum.passing || []).find(x => x.id === 'tai'); return [!!tai && tai.why === 'needs ' + NEW[PP].label + ' first' && t.includes('needs ' + NEW[PP].label + ' first') && !/needs plain present first/.test(t), why] })
  await TT('B11', 'the track export (GRAMMAR IN THIS TRACK, plain text): every line that names one of the two entries uses the new name, the reading in square brackets and the meaning; no English-only name is left',
    async () => { const bad = []
      for (const [cn] of SYN) { const s = await synTrack(cn), t = exportText(s.c, s.track)
        if (!noOld(t)) bad.push(cn + ': ' + (t.match(/.*(plain present(?! \/)|noun-modifying clause).*/g) || []).slice(0, 2).join(' // ')) }
      const s = await synTrack('still'), t = exportText(s.c, s.track), line = id => t.split('\n').find(l => l.includes(NEW[id].label) && l.includes(' — ')) || ''
      const sn = await synTrack('newNM'), tn = exportText(sn.c, sn.track), lnm = tn.split('\n').find(l => l.includes(NEW[NM].label) && l.includes(' — ')) || ''
      const ok = line(PP).includes(NEW[PP].label + ' [' + NEW[PP].romaji + '] — ' + NEW[PP].meaning) && line(NM).includes(NEW[NM].label + ' [' + NEW[NM].romaji + '] — ' + NEW[NM].meaning) && lnm.includes(NEW[NM].label + ' [' + NEW[NM].romaji + ']')
      return [bad.length === 0 && ok, { bad, pp: line(PP), nm: line(NM), lnm }] })
  await TT('B12', 'the writer\'s prompt block: the plain present (a new point of this track) and the noun-modifying clause (taught already; new this track; still new) appear with the new name and meaning on the TAUGHT ALREADY and NEW THIS TRACK lines',
    async () => { const bad = []
      const c1 = await ctxWith(ST('next6').store), b1 = c1.jaGrammarGatePromptBlock(gateOf(c1, VOC(c1, 'next6'), ST('next6').store)), l1 = b1.split('\n').find(l => l.includes('NEW THIS TRACK')) || ''
      const c2 = await ctxWith(ST('nmNext').store), b2 = c2.jaGrammarGatePromptBlock(gateOf(c2, VOC(c2, 'nmNext'), ST('nmNext').store)), l2 = b2.split('\n').find(l => l.includes('NEW THIS TRACK')) || ''
      const c3 = await ctxWith(ST('bothKnown').store), b3 = c3.jaGrammarGatePromptBlock(gateOf(c3, VOC(c3, 'bothKnown'), ST('bothKnown').store)), l3 = b3.split('\n').find(l => l.includes('TAUGHT ALREADY')) || ''
      const c4 = await ctxWith(ST('bothNew').store), b4 = c4.jaGrammarGatePromptBlock(gateOf(c4, VOC(c4, 'bothNew'), ST('bothNew').store)), l4 = b4.split('\n').find(l => l.includes('NEW THIS TRACK')) || ''
      if (!l1.includes(NEW[PP].label + ' (' + NEW[PP].meaning + ')')) bad.push('next6 NEW THIS TRACK: ' + l1)
      if (!l2.includes(NEW[NM].label + ' (' + NEW[NM].meaning + ')')) bad.push('nmNext NEW THIS TRACK: ' + l2)
      if (!l3.includes(NEW[NM].label + ' (' + NEW[NM].meaning + ')')) bad.push('bothKnown TAUGHT ALREADY: ' + l3)
      if (!l4.includes(NEW[NM].label + ' (' + NEW[NM].meaning + ', still new, not rated yet)') || !l4.includes(NEW[PP].label + ' (' + NEW[PP].meaning + ', still new, not rated yet)')) bad.push('bothNew NEW THIS TRACK: ' + l4)
      if (![b1, b2, b3, b4].every(noOld)) bad.push('an English-only name is left in a block')
      return [bad.length === 0, bad] })
  await TT('B13', 'the refusal reasons the writer is given name the Japanese: GRAMMAR_NOT_YET_TAUGHT and GRAMMAR_STAGE (too many new points) list the two entries by the new name and meaning; the verdicts (ok, locked ids, kinds) are what they were',
    async () => { const c = await ctxWith(ST('n0').store), r = refuseOf(c, VOC(c, 'n0'), ST('n0').store), all = r.map(x => x.text).join(' || ')
      const a = r[0], b = r[1], m = r[2]; const lab = id => NEW[id].label + ' (' + NEW[id].meaning + ')'
      const ok = a.text.includes('GRAMMAR_NOT_YET_TAUGHT: ' + lab(PP)) && b.text.includes('GRAMMAR_NOT_YET_TAUGHT: ' + lab(NM)) && m.text.includes(lab(PP) + ', ' + lab(NM)) && m.text.includes('GRAMMAR_STAGE: too many new grammar points in one sentence (3: ' + NEW[PP].label + ', ' + NEW[NM].label + ', ') &&
        !/GRAMMAR_STAGE[^|]*plain present(?! \/)/.test(all) && noOld(all) && a.ok === false && a.lockedIds.join() === PP && b.lockedIds.join() === NM && m.kinds.join() === 'locked,many'
      return [ok, r.map(x => x.text)] })
  await TT('B14', 'the finished track\'s own gate report (grammar planned before writing, grammar not yet taught) carries the new name and meaning for the two entries, and the screen and the export show them',
    async () => { const s = await synTrack('new+locked'), g = s.sum.gate, ps = (g.planned || []).concat(g.stillNew || [], g.notTaught || []).filter(x => TWO.includes(x.id)); const s2 = await synTrack('still'), g2 = s2.sum.gate, ps2 = (g2.planned || []).concat(g2.stillNew || [], g2.notTaught || []).filter(x => TWO.includes(x.id))
      return [ps.length + ps2.length >= 4 && ps.concat(ps2).every(rowOk), { n: ps.length, n2: ps2.length, labels: ps.concat(ps2).map(x => x.id + '=' + x.label) }] })
  await TT('B15', 'the finaliser\'s log lines ("GRAMMAR GATE: … planned before writing (…)", "GRAMMAR FROM SENTENCES: … new (…)") name the new points by the new name',
    async () => { const bad = []
      for (const sname of ['next6', 'nmNext']) { const c = await ctxWith(ST(sname).store), vocab = VOC(c, sname), gate = gateOf(c, vocab, ST(sname).store), lines = []
        await c.jaGrammarFinaliseTrack(trackOf('2026-11-24T08:00:00.000Z', { trackContext: { trackId: '2026-11-24T08:00:00.000Z', language: 'ja', grammarGate: gate } }), { vocab, today: TODAY, push: m => lines.push(m) })
        const t = lines.join('\n'), id = sname === 'next6' ? PP : NM
        if (!lines.some(l => /^GRAMMAR GATE: /.test(l) && l.includes(NEW[id].label + ' '))) bad.push(sname + ': GRAMMAR GATE line has no new name: ' + lines.filter(l => /GRAMMAR GATE/.test(l)).join(' // ').slice(0, 300)); if (!noOld(t)) bad.push(sname + ': English-only name in the log') }
      const c = await ctxWith(ST('n0').store), vocab = VOC(c, 'n0'), lines = [], fin = await c.jaGrammarFinaliseTrack(trackOf('2026-11-24T08:00:00.000Z', { trackContext: { trackId: '2026-11-24T08:00:00.000Z', language: 'ja', grammarGate: gateOf(c, vocab, ST('n0').store) } }), { vocab, today: TODAY, push: m => lines.push(m) })
      if (!/^GRAMMAR FROM SENTENCES: \d+ new \(/.test(lines.find(l => /^GRAMMAR FROM SENTENCES/.test(l)) || '') || !(fin.grammarInTrack.new || []).some(x => x.id === PP && x.label === NEW[PP].label)) bad.push('n0: ' + lines.join(' // ').slice(0, 300))
      return [bad.length === 0, bad] })
  await TT('B16', 'a real generation (only the model transport scripted): the GRAMMAR GATE log line, the writer\'s NEW THIS TRACK line and the PRACTICE OBJECTIVES line show the new name — the plain present planned (next6), the noun-modifying clause planned (nmNext), both still NEW (bothNew), both due (bothDue: TAUGHT ALREADY and the objectives)',
    async () => { const bad = [], seen = {}
      for (const name of ['next6', 'nmNext', 'bothNew', 'bothDue']) { const S = setup('ja'); quiet(S.c); const c = S.c; await c.stSet(MIGK, DONE); await c.stSet(KS, clone(ST(name).store)); await c.jaGrammarLoad()
        mock(S, 'ja'); const calls = [], logs = [], inner = c.geminiRequest; c.geminiRequest = async o => { calls.push((o.messages || []).map(m => m.content).join('\n')); return inner(o) }
        const tc = c.jaGeneratorTrackContext(S.targets.slice(0, 3).map(t => ({ ...t, selectionRole: 'review' })), { counts: { new: 0 } }, 'daily', 'natural', c.aiBeginRun('ja-track'))
        const res = await c.generateJapaneseTrack(S.targets.slice(0, 3), S.vocab, 'natural', KEY, MODEL, () => {}, m => logs.push(m), { cancelled: false }, { scene: 'Two friends at a station', characterA: 'Kenji, a man', characterB: 'Yuki, a woman', opening: '', reply: '', closing: '', closing_reply: '' }, { trackContext: tc, runId: tc.generationRunId })
        const first = calls.find(x => /JAPANESE TARGET: ★/.test(x)) || '', nl = first.split('\n').find(l => l.includes('NEW THIS TRACK')) || '', ol = first.split('\n').find(l => /PRACTICE OBJECTIVES/.test(l)) || '', gl = logs.find(l => /GRAMMAR GATE/.test(l)) || ''
        seen[name] = { nl: nl.slice(0, 260), ol: ol.slice(0, 260), gl: gl.slice(0, 360), complete: res.complete }
        const id = name === 'next6' ? PP : name === 'nmNext' ? NM : null
        if (!res.complete) bad.push(name + ': generation incomplete')
        if (id && !(nl.includes(NEW[id].label + ' (' + NEW[id].meaning + ')') && gl.includes(NEW[id].label))) bad.push(name + ': ' + nl + ' // ' + gl)
        if (name === 'bothNew' && !(nl.includes(NEW[PP].label + ' (' + NEW[PP].meaning + ', still new') && nl.includes(NEW[NM].label + ' (' + NEW[NM].meaning + ', still new') && ol.includes(NEW[PP].label + ' (' + NEW[PP].meaning + ')') && ol.includes(NEW[NM].label + ' (' + NEW[NM].meaning + ')') && gl.includes(NEW[PP].label))) bad.push(name + ': ' + nl + ' // ' + ol + ' // ' + gl)
        if (name === 'bothDue') { const taught = first.split('\n').find(l => l.includes('TAUGHT ALREADY')) || ''; if (!(taught.includes(NEW[NM].label + ' (' + NEW[NM].meaning + ')') && ol.includes(NEW[PP].label + ' (' + NEW[PP].meaning + ')') && ol.includes(NEW[NM].label + ' (' + NEW[NM].meaning + ')'))) bad.push(name + ': ' + taught + ' // ' + ol) }
        if (!noOld(nl + ol + gl)) bad.push(name + ': English-only name in the request or the log') }
      return [bad.length === 0, { bad, seen }] })
  await TT('B17', 'the old building-block pill (grammar from sentences switched off): the noun-modifying clause shows the Japanese, the reading and the new meaning; the plain present still shows its register form (行く)',
    async () => { const c = await ctxWith({}); c.jaGrammarFromSentencesSetEnabled(false); const vocab = learner(c, 200)
      const rows = c.jaSceneRows(vocab, { 'buildingBlock:past': V774REC('past') }, '', 'natural'); const nm = rows.blocks.find(r => r.id === NM), pp = rows.blocks.find(r => r.id === PP)
      const ps = await planScreen(c, vocab, { 'buildingBlock:past': V774REC('past') }); const t = ps.text; await unmount(ps.R)
      return [!!pp && t.includes(NEW[NM].label) && t.includes(NEW[NM].romaji) && t.includes(NEW[NM].meaning) && !/noun-modifying clause/.test(t) && t.includes('行く') && !!nm && nm.form === OLD[NM].label, { nm: nm && nm.form, found: [!!pp, !!nm], t: t.slice(0, 500) }] })
  await TT('B18', 'a track saved by v777 (its grammar section holds the English-only names) is SHOWN with the new text: the track screen, the export and the card read the name from the entry, not from the stored words; switched off, the stored words are shown as they were',
    async () => { const c = await ctxWith(ST('bothNew').store); setShown(c, false); const an = synAn([PP, NM, 'tai'], 3), plan = c.jaGrammarPlan(an, { known: 200, store: clone(ST('bothNew').store), today: TODAY }), sum = c.jaGrammarSummary(plan, an), track = miniTrack({ grammarInTrack: sum })
      const stored = JSON.stringify(sum), oldOk = TWO.every(id => rowsOf(sum).filter(r => r.id === id).every(r => r.label === OLD[id].label)) && rowsOf(sum).length > 0
      const tOff = await trackScreenText(c, track), eOff = exportText(c, track); setShown(c, true)
      const tOn = await trackScreenText(c, track), eOn = exportText(c, track), cOn = await cardText(c, track)
      return [oldOk && oldPP(tOff) && oldNM(tOff) && oldPP(eOff) && SHOWS(tOn, PP) && SHOWS(tOn, NM) && noOld(tOn) && SHOWS(eOn, PP) && SHOWS(eOn, NM) && noOld(eOn) && SHOWS(cOn, PP) && SHOWS(cOn, NM) && noOld(cOn), { stored: stored.slice(0, 200), tOn: tOn.slice(0, 300) }] })
  await TT('B19', 'the track the learner reads after BECOMING KNOWN: the plain present reaching 3 sentences in 2 tracks is listed under "BECAME KNOWN WITH THIS TRACK" with the new name, reading and meaning (screen and export)',
    async () => { const st = { 'buildingBlock:plain-present': V774REC(PP, { sightings: 2, sightingTracks: ['earlier-track'] }) }, c = await ctxWith(st), vocab = learner(c, 150)
      const fin = await c.jaGrammarFinaliseTrack(trackOf('2026-11-24T09:00:00.000Z'), { vocab, today: TODAY }), bk = (fin.grammarInTrack.becameKnown || []).find(x => x.id === PP)
      const t = await trackScreenText(c, fin), e = exportText(c, fin), line = e.split('\n').find(l => l.includes(NEW[PP].label) && /sentences in/.test(l)) || ''
      return [!!bk && bk.label === NEW[PP].label && bk.meaning === NEW[PP].meaning && SHOWSR(t, PP) && /BECAME KNOWN/.test(t) && line.includes(NEW[PP].label + ' [' + NEW[PP].romaji + ']') && noOld(t + e), { bk, line }] })

  // ═══ C — NO PLACE MISSED ═══════════════════════════════════════════════════════════════════════════════════════════════════════
  await TT('C1', 'every row builder is scanned: the plan (new, review, also used, known, passing, locked, still NEW), the summary and its gate report, the finaliser (became known), the Known grammar list, the checklist rows, the review lists, the track plan, the gate context — with the switch ON no row of the two entries still has the English-only name or meaning; with it OFF every row has the v777 text; and every builder produced rows of the two entries (a builder that gives none proves nothing)',
    async () => { const counts = {}
      const rowsFor = async (c) => { const found = []
        const add = (k, v) => { const rs = rowsOf(v); counts[k] = (counts[k] || 0) + rs.length; rs.forEach(r => found.push({ k, id: r.id, label: r.label, meaning: r.meaning })) }
        for (const [, sname, known, uses] of SYN) { const st = clone(STS[sname].store), an = synAn(uses, 3), plan = c.jaGrammarPlan(an, { known, store: clone(st), today: TODAY }), sum = c.jaGrammarSummary(plan, an), vocab = learner(c, known), track = miniTrack({ grammarInTrack: sum })
          sum.gate = c.jaGrammarGateReport(track, strictGate(c, vocab, st), an, plan, []); add('plan', plan); add('summary', sum) }
        for (const name of Object.keys(STS)) { const st = clone(STS[name].store), known = STS[name].known, vocab = learner(c, known)
          add('knownList', c.jaGrammarKnownList(clone(st))); add('checklistRows', c.jaGrammarChecklistRows(clone(st))); add('reviewList', c.jaGrammarReviewAreaList(clone(st), TODAY)); add('trackPlan', c.jaGrammarTrackPlan(clone(st), known, { today: TODAY })); add('gateContext', gateOf(c, vocab, st)) }
        await c.stSet(KS, clone({ 'buildingBlock:plain-present': V774REC(PP, { sightings: 2, sightingTracks: ['earlier-track'] }) }))
        const fin = await c.jaGrammarFinaliseTrack(trackOf('2026-11-24T09:00:00.000Z'), { vocab: learner(c, 150), today: TODAY }); add('finaliser', fin.grammarInTrack)
        return found }
      const on = await rowsFor(await ctxWith({})), off = await rowsFor(setShown(await ctxWith({}), false))
      const wrongOn = on.filter(r => r.label !== NEW[r.id].label || r.meaning !== NEW[r.id].meaning), wrongOff = off.filter(r => r.label !== OLD[r.id].label || r.meaning !== OLD[r.id].meaning)
      const builders = ['plan', 'summary', 'knownList', 'checklistRows', 'reviewList', 'trackPlan', 'gateContext', 'finaliser'], noRows = builders.filter(b => !counts[b])
      return [on.length > 60 && on.length === off.length && wrongOn.length === 0 && wrongOff.length === 0 && noRows.length === 0, { rows: on.length, wrongOn: wrongOn.slice(0, 5), wrongOff: wrongOff.slice(0, 5), noRows, counts }] })
  await TT('C2', 'the source is scanned: in the code that builds a row, a prompt, a refusal reason, a log line, an export line or a screen for a grammar entry, no raw read of an entry\'s stored name or meaning is left — every one goes through the helper (jaGrammarShownLabel / jaGrammarShownMeaning)',
    async () => { const lines = SRC.split('\n'), bad = [], seen = {}
      const strip = l => l.replace(/jaGrammarShown(?:Label|Meaning|Romaji)\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\)/g, 'H'), isRaw = l => /\.(label|meaning)\b/.test(strip(l))
      const at = rx => lines.findIndex(l => rx.test(l))
      const inBlock = (() => { const a = at(/v778 — SHOWN LABELS/), b = at(/end of the v778 block/); return i => a >= 0 && i >= a && i <= b })()
      const region = (name, from, to) => { const i0 = at(from), i1 = at(to); seen[name] = [i0, i1]; if (i0 < 0 || i1 <= i0) { bad.push(name + ': region not found'); return }
        for (let i = i0; i < i1; i++) { const l = lines[i]; if (/^\s*\/\//.test(l) || inBlock(i)) continue; if (isRaw(l)) bad.push(name + ':' + (i + 1) + ': ' + l.trim().slice(0, 150)) } }
      region('grammar code (plan, summary, finaliser, preview, lists, gate, prompt, refusals, export, track screen)', /^function jaGrammarPlan\(/, /^function buildJapaneseFinalQcPrompt/)
      region('rating card', /^function JaGrammarReview\(/, /^function Player\(/)
      // the writer's practice objectives and the generation log lines live inside the two big generators: every line that builds them is checked
      let n = 0; lines.forEach((l, i) => { if (/^\s*\/\//.test(l)) return; if (/PRACTICE OBJECTIVES|_objBlocks\.map|GRAMMAR GATE: '|\.planned\.map\(|\.stillNew\.map\(|fresh\.map\(b/.test(l)) { n++; if (isRaw(l)) bad.push('objectives / log:' + (i + 1) + ': ' + l.trim().slice(0, 150)) } })
      return [bad.length === 0 && n >= 5, { bad: bad.slice(0, 12), n: bad.length, objectiveAndLogLines: n, seen }] })
  await TT('C3', 'the new text lives in one place: one table (JA_GRAMMAR_SHOWN_TEXT) keyed by the two entry ids holds "食べる · 行く · する", "taberu · iku · suru", "買った本", "katta hon" and the new meaning, and only the helpers read it',
    async () => { const code = SRC.split('\n').filter(l => !/^\s*\/\//.test(l)), count = s => code.filter(l => l.includes(s)).length
      const t = SRC.indexOf('const JA_GRAMMAR_SHOWN_TEXT'), e = t >= 0 ? SRC.indexOf('\n})', t) : -1, body = t >= 0 && e > t ? SRC.slice(t, e + 3) : ''
      const reads = code.filter(l => /JA_GRAMMAR_SHOWN_TEXT/.test(l)).length
      const hits = ["'" + NEW[PP].label + "'", "'" + NEW[PP].romaji + "'", "'" + NEW[NM].label + "'", "'" + NEW[NM].romaji + "'", "'" + NEW[NM].meaning + "'"].map(count)
      return [t > 0 && body.includes("'plain-present'") && body.includes("'noun-modify'") && hits.every(h => h === 1) && reads >= 2 && reads <= 4, { hits, reads, body: body.slice(0, 260) }] })

  // ═══ D — ROMAJI ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
  await TT('D1', 'the romaji renderers: with the romaji switch ON they give "taberu · iku · suru" and "katta hon" (jaGrammarRomajiText, jaGrammarRomajiShown, the romaji span); with it OFF nothing; the other entries are as before',
    async () => { const c = fresh(), on = TWO.map(id => [c.jaGrammarRomajiText({ id }), c.jaGrammarRomajiShown({ id })]), spanOn = TWO.map(id => !!c.jaGrammarRomajiSpan({ id }))
      c.jaGrammarRomajiSetEnabled(false); const off = TWO.map(id => [c.jaGrammarRomajiText({ id }), c.jaGrammarRomajiShown({ id })]), spanOff = TWO.map(id => !!c.jaGrammarRomajiSpan({ id })); c.jaGrammarRomajiSetEnabled(true)
      const others = CURr(c).filter(e => !TWO.includes(e.id)).filter(e => c.jaGrammarRomajiText({ id: e.id }) !== ((c.ev('JA_GRAMMAR_ROMAJI_BOTH')[e.id]) || e.romaji || '')).map(e => e.id)
      return [on[0][0] === NEW[PP].romaji && on[0][1] === NEW[PP].romaji && on[1][0] === NEW[NM].romaji && on[1][1] === NEW[NM].romaji && spanOn.every(Boolean) && off.every(p => p[1] === '') && spanOff.every(x => !x) && others.length === 0, { on, off, spanOn, spanOff, others }] })
  await TT('D2', 'on the screens the reading of the two entries follows the romaji switch: ON it shows next to the Japanese (checklist row, review card, preview, track screen); OFF it is not shown anywhere, and the row is the Japanese and the meaning only',
    async () => { const bad = []
      for (const romajiOn of [true, false]) { const c = await ctxWith(ST('bothNew').store); c.jaGrammarRomajiSetEnabled(romajiOn)
        const R = await wordsList(c, 'ja', true); await click(ckToggle(R)); const rowT = TWO.map(id => tx(rowEl(R, id))), cardT = TWO.map(id => tx(areaCard(R, 'new', id))); await unmount(R)
        const s = await synTrack('still'); s.c.jaGrammarRomajiSetEnabled(romajiOn); const tt = await trackScreenText(s.c, s.track), ex = exportText(s.c, s.track)
        TWO.forEach((id, i) => { const shown = rowT[i].includes(NEW[id].romaji) && cardT[i].includes(NEW[id].romaji) && tt.includes(NEW[id].romaji) && ex.includes('[' + NEW[id].romaji + ']'), none = !rowT[i].includes(NEW[id].romaji) && !cardT[i].includes(NEW[id].romaji) && !tt.includes(NEW[id].romaji) && !ex.includes(NEW[id].romaji)
          if (romajiOn ? !shown : !none) bad.push((romajiOn ? 'on ' : 'off ') + id + ': ' + [rowT[i], cardT[i].slice(0, 80)].join(' // ')); if (!rowT[i].startsWith(NEW[id].label) || !rowT[i].includes(NEW[id].meaning)) bad.push('row ' + id + ': ' + rowT[i]) }) }
      return [bad.length === 0, bad] })
  await TT('D3', 'the four entries with two readings keep their table (JA_GRAMMAR_ROMAJI_BOTH: janai, kamo, volitional, nominal-no) and the stored reading of the other 97 is shown as before; the two new readings are not in that table (they come with the switch)',
    async () => { const c = fresh(), both = c.ev('JA_GRAMMAR_ROMAJI_BOTH'), keys = Object.keys(both).join(), vals = JSON.stringify(both), off = setShown(fresh(), false)
      return [keys === 'janai,kamo,volitional,nominal-no' && vals === JSON.stringify({ janai: 'janai / dewa nai', kamo: 'kamo / kamo shirenai', volitional: '-you / -kou', 'nominal-no': '-no wa / -no ga' }) && off.jaGrammarRomajiText({ id: PP }) === '' && off.jaGrammarRomajiText({ id: NM }) === '' && c.jaGrammarRomajiText({ id: 'wa' }) === 'wa' && c.jaGrammarRomajiText({ id: 'janai' }) === 'janai / dewa nai', { keys }] })

  // ═══ E — THE RULES DO NOT MOVE ════════════════════════════════════════════════════════════════════════════════════════════════
  await TT('E1', 'the detector: the 99 lines of the 17 Nov export give exactly the same entries, reaction words, hits and unsure kana with the switch on and off — and exactly what v777 gave (the GOLD table of tests112); the detector\'s code is the v777 code',
    async () => { const a = fresh(), b = setShown(fresh(), false), da = detectAll(a), db = detectAll(b)
      return [FIXJ.length === 99 && same(da, db) && sha(JSON.stringify(da)) === V777.detect && jaSrc(a, ['jaGrammarDetect', 'japaneseGrammarUsed']) === V777.detectSrc && sha(JSON.stringify(a.ev('JA_GRAMMAR_MARKERS'))) === V777.markers, { onOff: same(da, db), hash: sha(JSON.stringify(da)), want: V777.detect }] })
  await TT('E2', 'the detector still reads the plain present as before (a dictionary-form verb) and still never reads the noun-modifying clause (as v777): sentence by sentence, on and off, and exactly the entries v777 found',
    async () => { const a = fresh(), b = setShown(fresh(), false), sents = ['明日、行く。', '水、飲む？', '昨日買った本を読む。', 'これ、本です。', '食べるよ。', '買った本'], r = c => sents.map(s => c.jaGrammarDetect(s).ids.join(' '))
      const x = r(a), y = r(b), want = ['plain-present', 'plain-present', 'past wo plain-present', 'desu', 'plain-present yo', 'past']; return [same(x, y) && same(x, want) && !x.some(t => t.includes(NM)), { x, y }] })
  await TT('E3', 'ids, prerequisites, unlock levels, costs and order of all 101 entries are the v777 ones in the plan the writer is given: the next new points, the due list and the carried points are the same ids in the same order with the switch on and off, for every state',
    async () => { const bad = []
      for (const name of Object.keys(STS)) { const c1 = await ctxWith(STS[name].store), c0 = setShown(await ctxWith(STS[name].store), false), v = learner(c1, STS[name].known)
        const p1 = c1.jaGrammarTrackPlan(clone(STS[name].store), STS[name].known, { today: TODAY }), p0 = c0.jaGrammarTrackPlan(clone(STS[name].store), STS[name].known, { today: TODAY })
        const sig = p => JSON.stringify({ n: p.next.map(x => [x.id, x.cost, x.minKnown, x.order]), r: p.review.map(x => [x.id, x.dueDate]), s: (p.stillNew || []).map(x => x.id), h: p.held, o: p.overdue, b: p.budget, st: p.stopped, i: p.introducedCount, sl: p.slots })
        const g1 = gateOf(c1, v, STS[name].store), g0 = gateOf(c0, v, STS[name].store), sg = g => JSON.stringify([g.coreIds, g.introducedIds, g.plannedIds, g.stillNewIds || null, g.ceilings, g.budget, g.held, g.overdue, g.introducedCount, g.review.map(x => x.id)])
        if (sig(p1) !== sig(p0)) bad.push(name + ': plan'); if (sg(g1) !== sg(g0)) bad.push(name + ': gate') }
      return [bad.length === 0, bad] })
  await TT('E4', 'the writer is not given a different meaning of the allowed set: the gate allows exactly the same ids (free core, taught, planned) with the switch on and off, the older closed-grammar check (JA_CURRICULUM_ALLOWED) is the same set, and the verdicts on all 99 lines of the export (ok, locked ids, kinds of problem) are identical for every state',
    async () => { const bad = []
      for (const name of Object.keys(STS)) { const c1 = await ctxWith(STS[name].store), c0 = setShown(await ctxWith(STS[name].store), false), v = learner(c1, STS[name].known), g1 = gateOf(c1, v, STS[name].store), g0 = gateOf(c0, v, STS[name].store)
        const allow = g => JSON.stringify([...new Set([...g.coreIds, ...g.introducedIds, ...g.plannedIds])].sort())
        if (allow(g1) !== allow(g0)) bad.push(name + ': allowed set')
        c1.jaSetCurriculumAllowed(clone(STS[name].store), g1.plannedIds); c0.jaSetCurriculumAllowed(clone(STS[name].store), g0.plannedIds)
        if (JSON.stringify([...c1.ev('JA_CURRICULUM_ALLOWED')].sort()) !== JSON.stringify([...c0.ev('JA_CURRICULUM_ALLOWED')].sort())) bad.push(name + ': JA_CURRICULUM_ALLOWED')
        const verdict = (c, g) => FIXJ.map(l => { const r = c.jaGrammarCheckSentence(l.ja, g, {}); return [r.ok, r.lockedIds, r.problems.map(p => p.kind), r.problems.map(p => p.ids || null)] })
        if (!same(verdict(c1, g1), verdict(c0, g0))) bad.push(name + ': verdicts on the 99 lines') }
      const c = await ctxWith(STS.n0.store), g = strictGate(c, VOC(c, 'n0'), STS.n0.store), r = refuseOf(c, VOC(c, 'n0'), STS.n0.store); const c0 = setShown(await ctxWith(STS.n0.store), false), r0 = refuseOf(c0, VOC(c0, 'n0'), STS.n0.store)
      if (!same(r.map(x => [x.ids, x.ok, x.lockedIds, x.kinds]), r0.map(x => [x.ids, x.ok, x.lockedIds, x.kinds]))) bad.push('refusals: verdicts differ')
      return [bad.length === 0, bad] })
  const rawKSOf = c => JSON.stringify(sortKeys(JSON.parse(c.localStorage.getItem(KS) || '{}')))
  await TT('E5', 'what a track records about its grammar is the same set of ids: the finaliser over the 99 lines picks the same new, review, also-used, known, passing and locked entries (ids and pair numbers) with the switch on and off, for every state',
    async () => { const bad = []
      for (const name of Object.keys(STS)) { const run = async on => { const c = setShown(await ctxWith(STS[name].store), on), v = learner(c, STS[name].known), gate = gateOf(c, v, STS[name].store)
          const fin = await c.jaGrammarFinaliseTrack(trackOf('2026-11-24T08:00:00.000Z', { trackContext: { trackId: '2026-11-24T08:00:00.000Z', language: 'ja', grammarGate: gate } }), { vocab: v, today: TODAY }), g = fin.grammarInTrack
          const idsOf = k => ((g[k] || []).concat((g.basics && g.basics[k]) || [])).map(x => x.id + '@' + (x.pairs || []).join('.')); return JSON.stringify({ k: ['new', 'review', 'alsoUsed', 'passing', 'locked', 'knownUsed', 'stillNew', 'becameKnown'].map(k => idsOf(k)), s: rawKSOf(c), g: g.gate && [g.gate.planned.map(x => x.id), g.gate.notTaught.map(x => x.id + x.n), g.gate.stageFlags] }) }
        if (await run(true) !== await run(false)) bad.push(name) }
      return [bad.length === 0, bad] })

  // ═══ F — STORED RECORDS: NO NEW FIELD, NO NEW KEY ═══════════════════════════════════════════════════════════════════════════
  const shapeOf = v => Array.isArray(v) ? (v.length ? [shapeOf(v[0])] : []) : v && typeof v === 'object' ? Object.keys(v).sort().reduce((o, k) => { o[k] = shapeOf(v[k]); return o }, {}) : typeof v
  const keysDeep = (v, p, acc) => { acc = acc || new Set(); if (Array.isArray(v)) v.forEach(x => keysDeep(x, p, acc)); else if (v && typeof v === 'object') Object.keys(v).forEach(k => { acc.add((p || '') + '.' + k); keysDeep(v[k], (p || '') + '.' + k, acc) }); return acc }
  await TT('F1', 'no new field: the grammar section a track stores (summary, rows, gate report), the track context\'s grammar gate and every row of every list have exactly the same fields with the switch on as with it off (only the text of a name or a meaning differs)',
    async () => { const bad = []
      for (const [cn] of SYN) { const a = await synTrack(cn); const b = await (async () => { const [, sname, known, uses] = SYN.find(x => x[0] === cn), c = setShown(await ctxWith(STS[sname].store), false), vocab = learner(c, known), an = synAn(uses, 3), plan = c.jaGrammarPlan(an, { known, store: clone(STS[sname].store), today: TODAY }), sum = c.jaGrammarSummary(plan, an), track = miniTrack({ grammarInTrack: sum }); sum.gate = c.jaGrammarGateReport(track, strictGate(c, vocab, STS[sname].store), an, plan, []); return { sum, plan } })()
        const ka = [...keysDeep(a.sum)].sort().join(), kb = [...keysDeep(b.sum)].sort().join(); if (ka !== kb) bad.push(cn + ': summary fields differ'); if ([...keysDeep(a.plan)].sort().join() !== [...keysDeep(b.plan)].sort().join()) bad.push(cn + ': plan fields differ') }
      for (const name of Object.keys(STS)) { const c1 = await ctxWith(STS[name].store), c0 = setShown(await ctxWith(STS[name].store), false), v = learner(c1, STS[name].known)
        const one = c => ({ gate: gateOf(c, v, STS[name].store), plan: c.jaGrammarTrackPlan(clone(STS[name].store), STS[name].known, { today: TODAY }), lists: [c.jaGrammarKnownList(clone(STS[name].store)), c.jaGrammarChecklistRows(clone(STS[name].store)), c.jaGrammarReviewAreaList(clone(STS[name].store), TODAY)] })
        if ([...keysDeep(one(c1))].sort().join() !== [...keysDeep(one(c0))].sort().join()) bad.push(name + ': row fields differ') }
      return [bad.length === 0, bad] })
  await TT('F2', 'the progress store is untouched: ticks, ratings and a finished track write exactly the same records (same keys, same fields, same values) with the switch on and off; the other storage keys written are the same set',
    async () => { const bad = []
      const run = async on => { const c = setShown(await ctxWith(STS.bothNew.store), on); await c.jaGrammarChecklistToggle('tara'); await c.jaGrammarChecklistToggle(NM); const s = { ...STS.bothNew.store }; const store = await c.jaGrammarLoad(); await c.jaGrammarRateAndSave(clone(store), 'buildingBlock', PP, 'ok')
        const v = learner(c, 200); await c.jaGrammarFinaliseTrack(trackOf('2026-11-24T08:00:00.000Z'), { vocab: v, today: TODAY }); const o = snap(c); const k = Object.keys(o).sort(); return { keys: k, ks: o[KS] ? JSON.stringify(sortKeys(JSON.parse(o[KS]))).replace(/"(knownAt|markedKnownAt|lastSeen|ratedAt|dueDate|introducedAt)":"[0-9-]+"/g, '"$1":"D"') : null } }
      const a = await run(true), b = await run(false); if (a.keys.join() !== b.keys.join()) bad.push('storage keys differ: ' + a.keys.join() + ' vs ' + b.keys.join()); if (a.ks !== b.ks) bad.push('the progress store differs')
      return [bad.length === 0, bad] })
  await TT('F3', 'the entry rows keep their types: the stored name is still a string, the meaning a string, the reading a string (empty for the two entries when the romaji switch is off), pairs a list of numbers, cost a number — no object, no array, no extra property',
    async () => { const s = await synTrack('still'), rows = rowsOf(s.sum), bad = rows.filter(r => typeof r.label !== 'string' || typeof r.meaning !== 'string' || typeof r.romaji !== 'string' && r.romaji !== undefined || (r.pairs && !Array.isArray(r.pairs)) || (r.cost !== undefined && typeof r.cost !== 'number')).map(r => r.id)
      return [rows.length >= 4 && bad.length === 0 && rows.every(r => r.romaji === '' || r.romaji === undefined), { n: rows.length, bad, romaji: rows.map(r => r.romaji) }] })

  // ═══ G — OTHER LANGUAGES ═════════════════════════════════════════════════════════════════════════════════════════════════════
  await TT('G1', 'the Thai, Mandarin and Cantonese Words lists, and the code of the Thai, Mandarin and Cantonese generator screens, the Japanese generator and the Words list, are exactly what v777 produced (the Words list text for the Japanese learner is part of B and H)',
    async () => { const c = await ctxWith(learner32()), banks = { th: c.initVocab().slice(0, 12), zh: c.initMandarinVocab().slice(0, 12), yue: c.initCantoneseVocab().slice(0, 12) }, got = {}
      for (const lang of ['th', 'zh', 'yue']) { const Rn = await wordsList(c, lang, false, banks[lang]); got['words_' + lang] = sha(textOf(Rn.toJSON())); await unmount(Rn) }
      got.gens = jaSrc(c, ['Generator', 'MandarinGenerator', 'CantoneseGenerator']); const bad = Object.keys(got).filter(k => got[k] !== V777[k])
      return [bad.length === 0, bad.map(k => k + ': ' + got[k] + ' v777 ' + V777[k])] })
  await TT('G2', 'the grammar names are Japanese-only: no Thai, Mandarin or Cantonese text mentions the new names, and the helpers return a Thai / Mandarin / Cantonese-style row (no id of the two entries) unchanged',
    async () => { const c = await ctxWith({}), th = c.initVocab().slice(0, 12), R = await wordsList(c, 'th', false, th), t = textOf(R.toJSON()); await unmount(R)
      const rowsTH = [{ id: 'th-1', label: 'ก', meaning: 'x' }]; return [!t.includes(NEW[PP].label) && !t.includes(NEW[NM].label) && c.jaGrammarShownLabel(rowsTH[0]) === 'ก' && c.jaGrammarShownMeaning(rowsTH[0]) === 'x', t.slice(0, 120)] })

  // ═══ H — SAFETY AND THE SWITCH ═════════════════════════════════════════════════════════════════════════════════════════════════
  await TT('H1', 'switch OFF: the Japanese Words list (Grammar review, All grammar and Known grammar opened), the preview, the plan screen, the plan, the gate, the writer\'s prompt block, the refusal reasons, every list, the finaliser\'s log lines, the track summary, the export, GRAMMAR IN THIS TRACK, the rating card, a real generation\'s log and request, and the hand-made sections — for all eight states — and the Thai / Mandarin / Cantonese lists and screens are exactly what the unchanged v777 build produced',
    async () => { const now = await probe(false), keys = Object.keys(V777).filter(k => k !== 'about'); return [keys.every(k => now[k] === V777[k]) && Object.keys(now).length === keys.length, keys.filter(k => now[k] !== V777[k]).slice(0, 12).map(k => k + ': now ' + now[k] + ' v777 ' + V777[k])] })
  // the old text put back: the new names are replaced by the v777 ones (and the new reading, which v777 did not show, is taken out), so what is left of a screen, a prompt, an export or a log must be v777 to the letter
  const undo = t => t.split(' [' + NEW[PP].romaji + ']').join('').split(' ' + NEW[PP].romaji).join('').split(' [' + NEW[NM].romaji + ']').join('').split(' ' + NEW[NM].romaji).join('')
    .split(NEW[PP].label).join(OLD[PP].label).split(NEW[NM].meaning).join(OLD[NM].meaning).replace(/(?<!\u65E5)\u8CB7\u3063\u305F\u672C/g, OLD[NM].label)       // (not after 日: the explanation of the entry reads 昨日買った本)
  await TT('H2', 'switch ON (as shipped): with the new names put back to the v777 ones (and the new reading taken out) every screen, prompt, refusal, export, log line and stored row of all eight states, of the eight hand-made track sections, of the track v777 stored and of four real generations is exactly the v777 text — so the new build differs from v777 in those two names and nowhere else',
    async () => { const now = await probe(true, undo), keys = Object.keys(V777).filter(k => k !== 'about'); return [keys.every(k => now[k] === V777[k]) && Object.keys(now).length === keys.length, keys.filter(k => now[k] !== V777[k]).slice(0, 14).map(k => k + ': now ' + now[k] + ' v777 ' + V777[k])] })
  await TT('H3', 'the 30 words, the 90 target pairs and the closed-vocabulary check do not change because of grammar: (as shipped, with the switch on) finalising the 99-line export for the 32-point learner leaves the same words and ids, the same 99 pairs (90 target pairs), the same verdicts on all 99 lines before and after, and writes no word list',
    async () => { const c = await ctxWith(learner32(), { extra: {} }), vocab = learner(c, 150), gate = gateOf(c, vocab, learner32()), inv0 = c.japaneseLearnerInventory(vocab, vocab.slice(0, 30)), before = FIXJ.map(l => JSON.stringify(c.japaneseCheckLine(l.ja, inv0)))
      const track = trackOf('2026-11-17T09:04:11.270Z', { trackContext: { trackId: '2026-11-17T09:04:11.270Z', language: 'ja', grammarGate: gate } }), sel0 = JSON.stringify(track.selectedTargetIds), kw0 = JSON.stringify(track.keywords), pairs0 = JSON.stringify(track.pairs), vocab0 = JSON.stringify(vocab)
      const fin = await c.jaGrammarFinaliseTrack(track, { vocab, today: TODAY }), inv1 = c.japaneseLearnerInventory(vocab, vocab.slice(0, 30)), after = FIXJ.map(l => JSON.stringify(c.japaneseCheckLine(l.ja, inv1)))
      return [JSON.stringify(fin.selectedTargetIds) === sel0 && JSON.stringify(fin.keywords) === kw0 && JSON.stringify(fin.pairs) === pairs0 && fin.pairs.filter(p => c.jaGrammarIsTargetPair(p)).length === 90 && fin.keywords.length === 30 && before.join() === after.join() && JSON.stringify(vocab) === vocab0 && (await c.stGet('tt-ja-vocab')) == null, { n: fin.pairs.length }] })
  await TT('H4', 'the new code is marked (v778), keeps to the project rules (no key, token, access code or provider / model name) and is display only: the helper block does not touch a progress record, a detector, a gate or a plan',
    async () => { const a = SRC.indexOf('v778 — SHOWN LABELS'), b = SRC.indexOf('end of the v778 block'), block = a > 0 && b > a ? SRC.slice(a, b) : ''
      return [a > 0 && b > a && block.length > 800 && !/AIza[0-9A-Za-z_-]{20,}|sk-ant-|access[ _-]?code|claude|gemini|sonnet|opus|haiku|anthropic|openai|gpt-/i.test(block) && !/jaGrammarSave|stSet\(|stSyncSaveObject|jaGrammarApplyRating|jaGrammarIntroduce|JA_GRAMMAR_MARKERS|jaGrammarDetect|jaGrammarPlan\(|jaGrammarTrackPlan\(/.test(block), { a, b, len: block.length }] })
  await TT('H5', 'the switch is its own: switching it off changes no other switch (grammar from sentences, slots, known, romaji, checklist, gate, stage, preview), and switching it back on restores the new text',
    async () => { const c = fresh(), pre = ['jaGrammarFromSentences', 'jaGrammarSlots', 'jaGrammarKnown', 'jaGrammarRomaji', 'jaGrammarChecklist', 'jaGrammarGate', 'jaGrammarStage', 'jaGrammarPreview', 'jaGrammarReviewArea', 'jaGrammarNotShown', 'jaGrammarReset', 'jaGrammarClearWording'].filter(p => has(c, p + 'On')).map(p => [p, c[p + 'On']()])
      setShown(c, false); const mid = pre.map(([p]) => [p, c[p + 'On']()]), off = c.jaGrammarShownLabel(entry(c, PP)); setShown(c, true); const back = c.jaGrammarShownLabel(entry(c, PP))
      return [same(pre, mid) && c[SWITCH + 'On']() === true && off === OLD[PP].label && back === NEW[PP].label, { pre: pre.length }] })
  out.forEach(l => console.log(l))
  console.log('\n' + (n - fails) + '/' + n + ' passed' + (fails ? ' · ' + fails + ' FAILED' : ' — ALL PASS'))
  process.exit(fails ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
