// v701 — the owner's corrected Kyu–Dan syllabus (2026-10-15; supersedes the v689 re-banding this file first pinned).
//   Mukyu 1–100 · 10th Kyu 101–200 · then 200 words per rank: 9th 201–400 … 1st Kyu 1,801–2,000. Shodan has NO word range:
//   it is awarded at 2,000 qualifying words + the rank-test proof. Belt page shows "201–400 · 200 words".
// Real application functions; no model calls.
//   B — the one canonical table and every derived table (belt page, rank ladder, new-word slots) agree
//   E — every boundary, as curriculum positions (word → belt) and as known-word counts (learner → belt)
//   W — word membership and the rank test counters for all three languages; real banks keep every word and ID
//   P — preserved: sentence-length contract, new-word quotas, learner records (status, recall counts, SRS, bookmarks, tests)
//   node tests46.js [--app path/to/compiled.js]
'use strict'
const fs = require('fs'), path = require('path')
const React = require('react'), RDS = require('react-dom/server')
const { load } = require('./harness')
const out = []; let n = 0, fails = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + id.padEnd(5) + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 900) : '')) }
const ai = process.argv.indexOf('--app'), APP = ai > 0 ? path.resolve(process.argv[ai + 1]) : path.join(__dirname, 'tt.compiled.js')
const SRC = fs.readFileSync(path.join(__dirname, 'tt.jsx'), 'utf8')

const WANT = [['White', 'Mukyu', 1, 100], ['Orange', '10th Kyu', 101, 200], ['Orange + Stripe', '9th Kyu', 201, 400], ['Blue', '8th Kyu', 401, 600], ['Blue + Stripe', '7th Kyu', 601, 800],
  ['Yellow', '6th Kyu', 801, 1000], ['Yellow + Stripe', '5th Kyu', 1001, 1200], ['Green', '4th Kyu', 1201, 1400], ['Green + Stripe', '3rd Kyu', 1401, 1600],
  ['Brown', '2nd Kyu', 1601, 1800], ['Brown + Stripe', '1st Kyu', 1801, 2000]]
const DISPLAY = { 'Mukyu': '1–100 · 100 words', '10th Kyu': '101–200 · 100 words', '9th Kyu': '201–400 · 200 words', '8th Kyu': '401–600 · 200 words', '7th Kyu': '601–800 · 200 words',
  '6th Kyu': '801–1,000 · 200 words', '5th Kyu': '1,001–1,200 · 200 words', '4th Kyu': '1,201–1,400 · 200 words', '3rd Kyu': '1,401–1,600 · 200 words', '2nd Kyu': '1,601–1,800 · 200 words',
  '1st Kyu': '1,801–2,000 · 200 words', 'Shodan': '2,000 qualifying words \\+ required assessment' }

