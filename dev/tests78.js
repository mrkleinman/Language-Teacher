// 12 Nov — the new Japanese (3,085 entries) and Mandarin (3,023) word banks, the phrase split, queued words and the function-word cap for both.
// Part A proves that SAVED PROGRESS AND WORD IDS SURVIVE the bank swap: a realistic saved profile is built in the OLD shape (old ids, old positions) from the
// legacy files, merged against the new bank with the app's own merge functions, and every saved id, status and SRS field is checked. Real app code, no model.
const fs = require('fs')
const { load } = require('./harness')
const c = load(process.env.TT_FILE || 'tt.compiled.js')
let n = 0, fails = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; console.log((pass ? 'PASS ' : 'FAIL ') + id + '  ' + name + (!pass && detail !== undefined ? '\n      ' + JSON.stringify(detail).slice(0, 700) : '')) }

function csv(path) {      // small RFC-4180 reader (quoted fields, doubled quotes, BOM)
  const s = fs.readFileSync(path, 'utf8').replace(/^﻿/, ''), rows = []
  let row = [], f = '', q = false
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (q) { if (ch === '"') { if (s[i + 1] === '"') { f += '"'; i++ } else q = false } else f += ch }
    else if (ch === '"') q = true
    else if (ch === ',') { row.push(f); f = '' }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && s[i + 1] === '\n') i++; row.push(f); f = ''; if (row.length > 1 || row[0] !== '') rows.push(row); row = [] }
    else f += ch
  }
  if (f || row.length) { row.push(f); rows.push(row) }
  const h = rows.shift(); return rows.map(r => Object.fromEntries(h.map((k, i) => [k, r[i] === undefined ? '' : r[i]])))
}
const legacyJa = csv('japanese-modules/japanese-legacy-bank.csv'), legacyZh = csv('mandarin-modules/mandarin-legacy-bank.csv')

