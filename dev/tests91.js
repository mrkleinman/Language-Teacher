// 16 Nov — Cantonese as the fourth language, part 1: the word bank and the Yale validator.
//   B  the embedded bank equals the word list (cantonese-modules/cantonese-word-tags.csv): ids, positions, text, Yale, tiers; belts; init / merge keep the learner's history
//   Y  validateYale: accepts real Yale, rejects Jyutping (tone numbers), pinyin, a missing or misplaced h, a wrong mark, Chinese / Thai / kana; the JS and the Python validator agree
//   M  Yale survives the shared tidy step (combining marks)
// Real application functions; Python (tools/build_yue_modules.py) is the reference for the validator.
const { load } = require('./harness')
const fs = require('fs'), cp = require('child_process')
const c = load(process.env.TT_FILE || 'tt.compiled.js', { realBelt: true }); c.console.info = () => {}; c.console.warn = () => {}
let n = 0, fails = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; console.log((pass ? 'PASS ' : 'FAIL ') + id + '  ' + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 700) : '')) }
const csv = f => { // a small CSV reader (quoted fields, commas and newlines inside quotes)
  const t = fs.readFileSync(f, 'utf8').replace(/^﻿/, ''), rows = []; let row = [], cur = '', q = false
  for (let i = 0; i < t.length; i++) { const ch = t[i]
    if (q) { if (ch === '"') { if (t[i + 1] === '"') { cur += '"'; i++ } else q = false } else cur += ch }
    else if (ch === '"') q = true
    else if (ch === ',') { row.push(cur); cur = '' }
    else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = '' }
    else if (ch !== '\r') cur += ch }
  if (cur || row.length) { row.push(cur); rows.push(row) }
  const h = rows.shift(); return rows.filter(r => r.length === h.length).map(r => Object.fromEntries(h.map((k, i) => [k, r[i]])))
}
const SRC = fs.readFileSync('tt.jsx', 'utf8')
const tags = csv('cantonese-modules/cantonese-word-tags.csv')
const live = tags.filter(r => !r.skip).sort((a, b) => +a.rank - +b.rank)
const V = c.initCantoneseVocab()
const BELTS = ['White', 'Orange', 'Orange + Stripe', 'Blue', 'Blue + Stripe', 'Yellow', 'Yellow + Stripe', 'Green', 'Green + Stripe', 'Brown', 'Brown + Stripe']

// ── B ──
T('B1', 'the bank holds the 2,470 live words of the list, once each (id and position unique), and no skipped word', V.length === 2470 && live.length === 2470 && new Set(V.map(w => w.id)).size === 2470 && new Set(V.map(w => w.unlockOrder)).size === 2470 &&
  tags.filter(r => r.skip).every(r => !V.some(w => w.id === +r.id)), { bank: V.length, live: live.length })
const diff = live.filter((r, i) => { const w = V[i]; return w.id !== +r.id || w.chinese !== r.word || w.pinyin !== r.yale || w.jyutping !== r.jyutping || w.english !== r.meaning || w.tier !== r.tier })
T('B2', 'every row equals the list: id, written form, Yale (in the pinyin field), Jyutping, meaning, tier (the bank is generated from the CSV, nothing typed by hand)', !diff.length, diff.slice(0, 3).map(r => r.word))
T('B3', 'positions are the list\'s rank order with its one gap (rank 753, a word dropped as a Mandarin form) closed: 1 … 2470, and every belt but the last holds exactly its positions',
  V.every((w, i) => w.unlockOrder === i + 1 && w.curriculumIndex === i + 1) && c.ev('CURRICULUM_BELTS').slice(0, 10).every(b => c.rankTestStatus(V, b.name).missingPositions === 0), c.ev('CURRICULUM_BELTS').map(b => [b.name, c.rankTestStatus(V, b.name).populated, c.rankTestStatus(V, b.name).positions]))
