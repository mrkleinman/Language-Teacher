// v691 — regressions from the 13-Oct v690 tracks made with the optional model (dev/sandbox/oct13-v690/) and the Thai Listening failure.
// Real application functions; simulated transport where a run is needed; no paid calls.
//   I — final integrity: an invalid line is REPLACED in its slot (never a 4th recall appended); exactly 3 lines per target (the v690
//       Japanese export had 91); a Japanese repair may not exceed the length limit
//   K — cues: the speaker's own name never addresses the listener ("correct Ken" on Ken's line)
//   P — pronunciation on final text: Japanese word-level romaji (aeta, kureru, ohiru); Mandarin pinyin rebuilt from the words
//       (zhège / dōngxi / kěyǐ, 我们 wǒmen); Thai ขนาดนั้น khà-nàat-nán
//   Q — question-word questions in Japanese need a question in English (どこで食べよう。)
//   G — writer / judge guidance from the v690 examples (Thai, Japanese, Mandarin); the repair prompt states the length rule
//   Z — Mandarin mini exchanges: A opens · B replies · A follows up; each line sees the earlier lines; judged exchange by exchange
//   L — Listening semantic planning: the five v690 Thai mismatches are caught before generation; roles; SRS-preserving deferral with a
//       real candidate pool; analogous Japanese and Mandarin checks; the whole select → plan → generate → audit run on all three
//   node tests48.js [--app path/to/compiled.js]
'use strict'
const fs = require('fs'), path = require('path')
const { load } = require('./harness')
const out = []; let n = 0, fails = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + id.padEnd(5) + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 900) : '')) }
const ai = process.argv.indexOf('--app'), APP = ai > 0 ? path.resolve(process.argv[ai + 1]) : path.join(__dirname, 'tt.compiled.js')
const SRC = fs.readFileSync(path.join(__dirname, 'tt.jsx'), 'utf8')
const OCT = path.join(__dirname, 'sandbox', 'oct13-v690')
const { runOnceUi, loadFixture, applyFixture, bankOf } = require('./benchmark/run')

