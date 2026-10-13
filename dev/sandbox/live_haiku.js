#!/usr/bin/env node
// SANDBOX LIVE RUN WITH CLAUDE HAIKU 5.5 — one Daily Track through the REAL app build, every AI request sent to the owner's
// Google Cloud Haiku server (the same server the live site uses). Outside production: in-memory word banks from the benchmark
// fixture; no learner data exists here and nothing is persisted or deployed.
//
//   LT_ACCESS=<site access code> node sandbox/live_haiku.js --fixture th-daily-device-2026-10-09 [--cap 0.20] [--session-cap 0.60] [--label x]
//
// • The site access code comes from the environment only. It is never written to any file, log or export (checked at the end).
// • HARD BUDGET: per run (--cap) and per session (--session-cap, the owner's US$0.60; ledger sandbox/haiku-spend-ledger.json).
//   Before EVERY request the worst case (whole prompt as input + the full max_tokens as output, Haiku prices) is checked; a request
//   that could cross either cap is NOT sent — the app receives a "track_limit" error (its fatal path: the track stops, its draft is
//   kept). Spend is computed from Anthropic's own usage figures. The app's own per-track limit is set to the same cap (second guard).
// • Gemini is never called: any Gemini request is refused and reported.
// • Saved in sandbox/runs/<run>/: export.txt (the app's own export), log.txt (full generation log), calls.json (every Haiku request
//   and reply, no access code), summary.json.
'use strict'
if (process.env.NODE_USE_ENV_PROXY !== '1') {   // Node's fetch only uses the sandbox proxy with this flag
  const r = require('child_process').spawnSync(process.execPath, process.argv.slice(1), { stdio: 'inherit', env: { ...process.env, NODE_USE_ENV_PROXY: '1', NODE_NO_WARNINGS: '1' } })
  process.exit(r.status == null ? 1 : r.status)
}
const fs = require('fs'), path = require('path')
const DEV = path.join(__dirname, '..')
const { runOnceUi, loadFixture } = require('../benchmark/run')
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d }

const SERVER = 'https://language-teacher-anthropic-xhuazatwjq-as.a.run.app'
const MODEL = 'claude-' + 'haiku-5-5'
const PRICE = { in: 0.10, out: 0.50, cacheRead: 0.1, cacheWrite: 1.25 }       // = ANTHROPIC_PRICE_USD_PER_MTOK in tt.jsx (checked below)
const LEDGER = path.join(__dirname, 'haiku-spend-ledger.json')
const readLedger = () => { try { return JSON.parse(fs.readFileSync(LEDGER, 'utf8')) } catch (e) { return { sessionCapUsd: null, runs: [] } } }
const usdOf = u => u ? ((u.input_tokens || 0) * PRICE.in + (u.cache_read_input_tokens || 0) * PRICE.in * PRICE.cacheRead + (u.cache_creation_input_tokens || 0) * PRICE.in * PRICE.cacheWrite + (u.output_tokens || 0) * PRICE.out) / 1e6 : null

