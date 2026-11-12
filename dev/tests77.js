// 12 Nov — Thai workflow parity, wave 1, for Japanese and Mandarin (owner: "I want the Thai logic and workflow to apply to all languages").
//   G  the start gate: a lesson that cannot hold its 30 targets is blocked (TRACK_SELECTION_BLOCKED, Thai's wording), and a 4th Daily Track in one day is refused
//   F  the test generator's greeting + parting, and rated framing words
//   S  the Mandarin Ready-screen scene reaches generation
//   T  Thai is unchanged
// Real application functions; the only stand-in is Gen2's model run (gen2Daily), which needs a network.
const { load } = require('./harness')
const fs = require('fs')
const React = require('react')
const c = load(process.env.TT_FILE || 'tt.compiled.js', { React }); c.console.info = () => {}; c.console.warn = () => {}
const SRC = fs.readFileSync('tt.jsx', 'utf8')
let n = 0, fails = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; console.log((pass ? 'PASS ' : 'FAIL ') + id + '  ' + name + (!pass && detail !== undefined ? '\n      ' + JSON.stringify(detail).slice(0, 400) : '')) }
const today = new Date().toISOString().slice(0, 10)
const enGB = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const learned = (list, k) => list.slice(0, k).map(w => ({ ...w, status: 'learning', introducedAt: '2026-08-01', lastSeen: '2026-09-20', okStreak: 1, repCount: 3, interval: 3, dueDate: '2026-09-25' }))

