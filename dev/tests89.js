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
// ── the romaji under each word of a module line (the 16 Nov screenshot showed 言って as "i  te") ──
{
  const zlib = require('zlib'), V = c.initJapaneseVocab(), data = JSON.parse(zlib.gunzipSync(Buffer.from(c.ev('JA_MODULES_GZ'), 'base64')).toString('utf8')); c.ev('jaModulesUseData')(data)
  const render = c.ev('jaModuleRender'), cands = c.ev('jaModuleCandidates'), norm = x => x.replace(/[^a-z]/g, '').replace(/ha/g, 'wa').replace(/wo/g, 'o').replace(/he/g, 'e')
  let n = 0, bad = []
  for (const id of Object.keys(data.t)) { const w = V.find(x => String(x.id) === id); if (!w) continue
    for (const cd of cands(w, 5).slice(0, 2)) { const ls = render(cd, w, l => ''); if (!ls) continue
      for (const l of ls) { n++; if (norm(l.segments.filter(sg => sg.type !== 'punct').map(sg => sg.romaji).join('')) !== norm(l.romaji)) bad.push([l.japanese, l.romaji]) } } }
  T('M1', 'in ' + n + ' rendered module lines the romaji of the words read together equals the line\'s romaji (a word ending in a small っ keeps its doubled consonant: 言っ + て → "it" "te")', bad.length === 0, bad.slice(0, 3))
  // M2 was tied to one line of the old すみません module that quoted 言って; the 16 Nov rewrite of the phrase modules removed that line, so the test now looks for ANY module line
  // with a segment that ends in a small っ and checks that its romaji keeps the doubled consonant (the same rule, no longer tied to one sentence)
  let seenT = 0, badT = []
  for (const id of Object.keys(data.t)) { const w = V.find(x => String(x.id) === id); if (!w) continue
    for (const cd of cands(w, 5).slice(0, 2)) { const ls = render(cd, w, l => ''); if (!ls) continue
      for (const l of ls) for (const [k, sg] of l.segments.entries()) if (/っ$/.test(sg.surface || '') && sg.reading && /っ$/.test(sg.reading) && l.segments[k + 1] && l.segments[k + 1].type !== 'punct') {   // an interjection before punctuation (えっ、) has no next syllable to double
         seenT++; if (!/[kstpgdbzjcfhmnrwy]$/.test(sg.romaji || '')) badT.push([sg.surface, sg.romaji]) } } }
  T('M2', 'a segment that ends in a small っ keeps its doubled consonant in the romaji (' + seenT + ' such segments, e.g. 言っ → "it", not "i")', seenT > 0 && badT.length === 0, badT.slice(0, 3))
}
console.log((fails ? 'FAIL ' : 'ALL PASS ') + (n - fails) + '/' + n)
process.exit(fails ? 1 : 0)
