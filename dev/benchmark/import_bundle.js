#!/usr/bin/env node
// v676 (Step 0) — imports the files the in-app benchmark saves (one bundle, or the per-run files, or both) and turns them
// into the v674 LIVE BASELINE:
//   • every run becomes a cassette in benchmark/cassettes/live/ (same format the Node replayer uses)
//   • every run is REPLAYED in Node against the current build: faithful + identical content proves the recording is
//     complete and the baseline is reproducible offline (this is also how a later build is compared against it)
//   • a baseline table (per track type × run: status, coverage, requests, tokens, cost, failures, network errors) is
//     written to benchmark/results/live-baseline-<build>.{json,md}
// Nothing here judges teaching quality — that is the evaluator's job (benchmark/evaluator) plus native-speaker review.
//   node benchmark/import_bundle.js ~/Downloads/tt-benchmark-v676-….json [more run files…] [--no-verify]
'use strict'
const fs = require('fs'), path = require('path')
const { requestKey } = require('./lib/cassette')

function runsFrom(objs) {
  const runs = [], fixtures = new Map()
  for (const o of objs) {
    if (o && o.format === 'tt-benchmark-bundle/1') { (o.fixtures || []).forEach(f => fixtures.set(f.id, f)); (o.runs || []).forEach(r => runs.push(r)) }
    else if (o && o.format === 'tt-benchmark-run/1') runs.push(o)
    else throw new Error('not a benchmark bundle or run file (format ' + (o && o.format) + ')')
  }
  // one run per fixture × runNo (a run saved both as its own file and inside the bundle is the same run)
  const seen = new Map()
  runs.forEach(r => { const k = (r.pipeline || 'production') + '#' + r.fixtureId + '#' + r.runNo + '#' + (r.startedAt || ''); if (!seen.has(k)) seen.set(k, r) })
  return { runs: [...seen.values()].sort((a, b) => a.fixtureId.localeCompare(b.fixtureId) || a.runNo - b.runNo), fixtures }
}
function fixtureFor(r, fixtures) {
  const fromBundle = fixtures.get(r.fixtureId)
  if (fromBundle && fromBundle.wordState) return { ...fromBundle, inventory: { taughtIds: [] } }
  const p = path.join(__dirname, 'fixtures', r.fixtureId + '.json')
  if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'))
  if (fromBundle) return fromBundle
  throw new Error('unknown fixture ' + r.fixtureId)
}
function stats(r) {
  const es = (r.cassette && r.cassette.entries) || []
  const lat = es.filter(e => Number.isFinite(e.latencyMs)).map(e => e.latencyMs).sort((a, b) => a - b)
  const usage = es.reduce((a, e) => { const u = e.response && e.response.body && e.response.body.usageMetadata; if (u) { a.in += u.promptTokenCount || 0; a.out += u.candidatesTokenCount || 0 } return a }, { in: 0, out: 0 })
  const c = r.outcome && r.outcome.content
  const daily = c && Array.isArray(c.pairs)
  return { requests: es.length, http: es.reduce((a, e) => { const s = e.response && (e.response.error ? 'network:' + e.response.error.name : e.response.status); a[s] = (a[s] || 0) + 1; return a }, {}),
    inputTokens: usage.in, outputTokens: usage.out, costUsd: r.outcome && r.outcome.telemetry ? r.outcome.telemetry.costUsd : null,
    latencyMs: lat.length ? { p50: lat[Math.floor(lat.length / 2)], p90: lat[Math.floor(lat.length * 0.9)], max: lat[lat.length - 1] } : null,
    status: (r.outcome && r.outcome.stop) || (c && c.status) || (r.error || (r.outcome && r.outcome.error) ? 'ERROR' : null),
    coverage: c ? (daily ? c.pairs.filter(p => p && p.targetId != null).length + ' target pairs' : (c.coverage ? c.coverage.covered + '/' + c.coverage.required + ' targets' : null) + ' · ' + (c.lines || []).length + ' lines') : null,
    reasons: c && (c.reasons || c.failedChecks) || null, error: r.error || (r.outcome && r.outcome.error) || null }
}
async function importBundle(input, o = {}) {
  const objs = Array.isArray(input) ? input : [input]
  const { runs, fixtures } = runsFrom(objs)
  const outDir = o.outDir || path.join(__dirname, 'cassettes', 'live')
  fs.mkdirSync(outDir, { recursive: true })
  const rows = []
  const run = require('./run')
  for (const r of runs) {
    if (!r.cassette) { rows.push({ fixture: r.fixtureId, run: r.runNo, imported: false, error: r.error || 'no cassette in run file' }); continue }
    r.cassette.entries.forEach(e => { if (!e.key) e.key = requestKey(e.url, JSON.stringify(e.request)) })
    const fx = fixtureFor(r, fixtures)
    const file = path.join(outDir, r.fixtureId + (r.pipeline === 'gen2' ? '.gen2' : '') + '.live.' + (r.appBuild || 'unknown') + '.run' + r.runNo + '.json')
    const doc = { cassette: r.cassette, outcome: r.outcome, browser: { provider: r.provider, fidelity: r.fidelity || fx.fidelity || null, sandbox: r.sandbox || null, startedAt: r.startedAt, finishedAt: r.finishedAt, path: r.path }, label: o.label || null }
    fs.writeFileSync(file, JSON.stringify(doc))
    const row = { fixture: r.fixtureId, pipeline: r.pipeline || 'production', run: r.runNo, fidelity: (r.fidelity || fx.fidelity || {}).class || null, provider: r.provider, appBuild: r.appBuild, file: path.relative(process.cwd(), file), ...stats(r) }
    if (o.verify !== false) {
      const rep = await run.runOnceUi(fx, { mode: 'replay', cassette: r.cassette, appFile: o.appFile })
      const cmp = run.compareContent(r.outcome.content, rep.content)
      row.replayFaithful = rep.replay.faithful; row.contentIdentical = cmp.identical
      if (!rep.replay.faithful) row.replayProblem = { mismatches: rep.replay.mismatches.slice(0, 2), unused: rep.replay.unused.length }
    }
    rows.push(row)
  }
  return { runs: rows }
}
function markdown(rep, label) {
  const by = {}
  rep.runs.forEach(r => { (by[r.fixture] = by[r.fixture] || []).push(r) })
  const L = ['# Live baseline — ' + (label || ''), '', 'Provider per run is recorded in each cassette. **Teaching quality is not in this table** (evaluator + native review).', '',
    '| Track (fixture) | Learner state | Run | Status | Coverage | Requests | Tokens in/out | USD | Network errors | Replays in Node |', '|---|---|---|---|---|---|---|---|---|---|']
  Object.keys(by).sort().forEach(f => by[f].forEach(r => {
    const net = Object.entries(r.http || {}).filter(([k]) => /^network/.test(k) || +k >= 400).map(([k, v]) => k + '×' + v).join(' ') || '0'
    L.push('| ' + f + ' | ' + (r.fidelity || '') + ' | ' + r.run + ' | ' + (r.status || '') + ' | ' + (r.coverage || '') + ' | ' + (r.requests || 0) + ' | ' + (r.inputTokens || 0) + '/' + (r.outputTokens || 0) +
      ' | ' + (Number.isFinite(r.costUsd) ? r.costUsd.toFixed(4) : '') + ' | ' + net + ' | ' + (r.replayFaithful == null ? 'not checked' : r.replayFaithful && r.contentIdentical ? 'yes' : 'NO') + ' |')
  }))
  return L.join('\n') + '\n'
}
module.exports = { importBundle, runsFrom, markdown }
if (require.main === module) (async () => {
  const ai = process.argv.indexOf('--app'), appFile = ai > 0 ? process.argv[ai + 1] : undefined
  const files = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && all[i - 1] !== '--app')
  if (!files.length) { console.log('usage: node benchmark/import_bundle.js <bundle.json | run files…> [--no-verify]'); process.exit(2) }
  const objs = files.map(f => JSON.parse(fs.readFileSync(f, 'utf8')))
  const rep = await importBundle(objs, { verify: !process.argv.includes('--no-verify'), appFile })
  const build = (rep.runs[0] && rep.runs[0].appBuild) || 'unknown'
  const out = path.join(__dirname, 'results', 'live-baseline-' + build)
  fs.writeFileSync(out + '.json', JSON.stringify(rep, null, 1))
  fs.writeFileSync(out + '.md', markdown(rep, build + ' · imported ' + new Date().toISOString().slice(0, 10)))
  rep.runs.forEach(r => console.log(r.fixture.padEnd(30) + ' run ' + r.run + ' · ' + (r.status || '-') + ' · ' + (r.requests || 0) + ' req · $' + (Number.isFinite(r.costUsd) ? r.costUsd.toFixed(4) : '?') + ' · replay ' + (r.replayFaithful == null ? 'not checked' : r.replayFaithful && r.contentIdentical ? 'faithful' : 'NOT faithful')))
  console.log('→ ' + path.relative(process.cwd(), out) + '.{json,md}')
})()
