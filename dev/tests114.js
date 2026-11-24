// 24 Nov — JAPANESE GRAMMAR, "NEW UNTIL RATED" (v775). A grammar point behaves like a new word: it is NEW from the moment a track teaches it and stays NEW until the learner rates it.
// Real application functions throughout (the curriculum, the plan, the picker, the finaliser, the prompt builders, the export, the screens); the only thing scripted is the model transport,
// and only in the one test that runs a real generation. Every state below is built with the application's own record writers (jaGrammarIntroduce, jaGrammarApplyRating), plus records shaped
// exactly as v774 stored them (introduced, practised, the automatic first review date, never rated) for the existing-learner rules.
//   A  SLOTS         NEW = introduced, not rated, not known · at most 5 NEW at once · the next track brings 5 minus the points still NEW (5 / 2 / none rated) · the cost budget and the unlock and
//                    prerequisite rules still hold · existing unrated points count as NEW · more than 5 NEW: nothing new, nothing demoted
//   B  RATING        HARD / OK leave NEW and go on the schedule (same numbers as v774) · EASY = known at once and leaves review and the due list · Not shown changes nothing else · known-after-3 intact
//   C  CARRY-OVER    a point still NEW is in the writer's allowed list as NEW, is not introduced a second time and is not counted twice · preview, writer list and finaliser agree (one function)
//   D  THE CARD      four buttons (HARD / OK / EASY / Not shown), each persists at once
//   E  ROMAJI        the stored romaji beside every grammar entry in the preview, the Known grammar list, GRAMMAR IN THIS TRACK (screen and export) and the rating card; nothing when there is none
//   F  REVIEW AREA   Japanese only, in the Words area: the grammar due and, apart, the points still NEW; the same ratings and rules as the card; Thai / Mandarin / Cantonese untouched
//   G  SAFETY        the four switches (all ON by default); all four off = the unchanged v774 build (reference values below); the 30 words, the 90 pairs and the closed-vocabulary check never change
//   node tests114.js            (current build: tt.compiled.js, or TT_FILE)      TT_PROBE=1 prints the v774 reference values this suite compares against (run it on the unchanged v774 build)
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
const KS = 'tt-ja-grammar-srs'
const textOf = x => x == null ? '' : typeof x === 'string' ? x : Array.isArray(x) ? x.map(textOf).join(' ') : textOf(x.children)
const flush = async (k = 20) => { for (let i = 0; i < k; i++) await new Promise(r => setImmediate(r)) }
// v778 (explained here on purpose): the two English-only grammar names (the plain present, the noun-modifying clause) are now shown with Japanese examples (jaGrammarShownLabelSetEnabled, added after this suite was
// written, ON by default). This suite states the earlier contract, whose screens, prompts, exports and logs name those two entries in English, so every context of this suite is made with that one switch off too.
// Nothing else is changed: every assertion below is the one it shipped with, and the new text has its own suite (tests117.js).
const quiet = c => { c.console.info = () => {}; c.console.warn = () => {}; c.console.error = () => {}; if (typeof c.jaGrammarShownLabelSetEnabled === 'function') c.jaGrammarShownLabelSetEnabled(false); return c }
const fresh = () => quiet(load(FILE, { realBelt: true, React }))
const has = (c, name) => typeof c[name] === 'function'
const learner = (c, known) => c.initJapaneseVocab().map((w, i) => i < known ? { ...w, status: 'known' } : w)
const SW = { slots: 'jaGrammarSlots', notShown: 'jaGrammarNotShown', romaji: 'jaGrammarRomaji', reviewArea: 'jaGrammarReviewArea' }
const NEWSW = Object.values(SW)
const allOff = c => NEWSW.forEach(p => has(c, p + 'SetEnabled') && c[p + 'SetEnabled'](false))
const esc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const ws = s => String(s).replace(/\s+/g, ' ')
const CURr = c => c.ev('JA_GRAMMAR_CURRICULUM')
const IDS = c => CURr(c).map(e => e.id)
const entry = (c, id) => c.ev('jaGrammarEntryById')(id)

// a record as v774 stored an introduced point that was never rated: introduced, practised in a track, the automatic first review date (+2 days) — and nothing else
const V774REC = (id, o) => ({ key: 'buildingBlock:' + id, type: 'buildingBlock', itemId: id, status: 'learning', interval: 0, dueDate: '2026-11-22', lastSeen: '2026-11-20', introducedAt: '2026-11-20', okStreak: 0, lapses: 0,
  exposures: 2, productiveExposures: 2, autoScheduled: true, ...(o || {}) })
// a store: `ids` introduced the v774 way and left unrated; `ratedIds` of them then rated OK through the application's own rating function
const storeOf = (c, ids, ratedIds, rating) => { const st = {}; ids.forEach(id => { st['buildingBlock:' + id] = V774REC(id) }); (ratedIds || []).forEach(id => c.jaGrammarApplyRating(st, 'buildingBlock', id, rating || 'ok')); return st }
const planOf = (c, st, known, today) => c.jaGrammarTrackPlan(st, known == null ? 200 : known, { today: today || TODAY })
const ids = list => (list || []).map(x => x.id)
const clone = x => JSON.parse(JSON.stringify(x))
// the rule, stated on its own: the NEXT entries in curriculum order — unlocked, not introduced, prerequisites introduced or chosen just before — at most `free` points and at most 5 cost points (light 1, heavy 2)
const refNext = (c, st, known, free) => {
  const intro = id => !!(st['buildingBlock:' + id] && st['buildingBlock:' + id].introducedAt), pick = []; let spent = 0
  for (const e of CURr(c)) { if (intro(e.id)) continue; if (known < e.minKnown) break; if (!e.prereq.every(p => intro(p) || pick.includes(p))) continue
    if (pick.length >= free) break; if (spent + e.cost > 5) break; pick.push(e.id); spent += e.cost; if (spent >= 5) break }
  return pick
}
const newCountOf = st => Object.values(st || {}).filter(r => r && r.type === 'buildingBlock' && r.introducedAt && !(r.interval > 0) && !r.ratedAt && !r.knownAt).length

// the track of the owner's 17 Nov export: 99 pairs, 90 of them target pairs
const pairsOf = () => FIXJ.map(l => ({ speaker: l.n % 2 ? 'A' : 'B', japanese: l.ja, thai: l.ja, reading: '', romaji: '', english: '', prompt: '',
  ...(l.kind === 'target' ? { targetId: 1000 + l.n, wordId: 1000 + l.n, isTargetPair: true, _target: 'x', recallIndex: 1 } : l.kind === 'bridge' ? { pairType: 'bridge', isTargetPair: false } : { _framing: true, pairType: 'framing', isTargetPair: false, _target: 'greeting' }) }))
const trackOf = (id, extra) => ({ language: 'ja', date: '2026-11-17', createdAt: id || '2026-11-17T09:04:11.270Z', mode: 'daily', speechStyle: 'natural', pairs: pairsOf(),
  keywords: Array.from({ length: 30 }, (_, i) => ({ japanese: 'w' + i, wordId: 1000 + i, rating: null })), selectedTargetIds: Array.from({ length: 30 }, (_, i) => 1000 + i),
  buildingBlocks: [{ form: 'は', romaji: 'wa', meaning: 'topic marker' }, { form: 'か', romaji: 'ka', meaning: 'question marker' }], ...(extra || {}) })
// a short track of chosen lines (all target pairs), for the tests that need exact control over what a track uses
const mk = lines => lines.map((s, i) => ({ speaker: 'A', japanese: s, thai: s, targetId: 3000 + i, wordId: 3000 + i, isTargetPair: true, recallIndex: 1 }))
const trk = (id, lines, extra) => ({ language: 'ja', createdAt: id, date: id.slice(0, 10), mode: 'daily', speechStyle: 'natural', trackContext: { trackId: id, language: 'ja' }, keywords: [{ japanese: 'w', wordId: 1, rating: null }], selectedTargetIds: [1], pairs: mk(lines), buildingBlocks: [], ...(extra || {}) })
const exportText = (cc, track) => { cc.Blob = class { constructor(parts) { cc.__blob = parts.join('') } }; cc.URL = { createObjectURL: () => 'b', revokeObjectURL() {} }; cc.document.createElement = () => ({ style: {}, click() {}, setAttribute() {} }); cc.document.body.appendChild = () => {}; cc.document.body.removeChild = () => {}; cc.__blob = ''; cc.downloadJapaneseTrack(track); return cc.__blob }
const mount = async (cc, el, k) => { let R; await TR.act(async () => { R = TR.create(el); await flush(k || 12) }); return R }
const tx = inst => ws(textOf(inst && inst.children))
const btn = (R, text, nth) => R.root.findAll(x => x.type === 'button' && tx(x) === text && typeof x.props.onClick === 'function')[nth || 0]
const click = async (b) => { if (!b) return false; await TR.act(async () => { b.props.onClick(); await flush(12) }); return true }       // a missing button is reported by the assertions that follow, not by a crash
// the rating card of one point: the smallest block that holds its label and its rating buttons
const cardOf = (R, label) => { const all = R.root.findAll(x => x.type === 'div' && x.findAll(s => s.type === 'span' && tx(s) === label).length >= 1 && x.findAll(b => b.type === 'button').length >= 3 && x.findAll(b => b.type === 'button').length <= 4); return all[all.length - 1] }
const cardBtn = (R, label, text) => { const cd = cardOf(R, label); return cd && cd.findAll(b => b.type === 'button' && tx(b) === text)[0] }
// the Japanese plan screen ("Scene Ready": Generate Track from this Scene, the target chips, the Grammar for this track preview), the real JapaneseGenerator with only the scene call answered
async function planScreen(cc, vocab, store) {
  cc.generateJapaneseScene = async () => ({ scene: 'Two friends meet', setting: 'a cafe', characterA: 'Daiki', characterB: 'Mio', opening: 'こんにちは', opening_english: 'Hello', premise: 'x' })
  await cc.stSet('tt-migrations', { 'ja-grammar-curriculum-v1': { status: 'done' } })
  await cc.stSet(KS, store || {})
  const targets = vocab.slice(0, 5).map(w => ({ ...w, selectionRole: 'review' }))
  let R; await TR.act(async () => { R = TR.create(React.createElement(cc.JapaneseGenerator, { vocab, targets, selection: null, trackMode: 'daily', tracks: [], register: 'natural', cred: { geminiKey: 'k' }, onGenerated() {}, onBack() {} })); for (let i = 0; i < 80; i++) await new Promise(x => setImmediate(x)) })
  return { R, text: textOf(R.toJSON()).replace(/\s+/g, ' ') }
}
const mkRecall = (jp, en) => ({ intent: 'say it', japanese: jp, reading: '', romaji: '', englishCue: 'Say: ' + en, englishMeaning: en, segments: [] })
const CLEAN = { 1: mkRecall('今日は行く？', 'Are you going today?'), 2: mkRecall('明日、行くよ。', 'I am going tomorrow.'), 3: mkRecall('行くね。', 'I will go, okay?') }
async function runGroup(S, targetWord, answer, gate, o) {
  const c = S.c, vocab = S.vocab, t = vocab.find(v => v.japanese === targetWord), inv = c.japaneseLearnerInventory(vocab, [t]), rules = c.scarcityRules(inv)
  const logs = [], calls = []
  c.geminiRequest = async req => { const text = (req.messages || []).map(m => m.content).join('\n'); calls.push(text); const slots = [...text.matchAll(/• recall (\d) of 3/g)].map(m => +m[1]); return JSON.stringify({ recalls: answer(calls.length, slots, text) }) }
  const adapter = c.japaneseTargetGroupAdapter({ vocab, registerId: (o && o.register) || 'natural', inv, rules, seenMap: new Map(), trackUsed: [], apiKey: KEY, model: MODEL, onLog: m => logs.push(m), opts: { grammarGate: gate || undefined, grammarProgress: (o && o.store) || {} } })
  const grp = await c.generateTargetGroup({ language: 'ja', target: t, recallCount: 3, adapter, paidMaxPerRecall: 3, apiKey: KEY, model: MODEL, onLog: m => logs.push(m), ledger: c.beginGenerationLedger('ja'), runId: c.aiBeginRun('ja-track') })
  return { grp, logs, calls }
}
const SLOTS_LEVEL = 200                       // known words: everything is unlocked, so the slot count is the only limit in most tests

