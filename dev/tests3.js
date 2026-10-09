// Recovery (point 1) and bridge audit (point 2) on the real 25 Sept content.
const { main } = require('./tests')
const out = []
const T = (id, name, pass, detail) => out.push((pass ? 'PASS ' : 'FAIL ') + id.padEnd(4) + name + (detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''))
function model(c, replacements, unnatural) {
  const log = { replaceCalls: {} }
  c.mockGeminiGenerate = async (k, m, msgs) => {
    const q = msgs[msgs.length - 1].content
    const nums = re => [...q.matchAll(re)].map(x => +x[1])
    if (/Rate how well/.test(q)) return JSON.stringify(nums(/^(\d+)\. Prompt:/gm).map(i => ({ i, s: 5 })))
    if (/native Thai speaker/.test(q)) return JSON.stringify([...q.matchAll(/^(\d+)\. Thai: (.*)$/gm)].map(x => ({ i: +x[1], s: unnatural.some(u => x[2].includes(u)) ? 2 : 5, note: 'mock' })))
    if (/Evaluate this Thai/.test(q)) return JSON.stringify({ action: 'clean', reason: 'ok' })
    if (/Generate 3 replacement Thai learning pairs/.test(q)) {
      const t = (q.match(/Target word: "([^"]+)"/) || [])[1]
      log.replaceCalls[t] = (log.replaceCalls[t] || 0) + 1
      const seq = replacements[t] || []
      return JSON.stringify(seq[log.replaceCalls[t] - 1] || [])
    }
    return '[]'
  }
  return log
}
;(async () => {
  const r = await main(), c = r.c
  const base = { ...r.track, pairs: r.gen.slice(), _finalAudit: r.genAudit }
  const L = (sp, thai, en, prompt) => ({ speaker: sp, thai, phonetic: 'x x', english: en, prompt })

  // RC1 — no valid replacement can be produced: both attempts fail, ตื่น reported unresolved
  const m1 = model(c, { 'ตื่น': [[], [L('A','ผมตื่นห้าทุ่มครับ เพราะว่าผมจะโพสต์ลงวัฒนธรรมภาคใต้','I wake at 11 PM to post.','He says he wakes up late')]] }, ['ผมตื่นห้าทุ่มครับ'])
  const q1 = await c.runQualityCheckCore({ ...base }, 'k', 'm', { vocab: r.vocab })
  const f1 = q1.counts.finalAudit, u1 = (f1.unresolved || [])[0]
  T('RC1', '[088] rejected → bounded recovery attempted → no valid replacement → ตื่น explicitly UNRESOLVED',
    f1.coverage.covered === 29 && u1 && u1.target === 'ตื่น' && u1.attempts === 2 && m1.replaceCalls['ตื่น'] === 2,
    { coverage: f1.coverage.covered + '/30', unresolved: f1.unresolved })

  // RC2 — attempt 1 fails a check, attempt 2 passes every check → 30/30
  const good = [L('A','พรุ่งนี้ผมต้องตื่นเช้าครับ','I have to wake up early tomorrow.','He says he has to wake up early tomorrow'),
                L('B','ตื่นกี่โมงคะ','What time will you wake up?','She asks what time he will wake up'),
                L('A','ผมจะตื่นหกโมงครับ','I will wake up at six.','He says he will wake up at six')]
  const bad = [L('A','ผมอยากไปร้านนวดครับ','I want to go to the massage shop.','He says he wants a massage'),   // target-role line without ตื่น
               L('B','ไปกี่โมงคะ','What time are you going?','She asks what time'),
               L('A','ผมตื่นห้าทุ่มครับ เพราะว่าผมจะโพสต์ลงวัฒนธรรมภาคใต้','I wake up at 11 PM because I will post.','He says why he wakes late')]
  const m2 = model(c, { 'ตื่น': [bad, good] }, ['ผมตื่นห้าทุ่มครับ'])
  const qlog = []
  const q2 = await c.runQualityCheckCore({ ...base }, 'k', 'm', { vocab: r.vocab, onLog: x => qlog.push(x) })
  const f2 = q2.counts.finalAudit, rec = (f2.recovery || [])[0]
  const tuen = q2.pairs.filter(p => p.recallGroupId === 'rg-1425').map(p => p.pairType + ': ' + p.thai)
  T('RC2', 'attempt 1 rejected (failed target line + unnatural line), attempt 2 accepted → 30/30',
    f2.coverage.covered === 30 && rec && rec.resolved && rec.attempts.length === 2 && rec.attempts[0].result === 'rejected' && f2.ok,
    { attempts: rec && rec.attempts.map(a => ({ attempt: a.attempt, result: a.result, reasons: a.reasons, lines: a.lines })), finalGroup: tuen, invariants: f2.invariants })
  T('RC3', 'recovery is bounded (≤ ' + c.ev('THAI_RECOVERY_MAX_ATTEMPTS') + ' model calls per target)', m1.replaceCalls['ตื่น'] <= 2 && m2.replaceCalls['ตื่น'] <= 2)
  const pos = q2.pairs.findIndex(p => p._source === 'qc:recover:ตื่น')
  T('RC4', 'recovered exchange sits in the track body, before the closing framing lines',
    pos > 0 && q2.pairs.slice(pos).some(p => p.pairType === 'framing'), 'inserted at [' + (pos + 1) + '] of ' + q2.pairs.length)

  // ── Bridge audit (point 2) — QC output of the real 25 Sept content ──
  const bridges = q2.pairs.map((p, i) => ({ p, i })).filter(x => x.p.pairType === 'bridge')
  const byKey = new Map(q2.pairs.map((p, i) => [p._pairKey, i]))
  out.push('\nBRIDGES (' + bridges.length + ') — every one must be a contract RESPONSE line (speaker B, line 2), untargeted, anchored:')
  bridges.forEach(({ p, i }) => {
    const kw = r.track.keywords.find(k => k.wordId === p.supportsTargetId)
    const resp = byKey.has(p.respondsToPairKey) ? '[' + String(byKey.get(p.respondsToPairKey) + 1).padStart(3, '0') + '] ' + q2.pairs[byKey.get(p.respondsToPairKey)].thai : '(none)'
    out.push('  [' + String(i + 1).padStart(3, '0') + '] ' + p.speaker + ' line' + p.recallIndex + ' "' + p.thai + '" — SUPPORTS ' + p.supportsTargetId + ' (' + (kw && kw.thai) + ') · RESPONDS_TO ' + resp)
  })
  T('BR1', 'every bridge is a response line (speaker B), targetRequired:false, SUPPORTS set',
    bridges.every(({ p }) => p.speaker === 'B' && p.targetRequired === false && p.supportsTargetId != null && p.recallRole === 'response'))
  T('BR2', 'no bridge contains its own target (an incidental target makes the line content)',
    bridges.every(({ p }) => { const k = r.track.keywords.find(x => x.wordId === p.supportsTargetId); return !c.thaiContainsLexeme(p.thai, k.thai) }))
  // the failed target-role lines of 25 Sept are REJECTED, not reclassified
  const failed = ['มีรสชาติอร่อยและมีวัฒนธรรมครับ','คุณจะไปกินอะไรครับ','คืนนี้ผมอยากไปนวดแผนไทยครับ','โห ตีห้าเลยเหรอครับ ผมไปถึงตอนพระอาทิตย์ตกครับ','ผมกลัวว่าจะไม่ทันครับ','คืนนี้สองทุ่ม ผมต้องไปถึงร้านนวดแผนไทยครับ']
  // v657: the early semantic gate applies the SAME acceptance contract during generation, so a target-less A line can be
  // rejected there (before the generation audit) — it is still rejected as TARGET_MISSING, never bridged
  const ga = r.genAudit.rejected.concat(((r.gen._earlyGate || {}).rejectedLines || []).map(x => ({ thai: x.thai, reasons: [x.why] })))
  T('BR3', 'A-line recalls missing their target ([008] [034] [040] [042] [062] [087]) are rejected as TARGET_MISSING, never bridged',
    // v652: [042] opens with the untaught interjection โห, which the cluster-aware tokenizer now sees
    // (v651 skipped the leading vowel โ and dropped ห as a fragment) — it is removed earlier, by the
    // closed-vocabulary gate, and still never bridged.
    failed.every(t => ga.some(x => x.thai === t && x.reasons.some(y => /TARGET_MISSING/.test(y))) || (/^โห/.test(t) && !r.gen.some(p => p && (p.thai || '').replace(/\s+/g, '') === t.replace(/\s+/g, '')))) && !q2.pairs.some(p => failed.includes(p.thai)),
    ga.filter(x => failed.includes(x.thai)).map(x => x.thai + ' → ' + x.reasons[0]))
  const bridgeGate = c.thaiLineGate({ speaker: 'A', thai: 'คุณจะไปกินอะไรครับ', pairType: 'bridge', _typedAt: 'creation', supportsTargetId: 50, english: 'x', prompt: 'x' }, r.track.keywords, r.vocab)
  T('BR4', 'a target-role line stamped as bridge is refused by the gate (no escape hatch)', !bridgeGate.ok && bridgeGate.problems.some(p => p.code === 'BRIDGE_NOT_RESPONSE'), bridgeGate.problems.map(p => p.code))

  // export
  c.Blob = class { constructor(parts) { c.__blob = parts.join('') } }
  c.URL = { createObjectURL: () => 'b', revokeObjectURL() {} }
  c.document.createElement = () => ({ click() {}, style: {} }); c.document.body.removeChild = () => {}
  await c.downloadTrack({ ...base, pairs: q1.pairs, _finalAudit: f1 })
  const ex = c.__blob.split('\n')
  out.push('\nEXPORT header (RC1 track):\n' + ex.slice(9, 14).join('\n'))
  const bl = ex.findIndex(l => /TYPE: bridge/.test(l)); out.push('\nEXPORT bridge sample:\n' + ex.slice(bl - 1, bl + 2).join('\n'))
  console.log(out.join('\n'))
})()