// ── the OLD saved profile: what initJapaneseVocab produced before the swap (old id, old position = unlockOrder), with real learning history on top ──────────────
function oldSaved(legacy, lang) {
  return legacy.map((r, i) => {
    const id = +r.app_id, w = lang === 'ja'
      ? { id, unlockOrder: +r.csv_id, japanese: r.word, reading: r.reading, romaji: '', english: 'old text', lemma: r.word, note: r.note || null, belt: 'White', beltOrder: 1, curriculumIndex: +r.csv_id,
          partOfSpeech: r.partOfSpeech || null, conjugationClass: r.conjugationClass || null, permittedForms: null }
      : { id, unlockOrder: +r.csv_id, chinese: r.word, pinyin: r.pinyin, english: 'old text', partOfSpeech: r.partOfSpeech || null, note: r.note || null, belt: 'White', beltOrder: 1, curriculumIndex: +r.csv_id }
    Object.assign(w, { okStreak: 0, manualKnown: false, status: 'new', interval: 0, repCount: 0, lapses: 0, lastSeen: null, dueDate: null, difficulty: 'hard' })
    const k = i % 8
    if (k === 0) Object.assign(w, { status: 'known', interval: 60, repCount: 9, okStreak: 7, lapses: 1, lastSeen: '2026-11-05', dueDate: '2027-01-04', introducedAt: '2026-08-02', difficulty: 'easy' })
    else if (k === 1) Object.assign(w, { status: 'known', manualKnown: true, okStreak: 7, interval: 30, repCount: 4, lastSeen: '2026-10-20', dueDate: '2026-11-19', introducedAt: '2026-09-01' })
    else if (k === 2) Object.assign(w, { status: 'learning', interval: 3, repCount: 2, okStreak: 2, lapses: 0, lastSeen: '2026-11-10', dueDate: '2026-11-13', introducedAt: '2026-11-01', difficulty: 'medium' })
    else if (k === 3) Object.assign(w, { status: 'lapsed', interval: 1, repCount: 6, okStreak: 0, lapses: 3, lastSeen: '2026-11-11', dueDate: '2026-11-12', introducedAt: '2026-09-15', difficulty: 'hard' })
    else if (k === 4) Object.assign(w, { status: 'new', repCount: 1, lastSeen: '2026-11-11', difficulty: 'hard', introducedAt: '2026-11-11' })     // rated Hard: holds its new-word slot
    else if (k === 5) Object.assign(w, { queuedNext: '2026-11-11T09:00:00.000Z' })
    return w
  })
}
const SRS = ['status', 'interval', 'repCount', 'okStreak', 'lapses', 'lastSeen', 'dueDate', 'introducedAt', 'manualKnown', 'difficulty', 'queuedNext']
function survival(tag, lang, legacy, mergeFn, textKey) {
  const saved = oldSaved(legacy, lang), snap = JSON.parse(JSON.stringify(saved))
  const merged = c.ev(mergeFn)(saved)
  const byId = new Map(merged.map(w => [w.id, w]))
  T(tag + '1', 'the merged list has every saved id exactly once (' + saved.length + ' saved ids)', merged.length === new Set(merged.map(w => w.id)).size && snap.every(s => byId.has(s.id)))
  const lost = []
  snap.forEach(s => { const m = byId.get(s.id); SRS.forEach(k => { if ((s[k] === undefined ? null : s[k]) !== (m[k] === undefined ? null : m[k]) && !(s[k] == null && m[k] == null)) lost.push(s.id + '.' + k + ' ' + s[k] + '→' + m[k]) }) })
  T(tag + '2', 'every saved status / interval / repetition / streak / lapse / date / manual-known / queued flag is carried over unchanged', lost.length === 0, lost.slice(0, 6))
  const moved = snap.filter(s => byId.get(s.id)[textKey] !== s[textKey])
  T(tag + '3', 'each saved id still points at the SAME word (headword unchanged) — no progress can land on another word', moved.length === 0, moved.slice(0, 5).map(s => s.id))
  const pos = snap.filter(s => byId.get(s.id).unlockOrder !== +legacy.find(r => +r.app_id === s.id).csv_id)
  T(tag + '4', 'each of those words takes its curriculum position from the new list (unlockOrder = its row)', pos.length === 0, pos.slice(0, 5).map(s => s.id))
  T(tag + '5', 'the bank text now comes from the new list (the stale saved text is replaced), not from the saved copy', snap.every(s => byId.get(s.id).english !== 'old text'))
  const again = c.ev(mergeFn)(JSON.parse(JSON.stringify(merged)))
  T(tag + '6', 'round trip: merging the merged profile again changes nothing (idempotent, 0 differences)', JSON.stringify(again) === JSON.stringify(merged))
  const fresh = merged.filter(w => !byId.has(-1) && !snap.some(s => s.id === w.id))
  T(tag + '7', 'the new words arrive untouched: status new, no history, not queued', fresh.length > 2800 && fresh.every(w => w.status === 'new' && !w.lastSeen && !w.dueDate && !w.queuedNext && (w.repCount || 0) === 0), fresh.length)
  const noRun = c.ev(mergeFn)([])
  T(tag + '8', 'a first-time learner (nothing saved) gets the full bank: ' + noRun.length + ' entries', noRun.length === (lang === 'ja' ? 3085 : 3023))
  return { saved, snap, merged, byId }
}
const J = survival('A', 'ja', legacyJa, 'mergeJapaneseVocab', 'japanese')
const Z = survival('B', 'zh', legacyZh, 'mergeMandarinVocab', 'chinese')

// the old Japanese ids were NOT the list's row numbers (old id 4 = 食べる, row 4 = 何): prove the mapping is what protects the learner
const reordered = legacyJa.filter(r => r.app_id !== r.csv_id)
T('A9', 'the setup is real: ' + reordered.length + ' of the 200 Japanese words have a saved id different from their row in the new list', reordered.length > 80, reordered.length)
const w4 = J.byId.get(4), r4 = J.byId.get(6)
T('A10', 'saved id 4 is still 食べる (not 何, the new list\'s row 4) and keeps its history; 何 keeps its own id 6', w4.japanese === '食べる' && w4.unlockOrder === 6 && r4.japanese === '何' && r4.unlockOrder === 4 && J.snap[3].status === w4.status)
const ids = new Set(J.merged.map(w => w.id))
T('A11', 'no new Japanese word reuses a saved id: the 2,885 new words sit on ids ≥ 201', J.merged.filter(w => !J.snap.some(s => s.id === w.id)).every(w => w.id > 200), null)
T('A12', 'Mandarin ids are the list rows: ids 1–100 unchanged and in the same position', Z.snap.every(s => Z.byId.get(s.id).unlockOrder === s.id))

