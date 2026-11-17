// 17 Nov — the header buttons in Japanese, Mandarin and Cantonese (owner: "why do none of the other tabs work on the other languages").
//   H  the header: four buttons (no Lessons) in ja / zh / yue, five in Thai; the Lessons view is a plain page if it is somehow requested
//   W  Words: the language's word list with search and filters; Back goes to the language's dashboard
//   S  Settings: the full Settings (Gemini key, backup key, spend, voices, AI model) with no Thai-only control; a saved key reaches the screen at once
//   D  Data: per-language backup and restore (a file with only that language's keys, no credential; another language's file refused; the restore goes through the teacher's own save path;
//      never overwrites newer progress; replace asks twice)
//   A  Add: the learner's own words per language (validation, safe ids, merge keeps them, selectors pick them up, Fill degrades plainly)
//   R  routing pins (each teacher hands over its own save functions)
// Real application code (react-test-renderer on the three teacher screens); the only stand-ins are the browser's download and the model's network answer.
const { load } = require('./harness')
const fs = require('fs'), zlib = require('zlib')
const React = require('react'), TR = require('react-test-renderer')
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const FILE = process.env.TT_FILE || 'tt.compiled.js'
const SRC = fs.readFileSync('tt.jsx', 'utf8')
let n = 0, fails = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; console.log((pass ? 'PASS ' : 'FAIL ') + id + '  ' + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 700) : '')) }
const flush = async (k = 120) => { for (let i = 0; i < k; i++) await new Promise(r => setImmediate(r)) }
// text of a rendered tree: neighbouring text pieces of one element are joined as they read on screen, separate elements are separated by a space
const ti = x => { if (x == null) return ''; if (typeof x === 'string') return x; let out = '', prevText = false
  ;(x.children || []).forEach(c => { const t = ti(c), isT = typeof c === 'string'; out += (out && !(prevText && isT) ? ' ' : '') + t; prevText = isT }); return out }
const mainText = r => ti(r.root.findAll(x => x.type === 'main')[0]).replace(/\s+/g, ' ')
const KEY = 'AIzaSyTEST-harness-key-000000', BACKUP = 'AIzaSyTEST-backup-key-1111111', TTS = 'AIzaSyTEST-tts-key-2222222222', CODE = 'test-access-code-7f3a'
const SECRETS = [KEY, BACKUP, TTS, CODE]
const DATA = JSON.parse(zlib.gunzipSync(Buffer.from(load(FILE).ev('YUE_MODULES_GZ'), 'base64')).toString('utf8'))
const TEACHER = { ja: 'JapaneseTeacher', zh: 'MandarinTeacher', yue: 'CantoneseTeacher' }
const KEYS = { ja: ['tt-ja-vocab', 'tt-ja-tracks', 'tt-ja-daily-new'], zh: ['tt-zh-vocab', 'tt-zh-tracks', 'tt-zh-daily-new'], yue: ['tt-yue-vocab', 'tt-yue-tracks', 'tt-yue-daily-new'] }
const NAME = { ja: 'Japanese', zh: 'Mandarin', yue: 'Cantonese' }
const LANGS = ['ja', 'zh', 'yue']

// a browser that can download: every anchor click and every Blob is recorded
function browser() {
  const dl = { blobs: [], clicks: [] }
  const noop = () => {}
  const el = () => ({ style: {}, appendChild: noop, setAttribute: noop, addEventListener: noop, innerHTML: '', content: '' })
  const document = { querySelector: () => null, getElementById: () => el(), createElement: () => ({ style: {}, parentNode: null, setAttribute: noop, click() { dl.clicks.push({ href: this.href, download: this.download }) } }),
    body: { appendChild: noop }, head: el(), addEventListener: noop }
  const Blob = class { constructor(parts) { this.text = parts.join(''); dl.blobs.push(this) } }
  const URL = { createObjectURL: b => 'blob:' + dl.blobs.indexOf(b), revokeObjectURL: noop }
  return { dl, globals: { document, Blob, URL } }
}
async function open(lang, storage, o) {
  const opt = o || {}, b = browser()
  const cx = load(FILE, { React, realBelt: true, globals: b.globals }); cx.console.info = () => {}; cx.console.warn = () => {}
  if (opt.modules) { cx.yueModulesSetEnabled(true); cx.ev('yueModulesUseData')(DATA) }
  Object.entries(storage || {}).forEach(([k, v]) => cx.localStorage.setItem(k, JSON.stringify(v)))
  const commits = []; const real = cx.stSyncCommit; cx.stSyncCommit = (key, mine, set, idOf, op) => { commits.push({ key, n: (mine || []).length, op }); return real(key, mine, set, idOf, op) }
  let r; await TR.act(async () => { r = TR.create(React.createElement(cx[TEACHER[lang]], { lang, onSetLang() {} })); await flush(80) })
  return { r, c: cx, dl: b.dl, commits }
}
const btns = r => r.root.findAll(x => x.type === 'button')
const byTitle = (r, t) => btns(r).find(b => b.props.title === t)
const byText = (r, rx) => btns(r).find(b => rx.test(ti(b).replace(/\s+/g, ' ')))
const click = async (r, rx) => { const b = typeof rx === 'string' ? byTitle(r, rx) : byText(r, rx); if (!b) return false; await TR.act(async () => { b.props.onClick(); await flush(60) }); return true }
const input = (r, rx) => r.root.findAll(x => (x.type === 'input' || x.type === 'textarea') && rx.test(String(x.props.placeholder || '')))[0]
const type = async (r, rx, v) => { const i = input(r, rx); if (!i) return false; await TR.act(async () => { i.props.onChange({ target: { value: v } }); await flush(5) }); return true }
const stored = (c, k) => { const v = c.localStorage.getItem(k); return v == null ? null : JSON.parse(v) }
const allStored = c => { const o = {}; for (let i = 0; i < c.localStorage.length; i++) { const k = c.localStorage.key(i); o[k] = c.localStorage.getItem(k) } return o }
const fileOf = (name, text) => ({ name, text: async () => text })
const chooseFile = async (r, f) => { const i = r.root.findAll(x => x.type === 'input' && x.props.type === 'file')[0]; await TR.act(async () => { await i.props.onChange({ target: { files: [f], value: '' } }); await flush(40) }) }
const msgOf = r => { const m = r.root.findAll(x => x.type === 'p' && x.props['data-backup-msg'])[0]; return m ? ti(m).replace(/\s+/g, ' ') : '' }
const initOf = (c, lang) => lang === 'ja' ? c.initJapaneseVocab() : lang === 'zh' ? c.initMandarinVocab() : c.initCantoneseVocab()
const mkTrack = (lang, id, extra) => ({ id, createdAt: '2026-11-1' + id.slice(-1) + 'T10:00:00.000Z', date: '2026-11-1' + id.slice(-1), language: lang, mode: 'daily', pairs: [], keywords: [], rated: false, ...(extra || {}) })
const progressed = (c, lang, k) => initOf(c, lang).map((w, i) => i < k ? { ...w, status: i < 2 ? 'known' : 'learning', repCount: 4 + i, okStreak: 3, lastSeen: '2026-11-0' + (i + 1), dueDate: '2026-11-20', interval: 5, introducedAt: '2026-10-01' } : w)

