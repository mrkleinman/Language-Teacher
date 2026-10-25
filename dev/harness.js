// Loads the compiled app into a VM context with browser stubs so its real functions
// can be exercised directly. No network: any fetch fails loudly.
const vm = require('vm'), fs = require('fs')
function load(file, opts = {}) {
  const store = new Map()
  const localStorage = { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k), clear: () => store.clear(), key: i => [...store.keys()][i], get length() { return store.size } }
  const noop = () => {}
  const React = opts.React || { createElement: () => null, Fragment: 'F', useState: v => [typeof v === 'function' ? v() : v, noop],
    useEffect: noop, useCallback: f => f, useRef: v => ({ current: v }), useMemo: f => f(), Component: class {} }
  const el = () => ({ style: {}, appendChild: noop, setAttribute: noop, addEventListener: noop, innerHTML: '', content: '' })
  const document = { querySelector: () => null, getElementById: () => el(), createElement: el, body: el(), head: el(), addEventListener: noop }
  const logs = []
  const quiet = opts.quiet !== false
  const cons = { log: (...a) => { if (!quiet) console.log(...a) }, info: noop, debug: noop,
    warn: (...a) => logs.push(['warn', a.join(' ')]), error: (...a) => logs.push(['error', a.join(' ')]) }
  const ctx = { React, ReactDOM: { createRoot: () => ({ render: noop }) }, document, localStorage, sessionStorage: localStorage,
    navigator: { serviceWorker: null, userAgent: 'node' }, console: cons,
    setTimeout: (f) => { Promise.resolve().then(f); return 0 }, clearTimeout: noop, setInterval: () => 0, clearInterval: noop,
    fetch: async (u) => { throw new Error('network disabled in harness: ' + u) },
    Blob: class {}, URL, Audio: class { play() {} }, atob: s => Buffer.from(s, 'base64').toString('binary'),
    btoa: s => Buffer.from(s, 'binary').toString('base64'), TextEncoder, TextDecoder, structuredClone, queueMicrotask,
    Intl, performance: { now: () => Date.now() }, AbortController }
  // Step 0 (benchmark): a caller may pin globals BEFORE the app is evaluated — e.g. a deterministic clock (Date),
  // a seeded Math.random or real timers — so a recorded run can be replayed byte-for-byte. Unset → unchanged harness.
  if (opts.globals) Object.assign(ctx, opts.globals)
  ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx
  vm.createContext(ctx)
  vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file })
  // v717: the Thai gap-fill modules are the Daily writer's first candidate in the app; tests of the model path must not get them, so they start OFF
  // (a test that exercises them switches them on with ctx.thaiModulesSetEnabled(true) and loads data with ctx.thaiModulesUseData)
  if (typeof ctx.thaiModulesSetEnabled === 'function') ctx.thaiModulesSetEnabled(false)
  ctx.__logs = logs
  // v648: tests replace the ONE Gemini transport. A positional mock (key, model, messages, maxTokens)
  // is adapted onto geminiRequest, so every call path — geminiGenerate, scene, Kru, auto-fill —
  // reaches the mock. The mock records every call so tests can prove no other transport exists.
  ctx.__geminiMockCalls = []
  Object.defineProperty(ctx, 'mockGeminiGenerate', { configurable: true, set(fn) {
    // v709: a test that mocks the model is testing the MODEL writer path, so the curated Thai exchange bank (which answers bank words
    // without a model call) is switched off — unless the test opted in (ctx.__bankForced, e.g. the bank validator)
    if (typeof ctx.thaiBankSetEnabled === 'function' && !ctx.__bankForced) ctx.thaiBankSetEnabled(false)
    // v717: the gap-fill modules (the Daily writer's first candidate) are off too unless a test opts in with ctx.thaiModulesSetEnabled(true) + thaiModulesUseData
    if (typeof ctx.thaiModulesSetEnabled === 'function') ctx.thaiModulesSetEnabled(false)
    if (typeof ctx.geminiRequest === 'function' || typeof ctx.geminiGenerate === 'function')
      ctx.geminiRequest = async o => { ctx.__geminiMockCalls.push({ model: o.model, stage: o.stage || null }); return fn(o.apiKey, o.model, o.messages, o.maxTokens, o) }
    else ctx.callOpenRouterOnce = fn   // pre-v648 builds (loaded only for before/after comparisons) used the old transport name
  } })
  ctx.ev = code => vm.runInContext(code, ctx)
  // v692: a suite that tests the LEGACY template Listening planner (kept behind the switch as rollback) opts in explicitly
  if (process.env.TT_LISTENING_LEGACY === '1' && typeof ctx.setListeningMeaningFirst === 'function') ctx.setListeningMeaningFirst(false)
  // v693: a suite whose assertions pin pre-v693 Daily measurements runs on the pre-v693 Daily rules (kept behind the switch as rollback)
  if (process.env.TT_DAILY_LEGACY === '1' && typeof ctx.setDailyV693 === 'function') ctx.setDailyV693(false)
  // v665: sentence complexity follows the learner's CURRENT belt (BELT_COMPLEXITY). The pre-v665 fixtures are
  // Mukyu learners (hardMax 4) with longer recorded sentences, so suites that test OTHER contracts pin the belt
  // explicitly; the v665 suites call setLearnerStateOverride(null) to test the real resolver.
  if (!opts.realBelt && !process.env.TT_REAL_BELT && typeof ctx.setLearnerStateOverride === 'function') ctx.setLearnerStateOverride({ rank: process.env.TT_TEST_BELT || 'Shodan', source: 'test-harness' })
  return ctx
}
module.exports = { load }
