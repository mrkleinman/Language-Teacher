#!/usr/bin/env node
// Step 0 benchmark runner — one controlled run of one combination (fixture) through the app's REAL creation path.
//
//   node benchmark/run.js --fixture zh-daily-2026-10-08 --mode record --provider sim  [--out benchmark/cassettes/x.json]
//   node benchmark/run.js --fixture zh-daily-2026-10-08 --mode replay --cassette benchmark/cassettes/x.json
//   GEMINI_API_KEY=… node benchmark/run.js --fixture zh-daily-2026-10-08 --mode record --provider live --runs 3
//
// provider sim  = the repository's simulated model (template sentences). It exercises the pipeline MECHANICALLY and
//                 proves record/replay; its sentences say NOTHING about teaching quality.
// provider live = real Gemini over the network (key from GEMINI_API_KEY, never written to the cassette).
// mode replay   = no model at all: every request must match a recorded request byte-for-byte, else CASSETTE_MISMATCH.
// Every run pins the clock and Math.random (benchmark/lib/determinism.js), the learner's belt and the fixture's learner
// state; a fixture is applied to a FRESH in-memory copy of the bundled word banks — no learner data is touched.
'use strict'
const fs = require('fs'), path = require('path')
const { load } = require('../harness')
const { deterministicGlobals } = require('./lib/determinism')
const { createRecorder, createReplayer } = require('./lib/cassette')
const ROOT = path.join(__dirname, '..')
const SIM_KEY = 'AIzaSyTEST-harness-key-000000'

function arg(name, def) { const i = process.argv.indexOf('--' + name); return i > 0 ? process.argv[i + 1] : def }
const FIELD = { th: 'thai', ja: 'japanese', zh: 'chinese' }

