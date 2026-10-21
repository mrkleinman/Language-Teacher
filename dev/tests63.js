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
  // v704 (blind review of relay run 6)
  { const W = ['งั้นคุณตื่นเวลาไหนคะ', 'งั้นเริ่มกินเวลาไหนดีคะ'], Wok = ['เวลาไหนก็ได้ค่ะ', 'ตื่นกี่โมงคะ']
    const Y = ['น้ำตาลบนโต๊ะครับ', 'ช้อนในกระเป๋าค่ะ'], Yok = ['น้ำตาลอยู่บนโต๊ะครับ', 'ผมวางช้อนบนโต๊ะครับ', 'มีน้ำบนโต๊ะค่ะ', 'เอาน้ำใส่ในแก้วครับ']
    T('L8', '"what time?" asked with เวลาไหน is WHAT_TIME_WHICH (กี่โมง); a location without อยู่ (น้ำตาลบนโต๊ะครับ) is LOCATION_NO_YUU; เวลาไหนก็ได้, อยู่บนโต๊ะ, วาง / มี / ใส่ … บนโต๊ะ are not flagged',
      W.every(t => ids(t).includes('WHAT_TIME_WHICH')) && Wok.every(t => !ids(t).includes('WHAT_TIME_WHICH')) && Y.every(t => ids(t).includes('LOCATION_NO_YUU')) && Yok.every(t => !ids(t).includes('LOCATION_NO_YUU')),
      W.concat(Wok, Y, Yok).map(t => t + ':' + ids(t).join(','))) }
  T('L9', 'มีคนหลายคน is MANY_PEOPLE_LAAI (คนเยอะ); a per-unit price without ละ (ค่าเช่าเดือนพันบาท) is PER_UNIT_LA; เดือนละพันบาท, หลายคนชอบ and สองคนครับ are not flagged',
    ids('ตรงทางออกมีคนหลายคนครับ').includes('MANY_PEOPLE_LAAI') && !ids('หลายคนชอบร้านนี้ครับ').includes('MANY_PEOPLE_LAAI') && ids('ค่าเช่าเดือนพันบาทครับ').includes('PER_UNIT_LA') &&
    !ids('ค่าเช่าเดือนละพันบาทครับ').includes('PER_UNIT_LA') && !ids('มาสองคนครับ').includes('PER_UNIT_LA'), ['ตรงทางออกมีคนหลายคนครับ', 'ค่าเช่าเดือนพันบาทครับ', 'ค่าเช่าเดือนละพันบาทครับ'].map(t => t + ':' + ids(t).join(',')))
  { const v = c.initVocab(), R = th => { c.__t = v.find(x => x.thai === th); return c.ev("targetLinguisticRole(__t, 'th')") }
    const got = ['ข้าม', 'ตอบ', 'บ่อย', 'ทางออก', 'สีเหลือง', 'แล้ว'].map(R)
    T('L10', 'Thai roles from the gloss: ข้าม "cross" and ตอบ "answer, reply" are VERBs, บ่อย "often" an ADVERB; ทางออก stays a NOUN (noun head), แล้ว a FUNCTION WORD',
      got.join(',') === 'VERB,VERB,ADVERB,NOUN,NOUN,FUNCTION WORD', got) }
  { const L = (n, sp, th) => ({ n, pair: { speaker: sp, thai: th } })
    const h = c.thaiScenePolishHints([L(1, 'B', 'คุณมาที่ป้ายรถเมล์ทุกวันไหมคะ'), L(2, 'A', 'ใช่ ผมมาทุกวันครับ'), L(3, 'A', 'สัปดาห์นี้ไปตัวเมืองกันไหมครับ'), L(4, 'A', 'บางทีก็ยุ่งครับ'), L(5, 'B', 'ใช่ไหมคะ'), L(6, 'A', 'ใช่ครับ')])
    const fp = c.thaiFixParticleSpelling([{ thai: 'ไม่ใช่ค่ะศูนย์แปดเจ็ด' }, { thai: 'ครับผม' }, { thai: 'ขอบคุณครับคุณนิดา' }, { thai: 'คะแนนดีค่ะ' }], null).map(p => p.thai)
    T('H1', 'scene polish hints: ใช่ answering a ไหม question (L2) and a question followed by the same speaker (L3) are named; ใช่ answering ใช่ไหม (L6) is not · a phrase-final ค่ะ / ครับ gets a space before more Thai (ครับผม, คะแนน untouched)',
      h.length === 2 && /^L2 answers the ไหม question in L1 with ใช่/.test(h[0]) && /^L3 asks a question/.test(h[1]) &&
      (h2 => h2.some(x => /^L1 and L2 are both B/.test(x)) && h2.some(x => /งั้น .* opens L3, L4/.test(x)))(c.thaiScenePolishHints([L(1, 'B', 'ฉันเช่าห้องไกลค่ะ'), L(2, 'B', 'ฉันไม่ได้เช่าค่ะ'), L(3, 'A', 'งั้นไปกันครับ'), L(4, 'B', 'งั้นไปค่ะ')])) &&
      (h3 => h3.some(x => /^L1 and L2 \(same word\) are both A/.test(x)))(c.thaiScenePolishHints([{ n: 1, pair: { speaker: 'A', thai: 'ผมเอาน้ำแข็งด้วยครับ', targetSurface: 'น้ำแข็ง' } }, { n: 2, pair: { speaker: 'A', thai: 'ผมไม่เอาน้ำแข็งมากครับ', targetSurface: 'น้ำแข็ง' } }])) &&
      fp.join('|') === 'ไม่ใช่ค่ะ ศูนย์แปดเจ็ด|ครับผม|ขอบคุณครับ คุณนิดา|คะแนนดีค่ะ', { h, fp }) }
  const ft = c.thaiFramingTidy([
    { _target: 'greeting', speaker: 'A', thai: 'สวัสดีครับ นิดา วันนี้เป็นยังไงบ้างครับ', english: 'Hello Nida, how are you today', prompt: 'Greet Nida and ask how she is doing today.' },
    { _target: 'parting', speaker: 'A', thai: 'แล้วเจอกันนะครับคุณนิดา', english: 'See you later, Nida.', prompt: 'Say goodbye to Nida' },
    { _target: 'parting', speaker: 'B', thai: 'ขอบคุณ คุณก็เหมือนกันค่ะ', english: 'Thanks, you too', prompt: 'Thank Somchai (สมชาย) and say you wish Somchai (สมชาย) the same.' }], null)
  T('F1', 'framing tidy: Thai names in brackets leave the cue; framing English and cues end with punctuation; a "you too" reply to a replaced "see you" closing becomes แล้วเจอกันค่ะ',
    ft[0].english === 'Hello Nida, how are you today.' && ft[1].prompt === 'Say goodbye to Nida.' && ft[2].thai === 'แล้วเจอกันค่ะ' && ft[2].english === 'See you.' && !/[\u0E00-\u0E7F]/.test(ft[2].prompt), ft)
  const ft2 = c.thaiFramingTidy([{ _target: 'parting', speaker: 'A', thai: 'ขอให้มีความสุขนะครับ แล้วเจอกัน', english: 'Be happy. See you.', prompt: 'Wish her well.' }, { _target: 'parting', speaker: 'B', thai: 'ขอบคุณ คุณก็เหมือนกันค่ะ', english: 'Thanks, you too.', prompt: 'Thank him and wish him the same.' }], null)
  T('F2', 'a "you too" reply to a real wish (ขอให้…) is kept', ft2[1].thai === 'ขอบคุณ คุณก็เหมือนกันค่ะ')
  // v704 (relay run 6) — the closing lines carried Thai names in their English and cue
  const chars = [{ name: 'Somchai', nativeName: 'สมชาย' }, { name: 'Nida', nativeName: 'นิดา' }]
  const ft4 = c.thaiFramingTidy([{ _target: 'parting', speaker: 'A', thai: 'แล้วเจอกันนะครับคุณนิดา', english: 'See you later, นิดา.', prompt: 'Say goodbye to นิดา.' },
    { _target: 'parting', speaker: 'B', thai: 'ขอบคุณ สมชาย ดูแลตัวเองด้วยค่ะ', english: 'Thank you Somchai, take care of yourself.', prompt: 'Thank สมชาย (Somchai) and tell สมชาย (Somchai) to look after himself.' }], null, chars)
  T('F4', 'a character\'s Thai name in a line\'s English or cue becomes the English name ("See you later, Nida." · "Thank Somchai and tell Somchai …"); the Thai is untouched',
    ft4[0].english === 'See you later, Nida.' && ft4[0].prompt === 'Say goodbye to Nida.' && ft4[1].prompt === 'Thank Somchai and tell Somchai to look after himself.' && ft4[0].thai === 'แล้วเจอกันนะครับคุณนิดา', ft4.map(p => [p.english, p.prompt]))
  const pu = c.thaiFramingTidy([{ _target: 'parting', speaker: 'A', thai: 'เดินทางปลอดภัยนะครับ', english: 'Have a safe trip', prompt: 'Wish her a safe trip.' },
    { speaker: 'A', thai: 'ผมมาถึงป้ายรถเมล์แล้วครับ', english: 'I have already reached the bus stop', prompt: 'Say you have reached the bus stop.', targetId: 1 },
    { speaker: 'B', thai: 'ทางออกนั้นไกลไหมคะ', english: 'Is that exit far', prompt: 'Ask if that exit is far.', targetId: 2 }], null)
  T('F3', 'every line\'s English ends with punctuation, a question decided by the Thai ("Have a safe trip." not "?"; "Is that exit far?")',
    pu[0].english === 'Have a safe trip.' && pu[1].english === 'I have already reached the bus stop.' && pu[2].english === 'Is that exit far?', pu.map(p => p.english))
  // v707 (paid tracks 2–4) — a bare opening reply word before more Thai takes the speaker's particle; a line that has it is untouched
  { const pf = c.ev('thaiFixParticleSpelling')([{ speaker: 'A', thai: 'ใช่ ผมมาทุกวันครับ' }, { speaker: 'B', thai: 'ไม่รู้ ลองถามดูนะคะ' }, { speaker: 'A', thai: 'ไม่แพงนะ ห้าสิบบาทเองครับ' },
      { speaker: 'A', thai: 'ใช่ครับ ผมมาครับ' }, { speaker: 'B', thai: 'ไม่ไปค่ะ' }], null).map(p => p.thai)
    T('F6', 'a bare opening ใช่ / ไม่รู้ / ไม่…นะ before more Thai takes the speaker\'s particle (ใช่ครับ ผมมาทุกวันครับ · ไม่รู้ค่ะ ลองถามดูนะคะ · ไม่แพงนะครับ ห้าสิบบาทเองครับ); lines that have it, and ไม่ไป, are untouched',
      JSON.stringify(pf) === JSON.stringify(['ใช่ครับ ผมมาทุกวันครับ', 'ไม่รู้ค่ะ ลองถามดูนะคะ', 'ไม่แพงนะครับ ห้าสิบบาทเองครับ', 'ใช่ครับ ผมมาครับ', 'ไม่ไปค่ะ']), pf) }
  // v706 (paid track 2, line 2) — a greeting opens with the speaker's particle
  const gp = c.thaiFramingTidy([{ _target: 'greeting', speaker: 'B', thai: 'สวัสดี ฉันสบายดีค่ะ', phonetic: 'sà-wàt-dii chǎn sà-baai-dii khâ', english: 'Hello, I am doing well.', prompt: 'Greet him back.' },
    { _target: 'greeting', speaker: 'A', thai: 'สวัสดีครับ คุณนิดา', phonetic: 'sà-wàt-dii-khráp khun ní-daa', english: 'Hello Nida.', prompt: 'Greet Nida.' },
    { speaker: 'A', thai: 'สวัสดี ผมชื่อสมชายครับ', english: 'Hi, I am Somchai.', prompt: 'Introduce yourself.', targetId: 3 }], null)
  // v706 (owner, 2026-10-20) — fixed English for three verbs: ดู = watch / look · เห็น = notice · ชม = admire / appreciate
  { const U = c.ev('thaiVerbSenseUses'), F = c.ev('thaiVerbSenseEnglishFix'), P = c.ev('thaiVerbSenseProblem'), V = c.ev('RAW_VOCAB')
    const uses = [['ผมเห็นเขาที่ตลาดครับ', ['เห็น']], ['คืนนี้ไปดูหนังกันไหมคะ', ['ดู']], ['เราไปชมวิวกันครับ', ['ชม']], ['ผมดูแลลูกครับ', []], ['ฉันเห็นด้วยค่ะ', []],
      ['เสื้อสีชมพูสวยค่ะ', []], ['ลองชิมดูสิครับ', []], ['ดูเหมือนฝนจะตกค่ะ', []], ['ความเห็นของคุณดีครับ', []], ['ขอดูเมนูหน่อยครับ', ['ดู']]]
    const ub = uses.filter(([t, w]) => JSON.stringify(U(t)) !== JSON.stringify(w)).map(([t]) => t + ' → ' + JSON.stringify(U(t)))
    const fx = [['ผมเห็นเขาที่ตลาดครับ', 'I saw him at the market.', 'I noticed him at the market.'], ['คืนนี้ไปดูหนังกันไหมคะ', 'Shall we go see a movie tonight?', 'Shall we go watch a movie tonight?'],
      ['ขอดูเมนูหน่อยครับ', 'Can I see the menu, please?', 'Can I look at the menu, please?'], ['เราไปชมวิวกันครับ', "Let's go see the view.", "Let's go admire the view."],
      ['ฉันเห็นด้วยค่ะ', 'I agree.', 'I agree.'], ['ผมดูทีวีอยู่ครับ', "I'm watching TV.", "I'm watching TV."]]
    const fb = fx.filter(([t, e, w]) => F(t, e) !== w).map(([t, e, w]) => F(t, e) + ' (want ' + w + ')')
    T('V1', 'owner rule: ดู = watch / look, เห็น = notice, ชม = admire / appreciate — the standalone verbs are found (ดูแล, เห็นด้วย, ชมพู, ลอง…ดู, ดูเหมือน, ความเห็น are other words), "see" in the English becomes the owner\'s word, and a line that still breaks the rule is a VERB_SENSE defect; the dictionary glosses say the same',
      !ub.length && !fb.length && P({ thai: 'ผมเห็นเขาครับ', english: 'I caught sight of him.' }) && P({ thai: 'ผมเห็นเขาครับ', english: 'I caught sight of him.' }).id === 'VERB_SENSE' && !P({ thai: 'ผมเห็นเขาครับ', english: 'I noticed him.' }) &&
      V.find(v => v.id === 53).e === 'watch / look' && V.find(v => v.id === 786).e === 'notice' && V.find(v => v.id === 824).e === 'admire / appreciate' && /ดู = "watch" or "look"/.test(c.ev('THAI_VERB_SENSE_LINE')), { ub, fb }) }
  // v707 (paid tracks 2–5) — English words the Thai does not say are dropped; a word's later line repeating the earlier phrase is named
  { const X = c.ev('thaiEnglishExtraWordsFix'), RF = c.ev('thaiRepeatedFrames')
    const xs = [['ผมชอบสีเหลืองครับ', 'I really like yellow.', 'I like yellow.'], ['ผมชอบสีเหลืองมากครับ', 'I really like yellow.', 'I really like yellow.'],
      ['ไปกินข้าวกันครับ', 'So, let\'s go eat.', "Let's go eat."], ['งั้นไปกินข้าวกันครับ', 'So, let\'s go eat.', "So, let's go eat."],
      ['ยังมีน้ำแข็งค่ะ', 'No, there is still some ice.', 'There is still some ice.'], ['ฉันชอบค่ะ', 'I like it too.', 'I like it.'], ['ฉันก็ชอบค่ะ', 'I like it too.', 'I like it too.'],
      ['ผมกินข้าวครับ', 'I have already eaten.', 'I have eaten.'], ['ผมเหนื่อย ก็เลยกลับบ้านครับ', 'I was tired, so I went home.', 'I was tired, so I went home.']]
    const xb = xs.filter(([t, e, w]) => X(t, e) !== w).map(([t, e, w]) => X(t, e) + ' (want ' + w + ')')
    const L3 = (s, ths) => ths.map((th, k) => ({ n: k + 1, pair: { targetSurface: s, thai: th, pairId: s + k } }))
    const rf = RF(L3('ข้าม', ['ข้ามสะพานไปครับ', 'ข้ามสะพานตรงนี้ได้ไหมคะ', 'ข้ามถนนระวังนะครับ']).concat(L3('พัน', ['ราคาไม่ถึงพันบาทครับ', 'สองพันบาทค่ะ', 'ห้าคนก็ไม่ถึงพันครับ'])))
    T('V2', 'English words the Thai does not say are dropped ("really" without มาก, "So," without งั้น, "No," before a yes, "too" without ก็ / ด้วย, "already" without แล้ว) and kept when the Thai has them; a word\'s later line repeating its earlier phrase (ข้ามสะพาน, ไม่ถึงพัน) is named, a different use is not',
      !xb.length && rf.length === 2 && rf.some(r => r.pair.thai === 'ข้ามสะพานตรงนี้ได้ไหมคะ') && rf.some(r => r.pair.thai === 'ห้าคนก็ไม่ถึงพันครับ'), { xb, rf: rf.map(r => [r.pair.thai, r.phrase]) }) }
  T('F5', 'a greeting line\'s bare สวัสดี takes the speaker\'s particle (B: "สวัสดีค่ะ ฉันสบายดีค่ะ", reading sà-wàt-dii-khâ …); a greeting that has it, and target lines, are untouched',
    // v708 — EXPECTED CHANGE (blind review of paid track 7): the added particle is its own word, so it is spaced, not hyphenated
    // (was 'sà-wàt-dii-khâ …')
    gp[0].thai === 'สวัสดีค่ะ ฉันสบายดีค่ะ' && gp[0].phonetic === 'sà-wàt-dii khâ chǎn sà-baai-dii khâ' && gp[1].thai === 'สวัสดีครับ คุณนิดา' && gp[2].thai === 'สวัสดี ผมชื่อสมชายครับ', gp.map(p => [p.thai, p.phonetic]))
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
      'แล้วคุณล่ะคะ': comp('แล้วคุณล่ะคะ'), 'ผมไม่มีช้อนครับ': comp('ผมไม่มีช้อนครับ'), 'เดินทางปลอดภัยนะครับ': comp('เดินทางปลอดภัยนะครับ'), 'ก๋วยเตี๋ยว': disp('ก๋วยเตี๋ยว'), 'ครอบครัว': disp('ครอบครัว'), 'เสียง': disp('เสียง'), 'ง่วง': disp('ง่วง'), 'ออฟฟิศ': disp('ออฟฟิศ') }
    // (phrase entries keep their hyphens: one token is one whitespace piece for the positional pronunciation alignment — tests20 N5)
    const want = { 'เพิ่ง': 'phôeng', 'รถบัส': 'rót-bát', 'ได้ยิน': 'dâi-yin', 'ผมไม่ได้ยินครับ': 'phǒm mâi-dâi-yin khráp', 'สวัสดีครับ': 'sà-wàt-dii-khráp',
      'แล้วคุณล่ะคะ': 'láaeo-khun-lâ khá', 'ผมไม่มีช้อนครับ': 'phǒm mâi-mii cháawn khráp', 'เดินทางปลอดภัยนะครับ': 'dooen-thaang-bplàawt-phai ná khráp', 'ก๋วยเตี๋ยว': 'gǔai-dtǐao', 'ครอบครัว': 'khrâawp-khrua', 'เสียง': 'sǐang', 'ง่วง': 'ngûang', 'ออฟฟิศ': 'áawf-fít' }
    const bad = Object.keys(want).filter(k => String(got[k]).normalize('NFC') !== want[k].normalize('NFC'))
    T('R7', 'reviewed spellings: เพิ่ง phôeng · รถบัส rót-bát · ได้ยิน dâi-yin (ไม่ได้ยิน mâi-dâi-yin, not mâi-dâi yin); diphthongs one way (gǔai-dtǐao, khrua, sǐang) with the tone on the first vowel (ง่วง ngûang); ออฟฟิศ áawf-fít', !bad.length, bad.map(k => k + ' → ' + got[k])) }
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
      same.length === 1 && same[0][1] === 'รถบัสสีเหลือง', { calls2, same, rej: r2.rejected, last: r2.pairs[r2.pairs.length - 1].thai })
    // v707 (blind review of paid track 2, coherence 3.5/10) — the scene critic reads the scenes in order and names lines; each named line
    // becomes a polish-fix entry keyed by its pair (and Thai) with the critic's type and reason; an unknown line number is ignored
    let pc = '', callsC = 0
    c.mockGeminiGenerate = async (k, m, msgs) => { callsC++; pc = msgs[0].content; return JSON.stringify({ problems: [{ n: 'L5', type: 'contradiction', why: 'A just said there is no sugar' }, { n: 'L99', type: 'REPEAT', why: 'x' }] }) }
    const cr = await c.thaiSceneCritic(tr, { apiKey: 'AIzaSyTEST-harness-key-000000', model: c.ev('GEMINI_DEFAULT_MODEL'), vocab: v }, null)
    T('S7', 'scene critic: one request reads every scene in order (Thai + English, speakers, CONTRADICTION / NO_FOLLOW / WRONG_SPEAKER / REPEAT / IMPLAUSIBLE / UNNATURAL); a named line becomes a fix entry "SCENE_CONTRADICTION — …" for the scene polish; unknown lines are ignored',
      callsC === 1 && /L5 B: น้ำตาลอยู่ที่นี่ค่ะ/.test(pc) && /WRONG_SPEAKER/.test(pc) && /REPEAT/.test(pc) && cr && cr.named.length === 1 && /^SCENE_CONTRADICTION — A just said/.test(cr.fix.get('x' + b.id + '2')),
      { callsC, named: cr && cr.named })
    // v707 (paid track 4: a fix made L41 identical to L40 → FINAL_DUPLICATE_AUDIT FAIL) — an edit that copies another line is refused
    let callsD = 0
    c.mockGeminiGenerate = async () => { callsD++; return JSON.stringify({ lines: [{ n: 2, thai: 'ผมไม่มีช้อนครับ', english: 'I have no spoon.', cue: 'Say you have no spoon.' }] }) }
    const rd = await c.thaiScenePolish(tr, { apiKey: 'AIzaSyTEST-harness-key-000000', model: c.ev('GEMINI_DEFAULT_MODEL'), vocab: v }, null)
    T('S8', 'scene polish refuses an edit that would make a line identical to another line of the lesson (the original is kept)',
      rd.changed === 0 && rd.pairs[1].thai === 'ช้อนอยู่ไหนคะ' && rd.rejected.some(x => /same as another line/.test(x)), { changed: rd.changed, rej: rd.rejected })
    // v705 (relay run 12: a polished เช่า line of 8 words failed the final LENGTH_PASS → NOT_READY 89/90) — an edit above the belt's
    // hardMax is refused (with the reason, so the one retry can shorten it) and the original line stays
    const long = 'ผมไม่มีช้อน ช้อนอยู่ที่ไหน ผมเอาช้อนมาให้ที่นี่นะครับ', cc = c.ev('getLearnerComplexityContract')({ lang: 'th', vocab: v })
    let p3 = '', calls3 = 0
    c.mockGeminiGenerate = async (k, m, msgs) => { calls3++; p3 = msgs[0].content; return JSON.stringify({ lines: [{ n: 3, thai: long, english: 'x', cue: 'y' }] }) }
    const r3 = await c.thaiScenePolish(tr, { apiKey: 'AIzaSyTEST-harness-key-000000', model: c.ev('GEMINI_DEFAULT_MODEL'), vocab: v }, null)
    T('S3', 'scene polish refuses an edit above the learner\'s hardMax (the same ceiling as the final length audit); the retry names it and the original line is kept',
      cc.analyse(long).overHardMax && calls3 === 2 && /L3: .* — refused: too long: \d+ words \(max \d+\)/.test(p3) && r3.pairs[2].thai === 'ผมเอาช้อนมาให้นะครับ' && r3.changed === 0,
      { units: cc.analyse(long).units, hardMax: cc.hardMax, calls3, changed: r3.changed, rej: r3.rejected })
    // v705 (blind review of relay run 12: one fact repeated in four scenes) — the second scene's request lists what the first scene said
    const tr4 = { ...tr, scenePlan: { scenes: [{ sceneId: 'S1', purpose: 'spoon', localPremise: 'at a stall', targetIds: [a.id] }, { sceneId: 'S2', purpose: 'sugar', localPremise: 'at a stall', targetIds: [b.id] }] } }
    const p4 = []
    c.mockGeminiGenerate = async (k, m, msgs) => { p4.push(msgs[0].content); return '{"lines":[]}' }
    await c.thaiScenePolish(tr4, { apiKey: 'AIzaSyTEST-harness-key-000000', model: c.ev('GEMINI_DEFAULT_MODEL'), vocab: v }, null)
    T('S4', 'scene polish: a later scene sees the earlier scenes\' lines ("EARLIER IN THIS LESSON … do not repeat"); the first scene has none',
      p4.length === 2 && !/EARLIER IN THIS LESSON/.test(p4[0]) && /EARLIER IN THIS LESSON[^\n]*\n(A|B): ผมไม่มีช้อนครับ\n(A|B): ช้อนอยู่ไหนคะ\n(A|B): ผมเอาช้อนมาให้นะครับ/.test(p4[1]),
      { n: p4.length, second: (p4[1] || '').slice((p4[1] || '').indexOf('EARLIER'), (p4[1] || '').indexOf('EARLIER') + 160) })
    // v706 (relay tracks 16/17) — FIX MODE: only the scene holding a refused line is sent, with the refusal's reason; only the refused line
    // and the line before it may change; the rewritten line loses its refused mark
    const tr6 = { ...tr4, pairs: tr4.pairs.map((p, i) => i === 2 ? { ...p, _qcInvalid: 'FINAL_SNAPSHOT: UNNATURAL — x' } : p) }
    const p6 = []
    c.mockGeminiGenerate = async (k, m, msgs) => { p6.push(msgs[0].content); return JSON.stringify({ lines: [
      { n: 1, thai: 'ช้อนไม่มีครับ', english: 'No spoon.', cue: 'Say there is no spoon.' },
      { n: 2, thai: 'ช้อนอยู่ที่ไหนคะ', english: 'Where is the spoon?', cue: 'Ask where the spoon is.' },
      { n: 3, thai: 'ผมเอาช้อนมาให้ครับ', english: "I'll bring a spoon.", cue: "Say you'll bring a spoon." }] }) }
    const r6 = await c.thaiScenePolish(tr6, { apiKey: 'AIzaSyTEST-harness-key-000000', model: c.ev('GEMINI_DEFAULT_MODEL'), vocab: v, polishFix: new Map([['ผมเอาช้อนมาให้นะครับ', 'UNNATURAL — does not answer where the spoon is']]) }, null)
    T('S6', 'scene polish FIX MODE: one request, only for the scene with the refused line, naming the refusal; the refused line (L3) and the line before it (L2) change, L1 does not; the rewritten line loses its refused mark',
      p6.length === 1 && /THE FINAL NATIVE REVIEWER REFUSED THESE LINES[\s\S]*L3 A: ผมเอาช้อนมาให้นะครับ — refused: does not answer where the spoon is/.test(p6[0]) &&
      r6.pairs[0].thai === 'ผมไม่มีช้อนครับ' && r6.pairs[1].thai === 'ช้อนอยู่ที่ไหนคะ' && r6.pairs[2].thai === 'ผมเอาช้อนมาให้ครับ' && r6.pairs[2]._qcInvalid === undefined,
      { n: p6.length, th: r6.pairs.slice(0, 3).map(p => p.thai), inv: r6.pairs[2]._qcInvalid, rej: r6.rejected }) }
  { const src0 = require('fs').readFileSync('tt.jsx', 'utf8')
    T('P1', 'Thai Daily scene planner: at most 6 words per mini-scene, and a premise that gives every word a reason to be said (ticket → vehicle / counter; exit → station); the writer asks for three different combinations of the word',
      /\(c\.lang \|\| 'th'\) === 'th' && dailyV693On\(\) \? 'Keep each mini-scene to at most 6 words\. Its localPremise must give EVERY word/.test(src0) && /Across the three lines use the word in DIFFERENT combinations or senses/.test(src0)) }

  // v705 (blind review of relay run 12) — ที่นี่|ครับ, not ที่|นี่ครับ "here you are"; the v704 tie rule still keeps อ่าน|หนังสือพิมพ์;
  // นี่ครับ at the start of a line stays one word; ทอด in the bank's compounds is thâawt (long ɔɔ, falling)
  { const V = c.initVocab(), lex = c.ev('buildThaiPhoneticLexicon')(V), seg = t => c.segmentThaiWithDiagnostics(t, V, null, null, true).map(x => x.matchedSpan).join('|')
    const ph = t => c.ev('composeThaiPhonetic')(t, lex).phonetic
    T('R8', 'segmentation and romanisation keep a bare polite particle apart in a tie (เจอกันที่นี่ครับ → …ที่นี่|ครับ, thîi-nîi khráp); อ่าน|หนังสือพิมพ์ and a line-initial นี่ครับ are unchanged; ปอเปี๊ยะทอด / มันฝรั่งทอด read thâawt',
      /ที่นี่\|ครับ$/.test(seg('เจอกันที่นี่ครับ')) && /thîi-nîi khráp$/.test(ph('เจอกันที่นี่ครับ')) && /ที่นี่\|ค่ะ$/.test(seg('อยู่ที่นี่ค่ะ')) &&
      /^อ่าน\|หนังสือพิมพ์/.test(seg('อ่านหนังสือพิมพ์ครับ')) && /^นี่ครับ\|/.test(seg('นี่ครับ ช้อนครับ')) && /^nîi-khráp/.test(ph('นี่ครับ ช้อนครับ')) &&
      /thâawt$/.test(lex.get('ปอเปี๊ยะทอด')) && /thâawt$/.test(lex.get('มันฝรั่งทอด')),
      [seg('เจอกันที่นี่ครับ'), ph('เจอกันที่นี่ครับ'), seg('อยู่ที่นี่ค่ะ'), seg('อ่านหนังสือพิมพ์ครับ'), seg('นี่ครับ ช้อนครับ'), lex.get('ปอเปี๊ยะทอด'), lex.get('มันฝรั่งทอด')]) }

  // v706 — concrete natural uses per word (THAI_WORD_USES) reach the writer and the polish; a word with two senses asks for both
  { const ul = c.ev('thaiWordUsesLine'), sp = c.ev('thaiScenePolishPrompt')
    const L = (n, sp0, th, tg) => ({ n, pair: { speaker: sp0, thai: th, targetSurface: tg, english: 'e', prompt: 'p' } })
    const pp = sp({ sceneId: 'S1', purpose: 'p', lines: [L(1, 'A', 'ราคาถูกมากครับ', 'ถูก'), L(2, 'B', 'ถูกจริงค่ะ', 'ถูก'), L(3, 'A', 'ใช่ครับ', 'ถูก')] }, ['ราคา'], ['A', 'B'])
    T('U1', 'each target with a THAI_WORD_USES entry shows real example uses to the writer and the scene polish; ถูก names both senses (cheap / correct); a word without an entry adds nothing',
      /HOW THAI SPEAKERS USE "ถูก"/.test(ul({ thai: 'ถูก' })) && /2 senses \(cheap \/ correct\)/.test(ul({ thai: 'ถูก' })) && /ตอบถูกแล้ว/.test(ul({ thai: 'ถูก' })) &&
      ul({ thai: 'ผม' }) === '' && /NATURAL USES of this scene's words[^\n]*\n  ถูก: ราคาถูกมาก · /.test(pp), ul({ thai: 'ถูก' }).slice(0, 200)) }

  // v706 (owner review of v705, pairs 67 / 79 / 85 / 94) — the cue lint never writes broken English; a broken cue is a defect; a Thai
  // statement's English does not end in "?"
  { const br = c.ev('thaiCueEnglishBroken'), lint = c.ev('thaiFinalCueLint'), ef = c.ev('thaiEnglishFaithfulFix')
    const P67 = { speaker: 'B', thai: 'ไปชายหาดต้องใช้รถอะไรคะ', english: 'What vehicle do you need to go to the beach?', prompt: 'Ask what vehicle you need to use to go to the beach.' }
    const P85 = { speaker: 'B', thai: 'ขอให้คุณมาถึงห้าโมงเย็นนะคะ', english: 'Please make sure you arrive by five in the evening.', prompt: 'Say please make sure you arrive by five in the evening.' }
    const l67 = lint(P67, { addr: 'm', addrName: 'Somchai', names: ['Somchai', 'Nida'] }).cue, l85 = lint(P85, { addr: 'm', addrName: 'Somchai', names: ['Somchai', 'Nida'] }).cue
    const bad = ['Ask what vehicle do he need to go to the beach.', 'Say please make sure him arrive by five in the evening.', 'Thank him they have fun too.', 'Ask if she want some tea.', 'Say yes, tell her to have to cross, but it is not far.', 'Check that he sometimes swim.', 'Thank her today was really good.', 'Thank Nida and wishes Somchai a safe trip.']
    const good = ['Ask what time he wakes up.', 'Let him go first.', 'Say he can come too.', 'Ask if she wants some tea.', 'Thank him and tell him to have fun too.', 'Tell her she can sit here.', 'Ask what vehicle you need to use to go to the beach.',
      'Ask if he sometimes swims.', 'Ask when he will start.', 'Does he sometimes swim?']
    T('C2', 'cue lint (owner review of v705): pair 67 / 85 rewrites are never ungrammatical ("do he need", "make sure him arrive" are refused); the guard flags the four broken cues and none of seven sound ones; a broken cue is a BROKEN_ENGLISH defect',
      !br(l67).length && !br(l85).length && bad.every(x => br(x).length) && good.every(x => !br(x).length) &&
      c.ev('thaiCueDefects')('Thank him they have fun too.', { thai: 'ขอบคุณค่ะ คุณก็เที่ยวให้สนุกนะคะ', english: 'Thanks, you have fun too.' }, { addr: 'm' }).includes('BROKEN_ENGLISH'),
      { l67, l85, missed: bad.filter(x => !br(x).length), falseAlarms: good.filter(x => br(x).length) })
    T('C3', 'a Thai statement keeps a statement in English: ค่ะ เดินทางปลอดภัยนะคะ "Yes, have a safe trip?" → "."; real questions (ไหม, ไหน, bare final คะ) keep "?"',
      ef({ thai: 'ค่ะ เดินทางปลอดภัยนะคะ', english: 'Yes, have a safe trip?' }) === 'Yes, have a safe trip.' && ef({ thai: 'ไปไหนคะ', english: 'Where are you going?' }) === 'Where are you going?' &&
      ef({ thai: 'ไปด้วยกันไหมคะ', english: 'Shall we go together?' }) === 'Shall we go together?' && ef({ thai: 'จริงเหรอคะ', english: 'Really?' }) === 'Really?',
      ef({ thai: 'ค่ะ เดินทางปลอดภัยนะคะ', english: 'Yes, have a safe trip?' })) }

  // v706 (owner review of v705: แวะ [dì-chǎn-eeng] in the target list) — a substitution carries the new word's dictionary reading, and
  // the final target-list audit sets any stale reading to the dictionary's
  { const tr = { keywords: [{ wordId: 708, thai: 'ดิฉันเอง', phonetic: 'dì-chǎn-eeng', english: 'it is me' }] }
    const out = c.ev('applyThaiTargetSubstitutions')(tr, [{ fromId: 708, toId: 180, toSurface: 'แวะ', toEnglish: 'stop by' }])
    const au = c.ev('thaiKeywordPhoneticAudit')([{ thai: 'แวะ', phonetic: 'dì-chǎn-eeng' }, { thai: 'กุ้ง', phonetic: c.ev('thaiCanonicalPhoneticOf')('กุ้ง') }])
    T('K1', 'after ดิฉันเอง → แวะ the target list reads แวะ as wáe (not dì-chǎn-eeng); the final audit corrects a stale reading and leaves a correct one alone',
      out.keywords[0].thai === 'แวะ' && out.keywords[0].phonetic === c.ev('thaiCanonicalPhoneticOf')('แวะ') && /^w/.test(out.keywords[0].phonetic) &&
      au.fixed.length === 1 && au.keywords[0].phonetic === out.keywords[0].phonetic, { kw: out.keywords[0], fixed: au.fixed }) }

  // v706 (owner review of v705: ดิฉันเอง, 11 paid checks, every one refused for ดิฉัน) — such a target is skipped before generation, and
  // the same rejection reason three checks in a row stops paid attempts
  { const v = c.initVocab(), pf = c.ev('targetActivityPreflight'), w = v.find(x => x.thai === 'ดิฉันเอง'), k = v.find(x => x.thai === 'กุ้ง')
    let calls = 0
    // the writer is called directly with ดิฉันเอง (the preflight would skip it); every reply is a DIFFERENT sentence, so only the
    // same-reason rule ("Do not use ดิฉัน", triggered by the target itself) can stop it
    const V = ['ดิฉันเองค่ะ', 'ใช่ ดิฉันเองค่ะ', 'ดิฉันเองนะคะ', 'นี่ดิฉันเองค่ะ', 'ค่ะ ดิฉันเองค่ะ', 'ดิฉันเองที่มาค่ะ', 'อ๋อ ดิฉันเองค่ะ', 'ดิฉันเองจ้ะค่ะ', 'ดิฉันเองไงคะ', 'ดิฉันเองแหละค่ะ']
    c.mockGeminiGenerate = async () => { const t = V[calls % V.length]; calls++; return JSON.stringify([{ speaker: 'B', thai: t, english: "It's me.", prompt: "Say it's you." }, { speaker: 'A', thai: 'อ๋อ คุณเองเหรอครับ', english: "Oh, it's you?", prompt: "Ask if it's her." }, { speaker: 'B', thai: t.replace('ค่ะ', 'นะคะ'), english: "Yes, it's me.", prompt: "Say yes, it's you." }]) }
    try { await c.generateWordLines({ ...w, id: w.id }, 'at a noodle shop', 'Somchai (สมชาย)', 'Nida (นิดา)', [], v, 'AIzaSyTEST-harness-key-000000', c.ev('GEMINI_DEFAULT_MODEL'), 0, () => {}, '', []) } catch (e) {}
    T('R9', 'a target the writer rules always refuse (ดิฉันเอง ⊃ ดิฉัน) is skipped by the preflight before any paid call; an ordinary target (กุ้ง) is not; the writer stops after the same rejection 3 checks in a row (not 11)',
      pf(w, 'th', {}).reason === 'TARGET_CONTAINS_BANNED_TOKEN' && pf(w, 'th', {}).suitable === false && pf(k, 'th', {}).suitable === true && calls >= 1 && calls <= 3, { calls, r: pf(w, 'th', {}).reason }) }

  // v706 (owner benchmark: the lenient judge caught 11–13 of 31 owner-confirmed bad lines, the strict in-context judge 29–30) — the final
  // snapshot judge sees the previous lines of the same scene and the strict standard; its verdicts are cached apart from plain ones
  { const wc = c.ev('thaiWithSceneContext'), np = c.ev('_naturalnessPromptTextFor'), key = c.ev('_semCacheKey')
    const P = (id, sp, th) => ({ targetId: id, speaker: sp, thai: th, english: 'e' })
    const pairs = [{ speaker: 'A', thai: 'สวัสดีครับ', english: 'Hello.', pairType: 'framing' }, P(1, 'B', 'ไปไหนคะ'), P(1, 'A', 'ไปตลาดครับ'), P(2, 'B', 'ฉันอยากไปชายหาดค่ะ'), P(2, 'A', 'ไปด้วยกันไหมครับ')]
    const track = { scenePlan: { scenes: [{ targetIds: [1] }, { targetIds: [2] }] } }
    const out = wc([pairs[2], pairs[3], pairs[4]], pairs, track)
    const pr = np(out.slice(0, 1).map(x => ({ ...x, _target: 'ตลาด', _targetSense: 'market' }))), plain = np([{ thai: 'ไปตลาดครับ', english: 'e', speaker: 'A' }])
    // v708 — EXPECTED CHANGE (owner review of v707: "separate Daily practice from one connected story — short, self-contained
    // mini-conversations"): a target line's context is now the earlier lines of its OWN word's exchange only, so the opening greeting
    // is no longer context for the first word (was 'A: สวัสดีครับ (Hello.) / B: ไปไหนคะ (e)'); a different scene is still never context
    T('J1', 'final judge context: a line sees up to two earlier lines of its own word\'s exchange (v708: not the opening, not another word) and never the previous scene; the strict standard and the context reach the prompt only for marked lines; a strict verdict is cached apart',
      out[0]._context === 'B: ไปไหนคะ (e)' && out[1]._context === '' && out[2]._context === 'B: ฉันอยากไปชายหาดค่ะ (e)' && out.every(x => x._strictNat) &&
      /STRICT STANDARD/.test(pr) && /Previous line in the conversation: B: ไปไหนคะ/.test(pr) && !/STRICT STANDARD/.test(plain) && /Stylistic preference is s=4/.test(plain) &&
      key('nat', out[0]) !== key('nat', { ...out[0], _strictNat: undefined, _context: undefined }), out.map(x => x._context)) }

  // v706 (relay track 16) — a recovery prompt names WHY each rejected sentence failed, not just the sentence
  { const mk = c.ev('createRecoveryState'), rec = c.ev('recordRecoveryFailure'), lines = c.ev('recoveryStrategyPromptLines')
    const st = mk({ wordId: 1, thai: 'ครึ่ง', english: 'half' }, { surface: 'ครึ่ง', sense: 'half' })
    rec(st, { code: 'QC_REJECTED', text: 'ครึ่งวันไม่แพงเลยครับ', reason: 'FINAL_SNAPSHOT: UNNATURAL — unnatural 3/5 — does not answer "how much for half a day?"' })
    const out = String(lines(st, {}) || '')
    T('Q1', 'recovery prompt: each rejected sentence carries the judge\'s reason ("✗ ครึ่งวันไม่แพงเลยครับ — rejected because: does not answer …")',
      /✗ ครึ่งวันไม่แพงเลยครับ — rejected because: unnatural 3\/5 — does not answer "how much for half a day\?"|✗ ครึ่งวันไม่แพงเลยครับ — rejected because: does not answer/.test(out), out.slice(0, 300)) }

  const guide = c.ev('THAI_NATURALNESS_GUIDE_V701')
  const keys = ['ฉันนึกว่าพันบาทค่ะ', 'เสื้อตัวนี้', 'บางทีผมอาจจะอยู่บ้านครับ', 'ให้ผมช่วยถือไหมครับ', 'ไม่ใช่ทุกวัน', 'ค่าเช่า', 'ที่ป้ายรถเมล์ร้อนมากเลยครับ', 'เดี๋ยวผมเอาช้อนมาให้นะครับ', 'ถ้าถูกก็ซื้อครับ', 'ศูนย์ครับ ไม่ใช่สอง', 'บางที', 'ร้านอาหาร is a restaurant', 'facts stay true for the whole lesson']
  T('W1', 'the shared Thai guide carries the v704 lessons (word order, offers, conditionals, corrections, บางที, ร้านอาหาร, answers and facts that stay true)', keys.every(k => guide.includes(k)), keys.filter(k => !guide.includes(k)))
  const src = require('fs').readFileSync('tt.jsx', 'utf8')
  const uses = (src.match(/THAI_NATURALNESS_GUIDE \+ \(dailyV693On\(\) \? THAI_NATURALNESS_GUIDE_V701/g) || []).length + (src.match(/\+ \(dailyV693On\(\) \? THAI_NATURALNESS_GUIDE_V701 : ''\) \+ '\\n'/g) || []).length
  T('W2', 'both the writer prompt and the native-speaker reviewer include that guide (one standard for both)', uses >= 2, uses)
  // v704 (relay run 8: NOT_READY on a coherence verdict judged BEFORE the polish rewrote 17 lines) — the finaliser judges coherence again
  // on the polished text when the earlier verdict failed and the polish changed lines (source check: the call sits right after the polish)
  { const at = src.indexOf('const sp = await thaiScenePolish(t, c, log)'), seg = at >= 0 ? src.slice(at, at + 1600) : ''
    T('X4', 'after the scene polish, a failed coherence verdict is judged again on the polished text (only when the polish changed lines)',
      /if \(sp\.changed && _coh && _coh\.state === 'VERIFIED' && !_coh\.passed\)/.test(seg) && /await mainTrackCoherenceAudit\(t, adapter, c\)/.test(seg) && /afterPolish: true/.test(seg), seg.slice(0, 200)) }
  // v704 (blind review of relay run 6: "X แพงไหม / X ไม่แพง" word after word) — each word's writer prompt carries one of five exchange shapes, by its id
  { const v = c.initVocab(), w1 = v.find(x => x.thai === 'กุ้ง'), w2 = v.find(x => x.thai === 'ช้อน'), seen = []
    c.mockGeminiGenerate = async (k, m, msgs) => { const t = msgs.map(x => x.content).join('\n'); const mm = t.match(/SHAPE of this exchange: ([^.]*)/); if (mm) seen.push(mm[1]); return '[]' }
    for (const t of [w1, w2]) { const n0 = seen.length; try { await c.generateWordLines({ ...t }, 'at a noodle shop', 'Somchai (สมชาย)', 'Nida (นิดา)', [], v, 'AIzaSyTEST-harness-key-000000', c.ev('GEMINI_DEFAULT_MODEL'), 0, () => {}, '', []) } catch (e) {} ; seen.push('|' + (seen.length > n0)) }
    const S = c.ev('THAI_EXCHANGE_SHAPES'), first = seen.find(x => x !== '|true' && x !== '|false'), last = seen.slice().reverse().find(x => x !== '|true' && x !== '|false')
    T('W3', 'the writer prompt gives each word one of five exchange shapes by its id (กุ้ง and ช้อน get different ones) and asks that an answer add something new',
      S.length === 5 && first && last && first !== last && S.some(x => x.startsWith(first.slice(0, 20))), { first, last }) }

  // v708 (owner review of v707, 6.0/10) — Y1–Y7
  { const G = c.ev('thaiCueGuarantee'), GP = c.ev('thaiCueGuaranteePass'), B = c.ev('thaiCueEnglishBroken')
    const g = (cue, en, sp) => G({ prompt: cue, english: en, speaker: sp }, { addr: sp === 'A' ? 'f' : 'm' })
    const r = [g('Say are they cold?', 'Are they cold?', 'A'), g('Thank Somchai you wish him a safe trip.', 'Thank you, Somchai. Have a safe trip.', 'B'),
      g('Say what time do you leave?', 'What time do you leave?', 'A'), g('Ask whether he is cold.', 'Are you cold?', 'A'), g('Say oh, are you cold?', 'Oh, are you cold?', 'A')]
    T('Y1', 'cue guarantee: "Say are they cold?" → "Ask whether they are cold."; "Thank Somchai you wish him…" → "Thank Somchai and wish him…"; an unfixable shape becomes a quoted instruction; a sound cue is unchanged; nothing it returns is broken',
      r[0] === 'Ask whether they are cold.' && r[1] === 'Thank Somchai and wish him a safe trip.' && r[2] === 'Ask, \u201cWhat time do you leave?\u201d' && r[3] === 'Ask whether he is cold.' &&
      r[4] === 'Say oh, then ask whether she is cold.' && r.every(x => !B(x).length) && B('Say are they cold?').length && B('Thank Somchai you wish him a safe trip.').length, r)
    const P = [{ speaker: 'B', thai: 'ขอบคุณค่ะ', english: 'Thank you.', prompt: 'Thank Somchai you wish him a good day.', pairType: 'framing' }, { speaker: 'A', targetId: 3, thai: 'หนาวไหมครับ', english: 'Are they cold?', prompt: 'Say are they cold?' }]
    const out2 = GP(P, {}, null), src = require('fs').readFileSync('tt.jsx', 'utf8')
    T('Y2', 'the guarantee runs on every line with a cue (closing lines included), after the cue lint inside the final audit and again on the saved text',
      out2[0].prompt === 'Thank Somchai and wish him a good day.' && out2[1].prompt === 'Ask whether they are cold.' &&
      /pairs = thaiFinalCueLintPass\(pairs, track, log\) \} catch \(e\) \{\}\n  try \{ pairs = thaiCueGuaranteePass\(pairs, track, log\)/.test(src) && /t = \{ \.\.\.t, pairs: meta\.pairs \}\n  if \(adapter\.lang === 'th'\) \{ try \{ t = \{ \.\.\.t, pairs: thaiCueGuaranteePass\(t\.pairs, t, log\)/.test(src), out2.map(x => x.prompt)) }
  { const ft = c.ev('thaiFramingTidy')
    const P = [{ speaker: 'A', thai: 'ไว้เจอกันใหม่นะครับ', english: 'See you again.', prompt: 'Say see you again.', _target: 'closing' }, { speaker: 'B', thai: 'ขอบคุณ สมชาย ขอให้เดินทางดีค่ะ', english: 'Thank you, Somchai, have a good trip.', prompt: 'Thank Somchai you wish him a good trip.', _target: 'closing_reply' },
      { speaker: 'A', thai: 'โชคดีนะครับ ขอให้มีความสุข', english: 'Good luck, be happy.', prompt: 'Wish her luck.', _target: 'closing' }]
    const o = ft(P, null, [])
    T('Y3', 'a closing line built on a translated wish (ขอให้เดินทางดี) becomes the set phrase ขอบคุณค่ะ เดินทางปลอดภัยนะคะ with a matching English and cue; ขอให้มีความสุข (a real set phrase) is kept',
      o[1].thai === 'ขอบคุณค่ะ เดินทางปลอดภัยนะคะ' && o[1].english === 'Thank you. Have a safe trip.' && o[1].prompt === 'Thank him and wish him a safe trip.' && o[1].phonetic === '' && o[2].thai === P[2].thai, o.map(x => x.thai + ' · ' + x.prompt)) }
  { const rv = c.ev('thaiRevertBrokenEdits')
    const before = [{ pairId: 'a', thai: 'ก่อน1' }, { pairId: 'b', thai: 'ผิด' }, { pairId: 'c', thai: 'ดี' }]
    const after = [{ pairId: 'a', thai: 'หลัง1' }, { pairId: 'b', thai: 'แก้แล้ว' }, { pairId: 'c', thai: 'ดี' }]
    const r = rv(before, [{ pairId: 'b', thai: 'ผิด' }], after, [{ pairId: 'a', thai: 'หลัง1' }], null)
    T('Y4', 'revert-on-fail: a line that passed before a fix pass, was changed by it and now fails gets its earlier text back; the refused line keeps its fix; an untouched line stays',
      r.reverted === 1 && r.pairs[0].thai === 'ก่อน1' && r.pairs[1].thai === 'แก้แล้ว' && r.pairs[2].thai === 'ดี', r) }
  { const src = require('fs').readFileSync('tt.jsx', 'utf8'), crit = c.ev('thaiSceneCriticPrompt')
    const sc = { sceneId: 'S1', lines: [{ n: 1, pair: { speaker: 'B', thai: 'หนาวไหมคะ', targetSurface: 'หนาว', prompt: 'Ask if he is cold.', english: 'Are you cold?' } }, { n: 2, pair: { speaker: 'A', thai: 'ไม่หนาวครับ', targetSurface: 'หนาว', prompt: 'Say no.', english: 'No.' } },
      { n: 3, pair: { speaker: 'B', thai: 'ถ้วยนี้สวยค่ะ', targetSurface: 'ถ้วย', prompt: 'Say this cup is pretty.', english: 'This cup is pretty.' } }] }
    const pr = crit(sc, ['Somchai', 'Nida'], ['x'])
    T('Y5', 'mini-conversations: the writer asks for one SELF-CONTAINED three-line exchange; the critic shows and judges each exchange on its own (no "lesson so far"); one critic round; the open-ended scene polish is off; fix mode changes only refused lines (the line before only for a reply that does not follow, same exchange); two fix passes',
      /SELF-CONTAINED three-line exchange/.test(src) && /exchange 1 \(word: หนาว\)/.test(pr) && /exchange 2 \(word: ถ้วย\)/.test(pr) && /judge each one ON ITS OWN/.test(pr) && !/THE LESSON SO FAR/.test(pr) &&
      c.ev('THAI_SCENE_CRITIC_ROUNDS') === 1 && c.ev('THAI_OPEN_SCENE_POLISH') === false && c.ev('THAI_POLISH_FIX_PASSES') === 2 && /NO_FOLLOW\|CONTRADICTION\|DANGLING/.test(src) && /SMALLEST change that fixes the stated problem/.test(src), pr.slice(0, 300)) }
  { const v = c.initVocab(), pf = c.ev('targetActivityPreflight'), ok = t => { const w = v.find(x => x.thai === t); return w && pf(w, 'th', {}).suitable }
    const ord = ['เส้นทาง', 'วัฒนธรรม', 'ผู้โดยสาร', 'อุณหภูมิ', 'ประเพณี', 'กำไร', 'รายได้'], no = ['ขอให้เป็นวันที่ดี', 'จ้ะ', 'มึง', 'ดิฉันเอง']
    T('Y6', 'dictionary metadata: ordinary words the preflight skipped as "recognition only" (เส้นทาง, วัฒนธรรม, ผู้โดยสาร, อุณหภูมิ …) are teachable; a translated wish, a familiar particle, a rude word and the ดิฉัน rule still are not',
      ord.every(ok) && no.every(t => !ok(t)), { ordinary: ord.filter(t => !ok(t)), stillSkipped: no.filter(ok) }) }
  { const src = require('fs').readFileSync('tt.jsx', 'utf8')
    T('Y7', 'the closing-line prompt no longer suggests the translated wish ขอให้เป็นวันที่ดี and asks B for a set phrase (Daily switch on; the legacy prompt is unchanged)',
      /\(dailyV693On\(\) \? '' : 'ขอให้เป็นวันที่ดีนะครับ, '\)/.test(src) && /never a translated wish with ขอให้/.test(src)) }

  // v709 (owner: "please get to at least 7/10") — Z1–Z5: the curated exchange bank, trust of vetted lines, romanisation word breaks
  { const bank = c.ev('THAI_EXCHANGE_BANK'), bx = c.ev('thaiBankExchange'), bv = c.ev('thaiBankVerdict'), isB = c.ev('thaiIsBankLine')
    const w = Object.keys(bank).find(t => t === 'สะพาน') || Object.keys(bank)[0], ex = bx({ thai: w })
    T('Z1', 'the bank holds vetted A–B–A exchanges (≥ 500 words); the writer\'s first candidate for a bank word is its exchange; a word with no entry gets none',
      Object.keys(bank).length >= 500 && Object.values(bank).every(vs => vs.every(v => v.length === 3 && v[0].speaker === 'A' && v[1].speaker === 'B' && v[2].speaker === 'A')) &&
      ex && ex.length === 3 && ex[0].thai === bank[w][0][0].thai && bx({ thai: 'คำที่ไม่มีในคลัง' }) === null, { w, ex })
    const l = bank[w][0][1], p0 = { thai: l.thai, english: l.english, prompt: l.prompt, speaker: l.speaker, _target: w }
    T('Z2', 'a line that is still exactly its bank text is vetted (naturalness pass; the cue too while it is the bank cue); an edited line, another word\'s line or a changed cue is judged as usual',
      bv('nat', p0) && bv('nat', p0).s === 5 && bv('cue', p0) && isB(p0) && !bv('nat', { ...p0, thai: p0.thai + 'เลย' }) && !bv('cue', { ...p0, prompt: 'Say something else.' }) &&
      !bv('nat', { ...p0, _target: 'ช้อน' })) }
  { const v = c.initVocab(), lex = c.ev('buildThaiPhoneticLexicon')(v), seg = c.ev('segmentThaiWithDiagnostics'), fin = c.ev('finaliseThaiTrackPhonetics')
    const ph = t => fin([{ thai: t, words: seg(t, v, null, [], false).map(x => ({ p: x.matchedSpan, thai: x.matchedSpan })) }], lex, null)[0].phonetic
    const a = ph('นมหมดครับ ผมไปซื้อนะครับ'), b = ph('ได้ค่ะ ดูแลตัวเองด้วยนะคะ'), d = ph('สวัสดีครับ วันนี้เป็นยังไงบ้างครับ')
    T('Z3', 'romanisation: a word never spans a space (ครับ ผม → khráp phǒm, not ครับผม "yes, sir"); a phrase entry reads as its words (duu-lae dtua-eeng dûai, sà-wàt-dii khráp, bpen yang-ngai bâang); a compound stays one word (wan-níi)',
      /khráp phǒm/.test(a) && !/khráp-phǒm/.test(a) && /duu-lae dtua-eeng dûai/.test(b) && /sà-wàt-dii khráp/.test(d) && /bpen yang-ngai bâang/.test(d) && /wan-níi/.test(d), [a, b, d]) }
  { const f = c.ev('thaiBannedOnlyInsideTaught')
    T('Z4', 'a word on the "not in your vocabulary" list is allowed when the learner has been taught it or it is the target (อินเทอร์เน็ต, รถยนต์); still refused when untaught',
      f('ฉันใช้อินเทอร์เน็ตทุกวันค่ะ', 'อินเทอร์เน็ต', new Set(['อินเทอร์เน็ต'])) === true && f('ฉันใช้อินเทอร์เน็ตทุกวันค่ะ', 'อินเทอร์เน็ต', new Set(['ใช้'])) === false) }
  { const fr = c.ev('thaiBankFraming'), sd = fr({ characterA: 'Somchai (สมชาย), a Thai man', characterB: 'Nida (นิดา), a Thai woman', opening: 'x', reply: 'y', closing: 'z', closing_reply: 'w' }, [{ id: 3 }])
    T('Z5', 'opening and closing lines are vetted set pieces (no Thai names; the cue names the characters; the reading is rebuilt from the dictionary)',
      /^สวัสดีครับ/.test(sd.opening) && /ค่ะ$|คะ$/.test(sd.closing_reply) && /Nida/.test(sd.opening_prompt) && !/[\u0E00-\u0E7F]/.test(sd.opening_prompt) && sd.opening_phonetic === '' && !/สมชาย|นิดา/.test(sd.opening + sd.reply + sd.closing + sd.closing_reply), sd) }

  out.forEach(l => console.log(l))
  console.log('\nv704 Thai Daily quality round: ' + (n - fails) + '/' + n + ' passed' + (fails ? ' — ' + fails + ' FAILED' : ''))
  process.exit(fails ? 1 : 0)
})().catch(e => { out.forEach(l => console.log(l)); console.error(e); process.exit(1) })
