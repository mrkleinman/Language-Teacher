// v693 — Japanese Daily regression set built from the EXACT final export of the live v691 Japanese Daily track (13 Oct 2026,
// sandbox/oct13-v691-ja) and its generation log: morphology false positives, かな permission, target identity vs sense, romaji
// segmentation, speaker / addressee cues, reply words in context, plan contradictions, the one length counter, recovery invariants.
// The app's real functions run in the node harness; the model is simulated only at the transport boundary.
const fs = require('fs'), path = require('path')
const { load } = require('./harness')
const { setup, makeTrack, mock } = require('./tests14')
const { learner } = require('./benchmark/v692/learners')
const out = []; let fails = 0, n = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + id.padEnd(5) + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 900) : '')) }
const ai = process.argv.indexOf('--app'), APP = ai > 0 ? path.resolve(process.argv[ai + 1]) : path.join(__dirname, 'tt.compiled.js')
if (ai > 0) process.env.TT_FILE = APP
const EXPORT = path.join(__dirname, 'sandbox', 'oct13-v691-ja', 'japanese-track-2026-10-13-daily.txt')
const SCENE = { characterA: 'Daiki, a male student', characterB: 'Mio, a female friend' }
// the persisted v691 export, in playback order
function exportPairs() {
  const t = fs.readFileSync(EXPORT, 'utf8'), rows = []
  for (const b of t.split(/\n(?=PAIR \d\d)/)) {
    const m = /^PAIR (\d\d)/.exec(b); if (!m) continue
    const g = k => ((new RegExp('^\\s*' + k + ':\\s*(.*)$', 'm')).exec(b) || [, ''])[1].trim()
    rows.push({ n: +m[1], speaker: g('SPEAKER'), japanese: g('JAPANESE'), reading: g('READING'), romaji: g('ROMAJI'), english: g('ENGLISH MEANING'), prompt: g('ENGLISH CUE'), target: g('TARGET') })
  }
  return rows
}

