#!/usr/bin/env node
// ONE small live Gemini call through the app's OWN request function (geminiRequest in the unchanged v678 build), so the
// call uses the production URL, generationConfig, timeout and cost accounting. The key is read from GEMINI_API_KEY and
// is never printed or written; only its presence is reported.
//   GEMINI_API_KEY=… node smoke_gemini.js
'use strict'
const path = require('path')
const { load } = require('./harness')
if (!process.env.GEMINI_API_KEY) { console.log('NOT RUN: GEMINI_API_KEY is not set in this environment (nothing was sent)'); process.exit(2) }
;(async () => {
  const c = load(path.join(__dirname, 'tt.compiled.js'), { realBelt: true, globals: { setTimeout, clearTimeout } })
  let raw = null
  c.fetch = async (url, opts) => { const r = await fetch(url, opts); raw = r.clone(); return r }   // real network; the clone only lets us read modelVersion
  const runId = c.aiBeginRun('smoke')
  let text = null, err = null
  try { text = await c.geminiRequest({ apiKey: process.env.GEMINI_API_KEY, model: 'gemini-2.5-flash-lite', messages: [{ role: 'user', content: 'Reply with exactly: OK' }], maxTokens: 5, temperature: 0, stage: 'SMOKE', dedupe: false }) }
  catch (e) { err = String(e && e.message || e).replace(/key=[^&\s]+/g, 'key=<redacted>') }
  const body = raw ? await raw.json().catch(() => null) : null
  const rows = c.aiUsageSummaryLines ? c.aiUsageSummaryLines(c.aiUsageSummary(runId)) : null
  console.log(JSON.stringify({ http: raw ? raw.status : null, reply: text, error: err, modelVersion: body && body.modelVersion, usageMetadata: body && body.usageMetadata, appCostLedger: rows }, null, 1))
})()
