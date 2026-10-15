// v694 — Daily regression set built from the EXACT final exports of the live v693 Daily tracks (13 Oct 2026, sandbox/oct13-v693):
// Japanese cue addressees and instruction form, local contradictions and over-strict validation; Mandarin 快…了, unclear 那个,
// added "too", 我不去 → 你去吧, described cues; Thai salt / shoes / bridge / fare. Every rule is also checked on what it must NOT flag
// (the rest of each export, the v691 exports, hand-written controls) and the v693 Daily switch off (legacy) keeps the old behaviour.
// The app's real functions run in the node harness; no model is called.
const fs = require('fs'), path = require('path')
const { load } = require('./harness')
const out = []; let fails = 0, n = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + id.padEnd(5) + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 900) : '')) }
const ai = process.argv.indexOf('--app'), APP = ai > 0 ? path.resolve(process.argv[ai + 1]) : path.join(__dirname, 'tt.compiled.js')
if (ai > 0) process.env.TT_FILE = APP
const DIR = path.join(__dirname, 'sandbox', 'oct13-v693')
const read = f => fs.readFileSync(path.join(DIR, f), 'utf8')
function pairsOf(text, field) {
  const rows = []
  for (const b of text.split(/\n(?=PAIR \d\d)/)) { const m = /^PAIR (\d\d)/.exec(b); if (!m) continue
    const g = k => ((new RegExp('^\\s*' + k + ':\\s*(.*)$', 'm')).exec(b) || [, ''])[1].trim()
    rows.push({ n: +m[1], speaker: g('SPEAKER'), [field]: g(field === 'japanese' ? 'JAPANESE' : 'CHINESE'), reading: g('READING'), romaji: g('ROMAJI'), pinyin: g('PINYIN'),
      english: g(field === 'japanese' ? 'ENGLISH MEANING' : 'ENGLISH'), prompt: g('ENGLISH CUE'), target: g('TARGET').split(' (')[0] }) }
  return rows
}
function thaiPairsOf(text) {
  const rows = []
  for (const b of text.split(/\n(?=\[\d{3}\] )/)) { const m = /^\[(\d{3})\] (.*)/.exec(b); if (!m) continue
    const g = k => ((new RegExp('^\\s*' + k + ':\\s*(.*)$', 'm')).exec(b) || [, ''])[1].trim()
    const ty = /TYPE: (\S+)(?: TARGET_ID: (\S+) TARGET: (\S+))?.*?SPEAKER: ([AB])/.exec(b) || []
    rows.push({ n: +m[1], prompt: m[2], speaker: ty[4], targetId: ty[2] && ty[2] !== '-' ? +ty[2] : null, target: ty[3], thai: g('TH'), english: g('EN') }) }
  return rows
}

