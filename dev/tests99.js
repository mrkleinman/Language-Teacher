// v761 — MUAY THAI TOPIC: the owner's 60 words in 12 groups, built exactly like Wedding Speech, plus the module work behind it
// (33 new module tags, the cross-use links, the writing tools). Real app code: the dictionary seed, the topic selector, the Topics screens rendered
// with react-test-renderer, the module picker; the Python tools are run for real when python3 + pythainlp are present. No provider calls.
//   node tests99.js            (current build: tt.compiled.js, or TT_FILE)
'use strict'
const fs = require('fs'), path = require('path'), cp = require('child_process')
const { load } = require('./harness')
const React = require('react'), TR = require('react-test-renderer')
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const out = []; let fails = 0, n = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + String(id).padEnd(4) + ' ' + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 700) : '')) }
const FILE = process.env.TT_FILE || 'tt.compiled.js'
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const textOf = x => x == null ? '' : typeof x === 'string' ? x : Array.isArray(x) ? x.map(textOf).join(' ') : textOf(x.children)
const flush = async (k = 40) => { for (let i = 0; i < k; i++) await new Promise(r => setImmediate(r)) }
const rc = () => { const c = load(FILE, { React }); c.console.info = () => {}; c.console.warn = () => {}; return c }
const read = f => fs.readFileSync(path.join(__dirname, f), 'utf8')

// The owner's list, verbatim: [group, Thai, the owner's plain reading, English, the owner's "already in the bank" mark]
const OWNER = [
  [1, 'มวยไทย', 'muai-thai', 'Muay Thai', 1], [1, 'มวย', 'muai', 'boxing', 0], [1, 'นักมวย', 'nák-muai', 'boxer', 0], [1, 'ครูมวย', 'khruu-muai', 'boxing trainer', 0], [1, 'ไหว้ครู', 'wâai-khruu', 'teacher-honouring ceremony', 1],
  [2, 'ค่ายมวย', 'khâai-muai', 'boxing gym or camp', 0], [2, 'นวม', 'nuam', 'boxing glove', 0], [2, 'ผ้าพันมือ', 'phâa-phan-mue', 'hand wraps', 0], [2, 'กางเกงมวย', 'gaang-geeng-muai', 'boxing shorts', 0], [2, 'กระสอบทราย', 'grà-sàawp-saai', 'punching bag', 0],
  [3, 'ฝึก', 'fùk', 'to train', 0], [3, 'ซ้อม', 'sáawm', 'to practise, to spar', 0], [3, 'วอร์มอัพ', 'wáwm-àp', 'warm up', 0], [3, 'กระโดดเชือก', 'grà-dòot-chûueak', 'skip rope', 0], [3, 'ออกกำลังกาย', 'àawk-gam-lang-gaai', 'exercise', 1],
  [4, 'วิ่ง', 'wîng', 'run', 1], [4, 'แข็งแรง', 'khǎeng-raaeng', 'strong, healthy', 1], [4, 'เร็ว', 'reo', 'fast', 1], [4, 'แรง', 'raeng', 'strong, forceful', 1], [4, 'เหนื่อย', 'nùueai', 'tired', 1],
  [5, 'หัว', 'hǔua', 'head', 1], [5, 'แขน', 'khǎaen', 'arm', 1], [5, 'ขา', 'khǎa', 'leg', 1], [5, 'คาง', 'khaang', 'chin', 1], [5, 'ท้อง', 'tháawng', 'stomach', 1], [5, 'หน้าแข้ง', 'nâa-khâeng', 'shin', 0],
  [6, 'ต่อย', 'tàwi', 'punch', 1], [6, 'เตะ', 'dtè', 'kick', 1], [6, 'เข่า', 'khào', 'knee', 1], [6, 'ศอก', 'sàawk', 'elbow', 0], [6, 'หมัด', 'màt', 'fist, punch', 0],
  [7, 'ป้องกัน', 'bpâawng-gan', 'protect, defend', 1], [7, 'หลบ', 'lòp', 'to dodge', 0], [7, 'โจมตี', 'joom-dtii', 'to attack', 0], [7, 'ล้ม', 'lóm', 'to fall', 1], [7, 'ท่า', 'thâa', 'move, stance', 0],
  [8, 'เทรนเนอร์', 'thren-nâa', 'trainer', 0], [8, 'สนามมวย', 'sà-nǎam-muai', 'boxing stadium', 0], [8, 'เวที', 'wee-thii', 'stage', 0], [8, 'สังเวียน', 'sǎng-wiian', 'ring', 0], [8, 'กรรมการ', 'gam-ma-gaan', 'referee', 0],
  [9, 'ชั่งน้ำหนัก', 'châng-nám-nàk', 'weigh in', 0], [9, 'น้ำหนัก', 'nám-nàk', 'weight', 0], [9, 'ยก', 'yók', 'round (also "lift")', 1], [9, 'การแข่งขัน', 'gaan-khàeng-khǎn', 'competition', 1], [9, 'แข่ง', 'khàeng', 'to compete', 0],
  [10, 'ชก', 'chók', 'to punch, to box', 0], [10, 'สู้', 'sûu', 'to fight', 1], [10, 'ต่อสู้', 'dtàw-sûu', 'to fight, to struggle', 0], [10, 'คู่ต่อสู้', 'khûu-dtàw-sûu', 'opponent', 0], [10, 'น็อก', 'nók', 'knock out', 0],
  [11, 'ชนะ', 'chá-ná', 'win', 1], [11, 'แพ้', 'pháae', 'lose', 1], [11, 'แชมป์', 'chaem', 'champion', 0], [11, 'เชียร์', 'chiia', 'to cheer', 0], [11, 'ผู้ชม', 'phûu-chom', 'audience', 1],
  [12, 'เจ็บ', 'jèp', 'hurt', 1], [12, 'บาดเจ็บ', 'bàat-jèp', 'injured', 1], [12, 'เหงื่อ', 'ngùea', 'sweat', 0], [12, 'เลือด', 'lûeat', 'blood', 1]]
