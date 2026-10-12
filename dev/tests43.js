// v683 — GENERATION ARCHITECTURE STABILISATION regression suite (owner brief 2026-10-12). Real application functions only.
//   Q  — one authoritative new-word configuration (owner decision 2): Mukyu th3/ja3/zh5, then 5/7/10/12/15 for every language
//   D  — Mandarin "Next targets" + generation headings show the whole Daily Track (owner decision 3)
//   C  — language-quality corpus: false acceptances / false rejections, old pipeline vs teaching-plan pipeline
//   P  — teaching-plan pipeline contract (one validator, curated fallbacks, consistent instructions, bounded repair)
//   node tests43.js [--app path/to/compiled.js]
'use strict'
const fs = require('fs'), path = require('path')
const { load } = require('./harness')
const R = require('./benchmark/run')
const out = []; let n = 0, fails = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + id.padEnd(5) + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 700) : '')) }
const ai = process.argv.indexOf('--app'), APP = ai > 0 ? path.resolve(process.argv[ai + 1]) : path.join(__dirname, 'tt.compiled.js')
const SRC = fs.readFileSync(path.join(__dirname, 'tt.jsx'), 'utf8')
const has = (c, name) => { try { return c.ev('typeof ' + name) === 'function' } catch (e) { return false } }

