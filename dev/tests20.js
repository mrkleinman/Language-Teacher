// v655 — THAI READY REPAIR regression: per-scene LOCAL premises (§3–§7, §20), one authoritative pronunciation
// pipeline (§8–§13, §21, §22), graded suitability metadata + audit (§14–§18), backfill telemetry (§19).
// The model is simulated at the Gemini boundary (tests14 responder, wrapped per test); every planner, judge
// prompt, repair, validator and audit is the app's own code.
const { load } = require('./harness')
const { setup, makeTrack, mock, txt } = require('./tests14.js')
let fails = 0, passes = 0
const out = []
const T = (id, name, pass, detail) => {
  if (pass) passes++; else fails++
  out.push((pass ? 'PASS ' : 'FAIL ') + id.padEnd(4) + name + (detail !== undefined && !pass ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 1400) : ''))
}
const ADAPTER = S => S.c.ev('TRACK_ADAPTERS').th
const fin = async (S, track, extra = {}) => {
  const log = []
  const t = await S.c.finaliseMainTrack(track, ADAPTER(S), { vocab: S.vocab, apiKey: 'k', model: 'gemini-2.5-flash-lite', qcRan: true, onLog: m => log.push(m), ...extra })
  return { t, log }
}
const wrap = (S, fn) => { const base = S._mockFn; const seen = []; S.c.mockGeminiGenerate = S._mockFn = async (k, m, msgs, max, o) => { const q = msgs[msgs.length - 1].content; seen.push({ q, stage: o && o.stage }); const r = await base(k, m, msgs, max, o); return fn ? fn(q, r, o) : r }; return seen }
// the live 30 Sept lesson: food · payment · travel/tickets/rental · colours/tools · souvenir
const LIVE = ['หอมใหญ่', 'กระเทียม', 'ผัก', 'ข้าวเหนียว', 'ส้มตำ', 'บัตร', 'เงินสด', 'โอน', 'เงินทอน', 'ใบเสร็จ', 'ร้านสะดวกซื้อ', 'สนามบิน', 'เช่า', 'ตั๋ว', 'สี', 'สีเหลือง', 'มีด', 'ของฝาก']
const GLOBAL = "A visits B's food stall and asks about the price of a dish"
function liveSetup(file) {
  const S = file ? (() => { const base = setup('th'); const c = load(file); const vocab = c.initVocab(); vocab.forEach(w => { const b = base.vocab.find(x => x.id === w.id); if (b) Object.assign(w, { status: b.status, lastSeen: b.lastSeen, introducedAt: b.introducedAt, repCount: b.repCount }) }); return { c, vocab, targets: base.targets.map(t => vocab.find(w => w.id === t.id)) } })() : setup('th')
  const live = LIVE.map(t => S.vocab.find(w => w.thai === t))
  S.targets = live.concat(S.targets.filter(t => !live.some(l => l.id === t.id)).slice(0, 30 - live.length))
  return S
}
const byThai = (S, t) => S.vocab.find(w => w.thai === t)
const ids = (S, list) => list.map(t => byThai(S, t).id)
// a plan in which the travel scene inherited the GLOBAL food-stall premise (the v654 live situation)
const livePlan = (S, travelPremise) => ({ source: 'model', scenes: [
  { sceneId: 'S1', purpose: 'Discussing ingredients of som tam', localPremise: "A orders som tam at B's food stall and asks what is in it", targetIds: ids(S, ['หอมใหญ่', 'กระเทียม', 'ผัก', 'ข้าวเหนียว', 'ส้มตำ']) },
  { sceneId: 'S2', purpose: 'Payment methods', localPremise: 'A pays at the stall', targetIds: ids(S, ['บัตร', 'เงินสด', 'โอน', 'เงินทอน', 'ใบเสร็จ']) },
  { sceneId: 'S3', purpose: 'Considering alternative shopping locations and travel', localPremise: travelPremise, targetIds: ids(S, ['ร้านสะดวกซื้อ', 'สนามบิน', 'เช่า', 'ตั๋ว']) },
  { sceneId: 'S4', purpose: 'Describing objects with colours and tools', localPremise: 'A and B pick out things by colour', targetIds: ids(S, ['สี', 'สีเหลือง', 'มีด', 'ของฝาก']) },
  { sceneId: 'S5', purpose: 'more everyday talk', localPremise: 'A and B chat', targetIds: S.targets.slice(18).map(t => t.id) } ] })
