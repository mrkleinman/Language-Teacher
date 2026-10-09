// v664 — "30 sentences ready yet the track can't be played": PLAYABILITY vs QUALITY for the standalone Listening Track.
// TH / JA / ZH through the real pipeline (scene composer → atomic queue → gates → UI); the model is simulated at the
// Gemini boundary (tests14 responder). Checks:
//   P  quality issues (unknown words / duplicates / unnatural) on a 30/30 track → READY, playable, notes shown
//   Q  hard failure (29/30) → NOT_READY · failedChecks = playability gates only · ▶ Play anyway saves playable:true + plays
//   R  SCENE_REQUIRED_COVERAGE is judged on the FINAL text (30/30 ⇒ PASS)
//   S  allowedMax ≥ expectedTurns after reassignment (live "9–8 turns")
//   C  cost: NO_CHANGE ends an issue after 1 call; quality repair capped at LISTENING_QUALITY_ATOMIC_CALLS
//   A  comparison scenes do not trip the "amount jumps" heuristic (live false positive 20,000 → 1,000,000)
//   U  UI: notes on READY · History ▶ Play · autoPlay a playable track · dashboard bar shows a playable track
const { setup, mock } = require('./tests14')
const { load } = require('./harness')
const React = require('react'), TR = require('react-test-renderer')
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const out = []; let fails = 0, n = 0
const T = (lang, id, name, pass, detail) => { n++; if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + lang.toUpperCase() + ' ' + id.padEnd(4) + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 900) : '')) }
const LANGS = process.argv[2] ? process.argv[2].split(',') : ['th', 'ja', 'zh']
const KEY = 'AIzaSyTEST-harness-key-000000'
const F = { th: 'จักรวาล', ja: '宇宙', zh: '宇宙' }
const textOf = x => x == null ? '' : typeof x === 'string' ? x : Array.isArray(x) ? x.map(textOf).join(' ') : textOf(x.children)
const flush = async () => { for (let i = 0; i < 40; i++) await new Promise(r => setImmediate(r)) }
const addWord = (lang, text, w) => lang === 'th' ? text.replace(/(ครับ|ค่ะ|คะ)?$/, m => w + m) : text.replace(/([。？！])?$/, m => w + m)
const HARD = ['COVERAGE_PASS', 'MAX3_PASS', 'BOTH_SPEAKERS', 'TURN_BUDGET']
function learner(lang) {
  const S = setup(lang)
  const ids = new Set(S.targets.map(t => t.id))
  S.vocab.forEach(w => { if (ids.has(w.id)) { w.dueDate = '2026-01-01'; w.difficulty = 'hard' } else { w.dueDate = '2099-01-01'; if (w.difficulty === 'hard') w.difficulty = 'medium' } })
  return S
}
async function run(S, lang, ln, opt = {}) {
  const st = mock(S, lang, { ln, ...(opt.mockOpt || {}) })
  const inner = S._mockFn; st.prompts = []
  S.c.mockGeminiGenerate = async (k, m, msgs, max, o) => {
    const q = msgs[msgs.length - 1].content; st.prompts.push(q)
    let r = await inner(k, m, msgs, max, o)
    const sm = q.match(/^Write SCENE (LS\d+) /)
    if (sm && opt.inject) { const j = JSON.parse(r); opt.inject(sm[1], j); r = JSON.stringify(j) }
    return r
  }
  const logs = []
  const r = await S.c.buildStandaloneListeningTrack({ lang, vocab: S.vocab, apiKey: KEY, model: 'gemini-2.5-flash-lite', onLog: m => logs.push(m), attemptId: 'lattempt-v664' })
  return { ...r, st, logs, L: logs.join('\n') }
}
const atomicCalls = r => r.st.prompts.filter(q => /ATOMIC REPAIR/.test(q)).length

