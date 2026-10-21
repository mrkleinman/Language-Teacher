// node validate.js <compiled app with the bank embedded> <owner backup.json> [targets…] — runs each bank word through the app's own
// writer (generateWordLines) on the owner's vocabulary with a model stub that records every call: a bank exchange is USABLE when the
// writer accepts all three lines with no model call. Prints the reasons for the rest. No provider calls.
const fs = require('fs'), path = require('path'); const DEV = path.join(__dirname, '../../..'); process.chdir(DEV)
const { load } = require(path.join(DEV, 'harness'))
const C = load(process.argv[2], { realBelt: true }); C.console.info = () => {}; C.console.warn = () => {}
C.__bankForced = true   // the model stub below must not switch the bank off (see harness.js)
const B = JSON.parse(fs.readFileSync(process.argv[3], 'utf8')), byId = new Map(B.vocab.map(w => [w.id, w]))
const F = ['status', 'difficulty', 'interval', 'lastSeen', 'dueDate', 'repCount', 'lapses', 'okStreak', 'manualKnown', 'introducedAt', 'note']
const vocab = C.initVocab().map(w => { const o = byId.get(w.id); if (!o) return w; const n = { ...w }; F.forEach(k => { if (o[k] !== undefined) n[k] = o[k] }); return n })
const bank = C.ev('THAI_EXCHANGE_BANK'), only = process.argv.slice(4)
;(async () => {
  const res = { ok: [], fail: [] }
  for (const t of Object.keys(bank).filter(t => !only.length || only.includes(t))) {
    const w = vocab.find(x => x.thai === t); if (!w) { res.fail.push([t, 'not in dictionary']); continue }
    let calls = 0; const log = []
    C.mockGeminiGenerate = async () => { calls++; return '[]' }
    let out = null
    try { out = await C.generateWordLines({ ...w, _trackTargets: [w] }, 'two friends in Bangkok', 'Somchai (สมชาย), a Thai man', 'Nida (นิดา), a Thai woman', [], vocab, 'AIzaSyTEST-harness-key-000000', C.ev('GEMINI_DEFAULT_MODEL'), 0, (a, b, m) => { if (m && m.apiError) log.push(m.apiError) }, '', []) } catch (e) { log.push('ERR ' + e.message) }
    const lines = Array.isArray(out) ? out : (out && (out.lines || out.pairs)) || []
    const want = bank[t][0].map(l => l.thai)
    const nz = x => String(x || '').replace(/\s+/g, '')
    const kept = want.filter(x => lines.some(l => l && nz(l.thai) === nz(x))).length
    if (process.env.SHOW) console.log(t, JSON.stringify(lines.map(l => l && l.thai)), '| want', JSON.stringify(want))
    // v710 (paid tracks 14–16): a line the writer accepts can still be dropped later in a real run — by the early acceptance contract, the
    // track-level closed-vocabulary gate or the fixed-verb rule (ดู = watch). Each bank line is checked by those too.
    const later = []
    const cvCtx = C.buildThaiTrackVocabContext(vocab, [w], [])
    bank[t][0].forEach(l => { const p = { ...l, language: 'th', _target: t, targetId: w.id, wordId: w.id, pairType: 'content', speakerGender: l.speaker === 'B' ? 'female' : 'male' }
      const v = C.validateThaiTargetPair(p, w, { vocab }, 'early-generation'); if (v.state === 'FAIL') later.push('contract: ' + v.reasons.join('; ').slice(0, 160) + ' — ' + l.thai)
      const cv = C.validateThaiVocabulary([{ thai: l.thai }], cvCtx); if (cv.blocked && cv.blocked.length) later.push('track vocabulary gate: untaught ' + cv.blocked.map(b => b.token || b).join(' ') + ' — ' + l.thai)
      const vs = C.thaiVerbSenseProblem(p); if (vs) later.push('fixed verb: ' + String(vs.why || vs).slice(0, 140) + ' — ' + l.thai) })
    if (kept === 3 && calls === 0 && !later.length) res.ok.push(t)
    else if (kept === 3 && calls === 0) res.fail.push([t, 'writer OK, later checks fail', later])
    else res.fail.push([t, 'kept ' + kept + '/3, model calls ' + calls, log.filter(x => /✗|reject|fail|FAIL|untaught|⛔|⚠/i.test(x)).slice(0, 4).map(x => x.slice(0, 220))])
  }
  console.log('USABLE', res.ok.length, '/', res.ok.length + res.fail.length)
  res.fail.forEach(f => console.log('✗', f[0], '—', f[1], '\n    ' + (f[2] || []).join('\n    ')))
  if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify(res, null, 1))
})()
