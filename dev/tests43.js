// v683 — GENERATION ARCHITECTURE STABILISATION regression suite (owner brief 2026-10-12). Real application functions only.
//   Q  — one authoritative new-word configuration (owner decision 2): Mukyu th3/ja3/zh5, then 5/7/10/12/15 for every language
//   D  — Mandarin "Next targets" + generation headings show the whole Daily Track (owner decision 3)
//   C  — language-quality corpus: false acceptances / false rejections, old pipeline vs teaching-plan pipeline
//   P  — teaching-plan pipeline contract (one validator, curated fallbacks, consistent instructions, bounded repair)
//   node tests43.js [--app path/to/compiled.js]
'use strict'
const fs = require('fs'), path = require('path')
const { load } = require('./harness')
const R = require('./benchmark/run')
const out = []; let n = 0, fails = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + id.padEnd(5) + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 700) : '')) }
const ai = process.argv.indexOf('--app'), APP = ai > 0 ? path.resolve(process.argv[ai + 1]) : path.join(__dirname, 'tt.compiled.js')
const SRC = fs.readFileSync(path.join(__dirname, 'tt.jsx'), 'utf8')
const has = (c, name) => { try { return c.ev('typeof ' + name) === 'function' } catch (e) { return false } }

;(async () => {
  // ══ Q — new words per Daily Track ═══════════════════════════════════════════════════════════════════════════════════
  {
    const c = load(APP, { realBelt: true })
    const want = { 'White': [3, 3, 5], 'Orange': [5, 5, 5], 'Orange + Stripe': [5, 5, 5], 'Blue': [7, 7, 7], 'Blue + Stripe': [7, 7, 7], 'Yellow': [10, 10, 10],
      'Yellow + Stripe': [10, 10, 10], 'Green': [12, 12, 12], 'Green + Stripe': [12, 12, 12], 'Brown': [15, 15, 15], 'Brown + Stripe': [15, 15, 15], 'Shodan': [15, 15, 15] }
    const bad = Object.entries(want).filter(([b, v]) => ['th', 'ja', 'zh'].some((l, k) => c.getNewWordLimitForBelt(b, l) !== v[k]))
    T('Q1', 'ONE configuration gives the owner\'s table for every rank and language (Mukyu th 3 / ja 3 / zh 5; 10th–9th Kyu 5; 8th–7th 7; 6th–5th 10; 4th–3rd 12; 2nd Kyu–Shodan 15)',
      !bad.length, bad.map(([b]) => b + ': ' + ['th', 'ja', 'zh'].map(l => c.getNewWordLimitForBelt(b, l)).join('/')))
    T('Q2', 'every surface reads it: newWordsPerTrack (dashboard, belt card, selectors, logs, shortfall/QC checks) → getNewWordLimitForBelt; no separate Japanese or Mandarin constant remains',
      !/JA_DAILY_NEW_WORDS|ZH_DAILY_NEW_WORDS/.test(SRC) && /function dailyNewWordsFor[\s\S]{0,300}getNewWordLimitForBelt/.test(SRC) &&
      /lang: 'ja',\n    newSelector: v => japaneseSelectNewSlots/.test(SRC) && /lang: 'zh',\n    newSelector: v => mandarinSelectTargets/.test(SRC))
    // a Japanese learner at 10th Kyu (White complete): the REAL selector picks 5 new words out of 30 targets
    const J = c.initJapaneseVocab(), today = new Date().toISOString().slice(0, 10)
    J.forEach(w => { if (w.belt === 'White') Object.assign(w, { status: 'known', okCount: 12, okStreak: 12, repCount: 15, lastSeen: today, dueDate: '2099-01-01' }) })
    const J2 = c.initJapaneseVocab()   // a Mukyu learner with 40 words met
    J2.slice(0, 40).forEach(w => Object.assign(w, { status: 'learning', repCount: 3, okCount: 1, lastSeen: today, dueDate: today }))
    const sel = v => c.selectTrackTargets({ vocab: v, targetCap: 30, lang: 'ja', newSelector: x => c.japaneseSelectNewSlots(x, []) })
    const s10 = sel(J), sM = sel(J2)
    T('Q3', 'Japanese 10th Kyu: the real selector introduces 5 new words (was 3) and the Daily Track keeps 30 targets; a Mukyu Japanese learner still gets 3',
      c.earliestIncompleteBelt(J) === 'Orange' && c.newWordsPerTrack('ja', 'daily', J) === 5 && s10.counts.new === 5 && s10.targets.length === 30 &&
      c.newWordsPerTrack('ja', 'daily', J2) === 3 && sM.counts.new === 3, { belt: c.earliestIncompleteBelt(J), s10: s10.counts, sM: sM.counts })
    const Z = c.initMandarinVocab(), Th = c.initVocab()
    T('Q4', 'Mukyu beginners: Mandarin 5, Thai 3 (owner table; Thai White was 5 in v682 — the one deliberate change, flagged in the report), Japanese 3',
      c.newWordsPerTrack('zh', 'daily', Z) === 5 && c.newWordsPerTrack('th', 'daily', Th) === 3 && c.newSlotsFor(Th) === 3 && c.newWordsPerTrack('ja', 'daily', c.initJapaneseVocab()) === 3)
    T('Q5', 'Revision and Listening tracks introduce 0 new words in every language (unchanged)',
      ['th', 'ja', 'zh'].every(l => c.newWordsPerTrack(l, 'revision', []) === 0 && c.newWordsPerTrack(l, 'listening', []) === 0))
  }
  // ══ D — Mandarin target display ═════════════════════════════════════════════════════════════════════════════════════
  {
    T('D1', 'the Mandarin dashboard gets the 30-target Daily Track list for "Next targets" (labelled new / review) while Learn New Words keeps the new words only',
      /<MandarinDashboard vocab=\{vocab\} tracks=\{tracks\} targets=\{newTargets\} trackTargets=\{targets\}/.test(SRC) && /Next targets \(\{list\.length\}\) · \{nNew\} new · \{list\.length - nNew\} review/.test(SRC) &&
      /<MandarinLearnWords words=\{newTargets\.filter\(w => w\.selectionRole === 'new'\)\}/.test(SRC))
    T('D2', 'generation-screen headings (Mandarin and Japanese) count the targets actually generated, not the raw new-word selection',
      (SRC.match(/describeTargetSelection\(\(selection && selection\.counts\) \|\| \{[^}]*\}, targets\)/g) || []).length === 3)
  }
  console.log(out.join('\n'))
  console.log('\nv683 generation architecture stabilisation: ' + (n - fails) + '/' + n + (fails ? ' — ' + fails + ' FAILED' : ' — ALL PASS'))
  process.exit(fails ? 1 : 0)
})().catch(e => { console.log('CRASH ' + (e && e.stack || e)); process.exit(1) })
