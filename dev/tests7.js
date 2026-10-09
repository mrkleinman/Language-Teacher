// v642 — speaker identity (repro + A–H) and target counts (I–N). Model mocked; real app code.
const { load } = require('./harness'), React = require('react'), RDS = require('react-dom/server'), fs = require('fs')
const out = []; let fails = 0
const T = (id, name, pass, detail) => { if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + id.padEnd(3) + name + (detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')) }
// The live พริก lines, and scene text of the kind the scene model writes. A role line that
// MENTIONS a relative ("…his mother", "…her son") is enough to invert the old guesser.
const LIVE = [{ speaker: 'A', thai: 'ผมอยากได้พริกครับ', english: 'I want to get some chillies.', prompt: 'He says he wants chillies', phonetic: 'phǒm yàak dâi phrík khráp' },
              { speaker: 'B', thai: 'มีพริกหลายแบบเลยคะ', english: 'There are many kinds of chillies.', prompt: 'She says there are many kinds', phonetic: 'mii phrík lǎai bàep loei khá' },
              { speaker: 'A', thai: 'ผมชอบพริกเผ็ดครับ', english: 'I like spicy chillies.', prompt: 'He says he likes spicy chillies', phonetic: 'phǒm châwp phrík phèt khráp' }]
const CHAR_A = 'Anan, a keen home cook shopping for his mother', CHAR_B = 'Pim, a market vendor who runs the stall with her son'
async function genOnce(file, opts = {}) {
  const c = load(file)
  const v = c.initVocab(); v.forEach(w => { if (w.curriculumIndex >= 1 && w.curriculumIndex <= 320) { w.status = 'learning'; w.lastSeen = '2026-09-20'; w.introducedAt = '2026-08-01' } })
  const target = { ...v.find(w => w.thai === 'พริก') }
  target._trackTargets = [target]; target._allowedSet = c.buildThaiAllowedSet({ vocab: v, trackTargets: [target], grammarWords: c.ev('THAI_TRACK_GRAMMAR_WORDS') })
  let calls = 0; const prompts = []
  c.mockGeminiGenerate = async (k, m, msgs) => { calls++; prompts.push(msgs[msgs.length - 1].content); return JSON.stringify(opts.lines || LIVE) }
  if (opts.breakMap) c.thaiSpeakerGender = () => 'female'
  const log = []
  let res = null, err = null
  try { res = await c.generateWordLines(target, 'At a market.', opts.charA || CHAR_A, opts.charB || CHAR_B, [], v, 'k', 'm', 0,
    (d, t, meta) => { if (meta && meta.apiError) log.push(meta.apiError) }, '', new Set()) } catch (e) { err = e }
  return { c, res, err, calls, log, prompts, v }
}
;(async () => {
  // ── REPRODUCTION ──
  const old = await genOnce('tt.v641.compiled.js'), neu = await genOnce('tt.compiled.js')
  const oldFails = old.log.filter(l => /speaker=A gender=female particle=ครับ result=FAIL/.test(l)).length
  out.push('REPRO v641 (scene: A "' + CHAR_A + '", B "' + CHAR_B + '"):')
  out.push('  model calls ' + old.calls + ' · accepted ' + (old.res ? old.res.filter(l => !/best-attempt/.test(l._source || '')).length : 0) + ' · first lines of log:')
  old.log.filter(l => /speaker=|Gender fail/.test(l)).slice(0, 4).forEach(l => out.push('    ' + l))
  T('R1', 'v641 reproduces the live failure: correct ผม…ครับ rejected as "speaker=A gender=female" on all 11 checks', old.calls === 11 && oldFails >= 11)
  out.push('  v642 log: ' + JSON.stringify(neu.log.slice(0,6)))
  T('R2', 'v642: the same model output passes on the 1st check', neu.calls === 1 && neu.res && neu.res.length === 3 && !neu.log.some(l => /result=FAIL/.test(l)), neu.log.filter(l => /check|✅/.test(l)).slice(0, 3))
  // stage-by-stage trace for one A line and one B line (v641 vs v642)
  const trace = (c, l, charA, charB) => {
    const p = { ...l, speakerGender: c.thaiSpeakerMapGender ? c.thaiSpeakerMapGender(l.speaker) : (l.speaker === 'B' ? 'female' : 'male') }
    return { generatedSpeaker: l.speaker, promptGender: /LINE 1 \(A\).*ครับ/.test('') || (l.speaker === 'A' ? 'male (LINE 1/3 ends ครับ)' : 'female (LINE 2 ends ค่ะ/คะ)'),
      runtimeMapGender: c.thaiSpeakerGender(l.speaker, charA, charB), qcReadGender: c.thaiSpeakerGender(l.speaker, charA, charB),
      qcResult: c.validateThaiSpeakerParticle(l.thai, c.thaiSpeakerGender(l.speaker, charA, charB)).ok ? 'PASS' : 'FAIL',
      thaiEvidence: c.thaiSpeakerEvidence(l.thai), rendererGender: c.speakerGenderOf(p, 'th') }
  }
  out.push('TRACE A line "' + LIVE[0].thai + '"\n  v641: ' + JSON.stringify(trace(old.c, LIVE[0], CHAR_A, CHAR_B)) + '\n  v642: ' + JSON.stringify(trace(neu.c, LIVE[0], CHAR_A, CHAR_B)))
  out.push('TRACE B line "' + LIVE[1].thai + '"\n  v641: ' + JSON.stringify(trace(old.c, LIVE[1], CHAR_A, CHAR_B)) + '\n  v642: ' + JSON.stringify(trace(neu.c, LIVE[1], CHAR_A, CHAR_B)))
  const swapped = await genOnce('tt.compiled.js', { charA: 'Nida, a Thai woman', charB: 'Somchai, a Thai man' })
  T('R3', 'a fully swapped scene is flagged as SCENE_CHARACTER_MISMATCH (diagnostic) and lines still pass by the map', swapped.res && swapped.res.length === 3 &&
    neu.c.thaiSceneCharacterCheck('Nida, a Thai woman', 'Somchai, a Thai man').length === 2 && neu.c.thaiSceneCharacterCheck(CHAR_A, CHAR_B).length === 0,
    neu.c.thaiSceneCharacterCheck('Nida, a Thai woman', 'Somchai, a Thai man'))
  const c = neu.c
  // ── A–H speaker identity ──
  T('A', 'A mapped male: ผมอยากได้พริกครับ ⇒ PASS (particle, persona, final gate)', c.validateThaiSpeakerParticle('ผมอยากได้พริกครับ', c.thaiSpeakerGender('A')).ok &&
    c.validateThaiPersona('ผมอยากได้พริกครับ', c.thaiSpeakerGender('A')).ok && c.thaiSpeakerIdentity({ speaker: 'A', thai: 'ผมอยากได้พริกครับ' }).status === 'ok')
  T('B', 'B mapped female: มีพริกค่ะ ⇒ PASS', c.validateThaiSpeakerParticle('มีพริกค่ะ', c.thaiSpeakerGender('B')).ok && c.thaiSpeakerIdentity({ speaker: 'B', thai: 'มีพริกค่ะ' }).status === 'ok')
  const cA = await genOnce('tt.compiled.js', { lines: [{ ...LIVE[0], thai: 'ฉันอยากได้พริกค่ะ' }, LIVE[1], LIVE[2]] })
  T('C', 'A (male) + female-only Thai ⇒ FAIL — no longer relabelled to B', !c.validateThaiSpeakerParticle('ฉันอยากได้พริกค่ะ', c.thaiSpeakerGender('A')).ok &&
    c.thaiSpeakerIdentity({ speaker: 'A', thai: 'ฉันอยากได้พริกค่ะ' }).status === 'metadata-conflict' &&
    cA.log.some(l => /SPEAKER_GENDER_CONFLICT speaker=A gender=male particles=ค่ะ result=FAIL/.test(l)), cA.log.filter(l => /speaker=A/.test(l))[0])
  T('D', 'B (female) + ผม…ครับ ⇒ FAIL', !c.validateThaiSpeakerParticle('ผมมีพริกครับ', c.thaiSpeakerGender('B')).ok &&
    !c.thaiLineGate({ speaker: 'B', thai: 'ผมมีพริกครับ', pairType: 'framing', english: 'x', prompt: 'x' }, [], []).ok)
  const pr = neu.prompts[0]
  T('E', 'generation prompt and QC resolve from the same map', pr.includes('LINE 1 (A): ') && pr.includes('— must end with ' + c.thaiContractParticleText('A') + ' — ') &&
    /LINE 2 \(B\): respond naturally to what A just said AND use "[^"]+" yourself — must end with /.test(pr) && pr.includes(' yourself — must end with ' + c.thaiContractParticleText('B')) &&
    c.thaiContractParticleText('A') === 'ครับ' && c.thaiContractParticleText('B') === 'ค่ะ or คะ' &&
    c.thaiSpeakerGender('A', 'Nida, a Thai woman') === c.ev('THAI_SPEAKER_MAP').A.gender && c.assertThaiSpeakerMapIntegrity().ok)
  const cr = load('tt.compiled.js', { React })
  const html = RDS.renderToStaticMarkup(React.createElement(cr.ConvoPlayer, { lines: [{ speaker: 'A', thai: 'ไปไหน', english: 'Where to?' }, { speaker: 'B', thai: 'ไปตลาด', english: 'To the market.' }],
    speed: 0.8, onSpeedChange() {}, onSkip() {}, onDone() {}, lang: 'th' }))
  T('F', 'Listening renderer uses the map (lines with no particle: A 👨, B 👩)', [...html.matchAll(/(👨|👩)/g)].map(m => m[1]).join('') === '👨👩' &&
    c.speakerGenderOf({ speaker: 'A', thai: 'ไปไหน' }, 'th') === 'male' && c.listeningSpeakerOf({ speaker: 'B', thai: 'ไปตลาด' }, 'th') === 'B')
  const saved = JSON.parse(JSON.stringify(neu.res.map(l => ({ ...l, speakerGender: c.thaiSpeakerMapGender(l.speaker) }))))
  T('G', 'persist/reload round trip keeps A/B identity', saved.every((l, i) => l.speaker === neu.res[i].speaker && c.speakerGenderOf(l, 'th') === c.thaiSpeakerMapGender(neu.res[i].speaker)))
  // H: no contradictory local A/B gender mapping left in Thai code
  const src = fs.readFileSync('tt.jsx', 'utf8')
  const bad = []
  src.split('\n').forEach((line, i) => {
    if (/THAI_SPEAKER_MAP|thaiSpeakerMapGender|thaiContractParticleText/.test(line)) return
    if (/speaker\s*===?\s*'[AB]'\s*\?\s*'(fe)?male'|'(fe)?male'\s*:\s*'(fe)?male'.*speaker/.test(line)) bad.push((i + 1) + ': ' + line.trim().slice(0, 110))
    if (/\\b(wife|husband|mother|father|son|daughter)\\b/.test(line) && /male/.test(line)) bad.push((i + 1) + ': ' + line.trim().slice(0, 110))
  })
  T('H', 'no code path holds its own A/B gender mapping', bad.length === 0, bad)
  const brk = await genOnce('tt.compiled.js', { breakMap: true })
  T('GUARD', 'broken internal map ⇒ INTERNAL_SPEAKER_MAP_CONFLICT after 1 model call (not 11 retries)', brk.err && brk.err.code === 'INTERNAL_SPEAKER_MAP_CONFLICT' && brk.calls === 1,
    { calls: brk.calls, error: brk.err && brk.err.message })
  const c2 = load('tt.compiled.js'); c2.thaiSpeakerGender = () => 'female'
  let e2 = null; try { await c2.generateConversationTrack([{ id: 1, thai: 'พริก', english: 'chilli' }], [], 'k', () => {}, c2.initVocab(), 'm', null, null) } catch (e) { e2 = e }
  T('GUARD2', 'generation refuses to start with an impossible map (0 model calls)', e2 && e2.code === 'INTERNAL_SPEAKER_MAP_CONFLICT', e2 && e2.message)

  // ── I–N target counts ──
  const learner = () => { const v = c.initVocab().map(w => ({ ...w })); v.forEach(w => { const ci = w.curriculumIndex
    if (ci >= 1 && ci <= 311) { w.status = 'learning'; w.introducedAt = '2026-08-01'; w.lastSeen = '2026-09-20'; w.okStreak = 1; w.interval = 3; w.dueDate = '2026-09-2' + (ci % 7) }
    else { if (w.status !== 'locked') w.status = 'new'; w.lastSeen = null; w.introducedAt = null; w.dueDate = null; w.okStreak = 0 } }); return v }
  const countsFor = (raw, mode, requested, extra = {}) => { const r = c.resolveThaiTargetSet(raw, []); return c.thaiTargetCounts({ requested, selectedTargets: raw, generationTargets: r.targets, unresolved: r.skipped, mode, ...extra }) }
  const verifiedOnly = v => v.filter(w => { const cd = c.thaiCanonicalById().get(w.id); return !cd || c.isVerifiedTeachingSense(cd) })
  const revLive = c.selectRevisionTrackTargets({ vocab: learner(), maxTargets: 30, today: '2026-09-28' })
  const cLive = countsFor(revLive.targets, 'revision', 30)
  // v645: superseded. The v642 check documented the live 30 → 29 mechanism (an unverified word selected, then
  // dropped). The Thai Revision path now applies vocab eligibility BEFORE selection; the shared selector
  // without `eligible` (Japanese/Mandarin) is unchanged.
  const thRev = c.selectThaiRevisionTargets(learner(), 30); const cThRev = countsFor(thRev.targets, 'revision', 30)
  T('I-live', 'v645: the Thai revision selector skips ineligible candidates BEFORE selection: 30 selected, 30 generated, 0 unresolved',
    cThRev.selectedTargetCount === 30 && cThRev.generationTargetCount === 30 && cThRev.unresolvedTargets.length === 0 && cThRev.consistent, c.thaiTargetCountsLine(cThRev))
  const rev = c.selectRevisionTrackTargets({ vocab: verifiedOnly(learner()), maxTargets: 30, today: '2026-09-28' })
  const ci = countsFor(rev.targets, 'revision', 30)
  T('I', 'Revision 30 / 0 new ⇒ selected 30 · generation 30 · required Listening 30', ci.selectedTargetCount === 30 && ci.generationTargetCount === 30 && ci.newTargetCount === 0 && ci.requiredListeningTargetCount === 30 && ci.consistent, c.thaiTargetCountsLine(ci))
  const lv = learner(); const pw = c.pickWords(lv, 'daily', [])
  const cj = countsFor(pw.targets, 'daily', 30)
  const three = pw.targets.slice(); let n = 0; three.forEach((w, i) => { if (w.status === 'new') { if (n >= 3) three[i] = { ...w, status: 'learning', lastSeen: '2026-09-20' }; n++ } })
  const cj3 = countsFor(three, 'daily', 30)
  // v656: Listening hears ALL selected targets — NEW words included — so the Listening denominator is 30
  T('J', 'Daily 30 with 3 new ⇒ selected 30 · generation 30 · Listening requires all 30 (v656; live selector: ' + cj.newTargetCount + ' new ⇒ ' + cj.requiredListeningTargetCount + ')',
    cj3.selectedTargetCount === 30 && cj3.generationTargetCount === 30 && cj3.newTargetCount === 3 && cj3.requiredListeningTargetCount === 30 && cj.requiredListeningTargetCount === 30, c.thaiTargetCountsLine(cj3))
  const withAlias = rev.targets.slice(0, 29).concat([{ ...lv.find(w => w.id === 688), status: 'learning', lastSeen: '2026-09-20' }])
  const ck = countsFor(withAlias, 'revision', 30); const rk = c.resolveThaiTargetSet(withAlias, [])
  T('K', 'retired 688 in a saved selection ⇒ replaced by canonical 790: 30 generation targets, not 29', ck.generationTargetCount === 30 && rk.targets.some(t => t.id === 790) && !rk.targets.some(t => t.id === 688), c.thaiTargetCountsLine(ck))
  const both = rev.targets.slice(0, 28).concat([lv.find(w => w.id === 790), { ...lv.find(w => w.id === 688) }])
  const ck2 = countsFor(both, 'revision', 30)
  T('K2', '688 AND 790 both selected ⇒ one generated, the alias explicitly accounted (ALIAS_DUPLICATE), counts consistent', ck2.selectedTargetCount === 30 && ck2.generationTargetCount === 29 &&
    ck2.unresolvedTargets.length === 1 && /ALIAS_DUPLICATE/.test(ck2.unresolvedTargets[0].reason) && ck2.consistent, c.thaiTargetCountsLine(ck2))
  const noRep = rev.targets.slice(0, 29).concat([{ ...lv.find(w => w.id === 517), status: 'learning', lastSeen: '2026-09-20' }])
  const cl = countsFor(noRep, 'revision', 30)
  T('L', 'retired/malformed target with no replacement (517) stays in the lesson as UNRESOLVED; no silent mismatch', cl.selectedTargetCount === 30 && cl.generationTargetCount === 29 &&
    cl.unresolvedTargets[0].id === 517 && cl.consistent && /UNRESOLVED=517/.test(c.thaiTargetCountsLine(cl)), c.thaiTargetCountsLine(cl))
  // M: progress denominator = generationTargetCount
  const c3 = load('tt.compiled.js'); const v3 = c3.initVocab()
  const tg = v3.filter(w => w.curriculumIndex >= 101 && w.curriculumIndex <= 127).map(w => ({ ...w }))
  c3.generateWordLines = async (t) => [{ speaker: 'A', thai: 'ผมชอบ' + t.thai + 'ครับ', english: 'x', prompt: 'He says x', phonetic: 'x' }, { speaker: 'B', thai: 'จริงเหรอคะ', english: 'Really?', prompt: 'She asks', phonetic: 'x' }]
  const statuses = []; const logs = []
  const cntM = c3.thaiTargetCounts({ requested: 30, selectedTargets: tg.concat([{ id: 9991, thai: 'x' }, { id: 9992, thai: 'y' }, { id: 9993, thai: 'z' }]), generationTargets: tg,
    unresolved: [{ wordId: 9991, thai: 'x', reason: 'SKIPPED_UNVERIFIED_REVISION_TARGET' }, { wordId: 9992, thai: 'y', reason: 'SKIPPED_UNVERIFIED_REVISION_TARGET' }, { wordId: 9993, thai: 'z', reason: 'SKIPPED_UNVERIFIED_REVISION_TARGET' }], mode: 'revision' })
  Object.defineProperty(tg, '_targetCounts', { value: cntM })
  await c3.generateConversationTrack(tg, [], 'k', (d, t, meta) => { if (meta && meta.wordStatus) statuses.push(meta.wordStatus); if (meta && meta.apiError) logs.push(meta.apiError) }, v3, 'm', null, null)
  T('M', 'progress reads 1/27 … 27/27 (generationTargetCount), never "/30"', statuses.length === 27 && /^\S+ 1\/27: /.test(statuses[0]) && /27\/27/.test(statuses[26]) && !statuses.some(s => /\/30/.test(s)), [statuses[0], statuses[26]])
  const cntLine = logs.find(l => /SELECTED_TARGETS=/.test(l))
  T('M2', 'the live log line is self-explanatory (the 27-vs-30 case)', /SELECTED_TARGETS=30 GENERATION_TARGETS=27 NEW_TARGETS=0 REVIEW_TARGETS=30 LISTENING_REQUIRED_TARGETS=30 EXPECTED_TARGET_PAIRS=81 UNRESOLVED=9991:x/.test(cntLine || '') && !/trackTargetCount/.test(cntLine), cntLine)
  // N: Listening denominator = requiredListeningTargetCount when NEW words exist
  const { main } = require('./tests'); const r = await main(); const cN = r.c
  const NEW = ['เสื้อ', 'ขนม', 'เกลือ']
  const dTrack = { ...r.track, mode: 'daily', trackMode: 'daily', keywords: r.track.keywords.map(k => NEW.includes(k.thai) ? { ...k, isNew: true, isUnseen: true } : { ...k, isNew: false, isUnseen: false }) }
  const dVocab = r.vocab.map(w => NEW.includes(w.thai) ? { ...w, lastSeen: null, introducedAt: null, status: 'new', lapses: 0, okStreak: 0, dueDate: null, repCount: 0 } : w)
  const sel = dTrack.keywords.map(k => dVocab.find(w => w.id === k.wordId))
  const cntN = cN.thaiTargetCounts({ requested: 30, selectedTargets: sel, generationTargets: sel, unresolved: [], mode: 'daily' })
  cN.mockGeminiGenerate = async (k, m, msgs) => { const q = msgs[msgs.length - 1].content
    if (/native Thai speaker checking/.test(q)) return JSON.stringify([...q.matchAll(/^(\d+)\. Thai:/gm)].map(x => ({ i: +x[1], s: 5 })))
    if (/Judge this short scene/.test(q)) return JSON.stringify({ A: 5, B: 5, C: 5, D: 5, E: 5 })
    if (/Judge the WHOLE listening track/.test(q)) return JSON.stringify({ scenes: [...q.matchAll(/^Scene (\d+)/gm)].map(m => ({ scene: +m[1], pass: true, breakAfterLine: null, reason: 'mock' })), overall: 5, reason: 'mock' })
    { const r0 = require('./ln_mock').lnRespond(q, dTrack.pairs); if (r0) return r0 }
    return '[]' }
  const ltN = (await cN.buildListeningTrack({ ...dTrack, targetCounts: cntN }, dVocab, { lang: 'th', apiKey: 'k', model: 'm' })).listeningTrack
  T('N', 'v656: Listening denominator = ALL 30 selected targets (3 NEW included) = requiredListeningTargetCount', cntN.generationTargetCount === 30 && cntN.requiredListeningTargetCount === 30 &&
    ltN.coverage.requiredTargetIds.length === 30 && ltN.coverage.newTargetIds.length === 3, { generation: cntN.generationTargetCount, requiredListening: cntN.requiredListeningTargetCount, listening: ltN.coverage.requiredTargetIds.length })
  // shortfall is reported, never silent
  const sv = learner(); sv.forEach(w => { if (w.curriculumIndex >= 1 && w.curriculumIndex <= 290) { w.status = 'new'; w.lastSeen = null; w.introducedAt = null; w.dueDate = null; w.okStreak = 0 } })
  const ps = c.pickWords(sv, 'daily', [])
  const cs = countsFor(ps.targets, 'daily', 30, { shortfall: ps.shortfall, lockedByUnratedTracks: 240 })
  // v646: superseded — a short review pool no longer yields a short selection. The cascade fills 30 and any unseen
  // word used beyond the NEW ceiling (no review word left in the whole bank) is counted and logged as NEW_CEILING_OVERFLOW.
  T('S', 'v646: a learner with only 21 introduced words still gets 30 targets; the extra unseen words are REPORTED (NEW_CEILING_OVERFLOW), never silent',
    ps.targets.length === 30 && !ps.shortfall && /NEW_CEILING_OVERFLOW=4/.test(c.thaiTargetCountsLine(cs)), c.thaiTargetCountsLine(cs))
  console.log(out.join('\n') + '\n\n' + (fails ? fails + ' FAILED' : 'all passed'))
})().catch(e => { console.error(e); process.exit(1) })
