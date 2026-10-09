// v656 — LISTENING REBUILD: Listening is a FRESH conversation that must use ALL 30 selected targets.
// §28 regression fixture (TH / JA / ZH) and §29 failure tests A–H, plus the Main-READY gate, the
// merged-speaker validator and the call-count telemetry. The app's real functions run in the node
// harness; Gemini is simulated at the transport boundary (tests14 mock, opt.ln shapes the composer).
// Usage: node tests21.js
const { load } = require('./harness')
const { setup, makeTrack, mock } = require('./tests14')
const React = require('react'), TR = require('react-test-renderer')
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const out = []; let passes = 0, fails = 0
const T = (id, name, pass, detail) => { pass ? passes++ : fails++; out.push((pass ? 'PASS ' : 'FAIL ') + id.padEnd(6) + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 1200) : '')) }
const ADAPTER = (S, lang) => S.c.ev('TRACK_ADAPTERS')[lang]
const fin = async (S, lang, track) => S.c.finaliseMainTrack(track, ADAPTER(S, lang), { vocab: S.vocab, apiKey: 'k', model: 'gemini-2.5-flash-lite', qcRan: true, onLog: () => {} })
const planOf = S => ({ source: 'model', scenes: [0, 1, 2].map(k => ({ sceneId: 'S' + (k + 1), purpose: ['planning the day', 'at the market', 'back at home'][k], targetIds: S.targets.slice(k * 10, k * 10 + 10).map(t => t.id) })) })
const NEW_COUNT = { th: 5, ja: 3, zh: 3 }
const wrap = (S, fn) => { const base = S._mockFn; const seen = []; S.c.mockGeminiGenerate = S._mockFn = async (k, m, msgs, max, o) => { const q = msgs[msgs.length - 1].content; seen.push({ q, stage: o && o.stage }); const r = await base(k, m, msgs, max, o); return fn ? fn(q, r, o) : r }; return seen }
const textOf = (lang, l) => lang === 'th' ? l.thai : lang === 'ja' ? l.japanese : l.chinese
// v668 §53/§74 — the whole-conversation composer is retired: one closed-world scene call per planned scene, and
// repairs are atomic (positive palette) or scene-local. The v656 contract (all 30 targets, every gate) is unchanged.
const isCompose = q => /Write SCENE LS\d+ .* LISTENING conversation/.test(q)
const isRepair = q => /ATOMIC REPAIR of .* LISTENING lines|REPAIR SCENE \S+ of a .* LISTENING conversation/.test(q)

async function build(lang, o = {}) {
  const S = setup(lang); mock(S, lang, o.mock || {})
  const newIds = S.targets.slice(0, NEW_COUNT[lang]).map(t => t.id)
  const t = await fin(S, lang, { ...makeTrack(S, lang, { tag: '-v656' + (o.tag || ''), newIds }), scenePlan: planOf(S),
    sceneContract: { premise: 'two friends spend a day in town', characters: [{ speaker: 'A', name: 'Ken', role: 'friend' }, { speaker: 'B', name: 'Aya', role: 'friend' }], allowedSceneEntities: [] } })
  const seen = wrap(S, o.post || null)
  const lg = []
  const r = await S.c.buildAndPersistListening(t, S.vocab, { lang, apiKey: 'k', model: 'gemini-2.5-flash-lite', onLog: m => lg.push(m) })
  return { S, t, r, lt: r.listeningTrack || {}, b: r.listeningBuild || {}, lg, seen, newIds }
}
// v673 §3 — a defective candidate is never committed AS WRITTEN: regenerated from its frozen plan, re-planned ONCE
// globally, or its defective exchange TRIMMED deterministically (targets that leave are explicitly UNPLACED)
// (buildAndPersistListening forwards only its summary lines to onLog — the transaction telemetry is the evidence there)
const v673Tel = x => { const t = (x.lt && x.lt.telemetry) || {}; return (t.LISTENING_SCENE_REGENERATIONS || 0) + (t.LISTENING_GLOBAL_REPLANS || 0) + (t.LISTENING_SCENES_TRIMMED || 0) + (t.LISTENING_UNCOMMITTED_SCENES || 0) > 0 }
const v673Handled = (x, sid) => v673Tel(x) || new RegExp('PHASE_REGENERATE ' + (sid || 'LS\\d+') + ' |LISTENING_GLOBAL_REPLAN after ' + (sid || 'LS\\d+') + ' |PHASE_TRIMMED ' + (sid || 'LS\\d+') + ' |PHASE_NOT_COMMITTED ' + (sid || 'LS\\d+') + ' ').test(x.lg.join('\n'))
const notReady = x => x.lt.readiness === 'NOT_READY' && x.b.status === 'PARTIAL' && x.lt.uiMessage === 'Listening track needs repair' && /^NEEDS_REPAIR/.test(x.lt.listeningQuality || '')

