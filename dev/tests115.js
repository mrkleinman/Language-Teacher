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
// v778 (explained here on purpose): the two English-only grammar names (the plain present, the noun-modifying clause) are now shown with Japanese examples (jaGrammarShownLabelSetEnabled, added after this suite was
// written, ON by default). This suite states the earlier contract, whose screens, prompts, exports and logs name those two entries in English, so every context of this suite is made with that one switch off too.
// Nothing else is changed: every assertion below is the one it shipped with, and the new text has its own suite (tests117.js).
const quiet = c => { c.console.info = () => {}; c.console.warn = () => {}; c.console.error = () => {}; if (typeof c.jaGrammarShownLabelSetEnabled === 'function') c.jaGrammarShownLabelSetEnabled(false); return c }
const fresh = () => quiet(load(FILE, { realBelt: true, React }))
const has = (c, name) => typeof c[name] === 'function'
const learner = (c, known) => c.initJapaneseVocab().map((w, i) => i < known ? { ...w, status: 'known' } : w)
const SW2 = { reset: 'jaGrammarReset', wording: 'jaGrammarClearWording' }
const setSw = (c, reset, wording) => { has(c, SW2.reset + 'SetEnabled') && c[SW2.reset + 'SetEnabled'](reset); has(c, SW2.wording + 'SetEnabled') && c[SW2.wording + 'SetEnabled'](wording); return c }
// both new switches off: the build must be v775.
// v777 note (explained here on purpose): the "All grammar" part of the Japanese Words list (jaGrammarChecklistSetEnabled, added after this suite was written, ON by default) is a third, later
// switch of that same screen. A v775 build has no such part, so reproducing v775 means switching it off as well; without this the only keys that differ are the eight Words-list hashes
// (wordsOpen_* / wordsClosed_*), exactly the text of the new part. Nothing else of this suite is touched, and the new part's own proof against v776 is tests116.js.
const OLD = c => { if (typeof c.jaGrammarChecklistSetEnabled === 'function') c.jaGrammarChecklistSetEnabled(false); return setSw(c, false, false) }
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
  if (store !== null) await cc.stSet(KS, store || {})        // null: leave what is stored as it is
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
  // each test runs on its own: one that cannot even start (a function that does not exist yet) fails by itself and says why, the rest go on
  const TT = async (id, name, fn) => { try { const r = await fn(); T(id, name, !!(r && r[0]), r && r[1]) } catch (e) { T(id, name, false, 'threw: ' + String(e && e.message).split('\n')[0]) } }
  const MISSING = f => f + ' does not exist in this build'
  const NEWIDS = ['wa', 'ka', 'ne', 'yo', 'da', 'plain-present'], NEWKEYS = NEWIDS.map(id => 'buildingBlock:' + id)
  // a mixed store: 6 points NEW in every shape the real learner's records have, and everything that is NOT NEW and must stay exactly as it is
  const MIX = (() => { const c = fresh(), st = {}
    st['buildingBlock:wa'] = MIGREC('wa')                                                                                    // seeded by the first-run migration: introduced, no date, never practised
    st['buildingBlock:ka'] = V774REC('ka', { sightings: 2, sightingTracks: ['2026-11-17T09:04:11.270Z'] })                   // practised, with sightings counters (they must go with the record)
    st['buildingBlock:ne'] = V774REC('ne', { notShownAt: '2026-11-23', notShownCount: 2 })                                   // marked "Not shown": still NEW
    st['buildingBlock:yo'] = V774REC('yo', { seenInPassing: 2, lastPassing: '2026-11-19' })
    st['buildingBlock:da'] = { ...MIGREC('da'), exposures: 3, productiveExposures: 3, lastSeen: '2026-11-22' }               // introduced by a v775 track: practised, no date
    st['buildingBlock:plain-present'] = V774REC('plain-present', { sightings: 1, sightingTracks: ['x'] })
    c.jaGrammarApplyRating(st, 'buildingBlock', 'san', 'hard'); c.jaGrammarApplyRating(st, 'buildingBlock', 'wo', 'ok'); c.jaGrammarApplyRating(st, 'buildingBlock', 'ni', 'easy')       // rated through the application's own function
    st['buildingBlock:no'] = V774REC('no', { interval: 2, okStreak: 1, dueDate: '2026-11-26' })                              // rated on v774 (interval > 0, no ratedAt)
    st['buildingBlock:desu'] = V774REC('desu', { knownAt: '2026-11-23', sightings: 3, sightingTracks: ['a', 'b'] })          // known after 3 sentences in 2 tracks, never rated
    st['buildingBlock:janai'] = { ...c.jaNewProgressRecord('buildingBlock', 'janai'), seenInPassing: 3, lastPassing: '2026-11-21' }   // seen in passing only: never introduced
    st['buildingBlock:zzz-old'] = V774REC('zzz-old')                                                                         // not an entry of the curriculum: not counted as NEW anywhere, so it is not touched either
    st['conversationBasic:konnichiwa'] = MIGREC('konnichiwa', 'conversationBasic'); st['conversationBasic:un'] = MIGREC('un', 'conversationBasic')
    st['conversationBasic:nee'] = { ...V774REC('nee'), key: 'conversationBasic:nee', type: 'conversationBasic' }
    st['conversationBasic:matane'] = { ...V774REC('matane', { interval: 2 }), key: 'conversationBasic:matane', type: 'conversationBasic' }
    return st })()
  const EXTRA = { 'tt-ja-vocab': [{ id: 1, japanese: '行く', status: 'known' }, { id: 2, japanese: '水', status: 'learning' }], 'tt-ja-tracks': [{ createdAt: '2026-11-17T09:04:11.270Z', language: 'ja', pairs: [{ japanese: 'こんにちは' }] }],
    'tt-ja-register': 'natural', 'tt-ja-daily-new': { day: '2026-11-23', n: 3 }, 'tt-vocab': [{ id: 7, thai: 'น้ำ', status: 'known' }], 'tt-zh-vocab': [{ id: 1, chinese: '水' }], 'tt-yue-vocab': [{ id: 1, chinese: '水' }] }
  const startOf = c => has(c, 'jaGrammarStartFromScratch') ? c.jaGrammarStartFromScratch() : Promise.resolve(null)
  const undoOf = c => has(c, 'jaGrammarUndoReset') ? c.jaGrammarUndoReset() : Promise.resolve(null)
  let M = null
  const mixRun = async () => { if (M) return M
    const c = await ctxWith(MIX, { extra: EXTRA }), snapBefore = snap(c), res = await startOf(c); return (M = { c, res, snapBefore, snapAfter: snap(c) }) }

  // ═══ A — THE RESET ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
  await TT('A0', 'the two switches exist (a setter and a reader each) and are ON by default; the reset, the undo, the backup reader and the pure planner exist; the backup has its own storage key (tt-ja-grammar-reset-backup)', async () => {
    const c = fresh(), want = ['jaGrammarStartFromScratch', 'jaGrammarUndoReset', 'jaGrammarResetBackupLoad', 'jaGrammarResetPlan']
    return [['jaGrammarReset', 'jaGrammarClearWording'].every(p => has(c, p + 'SetEnabled') && has(c, p + 'On') && c[p + 'On']() === true) && want.every(f => has(c, f)) && c.ev('JA_GRAMMAR_RESET_KEY') === BKEY,
      { missing: ['jaGrammarResetSetEnabled', 'jaGrammarResetOn', 'jaGrammarClearWordingSetEnabled', 'jaGrammarClearWordingOn'].concat(want).filter(f => !has(c, f)) }] })
  await TT('A1', 'the reset removes ONLY the grammar points that are NEW (introduced, never rated, not known): the 6 NEW records (migration-shaped, practised, "Not shown", seen in passing, v775-shaped, with sightings) are gone from STORAGE (the save merges, so a deletion must be asked for); every other record is still there',
    async () => { const m = await mixRun(); if (!m.res) return [false, MISSING('jaGrammarStartFromScratch')]
      const after = rawKS(m.c), left = Object.keys(MIX).filter(k => !NEWKEYS.includes(k))
      return [m.res.changed === true && m.res.count === 6 && m.res.ids.join() === IDS(m.c).filter(id => NEWIDS.includes(id)).join() && NEWKEYS.every(k => after[k] === undefined) && Object.keys(after).sort().join() === left.slice().sort().join(), { res: m.res, kept: Object.keys(after) }] })
  await TT('A2', 'points the learner has rated are left exactly as they are: HARD, OK, EASY (known), the v774 rated one (interval, no ratedAt) and the one known after 3 sentences in 2 tracks — same fields, same values',
    async () => { const m = await mixRun(); if (!m.res) return [false, MISSING('jaGrammarStartFromScratch')]
      const after = rawKS(m.c), ks = ['san', 'wo', 'ni', 'no', 'desu'].map(id => 'buildingBlock:' + id)
      return [m.res.changed === true && ks.every(k => !!after[k] && same(after[k], MIX[k])) && after['buildingBlock:ni'].knownAt && after['buildingBlock:desu'].sightings === 3, ks.filter(k => !after[k] || !same(after[k], MIX[k]))] })
  await TT('A3', 'conversation basics are NOT touched (introduced and unrated ones, a rated one, a reaction word), nor a point only seen in passing (never introduced), nor a record that is not in the curriculum',
    async () => { const m = await mixRun(); if (!m.res) return [false, MISSING('jaGrammarStartFromScratch')]
      const after = rawKS(m.c), ks = ['conversationBasic:konnichiwa', 'conversationBasic:un', 'conversationBasic:nee', 'conversationBasic:matane', 'buildingBlock:janai', 'buildingBlock:zzz-old']
      return [m.res.changed === true && ks.every(k => !!after[k] && same(after[k], MIX[k])), ks.filter(k => !after[k] || !same(after[k], MIX[k]))] })
  await TT('A4', 'words, tracks, the speech style, today\'s new-word places, the Thai / Mandarin / Cantonese stores and the migration marker are byte-for-byte what they were; the only new thing in storage is the backup',
    async () => { const m = await mixRun(); if (!m.res) return [false, MISSING('jaGrammarStartFromScratch')]
      const b = m.snapBefore, a = m.snapAfter, changed = Object.keys(b).filter(k => k !== KS && a[k] !== b[k]), added = Object.keys(a).filter(k => !(k in b))
      return [m.res.changed === true && changed.length === 0 && added.join() === BKEY && Object.keys(EXTRA).every(k => a[k] === b[k]) && a[MIGK] === b[MIGK], { changed, added }] })
  await TT('A5', 'afterwards a reset point is in the blank state: jaGrammarGet gives the blank record, it is not introduced, not due, not NEW, and its sightings and sightingTracks are gone with the record',
    async () => { const m = await mixRun(); if (!m.res) return [false, MISSING('jaGrammarStartFromScratch')]
      const st = rawKS(m.c), slots = m.c.jaGrammarSlots(st), due = m.c.jaGrammarDue(st, 'buildingBlock', '2099-01-01').map(r => r.itemId), intro = m.c.jaGrammarIntroducedIds(st)
      const blank = NEWIDS.every(id => same(m.c.jaGrammarGet(st, 'buildingBlock', id), m.c.jaNewProgressRecord('buildingBlock', id)) && !m.c.jaGrammarGet(st, 'buildingBlock', id).introducedAt && !m.c.jaGrammarGet(st, 'buildingBlock', id).sightings)
      return [blank && slots.newCount === 0 && slots.free === 5 && !NEWIDS.some(id => due.includes(id) || intro.includes(id)) && !Object.values(st).some(r => NEWIDS.includes(r.itemId) && r.type === 'buildingBlock'), { slots, due, intro }] })
  await TT('A6', 'the planner is pure and agrees with the reset: it names the same 6 points (curriculum order) and hands back exact copies of their records, and changes nothing',
    async () => { const c = fresh(); if (!has(c, 'jaGrammarResetPlan')) return [false, MISSING('jaGrammarResetPlan')]
      const st = clone(MIX), snapSt = JSON.stringify(st), p = c.jaGrammarResetPlan(st)
      return [p.ids.join() === IDS(c).filter(id => NEWIDS.includes(id)).join() && p.keys.join() === p.ids.map(id => 'buildingBlock:' + id).join() && p.ids.every(id => same(p.records['buildingBlock:' + id], MIX['buildingBlock:' + id])) && JSON.stringify(st) === snapSt && p.records['buildingBlock:wa'] !== st['buildingBlock:wa'], p] })

  // ═══ B — BACKUP AND UNDO ═════════════════════════════════════════════════════════════════════════════════════════════════════════
  await TT('B1', 'the backup is saved BEFORE anything is removed (the backup write comes first, and is already in storage when the grammar store is rewritten) and holds the exact records that are about to go, with how many and when',
    async () => { const c = await ctxWith(MIX), log = [], orig = c.stSet
      c.stSet = async (k, v) => { log.push({ k, backupThere: c.localStorage.getItem(BKEY) != null, n: k === KS ? Object.keys(v || {}).length : null }); return orig(k, v) }
      const res = await startOf(c); if (!res) return [false, MISSING('jaGrammarStartFromScratch')]
      const iB = log.findIndex(x => x.k === BKEY), iK = log.findIndex(x => x.k === KS && x.n < Object.keys(MIX).length), b = rawB(c)
      return [res.changed === true && iB >= 0 && iK > iB && log[iK].backupThere && !!b && b.count === 6 && typeof b.at === 'string' && !isNaN(Date.parse(b.at)) && b.ids.join() === res.ids.join() && NEWKEYS.every(k => same(b.records[k], MIX[k])) && Object.keys(b.records).length === 6, { writes: log.map(x => x.k + (x.n != null ? ':' + x.n : '')), b: b && { count: b.count, at: b.at } }] })
  await TT('B2', 'a second reset when nothing is NEW changes nothing and does NOT overwrite the backup: everything stored is byte-for-byte the same, the backup is the first one',
    async () => { const c = await ctxWith(MIX, { extra: EXTRA }); const r1 = await startOf(c); if (!r1) return [false, MISSING('jaGrammarStartFromScratch')]
      const s1 = snap(c), r2 = await startOf(c), s2 = snap(c)
      return [r1.changed === true && r2 && r2.changed === false && r2.count === 0 && same(s1, s2) && rawB(c).count === 6 && s2[BKEY] === s1[BKEY], { r2, differs: Object.keys(s2).filter(k => s1[k] !== s2[k]) }] })
  await TT('B3', 'a reset when nothing is NEW and there is no backup yet stores nothing at all (no backup, no marker, the same store)',
    async () => { const st = {}; ;['san', 'wo'].forEach(id => { st['buildingBlock:' + id] = MIX['buildingBlock:' + id] }); st['conversationBasic:un'] = MIX['conversationBasic:un']
      const c = await ctxWith(st, { extra: EXTRA, marker: false }), s1 = snap(c), r = await startOf(c); if (!r) return [false, MISSING('jaGrammarStartFromScratch')]
      return [r.changed === false && same(snap(c), s1) && c.localStorage.getItem(BKEY) == null && c.localStorage.getItem(MIGK) == null, { r }] })
  await TT('B4', 'the backup is kept until the NEXT reset that actually changes something, which then replaces it (a different set of points, so the old copy is gone — the undo is always of the latest reset)',
    async () => { const c = await ctxWith(MIX); const r1 = await startOf(c); if (!r1) return [false, MISSING('jaGrammarStartFromScratch')]
      const st = await c.jaGrammarLoad(); c.jaGrammarIntroduce(st, 'buildingBlock', 'de', '2026-11-25'); c.jaGrammarIntroduce(st, 'buildingBlock', 'ga', '2026-11-25'); await c.jaGrammarSave(st)
      const r2 = await startOf(c), b = rawB(c)
      return [r1.changed && r2.changed === true && r2.count === 2 && b.count === 2 && b.ids.join() === 'de,ga' && Object.keys(b.records).join() === 'buildingBlock:de,buildingBlock:ga', { r2, b: b && b.ids }] })
  await TT('B5', 'Undo restores exactly the removed records (same fields, same values, all 6), reports 6 restored and 0 skipped, then clears the backup; the stored grammar is the original again',
    async () => { const c = await ctxWith(MIX, { extra: EXTRA }); const s0 = snap(c), r1 = await startOf(c); if (!r1) return [false, MISSING('jaGrammarStartFromScratch')]
      const u = await undoOf(c); if (!u) return [false, MISSING('jaGrammarUndoReset')]
      const a = snap(c), after = rawKS(c)
      return [u.restored === 6 && u.skipped === 0 && same(after, MIX) && rawB(c) == null && Object.keys(a).filter(k => ![KS, BKEY].includes(k)).every(k => a[k] === s0[k]) && c.jaGrammarSlots(after).newCount === 6, { u, differs: Object.keys(MIX).filter(k => !after[k] || !same(after[k], MIX[k])) }] })
  await TT('B6', 'Undo does not overwrite anything rated or introduced since the reset: a point that has a record now (one introduced and rated OK, one seen in passing) keeps its current record and is skipped, the other 4 come back exactly, and the result says 4 restored, 2 skipped',
    async () => { const c = await ctxWith(MIX); const r1 = await startOf(c); if (!r1) return [false, MISSING('jaGrammarStartFromScratch')]
      const st = await c.jaGrammarLoad(); c.jaGrammarIntroduce(st, 'buildingBlock', 'wa', '2026-11-25'); c.jaGrammarApplyRating(st, 'buildingBlock', 'wa', 'ok')
      st['buildingBlock:ka'] = { ...c.jaNewProgressRecord('buildingBlock', 'ka'), seenInPassing: 1, lastPassing: '2026-11-25' }; await c.jaGrammarSave(st)
      const cur = clone(rawKS(c)), u = await undoOf(c); if (!u) return [false, MISSING('jaGrammarUndoReset')]
      const after = rawKS(c)
      return [u.restored === 4 && u.skipped === 2 && u.skippedIds.join() === 'wa,ka' && same(after['buildingBlock:wa'], cur['buildingBlock:wa']) && after['buildingBlock:wa'].interval === 2 && same(after['buildingBlock:ka'], cur['buildingBlock:ka']) &&
        ['ne', 'yo', 'da', 'plain-present'].every(id => same(after['buildingBlock:' + id], MIX['buildingBlock:' + id])) && rawB(c) == null, { u }] })
  await TT('B7', 'Undo with no backup changes nothing and says so (no backup is made up, no error)',
    async () => { const c = await ctxWith(MIX, { extra: EXTRA }), s0 = snap(c), u = await undoOf(c); if (!u) return [false, MISSING('jaGrammarUndoReset')]
      return [u.changed === false && u.restored === 0 && u.skipped === 0 && same(snap(c), s0), { u }] })
  await TT('B8', 'a reset never removes a record it could not back up: when the backup does not reach storage (silently dropped, or the write fails) the reset stops, reports it, and the stored grammar is untouched',
    async () => { const res = []
      for (const mode of ['drop', 'throw']) { const c = await ctxWith(MIX, { extra: EXTRA }), s0 = snap(c), orig = c.stSet
        c.stSet = async (k, v) => { if (k === BKEY) { if (mode === 'throw') throw new Error('disk full'); return } return orig(k, v) }
        const r = await startOf(c); if (!r) return [false, MISSING('jaGrammarStartFromScratch')]
        res.push({ mode, changed: r.changed, same: same(snap(c), s0), reason: r.reason }) }
      return [res.every(x => x.changed === false && x.same && !!x.reason), res] })
  await TT('B9', 'reset switch OFF: the reset does nothing and stores nothing, and the undo does nothing (nothing is stored, nothing is read back)',
    async () => { const c = await ctxWith(MIX, { extra: EXTRA }); if (!has(c, 'jaGrammarResetSetEnabled')) return [false, MISSING('jaGrammarResetSetEnabled')]
      c.jaGrammarResetSetEnabled(false); const s0 = snap(c), r = await startOf(c), u = await undoOf(c)
      return [r && r.changed === false && u && u.changed === false && same(snap(c), s0) && c.localStorage.getItem(BKEY) == null && c.jaGrammarResetOn() === false, { r, u }] })

  // ═══ C — ONE WAY: NOTHING COMES BACK ═════════════════════════════════════════════════════════════════════════════════════════════
  const L32 = learner32(fresh())
  await TT('C1', 'load, reset, reload: with the migration marker already done the reloaded application starts with no reset point (the first-run migration does not run again), the Words list and the plan agree, and the backup is still there',
    async () => { const c = await ctxWith(L32.store); const r = await startOf(c); if (!r) return [false, MISSING('jaGrammarStartFromScratch')]
      const c2 = reload(c), vocab = learner(c2, 150), mg = await c2.jaGrammarMigrateV1(vocab), st = await c2.jaGrammarLoad(), plan = planOf(c2, st, 150)
      return [r.changed && r.count === 32 && mg.already === true && mg.changes === 0 && c2.jaGrammarIntroducedIds(st).length === 0 && plan.introducedCount === 0 && plan.stillNew.length === 0 && rawB(c2) && rawB(c2).count === 32, { mg: { already: mg.already, changes: mg.changes }, intro: c2.jaGrammarIntroducedIds(st).length }] })
  await TT('C2', 'the same with NO migration marker stored (the reset marks the first-run migration as done, so a reload cannot seed the points again — which a learner of 150 known words would otherwise get: 15 grammar points and 4 basics)',
    async () => { const c = await ctxWith(L32.store, { marker: false }); const r = await startOf(c); if (!r) return [false, MISSING('jaGrammarStartFromScratch')]
      const marker = JSON.parse(c.localStorage.getItem(MIGK) || '{}')[MIGID], c2 = reload(c), mg = await c2.jaGrammarMigrateV1(learner(c2, 150)), st = rawKS(c2)
      // the control: the very same stored learner WITHOUT the reset is seeded again by the migration, so the marker is what holds it back
      const cc = await ctxWith({}, { marker: false }), mg0 = await cc.jaGrammarMigrateV1(learner(cc, 150))
      return [marker && marker.status === 'done' && mg.already === true && mg.changes === 0 && Object.keys(st).filter(k => k.startsWith('buildingBlock:')).length === 0 && mg0.changes === 19, { marker, mg: { already: mg.already, changes: mg.changes }, control: mg0.changes }] })
  await TT('C3', 'a later track does not bring them back: the real finaliser introduces only what the normal picker chooses (at most 5, the ones the sentences use), and none of the other reset points returns',
    async () => { const c = await ctxWith(L32.store); const r = await startOf(c); if (!r) return [false, MISSING('jaGrammarStartFromScratch')]
      const vocab = L32.vocab, gate = c.jaGrammarGateContext(vocab, rawKS(c), { register: 'natural', today: TODAY })
      const fin = await c.jaGrammarFinaliseTrack(trackOf('2026-11-24T08:00:00.000Z', { trackContext: { trackId: '2026-11-24T08:00:00.000Z', language: 'ja', grammarGate: gate } }), { vocab, today: TODAY })
      const st = rawKS(c), introduced = c.jaGrammarIntroducedIds(st), g = fin.grammarInTrack
      return [introduced.length === g.new.length && introduced.length > 0 && introduced.length <= 5 && introduced.every(id => ids(g.new).includes(id)) && g.slots.before === 0 && g.budget.spent <= 5, { introduced, new: ids(g.new) }] })
  await TT('C4', 'the plan screen does not bring them back: after a reset and a reload (no marker written by the test), mounting the real Japanese generator (which runs the first-run migration) leaves the store without the points and shows the next 5 new points',
    async () => { const c = await ctxWith(L32.store, { marker: false }); const r = await startOf(c); if (!r) return [false, MISSING('jaGrammarStartFromScratch')]
      const c2 = reload(c), ps = await planScreen(c2, learner(c2, 150), null, false), st = rawKS(c2)
      await unmount(ps.R)
      return [Object.keys(st).filter(k => k.startsWith('buildingBlock:')).length === 0 && /Next new points/.test(ps.text) && !/Still NEW/.test(ps.text) && ['は', 'か', 'ね', 'よ', 'だ'].every(l => ps.text.includes(l)), { stored: Object.keys(st), text: ps.text.slice(0, 300) }] })
  await TT('C5', 'the backup survives a reload and the undo works from the reloaded application (the exact records come back)',
    async () => { const c = await ctxWith(L32.store); const r = await startOf(c); if (!r) return [false, MISSING('jaGrammarStartFromScratch')]
      const c2 = reload(c), b = await c2.jaGrammarResetBackupLoad(), u = await undoOf(c2), st = rawKS(c2)
      return [!!b && b.count === 32 && u.restored === 32 && u.skipped === 0 && same(st, L32.store) && rawB(c2) == null, { u, b: b && b.count }] })

  // ═══ D — THE NEXT TRACK, ON THE REAL LEARNER'S STATE ═════════════════════════════════════════════════════════════════════════════
  let AF = null
  const afterReset = async () => { if (AF) return AF; const c = await ctxWith(L32.store, { extra: EXTRA }), res = await startOf(c); return (AF = { c, res, st: res ? rawKS(c) : null }) }
  const gateOf = (c, st, register) => c.jaGrammarGateContext(L32.vocab, st, { register: register || 'natural', today: TODAY })
  const FIRST5 = ['wa', 'ka', 'ne', 'yo', 'da']
  await TT('D1', 'the fixture is the real learner (v775 as it stands today): 32 grammar points introduced and never rated, 6 conversation basics, 150 known words — all 32 count as NEW, no slot is free, nothing new is planned, and the stage is "broad"',
    async () => { const c = await ctxWith(L32.store), st = rawKS(c), slots = c.jaGrammarSlots(st), plan = planOf(c, st, 150), gate = gateOf(c, st)
      return [c.jaGrammarKnownCount(L32.vocab) === 150 && Object.keys(st).filter(k => k.startsWith('buildingBlock:')).length === 32 && Object.keys(st).filter(k => k.startsWith('conversationBasic:')).length === 6 && newCountOf(st) === 32 && slots.newCount === 32 && slots.free === 0 &&
        plan.next.length === 0 && plan.stillNew.length === 32 && gate.plannedIds.length === 0 && gate.introducedCount === 32 && gate.ceilings.name === 'broad', { slots: { n: slots.newCount, free: slots.free }, planned: gate.plannedIds, stage: gate.ceilings }] })
  await TT('D2', 'after the reset the learner has the 6 conversation basics and nothing else in the grammar store: the 32 points are gone (and the reset says 32)',
    async () => { const a = await afterReset(); if (!a.res) return [false, MISSING('jaGrammarStartFromScratch')]
      return [a.res.changed && a.res.count === 32 && Object.keys(a.st).sort().join() === Object.keys(L32.store).filter(k => k.startsWith('conversationBasic:')).sort().join() && Object.keys(a.st).every(k => same(a.st[k], L32.store[k])), { res: a.res.count, keys: Object.keys(a.st) }] })
  await TT('D3', 'the next track starts like a brand-new grammar learner: introducedCount 0, stage "first steps" (sentences up to 12 characters, 2 new points at most per sentence), the free core allowed from day one (17 points), and 5 new points planned under the same rules (unlock level, prerequisites, cost budget 5) — the first five in curriculum order',
    async () => { const a = await afterReset(); if (!a.res) return [false, MISSING('jaGrammarStartFromScratch')]
      const g = gateOf(a.c, a.st), want = refNext(a.c, a.st, 150, 5)
      return [g.introducedCount === 0 && g.introducedIds.length === 0 && g.ceilings.name === 'first steps' && g.ceilings.maxChars === 12 && g.ceilings.maxGated === 2 && g.coreIds.length === 17 && g.coreIds.join() === a.c.jaGrammarCoreIds('natural').join() &&
        g.plannedIds.join() === want.join() && want.join() === FIRST5.join() && g.budget.spent === 5 && g.budget.limit === 5 && g.held === false && g.slots.free === 5 && g.slots.newCount === 0 && (g.stillNewIds || []).length === 0, g] })
  await TT('D4', 'the plan function agrees (the one the picker, the prompt and the preview share): next = the first 5 points, nothing carried, nothing due, 5 slots free, the cost budget is 5 of 5; and with fewer known words only what is unlocked is offered',
    async () => { const a = await afterReset(); if (!a.res) return [false, MISSING('jaGrammarStartFromScratch')]
      const p = planOf(a.c, a.st, 150), p0 = planOf(a.c, a.st, 0), p3 = planOf(a.c, a.st, 3)
      return [ids(p.next).join() === FIRST5.join() && p.introducedCount === 0 && p.stillNew.length === 0 && p.review.length === 0 && p.slots.free === 5 && p.budget.spent === 5 && ids(p0.next).join() === refNext(a.c, a.st, 0, 5).join() && ids(p3.next).join() === refNext(a.c, a.st, 3, 5).join() && p0.next.every(x => x.minKnown === 0), { p: ids(p.next), p0: ids(p0.next) }] })
  await TT('D5', 'the writer\'s prompt says nothing is taught yet beyond the free list: "TAUGHT ALREADY (allowed): nothing yet beyond the free list", the free list, the 5 planned points under NEW THIS TRACK (none marked "still new"), and the first-steps stage (0 points taught, at most 12 characters)',
    async () => { const a = await afterReset(); if (!a.res) return [false, MISSING('jaGrammarStartFromScratch')]
      const g = gateOf(a.c, a.st), t = a.c.jaGrammarGatePromptBlock(g), lab = id => entry(a.c, id).label + ' (' + entry(a.c, id).meaning + ')'
      return [t.includes('TAUGHT ALREADY (allowed): nothing yet beyond the free list') && t.includes('FREE from day one: ' + a.c.ev('JA_GATE_FREE_TEXT')) && t.includes('NEW THIS TRACK (also allowed, where a sentence naturally calls for them): ' + FIRST5.map(lab).join(' · ')) &&
        !/still new/.test(t) && /STAGE — first steps: this learner has been taught 0 grammar points so far, so keep every sentence short: at most 12 characters \(punctuation not counted\), and at most 2 grammar points that are not FREE/.test(t), t] })
  await TT('D6', 'the preview on the plan screen ("Grammar for this track"): nothing due, no "Still NEW" block, the 5 new points with their romaji, and the stage line "first steps (0 points taught)"',
    async () => { const a = await afterReset(); if (!a.res) return [false, MISSING('jaGrammarStartFromScratch')]
      const R = await mount(a.c, React.createElement(a.c.JaGrammarPreview, { vocab: L32.vocab, store: clone(a.st) }), 4), t = ws(textOf(R.toJSON()))
      const next = R.root.findAll(x => x.props && typeof x.props['data-preview-next'] === 'string').map(x => x.props['data-preview-next']), still = R.root.findAll(x => x.props && x.props['data-preview-still-new-block'] === '1').length
      await unmount(R)
      return [next.join() === FIRST5.join() && still === 0 && /Due for review nothing is due/.test(t) && /Stage: first steps \( ?0 points taught\): sentences up to 12 characters, at most 2 new points in one sentence/.test(t) && !/No new points/.test(t) && t.includes('wa') && t.includes('topic marker'), { next, still, t: t.slice(0, 400) }] })
  await TT('D7', 'rating the 5 new points frees the slots (the slot arithmetic of tests114 on the reset learner): 5 introduced and 5 rated → the next plan brings the next 5; 2 rated → 2; none rated → none and all 5 carried; 0 to 5 rated bring exactly that many',
    async () => { const a = await afterReset(); if (!a.res) return [false, MISSING('jaGrammarStartFromScratch')]
      const c = a.c, rows = []
      for (let k = 0; k <= 5; k++) { const st = clone(a.st); FIRST5.forEach(id => { st['buildingBlock:' + id] = V774REC(id) }); FIRST5.slice(0, k).forEach(id => c.jaGrammarApplyRating(st, 'buildingBlock', id, 'ok'))
        const p = planOf(c, st, 150); rows.push({ k, next: ids(p.next), still: ids(p.stillNew), want: refNext(c, st, 150, k), free: p.slots.free }) }
      return [rows.every(r => r.next.length === r.k && r.next.join() === r.want.join() && r.free === r.k && r.still.join() === FIRST5.slice(r.k).join()) && rows[5].next.join() === 'plain-present,san,wo,ni,no' && rows[5].next.every(id => !FIRST5.includes(id)) && rows[0].next.length === 0, rows] })
  await TT('D8', 'the real plan screen (the Japanese generator, which runs the first-run migration on opening) after the reset and a reload: the next 5 new points, no "Still NEW" block, no 32, the first-steps stage',
    async () => { const a = await afterReset(); if (!a.res) return [false, MISSING('jaGrammarStartFromScratch')]
      const c2 = reload(a.c), ps = await planScreen(c2, learner(c2, 150), null, false); await unmount(ps.R)
      return [/Grammar for this track/.test(ps.text) && /Next new points 5 of 5 points/.test(ps.text) && !/Still NEW/.test(ps.text) && !/\b32\b/.test(ps.text) && /Stage: first steps \( ?0 points taught\)/.test(ps.text), ps.text.slice(0, 600)] })
  await TT('D9', 'a real generation after the reset (the real generator and picker, only the model transport scripted): the track context carries introducedCount 0, "first steps" and the 5 planned points; the writer is told "nothing yet beyond the free list"; the track still has 5 targets x 3 = 15 target pairs',
    async () => { const S = setup('ja'); quiet(S.c); const c = S.c
      await c.stSet(MIGK, DONE); await c.stSet(KS, clone(L32.store)); await c.jaGrammarLoad(); const r = await startOf(c); if (!r) return [false, MISSING('jaGrammarStartFromScratch')]
      mock(S, 'ja'); const prompts = [], og = c.geminiRequest; c.geminiRequest = async o => { prompts.push((o.messages || []).map(m => m.content).join('\n')); return og(o) }
      const tc = c.jaGeneratorTrackContext(S.targets.slice(0, 5).map(t => ({ ...t, selectionRole: 'review' })), { counts: { new: 0 } }, 'daily', 'natural', c.aiBeginRun('ja-track'))
      const res = await c.generateJapaneseTrack(S.targets.slice(0, 5), S.vocab, 'natural', KEY, MODEL, () => {}, () => {}, { cancelled: false }, { scene: 'Two friends at a station', characterA: 'Kenji, a man', characterB: 'Yuki, a woman', opening: '', reply: '', closing: '', closing_reply: '' }, { trackContext: tc, runId: tc.generationRunId })
      const g = tc.grammarGate, tp = res.pairs.filter(p => p.isTargetPair)
      return [res.complete && tp.length === 15 && !!g && g.introducedCount === 0 && g.ceilings.name === 'first steps' && g.plannedIds.join() === FIRST5.join() && prompts.length > 0 && prompts.some(p => /TAUGHT ALREADY \(allowed\): nothing yet beyond the free list/.test(p)) && prompts.some(p => /STAGE — first steps/.test(p)),
        { complete: res.complete, tp: tp.length, g: g && { n: g.introducedCount, stage: g.ceilings.name, planned: g.plannedIds }, prompts: prompts.length }] })
  if (AF && AF.res) info('AFTER THE RESET (32-point fixture, 150 known words): reset ' + AF.res.count + ' points · introduced 0 · stage "first steps" (12 characters) · planned ' + gateOf(AF.c, AF.st).plannedIds.map(id => entry(AF.c, id).label).join(' ') + ' · 5 of 5 slots free · TAUGHT ALREADY: nothing yet beyond the free list')

  // ═══ E — THE SCREEN ══════════════════════════════════════════════════════════════════════════════════════════════════════════════
  const areaOf = R => R.root.findAll(x => x.props && x.props['data-ja-grammar-review-area'] === '1')[0]
  const areaText = R => { const a = areaOf(R); return a ? tx(a) : '' }
  const abtn = (R, text) => { const a = areaOf(R); return a && a.findAll(x => x.type === 'button' && tx(x) === text && typeof x.props.onClick === 'function')[0] }
  const START = 'Start grammar from scratch', YES = 'Yes, start from scratch', CANCEL = 'Cancel', UNDO = 'Undo'
  const jaScreen = async (store, o) => { const c = await ctxWith(store, { extra: EXTRA, ...(o || {}) }); let calls = 0; c.confirm = () => { calls++; return true }
    const R = await wordsList(c, 'ja', true); return { c, R, confirmCalls: () => calls } }
  await TT('E1', 'the Grammar review part of the Japanese Words list has a "Start grammar from scratch" button',
    async () => { const s = await jaScreen(L32.store); const ok = !!abtn(s.R, START), t = areaText(s.R).slice(0, 300); await unmount(s.R); return [ok, t] })
  await TT('E2', 'it asks first, in plain words: the grammar points you have never rated go back to "not taught yet"; points you have rated, your words and your tracks are not touched; you can undo it — and nothing is changed or stored until you confirm; Cancel puts it away',
    async () => { const s = await jaScreen(L32.store), s0 = snap(s.c); if (!abtn(s.R, START)) { await unmount(s.R); return [false, 'no "' + START + '" button'] }
      await click(abtn(s.R, START)); const t = areaText(s.R), ask = { yes: !!abtn(s.R, YES), cancel: !!abtn(s.R, CANCEL), unchanged: same(snap(s.c), s0) }
      await click(abtn(s.R, CANCEL)); const t2 = areaText(s.R), back = { start: !!abtn(s.R, START), noYes: !abtn(s.R, YES), unchanged: same(snap(s.c), s0) }; await unmount(s.R)
      return [/32 grammar points you have never rated go back to .{0,2}not taught yet/.test(t) && /Points you have rated, your words and your tracks are not touched/.test(t) && /You can undo/.test(t) && ask.yes && ask.cancel && ask.unchanged && back.start && back.noYes && back.unchanged && !/never rated go back/.test(t2), { ask, back, t: t.slice(0, 500) }] })
  await TT('E3', 'confirming resets: the stored grammar has no NEW point, the backup holds the 32, the Undo control says how many points were reset and when ("32 grammar points were reset on 24 Nov, 09:30"), and the list is empty; the screen never used window.confirm',
    async () => { const s = await jaScreen(L32.store); if (!abtn(s.R, START)) { await unmount(s.R); return [false, 'no "' + START + '" button'] }
      await click(abtn(s.R, START)); await click(abtn(s.R, YES)); const t = areaText(s.R), st = rawKS(s.c), b = rawB(s.c); await unmount(s.R)
      return [Object.keys(st).filter(k => k.startsWith('buildingBlock:')).length === 0 && !!b && b.count === 32 && /32 grammar points were reset on \d{1,2} [A-Z][a-z]{2}/.test(t) && !!/Undo/.test(t) && /nothing to review/i.test(t) && s.confirmCalls() === 0, { t: t.slice(0, 500), confirmCalls: s.confirmCalls() }] })
  await TT('E4', 'Undo on the screen puts the exact records back (same fields, same values), clears the backup, says "Put back 32 grammar points.", and the Undo control goes away; the list shows the 32 again',
    async () => { const s = await jaScreen(L32.store); if (!abtn(s.R, START)) { await unmount(s.R); return [false, 'no "' + START + '" button'] }
      await click(abtn(s.R, START)); await click(abtn(s.R, YES)); if (!abtn(s.R, UNDO)) { await unmount(s.R); return [false, 'no Undo button after the reset'] }
      await click(abtn(s.R, UNDO)); const t = areaText(s.R), st = rawKS(s.c), noUndo = !abtn(s.R, UNDO); await unmount(s.R)
      return [same(st, L32.store) && rawB(s.c) == null && /Put back 32 grammar points/.test(t) && noUndo && /32 new, not rated/.test(t) && s.confirmCalls() === 0, { t: t.slice(0, 400) }] })
  await TT('E5', 'pressing it again when nothing is NEW: the screen says there is nothing to reset, offers no confirm button, and the stored backup is the first one, byte for byte (an empty reset cannot destroy the chance to undo)',
    async () => { const s = await jaScreen(L32.store); if (!abtn(s.R, START)) { await unmount(s.R); return [false, 'no "' + START + '" button'] }
      await click(abtn(s.R, START)); await click(abtn(s.R, YES)); const s1 = snap(s.c)
      await click(abtn(s.R, START)); const t = areaText(s.R), noYes = !abtn(s.R, YES); const s2 = snap(s.c); await unmount(s.R)
      return [/nothing to reset/i.test(t) && noYes && same(s1, s2) && s2[BKEY] === s1[BKEY] && rawB(s.c).count === 32, { t: t.slice(0, 400) }] })
  await TT('E6', 'Undo after something changed since the reset: a point rated since is kept as it is, the screen says "Put back 31 grammar points" and "Skipped 1"',
    async () => { const s = await jaScreen(L32.store); if (!abtn(s.R, START)) { await unmount(s.R); return [false, 'no "' + START + '" button'] }
      await click(abtn(s.R, START)); await click(abtn(s.R, YES))
      const st = await s.c.jaGrammarLoad(); s.c.jaGrammarIntroduce(st, 'buildingBlock', 'wa', '2026-11-25'); s.c.jaGrammarApplyRating(st, 'buildingBlock', 'wa', 'ok'); await s.c.jaGrammarSave(st)
      await click(abtn(s.R, UNDO)); const t = areaText(s.R), after = rawKS(s.c); await unmount(s.R)
      return [/Put back 31 grammar points/.test(t) && /Skipped 1/.test(t) && after['buildingBlock:wa'].interval === 2 && Object.keys(after).filter(k => k.startsWith('buildingBlock:')).length === 32, { t: t.slice(0, 400) }] })
  await TT('E7', 'reset switch OFF: no button and no Undo on the screen — also when a backup is in storage — and the Words list is the v775 one',
    async () => { const bk = { version: 1, at: '2026-11-24T09:30:00.000Z', count: 2, ids: ['wa', 'ka'], records: { 'buildingBlock:wa': MIGREC('wa'), 'buildingBlock:ka': MIGREC('ka') } }
      const c = await ctxWith(L32.store, { extra: { ...EXTRA, [BKEY]: bk }, setup: cc => has(cc, 'jaGrammarResetSetEnabled') && cc.jaGrammarResetSetEnabled(false) })
      const R = await wordsList(c, 'ja', true), t = areaText(R); await unmount(R)
      return [has(c, 'jaGrammarResetOn') && c.jaGrammarResetOn() === false && !/Start grammar from scratch|Undo|reset on/.test(t) && /Grammar review/.test(t), t.slice(0, 300)] })
  await TT('E8', 'Thai, Mandarin and Cantonese Words lists show none of it (no button, no Undo, no Grammar review part), even with the 32 points and a backup in the grammar store',
    async () => { const res = {}
      for (const lang of ['th', 'zh', 'yue']) { const c = await ctxWith(L32.store, { extra: { ...EXTRA, [BKEY]: { version: 1, at: '2026-11-24T09:30:00.000Z', count: 1, ids: ['wa'], records: { 'buildingBlock:wa': MIGREC('wa') } } } })
        const bank = lang === 'th' ? c.initVocab().slice(0, 12) : lang === 'zh' ? c.initMandarinVocab().slice(0, 12) : c.initCantoneseVocab().slice(0, 12)
        const R = await wordsList(c, lang, false, bank); const t = textOf(R.toJSON()); res[lang] = { area: R.root.findAll(x => x.props && x.props['data-ja-grammar-review-area']).length, text: /Start grammar from scratch|Undo|Grammar review|reset on/.test(t) }; await unmount(R) }
      return [Object.values(res).every(x => x.area === 0 && !x.text), res] })

  // ═══ F — THE WORDING ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
  const W32 = '32 points are waiting for a rating. No new grammar comes in until fewer than 5 are waiting.', PRACT = 'These are practised again in the next track until you rate them.'
  const stN = (c, N) => { const st = {}; IDS(c).slice(0, N).forEach(id => { st['buildingBlock:' + id] = V774REC(id) }); return st }
  const overLimit = t => [...String(t).matchAll(/(\d+) of (\d+)/g)].filter(m => +m[2] === 5 && +m[1] > 5).map(m => m[0])       // "N of 5" with N over 5
  const countOf = (t, s) => String(t).split(s).length - 1
  const screens = async (N, o) => {                                                                       // the three screens with N grammar points waiting (the first N of the curriculum), the two new switches as asked
    const opt = o || {}, c = setSw(fresh(), opt.reset !== false, opt.wording !== false), store = stN(c, N), vocab = learner(c, 150); await c.stSet(MIGK, DONE); await c.stSet(KS, clone(store)); await c.jaGrammarLoad()
    const Ra = await wordsList(c, 'ja', true), area = areaText(Ra); await unmount(Ra)
    const Rp = await mount(c, React.createElement(c.JaGrammarPreview, { vocab, store: clone(store) }), 4), preview = ws(textOf(Rp.toJSON())); await unmount(Rp)
    const gate = c.jaGrammarGateContext(vocab, clone(store), { register: 'natural', today: TODAY })
    const fin = await c.jaGrammarFinaliseTrack(trackOf('2026-11-24T08:00:00.000Z', { trackContext: { trackId: '2026-11-24T08:00:00.000Z', language: 'ja', grammarGate: gate } }), { vocab, today: TODAY })
    const Rt = await mount(c, React.createElement(c.JaGrammarInTrack, { track: fin }), 4), track = ws(textOf(Rt.toJSON())); await unmount(Rt)
    return { c, area, preview, track, fin, exp: o && o.exp ? exportText(c, fin) : '' } }
  const S32 = await screens(32), S3 = await screens(3), S5 = await screens(5), S1 = await screens(1)
  await TT('F1', 'Grammar review, 32 points waiting: "32 points are waiting for a rating. No new grammar comes in until fewer than 5 are waiting." and ONE line "These are practised again in the next track until you rate them." — the v775 line "At most 5 grammar points are NEW at once" is gone and no "N of 5" over 5 is shown',
    async () => [S32.area.includes(W32) && countOf(S32.area, PRACT) === 1 && !/At most 5 grammar points are NEW at once/.test(S32.area) && overLimit(S32.area).length === 0, { area: S32.area.slice(0, 500) }])
  await TT('F2', 'the preview, 32 points waiting: the same sentence in the "Still NEW" block, the "practised again" label is NOT repeated on every row (it is said once, in the line above the list), and no "32 of 5 slots"',
    async () => [S32.preview.includes(W32) && countOf(S32.preview, 'practised again') === 1 && countOf(S32.preview, PRACT) === 1 && !/32 of 5/.test(S32.preview) && overLimit(S32.preview).length === 0 && !/\d+ of 5 slots\b(?! free)/.test(S32.preview), { overLimit: overLimit(S32.preview), n: countOf(S32.preview, 'practised again') }])
  await TT('F3', 'the "Next new points" block, with no new points because the slots are full, says in ONE short sentence why and where to rate: "No new points this track, because 32 are waiting for a rating: rate them in Words, Grammar review, or on the card at the end of a track."',
    async () => { const want = 'No new points this track, because 32 are waiting for a rating: rate them in Words, Grammar review, or on the card at the end of a track.'
      return [S32.preview.includes(want) && !/Rate them to free the slots/.test(S32.preview) && !/are still NEW \(not rated\)/.test(S32.preview) && S5.preview.includes(want.replace('32', '5')), { sentence: (S32.preview.match(/No new points[^.]*\./) || [])[0] }] })
  await TT('F4', 'fewer than 5 waiting: "3 points waiting for your rating (up to 5 at a time)" (and "1 point waiting for your rating (up to 5 at a time)" for one); exactly 5: "5 points are waiting for a rating. No new grammar comes in until fewer than 5 are waiting."',
    async () => [S3.preview.includes('3 points waiting for your rating (up to 5 at a time)') && S3.area.includes('3 points waiting for your rating (up to 5 at a time)') && S1.preview.includes('1 point waiting for your rating (up to 5 at a time)') && S1.area.includes('1 point waiting for your rating (up to 5 at a time)') &&
      S5.preview.includes('5 points are waiting for a rating. No new grammar comes in until fewer than 5 are waiting.') && S5.area.includes('5 points are waiting for a rating. No new grammar comes in until fewer than 5 are waiting.') && countOf(S3.preview, 'practised again') === 1, { s3: S3.preview.slice(0, 500) }])
  await TT('F5', 'the track screen, 32 points waiting: "32 points were waiting for a rating before this track · 0 of 5 slots were free · 32 waiting now" (not "32 were NEW … 32 NEW now"), and a point seen in passing says "no free NEW slot: 32 points are waiting for a rating …" — never "32 of 5 are NEW"',
    async () => { const why = S32.fin.grammarInTrack.passing.map(x => x.why || '').filter(w => /no free NEW slot/.test(w))
      return [S32.track.includes('32 points were waiting for a rating before this track · 0 of 5 slots were free · 32 waiting now') && !/32 NEW now|32 were NEW/.test(S32.track) && why.length > 0 && why.every(w => w.startsWith('no free NEW slot: 32 points are waiting for a rating')) && overLimit(S32.track).length === 0 && S32.track.includes(why[0]), { why: why.slice(0, 2), note: (S32.track.match(/STILL NEW[^]*?waiting now/) || [''])[0].slice(0, 200) }] })
  await TT('F6', 'what is not over the limit keeps its sentence: with 5 waiting and 2 more entries wanting a place, the passing reason is the one of v775 ("no free NEW slot: 5 of 5 are NEW (5 not rated yet)")',
    async () => { const why = S5.fin.grammarInTrack.passing.map(x => x.why || '').filter(w => /no free NEW slot/.test(w)); return [why.length > 0 && why.every(w => w === 'no free NEW slot: 5 of 5 are NEW (5 not rated yet)'), why.slice(0, 2)] })
  await TT('F7', 'over many states (0, 1, 2, 3, 4, 5, 6, 7, 12, 32, 40 points waiting) no preview, Grammar review part or track screen ever shows "N of 5" with N over 5',
    async () => { const bad = []
      for (const N of [0, 1, 2, 3, 4, 5, 6, 7, 12, 32, 40]) { const s = N === 32 ? S32 : N === 3 ? S3 : N === 5 ? S5 : N === 1 ? S1 : await screens(N); const o = overLimit(s.preview).concat(overLimit(s.area), overLimit(s.track)); if (o.length) bad.push(N + ': ' + o.join(' | ')) }
      return [bad.length === 0, bad] })
  await TT('F8', 'wording switch OFF: every string is the one of v775 — "32 of 5 slots", "practised again" on all 32 rows, "At most 5 grammar points are NEW at once…", "32 were NEW before this track · 0 of 5 slots were free · 32 NEW now", "no free NEW slot: 32 of 5 are NEW (32 not rated yet)"',
    async () => { const o = await screens(32, { wording: false }); const why = o.fin.grammarInTrack.passing.map(x => x.why || '').filter(w => /no free NEW slot/.test(w))
      return [o.preview.includes('Still NEW (not rated yet) 32 of 5 slots') && countOf(o.preview, 'practised again') === 33 &&      /* 32 rows + the sentence in the paragraph above */ o.preview.includes('No new points this track: 32 grammar points are still NEW (not rated). Rate them to free the slots: the card at the end of a track, or Words, Grammar review.') &&
        o.area.includes('At most 5 grammar points are NEW at once. A new track brings new points only as these are rated.') && !o.area.includes(W32) && o.track.includes('32 were NEW before this track · 0 of 5 slots were free · 32 NEW now') && why.length > 0 && why.every(w => w === 'no free NEW slot: 32 of 5 are NEW (32 not rated yet)'), { preview: o.preview.slice(200, 600), why: why.slice(0, 1) }] })
  await TT('F9', 'the export keeps its structure and its slot line (NEW SLOTS: … 0 of 5 slots free …); the new reason shows in the SEEN IN PASSING lines only when more than 5 are waiting',
    async () => { const o = await screens(32, { exp: true }), o3 = await screens(3, { exp: true })
      return [/\nNEW SLOTS: 32 points were still NEW \(not rated\) before this track, 0 of 5 slots free, 0 taught now, 32 NEW after it\. Rate them/.test(o.exp) && /\nSTILL NEW \(carried from earlier tracks, not rated yet/.test(o.exp) && /no free NEW slot: 32 points are waiting for a rating/.test(o.exp) && !/32 of 5/.test(o.exp) && /\nNEW SLOTS: 3 points were still NEW/.test(o3.exp), o.exp.split('\n').filter(l => /NEW SLOTS|no free NEW/.test(l)).slice(0, 3)] })

  // ═══ G — SAFETY AND SWITCHES ═════════════════════════════════════════════════════════════════════════════════════════════════════
  const V775 = JSON.parse(fs.readFileSync(__dirname + '/fixtures/ja-grammar-v775-reference.json', 'utf8'))
  await TT('G1', 'both new switches off: the Japanese Words list (Grammar review open and closed), the plan screen and its preview, the writer\'s prompt block, the gate context, the plan, the track summary, the export, GRAMMAR IN THIS TRACK and the rating card — for the 32-point learner, for 3 and 5 points waiting and for a blank store — and the Thai / Mandarin / Cantonese Words lists and generator screens are exactly what the unchanged v775 build produced',
    async () => { const now = await probe(), keys = Object.keys(V775).filter(k => k !== 'about'); return [keys.every(k => now[k] === V775[k]) && Object.keys(now).length === keys.length, keys.filter(k => now[k] !== V775[k]).map(k => k + ': now ' + now[k] + ' v775 ' + V775[k])] })
  await TT('G2', 'with both switches ON (as shipped): the Thai, Mandarin and Cantonese Words lists, the three generator screens, the Japanese generator and the Words list code are identical to v775 — nothing of this reaches another language',
    async () => { const c = await ctxWith(L32.store), got = {}
      const banks = { th: c.initVocab().slice(0, 12), zh: c.initMandarinVocab().slice(0, 12), yue: c.initCantoneseVocab().slice(0, 12) }
      for (const lang of ['th', 'zh', 'yue']) { const R = await wordsList(c, lang, false, banks[lang]); got['words_' + lang] = sha(textOf(R.toJSON())); await unmount(R) }
      got.gens = ['Generator', 'MandarinGenerator', 'CantoneseGenerator'].map(k => sha(c.ev('(' + k + ')').toString())).join('/'); got.jaGen = sha(c.ev('(JapaneseGenerator)').toString()); got.wordList = sha(c.ev('(WordListView)').toString())
      return [Object.keys(got).every(k => got[k] === V775[k]), Object.keys(got).filter(k => got[k] !== V775[k]).map(k => k + ': now ' + got[k] + ' v775 ' + V775[k])] })
  await TT('G3', 'each switch is its own: reset OFF + wording ON → the new wording and no button; reset ON + wording OFF → the button and the v775 strings; the data functions follow the reset switch only',
    async () => { const a = await screens(32, { reset: false }), b = await screens(32, { wording: false })
      const Ra = await wordsList(a.c, 'ja', true), ta = areaText(Ra); await unmount(Ra); const Rb = await wordsList(b.c, 'ja', true), tb = areaText(Rb), hasBtn = !!abtn(Rb, START); await unmount(Rb)
      return [ta.includes(W32) && !/Start grammar from scratch/.test(ta) && tb.includes('At most 5 grammar points are NEW at once') && hasBtn && a.c.jaGrammarClearWordingOn() === true && a.c.jaGrammarResetOn() === false && b.c.jaGrammarResetOn() === true && b.c.jaGrammarClearWordingOn() === false, { ta: ta.slice(0, 200), tb: tb.slice(0, 200) }] })
  const g4row = async doReset => { const c = await ctxWith(L32.store), vocab = L32.vocab; if (doReset) { const r = await startOf(c); if (!r) return { err: MISSING('jaGrammarStartFromScratch') } }
    const st = rawKS(c), gate = c.jaGrammarGateContext(vocab, st, { register: 'natural', today: TODAY }), inv0 = c.japaneseLearnerInventory(vocab, vocab.slice(0, 30)), before = FIXJ.map(l => JSON.stringify(c.japaneseCheckLine(l.ja, inv0)))
    const track = trackOf('2026-11-17T09:04:11.270Z', { trackContext: { trackId: '2026-11-17T09:04:11.270Z', language: 'ja', grammarGate: gate } }), sel0 = JSON.stringify(track.selectedTargetIds), kw0 = JSON.stringify(track.keywords), pairs0 = JSON.stringify(track.pairs), vocab0 = JSON.stringify(vocab)
    const fin = await c.jaGrammarFinaliseTrack(track, { vocab, today: TODAY }), inv1 = c.japaneseLearnerInventory(vocab, vocab.slice(0, 30)), after = FIXJ.map(l => JSON.stringify(c.japaneseCheckLine(l.ja, inv1)))
    return { doReset, ok: JSON.stringify(fin.selectedTargetIds) === sel0 && JSON.stringify(fin.keywords) === kw0 && JSON.stringify(fin.pairs) === pairs0 && fin.pairs.filter(p => c.jaGrammarIsTargetPair(p)).length === 90 && fin.keywords.length === 30 && JSON.stringify(before) === JSON.stringify(after) && JSON.stringify(vocab) === vocab0 && (await c.stGet('tt-ja-vocab')) == null } }
  await TT('G4', 'grammar never changes the 30 target words, the 90 target pairs or the closed-vocabulary check — with the 32 points waiting: the same words and ids, the same 99 pairs (90 target pairs), the same verdicts on all 99 lines before and after, the same vocabulary',
    async () => { const r = await g4row(false); return [r.ok, r] })
  await TT('G4b', 'the same after the reset (the next track is a first-steps track): the same words and ids, the same 99 pairs (90 target pairs), the same verdicts on all 99 lines, the same vocabulary',
    async () => { const r = await g4row(true); return [r.ok, r] })
  await TT('G5', 'the new code is marked (v776) and holds no key, no token, no access code and no model name',
    async () => { const a = SRC.indexOf('v776 — START GRAMMAR FROM SCRATCH'), b = SRC.indexOf('end of the v776 block'), block = a > 0 && b > a ? SRC.slice(a, b) + SRC.split('\n').filter(l => l.length < 2000 && /v776/.test(l)).join('\n')       /* a 1.4 MB data line of the file happens to contain the letters v776 inside its encoded text: it is not code of this change */ : ''
      return [a > 0 && b > a && block.length > 500 && !/AIza[0-9A-Za-z_-]{20,}|sk-ant-|access[ _-]?code|claude|gemini|sonnet|opus|haiku/i.test(block), { a, b, len: block.length }] })
  out.forEach(l => console.log(l))
  console.log('\n' + (n - fails) + '/' + n + ' passed' + (fails ? ' · ' + fails + ' FAILED' : ' — ALL PASS'))
  process.exit(fails ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
