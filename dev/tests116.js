// 24 Nov — JAPANESE GRAMMAR: "ALL GRAMMAR", ONE LIST OF ALL 101 POINTS WHERE THE LEARNER MARKS WHAT THEY ALREADY KNOW (v777). The Japanese Words list had a Grammar review part (due and still-NEW points) and a Known grammar
// row. The learner wants ONE list of every grammar point of the curriculum, in teaching order, laid out like the word rows of the same screen (Japanese big on the left, its reading beside it, the English meaning on the right,
// a coloured status label on the far right), and a way to say "I already know this one": TAPPING THE STATUS LABEL marks a point known (and a tap on a point marked known there takes it back).
// Real application functions throughout (the curriculum, the plan, the picker, the finaliser, the gate, the prompt block, the export, the screens, the storage merge); the only thing scripted is the model transport, and only in the one
// test that runs a real generation. The states are built with the application's own record writers, plus records shaped exactly as the first-run migration and the v774 tracks stored them.
//   A  THE LIST       Words list, Japanese only · 101 rows in teaching order · Japanese, reading (both readings for the two-form entries, none when there is none), meaning, status label · the word rows' styling and colours
//   B  THE TAP        one tap marks a point known (no record, NEW, LEARNING) · what is stored · persists at once, merged · survives a reload · a tap target of at least 36 px · a label, not a checkbox
//   C  TAKING IT BACK a point marked known there is taken back exactly (the record the tick created is removed, the earlier schedule is restored) · a point known by EASY or by sightings is not touched
//   D  SLOTS, STAGES, GATE   a ticked point is known: not NEW, no slot; ticking frees a NEW slot; ticking never-introduced points uses none; counts as introduced for prerequisites and stage ceilings; allowed in the writer's list
//   E  THE SCREEN     filter chips with counts · the Known grammar row and the Grammar review part follow at once · no "mark all" · Start grammar from scratch and its Undo leave ticked points alone
//   F  SAFETY         switch off = the unchanged v776 build (fixtures/ja-grammar-v776-reference.json) · other languages and generator screens identical · the 30 words, the 90 pairs and the closed-vocabulary check
//   node tests116.js            (current build: tt.compiled.js, or TT_FILE)      TT_PROBE=1 prints the v776 reference values this suite compares against (run it on the unchanged v776 build)
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
const KEY = 'AIza' + 'SyTEST-harness-key-000000', MODEL = 'gemini-2.5-flash-lite'     // the harness's stand-in (never a real key), built here so no key-shaped text sits in the file
const TODAY = '2026-11-24'
const NOW = new Date().toISOString().slice(0, 10)         // the day a tick or a rating is made (the application reads the real clock)
const KS = 'tt-ja-grammar-srs', BKEY = 'tt-ja-grammar-reset-backup', MIGK = 'tt-migrations', MIGID = 'ja-grammar-curriculum-v1'
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
const ids = list => (list || []).map(x => x.id)
const sortKeys = x => Array.isArray(x) ? x.map(sortKeys) : x && typeof x === 'object' ? Object.keys(x).sort().reduce((o, k) => { o[k] = sortKeys(x[k]); return o }, {}) : x
const same = (a, b) => JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b))
const SWITCH = 'jaGrammarChecklist'
const setSwitch = (c, on) => { has(c, SWITCH + 'SetEnabled') && c[SWITCH + 'SetEnabled'](on); return c }
const OLD = c => setSwitch(c, false)                                        // the new switch off: the build must be v776

// a record as v774 stored an introduced point that was never rated: introduced, practised in a track, the automatic first review date (+2 days) — and nothing else
const V774REC = (id, o) => ({ key: 'buildingBlock:' + id, type: 'buildingBlock', itemId: id, status: 'learning', interval: 0, dueDate: '2026-11-22', lastSeen: '2026-11-20', introducedAt: '2026-11-20', okStreak: 0, lapses: 0,
  exposures: 2, productiveExposures: 2, autoScheduled: true, ...(o || {}) })
// a record as the first-run migration (jaGrammarMigrateV1) stored it: introduced, never practised, no date at all
const MIGREC = (id, type) => ({ key: (type || 'buildingBlock') + ':' + id, type: type || 'buildingBlock', itemId: id, status: 'learning', interval: 0, dueDate: null, lastSeen: null, introducedAt: '2026-10-20', okStreak: 0, lapses: 0, exposures: 0, productiveExposures: 0 })
// THE REAL LEARNER: 32 grammar points introduced and never rated (15 from the first-run migration, 17 from the v773 / v774 tracks), 6 conversation basics, about 150 known words
const MIG15 = ['wa', 'ka', 'ne', 'yo', 'wo', 'ni', 'no', 'mo', 'masu', 'nai', 'past', 'te', 'tai', 'kedo', 'tara']
const TRK17 = ['da', 'plain-present', 'san', 'desu', 'janai', 'chan-kun', 'de', 'ga', 'to', 'demo', 'deshita', 'yone', 'he', 'masen', 'made', 'janakatta', 'mashou']
const learner32 = c => {
  const st = {}
  MIG15.forEach(id => { st['buildingBlock:' + id] = MIGREC(id) })
  TRK17.forEach((id, i) => { st['buildingBlock:' + id] = V774REC(id, i < 9 ? { introducedAt: '2026-11-17', dueDate: '2026-11-19', lastSeen: '2026-11-17' } : {}) })
  ;['konnichiwa', 'un', 'matane', 'jaa'].forEach(id => { st['conversationBasic:' + id] = MIGREC(id, 'conversationBasic') })
  ;['nee', 'e'].forEach(id => { st['conversationBasic:' + id] = { ...V774REC(id), key: 'conversationBasic:' + id, type: 'conversationBasic' } })
  return { vocab: learner(c, 150), store: st, known: 150 }
}
const threeNew = () => { const st = {}; const put = (id, o) => { st['buildingBlock:' + id] = V774REC(id, o) }
  put('wa', { interval: 3, okStreak: 1, dueDate: '2026-11-20', autoScheduled: undefined }); put('ka', { interval: 2, okStreak: 1, dueDate: '2026-11-18', autoScheduled: undefined }); put('ne', { interval: 4, okStreak: 2, dueDate: '2099-12-30', autoScheduled: undefined })
  put('yo', { interval: 5, okStreak: 2, dueDate: '2026-11-22', knownAt: '2026-11-10', sightings: 4, sightingTracks: ['a', 'b'], autoScheduled: undefined }); put('da'); put('plain-present'); put('san'); return st }
const fiveNew = () => { const st = {}; ;['wa', 'ka', 'ne', 'yo', 'da'].forEach(id => { st['buildingBlock:' + id] = V774REC(id) }); return st }
// a store as the new build leaves it after ticks: shaped by hand ONLY for the "switch off = v776" reference (v776 ignores the marker fields, so it reads these as plain known points and plain NEW points)
const tickedShape = () => { const st = {}
  st['buildingBlock:wa'] = { ...V774REC('wa'), status: 'known', knownAt: '2026-11-23', markedKnownAt: '2026-11-23', markedKnownFrom: 'checklist', markedKnownPrev: { status: 'learning', interval: 0, dueDate: '2026-11-22', okStreak: 0, lapses: 0, introducedAt: '2026-11-20', ratedAt: null } }
  st['buildingBlock:tara'] = { key: 'buildingBlock:tara', type: 'buildingBlock', itemId: 'tara', status: 'known', interval: 0, dueDate: null, lastSeen: null, introducedAt: '2026-11-23', okStreak: 0, lapses: 0, exposures: 0, productiveExposures: 0, knownAt: '2026-11-23', markedKnownAt: '2026-11-23', markedKnownFrom: 'checklist', markedKnownPrev: null }
  st['buildingBlock:ka'] = V774REC('ka'); st['buildingBlock:ne'] = V774REC('ne', { interval: 3, okStreak: 1, dueDate: '2026-11-20', autoScheduled: undefined }); st['buildingBlock:yo'] = V774REC('yo', { interval: 2, okStreak: 1, dueDate: '2099-12-30', autoScheduled: undefined, ratedAt: '2026-11-22' })
  return st }
const planOf = (c, st, known, today) => c.jaGrammarTrackPlan(st, known == null ? 200 : known, { today: today || TODAY })
// the rule, stated on its own: the NEXT entries in curriculum order — unlocked, not introduced, prerequisites introduced or chosen just before — at most `free` points and at most 5 cost points
const refNext = (c, st, known, free) => {
  const intro = id => !!(st['buildingBlock:' + id] && st['buildingBlock:' + id].introducedAt), pick = []; let spent = 0
  for (const e of CURr(c)) { if (intro(e.id)) continue; if (known < e.minKnown) break; if (!e.prereq.every(p => intro(p) || pick.includes(p))) continue
    if (pick.length >= free) break; if (spent + e.cost > 5) break; pick.push(e.id); spent += e.cost; if (spent >= 5) break }
  return pick
}
// the track of the owner's 17 Nov export: 99 pairs, 90 of them target pairs
const pairsOf = () => FIXJ.map(l => ({ speaker: l.n % 2 ? 'A' : 'B', japanese: l.ja, thai: l.ja, reading: '', romaji: '', english: '', prompt: '',
  ...(l.kind === 'target' ? { targetId: 1000 + l.n, wordId: 1000 + l.n, isTargetPair: true, _target: 'x', recallIndex: 1 } : l.kind === 'bridge' ? { pairType: 'bridge', isTargetPair: false } : { _framing: true, pairType: 'framing', isTargetPair: false, _target: 'greeting' }) }))
const trackOf = (id, extra) => ({ language: 'ja', date: '2026-11-17', createdAt: id || '2026-11-17T09:04:11.270Z', mode: 'daily', speechStyle: 'natural', pairs: pairsOf(),
  keywords: Array.from({ length: 30 }, (_, i) => ({ japanese: 'w' + i, wordId: 1000 + i, rating: null })), selectedTargetIds: Array.from({ length: 30 }, (_, i) => 1000 + i),
  buildingBlocks: [{ form: 'は', romaji: 'wa', meaning: 'topic marker' }, { form: 'か', romaji: 'ka', meaning: 'question marker' }], ...(extra || {}) })
