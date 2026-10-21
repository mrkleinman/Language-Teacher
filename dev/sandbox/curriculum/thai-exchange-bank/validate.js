// node validate.js <compiled app with the bank embedded> <owner backup.json> [targets…] — runs each bank word through the app's own
// writer (generateWordLines) on the owner's vocabulary with a model stub that records every call: a bank exchange is USABLE when the
// writer accepts all three lines with no model call. Prints the reasons for the rest. No provider calls.
const fs = require('fs'), path = require('path'); const DEV = path.join(__dirname, '../../..'); process.chdir(DEV)
const { load } = require(path.join(DEV, 'harness'))
const C = load(process.argv[2], { realBelt: true }); C.console.info = () => {}; C.console.warn = () => {}
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
    if (kept === 3 && calls === 0) res.ok.push(t)
    else res.fail.push([t, 'kept ' + kept + '/3, model calls ' + calls, log.filter(x => /✗|reject|fail|FAIL|untaught|⛔|⚠/i.test(x)).slice(0, 4).map(x => x.slice(0, 220))])
  }
  console.log('USABLE', res.ok.length, '/', res.ok.length + res.fail.length)
  res.fail.forEach(f => console.log('✗', f[0], '—', f[1], '\n    ' + (f[2] || []).join('\n    ')))
  if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify(res, null, 1))
})()
