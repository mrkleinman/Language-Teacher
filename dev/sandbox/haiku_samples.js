#!/usr/bin/env node
// PAID — the first controlled Claude Haiku 5.5 sample calls (owner approval required before running).
// Sends a handful of REAL generation prompts (taken from the recorded v682 live Daily runs, one per language by default)
// through the app's own Anthropic transport (anthropicRequest → /api/anthropic) and the real server function
// (netlify/edge-functions/anthropic.js) using the official SDK — i.e. the same code a deployed site would run, minus Netlify.
// Prints, per call: language, stage, stop reason, served model, input / output / thinking tokens, cost, and whether the reply
// parses into the same JSON shape Gemini returned for that prompt. Hard limits: --max calls (default 3, at most 6) and a
// US$ cap (default 0.05). Nothing is written to any learner data; replies are saved to sandbox/logs/haiku-samples-<time>.json.
//
//   ANTHROPIC_API_KEY=… node sandbox/haiku_samples.js --confirm-paid [--max 3] [--cap 0.05] [--langs th,ja,zh]
// The key is read from the environment only; it is never printed or saved.
'use strict'
const fs = require('fs'), path = require('path'), os = require('os')
const DEV = path.join(__dirname, '..'), ROOT = path.join(DEV, '..')
const { load } = require('../harness')
const { promptTextOf } = require('../benchmark/lib/cassette')
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d }
const MAX = Math.min(6, parseInt(arg('max', '3'), 10) || 3), CAP = Math.min(0.25, parseFloat(arg('cap', '0.05')) || 0.05)
const LANGS = String(arg('langs', 'th,ja,zh')).split(',')
if (!process.argv.includes('--confirm-paid')) { console.log('PAID script: add --confirm-paid once the owner has approved the sample budget.'); process.exit(2) }
if (!process.env.ANTHROPIC_API_KEY) { console.log('ANTHROPIC_API_KEY is not set in this environment (never paste it into chat).'); process.exit(2) }

;(async () => {
  const SDK = (await import('@anthropic-ai/sdk')).default
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lt-proxy-')), modFile = path.join(tmp, 'anthropic.mjs')
  fs.writeFileSync(modFile, fs.readFileSync(path.join(ROOT, 'netlify', 'edge-functions', 'anthropic.js'), 'utf8').replace(/^import Anthropic from "npm:@anthropic-ai\/sdk@[\d.]+";$/m, 'const Anthropic = null; const Netlify = null;'))
  const proxy = await import('file://' + modFile)
  const ACCESS = 'local-sample-run-' + Math.random().toString(36).slice(2)
  const env = { ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY, LT_ACCESS_CODE: ACCESS }
  const c = load(path.join(DEV, 'tt.compiled.js'), { realBelt: true, globals: { setTimeout, clearTimeout } })
  c.fetch = async (url, opts) => {
    if (String(url) !== '/api/anthropic') throw new Error('sample run: no other network request is allowed (' + String(url).slice(0, 60) + ')')
    const r = await proxy.handleAnthropicProxy(new Request('https://local/api/anthropic', { method: 'POST', headers: opts.headers, body: opts.body }), { getEnv: k => env[k], Anthropic: SDK })
    const txt = await r.text()
    return { ok: r.ok, status: r.status, json: async () => JSON.parse(txt) }
  }
  c.aiSetGenerationPreference({ model: 'claude-haiku-5-5', limitUsd: CAP, limitRequests: 10 }); c.aiSetAnthropicAccess(ACCESS)
  // pick the first A_generation (Thai) / generation prompt (Japanese, Mandarin) of each recorded run
  const RUNS = path.join(DEV, 'sandbox', 'runs'), picks = []
  for (const d of fs.readdirSync(RUNS).filter(x => /production\.v682-final4/.test(x)).sort()) {
    const lang = d.slice(0, 2); if (!LANGS.includes(lang)) continue
    const run = JSON.parse(fs.readFileSync(path.join(RUNS, d, 'run.json')))
    // a first-attempt generation prompt (Japanese generation prompts carry their stage from the caller, so match their text)
    const isGen = p => /^A_generation$/.test(c.aiStageOf(p, [])) || /^You are a Japanese teacher writing natural spoken Japanese for a learner/.test(p)
    const e = run.cassette.entries.find(x => isGen(promptTextOf(JSON.stringify(x.request))))
    if (e) picks.push({ lang, entry: e })
  }
  const results = []
  const runId = c.aiBeginRun('daily-track')
  for (const { lang, entry } of picks.slice(0, MAX)) {
    const prompt = promptTextOf(JSON.stringify(entry.request)), gc = entry.request.generationConfig || {}
    const schema = gc.responseSchema || (gc.responseMimeType === 'application/json' ? true : null)
    const gemText = ((((entry.response || {}).body || {}).candidates || [])[0] || { content: { parts: [] } }).content.parts.map(p => p.text || '').join('')
    let text = null, error = null
    try { text = await c.anthropicRequest({ model: 'claude-haiku-5-5', messages: [{ role: 'user', content: prompt }], maxTokens: gc.maxOutputTokens || 1200, stage: 'A_generation', json: schema, _chain: ['haikuSamples'], _promptText: prompt, runCtl: c.ev('AI_CTX').controller, runId }) }
    catch (e) { error = String(e && e.message || e) }
    const row = c.ev('AI_LEDGER').filter(r => r.runId === runId && r.provider === 'anthropic').slice(-1)[0] || {}
    const shape = s => { try { const v = JSON.parse(String(s).replace(/^```json\n?|\n?```$/g, '')); return Array.isArray(v) ? 'array[' + (v[0] && typeof v[0] === 'object' ? Object.keys(v[0]).sort().join(',') : typeof v[0]) + ']' : v && typeof v === 'object' ? 'object{' + Object.keys(v).sort().join(',') + '}' : typeof v } catch (e) { return 'not JSON' } }
    const r = { lang, stage: row.stage, http: row.http, stop: row.stopReason, served: row.servedModel, usage: row.usage, costUsd: row.costUsd, error, haikuShape: text ? shape(text) : null, geminiShape: shape(gemText), sameShape: text ? shape(text) === shape(gemText) : false, reply: text }
    results.push(r)
    console.log([lang, r.stage, 'http ' + r.http, 'stop ' + r.stop, 'model ' + r.served, 'in ' + (r.usage && r.usage.prompt), 'out ' + (r.usage && r.usage.output), 'thinking ' + (r.usage && r.usage.thoughts), 'US$' + (r.costUsd || 0).toFixed(5), 'same JSON shape as Gemini: ' + r.sameShape, error ? 'ERROR ' + error.slice(0, 120) : ''].join(' · '))
    if (error && /UNAVAILABLE|TRACK LIMIT/.test(error)) break
  }
  const total = results.reduce((a, r) => a + (r.costUsd || 0), 0)
  console.log('TOTAL ' + results.length + ' call(s) · US$' + total.toFixed(5) + ' (cap US$' + CAP + ')')
  const outDir = path.join(DEV, 'sandbox', 'logs'); fs.mkdirSync(outDir, { recursive: true })
  const f = path.join(outDir, 'haiku-samples-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json')
  fs.writeFileSync(f, JSON.stringify({ at: new Date().toISOString(), capUsd: CAP, totalUsd: total, results }, null, 1))
  console.log('saved ' + path.relative(DEV, f))
  fs.rmSync(tmp, { recursive: true, force: true })
})().catch(e => { console.log('CRASH ' + (e && e.stack || e)); process.exit(1) })
