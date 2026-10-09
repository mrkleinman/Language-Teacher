// v659 — LISTENING GENERATOR PARITY: the same Revision word set, the same generator UI, 1× coverage instead of 3× pairs.
// Real app code throughout. The Teachers, the Revision generators and the Listening generator are rendered with
// react-test-renderer (effects run); the model is simulated at the Gemini boundary (tests14 responder).
//   §22  selector parity — the actual Revision path (Teacher → Revision button → generator tiles) vs the actual
//        Listening path (Teacher → Listening button → Listening generator tiles) for TH / JA / ZH
//   §23  UI data parity — selector ids === chip ids === word-tile ids === coverage-map ids === History ids
//   §24  coverage — 30/30 all chips verified + READY · one absent → 29/30, that chip/tile incomplete, NOT_READY
//   §4/§18/§19 snapshot · Rebuild (same ids, selector NOT re-run, new History attempt, old kept) · new track re-selects
//   §5/§16/§25 the generator shell is the SAME components as Daily/Revision and stays visible on failure
//   §6/§12/§13/§15 denominator 30, live coverage (claimed ≠ lit), stage logs, cost
const { setup, mock } = require('./tests14')
const { load } = require('./harness')
const React = require('react'), TR = require('react-test-renderer')
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const out = []; let fails = 0, n = 0
const T = (lang, id, name, pass, detail) => { n++; if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + lang.toUpperCase() + ' ' + id.padEnd(4) + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 900) : '')) }
const LANGS = process.argv[2] ? process.argv[2].split(',') : ['th', 'ja', 'zh']
const KEY = 'AIzaSyTEST-harness-key-000000'
const textOf = x => x == null ? '' : typeof x === 'string' ? x : Array.isArray(x) ? x.map(textOf).join(' ') : textOf(x.children)
const flush = async (k = 40) => { for (let i = 0; i < k; i++) await new Promise(r => setImmediate(r)) }
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const attrIds = (r, attr) => r.root.findAll(x => x.props && x.props[attr] != null && typeof x.type === 'string').map(x => +x.props[attr])
const done = r => r.root.findAll(x => x.props && (x.props['data-listening-track-ready'] || x.props['data-listening-needs-repair'])).length > 0
async function settle(r) { for (let i = 0; i < 60 && !done(r); i++) await TR.act(async () => { await flush() }) }
const surfKey = { th: 'thai', ja: 'japanese', zh: 'chinese' }

// a controlled learner (the tests23 fixture): every word learned, the fixture's 30 the most overdue
function learner(lang, c) {
  const S = setup(lang)
  const ids = new Set(S.targets.map(t => t.id))
  S.vocab.forEach(w => { if (ids.has(w.id)) { w.dueDate = '2026-01-01'; w.difficulty = 'hard' } else { w.dueDate = '2099-01-01'; if (w.difficulty === 'hard') w.difficulty = 'medium' } })
  if (c) S.c = c
  return S
}
// a VARIED learner state (non-trivial Revision ordering: tiers, due dates, streaks)
function variedState(S) {
  S.vocab.forEach((w, i) => { if (w.status !== 'new' && w.status !== 'locked') { w.dueDate = '2026-0' + (1 + (i % 9)) + '-1' + (i % 9); w.okStreak = i % 4; w.difficulty = i % 53 === 0 ? 'hard' : 'medium' } })
}
function rc(lang) { const c = load(process.env.TT_FILE || 'tt.compiled.js', { React }); c.console.info = () => {}; return c }
// mock + an AI-ledger row per paid call (the harness transport bypasses the ledger) so cost accounting is exercised
function mockWithLedger(S, lang, opt, post) {
  const st = mock(S, lang, opt)
  const inner = S._mockFn; st.prompts = []
  S.c.mockGeminiGenerate = async (k, m, msgs, max, o) => {
    const q = msgs[msgs.length - 1].content; st.prompts.push(q)
    const ctx = S.c.ev('AI_CTX')
    S.c.ev('AI_LEDGER').push({ id: 0, runId: ctx.runId, runKind: ctx.runKind, model: 'gemini-2.5-flash-lite', stage: 'O_listening_scene', usage: { prompt: 1000, candidates: 250, total: 1250 }, costUsd: 0.0002, ok: true, attempt: 1, promptHash: String(Math.random()) })
    const r = await inner(k, m, msgs, max, o)
    return post ? post(q, r) : r
  }
  return st
}
async function openListening(S, lang, props = {}) {
  const saved = []
  let r
  await TR.act(async () => { r = TR.create(React.createElement(S.c.ListeningGenerator, { lang, vocab: S.vocab, apiKey: KEY, model: 'gemini-2.5-flash-lite', gcpTtsKey: '', onSave: t => saved.push(t), onBack: () => {}, ...props })); await flush() })
  await settle(r)
  return { r, saved, text: () => textOf(r.toJSON()).replace(/\s+/g, ' '), buttons: () => r.root.findAll(x => x.type === 'button') }
}

