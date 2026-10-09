// v667 — JAPANESE SPEECH-STYLE PROPAGATION (spec "v667 Japanese Speech-Style Propagation", §28–§36).
// Polite / Natural / Very Casual must reach every stage of a Japanese track: snapshot → planner → scenes → repairs →
// naturalness QC → per-scene register audit (hard READY gate) → saved track / history / export.
// The model is simulated at the Gemini boundary (tests14 responder); everything else is app code.
const fs = require('fs')
const { setup, mock } = require('./tests14')
const { load } = require('./harness')
const React = require('react'), TR = require('react-test-renderer')
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const out = []; let fails = 0, n = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + 'JA ' + id.padEnd(4) + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 900) : '')) }
const KEY = 'AIzaSyTEST-harness-key-000000'
const flush = async () => { for (let i = 0; i < 40; i++) await new Promise(r => setImmediate(r)) }
function learner() {
  const S = setup('ja'); S.c.setLearnerStateOverride(null)
  const ids = new Set(S.targets.map(t => t.id))
  S.vocab.forEach(w => { if (ids.has(w.id)) { w.dueDate = '2026-01-01'; w.difficulty = 'hard' } else { w.dueDate = '2099-01-01'; if (w.difficulty === 'hard') w.difficulty = 'medium' } })
  return S
}
// the fixture frames are plain ("それはTよ。", "Tか？"); these turn them into textbook です/ます and back
const toPolite = t => t.replace(/(よ|ね)?。$/, 'です。').replace(/か？$/, 'ですか？')
const toPlain = t => t.replace(/ですか？$/, 'か？').replace(/です。$/, 'よ。')
async function run(S, ln, opt = {}) {
  const st = mock(S, 'ja', { ln })
  const inner = S._mockFn; st.prompts = []
  S.c.mockGeminiGenerate = async (k, m, msgs, max, o) => {
    const q = msgs[msgs.length - 1].content; st.prompts.push(q)
    let r = await inner(k, m, msgs, max, o)
    const sm = q.match(/^Write SCENE (LS\d+) /)
    if (sm && opt.inject) { const j = JSON.parse(r); opt.inject(sm[1], j); r = JSON.stringify(j) }
    if (opt.post) r = opt.post(q, r)
    return r
  }
  const logs = []
  const r = await S.c.buildStandaloneListeningTrack({ lang: 'ja', vocab: S.vocab, apiKey: KEY, model: 'gemini-2.5-flash-lite', onLog: m => logs.push(m), attemptId: 'lattempt-v667', speechStyle: opt.speechStyle })
  return { ...r, st, logs, L: logs.join('\n'), lines: r.track.listening ? r.track.listening.lines.map(l => l.japanese || l.thai) : [] }
}

