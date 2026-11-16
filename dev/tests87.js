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
// ── two bugs found in the owner's 15 Nov Japanese track export ──
{
  const cue = c.ev('cueFromEnglish'), au = c.ev('auditJapaneseReading')
  const ctx = { addr: 'm', names: ['Kenji'] }
  T('C1', 'a thanks followed by a sentence of its own becomes two instructions ("Thank him, and suggest we eat."), never "Thank him let\'s eat."', cue('ja', "Thanks, let's eat.", 'x', ctx) === 'Thank him, and suggest we eat.' && cue('ja', "Thanks, let's eat together again sometime.", 'x', ctx) === 'Thank him, and suggest we eat together again sometime.', [cue('ja', "Thanks, let's eat.", 'x', ctx)])
  T('C2', 'the plain thanks cues are unchanged (Thank him a lot. / Thank him so much. / Thank him for the food. / Thank Kenji.)', ["Thanks a lot.", 'Thank you so much.', 'Thanks for the food.', 'Thanks, Kenji.'].map(e => cue('ja', e, 'x', ctx)).join('|') === 'Thank him a lot.|Thank him so much.|Thank him for the food.|Thank Kenji.')
  const pr = au({ japanese: 'うん。すみませんって言って、トイレを聞くね。', reading: 'うん。すみませんっていって、トイレをきくね。', romaji: 'un. sumimasen tte itte, toire o kiku ne.', segments: [] })
  T('C3', 'the pronunciation audit accepts "toire o kiku ne" (を as o) when the segments cannot be matched to the reading — the line that made a whole 90/90 track NOT_READY', pr.ok, pr.problems)
  const pw = au({ japanese: 'うん。すみませんって言って、トイレを聞くね。', reading: 'うん。すみませんっていって、トイレをきくね。', romaji: 'un. sumimasen tte itte, toire to kiku ne.', segments: [] })
  T('C4', 'a really wrong romaji is still reported', !pw.ok)
}
{
  const f = c.ev('cueAddresseeForm'), ctx = { nameOf: { A: 'Kenji', B: 'Mio' }, genders: { A: 'm', B: 'f' } }
  T('C5', 'Japanese / Mandarin cues call the other person him / her (as the Thai ones do), never by name: Ask Mio … → Ask her …, Ask Kenji … → Ask him …, Tell Mio … → Tell her …',
    f('Ask Mio what time the bus comes.', { speaker: 'A' }, ctx) === 'Ask her what time the bus comes.' && f('Ask Kenji who is coming by train.', { speaker: 'B' }, ctx) === 'Ask him who is coming by train.' && f('Tell Mio you are going by bus.', { speaker: 'A' }, ctx) === 'Tell her you are going by bus.')
  T('C6', '"they / them" for the other person becomes she / her (he / him) with the verb agreeing: Ask whether they already ate lunch, say they haven\'t yet → Ask whether she already ate lunch, say she hasn\'t yet',
    f("Ask whether they already ate lunch, say they haven't yet, and suggest eating together.", { speaker: 'A' }, ctx) === "Ask whether she already ate lunch, say she hasn't yet, and suggest eating together." && f('Ask if they say itadakimasu.', { speaker: 'B' }, ctx) === 'Ask if he says itadakimasu.' && f('Ask them what they like.', { speaker: 'A' }, ctx) === 'Ask her what she likes.')
  T('C7', 'a cue that is already him / her, or that names a group (their friends), is left exactly as it is', f('Ask her if the room is big.', { speaker: 'A' }, ctx) === 'Ask her if the room is big.' && f('Ask if their friends are coming.', { speaker: 'A' }, ctx) === 'Ask if their friends are coming.' && f('Say you will go.', { speaker: 'B' }, ctx) === 'Say you will go.')
  T('C8', 'the scene\'s genders win when the scene states them (a woman speaking to a woman: Ask her …)', f('Ask Mio what she likes.', { speaker: 'B' }, { nameOf: { A: 'Rie', B: 'Mio' }, genders: { A: 'f', B: 'f' } }) === 'Ask Mio what she likes.' && f('Ask Rie what she likes.', { speaker: 'B' }, { nameOf: { A: 'Rie', B: 'Mio' }, genders: { A: 'f', B: 'f' } }) === 'Ask her what she likes.')
}
{
  const pr = c.ev('jaPragmaticProblems'), bad = jp => pr(jp, { japanese: 'いいえ' }).some(x => /^SELF_ANSWER/.test(x))
  T('D1', 'a line that asks a question and answers it itself is refused (the lines of pairs 16, 21 and 57 of the owner\'s 15 Nov export)', ['昼、もう食べた？いいえ、まだだよ。一緒に食べよう。', '今日、大丈夫？いいえ、まだ分からない。', 'そうなの？うん、そう。'].every(bad))
  T('D2', 'a reply that opens with the answer, a question that follows an answer, and two questions in a row are all fine', ['いいえ、車で来たよ。', 'うん、いいよ。どこ行く？', 'えっ、行かないの？なんで？', 'はい、じゃあ一緒に食べよう。'].every(x => !bad(x)))
}
{
  // from the owner's 16 Nov export
  const f = c.ev('cueAddresseeForm'), ctx = { nameOf: { A: 'Ryo', B: 'Mika' }, genders: { A: 'm', B: 'f' } }, au = c.ev('auditJapaneseReading')
  T('E1', '"they have a car" becomes "she has a car", never "she\'s a car" (a regression of the first him / her pass: "Ask if she\'s a car today.")', f('Ask if they have a car today.', { speaker: 'A' }, ctx) === 'Ask if she has a car today.' && f('Ask whether they have finished.', { speaker: 'A' }, ctx) === 'Ask whether she has finished.' && f("Say they've been busy.", { speaker: 'B' }, ctx) === "Say he's been busy.")
  const wa = au({ japanese: 'バスで行くのはどう？', reading: 'バスでいくのはどう？', romaji: 'basu de iku no wa dou?', segments: [] })
  T('E2', 'the pronunciation audit accepts は as the particle wa when the segments cannot be matched ("basu de iku no wa dou?") — the line that made the 16 Nov track NOT_READY — and still accepts ha; a wrong syllable is still reported',
    wa.ok && au({ japanese: 'x', reading: 'バスでいくのはどう？', romaji: 'basu de iku no ha dou?', segments: [] }).ok && !au({ japanese: 'x', reading: 'バスでいくのはどう？', romaji: 'basu de iku no ka dou?', segments: [] }).ok, wa)
  T('E3', 'へ as the particle (e) and を (o) are accepted together in one sentence', au({ japanese: 'x', reading: 'がっこうへほんをもっていく。', romaji: 'gakkou e hon o motte iku.', segments: [] }).ok)
}
console.log((fails ? 'FAIL ' : 'ALL PASS ') + (n - fails) + '/' + n)
process.exit(fails ? 1 : 0)