const exportText = (cc, track) => { cc.Blob = class { constructor(parts) { cc.__blob = parts.join('') } }; cc.URL = { createObjectURL: () => 'b', revokeObjectURL() {} }; cc.document.createElement = () => ({ style: {}, click() {}, setAttribute() {} }); cc.document.body.appendChild = () => {}; cc.document.body.removeChild = () => {}; cc.__blob = ''; cc.downloadJapaneseTrack(track); return cc.__blob }
const mount = async (cc, el, k) => { let R; await TR.act(async () => { R = TR.create(el); await flush(k || 12) }); return R }
const tx = inst => ws(textOf(inst && inst.children))
const click = async (b) => { if (!b) return false; await TR.act(async () => { b.props.onClick(); await flush(14) }); return true }       // a missing button is reported by the assertions that follow, not by a crash
const unmount = async R => { await TR.act(async () => { R.unmount() }) }
const snap = c => { const o = {}; for (let i = 0; i < c.localStorage.length; i++) { const k = c.localStorage.key(i); o[k] = c.localStorage.getItem(k) } return o }
const reload = c => { const nc = fresh(), s = snap(c); Object.keys(s).forEach(k => nc.localStorage.setItem(k, s[k])); return nc }
const rawKS = c => JSON.parse(c.localStorage.getItem(KS) || '{}')
async function ctxWith(store, o) {
  const c = fresh(); const opt = o || {}
  if (opt.setup) opt.setup(c)
  if (opt.marker !== false) await c.stSet(MIGK, opt.marker || DONE)
  await c.stSet(KS, clone(store))
  if (opt.extra) for (const k of Object.keys(opt.extra)) await c.stSet(k, opt.extra[k])
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
// what a screen shows WITHOUT the new part: the same tree with the "All grammar" part cut out (so the rest of the Words list can be compared with the v776 screen it came from)
const cutPart = nd => Array.isArray(nd) ? nd.map(cutPart).filter(x => x !== undefined) : nd && typeof nd === 'object' ? (nd.props && nd.props['data-ja-grammar-checklist'] ? undefined : { ...nd, children: nd.children ? nd.children.map(cutPart).filter(x => x !== undefined) : nd.children }) : nd
const textNoPart = R => textOf(cutPart(R.toJSON()))
const KNOWNTOG = x => x.props && x.props['data-known-grammar-toggle'] && typeof x.props.onClick === 'function'

// ── THE v776 REFERENCE: what the unchanged v776 build shows and writes for the 32-point learner, for a few other states and for a store that holds ticked-shaped records ────────────────────────────────────────────
// TT_PROBE=1 prints these on the unchanged v776 build; F1 / F2 compare the new build (the new switch off, and on where the screen is not the Words list) to the file the probe wrote (fixtures/ja-grammar-v776-reference.json).
async function probe(on) {
  const R = {}, L = learner32(fresh()), STATES = { n32: L.store, n3: threeNew(), n5: fiveNew(), n0: {}, nt: tickedShape() }
  for (const name of Object.keys(STATES)) {
    const store = STATES[name], mk = async () => setSwitch(await ctxWith(store), !!on), vocab = learner(fresh(), 150)
    { const c = await mk(); const Rn = await wordsList(c, 'ja', true); R['wordsOpen_' + name] = sha(textNoPart(Rn)); await unmount(Rn) }
    { const c = await mk(); const Rn = await wordsList(c, 'ja', false); R['wordsClosed_' + name] = sha(textNoPart(Rn)); await unmount(Rn) }
    if (!on) { const c = await mk(); const Rn = await wordsList(c, 'ja', true); await click(Rn.root.findAll(KNOWNTOG)[0]); R['knownOpen_' + name] = sha(textOf(Rn.toJSON())); await unmount(Rn) }
    { const c = await mk(); const Rn = await mount(c, React.createElement(c.JaGrammarPreview, { vocab, store: clone(store) }), 4); R['preview_' + name] = sha(textOf(Rn.toJSON())); await unmount(Rn) }
    { const c = await mk(); const ps = await planScreen(c, vocab, clone(store)); R['planScreen_' + name] = sha(ps.text); await unmount(ps.R) }
    { const c = await mk(); const plan = planOf(c, clone(store), 150), gate = c.jaGrammarGateContext(vocab, clone(store), { register: 'natural', today: TODAY })
      R['plan_' + name] = sha(JSON.stringify(plan)); R['gate_' + name] = sha(JSON.stringify(gate)); R['prompt_' + name] = sha(c.jaGrammarGatePromptBlock(gate))
      const fin = await c.jaGrammarFinaliseTrack(trackOf('2026-11-24T08:00:00.000Z', { trackContext: { trackId: '2026-11-24T08:00:00.000Z', language: 'ja', grammarGate: gate } }), { vocab, today: TODAY })
      R['summary_' + name] = sha(JSON.stringify(fin.grammarInTrack)); R['export_' + name] = sha(exportText(c, fin))
      { const Rn = await mount(c, React.createElement(c.JaGrammarInTrack, { track: fin }), 4); R['trackScreen_' + name] = sha(textOf(Rn.toJSON())); await unmount(Rn) }
      { const Rn = await mount(c, React.createElement(c.JaGrammarReview, { track: fin })); R['card_' + name] = sha(textOf(Rn.toJSON())); await unmount(Rn) } }
  }
  { const c = setSwitch(await ctxWith(L.store), !!on)
    const banks = { th: c.initVocab().slice(0, 12), zh: c.initMandarinVocab().slice(0, 12), yue: c.initCantoneseVocab().slice(0, 12) }
    for (const lang of ['th', 'zh', 'yue']) { const Rn = await wordsList(c, lang, false, banks[lang]); R['words_' + lang] = sha(textOf(Rn.toJSON())); await unmount(Rn) }
    R.gens = ['Generator', 'MandarinGenerator', 'CantoneseGenerator'].map(k => sha(c.ev('(' + k + ')').toString())).join('/')
    R.jaGen = sha(c.ev('(JapaneseGenerator)').toString()); R.wordList = sha(c.ev('(WordListView)').toString()) }
  return R
}

;(async () => {
  if (process.env.TT_PROBE) { console.log(JSON.stringify(await probe(false), null, 1)); process.exit(0) }
  // each test runs on its own: one that cannot even start (a function that does not exist yet) fails by itself and says why, the rest go on
  const TT = async (id, name, fn) => { try { const r = await fn(); T(id, name, !!(r && r[0]), r && r[1]) } catch (e) { T(id, name, false, 'threw: ' + String(e && e.message).split('\n')[0]) } }
  const MISSING = f => f + ' does not exist in this build'
  const NOPART = 'there is no "All grammar" part in the Japanese Words list'
  const EXTRA = { 'tt-ja-vocab': [{ id: 1, japanese: '行く', status: 'known' }, { id: 2, japanese: '水', status: 'learning' }], 'tt-ja-tracks': [{ createdAt: '2026-11-17T09:04:11.270Z', language: 'ja', pairs: [{ japanese: 'こんにちは' }] }],
    'tt-ja-register': 'natural', 'tt-ja-daily-new': { day: '2026-11-23', n: 3 }, 'tt-vocab': [{ id: 7, thai: 'น้ำ', status: 'known' }], 'tt-zh-vocab': [{ id: 1, chinese: '水' }], 'tt-yue-vocab': [{ id: 1, chinese: '水' }] }
  // the part and its pieces (found by what they are, never by where they sit)
  const CK = R => R.root.findAll(x => x.props && x.props['data-ja-grammar-checklist'] === '1')[0]
  const ckText = R => { const a = CK(R); return a ? tx(a) : '' }
  const ckToggle = R => R.root.findAll(x => x.type === 'button' && x.props && x.props['data-checklist-toggle'] === '1' && typeof x.props.onClick === 'function')[0]
  const rowEl = (R, id) => R.root.findAll(x => x.type === 'div' && x.props && x.props['data-checklist-row'] === id)[0]
  const rowsAll = R => R.root.findAll(x => x.type === 'div' && x.props && typeof x.props['data-checklist-row'] === 'string')
  const statusBtn = (R, id) => R.root.findAll(x => x.type === 'button' && x.props && x.props['data-checklist-status'] === id)[0]
  const statusOf = (R, id) => { const b = statusBtn(R, id); return b ? tx(b) : null }
  const chip = (R, f) => R.root.findAll(x => x.type === 'button' && x.props && x.props['data-checklist-filter'] === f && typeof x.props.onClick === 'function')[0]
  const noteOf = (R, id) => { const e = R.root.findAll(x => x.props && x.props['data-checklist-note'] === id)[0]; return e ? tx(e) : null }
  const openPart = async R => { await click(ckToggle(R)); return R }
  // a Japanese Words list over a stored grammar store, the part opened
  const screen = async (store, o) => { const c = await ctxWith(store, { extra: EXTRA, ...(o || {}) }); const R = await wordsList(c, 'ja', !!(o && o.reviewOpen)); if (!(o && o.closed)) await openPart(R); return { c, R } }
  const tap = async (s, id) => click(statusBtn(s.R, id))
  const rawRec = (c, id) => rawKS(c)['buildingBlock:' + id]
  const REVIEW = R => R.root.findAll(x => x.props && x.props['data-ja-grammar-review-area'] === '1')[0]
  const reviewText = R => { const a = REVIEW(R); return a ? tx(a) : '' }
  const toggleOf = c => has(c, 'jaGrammarChecklistToggle') ? id => c.jaGrammarChecklistToggle(id) : null
  const LAB = { known: 'KNOWN', new: 'NEW', learning: 'LEARNING', nottaught: 'NOT TAUGHT' }

  // ═══ A — THE LIST ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  await TT('A0', 'the switch exists (a setter and a reader) and is ON by default; the row builder, the status reader, the tap function, the mark and take-back functions and the component exist',
    async () => { const c = fresh(), want = ['jaGrammarChecklistRows', 'jaGrammarChecklistStatus', 'jaGrammarChecklistToggle', 'jaGrammarMarkKnown', 'jaGrammarUnmarkKnown', 'JaGrammarChecklist']
      return [has(c, SWITCH + 'SetEnabled') && has(c, SWITCH + 'On') && c[SWITCH + 'On']() === true && want.every(f => has(c, f)), { missing: [SWITCH + 'SetEnabled', SWITCH + 'On'].concat(want).filter(f => !has(c, f)) }] })
  await TT('A1', 'the Japanese Words list has an "All grammar" part right after the Grammar review part and before the Known grammar row; closed it reads "All grammar (0 known of 101)" with "show", and shows no row',
    async () => { const s = await screen({}, { closed: true }), t = ckText(s.R)
      const top = (s.R.toJSON().children || []).map(x => x && x.props ? (x.props['data-ja-grammar-review-area'] ? 'review' : x.props['data-ja-grammar-checklist'] ? 'all' : x.props['data-ja-known-grammar'] ? 'known' : '') : '').filter(Boolean)
      await unmount(s.R); return [/^All grammar \(0 known of 101\) show$/.test(t) && top.join() === 'review,all,known', { t, top }] })
  await TT('A2', 'opened it says "hide" and lists ALL 101 grammar points, one row each, in the teaching order of the curriculum (JA_GRAMMAR_CURRICULUM)',
    async () => { const s = await screen({}); if (!CK(s.R)) { await unmount(s.R); return [false, NOPART] }
      const got = rowsAll(s.R).map(x => x.props['data-checklist-row']), t = ckText(s.R); await unmount(s.R)
      return [got.length === 101 && got.join() === IDS(s.c).join() && /^All grammar \(0 known of 101\) hide/.test(t), { n: got.length, first: got.slice(0, 5), t: t.slice(0, 120) }] })
  await TT('A3', 'each row shows the Japanese (the .jp class, bigger), the reading (class .phon) — BOTH readings for the four two-form entries (janai / dewa nai · kamo / kamo shirenai · -you / -kou · -no wa / -no ga), NONE for the two entries that have no romaji (never guessed) — and the English meaning',
    async () => { const s = await screen({}); if (!CK(s.R)) { await unmount(s.R); return [false, NOPART] }
      const BOTH = s.c.ev('JA_GRAMMAR_ROMAJI_BOTH'), bad = []
      for (const e of CURr(s.c)) { const row = rowEl(s.R, e.id); if (!row) { bad.push(e.id + ': no row'); continue }
        const jp = row.findAll(x => x.type === 'span' && x.props.className === 'jp'), rm = row.findAll(x => x.type === 'span' && x.props['data-grammar-romaji'] === e.id), mean = row.findAll(x => x.type === 'span' && tx(x) === e.meaning)
        const want = BOTH[e.id] || e.romaji || ''
        if (jp.length !== 1 || tx(jp[0]) !== e.label) bad.push(e.id + ': jp ' + (jp[0] ? tx(jp[0]) : 'none'))
        if (want ? (rm.length !== 1 || tx(rm[0]) !== want || rm[0].props.className !== 'phon') : rm.length !== 0) bad.push(e.id + ': romaji ' + (rm[0] ? tx(rm[0]) : 'none') + ' want ' + (want || 'none'))
        if (mean.length < 1) bad.push(e.id + ': meaning') }
      const none = CURr(s.c).filter(e => !e.romaji).map(e => e.id).join(), both = Object.keys(BOTH).join(); await unmount(s.R)
      return [bad.length === 0 && none === 'plain-present,noun-modify' && both === 'janai,kamo,volitional,nominal-no', { bad: bad.slice(0, 6), none, both }] })
  await TT('A4', 'a row reads, left to right: Japanese, reading, English meaning (right-aligned), status label (the last thing in the row): "は wa topic marker NOT TAUGHT"; the two entries without romaji read "plain present plain present / future NOT TAUGHT"',
    async () => { const s = await screen({}); if (!CK(s.R)) { await unmount(s.R); return [false, NOPART] }
      const wa = rowEl(s.R, 'wa'), pp = rowEl(s.R, 'plain-present'), jan = rowEl(s.R, 'janai'); const t = [wa, pp, jan].map(r => r ? tx(r) : null)
      const meaning = wa && wa.findAll(x => x.type === 'span' && tx(x) === 'topic marker')[0], ms = meaning && meaning.props.style; await unmount(s.R)
      return [t[0] === 'は wa topic marker NOT TAUGHT' && t[1] === 'plain present plain present / future NOT TAUGHT' && t[2] === 'じゃない / ではない janai / dewa nai is not NOT TAUGHT' && !!ms && ms.marginLeft === 'auto' && ms.textAlign === 'right', t] })
  await TT('A5', 'the rows are styled like the word rows of the same screen: a rounded row (surface2 background, 1px border, radius 8), the Japanese 15px bold in the text colour, the reading 11px muted, the meaning 11px muted, the status label 9px bold; and the colours are the word rows\' own (known green, learning blue, new muted)',
    async () => { const s = await screen({}); if (!CK(s.R)) { await unmount(s.R); return [false, NOPART] }
      const row = rowEl(s.R, 'wa'), st = row.props.style, jp = row.findAll(x => x.type === 'span' && x.props.className === 'jp')[0].props.style, rm = row.findAll(x => x.type === 'span' && x.props['data-grammar-romaji'] === 'wa')[0].props.style
      const me = row.findAll(x => x.type === 'span' && tx(x) === 'topic marker')[0].props.style, sb = statusBtn(s.R, 'wa').props.style
      const wl = s.c.ev('(WordListView)').toString(), sc = wl.match(/SC = \{ known: "(#[0-9a-f]+)", learning: "(#[0-9a-f]+)", new: "([^"]+)"/), K = s.c.ev('JA_GRAMMAR_CHECKLIST_COLOURS')
      await unmount(s.R)
      return [st.background === 'var(--surface2)' && st.border === '1px solid var(--border)' && st.borderRadius === 8 && jp.fontSize === 15 && jp.fontWeight === 700 && jp.color === 'var(--text)' && rm.fontSize === 11 && rm.color === 'var(--muted)' && me.fontSize === 11 && me.color === 'var(--muted)' &&
        sb.fontSize === 9 && sb.fontWeight === 700 && !!sc && K.known === sc[1] && K.learning === sc[2] && K.new === sc[3] && K.nottaught === 'var(--muted)' && /var\(--surface2\)/.test(wl) && /fontSize: 9, fontWeight: 700/.test(wl), { st, jp, rm, me, sb, K, sc: sc && sc.slice(1) }] })
  // the four statuses, from stored states: the shapes the real learner's records have
  const ST_A = (() => { const c = fresh(), st = {}
    st['buildingBlock:ka'] = MIGREC('ka'); st['buildingBlock:ne'] = V774REC('ne')                                                                  // NEW: introduced, never rated (the migration's and the v774 shape)
    st['buildingBlock:yo'] = V774REC('yo'); c.jaGrammarApplyRating(st, 'buildingBlock', 'yo', 'hard')                                              // LEARNING: rated HARD
    st['buildingBlock:da'] = V774REC('da'); c.jaGrammarApplyRating(st, 'buildingBlock', 'da', 'ok')                                                // LEARNING: rated OK
    st['buildingBlock:san'] = V774REC('san', { interval: 2, okStreak: 1, dueDate: '2026-11-26', autoScheduled: undefined })                        // LEARNING: rated on v774 (interval, no ratedAt)
    st['buildingBlock:wo'] = V774REC('wo'); c.jaGrammarApplyRating(st, 'buildingBlock', 'wo', 'easy')                                              // KNOWN: by EASY
    st['buildingBlock:ni'] = V774REC('ni', { knownAt: '2026-11-23', sightings: 3, sightingTracks: ['a', 'b'] })                                    // KNOWN: after 3 sentences in 2 tracks
    st['buildingBlock:no'] = { ...c.jaNewProgressRecord('buildingBlock', 'no'), seenInPassing: 2, lastPassing: '2026-11-21' }                      // seen in passing only: never introduced → NOT TAUGHT
    st['buildingBlock:zzz-old'] = V774REC('zzz-old'); st['conversationBasic:konnichiwa'] = MIGREC('konnichiwa', 'conversationBasic')                // not entries of the curriculum: not rows
    return st })()
  const COL = { known: '#10b981', learning: '#4a90e2', new: 'var(--muted)', nottaught: 'var(--muted)' }
  await TT('A6', 'the status label per row: KNOWN (green) for known by EASY, by 3 sentences in 2 tracks; NEW for introduced and never rated (migration and v774 shapes); LEARNING (blue) for HARD, OK and the v774 rated one; NOT TAUGHT for no record and for a point only seen in passing; unknown ids and conversation basics are no rows',
    async () => { const s = await screen(ST_A); if (!CK(s.R)) { await unmount(s.R); return [false, NOPART] }
      const want = { ka: 'new', ne: 'new', yo: 'learning', da: 'learning', san: 'learning', wo: 'known', ni: 'known', no: 'nottaught', wa: 'nottaught', tara: 'nottaught' }, bad = []
      Object.keys(want).forEach(id => { const b = statusBtn(s.R, id); if (!b) { bad.push(id + ': no label'); return }; if (tx(b) !== LAB[want[id]]) bad.push(id + ': ' + tx(b)); if (b.props.style.color !== COL[want[id]]) bad.push(id + ' colour ' + b.props.style.color) })
      const rows = rowsAll(s.R).length, extra = s.R.root.findAll(x => x.props && (x.props['data-checklist-row'] === 'zzz-old' || x.props['data-checklist-row'] === 'konnichiwa')).length; await unmount(s.R)
      return [bad.length === 0 && rows === 101 && extra === 0, { bad, rows, extra }] })
  await TT('A7', 'the label text is the small bold uppercase one of the word rows (9px, bold, upper case) and the strings are exactly KNOWN, NEW, LEARNING, NOT TAUGHT; the header counts the known ones: "All grammar (2 known of 101)"',
    async () => { const s = await screen(ST_A); if (!CK(s.R)) { await unmount(s.R); return [false, NOPART] }
      const labels = [...new Set(CURr(s.c).map(e => statusOf(s.R, e.id)))].sort(), t = ckText(s.R), b = statusBtn(s.R, 'ka').props.style; await unmount(s.R)
      return [labels.join() === 'KNOWN,LEARNING,NEW,NOT TAUGHT' && /^All grammar \(2 known of 101\) hide/.test(t) && b.fontSize === 9 && b.fontWeight === 700 && labels.every(x => x === x.toUpperCase()), { labels, t: t.slice(0, 60) }] })
  await TT('A8', 'Japanese only: the Thai, Mandarin and Cantonese Words lists show no "All grammar" part, even with grammar records in the store',
    async () => { const res = {}
      for (const lang of ['th', 'zh', 'yue']) { const c = await ctxWith(ST_A, { extra: EXTRA }), bank = lang === 'th' ? c.initVocab().slice(0, 12) : lang === 'zh' ? c.initMandarinVocab().slice(0, 12) : c.initCantoneseVocab().slice(0, 12)
        const R = await wordsList(c, lang, false, bank); res[lang] = { part: R.root.findAll(x => x.props && x.props['data-ja-grammar-checklist']).length, text: /All grammar/.test(textOf(R.toJSON())) }; await unmount(R) }
      return [Object.values(res).every(x => x.part === 0 && !x.text), res] })
  await TT('A9', 'rows come from the stored progress at once and are read-only until a label is tapped: opening the part writes nothing (the stored text is byte for byte what it was)',
    async () => { const c = await ctxWith(ST_A, { extra: EXTRA }), s0 = snap(c), R = await wordsList(c, 'ja', false); if (!CK(R)) { await unmount(R); return [false, NOPART] }
      await openPart(R); await click(chip(R, 'known')); await click(chip(R, 'all')); const s1 = snap(c); await unmount(R); return [same(s0, s1), Object.keys(s1).filter(k => s0[k] !== s1[k])] })

  // ═══ B — THE TAP ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
  await TT('B1', 'a tap on NOT TAUGHT (no record) creates the record as an introduction would (introducedAt today) and sets it known: status known, knownAt today, the marker (markedKnownAt today, markedKnownFrom "checklist", nothing before it); no sightings, no rating, no exposure; the label turns KNOWN at once',
    async () => { const s = await screen({}); if (!CK(s.R)) { await unmount(s.R); return [false, NOPART] }
      await tap(s, 'tara'); const r = rawRec(s.c, 'tara'), lab = statusOf(s.R, 'tara'), head = ckText(s.R).slice(0, 40); await unmount(s.R)
      return [!!r && r.key === 'buildingBlock:tara' && r.type === 'buildingBlock' && r.itemId === 'tara' && r.introducedAt === NOW && r.knownAt === NOW && r.status === 'known' && r.markedKnownAt === NOW && r.markedKnownFrom === 'checklist' && r.markedKnownPrev === null &&
        r.sightings === undefined && r.sightingTracks === undefined && r.ratedAt === undefined && !r.exposures && !r.productiveExposures && lab === 'KNOWN' && /^All grammar \(1 known of 101\)/.test(head), { r, lab, head }] })
  await TT('B2', 'a tap on NEW (introduced, never rated) sets it known and keeps everything it had: knownAt today, the marker, the earlier schedule saved (status, interval, dueDate, okStreak, lapses, introducedAt); exposures, dates and flags are untouched; not rated, no sightings',
    async () => { const orig = V774REC('ka'), s = await screen({ 'buildingBlock:ka': orig }); if (!CK(s.R)) { await unmount(s.R); return [false, NOPART] }
      const before = statusOf(s.R, 'ka'); await tap(s, 'ka'); const r = rawRec(s.c, 'ka'), lab = statusOf(s.R, 'ka'); await unmount(s.R)
      const keep = ['key', 'type', 'itemId', 'lastSeen', 'introducedAt', 'interval', 'dueDate', 'okStreak', 'lapses', 'exposures', 'productiveExposures', 'autoScheduled']
      return [before === 'NEW' && lab === 'KNOWN' && !!r && keep.every(k => r[k] === orig[k]) && r.status === 'known' && r.knownAt === NOW && r.markedKnownFrom === 'checklist' && r.markedKnownAt === NOW && !!r.markedKnownPrev &&
        r.markedKnownPrev.status === 'learning' && r.markedKnownPrev.interval === 0 && r.markedKnownPrev.dueDate === '2026-11-22' && r.markedKnownPrev.okStreak === 0 && r.markedKnownPrev.lapses === 0 && r.markedKnownPrev.introducedAt === '2026-11-20' && r.sightings === undefined && r.ratedAt === undefined, { r }] })
  await TT('B3', 'a tap on LEARNING (rated HARD or OK) sets it known, saves the earlier schedule (status, interval, dueDate, okStreak, lapses, ratedAt) in the marker and leaves the rating\'s own fields where they were; the point leaves the review list',
    async () => { const c0 = fresh(), st = { 'buildingBlock:da': V774REC('da') }; c0.jaGrammarApplyRating(st, 'buildingBlock', 'da', 'ok'); const orig = clone(st['buildingBlock:da'])
      const s = await screen(st); if (!CK(s.R)) { await unmount(s.R); return [false, NOPART] }
      const before = statusOf(s.R, 'da'); await tap(s, 'da'); const r = rawRec(s.c, 'da'), lab = statusOf(s.R, 'da'), due = s.c.jaGrammarDue(rawKS(s.c), 'buildingBlock', '2099-01-01').map(x => x.itemId); await unmount(s.R)
      const p = r && r.markedKnownPrev
      return [before === 'LEARNING' && lab === 'KNOWN' && r.knownAt === NOW && r.status === 'known' && !!p && p.status === orig.status && p.interval === orig.interval && p.dueDate === orig.dueDate && p.okStreak === orig.okStreak && p.lapses === orig.lapses && p.ratedAt === orig.ratedAt &&
        r.interval === orig.interval && r.dueDate === orig.dueDate && r.ratedAt === orig.ratedAt && !due.includes('da'), { orig, r }] })
  await TT('B4', 'the tap persists at once (the stored grammar already holds it when the screen has answered) and survives a reload: a new application over the same stored text shows KNOWN, the same header count and the same record',
    async () => { const s = await screen({ 'buildingBlock:ka': V774REC('ka') }); if (!CK(s.R)) { await unmount(s.R); return [false, NOPART] }
      await tap(s, 'ka'); await tap(s, 'tara'); const stored = rawKS(s.c); const c2 = reload(s.c), R2 = await wordsList(c2, 'ja', false); await openPart(R2); const t = ckText(R2), a = statusOf(R2, 'ka'), b = statusOf(R2, 'tara'), same2 = same(rawKS(c2), stored)
      await unmount(R2); await unmount(s.R)
      return [!!stored['buildingBlock:ka'].knownAt && !!stored['buildingBlock:tara'].knownAt && a === 'KNOWN' && b === 'KNOWN' && /^All grammar \(2 known of 101\)/.test(t) && same2, { a, b, t: t.slice(0, 50) }] })
  await TT('B5', 'the label IS the control: a button of at least 36 px height with a title and an aria-label "Mark as known" on every point that is not known; a ticked point says "Mark as not known"; no checkbox, no other control per row; one tap is enough and no window.confirm is used',
    async () => { const s = await screen({ 'buildingBlock:ka': V774REC('ka') }); if (!CK(s.R)) { await unmount(s.R); return [false, NOPART] }
      let asked = 0; s.c.confirm = () => { asked++; return true }
      const b0 = statusBtn(s.R, 'wa'), b1 = statusBtn(s.R, 'ka'), p0 = b0.props, p1 = b1.props, px = v => parseFloat(v)
      await tap(s, 'wa'); const b2 = statusBtn(s.R, 'wa').props, inputs = CK(s.R).findAll(x => x.type === 'input').length, row = rowEl(s.R, 'wa'), controls = row.findAll(x => (x.type === 'button' || x.type === 'input') && x.props)
      await unmount(s.R)
      return [b0.type === 'button' && px(p0.style.minHeight || p0.style.height) >= 36 && p0.title === 'Mark as known' && p0['aria-label'] === 'Mark as known' && p1.title === 'Mark as known' && p1['aria-label'] === 'Mark as known' &&
        b2.title === 'Mark as not known' && b2['aria-label'] === 'Mark as not known' && px(b2.style.minHeight || b2.style.height) >= 36 && inputs === 0 && controls.length === 1 && asked === 0, { p0: { title: p0.title, aria: p0['aria-label'], h: p0.style.minHeight || p0.style.height }, b2: { title: b2.title, aria: b2['aria-label'] }, inputs, controls: controls.length, asked }] })
  await TT('B6', 'the tap saves like a rating does, merged with what is stored: a record another tab wrote after this screen opened is kept, the ticked record is there, and nothing else in the store changed',
    async () => { const s = await screen({ 'buildingBlock:ka': V774REC('ka') }); if (!CK(s.R)) { await unmount(s.R); return [false, NOPART] }
      const other = V774REC('san', { exposures: 5 }), cur = clone(rawKS(s.c)); cur['buildingBlock:san'] = other; await s.c.stSet(KS, cur)       // "another tab": written to storage after this screen loaded
      await tap(s, 'ka'); const st = rawKS(s.c); await unmount(s.R)
      return [!!st['buildingBlock:san'] && same(st['buildingBlock:san'], other) && !!st['buildingBlock:ka'].knownAt && Object.keys(st).sort().join() === 'buildingBlock:ka,buildingBlock:san', Object.keys(st)] })
  await TT('B7', 'two taps in the same instant on the same label are one tap (the second is ignored while the first is being saved): the point ends up marked known, not marked and taken back',
    async () => { const s = await screen({}); if (!CK(s.R)) { await unmount(s.R); return [false, NOPART] }
      const b = statusBtn(s.R, 'tara'); await TR.act(async () => { b.props.onClick(); b.props.onClick(); await flush(16) }); const r = rawRec(s.c, 'tara'), lab = statusOf(s.R, 'tara'); await unmount(s.R)
      return [!!r && !!r.knownAt && lab === 'KNOWN', { r, lab }] })
  await TT('B8', 'the tap function on its own (no screen): marks known and says so ({changed, action "marked"}); an id that is not in the curriculum is refused; with the switch off it stores nothing and says why',
    async () => { const c = await ctxWith({}), tg = toggleOf(c); if (!tg) return [false, MISSING('jaGrammarChecklistToggle')]
      const r1 = await tg('tara'), r2 = await tg('not-a-point'), s1 = snap(c); setSwitch(c, false); const r3 = await tg('wa')
      return [r1.changed === true && r1.action === 'marked' && !!rawRec(c, 'tara').knownAt && r2.changed === false && !rawKS(c)['buildingBlock:not-a-point'] && r3.changed === false && same(snap(c), s1) && !rawRec(c, 'wa'), { r1, r2, r3 }] })

  // ═══ C — TAKING IT BACK ══════════════════════════════════════════════════════════════════════════════════════════════════════
  await TT('C1', 'a tap on KNOWN of a point the tick itself created removes the record entirely: it is gone from STORAGE (the save merges, so the removal is asked for by key), the label is NOT TAUGHT, jaGrammarGet gives the blank record, nothing else in the store changed',
    async () => { const other = V774REC('san'), s = await screen({ 'buildingBlock:san': other }); if (!CK(s.R)) { await unmount(s.R); return [false, NOPART] }
      await tap(s, 'tara'); const marked = !!rawRec(s.c, 'tara'); await tap(s, 'tara'); const st = rawKS(s.c), lab = statusOf(s.R, 'tara'), g = s.c.jaGrammarGet(st, 'buildingBlock', 'tara'); await unmount(s.R)
      return [marked && st['buildingBlock:tara'] === undefined && lab === 'NOT TAUGHT' && same(g, s.c.jaNewProgressRecord('buildingBlock', 'tara')) && !g.introducedAt && same(st['buildingBlock:san'], other) && Object.keys(st).join() === 'buildingBlock:san', { keys: Object.keys(st), lab }] })
  await TT('C2', 'a tap on KNOWN of a NEW point that was ticked restores it exactly: the very record it was (same fields, same values), no marker left; the label is NEW again and the point takes its slot back',
    async () => { const orig = V774REC('ka', { notShownAt: '2026-11-21', notShownCount: 1 }), s = await screen({ 'buildingBlock:ka': orig }); if (!CK(s.R)) { await unmount(s.R); return [false, NOPART] }
      await tap(s, 'ka'); const mid = statusOf(s.R, 'ka'), slotsMid = s.c.jaGrammarSlots(rawKS(s.c)).newCount; await tap(s, 'ka'); const r = rawRec(s.c, 'ka'), lab = statusOf(s.R, 'ka'), slots = s.c.jaGrammarSlots(rawKS(s.c)).newCount; await unmount(s.R)
      return [mid === 'KNOWN' && slotsMid === 0 && lab === 'NEW' && same(r, orig) && slots === 1, { r, orig }] })
  await TT('C3', 'a tap on KNOWN of a LEARNING point that was ticked restores its schedule exactly (status, interval, dueDate, okStreak, lapses, ratedAt): the record equals what it was before the tick, field for field; it is on the review list again',
    async () => { const c0 = fresh(), st0 = { 'buildingBlock:da': V774REC('da') }; c0.jaGrammarApplyRating(st0, 'buildingBlock', 'da', 'hard'); c0.jaGrammarApplyRating(st0, 'buildingBlock', 'da', 'ok'); const orig = clone(st0['buildingBlock:da'])
      const s = await screen(st0); if (!CK(s.R)) { await unmount(s.R); return [false, NOPART] }
      await tap(s, 'da'); await tap(s, 'da'); const r = rawRec(s.c, 'da'), lab = statusOf(s.R, 'da'), due = s.c.jaGrammarDue(rawKS(s.c), 'buildingBlock', '2099-01-01').map(x => x.itemId); await unmount(s.R)
      return [lab === 'LEARNING' && same(r, orig) && due.includes('da') && r.markedKnownFrom === undefined && r.markedKnownPrev === undefined && r.knownAt === undefined, { r, orig }] })
  await TT('C4', 'the mark, the take-back and the mark again can be repeated on the same point; every step is stored at once and a reload in the middle changes nothing',
    async () => { const s = await screen({ 'buildingBlock:ka': V774REC('ka') }); if (!CK(s.R)) { await unmount(s.R); return [false, NOPART] }
      const seq = []; for (let i = 0; i < 3; i++) { await tap(s, 'ka'); seq.push(statusOf(s.R, 'ka') + ':' + (!!rawRec(s.c, 'ka').knownAt)) }
      const c2 = reload(s.c), R2 = await wordsList(c2, 'ja', false); await openPart(R2); const a = statusOf(R2, 'ka'); await tap({ R: R2, c: c2 }, 'ka'); const b = statusOf(R2, 'ka'), r = rawRec(c2, 'ka'); await unmount(R2); await unmount(s.R)
      return [seq.join() === 'KNOWN:true,NEW:false,KNOWN:true' && a === 'KNOWN' && b === 'NEW' && same(r, V774REC('ka')), { seq, a, b }] })
  await TT('C5', 'a tick that was made on a point the track had only touched (the record exists, but it was not introduced: seen in passing) is taken back to exactly that record: the passing note stays, the point is NOT TAUGHT again, nothing is lost',
    async () => { const c0 = fresh(), orig = { ...c0.jaNewProgressRecord('buildingBlock', 'tara'), seenInPassing: 2, lastPassing: '2026-11-21' }, s = await screen({ 'buildingBlock:tara': orig }); if (!CK(s.R)) { await unmount(s.R); return [false, NOPART] }
      const a = statusOf(s.R, 'tara'); await tap(s, 'tara'); const m = rawRec(s.c, 'tara'), b = statusOf(s.R, 'tara'); await tap(s, 'tara'); const r = rawRec(s.c, 'tara'), c = statusOf(s.R, 'tara'); await unmount(s.R)
      return [a === 'NOT TAUGHT' && b === 'KNOWN' && !!m.knownAt && m.seenInPassing === 2 && c === 'NOT TAUGHT' && same(r, orig), { m, r }] })
  await TT('C6', 'a point the tick created that a later track has used (counters grew) is taken back WITHOUT losing that history: it is NOT TAUGHT again (not introduced: no slot, not due), but its exposures and sightings are still on the record',
    async () => { const s = await screen({}); if (!CK(s.R)) { await unmount(s.R); return [false, NOPART] }
      await tap(s, 'tara'); const cur = clone(rawKS(s.c)); cur['buildingBlock:tara'].exposures = 3; cur['buildingBlock:tara'].productiveExposures = 3; cur['buildingBlock:tara'].sightings = 2; cur['buildingBlock:tara'].sightingTracks = ['a', 'b']; cur['buildingBlock:tara'].lastSeen = '2026-11-24'; await s.c.stSet(KS, cur)
      const c2 = reload(s.c), R2 = await wordsList(c2, 'ja', false); await openPart(R2); const m = statusOf(R2, 'tara'); await tap({ R: R2, c: c2 }, 'tara'); const r = rawRec(c2, 'tara'), lab = statusOf(R2, 'tara'), st = rawKS(c2)
      const intro = c2.jaGrammarIntroducedIds(st), slots = c2.jaGrammarSlots(st), due = c2.jaGrammarDue(st, 'buildingBlock', '2099-01-01').map(x => x.itemId); await unmount(R2); await unmount(s.R)
      return [m === 'KNOWN' && lab === 'NOT TAUGHT' && !!r && r.exposures === 3 && r.sightings === 2 && r.sightingTracks.length === 2 && !r.introducedAt && !r.knownAt && r.markedKnownFrom === undefined && !intro.includes('tara') && slots.newCount === 0 && !due.includes('tara'), { r, intro }] })
  await TT('C7', 'a point known by EASY is not taken back here: its label stays KNOWN, a tap changes nothing (the stored text is byte for byte the same) and the row says "Known by rating — change it in Grammar review"',
    async () => { const st = { 'buildingBlock:wo': V774REC('wo') }; fresh().jaGrammarApplyRating(st, 'buildingBlock', 'wo', 'easy'); const s = await screen(st); if (!CK(s.R)) { await unmount(s.R); return [false, NOPART] }
      const s0 = snap(s.c), p = statusBtn(s.R, 'wo').props, label = p['aria-label']; await tap(s, 'wo'); const note = noteOf(s.R, 'wo'), lab = statusOf(s.R, 'wo'), s1 = snap(s.c); await unmount(s.R)
      return [lab === 'KNOWN' && same(s0, s1) && note === 'Known by rating — change it in Grammar review' && label !== 'Mark as not known' && label !== 'Mark as known', { lab, note, label }] })
  await TT('C8', 'a point known after 3 sentences in 2 tracks is not taken back here either: it stays KNOWN, its record (sightings and all) is untouched, and the row says it is known from the tracks',
    async () => { const rec = V774REC('ni', { knownAt: '2026-11-23', sightings: 3, sightingTracks: ['a', 'b'] }), s = await screen({ 'buildingBlock:ni': rec }); if (!CK(s.R)) { await unmount(s.R); return [false, NOPART] }
      const s0 = snap(s.c); await tap(s, 'ni'); const note = noteOf(s.R, 'ni'), lab = statusOf(s.R, 'ni'), r = rawRec(s.c, 'ni'), s1 = snap(s.c); await unmount(s.R)
      return [lab === 'KNOWN' && same(s0, s1) && same(r, rec) && /^Known from your tracks/.test(note || ''), { lab, note }] })
  await TT('C9', 'the take-back function on its own: refuses a point that is not marked here (known by EASY, by sightings, not known at all) and changes nothing; a point rated after it was ticked is not taken back either (its rating is history)',
    async () => { const st = { 'buildingBlock:wo': V774REC('wo'), 'buildingBlock:ni': V774REC('ni', { knownAt: '2026-11-23', sightings: 3, sightingTracks: ['a', 'b'] }), 'buildingBlock:ka': V774REC('ka') }; const c = await ctxWith(st); c.jaGrammarApplyRating(st, 'buildingBlock', 'wo', 'easy'); await c.stSet(KS, clone(st))
      const tg = toggleOf(c); if (!tg) return [false, MISSING('jaGrammarChecklistToggle')]
      const a = await tg('wo'), b = await tg('ni'); await tg('ka')                                                // ka is ticked now
      const cur = clone(rawKS(c)); cur['buildingBlock:ka'].ratedAt = NOW; cur['buildingBlock:ka'].interval = 3; cur['buildingBlock:ka'].dueDate = '2026-12-01'; await c.stSet(KS, cur)       // rated after the tick (the card of an earlier track)
      const before = snap(c), d = await tg('ka')
      const pure = clone(rawKS(c)), p0 = JSON.stringify(pure), un = c.jaGrammarUnmarkKnown(pure, 'wo'), un2 = c.jaGrammarUnmarkKnown(pure, 'ni'), un3 = c.jaGrammarUnmarkKnown(pure, 'tara'), un4 = c.jaGrammarUnmarkKnown(pure, 'ka')
      return [a.changed === false && a.action === 'blocked' && b.changed === false && b.action === 'blocked' && d.changed === false && d.action === 'blocked' && same(snap(c), before) && !!rawRec(c, 'ka').knownAt &&
        [un, un2, un3, un4].every(x => x && x.ok === false) && JSON.stringify(pure) === p0, { a, b, d, un: [un, un2, un3, un4].map(x => x && x.why) }] })

  // ═══ D — SLOTS, STAGES, THE WRITER'S LIST ════════════════════════════════════════════════════════════════════════════════════
  const tickIds = async (c, list) => { const tg = toggleOf(c); if (!tg) return false; for (const id of list) await tg(id); return true }
  await TT('D1', 'a ticked point is known, not NEW: it takes no slot and is not due; ticking a NEW point FREES its slot — with 5 NEW (no slot free, nothing new planned), 1 tick gives 1 free slot and the plan brings exactly that many new points, 3 ticks give 3; taking a tick back puts the point into its slot again',
    async () => { const c = await ctxWith(fiveNew()); if (!await tickIds(c, ['wa'])) return [false, MISSING('jaGrammarChecklistToggle')]
      const rows = []; const p0 = planOf(c, fiveNew(), 200)
      const st1 = rawKS(c), p1 = planOf(c, st1, 200); rows.push({ k: 1, free: c.jaGrammarSlots(st1).free, newCount: c.jaGrammarSlots(st1).newCount, next: ids(p1.next), want: refNext(c, st1, 200, 1), still: ids(p1.stillNew) })
      await tickIds(c, ['ka', 'ne']); const st3 = rawKS(c), p3 = planOf(c, st3, 200); rows.push({ k: 3, free: c.jaGrammarSlots(st3).free, newCount: c.jaGrammarSlots(st3).newCount, next: ids(p3.next), want: refNext(c, st3, 200, 3), still: ids(p3.stillNew) })
      await tickIds(c, ['ne']); const stB = rawKS(c), pB = planOf(c, stB, 200), due = c.jaGrammarDue(st3, 'buildingBlock', '2099-01-01').map(x => x.itemId)
      return [p0.next.length === 0 && p0.slots.free === 0 && rows.every(r => r.newCount === 5 - r.k && r.free === r.k && r.next.length === r.k && r.next.join() === r.want.join()) && rows[0].still.join() === 'ka,ne,yo,da' && rows[1].still.join() === 'yo,da' && !due.includes('wa') &&
        c.jaGrammarSlots(stB).free === 2 && ids(pB.stillNew).join() === 'ne,yo,da' && pB.next.length === 2, { rows, back: ids(pB.next) }] })
  await TT('D2', 'ticking points that were never introduced uses NO slot and does not hold back the learner\'s genuinely new points: with 12 points ticked from a blank store all 5 slots are still free, the next track plans 5 new points, none of them a ticked one, and with the first five NOT ticked the plan is exactly the plan of an empty store',
    async () => { const later = ['tara', 'ba', 'nara', 'kana', 'darou', 'kamo', 'temiru', 'nagara', 'node', 'kara', 'soreni', 'toka']; const c = await ctxWith({}); if (!await tickIds(c, later)) return [false, MISSING('jaGrammarChecklistToggle')]
      const st = rawKS(c), sl = c.jaGrammarSlots(st), p = planOf(c, st, 200), p0 = planOf(c, {}, 200), gate = c.jaGrammarGateContext(learner(c, 200), st, { register: 'natural', today: TODAY })
      const first3 = ['wa', 'ka', 'ne'], c2 = await ctxWith({}); await tickIds(c2, first3); const st2 = rawKS(c2), p2 = planOf(c2, st2, 200)
      return [sl.newCount === 0 && sl.free === 5 && ids(p.next).join() === ids(p0.next).join() && ids(p.next).length === 5 && ids(p.next).every(id => !later.includes(id)) && later.every(id => !!st['buildingBlock:' + id].knownAt) && gate.slots.free === 5 && gate.plannedIds.join() === 'wa,ka,ne,yo,da' &&
        ids(p2.next).join() === refNext(c2, st2, 200, 5).join() && ids(p2.next).length === 5 && ids(p2.next).every(id => !first3.includes(id)) && c2.jaGrammarSlots(st2).free === 5, { plan: ids(p.next), plan0: ids(p0.next), p2: ids(p2.next), free: sl.free }] })
  await TT('D3', 'ticked points count as introduced for the stage: jaGrammarIntroducedIds holds them, and the stage ceilings follow the count (6 ticked "early" 16 characters · 15 "growing" 22 · 30 "broad" 30), in the gate context and in the writer\'s STAGE line',
    async () => { const c = await ctxWith({}), order = IDS(c), vocab = learner(c, 200), res = []; if (!has(c, 'jaGrammarChecklistToggle')) return [false, MISSING('jaGrammarChecklistToggle')]
      let done = 0; for (const k of [6, 15, 30]) { await tickIds(c, order.slice(done, k)); done = k; const st = rawKS(c), g = c.jaGrammarGateContext(vocab, st, { register: 'natural', today: TODAY }), t = c.jaGrammarGatePromptBlock(g), want = c.jaGrammarStageFor(k)
        res.push({ k, intro: c.jaGrammarIntroducedIds(st).length, name: g.ceilings.name, maxChars: g.ceilings.maxChars, ok: c.jaGrammarIntroducedIds(st).join() === order.slice(0, k).join() && g.introducedCount === k && g.ceilings.name === want.name && g.ceilings.maxChars === want.maxChars && new RegExp('STAGE — ' + want.name + ': this learner has been taught ' + k + ' grammar points so far').test(t) }) }
      return [res.map(r => r.name).join() === 'early,growing,broad' && res.map(r => r.maxChars).join() === '16,22,30' && res.every(r => r.ok), res] })
  await TT('D4', 'ticked points count as introduced for the prerequisites: a point whose prerequisite is ticked can be taught NEW from a track\'s sentences; the same sentences with the prerequisite not taught say "needs … first"',
    async () => { const c = await ctxWith({}); if (!has(c, 'jaGrammarChecklistToggle')) return [false, MISSING('jaGrammarChecklistToggle')]
      const E = CURr(c).find(e => e.prereq.length === 1 && e.minKnown <= 40 && !c.ev('JA_GRAMMAR_CORE').includes(e.id)), P = E.prereq[0]
      const an = { perPair: [], basicUses: {}, uses: { [E.id]: { id: E.id, target: [1, 2, 3], all: [1, 2, 3] } } }
      const without = c.jaGrammarPlan(an, { store: {}, known: 200, today: TODAY }); await tickIds(c, [P]); const withTick = c.jaGrammarPlan(an, { store: rawKS(c), known: 200, today: TODAY })
      return [!!E && !ids(without.new).includes(E.id) && without.passing.some(x => x.id === E.id && /needs .* first/.test(x.why)) && ids(withTick.new).includes(E.id) && !withTick.passing.some(x => x.id === E.id), { E: E.id, P, without: without.passing.map(x => x.id + ':' + x.why), withTick: ids(withTick.new) }] })
  // a sentence of the owner's 17 Nov export that uses a point outside the free core and outside the 5 a blank store plans
  const pickX = c => { const core = new Set(c.ev('JA_GRAMMAR_CORE')), planned = new Set(planOf(c, {}, 200).next.map(x => x.id)); for (const l of FIXJ) { const d = c.jaGrammarDetect(l.ja); const id = d.ids.find(i => !core.has(i) && !planned.has(i)); if (id) return { id, ja: l.ja } } return null }
  await TT('D5', 'ticked points are allowed in the writer\'s list: before the tick the sentence check refuses a point that was never taught (GRAMMAR_NOT_YET_TAUGHT); after the tick the point is under "TAUGHT ALREADY (allowed)" in the prompt, is in the gate\'s introducedIds, and the same sentence no longer locks it',
    async () => { const c = await ctxWith({}), X = pickX(c); if (!X) return [false, 'no fixture sentence found']; if (!has(c, 'jaGrammarChecklistToggle')) return [false, MISSING('jaGrammarChecklistToggle')]
      const vocab = learner(c, 200), g0 = c.jaGrammarGateContext(vocab, {}, { register: 'natural', today: TODAY }), r0 = c.jaGrammarCheckSentence(X.ja, g0)
      await tickIds(c, [X.id]); const st = rawKS(c), g1 = c.jaGrammarGateContext(vocab, st, { register: 'natural', today: TODAY }), r1 = c.jaGrammarCheckSentence(X.ja, g1), t = c.jaGrammarGatePromptBlock(g1), e = entry(c, X.id)
      const line = (t.split('\n').find(l => l.startsWith('  TAUGHT ALREADY (allowed): ')) || '')
      return [r0.lockedIds.includes(X.id) && !r1.lockedIds.includes(X.id) && g1.introducedIds.includes(X.id) && line.includes(e.label + ' (' + e.meaning + ')') && !/nothing yet beyond the free list/.test(line) && !(g1.stillNewIds || []).includes(X.id), { X: X.id, line: line.slice(0, 160), locked0: r0.lockedIds, locked1: r1.lockedIds }] })
  await TT('D6', 'the real finaliser treats a ticked point as known: it is not taught NEW, not carried as NEW, not on the review list; it is listed under known (KNOWN … not reviewed) in the track summary, the export and the GRAMMAR IN THIS TRACK screen; it is not introduced again (introducedAt and knownAt stay) and takes no slot',
    async () => { const vocab = learner(fresh(), 200), run = async c => { const gate = c.jaGrammarGateContext(vocab, rawKS(c), { register: 'natural', today: TODAY }); return c.jaGrammarFinaliseTrack(trackOf('2026-11-24T08:00:00.000Z', { trackContext: { trackId: '2026-11-24T08:00:00.000Z', language: 'ja', grammarGate: gate } }), { vocab, today: TODAY }) }
      const c0 = await ctxWith({}), fin0 = await run(c0), X = fin0.grammarInTrack.new.find(x => x.pairs.length >= 2); if (!X) return [false, 'no taught-NEW point to tick']
      const c = await ctxWith({}); if (!await tickIds(c, [X.id])) return [false, MISSING('jaGrammarChecklistToggle')]
      const before = clone(rawRec(c, X.id)), fin = await run(c), g = fin.grammarInTrack, after = rawRec(c, X.id), txt = exportText(c, fin), e = entry(c, X.id)
      const Rn = await mount(c, React.createElement(c.JaGrammarInTrack, { track: fin }), 4), scr = ws(textOf(Rn.toJSON())); await unmount(Rn)
      return [!ids(g.new).includes(X.id) && !ids(g.stillNew).includes(X.id) && !ids(g.review).includes(X.id) && ids(g.knownUsed || []).includes(X.id) && after.introducedAt === before.introducedAt && after.knownAt === before.knownAt && after.markedKnownFrom === 'checklist' && after.exposures > 0 &&
        new RegExp('KNOWN \\(learned for good, used again here, not reviewed\\): .*' + e.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(txt) && /Known, not reviewed/.test(scr) && scr.includes(e.label) && !g.slots.newIds.includes(X.id), { X: X.id, known: ids(g.knownUsed || []), after }] })
  await TT('D7', 'a real generation after ticks (the real generator and picker, only the model transport scripted): the track context carries the ticked points as introduced (the stage count follows them) and the writer is told they are TAUGHT ALREADY; the track still has 5 targets x 3 = 15 target pairs',
    async () => { const S = setup('ja'); quiet(S.c); const c = S.c; await c.stSet(MIGK, DONE); await c.stSet(KS, {}); await c.jaGrammarLoad(); const order = IDS(c); if (!await tickIds(c, order.slice(0, 8))) return [false, MISSING('jaGrammarChecklistToggle')]
      mock(S, 'ja'); const prompts = [], og = c.geminiRequest; c.geminiRequest = async o => { prompts.push((o.messages || []).map(m => m.content).join('\n')); return og(o) }
      const tc = c.jaGeneratorTrackContext(S.targets.slice(0, 5).map(t => ({ ...t, selectionRole: 'review' })), { counts: { new: 0 } }, 'daily', 'natural', c.aiBeginRun('ja-track'))
      const res = await c.generateJapaneseTrack(S.targets.slice(0, 5), S.vocab, 'natural', KEY, MODEL, () => {}, () => {}, { cancelled: false }, { scene: 'Two friends at a station', characterA: 'Kenji, a man', characterB: 'Yuki, a woman', opening: '', reply: '', closing: '', closing_reply: '' }, { trackContext: tc, runId: tc.generationRunId })
      const g = tc.grammarGate, tp = res.pairs.filter(p => p.isTargetPair), lab = id => entry(c, id).label + ' (' + entry(c, id).meaning + ')'
      return [res.complete && tp.length === 15 && !!g && g.introducedCount === 8 && g.ceilings.name === 'early' && g.slots.newCount === 0 && prompts.some(p => /TAUGHT ALREADY \(allowed\): /.test(p) && !/nothing yet beyond the free list/.test(p.split('\n').find(l => l.startsWith('  TAUGHT ALREADY')) || '') && p.includes(lab('san'))) && prompts.some(p => /STAGE — early/.test(p)),
        { complete: res.complete, tp: tp.length, g: g && { n: g.introducedCount, stage: g.ceilings.name }, prompts: prompts.length }] })

  // ═══ E — THE SCREEN ══════════════════════════════════════════════════════════════════════════════════════════════════════════
  await TT('E1', 'filter chips above the list: all, known, new, learning, not taught — each with its count in the label, "all" selected at first; a chip shows only its rows, still in teaching order; an empty group says so',
    async () => { const s = await screen(ST_A); if (!CK(s.R)) { await unmount(s.R); return [false, NOPART] }
      const names = ['all', 'known', 'new', 'learning', 'not taught'], labs = names.map(f => { const b = chip(s.R, f); return b ? tx(b) : null }), pressed0 = chip(s.R, 'all') && chip(s.R, 'all').props['aria-pressed']
      const shown = async f => { await click(chip(s.R, f)); return rowsAll(s.R).map(x => x.props['data-checklist-row']) }
      const k = await shown('known'), nw = await shown('new'), le = await shown('learning'), nt = await shown('not taught'), all = await shown('all'), order = IDS(s.c)
      const inOrder = l => l.join() === order.filter(id => l.includes(id)).join(); await unmount(s.R)
      const s2 = await screen({ 'buildingBlock:ka': V774REC('ka') }); await click(chip(s2.R, 'learning')); const empty = ckText(s2.R); await unmount(s2.R)
      return [labs.join('|') === 'all (101)|known (2)|new (2)|learning (3)|not taught (94)' && pressed0 === true && k.join() === 'ni,wo'.split(',').sort((a, b) => order.indexOf(a) - order.indexOf(b)).join() && nw.join() === 'ka,ne' && le.join() === 'yo,da,san'.split(',').sort((a, b) => order.indexOf(a) - order.indexOf(b)).join() &&
        nt.length === 94 && !nt.includes('ka') && all.length === 101 && [k, nw, le, nt, all].every(inOrder) && /No grammar point in this group/.test(empty), { labs, k, nw, le, nt: nt.length, empty: empty.slice(-60) }] })
  await TT('E2', 'a filter follows a tap at once: on "not taught" a ticked point leaves the group, and on "known" it joins it; the chip counts and the header count move with it',
    async () => { const s = await screen({}); if (!CK(s.R)) { await unmount(s.R); return [false, NOPART] }
      await click(chip(s.R, 'not taught')); const a = rowsAll(s.R).length; await tap(s, 'wa'); const b = rowsAll(s.R).length, lb = tx(chip(s.R, 'not taught')), lk = tx(chip(s.R, 'known')), t = ckText(s.R); await click(chip(s.R, 'known')); const k = rowsAll(s.R).map(x => x.props['data-checklist-row']); await unmount(s.R)
      return [a === 101 && b === 100 && lb === 'not taught (100)' && lk === 'known (1)' && k.join() === 'wa' && /^All grammar \(1 known of 101\)/.test(t), { a, b, lb, lk, k }] })
  const KNOWNHEAD = R => { const t = R.root.findAll(KNOWNTOG)[0]; return t ? tx(t).replace(/\(\s+/g, '(').replace(/\s+\)/g, ')') : null }       // the row builds its count from two pieces of text: the test text puts a space inside the brackets
  await TT('E3', 'the Known grammar row includes the ticked points and its count matches (ticked, EASY and by sightings together), and it follows a tap at once (up on a tick, down on a take-back); opened it lists a ticked point as marked known by you; the count equals the header of "All grammar"',
    async () => { const st = { 'buildingBlock:ni': V774REC('ni', { knownAt: '2026-11-23', sightings: 3, sightingTracks: ['a', 'b'] }), 'buildingBlock:wo': V774REC('wo') }; fresh().jaGrammarApplyRating(st, 'buildingBlock', 'wo', 'easy')
      const s = await screen(st); if (!CK(s.R)) { await unmount(s.R); return [false, NOPART] }
      const h0 = KNOWNHEAD(s.R); await tap(s, 'tara'); await tap(s, 'ka'); const h1 = KNOWNHEAD(s.R), t1 = ckText(s.R); await click(s.R.root.findAll(KNOWNTOG)[0])
      const row = s.R.root.findAll(x => x.props && x.props['data-known-grammar-entry'] === 'tara')[0], rt = row ? tx(row) : ''; await tap(s, 'tara'); const h2 = KNOWNHEAD(s.R), t2 = ckText(s.R); await unmount(s.R)
      return [/Known grammar \(2\)/.test(h0) && /Known grammar \(4\)/.test(h1) && /^All grammar \(4 known of 101\)/.test(t1) && /marked known by you/.test(rt) && rt.includes('known since ' + NOW) && /Known grammar \(3\)/.test(h2) && /^All grammar \(3 known of 101\)/.test(t2), { h0, h1, h2, rt }] })
  await TT('E4', 'the Grammar review part never lists a ticked point as due or as NEW, and follows a tap at once: a NEW point and a due point ticked in All grammar leave the review lists and its header count; taking the tick back puts them in again',
    async () => { const st = { 'buildingBlock:ka': V774REC('ka'), 'buildingBlock:ne': V774REC('ne') }; const c0 = fresh(); st['buildingBlock:wa'] = V774REC('wa'); c0.jaGrammarApplyRating(st, 'buildingBlock', 'wa', 'ok'); st['buildingBlock:wa'].dueDate = '2026-11-20'
      const s = await screen(st, { reviewOpen: true }); if (!CK(s.R)) { await unmount(s.R); return [false, NOPART] }
      const inRev = id => s.R.root.findAll(x => x.props && (x.props['data-review-area-new'] === id || x.props['data-review-area-due'] === id)).length > 0, head = () => reviewText(s.R).slice(0, 60)
      const h0 = head(), a = [inRev('ka'), inRev('ne'), inRev('wa')]; await tap(s, 'ka'); await tap(s, 'wa'); const h1 = head(), b = [inRev('ka'), inRev('ne'), inRev('wa')]; await tap(s, 'ka'); const h2 = head(), c = [inRev('ka'), inRev('ne'), inRev('wa')]; await unmount(s.R)
      return [a.join() === 'true,true,true' && b.join() === 'false,true,false' && c.join() === 'true,true,false' && /Grammar review 1 due · 2 new, not rated/.test(h0) && /Grammar review nothing to review|Grammar review 0 due · 1 new, not rated/.test(h1) && /Grammar review 0 due · 2 new, not rated/.test(h2), { h0, h1, h2, a, b, c }] })
  await TT('E5', 'the two parts never undo each other: a tick in All grammar followed by a rating in Grammar review keeps the tick in storage; and a rating in Grammar review shows in All grammar at once (the label turns LEARNING)',
    async () => { const st = { 'buildingBlock:ka': V774REC('ka'), 'buildingBlock:ne': V774REC('ne') }; const s = await screen(st, { reviewOpen: true }); if (!CK(s.R)) { await unmount(s.R); return [false, NOPART] }
      await tap(s, 'ka'); const card = s.R.root.findAll(x => x.props && x.props['data-review-area-new'] === 'ne')[0], okBtn = card && card.findAll(x => x.type === 'button' && tx(x) === 'OK' && typeof x.props.onClick === 'function')[0]
      await click(okBtn); const stored = rawKS(s.c), lab = statusOf(s.R, 'ne'); await unmount(s.R)
      return [!!okBtn && !!stored['buildingBlock:ka'].knownAt && stored['buildingBlock:ka'].markedKnownFrom === 'checklist' && stored['buildingBlock:ne'].interval > 0 && lab === 'LEARNING', { ka: stored['buildingBlock:ka'], ne: stored['buildingBlock:ne'], lab, found: !!okBtn }] })
  await TT('E6', 'there is no "mark all": the part holds exactly one toggle, five filter chips and one label per point (101) as clickable controls, no checkbox, no control named all/every except the "all" chip, and the source has no mark-all function',
    async () => { const s = await screen({}); if (!CK(s.R)) { await unmount(s.R); return [false, NOPART] }
      const ck = CK(s.R), clickable = ck.findAll(x => x.props && typeof x.props.onClick === 'function'), btns = clickable.filter(x => x.type === 'button'), inputs = ck.findAll(x => x.type === 'input').length
      const chips = btns.filter(x => x.props['data-checklist-filter']).map(x => tx(x)), labels = btns.filter(x => x.props['data-checklist-status']).length, bulk = btns.map(x => tx(x)).filter(t => /mark all|tick all|select all|know all|every/i.test(t)); await unmount(s.R)
      return [clickable.length === 1 + 5 + 101 && btns.length === clickable.length && labels === 101 && chips.join('|') === 'all (101)|known (0)|new (0)|learning (0)|not taught (101)' && inputs === 0 && bulk.length === 0 && !/function\s+jaGrammar\w*(MarkAll|TickAll|CheckAll|KnowAll|SelectAll)/i.test(SRC), { clickable: clickable.length, chips, inputs, bulk }] })
  await TT('E7', 'Start grammar from scratch leaves the ticked points alone (they are known, not NEW) and removes only the NEW ones; its Undo then puts back exactly the removed records, ticked points untouched, and a ticked point that took the place of a reset one is kept (skipped)',
    async () => { const MIXN = { 'buildingBlock:wa': V774REC('wa'), 'buildingBlock:ka': V774REC('ka'), 'buildingBlock:ne': V774REC('ne'), 'buildingBlock:yo': V774REC('yo'), 'buildingBlock:da': V774REC('da', { interval: 2, okStreak: 1, dueDate: '2026-11-26', autoScheduled: undefined }) }
      const c = await ctxWith(MIXN, { extra: EXTRA }); if (!await tickIds(c, ['wa', 'tara'])) return [false, MISSING('jaGrammarChecklistToggle')]       // wa: NEW → ticked, tara: never introduced → ticked
      const ticked = clone({ wa: rawRec(c, 'wa'), tara: rawRec(c, 'tara') }), r = await c.jaGrammarStartFromScratch(), after = rawKS(c), b = JSON.parse(c.localStorage.getItem(BKEY) || 'null')
      const keepOk = same(after['buildingBlock:wa'], ticked.wa) && same(after['buildingBlock:tara'], ticked.tara) && !after['buildingBlock:ka'] && !after['buildingBlock:ne'] && !after['buildingBlock:yo'] && !!after['buildingBlock:da']
      await tickIds(c, ['ka'])                                                                                                           // ka: reset, then ticked (a record exists now)
      const u = await c.jaGrammarUndoReset(), fin = rawKS(c)
      return [r.changed === true && r.ids.join() === 'ka,ne,yo' && b.ids.join() === 'ka,ne,yo' && keepOk && u.restored === 2 && u.skipped === 1 && u.skippedIds.join() === 'ka' && same(fin['buildingBlock:ne'], MIXN['buildingBlock:ne']) && same(fin['buildingBlock:yo'], MIXN['buildingBlock:yo']) && !!fin['buildingBlock:ka'].knownAt && same(fin['buildingBlock:wa'], ticked.wa) && same(fin['buildingBlock:tara'], ticked.tara), { r: r.ids, u }] })
  await TT('E8', 'on the screen: after Start grammar from scratch the ticked points are still KNOWN in All grammar (the reset ones are NOT TAUGHT) and the list refreshes by itself; Undo brings the reset ones back as NEW',
    async () => { const MIXN = { 'buildingBlock:wa': V774REC('wa'), 'buildingBlock:ka': V774REC('ka'), 'buildingBlock:ne': V774REC('ne') }; const s = await screen(MIXN, { reviewOpen: true }); if (!CK(s.R)) { await unmount(s.R); return [false, NOPART] }
      s.c.confirm = () => { throw new Error('window.confirm must not be used') }; await tap(s, 'wa')
      const area = REVIEW(s.R), b = (text) => area.findAll(x => x.type === 'button' && tx(x) === text && typeof x.props.onClick === 'function')[0]
      await click(b('Start grammar from scratch')); await click(b('Yes, start from scratch')); const afterReset = ['wa', 'ka', 'ne'].map(id => statusOf(s.R, id)).join()
      await click(b('Undo')); const afterUndo = ['wa', 'ka', 'ne'].map(id => statusOf(s.R, id)).join(); await unmount(s.R)
      return [afterReset === 'KNOWN,NOT TAUGHT,NOT TAUGHT' && afterUndo === 'KNOWN,NEW,NEW', { afterReset, afterUndo }] })

  // ═══ F — SAFETY AND THE SWITCH ═══════════════════════════════════════════════════════════════════════════════════════════════
  const V776 = JSON.parse(fs.readFileSync(__dirname + '/fixtures/ja-grammar-v776-reference.json', 'utf8'))
  // v778 (Study what's ready): the Japanese generator's CODE hash (the key jaGen) is left out of the two comparisons below on purpose — that function was changed to add the button and the note on its
  // "Generation needs a recall" screen and the choice on its saved-draft screen, so its source can no longer equal v776's. Everything else stays pinned (the Words list code, the Thai / Mandarin / Cantonese
  // generators, every screen and hash above); the Japanese generator's own screens with the new switch off are pinned against the unchanged v777 build by tests118.js (fixtures/ja-study-ready-v777-reference.json).
  await TT('F1', 'switch OFF: the Japanese Words list (Grammar review open and closed, and the Known grammar row opened), the plan screen and its preview, the writer\'s prompt block, the gate context, the plan, the track summary, the export, GRAMMAR IN THIS TRACK and the rating card — for the 32-point learner, for 3 and 5 points waiting, for a blank store and for a store holding ticked-shaped records — and the Thai / Mandarin / Cantonese Words lists and generator screens are exactly what the unchanged v776 build produced',
    async () => { const now = await probe(false), keys = Object.keys(V776).filter(k => k !== 'about' && k !== 'jaGen'); return [keys.every(k => now[k] === V776[k]) && Object.keys(now).filter(k => k !== 'jaGen').length === keys.length, keys.filter(k => now[k] !== V776[k]).map(k => k + ': now ' + now[k] + ' v776 ' + V776[k])] })
  await TT('F2', 'switch ON (as shipped): every screen except the Words list is still exactly the v776 one for all five states — and the Words list is the v776 list with only the new "All grammar" part added (the part cut out, the rest hashes the same); the Thai / Mandarin / Cantonese lists and the code of the generator screens, the Japanese generator and the Words list are identical',
    async () => { const now = await probe(true), keys = Object.keys(V776).filter(k => k !== 'about' && k !== 'jaGen' && !/^knownOpen_/.test(k)); return [keys.every(k => now[k] === V776[k]) && Object.keys(now).filter(k => k !== 'jaGen').length === keys.length, keys.filter(k => now[k] !== V776[k]).map(k => k + ': now ' + now[k] + ' v776 ' + V776[k])] })
  await TT('F3', 'the new part needs what it is made of: with the slots rule off (there is no NEW) or the Known grammar mark off (there is no known), or the new switch off, the part is not shown; the other switches are not changed by it',
    async () => { const res = {}
      for (const how of ['own', 'slots', 'known']) { const c = await ctxWith(ST_A, { extra: EXTRA }); if (how === 'own') setSwitch(c, false); if (how === 'slots') c.jaGrammarSlotsSetEnabled(false); if (how === 'known') c.jaGrammarKnownSetEnabled(false)
        const R = await wordsList(c, 'ja', false); res[how] = { part: !!CK(R), on: has(c, SWITCH + 'On') ? c[SWITCH + 'On']() : null, slots: c.jaGrammarSlotsOn(), known: c.jaGrammarKnownOn() }; await unmount(R) }
      const c = await ctxWith(ST_A, { extra: EXTRA }), R = await wordsList(c, 'ja', false); res.all = { part: !!CK(R), on: has(c, SWITCH + 'On') ? c[SWITCH + 'On']() : null }; await unmount(R)
      return [res.all.part === true && ['own', 'slots', 'known'].every(k => res[k].part === false) && res.own.slots === true && res.own.known === true && res.slots.on === false && res.known.on === false, res] })
  const g4row = async doTick => { const c = await ctxWith(learner32(fresh()).store), vocab = learner(c, 150); if (doTick && !await tickIds(c, ['tara', 'ba', 'nara', 'wa', 'ka'])) return { err: MISSING('jaGrammarChecklistToggle') }
    const st = rawKS(c), gate = c.jaGrammarGateContext(vocab, st, { register: 'natural', today: TODAY }), inv0 = c.japaneseLearnerInventory(vocab, vocab.slice(0, 30)), before = FIXJ.map(l => JSON.stringify(c.japaneseCheckLine(l.ja, inv0)))
    const track = trackOf('2026-11-17T09:04:11.270Z', { trackContext: { trackId: '2026-11-17T09:04:11.270Z', language: 'ja', grammarGate: gate } }), sel0 = JSON.stringify(track.selectedTargetIds), kw0 = JSON.stringify(track.keywords), pairs0 = JSON.stringify(track.pairs), vocab0 = JSON.stringify(vocab)
    const fin = await c.jaGrammarFinaliseTrack(track, { vocab, today: TODAY }), inv1 = c.japaneseLearnerInventory(vocab, vocab.slice(0, 30)), after = FIXJ.map(l => JSON.stringify(c.japaneseCheckLine(l.ja, inv1)))
    return { doTick, ok: JSON.stringify(fin.selectedTargetIds) === sel0 && JSON.stringify(fin.keywords) === kw0 && JSON.stringify(fin.pairs) === pairs0 && fin.pairs.filter(p => c.jaGrammarIsTargetPair(p)).length === 90 && fin.keywords.length === 30 && JSON.stringify(before) === JSON.stringify(after) && JSON.stringify(vocab) === vocab0 && (await c.stGet('tt-ja-vocab')) == null } }
  await TT('F4', 'grammar ticks never change the 30 target words, the 90 target pairs or the closed-vocabulary check: with 5 points ticked on the 32-point learner, the same words and ids, the same 99 pairs (90 target pairs), the same verdicts on all 99 lines before and after, the same word list in storage (none written)',
    async () => { const r = await g4row(true); return [r.ok === true, r] })
  await TT('F5', 'ticking writes only the grammar store: words, tracks, the speech style, today\'s new-word places, the Thai / Mandarin / Cantonese stores and the migration marker are byte for byte what they were; the backup of a reset is not touched',
    async () => { const c = await ctxWith(learner32(fresh()).store, { extra: EXTRA }), s0 = snap(c); if (!await tickIds(c, ['tara', 'wa', 'ka'])) return [false, MISSING('jaGrammarChecklistToggle')]; await tickIds(c, ['tara'])
      const s1 = snap(c), changed = Object.keys(s1).filter(k => s0[k] !== s1[k]), added = Object.keys(s1).filter(k => !(k in s0)); return [changed.join() === KS && added.length === 0, { changed, added }] })
  await TT('F6', 'the new code is marked (v777), keeps to the project rules (no key, token, access code or provider name) and the new part has no checkbox and no bulk function',
    async () => { const a = SRC.indexOf('v777 — ALL GRAMMAR'), b = SRC.indexOf('end of the v777 block'), block = a > 0 && b > a ? SRC.slice(a, b) : ''
      return [a > 0 && b > a && block.length > 1500 && !/AIza[0-9A-Za-z_-]{20,}|sk-ant-|access[ _-]?code|claude|gemini|sonnet|opus|haiku|anthropic|openai|gpt-/i.test(block) && !/type="checkbox"|type='checkbox'/.test(block), { a, b, len: block.length }] })
  out.forEach(l => console.log(l))
  console.log('\n' + (n - fails) + '/' + n + ' passed' + (fails ? ' · ' + fails + ' FAILED' : ' — ALL PASS'))
  process.exit(fails ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
