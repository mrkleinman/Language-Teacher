// 17 Nov — "for any language that has less than 30 words learnt, just stick with the number of available words ... why would you force a newbie to learn 30" (the owner).
// A track holds min(30, the words that exist), for Thai, Japanese, Mandarin and Cantonese, Daily AND Revision:
//   Daily    = the review words that exist (due + reinforce) + the belt's new-word quota; never padded with extra unseen words or reserve / locked-belt words
//   Revision = the learned words that exist, up to 30 (a short Revision is allowed with at least one learned word; with none there is still a plain blocked / empty state)
//   a learner with 30+ learned words gets exactly what they got before: 30 targets
//   A  selection numbers per language at 0 / 1 / 12 / 40 learned words (Daily and Revision), no overflow words, the start gate lets a short track start
//   B  the contract function itself (jazh): no NEW_CEILING_OVERFLOW tier any more, blocked only when there is nothing at all
//   C  Thai: the reserve beyond 30 still replaces a failed NEW word with another NEW word, but never pads
//   D  the generator screens say once that the track is short on purpose (and say nothing for a full track)
//   E  the finaliser: a track that is short BY DESIGN is READY with its own number of targets; a track meant to hold 30 that lost words is still NOT_READY
//   F  Cantonese module tracks carry the plan and the structure check enforces it
// Real application code; the model is simulated at the Gemini boundary exactly as in tests14 (E only).
const { load } = require('./harness')
const fs = require('fs')
const React = require('react'), RDS = require('react-dom/server')
const t14 = require('./tests14')
const FILE = process.env.TT_FILE || 'tt.compiled.js'
const SRC = fs.readFileSync('tt.jsx', 'utf8')
let n = 0, fails = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; console.log((pass ? 'PASS ' : 'FAIL ') + id + '  ' + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 700) : '')) }
const html = el => RDS.renderToStaticMarkup(el).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