;(async () => {
  // ═══ A — THE SLOTS ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  if (!process.env.TT_PROBE) try {
    const c = fresh(), CUR = CURr(c), FIRST5 = IDS(c).slice(0, 5)
    T('A0', 'the four switches exist (a setter and a reader each) and all are ON by default',
      NEWSW.every(p => has(c, p + 'SetEnabled') && has(c, p + 'On') && c[p + 'On']() === true), NEWSW.filter(p => !has(c, p + 'SetEnabled') || !has(c, p + 'On')))
    // the rule NEW = introduced, not rated, not known, on every kind of record
    const recs0 = {
      wa: V774REC('wa'),                                                                   // v774: introduced, practised, automatic date, never rated            → NEW
      ka: V774REC('ka', { interval: 2, okStreak: 1, dueDate: '2026-11-26', lastSeen: '2026-11-24' }),     // v774: rated OK (interval 2)                      → not NEW
      ne: V774REC('ne', { knownAt: '2026-11-23', sightings: 3, sightingTracks: ['a', 'b'] }),             // known after 3 across 2 tracks                    → not NEW
      yo: V774REC('yo', { autoScheduled: undefined, dueDate: null, exposures: 0, productiveExposures: 0, lastSeen: null }),   // introduced by the first-run migration: never practised, never rated → NEW
      da: { key: 'buildingBlock:da', type: 'buildingBlock', itemId: 'da', status: 'new', interval: 0, dueDate: null, lastSeen: null, introducedAt: null, okStreak: 0, lapses: 0, exposures: 0, productiveExposures: 0 },   // never introduced → not NEW
      'plain-present': V774REC('plain-present', { notShownAt: '2026-11-23' }),              // a point the learner marked "Not shown"                         → still NEW
    }
    const recs = {}; Object.keys(recs0).forEach(id => { recs['buildingBlock:' + id] = recs0[id] })
    const slots = has(c, 'jaGrammarSlots') ? c.jaGrammarSlots(recs) : null
    T('A1', 'NEW = introduced, and not yet rated, and not known: a v774 record never rated is NEW, a rated one is not, a known one is not, one never introduced is not, a "Not shown" one still is — and the count and the free slots follow (5 minus the points still NEW)',
      !!slots && slots.limit === 5 && slots.newIds.join() === 'wa,yo,plain-present' && slots.newCount === 3 && slots.free === 2, slots)
    // the arithmetic at the three states of the brief
    const arith = (nRated, known) => { const st = storeOf(c, FIRST5, FIRST5.slice(0, nRated)), p = planOf(c, st, known); return { st, p } }
    const rows = []
    ;[[5, 'rate all 5 → brings 5'], [2, 'rate 2 → brings 2'], [0, 'rate none → brings none']].forEach(([k, label]) => { const { st, p } = arith(k); rows.push({ k, label, next: ids(p.next), still: ids(p.stillNew), free: p.slots && p.slots.free, st }) })
    const [r5, r2, r0] = rows
    T('A2', 'slot arithmetic, all 5 rated: 5 points were NEW and all are rated, so 5 slots are free and the next track brings 5 (the next five in curriculum order)',
      r5.next.length === 5 && r5.next.join() === refNext(c, r5.st, 200, 5).join() && (r5.still || []).length === 0 && r5.free === 5, r5)
    T('A3', 'slot arithmetic, 2 of 5 rated: 3 points are still NEW, 2 slots are free, so the next track brings 2 — the first two of those five — and the 3 still NEW are listed as carried',
      r2.next.length === 2 && r2.next.join() === refNext(c, r2.st, 200, 2).join() && r2.next.join() === r5.next.slice(0, 2).join() && (r2.still || []).join() === FIRST5.slice(2).join() && r2.free === 2, r2)
    T('A4', 'slot arithmetic, none rated: all 5 are still NEW, 0 slots are free, the next track brings none, and all 5 are carried into it',
      r0.next.length === 0 && (r0.still || []).join() === FIRST5.join() && r0.free === 0, r0)
    info('SLOTS  rate all 5: NEW 0 → free 5 → next track brings ' + r5.next.length + ' (' + r5.next.join(' ') + ')  ·  rate 2: NEW 3 → free 2 → brings ' + r2.next.length + ' (' + r2.next.join(' ') + ') and carries ' + (r2.still || []).join(' ') + '  ·  rate none: NEW 5 → free 0 → brings ' + r0.next.length + ', carries ' + (r0.still || []).join(' '))
    // every count from 0 to 5 rated, and the property over many states against the rule stated on its own
    const tbl = []
    for (let k = 0; k <= 5; k++) { const { st, p } = arith(k); tbl.push(p.next.length === k && ids(p.next).join() === refNext(c, st, 200, k).join() ? 'ok' : 'k=' + k + ' got ' + p.next.length + ' ' + ids(p.next).join(' ')) }
    T('A5', 'for 0, 1, 2, 3, 4 and 5 rated of 5 introduced, the next track brings exactly that many points (5 minus the points still NEW), never more', tbl.every(x => x === 'ok'), tbl)
    const bad = []
    ;[0, 3, 6, 9, 14, 25, 40, 60, 80, 100].forEach(N => { ;['all', 'none', 'alt', 'first'].forEach(mode => {
      const base = IDS(c).slice(0, N), ratedIds = mode === 'all' ? base : mode === 'none' ? [] : mode === 'first' ? base.slice(0, Math.max(0, N - 4)) : base.filter((_, i) => i % 2 === 0)
      const st = storeOf(c, base, ratedIds), unrated = base.length - ratedIds.length, free = Math.max(0, 5 - unrated)
      ;[200, 30].forEach(known => { const got = ids(planOf(c, st, known).next).join(), want = refNext(c, st, known, free).join()
        if (got !== want) bad.push(N + '/' + mode + '/known ' + known + ': got [' + got + '] want [' + want + ']') }) }) })
    T('A6', 'over 40 states (0 to 100 points introduced, all / none / half / all-but-four rated, a learner with 200 or 30 words): the plan is always the rule — the next entries in order, unlocked, prerequisites met, cost budget 5 (light 1, heavy 2) — cut to the free slots',
      bad.length === 0, bad.slice(0, 5))
    // the cost budget still applies on top of the slots: heavy entries (cost 2) fill the 5 cost points before the 5 slots
    const iSug = IDS(c).indexOf('sugiru'), before = IDS(c).slice(0, iSug), stH = storeOf(c, before, before), pH = planOf(c, stH, 200)
    T('A7', 'the cost budget is kept: with 5 slots free and the next entries heavy (〜すぎる 2, 〜と 1, 〜てくれる？ 1, 〜ちゃう 2 …) the track brings 3 points (4 cost points; the next heavy one would make 6), not 5',
      pH.next.length === 3 && pH.budget.spent === 4 && ids(pH.next).join() === refNext(c, stH, 200, 5).join() && ids(pH.next).join() === 'sugiru,to-cond,tekureru', { next: ids(pH.next), spent: pH.budget.spent })
    const stH3 = (() => { const st = storeOf(c, before, before); IDS(c).slice(iSug - 2, iSug).forEach(id => { st['buildingBlock:' + id] = V774REC(id) }); return st })()
    T('A8', 'and the slot count cuts a list the budget would have allowed: the same state with 2 more points still NEW (3 free) brings 3; with 4 still NEW (1 free) brings 1',
      ids(planOf(c, stH3, 200).next).join() === refNext(c, stH3, 200, 3).join() && planOf(c, stH3, 200).next.length === 3 && (() => { const st = storeOf(c, before, before); IDS(c).slice(iSug - 4, iSug).forEach(id => { st['buildingBlock:' + id] = V774REC(id) }); const p = planOf(c, st, 200); return p.next.length === 1 && ids(p.next).join() === refNext(c, st, 200, 1).join() })())
    // unlock-by-level and prerequisites are untouched: a learner with 6 known words has only a few entries unlocked, whatever the free slots
    const st6 = storeOf(c, FIRST5, FIRST5), p6 = planOf(c, st6, 6)
    T('A9', 'unlock by level still holds: a learner with 6 known words, the first five points rated (5 slots free), is offered only what is unlocked (the plain present, さん) — 2 points, not 5',
      ids(p6.next).join() === 'plain-present,san' && p6.slots && p6.slots.free === 5, ids(p6.next))
    const iTai = IDS(c).indexOf('tai'), gapIds = IDS(c).slice(0, iTai).filter(id => id !== 'plain-present'), stP = storeOf(c, gapIds, gapIds), pP = planOf(c, stP, 200)
    T('A10', 'prerequisites still hold: with every early point taught except the plain present, the next list starts with the plain present, and every point in it has its prerequisites taught or chosen just before it (〜たい waits for it)',
      ids(pP.next)[0] === 'plain-present' && pP.next.every((x, i) => (entry(c, x.id).prereq || []).every(q => !!stP['buildingBlock:' + q] || ids(pP.next).slice(0, i).includes(q))), ids(pP.next))
    // over 5 NEW: nothing new, and nothing is demoted or rewritten
    const st8 = storeOf(c, IDS(c).slice(0, 8)), snap8 = JSON.stringify(st8), p8 = planOf(c, st8, 200), gate8 = c.jaGrammarGateContext(learner(c, 200), st8, { register: 'natural', today: TODAY })
    T('A11', 'more than 5 NEW (8 introduced, none rated): the track introduces nothing new, all 8 are carried (none dropped from the list), and no record was changed, demoted, re-dated or removed by planning',
      p8.next.length === 0 && (p8.stillNew || []).length === 8 && JSON.stringify(st8) === snap8 && gate8.plannedIds.length === 0 && (gate8.stillNewIds || []).length === 8 && gate8.introducedIds.length === 8, { next: ids(p8.next), still: ids(p8.stillNew) })
    const steps = []
    { const st = storeOf(c, IDS(c).slice(0, 8)); for (let k = 0; k <= 5; k++) { if (k) c.jaGrammarApplyRating(st, 'buildingBlock', IDS(c)[k - 1], 'ok'); steps.push(planOf(c, st, 200).next.length) } }
    T('A12', 'it stays shut until the count is under 5: with 8 NEW, rating 1 → 7 NEW, 2 → 6, 3 → 5 (still nothing), the 4th rating → 4 NEW brings 1, the 5th → 3 NEW brings 2', steps.join() === '0,0,0,0,1,2', steps)
    // existing learners: v773 / v774 points introduced and never rated count as NEW; the automatic date does not put them on the schedule
    const stOld = {}; ;['wa', 'ka', 'ne', 'yo', 'da', 'plain-present', 'san'].forEach(id => { stOld['buildingBlock:' + id] = V774REC(id, { dueDate: '2026-11-01' }) })      // 7 introduced on v774, never rated, all long overdue by the old automatic date
    const snapOld = JSON.stringify(stOld), pOld = planOf(c, stOld, 90)
    T('A13', 'learners already on v773 / v774: 7 introduced points that were never rated all count as NEW (they were never rated), even though v774 gave them an automatic review date long past — they are not "overdue reviews", not "due", and nothing is demoted, rewritten or re-dated',
      (pOld.stillNew || []).length === 7 && pOld.next.length === 0 && pOld.held === false && pOld.overdue === 0 && pOld.review.length === 0 && JSON.stringify(stOld) === snapOld, { still: ids(pOld.stillNew), held: pOld.held, overdue: pOld.overdue, review: ids(pOld.review) })
    { // the picker after writing reads the same state the plan does: the 7 old unrated points are NEW, not "overdue", so nothing is "held back for reviews" — the reason is the slots
      const cf = fresh(), stO = {}; ;['wa', 'ka', 'ne', 'yo', 'da', 'plain-present', 'san'].forEach(id => { stO['buildingBlock:' + id] = V774REC(id, { dueDate: '2026-11-01' }) }); await cf.stSet(KS, stO)
      const fo = await cf.jaGrammarFinaliseTrack(trackOf('2026-11-24T08:00:00.000Z'), { vocab: learner(cf, 90), today: TODAY }), go = fo.grammarInTrack
      T('A15', 'the picker after writing agrees with the plan on those 7 old unrated points: they are not "overdue reviews" (nothing is held back for reviews), nothing new is introduced because no NEW slot is free, and the unrated points are practised again as STILL NEW',
        go.held === false && go.overdue === 0 && go.new.length === 0 && go.passing.some(x => /no free NEW slot/.test(x.why || '')) && !go.passing.some(x => /held back/.test(x.why || '')) && (go.stillNew || []).length > 0 && go.slots && go.slots.free === 0, { held: go.held, overdue: go.overdue, new: ids(go.new), still: ids(go.stillNew || []) }) }
    { const st = storeOf(c, IDS(c).slice(0, 3)); ;['konnichiwa', 'un', 'matane', 'jaa'].forEach(id => { st['conversationBasic:' + id] = { ...V774REC(id), key: 'conversationBasic:' + id, type: 'conversationBasic' } })
      const p = planOf(c, st, 200)
      T('A16', 'only grammar points take slots: 3 grammar points and 4 conversation basics (greetings, reaction words), all introduced and never rated, are 3 NEW — 2 slots free, the next track brings 2', !!p.slots && p.slots.newCount === 3 && p.slots.free === 2 && p.next.length === 2, p.slots) }
    // known entries and rated entries take no slot; known-by-3 leaves NEW
    const stK = storeOf(c, FIRST5); stK['buildingBlock:wa'] = { ...stK['buildingBlock:wa'], knownAt: '2026-11-23', sightings: 3, sightingTracks: ['a', 'b'] }
    T('A14', 'a known point is not NEW: 5 introduced, none rated, one of them known after 3 sentences across 2 tracks → 4 NEW, 1 slot free, the next track brings 1', planOf(c, stK, 200).next.length === 1 && (planOf(c, stK, 200).stillNew || []).length === 4)
  } catch (e) { T('A!', 'section A stopped: ' + String(e && e.message).split('\n')[0], false, String(e && e.stack).slice(0, 500)) }

  // ═══ B — RATING, EASY, NOT SHOWN, KNOWN-AFTER-3 ═══════════════════════════════════════════════════════════════════════════════════
  if (!process.env.TT_PROBE) try {
    const c = fresh(), FIRST5 = IDS(c).slice(0, 5)
    const rate = (rating, id) => { const st = storeOf(c, FIRST5); const before = clone(st['buildingBlock:' + (id || 'wa')]); c.jaGrammarApplyRating(st, 'buildingBlock', id || 'wa', rating); return { st, before, after: st['buildingBlock:' + (id || 'wa')] } }
    const eng = (before, rating) => c.applyRating({ ...before, thai: before.key }, rating)
    const sameSched = (a, e) => ['status', 'interval', 'dueDate', 'lastSeen', 'okStreak', 'lapses'].every(f => a[f] === e[f])
    const R = { hard: rate('hard'), ok: rate('ok'), easy: rate('easy') }
    // HARD and OK
    T('B1', 'HARD and OK take a point out of NEW and put it on the review schedule exactly as before (interval, due date, status, streak and lapses are the numbers the SRS engine gives; HARD 1 day, OK 2 days): the NEW count falls from 5 to 4 and the next track brings 1',
      ['hard', 'ok'].every(k => sameSched(R[k].after, eng(R[k].before, k)) && R[k].after.interval > 0 && R[k].after.dueDate > TODAY && !R[k].after.knownAt && R[k].after.introducedAt === '2026-11-20') &&
      R.hard.after.interval === 1 && R.ok.after.interval === 2 && ['hard', 'ok'].every(k => planOf(c, R[k].st, 200).next.length === 1 && (planOf(c, R[k].st, 200).stillNew || []).length === 4) &&
      ['hard', 'ok'].every(k => c.jaGrammarDue(R[k].st, 'buildingBlock', '2099-01-01').some(r => r.itemId === 'wa')),
      { hard: R.hard.after, ok: R.ok.after, nextHard: planOf(c, R.hard.st, 200).next.length })
    // EASY
    const ea = R.easy
    T('B2', 'EASY makes the point KNOWN at once: knownAt is set (today), the schedule fields are the engine\'s (EASY 4 days), it leaves the due list and the review list, it leaves NEW (the next track brings 1), it stays introduced and allowed, and it is in the Known grammar list',
      ea.after.knownAt === NOW && sameSched(ea.after, eng(ea.before, 'easy')) && !c.jaGrammarDue(ea.st, 'buildingBlock', '2099-01-01').some(r => r.itemId === 'wa') && !ids(planOf(c, ea.st, 200, '2099-01-01').review).includes('wa') &&
      planOf(c, ea.st, 200).next.length === 1 && c.jaGrammarIntroducedIds(ea.st).includes('wa') && c.jaGrammarGateContext(learner(c, 200), ea.st, { register: 'natural', today: TODAY }).introducedIds.includes('wa') && c.jaGrammarKnownList(ea.st).some(x => x.id === 'wa' && x.knownAt === NOW),
      { after: ea.after, due: c.jaGrammarDue(ea.st, 'buildingBlock', '2099-01-01').map(r => r.itemId) })
    // the same thing the 3-sentences route does: a known record, whatever its date, takes no review slot
    const route3 = storeOf(c, FIRST5); route3['buildingBlock:wa'] = { ...route3['buildingBlock:wa'], knownAt: NOW, sightings: 3, sightingTracks: ['a', 'b'] }
    T('B3', 'EASY and the 3-sentences-across-2-tracks route leave the same marks: both set knownAt and keep the dates; both are out of the due list, the review list and NEW',
      JSON.stringify(c.jaGrammarDue(ea.st, 'buildingBlock', '2099-01-01').map(r => r.itemId)) === JSON.stringify(c.jaGrammarDue(route3, 'buildingBlock', '2099-01-01').map(r => r.itemId)) &&
      planOf(c, ea.st, 200).next.length === planOf(c, route3, 200).next.length && ids(planOf(c, ea.st, 200).stillNew).join() === ids(planOf(c, route3, 200).stillNew).join())
    // known-after-3 still works, still idempotent, still counts after EASY
    const an = lines => c.jaGrammarAnalyseTrack(mk(lines)), L2 = ['私は行く。', '私は寝る。'], L1 = ['私は走る。']
    { const st = storeOf(c, FIRST5)
      c.jaGrammarRecordSightings(st, an(L2), 'track-A', '2026-11-25'); const mid = clone(st['buildingBlock:wa'])
      const r2 = c.jaGrammarRecordSightings(st, an(L1), 'track-B', '2026-11-26'), wa = st['buildingBlock:wa']
      T('B4', 'known after 3 sentences across 2 tracks still works on a NEW point (3 sightings, 2 tracks, known the day of the third), and the point leaves NEW: 4 are still NEW and the next track brings 1',
        !mid.knownAt && wa.sightings === 3 && wa.sightingTracks.join() === 'track-A,track-B' && wa.knownAt === '2026-11-26' && r2.becameKnown.join() === 'wa' && planOf(c, st, 200).next.length === 1 && (planOf(c, st, 200).stillNew || []).length === 4, { wa })
      const once = JSON.stringify(st), r3 = c.jaGrammarRecordSightings(st, an(L1), 'track-B', '2026-11-27'), r4 = c.jaGrammarRecordSightings(st, an(L2), 'track-A', '2026-11-27')
      T('B5', 'known-after-3 stays idempotent: recording either track again changes nothing (no second count, the known date is not moved)', JSON.stringify(st) === once && r3.changes === 0 && r4.changes === 0 && st['buildingBlock:wa'].sightings === 3) }
    { const st = storeOf(c, FIRST5); c.jaGrammarApplyRating(st, 'buildingBlock', 'wa', 'easy')
      const r1 = c.jaGrammarRecordSightings(st, an(L2), 'track-A', '2026-12-01'), r2 = c.jaGrammarRecordSightings(st, an(L2.concat(L1)), 'track-B', '2026-12-02'), wa = st['buildingBlock:wa']
      T('B6', 'a point made known by EASY keeps its date when later tracks count sentences (sightings go on adding, knownAt is not overwritten, it is never reported as "became known" a second time), and the counters are the same fields as before',
        wa.knownAt === NOW && wa.sightings === 5 && wa.sightingTracks.join() === 'track-A,track-B' && r1.becameKnown.length === 0 && r2.becameKnown.length === 0, wa) }
    { const st = storeOf(c, FIRST5); st['buildingBlock:wa'] = { ...st['buildingBlock:wa'], sightings: 2, sightingTracks: ['t1', 't2'] }
      c.jaGrammarApplyRating(st, 'buildingBlock', 'wa', 'ok'); const wa = st['buildingBlock:wa']
      T('B7', 'a rating does not touch the stored sightings fields (sightings, sightingTracks) or the exposures and the introduction date', wa.sightings === 2 && wa.sightingTracks.join() === 't1,t2' && wa.exposures === 2 && wa.productiveExposures === 2 && wa.introducedAt === '2026-11-20' && !wa.knownAt, wa) }
    { const st = storeOf(c, FIRST5), snap = JSON.stringify(st)
      T('B8', 'rating a point that was never introduced still introduces it at that moment (as before) and rating changes no other record', (() => { const s2 = clone(st); c.jaGrammarApplyRating(s2, 'buildingBlock', 'san', 'ok'); return s2['buildingBlock:san'].introducedAt === NOW && FIRST5.every(id => JSON.stringify(s2['buildingBlock:' + id]) === JSON.stringify(st['buildingBlock:' + id])) })() && JSON.stringify(st) === snap) }
    { const st = storeOf(c, FIRST5); st['buildingBlock:wa'] = { ...st['buildingBlock:wa'], knownAt: '2026-11-10', sightings: 4, sightingTracks: ['a', 'b'] }
      c.jaGrammarApplyRating(st, 'buildingBlock', 'wa', 'easy'); const wa = st['buildingBlock:wa']
      const sb = { 'conversationBasic:un': { ...V774REC('un'), key: 'conversationBasic:un', type: 'conversationBasic' } }; c.jaGrammarApplyRating(sb, 'conversationBasic', 'un', 'easy')
      T('B12', 'EASY on a point that is already known keeps its known date and its counters (nothing is overwritten); EASY on a conversation basic is only a rating (basics are never known)',
        wa.knownAt === '2026-11-10' && wa.sightings === 4 && wa.sightingTracks.join() === 'a,b' && !sb['conversationBasic:un'].knownAt && sb['conversationBasic:un'].interval === 4, { wa, un: sb['conversationBasic:un'] }) }
    // NOT SHOWN (the function under the button; the button itself is D)
    { const st = storeOf(c, FIRST5, ['ka']), snap = clone(st), r = has(c, 'jaGrammarRateAndSave') ? await c.jaGrammarRateAndSave(st, 'buildingBlock', 'wa', 'notshown') : null
      const after = r && (await c.jaGrammarLoad())
      const wa0 = snap['buildingBlock:wa'], wa1 = after && after['buildingBlock:wa']
      const diff = wa1 ? Object.keys({ ...wa0, ...wa1 }).filter(f => JSON.stringify(wa0[f]) !== JSON.stringify(wa1[f])) : ['(nothing stored)']
      T('B9', 'Not shown records nothing about difficulty and changes no schedule: after it the point has the same interval, due date, status, streak, lapses, exposures, introduction date, sightings and no known date — the only change is a "not shown" note — it is still NEW, and every other record is identical',
        !!r && diff.every(f => /^notShown/.test(f)) && diff.length >= 1 && wa1.interval === 0 && !wa1.knownAt && Object.keys(snap).filter(k => k !== 'buildingBlock:wa').every(k => JSON.stringify(after[k]) === JSON.stringify(snap[k])) && newCountOf(after) === newCountOf(snap), { diff })
      T('B10', 'Not shown keeps the point NEW for the slots: with 4 NEW before (1 rated of 5), 4 NEW after, 1 slot free before and after', !!r && newCountOf(after) === 4 && planOf(c, after, 200).next.length === 1 && planOf(c, snap, 200).next.length === 1, { after: newCountOf(after) })
      T('B11', 'Not shown persists at once, the same way the other ratings do: it goes through the same save (merged, immediately), so the stored progress already holds it without any later save', !!wa1 && !!wa1.notShownAt, wa1) }
  } catch (e) { T('B!', 'section B stopped: ' + String(e && e.message).split('\n')[0], false, String(e && e.stack).slice(0, 500)) }

  // ═══ C — CARRY-OVER, THE WRITER'S LIST, THE FINALISER ══════════════════════════════════════════════════════════════════════════
  if (!process.env.TT_PROBE) try {
    const c = fresh(), IDSC = IDS(c), SIX = IDSC.slice(0, 6), vocab = learner(c, SLOTS_LEVEL), lab = id => entry(c, id).label
    // 6 introduced, 3 rated (wa ka ne), 3 still NEW (yo da plain-present): 2 slots free
    const stC = () => storeOf(c, SIX, SIX.slice(0, 3))
    const st0 = stC(), gate = c.jaGrammarGateContext(vocab, st0, { register: 'natural', today: TODAY }), plan = planOf(c, st0, SLOTS_LEVEL)
    const S = setup('ja'); quiet(S.c); const sc = S.c, tg = S.vocab.find(v => v.japanese === '行く'), inv = sc.japaneseLearnerInventory(S.vocab, [tg]), slots3 = [1, 2, 3].map(k => ({ recallIndex: k, lastFailure: '', failedSentences: [] }))
    const gp0 = { initial: true, acceptedForTarget: [], usedInTrack: [], rejected: [], objectives: '', grammarProgress: {}, scenePremise: '' }
    const prompt = sc.buildJapaneseGroupPrompt(tg, slots3, inv, S.vocab, 'natural', { ...gp0, grammarGate: clone(gate) }), pu = prompt.user
    const line = k => (pu.split('\n').find(l => l.includes(k)) || '')
    const newLine = line('NEW THIS TRACK'), taughtLine = line('TAUGHT ALREADY')
    // the writer's list on a store where the carried points are NOT core grammar (the free core is never listed under TAUGHT ALREADY): 14 introduced, all rated except じゃない and ちゃん / くん
    { const ids14 = IDSC.slice(0, 14), st14 = storeOf(c, ids14, ids14.filter(id => !['janai', 'chan-kun'].includes(id))), g14 = c.jaGrammarGateContext(vocab, st14, { register: 'natural', today: TODAY }), p14 = planOf(c, st14, SLOTS_LEVEL)
      const pu14 = sc.buildJapaneseGroupPrompt(tg, slots3, inv, S.vocab, 'natural', { ...gp0, grammarGate: clone(g14) }).user, line14 = k => (pu14.split('\n').find(l => l.includes(k)) || '')
      const nl = line14('NEW THIS TRACK'), tl = line14('TAUGHT ALREADY')
      T('C1', 'the points still NEW are in the writer\'s allowed list AS NEW: the NEW THIS TRACK line names the 2 carried points (じゃない / ではない, ちゃん / くん, marked "still new") and the 3 new picks; TAUGHT ALREADY lists the rated ones (さん) and not the carried ones',
        [lab('janai'), lab('chan-kun')].every(l => nl.includes(l)) && p14.next.length === 3 && p14.next.every(x => nl.includes(x.label)) && tl.includes(lab('san')) && !tl.includes(lab('janai')) && !tl.includes(lab('chan-kun')) && /still new/i.test(nl), { nl, tl }) }
    T('C2', 'the allowed list is a list, not a hint: a carried point is allowed by the sentence check (a sentence that uses it passes), a point that is neither taught, carried nor planned is still refused (〜たら)',
      sc.jaGrammarCheckSentence('これは本だよ。', gate, {}).ok === true && sc.jaGrammarCheckSentence('行ったら言ってね。', gate, {}).ok === false && gate.introducedIds.includes('da') && !gate.plannedIds.includes('da'))
    T('C3', 'the writer\'s list, the plan and the preview are ONE function: the context holds the same 2 new points and the same 3 carried points as jaGrammarTrackPlan, in the same order (and the objectives the writer practises include the carried ones)',
      gate.plannedIds.join() === ids(plan.next).join() && (gate.stillNewIds || []).join() === ids(plan.stillNew).join() && ids(plan.stillNew).join() === 'yo,da,plain-present' && plan.next.length === 2 && (gate.slots || {}).free === 2, { gate: gate.plannedIds, still: gate.stillNewIds })
    // a real generation: the first request the writer receives carries the carried points as NEW
    { const S2 = setup('ja'); quiet(S2.c); const c2 = S2.c; await c2.stSet('tt-migrations', { 'ja-grammar-curriculum-v1': { status: 'done' } }); await c2.stSet(KS, stC())
      mock(S2, 'ja'); const inner = c2.geminiRequest, calls = []
      c2.geminiRequest = async o => { calls.push((o.messages || []).map(m => m.content).join('\n')); return inner(o) }
      const tc = c2.jaGeneratorTrackContext(S2.targets.slice(0, 3).map(t => ({ ...t, selectionRole: 'review' })), { counts: { new: 0 } }, 'daily', 'natural', c2.aiBeginRun('ja-track'))
      const res = await c2.generateJapaneseTrack(S2.targets.slice(0, 3), S2.vocab, 'natural', KEY, MODEL, () => {}, () => {}, { cancelled: false }, { scene: 'Two friends at a station', characterA: 'Kenji, a man', characterB: 'Yuki, a woman', opening: '', reply: '', closing: '', closing_reply: '' }, { trackContext: tc, runId: tc.generationRunId })
      const first = calls.find(x => /JAPANESE TARGET: ★/.test(x)) || '', nl = first.split('\n').find(l => l.includes('NEW THIS TRACK')) || ''
      T('C4', 'a real generation from the stored progress: the writer\'s request lists the carried points and the new picks under NEW THIS TRACK and asks to practise the carried points again (PRACTICE OBJECTIVES), the track context carries the same lists, and the older closed-grammar check allows them',
        res.complete === true && ['yo', 'da'].every(id => nl.includes(lab(id))) && /PRACTICE OBJECTIVES[^\n]*よ[^\n]*だ/.test(first) && !!tc.grammarGate && (tc.grammarGate.stillNewIds || []).join() === 'yo,da,plain-present' && tc.grammarGate.plannedIds.length === 2 && ['yo', 'da', 'plain-present'].every(id => c2.ev('JA_CURRICULUM_ALLOWED').has(id)), { nl, ctx: tc.grammarGate && tc.grammarGate.stillNewIds }) }
    // the finaliser: free slots honoured, the carried points used again are not introduced twice and not counted twice
    const before = stC(); await c.stSet(KS, before)
    const fin = await c.jaGrammarFinaliseTrack(trackOf('2026-11-24T08:00:00.000Z'), { vocab, today: TODAY })
    const after = await c.jaGrammarLoad(), g = fin.grammarInTrack, newIds = ids(g.new), unlimited = (() => { const cu = fresh(); cu.jaGrammarSlotsSetEnabled && cu.jaGrammarSlotsSetEnabled(false); return cu.jaGrammarPlan(cu.jaGrammarAnalyseTrack(trackOf().pairs), { known: SLOTS_LEVEL, store: stC(), today: TODAY }) })()
    T('C5', 'the picker after writing honours the free slots: 3 points are still NEW, so of the five a v774 track would introduce (' + ids(unlimited.new).join(' ') + ') it introduces the first 2 (the same order) — the rest are "seen in passing" with the reason "no free NEW slot"',
      newIds.length === 2 && newIds.join() === ids(unlimited.new).slice(0, 2).join() && newIds.every(id => after['buildingBlock:' + id] && after['buildingBlock:' + id].introducedAt === TODAY) && ids(unlimited.new).slice(2).every(id => g.passing.some(x => x.id === id && /free|slot/i.test(x.why || ''))) && !ids(unlimited.new).slice(2).some(id => after['buildingBlock:' + id] && after['buildingBlock:' + id].introducedAt),
      { new: newIds, unlimited: ids(unlimited.new), passing: g.passing.map(x => x.id + ':' + x.why).slice(0, 4) })
    const carried = ['yo', 'da', 'plain-present']
    T('C6', 'a point carried over and used again is not re-introduced and not counted twice: yo, だ and the plain present keep their introduction date and their automatic date, are not in NEW, appear once in the summary (as still NEW), and each gained exactly the number of target sentences that use it as exposures (once, not twice)',
      carried.every(id => { const b = before['buildingBlock:' + id], a = after['buildingBlock:' + id], u = c.jaGrammarAnalyseTrack(trackOf().pairs).uses[id]
        return a.introducedAt === b.introducedAt && a.dueDate === b.dueDate && a.autoScheduled === b.autoScheduled && a.interval === 0 && !a.knownAt && a.exposures === b.exposures + u.target.length && a.productiveExposures === b.productiveExposures + u.target.length &&
          !newIds.includes(id) && ids(g.stillNew).filter(x => x === id).length === 1 && !g.review.concat(g.alsoUsed, g.new).some(x => x.id === id) }) && !!g.slots, { g: g.stillNew && ids(g.stillNew), slots: g.slots })
    T('C7', 'the slot count after the track: 3 carried + 2 introduced = 5 NEW, 0 free — and that is also what a third track would see (the 2 new points are NEW, not due, not reviewed)',
      newCountOf(after) === 5 && planOf(c, after, SLOTS_LEVEL, TODAY).next.length === 0 && (planOf(c, after, SLOTS_LEVEL, TODAY).stillNew || []).length === 5 && g.slots && g.slots.limit === 5 && g.slots.before === 3 && g.slots.free === 2 && g.slots.after === 5, { count: newCountOf(after), slots: g.slots })
    T('C8', 'new points come in as NEW, not as a review: no automatic review date is written for them (v774 wrote one two days out), they have no due date until the learner rates them',
      newIds.every(id => !after['buildingBlock:' + id].dueDate && !after['buildingBlock:' + id].autoScheduled && after['buildingBlock:' + id].exposures > 0), newIds.map(id => after['buildingBlock:' + id]))
    // preview, writer list and finaliser agree: the plan's 2 points are the preview's, the writer's and — when the sentences use them — the finaliser's
    { const cp = fresh(), stP = storeOf(cp, SIX, SIX.slice(0, 3)); await cp.stSet(KS, stP)
      const planP = planOf(cp, stP, SLOTS_LEVEL), gateP = cp.jaGrammarGateContext(vocab, stP, { register: 'natural', today: TODAY })
      const Rp = await mount(cp, React.createElement(cp.JaGrammarPreview, { vocab, store: stP }), 4)
      const attr = a => [...new Set(Rp.root.findAll(x => x.props && typeof x.props[a] === 'string').map(x => x.props[a]))]
      const fp = await cp.jaGrammarFinaliseTrack(trk('2026-11-25T12:00:00.000Z', ['田中さんは行く。', '山田さんは寝る。', '水を飲む。', '本を読む。']), { vocab, today: '2026-11-25' })
      T('C9', 'preview, writer list and finaliser agree: the 2 points the plan screen shows as next, the 2 the writer was allowed as new and the 2 the finaliser introduced (when the sentences use them) are the same points; the carried points are the same in the preview and the writer\'s list',
        ids(planP.next).join() === 'san,wo' && gateP.plannedIds.join() === 'san,wo' && attr('data-preview-next').join() === 'san,wo' && ids(fp.grammarInTrack.new).join() === 'san,wo' && (gateP.stillNewIds || []).join() === ids(planP.stillNew).join() && attr('data-preview-still-new').join() === (gateP.stillNewIds || []).join() && fp.grammarInTrack.slots && fp.grammarInTrack.slots.free === planP.slots.free,
        { plan: ids(planP.next), gate: gateP.plannedIds, preview: attr('data-preview-next'), still: attr('data-preview-still-new'), fin: ids(fp.grammarInTrack.new) })
      await TR.act(async () => { Rp.unmount() }) }
    // finalising the same track again changes nothing
    const snapAfter = JSON.stringify(after), again = await c.jaGrammarFinaliseTrack(fin, { vocab, today: TODAY })
    T('C10', 'finalising the same track again changes nothing (the track already carries its grammar; no point is counted or introduced a second time)', again === fin && JSON.stringify(await c.jaGrammarLoad()) === snapAfter)
    // rate none: nothing new, the carried points go into the next track and are practised again — and counted once there too
    { const cn = fresh(), five = IDS(cn).slice(0, 5), stN = storeOf(cn, five); await cn.stSet(KS, stN)
      const lines = ['私は行くか。', '水は飲むね。', 'これは本だよ。', 'あれは本だよ。', '私は走るか。']
      const f1 = await cn.jaGrammarFinaliseTrack(trk('2026-11-25T10:00:00.000Z', lines), { vocab, today: '2026-11-25' }), sN = await cn.jaGrammarLoad(), gg = f1.grammarInTrack
      T('C11', 'rate none: the next track introduces nothing (5 points still NEW), the carried points that its sentences use come back as STILL NEW and are practised again, none is re-introduced, none is counted twice, and nothing the learner has not rated is reviewed',
        gg.new.length === 0 && ids(gg.stillNew).sort().join() === ['da', 'ka', 'ne', 'wa', 'yo'].sort().join() && five.every(id => sN['buildingBlock:' + id].introducedAt === '2026-11-20' && sN['buildingBlock:' + id].dueDate === '2026-11-22' && sN['buildingBlock:' + id].interval === 0) && gg.review.length === 0 && newCountOf(sN) === 5 &&
        gg.slots && gg.slots.free === 0 && sN['buildingBlock:wa'].exposures === 2 + 5 && sN['buildingBlock:ka'].exposures === 2 + 2, { still: ids(gg.stillNew), slots: gg.slots, wa: sN['buildingBlock:wa'] }) }
    // the full cycle through the application's own functions: day 1 brings 5, none rated brings none, all rated brings 5 again
    { const cy = fresh(); await cy.stSet(KS, {})
      const d1 = await cy.jaGrammarFinaliseTrack(trackOf('2026-11-25T09:00:00.000Z'), { vocab, today: '2026-11-25' }), s1 = await cy.jaGrammarLoad()
      const d2 = planOf(cy, s1, SLOTS_LEVEL, '2026-11-26')
      const rateAll = clone(s1); IDS(cy).slice(0, 5).forEach(id => cy.jaGrammarApplyRating(rateAll, 'buildingBlock', id, 'ok'))
      const d3 = planOf(cy, rateAll, SLOTS_LEVEL, '2026-11-26')
      const two = clone(s1); IDS(cy).slice(0, 2).forEach(id => cy.jaGrammarApplyRating(two, 'buildingBlock', id, 'hard'))
      T('C12', 'the whole cycle: the first track brings 5 (は か ね よ だ), the next plan brings none while all 5 are unrated (they are carried), brings 5 once all 5 are rated, and 2 once 2 are rated',
        ids(d1.grammarInTrack.new).join() === 'wa,ka,ne,yo,da' && d2.next.length === 0 && ids(d2.stillNew).join() === 'wa,ka,ne,yo,da' && d3.next.length === 5 && planOf(cy, two, SLOTS_LEVEL, '2026-11-26').next.length === 2, { d1: ids(d1.grammarInTrack.new), d2: ids(d2.next), d3: ids(d3.next) }) }
    // a carried point that reaches 3 sentences across 2 tracks becomes known and leaves NEW in that very track
    { const ck = fresh(), five = IDS(ck).slice(0, 5), stK = storeOf(ck, five); stK['buildingBlock:wa'] = { ...stK['buildingBlock:wa'], sightings: 1, sightingTracks: ['older'] }; await ck.stSet(KS, stK)
      const fk = await ck.jaGrammarFinaliseTrack(trk('2026-11-26T10:00:00.000Z', ['私は行く。', '私は寝る。']), { vocab, today: '2026-11-26' }), sk = await ck.jaGrammarLoad()
      T('C13', 'a carried point that becomes known in this track (3 sentences across 2 tracks) is reported as BECAME KNOWN, is known in the store, and is not listed as still NEW — it left NEW',
        sk['buildingBlock:wa'].knownAt === '2026-11-26' && !!fk.grammarInTrack.becameKnown && fk.grammarInTrack.becameKnown.some(x => x.id === 'wa') && !ids(fk.grammarInTrack.stillNew).includes('wa') && newCountOf(sk) === 4, { still: ids(fk.grammarInTrack.stillNew), bk: fk.grammarInTrack.becameKnown && fk.grammarInTrack.becameKnown.map(x => x.id) }) }
    // the export names them
    const txt = exportText(c, fin)
    T('C14', 'the export lists the carried points as STILL NEW (and says how many slots were free): a line per point with its pair numbers, and the NEW (taught now) section lists only the points introduced now',
      /\nSTILL NEW \(/.test(txt) && /not rated/i.test(txt) && carried.every(id => new RegExp('STILL NEW[\\s\\S]*' + esc(lab(id))).test(txt.slice(txt.indexOf('GRAMMAR IN THIS TRACK')))) && /\nNEW \(taught now\) — 2 of 5 points used/.test(txt), txt.split('\n').filter(l => /NEW|SLOT/.test(l)).slice(0, 8))
  } catch (e) { T('C!', 'section C stopped: ' + String(e && e.message).split('\n')[0], false, String(e && e.stack).slice(0, 500)) }

  // ═══ D — THE RATING CARD ═════════════════════════════════════════════════════════════════════════════════════════════════════════
  if (!process.env.TT_PROBE) try {
    const c = fresh(), SIX = IDS(c).slice(0, 6), vocab = learner(c, SLOTS_LEVEL), lab = id => entry(c, id).label
    const stC = storeOf(c, SIX, SIX.slice(0, 3)); await c.stSet(KS, stC)
    const fin = await c.jaGrammarFinaliseTrack(trackOf('2026-11-24T08:00:00.000Z'), { vocab, today: TODAY }), g = fin.grammarInTrack
    const mountCard = async () => mount(c, React.createElement(c.JaGrammarReview, { track: fin }))
    let R = await mountCard(); const rj = textOf(R.toJSON())
    const grammarLabels = ids(g.new).concat(ids(g.stillNew)).map(lab)
    T('D1', 'the card shows every point of the track that is NEW (new now and still NEW), each with the four buttons HARD / OK / EASY / Not shown',
      grammarLabels.length === 5 && grammarLabels.every(l => !!cardOf(R, l)) && grammarLabels.every(l => ['HARD', 'OK', 'EASY', 'Not shown'].every(b => !!cardBtn(R, l, b))), grammarLabels)
    const ctl = lab('da'), snapBefore = clone(await c.jaGrammarLoad())
    await click(cardBtn(R, ctl, 'Not shown'))
    const a1 = await c.jaGrammarLoad(), da0 = snapBefore['buildingBlock:da'], da1 = a1['buildingBlock:da']
    const diff = Object.keys({ ...da0, ...da1 }).filter(f => JSON.stringify(da0[f]) !== JSON.stringify(da1[f]))
    T('D2', 'Not shown on the card: persisted immediately (read straight back from storage), difficulty and schedule untouched, the point is still NEW, no other record moved',
      diff.length >= 1 && diff.every(f => /^notShown/.test(f)) && newCountOf(a1) === newCountOf(snapBefore) && Object.keys(snapBefore).filter(k => k !== 'buildingBlock:da').every(k => JSON.stringify(a1[k]) === JSON.stringify(snapBefore[k])), { diff })
    const hardL = lab('yo'), easyL = lab('plain-present'), okL = ids(g.new)[0] && lab(ids(g.new)[0])
    await click(cardBtn(R, hardL, 'HARD')); await click(cardBtn(R, easyL, 'EASY')); await click(cardBtn(R, okL, 'OK'))
    const a2 = await c.jaGrammarLoad()
    T('D3', 'HARD, OK and EASY on the card, each persisted at once: HARD and OK put the point on the schedule (it leaves NEW), EASY makes it known (it leaves NEW and the due list) — 3 points left NEW, 2 stay (the Not shown one and the other new point)',
      a2['buildingBlock:yo'].interval === 1 && !a2['buildingBlock:yo'].knownAt && a2['buildingBlock:' + ids(g.new)[0]].interval === 2 && a2['buildingBlock:plain-present'].knownAt === NOW && newCountOf(a2) === 2 && !c.jaGrammarDue(a2, 'buildingBlock', '2099-01-01').some(r => r.itemId === 'plain-present'),
      { yo: a2['buildingBlock:yo'], pp: a2['buildingBlock:plain-present'], n: newCountOf(a2) })
    await TR.act(async () => { R.unmount() })
    // switch off: the card is the v774 card
    { const co = fresh(); co.jaGrammarNotShownSetEnabled && co.jaGrammarNotShownSetEnabled(false); await co.stSet(KS, stC)
      const fo = await co.jaGrammarFinaliseTrack(trackOf('2026-11-24T08:00:00.000Z'), { vocab, today: TODAY })
      const Ro = await mount(co, React.createElement(co.JaGrammarReview, { track: fo })), l0 = co.ev('jaGrammarEntryById')(ids(fo.grammarInTrack.new)[0]).label
      T('D4', 'Not shown switched off: the card has only HARD / OK / EASY', !!cardBtn(Ro, l0, 'HARD') && !!cardBtn(Ro, l0, 'EASY') && !cardBtn(Ro, l0, 'Not shown') && !/Not shown/.test(textOf(Ro.toJSON())))
      await TR.act(async () => { Ro.unmount() }) }
    // a conversation basic on the same card keeps its three buttons (Not shown belongs to grammar points)
    { const cb = fresh(), fb = await cb.jaGrammarFinaliseTrack(trk('2026-11-25T10:00:00.000Z', ['ねえ、行くよ。', 'ねえ、水は？', 'えっ、本当？', 'えっ、行く？']), { vocab, today: '2026-11-25' })
      const Rb = await mount(cb, React.createElement(cb.JaGrammarReview, { track: fb })), basics = (fb.grammarInTrack.basics && fb.grammarInTrack.basics.new) || []
      T('D5', 'a conversation basic on the card (a reaction word like ねえ) keeps HARD / OK / EASY only', basics.length > 0 ? basics.every(b => !!cardBtn(Rb, b.label, 'HARD') && !cardBtn(Rb, b.label, 'Not shown')) : true, basics.map(b => b.label))
      await TR.act(async () => { Rb.unmount() }) }
  } catch (e) { T('D!', 'section D stopped: ' + String(e && e.message).split('\n')[0], false, String(e && e.stack).slice(0, 500)) }

  // ═══ E — ROMAJI ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  if (!process.env.TT_PROBE) try {
    const c = fresh(), vocab = learner(c, SLOTS_LEVEL), rawRm = id => entry(c, id).romaji, rmOf = id => has(c, 'jaGrammarRomajiText') ? c.jaGrammarRomajiText({ id }) : (rawRm(id) || ''), lab = id => entry(c, id).label
    const noRomaji = IDS(c).filter(id => !rawRm(id)), two = IDS(c).filter(id => /\//.test(lab(id)))
    T('E1', 'the romaji is the STORED one (the entry\'s own romaji field, unchanged; four entries whose label has two forms but whose stored romaji has one reading get the second reading added); an entry with none gets none (the plain present, the noun-modifying clause) — nothing is guessed',
      has(c, 'jaGrammarRomajiText') && IDS(c).filter(id => rawRm(id) && !['janai', 'kamo', 'volitional', 'nominal-no'].includes(id)).every(id => rmOf(id) === rawRm(id)) && ['janai', 'kamo', 'nominal-no'].every(id => rmOf(id).startsWith(rawRm(id))) && noRomaji.every(id => rmOf(id) === '') && noRomaji.join() === 'plain-present,noun-modify', { noRomaji, none: noRomaji.map(rmOf) })
    const want = { janai: ['janai', 'dewa nai'], 'chan-kun': ['chan', 'kun'], deshita: ['datta', 'deshita'], 'o-go': ['o', 'go'], kamo: ['kamo', 'kamo shirenai'], volitional: ['-you', '-kou'], 'nominal-no': ['-no wa', '-no ga'], potential: ['-rareru', '-reru'] }
    T('E2', 'two-form entries show both readings: じゃない / ではない → janai / dewa nai, ちゃん / くん → chan / kun, だった / でした, お / ご, かも / かもしれない, 〜よう / 〜こう, 〜のは / 〜のが, 〜られる / 〜れる — every entry whose label has two forms shows two readings',
      Object.entries(want).every(([id, parts]) => parts.every(p => (rmOf(id) || '').includes(p))) && two.every(id => id === 'to-cond' || (rmOf(id) || '').includes(' / ')), two.map(id => id + ' → ' + rmOf(id)))
    // a track that uses a two-form entry, a name ending, a taught point, a point seen once, and a sentence outside the allowed grammar
    const SIX = IDS(c).slice(0, 6), stR = storeOf(c, SIX, SIX), stRaw = clone(stR)
    const lines = ['これは本じゃないよ。', 'あれも本じゃない。', 'ケンくんは行くよ。', 'ゆいちゃんは行くよね。', '行ったら言ってね。', 'これは本だよ。']
    const gateR = c.jaGrammarGateContext(vocab, stR, { register: 'natural', today: TODAY })
    await c.stSet(KS, stR)
    const finR = await c.jaGrammarFinaliseTrack(trk('2026-11-25T10:00:00.000Z', lines, { trackContext: { trackId: '2026-11-25T10:00:00.000Z', language: 'ja', grammarGate: gateR } }), { vocab, today: '2026-11-25' }), gR = finR.grammarInTrack
    const txt = exportText(c, finR), sec = txt.slice(txt.indexOf('GRAMMAR IN THIS TRACK'), txt.indexOf('TARGET VOCABULARY')), secLines = sec.split('\n')
    const withRm = id => lab(id) + ' [' + rmOf(id) + ']'
    T('E3', 'GRAMMAR IN THIS TRACK, export: every entry listed — new, also used, passing, planned before writing, not yet taught — carries its romaji in square brackets right after the Japanese (and before the English): じゃない / ではない [janai / dewa nai], ちゃん / くん [chan / kun]',
      gR.new.length > 0 && ids(gR.new).includes('janai') && ids(gR.new).includes('chan-kun') && secLines.some(l => l.includes(withRm('janai') + ' — ' + entry(c, 'janai').meaning)) && secLines.some(l => l.includes(withRm('chan-kun') + ' — ' + entry(c, 'chan-kun').meaning)) &&
      /\nALSO USED[^\n]*は \[wa\]/.test(sec) && secLines.filter(l => /^GRAMMAR NOT YET TAUGHT: pair/.test(l)).every(l => /\[[^\]]+\]( \(taught NEW at the end of this track\))?$/.test(l)) && secLines.filter(l => /^GRAMMAR NOT YET TAUGHT: pair/.test(l)).length > 0 &&
      gR.gate.planned.every(x => !rmOf(x.id) || secLines.some(l => l.startsWith('  ' + withRm(x.id) + ' — '))), { new: ids(gR.new), sample: secLines.filter(l => /janai|じゃない|ALSO|NOT YET/.test(l)).slice(0, 6) })
    // the screen of the finished track
    const Rt = await mount(c, React.createElement(c.JaGrammarInTrack, { track: finR }))
    const shown = [...new Set(Rt.root.findAll(x => x.props && typeof x.props['data-grammar-romaji'] === 'string').map(x => x.props['data-grammar-romaji']))]
    const listed = [...new Set(ids(gR.new).concat(ids(gR.review), ids(gR.alsoUsed), ids(gR.passing), ids(gR.locked), ids(gR.stillNew), gR.gate.planned.map(x => x.id), gR.gate.notTaught.map(x => x.id)))]
    const tj = ws(textOf(Rt.toJSON()))
    T('E4', 'GRAMMAR IN THIS TRACK, screen: every listed entry that has a romaji shows it (in the new, passing and not-yet-taught sections, the also-used line, the planned list and the not-yet-taught lines), in the order Japanese · romaji · English: じゃない / ではない janai / dewa nai is not cut to janai',
      listed.filter(id => rmOf(id)).every(id => shown.includes(id)) && shown.every(id => !!rmOf(id)) && new RegExp(esc(lab('janai')) + '\\s+' + esc(rmOf('janai')) + '\\s+' + esc(entry(c, 'janai').meaning)).test(tj), { missing: listed.filter(id => rmOf(id) && !shown.includes(id)) })
    await TR.act(async () => { Rt.unmount() })
    // the plan-screen preview
    const stPrev = storeOf(c, SIX, SIX.slice(0, 3), 'ok'); stPrev['buildingBlock:ka'].dueDate = '2026-01-02'; stPrev['buildingBlock:wa'].dueDate = '2026-01-01'
    const Rp = await mount(c, React.createElement(c.JaGrammarPreview, { vocab, store: stPrev }), 4), pj = ws(textOf(Rp.toJSON())), pp = planOf(c, stPrev, SLOTS_LEVEL, undefined)
    const shownP = [...new Set(Rp.root.findAll(x => x.props && typeof x.props['data-grammar-romaji'] === 'string').map(x => x.props['data-grammar-romaji']))]
    const allShown = ids(pp.review).concat(ids(pp.next), ids(pp.stillNew || []))
    T('E5', 'the plan-screen preview ("Grammar for this track"): the due points, the carried points and the next points each show their romaji after the Japanese and before the meaning',
      allShown.length >= 4 && allShown.filter(id => rmOf(id)).every(id => shownP.includes(id)) && allShown.filter(id => rmOf(id)).every(id => new RegExp(esc(lab(id)) + '\\s+' + esc(rmOf(id)) + '\\s+' + esc(entry(c, id).meaning)).test(pj)), { allShown, shownP })
    await TR.act(async () => { Rp.unmount() })
    // the Known grammar list
    const stKn = storeOf(c, ['wa', 'janai', 'chan-kun', 'plain-present']); ;['wa', 'janai', 'chan-kun', 'plain-present'].forEach(id => { stKn['buildingBlock:' + id] = { ...stKn['buildingBlock:' + id], knownAt: '2026-11-22', sightings: 3, sightingTracks: ['a', 'b'] } }); await c.stSet(KS, stKn)
    const Rk = await mount(c, React.createElement(c.WordListView, { vocab: [], lang: 'ja', initialFilter: 'all', onBack() {} }))
    await click(Rk.root.findAll(x => x.props && x.props['data-known-grammar-toggle'] && typeof x.props.onClick === 'function')[0])
    const kj = ws(textOf(Rk.toJSON()))
    T('E6', 'the Known grammar list shows the stored romaji for every known point (Japanese, then romaji, then English), both readings for two-form entries, and nothing for the plain present',
      ['wa', 'janai', 'chan-kun'].every(id => new RegExp(esc(lab(id)) + '\\s+' + esc(rmOf(id)) + '\\s+' + esc(entry(c, id).meaning)).test(kj)) && kj.includes('janai / dewa nai') && kj.includes('chan / kun') && /plain present\s+plain present \/ future/.test(kj) &&
      !Rk.root.findAll(x => x.props && x.props['data-grammar-romaji'] === 'plain-present').length, kj.slice(0, 500))
    await TR.act(async () => { Rk.unmount() })
    // the rating card
    const stCard = storeOf(c, SIX, SIX.slice(0, 3)); await c.stSet(KS, stCard)
    const finC = await c.jaGrammarFinaliseTrack(trackOf('2026-11-25T11:00:00.000Z'), { vocab, today: TODAY }), Rc = await mount(c, React.createElement(c.JaGrammarReview, { track: finC }))
    const cardIds = ids(finC.grammarInTrack.new).concat(ids(finC.grammarInTrack.stillNew)), shownC = [...new Set(Rc.root.findAll(x => x.props && typeof x.props['data-grammar-romaji'] === 'string').map(x => x.props['data-grammar-romaji']))]
    T('E7', 'the rating card: every point on it shows its romaji, and plain present (no romaji stored) shows none (no empty brackets, no guess)',
      cardIds.includes('plain-present') && cardIds.filter(id => rmOf(id)).every(id => shownC.includes(id) && tx(cardOf(Rc, lab(id))).includes(rmOf(id))) && !shownC.includes('plain-present') && !/\[\s*\]|\(\s*\)/.test(tx(cardOf(Rc, lab('plain-present')))), { cardIds, shownC })
    await TR.act(async () => { Rc.unmount() })
    // the switch
    { const co = fresh(); co.jaGrammarRomajiSetEnabled && co.jaGrammarRomajiSetEnabled(false); await co.stSet(KS, stCard)
      const Ro = await mount(co, React.createElement(co.JaGrammarReview, { track: finC })), Rp2 = await mount(co, React.createElement(co.JaGrammarPreview, { vocab, store: stPrev }), 4)
      T('E8', 'romaji switched off: no romaji on the card or in the preview (the screens are the v774 ones)', !Ro.root.findAll(x => x.props && x.props['data-grammar-romaji']).length && !Rp2.root.findAll(x => x.props && x.props['data-grammar-romaji']).length && has(co, 'jaGrammarRomajiOn') && co.jaGrammarRomajiOn() === false)
      await TR.act(async () => { Ro.unmount(); Rp2.unmount() }) }
  } catch (e) { T('E!', 'section E stopped: ' + String(e && e.message).split('\n')[0], false, String(e && e.stack).slice(0, 500)) }

  // ═══ F — THE REVIEW AREA ═════════════════════════════════════════════════════════════════════════════════════════════════════════
  if (!process.env.TT_PROBE) try {
    const c = fresh(), IDSC = IDS(c), lab = id => entry(c, id).label, rmOf = id => has(c, 'jaGrammarRomajiText') ? c.jaGrammarRomajiText({ id }) : (entry(c, id).romaji || '')
    // 4 due (rated earlier, review date passed; one not yet due; one known) and 3 still NEW
    const stF = () => { const st = {}; const put = (id, o) => { st['buildingBlock:' + id] = V774REC(id, o) }
      put('wa', { interval: 3, okStreak: 1, dueDate: '2026-11-20', autoScheduled: undefined }); put('ka', { interval: 2, okStreak: 1, dueDate: '2026-11-18', autoScheduled: undefined }); put('ne', { interval: 4, okStreak: 2, dueDate: '2026-12-30', autoScheduled: undefined })
      put('yo', { interval: 5, okStreak: 2, dueDate: '2026-11-22', knownAt: '2026-11-10', sightings: 4, sightingTracks: ['a', 'b'], autoScheduled: undefined })
      put('da'); put('plain-present'); put('san'); return st }
    const stA = stF(); await c.stSet(KS, stA)
    const list = has(c, 'jaGrammarReviewAreaList') ? c.jaGrammarReviewAreaList(stA, '2026-11-24') : null
    T('F1', 'the list behind the Review area: the grammar DUE (most overdue first: ka, wa — not the one due later, not the known one) and, as a separate group, the points still NEW that were not rated (だ, the plain present, さん) — a point is in one group only',
      !!list && ids(list.due).join() === 'ka,wa' && ids(list.newUnrated).join() === 'da,plain-present,san' && !ids(list.due).some(id => ids(list.newUnrated).includes(id)), list && { due: ids(list.due), nw: ids(list.newUnrated) })
    const Rw = await mount(c, React.createElement(c.WordListView, { vocab: [], lang: 'ja', initialFilter: 'due', onBack() {} }))
    const area = Rw.root.findAll(x => x.props && x.props['data-ja-grammar-review-area'] === '1')[0]
    const aj = area ? tx(area) : ''
    const rowOf = (kind, id) => Rw.root.findAll(x => x.props && x.props['data-review-area-' + kind] === id)[0]
    T('F2', 'Japanese Words area carries a Grammar review part with two groups — "due" and "still NEW" — each point showing Japanese, romaji, meaning and the short explanation, with the buttons HARD / OK / EASY / Not shown',
      !!area && ['ka', 'wa'].every(id => !!rowOf('due', id)) && ['da', 'plain-present', 'san'].every(id => !!rowOf('new', id)) && !rowOf('due', 'ne') && !rowOf('due', 'yo') &&
      ['wa', 'ka'].concat(['da', 'san']).every(id => { const t = tx(rowOf(id === 'wa' || id === 'ka' ? 'due' : 'new', id)); return t.includes(lab(id)) && t.includes(rmOf(id)) && t.includes(entry(c, id).meaning) && t.includes(entry(c, id).explain) && ['HARD', 'OK', 'EASY', 'Not shown'].every(b => t.includes(b)) }), { aj: aj.slice(0, 300) })
    // rating there = rating on the card: the same store, the same press, the same stored record
    const press = async (where, id, label, rating) => {
      const cc = fresh(), st = storeOf(cc, IDS(cc).slice(0, 5)); await cc.stSet(KS, st)
      if (where === 'card') {
        const track = { language: 'ja', createdAt: 'x', pairs: [], grammarInTrack: { new: IDS(cc).slice(0, 5).map(i => ({ id: i, type: 'buildingBlock', label: entry(cc, i).label, romaji: entry(cc, i).romaji, meaning: entry(cc, i).meaning, explain: entry(cc, i).explain, pairs: [3, 4], cost: 1 })), review: [], alsoUsed: [], passing: [], locked: [], basics: { new: [], review: [], alsoUsed: [], passing: [], locked: [] }, budget: { limit: 5, spent: 5 }, recorded: true } }
        const R = await mount(cc, React.createElement(cc.JaGrammarReview, { track })); await click(cardBtn(R, entry(cc, id).label, label)); await TR.act(async () => { R.unmount() })
      } else {
        const R = await mount(cc, React.createElement(cc.WordListView, { vocab: [], lang: 'ja', initialFilter: 'due', onBack() {} }))
        const row = R.root.findAll(x => x.props && x.props['data-review-area-new'] === id)[0]; const b = row && row.findAll(x => x.type === 'button' && tx(x) === label)[0]
        if (b) await click(b); await TR.act(async () => { R.unmount() })
      }
      return clone(await cc.jaGrammarLoad())
    }
    const same = []
    for (const [label, rating] of [['HARD', 'hard'], ['OK', 'ok'], ['EASY', 'easy'], ['Not shown', 'notshown']]) {
      const a = await press('card', 'ne', label, rating), b = await press('area', 'ne', label, rating)
      same.push(label + ': ' + (JSON.stringify(a) === JSON.stringify(b) && !!a['buildingBlock:ne'] && JSON.stringify(a) !== JSON.stringify(storeOf(c, IDSC.slice(0, 5))) ? 'same' : 'DIFFERENT ' + JSON.stringify(a['buildingBlock:ne']) + ' vs ' + JSON.stringify(b['buildingBlock:ne'])))
    }
    T('F3', 'rating in the Review area is rating on the card: HARD, OK, EASY and Not shown leave exactly the same stored progress through either (same function, same stored fields, same save)', same.every(x => /: same$/.test(x)), same)
    // what the area does after a rating (EASY makes it known, HARD / OK put it on the schedule, Not shown leaves it listed) and what a reload shows
    { const cr = fresh(), st = storeOf(cr, IDS(cr).slice(0, 3)); await cr.stSet(KS, st)
      const R = await mount(cr, React.createElement(cr.WordListView, { vocab: [], lang: 'ja', initialFilter: 'due', onBack() {} }))
      const b = (id, t) => { const row = R.root.findAll(x => x.props && x.props['data-review-area-new'] === id)[0]; return row && row.findAll(y => y.type === 'button' && tx(y) === t)[0] }
      await click(b('wa', 'EASY')); await click(b('ka', 'HARD')); await click(b('ne', 'Not shown')); await TR.act(async () => { R.unmount() })
      const s2 = await cr.jaGrammarLoad(), R2 = await mount(cr, React.createElement(cr.WordListView, { vocab: [], lang: 'ja', initialFilter: 'due', onBack() {} })), l2 = has(cr, 'jaGrammarReviewAreaList') ? cr.jaGrammarReviewAreaList(s2, TODAY) : { due: [], newUnrated: [] }
      T('F4', 'after rating in the area: EASY → known (gone from both groups), HARD → on the schedule (leaves the NEW group, due later), Not shown → still listed as NEW; on reopening the area the point marked "not shown" says so (it persisted)',
        !!s2['buildingBlock:wa'].knownAt && s2['buildingBlock:ka'].interval === 1 && !s2['buildingBlock:ne'].interval && ids(l2.newUnrated).join() === 'ne' && !ids(l2.due).includes('wa') && !ids(l2.newUnrated).includes('ka') &&
        !!R2.root.findAll(x => x.props && x.props['data-review-area-new'] === 'ne')[0] && /marked not shown/i.test(tx(R2.root.findAll(x => x.props && x.props['data-review-area-new'] === 'ne')[0])), { l2: { due: ids(l2.due), nw: ids(l2.newUnrated) } })
      await TR.act(async () => { R2.unmount() }) }
    // empty state, other languages, the switch
    { const ce = fresh(); await ce.stSet(KS, {}); const Re = await mount(ce, React.createElement(ce.WordListView, { vocab: [], lang: 'ja', initialFilter: 'all', onBack() {} }))
      T('F5', 'with nothing to review the area says so in a line (and offers no buttons)', !!Re.root.findAll(x => x.props && x.props['data-ja-grammar-review-area'] === '1')[0] && /nothing/i.test(tx(Re.root.findAll(x => x.props && x.props['data-ja-grammar-review-area'] === '1')[0])) && !Re.root.findAll(x => x.type === 'button' && tx(x) === 'HARD').length)
      await TR.act(async () => { Re.unmount() }) }
    { const outs = {}
      for (const lang of ['th', 'zh', 'yue']) { const cl = fresh(); await cl.stSet(KS, stF()); const R = await mount(cl, React.createElement(cl.WordListView, { vocab: [], lang, initialFilter: 'all', onBack() {} }), 6); outs[lang] = { text: textOf(R.toJSON()), area: R.root.findAll(x => x.props && x.props['data-ja-grammar-review-area']).length }; await TR.act(async () => { R.unmount() }) }
      T('F6', 'Thai, Mandarin and Cantonese word lists carry no grammar part (same rendering as with the part switched off; no review area, no Known grammar row)', Object.values(outs).every(o => o.area === 0 && !/Grammar review|Known grammar/.test(o.text)), Object.keys(outs).map(k => k + ' ' + outs[k].area)) }
    { const co = fresh(); co.jaGrammarReviewAreaSetEnabled && co.jaGrammarReviewAreaSetEnabled(false); await co.stSet(KS, stF())
      const R = await mount(co, React.createElement(co.WordListView, { vocab: [], lang: 'ja', initialFilter: 'due', onBack() {} }))
      T('F7', 'Review-area switch off: no grammar part in the Japanese Words area (the Known grammar row stays, as in v774)', !R.root.findAll(x => x.props && x.props['data-ja-grammar-review-area']).length && /Known grammar/.test(textOf(R.toJSON())) && has(co, 'jaGrammarReviewAreaOn') && co.jaGrammarReviewAreaOn() === false)
      await TR.act(async () => { R.unmount() }) }
  } catch (e) { T('F!', 'section F stopped: ' + String(e && e.message).split('\n')[0], false, String(e && e.stack).slice(0, 500)) }

  // ═══ G — SAFETY AND SWITCHES ═════════════════════════════════════════════════════════════════════════════════════════════════════
  try {
    // values of the v774 build (TT_PROBE=1 on the unchanged build prints them). Every state here has introduced-and-unrated points, the records the new rules change.
    const probe = async () => {
      const S = setup('ja'); quiet(S.c); const c = S.c; allOff(c)
      const L1 = (cc) => { const v = learner(cc, 90), st = {}; IDS(cc).slice(0, 10).forEach(id => cc.jaGrammarIntroduce(st, 'buildingBlock', id, '2026-09-01')); return { vocab: v, store: st } }
      const tg = S.vocab.find(v => v.japanese === '行く'), inv = c.japaneseLearnerInventory(S.vocab, [tg]), slots = [1, 2, 3].map(k => ({ recallIndex: k, lastFailure: '', failedSentences: [] }))
      const gate = (() => { const l = L1(c); return c.jaGrammarGateContext(l.vocab, l.store, { register: 'natural', today: TODAY }) })()
      const gp = c.buildJapaneseGroupPrompt(tg, slots, inv, S.vocab, 'natural', { initial: true, acceptedForTarget: [], usedInTrack: [], rejected: [], objectives: '', grammarProgress: {}, scenePremise: '', grammarGate: gate })
      const rp = c.buildJapaneseRecallPrompt(tg, 1, inv, S.vocab, 'natural', { objectives: '', grammarProgress: {}, grammarGate: gate })
      const R = await runGroup(S, '行く', (k, sl) => sl.map(s => s === 2 && k === 1 ? mkRecall('行ったら言ってね。', 'Tell me when you go.') : (s === 2 ? mkRecall('行くよ。', 'I am going.') : CLEAN[s])), gate)
      const cf = quiet(load(FILE, { realBelt: true, React })); allOff(cf); const l = L1(cf); await cf.stSet(KS, l.store)
      const fin = await cf.jaGrammarFinaliseTrack(trackOf(), { vocab: l.vocab, today: TODAY }), exp = exportText(cf, fin), st = await cf.jaGrammarLoad()
      const norm = s => JSON.stringify(s, (k, v) => k === 'lastSeen' ? 'D' : v)
      // ratings through the application's own function, on a state of unrated points
      const cr = quiet(load(FILE, { realBelt: true, React })); allOff(cr); const sr = storeOf(cr, IDS(cr).slice(0, 4)); ;['hard', 'ok', 'easy'].forEach((r, i) => cr.jaGrammarApplyRating(sr, 'buildingBlock', IDS(cr)[i], r))
      const ratedNorm = JSON.stringify(sr, (k, v) => (k === 'lastSeen' || (k === 'dueDate' && v !== '2026-11-22')) ? 'D' : v)
      const Rv = await mount(cf, React.createElement(cf.JaGrammarReview, { track: fin })), card = textOf(Rv.toJSON()); await TR.act(async () => { Rv.unmount() })
      const Rt = await mount(cf, React.createElement(cf.JaGrammarInTrack, { track: fin }), 4), tr = textOf(Rt.toJSON()); await TR.act(async () => { Rt.unmount() })
      const cp = quiet(load(FILE, { realBelt: true, React })); allOff(cp); const Lp = L1(cp); Lp.store['buildingBlock:wa'].dueDate = '2026-01-02'; Lp.store['buildingBlock:wa'].interval = 2; const ps = await planScreen(cp, Lp.vocab, Lp.store); await TR.act(async () => { ps.R.unmount() })
      const ck = quiet(load(FILE, { realBelt: true, React })); allOff(ck); const stk = L1(ck).store; stk['buildingBlock:wa'] = { ...stk['buildingBlock:wa'], knownAt: '2026-11-22', sightings: 4, sightingTracks: ['a', 'b'] }; await ck.stSet(KS, stk)
      const wl = {}
      const banks = { ja: [], th: ck.initVocab().slice(0, 12), zh: ck.initMandarinVocab().slice(0, 12), yue: ck.initCantoneseVocab().slice(0, 12) }
      for (const lang of ['ja', 'th', 'zh', 'yue']) { const Rl = await mount(ck, React.createElement(ck.WordListView, { vocab: banks[lang], lang, initialFilter: 'all', onBack() {} }), 8)
        if (lang === 'ja') { const tg2 = Rl.root.findAll(x => x.props && x.props['data-known-grammar-toggle'] && typeof x.props.onClick === 'function')[0]; if (tg2) await click(tg2) }
        wl[lang] = sha(textOf(Rl.toJSON())); await TR.act(async () => { Rl.unmount() }) }
      const gens = ['Generator', 'MandarinGenerator', 'CantoneseGenerator'].map(k => sha(cp.ev('(' + k + ')').toString())).join('/')
      const due = cf.jaGrammarDue({ 'buildingBlock:wa': { type: 'buildingBlock', itemId: 'wa', introducedAt: '2026-09-01', dueDate: '2026-11-20', knownAt: '2026-11-01', sightings: 5 }, 'buildingBlock:ka': { type: 'buildingBlock', itemId: 'ka', introducedAt: '2026-09-01', dueDate: '2026-11-21' } }, 'buildingBlock', TODAY).map(r => r.itemId).join()
      const tplan = cf.jaGrammarTrackPlan(l.store, 90, { today: TODAY })
      return { plan: sha(ps.text), gens, group: sha(gp.system + '\n' + gp.user), recall: sha(rp.system + '\n' + rp.user), run: sha(R.grp.slots.map(s => s.pair.japanese).join('|') + '/' + R.grp.paidCalls + '/' + R.calls.length), summary: sha(JSON.stringify(fin.grammarInTrack)), exportText: sha(exp),
        stored: sha(norm(st)), rated: sha(ratedNorm), card: sha(card), onTrack: sha(tr), wordsJa: wl.ja, wordsTh: wl.th, wordsZh: wl.zh, wordsYue: wl.yue, due, trackPlan: sha(JSON.stringify({ n: tplan.next.map(x => x.id), r: tplan.review.map(x => x.id), o: tplan.overdue, h: tplan.held })) }
    }
    if (process.env.TT_PROBE) { console.log(JSON.stringify(await probe(), null, 1)); process.exit(0) }
    const V774 = JSON.parse(fs.readFileSync(__dirname + '/fixtures/ja-grammar-v774-reference.json', 'utf8'))
    const now = await probe()
    T('G1', 'all four switches off: the writer\'s prompts (with a gate), a scripted target group, the track\'s grammar summary and export, the stored records after a track, the ratings written, the rating card, GRAMMAR IN THIS TRACK, the plan screen, the Japanese / Thai / Mandarin / Cantonese word lists and the three generator screens are exactly what the unchanged v774 build produced',
      Object.keys(V774).filter(k => k !== 'about').every(k => now[k] === V774[k]), Object.keys(V774).filter(k => k !== 'about' && now[k] !== V774[k]).map(k => k + ': now ' + now[k] + ' v774 ' + V774[k]))
    // each switch is its own: the slots off keeps the other three
    { const c1 = fresh(); c1.jaGrammarSlotsSetEnabled && c1.jaGrammarSlotsSetEnabled(false)
      const st = storeOf(c1, IDS(c1).slice(0, 5)), p = c1.jaGrammarTrackPlan(st, 200, { today: TODAY })
      T('G2', 'slots switched off = v774: five points introduced and never rated still leave 5 new points for the next track, no carried list, no slot count, rating EASY does not make a point known, and a new point still gets its automatic review date',
        p.next.length === 5 && !p.stillNew && !p.slots && (() => { const s2 = clone(st); c1.jaGrammarApplyRating(s2, 'buildingBlock', 'wa', 'easy'); return !s2['buildingBlock:wa'].knownAt && !s2['buildingBlock:wa'].ratedAt })() &&
        (() => { const an = c1.jaGrammarAnalyseTrack(trackOf().pairs), pl = c1.jaGrammarPlan(an, { known: 200, store: {}, today: TODAY }), s3 = {}; c1.jaGrammarApplyPlan(s3, pl, TODAY); return pl.new.every(x => s3['buildingBlock:' + x.id].autoScheduled === true && s3['buildingBlock:' + x.id].dueDate === '2026-11-26') && pl.new.length === 5 && !pl.stillNew })()) }
    { const c1 = fresh(); c1.jaGrammarNotShownSetEnabled && c1.jaGrammarNotShownSetEnabled(false); c1.jaGrammarRomajiSetEnabled && c1.jaGrammarRomajiSetEnabled(false); c1.jaGrammarReviewAreaSetEnabled && c1.jaGrammarReviewAreaSetEnabled(false)
      const st = storeOf(c1, IDS(c1).slice(0, 5)), p = c1.jaGrammarTrackPlan(st, 200, { today: TODAY })
      T('G3', 'the other three off, slots on: the slot rules still hold (5 unrated points → none new) — each switch is its own', p.next.length === 0 && (p.stillNew || []).length === 5 && has(c1, 'jaGrammarSlotsOn') && c1.jaGrammarSlotsOn() === true) }
    { const c1 = fresh(); c1.jaGrammarFromSentencesSetEnabled(false); const st = storeOf(c1, IDS(c1).slice(0, 5)), p = c1.jaGrammarTrackPlan(st, 200, { today: TODAY })
      T('G7', 'the sentence-based picker is the master of the slots rule: with the picker switched off (the v773 switch) nothing of the slots applies, whatever the slots switch says', c1.jaGrammarSlotsOn() === false && !p.slots && !p.stillNew && p.next.length === 5) }
    // grammar never changes the words, the pairs or the closed-vocabulary check
    {
      const cc = fresh(), vocab = learner(cc, 90), st = storeOf(cc, IDS(cc).slice(0, 8)); await cc.stSet(KS, st)
      const gate = cc.jaGrammarGateContext(vocab, st, { register: 'natural', today: TODAY })
      const inv0 = cc.japaneseLearnerInventory(vocab, vocab.slice(0, 30)), before = FIXJ.map(l => JSON.stringify(cc.japaneseCheckLine(l.ja, inv0)))
      const track = trackOf('2026-11-17T09:04:11.270Z', { trackContext: { trackId: '2026-11-17T09:04:11.270Z', language: 'ja', grammarGate: gate } })
      const sel0 = JSON.stringify(track.selectedTargetIds), kw0 = JSON.stringify(track.keywords), pairs0 = JSON.stringify(track.pairs), vocab0 = JSON.stringify(vocab)
      const fin = await cc.jaGrammarFinaliseTrack(track, { vocab, today: TODAY })
      const inv1 = cc.japaneseLearnerInventory(vocab, vocab.slice(0, 30)), after = FIXJ.map(l => JSON.stringify(cc.japaneseCheckLine(l.ja, inv1)))
      T('G4', 'grammar never changes the 30 target words, the 90 target pairs or the closed-vocabulary check — with 8 points still NEW and nothing introduced: the same words and ids, the same 99 pairs (90 target pairs), the same verdicts on all 99 lines before and after, the same vocabulary',
        JSON.stringify(fin.selectedTargetIds) === sel0 && JSON.stringify(fin.keywords) === kw0 && JSON.stringify(fin.pairs) === pairs0 && fin.pairs.filter(p => cc.jaGrammarIsTargetPair(p)).length === 90 && fin.keywords.length === 30 && JSON.stringify(before) === JSON.stringify(after) && JSON.stringify(vocab) === vocab0 && (await cc.stGet('tt-ja-vocab')) == null)
    }
    { // a real generation with the slots rule on (carried points) and off: both complete, 5 targets x 3 = 15 target pairs, the same targets
      const run = async on => { const S = setup('ja'); quiet(S.c); const c2 = S.c; if (!on) allOff(c2); await c2.stSet('tt-migrations', { 'ja-grammar-curriculum-v1': { status: 'done' } }); await c2.stSet(KS, storeOf(c2, IDS(c2).slice(0, 6), IDS(c2).slice(0, 3))); mock(S, 'ja')
        const tc = c2.jaGeneratorTrackContext(S.targets.slice(0, 5).map(t => ({ ...t, selectionRole: 'review' })), { counts: { new: 0 } }, 'daily', 'natural', c2.aiBeginRun('ja-track'))
        const res = await c2.generateJapaneseTrack(S.targets.slice(0, 5), S.vocab, 'natural', KEY, MODEL, () => {}, () => {}, { cancelled: false }, { scene: 'Two friends at a station', characterA: 'Kenji, a man', characterB: 'Yuki, a woman', opening: '', reply: '', closing: '', closing_reply: '' }, { trackContext: tc, runId: tc.generationRunId })
        return { res, S } }
      const a = await run(true), b = await run(false), tp = r => r.res.pairs.filter(p => p.isTargetPair)
      T('G5', 'a real generation with the new rules on and all off: both complete with 5 targets × 3 = 15 target pairs, the same targets, 3 uses each; grammar is not a target and adds no pair',
        a.res.complete && b.res.complete && tp(a).length === 15 && tp(b).length === 15 && a.S.targets.slice(0, 5).every(t => [1, 2, 3].every(r => tp(a).some(p => p.targetId === t.id && p.recallIndex === r))) && tp(a).map(p => p.targetId).join() === tp(b).map(p => p.targetId).join())
    }
    // the rules of the repo: no key, no access code, no model names in the new code
    const at = SRC.indexOf('v775 — GRAMMAR IS NEW UNTIL RATED'), block = at > 0 ? SRC.slice(at, at + 30000) + SRC.split('\n').filter(l => /v775/.test(l)).join('\n') : ''
    T('G6', 'the new code is marked (v775) and holds no key, no token, no access code and no model name', at > 0 && !/AIza[0-9A-Za-z_-]{20,}|sk-ant-|access[ _-]?code|claude|gemini|sonnet|opus|haiku/i.test(block))
  } catch (e) { T('G!', 'section G stopped: ' + String(e && e.message).split('\n')[0], false, String(e && e.stack).slice(0, 500)) }

  out.forEach(l => console.log(l))
  console.log('\n' + (n - fails) + '/' + n + ' passed' + (fails ? ' · ' + fails + ' FAILED' : ' — ALL PASS'))
  process.exit(fails ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
