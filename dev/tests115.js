// 24 Nov — JAPANESE GRAMMAR: START FROM SCRATCH (v776). v775 made a grammar point NEW until the learner rates it (5 slots). The real learner has 32 points that were introduced earlier (by the first-run
// migration and by the v773 / v774 tracks) and never rated, so every one of them counts as NEW, the screen says "32 of 5 slots" and no new grammar can come in. This suite proves the way out:
// a button that sends the never-rated grammar points back to "not taught yet" (with a backup and an Undo), and the plain wording that replaces "32 of 5 slots".
// Real application functions throughout (the curriculum, the plan, the picker, the finaliser, the gate, the prompt block, the export, the screens, the storage merge); the only thing scripted is
// the model transport, and only in the one test that runs a real generation. The state is built with the application's own record writers, plus records shaped exactly as the first-run migration
// and the v774 tracks stored them (the real learner's 32 points).
//   A  THE RESET      only NEW grammar records go (introduced, never rated, not known) · rated points, known points, conversation basics, words, tracks and every other store are untouched · the record is gone
//                     from storage (the save merges, so a deletion has to be asked for) · blank state afterwards
//   B  BACKUP / UNDO  the exact records are saved BEFORE they go · an empty second reset keeps the backup · Undo restores the exact records, skips a point that has a record now and says how many
//   C  ONE-WAY DOOR   load, reset, reload: the first-run migration does not run again and nothing comes back except through the normal picker
//   D  THE NEXT TRACK on the 32-point fixture (about 150 known words): introduced 0, "first steps", the free core, up to 5 new points under the cost budget, nothing taught beyond the free list;
//                     rating the 5 frees the slots (the slot arithmetic of tests114)
//   E  THE SCREEN     the button in the Grammar review part of the Japanese Words list, an in-app confirmation, the Undo control; Thai / Mandarin / Cantonese show none of it
//   F  THE WORDING    no "N of 5" with N over 5, no repeated "practised again" on every row, one short line above the list, the "Next new points" reason; switch off = the v775 strings
//   G  SAFETY         both switches off = the unchanged v775 build (fixtures/ja-grammar-v775-reference.json) · each switch is its own · the 30 words, the 90 pairs and the closed-vocabulary check
//   node tests115.js            (current build: tt.compiled.js, or TT_FILE)      TT_PROBE=1 prints the v775 reference values this suite compares against (run it on the unchanged v775 build)
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
const NOW = new Date().toISOString().slice(0, 10)         // the day a rating is made (the application reads the real clock)
const KS = 'tt-ja-grammar-srs', BKEY = 'tt-ja-grammar-reset-backup', MIGK = 'tt-migrations', MIGID = 'ja-grammar-curriculum-v1'
const DONE = { [MIGID]: { status: 'done' } }
const textOf = x => x == null ? '' : typeof x === 'string' ? x : Array.isArray(x) ? x.map(textOf).join(' ') : textOf(x.children)
const flush = async (k = 20) => { for (let i = 0; i < k; i++) await new Promise(r => setImmediate(r)) }
const quiet = c => { c.console.info = () => {}; c.console.warn = () => {}; c.console.error = () => {}; return c }
const fresh = () => quiet(load(FILE, { realBelt: true, React }))
const has = (c, name) => typeof c[name] === 'function'
const learner = (c, known) => c.initJapaneseVocab().map((w, i) => i < known ? { ...w, status: 'known' } : w)
const SW2 = { reset: 'jaGrammarReset', wording: 'jaGrammarClearWording' }
const setSw = (c, reset, wording) => { has(c, SW2.reset + 'SetEnabled') && c[SW2.reset + 'SetEnabled'](reset); has(c, SW2.wording + 'SetEnabled') && c[SW2.wording + 'SetEnabled'](wording); return c }
const OLD = c => setSw(c, false, false)                  // both new switches off: the build must be v775
const esc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const ws = s => String(s).replace(/\s+/g, ' ')
const CURr = c => c.ev('JA_GRAMMAR_CURRICULUM')
const IDS = c => CURr(c).map(e => e.id)
const entry = (c, id) => c.ev('jaGrammarEntryById')(id)
const clone = x => JSON.parse(JSON.stringify(x))
const ids = list => (list || []).map(x => x.id)
const sortKeys = x => Array.isArray(x) ? x.map(sortKeys) : x && typeof x === 'object' ? Object.keys(x).sort().reduce((o, k) => { o[k] = sortKeys(x[k]); return o }, {}) : x
const same = (a, b) => JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b))

