// 11 Nov — new-word allowance must follow the learner's RANK even when words in unrated tracks are taken out of the list (owner report: 8th Kyu, only 3 new).
// The Daily screen removes the words that sit in unrated tracks before selecting; the rank (and so 7 new at 8th Kyu) was then read from that SHORTENED list, so two
// unrated Daily tracks could make the learner read as Mukyu (3 new). pickWords now takes the full list as popts.rankVocab. Real app code, no model.
const { load } = require('./harness')
const c = load(process.env.TT_FILE || 'tt.compiled.js')
let n = 0, fails = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; console.log((pass ? 'PASS ' : 'FAIL ') + id + '  ' + name + (!pass && detail !== undefined ? '\n      ' + JSON.stringify(detail) : '')) }
const N = c.ev('isGenuinelyNew'), P = c.ev('isThaiPhraseEntry')
const v = c.initVocab()
v.forEach(w => { if (w.curriculumIndex >= 1 && w.curriculumIndex <= 400 && !P(w)) { w.status = 'known'; w.interval = 30; w.lastSeen = '2026-11-01'; w.introducedAt = '2026-09-01'; w.dueDate = '2026-12-01'; w.okStreak = 5; w.repCount = 5 } })
// words that sit in unrated tracks: a spread of White / Orange words (known) — taking them out of the list changes the learner's apparent rank
const inTracks = new Set(v.filter(w => w.curriculumIndex >= 1 && w.curriculumIndex <= 400 && !P(w)).filter((w, i) => i % 3 === 0).map(w => w.id))
const shortened = v.filter(w => !inTracks.has(w.id))
const full = c.rankProgressFor(v).current.rank, short = c.rankProgressFor(shortened).current.rank
T('R0', 'setup: the full list reads 8th Kyu and the shortened list (words in unrated tracks removed) reads lower — the situation of the report', full === '8th Kyu' && short !== '8th Kyu', { full, short })
const count = p => p.targets.filter(w => !w._phraseReview && N(w)).length
const before = count(c.pickWords(shortened, 'daily', []))
const after = count(c.pickWords(shortened, 'daily', [], { rankVocab: v }))
T('R1', 'without the full list the shortened list under-counts (the old behaviour, kept only to show the setup reproduces the bug)', before < 7, { before })
T('R2', 'with the full list (what the Daily screen now passes) an 8th Kyu learner gets 7 new items (words + a new phrase)', after === 7, { after })
const none = count(c.pickWords(v, 'daily', []))
T('R3', 'a learner with nothing in unrated tracks is unchanged (7)', none === 7, { none })
T('R4', 'the Daily screen passes the full list', /pickWords\(filteredVocab, mode, slotWords, \{ rankVocab: vocab \}\)/.test(require('fs').readFileSync('tt.jsx', 'utf8')))
console.log('\nrank-vs-unrated-tracks: ' + (n - fails) + '/' + n + (fails ? ' — FAILURES' : ' — ALL PASS'))
process.exit(fails ? 1 : 0)