;(async () => {
  // ══ I — final integrity ═════════════════════════════════════════════════════════════════════════════════════════
  {
    const c = load(APP, { realBelt: true })
    const kws = [{ wordId: 1, japanese: 'はい' }, { wordId: 2, japanese: 'どこ' }]
    const mk = (id, r, t, bad) => ({ pairId: 'p' + id + '-' + r, targetId: id, recallIndex: r, japanese: t, _bad: !!bad, speaker: 'A' })
    let calls = 0
    const adapter = { lang: 'ja', keywordsOf: t => t.keywords, surfaceOf: k => k.japanese, sentenceOf: p => p.japanese, targetPresent: () => true,
      invalidReason: p => p._bad ? 'BAD: ' + p.japanese : null, hardProblems: () => [], senseOf: k => k.japanese,
      recoverTargetPairs: async (kw, need, ctx) => { calls++; return { accepted: ctx.recallSlots.slice(0, need).map(s => mk(kw.wordId, s, kw.japanese + '-R' + calls, calls === 1)) } } }
    const pairs = [mk(1, 1, 'はい1'), mk(1, 2, 'はい2'), mk(1, 3, 'はい3'), mk(2, 1, 'どこ1'), mk(2, 2, 'どこ2', true), mk(2, 3, 'どこ3')]
    const r = await c.enforceTrackPairQuota({ keywords: kws, pairs, language: 'ja' }, adapter, { onLog: () => {}, vocab: [] })
    const doko = r.pairs.filter(p => p.targetId === 2)
    T('I1', 'a recovered line that turns out invalid is removed at the next round and its SLOT is refilled (recall 2), never a 4th recall appended (live v690 ja: an overlength はい stayed + "recall 4")',
      calls === 2 && doko.length === 3 && doko.every(p => !p._bad) && doko.map(p => p.recallIndex).sort().join() === '1,2,3' && r.pairs.length === 6, r.pairs.map(p => p.japanese + '#' + p.recallIndex))
    // the live v690 Japanese export itself: 91 target lines, はい ×4
    const txt = fs.readFileSync(path.join(OCT, 'japanese-track-2026-10-13-daily.txt'), 'utf8')
    const targets = [...txt.matchAll(/^\s+TARGET:\s+(\S+)/gm)].map(m => m[1])
    const surf = [...new Set(targets)], kws2 = surf.map((s, i) => ({ wordId: i + 1, japanese: s })), idOf = new Map(surf.map((s, i) => [s, i + 1]))
    const exp = c.targetLinesExact(targets.map((t, i) => ({ targetId: idOf.get(t), pairId: 'x' + i })), kws2, k => k.japanese)
    T('I2', 'exactly 3 target lines per target, counted on the persisted lines: the v690 Japanese export (91 lines, はい=4) FAILS the audit', !exp.ok && exp.total === 91 && /はい=4/.test(exp.detail), exp)
    const ok90 = c.targetLinesExact(surf.flatMap((s, i) => [1, 2, 3].map(r => ({ targetId: i + 1, pairId: s + r }))), kws2)
    T('I3', 'a track with exactly 3 per target (90) passes; TARGET_LINES_EXACT is a READY gate', ok90.ok && ok90.total === 90 && /reasons\.push\('TARGET_LINES_EXACT=false/.test(SRC))
    c.setLearnerStateOverride({ rank: '10th Kyu', source: 'tests48' })
    const jv = applyFixture(bankOf(c, 'ja'), loadFixture('ja-daily-2026-10-08'))
    const cc = c.getLearnerComplexityContract({ lang: 'ja', vocab: jv }), _jt = 'はい、今日は昼に駅の近くの店で友達と一緒にご飯を食べたいと思う。', an = c.hardComplexityAnalyse(cc, 'ja', { japanese: _jt, segments: c.jaDeterministicReading(_jt, c.ev('RAW_JAPANESE_VOCAB')).segs })
    T('I4', 'an overlength line is over the 10th Kyu limit (> 7) and the Japanese repair validator now applies that length contract (Mandarin already did; the v690 repair line counted 11 on its own segments)',
      an.overHardMax && cc.hardMax === 7 && /a QC repair is held to the learner's LENGTH contract/.test(SRC) && /hardComplexityAnalyse\(_cc, 'ja', pair\)/.test(SRC), { units: an.units, hardMax: cc.hardMax })
    T('I5', 'every QC repair prompt states the learner\'s length rule', /LENGTH: ' \+ group\._lengthRule/.test(SRC) && /_lengthRule = getLearnerComplexityContract\(\{ lang: engine\.language, vocab \}\)\.repairRule/.test(SRC))
  }

  // ══ K — cues ═══════════════════════════════════════════════════════════════════════════════════════════════════
  {
    const c = load(APP, { realBelt: true })
    const tr = { scene: { characterA: 'Ken (male, friend who has just arrived at the station)', characterB: 'Yuka (female, friend who has not eaten yet)' } }
    const p = c.fixCueAddressees([{ speaker: 'A', prompt: "Shake off the mix-up: say no, then correct Ken that it's tomorrow, not today." }, { speaker: 'A', prompt: 'Say yeah to Ken, then ask him if the shop is fine.' },
      { speaker: 'A', prompt: 'Say that Ken is your name.' }, { speaker: 'B', prompt: "Tell them I'm Yuka." }, { speaker: 'B', prompt: 'Ask Ken which dish he likes.' }], tr, null).pairs.map(x => x.prompt)
    T('K1', 'any mention of the speaker\'s own name is the listener\'s (live v690: "correct Ken" on Ken\'s line); introductions are kept', p[0] === "Shake off the mix-up: say no, then correct Yuka that it's tomorrow, not today." &&
      p[1] === 'Say yeah to Yuka, then ask her if the shop is fine.' && p[2] === 'Say that Ken is your name.' && p[3] === "Tell them I'm Yuka." && p[4] === 'Ask Ken which dish he likes.', p)
  }

  // ══ P — pronunciation on the final text ═════════════════════════════════════════════════════════════════════════
  {
    const c = load(APP, { realBelt: true })
    const bank = c.ev('RAW_JAPANESE_VOCAB')
    const txt = fs.readFileSync(path.join(OCT, 'japanese-track-2026-10-13-daily.txt'), 'utf8')
    const re = /JAPANESE:\s+(.+)\n\s+READING:\s+(.+)\n\s+ROMAJI:\s+(.+)/g
    let m, total = 0, before = 0, after = 0, mism = 0
    const SPLIT = r => /\b(ae ta|ku reru|o hiru|shi yo u|wa kara|no n de|too ku|ta be|i ko u)\b/.test(r) || /[？。、！]/.test(r)
    const got = {}
    while ((m = re.exec(txt))) { total++; const q = { japanese: m[1].trim(), reading: m[2].trim(), romaji: m[3].trim() }; if (SPLIT(q.romaji)) before++
      c.jaFinalRomaji(q, bank, null); if (SPLIT(q.romaji)) after++; if (!c.romajiMatchesReading(q.romaji, q.reading)) mism++; got[q.japanese] = q.romaji }
    T('P1', 'the live v690 Japanese export: every final romaji is word-level (mata aeta ne · shite kureru · ohiru) and transcribes its reading',
      total > 80 && before >= 3 && after === 0 && mism === 0 && got['また会えたね。'] === 'mata aeta ne.' && got['今、お昼だね。'] === 'ima, ohiru da ne.' && got['明日の昼に電話してくれる？'] === 'ashita no hiru ni denwa shite kureru?',
      { total, before, after, mism, a: got['また会えたね。'], b: got['今、お昼だね。'], k: got['明日の昼に電話してくれる？'] })
    const v = c.initMandarinVocab().map(w => w.id < 70 ? { ...w, status: 'review', manualKnown: true } : w)
    const r = await c._zhFinaliseMetadata([
      { chinese: '东西不多，我拿吧。', pinyin: 'dōng xi bù duō, wǒ ná ba.', segments: [{ surface: '东西', pinyin: 'dōngxi' }, { surface: '不多', pinyin: 'bù duō' }, { surface: '，我拿吧。', pinyin: 'wǒ ná ba.' }], targetId: 60 },
      { chinese: '这个东西可以用。', pinyin: 'zhè ge dōng xi kě yǐ yòng.', targetId: 12 }, { chinese: '我们一起去吧', pinyin: 'wǒmen yìqǐ qù ba', targetId: 1 }],
      { vocab: v, vocabById: new Map(v.map(w => [w.id, w])), track: { keywords: v.slice(0, 30).map(w => ({ wordId: w.id })) } })
    const zp = r.pairs
    T('P2', 'Mandarin final pinyin is rebuilt from the dictionary words (zhège dōngxi kěyǐ — not "zhè ge dōng xi kě yǐ"); a segment never swallows punctuation; 我们 = wǒmen',
      zp[0].pinyin === 'dōngxi bù duō, wǒ ná ba.' && zp[0].segments.every(s => s.type === 'punct' || !/[，。]/.test(s.surface)) && zp[1].pinyin === 'zhège dōngxi kěyǐ yòng.' && zp[1].spokenPinyin === 'zhège dōngxi kéyǐ yòng.' &&
      zp[2].pinyin === 'wǒmen yìqǐ qù ba' && zp[2].segments[0].surface === '我们' && !r.alignmentIssues.length, zp.map(p => [p.pinyin, p.spokenPinyin]))
    const L = c.ev('loadCanonicalThaiPhonetic')
    T('P3', 'Thai: ขนาดนั้น shown khà-nàat-nán like its own word ขนาด (was "khà-nàt-nán"); other compound differences are listed for review, not changed',
      L('khà-nàt-nán', 'ขนาดนั้น') === 'khà-nàat-nán' && L('khà-nàat', 'ขนาด') === 'khà-nàat' && fs.existsSync(path.join(__dirname, 'sandbox', 'reports', '2026-10-13-thai-compound-phonetics.txt')))
  }

  // ══ Q — Japanese question-word questions ════════════════════════════════════════════════════════════════════════
  {
    const c = load(APP, { realBelt: true })
    const q = ['今日の昼、どこで食べよう。', '何時に行く？', '昼、何食べる'].map(c.jaWhQuestion), nq = ['どう行くか、まだ分からない。', 'どこかで食べよう。', '何も食べてない。', 'いつも行く店。', 'どうぞ。', 'どうもありがとう。'].map(c.jaWhQuestion)
    const pr = c.jaCueFormProblems({ japanese: '今日の昼、どこで食べよう。', english: "Let's eat somewhere at lunch today.", prompt: 'Suggest eating at lunch' })
    T('Q1', 'どこで食べよう。 is a question (live v690 English: "Let\'s eat somewhere…" → now a CUE_FORM mismatch); indefinites and embedded questions are not', q.every(Boolean) && nq.every(x => !x) && pr.some(x => /question but the English is a statement/.test(x)), { q, nq, pr })
  }

  // ══ G — guidance ═══════════════════════════════════════════════════════════════════════════════════════════════
  {
    const c = load(APP, { realBelt: true })
    const th = c.ev('THAI_NATURALNESS_GUIDE'), ja = c.ev('JA_NATURALNESS_GUIDE'), zh = c.ev('ZH_NATURALNESS_GUIDE')
    T('G1', 'Thai guide covers the v690 examples (สบายดี, ถึง, นี้ vs นี่, ถอด, goodbyes) and keeps the 13-Oct ones', ['สบายดี', 'ข้ามสะพานไปก็ถึง', 'ขนาดนี้', 'ถอดรองเท้า', 'เอาจานไปล้าง', 'ไว้เจอกันใหม่', 'ที่นั่น', 'คู่ละ'].every(w => th.includes(w)))
    T('G2', 'Japanese guide (new) covers どこで食べる, どこにする / どっちの店, おいしそう referent, いいえ / ううん, cue names the other person', ['どこで食べる？', 'どっちの店にする？', 'おいしそう', 'ううん', 'OTHER person'].every(w => ja.includes(w)) && /JA_NATURALNESS_GUIDE : ''\) \+/.test(SRC))
    T('G3', 'Mandarin guide covers 你想吃什么, one line never asks and answers itself, 东西, no added reasons, 这个好喝吗', ['你想吃什么？', 'never asks and answers itself', '东西', 'never adds a reason', '这个好喝吗？'].every(w => zh.includes(w)))
    T('G4', 'the group judge receives the same language guide', /\{ th: THAI_NATURALNESS_GUIDE\.replace\('write the natural form', 'flag these'\), ja: JA_NATURALNESS_GUIDE/.test(SRC))
  }

  // ══ Z — Mandarin mini exchanges ═════════════════════════════════════════════════════════════════════════════════
  {
    const c = load(APP, { realBelt: true })
    const v = c.initMandarinVocab(), inv = c.mandarinLearnerInventory(v, v.slice(0, 30)), t = v.find(w => w.chinese === '可以')
    const p2 = c.buildMandarinPrompt(t, inv, v, 2, c.mandarinScarcityRules(inv), [{ recallIndex: 1, speaker: 'A', chinese: '我可以喝吗？', english: 'May I drink it?' }])
    const p1 = c.buildMandarinPrompt(t, inv, v, 1, c.mandarinScarcityRules(inv), [])
    T('Z1', 'line 2 is written as B\'s REPLY and sees line 1 (A: 我可以喝吗？); line 1 opens a small situation', /line 1 \(A\): 我可以喝吗？/.test(p2.user) && /said by B: B's natural REPLY to line 1/.test(p2.user) && /It OPENS a small situation/.test(p1.user) && !/FUNCTION for this recall/.test(p2.user), p2.user.slice(0, 400))
    let C
    const r = await runOnceUi(loadFixture('zh-daily-2026-10-08'), { mode: 'record', provider: 'sim', prepare: x => { C = x } })
    const tk = C.ev('TT_BENCH.lastTrack'), tp = tk.pairs.filter(p => p.targetId != null)
    const grouped = tp.every((p, i) => i % 3 !== 0 || (tp[i + 1] && tp[i + 2] && tp[i + 1].targetId === p.targetId && tp[i + 2].targetId === p.targetId))
    T('Z2', 'every Mandarin target line has a speaker (A opens · B replies · A follows up) and each exchange stays together (live v690: 25 A, 4 B, the rest blank; interleaved)',
      tp.length === 90 && tp.every(p => p.speaker === ({ 1: 'A', 2: 'B', 3: 'A' })[p.recallIndex]) && grouped, tp.slice(0, 6).map(p => [p.speaker, p.targetId, p.recallIndex]))
    const coh = r.log.find(l => /MAIN_TRACK_COHERENCE \d+\/\d+ scene/.test(l)) || ''
    T('Z3', 'coherence is judged exchange by exchange (30 sections), the brief\'s standard for a 65-word learner — not one 90-line story', /MAIN_TRACK_COHERENCE 30\/30 scene\(s\)|X30=/.test(coh), coh.slice(0, 200))
  }

  // ══ L — Listening semantic planning ═════════════════════════════════════════════════════════════════════════════
  {
    const c = load(APP, { realBelt: true })
    const v = c.initVocab(), ids = [717, 737, 1479, 719, 1524, 787, 730, 1539, 815, 817, 359, 750, 841, 839, 669, 847]
    const T0 = c.listeningConversationTargets({ keywords: ids.map(id => c.listeningTrackKeyword('th', v.find(w => w.id === id))), selectedTargetIds: ids, language: 'th' }, v, 'th')
    const byId = new Map(T0.map(t => [t.id, t])), role = id => byId.get(id).role
    T('L1', 'roles: ตลก "funny" and น่าดู "worth seeing" are describing words, เลี้ยว "turn" is an action (v690 treated all three as nouns)', role(817) === 'DESCRIPTION' && role(839) === 'DESCRIPTION' && role(359) === 'ACTION', [role(817), role(839), role(359)])
    const turns = [{ turnId: 'T3', actType: 'QUESTION', slot: 'STATE', targetIds: [737, 1479] }, { turnId: 'T4', actType: 'ANSWER', slot: 'STATE', targetIds: [719], respondsTo: 'T3' },
      { turnId: 'T5', actType: 'STATEMENT', targetIds: [1524, 787] }, { turnId: 'T9', actType: 'QUESTION', slot: 'STATE', targetIds: [737, 841] }, { turnId: 'T10', actType: 'ANSWER', slot: 'STATE', targetIds: [839], respondsTo: 'T9' },
      { turnId: 'T20', actType: 'QUESTION', slot: 'THING', targetIds: [] }, { turnId: 'T21', actType: 'ANSWER', slot: 'THING', targetIds: [359, 750], respondsTo: 'T20' },
      { turnId: 'T22', actType: 'QUESTION', slot: 'DURATION', targetIds: [730, 1539] }, { turnId: 'T32', actType: 'QUESTION', slot: 'STATE', targetIds: [737, 815] }, { turnId: 'T33', actType: 'ANSWER', slot: 'STATE', targetIds: [817], respondsTo: 'T32' }]
    const pr = c.lnExchangeSemanticProblems(turns, byId), at = id => pr.filter(x => x.text.startsWith(id + ':'))
    T('L2', 'the five v690 mismatches are caught: แก่ for an entrance · ขนาด with no referent · a verb as "what is that?" · "how long" about a fare · ตลก for pad thai',
      at('T4').length === 1 && at('T5').length === 1 && at('T21').length === 1 && at('T22').length === 1 && at('T33').length === 1 && pr.length === 5, pr.map(x => x.text))
    T('L3', 'a sensible exchange passes (สนามหลวงเป็นอย่างไร → น่าดู)', at('T10').length === 0)
    T('L4', 'the checks are part of the meaning-plan validation (so a misfit target is re-planned or deferred BEFORE generation)', /lnExchangeSemanticProblems\(turns, byId\)\.forEach\(x => bad\('SEMANTIC_MISMATCH '/.test(SRC))
    // analogous Japanese / Mandarin cases (glosses decide; the rules are shared)
    const fakeT = (id, surface, gloss, roleX) => ({ id, surface, gloss, role: roleX || 'CONTENT' })
    const jb = new Map([[1, fakeT(1, 'どう', 'how', 'QUESTION_WORD')], [2, fakeT(2, '駅', 'station')], [3, fakeT(3, 'おいしい', 'delicious', 'DESCRIPTION')], [4, fakeT(4, '店', 'shop')], [5, fakeT(5, '近い', 'near', 'DESCRIPTION')]])
    const ja = c.lnExchangeSemanticProblems([{ turnId: 'T1', actType: 'QUESTION', slot: 'STATE', targetIds: [1, 2] }, { turnId: 'T2', actType: 'ANSWER', slot: 'STATE', targetIds: [3], respondsTo: 'T1' },
      { turnId: 'T3', actType: 'QUESTION', slot: 'STATE', targetIds: [1, 4] }, { turnId: 'T4', actType: 'ANSWER', slot: 'STATE', targetIds: [5], respondsTo: 'T3' }], jb)
    const zb = new Map([[1, fakeT(1, '多少', 'how much / how long', 'QUESTION_WORD')], [2, fakeT(2, '钱', 'money')], [3, fakeT(3, '车', 'car')]])
    const zh = c.lnExchangeSemanticProblems([{ turnId: 'T1', actType: 'QUESTION', slot: 'DURATION', targetIds: [1, 2] }, { turnId: 'T2', actType: 'QUESTION', slot: 'DURATION', targetIds: [1, 3] }], zb)
    T('L5', 'Japanese: "how is the station?" → おいしい is flagged, "how is the shop?" → 近い passes · Mandarin: "how long" about 钱 is flagged, about 车 passes',
      ja.length === 1 && ja[0].text.startsWith('T2:') && zh.length === 1 && zh[0].text.startsWith('T1:'), { ja: ja.map(x => x.text), zh: zh.map(x => x.text) })
    // real candidate pool (SRS order): the misfit target is deferred, SRS kept, replaced from the pool, plan feasible
    const res = []
    for (const fxId of ['th-listening-2026-10-08', 'th-listening-device-2026-10-09', 'ja-listening-2026-10-08', 'zh-listening-2026-10-08']) {
      const c2 = load(APP, { realBelt: true }), fx = loadFixture(fxId), vocab = applyFixture(bankOf(c2, fx.language), fx)
      const snap = c2.selectRevisionTargets(fx.language, vocab), pool = c2.listeningCandidatePool(fx.language, vocab, snap)
      const f = c2.selectFeasibleListeningTargets({ lang: fx.language, vocab, pool, need: 30, seed: 'tests48', frozen: false })
      const tt = (f.plan && f.plan.meaningPlan && f.plan.meaningPlan.turns) || []
      const bmap = new Map(c2.listeningConversationTargets({ keywords: f.targetIds.map(id => c2.listeningTrackKeyword(fx.language, vocab.find(w => w.id === id))), selectedTargetIds: f.targetIds, language: fx.language }, vocab, fx.language).map(t => [t.id, t]))
      res.push({ fxId, feasible: f.feasible, n: new Set(f.targetIds).size, deferred: f.deferred.map(d => d.surface), mismatches: c2.lnExchangeSemanticProblems(tt, bmap).length })
    }
    const th1 = res[0]
    T('L6', 'with the real SRS-ordered pool the Thai plan stays feasible: ขนาด is deferred (its SRS obligation kept, reported) and replaced — exactly 30 unique targets, no semantic mismatch left',
      res.every(x => x.feasible && x.n === 30 && x.mismatches === 0) && th1.deferred.includes('ขนาด'), res)
    // the whole workflow (select → plan → generate → repair → final audit), simulated model, all three languages
    const runs = []
    for (const fxId of ['synthetic-th-listening', 'ja-listening-2026-10-08', 'zh-listening-2026-10-08', 'th-listening-device-2026-10-09']) {
      const r = await runOnceUi(loadFixture(fxId), { mode: 'record', provider: 'sim' })
      runs.push({ fxId, status: r.content && r.content.status, calls: r.cassette.entries.length, infeasible: r.log.some(l => /LISTENING_PLAN_INFEASIBLE paidLanguageGenerationCalls=0/.test(l)), sem: r.log.some(l => /LISTENING_PLAN_INFEASIBLE.*ขนาด/.test(l)) })
    }
    T('L7', 'full workflow: Thai / Japanese / Mandarin build READY; a fixture whose 30 frozen targets include a target with no valid exchange (ขนาด, no spare candidate) STOPS before generation with 0 paid calls and an explicit diagnostic (v690 spent the calls and ended 0/30)',
      runs.slice(0, 3).every(x => x.status === 'READY' && x.calls > 0) && runs[3].infeasible && runs[3].calls === 0 && runs[3].sem, runs)
  }

  console.log(out.join('\n'))
  console.log('\n' + (n - fails) + '/' + n + ' passed' + (fails ? ' — ' + fails + ' FAILED' : ''))
  process.exit(fails ? 1 : 0)
})().catch(e => { console.log(out.join('\n')); console.log('CRASH ' + (e && e.stack || e)); process.exit(2) })
