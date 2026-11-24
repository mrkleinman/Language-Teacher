// 24 Nov — JAPANESE: "STUDY WHAT'S READY" ON THE GENERATION-NEEDS-A-RECALL SCREEN (v778). In a Japanese Daily generation that ends with a recall still missing (and not used up), the screen "Generation needs 1 more recall" offered
// only Retry missing recall / Start over / Back, so the 89 verified recalls could not be played. The learner now gets "Study what's ready (89/90)": the verified recalls are assembled into a track that goes through the SAME function the app
// already uses when a recall is used up (finishJapaneseIncomplete) and the SAME final audit, ends NOT_READY with the missing recall named, and the saved draft is kept so "Retry missing recalls" still works on the next screen.
// Real application functions throughout (the generator screen, the final audit, the quota recovery, the saved draft, the screens); the only things scripted are the model transport and, to bring the generator to a recall that
// cannot be completed, the generator's own result (generateJapaneseTrack / recoverJapaneseMissingRecall return a partial built from the application's own record writers). Every model request is counted.
//   A  THE SWITCH     jaStudyReadySetEnabled / jaStudyReadyOn, ON by default
//   B  THE SCREEN     the recover screen for 89/90: the button (label, place, N/M), the plain text under the card, what is true about credit; not with the switch off
//   C  THE PRESS      finishJapaneseIncomplete, the log line, NOT_READY 89/90 with the missing recall named, no request to write the missing recall (counted), the draft kept, nothing saved before "Study anyway", the done screen's two buttons
//   D  SAME AUDIT     the final audit after the press is the one the used-up case runs: same requests for the other words, same verdict
//   E  COST LIMIT     COST_LIMIT_REACHED on the screen, the button works, no paid request for the missing recall
//   F  RECOVERING     the button is disabled while a retry runs; Retry itself is unchanged (recovers, or keeps the screen), and works after the press too (from the done screen)
//   G  SAVED DRAFT    the Japanese saved-draft screen: the same choice (Japanese only), never for another selection; the draft stays a draft until the learner studies the track
//   H  CREDIT         what a word with 2 of 3 recalls gets when the track is studied (the code, not a claim)
//   I  SAFETY         switch off = the unchanged v777 build (fixtures/ja-study-ready-v777-reference.json) · Thai / Mandarin / Cantonese / Listening / Topic code and screens identical · the 30 words, the 90 pairs, the closed vocabulary
//   node tests118.js            (current build: tt.compiled.js, or TT_FILE)      TT_PROBE=1 prints the v777 reference values this suite compares against (run it on the unchanged v777 build)
'use strict'
const fs = require('fs')
const crypto = require('crypto')
const { load } = require('./harness')
const t14 = require('./tests14')
const React = require('react'), TR = require('react-test-renderer')
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const out = []; let fails = 0, n = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + String(id).padEnd(4) + ' ' + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 900) : '')) }
const info = m => out.push('     · ' + m)
const FILE = process.env.TT_FILE || 'tt.compiled.js'
const SRC = fs.readFileSync(__dirname + '/tt.jsx', 'utf8')
const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex').slice(0, 16)
const textOf = x => x == null ? '' : typeof x === 'string' ? x : Array.isArray(x) ? x.map(textOf).join(' ') : textOf(x.children)
const ws = s => String(s).replace(/\s+/g, ' ').trim()
const tx = inst => ws(textOf(inst && inst.children))
const flush = async (k = 20) => { for (let i = 0; i < k; i++) await new Promise(r => setImmediate(r)) }
const quiet = c => { c.console.info = () => {}; c.console.warn = () => {}; c.console.error = () => {}; return c }
const has = (c, name) => typeof c[name] === 'function'
const clone = x => JSON.parse(JSON.stringify(x))
const SWITCH = 'jaStudyReady'
const setSwitch = (c, on) => { has(c, SWITCH + 'SetEnabled') && c[SWITCH + 'SetEnabled'](on); return c }
const OLD = c => setSwitch(c, false)                                       // the new switch off: the build must be v777
const DRAFTKEY = 'tt-ja-gen-checkpoint'
const BTN = (R, re) => R.root.findAll(x => x.type === 'button' && typeof x.props.onClick === 'function' && re.test(tx(x)))[0]
const BTNS = R => R.root.findAll(x => x.type === 'button').map(tx)

