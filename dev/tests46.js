// v689 — re-banded vocabulary belts 6th–1st Kyu (owner, 2026-10-13). Real application functions; no model calls.
//   6th Kyu 500–699 · 5th 700–899 · 4th 900–1099 · 3rd 1100–1299 (200 words each) · 2nd 1300–1549 · 1st 1550–1799 (250 each)
//   · Shodan 1800 onward. Mukyu–7th Kyu unchanged. Belt page shows from−1 … to−1 of the curriculum position.
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

const WANT = [['White', 'Mukyu', 1, 100], ['Orange', '10th Kyu', 101, 200], ['Orange + Stripe', '9th Kyu', 201, 300], ['Blue', '8th Kyu', 301, 400], ['Blue + Stripe', '7th Kyu', 401, 500],
  ['Yellow', '6th Kyu', 501, 700], ['Yellow + Stripe', '5th Kyu', 701, 900], ['Green', '4th Kyu', 901, 1100], ['Green + Stripe', '3rd Kyu', 1101, 1300],
  ['Brown', '2nd Kyu', 1301, 1550], ['Brown + Stripe', '1st Kyu', 1551, 1800], ['Shodan', 'Shodan', 1801, 2000]]
const DISPLAY = { 'Mukyu': '0–99', '10th Kyu': '100–199', '9th Kyu': '200–299', '8th Kyu': '300–399', '7th Kyu': '400–499',
  '6th Kyu': '500–699', '5th Kyu': '700–899', '4th Kyu': '900–1099', '3rd Kyu': '1100–1299', '2nd Kyu': '1300–1549', '1st Kyu': '1550–1799', 'Shodan': '1800–∞' }

