// v653 — JAPANESE GENERATION PARITY: Thai-style target-group generation (one structured request per
// target for its 3 recalls), slot-only regeneration, the visible 11-check lifecycle, the canonical
// duplicate context, concept identity, register-before-acceptance, derived-field (reading/romaji)
// repair without content regeneration, robust structured-output parsing, the shared language-neutral
// core and its telemetry. Real app functions in the node harness; Gemini simulated at geminiRequest.
// Usage: node tests18.js
const { load } = require('./harness')
const { setup, sentence, mock } = require('./tests14')
const out = []; let fails = 0
const T = (id, name, pass, detail) => { if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + id.padEnd(4) + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 1500) : '')) }
const info = m => out.push('     · ' + m)
const KEY = 'AIzaSyTEST-harness-key-000000', MODEL = 'gemini-2.5-flash-lite'
const SCENE = { scene: 'Two friends at a station', characterA: 'Kenji, a man', characterB: 'Yuki, a woman', opening: '', reply: '', closing: '', closing_reply: '' }
const allText = o => (o.messages || []).map(m => m.content).join('\n')
const UNTAUGHT = ['コーヒー', '飲み物', '運転', '紅茶', 'ラーメン', 'パン']
const setupJa = () => { const S = setup('ja'); S.vocab.forEach(w => { if (UNTAUGHT.includes(w.japanese)) Object.assign(w, { status: 'new', lastSeen: null, introducedAt: null, repCount: 0, dueDate: null, okStreak: 0 }) }); return S }
const rec = (S, t, n, extra) => { const s = sentence(S, 'ja', t, 'gen', (n - 1) % 3); return { intent: 'say something natural', japanese: s.japanese, reading: s.reading, romaji: s.romaji, englishCue: s.prompt, englishMeaning: s.english, segments: s.segments, blocks: [], basics: [], ...(extra || {}) } }
const untaught = (S, t, n) => { const b = rec(S, t, n); return { ...b, japanese: 'コーヒー' + b.japanese, reading: 'こーひー' + b.reading, romaji: 'koohii ' + b.romaji,
  segments: [{ surface: 'コーヒー', lemma: 'コーヒー', reading: 'こーひー', romaji: 'koohii', english: 'coffee', type: 'content' }, ...b.segments] } }