// a record as v774 stored an introduced point that was never rated: introduced, practised in a track, the automatic first review date (+2 days) — and nothing else
const V774REC = (id, o) => ({ key: 'buildingBlock:' + id, type: 'buildingBlock', itemId: id, status: 'learning', interval: 0, dueDate: '2026-11-22', lastSeen: '2026-11-20', introducedAt: '2026-11-20', okStreak: 0, lapses: 0,
  exposures: 2, productiveExposures: 2, autoScheduled: true, ...(o || {}) })
// a record as the first-run migration (jaGrammarMigrateV1) stored it: introduced, never practised, no date at all
const MIGREC = (id, type) => ({ key: (type || 'buildingBlock') + ':' + id, type: type || 'buildingBlock', itemId: id, status: 'learning', interval: 0, dueDate: null, lastSeen: null, introducedAt: '2026-10-20', okStreak: 0, lapses: 0, exposures: 0, productiveExposures: 0 })
// THE REAL LEARNER: 32 grammar points introduced and never rated — the 15 the first-run migration seeded for a learner of about 150 known words, and the 17 the v773 / v774 tracks introduced after it
// (the first unlocked points in curriculum order) — plus 4 conversation basics from the migration and 2 reaction words from the tracks, and about 150 known words. Nothing was ever rated.
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
// 3 points still NEW (da, the plain present, さん) beside rated ones: two due (ka, wa), one due much later (ne), one known (yo)
const threeNew = () => { const st = {}; const put = (id, o) => { st['buildingBlock:' + id] = V774REC(id, o) }
  put('wa', { interval: 3, okStreak: 1, dueDate: '2026-11-20', autoScheduled: undefined }); put('ka', { interval: 2, okStreak: 1, dueDate: '2026-11-18', autoScheduled: undefined }); put('ne', { interval: 4, okStreak: 2, dueDate: '2099-12-30', autoScheduled: undefined })
  put('yo', { interval: 5, okStreak: 2, dueDate: '2026-11-22', knownAt: '2026-11-10', sightings: 4, sightingTracks: ['a', 'b'], autoScheduled: undefined }); put('da'); put('plain-present'); put('san'); return st }
const fiveNew = () => { const st = {}; ;['wa', 'ka', 'ne', 'yo', 'da'].forEach(id => { st['buildingBlock:' + id] = V774REC(id) }); return st }
const newCountOf = st => Object.values(st || {}).filter(r => r && r.type === 'buildingBlock' && r.introducedAt && !(r.interval > 0) && !r.ratedAt && !r.knownAt).length
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
const btn = (R, text, nth) => R.root.findAll(x => x.type === 'button' && tx(x) === text && typeof x.props.onClick === 'function')[nth || 0]
const click = async (b) => { if (!b) return false; await TR.act(async () => { b.props.onClick(); await flush(12) }); return true }       // a missing button is reported by the assertions that follow, not by a crash
const unmount = async R => { await TR.act(async () => { R.unmount() }) }
// the whole of what a context has stored, as the raw text; and a "reload": a new application (a new context) over the same stored text
const snap = c => { const o = {}; for (let i = 0; i < c.localStorage.length; i++) { const k = c.localStorage.key(i); o[k] = c.localStorage.getItem(k) } return o }
const reload = c => { const nc = fresh(), s = snap(c); Object.keys(s).forEach(k => nc.localStorage.setItem(k, s[k])); return nc }
const rawKS = c => JSON.parse(c.localStorage.getItem(KS) || '{}')
const rawB = c => { const r = c.localStorage.getItem(BKEY); return r == null ? null : JSON.parse(r) }
// a context holding a stored grammar store (the migration marker done unless told otherwise)
async function ctxWith(store, o) {
  const c = fresh(); const opt = o || {}
  if (opt.setup) opt.setup(c)
  if (opt.marker !== false) await c.stSet(MIGK, opt.marker || DONE)
  await c.stSet(KS, clone(store))
  if (opt.extra) for (const k of Object.keys(opt.extra)) await c.stSet(k, opt.extra[k])
  await c.jaGrammarLoad()
  return c
}
// the Japanese plan screen ("Scene Ready": the target chips, the Grammar for this track preview), the real JapaneseGenerator with only the scene call answered. marker === false: the migration marker is not written
async function planScreen(cc, vocab, store, marker) {
  cc.generateJapaneseScene = async () => ({ scene: 'Two friends meet', setting: 'a cafe', characterA: 'Daiki', characterB: 'Mio', opening: 'こんにちは', opening_english: 'Hello', premise: 'x' })
  if (marker !== false) await cc.stSet(MIGK, DONE)
  await cc.stSet(KS, store || {})
  const targets = vocab.slice(0, 5).map(w => ({ ...w, selectionRole: 'review' }))
  let R; await TR.act(async () => { R = TR.create(React.createElement(cc.JapaneseGenerator, { vocab, targets, selection: null, trackMode: 'daily', tracks: [], register: 'natural', cred: { geminiKey: 'k' }, onGenerated() {}, onBack() {} })); for (let i = 0; i < 80; i++) await new Promise(x => setImmediate(x)) })
  return { R, text: textOf(R.toJSON()).replace(/\s+/g, ' ') }
}
const wordsList = async (c, lang, open, vocab) => mount(c, React.createElement(c.WordListView, { vocab: vocab || [], lang, initialFilter: open ? 'due' : 'all', onBack() {} }), 8)

