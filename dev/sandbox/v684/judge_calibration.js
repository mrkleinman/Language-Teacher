#!/usr/bin/env node
// v684 JUDGE CALIBRATION (PROPOSED — needs the owner's budget approval before any live run).
// Does the v684 final-gate judge (v684JudgePrompt + V684_JUDGE_SCHEMA in the REAL app build) fail the exported v683 exercises the
// audit marked major / critical, and pass the ones it marked clean? The audit labels are AI judgements (independent Claude
// reviewers) plus mechanical checks — NOT native-speaker certification — so the result is reported as AI against AI.
//   node sandbox/v684/judge_calibration.js --dry                       → builds every request, prints counts and one prompt; no network
//   node sandbox/v684/judge_calibration.js --cap 0.10 --session-cap X [--model gemini-2.5-flash]
// Spend is priced from Gemini's usageMetadata, capped BEFORE every request (worst case), appended to sandbox/spend-ledger.json;
// every request and reply is recorded under sandbox/runs/v684-judge-calibration.<stamp>.
'use strict'
if (process.env.NODE_USE_ENV_PROXY !== '1' && !process.argv.includes('--dry')) {
  const r = require('child_process').spawnSync(process.execPath, process.argv.slice(1), { stdio: 'inherit', env: { ...process.env, NODE_USE_ENV_PROXY: '1', NODE_NO_WARNINGS: '1' } })
  process.exit(r.status == null ? 1 : r.status)
}
const fs = require('fs'), path = require('path'), { load } = require('../../harness'), V = require('./lib')
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d }
const DRY = process.argv.includes('--dry'), CAP = +arg('cap', 0), SESSION_CAP = +arg('session-cap', 0)
const MODEL = arg('model', 'gemini-2.5-flash'), PRICE = { 'gemini-2.5-flash': { in: 0.30, out: 2.50 }, 'gemini-2.5-flash-lite': { in: 0.10, out: 0.40 } }[MODEL]
if (!DRY && !(CAP > 0)) { console.error('a --cap is required for a live run (and the owner\'s approval)'); process.exit(2) }
const c = load(path.join(V.ROOT, 'tt.compiled.js'), { realBelt: true })
const audit = JSON.parse(fs.readFileSync(path.join(__dirname, 'audit', 'audit.json'), 'utf8'))
const JUDGED = ['sense', 'grammar', 'natural', 'cue', 'meaning', 'coherence', 'distinct']
const batches = []
for (const lang of ['th', 'ja', 'zh']) {
  const g = V.gateContext(c, lang + '-daily-2026-10-12'), recBy = new Map(g.ctx.recs.map(r => [r.surface, r]))
  const rows = audit.rows[lang].filter(r => r.type === 'content')
  // the v683 lesson has no exchanges: each exercise is shown with the line before it as its exchange context
  const lines = audit.rows[lang].map((r, i) => ({ id: lang + r.pair, exchange: lang + '-' + Math.floor(i / 2), voice: String(r.speaker || (i % 2 ? 'B' : 'A')).slice(0, 1), role: 'friend', addressee: 'friend', relation: 'friend',
    situation: 'two friends talking', purpose: r.type === 'content' ? '(not planned in v683) ' + r.cue : '', text: r.text, english: r.en, cue: r.cue,
    target: r.type === 'content' && recBy.get(r.target) ? { id: recBy.get(r.target).id, surface: r.target, recall: r.recall, sense: recBy.get(r.target).gloss } : null, _row: r }))
  const ex = [...new Set(lines.map(l => l.exchange))]
  for (let k = 0; k < ex.length; k += 6) { const ls = lines.filter(l => ex.slice(k, k + 6).includes(l.exchange)); batches.push({ lang, lines: ls, prompt: c.v684JudgePrompt(lang, ls, lines) }) }
}
const ref = l => { const r = l._row; if (!r || r.type !== 'content') return null
  const bad = r.issues.some(i => JUDGED.includes(i.criterion) && (i.severity === 'critical' || i.severity === 'major')); return { bad, clean: r.severity === 'clean' } }