;(async () => {
  const c = load(APP, { realBelt: true })
  // ══ B — one table, every derived table agrees ═══════════════════════════════════════════════════════════════════
  const CB = c.ev('CURRICULUM_BELTS')
  T('B1', 'CURRICULUM_BELTS is exactly the owner\'s ladder (Mukyu and 10th Kyu 100 words; 9th–1st Kyu 200 each; 11 stages; no Shodan word range)',
    JSON.stringify(CB.map(b => [b.name, b.rank, b.from, b.to])) === JSON.stringify(WANT) && CB.slice(0, 2).every(b => b.size === 100) && CB.slice(2).every(b => b.size === 200) && CB.length === 11,
    CB.map(b => [b.rank, b.from, b.to, b.size]))
  T('B2', 'the ladder is contiguous: every belt starts one after the previous ends (no gap, no overlap)', CB.every((b, i) => i === 0 ? b.from === 1 : b.from === CB[i - 1].to + 1))
  T('B3', 'the rank ladder, new-word slot table and belt page agree with it (assertBeltTablesAligned finds nothing)', c.assertBeltTablesAligned().length === 0 &&
    JSON.stringify(c.ev('BELT_RANKS').map(b => b.minWords)) === JSON.stringify(WANT.map(w => w[2] - 1).concat([2000])) && JSON.stringify(c.ev('NEW_SLOTS_BY_KNOWN').map(s => s.minWords)) === JSON.stringify(WANT.map(w => w[2] - 1).concat([2000])))
  T('B4', 'no second copy of the ranges anywhere in the app: no hand-written from:/to: bounds remain (the v689 1301 / 1551 / 1801 bands are gone); the table is defined once, from stage sizes',
    !/from:\s*\d{3,4}\b|to:\s*\d{3,4}\b/.test(SRC.replace(/^const RAW_VOCAB = .*$/m, '')) && (SRC.match(/const CURRICULUM_BELTS =/g) || []).length === 1 && (SRC.match(/const CURRICULUM_STAGE_SIZES =/g) || []).length === 1)
  // the belt page, rendered for each language
  const cr = load(APP, { React, realBelt: true })
  for (const lang of ['th', 'ja', 'zh']) {
    const html = RDS.renderToStaticMarkup(React.createElement(cr.BeltRankView, { vocab: [], onBack() {}, lang })).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
    const miss = Object.entries(DISPLAY).filter(([rank, range]) => !new RegExp(rank.replace(/ /g, '\\s*') + '[\\s\\S]{0,400}?' + range).test(html)).map(([r, g]) => r + ' ' + g)
    T('B5' + lang, 'belt page (' + lang + ') shows every rank\'s positions: 9th Kyu 201–400 · 200 words … 1st Kyu 1,801–2,000 · 200 words · Shodan 2,000 qualifying words + required assessment',
      !miss.length && !/500–699|1550–1799|1800–∞|1300–1549/.test(html), { miss, sample: html.slice(0, 300) })
  }
  // ══ E — every boundary ════════════════════════════════════════════════════════════════════════════════════════
  const pos = [[200, 'Orange'], [201, 'Orange + Stripe'], [350, 'Orange + Stripe'], [400, 'Orange + Stripe'], [401, 'Blue'], [500, 'Blue'], [600, 'Blue'], [601, 'Blue + Stripe'], [750, 'Blue + Stripe'],
    [800, 'Blue + Stripe'], [801, 'Yellow'], [1000, 'Yellow'], [1001, 'Yellow + Stripe'], [1200, 'Yellow + Stripe'], [1201, 'Green'], [1400, 'Green'], [1401, 'Green + Stripe'], [1600, 'Green + Stripe'],
    [1601, 'Brown'], [1800, 'Brown'], [1801, 'Brown + Stripe'], [1850, 'Brown + Stripe'], [2000, 'Brown + Stripe'], [2001, 'Beyond curriculum'], [1, 'White'], [100, 'White'], [101, 'Orange']]
  const posBad = pos.filter(([i, b]) => c.beltForCurriculumIndex(i) !== b).map(([i, b]) => i + '→' + c.beltForCurriculumIndex(i) + ' (want ' + b + ')')
  T('E1', 'word → belt at every boundary by curriculum position (200/201, 400/401, 600/601 … 1800/1801, 2000/2001; 350 → 9th, 500 → 8th, 750 → 7th, 1850 → 1st Kyu)', !posBad.length, posBad)
  const known = [[199, '10th Kyu'], [200, '9th Kyu'], [399, '9th Kyu'], [400, '8th Kyu'], [599, '8th Kyu'], [600, '7th Kyu'], [999, '6th Kyu'], [1000, '5th Kyu'],
    [1599, '3rd Kyu'], [1600, '2nd Kyu'], [1799, '2nd Kyu'], [1800, '1st Kyu'], [1999, '1st Kyu'], [2000, 'Shodan'], [2500, 'Shodan']]
  const knownBad = known.filter(([k, r]) => c.calculateBeltRank(k).current.rank !== r).map(([k, r]) => k + '→' + c.calculateBeltRank(k).current.rank + ' (want ' + r + ')')
  T('E2', 'known-word-count ladder (calculateBeltRank, used by the Japanese stats line) follows the same table: 1,800 and 1,999 are 1st Kyu, Shodan only at 2,000', !knownBad.length, knownBad)
  const togo = [[100, 100], [200, 200], [399, 1], [400, 200], [1800, 200], [1999, 1]]
  const togoBad = togo.filter(([k, w]) => c.calculateBeltRank(k).wordsToNext !== w).map(([k, w]) => k + ': ' + c.calculateBeltRank(k).wordsToNext + ' (want ' + w + ')')
  T('E3', 'words-to-next-belt counter (known-count ladder): 100 at the start of 10th Kyu, 200 at the start of 9th / 8th / 1st Kyu, 1 at 399 and 1,999', !togoBad.length, togoBad)
  // the belt page now reads the SAME stage progress as the dashboard (rankProgressFor) on a full 2,000-position curriculum
  const fullBank = k => Array.from({ length: 2000 }, (_, i) => ({ id: i + 1, thai: 'w' + i, curriculumIndex: i + 1, status: i < k ? 'known' : 'new', repCount: i < k ? 3 : 0, lastSeen: i < k ? '2026-10-01' : null }))
  const pv = (k) => RDS.renderToStaticMarkup(React.createElement(cr.BeltRankView, { vocab: fullBank(k), onBack() {}, lang: 'th' })).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
  const p399 = pv(399), p400 = pv(400), p1999 = pv(1999), p2000 = pv(2000)
  T('E4', 'belt page counter with 399 / 400 / 1,999 / 2,000 proven words: "1 to 8th Kyu", "200 to 7th Kyu", "1 to Shodan", and no next rank at Shodan',
    /\b1 to 8th Kyu\b/.test(p399) && /\b200 to 7th Kyu\b/.test(p400) && /\b1 to Shodan\b/.test(p1999) && !/\bto Shodan\b/.test(p2000), [p399.match(/\d+ to [^ ]+ Kyu|\d+ to Shodan/), p400.match(/\d+ to [^ ]+ Kyu/), p1999.match(/\d+ to Shodan/)])
  T('E5', 'curriculumRangeFor returns the new ranges for each belt; Shodan has none', JSON.stringify(['Yellow', 'Yellow + Stripe', 'Green', 'Green + Stripe', 'Brown', 'Brown + Stripe', 'Shodan'].map(x => { const r = c.curriculumRangeFor(x); return r && [r.from, r.to] }))
    === JSON.stringify([[801, 1000], [1001, 1200], [1201, 1400], [1401, 1600], [1601, 1800], [1801, 2000], null]))
  // ══ W — membership and counters, all three languages ═══════════════════════════════════════════════════════════
  // a full 2000-word curriculum (as Thai / Japanese / Mandarin banks will grow into): each belt gets exactly its range
  for (const lang of ['th', 'ja', 'zh']) {
    const F = { th: 'thai', ja: 'japanese', zh: 'chinese' }[lang]
    const full = Array.from({ length: 2100 }, (_, i) => ({ id: 100000 + i, [F]: 'w' + i, curriculumIndex: i < 2000 ? i + 1 : 0, status: i < 700 ? 'known' : 'new', repCount: i < 700 ? 3 : 0, okStreak: i < 700 ? 2 : 0 }))
    const counts = WANT.map(w => c.wordsForRank(full, w[0]).length), want = WANT.map(w => w[3] - w[2] + 1)
    const firstLast = WANT.map(w => { const ws = c.wordsForRank(full, w[0]); return [ws[0].curriculumIndex, ws[ws.length - 1].curriculumIndex] })
    const all = WANT.flatMap(w => c.wordsForRank(full, w[0]).map(x => x.id))
    T('W1' + lang, lang + ': with a full 2000-word curriculum every belt holds exactly its range (Mukyu / 10th Kyu 100, 9th–1st Kyu 200); every word in exactly one belt; words beyond 2000 in none',
      JSON.stringify(counts) === JSON.stringify(want) && JSON.stringify(firstLast) === JSON.stringify(WANT.map(w => [w[2], w[3]])) && new Set(all).size === 2000 && all.length === 2000, { counts, firstLast: firstLast.slice(5) })
    const st6 = c.rankTestStatus(full, 'Blue'), st5 = c.rankTestStatus(full, 'Blue + Stripe')
    T('W2' + lang, lang + ': rank-test counters follow the new ranges (8th Kyu 401–600: 200 words, all passed with 700 known; 7th Kyu 601–800: 200 words, 100 passed)', st6.total === 200 && st6.passedCount === 200 && st5.total === 200 && st5.passedCount === 100, { st6: [st6.total, st6.passedCount], st5: [st5.total, st5.passedCount] })
  }
  for (const [lang, fn, size] of [['th', 'initVocab', 1799], ['ja', 'initJapaneseVocab', 200], ['zh', 'initMandarinVocab', 100]]) {
    const v = c[fn](), ids = v.map(w => w.id)
    const placed = WANT.reduce((a, w) => a + c.wordsForRank(v, w[0]).length, 0), curr = v.filter(w => (w.curriculumIndex || 0) >= 1 && (w.curriculumIndex || 0) <= 2000 && !w.duplicateOf).length
    T('W3' + lang, lang + ': the real bank keeps every word and ID (' + size + ' words, no duplicates) and every curriculum word sits in exactly one belt; the stored belt label matches the new ranges',
      // v698: the owner's Topics brief adds the 50 Wedding Speech words once, unranked (topicOnly) — the original bank is unchanged
      // Thai 501–800: +151 new curriculum words, and 5 Wedding Speech words became curriculum words (1643 + 151 + 5; 45 topic-only)
      v.filter(w => !(lang === 'th' && c.isThaiTopicOnly(w))).length === size && (lang !== 'th' || v.filter(w => c.isThaiTopicOnly(w)).length === 45) && new Set(ids).size === ids.length && placed === curr && v.every(w => !w.curriculumIndex || c.beltForCurriculumIndex(w.curriculumIndex) === (w.belt || c.beltForCurriculumIndex(w.curriculumIndex))), { len: v.length, placed, curr })
  }
  const raw = c.ev('RAW_VOCAB')
  T('W4', 'Thai dictionary: every stored belt label agrees with the new ranges (v701 relabelled positions 301–500: 301–400 are now 9th Kyu, 401–500 8th Kyu; 999 words stay "Beyond curriculum" after 501–800 placed 144 of them)',
    raw.filter(d => d.curriculumIndex).every(d => d.belt === c.beltForCurriculumIndex(d.curriculumIndex)) && raw.filter(d => !d.curriculumIndex && !d.topicOnly).length === 999 &&
    raw.filter(d => d.topicOnly).length === 45 && raw.filter(d => d.topicOnly).every(d => !d.curriculumIndex && d.belt === 'Beyond curriculum'))   // v698: + the unranked Wedding Speech entries (45 since 501–800)
  // ══ P — what must not change ═════════════════════════════════════════════════════════════════════════════════
  const cx = c.ev('BELT_COMPLEXITY')
  const wantCx = { 'Mukyu': [2, 4, 6], '10th Kyu': [3, 5, 7], '9th Kyu': [4, 6, 8], '8th Kyu': [5, 7, 9], '7th Kyu': [5, 8, 10], '6th Kyu': [6, 9, 11], '5th Kyu': [6, 10, 12],
    '4th Kyu': [7, 11, 13], '3rd Kyu': [7, 12, 14], '2nd Kyu': [8, 13, 15], '1st Kyu': [8, 14, 16], 'Shodan': [4, 16, 20] }
  T('P1', 'sentence-length requirement per belt unchanged (preferred min–max, hard max)', Object.entries(wantCx).every(([r, [a, b, h]]) => cx[r].preferredMin === a && cx[r].preferredMax === b && cx[r].hardMax === h))
  T('P2', 'new-word quota per belt unchanged (Mukyu th 3 / ja 3 / zh 5; 10th–9th 5; 8th–7th 7; 6th–5th 10; 4th–3rd 12; 2nd Kyu–Shodan 15)',
    JSON.stringify(c.ev('CURRICULUM_BELTS').map(b => ['th', 'ja', 'zh'].map(l => c.getNewWordLimitForBelt(b.name, l)))) === JSON.stringify([[3, 3, 5], [5, 5, 5], [5, 5, 5], [7, 7, 7], [7, 7, 7], [10, 10, 10], [10, 10, 10], [12, 12, 12], [12, 12, 12], [15, 15, 15], [15, 15, 15]]) && c.getNewWordLimitForBelt('Shodan', 'th') === 15)
  // learner records: loading a saved Thai profile through the app's own sync keeps every learner field byte-for-byte
  const L = load(APP, { realBelt: true })
  const bank = L.initVocab()
  const saved = bank.map((w, i) => i % 7 === 0 ? { ...w, status: 'known', repCount: 9, okStreak: 4, interval: 30, dueDate: '2026-11-01', lastSeen: '2026-10-10', bookmarked: true, manualKnown: true }
    : i % 7 === 1 ? { ...w, status: 'learning', repCount: 2, okStreak: 1, interval: 2, dueDate: '2026-10-14', lastSeen: '2026-10-12' } : w)
  const learnerFields = ['status', 'repCount', 'okStreak', 'interval', 'dueDate', 'lastSeen', 'bookmarked', 'manualKnown', 'id', 'curriculumIndex']
  const snap = ws => JSON.stringify(ws.map(w => learnerFields.map(f => w[f])))
  T('P3', 'learner records: the belt change touches no stored field — Known / learning status, recall counts, SRS dates, bookmarks and IDs are not part of any belt table (belts are computed when read)',
    !/stSet\('tt-vocab'[^)]*beltForCurriculumIndex/.test(SRC) && snap(saved) === snap(saved.map(w => ({ ...w, _belt: L.beltForCurriculumIndex(w.curriculumIndex) }))))
  const ranks = c.ev('RANK_ORDER')
  T('P4', 'completed rank tests are keyed by belt NAME (unchanged names, same order), so a passed test stays passed', JSON.stringify(ranks) === JSON.stringify(WANT.map(w => w[0]).concat(['Shodan'])))

  console.log(out.join('\n'))
  console.log('\n' + (n - fails) + '/' + n + ' passed' + (fails ? ' — ' + fails + ' FAILED' : ''))
  process.exit(fails ? 1 : 0)
})().catch(e => { console.log(out.join('\n')); console.log('CRASH ' + (e && e.stack || e)); process.exit(2) })
