// node prep.js → prep.json: final readings for the new records (dictionary parts, else the authored reading normalised to the
// dictionary's own vowel spellings), the app's tone check on each, the runtime topic records to copy, and the "composable" flag
const fs = require('fs'), path = require('path')
const DIR = __dirname, DEV = path.join(DIR, '..', '..', '..')
const { load } = require(path.join(DEV, 'harness.js'))
const c = load(path.join(DEV, 'tt.compiled.js'), { realBelt: true }), RT = c.ev('RAW_VOCAB'), tone = c.ev('thaiPhoneticToneAdvisory')
const plan = JSON.parse(fs.readFileSync(path.join(DIR, 'plan.json'), 'utf8'))
const composed = JSON.parse(fs.readFileSync(path.join(DIR, 'phon-composed.json'), 'utf8'))
const authored = {}; for (let k = 1; k <= 8; k++) JSON.parse(fs.readFileSync(path.join(DIR, 'phon', 'done-' + k + '.json'), 'utf8')).forEach(x => { authored[x.slot] = x })
// the dictionary writes long ua as "uua" (ปวด bpùuat, หัว hǔua, ช่วย chûuai) and เ-ิ / เ-อ as "ooe" (เดิน dooen, เปิด bpòoet)
const norm = ph => String(ph).normalize('NFC').trim().replace(/\s+/g, '-')
  .replace(/(^|[^uùúûǔ])([uùúûǔ])a(?!e)/g, '$1$2ua').replace(/(^|[^oôóòǒ])([oôóòǒ])e(?!a)/g, '$1$2oe')
const STOP = new Set(['the', 'a', 'an', 'to', 'of', 'and', 'or', 'be', 'is', 'in', 'on', 'for', 'with', 'one', 'one\'s', 'someone', 'something', 'thing', 'person', 'up', 'out', 'do', 'make', 'get', 'have'])
const words = s => new Set(String(s || '').toLowerCase().replace(/\([^)]*\)/g, ' ').split(/[^a-z']+/).filter(w => w.length >= 3 && !STOP.has(w)))
const FUNC = new Set(['คุณ', 'ผม', 'ฉัน', 'เขา', 'เรา', 'อะไร', 'ไหน', 'ที่ไหน', 'ไหม', 'ไม่', 'ครับ', 'ค่ะ', 'คะ', 'นะ', 'อยู่', 'เป็น', 'มี', 'ได้', 'จะ', 'ก็', 'ด้วย', 'กัน', 'เลย', 'มัน', 'นี่', 'นั่น', 'นี้', 'นั้น', 'ใคร', 'เท่าไหร่', 'ยังไง', 'บ้าง'])
const head = new Map(); RT.forEach(d => { const t = String(d.t || ''); if (t && !d.dup && !/\s|\.\.\./.test(t) && !head.has(t)) head.set(t, d) })
const units = [...head.keys()].filter(t => t.length >= 2 || FUNC.has(t)).sort((a, b) => b.length - a.length)
function composable(t, en) {
  if (/^(ความ|การ)/.test(t)) return false
  const s = t.replace(/\s+/g, '').replace(/ๆ/g, ''); const parts = []; let i = 0
  while (i < s.length) { const hit = units.find(u => u !== t && s.startsWith(u, i)); if (!hit) return false; parts.push(hit); i += hit.length }
  if (parts.length < 2) return false
  if (parts.some(p => FUNC.has(p))) return true
  const mine = words(en), theirs = new Set(parts.flatMap(p => [...words(head.get(p).e)]))
  return [...mine].some(w => theirs.has(w) || [...theirs].some(x => x.length >= 4 && (w.startsWith(x) || x.startsWith(w))))
}
const out = { records: {}, topic: {}, stats: { composedPh: 0, authoredPh: 0, tonePass: 0, toneDispute: 0, composable: 0 } }
plan.forEach(p => {
  const r = { slot: p.slot, composable: composable(p.t, p.en) }; if (r.composable) out.stats.composable++
  if (p.id == null) {
    const cp = composed[p.slot], au = authored[p.slot]
    r.ph = cp ? cp.ph : au ? norm(au.ph) : ''; r.phSource = cp ? 'dictionary-parts' : 'authored'
    if (cp) out.stats.composedPh++; else out.stats.authoredPh++
    const tv = r.ph ? tone(p.t, r.ph) : { ok: false, suggested: '' }
    r.toneOk = !!tv.ok; r.toneSuggested = tv.ok ? null : tv.suggested; if (tv.ok) out.stats.tonePass++; else out.stats.toneDispute++
  }
  if (p.topicRecord) { const d = RT.find(x => x.id === p.id); out.topic[p.id] = d }
  out.records[p.slot] = r
})
fs.writeFileSync(path.join(DIR, 'prep.json'), JSON.stringify(out, null, 1))
console.log(JSON.stringify(out.stats), '· topic records', Object.keys(out.topic).length, '· missing readings', Object.values(out.records).filter(r => r.ph === '').length)