const slotsOf = text => /TARGET GROUP|REPLACEMENT ONLY/.test(text) ? [...text.matchAll(/• recall (\d) of 3/g)].map(m => +m[1]) : []
const targetOf = (S, text) => { const m = /JAPANESE TARGET: ★ ([^\s\[=]+)/.exec(text); return m ? S.targets.find(t => t.japanese === m[1]) : null }
// responder(t, slot, attemptForSlot, text) → recall object | undefined (the tests14 mock answers everything else)
function install(S, responder, wrap) {
  mock(S, 'ja')
  const inner = S.c.geminiRequest
  const calls = [], seen = new Map()
  S.c.geminiRequest = async o => {
    const text = allText(o); calls.push({ stage: o.stage || null, text, model: o.model, maxTokens: o.maxTokens, json: o.json || null })
    const t = targetOf(S, text), slots = slotsOf(text)
    if (t && slots.length && responder) {
      const recs = slots.map(n => { const k = t.id + ':' + n, a = (seen.get(k) || 0) + 1; seen.set(k, a); return responder(t, n, a, text) })
      if (recs.every(Boolean)) { const body = JSON.stringify({ targetId: 999999, targetConcept: 'MODEL-SAYS-SOMETHING-ELSE', recalls: recs }); return wrap ? wrap(body, t) : body }
    }
    return inner(o)
  }
  return calls
}
async function genJa(S, responder, o) {
  const x = o || {}
  const calls = install(S, responder, x.wrap)
  const run = S.c.aiBeginRun('ja-track')
  const tc = S.c.jaGeneratorTrackContext(S.targets.map((t, i) => ({ ...t, selectionRole: i >= 27 ? 'new' : 'review' })), { counts: { new: 3 } }, 'daily', x.register || 'natural', run)
  const logs = []
  const res = await S.c.generateJapaneseTrack(S.targets, S.vocab, x.register || 'natural', KEY, MODEL, () => {}, m => logs.push(m), { cancelled: false }, { ...SCENE }, { trackContext: tc, runId: run })
  return { res, calls, logs, run, tc, gen: S.c.aiGenerationStats(run), rows: S.c.ev('AI_GEN_LEDGER').filter(r => r.runId === run && r.phase === 'generation') }
}
const genCalls = calls => calls.filter(c => /^(A_generation|B_generation_retry)$/.test(c.stage || ''))

;(async () => {
  // ════ §2 TARGET GROUP: one structured request per target (30, not 90) ═══════════════════
  const SA = setupJa()
  const A = await genJa(SA, (t, n) => ({ ...rec(SA, t, n), targetId: 424242, recallIndex: 9, language: 'zh' }))
  const tp = (A.res.pairs || []).filter(p => p && p.isTargetPair)
  const gA = genCalls(A.calls), firstA = gA.filter(c => c.stage === 'A_generation')
  // the tests14 fixture frame "今{T}よ。" is genuinely invalid for the interjections ありがとう / すみません (recall 3):
  // the validators reject it, the same sentence comes back once, and the deterministic fallback fills that slot
  const BASE = gA.length, INTRINSIC = ['ありがとう', 'すみません']
  const retryA = gA.filter(c => c.stage === 'B_generation_retry')
  T('G1', '30 targets ⇒ 30 first-pass generation requests (one target group each, 3 recalls per reply) ⇒ 90 target pairs, complete; the only regenerations are the 2 fixture slots that are genuinely invalid',
    A.res.complete && tp.length === 90 && firstA.length === 30 && A.gen.firstAttempts === 30 && A.gen.recallsRequested === 90 && A.gen.targetGroups === 30 &&
    retryA.length === 2 && retryA.every(c => INTRINSIC.some(w => c.text.includes('JAPANESE TARGET: ★ ' + w + ' ')) && /REPLACEMENT ONLY: write 1 new sentence/.test(c.text)),
    { complete: A.res.complete, n: tp.length, calls: gA.length, gen: A.gen })
  info('clean run: ' + gA.length + ' paid generation requests for 90 recalls (30 target-group requests + 2 slot regenerations; v651: 90 first-attempt requests + regenerations)')
  T('G2', 'structured output: every group request carries the group JSON schema (recalls[] of the recall schema) and a 3200-token cap; the prompt asks for EXACTLY 3 recalls',
    firstA.every(c => c.json && c.json.properties && c.json.properties.recalls && c.json.properties.recalls.items && c.json.properties.recalls.items.properties.japanese && c.maxTokens === 3200 &&
      /TARGET GROUP: write 3 distinct recall sentences in ONE reply/.test(c.text) && /Return EXACTLY 3 recall\(s\)/.test(c.text)), gA[0] && gA[0].text.slice(-600))
  T('G3', 'authoritative IDs are injected locally: model-supplied targetId / recallIndex / language / targetConcept are ignored',
    tp.every(p => p.targetId !== 424242 && p.recallIndex >= 1 && p.recallIndex <= 3 && p.language === 'ja' && SA.targets.some(t => t.id === p.targetId)) &&
    SA.targets.every(t => [1, 2, 3].every(r => tp.some(p => p.targetId === t.id && p.recallIndex === r))) && SA.c.assertTrackPairsProvenance(A.res.pairs, 'ja').ok)
  T('G4', 'the three recalls are asked for as distinct useful variants (declarative core meaning · interaction · different context/form), same canonical concept, no forced variation',
    /recall 1 of 3 — a simple declarative that shows the core meaning/.test(gA[0].text) && /recall 2 of 3 — use in interaction/.test(gA[0].text) &&
    /recall 3 of 3 — a different everyday context, or another natural form of the word/.test(gA[0].text) && /Do not force unnatural variation/.test(gA[0].text) &&
    /TARGET CONCEPT: \S+ — any natural inflected form counts/.test(gA[0].text) && /Every recall must use this same concept/.test(gA[0].text))
  T('G5', '11-check lifecycle is visible per RECALL (v672: "⚪ 1st check: X · recall 1+2+3 · target-group request") — one group call is check 1 of each recall; JA_GENERATION_BUDGET logs checks per recall AND paid attempts',
    A.logs.some(l => /1st check: \S+ · recall 1\+2\+3 · target-group request \(3 recalls in one paid call\)/.test(l)) && A.logs.some(l => /🧾 decision \S+: r1=\w[\w-]*@\S+ r2=/.test(l)) &&   // v671 §B1: per-recall counts; the decision summary is not a check
    A.logs.filter(l => /JA_GENERATION_BUDGET target=/.test(l)).length === 30 && A.logs.every(l => !/check 1[2-9]\/11/.test(l)) &&
    A.rows.every(r => r.qualityChecks >= r.paidAttempts && r.qualityChecks <= 11), A.logs.filter(l => /check|BUDGET/.test(l)).slice(0, 6))
  const G5line = (A.logs.find(l => /JA_GENERATION_BUDGET target=/.test(l)) || '')
  info('per-target line: ' + G5line.trim())

  // ════ §5 SLOT-ONLY REGENERATION ════════════════════════════════════════════════════
  {
    const S = setupJa(); const bad = S.targets[4]
    const R = await genJa(S, (t, n, a) => (t.id === bad.id && n === 2 && a === 1) ? untaught(S, t, n) : rec(S, t, n))
    const gc = genCalls(R.calls), retry = gc.filter(c => c.stage === 'B_generation_retry' && c.text.includes('JAPANESE TARGET: ★ ' + bad.japanese + ' '))
    const first = gc.find(c => c.stage === 'A_generation' && c.text.includes('JAPANESE TARGET: ★ ' + bad.japanese + ' '))
    const r0 = retry[0] || { text: '' }
    const got = R.res.pairs.filter(p => p.isTargetPair && p.targetId === bad.id).sort((a, b) => a.recallIndex - b.recallIndex)
    T('S1', 'recall 1 PASS · recall 2 FAIL · recall 3 PASS ⇒ ONE extra paid request that asks ONLY for replacement recall 2 (clean run + 1)',
      gc.length === BASE + 1 && retry.length === 1 && /REPLACEMENT ONLY: write 1 new sentence/.test(r0.text) && /• recall 2 of 3/.test(r0.text) && !/• recall 1 of 3|• recall 3 of 3/.test(r0.text) &&
      /Return EXACTLY 1 recall\(s\)/.test(r0.text) && r0.maxTokens === 1400, { n: gc.length, retry: r0.text.slice(0, 400) })
    T('S2', 'the replacement request supplies: accepted recalls 1 and 3 · the duplicate-avoidance list · the exact previous failure · the target concept · the register · the allowed vocabulary',
      /ALREADY ACCEPTED FOR THIS TARGET:\n  - .+\n  - .+/.test(r0.text) && r0.text.includes(got[0].japanese) && r0.text.includes(got[2].japanese) &&
      /ALREADY USED IN THIS TRACK:/.test(r0.text) && /PREVIOUS FAILURES \(exact reasons\) — fix these:\n  recall 2: untaught content: コーヒー/.test(r0.text) &&
      new RegExp('TARGET CONCEPT: ' + bad.japanese).test(r0.text) && /REGISTER: NATURAL/.test(r0.text) && /ALLOWED CONTENT \(\d+\): /.test(r0.text) && /DO NOT USE \(not taught yet\): コーヒー/.test(r0.text), r0.text.slice(0, 1800))
    T('S3', 'the good recalls are kept, not regenerated: recalls 1 and 3 are the sentences of the first reply; recall 2 is the replacement',
      got.length === 3 && got[0].japanese === rec(S, bad, 1).japanese && got[2].japanese === rec(S, bad, 3).japanese && got[1].japanese === rec(S, bad, 2).japanese && !!first)
    const g = R.gen
    T('S4', 'telemetry: 30 first attempts + 1 slot regeneration; the replacement recall is "requiring 2 attempts", the other 89 resolved on the first call',
      g.firstAttempts === 30 && g.regenerationAttempts === A.gen.regenerationAttempts + 1 && g.requiring2 === A.gen.requiring2 + 1 && g.resolvedFirstAttempt === A.gen.resolvedFirstAttempt - 1, { g, base: A.gen })
  }

  // ════ §6 "ALREADY USED" ALWAYS VISIBLE ══════════════════════════════════════════════
  {
    const S = setupJa()
    const R = await genJa(S, (t, n) => rec(S, t, n))
    const gc = genCalls(R.calls)
    const tenth = gc[9]
    const prevT = S.targets[8], prevJa = R.res.pairs.filter(p => p.isTargetPair && p.targetId === prevT.id).map(p => p.japanese)
    T('D1', 'the canonical duplicate block is in EVERY Japanese generation request (headers ALREADY ACCEPTED FOR THIS TARGET / ALREADY USED IN THIS TRACK / DO NOT repeat or trivially paraphrase)',
      gc.length === BASE && gc.every(c => /ALREADY ACCEPTED FOR THIS TARGET:\n/.test(c.text) && /ALREADY USED IN THIS TRACK:\n/.test(c.text) && /DO NOT repeat or trivially paraphrase these\./.test(c.text)))
    T('D2', 'ALREADY USED IN THIS TRACK lists the sentences accepted for EARLIER targets (built from explicit state, not optional scope)',
      prevJa.length === 3 && prevJa.every(x => tenth.text.includes(x)) && /ALREADY USED IN THIS TRACK:\n  \(none yet\)/.test(gc[0].text), tenth.text.slice(tenth.text.indexOf('ALREADY ACCEPTED'), tenth.text.indexOf('ALREADY ACCEPTED') + 500))
    // the single-recall path (Main recovery + FINAL_TRACK quota recovery) uses the SAME block
    const t = S.targets[2], inv = S.c.japaneseLearnerInventory(S.vocab, S.targets)
    const p1 = S.c.buildJapaneseRecallPrompt(t, 2, inv, S.vocab, 'natural', { previousRecalls: ['それは' + t.japanese + 'よ。'], usedInTrack: ['今日はいいね。'] })
    const p0 = S.c.buildJapaneseRecallPrompt(t, 1, inv, S.vocab, 'natural', {})
    T('D3', 'single-recall prompt (recovery / quota recovery) carries the same canonical block, even with no options at all',
      /ALREADY ACCEPTED FOR THIS TARGET:\n  - それは/.test(p1.user) && /ALREADY USED IN THIS TRACK:\n  今日はいいね。/.test(p1.user) && /ALREADY ACCEPTED FOR THIS TARGET:\n  \(none yet\)/.test(p0.user) && /DO NOT repeat or trivially paraphrase these\./.test(p0.user))
    const seenMap = new Map([[S.c.jaDedupeKey('今日はいいね。'), { targetId: 1, text: '今日はいいね。' }]])
    let q = ''
    S.c.geminiRequest = async o => { q = allText(o); return JSON.stringify(rec(S, t, 1)) }
    await S.c.generateJapaneseOneRecall(t, 1, S.vocab, 'natural', KEY, MODEL, seenMap, inv, S.c.scarcityRules(inv), null, null, { previousRecalls: [] })
    T('D4', 'generateJapaneseOneRecall feeds the track\'s used sentences (seen map) into the block', /ALREADY USED IN THIS TRACK:\n  今日はいいね。/.test(q), q.slice(q.indexOf('ALREADY'), q.indexOf('ALREADY') + 200))
    // three identical recalls in one reply: one is accepted, the duplicates are regenerated slot by slot
    const S2 = setupJa(); const dupT = S2.targets[6]
    const R2 = await genJa(S2, (t, n, a) => (t.id === dupT.id && a === 1) ? rec(S2, t, 1) : rec(S2, t, n))
    const got2 = R2.res.pairs.filter(p => p.isTargetPair && p.targetId === dupT.id)
    const rr = genCalls(R2.calls).filter(c => c.stage === 'B_generation_retry' && c.text.includes('JAPANESE TARGET: ★ ' + dupT.japanese + ' '))
    T('D5', 'three trivial copies in one reply ⇒ only one accepted; the two duplicate slots are regenerated together (one request) with the accepted copy listed; 3 distinct recalls',
      got2.length === 3 && new Set(got2.map(p => p.japanese)).size === 3 && rr.length === 1 && /• recall 2 of 3/.test(rr[0].text) && /• recall 3 of 3/.test(rr[0].text) &&
      R2.logs.some(l => /identical sentence already used for this target/.test(l)), { got: got2.map(p => p.japanese), rr: rr.length })
  }

  // ════ §8 CONCEPT IDENTITY · §9 REGISTER BEFORE ACCEPTANCE ═══════════════════════════
  {
    const S = setupJa(), c = S.c
    const V = c.initJapaneseVocab()
    const iku = V.find(w => w.japanese === '行く'), taberu = V.find(w => w.japanese === '食べる')
    const forms = [['行く', iku, ['行きます', '行った', '行って', '行かない', '行こう']], ['食べる', taberu, ['食べます', '食べる？', '食べた', '食べてる']]]
    T('C1', 'concept identity: 行きます 行った 行って 行かない 行こう → 行く · 食べます 食べる？ 食べた 食べてる → 食べる (a conjugated target counts)',
      forms.every(([, w, fs]) => w && fs.every(f => c.matchesJapaneseTarget('今日' + f, w))))
    const ja = c.ev('TRACK_ADAPTERS').ja
    const ctx = { vocabById: new Map(V.map(w => [w.id, w])) }
    T('C2', 'the FINAL_TRACK quota counts conjugated recalls: the Japanese adapter\'s target presence accepts 食べます / 食べた / 食べてる for 食べる, and rejects 飲みます',
      ['パンを食べます。', 'もう食べた。', '今食べてる。'].every(x => ja.targetPresent({ japanese: x }, { wordId: taberu.id, japanese: '食べる' }, ctx)) &&
      !ja.targetPresent({ japanese: '水を飲みます。' }, { wordId: taberu.id, japanese: '食べる' }, ctx))
    // register: polite keigo / natural rough speech are rejected BEFORE acceptance and regenerated as that slot only
    const Sp = setupJa(); const kt = Sp.targets[5]
    const Rp = await genJa(Sp, (t, n, a) => (t.id === kt.id && n === 3 && a === 1) ? { ...rec(Sp, t, n), japanese: rec(Sp, t, n).japanese.replace(/よ。$/, 'だぜ。') } : rec(Sp, t, n))
    const rp = genCalls(Rp.calls).filter(c => c.stage === 'B_generation_retry' && c.text.includes('JAPANESE TARGET: ★ ' + kt.japanese + ' '))
    T('C3', 'register fit is checked before acceptance (Natural: だぜ rejected) and only that slot is regenerated; the register contract and a REGISTER CHECK line are in the prompt',
      Rp.logs.some(l => /recall 3: register violation/.test(l)) && rp.length === 1 && /• recall 3 of 3/.test(rp[0].text) && !/• recall 1 of 3/.test(rp[0].text) &&
      /REGISTER: NATURAL/.test(rp[0].text) && /REGISTER CHECK before you answer/.test(rp[0].text) && !Rp.res.pairs.some(p => /だぜ/.test(p.japanese || '')), Rp.logs.filter(l => /recall 3/.test(l)).slice(0, 3))
    const inv = c.japaneseLearnerInventory(S.vocab, S.targets), rules = c.scarcityRules(inv), t = S.targets[3]
    const base = rec(S, t, 1)
    const ev = (cand, reg) => c.jaEvaluateRecallCandidate({ ...cand, english: cand.englishMeaning, prompt: cand.englishCue }, { target: t, inv, vocab: S.vocab, registerId: reg, seenMap: new Map(), rules, opts: {}, onLog: null })
    T('C4', 'register rules unchanged: Polite rejects でございます keigo · Very casual rejects plain + です · Natural accepts the plain sentence',
      !ev({ ...base, japanese: base.japanese.replace(/。$/, '') + 'でございます。' }, 'polite').ok && !ev({ ...base, japanese: base.japanese.replace(/よ。$/, 'です。') }, 'casual').ok && ev(base, 'natural').ok)
  }

  // ════ §10 READINGS / ROMAJI NEVER CAUSE CONTENT REGENERATION ═════════════════════════
  {
    const S = setupJa(); const rt = S.targets[7]
    const R = await genJa(S, (t, n, a) => (t.id === rt.id && a === 1) ? { ...rec(S, t, n), reading: rec(S, t, n).japanese, romaji: 'wrong wrong', segments: [] } : rec(S, t, n))
    const got = R.res.pairs.filter(p => p.isTargetPair && p.targetId === rt.id)
    T('R1', 'wrong reading / romaji / missing segments on good content ⇒ derived fields rebuilt deterministically (dictionary + morphology), no extra request, content kept',
      genCalls(R.calls).length === BASE && got.length === 3 && got.every(p => !/[一-鿿]/.test(p.reading) && p.romaji !== 'wrong wrong') &&
      got.map(p => p.japanese).sort().join('|') === [1, 2, 3].map(n => rec(S, rt, n).japanese).sort().join('|'), { calls: genCalls(R.calls).length, got: got.map(p => [p.japanese, p.reading, p.romaji]) })
    // deterministic repair unavailable ⇒ Flash-Lite repairs the DERIVED fields only (stage J_romanisation) — never a content regeneration
    const S2 = setupJa(); const rt2 = S2.targets[7]
    const calls = install(S2, (t, n, a) => (t.id === rt2.id && n === 1 && a === 1) ? { ...rec(S2, t, n), reading: rec(S2, t, n).japanese } : rec(S2, t, n))
    const realInner = S2.c.geminiRequest
    let readingCalls = 0
    S2.c.geminiRequest = async o => {
      if (o.stage === 'J_romanisation') { readingCalls++; const g = rec(S2, rt2, 1); calls.push({ stage: o.stage, text: allText(o), model: o.model }); return JSON.stringify({ reading: g.reading, romaji: g.romaji, segments: g.segments }) }
      return realInner(o)
    }
    // the dictionary/morphology path cannot resolve THIS sentence (every other sentence is repaired as usual)
    const badJa = rec(S2, rt2, 1).japanese, o1 = S2.c.jaRepairPairStructure, o2 = S2.c.rebuildJapaneseReadingPipeline
    S2.c.jaRepairPairStructure = (p, inv) => (p && p.japanese === badJa && /[\u4e00-\u9fff]/.test(p.reading || '')) ? p : o1(p, inv)
    S2.c.rebuildJapaneseReadingPipeline = (p, inv) => (p && p.japanese === badJa && /[\u4e00-\u9fff]/.test(p.reading || '')) ? p : o2(p, inv)
    const run = S2.c.aiBeginRun('ja-track'), logs = []
    const tc = S2.c.jaGeneratorTrackContext(S2.targets.map((t, i) => ({ ...t, selectionRole: i >= 27 ? 'new' : 'review' })), { counts: { new: 3 } }, 'daily', 'natural', run)
    const res = await S2.c.generateJapaneseTrack(S2.targets, S2.vocab, 'natural', KEY, MODEL, () => {}, m => logs.push(m), { cancelled: false }, { ...SCENE }, { trackContext: tc, runId: run })
    const rp = calls.find(c => c.stage === 'J_romanisation')
    const p1 = (res.pairs || []).find(p => p.isTargetPair && p.targetId === rt2.id && p.recallIndex === 1)
    T('R2', 'deterministic repair unavailable ⇒ ONE Flash-Lite derived-field call (J_romanisation, "Do not change … the sentence"), the sentence is kept, no content regeneration',
      readingCalls === 1 && rp && rp.model === MODEL && /Do not change, correct or rewrite the sentence/.test(rp.text) && genCalls(calls).length === BASE &&
      p1 && p1.japanese === rec(S2, rt2, 1).japanese && !/[一-鿿]/.test(p1.reading) && logs.some(l => /derived-field repair \(content unchanged\)/.test(l)) &&
      logs.some(l => /DERIVED_REPAIR_CALLS=1/.test(l)), { readingCalls, gen: genCalls(calls).length, p1: p1 && [p1.japanese, p1.reading], log: logs.filter(l => /derived|recall 1/.test(l)).slice(0, 4) })
  }

  // ════ §11 STRUCTURED OUTPUT PARSER ══════════════════════════════════════════════════
  {
    const S = setupJa(), c = S.c, t = S.targets[1]
    const r3 = [1, 2, 3].map(n => rec(S, t, n))
    const body = JSON.stringify({ targetConcept: t.japanese, recalls: r3 })
    const shapes = { fenced: '```json\n' + body + '\n```', fencedNoClose: '```json\n' + body, prose: 'Here you go:\n```json\n' + body + '\n```\nEnjoy!', array: JSON.stringify(r3), lines: JSON.stringify({ lines: r3 }),
      single: JSON.stringify(r3[0]), nested: JSON.stringify([{ recalls: r3 }]) }
    const got = Object.fromEntries(Object.entries(shapes).map(([k, v]) => [k, c.parseJaGroupReply(v).cands.length]))
    T('P1', 'parser: ```json fences (closed or not, with prose around), a bare array, {lines}, a single object and a nested group all parse without a paid call',
      got.fenced === 3 && got.fencedNoClose === 3 && got.prose === 3 && got.array === 3 && got.lines === 3 && got.single === 1 && got.nested === 3, got)
    const tr = c.parseJaGroupReply(body.slice(0, body.indexOf(r3[2].japanese) - 20))
    T('P2', 'a reply truncated inside recall 3 keeps the complete recall(s) instead of discarding the whole reply', tr.cands.length >= 1 && tr.cands[0].japanese === r3[0].japanese, tr)
    const idf = c.parseJaGroupReply(JSON.stringify({ targetId: 1, recalls: [{ ...r3[0], targetId: 5, recallIndex: 3, language: 'zh', pairId: 'x' }] })).cands[0]
    T('P3', 'model identity fields are stripped (targetId, recallIndex, language, pairId)', idf.targetId === undefined && idf.recallIndex === undefined && idf.language === undefined && idf.pairId === undefined && idf.english === r3[0].englishMeaning)
    const Sf = setupJa()
    const Rf = await genJa(Sf, (t2, n) => rec(Sf, t2, n), { wrap: b => '```json\n' + b + '\n```' })
    T('P4', 'every reply fenced in ```json ⇒ exactly the same number of generation requests as the clean run (no paid call spent on fences)', genCalls(Rf.calls).length === BASE && Rf.res.complete)
  }

  // ════ FINAL_TRACK QUOTA RECOVERY USES THE SAME CORE ═════════════════════════════════
  {
    const { makeTrack } = require('./tests14')
    const S = setupJa(); const qt = S.targets[2]
    mock(S, 'ja'); const inner = S.c.geminiRequest, calls = []
    S.c.geminiRequest = async o => { calls.push({ stage: o.stage, text: allText(o) }); return inner(o) }
    const tr = makeTrack(S, 'ja', { counts: { [qt.id]: 1 }, tag: '-q653' })
    const t2 = await S.c.finaliseMainTrack(tr, S.c.ev('TRACK_ADAPTERS').ja, { vocab: S.vocab, apiKey: 'k', model: MODEL, qcRan: true, onLog: () => {} })
    const hq = calls.filter(c => c.stage === 'H_recovery' && c.text.includes('JAPANESE TARGET: ★ ' + qt.japanese + ' '))
    T('Q1', 'FINAL_TRACK quota recovery for a target missing 2 recalls ⇒ ONE target-group request for both slots (recall 2 + 3), with the canonical duplicate block; quota met',
      hq.length === 1 && /• recall 2 of 3/.test(hq[0].text) && /• recall 3 of 3/.test(hq[0].text) && /ALREADY ACCEPTED FOR THIS TARGET:\n  - /.test(hq[0].text) &&
      t2.integrity.quota.rows.find(r => r.targetId === qt.id).valid >= 3, { hq: hq.length, row: t2.integrity.quota.rows.find(r => r.targetId === qt.id) })
  }

  // ════ BOUNDS · COST GUARD · SHARED CORE · TELEMETRY ═══════════════════════════════════
  {
    const S = setupJa(); const ft = S.targets[0]
    const R = await genJa(S, (t, n) => t.id === ft.id ? untaught(S, t, n) : rec(S, t, n))
    const row = R.rows.find(r => r.targetId === ft.id)
    T('B1', 'a target whose replies keep failing: ≤ 3 paid requests per recall slot, ≤ 11 quality checks, then the fallback check(s) and the decision (v671: per-recall check histories)',
      row && row.paidAttempts <= 3 && row.slots.every(x => x.paidRequests <= 3) && row.qualityChecks <= 11 &&
      R.logs.some(l => /\d+(st|nd|rd|th) check: .*deterministic fallback candidate \(no request\)/.test(l)) && R.logs.some(l => /🧾 decision \S+: r1=/.test(l)) &&
      row.slots.every(x => x.checks === x.checkHistory.length && x.checkHistory.every((n, k) => n === k + 1)), row)   // v671 §B1: each recall's own contiguous history
    const Sg = setupJa()
    const Rg = await genJa(Sg, (t, n) => untaught(Sg, t, n))
    const cg = Rg.res.costGuard
    T('B2', 'efficiency guard still protects the run (v672): every reply untaught ⇒ STRATEGY_CHANGE escalates (deterministic fallback first) instead of an abort; far fewer than 90 paid requests; no COST_GUARD_TRIGGERED',
      cg && !cg.triggered && cg.strategyLevel >= 6 && genCalls(Rg.calls).length < 90 && Rg.logs.some(l => /STRATEGY_CHANGE/.test(l)) && !Rg.logs.some(l => /COST_GUARD_TRIGGERED/.test(l)), { cg, n: genCalls(Rg.calls).length })
    // the core is language-neutral: a stub adapter for a made-up language runs through the same lifecycle
    const c = S.c
    let n = 0; const seen = []
    c.geminiRequest = async () => { n++; return n === 1 ? '[{"text":"a1"},{"text":"BAD"},{"text":"a3"}]' : '[{"text":"a2"}]' }
    const stub = { language: 'xx', surfaceOf: t => t.w, textOf: x => x.text, dedupeKey: x => x,
      buildRequest: ({ slots }) => ({ messages: [{ role: 'user', content: 'give ' + slots.length }], json: null, maxTokens: 100, temperature: 0 }),
      parse: raw => ({ cands: JSON.parse(raw), error: null }),
      evaluate: cand => cand.text === 'BAD' ? { ok: false, cand, failure: 'bad content', cls: 'PROMPT_REGEN_REQUIRED', repairs: 0 } : { ok: true, cand, repairs: 0, dup: { ok: true } },
      onAccept: x => seen.push(x.text) }
    const g = await c.generateTargetGroup({ language: 'xx', target: { id: 1, w: 'W' }, recallCount: 3, adapter: stub, apiKey: KEY, model: MODEL })
    T('K1', 'shared core (generateTargetGroup) is language-neutral: a stub adapter gets 1 group call + 1 slot-only call (recall 2), slots in order, telemetry row written',
      n === 2 && g.paidCalls === 2 && g.slots.map(x => x.pair && x.pair.text).join(',') === 'a1,a2,a3' && g.slots[1].paidRequests === 2 && g.slots[0].paidRequests === 1 && g.qualityChecks <= 11)
    const src = c.generateTargetGroup.toString()
    T('K2', 'no Japanese (or Thai) linguistic logic inside the core: no morphology / register / reading / romaji / kana / particle code in generateTargetGroup',
      !/japanese|romaji|kana|reading|thai|ครับ|morpholog|register|particle/i.test(src))
    const sum = SA.c.aiUsageSummary(A.run), L = SA.c.aiUsageSummaryLines(sum).join('\n')
    T('M1', 'telemetry: "JAPANESE GENERATION (target groups): target groups 30 · recalls 90 · initial paid group calls 30 · slot regeneration calls 2 · quality checks used …" + per-target JA_GENERATION_BUDGET rows',
      /JAPANESE GENERATION \(target groups\): target groups 30 · recalls 90 · initial paid group calls 30 · slot regeneration calls 2 · recall checks \d+ \(sum of each group's highest recall check; max 11 per recall/.test(L) &&
      (L.match(/JA_GENERATION_BUDGET \S+ HIGHEST_RECALL_CHECK=\d+\/11 PAID_GENERATION_ATTEMPTS=\d /g) || []).length === 30 &&
      /GENERATION \(app level\): recalls requested 90 · first attempts 30 · regeneration attempts 2 · total attempts 32 · average 0\.36 per recall · resolved first attempt 88\/90/.test(L), L.split('\n').filter(l => /GENERATION/.test(l)))
    T('M2', 'product rules preserved: 3 NEW / 27 REVIEW in the TrackContext · Flash-Lite only · Mandarin generation unchanged (still its own per-recall adapter)',
      A.tc.selectedNewTargetIds.length === 3 && A.tc.selectedTargetIds.length === 30 && A.calls.every(c => c.model === MODEL) &&
      typeof S.c.generateMandarinOneRecall === 'function' && !/generateTargetGroup/.test(S.c.generateMandarinTrack.toString()))
  }

  console.log(out.join('\n') + '\n\nv653 Japanese generation parity regression: ' + out.filter(l => /^PASS/.test(l)).length + '/' + out.filter(l => /^(PASS|FAIL)/.test(l)).length + (fails ? ' — ' + fails + ' FAILED' : ' — ALL PASS'))
  process.exit(fails ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
