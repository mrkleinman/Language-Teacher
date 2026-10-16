// Relay Listening run on the OWNER'S profile (backup 2026-10-15, private, never committed): the real app path —
// selectRevisionTargets snapshot → generateCohesiveListeningTrack — with every model request answered by a Haiku relay.
'use strict'
const fs = require('fs'), path = require('path')
const DEV = '/home/user/Language-Teacher/dev'
const { load } = require(DEV + '/harness')
const RUN = process.argv[2] || 'run1', Q = path.join(__dirname, RUN); fs.mkdirSync(Q, { recursive: true })
const KEY = 'AIzaSyTEST-harness-key-000000', MODEL = 'gemini-2.5-flash-lite'
const sleep = ms => new Promise(r => setTimeout(r, ms))
;(async () => {
  const c = load(process.env.TT_FILE || (DEV + '/tt.compiled.js'), { realBelt: true }); c.console.info = () => {}; c.console.warn = () => {}
  const B = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'snapshot', 'thai-backup-2026-10-15.json'), 'utf8'))
  const byId = new Map(B.vocab.map(w => [w.id, w]))
  const F = ['status', 'difficulty', 'interval', 'lastSeen', 'dueDate', 'repCount', 'lapses', 'okStreak', 'manualKnown', 'introducedAt', 'note']
  const vocab = c.initVocab().map(w => { const o = byId.get(w.id); if (!o) return w; const n = { ...w }; F.forEach(k => { if (o[k] !== undefined) n[k] = o[k] }); return n })
  B.vocab.forEach(o => { if (!vocab.some(w => w.id === o.id)) vocab.push({ ...o }) })
  const snap = c.selectRevisionTargets('th', vocab)
  let seq = 0
  c.mockGeminiGenerate = async (k, m, msgs, max, o) => {
    const id = String(++seq).padStart(3, '0'), stage = (o && o.stage) || '?'
    const sys = msgs.length > 1 ? msgs[0].content : '', user = msgs[msgs.length - 1].content
    const reqTxt = (sys ? '=== SYSTEM ===\n' + sys + '\n\n=== USER ===\n' : '') + user + '\n', rq = path.join(Q, id + '.req.txt'), rp = path.join(Q, id + '.reply.txt')
    // resume after a restart: an earlier answer is reused only for the byte-identical request
    if (fs.existsSync(rq) && fs.existsSync(rp)) { if (fs.readFileSync(rq, 'utf8') === reqTxt) { fs.appendFileSync(path.join(Q, 'resume.txt'), id + ' reused\n'); return fs.readFileSync(rp, 'utf8').trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '') }
      fs.renameSync(rq, rq + '.stale'); fs.renameSync(rp, rp + '.stale'); fs.appendFileSync(path.join(Q, 'resume.txt'), id + ' DIFFERENT — asked again\n') }
    fs.writeFileSync(rq, reqTxt)
    fs.writeFileSync(path.join(Q, id + '.meta.json'), JSON.stringify({ id, stage, maxTokens: max, json: !!(o && o.json) }))
    const rf = path.join(Q, id + '.reply.txt'), t0 = Date.now()
    while (!fs.existsSync(rf)) { if (Date.now() - t0 > 40 * 60e3) throw new Error('relay timeout ' + id); await sleep(1000) }
    await sleep(300); return fs.readFileSync(rf, 'utf8').trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
  }
  const logs = []; let r = null, err = null
  try { r = await c.generateCohesiveListeningTrack({ lang: 'th', vocab, apiKey: KEY, model: MODEL, attemptId: 'lattempt-owner-' + RUN, rebuildOf: null, speechStyle: null, snapshot: snap,
    onLog: x => { const f = typeof x === 'string' ? x : JSON.stringify(x); logs.push(f); fs.appendFileSync(path.join(Q, 'log.txt'), f + '\n') }, onProgress: () => {} }) } catch (e) { err = String(e && e.stack || e) }
  const tr = r && r.track, Lx = tr && tr.listening
  const sum = { status: tr && tr.status, failureReason: tr && tr.failureReason, failedChecks: tr && tr.failedChecks, coverage: tr && tr.coverage, turns: Lx && Lx.lines && Lx.lines.length, gates: Lx && Lx.gates, calls: seq, err }
  fs.writeFileSync(path.join(Q, 'summary.json'), JSON.stringify(sum, null, 1))
  if (Lx) fs.writeFileSync(path.join(Q, 'lines.json'), JSON.stringify(Lx.lines, null, 1))
  fs.writeFileSync(path.join(Q, 'DONE'), err ? 'crash' : '1')
  console.log(JSON.stringify({ status: sum.status, coverage: sum.coverage && (sum.coverage.covered + '/' + sum.coverage.required), turns: sum.turns, calls: seq, err: err && err.slice(0, 300) }))
})().catch(e => { fs.writeFileSync(path.join(Q, 'DONE'), 'crash'); console.error(e); process.exit(1) })
