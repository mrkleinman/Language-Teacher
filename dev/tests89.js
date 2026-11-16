// 16 Nov — Japanese speech is given the KANA reading, never the kanji (the voice guessed readings: 今日 きょう / こんにち, 家 いえ / か, 何 なに / なん).
// The Daily player used to hand the written text to the voice; the Listening player already used the reading. Real application function; no network.
const { load } = require('./harness')
const c = load(process.env.TT_FILE || 'tt.compiled.js'); c.console.info = () => {}; c.console.warn = () => {}
const fs = require('fs')
let n = 0, fails = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; console.log((pass ? 'PASS ' : 'FAIL ') + id + '  ' + name + (!pass && detail !== undefined ? '\n      ' + JSON.stringify(detail) : '')) }
const tts = c.ev('ttsTextForPair')
T('K1', 'a Japanese line is spoken from its kana reading: 今日は暇だよ。 → きょうはひまだよ。', tts({ japanese: '今日は暇だよ。', reading: 'きょうはひまだよ。' }) === 'きょうはひまだよ。')
T('K2', 'a reading that still lists alternatives (何 なに / なん) is rebuilt from the segments\' own kana, not replaced by kanji', tts({ japanese: '何時に行く？', reading: 'なんじ / なにじにいく？', segments: [{ surface: '何時', reading: 'なんじ' }, { surface: 'に', reading: 'に' }, { surface: '行く', reading: 'いく' }, { surface: '？', reading: '？' }] }) === 'なんじにいく？')
T('K3', 'with alternatives and no segments the first alternative is spoken (kana), still no kanji', tts({ japanese: '何？', reading: 'なに/なん？' }) === 'なに')
T('K4', 'only when no kana can be made does the voice get the written text (an empty reading)', tts({ japanese: 'こんにちは。', reading: '' }) === 'こんにちは。' && tts({ japanese: '今日', reading: '今日' }) === '今日')
T('K5', 'the Daily player speaks speechTextOf (kana) and only SHOWS the written text', (() => { const s = fs.readFileSync('tt.jsx', 'utf8'); return /speechTextOf = p => \(!p \? '' : _tl === 'ja' \? ttsTextForPair\(p\) : targetTextOf\(p\)\)/.test(s) && /speakOrWait\(speechTextOf\(pair\), _tlCode/.test(s) && /\{targetTextOf\(p/.test(s) })())
T('K6', 'Thai and Mandarin lines are spoken from their own script as before', tts({ chinese: '你好。', pinyin: 'nǐ hǎo.' }) === '你好。' && tts({ thai: 'สวัสดี' }) === 'สวัสดี')
// every line of the owner's 16 Nov export has a kana reading, so every line is spoken from kana
const exp = fs.existsSync('/root/.claude/uploads/676fe26a-1df8-5b6e-8a48-17ab21481baf/6b4d7d1b-japanese-track-2026-11-16-daily_1.txt') ? fs.readFileSync('/root/.claude/uploads/676fe26a-1df8-5b6e-8a48-17ab21481baf/6b4d7d1b-japanese-track-2026-11-16-daily_1.txt', 'utf8') : null
if (exp) { const blocks = exp.slice(exp.indexOf('TRACK PAIRS')).split(/\nPAIR \d+/).slice(1); const g = (b, k) => (b.match(new RegExp(k + ':\\s+(.*)')) || [, ''])[1]
  const bad = blocks.map(b => tts({ japanese: g(b, 'JAPANESE'), reading: g(b, 'READING') })).filter(x => /[一-鿿]/.test(x))
  T('K7', 'all ' + blocks.length + ' lines of the 16 Nov track export are spoken without any kanji', bad.length === 0, bad.slice(0, 3)) }
console.log((fails ? 'FAIL ' : 'ALL PASS ') + (n - fails) + '/' + n)
process.exit(fails ? 1 : 0)
