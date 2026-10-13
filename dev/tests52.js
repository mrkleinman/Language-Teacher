// v693 — Mandarin Daily regression set built from the EXACT final export and log of the live v691 Mandarin Daily track (13 Oct 2026,
// sandbox/oct13-v691-zh): independent 不 replies, context-aware ellipsis, English that adds meaning, three-line exchange checks,
// topic-change tolerance, preferred vs hard length, spoken tones by phrase, 90/90 with recovery. The generator (zh-gen-v650,
// per recall) is unchanged. The app's real functions run in the node harness; the model is simulated at the transport boundary.
const fs = require('fs'), path = require('path')
const { load } = require('./harness')
const { setup, makeTrack, mock } = require('./tests14')
const out = []; let fails = 0, n = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + id.padEnd(5) + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 900) : '')) }
const ai = process.argv.indexOf('--app'), APP = ai > 0 ? path.resolve(process.argv[ai + 1]) : path.join(__dirname, 'tt.compiled.js')
if (ai > 0) process.env.TT_FILE = APP
const EXPORT = path.join(__dirname, 'sandbox', 'oct13-v691-zh', 'mandarin-track-2026-10-13-daily.txt')
function exportPairs() {
  const t = fs.readFileSync(EXPORT, 'utf8'), rows = []
  for (const b of t.split(/\n(?=PAIR \d\d)/)) {
    const m = /^PAIR (\d\d)/.exec(b); if (!m) continue
    const g = k => ((new RegExp('^\\s*' + k + ':\\s*(.*)$', 'm')).exec(b) || [, ''])[1].trim()
    rows.push({ n: +m[1], speaker: g('SPEAKER'), chinese: g('CHINESE'), pinyin: g('PINYIN'), spoken: g('SPOKEN PINYIN'), english: g('ENGLISH'), prompt: g('ENGLISH CUE') })
  }
  return rows
}
const sec = async (fn) => { try { await fn() } catch (e) { T('ERR', 'section crashed: ' + String(e && e.message).slice(0, 120), false) } }