function loadFixture(id) { return JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', id + '.json'), 'utf8')) }

// the fixture's learner state on a fresh copy of the bundled bank (status / dates only; ids and entries untouched)
function applyFixture(vocab, fx) {
  const tgt = new Map(fx.targets.map(t => [t.id, t])), taught = new Set(fx.inventory.taughtIds)
  vocab.forEach(w => {
    const t = tgt.get(w.id)
    const reset = () => { w.status = w.status === 'locked' ? 'locked' : 'new'; w.lastSeen = null; w.dueDate = null; w.repCount = 0; w.interval = 0; w.okStreak = 0; delete w.introducedAt; w.manualKnown = false }
    if (t && t.status === 'new') reset()
    else if (t) { w.status = 'learning'; w.lastSeen = '2026-10-01'; w.introducedAt = '2026-09-01'; w.repCount = 3; w.interval = 3; w.dueDate = '2026-10-07' }
    else if (taught.has(w.id)) { w.status = 'learning'; w.lastSeen = '2026-10-01'; w.introducedAt = '2026-09-01'; w.repCount = 3; w.interval = 14; w.dueDate = '2026-10-20' }
    else reset()
  })
  return vocab
}

function bankOf(c, lang) { return lang === 'th' ? c.initVocab() : lang === 'ja' ? c.initJapaneseVocab() : c.initMandarinVocab() }

// simulated model at the REST boundary (the same responders sim_live.js / tests14.js use) — MECHANICS ONLY
function simProvider(c, lang, vocab, targets, simOpts, idsGiven) {
  if (idsGiven) { const byId = new Map(vocab.map(w => [w.id, w])); targets = targets.map(id => byId.get(id)).filter(Boolean) }
  const { mock, sentence } = require('../tests14')
  const S = { c, vocab, targets }
  if (lang === 'zh') { const inv = c.mandarinLearnerInventory(vocab, targets); S.zhLex = new Map((inv.lexicon || []).map(x => [x.w, x])) }
  const real = c.geminiRequest
  mock(S, lang, { bridges: true, ...(simOpts || {}) })
  const inner = c.geminiRequest
  c.geminiRequest = real
  const genCount = {}
  S.byField = new Map(vocab.map(w => [w[FIELD[lang]], w]))
  const { gen2SimReply } = require('./gen2_sim')
  const reply = async q => {
    if (/^\[task: gen2-/.test(q)) { const g = gen2SimReply(q, S, lang, simOpts); if (g != null) return g }
    if (lang === 'th' && /You design Thai language lesson scenarios/.test(q)) return JSON.stringify({ scene: 'Two friends planning a weekend trip.', characterA: 'Somchai, a Thai man', characterB: 'Nida, a Thai woman',
      opening: 'สวัสดีครับ', opening_phonetic: '', opening_english: 'Hello.', opening_prompt: 'Somchai greets Nida', reply: 'สวัสดีค่ะ', reply_phonetic: '', reply_english: 'Hello.', reply_prompt: 'Nida greets him',
      closing: 'แล้วเจอกันครับ', closing_phonetic: '', closing_english: 'See you later.', closing_prompt: 'Somchai says goodbye', closing_reply: 'แล้วเจอกันค่ะ', closing_reply_phonetic: '', closing_reply_english: 'See you later.', closing_reply_prompt: 'Nida says goodbye' })
    // v676 (UI path): the Japanese screen builds its scene first (generateJapaneseScene) — a fixed simulated scene
    if (lang === 'ja' && /"closing_reply":"\.\.\.","closing_reply_reading"/.test(q)) return JSON.stringify({ scene: 'Two friends meet at a café after work.',
      characterA: 'Ken, a Japanese man', characterB: 'Yui, a Japanese woman', opening: 'こんにちは。', opening_reading: 'こんにちは', opening_romaji: 'konnichiwa', opening_english: 'Hello.', opening_prompt: 'Ken greets Yui',
      reply: 'こんにちは。', reply_reading: 'こんにちは', reply_romaji: 'konnichiwa', reply_english: 'Hello.', reply_prompt: 'Yui greets Ken',
      closing: 'じゃあね。', closing_reply: 'またね。', closing_english: 'See you.', closing_reply_english: 'See you later.' })
    const m = lang === 'th' && /The target word for this exchange is: (.+)\n/.exec(q)
    if (m) { const t = targets.find(w => w.thai === m[1].trim()); if (t) { genCount[t.id] = (genCount[t.id] || 0) + 1; return JSON.stringify([0, 1, 2].map(k => sentence(S, 'th', t, 'gen', k))) } }
    const jaT = lang === 'ja' && /(?:TARGET WORDS \(each needs exactly 3 sentences\):\n|JAPANESE TARGET: )★ ([^\s\[=]+)/.exec(q)
    const zhT = lang === 'zh' && /TARGET: ★ (\S+) \[/.exec(q)
    // v676 stress option: the model never produces a usable recall for these Japanese targets (forces the screen's
    // auto-recovery loop and, when every check is spent, the EXHAUSTED_AT_11 finish)
    if (jaT && simOpts && Array.isArray(simOpts.jaFailTargets) && simOpts.jaFailTargets.includes(jaT[1])) return '[]'
    if ((jaT || zhT) && !/QUOTA|previous|ALREADY/.test(q.slice(-400))) {
      const t = targets.find(w => w[FIELD[lang]] === (jaT || zhT)[1])
      if (t && lang === 'ja' && /TARGET GROUP|REPLACEMENT ONLY/.test(q)) {
        const k = +((/Return EXACTLY (\d) recall/.exec(q) || [])[1] || 1), out = []
        for (let j = 0; j < k; j++) { const n = genCount[t.id] = (genCount[t.id] || 0) + 1; if (n <= 3) out.push(sentence(S, lang, t, 'gen', n - 1)) }
        if (out.length) return JSON.stringify({ targetConcept: t.japanese, recalls: out })
      } else if (t) { const n = genCount[t.id] = (genCount[t.id] || 0) + 1; if (n <= 3) { const s = sentence(S, lang, t, 'gen', n - 1); return JSON.stringify(lang === 'ja' ? [s] : s) } }
    }
    return inner({ apiKey: SIM_KEY, model: 'sim', messages: [{ role: 'user', content: q }], maxTokens: 1000 })
  }
  // v676 stress options at the transport: every k-th request fails like a dropped connection (netErrorEvery) or a
  // rate limit (http429Every) — exercises the app's retry path and the cassette's recording of failures
  let nReq = 0
  return async (url, opts) => {
    nReq++
    if (simOpts && simOpts.netErrorEvery && nReq % simOpts.netErrorEvery === 0) throw new TypeError('Failed to fetch (simulated network drop)')
    if (simOpts && simOpts.fatalAt && nReq >= simOpts.fatalAt) return { ok: false, status: 402, json: async () => ({ error: { code: 402, message: 'Insufficient credits (simulated billing failure)', status: 'PAYMENT_REQUIRED' } }) }
    if (simOpts && simOpts.http429Every && nReq % simOpts.http429Every === 0) return { ok: false, status: 429, json: async () => ({ error: { code: 429, message: 'Resource has been exhausted (simulated rate limit)', status: 'RESOURCE_EXHAUSTED' } }) }
    const body = JSON.parse(opts.body)
    const q = body.contents.map(x => x.parts.map(p => p.text).join('')).join('\n')
    const text = String(await reply(q))
    const est = x => Math.ceil(String(x).length / 3)
    return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text }] } }], usageMetadata: { promptTokenCount: est(q), candidatesTokenCount: est(text), totalTokenCount: est(q) + est(text) }, simulated: true }) }
  }
}

