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
    // v679: exactly ONE learner-facing call site — jaGen2MainTrack, reached only from the Japanese screen when the learner turns
    // the OFF-by-default switch on (and from its benchmark mirror). Thai / Mandarin / Listening screens never call Gen2.
    // v680: the same OFF-by-default switch for Thai and Mandarin (Daily Track only). One learner-facing call site per language.
    const one = l => (OUTSIDE.match(new RegExp("await gen2Daily\\(\\{ lang: '" + l + "'", 'g')) || []).length === 1
    const jaOnly = one('ja') && one('zh') && one('th') && /async function jaGen2MainTrack/.test(OUTSIDE)
    const screen = /const \[useGen2, setUseGen2\] = useState\(false\)/.test(OUTSIDE) && /setUseGen2\(v === true\)/.test(OUTSIDE) && /if \(useGen2\) return runGen2Generation\(\)/.test(OUTSIDE) &&
      /const useGen2 = trackMode !== 'revision' && trackMode !== 'srs' && \(await stGet\(ZH_GEN2_SETTING_KEY\)/.test(OUTSIDE) &&
      /const _g2on = mode === 'daily' && !resumeDraft && \(await stGet\(TH_GEN2_SETTING_KEY\)/.test(OUTSIDE) && /const \[on, setOn\] = useState\(false\)/.test(OUTSIDE)
    const callers = [...OUTSIDE.matchAll(/await jaGen2MainTrack\(/g)].length, zhC = [...OUTSIDE.matchAll(/await zhGen2MainTrack\(/g)].length, thC = [...OUTSIDE.matchAll(/await thGen2MainPairs\(/g)].length
    T('A2', 'Gen2 reaches learners ONLY through the per-language screen switches (OFF by default, on only when the learner sets it; Thai/Mandarin Daily Track only) and their benchmark mirrors; the shadow pipeline=gen2 branch is unchanged',
      calls === 5 && branch && jaOnly && screen && callers === 2 && zhC === 2 && thC === 2, { calls, callers, zhC, thC })
    T('A3', 'the Gen2 block writes nothing: no storage, no SRS / vocabulary update, no saved track, no attempt record', !/stSet\(|localStorage|sessionStorage|setVocab|onSave|saveListeningAttempt|saveTrack|window\.storage/.test(G2))
    T('A4', 'Gen2 commits no PROVEN template realisation and uses no fixed phase storyline (no proven frames, no planListeningConversation, no OPEN/DECIDE/ARRANGE phase list)',
      !/proven|PROVEN|planListeningConversation|listeningVerbal|LISTENING_PHASE|'OPEN'|'DECIDE'|'ARRANGE'/.test(G2CODE))
    // production behaviour: the 18 LIVE v677 runs (real Gemini responses) replay byte-for-byte with identical content on this build
    // v681: the standard generator's validators changed ON PURPOSE (three-language repair). The 18 live v677 runs can no longer
    // replay byte-for-byte; this proves the change is CONFINED: every run replays its setup identically (scene, selection and
    // the first generation requests), every Listening run is faithful except the two Mandarin runs whose planner used the now-
    // rejected 你到哪里？, and each first difference is a validator-driven change (rejection feedback, a regenerated slot or a
    // different accepted line) or one of v681's two deliberate Thai prompt additions (vehicle and function-word targets).
    const dir = path.join(B, 'live', 'v677'), rows = []
    for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.json'))) {
      const r = readJ(path.join(dir, f))
      const fx = loadFixture(r.fixtureId)
      const rep = await runOnceUi(fx, { mode: 'replay', cassette: r.cassette })
      const m0 = rep.replay.mismatches[0]
      rows.push({ f, listening: /listening/.test(f), faithful: rep.replay.faithful, same: compareContent(r.outcome.content, rep.content).identical, firstCall: m0 ? m0.call : null })
    }
    const allowedL = f => /zh-listening-2026-10-08-run[123]/.test(f)   // v681: 你到哪里？ rejected; 们 is now read as grammar (not an unknown length unit)
      || /ja-listening-2026-10-08-run1/.test(f)                           // v682: a どこか / 何か line no longer covers どこ / 何 — the scene's coverage feedback gains one item (request 18)
    T('A5', 'v681+v682 CHANGE IS CONFINED: the 18 live v677 runs replay their setup identically (first difference at request ≥ 6; Thai Daily ≥ 2 — v681 vehicle / function-word prompt guidance); Listening is faithful except the Mandarin runs (你到哪里？ rejected; 们 read as grammar) and Japanese run 1 (v682: どこか ≠ どこ in coverage); Daily runs differ only through validator decisions',
      rows.length === 18 && rows.every(x => x.faithful ? x.same : x.firstCall >= (/th-daily/.test(x.f) ? 2 : 6)) && rows.filter(x => x.listening).every(x => x.faithful || allowedL(x.f)),
      rows.map(x => x.f.replace('tt-bench-', '').replace('-v677.json', '') + ':' + (x.faithful ? 'faithful' : 'differs@' + x.firstCall)))
    const base = fs.readFileSync(path.join(__dirname, 'tt.v677.jsx'), 'utf8')
    const banks = s => (s.match(/const RAW_JAPANESE_VOCAB = \[[\s\S]*?\n\]/) || [''])[0] + (s.match(/const BELT_COMPLEXITY = Object\.freeze\(\{[\s\S]*?\}\)/) || [''])[0]
    const writes = s => (s.match(/stSet\(|localStorage\.setItem\(/g) || []).length
    // v679: exactly ONE new storage write — the switch setting itself (key tt-ja-gen2); no learner-data write is added
    const ckw = (SRC.match(/await stSet\(GEN_CHECKPOINT_KEYS\[lang\], cp \|\| null\)/g) || []).length   // v682: the generation-draft (checkpoint) write site — its own keys, never learner data
    const extra = (SRC.match(/stSet\(JA_GEN2_SETTING_KEY, v\)/g) || []).length + (SRC.match(/stSet\(settingKey, v\)/g) || []).length
    T('A6', 'vocabulary banks and belt contracts are byte-identical to v677; storage writes are v677\'s plus exactly two switch settings (tt-ja-gen2; tt-th-gen2 / tt-zh-gen2 via one shared tick box) and, from v682, ONE generation-draft write site (tt-th/ja/zh-gen-checkpoint) — no learner data path touched', banks(SRC) === banks(base) && banks(SRC).length > 1000 && extra === 2 && writes(SRC) === writes(base) + 2 + ckw && ckw === 1 && /const JA_GEN2_SETTING_KEY = 'tt-ja-gen2'/.test(SRC) && /const TH_GEN2_SETTING_KEY = 'tt-th-gen2'/.test(SRC) && /const ZH_GEN2_SETTING_KEY = 'tt-zh-gen2'/.test(SRC), [writes(SRC), writes(base), extra])
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
    // v679: a stress recording where the (simulated) judge rejects every ครับ sentence, stress: the (simulated) judge rejects every sentence, so later probes re-offer rejected ones
    const th = readJ(path.join(dir, 'th-daily-2026-10-08.gen2.rejectrepeat.sim.json')).outcome.gen2
    const sup = [...th.frozen, ...th.deferred].reduce((a, r) => a + r.repeatsSuppressed, 0)
    T('C6', 'a rejected candidate offered again is suppressed BEFORE paid judging (' + sup + ' repeats suppressed in the historical Thai stress run) — no repeated rejection loop', sup > 0)
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
    T('D1', 'the comparison measures BOTH generators with the same functions: the v677 Japanese run 1 has ' + m.cueCopiesAnswer + ' cues that copy the answer, ' + m.nearDuplicateRecalls + ' near-duplicate recall(s), and ' + m.targetAbsent + ' target uses absent once inflection and question-word compounds are understood (v682: 何か / どこか are not 何 / どこ — 2 lines)',
      m.recalls === 90 && m.cueCopiesAnswer >= 20 && m.targetAbsent === 2)   // v682: 今日は何か食べる？ / じゃあ、どこか入ろうか。 — 何か / どこか are not 何 / どこ
    const src = fs.readFileSync(path.join(B, 'compare_gen.js'), 'utf8')
    T('D2', 'linguistic quality comes only from label files and is marked UNCALIBRATED unless the labels are human; review items can be emitted blind (pipeline hidden)', /UNCALIBRATED/.test(src) && /blind-items\.json/.test(src) && /pipeline hidden/.test(src))
  }
  // ══ E — PANEL ═════════════════════════════════════════════════════════════════════════════════════════════════════
  {
    T('E1', 'the benchmark panel offers the shadow pilot (6 × 1 / 6 × 3), passes pipeline=gen2 to the sandboxed worker and keeps pilot results and files apart (-gen2-)',
      /id="pilot1"/.test(SRC) && /runInWorker\(fx, k, \{ pipeline: 'gen2', judgeModel:/.test(SRC) && /const pipeline = m\.pipeline === 'gen2' \? 'gen2' : 'production'/.test(SRC) && /'-gen2'/.test(SRC))
    T('E2', 'version v681+ (v682 = reliability repair: resumable generation, recovery, teaching-quality rules)', /^v68[12]$/.test(c.ev('APP_BUILD_VERSION')) && c.ev('LISTENING_BUILD_VERSION') === c.ev('APP_BUILD_VERSION'))
  }
  // ══ F — v678.1 SANDBOX FIXES (defects found in the first live Japanese Daily run, 9 Oct 2026) ══════════════════
  {
    const J = c.initJapaneseVocab(), jw = s => J.find(w => w.japanese === s)
    T('F1', 'word class: adverbs (また, たぶん, ちょっと) are adverbs — "adverb" contains "verb" and used to be classed as a verb',
      ['また', 'たぶん', 'ちょっと'].every(x => c.gen2WordClass('ja', jw(x)) === 'adverb') && c.gen2WordClass('ja', jw('食べる')) === 'verb')
    T('F2', 'Japanese / Chinese / Thai sentences lose spaces between words before any check (駅 は どっち？ → 駅はどっち？, ไป ไหน ครับ → ไปไหนครับ); a Thai space after a final particle (between clauses) is kept',
      c.gen2Tidy('ja', 'すみません、駅 は どっち？') === 'すみません、駅はどっち？' && c.gen2Tidy('zh', '你 好 吗？') === '你好吗？' && c.gen2Tidy('th', 'ไป ไหน ครับ') === 'ไปไหนครับ' && c.gen2Tidy('th', 'รีบหน่อยครับ เดี๋ยวสาย') === 'รีบหน่อยครับ เดี๋ยวสาย' && c.gen2Tidy('th', 'ฉันหวังว่าคุณทำได้นะ คะ') === 'ฉันหวังว่าคุณทำได้นะคะ')
    T('F3', 'one utterance by one speaker: a line break or a question followed by its own answer is rejected; a statement + question is not',
      !!c.gen2TurnProblem('ja', 'こんにちは。\nはい、こんにちは。') && !!c.gen2TurnProblem('ja', '水、飲む？ はい、飲む。') && !!c.gen2TurnProblem('ja', '明日、会う。はい、会う。') &&
      !c.gen2TurnProblem('ja', 'ご飯、あるよ。食べる？') && !c.gen2TurnProblem('ja', 'うん、いいよ。'))
    const fx = loadFixture('ja-daily-2026-10-08'), V = c.ttBenchApplyFixture(c.ttBenchBank('ja'), require('./benchmark/embed_fixtures').compact(fx)), byId = new Map(V.map(w => [w.id, w]))
    const tg = fx.targets.map(t => byId.get(t.id)), ctx = c.gen2Context({ lang: 'ja', vocab: V, apiKey: 'x' }), inv = c.gen2Inventory(ctx, tg)
    const untaught = ['わたしにはいもうとがいる。', 'あなたはどっちにする？', 'ねこがいる。', 'かわいい猫だね。'].map(x => c.gen2JaKanaWordProblem(x, inv))
    const fine = ['またあれが食べたい。', 'どこかで飲もうよ。', '今、何してるの？', 'いくらか分からないけど、たぶん高いよ。', 'これ食べる？'].map(x => c.gen2JaKanaWordProblem(x, inv))
    T('F4', 'closed vocabulary, Japanese kana words: untaught hiragana words (いもうと/わたし, あなた, ねこ, かわいい) are rejected — the production line checker passes them — while inflected taught words pass',
      untaught.every(Boolean) && fine.every(x => x === null), { untaught, fine })
    const suru = jw('する'), nani = jw('何')
    const u = (w, t) => c.gen2Units(ctx, w, t).units
    T('F5', 'fragment test counts words, not the complexity estimate: 今、何してるの？ (する) and 何飲む？ (何) are sentences; a lone word is still a fragment',
      u(suru, '今、何してるの？') >= 2 && u(nani, '何飲む？') >= 2 && u(nani, '何？') < 2)
    T('F6', 'romaji line: required for Japanese, must transcribe the reading (tch = cch), and the reading must be exactly this sentence',
      c.gen2JaReadingProblem({ text: '今、何してるの？', reading: 'いま、なにしてるの？', romaji: 'ima, nani shiteru no?' }, inv) === null &&
      /missing/.test(c.gen2JaReadingProblem({ text: '今、何してるの？' }, inv)) &&
      !!c.gen2JaReadingProblem({ text: '今、何してるの？', reading: 'いま、なにしてるの？', romaji: 'kyou nani shiteru no' }, inv) &&
      /not exactly this sentence|own kana/.test(c.gen2JaReadingProblem({ text: 'あれは何？', reading: 'これはなに？', romaji: 'kore wa nani?' }, inv) || '') &&
      c.gen2JaReadingProblem({ text: 'どっち？', reading: 'どっち？', romaji: 'dotchi?' }, inv) === null)
    T('F11', 'pronunciation is its own stage after acceptance (the sentence request asks for no reading — asking made the generator write whole sentences in kana); a Japanese lesson without a validated romaji line is not accepted',
      !/"reading"/.test(c.gen2ProbePrompt({ ...ctx, allowedSet: new Set() }, jw('行く'), inv, [], '', 6)) && /task: gen2-ja-reading/.test(c.gen2PronouncePrompt([{ text: '何？' }])) &&
      /ROMAJI_MISSING/.test(SRC) && /pron = await gen2JaPronounce/.test(SRC))
    const pick = c.gen2PickDistinct('ja', [{ text: 'この本、どう思う？', function: 'ask opinion' }, { text: 'この映画、どう思う？', function: 'opinion of film' }, { text: '駅までどう行く？', function: 'ask way' }, { text: '仕事、どう？', function: 'ask how it went' }], 3)
    T('F7', 'three DISTINCT uses: the same template with another noun (この本／この映画、どう思う？) counts once', pick.length === 3 && !pick.some(p => p.text === 'この映画、どう思う？'), pick.map(p => p.text))
    const base = c.gen2Context({ lang: 'ja', vocab: V, apiKey: 'x' })
    T('F8', 'polite-register words (はい, いいえ, すみません) are taught in polite speech for their own recalls; other words keep casual speech; the run context (budget, counts) is shared',
      c.gen2TargetCtx(base, jw('はい')).speechStyle === 'polite' && c.gen2TargetCtx(base, jw('すみません')).speechStyle === 'polite' && c.gen2TargetCtx(base, jw('食べる')) === base &&
      /gen2Ask\(ctx0, 'P_gen2_probe'/.test(SRC) && !/gen2Ask\(ctx, 'P_gen2_probe'/.test(SRC))
    T('F9', 'cue intent accepts manner adverbs and more imperatives ("Get your friend’s attention", "Politely refuse …"); a translation-style cue is still rejected',
      c.gen2CueProblem("Get your friend's attention before asking them something.", 'Excuse me, got a second?', 'ja') === null &&
      c.gen2CueProblem("Politely refuse your friend's offer.", "No, it's fine. Sorry.", 'ja') === null &&
      c.gen2CueProblem('What are you doing today?', 'What are you doing today?', 'ja') === 'cue-copies-answer')
    T('F10', 'version gen2-pilot/1.1', c.ev('GEN2_VERSION') === 'gen2-pilot/1.1')
    const prices = [{ text: 'これいくら？', function: 'asking price', situation: 'at a shop counter' }, { text: 'いくらお金使ったの？', function: 'asking price', situation: 'after a friend went shopping' },
      { text: 'あの本はいくら？', function: 'asking price', situation: 'pointing at a book in a bookshop window' }]
    const same = [{ text: '今、何してるの？', function: 'ask', situation: 'phone call' }, { text: '一緒に何かしない？', function: 'ask', situation: 'phone call' }]
    T('F12', 'distinct uses: a shared function LABEL alone does not merge different sentences in different situations (six accepted いくら questions all labelled "ask price"); same label + same situation still does',
      c.gen2PickDistinct('ja', prices, 3).length === 3 && c.gen2PickDistinct('ja', same, 3).length === 1)
    T('F13', 'reply words (はい / いいえ / うん) are taught as the learner\'s reply only, the question goes in the cue; they are not fragments by length',
      c.gen2WordClass('ja', jw('はい')) === 'response' && /Write ONLY the learner/.test(c.ev('GEN2_CLASS_GUIDE.response')) && !c.gen2DetCheck(c.gen2TargetCtx(ctx, jw('はい')), jw('はい'), { text: 'はい、お願いします。', english: 'Yes, please.', cue: 'The shop assistant asks whether you need a bag. Say yes.', speaker: 'either' }, inv).some(x => /fragment/.test(x)))
    const rp = (t, r) => c.gen2JaReadingProblem({ text: t, reading: r, romaji: c.kanaToRomaji(r) }, inv)
    T('F14', 'romaji must be EXACTLY this sentence: words added or changed are rejected (明日は何する？ ≠ あしたはなにをする, してる ≠ している); 来 reads く/き/こ by form',
      !!rp('明日は何する？', 'あしたはなにをする？') && rp('明日は何する？', 'あしたはなにする？') === null && !!rp('今何してるの？', 'いまなにしているの？') &&
      ['いつくる？', 'きのうともだちがきたよ。'].every((r, i) => rp(['いつ来る？', '昨日友達が来たよ。'][i], r) === null) && rp('一緒に食べに来ない？', 'いっしょにたべにこない？') === null)
    T('F15', 'a recall whose romaji cannot be validated is swapped for another judge-accepted distinct recall of the same target (pronounced and validated), never kept without romaji',
      /rec\.spares = accepted\.filter/.test(SRC) && /SPARE SWAPS/.test(SRC) && /never kept without romaji, never guessed/.test(SRC))
    T('F17', 'reply-word cues may set up the other person\'s question ("Your friend asks if you are busy today."); translation-style and contentless cues are still rejected',
      c.gen2CueProblem('Your friend asks if you are busy today.', 'Yeah, a little busy.', 'ja') === null && c.gen2CueProblem('The shop assistant asks whether you need a bag. Say yes.', 'Yes, please.', 'ja') === null &&
      c.gen2CueProblem('The weather is nice.', 'Nice weather.', 'ja') === 'cue-not-an-intent' && c.gen2CueProblem('What are you doing today?', 'What are you doing today?', 'ja') === 'cue-copies-answer')
    { const dd = (x, t) => c.gen2DetCheck(c.gen2TargetCtx(ctx, jw(x)), jw(x), { text: t, english: 'x', cue: 'The shop assistant asks something. Answer politely.', speaker: 'either' }, inv)
      T('F18', 'polite-register targets may use polite verb endings (ましょう, ません); casual targets may not; untaught words stay untaught',
        dd('はい', 'はい、一緒に行きましょう。').length === 0 && dd('食べる', '行きましょう、食べよう。').some(x => /untaught/.test(x)) && dd('はい', 'はい、猫がいます。').some(x => /untaught: 猫/.test(x))) }
    T('F19', 'closed vocabulary, kanji stems: a taught word\'s kanji used for an untaught word is rejected (遅れた is not 遅い, 見えない is not 見る) — the line checker passes both — while real inflections and 見に行く pass',
      !!c.gen2JaStemProblem('ごめん、遅れた', inv) && !!c.gen2JaStemProblem('あれが見えない。', inv) &&
      ['映画を見に行こう。', '遅かったね。', '高くない。', '行きました。', '食べちゃった。', '今日、来ない？'].every(x => c.gen2JaStemProblem(x, inv) === null))
    { const mk = l => { const f = loadFixture(l + '-daily-2026-10-08'), VV = c.ttBenchApplyFixture(c.ttBenchBank(l), require('./benchmark/embed_fixtures').compact(f)), bi = new Map(VV.map(w => [w.id, w]))
        const cx = c.gen2Context({ lang: l, vocab: VV, apiKey: 'x' }); return c.gen2Inventory(cx, f.targets.map(t => bi.get(t.id))) }
      const zi = mk('zh'), ti = mk('th')
      T('F20', 'Mandarin / Thai pronunciation is composed from the dictionary (pinyin with tone marks, Thai phonetics); a piece the dictionary cannot pronounce is an untaught word and is rejected (v677 accepted 们 in 我们 and ความหวัง)',
        /[āáǎàēéěèīíǐìōóǒòūúǔù]/.test(c.gen2Pron('zh', '你喜欢这个东西吗？', zi).pron) && c.gen2PronProblem('zh', '你喜欢这个东西吗？', zi) === null &&
        /们/.test(c.gen2PronProblem('zh', '我们一起去', zi) || '') && !!c.gen2PronProblem('th', 'ฉันอยากได้ความหวังค่ะ', ti) &&
        c.gen2PronProblem('th', 'คุณรีบไปไหนครับ', ti) === null && /khráp/.test(c.gen2Pron('th', 'คุณรีบไปไหนครับ', ti).pron)) }
    { const sg = c.gen2JaSegments('映画はよかったよ。', 'えいがはよかったよ。', inv), sg2 = c.gen2JaSegments('昨日、一緒にご飯を食べるのは楽しかった。', 'きのう、いっしょにごはんをたべるのはたのしかった。', inv)
      const aud = (t, g, ro) => ((c.auditJapaneseReading({ japanese: t, reading: g.reading, romaji: ro, phonetic: ro, segments: g.segments }) || {}).problems || [])
      T('F21', 'every Japanese recall carries a word-by-word breakdown aligned to its validated reading, so PRODUCTION\'s own pronunciation audit accepts the Hepburn particles (は→wa, を→o); conjugated words stay whole (楽しかった, 見た); the breakdown also gives a word-spaced romaji',
        sg && sg2 && aud('映画はよかったよ。', sg, 'eiga wa yokatta yo.').length === 0 && aud('昨日、一緒にご飯を食べるのは楽しかった。', sg2, 'kinou, issho ni gohan o taberu no wa tanoshikatta.').length === 0 &&
        sg2.segments.some(x => x.surface === '楽しかった') && sg2.romaji === 'kinou, issho ni gohan o taberu no wa tanoshikatta.' && /dictionary/.test(SRC.slice(SRC.indexOf('async function gen2JaPronounce'), SRC.indexOf('async function gen2JaPronounce') + 2500)), sg2 && sg2.romaji) }
    { const pcs = x => c.gen2JaPieces(x, inv).filter(y => !y.punct).map(y => y.surf + (y.lemma ? '<' + y.lemma : '')).join('|')
      const usage = x => { const segs = c.gen2JaPieces(x, inv).filter(y => !y.punct).map(y => ({ surface: y.surf, ...(y.lemma ? { lemma: y.lemma } : {}), type: 'content' })); const r = c.validateJapaneseUsage({ japanese: x, segments: segs }, inv.jaInv); return Array.isArray(r) ? r : ((r && r.problems) || []) }
      T('F22', 'Japanese recalls are cut into DICTIONARY words carrying their lemma (行きます<行く, してる<する, です<だ, これ|は|いくら), so production\'s own usage rules judge the real words — the correct sentences production QC used to replace (はい、駅へ行きます / 今、何してる？ / また電話しようよ / 大丈夫です) now pass; a candidate production would still reject is rejected by Gen2 up front',
        /行きます<行く/.test(pcs('はい、駅へ行きます。')) && /してる<する/.test(pcs('今、何してる？')) && /これ\|は\|いくら/.test(pcs('すみません、これはいくらですか。')) &&
        ['はい、駅へ行きます。', '今、何してる？', 'また電話しようよ。', 'いいえ、大丈夫です。'].every(x => usage(x).length === 0) && /production usage rule/.test(SRC), pcs('はい、駅へ行きます。')) }
    {
      const two = c.gen2PickDistinct('zh', [{ text: '你到了没有？', cue: 'Ask your friend if they have arrived yet.', function: 'check arrival', situation: 'on the phone' },
        { text: '你到了吗？', cue: 'Ask your friend if they have arrived yet.', function: 'confirm arrival', situation: 'waiting outside' },
        { text: '我到了。', cue: 'Tell your friend you have arrived.', function: 'announce', situation: 'at the door' }], 3)
      T('F25', 'v680: Mandarin uses Chinese punctuation (这个多少钱? → 这个多少钱？; 好, 我来. → 好，我来。)', c.gen2Tidy('zh', '这个多少钱?') === '这个多少钱？' && c.gen2Tidy('zh', '好, 我来.') === '好，我来。' && c.gen2Tidy('zh', '你好！') === '你好！')
      T('F23', 'v680: two candidates with the SAME cue are one use (live zh run: 你到了没有？ / 你到了吗？ broke the lesson with DUPLICATE_CUES)', two.length === 2 && two[1].text === '我到了。', two.map(x => x.text))
      const a = { text: 'ผมของคุณยาว', speaker: 'female' }, b = { text: 'ผมของคุณยาว', speaker: 'either' }
      const pa = c.gen2SpeakerProblem({ lang: 'th' }, a), pb = c.gen2SpeakerProblem({ lang: 'th' }, b)
      T('F24', "v680: Thai speaker follows production's own evidence — ผม (even 'hair') needs the male speaker; a female-declared ผม line is rejected, an 'either' one becomes male", !!pa && pb === null && b.speaker === 'male', [pa, pb, b.speaker])
    }
    T('F16', 'generator prompt: vocabulary discipline (no unlisted nouns, names, 私/あなた) and different real situations', /VOCABULARY DISCIPLINE/.test(c.gen2ProbePrompt({ ...ctx, allowedSet: new Set() }, jw('行く'), inv, [], '', 6)) && /あなた/.test(c.gen2ProbePrompt({ ...ctx, allowedSet: new Set() }, jw('行く'), inv, [], '', 6)))
  }
  console.log(out.join('\n'))
  console.log('\nv680 Gen2 + Japanese/Thai/Mandarin switches: ' + (n - fails) + '/' + n + (fails ? ' — ' + fails + ' FAILED' : ' — ALL PASS'))
  process.exit(fails ? 1 : 0)
})().catch(e => { console.log('CRASH ' + (e && e.stack || e)); process.exit(1) })