;(async () => {
  const c = load(APP, { realBelt: true })
  const V = c.initMandarinVocab(); V.forEach(w => { w.status = 'learning' })
  const inv = c.mandarinLearnerInventory(V, V.slice(0, 40)), lex = inv.lexicon
  const gp = (t, ctx) => c.mandarinGrammarProblems(t, c.segmentMandarin(t, lex), inv, ctx)
  const P = exportPairs()
  T('X0', 'the fixture is the complete persisted v691 export: 94 lines', P.length === 94, P.length)
  // the export's 30 three-line target exchanges (pairs 03–92)
  const groups = []; for (let i = 2; i < 92; i += 3) groups.push(P.slice(i, i + 3))

  // ══ A / B — independent 不 and context-aware ellipsis (brief §3) ═══════════════════════════════════════════════
  await sec(async () => {
    T('A1', '不，那里很小。 is grammatical: 不 is an independent "no" before the pause (live v691: "不 cannot negate 那里", then replaced by 东西不多，很好。)', gp('不，那里很小。').length === 0, gp('不，那里很小。'))
    T('A2', 'real negation errors are still rejected: 不那里。 · 没贵', gp('不那里。').some(x => /不 cannot negate/.test(x)), gp('不那里。'))
    const pairs = [['我不回。', '你回不回？'], ['我想吃。', '你想吃吗？'], ['我要去买。', '你要买那个吗？']]
    T('B1', 'ellipsis the previous line makes recoverable is accepted: 你回不回？— 我不回。· 你想吃吗？— 我想吃。· 你要买那个吗？— 我要去买。', pairs.every(([a, prev]) => gp(a, { prev }).length === 0), pairs.map(([a, prev]) => gp(a, { prev })))
    T('B2', 'the same lines out of the blue are still incomplete (nothing to recover the destination / object from)', pairs.every(([a]) => gp(a).some(x => /^incomplete/.test(x))) && gp('我不回。', { prev: '你吃什么？' }).some(x => /^incomplete/.test(x)), pairs.map(([a]) => gp(a)))
    const q = c.runMandarinQualityCheckCore({ chinese: '不，那里很小。', pinyin: 'bù, nàlǐ hěn xiǎo.', english: 'No, it\'s small there.', prompt: 'Say no, it is small there.', segments: c.segmentMandarin('不，那里很小。', lex) }, null, inv, V, { prev: '那里很大吗？' })
    T('J1', 'the QC audit (the step that replaced it live) no longer reports a grammar issue for 不，那里很小。', !q.issues.some(x => /grammar/.test(x)), q.issues)
  })

  // ══ C / N — the English never adds meaning (brief §2) ═════════════════════════════════════════════════════════
  await sec(async () => {
    const p33 = P.find(p => p.n === 33)
    T('C1', 'pair 33: 我慢吗？ taught as "Am I too slow?" — the English adds "too" (no 太)', c.zhEnglishAddsMeaning(p33.chinese, p33.english).some(x => /"too"/.test(x)), c.zhEnglishAddsMeaning(p33.chinese, p33.english))
    const flagged = P.filter(p => c.zhEnglishAddsMeaning(p.chinese, p.english).length).map(p => p.n)
    T('C2', 'across all 94 lines ONLY pair 33 is flagged — natural paraphrases pass (我喝你的 "I\'ll have yours", 我很快 "I won\'t be long", 没什么 "Nothing")', JSON.stringify(flagged) === '[33]', flagged)
    const r = c.runMandarinQualityCheckCore({ chinese: p33.chinese, pinyin: p33.pinyin, english: p33.english, prompt: p33.prompt, segments: c.segmentMandarin(p33.chinese, lex) }, null, inv, V)
    T('C3', 'QC repairs it deterministically (no paid call): "Am I slow?" — cue "Ask: Am I slow?"', r.pair.english === 'Am I slow?' && r.pair.prompt === 'Ask: Am I slow?' && r.repairs.some(x => /translation fidelity/.test(x)), [r.pair.english, r.pair.prompt, r.repairs])
    const v = c.mandarinAcceptCandidate({ chinese: '我慢吗？', pinyin: 'wǒ màn ma?', english: 'Am I too slow?', prompt: 'Ask: Am I too slow?', segments: c.segmentMandarin('我慢吗？', lex) }, V.find(w => w.chinese === '慢'), inv, V)
    T('C4', 'a NEW candidate that adds meaning is rejected at generation (CUE_MEANING_MISMATCH), before any paid QC', !v.ok && v.problems.some(x => /CUE_MEANING_MISMATCH/.test(x)), v.problems)
    T('C5', 'other added meanings are caught too: already / still / must / probably, and a 不 sentence translated without negation',
      ['already', 'still', 'must', 'probably'].every(w => c.zhEnglishAddsMeaning('我去。', 'I ' + w + ' go.').length) && c.zhEnglishAddsMeaning('我不去。', 'I am going.').length > 0 && !c.zhEnglishAddsMeaning('你回不回？', 'Are you going back?').length)
  })

  // ══ D / F / G — local three-line exchanges; topic changes are allowed (brief §4 / §5) ════════════════════════════
  await sec(async () => {
    const found = []; groups.forEach(g => g.forEach((p, k) => { const pr = c.zhExchangeProblems(g.slice(0, k), p); if (pr.length) found.push([p.n, pr[0].split(':')[0]]) }))
    T('D1', 'the live exchanges are found exactly: 08 到了说 after arriving · 32 不太快 after 我工作很快 (same speaker) · 35 我慢一点吧 after 你不慢 · 50 我用一点 (a little of what?)',
      JSON.stringify(found.map(x => x[0])) === '[8,32,35,50]', found)
    T('D2', 'pairs 85–86 (B wants that one, A will buy it) are NOT flagged — buying for the other person is a normal reading', !found.some(x => x[0] === 85 || x[0] === 86))
    const good = ['我跟你去。', '你想一起吃吗？', '你拿什么？', '我等朋友。', '你想吃什么？', '这个多少钱？']
    T('G1', 'the brief\'s model beginner sentences pass the grammar rules (no penalty for being simple)', good.every(t => gp(t).length === 0), good.map(t => [t, gp(t)]))
    const xc = c.zhExchangeContradictions(P.map(p => ({ ...p, targetId: groups.findIndex(g => g.includes(p)), pairType: 'content' })).filter(p => p.targetId >= 0))
    T('D3', 'the whole-track check used by the finaliser finds the same four lines (their slots go to quota recovery)', JSON.stringify(xc.map(x => x.pair.n).sort((a, b) => a - b)) === '[8,32,35,50]', xc.map(x => x.pair.n))
    const TOP = c.ev('THAI_TOPIC_ONLY_VERDICT_RE'), DEF = c.ev('THAI_LINE_DEFECT_VERDICT_RE'), X = /contradict|makes no sense|doesn't answer|does not answer|no referent|unclear|wrong/i
    // the eight group "improve" verdicts of the live v691 Mandarin log, verbatim
    const verdicts = [
      ['可以', 'Line 3, 我可以帮你, is grammatical and uses the target, but after the agreement to go together it jumps to an unrelated offer of help, so the exchange doesn\'t flow naturally.'],
      ['很', 'Line 2 uses 很 in a plain yes/no question about size, which sounds unnatural; 那里大吗？ is the natural form, while lines 1 and 3 fit their context.'],
      ['太', 'Line 3 contradicts the flow: after agreeing there is too much stuff and to buy less, saying 东西太少了 (there is too little stuff) makes no sense; it should be something like 好吧，东西太多了 or a line that follows the buy-less idea.'],
      ['少', 'Line 3 answers a question about how many people there are with "朋友很少" (few friends), a topic jump; line 2\'s "人很少吗" is awkward with 很 in a question, where 人少吗？ is more natural.'],
      ['回', 'The group switches from eating together to going home without a link, so the first line 你回不回？ is a topic jump after 一起吃吧; a line like 你吃不吃？ or 你吃完回不回？ would connect to the context.'],
      ['等', 'Line 1 asks "What are you waiting for?" right after A suggested doing this together, so it is a topic jump with no link to the previous line; lines 2 and 3 connect well.'],
      ['找', 'Line 1 jumps from the waiting topic to an unprompted statement about looking for something, so it doesn\'t follow from the line before; the later lines then work once that is fixed.'],
      ['要', 'Line 1 jumps from the shopping topic to asking about a drink without any link to the preceding lines; a line about buying, such as 你要买那个吗？, would connect to the context.']]
    const skip = verdicts.filter(([, r]) => TOP.test(r) && !DEF.test(r) && !X.test(r)).map(v => v[0])
    T('F1', 'QC no longer rewrites a group for a topic change alone: of the live improve verdicts, 可以 / 回 / 等 / 找 / 要 are skipped; 很 (unnatural 很 in a question), 太 (contradiction), 少 (awkward) are still repaired',
      JSON.stringify(skip) === JSON.stringify(['可以', '回', '等', '找', '要']) && ['很', '太', '少'].every(k => verdicts.some(v => v[0] === k) && !skip.includes(k)), { skip, all: verdicts.map(v => v[0]) })
  })

  // ══ H — preferred vs hard length (brief §9) — on the reconstructed v691 learner (Mukyu, preferred 2–4, hardMax 6) ═══════
  await sec(async () => {
    const { learner, V691_IDS } = require('./benchmark/v692/learners')
    const c2 = load(APP, { realBelt: true }), L = learner(c2, 'zh'), TG = V691_IDS.zh.map(id => L.byId.get(id)).filter(Boolean)
    const inv2 = c2.mandarinLearnerInventory(L.vocab, TG), lex2 = inv2.lexicon
    const cc = c2.getLearnerComplexityContract({ lang: 'zh', vocab: L.vocab, lexicon: lex2 })
    const S5 = '你今天想回家吗？'
    const an = cc.analyse({ chinese: S5, segments: c2.segmentMandarin(S5, lex2) })
    T('H1', S5 + ' is above the preferred range but within the hard maximum (the case of live 你明天回家吗？)', an.abovePreferredButAllowed && !an.overHardMax, an)
    const t = L.vocab.find(w => w.chinese === '回')
    let calls = 0
    c2.mockGeminiGenerate = async () => { calls++; return JSON.stringify({ chinese: S5, pinyin: 'nǐ jīntiān xiǎng huí jiā ma?', english: 'Do you want to go home today?', prompt: 'Ask whether they want to go home today.', segments: c2.segmentMandarin(S5, lex2).map(x => ({ surface: x.surface, pinyin: x.pinyin, english: x.english })) }) }
    const stats = Object.assign(c2.createMandarinGenerationStats('gemini', 65), { lenAccepted: 10, lenPreferred: 5 })   // the track has drifted to 50% preferred
    const got = await c2.generateMandarinOneRecall(t, 1, L.vocab, inv2, c2.mandarinScarcityRules(inv2), 'k', 'm', new Map(), () => {}, null, stats, { phase: 'generation' })
    T('H2', 'the generator keeps it on the FIRST call even while the track drifts below 80% preferred (live v691 discarded 你明天回家吗？ and paid for 你回不回？)', !!(got && got.pair && got.pair.chinese === S5) && calls === 1, { got: got && got.pair && got.pair.chinese, calls })
  })

  // ══ I — spoken tones on the final text, by phrase (brief §7) ═══════════════════════════════════════════════════
  await sec(async () => {
    const sp = x => c.mandarinSpokenPinyin(x)
    T('I1', '这里 / 那里: 里 is neutral, so 这里很多人 is not "zhèlí hěn" (live pairs 09 / 10)', sp('zhèlǐ hěn duō rén.') === 'zhèlǐ hěn duō rén.' && sp('nàlǐ hěn duō rén ma?') === 'nàlǐ hěn duō rén ma?', [sp('zhèlǐ hěn duō rén.'), sp('nàlǐ hěn duō rén ma?')])
    T('I2', 'a longer word still changes before a 3rd-tone word, as in v691 (一起等 → yìqí děng, 我可以等你 → wó kéyí déng nǐ) — only 这里/那里 and one-syllable runs change', sp('wǒmen yìqǐ děng') === 'wǒmen yìqí děng' && sp('hǎo, wǒ kěyǐ děng nǐ ma?') === 'hǎo, wó kéyí déng nǐ ma?', [sp('wǒmen yìqǐ děng'), sp('hǎo, wǒ kěyǐ děng nǐ ma?')])
    T('B3', 'a broken line is not excused as ellipsis: 我在看回。 after a 回 question is still incomplete (resume replay of the v682 simulated track)', gp('我在看回。', { prev: '你回不回？' }).some(x => /^incomplete/.test(x)), gp('我在看回。', { prev: '你回不回？' }))
    T('I3', 'runs of one-syllable words group in feet: 我也很好 → wó yě hén hǎo · 我很好 → wó hén hǎo · 你好 → ní hǎo · 很好 → hén hǎo', sp('wǒ yě hěn hǎo') === 'wó yě hén hǎo' && sp('wǒ hěn hǎo') === 'wó hén hǎo' && sp('nǐ hǎo') === 'ní hǎo' && sp('hěn hǎo') === 'hén hǎo')
    T('I4', 'unchanged where the live track was right: 不 before 4th tone (bú màn), 一起 (yìqǐ), 我们 (wǒmen), 哪里 (nálǐ), 给你 (géi nǐ)', sp('nǐ bù màn.') === 'nǐ bú màn.' && sp('wǒmen yìqǐ') === 'wǒmen yìqǐ' && sp('nǐ dào nǎlǐ le?') === 'nǐ dào nálǐ le?' && sp('hǎo, wǒ ná gěi nǐ.') === 'hǎo, wǒ ná géi nǐ.')
    const changed = P.filter(p => p.pinyin && p.spoken && sp(p.pinyin) !== p.spoken).map(p => p.n + ' ' + p.spoken + ' → ' + sp(p.pinyin))
    T('I5', 'replayed over all 94 final lines, only phrasing cases change (这里/那里 neutral, word-final tone kept, monosyllable feet)', changed.every(x => /l[ǐí]|kéy|yìq|hén|yě|nǐ|děng|déng/.test(x)) && changed.length <= 12, changed)
  })

  // ══ K / L — exactly 90 after the exchange checks send lines to recovery ═══════════════════════════════════════
  await sec(async () => {
    const S = setup('zh'); mock(S, 'zh')
    const tr = makeTrack(S, 'zh', { tag: '-v693' })
    // a same-speaker contradiction inside one target's exchange: A says it is fast, then A says it is not fast
    const kw = tr.pairs.filter(p => p && p.targetId === S.targets[0].id)
    const log = []
    const t = await S.c.finaliseMainTrack(tr, S.c.ev('TRACK_ADAPTERS').zh, { vocab: S.vocab, apiKey: 'k', model: 'gemini-2.5-flash-lite', qcRan: true, onLog: m => log.push(m) })
    const met = t.integrity.quota.rows.reduce((a, r) => a + Math.min(3, r.valid), 0)
    T('K1', 'a clean Mandarin track stays exactly 90/90 with exactly 3 target lines per target', met === 90 && (t.integrity.invariants || {}).TARGET_LINES_EXACT === true, { met, tle: (t.integrity.invariants || {}).TARGET_LINES_EXACT, n: kw.length })
  })

  out.forEach(l => console.log(l))
  console.log('\n' + (n - fails) + '/' + n + ' passed' + (fails ? ' · ' + fails + ' FAILED' : ''))
  process.exit(fails ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
