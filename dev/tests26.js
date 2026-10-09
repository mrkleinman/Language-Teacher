// v663 — LISTENING ATOMIC REPAIR (spec "v661 Listening Atomic Repair"): fix ONE issue at the smallest unit, preserve
// 30/30, never rewrite whole scenes. TH / JA / ZH through the real pipeline (scene composer → atomic queue → gates);
// the model is simulated at the Gemini boundary (tests14 responder). Defects are injected into the scene replies.
//   §26 closed vocab, one line   §27 naturalness, one exchange   §28 patch loses a target   §29 coherence line
//   §30 independent batch        §10/§24/§25 no broad rounds, logs, cost   §14–§16 planner plausibility
const { setup, mock } = require('./tests14')
const out = []; let fails = 0, n = 0
const T = (lang, id, name, pass, detail) => { n++; if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + lang.toUpperCase() + ' ' + id.padEnd(4) + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 900) : '')) }
const LANGS = process.argv[2] ? process.argv[2].split(',') : ['th', 'ja', 'zh']
const KEY = 'AIzaSyTEST-harness-key-000000'
const FORBIDDEN = { th: 'จักรวาล', ja: '宇宙', zh: '宇宙' }      // not in the learner's bank (checked: listeningUnexposedWords flags it)
const surfOf = (lang, w) => lang === 'th' ? w.thai : lang === 'ja' ? w.japanese : w.chinese
function learner(lang) {
  const S = setup(lang)
  const ids = new Set(S.targets.map(t => t.id))
  S.vocab.forEach(w => { if (ids.has(w.id)) { w.dueDate = '2026-01-01'; w.difficulty = 'hard' } else { w.dueDate = '2099-01-01'; if (w.difficulty === 'hard') w.difficulty = 'medium' } })
  return S
}
const addWord = (lang, text, w) => lang === 'th' ? text.replace(/(ครับ|ค่ะ|คะ)?$/, m => w + m) : text.replace(/([。？！])?$/, m => w + m)
// run the standalone builder; `inject(sceneId, json)` may edit a scene reply; the texts of the scenes as written are recorded
async function run(S, lang, ln, opt = {}) {
  const st = mock(S, lang, { ln, ...(opt.mockOpt || {}) })
  const inner = S._mockFn; st.prompts = []; st.sceneTexts = []
  const la = S.c.listeningAdapterFor(lang)
  S.c.mockGeminiGenerate = async (k, m, msgs, max, o) => {
    const q = msgs[msgs.length - 1].content; st.prompts.push(q)
    let r = await inner(k, m, msgs, max, o)
    const sm = q.match(/^Write SCENE (LS\d+) /)
    if (sm) { const j = JSON.parse(r); if (opt.inject) opt.inject(sm[1], j); r = JSON.stringify(j)
      j.turns.forEach((t, i) => st.sceneTexts.push(la.text(la.makeLine({ text: t.text, english: t.english }, t.speaker || (i % 2 ? 'B' : 'A'))))) }
    if (opt.post) r = opt.post(q, r)
    return r
  }
  const logs = []
  const r = await S.c.buildStandaloneListeningTrack({ lang, vocab: S.vocab, apiKey: KEY, model: 'gemini-2.5-flash-lite', onLog: m => logs.push(m), attemptId: opt.attemptId || 'lattempt-atomic' })
  const lines = r.track.listening ? r.track.listening.lines.map(l => l.thai) : []
  return { ...r, st, logs, L: logs.join('\n'), lines }
}
const changed = (a, b) => a.map((x, i) => x !== b[i] ? i + 1 : null).filter(Boolean)