const GROUPS = ['The sport', 'Gym and gear', 'Training', 'Fitness', 'The body', 'Strikes', 'Moves', 'People and places', 'Competition', 'The fight', 'Result and crowd', 'How it feels']
const SIZES = [5, 5, 5, 5, 6, 5, 5, 5, 5, 5, 5, 4]
// the 33 romanisations as the dictionary stores them (the owner's reading → the dictionary's convention, RULES.md of thai-801-2500/phon): each change has its reason
const FINAL_PH = { 'มวย': 'muai', 'นักมวย': 'nák-muai', 'ครูมวย': 'khruu-muai', 'ค่ายมวย': 'khâai-muai', 'นวม': 'nuuam', 'ผ้าพันมือ': 'phâa-phan-muue', 'กางเกงมวย': 'gaang-geeng-muai',
  'กระสอบทราย': 'grà-sàawp-saai', 'ฝึก': 'fùk', 'ซ้อม': 'sáawm', 'วอร์มอัพ': 'waawm-àp', 'กระโดดเชือก': 'grà-dòot-chûeak', 'หน้าแข้ง': 'nâa-khâaeng', 'ศอก': 'sàawk', 'หมัด': 'màt', 'หลบ': 'lòp',
  'โจมตี': 'joom-dtii', 'ท่า': 'thâa', 'เทรนเนอร์': 'threen-nooe', 'สนามมวย': 'sà-nǎam-muai', 'เวที': 'wee-thii', 'สังเวียน': 'sǎng-wiian', 'กรรมการ': 'gam-ma-gaan', 'ชั่งน้ำหนัก': 'châng-nám-nàk',
  'น้ำหนัก': 'nám-nàk', 'แข่ง': 'khàaeng', 'ชก': 'chók', 'ต่อสู้': 'dtàaw-sûu', 'คู่ต่อสู้': 'khûu-dtàaw-sûu', 'น็อก': 'náwk', 'แชมป์': 'chaaem', 'เชียร์': 'chiia', 'เหงื่อ': 'ngùea' }
// where the tone engine (thaiPhoneticToneAdvisory) disagrees with a reading that the bank itself confirms: an engine limit, written down with the bank's own evidence
const ENGINE_LIMITS = { 'วอร์มอัพ': [/^àp-/, 991], 'โจมตี': [/ii$/, 1631], 'เวที': [/thii$/, null], 'แชมป์': [null, null] }
const COMPOSABLE = ['กางเกงมวย', 'ครูมวย', 'คู่ต่อสู้', 'ต่อสู้']
const LIT = JSON.parse(/^const RAW_VOCAB = (\[.*\])\s*$/m.exec(read('tt.jsx'))[1])

function learner(c) {
  const v = c.initVocab().map(w => ({ ...w }))
  v.forEach(w => { const ci = w.curriculumIndex
    if (ci >= 1 && ci <= 311) { w.status = 'learning'; w.introducedAt = '2026-08-01'; w.lastSeen = '2026-09-20'; w.okStreak = 1; w.interval = 3; w.dueDate = '2026-09-2' + (ci % 7); w.difficulty = 'medium' }
    else { if (w.status !== 'locked') w.status = 'new'; w.lastSeen = null; w.introducedAt = null; w.dueDate = null; w.okStreak = 0 } })
  return v
}
const introduce = (w, extra = {}) => Object.assign(w, { status: 'learning', introducedAt: '2026-09-01', lastSeen: '2026-09-25', okStreak: 1, interval: 3, dueDate: '2026-09-30', difficulty: 'medium' }, extra)
const py = (args, input) => { try { const r = cp.spawnSync('python3', args, { cwd: __dirname, encoding: 'utf8', timeout: 180000 }); return r } catch (e) { return { status: -1, stdout: '', stderr: String(e) } } }
const pyOk = (() => { const r = py(['-c', 'import pythainlp']); return r.status === 0 })()