function liveProvider() {
  if (!process.env.GEMINI_API_KEY) throw new Error('provider live needs GEMINI_API_KEY in the environment (it is never written to a cassette)')
  return async (url, opts) => fetch(url, opts)
}

// what the learner would get (generation content + verdicts) — compared exactly between record and replay
function contentOutcome(lang, trackType, track) {
  const f = FIELD[lang]
  const pron = p => p.phonetic || p.romaji || p.pinyin || null
  const hist = p => (p._checkHistory || []).map(e => e.index + ':' + e.outcome + ':' + (e.kind || ''))
  if (trackType === 'daily') return {
    status: track.integrity ? track.integrity.status : null, reasons: track.integrity ? track.integrity.reasons : null,
    selectedTargetIds: track.selectedTargetIds || null,
    pairs: (track.pairs || []).map(p => p && ({ targetId: p.targetId != null ? p.targetId : null, recallIndex: p.recallIndex != null ? p.recallIndex : null, speaker: p.speaker || null,
      text: p[f] || null, english: p.english || null, cue: p.prompt || null, pron: pron(p), source: p._source || p.sourceStage || null, checks: hist(p) })),
    unresolved: track.integrity && track.integrity.checkModel ? track.integrity.checkModel.unresolvedRecalls : null,
  }
  const lt = track.listening || {}
  return { status: track.status || null, failedChecks: track.failedChecks || null, selectedTargetIds: track.selectedTargetIds || null,
    coverage: track.coverage ? { covered: track.coverage.covered, required: track.coverage.required } : null,
    lines: (lt.lines || []).map(l => ({ scene: l.scene, speaker: l.speaker, text: l[f] || l.thai || null, english: l.english || null, pron: pron(l), covers: l.coversTargetIds || [] })) }
}

