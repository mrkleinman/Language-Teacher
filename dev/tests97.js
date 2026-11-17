// 17 Nov — Cantonese for a real beginner (stage B-1): the learner-vocabulary rule, the teachability gate and the greeting / parting lines.
//   R  the ALLOWED-SET rule: a module serves a target only if EVERY fixed word of it is taught / a word of the day / free; the {M} classifier too; a doubled spelling counts
//   G  the TEACHABILITY gate: a new word no lesson can teach yet is swapped for the next teachable new word (the NEW count cannot change); a review word for the next learned word
//   B  "cannot build": the writer, the generator screen and the dashboard say WHICH word and WHY in words, and never write a line with an untaught word
//   W  the whole writer with the rule ON: every word of every lesson line is taught / a track word / free (checked here with the test's own list, not the app's)
//   F  the FRAMING lines: a greeting opens and a parting closes every track by the device clock, as framing pairs (never target pairs), checked by the structure check, in the transcript
//   S  the switch yueStrictVocabSetEnabled: default ON, and every test that turns it off says why
// Real application code; the module set is a small FIXTURE written below (the real set has no module that a day-one learner can use until the starter modules are merged).
const { load } = require('./harness')
const fs = require('fs'), zlib = require('zlib'), cp = require('child_process')
const React = require('react'), TR = require('react-test-renderer'), RDS = require('react-dom/server')
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const FILE = process.env.TT_FILE || 'tt.compiled.js'
const SRC = fs.readFileSync('tt.jsx', 'utf8')
let n = 0, fails = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; console.log((pass ? 'PASS ' : 'FAIL ') + id + '  ' + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 700) : '')) }
const textOf = x => x == null ? '' : typeof x === 'string' ? x : Array.isArray(x) ? x.map(textOf).join(' ') : textOf(x.children)
const flush = async (k = 120) => { for (let i = 0; i < k; i++) await new Promise(r => setImmediate(r)) }
const txt = r => textOf(r.toJSON()).replace(/\s+/g, ' ')

// ── the FIXTURE module set ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// words (ids of the real bank): 朋友 61 · 食 56 · 水 91 · 飯 106 · 屋企 58 · 人 23 · 奶茶 45. Each word has its own cell, so a module serves exactly the words written here.
//   FA-1  我有{W}。 你有{W}呀？ …              needs 我 有 (呀 is free)                     cell F_A  朋友
//   FA-2  我同{W}。 …                           needs 我 同                                   cell F_A  朋友
//   FA-4  哇，我食{W}。 …                       needs 我 食 (哇 is free)                      cell F_A  朋友
//   FB-1  我好{W}。 …                           needs 我 好 (the word 好 has two rows)         cell F_B  屋企
//   FC-1  我有{W}。 有{W}呀？ …                 needs 我 有                                   cell F_C  水 飯
//   FM-1  我有{M}{W}。 …                        needs 我 有 and the classifier of the word    cell F_M  人 (個) 奶茶 (杯)
//   FV-1  我{W}。 我{W}呀？ …                   needs 我                                      cell F_V  食
//   FX-1  我有蚊{W}。 …                         needs 我 有 and the day's 蚊                    cell F_X  錢   (its lines are the same sentences as FY-1's: see D1)
//   FY-1  我有{W}錢。 …                         needs 我 有 and the day's 錢                    cell F_Y  蚊
//   FH-1  哈囉，我有{W}。 …                     needs 我 有 (哈囉 is a free loanword)           cell F_H  媽媽
//   FG-1  我同{W}。 …                           needs 我 同 (so a day-one learner has a word whose lesson is missing words)   cell F_G  你好
const Y = { 蚊: 'mān', 錢: 'chín', 哈囉: 'hā lōu', 我: 'ngóh', 有: 'yáuh', 同: 'tùhng', 個: 'go', 食: 'sihk', 呀: 'a', 哇: 'wā', 好: 'hóu', 啦: 'lā', 狗: 'gáu' }
function mkFixture() {
  const chunks = [], idx = new Map()
  const ck = (...ws) => { const s = ws.map(w => /^[，。？！]$/.test(w) ? w : w + '\u001D' + Y[w]).join('\u001E'); if (!idx.has(s)) { idx.set(s, chunks.length); chunks.push(s) } return idx.get(s) }
  const mod = (id, cell, a, b, c) => [id, cell, 1, '', ...a, ...b, ...c, 'test-scene', 'test-job-' + id]
  const L = (items, en, prompt) => [items, en, prompt]
  const m = [
    mod('FA-1', 'F_A', L([ck('我', '有'), '{W}', ck('。')], 'I have {Es}.', 'Say you have {Es}.'), L([ck('有'), '{W}', ck('呀', '？')], 'Is there {Es}?', 'Ask if there is {Es}.'),
      L([ck('有', '，', '我', '有'), '{W}', ck('。')], 'Yes, I have {Es}.', 'Say yes, you have {Es}.')),
    mod('FA-2', 'F_A', L([ck('我', '同'), '{W}', ck('。')], 'I am with {Es}.', 'Say who you are with.'), L([ck('我', '同'), '{W}', ck('呀', '？')], 'Am I with {Es}?', 'Ask who you are with.'),
      L([ck('我', '同'), '{W}', ck('啦', '。')], 'I am with {Es} now.', 'Say you are with them now.')),
    mod('FA-4', 'F_A', L([ck('哇', '，', '我', '食'), '{W}', ck('。')], 'Wow, I eat {Es}.', 'Say wow, you eat {Es}.'), L([ck('我', '食'), '{W}', ck('呀', '？')], 'Do I eat {Es}?', 'Ask if you eat {Es}.'),
      L([ck('我', '食'), '{W}', ck('啦', '。')], 'I eat {Es} now.', 'Say you eat {Es} now.')),
    mod('FB-1', 'F_B', L([ck('我', '好'), '{W}', ck('。')], 'I am very {Es}.', 'Say you are very {Es}.'), L([ck('我', '好'), '{W}', ck('呀', '？')], 'Am I very {Es}?', 'Ask if you are very {Es}.'),
      L([ck('我', '好'), '{W}', ck('啦', '。')], 'I am very {Es} now.', 'Say you are very {Es} now.')),
    mod('FC-1', 'F_C', L([ck('我', '有'), '{W}', ck('。')], 'I have {Es}.', 'Say you have {Es}.'), L([ck('有'), '{W}', ck('呀', '？')], 'Is there {Es}?', 'Ask if there is {Es}.'),
      L([ck('有', '，', '我', '有'), '{W}', ck('啦', '。')], 'Yes, I have {Es} now.', 'Say yes, you have {Es}.')),
    mod('FM-1', 'F_M', L([ck('我', '有'), '{M}', '{W}', ck('。')], 'I have {Es}.', 'Say you have {Es}.'), L([ck('有'), '{M}', '{W}', ck('呀', '？')], 'Is there {Es}?', 'Ask if there is {Es}.'),
      L([ck('我', '有'), '{M}', '{W}', ck('啦', '。')], 'I have {Es} now.', 'Say you have {Es} now.')),
    mod('FX-1', 'F_X', L([ck('我', '有', '蚊'), '{W}', ck('。')], 'I have dollars of {Es}.', 'Say what you have.'), L([ck('我', '有', '蚊'), '{W}', ck('呀', '？')], 'Do I have dollars of {Es}?', 'Ask what you have.'), L([ck('我', '有', '蚊'), '{W}', ck('啦', '。')], 'I have dollars of {Es} now.', 'Say what you have now.')),
    mod('FY-1', 'F_Y', L([ck('我', '有'), '{W}', ck('錢', '。')], 'I have {Es} of money.', 'Say what you have.'), L([ck('我', '有'), '{W}', ck('錢', '呀', '？')], 'Do I have {Es} of money?', 'Ask what you have.'), L([ck('我', '有'), '{W}', ck('錢', '啦', '。')], 'I have {Es} of money now.', 'Say what you have now.')),
    mod('FH-1', 'F_H', L([ck('哈囉', '，', '我', '有'), '{W}', ck('。')], 'Hello, I have {Es}.', 'Say hello and what you have.'), L([ck('哈囉', '，', '我', '有'), '{W}', ck('呀', '？')], 'Hello, do I have {Es}?', 'Say hello and ask.'), L([ck('哈囉', '，', '我', '有'), '{W}', ck('啦', '。')], 'Hello, I have {Es} now.', 'Say hello and what you have now.')),
    mod('FG-1', 'F_G', L([ck('我', '同'), '{W}', ck('。')], 'I say {E}.', 'Say {E}.'), L([ck('我', '同'), '{W}', ck('呀', '？')], 'Do I say {E}?', 'Ask if you say {E}.'), L([ck('我', '同'), '{W}', ck('啦', '。')], 'I say {E} now.', 'Say {E} now.')),
    mod('FV-1', 'F_V', L([ck('我'), '{W}', ck('。')], 'I {E}.', 'Say that you {E}.'), L([ck('我'), '{W}', ck('呀', '？')], 'Do I {E}?', 'Ask if you {E}.'), L([ck('我'), '{W}', ck('啦', '。')], 'I {E} now.', 'Say you {E} now.')),
  ]
  const t = {
    61: ['朋友', 1, 'F_A', 'friend', 'friends', '個', 'go'], 58: ['屋企', 1, 'F_B', 'home', 'homes', '', ''], 91: ['水', 1, 'F_C', 'water', 'waters', '', ''], 106: ['飯', 1, 'F_C', 'rice', 'rices', '', ''],
    54: ['錢', 1, 'F_X', 'money', 'moneys', '', ''], 88: ['蚊', 1, 'F_Y', 'dollar', 'dollars', '', ''], 62: ['媽媽', 1, 'F_H', 'mum', 'mums', '', ''],
    3048: ['你好', 1, 'F_G', 'hello', '', '', ''], 23: ['人', 1, 'F_M', 'person', 'people', '個', 'go'], 45: ['奶茶', 1, 'F_M', 'milk tea', 'milk teas', '杯', 'būi'], 56: ['食', 1, 'F_V', 'eat', '', '', ''],
  }
  return { v: 'fixture', t, c: chunks, m }
}
// the classifier 杯 needs its Yale known to the chunk table only through the tag; the test words' classifiers live in the tags (個 go, 杯 būi)