;(async () => {
  for (const lang of LANGS) {
    const F = FORBIDDEN[lang]
    // ══ healthy: no atomic calls, no broad rounds ══
    {
      const S = learner(lang)
      const r = await run(S, lang, {})
      T(lang, 'H1', '§10 no "repair round across all scenes" exists any more; a healthy track makes 0 atomic repair calls · READY',
        !/LISTENING_REPAIR round=/.test(r.L) && !/REPAIR SCENE/.test(r.st.prompts.join('\n')) && !r.st.lnAtomic && r.track.status === 'READY', { atomic: r.st.lnAtomic, status: r.track.status })
    }

    // ══ §26 — CLOSED_VOCAB on one line that carries TWO protected targets ══
    {
      const S = learner(lang)
      let target = null
      const r = await run(S, lang, {}, { inject: (sid, j) => { if (sid !== 'LS2' || j.turns.length < 2) return
        // the same speaker's next line (turn 3) is folded into turn 1: one line, TWO protected targets, one forbidden word
        if (!j.turns[2]) return
        j.turns[0].text = addWord(lang, j.turns[0].text.replace(/(ครับ|ค่ะ|คะ)$/, '') + (lang === 'th' ? ' ' : '') + j.turns[2].text, F); target = j.turns[0].text } })
      const pre = r.st.sceneTexts.slice()
      const at = pre.findIndex(t => t.includes(F)) + 1
      const diff = changed(pre, r.lines)
      const line = r.lines[at - 1] || ''
      const prot = (r.L.match(new RegExp('LISTENING_ATOMIC_REPAIR issue=CLOSED_VOCAB scene=LS2 line=L' + at + ' (?:forbidden|unknown)=\\[[^\\]]*\\](?: palette=\\d+)? protected=\\[([^\\]]*)\\]')) || [])[1] || ''
      T(lang, 'V1', '§26 closed vocab: ONLY line L' + at + ' is rewritten (unknown "' + F + '" gone — v668 positive palette, no forbidden list — BOTH protected targets kept); every other line byte-for-byte unchanged',
        at > 0 && prot.split(', ').filter(Boolean).length === 2 && new RegExp('PATCH_ACCEPTED issue=i\\d+ line=L' + at).test(r.L) && !line.includes(F) &&
        prot.split(', ').every(x => line.includes(x)) && diff.length === 1 && diff[0] === at && pre.length === r.lines.length && r.track.coverage.covered === 30,
        { at, prot, diff, line, cov: r.track.coverage.covered })
    }

    // ══ §27 — one UNNATURAL line: only that line (or its exchange) changes ══
    {
      const S = learner(lang)
      const victim = S.targets[13]
      const vs = surfOf(lang, victim)
      let rejectText = null
      const r = await run(S, lang, {}, { mockOpt: { reject: ['__none__'] },
        inject: (sid, j) => { const t = j.turns.find(x => x.text.includes(vs)); if (t && !rejectText) rejectText = t.text } })
      // re-run with that exact line judged unnatural
      const S2 = learner(lang)
      const r2 = await run(S2, lang, {}, { mockOpt: { reject: [rejectText] } })
      const pre = r2.st.sceneTexts.slice()
      const at = pre.findIndex(t => t === r.st.sceneTexts.find(x => x === rejectText)) + 1
      const diff = changed(pre, r2.lines)
      T(lang, 'N1', '§27 naturalness: the unnatural line L' + at + ' (or at most its A/B partner) changes — no other line changes, ' + vs + ' still heard',
        at > 0 && diff.length >= 1 && diff.length <= 2 && diff.includes(at) && diff.every(k => Math.abs(k - at) <= 1) && new RegExp('LISTENING_ATOMIC_REPAIR issue=UNNATURAL .* line=L' + at).test(r2.L) &&
        r2.track.coverage.covered === 30, { at, diff })
    }

    // ══ §28 — a patch that fixes the vocabulary but REMOVES a protected target is rejected ══
    {
      const S = learner(lang)
      const r = await run(S, lang, { atomicDropProtected: 1 }, { inject: (sid, j) => { if (sid === 'LS3' && j.turns[1]) j.turns[1].text = addWord(lang, j.turns[1].text, F) } })
      const at = r.st.sceneTexts.findIndex(t => t.includes(F)) + 1
      const rej = r.logs.findIndex(l => new RegExp('PATCH_REJECTED issue=i\\d+ line=L' + at + ' reason=PROTECTED_TARGET_LOST').test(l))
      T(lang, 'P1', '§28 patch loses a protected target → PATCH_REJECTED reason=PROTECTED_TARGET_LOST, the original line stays, coverage never drops (30/30), the next attempt is validated again',
        at > 0 && rej >= 0 && r.track.coverage.covered === 30 && !r.logs.slice(0, rej).concat(r.logs.slice(rej)).some(l => /LISTENING_COVERAGE_INVARIANT_BROKEN/.test(l)), { at, rej, cov: r.track.coverage.covered })
    }

    // ══ §29 — one line creates an absurd market price → the coherence validator names THAT line → atomic patch ══
    {
      const S = learner(lang)
      let injected = false
      const r = await run(S, lang, {}, { inject: (sid, j) => { if (sid === 'LS2' && j.turns.length >= 3 && !injected) { injected = true
        j.turns[0].english = 'Shall we buy rice at the market?'; j.turns[2].english = 'The rice at this market stall costs one million baht.' } } })
      // v669 §20/§21: the deterministic coherence break names its line at the scene PREFLIGHT (before LS2 commits); the
      // later scene-level verdict path (LISTENING_COHERENCE_AUTHORITY) still names exact lines when the model judge flags one
      const flagged = (r.L.match(/LISTENING_COHERENCE_AUTHORITY .* exact lines: (L\d+)/) || [])[1] ||
        (/SCENE_PREFLIGHT LS2 .*coherence="implausible everyday price/.test(r.L) && (r.L.match(/LISTENING_ATOMIC_REPAIR issue=COHERENCE_LINE scene=LS2 line=(L\d+)/) || [])[1])
      T(lang, 'C1', '§29 the coherence validator identifies the EXACT line (v669: the deterministic check at the scene preflight, before commit) → an atomic COHERENCE_LINE patch for that line → scene re-checked (COMMIT after repair) → coherence PASS · no whole-scene rewrite',
        injected && !!flagged && new RegExp('LISTENING_ATOMIC_REPAIR issue=COHERENCE_LINE scene=LS2 line=' + flagged).test(r.L) && /LISTENING_COHERENCE PASS/.test(r.L) &&
        new RegExp('PATCH_ACCEPTED issue=i\\d+ line=' + flagged).test(r.L) &&
        !/REPAIR SCENE/.test(r.st.prompts.join('\n')) && r.track.coverage.covered === 30, { flagged, coh: (r.L.match(/LISTENING_COHERENCE \S+/) || [])[0], status: r.track.status })
    }

    // ══ §30 — independent issues in ONE scene → ONE paid call at generation time; one patch is bad ══
    // v665: closed vocabulary is now enforced when a scene is generated (§20), so the batch is per scene: two unrelated
    // lines of LS3 (turns 1 and 5 — their scopes never touch) go out together as [i1][i2]
    {
      const S = learner(lang)
      const r = await run(S, lang, { atomicBadIssue: 'i2' }, { inject: (sid, j) => { if (sid === 'LS3' && j.turns[5]) { j.turns[1].text = addWord(lang, j.turns[1].text, F); j.turns[5].text = addWord(lang, j.turns[5].text, F) } } })
      const first = r.st.prompts.find(q => /ATOMIC REPAIR/.test(q)) || ''
      const ids = [...first.matchAll(/^\[(i\d+)\] CLOSED_VOCAB/gm)].map(m => m[1])
      const firstBatch = r.logs.slice(r.logs.findIndex(l => /LISTENING_ATOMIC_REPAIR issue=/.test(l)))
      const res = id => firstBatch.find(l => new RegExp('PATCH_(ACCEPTED|REJECTED) issue=' + id + ' ').test(l)) || ''
      const genFail = r.logs.filter(l => /CLOSED_VOCAB_FAIL scene=LS3 .*\(as generated\)/.test(l)).length
      const iAtomic = r.logs.findIndex(l => /LISTENING_ATOMIC_REPAIR issue=CLOSED_VOCAB scene=LS3/.test(l)), iLS4 = r.logs.findIndex(l => /LISTENING_COMPOSITION scene LS4/.test(l))
      T(lang, 'B1', '§20/§30 two unrelated CLOSED_VOCAB lines in one scene → CLOSED_VOCAB_FAIL logged as generated → ONE call [i1][i2] BEFORE the next scene is written → i1 accepted, i2 (bad patch) rejected — the good patch is NOT rolled back',
        genFail === 2 && ids.join() === 'i1,i2' && iAtomic >= 0 && iLS4 > iAtomic && /ACCEPTED/.test(res('i1')) && /REJECTED .*(CLOSED_VOCAB|REGRESSION|NOT_IMPROVED)/.test(res('i2')) && r.track.coverage.covered === 30,
        { genFail, ids, iAtomic, iLS4, i1: res('i1').slice(0, 80), i2: res('i2').slice(0, 120) })
      const cost = r.track.telemetry
      T(lang, 'K1', '§25 cost: 2 issues → ≤ 2 atomic calls (one batch + one retry of the rejected issue) · repair calls ≪ 21 · telemetry ATOMIC accepted/rejected recorded (cumulative over stages)',
        cost.LISTENING_ATOMIC_REPAIR_CALLS <= 2 && cost.LISTENING_REPAIR_CALLS <= 2 && cost.LISTENING_ATOMIC_PATCHES_ACCEPTED >= 1 && cost.LISTENING_ATOMIC_PATCHES_REJECTED >= 1, cost)
    }

    // ══ §25/§33 — a live-like mix (the 2026-10-06 run: unknown words on 5 lines, 3 unnatural lines, an absurd price) ══
    {
      const S = learner(lang)
      const rej = []
      const r0 = await run(learner(lang), lang, {})
      const sc = r0.st.sceneTexts
      ;[4, 12, 20].forEach(k => rej.push(sc[k]))
      const r = await run(S, lang, {}, { mockOpt: { reject: rej }, inject: (sid, j) => {
        const k = +sid.slice(2)
        if (j.turns[1]) j.turns[1].text = addWord(lang, j.turns[1].text, F)
        if (sid === 'LS2' && j.turns.length >= 3) { j.turns[0].english = 'Shall we buy rice at the market?'; j.turns[2].english = 'The rice at this market stall costs one million baht.' } } })
      const t = r.track.telemetry
      if (process.env.TT_DEBUG) console.log('K2', lang, JSON.stringify({ repair: t.LISTENING_REPAIR_CALLS, atomic: t.LISTENING_ATOMIC_REPAIR_CALLS, acc: t.LISTENING_ATOMIC_PATCHES_ACCEPTED, rej: t.LISTENING_ATOMIC_PATCHES_REJECTED, qc: t.LISTENING_QC_CALLS, paid: t.LISTENING_TOTAL_PAID_CALLS }))
      // v669 §17: a scene whose unknown word cannot be repaired is RE-PLANNED (one generation + its repairs) instead of being
      // committed with the defect, so the bound is ≤ 14 (v668 committed the defective LS3 and stayed ≤ 8; live v668: 21)
      T(lang, 'K2', '§33 live-like mix (5 unknown-word lines + 3 unnatural lines + 1 absurd price): repair logs are ATOMIC_REPAIR line=Lx only (v665: unknown words fixed scene by scene at generation), repair calls ≤ 14 (v669 re-plan instead of a defective commit; live: 21), 30/30 kept · READY',
        t.LISTENING_REPAIR_CALLS <= 14 && t.LISTENING_SCENES_COMMITTED_WITH_DEFECTS === 0 && !/REPAIR SCENE|LISTENING_REPAIR round=/.test(r.st.prompts.join('\n') + r.L) && r.track.coverage.covered === 30 && r.track.status === 'READY',
        { repair: t.LISTENING_REPAIR_CALLS, atomic: t.LISTENING_ATOMIC_REPAIR_CALLS, acc: t.LISTENING_ATOMIC_PATCHES_ACCEPTED, rej: t.LISTENING_ATOMIC_PATCHES_REJECTED, paid: t.LISTENING_TOTAL_PAID_CALLS, status: r.track.status, failed: r.track.failedChecks })
    }

    // ══ §22 — an issue that cannot be fixed: 2 paid attempts, then EXHAUSTED; the rest stays intact ══
    {
      const S = learner(lang)
      const r = await run(S, lang, { atomicNoop: true }, { inject: (sid, j) => { if (sid === 'LS4' && j.turns[0]) j.turns[0].text = addWord(lang, j.turns[0].text, F) } })
      const at = r.st.sceneTexts.findIndex(t => t.includes(F)) + 1
      const tries = r.logs.filter(l => new RegExp('LISTENING_ATOMIC_REPAIR issue=CLOSED_VOCAB .* line=L' + at + ' ').test(l)).length
      const diff = changed(r.st.sceneTexts, r.lines)
      // v664/v665: the model handing back the SAME line ends that issue after ONE call — at generation time — and the
      // later stages do not pay for it again (attempts are shared). v665 §18: an unknown word is a HARD gate → NOT_READY
      // v669 §17: the unfixable line is never committed — LS4's candidate (and its re-planned candidate, which repeats the
      // unknown word) stays UNCOMMITTED; nothing else is rewritten; the track is NOT_READY with SCENES_VALIDATED failed
      const unc = (r.track.listening && r.track.listening.uncommittedScenes) || []
      T(lang, 'X1', '§22/§23 unfixable issue: model returns the line unchanged → NO_CHANGE ends that line\'s repair after 1 call (no retry) → EXHAUSTED → (v669) LS4 never committed (UNCOMMITTED_SCENE, closedVocab residual), the unknown word is NOT in the track, every committed line is a generated line unchanged · (v671) its cluster gets ONE replacement scene, or (v673) the phase is regenerated / replanned once / its defective exchange trimmed with the target explicitly UNPLACED: READY only if every target validates, else NOT_READY',
        // v674: each remaining-plan rebuild (≤ 3) regenerates the phase — a NEW candidate whose line gets its own ≤ 2 tries
        tries >= 1 && tries <= 2 * (1 + 3) && /reason=NO_CHANGE .*no retry/.test(r.L) && new RegExp('LISTENING_ATOMIC_REPAIR_EXHAUSTED line=L' + at).test(r.L) &&
        // v673 §3: …or the phase transaction handles it — regenerated from its plan, ONE global replan, then the defective
        // exchange TRIMMED (its target explicitly UNPLACED); the unknown word never enters the track either way
        ((/SCENE_NOT_COMMITTED LS4 INVALID_CANDIDATE residual=.*closedVocab/.test(r.L) && unc.some(u => u.sceneId === 'LS4')) || /PHASE_TRIMMED LS4 |PHASE_NOT_COMMITTED LS4 |LISTENING_GLOBAL_REPLAN after LS4 /.test(r.L)) && !r.lines.some(t => t.includes(F)) &&
        r.lines.every(t => r.st.sceneTexts.includes(t)) && !r.track.failedChecks.includes('CLOSED_VOCAB=FAIL') &&
        // v671 §B2/§B5: the uncommitted scene's CLUSTER is preserved in a replacement scene (SCENE_CLUSTER_REPLACEMENT) —
        // READY only when that replacement validates and every target is heard (SCENE_REALLOCATED); otherwise NOT_READY
        (r.track.status === 'READY' ? /SCENE_CLUSTER_REPLACEMENT LS4 → /.test(r.L) && /SCENE_REALLOCATED LS4/.test(r.L) && r.track.coverage.covered === 30
                                    : r.track.failedChecks.includes('SCENES_VALIDATED=FAIL') || (r.track.failedChecks.some(x => /COVERAGE/.test(x)) && r.track.coverage.missing.every(id => new RegExp('LISTENING_TARGET_UNPLACED ' + id + ' ').test(r.L)))),
        { tries, failed: r.track.failedChecks, unc: unc.map(u => u.sceneId + ':' + u.residual) })
    }
  }

  // ══ §14–§16 — the planner writes HUMAN situations and keeps big amounts out of cheap food scenes ══
  {
    const S = setup('th'); const c = S.c
    const mk = (id, surface, role, domain, gloss) => ({ id, surface, role, domain: domain || 'general conversation', gloss: gloss || surface })
    const syn = [mk(1627, 'หมื่น', 'NUMBER', 'numbers & prices', 'ten thousand'), mk(1628, 'แสน', 'NUMBER', 'numbers & prices', 'hundred thousand'), mk(1629, 'ล้าน', 'NUMBER', 'numbers & prices', 'million'),
      mk(1, 'ข้าวเหนียว', 'CONTENT', 'food & cooking'), mk(2, 'ผัก', 'CONTENT', 'food & cooking'), mk(3, 'หอมใหญ่', 'CONTENT', 'food & cooking'), mk(4, 'กระเทียม', 'CONTENT', 'food & cooking'), mk(5, 'ส้มตำ', 'CONTENT', 'food & cooking'),
      mk(6, 'มีด', 'CONTENT', 'colours & things'), mk(7, 'ชาม', 'CONTENT', 'colours & things'), mk(8, 'ถอด', 'ACTION', 'household actions'), mk(9, 'ทำความสะอาด', 'ACTION', 'household actions'),
      mk(10, 'ลดราคา', 'CONTENT', 'shopping & payment'), mk(11, 'โอน', 'CONTENT', 'shopping & payment'), mk(12, 'บัตร', 'CONTENT', 'shopping & payment'), mk(13, 'เงินสด', 'CONTENT', 'shopping & payment'), mk(14, 'ใบเสร็จ', 'CONTENT', 'shopping & payment'),
      mk(15, 'เท่านั้น', 'CONTENT', 'discourse & logic'), mk(16, 'หมายถึง', 'CONTENT', 'discourse & logic'), mk(17, 'นอกจาก', 'CONNECTOR', 'discourse & logic'), mk(18, 'อธิบาย', 'CONTENT', 'discourse & logic'),
      mk(19, 'สาย', 'TIME', 'plans & schedule'), mk(20, 'คง', 'CONTENT', 'plans & schedule'), mk(21, 'ตกลง', 'RESPONSE_TOKEN'), mk(22, 'รู้สึก', 'CONTENT', 'feelings'), mk(23, 'พยายาม', 'ACTION'),
      mk(24, 'นักท่องเที่ยว', 'CONTENT', 'places & travel'), mk(25, 'น่าดู', 'DESCRIPTION'), mk(26, 'ตรงนี้', 'PLACE', 'places & travel'), mk(27, 'ทานกันเลย', 'CONTENT', 'food & cooking')]
    const p = c.planListeningCoverage(syn, { seed: 'live-2026-10-06', turnsMax: 44 })
    const sceneOf = id => p.scenes.find(s => s.requiredTargetIds.includes(id))
    const big = sceneOf(1628)
    const bigDomains = big.requiredTargetIds.map(id => syn.find(t => t.id === id).domain)
    T('all', 'L1', '§14 big amounts (หมื่น แสน ล้าน) share ONE scene with a high-value situation (apartment / car / salary) and NO food words',
      sceneOf(1627) === big && sceneOf(1629) === big && /apartment|car|salary/.test(big.purpose) && !bigDomains.includes('food & cooking'), { purpose: big.purpose, domains: bigDomains })
    T('all', 'L2', '§15 every scene purpose is a human situation — never a metadata bucket like "discourse & logic and colours & things"',
      p.scenes.every(s => !/&/.test(s.purpose) && /A and B|A is|They meet/.test(s.purpose)), p.scenes.map(s => s.purpose))
    T('all', 'L3', '§16 every planned scene is checked plausible BEFORE writing (compatible concrete domains only) and the plan still allocates all 30',
      p.valid && p.warnings.length === 0 && p.scenes.every(s => s.plausible) && p.assignments.length === 30, { warnings: p.warnings })
    T('all', 'L4', 'discourse words (เท่านั้น หมายถึง นอกจาก อธิบาย) are spread as flexible words, not bundled into their own "discourse" scene',
      new Set([15, 16, 17, 18].map(id => sceneOf(id).sceneId)).size >= 2, [15, 16, 17, 18].map(id => sceneOf(id).sceneId))
  }
  console.log(out.join('\n'))
  console.log(fails ? fails + ' FAILED of ' + n : 'all passed (' + n + ' checks)')
  process.exit(fails ? 1 : 0)
})().catch(e => { console.log(out.join('\n')); console.log('CRASH', e.stack); process.exit(1) })
