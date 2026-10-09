#!/usr/bin/env node
// Step 0 — INDEPENDENT EVALUATOR. Judges items (golden set, or lines exported from a benchmark run) on the eight rubric
// dimensions with a PANEL of evaluator models that are independent of the generator (the app generates with
// gemini-2.5-flash-lite; the evaluator must be a different model tier or family). Each panel member gives one vote per
// item at temperature 0; a member can be asked more than once (--repeat) to measure its own stability.
//
//   node benchmark/evaluator/evaluate.js --items benchmark/evaluator/golden/golden-v1.json \
//        --panel gemini:gemini-2.5-pro,anthropic:<model-id> [--repeat 2] --out benchmark/results/eval-x.json
//
// Keys come from GEMINI_API_KEY / ANTHROPIC_API_KEY (never written). A reply that is not valid rubric JSON is a vote of
// UNVERIFIED — it is reported, never turned into a pass or a fail. Disagreement between votes is reported per dimension.
'use strict'
const fs = require('fs'), path = require('path')
const { RUBRIC_VERSION, DIMENSIONS, evaluatorPrompt, validVerdict } = require('./rubric')

function parseVerdict(text) {
  try { const j = JSON.parse(String(text).replace(/```json|```/g, '').trim()); return validVerdict(j) ? j : null } catch (e) { return null }
}
const PROVIDERS = {
  gemini: model => async prompt => {
    const key = process.env.GEMINI_API_KEY; if (!key) throw new Error('GEMINI_API_KEY not set')
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + key, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0, maxOutputTokens: 600, responseMimeType: 'application/json' } }) })
    const j = await r.json(); return ((((j.candidates || [])[0] || {}).content || {}).parts || [{}])[0].text || ''
  },
  anthropic: model => async prompt => {
    const key = process.env.ANTHROPIC_API_KEY; if (!key) throw new Error('ANTHROPIC_API_KEY not set')
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: 600, temperature: 0, messages: [{ role: 'user', content: prompt }] }) })
    const j = await r.json(); return ((j.content || [])[0] || {}).text || ''
  },
}
// tests / offline: a function provider (prompt → text) can be injected
async function evaluate(items, panel, o = {}) {
  const repeat = o.repeat || 1, results = []
  for (const it of items) {
    const prompt = evaluatorPrompt(it), votes = []
    for (const m of panel) for (let k = 0; k < repeat; k++) {
      let raw = '', err = null
      try { raw = await m.call(prompt) } catch (e) { err = String(e.message || e) }
      const v = err ? null : parseVerdict(raw)
      votes.push({ evaluator: m.id, run: k + 1, verdict: v, state: v ? 'VERIFIED' : 'UNVERIFIED', error: err || (v ? null : 'reply is not valid rubric JSON') })
    }
    results.push({ id: it.id, votes, aggregate: aggregate(votes) })
  }
  return { rubric: RUBRIC_VERSION, panel: panel.map(m => m.id), repeat, items: results, summary: summarise(results) }
}
// majority per dimension over VERIFIED votes; ties and all-unverified are reported, never resolved silently
function aggregate(votes) {
  const ok = votes.filter(v => v.verdict), out = {}
  Object.keys(DIMENSIONS).forEach(d => {
    const counts = {}; ok.forEach(v => { counts[v.verdict[d]] = (counts[v.verdict[d]] || 0) + 1 })
    const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1])
    out[d] = !ranked.length ? { value: 'UNVERIFIED', unanimous: false, counts } : ranked.length > 1 && ranked[0][1] === ranked[1][1]
      ? { value: 'TIE', unanimous: false, counts } : { value: ranked[0][0], unanimous: ranked.length === 1, counts }
  })
  return { dims: out, verifiedVotes: ok.length, unverifiedVotes: votes.length - ok.length }
}
function summarise(results) {
  const s = { items: results.length, unverifiedVotes: 0, byDimension: {} }
  results.forEach(r => { s.unverifiedVotes += r.aggregate.unverifiedVotes })
  Object.keys(DIMENSIONS).forEach(d => {
    const rows = results.map(r => r.aggregate.dims[d])
    s.byDimension[d] = { disagreementRate: rows.filter(x => !x.unanimous && x.value !== 'UNVERIFIED').length / Math.max(1, rows.length), ties: rows.filter(x => x.value === 'TIE').length, unverified: rows.filter(x => x.value === 'UNVERIFIED').length }
  })
  return s
}
module.exports = { evaluate, aggregate, summarise, parseVerdict, PROVIDERS }

if (require.main === module) (async () => {
  const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d }
  const items = JSON.parse(fs.readFileSync(arg('items'), 'utf8')).items
  const panel = String(arg('panel', '')).split(',').filter(Boolean).map(spec => { const [p, model] = spec.split(':'); if (!PROVIDERS[p] || !model) throw new Error('bad panel member ' + spec); return { id: spec, call: PROVIDERS[p](model) } })
  if (!panel.length) { console.log('EVALUATION NOT RUN: no --panel given'); process.exit(2) }
  const missing = panel.filter(m => (m.id.startsWith('gemini') && !process.env.GEMINI_API_KEY) || (m.id.startsWith('anthropic') && !process.env.ANTHROPIC_API_KEY))
  if (missing.length) { console.log('EVALUATION NOT RUN: missing API key for ' + missing.map(m => m.id).join(', ') + ' (no simulated verdicts are substituted)'); process.exit(2) }
  const res = await evaluate(items, panel, { repeat: +arg('repeat', 1) })
  fs.writeFileSync(arg('out', path.join(__dirname, '..', 'results', 'evaluation.json')), JSON.stringify(res, null, 1))
  console.log(JSON.stringify(res.summary, null, 1))
})()
