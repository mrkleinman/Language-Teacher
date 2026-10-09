// v652 — THAI GENERATION REPAIR: the §14 regression matrix A–I plus the tokenizer (§8), number (§5),
// recovery-state (§7), planner (§11), reporting (§12) and telemetry (§13) checks. Replays the failure
// modes of the real 30 Sept Thai Daily run (NOT_READY 87/90: ล้าน / เหนื่อย / โกรธ 2/3, 3 pronunciation
// issues). The app's own functions run in the node harness; Gemini is simulated at the transport boundary.
// Usage: node tests17.js
const { load } = require('./harness')
const { setup, makeTrack, mock, kwOf } = require('./tests14')
const out = []; let fails = 0
const T = (id, name, pass, detail) => { if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + id.padEnd(4) + name + (detail !== undefined && !pass ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 900) : '')) }
const KEY = 'AIzaSyTEST-harness-key-000000', MODEL = 'gemini-2.5-flash-lite'
const V = (S, th) => S.vocab.find(w => w.thai === th)
const segStr = (c, S, s, extra) => c.segmentThaiWithDiagnostics(s, S.vocab, null, extra || null, true).map(x => x.matchedSpan + (x.unknown ? '?' : '')).join('|')
const L = (sp, thai, en, prompt) => ({ speaker: sp, thai, english: en, prompt })

// generateWordLines against a scripted model (one reply per paid call)
async function runGen(S, target, replies) {
  const c = S.c; let n = 0; const log = []
  c.mockGeminiGenerate = async () => JSON.stringify(replies[Math.min(n++, replies.length - 1)])
  target._trackTargets = [target]
  const res = await c.generateWordLines(target, 'Two friends at a cafe', 'Somchai, a Thai man', 'Nida, a Thai woman', [], S.vocab, KEY, MODEL, 0,
    (a, b, m) => { if (m && m.apiError) log.push(m.apiError) }, '', [])
  return { res, calls: n, log }
}
// finalPairSemanticAudit against a scripted judge
async function runAudit(S, pairs, o) {
  const c = S.c, seen = { cue: [], nat: 0 }, log = []
  c.mockGeminiGenerate = async (k, m, msgs) => {
    const q = msgs[msgs.length - 1].content
    if (/Rate how well each Thai sentence matches its prompt/.test(q)) {
      seen.cue.push(q)
      return JSON.stringify([...q.matchAll(/^(\d+)\. Prompt: /gm)].map(x => ({ i: +x[1], ...(o.cue || { s: 5 }) })))
    }
    if (/native Thai speaker checking learner material/.test(q)) { seen.nat++; return JSON.stringify([...q.matchAll(/^(\d+)\. Thai: /gm)].map(x => ({ i: +x[1], s: o.nat != null ? o.nat : 5, note: 'mock' }))) }
    return '[]'
  }
  const r = await c.finalPairSemanticAudit(pairs, KEY, MODEL, m => log.push(m), { label: o.label || 'main', failClosed: !!o.failClosed })
  return { ...r, seen, log }
}
const ADAPTER = S => S.c.ev('TRACK_ADAPTERS').th
const NOREC = S => ({ ...ADAPTER(S), recoverTargetPairs: async () => ({ accepted: [], reasons: ['recovery unavailable in this test'] }) })
async function fin(S, track, adapter) {
  const log = []
  const t = await S.c.finaliseMainTrack(track, adapter || ADAPTER(S), { vocab: S.vocab, apiKey: 'k', model: MODEL, qcRan: true, onLog: m => log.push(m) })
  return { t, log }
}

