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

  const guide = c.ev('THAI_NATURALNESS_GUIDE_V701')
  const keys = ['ที่ป้ายรถเมล์ร้อนมากเลยครับ', 'เดี๋ยวผมเอาช้อนมาให้นะครับ', 'ถ้าถูกก็ซื้อครับ', 'ศูนย์ครับ ไม่ใช่สอง', 'บางที', 'ร้านอาหาร is a restaurant', 'facts stay true for the whole lesson']
  T('W1', 'the shared Thai guide carries the v704 lessons (word order, offers, conditionals, corrections, บางที, ร้านอาหาร, answers and facts that stay true)', keys.every(k => guide.includes(k)), keys.filter(k => !guide.includes(k)))
  const src = require('fs').readFileSync('tt.jsx', 'utf8')
  const uses = (src.match(/THAI_NATURALNESS_GUIDE \+ \(dailyV693On\(\) \? THAI_NATURALNESS_GUIDE_V701/g) || []).length + (src.match(/\+ \(dailyV693On\(\) \? THAI_NATURALNESS_GUIDE_V701 : ''\) \+ '\\n'/g) || []).length
  T('W2', 'both the writer prompt and the native-speaker reviewer include that guide (one standard for both)', uses >= 2, uses)

  out.forEach(l => console.log(l))
  console.log('\nv704 Thai Daily quality round: ' + (n - fails) + '/' + n + ' passed' + (fails ? ' — ' + fails + ' FAILED' : ''))
  process.exit(fails ? 1 : 0)
})().catch(e => { out.forEach(l => console.log(l)); console.error(e); process.exit(1) })
