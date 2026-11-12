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
// the Layer A lexicon holds ~3,000 bank words now: 不可 is a bank word, so 不可以 was cut 不可 + 以 and a learner who knows 不 and 可以 was told "unknown words: 不可 以"
{
  const { learner, V693_IDS } = require('./benchmark/v692/learners')
  const cc = load(process.env.TT_FILE || 'tt.compiled.js', { realBelt: true })
  const L = learner(cc, 'zh', { dueIds: V693_IDS.zh }), tg = L.vocab.filter(w => V693_IDS.zh.includes(w.id))
  const unk = s => cc.validateClosedWorldCandidate('zh', s, L.vocab, tg).unknown
  T('P5', 'a taught sequence is not rejected because a longer untaught bank word starts inside it: 今天不可以，明天吧。 has no unknown word (不 + 可以 taught, 不可 not)', unk('今天不可以，明天吧。').length === 0, unk('今天不可以，明天吧。'))
  T('P6', 'closed vocabulary is not weakened: a clause with a really untaught word still reports it (我想吃苹果。 → 苹果)', JSON.stringify(unk('我想吃苹果。')) === '["苹果"]', unk('我想吃苹果。'))
}
console.log(fails ? 'FAILED ' + fails + '/' + n : 'ALL PASS ' + n + '/' + n); process.exit(fails ? 1 : 0)