;(async () => {
  // ════ A. CUE PERSPECTIVE (§3) ═══════════════════════════════════════════════════════
  {
    const S = setup('th'), c = S.c
    const p = { speaker: 'A', thai: 'คุณอยากให้ผมแนะนำไหมครับ', english: 'Do you want me to recommend it?', prompt: 'He asks if she wants him to recommend it.',
      _target: 'แนะนำ', targetId: 923, pairType: 'content', language: 'th' }
    const a1 = await runAudit(S, [p], { cue: { s: 5, thaiEnglishMatch: true } })
    T('A1', 'cue judge prompt carries the perspective rule (A: he = I/ผม, she = you/คุณ) and the speaker identity of the line',
      /PERSPECTIVE RULE/.test(a1.seen.cue[0] || '') && /He asks if she wants him to recommend it\." = Thai "คุณอยากให้ผมแนะนำไหมครับ"/.test(a1.seen.cue[0] || '') &&
      /Speaker: A \(man — "he" in the prompt = "I\/ผม"; "she" = the listener "you\/คุณ"\)/.test(a1.seen.cue[0] || ''), (a1.seen.cue[0] || '').slice(-700))
    T('A2', '"He asks if she wants him to recommend it." / คุณอยากให้ผมแนะนำไหมครับ → PASS (kept, VERIFIED, cue unchanged)',
      a1.pairs.length === 1 && a1.pairs[0]._semanticState === 'VERIFIED' && a1.pairs[0].prompt === p.prompt && a1.stats.cueMismatch === 0)
    // a pronoun-literal verdict: 2/5, but Thai natural, target present and Thai = English → cue repaired, pair kept
    const a3 = await runAudit(S, [p], { cue: { s: 2, note: "prompt says 'him', Thai says 'me'", thaiEnglishMatch: true, cueRepair: 'He asks if she would like him to recommend it.' } })
    T('A3', 'pronoun-literal cue verdict on a natural pair → CUE_REPAIRED_KEEP_PAIR (model repair), never dropped, never regenerated',
      a3.pairs.length === 1 && a3.pairs[0]._semanticState === 'VERIFIED' && a3.pairs[0].prompt === 'He asks if she would like him to recommend it.' &&
      a3.pairs[0]._cueRepaired && a3.stats.cueRepaired === 1 && a3.stats.dropped === 0 && a3.log.some(l => /CUE_REPAIRED_KEEP_PAIR \[แนะนำ\]/.test(l)), a3.log)
    const a4 = await runAudit(S, [p], { cue: { s: 3, thaiEnglishMatch: true, cueRepair: null } })
    T('A4', 'no usable model repair → the cue is rebuilt deterministically from the English (no extra request): "Ask: Do you want me to recommend it?"',
      a4.pairs.length === 1 && a4.pairs[0].prompt === 'Ask: Do you want me to recommend it?' && a4.pairs[0]._cueRepaired.method === 'rebuilt-from-english' && a4.seen.cue.length === 1)
    const a5 = await runAudit(S, [p], { cue: { s: 2, thaiEnglishMatch: false }, })
    T('A5', 'Thai and English disagree → CUE_MISMATCH_DROP_PAIR (logged, pair dropped)',
      a5.pairs.length === 0 && a5.stats.cueMismatch === 1 && a5.log.some(l => /CUE_MISMATCH_DROP_PAIR \[แนะนำ\] Thai and English disagree/.test(l)))
    const a6 = await runAudit(S, [p], { cue: { s: 2, thaiEnglishMatch: true }, nat: 2 })
    T('A6', 'unnatural Thai is never rescued by a cue repair → CUE_MISMATCH_DROP_PAIR', a6.pairs.length === 0 && a6.log.some(l => /CUE_MISMATCH_DROP_PAIR .*not natural/.test(l)))
    const pNoT = { ...p, thai: 'คุณอยากให้ผมช่วยไหมครับ', english: 'Do you want me to help?' }
    const a7 = await runAudit(S, [pNoT], { cue: { s: 2, thaiEnglishMatch: true, cueRepair: 'He asks if she wants his help.' } })
    T('A7', 'a line without its target is never kept by a cue repair', a7.pairs.length === 0 && a7.log.some(l => /target missing from the Thai/.test(l)))
    const pB = { speaker: 'B', thai: 'ฉันไม่โกรธคุณค่ะแต่คุณทำฉันงงนะคะ', english: "I'm not angry with you, but you confused me.", prompt: 'She says she is not angry but he confused her.', _target: 'โกรธ', targetId: 307, pairType: 'content' }
    const a8 = await runAudit(S, [pB], { cue: { s: 2, note: "prompt says 'he confused her', sentence says 'you confused me'", thaiEnglishMatch: true, cueRepair: "She says she isn't angry with him, but he confused her." } })
    T('A8', 'live [โกรธ] "he confused her" vs "you confused me" (dropped on 30 Sept) → kept with a repaired cue',
      a8.pairs.length === 1 && a8.stats.cueRepaired === 1 && /Speaker: B \(woman/.test(a8.seen.cue[0] || ''))
  }

  // ════ B. CANONICAL TARGET PRESENCE (§4) ════════════════════════════════════════════
  {
    const S = setup('th'), c = S.c
    const s = 'ผมไม่ได้ตั้งใจทำให้คุณโกรธนะครับ'
    T('B1', 'ผมไม่ได้ตั้งใจทำให้คุณโกรธนะครับ → TARGET_PRESENT=true (canonical function, exact Thai string; generation check agrees)',
      c.thaiTargetPresent(s, 'โกรธ', S.vocab) === true && c.detectTargetPresence([{ thai: s }], { thai: 'โกรธ' }, S.vocab).found === true && c.detectTargetPresence([{ thai: s }], { thai: 'โกรธ' }).found === true)
    // the live failure: target-less lines banked from earlier checks replaced every new candidate (11 checks, best-attempt)
    const T0 = V(S, 'โกรธ')
    const LZ = L('A', 'ผมโกรธมากครับ', 'angry', 'Say: angry')
    const replies = [
      [LZ, L('B', 'ฉันไม่รู้ค่ะ', 'I do not know.', 'She says she does not know'), L('A', 'ผมไปบ้านครับ', 'I am going home.', 'He says he is going home')],
      [LZ, L('B', 'ฉันชอบบ้านนี้ค่ะ', 'I like this house.', 'She says she likes this house'), L('A', 'ผมชอบรถครับ', 'I like cars.', 'He says he likes cars')],
      [L('A', s, "I didn't mean to make you angry.", "He says he didn't mean to make her angry"), L('B', 'ฉันไม่โกรธคุณค่ะ', "I'm not angry with you.", "She says she isn't angry with him"), LZ],
      [L('A', 'คุณอย่าโกรธผมนะครับ', "Please don't be angry with me.", 'He asks her not to be angry with him'), L('B', 'ฉันไม่โกรธคุณค่ะ', "I'm not angry with you.", "She says she isn't angry with him"), LZ],
    ]
    const g = await runGen(S, T0, replies)
    T('B2', 'replay of the live โกรธ loop: target-less lines are never banked, so they can never replace a new candidate → accepted at check 4 (v651: 11 checks, best-attempt without โกรธ)',
      g.res && g.res.length === 3 && g.res.every(l => l.thai.includes('โกรธ')) && g.calls === 4 && !g.log.some(l => /does not appear anywhere/.test(l)), { calls: g.calls, res: g.res && g.res.map(l => l.thai), log: g.log.filter(l => /fail|appear/.test(l)) })
    const budget = g.log.find(l => /THAI_GENERATION_BUDGET target=โกรธ/.test(l)) || ''
    // v672 §1 — per-RECALL checks (one per attempt that asked for that recall); no hybrid QUALITY_CHECKS_USED
    T('B3', 'per-target telemetry (v672): CHECKS per recall r1=a/11 r2=b/11 r3=c/11 (each ≤ the paid attempts) PAID_GENERATION_ATTEMPTS=4 LOCAL_REPAIRS=0',
      /CHECKS per recall r1=[1-4]\/11 r2=[1-4]\/11 r3=4\/11 PAID_GENERATION_ATTEMPTS=4 LOCAL_REPAIRS=0 .*outcome=PASSED/.test(budget) && !/QUALITY_CHECKS_USED/.test(budget), budget)
    // an exchange with the target nowhere is rejected locally, with the reason fed to the next prompt
    const g2 = await runGen(S, V(S, 'โกรธ'), [[L('A', 'ผมชอบรถครับ', 'I like cars.', 'He says he likes cars'), L('B', 'ฉันชอบบ้านนี้ค่ะ', 'I like this house.', 'She says she likes this house'), L('A', 'ผมไปบ้านครับ', 'I am going home.', 'He says he is going home')],
      [L('A', s, "I didn't mean to make you angry.", "He says he didn't mean to make her angry"), L('B', 'ฉันไม่โกรธคุณค่ะ', "I'm not angry with you.", "She says she isn't angry with him"), L('A', 'คุณอย่าโกรธผมนะครับ', "Please don't be angry with me.", 'He asks her not to be angry with him')]])
    T('B4', 'an exchange without the target is rejected deterministically (TARGET_MISSING_LOCAL_REJECT, no paid QC) and the next check succeeds',
      g2.res && g2.res.length === 3 && g2.calls === 2 && g2.log.some(l => /TARGET_MISSING_LOCAL_REJECT target=โกรธ/.test(l)))
  }

  // ════ C. THAI NUMBERS (§5) ══════════════════════════════════════════════════════════
  {
    const S = setup('th'), c = S.c
    const cases = [['หมื่น', 'ราคานี้ไม่ถึงหมื่นครับ'], ['แสน', 'รถคันนี้ราคาแสนบาทครับ'], ['ล้าน', 'บ้านหลังนี้ราคาหนึ่งล้านบาทครับ']]
    T('C1', 'หมื่น / แสน / ล้าน sentences contain a numeric expression (canonical detector) and their targets',
      cases.every(([t, x]) => c.thaiHasNumberExpression(x).found && c.thaiHasNumberExpression(x).spans.includes(t) && c.thaiTargetPresent(x, t, S.vocab)),
      cases.map(([t, x]) => [t, c.thaiHasNumberExpression(x)]))
    T('C2', 'compounds and digits: สองแสน · ห้าหมื่น · ยี่สิบเอ็ด · 1,500 · ๒๕ are numeric; plain ราคาถูกมาก is not',
      ['ราคาสองแสนบาทครับ', 'ห้าหมื่นบาทค่ะ', 'ยี่สิบเอ็ดคนครับ', 'ราคา 1,500 บาทครับ', 'อายุ๒๕ปีค่ะ'].every(x => c.thaiHasNumberExpression(x).found) && !c.thaiHasNumberExpression('ราคาถูกมากครับ').found)
    const req = t => c.thaiNumberRequirement({ thai: t, english: (V(S, t) || {}).english || '' })
    T('C3', 'the mandatory-number rule runs only for numeric targets: ลดราคา / ราคา / โปรโมชั่น do NOT require a number; หมื่น แสน ล้าน do',
      !req('ลดราคา').required && !req('ราคา').required && !c.exerciseRequiresNumber({ thai: 'ลดราคา', english: 'discount/reduce price' }) &&
      ['หมื่น', 'แสน', 'ล้าน'].every(t => req(t).required && req(t).satisfiedByTarget), ['ลดราคา', 'ราคา', 'หมื่น'].map(t => [t, req(t)]))
    T('C4', 'a usage plan can switch the rule explicitly (requiresNumber true / false)',
      c.thaiNumberRequirement({ thai: 'ลดราคา', english: 'discount', requiresNumber: true }).required && !c.thaiNumberRequirement({ thai: 'ล้าน', english: 'million', requiresNumber: false }).required)
    for (const [t, x] of cases) {
      const tv = V(S, t)
      const g = await runGen(S, tv, [[L('A', x, 'This price is ' + tv.english + '.', 'He says the price is ' + tv.english), L('B', 'ราคา' + t + 'บาทเลยเหรอคะ', 'The price is ' + tv.english + ' baht?', 'She asks if the price is ' + tv.english + ' baht'), L('A', 'ใช่ครับราคา' + t + 'บาทครับ', 'Yes, it is ' + tv.english + ' baht.', 'He says yes, it is ' + tv.english + ' baht')]])
      T('C5' + t, t + ' "' + x + '" → PASS at check 1 (no "MANDATORY number missing")', g.res && g.calls === 1 && !g.log.some(l => /MANDATORY number missing/.test(l)), g.log.filter(l => /fail|MANDATORY/.test(l)))
    }
  }

  // ════ D. RECOVERY FOR ล้าน (§6 / §7) ════════════════════════════════════════════════
  {
    const S = setup('th'), c = S.c
    const lan = V(S, 'ล้าน'); S.targets = [lan, ...S.targets.slice(1)]
    const track = makeTrack(S, 'th', { counts: { [lan.id]: 2 } })
    const kw = track.keywords.find(k => k.wordId === lan.id)
    const prompts = []; let judge = 0; const log = []
    c.mockGeminiGenerate = async (k, m, msgs) => {
      const q = msgs[msgs.length - 1].content
      if (/QUOTA RECOVERY — Thai/.test(q)) { prompts.push(q); return JSON.stringify([
        { speaker: 'B', thai: 'แล้วคุณจะซื้อรุ่นไหนคะ', english: 'Which model will you buy?', prompt: 'She asks which model he will buy' },
        { speaker: 'A', thai: 'ผมชอบบ้านหลังนี้มากครับ', english: 'I really like this house.', prompt: 'He says he really likes this house' }]) }
      if (/Rate how well|native Thai speaker/.test(q)) { judge++; return '[]' }
      return '[]'
    }
    const st = c.createRecoveryState(kw, { surface: 'ล้าน', sense: 'million' })
    const r1 = await c._thRecoverTargetPairs(kw, 1, { track, vocab: S.vocab, apiKey: KEY, model: MODEL, onLog: m => log.push(m), round: 1, recoveryState: st })
    T('D1', 'recovery prompt states the target contract: "TARGET: ล้าน" · "Every proposed Thai candidate MUST contain ล้าน" · "Do not return a candidate without ล้าน"',
      /TARGET: ล้าน/.test(prompts[0]) && /Every proposed Thai candidate MUST contain ล้าน/.test(prompts[0]) && /Do not return a candidate without ล้าน/.test(prompts[0]))
    T('D2', 'candidates without ล้าน are rejected deterministically and NEVER reach the paid cue/naturalness QC (0 judge calls)',
      r1.accepted.length === 0 && judge === 0 && r1.reasons.every(x => /TARGET_MISSING/.test(x)) && log.filter(l => /RECOVERY_TARGET_MISSING_LOCAL_REJECT ล้าน/.test(l)).length === 2, { judge, reasons: r1.reasons })
    T('D3', 'recovery state (§7): targetId/targetText/sense/currentValidCount/deficit + failedTargetMissing recorded; same failure class twice → RECOVERY_STRATEGY_CHANGE',
      st.targetId === lan.id && st.targetText === 'ล้าน' && st.targetSense === 'million' && st.currentValidCount === 2 && st.deficit === 1 && st.failedTargetMissing.length === 2 &&
      st.strategyChanges.some(x => /TARGET_MISSING/.test(x.why)) && /two friends|market|everyday|Two/i.test(st.sceneContext || 'everyday'), c.recoveryStateSummary(st))
    await c._thRecoverTargetPairs(kw, 1, { track, vocab: S.vocab, apiKey: KEY, model: MODEL, onLog: m => log.push(m), round: 2, recoveryState: st })
    T('D4', 'the next prompt knows every earlier failure: the target-missing sentences and the strategy change',
      /rejected because ล้าน was MISSING/.test(prompts[1]) && /แล้วคุณจะซื้อรุ่นไหนคะ/.test(prompts[1]) && /RECOVERY_STRATEGY_CHANGE 1/.test(prompts[1]))
    // a valid ล้าน candidate does reach QC and is accepted
    judge = 0
    c.mockGeminiGenerate = async (k, m, msgs) => {
      const q = msgs[msgs.length - 1].content
      if (/QUOTA RECOVERY — Thai/.test(q)) return JSON.stringify([{ speaker: 'A', thai: 'บ้านหลังนี้ราคาหนึ่งล้านบาทครับ', english: 'This house costs one million baht.', prompt: 'He says this house costs one million baht' }])
      if (/Rate how well/.test(q)) { judge++; return JSON.stringify([{ i: 1, s: 5, thaiEnglishMatch: true }]) }
      if (/native Thai speaker/.test(q)) { judge++; return JSON.stringify([{ i: 1, s: 5, note: 'ok' }]) }
      return '[]'
    }
    const r3 = await c._thRecoverTargetPairs(kw, 1, { track, vocab: S.vocab, apiKey: KEY, model: MODEL, onLog: m => log.push(m), round: 3, recoveryState: st })
    T('D5', 'บ้านหลังนี้ราคาหนึ่งล้านบาทครับ passes the deterministic gates (no false number/target failure), then the paid QC → accepted',
      r3.accepted.length === 1 && judge === 2, r3.reasons)
  }

  // ════ E. SPEAKER CONTRACT STAYS STRICT ══════════════════════════════════════════════
  {
    const S = setup('th'), c = S.c
    const kws = S.targets.map(t => kwOf('th', t, false)).concat([kwOf('th', V(S, 'โกรธ'), false)])
    const bad = { speaker: 'A', thai: 'ฉันไม่โกรธคุณครับ', english: "I'm not angry with you.", prompt: 'He says he is not angry with her', pairType: 'content', targetId: 307, _target: 'โกรธ', _typedAt: 'creation' }
    const g = c.thaiLineGate(bad, kws, S.vocab)
    T('E1', 'ฉัน + ครับ still FAILS the shared line gate (SPEAKER_CONFLICT: male and female markers)', !g.ok && g.problems.some(p => p.code === 'SPEAKER_CONFLICT'), g.problems)
    T('E3', 'and it is still classified SPEAKER_CONFLICT for the recovery state (never a cue problem)', c._thaiFailCode('SPEAKER_CONFLICT: male and female markers in one sentence (ครับ + ฉัน)') === 'SPEAKER_CONFLICT')
    const a = await runAudit(S, [bad], { cue: { s: 2, thaiEnglishMatch: true, cueRepair: 'He says he is not angry with her.' }, nat: 2 })
    T('E2', 'a cue repair never launders a speaker error: the ฉัน+ครับ line is unnatural → dropped', a.pairs.length === 0)
  }

  // ════ F. SCENE PROPER NAMES (§10) + G. ONE AUTHORITATIVE PRONUNCIATION AUDIT (§9) ════
  {
    const S = setup('th'), c = S.c
    const vocabLen = S.vocab.length
    const track = makeTrack(S, 'th')
    const scene = { scene: 'Two friends catching up at a local café.', characterA: 'Somchai, a Thai man', characterB: 'Nida, a Thai woman',
      opening: 'สวัสดีครับคุณนิดา วันนี้เป็นยังไงบ้างครับ', reply: 'สวัสดีค่ะคุณสมชาย วันนี้เป็นยังไงบ้างคะ', closing: 'แล้วเจอกันครับ', closing_reply: 'ค่ะ เดินทางปลอดภัยนะคะ' }
    track.sceneContract = c.buildSceneContract(scene, 'th', { vocab: S.vocab })
    // a v650-era contract has no phonetic on its entities — the names still resolve
    track.sceneContract.allowedSceneEntities = track.sceneContract.allowedSceneEntities.map(e => ({ surface: e.surface, type: e.type, speaker: e.speaker, en: e.en }))
    const fr = (sp, thai, en, key, stale) => ({ pairType: 'framing', speaker: sp, thai, english: en, prompt: 'greeting', _semanticState: 'VERIFIED', _semNat: 5, _semCue: 'n/a', _pairKey: key, words: [], phonetic: '',
      ...(stale ? { _phoneticIssues: [stale] } : {}) })
    // the 30 Sept export: pre-repair issues left on the pairs (th-open-A / th-open-B / th-close-B)
    track.pairs[0] = fr('A', scene.opening, 'Hello Nida. How are you today?', 'th-open-A', 'no phonetic for: นิดา')
    track.pairs[1] = fr('B', scene.reply, 'Hello Somchai. How are you today?', 'th-open-B', 'phonetic is missing "ชา" (chaa); no phonetic for: สมชาย')
    track.pairs.push(fr('A', 'แล้วเจอกันครับ', 'See you later.', 'th-close-A'), fr('B', scene.closing_reply, 'Yes, have a safe trip', 'th-close-B', 'phonetic is missing "เดินทางปลอดภัย" (doen-thaang-plàwt-phai)'))
    mock(S, 'th')
    const { t, log } = await fin(S, track)
    const o1 = t.pairs.find(p => p._pairKey === 'th-open-A'), o2 = t.pairs.find(p => p._pairKey === 'th-open-B'), cl = t.pairs.find(p => p._pairKey === 'th-close-B')
    T('F1', 'สมชาย "sǒm-chaai" and นิดา "ní-daa" come from scene-name metadata and appear in the final phonetics wherever the name is used',
      /ní-daa/.test(o1.phonetic) && /sǒm-chaai/.test(o2.phonetic) && o1.words.some(w => w.p === 'นิดา' && w.ph === 'ní-daa') && o2.words.some(w => w.p === 'สมชาย' && w.ph === 'sǒm-chaai'), [o1.phonetic, o2.phonetic])
    T('F2', 'scene names pass the final pronunciation audit and are NOT added to vocabulary / SRS',
      !o1._phoneticIssues && !o2._phoneticIssues && S.vocab.length === vocabLen && !S.vocab.some(w => w.thai === 'นิดา' || w.thai === 'สมชาย'))
    T('F3', 'tokenizer: สมชาย / นิดา are SCENE_PROPER_NAME (allowed, never blocked vocabulary)',
      c.classifyThaiSegmentToken('สมชาย', { sceneEntities: ['สมชาย', 'นิดา'], vocab: S.vocab }) === 'SCENE_PROPER_NAME' &&
      c.validateThaiVocabulary([{ thai: scene.opening }, { thai: scene.reply }], { ...c.buildThaiTrackVocabContext(S.vocab, S.targets, track.sceneContract.allowedSceneEntities), sceneEntities: ['สมชาย', 'นิดา'] }).blocked.length === 0)
    T('G1', 'stale pre-repair issues (3) are superseded by the ONE final audit over the persisted track: 0 issues → integrity READY',
      t.integrity.status === 'READY' && t.integrity.invariants.PRONUNCIATION_ALIGNMENT_ISSUES === 0 && !cl._phoneticIssues &&
      log.some(l => /FINAL_PRONUNCIATION_AUDIT \(authoritative, persisted Main Track\): 0 issue\(s\)/.test(l)), { status: t.integrity.status, reasons: t.integrity.reasons, fl: log.filter(l => /PRONUNCIATION|final phonetics/.test(l)) })
    const lex = c.withThaiSceneNamePhonetics(c.buildThaiPhoneticLexicon(S.vocab), c.thaiSceneNameEntries(track, S.vocab))
    const staleOnly = [{ thai: 'ค่ะ เดินทางปลอดภัยนะคะ', phonetic: 'khâ doen-thaang-plàwt-phai ná khá', _phoneticIssues: ['phonetic is missing "เดินทางปลอดภัย"'] }]
    const fa = c.thaiFinalPronunciationAudit(staleOnly, lex)
    T('G2', 'final audit recomputes from the exact Thai + phonetic: the live th-close-B line (PH contains doen-thaang-plàwt-phai) has 0 issues; a wrong line keeps its issue',
      fa.issues.length === 0 && !fa.pairs[0]._phoneticIssues && c.thaiFinalPronunciationAudit([{ thai: 'เดินทางปลอดภัยนะคะ', phonetic: 'ná khá' }], lex).issues.length === 1)
    const fp = c.finaliseThaiTrackPhonetics([{ thai: 'ค่ะ เดินทางปลอดภัยนะคะ', phonetic: 'khâ doen-thaang-plàwt-phai ná khá', _phoneticIssues: ['stale'] }], lex)
    T('G3', 'finaliseThaiTrackPhonetics clears an earlier stage\'s _phoneticIssues when the line now aligns (no stale overwrite)', !fp[0]._phoneticIssues)
  }

  // ════ H. 87/90 → NOT_READY · I. 90/90 + clean pronunciation → READY ═════════════════
  {
    const S = setup('th')
    const counts = { [S.targets[0].id]: 2, [S.targets[1].id]: 2, [S.targets[2].id]: 2 }
    mock(S, 'th')
    const { t } = await fin(S, makeTrack(S, 'th', { counts }), NOREC(S))
    T('H1', '87/90 (three targets at 2/3, recovery exhausted) → NOT_READY, TARGET_PAIR_QUOTA=87/90, Listening not allowed',
      t.integrity.status === 'NOT_READY' && t.integrity.invariants.TARGET_PAIR_QUOTA === '87/90' && !S.c.canBuildListening(t).ok, t.integrity.reasons)
    const S2 = setup('th'); mock(S2, 'th')
    const { t: t2 } = await fin(S2, makeTrack(S2, 'th'))
    T('I1', '90/90, every target 3/3, 0 pronunciation issues, identity intact → READY (Listening allowed)',
      t2.integrity.status === 'READY' && t2.integrity.invariants.TARGET_PAIR_QUOTA === '90/90' && t2.integrity.invariants.PRONUNCIATION_ALIGNMENT_ISSUES === 0 &&
      t2.integrity.invariants.TARGET_IDENTITY_VIOLATIONS === 0 && S2.c.canBuildListening(t2).ok, t2.integrity.reasons)
    const S3 = setup('th'); mock(S3, 'th')
    const tr = makeTrack(S3, 'th'); tr.pairs[5] = { ...tr.pairs[5], _target: 'ผิด' }
    const { t: t3 } = await fin(S3, tr)
    T('I2', 'a pair whose targetText no longer matches its targetId is a TARGET_IDENTITY_VIOLATION → NOT_READY', t3.integrity.status === 'NOT_READY' && t3.integrity.invariants.TARGET_IDENTITY_VIOLATIONS >= 1, t3.integrity.reasons)
  }

  // ════ TOKENIZER (§8) ════════════════════════════════════════════════════════════════
  {
    const S = setup('th'), c = S.c
    const lock = w => { const v = V(S, w); if (v) Object.assign(v, { status: 'locked', lastSeen: null, introducedAt: null, repCount: 0, dueDate: null, okStreak: 0 }) }
    lock('นาน')
    const ctx = c.buildThaiTrackVocabContext(S.vocab, S.targets, [])
    const s1 = segStr(c, S, 'นานมากแล้วนะคะ'), s2 = segStr(c, S, 'อาหารไทยใส่มะนาวอร่อยไหมครับ'), s3 = segStr(c, S, 'ไปเที่ยวมานานไหมคะ')
    T('K1', 'นานมากแล้วนะคะ → นาน?|มาก|… (v651: นา?|นม|ก? → "นานมก"); no dictionary hit may end before a dependent vowel',
      /^นาน\?\|มาก\|/.test(s1) && !/นม|นานมก/.test(s1) && JSON.stringify(c.validateThaiVocabulary([{ thai: 'นานมากแล้วนะคะ' }], ctx).blocked) === '["นาน"]', s1)
    T('K2', 'อาหารไทย… → the untaught word is reported whole (ไทย), never the fragment ทย (the leading vowel ไ is no longer skipped)', /\|ไทย\?\|/.test(s2) && !/ทย\?/.test(s2.replace('ไทย?', '')), s2)
    T('K3', 'no fragment ยว / นา: ไปเที่ยวมานานไหมคะ → ไปเที่ยว|มา|นาน?|ไหม|คะ', s3 === 'ไปเที่ยว|มา|นาน?|ไหม|คะ', s3)
    T('K4', 'cluster boundaries: no break before ั ิ ่ ้ ะ า or after เ แ โ ใ ไ',
      !c.thaiClusterBoundaryOk('นาน', 1) && c.thaiClusterBoundaryOk('นาน', 2) && !c.thaiClusterBoundaryOk('ไทย', 1) && !c.thaiClusterBoundaryOk('น้ำ', 1) && c.thaiClusterBoundaryOk('ครับผม', 4))
    T('K5', 'token classes: punctuation · particle · canonical vocab · compound · accidental fragment · unknown word',
      c.classifyThaiSegmentToken('ๆ', {}) === 'PUNCTUATION' && c.classifyThaiSegmentToken('ครับ', {}) === 'PARTICLE' && c.classifyThaiSegmentToken('มะนาว', { vocab: S.vocab }) === 'CANONICAL_VOCAB' &&
      ['าว', 'ไ', 'น'].every(x => c.classifyThaiSegmentToken(x, { vocab: S.vocab }) === 'ACCIDENTAL_FRAGMENT') && c.classifyThaiSegmentToken('นาน', { vocab: S.vocab }) === 'UNKNOWN_WORD',
      ['ๆ', 'ครับ', 'มะนาว', 'าว', 'ไ', 'น', 'นาน'].map(x => c.classifyThaiSegmentToken(x, { vocab: S.vocab })))
    const vocab2 = S.vocab.filter(w => w.thai !== 'ไทย')
    T('K6', 'segmentation of known text is unchanged: ผมชอบกินข้าวครับ / เดินทางปลอดภัยนะคะ', segStr(c, { vocab: vocab2 }, 'ผมชอบกินข้าวครับ') === 'ผม|ชอบ|กินข้าว|ครับ' || segStr(c, { vocab: vocab2 }, 'ผมชอบกินข้าวครับ') === 'ผม|ชอบ|กิน|ข้าว|ครับ', segStr(c, { vocab: vocab2 }, 'ผมชอบกินข้าวครับ'))
  }

  // ════ PLANNER (§11) · REPORTING (§12) · TELEMETRY (§13) · LOCAL REPAIRS (§2) ════════
  {
    const S = setup('th'), c = S.c
    const words = ['เหนื่อย', 'คง', 'วันพฤหัสบดี', 'ตื่น', 'ห้องนอน', 'ห้องครัว', 'อาบน้ำ', 'เนื้อ', 'กระเทียม', 'หอมใหญ่', 'มะนาว', 'ขนม', 'โปรโมชั่น', 'ลดราคา', 'บัตร', 'บัตรเครดิต', 'โอน', 'หมื่น', 'แสน', 'ล้าน']
    const ts = words.map(w => V(S, w)).filter(Boolean)
    const dom = Object.fromEntries(ts.map(t => [t.thai, c.targetSemanticDomain(t)]))
    const same = g => new Set(g.map(w => dom[w])).size === 1
    T('P1', 'semantic domains: food (เนื้อ กระเทียม หอมใหญ่ มะนาว ขนม) · payment (โปรโมชั่น ลดราคา บัตร บัตรเครดิต โอน) · home · numbers · schedule',
      ts.length >= 18 && same(['เนื้อ', 'กระเทียม', 'หอมใหญ่', 'มะนาว', 'ขนม'].filter(w => dom[w])) && same(['โปรโมชั่น', 'ลดราคา', 'บัตร', 'บัตรเครดิต', 'โอน'].filter(w => dom[w])) &&
      same(['ห้องนอน', 'ห้องครัว', 'อาบน้ำ'].filter(w => dom[w])) && same(['หมื่น', 'แสน', 'ล้าน']) && same(['เหนื่อย', 'คง', 'วันพฤหัสบดี', 'ตื่น'].filter(w => dom[w])), dom)
    let planPrompt = ''
    c.mockGeminiGenerate = async (k, m, msgs) => { planPrompt = msgs[msgs.length - 1].content; return 'not json' }
    const plan = await c.planTargetScenes(ts, { premise: 'Two friends at a café' }, { apiKey: KEY, model: MODEL, lang: 'th' })
    T('P2', 'planner prompt asks for semantic clusters (unequal sizes fine) and gives a domain hint per word; the fallback clusters by domain too',
      /CLUSTER BY MEANING/.test(planPrompt) && /very different sizes/.test(planPrompt) && /\[domain: food & cooking\]/.test(planPrompt) &&
      plan.source === 'deterministic' && plan.scenes.length >= 4 && plan.scenes.every(sc => new Set(sc.targetIds.map(id => dom[ts.find(t => t.id === id).thai])).size === 1), plan.scenes.map(s => s.purpose + ':' + s.targetIds.length))
    // reporting labels (§12)
    const tr = { pairs: [], _semanticAudit: { final: { finalPairs: 91, auditedLines: 87, cueJudged: 80, cueTotal: 80, naturalnessJudged: 87, unverified: [], status: 'COMPLETE', trackQuality: 'COMPLETE' }, cueMismatch: 3, unnatural: 2 },
      integrity: { status: 'NOT_READY', reasons: ['TARGET_PAIR_QUOTA=87/90 (required 90/90)'], counts: { quotaRecovered: 15, replacementSentences: 15 }, quota: { before: '75/90', after: '87/90', unresolved: [{ target: 'ล้าน' }] } },
      _finalAudit: { recoveryDiagnostics: [] } }
    const sa = c.semanticAuditExportLines(tr).join('\n'), rd = c.recoveryDiagnosticsExportLines(tr).join('\n')
    T('R1', 'export: PRE-QUOTA semantic audit vs POST-QUOTA recovery; "SEMANTIC AUDIT: COMPLETE" next to "TRACK INTEGRITY: NOT_READY"; no "Track quality: COMPLETE", no "0/0"',
      /PRE-QUOTA SEMANTIC AUDIT/.test(sa) && /POST-QUOTA RECOVERY: 15 target pair\(s\)/.test(sa) && /SEMANTIC[ _]AUDIT: COMPLETE/.test(sa) && /TRACK INTEGRITY: NOT_READY/.test(sa) && /MAIN_TRACK: NOT_READY/.test(sa) &&
      !/Track quality: COMPLETE/.test(sa) && !/audited: 0\/0/.test(sa), sa)
    T('R2', 'RECOVERY DIAGNOSTICS no longer says "no recovery needed" when 15 replacement sentences were made', !/no recovery needed/.test(rd) && /PRE-QUOTA \(QC\) RECOVERY: none needed/.test(rd) && /POST-QUOTA RECOVERY: 15/.test(rd) && /unresolved: ล้าน/.test(rd), rd)
    // local repairs (§2): model spacing and a lazy cue are fixed without another paid call
    const tv = V(S, 'แนะนำ')
    const g = await runGen(S, tv, [[L('A', 'คุณอยาก ให้ผม แนะนำ ไหมครับ', 'Do you want me to recommend something?', 'Say: recommend'), L('B', 'ค่ะ ช่วยแนะนำ หน่อยค่ะ', 'Yes, please recommend something.', 'She says yes, please recommend something'),
      L('A', 'ผมแนะนำร้านนี้ครับ', 'I recommend this shop.', 'He says he recommends this shop')]])
    const b = g.log.find(l => /THAI_GENERATION_BUDGET target=แนะนำ/.test(l)) || ''
    T('L1', 'spacing and a lazy cue are LOCAL REPAIRS inside the attempt (v672): accepted after 1 paid call, every recall at its 1st check (a local re-validation never adds a check)',
      g.res && g.calls === 1 && g.log.some(l => /LOCAL_REPAIR spacing/.test(l)) && g.log.some(l => /LOCAL_REPAIR cue/.test(l)) && /CHECKS per recall r1=1\/11 r2=1\/11 r3=1\/11 PAID_GENERATION_ATTEMPTS=1 LOCAL_REPAIRS=[3-9]/.test(b),
      { calls: g.calls, b, log: g.log.filter(l => /LOCAL|fail/.test(l)) })
    // telemetry summary (§13)
    const run = c.aiBeginRun('t17-telemetry')
    c.aiRecordGenerationRecall({ lang: 'th', targetId: 1, target: 'ก', recallIndex: 0, paidAttempts: 1, qualityChecks: 2, outcome: 'accepted', deterministicRepairs: 2 })
    c.aiRecordGenerationRecall({ lang: 'th', targetId: 2, target: 'ข', recallIndex: 0, paidAttempts: 3, qualityChecks: 3, outcome: 'accepted', deterministicRepairs: 0 })
    const sum = c.aiUsageSummary(run), th = sum.thaiGeneration, lines = c.aiUsageSummaryLines(sum).join('\n')
    T('M1', 'THAI GENERATION telemetry: targets · quality checks · initial paid · paid regeneration · local checks · quota-recovery · cue-QC · naturalness-QC calls',
      th && th.targetsGenerated === 2 && th.qualityChecks === 5 && th.initialPaidGenerationCalls === 2 && th.paidRegenerationCalls === 2 && th.localChecks === 1 && th.localRepairs === 2 &&
      /THAI GENERATION: targets generated 2 · recall checks 5 \(sum of each target's highest recall check; max 11 per recall — one check = one candidate attempt\) · initial paid generation calls 2 · paid regeneration calls 2 · deterministic\/local checks 1/.test(lines) &&
      /quota-recovery generation calls \d+ · cue-QC calls \d+ · naturalness-QC calls \d+/.test(lines) && /THAI_GENERATION_BUDGET ก HIGHEST_RECALL_CHECK=2\/11 PAID_GENERATION_ATTEMPTS=1 LOCAL_REPAIRS=2/.test(lines), lines)
    T('M2', 'the 11-check framework is preserved (11 quality checks per target) and Flash-Lite stays the only model', c.ev('THAI_CHECK_SRCS').length === 11 && c.ev('GEMINI_DEFAULT_MODEL') === 'gemini-2.5-flash-lite' && Object.keys(c.ev('GEMINI_STAGE_MODELS')).length === 0)
  }

  console.log(out.join('\n') + '\n\nv652 Thai generation repair regression: ' + out.filter(l => /^PASS/.test(l)).length + '/' + out.length + (fails ? ' — ' + fails + ' FAILED' : ' — ALL PASS'))
  process.exit(fails ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
