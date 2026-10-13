// Optional generation model (Claude Haiku 5.5, experimental) — offline suite. Real application functions, mocked transport,
// no network, no model, no cost.
//   S — the setting: Gemini by default, persisted, bound to the run and to the track, never changed mid-run or on a saved track
//   R — routing: only writing requests of a Haiku-bound run go to /api/anthropic; every judge, pronunciation and utility stays on Gemini
//   M — mapping: Messages API request (adaptive thinking, effort, no sampling parameters) and reply (thinking / text / stop reasons)
//   E — failures: fatal errors are latched and never retried; transient ones are retried and logged; never a silent switch to Gemini
//   C — cost: Haiku priced from its own usage (thinking included), long-prompt tier, cache, per-provider report
//   L — per-track spending ceiling and request limit
//   P — the three recorded LIVE Daily runs replayed with generation answered through the Haiku path: identical tracks, same QC
//   Q — QC cannot be bypassed: corrupted "Haiku" output is rejected by the same checks
//   X — security: no Anthropic key in client files, access code never logged or sent to Gemini; learner data untouched
//   F — the server function (netlify/edge-functions/anthropic.js) with a stand-in SDK and with the real SDK on a mocked network
//   node tests45.js [--app path/to/compiled.js]
'use strict'
const fs = require('fs'), path = require('path'), os = require('os')
const { load } = require('./harness')
const out = []; let n = 0, fails = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + id.padEnd(5) + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 900) : '')) }
const ai = process.argv.indexOf('--app'), APP = ai > 0 ? path.resolve(process.argv[ai + 1]) : path.join(__dirname, 'tt.compiled.js')
const SRC = fs.readFileSync(path.join(__dirname, 'tt.jsx'), 'utf8')
const ROOT = path.join(__dirname, '..'), PROXY = path.join(ROOT, 'netlify', 'edge-functions', 'anthropic.js')
const HAIKU = 'claude-haiku-5-5', GEM = 'gemini-2.5-flash-lite', KEY = 'AIzaSyTEST-harness-key-000000', CODE = 'test-access-code-7f3a'

// a fresh app with a scripted transport: gemini(url, body) and anthropic(body, headers) return Response-likes
const resp = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => JSON.parse(JSON.stringify(body)) })
const gemOk = text => resp(200, { candidates: [{ content: { parts: [{ text }] } }], usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 20, totalTokenCount: 120 } })
const msg = (text, o) => Object.assign({ id: 'msg_1', type: 'message', role: 'assistant', model: HAIKU, stop_reason: 'end_turn', stop_details: null,
  content: [{ type: 'thinking', thinking: '', signature: 's' }, { type: 'text', text }],
  usage: { input_tokens: 1000, output_tokens: 2000, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, output_tokens_details: { thinking_tokens: 1500 } } }, o || {})
const err = (status, type, message) => resp(status, { type: 'error', error: { type, message: message || type } })
function app(o) {
  o = o || {}
  const c = load(APP, { realBelt: true })
  const calls = { gemini: [], anthropic: [] }
  let aq = (o.anthropic || []).slice()
  c.fetch = async (url, opts) => {
    if (String(url) === '/api/anthropic' || /^https:\/\/[^/]+\.run\.app/.test(String(url))) {
      calls.urls = (calls.urls || []).concat(String(url))
      calls.anthropic.push({ body: JSON.parse(opts.body), headers: opts.headers })
      const _b = JSON.parse(opts.body), _f = _b.output_config && _b.output_config.format
      const r = aq.length ? aq.shift() : resp(200, msg(_f && _f.schema && _f.schema.properties && _f.schema.properties.items && Object.keys(_f.schema.properties).length === 1 ? '{"items":[]}' : '[]'))
      if (r instanceof Error) throw r
      return typeof r === 'function' ? r(JSON.parse(opts.body)) : r
    }
    calls.gemini.push({ url: String(url), body: JSON.parse(opts.body) })
    return o.gemini ? o.gemini(url, opts) : gemOk('[]')
  }
  c.__calls = calls
  c.__queue = list => { aq = list.slice() }
  if (o.haiku) { c.aiSetGenerationPreference({ model: HAIKU, limitUsd: o.limitUsd || 1, limitRequests: o.limitRequests || 300 }); c.aiSetAnthropicAccess(o.code === undefined ? CODE : o.code) }
  return c
}
const ask = (c, o) => c.geminiRequest(Object.assign({ apiKey: KEY, model: GEM, messages: [{ role: 'user', content: o.prompt || 'You write Pimsleur-style Thai lessons. Write one exchange.' }], maxTokens: 1200 }, o))
const rows = (c, runId) => c.ev('AI_LEDGER').filter(r => !runId || r.runId === runId)
const deepKeys = (o, acc = []) => { if (o && typeof o === 'object') Object.entries(o).forEach(([k, v]) => { acc.push(k); deepKeys(v, acc) }); return acc }
const tryAsync = async f => { try { return { v: await f() } } catch (e) { return { e } } }