async function runOnce(fx, o) {
  const lang = fx.language
  const globals = deterministicGlobals({ realTimers: o.provider === 'live' })
  const c = load(o.appFile || path.join(ROOT, 'tt.compiled.js'), { realBelt: true, globals })
  c.setLearnerStateOverride({ rank: fx.belt.rank, source: 'benchmark-fixture ' + fx.id })
  const vocab = applyFixture(bankOf(c, lang), fx)
  const byId = new Map(vocab.map(w => [w.id, w]))
  const targets = fx.targets.map(t => byId.get(t.id)).filter(Boolean)
  let rec = null, rep = null
  if (o.mode === 'replay') { rep = createReplayer(o.cassette); c.fetch = rep.fetch }
  else {
    const provider = o.provider === 'live' ? liveProvider() : simProvider(c, lang, vocab, targets, o.simOpts)
    rec = createRecorder(provider, { fixture: fx.id, provider: o.provider === 'live' ? 'LIVE gemini' : 'SIMULATED (mechanics only — not teaching quality)', simOpts: o.simOpts || null, appBuild: c.ev('APP_BUILD_VERSION'),
      listeningBuild: c.ev('LISTENING_BUILD_VERSION'), model: c.ev('GEMINI_DEFAULT_MODEL'), belt: fx.belt.rank, clock: 'deterministic (2026-10-08T06:00Z, +7ms per read)', seed: 20261008 })
    c.fetch = rec.fetch
  }
  const key = o.provider === 'live' && o.mode !== 'replay' ? process.env.GEMINI_API_KEY : SIM_KEY
  const model = c.ev('GEMINI_DEFAULT_MODEL')
  const log = [], L = m => log.push(String(m))
  const { kwOf } = require('../tests14')
  let track = null, err = null
  const runId = c.aiBeginRun(lang + '-bench-' + fx.trackType)
  try {
    if (fx.trackType === 'daily') {
      const isNew = new Set(fx.targets.filter(t => t.status === 'new').map(t => t.id))
      if (lang === 'th') {
        const pairs = await c.generateConversationTrack(targets, [], key, (d, t, meta) => { if (meta && meta.apiError) L(meta.apiError) }, vocab, model, { cancelled: false }, null)
        track = { createdAt: '2026-10-08T06:00:00.000Z', date: '8 Oct 2026', mode: 'daily', trackMode: 'daily', pairs, keywords: targets.map(t => kwOf('th', t, isNew.has(t.id))), _finalAudit: pairs._finalAudit || null }
        track.selectedTargetIds = track.keywords.map(k => k.wordId)
        const qc = await c.runQualityCheckCore(track, key, model, { vocab, onLog: L, deferMetadata: true })
        track = await c.finaliseThaiTrackAfterQc(track, qc, { vocab, apiKey: key, model, onLog: L })
      } else {
        const gen = lang === 'ja'
          ? await c.generateJapaneseTrack(targets, vocab, 'natural', key, model, () => {}, L, { cancelled: false }, null)
          : await c.generateMandarinTrack(targets, vocab, key, model, () => {}, L, { cancelled: false }, null)
        track = { createdAt: '2026-10-08T06:00:00.000Z-' + lang, date: '2026-10-08', language: lang, mode: 'daily', trackMode: 'daily', speechStyle: 'natural', pairs: gen.pairs,
          keywords: targets.map(t => kwOf(lang, t, isNew.has(t.id))) }
        track.selectedTargetIds = track.keywords.map(k => k.wordId)
        track = (await c.jazhQcFinaliseAndListen(track, lang, { vocab, apiKey: key, model, register: 'natural', runId, push: L })).track
      }
    } else {
      const r = await c.generateCohesiveListeningTrack({ lang, vocab, apiKey: key, model, targetIds: fx.targets.map(t => t.id), attemptId: 'bench-' + fx.id, onLog: L })
      track = r.track
    }
  } catch (e) { err = String(e && e.stack || e) }
  const usage = c.aiUsageSummary(runId)
  if (o.inspect) o.inspect(c)
  return { fixture: fx.id, mode: o.mode, provider: o.mode === 'replay' ? 'REPLAY (no model)' : rec && rec.cassette().meta.provider, error: err,
    content: track ? contentOutcome(lang, fx.trackType, track) : null,
    telemetry: { usageSummary: c.aiUsageSummaryLines(usage), integrity: track && track.integrity ? c.trackIntegrityLines(track) : null, logLines: log.length },
    log, cassette: rec ? rec.cassette() : null, replay: rep ? rep.report() : null }
}

// v676 — UI PATH: the same steps the app's screens take (ttBenchRunFixture, tt.jsx TT_BENCH_UI_PATHS block), in Node.
// A build that predates the block (v674 / v675) gets the block injected from the CURRENT tt.jsx, so UI-path cassettes
// recorded on v674 can prove a later build sends byte-identical requests through the screens' path.
function uiPathsSource() {
  const src = fs.readFileSync(path.join(ROOT, 'tt.jsx'), 'utf8')
  const a = src.indexOf('// TT_BENCH_UI_PATHS_BEGIN'), b = src.indexOf('// TT_BENCH_UI_PATHS_END')
  if (a < 0 || b < 0) throw new Error('TT_BENCH_UI_PATHS block not found in tt.jsx')
  return require('esbuild').transformSync(src.slice(a, b), { loader: 'jsx', jsx: 'transform', target: 'es2020' }).code
}
function ensureUiPaths(c) {
  if (typeof c.ttBenchRunFixture === 'function') return 'built-in'
  c.ev(uiPathsSource())
  return 'injected from tt.jsx'
}
async function runOnceUi(fx, o) {
  const globals = deterministicGlobals({ realTimers: o.provider === 'live', startMs: fx.clockStartMs })
  const c = load(o.appFile || path.join(ROOT, 'tt.compiled.js'), { realBelt: true, globals })
  const how = ensureUiPaths(c)
  let rec = null, rep = null
  if (o.mode === 'replay') { rep = createReplayer(o.cassette); c.fetch = rep.fetch }
  else {
    const provider = o.provider === 'live' ? (o.liveFetch || liveProvider()) : simProvider(c, fx.language, applyFixture(bankOf(c, fx.language), fx), fx.targets.map(t => t.id), o.simOpts, true)   // liveFetch: sandbox/live.js (proxy-authenticated, cost-capped)
    rec = createRecorder(provider, { fixture: fx.id, provider: o.provider === 'live' ? 'LIVE gemini' : 'SIMULATED (mechanics only — not teaching quality)', simOpts: o.simOpts || null, appBuild: c.ev('APP_BUILD_VERSION'),
      listeningBuild: c.ev('LISTENING_BUILD_VERSION'), model: c.ev('GEMINI_DEFAULT_MODEL'), belt: fx.belt.rank, path: 'ui-path/1', uiPaths: how, pipeline: o.pipeline || 'production',
      clock: 'deterministic (' + new Date(fx.clockStartMs || Date.UTC(2026, 9, 8, 6, 0, 0)).toISOString() + ', +7ms per read; reset at run start)', seed: 20261008 })
    c.fetch = rec.fetch
  }
  const key = o.provider === 'live' && o.mode !== 'replay' ? (o.apiKey || process.env.GEMINI_API_KEY) : SIM_KEY
  const fxc = require('./embed_fixtures').compact(fx)
  const pipeline = o.pipeline || (o.cassette && o.cassette.meta && o.cassette.meta.pipeline) || 'production'
  const r = await c.ttBenchRunFixture(fxc, { apiKey: key, clockReset: globals.__ttBenchClockReset, pipeline })
  if (o.inspect) o.inspect(c)
  return { fixture: fx.id, mode: o.mode, path: 'ui', pipeline, gen2: r.gen2 || null, provider: o.mode === 'replay' ? 'REPLAY (no model)' : rec && rec.cassette().meta.provider, error: r.error, stop: r.stop || null,
    content: r.content, telemetry: { usageSummary: r.telemetry.usageSummary, integrity: r.telemetry.integrity, logLines: r.log.length },
    log: r.log, cassette: rec ? rec.cassette() : null, replay: rep ? rep.report() : null }
}