;(async () => {
  for (const lang of LANGS) {
    // ══ §22 SELECTOR PARITY — the real Revision path vs the real Listening path, one frozen learner state ══
    {
      const c = rc(lang)
      const S = setup(lang); S.c = c; variedState(S)
      const key = lang === 'ja' ? c.ev('JA.vocab') : lang === 'zh' ? c.ev('ZH.vocab') : 'tt-vocab'
      c.localStorage.setItem(key, JSON.stringify(S.vocab))
      if (lang !== 'th') c.localStorage.setItem('tt-gemini-key', JSON.stringify(KEY))   // JA/ZH generators need a (fake) key to open (Thai renders its tiles before the scene step without one)
      const canon = c.selectRevisionTargets(lang, JSON.parse(c.localStorage.getItem(key)))
      const Teacher = lang === 'ja' ? c.JapaneseTeacher : lang === 'zh' ? c.MandarinTeacher : c.ThaiTeacher
      mock(S, lang, {})
      // Revision Track: Teacher → "Revision Track" → the Revision generator's own word tiles
      let r
      await TR.act(async () => { r = TR.create(React.createElement(Teacher, { lang, onSetLang: () => {} })); await flush(60) })
      const revBtn = r.root.findAll(x => x.type === 'button').find(b => /Revision Track/.test(textOf(b.children)))
      await TR.act(async () => { revBtn.props.onClick(); await flush(10) })
      const Tile = lang === 'th' ? c.ThaiTargetTile : lang === 'ja' ? c.JapaneseTargetPill : c.MandarinTargetPill
      // the Revision generator's word tiles; if its scene step is showing first, the list it was handed to render as tiles
      const GenC = lang === 'th' ? c.Generator : lang === 'ja' ? c.JapaneseGenerator : c.MandarinGenerator
      // Japanese plans/previews its scene before its tiles appear (the simulated model writes no scene) — there the
      // check reads the exact list the Revision generator was handed to render as its tiles
      const tilesNow = r.root.findAllByType(Tile).map(x => x.props.w.id)
      const revIds = tilesNow.length ? tilesNow : (r.root.findAllByType(GenC)[0] || { props: {} }).props.targets.map(w => w.id)
      if (process.env.TT_DEBUG) console.log(lang, "revision tiles rendered:", tilesNow.length)
      await TR.act(async () => { r.unmount() })
      // Listening Track: Teacher → "Listening Track" → the Listening generator's word tiles (same frozen state)
      let r2
      await TR.act(async () => { r2 = TR.create(React.createElement(Teacher, { lang, onSetLang: () => {} })); await flush(60) })
      const lnBtn = r2.root.findAll(x => x.type === 'button').find(b => /Listening Track/.test(textOf(b.children)))
      await TR.act(async () => { lnBtn.props.onClick(); await flush(10) })
      const lnTiles = r2.root.findAllByType(Tile).map(x => x.props.w.id)
      const lg = r2.root.findAllByType(c.ListeningGenerator)
      await TR.act(async () => { r2.unmount() })
      T(lang, 'P1', '§22 the Revision Track generator (Teacher → Revision) shows exactly the canonical selector\'s 30 ids, in order',
        revIds.length === 30 && same(revIds, canon.targetIds), { revIds: revIds.slice(0, 8), canon: canon.targetIds.slice(0, 8), n: revIds.length })
      T(lang, 'P2', '§22 the Listening generator (Teacher → Listening) shows the SAME 30 ids in the SAME order as the Revision generator',
        lg.length === 1 && lnTiles.length === 30 && same(lnTiles, revIds), { ln: lnTiles.slice(0, 8), rev: revIds.slice(0, 8) })
      // regression: v658's own Revision computation (the code the Revision generators ran before the canonical
      // function existed) picks the same ordered 30 from the same state — Revision behaviour is unchanged
      const old = load('tt.v658.compiled.js'); old.console.info = () => {}
      const V = JSON.parse(c.localStorage.getItem(key))
      let oldIds
      if (lang === 'th') {
        const rv30 = old.selectThaiRevisionTargets(V, 30), rvAll = old.selectThaiRevisionTargets(V, 100000), s30 = new Set(rv30.targets.map(w => w.id))
        oldIds = old.freezeThaiTargetSelection({ selected: rv30.targets, reserve: rvAll.targets.filter(w => !s30.has(w.id)), required: 30, mode: 'revision', noNewOverflow: true }).targets.map(w => w.id)
      } else if (lang === 'ja') oldIds = old.jazhContractTargets(old.selectRevisionTrackTargets({ vocab: V, maxTargets: 30, language: 'ja' }).targets, 'ja', V, 'revision').map(w => w.id)
      else {
        const raw = old.selectRevisionTrackTargets({ vocab: V, maxTargets: 30, language: 'zh' }).targets
        const inv0 = old.mandarinLearnerInventory(V, raw), rules0 = old.scarcityRules(inv0)
        const g = old.gateTargetsByFeasibility(raw, old.selectRevisionTrackTargets({ vocab: V, maxTargets: 100000, language: 'zh' }).targets, w => old.mandarinTargetTeachable(w, inv0, V, rules0), w => !old.hasBeenIntroduced(w))
        oldIds = old.jazhContractTargets(g.targets, 'zh', V, 'revision').map(w => w.id)
      }
      T(lang, 'P4', 'regression: v658\'s Revision generator computation picks the same ordered 30 — the canonical selector changed nothing for Revision',
        same(oldIds, canon.targetIds), { old: oldIds.slice(0, 8), now: canon.targetIds.slice(0, 8) })
      T(lang, 'P3', '§22 the selection is non-trivial (mixed tiers / due dates) and all 30 are learned: NEW 0 · REVIEW 30',
        canon.targets.every(w => c.revisionEligible(w)) && ['hard', 'overdue', 'due', 'reinforce'].filter(k => canon.counts[k] > 0).length >= 2 && canon.counts.new === 0, { tiers: canon.counts })
    }

    // ══ §23 / §24 / §12 / §13 / §15 — a READY run on the controlled learner ══
    const c = rc(lang)
    const S = learner(lang, c)
    const canon = c.selectRevisionTargets(lang, S.vocab)
    const ev = []
    const st0 = mockWithLedger(S, lang, {})
    // capture live coverage events through the real builder hook
    const realB = c.generateCohesiveListeningTrack
    c.generateCohesiveListeningTrack = o => realB({ ...o, onProgress: e => { ev.push(JSON.parse(JSON.stringify({ stage: e.stage, coverage: e.coverage, targetIds: e.targetIds }))); o.onProgress && o.onProgress(e) } })
    const u = await openListening(S, lang)
    c.generateCohesiveListeningTrack = realB
    const t = u.saved[0]
    const chips = attrIds(u.r, 'data-listening-chip'), tiles = attrIds(u.r, 'data-listening-tile')
    const histRows = u.r.root.findAll(x => x.props && x.props['data-listening-history-row'] && typeof x.type === 'string')
    const attempts = JSON.parse(c.localStorage.getItem('tt-listening-attempts-' + lang) || '[]')
    const covIds = t ? t.listening.coverage.rows.map(x => x.targetId) : []
    T(lang, 'U1', '§23 selector ids === chip ids === word-tile ids === coverage-map ids === History ids (all 30, by stable id)',
      canon.targetIds.length === 30 && same(chips, canon.targetIds) && same(tiles, canon.targetIds) && same(covIds, canon.targetIds) &&
      same(t.selectedTargetIds, canon.targetIds) && same(t.listeningSelectedTargetIds, canon.targetIds) && attempts.length === 1 && same(attempts[0].selectedTargetIds, canon.targetIds),
      { chips: chips.length, tiles: tiles.length, cov: covIds.length, hist: attempts.map(a => a.selectedTargetIds.length) })
    const states = u.r.root.findAll(x => x.props && x.props['data-coverage-state'] && typeof x.type === 'string').map(x => x.props['data-coverage-state'])
    T(lang, 'C1', '§24 all 30 present → TARGET COVERAGE 30/30, every chip and tile "verified", 100%, READY, saved once',
      t && t.ready && /TARGET COVERAGE 30\/30/.test(u.text()) && states.length === 30 && states.every(s => s === 'verified') &&
      u.r.root.findAll(x => x.props && x.props['data-generator-pct']).some(x => textOf(x.children).replace(/\s/g, '') === '100%') && u.saved.length === 1 && /▶ Start Listening/.test(u.text()),
      { ready: t && t.ready, states: [...new Set(states)], saved: u.saved.length })
    const stages = ev.map(e => e.stage)
    const firstAll = ev[0] && Object.values(ev[0].coverage).every(s => s === 'pending')
    const fin = ev[ev.length - 1]
    // v662: scene by scene — after the first scene only ITS targets are lit (white); the rest stay dark until their scene is verified
    const sceneEv = ev.filter(e => e.stage === 'scene')
    const lit = e => Object.values(e.coverage).filter(s => s === 'generated').length
    const firstScene = sceneEv[0], lastScene = sceneEv[sceneEv.length - 1]
    T(lang, 'C2', '§12/§22 live coverage: pending (planning) → lit scene by scene as each scene is VERIFIED (never when merely planned) → verified (final) — one map',
      stages[0] === 'composing' && firstAll && sceneEv.length >= 4 && lit(firstScene) > 0 && lit(firstScene) < 30 && Object.values(firstScene.coverage).filter(s => s === 'pending').length === 30 - lit(firstScene) &&
      sceneEv.every((e, i) => i === 0 || lit(e) >= lit(sceneEv[i - 1])) && lit(lastScene) === 30 &&
      fin.stage === 'final' && Object.values(fin.coverage).every(s => s === 'verified') && same(fin.targetIds, canon.targetIds) &&
      same(Object.keys(fin.coverage).map(Number).sort((a, b) => a - b), canon.targetIds.slice().sort((a, b) => a - b)), stages)
    const L = (attempts[0] && attempts[0].log || []).join('\n')
    const need = ['LISTENING_TARGET_SELECTION', 'LISTENING_SELECTED_TARGET_IDS', 'LISTENING_COMPOSITION', 'LISTENING_TARGET_AUDIT', 'LISTENING_MAX3_AUDIT', 'LISTENING_CLOSED_VOCAB', 'LISTENING_NATURALNESS',
      'LISTENING_COHERENCE', 'LISTENING_PRONUNCIATION', 'LISTENING_FINAL_INTEGRITY', 'LISTENING_SNAPSHOT_INVARIANT PASS']
    T(lang, 'G1', '§13 the full Generation Log names every stage (selection, composition, target audit, max-3, closed vocab, naturalness, coherence, pronunciation, final integrity)',
      need.every(k => L.includes(k)) && /selected=30 new=0 review=30/.test(L), need.filter(k => !L.includes(k)))
    const usage = t && t.usage, tel = t && t.telemetry
    const last = JSON.parse(c.localStorage.getItem('tt-last-track-ai-usage') || 'null')
    T(lang, 'K1', '§15 cost: LISTENING_TOKEN_USAGE / LISTENING_COST recorded for THIS run, usage line shown, header cost chip updated with this run',
      tel && tel.LISTENING_TOKEN_USAGE === 1250 * tel.LISTENING_TOTAL_PAID_CALLS && Math.abs(tel.LISTENING_COST - 0.0002 * tel.LISTENING_TOTAL_PAID_CALLS) < 1e-9 &&
      usage.requests === tel.LISTENING_TOTAL_PAID_CALLS && /This Listening run ?: ?\d+ ?requests?/.test(u.text()) && last && last.language === lang && last.totalRequests === tel.LISTENING_TOTAL_PAID_CALLS,
      { tel, usage, last: last && { lang: last.language, req: last.totalRequests } })
    T(lang, 'H1', '§14 History: the attempt is listed (timestamp · language · listening · ids · state · coverage · model/cost · log)',
      attempts.length === 1 && attempts[0].trackType === 'listening' && attempts[0].language === lang && attempts[0].state === 'READY' && attempts[0].coverage.covered === 30 &&
      attempts[0].usage && attempts[0].usage.requests > 0 && attempts[0].model && attempts[0].log.length > 10 && attempts[0].createdAt && attempts[0].trackId === t.id &&
      u.r.root.findAll(x => x.props && x.props['data-listening-history'] && typeof x.type === 'string').length === 1, attempts[0] && { st: attempts[0].state, cov: attempts[0].coverage })

    // ══ §5 / §25 — the SAME shell components as the language's Daily/Revision generator ══
    {
      const shell = lang === 'th' ? ['GeneratorTitle', 'GeneratorProgressBar', 'GeneratorTileGrid', 'GeneratorStatusLine', 'GeneratorLogPanel', 'ThaiTargetTile']
        : ['CompactGeneratorHeader', 'GenerationBrickGrid', 'GenerationLiveLog', lang === 'ja' ? 'JapaneseTargetPill' : 'MandarinTargetPill']
      const inListening = shell.filter(name => u.r.root.findAllByType(c[name]).length > 0)
      const src = require('fs').readFileSync('tt.jsx', 'utf8')
      const genName = lang === 'th' ? 'Generator' : lang === 'ja' ? 'JapaneseGenerator' : 'MandarinGenerator'
      const gi = src.indexOf('function ' + genName + '({'), ge = src.indexOf('\nfunction ', gi + 10)
      const genSrc = src.slice(gi, ge)
      const inMain = shell.filter(name => genSrc.includes('<' + name + ' ') || genSrc.includes('<' + name + '\n'))
      T(lang, 'S1', '§5/§25 the Listening generator renders the same shell components as the ' + genName + ' (' + shell.join(', ') + ') — no Listening-only look-alikes',
        inListening.length === shell.length && inMain.length === shell.length, { inListening, inMain })
      const sub = u.r.root.findAll(x => x.props && x.props['data-generator-subtitle']).map(x => textOf(x.children)).join(' ')
      T(lang, 'S2', '§6 the denominator is 30 TARGET COVERAGE slots (chips 30, 1 coverage circle per tile) — never "of 90" pairs',
        chips.length === 30 && /TARGET COVERAGE 30\/30/.test(sub + ' ' + u.text()) && !/\/ ?90|of 90/.test(u.text()) &&
        u.r.root.findAllByType(c.RecallCircles).every(x => x.props.slots === 1), sub)
    }

    // ══ v659.1 — how the learner LISTENS: ▶ Start Listening right under the status, and ▶ Listen on Recent Tracks ══
    {
      const order = []
      const walk = nd => { if (!nd || typeof nd !== 'object') return; if (nd.props && nd.props['data-listening-track-ready']) order.push('start'); if (nd.props && nd.props['data-generation-log']) order.push('log')
        if (nd.type === c.GenerationLiveLog) order.push('log'); (nd.children || []).forEach(walk) }
      walk(u.r.root)
      const startBtn = u.buttons().find(b => /Start Listening/.test(textOf(b.children)))
      await TR.act(async () => { startBtn.props.onClick(); await flush(10) })
      const playing = u.r.root.findAllByType(c.ConvoPlayer).length === 1
      T(lang, 'V1', 'READY: "▶ Start Listening" sits directly under the status line (above the log) and opens the player',
        order.indexOf('start') >= 0 && order.indexOf('start') < order.indexOf('log') && playing, { order, playing })
      // Recent Tracks: the saved Listening Track has its own ▶ Listen button that goes straight to the player
      const cR = rc(lang)
      const SR = setup(lang); SR.c = cR
      const vKey = lang === 'ja' ? cR.ev('JA.vocab') : lang === 'zh' ? cR.ev('ZH.vocab') : 'tt-vocab'
      const tKey = lang === 'ja' ? cR.ev('JA.tracks') : lang === 'zh' ? cR.ev('ZH.tracks') : 'tt-tracks'
      cR.localStorage.setItem(vKey, JSON.stringify(S.vocab)); cR.localStorage.setItem(tKey, JSON.stringify([t]))
      if (lang !== 'th') cR.localStorage.setItem('tt-gemini-key', JSON.stringify(KEY))
      mock(SR, lang, {})
      const Teacher = lang === 'ja' ? cR.JapaneseTeacher : lang === 'zh' ? cR.MandarinTeacher : cR.ThaiTeacher
      let rt
      await TR.act(async () => { rt = TR.create(React.createElement(Teacher, { lang, onSetLang: () => {} })); await flush(60) })
      const lb = rt.root.findAll(x => x.props && x.props['data-listen-button'] && x.type === 'button')
      const rowText = textOf(rt.toJSON())
      const calls0 = cR.__geminiMockCalls.length
      const recentBtn = lb[lb.length - 1]   // the last one is the Recent Tracks row (the first is the v661 dashboard bar)
      if (recentBtn) await TR.act(async () => { recentBtn.props.onClick({ stopPropagation() {} }); await flush(20) })
      const opened = rt.root.findAllByType(cR.ConvoPlayer).length === 1
      T(lang, 'V2', 'Recent Tracks: a saved Listening Track shows "🎧 ▶ Listen" (no "SRS Track" / convo buttons) — one tap opens the player, 0 model calls (plus the v661 dashboard bar = 2 Listen buttons)',
        lb.length === 2 && opened && cR.__geminiMockCalls.length === calls0 && (lang !== 'th' || !/SRS Track/.test(rowText)), { listenButtons: lb.length, opened })
      await TR.act(async () => { rt.unmount() })
      // v661: the latest Listening Track sits right under the three track buttons (no scrolling to Recent Tracks)
      let rt3
      await TR.act(async () => { rt3 = TR.create(React.createElement(Teacher, { lang, onSetLang: () => {} })); await flush(60) })
      const bar = rt3.root.findAll(x => x.props && x.props['data-listening-latest'] === 'ready' && typeof x.type === 'string')
      const barBtn = bar[0] && bar[0].findAll(x => x.props && x.props['data-listen-button'] && x.type === 'button')[0]
      if (barBtn) await TR.act(async () => { barBtn.props.onClick({ stopPropagation() {} }); await flush(20) })
      T(lang, 'V3', 'dashboard: "Your Listening Track is ready" bar directly under the track buttons, its ▶ Listen opens the player',
        bar.length === 1 && !!barBtn && rt3.root.findAllByType(cR.ConvoPlayer).length === 1, { bar: bar.length })
      await TR.act(async () => { rt3.unmount() })
      // a NEWER failed attempt: the bar says so and Rebuild restarts it with the SAME ids (selector not re-run)
      const cF = rc(lang); const SF = setup(lang); SF.c = cF
      cF.localStorage.setItem(vKey, JSON.stringify(S.vocab)); cF.localStorage.setItem(tKey, JSON.stringify([]))
      if (lang !== 'th') cF.localStorage.setItem('tt-gemini-key', JSON.stringify(KEY))
      const failIds = canon.targetIds.slice().reverse()
      cF.localStorage.setItem('tt-listening-attempts-' + lang, JSON.stringify([{ attemptId: 'lattempt-x', createdAt: '2026-10-06T04:00:00.000Z', language: lang, trackType: 'listening', selectedTargetIds: failIds, state: 'NOT_READY', coverage: { covered: 27, required: 30, missing: failIds.slice(0, 3) }, failedChecks: ['COVERAGE_PASS=FAIL'], log: [] }]))
      mock(SF, lang, {})
      let selN = 0; const rs = cF.selectRevisionTargets
      let rt4
      await TR.act(async () => { rt4 = TR.create(React.createElement(lang === 'ja' ? cF.JapaneseTeacher : lang === 'zh' ? cF.MandarinTeacher : cF.ThaiTeacher, { lang, onSetLang: () => {} })); await flush(60) })
      const fb = rt4.root.findAll(x => x.props && x.props['data-listening-latest'] === 'needs-repair' && typeof x.type === 'string')
      const fbt = textOf(fb[0] || null)
      cF.selectRevisionTargets = (...a) => { selN++; return rs(...a) }
      const rbb = rt4.root.findAll(x => x.props && x.props['data-listening-latest-rebuild'] && x.type === 'button')[0]
      if (rbb) await TR.act(async () => { rbb.props.onClick(); await flush(10) })
      const tilesF = attrIds(rt4, 'data-listening-tile')
      cF.selectRevisionTargets = rs
      T(lang, 'V4', 'dashboard: a newer NOT_READY attempt shows "Your last Listening Track needs repair · 27/30" with Rebuild → the generator restarts with the SAME 30 ids (selector not re-run)',
        fb.length === 1 && /needs repair/.test(fbt) && /27\/30/.test(fbt.replace(/\s/g, '')) && selN === 0 && same(tilesF, failIds), { fb: fb.length, selN, tiles: tilesF.length })
      await TR.act(async () => { rt4.unmount() })
    }

    // ══ §24 one target absent → 29/30, its chip and tile incomplete, NOT_READY; §16/§17 the shell stays ══
    {
      const c2 = rc(lang); const S2 = learner(lang, c2)
      const can2 = c2.selectRevisionTargets(lang, S2.vocab)
      const missId = can2.targetIds[5]
      mockWithLedger(S2, lang, { ln: { missing: [missId], noRepair: true } })
      const u2 = await openListening(S2, lang)
      const tileState = id => (u2.r.root.findAll(x => x.props && x.props['data-listening-tile'] === String(id) && typeof x.type === 'string')[0] || { props: {} }).props['data-coverage-state']
      const others = can2.targetIds.filter(id => id !== missId).map(tileState)
      const chipEl = u2.r.root.findAll(x => x.props && x.props['data-listening-chip'] === String(missId) && typeof x.type === 'string')[0]
      const txt = u2.text()
      const w = S2.vocab.find(v => v.id === missId)
      T(lang, 'C3', '§24 one target absent → 29/30 · that tile stays "repair" (others verified) · its chip is the warning colour · NOT_READY · not saved',
        /TARGET COVERAGE 29\/30/.test(txt) && tileState(missId) === 'repair' && others.every(s => s === 'verified') && chipEl && /f97316/.test(JSON.stringify(chipEl.props.style)) && u2.saved.length === 0,
        { miss: tileState(missId), others: [...new Set(others)], saved: u2.saved.length })
      const shellStill = attrIds(u2.r, 'data-listening-chip').length === 30 && attrIds(u2.r, 'data-listening-tile').length === 30 &&
        u2.r.root.findAll(x => x.props && (x.props['data-generation-log'] || x.props['data-listening-usage'] || x.props['data-listening-history']) && typeof x.type === 'string').length >= 2
      const btns = u2.buttons().map(b => textOf(b.children).trim())
      T(lang, 'F1', '§16/§17 failure is a STATUS inside the generator: "LISTENING TRACK NEEDS REPAIR", coverage, Missing (the word), Failed checks, Rebuild + Continue — chips, tiles, log, cost, History all still visible, no Play',
        /LISTENING TRACK NEEDS REPAIR/.test(txt) && txt.includes('Missing: ' + w[surfKey[lang]]) && /Failed: .*COVERAGE_PASS/.test(txt) && shellStill &&
        btns.some(b => /Rebuild/.test(b)) && btns.some(b => /Continue/.test(b)) && !btns.some(b => /Start Listening/.test(b)), { btns, txt: txt.slice(0, 300) })

      // ── §18 Rebuild: same 30 ids, selector NOT re-run, new attempt, old attempt kept, chips reset then re-lit ──
      let selCalls = 0
      const realSel = c2.selectRevisionTargets
      c2.selectRevisionTargets = (...a) => { selCalls++; return realSel(...a) }
      // the learner's SRS moves on — a re-run of the selector would now pick other words
      S2.vocab.filter(v => !can2.targetIds.includes(v.id) && c2.revisionEligible(v)).slice(0, 12).forEach(v => { v.dueDate = '2025-01-01'; v.difficulty = 'hard' })
      const evR = []
      const realB2 = c2.generateCohesiveListeningTrack
      c2.generateCohesiveListeningTrack = o => realB2({ ...o, onProgress: e => { evR.push(e.stage + ':' + Object.values(e.coverage).filter(s => s === 'pending').length); o.onProgress && o.onProgress(e) } })
      mockWithLedger(S2, lang, {})
      const rb = u2.buttons().find(b => /Rebuild/.test(textOf(b.children)))
      await TR.act(async () => { rb.props.onClick(); await flush() })
      await settle(u2.r)
      c2.generateCohesiveListeningTrack = realB2; c2.selectRevisionTargets = realSel
      const att2 = JSON.parse(c2.localStorage.getItem('tt-listening-attempts-' + lang) || '[]')
      T(lang, 'R1', '§18 Rebuild → the exact same 30 ids, selector NOT re-run, coverage reset to pending then re-verified, READY, saved once',
        selCalls === 0 && evR[0] === 'composing:30' && same(u2.saved[0] && u2.saved[0].selectedTargetIds, can2.targetIds) && same(attrIds(u2.r, 'data-listening-tile'), can2.targetIds) &&
        u2.saved.length === 1 && u2.saved[0].ready && u2.saved[0].rebuildOf, { selCalls, evR: evR.slice(0, 3), saved: u2.saved.length })
      T(lang, 'R2', '§18 History keeps the failed attempt AND adds the rebuild as a new attempt (both with the same 30 ids)',
        att2.length === 2 && att2[0].state === 'READY' && att2[1].state === 'NOT_READY' && att2[0].attemptId !== att2[1].attemptId && att2[0].rebuildOf &&
        same(att2[0].selectedTargetIds, can2.targetIds) && same(att2[1].selectedTargetIds, can2.targetIds), att2.map(a => [a.state, a.rebuildOf ? 'rebuild' : ''].join(' ')))
      // ── §19 a NEW Listening Track runs the selector again (the target set may change) ──
      selCalls = 0
      c2.selectRevisionTargets = (...a) => { selCalls++; return realSel(...a) }
      mockWithLedger(S2, lang, {})
      const u3 = await openListening(S2, lang)
      c2.selectRevisionTargets = realSel
      const newIds = attrIds(u3.r, 'data-listening-tile')
      T(lang, 'N1', '§19 a completely new Listening Track calls the canonical selector again and snapshots its CURRENT 30 (the set changed with the SRS state)',
        // v674: a canonical target that cannot be VOICED with the learner's words is deferred before the freeze
        // (LISTENING_TARGET_DEFERRED … srsObligationPreserved=true) and the next SRS candidate takes its place
        selCalls >= 1 && newIds.length === 30 && !same(newIds, can2.targetIds) && (same(newIds, realSel(lang, S2.vocab).targetIds) || (() => {
          const sel = realSel(lang, S2.vocab).targetIds, L3 = JSON.parse(c2.localStorage.getItem('tt-listening-attempts-' + lang) || '[]').map(a => (a.log || []).join('\n')).join('\n')
          return sel.filter(id => !newIds.includes(id)).every(id => new RegExp('LISTENING_TARGET_DEFERRED target=' + id + ' [^\\n]*srsObligationPreserved=true').test(L3)) })()), { selCalls, changed: !same(newIds, can2.targetIds) })
    }

    // ══ §4 the snapshot never changes mid-generation; §7 a claimed-but-absent target is never lit ══
    {
      const c4 = rc(lang); const S4 = learner(lang, c4)
      const can4 = c4.selectRevisionTargets(lang, S4.vocab)
      let release; const gate = new Promise(r => { release = r })
      const st = mock(S4, lang, { ln: { noRepair: true } })
      const inner = S4._mockFn
      S4.c.mockGeminiGenerate = async (...a) => { await gate; return inner(...a) }   // (S._mockFn is the readable copy of the responder)
      let r
      await TR.act(async () => { r = TR.create(React.createElement(c4.ListeningGenerator, { lang, vocab: S4.vocab, apiKey: KEY, model: 'm', onSave: () => {}, onBack: () => {} })); await flush() })
      const during = attrIds(r, 'data-listening-tile')
      // vocabulary changes while the composer is still running (e.g. the learner's SRS state is saved elsewhere)
      const v2 = S4.vocab.map(w => can4.targetIds.includes(w.id) ? { ...w, dueDate: '2099-12-31', difficulty: 'medium' } : { ...w, dueDate: '2025-01-01', difficulty: 'hard' })
      await TR.act(async () => { r.update(React.createElement(c4.ListeningGenerator, { lang, vocab: v2, apiKey: KEY, model: 'm', onSave: () => {}, onBack: () => {} })); await flush() })
      const after = attrIds(r, 'data-listening-tile')
      release(); await settle(r)
      const fin = attrIds(r, 'data-listening-tile')
      T(lang, 'Z1', '§4 the 30 targets are frozen at start: a vocabulary/SRS change mid-generation never swaps a word (tiles before / during / after identical)',
        same(during, can4.targetIds) && same(after, can4.targetIds) && same(fin, can4.targetIds), { during: during.length, after: same(after, can4.targetIds), fin: same(fin, can4.targetIds) })
      await TR.act(async () => { r.unmount() })
    }
    if (lang === 'th') {
      const c5 = rc(lang); const S5 = learner(lang, c5)
      const can5 = c5.selectRevisionTargets(lang, S5.vocab)
      const nam = can5.targets.find(w => w.thai === 'น้ำ')
      mockWithLedger(S5, lang, { ln: { missing: [nam.id], noRepair: true } }, (q, r0) => {
        if (/Write ONE natural .* LISTENING conversation/.test(q)) { const j = JSON.parse(r0); const sc = j.scenes[1]; sc.turns.splice(1, 0, { speaker: sc.turns[0].speaker === 'A' ? 'B' : 'A', text: 'ห้องน้ำอยู่ที่ไหนครับ', english: 'Where is the bathroom?', intendedTargetIds: [nam.id] }); return JSON.stringify(j) }
        return r0 })
      const evC = []
      const realB5 = c5.generateCohesiveListeningTrack
      c5.generateCohesiveListeningTrack = o => realB5({ ...o, onProgress: e => { evC.push(e.coverage[nam.id]); o.onProgress && o.onProgress(e) } })
      const u5 = await openListening(S5, lang)
      c5.generateCohesiveListeningTrack = realB5
      T(lang, 'L1', '§7 the model CLAIMS น้ำ (in ห้องน้ำ) — its chip is never lit: pending → repair at every stage, final 29/30 NOT_READY',
        evC.length > 2 && evC.every(s => s === 'pending' || s === 'repair') && /TARGET COVERAGE 29\/30/.test(u5.text()), evC)
    }
  }
  console.log(out.join('\n'))
  console.log(fails ? fails + ' FAILED of ' + n : 'all passed (' + n + ' checks)')
  process.exit(fails ? 1 : 0)
})().catch(e => { console.log(out.join('\n')); console.log('CRASH', e.stack); process.exit(1) })
