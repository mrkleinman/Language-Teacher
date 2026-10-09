// v668 — CLOSED-WORLD GENERATION (spec "v668 Closed-World Generation — Fix Untaught Vocabulary Leakage at the Source",
// regressions §54–§69 + the layer / planner / palette / preflight / pronunciation contracts §1–§53).
// The model is simulated at the Gemini boundary (tests14 responder); every layer, gate and repair is the app's own code.
const fs = require('fs')
const { setup, mock } = require('./tests14')
const out = []; let fails = 0, n = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + id.padEnd(4) + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 1200) : '')) }
const KEY = 'AIzaSyTEST-harness-key-000000'
const surfOf = (lang, w) => lang === 'th' ? w.thai : lang === 'ja' ? w.japanese : w.chinese
const addWord = (lang, text, w) => lang === 'th' ? text.replace(/(ครับ|ค่ะ|คะ)?$/, m => w + m) : text.replace(/([。？！])?$/, m => w + m)
function learner(lang, belt) {
  const S = setup(lang)
  S.c.setLearnerStateOverride(belt === undefined ? null : belt ? { rank: belt, source: 'test' } : null)
  const ids = new Set(S.targets.map(t => t.id))
  S.vocab.forEach(w => { if (ids.has(w.id)) { w.dueDate = '2026-01-01'; w.difficulty = 'hard' } else { w.dueDate = '2099-01-01'; if (w.difficulty === 'hard') w.difficulty = 'medium' } })
  return S
}
const untaught = (S, lang, surfaces) => surfaces.map(x => { const w = S.vocab.find(v => surfOf(lang, v) === x); if (w) Object.assign(w, { status: 'new', introducedAt: null, lastSeen: null, okStreak: 0, repCount: 0, manualKnown: false, dueDate: null }); return w })
async function run(S, lang, ln, opt = {}) {
  const st = mock(S, lang, { ln, ...(opt.mockOpt || {}) })
  const inner = S._mockFn; st.prompts = []; st.sceneCalls = {}
  S.c.mockGeminiGenerate = async (k, m, msgs, max, o) => {
    const q = msgs[msgs.length - 1].content; st.prompts.push(q)
    if (opt.pre) { const pr = opt.pre(q); if (pr != null) return pr }
    let r = await inner(k, m, msgs, max, o)
    const sm = q.match(/^Write SCENE (LS\d+) /)
    if (sm) { st.sceneCalls[sm[1]] = (st.sceneCalls[sm[1]] || 0) + 1; if (opt.inject) { const j = JSON.parse(r); opt.inject(sm[1], j, st.sceneCalls[sm[1]]); r = JSON.stringify(j) } }
    if (opt.post) r = opt.post(q, r)
    return r
  }
  const logs = []
  const r = await S.c.buildStandaloneListeningTrack({ lang, vocab: S.vocab, apiKey: KEY, model: 'gemini-2.5-flash-lite', onLog: m => { logs.push(m); if (opt.onLog) opt.onLog(m) }, attemptId: 'lattempt-v668', speechStyle: opt.speechStyle })
  const lines = r.track.listening ? r.track.listening.lines.map(l => l.thai) : []
  return { ...r, st, logs, L: logs.join('\n'), lines }
}

