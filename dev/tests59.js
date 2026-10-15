// v701 — owner review of the live v700 Thai Daily track (thai-track-15-Oct-2026-daily.txt, 90/90 READY but 5.5/10):
//   1 target identity after a substitution (the saved track kept สวัสดีครับ 788 while its lines taught ใกล้ๆ 838)
//   2 speaker-bound targets (สวัสดีครับ: 11 paid checks, the woman was asked to say it) · 3 unnatural Thai that passed QC
//   4 cue / translation errors (pairs 14, 83) · 5 substituted lines appended after the goodbye
// Real app code throughout; the model is simulated at the transport boundary (tests14). No provider calls.
//   node tests59.js            (current build: tt.compiled.js, or TT_FILE)
'use strict'
const fs = require('fs')
const { load } = require('./harness')
const { sentence, mock } = require('./tests14')
const out = []; let fails = 0, n = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + String(id).padEnd(4) + ' ' + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 1500) : '')) }
const FILE = process.env.TT_FILE || 'tt.compiled.js'
const SRC = fs.readFileSync('tt.jsx', 'utf8')
const FIX = fs.readFileSync('sandbox/thai-daily-v700-fixture/thai-track-15-Oct-2026-daily.txt', 'utf8')
function exportPairs() {
  const P = []
  for (const b of FIX.split(/\n(?=\[\d{3}\] )/)) { const m = /^\[(\d{3})\] (.*)/.exec(b); if (!m) continue
    const g = k => ((new RegExp('^\\s*' + k + ':\\s*(.*)$', 'm')).exec(b) || [, ''])[1].trim()
    P.push({ n: +m[1], prompt: m[2], thai: g('TH'), english: g('EN'), type: (/TYPE: (\w+)/.exec(b) || [])[1], target: (/TARGET: (\S+)/.exec(b) || [])[1], speaker: (/SPEAKER: (\w)/.exec(b) || [])[1] }) }
  return P
}
function learner(c) {
  const v = c.initVocab().map(w => ({ ...w }))
  v.forEach(w => { const ci = w.curriculumIndex
    if (ci >= 1 && ci <= 311) { w.status = 'learning'; w.introducedAt = '2026-08-01'; w.lastSeen = '2026-09-20'; w.okStreak = 1; w.interval = 3; w.dueDate = '2026-09-2' + (ci % 7); w.difficulty = 'medium' }
    else { if (w.status !== 'locked') w.status = 'new'; w.lastSeen = null; w.introducedAt = null; w.dueDate = null; w.okStreak = 0 } })
  return v
}