;(async () => {
  const c = load(APP, { realBelt: true })
  const V = c.initJapaneseVocab(), W = j => V.find(w => w.japanese === j)
  const P = exportPairs()
  T('X0', 'the fixture is the complete persisted v691 export: 94 lines, 90 with a target', P.length === 94 && P.filter(p => p.target).length === 90, P.length)

  // ══ A — morphology false positives (Phase 5) ══════════════════════════════════════════════════════════════════
  try {
    const seg = (...xs) => xs.map(([surface, lemma, type]) => ({ surface, lemma: lemma || surface, type: type || 'content' }))
    const u = (jp, segs) => c.validateJapaneseUsage({ japanese: jp, segments: segs }, null)
    const a = u('ごめん、ちょっと遅くなるかも。', seg(['ごめん'], ['、', '、', 'punct'], ['ちょっと'], ['遅く', '遅い'], ['なる'], ['かも', 'かも', 'grammar']))
    const b = u('ちょっと早く行こうね。', seg(['ちょっと'], ['早く', '早い'], ['行こう', '行く'], ['ね', 'ね', 'grammar']))
    T('A1', 'い-adjective adverbial forms are not bare nouns: ごめん、ちょっと遅くなるかも。 / ちょっと早く行こうね。 pass (live v691: "遅いなる / 早い行く needs a particle")', a.ok && b.ok, [a.problems, b.problems])
    const bad = u('水行く？', seg(['水'], ['行く']))
    T('A2', 'a genuine bare noun + verb is still rejected (水行く？)', !bad.ok, bad.problems)
    const nj = u('何時に時間ある？', seg(['何時'], ['に', 'に', 'grammar'], ['時間'], ['ある']))
    T('A3', '何時に時間ある？ (live pair 55) is rejected with the natural form named (何時なら時間ある？)', !nj.ok && nj.problems.some(x => /何時なら/.test(x)), nj.problems)
  } catch (e) { T('ERR', 'section crashed: ' + String(e && e.message).slice(0, 120), false) }

  // ══ B — かな: ONE answer at every stage (Phase 6) ══════════════════════════════════════════════════════════════
  try {
    const inv = c.japaneseLearnerInventory(V, V.slice(0, 30))
    const asGrammar = c.validateJapaneseGrammarClosure({ japanese: 'ねえ、どれが安いかな？', segments: [{ surface: 'ねえ', type: 'content' }, { surface: 'どれ', type: 'content' }, { surface: 'が', type: 'grammar' }, { surface: '安い', type: 'content' }, { surface: 'かな', type: 'grammar' }] }, inv)
    const asContent = c.validateJapaneseGrammarClosure({ japanese: 'ねえ、どれが安いかな？', segments: [{ surface: 'ねえ', type: 'content' }, { surface: 'どれ', type: 'content' }, { surface: 'が', type: 'grammar' }, { surface: '安いかな', type: 'content' }] }, inv)
    T('B1', 'sentence-final かな is judged from the TEXT: the same answer whether a segmenter typed it grammar or content (live v691 rejected 大丈夫かな？ yet kept ねえ、どれが安いかな？)',
      !asGrammar.ok && !asContent.ok, [asGrammar.problems, asContent.problems])
    const A = c.ev('TRACK_ADAPTERS').ja
    const hp = A.hardProblems({ japanese: 'ねえ、どれが安いかな？' }, { vocab: V })
    T('B2', 'the FINAL count applies the same permission (the persisted v691 line ねえ、どれが安いかな？ would not count)', hp.some(x => /かな/.test(x)), hp)
    T('B3', 'a word that merely ends in かな (さかな "fish") is not the particle', !c.jaSentenceFinalGrammarProblems('さかなが好き。', new Set()).length && !c.jaSentenceFinalGrammarProblems('これ、さかな？', new Set()).length)
  } catch (e) { T('ERR', 'section crashed: ' + String(e && e.message).slice(0, 120), false) }

  // ══ C — target identity vs target sense (Phase 3A / 4 / 6) ═══════════════════════════════════════════════════
  try {
    const are = W('あれ'), un = W('うん'), dore = W('どれ'), nani = W('何')
    T('C1', 'あれ、… at the start of a sentence is the interjection "huh?" — not the target "that over there" (live pairs 19, 26)', !c.matchesJapaneseTarget('あれ、ちょっと高いね。', are) && !c.matchesJapaneseTarget('あれ、行ってみない？', are))
    T('C2', 'the demonstrative is still recognised: あれがいいかも。(live pair 33) · あれは何？ · あそこのあれ、高いね', c.matchesJapaneseTarget('あれがいいかも。', are) && c.matchesJapaneseTarget('あれは何？', are) && c.matchesJapaneseTarget('あそこのあれ、高いね', are))
    T('C3', 'うん as a mid-sentence filler (今日は、うん、忙しいんだ。 live pair 85) does not practise the reply word; うん、もう大丈夫だよ。 does', !c.matchesJapaneseTarget('今日は、うん、忙しいんだ。', un) && c.matchesJapaneseTarget('うん、もう大丈夫だよ。', un))
    const r1 = c.jaTargetAbsentReason('どれも近いね。', dore), r2 = c.jaTargetAbsentReason('何もないよ、大丈夫。', nani), r3 = c.jaTargetAbsentReason('今日は、うん、忙しいんだ。', un)
    T('C4', 'どれも / 何も are named as a DIFFERENT WORD (target sense), not "target not present" (live v691 log lines 17 / 245)', /TARGET_SENSE_DIFFERENT/.test(r1) && /どれも/.test(r1) && /TARGET_SENSE_DIFFERENT/.test(r2) && /何も/.test(r2) && /TARGET_SENSE_DIFFERENT/.test(r3), [r1, r2, r3])
    T('C5', 'the rejection category is TARGET_SENSE (distinct from a missing lemma, untaught grammar or a parser miss)', c.generationFailureCategory(r1) === 'TARGET_SENSE' && c.generationFailureCategory('target 何 not present') === 'TARGET_LEMMA_ABSENT')
  } catch (e) { T('ERR', 'section crashed: ' + String(e && e.message).slice(0, 120), false) }

  // ══ D — romaji at the source: the four export examples (Phase 7) ═══════════════════════════════════════════════
  try {
    const bank = c.ev('RAW_JAPANESE_VOCAB')
    const ro = n => { const p = P.find(x => x.n === n); return c.jaFinalRomaji({ japanese: p.japanese, reading: p.reading, romaji: p.romaji }, bank, null).romaji }
    T('D1', 'pair 24 どれにしよっか？ → "dore ni shiyokka?" (live: dore nishiyokka?)', ro(24) === 'dore ni shiyokka?', ro(24))
    T('D2', 'pair 51 今ならお店にいるかも。 → "ima nara omise ni iru kamo." (live: ima narao mise …)', ro(51) === 'ima nara omise ni iru kamo.', ro(51))
    T('D3', 'pair 68 …食べられない。 → "taberarenai" (live: tabe rare nai)', /hiru wa issho ni taberarenai\.$/.test(ro(68)), ro(68))
    T('D4', 'pair 89 …食べられないかも。 → "taberarenai kamo" (live: tabe rarenaikamo)', /hiru wa taberarenai kamo\.$/.test(ro(89)), ro(89))
    const all = P.map(p => c.jaFinalRomaji({ japanese: p.japanese, reading: p.reading, romaji: p.romaji }, bank, null).romaji)
    T('D5', 'no rebuilt romaji in the whole export glues a particle onto a word (narao / nishiyokka / rarenaikamo)', !all.some(r => /\b(narao|nishiyokka|rarenaikamo|tabe rare)\b/.test(r)), all.filter(r => /narao|nishiyokka|rarenaikamo|tabe rare/.test(r)))
    T('D6', 'well-formed lines keep their romaji (konnichiwa / ii yo. doko iku? / wakaranai / mattete)', all[0] === 'konnichiwa. kyou no hiru, issho ni tabenai?' && all[1] === 'ii yo. doko iku?' && /wakaranai/.test(all[14]) && /mattete/.test(all[63]), [all[0], all[1], all[14], all[63]])
  } catch (e) { T('ERR', 'section crashed: ' + String(e && e.message).slice(0, 120), false) }

  // ══ E — speaker / addressee across the final export (Phase 8) ═════════════════════════════════════════════════
  try {
    const tr = { scene: SCENE }
    const before = c.cueSelfAddressLines(P, tr)
    const fixed = c.fixCueAddressees(P, tr, null).pairs
    const after = c.cueSelfAddressLines(fixed, tr)
    T('E1', 'the final self-address check finds the three live cues (pairs 70, 79, 90 — "As Daiki, tell Daiki …", "As Mio, ask Mio …")', before.length === 3, before)
    T('E2', 'after the cue fix: none left; each is "As <speaker>, tell/ask <the other>"', after.length === 0 && fixed[69].prompt.startsWith('As Mio, tell Daiki') && fixed[78].prompt.startsWith('As Daiki, ask Mio') && fixed[89].prompt.startsWith('As Mio, tell Daiki'), [fixed[69].prompt, fixed[78].prompt, fixed[89].prompt])
    T('E3', 'correct cues are untouched by the fix (every other line of the export keeps its cue)', fixed.every((p, i) => [69, 78, 89].includes(i) || p.prompt === P[i].prompt), fixed.map((p, i) => p.prompt !== P[i].prompt ? i + 1 : null).filter(Boolean))
  } catch (e) { T('ERR', 'section crashed: ' + String(e && e.message).slice(0, 120), false) }

  // ══ F — reply words need something to reply to (Phase 4) ══════════════════════════════════════════════════════
  try {
    const rows = P.map(p => ({ ...p, pairType: p.target ? 'content' : 'framing', targetId: p.target ? 1 : null, _framing: !p.target }))
    const pl = c.jaPlaceReplyLines(rows, null)
    T('F1', 'a reply line with no yes/no question before it is moved after an unanswered one (text unchanged) — else listed as RESPONSE_WITHOUT_TRIGGER', pl.moved.length + pl.orphan.length >= 5 && pl.pairs.length === 94 && pl.moved.every(r => { const i = pl.pairs.indexOf(r); return c.jaIsYesNoQuestion(pl.pairs[i - 1]) && pl.pairs[i - 1].speaker !== r.speaker }), { moved: pl.moved.map(x => x.japanese), orphan: pl.orphan.map(x => x.japanese) })
    // the batched trigger request, on the reconstructed v691 learner: one valid question is inserted, one with an untaught word is refused
    const c2 = load(APP, { realBelt: true }); const L = learner(c2, 'ja')
    const { V691_IDS } = require('./benchmark/v692/learners')
    const byId = L.byId, kw = V691_IDS.ja.map(id => byId.get(id)).filter(Boolean).map(w => ({ wordId: w.id, japanese: w.japanese }))
    const hai = L.vocab.find(w => w.japanese === 'はい') || W('はい')
    const t = { keywords: kw, scene: SCENE, pairs: [
      { speaker: 'A', japanese: 'ちょっと待ってて。', english: 'Wait a moment.', prompt: 'x', pairType: 'content', targetId: 999 },
      { speaker: 'B', japanese: 'はい、分かった。', english: 'Yes, got it.', prompt: 'y', pairType: 'content', targetId: hai.id },
      { speaker: 'A', japanese: 'お店、行く。', english: 'Going to the shop.', prompt: 'z', pairType: 'content', targetId: 998 },
      { speaker: 'B', japanese: 'うん、いいよ。', english: 'Yeah, sure.', prompt: 'w', pairType: 'content', targetId: 997 }] }
    let calls = 0
    c2.mockGeminiGenerate = async (k, m, msgs, max, o) => { calls++; return JSON.stringify([{ i: 1, japanese: '今、大丈夫？', english: 'Are you okay now?' }, { i: 2, japanese: '寿司、食べたい？', english: 'Want sushi?' }]) }
    const logs = []
    const r = await c2.jaBridgeReplyTriggers(t, { apiKey: 'k', model: 'm', vocab: L.vocab, vocabById: byId }, m => logs.push(m))
    const ins = r.inserted || []
    T('F2', 'ONE request writes the missing questions; a valid one is inserted as a BRIDGE line by the OTHER speaker right before the reply (never a target pair)',
      calls === 1 && ins.length === 1 && ins[0].pairType === 'bridge' && ins[0].speaker === 'A' && r.pairs[r.pairs.indexOf(ins[0]) + 1].japanese === 'はい、分かった。' && ins[0].reading && ins[0].romaji, { calls, ins, logs })
    T('F3', 'a question with a word the learner was never taught is refused, not inserted (same closed-vocabulary gate as every line)', (r.refused || []).some(x => /寿司/.test(x)) && !r.pairs.some(p => /寿司/.test(p.japanese)), r.refused)
  } catch (e) { T('ERR', 'section crashed: ' + String(e && e.message).slice(0, 120), false) }

  // ══ G — conversational state (Phase 1 / 10): the live cancellation / rescheduling scene ════════════════════════
  try {
    const sc = c.jaStateContradictions(P)
    T('G1', 'the three live contradictions are found on the persisted lines: 78 (Mio cancelled, then asks why there is no lunch) · 86 (today proposed after "busy today") · 91 (tomorrow proposed after "busy tomorrow")',
      JSON.stringify(sc.map(x => x.pair.n)) === '[78,86,91]', sc.map(x => [x.pair.n, x.reason]))
    const brief = [['A', '今日の昼、一緒に食べない？'], ['B', 'ごめん、今日は無理。'], ['A', 'じゃあ、明日はどう？'], ['B', '明日なら大丈夫。'], ['A', 'じゃあ、明日ね。']].map(([speaker, japanese]) => ({ speaker, japanese }))
    T('G2', 'the brief\'s model exchange (invite → sorry, not today → how about tomorrow → tomorrow works → see you) is coherent: nothing flagged', c.jaStateContradictions(brief).length === 0)
    T('G3', '"what shall we do then?" after a cancellation is not a proposal (live pair 71 うん、じゃあ、昼どうする？ is fine)', !sc.some(x => x.pair.n === 71))
  } catch (e) { T('ERR', 'section crashed: ' + String(e && e.message).slice(0, 120), false) }

  // ══ I / J — the one length counter · exactly 90 · bounded recovery (Phase 9 / 11) ═════════════════════════════
  try {
    const rejectedLive = ['うん、ごめんね、昼は大丈夫だよ。', 'はい、じゃあ明日の昼、一緒に食べない？', 'うん、分かったけど、ちょっと時間ないんだ。', 'ごめん、今日はたぶん一緒に帰れない。', 'ちょっと店の昼の時間、見てね。', 'ごめん、はい、これ、明日一緒に食べようね。', 'うん、見たから分かったよ。']
    const fine = [{ surface: 'う', type: 'content' }, { surface: 'ん', type: 'content' }]
    const u1 = rejectedLive.map(t => c.complexityUnits('ja', { japanese: t })), u2 = rejectedLive.map(t => c.complexityUnits('ja', { japanese: t, segments: fine.concat(fine, fine, fine, fine) }))
    T('I1', 'Japanese length is ONE deterministic count of the text, whatever segments a stage carries (the 7 live lines counted 8–9 at the final count but passed at generation)', JSON.stringify(u1) === JSON.stringify(u2) && u1.every(x => x <= 7), { u1, u2 })
    const S = setup('ja'); mock(S, 'ja')
    const tr = makeTrack(S, 'ja', { tag: '-v693' }); tr.scene = { ...SCENE }
    const log = []
    const t = await S.c.finaliseMainTrack(tr, S.c.ev('TRACK_ADAPTERS').ja, { vocab: S.vocab, apiKey: 'k', model: 'gemini-2.5-flash-lite', qcRan: true, onLog: m => log.push(m) })
    const met = t.integrity.quota.rows.reduce((a, r) => a + Math.min(3, r.valid), 0), inv = t.integrity.invariants || {}
    T('J1', 'exactly 90 valid recalls, exactly 3 target lines per target, no self-addressed cue, no state contradiction on a clean Japanese track',
      met === 90 && inv.TARGET_LINES_EXACT === true && inv.CUE_SELF_ADDRESS === 0 && (inv.STATE_CONTRADICTIONS || 0) === 0, { met, inv: { TLE: inv.TARGET_LINES_EXACT, CSA: inv.CUE_SELF_ADDRESS, SC: inv.STATE_CONTRADICTIONS } })
  } catch (e) { T('ERR', 'section crashed: ' + String(e && e.message).slice(0, 120), false) }

  out.forEach(l => console.log(l))
  console.log('\n' + (n - fails) + '/' + n + ' passed' + (fails ? ' · ' + fails + ' FAILED' : ''))
  process.exit(fails ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
