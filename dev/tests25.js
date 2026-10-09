// v662 — LISTENING COVERAGE GUARANTEE (spec "v660 Listening Coverage Guarantee"): allocate all 30 targets before
// writing, generate scene by scene, verify each scene before moving on. TH / JA / ZH through the real app code
// (planListeningCoverage → _lnComposeByScenes → the shared gates). The model is simulated at the Gemini boundary.
//   §2–§5 / §23  the coverage plan     §8 / §24  missing target inside a scene     §10  reassignment
//   §12–§13 / §25  target lost during a quality repair     §14 / §26  turn limit     §16–§17 / §27  small repair JSON
//   §18  rebuild regenerates the plan, same targets     §29  cost     §30  success criteria in the log
const { setup, mock } = require('./tests14')
const out = []; let fails = 0, n = 0
const T = (lang, id, name, pass, detail) => { n++; if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + lang.toUpperCase() + ' ' + id.padEnd(4) + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 900) : '')) }
const LANGS = process.argv[2] ? process.argv[2].split(',') : ['th', 'ja', 'zh']
const KEY = 'AIzaSyTEST-harness-key-000000'
const surfOf = (lang, w) => lang === 'th' ? w.thai : lang === 'ja' ? w.japanese : w.chinese
function learner(lang) {
  const S = setup(lang)
  const ids = new Set(S.targets.map(t => t.id))
  S.vocab.forEach(w => { if (ids.has(w.id)) { w.dueDate = '2026-01-01'; w.difficulty = 'hard' } else { w.dueDate = '2099-01-01'; if (w.difficulty === 'hard') w.difficulty = 'medium' } })
  return S
}
async function run(S, lang, ln, extra = {}, post) {
  const st = mock(S, lang, { ln, ...(extra.mockOpt || {}) })
  const inner = S._mockFn; st.prompts = []
  S.c.mockGeminiGenerate = async (k, m, msgs, max, o) => { const q = msgs[msgs.length - 1].content; st.prompts.push(q); const r = await inner(k, m, msgs, max, o); return post ? post(q, r) : r }
  const logs = []
  const r = await S.c.buildStandaloneListeningTrack({ lang, vocab: S.vocab, apiKey: KEY, model: 'gemini-2.5-flash-lite', onLog: m => logs.push(m), attemptId: extra.attemptId || 'lattempt-test', ...(extra.build || {}) })
  return { ...r, st, logs, L: logs.join('\n') }
}
const sceneIdx = (prompts, re) => prompts.findIndex(q => re.test(q))