;(async () => {
  const fresh = (o) => { const c = load(FILE, Object.assign({ React, realBelt: true }, o || {})); c.console.info = () => {}; c.console.warn = () => {}; c.yueModulesSetEnabled(true); c.ev('yueModulesUseData')(mkFixture()); return c }
  const c = fresh()
  const V0 = c.initCantoneseVocab()
  const byCh = (ch, pos) => V0.find(w => w.chinese === ch && (!pos || w.partOfSpeech === pos))
  const taughtFields = { status: 'learning', lastSeen: '2026-11-01', introducedAt: '2026-10-01', repCount: 3, okStreak: 1, dueDate: '2026-11-12', interval: 3 }
  // a learner who has been taught exactly the words given (ids or characters; a character marks EVERY row of that spelling unless an id is given)
  const learner = (taught, o) => { const ids = new Set((taught || []).filter(x => typeof x === 'number')), chs = new Set((taught || []).filter(x => typeof x === 'string'))
    return V0.map(w => (ids.has(w.id) || chs.has(w.chinese)) ? { ...w, ...taughtFields, ...(o && o.fields || {}) } : { ...w }) }
  const tagOf = w => c.ev('yueModuleTagOf')(w)
  const free = new Set(c.ev('YUE_FREE_WORDS').map(r => r[0]))
  const cand = (word, allowedList, extra) => { const t = V0.find(w => w.id === word), info = {}
    const r = c.ev('yueModuleCandidates')(t, 1, Object.assign({ allowed: new Set(allowedList), info }, extra || {})); return { ids: r.map(x => x.m.id), info } }
  const ID = { 朋友: 61, 食: 56, 水: 91, 飯: 106, 屋企: 58, 人: 23, 奶茶: 45 }
  const FREE = [...free]

  // ═════ R — the allowed-set rule ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  {
    const a0 = cand(ID.朋友, [...FREE, '朋友', '我'])
    T('R1', 'a module with ONE untaught word is refused: knowing 我 only, 朋友 has no module (FA-1 needs 有, FA-2 needs 同, FA-4 needs 食) and the nearest-need list names what is missing',
      a0.ids.length === 0 && a0.info.inCell === 3 && a0.info.fit === 0 && a0.info.nearest === 1 && a0.info.words.length === 1 && ['有', '同', '食'].includes(a0.info.words[0]), a0)
    const a1 = cand(ID.朋友, [...FREE, '朋友', '我', '有'])
    T('R2', 'a TAUGHT word is accepted: with 我 and 有 taught only FA-1 serves 朋友', a1.ids.join() === 'FA-1' && a1.info.fit === 1 && a1.info.inCell === 3, a1)
    const a2 = cand(ID.朋友, [...FREE, '朋友', '我', '食']), a2b = cand(ID.朋友, [...FREE, '朋友', '我'])
    T('R3', 'a word of the SAME DAY (a target of the track) and a FREE word (哇) are accepted: FA-4 fits when 食 is a target and 我 is taught; without 食 it is refused', a2.ids.join() === 'FA-4' && free.has('哇') && a2b.ids.length === 0, { a2, a2b })
    const a3 = cand(ID.朋友, [...FREE, '朋友', '我', '食'].filter(x => x !== '哇')), FA4 = c.ev('YUE_MODULES').data.byCell.get('F_A').find(m => m.id === 'FA-4')
    T('R4', 'a word is free only if it is IN the free list: the same day (我 taught, 食 a target) with 哇 taken out of the free list refuses FA-4, and the missing word it names is 哇', a3.ids.length === 0 && c.ev('yueModuleMissing')(FA4, tagOf(V0.find(w => w.id === ID.朋友)), s => s !== '哇').join() === '哇' && free.has('哇'), a3)
    // a doubled spelling: 好 is two rows (adverb id 22, adjective id 12); either row taught makes the spelling known
    const hSet = ch => c.ev('yueTaughtSurfaces')(learner(ch)).has('好')
    T('R5', 'a DOUBLED spelling counts as known when ANY row of it is taught: 好 (adverb 22 and adjective 12) is in the taught set when only the adjective row is taught, and when only the adverb row is; it is not when neither is',
      hSet([12]) && hSet([22]) && !hSet([]) && hSet(['好']) && byCh('好', 'adverb').id === 22 && byCh('好', 'adjective').id === 12)
    const b0 = cand(ID.屋企, [...c.ev('yueAllowedSet')(learner([2, 12]), [])]), b1 = cand(ID.屋企, [...c.ev('yueAllowedSet')(learner([2]), [])])
    T('R6', 'a module that needs the doubled 好 is usable by a learner who was taught the OTHER row (FB-1 for 屋企), and refused by one who was taught neither', b0.ids.join() === 'FB-1' && b1.ids.length === 0 && b1.info.words.join() === '好', { b0, b1 })
    // the {M} classifier: 人 takes 個, 奶茶 takes 杯; FM-1 needs the classifier word itself
    const m1 = cand(ID.人, [...FREE, '人', '我', '有']), m2 = cand(ID.人, [...FREE, '人', '我', '有', '個']), m3 = cand(ID.奶茶, [...FREE, '奶茶', '我', '有', '個']), m4 = cand(ID.奶茶, [...FREE, '奶茶', '我', '有', '杯'])
    T('R7', 'the {M} classifier is allowed only when the classifier WORD is allowed: 人 needs 個 (refused without it, accepted with it); 奶茶 needs 杯 (個 does not help)',
      m1.ids.length === 0 && m1.info.words.join() === '個' && m2.ids.join() === 'FM-1' && m3.ids.length === 0 && m3.info.words.join() === '杯' && m4.ids.join() === 'FM-1', { m1, m2, m3, m4 })
    const m5 = cand(ID.人, [...FREE, '人', '我', '個'])
    const dayM = c.ev('yueModuleCandidates')(V0.find(w => w.id === ID.人), 1, { allowed: c.ev('yueAllowedSet')(learner(['我', '有']), [{ chinese: '個' }]) })
    T('R8', 'the classifier can be a word of the DAY: 個 as a target of the track lets FM-1 serve 人 for a learner taught 我 有; and the classifier alone is not enough (without 有 the module is refused)', dayM.map(x => x.m.id).join() === 'FM-1' && m5.ids.length === 0 && m5.info.words.join() === '有', { dayM: dayM.map(x => x.m.id), m5 })
    // yueModuleMissing itself: the fixed words, the classifier slot
    const FA1 = c.ev('YUE_MODULES').data.byCell.get('F_A').find(m => m.id === 'FA-1'), tagF = tagOf(V0.find(w => w.id === ID.朋友))
    const miss = (m, tag, ok) => c.ev('yueModuleMissing')(m, tag, ok).join()
    const FMm = c.ev('YUE_MODULES').data.byCell.get('F_M').find(m => m.id === 'FM-1'), tagH = tagOf(V0.find(w => w.id === ID.人))
    T('R9', 'yueModuleFixed lists every word of the three lines (punctuation is not a word); yueModuleMissing names the words that are not allowed in line order; the target\'s own surface is allowed; a classifier slot needs the classifier word',
      [...c.ev('yueModuleFixed')(FA1)].join() === '我,有,呀' && miss(FA1, tagF, s => s === '我') === '有,呀' && miss(FA1, { ...tagF, word: '有' }, s => s === '我') === '呀' && miss(FA1, tagF, () => true) === '' &&
      miss(FMm, tagH, s => ['我', '有', '呀', '啦'].includes(s)) === '個' && miss(FMm, { ...tagH, measure: '' }, s => ['我', '有', '呀', '啦'].includes(s)) === '{M}' && miss(FMm, { ...tagH, measure: '人', word: '人' }, s => ['我', '有', '呀', '啦'].includes(s)) === '',
      { a: miss(FA1, tagF, s => s === '我'), b: miss(FA1, { ...tagF, word: '有' }, s => s === '我'), set: [...c.ev('yueModuleFixed')(FA1)] })
    // the exchange itself (the writer): a sound exchange whose every word is allowed, and a refusal that says why
    const logs = [], tg = V0.find(w => w.id === ID.朋友), vocab = learner(['我', '有'])
    c.yueModulesBeginRun(vocab)
    const ex = c.ev('yueModuleExchange')(tg, vocab, new Map(), m => logs.push(m), {})
    const allowedNow = c.ev('yueAllowedSet')(vocab, [tg])
    T('R10', 'yueModuleExchange (rule ON): the exchange is FA-1, its three lines hold only allowed words, the log says how many modules fit the learner\'s vocabulary, and a second request for another word of the cell re-uses the module when nothing else fits (and says so)',
      !!ex && ex.id === 'FA-1' && ex.lines.length === 3 && ex.lines.every(l => c.ev('yueLineVocabProblems')(l, allowedNow).length === 0) && logs.some(m => /1 of 3 modules fit the vocabulary the learner has/.test(m)), logs)
    const logs2 = [], nq = V0.find(w => w.id === ID.奶茶)
    const ex2 = c.ev('yueModuleExchange')(V0.find(w => w.id === ID.朋友), vocab, new Map(), m => logs2.push(m), {})
    T('R11', 'the same module is used again for another target only because no unused module fits, and the log says so ("all already used in this track: one is used again")', !!ex2 && ex2.id === 'FA-1' && logs2.some(m => /all already used in this track: one is used again/.test(m)), logs2)
    c.yueModulesBeginRun(vocab)
    const logs3 = [], none = c.ev('yueModuleExchange')(V0.find(w => w.id === ID.屋企), vocab, new Map(), m => logs3.push(m), {})
    const why = c.ev('YUE_MODULES').why.get(ID.屋企)
    T('R12', 'a word no module can serve for this learner: the exchange is null, the reason is "no lesson yet uses only words you know plus this one" with the nearest missing word, and it is logged', none === null && /^no lesson yet uses only words you know plus this one \(the nearest still needs 好\)$/.test(why || '') && logs3.some(m => /0 of 1 modules fit/.test(m)), { why, logs3 })
    const bad = { segments: [{ surface: '我', type: 'vocab' }, { surface: '狗', type: 'vocab' }, { surface: '。', type: 'punct' }] }
    T('R13', 'the second, independent look at a finished line (yueLineVocabProblems) names a word that is not allowed, ignores punctuation, and finds nothing wrong with a sound line', c.ev('yueLineVocabProblems')(bad, new Set(['我'])).join() === '狗' && c.ev('yueLineVocabProblems')(bad, new Set(['我', '狗'])).length === 0)
  }

  // ═════ S — the switch ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  {
    const cx = load(FILE, { React, realBelt: true }); cx.console.info = () => {}
    const on0 = cx.ev('YUE_STRICT.on')
    cx.yueModulesSetEnabled(true); cx.ev('yueModulesUseData')(mkFixture())
    const vocab = (() => { const V = cx.initCantoneseVocab(); return V.map(w => w.chinese === '我' ? { ...w, ...taughtFields } : w) })(), tg = V0.find(w => w.id === ID.朋友)
    const withRule = cx.ev('yueModuleExchange')(tg, vocab, new Map(), null, {})
    cx.yueStrictVocabSetEnabled(false)
    const without = cx.ev('yueModuleExchange')(tg, vocab, new Map(), null, {})
    cx.yueStrictVocabSetEnabled(true)
    T('S1', 'the switch: the rule is ON by default in the app; with it OFF the old word-list rule serves a word the learner has not been taught (that is why the real first-day tests switch it off); ON again refuses it', on0 === true && withRule === null && !!without && cx.ev('YUE_STRICT.on') === true && typeof cx.yueStrictVocabSetEnabled === 'function')
    // every switch in the tests carries the comment that says it is temporary
    const lines = fs.readdirSync('.').filter(f => /^tests\d+\.js$/.test(f)).flatMap(f => fs.readFileSync(f, 'utf8').split('\n').map((l, i) => ({ f, i: i + 1, l })).filter(x => /yueStrictVocabSetEnabled\(false\)/.test(x.l) && !/^\s*\/\//.test(x.l)))
    const uncommented = lines.filter(x => !/starter modules not merged yet: remove this switch when they are/.test(x.l) && x.f !== 'tests97.js')
    T('S2', 'every test that switches the rule OFF says "starter modules not merged yet: remove this switch when they are" on that line (now: ' + (lines.filter(x => x.f !== 'tests97.js').map(x => x.f + ':' + x.i).join(' ') || 'none') + ')', uncommented.length === 0, uncommented)    // after the starter modules are merged the switch lines are deleted and this list is empty: that is the goal
    // the app itself never switches the rule off
    const calls = SRC.split('\n').filter(l => /yueStrictVocabSetEnabled\(/.test(l) && !/^\s*\/\//.test(l) && !/^function yueStrictVocabSetEnabled/.test(l) && !/vocabulary rule OFF/.test(l))
    T('S3', 'the app code never switches the rule off by itself: tt.jsx holds the function, its default (ON), comments and a log sentence, and no call', calls.length === 0 && /const YUE_STRICT = \{ on: true \}/.test(SRC) && /^function yueStrictVocabSetEnabled\(on\) \{ YUE_STRICT.on = !!on \}/m.test(SRC), calls)
  }

  // ═════ G — the teachability gate ══════════════════════════════════════════════════════════════════════════════════════════════════════════════
  {
    const pool = vocab => c.ev('jazhWordsOnly')(vocab).slice().sort((a, b) => (a.unlockOrder || 0) - (b.unlockOrder || 0))
    const gate = (raw, vocab) => c.ev('yueGateTargets')(raw, vocab, pool(vocab))
    const vT2 = learner(['我', '有'])
    const raw1 = [V0.find(w => w.id === ID.屋企), V0.find(w => w.id === ID.朋友)].map(w => vT2.find(x => x.id === w.id))
    const g1 = gate(raw1, vT2)
    T('G1', 'NEW words, learner taught 我 有: 屋企 (its only lesson needs 好) is swapped for the next teachable NEW word (食), 朋友 stays; the NEW count is 2 before and after; the swap is reported with its reason',
      g1.targets.length === 2 && g1.targets.map(w => w.chinese).join() === '食,朋友' && g1.targets.every(w => w.status === 'new') && g1.deferred.length === 1 && g1.deferred[0].target.chinese === '屋企' && g1.deferred[0].replacedBy.chinese === '食' &&
      /no lesson yet uses only words you know plus this one \(the nearest still needs 好\)/.test(g1.deferred[0].why), { t: g1.targets.map(w => w.chinese), d: g1.deferred.map(d => [d.target.chinese, d.replacedBy && d.replacedBy.chinese, d.why]) })
    // the day's other targets teach each other: 朋友 alone is not teachable for a learner who knows only 我, 朋友 together with 食 is (FA-4: 哇，我食…)
    const vT1 = learner(['我'])
    const both = gate([vT1.find(w => w.id === ID.食), vT1.find(w => w.id === ID.朋友)], vT1), alone = gate([vT1.find(w => w.id === ID.朋友)], vT1)
    T('G2', 'the words of one day teach each other: for a learner who knows only 我, 朋友 + 食 are both kept (FA-4 uses the day\'s 食); 朋友 alone is swapped for the next teachable new word (食)',
      both.targets.map(w => w.chinese).join() === '食,朋友' && both.deferred.length === 0 && alone.targets.map(w => w.chinese).join() === '食' && alone.deferred[0].replacedBy.chinese === '食', { both: both.targets.map(w => w.chinese), alone: alone.targets.map(w => w.chinese) })
    // a REVIEW word with no lesson left is swapped for the next LEARNED word (never for a new one)
    const vR = learner(['我', '有', '屋企', '朋友', '食'])
    const rev = gate([vR.find(w => w.id === ID.屋企), vR.find(w => w.id === ID.朋友)], vR)
    T('G3', 'REVIEW words: 屋企 (taught, but its lesson needs 好) is swapped for the next teachable LEARNED word (食), 朋友 stays; no new word is ever used as a review word', rev.targets.map(w => w.chinese).join() === '食,朋友' && rev.targets.every(w => w.status === 'learning') && rev.deferred[0].replacedBy.chinese === '食', rev.targets.map(w => w.chinese))
    // nothing can be built: the word is left out and says why
    const v0 = learner([])
    const lone = gate([v0.find(w => w.id === ID.屋企)], v0)
    T('G4', 'day one with the real situation (nothing taught, no starter module): nothing is teachable, the word is LEFT OUT (no substitute exists) and the reason is in words', lone.targets.length === 0 && lone.deferred.length === 1 && lone.deferred[0].replacedBy === null && /no lesson yet uses only words you know plus this one/.test(lone.deferred[0].why), lone.deferred)
    // yueDailyTargets: the whole Daily list
    const dl = c.ev('yueDailyTargets')(raw1.map(w => ({ ...w, selectionRole: 'new' })), vT2)
    const isTe = (w, day) => c.ev('yueTargetTeachable')(w, vT2, day)
    T('G5', 'yueDailyTargets: every word of the Daily is teachable together with the others, the NEW count is the planned 2, and 屋企 is reported as swapped', dl.targets.length >= 2 && dl.targets.filter(w => w.status === 'new').length === 2 && dl.targets.every(w => isTe(w, c.ev('yueDay')(dl.targets))) && dl.deferred.some(d => d.target.chinese === '屋企'), { t: dl.targets.map(w => w.chinese + ':' + w.status), d: dl.deferred.length })
    // the Revision selector and the backfill follow the same rule
    const Vrev = learner(['我', '有', '屋企', '朋友', '食', '水'], {})
    const selR = c.ev('selectRevisionTargets')('yue', Vrev)
    T('G6', 'the Revision selector (selectRevisionTargets) never lists a learned word no lesson can teach: 屋企 is swapped out, the rest stay', !selR.targets.some(w => w.chinese === '屋企') && selR.targets.length >= 3 && selR.targets.every(w => w.status !== 'new'), selR.targets.map(w => w.chinese))
  }

  // ═════ B — cannot build: the words say so ═════════════════════════════════════════════════════════════════════════════════════════════════════
  {
    const vT2 = learner(['我', '有']), tgt = [{ ...vT2.find(w => w.id === ID.屋企), selectionRole: 'new' }]
    let err = null, res = null
    try { res = await c.generateCantoneseTrack(tgt, vT2, () => {}, () => {}, { cancelled: false }, { startedAt: '2026-11-17T08:00:00.000Z' }) } catch (e) { err = e }
    T('B1', 'generateCantoneseTrack with a word nothing can teach: it does NOT write a line, throws "incomplete", and names the word and the reason for each of its 3 recalls',
      !res && !!err && !!err.incomplete && err.incomplete.produced === 0 && err.incomplete.failures.length === 3 && err.incomplete.failures.every(f => f.target === '屋企' && /no lesson yet uses only words you know plus this one/.test(f.reason)), err && err.incomplete)
    const cg = fresh()
    let gr; await TR.act(async () => { gr = TR.create(React.createElement(cg.CantoneseGenerator, { vocab: vT2, targets: tgt, selection: null, cred: {}, trackMode: 'daily', tracks: [], onGenerated() {}, onBack() {} })); await flush(20) })
    const idle = txt(gr)
    await TR.act(async () => { gr.root.findAll(x => x.type === 'button').find(b => /Build the track/.test(textOf(b.children))).props.onClick(); await flush(60) })
    const after = txt(gr)
    T('B2', 'the generator screen says in words which word and why ("屋企: no lesson yet uses only words you know plus this one"), that no line with an untaught word was written, and offers no Study button',
      /屋企: no lesson yet uses only words you know plus this one \(the nearest still needs 好\)/.test(after) && /no line with a word you have not been taught was written in its place/.test(after) && !/Study track/.test(after) && /Cantonese track incomplete: 0\/3/.test(after), after.slice(0, 500))
    T('B3', 'before the build the generator tells the learner the rule in words: a lesson line only uses words taught, words of the track and free words', /only uses words you have been taught, the words of this track, and a few free words/.test(idle), idle.slice(0, 600))
    await TR.act(async () => { gr.unmount() })
    // the dashboard: day one, no starter modules (the fixture has none for a learner who knows nothing): the Daily cannot start and says why
    const cd = fresh()
    let r; await TR.act(async () => { r = TR.create(React.createElement(cd.CantoneseTeacher, { lang: 'yue', onSetLang() {} })); await flush(80) })
    const d1 = txt(r), dailyBtn = r.root.findAll(x => x.type === 'button').find(b => /Daily Track/.test(textOf(b.children)))
    T('B4', 'the dashboard for a day-one learner with no usable lesson: the Daily button says "No lesson fits yet" and is disabled, the card names the waiting words with the reason, and nothing false is promised (no "Learn + review")',
      /No lesson fits yet/.test(d1) && !!dailyBtn && dailyBtn.props.disabled === true && /Some words wait for a lesson you can read/.test(d1) && /no lesson yet uses only words you know plus this one/.test(d1) && !/Learn \+ review/.test(d1) && /only uses|waits until a lesson exists/.test(d1), d1.slice(0, 900))
    await TR.act(async () => { r.unmount() })
    // a learner who knows 我 and 有: the Daily is enabled, its words are the teachable ones, and the card says which words were swapped
    const ce = fresh(); ce.localStorage.setItem('tt-yue-vocab', JSON.stringify(learner(['我', '有'])))
    let r2; await TR.act(async () => { r2 = TR.create(React.createElement(ce.CantoneseTeacher, { lang: 'yue', onSetLang() {} })); await flush(80) })
    const d2 = txt(r2)
    T('B5', 'a learner who knows 我 and 有 sees an enabled Daily ("Learn + review"); the card names 你好 (its lesson needs 同) and what stands in for it, and the text above it says words were swapped or wait', /Learn \+ review/.test(d2) && !/No lesson fits yet/.test(d2) && /你好\s*: no lesson yet uses only words you know plus this one \(the nearest still needs 同\)/.test(d2) && /Some words (were swapped|wait)/.test(d2), d2.slice(-1500))
    await TR.act(async () => { r2.unmount() })
  }

  // ═════ D — a lesson that says a sentence another lesson of the track already has; the word-by-word view of free words ══════════════════════════════════════════
  {
    const vT2 = learner(['我', '有']), tg = [54, 88].map(id => ({ ...vT2.find(w => w.id === id), selectionRole: 'new' }))
    const logs = []
    const res = await c.generateCantoneseTrack(tg, vT2, () => {}, m => logs.push(m), { cancelled: false }, { startedAt: '2026-11-17T08:00:00.000Z' }).catch(e => ({ err: e }))
    const L = res.pairs ? res.pairs.filter(p => !p._framing) : []
    T('D1', 'two NEW words whose only lessons say the SAME sentences (錢 and 蚊: 我有蚊錢。 twice): both are built (a word is not left without a lesson for a repeated sentence), the log says the sentence is repeated, and no untaught word comes in',
      !res.err && L.length === 6 && L.filter(p => p.targetId === 54).length === 3 && L.filter(p => p.targetId === 88).length === 3 && new Set(L.map(p => p.chinese)).size === 3 && logs.some(m => /also in another lesson of this track: no other lesson fits/.test(m)) &&
      L.every(p => p.segments.filter(s => s.type !== 'punct').every(s => ['我', '有', '錢', '蚊', '呀', '啦'].includes(s.surface))), res.err ? res.err.message : L.map(p => p.chinese))
    const trD = c.cantoneseBuildTrack(res, tg, 'daily', '2026-11-17T08:00:00.000Z')
    T('D2', 'the structure check passes on such a track (it asks for 3 sound recalls per word, not for different sentences), and the writer\'s own check still reports a repeat when it is asked (yueLineProblems with the track\'s sentences)',
      c.cantoneseTrackCheck(trD).ok && c.ev('yueLineProblems')(L[0], tg[0], new Map([[L[0].chinese.replace(/[\s，。？！；、]/g, ''), 88]])).includes(c.ev('YUE_DUPLICATE')))
    // the word-by-word view of a free word: a loanword is shown with its meaning, a particle as a particle
    const v3 = learner(['我', '有']), t3 = { ...v3.find(w => w.id === 62), selectionRole: 'new' }
    const r3 = await c.generateCantoneseTrack([t3], v3, () => {}, () => {}, { cancelled: false }, { startedAt: '2026-11-17T08:00:00.000Z' })
    const l3 = r3.pairs.filter(p => !p._framing)[1], seg = ch => l3.segments.find(s => s.surface === ch)
    T('D3', 'a free loanword in a lesson line (哈囉) is shown word by word with its Yale and its meaning ("hello"), and the sentence-final particle 呀 is a particle with no meaning of its own; both are allowed words',
      !!seg('哈囉') && seg('哈囉').pinyin === 'hā lōu' && seg('哈囉').english === 'hello' && seg('哈囉').type === 'vocab' && !!seg('呀') && seg('呀').type === 'particle' && seg('呀').english === '' && l3.chinese.startsWith('哈囉'), l3.segments)
  }

  // ═════ W — the whole writer, rule ON ══════════════════════════════════════════════════════════════════════════════════════════════════════════
  {
    const taught = ['我', '有'], vT = learner(taught)
    const dl = c.ev('yueDailyTargets')([61, 58, 91].map(id => ({ ...vT.find(w => w.id === id), selectionRole: 'new' })), vT)
    const targets = dl.targets.filter(w => w.status === 'new')
    const res = await c.generateCantoneseTrack(targets, vT, () => {}, () => {}, { cancelled: false }, { startedAt: '2026-11-17T08:00:00.000Z', now: new Date(2026, 10, 17, 8, 0, 0).getTime() })
    const allowed = new Set([...taught, ...free, ...targets.map(w => w.chinese)])
    const lessons = res.pairs.filter(p => !p._framing)
    const unknown = []
    lessons.forEach(p => p.segments.filter(s => s.type !== 'punct').forEach(s => { if (!allowed.has(s.surface)) unknown.push(s.surface) }))
    T('W1', 'a learner taught 我 有 builds a Daily of ' + targets.length + ' NEW words (' + targets.map(w => w.chinese).join(' ') + '): ' + lessons.length + ' lesson lines, and EVERY word of every line is taught, a word of the track or a free word (checked with the test\'s own list)',
      targets.length === 3 && lessons.length === 9 && unknown.length === 0 && res.recallCount === 9 && lessons.every(p => !c.validateYale || c.validateYale(p.pinyin).ok), { unknown, targets: targets.map(w => w.chinese) })
    // the day's own targets are really used by a line for another target: 食 teaches 朋友 for a learner who knows only 我
    const vT1 = learner(['我']), tg2 = [61, 56].map(id => ({ ...vT1.find(w => w.id === id), selectionRole: 'new' }))
    const res2 = await c.generateCantoneseTrack(tg2, vT1, () => {}, () => {}, { cancelled: false }, { startedAt: '2026-11-17T08:00:00.000Z' })
    const l2 = res2.pairs.filter(p => !p._framing), forFriend = l2.filter(p => p.targetId === ID.朋友), allowed2 = new Set(['我', ...free, '朋友', '食'])
    T('W2', 'a learner who knows only 我: 朋友 + 食 build together; the lines of 朋友 use 食 (a word of the same day) and nothing else untaught; 食 has its own three lines', forFriend.length === 3 && forFriend.every(p => p.chinese.includes('食')) && l2.every(p => p.segments.filter(s => s.type !== 'punct').every(s => allowed2.has(s.surface))) && l2.filter(p => p.targetId === ID.食).length === 3, forFriend.map(p => p.chinese))
    const tr = c.cantoneseBuildTrack(res, targets, 'daily', '2026-11-17T08:00:00.000Z'), ck = c.cantoneseTrackCheck(tr)
    T('W3', 'the saved track records that the learner rule was applied (moduleTrack.vocabularyRule = learner) and the structure check passes', tr.moduleTrack.vocabularyRule === 'learner' && ck.ok, ck.problems)
    // the log of the build says the rule is on and how many words it allowed
    const logs = []; await c.generateCantoneseTrack(targets, vT, () => {}, m => logs.push(m), { cancelled: false }, { startedAt: '2026-11-17T08:00:00.000Z' })
    T('W4', 'the build log says the rule is ON with the numbers (taught words, free words, targets of this track)', logs.some(m => /vocabulary rule ON: 2 taught words \+ \d+ free words \+ 3 targets of this track/.test(m)), logs.slice(0, 4))
    // the free words
    // 18 Nov: the free words are 29 now, not 35: the eight made-up names became exactly two (Leon 利安 and Carrie 嘉莉), so the count pin went from 30 to 29
    T('W5', 'the free words are real data: loanwords, names, sounds and particles are in characters (OK is the one Latin spelling), each has Yale that is valid Yale, and none is a framing word', c.ev('YUE_FREE_WORDS').length >= 29 && c.ev('YUE_FREE_WORDS').every(r => r.length === 4 && c.validateYale(r[1]).ok && /^[A-Za-z]+$|^[一-鿿]+$/.test(r[0])) &&
      !['你好', '早晨', '再見', '拜拜', '聽日見', '早唞'].some(w => free.has(w)) && free.has('OK') && free.has('三文治') && free.has('呀'))
    // no embedded module uses a Latin word (OK is accepted by the line check but no module writes it)
    const REAL = JSON.parse(zlib.gunzipSync(Buffer.from(load(FILE).ev('YUE_MODULES_GZ'), 'base64')).toString('utf8'))
    T('W6', 'no embedded module writes Latin letters in a fixed chunk (so the one Latin free word OK is accepted by the line check but unused today)', REAL.c.every(s => !/[A-Za-z]/.test(s.replace(/\u001D[^\u001E]*/g, ''))), REAL.c.filter(s => /[A-Za-z]/.test(s.replace(/\u001D[^\u001E]*/g, ''))).slice(0, 3))
    // the build tool
    let chk = ''; try { chk = cp.execSync('python3 tools/build_yue_free.py --check', { encoding: 'utf8' }) } catch (e) { chk = 'FAILED ' + (e.stdout || '') + (e.stderr || '') }
    T('W7', 'tools/build_yue_free.py --check: tt.jsx holds exactly what free-words.csv and framing-lines.csv give (the data is generated, not typed)', !/FAILED|differs|not up to date/i.test(chk), chk.slice(0, 300))
  }

  // ═════ F — the framing lines ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  {
    const LINES = c.ev('YUE_FRAMING_LINES'), openIds = h => { const s = new Set(); for (let i = 0; i < 400; i++) s.add(c.ev('yueFramingPairs')(h, { rand: () => i / 400 }).openId); return s },
      closeIds = h => { const s = new Set(); for (let i = 0; i < 400; i++) s.add(c.ev('yueFramingPairs')(h, { rand: () => i / 400 }).closeId); return s }
    T('F1', 'by the clock: the morning line 早晨 opens a track only before noon (5-11), 早唞 closes one only in the evening and at night (18-4), 喂 (a call) is never chosen, a plain hello and goodbye are always possible',
      [5, 8, 11].every(h => openIds(h).has('open-zousan')) && [0, 4, 12, 15, 20, 23].every(h => !openIds(h).has('open-zousan')) && [18, 21, 23, 0, 3, 4].every(h => closeIds(h).has('close-zoutau')) && [5, 9, 12, 15, 17].every(h => !closeIds(h).has('close-zoutau')) &&
      [0, 5, 9, 12, 15, 18, 23].every(h => !openIds(h).has('open-wai') && openIds(h).has('open-nihou') && closeIds(h).has('close-zoigin')), { morning: [...openIds(8)], night: [...closeIds(22)] })
    const fp = c.ev('yueFramingPairs')(8, { rand: () => 0 }), all4 = fp.open.concat(fp.close)
    T('F2', 'the framing pairs: an opening (A says it, B says it back), a closing (A, B); each has Cantonese + "！", Yale that is valid Yale, English, a cue, a word-by-word breakdown, speaker; NONE has a targetId, a recall index or a check tier',
      fp.open.length === 2 && fp.close.length === 2 && fp.open.map(p => p.speaker).join() === 'A,B' && fp.close.map(p => p.speaker).join() === 'A,B' && fp.open[0].chinese === fp.open[1].chinese && fp.close[0].chinese === fp.close[1].chinese &&
      all4.every(p => p._framing === true && p.targetId == null && p.recallIndex == null && p.checkTier == null && p.wordId == null && c.validateYale(p.pinyin).ok && p.english && p.prompt && p.segments.some(s => s.type === 'vocab' && s.pinyin && s.english) && p.segments.map(s => s.surface).join('') === p.chinese && /！$/.test(p.chinese)) &&
      fp.open[0].prompt !== fp.open[1].prompt, all4.map(p => [p.chinese, p.pinyin, p.english, p.prompt]))
    const vT = learner(['我', '有']), tg = [61, 91].map(id => ({ ...vT.find(w => w.id === id), selectionRole: 'new' }))
    const startedAt = '2026-11-17T08:00:00.000Z'
    const build = async (hour, vocab, targets) => { const res = await c.generateCantoneseTrack(targets || tg, vocab || vT, () => {}, () => {}, { cancelled: false }, { startedAt, now: new Date(2026, 10, 17, hour, 5, 0).getTime() }); return { res, tr: c.cantoneseBuildTrack(res, targets || tg, 'daily', startedAt) } }
    const am = await build(8), pm = await build(21), noon = await build(14)
    const form = tr => tr.pairs.filter(p => p._framing).map(p => p.chinese).join(' ')
    T('F3', 'every track opens with a greeting and closes with a parting: pairs = 2 opening + lessons + 2 closing; track.framingCount 4, track.recallCount = the lesson lines only (6), framing recorded with the hour and the ids',
      [am, pm, noon].every(x => x.tr.pairs.length === 10 && x.tr.pairs[0]._kind === 'greeting' && x.tr.pairs[1]._kind === 'greeting' && x.tr.pairs[8]._kind === 'parting' && x.tr.pairs[9]._kind === 'parting' && x.tr.pairs.slice(2, 8).every(p => !p._framing) && x.tr.framingCount === 4 && x.tr.recallCount === 6 && x.res.framingCount === 4 && x.tr.framing && Number.isFinite(x.tr.framing.hour)) &&
      am.tr.framing.hour === 8 && pm.tr.framing.hour === 21 && noon.tr.framing.hour === 14, [am, pm, noon].map(x => form(x.tr)))
    T('F4', 'the clock decides: a track built at 21:05 never opens with 早晨; one built at 14:05 neither; one built at 08:05 never closes with 早唞; (the lines are real words of framing-lines.csv)', !/早晨/.test(form(pm.tr).split(' ').slice(0, 2).join(' ')) && !/早晨/.test(form(noon.tr).split(' ').slice(0, 2).join(' ')) && !/早唞/.test(form(am.tr)) &&
      [am, pm, noon].every(x => x.tr.pairs.filter(p => p._framing).every(p => LINES.some(l => l.text + '！' === p.chinese))), [am, pm, noon].map(x => form(x.tr)))
    // framing pairs are never target pairs
    const byT = new Map(); am.tr.pairs.forEach(p => { if (p.targetId != null) byT.set(p.targetId, (byT.get(p.targetId) || 0) + 1) })
    T('F5', 'framing pairs are NOT target pairs: each target has exactly its 3 recalls, the keywords and the NEW ids are the targets only, the plan counts targets only, and the structure check reports the framing lines apart',
      [...byT.values()].every(x => x === 3) && byT.size === 2 && am.tr.keywords.length === 2 && am.tr.selectedNewTargetIds.length === 2 && am.tr.targetPlan.planned === 2 && c.cantoneseTrackCheck(am.tr).ok && c.cantoneseTrackCheck(am.tr).pairs === 6 && c.cantoneseTrackCheck(am.tr).framing === 4 && c.cantoneseTrackCheck(am.tr).total === 10, c.cantoneseTrackCheck(am.tr))
    // the structure check on the framing lines
    const prob = tr => c.cantoneseTrackCheck(tr).problems.join(' | '), P = am.tr.pairs
    const dropOpen = { ...am.tr, pairs: P.filter((p, i) => i > 1) }, dropClose = { ...am.tr, pairs: P.filter((p, i) => i < 8) }
    const asTarget = { ...am.tr, pairs: P.map((p, i) => i === 0 ? { ...p, targetId: 61, recallIndex: 1 } : p) }
    const lateGreet = { ...am.tr, pairs: [P[2], P[3], P[4], P[0], P[1], P[5], P[6], P[7], P[8], P[9]] }
    const earlyPart = { ...am.tr, pairs: [P[0], P[1], P[8], P[9], P[2], P[3], P[4], P[5], P[6], P[7]] }
    const night = await (async () => { for (let k = 0; k < 40; k++) { const b = await build(22); if (b.tr.pairs.some(p => p._framingId === 'close-zoutau')) return b } return null })()
    const nightAt8 = night && { ...night.tr, framing: { ...night.tr.framing, hour: 8 } }
    const oneSpeaker = { ...am.tr, pairs: P.map((p, i) => i === 1 ? { ...p, speaker: 'A' } : p) }
    const fake = { ...am.tr, pairs: P.map((p, i) => i === 0 ? { ...p, _framingId: 'open-nothing' } : p) }
    const wrongText = { ...am.tr, pairs: P.map((p, i) => i === 1 ? { ...p, chinese: '再見！' } : p) }
    T('F6', 'the structure check catches each framing defect in words: no opening, no closing, a framing line counted as a target pair, a greeting after the lessons began, a parting before they end, a line that does not suit the hour, B not answering, an unknown line, a line that does not say its words',
      /no opening greeting/.test(prob(dropOpen)) && /no closing parting/.test(prob(dropClose)) && /counted as a target pair/.test(prob(asTarget)) && /greeting line stands after the lessons began/.test(prob(lateGreet)) && /parting line stands before the lessons end/.test(prob(earlyPart)) &&
      !!night && /does not suit the hour/.test(prob(nightAt8)) && /not one line by A and the answer by B/.test(prob(oneSpeaker)) && /not one of the known greeting/.test(prob(fake)) && /does not say/.test(prob(wrongText)), { night: night && form(night.tr), probs: [dropOpen, dropClose, asTarget, lateGreet, earlyPart, oneSpeaker, fake, wrongText].map(prob) })
    // an old track (made before the framing existed) is judged as it was made
    const old = { ...am.tr, pipelineVersion: 'yue-modules-v1', framing: null, pairs: am.tr.pairs.filter(p => !p._framing) }
    T('F7', 'a track saved BEFORE the framing existed (no framing, older pipeline) still passes the structure check as it was made', c.cantoneseTrackCheck(old).ok && c.cantoneseTrackCheck(old).framing === 0, c.cantoneseTrackCheck(old).problems)
    // a framing word is NOT free in a lesson line
    const allowedFor = c.ev('yueAllowedSet')(vT, tg)
    T('F8', 'framing words are free ONLY inside the framing pairs: 你好 早晨 再見 拜拜 聽日見 早唞 are not in the allowed set of a lesson line (哈囉, which is a free word, is)', ['你好', '早晨', '再見', '拜拜', '聽日見', '早唞'].every(w => !allowedFor.has(w)) && allowedFor.has('哈囉'))
    // the greeting / parting words that are due learned words are rated with the rest (jazhFramingKeywords)
    const vF = learner(['我', '有', '你好', '再見'], { fields: { dueDate: '2000-01-01' } })
    const withFw = c.ev('jazhAttachFramingWords')(am.tr, vF, 'yue', '2026-11-17'), fwList = (withFw.framingWords || []).map(k => k.chinese).sort()
    const openCh = am.tr.pairs[0].chinese.replace('！', ''), closeCh = am.tr.pairs[8].chinese.replace('！', '')
    const expect = ['你好', '再見'].filter(w => w === openCh || w === closeCh).sort()
    T('F9', 'a greeting / parting word of the track that the learner has been taught and is due now is attached as a framing word to be rated (taught + due only, and never a word the learner has not been taught)', fwList.join() === expect.join() && (c.ev('jazhAttachFramingWords')(am.tr, learner(['我']), 'yue', '2026-11-17').framingWords || []).length === 0, { fwList, expect, openCh, closeCh })
    // the transcript
    {
      let captured = ''
      const noop = () => {}, el = () => ({ style: {}, appendChild: noop, removeChild: noop, setAttribute: noop, addEventListener: noop, click: noop, innerHTML: '', content: '' })
      const cx = load(FILE, { React, globals: { Blob: class { constructor(parts) { this.text = parts.join('') } }, URL: { createObjectURL: b => { captured = b.text; return 'blob:x' }, revokeObjectURL: noop }, document: { querySelector: () => null, getElementById: () => el(), createElement: el, body: el(), head: el(), addEventListener: noop } } })
      cx.console.info = () => {}; cx.yueModulesSetEnabled(true); cx.ev('yueModulesUseData')(mkFixture())
      cx.downloadCantoneseTrack(am.tr)
      const closeLine = am.tr.pairs[8].chinese
      T('F10', 'the transcript lists the greeting and the parting with their Yale and English, marked "not a target pair", names the opening and closing ids and the hour, counts the lesson lines apart, and states the vocabulary rule',
        (captured.match(/not a target pair/g) || []).length === 4 && /opening greeting — not a target pair/.test(captured) && /closing parting — not a target pair/.test(captured) && captured.includes(am.tr.pairs[0].chinese) && captured.includes(am.tr.pairs[0].pinyin) && captured.includes(closeLine) &&
        /Pairs: 10 \(6 lesson lines \+ 4 greeting \/ parting lines\)/.test(captured) && /Framing: opening open-\w+ · closing close-\w+ · chosen for clock hour 8/.test(captured) && /STRUCTURE CHECK: passed · 6\/6 lines from modules · 4 greeting \/ parting lines \(not target pairs\)/.test(captured) && /Vocabulary rule: every fixed word of a lesson line is a word the learner had been taught/.test(captured) && !/PINYIN|MANDARIN/i.test(captured), captured.slice(0, 900))
    }
    // CONVERSATION BASICS, like Mandarin's
    const bs = h => RDS.renderToStaticMarkup(React.createElement(c.CantoneseBasicsPanel, { track: null, hour: h })).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
    const morning = bs(8), evening = bs(21), built = RDS.renderToStaticMarkup(React.createElement(c.CantoneseBasicsPanel, { track: am.tr, hour: 8 })).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
    T('F11', 'the CONVERSATION BASICS panel: before the build it lists the lines that suit the hour (早晨 only in the morning, 早唞 only in the evening, never 喂) and says they are free and not target recalls; after the build it lists the lines the track really has (A and B)',
      /Conversation basics/i.test(morning) && /早晨/.test(morning) && !/早唞/.test(morning) && /早唞/.test(evening) && !/早晨/.test(evening) && !/喂/.test(morning + evening) && /你好/.test(morning) && /再見/.test(morning) && /not one of the three recalls/.test(morning) &&
      /Opening A/.test(built) && /Opening B/.test(built) && /Closing A/.test(built) && /Closing B/.test(built) && built.includes(am.tr.pairs[0].chinese) && built.includes(am.tr.pairs[0].pinyin), { morning, built })
    // the generator screen carries the panel, and (a Revision too) a revision track has framing
    const cg = fresh(); let gr
    await TR.act(async () => { gr = TR.create(React.createElement(cg.CantoneseGenerator, { vocab: vT, targets: tg, selection: null, cred: {}, trackMode: 'daily', tracks: [], onGenerated() {}, onBack() {} })); await flush(20) })
    const g0 = txt(gr)
    await TR.act(async () => { gr.root.findAll(x => x.type === 'button').find(b => /Build the track/.test(textOf(b.children))).props.onClick(); await flush(80) })
    const g1 = txt(gr)
    T('F12', 'the generator screen shows CONVERSATION BASICS before and after the build, and the build says "greeting / parting lines" in its summary; the track it hands on has the framing pairs', /Conversation basics/i.test(g0) && /Conversation basics/i.test(g1) && /Opening A/.test(g1) && /Closing B/.test(g1) && /Structure check passed/.test(g1) && /2 greeting|greeting \/ parting/i.test(g1), g1.slice(0, 700))
    await TR.act(async () => { gr.unmount() })
    const vRev = learner(['我', '有', '朋友', '水'], {})
    const rv = c.ev('selectRevisionTargets')('yue', vRev).targets
    const rres = await c.generateCantoneseTrack(rv, vRev, () => {}, () => {}, { cancelled: false }, { startedAt, now: new Date(2026, 10, 17, 19, 0, 0).getTime() }).catch(e => ({ err: e }))
    T('F13', 'a Revision track has the same greeting and parting (they are not Daily-only) and is judged by the same structure check', !rres.err && rres.pairs.filter(p => p._framing).length === 4 && rres.pairs[0]._kind === 'greeting' && rres.pairs[rres.pairs.length - 1]._kind === 'parting' && c.cantoneseTrackCheck(c.cantoneseBuildTrack(rres, rv, 'revision', startedAt)).ok, rres.err && rres.err.message)
    // the Player's first cue is the greeting (the whole flow is in tests93 F5)
    T('F14', 'the review (quality reviewer) and the target counts see the lesson lines only: yueReviewLines drops the framing pairs', c.ev('yueReviewLines')(am.tr).length === 6 && c.ev('yueReviewLines')(am.tr).every(p => !p._framing))
  }

  console.log((fails ? 'FAIL ' : 'ALL PASS ') + (n - fails) + '/' + n)
  process.exit(fails ? 1 : 0)
})().catch(e => { console.log('CRASH', e && e.stack || e); process.exit(2) })
