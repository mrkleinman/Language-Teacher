// Relay Thai DAILY run on the OWNER'S profile (backup 2026-10-15, private, never committed): the real app path —
// pickWords (the next Daily selection) → ttBenchThaiDaily (scene → generation → QC → FINAL_TRACK) → the app's own export —
// with every model request answered by a Claude Haiku stand-in through a file queue (no API cost).
//   RELAY_DIR=<scratch dir> OWNER_BACKUP=<backup.json> node sandbox/daily-relay/bridge-daily.js run1
// Queue: <run>/NNN.req.txt + NNN.meta.json → the stand-in writes NNN.reply.txt. A restarted bridge reuses an answer only for the
// byte-identical request. Output: summary.json, export.txt, log.txt, DONE.
'use strict'
const fs = require('fs'), path = require('path')
const DEV = '/home/user/Language-Teacher/dev'
const { load } = require(DEV + '/harness')
// the queue and the backup live OUTSIDE the repository (scratchpad): prompts carry the owner's word list
const RUN = process.argv[2] || 'run1', Q = path.join(process.env.RELAY_DIR || __dirname, RUN); fs.mkdirSync(Q, { recursive: true })
const KEY = 'AIzaSyTEST-harness-key-000000'
const sleep = ms => new Promise(r => setTimeout(r, ms))
;(async () => {
  const c = load(process.env.TT_FILE || (DEV + '/tt.compiled.js'), { realBelt: true, globals: { setTimeout, clearTimeout } }); c.console.info = () => {}; c.console.warn = () => {}
  const B = JSON.parse(fs.readFileSync(process.env.OWNER_BACKUP, 'utf8'))
  const byId = new Map(B.vocab.map(w => [w.id, w]))
  const F = ['status', 'difficulty', 'interval', 'lastSeen', 'dueDate', 'repCount', 'lapses', 'okStreak', 'manualKnown', 'introducedAt', 'note']
  const vocab = c.initVocab().map(w => { const o = byId.get(w.id); if (!o) return w; const n = { ...w }; F.forEach(k => { if (o[k] !== undefined) n[k] = o[k] }); return n })
  B.vocab.forEach(o => { if (!vocab.some(w => w.id === o.id)) vocab.push({ ...o }) })
  // the next Daily selection, unless a fixed target list is given (a re-run on the same words after a fix)
  const fixed = process.env.TARGET_IDS ? process.env.TARGET_IDS.split(',').map(Number) : null
  const picked = fixed ? fixed : c.pickWords(vocab, 'daily', []).targets.map(w => w.id)
  fs.writeFileSync(path.join(Q, 'targets.json'), JSON.stringify(picked))
  let seq = 0
  c.mockGeminiGenerate = async (k, m, msgs, max, o) => {
    const id = String(++seq).padStart(3, '0'), stage = (o && o.stage) || '?'
    const sys = msgs.length > 1 ? msgs[0].content : '', user = msgs[msgs.length - 1].content
    const txt = x => typeof x === 'string' ? x : Array.isArray(x) ? x.map(p => (p && p.text) || '').join('') : String(x || '')
    const reqTxt = (sys ? '=== SYSTEM ===\n' + txt(sys) + '\n\n=== USER ===\n' : '') + txt(user) + '\n', rq = path.join(Q, id + '.req.txt'), rp = path.join(Q, id + '.reply.txt')
    if (fs.existsSync(rq) && fs.existsSync(rp)) { if (fs.readFileSync(rq, 'utf8') === reqTxt) { fs.appendFileSync(path.join(Q, 'resume.txt'), id + ' reused\n'); return clean(fs.readFileSync(rp, 'utf8')) }
      fs.renameSync(rq, rq + '.stale'); fs.renameSync(rp, rp + '.stale'); fs.appendFileSync(path.join(Q, 'resume.txt'), id + ' DIFFERENT — asked again\n') }
    fs.writeFileSync(rq, reqTxt)
    fs.writeFileSync(path.join(Q, id + '.meta.json'), JSON.stringify({ id, stage, maxTokens: max, json: !!(o && o.json) }))
    const t0 = Date.now()
    while (!fs.existsSync(rp)) { if (Date.now() - t0 > 90 * 60e3) throw new Error('relay timeout ' + id); await sleep(1000) }
    await sleep(300); return clean(fs.readFileSync(rp, 'utf8'))
  }
  const clean = s => s.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
  const logs = []; const L = x => { const f = typeof x === 'string' ? x : JSON.stringify(x); logs.push(f); fs.appendFileSync(path.join(Q, 'log.txt'), f + '\n') }
  let r = null, err = null
  try { const runId = c.aiBeginRun('daily-track'); r = await c.ttBenchThaiDaily({ targets: picked.map(id => ({ id })) }, vocab, KEY, c.ev('GEMINI_DEFAULT_MODEL'), L, runId) } catch (e) { err = String(e && e.stack || e) }
  const tr = r && r.track
  let exportText = null
  if (tr) try {
    let captured = null
    c.Blob = function (parts) { this._text = parts.join('') }
    c.URL = { createObjectURL: b => { captured = b._text; return 'blob:x' }, revokeObjectURL: () => {} }
    c.document = { createElement: () => ({ click() {}, set href(v) {}, set download(v) {} }), body: { appendChild() {}, removeChild() {} } }
    await c.ev('downloadTrack')(tr); exportText = captured
  } catch (e) { exportText = '(export failed: ' + e.message + ')' }
  const rd = tr ? c.trackReadiness(tr) : null
  const sum = { status: tr && tr.status, ready: rd && rd.ready, validTargetPairs: rd && rd.validTargetPairs, expected: rd && rd.expectedTargetPairs, unresolved: rd && (rd.perTarget || []).filter(x => (rd.unresolvedTargetIds || []).includes(x.targetId)).map(x => x.target + ' ' + x.valid + '/3'), calls: seq, stop: r && r.stop, err }
  fs.writeFileSync(path.join(Q, 'summary.json'), JSON.stringify(sum, null, 1))
  if (exportText) fs.writeFileSync(path.join(Q, 'export.txt'), exportText)
  fs.writeFileSync(path.join(Q, 'DONE'), err ? 'crash' : '1')
  console.log(JSON.stringify({ ...sum, err: err && err.slice(0, 300) }))
})().catch(e => { fs.writeFileSync(path.join(Q, 'DONE'), 'crash'); console.error(e); process.exit(1) })