;(async () => {
  // ══ Q — new words per Daily Track ═══════════════════════════════════════════════════════════════════════════════════
  {
    const c = load(APP, { realBelt: true })
    const want = { 'White': [3, 3, 5], 'Orange': [5, 5, 5], 'Orange + Stripe': [5, 5, 5], 'Blue': [7, 7, 7], 'Blue + Stripe': [7, 7, 7], 'Yellow': [10, 10, 10],
      'Yellow + Stripe': [10, 10, 10], 'Green': [12, 12, 12], 'Green + Stripe': [12, 12, 12], 'Brown': [15, 15, 15], 'Brown + Stripe': [15, 15, 15], 'Shodan': [15, 15, 15] }
    const bad = Object.entries(want).filter(([b, v]) => ['th', 'ja', 'zh'].some((l, k) => c.getNewWordLimitForBelt(b, l) !== v[k]))
    T('Q1', 'ONE configuration gives the owner\'s table for every rank and language (Mukyu th 3 / ja 3 / zh 5; 10th–9th Kyu 5; 8th–7th 7; 6th–5th 10; 4th–3rd 12; 2nd Kyu–Shodan 15)',
      !bad.length, bad.map(([b]) => b + ': ' + ['th', 'ja', 'zh'].map(l => c.getNewWordLimitForBelt(b, l)).join('/')))
    T('Q2', 'every surface reads it: newWordsPerTrack (dashboard, belt card, selectors, logs, shortfall/QC checks) → getNewWordLimitForBelt; no separate Japanese or Mandarin constant remains',
      !/JA_DAILY_NEW_WORDS|ZH_DAILY_NEW_WORDS/.test(SRC) && /function dailyNewWordsFor[\s\S]{0,300}getNewWordLimitForBelt/.test(SRC) &&
      /lang: 'ja',\n    newSelector: v => japaneseSelectNewSlots/.test(SRC) && /lang: 'zh',\n    newSelector: v => mandarinSelectTargets/.test(SRC))
    // a Japanese learner at 10th Kyu (White complete): the REAL selector picks 5 new words out of 30 targets
    const J = c.initJapaneseVocab(), today = new Date().toISOString().slice(0, 10)
    J.forEach(w => { if (w.belt === 'White') Object.assign(w, { status: 'known', okCount: 12, okStreak: 12, repCount: 15, lastSeen: today, dueDate: '2099-01-01' }) })
    const J2 = c.initJapaneseVocab()   // a Mukyu learner with 40 words met
    J2.slice(0, 40).forEach(w => Object.assign(w, { status: 'learning', repCount: 3, okCount: 1, lastSeen: today, dueDate: today }))
    const sel = v => c.selectTrackTargets({ vocab: v, targetCap: 30, lang: 'ja', newSelector: x => c.japaneseSelectNewSlots(x, []) })
    const s10 = sel(J), sM = sel(J2)
    T('Q3', 'Japanese 10th Kyu: the real selector introduces 5 new words (was 3) and the Daily Track keeps 30 targets; a Mukyu Japanese learner still gets 3',
      c.earliestIncompleteBelt(J) === 'Orange' && c.newWordsPerTrack('ja', 'daily', J) === 5 && s10.counts.new === 5 && s10.targets.length === 30 &&
      c.newWordsPerTrack('ja', 'daily', J2) === 3 && sM.counts.new === 3, { belt: c.earliestIncompleteBelt(J), s10: s10.counts, sM: sM.counts })
    const Z = c.initMandarinVocab(), Th = c.initVocab()
    T('Q4', 'Mukyu beginners: Mandarin 5, Thai 3 (owner table; Thai White was 5 in v682 — the one deliberate change, flagged in the report), Japanese 3',
      c.newWordsPerTrack('zh', 'daily', Z) === 5 && c.newWordsPerTrack('th', 'daily', Th) === 3 && c.newSlotsFor(Th) === 3 && c.newWordsPerTrack('ja', 'daily', c.initJapaneseVocab()) === 3)
    T('Q5', 'Revision and Listening tracks introduce 0 new words in every language (unchanged)',
      ['th', 'ja', 'zh'].every(l => c.newWordsPerTrack(l, 'revision', []) === 0 && c.newWordsPerTrack(l, 'listening', []) === 0))
  }
  // ══ D — Mandarin target display ═════════════════════════════════════════════════════════════════════════════════════
  {
    T('D1', 'the Mandarin dashboard gets the 30-target Daily Track list for "Next targets" (labelled new / review) while Learn New Words keeps the new words only',
      /<MandarinDashboard vocab=\{vocab\} tracks=\{tracks\} targets=\{newTargets\} trackTargets=\{targets\}/.test(SRC) && /Next targets \(\{list\.length\}\) · \{nNew\} new · \{list\.length - nNew\} review/.test(SRC) &&
      /<MandarinLearnWords words=\{newTargets\.filter\(w => w\.selectionRole === 'new'\)\}/.test(SRC))
    T('D2', 'generation-screen headings (Mandarin and Japanese) count the targets actually generated, not the raw new-word selection',
      (SRC.match(/describeTargetSelection\(\(selection && selection\.counts\) \|\| \{[^}]*\}, targets\)/g) || []).length === 3)
  }
  // ══ C — language-quality corpus (real sentences from the 2026-10-12 production logs and the v682 sandbox runs) ═══════════
  {
    const { run } = require('./sandbox/corpus_eval')
    const r = run(APP)
    T('C1', 'corpus, deterministic entries: the teaching-plan pipeline makes fewer false acceptances AND fewer false rejections than v682 (old ' +
      r.old.correct + '/' + r.old.decided + ' correct, ' + r.old.falseAccept.length + ' FA / ' + r.old.falseReject.length + ' FR → new ' + r.new.correct + '/' + r.new.decided + ', ' + r.new.falseAccept.length + ' FA / ' + r.new.falseReject.length + ' FR)',
      r.new.falseAccept.length < r.old.falseAccept.length && r.new.falseReject.length < r.old.falseReject.length && r.new.correct > r.old.correct, { old: r.old, new: r.new })
    T('C2', 'the four live false acceptances are gone under the plan: 有不。 · 一緒ある？ · บ้านหลังนั้นสวยมากครับ (wrong sense) — and the false rejections 我找你 / 我等你 / どれがいいかな？ / 一緒に乗らない？ / 早く来てね pass',
      ['有不。', '一緒ある？', 'บ้านหลังนั้นสวยมากครับ'].every(t => { const x = r.rows.find(y => y.text === t); return x && x.new.verdict === 'reject' }) &&
      ['我找你', '我等你', 'どれがいいかな？', '一緒に乗らない？', '駅で待ってるよ。早く来てね。'].every(t => { const x = r.rows.find(y => y.text === t); return x && x.new.verdict === 'accept' }))
  }
  // ══ P — teaching-plan pipeline contract ═════════════════════════════════════════════════════════════════════════════
  {
    const c = load(APP, { realBelt: true })
    const on = f => { const w = c.setTeachingPlan(true); try { return f() } finally { c.setTeachingPlan(w) } }
    T('P1', 'the switch is OFF by default and only the sandbox pipeline turns it on (learner screens never do); OFF is the v682 generator',
      c.teachingPlanOn() === false && (SRC.match(/setTeachingPlan\(/g) || []).length === 3 && /const _tpWas = setTeachingPlan\(o\.pipeline === 'teaching-plan'\)/.test(SRC) && /finally \{ setTeachingPlan\(_tpWas\) \}/.test(SRC))
    // Mandarin: no string-built fallback
    const zfx = R.loadFixture('zh-daily-2026-10-08'), ZV = c.ttBenchApplyFixture(c.initMandarinVocab(), zfx), ZTG = c.ttBenchJazhTargets(zfx, ZV)
    const zinv = c.mandarinLearnerInventory(ZV, ZTG), zrules = c.mandarinScarcityRules(zinv)
    const bu = ZTG.find(t => t.chinese === '不')
    const fbOld = [1, 2, 3].map(k => (c.mandarinFallbackPair(bu, zinv, k, new Map(), ZV, zrules) || {}).chinese).filter(Boolean)
    const fbNew = on(() => ZTG.flatMap(t => [1, 2, 3].map(k => ({ t: t.chinese, s: (c.mandarinFallbackPair(t, zinv, k, new Map(), ZV, zrules) || {}).chinese })).filter(x => x.s)))
    const generic = fbNew.filter(x => /^(有|我要)[^\s]{1,2}[。]$/.test(x.s) || x.s === x.t + '。' || x.s === x.t + '吗？')
    T('P2', 'Mandarin under the plan: the deterministic fallback returns hand-written frames only — no 有X / 我要X / X。 / X吗？ concatenation for any fixture target (v682 for 不: ' + fbOld.join(' / ') + ')',
      !generic.length && !fbNew.some(x => /有不|我要不/.test(x.s)), generic.slice(0, 6))
    // Japanese: no intent-frame / add-on fallback output
    const jfx = R.loadFixture('ja-daily-2026-10-08'), JV = c.ttBenchApplyFixture(c.initJapaneseVocab(), jfx), JTG = c.ttBenchJazhTargets(jfx, JV), jinv = c.japaneseLearnerInventory(JV, JTG)
    const jaOut = on(() => JTG.flatMap(t => [1, 2, 3].map(k => ((c.jaFallbackRecall(t, jinv, k, []) || {}).japanese) || null)).filter(Boolean))
    const curated = new Set(Object.values(c.ev('JA_HINT_PAIRS')).flat().map(x => x[0]).concat(Object.values(c.ev('JA_TARGET_CONSTRUCTIONS')).flat().map(x => x.jp)))
    T('P3', 'Japanese under the plan: every fallback recall is a hand-written frame (JA_HINT_PAIRS / JA_TARGET_CONSTRUCTIONS) — never 一緒ある？ / 明日分かる？-style joins; teachability may still count role frames',
      jaOut.length > 0 && jaOut.every(x => curated.has(x)) && !jaOut.includes('一緒ある？') && /jaFallbackRecall\(target, inv, r, seen, \{ forTeachability: true \}\)/.test(SRC), jaOut.filter(x => !curated.has(x)).slice(0, 6))
    // Japanese grammar permissions + safeguards (owner decision 1)
    const doko = JTG.find(t => t.japanese === 'どれ') || JV.find(t => t.japanese === 'どれ'), iku = JTG.find(t => t.japanese === '行く') || JV.find(t => t.japanese === '行く')
    const ev = (t, jp, en, cue) => on(() => { const inv = JTG.some(w => w.id === t.id) ? jinv : c.japaneseLearnerInventory(JV, JTG.concat([t]))
      const r = c.jaEvaluateRecallCandidate({ japanese: jp, english: en, prompt: cue }, { target: t, inv, vocab: JV, registerId: c.ev('JA_REGISTER_DEFAULT'), seenMap: new Map(), rules: c.scarcityRules(inv), opts: {}, onLog: null }); return r.ok ? 'ok' : r.failure })
    const k1 = ev(doko, 'どれがいいかな？', 'Which one is good, I wonder?', 'Wonder aloud which one is good')
    const k2 = ev(doko, 'どれがいいかな？', 'Which one is good?', 'Ask which one is good')
    const k3 = ev(iku, '行くな。', "Don't go.", 'Tell them not to go')
    const k4 = ev(iku, '駅だけ行く。', 'I only go to the station.', 'Say you only go to the station')
    const k5 = ev(doko, 'え、どれ？', 'Huh? Which one?', 'Ask which one, surprised')
    T('P4', 'Japanese permissions: かな accepted when the English shows the uncertainty, rejected when it does not; the prohibitive 行くな and だけ stay unauthorised; the interjection え is free',
      k1 === 'ok' && /かな/.test(k2) && k3 !== 'ok' && k4 !== 'ok' && k5 === 'ok', { k1, k2, k3, k4, k5 })
    const zp = on(() => c.buildMandarinPrompt(ZTG[0], zinv, ZV, 2, zrules).user)
    const zpOld = c.buildMandarinPrompt(ZTG[0], zinv, ZV, 2, zrules).user
    const jp = on(() => c.buildJapaneseGroupPrompt(doko, [{ recallIndex: 1 }, { recallIndex: 2 }, { recallIndex: 3 }], jinv, JV, c.ev('JA_REGISTER_DEFAULT'), { initial: true }))
    T('P5', 'instructions agree with the checks under the plan: Mandarin drops "similar structures are DESIRABLE" and the copied example sentences and states the planned application; Japanese states the exact grammar permissions instead of "particles are free"',
      /TEACHING PLAN/.test(zp) && /THIS recall = application 2/.test(zp) && !/DESIRABLE/.test(zp) && !/AUTHORISED EXAMPLES/.test(zp) &&
      /GRAMMAR PERMISSIONS/.test(jp.system) && !/Particles, the copula and normal inflection of allowed words are free/.test(jp.system) && /TEACHING PLAN/.test(jp.user) &&
      (/DESIRABLE|Vary the grammar/.test(zpOld)), { zp: zp.slice(0, 200) })
    // Thai: sense-keyed classifier guide and the wrong-sense check
    const TV = c.initVocab(), tw = t => TV.find(w => w.thai === t)
    const s1 = on(() => [c.thaiTpSenseProblem('บ้านหลังนั้นสวยมากครับ', tw('หลัง')), c.thaiTpSenseProblem('ผมจะไปทีหลังครับ', tw('หลัง')), c.thaiClassifierGuideFor(tw('หลัง')), c.thaiClassifierGuideFor(tw('ชิ้น')), c.thaiTpNotSense(tw('หลัง'))])
    T('P6', 'Thai under the plan: หลัง ("after / back") gets no house-classifier guide, its plan says NOT the classifier use, and บ้านหลังนั้น is rejected as WRONG_SENSE while ทีหลัง passes; ชิ้น keeps its classifier guide; OFF keeps v682 behaviour',
      /WRONG_SENSE/.test(s1[0]) && !s1[1] && !s1[2] && !!s1[3] && /classifier/.test(s1[4]) && !!c.thaiClassifierGuideFor(tw('หลัง')), s1)
    T('P7', 'Thai under the plan: no gloss-guessed template fallback (makeFallbackPairs returns nothing; hand-written HARDCODED_FALLBACKS only)',
      on(() => c.makeFallbackPairs(tw('เดิน') || TV[50])).length === 0 && c.makeFallbackPairs(tw('เดิน') || TV[50]).length > 0)
    // Stage A live findings (2026-10-12) — fixed under the plan only
    const zfx5 = R.loadFixture('zh-daily-2026-10-08-t5'), ZV5 = c.ttBenchApplyFixture(c.initMandarinVocab(), zfx5), ZT5 = c.ttBenchJazhTargets(zfx5, ZV5)
    const zi5 = c.mandarinLearnerInventory(ZV5, ZT5), zr5 = c.mandarinScarcityRules(zi5), hen = ZT5.find(t => t.chinese === '很')
    const zv = (s, on1) => { const w = c.setTeachingPlan(on1); try { const r = c.validateMandarinPair({ chinese: s, pinyin: 'x', english: 'x', prompt: 'x', segments: c.segmentMandarin(s, zi5.lexicon).map(x => ({ surface: x.surface, pinyin: 'x', english: 'x' })) }, hen, zi5, ZV5, zr5, new Map()); return r.ok } finally { c.setTeachingPlan(w) } }
    T('P9', 'Mandarin 很 + feeling verb (live Stage A: only 好 / 小 known, the model looped on 这个很好): under the plan 我很喜欢这个 / 我很想吃 pass, 我很要 / 我很吃 stay rejected, and the prompt states the same rule; v682 rejects both',
      zv('我很喜欢这个。', true) && zv('我很想吃。', true) && !zv('我很要。', true) && !zv('我很吃。', true) && !zv('我很喜欢这个。', false) &&
      on(() => /很 \+ a FEELING verb/.test(c.buildMandarinPrompt(hen, zi5, ZV5, 3, zr5).user)) && /never 很 \+ verb\/noun/.test(c.buildMandarinPrompt(hen, zi5, ZV5, 3, zr5).user))
    const P2 = (thai, english) => ({ thai, english })
    T('P10', 'Thai same-application check (live Stage A: นี่เป็นคู่ที่สวยงามมากครับ / นี่เป็นคู่ที่ดีครับ): a recall with the same speech act and frame as an accepted one is rejected; a question vs a statement is not; v682 run outputs ครั้งนี้คุณไปไหมคะ ~ ครั้งนี้คุณไปอีกไหมคะ are caught',
      !!c.thaiTpSameFrame(P2('นี่เป็นคู่ที่ดีครับ', 'This is a good pair.'), [P2('นี่เป็นคู่ที่สวยงามมากครับ', 'This is a very beautiful pair.')], tw('คู่')) &&
      !c.thaiTpSameFrame(P2('ฉันควรมีคู่แบบไหนคะ', 'What kind of pair should I have?'), [P2('ผมว่าคุณควรมีคู่ด้วยครับ', 'I think you should have a pair too.')], tw('ควร')) &&
      !!c.thaiTpSameFrame(P2('ครั้งนี้คุณไปไหมคะ', 'Are you going this time?'), [P2('ครั้งนี้คุณไปอีกไหมคะ', 'Are you going again this time?')], tw('ครั้ง')) &&
      /teachingPlanOn\(\) \? thaiTpSameFrame\(p, valid, target\)/.test(SRC) && /teachingPlanOn\(\) \? thaiTpSameFrame\(p, have\.filter/.test(SRC))
    T('P11', 'Thai classifier plan names the counted noun (live Stage A: ใบนี้สวยนะคะ glossed "This leaf is beautiful"); Japanese あ / え only for a real reaction, never filler',
      /NOUN \+ classifier \+ นี้/.test(c.teachingPlanLine(c.teachingPlan('th', tw('ใบ')), 2)) && !/NOUN \+ classifier/.test(c.teachingPlanLine(c.teachingPlan('zh', ZTG[0], { wordClass: 'classifier' }), 2)) &&
      /never as filler/.test(c.jaTpPermissionLine()))
    T('P12', 'Mandarin degree adverbs get their own plan (describe · ask/contrast · feeling verb) instead of the generic "different situation"; 这个太好吗？ (live Stage B false acceptance) is rejected under the plan, 太好了 passes; v682 pattern unchanged',
      on(() => c.teachingPlan('zh', hen).wordClass === 'degree' && /FEELING/.test(c.teachingPlanLine(c.teachingPlan('zh', hen), 3))) && c.teachingPlan('zh', hen).wordClass === 'degree' &&
      on(() => c.mandarinSurfaceGrammarProblems('这个太好吗？', zi5).length > 0 && !c.mandarinSurfaceGrammarProblems('这个太好了！', zi5).length) && !c.mandarinSurfaceGrammarProblems('这个太好吗？', zi5).length)
    const J = (text, english) => ({ text, english })
    T('P13', 'one shared same-application principle for Thai and Japanese (live Stage B: じゃあ、また明日ね / また明日ね · どれがいいかな？ / どれがいい？ · 明日、店に来る？ / 明日来る？ are the same use); different uses pass (いつ来る？ / 明日来る？ · これ、分かる？ / うん、分かるよ。)',
      c.teachingSameFrame('ja', J('また明日ね。', 'See you tomorrow, okay?'), J('じゃあ、また明日ね。', 'Well then, see you tomorrow.'), 'また') &&
      c.teachingSameFrame('ja', J('どれがいい？'), J('どれがいいかな？'), 'どれ') && c.teachingSameFrame('ja', J('明日来る？'), J('明日、店に来る？'), '来る') &&
      !c.teachingSameFrame('ja', J('いつ来る？'), J('明日来る？'), '来る') && !c.teachingSameFrame('ja', J('これ、分かる？'), J('うん、分かるよ。'), '分かる') &&
      /if \(teachingPlanOn\(\)\) for \(const \[, e\] of seenMap\) if \(e && e\.targetId === targetId && e\.text && teachingSameFrame\('ja'/.test(SRC))
    T('P8', 'bounded repair: under the plan a Mandarin repeat is recorded (the same repeat twice ends paid attempts) and the retry names the failure and the clashing recall; quota recovery passes rejection memory instead of seeding rejected sentences as accepted',
      /_rej\.record\(_rejScope, cand\.chinese, 'same application as ' \+ _clash\)/.test(SRC) && /teachingRepairLine\(last, _zhClash/.test(SRC) && /priorRejected: _tpPrior/.test(SRC) &&
      /it repeats the accepted recall/.test(c.teachingRepairLine('same application', '这个很大', c.teachingPlan('zh', ZTG[0]), 2)))
  }
  console.log(out.join('\n'))
  console.log('\nv683 generation architecture stabilisation: ' + (n - fails) + '/' + n + (fails ? ' — ' + fails + ' FAILED' : ' — ALL PASS'))
  process.exit(fails ? 1 : 0)
})().catch(e => { console.log('CRASH ' + (e && e.stack || e)); process.exit(1) })