// ── slots saved before the swap ("today's new words") and the queued words still resolve to the same words ────────────────────────────────────────────────────────
{
  const slotIds = J.snap.filter(s => s.repCount === 1 && s.status === 'new').slice(0, 3).map(s => s.id)       // words rated Hard: they hold their slot
  const sel = c.ev('japaneseSelectNewSlots')(J.merged, slotIds)
  T('A13', 'saved Japanese new-word slots are carried: the same words come back first', slotIds.every(id => sel.some(w => w.id === id)) && sel.slice(0, slotIds.length).every(w => slotIds.includes(w.id)), { slotIds, got: sel.map(w => w.id) })
  const zslot = Z.snap.filter(s => s.repCount === 1 && s.status === 'new').slice(0, 3).map(s => s.id)
  const zsel = c.ev('mandarinSelectTargets')(Z.merged, zslot)
  T('A14', 'saved Mandarin new-word slots are carried: the same words come back first', zslot.every(id => zsel.some(w => w.id === id)), { zslot, got: zsel.map(w => w.id) })
  const q = J.merged.filter(w => w.queuedNext).map(w => w.id), q0 = J.snap.filter(s => s.queuedNext).map(s => s.id)
  T('A15', 'queued ("Next in queue") words are the same set before and after', q.length === q0.length && q0.every(id => q.includes(id)), { q0: q0.length, q: q.length })
}

// ── a saved TRACK refers to words by id: its keywords still resolve to the same headwords ────────────────────────────────────────────────────────────────────────────
{
  const track = { keywords: J.snap.filter((s, i) => i % 7 === 0).map(s => ({ wordId: s.id, japanese: s.japanese })) }
  T('A16', 'every word a saved Japanese track points at (by id) is still the same word in the new bank', track.keywords.every(k => J.byId.get(k.wordId).japanese === k.japanese), track.keywords.length)
}

// ── the bank itself ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
{
  const jb = c.ev('initJapaneseVocab()'), zb = c.ev('initMandarinVocab()')
  const jw = jb.filter(w => w.entryType !== 'phrase' && w.entryType !== 'spare'), zw = zb.filter(w => w.entryType !== 'phrase')
  T('A17', 'Japanese: 3,050 syllabus words, 18 phrases, 17 spare words; Mandarin: 3,000 words, 23 phrases', jw.length === 3050 && jb.filter(w => w.entryType === 'phrase').length === 18 && jb.filter(w => w.entryType === 'spare').length === 17 && zw.length === 3000 && zb.filter(w => w.entryType === 'phrase').length === 23)
  const belts = lst => { const o = {}; lst.forEach(w => { o[w.belt] = (o[w.belt] || 0) + 1 }); return o }
  const want = { 'White': 100, 'Orange': 100, 'Orange + Stripe': 200, 'Blue': 200, 'Blue + Stripe': 200, 'Yellow': 200, 'Yellow + Stripe': 200, 'Green': 325, 'Green + Stripe': 325, 'Brown': 325, 'Brown + Stripe': 325 }
  const ok = b => Object.keys(want).every(k => b[k] === want[k])
  T('A18', 'both banks fill the eleven belts exactly (100,100,200,200,200,200,200,325,325,325,325); phrases and spares sit outside them', ok(belts(jw)) && ok(belts(zw)), [belts(jw), belts(zw)])
  T('A19', 'ids are unique in both banks', new Set(jb.map(w => w.id)).size === jb.length && new Set(zb.map(w => w.id)).size === zb.length)
  T('A20', 'every Japanese entry has a kana reading and romaji; every Mandarin entry has pinyin', jb.every(w => w.reading && w.romaji) && zb.every(w => w.pinyin))
  T('A21', 'verbs carry a conjugation class the app\'s conjugator knows (godan / ichidan / irregular / godan-iku)', jb.filter(w => w.conjugationClass).every(w => /^(godan|godan-iku|ichidan|irregular-suru|irregular-kuru|irregular-aru|irregular-ii)$/.test(w.conjugationClass)))
  const conj = c.ev('japaneseConjugate')
  T('A22', 'the conjugator works on new verbs (読む → 読んだ, 食べる → 食べた, 買う → 買った)', conj('買う', 'godan').includes('買った') && conj('食べる', 'ichidan').includes('食べた'))
}