// ── THE WORLD: the Japanese learner of tests14 (30 words, every one already learned), the app loaded with the real React, the model transport scripted ──────────────────────────────────────────────────────────────
function mkWorld() {
  const c = quiet(load(FILE, { realBelt: true, React }))
  const vocab = c.initJapaneseVocab()
  vocab.forEach(w => { w.status = w.status === 'locked' ? 'learning' : (w.status === 'new' ? 'learning' : w.status); w.lastSeen = '2026-09-20'; w.introducedAt = '2026-09-01'; w.repCount = 3 })
  const targets = vocab.filter(w => w.id <= 80 && ![31, 32].includes(w.id) && !['それ', '今', 'いい'].includes(w.japanese) && !/[\/｜|]/.test((w.reading || '') + (w.romaji || ''))).sort((a, b) => a.id - b.id).slice(0, 30)
  return { c, vocab, targets }
}
const SCENE = { scene: 'Two friends meet', setting: 'a cafe', characterA: 'Daiki', characterB: 'Mio', opening: 'こんにちは', opening_english: 'Hello', premise: 'x' }
// a generation that stopped with recalls missing: every other recall verified (with its own check history in the run's ledger), the missing ones with `checks` checks used (11 = used up = EXHAUSTED_AT_11)
// miss: [{ ti: target index, r: recall index, checks, terminal }]
function makePartial(W, targets, o) {
  const c = W.c, opt = o || {}, miss = opt.miss || [{ ti: 4, r: 2, checks: 5, terminal: false }]
  const tc = c.jaGeneratorTrackContext(targets, null, 'daily', 'natural', 'run-fixture')
  const tier = c.ev('JA_TIER_SOURCE'), L = c.beginGenerationLedger('ja')
  const isMiss = (ti, r) => miss.some(m => m.ti === ti && m.r === r)
  const perTarget = targets.map((t, ti) => [1, 2, 3].filter(r => !isMiss(ti, r)).map(r => {
    const s = t14.sentence(W, 'ja', W.targets[ti], 'gen', r - 1)
    L.attempt(t.id, r, { kind: 'model' }); L.settle(t.id, r, 'accepted', '')
    const pair = { speaker: s.speaker, thai: s.japanese, japanese: s.japanese, reading: s.reading || '', phonetic: s.romaji || '', romaji: s.romaji || '', english: s.english || '', prompt: s.prompt || s.english || '',
      segments: s.segments || [], words: (s.segments || []).map(x => ({ p: x.romaji || x.surface, e: x.english || '' })), wordId: t.id, targetId: t.id, _target: t.japanese, recallIndex: r,
      sourceCheck: 1, checkTier: 1, _checkCount: 1, _checkHistory: L.history(t.id, r), _source: tier(1), _framing: false }
    return c.stampPairProvenance(pair, c.jaPairProvenance(tc, t, r, 'generation'))
  }))
  miss.forEach(m => { for (let k = 0; k < m.checks; k++) { L.attempt(targets[m.ti].id, m.r, { kind: 'model' }); L.settle(targets[m.ti].id, m.r, 'rejected', 'not natural') } })
  const frame = sp => ({ _framing: true, speaker: sp, japanese: 'こんにちは。', reading: 'こんにちは。', romaji: 'konnichiwa.', english: 'Hello.', prompt: 'greet', segments: [], language: 'ja' })
  const missingRecalls = miss.map(m => ({ targetId: targets[m.ti].id, targetIdx: m.ti, targetJapanese: targets[m.ti].japanese, recallIndex: m.r, lastFailure: 'not natural', ...(m.terminal ? { exhausted: true, terminal: 'EXHAUSTED_AT_11' } : {}) }))
  const got = 90 - miss.length
  return { complete: false, trackContext: tc, costGuard: null, generationStats: null, checkLedger: L.snapshot(), perTarget, open: [frame('A'), frame('B')], close: [frame('A'), frame('B')], scene: { ...SCENE },
    scenePlan: null, seenMap: new Map(), missingRecalls, recallCount: got, expectedRecallCount: 90, buildingBlocks: [], allowedContent: [], framingCount: 4 }
}
// the Japanese generator screen over a generation that ends in `partial`; the scene call, the generator and the auto-recovery are the scripted parts, everything else is the application
// o.recover: what the auto-recovery / Retry does (default: the missing recall cannot be completed) · o.cost: the whole-track limit has been reached · o.draftOnly: do not press Generate (a saved draft is on disk)
async function openGen(W, o) {
  const c = W.c, opt = o || {}, targets = opt.targets || W.targets.map(t => ({ ...t, selectionRole: 'review' }))
  const H = { c, W, targets, prompts: [], given: null, downloads: [], realRecover: c.recoverJapaneseMissingRecall, gens: 0 }
  H.partial = opt.partial || makePartial(W, targets, opt)
  c.generateJapaneseScene = async () => ({ ...SCENE })
  c.generateJapaneseTrack = async () => { H.gens++; return { ...H.partial } }
  c.recoverJapaneseMissingRecall = opt.recover || (async part => ({ ...part, recovered: null, lastRecoveryFailure: 'could not be completed' }))
  if (opt.cost) { const real = c.createJaCostGuard; c.createJaCostGuard = (...a) => { const g = real(...a); g.hardStop = g.triggered = true; g.reason = 'COST_LIMIT_REACHED: 166 paid generation requests > track limit 165'; return g } }
  c.downloadJapaneseGenLog = l => { H.downloads.push(l) }
  t14.mock(W, 'ja')
  const inner = W._mockFn
  c.mockGeminiGenerate = async (k, m, msgs, max, op) => { const q = msgs[msgs.length - 1].content, g = /JAPANESE TARGET: ★ ([^\s\[]+)|TARGET WORDS \(each needs exactly 3 sentences\):\n★ ([^\s\[=]+)/.exec(q)
    H.prompts.push({ stage: op && op.stage, gen: !!g, target: g ? (g[1] || g[2]) : null }); return inner(k, m, msgs, max, op) }
  const el = React.createElement(c.JapaneseGenerator, { vocab: W.vocab, targets, selection: null, trackMode: opt.trackMode || 'daily', tracks: [], register: 'natural', cred: { geminiKey: 'k' }, onGenerated(t) { H.given = t }, onBack() { H.back = true } })
  await TR.act(async () => { H.R = TR.create(el); await flush(60) })
  H.btn = re => BTN(H.R, re)
  H.press = async (re, k) => { const b = H.btn(re); if (!b) return false; await TR.act(async () => { b.props.onClick(); await flush(k || 40) }); return true }
  H.text = () => ws(textOf(H.R.toJSON()))
  H.buttons = () => BTNS(H.R)
  H.log = async () => { const b = H.R.root.findAll(x => x.type === 'button' && /log/.test(tx(x)))[0]; const n0 = H.downloads.length; if (b) await TR.act(async () => { b.props.onClick(); await flush(4) }); return H.downloads.length > n0 ? H.downloads[H.downloads.length - 1] : [] }
  H.unmount = async () => { await TR.act(async () => { H.R.unmount() }) }
  if (!opt.draftOnly) { await H.press(/Generate Track from this Scene/, 400) }
  return H
}
// wait for the quality check that follows a press to finish (the done screen offers "Study ...")
async function untilDone(H, ms) { const t0 = Date.now(); while (Date.now() - t0 < (ms || 60000)) { if (H.btn(/Study (track|anyway)/)) return true; await TR.act(async () => { await flush(30) }) } return false }
const genCalls = H => H.prompts.filter(p => p.gen)
const NORM = s => String(s).replace(/\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z/g, 'TS')     // the track id is the clock at the start of the generation
const treeHash = H => sha(NORM(JSON.stringify(H.R.toJSON())))
const HT = x => process.env.TT_PROBE_RAW ? NORM(x) : sha(NORM(x))       // TT_PROBE_RAW=1 prints the screen text itself (to see what differs between two runs)
// a saved draft of THIS selection, as the application keeps it (89 verified recalls, the rest of the generation inside)
async function putDraft(W, targets, o) {
  const c = W.c, opt = o || {}, partial = opt.partial || makePartial(W, targets, opt)
  const inv = c.japaneseLearnerInventory(W.vocab, targets), cp = c.genCheckpointCreate('ja', { targets, authorisedWords: inv.allContent.map(w => w.japanese) })
  partial.perTarget.flat().forEach(p => c.genCheckpointAddPair(cp, p))
  cp.status = 'incomplete'; cp.extra = { partial: c.jaPartialToJSON(partial) }; if (opt.resumes) cp.resumes = opt.resumes
  await c.genCheckpointWrite('ja', cp); return { cp, partial }
}

// ── THE FINAL AUDIT FOR THE OTHER LANGUAGES: a track with a word short of a recall, through the real finaliser (the same code the Japanese track meets after "Study what's ready") ──────────────────────────
const LOGN = s => String(s).replace(/\d+(\.\d+)?\s?ms\b/g, 'N ms')
async function finaliseHash(lang) {
  const S = t14.setup(lang); S.targets = S.targets.slice(0, 12); t14.mock(S, lang)
  const tr = t14.makeTrack(S, lang, { tag: '-ref', counts: { [S.targets[0].id]: 2 } }); tr.targetPlan = { planned: 12, shortByDesign: true, wordCap: 30 }
  const log = [], t = await S.c.finaliseMainTrack(tr, S.c.ev('TRACK_ADAPTERS')[lang], { vocab: S.vocab, apiKey: 'k', model: 'gemini-2.5-flash-lite', qcRan: true, onLog: m => log.push(LOGN(m)) })
  const f = { th: 'thai', ja: 'japanese', zh: 'chinese' }[lang]
  return sha(JSON.stringify({ st: t.integrity.status, reasons: t.integrity.reasons, counts: t.integrity.counts, log: log.filter(l => !/(tokens|USD|\$|usage|elapsed)/i.test(l)), pairs: t.pairs.map(p => p[f]) }))
}
// what the shared saved-draft choice shows for Thai and Mandarin (the component is shared; its code and its screens must not change)
async function choiceText(lang, o) {
  const c = quiet(load(FILE, { realBelt: true, React })), label = { th: 'Thai', zh: 'Mandarin' }[lang]
  const offer = { cp: { accepted: [] }, compat: o && o.bad ? { ok: false, reason: 'the draft has already been retried 3 times (limit 3)' } : { ok: true, reason: '' }, summary: { accepted: 89, expected: 90, missing: [{ targetId: 5, recallIndex: 2, target: '喝' }], resumes: 1 } }
  let R; await TR.act(async () => { R = TR.create(React.createElement(c.GenCheckpointChoice, { offer, total: 90, langLabel: label, unitLabel: lang === 'th' ? 'target pairs' : undefined, onRetryMissing() {}, onStartNew() {}, onBack() {} })); await flush(4) })
  const s = sha(JSON.stringify(R.toJSON())); await TR.act(async () => { R.unmount() }); return s
}
const CODE = ['Generator', 'MandarinGenerator', 'CantoneseGenerator', 'GenCheckpointChoice', 'ListenFirstGate', 'ListeningTrackButton', 'TopicsView', 'TopicWordsView', 'GenerationBrickGrid', 'GenerationLiveLog']

// ── THE v777 REFERENCE: what the unchanged v777 build shows and does, recorded before any change (TT_PROBE=1 node tests118.js on the v777 build; the new build, its switch off, must reproduce every value) ──────────
async function probe(on) {
  const R = {}
  const W0 = mkWorld(); setSwitch(W0.c, !!on)
  // the recover screen for an 89/90 generation (the missing recall has 5 of its 11 checks used), as the learner sees it: text, the whole tree, the buttons
  { const W = mkWorld(); setSwitch(W.c, !!on); const H = await openGen(W); R.recover89 = { text: HT(H.text()), tree: treeHash(H), buttons: H.buttons() }; await H.unmount() }
  { const W = mkWorld(); setSwitch(W.c, !!on); const H = await openGen(W, { cost: true }); R.recoverCost = { text: HT(H.text()), tree: treeHash(H), buttons: H.buttons() }; await H.unmount() }
  { const W = mkWorld(); setSwitch(W.c, !!on); const H = await openGen(W, { miss: [{ ti: 4, r: 2, checks: 5 }, { ti: 4, r: 3, checks: 0 }, { ti: 9, r: 1, checks: 2 }] }); R.recover87 = { text: HT(H.text()), tree: treeHash(H), buttons: H.buttons() }; await H.unmount() }
  // Retry, the recall still cannot be completed: the same screen with "Retry 1 failed"
  { const W = mkWorld(); setSwitch(W.c, !!on); const H = await openGen(W); await H.press(/Retry missing recall/, 40); R.recoverRetried = { text: HT(H.text()), tree: treeHash(H) }; await H.unmount() }
  // the used-up case (every missing recall at 11/11): the track finishes by itself and the done screen offers Study anyway / Retry missing recalls
  { const W = mkWorld(); setSwitch(W.c, !!on); const H = await openGen(W, { miss: [{ ti: 4, r: 2, checks: 11, terminal: true }] }); await untilDone(H)
    const head = H.R.root.findAll(x => x.type === 'div' && /Track not ready|Track ready/.test(tx(x)))[0]
    R.doneUsedUp = { actions: H.buttons().filter(t => /Retry|Study|quality|Back/.test(t)), head: head ? tx(head).slice(0, 40) : null, states: null }; await H.unmount() }
  // a saved draft on disk, the Japanese generator opens on its "Saved Japanese draft" screen
  { const W = mkWorld(); setSwitch(W.c, !!on); const tg = W.targets.map(t => ({ ...t, selectionRole: 'review' })); await putDraft(W, tg)
    const H = await openGen(W, { draftOnly: true, targets: tg, partial: makePartial(W, tg) }); await flush(40); R.draftJa = { text: HT(H.text()), tree: treeHash(H), buttons: H.buttons() }; await H.unmount() }
  R.choice = { th: await choiceText('th'), zh: await choiceText('zh'), thBad: await choiceText('th', { bad: true }), zhBad: await choiceText('zh', { bad: true }) }
  R.fin = { th: await finaliseHash('th'), ja: await finaliseHash('ja'), zh: await finaliseHash('zh') }
  R.code = {}; CODE.forEach(k => { R.code[k] = W0.c.ev('typeof ' + k) === 'function' ? sha(W0.c.ev('(' + k + ')').toString()) : null })
  return R
}

;(async () => {
  if (process.env.TT_PROBE) { console.log(JSON.stringify(await probe(false), null, 1)); process.exit(0) }
  const REF = JSON.parse(fs.readFileSync(__dirname + '/fixtures/ja-study-ready-v777-reference.json', 'utf8'))
  // each test runs on its own: one that cannot even start (a button that does not exist yet) fails by itself and says why, the rest go on
  const TT = async (id, name, fn) => { try { const r = await fn(); T(id, name, !!(r && r[0]), r && r[1]) } catch (e) { T(id, name, false, 'threw: ' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')) } }
  const STUDY = /Study what's ready \(/
  const studyBtn = H => H.btn(STUDY)
  const noteOf = H => H.R.root.findAll(x => x.props && x.props['data-ja-study-ready-note'] === '1')[0]
  const OLDREASON = 'there is no "Study what\'s ready" button on the screen'
  const finished = async (H, ms) => { const ok = await untilDone(H, ms || 90000); return ok }
  const draftNow = async c => { try { return await c.genCheckpointLoad('ja') } catch (e) { return null } }
  const BANNED = /qwen|anthropic|claude|openai|gpt-|openrouter|deepseek|mistral|groq|ollama|huggingface|together\.ai|fallbackProvider|secondaryProvider|fallbackModel|secondaryModel|alternateModel|haiku|sk-or-|x-api-key|chat\/completions/i

  // ═══ A — THE SWITCH ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
  await TT('A0', 'the switch exists (a setter and a reader) and is ON by default', async () => { const c = quiet(load(FILE, { realBelt: true, React }))
    return [has(c, SWITCH + 'SetEnabled') && has(c, SWITCH + 'On') && c[SWITCH + 'On']() === true, { setter: has(c, SWITCH + 'SetEnabled'), reader: has(c, SWITCH + 'On') }] })
  await TT('A1', 'the reader follows the setter (off then on again)', async () => { const c = quiet(load(FILE, { realBelt: true, React }))
    if (!has(c, SWITCH + 'SetEnabled')) return [false, 'no switch']
    c.jaStudyReadySetEnabled(false); const off = c.jaStudyReadyOn(); c.jaStudyReadySetEnabled(true); return [off === false && c.jaStudyReadyOn() === true, { off }] })

  // ═══ B — THE SCREEN ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
  await TT('B1', 'the recover screen of an 89/90 generation: "Study what\'s ready (89/90)", under "Retry missing recall" and above "Start over" (Back last); Retry, Start over and Back are still there',
    async () => { const W = mkWorld(), H = await openGen(W), b = H.buttons(), at = re => b.findIndex(t => re.test(t))
      const head = /Generation needs 1 more recall/.test(H.text()), r = at(/Retry missing recall/), s = at(STUDY), o = at(/^Start over/), k = at(/^Back$/)
      const label = s >= 0 ? b[s] : null; await H.unmount()
      return [head && r >= 0 && s === r + 1 && o === s + 1 && k === o + 1 && label === '▶ Study what\'s ready (89/90)', { buttons: b, why: s < 0 ? OLDREASON : '' }] })
  await TT('B2', 'under the missing-recall card, a plain note: what Retry does, what "Study what\'s ready" does, that the draft stays saved (Daily) — and no claim about credit for a missing recall',
    async () => { const W = mkWorld(), H = await openGen(W), nt = noteOf(H); if (!nt) { await H.unmount(); return [false, 'no note under the card: ' + OLDREASON] }
      const t = tx(nt), kids = (H.R.toJSON().children || []).map(x => x && x.props ? (x.props['data-ja-study-ready-note'] ? 'NOTE' : x.type) : '-'), card = kids.indexOf('NOTE') - 1
      const word = W.targets[4].japanese; await H.unmount()
      return [/Retry missing recall: one more try at the missing recall \(a recall gets 11 checks at most\)\./.test(t) &&
        /Study what's ready builds the track from the 89 verified recalls and runs the usual quality check, without another try at the missing recall\./.test(t) &&
        new RegExp('The track is marked not ready, and the missing recall is not in it \\(' + word + ': 2 of 3 recalls\\)\\.').test(t) &&
        /Your word progress changes only when you rate the words at the end, as always\./.test(t) &&
        /Your draft stays saved, so the next screen still offers Retry missing recalls\./.test(t) && !/credit|penalt|lost|worse|half/i.test(t) && card === 1, { t, kids: kids.slice(0, 4) }] })
  await TT('B3', 'three missing recalls of two words (87/90): the label says (87/90), the note names each word with its own count of recalls',
    async () => { const W = mkWorld(), H = await openGen(W, { miss: [{ ti: 4, r: 2, checks: 5 }, { ti: 4, r: 3, checks: 0 }, { ti: 9, r: 1, checks: 2 }] }), nt = noteOf(H), t = nt ? tx(nt) : '', b = H.buttons()
      const w4 = W.targets[4].japanese, w9 = W.targets[9].japanese; await H.unmount()
      return [b.some(x => /Study what's ready \(87\/90\)/.test(x)) && new RegExp(w4 + ': 1 of 3 recalls').test(t) && new RegExp(w9 + ': 2 of 3 recalls').test(t) && /builds the track from the 87 verified recalls/.test(t), { b, t: t.slice(0, 400) }] })
  await TT('B4', 'a Revision track (no saved draft exists for it): the same button and note, without the sentence about the draft',
    async () => { const W = mkWorld(), H = await openGen(W, { trackMode: 'revision' }), nt = noteOf(H), t = nt ? tx(nt) : '', has = !!studyBtn(H); await H.unmount()
      return [has && /Study what's ready builds the track from the 89 verified recalls/.test(t) && !/draft/i.test(t), { has, t: t.slice(0, 400), why: nt ? '' : OLDREASON }] })
  await TT('B5', 'a generation with no verified recall at all (0/90) offers no "Study what\'s ready" (there is nothing to study)',
    async () => { const W = mkWorld(), targets = W.targets.map(t => ({ ...t, selectionRole: 'review' })), p = makePartial(W, targets)
      p.perTarget = targets.map(() => []); p.recallCount = 0; p.missingRecalls = targets.flatMap((t, ti) => [1, 2, 3].map(r => ({ targetId: t.id, targetIdx: ti, targetJapanese: t.japanese, recallIndex: r, lastFailure: 'not attempted' })))
      const H = await openGen(W, { targets, partial: p }), screen = /Generation needs 90 more recall ?s/.test(H.text()), b = H.buttons(), none = !b.some(t => STUDY.test(t)), hasRetry = b.some(t => /Retry missing recall/.test(t)); await H.unmount()
      return [screen && none && hasRetry, { b, screen }] })
  await TT('B6', 'the screen does not call the generator again by itself: it ran once, and the two other buttons still do what they did (Start over runs the generation again, Back goes back)',
    async () => { const W = mkWorld(), H = await openGen(W); const g0 = H.gens; await H.press(/^Start over/, 80); const g1 = H.gens; await H.press(/^Back$/, 10); await H.unmount()
      return [g0 === 1 && g1 === 2 && H.back === true, { g0, g1, back: H.back }] })

  // ═══ C — THE PRESS ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
  // one world for C, D and H: the learner presses the button on an 89/90 screen and lets the final checks finish
  const PW = mkWorld(), PH = await openGen(PW)
  const before = JSON.stringify(PW.vocab), g0 = PH.gens, p0 = PH.prompts.length
  const pressed = await PH.press(STUDY, 60)
  const doneOk = pressed ? await finished(PH) : false
  const log = pressed ? await PH.log() : []
  const doneText = PH.text(), doneButtons = PH.buttons()
  const cpAfter = await draftNow(PW.c)
  const handedBefore = PH.given
  const word = PW.targets[4].japanese
  await TT('C1', 'pressing it runs finishJapaneseIncomplete: the log says GENERATION_FINISHED_INCOMPLETE 89/90, that the learner chose it, names the missing recall (word r2), and that no further attempt is made; the screen goes on to the final checks and the done screen',
    async () => { const L = log.filter(l => /GENERATION_FINISHED_INCOMPLETE/.test(l))[0] || ''
      return [pressed && doneOk && /GENERATION_FINISHED_INCOMPLETE 89\/90/.test(L) && /the learner chose "Study what's ready"/.test(L) && L.includes(word + ' r2') && /no further attempt/.test(L) && /FINAL_TRACK \(ja\)/.test(log.join('\n')) &&
        /function studyWhatIsReady\(\)[^]{0,300}finishJapaneseIncomplete\(partial, \{ studyReady: true \}\)/.test(SRC), { pressed, doneOk, L: L.slice(0, 300), why: pressed ? '' : OLDREASON }] })
  await TT('C2', 'NO request is made to write the missing recall (counted at the transport): none for ' + word + ', the generator is not called again, and the final checks did use the transport for everything else (quality check)',
    async () => { const mine = genCalls(PH).filter(p => p.target === word), after = PH.prompts.length - p0
      return [pressed && mine.length === 0 && PH.gens === g0 && after > 0, { toWriteMissing: mine.length, generatorCalls: PH.gens - g0, requestsAfter: after, byTarget: genCalls(PH).map(p => p.target), why: pressed ? '' : OLDREASON }] })
  await TT('C3', 'the done screen is the one of the used-up case: "Study anyway — track not ready (89/90)", "Retry missing recalls (1) — the 89 verified recalls are kept", "Run quality check again", "Back"; the header says Track not ready (89/90)',
    async () => { const a = doneButtons.filter(t => /Retry|Study|quality|Back/.test(t))
      return [pressed && doneOk && a.length === 4 && /^↻ Retry missing recalls \( ?1 ?\) — the 89 verified recalls are kept$/.test(a[0]) && a[1] === '▶ Study anyway — track not ready (89/90)' && a[2] === '↻ Run quality check again' && a[3] === 'Back' && /Track not ready \(89\/90\)/.test(doneText), { a, why: pressed ? '' : OLDREASON }] })
  await TT('C4', 'the saved draft is kept: it still holds the 89 verified recalls (status incomplete) and nothing was handed to the app or changed in the word list before "Study anyway"',
    async () => [pressed && !!cpAfter && cpAfter.accepted.length === 89 && cpAfter.status === 'incomplete' && handedBefore === null && JSON.stringify(PW.vocab) === before, { cp: cpAfter && { n: cpAfter.accepted.length, st: cpAfter.status }, handedOver: handedBefore !== null, why: pressed ? '' : OLDREASON }])
  // the track the learner would study
  const sPressed = pressed ? await PH.press(/Study anyway/, 20) : false
  const T89 = PH.given, rd = T89 ? PW.c.trackReadiness(T89) : null, cpCleared = await draftNow(PW.c)
  await TT('C5', 'the finished track is NOT_READY at 89/90 with the missing recall named in unresolvedRecalls (word, recall 2, state STUDY_WHAT_IS_READY, last failure, noRecovery) and 89 valid target pairs of the 90 required',
    async () => { const u = (T89 && T89.unresolvedRecalls) || []
      return [!!T89 && T89.integrity.status === 'NOT_READY' && rd.validTargetPairs === 89 && rd.expectedTargetPairs === 90 && !rd.ready && u.length === 1 && u[0].target === word && u[0].recallIndex === 2 && u[0].state === 'STUDY_WHAT_IS_READY' && u[0].lastFailure === 'not natural' && u[0].noRecovery === true &&
        u[0].targetId === PW.targets[4].id && rd.unresolvedTargetIds.length === 1, { st: T89 && T89.integrity.status, valid: rd && rd.validTargetPairs, u, why: sPressed ? '' : 'the track was never handed over' }] })
  await TT('C6', 'the 30 words, the 90 target pairs and the closed-vocabulary check never change: SELECTED_TARGETS 30, 90 required, CLOSED_VOCAB_PASS, 30 keywords (the word with the missing recall among them)',
    async () => [!!T89 && T89.integrity.invariants.SELECTED_TARGETS === 30 && T89.integrity.counts.targetPairsRequired === 90 && T89.integrity.invariants.CLOSED_VOCAB_PASS === true && (T89.keywords || []).length === 30 && T89.keywords.some(k => k.japanese === word) && T89.selectedTargetIds.length === 30,
      { inv: T89 && T89.integrity.invariants && { s: T89.integrity.invariants.SELECTED_TARGETS, cv: T89.integrity.invariants.CLOSED_VOCAB_PASS }, kw: T89 && T89.keywords.length }])
  await TT('C7', '"Study anyway" hands the track to the app and clears the draft, exactly as before (the draft is kept only until the learner studies the track)', async () => [sPressed && !!T89 && cpCleared === null, { handed: !!T89, draftLeft: !!cpCleared }])
  // "Run quality check again" on that finished track runs the same final audit again: the left-out recall is still not written, the verdict is the same
  const qBefore = genCalls(PH).filter(p => p.target === word).length
  const qPressed = sPressed ? await PH.press(/Run quality check again/, 60) : false
  const qDone = qPressed ? await finished(PH) : false
  if (qDone) await PH.press(/Study anyway/, 20)
  const T89b = PH.given
  await TT('C8', 'the quality check run again on the finished track still leaves the recall out (no request writes it) and gives the same verdict, NOT_READY 89/90 with the recall still named',
    async () => [qPressed && qDone && genCalls(PH).filter(p => p.target === word).length === qBefore && !!T89b && T89b.integrity.status === 'NOT_READY' && PW.c.trackReadiness(T89b).validTargetPairs === 89 && (T89b.unresolvedRecalls || []).length === 1 && T89b.unresolvedRecalls[0].noRecovery === true,
      { qPressed, qDone, writes: genCalls(PH).filter(p => p.target === word).length - qBefore, st: T89b && T89b.integrity.status }])
  await PH.unmount()

  // ═══ D — THE SAME FINAL AUDIT AS THE USED-UP CASE ═════════════════════════════════════════════════════════════════════════════════
  const UW = mkWorld(), UH = await openGen(UW, { miss: [{ ti: 4, r: 2, checks: 11, terminal: true }] }); await finished(UH)
  const UL = await UH.log(); await UH.press(/Study anyway/, 20); const U89 = UH.given
  await TT('D1', 'the used-up case, the same words: the final audit writes the SAME recalls for the OTHER words (same requests by word) and gives the same verdict (status, counts, reasons); only the state of the named recall differs (EXHAUSTED_AT_11 there, STUDY_WHAT_IS_READY here)',
    async () => { const a = genCalls(UH).map(p => p.target).sort(), b = genCalls(PH).map(p => p.target).sort(), ia = U89 && U89.integrity, ib = T89 && T89.integrity
      return [!!U89 && !!T89 && JSON.stringify(a) === JSON.stringify(b) && ia.status === ib.status && JSON.stringify(ia.counts) === JSON.stringify(ib.counts) && JSON.stringify(ia.reasons) === JSON.stringify(ib.reasons) &&
        U89.unresolvedRecalls[0].state === 'EXHAUSTED_AT_11' && T89.unresolvedRecalls[0].state === 'STUDY_WHAT_IS_READY', { a, b, ra: ia && ia.reasons, rb: ib && ib.reasons, ca: ia && ia.counts, cb: ib && ib.counts }] })
  await TT('D2', 'the used-up case itself is unchanged: finishJapaneseIncomplete without the new option logs the old line ("every missing recall is EXHAUSTED_AT_11 … no recovery attempt left … no further paid calls") and names the recall with exactly the v777 fields',
    async () => { const L = UL.filter(l => /GENERATION_FINISHED_INCOMPLETE/.test(l))[0] || '', u = U89 && U89.unresolvedRecalls[0]
      return [/GENERATION_FINISHED_INCOMPLETE 89\/90 — every missing recall is EXHAUSTED_AT_11 \(.+ r2\) — no recovery attempt left; finishing NOT_READY with unresolvedRecalls named \(no further paid calls\)/.test(L) &&
        !!u && JSON.stringify(Object.keys(u)) === JSON.stringify(['targetId', 'target', 'recallIndex', 'state', 'lastFailure']) && u.state === 'EXHAUSTED_AT_11', { L: L.slice(0, 260), keys: u && Object.keys(u) }] })
  // the guard on its own: the real final audit over the assembled 89 pairs, with and without the mark that says the recall is left out
  const auditRun = async (marks, extra) => {
    const W = mkWorld(), c = W.c, targets = W.targets.map(t => ({ ...t, selectionRole: 'review' })), part = makePartial(W, targets, { miss: [{ ti: 4, r: 2, checks: 5 }] })
    const recalls = c.assembleRecallsByScene(part.perTarget, targets, null, { alternateSpeakers: true })
    let track = { ...c.jaTrackObject(part.trackContext, { pairs: [...part.open, ...recalls, ...part.close], scene: part.scene, scenePlan: null, buildingBlocks: [], allowedContent: [], recallCount: 89, framingCount: 4, generationStats: null }, targets, 'natural', 'm', 'daily') }
    if (marks) track.unresolvedRecalls = [{ targetId: targets[4].id, target: targets[4].japanese, recallIndex: 2, state: 'STUDY_WHAT_IS_READY', lastFailure: 'not natural', noRecovery: true }]
    if (extra) track = extra(track)
    t14.mock(W, 'ja'); const prompts = [], inner = W._mockFn
    c.mockGeminiGenerate = async (k, m, msgs, max, op) => { const q = msgs[msgs.length - 1].content, g = /JAPANESE TARGET: ★ ([^\s\[]+)|TARGET WORDS \(each needs exactly 3 sentences\):\n★ ([^\s\[=]+)/.exec(q); prompts.push(g ? (g[1] || g[2]) : null); return inner(k, m, msgs, max, op) }
    const log = []; const t = await c.finaliseMainTrack(track, c.ev('TRACK_ADAPTERS').ja, { vocab: W.vocab, apiKey: 'k', model: 'gemini-2.5-flash-lite', qcRan: true, onLog: m => log.push(m) })
    return { t, log, writes: prompts.filter(Boolean), word: targets[4].japanese, targets }
  }
  const A0 = await auditRun(false), A1 = await auditRun(true)
  await TT('D3', 'why the mark is needed (the audit as v777 has it): a missing recall that is NOT used up is written by the final audit (a request for it, the track gets its 90th target pair) — "no further request" cannot be had by calling finishJapaneseIncomplete alone',
    async () => [A0.writes.includes(A0.word) && A0.t.integrity.counts.targetPairs === 90, { writes: A0.writes, st: A0.t.integrity.status, n: A0.t.integrity.counts.targetPairs }])
  await TT('D4', 'with the mark, the final audit writes NOTHING for the left-out recall (no request, no 90th target pair), logs why in its own words, and leaves the track NOT_READY 89/90',
    async () => [!A1.writes.includes(A1.word) && A1.t.integrity.status === 'NOT_READY' && A1.t.integrity.counts.targetPairs === 89 && A1.log.some(l => /STUDY_WHAT_IS_READY/.test(l) && l.includes(A1.word)) && !A1.log.some(l => /CHECKS_EXHAUSTED/.test(l) && l.includes(A1.word)),
      { writes: A1.writes, st: A1.t.integrity.status, n: A1.t.integrity.counts.targetPairs, log: A1.log.filter(l => /QUOTA|STUDY|EXHAUSTED|UNMET/.test(l)).slice(0, 5) }])
  await TT('D5', 'the mark covers only the recalls it names: a DIFFERENT word whose line the audit removes is still recovered (a request for it), and the left-out recall of the first word still is not',
    async () => { const A2 = await auditRun(true, tr => { const k = tr.pairs.findIndex(p => p && p.targetId === tr.keywords[9].wordId && p.recallIndex === 1); tr.pairs[k] = { ...tr.pairs[k], _qcInvalid: 'naturalness: QC rejected this sentence' }; return tr })
      const w9 = A2.targets[9].japanese
      return [A2.writes.includes(w9) && !A2.writes.includes(A2.word) && A2.t.integrity.counts.targetPairs === 89, { writes: A2.writes, n: A2.t.integrity.counts.targetPairs }] })
  await TT('D6', 'a track that carries NO such mark is audited exactly as before, for Thai, Japanese and Mandarin (a word short of a recall: status, reasons, counts, log and lines hashed against v777)',
    async () => { const got = { th: await finaliseHash('th'), ja: await finaliseHash('ja'), zh: await finaliseHash('zh') }; return [JSON.stringify(got) === JSON.stringify(REF.fin), { got, want: REF.fin }] })

  // ═══ E — COST LIMIT ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
  const CW = mkWorld(), CH = await openGen(CW, { cost: true })
  const cText = CH.text(), cBtns = CH.buttons()
  const cPressed = await CH.press(STUDY, 60), cDone = cPressed ? await finished(CH) : false, cLog = cPressed ? await CH.log() : []
  await TT('E1', 'the whole-track cost limit reached: the screen still says "COST_LIMIT_REACHED — whole-track limit; NOT_READY" AND offers "Study what\'s ready (89/90)" (the way out the limit message never had)',
    async () => [/COST_LIMIT_REACHED — whole-track limit; NOT_READY/.test(cText) && cBtns.some(t => STUDY.test(t)) && cBtns.some(t => /Retry missing recall/.test(t)), { cBtns, why: cBtns.some(t => STUDY.test(t)) ? '' : OLDREASON }])
  await TT('E2', 'pressed under the cost limit: the track finishes NOT_READY 89/90 through the same path, and NO request writes the missing recall (the limit is not bypassed by the final audit)',
    async () => { const mine = genCalls(CH).filter(p => p.target === CW.targets[4].japanese); await CH.press(/Study anyway/, 20); const t = CH.given
      return [cPressed && cDone && !!t && t.integrity.status === 'NOT_READY' && CW.c.trackReadiness(t).validTargetPairs === 89 && mine.length === 0 && cLog.some(l => /GENERATION_FINISHED_INCOMPLETE 89\/90/.test(l)), { cPressed, cDone, mine: mine.length, st: t && t.integrity.status }] })
  await CH.unmount()

  // ═══ F — RECOVERING, AND RETRY ═══════════════════════════════════════════════════════════════════════════════════════════════
  await TT('F1', 'while a retry is running ("Recovering…") the button is disabled and pressing it does nothing; once the retry has ended it is enabled again',
    async () => { const W = mkWorld(); let release = null, hold = false
      const H = await openGen(W, { recover: async part => { if (hold) await new Promise(r => { release = r }); return { ...part, recovered: null, lastRecoveryFailure: 'could not be completed' } } })
      hold = true; const run = H.press(/Retry missing recall/, 30); await flush(30)
      const b = studyBtn(H), during = { disabled: !!(b && b.props.disabled), retryText: H.buttons().find(t => /Recover/.test(t)) || null }
      const before = H.text(); if (b) await TR.act(async () => { b.props.onClick(); await flush(10) })
      const stayed = H.text() === before && !H.btn(/Study anyway/)
      release && release(); await run; hold = false; await flush(30)
      const b2 = studyBtn(H), after = { disabled: !!(b2 && b2.props.disabled) }
      await H.unmount()
      return [!!b && during.disabled === true && /Recovering/.test(during.retryText || '') && stayed && !!b2 && after.disabled === false, { during, stayed, after, why: b ? '' : OLDREASON }] })
  await TT('F2', 'Retry is unchanged: with the transport answering, the Retry press writes the missing recall (a request for it), the track completes 90/90 and goes through the quality check to "Study track"',
    async () => { const W = mkWorld(), H = await openGen(W); H.c.recoverJapaneseMissingRecall = H.realRecover
      const w = W.targets[4].japanese; const ok = await H.press(/Retry missing recall/, 80), d = await finished(H); const mine = genCalls(H).filter(p => p.target === w).length
      const lab = H.buttons().filter(t => /Study/.test(t)); await H.press(/Study track/, 20); const t = H.given; await H.unmount()
      return [ok && d && mine >= 1 && /Study track/.test(lab.join('|')) && !!t && t.integrity.counts.targetPairs === 90 && !t.unresolvedRecalls, { mine, lab, n: t && t.integrity.counts.targetPairs, st: t && t.integrity.status }] })
  await TT('F3', 'Retry still works AFTER the press, from the done screen: "Retry missing recalls (1)" resumes the kept draft (only the missing recall is written), the track completes 90/90 and is READY',
    async () => { const W = mkWorld(), H = await openGen(W); await H.press(STUDY, 60); const d1 = await finished(H); const w = W.targets[4].japanese, p1 = genCalls(H).filter(p => p.target === w).length
      H.c.recoverJapaneseMissingRecall = H.realRecover
      const ok = await H.press(/Retry missing recalls/, 120)
      const d2 = await finished(H); const mine = genCalls(H).filter(p => p.target === w).length - p1; const lab = H.buttons().filter(t => /Study/.test(t)); await H.press(/Study track/, 20); const t = H.given; await H.unmount()
      return [d1 && ok && d2 && mine >= 1 && p1 === 0 && /Study track/.test(lab.join('|')) && !!t && t.integrity.status === 'READY' && t.integrity.counts.targetPairs === 90, { d1, ok, d2, mine, p1, lab, st: t && t.integrity.status, n: t && t.integrity.counts.targetPairs, why: d1 ? '' : OLDREASON }] })

  // ═══ G — THE SAVED-DRAFT SCREEN (Japanese only) ═══════════════════════════════════════════════════════════════════════════════
  const draftOpen = async (o) => { const W = mkWorld(), tg = W.targets.map(t => ({ ...t, selectionRole: 'review' })), d = await putDraft(W, tg, o); const H = await openGen(W, { draftOnly: true, targets: tg, partial: d.partial }); await flush(40); H.cp = d.cp; H.tg = tg; return H }
  const GH = await draftOpen()
  const gBtns = GH.buttons(), gText = GH.text()
  await TT('G1', 'the Japanese saved-draft screen offers, in this order: Retry missing recalls (1), "Study what\'s ready (89/90)", Start new generation (discards the 89 saved), Back — and says the draft stays saved until the track is studied',
    async () => { const at = re => gBtns.findIndex(t => re.test(t))
      return [at(/Retry missing recalls \(1\)/) === 0 && at(STUDY) === 1 && /^Start new generation/.test(gBtns[2] || '') && gBtns[3] === 'Back' && /Study what's ready makes a track from the 89 verified recalls/.test(gText) && /the draft stays saved until you study that track/.test(gText) && !/it is not playable/.test(gText), { gBtns, why: at(STUDY) < 0 ? OLDREASON : '' }] })
  const gPressed = await GH.press(STUDY, 60), gDone = gPressed ? await finished(GH) : false, gLog = gPressed ? await GH.log() : []
  const gCp = await draftNow(GH.c), gDoneBtns = GH.buttons().filter(t => /Retry|Study|quality|Back/.test(t))
  await TT('G2', 'pressed on the draft screen: the draft\'s 89 verified recalls go through finishJapaneseIncomplete and the final audit — NOT_READY 89/90 on the done screen with Study anyway and Retry missing recalls (1); no request writes the missing recall; the generator is never called',
    async () => { const mine = genCalls(GH).filter(p => p.target === GH.tg[4].japanese).length
      return [gPressed && gDone && gLog.some(l => /GENERATION_FINISHED_INCOMPLETE 89\/90/.test(l) && /the learner chose "Study what's ready"/.test(l)) && mine === 0 && GH.gens === 0 && /Study anyway — track not ready \(89\/90\)/.test(gDoneBtns.join('|')) && /Retry missing recalls/.test(gDoneBtns.join('|')),
        { gPressed, gDone, mine, gens: GH.gens, gDoneBtns, why: gPressed ? '' : OLDREASON }] })
  await TT('G3', 'a saved draft stays "not a lesson": after the press it is still there (89 accepted, status incomplete, retries unchanged) and no track was handed to the app and no word changed; only "Study anyway" hands the track over (and clears the draft, as before)',
    async () => { const handed0 = GH.given; const w0 = JSON.stringify(GH.W.vocab); await GH.press(/Study anyway/, 20); const t = GH.given, after = await draftNow(GH.c)
      return [gPressed && !!gCp && gCp.accepted.length === 89 && gCp.status === 'incomplete' && (gCp.resumes || 0) === 0 && handed0 === null && !!t && t.integrity.status === 'NOT_READY' && t.unresolvedRecalls.length === 1 && after === null && JSON.stringify(GH.W.vocab) === w0, { cp: gCp && { n: gCp.accepted.length, st: gCp.status, r: gCp.resumes }, handed0, st: t && t.integrity.status, after: !!after }] })
  await GH.unmount()
  { const H = await draftOpen({ resumes: 3 }), b = H.buttons()
    await TT('G4', 'a draft that has already been retried 3 times cannot be retried (the screen says so and the Retry button is gone) — and it is exactly where "Study what\'s ready" is offered, because nothing else is left but throwing the 89 away',
      async () => [!b.some(t => /Retry missing recalls/.test(t)) && b.some(t => STUDY.test(t)) && /already been retried 3 times/.test(H.text()), { b, why: b.some(t => STUDY.test(t)) ? '' : OLDREASON }])
    await H.unmount() }
  { const W = mkWorld(), tg = W.targets.map(t => ({ ...t, selectionRole: 'review' })); await putDraft(W, tg)
    const other = tg.slice(1).concat([{ ...W.vocab.find(w => w.id === 61), selectionRole: 'review' }]); const H = await openGen(W, { draftOnly: true, targets: other, partial: makePartial(W, other) }); await flush(40); const b = H.buttons()
    await TT('G5', 'a draft made for ANOTHER selection of words is never studied: the screen says it cannot be resumed and offers no "Study what\'s ready" (the draft belongs to other words)',
      async () => [/cannot be resumed/.test(H.text()) && !b.some(t => STUDY.test(t)) && !b.some(t => /Retry missing recalls/.test(t)) && b.some(t => /Start new generation/.test(t)), { b, text: H.text().slice(0, 300) }])
    await H.unmount() }
  { const W2 = mkWorld(), tg2 = W2.targets.map(t => ({ ...t, selectionRole: 'review' })), p2 = makePartial(W2, tg2, { miss: [] }); await putDraft(W2, tg2, { partial: p2 })
    // a draft with NOTHING missing is not a draft to study: it only needs its final checks (the original screen's wording)
    const H = await openGen(W2, { draftOnly: true, targets: tg2, partial: p2 }); await flush(40); const b = H.buttons()
    await TT('G6', 'a draft with nothing missing (90/90) shows "Finish the saved draft" and no "Study what\'s ready"', async () => [b.some(t => /Finish the saved draft/.test(t)) && !b.some(t => STUDY.test(t)), { b }])
    await H.unmount() }

  // ═══ H — WHAT A WORD WITH 2 OF 3 RECALLS GETS ═════════════════════════════════════════════════════════════════════════════════
  await TT('H1', 'the code credits progress ONLY from the learner\'s end-of-lesson rating of each keyword (onTrackComplete → applyRating / markWordKnown): the NOT_READY track keeps all 30 words as keywords to rate, the word with 2 of 3 recalls included, and nothing in that code reads recall counts or the integrity result',
    async () => { const kw = T89 && T89.keywords || [], w2 = kw.find(k => k.japanese === word), w3 = kw.find(k => k.japanese !== word)
      const i = SRC.indexOf('function onTrackComplete(keywords) {\n    const ratedIds = {}, knownIds'), tc = i >= 0 ? SRC.slice(i, i + 900) : ''
      return [kw.length === 30 && !!w2 && w2.rating === null && !!w3 && w3.rating === null && tc.length > 300 && !/integrity|unresolved|recallCount|perTarget|validTargetPairs/.test(tc) && /applyRating\(w, ratedIds\[w\.id\]\)/.test(tc), { kw: kw.length, w2: w2 && w2.rating, tcLen: tc.length }] })
  await TT('H2', 'a rating changes a word the same whatever its recall count (applyRating takes the word and the rating only), and the Player lists the word with the missing recall like every other keyword (no Japanese track sets the red UNRESOLVED badge)',
    async () => { const c = PW.c, base = { id: 1, status: 'learning', interval: 3, okStreak: 1, lapses: 0, repCount: 2 }, a = c.applyRating(base, 'ok'), b = c.applyRating({ ...base }, 'ok')
      return [JSON.stringify(a) === JSON.stringify(b) && c.applyRating.length === 2 && !!T89 && !(T89.keywords || []).some(k => k.unresolved), { len: c.applyRating.length }] })

  // ═══ I — SAFETY ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  const REFCHK = (got, want) => JSON.stringify(got) === JSON.stringify(want)
  await TT('I1', 'switch off = the unchanged v777 screens: the recover screen (89/90, with the cost limit, 87/90, after one failed Retry) is the same text, the same tree and the same buttons as the v777 build\'s (hashes recorded from it)',
    async () => { const got = {}; for (const [k, o] of [['recover89', {}], ['recoverCost', { cost: true }], ['recover87', { miss: [{ ti: 4, r: 2, checks: 5 }, { ti: 4, r: 3, checks: 0 }, { ti: 9, r: 1, checks: 2 }] }]]) {
        const W = mkWorld(); OLD(W.c); const H = await openGen(W, o); got[k] = { text: HT(H.text()), tree: treeHash(H), buttons: H.buttons() }; await H.unmount() }
      { const W = mkWorld(); OLD(W.c); const H = await openGen(W); await H.press(/Retry missing recall/, 40); got.recoverRetried = { text: HT(H.text()), tree: treeHash(H) }; await H.unmount() }
      const want = { recover89: REF.recover89, recoverCost: REF.recoverCost, recover87: REF.recover87, recoverRetried: REF.recoverRetried }
      return [REFCHK(got, want), { got, want }] })
  await TT('I2', 'switch off = v777 for the used-up case and the saved-draft screen too (done-screen actions and header; the Japanese draft screen: text, tree, buttons)',
    async () => { const W = mkWorld(); OLD(W.c); const H = await openGen(W, { miss: [{ ti: 4, r: 2, checks: 11, terminal: true }] }); await finished(H)
      const head = H.R.root.findAll(x => x.type === 'div' && /Track not ready|Track ready/.test(tx(x)))[0]; const done = { actions: H.buttons().filter(t => /Retry|Study|quality|Back/.test(t)), head: head ? tx(head).slice(0, 40) : null, states: null }; await H.unmount()
      const W2 = mkWorld(); OLD(W2.c); const tg = W2.targets.map(t => ({ ...t, selectionRole: 'review' })); await putDraft(W2, tg); const H2 = await openGen(W2, { draftOnly: true, targets: tg, partial: makePartial(W2, tg) }); await flush(40)
      const dr = { text: HT(H2.text()), tree: treeHash(H2), buttons: H2.buttons() }; await H2.unmount()
      return [REFCHK(done, REF.doneUsedUp) && REFCHK(dr, REF.draftJa), { done, dr, want: [REF.doneUsedUp, REF.draftJa] }] })
  await TT('I3', 'switch ON, the used-up case is the same as v777 (the button is for a recall that is NOT used up): done-screen actions and header identical',
    async () => { const head = UH.R.root.findAll(x => x.type === 'div' && /Track not ready|Track ready/.test(tx(x)))[0]; const got = { actions: UH.buttons().filter(t => /Retry|Study|quality|Back/.test(t)), head: head ? tx(head).slice(0, 40) : null, states: null }
      return [REFCHK(got, REF.doneUsedUp), { got, want: REF.doneUsedUp }] })
  await TT('I4', 'Thai, Mandarin and Cantonese are untouched: the code of their three generators, of the shared saved-draft choice, of the Listening gate and button and of the Topic screens hashes to v777\'s',
    async () => { const c = quiet(load(FILE, { realBelt: true, React })), got = {}; CODE.forEach(k => { got[k] = c.ev('typeof ' + k) === 'function' ? sha(c.ev('(' + k + ')').toString()) : null })
      const bad = Object.keys(REF.code).filter(k => got[k] !== REF.code[k]); return [bad.length === 0, { bad, got }] })
  await TT('I5', 'the shared saved-draft choice renders exactly as before for Thai and Mandarin (with a resume possible and with the retry limit reached)',
    async () => { const got = { th: await choiceText('th'), zh: await choiceText('zh'), thBad: await choiceText('th', { bad: true }), zhBad: await choiceText('zh', { bad: true }) }; return [REFCHK(got, REF.choice), { got, want: REF.choice }] })
  await TT('I6', 'the other Japanese screens are untouched: the generation error screens for other reasons (no key; a scene that cannot be built) read as before and carry nothing new',
    async () => { const W = mkWorld(), c = W.c, mk = async (cred, targets) => { let R; c.generateJapaneseScene = async () => null; await TR.act(async () => { R = TR.create(React.createElement(c.JapaneseGenerator, { vocab: W.vocab, targets, selection: null, trackMode: 'daily', tracks: [], register: 'natural', cred, onGenerated() {}, onBack() {} })); await flush(60) }); const t = ws(textOf(R.toJSON())); await TR.act(async () => { R.unmount() }); return t }
      const tg = W.targets.map(t => ({ ...t, selectionRole: 'review' })), a = await mk({ geminiKey: '' }, tg), b = await mk({ geminiKey: 'k' }, tg)
      return [/No API key configured/.test(a) && /Try again/.test(a) && /Could not build a scene/.test(b) && !/Study what's ready/.test(a + b), { a: a.slice(0, 120), b: b.slice(0, 120) }] })
  await TT('I7', 'the new text and code carry no model or provider name and no key (the same scan the source check runs), and nothing the new code stores holds a key',
    async () => { const i = SRC.indexOf('// ══ v778 — STUDY WHAT'), j = SRC.indexOf('// ══ end v778'); const block = i >= 0 && j > i ? SRC.slice(i, j) : ''
      return [block.length > 500 && !BANNED.test(block) && !/AIza|apiKey\s*[:=]\s*['"]/.test(block) && !/localStorage|stSet\(/.test(block), { len: block.length, why: i < 0 ? 'the v778 block is not in the source' : '' }] })

  console.log(out.join('\n') + '\n\n' + (fails ? fails + ' FAILED of ' + n : 'all passed (' + n + ' checks)'))
  process.exit(fails ? 1 : 0)
})()