const all = batches.flatMap(b => b.lines).filter(l => ref(l))
console.log('v684 judge calibration · ' + MODEL + ' · batches ' + batches.length + ' · exercises ' + all.length + ' (audit bad ' + all.filter(l => ref(l).bad).length + ', clean ' + all.filter(l => ref(l).clean).length + ')' +
  ' · est. cost ≈ US$' + batches.reduce((a, b) => a + (b.prompt.length / 2.5) * PRICE.in / 1e6 + 1800 * PRICE.out / 1e6, 0).toFixed(4))
if (DRY) { console.log('--- first prompt ---\n' + batches[0].prompt.slice(0, 1800)); process.exit(0) }
const LEDGER = path.join(V.ROOT, 'sandbox', 'spend-ledger.json'), ledger = JSON.parse(fs.readFileSync(LEDGER, 'utf8')), spentBefore = ledger.runs.reduce((a, r) => a + (r.costUsd || 0), 0)
;(async () => {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19), runId = 'v684-judge-calibration.' + stamp, dir = path.join(V.ROOT, 'sandbox', 'runs', runId)
  fs.mkdirSync(dir, { recursive: true })
  let cost = 0, sent = 0, refused = 0; const records = []
  for (const b of batches) {
    const worst = (Math.ceil(b.prompt.length / 2) + 50) * PRICE.in / 1e6 + 2500 * PRICE.out / 1e6
    if (cost + worst > CAP || (SESSION_CAP && spentBefore + cost + worst > SESSION_CAP)) { refused++; b.refused = true; continue }
    const body = { contents: [{ role: 'user', parts: [{ text: b.prompt }] }], generationConfig: { temperature: 0, maxOutputTokens: 2500, responseMimeType: 'application/json', responseSchema: c.ev('V684_JUDGE_SCHEMA') } }
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + MODEL + ':generateContent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const j = await r.json().catch(() => null); sent++
    const um = j && j.usageMetadata, usd = um ? (um.promptTokenCount || 0) * PRICE.in / 1e6 + ((um.candidatesTokenCount || 0) + (um.thoughtsTokenCount || 0)) * PRICE.out / 1e6 : worst
    cost += usd
    let parsed = null; try { parsed = JSON.parse(j.candidates[0].content.parts[0].text) } catch (e) {}
    if (parsed) c.v684JudgeApply(b.lines, parsed)
    records.push({ lang: b.lang, prompt: b.prompt, status: r.status, reply: j, usd })
  }
  const stat = { caughtBad: 0, bad: 0, passedClean: 0, clean: 0, noVerdict: 0 }
  all.forEach(l => { const rf = ref(l), v = l._judge && l._judge.v; if (!v) { stat.noVerdict++; return }
    const fail = JUDGED.some(f => v[f === 'natural' ? 'natural' : f] === false)
    if (rf.bad) { stat.bad++; if (fail) stat.caughtBad++ } if (rf.clean) { stat.clean++; if (!fail) stat.passedClean++ } })
  fs.writeFileSync(path.join(dir, 'records.json'), JSON.stringify(records, null, 1)); fs.writeFileSync(path.join(dir, 'result.json'), JSON.stringify({ model: MODEL, sent, refused, cost, stat }, null, 1))
  ledger.runs.push({ runId, costUsd: +cost.toFixed(6), requests: sent, at: new Date().toISOString(), purpose: 'v684 judge calibration' }); fs.writeFileSync(LEDGER, JSON.stringify(ledger, null, 1))
  console.log('sent ' + sent + ' · refused ' + refused + ' · US$' + cost.toFixed(5) + ' · caught bad ' + stat.caughtBad + '/' + stat.bad + ' · passed clean ' + stat.passedClean + '/' + stat.clean + ' · no verdict ' + stat.noVerdict)
})()