// negative control for A3: if two saved ids were re-keyed (the failure this swap must never cause) the headword check above WOULD catch it
{
  const swapped = J.merged.map(w => w.id === 4 ? { ...w, id: 6 } : w.id === 6 ? { ...w, id: 4 } : w)
  const m = new Map(swapped.map(w => [w.id, w]))
  T('A23', 'control: the survival check fails when two saved ids are swapped (so a pass above means something)', J.snap.filter(s => m.get(s.id).japanese !== s.japanese).length === 2)
}

// ═══ Part B — the phrase split ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const today = new Date().toISOString().slice(0, 10), future = '2027-06-01'
function learner(lang, maxPos, o = {}) {      // everything up to curriculum position maxPos is known and not due; the rest untouched
  const v = lang === 'ja' ? c.ev('initJapaneseVocab()') : c.ev('initMandarinVocab()')
  v.forEach(w => { if (w.entryType !== 'phrase' && w.curriculumIndex >= 1 && w.curriculumIndex <= maxPos) Object.assign(w, { status: 'known', interval: 30, repCount: 6, okStreak: 7, lastSeen: '2026-11-01', introducedAt: '2026-09-01', dueDate: future }) })
  return v
}
function daily(lang, v) {      // the Daily as the Japanese / Mandarin screens build it: shared selector on the words, then the Thai-order composition
  const words = c.ev('jazhWordsOnly')(v)
  const slotsFn = lang === 'ja' ? c.ev('japaneseSelectNewSlots') : c.ev('mandarinSelectTargets')
  const sel = c.ev('selectTrackTargets')({ vocab: words, targetCap: c.ev('TRACK_TARGET_CAP'), recentTrackWordIds: [], lang, newSelector: x => slotsFn(x, []) })
  return { sel, targets: c.ev('jazhDailyTargets')(sel.targets, v, lang) }
}
const isPhrase = w => w.entryType === 'phrase'
for (const [L, tag] of [['ja', 'C'], ['zh', 'D']]) {
  const v = learner(L, 100)       // White complete → the learner is at 10th Kyu (Orange): 5 new places
  const rank = c.ev('currentRankName')(v)
  T(tag + '1', L + ': the setup reads 10th Kyu / Orange (White complete)', rank === 'Orange', rank)
  const d = daily(L, v)
  const ph = d.targets.filter(isPhrase)
  T(tag + '2', L + ': a Daily is 30 targets, with exactly ONE new phrase taught inside the new-word places (no review phrase yet)', d.targets.length === 30 && ph.length === 1 && ph[0]._selectorStage === 'phrase-new' && ph[0].selectionRole === 'new', { n: d.targets.length, ph: ph.map(p => p.id + ':' + p._selectorStage) })
  T(tag + '3', L + ': the new places still total the Orange allowance (5): 4 new words + the new phrase', d.targets.filter(w => w.selectionRole === 'new').length === 5, d.targets.map(w => w.selectionRole).join(','))
  T(tag + '4', L + ': the new phrase is one whose home belt the learner has reached (Orange or earlier), never a later one', ph[0] && c.ev('jazhPhraseHomeIndex')(ph[0]) <= 1, ph[0] && ph[0].homeBelt)
  T(tag + '5', L + ': the word pipeline never contains a phrase (the 29 other targets are all words)', d.sel.targets.every(w => !isPhrase(w)) && d.targets.filter(w => !isPhrase(w)).length === 29)

  // review phrases: 7 phrases learnt and due → up to 5 ride ON TOP of the 30
  const v2 = learner(L, 100), phr = v2.filter(isPhrase)
  phr.slice(0, 7).forEach((p, i) => Object.assign(p, { status: 'learning', repCount: 2, lastSeen: '2026-11-01', introducedAt: '2026-10-01', dueDate: '2026-11-0' + (i + 1) }))
  const d2 = daily(L, v2), rev2 = d2.targets.filter(w => w._phraseReview)
  T(tag + '6', L + ': 7 phrases due → 5 review phrases ride on top: 35 targets (30 words + 5), oldest due first', d2.targets.length === 35 && rev2.length === 5 && rev2.map(w => w.id).join() === phr.slice(0, 5).map(p => p.id).join(), { n: d2.targets.length, rev: rev2.map(w => w.id) })
  T(tag + '7', L + ': with phrases due the new place goes to a new phrase only if one is available — the 30 words keep the new-word allowance', d2.targets.filter(w => !isPhrase(w)).length >= 29 && d2.targets.filter(w => w.selectionRole === 'new').length === 5)

  // the finaliser's target count: 30 + the review phrases that are not new (Thai's rule), with each language reading its OWN phrase ids
  const kws = d2.targets.map(t => ({ wordId: t.id, isNew: t.selectionRole === 'new' }))
  const newIds = kws.filter(k => k.isNew).map(k => k.wordId)
  T(tag + '8', L + ': trackTargetsRequired = 30 + 5 review phrases (the integrity check no longer demands exactly 30)', c.ev('trackTargetsRequired')(L, kws, newIds) === 35, c.ev('trackTargetsRequired')(L, kws, newIds))
  T(tag + '9', L + ': ids collide with Thai — the same keywords read as plain words for a language without that phrase id list', c.ev('trackTargetsRequired')('th', kws, newIds) !== undefined && c.ev('trackTargetsRequired')(L === 'ja' ? 'zh' : 'ja', [{ wordId: 9999, isNew: false }], []) === 30)

  // a learner at White (Mukyu) is not offered phrases whose home is a later belt
  const v0 = learner(L, 0), d0 = daily(L, v0)
  T(tag + '10', L + ': a Mukyu learner (nothing learnt) gets no new phrase (their home belts are Orange and later) and a plain 30', d0.targets.length === 30 && d0.targets.filter(isPhrase).length === 0, d0.targets.filter(isPhrase).map(p => p.homeBelt))

  // revision tracks hold words only
  const rv = c.ev('selectRevisionTargets')(L, v2)
  T(tag + '11', L + ': a Revision track never contains a phrase, even with phrases due', rv.targets.length > 0 && rv.targets.every(w => !isPhrase(w)), rv.targets.filter(isPhrase).map(p => p.id))

  // dashboards: the word figures count words only; the phrases are counted apart
  const st = c.ev('getStats')(v2)
  T(tag + '12', L + ': dashboard figures: Words = words only, phrases counted apart (' + (L === 'ja' ? 18 : 23) + ' phrases, 7 due)', st.total === v2.filter(w => !isPhrase(w)).length && st.phrases && st.phrases.total === (L === 'ja' ? 18 : 23) && st.phrases.due === 7, st.phrases)

  // a QUEUED phrase is taught inside the new words / reviewed first
  const v3 = learner(L, 100), qp = v3.filter(isPhrase).find(p => c.ev('jazhPhraseHomeIndex')(p) === 3)      // a Blue phrase: not offered yet…
  qp.queuedNext = '2026-11-12T08:00:00Z'
  const d3 = daily(L, v3)
  T(tag + '13', L + ': a phrase the learner queued is taught next even though its home belt is not reached yet', d3.targets.some(w => w.id === qp.id && w._selectorStage === 'phrase-new'), d3.targets.filter(isPhrase).map(p => p.id + ':' + p._selectorStage))
}