;(async () => {
  // ══ §1–§5 / §54 / §55 / §44 — LAYER A: canonical segmentation before any learner check ══
  {
    const S = learner('zh'); const c = S.c
    S.vocab.forEach((w, i) => { if (i >= 28) Object.assign(w, { status: 'new', introducedAt: null, lastSeen: null, repCount: 0, okStreak: 0, manualKnown: false }) })
    const Z = c.buildLanguageLexiconAdapter('zh', S.vocab)
    const seg = t => Z.segment(t).filter(x => x.kind !== 'punct').map(x => x.surface)
    const units = ['周末', '公园', '天气', '时候', '马上']
    T('A1', '§54 Mandarin compounds 周末 / 公园 / 天气 / 时候 / 马上 are ONE canonical lexical unit each (Layer A) — never 周 + 末',
      units.every(u => seg(u + '。').length === 1 && seg(u + '。')[0] === u) && seg('周末我们去公园吧').join('|') === '周末|我们|去|公园|吧', units.map(u => seg(u).join('+')))
    const v = c.validateClosedWorldCandidate('zh', '周末去公园，天气很好。', S.vocab, [])
    T('A2', '§3/§54 the closed-vocabulary check asks "is 周末 authorised?" — unknown lexemes are reported WHOLE (周末, 公园, 天气), no single-Hanzi fragments',
      ['周末', '公园', '天气'].every(u => v.unknown.includes(u)) && !v.unknown.some(u => ['周', '末', '公', '园', '天', '气'].includes(u)) && !v.malformed.length, v.unknown)
  }
  {
    const S = learner('ja'); const c = S.c
    const A = c.buildLanguageLexiconAdapter('ja', S.vocab)
    const toks = t => A.segment(t).filter(x => x.kind !== 'punct')
    const lem = t => toks(t).filter(x => x.kind === 'lexeme').map(x => x.lemma)
    T('A3', '§4/§55 Japanese morphology: 借りました → 借りる · 覚えてる → 覚える · 行った → 行く (lemma + inflection, never 行 + っ + た)',
      lem('借りました。').join() === '借りる' && lem('覚えてる？').join() === '覚える' && lem('行った').join() === '行く' && toks('行った').length === 1, [lem('借りました。'), lem('覚えてる？'), lem('行った')])
    T('A4', '§4 久しぶり / 図書館 / 借りる / 覚える stay whole; 僕図書館 is two lexemes (僕 + 図書館), never one fragment',
      ['久しぶり', '図書館', '借りる', '覚える'].every(w => toks(w).length === 1 && toks(w)[0].lemma === w) && toks('僕図書館で').filter(x => x.kind === 'lexeme').map(x => x.surface).join('|') === '僕|図書館', toks('僕図書館で').map(x => x.surface))
    const bad = c.validateClosedWorldCandidate('ja', '置覚 える。おうなっる。', S.vocab, [])
    T('A5', '§44/§45 malformed fragments (える after a broken stem, っる) are TOKENIZATION_ERROR — not "the learner does not know える"',
      bad.malformed.includes('える') && bad.malformed.some(x => /っる/.test(x)) && !bad.unknown.includes('える') && !bad.ok, bad)
    untaught(S, 'ja', ['図書館', '借りる'].filter(x => S.vocab.some(w => w.japanese === x)))
    const v = c.validateClosedWorldCandidate('ja', '僕は図書館で本を借りました。', S.vocab, [])
    T('A6', '§1 Layer A is NOT permission: 僕 / 図書館 / 借りる are recognised words but untaught → UNKNOWN_LEXEME by lemma (借りる, not 借りました); 本 (taught) passes',
      v.unknown.includes('僕') && v.unknown.includes('図書館') && v.unknown.includes('借りる') && !v.unknown.includes('本') && !v.unknown.includes('借りました'), v.unknown)
    const ok = c.validateClosedWorldCandidate('ja', '今日は何か食べる？', S.vocab, [])
    T('A7', 'an ambiguous Layer A compound that splits fully into taught lexemes + grammar (何か = 何 + か) is not an unknown word (nothing is added to the inventory)', ok.ok, ok.unknown)
  }
  {
    const S = learner('th'); const c = S.c
    const w = S.vocab.find(x => x.thai && x.thai.length >= 3 && !S.targets.some(t => t.id === x.id) && x.status !== 'locked')
    const line = 'ผม' + w.thai + 'ครับ'
    const before = c.validateClosedWorldCandidate('th', line, S.vocab, S.targets).ok
    untaught(S, 'th', [w.thai])
    const after = c.validateClosedWorldCandidate('th', line, S.vocab, S.targets)
    T('A8', '§5 Thai goes through the SAME API (validateClosedWorldCandidate): a taught word passes; the same word, untaught, is UNKNOWN', before && !after.ok && after.unknown.some(x => x.includes(w.thai) || w.thai.includes(x)), { w: w.thai, after })
  }
  // ══ §42 / §46 — LAYER B: a frozen snapshot; never expanded to make a track pass ══
  {
    const S = learner('ja'); const c = S.c
    const victim = S.vocab.find(w => w.japanese === '駅')
    const snap = c.snapshotLearnerInventory('ja', S.vocab, S.targets, 'listening')
    Object.assign(victim, { status: 'new', introducedAt: null, lastSeen: null, repCount: 0 })
    T('B1', '§42 snapshotLearnerInventory: frozen vocabulary + learnerInventorySnapshotIds; a later change to the live vocabulary does not change the snapshot',
      Object.isFrozen(snap.vocab) && Object.isFrozen(snap.vocab[0]) && snap.learnerInventorySnapshotIds.includes(victim.id) && c.isLearnerTaught(snap.vocab.find(w => w.id === victim.id)) &&
      /LEARNER_INVENTORY language=ja introducedContent=\d+ .*snapshot=\w+/.test(snap.log) && c.buildLearnerAuthorizedInventory('ja', snap) === snap.inventory, snap.log)
  }
  {
    const S = learner('ja')
    const live = S.vocab.find(w => w.japanese === '駅')
    let flipped = false
    const r = await run(S, 'ja', {}, { speechStyle: 'natural', inject: (sid, j) => { if (sid === 'LS2' && !flipped) { flipped = true; Object.assign(live, { status: 'new', introducedAt: null, lastSeen: null, repCount: 0 }) } if (sid === 'LS3' && j.turns[1]) j.turns[1].text = j.turns[1].text.replace(/([。？])$/, '駅$1') } })
    T('B2', '§42 the learner state changes mid-generation (駅 reset in another tab during LS2) → the track keeps validating against its frozen snapshot: 駅 in LS3 is still authorised · LEARNER_INVENTORY logged',
      /📚 LEARNER_INVENTORY language=ja introducedContent=\d+ .*snapshot=\w+ \(frozen at generation start\)/.test(r.L) && !(r.track.unknownWords || []).includes('駅') && r.lines.some(t => t.includes('駅')) && r.track.status === 'READY', { status: r.track.status, failed: r.track.failedChecks, unk: r.track.unknownWords })
  }
  {
    const S = learner('ja')
    const fresh = untaught(S, 'ja', ['ホテル'])[0]
    const snapBefore = JSON.stringify(S.vocab.map(w => [w.id, w.status, w.introducedAt]))
    const r = await run(S, 'ja', { atomicNoop: true }, { speechStyle: 'natural', inject: (sid, j) => { if (sid === 'LS2' && j.turns[1]) j.turns[1].text = addWord('ja', j.turns[1].text, 'ホテル') } })
    T('B3', '§46 an untaught word the model keeps using is NEVER added to the inventory: (v669/v673) the line carrying it is never committed (LS2 regenerated from its plan / re-planned / trimmed / UNCOMMITTED), the word is not in the track, the learner vocabulary is byte-for-byte unchanged',
      /SCENE_REPLAN LS2|SCENE_NOT_COMMITTED LS2|PHASE_REGENERATE LS2 |LISTENING_GLOBAL_REPLAN after LS2 |PHASE_TRIMMED LS2 |PHASE_NOT_COMMITTED LS2 /.test(r.L) && !r.lines.some(t => t.includes('ホテル')) && (r.track.status === 'READY') === (r.track.failedChecks.length === 0) && JSON.stringify(S.vocab.map(w => [w.id, w.status, w.introducedAt])) === snapBefore && fresh.status === 'new', { failed: r.track.failedChecks })
  }
  // ══ §6–§16 — PLANNER: input, feasibility, output, intent skeleton, planned density / complexity ══
  {
    const S = learner('ja'); const c = S.c
    const tg = S.targets.slice(0, 6).map(w => ({ id: w.id, surface: w.japanese, gloss: 'x', role: 'CONTENT', domain: 'places & travel' }))
    const basic = ['go', 'today', 'tomorrow', 'station', 'friend', 'where', 'eat']
    const p1 = c.planListeningCoverage(tg, { seed: 's', inventoryGlosses: basic, hardMax: 9 })
    const f = p1.scenes[0].feasibility
    T('C1', '§56/§7 "plan a trip … where to stay" needs trip / stay|hotel — not taught → SCENE_LANGUAGE_FEASIBILITY rejects it and the planner picks a simpler situation the inventory can say',
      f.checked && f.rejected.some(x => /trip/.test(x.text) && x.missing.includes('trip')) && !/stay/.test(f.situation) && /go/.test(f.situation), f)
    const tg2 = S.targets.slice(0, 6).map(w => ({ id: w.id, surface: w.japanese, gloss: 'x', role: 'CONTENT', domain: 'shopping & payment' }))
    const p2 = c.planListeningCoverage(tg2, { seed: 's', inventoryGlosses: ['buy', 'price', 'expensive', 'go'], hardMax: 9 })
    const p3 = c.planListeningCoverage(tg2, { seed: 's', inventoryGlosses: ['buy', 'price', 'discount', 'card', 'receipt', 'cash'], hardMax: 9 })
    T('C2', '§7 "pay by card, get a receipt, discuss a discount" only when card / receipt / discount are authorised; otherwise "buy something and talk about the price"',
      /buy something/.test(p2.scenes[0].feasibility.situation) && p2.scenes[0].feasibility.rejected[0].missing.join() === 'discount,card,receipt' && /card or cash, the receipt/.test(p3.scenes[0].feasibility.situation), [p2.scenes[0].feasibility, p3.scenes[0].feasibility.situation])
    const bad = [{ turn: 1, speaker: 'A', intent: 'QUESTION', targetIds: [1] }, { turn: 2, speaker: 'B', intent: 'QUESTION', respondsTo: 1, targetIds: [2] }]
    const v = c.validateIntentSkeleton(bad, null)
    T('C3', '§63/§14 skeleton "A asks where? → B asks an unrelated why?" is INVALID before any language is written (QUESTION expects ANSWER)',
      !v.valid && v.problems.some(p => /QUESTION \(turn 1\) → QUESTION \(turn 2\): expected ANSWER/.test(p)), v)
    const all = p1.scenes.concat(p2.scenes)
    T('C4', '§9/§13/§15/§16 every planned scene: premise, requiredTargets, plannedExchanges and a VALID skeleton; 1 target per planned turn (never 4); every turn estimated within hardMax',
      all.every(sc => sc.premise && sc.requiredTargets.length && sc.plannedExchanges.length && sc.skeletonCheck.valid && sc.skeleton.every(t => t.targetIds.length <= 1)) &&
      c.validateIntentSkeleton([{ turn: 1, speaker: 'A', intent: 'STATEMENT', targetIds: [1, 2, 3, 4] }], { hardMax: 4 }).problems.length === 2, all.map(sc => sc.skeletonCheck))
  }
  // ══ end-to-end: planner input + palette + closed-world prompt (Japanese, real fixture belt) ══
  {
    const S = learner('ja')
    const r = await run(S, 'ja', {}, { speechStyle: 'natural' })
    const sp = r.st.prompts.filter(q => /^Write SCENE LS\d /.test(q))
    const pal = r.logs.filter(l => /🎨 SCENE_PALETTE scene=LS\d/.test(l))
    const supp = pal.map(l => (l.match(/supportVocabulary=\[([^\]]*)\]/) || [])[1].split(', ').filter(Boolean))
    const taught = new Set(S.vocab.filter(w => S.c.isLearnerTaught(w)).map(w => w.japanese))
    T('D1', '§8/§43 LISTENING_PLANNER_INPUT logs language · belt · preferredRange · hardMax · selectedTargets · learnerAuthorizedInventory · speechStyle; SCENE_LANGUAGE_FEASIBILITY + SCENE_INTENT_SKELETON per scene',
      /LISTENING_PLANNER_INPUT language=ja belt=\S+ preferredRange=\d+–\d+ hardMax=\d+ selectedTargets=30 learnerAuthorizedInventory=\d+ speechStyle=natural/.test(r.L) &&
      (r.L.match(/SCENE_LANGUAGE_FEASIBILITY LS\d PASS/g) || []).length === sp.length && (r.L.match(/SCENE_INTENT_SKELETON LS\d VALID/g) || []).length === sp.length, r.logs.filter(l => /PLANNER_INPUT/.test(l)))
    T('D2', '§10/§43 one SCENE_PALETTE per scene: required targets + 10–30 support lexemes, every support word learner-authorised (Layer B), none of them another scene\'s target',
      pal.length === sp.length && supp.every(x => x.length >= 10 && x.length <= 30 && x.every(w => taught.has(w))) && supp.every(x => !x.some(w => S.targets.some(t => t.japanese === w && !taught.has(w)))), supp.map(x => x.length))
    T('D3', '§11/§12 closed-world scene prompts: priority order (vocabulary > targets > grammar > level > naturalness) · ALLOWED SUPPORT VOCABULARY · grammar scaffold · "simplify the idea" · INTENT SKELETON · never "KNOWN WORDS: <whole inventory>"',
      sp.length >= 4 && sp.every(q => /CLOSED WORLD — PRIORITY ORDER: 1\. use ONLY the vocabulary listed here · 2\. use every required target · 3\. correct grammar · 4\. the learner level · 5\. be natural WITHIN those limits/.test(q) &&
        /ALLOWED SUPPORT VOCABULARY \(already taught/.test(q) && /ALLOWED GRAMMAR \/ FUNCTION WORDS/.test(q) && /SIMPLIFY THE IDEA/.test(q) && /INTENT SKELETON|TURN PLAN — MEANING FIRST/.test(q) && !/KNOWN WORDS:/.test(q)) &&
      sp.every(q => q.length < 12000), sp.map(q => q.length))
    T('D4', '§17/§43 every scene goes through SCENE_PREFLIGHT (coverage · closedVocab · length · max3 · register · structure · duplicates) before SCENE_COMMIT; a clean track: decision=COMMIT, 0 repair calls, READY',
      (r.L.match(/SCENE_PREFLIGHT LS\d coverage=PASS closedVocab=PASS length=PASS max3=PASS register=PASS structure=PASS duplicates=PASS decision=COMMIT/g) || []).length === sp.length &&
      (r.L.match(/SCENE_COMMIT LS\d decision=COMMIT ·/g) || []).length === sp.length && r.track.telemetry.LISTENING_REPAIR_CALLS === 0 && r.track.status === 'READY' &&
      /LISTENING_REPAIR_HEALTH repairCalls=0 \(target < 10\) OK/.test(r.L), { status: r.track.status, failed: r.track.failedChecks })
  }
  // ══ §57 / §23 / §22 — a leak in the candidate is caught by preflight; the candidate is never committed as generated ══
  {
    const S = learner('ja')
    untaught(S, 'ja', ['ホテル', '泊まる'])
    const r = await run(S, 'ja', {}, { speechStyle: 'natural', inject: (sid, j, k) => { if (sid === 'LS2' && k === 1) j.turns.forEach((t, i) => { if (i < 3) t.text = t.text.replace(/([。？])$/, 'ホテルに泊まる$1') }) } })
    const pf = r.logs.find(l => /SCENE_PREFLIGHT LS2 .*\(candidate\)/.test(l)) || ''
    T('E1', '§57/§23 palette-only scene, Gemini returns ホテルに泊まる (untaught) → SCENE_PREFLIGHT closedVocab=FAIL names ホテル + 泊まる → the candidate is NOT committed; the final track never contains them',
      /closedVocab=FAIL/.test(pf) && /unknown=\[[^\]]*ホテル/.test(pf) && /泊まる/.test(pf) && !r.lines.some(t => /ホテル|泊まる/.test(t)) && r.track.status === 'READY', { pf, status: r.track.status })
  }
  // ══ §58 / §21 — widespread leak (5 of 8 lines) → SCENE_REGENERATE, not five atomic repairs ══
  {
    const S = learner('ja')
    const order = []
    const r = await run(S, 'ja', {}, { speechStyle: 'natural', onLog: m => { if (/LISTENING_ATOMIC_REPAIR issue=|Write SCENE|SCENE_PREFLIGHT LS3/.test(m)) order.push(m) },
      inject: (sid, j, k) => { if (sid === 'LS3' && k === 1) j.turns.forEach((t, i) => { if (i < 5) t.text = addWord('ja', t.text, '宇宙') }) } })
    const regenQ = r.st.prompts.filter(q => /^Write SCENE LS3 /.test(q))
    const before = r.logs.findIndex(l => /SCENE_PREFLIGHT LS3 .*decision=REGENERATE reason=CLOSED_VOCAB \d+ lines/.test(l))
    const atomicLS3 = r.logs.filter(l => /LISTENING_ATOMIC_REPAIR issue=.* scene=LS3/.test(l)).length
    T('E2', '§58/§21 unknown words on 5 of the scene\'s lines → SCENE_PREFLIGHT decision=REGENERATE reason=CLOSED_VOCAB N lines → the SAME scene is regenerated once (same targets, skeleton, palette + "REJECTED BEFORE COMMIT" constraints) → 0 atomic calls for it → READY',
      before >= 0 && regenQ.length === 2 && /WAS REJECTED BEFORE COMMIT: CLOSED_VOCAB \d+ lines/.test(regenQ[1]) && (q => (q.split(/TURN PLAN — MEANING FIRST|INTENT SKELETON/)[1] || '').split('\nPLAN:')[0])(regenQ[0]) === (q => (q.split(/TURN PLAN — MEANING FIRST|INTENT SKELETON/)[1] || '').split('\nPLAN:')[0])(regenQ[1]) &&
      (regenQ[0].match(/ALLOWED SUPPORT VOCABULARY[^\n]*/) || [])[0] === (regenQ[1].match(/ALLOWED SUPPORT VOCABULARY[^\n]*/) || [])[0] && atomicLS3 === 0 && r.track.telemetry.LISTENING_SCENE_REGENERATIONS === 1 &&
      !r.lines.some(t => t.includes('宇宙')) && r.track.status === 'READY', { before, regen: regenQ.length, atomicLS3, status: r.track.status })
  }
  // ══ §59 / §28 / §29 — ONE leak → atomic repair with the positive scene palette (no regeneration, no forbidden list) ══
  {
    const S = learner('ja')
    const r = await run(S, 'ja', {}, { speechStyle: 'natural', inject: (sid, j, k) => { if (sid === 'LS2' && k === 1 && j.turns[1]) j.turns[1].text = addWord('ja', j.turns[1].text, '宇宙') } })
    const at = r.st.prompts.filter(q => /ATOMIC REPAIR of .* LISTENING lines/.test(q))
    const palLine = (r.L.match(/SCENE_PALETTE scene=LS2 [^\n]*supportVocabulary=\[([^\]]*)\]/) || [])[1] || ''
    const allowed = ((at[0] || '').match(/ALLOWED CONTENT \([^)]*\): ([^\n]*)/) || [])[1] || ''
    T('E3', '§59/§20 exactly one unknown word → decision=REPAIR → ONE atomic call whose ALLOWED CONTENT is the frozen LS2 palette (+ protected targets) · no DO NOT USE / forbidden list · no regeneration · READY',
      /SCENE_PREFLIGHT LS2 .*decision=REPAIR/.test(r.L) && at.length === 1 && palLine.split(', ').every(w => allowed.split(' ').includes(w)) && !/DO NOT USE/.test(at[0]) &&
      /Rewrite using ONLY the ALLOWED CONTENT words/.test(at[0]) && !r.st.prompts.some(q => /^Write SCENE LS2 /.test(q) && /REJECTED BEFORE COMMIT/.test(q)) && r.track.status === 'READY' && !/forbidden=/.test(r.L),
      { at: at.length, status: r.track.status, allowed: allowed.slice(0, 200) })
  }
  {
    const S = learner('ja')
    untaught(S, 'ja', ['ホテル'])
    let n1 = 0
    const post = (q, r) => { if (!/ATOMIC REPAIR of .* LISTENING lines/.test(q)) return r; n1++; if (n1 > 1) return r
      const j = JSON.parse(r); (j.repairs || []).forEach(x => (x.lines || []).forEach(l => { l.text = addWord('ja', l.text, '旅館') })); return JSON.stringify(j) }
    const r = await run(S, 'ja', {}, { speechStyle: 'natural', post, mockOpt: {}, inject: (sid, j, k) => { if (sid === 'LS2' && k === 1 && j.turns[1]) j.turns[1].text = addWord('ja', j.turns[1].text, 'ホテル') } })
    T('E4', '§60/§27 original unknown ホテル; the repair swaps in 旅館 (also untaught) → PATCH_REJECTED reason=CLOSED_VOCAB (the more "natural" line still fails) → positive-palette retry or (v673) phase regeneration from the frozen plan fixes it',
      /PATCH_REJECTED issue=i\d+ line=L\d+ reason=CLOSED_VOCAB: L\d+ unknown 旅館/.test(r.L) && (/PATCH_ACCEPTED/.test(r.L) || /PHASE_REGENERATE LS2 /.test(r.L)) && !r.lines.some(t => /旅館|ホテル/.test(t)) && r.track.status === 'READY', r.logs.filter(l => /PATCH_/.test(l)).slice(0, 3))
  }
  // ══ §61 / §62 / §64 — max3, complexity and duplicates are PRE-COMMIT defects ══
  {
    const S = learner('ja', '4th Kyu')
    const r = await run(S, 'ja', { max4: true }, { speechStyle: 'natural' })
    const iPf = r.logs.findIndex(l => /SCENE_PREFLIGHT LS1 .*max3=FAIL\(1\)/.test(l)), iCommit = r.logs.findIndex(l => /SCENE_COMMIT LS1 decision=COMMIT/.test(l)), iAsm = r.logs.findIndex(l => /LISTENING_SCENE_COVERAGE_UNION/.test(l))
    T('E5', '§61 a 4-target line → SCENE_PREFLIGHT max3=FAIL on the CANDIDATE → split / repaired before SCENE_COMMIT → the assembled MAX3 audit never discovers it · READY',
      iPf >= 0 && iCommit > iPf && iCommit < iAsm && /LISTENING_MAX3_AUDIT PASS/.test(r.L) && r.track.status === 'READY', { iPf, iCommit, iAsm, status: r.track.status })
  }
  {
    const S = learner('ja')     // the fixture learner: Mukyu, preferred 2–4, hardMax 6
    const long = '今日は駅で友達と会ってご飯を食べて映画を見る'
    const r = await run(S, 'ja', {}, { speechStyle: 'natural', inject: (sid, j, k) => { if (sid === 'LS2' && k === 1) [0, 2, 4].forEach(i => { if (j.turns[i]) j.turns[i].text = long + j.turns[i].text }) } })
    T('E6', '§62 Mukyu hardMax 6: a candidate with three 7+-unit turns → SCENE_PREFLIGHT length=FAIL(3) → decision=REGENERATE before commit → the committed scene has no over-hardMax line · LENGTH_PASS · READY',
      /SCENE_PREFLIGHT LS2 .*length=FAIL\(3\).*decision=REGENERATE/.test(r.L) && !r.lines.some(t => t.includes(long)) && r.track.listening.gates.LENGTH_PASS === true && r.track.status === 'READY', { status: r.track.status, failed: r.track.failedChecks })
  }
  {
    const S = learner('ja')
    let first = null
    const r = await run(S, 'ja', {}, { speechStyle: 'natural', inject: (sid, j, k) => { if (sid === 'LS1') first = j.turns[0].text; if (sid === 'LS3' && k === 1 && first && j.turns[1]) j.turns[1].text = first } })
    T('E7', '§38/§64 a candidate line that repeats a line of an already committed scene → SCENE_PREFLIGHT duplicates=FAIL → replaced before commit → NO_DUPLICATES · READY',
      /SCENE_PREFLIGHT LS3 .*duplicates=FAIL\(1\)/.test(r.L) && r.lines.filter(t => t === first).length === 1 && r.track.listening.gates.NO_DUPLICATES === true && r.track.status === 'READY', { status: r.track.status, n: r.lines.filter(t => t === first).length })
  }
  // ══ §30–§34 / §65–§67 — Japanese pronunciation after the text freeze ══
  {
    const S = learner('ja'); const c = S.c
    const rd = t => { const b = c.jaDeterministicReading(t, S.vocab); return { ...c.ev('_jaAssemble')(b.segs), un: b.unresolved.map(u => u.surface) } }
    const live = ['やあ、久しぶり！元気だった？', 'うん、元気だよ。そっちは？最近どう？', 'まあまあかな。仕事がちょっと忙しくてね。', '三人で行こう。', '八分待って。', 'それは千円です。', '何だった？']
    const want = ['やあ、ひさしぶり！げんきだった？', 'うん、げんきだよ。そっちは？さいきんどう？', 'まあまあかな。しごとがちょっといそがしくてね。', 'さんにんでいこう。', 'はっぷんまって。', 'それはせんえんです。', 'なんだった？']
    const got = live.map(rd)
    T('F1', '§31 deterministic readings: dictionary + morphology + counters + contextual 何 — the live 84-issue lines now read kana-only (ひさしぶり, げんきだった, いそがしくて, さんにん, はっぷん, せんえん, なんだった)',
      got.every((g, i) => g.reading === want[i] && !g.un.length) && got.every(g => !/[一-鿿]/.test(g.reading) && !/[぀-ヿ一-鿿]/.test(g.romaji)), got.map(g => g.reading + ' | ' + g.romaji))
    const pr1 = c.japanesePronunciationAlignment({ japanese: '元気だよ。', reading: '元気だよ。', romaji: 'genki da yo.' })
    const pr2 = c.japanesePronunciationAlignment({ japanese: '元気だよ。', reading: 'げんきだよ。', romaji: 'げんき da yo.' })
    T('F2', '§66/§67 a reading with kanji → PRONUNCIATION fail ("reading still contains kanji"); romaji with kana → fail ("romaji contains kana or kanji")',
      pr1.some(p => /reading still contains kanji/.test(p)) && pr2.some(p => /romaji contains kana or kanji/.test(p)), [pr1, pr2])
  }
  {
    const S = learner('ja'); const c = S.c
    const turns = ['宇宙に行きたい。', '僕は宇宙が好き。', '彗星を見た？'].map((t, i) => ({ speaker: i % 2 ? 'B' : 'A', pair: { japanese: t, thai: t, reading: 'ウチュウ宇宙', romaji: '宇宙 ni', english: 'x' } }))
    const frozen = turns.map(tn => tn.pair.japanese)
    let calls = 0, asked = null
    c.mockGeminiGenerate = async (k, m, msgs) => { calls++; asked = msgs[msgs.length - 1].content; const items = JSON.parse(asked.match(/ITEMS \(JSON\): (\[.*\])/)[1])
      return JSON.stringify(items.map(it => ({ id: it.id, reading: it.span === '宇宙' ? 'うちゅう' : it.span === '彗星' ? 'すいせい' : '' }))) }
    const logs = [], tel = {}
    await c.japaneseListeningPronunciation(turns, S.vocab, { apiKey: KEY, model: 'gemini-2.5-flash-lite' }, m => logs.push(m), tel)
    T('F3', '§30/§33/§65 text FROZEN, readings repaired only: the bad reading/romaji fields are rebuilt; the Japanese sentences stay byte-for-byte unchanged',
      turns.every((tn, i) => tn.pair.japanese === frozen[i]) && turns.every(tn => !/[一-鿿]/.test(tn.pair.reading) && !/[぀-ヿ一-鿿]/.test(tn.pair.romaji)) &&
      turns[0].pair.reading === 'うちゅうにいきたい。' && /JA_TEXT_FREEZE intact \(3 lines byte-identical\)/.test(logs.join('\n')), turns.map(t => t.pair.reading + ' | ' + t.pair.romaji))
    T('F4', '§34 unresolved spans across ALL lines (宇宙 ×2, 彗星) go out in ONE batched request (no paid call per line), each answer kana-validated · alignment issues=0',
      calls === 1 && (asked.match(/"span":"宇宙"/g) || []).length === 2 && /"span":"彗星"/.test(asked) && tel.LISTENING_READING_FALLBACK_CALLS === 1 && /JA_READING_ALIGNMENT lines=3 issues=0 PASS/.test(logs.join('\n')), { calls, logs })
  }
  {
    const S = learner('ja')
    const r = await run(S, 'ja', {}, { speechStyle: 'natural' })
    const iFreeze = r.logs.findIndex(l => /LISTENING_TEXT_FREEZE ja/.test(l)), iCoh = r.logs.findIndex(l => /LISTENING_COHERENCE (PASS|FAIL)/.test(l)), iPipe = r.logs.findIndex(l => /JA_READING_PIPELINE/.test(l))
    const ls = r.track.listening.lines
    T('F5', '§30/§51 order: generation + repair + coherence → TEXT FREEZE → readings / romaji → final QC; every line kana-only reading + clean romaji; PRONUNCIATION gate PASS; no reading request in scene prompts',
      iCoh >= 0 && iFreeze > iCoh && iPipe > iFreeze && ls.every(l => l.reading && !/[一-鿿]/.test(l.reading) && l.romaji && !/[぀-ヿ一-鿿]/.test(l.romaji)) &&
      r.track.listening.gates.PRONUNCIATION === true && !r.st.prompts.some(q => /^Write SCENE/.test(q) && /Give "reading" \(kana\)/.test(q)), { iCoh, iFreeze, iPipe })
  }
  // ══ §35 — Mandarin pinyin / target segmentation from Layer A ══
  {
    const S = learner('zh'); const c = S.c
    const lex = c.buildLanguageLexiconAdapter('zh', S.vocab).lexicon
    const segs = c.segmentMandarin('周末我们去公园。', lex)
    T('G1', '§35 Mandarin segmentation for pinyin uses the Layer A lexicon: 周末 → zhōumò, 公园 → gōngyuán as words (no per-character guess)',
      segs.some(s => s.surface === '周末' && s.pinyin === 'zhōumò') && segs.some(s => s.surface === '公园' && s.pinyin === 'gōngyuán'), segs.map(s => s.surface + ':' + s.pinyin))
  }
  // ══ §68 / §69 / §70 — v667 register, v666 complexity and the READY contract are preserved ══
  {
    const S = learner('ja')
    const r = await run(S, 'ja', {}, { speechStyle: 'natural' })
    const g = r.track.listening.gates
    T('H1', '§68 Natural Japanese Listening: friend scenes stay plain (JA_SCENE_REGISTER adult friends · expected plain) · JA_REGISTER_PASS is a hard gate and passes',
      (r.L.match(/JA_SCENE_REGISTER scene=LS\d relationship=adult friends speechStyle=natural expected=plain/g) || []).length >= 4 && g.JA_REGISTER_PASS === true && r.track.status === 'READY', g)
    T('H2', '§70 the Listening READY contract is unchanged: TARGET_COVERAGE · MAX3 · LENGTH · CLOSED_VOCAB · NO_DUPLICATES · BOTH_SPEAKERS · NO_MERGED · NO_SINGLETON · LINE_QUALITY · NATURALNESS · COHERENCE · PRONUNCIATION · TURN_BUDGET (+ JA_REGISTER_PASS)',
      ['TARGET_COVERAGE', 'COVERAGE_PASS', 'MAX3_PASS', 'LENGTH_PASS', 'CLOSED_VOCAB', 'NO_DUPLICATES', 'BOTH_SPEAKERS', 'NO_MERGED_SPEAKER_LINES', 'NO_SINGLETON_SCENES', 'LINE_QUALITY', 'NATURALNESS', 'WHOLE_CONVERSATION_COHERENCE', 'PRONUNCIATION', 'TURN_BUDGET', 'JA_REGISTER_PASS'].every(k => k in g), Object.keys(g))
    const cc = S.c.getLearnerComplexityContract({ lang: 'ja', vocab: S.vocab })
    T('H3', '§69 v666 two tiers preserved: Mukyu preferred 2–4, hardMax 6; 5–6 units ABOVE_PREFERRED_BUT_ALLOWED, 7 HARD_FAIL_TOO_COMPLEX (never preferredMax = hardMax)',
      cc.preferredMin === 2 && cc.preferredMax === 4 && cc.hardMax === 6 && cc.preferredMax !== cc.hardMax, cc.belt)
  }
  // ══ §53 / §72 / §74 — one flow, shared API, no repair-first composer ══
  {
    const src = fs.readFileSync(process.env.TT_SRC || 'tt.jsx', 'utf8')
    const c = learner('ja').c
    T('I1', '§72 shared API exists: buildLanguageLexiconAdapter · buildLearnerAuthorizedInventory(lang, snapshot) · buildScenePalette · validateClosedWorldCandidate · validateScenePreflight',
      ['buildLanguageLexiconAdapter', 'buildLearnerAuthorizedInventory', 'buildScenePalette', 'validateClosedWorldCandidate', 'validateScenePreflight', 'snapshotLearnerInventory'].every(f => typeof c[f] === 'function'), null)
    T('I2', '§53/§74 the whole-conversation composer and its whole-track REVISE rounds are removed (one scene-transaction flow); no prompt sends "KNOWN WORDS: <900 words>"; repairs never send a forbidden list',
      !/'Write ONE natural ' \+ la\.label/.test(src) && !/REVISE this ' \+ la\.label/.test(src) && !/LISTENING_REPAIR_ROUNDS/.test(src) && !/'KNOWN WORDS: ' \+ known/.test(src) && !/DO NOT USE: ' \+ u\.forbidden/.test(src), null)
    const zhS = learner('zh'); const z = zhS.c
    const v = z.validateClosedWorldCandidate('zh', '我们去吧。', zhS.vocab, [])
    T('I3', '§47/§48 the function scaffold is narrow and explicit (ZH 的/了/吗/呢 …, JA particles / copula / inflection, TH particles) — lexical words (weekend, hotel, weather, park) are never "free grammar"',
      ['的', '了', '吗', '呢'].every(x => z.languageFunctionScaffold('zh').forms.includes(x)) && !['周末', '酒店', '天气', '公园'].some(x => z.languageFunctionScaffold('zh').forms.includes(x)) &&
      !['週末', 'ホテル', '天気', '公園'].some(x => c.languageFunctionScaffold('ja').forms.includes(x)) && ['は', 'が', 'です', 'ます', 'て'].every(x => c.languageFunctionScaffold('ja').forms.includes(x)) && v.ok, v)
  }

  console.log(out.join('\n'))
  console.log(fails ? fails + ' FAILED of ' + n : 'all passed (' + n + ' checks)')
  process.exitCode = fails ? 1 : 0
})().catch(e => { console.log('CRASH', e && e.stack); process.exitCode = 1 })