;(async () => {
  const c = load(APP, { realBelt: true })
  // ══ B — one table, every derived table agrees ═══════════════════════════════════════════════════════════════════
  const CB = c.ev('CURRICULUM_BELTS')
  T('B1', 'CURRICULUM_BELTS is exactly the owner\'s ladder (Mukyu–7th Kyu unchanged; 6th–3rd Kyu 200 words; 2nd–1st Kyu 250; Shodan from 1801)',
    JSON.stringify(CB.map(b => [b.name, b.rank, b.from, b.to])) === JSON.stringify(WANT) && CB.slice(5, 9).every(b => b.size === 200) && CB.slice(9, 11).every(b => b.size === 250),
    CB.map(b => [b.rank, b.from, b.to, b.size]))
  T('B2', 'the ladder is contiguous: every belt starts one after the previous ends (no gap, no overlap)', CB.every((b, i) => i === 0 ? b.from === 1 : b.from === CB[i - 1].to + 1))
  T('B3', 'the rank ladder, new-word slot table and belt page agree with it (assertBeltTablesAligned finds nothing)', c.assertBeltTablesAligned().length === 0 &&
    JSON.stringify(c.ev('BELT_RANKS').map(b => b.minWords)) === JSON.stringify(WANT.map(w => w[2] - 1)) && JSON.stringify(c.ev('NEW_SLOTS_BY_KNOWN').map(s => s.minWords)) === JSON.stringify(WANT.map(w => w[2] - 1)))
  T('B4', 'no second copy of the ranges anywhere in the app: the old bounds (751, 1001, 1201, 1401, 1601) appear nowhere; the table is defined once',
    !/from:\s*(751|1001|1201|1401|1601)\b|to:\s*(750|1000|1200|1400|1600)\b/.test(SRC) && (SRC.match(/const CURRICULUM_BELTS = \[/g) || []).length === 1)
  // the belt page, rendered for each language
  const cr = load(APP, { React, realBelt: true })
  for (const lang of ['th', 'ja', 'zh']) {
    const html = RDS.renderToStaticMarkup(React.createElement(cr.BeltRankView, { vocab: [], onBack() {}, lang })).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
    const miss = Object.entries(DISPLAY).filter(([rank, range]) => !new RegExp(rank.replace(/ /g, '\\s*') + '[\\s\\S]{0,160}?' + range.replace('∞', '∞')).test(html)).map(([r, g]) => r + ' ' + g)
    T('B5' + lang, 'belt page (' + lang + ') shows every belt\'s word range: 6th 500–699 · 5th 700–899 · 4th 900–1099 · 3rd 1100–1299 · 2nd 1300–1549 · 1st 1550–1799 · Shodan 1800–∞',
      !miss.length && !/500–749|750–999|1000–1199|1200–1399|1400–1599|1600–1799/.test(html), { miss, sample: html.slice(0, 300) })
  }
  // ══ E — every boundary ════════════════════════════════════════════════════════════════════════════════════════
  const pos = [[500, 'Blue + Stripe'], [501, 'Yellow'], [700, 'Yellow'], [701, 'Yellow + Stripe'], [900, 'Yellow + Stripe'], [901, 'Green'], [1100, 'Green'], [1101, 'Green + Stripe'],
    [1300, 'Green + Stripe'], [1301, 'Brown'], [1550, 'Brown'], [1551, 'Brown + Stripe'], [1800, 'Brown + Stripe'], [1801, 'Shodan'], [2000, 'Shodan'], [2001, 'Beyond curriculum'], [1, 'White'], [100, 'White'], [101, 'Orange']]
  const posBad = pos.filter(([i, b]) => c.beltForCurriculumIndex(i) !== b).map(([i, b]) => i + '→' + c.beltForCurriculumIndex(i) + ' (want ' + b + ')')
  T('E1', 'word → belt at every boundary by curriculum position (500/501, 700/701, 900/901, 1100/1101, 1300/1301, 1550/1551, 1800/1801, 2000/2001)', !posBad.length, posBad)
  const known = [[499, '7th Kyu'], [500, '6th Kyu'], [699, '6th Kyu'], [700, '5th Kyu'], [899, '5th Kyu'], [900, '4th Kyu'], [1099, '4th Kyu'], [1100, '3rd Kyu'],
    [1299, '3rd Kyu'], [1300, '2nd Kyu'], [1549, '2nd Kyu'], [1550, '1st Kyu'], [1799, '1st Kyu'], [1800, 'Shodan'], [2500, 'Shodan']]
  const knownBad = known.filter(([k, r]) => c.calculateBeltRank(k).current.rank !== r).map(([k, r]) => k + '→' + c.calculateBeltRank(k).current.rank + ' (want ' + r + ')')
  T('E2', 'learner → belt by known-word count at the owner\'s boundaries 699/700, 899/900, 1099/1100, 1299/1300, 1549/1550, 1799/1800 (and 499/500)', !knownBad.length, knownBad)
  const togo = [[500, 200], [699, 1], [700, 200], [1300, 250], [1549, 1], [1550, 250], [1799, 1]]
  const togoBad = togo.filter(([k, w]) => c.calculateBeltRank(k).wordsToNext !== w).map(([k, w]) => k + ': ' + c.calculateBeltRank(k).wordsToNext + ' (want ' + w + ')')
  T('E3', 'words-to-next-belt counter: 200 at the start of 6th Kyu, 1 at 699 / 1549 / 1799, 250 at the start of 2nd and 1st Kyu', !togoBad.length, togoBad)
  const pv = (k) => RDS.renderToStaticMarkup(React.createElement(cr.BeltRankView, { vocab: Array.from({ length: k }, (_, i) => ({ id: i + 1, status: 'known' })), onBack() {}, lang: 'th' })).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
  const p699 = pv(699), p700 = pv(700), p1549 = pv(1549), p1800 = pv(1800)
  T('E4', 'belt page counter with 699 / 700 / 1549 / 1800 known words: "1 to 5th Kyu", "200 to 4th Kyu", "1 to 1st Kyu", and no next belt at Shodan',
    /\b1 to 5th Kyu\b/.test(p699) && /\b200 to 4th Kyu\b/.test(p700) && /\b1 to 1st Kyu\b/.test(p1549) && !/\bto Shodan\b/.test(p1800), [p699.match(/\d+ to [^ ]+ Kyu|\d+ to Shodan/), p700.match(/\d+ to [^ ]+ Kyu/), p1549.match(/\d+ to [^ ]+ Kyu/)])
  T('E5', 'curriculumRangeFor returns the new ranges for each belt', JSON.stringify(['Yellow', 'Yellow + Stripe', 'Green', 'Green + Stripe', 'Brown', 'Brown + Stripe', 'Shodan'].map(x => { const r = c.curriculumRangeFor(x); return r && [r.from, r.to] }))
    === JSON.stringify([[501, 700], [701, 900], [901, 1100], [1101, 1300], [1301, 1550], [1551, 1800], [1801, 2000]]))
  // ══ W — membership and counters, all three languages ═══════════════════════════════════════════════════════════
  // a full 2000-word curriculum (as Thai / Japanese / Mandarin banks will grow into): each belt gets exactly its range
  for (const lang of ['th', 'ja', 'zh']) {
    const F = { th: 'thai', ja: 'japanese', zh: 'chinese' }[lang]
    const full = Array.from({ length: 2100 }, (_, i) => ({ id: 100000 + i, [F]: 'w' + i, curriculumIndex: i < 2000 ? i + 1 : 0, status: i < 700 ? 'known' : 'new', repCount: i < 700 ? 3 : 0, okStreak: i < 700 ? 2 : 0 }))
    const counts = WANT.map(w => c.wordsForRank(full, w[0]).length), want = WANT.map(w => w[3] - w[2] + 1)
    const firstLast = WANT.map(w => { const ws = c.wordsForRank(full, w[0]); return [ws[0].curriculumIndex, ws[ws.length - 1].curriculumIndex] })
    const all = WANT.flatMap(w => c.wordsForRank(full, w[0]).map(x => x.id))
    T('W1' + lang, lang + ': with a full 2000-word curriculum every belt holds exactly its range (6th–3rd Kyu 200, 2nd–1st Kyu 250); every word in exactly one belt; words beyond 2000 in none',
      JSON.stringify(counts) === JSON.stringify(want) && JSON.stringify(firstLast) === JSON.stringify(WANT.map(w => [w[2], w[3]])) && new Set(all).size === 2000 && all.length === 2000, { counts, firstLast: firstLast.slice(5) })
    const st6 = c.rankTestStatus(full, 'Yellow'), st5 = c.rankTestStatus(full, 'Yellow + Stripe')
    T('W2' + lang, lang + ': rank-test counters follow the new ranges (6th Kyu: 200 words, all 200 passed with 700 known; 5th Kyu: 200 words, none passed)', st6.total === 200 && st6.passedCount === 200 && st5.total === 200 && st5.passedCount === 0, { st6: [st6.total, st6.passedCount], st5: [st5.total, st5.passedCount] })
  }
  for (const [lang, fn, size] of [['th', 'initVocab', 1643], ['ja', 'initJapaneseVocab', 200], ['zh', 'initMandarinVocab', 100]]) {
    const v = c[fn](), ids = v.map(w => w.id)
    const placed = WANT.reduce((a, w) => a + c.wordsForRank(v, w[0]).length, 0), curr = v.filter(w => (w.curriculumIndex || 0) >= 1 && (w.curriculumIndex || 0) <= 2000 && !w.duplicateOf).length
    T('W3' + lang, lang + ': the real bank keeps every word and ID (' + size + ' words, no duplicates) and every curriculum word sits in exactly one belt; the stored belt label matches the new ranges',
      // v698: the owner's Topics brief adds the 50 Wedding Speech words once, unranked (topicOnly) — the original bank is unchanged
      v.filter(w => !(lang === 'th' && c.isThaiTopicOnly(w))).length === size && (lang !== 'th' || v.filter(w => c.isThaiTopicOnly(w)).length === 50) && new Set(ids).size === ids.length && placed === curr && v.every(w => !w.curriculumIndex || c.beltForCurriculumIndex(w.curriculumIndex) === (w.belt || c.beltForCurriculumIndex(w.curriculumIndex))), { len: v.length, placed, curr })
  }
  const raw = c.ev('RAW_VOCAB')
  T('W4', 'Thai dictionary: every stored belt label agrees with the new ranges (today\'s curriculum ends at 500, so no word changes belt; 1,143 words stay "Beyond curriculum")',
    raw.filter(d => d.curriculumIndex).every(d => d.belt === c.beltForCurriculumIndex(d.curriculumIndex)) && raw.filter(d => !d.curriculumIndex && !d.topicOnly).length === 1143 &&
    raw.filter(d => d.topicOnly).length === 50 && raw.filter(d => d.topicOnly).every(d => !d.curriculumIndex && d.belt === 'Beyond curriculum'))   // v698: + the 50 unranked Wedding Speech entries
  // ══ P — what must not change ═════════════════════════════════════════════════════════════════════════════════
  const cx = c.ev('BELT_COMPLEXITY')
  const wantCx = { 'Mukyu': [2, 4, 6], '10th Kyu': [3, 5, 7], '9th Kyu': [4, 6, 8], '8th Kyu': [5, 7, 9], '7th Kyu': [5, 8, 10], '6th Kyu': [6, 9, 11], '5th Kyu': [6, 10, 12],
    '4th Kyu': [7, 11, 13], '3rd Kyu': [7, 12, 14], '2nd Kyu': [8, 13, 15], '1st Kyu': [8, 14, 16], 'Shodan': [4, 16, 20] }
  T('P1', 'sentence-length requirement per belt unchanged (preferred min–max, hard max)', Object.entries(wantCx).every(([r, [a, b, h]]) => cx[r].preferredMin === a && cx[r].preferredMax === b && cx[r].hardMax === h))
  T('P2', 'new-word quota per belt unchanged (Mukyu th 3 / ja 3 / zh 5; 10th–9th 5; 8th–7th 7; 6th–5th 10; 4th–3rd 12; 2nd Kyu–Shodan 15)',
    JSON.stringify(c.ev('CURRICULUM_BELTS').map(b => ['th', 'ja', 'zh'].map(l => c.getNewWordLimitForBelt(b.name, l)))) === JSON.stringify([[3, 3, 5], [5, 5, 5], [5, 5, 5], [7, 7, 7], [7, 7, 7], [10, 10, 10], [10, 10, 10], [12, 12, 12], [12, 12, 12], [15, 15, 15], [15, 15, 15], [15, 15, 15]]))
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
  T('P4', 'completed rank tests are keyed by belt NAME (unchanged names, same order), so a passed test stays passed', JSON.stringify(ranks) === JSON.stringify(WANT.map(w => w[0])))

  console.log(out.join('\n'))
  console.log('\n' + (n - fails) + '/' + n + ' passed' + (fails ? ' — ' + fails + ' FAILED' : ''))
  process.exit(fails ? 1 : 0)
})().catch(e => { console.log(out.join('\n')); console.log('CRASH ' + (e && e.stack || e)); process.exit(2) })
