// Rebuilds the stored 25 Sept 2026 Revision track from its diagnostic export.
// Stored fields the export did not print are reconstructed and labelled:
//  - speaker: from the cue ("He …" = A, "She …" = B)
//  - _source for the 9 TYPE-unknown lines: ai:improve:<target> — the exporter masked every
//    QC source as "ai:check-1"; these are the four target groups whose content lines are
//    missing and whose lines lost _target/pairType (only the improve path does that).
const fs = require('fs')
const RELEARN = ['ซึ่ง','ลา','เดือดร้อน','ขอให้เป็นวันที่ดี','ดูแลตัวเองด้วย','ขอให้สนุกกับวันนี้','ปลาหมึก','เนื้อ','หมื่น','แสน','ล้าน','ฝาก','ขนม','น้ำแข็ง','เกลือ','น้ำปลา']
const IMPROVED = { 3:'ซึ่ง', 4:'ซึ่ง', 5:'ซึ่ง', 9:'นอกจาก', 10:'นอกจาก', 38:'เนื้อ', 39:'เนื้อ', 67:'หมายถึง', 68:'หมายถึง' }
// v648: a build with the load-time provenance migration sees the stored legacy labels already
// rewritten (legacy-check-N:), exactly as the app does on load; older builds get them raw.
function legacySrc(ctx, raw) {
  if (typeof ctx.legacySourceLabel !== 'function') return raw || 'qwen:conv'   // the label pre-v648 builds wrote (test data for the old-build comparisons)
  return raw ? (ctx.legacySourceLabel(raw) || raw) : 'gemini-check-1:conv'
}
function loadFixture(ctx) {
  const txt = fs.readFileSync(__dirname + '/fixtures/thai-track-25-Sept-2026-revision.txt', 'utf8')
  const vocab = ctx.initVocab()
  // exposure: every non-locked word counts as seen, so Listening results reflect content
  // quality, not exposure (the learner's real exposure state is not in the export)
  vocab.forEach(w => { if (w.status !== 'locked') { w.lastSeen = '2026-09-20'; w.introducedAt = '2026-09-01' } })
  const byThai = new Map(vocab.map(w => [w.thai, w]))
  const keywords = []
  txt.split('TRACK PAIRS')[0].split('\n').forEach(l => {
    const m = l.match(/^\d\d\. (\S+)\s+\[([^\]]*)\]\s+—\s+(.*)$/)
    if (!m) return
    const w = byThai.get(m[1])
    const relearn = RELEARN.includes(m[1])
    if (relearn) { w.status = 'new'; w.lapses = 1 }
    keywords.push({ thai: m[1], phonetic: m[2], english: m[3], wordId: w.id, rating: null, isNew: relearn, isUnseen: false })
  })
  const pairs = []
  txt.split('TRACK PAIRS')[1].split(/\n(?=\[\d{3}\])/).slice(1).forEach(block => {
    const n = +block.match(/^\[(\d{3})\]/)[1]
    const prompt = block.match(/^\[\d{3}\] (.*)/)[1]
    const f = k => { const m = block.match(new RegExp('^  ' + k + ': (.*)$', 'm')); return m ? m[1] : '' }
    const hdr = block.match(/TYPE: (\S+)\s+TARGET_ID: (\S+)\s+TARGET: (\S+)(?:\s+GROUP: (\S+) \(alternative (\d)\))?/)
    const p = { prompt, thai: f('TH'), phonetic: f('PH'), english: f('EN'),
      speaker: /^(She|Nida)\b/.test(prompt) ? 'B' : /^(He|Somchai)\b/.test(prompt) ? 'A' : (n % 2 ? 'A' : 'B'),
      _source: legacySrc(ctx, f('SRC')), words: [] }
    if (hdr[1] !== 'unknown') { p.pairType = hdr[1]; p.language = 'th' }
    if (hdr[2] !== '-') { p.targetId = +hdr[2]; p.wordId = +hdr[2] }
    if (hdr[3] !== '-') p._target = hdr[3]
    if (hdr[4]) { p.recallGroupId = hdr[4]; p.recallRole = 'alternative'; p.recallIndex = +hdr[5] }
    if (IMPROVED[n]) p._source = 'ai:improve:' + IMPROVED[n]
    if (p.pairType === 'framing') p._source = 'ai:check-1'
    pairs.push(p)
  })
  const track = { date: '25 Sept 2026', mode: 'revision', pairs, keywords, createdAt: '2026-09-25T01:43:40.140Z' }
  return { track, vocab }
}
module.exports = { loadFixture, RELEARN }
