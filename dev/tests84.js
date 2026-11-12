// 12 Nov — the new Mandarin word list teaches the structure particles (了 的 吗 吧 呢 们 过 着 没 比 个) as words. In a sentence they are grammar, never a content unit:
// before this fix they were counted by the length limit, so 明天我们去买东西吧 measured 7 > hardMax 6 at Mukyu and a valid Listening / Daily line was rejected TOO_COMPLEX.
const { load } = require('./harness')
const c = load(process.env.TT_FILE || 'tt.compiled.js')
let n = 0, fails = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; console.log((pass ? 'PASS ' : 'FAIL ') + id + '  ' + name + (!pass && detail !== undefined ? '  ' + JSON.stringify(detail) : '')) }
const V = c.initMandarinVocab()
T('P0', 'the bank holds the particles as words (了 吧 们) with ids, so a target 了 can still be taught', ['了', '吧', '们'].every(w => V.some(x => x.chinese === w)))
const units = s => c.complexityUnits('zh', s)
T('P1', '明天我们去买东西吧。 counts 5 content units (明天 我 去 买 东西), not 7', units('明天我们去买东西吧。') === 5, units('明天我们去买东西吧。'))
T('P2', '我吃了。 counts 2 (我 吃) and 好吧。 counts 1', units('我吃了。') === 2 && units('好吧。') === 1, [units('我吃了。'), units('好吧。')])
T('P3', '不 was a bank word before the list changed and keeps counting as a unit: 我不吃。 = 3', units('我不吃。') === 3, units('我不吃。'))
const lex = c.mandarinLexicon(null)
const seg = c.segmentMandarin('我吃了。', lex)
const le = seg.find(s => s.surface === '了')
T('P4', 'the segment 了 is grammar but still carries the bank word id (coverage / SRS can find it)', le && le.type === 'grammar' && V.find(x => x.chinese === '了').id === le.vocabId, le)
console.log(fails ? 'FAILED ' + fails + '/' + n : 'ALL PASS ' + n + '/' + n); process.exit(fails ? 1 : 0)