;(async () => {
  const c = load(FILE, { React, realBelt: true }); c.console.info = () => {}; c.console.warn = () => {}
  const ev = c.ev
  const LANGS = ['th', 'ja', 'zh', 'yue']
  const bank = { th: () => c.initVocab(), ja: () => c.initJapaneseVocab(), zh: () => c.initMandarinVocab(), yue: () => c.initCantoneseVocab() }
  const gate = ev('jazhStartGate')
  // the words a learner can have learned and that are ordinary review words: eligible, not a function word (the per-track cap on function words is its own rule and is not what is tested here),
  // not a greeting / phrase. Half of them are due, half not yet (so both "due" and "reinforce" are covered).
  function learnedPool(lang, V) {
    if (lang === 'th') {
      const el = c.thaiEligibleCandidatePool(V.map(w => ({ ...w, status: 'learning' }))).eligibleIds
      return V.filter(w => el.has(w.id) && !ev('isThaiPhraseEntry')(w) && !w.duplicateOf && w.status !== 'locked' && !ev('THAI_FUNCTION_TARGET_GUIDE')[w.thai] && !ev('thaiGreetKindOf')(w.thai))
        .sort((a, b) => (a.curriculumIndex || 1e6) - (b.curriculumIndex || 1e6) || a.id - b.id)
    }
    return ev('jazhWordsOnly')(V).filter(w => !w.duplicateOf && ev('jazhTargetEligible')(w, lang) && !ev('isJazhFunctionWord')(w, lang)).sort((a, b) => (a.unlockOrder || a.id) - (b.unlockOrder || b.id))
  }
  function learner(lang, k) {
    let V = bank[lang]().map(w => ({ ...w }))
    // a brand-new learner: nothing introduced, whatever the shipped bank carries (Thai ships with some seeded history)
    if (lang === 'th') V = V.map(w => w.status === 'locked' ? w : { ...w, status: 'new', lastSeen: null, introducedAt: null, dueDate: null, okStreak: 0, repCount: 0, lapses: 0 })
    const ids = learnedPool(lang, V).slice(0, k).map(w => w.id), set = new Set(ids)
    return { V, ids, vocab: V.map(w => set.has(w.id) ? { ...w, status: 'learning', lastSeen: '2026-11-01', introducedAt: '2026-10-01', repCount: 3, okStreak: 1, dueDate: ids.indexOf(w.id) % 2 ? '2026-11-12' : '2030-01-01', interval: 3, difficulty: 'medium' } : w) }
  }
  // what each screen computes for its Daily / Revision (the same calls, in the same order)
  function daily(lang, vocab) {
    if (lang === 'th') {
      const pk = c.pickWords(vocab, 'daily', [])
      const f = c.freezeThaiTargetSelection({ selected: pk.targets, reserve: pk.reserve, required: 30 + pk.targets.filter(w => w._phraseReview).length, mode: 'daily', noNewOverflow: true, allowShort: true })
      return { targets: f.targets, blocked: f.blocked, short: f.short, pk, f }
    }
    const sel = c.selectTrackTargets({ vocab: ev('jazhWordsOnly')(vocab), targetCap: 30, recentTrackWordIds: [], lang,
      newSelector: v => lang === 'ja' ? ev('japaneseSelectNewSlots')(v, []) : lang === 'zh' ? ev('mandarinSelectTargets')(v, []) : ev('cantoneseSelectTargets')(v, []) })
    const targets = c.jazhDailyTargets(sel.targets, vocab, lang)
    return { targets, blocked: gate({ lang, targets, vocab, trackMode: 'daily', tracks: [] }), short: targets.length < 30, sel }
  }
  function revision(lang, vocab) {
    const r = c.selectRevisionTargets(lang, vocab)
    return { targets: r.targets, blocked: lang === 'th' ? r.blocked : gate({ lang, targets: r.targets, vocab, trackMode: 'revision', tracks: [] }), r }
  }
  const isNewT = w => ev('isGenuinelyNew')(w)
  const padded = w => w._newCeilingOverflow || /^(new-reserve|bank-reserve)$/.test(w._selectorStage || '')

  // ═════ A — the numbers ════════════════════════════════════════════════════════════════════════
  for (const lang of LANGS) {
    const quota = c.newWordsPerTrack(lang, 'daily', learner(lang, 0).vocab)
    T('A0-' + lang, lang + ': the belt\'s new-word quota is a small number (the thing a new learner may be given), not 30', quota >= 1 && quota <= 7, quota)
    // 0 learned: ONLY the belt's new words
    { const L = learner(lang, 0), d = daily(lang, L.vocab)
      T('A1-' + lang, lang + ': 0 learned words ⇒ the Daily is just the belt\'s ' + quota + ' new words (no padding to 30), all new, none an overflow word, not blocked',
        d.targets.length === quota && d.targets.every(isNewT) && !d.targets.some(padded) && !d.blocked, { n: d.targets.length, quota, blocked: d.blocked && d.blocked.code, stages: d.targets.map(w => w._selectorStage || w.selectionRole) })
      const rv = revision(lang, L.vocab)
      T('A2-' + lang, lang + ': 0 learned words ⇒ a Revision has nothing to practise: no target, and it is blocked / empty in plain words (no padding with unseen words)', rv.targets.length === 0 && !!rv.blocked, { n: rv.targets.length, blocked: rv.blocked && (rv.blocked.code || rv.blocked) }) }
    // 1 learned word: a short Revision works
    { const L = learner(lang, 1), rv = revision(lang, L.vocab), d = daily(lang, L.vocab)
      T('A3-' + lang, lang + ': 1 learned word ⇒ Revision = that one word and it starts (not blocked as "not a normal short lesson"); the Daily is that word + the belt\'s new words',
        rv.targets.length === 1 && rv.targets[0].id === L.ids[0] && !rv.blocked && !rv.targets.some(isNewT) &&
        d.targets.length === 1 + quota && d.targets.some(w => w.id === L.ids[0]) && d.targets.filter(isNewT).length === quota && !d.blocked, { rev: rv.targets.length, blocked: rv.blocked, daily: d.targets.length, quota }) }
    // 12 learned: 12 + quota
    { const L = learner(lang, 12), d = daily(lang, L.vocab), rv = revision(lang, L.vocab), got = new Set(d.targets.map(w => w.id))
      T('A4-' + lang, lang + ': 12 learned words ⇒ the Daily is those 12 + the belt\'s ' + quota + ' new words = ' + (12 + quota) + ' (never padded), every learned word in it, no overflow word, the start gate lets it start',
        d.targets.length === 12 + quota && L.ids.every(id => got.has(id)) && d.targets.filter(isNewT).length === quota && !d.targets.some(padded) && !d.blocked && new Set(d.targets.map(w => w.id)).size === d.targets.length,
        { n: d.targets.length, want: 12 + quota, missing: L.ids.filter(id => !got.has(id)), new: d.targets.filter(isNewT).length, blocked: d.blocked && (d.blocked.code || d.blocked) })
      T('A5-' + lang, lang + ': 12 learned words ⇒ the Revision is those 12 (0 new), and it starts', rv.targets.length === 12 && L.ids.every(id => rv.targets.some(w => w.id === id)) && !rv.targets.some(isNewT) && !rv.blocked, { n: rv.targets.length, blocked: rv.blocked }) }
    // 40 learned: 30 as before
    { const L = learner(lang, 40), d = daily(lang, L.vocab), rv = revision(lang, L.vocab)
      T('A6-' + lang, lang + ': 40 learned words ⇒ exactly 30 targets in the Daily (as today), no overflow word, 30 distinct; and a 30-word Revision of learned words only',
        d.targets.length === 30 && new Set(d.targets.map(w => w.id)).size === 30 && !d.targets.some(padded) && !d.blocked && d.targets.filter(isNewT).length <= quota &&
        rv.targets.length === 30 && !rv.targets.some(isNewT) && !rv.blocked, { n: d.targets.length, rev: rv.targets.length, new: d.targets.filter(isNewT).length }) }
  }
  // the start gate itself (Japanese / Mandarin / Cantonese): a short Daily and a short Revision start; nothing at all is blocked; a short list although the bank holds 30 is a data problem
  for (const lang of ['ja', 'zh', 'yue']) {
    const L = learner(lang, 12), few = L.vocab.filter(w => L.ids.includes(w.id)).slice(0, 4).map(w => ({ ...w, selectionRole: 'review' }))
    const lost = gate({ lang, targets: few, vocab: learner(lang, 60).vocab, trackMode: 'revision', tracks: [] })
    T('B1-' + lang, lang + ': jazhStartGate — a short Daily and a short Revision start (null); no target at all is blocked in words; 4 targets when the bank holds 30 is still the data problem (eligible=4 required=30)',
      gate({ lang, targets: few, vocab: L.vocab, trackMode: 'daily', tracks: [] }) === null && gate({ lang, targets: few, vocab: L.vocab, trackMode: 'revision', tracks: [] }) === null &&
      (g => g && g.code === 'TRACK_SELECTION_BLOCKED' && /nothing to practise yet/.test(g.message))(gate({ lang, targets: [], vocab: L.vocab, trackMode: 'daily', tracks: [] })) &&
      (g => g && g.code === 'TRACK_SELECTION_BLOCKED')(gate({ lang, targets: [], vocab: L.vocab, trackMode: 'revision', tracks: [] })) &&
      !!lost && lost.code === 'TRACK_SELECTION_BLOCKED' && /eligible=4 required=30/.test(lost.message) && /vocabulary-data problem/.test(lost.message), lost)
    // the 3-per-day cap is untouched
    const today = new Date().toISOString(), four = [1, 2, 3, 4].map(() => ({ createdAt: today, date: today.slice(0, 10), trackMode: 'daily', language: lang, pairs: [] }))
    T('B2-' + lang, lang + ': the fourth Daily in one day is still refused, short or not', (gate({ lang, targets: few, vocab: L.vocab, trackMode: 'daily', tracks: four }) || {}).code === 'DAILY_CAP')
  }

  // ═════ B — the contract function ══════════════════════════════════════════════════════════════
  for (const lang of ['ja', 'zh', 'yue']) {
    const L = learner(lang, 0), five = L.vocab.filter(w => !ev('isJazhFunctionWord')(w, lang) && ev('jazhTargetEligible')(w, lang)).slice(0, 5).map(w => ({ ...w, selectionRole: 'new' }))
    const r = c.enforceTrackTargetContract({ targets: five }, { lang, vocab: L.vocab, mode: 'daily' })
    T('B3-' + lang, lang + ': enforceTrackTargetContract — 5 new words and nothing learned stay 5: no NEW_CEILING_OVERFLOW padding, not blocked, overflowNew 0, expectedRecalls 15, flagged short',
      r.targets.length === 5 && !r.blocked && r.counts.overflowNew === 0 && !r.backfillLog.length && r.expectedRecalls === 15 && r.short === true && r.bankCanFill === false)
    const r0 = c.enforceTrackTargetContract({ targets: [] }, { lang, vocab: L.vocab, mode: 'revision' })
    T('B4-' + lang, lang + ': with nothing learned and nothing selected the contract is blocked (the plain empty state)', r0.targets.length === 0 && r0.blocked && r0.blocked.code === 'TRACK_SELECTION_BLOCKED' && r0.blocked.eligible === 0)
    // a bank that does hold 30 learned words is still filled to 30 from review words only
    const full = learner(lang, 45).vocab, r30 = c.enforceTrackTargetContract({ targets: [] }, { lang, vocab: full, mode: 'revision' })
    T('B5-' + lang, lang + ': a learner with 45 learned words is still filled to 30 (review words only) when the list arrives empty', r30.targets.length === 30 && !r30.blocked && r30.bankCanFill === true && !r30.targets.some(isNewT))
  }
  T('B6', 'the source has no NEW_CEILING_OVERFLOW padding left in the Japanese / Mandarin / Cantonese contract, and no Cantonese-only special case in the gate',
    !/lang === 'yue' && mode === 'daily' && targets\.length > 0/.test(SRC) && !/out\.push\(\{ \.\.\.w, selectionRole: 'new', _newCeilingOverflow: true, _selectorStage: 'new-reserve' \}\)/.test(SRC))

  // ═════ C — Thai: the reserve replaces, never pads ═════════════════════════════════════════════
  {
    const L = learner('th', 0), pk = c.pickWords(L.vocab, 'daily', [])
    const wasNew = pk.targets.filter(isNewT)
    T('C1', 'Thai: 0 learned ⇒ pickWords returns only the belt\'s new words, shortByDesign, no shortfall; the reserve beyond them is still there (it replaces a failed NEW word with another NEW word)',
      pk.targets.length === wasNew.length && pk.targets.length === 3 && pk.shortByDesign === true && !pk.shortfall && pk.reserve.length > 100 && pk.reserve.some(w => w._selectorStage === 'new-reserve') && !pk.targets.some(padded), { n: pk.targets.length, reserve: pk.reserve.length })
    // a NEW word that fails at the freeze is replaced by the next NEW word (count stays), not by padding
    const victim = pk.targets.find(w => w._selectorStage === 'belt-new')
    const f = c.freezeThaiTargetSelection({ selected: pk.targets, reserve: pk.reserve, required: 30, mode: 'daily', noNewOverflow: true, allowShort: true, feasibility: w => w.id === victim.id ? { ok: false, reason: 'test: not expressible' } : { ok: true } })
    T('C2', 'Thai: a NEW word that fails the freeze is replaced by another NEW word from the reserve (still 3 targets, all new), the track stays short, not blocked, flagged short',
      f.targets.length === 3 && f.targets.every(isNewT) && !f.targets.some(w => w.id === victim.id) && !f.blocked && f.short === true && f.backfills.length === 1, { n: f.targets.length, log: f.log.slice(-3) })
    // a review word that fails with no other review word left is NOT replaced by an unseen word
    const L12 = learner('th', 12), pk12 = c.pickWords(L12.vocab, 'daily', []), rv = pk12.targets.find(w => !isNewT(w))
    const f12 = c.freezeThaiTargetSelection({ selected: pk12.targets, reserve: pk12.reserve, required: 30, mode: 'daily', noNewOverflow: true, allowShort: true, feasibility: w => w.id === rv.id ? { ok: false, reason: 'test' } : { ok: true } })
    T('C3', 'Thai: a review word that fails the freeze when no other review word is left is NOT replaced by an unseen / reserve word: the track is one shorter, no overflow, not blocked',
      f12.targets.length === pk12.targets.length - 1 && f12.targets.filter(isNewT).length === pk12.targets.filter(isNewT).length && !f12.targets.some(w => w._newCeilingOverflow || padded(w)) && !f12.blocked, { n: f12.targets.length, was: pk12.targets.length })
    // without allowShort the old contract is unchanged (weak / topic tracks): short ⇒ blocked
    const fOld = c.freezeThaiTargetSelection({ selected: pk12.targets, reserve: [], required: 30, mode: 'weak' })
    T('C4', 'Thai: without allowShort (a weak or topic track) the 30-target contract is exactly as before: a short selection with an empty reserve is blocked (ELIGIBLE_POOL_EXHAUSTED)', fOld.blocked && fOld.blocked.scope === 'ELIGIBLE_POOL_EXHAUSTED' && fOld.blocked.required === 30 && !fOld.short)
    // the Revision selector: 1 learned word ⇒ 1 target, not blocked; none ⇒ blocked
    const r1 = c.selectRevisionTargets('th', learner('th', 1).vocab), r0 = c.selectRevisionTargets('th', L.vocab)
    T('C5', 'Thai Revision: 1 learned word ⇒ that word, short, not blocked; no learned word ⇒ blocked (eligible 0)', r1.targets.length === 1 && !r1.blocked && r1.short === true && r0.targets.length === 0 && r0.blocked && r0.blocked.eligible === 0)
    // 40 learned: no short flag, the Daily is the full 30
    const d40 = daily('th', learner('th', 40).vocab)
    T('C6', 'Thai: 40 learned words ⇒ 30 targets, NOT short by design (the track keeps its full contract)', d40.targets.length === 30 && d40.pk.shortByDesign === false && d40.short === false)
    // review phrases that are due ride on top of the 30 words, exactly as before
    T('C7', 'Thai: the phrases-on-top rule is untouched (source still adds the due review phrases after the 30 words, and a track counts them as extra targets)',
      /targets = targets\.concat\(phraseReview\)/.test(SRC) && c.ev('trackTargetsRequired')('th', [{ wordId: 1, isNew: false }]) === 30)
  }

  // ═════ D — the screens say it once ════════════════════════════════════════════════════════════
  {
    const note = ev('shortTrackNote')
    const mkT = (k, role) => Array.from({ length: k }, (_, i) => ({ id: i + 1, selectionRole: role }))
    T('D1', 'shortTrackNote: new words only / review + new / review only / revision / full track / empty',
      /belt brings 5 words a day, and you have no words to review yet/.test(note(mkT(5, 'new'), false)) &&
      /belt brings 3 words a day and you have 12 words to review so far/.test(note(mkT(3, 'new').concat(mkT(12, 'review').map(w => ({ ...w, id: w.id + 100 }))), false)) &&
      /holds the 7 words you have learned so far/.test(note(mkT(7, 'review'), false)) && /This revision is short on purpose: it holds the 1 word you have learned so far/.test(note(mkT(1, 'review'), true)) &&
      note(mkT(30, 'review'), false) === null && note([], false) === null && note(mkT(31, 'review'), true) === null)
    const sel = (lang, vocab, tg, mode) => ({ vocab, targets: tg, selection: null, cred: { geminiKey: 'k' }, trackMode: mode, tracks: [], register: 'natural', onGenerated() {}, onBack() {} })
    const L5 = learner('zh', 0), d5 = daily('zh', L5.vocab)
    const hZ = html(React.createElement(c.MandarinGenerator, sel('zh', L5.vocab, d5.targets, 'daily')))
    T('D2', 'Mandarin generator: a new learner\'s Daily says "TARGETING 5 WORDS" and the short-on-purpose note once', /TARGETING 5 WORDS/.test(hZ) && (hZ.match(/short on purpose/g) || []).length === 1 && /belt brings 5 words a day/.test(hZ), hZ.slice(0, 400))
    const L40 = learner('zh', 40), h40 = html(React.createElement(c.MandarinGenerator, sel('zh', L40.vocab, daily('zh', L40.vocab).targets, 'daily')))
    T('D3', 'Mandarin generator: a full 30-word Daily says nothing about being short', /TARGETING 30 WORDS/.test(h40) && !/short on purpose/.test(h40))
    const L12 = learner('zh', 12), rv12 = revision('zh', L12.vocab), hR = html(React.createElement(c.MandarinGenerator, sel('zh', L12.vocab, rv12.targets, 'revision')))
    T('D4', 'Mandarin generator: a 12-word Revision says "TARGETING 12 WORDS" and that the revision is short on purpose', /TARGETING 12 WORDS/.test(hR) && /This revision is short on purpose: it holds the 12 words you have learned so far/.test(hR) && !/TRACK_SELECTION_BLOCKED/.test(hR), hR.slice(0, 400))
    const Ly = learner('yue', 0), hY = html(React.createElement(c.CantoneseGenerator, sel('yue', Ly.vocab, daily('yue', Ly.vocab).targets, 'daily')))
    const Ly12 = learner('yue', 12), hY12 = html(React.createElement(c.CantoneseGenerator, sel('yue', Ly12.vocab, revision('yue', Ly12.vocab).targets, 'revision')))
    T('D5', 'Cantonese generator: the Daily note is there (5 new words, nothing to review), and a short Revision gets its own note', /TARGETING 5 WORDS/.test(hY) && /short on purpose: your belt brings 5 words a day, and you have no words to review yet/.test(hY) && /This revision is short on purpose: it holds the 12 words/.test(hY12), hY12.slice(0, 300))
    // Japanese: the scene screen is the first place the targets are shown (the scene call is the only stand-in)
    const TR = require('react-test-renderer'); globalThis.IS_REACT_ACT_ENVIRONMENT = true
    const textOf = x => x == null ? '' : typeof x === 'string' ? x : Array.isArray(x) ? x.map(textOf).join(' ') : textOf(x.children)
    const cj = load(FILE, { React, realBelt: true }); cj.console.info = () => {}; cj.console.warn = () => {}
    cj.generateJapaneseScene = async () => ({ scene: 'Two friends meet', setting: 'a cafe', characterA: 'Daiki', characterB: 'Mio', opening: 'こんにちは', opening_english: 'Hello', premise: 'x' })
    const Lj = learner('ja', 0)
    let rj; await TR.act(async () => { rj = TR.create(React.createElement(cj.JapaneseGenerator, { vocab: Lj.vocab, targets: daily('ja', Lj.vocab).targets, selection: null, trackMode: 'daily', tracks: [], register: 'natural', cred: { geminiKey: 'k' }, onGenerated() {}, onBack() {} })); for (let i = 0; i < 80; i++) await new Promise(x => setImmediate(x)) })
    const tj = textOf(rj.toJSON()).replace(/\s+/g, ' ')
    T('D6', 'Japanese generator (scene screen): "TARGETING 3 WORDS" and the short-on-purpose note once, no block', /TARGETING 3 WORDS/.test(tj) && (tj.match(/short on purpose/g) || []).length === 1 && !/TRACK_SELECTION_BLOCKED/.test(tj), tj.slice(0, 400))
    await TR.act(async () => { rj.unmount() })
    // Thai: the real Generator, server-rendered
    const ct = load(FILE, { React, realBelt: true }); ct.console.info = () => {}
    const thGen = (vocab, mode, custom) => html(React.createElement(ct.Generator, { vocab, mode, customTargets: custom, onGenerated() {}, onBack() {}, apiKey: 'k', tracks: [], dailyNewWords: null, onSaveDailyNewWords() {} }))
    const lbl = h => (h.match(/Targeting[^✦↻]{0,140}/) || [''])[0].trim()
    const T0 = learner('th', 0), T12 = learner('th', 12), T40 = learner('th', 40)
    const h0 = thGen(T0.vocab, 'daily'), h12 = thGen(T12.vocab, 'daily'), h40t = thGen(T40.vocab, 'daily')
    const hr = thGen(T12.vocab, 'revision', ct.selectRevisionTargets('th', T12.vocab).targets), hr1 = thGen(learner('th', 1).vocab, 'revision', ct.selectRevisionTargets('th', learner('th', 1).vocab).targets)
    T('D7', 'Thai generator: 0 learned ⇒ "Targeting 3 words" + note; 12 learned ⇒ "Targeting 15 words" + note; 40 learned ⇒ "Targeting 30 words", no note; none of them blocked or "x of y"',
      /^Targeting 3 words/.test(lbl(h0)) && /belt brings 3 words a day, and you have no words to review yet/.test(h0) && /^Targeting 15 words/.test(lbl(h12)) && /belt brings 3 words a day and you have 12 words to review so far/.test(h12) &&
      /^Targeting 30 words/.test(lbl(h40t)) && !/short on purpose/.test(h40t) && ![h0, h12, h40t].some(h => /TRACK_SELECTION_BLOCKED|Targeting \d+ of \d+/.test(h)), { h0: lbl(h0), h12: lbl(h12), h40: lbl(h40t) })
    T('D8', 'Thai generator: a Revision of 12 words and of 1 word: "Targeting 12 words" / "Targeting 1 word" (singular), the revision note, never blocked',
      /^Targeting 12 words/.test(lbl(hr)) && /This revision is short on purpose: it holds the 12 words/.test(hr) && /^Targeting 1 word\b(?!s)/.test(lbl(hr1)) && /it holds the 1 word you have learned so far/.test(hr1) && !/TRACK_SELECTION_BLOCKED/.test(hr + hr1), { hr: lbl(hr), hr1: lbl(hr1) })
  }

  // ═════ E — the finaliser ══════════════════════════════════════════════════════════════════════
  const ADAPTER = (S, lang) => S.c.ev('TRACK_ADAPTERS')[lang]
  const fin = async (S, lang, track, adapter) => { const log = []; const t = await S.c.finaliseMainTrack(track, adapter || ADAPTER(S, lang), { vocab: S.vocab, apiKey: 'k', model: 'gemini-2.5-flash-lite', qcRan: true, onLog: m => log.push(m) }); return { t, log } }
  const plan = (planned, short) => ({ planned, shortByDesign: short, wordCap: 30 })
  for (const lang of ['th', 'ja', 'zh']) {
    // a track of 12 targets, 3 valid recalls each (the suite's own verified sentence frames)
    const S = t14.setup(lang); S.targets = S.targets.slice(0, 12)
    t14.mock(S, lang)
    const mkTrack = (tag, o = {}) => { const tr = t14.makeTrack(S, lang, { tag, ...o }); return tr }
    const a = mkTrack('-short'); a.targetPlan = plan(12, true)
    const { t: A } = await fin(S, lang, a)
    const rdA = S.c.trackReadiness(A)
    T('E1-' + lang, lang + ': a track that is SHORT BY DESIGN (12 targets, plan 12) is READY with its own number: 12 targets, 36/36 target pairs, every target 3/3, "Track ready"',
      A.integrity.status === 'READY' && A.integrity.invariants.SELECTED_TARGETS === 12 && A.integrity.counts.targetPairs === 36 && A.integrity.counts.targetPairsRequired === 36 && A.integrity.invariants.EVERY_TARGET_3_OF_3 === true &&
      rdA.ready && rdA.expectedTargetPairs === 36 && S.c.trackReadyHeadline(A).text === 'Track ready' && !A.integrity.reasons.some(r => /SELECTED_TARGETS|TARGET_PAIR_QUOTA/.test(r)), { status: A.integrity.status, reasons: A.integrity.reasons })
    { const c2 = load(FILE, { React }); c2.console.info = () => {}; const panel = html(React.createElement(c2.TrackIntegrityPanel, { track: A })), ex = S.c.trackIntegrityExportLines(A).join('\n'), rx = S.c.trackReadinessExportLines(A).join('\n')
      T('E1b-' + lang, lang + ': the panel and the exports of a short READY track count its own numbers: TARGET WORDS 12/12 · TARGET PAIRS 36/36 · Track ready (never 90)',
        /TARGET WORDS 12\/12/.test(panel) && /TARGET PAIRS 36\/36/.test(panel) && /Track ready/.test(panel) && !/\/90/.test(panel) && /TARGET PAIRS: 36\/36/.test(ex) && /TARGET PAIRS 36\/36/.test(rx) && !/NOT_READY/.test(rx), { panel: panel.slice(0, 300), ex: ex.slice(0, 200), rx }) }
    // the same 12-target track WITHOUT a plan (or planned 30): meant to hold 30, lost words ⇒ still NOT_READY, the live 30 → 26 safety net
    for (const [tag, pl, label] of [['-noplan', null, 'no plan'], ['-plan30', plan(30, false), 'a plan of 30']]) {
      const b = mkTrack(tag); if (pl) b.targetPlan = pl
      const { t: B } = await fin(S, lang, b)
      T('E2-' + lang + tag, lang + ': a track with ' + label + ' that holds only 12 targets (a full track that lost words) is NOT_READY: SELECTED_TARGETS=12 (required 30), quota 36 of 90',
        B.integrity.status === 'NOT_READY' && B.integrity.reasons.some(r => /SELECTED_TARGETS=12 \(required 30\)/.test(r)) && B.integrity.reasons.some(r => /TARGET_PAIR_QUOTA=36\/90/.test(r) || /TARGET_PAIR_QUOTA=36\/36 \(required 90\/90\)/.test(r)) && !S.c.trackReadiness(B).ready, B.integrity.reasons)
    }
    // short by design but a word was lost afterwards (plan 12, track holds 11): NOT_READY, "required 12"
    { const c11 = mkTrack('-lost'); c11.targetPlan = plan(12, true)
      c11.keywords = c11.keywords.slice(0, 11); c11.selectedTargetIds = c11.keywords.map(k => k.wordId); const gone = S.targets[11].id; c11.pairs = c11.pairs.filter(p => p.targetId !== gone)
      const { t: C } = await fin(S, lang, c11)
      T('E3-' + lang, lang + ': a short-by-design track (plan 12) that holds 11 is NOT_READY: SELECTED_TARGETS=11 (required 12) — the plan is never a blanket exemption',
        C.integrity.status === 'NOT_READY' && C.integrity.reasons.some(r => /SELECTED_TARGETS=11 \(required 12\)/.test(r)), C.integrity.reasons) }
    // the recall rule is untouched: a short track with a target at 2/3 is NOT_READY (and no model can recover it here)
    { const Sx = t14.setup(lang); Sx.targets = Sx.targets.slice(0, 12); t14.mock(Sx, lang, { noRecovery: true })
      const d = t14.makeTrack(Sx, lang, { tag: '-two', counts: { [Sx.targets[0].id]: 2 } }); d.targetPlan = plan(12, true)
      const NOREC = { ...ADAPTER(Sx, lang), recoverTargetPairs: async () => ({ accepted: [], reasons: ['recovery unavailable in this test'] }) }
      const { t: D } = await fin(Sx, lang, d, NOREC)
      T('E4-' + lang, lang + ': a short track still needs 3 valid recalls for EVERY target: one target at 2/3 ⇒ NOT_READY (35/36)', D.integrity.status === 'NOT_READY' && D.integrity.counts.targetPairs === 35 && D.integrity.counts.targetPairsRequired === 36 && D.integrity.invariants.EVERY_TARGET_3_OF_3 === false, D.integrity.reasons) }
    // helper arithmetic
    T('E5-' + lang, lang + ': trackTargetsRequired uses the plan only when it is short by design; targetPlanFor counts review phrases apart from the words',
      ev('trackTargetsRequired')(lang, [{ wordId: 1 }], [], plan(12, true)) === 12 && ev('trackTargetsRequired')(lang, [{ wordId: 1 }], [], plan(30, false)) === 30 && ev('trackTargetsRequired')(lang, [{ wordId: 1 }], []) === 30 &&
      JSON.stringify(ev('targetPlanFor')(Array.from({ length: 12 }, (_, i) => ({ id: i })))) === JSON.stringify(plan(12, true)) &&
      JSON.stringify(ev('targetPlanFor')(Array.from({ length: 30 }, (_, i) => ({ id: i })).concat([{ id: 99, _phraseReview: true }]))) === JSON.stringify(plan(31, false)) &&
      JSON.stringify(ev('targetPlanFor')(Array.from({ length: 5 }, (_, i) => ({ id: i })).concat([{ id: 99, _phraseReview: true }, { id: 98, _phraseReview: true }]))) === JSON.stringify(plan(7, true)))
  }
  // the readiness object before a track is finalised: a planned short track expects its own pairs
  T('E6', 'trackReadiness before finalisation: a track planned with 12 targets expects 36 pairs (not 90), and is not ready until it is finalised; with no plan it expects 90',
    c.trackReadiness({ targetPlan: plan(12, true), pairs: [] }).expectedTargetPairs === 36 && c.trackReadiness({ targetPlan: plan(12, true), pairs: [] }).ready === false && c.trackReadiness({ pairs: [] }).expectedTargetPairs === 90 &&
    c.trackQuotaReport([], [], { surfaceOf: k => k.thai, sentenceOf: p => p.thai }, {}, plan(12, true)).complete === false)
  T('E7', 'the screens stamp the plan on every new track (Thai, Japanese context + track object, Mandarin screen + new generator, Cantonese)',
    /targetPlan: makeTargetPlan\(keywords\.length, _selection\.short && !topic && \(mode === 'daily' \|\| mode === 'revision'\)\)/.test(SRC) && /targetPlan: targetPlanFor\(ts\) \}\)/.test(SRC) && /targetPlan: tc\.targetPlan \|\| targetPlanFor\(targets\)/.test(SRC) &&
    (SRC.match(/targetPlan: targetPlanFor\(targets\)/g) || []).length >= 2 && /targetPlan: targetPlanFor\(frozen\)/.test(SRC))

  // ═════ F — Cantonese module tracks ════════════════════════════════════════════════════════════
  {
    const Ly = learner('yue', 12), d = daily('yue', Ly.vocab), Vy = Ly.vocab
    // the module writer is switched on with the data, as tests93 does
    const zlib = require('zlib'); const DATA = JSON.parse(zlib.gunzipSync(Buffer.from(ev('YUE_MODULES_GZ'), 'base64')).toString('utf8'))
    c.yueModulesUseData(DATA); c.yueModulesSetEnabled(true)
    c.yueStrictVocabSetEnabled(false)     // starter modules not merged yet: remove this switch when they are (a learner who has been taught 12 words builds a Daily of 17 words, which only the old rule can write)
    const res = await c.generateCantoneseTrack(d.targets, Vy, () => {}, () => {}, { cancelled: false }, { startedAt: '2026-11-17T08:00:00.000Z' })
    const tr = c.cantoneseBuildTrack(res, d.targets, 'daily', '2026-11-17T08:00:00.000Z'), ck = c.cantoneseTrackCheck(tr)
    // 18 Nov (stage B-1): every track carries 4 greeting / parting pairs on top of its lesson pairs (17 x 3 = 51 + 4 = 55; 12 x 3 = 36 + 4 = 40); the structure check counts the lesson pairs (ck.pairs)
    T('F1', 'Cantonese: a 12-learned-word Daily builds a track of ' + d.targets.length + ' targets × 3 recalls, carries its plan (short by design) and passes the structure check',
      d.targets.length === 17 && tr.pairs.length === 55 && tr.pairs.filter(p => !p._framing).length === 51 && tr.targetPlan && tr.targetPlan.planned === 17 && tr.targetPlan.shortByDesign === true && ck.ok && ck.targets === 17 && ck.pairs === 51, { n: d.targets.length, plan: tr.targetPlan, problems: ck.problems })
    const lost = { ...tr, keywords: tr.keywords.slice(0, 16), targetPlan: { planned: 30, shortByDesign: false, wordCap: 30 } }
    const lostShort = { ...tr, keywords: tr.keywords.slice(0, 16) }
    T('F2', 'Cantonese: a track meant to hold 30 (plan 30) that holds 16, and a short track (plan 17) that lost one word, both fail the structure check; the 3-recall rule still applies',
      !c.cantoneseTrackCheck(lost).ok && /planned with 30/.test(c.cantoneseTrackCheck(lost).problems.join('|')) && !c.cantoneseTrackCheck(lostShort).ok && /planned with 17/.test(c.cantoneseTrackCheck(lostShort).problems.join('|')) &&
      !c.cantoneseTrackCheck({ ...tr, pairs: tr.pairs.filter((p, i) => i !== 2) }).ok &&
      // 18 Nov (stage B-1): pairs[0] is now the opening greeting, so the recall that this check drops is the first LESSON pair (index 2); it must be the 3-recall rule that fails, not the framing rule
      /recalls \(3 needed\)/.test(c.cantoneseTrackCheck({ ...tr, pairs: tr.pairs.filter((p, i) => i !== 2) }).problems.join('|')))
    const rev = revision('yue', Vy), res2 = await c.generateCantoneseTrack(rev.targets, Vy, () => {}, () => {}, { cancelled: false }, { startedAt: '2026-11-17T08:00:00.000Z' })
    const tr2 = c.cantoneseBuildTrack(res2, rev.targets, 'revision', '2026-11-17T08:00:00.000Z')
    T('F3', 'Cantonese: a 12-word Revision builds 12 × 3 = 36 recalls, 0 new words, plan 12 (short by design), structure check passes',
      rev.targets.length === 12 && tr2.pairs.length === 40 && tr2.pairs.filter(p => !p._framing).length === 36 && tr2.selectedNewTargetIds.length === 0 && tr2.targetPlan.planned === 12 && tr2.targetPlan.shortByDesign && c.cantoneseTrackCheck(tr2).ok, { n: rev.targets.length, plan: tr2.targetPlan })
    c.yueModulesSetEnabled(false); c.yueStrictVocabSetEnabled(true)
  }

  console.log((fails ? 'FAIL ' : 'ALL PASS ') + (n - fails) + '/' + n)
  process.exit(fails ? 1 : 0)
})().catch(e => { console.log('CRASH', e && e.stack || e); process.exit(2) })
