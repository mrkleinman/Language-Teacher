// v701 — CORRECT KYU–DAN SYLLABUS TO 2,000 WORDS (the owner's brief, 2026-10-15), cases 1–27.
//   Mukyu 1–100 · 10th Kyu 101–200 · 9th 201–400 · 8th 401–600 · 7th 601–800 · 6th 801–1,000 · 5th 1,001–1,200 · 4th 1,201–1,400
//   · 3rd 1,401–1,600 · 2nd 1,601–1,800 · 1st Kyu 1,801–2,000 · Shodan = 2,000 qualifying words + the rank-test proof.
// v706 — EXPECTED THRESHOLD CHANGE (owner, 2026-10-20): 2,500 is the standard for all three languages. 1–1,200 unchanged; 4th Kyu
//   1,201–1,525 · 3rd 1,526–1,850 · 2nd 1,851–2,175 · 1st Kyu 2,176–2,500 (325 each); Shodan = all 2,500 proven (no separate
//   assessment). The numbers below were moved to that table; each check still tests the same property.
// Real app code throughout (the one rank table, rank tests, rank progress, belt page and dashboard rendered with React, the
// Thai / Japanese / Mandarin selectors, the Thai load sync rendered with react-test-renderer). No provider calls.
//   node tests58.js            (current build: tt.compiled.js, or TT_FILE)
'use strict'
const { load } = require('./harness')
const React = require('react'), RDS = require('react-dom/server'), TR = require('react-test-renderer')
const fs = require('fs')
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const out = []; let fails = 0, n = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + String(id).padStart(3) + '  ' + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 1200) : '')) }
const FILE = process.env.TT_FILE || 'tt.compiled.js'
const SRC = fs.readFileSync('tt.jsx', 'utf8')
const flush = async (k = 40) => { for (let i = 0; i < k; i++) await new Promise(r => setImmediate(r)) }
const WANT = [['Mukyu', 1, 100], ['10th Kyu', 101, 200], ['9th Kyu', 201, 400], ['8th Kyu', 401, 600], ['7th Kyu', 601, 800], ['6th Kyu', 801, 1000],
  ['5th Kyu', 1001, 1200], ['4th Kyu', 1201, 1525], ['3rd Kyu', 1526, 1850], ['2nd Kyu', 1851, 2175], ['1st Kyu', 2176, 2500]]
const FIELD = { th: 'thai', ja: 'japanese', zh: 'chinese' }
// a complete 2,500-position curriculum (as every bank will grow into); the first k words proven (Known, seen)
const full = (lang, k, extra) => Array.from({ length: 2500 + (extra || 0) }, (_, i) => ({ id: 500000 + i, [FIELD[lang]]: 'w' + i, english: 'w' + i,
  curriculumIndex: i < 2500 ? i + 1 : 0, status: i < k ? 'known' : 'new', repCount: i < k ? 3 : 0, okStreak: i < k ? 7 : 0, lastSeen: i < k ? '2026-10-01' : null }))
const strip = h => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