;(async () => {
  const c = load(FILE, { realBelt: true }); c.console.info = () => {}; c.console.warn = () => {}
  const P = exportPairs(), byN = k => P.find(p => p.n === k)
  T('X0', 'the fixture is the complete live v700 export: 94 lines, 90 target lines, 3 substituted ใกล้ๆ lines after the goodbye (92–94)', P.length === 94 && P.filter(p => p.type === 'content').length === 90 && byN(90).type === 'framing' && byN(92).thai.includes('ใกล้ๆ'))

  // ══ 1 + 5 — substitution: identity carried to the saved track, lines placed before the closing exchange ══
  try {
    const L0 = learner(c), s0 = c.selectThaiTopicTargets(L0, 'wedding-speech'), ADAPTER = c.ev('TRACK_ADAPTERS').th
    const S0 = { c, vocab: L0, targets: s0.targetIds.map(id => L0.find(w => w.id === id)) }
    const revStuck = s0.selectedRevisionTargetIds[0]
    const mk = (S, counts) => {
      const fr = (sp, th, k) => ({ pairType: 'framing', speaker: sp, thai: th, english: 'Hello.', prompt: 'greeting', _semanticState: 'VERIFIED', _semNat: 5, _semCue: 'n/a', _pairKey: k })
      const pairs = [fr('A', 'สวัสดีครับ', 'f0'), fr('B', 'สวัสดีค่ะ', 'f1')]
      S.targets.forEach(t => { const k3 = counts[t.id] != null ? counts[t.id] : 3
        for (let k = 0; k < k3; k++) pairs.push({ ...sentence(S, 'th', t, 'gen', k), targetId: t.id, wordId: t.id, recallIndex: k + 1, _source: 'gemini-check-1:conv', language: 'th', pairType: 'content', _target: t.thai, recallGroupId: 'rg-' + t.id, _semanticState: 'VERIFIED', _semNat: 5, _semCue: 5, words: [], phonetic: '' }) })
      pairs.push({ ...fr('A', 'ไว้เจอกันใหม่นะครับ', 'c0'), english: 'See you again.', prompt: 'say goodbye' }, { ...fr('B', 'เดินทางปลอดภัยนะคะ', 'c1'), english: 'Travel safely.', prompt: 'say goodbye' })
      const nw = new Set(s0.selectedNewTargetIds)
      const tr = { createdAt: '2026-10-15T05:00:00.000Z-sub59', date: '15 Oct 2026', mode: 'daily', trackMode: 'daily', language: 'th', trackType: 'daily', selectionMode: 'topic', topicId: 'wedding-speech', pairs,
        keywords: S.targets.map(t => ({ wordId: t.id, thai: t.thai, english: t.english, phonetic: t.phonetic || '', rating: null, isNew: nw.has(t.id), isUnseen: nw.has(t.id) })), rated: false }
      tr.selectedTargetIds = tr.keywords.map(k => k.wordId); tr.selectedNewTargetIds = s0.selectedNewTargetIds.slice(); tr.selectedRevisionTargetIds = s0.selectedRevisionTargetIds.slice()
      tr.trackContext = c.makeTrackContext({ trackId: tr.createdAt, language: 'th', mode: 'daily', selectedTargetIds: tr.selectedTargetIds, selectedNewTargetIds: tr.selectedNewTargetIds })
      return tr
    }
    const probe = mk(S0, {}), cands = c.thaiSubstitutionCandidates(probe, L0, probe.keywords)
    const S = { c, vocab: L0, targets: S0.targets.concat(cands.slice(0, 2)) }
    mock(S, 'th', {})
    const STUCK = { ...ADAPTER, recoverTargetPairs: (kw, need, ctx) => kw.wordId === revStuck ? Promise.resolve({ accepted: [], reasons: ['CHECKS_EXHAUSTED (test)'] }) : ADAPTER.recoverTargetPairs(kw, need, ctx) }
    // the live case: the stuck target has NO line at all (สวัสดีครับ never produced one)
    const tr = mk({ ...S, targets: S0.targets }, { [revStuck]: 0 })
    const log = []
    const ft = await c.finaliseMainTrack(tr, STUCK, { vocab: L0, apiKey: 'k', model: 'gemini-2.5-flash-lite', qcRan: true, onLog: m => log.push(m) })
    const sub = (ft.targetSubstitutions || [])[0]
    T('1a', 'the finaliser swaps the identity: keywords, selectedTargetIds, TrackContext and Listening required ids name the new word, not the old one',
      !!sub && sub.fromId === revStuck && ft.selectedTargetIds.includes(sub.toId) && !ft.selectedTargetIds.includes(revStuck) && c.listeningRequiredTargetIds(ft).requiredIds.includes(sub.toId) && !c.listeningRequiredTargetIds(ft).requiredIds.includes(revStuck),
      { sub, log: log.filter(l => /SUBSTITU/.test(l)).slice(0, 3) })
    // the live bug: the screen copied back only pairs + integrity onto the track it was showing
    const shown = { ...tr }
    const savedOld = { ...shown, pairs: ft.pairs, integrity: ft.integrity, finalTrack: ft.finalTrack }
    const savedNew = { ...shown, ...c.finalTrackIdentityFields(ft), pairs: ft.pairs, integrity: ft.integrity, finalTrack: ft.finalTrack }
    const reqOld = c.listeningRequiredTargetIds(savedOld).requiredIds, reqNew = c.listeningRequiredTargetIds(savedNew).requiredIds
    const exp = c.trackVersionExportLines(savedNew).join('\n')
    T('1b', 'reproduces the live defect: copying back only pairs + integrity keeps the OLD id in selectedTargetIds / requiredListeningTargetIds (what the v700 export showed)', reqOld.includes(revStuck) && !reqOld.includes(sub.toId))
    T('1c', 'with the identity fields copied back, the SAVED track (and its export) lists the word the lesson actually teaches; 30 required ids, each taught 3×',
      reqNew.includes(sub.toId) && !reqNew.includes(revStuck) && reqNew.length === 30 && new RegExp('selectedTargetIds: \\[[^\\]]*\\b' + sub.toId + '\\b').test(exp) && !new RegExp('requiredListeningTargetIds: \\[[^\\]]*\\b' + revStuck + '\\b').test(exp) &&
      reqNew.every(id => savedNew.pairs.filter(p => p && p.targetId === id && c.classifyTrackPair(p) === 'TARGET').length === 3), { reqNew: reqNew.length })
    const copyBacks = (SRC.match(/integrity: _(ft|re)\.integrity/g) || []).length, fixed = (SRC.match(/\.\.\.finalTrackIdentityFields\(_(ft|re)\)[^\n]*\n?[^\n]*?integrity: _(ft|re)\.integrity/g) || []).length
    T('1d', 'every place the app copies a finalised track back (the Thai screen ×2, the save gate, the bench path ×2) carries the identity fields', copyBacks >= 4 && copyBacks === fixed, { copyBacks, fixed })
    const subIdx = ft.pairs.map((p, i) => p && p.substitutedFor === revStuck ? i : -1).filter(i => i >= 0), closeIdx = ft.pairs.findIndex(p => p && p._pairKey === 'c0')
    T('5a', 'substituted lines go BEFORE the closing exchange: the goodbye stays the last two lines (live v700: ใกล้ๆ ×3 after the goodbye)',
      subIdx.length === 3 && closeIdx > 0 && subIdx.every(i => i < closeIdx) && c.classifyTrackPair(ft.pairs[ft.pairs.length - 1]) === 'FRAMING' && ft.pairs[ft.pairs.length - 2]._pairKey === 'c0', { subIdx, closeIdx, n: ft.pairs.length })
    T('5b', 'the shared placement rule: a line with no group to join goes before the trailing framing lines, never after them', c._beforeClosingFraming([{ targetId: 1, pairType: 'content', thai: 'x' }, { pairType: 'framing', thai: 'ลาก่อนครับ' }, { pairType: 'framing', thai: 'ค่ะ' }]) === 1)
  } catch (e) { T('ERR', 'section 1/5 crashed: ' + String(e && e.stack).slice(0, 400), false) }

  // ══ 2 — speaker-bound targets ══
  try {
    const g = w => c.thaiGenderedTargetSpeaker(w)
    T('2a', 'phrases carrying a gendered particle / pronoun are speaker-bound: สวัสดีครับ · ผมเอง · นี่ครับ · ผมจองไว้ครับ → A (the man); สวัสดีค่ะ · ดิฉันเอง · ขอบคุณค่ะ → B (the woman)',
      ['สวัสดีครับ', 'ผมเอง', 'นี่ครับ', 'ผมจองไว้ครับ'].every(w => g(w) === 'A') && ['สวัสดีค่ะ', 'ดิฉันเอง', 'ขอบคุณค่ะ'].every(w => g(w) === 'B'))
    T('2b', 'neutral words stay open to both speakers (ใกล้ๆ, เชิญนั่ง, ยินดีที่ได้รู้จัก, ผมยาว "long hair")', ['ใกล้ๆ', 'เชิญนั่ง', 'ยินดีที่ได้รู้จัก', 'ผมยาว'].every(w => g(w) === null))
    T('2c', 'the generation prompt asks for all three lines from that speaker when the target is speaker-bound (no "LINE 2 (B)" for สวัสดีครับ)', /'LINE 2 \(' \+ _gs \+ '\)/.test(SRC) && /\(thaiGenderedTargetSpeaker\(target\.thai\)\)/.test(SRC))
    T('2d', 'a speaker conflict that repeats 3 checks in a row stops paid attempts (live: 11 identical failures) — recovery / substitution takes over', /_speakerStreak >= 3/.test(SRC) && /SPEAKER_CONFLICT_REPEATED/.test(SRC))
  } catch (e) { T('ERR', 'section 2 crashed: ' + String(e && e.stack).slice(0, 300), false) }

  // ══ 3 — unnatural Thai that passed QC ══
  try {
    const ids = k => c.thaiLexicalSenseProblems(byN(k)).map(x => x.id)
    const want = { 17: 'LISTEN_TO_LOVE', 23: 'KHO_HAI_BARE_DI', 30: 'NGAN_LAEW', 43: 'MAI_CHOENG_UNQUALIFIED', 45: 'MUEA_RU_CALQUE', 61: 'MEE_ROT_KHAP', 80: 'CHOEN_AS_QUESTION', 85: 'TONRAP_WITH_THING' }
    const miss = Object.entries(want).filter(([k, id]) => !ids(+k).includes(id)).map(([k, id]) => k + ' ' + byN(+k).thai + ' (' + id + ')')
    T('3a', 'all eight lines from the review are now rejected by an objective rule (17 ฟังความรัก · 23 ขอให้เขาดี · 30 งั้นแล้ว · 43 ไม่เชิง + unrelated · 45 บอก…เมื่อรู้ · 61 มีรถขับไหม · 80 เชิญนั่งไหม · 85 ต้อนรับ…ด้วยน้ำ)', !miss.length, miss)
    const flagged = P.filter(p => p.type === 'content' && c.thaiLexicalSenseProblems(p).length).map(p => p.n)
    T('3b', 'across the whole export nothing else is flagged except pair 32 (the same งั้นแล้ว error) — no false positives on the other 81 target lines', JSON.stringify(flagged) === JSON.stringify([17, 23, 30, 32, 43, 45, 61, 80, 85]), flagged)
    const ok = ['ไม่เชิงค่ะ แค่ชอบนิดหน่อย', 'ไม่เชิงครับ ผมยังไม่รู้เลย', 'ขอให้มีความสุขนะครับ', 'ขอให้ทุกคนสุขภาพดีครับ', 'เชิญนั่งครับ', 'รู้แล้วจะบอกนะครับ', 'คุณมีรถไหมคะ', 'ผมไม่มีรถขับครับ', 'อยากฟังเรื่องความรักของเขาไหมครับ', 'ยินดีต้อนรับครับ', 'งั้นคุยกันเมื่อไหร่ดีคะ']
    const fp = ok.filter(t => c.thaiLexicalSenseProblems({ thai: t, english: '' }).length)
    T('3c', 'the natural forms pass (ไม่เชิงค่ะ แค่ชอบนิดหน่อย · ขอให้มีความสุข · เชิญนั่งครับ · รู้แล้วจะบอก · ผมไม่มีรถขับ · เรื่องความรัก …)', !fp.length, fp)
    const G = c.ev('THAI_USAGE_TARGET_GUIDE')
    T('3d', 'teaching guides for ความรัก, ขอให้ and เชิญนั่ง steer generation to the natural use (the Wedding Speech words)', /เรื่องความรัก/.test(G['ความรัก']) && /ขอให้มีความสุข/.test(G['ขอให้']) && /NEVER as a yes\/no question/.test(G['เชิญนั่ง']))
  } catch (e) { T('ERR', 'section 3 crashed: ' + String(e && e.stack).slice(0, 300), false) }

  // ══ 4 — cues and translations ══
  try {
    const p83 = byN(83), p14 = byN(14)
    const e83 = c.thaiEnglishFaithfulFix(p83), e14 = c.thaiEnglishFaithfulFix(p14)
    T('4a', 'pair 83: the English no longer adds "you came" (Thai ผมดีใจ) and the rebuilt cue is grammatical: "Thank her so much, and say you\'re glad."',
      e83 === "Thank you so much. I'm glad." && c.cueFromEnglish('th', e83, p83.thai, { addr: 'f', names: [] }) === "Thank her so much, and say you're glad.", [e83, c.cueFromEnglish('th', e83, p83.thai, { addr: 'f', names: [] })])
    T('4b', 'the person shift keeps a subject a subject: "Thank you so much. I\'m glad you came." → "Thank her so much, and say you\'re glad she came." (live: "…you\'re glad her came.")',
      c.cueFromEnglish('th', "Thank you so much. I'm glad you came.", 'x', { addr: 'f', names: [] }) === "Thank her so much, and say you're glad she came.")
    T('4c', 'pair 14: "Do you want to come to the wedding too?" for คุณไปงานแต่งงานด้วยไหมครับ (no อยาก) → "Are you coming to the wedding too?"; a Thai line WITH อยาก keeps "want"',
      e14 === 'Are you coming to the wedding too?' && c.thaiEnglishFaithfulFix({ thai: 'คุณอยากไปงานแต่งงานไหม', english: 'Do you want to go to the wedding?' }) === 'Do you want to go to the wedding?', e14)
    T('4d', 'the finaliser applies it to Thai lines (TH_TEXT_FIX: the Thai is kept, the English corrected, the cue rebuilt — the final snapshot audit then judges the changed line)', /TH_TEXT_FIX/.test(SRC) && /thaiEnglishFaithfulFix\(p\)/.test(SRC))
  } catch (e) { T('ERR', 'section 4 crashed: ' + String(e && e.stack).slice(0, 300), false) }

  out.forEach(l => console.log(l))
  console.log('\nv701 Thai v700-review regression: ' + (n - fails) + '/' + n + (fails ? ' — ' + fails + ' FAILED' : ' — ALL PASS'))
  process.exit(fails ? 1 : 0)
})().catch(e => { out.forEach(l => console.log(l)); console.error(e); process.exit(1) })
