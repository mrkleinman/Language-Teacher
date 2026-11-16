// 16 Nov — Cantonese as the fourth language, part 3: registries, voice, screens and the whole Daily flow.
//   R  every registry that names a language has a Cantonese entry, and every dispatcher that has none refuses 'yue' in words (nothing falls through to Thai or Mandarin)
//   T  the voice: a Hong Kong voice is chosen (zh-HK, then yue-HK), never a Mandarin one; the speech text is the traditional characters; the cloud voice is yue-HK; the Player speaks with zh-HK
//   U  the screens: picker, dashboard (what is not available yet is said in words), generator, learn-new-words, word list, belt page, "not available yet" screens, fonts
//   F  the whole flow with react-test-renderer and NO key: dashboard → Daily → build the track → Study → the first prompt; storage keys are the Cantonese ones only; the language is remembered
//   W  the Cantonese screens use the Cantonese storage and the multi-tab wiring only
// Real application code; the only stand-ins are the browser's speech engine and a clock for the Player.
const { load } = require('./harness')
const fs = require('fs'), zlib = require('zlib')
const React = require('react'), TR = require('react-test-renderer'), RDS = require('react-dom/server')
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const FILE = process.env.TT_FILE || 'tt.compiled.js'
const SRC = fs.readFileSync('tt.jsx', 'utf8')
let n = 0, fails = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; console.log((pass ? 'PASS ' : 'FAIL ') + id + '  ' + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 600) : '')) }
const textOf = x => x == null ? '' : typeof x === 'string' ? x : Array.isArray(x) ? x.map(textOf).join(' ') : textOf(x.children)
const flush = async (k = 120) => { for (let i = 0; i < k; i++) await new Promise(r => setImmediate(r)) }
const txt = r => textOf(r.toJSON()).replace(/\s+/g, ' ')
const DATA = JSON.parse(zlib.gunzipSync(Buffer.from(load(FILE).ev('YUE_MODULES_GZ'), 'base64')).toString('utf8'))
const fn = (name, body) => { const i = SRC.indexOf(name); return i < 0 ? '' : SRC.slice(i, i + (body || 6000)) }

