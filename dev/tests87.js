// 15 Nov — Japanese register: the meal blessing いただきます (and the other fixed polite expressions) are not "keigo" in a casual / natural track.
// Found in the owner's 15 Nov Japanese log: 3 of 3 recalls of いただきます were refused "register: keigo in a Natural sentence" on every attempt (11 paid checks) and the track
// ended 87/90. Real application function; no model.
const { load } = require('./harness')
const c = load(process.env.TT_FILE || 'tt.compiled.js'); c.console.info = () => {}; c.console.warn = () => {}
let n = 0, fails = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; console.log((pass ? 'PASS ' : 'FAIL ') + id + '  ' + name + (!pass && detail !== undefined ? '\n      ' + JSON.stringify(detail) : '')) }
const fit = (jp, reg) => c.ev('jaValidateRegisterFit')({ japanese: jp }, reg, { allContent: [] }, {})
const regs = ['casual', 'natural']
for (const r of regs) {
  for (const jp of ['いただきます。', 'うん、いただきます。', 'いただきますって言ってから食べよう。', 'ご飯来た、いただきます。', 'ごちそうさま。', 'ごちそうさまでした。', 'ありがとうございます。'])
    T('R1-' + r, r + ': the fixed expression passes the register check — ' + jp, fit(jp, r).ok, fit(jp, r).problems)
  for (const jp of ['これ、いただけます？', '社長がおっしゃいました。', 'そちらにございます。', 'お客様、いただきます、でございます。'])
    T('R2-' + r, r + ': other keigo is still refused — ' + jp, !fit(jp, r).ok && fit(jp, r).problems.some(p => /keigo/.test(p)), fit(jp, r).problems)
}
// ── every entry of the real bank, as the word being taught ──
// A scan of the 3,085 Japanese entries (15 Nov, after the いただきます log) found 24 that were refused on their own headword: the phrases お邪魔します お願いします 失礼します
// お世話になっております よろしくお願いします いってきます, the keigo words おっしゃる 申し上げる, 申し込む (wrongly read as 申し…), and the verbs 覚ます 励ます 冷ます (ます inside the dictionary form).
{
  const V = c.initJapaneseVocab(), bad = []
  for (const w of V) for (const r of regs) { const f = c.ev('jaValidateRegisterFit')({ japanese: w.japanese + '。' }, r, { allContent: [w] }, {}); if (!f.ok) bad.push([w.id, w.japanese, r, f.problems[0]]) }
  T('B1', 'every one of the ' + V.length + ' bank entries passes the register check in casual and natural when it is the word being taught', bad.length === 0, bad.slice(0, 6))
  const fitT = (jp, taught, r) => c.ev('jaValidateRegisterFit')({ japanese: jp }, r || 'natural', { allContent: taught.map(japanese => ({ japanese })) }, {}).ok
  T('B2', 'a taught fixed expression is accepted inside a sentence (お願いします、先生。 よろしくお願いします。 先生がおっしゃった。 目を覚ます。)', fitT('お願いします、先生。', ['お願いします']) && fitT('よろしくお願いします。', ['よろしくお願いします']) && fitT('先生がおっしゃった。', ['おっしゃる']) && fitT('目を覚ます。', ['覚ます']))
  T('B3', 'the same sentences are still refused when the learner has NOT been taught the word, and any OTHER polite or keigo word is still refused', !fitT('お願いします。', []) && !fitT('先生がおっしゃった。', []) && !fitT('目を覚ます。', []) && !fitT('駅まで行きます。', ['お願いします']) && !fitT('明日会議に参ります。', ['お願いします']) && !fitT('これ、いただけます？', ['いただきます']))
  T('B4', '申し込む (apply) is not read as keigo, but 申し上げる and 申します are', fitT('学校に申し込む。', ['申し込む']) && !fitT('お礼を申し上げます。', []) && !fitT('私は田中と申します。', []))
}
console.log((fails ? 'FAIL ' : 'ALL PASS ') + (n - fails) + '/' + n)
process.exit(fails ? 1 : 0)