;(async () => {
  // ══ §2–§5 / §23 — the coverage plan (planner, language-neutral) ══
  {
    const S = setup('th'); const c = S.c
    const mk = (id, surface, role, domain) => ({ id, surface, role, domain: domain || 'general conversation', gloss: surface })
    const syn = [mk(1627, 'หมื่น', 'NUMBER'), mk(1628, 'แสน', 'NUMBER'), mk(1629, 'ล้าน', 'NUMBER'), mk(1520, 'สาย', 'TIME'), mk(1521, 'หมายถึง', 'ACTION'),
      mk(1508, 'ถอด', 'ACTION'), mk(1509, 'ทำความสะอาด', 'ACTION'), mk(1510, 'เท่านั้น', 'FUNCTIONAL_PHRASE'), mk(1, 'สวัสดี', 'GREETING'), mk(2, 'ลาก่อน', 'PARTING'),
      mk(3, 'ใช่', 'RESPONSE_TOKEN'), mk(4, 'ไม่', 'RESPONSE_TOKEN'), mk(5, 'อะไร', 'QUESTION_WORD'), mk(6, 'ที่ไหน', 'QUESTION_WORD')]
    for (let i = 0; i < 16; i++) syn.push(mk(100 + i, 'w' + i, i % 3 ? 'CONTENT' : 'PLACE', ['food & cooking', 'places & travel', 'shopping & payment', 'home'][i % 4]))
    const p = c.planListeningCoverage(syn, { seed: 'x', turnsMax: 44 })
    const req = p.scenes.flatMap(s => s.requiredTargetIds)
    const sceneOf = id => (p.scenes.find(s => s.requiredTargetIds.includes(id)) || {}).sceneId
    T('all', 'A1', '§23 coveragePlan.requiredTargetIds covers all 30 exactly once (union === selected, no duplicates, every target has a scene + exchange)',
      p.valid && new Set(req).size === 30 && req.length === 30 && syn.every(t => req.includes(t.id)) && p.assignments.length === 30 && p.assignments.every(a => a.sceneId && a.exchangeIndex >= 1), { valid: p.valid, problems: p.problems, req: req.length })
    T('all', 'A2', '§6 4–7 scenes · §3 no planned turn requires more than 3 targets · §14 planned turns ≤ the maximum (expected scene lengths before generation)',
      p.nScenes >= 4 && p.nScenes <= 7 && p.scenes.every(s => s.exchanges.every(ex => ex.turns.every(tu => tu.targetIds.length <= 3))) && p.totalExpectedTurns <= 44 &&
      p.scenes.reduce((a, s) => a + s.maxTurns, 0) <= 44 + p.nScenes, { n: p.nScenes, expected: p.totalExpectedTurns, max: p.scenes.map(s => s.maxTurns) })
    T('all', 'A3', '§4 semantic grouping (no hard-coded words): the three NUMBER words share one scene · greetings open the first scene · partings close the last · each domain stays together when it fits',
      sceneOf(1627) === sceneOf(1628) && sceneOf(1628) === sceneOf(1629) && sceneOf(1) === 'LS1' && sceneOf(2) === p.scenes[p.scenes.length - 1].sceneId &&
      ['food & cooking', 'home'].every(d => new Set(syn.filter(t => t.domain === d).map(t => sceneOf(t.id))).size === 1), p.scenes.map(s => s.sceneId + ':' + s.requiredTargetIds.join(',')))
    const dup = c.planListeningCoverage(syn.concat([syn[0]]), { seed: 'x' })
    T('all', 'A4', '§5 an invalid allocation is detected (here: a target allocated twice) → valid=false with the reason', !dup.valid && dup.problems.some(x => /twice|assignments/.test(x)), dup.problems)
    const seeds = ['a', 'b', 'c', 'd', 'e', 'f'].map(sd => JSON.stringify(c.planListeningCoverage(syn, { seed: sd }).scenes.map(s => s.requiredTargetIds.slice().sort())))
    T('all', 'A5', '§18 the plan is deterministic per seed and a rebuild seed can give a different scene distribution (same target set)',
      JSON.stringify(c.planListeningCoverage(syn, { seed: 'a' }).scenes) === JSON.stringify(c.planListeningCoverage(syn, { seed: 'a' }).scenes) && new Set(seeds).size > 1, new Set(seeds).size)
  }

  for (const lang of LANGS) {
    // ══ §30 success criteria (healthy model) + §29 cost ══
    {
      const S = learner(lang)
      const r = await run(S, lang, {})
      const t = r.track, tel = t.telemetry
      const sceneLines = r.logs.filter(l => /^🎧 SCENE_REQUIRED_COVERAGE/.test(l))
      T(lang, 'S1', '§30 log: LISTENING_SELECTED_TARGET_IDS (30) · COVERAGE_PLAN 30/30 assigned · every SCENE_REQUIRED_COVERAGE PASS · final TARGET COVERAGE 30/30 · MAX3 PASS · TURN_BUDGET PASS · READY',
        /LISTENING_SELECTED_TARGET_IDS=\[(\d+,){29}\d+\]/.test(r.L) && /LISTENING_COVERAGE_PLAN 30\/30 assigned/.test(r.L) && sceneLines.length >= 4 && sceneLines.every(l => /PASS/.test(l)) &&
        /LISTENING_TARGET_AUDIT \(final\) covered=30\/30/.test(r.L) && /LISTENING_MAX3_AUDIT PASS/.test(r.L) && /LISTENING_TURN_BUDGET \d+ turns .* PASS/.test(r.L) && t.status === 'READY' && !/INVARIANT_BROKEN/.test(r.L),
        { status: t.status, failed: t.failedChecks, scenes: sceneLines.length })
      T(lang, 'S2', '§5 every target logged with its planned home (LISTENING_TARGET_ASSIGNMENT target → scene + exchange) before the first scene call',
        (r.L.match(/LISTENING_TARGET_ASSIGNMENT target=\d+ .* → LS\d+ exchange \d+/g) || []).length === 30 &&
        r.logs.findIndex(l => /LISTENING_TARGET_ASSIGNMENT/.test(l)) < r.logs.findIndex(l => /LISTENING_COMPOSITION scene/.test(l)))
      T(lang, 'K1', '§29 cost: 4–7 scene generation calls (never 30), no whole-track call, ≤ 16 paid calls when healthy · telemetry SCENE_GENERATION / LOCAL_REPAIR / REASSIGNMENTS / COVERAGE_PLAN_TARGETS=30 / VERIFIED_TARGETS=30',
        tel.LISTENING_SCENE_GENERATION_CALLS >= 4 && tel.LISTENING_SCENE_GENERATION_CALLS <= 7 && !r.st.lnCompose && tel.LISTENING_TOTAL_PAID_CALLS <= 16 &&
        tel.LISTENING_LOCAL_REPAIR_CALLS === 0 && tel.LISTENING_REASSIGNMENTS === 0 && tel.LISTENING_COVERAGE_PLAN_TARGETS === 30 && tel.LISTENING_VERIFIED_TARGETS === 30, tel)
      const reqRows = r.st.prompts.filter(q => /Write SCENE/.test(q)).map(q => [...q.matchAll(/^T(\d+) \| /gm)].map(x => +x[1]))
      T(lang, 'S3', '§7 each scene prompt carries its HARD required targets ("MUST USE ALL OF THESE") — together exactly the 30, each once',
        reqRows.flat().length === 30 && new Set(reqRows.flat()).size === 30 && r.st.prompts.filter(q => /Write SCENE/.test(q)).every(q => /THIS SCENE MUST USE ALL OF THESE \d+ REQUIRED TARGET WORDS/.test(q)), reqRows.map(x => x.length))
      T(lang, 'S4', 'the plan travels with the track (coveragePlan + sceneReport) for History / export', !!(t.listening.coveragePlan && t.listening.coveragePlan.scenes.length >= 4 && t.listening.sceneReport && t.listening.sceneReport.length >= 4))
    }

    // ══ §8 / §24 — a scene misses one assigned target: rejected locally, repaired BEFORE the next scene starts ══
    {
      const S = learner(lang)
      const victim = S.targets[7].id
      const r = await run(S, lang, { missingOnce: [victim] })
      const sc = (r.L.match(new RegExp('LISTENING_TARGET_ASSIGNMENT target=' + victim + ' .* → (LS\\d+)')) || [])[1]
      const nextId = 'LS' + (+String(sc).slice(2) + 1)
      const iRep = sceneIdx(r.st.prompts, new RegExp('ATOMIC REPAIR[\\s\\S]*TARGET_MISSING · scene ' + sc + ' ')), iNext = sceneIdx(r.st.prompts, new RegExp('Write SCENE ' + nextId + ' '))
      T(lang, 'M1', '§24 scene ' + sc + ' heard ' + '5 of 6 → rejected locally (missing logged) → the word is placed ATOMICALLY in one exchange → verified, and the NEXT scene is generated only after that repair',
        new RegExp('SCENE_REQUIRED_COVERAGE ' + sc + ' required=\\d+ heard=\\d+ missing=').test(r.L) && new RegExp('SCENE_REQUIRED_COVERAGE ' + sc + ' \\(after atomic repair\\).* PASS').test(r.L) &&
        iRep > 0 && (iNext < 0 || iRep < iNext) && r.track.status === 'READY' && r.track.coverage.covered === 30, { sc, iRep, iNext, status: r.track.status, cov: r.track.coverage.covered })
      // the same miss, but the scene cannot be repaired → the target is REASSIGNED to another scene (never dropped)
      const assign = id => (r.L.match(new RegExp('LISTENING_TARGET_ASSIGNMENT target=' + id + ' .* → (LS\\d+)')) || [])[1]
      const lastSc = 'LS' + Math.max(...[...r.L.matchAll(/LISTENING_SCENE_PLAN (LS\d+)/g)].map(m => +m[1].slice(2)))
      const early = S.targets.map(t => t.id).find(id => assign(id) === 'LS1')
      const S2 = learner(lang)
      const r2 = await run(S2, lang, { missingOnce: [early], noRepair: true })
      const moved = (r2.L.match(new RegExp('LISTENING_REASSIGN target=' + early + ' .* (LS\\d+) → (LS\\d+)')) || [])
      const destPrompt = r2.st.prompts.find(q => new RegExp('Write SCENE ' + moved[2] + ' ').test(q)) || ''
      // v672 §2 repair order: (3) regenerate the part first; only then (5) move the target FORWARD to a later part
      T(lang, 'M2', '§10/v672 unrepairable in LS1 → the part is REGENERATED (repair step 3) or, failing that, the target moves to a LATER part where it is required → verified · 30/30 READY',
        ((new RegExp('PHASE_REGENERATE LS1 ').test(r2.L) && !moved.length) || (/TARGET_ALLOCATION_MISMATCH LS1/.test(r2.L) && moved.length === 3 && moved[1] === 'LS1' && +moved[2].slice(2) > 1 && destPrompt.includes('\nT' + early + ' | ') && r2.track.telemetry.LISTENING_REASSIGNMENTS === 1)) &&
        r2.track.coverage.covered === 30 && r2.track.status === 'READY',
        { moved: moved.slice(1), status: r2.track.status, cov: r2.track.coverage.covered, failed: r2.track.failedChecks })
      // missing in the LAST scene, which cannot be repaired: an EARLIER verified scene takes one local exchange for it
      const late = S.targets.map(t => t.id).find(id => assign(id) === lastSc)
      const S4 = learner(lang)
      const r4 = await run(S4, lang, { missingOnce: [late] }, {}, (q, r0) => new RegExp('REPAIR SCENE ' + lastSc + ' |· scene ' + lastSc + ' ').test(q) ? JSON.stringify(/ATOMIC/.test(q) ? { repairs: [] } : { edits: [] }) : r0)
      // v672 §2 — ONE conversation: a miss in the LAST part is fixed by REGENERATING that part (repair step 3); it is never
      // inserted into an earlier, already coherent part of the conversation
      T(lang, 'M4', '§10/v672 a miss in the LAST part (no later part) → line / exchange repair → the part is REGENERATED (repair step 3) → 30/30 READY; never placed into an EARLIER part',
        new RegExp('PHASE_REGENERATE ' + lastSc + ' ').test(r4.L) && !/an earlier verified scene/.test(r4.L) && !new RegExp('LISTENING_REASSIGN target=' + late + ' ').test(r4.L) && r4.track.coverage.covered === 30 && r4.track.status === 'READY',
        { status: r4.track.status, failed: r4.track.failedChecks, regen: (r4.L.match(/PHASE_REGENERATE[^\n]*/) || [])[0] })
      // a target that never fits anywhere: reassigned once, then stays missing → NOT_READY (no endless loop)
      const S3 = learner(lang)
      const r3 = await run(S3, lang, { missing: [victim], noRepair: true })
      // v672 §2: in ONE conversation a target only moves FORWARD (each move to a later part, at most 2) — bounded, no loop
      // v673 §3 — no forward scattering: the target is moved only by ONE semantic GLOBAL REPLAN (forward), then it is
      // explicitly UNPLACED (named) → 29/30 NOT_READY; bounded, no loop, no reassignment
      T(lang, 'M3', 'a target that fits nowhere: (v673) moved only by ONE semantic global replan (forward, never back), then LISTENING_TARGET_UNPLACED → 29/30 NOT_READY (bounded: no reassignment loop)',
        /LISTENING_TARGET_UNPLACED/.test(r3.L) && r3.track.coverage.covered === 29 && r3.track.status === 'NOT_READY' && (r3.track.telemetry.LISTENING_REASSIGNMENTS || 0) === 0 &&
        (r3.L.match(/LISTENING_GLOBAL_REPLAN after/g) || []).length <= 3 /* v674: MAX_REMAINING_PLAN_REBUILDS = 3 */ && !r3.logs.some(l => /LISTENING_REASSIGN target=/.test(l)), { cov: r3.track.coverage.covered, re: r3.track.telemetry.LISTENING_REASSIGNMENTS })
    }

    // ══ §12 / §13 / §25 — a naturalness repair removes a protected target → coverage re-check catches it ══
    {
      const S = learner(lang)
      const victim = S.targets[11]
      const vs = surfOf(lang, victim)
      // the victim's line is judged unnatural; the model's "fix" rewrites it WITHOUT the target
      const plain = lang === 'th' ? 'ดีมากครับ' : lang === 'ja' ? 'いいね。' : '很好。'
      let stripped = 0
      const r = await run(S, lang, {}, { mockOpt: { reject: [vs] } }, (q, r0) => {
        if (/ATOMIC REPAIR/.test(q) && /UNNATURAL/.test(q) && stripped < 1) {
          stripped++
          const j = JSON.parse(r0); j.repairs.forEach(x => (x.lines || []).forEach(l => { l.text = plain })); return JSON.stringify(j)
        }
        return r0
      })
      const row = r.track.listening && r.track.listening.coverage.rows.find(x => x.targetId === victim.id)
      // v673 §3E — naturalness is a PHASE-COMMIT gate: a line the judge always rejects never enters the conversation, so the
      // target is either heard in a NATURAL line or explicitly UNPLACED (named) — the deleting patch is still rejected
      T(lang, 'Q1', '§25/§28 a naturalness patch that deletes protected target ' + vs + ' is REJECTED before commit (PROTECTED_TARGET_LOST, original kept); (v673) the always-unnatural line is never committed — the target is heard in a natural line or explicitly UNPLACED (with any exchange partner trimmed with it), never silently lost',
        stripped > 0 && /PATCH_REJECTED .* reason=PROTECTED_TARGET_LOST/.test(r.L) && row && ((row.status === 'COVERED' && row.occurrences >= 1 && r.track.coverage.covered === 30) || (row.status === 'MISSING' && r.track.coverage.missing.includes(victim.id) && r.track.coverage.missing.every(id => new RegExp('LISTENING_TARGET_UNPLACED ' + id + ' ').test(r.L)) && r.track.status === 'NOT_READY')) &&
        !/LISTENING_COVERAGE_RECHECK|LISTENING_REPAIR_ROLLBACK/.test(r.L), { stripped, row, cov: r.track.coverage })
    }

    // ══ §14 / §26 — turn limit ══
    {
      const S = learner(lang)
      const r = await run(S, lang, { overshoot: 1 })
      T(lang, 'B1', '§26 a scene that overshoots its turn budget is rejected and regenerated within budget → total ≤ max · TURN_BUDGET PASS',
        /LISTENING_TURN_BUDGET LS1 returned \d+ turns > hard max \d+ — rejected, regenerating within budget/.test(r.L) && r.track.listening.lines.length <= 44 && r.track.listening.gates.TURN_BUDGET === true && r.track.status === 'READY',
        { lines: r.track.listening.lines.length, gates: r.track.listening.gates.TURN_COUNT, status: r.track.status })
      const S2 = learner(lang)
      const r2 = await run(S2, lang, { overshoot: 99 })
      const unc2 = r2.track.uncommittedScenes || (r2.track.listening || {}).uncommittedScenes || []
      // v673 §3: an over-budget candidate is never committed AS WRITTEN — after its regeneration the over-budget exchanges are
      // TRIMMED deterministically (what remains must pass every gate on its own) or the phase stays UNCOMMITTED; READY iff
      // every gate passes and the conversation stays within budget
      const lines2 = r2.track.listening ? r2.track.listening.lines.length : 0
      T(lang, 'B2', '§26 a model that keeps overshooting is NOT accepted as the final composition: every over-budget candidate is rejected (LISTENING_TURN_BUDGET) and never committed as written — (v673) trimmed to its clean in-budget turns or UNCOMMITTED; total ≤ 44; READY iff every gate passes',
        /LISTENING_TURN_BUDGET LS1 returned \d+ turns > hard max \d+ — rejected/.test(r2.L) && (unc2.length > 0 ? unc2.every(u => u.residual) : /PHASE_TRIMMED LS\d+ /.test(r2.L) /* v674: LS1's targets may first be moved by a remaining-plan rebuild */) && lines2 <= 44 &&
        (r2.track.status === 'READY') === (r2.track.failedChecks.length === 0) && (r2.track.status !== 'READY' || r2.track.listening.gates.TURN_BUDGET === true), { status: r2.track.status, failed: r2.track.failedChecks, unc: r2.track.uncommittedScenes || (r2.track.listening || {}).uncommittedScenes })
    }

    // ══ §16 / §17 / §27 — small structured repair JSON, bounded retry of only the affected scene ══
    {
      const S = learner(lang)
      const victim = S.targets[2].id
      const r = await run(S, lang, { missingOnce: [victim], badJsonRepair: 1 })
      const sc = (r.L.match(/LISTENING_REPAIR_JSON_PARSE_FAIL atomic \[i\d+@(LS\d+)\] attempt=1/) || [])[1]
      const repPrompts = r.st.prompts.filter(q => /ATOMIC REPAIR/.test(q))
      T(lang, 'J1', '§27 one malformed repair reply → LISTENING_REPAIR_JSON_PARSE_FAIL [issue@scene] attempt=1 → retry of ONLY that small batch → target placed · no "repair unavailable" with known missing targets · READY',
        !!sc && repPrompts.length >= 2 && repPrompts[0] === repPrompts[1].replace(/\nYour previous reply was not valid JSON.*$/s, '') && !/listening repair unavailable/.test(r.L) &&
        r.track.coverage.covered === 30 && r.track.status === 'READY', { sc, n: repPrompts.length, status: r.track.status })
      T(lang, 'J2', '§12/§16 a repair request carries only the affected line(s) and their neighbours (≤ 4 rows per issue), never a scene or the whole track',
        repPrompts.length > 0 && repPrompts.every(q => { const blocks = q.split(/\n(?=\[i\d+\] )/).filter(b => /^\[i\d+\]/.test(b)); return blocks.length >= 1 && blocks.every(b => (b.match(/^\s+(>>> )?L\d+ [AB]: /gm) || []).length <= 4) }))
      const S2 = learner(lang)
      const r2 = await run(S2, lang, { badJsonScene: 1 })
      T(lang, 'J3', '§17 a malformed SCENE reply → LISTENING_SCENE_JSON_PARSE_FAIL sceneId=LS1 attempt=1 → that scene alone is retried → READY',
        /LISTENING_SCENE_JSON_PARSE_FAIL sceneId=LS1 attempt=1/.test(r2.L) && r2.track.status === 'READY' && r2.track.telemetry.LISTENING_SCENE_GENERATION_CALLS === r2.st.lnScene, { status: r2.track.status, failed: r2.track.failedChecks, unc: r2.track.uncommittedScenes || (r2.track.listening || {}).uncommittedScenes })
    }

    // ══ §18 — rebuild: same frozen targets, plan regenerated ══
    {
      const S = learner(lang)
      const r0 = await run(S, lang, {}, { attemptId: 'lattempt-A' })
      const ids = r0.track.selectedTargetIds
      const r1 = await run(S, lang, {}, { attemptId: 'lattempt-B', build: { targetIds: ids, rebuildOf: r0.track.id } })
      T(lang, 'R1', '§18 rebuild: LISTENING_REBUILD_TARGET_SET=UNCHANGED · LISTENING_COVERAGE_PLAN=REGENERATED · identical 30 ids · the new plan still allocates all 30',
        /LISTENING_REBUILD_TARGET_SET=UNCHANGED/.test(r1.L) && /LISTENING_COVERAGE_PLAN=REGENERATED/.test(r1.L) && JSON.stringify(r1.track.selectedTargetIds) === JSON.stringify(ids) &&
        /LISTENING_COVERAGE_PLAN 30\/30 assigned/.test(r1.L) && r1.track.status === 'READY')
    }

    // ══ §5 — an invalid plan stops BEFORE any scene call ══
    {
      const S = learner(lang)
      const real = S.c.planListeningConversation          // v672: the one-conversation planner
      S.c.planListeningConversation = (...a) => { const p = real(...a); p.scenes[0].requiredTargetIds = p.scenes[0].requiredTargetIds.slice(1); p.valid = false; p.problems = ['unallocated targets: (forced by the test)']; return p }
      const r = await run(S, lang, {})
      S.c.planListeningConversation = real
      T(lang, 'V1', '§5 LISTENING_COVERAGE_PLAN_INVALID → generation NOT started (0 scene calls) → NOT_READY',
        /LISTENING_COVERAGE_PLAN_INVALID|LISTENING_PLAN_INFEASIBLE/.test(r.L) && !r.st.lnScene && r.track.status === 'NOT_READY', { scenes: r.st.lnScene, status: r.track.status })
    }
  }
  console.log(out.join('\n'))
  console.log(fails ? fails + ' FAILED of ' + n : 'all passed (' + n + ' checks)')
  process.exit(fails ? 1 : 0)
})().catch(e => { console.log(out.join('\n')); console.log('CRASH', e.stack); process.exit(1) })
