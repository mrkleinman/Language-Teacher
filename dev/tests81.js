// 12 Nov — the new Japanese bank holds one-kanji WORDS that are also the stem of a taught verb (行 "line" / 行く "go"). The plain word
// used to shadow the stem, so 行けない fell apart into 行 · け · ない and cost a paid regeneration. Real functions, real bank.
const { load } = require('./harness')
const c = load(process.env.TT_FILE || 'tt.compiled.js')
let n = 0, fails = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; console.log((pass ? 'PASS ' : 'FAIL ') + id + '  ' + name + (!pass && detail !== undefined ? '  ' + JSON.stringify(detail) : '')) }
const V = c.initJapaneseVocab()
V.forEach(w => { if (w.status === 'new') w.status = 'learning'; w.lastSeen = '2026-09-20'; w.introducedAt = '2026-09-01' })
const inv = c.japaneseLearnerInventory(V, V.slice(0, 30))
const seg = jp => c.jaRepairPairStructure({ japanese: jp, english: 'x', prompt: 'x' }, inv).segments || []
T('S0', 'the bank holds both the word 行 ("line") and the verb 行く', V.some(w => w.japanese === '行') && V.some(w => w.japanese === '行く'))
const a = seg('ごめん、今日、行けないんだ。')
// the segment takes the whole hiragana run after the stem (行けないんだ), exactly as the existing segmenter always did (tests16 M asserts startsWith)
T('S1', '行けない starts one segment whose lemma is 行く', a.some(s => s.surface.startsWith('行けない') && s.lemma === '行く'), a.map(s => s.surface + '/' + s.lemma))
const b = seg('明日は行かないよ。'), cc = seg('昨日、行ったよ。'), d = seg('もう行こう。')
T('S2', 'other inflections of 行く are also one segment each (行かない, 行った, 行こう)',
  b.some(s => s.lemma === '行く' && s.surface.startsWith('行かない')) && cc.some(s => s.lemma === '行く' && s.surface.startsWith('行っ')) && d.some(s => s.lemma === '行く' && s.surface.startsWith('行こう')), [b, cc, d].map(x => x.map(s => s.surface + '/' + s.lemma)))
const e = seg('行を読んだ。')
T('S3', 'the plain word 行 followed by a particle (行を) is still the word, not a verb stem', e.some(s => s.surface === '行' && s.lemma === '行'), e.map(s => s.surface + '/' + s.lemma))
const f = seg('魚を食べない。')
T('S4', 'an ichidan verb still segments (食べない → 食べる)', f.some(s => s.lemma === '食べる'), f.map(s => s.surface + '/' + s.lemma))
console.log(fails ? 'FAILED ' + fails + '/' + n : 'ALL PASS ' + n + '/' + n); process.exit(fails ? 1 : 0)
