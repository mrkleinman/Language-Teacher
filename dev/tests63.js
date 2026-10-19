// v704 — Thai Daily quality round from the independent review of the relay track on the owner's profile (6.5/10):
//   R   romanisation: unaspirated ป ต ก spelled bp dt g everywhere; the reviewed tone corrections are in the dictionary
//   N   นะค่ะ → นะคะ in the finished track
//   L   deterministic sense rules: ไป + รถ… (by vehicle) and บางที inside a ไหม question
//   W   the writer and the native-speaker reviewer both carry the v704 naturalness / coherence guidance
// Real app code; no provider calls.
//   node tests63.js            (current build: tt.compiled.js, or TT_FILE)
'use strict'
const { load } = require('./harness')
const out = []; let fails = 0, n = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + String(id).padEnd(4) + ' ' + name + (!pass && detail !== undefined ? '\n      ' + JSON.stringify(detail).slice(0, 600) : '')) }
const FILE = process.env.TT_FILE || 'tt.compiled.js'

;(async () => {
  const c = load(FILE, { realBelt: true }); c.console.info = () => {}; c.console.warn = () => {}
  const RAW = c.ev('RAW_VOCAB'), ph = t => (RAW.find(d => d.t === t && !d.dup) || {}).ph
  const bare = (re, letters) => RAW.filter(d => d.ph && letters.test(d.t) && re.test(d.ph)).map(d => d.t + ' ' + d.ph)
  const bp = bare(/(^|[-\s])[pt](?!h)/, /[ปตฏ]/), g = bare(/(^|[-\s])k(?!h)/, /ก/)
  T('R1', 'no dictionary entry spelled with ป / ต writes a bare syllable-initial p / t (ไป bpai, ตัว dtua)', !bp.length, bp.slice(0, 10))
  T('R2', 'no dictionary entry spelled with ก writes a bare syllable-initial k (กัน gan, กลับ glàp)', !g.length, g.slice(0, 10))
  const want = { 'ไป': 'bpai', 'ตัว': 'dtua', 'กัน': 'gan', 'แล้ว': 'láaeo', 'ใช้': 'chái', 'โกรธ': 'gròot', 'ร้านอาหาร': 'ráan-aa-hǎan', 'ตึก': 'dtʉ̀k' }
  const wrong = Object.entries(want).filter(([t, p]) => ph(t) !== p).map(([t, p]) => t + ' ' + ph(t) + ' (want ' + p + ')')
  T('R3', 'reviewed spellings in the dictionary: ไป bpai · ตัว dtua · กัน gan · แล้ว láaeo · ใช้ chái · โกรธ gròot · ร้านอาหาร ráan- · ตึก low tone', !wrong.length, wrong)
  const asp = ['พี่', 'ถูก', 'คน'].filter(t => /^(bp|dt|g)/.test(ph(t) || ''))
  T('R4', 'aspirated letters keep ph / th / kh (พี่, ถูก, คน untouched)', !asp.length, asp)

  const fixed = c.thaiFixParticleSpelling([{ thai: 'ไปก่อนนะค่ะ', text: 'ไปก่อนนะค่ะ' }, { thai: 'ได้ค่ะ' }], null)
  T('N1', 'นะค่ะ is corrected to นะคะ (text kept in step); a plain ค่ะ is untouched', fixed[0].thai === 'ไปก่อนนะคะ' && fixed[0].text === 'ไปก่อนนะคะ' && fixed[1].thai === 'ได้ค่ะ', fixed)

  const ids = th => c.thaiLexicalSenseProblems({ thai: th, english: '' }, '').map(x => x.id)
  T('L1', 'ไป + รถ… (เราไปรถสีเหลืองไหมครับ) is named COLLOCATION_VEHICLE_GO; นั่งรถสีเหลืองไปไหม / ไปขึ้นรถ / ไปรถติด are not',
    ids('เราไปรถสีเหลืองไหมครับ').includes('COLLOCATION_VEHICLE_GO') && !ids('นั่งรถสีเหลืองไปไหมครับ').includes('COLLOCATION_VEHICLE_GO') &&
    !ids('เราไปขึ้นรถกันครับ').includes('COLLOCATION_VEHICLE_GO') && !ids('ถนนนี้ไปรถติดมากครับ').includes('COLLOCATION_VEHICLE_GO'))
  T('L2', 'บางทีคุณตื่นสายไหมคะ is named BANGTHII_QUESTION; บางทีคุณก็ตื่นสายใช่ไหมคะ, คุณตื่นสายบ่อยไหมคะ and the statement บางทีผมก็ตื่นสายครับ are not',
    ids('บางทีคุณตื่นสายไหมคะ').includes('BANGTHII_QUESTION') && !ids('บางทีคุณก็ตื่นสายใช่ไหมคะ').includes('BANGTHII_QUESTION') &&
    !ids('คุณตื่นสายบ่อยไหมคะ').includes('BANGTHII_QUESTION') && !ids('บางทีผมก็ตื่นสายครับ').includes('BANGTHII_QUESTION'))

  const role = t => { const d = RAW.find(x => x.t === t && !x.dup); return c.targetLinguisticRole({ thai: d.t, english: d.e }, 'th') }
  const roles = { 'ทางออก': 'NOUN', 'เครื่องดื่ม': 'NOUN', 'บัตรเครดิต': 'NOUN', 'ห้องน้ำ': 'NOUN', 'กิน': 'VERB', 'สวย': 'STATE/ADJECTIVE' }
  const rb = Object.entries(roles).filter(([t, r]) => role(t) !== r).map(([t, r]) => t + ' ' + role(t) + ' (want ' + r + ')')
  T('L3', 'target role: a Thai compound on a noun head is a NOUN whatever its gloss (ทางออก "exit", เครื่องดื่ม "drink"); verbs and adjectives unchanged', !rb.length, rb)

  const NW = c.ev('THAI_NUMBER_WORDS'), self = t => { const d = RAW.find(x => x.t === t && !x.dup); return c.thaiIsNumberTarget({ thai: d.t, english: d.e }) || NW.includes(d.t) }
  const srcL4 = require('fs').readFileSync('tt.jsx', 'utf8')
  T('L4', 'a target that IS a number (ศูนย์, พัน, ครึ่ง) gets no extra random "MANDATORY NUMBER" (both generators guard it); สัปดาห์ still may',
    ['ศูนย์', 'พัน', 'ครึ่ง'].every(self) && !self('สัปดาห์') && /_skipNumber \|\| _selfNumber \|\| !exerciseRequiresNumber\(target\)/.test(srcL4) &&
    /exerciseRequiresNumber\(target\) && !\(dailyV693On\(\) && \(thaiIsNumberTarget\(target\)/.test(srcL4))

  const hints = [0, 2, 4, 6].map(i => c.randomNumberHint(c.initVocab(), i))
  T('L5', 'the number hint for other number-practising words is an example the writer may replace, never a MANDATORY order, and must agree with numbers already said',
    hints.every(h => /use another number if it fits better/.test(h) && /agree with any number already said/.test(h) && !/MANDATORY/.test(h)), hints)

  T('L6', 'แล้วไหม (an already / yet question) is ALREADY_QUESTION and ไม่ทุกวัน is NOT_EVERY_DAY; แล้วหรือยัง and ไม่ใช่ทุกวัน are not',
    ids('รถมาถึงป้ายรถเมล์แล้วไหมคะ').includes('ALREADY_QUESTION') && !ids('รถเมล์มาแล้วหรือยังคะ').includes('ALREADY_QUESTION') &&
    ids('ไม่ทุกวันแต่วันหยุดมีหลายคนครับ').includes('NOT_EVERY_DAY') && !ids('ไม่ใช่ทุกวันครับ').includes('NOT_EVERY_DAY'))
  T('L7', 'ครึ่งพัน ("half a thousand") is HALF_THOUSAND; ห้าร้อยบาท and ครึ่งราคา are not', ids('ครึ่งพันก็ถูกครับ').includes('HALF_THOUSAND') && !ids('ห้าร้อยบาทครับ').includes('HALF_THOUSAND') && !ids('ลดครึ่งราคาครับ').includes('HALF_THOUSAND'))
  const ft = c.thaiFramingTidy([
    { _target: 'greeting', speaker: 'A', thai: 'สวัสดีครับ นิดา วันนี้เป็นยังไงบ้างครับ', english: 'Hello Nida, how are you today', prompt: 'Greet Nida and ask how she is doing today.' },
    { _target: 'parting', speaker: 'A', thai: 'แล้วเจอกันนะครับคุณนิดา', english: 'See you later, Nida.', prompt: 'Say goodbye to Nida' },
    { _target: 'parting', speaker: 'B', thai: 'ขอบคุณ คุณก็เหมือนกันค่ะ', english: 'Thanks, you too', prompt: 'Thank Somchai (สมชาย) and say you wish Somchai (สมชาย) the same.' }], null)
  T('F1', 'framing tidy: Thai names in brackets leave the cue; framing English and cues end with punctuation; a "you too" reply to a replaced "see you" closing becomes แล้วเจอกันค่ะ',
    ft[0].english === 'Hello Nida, how are you today.' && ft[1].prompt === 'Say goodbye to Nida.' && ft[2].thai === 'แล้วเจอกันค่ะ' && ft[2].english === 'See you.' && !/[\u0E00-\u0E7F]/.test(ft[2].prompt), ft)
  const ft2 = c.thaiFramingTidy([{ _target: 'parting', speaker: 'A', thai: 'ขอให้มีความสุขนะครับ แล้วเจอกัน', english: 'Be happy. See you.', prompt: 'Wish her well.' }, { _target: 'parting', speaker: 'B', thai: 'ขอบคุณ คุณก็เหมือนกันค่ะ', english: 'Thanks, you too.', prompt: 'Thank him and wish him the same.' }], null)
  T('F2', 'a "you too" reply to a real wish (ขอให้…) is kept', ft2[1].thai === 'ขอบคุณ คุณก็เหมือนกันค่ะ')
  const pu = c.thaiFramingTidy([{ _target: 'parting', speaker: 'A', thai: 'เดินทางปลอดภัยนะครับ', english: 'Have a safe trip', prompt: 'Wish her a safe trip.' },
    { speaker: 'A', thai: 'ผมมาถึงป้ายรถเมล์แล้วครับ', english: 'I have already reached the bus stop', prompt: 'Say you have reached the bus stop.', targetId: 1 },
    { speaker: 'B', thai: 'ทางออกนั้นไกลไหมคะ', english: 'Is that exit far', prompt: 'Ask if that exit is far.', targetId: 2 }], null)
  T('F3', 'every line\'s English ends with punctuation, a question decided by the Thai ("Have a safe trip." not "?"; "Is that exit far?")',
    pu[0].english === 'Have a safe trip.' && pu[1].english === 'I have already reached the bus stop.' && pu[2].english === 'Is that exit far?', pu.map(p => p.english))
  const src2 = require('fs').readFileSync('tt.jsx', 'utf8')
  T('X1', 'writer: the three lines are ONE exchange (LINE 3 answers LINE 2, roles straight, no contradiction, แล้วหรือยัง) and a line only fills a slot of its own speaker (A-B-A)',
    /EXCHANGE \(overrides the plan above when they clash\)/.test(src2) && /LINE 3 ANSWERS LINE 2/.test(src2) && /const _slotSp = x => x === 2 \? 'B' : 'A'/.test(src2) && /_unfilled\(\)\.find\(x => _open\.has\(x\) && _spOk\(x\)\)/.test(src2))
  const tones = { 'ต้อง': 'dtâawng', 'ไม่ต้อง': 'mâi-dtâawng', 'ห้าทุ่ม': 'hâa-thûm', 'จริงเหรอ': 'jing-rǒoe', 'เริ่ม': 'rôoem', 'ทะเล': 'thá-lee', 'ยำทะเล': 'yam-thá-lee' }
  const tw = Object.entries(tones).filter(([t, p]) => ph(t) !== p).map(([t, p]) => t + ' ' + ph(t))
  T('R5', 'reviewed spellings: ต้อง dtâawng (long) · ห้าทุ่ม hâa-thûm · จริงเหรอ jing-rǒoe · เริ่ม rôoem (long vowels long) · ทะเล thá-lee (and its compounds)', !tw.length, tw)

  const disp = t => c.loadCanonicalThaiPhonetic(ph(t), t)
  T('R6', 'long ɔɔ / əə display long like the app\'s own spellings: ชอบ châawp · ตอบ dtàawp · เงิน ngooen; short ก็ gâw and the owner\'s หน่อย nòi unchanged',
    disp('ชอบ') === 'châawp' && disp('ตอบ') === 'dtàawp' && disp('เงิน') === 'ngooen' && disp('ก็') === 'gâw' && disp('หน่อย') === 'nòi', ['ชอบ', 'ตอบ', 'เงิน', 'ก็', 'หน่อย'].map(disp))
  // v704 (blind review of relay run 5)
  { const lex = c.buildThaiPhoneticLexicon([]), comp = th => c.composeThaiPhonetic(th, lex).phonetic
    const got = { 'เพิ่ง': disp('เพิ่ง'), 'รถบัส': disp('รถบัส'), 'ได้ยิน': disp('ได้ยิน'), 'ผมไม่ได้ยินครับ': comp('ผมไม่ได้ยินครับ'), 'สวัสดีครับ': comp('สวัสดีครับ'),
      'แล้วคุณล่ะคะ': comp('แล้วคุณล่ะคะ'), 'ผมไม่มีช้อนครับ': comp('ผมไม่มีช้อนครับ'), 'เดินทางปลอดภัยนะครับ': comp('เดินทางปลอดภัยนะครับ'), 'ก๋วยเตี๋ยว': disp('ก๋วยเตี๋ยว'), 'ครอบครัว': disp('ครอบครัว'), 'เสียง': disp('เสียง') }
    const want = { 'เพิ่ง': 'phôeng', 'รถบัส': 'rót-bát', 'ได้ยิน': 'dâi-yin', 'ผมไม่ได้ยินครับ': 'phǒm mâi dâi-yin khráp', 'สวัสดีครับ': 'sà-wàt-dii khráp',
      'แล้วคุณล่ะคะ': 'láaeo khun lâ khá', 'ผมไม่มีช้อนครับ': 'phǒm mâi mii cháawn khráp', 'เดินทางปลอดภัยนะครับ': 'dooen-thaang bplàawt-phai ná khráp', 'ก๋วยเตี๋ยว': 'gǔai-dtǐao', 'ครอบครัว': 'khrâawp-khrua', 'เสียง': 'sǐang' }
    const bad = Object.keys(want).filter(k => String(got[k]).normalize('NFC') !== want[k].normalize('NFC'))
    T('R7', 'reviewed spellings: เพิ่ง phôeng · รถบัส rót-bát · ได้ยิน dâi-yin; a hyphen joins one word only (sà-wàt-dii khráp, mâi mii); diphthongs one way (gǔai-dtǐao, khrua, sǐang)', !bad.length, bad.map(k => k + ' → ' + got[k])) }
  { const p1 = { speaker: 'A', thai: 'ขอบคุณครับ ตอนนี้ผมมีช้อนแล้วครับ', english: 'Thanks, now I have a spoon.', prompt: 'Say thanks, now you have a spoon.' }
    const p2 = { speaker: 'B', thai: 'บ้านที่คุณเช่าใหญ่ไหมคะ', english: 'Is the house you rent big?', prompt: 'Ask if the house you rent is big.' }
    const p3 = { speaker: 'B', thai: 'ขอบคุณ สมชาย วันศุกร์หน้าเจอกันค่ะ', english: 'Thank you, Somchai, see you next Friday.', prompt: 'Thank Somchai and say you will see Somchai next Friday.' }
    const cl1 = c.cueClarify('th', p1, { addr: 'f', names: ['Somchai', 'Nida'] }).cue
    const l2 = c.thaiFinalCueLint(p2, { addr: 'm', addrName: 'Somchai', names: ['Somchai', 'Nida'] }).cue
    const l3 = c.thaiFinalCueLint(p3, { addr: 'm', addrName: 'Somchai', names: ['Somchai', 'Nida'] }).cue
    const lf = c.ev('ccLowerFirst')("Here's a spoon", [])
    T('C1', 'cue wording: "Say thanks, …" is not read as narration (was "Thank now you have a spoon."); a rebuilt "you rent" agrees as "he rents"; "say you will see Somchai" is the learner, not a leak; "Here\'s" is lowered after Say',
      cl1 === 'Say thanks, now you have a spoon.' && l2 === 'Ask if the house he rents is big.' && l3 === p3.prompt && lf === "here's a spoon", { cl1, l2, l3, lf }) }
  const ex = (id, r, sp) => ({ targetId: id, recallIndex: r, speaker: sp, thai: 'x' + id + r, english: 'e', prompt: 'p', wordId: id, _target: 't' + id, targetSurface: 't' + id })
  const ord = c.thaiOrderExchanges([{ _target: 'greeting', speaker: 'A', thai: 'สวัสดีครับ' }, ex(1, 3, 'A'), ex(1, 1, 'A'), ex(1, 2, 'B'), ex(2, 1, 'A'), ex(2, 2, 'B'), ex(2, 3, 'A')], null)
  const keep = c.thaiOrderExchanges([ex(3, 2, 'B'), ex(3, 1, 'A'), ex(3, 3, 'B')], null)
  T('X3', 'a block that already alternates (B-A-B from quota recovery) is never reshuffled by recall number', keep.map(p => p.recallIndex).join('') === '213', keep.map(p => p.recallIndex))
  T('X2', 'each word block is put back in recall order (3-1-2 → 1-2-3, A-B-A); ordered blocks and framing lines are untouched',
    ord.slice(1, 4).map(p => p.recallIndex).join('') === '123' && ord.slice(1, 4).map(p => p.speaker).join('') === 'ABA' && ord.slice(4).map(p => p.recallIndex).join('') === '123' && ord[0]._target === 'greeting', ord.map(p => p.recallIndex))

  { const v = c.initVocab(), W = t => v.find(x => x.thai === t)
    ;['ช้อน', 'น้ำตาล', 'ผม', 'ไม่', 'มี', 'อยู่', 'ไหน', 'ที่ไหน', 'ที่นี่', 'เอา', 'ให้', 'งั้น', 'มา', 'หน่อย'].forEach(t => { const w = W(t); if (w) Object.assign(w, { status: 'learning', introducedAt: '2026-08-01', repCount: 3 }) })
    const a = W('ช้อน'), b = W('น้ำตาล'), P = (id, surf, r, sp, th) => ({ targetId: id, wordId: id, targetSurface: surf, recallIndex: r, speaker: sp, thai: th, english: 'e', prompt: 'p', isTargetPair: true, pairId: 'x' + id + r, _semCue: { s: 5 } })
    const tr = { pairs: [P(a.id, 'ช้อน', 1, 'A', 'ผมไม่มีช้อนครับ'), P(a.id, 'ช้อน', 2, 'B', 'ช้อนอยู่ไหนคะ'), P(a.id, 'ช้อน', 3, 'A', 'ผมเอาช้อนมาให้นะครับ'), P(b.id, 'น้ำตาล', 1, 'A', 'น้ำตาลอยู่ที่ไหนครับ'), P(b.id, 'น้ำตาล', 2, 'B', 'น้ำตาลอยู่ที่นี่ค่ะ'), P(b.id, 'น้ำตาล', 3, 'A', 'งั้นเอาน้ำตาลมาหน่อยครับ')],
      keywords: [{ wordId: a.id, thai: 'ช้อน' }, { wordId: b.id, thai: 'น้ำตาล' }], scenePlan: { scenes: [{ sceneId: 'S1', purpose: 'eating', localPremise: 'at a stall', targetIds: [a.id, b.id] }] } }
    // Expectation changed in v704 (relay run 5): a scene whose edits were refused gets ONE follow-up request naming each refused edit
    // and why (four of the polisher's fixes were refused in run 5 and the contradictions stayed). So: 2 requests here (the first
    // reply has two refused edits), the retry's valid fix of L5 is applied, and the retry's repeat of the bad L3 is refused again.
    let calls = 0, retryPrompt = ''
    c.mockGeminiGenerate = async (k, m, msgs) => { calls++
      if (calls === 2) { retryPrompt = msgs[0].content; return JSON.stringify({ lines: [{ n: 3, thai: 'เดี๋ยวฉันเอาช้อนมาให้นะคะ', english: 'x', cue: 'y' }, { n: 5, thai: 'มีน้ำตาลค่ะ', english: 'There is sugar.', cue: 'Say there is sugar.' }] }) }
      return JSON.stringify({ lines: [{ n: 3, thai: 'เดี๋ยวฉันเอาช้อนมาให้นะคะ', english: 'x', cue: 'y' }, { n: 5, thai: 'อยู่ที่นี่ค่ะ', english: 'x', cue: 'y' }, { n: 6, thai: 'ผมไม่เอาน้ำตาลครับ', english: "I don't want sugar.", cue: "Say you don't want sugar." }] }) }
    const r = await c.thaiScenePolish(tr, { apiKey: 'AIzaSyTEST-harness-key-000000', model: c.ev('GEMINI_DEFAULT_MODEL'), vocab: v }, null)
    T('S1', 'scene polish: one request per mini-scene (+ one follow-up only for refused edits); a valid edit replaces the line and drops its old verdicts; an edit with the wrong speaker particle / untaught words / no target is refused and the original kept',
      calls === 2 && /REFUSED/.test(retryPrompt) && /L5: อยู่ที่นี่ค่ะ — refused: target น้ำตาล missing/.test(retryPrompt) && r.changed === 2 &&
      r.pairs[5].thai === 'ผมไม่เอาน้ำตาลครับ' && r.pairs[5]._semCue === undefined && r.pairs[5]._scenePolishedFrom === 'งั้นเอาน้ำตาลมาหน่อยครับ' &&
      r.pairs[2].thai === 'ผมเอาช้อนมาให้นะครับ' && r.pairs[4].thai === 'มีน้ำตาลค่ะ' && r.rejected.length === 1, { calls, changed: r.changed, rejected: r.rejected, th: r.pairs.map(p => p.thai) })
    // v704 — framing lines join the first / last scene (no target needed); a word whose three lines share one phrase is named
    const fr = (sp, th, tg) => ({ speaker: sp, thai: th, english: 'e', prompt: 'p', _target: tg, pairType: 'framing', _framing: true })
    const tr2 = { ...tr, pairs: [fr('A', 'สวัสดีครับ', 'greeting')].concat(tr.pairs, [fr('B', 'แล้วเจอกันค่ะ', 'parting')]) }
    let p2 = '', calls2 = 0
    c.mockGeminiGenerate = async (k, m, msgs) => { calls2++; p2 = msgs[0].content; return JSON.stringify({ lines: [{ n: 'C1', thai: 'มีช้อนไหมคะ', english: 'Is there a spoon?', cue: 'Ask if there is a spoon.' }] }) }
    const r2 = await c.thaiScenePolish(tr2, { apiKey: 'AIzaSyTEST-harness-key-000000', model: c.ev('GEMINI_DEFAULT_MODEL'), vocab: v }, null)
    const same = c.thaiSamePhraseTargets([{ pair: { targetSurface: 'สีเหลือง', thai: 'รถบัสสีเหลืองออกแล้วครับ' } }, { pair: { targetSurface: 'สีเหลือง', thai: 'รถบัสสีเหลืองมาไหมคะ' } }, { pair: { targetSurface: 'สีเหลือง', thai: 'ผมชอบรถบัสสีเหลืองครับ' } }])
    T('S2', 'scene polish sees the opening / closing framing lines (O1 … C1, no target) with the scene they belong to, and names a word whose three lines repeat one phrase (VARY: รถบัสสีเหลือง)',
      /O1 A \[opening line, no target\]: สวัสดีครับ/.test(p2) && /C1 B \[closing line, no target\]: แล้วเจอกันค่ะ/.test(p2) && calls2 === 1 && r2.pairs[r2.pairs.length - 1].thai === 'มีช้อนไหมคะ' &&
      same.length === 1 && same[0][1] === 'รถบัสสีเหลือง', { calls2, same, rej: r2.rejected, last: r2.pairs[r2.pairs.length - 1].thai }) }

  const guide = c.ev('THAI_NATURALNESS_GUIDE_V701')
  const keys = ['ฉันนึกว่าพันบาทค่ะ', 'เสื้อตัวนี้', 'บางทีผมอาจจะอยู่บ้านครับ', 'ให้ผมช่วยถือไหมครับ', 'ไม่ใช่ทุกวัน', 'ค่าเช่า', 'ที่ป้ายรถเมล์ร้อนมากเลยครับ', 'เดี๋ยวผมเอาช้อนมาให้นะครับ', 'ถ้าถูกก็ซื้อครับ', 'ศูนย์ครับ ไม่ใช่สอง', 'บางที', 'ร้านอาหาร is a restaurant', 'facts stay true for the whole lesson']
  T('W1', 'the shared Thai guide carries the v704 lessons (word order, offers, conditionals, corrections, บางที, ร้านอาหาร, answers and facts that stay true)', keys.every(k => guide.includes(k)), keys.filter(k => !guide.includes(k)))
  const src = require('fs').readFileSync('tt.jsx', 'utf8')
  const uses = (src.match(/THAI_NATURALNESS_GUIDE \+ \(dailyV693On\(\) \? THAI_NATURALNESS_GUIDE_V701/g) || []).length + (src.match(/\+ \(dailyV693On\(\) \? THAI_NATURALNESS_GUIDE_V701 : ''\) \+ '\\n'/g) || []).length
  T('W2', 'both the writer prompt and the native-speaker reviewer include that guide (one standard for both)', uses >= 2, uses)

  out.forEach(l => console.log(l))
  console.log('\nv704 Thai Daily quality round: ' + (n - fails) + '/' + n + ' passed' + (fails ? ' — ' + fails + ' FAILED' : ''))
  process.exit(fails ? 1 : 0)
})().catch(e => { out.forEach(l => console.log(l)); console.error(e); process.exit(1) })
