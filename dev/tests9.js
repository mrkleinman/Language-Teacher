// v644 Part A — FINAL SEMANTIC AUDIT + RECOVERY QUALITY (A–Q) + live replays.
// Real app code (compiled tt.jsx); the model is mocked per test; v643 compiled for before/after.
const { load } = require('./harness')
const { loadFixture } = require('./fixture')
const { main } = require('./tests')
const out = []; let fails = 0
const T = (id, name, pass, detail) => { if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + id.padEnd(4) + name + (detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')) }
const L = (sp, thai, en, prompt) => ({ speaker: sp, thai, phonetic: 'x x', english: en, prompt })

// Configurable mock model. cueBad/unnatural: substrings that score 2. natFail/cueFail(chunkThai[]) → true = unparseable reply.
function mock(c, o) {
  const s = { calls: { cue: 0, nat: 0, replace: 0, other: 0 }, chunks: { cue: [], nat: [] }, prompts: [], replaceCalls: {} }
  c.mockGeminiGenerate = async (k, m, msgs) => {
    const q = msgs[msgs.length - 1].content
    if (o.down) throw new Error('Failed to fetch')
    if (/Rate how well each Thai sentence matches its prompt/.test(q)) {
      s.calls.cue++
      const items = [...q.matchAll(/^(\d+)\. Prompt: "(.*)"\n\s+Thai: (.*)$/gm)]
      s.chunks.cue.push(items.length)
      if (o.cueFail && o.cueFail(items.map(x => x[3]))) return 'Sorry, I cannot rate these.'
      return JSON.stringify(items.map(x => ({ i: +x[1], s: (o.cueBad || []).some(b => x[2].includes(b)) ? 2 : 5, note: 'mock cue' })))
    }
    if (/native Thai speaker checking learner material/.test(q)) {
      s.calls.nat++
      const items = [...q.matchAll(/^(\d+)\. Thai: (.*)$/gm)]
      s.chunks.nat.push(items.length)
      if (o.natFail && o.natFail(items.map(x => x[2]))) return '```json\n[{"i":1,"s":5},{"i":2,"s":'   // truncated reply
      return JSON.stringify(items.map(x => ({ i: +x[1], s: (o.unnatural || []).some(u => x[2].includes(u)) ? 2 : 5, note: 'mock nat' })))
    }
    if (/Generate 3 replacement Thai learning pairs/.test(q)) {
      s.calls.replace++; s.prompts.push(q)
      const t = (q.match(/Target word: "([^"]+)"/) || [])[1]
      s.replaceCalls[t] = (s.replaceCalls[t] || 0) + 1
      const seq = (o.replacements || {})[t] || []
      return JSON.stringify(seq[s.replaceCalls[t] - 1] || [])
    }
    if (/Evaluate this Thai/.test(q)) return JSON.stringify({ action: 'clean', reason: 'ok' })
    s.calls.other++
    return '[]'
  }
  return s
}
function setup(file) {
  const c = load(file)
  const { track, vocab } = loadFixture(c)
  const T0 = c.thaiTargetsFromTrack(track, vocab)
  const yi = vocab.find(w => w.thai === 'ยี่สิบ')
  const keywords = [...c.thaiAuditKeywords(track, T0.list), { wordId: yi.id, thai: 'ยี่สิบ', english: yi.english }]
  const cvCtx = c.buildThaiTrackVocabContext(vocab, [...T0.list, yi])
  return { c, track, vocab, keywords, cvCtx, yi }
}
async function recover(env, targetThai, o) {
  const { c, track, vocab, keywords, cvCtx } = env
  const kw = keywords.find(k => k.thai === targetThai)
  const log = []
  const m = mock(c, o)
  const res = await c.recoverUncoveredThaiTargets(track.pairs.filter(p => !(p.targetId === kw.wordId)), [{ targetId: kw.wordId, target: kw.thai }],
    { keywords, vocab, apiKey: 'k', model: 'm', cvCtx, originals: new Map(), onLog: x => log.push(x) })
  return { res, m, log, rec: res.recovery[0], kw }
}

;(async () => {
  const env = setup('tt.compiled.js'), env643 = setup('tt.v643.compiled.js')
  const c = env.c
  // ════ LIVE [049] REPLAY ═══════════════════════════════════════════════════════════
  const kaw = env.vocab.find(w => w.thai === 'เข้า')
  const live049 = { speaker: 'A', thai: 'ขอเข้าหน่อยครับ', english: 'Can I have a to enter, please?', prompt: 'Ask if you can have a to enter', phonetic: 'khɔ̌ɔ khâo nòi khráp',
    pairType: 'content', targetId: kaw.id, wordId: kaw.id, _target: 'เข้า', _typedAt: 'creation', language: 'th', _source: 'closed-vocab-fallback:เข้า' }
  out.push('SOURCE TRACE — makeFallbackPairs(เข้า "' + kaw.english + '"): classifyWord=' + c.classifyWord(kaw) + ' · lexicalFunction=' + c.lexicalFunctionFromGloss(kaw.english))
  out.push('  v643: ' + JSON.stringify(env643.c.makeFallbackPairs(kaw).map(p => p.prompt + ' | ' + p.english)))
  out.push('  v644: ' + JSON.stringify(c.makeFallbackPairs(kaw).map(p => p.prompt + ' | ' + p.english)))
  mock(env643.c, {}); const a643 = await env643.c.finalPairSemanticAudit([live049], 'k', 'm', () => {})
  mock(c, {}); const a644 = await c.finalPairSemanticAudit([live049], 'k', 'm', () => {})
  T('R1', 'live [049] replay: v643 audit KEPT the garbage pair (model scored cue 5, Thai natural); v644 drops it deterministically',
    a643.pairs.length === 1 && a644.pairs.length === 0 && a644.stats.templateGarbage === 1, { v643: a643.stats.dropped, v644: a644.stats.failures[0] && a644.stats.failures[0].reason })

  // ════ 13. CUE / TRANSLATION ═════════════════════════════════════════════════════
  const gA = c.thaiTemplateGarbageProblems({ prompt: 'Ask if you can have a to enter' })
  T('A', 'cue "Ask if you can have a to enter" ⇒ FAIL', gA.length && gA[0].field === 'cue' && gA[0].id === 'ARTICLE_BEFORE_INFINITIVE', gA.map(g => g.why))
  const gB = c.thaiTemplateGarbageProblems({ english: 'Can I have a to enter, please?' })
  const gateB = c.thaiLineGate(live049, env.keywords, env.vocab)
  T('B', 'English "Can I have a to enter, please?" ⇒ FAIL (and the shared line gate rejects the pair)', gB.length && gB[0].field === 'english' &&
    !gateB.ok && gateB.problems.some(p => p.code === 'TEMPLATE_GARBAGE'), gateB.problems.map(p => p.code + ': ' + p.why))
  // C: Thai valid, cue nonsensical — template garbage AND a model-judged mismatch are both rejected
  const cOk = { ...live049, english: 'May I come in, please?', prompt: 'He says the moon is purple today', _source: 'gemini-check-1:conv' }
  mock(c, { cueBad: ['moon is purple'] })
  const aC = await c.finalPairSemanticAudit([live049, cOk], 'k', 'm', () => {})
  T('C', 'Thai valid (ขอเข้าหน่อยครับ) but cue nonsensical ⇒ final pair rejected (garbage template, and a model-judged mismatch)',
    aC.pairs.length === 0 && aC.stats.templateGarbage === 1 && aC.stats.cueMismatch === 1, aC.stats.failures.map(f => f.code))
  const good = { ...live049, english: 'May I come in, please?', prompt: 'He asks if he may come in', _source: 'gemini-check-1:conv' }
  mock(c, {})
  const aD = await c.finalPairSemanticAudit([good], 'k', 'm', () => {})
  T('D', 'cue valid + English valid + Thai aligned ⇒ PASS (VERIFIED, audit COMPLETE)', aD.pairs.length === 1 && aD.pairs[0]._semanticState === 'VERIFIED' && aD.stats.status === 'COMPLETE',
    { state: aD.pairs[0] && aD.pairs[0]._semanticState, cue: aD.stats.cueCheck, nat: aD.stats.naturalnessCheck })
  const phrik = env.vocab.find(w => w.thai === 'พริก'), twenty = env.yi
  const fbK = c.makeFallbackPairs(kaw), fbP = c.makeFallbackPairs(phrik), fbY = c.makeFallbackPairs(twenty)
  const noGarbage = arr => arr.every(p => !c.thaiTemplateGarbageProblems(p).length)
  T('E', 'raw gloss in a fallback template: verb gloss "to enter" no longer fills the noun frame; noun gloss "chilli" stays (valid in context); number "twenty" gets count/price frames',
    fbK.length && noGarbage(fbK) && fbK.every(p => !/have a to/.test(p.prompt + p.english)) && fbP.some(p => /Can I have a chilli, please\?/.test(p.english)) &&
    fbY.length && fbY.every(p => /baht|people/.test(p.english)) && env643.c.makeFallbackPairs(twenty).some(p => /have a twenty/.test(p.english)),
    { เข้า: fbK.map(p => p.english), พริก: fbP.map(p => p.english), ยี่สิบ: fbY.map(p => p.english) })
  // E2: the closed-vocabulary repair (the live source) never emits a garbage cue
  const illegal = { ...live049, thai: 'ผมจะเข้าครัวครับ', english: 'I will go into the kitchen.', prompt: 'He says he will go into the kitchen', _source: 'gemini-check-1:conv' }
  const T0 = c.thaiTargetsFromTrack(env.track, env.vocab)
  const byId = new Map([...T0.byId, [kaw.id, kaw]])
  const cv = c.enforceThaiClosedVocabulary([illegal], c.buildThaiTrackVocabContext(env.vocab, [...T0.list, kaw]), { targetsById: byId, stage: 'test' })
  const T0b = env643.c.thaiTargetsFromTrack(env643.track, env643.vocab)
  const kaw643 = env643.vocab.find(w => w.thai === 'เข้า')
  const cv643 = env643.c.enforceThaiClosedVocabulary([illegal], env643.c.buildThaiTrackVocabContext(env643.vocab, [...T0b.list, kaw643]), { targetsById: new Map([...T0b.byId, [kaw643.id, kaw643]]), stage: 'test' })
  T('E2', 'closed-vocabulary repair of an illegal เข้า line: v643 wrote the garbage template, v644 does not',
    cv643.pairs.some(p => /have a to enter/.test(p.prompt || '')) && !cv.pairs.some(p => c.thaiTemplateGarbageProblems(p).length),
    { v643: cv643.pairs.map(p => p.prompt + ' | ' + p.thai), v644: cv.pairs.map(p => p.prompt + ' | ' + p.thai + ' | SRC ' + p._source) })

  // ════ 14. RECOVERY ═══════════════════════════════════════════════════════════════
  const liveYi = [L('A', 'ผมจะไปถึงตอนบ่ายสี่โมงครับ', 'I will arrive at 4 pm.', 'He says he will arrive at four in the afternoon'),
                  L('B', 'ตอนยี่สิบโมงดีไหมคะ', 'How about at twenty o\'clock?', 'She asks if twenty o\'clock is good'),
                  L('A', 'ได้ครับ ตอนยี่สิบโมงก็ดีครับ', 'Okay, twenty o\'clock is fine.', 'He agrees that twenty o\'clock is fine')]
  const bahtYi = [L('A', 'ราคายี่สิบบาทครับ', 'It costs twenty baht.', 'He says it costs twenty baht'),
                  L('B', 'ถูกดีนะคะ', 'That is cheap.', 'She says that is cheap'),
                  L('A', 'ครับ มียี่สิบคนครับ', 'Yes, there are twenty people.', 'He says there are twenty people')]
  // live replay on v643: the ยี่สิบโมง exchange is accepted
  const r643 = await recover(env643, 'ยี่สิบ', { replacements: { 'ยี่สิบ': [liveYi, bahtYi] } })
  const rF = await recover(env, 'ยี่สิบ', { replacements: { 'ยี่สิบ': [liveYi, bahtYi] } })
  const dF = rF.res.diagnostics.filter(d => d.attempt === 1 && /ยี่สิบโมง/.test(d.thai))
  T('F', 'recovery produces ยี่สิบโมง ⇒ FAIL (v643 accepted it on attempt 1; v644 rejects it deterministically even when the model scores it natural)',
    r643.rec.resolved && r643.rec.attempts[0].result === 'accepted' && (r643.rec.attempts[0].lines || []).some(l => /ยี่สิบโมง/.test(l)) &&
    rF.rec.attempts[0].result === 'rejected' && dF.length === 2 && dF.every(d => /INVALID_TIME_EXPRESSION/.test(d.finalStatus) && /FAIL/.test(d.naturalness)),
    { v643: r643.rec.attempts.map(a => a.attempt + ':' + a.result + ' ' + (a.lines || []).join(' / ')), v644: dF.map(d => d.thai + ' → ' + d.naturalness + ' · ' + d.finalStatus) })
  const tp = x => c.thaiTimeExpressionProblems(x).length
  const tuen = [L('A', 'พรุ่งนี้ผมต้องตื่นเช้าครับ', 'I have to wake up early tomorrow.', 'He says he has to wake up early tomorrow'),
                L('B', 'คืนนี้นอนสองทุ่มนะคะ', 'Go to bed at 8 p.m. tonight.', 'She tells him to go to bed at eight tonight'),
                L('A', 'ครับ ผมจะตื่นหกโมงครับ', 'OK, I will wake up at six.', 'He says he will wake up at six')]
  const rG = await recover(env, 'ตื่น', { replacements: { 'ตื่น': [tuen] } })
  T('G', 'สองทุ่ม (8 p.m.) is valid Thai: the guard passes it and the recovery is accepted (target ตื่น, not ยี่สิบ)',
    rG.rec.resolved && (rG.rec.attempts[0].lines || []).some(l => /สองทุ่ม/.test(l)) &&
    ['สองทุ่ม', 'ยี่สิบนาฬิกา', 'ยี่สิบนาที', 'ยี่สิบสี่ชั่วโมง', 'บ่ายสองโมง', 'สิบโมงเช้า', 'สิบสองโมง'].every(x => !tp(x)) &&
    ['ยี่สิบโมง', 'สิบสามโมง', 'ยี่สิบสี่โมง', '20 โมง', 'ตอนยี่สิบสองโมงครับ'].every(x => tp(x) === 1),
    { lines: rG.rec.attempts[0].lines })
  const dH = rF.res.diagnostics.filter(d => d.attempt === 2)
  T('H', 'recovery for ยี่สิบ uses ยี่สิบบาท naturally ⇒ PASS (and the replace prompt carries the number-context hint)',
    rF.rec.resolved && rF.rec.attempts[1].result === 'accepted' && (rF.rec.attempts[1].lines || []).some(l => /ยี่สิบบาท/.test(l)) &&
    rF.m.prompts.every(p => /NUMBER TARGET: use "ยี่สิบ" as a count, price, date or quantity/.test(p)),
    dH.map(d => d.thai + ' · TARGET_PRESENT ' + d.targetPresent + ' · NAT ' + d.naturalness + ' · CUE ' + d.cueAlignment + ' · ' + d.finalStatus))
  const rI = await recover(env, 'ตื่น', { replacements: { 'ตื่น': [tuen, tuen] }, unnatural: ['ตื่นเช้า', 'ตื่นหกโมง'] })
  const dI = rI.res.diagnostics.filter(d => d.targetPresent && d.attempt === 1)
  T('I', 'recovery line has its target but the Thai is unnatural ⇒ rejected (UNNATURAL)',
    !rI.rec.resolved && dI.length === 2 && dI.every(d => /UNNATURAL/.test(d.finalStatus)), dI.map(d => d.thai + ' → ' + d.finalStatus))
  const rJ = await recover(env, 'ตื่น', { replacements: { 'ตื่น': [tuen, tuen] }, cueBad: ['wake up early', 'wake up at six'] })
  const dJ = rJ.res.diagnostics.filter(d => d.targetPresent && d.attempt === 1)
  T('J', 'recovery line is natural but its cue does not match ⇒ rejected (CUE_MISMATCH)',
    !rJ.rec.resolved && dJ.length === 2 && dJ.every(d => /CUE_MISMATCH/.test(d.finalStatus) && /PASS/.test(d.naturalness)), dJ.map(d => d.thai + ' → ' + d.finalStatus))
  // K: the same audit, fail closed — a candidate whose naturalness batch cannot be parsed is not accepted
  const rK643 = await recover(env643, 'ตื่น', { replacements: { 'ตื่น': [tuen, tuen] }, natFail: () => true })
  const rK = await recover(env, 'ตื่น', { replacements: { 'ตื่น': [tuen, tuen] }, natFail: () => true })
  const rK2 = await recover(env, 'ตื่น', { replacements: { 'ตื่น': [tuen] } })
  const acc = rK2.res.pairs.filter(p => p._source === 'qc:recover:ตื่น')
  T('K', 'recovery is accepted only after the SAME final semantic audit: unjudged ⇒ rejected (v643 accepted it), judged ⇒ accepted and marked VERIFIED',
    rK643.rec.resolved && !rK.rec.resolved && rK.res.diagnostics.filter(d => d.attempt === 1 && d.targetPresent).every(d => /NATURALNESS_UNVERIFIED/.test(d.finalStatus)) &&
    rK2.rec.resolved && acc.length && acc.every(p => p._semanticState === 'VERIFIED') && rK2.res.audit.audited === 3 && rK2.m.calls.cue >= 1 && rK2.m.calls.nat >= 1,
    { v643: rK643.rec.attempts.map(a => a.result), v644: rK.rec.attempts.map(a => a.result + ' ' + (a.reasons || []).slice(0, 1).join('')), audit: rK2.res.audit })
  // attempt wording
  const recTxt = []
  { const r = await recover(env, 'ตื่น', { replacements: {} }); recTxt.push(c.recoveryAttemptCount({ attempts: [{ attempt: 0, result: 'not attempted' }] }), c.recoveryAttemptCount(r.rec)) }
  T('K2', 'export attempt count: "not attempted" is 0 attempts (was "after 1 attempt(s)")', recTxt[0] === 0 && recTxt[1] === 2, recTxt)

  // ════ 15. AUDIT COMPLETENESS ═════════════════════════════════════════════════════
  const r = await main(); const cm = r.c
  const pool = r.gen.filter(p => p.pairType !== 'framing' && p.thai && !cm.thaiTemplateGarbageProblems(p).length && !cm.thaiTimeExpressionProblems(p.thai).length)
  const seventy3 = pool.slice(0, 73)
  const idx = new Map(seventy3.map((p, i) => [p.thai, i]))
  const inRange = (ts, a, b) => ts.some(t => idx.has(t) && idx.get(t) >= a && idx.get(t) <= b)
  mock(cm, {})
  const aL = await cm.finalPairSemanticAudit(seventy3, 'k', 'm', () => {})
  const stL = cm.thaiSemanticAuditStatus(aL.pairs)
  T('L', '73 final pairs, 73 judged ⇒ COMPLETE', seventy3.length === 73 && stL.status === 'COMPLETE' && stL.naturalnessJudged === 73 && aL.stats.naturalnessCheck === 'COMPLETE (73/73 judged)',
    { status: stL.status, nat: aL.stats.naturalnessCheck, cue: aL.stats.cueCheck })
  const mM = mock(cm, { natFail: ts => inRange(ts, 60, 71) })
  const logM = []
  const aM = await cm.finalPairSemanticAudit(seventy3, 'k', 'm', x => logM.push(x))
  const stM = cm.thaiSemanticAuditStatus(aM.pairs)
  const RDS = require('react-dom/server'), React = require('react')
  const cr = load('tt.compiled.js', { React })
  const tq = sa => RDS.renderToStaticMarkup(React.createElement(cr.TrackQuality, { track: { pairs: aM.pairs, _closedVocab: { remainingIllegalPairs: 0 }, _semanticAudit: sa } })).replace(/<[^>]+>/g, ' ')
  const htmlM = tq({ ...aM.stats, final: stM })
  const htmlLegacy = tq({ cueMismatch: 0, cueCheck: 'ran', naturalnessCheck: 'ran (61/73 judged)' })
  T('M', '73 final pairs, 61 judged, 12 unparseable ⇒ PARTIAL — never "audited" (also for the live legacy record "ran (61/73 judged)")',
    stM.status === 'PARTIAL' && stM.naturalnessJudged === 61 && stM.unverified.length === 12 && /naturalness PARTIAL \(61\/73 judged, 12 unverified\)/.test(htmlM) &&
    !/✅ naturalness audited/.test(htmlM) && /naturalness PARTIAL \(61\/73 judged, 12 unverified\)/.test(htmlLegacy) && !/✅ naturalness audited/.test(htmlLegacy),
    { status: stM.status, nat: aM.stats.naturalnessCheck, natBatchSizes: mM.chunks.nat, ui: htmlM.match(/naturalness[^·]*/)[0].trim() })
  const mN = mock(cm, { natFail: ts => ts.length === 12 && inRange(ts, 60, 71) })
  const aN = await cm.finalPairSemanticAudit(seventy3, 'k', 'm', () => {})
  T('N', '12-pair batch unparseable, retry 6+6 succeeds ⇒ COMPLETE', aN.stats.status === 'COMPLETE' && cm.thaiSemanticAuditStatus(aN.pairs).status === 'COMPLETE' &&
    mN.chunks.nat.join(',') === '12,12,12,12,12,12,6,6,1', { natBatchSizes: mN.chunks.nat, nat: aN.stats.naturalnessCheck })
  const bad3 = seventy3.slice(60, 63).map(p => p.thai)
  const mO = mock(cm, { natFail: ts => ts.some(t => bad3.includes(t)) })
  const aO = await cm.finalPairSemanticAudit(seventy3, 'k', 'm', () => {})
  const unvO = aO.pairs.filter(p => p._semanticState === 'NATURALNESS_UNVERIFIED')
  T('O', 'retry still fails for 3 pairs ⇒ exactly those 3 remain NATURALNESS_UNVERIFIED (bounded: 12 → 6+6 → 3+3)',
    unvO.length === 3 && unvO.every(p => bad3.includes(p.thai)) && aO.stats.naturalnessCheck === 'PARTIAL (70/73 judged, 3 unverified)' && Math.max(...mO.chunks.nat.slice(6)) <= 6,
    { natBatchSizes: mO.chunks.nat, unverified: aO.stats.unverified.map(u => u.pairId + ' ' + u.stage + ' — ' + u.reason) })
  // P / Q on the full QC pipeline (runQualityCheckCore) + export
  const base = { ...r.track, pairs: r.gen.slice(), _finalAudit: r.genAudit }
  const victim = r.gen.find(p => p.pairType === 'content' && p.targetId === r.gen.filter(x => x.pairType === 'content').map(x => x.targetId).find(id => r.gen.filter(x => x.pairType === 'content' && x.targetId === id).length >= 3))
  mock(cm, { natFail: ts => ts.includes(victim.thai) })
  const qP = await cm.runQualityCheckCore({ ...base }, 'k', 'm', { vocab: r.vocab })
  const stP = qP.counts.finalSemanticAudit.final
  cm.Blob = class { constructor(parts) { cm.__blob = parts.join('') } }
  cm.URL = { createObjectURL: () => 'b', revokeObjectURL() {} }
  cm.document.createElement = () => ({ click() {}, style: {} }); cm.document.body.removeChild = () => {}
  await cm.downloadTrack({ ...base, pairs: qP.pairs, _finalAudit: qP.counts.finalAudit, _semanticAudit: qP.counts.finalSemanticAudit })
  const expP = cm.__blob || ''
  const blockP = (expP.split('FINAL SEMANTIC AUDIT')[1] || '').split('\n\n')[0]
  T('P', 'an unverified pair that remains in the final track ⇒ track quality PARTIAL (export lists PAIR_ID / TARGET / FAILURE_STAGE / REASON)',
    qP.pairs.some(p => p.thai === victim.thai && p._semanticState === 'NATURALNESS_UNVERIFIED') && stP.status === 'PARTIAL' && stP.trackQuality === 'PARTIAL' &&
    /Status: PARTIAL/.test(blockP) && /PAIR_ID: \S+ +\[\d{3}\] +TARGET: \S+ +FAILURE_STAGE: NATURALNESS_CHECK +REASON: /.test(blockP),
    blockP.split('\n').filter(Boolean).slice(0, 14).join('\n      '))
  const qQ1 = qP.pairs.filter(p => p._semanticState === 'VERIFIED' || p.pairType === 'framing')
  mock(cm, {})
  const qQ2 = await cm.runQualityCheckCore({ ...base }, 'k', 'm', { vocab: r.vocab })
  T('Q', 'all unverified pairs removed (or re-judged/replaced) ⇒ COMPLETE',
    cm.thaiSemanticAuditStatus(qQ1).status === 'COMPLETE' && qQ2.counts.finalSemanticAudit.final.status === 'COMPLETE' && qQ2.counts.finalSemanticAudit.final.unverified.length === 0,
    { removed: cm.thaiSemanticAuditStatus(qQ1).status, rejudged: cm.thaiNaturalnessStatusLine(qQ2.counts.finalSemanticAudit.final) })
  // outage: bounded, FAILED, nothing claimed
  const mX = mock(cm, { down: true })
  const aX = await cm.finalPairSemanticAudit(seventy3, 'k', 'm', () => {})
  T('X1', 'model outage ⇒ status FAILED, every pair NATURALNESS/CUE_UNVERIFIED, bounded calls (circuit breaker)', aX.stats.status === 'FAILED' &&
    aX.pairs.every(p => p._semanticState !== 'VERIFIED') && aX.stats.trace.cue.calls <= 3 + 1 && aX.stats.trace.naturalness.calls <= 3 + 1,
    { cue: aX.stats.cueCheck, nat: aX.stats.naturalnessCheck, calls: [aX.stats.trace.cue.calls, aX.stats.trace.naturalness.calls] })
  // export: RECOVERY DIAGNOSTICS block
  const envR = rF
  cm.__blob = ''
  await cm.downloadTrack({ ...base, pairs: qP.pairs, _semanticAudit: qP.counts.finalSemanticAudit, _finalAudit: { ...qP.counts.finalAudit, recovery: envR.res.recovery, recoveryDiagnostics: envR.res.diagnostics } })
  const blockR = ((cm.__blob || '').split('RECOVERY DIAGNOSTICS')[1] || '').split('\n\n')[0]
  T('X2', 'RECOVERY DIAGNOSTICS export: TARGET / ATTEMPT / TH / EN / CUE / TARGET_PRESENT / NATURALNESS / CUE_ALIGNMENT / REASON / FINAL_STATUS',
    /TARGET: ยี่สิบ  ATTEMPT: 1\n  TH: ได้ครับ ตอนยี่สิบโมงก็ดีครับ\n  EN: .*\n  TARGET_PRESENT: PASS  NATURALNESS: FAIL \(invalid Thai time expression\)  CUE_ALIGNMENT: not reached\n  REASON: INVALID_TIME_EXPRESSION.*\n  FINAL_STATUS: REJECTED/.test(blockR) &&
    /FINAL_STATUS: ACCEPTED/.test(blockR), blockR.split('\n').filter(Boolean).slice(0, 18).join('\n      '))
  T('X3', 'export SRC shows the true source of a closed-vocab template repair and of a QC recovery (was ai:check-1)',
    await (async () => { cm.__blob = ''; await cm.downloadTrack({ ...base, pairs: [{ ...live049 }, { ...good, _source: 'qc:recover:ตื่น' }] }); return /SRC: fallback:closed-vocab-template/.test(cm.__blob) && /SRC: qc:recovery/.test(cm.__blob) })())
  console.log(out.join('\n') + '\n\n' + (fails ? fails + ' FAILED' : 'all passed') + ' (' + out.filter(l => /^(PASS|FAIL)/.test(l)).length + ' checks)')
})().catch(e => { console.error(e); process.exit(1) })
