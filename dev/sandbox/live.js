#!/usr/bin/env node
// SANDBOX LIVE RUN — one benchmark fixture through the REAL app build against REAL Gemini, entirely outside production.
//
//   node sandbox/live.js --fixture ja-daily-2026-10-08 --pipeline gen2 [--cap 0.25] [--app tt.compiled.js] [--label x]
//
// • The app code is the compiled tt.jsx (default ./tt.compiled.js); the run enters through ttBenchRunFixture, the same
//   entry the in-app Benchmark mode uses. Learner state comes from the fixture on a fresh in-memory copy of the word
//   banks: no saved learner data exists here and nothing is persisted.
// • Authentication: this sandbox's network proxy adds the Gemini key as a header. The app's own URL key parameter is
//   given a placeholder and stripped before sending. The key is never visible to this process.
// • HARD COST CAP per run (--cap, default US$0.25) and per session (--session-cap, default US$2 — the owner's cap, ledger in
//   sandbox/spend-ledger.json). Before every request the worst case (prompt + the full maxOutputTokens) is priced; a
//   request that could cross either cap is NOT sent and the app receives HTTP 402 "SANDBOX_COST_CAP" (its fatal-provider
//   path: no retries). Spend is computed from Gemini's own usageMetadata at the app's price table.
// • PIPELINE GUARD: with --pipeline gen2 every request must carry a "[task: gen2-…]" prompt tag; anything else is
//   refused (HTTP 400 "SANDBOX_PIPELINE_GUARD") and reported, so the old generator can never silently run instead.
// • No mock or simulated answer is ever substituted. After the run the recording is replayed offline (no model) and must
//   reproduce identical learner-facing content — proof the recording is complete.
'use strict'
if (process.env.NODE_USE_ENV_PROXY !== '1') {   // Node's fetch only uses the sandbox proxy with this flag
  const r = require('child_process').spawnSync(process.execPath, process.argv.slice(1), { stdio: 'inherit', env: { ...process.env, NODE_USE_ENV_PROXY: '1', NODE_NO_WARNINGS: '1' } })
  process.exit(r.status == null ? 1 : r.status)
}
const fs = require('fs'), path = require('path')
const DEV = path.join(__dirname, '..')
const { runOnceUi, loadFixture, compareContent } = require('../benchmark/run')
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d }

const PRICE = { 'gemini-2.5-flash-lite': { in: 0.10, out: 0.40 }, 'gemini-2.5-flash': { in: 0.30, out: 2.50 } }   // = AI_PRICE_USD_PER_MTOK in tt.jsx (checked below)
const LEDGER = path.join(__dirname, 'spend-ledger.json')
const readLedger = () => { try { return JSON.parse(fs.readFileSync(LEDGER, 'utf8')) } catch (e) { return { sessionCapUsd: null, runs: [] } } }
const modelOf = url => (String(url).match(/models\/([^:?]+):/) || [])[1] || null
const usd = (m, i, o) => { const p = PRICE[m]; if (!p) throw new Error('no price for model ' + m); return (i * p.in + o * p.out) / 1e6 }