function compareContent(a, b) {
  const sa = JSON.stringify(a), sb = JSON.stringify(b)
  if (sa === sb) return { identical: true }
  const n = Math.min(sa.length, sb.length); let i = 0; while (i < n && sa[i] === sb[i]) i++
  return { identical: false, firstDiffAt: i, recorded: sa.slice(Math.max(0, i - 100), i + 100), replayed: sb.slice(Math.max(0, i - 100), i + 100) }
}

module.exports = { runOnce, runOnceUi, loadFixture, applyFixture, contentOutcome, compareContent, uiPathsSource }

if (require.main === module) (async () => {
  const fx = loadFixture(arg('fixture'))
  const mode = arg('mode', 'record'), provider = arg('provider', 'sim')
  const outDir = path.join(__dirname, 'cassettes')
  if (mode === 'replay') {
    const cas = JSON.parse(fs.readFileSync(arg('cassette'), 'utf8'))
    const usePath = cas.cassette.meta && cas.cassette.meta.path === 'ui-path/1' ? runOnceUi : runOnce
    const r = await usePath(fx, { mode, cassette: cas.cassette, appFile: arg('app') })
    const cmp = compareContent(cas.outcome.content, r.content)
    console.log(JSON.stringify({ fixture: fx.id, replay: { ...r.replay, mismatches: r.replay.mismatches.slice(0, 3), unused: r.replay.unused.slice(0, 3) }, contentIdentical: cmp.identical, diff: cmp.identical ? undefined : cmp, error: r.error && r.error.slice(0, 300) }, null, 1))
    process.exit(r.replay.faithful && cmp.identical ? 0 : 1)
  }
  const runs = +arg('runs', 1)
  if (provider === 'live' && !process.env.GEMINI_API_KEY) { console.log('LIVE RUN NOT RUN: GEMINI_API_KEY is not set (no simulated output is substituted)'); process.exit(2) }
  for (let k = 1; k <= runs; k++) {
    const simOpts = arg('sim-opts') ? JSON.parse(arg('sim-opts')) : null
    const r = await (arg('path', 'ui') === 'legacy' ? runOnce : runOnceUi)(fx, { mode, provider, appFile: arg('app'), simOpts, pipeline: arg('pipeline', 'production') })
    const file = arg('out') || path.join(outDir, fx.id + (arg('pipeline') === 'gen2' ? '.gen2' : arg('path', 'ui') === 'legacy' ? '' : '.ui') + '.' + provider + (runs > 1 ? '.run' + k : '') + '.json')
    fs.writeFileSync(file, JSON.stringify({ cassette: r.cassette, outcome: { content: r.content, telemetry: r.telemetry, log: r.log, error: r.error, gen2: r.gen2 || null } }))
    console.log(fx.id + ' ' + provider + ' run ' + k + ': ' + (r.error ? 'ERROR ' + r.error.slice(0, 200) : (r.content && (r.content.status)) + ' · requests ' + r.cassette.entries.length) + ' → ' + path.relative(ROOT, file))
  }
})()