// Thai is untouched by all of this
{
  const tv = c.initVocab()
  T('E1', 'Thai: no Thai bank entry is mistaken for a Japanese / Mandarin phrase (the new helpers are inert for Thai)', tv.every(w => !c.ev('isJazhPhraseEntry')(w)) && c.ev('jazhWordsOnly')(tv) === tv)
  const thKws = [{ wordId: 97, isNew: false }, { wordId: 98, isNew: false }, { wordId: 99, isNew: true }, { wordId: 5, isNew: false }]
  T('E2', 'Thai: trackTargetsRequired counts Thai review phrases exactly as before (ids 97 and 98 are Thai phrases, 99 is new → 32)', c.ev('trackTargetsRequired')('th', thKws, [99]) === 32, c.ev('trackTargetsRequired')('th', thKws, [99]))
  const gs = c.ev('getStats')(tv)
  T('E3', 'Thai: the dashboard figures still split words from phrases the Thai way', gs.phrases && gs.phrases.total > 100 && gs.total + gs.phrases.total === tv.length)
}

// ═══ Part C — queued words and the function-word cap ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
for (const [L, tag] of [['ja', 'F'], ['zh', 'G']]) {
  const v = learner(L, 100), words = c.ev('jazhWordsOnly')(v)
  const unseen = words.filter(w => w.status === 'new').sort((a, b) => a.unlockOrder - b.unlockOrder)
  const old = words.filter(w => w.status === 'known').slice(0, 40)
  // queue: one unseen word from far down the list, one learnt word
  const farNew = unseen[60], oldQ = old[10]
  const q = c.ev('thaiQueueApply')(v, new Set([farNew.id, oldQ.id]), true, '2026-11-12T07:00:00Z').vocab
  T(tag + '1', L + ': queuing a word sets queuedNext on that record only', q.filter(w => w.queuedNext).map(w => w.id).sort().join() === [farNew.id, oldQ.id].sort().join())
  const d = daily(L, q)
  T(tag + '2', L + ': queued words lead the Daily (the new one and the learnt one are the first two targets)', [d.targets[0].id, d.targets[1].id].sort().join() === [farNew.id, oldQ.id].sort().join() && d.targets[0]._selectorStage === 'queued', d.targets.slice(0, 3).map(w => w.id + ':' + w._selectorStage))
  T(tag + '3', L + ': the new-word allowance still holds (a queued new word takes one of the 5 places; another new word gives way)', d.targets.filter(w => !isPhrase(w) && w.selectionRole === 'new').length + d.targets.filter(isPhrase).filter(w => w.selectionRole === 'new').length === 5 && d.targets.length === 30, d.targets.map(w => w.selectionRole).join(','))
  const track = { selectedTargetIds: d.targets.map(t => t.id) }
  const cleared = c.ev('thaiQueueClearUsed')(q, track)
  T(tag + '4', L + ': once a Daily has used them the queued words leave the queue', cleared && cleared.every(w => !w.queuedNext))
  // the queue survives a reload (merge against the bank)
  const reload = c.ev(L === 'ja' ? 'mergeJapaneseVocab' : 'mergeMandarinVocab')(JSON.parse(JSON.stringify(q)))
  T(tag + '5', L + ': the queue survives a reload of the saved profile (merge keeps queuedNext)', reload.filter(w => w.queuedNext).map(w => w.id).sort().join() === [farNew.id, oldQ.id].sort().join())

  // function-word cap: 5 function words among the targets → 2 stay (3 skipped); a NEW one over the cap is replaced by the next unseen non-function word
  const fnPos = L === 'ja' ? 'pronoun' : 'conjunction'
  const pool = c.ev('jazhWordsOnly')(learner(L, 400)).filter(w => w.partOfSpeech === fnPos)
  const some = pool.slice(0, 5).map((w, i) => ({ ...w, selectionRole: i === 4 ? 'new' : 'due', status: i === 4 ? 'new' : 'known' }))
  const plain = unseen.filter(w => !c.ev('isJazhFunctionWord')(w, L)).slice(0, 25).map(w => ({ ...w, selectionRole: 'reinforce' }))
  const cap = c.ev('jazhCapFunctionWords')(some.concat(plain), L, words)
  const kept = cap.kept.filter(w => c.ev('isJazhFunctionWord')(w, L))
  T(tag + '6', L + ': at most 2 function-word targets (' + fnPos + 's) per track; the others are skipped and stay due', kept.length === 2 && cap.dropIds.size === 3 && cap.kept.length === 27 + 1, { kept: kept.length, dropped: cap.dropIds.size, total: cap.kept.length })
  const repl = cap.kept.find(w => w._selectorStage === 'function-cap-replacement')
  T(tag + '7', L + ': a NEW function word over the cap is replaced by the next unseen non-function word (new count unchanged)', repl && repl.selectionRole === 'new' && !c.ev('isJazhFunctionWord')(repl, L) && cap.kept.filter(w => w.selectionRole === 'new').length === 1, repl && repl.id)
  const qf = pool[5] && { ...pool[5], queuedNext: '2026-11-12T07:00:00Z' }
  const cap2 = c.ev('jazhCapFunctionWords')(some.slice(0, 2).concat(qf ? [{ ...qf, selectionRole: 'due', status: 'known' }] : [], plain.slice(0, 3)), L, words)
  T(tag + '8', L + ': a function word the learner queued by hand is exempt from the cap', !qf || cap2.kept.some(w => w.id === qf.id))
}