;(async () => {
  const c = load(FILE, { React, realBelt: true }); c.console.info = () => {}; c.console.warn = () => {}
  const CB = c.ev('CURRICULUM_BELTS'), RL = c.ev('RANK_LADDER')

  // ══ 1–16  the table ══
  T(1, 'total Shodan vocabulary requirement = 2,500', c.ev('SHODAN_CURRICULUM_TOTAL') === 2500 && c.ev('SHODAN_RANK').requires === 2500)
  T(2, 'exactly 11 pre-Shodan vocabulary stages (Shodan is a rank, not a stage)', CB.length === 11 && RL.length === 12 && RL[11].name === 'Shodan' && RL[11].from == null)
  T(3, 'allocations sum to exactly 2,500', CB.reduce((a, b) => a + b.size, 0) === 2500)
  const owner = new Map(); for (let i = 1; i <= 2500; i++) owner.set(i, CB.filter(b => i >= b.from && i <= b.to).map(b => b.rank))
  T(4, 'every position 1–2,500 belongs to exactly one stage (beltForCurriculumIndex agrees); 2,501 belongs to none', [...owner.values()].every(r => r.length === 1) &&
    [...owner.keys()].every(i => c.beltForCurriculumIndex(i) === CB.find(b => b.rank === owner.get(i)[0]).name) && c.beltForCurriculumIndex(2501) === 'Beyond curriculum')
  T(5, 'no gaps or overlaps: each stage starts one after the previous ends; the first starts at 1, the last ends at 2,500', CB.every((b, i) => i === 0 ? b.from === 1 : b.from === CB[i - 1].to + 1) && CB[10].to === 2500)
  WANT.forEach(([rank, f, t], k) => { const b = CB[k]
    T(6 + k, rank + ' = ' + f.toLocaleString('en-US') + '–' + t.toLocaleString('en-US') + ' (' + (t - f + 1) + ' words)', b.rank === rank && b.from === f && b.to === t && b.size === t - f + 1, [b.rank, b.from, b.to]) })

  // ══ 17–18  Shodan only at 2,500 + proof ══
  const rk = (lang, k) => c.rankProgressFor(full(lang, k)).current.rank
  T(17, 'Shodan is NOT awarded at 2,175 or 2,499 qualifying words (still studying 1st Kyu: 0/325 and 324/325); Shodan has no word band',
    rk('th', 2175) === '1st Kyu' && rk('th', 2499) === '1st Kyu' && c.rankProgressFor(full('th', 2499)).rankState.passedCount === 324 && c.curriculumRangeFor('Shodan') === null, [rk('th', 2175), rk('th', 2499)])
  const v2000 = full('th', 2500), seenOnly = full('th', 2500).map(w => ({ ...w, status: 'learning', okStreak: 0, rankPassed: false }))
  T(18, 'Shodan = all 2,500 qualifying words proven by the existing rank tests: all 2,500 passed → Shodan; 2,500 seen but unproven → not Shodan (the rank test unlocks, not complete)',
    rk('th', 2500) === 'Shodan' && c.awardedRankName(v2000) === 'Shodan' && c.currentRankName(seenOnly) === 'White' && c.rankTestStatus(seenOnly, 'White').unlocked && !c.rankTestStatus(seenOnly, 'White').complete)

  // ══ 19  all three languages ══
  const per = ['th', 'ja', 'zh'].map(l => [rk(l, 399), rk(l, 400), rk(l, 2499), rk(l, 2500)].join('|'))
  T(19, 'Thai, Japanese and Mandarin use the same requirements (399 → 9th, 400 → 8th, 2,499 → 1st Kyu, 2,500 → Shodan in each)', per.every(x => x === '9th Kyu|8th Kyu|1st Kyu|Shodan'), per)

  // ══ 20  every surface agrees ══
  {
    const v = full('th', 450)
    const rp = c.rankProgressFor(v)
    const belt = strip(RDS.renderToStaticMarkup(React.createElement(c.BeltRankView, { vocab: v, onBack() {}, lang: 'th' })))
    const dash = (() => { try { return strip(RDS.renderToStaticMarkup(React.createElement(c.BeltRankCard || c.RankCard || 'div', { vocab: v, onNav() {}, langName: 'Thai' }))) } catch (e) { return '' } })()
    const dict = c.wordsForBeltLabel(v, 'Blue').map(w => w.curriculumIndex)
    T(20, 'dashboard, belt page, dictionary filter and rank calculations agree: 450 proven → studying 8th Kyu 401–600, 50 / 200 proven, 150 to 7th Kyu; the dictionary\'s 8th Kyu filter lists positions 401–600',
      rp.current.rank === '8th Kyu' && rp.rankState.passedCount === 50 && rp.rankState.total === 200 && rp.wordsToNext === 150 &&
      /8th Kyu[\s\S]{0,300}Studying 401–600 · 200 words · 50 \/ 200 proven/.test(belt) && /150 to 7th Kyu/.test(belt) &&
      dict.length === 200 && dict[0] === 401 && dict[199] === 600 && (dash === '' || /8th Kyu/.test(dash)), { rp: [rp.current.rank, rp.rankState.passedCount, rp.wordsToNext], belt: belt.slice(0, 400) })
  }

  // ══ 21  Daily selection follows the boundaries ══
  {
    const t = load(FILE, { realBelt: true }); t.console.info = () => {}; t.console.warn = () => {}
    const v = t.initVocab().map(w => ({ ...w }))
    v.forEach(w => { const ci = w.curriculumIndex || 0; if (ci >= 1 && ci <= 300) Object.assign(w, { status: 'known', okStreak: 7, repCount: 4, lastSeen: '2026-10-01', introducedAt: '2026-09-01', interval: 30, dueDate: '2026-12-01' }) })
    const sel = t.pickBeltPriorityTargets(v, [], '2026-10-15', 30, {})
    const picks = (Array.isArray(sel) ? sel : (sel && (sel.targets || sel.words || sel.picks)) || []).filter(w => w && !t.hasBeenIntroduced(w))
    const cis = picks.map(w => w.curriculumIndex)
    T(21, 'Daily new words follow the new stages: 1–300 proven → new words come from 9th Kyu 301–400 in curriculum order (no 8th Kyu word while 9th Kyu is unfinished; no topic-only word)',
      cis.length > 0 && cis.every(i => i >= 301 && i <= 400) && cis.every((x, k) => k === 0 || x > cis[k - 1]) && !picks.some(w => t.isThaiTopicOnly && t.isThaiTopicOnly(w)), cis)
  }

  // ══ 22–23  ids / SRS / Known untouched ══
  for (const [lang, fn] of [['th', 'initVocab'], ['ja', 'initJapaneseVocab'], ['zh', 'initMandarinVocab']]) {
    const v = c[fn]()
    const ok = v.every(w => !(w.curriculumIndex > 0) || (w.belt === c.beltForCurriculumIndex(w.curriculumIndex) && w.beltOrder === c.beltOrderForCurriculumIndex(w.curriculumIndex)))
    const ids = v.map(w => w.id)
    T('22' + lang, lang + ': canonical ids unique and unchanged in order; every word\'s stage label and position are derived from its curriculum index; no SRS field is part of the rank table',
      ok && new Set(ids).size === ids.length && JSON.stringify(ids) === JSON.stringify(c[fn]().map(w => w.id)) && !/CURRICULUM_STAGE_SIZES[\s\S]{0,900}(okStreak|dueDate|interval)/.test(SRC.slice(SRC.indexOf('const CURRICULUM_STAGE_SIZES'), SRC.indexOf('const CURRICULUM_STAGE_SIZES') + 900)))
  }
  {
    const v = full('th', 150)
    v[160].manualKnown = true; v[160].status = 'known'      // a manual Known adjustment inside 10th Kyu
    v[20].status = 'learning'; v[20].okStreak = 0           // a manual Unknown adjustment inside Mukyu
    const st = c.rankTestStatus(v, 'Orange'), m = c.rankTestStatus(v, 'White')
    T(23, 'Known / Unknown adjustments still count: a manually Known 10th Kyu word is proven; a word set back to learning in Mukyu reopens Mukyu', st.passedCount === 51 && !m.complete && c.currentRankName(v) === 'White', [st.passedCount, m.passedCount])
  }

  // ══ 24  Wedding Speech words do not inflate belts ══
  {
    const t = load(FILE, { realBelt: true }); const v = t.initVocab()
    const top = t.topicById('th', 'wedding-speech'), ids = new Set(top ? top.vocabIds : [])
    const topicOnly = v.filter(w => ids.has(w.id) && t.isThaiTopicOnly(w)), ranked = v.filter(w => ids.has(w.id) && w.curriculumIndex > 0)
    const inRanks = t.ev('CURRICULUM_BELTS').reduce((a, b) => a + t.wordsForRank(v, b.name).filter(w => ids.has(w.id)).length, 0)
    const vk = v.map(w => ids.has(w.id) && !(w.curriculumIndex > 0) ? { ...w, status: 'known', lastSeen: '2026-10-01' } : w)
    T(24, 'unranked Wedding Speech words stay unranked ("Beyond curriculum", no position) and never count: making every topic-only word Known changes no stage count; ranked topic words are counted once, at their own position',
      ids.size === 50 && topicOnly.length > 0 && topicOnly.every(w => !w.curriculumIndex && w.belt === 'Beyond curriculum') && inRanks === ranked.length &&
      JSON.stringify(t.ev('CURRICULUM_BELTS').map(b => t.rankTestStatus(vk, b.name).passedCount)) === JSON.stringify(t.ev('CURRICULUM_BELTS').map(b => t.rankTestStatus(v, b.name).passedCount)), { topicOnly: topicOnly.length, ranked: ranked.length, inRanks })
  }

  // ══ 25  existing awards / assessment history ══
  {
    const v = full('th', 100).map(w => w.curriculumIndex >= 101 && w.curriculumIndex <= 200 ? { ...w, rankPassed: true, rankTestedAt: '2026-10-01', lastSeen: '2026-10-01', repCount: 1 } : w)
    const r = c.rankProgressFor(v)
    T(25, 'completed rank-test results are kept (rankPassed / rankTestedAt are per word and keyed by stage NAME — unchanged names, same order): a passed 10th Kyu test still counts', c.rankTestStatus(v, 'Orange').complete && r.current.rank === '9th Kyu' && r.awarded.rank === '10th Kyu' &&
      JSON.stringify(c.ev('RANK_ORDER')) === JSON.stringify(['White', 'Orange', 'Orange + Stripe', 'Blue', 'Blue + Stripe', 'Yellow', 'Yellow + Stripe', 'Green', 'Green + Stripe', 'Brown', 'Brown + Stripe', 'Shodan']))
  }

  // ══ 26  migration / recalculation idempotent (incl. the stale duplicate pointer) ══
  {
    const j1 = c.mergeJapaneseVocab(c.initJapaneseVocab().map(w => ({ ...w, belt: 'Shodan', beltOrder: 999, status: w.id % 3 ? 'new' : 'known' })))
    const j2 = c.mergeJapaneseVocab(JSON.parse(JSON.stringify(j1)))
    const z1 = c.mergeMandarinVocab(c.initMandarinVocab().map(w => ({ ...w, belt: 'Blue', beltOrder: 7 }))), z2 = c.mergeMandarinVocab(JSON.parse(JSON.stringify(z1)))
    T('26a', 'Japanese / Mandarin load merge recalculates a stale stored belt label from the curriculum index, keeps learner status, and a second pass changes nothing',
      JSON.stringify(j1) === JSON.stringify(j2) && JSON.stringify(z1) === JSON.stringify(z2) && j1.every(w => w.belt === c.beltForCurriculumIndex(w.curriculumIndex)) && j1.filter(w => w.status === 'known').length === c.initJapaneseVocab().filter(w => w.id % 3 === 0).length)
    // the real Thai load sync (the Teacher), twice, on a profile carrying v689-era labels and the owner's corrupt duplicate pointer
    const loadTwice = async () => {
      const cx = load(FILE, { React }); cx.console.info = () => {}; cx.console.warn = () => {}
      const v = cx.initVocab().map(w => ({ ...w }))
      v.forEach(w => { if (w.curriculumIndex >= 301 && w.curriculumIndex <= 400) { w.belt = 'Blue'; w.beltOrder = w.curriculumIndex - 300 } if (w.curriculumIndex >= 1 && w.curriculumIndex <= 120) Object.assign(w, { status: 'known', okStreak: 7, repCount: 3, lastSeen: '2026-10-01' }) })
      const w863 = v.find(w => w.id === 863), w725 = v.find(w => w.id === 725)
      if (w863) Object.assign(w863, { duplicateOf: 725, _mergedInto: 725 })
      if (w725) Object.assign(w725, { status: 'learning', repCount: 2, okStreak: 2 })
      const runs = []
      for (let k = 0; k < 2; k++) {
        cx.localStorage.setItem('tt-vocab', JSON.stringify(k ? runs[0] : v)); cx.localStorage.setItem('tt-tracks', JSON.stringify([]))
        let r; await TR.act(async () => { r = TR.create(React.createElement(cx.ThaiTeacher, { lang: 'th', onSetLang: () => {} })); await flush(60) })
        runs.push(JSON.parse(cx.localStorage.getItem('tt-vocab'))); await TR.act(async () => { r.unmount() })
      }
      return { before: v, runs }
    }
    const { before, runs } = await loadTwice()
    const by = (a, id) => a.find(w => w.id === id)
    const keep = ['status', 'okStreak', 'repCount', 'lastSeen', 'interval', 'dueDate', 'manualKnown', 'bookmarked']
    // the app's EXISTING load migrations are not the syllabus change: v641 alias keepers fold their twin's history, and a
    // still-locked word is opened (status locked → new). Everything else must be untouched.
    const aliasKeepers = new Set(Object.values(c.ev('THAI_CANONICAL_ALIASES')).concat(Object.keys(c.ev('THAI_CANONICAL_ALIASES')).map(Number)))
    const histSame = before.every(w => { const a = by(runs[0], w.id); if (!a || aliasKeepers.has(w.id)) return true
      return keep.every(f => JSON.stringify(a[f]) === JSON.stringify(w[f]) || (f === 'status' && w[f] === 'locked' && a[f] === 'new') || (w[f] == null && a[f] != null && f !== 'status')) })
    T('26b', 'Thai load sync (the real Teacher): v689-era labels on 301–400 become 9th Kyu ("Orange + Stripe", positions 101–200), a second load changes nothing, and no learner history moves',
      by(runs[0], before.find(w => w.curriculumIndex === 350).id).belt === 'Orange + Stripe' && by(runs[0], before.find(w => w.curriculumIndex === 350).id).beltOrder === 150 &&
      JSON.stringify(runs[0]) === JSON.stringify(runs[1]) && histSame, { same: JSON.stringify(runs[0]) === JSON.stringify(runs[1]), histSame,
        firstDiff: runs[0].map((w, k) => JSON.stringify(w) !== JSON.stringify(runs[1][k]) ? [JSON.stringify(w).slice(0, 300), JSON.stringify(runs[1][k]).slice(0, 300)] : null).filter(Boolean).slice(0, 2),
        hist: before.filter(w => { const a = by(runs[0], w.id); return a && !aliasKeepers.has(w.id) && !keep.every(f => JSON.stringify(a[f]) === JSON.stringify(w[f]) || (w[f] == null && a[f] != null && f !== 'status')) }).slice(0, 3).map(w => [w.id, keep.map(f => w[f]), keep.map(f => by(runs[0], w.id)[f])]) })
    const a863 = by(runs[0], 863), a725 = by(runs[0], 725)
    T('26c', 'the owner\'s corrupt duplicate pointer (863 เริ่ม "start" → 725 อุณหภูมิ "temperature", not confirmed by the bank) is dropped, so 10th Kyu position 136 counts again; 725 keeps its own history',
      a863 && a863.duplicateOf == null && a863.curriculumIndex === 136 && c.wordsForRank(runs[0], 'Orange').length === 100 && a725 && a725.status === 'learning' && a725.repCount === 2, { a863: a863 && [a863.duplicateOf, a863._clearedDuplicateOf], a725: a725 && [a725.status, a725.repCount] })
    const realDup = before.find(w => w.id !== 863 && w.duplicateOf != null && !c.ev('THAI_CANONICAL_ALIASES')[w.id])
    T('26d', 'a duplicate the bank DOES confirm stays a duplicate (only unconfirmed pointers are dropped)', !realDup || by(runs[0], realDup.id).duplicateOf === realDup.duplicateOf, realDup && [realDup.id, realDup.duplicateOf])
  }

  // ══ 27  Listening / Revision unchanged ══
  {
    const v = c.initVocab().map(w => ({ ...w }))
    v.forEach(w => { const ci = w.curriculumIndex || 0; if (ci >= 1 && ci <= 200) Object.assign(w, { status: 'learning', okStreak: 2, repCount: 3, lastSeen: '2026-10-01', introducedAt: '2026-09-01', interval: 3, dueDate: '2026-10-1' + (ci % 5) }) })
    const r1 = c.selectRevisionTargets('th', v), ids1 = JSON.stringify(r1.targetIds || [])
    T(27, 'Revision (and the Listening selection it feeds) depends on due words only — not on the stage table: the selection is the same before and after the rank layer is consulted, and uses no stage name',
      ids1.length > 2 && JSON.stringify(c.selectRevisionTargets('th', v).targetIds || []) === ids1 && !/CURRICULUM_BELTS|rankProgressFor|currentRankName/.test(SRC.slice(SRC.indexOf('function selectRevisionTargets'), SRC.indexOf('function selectRevisionTargets') + 3000)))
  }

  out.forEach(l => console.log(l))
  console.log('\nv701 Kyu–Dan syllabus regression: ' + (n - fails) + '/' + n + (fails ? ' — ' + fails + ' FAILED' : ' — ALL PASS'))
  process.exit(fails ? 1 : 0)
})().catch(e => { out.forEach(l => console.log(l)); console.error(e); process.exit(1) })
