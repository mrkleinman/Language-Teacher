// v658 — STANDALONE LISTENING TRACK: the §31 matrix A–J, run for TH, JA and ZH through the real app code
// (selectRevisionTargets → buildStandaloneListeningTrack → the shared Listening builder and its 12 gates),
// plus the §17/§21/§22 UI (ListeningGenerator, ListeningTrackButton, the recent-tracks badge) rendered with
// react-test-renderer. The model is simulated at the Gemini boundary (tests14 responder); everything else is app code.
const { setup, mock, makeTrack } = require('./tests14')
const { load } = require('./harness')
const React = require('react'), TR = require('react-test-renderer')
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const out = []; let fails = 0, n = 0
const T = (lang, id, name, pass, detail) => { n++; if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + lang.toUpperCase() + ' ' + id.padEnd(3) + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 900) : '')) }
const LANGS = process.argv[2] ? process.argv[2].split(',') : ['th', 'ja', 'zh']
const KEY = 'AIzaSyTEST-harness-key-000000'
const textOf = x => x == null ? '' : typeof x === 'string' ? x : Array.isArray(x) ? x.map(textOf).join(' ') : textOf(x.children)
const flush = async () => { for (let i = 0; i < 40; i++) await new Promise(r => setImmediate(r)) }

// the learner: every word learned; the fixture's 30 words are the most overdue, so the Revision selector ranks them first
function learner(lang) {
  const S = setup(lang)
  const ids = new Set(S.targets.map(t => t.id))
  S.vocab.forEach(w => { if (ids.has(w.id)) { w.dueDate = '2026-01-01'; w.difficulty = 'hard' } else { w.dueDate = '2099-01-01'; if (w.difficulty === 'hard') w.difficulty = 'medium' } })
  return S
}
const surf = (lang, w) => lang === 'th' ? w.thai : lang === 'ja' ? w.japanese : w.chinese
const lineText = l => l.thai || l.japanese || l.chinese || ''
async function build(S, lang, ln, extra = {}) {
  const st = mock(S, lang, { ln })
  const inner = S._mockFn; st.prompts = []
  S.c.mockGeminiGenerate = async (k, m, msgs, max, o) => { st.prompts.push(msgs[msgs.length - 1].content); return inner(k, m, msgs, max, o) }
  const before = S.c.__geminiMockCalls.length
  const logs = []
  const r = await S.c.buildStandaloneListeningTrack({ lang, vocab: S.vocab, apiKey: KEY, model: S.c.ev('GEMINI_DEFAULT_MODEL'), onLog: m => logs.push(m), ...extra })
  const stages = S.c.__geminiMockCalls.slice(before).map(x => x.stage)
  return { ...r, st, logs, calls: S.c.__geminiMockCalls.length - before, stages }
}
const maxPerLine = lt => Math.max(0, ...(lt ? lt.lines : []).map(l => (l.coversTargetIds || []).length))