;(async () => {
  const ACCESS = String(process.env.LT_ACCESS || '').replace(/\s+/g, '')
  if (!ACCESS) { console.log('LIVE RUN NOT RUN: LT_ACCESS (the site access code) is not set'); process.exit(2) }
  const fixtureId = arg('fixture'), cap = +arg('cap', 0.20), sessionCap = +arg('session-cap', 0.60)
  const appFile = path.resolve(DEV, arg('app', 'tt.compiled.js'))
  const fx = loadFixture(fixtureId)
  const ledger = readLedger(); const spentBefore = ledger.runs.reduce((a, r) => a + (r.costUsd || 0), 0)
  if (spentBefore >= sessionCap) { console.log('LIVE RUN NOT RUN: session budget used (US$' + spentBefore.toFixed(4) + ' of US$' + sessionCap + ')'); process.exit(2) }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const runId = fixtureId + '.haiku.' + (arg('label') ? arg('label') + '.' : '') + stamp
  const dir = path.join(__dirname, 'runs', runId); fs.mkdirSync(dir, { recursive: true })
  console.log('▶ ' + runId + ' · app ' + path.relative(DEV, appFile) + ' · cap US$' + cap + ' (session US$' + sessionCap + ', spent so far US$' + spentBefore.toFixed(4) + ')')

  const acct = { requests: 0, sent: 0, refusedCap: 0, geminiRefused: 0, costUsd: 0, tokens: { in: 0, out: 0, thinking: 0, cacheRead: 0 }, httpErrors: {}, lostBodies: 0 }
  const calls = []
  const refuse = (status, type, message) => ({ ok: true, status: 200, json: async () => ({ type: 'error', status, error: { type, message } }) })
  const wrapFetch = (inner, c) => async (url, opts) => {
    if (String(url) !== SERVER) {                                  // Gemini (or anything else): never sent in this run
      acct.geminiRefused++
      return { ok: false, status: 403, json: async () => ({ error: { code: 403, status: 'PERMISSION_DENIED', message: 'SANDBOX: Gemini is not used in the Haiku live run (not sent)' } }) }
    }
    acct.requests++
    const body = JSON.parse(opts.body)
    const promptChars = JSON.stringify(body.messages || '').length + String(body.system || '').length
    const worst = ((promptChars / 2 + 200) * PRICE.in + (body.max_tokens || 16000) * PRICE.out) / 1e6     // ≥ 1 token per 2 chars (Thai/CJK safe)
    if (acct.costUsd + worst > cap || spentBefore + acct.costUsd + worst > sessionCap) {
      acct.refusedCap++
      return refuse(402, 'track_limit', 'SANDBOX BUDGET: spent US$' + acct.costUsd.toFixed(4) + ' this run (US$' + (spentBefore + acct.costUsd).toFixed(4) + ' session) + worst case US$' + worst.toFixed(4) + ' would exceed the cap (not sent)')
    }
    acct.sent++
    const t0 = Date.now(), headers = { ...opts.headers, 'x-lt-access': ACCESS }
    let res, text = null, data = null
    try { res = await fetch(SERVER, { method: 'POST', headers, body: opts.body, signal: opts.signal }); text = await res.text() }
    catch (e) { calls.push({ seq: acct.sent, ms: Date.now() - t0, request: body, error: String(e && e.message || e) }); throw e }
    try { data = JSON.parse(text) } catch (e) { data = null; if (res.ok) acct.lostBodies++ }
    const u = data && data.usage, cost = usdOf(u)
    if (cost != null) { acct.costUsd += cost; acct.tokens.in += u.input_tokens || 0; acct.tokens.out += u.output_tokens || 0; acct.tokens.cacheRead += u.cache_read_input_tokens || 0
      acct.tokens.thinking += (u.output_tokens_details && u.output_tokens_details.thinking_tokens) || 0 }
    else if (res.ok && !(data && data.type === 'error')) acct.costUsd += worst          // no usage reported: charge the worst case, never zero
    const st = data && data.type === 'error' && data.status ? data.status : res.status
    if (st >= 300) acct.httpErrors[st] = (acct.httpErrors[st] || 0) + 1
    calls.push({ seq: acct.sent, ms: Date.now() - t0, http: st, costUsd: cost, request: { model: body.model, max_tokens: body.max_tokens, system: body.system, messages: body.messages, output_config: body.output_config },
      response: data && data.type === 'message' ? { model: data.model, stop_reason: data.stop_reason, usage: u, content: (data.content || []).filter(b => b.type === 'text') } : data })
    if (acct.sent % 10 === 0) process.stdout.write('  … ' + acct.sent + ' requests · US$' + acct.costUsd.toFixed(4) + '\n')
    return { ok: res.ok, status: res.status, json: async () => { if (data == null) throw new Error('Unexpected end of JSON input'); return JSON.parse(text) } }
  }
  const noGemini = async () => ({ ok: false, status: 403, json: async () => ({ error: { code: 403, message: 'SANDBOX: Gemini not used (not sent)' } }) })
  let C = null
  const t0 = Date.now()
  const r = await runOnceUi(fx, { mode: 'record', provider: 'live', liveFetch: noGemini, apiKey: 'SANDBOX_NO_GEMINI', appFile, pipeline: 'production', wrapFetch,
    prepare: c => { C = c
      c.aiSetGenerationPreference({ model: MODEL, limitUsd: Math.min(1, cap), limitRequests: 600, serverUrl: SERVER })
      c.aiSetAnthropicAccess(ACCESS) } })
  const secs = Math.round((Date.now() - t0) / 1000)
  const appPrice = C.ev('ANTHROPIC_PRICE_USD_PER_MTOK')[MODEL]
  if (appPrice.in !== PRICE.in || appPrice.out !== PRICE.out) console.log('⚠ price table differs from the app: ' + JSON.stringify(appPrice))

  // the app's own export of the finished track (the same text the Export button downloads)
  let exportText = null, exportError = null
  try {
    const track = C.ev('TT_BENCH.lastTrack'), runIdApp = C.ev('TT_BENCH.lastRunId')
    if (!track) throw new Error('no track was produced')
    const sum = C.aiUsageSummary(runIdApp)
    const t = { ...track, generationModel: MODEL, aiUsage: { ...sum, ranked: sum.ranked.slice(0, 12) }, aiCalls: C.aiCompactRows(C.ev('AI_LEDGER').filter(x => x.runId === runIdApp)) }
    let captured = null
    C.Blob = function (parts) { this._text = parts.join('') }
    C.URL = { createObjectURL: b => { captured = b._text; return 'blob:x' }, revokeObjectURL: () => {} }
    C.document = { createElement: () => ({ click() {}, set href(v) {}, set download(v) {} }), body: { appendChild() {}, removeChild() {} } }
    const lang = fx.language
    if (lang === 'ja') C.downloadJapaneseTrack(t)
    else if (lang === 'zh') C.downloadMandarinTrack(t)
    else await C.ev('downloadTrack')(t)
    exportText = captured
  } catch (e) { exportError = String(e && e.stack || e) }

  const content = r.content || {}
  const summary = {
    runId, fixture: fixtureId, language: fx.language, app: C.ev('APP_BUILD_VERSION'), model: MODEL, status: content.status, reasons: content.reasons, error: r.error ? String(r.error).slice(0, 400) : null,
    spend: { costUsd: +acct.costUsd.toFixed(5), capUsd: cap, sessionCapUsd: sessionCap, sessionSpentAfter: +(spentBefore + acct.costUsd).toFixed(5), tokens: acct.tokens,
      requestsSent: acct.sent, refusedByBudget: acct.refusedCap, geminiRefused: acct.geminiRefused, httpErrors: acct.httpErrors, lostBodies: acct.lostBodies },
    appCostLedger: r.telemetry && r.telemetry.usageSummary, integrity: r.telemetry && r.telemetry.integrity, exportError, seconds: secs,
  }
  const out = { 'export.txt': exportText || ('(no export: ' + exportError + ')'), 'log.txt': (r.log || []).join('\n'), 'calls.json': JSON.stringify(calls, null, 1), 'summary.json': JSON.stringify(summary, null, 1) }
  for (const [f, txt] of Object.entries(out)) {
    if (txt.includes(ACCESS)) throw new Error('REFUSING TO SAVE ' + f + ': it contains the access code')   // never persisted
    fs.writeFileSync(path.join(dir, f), txt)
  }
  const ledgerNow = readLedger()
  ledgerNow.sessionCapUsd = sessionCap
  ledgerNow.runs.push({ runId, at: new Date().toISOString(), costUsd: +acct.costUsd.toFixed(5), requests: acct.sent, status: summary.status })
  fs.writeFileSync(LEDGER, JSON.stringify(ledgerNow, null, 1))
  console.log(JSON.stringify({ ...summary, appCostLedger: undefined, integrity: (summary.integrity || []).slice(0, 6) }, null, 1))
  console.log('→ ' + path.relative(DEV, dir))
})().catch(e => { console.error('SANDBOX RUN CRASHED: ' + String(e && e.stack || e).replace(String(process.env.LT_ACCESS || '§none§').replace(/\s+/g, ''), '<access code>')); process.exit(3) })
