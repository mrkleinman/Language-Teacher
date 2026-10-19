// v684 — TEACHING-QUALITY OVERHAUL regression suite (owner brief 2026-10-12). Real application functions only; no model calls.
//   V — independent pronunciation (the 270 exported v683 exercises: exactly the audited errors, nothing else)
//   T — Thai tone rules calibrated on every one-syllable bank entry
//   P — the teaching plan: deterministic validation (good plans pass, each kind of bad plan is named)
//   G — the final gate on the frozen lesson: reference fixtures pass; each criterion fails on its own defect; verdicts bound to text
//   E — the pipeline with a scripted stand-in model: plan → generate → gate → targeted repair → honest stop; no identical prompts
//   X — production isolation (nothing outside the bench reaches v684)
//   node tests44.js [--app path/to/compiled.js]
'use strict'
const fs = require('fs'), path = require('path')
const { load } = require('./harness')
const V = require('./sandbox/v684/lib'), { scriptedEngine } = require('./sandbox/v684/scripted_engine')
const out = []; let n = 0, fails = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + id.padEnd(5) + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 900) : '')) }
const ai = process.argv.indexOf('--app'), APP = ai > 0 ? path.resolve(process.argv[ai + 1]) : path.join(__dirname, 'tt.compiled.js')
const SRC = fs.readFileSync(path.join(__dirname, 'tt.jsx'), 'utf8')
const AUD = path.join(__dirname, 'sandbox', 'v684', 'audit'), J = f => JSON.parse(fs.readFileSync(path.join(AUD, f), 'utf8'))
const REF = JSON.parse(fs.readFileSync(path.join(__dirname, 'sandbox', 'v684', 'reference-fixtures.json'), 'utf8'))
const eq = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort())