;(async () => {
  const c = learner().c
  // ══ §2/§3 — one canonical speech style; the three UI labels map deterministically ══
  {
    const m = ['polite', 'です・ます', 'natural', 'Friendly everyday Japanese', 'default', 'casual', 'very_casual', 'Very Casual', 'Slang & close-friend speech', undefined].map(x => c.canonicalJapaneseSpeechStyle(x))
    T('A1', '§2/§3 canonical speech style: POLITE→polite · NATURAL / default / unknown→natural · VERY CASUAL / very_casual / casual→casual (logged as very_casual)',
      m.join() === 'polite,polite,natural,natural,natural,casual,casual,casual,casual,natural' && c.japaneseSpeechStyleName('casual') === 'very_casual' &&
      ['polite', 'natural', 'casual'].every(id => c.ev('JAPANESE_REGISTER_RULES')[id]) && c.ev('JAPANESE_REGISTER_RULES').natural.label === 'Natural' && c.ev('JAPANESE_REGISTER_RULES').casual.label === 'Very Casual', m)
  }
  // ══ §13/§28–§32/§36 — the deterministic register analyser + per-scene audit ══
  {
    const live = ['こんにちは！大丈夫ですか？', 'こんにちは！大丈夫です。', '何か欲しいものがありますか？', '見てください。', '買いたいです。', '行きましょう。', '駅まで歩く？ なんで？', 'うん、いいよ。何時がいい？', 'ここだよ。もう帰るね。', 'またね！']
    const a36 = c.japaneseSceneRegisterAudit(live, 'natural', 'adult friends')
    T('B1', '§36 the live failing track (Natural, friends: 大丈夫ですか / 見てください / 行きましょう … then 歩く？ / いいよ / またね) → JA_REGISTER FAIL — sustained です/ます despite friends',
      a36.verdict === 'FAIL' && a36.politeLines === 6 && a36.plainLines === 4 && a36.offLines.join() === '0,1,2,3,4,5' && /sustained です\/ます/.test(a36.reason), a36)
    const polite80 = ['行きますか？', '何時がいいですか？', 'いいですね。', '見てください。', '明日行きます。', 'そうだね。', 'また明日。']
    const a28 = c.japaneseSceneRegisterAudit(polite80, 'natural', 'adult friends')
    T('B2', '§28 Natural + friends, a scene ~80% です/ます → FAIL (whole-scene SCENE_REGISTER_MISMATCH, cannot be accepted unchanged)', a28.verdict === 'FAIL' && a28.mismatch, a28)
    const casual = ['行く？', 'いいね。', 'そうだね。', 'また明日。', '何時がいい？', 'たぶん。']
    const a29 = c.japaneseSceneRegisterAudit(casual, 'natural', 'adult friends')
    T('B3', '§29 Natural + friends: 行く？ / いいね。 / そうだね。 / また明日。 → PASS', a29.verdict === 'PASS' && a29.politeLines === 0, a29)
    const service = ['いらっしゃいませ。', 'これはいくらですか？', '千円です。', 'カードで払えますか？', 'はい、大丈夫です。', 'ありがとうございます。']
    const a30 = c.japaneseSceneRegisterAudit(service, 'natural', 'customer / shop staff')
    T('B4', '§30 Natural + customer/shop staff: appropriate です/ます service Japanese → PASS (casual speech is not forced on strangers)', a30.verdict === 'PASS' && a30.expected === 'service', a30)
    const politeDrift = ['行きますか？', '行く？', 'いいよ。', '知らない。', 'そうですね。']
    const a31 = c.japaneseSceneRegisterAudit(politeDrift, 'polite', 'acquaintances (adults who are not close)')
    T('B5', '§31 Polite mode drifting into 行く？ / いいよ。 / 知らない。 → FAIL', a31.verdict === 'FAIL' && a31.offLines.length === 3, a31)
    const stiff = ['今日は何をしますか？', 'これ、美味しいですね。', '駅に行きましょう。', 'はい、そうです。']
    const a32 = c.japaneseSceneRegisterAudit(stiff, 'casual', 'close friends')
    T('B6', '§32 Very Casual + close friends, entirely stiff です/ます → FAIL', a32.verdict === 'FAIL' && a32.mismatch, a32)
    const lesson = c.analyseJapaneseRegister('それがすみませんね。', ['すみません'])
    T('B7', 'a sentence whose politeness IS the lesson word (すみません / ください) is neutral, not register drift', lesson.register === 'neutral' && c.analyseJapaneseRegister('見てください。').register === 'polite', lesson)
  }
  // ══ §4–§6/§11/§20/§23/§26 — a Natural Listening track: snapshot, relationships, prompts, QC, audit, READY ══
  {
    const S = learner()
    const r = await run(S, {}, { speechStyle: 'natural' })
    const scenePrompts = r.st.prompts.filter(q => /^Write SCENE LS\d /.test(q))
    const natPrompts = r.st.prompts.filter(q => /You are a native Japanese speaker checking/.test(q))
    T('C1', '§4/§26 log: JA_SPEECH_STYLE selected=natural snapshot=natural · LISTENING_TRACK_START language=ja speechStyle=natural · the track saves speechStyle=natural',
      /JA_SPEECH_STYLE selected=natural snapshot=natural/.test(r.L) && /LISTENING_TRACK_START language=ja speechStyle=natural /.test(r.L) && r.track.speechStyle === 'natural' && r.track.speechStyleSnapshot === 'natural', r.track.speechStyle)
    T('C2', '§10/§11 planner: every scene has relationship=adult friends + expected=plain / friendly everyday (logged JA_SCENE_REGISTER) · shopping is "friends shop together", never a counter',
      (r.L.match(/JA_SCENE_REGISTER scene=LS\d relationship=adult friends speechStyle=natural expected=plain \/ friendly everyday Japanese/g) || []).length === 5 && !/shop counter/.test(r.L), (r.L.match(/LISTENING_SCENE_PLAN[^\n]*/g) || []).slice(0, 5))
    T('C3', '§6/§20 every scene prompt carries TRACK SPEECH STYLE: NATURAL + the register contract + SCENE RELATIONSHIP / EXPECTED REGISTER',
      scenePrompts.length === 5 && scenePrompts.every(q => /TRACK SPEECH STYLE: NATURAL/.test(q) && /REGISTER: NATURAL/.test(q) && /SCENE RELATIONSHIP: adult friends · EXPECTED REGISTER: plain \/ friendly everyday Japanese/.test(q)), scenePrompts.length)
    T('C4', '§23 the naturalness judge is asked "natural FOR THIS RELATIONSHIP AND STYLE" (NATURAL: plain forms between friends)',
      natPrompts.length >= 1 && natPrompts.every(q => /SPEECH STYLE: NATURAL/.test(q) && /FOR THIS RELATIONSHIP AND STYLE/.test(q)), natPrompts.length)
    T('C5', '§15/§16/§26 JA_REGISTER_AUDIT per scene + "scenes=5 pass=5 fail=0 REGISTER_PASS=true" · gate JA_REGISTER_PASS=true · READY · export shows speechStyle=natural',
      (r.L.match(/JA_REGISTER_AUDIT speechStyle=natural scene=LS\d/g) || []).length === 5 && /JA_REGISTER_AUDIT scenes=5 pass=5 fail=0 REGISTER_PASS=true/.test(r.L) &&
      r.track.listening.gates.JA_REGISTER_PASS === true && r.track.status === 'READY' && S.c.listeningTrackExportLines(r.track).some(l => /^speechStyle=natural \(Natural\) · JA_REGISTER_PASS=true/.test(l)),
      { status: r.track.status, failed: r.track.failedChecks })
  }
  // ══ §17/§19 — a whole scene written in です/ます for friends: scene-level transformation at generation time ══
  {
    const S = learner()
    const post = (q, r) => {
      if (!/SCENE_REGISTER_MISMATCH/.test(q) || !/REPAIR SCENE/.test(q)) return r
      const rows = [...q.matchAll(/^(\d+)\. ([AB]): (.*?) — /gm)].map(m => ({ line: +m[1], sp: m[2], text: m[3] }))
      return JSON.stringify({ edits: rows.map(x => ({ op: 'replace', line: x.line, span: 1, turns: [{ speaker: x.sp, text: toPlain(x.text), english: 'Mock.' }] })) })
    }
    const r = await run(S, {}, { speechStyle: 'natural', post, inject: (sid, j) => { if (sid === 'LS2') j.turns.forEach(t => { t.text = toPolite(t.text) }) } })
    const iT = r.logs.findIndex(l => /PATCH_ACCEPTED register-transform LS2/.test(l)), iLS3 = r.logs.findIndex(l => /LISTENING_COMPOSITION scene LS3/.test(l))
    T('D1', '§17/§19 Natural friend scene generated in です/ま → JA_SCENE_REGISTER verdict=FAIL as generated → SCENE_REGISTER_MISMATCH → ONE scene-level register transformation (validated) BEFORE LS3 → READY',
      /JA_SCENE_REGISTER scene=LS2 .*verdict=FAIL .*\(as generated\)/.test(r.L) && /SCENE_REGISTER_MISMATCH LS2/.test(r.L) && iT >= 0 && iT < iLS3 &&
      r.track.status === 'READY' && r.track.listening.gates.JA_REGISTER_PASS === true && !r.lines.some(t => /です/.test(t)), { iT, iLS3, status: r.track.status, failed: r.track.failedChecks })
    // the same scene, nothing repairs it → JA_REGISTER_PASS=false blocks READY
    const S2 = learner()
    const r2 = await run(S2, { atomicNoop: true }, { speechStyle: 'natural', inject: (sid, j) => { if (sid === 'LS2') j.turns.forEach(t => { t.text = toPolite(t.text) }) } })
    // v669 §17: the wrong-register candidate is never committed — LS2 is re-planned / UNCOMMITTED; no です/ます friend line in the track
    T('D2', '§16/§28 unrepaired です/ます friend scene → JA_SCENE_REGISTER FAIL as generated → (v669/v673) never committed as written: LS2 regenerated from its plan / re-planned / trimmed / UNCOMMITTED, JA_REGISTER_PASS holds for every committed scene, READY iff every gate passes',
      /JA_SCENE_REGISTER scene=LS2 .*verdict=FAIL/.test(r2.L) && /SCENE_REPLAN LS2|SCENE_NOT_COMMITTED LS2|PHASE_REGENERATE LS2 |LISTENING_GLOBAL_REPLAN after LS2 |PHASE_TRIMMED LS2 |PHASE_NOT_COMMITTED LS2 /.test(r2.L) && !r2.lines.some(t => /です|ます/.test(t)) &&
      (!r2.track.listening || r2.track.listening.gates.JA_REGISTER_PASS === true) && (r2.track.status === 'READY') === (r2.track.failedChecks.length === 0),
      { status: r2.track.status, failed: r2.track.failedChecks })
    // a few off-register lines (not the whole scene): atomic REGISTER repair per line, with style in the prompt
    const S3 = learner()
    const r3 = await run(S3, {}, { speechStyle: 'natural', inject: (sid, j) => { if (sid === 'LS3') [1, 3].forEach(k => { if (j.turns[k]) j.turns[k].text = toPolite(j.turns[k].text) }) } })
    const at = r3.st.prompts.filter(q => /ATOMIC REPAIR/.test(q) && /\] REGISTER/.test(q))
    T('D3', '§18/§20 two です/ます lines in a friend scene → atomic REGISTER repair of THOSE lines only; the repair prompt says TRACK SPEECH STYLE: NATURAL · SCENE RELATIONSHIP: adult friends · EXPECTED REGISTER: plain → READY',
      at.length >= 1 && at.every(q => /TRACK SPEECH STYLE: NATURAL · SCENE RELATIONSHIP: adult friends · EXPECTED REGISTER: plain/.test(q)) && /LISTENING_ATOMIC_REPAIR issue=REGISTER scene=LS3/.test(r3.L) &&
      !/SCENE_REGISTER_MISMATCH LS3/.test(r3.L) && r3.track.status === 'READY', { calls: at.length, status: r3.track.status, failed: r3.track.failedChecks })
  }
  // ══ §21/§22/§33 — a CLOSED_VOCAB repair that turns a Natural line polite is REGISTER_REGRESSION ══
  {
    const S = learner()
    const post = (q, r) => { if (!/ATOMIC REPAIR of .* LISTENING lines/.test(q) || !/CLOSED_VOCAB/.test(q)) return r
      const j = JSON.parse(r); (j.repairs || []).forEach(x => (x.lines || []).forEach(l => { l.text = toPolite(l.text) })); return JSON.stringify(j) }
    const r = await run(S, {}, { speechStyle: 'natural', post, inject: (sid, j) => { if (sid === 'LS2' && j.turns[1]) j.turns[1].text = j.turns[1].text.replace(/([。？！])?$/, m => '宇宙' + m) } })
    T('E1', '§22/§33 Natural line 明日行く？-style + CLOSED_VOCAB → the repair removes the word but returns です/ます → PATCH_REJECTED reason=REGISTER_REGRESSION (original kept, never committed)',
      r.logs.some(l => /PATCH_REJECTED issue=i\d+ .*reason=REGISTER_REGRESSION/.test(l)) && !r.lines.some(t => /です/.test(t)), r.logs.filter(l => /PATCH_REJECTED/.test(l)).slice(0, 2))
  }
  // ══ §7/§31 — Polite Listening: polite contract, acquaintances, plain drift repaired ══
  {
    const S = learner()
    const post = (q, r) => { if (/^Write SCENE LS\d /.test(q)) { const j = JSON.parse(r); j.turns.forEach(t => { t.text = toPolite(t.text) }); return JSON.stringify(j) }
      if (/ATOMIC REPAIR of .* LISTENING lines/.test(q)) { const j = JSON.parse(r); (j.repairs || []).forEach(x => (x.lines || []).forEach(l => { l.text = toPolite(l.text) })); return JSON.stringify(j) }
      return r }
    const r = await run(S, {}, { speechStyle: 'polite', post, inject: (sid, j) => { if (sid === 'LS4' && j.turns[2]) j.turns[2].text = toPlain(j.turns[2].text) } })
    T('F1', '§7/§31 Polite: JA_SPEECH_STYLE snapshot=polite · scenes are acquaintances expecting です/ます · a plain line that drifts in is repaired as REGISTER · REGISTER_PASS=true',
      /JA_SPEECH_STYLE selected=polite snapshot=polite/.test(r.L) && (r.L.match(/JA_SCENE_REGISTER scene=LS\d relationship=acquaintances[^\n]*expected=polite/g) || []).length >= 5 &&
      r.st.prompts.filter(q => /^Write SCENE/.test(q)).every(q => /TRACK SPEECH STYLE: POLITE/.test(q) && /REGISTER: POLITE/.test(q)) && /REGISTER_PASS=true/.test(r.L) && r.track.speechStyle === 'polite',
      { status: r.track.status, failed: r.track.failedChecks })
  }
  // ══ §9/§32 — Very Casual: close friends, the very-casual contract reaches the prompts ══
  {
    const S = learner()
    const r = await run(S, {}, { speechStyle: 'very_casual' })
    T('G1', '§9 Very Casual: snapshot=very_casual (canonical casual) · close friends · "REGISTER: VERY CASUAL" in every scene prompt · READY',
      /JA_SPEECH_STYLE selected=very_casual snapshot=very_casual/.test(r.L) && r.track.speechStyle === 'casual' && (r.L.match(/relationship=close friends/g) || []).length >= 5 &&
      r.st.prompts.filter(q => /^Write SCENE/.test(q)).every(q => /REGISTER: VERY CASUAL/.test(q)) && r.track.status === 'READY', { status: r.track.status, failed: r.track.failedChecks })
  }
  // ══ §34/§35 — the snapshot survives a mid-run UI change; a saved track keeps its own style ══
  {
    const S = learner()
    const cr = load(process.env.TT_FILE || 'tt.compiled.js', { React, realBelt: true }); cr.console.info = () => {}
    const SR = { ...S, c: cr }
    const st = mock(SR, 'ja', { ln: {} }); const inner = SR._mockFn; const prompts = []
    cr.mockGeminiGenerate = async (k, m, msgs, max, o) => { prompts.push(msgs[msgs.length - 1].content); return inner(k, m, msgs, max, o) }
    const saved = []
    const props = sp => ({ lang: 'ja', vocab: S.vocab, apiKey: KEY, model: 'm', gcpTtsKey: '', speechStyle: sp, onSave: t => saved.push(t), onBack: () => {} })
    let R
    await TR.act(async () => { R = TR.create(React.createElement(cr.ListeningGenerator, props('natural'))) })
    await TR.act(async () => { R.update(React.createElement(cr.ListeningGenerator, props('polite'))); await flush() })   // the dashboard selector changes mid-run
    // wait for the build to start AND finish (the v673 feasibility step runs before the building marker appears)
    for (let i = 0; i < 80 && (R.root.findAll(x => x.props && x.props['data-listening-track-building']).length || !saved.length); i++) await TR.act(async () => { await flush() })
    const sp = prompts.filter(q => /^Write SCENE/.test(q))
    T('H1', '§34 UI=Natural at start, switched to Polite mid-generation → every scene prompt stays NATURAL · the saved track says speechStyle=natural',
      sp.length === 5 && sp.every(q => /TRACK SPEECH STYLE: NATURAL/.test(q)) && !sp.some(q => /TRACK SPEECH STYLE: POLITE/.test(q)) && saved.length === 1 && saved[0].speechStyle === 'natural', { scenes: sp.length, saved: saved.map(t => t.speechStyle) })
    const atts = await cr.loadListeningAttempts('ja')
    T('H2', '§5/§27 the History attempt record keeps speechStyle=natural', atts.length >= 1 && atts[0].speechStyle === 'natural', atts.map(a => a.speechStyle))
    // §35 — reopen the saved track while the UI says Very Casual: the generator uses the TRACK's style (Rebuild of a saved NOT_READY copy)
    const notReady = { ...saved[0], ready: false, status: 'NOT_READY', playable: false }
    prompts.length = 0
    let R2
    await TR.act(async () => { R2 = TR.create(React.createElement(cr.ListeningGenerator, { ...props('casual'), track: notReady })); await flush() })
    const rb = R2.root.findAll(x => x.type === 'button').find(b => /Rebuild/.test(JSON.stringify(b.props.children)))
    if (rb) { await TR.act(async () => { rb.props.onClick(); await flush() }); for (let i = 0; i < 80 && (R2.root.findAll(x => x.props && x.props['data-listening-track-building']).length || prompts.filter(q => /^Write SCENE/.test(q)).length < 5); i++) await TR.act(async () => { await flush() }) }
    const sp2 = prompts.filter(q => /^Write SCENE/.test(q))
    T('H3', '§35 a saved Natural track reopened while the UI says Very Casual → its Rebuild still generates NATURAL (no fallback to the current selector)',
      !!rb && sp2.length >= 1 && sp2.every(q => /TRACK SPEECH STYLE: NATURAL/.test(q)), { rb: !!rb, scenes: sp2.length })
  }
  // ══ §24/§25 — Daily / Revision use the same canonical style and freeze it too ══
  {
    const src = fs.readFileSync(process.env.TT_SRC || 'tt.jsx', 'utf8')
    const gen = src.slice(src.indexOf('function JapaneseGenerator('), src.indexOf('function JapaneseGenerator(') + 600)
    T('I1', '§4/§24 Japanese Daily / Revision generator freezes the canonical style at mount (useState snapshot of canonicalJapaneseSpeechStyle) — the TrackContext and the saved track read it',
      /register: registerProp/.test(gen) && /const \[register\] = useState\(\(\) => canonicalJapaneseSpeechStyle\(registerProp\)\)/.test(gen) &&
      c.jaGeneratorTrackContext([], null, 'daily', 'natural', 'r').register === 'natural' && /lang="ja" speechStyle=\{register\}/.test(src), gen.slice(0, 200))
  }
  console.log(out.join('\n'))
  console.log(fails ? fails + ' FAILED of ' + n : 'all passed (' + n + ' checks)')
  process.exit(fails ? 1 : 0)
})().catch(e => { console.log(out.join('\n')); console.log('CRASH', e.stack); process.exit(1) })