// ── THE v775 REFERENCE: what the unchanged v775 build shows and writes for the 32-point learner and for a few other states ─────────────────────────────────────────────────────────────
// TT_PROBE=1 prints these on the unchanged v775 build; G1 compares the new build, with both new switches off, to the file the probe wrote (fixtures/ja-grammar-v775-reference.json).
async function probe() {
  const R = {}, L = learner32(fresh()), STATES = { n32: L.store, n3: threeNew(), n5: fiveNew(), n0: {} }
  for (const name of Object.keys(STATES)) {
    const store = STATES[name], mk = async () => OLD(await ctxWith(store)), vocab = learner(fresh(), 150)
    { const c = await mk(); const Rn = await wordsList(c, 'ja', true); R['wordsOpen_' + name] = sha(textOf(Rn.toJSON())); await unmount(Rn) }
    { const c = await mk(); const Rn = await wordsList(c, 'ja', false); R['wordsClosed_' + name] = sha(textOf(Rn.toJSON())); await unmount(Rn) }
    { const c = await mk(); const Rn = await mount(c, React.createElement(c.JaGrammarPreview, { vocab, store: clone(store) }), 4); R['preview_' + name] = sha(textOf(Rn.toJSON())); await unmount(Rn) }
    { const c = await mk(); const ps = await planScreen(c, vocab, clone(store)); R['planScreen_' + name] = sha(ps.text); await unmount(ps.R) }
    { const c = await mk(); const plan = planOf(c, clone(store), 150), gate = c.jaGrammarGateContext(vocab, clone(store), { register: 'natural', today: TODAY })
      R['plan_' + name] = sha(JSON.stringify(plan)); R['gate_' + name] = sha(JSON.stringify(gate)); R['prompt_' + name] = sha(c.jaGrammarGatePromptBlock(gate))
      const fin = await c.jaGrammarFinaliseTrack(trackOf('2026-11-24T08:00:00.000Z', { trackContext: { trackId: '2026-11-24T08:00:00.000Z', language: 'ja', grammarGate: gate } }), { vocab, today: TODAY })
      R['summary_' + name] = sha(JSON.stringify(fin.grammarInTrack)); R['export_' + name] = sha(exportText(c, fin))
      { const Rn = await mount(c, React.createElement(c.JaGrammarInTrack, { track: fin }), 4); R['trackScreen_' + name] = sha(textOf(Rn.toJSON())); await unmount(Rn) }
      { const Rn = await mount(c, React.createElement(c.JaGrammarReview, { track: fin })); R['card_' + name] = sha(textOf(Rn.toJSON())); await unmount(Rn) } }
  }
  // Thai, Mandarin and Cantonese: the Words lists (with the 32 points sitting in the grammar store) and the three generator screens' code, and the Japanese Words list and generator code
  { const c = OLD(await ctxWith(L.store))
    const banks = { th: c.initVocab().slice(0, 12), zh: c.initMandarinVocab().slice(0, 12), yue: c.initCantoneseVocab().slice(0, 12) }
    for (const lang of ['th', 'zh', 'yue']) { const Rn = await wordsList(c, lang, false, banks[lang]); R['words_' + lang] = sha(textOf(Rn.toJSON())); await unmount(Rn) }
    R.gens = ['Generator', 'MandarinGenerator', 'CantoneseGenerator'].map(k => sha(c.ev('(' + k + ')').toString())).join('/')
    R.jaGen = sha(c.ev('(JapaneseGenerator)').toString()); R.wordList = sha(c.ev('(WordListView)').toString()) }
  return R
}

;(async () => {
  if (process.env.TT_PROBE) { console.log(JSON.stringify(await probe(), null, 1)); process.exit(0) }
  // @@SECTIONS@@
  out.forEach(l => console.log(l))
  console.log('\n' + (n - fails) + '/' + n + ' passed' + (fails ? ' · ' + fails + ' FAILED' : ' — ALL PASS'))
  process.exit(fails ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