;(async () => {
  const J = c.initJapaneseVocab(), Z = c.initMandarinVocab()
  const gate = c.ev('jazhStartGate'), daily = c.ev('dailyTracksToday')
  const mk = (lang, V, k) => { const L = V.map(w => ({ ...w })); learned(L, k).forEach((w, i) => { L[i] = w }); return L }

  // ══ G — the start gate ═══════════════════════════════════════════════════════════════════════
  {
    const Jv = mk('ja', J, 60), Zv = mk('zh', Z, 60)
    const full = (lang, V) => V.slice(0, 30).map(w => ({ ...w, selectionRole: 'review' }))
    T('G1', '30 targets: Japanese and Mandarin start (no block)', gate({ lang: 'ja', targets: full('ja', Jv), vocab: Jv, trackMode: 'daily', tracks: [] }) === null && gate({ lang: 'zh', targets: full('zh', Zv), vocab: Zv, trackMode: 'daily', tracks: [] }) === null)
    // a bank with only 12 usable words can never hold 30 targets — the same data problem Thai reports
    const tinyJ = J.slice(0, 12).map(w => ({ ...w })), tinyZ = Z.slice(0, 12).map(w => ({ ...w }))
    const gj = gate({ lang: 'ja', targets: tinyJ.map(w => ({ ...w, selectionRole: 'new' })), vocab: tinyJ, trackMode: 'daily', tracks: [] })
    const gz = gate({ lang: 'zh', targets: tinyZ.map(w => ({ ...w, selectionRole: 'new' })), vocab: tinyZ, trackMode: 'daily', tracks: [] })
    T('G2', 'a lesson that cannot hold its 30 targets is blocked with TRACK_SELECTION_BLOCKED (eligible / required), not started short',
      gj && gj.code === 'TRACK_SELECTION_BLOCKED' && /eligible=12 required=30/.test(gj.message) && gz && gz.code === 'TRACK_SELECTION_BLOCKED' && /eligible=12 required=30/.test(gz.message), { gj, gz })
    T('G3', 'the wording is Thai\'s: "…not a normal short lesson — no track was started."', gj && /This is a vocabulary-data problem, not a normal short lesson — no track was started\./.test(gj.message) &&
      /'\\n\\n' \+ _selection\.blocked\.reason \+ '\. This is a vocabulary-data problem, not a normal short lesson/.test(SRC))
    const rev = gate({ lang: 'ja', targets: full('ja', Jv).slice(0, 20), vocab: Jv.slice(0, 20), trackMode: 'revision', tracks: [] })
    T('G4', 'a Revision lesson with fewer than 30 learned words is blocked the same way (Thai: "a Daily/Revision lesson is 30 targets or nothing")', rev && rev.code === 'TRACK_SELECTION_BLOCKED' && /required=30/.test(rev.message), rev)
    // the generators call the gate BEFORE the first paid request, and the apps hand them the track list
    const jaGen = SRC.slice(SRC.indexOf('function JapaneseGenerator('), SRC.indexOf('function JapaneseGenerator(') + 40000)
    const zhGen = SRC.slice(SRC.indexOf('function MandarinGenerator('), SRC.indexOf('function MandarinGenerator(') + 40000)
    T('G5', 'Japanese: buildScene runs the gate before generateJapaneseScene; Mandarin: buildZhScene before generateMandarinScene; both screens receive `tracks`',
      /jazhStartGate\(\{ lang: 'ja'[\s\S]{0,260}generateJapaneseScene\(targets/.test(jaGen) && /async function buildZhScene\(\) \{[\s\S]{0,420}jazhStartGate\(\{ lang: 'zh'[\s\S]{0,260}generateMandarinScene\(targets/.test(zhGen) &&
      /<JapaneseGenerator [^\n]*tracks=\{tracks\}/.test(SRC) && /<MandarinGenerator [^\n]*tracks=\{tracks\}/.test(SRC))
    // an error phase is what the learner sees (no scene is paid for)
    T('G6', 'a blocked or capped start sets the error screen and stops (no scene request)', /if \(_gate\) \{ setError\(_gate\.message\); setPhase\('error'\); return \}/.test(jaGen) && /if \(_gate\) \{ setError\(_gate\.message\); setPhase\('error'\); return \}/.test(zhGen))

    // — the daily cap —
    const dTrack = (date, extra) => ({ date, trackMode: 'daily', mode: 'daily', createdAt: date, pairs: [], ...(extra || {}) })
    const three = [dTrack(today), dTrack(today), dTrack(today)]
    const g3 = gate({ lang: 'ja', targets: full('ja', Jv), vocab: Jv, trackMode: 'daily', tracks: three })
    T('G7', 'three Daily Tracks today: a fourth is refused with Thai\'s message, for both languages', g3 && g3.code === 'DAILY_CAP' && g3.message === 'You already have 3 tracks for today. Come back tomorrow! \u{1F389}' &&
      gate({ lang: 'zh', targets: full('zh', Zv), vocab: Zv, trackMode: 'daily', tracks: three }).code === 'DAILY_CAP' && SRC.includes("'You already have 3 tracks for today. Come back tomorrow! \u{1F389}'".replace('\u{1F389}', '🎉')))
    T('G8', 'two Dailies today are still fine; only DAILY tracks count (a Revision or Listening Track never uses the allowance)',
      gate({ lang: 'ja', targets: full('ja', Jv), vocab: Jv, trackMode: 'daily', tracks: three.slice(0, 2) }) === null &&
      gate({ lang: 'ja', targets: full('ja', Jv), vocab: Jv, trackMode: 'daily', tracks: [...three.slice(0, 2), dTrack(today, { trackMode: 'revision', mode: 'revision' }), dTrack(today, { trackType: 'listening' }), dTrack(today, { trackMode: 'srs' })] }) === null)
    T('G9', 'either date stamp counts (the ISO day ja/zh tracks carry, or Thai\'s "12 Nov 2026"); yesterday\'s tracks do not',
      daily([dTrack(today), dTrack(enGB), dTrack(today.slice(0, 8) + '01', { createdAt: '2020-01-01T00:00:00Z', date: '2020-01-01' })]) === 2 &&
      daily([{ trackMode: 'daily', createdAt: new Date().toISOString() }]) === 1)
    // the Thai screen keeps its own rule untouched
    T('G10', 'Thai is unchanged: the same two gates in its own generator (3 per day excluding custom targets; blocked selection)',
      /if \(todayCount >= 3 && !customTargets\) \{/.test(SRC) && /setError\('TRACK_SELECTION_BLOCKED eligible=' \+ _selection\.blocked\.eligible/.test(SRC) && /trackModeOf\(t\) === 'daily'\)\.length/.test(SRC))
  }

  // ══ F — greeting and parting in the test generator ═══════════════════════════════════════════
  {
    const Jv = mk('ja', J, 60), Zv = mk('zh', Z, 60)
    const tJ = Jv.slice(0, 30).map(w => ({ ...w, selectionRole: 'review' })), tZ = Zv.slice(0, 30).map(w => ({ ...w, selectionRole: 'review' }))
    const fakeG2 = lang => async o => {
      const ids = o.fixedTargets.map(w => w.id), pairs = []
      o.fixedTargets.forEach(w => { for (let r = 1; r <= 3; r++) pairs.push(lang === 'ja'
        ? { speaker: r % 2 ? 'A' : 'B', japanese: w.japanese + 'です', reading: w.reading, romaji: w.romaji, english: 'It is ' + w.english, prompt: 'Say it', targetId: w.id, recallIndex: r, segments: [{ surface: w.japanese, english: w.english }], _gen2: { situation: 'at home' } }
        : { speaker: r % 2 ? 'A' : 'B', chinese: w.chinese, pinyin: w.pinyin, english: 'It is ' + w.english, prompt: 'Say it', targetId: w.id, recallIndex: r, _gen2: { situation: 'at home' } }) })
      return { track: { integrity: { status: 'READY', reasons: [] }, selectedTargetIds: ids, pairs, deferredTargets: [] }, gen2: { models: { generator: 'g', judge: 'j' }, calls: 1, byStage: {}, replacementsUsed: 0 } }
    }
    const jaScene = { scene: 'Two friends meet at a station.', characterA: 'Kenji, a man', characterB: 'Yuki, a woman',
      opening: 'こんにちは', opening_reading: 'こんにちは', opening_romaji: 'konnichiwa', opening_english: 'Hello.', opening_prompt: 'Greet her',
      reply: 'こんにちは', reply_reading: 'こんにちは', reply_romaji: 'konnichiwa', reply_english: 'Hello.', reply_prompt: 'Greet him back',
      closing: 'またね', closing_reading: 'またね', closing_romaji: 'mata ne', closing_english: 'See you.', closing_prompt: 'Say goodbye',
      closing_reply: 'またね', closing_reply_reading: 'またね', closing_reply_romaji: 'mata ne', closing_reply_english: 'See you.', closing_reply_prompt: 'Say goodbye back' }
    c.ev('gen2Daily = ' + fakeG2.toString().replace(/^/, '(') .replace(/$/, ')("ja")') )
    const runJa = async scene => c.jaGen2MainTrack({ targets: tJ, selection: { targets: tJ, counts: {} }, vocab: Jv, register: 'natural', apiKey: null, model: 'm', trackMode: 'daily', runId: 'r1', scene, onLog: () => {} })
    const a = await runJa(jaScene)
    const framingOf = t => t.pairs.filter(p => p._framing)
    T('F1', 'Japanese test generator: the track opens with the scene\'s greeting + reply and closes with its parting + reply (4 framing lines, framingCount 4, 90 recalls between them)',
      a.track && framingOf(a.track).length === 4 && a.track.framingCount === 4 && a.track.recallCount === 90 && a.track.pairs.length === 94 &&
      a.track.pairs[0]._framing && a.track.pairs[1]._framing && a.track.pairs[92]._framing && a.track.pairs[93]._framing && !a.track.pairs[2]._framing && !a.track.pairs[91]._framing, a.track && a.track.pairs.map(p => (p._framing ? '*' : '') + p.speaker).join('').slice(0, 20))
    T('F2', 'A = the man opens and closes, B = the woman answers; romaji + reading ride along; provenance is stamped like the standard generator',
      a.track.pairs[0].speaker === 'A' && a.track.pairs[1].speaker === 'B' && a.track.pairs[92].speaker === 'A' && a.track.pairs[93].speaker === 'B' && a.track.pairs[0].romaji === 'konnichiwa' &&
      a.track.pairs[0]._framing === true && a.track.pairs[0]._source === 'ja:scene' && !!(a.track.pairs[0]._provenance || a.track.pairs[0].provenance || a.track.pairs[0].language))
    const b = await runJa(null)
    T('F3', 'no scene (or a Ready-screen scene without lines): the fixed Conversation Basics こんにちは / またね bookend the track', framingOf(b.track).map(p => p.japanese).join('|') === 'こんにちは|こんにちは|またね|またね' && b.track.framingCount === 4)
    const c2 = await runJa({ ...jaScene, closing: '宇宙旅行へ行きましょう', closing_reply: '宇宙旅行へ' })
    T('F4', 'a closing with untaught words is not shown: the track still parts with the basic またね (no model call without a key)',
      framingOf(c2.track).map(p => p.japanese).join('|') === 'こんにちは|こんにちは|またね|またね', framingOf(c2.track).map(p => p.japanese))
    // Mandarin
    c.ev('gen2Daily = ' + fakeG2.toString().replace(/^/, '(') .replace(/$/, ')("zh")'))
    const zScene = { scene: 'Two friends in a cafe.', characterA: 'Wei, a man', characterB: 'Mei, a woman' }
    const z = await c.zhGen2MainTrack({ targets: tZ, vocab: Zv, apiKey: null, model: 'm', scene: zScene, onLog: () => {} })
    const zf = z.track.pairs.filter(p => p._framing)
    T('F5', 'Mandarin test generator: 你好 / 你好 at the start, 再见 / 再见 at the end; framingCount 4; 90 recalls between them',
      zf.length === 4 && zf.map(p => p.chinese).join('|') === '你好|你好|再见|再见' && z.track.framingCount === 4 && z.track.recallCount === 90 && z.track.pairs.length === 94 &&
      z.track.pairs[0]._framing && z.track.pairs[93]._framing && !z.track.pairs.slice(2, 92).some(p => p._framing), zf.map(p => p.chinese))
    T('F6', 'Mandarin framing is casual-polite 你 — never 您 — and A (man) / B (woman) alternate', !zf.some(p => /您/.test(p.chinese)) && zf[0].speaker === 'A' && zf[1].speaker === 'B' && zf[2].speaker === 'A' && zf[3].speaker === 'B')
    T('F7', 'the lesson sections (scenePlan) still cover exactly the 30 targets — framing lines are outside them', JSON.stringify(a.track.scenePlan.scenes.flatMap(s => s.targetIds).sort()) === JSON.stringify(tJ.map(w => w.id).sort()) &&
      JSON.stringify(z.track.scenePlan.scenes.flatMap(s => s.targetIds).sort()) === JSON.stringify(tZ.map(w => w.id).sort()))

    // — rated framing words —
    const Jb = Jv.map(w => ({ ...w })), hello = { ...Jb[0], id: 9991, japanese: 'こんにちは', reading: 'こんにちは', romaji: 'konnichiwa', english: 'hello', status: 'learning', introducedAt: '2026-08-01', lastSeen: '2026-09-20', dueDate: '2026-09-25', belt: 'White' }
    Jb.push(hello)
    const a2 = await c.jaGen2MainTrack({ targets: tJ, selection: { targets: tJ, counts: {} }, vocab: Jb, register: 'natural', apiKey: null, model: 'm', trackMode: 'daily', runId: 'r1', scene: jaScene, onLog: () => {} })
    T('F8', 'a due, already-taught bank word that IS the opening is rated with the rest: it is on track.framingWords (framing: open), the 30 keywords are untouched',
      a2.track.framingWords && a2.track.framingWords.length === 1 && a2.track.framingWords[0].wordId === 9991 && a2.track.framingWords[0].framing === 'open' && a2.track.framingWords[0].rating === null && a2.track.keywords.length === 30 &&
      /\(track\.keywords \|\| \[\]\)\.concat\(track\.framingWords \|\| \[\]\)/.test(SRC), a2.track.framingWords)
    const Jn = Jb.map(w => w.id === 9991 ? { ...w, dueDate: '2099-01-01' } : w), Jt = Jb.map(w => w.id === 9991 ? { ...w, status: 'new', introducedAt: null, lastSeen: null, dueDate: null } : w)
    const fw = (V, targets) => c.jazhFramingKeywords('ja', V, [{ _framing: true, _target: 'greeting', speaker: 'A', japanese: 'こんにちは' }], targets.map(w => w.id), today)
    T('F9', 'not due → not rated; never taught → not rated; one of the day\'s own 30 → not rated twice; no match → nothing', fw(Jn, tJ).length === 0 && fw(Jt, tJ).length === 0 && fw(Jb, [...tJ, hello]).length === 0 &&
      c.jazhFramingKeywords('ja', Jb, [{ _framing: true, _target: 'greeting', speaker: 'A', japanese: 'やあ' }], [], today).length === 0)
    const withFw = c.jazhAttachFramingWords({ pairs: [{ _framing: true, _target: 'greeting', speaker: 'A', japanese: 'こんにちは' }], selectedTargetIds: [] }, Jb, 'ja', today)
    T('F10', 'attaching is idempotent and leaves a track with nothing to rate exactly as it was', withFw.framingWords.length === 1 && c.jazhAttachFramingWords(withFw, Jb, 'ja', today) === withFw &&
      (t => c.jazhAttachFramingWords(t, Jb, 'ja', today) === t)({ pairs: [], selectedTargetIds: [] }))
    const Zb = Zv.map(w => ({ ...w })); Zb.push({ ...Zb[0], id: 9992, chinese: '再见', pinyin: 'zàijiàn', english: 'goodbye', status: 'learning', introducedAt: '2026-08-01', lastSeen: '2026-09-20', dueDate: '2026-09-25' })
    const z2 = await c.zhGen2MainTrack({ targets: tZ, vocab: Zb, apiKey: null, model: 'm', scene: zScene, onLog: () => {} })
    T('F11', 'Mandarin: a due 再见 in the bank is rated as the closing word (framing: close)', z2.track.framingWords && z2.track.framingWords.length === 1 && z2.track.framingWords[0].wordId === 9992 && z2.track.framingWords[0].framing === 'close', z2.track.framingWords)
    T('F12', 'both apps attach the framing words to every new Daily track (standard generator too) and never to a Revision track',
      /stampTrackMode\(trackMode === 'revision' \? rawTrack : jazhAttachFramingWords\(rawTrack, vocab, 'ja'\)/.test(SRC) && /stampTrackMode\(\(trackMode === 'revision' \|\| trackMode === 'srs'\) \? rawTrack : jazhAttachFramingWords\(rawTrack, vocab, 'zh'\)/.test(SRC))
  }

  // ══ S — the Mandarin scene reaches generation ═════════════════════════════════════════════════
  {
    const Zv = mk('zh', Z, 60), t = Zv[3], inv = c.mandarinLearnerInventory(Zv, [t]), rules = c.mandarinScarcityRules(inv)
    const scene = { scene: 'Two friends queue at a busy tea shop.', characterA: 'Wei, a man', characterB: 'Mei, a woman' }
    const withS = c.buildMandarinPrompt(t, inv, Zv, 1, rules, undefined, scene), without = c.buildMandarinPrompt(t, inv, Zv, 1, rules, undefined, null), legacy = c.buildMandarinPrompt(t, inv, Zv, 1, rules)
    T('S1', 'the Ready-screen setting is in every recall prompt ("SETTING of this conversation … tea shop"), with the closed-vocabulary rule restated; without a scene the prompt is byte-for-byte the old one',
      /SETTING of this conversation/.test(withS.user) && /busy tea shop/.test(withS.user) && /never write a name/.test(withS.user) && !/SETTING of this conversation/.test(without.user) && without.user === legacy.user)
    const zhGen = SRC.slice(SRC.indexOf('function MandarinGenerator('), SRC.indexOf('function MandarinGenerator(') + 40000)
    T('S2', 'startGeneration hands the scene to the standard generator (genOpts.scene → each recall) and to the test generator; the saved track carries it',
      /\{ scene: zhScene \|\| null, \.\.\.\(isDailyZh/.test(zhGen) && /zhGen2MainTrack\(\{ targets, vocab, apiKey, model, scene: zhScene,/.test(zhGen) && /pairs:res\.pairs, scene: zhScene \|\| null,/.test(zhGen) &&
      /scene: _go\.scene \|\| null \}\)\n      if \(!got\)/.test(SRC) && /buildMandarinPrompt\(target, inv, vocab, recallIndex, rules, o\.exchange, o\.scene\)/.test(SRC))
    const z = await (async () => { c.ev('gen2Daily = async o => ({ track: { integrity: { status: "READY", reasons: [] }, selectedTargetIds: o.fixedTargets.map(w => w.id), pairs: o.fixedTargets.flatMap(w => [1, 2, 3].map(r => ({ speaker: r % 2 ? "A" : "B", chinese: w.chinese, pinyin: w.pinyin, english: "x", prompt: "y", targetId: w.id, recallIndex: r, _gen2: {} }))), deferredTargets: [] }, gen2: { models: {}, calls: 1, byStage: {}, replacementsUsed: 0 } })')
      return c.zhGen2MainTrack({ targets: Zv.slice(0, 30).map(w => ({ ...w, selectionRole: 'review' })), vocab: Zv, apiKey: null, model: 'm', scene, onLog: () => {} }) })()
    T('S3', 'the test generator\'s saved Mandarin track carries the scene the learner approved', z.track && z.track.scene && z.track.scene.scene === scene.scene)
  }

  console.log('\nThai-workflow parity wave 1 (ja/zh): ' + (n - fails) + '/' + n + (fails ? ' — FAILURES' : ' — ALL PASS'))
  process.exit(fails ? 1 : 0)
})().catch(e => { console.log('CRASH ' + (e && e.stack || e)); process.exit(1) })
