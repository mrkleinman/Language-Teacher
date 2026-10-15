// v700 — JAPANESE v699 QUALITY FIX (the owner's brief on the live v699 export japanese-track-2026-10-15-daily.txt and its generation
// log). Real app code throughout: the cue addressee check and fix, reply-word discourse rules, the bounded reply-trigger repair, the
// romaji tidy, the target-sense matcher, the variety key, the naturalness rules, the English faithfulness fix and the shared finaliser
// (finaliseMainTrack with the model simulated at the transport boundary — tests14). No provider calls.
//   node tests57.js        (current build: tt.compiled.js, or TT_FILE)
'use strict'
const fs = require('fs')
const { load } = require('./harness')
const { setup, makeTrack, mock } = require('./tests14')
const out = []; let fails = 0, n = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + String(id).padEnd(4) + ' ' + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 1500) : '')) }
const FILE = process.env.TT_FILE || 'tt.compiled.js'
const FIX = fs.readFileSync('sandbox/japanese-daily-v699-fixture/japanese-track-2026-10-15-daily.txt', 'utf8')
const SCENE = { scene: { characterA: 'Ken', characterB: 'Mai' } }
function exportPairs() {
  const rows = []
  for (const b of FIX.split(/\n(?=PAIR \d\d)/)) {
    const m = /^PAIR (\d\d)/.exec(b); if (!m) continue
    const g = k => ((new RegExp('^\\s*' + k + ':\\s*(.*)$', 'm')).exec(b) || [, ''])[1].trim()
    rows.push({ n: +m[1], speaker: g('SPEAKER'), japanese: g('JAPANESE'), reading: g('READING'), romaji: g('ROMAJI'), english: g('ENGLISH MEANING'), prompt: g('ENGLISH CUE'), target: g('TARGET') })
  }
  return rows
}