;(async () => {
  const c = load(APP, { realBelt: true })
  const JA = pairsOf(read('japanese-track-2026-10-13-daily(3).txt'), 'japanese')
  const ZH = pairsOf(read('mandarin-track-2026-10-13(3).txt'), 'chinese')
  const TH = thaiPairsOf(read('thai-track-13-Oct-2026-daily(3).txt'))
  T('X0', 'the fixtures are the complete persisted v693 exports (Japanese 101 lines incl. bridges, Mandarin 94, Thai 94)', JA.length === 101 && ZH.length === 94 && TH.length === 94, [JA.length, ZH.length, TH.length])

  // ══ J — Japanese Daily (B3) ═══════════════════════════════════════════════════════════════════════════════════
  const SCENE = { scene: { characterA: 'Ken, a man', characterB: 'Yui, a woman' } }
  try {
    const before = c.cueAddresseeProblems(JA, SCENE)
    const F = c.fixCueAddressees(JA, SCENE, null).pairs
    const changed = F.map((p, i) => p.prompt !== JA[i].prompt ? JA[i].n : null).filter(Boolean)
    const at = k => F.find(p => p.n === k).prompt
    T('J1', 'cue LISTENER from the speaker metadata (A = Ken → Yui): "Tell him …" / "Ask him where he is …" (pairs 3, 9, 15, 39, 53) become her / she — the 11 defective cues of the export are all corrected',
      before.length === 11 && /^Tell her you have only just got here\.$/.test(at(3)) && /^Ask her where she is right now\.$/.test(at(9)) && /^Ask her if she is eating lunch/.test(at(15)) && /^Ask her which one she wants to eat\.$/.test(at(53)), { before: before.length, a3: at(3), a9: at(9) })
    T('J2', 'a speaker LETTER and a WRONG NAME are replaced by the listener\'s name: "Tell B yes …" → "Tell Yui yes …", "Tell Yuka …" (Yui speaking) → "Tell Ken …", "after B said" → "after Yui said"',
      /^Tell Yui yes, you know the spot/.test(at(57)) && /^Tell Ken on the walk/.test(at(63)) && /after Yui said it's fine\.$/.test(at(97)), [at(57), at(63), at(97)])
    T('J3', 'a DESCRIPTION becomes an INSTRUCTION: "Asking whether …" → "Ask whether …", "Asks whether …" → "Ask whether …", "Declining to …" → "Decline to …", "Saying …" → "Say …"',
      /^Ask whether the other person plans/.test(at(35)) && /^Ask whether the other person has already/.test(at(52)) && /^Decline to ride the train today/.test(at(82)) && /^Say you're still not going home yet/.test(at(97)), [at(35), at(52), at(82), at(97)])
    T('J4', 'exactly those 11 cues change (every other cue of the export is untouched) and the final CUE_ADDRESSEE check then finds none', changed.length === 11 && c.cueAddresseeProblems(F, SCENE).length === 0, changed)
  } catch (e) { T('ERR', 'section J1 crashed: ' + String(e && e.stack).slice(0, 300), false) }
  try {
    const sc = c.jaStateContradictions(JA)
    const ns = sc.map(x => x.pair.n)
    T('J5', 'local contradictions in the final export: Yui "うん、行くよ。" → "ごめん、今日は行けない。" (83), Ken "一緒に電車に乗ろうか。" → "いいえ、今日は電車に乗らない。" (82), Ken announces a call then asks Yui whether SHE will answer it (85), "ごめん、ちょっと待って。うん、…" (87, a reply to nothing)',
      ns.join(',') === '82,83,85,87' && /SELF_REVERSAL/.test(sc[0].reason) && /SELF_REVERSAL/.test(sc[1].reason) && /CALL_OWNERSHIP/.test(sc[2].reason) && /REPLY_TO_OWN_LINE/.test(sc[3].reason), sc.map(x => x.pair.n + ' ' + x.reason.slice(0, 60)))
    const v691 = pairsOf(fs.readFileSync(path.join(__dirname, 'sandbox', 'oct13-v691-ja', 'japanese-track-2026-10-13-daily.txt'), 'utf8'), 'japanese')
    T('J6', 'no false positives: the rest of the v693 export (97 lines) passes, and the v691 export keeps exactly its three v693 findings (78, 86, 91)', c.jaStateContradictions(v691).map(x => x.pair.n).join(',') === '78,86,91', c.jaStateContradictions(v691).map(x => x.pair.n))
    const mk = (sp, jp) => ({ speaker: sp, japanese: jp })
    const ctl = [[mk('B', 'うん、行くよ。'), mk('A', 'いいね。'), mk('B', 'やっぱり、今日は行けない。')], [mk('A', '明日、電車に乗ろう。'), mk('B', 'いいよ。'), mk('A', '今日は電車に乗らない。')], [mk('A', '電話が来てる。'), mk('B', '電話に出る？')], [mk('A', 'うん、行こう。')]]
    T('J7', 'controls: やっぱり (a stated change of mind), a different day (明日 vs 今日), the OTHER person asking about the call, and a reply word opening a line are not contradictions', ctl.every(x => c.jaStateContradictions(x).length === 0), ctl.map(x => c.jaStateContradictions(x).map(y => y.reason.slice(0, 40))))
  } catch (e) { T('ERR', 'section J5 crashed: ' + String(e && e.stack).slice(0, 300), false) }
  try {
    const V = c.initJapaneseVocab(), W = j => V.find(w => w.japanese === j)
    const tp = [['電車に乗らなくていいよ。', '乗る'], ['そこまで電車で行かなきゃ？', '行く'], ['電車にしなくても大丈夫だよ。', 'する'], ['分かんなかったら、言ってね。', '分かる'], ['来なくていいよ。', '来る']]
    T('J8', 'valid verb forms carry their target (live v693 "target not present"): 乗らなくて · 行かなきゃ · しなくても · 分かんなかったら · 来なくて', tp.every(([s, t]) => c.matchesJapaneseTarget(s, W(t))), tp.filter(([s, t]) => !c.matchesJapaneseTarget(s, W(t))))
    const cf = (jp, en, prompt) => c.jaCueFormProblems({ japanese: jp, english: en, prompt })
    T('J9', 'cue / translation form: "Yui asks …; reply yes" is an instruction to REPLY (はい、ちょっと待って。), …好きなんだよね。 is a statement (なん = explanatory), "what I want to eat" renders 何食べるか分かんない — no false mismatch',
      !cf('はい、ちょっと待って。', 'Yes, hang on a moment.', 'Yui asks if you can hear her right now; reply yes but ask her to wait.').length && !cf('はい、行くよ。', 'Yes, I\'m coming.', 'Yui asks if you\'re coming along; answer yes and say you\'ll go.').length &&
      !cf('あそこの店、好きなんだよね。', 'I like that shop over there, you know.', 'Tell Ken you like that shop.').length && !cf('何食べるか分かんない。', 'I don\'t know what I want to eat.', 'Say you can\'t decide.').length)
    const seg = (...xs) => xs.map(([surface, lemma, type]) => ({ surface, lemma: lemma || surface, type: type || 'content' }))
    const u = (jp, segs) => c.validateJapaneseUsage({ japanese: jp, segments: segs }, null)
    T('J10', 'correct casual Japanese passes: 電話来た (が dropped), どこ見てる？ (を dropped), 来てくれてありがとう (くれる is a teaching-permission question, not a grammar error), 好きな物は何？',
      u('ごめん、電話来た。', seg(['ごめん'], ['、', '、', 'punct'], ['電話'], ['来た', '来る'])).ok && u('どこ見てる？', seg(['どこ'], ['見てる', '見る'])).ok && u('来てくれてありがとう。', seg(['来て', '来る'], ['くれて', 'くれる', 'grammar'], ['ありがとう'])).ok &&
      !c.jaPragmaticProblems('好きな物は何？', W('物')).length)
    T('J11', 'genuine errors stay errors: 水行く？ / 日本語行く？ (not a destination), 場所は何？, ありがとう、行く。 (a formula with a verb), どっちも / 何でも are different words from どっち / 何',
      !u('水行く？', seg(['水'], ['行く'])).ok && !u('日本語行く？', seg(['日本語'], ['行く'])).ok && c.jaPragmaticProblems('場所は何？', W('場所')).length > 0 && !u('ありがとう、行く。', seg(['ありがとう'], ['、', '、', 'punct'], ['行く'])).ok &&
      !c.matchesJapaneseTarget('どっちも高くないよ。', W('どっち')) && !c.matchesJapaneseTarget('何でもいいよ。', W('何')))
    T('J12', 'the v693 あれ sense fix is kept: あれ、安いかも。 is the interjection (no target), あれは安い。 is the demonstrative', !c.matchesJapaneseTarget('あれ、安いかも。', W('あれ')) && c.matchesJapaneseTarget('あれは安いね。', W('あれ')))
  } catch (e) { T('ERR', 'section J8 crashed: ' + String(e && e.stack).slice(0, 300), false) }
  try {
    // readings and romaji of the persisted export: the app's own romaji from each line's reading
    const bank = c.initJapaneseVocab()
    // v700 (Japanese v699 brief §4): the explanatory ん is its own word (nai n da, hima nan da) and the contraction is wakannai — a persisted
    // line differing ONLY by those segmentations is the improvement the brief asks for; any other difference still fails
    const v700 = r => String(r).replace(/\b([Nn])a nda\b/g, '$1an da').replace(/(\w) nda\b/g, '$1 n da').replace(/n'n/g, 'nn')
    const diff = JA.filter(p => p.reading && p.romaji).filter(p => c.jaFinalRomaji({ japanese: p.japanese, reading: p.reading, romaji: p.romaji }, bank, null).romaji !== v700(p.romaji))
    T('J13', 'readings / romaji: every persisted romaji equals the app\'s deterministic romaji of its reading (no particle glued to a word, は read wa)', diff.length === 0, diff.slice(0, 5).map(p => p.n + ' ' + p.romaji + ' → ' + c.jaFinalRomaji({ japanese: p.japanese, reading: p.reading, romaji: p.romaji }, bank, null).romaji))
  } catch (e) { T('ERR', 'section J13 crashed: ' + String(e && e.stack).slice(0, 300), false) }

  // ══ Z — Mandarin Daily (B4) ═══════════════════════════════════════════════════════════════════════════════════
  try {
    const g = z => c.mandarinSurfaceGrammarProblems(z, null, null)
    T('Z1', '你快到吧？ — "almost there" is 快 + verb + 了 (the problem names 你快到了吧？); 你快到了吧？ / 快来吧！ ("hurry up and come") / 我快到了。 pass',
      /你快到了吧/.test(g('你快到吧？').join()) && !g('你快到了吧？').length && !g('快来吧！').length && !g('我快到了。').length, g('你快到吧？'))
    T('Z2', '那个慢一点吧。 — "that one" refers to nothing (speed belongs to a person or a vehicle); 你慢一点吧。 passes', /unclear referent/.test(g('那个慢一点吧。').join()) && !g('你慢一点吧。').length)
    T('Z3', '好，我要喝一点吧。 = "Okay, I\'ll have a little too." adds "too" (no 也); 我也喝一点。 + "too" and 太贵了 = "too expensive" are fine',
      /too \/ also/.test(c.zhEnglishAddsMeaning('好，我要喝一点吧。', 'Okay, I\'ll have a little too.').join()) && !c.zhEnglishAddsMeaning('我也喝一点。', 'I\'ll have a little too.').length && !c.zhEnglishAddsMeaning('太贵了。', 'It\'s too expensive.').length)
    const xc = c.zhExchangeContradictions(ZH.map(p => ({ ...p, targetId: p.target || null, pairType: p.target ? 'content' : 'framing', _framing: !p.target })))
    T('Z4', '我不去，你去吧。 → 好吧，你去吧。 (pair 71: telling the person who just refused to go anyway) is the ONLY exchange contradiction in the export', xc.length === 1 && xc[0].pair.n === 71, xc.map(x => x.pair.n + ' ' + x.reason))
    const F = c.fixCueAddressees(ZH, { scene: {} }, null).pairs, ch = F.map((p, i) => p.prompt !== ZH[i].prompt ? ZH[i].n : null).filter(Boolean)
    T('Z5', 'described cues become instructions (the track has no character names): "A suggests that …" → "Suggest that …", "Agrees and says they\'d also like …" → "Agree and say you\'d also like …" — 3 cues, nothing else changes',
      ch.join(',') === '10,33,86' && /^Suggest that the other option/.test(F[ZH.findIndex(p => p.n === 33)].prompt) && /^Agree and say you'd also like/.test(F[ZH.findIndex(p => p.n === 86)].prompt), ch)
    T('Z6', '你一起吃吗？ = "Do you want to eat together?" is kept: an invitation question is ordinarily rendered "Do you want to …?" (no added meaning flagged)', !c.zhEnglishAddsMeaning('你一起吃吗？', 'Do you want to eat together?').length)
  } catch (e) { T('ERR', 'section Z crashed: ' + String(e && e.stack).slice(0, 300), false) }

  // ══ H — Thai Daily (B2) ═══════════════════════════════════════════════════════════════════════════════════════
  try {
    const lc = c.thaiLocalContradictions(TH)
    T('H1', 'the final Thai export: salt run out then fetched from nowhere (5), "no need to cross the bridge" → "cross the bridge and you\'re there" by the same speaker (45), "the fare isn\'t expensive" → "the fare\'s expensive" (63), trying on clothes taught as requiring shoes off (84) — and nothing else',
      lc.map(x => x.pair.n).join(',') === '5,45,63,84' && /RUN_OUT_REQUEST/.test(lc[0].reason) && /SELF_REVERSAL/.test(lc[1].reason) && /SELF_CONTRADICTION/.test(lc[2].reason) && /GENERAL_RULE/.test(lc[3].reason), lc.map(x => x.pair.n + ' ' + x.reason.slice(0, 50)))
    const v691 = thaiPairsOf(fs.readFileSync(path.join(__dirname, 'sandbox', 'oct13-v691', 'thai-track-13-Oct-2026-daily.txt'), 'utf8'))
    T('H2', 'the v691 export: two genuine findings (35 "the fare is a bit expensive" → "not expensive at all", same speaker; 81 shoes off at the dinner table) and nothing else', c.thaiLocalContradictions(v691).map(x => x.pair.n).join(',') === '35,81', c.thaiLocalContradictions(v691).map(x => x.pair.n))
    const mk = (sp, th) => ({ speaker: sp, thai: th })
    const ctl = [[mk('A', 'เกลือหมดครับ'), mk('A', 'ไปซื้อเกลือมาให้หน่อยนะครับ')], [mk('A', 'ร้านนี้ต้องถอดรองเท้าครับ')], [mk('A', 'ร้านนี้ไม่แพงครับ'), mk('A', 'ร้านนั้นแพงครับ')],
      [mk('A', 'ไม่ต้องข้ามสะพานครับ'), mk('A', 'ถ้าข้ามสะพานก็ไกลครับ')], [mk('A', 'ค่าโดยสารไม่แพงครับ'), mk('B', 'ค่ารถแพงไหมคะ')], [mk('A', 'เกลือหมดครับ'), mk('B', 'เกลือหมดจริงเหรอคะ')]]
    T('H3', 'controls: salt bought (ซื้อ), a shop\'s own rule (ร้านนี้ต้องถอดรองเท้า), two different shops, a conditional (ถ้า), a QUESTION about the fare, "really out?" — none is flagged', ctl.every(x => c.thaiLocalContradictions(x).length === 0), ctl.map(x => c.thaiLocalContradictions(x).map(y => y.reason.slice(0, 40))))
  } catch (e) { T('ERR', 'section H crashed: ' + String(e && e.stack).slice(0, 300), false) }

  // ══ L — the legacy Daily path (switch off) keeps the old behaviour ═══════════════════════════════════════════════
  try {
    c.setDailyV693(false)
    const SC2 = { scene: { characterA: 'Ken, a man', characterB: 'Yui, a woman' } }
    const F = c.fixCueAddressees(JA, SC2, null).pairs
    T('L1', 'with the v693+ Daily switch off: cues are not rewritten (only the v691 name rule), the new Japanese contradiction rules and the Mandarin 快…了 / too checks are off',
      F[JA.findIndex(p => p.n === 3)].prompt === 'Tell him you have only just got here.' && c.jaStateContradictions(JA).length === 0 && !c.mandarinSurfaceGrammarProblems('你快到吧？', null, null).length && !c.zhEnglishAddsMeaning('好，我要喝一点吧。', 'Okay, I\'ll have a little too.').length)
    c.setDailyV693(true)
  } catch (e) { T('ERR', 'section L crashed: ' + String(e && e.stack).slice(0, 300), false) }

  console.log(out.join('\n'))
  console.log('\n' + (n - fails) + '/' + n + ' passed')
  process.exit(fails ? 1 : 0)
})().catch(e => { console.error(e); process.exit(2) })