;(async () => {
  for (const lang of LANGS) {
    // ══ P — (v665 supersedes v664) an unknown word is a HARD gate: never READY, caught at generation time ══
    {
      const S = learner(lang)
      const r = await run(S, lang, { atomicNoop: true }, { inject: (sid, j) => { if (j.turns[1]) j.turns[1].text = addWord(lang, j.turns[1].text, F[lang]) } })
      const t = r.track
      // v669 §17 supersedes v665 here: an unknown word the model can never remove means NO scene candidate validates — none
      // is committed (no unknown word ever reaches the track) and the track is NOT_READY with SCENES_VALIDATED failed
      const lnLines = t.listening ? t.listening.lines : []
      T(lang, 'P1', 'v665 §18 → v669 §17: unknown words in every scene (unfixable) → no INVALID candidate is committed (v673: only clean trimmed lines; the lost targets UNPLACED) → NOT_READY · the unknown word is not in the track · no quality notes',
        // (v673: or the phases commit only their clean, trimmed lines and every unheard target is explicitly UNPLACED)
        t.status === 'NOT_READY' && t.ready === false && (t.failedChecks.includes('SCENES_VALIDATED=FAIL') || (t.failedChecks.some(x => /COVERAGE/.test(x)) && t.coverage.missing.every(id => new RegExp('LISTENING_TARGET_UNPLACED ' + id + ' |PHASE_NOT_COMMITTED').test(r.L)))) &&
        !lnLines.some(l => (l.thai || l.japanese || l.chinese || '').includes(F[lang])) && !(t.qualityNotes || []).length,
        { status: t.status, failed: t.failedChecks, cov: t.coverage.covered })
      T(lang, 'P2', 'v665 §20/§49: CLOSED_VOCAB_FAIL logged per scene AS GENERATED (before the next scene) · SCENE_NOT_COMMITTED names the closedVocab residual (v673: PHASE_TRIMMED / PHASE_NOT_COMMITTED) · no LISTENING_QUALITY_NOTES',
        r.logs.filter(l => /CLOSED_VOCAB_FAIL scene=LS\d .*\(as generated\)/.test(l)).length >= 4 && (/SCENE_NOT_COMMITTED LS\d INVALID_CANDIDATE residual=.*closedVocab/.test(r.L) || /PHASE_TRIMMED LS\d|PHASE_NOT_COMMITTED LS\d/.test(r.L)) &&
        !/LISTENING_QUALITY_NOTES/.test(r.L), { notCommitted: r.logs.filter(l => /SCENE_NOT_COMMITTED/.test(l)).length })
      // v669: when no scene validated there is no Listening body at all — the track is NOT_READY and its reason names the
      // uncommitted scenes; when some scenes validated, the coverage label says NEEDS REPAIR
      const lbl = S.c.listeningCoverageLabel(t.listening, t)
      T(lang, 'P3', 'never "READY · quality notes": the coverage label says LISTENING TRACK NEEDS REPAIR, or (no scene validated) the NOT_READY reason names the UNCOMMITTED_SCENE candidates',
        t.listening ? /NEEDS REPAIR/i.test(lbl) && !/READY · quality/.test(lbl) : t.status === 'NOT_READY' && /UNCOMMITTED_SCENE/.test(t.failureReason || ''), lbl || t.failureReason)
      // C1 — NO_CHANGE ends an issue after ONE call: no CLOSED_VOCAB repair of the same line text is ever attempted twice
      // (v669: re-planned candidates are NEW lines and may get their own single attempt)
      const second = r.logs.filter(l => /LISTENING_ATOMIC_REPAIR issue=CLOSED_VOCAB .*attempt=2/.test(l))
      T(lang, 'C1', 'cost: the model returning the SAME line ends that issue after 1 call (NO_CHANGE → no retry), never 2 — not even in the later stages',
        r.logs.some(l => /LISTENING_ATOMIC_REPAIR issue=CLOSED_VOCAB .*attempt=1/.test(l)) && !second.length && /reason=NO_CHANGE .*no retry/.test(r.L), { second: second.slice(0, 3) })
    }
    // ══ C2 — fixable unknown words are repaired scene by scene at generation time ══
    {
      const S = learner(lang)
      const r = await run(S, lang, {}, { inject: (sid, j) => j.turns.forEach(tn => { tn.text = addWord(lang, tn.text, F[lang]) }) })
      const t = r.track
      const assembled = (r.L.match(/LISTENING_CLOSED_VOCAB (PASS|FAIL)/) || [])[1]
      const perScene = {}
      r.logs.filter(l => /LISTENING_ATOMIC_REPAIR issue=/.test(l)).forEach(l => { const sc = (l.match(/scene=(LS\d)/) || [])[1]; perScene[sc] = (perScene[sc] || 0) + 1 })
      // v668 §21/§58 supersedes v665 here: unknown words on EVERY line is a fundamentally invalid candidate → the scene is
      // REGENERATED (not queued line by line); the model keeps leaking → bounded salvage (≤ 2 atomic calls per scene) → READY
      const regen = r.logs.filter(l => /SCENE_PREFLIGHT LS\d .*decision=REGENERATE reason=CLOSED_VOCAB \d+ lines/.test(l)).length
      T(lang, 'C2', 'v668 §21/§58: an unknown word in EVERY generated line → SCENE_PREFLIGHT decision=REGENERATE per scene (never one atomic call per line) → (v673) no line-by-line salvage spiral: regenerated from the plan; a model that keeps leaking ⇒ nothing defective committed, NOT_READY with < 10 repair calls',
        // v673 §3 supersedes the v669 salvage: a model that leaks an unknown word into EVERY line of EVERY candidate is a
        // planning / palette failure — the phase is regenerated (never salvaged line by line: no repair spiral) and, when it
        // keeps leaking, nothing defective is committed → NOT_READY honestly, with < 10 repair calls
        t.status === 'NOT_READY' && regen >= 4 && !(t.listening ? t.listening.lines : []).some(l => (l.thai || l.japanese || l.chinese || '').includes(F[lang])) &&
        t.telemetry.LISTENING_REPAIR_CALLS < 10 && (t.telemetry.LISTENING_SCENES_COMMITTED_WITH_DEFECTS || 0) === 0,
        { status: t.status, assembled, regen, perScene, atomic: atomicCalls(r), failed: t.failedChecks })
    }
    // ══ Q — a hard failure is NOT_READY, but the learner may still play it ══
    {
      const S = learner(lang)
      const miss = S.targets[3].id
      const r = await run(S, lang, { missing: [miss], noRepair: true })
      const t = r.track
      T(lang, 'Q1', 'hard failure 29/30 → NOT_READY · failedChecks = COVERAGE_PASS (+ SCENE_REQUIRED_COVERAGE) only · lines exist',
        t.status === 'NOT_READY' && t.coverage.covered === 29 && t.failedChecks.some(x => /COVERAGE_PASS/.test(x)) && t.failedChecks.every(x => /^(COVERAGE_PASS|SCENE_REQUIRED_COVERAGE)=/.test(x)) &&
        t.listening.lines.length > 0, { failed: t.failedChecks })
      // UI: Play anyway
      const cr = load(process.env.TT_FILE || 'tt.compiled.js', { React }); cr.console.info = () => {}
      const SR = { ...S, c: cr }
      mock(SR, lang, { ln: { missing: [miss], noRepair: true } }); const saved = []
      let R
      await TR.act(async () => { R = TR.create(React.createElement(cr.ListeningGenerator, { lang, vocab: S.vocab, apiKey: KEY, model: 'm', gcpTtsKey: '', onSave: x => saved.push(x), onBack: () => {} })); await flush() })
      for (let i = 0; i < 20 && R.root.findAll(x => x.props && x.props['data-listening-track-building']).length; i++) await TR.act(async () => { await flush() })
      const pa = R.root.findAll(x => x.props && x.props['data-listening-play-anyway'])
      const btn = pa.length ? pa[0].findAll(x => x.type === 'button')[0] : null
      T(lang, 'Q2', 'NOT_READY screen offers ▶ Play anyway (with the line count) and saves nothing yet', !!btn && /Play anyway \( ?\d+ ?lines\)/.test(textOf(btn.children).replace(/\s+/g, ' ')) && saved.length === 0, { found: pa.length, saved: saved.length })
      if (btn) await TR.act(async () => { btn.props.onClick(); await flush() })
      const players = R.root.findAll(x => x.type === cr.ConvoPlayer)
      T(lang, 'Q3', '▶ Play anyway → saved ONCE with playable:true, status still NOT_READY (never disguised as READY), failedChecks kept · the player opens with the conversation',
        saved.length === 1 && saved[0].playable === true && saved[0].status === 'NOT_READY' && saved[0].ready === false && saved[0].failedChecks.length > 0 && players.length === 1 && players[0].props.lines.length === saved[0].listening.lines.length,
        { saved: saved.map(s => [s.status, s.playable]), players: players.length })
      // dashboard bar + autoPlay accept a playable track
      let B
      await TR.act(async () => { B = TR.create(React.createElement(cr.ListeningLatestBar, { lang, tracks: saved, onListen: () => {}, onRebuild: () => {} })); await flush() })
      T(lang, 'U1', 'dashboard ListeningLatestBar shows the played-anyway track (ready || playable)', B.toJSON() != null && /Listen|▶/.test(textOf(B.toJSON())), textOf(B.toJSON()).slice(0, 200))
      let A
      await TR.act(async () => { A = TR.create(React.createElement(cr.ListeningGenerator, { lang, vocab: S.vocab, apiKey: KEY, model: 'm', gcpTtsKey: '', track: saved[0], autoPlay: true, onSave: () => {}, onBack: () => {} })); await flush() })
      T(lang, 'U2', 'opening a saved playable track with autoPlay goes straight to the player (0 model calls)', A.root.findAll(x => x.type === cr.ConvoPlayer).length === 1)
      // History ▶ Play on an attempt that has lines
      const atts = await cr.loadListeningAttempts(lang)
      const withLines = atts.filter(a => (a.lines || []).length)
      T(lang, 'U3', 'attempt records keep the conversation lines + quality notes (History can play any attempt that produced lines)',
        withLines.length >= 1 && withLines[0].lines.length > 0 && Array.isArray(withLines[0].qualityNotes), atts.map(a => [a.state, (a.lines || []).length]))
      let played = null, H
      await TR.act(async () => { H = TR.create(React.createElement(cr.ListeningAttemptHistory, { attempts: withLines, currentId: null, words: S.vocab, building: false, onRebuildIds: () => {}, onPlay: a => { played = a } })); await flush() })
      const tog = H.root.findAll(x => x.type === 'button').find(b => /History/.test(textOf(b.children)))
      await TR.act(async () => { tog.props.onClick(); await flush() })
      const row = H.root.findAll(x => x.props && x.props['data-listening-history-row'])[0]
      await TR.act(async () => { row.findAll(x => x.props && typeof x.props.onClick === 'function')[0].props.onClick(); await flush() })
      const pb = H.root.findAll(x => x.props && x.props['data-listening-history-play'])
      if (pb.length) await TR.act(async () => { pb[0].props.onClick(); await flush() })
      T(lang, 'U4', 'History row ▶ Play hands the stored conversation to the player', pb.length === 1 && played && played.attemptId === withLines[0].attemptId, { pb: pb.length })
    }
    // ══ U5 — v665: the NOT_READY panel names what broke the level contract; READY shows no notes box ══
    {
      const S = learner(lang); const cr = load(process.env.TT_FILE || 'tt.compiled.js', { React }); cr.console.info = () => {}
      const bad = { trackType: 'listening', ready: false, status: 'NOT_READY', coverage: { covered: 30, required: 30, missing: [] }, selectedTargetIds: [1], failedChecks: ['LENGTH_PASS=FAIL', 'CLOSED_VOCAB=FAIL'], qualityNotes: [],
        lengthAudit: { belt: 'Mukyu', preferredMin: 2, preferredMax: 4, hardMax: 6, unit: 'Thai words', overHardMax: 1, over: [{ line: 7, units: 8, text: 'x' }] }, unknownWords: ['หั่น', 'เครื่องครัว'] }
      const ok = { trackType: 'listening', ready: true, status: 'READY', coverage: { covered: 30, required: 30, missing: [] }, selectedTargetIds: [], qualityNotes: [] }
      let P, Q
      await TR.act(async () => { P = TR.create(React.createElement(cr.ListeningStatusPanel, { track: bad, wordOf: x => x, building: false, onRebuild: () => {}, onBack: () => {}, onStart: () => {}, onCancel: () => {} })); await flush() })
      await TR.act(async () => { Q = TR.create(React.createElement(cr.ListeningStatusPanel, { track: ok, wordOf: x => x, building: false, onRebuild: () => {}, onBack: () => {}, onStart: () => {}, onCancel: () => {} })); await flush() })
      const tx = textOf(P.toJSON()).replace(/\s+/g, ' '), tq = textOf(Q.toJSON()).replace(/\s+/g, ' ')
      T(lang, 'U5', 'NOT_READY panel: "Too long for Mukyu (target 2–4 · hard max 6 Thai words): L7 (8)" + "Words not taught yet: หั่น, เครื่องครัว" · READY panel: ▶ Start Listening, no notes box',
        /Too long for Mukyu \(target 2 ?– ?4 · hard max 6 Thai words ?\): L7 \( ?8 ?\)/.test(tx) && /Words not taught yet: หั่น, เครื่องครัว/.test(tx) && /Start Listening/.test(tq) && !/QUALITY NOTES/.test(tq), { tx: tx.slice(0, 300), tq: tq.slice(0, 120) })
    }
    // ══ R / S — scene gate from the final text; allowedMax never below expectedTurns ══
    {
      const S = learner(lang)
      const r0 = await run(S, lang, {})
      const assign = id => (r0.L.match(new RegExp('LISTENING_TARGET_ASSIGNMENT target=' + id + ' .* → (LS\\d+)')) || [])[1]
      const early = S.targets.map(t => t.id).filter(id => assign(id) === 'LS1').slice(0, 3)
      const S2 = learner(lang)
      const r = await run(S2, lang, { missingOnce: early, noRepair: true })
      const ranges = [...r.L.matchAll(/LISTENING_COMPOSITION scene (LS\d+) .*· (\d+)–(\d+) turns/g)].map(m => [m[1], +m[2], +m[3]])
      T(lang, 'S1', 'after reassigning ' + early.length + ' word(s) every scene prompt has expectedTurns ≤ allowedMax (live: "9–8 turns")',
        ranges.length >= 4 && ranges.every(([, e, m]) => e <= m), ranges)
      T(lang, 'R1', 'final text 30/30 ⇒ SCENE_REQUIRED_COVERAGE=PASS (a word heard in another scene satisfies it) · READY',
        r.track.coverage.covered === 30 ? r.track.listening.gates.SCENE_REQUIRED_COVERAGE === 'PASS' && r.track.status === 'READY' : true,
        { cov: r.track.coverage.covered, g: r.track.listening.gates.SCENE_REQUIRED_COVERAGE, status: r.track.status, failed: r.track.failedChecks })
    }
  }
  // ══ A — amount comparison is not "random escalation" ══
  {
    const c = setup('th').c
    const L = en => en.map(e => ({ pair: { english: e } }))
    const cmp = c.listeningPlausibilityProblems(L(['My salary is twenty thousand baht a month.', 'A condo here costs one million baht.', 'That is fifty times more than my salary!']))
    const cmp2 = c.listeningPlausibilityProblems(L(['I earn twenty thousand baht.', 'Wow, my uncle has one million baht.']))
    const rnd = c.listeningPlausibilityProblems(L(['The noodles cost 60 baht.', 'Here, I give you 6000 baht for the noodles.']))
    T('all', 'A1', 'comparison of big amounts (salary vs condo, "more than", million) → no "amount jumps" problem (live false positive 20,000 → 1,000,000)',
      !cmp.some(p => /amount jumps/.test(p.why)) && !cmp2.some(p => /amount jumps/.test(p.why)), { cmp, cmp2 })
    T('all', 'A2', 'a real unexplained jump in an everyday exchange is still flagged', rnd.some(p => /amount jumps|implausible/.test(p.why)), rnd)
  }
  console.log(out.join('\n'))
  console.log(fails ? fails + ' FAILED of ' + n : 'all passed (' + n + ' checks)')
  process.exit(fails ? 1 : 0)
})().catch(e => { console.log(out.join('\n')); console.log('CRASH', e.stack); process.exit(1) })