async function main() {
  // ══ §28 — REGRESSION FIXTURE (all three languages) ══════════════════════════════════════
  for (const lang of ['th', 'ja', 'zh']) {
    const x = await build(lang, { tag: 'R' + lang })
    const { lt, b, S } = x
    const ls = lt.lines || [], cv = lt.coverage || {}
    const content = ls.filter(l => !l.intentionalRepetition).map(l => String(textOf(lang, l)).replace(/\s+/g, ''))
    const sceneIds = [...new Set(ls.map(l => l.sceneId))]
    const rowsOk = (cv.rows || []).length === 30 && cv.rows.every(r => r.occurrences >= 1 && r.lineIds.length === r.occurrences && r.surfaceEvidence.every(Boolean))
    const nNew = NEW_COUNT[lang]
    T('R-' + lang, '§28 ' + lang.toUpperCase() + ' fixture: TARGET COVERAGE 30/30 (NEW ' + nNew + '/' + nNew + ' · REVIEW ' + (30 - nNew) + '/' + (30 - nNew) + ') · ≤3 targets/turn · both speakers · multi-turn scenes · no merged lines · no duplicates · no unseen words · coherent ⇒ READY',
      b.status === 'READY' && lt.readiness === 'READY' && b.coveredTargetCount === 30 && b.requiredTargetCount === 30 && cv.contract === 'ALL_SELECTED_TARGETS' &&
      cv.newHeardIds.length === nNew && cv.newTargetIds.length === nNew && cv.reviewHeardIds.length === 30 - nNew && rowsOk &&
      ls.every(l => l.coveredTargetIds.length <= 3) && lt.gates.MAX3_PASS === true && lt.gates.BOTH_SPEAKERS === true && ls.some(l => l.speaker === 'A') && ls.some(l => l.speaker === 'B') &&
      sceneIds.length <= 7 && sceneIds.every(id => ls.filter(l => l.sceneId === id).length >= 2) && lt.gates.NO_MERGED_SPEAKER_LINES === true &&
      new Set(content).size === content.length && lt.gates.NO_DUPLICATES === true && lt.gates.CLOSED_VOCAB === true &&
      lt.gates.WHOLE_CONVERSATION_COHERENCE === 'PASS' && lt.gates.PRONUNCIATION === true && (['one-conversation-v672', 'planning-first-v673', 'verbalizability-first-v674'].includes(lt.architecture) && lt.oneConversation === true && lt.gates.ONE_CONVERSATION === 'PASS'),   // v672 §2 — ONE conversation (was fresh-conversation-v656)
      { st: b.status, q: lt.listeningQuality, gates: lt.gates, cov: [b.coveredTargetCount, b.requiredTargetCount], scenes: sceneIds.length })
    T('R2-' + lang, '§28 ' + lang.toUpperCase() + ' coverage is computed from the final lines: every line logs lineId · speaker · actualTargetIds · targetCount; each target row lists occurrences · lineIds · surfaceEvidence',
      x.lg.length >= 0 && ls.every(l => l.lineId && l.sceneId && (l.speakerId === 'A' || l.speakerId === 'B') && Number.isInteger(l.turnIndex) && textOf(lang, l) && l.translation && Array.isArray(l.coveredTargetIds) &&
        (lang === 'ja' ? l.reading && l.romaji : lang === 'zh' ? l.pinyin : l.phonetic)) &&
      cv.rows.every(r => r.lineIds.every(id => ls.find(l => l.lineId === id && l.coveredTargetIds.includes(r.targetId)))) &&
      S.c.listeningCoverageExportLines(lt, x.t).some(l => /LISTENING_TARGET_COVERAGE 30\/30/.test(l)), ls.slice(0, 2))
    T('C-' + lang, '§26 ' + lang.toUpperCase() + ' cost (v668): a clean run is ONE generation call PER SCENE (no regeneration), 0 repair calls, batched QC; LISTENING_TOTAL_PAID_CALLS = GENERATION + REPAIR + QC',
      lt.telemetry.LISTENING_GENERATION_CALLS === (lt.scenes || []).length && lt.telemetry.LISTENING_SCENE_REGENERATIONS === 0 && lt.telemetry.LISTENING_REPAIR_CALLS === 0 && lt.telemetry.LISTENING_QC_CALLS >= 1 && lt.telemetry.LISTENING_QC_CALLS <= 6 + (lt.scenes || []).length &&   // v674: + one transition judgement per phase (PHASE_TRANSITION_VALIDATION)
     
      lt.telemetry.LISTENING_TOTAL_PAID_CALLS === lt.telemetry.LISTENING_GENERATION_CALLS + lt.telemetry.LISTENING_REPAIR_CALLS + lt.telemetry.LISTENING_QC_CALLS &&
      x.seen.filter(s => isCompose(s.q)).length === (lt.scenes || []).length, lt.telemetry)
    if (lang === 'ja') {
      const q = x.seen.filter(s => isCompose(s.q)).map(s => s.q).join('\n')
      T('P-ja', '§14 the composer inherits only the 30 target ids, register, speakers and premise (no Main Track sentence is handed over); NEW targets are marked',
        (q.match(/^T\d+ \| /gm) || []).length === 30 && (q.match(/ \| NEW$/gm) || []).length === 3 && /^WHOLE CONVERSATION: two friends spend a day in town/m.test(q) && /A = Ken \(friend\) · B = Aya \(friend\)/.test(q) &&
        // (scene 1's prompt: later scenes quote the PREVIOUS LISTENING scene's last lines as context, which the mock writes from the same frames)
        !x.t.pairs.filter(p => p && p.japanese && p.japanese.length > 6).some(p => ((x.seen.find(s => isCompose(s.q)) || {}).q || '').includes(p.japanese)), { rows: (q.match(/^T\d+ \| /gm) || []).length, nNew: (q.match(/ \| NEW$/gm) || []).length, prem: /^WHOLE CONVERSATION: two friends spend a day in town/m.test(q), sp: /A = Ken \(friend\) · B = Aya \(friend\)/.test(q), leak: x.t.pairs.filter(p => p && p.japanese && p.japanese.length > 6 && q.includes(p.japanese)).map(p => p.japanese).slice(0, 3) })
    }
  }

  // ══ §29 — FAILURE TESTS A–H (Japanese — the failing live log — unless noted) ═══════════════
  {
    const S0 = setup('ja'); const miss = S0.targets[10].id
    const a = await build('ja', { mock: { ln: { missing: [miss], noRepair: true } }, tag: 'A' })
    T('A', '§29 A — 29/30 targets heard ⇒ NOT_READY / PARTIAL · "Listening track needs repair" · the missing target is named',
      notReady(a) && a.b.coveredTargetCount === 29 && a.b.requiredTargetCount === 30 && a.lt.gates.COVERAGE_PASS === false && a.lt.coverage.uncoveredTargetIds.includes(miss) &&
      a.seen.some(s => isRepair(s.q) && (new RegExp('- MISSING TARGET T' + miss).test(s.q) || new RegExp('MUST NOW ALSO CONTAIN the lesson word ' + S0.targets[10].japanese).test(s.q))),
      { q: a.lt.listeningQuality, cov: a.b.coveredTargetCount })
    const a2 = await build('ja', { mock: { ln: { missing: [miss] } }, tag: 'A2' })
    T('A2', '§29 A — the missing target is repaired by a LOCAL revision (one batched repair call, no new singleton scene) ⇒ 30/30 READY',
      a2.lt.readiness === 'READY' && a2.b.coveredTargetCount === 30 && a2.lt.telemetry.LISTENING_REPAIR_CALLS <= 2 && a2.lt.dialogueStats.singleLineScenes === 0,
      { q: a2.lt.listeningQuality, tel: a2.lt.telemetry })
  }
  {
    const b1 = await build('ja', { mock: { ln: { max4: true, noRepair: true } }, tag: 'B' })
    const b2 = await build('ja', { mock: { ln: { max4: true } }, tag: 'B2' })
    const maxIn = x => Math.max(0, ...(x.lt.lines || []).map(l => l.coveredTargetIds.length))
    T('B', '§29 B — 4 current targets in one line ⇒ MAX_TARGETS_PER_TURN ⇒ repaired by splitting ⇒ READY with ≤3 per turn; unrepaired ⇒ that INVALID candidate is never committed as written (v673: regenerated from its plan / ONE global replan / trimmed) — no committed line ever carries 4',
      maxIn(b1) <= 3 && ((b1.lt.telemetry || {}).LISTENING_SCENES_REPLANNED >= 1 || (b1.lt.telemetry || {}).LISTENING_SCENES_SIMPLIFIED_COMMITTED >= 1 || v673Handled(b1)) && (b1.lt.telemetry || {}).LISTENING_SCENES_COMMITTED_WITH_DEFECTS === 0 &&   // v671: the simplified-premise rung comes first
      b2.lt.readiness === 'READY' && b2.lt.gates.MAX_TARGETS_PER_TURN <= 3 && (b2.lt.lines || []).every(l => l.coveredTargetIds.length <= 3),
      { b1: [b1.lt.readiness, maxIn(b1), (b1.lt.telemetry || {}).LISTENING_SCENES_REPLANNED], b2: b2.lt.listeningQuality })
  }
  {
    const c1 = await build('ja', { mock: { ln: { oneSpeaker: true } }, tag: 'C' })
    T('C', '§29 C — every turn by speaker A ⇒ ONE_SPEAKER HARD FAIL ⇒ (v669) every candidate INVALID, none committed ⇒ NOT_READY (build FAILED: UNCOMMITTED_SCENE, never playable)',
      c1.b.status !== 'READY' && !(c1.lt.lines || []).length && /UNCOMMITTED_SCENE|BOTH_SPEAKERS/.test(c1.b.failureReason || c1.lt.listeningQuality || ''), { st: c1.b.status, why: c1.b.failureReason })
  }
  {
    const d1 = await build('ja', { mock: { ln: { singletons: true, noRepair: true } }, tag: 'D' })
    T('D', '§29 D — every line in its own singleton scene ⇒ SINGLETON_SCENE / SCENE_FRAGMENTATION ⇒ NOT_READY',
      notReady(d1) && d1.lt.gates.NO_SINGLETON_SCENES === false && d1.lt.compositionFailure === true, d1.lt.listeningQuality)
  }
  {
    const e1 = await build('ja', { mock: { ln: { dup: true, noRepair: true, persist: 'all' } }, tag: 'E' })
    const e3 = await build('ja', { mock: { ln: { dup: true, noRepair: true, persist: true } }, tag: 'E3' })
    const e2 = await build('ja', { mock: { ln: { dup: true } }, tag: 'E2' })
    const c2 = (e2.lt.lines || []).map(l => l.japanese), c3 = (e3.lt.lines || []).map(l => l.japanese)
    T('E', '§29 E — a duplicated line ⇒ EXACT_DUPLICATE ⇒ removed by repair ⇒ READY; a duplicate in every LS1 candidate ⇒ LS1 never committed as written (v673: regenerated / replanned / trimmed), no repeated line; in every candidate of every scene ⇒ never READY with a repeat (UNCOMMITTED_SCENE, coverage fail, or clean deterministic trims)',
      // every candidate of every scene duplicated: never READY with a repeat — (v673) READY only when every duplicate
      // exchange was TRIMMED deterministically and every gate passes on what remains
      (e1.b.status !== 'READY' ? (!(e1.lt.lines || []).length && /UNCOMMITTED_SCENE/.test(e1.b.failureReason || '')) || (e1.lt.gates && e1.lt.gates.COVERAGE_PASS === false) : ((e1.lt.telemetry || {}).LISTENING_SCENES_TRIMMED > 0 || /PHASE_TRIMMED/.test(e1.lg.join('\n')))) &&
      new Set((e1.lt.lines || []).map(l => l.japanese)).size === (e1.lt.lines || []).length &&
      ((e3.lt.uncommittedScenes || []).some(u => u.sceneId === 'LS1') || v673Handled(e3, 'LS1')) && new Set(c3).size === c3.length && (e3.lt.readiness === 'READY') === (e3.lt.gates.SCENES_VALIDATED === true && e3.lt.gates.COVERAGE_PASS === true) &&
      e2.lt.readiness === 'READY' && new Set(c2).size === c2.length,
      { e1: e1.b.failureReason, e3: e3.lt.listeningQuality, e2: e2.lt.listeningQuality })
    // intentional repetition is allowed only when marked
    const S = setup('ja'); const la = S.c.ev('LISTENING_ADAPTERS').ja
    const p = { japanese: '明日も行く？', english: 'Going tomorrow too?' }
    const mk = (sp, rep) => ({ speaker: sp, pair: { ...p, speaker: sp }, intentionalRepetition: rep })
    const targets = S.c.listeningConversationTargets({ keywords: [], pairs: [] }, S.vocab, 'ja')
    const au1 = S.c.listeningConversationAudit([{ sceneId: 'L1', turns: [mk('A'), { speaker: 'B', pair: { japanese: 'うん、行く。', english: 'Yeah.', speaker: 'B' } }, mk('A')] }], targets, la, { vocab: S.vocab, exposed: [], eligTargets: [], jaInv: S.c.japaneseLearnerInventory(S.vocab, []) })
    const au2 = S.c.listeningConversationAudit([{ sceneId: 'L1', turns: [mk('A'), { speaker: 'B', pair: { japanese: 'うん、行く。', english: 'Yeah.', speaker: 'B' } }, mk('A', true)] }], targets, la, { vocab: S.vocab, exposed: [], eligTargets: [], jaInv: S.c.japaneseLearnerInventory(S.vocab, []) })
    T('E2', '§17 a repeated line is EXACT_DUPLICATE unless marked INTENTIONAL_PEDAGOGICAL_REPETITION',
      au1.issues.some(i => i.code === 'EXACT_DUPLICATE') && !au2.issues.some(i => /DUPLICATE/.test(i.code)), { a: au1.issues.map(i => i.code), b: au2.issues.map(i => i.code) })
  }
  {
    const f1 = await build('th', { mock: { cohFail: true }, tag: 'F' })
    T('F', '§29 F — random unrelated sentences (the judge fails every scene) ⇒ WHOLE_CONVERSATION_COHERENCE=FAIL ⇒ NOT_READY (Thai)',
      // v674: the SAME judge gates every phase before commit — a judge that fails everything stops the composition before any
      // phase commits (no playable line); with a committed conversation the final gate still reports FAIL
      (notReady(f1) && f1.lt.gates.WHOLE_CONVERSATION_COHERENCE === 'FAIL' && f1.lt.coherenceAudit.passed === false) || (/^(FAILED|NOT_READY|PARTIAL)$/.test((f1.b || {}).status || '') && !((f1.lt || {}).lines || []).length), { q: f1.lt.listeningQuality, st: (f1.b || {}).status })
  }
  {
    // G — the composer CLAIMS all 30 (intendedTargetIds), but two targets are not in the text
    const S0 = setup('ja'); const gone = [S0.targets[4].id, S0.targets[20].id]
    const all = S0.targets.map(t => t.id)
    const g = await build('ja', { mock: { ln: { missing: gone, noRepair: true } }, tag: 'G', post: (q, r) => {
      if (!isCompose(q)) return r
      const j = JSON.parse(r); (j.scenes || [j]).forEach(sc => sc.turns.forEach((tn, k) => { tn.intendedTargetIds = k === 0 ? all.slice() : tn.intendedTargetIds })); return JSON.stringify(j) } })   // v668: one scene object per call
    T('G', '§29 G — planned/claimed 30/30 but only 28/30 actually present ⇒ ACTUAL coverage wins (intendedTargetIds never trusted) ⇒ 28/30 NOT_READY',
      notReady(g) && g.b.coveredTargetCount === 28 && gone.every(id => g.lt.coverage.uncoveredTargetIds.includes(id)) &&
      gone.every(id => g.lt.coverage.rows.find(r => r.targetId === id).occurrences === 0) && (g.lt.lines || []).every(l => l.coveredTargetIds.length <= 3),
      { cov: g.b.coveredTargetCount, unc: g.lt.coverage && g.lt.coverage.uncoveredTargetIds })
  }
  {
    // H — a PARTIAL track is not playable: the gate shows "Listening track needs repair", no Start button
    const S0 = setup('ja'); const miss = [S0.targets[3].id, S0.targets[7].id, S0.targets[15].id]
    const h = await build('ja', { mock: { ln: { missing: miss, noRepair: true } }, tag: 'H' })
    const cR = load('tt.compiled.js', { React }); mock({ c: cR, vocab: h.S.vocab, targets: h.S.targets }, 'ja', {})
    ;['tt-listening-v1', 'tt-listening-ja-v1'].forEach(k => { const v = h.S.c.localStorage.getItem(k); if (v != null) cR.localStorage.setItem(k, v) })
    Object.keys(h.S.c.localStorage.store || {}).forEach(k => { if (/listen/i.test(k)) cR.localStorage.setItem(k, h.S.c.localStorage.getItem(k)) })
    const track = { ...h.t, listeningBuild: h.b }
    let r
    await TR.act(async () => { r = TR.create(React.createElement(cR.ListenFirstGate, { track, lang: 'ja', vocab: h.S.vocab, apiKey: 'k', model: 'm', onProceed: () => {}, autoCreate: false })); for (let i = 0; i < 30; i++) await new Promise(res => setImmediate(res)) })
    const txt = (function f(n) { return n == null ? '' : typeof n === 'string' ? n : Array.isArray(n) ? n.map(f).join(' ') : f(n.children) })(r.toJSON()).replace(/\s+/g, ' ')
    // v658: a STORED (legacy, Main-attached) PARTIAL track is read-only history — no Start and no rebuild from the Main Track
    // (a new Listening = the Listening Track button; its own Rebuild is covered by tests23)
    T('H', '§29 H — a stored PARTIAL (27/30) track is NOT playable: "Listening track needs repair" with TARGET COVERAGE 27/30 and the missing targets; Continue only (v658: no rebuild from a Main Track); no Start button',
      h.b.status === 'PARTIAL' && /Listening track needs repair/.test(txt) && /TARGET COVERAGE 27\/30/.test(txt) && /Missing:/.test(txt) && !/Start Listening/.test(txt) && !/Rebuild/.test(txt) && /Continue to Main Track/.test(txt),
      txt.slice(0, 400))
  }

  // ══ merged speakers (JA / ZH / TH) ═════════════════════════════════════════════════════
  {
    const S = setup('ja')
    const m = (t, e, l) => !!S.c.listeningMergedSpeakerProblem(t, e, l)
    T('M1', '§16 structural validator: a question and its answer in one line is MERGED_SPEAKERS (JA 「？うん」, ZH 「？好」, TH ครับ + ค่ะ); normal lines pass',
      m('明日、行く？うん、行く。', 'Going tomorrow? Yeah, I will.', 'ja') && m('你去吗？好，我去。', 'Are you going? OK, I am going.', 'zh') && m('ไปไหมครับไปค่ะ', 'Going? Going.', 'th') &&
      !m('明日、行く？', 'Going tomorrow?', 'ja') && !m('うん、行く。', 'Yeah, I will go.', 'ja') && !m('你去吗？', 'Are you going?', 'zh') && !m('ไปไหมครับ', 'Going?', 'th'))
    for (const lang of ['ja', 'zh']) {
      const x1 = await build(lang, { mock: { ln: { merged: true, noRepair: true, persist: true } }, tag: 'M' + lang })
      const x2 = await build(lang, { mock: { ln: { merged: true } }, tag: 'M2' + lang })
      T('M-' + lang, '§16 ' + lang.toUpperCase() + ' a merged question+answer line ⇒ repaired (split) ⇒ READY; merged in EVERY candidate of LS1 ⇒ LS1 never committed as written (UNCOMMITTED_SCENE, or v673 regenerate / replan / trim) and no merged line enters the track',
        ((x1.lt.uncommittedScenes || []).some(u => u.sceneId === 'LS1') || v673Handled(x1, 'LS1')) && !(x1.lt.lines || []).some(l => S.c.listeningMergedSpeakerProblem(l.japanese || l.chinese, l.english, lang)) && x1.lt.gates.NO_MERGED_SPEAKER_LINES === true &&
        x2.lt.readiness === 'READY' && x2.lt.gates.NO_MERGED_SPEAKER_LINES === true,
        { x1: x1.lt.listeningQuality, x2: x2.lt.listeningQuality })
    }
  }

  // ══ response tokens as replies ═════════════════════════════════════════════════════════
  {
    const S = setup('ja')
    const resp = ['はい', 'うん', 'いいえ'].map(j => S.vocab.find(w => w.japanese === j)).filter(Boolean)
    const targets = S.c.listeningConversationTargets({ keywords: resp.map(w => ({ wordId: w.id, japanese: w.japanese, english: w.english })), pairs: [] }, S.vocab, 'ja')
    const alloc = S.c.listeningTargetAllocation(targets, {})
    T('RT', '§21 response words はい / うん / いいえ ⇒ role RESPONSE_TOKEN ⇒ allocated as REPLY turns to a yes/no question',
      resp.length === 3 && targets.every(t => t.role === 'RESPONSE_TOKEN') && resp.every(w => alloc.some(g => g.ids.includes(w.id) && /REPLY to a yes\/no question/.test(g.hint))),
      { roles: targets.map(t => t.role), alloc })
  }

  // ══ Main must be READY first: Main coherence FAIL ⇒ Main NOT_READY ⇒ Listening does not start ══
  for (const lang of ['th', 'ja']) {
    const S = setup(lang); mock(S, lang, { incoherentMain: { fixAfter: 99 } })
    const t = await fin(S, lang, { ...makeTrack(S, lang, { tag: '-mc' + lang, newIds: S.targets.slice(0, NEW_COUNT[lang]).map(x => x.id) }), scenePlan: planOf(S) })
    const seen = wrap(S)
    const r = await S.c.buildAndPersistListening(t, S.vocab, { lang, apiKey: 'k', model: 'gemini-2.5-flash-lite' })
    const saved = await S.c.listeningVersionsFor(lang, S.c.listeningTrackId(t))
    T('MR-' + lang, '§3 ' + lang.toUpperCase() + ' Main coherence FAIL ⇒ Main NOT_READY ⇒ Listening BLOCKED: 0 Listening calls, nothing persisted',
      t.integrity.status !== 'READY' && r.listeningBuild.status === 'BLOCKED_MAIN_NOT_READY' && !r.listeningTrack && seen.filter(s => isCompose(s.q) || isRepair(s.q) || /listening/i.test(s.stage || '')).length === 0 && (saved || []).length === 0,
      { main: t.integrity.status, st: r.listeningBuild.status, calls: seen.map(s => s.stage) })
  }

  // ══ JA Daily economics unchanged: 3 NEW / 27 REVIEW ═══════════════════════════════════
  {
    const S = setup('ja')
    const t = makeTrack(S, 'ja', { tag: '-n3', newIds: S.targets.slice(0, 3).map(x => x.id) })
    const req = S.c.listeningRequiredTargetIds(t)
    T('N3', '§6 JA Daily 3 NEW / 27 REVIEW; Listening requires all 30', req.newIds.length === 3 && req.reviewIds.length === 27 && req.requiredIds.length === 30, [req.newIds.length, req.reviewIds.length, req.requiredIds.length])
    const src = require('fs').readFileSync(__dirname + '/tt.jsx', 'utf8')
    T('OLD', '§30 one active Listening implementation: the anchor builder / composer / recovery functions are gone',
      !/function buildListeningByAnchors|function buildThaiListeningByAnchors|function listeningComposeScenes|function _listeningRecoverAnchor|function listeningSelectBlocks|function listeningFinalCoverageAudit/.test(src) &&
      /async function buildListeningConversation/.test(src) && (src.match(/return buildListeningConversation\(/g) || []).length === 1)
  }

  console.log(out.join('\n'))
  console.log('v656 Listening rebuild regression: ' + passes + '/' + (passes + fails) + (fails ? ' — ' + fails + ' FAILED' : ' — ALL PASS'))
  process.exitCode = fails ? 1 : 0
}
main().catch(e => { console.error(e); process.exitCode = 1 })
