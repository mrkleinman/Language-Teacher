// v678 — Gen2 SHADOW PILOT (controlled generation architecture) regression suite.
// A isolation & preservation · B deterministic acceptance rules · C pipeline mechanics (simulator: mechanics only)
// D comparison tooling · E benchmark panel wiring
'use strict'
const fs = require('fs'), path = require('path')
const { load } = require('./harness')
const B = path.join(__dirname, 'benchmark')
const { runOnceUi, loadFixture, compareContent } = require('./benchmark/run')
const out = []; let n = 0, fails = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + id.padEnd(5) + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 700) : '')) }
const readJ = f => JSON.parse(fs.readFileSync(f, 'utf8'))
const SRC = fs.readFileSync(path.join(__dirname, 'tt.jsx'), 'utf8')
const G2 = SRC.slice(SRC.indexOf('// TT_GEN2_BEGIN'), SRC.indexOf('// TT_GEN2_END'))
const G2CODE = G2.split('\n').map(l => l.replace(/^\s*\/\/.*$/, '')).join('\n')   // code only (comments may NAME what is not used)
const OUTSIDE = SRC.slice(0, SRC.indexOf('// TT_GEN2_BEGIN')) + SRC.slice(SRC.indexOf('// TT_GEN2_END'))

;(async () => {
  const c = load(path.join(__dirname, 'tt.compiled.js'), { realBelt: true })
  // ══ A — ISOLATION & PRESERVATION ═════════════════════════════════════════════════════════════════════════════════
  {
    T('A1', 'Gen2 is DISABLED by default (GEN2_FLAG.enabled=false, shadowOnly=true)', c.ev('GEN2_FLAG.enabled') === false && c.ev('GEN2_FLAG.shadowOnly') === true)
    const calls = [...OUTSIDE.matchAll(/\bgen2(Daily|Listening)\(/g)].length
    const branch = /if \(o\.pipeline === 'gen2'\) \{[\s\S]{0,700}await gen2Daily\(g2o\) : await gen2Listening\(g2o\)/.test(OUTSIDE)
    T('A2', 'no learner-facing code calls Gen2: the ONLY call sites are the benchmark run function’s pipeline=gen2 branch (reached from the sandboxed worker / Node)', calls === 2 && branch, { calls })
    T('A3', 'the Gen2 block writes nothing: no storage, no SRS / vocabulary update, no saved track, no attempt record', !/stSet\(|localStorage|sessionStorage|setVocab|onSave|saveListeningAttempt|saveTrack|window\.storage/.test(G2))
    T('A4', 'Gen2 commits no PROVEN template realisation and uses no fixed phase storyline (no proven frames, no planListeningConversation, no OPEN/DECIDE/ARRANGE phase list)',
      !/proven|PROVEN|planListeningConversation|listeningVerbal|LISTENING_PHASE|'OPEN'|'DECIDE'|'ARRANGE'/.test(G2CODE))
    // production behaviour: the 18 LIVE v677 runs (real Gemini responses) replay byte-for-byte with identical content on this build
    const dir = path.join(B, 'live', 'v677'), rows = []
    for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.json'))) {
      const r = readJ(path.join(dir, f))
      const fx = loadFixture(r.fixtureId)
      const rep = await runOnceUi(fx, { mode: 'replay', cassette: r.cassette })
      rows.push({ f, faithful: rep.replay.faithful, same: compareContent(r.outcome.content, rep.content).identical })
    }
    T('A5', 'PRODUCTION UNCHANGED: all 18 live v677 benchmark runs (real Gemini responses, ' + rows.length + ' runs) replay on this build with identical requests and identical learner-facing content',
      rows.length === 18 && rows.every(x => x.faithful && x.same), rows.filter(x => !(x.faithful && x.same)))
    const base = fs.readFileSync(path.join(__dirname, 'tt.v677.jsx'), 'utf8')
    const banks = s => (s.match(/const RAW_JAPANESE_VOCAB = \[[\s\S]*?\n\]/) || [''])[0] + (s.match(/const BELT_COMPLEXITY = Object\.freeze\(\{[\s\S]*?\}\)/) || [''])[0]
    const writes = s => (s.match(/stSet\(|localStorage\.setItem\(/g) || []).length
    T('A6', 'vocabulary banks, belt contracts and storage writes are byte-identical to v677 (no learner data path touched)', banks(SRC) === banks(base) && banks(SRC).length > 1000 && writes(SRC) === writes(base), [writes(SRC), writes(base)])
  }
  // ══ B — DETERMINISTIC ACCEPTANCE RULES ════════════════════════════════════════════════════════════════════════════
  {
    const J = c.initJapaneseVocab(), jw = s => J.find(w => w.japanese === s)
    const suru = jw('する'), kuru = jw('来る'), taberu = jw('食べる')
    const yes = ['今、何してるの？', 'じゃあ、一緒に何かしない？', '宿題をした。', 'どうすれば？', '何をさせるの？', '何する？'].every(s => c.gen2TargetPresent('ja', s, suru, J))
    const no = !c.gen2TargetPresent('ja', 'しかし、高いね。', suru, J) && !c.gen2TargetPresent('ja', '今日は暇。', suru, J)
    T('B1', 'Japanese target presence is morphology-aware: every する inflection counts (してる, しない, した, すれば, させる), a bare し inside another word does not', yes && no)
    T('B2', '来る / 食べる inflections count (来た, こない, きました, 食べた); the 2-kana きた is deliberately NOT counted (it hides inside できた)',
      c.gen2TargetPresent('ja', 'もう来た？', kuru, J) && c.gen2TargetPresent('ja', '明日こないの？', kuru, J) && c.gen2TargetPresent('ja', '昨日きましたよ。', kuru, J) && c.gen2TargetPresent('ja', 'もう食べた？', taberu, J) &&
      !c.gen2TargetPresent('ja', 'うまくできた？', kuru, J))
    const ctx = { lang: 'th', speechStyle: 'natural' }
    const male = { text: 'คุณไปไหนคะ', speaker: 'male' }, fem = { text: 'คุณไปไหนคะ', speaker: 'female' }, eith = { text: 'คุณไปไหนคะ', speaker: 'either' }, both = { text: 'ผมไปค่ะครับ', speaker: 'male' }
    const r1 = c.gen2SpeakerProblem(ctx, male), r2 = c.gen2SpeakerProblem(ctx, fem), r3 = c.gen2SpeakerProblem(ctx, eith), r4 = c.gen2SpeakerProblem(ctx, both)
    T('B3', 'Thai speaker follows the sentence: a คะ question declared male is rejected, the same sentence by the woman passes, "either" is ASSIGNED to the woman, mixed particles are rejected',
      /needs? a female|female/.test(r1 || '') && r2 === null && r3 === null && eith.speaker === 'female' && /male and female/.test(r4 || ''), [r1, r2, r3, eith.speaker, r4])
    const conv = c.gen2ConventionLine({ lang: 'th', allowedSet: new Set(['ครับ', 'ค่ะ']) }), conv2 = c.gen2ConventionLine({ lang: 'th', allowedSet: new Set(['ผม', 'ฉัน']) })
    T('B4', 'the Thai speaker contract names a pronoun only when it is taught (ผม / ฉัน), otherwise tells the model to leave "I" out', /ผม is not taught/.test(conv) && /ฉัน is not taught/.test(conv) && /says ผม/.test(conv2) && /says ฉัน/.test(conv2))
    const cp = (q, e) => c.gen2CueProblem(q, e, 'zh')
    T('B5', 'cue rules: a cue that restates the English answer (with or without "Tell the other person:" / "Ask:") is rejected; an intent cue passes; a cue containing the target language is rejected',
      cp('Tell the other person: I’m going home.', 'I’m going home.') === 'cue-copies-answer' && cp('Ask: Is this okay?', 'Is this okay?') === 'cue-copies-answer' &&
      cp('Where are you going?', 'Where are you going?') === 'cue-copies-answer' && cp('Ask your friend whether this one is all right.', 'Is this okay?') === null &&
      cp('Say 我回家', 'I’m going home.') === 'cue-contains-target-language' && cp('Is this okay?', 'Can I use this one?') === 'cue-not-an-intent')
    const pick = c.gen2PickDistinct('ja', [{ text: '今、何してるの？', function: 'ask' }, { text: 'あれ？今、何してるの？', function: 'ask surprised' }, { text: '一緒に何かしない？', function: 'ask' }, { text: '宿題をしたよ。', function: 'report' }, { text: '何する？', function: 'suggest' }], 3)
    T('B6', 'three DISTINCT applications: a filler-prefixed copy (あれ？今、何してるの？) and a repeated function are skipped', pick.length === 3 && pick.map(p => p.text).join('|') === '今、何してるの？|宿題をしたよ。|何する？', pick.map(p => p.text))
    const ok = { grammar: 'ok', natural: 'natural', translation: 'accurate', target: 'correct', cue: 'useful', speaker: 'ok', useful: 'useful', fragment: false }
    T('B7', 'independent judge rule: everything must pass — "marginal", a weak use, an ambiguous cue or a fragment each reject; a missing verdict is UNVERIFIED and accepts nothing',
      c.gen2Verdict(ok).ok && !c.gen2Verdict({ ...ok, natural: 'marginal' }).ok && !c.gen2Verdict({ ...ok, useful: 'weak' }).ok && !c.gen2Verdict({ ...ok, cue: 'ambiguous' }).ok &&
      !c.gen2Verdict({ ...ok, fragment: true }).ok && /UNVERIFIED/.test(c.gen2Verdict(null).why))
    const TH = c.initVocab(), ZH = c.initMandarinVocab(), tw = s => TH.find(w => w.thai === s)
    T('B8', 'word classes get their own teaching guidance (particle คะ, classifier ใบ, expression すみません, verb する) — difficult words stay teachable, not removed',
      c.gen2WordClass('th', tw('คะ')) === 'particle' && c.gen2WordClass('th', tw('ใบ')) === 'classifier' && c.gen2WordClass('ja', jw('すみません')) === 'expression' && c.gen2WordClass('ja', suru) === 'verb' &&
      /PARTICLE/.test(c.ev('GEN2_CLASS_GUIDE.particle')) && /CLASSIFIER/.test(c.ev('GEN2_CLASS_GUIDE.classifier')))
    T('B9', 'model replies are parsed strictly (code fences tolerated; prose returns null — never a guessed verdict)', c.gen2ParseJson('```json\n{"a":1}\n```').a === 1 && c.gen2ParseJson('I think these are fine.') === null)
  }
  // ══ C — PIPELINE MECHANICS (simulator — says nothing about teaching quality) ═════════════════════════════════════
  {
    const dir = path.join(B, 'cassettes', 'gen2'), cas = fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => ({ f, d: readJ(path.join(dir, f)) }))
    const rep = []
    for (const x of cas) { const r = await runOnceUi(loadFixture(x.d.cassette.meta.fixture), { mode: 'replay', cassette: x.d.cassette }); rep.push({ f: x.f, faithful: r.replay.faithful, same: compareContent(x.d.outcome.content, r.content).identical }) }
    T('C1', 'every Gen2 simulator cassette (' + rep.length + ', all six track types + stress) replays faithfully with identical content — the pilot is deterministic and replayable', rep.length >= 15 && rep.every(r => r.faithful && r.same), rep.filter(r => !(r.faithful && r.same)))
    const daily = cas.filter(x => /daily/.test(x.f) && x.d.outcome.content && x.d.outcome.content.status === 'READY')
    const dOk = daily.every(x => { const ps = x.d.outcome.content.pairs.filter(p => p && p.targetId != null), per = new Map(); ps.forEach(p => per.set(p.targetId, (per.get(p.targetId) || 0) + 1))
      return ps.length === 90 && per.size === 30 && [...per.values()].every(v => v === 3) && new Set(ps.map(p => p.cue)).size === 90 && new Set(ps.map(p => p.text)).size === 90 })
    T('C2', 'a READY Gen2 Daily track has 30 targets × 3 recalls = 90, every cue and every sentence unique across the lesson (' + daily.length + ' READY sim tracks)', daily.length >= 5 && dOk)
    const thR = readJ(path.join(dir, 'synthetic-th-daily.gen2.sim.json')).outcome.content.pairs.filter(p => p && p.targetId != null)
    T('C3', 'Thai composition: the speaker comes from each sentence (ค่ะ / คะ → B the woman, ครับ → A the man), not a fixed alternation',
      thR.every(p => (/ค่ะ|คะ/.test(p.text) ? p.speaker === 'B' : /ครับ/.test(p.text) ? p.speaker === 'A' : true)) && thR.some(p => p.speaker === 'B') && thR.some(p => p.speaker === 'A'))
    const dec = readJ(path.join(dir, 'synthetic-th-daily.gen2.decline.sim.json')).outcome
    T('C4', 'an unteachable target is DEFERRED with its reason and SRS untouched ("still due"), and the next candidate from the existing SRS order takes its slot — the lesson still has 30 × 3',
      dec.gen2.deferred.length === 2 && dec.gen2.replacementsUsed === 2 && dec.content.status === 'READY' && dec.content.pairs.filter(p => p && p.targetId != null).length === 90)
    const gar = readJ(path.join(dir, 'synthetic-zh-daily.gen2.judgegarbage.sim.json')).outcome
    T('C5', 'a judge whose replies cannot be parsed accepts NOTHING (no default pass): no recall is accepted, the budget cap stops the run, the track is NOT_READY with the reason',
      gar.content.status === 'NOT_READY' && gar.content.pairs.length === 0 && /BUDGET/.test(gar.content.reasons.join(' ')))
    const th = readJ(path.join(dir, 'th-daily-2026-10-08.gen2.sim.json')).outcome.gen2
    const sup = [...th.frozen, ...th.deferred].reduce((a, r) => a + r.repeatsSuppressed, 0)
    T('C6', 'a rejected candidate offered again is suppressed BEFORE paid judging (' + sup + ' repeats suppressed in the historical Thai run) — no repeated rejection loop', sup > 0)
    const lis = cas.filter(x => /listening/.test(x.f) && x.d.outcome.content && x.d.outcome.content.status === 'READY')
    const lOk = lis.every(x => { const L = x.d.outcome.content.lines, sc = new Set(L.map(l => l.scene)); return sc.size >= 3 && sc.size <= 5 && L.every((l, i) => !i || L[i - 1].scene !== l.scene || L[i - 1].speaker !== l.speaker) && x.d.outcome.content.coverage.covered === 30 })
    T('C7', 'Gen2 Listening: one conversation in 3–5 scenes, speakers alternate, coverage 30/30 measured from the text (' + lis.length + ' READY sim tracks)', lis.length >= 4 && lOk)
    const sr = readJ(path.join(dir, 'synthetic-ja-listening.gen2.scenereject.sim.json')).outcome
    T('C8', 'a scene that fails 3 attempts is NOT committed (a line the editor rejected is refused again without paying for another judgement); its words are spread over the remaining scenes, never silently lost',
      sr.gen2.sceneLog.filter(s => s.scene === 2 && s.attempt).length === 3 && sr.gen2.sceneLog.some(s => s.scene === 2 && /repeats a rejected line/.test((s.problems || []).join(' '))) &&
      !sr.content.lines.some(l => l.scene === 2) && sr.content.coverage.covered === 30)
    const hist = readJ(path.join(dir, 'th-listening-2026-10-08.gen2.decline.sim.json')).outcome
    T('C9', 'a Listening target without a workable exchange is deferred with its reason before freezing, and the next SRS candidate takes its slot (historical Thai learner, 2 words declined → still 30/30 coverage)',
      hist.gen2.deferred.length === 2 && hist.gen2.deferred.every(d => /NO_WORKABLE_EXCHANGE/.test(d.reason)) && hist.content.status === 'READY' && hist.content.coverage.covered === 30 &&
      !hist.content.targets.some(t => hist.gen2.deferred.some(d => d.id === (t.id != null ? t.id : t.targetId))))
  }
  // ══ D — COMPARISON TOOLING ════════════════════════════════════════════════════════════════════════════════════════
  {
    const { measure } = require('./benchmark/compare_gen')
    const old = readJ(path.join(B, 'live', 'v677', 'tt-bench-ja-daily-2026-10-08-run1-v677.json'))
    const m = measure(old)
    T('D1', 'the comparison measures BOTH generators with the same functions: the v677 Japanese run 1 has ' + m.cueCopiesAnswer + ' cues that copy the answer, ' + m.nearDuplicateRecalls + ' near-duplicate recall(s), and 0 targets absent once inflection is understood',
      m.recalls === 90 && m.cueCopiesAnswer >= 20 && m.targetAbsent === 0)
    const src = fs.readFileSync(path.join(B, 'compare_gen.js'), 'utf8')
    T('D2', 'linguistic quality comes only from label files and is marked UNCALIBRATED unless the labels are human; review items can be emitted blind (pipeline hidden)', /UNCALIBRATED/.test(src) && /blind-items\.json/.test(src) && /pipeline hidden/.test(src))
  }
  // ══ E — PANEL ═════════════════════════════════════════════════════════════════════════════════════════════════════
  {
    T('E1', 'the benchmark panel offers the shadow pilot (6 × 1 / 6 × 3), passes pipeline=gen2 to the sandboxed worker and keeps pilot results and files apart (-gen2-)',
      /id="pilot1"/.test(SRC) && /runInWorker\(fx, k, \{ pipeline: 'gen2', judgeModel:/.test(SRC) && /const pipeline = m\.pipeline === 'gen2' \? 'gen2' : 'production'/.test(SRC) && /'-gen2'/.test(SRC))
    T('E2', 'version v678', c.ev('APP_BUILD_VERSION') === 'v678' && c.ev('LISTENING_BUILD_VERSION') === 'v678')
  }
  console.log(out.join('\n'))
  console.log('\nv678 Gen2 shadow pilot: ' + (n - fails) + '/' + n + (fails ? ' — ' + fails + ' FAILED' : ' — ALL PASS'))
  process.exit(fails ? 1 : 0)
})().catch(e => { console.log('CRASH ' + (e && e.stack || e)); process.exit(1) })