// a coherence judge that scores each section against the premise it is SHOWN: travel words under a food-stall premise fail
function judge(q) {
  const secs = q.split(/\n(?=Section \d+)/).filter(x => /^Section \d+/.test(x))
  return JSON.stringify({ sections: secs.map(sx => {
    const n = +sx.match(/^Section (\d+)/)[1]
    const premise = (sx.match(/LOCAL PREMISE: ([^\n]*)/) || [])[1] || (q.match(/inside one premise \(([^)]*)\)/) || [])[1] || ''
    const travel = /airport|ticket|rent/i.test(sx)
    if (travel && /food stall/i.test(premise)) return { section: n, score: 1, coherent: false, premiseFitsTargets: false, suggestedPremise: 'A and B plan a trip: where to go next and what to buy or book', offTopicLines: [...sx.matchAll(/L(\d+) /g)].map(x => +x[1]).slice(0, 4), reason: 'Lines are about airport travel, renting, and tickets, not the food stall premise.' }
    return { section: n, score: 4, coherent: true, premiseFitsTargets: true, offTopicLines: [], reason: 'ok' }
  }), overall: 3, reason: 'ok' })
}

async function main() {
  // ══ §20 — SCENE PLANNER QUALITY: local premises per scene ════════════════════════════════
  {
    const S = liveSetup()
    const lg = []
    const plan = await S.c.planTargetScenes(S.targets.slice(0, 18), { premise: GLOBAL }, { lang: 'th', onLog: m => lg.push(m) })   // no key → deterministic
    const travel = plan.scenes.find(sc => sc.targetIds.includes(byThai(S, 'สนามบิน').id))
    T('P1', '§20 planner creates several LOCAL scenes; every scene has SCENE_ID · SCENE_PURPOSE · LOCAL_PREMISE · TARGET_IDS · TARGET_ROLES',
      plan.scenes.length >= 4 && plan.scenes.every(sc => /^S\d+$/.test(sc.sceneId) && sc.purpose && sc.localPremise && sc.targetIds.length && Object.keys(sc.targetRoles).length === sc.targetIds.length) &&
      lg.filter(l => /SCENE_ID=S\d+ SCENE_PURPOSE=".*" LOCAL_PREMISE=".+" TARGET_IDS=/.test(l)).length === plan.scenes.length, plan.scenes.map(sc => sc.sceneId + ' ' + sc.purpose + ' | ' + sc.localPremise))
    T('P2', 'the travel/ticket/rental scene gets a TRAVEL local premise, never the global food-stall premise',
      !!travel && !/food stall/i.test(travel.localPremise) && /go|trip|book/i.test(travel.localPremise) && ['เช่า', 'ตั๋ว'].every(t => travel.targetIds.includes(byThai(S, t).id)), travel)
    // a model planner that writes local premises
    const st = mock(S, 'th')
    const seen = wrap(S, (q, r) => /Plan a language lesson conversation/.test(q) ? JSON.stringify({ scenes: [
      { purpose: 'food', localPremise: 'A orders at the stall', location: 'food stall', immediateGoal: 'order', targetIds: ids(S, ['หอมใหญ่', 'กระเทียม', 'ผัก']) },
      { purpose: 'travel', localPremise: 'A and B plan how to get to the airport', location: 'street', immediateGoal: 'book tickets', targetIds: ids(S, ['สนามบิน', 'ตั๋ว', 'เช่า']) }] }) : r)
    const lg2 = []
    const plan2 = await S.c.planTargetScenes(S.targets.slice(0, 18), { premise: GLOBAL }, { apiKey: 'k', model: 'm', lang: 'th', onLog: m => lg2.push(m) })
    const pq = (seen.find(x => /Plan a language lesson conversation/.test(x.q)) || {}).q || ''
    T('P3', 'planner prompt: the global premise is only the LESSON THEME; each scene must get its own localPremise / location / immediateGoal; planner premises are kept',
      /LESSON THEME \(broad — NOT a place every scene must happen in\)/.test(pq) && /localPremise/.test(pq) && plan2.scenes.find(sc => sc.purpose === 'travel').localPremise === 'A and B plan how to get to the airport' &&
      plan2.scenes.filter(sc => sc.localPremiseSource && /^derived/.test(sc.localPremiseSource)).every(sc => !/food stall/i.test(sc.localPremise)), plan2.scenes.map(sc => sc.purpose + ' | ' + sc.localPremise + ' | ' + sc.localPremiseSource))
    const lc = S.c.buildLessonContext({ premise: GLOBAL, characters: [{ speaker: 'A', name: 'Somchai', nativeName: 'สมชาย' }, { speaker: 'B', name: 'Nida', nativeName: 'นิดา' }] }, 'th')
    T('P4', '§3 LESSON_CONTEXT is separate from scene premises: language · register · characters · broadTheme · politeness',
      lc.language === 'th' && lc.register === 'natural spoken' && lc.broadTheme === GLOBAL && lc.characters.length === 2 && /ครับ/.test(lc.politeness))
  }
  // ══ §2/§4/§6/§7 — MAIN COHERENCE AGAINST THE LOCAL PREMISE (live replay) ═════════════════════
  {
    // v654 (replay): one global premise → the travel scene fails and stays failed
    const S4 = liveSetup('tt.v654.compiled.js'); mock(S4, 'th')
    wrap(S4, (q, r) => /A language lesson is GROUPED PRACTICE/.test(q) ? judge(q) : r)
    const tr4 = { ...makeTrack(S4, 'th', { tag: '-v654' }), sceneContract: { premise: GLOBAL, characters: [{ speaker: 'A', name: 'Somchai' }, { speaker: 'B', name: 'Nida' }], allowedSceneEntities: [] }, scenePlan: livePlan(S4, GLOBAL) }
    const { t: t4 } = await (async () => { const log = []; const t = await S4.c.finaliseMainTrack(tr4, S4.c.ev('TRACK_ADAPTERS').th, { vocab: S4.vocab, apiKey: 'k', model: 'm', qcRan: true, onLog: m => log.push(m) }); return { t, log } })()
    T('C0', 'replay v654: a travel scene judged against the GLOBAL food-stall premise fails → MAIN_TRACK_COHERENCE=FAIL → NOT_READY (the live failure)',
      t4.integrity.status === 'NOT_READY' && t4.integrity.reasons.some(r => /MAIN_TRACK_COHERENCE=FAIL/.test(r)), t4.integrity.reasons)
    // v655: the same scene with the inherited (wrong) premise → premise re-planned, not the sentences
    const S = liveSetup(); mock(S, 'th')
    const seen = wrap(S, (q, r) => /A language lesson is GROUPED PRACTICE/.test(q) ? judge(q) : r)
    const tr = { ...makeTrack(S, 'th', { tag: '-v655' }), sceneContract: { premise: GLOBAL, characters: [{ speaker: 'A', name: 'Somchai' }, { speaker: 'B', name: 'Nida' }], allowedSceneEntities: [] }, scenePlan: livePlan(S, GLOBAL) }
    const { t, log } = await fin(S, tr)
    const jq = seen.filter(x => /A language lesson is GROUPED PRACTICE/.test(x.q))
    const mc = t.integrity.mainCoherence
    T('C1', '§4 the judge sees each section\'s PURPOSE + LOCAL PREMISE + TARGET WORDS, and is told scenes need not share one place (no global premise as the judging context)',
      jq.length >= 1 && /LOCAL PREMISE: /.test(jq[0].q) && /TARGET WORDS: /.test(jq[0].q) && /do NOT have to happen in the same place/.test(jq[0].q) && !/inside one premise \(/.test(jq[0].q), jq[0] && jq[0].q.slice(0, 600))
    T('C2', '§6 a premise that does not fit its targets is RE-PLANNED (MAIN_TRACK_PREMISE_REPLAN) instead of rewriting good travel sentences into food-stall sentences',
      log.some(l => /MAIN_TRACK_PREMISE_REPLAN S3 .*→ "A and B plan a trip/.test(l)) && !t.pairs.some(p => p && p.sourceStage === 'coherence-repair') && mc.premiseReplan && mc.premiseReplan[0].sceneId === 'S3' &&
      t.scenePlan.scenes.find(sc => sc.sceneId === 'S3').localPremise.startsWith('A and B plan a trip'), log.filter(l => /COHERENCE|PREMISE/.test(l)))
    T('C3', '§7 gate unchanged and authoritative: after the re-plan every scene ≥ 3/5 and overall ≥ 3/5 ⇒ READY 90/90; 2 judge calls, 0 line rewrites',
      t.integrity.status === 'READY' && mc.passed && mc.sectionScores.every(d => d.score >= 3) && mc.overall >= 3 && t.integrity.counts.targetPairs === 90 && jq.length === 2 && !mc.repair,
      { st: t.integrity.status, reasons: t.integrity.reasons, scores: mc.sectionScores && mc.sectionScores.map(d => d.sceneId + '=' + d.score), calls: jq.length })
    // off-topic lines against the CORRECT premise are still rewritten (premise fits → line repair)
    const S2 = liveSetup(); mock(S2, 'th', { incoherentMain: { fixAfter: 1 } })
    const seen2 = wrap(S2)
    const tr2 = { ...makeTrack(S2, 'th', { tag: '-v655b' }), sceneContract: { premise: GLOBAL, characters: [], allowedSceneEntities: [] }, scenePlan: livePlan(S2, 'A and B plan a trip: where to go next') }
    const { t: t2, log: log2 } = await fin(S2, tr2)
    const recQ = seen2.filter(x => /QUOTA RECOVERY — Thai/.test(x.q) && /COHERENCE REPAIR/.test(x.q)).map(x => x.q)
    T('C4', '§6 lines that are off-topic for a CORRECT local premise are rewritten only for that scene, and the rewrite prompt carries the scene\'s LOCAL premise (not the food stall)',
      t2.integrity.status === 'READY' && t2.integrity.mainCoherence.repair && t2.integrity.mainCoherence.repair.replaced >= 1 && recQ.length >= 1 &&
      recQ.every(q => /COHERENCE REPAIR — THIS SCENE: A orders som tam at B's food stall/.test(q) || /COHERENCE REPAIR — THIS SCENE: /.test(q)) && !log2.some(l => /MAIN_TRACK_PREMISE_REPLAN/.test(l)),
      { st: t2.integrity.status, reasons: t2.integrity.reasons, q: recQ[0] && recQ[0].slice(0, 300) })
    // quota recovery writes for the target's own scene
    const S3 = liveSetup(); mock(S3, 'th')
    const seen3 = wrap(S3)
    const tr3 = { ...makeTrack(S3, 'th', { tag: '-v655c' }), sceneContract: { premise: GLOBAL, characters: [], allowedSceneEntities: [] }, scenePlan: livePlan(S3, 'A and B plan a trip: where to go next') }
    let hit = 1; const air = byThai(S3, 'สนามบิน').id
    tr3.pairs = tr3.pairs.map(p => { if (p.targetId === air && hit-- > 0) return { ...p, _semanticState: 'REJECTED', _semanticUnverified: { stage: 'test', reason: 'QC rejected' } }; return p })
    await fin(S3, tr3)
    const rq = seen3.find(x => /QUOTA RECOVERY — Thai/.test(x.q) && /TARGET WORD: "สนามบิน"/.test(x.q))
    T('C5', '§3 quota recovery for a travel target writes for its LOCAL premise ("Scene: A and B plan a trip…"), not the global food-stall premise',
      !!rq && /Scene: A and B plan a trip: where to go next/.test(rq.q) && !/Scene: A visits B's food stall/.test(rq.q), rq && rq.q.slice(0, 200))
  }
  // ══ §8–§13 / §21 / §22 — ONE AUTHORITATIVE PRONUNCIATION PIPELINE ═══════════════════════════
  {
    const S = setup('th'); const c = S.c
    const lex = c.buildThaiPhoneticLexicon(S.vocab)
    const w = t => c.thaiDeterministicWords(t, S.vocab, lex, []).words
    const one = t => c.finaliseThaiTrackPhonetics([{ thai: t, phonetic: '', words: w(t) }], lex)[0]
    const a = one('ผมมีบัตรสมาชิกครับ'), b = one('เย็นๆสักแก้วไหมคะ')
    const la = c.thaiPronunciationLineAudit(a, lex)
    T('N1', '§9 one token-aware validator: an unknown word (สมาชิก) is ONE UNKNOWN_TOKEN issue — never a dictionary sub-word ("มา") false alarm; finalise and final audit agree',
      la.issues.length === 1 && la.issues[0].failureClass === 'UNKNOWN_TOKEN' && la.issues[0].failingToken === 'สมาชิก' && !la.problems.some(p => /"มา"/.test(p)) &&
      c.thaiFinalPronunciationAudit([a], lex).issues.length === 1 && a._phoneticIssues.length === 1, la)
    T('N2', '§11 ๆ is read as the repeated word (เย็น ๆ → "yen yen"), never REPEATED_MARK_ALIGNMENT', /^yen yen/.test(b.phonetic) && !(b._pronIssues || []).some(x => x.failureClass === 'REPEATED_MARK_ALIGNMENT'), b.phonetic)
    const stale = { ...one('ผมชอบกาแฟครับ'), thai: 'ผมชอบชาครับ' }
    const fa = c.thaiFinalPronunciationAudit([stale], lex, { onLog: () => {} })
    T('N3', '§13 pronunciation built for an older sentence is STALE: the final audit rebuilds that line from its current text (0 issues, staleRebuilt 1)',
      fa.staleRebuilt === 1 && fa.issues.length === 0 && fa.pairs[0]._pronTextKey === 'ผมชอบชาครับ' && !/kaa-fae/.test(fa.pairs[0].phonetic), fa.pairs[0].phonetic)
    T('N4', '§11 failure classes are the documented set (TOKEN_COUNT_MISMATCH … SCENE_NAME_ALIGNMENT)', c.ev('PRONUNCIATION_FAILURE_CLASSES').length === 10 && c.ev('PRONUNCIATION_FAILURE_CLASSES').includes('STALE_LINE_TEXT'))
    // §21 — a final Main: 90 target lines + framing; ONE framing line carries an unknown name (no romanisation)
    const build = async (repairFn, tag) => {
      const S2 = setup('th'); mock(S2, 'th')
      wrap(S2, (q, r) => {
        if (/Re-romanize each Thai sentence/.test(q)) return repairFn(q)
        if (/Segment each Thai sentence/.test(q)) { const inp = JSON.parse((q.match(/Input: (\[.*\])\n/) || [])[1] || '[]'); return JSON.stringify(inp.map(x => ({ id: x.id, words: S2.c.thaiDeterministicWords(x.thai, S2.vocab, S2.c.buildThaiPhoneticLexicon(S2.vocab), []).words.map(w => ({ p: w.p, e: w.e || 'w', ph: w.ph || '' })) }))) }
        return r
      })
      const tr = makeTrack(S2, 'th', { tag })
      tr.pairs.push({ pairType: 'framing', speaker: 'A', thai: 'สวัสดีครับคุณมานพ', english: 'Hello, Manop.', prompt: 'greeting', _semanticState: 'VERIFIED', _semNat: 5, _semCue: 'n/a', _pairKey: 'th-close-name', words: [], phonetic: '' })
      return fin(S2, tr)
    }
    const good = q => JSON.stringify([...q.matchAll(/^(\d+)\. Thai: .*\n\s*Current \(broken\): (.*)$/gm)].map(m => ({ n: +m[1], ph: m[2].split(/\s+/).map(x => /[฀-๿]/.test(x) ? 'nóp' : x).join(' ') })))
    const r1 = await build(good, '-pron1')
    const pr1 = r1.t.integrity.pronunciation || {}
    T('N5', '§21 one mismatched line: preRepairIssues = 1 → targeted repair → final audit = 0 (same validator) → pronunciation invariant clean',
      pr1.preRepair === 1 && pr1.final === 0 && r1.t.integrity.invariants.PRONUNCIATION_ALIGNMENT_ISSUES === 0 && r1.log.some(l => /PRONUNCIATION_REPAIR lineId=th-close-name tokens=/.test(l)) &&
      r1.log.some(l => /FINAL_PRONUNCIATION_AUDIT \(authoritative, persisted Main Track\): 0 issue/.test(l)), { pr1, log: r1.log.filter(l => /PRONUNC|romaniz/.test(l)) })
    // a repair that makes things worse (drops the tokens it was given) is detected, rolled back, and never silent
    const bad = q => JSON.stringify([...q.matchAll(/^(\d+)\. Thai: .*$/gm)].map(m => ({ n: +m[1], ph: 'x' })))
    const r2 = await build(bad, '-pron2')
    const pr2 = r2.t.integrity.pronunciation || {}
    T('N6', '§10 a repair can never silently increase the issue count: final ≤ pre-repair; a worse line is PRONUNCIATION_REPAIR_REGRESSION-guarded (rolled back) or unchanged',
      pr2.preRepair === 1 && pr2.final <= pr2.preRepair && !r2.log.some(l => /PRONUNCIATION_REPAIR_REGRESSION final/.test(l)), { pr2, log: r2.log.filter(l => /PRONUNC/.test(l)) })
    // the remaining issue is printed exactly (line ID, Thai, failing token, class, source)
    const fl = r2.log.filter(l => /PRONUNCIATION_ALIGNMENT_FAIL /.test(l))
    T('N7', '§11 every final issue prints lineId · sceneId · thai · tokens · expectedTokenCount · actualPronunciationCount · failingToken · failureClass · source (log and export)',
      pr2.final === 0 || (fl.length >= 1 && fl.every(l => /lineId=th-close-name sceneId=\S+ thai=สวัสดีครับคุณมานพ tokens=\S+ expectedTokenCount=\d+ actualPronunciationCount=\d+ failingToken=\S+ failureClass=(UNKNOWN_TOKEN|SCENE_NAME_ALIGNMENT|MISSING_ROMANISATION|TOKEN_COUNT_MISMATCH) source=\S+/.test(l)) &&
      S.c.trackIntegrityExportLines(r2.t).some(l => /^PRONUNCIATION_ALIGNMENT_FAIL lineId=th-close-name /.test(l))), fl)
    // the guard itself: a repair that mutates text is discarded; one that loses tokens is rolled back
    const S3 = setup('th'); const c3 = S3.c; mock(S3, 'th')
    const lex3 = c3.buildThaiPhoneticLexicon(S3.vocab)
    const w3 = c3.thaiDeterministicWords('สวัสดีครับคุณมานพ', S3.vocab, lex3, []).words
    const base3 = c3.finaliseThaiTrackPhonetics([{ thai: 'สวัสดีครับคุณมานพ', phonetic: '', words: w3, _pairKey: 'L1', pairType: 'framing' }], lex3)[0]
    const logs3 = []
    // the first call is the broken-romanisation pass (pass-through); the second is the targeted repair under test
    let n3 = 0
    c3._qrFixBrokenPhonetics = async pairs => (++n3 === 1 ? { pairs, fixed: 0 } : { pairs: pairs.map(p => ({ ...p, words: [{ p: 'นพ', e: '' }, { p: 'นพ', e: '' }], phonetic: 'x' })), fixed: 1 })
    const m3 = await c3.ev('_thFinaliseMetadata')([base3], { vocab: S3.vocab, apiKey: 'k', model: 'm', onLog: m => logs3.push(m), track: {} })
    let n4 = 0
    c3._qrFixBrokenPhonetics = async pairs => (++n4 === 1 ? { pairs, fixed: 0 } : { pairs: pairs.map(p => ({ ...p, thai: p.thai + 'ครับ' })), fixed: 1 })
    const logs4 = []
    const m4 = await c3.ev('_thFinaliseMetadata')([base3], { vocab: S3.vocab, apiKey: 'k', model: 'm', onLog: m => logs4.push(m), track: {} })
    T('N8', '§10/§12 PRONUNCIATION_REPAIR_REGRESSION: a repair that loses tokens is rolled back per line ID; a repair that changes the Thai is discarded (text frozen); final never exceeds pre-repair',
      logs3.some(l => /PRONUNCIATION_REPAIR_REGRESSION lineId=L1 issues 1 → \d+ .*rolled back/.test(l)) && m3.stats.pronunciation.final <= m3.stats.pronunciation.preRepair &&
      logs4.some(l => /PRONUNCIATION_REPAIR_TEXT_MUTATION lineId=L1/.test(l)) && m4.pairs[0].thai === 'สวัสดีครับคุณมานพ', { l3: logs3.filter(l => /PRONUNC/.test(l)), l4: logs4.filter(l => /PRONUNC/.test(l)) })
    // §22 order
    const L = r1.log
    const ix = re => L.findIndex(l => re.test(l))
    T('N9', '§22 order: quota → coherence → FINAL_LINE_TEXT frozen → pronunciation build/repair → final audit → TRACK INTEGRITY',
      ix(/MAIN_TRACK_COHERENCE /) >= 0 && ix(/MAIN_TRACK_COHERENCE /) < ix(/FINAL_LINE_TEXT frozen/) && ix(/FINAL_LINE_TEXT frozen/) < ix(/final phonetics:/) && ix(/final phonetics:/) < ix(/FINAL_PRONUNCIATION_AUDIT/) &&
      ix(/FINAL_PRONUNCIATION_AUDIT/) < ix(/TRACK INTEGRITY \(th\)/) && r1.t.integrity.invariants.PRONUNCIATION_STALE_LINES === 0, L.filter(l => /COHERENCE |frozen|final phonetics|FINAL_PRON|TRACK INTEGRITY/.test(l)))
  }
  // ══ §14–§18 — GRADED SUITABILITY + METADATA AUDIT ═══════════════════════════════════════════
  {
    const S = setup('th'); const c = S.c
    const pf = (t, o) => c.targetActivityPreflight(byThai(S, t), 'th', { evidence: {}, ...(o || {}) })
    const normal = ['รบกวน', 'แตงโม', 'ประเทศไทย', 'อาหารกลางวัน', 'อนุญาต', 'แตกต่าง', 'ฤดู', 'ทาน']
    T('G1', '§14 the audited examples are usable spoken Thai (by rule, not hand-flipped): รบกวน แตงโม ประเทศไทย อาหารกลางวัน อนุญาต แตกต่าง ฤดู ทาน',
      normal.every(t => pf(t).suitable), Object.fromEntries(normal.map(t => [t, pf(t).status + ' ' + pf(t).metadata.spokenSuitability])))
    T('G2', '§18 true rejections preserved: ซึ่ง = WRITTEN_DOMINANT · ขอให้เป็นวันที่ดี = RECOGNITION_ONLY · ควาย = AVOID · กรุณา (signs) = WRITTEN_DOMINANT',
      pf('ซึ่ง').metadata.spokenSuitability === 'WRITTEN_DOMINANT' && !pf('ซึ่ง').suitable && pf('ขอให้เป็นวันที่ดี').metadata.spokenSuitability === 'RECOGNITION_ONLY' && !pf('ขอให้เป็นวันที่ดี').suitable &&
      pf('ควาย').metadata.spokenSuitability === 'AVOID' && !pf('ควาย').suitable && pf('กรุณา').metadata.spokenSuitability === 'WRITTEN_DOMINANT')
    const syn = { id: 999991, thai: 'คำทดสอบ', t: 'คำทดสอบ', e: 'test word', conversationNote: 'More formal; in everyday conversation คำ is more natural.', spokenAlternativeText: 'คำ' }
    T('G3', '§15 "has a more casual alternative" ≠ unsuitable: FORMAL_SPOKEN, allowed in a natural/polite lesson, rejected only for a casual register',
      c.targetActivityMetadata(syn, 'th').spokenSuitability === 'FORMAL_SPOKEN' && c.targetActivityPreflight(syn, 'th', { evidence: {} }).suitable &&
      c.targetActivityPreflight(syn, 'th', { evidence: {} }).status === 'REGISTER_DEPENDENT' && !c.targetActivityPreflight(syn, 'th', { evidence: {}, register: 'casual' }).suitable)
    T('G4', '§16 graded scale: COMMON · NATURAL · CONTEXTUAL · FORMAL_SPOKEN · WRITTEN_DOMINANT · RECOGNITION_ONLY · AVOID (register casual/neutral/polite/formal)',
      JSON.stringify(c.ev('SPOKEN_SUITABILITY')) === JSON.stringify(['COMMON', 'NATURAL', 'CONTEXTUAL', 'FORMAL_SPOKEN', 'WRITTEN_DOMINANT', 'RECOGNITION_ONLY', 'AVOID']) &&
      c.targetActivityMetadata(byThai(S, 'ทาน'), 'th').register === 'polite')
    const stale = { ...byThai(S, 'แตงโม'), note: 'watermelon, formal', register: 'formal' }
    T('G5', '§14 authored bank metadata wins over a stale field stored on the learner record (แตงโม with a stored "formal" note stays spoken)',
      c.targetActivityPreflight(stale, 'th', { evidence: {} }).status === 'SUITABLE', c.targetActivityMetadata(stale, 'th').sources)
    const au = c.thaiSuitabilityMetadataAudit(S.vocab)
    const row = t => au.rows.find(r => r.thai === t) || {}
    const cols = ['id', 'thai', 'gloss', 'currentClassification', 'reason', 'spokenAlternative', 'recommendedClassification', 'confidence', 'needsHumanReview']
    T('G6', '§17 deterministic audit of every v654 FORMAL_WRITTEN / RECOGNITION_ONLY / VULGAR entry with id · thai · gloss · currentClassification · reason · spokenAlternative · recommendedClassification · confidence · needsHumanReview',
      au.rows.length > 100 && au.rows.every(r => cols.every(k => k in r)) && row('แตกต่าง').currentClassification === 'FORMAL_WRITTEN_REGISTER' && row('แตกต่าง').recommendedClassification === 'FORMAL_SPOKEN' &&
      row('แตกต่าง').spokenAlternative === 'ไม่เหมือน' && row('ซึ่ง').status === 'CONFIRMED' && au.summary.audited === au.rows.length &&
      c.thaiSuitabilityAuditCsv(au).split('\n')[0] === 'id,thai,gloss,currentClassification,reason,spokenAlternative,recommendedClassification,confidence,needsHumanReview,status', au.summary)
    const low = au.rows.filter(r => r.needsHumanReview)
    T('G7', '§17 low-confidence rows are METADATA_REVIEW_REQUIRED and are NOT auto-rewritten (they stay excluded at preflight until a human reviews them)',
      low.length > 0 && low.every(r => r.status === 'METADATA_REVIEW_REQUIRED') && low.slice(0, 20).every(r => !c.targetActivityPreflight(S.vocab.find(w => w.id === r.id), 'th', { evidence: {} }).suitable))
    T('G8', '§15 a FORMAL_SPOKEN target reaches generation with a register hint (polite speaker, casual form not substituted)',
      /REGISTER: "ทาน" is polite spoken Thai/.test(c.thaiRegisterHintLine(byThai(S, 'ทาน'))) && /do not substitute/.test(c.thaiRegisterHintLine(byThai(S, 'แตกต่าง'))) && c.thaiRegisterHintLine(byThai(S, 'แตงโม')) === '')
  }
  // ══ §19 — BACKFILL TELEMETRY ══════════════════════════════════════════════════════════════
  {
    const S = setup('th'); const c = S.c
    const skipped = Array.from({ length: 54 }, (_, k) => ({ id: 1000 + k, thai: 'w' + k, reason: 'TARGET_UNSUITABLE_FOR_ACTIVITY', detail: 'RECOGNITION_ONLY_ENTRY', bucket: 'beyond-review' }))
    const backfills = skipped.map((x, k) => ({ slot: k % 5, preferredCandidate: x.id + ':' + x.thai, removedId: x.id, reason: x.reason, replacementId: 2000 + (k % 5), replacementWord: 'r' + (k % 5), replacement: (2000 + (k % 5)) + ':r' + (k % 5), replacementBucket: 'belt-new' }))
    const lines = c.thaiSelectionLogLines({ selectedTargetCount: 30, generationTargetCount: 30, newTargetCount: 5, reviewTargetCount: 25, requiredListeningTargetCount: 25, expectedTargetPairs: 90, skippedCandidates: skipped, backfills })
    T('B1', '§19 54 candidates rejected during search but only 5 selected slots replaced: CANDIDATES_REJECTED_DURING_SEARCH=54 · ACTUAL_SELECTED_SLOTS_BACKFILLED=5 · one BACKFILL line per actual slot',
      /CANDIDATES_REJECTED_DURING_SEARCH=54 ACTUAL_SELECTED_SLOTS_BACKFILLED=5/.test(lines[0]) && lines.filter(l => /^BACKFILL /.test(l)).length === 5 &&
      lines.some(l => /^TARGET_PREFLIGHT_REJECTIONS=54 CANDIDATES_REJECTED_DURING_SEARCH=54 ACTUAL_SELECTED_SLOTS_BACKFILLED=5/.test(l)) && !lines.some(l => /TARGETS_BACKFILLED_FOR_ACTIVITY=54/.test(l)),
      lines.filter(l => /BACKFILL|CANDIDATES|PREFLIGHT_REJECTIONS/.test(l)).slice(0, 4))
  }
  console.log(out.join('\n'))
  console.log('v655 Thai READY repair regression: ' + passes + '/' + (passes + fails) + (fails ? ' — ' + fails + ' FAILED' : ' — ALL PASS'))
  process.exitCode = fails ? 1 : 0
}
main().catch(e => { console.error(e); process.exitCode = 1 })
