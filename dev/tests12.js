// v647 — Gemini cost audit: telemetry, fail-fast on deterministic provider errors, one build per action.
const { load } = require('./harness'), { loadFixture } = require('./fixture')
const React = require('react'), TR = require('react-test-renderer')
const fs = require('fs')
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const out = []; let fails = 0
const T = (id, name, pass, detail) => { if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + id.padEnd(3) + name + (detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')) }
const KEY = 'AIzaSyTEST-harness-key-000000'
const flush = async () => { for (let i = 0; i < 40; i++) await new Promise(r => setImmediate(r)); await new Promise(r => setTimeout(r, 30)); for (let i = 0; i < 40; i++) await new Promise(r => setImmediate(r)) }
const gem = (text, status = 200, usage) => ({ ok: status < 300, status, json: async () => status < 300 ? { candidates: [{ content: { parts: [{ text }] } }], usageMetadata: usage || { promptTokenCount: 100, candidatesTokenCount: 20, totalTokenCount: 120 } } : { error: { message: text } } })
function learner(c) { const v = c.initVocab().map(w => ({ ...w })); v.forEach(w => { const ci = w.curriculumIndex
  if (ci >= 1 && ci <= 311) { w.status = 'learning'; w.introducedAt = '2026-08-01'; w.lastSeen = '2026-09-20'; w.okStreak = 1; w.interval = 3; w.dueDate = '2026-09-2' + (ci % 7) }
  else { if (w.status !== 'locked') w.status = 'new'; w.lastSeen = null; w.introducedAt = null; w.dueDate = null; w.okStreak = 0 } }); return v }

;(async () => {
  // ── R: the Generator starts ONE scene request per user action (v646 started two) ──
  const sceneCount = async (file) => {
    const c = load(file, { React }); c.AbortController = AbortController
    let scene = 0
    c.fetch = async (url, opts) => {
      const q = JSON.parse(opts.body).contents.map(x => x.parts.map(p => p.text).join('')).join('')
      if (/You design Thai language lesson scenarios/.test(q)) { scene++; await new Promise(r => setTimeout(r, 5)) }
      return gem(JSON.stringify({ scene: 'Two friends at a market.', characterA: 'Somchai, a Thai man', characterB: 'Nida, a Thai woman', opening: 'สวัสดีครับ' }))
    }
    let r
    await TR.act(async () => { r = TR.create(React.createElement(c.Generator, { vocab: learner(c), mode: 'daily', onGenerated() {}, onBack() {}, apiKey: KEY,
      tracks: [], dailyNewWords: null, onSaveDailyNewWords() {} })); await flush() })
    await TR.act(async () => { await flush() })
    const onMount = scene
    const txt = n => n == null ? '' : typeof n === 'string' ? n : Array.isArray(n) ? n.map(txt).join(' ') : txt(n.children)
    const btn = r.root.findAll(n => n.type === 'button').find(b => /different scene/.test(txt(b.children)))
    if (btn) { await TR.act(async () => { btn.props.onClick(); await flush() }); await TR.act(async () => { await flush() }) }
    return { onMount, afterDifferentScene: scene - onMount, sawButton: !!btn }
  }
  const s646 = await sceneCount('tt.v646.compiled.js'), s647 = await sceneCount('tt.compiled.js')
  T('R', 'one user action = one scene request: v646 fired 2 (build() re-entered on its own phase change), v647 fires 1 — on mount and on "Try a different scene"',
    s646.onMount === 2 && s647.onMount === 1 && s647.sawButton && s647.afterDifferentScene === 1 && s646.afterDifferentScene === 2, { v646: s646, v647: s647 })

  // ── F: deterministic provider failure (HTTP 402) ──
  const c = load('tt.compiled.js'); c.AbortController = AbortController
  let sent = 0
  c.fetch = async () => { sent++; return gem('Your prepayment credits are depleted. Please go to AI Studio at https://ai.studio/projects to manage your project and billing.', 402) }
  const run1 = c.aiBeginRun('test-402')
  const items = Array.from({ length: 36 }, (_, i) => ({ thai: 'ผมไปตลาดครับ' + i, english: 'x', prompt: 'He says he goes to the market ' + i }))
  const jr = await c._judgeWithBoundedRetry(items, ch => c._finalNaturalnessJudge(ch, KEY, 'google/gemini-2.5-flash-lite'), 'main naturalness', () => {})
  T('F1', 'HTTP 402 in the semantic audit: ONE request, no 12→6→3 subdivision, every item UNVERIFIED with SEMANTIC_QC_FAILED http=402 CREDITS_DEPLETED',
    sent === 1 && jr.verdicts.size === 0 && jr.failed.size === 36 && [...jr.failed.values()].every(r => /SEMANTIC_QC_FAILED provider=gemini http=402 reason=CREDITS_DEPLETED/.test(r)),
    { requestsSent: sent, sample: [...jr.failed.values()][0] })
  // every later request in the same run is not sent at all
  const before = sent; let e2 = null
  try { await c.geminiGenerate(KEY, 'google/gemini-2.5-flash-lite', [{ role: 'user', content: 'Segment this Thai sentence into individual words.' }], 500) } catch (e) { e2 = e }
  const latchedRow = c.__aiLedger.filter(r => r.runId === run1).slice(-1)[0]
  T('F2', 'after a 402, later requests in the same run fail fast WITHOUT a network request (latched, logged as not sent)',
    sent === before && e2 && e2.fatalProvider && e2.fatalProvider.status === 402 && latchedRow.latched === true && !latchedRow.ok, { error: e2 && e2.message.slice(0, 90), row: c.aiLedgerLine(latchedRow).slice(0, 180) })
  // a new user action (new run) tries the provider again
  c.fetch = async () => { sent++; return gem('[{"i":1,"s":5}]') }
  c.aiBeginRun('test-after-topup')
  let ok3 = null; try { ok3 = await c.geminiGenerate(KEY, 'google/gemini-2.5-flash-lite', [{ role: 'user', content: 'x' }], 100) } catch (e) {}
  T('F3', 'the latch is per run: a new user action (e.g. Retry after topping up) sends again', ok3 === '[{"i":1,"s":5}]' && sent === before + 1)
  // 429 rate limit is NOT deterministic → not latched
  c.aiBeginRun('test-429'); c.fetch = async () => gem('Resource has been exhausted (e.g. check quota). Rate limit: requests per minute', 429)
  let e429 = null; try { await c.geminiGenerate(KEY, 'google/gemini-2.5-flash-lite', [{ role: 'user', content: 'x' }], 100) } catch (e) { e429 = e }
  T('F4', 'a per-minute 429 rate limit is transient (not latched); a 402/401/403 or billing/quota exhaustion is', e429 && !e429.fatalProvider &&
    c.aiFatalProviderError(402, 'x') && c.aiFatalProviderError(401, 'x') && c.aiFatalProviderError(403, 'x') && c.aiFatalProviderError(429, 'You exceeded your current quota, please check your plan and billing details') &&
    !c.aiFatalProviderError(400, 'Request contains an invalid argument.') && c.aiFatalProviderError(400, 'API key not valid. Please pass a valid API key.'))
  // generation stops instead of 11 attempts × 30 targets
  const cg = load('tt.compiled.js'); cg.AbortController = AbortController
  const { track: fx, vocab } = loadFixture(cg); const byThai = new Map(vocab.map(w => [w.thai, w]))
  const tg = fx.keywords.map(k => ({ ...byThai.get(k.thai) })); tg.forEach(t => { t._trackTargets = tg })
  let gsent = 0; cg.fetch = async () => { gsent++; return gem('Your prepayment credits are depleted.', 402) }
  cg.aiBeginRun('test-gen-402'); let ge = null, glog = []
  try { await cg.generateConversationTrack(tg, [], KEY, (d, t, m) => { if (m && m.apiError) glog.push(m.apiError) }, vocab, 'google/gemini-2.5-flash-lite', null, { scene: 'x', characterA: 'Somchai, a Thai man', characterB: 'Nida, a Thai woman', opening: 'สวัสดีครับ' }) } catch (e) { ge = e }
  T('F5', 'generation on HTTP 402: 1 request then stop (v646 made 11 per target — 330 for a 30-word track)',
    gsent === 1 && ge && ge.fatalProvider && glog.some(l => /SEMANTIC_PROVIDER_FAILED provider=gemini http=402 reason=CREDITS_DEPLETED — generation stopped/.test(l)), { requests: gsent, log: glog.filter(l => /⛔/.test(l)) })

  // ── T: telemetry rows ──
  const ct = load('tt.compiled.js'); ct.AbortController = AbortController
  const runT = ct.aiBeginRun('test-telemetry', 'track-123')
  let n503 = 0
  ct.fetch = async (url) => { const m = String(url).match(/models\/([^:]+):/)[1]; if (m === 'gemini-2.5-flash-lite' && n503++ === 0) return gem('overloaded', 503); return gem('[{"i":1,"s":5,"note":"ok"}]', 200, { promptTokenCount: 812, candidatesTokenCount: 14, totalTokenCount: 826, cachedContentTokenCount: 0 }) }
  await ct._finalNaturalnessJudge([{ thai: 'ผมไปตลาดครับ', english: 'I go to the market.', speaker: 'A' }], KEY, 'google/gemini-2.5-flash-lite')
  const rows = ct.__aiLedger.filter(r => r.runId === runT)
  const line = ct.aiLedgerLine(rows[1] || {})
  T('T1', 'every request is logged: AI_CALL_ID TRACK_ID STAGE FUNCTION MODEL ATTEMPT INPUT/OUTPUT chars+tokens DURATION HTTP SUCCESS/FAIL RETRY_REASON + provider usage (v648: a 503 retries the SAME model)',
    rows.length === 2 && rows[0].http === 503 && !rows[0].ok && rows[1].model === 'gemini-2.5-flash-lite' && rows[1].attempt === 2 && /same-model retry after HTTP 503/.test(rows[1].retryReason) &&
    rows[1].stage === 'F_naturalness_final' && rows[1].fn === '_finalNaturalnessJudge' && rows[1].trackId === 'track-123' && rows[1].usage.prompt === 812 &&
    ['AI_CALL_ID=', 'TRACK_ID=', 'STAGE=', 'FUNCTION=', 'MODEL=', 'ATTEMPT=', 'INPUT_CHARS=', 'INPUT_EST_TOKENS=', 'OUTPUT_CHARS=', 'OUTPUT_EST_TOKENS=', 'DURATION=', 'HTTP=', 'SUCCESS', 'RETRY_REASON=', 'promptTokenCount=812', 'candidatesTokenCount=14', 'totalTokenCount=826', 'cachedContentTokenCount=0'].every(k => line.includes(k)),
    line.slice(0, 330))
  const sum = ct.aiUsageSummary(runT), sl = ct.aiUsageSummaryLines(sum)
  T('T2', 'track-level GEMINI USAGE SUMMARY + TOP GEMINI COST SOURCES (v648: the 503 retry stays on gemini-2.5-flash-lite, visible as a retry)',
    sl[0] === '🤖 GEMINI USAGE SUMMARY' && /^Model: gemini-2\.5-flash-lite ×2$/.test(sl[1]) && /Total requests: 2 · Successful: 1 · Failed: 1 · Retried: 1/.test(sl.join('\n')) &&
    sl.some(l => l === 'TOP GEMINI COST SOURCES') && sum.costUsd > 0, sl)
  // stage classification of every prompt family in the Thai pipeline
  const P = s => ct.aiStageOf(s, [])
  const fam = { A_generation: P('You write Pimsleur-style Thai lessons.'), B_generation_retry: P('REWRITE REQUIRED — x\nYou write Pimsleur-style Thai lessons.'), A0_scene: P('You design Thai language lesson scenarios.'),
    E_cue_check: P('Rate how well each Thai sentence matches its prompt description.\n\nScale'), L_final_cue_audit: P('Rate how well each Thai sentence matches its prompt description, judging the PROMPT (cue)'),
    C_group_eval: P('Evaluate this Thai language learning group. Target word'), G_replace: P('Generate 3 replacement Thai learning pairs.'), G_improve: P('Fix this Thai learning group. Issue'),
    J_romanisation: P('Re-romanize each Thai sentence using toned RTGS only.'), I_segmentation: P('Segment this Thai sentence into individual words.'), K_gloss_fill: P('Fill every empty "e" (English gloss)'),
    O_listening_scene: P('Judge this short scene of existing dialogue lines'), N_listening_recovery: P('You are writing ONE line of Thai listening practice'),
    O_listening_qc: ct.aiStageOf('You are a native Thai speaker checking learner material.', ['_qrBatchNaturalnessCheck', 'listeningQualityVerdicts']),
    H_recovery: ct.aiStageOf('Generate 3 replacement Thai learning pairs.', ['_qrImproveGroup', '_qrReplace', 'recoverUncoveredThaiTargets']) }
  T('T3', 'every AI prompt family of the Thai pipeline is attributed to its stage', Object.entries(fam).every(([k, v]) => k === v), fam)
  // export block
  ct.Blob = class { constructor(parts) { ct.__blob = parts.join('') } }; ct.URL = { createObjectURL: () => 'b', revokeObjectURL() {} }
  ct.document.createElement = () => ({ click() {}, style: {} }); ct.document.body.removeChild = () => {}
  await ct.downloadTrack({ date: 'x', pairs: [], keywords: [], aiUsage: sum, aiCalls: ct.aiCompactRows(rows) })
  const blk = (ct.__blob.split('GEMINI / AI USAGE')[1] || '').split('\n\n\n')[0]
  T('T4', 'the track export carries the usage summary and a per-call table', /GEMINI USAGE SUMMARY/.test(blk) && /AI_CALL_ID \| STAGE \| FUNCTION \| MODEL/.test(blk) && /F_naturalness_final \| _finalNaturalnessJudge \| gemini-2\.5-flash-lite \| 2 \| 812 \| 14 \| provider/.test(blk),
    blk.split('\n').filter(Boolean).slice(-3))
  // M: every model identifier in the source — no path defaults to Pro or an unknown model
  const src = fs.readFileSync('tt.jsx', 'utf8')
  const models = [...new Set([...src.matchAll(/(source: )?['"`](?:google\/)?(gemini-\d[0-9a-z.\-]*)['"`]/g)].filter(m => !m[1]).map(m => m[2]))].sort()
  // v650 §9: normal track creation is Flash-Lite ONLY — "gemini-2.5-flash" survives as a price-table row, never as a route
  // v678: the Gen2 SHADOW PILOT (disabled by default, benchmark-only) may name gemini-2.5-flash as its independent judge —
  // only there, only as GEN2_CONFIG.judgeModel. Learner-facing routing is checked on the rest of the source, unchanged.
  const _g0 = src.indexOf('// TT_GEN2_BEGIN'), _g1 = src.indexOf('// TT_GEN2_END')
  const _gen2 = _g0 >= 0 && _g1 > _g0 ? src.slice(_g0, _g1) : ''
  const _prodSrc = _gen2 ? src.slice(0, _g0) + src.slice(_g1) : src
  const _gen2Flash = [...(_gen2.match(/['"`]gemini-2\.5-flash['"`]/g) || [])].length
  const _gen2Ok = !_gen2 || (_gen2Flash === 1 && /judgeModel: 'gemini-2\.5-flash'/.test(_gen2) && /GEN2_FLAG = Object\.freeze\(\{ enabled: false/.test(_gen2))
  const flashUses = [..._prodSrc.matchAll(/['"`]gemini-2\.5-flash['"`]/g)].map(m => _prodSrc.slice(Math.max(0, m.index - 60), m.index + 48).replace(/\s+/g, ' '))
  T('M', 'Gemini model identifiers in the code: flash-lite is the only routed model for learners; gemini-2.5-flash appears only in the price table and as the disabled shadow pilot\u2019s judge — no stage override, no Pro, no fallback model (v650)',
    models.join(',') === 'gemini-2.5-flash,gemini-2.5-flash-lite' && !/GEMINI_FALLBACK_MODEL|fallback-model/.test(src) && /const GEMINI_STAGE_MODELS = \{\}/.test(src) &&
    flashUses.length === 1 && /AI_PRICE|in: 0\.30/.test(flashUses[0]) && _gen2Ok, { models, flashUses, gen2Flash: _gen2Flash })
  console.log(out.join('\n') + '\n\n' + (fails ? fails + ' FAILED' : 'all passed') + ' (' + out.filter(l => /^(PASS|FAIL)/.test(l)).length + ' checks)')
})().catch(e => { console.error(e); process.exit(1) })