const last = c.rankTestStatus(V, 'Brown + Stripe')
T('B4', 'the last belt holds 295 of its 325 positions (the list is 30 words short of 2,500): it says so, and cannot be completed until the words are added', last.populated === 295 && last.missingPositions === 30 && !last.complete && /not in the curriculum yet/.test(last.label), last)
const moved = V.filter(w => { const r = live.find(x => +x.id === w.id); return w.belt !== r.belt })
T('B5', 'a word\'s belt follows its position; it differs from the list\'s belt column only for the six words at a belt boundary that the closed gap moved up by one (the list says Yellow for 一樣, its position is the last of Blue + Stripe)',
  moved.length === 6 && moved.every(w => [800, 1000, 1200, 1525, 1850, 2175].includes(w.unlockOrder)), moved.map(w => [w.chinese, w.unlockOrder, w.belt]))
T('B6', 'the first words are the list\'s: 嘅 我 想 你 係, with the locked id (想 is the core word 3002: ids are NOT positions)', V.slice(0, 5).map(w => w.chinese).join('') === '嘅我想你係' && V[2].id === 3002 && V[2].unlockOrder === 3)
const zeroDup = V.filter(w => w.chinese === '好')
T('B7', 'two words may share a written form (好 adjective and 好 adverb): both are kept with their own id', zeroDup.length === 2 && zeroDup[0].id !== zeroDup[1].id, zeroDup.map(w => w.id))
T('B8', 'every row is a word (no phrase entries exist for Cantonese): jazhWordsOnly keeps all, the phrase id set is empty / absent, no row has a home belt', V.every(w => w.entryType === 'word') && c.ev('jazhWordsOnly')(V).length === V.length && !c.ev('jazhPhraseIdSet')('yue') && c.ev('typeof YUE_PHRASE_DATA') === 'undefined')
T('B9', 'the part of speech is the app\'s own name (classifier → measure word, adj → adjective, proper → proper noun), and a classifier is a function word for the target cap',
  V.filter(w => w.partOfSpeech === 'measure word').length === 45 && V.every(w => w.partOfSpeech) && c.ev('isJazhFunctionWord')(V.find(w => w.partOfSpeech === 'measure word'), 'yue') && !c.ev('isJazhFunctionWord')(V.find(w => w.partOfSpeech === 'noun'), 'yue'))
T('B10', 'the pinyin field holds Yale and only Yale: no tone number, no pinyin mark, in any of the 2,470 rows; the Jyutping field (kept for the voice) is never the pinyin',
  V.every(w => c.validateYale(w.pinyin).ok && !/[0-9]/.test(w.pinyin) && /[0-9]/.test(w.jyutping) && w.pinyin !== w.jyutping), V.filter(w => !c.validateYale(w.pinyin).ok).slice(0, 5).map(w => [w.chinese, w.pinyin, c.validateYale(w.pinyin).reason]))
T('B11', 'traditional characters, Hong Kong usage: the Cantonese words 嘅 咗 唔 冇 喺 佢 哋 are in the bank, and the Mandarin forms 的 了 是 不 在 他 are not words of it',
  ['嘅', '咗', '唔', '冇', '喺', '佢', '我哋'].every(x => V.some(w => w.chinese === x)) && !['的', '了', '是', '不', '在', '他'].some(x => V.some(w => w.chinese === x)))
T('B12', 'no simplified-only character in the 2,470 words (the written form is traditional): 个 们 国 学 说 这 没 吗 are absent', !V.some(w => /[个们国学说这没吗对时点样东买]/.test(w.chinese)), V.filter(w => /[个们国学说这没吗对时点样东买]/.test(w.chinese)).map(w => w.chinese))
// init / merge
const saved = V.map(w => ({ ...w })); saved[0] = { ...saved[0], status: 'known', okStreak: 5, repCount: 9, interval: 40, lastSeen: '2026-11-10', dueDate: '2026-12-20', introducedAt: '2026-09-01', english: 'OLD TEXT', pinyin: 'OLD', belt: 'Shodan', curriculumIndex: 9999 }
saved.push({ id: 987654, chinese: '舊', pinyin: 'gauh', english: 'old', status: 'learning', repCount: 2 })
const M = c.mergeCantoneseVocab(saved)
T('B13', 'merging a saved list: the learner\'s history is kept (status, streak, repetitions, dates), the bank\'s text, Yale, belt and position win, a saved word that is not in the bank is kept',
  M[0].status === 'known' && M[0].okStreak === 5 && M[0].repCount === 9 && M[0].interval === 40 && M[0].dueDate === '2026-12-20' && M[0].introducedAt === '2026-09-01' && M[0].english === V[0].english && M[0].pinyin === 'ge' && M[0].belt === 'White' && M[0].curriculumIndex === 1 &&
  M.some(w => w.id === 987654) && M.length === V.length + 1, M[0])
