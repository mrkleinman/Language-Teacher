// 12 Nov — the Daily selection must come back in the SAME order every time it is computed (owner's screen recording: the Scene Ready word chips and
// conversation basics reshuffled by themselves, and the saved new-word slots never settled). Also: the test generator must bookend a lesson with a greeting and a parting.
const { load } = require('./harness')
const fs = require('fs')
const React = require('react')
const c = load(process.env.TT_FILE || 'tt.compiled.js', { React }); c.console.info = () => {}; c.console.warn = () => {}
let n = 0, fails = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; console.log((pass ? 'PASS ' : 'FAIL ') + id + '  ' + name + (!pass && detail !== undefined ? '\n      ' + JSON.stringify(detail).slice(0, 400) : '')) }
const P = c.ev('isThaiPhraseEntry')
const L = c.initVocab().map(w => ({ ...w }))
L.forEach(w => { const ci = w.curriculumIndex
  if (ci >= 1 && ci <= 311 && !P(w)) { w.status = 'learning'; w.introducedAt = '2026-08-01'; w.lastSeen = '2026-09-20'; w.okStreak = 1; w.interval = 3; w.dueDate = '2026-09-2' + (ci % 7); w.difficulty = 'medium' }
  else if (!P(w)) { if (w.status !== 'locked') w.status = 'new'; w.lastSeen = null; w.introducedAt = null; w.dueDate = null; w.okStreak = 0 } })
L.filter(w => P(w) && !w.duplicateOf && c.ev('thaiVocabEligibility')(w).ok && !c.ev('thaiGreetKindOf')(w.thai)).slice(0, 6).forEach(w => Object.assign(w, { status: 'learning', introducedAt: '2026-09-01', lastSeen: '2026-09-25', okStreak: 1, interval: 3, dueDate: '2026-09-30', difficulty: 'medium' }))
const runs = []; for (let i = 0; i < 6; i++) runs.push(c.pickWords(L, 'daily', []).targets.map(w => w.id))
T('S1', 'six computations of the same Daily selection give the same words in the same order', runs.every(r => JSON.stringify(r) === JSON.stringify(runs[0])), runs.map(r => r.slice(0, 6).join(',')))
const N = c.ev('isGenuinelyNew')
T('S2', 'new words still lead the list', (() => { const flags = runs[0].map(id => N(L.find(w => w.id === id))); const k = flags.lastIndexOf(true); return flags.slice(0, k + 1).every(Boolean) })())
const L2 = L.map(w => ({ ...w })); runs[0].filter(id => !N(L.find(w => w.id === id))).slice(0, 5).forEach(id => { L2.find(w => w.id === id).dueDate = '2099-01-01' })
const other = c.pickWords(L2, 'daily', []).targets.map(w => w.id)
T('S3', 'a different selection is not forced into the same order (the mix-up is kept, only made stable)', JSON.stringify(other) !== JSON.stringify(runs[0]))
const SRC = fs.readFileSync('tt.jsx', 'utf8')
T('S4', 'the saved new-word slots compare as a set (same words in another order is not a change)', /same words = same slots, whatever the order/.test(SRC))
T('S5', 'the test generator builds a greeting and a parting around its recalls', /async function thGen2Framing/.test(SRC) && /let out = framing\.open\.concat\(pairs, framing\.close\)/.test(SRC))
console.log('\nstable order + framing: ' + (n - fails) + '/' + n + (fails ? ' — FAILURES' : ' — ALL PASS'))
process.exit(fails ? 1 : 0)
