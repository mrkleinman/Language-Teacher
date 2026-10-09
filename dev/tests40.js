// v681 — THREE-LANGUAGE QUALITY REPAIR regression suite (from the 9-Oct Japanese / Thai / Mandarin generation logs).
// Every reported defect has: an example that must FAIL, a comparable valid example that must PASS, the responsible
// validator (the real app function, never a copy), and a breadth check that the fix adds no wider false rejections.
//   node tests40.js [--app path/to/compiled.js]   (run against an older build to see which tests failed before the fix)
'use strict'
const fs = require('fs'), path = require('path')
const { load } = require('./harness')
const { loadFixture } = require('./benchmark/run')
const out = []; let n = 0, fails = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + id.padEnd(5) + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 600) : '')) }
const ai = process.argv.indexOf('--app'), APP = ai > 0 ? path.resolve(process.argv[ai + 1]) : path.join(__dirname, 'tt.compiled.js')
const has = (c, name) => { try { return typeof c.ev('typeof ' + name) === 'string' && c.ev('typeof ' + name) !== 'undefined' } catch (e) { return false } }
const safe = f => { try { return f() } catch (e) { return { __error: String(e && e.message || e).slice(0, 160) } } }

;(async () => {
  const c = load(APP, { realBelt: true })
  // ══ J — JAPANESE ═════════════════════════════════════════════════════════════════════════════════════════════════
  {
    const J = c.initJapaneseVocab(), inv = c.japaneseLearnerInventory(J, J.slice(0, 30))
    const seg = (s, a) => ({ japanese: s, segments: a.map(x => ({ surface: x, lemma: x, type: 'word' })) })
    const qw = (s, a) => { const r = c.validateJapaneseUsage(seg(s, a), inv); return (Array.isArray(r) ? r : (r.problems || [])).some(x => /question word/.test(String(x))) }
    T('J1', 'validateJapaneseUsage: どれも一緒だよ。/ 何でもいいです。/ どこも同じだ。 are good Japanese (question word inside an indefinite/universal compound) — PASS',
      !qw('どれも一緒だよ。', ['どれ', 'も', '一緒', 'だよ']) && !qw('何でもいいです。', ['何', 'でも', 'いい', 'です']) && !qw('どこも同じだ。', ['どこ', 'も', '同じ', 'だ']))
    T('J2', 'validateJapaneseUsage: an ASSERTED question word is still rejected — 誰だよ。/ いつだよ。 FAIL (the legitimate restriction is kept)',
      qw('誰だよ。', ['誰', 'だよ']) && qw('いつだよ。', ['いつ', 'だよ']))
    const fx = loadFixture('ja-daily-2026-10-08'), V = c.ttBenchApplyFixture(c.initJapaneseVocab(), fx), raw = c.ttBenchJazhTargets(fx, V)
    const teach = s => { const w = V.find(x => x.japanese === s); return !!c.japaneseTargetFeasibility(w, c.japaneseLearnerInventory(V, raw.concat([w]))).teachable }
    T('J3', 'japaneseTargetFeasibility: 物 and 場所 (deferred on every live Daily as "no licensed frame") are teachable for the real 10th Kyu learner — licensed constructions exist (買う物ある？ / 場所、分かる？ …)', teach('物') && teach('場所'))
    // a deferred NEW word is replaced by the next feasible unseen word AS NEW (same NEW count), never by a review word
    let qOk = false, qDetail = null
    if (has(c, 'japaneseDailyFeasibleTargets')) {
      const unseen = V.filter(w => w.status === 'new' && !w.lastSeen && !(w.repCount || 0) && !raw.some(t => t.id === w.id))
      const bad = unseen.find(w => !c.japaneseTargetFeasibility(w, c.japaneseLearnerInventory(V, raw.concat([w]))).teachable)
      if (bad) {
        const rv = raw.filter(w => w.selectionRole !== 'new').slice(0, 29).concat([{ ...bad, selectionRole: 'new' }])
        const got = c.japaneseDailyFeasibleTargets(rv, V), nNew = got.filter(w => w.selectionRole === 'new').length
        qOk = got.length === rv.length && nNew === 1 && !got.some(w => w.id === bad.id) && got.some(w => w._selectorStage === 'feasibility-backfill-new')
        qDetail = { deferred: bad.japanese, nNew, replacement: (got.find(w => w._selectorStage === 'feasibility-backfill-new') || {}).japanese }
      }
    }
    T('J4', 'japaneseDailyFeasibleTargets: an unteachable NEW word is replaced by the next teachable unseen word AS NEW (the live log: requested 3, deferred 物/場所, shipped 1)', qOk, qDetail)
    const SRC = fs.readFileSync(path.join(__dirname, 'tt.jsx'), 'utf8')
    T('J5', 'dashboard: "N new words per Daily Track" for Japanese / Mandarin reads newWordsPerTrack (the generator\'s own quota), not the Thai belt allowance',
      /langName === 'Japanese' \? newWordsPerTrack\('ja', 'daily', vocab\)/.test(SRC) && c.newWordsPerTrack('ja', 'daily', V) === c.ev('JA_DAILY_NEW_WORDS'))
    const vk = has(c, 'recallVariationKey') ? (a, t) => new Set(a.map(x => c.recallVariationKey(x, t))).size : () => -1
    T('J6', 'recallVariationKey: これ、好き？ / うん、好きだよ。 / それ、好き？ are 2 applications, not 3; 今日、何する？ / え、今日、何するの？ are 1',
      vk(['これ、好き？', 'うん、好きだよ。', 'それ、好き？'], '好き') === 2 && vk(['今日、何する？', 'え、今日、何するの？'], 'する') === 1)
    T('J7', 'recallVariationKey: genuinely different uses stay distinct (これ、好き？ / 犬が好き。 / 好きな食べ物は何？ → 3)', vk(['これ、好き？', '犬が好き。', '好きな食べ物は何？'], '好き') === 3)
    const vv = has(c, 'japaneseVariationVerdict') ? c.japaneseVariationVerdict('これ、好き？', 1, new Map([['k', { targetId: 1, text: 'それ、好き？' }]]), '好き') : { ok: true }
    T('J8', 'japaneseVariationVerdict (wired into the Japanese generator): これ、好き？ after それ、好き？ for the same target is rejected as the same application', vv.ok === false && vv.level === 'V')
    const SRCJ = fs.readFileSync(path.join(__dirname, 'tt.jsx'), 'utf8')
    T('J9', 'variety is NOT forced on social formulas / reply words (ありがとう, すみません, はい …): the live v681 Japanese run left ありがとう recall 3 with no candidate — they are exempt',
      /!\(jaSemanticClass\(target\.japanese\) \|\| \{\}\)\.standalone && !JA_LIMITED_VARIETY_WORDS\.includes\(target\.japanese\)\) dup = japaneseVariationVerdict/.test(SRCJ) && !!(c.jaSemanticClass('ありがとう') || {}).standalone)
  }
  // ══ T — THAI ═════════════════════════════════════════════════════════════════════════════════════════════════════
  {
    const V = c.initVocab(), pres = (s, t) => !!c.thaiTargetConceptPresent(t, s, V).present
    T('T1', 'thaiTargetConceptPresent: a target after a negation is present — ผมไม่ได้ยินอะไรเลยครับ (ได้ยิน) · เราไม่เหนื่อยแล้วครับ (เหนื่อย) · ผมยังไม่หิวครับ (หิว)',
      pres('ผมไม่ได้ยินอะไรเลยครับ', 'ได้ยิน') && pres('เราไม่เหนื่อยแล้วครับ', 'เหนื่อย') && pres('ผมยังไม่หิวครับ', 'หิว'))
    T('T10', 'thaiTargetConceptPresent: a reduplicated word is the target — ผมอยากสบายๆครับ (สบาย) · ช้าๆหน่อยครับ (ช้า) (live v681 retest rejected สบายๆ as TARGET_MISSING)',
      pres('ผมอยากสบายๆครับ', 'สบาย') && pres('ฉันอยากไปเที่ยวสบายๆค่ะ', 'สบาย') && pres('ช้าๆหน่อยครับ', 'ช้า'))
    T('T2', 'thaiTargetConceptPresent: accidental substrings and different words are still NOT the target — มา in หมา · ใจ in เข้าใจ · น้ำ in น้ำแข็ง · ตา in ตาย · แท็กซี่ absent',
      !pres('หมาตัวนี้น่ารัก', 'มา') && !pres('ผมเข้าใจครับ', 'ใจ') && !pres('น้ำแข็งเย็น', 'น้ำ') && !pres('ตายแล้ว', 'ตา') && !pres('ไม่ครับ เราไปรถไฟฟ้าดีกว่าครับ', 'แท็กซี่'))
    const lx = s => (c.thaiLexicalSenseProblems({ thai: s, english: '' }) || []).map(x => x.id)
    T('T3', 'thaiLexicalSenseProblems: travelling BY a vehicle — เราไปรถไฟฟ้ากันนะครับ / เราไปวินมอเตอร์ไซค์กันนะครับ FAIL; เรานั่งรถไฟฟ้าไปกันนะครับ / ขึ้นแท็กซี่ไปเลยครับ / ไปขึ้นรถเมล์ / ไปที่รถ PASS',
      lx('เราไปรถไฟฟ้ากันนะครับ').includes('COLLOCATION_VEHICLE_GO') && lx('เราไปวินมอเตอร์ไซค์กันนะครับ').includes('COLLOCATION_VEHICLE_GO') &&
      !lx('เรานั่งรถไฟฟ้าไปกันนะครับ').length && !lx('ขึ้นแท็กซี่ไปเลยครับ').length && !lx('ไปขึ้นรถเมล์ตรงนั้นครับ').length && !lx('ไปที่รถกันครับ').length)
    T('T4', 'thaiLexicalSenseProblems: คู่ only for pairs / couples — ผมอยากได้ตู้เย็นคู่หนึ่งครับ FAIL; ผมซื้อรองเท้าคู่ใหม่ครับ / ถุงเท้าสองคู่ / เขาเป็นคู่กัน PASS',
      lx('ผมอยากได้ตู้เย็นคู่หนึ่งครับ').includes('CLASSIFIER_KHUU_MISUSE') && !lx('ผมซื้อรองเท้าคู่ใหม่ครับ').length && !lx('ถุงเท้าสองคู่').length && !lx('เขาเป็นคู่กัน').length)
    const fxT = loadFixture('th-daily-device-2026-10-09'), VT = c.ttBenchApplyFixture(c.initVocab(), fxT)
    const G = has(c, 'THAI_FUNCTION_TARGET_GUIDE') ? c.ev('THAI_FUNCTION_TARGET_GUIDE') : {}
    const pw = safe(() => c.pickWords(VT, 'daily', null)), tg = (pw && (pw.targets || pw)) || [], fnSel = Array.isArray(tg) ? tg.filter(w => G[w.thai]).map(w => w.thai) : []
    T('T5', 'pickWords (real learner, 10th Kyu): the overdue function words are TAUGHT again (not VOCAB_NOT_GENERATABLE forever) — at most 2 per Daily Track, most overdue first; the rest stay due',
      Array.isArray(tg) && tg.length === 30 && fnSel.length >= 1 && fnSel.length <= 2 && ['แล้ว', 'ก็', 'นะ'].some(x => fnSel.includes(x)), { fnSel })
    T('T6', 'function-word teaching contract: แล้ว / ก็ / นะ each have their own guide (change of state · linking reaction · softener on a suggestion), used by the Thai prompt',
      ['แล้ว', 'ก็', 'นะ'].every(x => G[x] && G[x].length > 40) && /THAI_FUNCTION_TARGET_GUIDE\[target\.thai\]\) return THAI_FUNCTION_TARGET_GUIDE\[target\.thai\]/.test(fs.readFileSync(path.join(__dirname, 'tt.jsx'), 'utf8')))
    const fbS = safe(() => c.makeFallbackPairs({ thai: 'สั้น', english: 'short', phonetic: 'sân', partOfSpeech: 'adjective' })), fbT = safe(() => c.makeFallbackPairs({ thai: 'เหนื่อย', english: 'tired', phonetic: 'nùeai', partOfSpeech: 'adjective' }))
    T('T9', 'Thai fallback: รู้สึก ("feel") only for feelings — สั้น (short) gets อันนี้สั้นครับ, never ผมรู้สึกสั้นครับ (live v681); เหนื่อย (tired) keeps ผมรู้สึกเหนื่อยครับ',
      Array.isArray(fbS) && !fbS.some(x => /รู้สึก/.test(x.thai)) && Array.isArray(fbT) && fbT.some(x => /รู้สึกเหนื่อย/.test(x.thai)), { short: Array.isArray(fbS) && fbS.map(x => x.thai), tired: Array.isArray(fbT) && fbT.map(x => x.thai) })
    const fbB = safe(() => c.makeFallbackPairs({ thai: 'ยุ่ง', english: 'busy', phonetic: 'yûng', partOfSpeech: 'adjective' }))
    T('T11', 'Thai fallback: a person-state adjective (ยุ่ง busy) is said of a person — วันนี้ผมยุ่งครับ / คุณยุ่งไหมคะ, never อันนี้ยุ่งไหมคะ (live v681 retest)', Array.isArray(fbB) && fbB.every(x => !/อันนี้/.test(x.thai)) && fbB.some(x => /ยุ่งไหม/.test(x.thai)), Array.isArray(fbB) && fbB.map(x => x.thai))
    T('T12', 'คู่: tickets are not pairs — ผมอยากได้ตั๋วรถไฟสองคู่ครับ FAIL (live v681 retest); ผมซื้อรองเท้าคู่ใหม่ครับ PASS', lx('ผมอยากได้ตั๋วรถไฟสองคู่ครับ').includes('CLASSIFIER_KHUU_MISUSE') && !lx('ผมซื้อรองเท้าคู่ใหม่ครับ').length)
    const lex = c.buildThaiPhoneticLexicon(V), unk = 'ซ็อกโก้'
    const mk = ph => [{ thai: 'ผม' + unk + 'ครับ', phonetic: ph, words: [{ p: 'ผม', e: '' }, { p: unk, e: '' }, { p: 'ครับ', e: '' }], english: 'x' }]
    const good = c.finaliseThaiTrackPhonetics(mk('phǒm sók-goh khráp'), lex)[0], shifted = c.finaliseThaiTrackPhonetics(mk('sók-goh phǒm khráp'), lex)[0]
    T('T7', 'finaliseThaiTrackPhonetics: equal word/syllable COUNTS no longer prove alignment — a shifted line leaves the unknown token unaligned (reported missing); an anchored line still aligns',
      good.words[1].ph === 'sók-goh' && !shifted.words[1].ph, { good: good.words.map(w => w.ph), shifted: shifted.words.map(w => w.ph) })
    const k = c.ev('_semCacheKey'), p = { thai: 'สวัสดีครับ', english: 'Hello', prompt: 'Greet', pairType: 'bridge', _semanticState: 'VERIFIED', _semNat: 5 }
    p._semVerdicts = { nat: { key: k('nat', p), v: { s: 5 } } }
    T('T8', 'thaiSemanticAuditStatus: a VERIFIED line whose text changed after its naturalness verdict is UNVERIFIED (blocks READY) — the final persisted text must have been judged',
      c.thaiSemanticAuditStatus([p]).status === 'COMPLETE' && c.thaiSemanticAuditStatus([{ ...p, thai: 'สวัสดีค่ะ' }]).status === 'PARTIAL')
  }
  // ══ Z — MANDARIN ═════════════════════════════════════════════════════════════════════════════════════════════════
  {
    const V = c.initMandarinVocab(), inv = c.mandarinLearnerInventory(V, V.slice(0, 30)), bad = s => c.mandarinSurfaceGrammarProblems(s, inv).length > 0
    T('Z1', 'mandarinSurfaceGrammarProblems: bare adjective predicate after any plain subject — 今天好。/ 我好。 FAIL (the fallback built 今天好。); 你好。/ 今天很好。/ 这个大，那个小。 PASS',
      bad('今天好。') && bad('我好。') && !bad('你好。') && !bad('今天很好。') && !bad('这个大，那个小。'))
    T('Z2', 'subjectless 很 + adjective fragment — 很多。 FAIL; 很好。 (fixed reply) / 人很多。 / 太贵了！ PASS', bad('很多。') && !bad('很好。') && !bad('人很多。') && !bad('太贵了！'))
    T('Z3', 'a positive statement ending on a transitive verb with no object — 你喜欢 / 我想喝 FAIL; 我不喜欢 / 你吃吗？ / 你喝不喝？ / 我想喝水。 / 你拿吧。 PASS',
      bad('你喜欢') && bad('我想喝') && !bad('我不喜欢') && !bad('你吃吗？') && !bad('你喝不喝？') && !bad('我想喝水。') && !bad('你拿吧。'))
    T('Z4', '的/得 — 你做的好吗？ / 他跑的很快。 FAIL; 你做得好吗？ / 你说的对。 / 我做的饭很好吃。 PASS', bad('你做的好吗？') && bad('他跑的很快。') && !bad('你做得好吗？') && !bad('你说的对。') && !bad('我做的饭很好吃。'))
    T('Z5', 'question forms with 哪里 — 你到哪里？ / 你拿哪里？ FAIL; 你到哪里了？ / 你去哪里？ / 你在哪里买？ PASS', bad('你到哪里？') && bad('你拿哪里？') && !bad('你到哪里了？') && !bad('你去哪里？') && !bad('你在哪里买？'))
    T('Z6', 'adverb misuse exposed by the simulator — 很很好。/ 太很好。/ 你很什么？/ 我在看一起。 FAIL; 一起吧！/ 我们一起吃吧。/ 不太好。 PASS',
      bad('很很好。') && bad('太很好。') && bad('你很什么？') && bad('我在看一起。') && !bad('一起吧！') && !bad('我们一起吃吧。') && !bad('不太好。'))
    const sp = x => c.mandarinSpokenPinyin(x)
    T('Z7', 'spoken pinyin: 不 sandhi — bù before a 4th tone is bú (不要 bú yào, 不在 bú zài); before other tones bù stays (不想 bù xiǎng); 3+3 sandhi kept',
      sp('wǒ bù yào chī.') === 'wǒ bú yào chī.' && sp('wǒ bù zài.') === 'wǒ bú zài.' && sp('wǒ bù xiǎng qù.') === 'wǒ bù xiǎng qù.' && sp('nǐ hǎo') === 'ní hǎo')
    const fxZ = loadFixture('zh-daily-2026-10-08'), VZ = c.ttBenchApplyFixture(c.initMandarinVocab(), fxZ), rawZ = c.ttBenchJazhTargets(fxZ, VZ)
    const invZ = c.mandarinLearnerInventory(VZ, rawZ), hen = VZ.find(w => w.chinese === '很')
    const fb = [1, 2, 3].map(r => safe(() => c.mandarinFallbackPair(hen, invZ, r, new Map(), VZ, c.scarcityRules(invZ)))).filter(x => x && x.chinese).map(x => x.chinese)
    T('Z8', 'mandarinFallbackPair(很): the deterministic fallback gives 很 a SUBJECT (人很多。/ 这个很快。), never the fragment 很多。',
      fb.length > 0 && fb.every(x => !/^很/.test(x)), fb)
    const sv = s => has(c, 'recallVariationKey') ? c.recallVariationKey(s, '用') : s
    T('Z11', 'Mandarin: an unresolved recall gets ONE bounded recovery round on its own ledger before the track is declared incomplete (live v681: one 到 recall failed the whole track); 到 has licensed frames 我到了。/ 你到了吗？/ 我快到了。',
      /ONE bounded recovery round: an unresolved recall continues its OWN ledger history/.test(fs.readFileSync(path.join(__dirname, 'tt.jsx'), 'utf8')) &&
      (() => { const w = VZ.find(x => x.chinese === '到'); const fbs = [1, 2, 3].map(r => safe(() => c.mandarinFallbackPair(w, invZ, r, new Map(), VZ, c.scarcityRules(invZ)))).filter(x => x && x.chinese).map(x => x.chinese); return fbs.length >= 2 && new Set(fbs).size >= 2 })())
    T('Z12', 'from the live v681 run — 你想可以。/ 你可以什么？/ 这个什么？/ 我来帮 / 快。 FAIL; 你想要什么？/ 你可以做什么？/ 这个是什么？/ 我来帮你。/ 快一点！/ 我不会。 PASS',
      bad('你想可以。') && bad('你可以什么？') && bad('这个什么？') && bad('我来帮') && bad('快。') && !bad('你想要什么？') && !bad('你可以做什么？') && !bad('这个是什么？') && !bad('我来帮你。') && !bad('快一点！') && !bad('我不会。'))
    { const segs = c.segmentMandarin('我们回家吧。', invZ.lexicon), SRCZ = fs.readFileSync(path.join(__dirname, 'tt.jsx'), 'utf8')
      T('Z13', 'pinyin covers every character: 们 has its reading (我们回家吧 → wǒ men huí jiā ba; the live v681 retest shipped "wǒ huí jiā ba" as aligned), and the final audit rebuilds a line that differs from its words',
        segs.find(x => x.surface === '们').pinyin === 'men' && /PINYIN_REBUILT/.test(SRCZ) && /no reading for ' \+ noReading\.join/.test(SRCZ)) }
    T('Z9', 'variety: 你用这个。 / 我用那个。 are one application (pronoun + demonstrative swap); 你用什么？ is another', sv('你用这个。') === sv('我用那个。') && sv('你用什么？') !== sv('你用这个。'))
    // breadth: no false rejections over all real Mandarin sentences recorded so far, except the reported defect shapes
    const sents = new Set(); const add = r => { const cc = r && r.outcome && r.outcome.content; ((cc && cc.pairs) || []).forEach(p => p.text && sents.add(p.text)) }
    const L = path.join(__dirname, 'benchmark', 'live', 'v677')
    for (const f of fs.readdirSync(L).filter(f => /zh-daily/.test(f))) add(JSON.parse(fs.readFileSync(path.join(L, f), 'utf8')))
    const flagged = [...sents].filter(bad)
    const known = /^(很快。|我想吃。|我想吃|我慢。|今天好。|明天好。|很多。|我想喝|你做的好吗？|你喜欢|你到哪里？|快。|你想可以。|你可以什么？|这个什么？|我来帮)$/
    T('Z10', 'breadth: over every Mandarin sentence in the 3 live v677 Daily runs, the only rejections are the defect shapes this suite names (no wider false rejection)',
      flagged.filter(x => !known.test(x)).length === 0, flagged)
  }
  // ══ S — SHARED ═══════════════════════════════════════════════════════════════════════════════════════════════════
  {
    const R = has(c, 'QC_SENTENCE_DEFECT_NOTE') ? c.ev('QC_SENTENCE_DEFECT_NOTE') : /$^/
    T('S1', 'QC: a 3/5 cue verdict whose note names a sentence defect ("…is a fragment…") is escalated to the blocking repair ladder; a phrasing nit is explicitly ACCEPTED with a reason (found = fixed + accepted + unresolved)',
      R.test('The Mandarin sentence is a fragment and does not form a complete sentence.') && !R.test('Slight paraphrase of the cue') &&
      /iss\.status = 'accepted'; iss\.acceptReason = 'minor cue phrasing \(3\/5\)/.test(fs.readFileSync(path.join(__dirname, 'tt.jsx'), 'utf8')))
    const J = c.initJapaneseVocab()
    const det = (lang, text, english) => {
      const st = { inv: c.gen2Inventory ? safe(() => c.gen2Inventory({ lang, vocab: lang === 'zh' ? c.initMandarinVocab() : c.initVocab() }, [])) : null }
      return st.inv && !st.inv.__error ? safe(() => c.gen2DetCheck({ lang, speechStyle: 'natural', vocab: [] }, { [lang === 'zh' ? 'chinese' : 'thai']: lang === 'zh' ? '到' : 'รถไฟฟ้า', english: 'x' }, { text, english, cue: 'Ask your friend something.', speaker: 'either' }, st.inv)) : null
    }
    const SRC = fs.readFileSync(path.join(__dirname, 'tt.jsx'), 'utf8')
    T('S2', 'the new generator (Gen2) applies the same production grammar / sense rules up front (zh: mandarinSurfaceGrammarProblems · th: thaiLexicalSenseProblems)',
      /production grammar rule: ' \+ zr\.join/.test(SRC) && /production sense rule: ' \+ lr\.map/.test(SRC))
    T('S3', 'variety audit and the Mandarin generator use the ONE shared recallVariationKey', /const keys = new Set\(ps\.map\(p => recallVariationKey\(/.test(SRC) && /vkey = recallVariationKey\(cand\.chinese, target\.chinese\)/.test(SRC))
  }
  console.log(out.join('\n'))
  console.log('\nv681 three-language quality repair: ' + (n - fails) + '/' + n + (fails ? ' — ' + fails + ' FAILED' : ' — ALL PASS'))
  process.exit(fails ? 1 : 0)
})().catch(e => { console.log('CRASH ' + (e && e.stack || e)); process.exit(1) })