;(async () => {
  const c = load(FILE, { realBelt: true }); c.console.info = () => {}; c.console.warn = () => {}
  const V = c.initJapaneseVocab(), W = j => V.find(w => w.japanese === j)
  const P = exportPairs(), byN = k => P.find(p => p.n === k)
  T('X0', 'the fixture is the complete persisted v699 export: 94 lines, 90 with a target', P.length === 94 && P.filter(p => p.target).length === 90, P.length)

  // ══ 1–2. Speaker / addressee ══
  try {
    const g = c._cueInferGenders(P, { name: 'Ken' }, { name: 'Mai' })
    T('1a', 'speaker roles are inferred from the lines themselves (the scene gives no gender words): Ken (A) is "he", Mai (B) is "she"', g.A === 'm' && g.B === 'f', g)
    const before = c.cueAddresseeProblems(P, SCENE)
    const bad = [12, 13, 14, 18, 20, 24, 32, 58, 64, 76]
    T('2a', 'the final addressee check now finds exactly the ten wrong-addressee cues of the brief (12 13 14 18 24 32 76 + 20 58 64)', before.length === 10 && bad.every(k => before.some(x => x.startsWith('[' + k + ' '))), before)
    const F = c.fixCueAddressees(P, SCENE, null).pairs
    const changed = F.map((p, i) => p.prompt !== P[i].prompt ? P[i].n : null).filter(Boolean)
    T('2b', 'all ten are fixed and no other cue changes', JSON.stringify(changed) === JSON.stringify(bad), changed)
    const fx = k => F[P.indexOf(byN(k))].prompt
    T('2c', 'Mai asks Ken → "him / he": 12 "Ask him what he\'d like for lunch." · 24 "Apologise to him …" · 76 "Tell him …"', fx(12) === "Ask him what he'd like for lunch." && /^Apologise to him and tell him/.test(fx(24)) && /^Tell him that after eating/.test(fx(76)), [fx(12), fx(24), fx(76)])
    T('2d', 'Ken asks Mai → "her / she": 13 "Ask her what she is going to do at lunchtime."', fx(13) === 'Ask her what she is going to do at lunchtime.', fx(13))
    T('2e', 'after the fix the final check finds none (READY cannot pass with one left)', c.cueAddresseeProblems(F, SCENE).length === 0)
    T('2f', 'correct cues stay as written: 86 "Ask if he will take the bus on the way back." (Mai → Ken)', fx(86) === byN(86).prompt)
    T('2g', 'the pronoun swap never writes "tell his you" / "Ask his which"', !F.some(p => /\b(tell|ask|to) his (you|which|what|if|that)\b/i.test(p.prompt)), F.filter(p => /\b(tell|ask|to) his\b/i.test(p.prompt)).map(p => p.prompt))
  } catch (e) { T('ERR', 'section 1–2 crashed: ' + String(e && e.stack).slice(0, 300), false) }

  // ══ 3–5. はい / うん / いいえ in discourse ══
  try {
    const L = (a, b) => [{ speaker: 'A', japanese: a }, { speaker: 'B', japanese: b }]
    const ack = (a, b) => c.jaReplyAcknowledges(...L(a, b))
    T('3a', 'a yes/no question is answered: 時間ある？ → うん、時間あるよ。 is a triggered reply', c.jaIsYesNoQuestion({ japanese: '今日、時間ある？' }))
    T('4a', 'valid acknowledgements with no yes/no question: ちょっと待ってて。→ うん、分かった。 · 一緒に行こう。→ うん、いいよ。 · ごめん。→ いいえ、大丈夫。',
      ack('ちょっと待ってて。', 'うん、分かった。') && ack('一緒に行こう。', 'うん、いいよ。') && ack('ごめん、遅くなった。', 'いいえ、大丈夫。'))
    T('4b', 'いいえ rejecting what was just said about the same thing: この店、高いね。→ いいえ、高くない。 · もう食べた？ → ううん、まだ。',
      ack('この店、高いね。', 'いいえ、高くない。') && ack('もう食べた？', 'ううん、まだ。'))
    T('5a', 'rejected: いいえ、高くない。 after an unrelated line (live pair 23 after 映画、どうだった？) · はい、… after a question-word question',
      !ack('映画、どうだった？', 'いいえ、高くない。') && !ack('昼、どこ行く？', 'はい、駅の近く。') && !ack('電車で行くね。', 'いいえ、高くない。'))
    const rows = P.map(p => ({ ...p, pairType: p.target ? 'content' : 'framing', targetId: p.target ? 1 : null, _framing: !p.target }))
    const pl = c.jaPlaceReplyLines(rows, null)
    T('5b', 'a reply is only moved after a question ABOUT it (shared content) unless it is a bare acknowledgement; the text never changes',
      pl.pairs.length === 94 && pl.moved.every(r => { const i = pl.pairs.indexOf(r), q = pl.pairs[i - 1], bare = !r.japanese.replace(/^(はい|うん|いいえ|ううん)[、。！!]?/, '').replace(/[。！!]/g, '').trim(); return q.speaker !== r.speaker && (bare || c.jaSharesContent(q.japanese, r.japanese)) }),
      { moved: pl.moved.map(x => x.japanese), orphan: pl.orphan.map(x => x.japanese) })
  } catch (e) { T('ERR', 'section 3–5 crashed: ' + String(e && e.stack).slice(0, 300), false) }

  // ══ 6–7. Response-trigger repair: bounded batches, MAX_TOKENS, unresolved reported ══
  try {
    const S = setup('ja'); mock(S, 'ja'); const c2 = S.c
    const hai = S.vocab.find(w => w.japanese === 'はい') || W('はい')
    const kw = S.targets.map(t => ({ wordId: t.id, japanese: t.japanese }))
    const rep = (k) => ({ speaker: 'B', japanese: 'はい、' + ['駅に行く。', '水を飲む。', '店に行く。', '昼に食べる。', '電車で帰る。'][k % 5], english: 'Yes.', prompt: 'p', pairType: 'content', targetId: hai.id })
    const base = []; for (let k = 0; k < 5; k++) { base.push({ speaker: 'A', japanese: '映画、見た。', english: 'I saw a movie.', prompt: 'x', pairType: 'content', targetId: 900 + k }); base.push(rep(k)) }
    const calls = []
    c2.mockGeminiGenerate = async (k, m, msgs, max) => { const q = msgs[msgs.length - 1].content; const ids = (q.match(/^\d+\. /gm) || []).map(x => parseInt(x)); calls.push({ ids, max })
      // a multi-reply request is cut off (MAX_TOKENS → truncated JSON); a single-reply request succeeds
      if (ids.length > 1) return '[{"i":' + ids[0] + ',"japanese":"駅に'
      return JSON.stringify([{ i: ids[0], japanese: '今、大丈夫？', english: 'Are you okay now?' }]) }
    const logs = []
    const r = await c2.jaBridgeReplyTriggers({ keywords: kw, scene: { characterA: 'Ken', characterB: 'Mai' }, pairs: base.map(p => ({ ...p })) }, { apiKey: 'k', model: 'm', vocab: S.vocab, vocabById: new Map(S.vocab.map(w => [w.id, w])) }, m => logs.push(m))
    const batches = calls.filter(x => x.ids.length > 1)
    T('7a', 'replies are repaired in bounded batches (≤ 3 per request, room per reply: 400 + 220 × n tokens) — not one request for every reply', batches.length >= 1 && batches.every(b => b.ids.length <= 3 && b.max === 400 + 220 * b.ids.length), calls)
    T('7b', 'a batch cut off by MAX_TOKENS is retried one reply at a time (not silently dropped)', r.failedRequests >= 1 && calls.filter(x => x.ids.length === 1).length >= 3, { failed: r.failedRequests, calls: calls.length })
    // now every request fails → the replies stay unresolved and are reported
    c2.mockGeminiGenerate = async () => '{not json'
    const logs2 = []
    const r2 = await c2.jaBridgeReplyTriggers({ keywords: kw, scene: { characterA: 'Ken', characterB: 'Mai' }, pairs: base.map(p => ({ ...p })) }, { apiKey: 'k', model: 'm', vocab: S.vocab, vocabById: new Map(S.vocab.map(w => [w.id, w])) }, m => logs2.push(m))
    T('6a', 'a failed repair leaves the replies UNRESOLVED and says so in the log (live v699: dropped silently, track READY)', (r2.unresolved || []).length >= 1 && logs2.some(l => /UNRESOLVED/.test(l)), { un: (r2.unresolved || []).length, logs2 })
    const SRC = fs.readFileSync('tt.jsx', 'utf8')
    T('6b', 'an unresolved reply blocks READY (RESPONSE_CONTEXT_UNRESOLVED is a readiness reason, counted on the final lines)', /if \(inv\.RESPONSE_CONTEXT_UNRESOLVED\) reasons\.push/.test(SRC) && /inv\.RESPONSE_CONTEXT_UNRESOLVED = ur\.length/.test(SRC))
  } catch (e) { T('ERR', 'section 6–7 crashed: ' + String(e && e.stack).slice(0, 300), false) }

  // ══ 8. Natural Japanese for the specific problem pairs ══
  try {
    const pr = s => c.jaPragmaticProblems(s, null)
    T('8a', 'pair 67 あれは行ったことある？ is rejected (あれ is a thing; a place is あそこ); あそこ、行ったことある？ / あれは何？ pass', pr('あれは行ったことある？').length > 0 && !pr('あそこ、行ったことある？').length && !pr('あれは何？').length)
    T('8b', 'pair 34 あそこで食べるけど、水も飲む？ is rejected (けど without a contrast); ちょっと忙しいけど、大丈夫。 / 雨だけど、傘もある？ pass', pr('あそこで食べるけど、水も飲む？').length > 0 && !pr('ちょっと忙しいけど、大丈夫。').length && !pr('雨だけど、傘もある？').length)
    T('8c', 'pair 85 電車で行くから、ここでね。 is rejected (not a goodbye); 電車で行くね。 passes', pr('電車で行くから、ここでね。').length > 0 && !pr('電車で行くね。').length)
    const f02 = c.jaHowAreYouReplyFix(byN(1).japanese, byN(2))
    T('8d', 'pair 02: うん、いいよ answering 今日どう？ becomes うん、大丈夫 (a taught word) — reading, romaji and English follow; the rest is unchanged',
      f02 && f02.japanese === 'うん、大丈夫。ねえ、昼どこ行く？' && f02.reading === 'うん、だいじょうぶ。ねえ、ひるどこいく？' && f02.romaji === 'un, daijoubu. nee, hiru doko iku?' && /^Yeah, I'm good\./.test(f02.english), f02)
    T('8e', 'うん、いいよ。 after a real offer (一緒に行こう？) is left alone', c.jaHowAreYouReplyFix('一緒に行こう？', { japanese: 'うん、いいよ。' }) === null)
    const e46 = c.jaEnglishFaithfulFix(byN(46)), e24 = c.jaEnglishFaithfulFix(byN(24))
    T('8f', 'pair 46: the English loses "both" (no 二人 / 両方 / どっちも in the Japanese) — the Japanese is not regenerated', e46 === "Let's eat something we like together.", e46)
    T('8g', 'pair 24: "Sorry, I got a little late." → "Sorry, I\'m a little late."', e24 === "Sorry, I'm a little late.", e24)
    T('8h', '"both" stays when the Japanese says it (二人とも)', c.jaEnglishFaithfulFix({ japanese: '二人とも好きな物を食べよう。', english: "Let's eat something we both like." }) === "Let's eat something we both like.")
  } catch (e) { T('ERR', 'section 8 crashed: ' + String(e && e.stack).slice(0, 300), false) }

  // ══ 9. Short English cues with accurate meaning ══
  try {
    const cl = (p) => c.cueClarify('ja', p, {}).cue
    const c02 = cl({ prompt: byN(2).prompt, english: "Yeah, I'm good. Hey, where should we go for lunch?", japanese: 'うん、大丈夫。ねえ、昼どこ行く？', pairType: 'framing' })
    T('9a', 'pair 02 cue drops the stage directions: "… then ask where to go for lunch." (no "get Ken\'s attention", no "suggest asking")', !/attention|suggest asking/.test(c02) && /ask where to go for lunch/.test(c02) && c02.split(/\s+/).length <= 14, c02)
    const c34 = cl({ prompt: byN(34).prompt, english: 'Will you drink water there too?', japanese: 'あそこで水も飲む？' })
    T('9b', 'pair 34 cue drops "Following up on the lunch plan," and keeps the meaning (ask … drink water)', !/Following up/.test(c34) && /^Ask\b/.test(c34) && /drink water/.test(c34), c34)
    T('9c', 'a short accurate cue is untouched: "Ask how the movie was."', cl({ prompt: 'Ask how the movie was.', english: 'How was the movie?', japanese: '映画、どうだった？' }) === 'Ask how the movie was.')
  } catch (e) { T('ERR', 'section 9 crashed: ' + String(e && e.stack).slice(0, 300), false) }

  // ══ 10. Romaji ══
  try {
    const bank = c.ev('RAW_JAPANESE_VOCAB')
    const ro = k => { const p = byN(k); return c.jaFinalRomaji({ japanese: p.japanese, reading: p.reading, romaji: p.romaji }, bank, null).romaji }
    T('10a', 'pair 69 / 76 / 90 tabeta ra → tabetara', /\btabetara\b/.test(ro(69)) && /\btabetara\b/.test(ro(76)) && /\btabetara\b/.test(ro(90)), [ro(69), ro(76), ro(90)])
    T('10b', 'pair 05 hima na nda → hima nan da · pair 48 janai nda → janai n da · pair 92 iku nda → iku n da', /hima nan da/.test(ro(5)) && /janai n da/.test(ro(48)) && /iku n da/.test(ro(92)), [ro(5), ro(48), ro(92)])
    T('10c', "pair 51 wakan'nai → wakannai · pair 07 shite nai → shitenai · pair 88 kaettara kept", /wakannai/.test(ro(51)) && /shitenai/.test(ro(7)) && /kaettara/.test(ro(88)), [ro(51), ro(7), ro(88)])
    const all = P.map(p => c.jaFinalRomaji({ japanese: p.japanese, reading: p.reading, romaji: p.romaji }, bank, null).romaji)
    T('10d', 'no exported line keeps a split conjugation ("ta ra", "na nda", "n\'n")', !all.some(r => /\bta ra\b|\bna nda\b|n'n/.test(r)), all.filter(r => /\bta ra\b|\bna nda\b|n'n/.test(r)))
    T('10e', 'valid romaji is unchanged: konnichiwa / densha de iku / kaeri wa basu ni noru?', all[0] === byN(1).romaji && ro(86) === 'kaeri wa basu ni noru?', [all[0], ro(86)])
  } catch (e) { T('ERR', 'section 10 crashed: ' + String(e && e.stack).slice(0, 300), false) }

  // ══ 11–12. Question words: declarative / indirect uses, どれ vs どれも ══
  try {
    const dotchi = W('どっち'), dore = W('どれ'), doko = W('どこ')
    T('11a', 'declarative どっちの…も ("both … are fine") is not a question', !c.jaWhQuestion('どっちの店もいいね。') && c.jaWhQuestion('どっちの店がいい？'))
    T('11b', 'indirect / wondering uses still practise the word: どっちかな？ · どっちか分かんない · どこにあるか分からない', c.matchesJapaneseTarget('どっちかな？', dotchi) && c.matchesJapaneseTarget('どっちか分かんない。', dotchi) && c.matchesJapaneseTarget('お店、どこにあるか分からない。', doko))
    T('11c', 'the real compound どっちか ("either one") is still a different word: どっちかにしよう。', !c.matchesJapaneseTarget('どっちかにしよう。', dotchi))
    T('12a', 'どれ vs どれも stay distinct: どれも近いね。 does not practise どれ; どれがいい？ does', !c.matchesJapaneseTarget('どれも近いね。', dore) && c.matchesJapaneseTarget('どれがいい？', dore))
  } catch (e) { T('ERR', 'section 11–12 crashed: ' + String(e && e.stack).slice(0, 300), false) }

  // ══ 13. Three meaningfully distinct uses ══
  try {
    const k = (s, t) => c.japaneseFormulaKey(s, t)
    T('13a', 'じゃあ、どっちにする？ is the same use as どっちにする？ (live v699 counted them as two)', k('どっちにする？', 'どっち') === k('じゃあ、どっちにする？', 'どっち'))
    T('13b', 'real new uses stay distinct: どっちにする？ / どっちの店がいい？ / どっちが近い？', new Set([k('どっちにする？', 'どっち'), k('どっちの店がいい？', 'どっち'), k('どっちが近い？', 'どっち')]).size === 3)
    T('13c', 'when じゃあ IS the target its line is not collapsed', k('じゃあ、行こう。', 'じゃあ') !== k('行こう。', 'じゃあ'))
  } catch (e) { T('ERR', 'section 13 crashed: ' + String(e && e.stack).slice(0, 300), false) }

  // ══ 14–15. Closed vocabulary and the 10th Kyu length limits are unchanged ══
  try {
    const inv = c.japaneseLearnerInventory(V, V.slice(0, 30))
    const ok = c.japaneseCheckLine('うん、大丈夫。', inv), no = c.japaneseCheckLine('うん、いい感じ。', inv)
    T('14a', 'the pair 02 repair uses only taught words (大丈夫); いい感じ (感じ not taught) would be refused', ok.ok && !no.ok, [ok, no])
    const units = ['うん、大丈夫。ねえ、昼どこ行く？', 'あそこ、行ったことある？', '電車で行くね。'].map(s => c.complexityUnits('ja', { japanese: s }))
    T('15a', 'the repaired / suggested lines stay inside the hard maximum of 7 units', units.every(u => u <= 7), units)
    const bc = c.ev('BELT_COMPLEXITY')['10th Kyu']
    T('15b', 'the 10th Kyu length contract is unchanged (preferred 3–5, hard max 7)', bc.preferredMin === 3 && bc.preferredMax === 5 && bc.hardMax === 7, bc)
  } catch (e) { T('ERR', 'section 14–15 crashed: ' + String(e && e.stack).slice(0, 300), false) }

  // ══ 16–20. The finaliser: 90/90, identities, SRS untouched, export = audited snapshot ══
  try {
    const S = setup('ja'); mock(S, 'ja')
    const tr = makeTrack(S, 'ja', { tag: '-v700ja' }); tr.scene = { characterA: 'Ken', characterB: 'Mai' }
    // the live pair 24 / 46 English on two target lines: fixed in place at finalisation
    const okLine = p => p.targetId && !/[?？]/.test(p.english + p.japanese) && !S.c.jaCueFormProblems(p).length && !S.c.jaPragmaticProblems(p.japanese, null).length
    const i24 = tr.pairs.findIndex(okLine), i46 = tr.pairs.findIndex((p, k) => k > i24 + 3 && okLine(p))
    tr.pairs[i24] = { ...tr.pairs[i24], japanese: tr.pairs[i24].japanese.replace(/。$/, '') + '、遅くなった。', english: 'Sorry, I got a little late.' }
    tr.pairs[i46] = { ...tr.pairs[i46], english: "Let's eat something we both like together." }
    const vocabBefore = JSON.stringify(S.vocab.map(w => [w.id, w.status, w.interval, w.dueDate, w.okStreak, w.known]))
    const log = []
    const t = await S.c.finaliseMainTrack(tr, S.c.ev('TRACK_ADAPTERS').ja, { vocab: S.vocab, apiKey: 'k', model: 'claude-haiku-5-5', qcRan: true, onLog: m => log.push(m) })
    const met = t.integrity.quota.rows.reduce((a, r) => a + Math.min(3, r.valid), 0), inv = t.integrity.invariants || {}
    T('16a', 'exactly 90/90 target recalls, 3 per target, on the final Japanese track', met === 90 && inv.TARGET_LINES_EXACT === true, { met, TLE: inv.TARGET_LINES_EXACT, d: inv.TARGET_LINES_DETAIL })
    const ids = new Set(tr.keywords.map(k => k.wordId)), tgt = t.pairs.filter(p => p.targetId)
    T('17a', 'every target line carries one of the 30 selected canonical ids, each id exactly 3 times', tgt.every(p => ids.has(p.targetId)) && [...ids].every(id => tgt.filter(p => p.targetId === id).length === 3))
    T('18a', 'finalising changes no learner record (status, interval, due date, streak, Known)', JSON.stringify(S.vocab.map(w => [w.id, w.status, w.interval, w.dueDate, w.okStreak, w.known])) === vocabBefore)
    T('8i', 'the English of the two target lines is corrected at finalisation, with the Japanese unchanged', t.pairs.some(p => p.english === "Sorry, I'm a little late.") && t.pairs.some(p => p.english === "Let's eat something we like together.") && log.some(l => /JA_TEXT_FIX/.test(l)), log.filter(l => /JA_TEXT_FIX|FINAL_TEXT_CHECK|RECOVER/.test(l)))
    // the exported PAIR blocks are printed from the persisted pairs: the cue and romaji of each block are the final snapshot's
    const blocks = []; let text = ''
    S.c.Blob = class { constructor(parts) { S.c.__blob = parts.join('') } }; S.c.URL = { createObjectURL: () => 'b', revokeObjectURL() {} }
    S.c.document.createElement = () => ({ click() {}, style: {} }); S.c.document.body.appendChild = () => {}; S.c.document.body.removeChild = () => {}
    try { S.c.downloadJapaneseTrack(t); text = S.c.__blob || '' } catch (e) { text = ''; log.push('EXPORT_ERR ' + e.message) }
    for (const b of text.split(/\n(?=PAIR \d\d)/)) { const m = /^PAIR (\d\d)/.exec(b); if (!m) continue; const g = k => ((new RegExp('^\\s*' + k + ':\\s*(.*)$', 'm')).exec(b) || [, ''])[1].trim(); blocks.push({ cue: g('ENGLISH CUE'), romaji: g('ROMAJI'), jp: g('JAPANESE') }) }
    T('19a', 'every exported cue is the final snapshot\'s cue (same order, same text)', blocks.length === t.pairs.length && blocks.every((b, i) => b.cue === String(t.pairs[i].prompt || '').trim()), { blocks: blocks.length, pairs: t.pairs.length, err: log.filter(l => /EXPORT_ERR/.test(l)), first: blocks.find((b, i) => b.cue !== String(t.pairs[i].prompt || '').trim()) })
    const bank = S.c.ev('RAW_JAPANESE_VOCAB')
    T('20a', 'every exported romaji is the romaji of the validated Japanese (rebuilding it again changes nothing)', blocks.length > 0 && blocks.every((b, i) => b.jp === t.pairs[i].japanese && b.romaji === S.c.jaFinalRomaji({ japanese: t.pairs[i].japanese, reading: t.pairs[i].reading, romaji: b.romaji }, bank, null).romaji), blocks.slice(0, 2))
  } catch (e) { T('ERR', 'section 16–20 crashed: ' + String(e && e.stack).slice(0, 400), false) }

  out.forEach(l => console.log(l))
  console.log('\n' + (n - fails) + '/' + n + ' passed' + (fails ? ' · ' + fails + ' FAILED' : ''))
  process.exit(fails ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