;(async () => {
  const fixtureId = arg('fixture'), pipeline = arg('pipeline', 'gen2'), cap = +arg('cap', 0.25), sessionCap = +arg('session-cap', 3.62)
  const appFile = path.resolve(DEV, arg('app', 'tt.compiled.js'))
  const fx = loadFixture(fixtureId)
  const ledger = readLedger(); const spentBefore = ledger.runs.reduce((a, r) => a + (r.costUsd || 0), 0)
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const runId = fixtureId + '.' + pipeline + '.' + (arg('label') ? arg('label') + '.' : '') + stamp
  const dir = path.join(__dirname, 'runs', runId); fs.mkdirSync(dir, { recursive: true })
  console.log('▶ ' + runId + ' · app ' + path.relative(DEV, appFile) + ' · cap US$' + cap + ' (session US$' + sessionCap + ', spent so far US$' + spentBefore.toFixed(4) + ')')

  const acct = { requests: 0, sent: 0, refusedCap: 0, refusedGuard: [], costUsd: 0, worstCaseReserved: 0, byTaskModel: {}, tokens: { in: 0, out: 0 }, httpErrors: {} }
  const liveFetch = async (url, opts) => {
    acct.requests++
    const u = new URL(url); u.searchParams.delete('key')
    const body = JSON.parse(opts.body), model = modelOf(url)
    const prompt = body.contents.map(x => x.parts.map(p => p.text || '').join('')).join('\n')
    const task = (prompt.match(/^\[task: ([^\]]+)\]/) || [])[1] || '(untagged)'
    const k = task + ' @ ' + model; acct.byTaskModel[k] = acct.byTaskModel[k] || { requests: 0, in: 0, out: 0, usd: 0 }
    acct.byTaskModel[k].requests++
    if (pipeline === 'gen2' && !/^gen2-/.test(task)) {
      acct.refusedGuard.push({ task, model, head: prompt.slice(0, 160) })
      return { ok: false, status: 400, json: async () => ({ error: { code: 400, status: 'FAILED_PRECONDITION', message: 'SANDBOX_PIPELINE_GUARD: a non-Gen2 request was attempted in a Gen2 run (not sent)' } }) }
    }
    const worst = usd(model, Math.ceil(prompt.length / 2) + 50, (body.generationConfig && body.generationConfig.maxOutputTokens) || 8192)
    if (acct.costUsd + worst > cap || spentBefore + acct.costUsd + worst > sessionCap) {
      acct.refusedCap++
      return { ok: false, status: 402, json: async () => ({ error: { code: 402, status: 'PAYMENT_REQUIRED', message: 'SANDBOX_COST_CAP: spent US$' + acct.costUsd.toFixed(4) + ' + worst case US$' + worst.toFixed(4) + ' would exceed the cap (not sent)' } }) }
    }
    acct.sent++
    const r = await fetch(u.toString(), opts)
    const j = await r.clone().json().catch(() => null)
    if (!r.ok) acct.httpErrors[r.status] = (acct.httpErrors[r.status] || 0) + 1
    const um = j && j.usageMetadata
    if (um) {
      const i = um.promptTokenCount || 0, o = (um.candidatesTokenCount || 0) + (um.thoughtsTokenCount || 0), c = usd(model, i, o)
      acct.costUsd += c; acct.tokens.in += i; acct.tokens.out += o
      Object.assign(acct.byTaskModel[k], { in: acct.byTaskModel[k].in + i, out: acct.byTaskModel[k].out + o, usd: acct.byTaskModel[k].usd + c })
    } else if (r.ok) acct.costUsd += worst   // no usage reported: charge the worst case, never zero
    if (acct.sent % 10 === 0) process.stdout.write('  … ' + acct.sent + ' requests · US$' + acct.costUsd.toFixed(4) + '\n')
    return r
  }
  let inspected = null
  const t0 = Date.now()
  const r = await runOnceUi(fx, { mode: 'record', provider: 'live', liveFetch, apiKey: 'SANDBOX_PROXY_AUTH', appFile, pipeline,
    inspect: c => { inspected = { appBuild: c.ev('APP_BUILD_VERSION'), gen2Version: c.ev('typeof GEN2_VERSION === "string" ? GEN2_VERSION : null'),
      gen2Flag: c.ev('typeof GEN2_FLAG === "object" ? GEN2_FLAG : null'), prices: c.ev('AI_PRICE_USD_PER_MTOK') } } })
  const secs = Math.round((Date.now() - t0) / 1000)
  if (inspected && JSON.stringify(inspected.prices) !== JSON.stringify(PRICE)) console.log('⚠ price table differs from the app: ' + JSON.stringify(inspected.prices))
  // offline replay of the recording: must reproduce the same learner-facing content with no model
  const rep = await runOnceUi(fx, { mode: 'replay', cassette: r.cassette, appFile, pipeline })
  const cmp = compareContent(r.content, rep.content)
  const g = r.gen2 || {}
  const summary = {
    runId, fixture: fixtureId, pipelineRequested: pipeline, pipelineExecuted: r.pipeline, gen2Version: g.version || null, models: g.models || null, app: inspected,
    status: r.content && r.content.status, reasons: r.content && r.content.reasons, error: r.error ? String(r.error).slice(0, 400) : null, stop: r.stop,
    recalls: r.content && r.content.pairs ? r.content.pairs.length : null, deferred: (g.deferred || []).map(d => d.surface + ' — ' + d.reason),
    gen2Calls: g.calls, gen2ByStage: g.byStage, acceptance: g.acceptance,
    spend: { costUsd: +acct.costUsd.toFixed(5), capUsd: cap, tokens: acct.tokens, requestsSent: acct.sent, refusedByCap: acct.refusedCap, refusedByPipelineGuard: acct.refusedGuard.length, httpErrors: acct.httpErrors, byTaskModel: acct.byTaskModel },
    appCostLedger: r.telemetry && r.telemetry.usageSummary,
    replay: { faithful: rep.replay && rep.replay.faithful, contentIdentical: cmp.identical, mismatches: rep.replay && rep.replay.mismatches.length, unused: rep.replay && rep.replay.unused.length },
    seconds: secs,
  }
  fs.writeFileSync(path.join(dir, 'run.json'), JSON.stringify({ cassette: r.cassette, outcome: { content: r.content, telemetry: r.telemetry, log: r.log, error: r.error, gen2: r.gen2 || null } }))
  fs.writeFileSync(path.join(dir, 'summary.json'), JSON.stringify(summary, null, 1))
  fs.writeFileSync(path.join(dir, 'log.txt'), (r.log || []).join('\n'))
  if (acct.refusedGuard.length) fs.writeFileSync(path.join(dir, 'pipeline-guard.json'), JSON.stringify(acct.refusedGuard, null, 1))
  ledger.sessionCapUsd = sessionCap
  ledger.runs.push({ runId, at: new Date().toISOString(), costUsd: +acct.costUsd.toFixed(5), requests: acct.sent, status: summary.status })
  fs.writeFileSync(LEDGER, JSON.stringify(ledger, null, 1))
  console.log(JSON.stringify({ ...summary, spend: { ...summary.spend, byTaskModel: undefined }, appCostLedger: undefined, gen2ByStage: summary.gen2ByStage, byTaskModel: Object.fromEntries(Object.entries(acct.byTaskModel).map(([k, v]) => [k, v.requests + ' req · US$' + v.usd.toFixed(4)])) }, null, 1))
  console.log('→ ' + path.relative(DEV, dir))
  process.exit(summary.replay.faithful && summary.replay.contentIdentical && !acct.refusedGuard.length ? 0 : 1)
})().catch(e => { console.error('SANDBOX RUN CRASHED: ' + (e && e.stack || e)); process.exit(3) })