T('B14', 'merging nothing gives the fresh bank; a known word with no streak keeps its status', c.mergeCantoneseVocab(null).length === 2470 && c.mergeCantoneseVocab([{ ...V[1], status: 'known', okStreak: 0 }])[1].status === 'known' && c.mergeCantoneseVocab([{ ...V[1], status: 'known', okStreak: 0 }])[1].okStreak > 0)
T('B15', 'a Cantonese row is told apart from a Mandarin one by its Jyutping field (script class yue, not the Simplified-Chinese face)', c.canonicalScriptClass(V[0]) === 'yue' && c.canonicalScriptClass(c.initMandarinVocab()[0]) === 'zh' && c.isCantoneseWord(V[0]) && !c.isCantoneseWord(c.initMandarinVocab()[0]))
T('B16', 'the bank block in tt.jsx carries the generator note and is bounded by the YUE_BANK markers; the generator is idempotent (re-running it changes nothing)', /\/\/ ══ YUE_BANK begin \(generated by tools\/build_yue_bank\.py/.test(SRC) && /\/\/ ══ YUE_BANK end/.test(SRC) &&
  (() => { const before = fs.readFileSync('tt.jsx', 'utf8'); cp.execFileSync('python3', ['tools/build_yue_bank.py'], { stdio: 'pipe' }); return fs.readFileSync('tt.jsx', 'utf8') === before })())

// ── Y ──
const ok = s => c.validateYale(s).ok, bad = (s, rx) => { const r = c.validateYale(s); return !r.ok && (!rx || rx.test(r.reason)) }
T('Y1', 'real Yale is accepted: néih hóu · ngóh deih · m̀h gōi · kéuih · chèuhng · yùhn · sāam · jyutjyuh-style words from the list · with punctuation', ['néih hóu', 'ngóh deih', 'm̀h gōi', 'kéuih', 'chèuhng', 'yùhn', 'sāam', 'séung', 'sīng kèih luhk', 'néih hóu, ngóh hóu hóu!', 'ge', 'ńgh', 'ḿ', 'gehp', 'Néih hóu', 'hóu a?'].every(ok), ['néih hóu', 'm̀h gōi', 'ngóh deih'].filter(x => !ok(x)))
T('Y2', 'tone numbers (Jyutping) are refused: nei5 hou2 · ngo5 · hou2 · m4 goi1', ['nei5 hou2', 'ngo5', 'hou2', 'm4 goi1', 'néih5'].every(s => bad(s, /tone numbers/)))
T('Y3', 'pinyin is refused: nǐ hǎo · wǒ · xiǎng · lǜ · nǚ (carons and ü are not Yale), and Chinese, Thai or kana in the line', bad('nǐ hǎo') && bad('wǒ') && bad('xiǎng') && bad('lǜ') && bad('nǚ') && bad('你好') && bad('ngóh 我') && bad('สวัสดี') && bad('こんにちは'))
T('Y4', 'the low tones carry h: a grave without h is refused (nèi, hòu), a high (macron) with h is refused (sāamh), and a syllable with two marks is refused', bad('nèi') && bad('hòu') && bad('sāamh') && bad('néí') && ok('nèih') && ok('hòuh') && ok('sāam'))
T('Y5', 'the mark sits on the first vowel (on the u of yu): néih ok, neíh refused; yùhn ok, yuùhn refused; m̀h ok, mh̀ refused', ok('néih') && bad('neíh') && ok('yùhn') && bad('yuùhn') && ok('m̀h') && bad('mh̀'))
T('Y6', 'letters that are not Yale are refused: z c (Jyutping initials), oe, eo, x, q, v', ['zo', 'cing', 'soeng', 'seoi', 'xiao', 'qing', 'vo'].every(s => bad(s)), ['zo', 'cing', 'soeng'].map(s => c.validateYale(s)))
T('Y7', 'an empty or missing line is refused with a plain reason', bad('', /missing/) && bad(null, /missing/) && bad(undefined) && bad('   '))
T('Y8', 'EVERY Yale of the list (2,470 rows) is valid, and the validator is not a pass-everything: taking the h away from a low falling syllable (grave mark) makes it invalid in every one of the words that has one',
  V.every(w => ok(w.pinyin)) && (() => { const lows = V.filter(w => /[àèìòù]|\u0300/.test(w.pinyin.normalize('NFD').normalize('NFC'))); const cut = w => w.pinyin.normalize('NFC').replace(/([àèìòù]\p{L}*?)h/u, '$1')
    return lows.length > 300 && lows.every(w => cut(w) !== w.pinyin.normalize('NFC') ? !ok(cut(w)) : true) && lows.filter(w => cut(w) !== w.pinyin.normalize('NFC')).length > 300 })())
// the Python validator is the reference: both must agree on a large set of strings (every list Yale, and mutations of them)
{
  const strings = new Set()
  V.forEach((w, i) => { strings.add(w.pinyin); if (i % 3 === 0) {
    strings.add(w.pinyin.replace(/h\b/, '')); strings.add(w.pinyin.replace(/([aeiou])/, '$1h')); strings.add(w.pinyin.replace(/[áàâ]/, 'ǎ')); strings.add(w.pinyin.replace(/\bn/, 'z')); strings.add(w.pinyin.replace(/ou/, 'eo'))
    strings.add(w.pinyin.normalize('NFD').replace(/[̀́̄]/, '').normalize('NFC')); strings.add(w.jyutping); strings.add(w.pinyin + ' ' + w.pinyin.toUpperCase()) } })
  ;['kéuih', 'néih', 'gehp', 'sāam', 'chēut', 'jyū', 'aa', 'saaam', 'hh', 'm̄h', 'ńg', 'ng', 'ngh'].forEach(s => strings.add(s))
  const list = [...strings]
  const py = `import sys, json
src = open('tools/build_yue_modules.py', encoding='utf-8').read().replace('\\nmain()\\n', '\\n')
g = {'__name__': 'x', '__file__': 'tools/build_yue_modules.py'}
exec(compile(src, 'b', 'exec'), g)
items = json.load(sys.stdin)
print(json.dumps([g['validate_yale'](s)[0] for s in items]))`
  const out = JSON.parse(cp.execFileSync('python3', ['-c', py], { input: JSON.stringify(list), encoding: 'utf8', maxBuffer: 1 << 26 }))
  const dis = list.map((s, i) => [s, ok(s), out[i]]).filter(([s, a, b]) => a !== b)
  T('Y9', 'the JS validator and the Python validator agree on ' + list.length + ' strings (every list Yale, and mutations: h removed or added, a pinyin mark, a Jyutping initial, a missing mark, upper case)', list.length > 1500 && !dis.length, dis.slice(0, 5))
  T('Y10', 'both refuse the Jyutping of every word (tone numbers) and accept the Yale of every word', list.filter(s => /[0-9]/.test(s)).every(s => !ok(s)) && V.every(w => out[list.indexOf(w.pinyin)] === true))
}
// ── M ──
{
  // a rendered module line keeps its Yale byte for byte (tidyPinyin only moves punctuation; combining marks survive)
  const t = c.tidyPinyin('m̀h gōi , néih hóu ?')
  T('M2', 'tidyPinyin keeps the combining marks of Yale (m̀h) and only moves punctuation', t === 'm̀h gōi, néih hóu?' && c.validateYale(t).ok, t)
}
console.log((fails ? 'FAIL ' : 'ALL PASS ') + (n - fails) + '/' + n)
process.exit(fails ? 1 : 0)