;(async () => {
  // ══ S — the setting ═════════════════════════════════════════════════════════════════════════════════════════════
  {
    const c = app()
    T('S1', 'default generation model is Gemini 2.5 Flash-Lite (existing users unchanged)', c.aiGenerationPreference().model === GEM && c.aiRunGenerationModel('daily-track') === GEM)
    const bad = c.aiSetGenerationPreference({ model: 'gpt-x', limitUsd: 99, limitRequests: 3 })
    T('S2', 'an unknown model or out-of-range limit falls back to the safe defaults (Gemini · US$0.25 · 300 requests)', bad.model === GEM && bad.limitUsd === 0.25 && bad.limitRequests === 300, bad)
    // persistence through the app's own storage (window.storage → localStorage), as the Settings card and app start do
    c.aiSetGenerationPreference({ model: HAIKU, limitUsd: 0.4, limitRequests: 120 })
    await c.stSet(c.ev('AI_GEN_PREF_KEY'), c.aiGenerationPreference())
    const c2 = load(APP, { realBelt: true }); c2.localStorage.setItem = c.localStorage.setItem
    const raw = c.localStorage.getItem(c.ev('AI_GEN_PREF_KEY')) || (await c.stGet(c.ev('AI_GEN_PREF_KEY')) && JSON.stringify(await c.stGet(c.ev('AI_GEN_PREF_KEY'))))
    const restored = c2.aiSetGenerationPreference(JSON.parse(raw))
    T('S3', 'the choice persists: saved under tt-generation-model and restored on the next start', restored.model === HAIKU && restored.limitUsd === 0.4 && restored.limitRequests === 120, { raw, restored })
    T('S3b', 'app start loads the saved choice and the site access code (next to the Gemini key)', /const gk = await stGet\('tt-gemini-key'\)[^\n]*\n\s*try \{ aiSetGenerationPreference\(await stGet\(AI_GEN_PREF_KEY\)\); aiSetAnthropicAccess\(await stGet\(AI_ANTHROPIC_ACCESS_KEY\)\)/.test(SRC))
    const kinds = ['daily-track', 'revision-track', 'weak-track', 'th-track', 'ja-track', 'zh-track', 'listening-track', 'listening-th', 'listening-handoff', 'quality-review', undefined].map(k => c.aiRunGenerationModel(k))
    const others = ['v684-daily', 'gen2-daily'].map(k => c.aiRunGenerationModel(k))
    T('S4', 'v687: every track run in all three languages (Daily, Revision, Weak-words, Listening, quality review) takes the selected model; only the experimental benchmark pipelines stay on Gemini', kinds.every(m => m === HAIKU) && others.every(m => m === GEM), { kinds, others })
    const runId = c.aiBeginRun('ja-track')
    c.aiSetGenerationPreference({ model: GEM })
    T('S5', 'changing the setting mid-run never changes the running track\'s model', c.aiRunGenModel(runId) === HAIKU)
    c.aiSetGenerationPreference({ model: HAIKU })
    const r1 = c.aiBeginRun('zh-track', 'tid1', { genModel: GEM }), r2 = (c.aiSetGenerationPreference({ model: GEM }), c.aiBeginRun('zh-track', 'tid2', { genModel: HAIKU }))
    T('S6', 'work on an existing track keeps the model it was made with (Gemini track under a Haiku setting, and the reverse)', c.aiRunGenModel(r1) === GEM && c.aiRunGenModel(r2) === HAIKU)
    const sites = (SRC.match(/aiBeginRun\(track\.language \+ '-track', track\.createdAt, \{ genModel: track\.generationModel \|\| GEMINI_DEFAULT_MODEL \}\)/g) || []).length
    T('S6b', 'the existing-track entry points (Japanese and Mandarin QC rebuild, Thai Retry missing) pass the track\'s own model', sites === 2 && /aiBeginRun\('daily-track', null, \{ genModel: t0\.generationModel \|\| GEMINI_DEFAULT_MODEL \}\)/.test(SRC), sites)
    T('S7', 'Settings shows "AI Generation Model" with exactly the two labelled choices', /AI Generation Model/.test(SRC) && /label: 'Gemini 2\.5 Flash-Lite', tag: 'Default'/.test(SRC) && /label: 'Claude Haiku 5\.5', tag: 'Experimental'/.test(SRC) && /<GenerationModelCard \/>/.test(SRC)
      && Object.keys(c.ev('AI_GEN_MODELS')).length === 2)
    T('S8', 'the model is stamped on the finished track and its export (finaliseMainTrack, the Thai screen, the export header)',
      /generationModel: fin\.generationModel \|\| aiRunGenModel\(o\.runId\)/.test(SRC) && /generationModel: prev\.generationModel \|\| aiRunGenModel\(aiRunRef\.current\)/.test(SRC) && /GENERATION_MODEL: ' \+ t\.generationModel/.test(SRC))
    // checkpoints: a draft written by one model is never finished by the other
    c.aiSetGenerationPreference({ model: GEM })
    const fake = { version: c.ev('GEN_CHECKPOINT_VERSION'), lang: 'zh', mode: 'daily', resumes: 0, generationModel: HAIKU }
    const fp = c.genCheckpointFingerprint('zh', [], []); fake.fingerprint = fp
    const k1 = c.genCheckpointCompatible(fake, 'zh', [], [])
    c.aiSetGenerationPreference({ model: HAIKU }); const k2 = c.genCheckpointCompatible(fake, 'zh', [], [])
    T('S9', 'a saved draft is resumed only with the model that wrote it (clear reason otherwise)', !k1.ok && /written by Claude Haiku 5\.5/.test(k1.reason) && k2.ok, { k1, k2 })
    const u1 = c.aiSetGenerationPreference({ model: HAIKU, serverUrl: ' https://language-teacher-anthropic-abc123-as.a.run.app/ ' }).serverUrl
    const u2 = c.aiSetGenerationPreference({ model: HAIKU, serverUrl: 'http://insecure.example.com' }).serverUrl, u3 = c.aiSetGenerationPreference({ model: HAIKU, serverUrl: 'javascript:alert(1)' }).serverUrl
    const u4 = c.aiSetGenerationPreference({ model: HAIKU, serverUrl: 'http://127.0.0.1:8799' }).serverUrl; c.aiSetGenerationPreference({ model: HAIKU })
    T('S10', 'server address: an https URL is kept (spaces / trailing slash trimmed); plain http only for this computer (local testing); anything else is refused; empty = this site\'s /api/anthropic',
      u1 === 'https://language-teacher-anthropic-abc123-as.a.run.app' && u2 === '' && u3 === '' && u4 === 'http://127.0.0.1:8799' && c.anthropicServerUrl() === '/api/anthropic', { u1, u2, u3, u4 })
    c.aiSetAnthropicAccess(' lt-UpA1bR4 OBvp\nPyd '); const stripped = c.ev('AI_ANTHROPIC_ACCESS'); c.aiSetAnthropicAccess(CODE)
    T('S10b', 'the access code ignores spaces and line breaks picked up when copying from a phone (generated codes never contain any)', stripped === 'lt-UpA1bR4OBvpPyd', stripped)
    const sv = app({ haiku: true }); sv.aiSetGenerationPreference({ ...sv.aiGenerationPreference(), serverUrl: 'https://lt-anthropic-xyz.a.run.app' }); sv.aiBeginRun('daily-track')
    await ask(sv, { stage: 'A_generation' })
    T('S11', 'generation requests go to the saved server address (the Google Cloud function), with the access code header', (sv.__calls.urls || [])[0] === 'https://lt-anthropic-xyz.a.run.app' && sv.__calls.anthropic[0].headers['x-lt-access'] === CODE, sv.__calls.urls)
  }

  // ══ R — routing ═════════════════════════════════════════════════════════════════════════════════════════════════
  {
    const c = app({ haiku: true, anthropic: [resp(200, msg('[{"thai":"x"}]'))] })
    const runId = c.aiBeginRun('daily-track')
    const t = await ask(c, { stage: 'A_generation' })
    T('R1', 'Haiku run: a generation request goes to /api/anthropic (not to Gemini) and returns the reply text', c.__calls.anthropic.length === 1 && c.__calls.gemini.length === 0 && t === '[{"thai":"x"}]', c.__calls)
    await ask(c, { stage: 'C_group_eval', prompt: 'Evaluate this Thai language learning group' })
    await ask(c, { prompt: 'Rate how well each Thai sentence matches its prompt description.' })
    await ask(c, { stage: 'H_recovery', json: c.ev('GEMINI_SCHEMAS.verdicts'), prompt: 'QUOTA RECOVERY verdicts' })
    await ask(c, { stage: 'I_segmentation', prompt: 'Segment this Thai sentence' })
    await ask(c, { stage: 'J_romanisation', prompt: 'Re-romanize each Thai sentence' })
    await ask(c, { prompt: 'Give tone-marked romanization for each Thai word.' })      // an unnamed stage (P_other) → Gemini
    T('R2', 'v687 Haiku mode: judges (by stage, by prompt, by verdict schema), pronunciation, segmentation and unnamed requests ALSO go to Haiku — nothing to Gemini',
      c.__calls.anthropic.length === 7 && c.__calls.gemini.length === 0, { a: c.__calls.anthropic.length, g: c.__calls.gemini.length })
    await ask(c, { stage: 'Z_key_test', prompt: 'hi', maxTokens: 5 })
    c.aiSetGenerationPreference({ model: GEM }); await ask(c, { stage: 'Q_kru_chat', prompt: 'Kru question' }); await ask(c, { stage: 'A_generation', prompt: 'still the run' })
    T('R2b', 'Settings → Test Key always checks the Gemini key; Kru chat / word auto-fill follow the CURRENT setting; a running track keeps its model',
      c.__calls.gemini.length === 2 && c.__calls.anthropic.length === 8, { a: c.__calls.anthropic.length, g: c.__calls.gemini.length })
    const role = (s, p, ch, j) => c.aiRequestRole(s, p, ch, j)
    const roles = [role('A_generation'), role('B_generation_retry'), role('A0_scene'), role('G_replace'), role('H_recovery'), role('H_recovery_audit'), role('E_cue_check'), role('L_final_cue_audit'),
      role('F_naturalness_final'), role('P_other'), role('H_recovery', '', ['aiQcEvaluateGroup']), role('A_generation', '', ['fetchTargetPhonetics']), role('H_recovery', '', ['thaiControlledAdjudication']),
      role('O_listening_reading'), role('Q_kru_chat'), role('R_word_autofill')]
    T('R3', 'request roles: writing stages → generation; judge stages / judge callers → judge; pronunciation callers and utilities → support; anything unknown → other',
      JSON.stringify(roles) === JSON.stringify(['generation', 'generation', 'generation', 'generation', 'generation', 'judge', 'judge', 'judge', 'judge', 'other', 'judge', 'support', 'judge', 'support', 'support', 'support']), roles)
    const g = app()
    g.aiBeginRun('daily-track')
    await ask(g, { stage: 'A_generation' }); await ask(g, { stage: 'C_group_eval' })
    const gb = g.__calls.gemini[0].body
    T('R4', 'Gemini run (the default): every request goes to Gemini exactly as before (thinking off, same settings); nothing to /api/anthropic',
      g.__calls.anthropic.length === 0 && g.__calls.gemini.length === 2 && gb.generationConfig.thinkingConfig.thinkingBudget === 0 && gb.generationConfig.temperature === 0.7 && /gemini-2\.5-flash-lite:generateContent/.test(g.__calls.gemini[0].url))
    const l = app({ haiku: true }); l.aiBeginRun('listening-th'); await ask(l, { stage: 'O_listening_scene', prompt: 'Write ONE natural Thai LISTENING conversation' })
    T('R5', 'v687: with Haiku selected, a Listening run uses Haiku too', l.__calls.anthropic.length === 1 && l.__calls.gemini.length === 0)
    T('R6', 'one transport switch only: the generators call the same function for both models (no forked generator, no Haiku-only rules)',
      (SRC.match(/const work = _optModel \? anthropicRequest\(/g) || []).length === 1 && (SRC.match(/anthropicRequest\(\{/g) || []).length === 3 && !/provider === 'anthropic'[^\n]*(accept|reject|quota|valid)/i.test(SRC))
  }

  // ══ M — mapping ═════════════════════════════════════════════════════════════════════════════════════════════════
  {
    const c = app({ haiku: true })
    c.aiBeginRun('daily-track')
    await ask(c, { stage: 'A_generation', temperature: 0.9, messages: [{ role: 'system', content: 'SYS' }, { role: 'user', content: 'U1' }, { role: 'assistant', content: 'A1' }] })
    const b = c.__calls.anthropic[0].body, keys = deepKeys(b)
    T('M1', 'request: model claude-haiku-5-5, adaptive thinking, effort "low", system prompt separate, starts and ends with the user',
      b.model === HAIKU && b.thinking.type === 'adaptive' && b.output_config.effort === 'low' && b.system === 'SYS' && b.messages[0].role === 'user' && b.messages[b.messages.length - 1].role === 'user', b)
    T('M2', 'request: no temperature, top_p, top_k or budget_tokens anywhere (Haiku 5.5 rejects non-default sampling)', !keys.some(k => /^(temperature|top_p|top_k|topP|topK|budget_tokens)$/.test(k)), keys)
    T('M3', 'request: max_tokens leaves room for thinking (3× the Gemini cap, min 2048) within the 16000 ceiling', b.max_tokens === 3600)
    const lines = c.anthropicJsonFormat(c.ev('GEMINI_SCHEMAS.lines')), verd = c.anthropicJsonFormat(c.ev('GEMINI_SCHEMAS.verdicts'))
    const objs = []; const walk = s => { if (!s || typeof s !== 'object') return; if (s.type === 'object') objs.push(s); Object.values(s).forEach(walk) }; walk(lines.format.schema); walk(verd.format.schema)
    T('M4', 'structured output: the app\'s Gemini schemas become JSON Schema (every object closed with additionalProperties:false; an array root wrapped in {items})',
      objs.length > 0 && objs.every(o => o.additionalProperties === false) && lines.format.type === 'json_schema' && (lines.wrapped === (c.ev('GEMINI_SCHEMAS.lines').type !== 'OBJECT')), { lines, verd })
    const nul = c.anthropicJsonSchema({ type: 'STRING', nullable: true })
    T('M5', 'nullable fields become anyOf [type, null]', JSON.stringify(nul) === JSON.stringify({ anyOf: [{ type: 'string' }, { type: 'null' }] }), nul)
    // replies
    const R = (m, w) => c.anthropicReplyText(m, w)
    const ok1 = R(msg('hello')), ok2 = R(msg('{"items":[1,2]}'), true)
    T('M6', 'reply: thinking blocks are counted and skipped, text blocks joined; a wrapped structured reply is unwrapped to the shape Gemini returned',
      ok1.ok && ok1.text === 'hello' && ok1.thinkingBlocks === 1 && ok2.ok && ok2.text === '[1,2]', { ok1, ok2 })
    const badR = [R(msg('x', { stop_reason: 'refusal', stop_details: { category: 'general_harms' } })), R(msg('x', { stop_reason: 'max_tokens' })), R(msg('', {})), R({ type: 'message' }),
      R(msg('{"other":1}'), true), R(msg('not json'), true), R(msg('x', { stop_reason: 'pause_turn' }))]
    T('M7', 'reply: refusal, cut-off (max_tokens), empty text, no content, malformed structured JSON and unexpected stops are all rejected — valid JSON alone is not enough',
      badR.every(r => !r.ok) && /REFUSAL \(general_harms\)/.test(badR[0].problem) && /MAX_TOKENS/.test(badR[1].problem), badR.map(r => r.problem))
    const m2 = app({ haiku: true, anthropic: [resp(200, msg('cut', { stop_reason: 'max_tokens' }))] }); const run2 = m2.aiBeginRun('daily-track')
    const r2 = await tryAsync(() => ask(m2, { stage: 'A_generation' }))
    const row2 = rows(m2, run2).slice(-1)[0]
    T('M8', 'a rejected reply is a failed candidate: not retried, not sent to Gemini, logged (stop reason, thinking blocks), not fatal',
      r2.e && !r2.e.fatalProvider && m2.__calls.anthropic.length === 1 && m2.__calls.gemini.length === 0 && row2.ok === false && row2.stopReason === 'max_tokens' && row2.thinkingBlocks === 1, { e: r2.e && r2.e.message, row2 })
  }

  // ══ E — failures ════════════════════════════════════════════════════════════════════════════════════════════════
  {
    const fatal = async (label, r, reason) => {
      const c = app({ haiku: true, anthropic: [r, resp(200, msg('later'))] }); const runId = c.aiBeginRun('daily-track')
      const a = await tryAsync(() => ask(c, { stage: 'A_generation' }))
      const b = await tryAsync(() => ask(c, { stage: 'B_generation_retry' }))
      const rs = rows(c, runId)
      return { ok: a.e && a.e.fatalProvider && a.e.fatalProvider.reason === reason && /NOT changed; select Gemini in Settings/.test(a.e.message) && c.__calls.anthropic.length === 1 && c.__calls.gemini.length === 0
        && b.e && b.e.fatalProvider && rs.length === 2 && rs[1].latched === true, detail: { msg: a.e && a.e.message, reason: a.e && a.e.fatalProvider, sent: c.__calls.anthropic.length, gem: c.__calls.gemini.length, rows: rs.map(r => [r.http, r.latched, r.error]) } }
    }
    const cases = [['E1', 'site access code wrong (401 access_denied)', err(401, 'access_denied'), 'ACCESS_DENIED'],
      ['E2', 'Anthropic billing / no credit (402 billing_error)', err(402, 'billing_error', 'Your credit balance is too low'), 'CREDITS_DEPLETED'],
      ['E3', 'Anthropic key rejected (401 authentication_error)', err(401, 'authentication_error'), 'AUTH'],
      ['E4', 'key may not use the model (403 permission_error)', err(403, 'permission_error'), 'PERMISSION'],
      ['E5', 'server function not configured (503 not_configured)', err(503, 'not_configured', 'set ANTHROPIC_API_KEY'), 'NOT_CONFIGURED'],
      ['E6', 'server function not deployed (404 with no API error type)', resp(404, null), 'NOT_DEPLOYED'],
      ['E7', 'model not available (404 not_found_error)', err(404, 'not_found_error'), 'MODEL_NOT_FOUND']]
    for (const [id, label, r, reason] of cases) { const f = await fatal(label, r, reason); T(id, label + ' → one request, never retried, never sent to Gemini; the rest of the run is not sent; clear message', f.ok, f.detail) }
    const c = app({ haiku: true, anthropic: [err(429, 'rate_limit_error'), resp(200, msg('ok'))] }); const run = c.aiBeginRun('daily-track')
    const t = await ask(c, { stage: 'A_generation' }), rs = rows(c, run)
    T('E8', 'rate limit (429) is retried on Haiku and the retry is logged with its reason', t === 'ok' && c.__calls.anthropic.length === 2 && rs[1].attempt === 2 && /429 rate_limit_error/.test(rs[1].retryReason) && c.__calls.gemini.length === 0, rs.map(r => [r.attempt, r.http, r.retryReason]))
    const o = app({ haiku: true, anthropic: [err(529, 'overloaded_error'), err(529, 'overloaded_error'), err(529, 'overloaded_error'), resp(200, msg('never'))] }); o.aiBeginRun('daily-track')
    const oe = await tryAsync(() => ask(o, { stage: 'A_generation' }))
    T('E9', 'overload (529) ×3 → at most 3 attempts, then an error (not fatal, not a switch to Gemini)', oe.e && !oe.e.fatalProvider && o.__calls.anthropic.length === 3 && o.__calls.gemini.length === 0, { m: oe.e && oe.e.message, n: o.__calls.anthropic.length })
    const w = app({ haiku: true, anthropic: [new TypeError('Failed to fetch'), resp(200, msg('ok'))] }); w.aiBeginRun('daily-track')
    T('E10', 'a dropped connection is retried once more and then succeeds', (await ask(w, { stage: 'A_generation' })) === 'ok' && w.__calls.anthropic.length === 2)
    const ka = app({ haiku: true, anthropic: [resp(200, { type: 'error', status: 402, error: { type: 'billing_error', message: 'Your credit balance is too low' } }), resp(200, { type: 'error', status: 529, error: { type: 'overloaded_error', message: 'Overloaded' } })] })
    const karun = ka.aiBeginRun('daily-track'), kae = await tryAsync(() => ask(ka, { stage: 'A_generation' }))
    const kb = app({ haiku: true, anthropic: [resp(200, { type: 'error', status: 529, error: { type: 'overloaded_error' } }), resp(200, msg('ok'))] }); const kbrun = kb.aiBeginRun('daily-track')
    const kbt = await ask(kb, { stage: 'A_generation' })
    T('E13', 'an error the server function writes into its 200 keep-alive reply is handled by its real status: 402 latched and not retried; 529 retried',
      kae.e && kae.e.fatalProvider && kae.e.fatalProvider.reason === 'CREDITS_DEPLETED' && ka.__calls.anthropic.length === 1 && rows(ka, karun)[0].http === 402 && kbt === 'ok' && kb.__calls.anthropic.length === 2 && rows(kb, kbrun)[0].http === 529,
      { kae: kae.e && kae.e.message, n: ka.__calls.anthropic.length })
    const st = async (r) => { const a = app({ haiku: true, anthropic: [r, resp(200, msg('later'))] }); const run = a.aiBeginRun('daily-track'); const e1 = await tryAsync(() => ask(a, { stage: 'A_generation' })); const e2 = await tryAsync(() => ask(a, { stage: 'A_generation', prompt: 'next' })); return { a, e1: e1.e, e2: e2.e, sent: a.__calls.anthropic.length } }
    const s405 = await st(resp(405, null)), s403 = await st(resp(403, null)), sor = await st(err(403, 'origin_not_allowed'))
    T('E14', 'a host with no server function (GitHub Pages answers 405) → stops at once: NOT_DEPLOYED, tells the learner to enter the Google Cloud function\'s address; nothing more sent',
      s405.e1 && s405.e1.fatalProvider && s405.e1.fatalProvider.reason === 'NOT_DEPLOYED' && /Server address/.test(s405.e1.message) && s405.sent === 1 && s405.e2 && s405.e2.fatalProvider, s405.e1 && s405.e1.message)
    T('E15', 'a server that refuses (403 without an API error, e.g. Cloud Run not public) or rejects this site\'s origin → stops at once with its own reason',
      s403.e1 && s403.e1.fatalProvider.reason === 'SERVER_REFUSED' && /allow unauthenticated/.test(s403.e1.message) && sor.e1 && sor.e1.fatalProvider.reason === 'ORIGIN_NOT_ALLOWED' && s403.sent === 1 && sor.sent === 1, [s403.e1 && s403.e1.message, sor.e1 && sor.e1.message])
    const un = app({ haiku: true, anthropic: [new TypeError('Failed to fetch'), new TypeError('Failed to fetch'), new TypeError('Failed to fetch'), resp(200, msg('never'))] }); un.aiBeginRun('daily-track')
    const ue = await tryAsync(() => ask(un, { stage: 'A_generation' })), ue2 = await tryAsync(() => ask(un, { stage: 'A_generation', prompt: 'n2' }))
    T('E16', 'server unreachable after 3 tries (wrong address, CORS, offline) → the track stops (draft kept) instead of failing every request; no Gemini fallback',
      ue.e && ue.e.fatalProvider && ue.e.fatalProvider.reason === 'UNREACHABLE' && un.__calls.anthropic.length === 3 && ue2.e && ue2.e.fatalProvider && un.__calls.gemini.length === 0, ue.e && ue.e.message)
    const nc = app({ haiku: true, code: '' }); nc.aiBeginRun('daily-track')
    const ne = await tryAsync(() => ask(nc, { stage: 'A_generation' }))
    T('E11', 'no site access code → nothing is sent, a clear error, no Gemini fallback', ne.e && ne.e.fatalProvider && ne.e.fatalProvider.reason === 'ACCESS_DENIED' && nc.__calls.anthropic.length === 0 && nc.__calls.gemini.length === 0, ne.e && ne.e.message)
    T('E12', 'fatal provider errors stop the generators (they re-throw e.fatalProvider) — the same path Gemini\'s 402 takes', (SRC.match(/e\.fatalProvider \|\| e\.cancelled\)\) throw e/g) || []).length >= 20)
  }

  // ══ C — cost ════════════════════════════════════════════════════════════════════════════════════════════════════
  {
    const c = app({ haiku: true, anthropic: [err(429, 'rate_limit_error'), resp(200, msg('a')),
      resp(200, msg('b', { usage: { input_tokens: 150000, output_tokens: 100, output_tokens_details: { thinking_tokens: 0 } } })),
      resp(200, msg('c', { usage: { input_tokens: 1000, output_tokens: 0, cache_read_input_tokens: 10000, cache_creation_input_tokens: 2000 } }))], limitUsd: 2 })
    const run = c.aiBeginRun('daily-track')
    await ask(c, { stage: 'A_generation' }); await ask(c, { stage: 'B_generation_retry', prompt: 'p2' }); await ask(c, { stage: 'G_replace', prompt: 'p3' })
    const rs = rows(c, run), a = rs.filter(r => r.provider === 'anthropic')
    const near = (x, y) => Math.abs(x - y) < 1e-12
    T('C1', 'Haiku cost from its own usage at US$0.10 in / 0.50 out per M, thinking tokens counted as output (1000 in, 2000 out of which 1500 thinking → US$0.0011)',
      near(a[1].costUsd, 0.0011) && a[1].costSource === 'provider-usage' && a[1].usage.thoughts === 1500 && a[1].usage.candidates === 500 && a[1].servedModel === HAIKU, a[1])
    T('C2', 'prompts above 100K tokens use the long-context price (US$0.50 / 2.50)', near(a[2].costUsd, (150000 * 0.5 + 100 * 2.5) / 1e6), a[2].costUsd)
    T('C3', 'cache reads 0.1× and cache writes 1.25× the input price', near(a[3].costUsd, (1000 * 0.1 + 10000 * 0.1 * 0.1 + 2000 * 0.1 * 1.25) / 1e6), a[3].costUsd)
    const s = c.aiUsageSummary(run), bp = s.byProvider
    T('C4', 'usage summary per provider: requests, failures, retries with reasons, input / output / thinking tokens, cost, requested and served model',
      bp.anthropic.requests === 4 && bp.anthropic.failed === 1 && bp.anthropic.retries === 1 && bp.anthropic.retryReasons['retry after HTTP 429 rate_limit_error'] === 1 && bp.anthropic.thinkingTok === 1500
      && bp.anthropic.servedModels[HAIKU] === 3 && !bp.gemini && s.generationModel === HAIKU && near(bp.anthropic.costUsd, a.reduce((x, r) => x + (r.costUsd || 0), 0)), bp)
    const lines = c.aiUsageSummaryLines(s).join('\n')
    T('C5', 'the report names both providers, the selected model, thinking tokens, cost per stage and the total', /AI USAGE SUMMARY \(Gemini \+ Claude Haiku\)/.test(lines) && /AI PROVIDERS \(this run\) · selected generation model: Claude Haiku 5\.5/.test(lines)
      && /ANTHROPIC: 4 requests \(1 failed, 1 provider retries: retry after HTTP 429 rate_limit_error ×1\)/.test(lines) && /thinking 1500/.test(lines) && /ANTHROPIC cost by stage: /.test(lines) && /Estimated total track cost \(all providers\)/.test(lines), lines.slice(-900))
    const g = app(); const grun = g.aiBeginRun('daily-track'); await ask(g, { stage: 'A_generation' })
    const gl = g.aiUsageSummaryLines(g.aiUsageSummary(grun)).join('\n')
    T('C6', 'a Gemini-only run reports exactly as before (no provider section, no Claude wording)', !/AI PROVIDERS|Claude|ANTHROPIC/.test(gl) && /GEMINI USAGE SUMMARY/.test(gl), gl.slice(-600))
  }

  // ══ L — limits ══════════════════════════════════════════════════════════════════════════════════════════════════
  {
    const c = app({ haiku: true, limitRequests: 10 }); const run = c.aiBeginRun('daily-track')
    for (let i = 0; i < 10; i++) await ask(c, { stage: 'A_generation', prompt: 'p' + i })
    const e = await tryAsync(() => ask(c, { stage: 'A_generation', prompt: 'p11' }))
    T('L1', 'request limit: the 11th Haiku request of a 10-request track is not sent; clear message; the draft is kept', e.e && e.e.fatalProvider.reason === 'TRACK_LIMIT' && c.__calls.anthropic.length === 10 && /draft is kept/.test(e.e.message), e.e && e.e.message)
    const big = () => resp(200, msg('x', { usage: { input_tokens: 1000, output_tokens: 3000, output_tokens_details: { thinking_tokens: 2000 } } }))   // US$0.0016 each
    const d = app({ haiku: true, limitUsd: 0.01, anthropic: Array.from({ length: 20 }, big) }); const drun = d.aiBeginRun('daily-track')
    let stop = null; for (let i = 0; i < 20 && !stop; i++) { const r = await tryAsync(() => ask(d, { stage: 'A_generation', prompt: 'q' + i })); if (r.e) stop = r.e }
    const spent = d.aiRunSpend(drun, 'anthropic').costUsd
    T('L2', 'spending ceiling: requests stop BEFORE the per-track ceiling could be passed (worst case of the next request checked first)', stop && stop.fatalProvider.reason === 'TRACK_LIMIT' && spent <= 0.01 && d.__calls.anthropic.length >= 3, { spent, sent: d.__calls.anthropic.length })
    const d2 = d.aiBeginRun('daily-track'); d.__queue([big()])
    T('L3', 'limits are per track: the next track starts from zero', (await ask(d, { stage: 'A_generation', prompt: 'fresh' })) === 'x' && d.aiRunSpend(d2, 'anthropic').requests === 1)
    T('L4', 'limits are configurable in Settings (US$ and requests) and the server function caps max_tokens at 16000 independently',
      /Limits per track \(Claude Haiku requests\)/.test(SRC) && /MAX_TOKENS_CEILING = 16000/.test(fs.readFileSync(PROXY, 'utf8')))
  }

  // ══ P — recorded live Daily runs through the Haiku path ═══════════════════════════════════════════════════════════
  {
    const { runOnceUi, loadFixture, compareContent } = require('./benchmark/run')
    const { haikuReplayWrap } = require('./sandbox/haiku_replay')
    const RUNS = path.join(__dirname, 'sandbox', 'runs')
    const dirs = fs.existsSync(RUNS) ? fs.readdirSync(RUNS).filter(x => /production\.v682-final4/.test(x)).sort() : []
    if (dirs.length !== 3) out.push('BLOCKED P1-3 recorded v682-final4 runs not found')
    for (const d of dirs) {
      const run = JSON.parse(fs.readFileSync(path.join(RUNS, d, 'run.json'))), fxId = d.split('.')[0], lang = d.slice(0, 2)
      const h = haikuReplayWrap(run.cassette); let C
      const r = await runOnceUi(loadFixture(fxId), { mode: 'replay', cassette: run.cassette, pipeline: 'production', wrapFetch: h.wrapFetch,
        prepare: c => { C = c; c.aiSetGenerationPreference({ model: HAIKU, limitUsd: 5, limitRequests: 2000 }); c.aiSetAnthropicAccess(CODE) } })
      const cmp = compareContent(run.outcome.content, r.content), rs = C.ev('AI_LEDGER')
      const an = rs.filter(x => x.provider === 'anthropic' && !x.deduped), gm = rs.filter(x => x.provider === 'gemini')
      const checks = an.filter(x => /^(C_|E_|F_|L_|I_|J_|K_)/.test(x.stage)).length
      T('P' + ({ ja: 1, th: 2, zh: 3 })[lang], lang + ': recorded live Daily run (' + run.cassette.entries.length + ' requests) with EVERY request answered via the Haiku path → identical track; every recorded request used once; ' +
        an.length + ' requests on Haiku (' + checks + ' of them checks / pronunciation), none on Gemini',
        cmp.identical && r.replay.faithful && !h.stats.unmatched.length && an.length === h.stats.anthropic && an.length === run.cassette.entries.length && gm.length === 0 && checks > 0 && !r.error,
        { cmp: cmp.identical, mm: r.replay.mismatches.length, unused: r.replay.unused.length, unmatched: h.stats.unmatched, err: r.error && r.error.slice(0, 200) })
      if (lang === 'th') {
        const ut = r.telemetry.usageSummary.join('\n')
        T('P4', 'the run report shows the Haiku requests and cost by stage (no Gemini line) and the access code is in none of it', /ANTHROPIC: \d+ requests/.test(ut) && !/GEMINI: \d+ requests/.test(ut) && !ut.includes(CODE) && !JSON.stringify(rs).includes(CODE) && !r.log.join('\n').includes(CODE)
          && [...h.stats.accessHeaders].join() === CODE, ut.slice(-900))
      }
    }
  }

  // ══ Q — QC cannot be bypassed ═══════════════════════════════════════════════════════════════════════════════════
  {
    const { runOnceUi, loadFixture, compareContent } = require('./benchmark/run')
    const { haikuSimWrap } = require('./sandbox/haiku_replay')
    const INJ = { th: 'คอมพิวเตอร์', ja: 'コンピューター', zh: '计算机' }, FLD = { th: 'thai', ja: 'japanese', zh: 'chinese' }
    const prep = c => { c.aiSetGenerationPreference({ model: HAIKU, limitUsd: 5, limitRequests: 2000 }); c.aiSetAnthropicAccess(CODE) }
    for (const fxId of ['th-daily-2026-10-12', 'ja-daily-2026-10-12', 'zh-daily-2026-10-12']) {
      const lang = fxId.slice(0, 2), F = loadFixture(fxId)
      const g = await runOnceUi(F, { mode: 'record', provider: 'sim', pipeline: 'production' })
      const h = haikuSimWrap()
      const a = await runOnceUi(F, { mode: 'record', provider: 'sim', pipeline: 'production', wrapFetch: h.wrapFetch, prepare: prep })
      const rx = new RegExp('("' + FLD[lang] + '"\\s*:\\s*")', 'g')
      const m = haikuSimWrap({ mutate: t => t.replace(rx, '$1' + INJ[lang]) })
      const b = await runOnceUi(F, { mode: 'record', provider: 'sim', pipeline: 'production', wrapFetch: m.wrapFetch, prepare: prep })
      const id = 'Q' + ({ th: 1, ja: 2, zh: 3 })[lang]
      T(id, lang + ' (simulated model): Haiku-routed run = Gemini run, identical track; when "Haiku" writes an untaught word (' + INJ[lang] + ') into every sentence the same checks reject it — it never reaches the track and the track is not complete',
        compareContent(g.content, a.content).identical && h.stats.anthropic > 0 && m.stats.mutated > 0 && !JSON.stringify(b.content || {}).includes(INJ[lang]) && !(b.content && b.content.status === 'READY'),
        { same: compareContent(g.content, a.content).identical, an: h.stats.anthropic, mutated: m.stats.mutated, status: b.content && b.content.status, stop: b.stop })
    }
  }

  // ══ X — security and learner data ═══════════════════════════════════════════════════════════════════════════════
  {
    const clientFiles = [path.join(__dirname, 'tt.jsx'), APP, path.join(ROOT, 'index.html')].filter(f => fs.existsSync(f))
    const keyish = /sk-ant-[A-Za-z0-9_-]{8,}/
    const leaks = clientFiles.filter(f => keyish.test(fs.readFileSync(f, 'utf8')))
    const direct = clientFiles.filter(f => /api\.anthropic\.com/.test(fs.readFileSync(f, 'utf8')))
    T('X1', 'no Anthropic key in any client file (tt.jsx, compiled app, production index.html) and the browser never calls api.anthropic.com directly', !leaks.length && !direct.length && clientFiles.length >= 2, { leaks, direct })
    const px = fs.readFileSync(PROXY, 'utf8')
    T('X2', 'the key is read only on the server (Netlify environment variable), never returned: the reply carries only id / model / content / stop reason / usage',
      /getEnv\("ANTHROPIC_API_KEY"\)/.test(px) && /Netlify\.env\.get\(k\)/.test(px) && !/apiKey[^\n]*reply\(/.test(px) && !/Access-Control-Allow-Origin/.test(px))
    const c = app({ haiku: true }); const run = c.aiBeginRun('daily-track')
    await ask(c, { stage: 'A_generation' }); await ask(c, { stage: 'Z_key_test', prompt: 'hi', maxTokens: 5 })
    const logs = JSON.stringify(rows(c, run)) + c.aiUsageSummaryLines(c.aiUsageSummary(run)).join('\n') + JSON.stringify(c.__logs)
    T('X3', 'the site access code travels only in the x-lt-access header to /api/anthropic — never in a log, ledger row, report or Gemini request',
      c.__calls.anthropic[0].headers['x-lt-access'] === CODE && c.__calls.gemini.length === 1 && !logs.includes(CODE) && !JSON.stringify(c.__calls.gemini).includes(CODE) && !JSON.stringify(c.__calls.anthropic[0].body).includes(CODE))
    T('X4', 'stored on the device: the model choice, limits and server address (no credential) and the site access code only — the Settings card never asks for an Anthropic key',
      /AI_GEN_PREF_KEY = 'tt-generation-model'/.test(SRC) && /This is not your Anthropic API key/.test(SRC) && !/sk-ant/.test(SRC) && JSON.stringify(c.aiGenerationPreference()).match(/^\{"model":"[^"]+","limitUsd":[\d.]+,"limitRequests":\d+,"serverUrl":"(https:\/\/[^"]*)?"\}$/))
    // learner data: the new code writes only its two own keys
    const writes = (SRC.match(/stSet\(AI_[A-Z_]+_KEY/g) || []).concat(SRC.match(/stSet\(AI_ANTHROPIC_ACCESS_KEY/g) || [])
    const haikuBlock = SRC.slice(SRC.indexOf('const AI_GEN_MODELS = Object.freeze'), SRC.indexOf('// ══ v675 (Step 0) — OPT-IN BENCHMARK CAPTURE'))
    const card = SRC.slice(SRC.indexOf('function GenerationModelCard()'), SRC.indexOf('function Settings('))
    T('X5', 'learner data untouched: the new code writes no track, vocabulary, bookmark, belt or SRS key — only tt-generation-model and tt-anthropic-site-access',
      !/stSet\(/.test(haikuBlock) && (card.match(/stSet\(([A-Z_]+)/g) || []).every(s => /AI_GEN_PREF_KEY|AI_ANTHROPIC_ACCESS_KEY/.test(s)) && writes.length >= 2 && !/tt-(vocab|tracks|bookmarks|srs|belt)/.test(haikuBlock + card))
    T('X6', 'the experimental generators stay off (v684 teaching plan and Gen2 are not switched on by this change)', /function aiRunGenerationModel/.test(SRC) && !/setTeachingPlan\(true\)/.test(haikuBlock + card) && !/gen2/i.test(haikuBlock.replace(/'gen2Judge'|gen2JaPronounce|\(gen2-\|v684-\)|gen2-, v684-/g, '')))
  }

  // ══ F — the server function ═════════════════════════════════════════════════════════════════════════════════════
  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lt-proxy-'))
    const modFile = path.join(tmp, 'anthropic.mjs')
    fs.writeFileSync(modFile, fs.readFileSync(PROXY, 'utf8').replace(/^import Anthropic from "npm:@anthropic-ai\/sdk@[\d.]+";$/m, 'const Anthropic = null; const Netlify = null;'))
    const mod = await import('file://' + modFile)
    const P = mod.buildParams
    const p1 = P({ model: HAIKU, max_tokens: 99999, temperature: 1, top_p: 0.5, top_k: 3, tools: [{}], stream: true, thinking: { type: 'enabled', budget_tokens: 9000 }, messages: [{ role: 'user', content: 'hi' }], output_config: { effort: 'max' } })
    T('F1', 'server whitelist: drops temperature / top_p / top_k / tools / stream / budget_tokens, forces adaptive thinking, caps max_tokens at 16000, effort limited to low–high',
      p1.params && !('temperature' in p1.params) && !('top_p' in p1.params) && !('top_k' in p1.params) && !('tools' in p1.params) && !('stream' in p1.params) && p1.params.thinking.type === 'adaptive' && p1.params.max_tokens === 16000 && p1.params.output_config.effort === 'low', p1)
    T('F2', 'server rejects other models and conversations that do not start and end with the user', !!P({ model: 'claude-opus-5-5', messages: [{ role: 'user', content: 'x' }] }).error && !!P({ model: HAIKU, messages: [{ role: 'user', content: 'x' }, { role: 'assistant', content: 'y' }] }).error)
    const env = { ANTHROPIC_API_KEY: 'sk-test-server-only', LT_ACCESS_CODE: CODE }
    const seen = []
    class FakeSDK { constructor(o) { seen.push(o); this.messages = { create: async p => { seen.push(p); return { id: 'm', type: 'message', model: HAIKU, role: 'assistant', content: [{ type: 'text', text: 'ok' }], stop_reason: 'end_turn', usage: { input_tokens: 5, output_tokens: 1 } } } } } }
    FakeSDK.APIError = class extends Error {}
    const req = (body, code, method) => new Request('https://site.test/api/anthropic', { method: method || 'POST', headers: code === undefined ? {} : { 'x-lt-access': code }, body: method === 'GET' ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)) })
    const H = (r, e) => mod.handleAnthropicProxy(r, { getEnv: k => (e || env)[k], Anthropic: FakeSDK })
    const good = { model: HAIKU, max_tokens: 100, messages: [{ role: 'user', content: 'hi' }] }
    const st = [await H(req(null, CODE, 'GET')), await H(req(good, CODE), {}), await H(req(good, 'wrong')), await H(req(good)), await H(req('x'.repeat(400 * 1024), CODE)), await H(req('{bad', CODE))]
    const codes = st.map(r => r.status), types = await Promise.all(st.map(r => r.json().then(j => j.error && j.error.type)))
    T('F3', 'server refuses: GET (405), not configured (503), wrong or missing access code (401), oversized body (413), invalid JSON (400) — and calls Anthropic for none of them',
      JSON.stringify(codes) === '[405,503,401,401,413,400]' && types[1] === 'not_configured' && types[2] === 'access_denied' && seen.length === 0, { codes, types })
    const okr = await H(req(good, CODE)), okj = await okr.json()
    T('F4', 'server success: SDK built with the server key and no automatic retries; the browser gets the message (never the key)',
      okr.status === 200 && seen[0].apiKey === env.ANTHROPIC_API_KEY && seen[0].maxRetries === 0 && okj.content[0].text === 'ok' && !JSON.stringify(okj).includes(env.ANTHROPIC_API_KEY) && okr.headers.get('cache-control') === 'no-store', okj)
    // the real SDK on a mocked network
    let SDK = null
    try { SDK = (await import('@anthropic-ai/sdk')).default } catch (e) { SDK = null }
    if (!SDK) out.push('BLOCKED F5-6 @anthropic-ai/sdk not installed (npm i in dev/)')
    else {
      const net = []
      const mk = queue => class extends SDK { constructor(o) { super({ ...o, fetch: async (url, init) => { net.push({ url: String(url), headers: Object.fromEntries(new Headers(init.headers)), body: JSON.parse(init.body) }); const [s, b] = queue.shift(); return new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json' } }) } }) } }
      const R1 = mk([[200, { id: 'msg_x', type: 'message', role: 'assistant', model: HAIKU, content: [{ type: 'thinking', thinking: '', signature: 's' }, { type: 'text', text: '{"items":[]}' }], stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 10, output_tokens: 20, output_tokens_details: { thinking_tokens: 12 } } }]])
      const body = { model: HAIKU, max_tokens: 3600, system: 'S', thinking: { type: 'adaptive' }, output_config: { effort: 'low', format: { type: 'json_schema', schema: { type: 'object', properties: { items: { type: 'array', items: { type: 'string' } } }, required: ['items'], additionalProperties: false } } }, messages: [{ role: 'user', content: 'hi' }], temperature: 0.7 }
      const r1 = await mod.handleAnthropicProxy(req(body, CODE), { getEnv: k => env[k], Anthropic: R1 }), j1 = await r1.json()
      const sent = net[0] || {}
      T('F5', 'real SDK: POST api.anthropic.com/v1/messages with the server key in x-api-key, adaptive thinking, effort, JSON schema and no temperature; reply passed through with thinking usage',
        r1.status === 200 && sent.url === 'https://api.anthropic.com/v1/messages' && sent.headers['x-api-key'] === env.ANTHROPIC_API_KEY && sent.body.thinking.type === 'adaptive' && sent.body.output_config.effort === 'low'
        && sent.body.output_config.format.type === 'json_schema' && !('temperature' in sent.body) && j1.usage.output_tokens_details.thinking_tokens === 12 && j1.content.length === 2, { status: r1.status, sent: sent.body, j1 })
      const R2 = mk([[402, { type: 'error', error: { type: 'billing_error', message: 'Your credit balance is too low' } }], [200, {}]])
      const n0 = net.length, r2 = await mod.handleAnthropicProxy(req(good, CODE), { getEnv: k => env[k], Anthropic: R2 }), j2 = await r2.json()
      T('F6', 'real SDK: a billing error comes back as {type:"error", status:402, billing_error} after ONE network call (no retries on the server) — the app then latches it', j2.type === 'error' && j2.status === 402 && j2.error.type === 'billing_error' && /credit balance/.test(j2.error.message) && net.length - n0 === 1, { status: r2.status, j2, calls: net.length - n0 })
    }
    // keep-alive: Netlify needs response headers within ~40 s; the function answers at once and pads with spaces while Haiku works
    let release; const slow = class extends FakeSDK { constructor(o) { super(o); this.messages = { create: () => new Promise(r => { release = () => r({ id: 'm2', type: 'message', model: HAIKU, role: 'assistant', content: [{ type: 'text', text: 'late' }], stop_reason: 'end_turn', usage: { input_tokens: 1, output_tokens: 1 } }) }) } } }
    slow.APIError = FakeSDK.APIError
    const sr = await mod.handleAnthropicProxy(req(good, CODE), { getEnv: k => env[k], Anthropic: slow, keepAliveMs: 5 })
    const rd = sr.body.getReader(), dec = new TextDecoder(); let txt = ''
    const first = await rd.read(); txt += dec.decode(first.value)
    release(); for (;;) { const ch = await rd.read(); if (ch.done) break; txt += dec.decode(ch.value) }
    T('F8', 'long answers: headers (200) are sent before Anthropic replies, the connection is kept alive with spaces, then the JSON follows (valid JSON with leading whitespace)',
      sr.status === 200 && /^ +/.test(txt) && JSON.parse(txt).content[0].text === 'late', JSON.stringify(txt.slice(0, 40)))
    // ── the Google Cloud Run function (dev/server/google-cloud-anthropic) — the server for the GitHub Pages site ──
    const gdir = path.join(__dirname, 'server', 'google-cloud-anthropic'), gFile = path.join(tmp, 'gcf.mjs')
    const gsrc = fs.readFileSync(path.join(gdir, 'index.js'), 'utf8')
    fs.writeFileSync(gFile, gsrc.replace(/^import functions from "@google-cloud\/functions-framework";$/m, '').replace(/^import Anthropic from "@anthropic-ai\/sdk";$/m, 'const Anthropic = null;').replace(/^functions\.http\(.*$/m, ''))
    const G = await import('file://' + gFile)
    const ORIGIN = 'https://mrkleinman.github.io'
    const mkRes = () => { const r = { code: 200, headers: {}, body: null, status(c) { this.code = c; return this }, set(k, v) { this.headers[k.toLowerCase()] = v; return this }, json(o) { this.body = o; return this }, send(b) { this.body = b; return this } }; return r }
    const mkReq = (method, body, hdrs) => { const h = Object.fromEntries(Object.entries(hdrs || {}).map(([k, v]) => [k.toLowerCase(), v])); const raw = body == null ? '' : typeof body === 'string' ? body : JSON.stringify(body); let parsed; try { parsed = JSON.parse(raw) } catch (e) { parsed = raw }
      return { method, headers: h, get: k => h[k.toLowerCase()], body: parsed, rawBody: Buffer.from(raw) } }
    const gcalls = []
    class GFake { constructor(o) { gcalls.push(o); this.messages = { create: async p => { gcalls.push(p); return { id: 'm', type: 'message', model: HAIKU, role: 'assistant', content: [{ type: 'text', text: 'ok' }], stop_reason: 'end_turn', usage: { input_tokens: 5, output_tokens: 1 } } } } } }
    GFake.APIError = class extends Error {}
    const GH = async (req, e, sdk) => { const r = mkRes(); await G.handleAnthropic(req, r, { getEnv: k => (e || env)[k], Anthropic: sdk || GFake }); return r }
    const pre = await GH(mkReq('OPTIONS', null, { Origin: ORIGIN })), evil = await GH(mkReq('POST', good, { Origin: 'https://evil.example', 'x-lt-access': CODE }))
    const gget = await GH(mkReq('GET', null, { Origin: ORIGIN })), gnc = await GH(mkReq('POST', good, { Origin: ORIGIN, 'x-lt-access': CODE }), {}), gbad = await GH(mkReq('POST', good, { Origin: ORIGIN, 'x-lt-access': 'nope' }))
    const gbig = await GH(mkReq('POST', 'x'.repeat(400 * 1024), { Origin: ORIGIN, 'x-lt-access': CODE })), gmod = await GH(mkReq('POST', { ...good, model: 'claude-opus-5-5' }, { Origin: ORIGIN, 'x-lt-access': CODE }))
    T('G1', 'Google function: browser preflight from the GitHub Pages site allowed (204, x-lt-access header permitted); other sites refused (403); GET 405; not configured 503; wrong code 401; oversized 413; other model 400 — none reaches Anthropic',
      pre.code === 204 && pre.headers['access-control-allow-origin'] === ORIGIN && /x-lt-access/.test(pre.headers['access-control-allow-headers']) && evil.code === 403 && evil.body.error.type === 'origin_not_allowed' && !evil.headers['access-control-allow-origin']
      && gget.code === 405 && gnc.code === 503 && gnc.body.error.type === 'not_configured' && gbad.code === 401 && gbad.body.error.type === 'access_denied' && gbig.code === 413 && gmod.code === 400 && gcalls.length === 0,
      [pre.code, evil.code, gget.code, gnc.code, gbad.code, gbig.code, gmod.code, gcalls.length])
    const gok = await GH(mkReq('POST', { ...good, temperature: 1 }, { Origin: ORIGIN, 'x-lt-access': CODE }))
    T('G2', 'Google function success: SDK built with the server key and no retries; temperature dropped; the site gets the message (never the key), CORS limited to the site',
      gok.code === 200 && gcalls[0].apiKey === env.ANTHROPIC_API_KEY && gcalls[0].maxRetries === 0 && !('temperature' in gcalls[1]) && gcalls[1].thinking.type === 'adaptive' && gok.body.content[0].text === 'ok' && !JSON.stringify(gok.body).includes(env.ANTHROPIC_API_KEY) && gok.headers['access-control-allow-origin'] === ORIGIN && gok.headers['cache-control'] === 'no-store', gok)
    const gEnv = { ...env, ALLOWED_ORIGINS: 'https://owner.example.org, https://mrkleinman.github.io' }
    const g2 = await GH(mkReq('OPTIONS', null, { Origin: 'https://owner.example.org' }), gEnv)
    T('G3', 'Google function: ALLOWED_ORIGINS can name another site address (e.g. a custom domain)', g2.code === 204 && g2.headers['access-control-allow-origin'] === 'https://owner.example.org')
    if (SDK) {
      const gnet = []
      const gmk = queue => class extends SDK { constructor(o) { super({ ...o, fetch: async (url, init) => { gnet.push({ url: String(url), headers: Object.fromEntries(new Headers(init.headers)), body: JSON.parse(init.body) }); const [s, b] = queue.shift(); return new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json' } }) } }) } }
      const gr1 = await GH(mkReq('POST', { model: HAIKU, max_tokens: 3600, thinking: { type: 'adaptive' }, output_config: { effort: 'low' }, messages: [{ role: 'user', content: 'hi' }], top_p: 0.9 }, { Origin: ORIGIN, 'x-lt-access': CODE }), env,
        gmk([[200, { id: 'msg_g', type: 'message', role: 'assistant', model: HAIKU, content: [{ type: 'text', text: 'hello' }], stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 3, output_tokens: 4 } }]]))
      const gr2 = await GH(mkReq('POST', good, { Origin: ORIGIN, 'x-lt-access': CODE }), env, gmk([[402, { type: 'error', error: { type: 'billing_error', message: 'Your credit balance is too low' } }], [200, {}]]))
      T('G4', 'Google function with the real SDK (mocked network): POST api.anthropic.com/v1/messages with the server key, adaptive thinking, no top_p; a billing error returns 402 billing_error after ONE call',
        gr1.code === 200 && gnet[0].url === 'https://api.anthropic.com/v1/messages' && gnet[0].headers['x-api-key'] === env.ANTHROPIC_API_KEY && gnet[0].body.thinking.type === 'adaptive' && !('top_p' in gnet[0].body) && gr1.body.content[0].text === 'hello'
        && gr2.code === 402 && gr2.body.error.type === 'billing_error' && gnet.length === 2, { gr1: gr1.body, gr2: gr2.body, n: gnet.length })
    }
    const gpkg = JSON.parse(fs.readFileSync(path.join(gdir, 'package.json'), 'utf8'))
    T('G5', 'Google function package: pinned official SDK and Functions Framework, ES module, entry point "anthropic"; setup guide present; no key anywhere in the folder',
      gpkg.dependencies['@anthropic-ai/sdk'] === '0.133.0' && /^\d+\.\d+\.\d+$/.test(gpkg.dependencies['@google-cloud/functions-framework']) && gpkg.type === 'module' && /functions\.http\("anthropic"/.test(gsrc)
      && fs.existsSync(path.join(gdir, 'SETUP.md')) && !fs.readdirSync(gdir).some(f => /sk-ant-[A-Za-z0-9]{8}/.test(fs.readFileSync(path.join(gdir, f), 'utf8'))))
    T('F7', 'netlify.toml routes /api/anthropic to the function (same mechanism as the existing /api/deepseek)', /\[\[edge_functions\]\]\s*\n\s*path = "\/api\/anthropic"\s*\n\s*function = "anthropic"/.test(fs.readFileSync(path.join(ROOT, 'netlify.toml'), 'utf8')))
    fs.rmSync(tmp, { recursive: true, force: true })
  }

  console.log(out.join('\n'))
  console.log('\n' + (n - fails) + '/' + n + ' passed' + (fails ? ' — ' + fails + ' FAILED' : ''))
  process.exit(fails ? 1 : 0)
})().catch(e => { console.log(out.join('\n')); console.log('CRASH ' + (e && e.stack || e)); process.exit(2) })