;(async () => {
  const c0 = load(FILE, { React, realBelt: true }); c0.console.info = () => {}; c0.console.warn = () => {}

  // ═════ H — the header ═════
  {
    const titles = async lang => { const cx = load(FILE, { React }); cx.console.info = () => {}; let r; await TR.act(async () => { r = TR.create(React.createElement(cx.Header, { view: 'dashboard', onNav() {}, geminiKey: '', geminiSpend: 0, lang, onSetLang() {} })); await flush(5) })
      const t = btns(r).map(b => b.props.title).filter(Boolean); await TR.act(async () => { r.unmount() }); return t }
    const th = await titles('th'), none = await titles(undefined)
    T('H1', 'Thai keeps all five header buttons, Lessons first', th.join() === 'Lessons,Words,Add,Settings,Data' && none.join() === th.join(), th)
    const others = []; for (const l of LANGS) others.push(await titles(l))      // one after the other (react-test-renderer does not allow overlapping act calls)
    T('H2', 'Japanese, Mandarin and Cantonese have four buttons and NO Lessons button (a button that leads nowhere is worse than none)', others.every(t => t.join() === 'Words,Add,Settings,Data'), others)
    const lv = []
    for (const lang of LANGS) { const o = await open(lang); await TR.act(async () => { o.r.root.findAll(x => x.type === 'button' && x.props.title === 'Words')[0].props.onClick(); await flush(20) })
      const cx = o.c; const el = React.createElement(cx.NonThaiExtraView, { view: 'lessons', lang, onBack() {}, ctx: { vocab: [], saveVocab() {} } }); let r2; await TR.act(async () => { r2 = TR.create(el) }); lv.push(ti(r2.root).replace(/\s+/g, ' ')); await TR.act(async () => { o.r.unmount() }) }
    T('H3', 'if the Lessons view is somehow requested the page says plainly that Lessons exist only in the Thai profile, with a way back; no other view uses that fallback any more',
      lv.every((t, i) => t.includes('Lessons is not available for ' + NAME[LANGS[i]] + ' yet') && /Back to the/.test(t)) && Object.keys(c0.ev('TH_ONLY_VIEWS')).join() === 'lessons')
  }

  {
    // the header must not grow wider than a phone screen when the cost chip is shown (owner: it did). The measured check is the browser run (360 / 390 / 420 px, all four languages, with the chip);
    // these pins hold the cause: every part that can shrink is allowed to (language name ellipsis, the chip), the buttons keep their size, and the sides are 12 px
    const hs = SRC.slice(SRC.indexOf('function LanguageSelector('), SRC.indexOf('// ── Dashboard ───'))
    T('H4', 'header layout: the language name shrinks first (to an ellipsis), then the cost chip may shrink, the nav buttons never shrink, the header has a gap and 12 px sides (no fixed total width that a phone cannot hold)',
      /flex:'0 4 auto', minWidth:0/.test(hs) && /textOverflow:'ellipsis'/.test(hs) && /position:'relative', minWidth:0, flexShrink:1/.test(SRC) && /<nav style=\{\{ display: 'flex', gap: 4, flexShrink: 0 \}\}>/.test(hs) && /padding: '0 12px', gap: 4, display: 'flex'/.test(hs), hs.length)
  }

  // ═════ W — Words ═════
  for (const lang of LANGS) {
    const o = await open(lang)
    const before = mainText(o.r)
    T('W1-' + lang, NAME[lang] + ': the Words button (header book) opens the word list with the search box, the filters and the words; not the placeholder', await click(o.r, 'Words') && !!input(o.r, /Search words/) && /\ball\b.*\bdue\b.*\blearning\b.*\bknown\b.*\bnew\b/.test(mainText(o.r)) && !/not available/.test(mainText(o.r)) && !/Daily Track/.test(mainText(o.r)) && /\d{3,} words/.test(mainText(o.r)), mainText(o.r).slice(0, 200))
    const first = initOf(o.c, lang).find(w => !(w.entryType === 'phrase'))
    const sc = lang === 'ja' ? first.japanese : first.chinese
    const total = +(/(\d+) words/.exec(mainText(o.r)) || [0, 0])[1]
    await type(o.r, /Search words/, sc)
    const hit = +(/(\d+) words?/.exec(mainText(o.r)) || [0, 0])[1]
    T('W2-' + lang, NAME[lang] + ': search narrows the list (' + total + ' → ' + hit + ') and the filter chips switch it (due: nothing is due for a new learner)', hit >= 1 && hit < total && mainText(o.r).includes(sc) && await click(o.r, /^due$/) && /0 words/.test(mainText(o.r)), { total, hit })
    T('W3-' + lang, NAME[lang] + ': Back goes to the ' + NAME[lang] + ' dashboard (Daily Track is there again), and the Words button works a second time', await click(o.r, /Back/) && /Daily Track/.test(mainText(o.r)) && await click(o.r, 'Words') && !!input(o.r, /Search words/))
    await TR.act(async () => { o.r.unmount() })
  }

  // ═════ S — Settings ═════
  {
    const o0 = await open('ja')
    const sets = {}
    for (const lang of LANGS) {
      const o = await open(lang, { 'tt-gemini-key': KEY, 'tt-gcp-tts-key': TTS, 'tt-gemini-fallback-key': BACKUP, 'tt-gemini-spend': 0.0123 })
      await click(o.r, 'Settings'); sets[lang] = mainText(o.r); o.settings = o
    }
    T('S1', 'Settings in every language is the FULL Settings: the Gemini key, Test / Save, the backup Gemini key, the spend counter, the voices key and the AI Generation Model card',
      LANGS.every(l => /Gemini API key/.test(sets[l]) && /Test Key/.test(sets[l]) && /Save Key/.test(sets[l]) && /Backup Gemini key/.test(sets[l]) && /Gemini spend/.test(sets[l]) && /\$0\.01230/.test(sets[l]) && /Voices \(Google Cloud TTS\)/.test(sets[l]) && /AI Generation Model/.test(sets[l])), sets.ja)
    T('S2', 'no Thai-only control outside Thai: no "Restore Lost Progress" (it rewrites tt-vocab), no "Thai Voices", and the old "set in the Thai profile" note is gone',
      LANGS.every(l => !/Restore Lost Progress|Restore Rank|Thai Voices|Thai profile/.test(sets[l])), LANGS.map(l => (/Restore Lost Progress|Restore Rank|Thai Voices|Thai profile/.exec(sets[l]) || [])[0]))
    const cxT = load(FILE, { React }); cxT.console.info = () => {}
    let rT; await TR.act(async () => { rT = TR.create(React.createElement(cxT.Settings, { onBack() {}, geminiKey: KEY, onSaveGeminiKey() {}, geminiSpend: 0, onResetGeminiSpend() {}, gcpTtsKey: '', onSaveGcpTtsKey() {}, geminiBackupKey: '', onSaveGeminiBackupKey() {} })); await flush(5) })
    const tt = ti(rT.root).replace(/\s+/g, ' ')
    T('S3', 'the Thai Settings is unchanged: it still has Restore Lost Progress and the Thai Voices card', /Restore Lost Progress/.test(tt) && /Thai Voices/.test(tt) && /Chirp3 HD Thai/.test(tt), tt.slice(0, 200))
    // a key typed and saved in the Japanese Settings is the shared key: stored under the shared name AND used by the screen at once (the header cost chip appears)
    const o = await open('ja')
    const chipBefore = o.r.root.findAll(x => x.props && x.props['aria-label'] === 'Last track Gemini cost').length
    await click(o.r, 'Settings')
    const kin = o.r.root.findAll(x => x.type === 'input' && x.props.type === 'password')[0]
    await TR.act(async () => { kin.props.onChange({ target: { value: KEY } }); await flush(5) })
    await click(o.r, /^Save Key$/)
    await flush(40)
    const chipAfter = o.r.root.findAll(x => x.props && x.props['aria-label'] === 'Last track Gemini cost').length
    T('S4', 'a Gemini key saved in the Japanese Settings is stored under the shared name (tt-gemini-key) and reaches the open screen at once (the header cost chip appears)', stored(o.c, 'tt-gemini-key') === KEY && chipBefore === 0 && chipAfter > 0, { chipBefore, chipAfter, k: stored(o.c, 'tt-gemini-key') })
    await TR.act(async () => { o.r.unmount() })
    // the key a Thai session saved is the key every other language shows
    const o2 = await open('zh', { 'tt-gemini-key': KEY }); await click(o2.r, 'Settings')
    T('S5', 'the key saved in another profile is what the Mandarin Settings shows (shared credentials): the status line says Gemini is active', /active/.test(mainText(o2.r)) && /Backup Gemini key/.test(mainText(o2.r)))
    // Reset spend
    await click(o2.r, /^Reset$/); await flush(20)
    T('S6', 'Reset spend sets the shared counter to zero', stored(o2.c, 'tt-gemini-spend') === 0 || stored(o2.c, 'tt-gemini-spend') == null)
    await TR.act(async () => { o2.r.unmount() })
    for (const l of LANGS) await TR.act(async () => { sets[l] = null })
  }

  // ═════ D — Data ═════
  const expectKeys = ['format', 'version', 'language', 'languageName', 'app', 'appVersion', 'exportedAt', 'counts', 'vocab', 'tracks', 'dailyNew']
  const exports = {}
  for (const lang of LANGS) {
    const V = progressed(c0, lang, 6)
    const cred = { 'tt-gemini-key': KEY, 'tt-gcp-tts-key': TTS, 'tt-gemini-fallback-key': BACKUP, 'tt-anthropic-site-access': CODE }
    const tracks = [mkTrack(lang, 't1', { note: 'oops a key ' + KEY + ' and ' + CODE }), mkTrack(lang, 't2', { rated: true })]
    const o = await open(lang, { ...cred, [KEYS[lang][0]]: V, [KEYS[lang][1]]: tracks, [KEYS[lang][2]]: { date: '2026-11-17', wordIds: [V[3].id, V[4].id] }, 'tt-vocab': [{ id: 1, thai: 'กิน', english: 'eat' }], 'tt-zh-vocab': lang === 'zh' ? V : [{ id: 1, chinese: '我', pinyin: 'wǒ', english: 'I' }], ...(lang === 'ja' ? { 'tt-ja-register': 'polite' } : {}) })
    await click(o.r, 'Data')
    const hasCard = /backup & restore/.test(mainText(o.r)) && /Download backup/.test(mainText(o.r)) && /Choose backup file/.test(mainText(o.r))
    await click(o.r, /Download backup/); await flush(10)
    const text = o.dl.blobs.length ? o.dl.blobs[o.dl.blobs.length - 1].text : ''
    let j = null; try { j = JSON.parse(text) } catch (e) {}
    exports[lang] = { text, j, V }
    T('D1-' + lang, NAME[lang] + ': Data opens (no placeholder) and Download makes one file named ' + (lang) + '-teacher-backup-DATE.json', hasCard && o.dl.clicks.length === 1 && new RegExp('^' + NAME[lang].toLowerCase() + '-teacher-backup-\\d{4}-\\d\\d-\\d\\d\\.json$').test(o.dl.clicks[0].download) && !!j, { clicks: o.dl.clicks, t: mainText(o.r).slice(0, 200) })
    const own = j && j.vocab.every(w => lang === 'ja' ? typeof w.japanese === 'string' : typeof w.chinese === 'string') && j.vocab.every(w => !('thai' in w)) && (lang === 'yue' ? j.vocab.every(w => typeof w.jyutping === 'string') : lang === 'zh' ? j.vocab.every(w => !('jyutping' in w)) : true)
    T('D2-' + lang, NAME[lang] + ': the file holds only ' + NAME[lang] + ' (language, words, tracks, daily-new slots' + (lang === 'ja' ? ', speech style' : '') + '); no other language\'s words, no other key',
      !!j && j.format === 'language-teacher-backup' && j.language === lang && Object.keys(j).filter(k => !expectKeys.includes(k) && k !== 'register').length === 0 && own && j.vocab.length === V.length && j.tracks.length === 2 && j.dailyNew && j.dailyNew.wordIds.length === 2 && j.counts.words === V.length && j.counts.wordsWithProgress === 6 &&
      (lang !== 'ja' || j.register === 'polite') && !text.includes('กิน'), { keys: j && Object.keys(j) })
    T('D3-' + lang, NAME[lang] + ': no credential is in the file: neither the Gemini key, the backup key, the voices key nor the site access code (not even the one a track\'s own text carried)', SECRETS.every(s => !text.includes(s)) && !/AIza[0-9A-Za-z_-]{20,}/.test(text) && text.includes('oops a key'), SECRETS.filter(s => text.includes(s)))
    await TR.act(async () => { o.r.unmount() })
  }
  // another language's file is refused with a plain message and NOTHING changes
  {
    const thaiFile = JSON.stringify({ version: 1, exportedAt: '2026-11-01T00:00:00Z', vocab: [{ id: 1, thai: 'กิน', english: 'eat', status: 'known', repCount: 3 }], tracks: [] })
    const lieFile = JSON.stringify({ ...exports.ja.j, language: 'ja', vocab: exports.zh.j.vocab })
    const refused = []
    for (const lang of LANGS) {
      const seed = { [KEYS[lang][0]]: progressed(c0, lang, 3), [KEYS[lang][1]]: [mkTrack(lang, 't1')] }
      const o = await open(lang, seed); await click(o.r, 'Data')
      const snap = JSON.stringify(allStored(o.c))
      for (const other of LANGS.filter(l => l !== lang)) {
        await chooseFile(o.r, fileOf('x.json', exports[other].text))
        refused.push({ lang, other, msg: msgOf(o.r), same: JSON.stringify(allStored(o.c)) === snap, pending: /This is a .* backup from|Restore \(keeps/.test(mainText(o.r)) })
      }
      await chooseFile(o.r, fileOf('thai.json', thaiFile)); refused.push({ lang, other: 'th', msg: msgOf(o.r), same: JSON.stringify(allStored(o.c)) === snap, pending: /Restore \(keeps/.test(mainText(o.r)) })
      await chooseFile(o.r, fileOf('lie.json', lieFile)); refused.push({ lang, other: 'lie', msg: msgOf(o.r), same: JSON.stringify(allStored(o.c)) === snap })
      await chooseFile(o.r, fileOf('manifest.json', '{"name":"x"}')); refused.push({ lang, other: 'manifest', msg: msgOf(o.r), same: JSON.stringify(allStored(o.c)) === snap })
      await chooseFile(o.r, fileOf('e.json', '')); refused.push({ lang, other: 'empty', msg: msgOf(o.r) })
      await chooseFile(o.r, fileOf('g.json', 'not json {')); refused.push({ lang, other: 'garbage', msg: msgOf(o.r) })
      await TR.act(async () => { o.r.unmount() })
    }
    const lang2 = r => LANG_NAMES(r.other)
    function LANG_NAMES(k) { return { ja: 'Japanese', zh: 'Mandarin', yue: 'Cantonese', th: 'Thai' }[k] }
    T('D4', 'a backup of another language is refused in plain words naming both languages (' + refused.filter(x => LANGS.includes(x.other)).length + ' ja/zh/yue pairings) and nothing is stored or changed',
      refused.filter(x => LANGS.includes(x.other)).every(x => new RegExp('This is a ' + LANG_NAMES(x.other) + ' backup, not a ' + NAME[x.lang] + ' backup').test(x.msg) && x.same && !x.pending), refused.filter(x => LANGS.includes(x.other) && !(x.same && !x.pending)).concat(refused.filter(x => LANGS.includes(x.other) && !new RegExp('This is a ' + LANG_NAMES(x.other) + ' backup').test(x.msg))).slice(0, 2))
    T('D5', 'a Thai backup (the old format: no language field) is refused by its words; a file that names one language but holds another\'s words is refused; the app manifest, an empty file and a garbage file are each refused plainly; nothing changes',
      refused.filter(x => x.other === 'th').every(x => /holds Thai words, not/.test(x.msg) && x.same && !x.pending) && refused.filter(x => x.other === 'lie').every(x => /holds Mandarin words|holds .* words, not|says|mixes/.test(x.msg) || /This is a Japanese backup|holds Mandarin words/.test(x.msg)) && refused.filter(x => x.other === 'lie').every(x => x.same) &&
      refused.filter(x => x.other === 'manifest').every(x => /manifest/.test(x.msg) && x.same) && refused.filter(x => x.other === 'empty').every(x => /empty/.test(x.msg)) && refused.filter(x => x.other === 'garbage').every(x => /not a backup file/.test(x.msg)), refused.filter(x => ['th', 'lie', 'manifest', 'empty', 'garbage'].includes(x.other)).map(x => x.lang + '/' + x.other + ': ' + x.msg).slice(0, 8))
  }
  // restore: a fresh device (the other storage, as after reinstalling a wrapper) gets everything back, through the teacher's own save path
  for (const lang of LANGS) {
    const ex = exports[lang]
    const o = await open(lang)                                              // nothing saved on this device
    await click(o.r, 'Data')
    await chooseFile(o.r, fileOf('b.json', ex.text))
    const preview = mainText(o.r)
    T('D6a-' + lang, NAME[lang] + ': choosing the file shows what is in it before anything changes (words, with progress, tracks, date) and nothing is written yet', new RegExp('This is a ' + NAME[lang] + ' backup from \\d{4}-\\d\\d-\\d\\d').test(preview) && new RegExp(ex.V.length + ' words \\(6 with progress\\) · 2 tracks').test(preview) && /Restore \(keeps newer progress/.test(preview) && /Replace everything with this file/.test(preview) && stored(o.c, KEYS[lang][1]) == null)
    o.commits.length = 0
    await click(o.r, /Restore \(keeps newer progress/); await flush(40)
    const sv = stored(o.c, KEYS[lang][0]), st = stored(o.c, KEYS[lang][1]), sl = stored(o.c, KEYS[lang][2])
    const w0 = sv && sv.find(w => w.id === ex.V[0].id), w4 = sv && sv.find(w => w.id === ex.V[4].id)
    T('D6b-' + lang, NAME[lang] + ': Restore puts the progress back (known words, repetition counts, dates), both tracks and the daily-new slots; the message says how many', !!w0 && w0.status === 'known' && w0.repCount === 4 && w0.lastSeen === '2026-11-01' && w4.repCount === 8 && st.length === 2 && st.map(t => t.id).sort().join() === 't1,t2' && sl && sl.wordIds.length === 2 &&
      new RegExp('Restored ' + NAME[lang] + ' progress: ' + ex.V.length + ' words \\(6 with progress\\) and 2 tracks').test(msgOf(o.r)), { m: msgOf(o.r), w0 })
    T('D6c-' + lang, NAME[lang] + ': the restore went through the teacher\'s own multi-tab saving (stSyncCommit on this language\'s keys only) and the open screen shows it without a reload',
      o.commits.some(c => c.key === KEYS[lang][0]) && o.commits.some(c => c.key === KEYS[lang][1]) && o.commits.every(c => KEYS[lang].includes(c.key)) && !allStoredHasOther(o.c, lang) && /Restored/.test(msgOf(o.r)), { commits: o.commits })
    await click(o.r, /^\s*←|Back/); await flush(10)
    await TR.act(async () => { o.r.unmount() })
  }
  function allStoredHasOther(c, lang) { const ks = Object.keys(allStored(c)); return ks.some(k => /^tt-(ja|zh|yue)-/.test(k) && !k.startsWith('tt-' + lang + '-')) || ks.includes('tt-vocab') }
  // merge never overwrites newer progress; replace asks twice and replaces
  for (const lang of LANGS) {
    const ex = exports[lang]
    const dev = initOf(c0, lang).map((w, i) => i === 0 ? { ...w, status: 'known', repCount: 9, lastSeen: '2026-11-15', okStreak: 3, interval: 20 } : i === 8 ? { ...w, status: 'learning', repCount: 2, lastSeen: '2026-11-10' } : w)   // word 0: MORE progress here than in the file (4); word 8: progress only here
    const o = await open(lang, { [KEYS[lang][0]]: dev, [KEYS[lang][1]]: [mkTrack(lang, 't3')] })
    await click(o.r, 'Data'); await chooseFile(o.r, fileOf('b.json', ex.text))
    await click(o.r, /Restore \(keeps newer progress/); await flush(40)
    const sv = stored(o.c, KEYS[lang][0]), byId = id => sv.find(w => w.id === id)
    const st = stored(o.c, KEYS[lang][1])
    T('D7-' + lang, NAME[lang] + ': Restore never overwrites newer progress: the word with more practice here (9 vs 4) is kept, the file\'s other progress comes in, a word practised only here stays (both are counted as kept), the track made here stays next to the file\'s two',
      byId(ex.V[0].id).repCount === 9 && byId(ex.V[1].id).repCount === 5 && byId(ex.V[5].id).repCount === 9 && byId(dev[8].id).repCount === 2 && st.map(t => t.id).sort().join() === 't1,t2,t3' && /2 words had newer progress on this device and were kept/.test(msgOf(o.r)), { m: msgOf(o.r), r0: byId(ex.V[0].id).repCount, r1: byId(ex.V[1].id).repCount, r5: byId(ex.V[5].id).repCount, ids: st.map(t => t.id) })
    // replace: two taps
    await chooseFile(o.r, fileOf('b.json', ex.text))
    await click(o.r, /Replace everything with this file/)
    const askedTwice = /Tap again/.test(mainText(o.r)) && stored(o.c, KEYS[lang][1]).length === 3
    await click(o.r, /Tap again/); await flush(40)
    const sv2 = stored(o.c, KEYS[lang][0]), st2 = stored(o.c, KEYS[lang][1])
    T('D8-' + lang, NAME[lang] + ': Replace asks a second time before it does anything, then makes this device exactly the file (the progress made only here is gone, the track made here is gone)',
      askedTwice && sv2.find(w => w.id === ex.V[0].id).repCount === 4 && sv2.find(w => w.id === dev[8].id).repCount === 0 && st2.map(t => t.id).sort().join() === 't1,t2' && /Replaced this device/.test(msgOf(o.r)), { askedTwice, m: msgOf(o.r) })
    await TR.act(async () => { o.r.unmount() })
  }
  // round trip through the pure functions + a file whose words are damaged
  {
    const bad = JSON.stringify({ ...exports.ja.j, vocab: [...exports.ja.j.vocab.slice(0, 3), { id: 99, english: 'no script' }] })
    const p = c0.langBackupParse('ja', bad)
    T('D9', 'a file with damaged entries is refused as a whole (nothing half-restored)', !p.ok && /not Japanese words|damaged/.test(p.error), p)
    const pasted = (() => { const x = c0.langBackupParse('zh', exports.zh.text); return x.ok && x.counts.words === exports.zh.V.length && x.counts.wordsWithProgress === 6 })()
    T('D10', 'the pure reader accepts the app\'s own file (the paste route and the file route read it the same way)', pasted)
    const sc = c0.langBackupScrub('a ' + KEY + ' b ' + CODE + ' c AIzaSyZZZZZZZZZZZZZZZZZZZZZZZZZZ', [KEY])
    T('D11', 'the scrubber blanks the keys it is given and anything shaped like a Google key', !sc.includes(KEY) && !/AIza[0-9A-Za-z_-]{20,}/.test(sc), sc)
  }

  // the learner's own words travel in a backup too (a new device gets them back with their ids)
  for (const lang of LANGS) {
    const GW = { ja: { written: '鯨', reading: 'くじら', english: 'whale' }, zh: { written: '乒乓', reading: 'pīngpāng', english: 'ping-pong' }, yue: { written: '鯨', reading: 'kìhng', english: 'whale' } }[lang]
    const built = c0.langCustomBuild(lang, initOf(c0, lang), [GW], { queue: true })
    const a = await open(lang, { [KEYS[lang][0]]: built.vocab }); await click(a.r, 'Data'); await click(a.r, /Download backup/); await flush(10)
    const text = a.dl.blobs[a.dl.blobs.length - 1].text; await TR.act(async () => { a.r.unmount() })
    const b = await open(lang); await click(b.r, 'Data'); await chooseFile(b.r, fileOf('b.json', text)); await click(b.r, /Restore \(keeps newer progress/); await flush(40)
    const got = (stored(b.c, KEYS[lang][0]) || []).find(w => w.custom)
    T('D12-' + lang, NAME[lang] + ': the learner\'s own word travels in the backup: a fresh device gets it back with the same id, still new and still queued', !!got && got.id === built.added[0].id && got.status === 'new' && !!got.queuedNext && /Restored/.test(msgOf(b.r)), got)
    await TR.act(async () => { b.r.unmount() })
  }

  // ═════ A — Add ═════
  const bankMax = lang => Math.max(...initOf(c0, lang).map(w => w.id))
  T('A0', 'the id range for the learner\'s own words starts above every bank id and every phrase id in all three languages', LANGS.every(l => bankMax(l) < c0.ev('LANG_CUSTOM_ID_BASE')) && c0.langCustomNextId(initOf(c0, 'ja')) === c0.ev('LANG_CUSTOM_ID_BASE') + 1, LANGS.map(bankMax))
  const GOOD = { ja: { written: '鯨', reading: 'くじら', romaji: '', english: 'whale' }, zh: { written: '乒乓', reading: 'pīngpāng', english: 'ping-pong' }, yue: { written: '鯨', reading: 'kìhng', english: 'whale' } }
  const BAD = {
    ja: [['romaji that does not match', { written: '犬', reading: 'いぬ', romaji: 'neko', english: 'dog' }, /romaji "neko" does not match/], ['romaji typed in the reading box', { written: '犬', reading: 'inu', english: 'dog' }, /reading must be in kana/], ['a kanji word with no reading', { written: '犬', reading: '', english: 'dog' }, /Type the reading in kana/], ['no meaning', { written: '犬', reading: 'いぬ', english: '' }, /Type the meaning in English/], ['Thai script as the written form', { written: 'กิน', reading: 'きん', english: 'eat' }, /must be Japanese/], ['a meaning in Japanese', { written: '犬', reading: 'いぬ', english: '犬です' }, /must be in English/]],
    zh: [['pinyin with tone numbers', { written: '乒乓', reading: 'ping1 pang1', english: 'ping-pong' }, /tone-number pinyin/], ['pinyin with Chinese characters', { written: '乒乓', reading: '乒乓', english: 'ping-pong' }, /Chinese characters/], ['no pinyin', { written: '乒乓', reading: '', english: 'ping-pong' }, /Type the pinyin/], ['kana in the characters', { written: 'ねこ', reading: 'māo', english: 'cat' }, /Chinese characters only/], ['no meaning', { written: '乒乓', reading: 'pīngpāng', english: ' ' }, /Type the meaning/]],
    yue: [['Jyutping with tone numbers', { written: '嘥', reading: 'saai1', english: 'to waste' }, /Yale/], ['pinyin tone marks', { written: '嘥', reading: 'sǎi', english: 'to waste' }, /Yale/], ['an impossible syllable', { written: '嘥', reading: 'xqz', english: 'to waste' }, /Yale/], ['no Yale', { written: '嘥', reading: '', english: 'to waste' }, /Type the Yale/], ['kana in the characters', { written: 'ねこ', reading: 'néih', english: 'cat' }, /Chinese characters only/]],
  }
  for (const lang of LANGS) {
    const rej = BAD[lang].map(([why, f, rx]) => { const v = c0.langCustomValidate(lang, f); return { why, ok: !v.ok && rx.test(v.error), err: v.error } })
    T('A1-' + lang, NAME[lang] + ': validation refuses ' + BAD[lang].length + ' bad entries with a plain reason each (' + BAD[lang].map(b => b[0]).join('; ') + ')', rej.every(r => r.ok), rej.filter(r => !r.ok))
    const good = c0.langCustomValidate(lang, GOOD[lang])
    T('A2-' + lang, NAME[lang] + ': a good entry passes' + (lang === 'ja' ? ' and the romaji is written from the reading (kujira)' : ''), good.ok && (lang !== 'ja' || good.fields.romaji === 'kujira'), good)
  }
  T('A3', 'a Japanese word written in kana needs no reading (it is the reading); a romaji given in the app\'s own plain style is accepted; one with a macron is refused with advice', c0.langCustomValidate('ja', { written: 'ありがとう', reading: '', english: 'thanks' }).fields.reading === 'ありがとう' && c0.langCustomValidate('ja', { written: '東京', reading: 'とうきょう', romaji: 'toukyou', english: 'Tokyo' }).ok && /kyou, not kyō/.test(c0.langCustomValidate('ja', { written: '東京', reading: 'とうきょう', romaji: 'tōkyō', english: 'Tokyo' }).error))
  for (const lang of LANGS) {
    const o = await open(lang, null, { modules: lang === 'yue' })
    await click(o.r, 'Add')
    const ph = lang === 'ja' ? /Word \(e\.g\./ : /Characters|characters/
    await type(o.r, ph, GOOD[lang].written); await type(o.r, lang === 'ja' ? /Reading in kana/ : lang === 'zh' ? /Pinyin with tone marks/ : /Yale \(e\.g\./, GOOD[lang].reading); await type(o.r, /English meaning/, GOOD[lang].english)
    // a bad one first: stays out, with the reason on screen
    await type(o.r, /English meaning/, '')
    await click(o.r, /Add word/)
    const refusedText = mainText(o.r)
    await type(o.r, /English meaning/, GOOD[lang].english)
    await click(o.r, /Add word/)
    const readyText = mainText(o.r)
    await click(o.r, /^\s*Save 1 word/); await flush(40)
    const sv = stored(o.c, KEYS[lang][0]), mine = sv.filter(w => w.custom)
    const w = mine[0]
    T('A4-' + lang, NAME[lang] + ': Single: a bad entry is not added (the reason is on screen), the good one is previewed and saved; the word is entryType word, status new, a fresh id above the banks, no belt position, through the teacher\'s save path',
      /Not added/.test(refusedText) && /Type the meaning in English/.test(refusedText) && /1 word ready to save/.test(readyText) && mine.length === 1 && w.id === c0.ev('LANG_CUSTOM_ID_BASE') + 1 && w.entryType === 'word' && w.status === 'new' && w.curriculumIndex === 0 && w.repCount === 0 && w.english === GOOD[lang].english && w.custom === true &&
      (lang === 'ja' ? w.japanese === '鯨' && w.reading === 'くじら' && w.romaji === 'kujira' : w.chinese === GOOD[lang].written && w.pinyin === GOOD[lang].reading && (lang === 'yue' ? w.jyutping === '' : !('jyutping' in w))) && o.commits.some(c => c.key === KEYS[lang][0]) && /Saved 1 word/.test(mainText(o.r)), { w, t: mainText(o.r).slice(0, 300) })
    // it is on the word list and survives the language's own start-up merge
    const merged = lang === 'ja' ? o.c.mergeJapaneseVocab(sv) : lang === 'zh' ? o.c.mergeMandarinVocab(sv) : o.c.mergeCantoneseVocab(sv)
    T('A5-' + lang, NAME[lang] + ': the language\'s own merge at start-up keeps the added word (and it is still a word of this language by its own fields)', merged.some(x => x.id === w.id && x.custom) && merged.length === initOf(c0, lang).length + 1 && o.c.langOfWordRecord(merged.find(x => x.id === w.id)) === lang)
    // the word list shows it
    await click(o.r, /^\s*←|Back/); await click(o.r, 'Words'); await type(o.r, /Search words/, GOOD[lang].written)
    const wl = mainText(o.r)
    T('A6-' + lang, NAME[lang] + ': the word list shows the added word with its meaning' + (lang === 'yue' ? ' and says it cannot be taught in a Cantonese track yet (no lesson module for a word the learner adds)' : ' and a "Your word." note'), wl.includes(GOOD[lang].written) && wl.includes(GOOD[lang].english) && (lang === 'yue' ? /cannot be taught in a Cantonese track yet/.test(wl) : /Your word\./.test(wl)), wl.slice(0, 300))
    // duplicates
    await click(o.r, /^\s*←|Back/); await click(o.r, 'Add')
    await type(o.r, ph, GOOD[lang].written); await type(o.r, lang === 'ja' ? /Reading in kana/ : lang === 'zh' ? /Pinyin with tone marks/ : /Yale \(e\.g\./, GOOD[lang].reading); await type(o.r, /English meaning/, 'again'); await click(o.r, /Add word/)
    T('A7-' + lang, NAME[lang] + ': the same word twice is refused ("already in your word list")', /already in your word list/.test(mainText(o.r)) && !/ready to save/.test(mainText(o.r)))
    // remove
    await click(o.r, /^Remove$/); await flush(40)
    T('A8-' + lang, NAME[lang] + ': a word the learner added can be removed again (a deliberate delete reaches storage)', stored(o.c, KEYS[lang][0]).filter(x => x.custom).length === 0 && !/Words you added/.test(mainText(o.r)))
    await TR.act(async () => { o.r.unmount() })
  }
  // Bulk
  {
    const BULK = { ja: '鯨 = くじら = whale\nありがとう = thank you\n犬 = いぬ = dog = inu\n東京 | とうきょう | Tokyo\nbad line without separator\n馬 = うま =', zh: '乒乓 = pīngpāng = ping-pong\n谢谢谢 = xièxiexie = thanks a lot\n我 = wǒ = I\n猫 = mao1 = cat\nonly two = fields', yue: '嘥 = sāai = to waste\n嘥嘥 = sāaisāai = wasted\n你好 = néih hóu = hello\n貓 = maau1 = cat\nonly two = fields' }
    for (const lang of LANGS) {
      const r = c0.langCustomParseBulk(lang, BULK[lang])
      T('A9-' + lang, NAME[lang] + ': Bulk parses line by line: good lines kept, each bad line named with its line number and reason (nothing dropped silently)', r.entries.length >= 2 && r.errors.length >= 2 && r.errors.every(e => e.line > 0 && e.error.length > 10) && (lang !== 'ja' || (r.entries.some(e => e.written === 'ありがとう' && e.reading === 'ありがとう') && r.entries.some(e => e.written === '東京'))), r)
    }
    const o = await open('zh'); await click(o.r, 'Add'); await click(o.r, /Bulk Import/)
    await type(o.r, /你好|谢谢/, BULK.zh); await click(o.r, /Check & add/)
    const t = mainText(o.r)
    T('A10', 'Bulk in the app: valid lines wait to be saved, a word already in the bank (我) is refused as already in the list, bad pinyin is refused with its line', /2 words ready to save/.test(t) && /already in your word list/.test(t) && /Line 4/.test(t) && /tone-number pinyin/.test(t), t.slice(0, 500))
    await click(o.r, /^\s*Save 2 words/); await flush(40)
    const mine = stored(o.c, 'tt-zh-vocab').filter(w => w.custom)
    T('A11', 'Bulk save: both words get consecutive fresh ids and are queued first for the next Daily (the checkbox is on)', mine.length === 2 && mine[1].id === mine[0].id + 1 && mine.every(w => w.queuedNext), mine.map(w => [w.id, w.queuedNext]))
    await TR.act(async () => { o.r.unmount() })
  }
  // selectors: a word the learner added is picked up
  for (const lang of ['ja', 'zh']) {
    const cx = load(FILE, { React, realBelt: true }); cx.console.info = () => {}
    const base = initOf(cx, lang)
    const built = cx.langCustomBuild(lang, base, [GOOD[lang]], { queue: true })
    const vocab = lang === 'ja' ? cx.mergeJapaneseVocab(built.vocab) : cx.mergeMandarinVocab(built.vocab)
    const sel = cx.selectTrackTargets({ vocab: cx.jazhWordsOnly(vocab), targetCap: cx.ev('TRACK_TARGET_CAP'), recentTrackWordIds: [], lang, newSelector: v => lang === 'ja' ? cx.japaneseSelectNewSlots(v, []) : cx.mandarinSelectTargets(v, []) })
    const daily = cx.jazhDailyTargets(sel.targets, vocab, lang)
    const id = built.added[0].id
    const unqueued = cx.langCustomBuild(lang, base, [GOOD[lang]], { queue: false })
    const v2 = lang === 'ja' ? cx.mergeJapaneseVocab(unqueued.vocab) : cx.mergeMandarinVocab(unqueued.vocab)
    const sel2 = cx.selectTrackTargets({ vocab: cx.jazhWordsOnly(v2), targetCap: cx.ev('TRACK_TARGET_CAP'), recentTrackWordIds: [], lang, newSelector: v => lang === 'ja' ? cx.japaneseSelectNewSlots(v, []) : cx.mandarinSelectTargets(v, []) })
    T('A12-' + lang, NAME[lang] + ': the selectors pick up an added word: queued ("Study these first") it is a NEW target of the next Daily (stage queued); not queued it is in the pool after the curriculum words and never blocks them',
      cx.jazhTargetEligible(built.added[0], lang) && daily.some(w => w.id === id && w._selectorStage === 'queued' && w.selectionRole === 'new') && !sel2.targets.some(w => w.id === id) && sel2.targets.length > 0, { eligible: cx.jazhTargetEligible(built.added[0], lang), inDaily: daily.filter(w => w.id === id).map(w => [w._selectorStage, w.selectionRole]), n: daily.length })
  }
  {
    const cx = load(FILE, { React, realBelt: true }); cx.console.info = () => {}; cx.yueModulesSetEnabled(true); cx.ev('yueModulesUseData')(DATA)
    const built = cx.langCustomBuild('yue', cx.initCantoneseVocab(), [GOOD.yue], { queue: false }), w = built.added[0]
    const vocab = cx.mergeCantoneseVocab(built.vocab)
    T('A13', 'Cantonese: a word the learner added cannot be selected for a Cantonese track (no module can serve it) — the rule is not changed, and the word list says so; the other words are unaffected',
      !cx.yueTargetTeachable(w, vocab) && !cx.yueDailyTargets(vocab.filter(x => x.status === 'new').slice(0, 5).concat([w]), vocab).targets.some(x => x.id === w.id) && /cannot be taught in a Cantonese track yet/.test(cx.langCustomWordNote('yue', w)), cx.langCustomWordNote('yue', w))
  }
  // Fill
  {
    const o = await open('ja'); await click(o.r, 'Add')
    const fillBtn = () => o.r.root.findAll(x => x.type === 'button' && x.props['data-fill'])[0]
    T('F1', 'with no Gemini key Fill says so plainly (with the reason from Settings) and is disabled; everything can be typed', fillBtn().props.disabled === true && /Fill is not available: no Gemini key is saved in Settings/.test(mainText(o.r)) && /Type the reading in kana and the meaning yourself/.test(mainText(o.r)), mainText(o.r).slice(0, 300))
    let sent = 0; o.c.geminiRequest = async () => { sent++; return '{}' }
    const r0 = await o.c.langCustomFill('ja', '猫', '')
    T('F2', 'with no key / model nothing is sent to the model at all', !r0.ok && /Fill is not available/.test(r0.message) && sent === 0, r0)
    await TR.act(async () => { o.r.unmount() })
    // with a key: the shared request path, the helper stage, a scripted answer
    const mk = async lang => { const cx = load(FILE, { React, realBelt: true }); cx.console.info = () => {}; const calls = []; cx.geminiRequest = async a => { calls.push(a); return cx.__reply }; return { cx, calls } }
    const ja = await mk(); ja.cx.__reply = '```json\n{"reading":"ねこ","english":"cat"}\n```'
    const f1 = await ja.cx.langCustomFill('ja', '猫', KEY)
    T('F3', 'with a key Fill sends ONE request through geminiRequest (stage R_word_autofill, the default model, the key only as the request\'s own credential) and uses the answer when it is valid (reading, meaning)',
      f1.ok && f1.reading === 'ねこ' && f1.english === 'cat' && ja.calls.length === 1 && ja.calls[0].stage === 'R_word_autofill' && ja.calls[0].apiKey === KEY && /猫/.test(JSON.stringify(ja.calls[0].messages)) && !/AIza/.test(JSON.stringify(ja.calls[0].messages)), f1)
    const zh = await mk(); zh.cx.__reply = '{"reading":"ni3 hao3","english":"hello"}'
    const f2 = await zh.cx.langCustomFill('zh', '你好', KEY)
    T('F4', 'a reading the model gets wrong (tone numbers, not pinyin) is NOT used: the meaning is, and the message says to type the reading', f2.ok && f2.reading === undefined && f2.english === 'hello' && /reading the model gave was not valid/.test(f2.message) && /type that part yourself/.test(f2.message), f2)
    const yu = await mk(); yu.cx.__reply = '{"reading":"nei5 hou2","english":"hello"}'
    const f3 = await yu.cx.langCustomFill('yue', '你好', KEY)
    T('F5', 'Cantonese: a Jyutping reading from the model is refused by the Yale check', f3.reading === undefined && /not valid/.test(f3.message) && /Yale/.test(f3.message), f3)
    const bad = await mk(); bad.cx.__reply = 'sorry I cannot help'
    const f4 = await bad.cx.langCustomFill('zh', '你好', KEY)
    T('F6', 'an unreadable answer is said plainly (never silently ignored) and carries no key', !f4.ok && /Fill did not work/.test(f4.message) && !f4.message.includes(KEY), f4)
    const er = await mk(); er.cx.geminiRequest = async () => { throw new Error('HTTP 429 for key ' + KEY) }
    const f5 = await er.cx.langCustomFill('ja', '猫', KEY)
    T('F7', 'a failed request is said plainly with the key blanked out of the text', !f5.ok && /Fill did not work/.test(f5.message) && !f5.message.includes(KEY), f5)
    // the optional model needs no Gemini key, only its site access code
    const hk = await mk(); hk.cx.aiSetGenerationPreference({ model: 'claude-haiku-5-5' })
    const g0 = await hk.cx.langCustomFill('ja', '猫', ''); hk.cx.aiSetAnthropicAccess(CODE); hk.cx.__reply = '{"reading":"ねこ","english":"cat"}'; const g1 = await hk.cx.langCustomFill('ja', '猫', '')
    T('F8', 'with the optional model chosen Fill needs its site access code (not a Gemini key): without it Fill says so, with it Fill runs on the same path', !g0.ok && /site access code/.test(g0.message) && g1.ok && g1.reading === 'ねこ' && hk.calls.length === 1, { g0, g1 })
  }

  // ═════ R — routing pins ═════
  {
    const body = (a, b) => SRC.slice(SRC.indexOf(a), SRC.indexOf(b))
    const tb = { ja: body('function JapaneseTeacher(', '// ── Japanese generation runtime'), zh: body('function MandarinTeacher(', 'function CantoneseTeacher('), yue: body('function CantoneseTeacher(', 'function AppRoot(') }
    T('R1', 'each teacher hands the extra views its OWN save functions (the multi-tab ones) and its own state; nothing of another language', /<NonThaiExtraView view=\{view\} lang="ja".*saveVocab: saveVocabJa, saveTracks: saveTracksJa, saveSlots, saveRegister/.test(tb.ja) && /<NonThaiExtraView view=\{view\} lang="zh".*saveVocab: saveVocabZh, saveTracks: saveTracksZh, saveSlots/.test(tb.zh) && /<NonThaiExtraView view=\{view\} lang="yue".*saveVocab: saveVocabYue, saveTracks: saveTracksYue, saveSlots/.test(tb.yue), Object.fromEntries(Object.entries(tb).map(([k, v]) => [k, v.length])))
    const ex = body('function LangDataView(', '// v688: Japanese and Mandarin had no Lessons')
    T('R2', 'the backup screen writes only through the teacher\'s functions (ctx.saveVocab / saveTracks / saveSlots / saveRegister) — no direct stSet of vocab or tracks, no Thai key', !/stSet\(/.test(ex) && !/'tt-vocab'|'tt-tracks'/.test(ex) && /ctx\.saveVocab\(mv\.vocab, opt\)/.test(body('async function langBackupApply(', 'function langBackupDone(')))
  }

  console.log((fails ? 'FAIL ' : 'ALL PASS ') + (n - fails) + '/' + n)
  process.exit(fails ? 1 : 0)
})().catch(e => { console.log('CRASH', e && e.stack || e); process.exit(2) })