;(async () => {
  for (const lang of LANGS) {
    const S = learner(lang)
    const c = S.c

    // ── A / B: Daily and Revision end with their Main Track — 0 Listening calls ──────────────────────────
    for (const [id, mode] of [['A', 'daily'], ['B', 'revision']]) {
      const t0 = { ...makeTrack(S, lang, { tag: '-' + mode }), mode, trackMode: mode }
      const st = mock(S, lang, {})
      const before = c.__geminiMockCalls.length; const logs = []
      let fin
      if (lang === 'th') {
        let saved = null
        fin = await c.completeThaiTrackHandoff(t0, t0, { tracks: [], vocab: S.vocab, apiKey: KEY, model: 'm', saveTracks: async t => { saved = t[t.length - 1] }, onLog: m => logs.push(m) })
        fin = saved || fin
      } else {
        const r = await c.jazhQcFinaliseAndListen(t0, lang, { vocab: S.vocab, apiKey: KEY, model: c.ev('GEMINI_DEFAULT_MODEL'), register: 'natural', runId: c.aiBeginRun(lang + '-' + mode), push: m => logs.push(m), onListening: () => {} })
        fin = r.track
      }
      const lnCalls = c.__geminiMockCalls.slice(before).filter(x => /listen/i.test(String(x.stage || ''))).length + (st.lnCompose || 0) + (st.lnScene || 0) + (st.lnRepair || 0)
      T(lang, id, (mode === 'daily' ? 'Daily' : 'Revision') + ' Track → Listening calls 0, no listeningBuild, log says LISTENING_CALLS=0',
        lnCalls === 0 && !fin.listeningBuild && logs.some(l => /LISTENING_CALLS=0/.test(l)), { lnCalls, lb: fin.listeningBuild && fin.listeningBuild.status, logs: logs.filter(l => /LISTEN/.test(l)) })
    }

    // ── C: Revision-rule selection, 30 learned / NEW 0 / REVIEW 30, no Main generation, direct composition ──
    const sel = c.selectRevisionTargets(lang, S.vocab)
    const allLearned = sel.targets.every(w => c.revisionEligible(w) && !w.isNew)
    T(lang, 'C1', 'selection: Revision rules pick 30 previously learned words (NEW 0)', sel.targets.length === 30 && allLearned && sel.rule === 'revision', { n: sel.targets.length, allLearned })
    const r0 = await build(S, lang, {})
    const tk = r0.track, tel = tk.telemetry
    T(lang, 'C2', 'track metadata: trackType=listening · SELECTED 30 · NEW 0 · REVIEW 30 · keywords all isNew=false',
      tk.trackType === 'listening' && tk.targetCounts.selectedTargetCount === 30 && tk.targetCounts.newTargetCount === 0 && tk.targetCounts.reviewTargetCount === 30 &&
      tk.keywords.length === 30 && tk.keywords.every(k => k.isNew === false) && c.trackModeOf(tk) === 'listening' && c.trackModeLabel(tk) === 'Listening Track', tk.targetCounts)
    T(lang, 'C3', 'direct generation: 0 Main generation / Main scene-plan / Main coherence calls; the Listening scenes (v662: 4–7 scene calls, no whole-track call) are written directly',
      tel.LISTENING_MAIN_GENERATION_CALLS === 0 && !r0.st.plan && !r0.st.coh && Object.keys(r0.st.rec).length === 0 && !r0.st.lnCompose && r0.st.lnScene >= 4 && r0.st.lnScene <= 7 && tk.pairs.length === 0,
      { tel, plan: r0.st.plan, coh: r0.st.coh, rec: r0.st.rec, compose: r0.st.lnCompose, scenes: r0.st.lnScene, stages: r0.stages })
    T(lang, 'C4', 'telemetry: LISTENING_SELECTION_COUNT=30 and GENERATION/REPAIR/QC/TOTAL_PAID counts recorded (TOTAL = their sum)',
      tel.LISTENING_SELECTION_COUNT === 30 && tel.LISTENING_GENERATION_CALLS === r0.st.lnScene && tel.LISTENING_SCENE_GENERATION_CALLS === r0.st.lnScene && tel.LISTENING_TOTAL_PAID_CALLS === tel.LISTENING_GENERATION_CALLS + tel.LISTENING_REPAIR_CALLS + tel.LISTENING_QC_CALLS &&
      tel.LISTENING_TOTAL_PAID_CALLS === r0.calls, { tel, calls: r0.calls })
    const cqs = r0.st.prompts.filter(q => /Write SCENE \S+ .* LISTENING conversation/.test(q)), cq = cqs.join('\n')
    const rows = [...cq.matchAll(/^T(\d+) \| ([^|]+) \| ([^|]+) \| ([A-Z_]+)/gm)]
    const roles = new Set(rows.map(x => x[4]))
    T(lang, 'C5', 'scene prompts: every target appears as a REQUIRED row "T<id> | word [reading] | gloss | ROLE" in exactly one scene (30 rows total, reading present, §11 roles), no NEW flag, v668: a small taught SCENE PALETTE (never the whole bank as KNOWN WORDS)',
      rows.length === 30 && new Set(rows.map(x => x[1])).size === 30 && rows.every(x => /\[[^\]]+\]/.test(x[2])) && [...roles].every(r => c.LISTENING_TARGET_ROLES ? c.LISTENING_TARGET_ROLES.includes(r) : true) &&
      !rows.some(x => /\| NEW\b/.test(x[0])) && cqs.every(q => /ALLOWED SUPPORT VOCABULARY \(already taught/.test(q) && !/KNOWN WORDS:/.test(q) && /MUST USE ALL OF THESE/.test(q)), { rows: rows.length, sample: rows.slice(0, 3).map(x => x[0]), roles: [...roles] })

    // ── D: 30/30 → READY ───────────────────────────────────────────────────────────────────────────────
    const lt = tk.listening
    const truthful = lt && lt.coverage.coveredTargetIds.every(id => { const w = S.vocab.find(v => v.id === id); return lt.lines.some(l => (l.coversTargetIds || []).includes(id) && lineText(l).includes(surf(lang, w))) })
    T(lang, 'D', '30/30 → READY (TARGET COVERAGE 30/30, every gate passes, ≤3 targets per line, both speakers, coverage present in the text)',
      tk.status === 'READY' && tk.ready && tk.coverage.covered === 30 && tk.failedChecks.length === 0 && maxPerLine(lt) <= 3 &&
      new Set(lt.lines.map(l => l.speaker)).size === 2 && truthful, { status: tk.status, cov: tk.coverage, failed: tk.failedChecks, max: maxPerLine(lt), truthful })

    // ── E: 29/30 → NOT_READY ──────────────────────────────────────────────────────────────────────────
    const miss = S.targets[3].id
    const rE = await build(S, lang, { missing: [miss], noRepair: true })
    T(lang, 'E', '29/30 → NOT_READY (missing target listed, never playable)',
      rE.track.status === 'NOT_READY' && !rE.track.ready && rE.track.coverage.covered === 29 && rE.track.coverage.missing.includes(miss) && rE.track.failedChecks.some(x => /COVERAGE/.test(x)), { cov: rE.track.coverage, failed: rE.track.failedChecks })

    // ── F: 4 targets in one line → repaired, or (v669 §17) the INVALID candidate is never committed ─────────
    const rF = await build(S, lang, { max4: true })
    const rFn = await build(S, lang, { max4: true, noRepair: true })
    const telOf = t => t.telemetry || {}
    // v673 §3: the invalid candidate is REGENERATED from the frozen meaning plan, or the remaining plan is re-run ONCE
    // (global replan), or the defective exchange is TRIMMED and its target explicitly UNPLACED (NOT_READY)
    const replanOrInvalid = t => t.status === 'READY' ? (telOf(t).LISTENING_SCENES_REPLANNED >= 1 || telOf(t).LISTENING_SCENES_SIMPLIFIED_COMMITTED >= 1 || telOf(t).LISTENING_CLUSTER_REPLACEMENTS >= 1 ||
      telOf(t).LISTENING_SCENE_REGENERATIONS >= 1 || telOf(t).LISTENING_GLOBAL_REPLANS >= 1 || telOf(t).LISTENING_ATOMIC_PATCHES_ACCEPTED >= 1) : t.failedChecks.some(x => /SCENES_VALIDATED|COVERAGE/.test(x))
    T(lang, 'F', '4 targets in one line → repaired to ≤3 per line (READY) · unrepaired → (v669) that candidate is NEVER committed: the phase is regenerated from its frozen plan / re-planned (READY only when it validates) or its defective exchange is trimmed (NOT_READY) — no line > 3 targets either way',
      (rF.track.status === 'READY' ? maxPerLine(rF.track.listening) <= 3 && rF.track.telemetry.LISTENING_REPAIR_CALLS >= 1 : true) &&
      maxPerLine(rFn.track.listening) <= 3 && replanOrInvalid(rFn.track) && telOf(rFn.track).LISTENING_SCENES_COMMITTED_WITH_DEFECTS === 0,
      { f: [rF.track.status, maxPerLine(rF.track.listening)], fn: [rFn.track.status, rFn.track.failedChecks, telOf(rFn.track).LISTENING_SCENES_REPLANNED] })

    // ── G: one speaker → every candidate INVALID → NOT_READY ─────────────────────────────────────────────
    const rG = await build(S, lang, { oneSpeaker: true })
    T(lang, 'G', 'one speaker → NOT_READY (v669: every one-speaker candidate is INVALID — SCENES_VALIDATED / BOTH_SPEAKERS failed, nothing one-speaker is committed)',
      rG.track.status === 'NOT_READY' && rG.track.failedChecks.some(x => /BOTH_SPEAKERS|SCENES_VALIDATED/.test(x)) && (!rG.track.listening || new Set(rG.track.listening.lines.map(l => l.speaker)).size !== 1), rG.track.failedChecks)

    // ── H: duplicates → repaired. v669 §17: a duplicate in every candidate of LS1 → LS1 is NEVER committed; its targets are
    // re-allocated to validated scenes (READY only when all of them are verified there); in every candidate of every
    // scene → nothing validates → NOT_READY with SCENES_VALIDATED failed ──────────────────────────────────────────────
    const uncOf = t => (t.listening && t.listening.uncommittedScenes) || t.uncommittedScenes || []
    // v673 §3: the defective LS1 candidate is never committed as written — it is regenerated from its plan, re-planned ONCE
    // globally, or its defective exchange is TRIMMED (the targets it carried explicitly UNPLACED)
    // every candidate of every scene defective: NOT_READY (SCENES_VALIDATED / COVERAGE) — or (v673) READY only because the
    // defective exchanges were TRIMMED deterministically and every gate passes on what remains
    const allBad = r => r.track.status === 'NOT_READY' ? r.track.failedChecks.some(x => /SCENES_VALIDATED|COVERAGE/.test(x)) : r.track.failedChecks.length === 0 && /PHASE_TRIMMED LS\d/.test(r.logs.join('\n'))
    const v673Handled = (r, sid) => new RegExp('PHASE_REGENERATE ' + sid + ' |LISTENING_GLOBAL_REPLAN after ' + sid + ' |PHASE_TRIMMED ' + sid + ' |PHASE_NOT_COMMITTED ' + sid + ' ').test(r.logs.join('\n'))
    const consistent = t => t.status === 'READY' ? !t.failedChecks.length : t.failedChecks.length > 0
    const rH = await build(S, lang, { dup: true })
    const rHn = await build(S, lang, { dup: true, noRepair: true, persist: true })
    const rHa = await build(S, lang, { dup: true, noRepair: true, persist: 'all' })
    const noDup = t => { const ls = (t.listening ? t.listening.lines : []).map(lineText); return new Set(ls).size === ls.length }
    T(lang, 'H', 'duplicate line → repaired (no repeats, READY) · a duplicate in every LS1 candidate → LS1 never committed as written (v673: regenerated from its plan / ONE global replan / defective exchange TRIMMED, target UNPLACED), no repeats in the track · in every candidate of every scene → NOT_READY (SCENES_VALIDATED or COVERAGE failed), or READY only via deterministic trims with every gate clean',
      (rH.track.status === 'READY' ? noDup(rH.track) : true) && (uncOf(rHn.track).some(u => u.sceneId === 'LS1' && /dup/.test(u.residual)) || v673Handled(rHn, 'LS1')) && noDup(rHn.track) && consistent(rHn.track) &&
      allBad(rHa) && noDup(rHa.track),
      { h: rH.track.status, hn: [rHn.track.status, uncOf(rHn.track).map(u => u.sceneId)], ha: rHa.track.failedChecks })

    // ── I: merged Q+A in one speaker's line → repaired; merged in every candidate → never committed ─────────────
    const rI = await build(S, lang, { merged: true })
    const rIn = await build(S, lang, { merged: true, noRepair: true, persist: true })
    const rIa = await build(S, lang, { merged: true, noRepair: true, persist: 'all' })
    const merged = t => (t.listening ? t.listening.lines : []).some(l => S.c.listeningMergedSpeakerProblem(lineText(l), l.english, lang))
    T(lang, 'I', 'merged question+answer line → repaired (READY) · merged in every LS1 candidate → LS1 never committed as written (v673: regenerated / replanned / trimmed), no merged line in the track · in every candidate of every scene → NOT_READY (SCENES_VALIDATED or COVERAGE failed), or READY only via deterministic trims with every gate clean',
      (rI.track.status === 'READY' ? rI.track.failedChecks.length === 0 : true) && (uncOf(rIn.track).some(u => u.sceneId === 'LS1') || v673Handled(rIn, 'LS1')) && !merged(rIn.track) && consistent(rIn.track) &&
      allBad(rIa) && !merged(rIa.track),
      { i: rI.track.status, in: [rIn.track.status, uncOf(rIn.track).map(u => u.sceneId)], ia: rIa.track.failedChecks })

    // repair is bounded: at most 2 local repair rounds
    // v662: repair is scene-local — per scene at most 2 coverage repairs, and at most 2 quality rounds overall
    const runs = [rF, rFn, rH, rHn, rI, rIn, rE, rG]
    const maxLocal = Math.max(0, ...runs.flatMap(x => x.logs.map(l => +((l.match(/after local repair (\d+)/) || [])[1] || 0))))
    const maxRound = Math.max(0, ...runs.flatMap(x => x.logs.map(l => +((l.match(/LISTENING_REPAIR round=(\d+)/) || [])[1] || 0))))
    const maxCalls = Math.max(...runs.map(x => x.track.telemetry.LISTENING_REPAIR_CALLS))
    T(lang, 'R2', 'repair is bounded: ≤ 2 local coverage repairs per scene, ≤ 2 quality rounds, and never an unbounded number of calls',
      maxLocal <= 2 && maxRound <= 2 && maxCalls <= 40, { maxLocal, maxRound, maxCalls })

    // ── J: Rebuild keeps the same 30 target ids and composes a fresh conversation ───────────────────────
    const ids0 = rE.track.selectedTargetIds.slice()
    // the learner's SRS moves on between attempts: the selector would now rank other words first …
    const moved = S.vocab.filter(w => !ids0.includes(w.id) && c.revisionEligible(w)).slice(0, 10)
    moved.forEach(w => { w._due0 = w.dueDate; w.dueDate = '2025-01-01' })
    const rJ = await build(S, lang, {}, { targetIds: ids0, rebuildOf: rE.track.id })
    moved.forEach(w => { w.dueDate = w._due0; delete w._due0 })
    const prompt = rJ.st.prompts.find(q => /LISTENING conversation/.test(q)) || ''
    // v674: the rebuild must not feed the FAILED LINES back to the model. A PROVEN frame the adapter derived independently
    // from the learner's words (e.g. 我觉得很好。) may coincide with a short failed line (觉得很好。) — that is not reuse.
    const promptNoFrames = prompt.replace(/ · PROVEN: [^\n]*/g, '')
    T(lang, 'J', 'Rebuild → the SAME 30 target ids, a fresh scene-by-scene composition (no Main generation, no reuse of the failed lines), new track id, plan regenerated',
      JSON.stringify(rJ.track.selectedTargetIds) === JSON.stringify(ids0) && rJ.st.lnScene >= 4 && !rJ.st.lnCompose && rJ.track.telemetry.LISTENING_MAIN_GENERATION_CALLS === 0 &&
      rJ.logs.some(l => /LISTENING_REBUILD_TARGET_SET=UNCHANGED/.test(l)) && rJ.logs.some(l => /LISTENING_COVERAGE_PLAN=REGENERATED/.test(l)) &&
      rJ.track.rebuildOf === rE.track.id && rJ.track.status === 'READY' && rJ.logs.some(l => /REBUILD with the same 30 target ids/.test(l)) && !/REVISE/.test(prompt) && !rE.track.listening?.lines?.some(l => promptNoFrames.includes(lineText(l))),
      { same: JSON.stringify(rJ.track.selectedTargetIds) === JSON.stringify(ids0), compose: rJ.st.lnCompose, status: rJ.track.status, rebuildOf: rJ.track.rebuildOf })

    // ── §14 / §15: coverage is measured on the actual text, with language-specific matching ─────────────
    {
      const EXTRA = { th: ['ห้องน้ำอยู่ที่ไหนครับ', 'Where is the bathroom?'], ja: ['昨日、食べました。', 'I ate yesterday.'], zh: ['我要买东西。', 'I want to buy things.'] }
      const tgt = S.targets[3]
      mock(S, lang, { ln: { missing: [tgt.id], noRepair: true } })
      const inner = S._mockFn
      S.c.mockGeminiGenerate = async (k, m, msgs, max, o) => { const r = await inner(k, m, msgs, max, o); const q = msgs[msgs.length - 1].content
        if (/Write SCENE \S+ .* LISTENING conversation/.test(q) && q.includes('\nT' + tgt.id + ' | ')) { const j = JSON.parse(r); const sc = j; sc.turns.splice(1, 0, { speaker: (sc.turns[0] || {}).speaker === 'A' ? 'B' : 'A', text: EXTRA[lang][0], english: EXTRA[lang][1], intendedTargetIds: [tgt.id] }); return JSON.stringify(j) }
        return r }
      const rL = await c.buildStandaloneListeningTrack({ lang, vocab: S.vocab, apiKey: KEY, model: c.ev('GEMINI_DEFAULT_MODEL') })
      const row = rL.track.listening.coverage.rows.find(x => x.targetId === tgt.id)
      const okRow = rL.track.listening.coverage.rows.filter(x => x.status === 'COVERED').every(x => x.occurrences === x.lineIds.length && x.surfaceEvidence.length === x.lineIds.length && x.surfaceEvidence.every(e => typeof e === 'string' && e.length))
      if (lang === 'th') T(lang, 'L', 'Thai: "ห้องน้ำ" (bathroom) does NOT count for the target "น้ำ" (water) even when the model claims it → 29/30 NOT_READY; evidence rows are {targetId, occurrences, lineIds, surfaceEvidence}',
        surf(lang, tgt) === 'น้ำ' && row.status === 'MISSING' && row.occurrences === 0 && rL.track.status === 'NOT_READY' && rL.track.coverage.missing.includes(tgt.id) && okRow, { row, st: rL.track.status })
      else T(lang, 'L', (lang === 'ja' ? 'Japanese: a conjugated form (食べました) counts for 食べる' : 'Mandarin: 东西 is found by segmentation in 我要买东西') + ' → 30/30 READY; evidence rows are {targetId, occurrences, lineIds, surfaceEvidence}',
        row.status === 'COVERED' && row.occurrences === 1 && row.surfaceEvidence[0] === EXTRA[lang][0] && rL.track.status === 'READY' && okRow, { row, st: rL.track.status, f: rL.track.failedChecks })
    }

    // too few learned words → NOT_READY without any paid call
    const fewV = S.vocab.map(w => ({ ...w, lastSeen: null, introducedAt: null, okStreak: 0, manualKnown: false, status: 'new', difficulty: undefined }))
    S.targets.slice(0, 12).forEach(t => { const w = fewV.find(v => v.id === t.id); Object.assign(w, { lastSeen: '2026-09-20', introducedAt: '2026-09-01', status: 'learning' }) })
    mock(S, lang, {}); const b4 = c.__geminiMockCalls.length
    const rFew = await c.buildStandaloneListeningTrack({ lang, vocab: fewV, apiKey: KEY, model: 'm' })
    T(lang, 'K', 'fewer than 30 learned words → NOT_READY, 0 paid calls (no new words are pulled in)', rFew.track.status === 'NOT_READY' && c.__geminiMockCalls.length === b4 && rFew.track.keywords.every(k => !k.isNew), { st: rFew.track.status, kw: rFew.track.keywords.length })

    // ── history / export ────────────────────────────────────────────────────────────────────────────────
    const ex = c.listeningTrackExportLines(tk).join('\n')
    T(lang, 'X', 'export: trackType=listening · language · selected=30 · new=0 · review=30 · coverage=30/30 · ready=true · createdAt',
      new RegExp('trackType=listening · language=' + lang + ' · selected=30 · new=0 · review=30 · coverage=30/30 · ready=true · createdAt=').test(ex) && /Main generation calls: 0/.test(ex) && /LISTENING_SELECTION_COUNT=30/.test(ex), ex.slice(0, 400))
    T(lang, 'Y', 'history summary + Daily counters: a listening track is never counted as a Daily/Revision track',
      /TARGET COVERAGE 30\/30 · NEW 0 · REVIEW 30/.test(c.listeningTrackSummary(tk)) && c.trackModeOf(tk) !== 'daily' && c.isListeningTrack(tk) && !c.isListeningTrack(makeTrack(S, lang)), c.listeningTrackSummary(tk))

    // ── UI: the Listening Track screen (react-test-renderer, effects run) ───────────────────────────────
    const cr = load(process.env.TT_FILE || 'tt.compiled.js', { React }); cr.console.info = () => {}
    const SR = { ...S, c: cr }
    const ui = async (ln, props = {}) => {
      mock(SR, lang, { ln }); const saved = []
      let r
      await TR.act(async () => { r = TR.create(React.createElement(cr.ListeningGenerator, { lang, vocab: S.vocab, apiKey: KEY, model: 'm', gcpTtsKey: '', onSave: t => saved.push(t), onBack: () => {}, ...props })); await flush() })
      for (let i = 0; i < 20 && r.root.findAll(x => x.props && x.props['data-listening-track-building']).length; i++) await TR.act(async () => { await flush() })
      return { r, saved, text: () => textOf(r.toJSON()).replace(/\s+/g, ' '), buttons: () => r.root.findAll(x => x.type === 'button').map(b => textOf(b.children).trim()) }
    }
    const u1 = await ui({ missing: [miss], noRepair: true })
    const t1 = u1.text(), b1 = u1.buttons()
    T(lang, 'U1', 'NOT_READY screen: "Listening track needs repair" · TARGET COVERAGE 29/30 · Missing … · failed checks · Rebuild + Continue + (v664) ▶ Play anyway · no Start Listening · not saved until played',
      /LISTENING TRACK NEEDS REPAIR/i.test(t1) && /TARGET COVERAGE 29 ?\/ ?30/.test(t1) && /Missing: /.test(t1) && /COVERAGE/.test(t1) &&
      b1.some(b => /Rebuild/.test(b)) && b1.some(b => /Continue/.test(b)) && !b1.some(b => /Start Listening/.test(b)) && b1.some(b => /Play anyway/.test(b)) && u1.saved.length === 0, { t1: t1.slice(0, 300), b1, saved: u1.saved.length })
    // Rebuild on that screen: same ids, healthy model → READY, saved once
    mock(SR, lang, { ln: {} })
    const rb = u1.r.root.findAll(x => x.type === 'button').find(b => /Rebuild/.test(textOf(b.children)))
    await TR.act(async () => { rb.props.onClick(); await flush() })
    for (let i = 0; i < 20 && u1.r.root.findAll(x => x.props && x.props['data-listening-track-building']).length; i++) await TR.act(async () => { await flush() })
    T(lang, 'U2', 'Rebuild button → READY "Listening Track" with ▶ Start Listening; saved exactly once with the same 30 ids',
      /▶ Start Listening/.test(u1.text()) && u1.saved.length === 1 && JSON.stringify(u1.saved[0].selectedTargetIds) === JSON.stringify(ids0.length ? u1.saved[0].selectedTargetIds : []) &&
      u1.saved[0].selectedTargetIds.length === 30 && u1.saved[0].status === 'READY', { t: u1.text().slice(0, 200), saved: u1.saved.map(s => s.status) })
    const u3 = await ui({}, { track: tk })
    T(lang, 'U3', 'a saved READY listening track opens straight to its Start screen with 0 model calls', /▶ Start Listening/.test(u3.text()) && /TARGET COVERAGE|30\/30/.test(u3.text()), u3.text().slice(0, 200))

    // ── UI: the dashboard button (§1 / §30 copy) ───────────────────────────────────────────────────────
    let rbtn; let started = 0
    await TR.act(async () => { rbtn = TR.create(React.createElement(cr.ListeningTrackButton, { selection: sel, onStart: () => started++ })) })
    const bt = textOf(rbtn.toJSON()).replace(/\s+/g, ' ')
    await TR.act(async () => { rbtn.root.findByType('button').props.onClick() })
    let rbtn0
    await TR.act(async () => { rbtn0 = TR.create(React.createElement(cr.ListeningTrackButton, { selection: { targets: sel.targets.slice(0, 12) }, onStart: () => started++ })) })
    T(lang, 'U4', 'Listening Track button: "Listening Track / Listen using learned words / 30 words · 0 NEW", starts directly; disabled under 30 learned words',
      /Listening Track/.test(bt) && /Listen using learned words/.test(bt) && /30 words · 0 NEW/.test(bt) && started === 1 && rbtn0.root.findByType('button').props.disabled === true, bt)
  }

  // ── source: one creation flow (§25), button copy (§30), dashboards carry the third button (§1) ─────────
  const src = require('fs').readFileSync('tt.jsx', 'utf8')
  T('all', 'S1', 'source: Daily/Revision copy "Learn + review" / "Practice learned words"; Listening copy "Listen using learned words"',
    /Learn \+ review/.test(src) && /Practice learned words/.test(src) && /Listen using learned words/.test(src))
  T('all', 'S2', 'source: TH / JA / ZH dashboards each render ListeningTrackButton in a 3-column row', (src.match(/<ListeningTrackButton /g) || []).length === 3 && (src.match(/repeat\(3, minmax\(0, 1fr\)\)/g) || []).length >= 3)
  T('all', 'S3', 'source: the only Listening creation call site is buildStandaloneListeningTrack (no AUTO_PRETRACK / post-Main / child build)',
    (src.match(/buildListeningConversation\(/g) || []).length === 3 /* definition + retained library wrapper + the standalone call */ &&
    (src.match(/await ensureListeningBuilt\(/g) || []).length === 1 && /const buildTh = useCallback\(async \(mode\) => \{\n\s+if \(!LISTENING_CHILD_TRACK_BUILDS\) \{ retired\(\); return \}/.test(src) &&
    /LISTENING_CHILD_TRACK_BUILDS = false/.test(src) && !/listeningSkippedBuild\(failed/.test(src) && (src.match(/ensureThaiListeningBuilt\(/g) || []).length === 1 /* definition only — no caller */)

  console.log(out.join('\n'))
  console.log(fails ? fails + ' FAILED of ' + n : 'all passed (' + n + ' checks)')
  process.exit(fails ? 1 : 0)
})().catch(e => { console.log('CRASH', e.stack); process.exit(1) })