// the screens: Scene Ready lists phrases as basics, the dashboards show a phrase line, the word list can queue and filter
;(async () => {
  const React = require('react'), TR = require('react-test-renderer')
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  const FILE = process.env.TT_FILE || 'tt.compiled.js'
  const textOf = x => x == null ? '' : typeof x === 'string' ? x : Array.isArray(x) ? x.map(textOf).join(' ') : textOf(x.children)
  const flush = async (k = 120) => { for (let i = 0; i < k; i++) await new Promise(r => setImmediate(r)) }
  const txt = r => textOf(r.toJSON()).replace(/\s+/g, ' ')
  const cr = load(FILE, { React }); cr.console.info = () => {}
  const v = learner('ja', 100), d = daily('ja', v)
  // Scene Ready's target list (a real render): the phrase sits under "Conversation basics", the 29 words are chips
  let r1
  await TR.act(async () => { r1 = TR.create(React.createElement(cr.GenTargetPreview, { targets: d.targets, availableCount: 100, textOf: w => w.japanese, subOf: w => w.reading })) })
  const t1 = txt(r1), pw = d.targets.find(isPhrase)
  T('H1', 'Scene Ready: the phrase is shown under "Conversation basics", not as a word chip, and the header counts the 29 words', /Conversation basics/.test(t1) && t1.includes(pw.japanese) && /TARGETING 29 WORDS/.test(t1), t1.slice(0, 240))
  // the real dashboards, mounted from a saved profile that contains learnt phrases
  const KEY = 'AIzaSyTEST-harness-key-000000'
  for (const [L, Teacher, key] of [['ja', 'JapaneseTeacher', 'JA'], ['zh', 'MandarinTeacher', 'ZH']]) {
    const cc = load(FILE, { React }); cc.console.info = () => {}
    const vv = learner(L, 100); vv.filter(isPhrase).slice(0, 3).forEach((p, i) => Object.assign(p, { status: 'learning', repCount: 2, lastSeen: '2026-11-01', introducedAt: '2026-10-01', dueDate: '2026-11-0' + (i + 1) }))
    cc.localStorage.setItem(cc.ev(key + '.vocab'), JSON.stringify(vv)); cc.localStorage.setItem('tt-gemini-key', JSON.stringify(KEY))
    let r; await TR.act(async () => { r = TR.create(React.createElement(cc[Teacher], { lang: L, onSetLang: () => {} })); await flush(80) })
    const t = txt(r), nWords = vv.filter(w => !isPhrase(w)).length
    T('H2' + L, L + ' dashboard: a Phrases line ("3 learnt of ' + (L === 'ja' ? 18 : 23) + ' · 3 due") and the Words tile counts words only (' + nWords + ')', t.includes('Phrases') && t.includes('3 learnt of ' + (L === 'ja' ? 18 : 23)) && t.includes('3 due') && t.includes(String(nWords)), t.slice(0, 320))
    await TR.act(async () => { r.unmount() })
  }
  const src = require('fs').readFileSync('tt.jsx', 'utf8')
  T('H3', 'both word lists (Japanese and Mandarin) get the queue button and the phrases / queued chips', /WordListView vocab=\{vocab\} lang="ja"[\s\S]{0,160}?onVocabUpdate=\{saveVocabJa\}/.test(src) && /WordListView vocab=\{vocab\} lang="zh"[\s\S]{0,160}?onVocabUpdate=\{saveVocabZh\}/.test(src) && /data-queue-word=\{w\.id\} onClick=\{\(\) => queueWord/.test(src))
  console.log('\nja/zh word banks: ' + (n - fails) + '/' + n + (fails ? ' — FAILURES' : ' — ALL PASS'))
  process.exit(fails ? 1 : 0)
})()