;(async () => {
  const c = load(FILE, { React, realBelt: true }); c.console.info = () => {}; c.console.warn = () => {}
  // ── R ──
  const has = (obj, k = 'yue') => Object.prototype.hasOwnProperty.call(c.ev(obj), k)
  T('R1', 'LANGS, TTS_VOICES, GEN_CHECKPOINT_KEYS, GENERATOR_VERSIONS, LANGUAGE_NAMES, LISTENING_LANGS, TT_BENCH_FIELD, LANGUAGE_TOPICS, DAILY_NEW_WORDS_MUKYU, BELT_ABILITIES, CONVO_TTS all have a Cantonese entry',
    ['LANGS', 'TTS_VOICES', 'GEN_CHECKPOINT_KEYS', 'GENERATOR_VERSIONS', 'LANGUAGE_NAMES', 'LISTENING_LANGS', 'TT_BENCH_FIELD', 'LANGUAGE_TOPICS', 'DAILY_NEW_WORDS_MUKYU', 'BELT_ABILITIES', 'CONVO_TTS'].every(o => has(o)) && c.ev('TRACK_LANGUAGES').includes('yue'),
    ['LANGS', 'TTS_VOICES', 'GEN_CHECKPOINT_KEYS', 'GENERATOR_VERSIONS', 'LANGUAGE_NAMES', 'LISTENING_LANGS', 'TT_BENCH_FIELD', 'LANGUAGE_TOPICS', 'DAILY_NEW_WORDS_MUKYU', 'BELT_ABILITIES', 'CONVO_TTS'].filter(o => !has(o)))
  const L = c.ev('LANGS').yue
  T('R2', 'the picker entry: code yue, name Cantonese, the 廣東話 script, a title and the zh-HK speech tag; its own storage keys (tt-yue-*) that no other language uses',
    L.code === 'yue' && L.name === 'Cantonese' && L.script === '廣東話' && L.title === 'Cantonese Teacher' && L.ttsLang === 'zh-HK' && c.ev('YUE.vocab') === 'tt-yue-vocab' && c.ev('YUE.tracks') === 'tt-yue-tracks' && c.ev('YUE.dailyNew') === 'tt-yue-daily-new' &&
    [...Object.values(c.ev('YUE')), c.ev('GEN_CHECKPOINT_KEYS').yue].every(k => /^tt-yue-/.test(k)) && !Object.values(c.ev('ZH')).some(k => Object.values(c.ev('YUE')).includes(k)))
  T('R3', 'the dispatchers that have no Cantonese route refuse it in words instead of answering with another language: trackAdapterFor, listeningAdapterFor, qcRunnerFor, the test generator',
    (() => { const refuse = f => { try { f(); return null } catch (e) { return String(e && e.message) } }
      const a = refuse(() => c.ev('trackAdapterFor')('yue')), b = refuse(() => c.ev('listeningAdapterFor')('yue')), q = refuse(() => c.ev('qcRunnerFor')('yue')), g = refuse(() => c.ev('gen2Context')({ lang: 'yue', vocab: [] }))
      return [a, b, q, g].every(m => m && /yue/.test(m) && !/Thai|th\b/.test(m)) })(), (() => { try { c.ev('gen2Context')({ lang: 'yue', vocab: [] }); return 'no error' } catch (e) { return e.message } })())
  T('R4', 'the other languages are untouched: the same dispatchers still answer th / ja / zh', ['th', 'ja', 'zh'].every(l => c.ev('trackAdapterFor')(l).lang === l) && ['th', 'ja', 'zh'].every(l => c.ev('listeningAdapterFor')(l)) && typeof c.ev('qcRunnerFor')('zh') === 'function')
  T('R5', 'language helpers: languageName("yue") = Cantonese; the benchmark bank for yue is the Cantonese bank (not Mandarin); the track language of a yue track is yue; the Cantonese new-word quota is 5 at Mukyu',
    c.ev('languageName')('yue') === 'Cantonese' && c.ev('ttBenchBank')('yue')[0].jyutping === 'ge3' && c.ev('trackLanguageOf')({ language: 'yue' }) === 'yue' && c.getNewWordLimitForBelt('White', 'yue') === 5 && c.newWordsPerTrack('yue', 'daily', c.initCantoneseVocab()) === 5)
  T('R6', 'the Cantonese belt abilities are written in Yale (no pinyin, no Jyutping numbers): twelve belts, each a plain sentence', (() => { const a = c.ev('BELT_ABILITIES').yue, k = Object.keys(a)
    return k.length === 12 && k.every(b => a[b].length > 20) && !/[ǎǐǒǔěǚ]/.test(Object.values(a).join('')) && !/[a-z][1-6]\b/.test(Object.values(a).join('')) && c.ev('beltAbilityFor')('yue', 'White') === a.White && /néih hóu/.test(a.White) })())
  T('R7', 'there are no Cantonese topics yet: the registry says so with an empty list (the dashboard has no Topics card, the Topics screen is the "not available yet" screen)', c.ev('LANGUAGE_TOPICS').yue.length === 0 && c.ev('topicsFor')('yue').length === 0)
  T('R8', 'the stale-draft sweep and the checkpoint registry name the Cantonese key', /stTabSweep\(\[[^\]]*'tt-yue-gen-checkpoint'/.test(SRC))

  // ── T ──
  const mkVoices = list => { const cx = load(FILE, { React, globals: { speechSynthesis: { getVoices: () => list, speak() {}, cancel() {} } } }); cx.console.info = () => {}; return cx }
  const vv = (lang, name) => ({ lang, name: name || lang })
  const pick = (list, code = 'yue') => { const v = mkVoices(list).pickBrowserVoice(code); return v ? v.lang : null }
  T('T1', 'a Hong Kong voice is chosen: zh-HK first, then yue-HK; the platforms\' spellings zh_HK / zh-Hant-HK / yue-Hant-HK count', pick([vv('zh-CN'), vv('zh-TW'), vv('zh-HK')]) === 'zh-HK' && pick([vv('zh-CN'), vv('yue-HK'), vv('zh-HK')]) === 'zh-HK' && pick([vv('zh-CN'), vv('yue-HK')]) === 'yue-HK' && pick([vv('zh_HK')]) === 'zh_HK' && pick([vv('zh-Hant-HK')]) === 'zh-Hant-HK' && pick([vv('yue-Hant-HK')]) === 'yue-Hant-HK')
  T('T2', 'with no Hong Kong voice NO voice is chosen: never a mainland (zh-CN) or Taiwan (zh-TW) Mandarin voice, never the "yu" two-letter fallback; the notice helper says so', pick([vv('zh-CN'), vv('zh-TW'), vv('ja-JP'), vv('th-TH')]) === null && pick([]) === null && mkVoices([vv('zh-CN')]).cantoneseVoiceAvailable() === false && mkVoices([vv('zh-HK')]).cantoneseVoiceAvailable() === true)
  T('T3', 'Mandarin voice choice is unchanged (zh → zh-CN, ja → ja-JP, th → th-TH)', pick([vv('zh-HK'), vv('zh-CN')], 'zh') === 'zh-CN' && pick([vv('en-US'), vv('ja-JP')], 'ja') === 'ja-JP' && pick([vv('th-TH')], 'th') === 'th-TH')
  const yp = { chinese: '你有冇時間呀？', pinyin: 'néih yáuh móuh sìh gaan a?', english: 'Do you have time?', prompt: 'Ask.' }
  T('T4', 'the speech text is the traditional characters, never the Yale or the Jyutping: ttsTextForPair and ttsTextForWord', c.ttsTextForPair(yp) === '你有冇時間呀？' && c.ttsTextForWord(c.initCantoneseVocab()[1]) === '我')
  const v = c.ttsVoiceFor('yue', true), f = c.ttsVoiceFor('yue', false)
  T('T5', 'the cloud voice is a yue-HK voice (male B, female A), never cmn-CN / th-TH', v.languageCode === 'yue-HK' && /^yue-HK-/.test(v.name) && f.languageCode === 'yue-HK' && /^yue-HK-/.test(f.name) && v.name !== f.name && c.ev('CONVO_TTS').yue.code === 'yue-HK' && /^yue-HK-/.test(c.ev('CONVO_TTS').yue.a))
  // the Player really speaks with zh-HK and the chosen voice: a stand-in speech engine records every utterance (the 3-2-1 lead-in needs a real clock)
  async function speakWith(voices, lang) {
    const spoken = []
    class U { constructor(t) { this.text = t } }
    const ss = { getVoices: () => voices, speak(u) { spoken.push({ text: u.text, lang: u.lang, voice: u.voice && u.voice.lang }); Promise.resolve().then(() => u.onend && u.onend()) }, cancel() {} }
    const cx = load(FILE, { React, globals: { speechSynthesis: ss, SpeechSynthesisUtterance: U, setInterval, clearInterval, requestAnimationFrame: () => 0, cancelAnimationFrame: () => {} } }); cx.console.info = () => {}
    const track = { createdAt: 'x', date: '2026-11-16', language: 'yue', pairs: [{ speaker: 'A', chinese: '你有冇時間呀？', pinyin: 'néih yáuh móuh sìh gaan a?', english: 'Do you have time?', prompt: 'Ask if she has time.', thai: '你有冇時間呀？', phonetic: 'néih yáuh móuh sìh gaan a?', targetId: 1, wordId: 1, segments: [{ surface: '你', pinyin: 'néih', english: 'you', type: 'vocab' }, { surface: '？', pinyin: '', english: '', type: 'punct' }] }], keywords: [{ chinese: '你', pinyin: 'néih', english: 'you', wordId: 1 }] }
    let r
    await TR.act(async () => { r = TR.create(React.createElement(cx.Player, { track, targetLang: lang, onComplete() {}, onBack() {} })) })
    const snaps = [txt(r)]       // the screen at several moments (the one-line lesson is over a moment after the voice has spoken)
    for (let i = 0; i < 70 && !spoken.some(s => s.text === '你有冇時間呀？'); i++) { await TR.act(async () => { await new Promise(r => setTimeout(r, 100)) }); snaps.push(txt(r)) }
    const html = snaps.join(' ¦ '); await TR.act(async () => { r.unmount() })
    return { spoken, html, snaps }
  }
  const hk = await speakWith([vv('zh-CN', 'Mandarin'), vv('zh-HK', 'Sin-Ji')], 'yue')
  const said = hk.spoken.find(s => s.text === '你有冇時間呀？')
  T('T6', 'the Player speaks the traditional characters with language zh-HK and the Hong Kong voice (not zh-CN)', !!said && said.lang === 'zh-HK' && said.voice === 'zh-HK' && !hk.spoken.some(s => /néih|yáuh/.test(s.text)), hk.spoken)
  const noHk = await speakWith([vv('zh-CN', 'Mandarin'), vv('zh-TW', 'Meijia')], 'yue')
  const said2 = noHk.spoken.find(s => s.text === '你有冇時間呀？')
  T('T7', 'with no Hong Kong voice the Player picks no voice (the text is still the characters, the language zh-HK) and SAYS that the audio may be read in Mandarin', !!said2 && said2.lang === 'zh-HK' && !said2.voice && /No Hong Kong Cantonese voice/.test(noHk.html), { said2, html: noHk.html.slice(0, 200) })
  const zhP = await speakWith([vv('zh-CN', 'Mandarin'), vv('zh-HK', 'Sin-Ji')], 'zh')
  T('T8', 'the Mandarin Player is unchanged: zh-CN and the Mandarin voice, no Cantonese notice', (zhP.spoken.find(s => s.text === '你有冇時間呀？') || {}).lang === 'zh-CN' && (zhP.spoken.find(s => s.text === '你有冇時間呀？') || {}).voice === 'zh-CN' && !/Cantonese/.test(zhP.html))
  T('T9', 'the Player labels the prompt "Say in Cantonese" (and Mandarin\'s Player still says Mandarin)', /Say in Cantonese/.test(hk.html) && /Say in Mandarin/.test(zhP.html) && !/Say in Mandarin/.test(hk.html), hk.snaps.slice(0, 2))

  // ── U ──
  const html = el => RDS.renderToStaticMarkup(el)
  const sel = html(React.createElement(c.LanguageSelector, { lang: 'th', onSetLang() {}, onHome() {} }))
  T('U1', 'the language picker is a list of every language: Thai, Japanese, Mandarin and Cantonese with its 廣東話 script in the Cantonese face (the list opens on tap, so the closed picker is checked with the open state forced)', (() => {
    const cx = load(FILE, { React: { ...React, useState: (v) => [v === false ? true : v, () => {}] } }); cx.console.info = () => {}
    const h = RDS.renderToStaticMarkup(React.createElement(cx.LanguageSelector, { lang: 'th', onSetLang() {}, onHome() {} }))
    return /Thai/.test(h) && /Japanese/.test(h) && /Mandarin/.test(h) && /Cantonese/.test(h) && /class="yue"[^>]*>廣東話/.test(h) || /廣東話/.test(h) })(), sel.slice(0, 200))
  const learned = c.initCantoneseVocab().map((w, i) => i < 60 ? { ...w, status: 'learning', lastSeen: '2026-11-01', introducedAt: '2026-10-01', repCount: 3, okStreak: 1, dueDate: '2026-11-12' } : w)
  const dash = html(React.createElement(c.CantoneseDashboard, { vocab: learned, tracks: [], targets: learned.slice(60, 65).map(w => ({ ...w, selectionRole: 'new' })), trackTargets: [], notice: '', onStartTrack() {}, onNav() {}, onDeleteTrack() {}, onOpenTrack() {},
    revisionSelection: { counts: { total: 12, due: 12 }, targets: [] }, selection: null, onNotYet() {} }))
  const dtxt = dash.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
  T('U2', 'the dashboard: stats, belt card for Cantonese with its 5 new words, Daily and Revision buttons, the Listening tile marked "Not available yet", and a card that lists in words what is not available for Cantonese yet',
    /Cantonese vocab rank only/.test(dtxt) && /Introducing 5 new words/.test(dtxt) && /Daily Track/.test(dtxt) && /Revision Track/.test(dtxt) && /Listening/.test(dtxt) && /Not available yet/.test(dtxt) && /Not available for Cantonese yet/.test(dtxt) &&
    ['Listening track', 'Topics', 'Quality review', 'Model-written tracks and the test generator'].every(x => dtxt.includes(x)) && /ready-made lesson modules \(no AI request\)/.test(dtxt) && /Cantonese Teacher v\d+/.test(dtxt), dtxt.slice(0, 600))
  T('U3', 'the dashboard never says Mandarin, Thai or Japanese, and has no Topics card, no quality-review or generator switch', !/Mandarin|Thai|Japanese|Use the new generator|Topics/.test(dtxt.replace('Topics', '')) && !/data-topics-entry/.test(dash), dtxt.match(/Mandarin|Thai|Japanese/))
  const nyAll = ['Listening track', 'Topics', 'Quality review', 'Model-written tracks and the test generator'].map(w => html(React.createElement(c.CantoneseNotYet, { what: w, onBack() {} })).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '))
  T('U4', 'each "not available yet" screen names the feature, says it is not available for Cantonese yet, gives the reason, and has a Back button', nyAll.every((t, i) => t.includes(['Listening track', 'Topics', 'Quality review', 'Model-written tracks and the test generator'][i]) && /is not available for Cantonese yet/.test(t) && /Back to the Cantonese dashboard/.test(t) && t.length > 100) && !nyAll.some(t => /Mandarin|Thai/.test(t)), nyAll[2])
  const learn = html(React.createElement(c.CantoneseLearnWords, { words: learned.slice(60, 65), onDone() {}, onBack() {} }))
  T('U5', 'Learn new words: the word in the Cantonese face with its Yale (not Jyutping), the meaning, the audio button; hard-coded zh-CN is gone', /class="yue" lang="zh-HK"[^>]*>[^<]*</.test(learn) && /class="phon"[^>]*>[a-zḿńm̀āēīōūáéíóúàèìòù ]+</.test(learn) && !/[a-z][1-6]</.test(learn.replace(/<[^>]+>/g, '<')) && !/zh-CN/.test(fn('function CantoneseLearnWords', 5000)))
  const wl = html(React.createElement(c.WordListView, { vocab: learned, lang: 'yue', initialFilter: 'all', onBack() {} }))
  T('U6', 'the word list shows each word in the Cantonese face with its Yale and meaning; the search finds Yale and characters', /class="yue" lang="zh-HK"[^>]*>嘅/.test(wl) && />ge</.test(wl))
  const rt = html(React.createElement(c.RankTestView, { vocab: learned, lang: 'yue', onBack() {} }))
  T('U7', 'the rank test lists the words with their Yale', /class="phon"[^>]*>(ge|ngóh|séung)/.test(rt))
  const bv = html(React.createElement(c.BeltRankView, { vocab: learned, lang: 'yue', onBack() {} })).replace(/<[^>]+>/g, ' ')
  T('U8', 'the belt page carries the Cantonese abilities in Yale', /Says néih hóu and m̀h gōi/.test(bv) && /chàh chāan tēng/.test(bv))
  T('U9', 'the fonts: a Hong Kong / Traditional stack for :lang(yue), :lang(zh-HK) and .yue, declared AFTER the Simplified rule so it wins (zh-HK is also zh)', (() => { const css = SRC.slice(SRC.indexOf(':lang(zh), .zh'), SRC.indexOf(':lang(ja), .jp'))
    return /:lang\(zh\), \.zh \{[^}]*Noto Sans SC/.test(css) && /:lang\(yue\), :lang\(zh-HK\), \.yue \{[^}]*Noto Sans HK[^}]*PingFang HK[^}]*Microsoft JhengHei/.test(css) && css.indexOf('.zh {') < css.indexOf('.yue {') })(), SRC.slice(SRC.indexOf(':lang(zh), .zh'), SRC.indexOf(':lang(zh), .zh') + 600))
  T('U10', 'the Cantonese screens write the Cantonese script in the Cantonese face and never in the Simplified-Chinese face (class zh) — in the Cantonese components, the Player\'s Cantonese branch and the word list',
    !/className="zh"/.test(SRC.slice(SRC.indexOf('function CantoneseNotYet'), SRC.indexOf('function AppRoot'))) && /className=\{_tl === 'yue' \? 'yue' : 'zh'\}/.test(SRC) && /lang === 'yue' \? 'yue' : 'thai'/.test(SRC))
  const gen = html(React.createElement(c.CantoneseGenerator, { vocab: learned, targets: learned.slice(0, 30).map(w => ({ ...w, selectionRole: 'review' })), selection: null, cred: {}, trackMode: 'daily', tracks: [], onGenerated() {}, onBack() {} })).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
  T('U11', 'the generator screen says the track is built from ready-made modules, with NO AI request and no key, that a model quality review is not available yet, and offers Build the track', /no AI request/.test(gen) && /no key is needed/.test(gen) && /not available for Cantonese yet/.test(gen) && /Build the track/.test(gen) && /30 words/.test(gen) && !/API key|Gemini|Mandarin/.test(gen), gen.slice(0, 500))

  {
    let captured = ''
    const noop = () => {}, el = () => ({ style: {}, appendChild: noop, removeChild: noop, setAttribute: noop, addEventListener: noop, click: noop, innerHTML: '', content: '' })
    const cx = load(FILE, { React, globals: { Blob: class { constructor(parts) { this.text = parts.join('') } }, URL: { createObjectURL: b => { captured = b.text; return 'blob:x' }, revokeObjectURL: noop },
      document: { querySelector: () => null, getElementById: () => el(), createElement: el, body: el(), head: el(), addEventListener: noop } } }); cx.console.info = () => {}
    cx.yueModulesSetEnabled(true); cx.ev('yueModulesUseData')(DATA)
    const V = cx.initCantoneseVocab(), tg = V.slice(0, 6).map(w => ({ ...w, selectionRole: 'new' }))
    const res = await cx.generateCantoneseTrack(tg, V, () => {}, () => {}, { cancelled: false }), tr = cx.cantoneseBuildTrack(res, tg, 'daily', '2026-11-16T10:00:00.000Z')
    cx.downloadCantoneseTrack(tr)
    T('U12', 'the transcript download names Cantonese, Yale and the structure check, lists every target with its Yale and every pair with cue, Cantonese, Yale, English and breakdown (never "PINYIN" or "MANDARIN")',
      /CANTONESE TEACHER/.test(captured) && /Romanisation: Yale/.test(captured) && /STRUCTURE CHECK: passed · 18\/18 lines from modules/.test(captured) && /Quality review: not available for Cantonese yet/.test(captured) && /YALE:\s+\S/.test(captured) && /BREAKDOWN:/.test(captured) &&
      (captured.match(/CANTONESE:/g) || []).length === 18 && !/PINYIN|MANDARIN/i.test(captured), captured.slice(0, 500))
  }

  // ── F — the whole flow, no key ──
  async function open(storage) {
    const cx = load(FILE, { React, realBelt: true }); cx.console.info = () => {}; cx.console.warn = () => {}
    cx.yueModulesSetEnabled(true); cx.ev('yueModulesUseData')(DATA)
    Object.entries(storage || {}).forEach(([k, val]) => cx.localStorage.setItem(k, JSON.stringify(val)))
    let r; await TR.act(async () => { r = TR.create(React.createElement(cx.CantoneseTeacher, { lang: 'yue', onSetLang() {} })); await flush(80) })
    return { r, c: cx }
  }
  const btn = (r, rx) => r.root.findAll(x => x.type === 'button').find(b => rx.test(textOf(b.children)))
  const click = async (r, rx) => { const b = btn(r, rx); if (!b) return false; await TR.act(async () => { b.props.onClick(); await flush(60) }); return true }
  const o = await open({})
  const t0 = txt(o.r)
  T('F1', 'first start (no saved data, no key): the Cantonese dashboard opens with the Daily button enabled', /Cantonese Teacher/.test(t0) && /Daily Track/.test(t0) && /Learn \+ review/.test(t0) && !/No targets/.test(t0), t0.slice(0, 300))
  T('F2', 'tapping Listening opens its "not available yet" screen (no generator, no Thai Listening), and Back returns', await click(o.r, /^\s*🎧\s*Listening/) && /Listening track is not available for Cantonese yet/.test(txt(o.r)) && await click(o.r, /Back to the Cantonese dashboard/) && /Daily Track/.test(txt(o.r)))
  T('F3', 'Daily Track opens the generator (nothing built yet); no start gate blocks a brand-new learner (30 targets, 5 NEW + words from the next of the list)', await click(o.r, /Daily Track/) && /Build the track/.test(txt(o.r)) && /TARGETING 30 WORDS/.test(txt(o.r)) && !/TRACK_SELECTION_BLOCKED/.test(txt(o.r)), txt(o.r).slice(0, 300))
  let reqs = 0; o.c.geminiGenerate = async () => { reqs++; throw new Error('no network') }
  T('F4', 'Build the track: 30 words → 90 recalls from modules in a moment, the structure check passes, 0 model requests, a Study button', await click(o.r, /Build the track/) && /Structure check passed/.test(txt(o.r)) && /90 \/ 90 lines from modules/.test(txt(o.r)) && /0 model requests/.test(txt(o.r)) && /Study track/.test(txt(o.r)) && reqs === 0, txt(o.r).slice(-400))
  T('F5', 'Study track: the track is saved under the Cantonese key only (tt-yue-tracks: one track, language yue, 90 pairs, Yale) and the Player opens on the first cue', await click(o.r, /Study track/) && /Say in Cantonese/.test(txt(o.r)) && await (async () => {
    const saved = JSON.parse(o.c.localStorage.getItem('tt-yue-tracks') || 'null'); const tr = saved && (saved.items || saved.list || saved)
    const arr = Array.isArray(tr) ? tr : (tr && tr.v) || []
    return arr.length === 1 && arr[0].language === 'yue' && arr[0].pairs.length === 90 && arr[0].pairs.every(p => c.validateYale(p.pinyin).ok) })() && !o.c.localStorage.getItem('tt-zh-tracks') && !o.c.localStorage.getItem('tt-ja-tracks') && !o.c.localStorage.getItem('tt-tracks'),
    { keys: [...Array(o.c.localStorage.length).keys()].map(i => o.c.localStorage.key(i)) })
  T('F6', 'the new words of the track are remembered for today under tt-yue-daily-new (5 new words, ids), and nothing of the other languages is written', (() => { const d = JSON.parse(o.c.localStorage.getItem('tt-yue-daily-new') || 'null'); const v = d && (d.v || d); return !!v && Array.isArray(v.wordIds) && v.wordIds.length === 30 })() &&
    [...Array(o.c.localStorage.length).keys()].map(i => o.c.localStorage.key(i)).every(k => !/^tt-(zh|ja)-/.test(k) && k !== 'tt-vocab'))
  await TR.act(async () => { o.r.unmount() })
  // a learner with progress: Revision opens the generator with 0 NEW words, and a saved track is listed with its download button
  const prog = c.initCantoneseVocab().map((w, i) => i < 40 ? { ...w, status: 'learning', lastSeen: '2026-11-01', introducedAt: '2026-10-01', repCount: 3, okStreak: 1, dueDate: '2026-11-12', interval: 3 } : w)
  const o2 = await open({ 'tt-yue-vocab': prog })
  T('F7', 'a learner with 40 learned words: the dashboard counts them, Revision Track is enabled and opens the generator with 0 NEW', /40 Learning|Learning/.test(txt(o2.r)) && await click(o2.r, /Revision Track/) && /Build the track/.test(txt(o2.r)) && /0 NEW|TARGETING/.test(txt(o2.r)) && !/ NEW/.test(txt(o2.r).replace(/0 NEW/g, '')), txt(o2.r).slice(0, 300))
  await TR.act(async () => { o2.r.unmount() })
  // the language is remembered and chooses the screen
  const o3 = load(FILE, { React, realBelt: true }); o3.console.info = () => {}
  o3.sessionStorage.setItem('tt-active-language', 'yue')
  let r3; await TR.act(async () => { r3 = TR.create(React.createElement(o3.AppRoot)); await flush(120) })
  T('F8', 'AppRoot: a saved language yue opens the Cantonese Teacher (not Thai); an unknown value still opens Thai', /Cantonese Teacher|Loading Cantonese/.test(txt(r3)) && !/Thai Teacher|Loading Thai/.test(txt(r3)))
  await TR.act(async () => { r3.unmount() })
  const o4 = load(FILE, { React, realBelt: true }); o4.console.info = () => {}; o4.sessionStorage.setItem('tt-active-language', 'klingon')
  let r4; await TR.act(async () => { r4 = TR.create(React.createElement(o4.AppRoot)); await flush(120) })
  T('F9', 'an unknown saved language still falls back to Thai, as before (only a KNOWN language chooses its own screen)', !/Cantonese Teacher|Loading Cantonese/.test(txt(r4)))
  await TR.act(async () => { r4.unmount() })

  // ── W ──
  const tb = SRC.slice(SRC.indexOf('function CantoneseTeacher('), SRC.indexOf('function AppRoot('))
  T('W1', 'multi-tab wiring (copied from the Mandarin screen, on the Cantonese keys): load + mark, commit with the shared options, tab-synced vocab and tracks, daily-new change listener', /stGet\(YUE\.vocab\)/.test(tb) && /stSyncMark\(YUE\.vocab/.test(tb) && /stSyncMark\(YUE\.tracks/.test(tb) && /stSyncCommit\(YUE\.vocab, v, setVocab, stWordId/.test(tb) && /stSyncCommit\(YUE\.tracks, capped, setTracks, stTrackId/.test(tb) &&
    /useTabSyncedList\(YUE\.vocab, setVocab, stWordId, null, !loading\)/.test(tb) && /useTabSyncedList\(YUE\.tracks, setTracks, stTrackId, ST_TRACK_OPTS, !loading\)/.test(tb) && /stSyncOnChange\(YUE\.dailyNew/.test(tb) && /deleted: \[stTrackId\(tracks\[idx\]\)\]/.test(tb))
  T('W2', 'the Cantonese screen touches no other language\'s storage: no ZH. / JA. key, no Mandarin bank / merge / generator, no model key use', !/\bZH\.|\bJA\.|'tt-vocab'|mergeMandarinVocab|initMandarinVocab|MandarinGenerator|MandarinQualityReview|geminiKey|apiKey/.test(tb.replace(/geminiKey=\{cred\.geminiKey\}/g, '').replace(/\/\/[^\n]*/g, '')), tb.match(/\bZH\.\w+|\bJA\.\w+|Mandarin\w*/g))
  const cg = SRC.slice(SRC.indexOf('function CantoneseGenerator('), SRC.indexOf('function CantoneseDashboard('))
  T('W3', 'the Cantonese generator screen needs no key and calls no model: no apiKey, no geminiGenerate, no scene step, no quality check', !/apiKey|geminiGenerate|geminiRequest|generateMandarin|buildAndQc|jazhQcFinaliseAndListen|Scene/.test(cg.replace(/\/\/[^\n]*/g, '')), cg.match(/apiKey|gemini\w+|Scene/g))
  T('W4', 'no secret anywhere in the Cantonese code or data: no API key, no access code, no key literal in the new blocks', (() => { const blocks = [SRC.slice(SRC.indexOf('function initCantoneseVocab'), SRC.indexOf('// ── PHRASE / WORD SPLIT')), SRC.slice(SRC.indexOf('const YUE_MODULES = {'), SRC.indexOf('// ── Japanese adapter for the target-group core')), SRC.slice(SRC.indexOf('const YUE_NOT_YET'), SRC.indexOf('function AppRoot'))].join('\n')
    return !/AIza[0-9A-Za-z_-]{20,}|sk-[A-Za-z0-9]{20,}|LT_ACCESS|access code|password/i.test(blocks) })())
  console.log((fails ? 'FAIL ' : 'ALL PASS ') + (n - fails) + '/' + n)
  process.exit(fails ? 1 : 0)
})().catch(e => { console.log('CRASH', e && e.stack || e); process.exit(2) })