;(async () => {
  const c = load(APP, { realBelt: true })
  // ══ V — independent pronunciation on the exported v683 lessons ═══════════════════════════════════════════════════
  {
    const zlex = c.mandarinLexicon(null)
    const zf = J('zh.json').filter(p => c.v684ZhVerify({ text: p.text, pinyin: p.pinyin, spoken: p.spoken }, zlex, { yi: 'either' }).length).map(p => p.pos)
    T('V1', 'Mandarin: the 94 exported lines → exactly the 10 audited errors (有一点 yóu; 我们 wómen ×3; 一下 yī xià; 可以 with no spoken line ×5)', eq(zf, [3, 9, 15, 33, 39, 45, 65, 71, 77, 82]), zf)
    const km = c.v684JaKanjiReadings(c.ev('RAW_JAPANESE_VOCAB'))
    const jf = J('ja.json').filter(p => c.v684JaReadingProblems(p.text, p.reading, km).concat(c.v684JaRomajiProblems(p.reading, p.romaji)).length).map(p => p.pos)
    T('V2', 'Japanese: the 91 exported lines → exactly pair 48 (何にも read なににも) and pair 91 (どこかいきの / dokokaikino)', eq(jf, [48, 91]), jf)
    const bank = c.ev('RAW_VOCAB').map(d => ({ id: d.id, thai: d.t, phonetic: d.ph })), lex = c.v684ThLexicon(bank), names = c.ev('THAI_NAME_PHONETIC')
    Object.entries(names).forEach(([k, v]) => lex.set(k, v)); bank.push(...Object.keys(names).map(k => ({ thai: k })))
    const tf = J('th.json').filter(p => c.v684ThVerify({ text: p.text, ph: p.ph }, bank, lex).length).map(p => p.pos)
    // Oct13 (owner, 13 Oct): the ɔi diphthong is now displayed "oi" (หน่อย nòi, อร่อย à-ròi) — lines 7, 71, 85 carry the old "nàwi / à-ràwi"
    // and are flagged for that rendering ONLY (nothing else on those lines)
    // (v704 also writes a long ɔɔ / əə / ʉʉ / ɛɛ long — aaw / ooe / uue / aae — where the old export wrote aw / oe / ue / ae: spelling too)
    const conv = s => String(s || '').normalize('NFD').replace(/a([\u0300-\u036f]*)a(?=w|e)/g, 'a$1').replace(/o([\u0300-\u036f]*)o(?=e)/g, 'o$1').replace(/u([\u0300-\u036f]*)u(?=e)/g, 'u$1').normalize('NFC')
      .replace(/(^|[\s-])bp/g, '$1p').replace(/(^|[\s-])dt/g, '$1t').replace(/(^|[\s-])g/g, '$1k').replace(/[\s-]+/g, '')
    const ɔiOnly = J('th.json').filter(p => [7, 71, 85].includes(p.pos)).every(p => { const pr = c.v684ThVerify({ text: p.text, ph: p.ph }, bank, lex)
      // (v704: compared through conv — line 71 also writes ไป as "pai", the old spelling of bpai)
      return pr.length === 1 && /≠ dictionary rendering/.test(pr[0]) && conv(p.ph.replace(/nàwi/g, 'nòi').replace(/à-ràwi/g, 'à-ròi')) === conv(pr[0].split('rendering "')[1].replace(/"$/, '')) })
    // v704: the dictionary now spells unaspirated ป ต ก as bp dt g (ไป bpai, ตัว dtua, กัน gan) — the old export wrote p t k, so lines
    // whose ONLY difference is that initial-consonant spelling are flagged too; they must carry nothing else
    const AUDITED = [7, 11, 14, 27, 38, 54, 55, 60, 61, 62, 71, 78, 79, 80, 85]
    const convOnly = p => { const pr = c.v684ThVerify({ text: p.text, ph: p.ph }, bank, lex); return pr.length === 1 && /≠ dictionary rendering/.test(pr[0]) && conv(p.ph) === conv(pr[0].split('rendering "')[1].replace(/"$/, '')) }
    const th = J('th.json'), extra = tf.filter(x => !AUDITED.includes(x))
    T('V3', 'Thai: the 94 exported lines → the 12 audited errors (แล้ว lâeo ×5, ร้อน rón, โกรธ krôot ×3, ผู้ชาย chai ×3) + the 3 lines whose only difference is the Oct13 ɔi rendering (nàwi → nòi) are all flagged and none of them is a spelling-only difference; every other flagged line differs ONLY in the v704 spelling (bp/dt/g, long vowels written long)',
      AUDITED.every(x => tf.includes(x)) && ɔiOnly && th.filter(p => AUDITED.includes(p.pos) && ![7, 71, 85].includes(p.pos)).every(p => !convOnly(p)) && extra.length > 0 && th.filter(p => extra.includes(p.pos)).every(convOnly), { extra: th.filter(p => extra.includes(p.pos) && !convOnly(p)).map(p => p.pos) })
    const zlexT = zlex.concat([{ w: '是', p: 'shì' }, { w: '个', p: 'gè' }, { w: '人', p: 'rén' }])     // rule cases need these three syllables
    const sp = (t) => { const p = c.v684ZhPronunciation(t, zlexT); return p.spoken || p.pinyin }
    const cases = [['有一点', 'yǒu yì diǎn'], ['我们一起去', 'wǒ men yì qǐ qù'], ['你等一下', 'ní děng yí xià'], ['可以', 'ké yǐ'], ['你好', 'ní hǎo'], ['不是', 'bú shì'], ['要不要', 'yào bu yào'], ['我很好', 'wó hén hǎo'], ['一个人', 'yí gè rén']]
    const bad = cases.filter(([t, w]) => sp(t) !== w).map(([t, w]) => t + ' → ' + sp(t) + ' (want ' + w + ')')
    T('V4', 'Mandarin spoken line by rule: 一 and 不 from the next citation tone, 3-3 on the resulting tones, neutral tones block 3-3, A-不-A neutral', !bad.length, bad)
    const jc = [['どこか行くの？', 'どこかいくの？', 0], ['どこか行くの？', 'どこかいきの？', 1], ['何にもないよ。', 'なんにもないよ。', 0], ['何にもないよ。', 'なににもないよ。', 1], ['何か食べる？', 'なにかたべる？', 0],
      ['来ないの？', 'こないの？', 0], ['来て。', 'きて。', 0], ['この話、分かる？', 'このはなし、わかる？', 0], ['何時？', 'なんじ？', 0], ['今日、行く？', 'きょう、いく？', 0], ['今日、行く？', 'きょう、ゆく？', 1]]
    const jb = jc.filter(([s, r, want]) => (c.v684JaReadingProblems(s, r, km).length > 0) !== !!want).map(([s, r]) => s + ' / ' + r)
    T('V5', 'Japanese reading derivable from the sentence: kana kept in order, kanji read as taught words read them (来ない こない, 話 はなし), 何 by context', !jb.length, jb)
    const zero = J('zh.json').concat(J('ja.json')).length
    T('V6', 'Japanese romaji must transcribe the reading (wa / e / o particles allowed) — "dokokaikino" for どこかいくの fails, "doko ka iku no" passes',
      c.v684JaRomajiProblems('どこかいくの？', 'dokokaikino').length === 1 && !c.v684JaRomajiProblems('どこかいくの？', 'doko ka iku no?').length && !c.v684JaRomajiProblems('えきはあそこです。', 'eki wa asoko desu.').length && zero > 0)
  }
  // ══ T — Thai tone rules ════════════════════════════════════════════════════════════════════════════════════════════
  {
    const bank = c.ev('RAW_VOCAB'), TN = { '̀': 'low', '́': 'high', '̂': 'falling', '̌': 'rising' }
    const tone = p => { for (const ch of p.normalize('NFD')) if (TN[ch]) return TN[ch]; return 'mid' }
    // adjudicated errors still present in the RUNNING bank (the app already corrects some entries at load, e.g. สาย)
    const live = new Map(bank.map(d => [d.id, d.ph]))
    const adj = new Set(J('th-bank-tone-scan.json').filter(x => x.proposed_phonetic && live.get(x.id) === x.bank_phonetic).map(x => x.id))
    let mono = 0; const flagged = [], missed = []
    bank.forEach(d => { if (!d.ph || /[\s-]/.test(d.ph.trim()) || /\s/.test(d.t)) return; mono++
      const p = c.v684ThWordProblems(d.t, c.loadCanonicalThaiPhonetic(d.ph)).filter(x => /tone/.test(x))
      if (p.length && !adj.has(d.id)) flagged.push(d.t + ' ' + d.ph); if (!p.length && adj.has(d.id)) missed.push(d.t + ' ' + d.ph) })
    T('T1', 'Thai tone rules on all ' + mono + ' one-syllable bank entries: every adjudicated bank error flagged, no other entry flagged', mono > 500 && !flagged.length && !missed.length, { flagged, missed })
    const tc = [['เป็น', 'mid'], ['เย็น', 'mid'], ['ชอบ', 'falling'], ['แล้ว', 'high'], ['โกรธ', 'low'], ['หน่อย', 'low'], ['รถ', 'high'], ['นวด', 'falling'], ['สัตว์', 'low'], ['บัตร', 'low'], ['เกาะ', 'low'], ['ใช้', 'high'], ['ซ้าย', 'high'], ['ไหม', 'rising'], ['ญาติ', 'falling']]
    const tb = tc.filter(([w, t]) => c.v684ThToneOf(w) !== t).map(([w, t]) => w + ' → ' + c.v684ThToneOf(w) + ' (want ' + t + ')')
    T('T2', 'Thai tone: live/dead from the FINAL consonant (เป็น, เย็น mid), long medial อ (ชอบ falling), silent letters (สัตว์, บัตร, ญาติ), -ะ endings (เกาะ)', !tb.length, tb)
    const lex = c.v684ThLexicon(null)
    // v704: the corrections now live in the stored dictionary itself (owner-approved Thai Daily quality pass), not only in the lexicon
    T('T3', 'the dictionary corrections reach compound entries (แล้วคุณล่ะ láaeo-khun-lâ) and the stored word itself (แล้ว láaeo)',
      /láaeo/.test(lex.get('แล้วคุณล่ะ') || '') && c.ev("RAW_VOCAB.find(d => d.t === 'แล้ว').ph") === 'láaeo', lex.get('แล้วคุณล่ะ'))
  }
  // ══ P — the teaching plan ═════════════════════════════════════════════════════════════════════════════════════════
  {
    for (const lang of ['ja', 'zh', 'th']) {
      const g = V.gateContext(c, lang + '-daily-2026-10-12', REF[lang].map(t => t.target.surface))
      const fnBy = new Map(g.ctx.recs.map(r => [r.id, c.v684Functions(lang, r)]))
      const eng = scriptedEngine(lang, REF), plan = await eng.ask('V684_plan', c.v684PlanPrompt(lang, g.ctx.recs, fnBy, g.ctx.allowed))
      const v = c.v684ValidatePlan(lang, plan, g.ctx.recs, fnBy)
      T('P1' + lang, lang + ': a plan for 5 targets × 3 recalls validates (3 distinct functions each, exchanges of ' + c.ev('V684_EXCHANGE_LEN')[lang] + ' alternating lines, register from the addressee)', v.ok && v.cards.length === 15, v.problems.slice(0, 5))
      if (lang !== 'ja') continue
      const clone = () => JSON.parse(JSON.stringify(plan)), codes = p => new Set(c.v684ValidatePlan(lang, p, g.ctx.recs, fnBy).problems.map(x => x.code))
      const p1 = clone(); p1.exchanges[0].lines.push({ ...p1.exchanges[0].lines[0] })
      const p2 = clone(); p2.exchanges[1].lines[1].voice = p2.exchanges[1].lines[0].voice
      const p3 = clone(); const iie = p3.exchanges.find(e => e.lines.some(l => l.target === 'いいえ')); iie.lines.forEach(l => { l.relation = 'friend' })
      const p4 = clone(); const wk = p4.exchanges.flatMap(e => e.lines).filter(l => l.target === '分かる'); wk[1].functionId = wk[0].functionId
      const p5 = clone(); p5.exchanges = p5.exchanges.filter(e => !e.lines.some(l => l.target === '好き' && l.recall === 3))
      const p6 = clone(); p6.exchanges.slice(0, 4).forEach(e => { e.situation = 'at the station' })
      const p7 = clone(); p7.exchanges[2].lines.find(l => l.target).purpose = 'asks'
      const p8 = clone(); const st = p8.exchanges.find(e => e.lines.some(l => l.relation === 'staff')); const sl = st.lines.find(l => l.relation === 'staff'); sl.addressee = sl.role
      const want = [[p1, 'EXCHANGE_LENGTH'], [p2, 'VOICES_DO_NOT_ALTERNATE'], [p3, 'REGISTER'], [p4, 'FUNCTIONS_NOT_DISTINCT'], [p5, 'RECALL_COUNT'], [p6, 'SITUATION_OVERUSED'], [p7, 'PURPOSE_TOO_VAGUE'], [p8, 'SELF_ADDRESS']]
      const miss = want.filter(([p, code]) => !codes(p).has(code)).map(([, code]) => code)
      T('P2', 'each kind of bad plan is named: wrong exchange length, voices not alternating, いいえ to a friend, repeated function, missing recall, overused situation, vague purpose, speaker = addressee', !miss.length, miss)
    }
    const rec = c.v684SenseRecord('th', { id: 551, t: 'หลัง', e: 'after / back' })
    T('P3', 'sense record: หลัง (after / back) lists the classifier sense as NOT to be taught; いいえ is polite-only; うん casual-only',
      rec.otherSenses.some(o => o.label === 'classifier') && c.v684SenseRecord('ja', { id: 1, japanese: 'いいえ', english: 'no' }).register === 'polite-only' && c.v684SenseRecord('ja', { id: 2, japanese: 'うん', english: 'yeah' }).register === 'casual-only')
    const sc = c.v684Scaffolding('zh', { zhInv: { grammarScaffold: [] } })
    T('P4', 'one scaffolding table per language (grammar only: particles, measure words, polite endings) — merged from the old lists; no content word in it',
      ['的', '了', '吗', '吧', '呢', '们'].every(x => sc.includes(x)) && !sc.includes('慢') && c.v684Scaffolding('th', {}).includes('ครับ') && c.v684Scaffolding('ja', {}).includes('ね'))
  }
  // ══ G — the final gate ════════════════════════════════════════════════════════════════════════════════════════════
  const refLesson = lang => { const g = V.gateContext(c, lang + '-daily-2026-10-12', REF[lang].map(t => t.target.surface)); return { g, lines: V.referenceLesson(lang, REF[lang], g.ctx) } }
  {
    for (const lang of ['ja', 'zh', 'th']) {
      const { g, lines } = refLesson(lang)
      const det = c.v684Deterministic(lang, lines, g.ctx), bad = lines.filter(l => Object.keys(det.get(l.id)).length)
      V.passAllJudge(c, lines)
      const gate = c.v684FinalGate(lang, lines, g.ctx)
      T('G1' + lang, lang + ': the 15 reference recalls (designed, not model output) pass all 12 criteria; READY with every verdict bound to the final text', !bad.length && gate.ready && gate.judged === lines.length, bad.map(l => l.id + ' ' + JSON.stringify(det.get(l.id))))
    }
    const mut = (lang, fn, crit, label) => {
      const { g, lines } = refLesson(lang); fn(lines); V.passAllJudge(c, lines)
      const gate = c.v684FinalGate(lang, lines, g.ctx), hit = gate.perLine.some(p => p.fails[crit])
      return { ok: hit && !gate.ready, label, gate }
    }
    const L = (lines, id) => lines.find(l => l.id === id)
    const ms = [
      mut('ja', ls => { L(ls, '行く#1.1').reading = 'あした、どこかいき？' }, 9, 'ja wrong reading'),
      mut('zh', ls => { L(ls, '可以#2.2').spoken = '' }, 9, 'zh 可以 without its spoken line'),
      mut('th', ls => { L(ls, 'พอ#1.2').ph = L(ls, 'พอ#1.2').ph.replace('láaeo', 'lâeo') }, 9, 'th แล้ว with the falling tone'),
      mut('ja', ls => { L(ls, '行く#1.1').cue = 'Ask Kenji if he is going anywhere tomorrow.' }, 7, 'ja speaker told to address himself'),
      mut('ja', ls => { L(ls, '分かる#2.1').cue = L(ls, '行く#1.1').cue }, 4, 'ja the same cue for two different answers'),
      mut('ja', ls => { const l = L(ls, '行く#1.1'); l.text = 'はい、明日行く？'; l.reading = 'はい、あしたいく？'; l.romaji = 'hai, ashita iku?' }, 7, 'ja はい to a friend'),
      mut('th', ls => { const l = L(ls, 'หลัง#1.1'); l.text = l.text.replace('ครับ', 'ค่ะ') }, 7, 'th the man uses ค่ะ'),
      mut('zh', ls => { const a = L(ls, '等#1.2'), b = L(ls, '等#3.1'); b.text = a.text; b.pinyin = a.pinyin; b.spoken = a.spoken }, 8, 'zh two recalls with the same frame'),
      mut('th', ls => { const l = L(ls, 'หลัง#2.2'); l.text = 'บ้านหลังนี้ใหญ่ค่ะ' }, 1, 'th หลัง as a house classifier'),
      mut('ja', ls => { const l = L(ls, '分かる#2.1'); l.text = 'うん、日本語、分かる？'; l.reading = 'うん、にほんご、わかる？'; l.romaji = 'un, nihongo, wakaru?' }, 10, 'ja an exchange opening with a reply'),
      mut('zh', ls => { const l = L(ls, '等#3.2'); l.text = '你等谁？'; l.pinyin = 'nǐ děng shéi?'; l.spoken = '' }, 10, 'zh an exchange ending on an unanswered question'),
      mut('zh', ls => { const l = L(ls, '回#3.1'); l.text = '我要回去拿我的东西，好吗？' }, 11, 'zh too long for Mukyu'),
      mut('zh', ls => { const l = L(ls, '什么#1.2'); l.text = '我要喝水。'; l.pinyin = 'wǒ yào hē shuǐ.' }, 12, 'zh an untaught word (水)'),
      mut('ja', ls => { L(ls, '好き#1.1').purpose = '' }, 6, 'ja an exercise with no planned purpose'),
    ]
    const missed = ms.filter(m => !m.ok).map(m => m.label + ' → ' + JSON.stringify(m.gate.perLine.filter(p => !p.pass).map(p => p.id + Object.keys(p.fails))))
    T('G2', 'each criterion fails on its own defect and blocks READY (' + ms.length + ' mutations: pronunciation ×3, speaker/register ×3, cue, distinct, sense, coherence ×2, complexity, closed vocabulary, intent)', !missed.length, missed)
    {
      const { g, lines } = refLesson('ja'); V.passAllJudge(c, lines); delete lines[3]._judge
      const g1 = c.v684FinalGate('ja', lines, g.ctx)
      V.passAllJudge(c, lines); lines[5].text = lines[5].text + 'よ'
      const g2 = c.v684FinalGate('ja', lines, g.ctx)
      V.passAllJudge(c, lines); c.v684JudgeApply([lines[7]], { items: [{ id: lines[7].id, sense: true, grammar: true, natural: false, cue: true, meaning: true, intent: true, distinct: true, coherence: true, note: 'odd to say to a friend' }] })
      const g3 = c.v684FinalGate('ja', lines, g.ctx)
      T('G3', 'fail-closed: a line with no verdict is not READY; a line changed after judging loses its verdict; a judge "natural = false" fails naturalness',
        !g1.ready && g1.perLine[3].fails[3] && !g2.ready && /no judge verdict/.test(JSON.stringify(g2.perLine[5].fails)) && !g3.ready && /odd to say/.test(JSON.stringify(g3.perLine[7].fails[3])))
      V.passAllJudge(c, lines)
      const g4 = c.v684FinalGate('ja', lines, g.ctx)
      T('G4', 'seven separate scores (technical, correctness, naturalness, meaning/cue, usefulness, coherence, pronunciation), each a count of exercises — no single "100% quality"',
        Object.keys(g4.scores).join(',') === 'technical,correctness,naturalness,meaningCue,usefulness,coherence,pronunciation' && Object.values(g4.scores).every(s => s.total === 15) && typeof g4.fingerprint === 'string')
    }
  }
  // ══ E — the pipeline with a scripted stand-in model ═══════════════════════════════════════════════════════════════
  {
    const run = async (lang, opts) => {
      const g = V.gateContext(c, lang + '-daily-2026-10-12', REF[lang].map(t => t.target.surface)), eng = scriptedEngine(lang, REF, opts), log = []
      const res = await c.v684DailyLesson({ lang, vocab: g.vocab, targets: g.targets, inventoryTargets: g.allTargets, onLog: m => log.push(m), engine: eng.ask })
      return { res, eng, log }
    }
    for (const lang of ['ja', 'zh', 'th']) {
      const { res } = await run(lang)
      const calls = Object.values(res.calls).reduce((a, b) => a + b, 0)
      T('E1' + lang, lang + ': plan → generate → pronunciation by rule → final gate: READY, 15/15 recalls, ' + calls + ' requests (1 plan, 3 generate, 3 judge)', res.status === 'READY' && res.gate.targetLines === 15 && calls === 7, { status: res.status, calls: res.calls, reasons: res.gate.reasons })
    }
    // targeted repair: one bad line → a DIFFERENT function, only that line regenerated, the rest byte-identical
    {
      const good = await run('ja')
      const rep = await run('ja', { badLines: ['行く#1'], badText: () => 'はい、明日、どこか行くよ。', repair: p => /REWRITE THIS LINE/.test(p) ? { purpose: 'Kenji asks his friend whether she is going anywhere tomorrow', text: '明日、どこか行く？', english: 'Are you going anywhere tomorrow?', cue: 'Ask your friend if they are going anywhere tomorrow.' } : null })
      const fixed = rep.res.lesson.find(l => l.target && l.target.surface === '行く' && l.text === '明日、どこか行く？')
      const others = rep.res.lesson.filter(l => l !== fixed).map(l => l.text).join('|') === good.res.lesson.filter(l => !(l.target && l.target.surface === '行く' && l.text === '明日、どこか行く？')).map(l => l.text).join('|')
      const rp = rep.eng.sent.find(s => s.stage === 'V684_repair')
      const firstFn = good.res.lesson.find(l => l.text === '明日、どこか行く？').target.functionId
      T('E2', 'targeted repair: the failing line gets a different function and is regenerated alone; every accepted line is preserved; its exchange is re-judged; READY',
        rep.res.status === 'READY' && fixed && fixed.target.functionId !== firstFn && others && rp && /はい \/ いいえ to a friend|speaker \/ register/.test(rp.prompt) && rep.res.calls.V684_repair === 1 && rep.res.calls.V684_judge === 4,
        { status: rep.res.status, calls: rep.res.calls, fn: fixed && fixed.target.functionId, firstFn, reasons: rep.res.gate.reasons })
    }
    // honest stop: the repair never succeeds → DRAFT naming the line; no prompt was ever sent twice
    {
      const r = await run('zh', { badLines: ['等#1'], badText: () => '等我一下，我要喝水！', repair: () => ({ purpose: 'he asks his friend to wait while he buys water now', text: '等我，我要喝水！', english: 'Wait, I want water!', cue: 'Ask your friend to wait because you want water.' }) })
      const hashes = r.eng.sent.map(s => s.prompt), uniq = new Set(hashes).size === hashes.length
      T('E3', 'honest stop: when repair cannot meet the contract (two different functions tried) the lesson stays a DRAFT, the reasons name the line, no prompt is ever sent twice',
        r.res.status === 'DRAFT' && /closed vocabulary/.test(r.res.gate.reasons.join(' ')) && uniq && r.res.calls.V684_repair === 2, { status: r.res.status, calls: r.res.calls, uniq, reasons: r.res.gate.reasons })
    }
    // pronunciation is never the model's word: a wrong model reading is replaced by the dictionary reading, no repair request
    {
      const r = await run('ja', { badLines: [], planMutate: null })
      const eng2 = scriptedEngine('ja', JSON.parse(JSON.stringify(REF).replace('"reading":"ばすはあそこです。"', '"reading":"ばすわあそこでした。"')))
      const g = V.gateContext(c, 'ja-daily-2026-10-12', REF.ja.map(t => t.target.surface))
      const res2 = await c.v684DailyLesson({ lang: 'ja', vocab: g.vocab, targets: g.targets, inventoryTargets: g.allTargets, onLog: () => {}, engine: eng2.ask })
      const l = res2.lesson.find(x => x.text === 'バスはあそこです。')
      T('E4', 'a wrong reading from the model is replaced by the dictionary-derived one before the gate (no model call); READY',
        res2.status === 'READY' && l && c.v684JaHira(l.reading) === 'ばすはあそこです。' && l._pronSource === 'dictionary' && !res2.calls.V684_repair && r.res.status === 'READY', { status: res2.status, reading: l && l.reading, src: l && l._pronSource })
    }
    {
      const L = c.v684Ledger(async () => ({ ok: 1 }), () => {})
      await L.call('V684_plan', 'same prompt')
      let refused = false; try { await L.call('V684_plan', 'same prompt') } catch (e) { refused = !!e.v684Identical }
      T('E5', 'a prompt identical to one already sent is refused (no blind retries)', refused)
    }
    {
      const r = await run('th', { judgeSkip: ['x2.2'] })
      T('E6', 'a line the judge never returned a verdict for keeps the lesson from READY (fail-closed), after bounded repair', r.res.status === 'DRAFT' && /x2\.2/.test(r.res.gate.reasons.join(' ')), { status: r.res.status, reasons: r.res.gate.reasons })
    }
  }
  // ══ X — production isolation ══════════════════════════════════════════════════════════════════════════════════════
  {
    const blk = SRC.slice(SRC.indexOf('// TT_V684_BEGIN'), SRC.indexOf('// TT_V684_END'))
    const outside = SRC.replace(blk, '')
    const uses = [...outside.matchAll(/\bv684[A-Z][A-Za-z]*\(/g)].map(m => m[0])
    T('X1', 'nothing outside the v684 block calls it except the bench pipeline \'v684\' (v684DailyLesson / v684ToTrack inside ttBenchRunFixture) and, from Oct13, the two deterministic readers (Japanese final romaji, Mandarin syllables)',
      // Oct13: two production uses by design — the final Japanese romaji (jaFinalRomaji → v684JaDerive) and the per-syllable Mandarin
      // tone sandhi (mandarinSpokenPinyin → v684ZhSyllables); both are deterministic readers, no switch or storage of the v684 block
      uses.length && uses.every(u => /^(v684DailyLesson|v684ToTrack|v684JaDerive|v684ZhSyllables)\($/.test(u)) && /o\.pipeline === 'v684' && fx\.trackType === 'daily'/.test(outside) &&
        uses.filter(u => u === 'v684JaDerive(').length === 1 && uses.filter(u => u === 'v684ZhSyllables(').length === 1 && /const d = bank \? v684JaDerive\(q\.japanese, bank(, \{ wordJoin: true \})?\) : null/.test(outside) && /try \{ ss = v684ZhSyllables\(m\[1\]\) \}/.test(outside), uses)
    T('X2', 'the experimental switches stay off by default (TEACHING_PLAN_ACTIVE = false; Gen2 disabled); no storage write in the v684 block',
      /let TEACHING_PLAN_ACTIVE = false/.test(SRC) && !/localStorage|setItem|saveVocab|persist/i.test(blk) && c.ev('teachingPlanOn()') === false)
  }
  console.log(out.join('\n'))
  console.log('\n' + (n - fails) + '/' + n + ' passed' + (fails ? ' · ' + fails + ' FAILED' : ''))
  process.exitCode = fails ? 1 : 0
})()
