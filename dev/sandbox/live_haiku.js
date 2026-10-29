#!/usr/bin/env node
// SANDBOX LIVE RUN WITH CLAUDE HAIKU 5.5 — one Daily Track through the REAL app build, every AI request sent to the owner's
// Google Cloud Haiku server (the same server the live site uses). Outside production: in-memory word banks from the benchmark
// fixture; no learner data exists here and nothing is persisted or deployed.
//
//   LT_ACCESS=<site access code> node sandbox/live_haiku.js --fixture th-daily-device-2026-10-09 [--cap 0.20] [--session-cap 0.60] [--label x]
//   LT_ACCESS=… node sandbox/live_haiku.js --owner-backup <backup.json outside the repo> [--targets id,id,…] [--cap 0.20] (owner-profile Thai Daily)
//   node sandbox/live_haiku.js --via-network-secret … (the cloud environment's network secret adds the x-lt-access header itself)
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
  // --via-network-secret: the cloud environment's network secret adds x-lt-access to every request for SERVER, so the code never
  // enters this process; the app gets a placeholder (it only checks that one is set) and the runner sends no x-lt-access of its own
  const VIA_SECRET = process.argv.includes('--via-network-secret')
  const ACCESS = VIA_SECRET ? 'NETWORK-SECRET' : String(process.env.LT_ACCESS || '').replace(/\s+/g, '')
  if (!ACCESS) { console.log('LIVE RUN NOT RUN: LT_ACCESS (the site access code) is not set (or pass --via-network-secret)'); process.exit(2) }
  const fixtureId = arg('fixture'), cap = +arg('cap', 0.20), sessionCap = +arg('session-cap', 0.60)
  const appFile = path.resolve(DEV, arg('app', 'tt.compiled.js'))
  // --owner-backup <file> [--targets id,id,…]: a Thai Daily on the OWNER'S profile (the backup stays outside the repository) instead of
  // a fixture — the same path as sandbox/daily-relay/bridge-daily.js, so a paid track is directly comparable with the relay tracks
  const ownerBackup = arg('owner-backup'), ownerTargets = arg('targets'), LISTENING = process.argv.includes('--listening')
  const fx = ownerBackup ? { id: 'th-daily-owner', language: 'th' } : loadFixture(fixtureId)
  const ledger = readLedger(); const spentBefore = ledger.runs.reduce((a, r) => a + (r.costUsd || 0), 0)
  if (spentBefore >= sessionCap) { console.log('LIVE RUN NOT RUN: session budget used (US$' + spentBefore.toFixed(4) + ' of US$' + sessionCap + ')'); process.exit(2) }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const runId = (ownerBackup ? (LISTENING ? 'th-listening-owner' : 'th-daily-owner') : fixtureId) + '.haiku.' + (arg('label') ? arg('label') + '.' : '') + stamp
  // owner mode: the saved prompts carry the owner's word list, so the run is written OUTSIDE the repository, next to the backup
  const dir = ownerBackup ? path.join(arg('out-dir', path.join(path.dirname(path.resolve(ownerBackup)), 'runs')), runId) : path.join(__dirname, 'runs', runId)
  if (ownerBackup && path.resolve(dir).startsWith(path.resolve(DEV, '..'))) { console.log('LIVE RUN NOT RUN: owner-profile output must be outside the repository (--out-dir)'); process.exit(2) }
  fs.mkdirSync(dir, { recursive: true })
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
    if (VIA_SECRET) { delete headers['x-lt-access']; delete headers['X-Lt-Access'] }
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
  const r = ownerBackup ? await ownerRun() : await runOnceUi(fx, { mode: 'record', provider: 'live', liveFetch: noGemini, apiKey: 'SANDBOX_NO_GEMINI', appFile, pipeline: 'production', wrapFetch,
    prepare: c => { C = c
      c.aiSetGenerationPreference({ model: MODEL, limitUsd: Math.min(1, cap), limitRequests: 600, serverUrl: SERVER })
      c.aiSetAnthropicAccess(ACCESS) } })
  async function ownerRun() {
    const { load } = require(path.join(DEV, 'harness'))
    C = load(appFile, { realBelt: true, globals: { setTimeout, clearTimeout } }); C.console.info = () => {}; C.console.warn = () => {}
    // --no-bank: the Thai Daily writer gets no vetted exchanges (measures fresh generation on its own — owner: new words must work without vetting)
    // --ln-max-words N: the Listening story is planned around the first N frozen words (the app's default is 25; 0 = no cap)
    { const k = process.argv.indexOf('--ln-max-words'); if (k > 0) { C.ev('LN_STORY_WORD_CAP').maxWords = Number(process.argv[k + 1]); console.log('  (Listening word cap ' + process.argv[k + 1] + ')') } }
    // --bank: switch the vetted Daily exchanges ON (v713: the app's default is off)
    if (process.argv.includes('--bank')) { C.ev('thaiBankSetEnabled')(true); console.log('  (Thai exchange bank ON for this run)') }
    if (process.argv.includes('--no-bank')) { C.ev('thaiBankSetEnabled')(false); console.log('  (Thai exchange bank OFF for this run)') }
    // --yes-and-daily <links.csv>: the Thai DAILY in the yes-and form (v723): modules ordered by scene (links file) + one yes-and line between exchanges
    { const k = process.argv.indexOf('--yes-and-daily')
      if (k > 0) {
        const csv = fs.readFileSync(process.argv[k + 1], 'utf8').replace(/^\ufeff/, '').split(/\r?\n/).filter(Boolean), head = csv[0].split(',')
        C.ev('thaiModulesSetEnabled')(true); const zl = require('zlib'); C.ev('thaiModulesUseData')(JSON.parse(zl.gunzipSync(Buffer.from(C.ev('THAI_MODULES_GZ'), 'base64')).toString('utf8')))
        console.log('  (yes-and Daily ON: ' + C.ev('lnModuleStoryUseLinks')(csv.slice(1).map(l => { const f = l.split(','), o = {}; head.forEach((h, i) => { o[h.trim()] = f[i] }); return o })) + ' module links)')
        C.ev('THAI_YESAND').daily = true
        if (process.argv.includes('--bridge-thinking')) { C.ev('THAI_YESAND').bridgeThinking = true; console.log('  (bridge line written with thinking ON)') }
      } }
    // --ln-module-story <links.csv> [--ln-exclude id,id,…]: the module-led Listening prototype (v722): the story is built from reviewed modules
    // (links file: scene / job / story_safe per module), the model adds only bridge lines; the reading track's module ids are left out
    { const k = process.argv.indexOf('--ln-module-story')
      if (k > 0) {
        const csv = fs.readFileSync(process.argv[k + 1], 'utf8').replace(/^\ufeff/, '').split(/\r?\n/).filter(Boolean), head = csv[0].split(',')
        const rows = csv.slice(1).map(l => { const f = l.split(','), o = {}; head.forEach((h, i) => { o[h.trim()] = f[i] }); return o })
        const ex = arg('ln-exclude') ? (fs.existsSync(arg('ln-exclude')) ? fs.readFileSync(arg('ln-exclude'), 'utf8').split(/[\s,]+/) : arg('ln-exclude').split(',')).filter(Boolean) : []
        C.ev('thaiModulesSetEnabled')(true)
        const zlib = require('zlib'); C.ev('thaiModulesUseData')(JSON.parse(zlib.gunzipSync(Buffer.from(C.ev('THAI_MODULES_GZ'), 'base64')).toString('utf8')))
        console.log('  (module-led Listening ON: ' + C.ev('lnModuleStoryUseLinks')(rows) + ' module links, ' + ex.length + ' reading-track modules left out)')
        const M = C.ev('LN_MODULE_STORY'); M.on = true; ex.forEach(x => M.exclude.add(x))
        const T = C.ev('LN_STORY_TURNS'); T.max = 150; T.sceneMax = 30; T.min = 40
      } }
    // --modules: the Thai Daily writer takes a gap-fill module (filled for the word, checked against the learner's vocabulary) as its first candidate
    if (process.argv.includes('--modules')) {
      const gz = C.ev('THAI_MODULES_GZ'), d = JSON.parse(require('zlib').gunzipSync(Buffer.from(gz, 'base64')).toString('utf8'))
      C.ev('thaiModulesSetEnabled')(true); const n = C.ev('thaiModulesUseData')(d); console.log('  (Thai gap-fill modules ON for this run: ' + n + ' modules)')
    }
    C.fetch = wrapFetch(noGemini, C)
    C.aiSetGenerationPreference({ model: MODEL, limitUsd: Math.min(1, cap), limitRequests: 600, serverUrl: SERVER })
    C.aiSetAnthropicAccess(ACCESS)
    const B = JSON.parse(fs.readFileSync(ownerBackup, 'utf8')), byId = new Map(B.vocab.map(w => [w.id, w]))
    const F = ['status', 'difficulty', 'interval', 'lastSeen', 'dueDate', 'repCount', 'lapses', 'okStreak', 'manualKnown', 'introducedAt', 'note']
    // --history a.txt,b.txt: earlier track exports become the learner's saved tracks (v715 recent-lesson repeat check — used only to refuse
    // repeats, as in the app)
    { const k = process.argv.indexOf('--history'); if (k > 0) { const files = String(process.argv[k + 1] || '').split(',').filter(Boolean)
      const tracks = files.map(f => ({ pairs: fs.readFileSync(f, 'utf8').split('\n').filter(l => /^\s*TH: /.test(l)).map(l => ({ thai: l.replace(/^\s*TH: /, '').trim() })) }))
      await C.ev('stSet')('tt-tracks', tracks); console.log('  (history: ' + tracks.map(t => t.pairs.length).join(' + ') + ' lines from ' + files.length + ' earlier export(s))') } }
    const vocab = C.initVocab().map(w => { const o = byId.get(w.id); if (!o) return w; const n = { ...w }; F.forEach(k => { if (o[k] !== undefined) n[k] = o[k] }); return n })
    B.vocab.forEach(o => { if (!vocab.some(w => w.id === o.id)) vocab.push({ ...o }) })
    const picked = ownerTargets ? ownerTargets.split(',').map(Number) : (LISTENING ? [] : C.pickWords(vocab, 'daily', []).targets.map(w => w.id))
    const log = [], L = x => log.push(typeof x === 'string' ? x : JSON.stringify(x))
    let res = null, error = null
    // --listening: a Thai Listening Track on the owner's profile — the app's own path (selectRevisionTargets snapshot, or the given --targets
    // as a rebuild's frozen ids → generateCohesiveListeningTrack), every request on Haiku; the lines are written to listening-lines.json
    if (LISTENING) {
      try { const runIdApp = C.aiBeginRun('listening-track'), snap = picked.length ? null : C.selectRevisionTargets('th', vocab)
        res = await C.generateCohesiveListeningTrack({ lang: 'th', vocab, apiKey: 'SANDBOX_NO_GEMINI', model: C.ev('GEMINI_DEFAULT_MODEL'), attemptId: 'lattempt-' + runId, rebuildOf: null, speechStyle: null,
          snapshot: snap, targetIds: picked.length ? picked : null, onLog: L, onProgress: () => {} })
        C.ev('TT_BENCH').lastTrack = res && res.track; C.ev('TT_BENCH').lastRunId = runIdApp } catch (e) { error = e }
      const tr = res && res.track, Lx = tr && tr.listening
      if (Lx && Lx.lines) fs.writeFileSync(path.join(dir, 'listening-lines.json'), JSON.stringify({ targets: (tr.coverage && tr.coverage.targets) || tr.targetIds || null, coverage: tr.coverage || null, lines: Lx.lines }, null, 1))
      return { log, error, content: { status: tr && tr.status, reasons: tr && { failureReason: tr.failureReason || null, failedChecks: tr.failedChecks || null, coverage: tr.coverage && (tr.coverage.covered + '/' + tr.coverage.required), turns: Lx && Lx.lines && Lx.lines.length } }, telemetry: {} }
    }
    // --yes-and N: the yes-and TEST format (v723 handover) for the first N target words; the default Daily path is not used
    if (process.argv.includes('--yes-and')) {
      C.ev('THAI_YESAND').on = true
      if (process.argv.includes('--yes-and-nolist')) C.ev('THAI_YESAND').knownList = false      // the known-word list is not sent (the checker names refused words instead)
      if (process.argv.includes('--yes-and-refs')) { C.ev('THAI_YESAND').refs = true      // reviewed module exchanges shown to the writer as references
        C.ev('thaiModulesSetEnabled')(true); const zl = require('zlib'); C.ev('thaiModulesUseData')(JSON.parse(zl.gunzipSync(Buffer.from(C.ev('THAI_MODULES_GZ'), 'base64')).toString('utf8'))) }
      if (arg('yes-and-per')) C.ev('THAI_YESAND').perConv = Number(arg('yes-and-per'))     // k words per conversation (4 → a 30-word track is 90 lines)
      if (process.argv.includes('--yes-and-batch')) C.ev('THAI_YESAND').mode = 'batch'     // one call per conversation (cheap mode)
      try { const runIdApp = C.aiBeginRun('daily-track'); const nW = Number(arg('yes-and')) || picked.length
        await C.ev('thaiModulesLoad')(null)
        res = await C.ev('ttBenchYesAnd')({ targets: picked.map(id => ({ id })) }, vocab, 'SANDBOX_NO_GEMINI', C.ev('GEMINI_DEFAULT_MODEL'), L, runIdApp, nW)
        res.yesAndResult = res.yesAnd; C.ev('TT_BENCH').lastTrack = res.track; C.ev('TT_BENCH').lastRunId = runIdApp } catch (e) { error = e }
      const tr0 = res && res.track
      return { log, error, content: { status: tr0 && tr0.status, reasons: tr0 && { written: tr0.yesAnd.written, dropped: tr0.yesAnd.dropped, gapMin: tr0.yesAnd.plan.gapMin, lines: tr0.pairs.length } }, telemetry: {} }
    }
    try { const runIdApp = C.aiBeginRun('daily-track'); res = await C.ttBenchThaiDaily({ targets: picked.map(id => ({ id })) }, vocab, 'SANDBOX_NO_GEMINI', C.ev('GEMINI_DEFAULT_MODEL'), L, runIdApp)
      C.ev('TT_BENCH').lastTrack = res && res.track; C.ev('TT_BENCH').lastRunId = runIdApp } catch (e) { error = e }
    const tr = res && res.track, rd = tr ? C.trackReadiness(tr) : null
    return { log, error, content: { status: tr && tr.status, reasons: rd && { ready: rd.ready, valid: rd.validTargetPairs, expected: rd.expectedTargetPairs } }, telemetry: {} }
  }
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
    if (!VIA_SECRET && txt.includes(ACCESS)) throw new Error('REFUSING TO SAVE ' + f + ': it contains the access code')   // never persisted
    fs.writeFileSync(path.join(dir, f), txt)
  }
  const ledgerNow = readLedger()
  ledgerNow.sessionCapUsd = sessionCap
  ledgerNow.runs.push({ runId, at: new Date().toISOString(), costUsd: +acct.costUsd.toFixed(5), requests: acct.sent, status: summary.status })
  fs.writeFileSync(LEDGER, JSON.stringify(ledgerNow, null, 1))
  console.log(JSON.stringify({ ...summary, appCostLedger: undefined, integrity: (summary.integrity || []).slice(0, 6) }, null, 1))
  console.log('→ ' + path.relative(DEV, dir))
})().catch(e => { console.error('SANDBOX RUN CRASHED: ' + String(e && e.stack || e).replace(String(process.env.LT_ACCESS || '§none§').replace(/\s+/g, ''), '<access code>')); process.exit(3) })
