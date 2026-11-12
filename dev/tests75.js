// 12 Nov — a Thai Daily with due review phrases on top of the 30 words (phrase scheduling) must be judged against 30 + phrases, not a flat 30.
// Owner's export of 12 Nov: 35 targets, 105/105 pairs, every check passed, yet "MAIN TRACK NOT_READY — SELECTED_TARGETS=35 (required 30)".
const { load } = require('./harness')
const { sentence, mock } = require('./tests14')
const React = require('react')
const FILE = process.env.TT_FILE || 'tt.compiled.js'
let n = 0, fails = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; console.log((pass ? 'PASS ' : 'FAIL ') + id + '  ' + name + (!pass && detail !== undefined ? '\n      ' + JSON.stringify(detail).slice(0, 500) : '')) }
;(async () => {
  const c = load(FILE, { React }); c.console.info = () => {}; c.console.warn = () => {}
  const P = c.ev('isThaiPhraseEntry')
  const L = c.initVocab().map(w => ({ ...w }))
  L.forEach(w => { const ci = w.curriculumIndex
    if (ci >= 1 && ci <= 311 && !P(w)) { w.status = 'learning'; w.introducedAt = '2026-08-01'; w.lastSeen = '2026-09-20'; w.okStreak = 1; w.interval = 3; w.dueDate = '2026-09-2' + (ci % 7); w.difficulty = 'medium' }
    else if (!P(w)) { if (w.status !== 'locked') w.status = 'new'; w.lastSeen = null; w.introducedAt = null; w.dueDate = null; w.okStreak = 0 } })
  // six learned phrases that are due, as in the owner's account
  const ph = L.filter(w => P(w) && !w.duplicateOf && c.ev('thaiVocabEligibility')(w).ok && !c.ev('thaiGreetKindOf')(w.thai)).slice(0, 6)
  ph.forEach(w => Object.assign(w, { status: 'learning', introducedAt: '2026-09-01', lastSeen: '2026-09-25', okStreak: 1, interval: 3, dueDate: '2026-09-30', difficulty: 'medium' }))
  const pk = c.pickWords(L, 'daily', [])
  const extras = pk.targets.filter(w => w._phraseReview)
  T('P0', 'setup: the selector returns 30 words plus due review phrases on top', extras.length >= 1 && pk.targets.length === 30 + extras.length, { extras: extras.length, total: pk.targets.length })
  const targets = pk.targets
  const S = { c, vocab: L, targets }
  const fr = [{ pairType: 'framing', speaker: 'A', thai: 'สวัสดีครับ', english: 'Hello.', prompt: 'greeting', _semanticState: 'VERIFIED', _semNat: 5, _semCue: 'n/a', _pairKey: 'f0' },
              { pairType: 'framing', speaker: 'B', thai: 'สวัสดีค่ะ', english: 'Hello.', prompt: 'greeting', _semanticState: 'VERIFIED', _semNat: 5, _semCue: 'n/a', _pairKey: 'f1' }]
  const pairs = fr.slice()
  targets.forEach(t => { for (let k = 0; k < 3; k++) { const s = sentence(S, 'th', t, 'gen', k)
    pairs.push({ ...s, targetId: t.id, wordId: t.id, recallIndex: k + 1, _source: 'gemini-check-1:conv', language: 'th', pairType: 'content', _target: t.thai, recallGroupId: 'rg-' + t.id, _semanticState: 'VERIFIED', _semNat: 5, _semCue: 'ok', _pairKey: 'p' + t.id + '-' + k }) } })
  const nw = new Set(targets.filter(w => c.ev('isGenuinelyNew')(w)).map(w => w.id))
  const tr = { createdAt: '2026-11-12T06:39:28.241Z', date: '12 Nov 2026', mode: 'daily', trackMode: 'daily', language: 'th', trackType: 'daily', pairs,
    keywords: targets.map(t => ({ wordId: t.id, thai: t.thai, english: t.english, phonetic: t.phonetic || '', rating: null, isNew: nw.has(t.id), isUnseen: nw.has(t.id) })) }
  tr.selectedTargetIds = tr.keywords.map(k => k.wordId); tr.selectedNewTargetIds = [...nw]
  mock(S, 'th', {})
  const log = []
  const t = await c.finaliseMainTrack(tr, c.ev('TRACK_ADAPTERS').th, { vocab: L, apiKey: 'k', model: 'gemini-2.5-flash-lite', qcRan: true, onLog: m => log.push(m) })
  const rd = c.trackReadiness(t)
  if (process.env.TT_DEBUG) console.log('kw phrases:', (t.keywords || []).filter(k => c.ev('THAI_PHRASE_IDS').has(k.wordId)).map(k => [k.wordId, k.thai, k.isNew].join(' ')).join(' | '), '| kws', (t.keywords || []).length, 'ids', JSON.stringify(t.selectedTargetIds && t.selectedTargetIds.length))
  if (process.env.TT_DEBUG) { const kk = c.ev('TRACK_ADAPTERS').th.keywordsOf(t); console.log('adapter kws', kk.length, 'nonnew phrases', kk.filter(k => c.ev('THAI_PHRASE_IDS').has(k.wordId) && !k.isNew).map(k => k.wordId + ':' + k.thai + ':' + k.isNew).join(' '), 'req', c.ev('trackTargetsRequired')('th', kk)) }
  const bad = (rd.reasons || []).filter(r => /SELECTED_TARGETS|TARGET_PAIR_QUOTA/.test(r))
  T('P1', 'the 30 + phrase-extras track is not rejected for its size (no SELECTED_TARGETS / TARGET_PAIR_QUOTA reason)', bad.length === 0, bad)
  T('P2', 'the expected pair count follows the track (3 per target), not a flat 90', rd.expectedTargetPairs === 3 * targets.length && rd.validTargetPairs === 3 * targets.length, { exp: rd.expectedTargetPairs, valid: rd.validTargetPairs })
  T('P3', 'a plain 30-word track still needs exactly 30 (helper)', c.ev('trackTargetsRequired')('th', L.filter(w => !P(w)).slice(0, 30).map(w => ({ wordId: w.id, isNew: false }))) === 30 && c.ev('trackTargetsRequired')('ja', extras.map(w => ({ wordId: w.id, isNew: false }))) === 30)
  T('P4', 'review phrases add to the requirement; a NEW phrase does not', c.ev('trackTargetsRequired')('th', extras.map(w => ({ wordId: w.id, isNew: false }))) === 30 + extras.length && c.ev('trackTargetsRequired')('th', extras.map(w => ({ wordId: w.id })), extras.map(w => w.id)) === 30)
  console.log('\nphrase-extras integrity: ' + (n - fails) + '/' + n + (fails ? ' — FAILURES' : ' — ALL PASS'))
  process.exit(fails ? 1 : 0)
})().catch(e => { console.log('CRASH', e); process.exit(2) })
