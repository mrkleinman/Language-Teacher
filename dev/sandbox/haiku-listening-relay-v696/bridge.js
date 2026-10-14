// Haiku-relay Listening run: the REAL app pipeline (generateCohesiveListeningTrack, v694 learner, Oct13 + v695 rules) with every
// model request written to a queue file and answered by a Haiku agent (reply file). Nothing is scripted.
'use strict'
const fs = require('fs'), path = require('path')
const DEV = '/home/user/Language-Teacher/dev'
const { load } = require(DEV + '/harness')
const { learner } = require(DEV + '/benchmark/v692/learners')
const F = require(DEV + '/benchmark/v695/plans')
const lang = process.argv[2], Q = path.join(__dirname, 'q-' + lang); fs.mkdirSync(Q, { recursive: true })
const KEY = 'AIzaSyTEST-harness-key-000000', MODEL = 'gemini-2.5-flash-lite'
const sleep = ms => new Promise(r => setTimeout(r, ms))
;(async () => {
  const c = load(DEV + '/tt.compiled.js', { realBelt: true })
  const L = learner(c, lang, { dueIds: F.V694_IDS[lang].concat(F.V694_DEFERRED[lang]), dueOrder: true })
  if (lang === 'th') c.selectRevisionTargets('th', L.vocab)
  const before = JSON.stringify(L.vocab.map(w => [w.id, w.status, w.dueDate, w.repCount, w.interval, w.lastSeen]))
  let seq = 0; const calls = []
  c.mockGeminiGenerate = async (k, m, msgs, max, o) => {
    const id = String(++seq).padStart(3, '0'), stage = (o && o.stage) || '?'
    const sys = msgs.length > 1 ? msgs[0].content : '', user = msgs[msgs.length - 1].content
    fs.writeFileSync(path.join(Q, id + '.req.txt'), '=== SYSTEM ===\n' + (sys || '(none)') + '\n\n=== USER ===\n' + user + '\n')
    fs.writeFileSync(path.join(Q, id + '.meta.json'), JSON.stringify({ id, stage, maxTokens: max }))
    const rf = path.join(Q, id + '.reply.txt'), t0 = Date.now()
    while (!fs.existsSync(rf)) { if (Date.now() - t0 > 20 * 60e3) throw new Error('relay timeout ' + id); await sleep(1000) }
    await sleep(300); let txt = fs.readFileSync(rf, 'utf8').trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
    calls.push({ id, stage, maxTokens: max, reqChars: (sys + user).length, replyChars: txt.length }); return txt
  }
  const logs = []; let r = null, err = null
  try { r = await c.generateCohesiveListeningTrack({ lang, vocab: L.vocab, apiKey: KEY, model: MODEL, onLog: x => { logs.push(x); fs.appendFileSync(path.join(__dirname, 'log-' + lang + '.txt'), x + '\n') }, attemptId: 'lattempt-haiku-relay-' + lang, speechStyle: 'natural' }) } catch (e) { err = String(e && e.stack || e) }
  const after = JSON.stringify(L.vocab.map(w => [w.id, w.status, w.dueDate, w.repCount, w.interval, w.lastSeen]))
  const tr = r && r.track, Lx = tr && tr.listening
  const sum = { lang, status: tr && tr.status, failureReason: tr && tr.failureReason, failedChecks: tr && tr.failedChecks, coverage: tr && tr.coverage, newTargets: tr && tr.targetCounts && tr.targetCounts.newTargetCount,
    turns: Lx && Lx.lines.length, gates: Lx && Lx.gates, srsUntouched: before === after, calls, err }
  fs.writeFileSync(path.join(__dirname, 'summary-' + lang + '.json'), JSON.stringify(sum, null, 1))
  if (Lx) fs.writeFileSync(path.join(__dirname, 'lines-' + lang + '.json'), JSON.stringify(Lx.lines, null, 1))
  fs.writeFileSync(path.join(Q, 'DONE'), '1')
  console.log(JSON.stringify({ ...sum, calls: calls.length, gates: undefined }))
})().catch(e => { fs.writeFileSync(path.join(Q, 'DONE'), 'crash'); console.error(e); process.exit(1) })