;(async () => {
  const c = rc()
  const TOP = c.topicById('th', 'muay-thai'), WED = c.topicById('th', 'wedding-speech')
  const ids = TOP ? TOP.vocabIds.slice() : []
  const canon = c.thaiCanonicalById(), RAW = c.ev('RAW_VOCAB')
  const created = new Set(((TOP || {}).seed || {}).created.map(x => x.id)), reused = ((TOP || {}).seed || {}).reused || []

  // ══ A  the registry ══
  T('A1', 'Muay Thai is registered for Thai next to Wedding Speech (in that order), available, with an icon, a description and a scene hint; Japanese, Mandarin and Cantonese have no topics',
    !!TOP && same(c.topicsFor('th').map(t => t.id), ['wedding-speech', 'muay-thai']) && TOP.title === 'Muay Thai' && TOP.available === true && !!TOP.icon && TOP.description.length > 40 && TOP.sceneHint.length > 20 &&
    c.ev('LANGUAGE_TOPICS').ja.length === 0 && c.ev('LANGUAGE_TOPICS').zh.length === 0 && c.ev('LANGUAGE_TOPICS').yue.length === 0, c.topicsFor('th').map(t => t.id))

  // ══ B  the 60 words ══
  T('B1', '60 topic entries, 60 distinct ids, every one resolves to a canonical record whose Thai is the owner\'s word at the owner\'s position',
    ids.length === 60 && new Set(ids).size === 60 && ids.every((id, k) => canon.get(id) && canon.get(id).t === OWNER[k][1]), ids.map((id, k) => canon.get(id) && canon.get(id).t === OWNER[k][1] ? null : [k + 1, id]).filter(Boolean).slice(0, 5))
  const mark = OWNER.filter(w => w[4]).map(w => w[1])
  const litByThai = new Map(); LIT.forEach(d => { if (d && d.t && !d.dup && !litByThai.has(d.t)) litByThai.set(d.t, d) })
  const inBank = OWNER.filter(w => litByThai.has(w[1])).map(w => w[1])
  T('B2', 'the owner\'s ✓ marks are right: exactly the 27 words marked ✓ are in the real bank (source literal), the 33 others are not (no word is in the bank under the same spelling twice)',
    mark.length === 27 && same(inBank, mark) && reused.length === 27 && same(reused.map(x => canon.get(x.id).t), mark), { inBank: inBank.length, marked: mark.length, wrong: mark.filter(t => !inBank.includes(t)).concat(inBank.filter(t => !mark.includes(t))) })
  // ออกกำลังกาย (1444) sits at position 1454 at run time although the source literal has it unranked: the phrase / word split (v738) promotes it, and that is not this topic's doing
  const promoted = new Set(c.ev('THAI_PHRASE_SPLIT_DATA').promoted.map(p => p[0]))
  T('B3', 'the 27 reused words keep their bank id (the id of the same Thai in the source literal); their curriculum position, belt and romanisation are untouched (apart from the 55 words the phrase / word split promotes); they only gain the topic membership',
    reused.every(x => { const d = litByThai.get(canon.get(x.id).t), r = canon.get(x.id); return d && d.id === x.id && r.ph === d.ph && (r.topics || []).includes('muay-thai') && (promoted.has(x.id) || (r.curriculumIndex === d.curriculumIndex && r.belt === d.belt && r.beltOrder === d.beltOrder)) }),
    reused.filter(x => { const d = litByThai.get(canon.get(x.id).t), r = canon.get(x.id); return !(d && d.id === x.id && r.ph === d.ph && (promoted.has(x.id) || r.curriculumIndex === d.curriculumIndex)) }).map(x => x.id))
  const newRecs = [...created].map(id => canon.get(id))
  T('B4', 'the 33 new words are new records: ids 5501 + their position (5502–5559), clear of the Wedding Speech ids 5001–5050 and of the curriculum from 6001, no collision with any record of the source literal',
    created.size === 33 && [...created].every(id => id > 5050 && id < 6001 && id === 5501 + ids.indexOf(id)) && !LIT.some(d => created.has(d.id)) && new Set(RAW.map(d => d.id)).size === RAW.length, [...created].slice(0, 5))
  T('B5', 'new records are created exactly like the Wedding Speech ones: unranked (curriculumIndex 0, "Beyond curriculum", beltOrder 0), topicOnly, membership [muay-thai], unintroduced, QC PASS, bucket TOPIC; initVocab starts them "new"',
    newRecs.every(r => r.curriculumIndex === 0 && r.belt === 'Beyond curriculum' && !r.beltOrder && r.topicOnly === true && same(r.topics, ['muay-thai']) && r.l === 'new' && !r.r && r.semanticQc === 'PASS' && r.phoneticQc === 'PASS' && r.qcStatus === 'PASS' &&
      r.lexiconDisposition === 'ACTIVE' && r.curriculumBucket === 'TOPIC' && r.id === r.id) && c.initVocab().filter(w => created.has(w.id)).every(w => w.status === 'new' && !c.hasBeenIntroduced(w)),
    newRecs.filter(r => !(r.topicOnly && r.curriculumIndex === 0)).map(r => r.t))
  const heads = new Map(); RAW.forEach(d => { if (d && d.t && !d.dup) heads.set(d.t, (heads.get(d.t) || 0) + 1) })
  T('B6', 'no duplicate Thai surface: each of the 60 words is exactly one live headword in the dictionary (none of the 33 existed before, none is added twice), and no new surface equals a retired alias',
    OWNER.every(w => heads.get(w[1]) === 1) && OWNER.filter(w => !w[4]).every(w => !litByThai.has(w[1])) && new Set(OWNER.map(w => w[1])).size === 60, OWNER.filter(w => heads.get(w[1]) !== 1).map(w => [w[1], heads.get(w[1])]))
  // two older headwords are repeated in the source literal itself (ถือ 336 / 622, ทั้งหมด 852 / 1090); the topics add none
  const litDup = new Map(); LIT.forEach(d => { if (d && d.t && !d.dup) litDup.set(d.t.normalize('NFC'), (litDup.get(d.t.normalize('NFC')) || 0) + 1) })
  const dupNow = [...heads].filter(([, k]) => k > 1).map(([t]) => t).sort(), dupLit = [...litDup].filter(([, k]) => k > 1).map(([t]) => t).sort()
  T('B7', 'the whole live dictionary has no repeated headword after both topics are seeded, other than the two already repeated in the source literal (ถือ, ทั้งหมด)', same(dupNow, dupLit) && same(dupLit, ['ถือ', 'ทั้งหมด'].sort()), { dupNow, dupLit })
  const idemp = c.seedThaiTopicEntries(RAW.map(d => ({ ...d })), c.ev('TOPIC_MUAY_THAI_TH'), 'muay-thai', c.ev('THAI_MUAY_ID_BASE'))
  T('B8', 'reinitialising the topic is idempotent: a second seed creates 0 records, reuses all 60 and returns the same ids',
    idemp.created.length === 0 && idemp.reused.length === 60 && same(idemp.ids, ids), { created: idemp.created.length, reused: idemp.reused.length })

  // ══ C  words with another sense ══
  const yok = canon.get(1431), yokLit = litByThai.get('ยก')
  T('C1', 'ยก is the bank word "lift" (id 1431, curriculum 694) and gains the topic sense "a round (of a fight)" on its ONE record: id, position and romanisation unchanged, the old gloss kept in senseBefore, note and usage note name both senses',
    yok && yok.id === 1431 && yok.curriculumIndex === 694 && yok.ph === yokLit.ph && /lift/.test(yok.e) && /round/.test(yok.e) && yok.senseBefore && yok.senseBefore.e === 'lift' && /round/.test(yok.note) && /lift/.test(yok.note) && /ยกที่/.test(yok.usageNote) && yok.senseId === 'ยก:lift+round', yok)
  T('C2', 'the other multi-sense bank words keep their bank gloss and id (สู้ "to fight, to rally", แพ้ "lose, be defeated; be allergic to", ป้องกัน "prevent / protect", ผู้ชม "viewer / audience") — the topic sense is already inside the bank sense',
    [['สู้', 1018], ['แพ้', 1023], ['ป้องกัน', 7291], ['ผู้ชม', 7264]].every(([t, id]) => canon.get(id) && canon.get(id).t === t && canon.get(id).e === litByThai.get(t).e && ids.includes(id)))
  T('C3', 'composable compounds follow the 801–2500 decision: exactly ครูมวย, กางเกงมวย, ต่อสู้, คู่ต่อสู้ keep the compositional rule (composable); the loan word เทรนเนอร์ and the opaque compounds (น้ำหนัก, กรรมการ, ค่ายมวย…) are lessons of their own',
    same(newRecs.filter(r => r.composable).map(r => r.t).sort(), COMPOSABLE.slice().sort()) && newRecs.filter(r => !r.composable).every(r => c.ev('thaiHasOwnLesson')(r.t)) && COMPOSABLE.every(t => !c.ev('thaiHasOwnLesson')(t)),
    { composable: newRecs.filter(r => r.composable).map(r => r.t), own: newRecs.filter(r => !r.composable && !c.ev('thaiHasOwnLesson')(r.t)).map(r => r.t) })

  // ══ D  romanisation ══
  const ph = th => (newRecs.find(r => r.t === th) || {}).ph
  const ownerPh = th => OWNER.find(w => w[1] === th)[2]
  T('D1', 'the 33 new records carry exactly the dictionary-convention readings (pinned): 11 differ from the owner\'s plain reading (long vowels: นวม nuuam, แข่ง khàaeng, หน้าแข้ง nâa-khâaeng, แชมป์ chaaem, ต่อสู้ dtàaw-sûu, คู่ต่อสู้ khûu-dtàaw-sûu; ɔɔ → aaw: วอร์มอัพ waawm-àp; short ɔ น็อก náwk; the bank\'s มือ muue: ผ้าพันมือ; เ-ือ uea: กระโดดเชือก chûeak; เทรนเนอร์ threen-nooe), 22 are the owner\'s',
    Object.keys(FINAL_PH).every(t => ph(t) === FINAL_PH[t]) && Object.keys(FINAL_PH).length === 33 && Object.keys(FINAL_PH).filter(t => FINAL_PH[t] !== ownerPh(t)).length === 11, Object.keys(FINAL_PH).filter(t => ph(t) !== FINAL_PH[t]).map(t => [t, ph(t)]))
  const FORMAT = /^[a-z]+(?:[àáâǎ]|[èéêě]|[ìíîǐ]|[òóôǒ]|[ùúûǔ])?[a-z]*(?:-[a-z]*(?:[àáâǎ]|[èéêě]|[ìíîǐ]|[òóôǒ]|[ùúûǔ])?[a-z]*)*$/
  const norm = s => s.normalize('NFC')
  T('D2', 'the readings pass the dictionary\'s format rules: lower case, hyphen between syllables, one tone mark at most per syllable on a vowel, no IPA letters (ɔ ə ʉ ɛ), no spaces; and they display through the app\'s own loader (loadCanonicalThaiPhonetic) without turning into another reading',
    newRecs.every(r => { const p = norm(r.ph); return FORMAT.test(p) && !/[ɔəʉɛɤŋ]/.test(p) && p.split('-').every(s => (s.match(/[àáâǎèéêěìíîǐòóôǒùúûǔ]/g) || []).length <= 1) && c.loadCanonicalThaiPhonetic(r.ph, r.t).length > 0 }), newRecs.filter(r => !FORMAT.test(norm(r.ph))).map(r => [r.t, r.ph]))
  const adv = c.ev('thaiPhoneticToneAdvisory'), disagree = newRecs.filter(r => !adv(r.t, r.ph).ok).map(r => r.t).sort()
  T('D3', 'the app\'s tone engine (thaiPhoneticToneAdvisory) agrees with every new reading except four where the engine itself mis-splits the Thai and the bank confirms the reading: วอร์มอัพ (อัพ is àp in อัพโหลด; น็อก náwk is the ending of the bank\'s หมวกกันน็อก, and the v684 checker of tests44 misreads ็อ), โจมตี and เวที (a final ตี / ที is mid, as in the bank\'s ตี dtii), แชมป์ (the silent ป์ is not a final)',
    same(disagree, Object.keys(ENGINE_LIMITS).sort()) && RAW.find(d => d.id === 991).ph.startsWith('àp-') && RAW.find(d => d.id === 1631).ph === 'dtii' && /náwk$/.test(RAW.find(d => d.t === 'หมวกกันน็อก').ph) && RAW.some(d => /ที$/.test(d.t) && /thii$/.test(d.ph || '')), { disagree })
  const lex = c.buildThaiPhoneticLexicon(c.initVocab())
  T('D4', 'each new word\'s reading is what the track phonetics compose for it: validateThaiPhoneticAlignment of the word against its own displayed reading finds no conflict, and composeThaiPhonetic reproduces it',
    newRecs.every(r => { const disp = c.loadCanonicalThaiPhonetic(r.ph, r.t); return c.validateThaiPhoneticAlignment(r.t, disp, lex).ok && c.thaiPhoneticMatchKey(c.composeThaiPhonetic(r.t, lex).phonetic) === c.thaiPhoneticMatchKey(disp) }),
    newRecs.filter(r => { const disp = c.loadCanonicalThaiPhonetic(r.ph, r.t); return !c.validateThaiPhoneticAlignment(r.t, disp, lex).ok || c.thaiPhoneticMatchKey(c.composeThaiPhonetic(r.t, lex).phonetic) !== c.thaiPhoneticMatchKey(disp) }).map(r => [r.t, r.ph, c.composeThaiPhonetic(r.t, lex).phonetic]))

  // ══ E  groups ══
  const L0 = learner(c)
  const prog = c.topicProgress('th', 'muay-thai', L0)
  const groupsSeen = []; prog.words.forEach(w => { if (!groupsSeen.length || groupsSeen[groupsSeen.length - 1][0] !== w.group) groupsSeen.push([w.group, 0]); groupsSeen[groupsSeen.length - 1][1]++ })
  T('E1', 'the 12 groups are the owner\'s, in order, with 5·5·5·5·6·5·5·5·5·5·5·4 words: "The body" holds its 6 (หัว แขน ขา คาง ท้อง หน้าแข้ง) and "How it feels" its 4; every word sits in the owner\'s group',
    same(groupsSeen, GROUPS.map((g, i) => [g, SIZES[i]])) && prog.words.every((w, k) => w.group === GROUPS[OWNER[k][0] - 1]) && same(TOP.groupSizes, SIZES) && SIZES.reduce((a, b) => a + b) === 60, groupsSeen)
  T('E2', 'Wedding Speech is unchanged: the same 50 ids 5001–5050 in the owner\'s order with five words per group (the fixed groupSize still works next to groupSizes)',
    WED.vocabIds.length === 50 && WED.vocabIds.every((id, k) => id === 5001 + k) && WED.groupSize === 5 && !WED.groupSizes && c.topicProgress('th', 'wedding-speech', L0).words[0].group === 'Opening and gratitude' && c.topicProgress('th', 'wedding-speech', L0).words[49].group === 'Additional expression' &&
    c.topicProgress('th', 'wedding-speech', L0).words[5].group === 'Thanking the families' && WED.seed.created.length + WED.seed.reused.length === 50 && WED.seed.created.length === 24)

  // ══ F  the Topic Track ══
  const eligibleNew = id => { const w = L0.find(x => x.id === id); return !c.hasBeenIntroduced(w) }
  const s0 = c.selectThaiTopicTargets(L0, 'muay-thai')
  const want5 = ids.filter(eligibleNew).slice(0, 5)
  T('F1', 'every one of the 60 words is a legal drill target (dictionary eligibility OK and suitable for a spoken drill): the topic words introduced elsewhere are only skipped because they are known already — in particular สังเวียน is not marked "written" by its usage note',
    L0.filter(w => ids.includes(w.id)).every(w => c.thaiVocabEligibility(w).ok && c.targetActivityPreflight(w, 'th', {}).suitable) && s0.topicSkipped.length === 0, L0.filter(w => ids.includes(w.id) && !c.targetActivityPreflight(w, 'th', {}).suitable).map(w => w.thai))
  T('F2', 'a Muay Thai Track selects up to five NEW topic words in the topic\'s priority order (the ones not introduced yet) + the global revision queue: 30 unique targets, nothing blocked',
    same(s0.selectedNewTargetIds, want5) && s0.targets.length === 30 && new Set(s0.targetIds).size === 30 && s0.selectedRevisionTargetIds.length === 25 && !s0.blocked && s0.topicId === 'muay-thai' && s0.topicTitle === 'Muay Thai', { got: s0.selectedNewTargetIds, want: want5 })
  {
    const byId = new Map(L0.map(w => [w.id, w]))
    const rv = c.selectThaiRevisionTargets(L0, 100000).targets.map(w => w.id)
    T('F3', 'the other 25 come from the existing revision queue in its order; no ordinary curriculum new word and no Wedding Speech word enters a Muay Thai Track',
      same(s0.selectedRevisionTargetIds, rv.filter(id => !s0.selectedNewTargetIds.includes(id)).slice(0, 25)) && s0.targetIds.filter(id => !ids.includes(id) && !c.hasBeenIntroduced(byId.get(id))).length === 0 && !s0.targetIds.some(id => WED.vocabIds.includes(id) && !c.hasBeenIntroduced(byId.get(id))))
    const L = learner(c); want5.forEach(id => introduce(L.find(w => w.id === id)))
    const s = c.selectThaiTopicTargets(L, 'muay-thai')
    T('F4', 'after those five are introduced the next five follow (the group "Gym and gear" starts after "The sport")', same(s.selectedNewTargetIds, ids.filter(id => !want5.includes(id) && !c.hasBeenIntroduced(L.find(w => w.id === id))).slice(0, 5)) && s.selectedNewTargetIds.length === 5, s.selectedNewTargetIds)
    const L2 = learner(c); ids.forEach(id => introduce(L2.find(w => w.id === id)))
    const s2 = c.selectThaiTopicTargets(L2, 'muay-thai'), p2 = c.topicProgress('th', 'muay-thai', L2)
    T('F5', 'all 60 introduced → a revision-only track (0 new + 30 revision) and the "All topic words introduced" state; progress counts 60',
      s2.selectedNewTargetIds.length === 0 && s2.selectedRevisionTargetIds.length === 30 && !s2.blocked && p2.allIntroduced && p2.total === 60 && p2.remaining === 0, { nw: s2.selectedNewTargetIds.length, p: [p2.total, p2.introduced] })
    // Wedding Speech selection is the same with and without the second topic
    const sw = c.selectThaiTopicTargets(L0, 'wedding-speech')
    T('F6', 'Wedding Speech is untouched by the second topic: first track = its first five words, the other 25 from the revision queue, nothing blocked',
      same(sw.selectedNewTargetIds, WED.vocabIds.slice(0, 5)) && sw.targets.length === 30 && !sw.blocked && !sw.selectedNewTargetIds.some(id => ids.includes(id)))
    // the topic words are not picked by the ordinary Daily picker
    const topicOnlyIds = [...created]
    const pick = c.pickWords(L0, 'daily', []); const dailyIds = (pick.targets || []).map(w => w.id).concat((pick.reserve || []).map(w => w.id))
    T('F7', 'the ordinary Daily Track never introduces a new topic-only Muay Thai word (they only enter through their own Topic Track)', !dailyIds.some(id => topicOnlyIds.includes(id)) && L0.filter(w => topicOnlyIds.includes(w.id)).every(w => c.isEligibleNewTarget(w, new Set()) === false))
  }

  // ══ G  the screens ══
  {
    const cx = rc(); const L = learner(cx)
    cx.localStorage.setItem('tt-vocab', JSON.stringify(L)); cx.localStorage.setItem('tt-tracks', JSON.stringify([]))
    let r
    await TR.act(async () => { r = TR.create(React.createElement(cx.ThaiTeacher, { lang: 'th', onSetLang: () => {} })); await flush(60) })
    const entry = r.root.findAll(x => x.props && x.props['data-topics-entry'] === 'th' && x.type === 'button')[0]
    await TR.act(async () => { entry.props.onClick(); await flush(20) })
    const view = textOf(r.toJSON()).replace(/\s+/g, ' ')
    const cards = r.root.findAll(x => x.props && x.props['data-topic-card'] && typeof x.type === 'string').map(x => x.props['data-topic-card'])
    const gen = r.root.findAll(x => x.props && x.props['data-topic-generate'] === 'muay-thai')
    const va = r.root.findAll(x => x.props && x.props['data-topic-view-all'] === 'muay-thai')[0]
    T('G1', 'the Thai Topics screen lists Wedding Speech then Muay Thai, with the description, "View all 60 words" and a "Generate Muay Thai Track" button; Wedding Speech keeps its own text and 50 words',
      same(cards, ['wedding-speech', 'muay-thai']) && /Muay Thai/.test(view) && view.includes(TOP.description) && /View all 60 words/.test(view) && /Generate Muay Thai Track/.test(view) && gen.length === 1 &&
      view.includes('Learn useful Thai for thanking family, telling your story, making promises and celebrating your wedding.') && /View all 50 words/.test(view) && /Generate Wedding Speech Track/.test(view), { cards, view: view.slice(0, 300) })
    const btn = r.root.findAll(x => x.type === 'button').find(b => b.findAll(y => y === va).length)
    await TR.act(async () => { btn.props.onClick(); await flush(20) })
    const rows = r.root.findAll(x => x.props && x.props['data-topic-word'] != null && typeof x.type === 'string')
    const t2 = textOf(r.toJSON()).replace(/\s+/g, ' ')
    const pos = GROUPS.map(g => t2.toUpperCase().indexOf(g.toUpperCase()))
    T('G2', '"View all 60 words" lists the 60 in priority order, each with number, Thai, reading, English and status, under the 12 group headings in the owner\'s order (the 6-word body group and the 4-word last group included)',
      rows.length === 60 && same(rows.map(x => +x.props['data-topic-word']), ids) && pos.every((p, i) => p >= 0 && (i === 0 || p > pos[i - 1])) && /🥊/.test(t2) && textOf(rows[25].children).includes('หน้าแข้ง') && /nâa-khâaeng/.test(textOf(rows[25].children)) && /Not introduced/.test(textOf(rows[1].children)) &&
      textOf(rows[0].children).includes('มวยไทย') && textOf(rows[59].children).includes('เลือด'), { rows: rows.length, pos })
    await TR.act(async () => { r.unmount() })
  }

  // ══ H  modules: the 33 new tags, the cells, what is missing ══
  const cx = rc()
  const data = (() => { const m = /const THAI_MODULES_GZ = "([^"]+)"/.exec(read('tt.jsx')); return JSON.parse(require('zlib').gunzipSync(Buffer.from(m[1], 'base64')).toString('utf8')) })()
  cx.thaiModulesSetEnabled(true); cx.thaiModulesUseData(data)
  const CELLS = { 'มวย': 'N_EVENT.BOXING', 'นักมวย': 'N_PERSONROLE.FIGHT', 'ครูมวย': 'N_PERSONROLE.FIGHT', 'เทรนเนอร์': 'N_PERSONROLE.FIGHT', 'กรรมการ': 'N_PERSONROLE.FIGHT', 'คู่ต่อสู้': 'N_PERSONROLE.FIGHT', 'แชมป์': 'N_PERSONROLE.FIGHT',
    'ค่ายมวย': 'N_PLACE.FIGHT', 'สนามมวย': 'N_PLACE.FIGHT', 'เวที': 'N_PLACE.RING', 'สังเวียน': 'N_PLACE.RING', 'นวม': 'N_ITEM.GEAR', 'ผ้าพันมือ': 'N_ITEM.GEAR', 'กางเกงมวย': 'N_ITEM.GEAR', 'กระสอบทราย': 'N_ITEM.GEAR',
    'ฝึก': 'V_ROUTINE.TRAIN', 'ซ้อม': 'V_ROUTINE.TRAIN', 'วอร์มอัพ': 'V_ROUTINE.TRAIN', 'กระโดดเชือก': 'V_ROUTINE.TRAIN', 'หน้าแข้ง': 'N_BODY.COMBAT', 'ศอก': 'N_BODY.COMBAT', 'หมัด': 'N_BODY.COMBAT', 'เหงื่อ': 'N_BODY.SWEAT',
    'ชก': 'V_HANDLE.STRIKE', 'โจมตี': 'V_HANDLE.STRIKE', 'น็อก': 'V_HANDLE.STRIKE', 'หลบ': 'V_MOVE.DODGE', 'ท่า': 'N_ABSTRACT.MOVE', 'น้ำหนัก': 'N_ABSTRACT.WEIGHT', 'ชั่งน้ำหนัก': 'V_HANDLE.WEIGH',
    'แข่ง': 'V_SOCIAL.COMPETE', 'ต่อสู้': 'V_SOCIAL.COMPETE', 'เชียร์': 'V_SOCIAL.CHEER' }
  const tagOf = id => data.t[String(id)]
  T('H1', 'all 33 new words carry a module tag in the embedded data (id, Thai, tier T4, group, cell, English slot) with the cells of the plan (15 new cells); ต่อย moved out of the car cell into the strike cell',
    [...created].every(id => { const t = tagOf(id), th = canon.get(id).t; return t && t[0] === th && t[1] === 4 && t[4] === CELLS[th] && t[2] === CELLS[th].split('.')[0] && t[6] }) && new Set(Object.values(CELLS)).size === 15 && tagOf(679)[4] === 'V_HANDLE.STRIKE' && tagOf(679)[1] === 4,
    [...created].filter(id => !tagOf(id)).map(id => canon.get(id).t))
  // coverage of the topic words by the picker, counted the way the app counts: the modules a learner of the highest tier can be offered for the word (tier or above, own cell + links)
  const need = t => (t[1] <= 2 ? 4 : 3)
  const planned = new Set(); for (let k = 1; k <= 8; k++) fs.readFileSync(path.join(__dirname, 'thai-modules', 'drafts-muaythai', 'MT0' + k + '.csv'), 'utf8').split(/\r?\n/).slice(1).filter(Boolean).forEach(l => planned.add(l.split(',')[1]))
  const short = ids.filter(id => { const t = tagOf(id); return !t || cx.thaiModuleCandidates({ id, thai: canon.get(id).t }, 5).length < need(t) })
  T('H2', 'every topic word can be offered at least the modules the coverage rule asks for (3, or 4 for T1–T2 words; counted as the app counts them: its cell and its links, its tier or above) — except words whose cell is still to be written by the module writers (the 8 batch sheets: the new cells plus the T2 blood cell)',
    short.every(id => planned.has(tagOf(id)[4] || tagOf(id)[2])) && planned.size === 16, short.filter(id => !planned.has(tagOf(id)[4] || tagOf(id)[2])).map(id => canon.get(id).t))
  // the Python tools
  const csv = f => fs.readFileSync(path.join(__dirname, 'thai-modules', f), 'utf8').replace(/^﻿/, '').split(/\r?\n/).filter(Boolean)
  const tw = csv('topic-muay-thai-words.csv').slice(1).map(l => l.split(','))
  T('H3', 'the topic word list the module writers read (thai-modules/topic-muay-thai-words.csv) is the app\'s topic: 60 rows, same ids, order, status (27 reused, 33 new) and groups',
    tw.length === 60 && tw.every((r, k) => +r[2] === ids[k] && r[4] === (created.has(ids[k]) ? 'new' : 'reused') && r[1].replace(/"/g, '') === GROUPS[OWNER[k][0] - 1]))
  if (pyOk) {
    const r = py(['tools/check_thai_drafts.py', 'thai-modules/drafts-muaythai/MT00-sample-modules.csv', '--quiet'])
    T('H4', 'the draft checker passes the three hand-written sample modules (closed vocabulary at T4, line lengths, particles, slots, English filling for every word each fits, serves_ids mechanics)', (r.status === 0 && /0 problem/.test(r.stdout)) || (r.status === 1 && /problem/.test(r.stdout) && r.stdout.split('\n').filter(l => /^PROBLEM/.test(l)).every(l => /module id already used in thai-modules\.csv|opens like the merged module/.test(l))), (r.stdout + r.stderr).slice(0, 400))
    // 18 Nov: the writers' modules (MT01..MT08) are merged now, and the three sample modules carry the same ids as three real modules (N_BODY.COMBAT-T4-01 ...), so the checker's only complaints about
    // the sample are that those ids are already used in thai-modules.csv and that its first words open like the merged module. Before the merge it reported 0 problems; every OTHER kind of problem would still fail this test.
    const bad = path.join(__dirname, 'thai-modules', 'drafts-muaythai', 'MT00-sample-modules.csv')
    const rows = fs.readFileSync(bad, 'utf8').replace(/^﻿/, '').split(/\r?\n/).filter(Boolean)
    const tmp = path.join(require('os').tmpdir(), 'tests99-bad-drafts.csv')
    const hdr = rows[0], r1 = rows[2].replace('V_ROUTINE.TRAIN-T4-01', 'V_ROUTINE.TRAIN-T4-02').replace('ตอนเช้าผมชอบ{W}ที่สวน', 'ตอนเช้าผมชอบ{W}กับครูมวยที่สวน')
    fs.writeFileSync(tmp, '﻿' + [hdr, r1].join('\r\n') + '\r\n')
    const rb = py(['tools/check_thai_drafts.py', tmp, '--quiet'])
    T('H5', 'the draft checker REFUSES a module whose fixed text uses a new topic-only word (a learner who has not met it fails the vocabulary gate)', rb.status === 1 && /topic-only word ครูมวย/.test(rb.stdout), (rb.stdout + rb.stderr).slice(0, 400))
    const rm = py(['tools/merge_thai_drafts.py', '--dry-run'])
    T('H6', 'the merge step reads only the writers\' files MT01..MT08-modules.csv (the hand-written sample MT00 is never merged); the dry run writes nothing: with no files it says so, with files it checks and reports counts',
      (rm.status === 1 && /no drafts/.test(rm.stdout)) || (rm.status === 0 && /modules, \d+ module-links rows/.test(rm.stdout)) || (rm.status === 1 && rm.stdout.split('\n').filter(l => /^PROBLEM/.test(l)).length > 0 && rm.stdout.split('\n').filter(l => /^PROBLEM/.test(l)).every(l => /module id already used in thai-modules\.csv|opens like the merged module/.test(l))), (rm.stdout + rm.stderr).slice(0, 300))
    // 18 Nov: after the real merge, a second run refuses every draft ("module id already used": a draft can never be merged twice); that refusal (an id already used, an opening that clashes with the merged copy of the same module), and nothing else, is the third accepted answer
    const rn = py(['tools/thai_module_crossuse.py', 'need', '--topic', 'thai-modules/topic-muay-thai-words.csv'])
    const rowsN = rn.stdout.split('\n').slice(1).filter(Boolean).map(l => l.split('\t'))
    const flagged = rowsN.filter(r => +r[7] < +r[4])
    T('H7', 'the need report covers the 60 words, and every word below its need (own tier, with the safe links) sits in a cell the batch sheets assign: the new words except แชมป์ (a safe link lifts it to 3), ต่อย (its cell moved) and เลือด (3 of the 4 a T2 word needs)',
      rn.status === 0 && rowsN.length === 60 && flagged.every(r => planned.has(r[3])) && flagged.length >= 1 && !flagged.some(r => r[1] === 'แชมป์') && ['ต่อย', 'เลือด'].every(t => flagged.some(r => r[1] === t)) || (rn.status === 0 && rowsN.length === 60 && flagged.length === 0), flagged.map(r => r[1]))
  } else {
    T('H4', 'the draft checker, the merge and the need report need python3 + pythainlp (not installed here): SKIPPED — run `pip install pythainlp` and rerun', true)
  }

  // ══ I  cross-use links ══
  const links = csv('thai-module-word-links.csv').slice(1).map(l => { const m = /^([^,]+),(\d+),/.exec(l); return m ? [m[1], m[2]] : null }).filter(Boolean)
  const mi = new Map(data.m.map((r, k) => [r[0], k]))
  const emb = new Set(); Object.entries(data.x || {}).forEach(([w, l]) => l.forEach(k => emb.add(data.m[k][0] + '|' + w)))
  const lt = new Map(); const ok = []
  links.forEach(([mid, wid]) => { const m = data.m[mi.get(mid)], tg = data.t[wid]; ok.push(!!m && !!tg && m[2] >= tg[1] && !(m[3] || '').split(';').includes(wid) && m[1][0] === tg[2][0]) })
  T('I1', 'every applied cross-use link is valid: the module exists, the word has a tag, the module\'s tier is the word\'s or higher, the module does not exclude the word, and both are of the same part of speech (N / V / A / X group); the embedded data holds exactly the applied rows',
    links.length > 0 && ok.every(Boolean) && same([...emb].sort(), links.map(([m, w]) => m + '|' + w).sort()), { links: links.length, bad: links.filter((_, i) => !ok[i]).slice(0, 3), emb: emb.size })
  {
    // the picker: a word gets the modules of its own cell first and then the linked ones; exclusions and the tier rule still hold
    const mod = (id, group, tier, ex) => [id, group, tier, ex || '', '{W}ก', 'a', 'p', 'ข{W}', 'b', 'q', 'ค{W}', 'c', 'r', 'home', 'ask']
    const tag = (th, tier, g, sub) => [th, tier, g, '', sub, '', 'x', '', '']
    const syn = { v: 't', t: { 1: tag('ก', 3, 'N_A', 'N_A.ONE'), 2: tag('ข', 3, 'N_A', 'N_A.TWO'), 3: tag('ค', 4, 'N_A', 'N_A.TWO'), 4: tag('ง', 3, 'N_A', 'N_A.THREE') },
      m: [mod('A-T3-01', 'N_A.ONE', 3), mod('B-T3-01', 'N_A.TWO', 3), mod('B-T3-02', 'N_A.TWO', 3, '1;2'), mod('B-T4-01', 'N_A.TWO', 4), mod('B-T2-01', 'N_A.TWO', 2)], x: { 1: [1, 2, 3, 4] } }
    cx.thaiModulesUseData(syn)
    const cands = tid => cx.thaiModuleCandidates({ id: tid, thai: syn.t[tid][0] }, 5).map(x => x.m.id)
    const c1 = cands(1), c2 = cands(2), c4 = cands(4)
    T('I2', 'the picker serves a word its own cell first (each tier) and then the modules linked to it; a linked module that excludes the word, or whose tier is below the word\'s, is never offered; words without links are unchanged',
      same(c1, ['B-T4-01', 'A-T3-01', 'B-T3-01']) && same(c2, ['B-T4-01', 'B-T3-01']) && c4.length === 0, { c1, c2, c4 })
    cx.thaiModulesUseData(data)
  }
  const wl = fs.existsSync(path.join(__dirname, 'thai-modules', 'thai-module-word-links.csv')) && fs.existsSync(path.join(__dirname, 'thai-modules', 'thai-module-word-links-review.csv'))
  T('I3', 'the cross-use tool and its files exist and are documented: applied links, the review list with a note per row, the peers file for the new words, the tool that writes them, the embed step that carries them',
    wl && ['tools/thai_module_crossuse.py', 'tools/thai_modules_lib.py', 'tools/build_thai_modules.py', 'tools/check_thai_drafts.py', 'tools/merge_thai_drafts.py', 'tools/plan_muaythai_batches.py', 'thai-modules/thai-module-peers.csv', 'thai-modules/BRIEF_MUAYTHAI.md', 'thai-modules/TOPICS-HOWTO.md'].every(f => fs.existsSync(path.join(__dirname, f))) &&
    /noun twin/.test(read('tools/thai_module_crossuse.py')) && /thai-module-word-links/.test(read('tools/build_thai_modules.py')) && csv('thai-module-peers.csv').length === 34)
  if (pyOk) {
    const r = py(['tools/thai_module_crossuse.py', 'report'])
    T('I4', 'the cross-use report runs and states the coverage gain (words lifted to their need by the safe links, and the upper bound if the strong review rows were approved)', r.status === 0 && /words below their need/.test(r.stdout) && /if every review-strong row were approved/.test(r.stdout), r.stdout.slice(-400) + r.stderr.slice(-200))
  }

  console.log(out.join('\n'))
  console.log('\nv761 Muay Thai topic: ' + (n - fails) + '/' + n + (fails ? ' — ' + fails + ' FAIL' : ' — ALL PASS'))
  process.exit(fails ? 1 : 0)
})().catch(e => { console.error(e); process.exit(2) })
