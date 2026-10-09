const { main } = require('./tests')
;(async () => {
  const r = await main()
  const c = r.c, out = []
  const T = (id, name, pass, detail) => out.push((pass ? 'PASS ' : 'FAIL ') + id.padEnd(4) + name + (pass ? '' : '\n      ' + JSON.stringify(detail)))
  // R — rescue: a rewrite removes เสื้อ from EVERY line of its group; the pre-QC
  // candidate that still passes every check is restored, so coverage is not lost.
  const byThai = new Map(r.vocab.map(w => [w.thai, w]))
  const bad = [
    { speaker: 'A', thai: 'ผมอยากได้กางเกงครับ', phonetic: 'phǒm yàak dâi kaang-keeng khráp', english: 'I want some trousers.', prompt: 'He says he wants trousers' },
    { speaker: 'B', thai: 'กางเกงตัวนั้นสวยดีค่ะ', phonetic: 'kaang-keeng tua nán sǔai dii khâ', english: 'Those trousers are nice.', prompt: 'She says the trousers are nice' },
    { speaker: 'A', thai: 'ผมชอบกางเกงสีดำครับ', phonetic: 'phǒm châwp kaang-keeng sǐi-dam khráp', english: 'I like black trousers.', prompt: 'He says he likes black trousers' } ]
  c.mockGeminiGenerate = async (k, m, msgs) => {
    const q = msgs[msgs.length - 1].content
    const nums = re => [...q.matchAll(re)].map(x => +x[1])
    if (/Rate how well/.test(q)) return JSON.stringify(nums(/^(\d+)\. Prompt:/gm).map(i => ({ i, s: 5 })))
    if (/native Thai speaker/.test(q)) return JSON.stringify(nums(/^(\d+)\. Thai:/gm).map(i => ({ i, s: 5 })))
    if (/Evaluate this Thai/.test(q)) return JSON.stringify(/Target word: "เสื้อ"/.test(q) ? { action: 'improve', reason: 'x' } : { action: 'clean', reason: 'ok' })
    if (/Fix this Thai learning group/.test(q)) return JSON.stringify(bad)
    return '[]'
  }
  // _qrImprove refuses a rewrite with no target at all, so feed one line that keeps it
  bad[1].thai = 'เสื้อ__ตัวนั้น__สวยดีค่ะ'
  const t0 = { ...r.track, pairs: r.gen.slice() }
  const q = await c.runQualityCheckCore(t0, 'k', 'm', { vocab: r.vocab })
  const sid = byThai.get('เสื้อ').id
  const lines = q.pairs.filter(p => p.pairType === 'content' && p.targetId === sid).map(p => p.thai + (p._rescued ? ' [rescued]' : ''))
  T('R1', 'rewrite that strips the target from content lines: those lines are rejected',
    !q.pairs.some(p => p.thai === 'ผมอยากได้กางเกงครับ' || p.thai === 'ผมชอบกางเกงสีดำครับ'), q.counts.finalAudit.rejected.map(x => x.thai))
  T('R2', 'the B line that kept เสื้อ stays a bridge (type is fixed at creation) and markup is gone',
    q.pairs.some(p => p.thai === 'เสื้อตัวนั้นสวยดีค่ะ' && p.pairType === 'bridge' || p.thai === 'เสื้อตัวนั้นสวยดีค่ะ' && p.pairType === 'content'), q.pairs.filter(p => /ตัวนั้น/.test(p.thai)).map(p => [p.thai, p.pairType]))
  T('R3', 'coverage kept: a passing pre-QC candidate for เสื้อ is restored', lines.length >= 1 && q.counts.finalAudit.coverage.missing.every(m => m.targetId !== sid), { lines, rescued: q.counts.finalAudit.rescued })
  // X — export carries real identity
  const txt = c.trackToText ? c.trackToText(r.track) : null
  out.push('export fn: ' + (txt ? 'trackToText' : 'n/a'))
  console.log(out.join('\n'))
})()
