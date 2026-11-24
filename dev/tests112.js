// 24 Nov — Japanese GRAMMAR AS ENTRIES OF ITS OWN, chosen AFTER the 90 target sentences are written, from what those sentences already contain.
// Read from the owner's 17 Nov Daily Track export (99 lines) that printed only two grammar items (は, か) although its sentences use about thirty.
// Real application functions throughout (the curriculum, the detector, the picker, the finaliser, the export, the screens); the only thing scripted is the model transport,
// and only in the one test (C12) that runs the real finaliser. The 99 Japanese lines are in fixtures/ja-grammar-lines-2026-11-17.json (pair number, line, and whether it is a target pair).
//   A  ONE CURRICULUM   the three lists merged: 101 entries + 19 basics, ordered, no entry before its prerequisites, the old 35 / 10 untouched, migration and progress keys unchanged
//   node tests112.js            (current build: tt.compiled.js, or TT_FILE)
'use strict'
const fs = require('fs')
const crypto = require('crypto')
const { load } = require('./harness')
const React = require('react'), TR = require('react-test-renderer')
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const out = []; let fails = 0, n = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + String(id).padEnd(4) + ' ' + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 900) : '')) }
const FILE = process.env.TT_FILE || 'tt.compiled.js'
const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex').slice(0, 16)
const FIXJ = JSON.parse(fs.readFileSync(__dirname + '/fixtures/ja-grammar-lines-2026-11-17.json', 'utf8')).lines
const textOf = x => x == null ? '' : typeof x === 'string' ? x : Array.isArray(x) ? x.map(textOf).join(' ') : textOf(x.children)
const flush = async (k = 20) => { for (let i = 0; i < k; i++) await new Promise(r => setImmediate(r)) }
const fresh = () => { const c = load(FILE, { realBelt: true, React }); c.console.info = () => {}; c.console.warn = () => {}; c.console.error = () => {}; return c }
// a learner with `known` words known (the measure the grammar unlock always used: known + learning)
const learner = (c, known) => c.initJapaneseVocab().map((w, i) => i < known ? { ...w, status: 'known' } : w)
// the track of the export: 99 pairs, 90 of them target pairs (framing and bridge lines carry no target)
const pairsOf = () => FIXJ.map(l => ({ speaker: l.n % 2 ? 'A' : 'B', japanese: l.ja, thai: l.ja, reading: '', romaji: '', english: '', prompt: '',
  ...(l.kind === 'target' ? { targetId: 1000 + l.n, wordId: 1000 + l.n, isTargetPair: true, _target: 'x', recallIndex: 1 } : l.kind === 'bridge' ? { pairType: 'bridge', isTargetPair: false } : { _framing: true, pairType: 'framing', isTargetPair: false, _target: 'greeting' }) }))
const trackOf = () => ({ language: 'ja', date: '2026-11-17', createdAt: '2026-11-17T09:04:11.270Z', mode: 'daily', speechStyle: 'natural', pairs: pairsOf(),
  keywords: Array.from({ length: 30 }, (_, i) => ({ japanese: 'w' + i, wordId: 1000 + i, rating: null })), selectedTargetIds: Array.from({ length: 30 }, (_, i) => 1000 + i),
  buildingBlocks: [{ form: 'は', romaji: 'wa', meaning: 'topic marker' }, { form: 'か', romaji: 'ka', meaning: 'question marker' }] })
const idsOf = (c, s) => c.jaGrammarDetect(s).ids
const setEq = (a, b) => { const x = new Set(a), y = new Set(b); return x.size === y.size && [...x].every(v => y.has(v)) }
const TODAY = '2026-11-24'

// the per-line result of the detector for the 99 lines (ids sorted, then " | " and the reaction words / basics) — checked by hand for the tricky lines (B2), kept here so any later change is seen
const GOLD = {
  1:" | konnichiwa", 2:"o-go plain-present | un", 3:"ni plain-present",
  4:"tai", 5:"nai no-question | e", 6:"plain-present | jaa",
  7:"ga plain-present wa yo | un", 8:"ka kara ni volitional | iine", 9:"plain-present",
  10:"kara plain-present wa yo | un", 11:"ne plain-present | iine", 12:"",
  13:"ne wa yo", 14:"deshita no", 15:"deshita kara ne",
  16:"de plain-present yo | eeto", 17:"ne plain-present", 18:"",
  19:"no | iine", 20:"no", 21:"wa yo | un",
  22:"te teru yo", 23:"plain-present", 24:"de ka ni volitional",
  25:"plain-present wa wo yo", 26:"plain-present | nee", 27:"te temoii",
  28:"ni plain-present | nee", 29:"kara ni plain-present to wa", 30:"ne ni plain-present wa yo",
  31:"wa | nee", 32:"da ka plain-present yo", 33:"ga ka past yo",
  34:"da ga yo", 35:"da ga o-go yo", 36:"da no o-go yo",
  37:"ni plain-present", 38:"ga o-go", 39:"",
  40:"nai nai-invite", 41:"o-go past wa", 42:"janai nda o-go wa",
  43:"past", 44:"nai past past-nai yo", 45:"plain-present | jaa sokka",
  46:"ne plain-present wo", 47:"te wa yo | e", 48:"past plain-present wo yo | jaa",
  49:"deshita wa", 50:"da demo janakatta wa yo", 51:"nda ne wa | sokka",
  52:"yo | hora", 53:"ni te | e", 54:"desho",
  55:"wa", 56:"o-go wa yo", 57:"mo nominal-no o-go plain-present wa yo",
  58:"ka kedo nai ne no nominal-no plain-present wa", 59:"ni plain-present", 60:"ga no",
  61:"ne", 62:"ni wa", 63:"ni wa yo | un",
  64:"demo ga plain-present to-cond yo", 65:"plain-present", 66:"ni plain-present yo | un",
  67:"mo o-go plain-present | iine", 68:"ga no no-question o-go tai", 69:"datte nda ni tai",
  70:"ga ne past tara te | jaa", 71:"ga no plain-present yo", 72:"ni plain-present | jaa",
  73:"ka masu", 74:"ni plain-present", 75:"ni no plain-present | nee",
  76:"desu ga ka kedo nda plain-present", 77:"wa | nee", 78:"da wa yo | un",
  79:"da ne wa | aa jaa", 80:"ne tte | nee", 81:"da toomou yo",
  82:"wa | e", 83:"da ne | hee", 84:"da desho yo",
  85:"", 86:"da ni wa yo | un", 87:"da ne | hee",
  88:"da toomou yo", 89:"ni", 90:"wa | un",
  91:"past", 92:"no plain-present", 93:"",
  94:"plain-present | nee", 95:"ne plain-present", 96:"tai",
  97:"tai | un", 98:" | jaa matane", 99:" | matane",
}
// one sentence each for every entry the detector reads: [sentence, ids that must be found, ids that must NOT be found]
const CASES = [
  ["昨日は学校に行きませんでした。", ["masen", "masu", "ni"], ["deshita", "masenka"]], ["肉は食べません。", ["masen", "wa"], ["nai"]],
  ["一緒に行きましょう。", ["mashou", "masu", "ni"], ["volitional", "masen"]], ["コーヒーを飲みませんか。", ["masenka", "wo"], ["ka"]],
  ["明日は行かないで。", ["naide", "nai", "wa"], ["de", "nai-invite"]], ["今日は大丈夫。行かなくてもいいよ。", ["nakutemoii", "yo"], ["temoii", "nai-invite"]],
  ["ここで食べてはいけません。", ["tewaikenai", "de"], []], ["ちょっと待ってください。", ["tekudasai", "te"], ["tte"]],
  ["友達に教えてもらった。", ["temorau", "ni"], ["past"]], ["水を買ってあげる。", ["teageru", "wo"], ["tte"]], ["食べてみる。", ["temiru"], ["teru"]],
  ["全部食べちゃった。", ["chau"], ["past"]], ["この店は高すぎる。", ["sugiru", "wa"], ["nai"]], ["この本は読みやすい。", ["yasui"], ["masu"]],
  ["この車は乗りにくい。", ["nikui"], ["ni"]], ["歩きながら話す。", ["nagara"], ["ka"]], ["見たり食べたりする。", ["tari"], ["past"]],
  ["行けば分かるよ。", ["ba", "yo"], ["potential", "ka", "kara"]], ["家に帰ると寝る。", ["to-cond", "ni"], ["to"]], ["行くなら言ってね。", ["nara", "te", "ne"], ["ka"]],
  ["高くても買う。", ["temo", "te"], ["demo"]], ["食べるために行く。", ["tameni"], ["ni"]], ["明日行くつもり。", ["tsumori"], ["no"]],
  ["時々行くことがある。", ["koto-ga-aru"], ["ga", "takotoaru"]], ["日本語を話すことができる。", ["koto-ga-dekiru", "wo"], ["ga"]],
  ["日本に行ったことがある。", ["takotoaru", "ni"], ["past", "ga", "koto-ga-aru"]], ["日本語が話せる。", ["potential", "ga"], ["te", "teru"]],
  ["食べられる？", ["potential"], ["teru"]], ["行ける？", ["potential"], ["teru"]], ["待ってる。", ["teru", "te"], ["potential"]],
  ["早く寝るようにする。", ["youni-suru"], ["ni"]], ["元気になる。", ["ninaru"], ["ni", "kunaru"]], ["高くなる。", ["kunaru"], ["ninaru", "nai"]],
  ["雨なので行かない。", ["node", "nai"], ["de", "no"]], ["行ったのに誰もいない。", ["noni", "past", "mo"], ["ni", "no"]], ["夢みたい。", ["mitai"]],
  ["明日来るらしい。", ["rashii", "plain-present"]], ["このご飯はおいしそう。", ["sou", "wa"]], ["もう来るはずだよ。", ["hazu", "da", "yo"]],
  ["駅まで行く。", ["made"]], ["駅より近い。", ["yori"]], ["これだけ。", ["dake"], ["da"]], ["百円しかない。", ["shika", "nai"], ["shikashi"]],
  ["コーヒーやお茶を飲む。", ["ya", "wo"]], ["コーヒーとか飲む。", ["toka"], ["to", "ka"]], ["一時間ぐらい待つ。", ["gurai"]], ["お茶でも飲む？", ["demo"], ["de"]],
  ["来るかもしれない。", ["kamo"], ["nai", "ka", "mo"]], ["来るかも。", ["kamo"], ["ka", "mo"]], ["いいでしょ？", ["desho"], ["de"]], ["来るだろう。", ["darou"], ["da"]],
  ["いいじゃん。", ["jan"], ["janai"]], ["今日は何曜日だっけ？", ["dakke"], ["da"]], ["あのさ、ちょっといい？", ["sa"], ["no"]], ["いいな。", ["na"]], ["来る？", [], ["na"]],
  ["田中さんは来る。", ["san", "wa"]], ["ゆいちゃん、こんにちは。", ["chan-kun"]], ["ケンくん、来る？", ["chan-kun"]],
  ["だから行かない。", ["dakara", "nai"], ["kara", "da"]], ["それで、どうしたの？", ["sorede"], ["ni"]], ["それに、安い。", ["soreni"], ["ni"]], ["しかし高い。", ["shikashi"], ["shika"]],
  ["だって高いから。", ["datte", "kara"], ["da"]], ["まあ、いいよ。", ["maa", "yo"]], ["でも行く。", ["demo", "plain-present"]],
  ["昨日食べた。", ["past"]], ["食べない。", ["nai"]], ["食べている。", ["teru", "te"]], ["食べてる。", ["teru", "te"]], ["行きたい。", ["tai"], ["ki"]], ["食べよう。", ["volitional"], ["plain-present"]],
  ["食べて。", ["te"], ["teru"]], ["何を食べたい？", ["wo", "tai"], ["ka"]], ["行くのは楽しい。", ["nominal-no", "wa"], ["no"]],
  ["分からない。", ["nai"], ["kara", "ka"]], ["何？", [], ["ka"]], ["大丈夫？", [], ["da"]], ["ありがとう。", [], ["to"]], ["友達と帰る。", ["to", "plain-present"]],
  ["すみません。", [], ["masen", "masu"]], ["いただきます。", [], ["masu"]], ["ごちそうさまでした。", [], ["deshita", "de"]], ["どっち？", [], ["ka"]], ["映画の写真。", ["no"]],
  ["行こう。", ["volitional"], ["plain-present"]], ["そう？", [], ["sou"]], ["そうだね。", [], ["da", "ne"]], ["ここで待つ。", ["de", "plain-present"]], ["学生です。", ["desu"]],
  ["学生ではありません。", ["janai"], ["masen", "wa"]], ["どちらですか。", ["desu", "ka"]], ["これは本じゃなかった。", ["janakatta", "wa"], ["janai"]], ["行かなかった。", ["past-nai"], ["janai"]],
  ["食べています。", ["teru", "masu"]], ["何時に帰るの？", ["ni", "no-question"], ["no"]], ["お金がないんだ。", ["ga", "nda"], ["no"]],
  ["それにしよう。", ["ni", "volitional"], ["soreni"]], ["友達に、食べていいか聞くね。", ["temoii", "te", "ka"]], ["この映画、どう見ても楽しそう。", ["sou", "temo"], ["volitional"]],
  ["大きい会社だから、分かるよ。", ["da", "kara"], ["dakara"]], ["電車で行く？それとも車？", [], ["to", "mo"]],
]

;(async () => {
  // ═══ A — ONE CURRICULUM ══════════════════════════════════════════════════════════════════════════════════════════════
  try {
    const c = fresh(), ev = s => c.ev(s)
    const blocks = ev('JA_BUILDING_BLOCKS'), cur = ev('JA_GRAMMAR_CURRICULUM'), basics = ev('JA_CONVERSATION_BASICS')
    T('A1', 'one list holds every entry: 101 grammar entries (the 35 that were there and 66 added) and 19 conversation basics (the 10 that were there and 9 reaction words) — 120 in all, inside the 100–125 asked for',
      blocks.length === 101 && cur.length === 101 && basics.length === 19 && blocks.length + basics.length === 120 && blocks.filter(b => b.added).length === 66 && basics.filter(b => b.reaction).length === 9, { blocks: blocks.length, cur: cur.length, basics: basics.length })
    const groups = {}; cur.forEach(e => { groups[e.group] = (groups[e.group] || 0) + 1 })
    T('A2', 'by group: particles 17 · is / is not 5 · endings 16 · forms 7 · constructions 46 · connectors 7 · names 3', groups.particle === 17 && groups.copula === 5 && groups.ending === 16 && groups.form === 7 && groups.connector === 7 && groups.name === 3 && groups.construction === 46, groups)
    const chk = c.jaGrammarCurriculumCheck()
    T('A3', 'the merged list is consistent: ids unique, every prerequisite exists and comes first and unlocks no later, levels never go down, every entry has id · label · romaji · meaning · explanation · kind · level · prerequisites · order · cost (1 or 2), every old scaffold id and marker id resolves',
      chk.ok === true && chk.entries === 101, chk.problems)
    T('A4', 'order runs 10, 20, 30 … in teaching order and costs are 1 (light) or 2 (heavy)', cur.every((e, i) => e.order === (i + 1) * 10 && (e.cost === 1 || e.cost === 2)) && cur.filter(e => e.cost === 2).length >= 15, cur.filter(e => e.cost === 2).length)
    T('A5', 'the 35 old blocks are untouched, byte for byte (same ids, labels, levels, orders, prerequisites)', ev('JA_BUILDING_BLOCKS_LEGACY').length === 35 && sha(JSON.stringify(ev('JA_BUILDING_BLOCKS_LEGACY'))) === 'a51055370951ea8e', sha(JSON.stringify(ev('JA_BUILDING_BLOCKS_LEGACY'))))
    T('A6', 'the 10 old conversation basics are untouched, and the reaction words (えっ ええと あの ねえ へえ ほら ああ やった よかった) are in JA_CONVERSATION_BASICS, not among the blocks',
      ev('JA_CONVERSATION_BASICS_LEGACY').length === 10 && sha(JSON.stringify(ev('JA_CONVERSATION_BASICS_LEGACY'))) === 'd0ea4d2089e2d6c2' &&
      ['e', 'eeto', 'ano', 'nee', 'hee', 'hora', 'aa', 'yatta', 'yokatta'].every(id => basics.some(b => b.id === id && b.reaction)) && !blocks.some(b => ['e', 'eeto', 'ano', 'nee', 'hee', 'hora', 'aa', 'yatta', 'yokatta'].includes(b.id)))
    const WANT = 'ga he made yori dake shika ya toka gurai demo kamo darou desho jan dakke sa na noni node mitai rashii sou hazu da desu janai janakatta deshita masen mashou masenka naide nakutemoii tewaikenai tekudasai temorau teageru temiru chau sugiru yasui nikui nagara tari ba to-cond nara temo tameni tsumori koto-ga-aru koto-ga-dekiru potential youni-suru ninaru kunaru dakara sorede soreni shikashi datte maa san chan-kun o-go'.split(' ')
    T('A7', 'every item asked for is an entry of its own (particles, endings, is / is not, forms, connectors, names)', WANT.every(id => cur.some(e => e.id === id)), WANT.filter(id => !cur.some(e => e.id === id)))
    T('A8', 'the generation side is unchanged: the prompt, jaBlockById and jaBasicById see only the old 35 blocks and 10 basics; the new ids resolve only for the code that runs after the sentences are written',
      ev('jaBlockById')('ga') === null && ev('jaBlockById')('wo') !== null && ev('jaBasicById')('nee') === null && ev('jaBasicById')('un') !== null && ev('jaGrammarEntryById')('ga').label === 'が' && ev('jaGrammarBasicById')('nee').form === 'ねえ')
    const v40 = learner(c, 40), v120 = learner(c, 120)
    const GOLD_AVAIL = ['wa', 'wo', 'ni', 'de', 'to', 'no', 'ka', 'ne', 'yo', 'plain-present']
    T('A9', 'jaBlocksAvailable and jaBasicsAvailable give exactly what they gave before (the closed list of 10 blocks with an empty store; the same 10 basics)',
      JSON.stringify(c.jaBlocksAvailable(v40, {}).map(b => b.id)) === JSON.stringify(GOLD_AVAIL) && JSON.stringify(c.jaBlocksAvailable(v120, {}).map(b => b.id)) === JSON.stringify(GOLD_AVAIL) &&
      JSON.stringify(c.jaBasicsAvailable(learner(c, 60)).map(b => b.id)) === JSON.stringify(['konnichiwa', 'un', 'matane', 'jaa', 'soudane', 'iine', 'honto', 'sokka', 'naruhodo', 'doushiyou']))
    const SC = ['wa,ka,ne,yo,da,ni,no,wo,mo,to,masu', 'wa,ka,ne,yo,da,ni,no,wo,mo,to,de,ga,kara,masu,nai,past,te', 'wa,ka,ne,yo,da,ni,no,wo,mo,to,de,ga,kara,made,he,masu,nai,past,te,teiru,tai,kedo,tara', 'wa,ka,ne,yo,da,ni,no,wo,mo,to,de,ga,kara,made,he,masu,nai,past,te,teiru,tai,kedo,tara']
    const sc = [30, 60, 100, 200].map(k => c.japaneseScaffoldFor(c.initJapaneseVocab().map((w, i) => i < k ? { ...w, status: 'known', introducedAt: '2026-01-01', repCount: 3 } : w)).map(g => g.id).join(','))
    T('A10', 'the closed-vocabulary scaffold (what a sentence may CONTAIN) is exactly as before at 30 / 60 / 100 / 200 words: the new entries never reach it', JSON.stringify(sc) === JSON.stringify(SC), sc)
    // migration: same seeds, and a record the learner already has is never overwritten
    const c2 = fresh(); await c2.stSet('tt-ja-grammar-srs', { 'buildingBlock:wo': { ...c2.jaNewProgressRecord('buildingBlock', 'wo'), status: 'known', interval: 30, introducedAt: '2026-08-01', dueDate: '2026-12-01', exposures: 9 } })
    const mig = await c2.jaGrammarMigrateV1(learner(c2, 100)), keys = Object.keys(mig.store).sort()
    const MIG = ['buildingBlock:ka', 'buildingBlock:kedo', 'buildingBlock:masu', 'buildingBlock:mo', 'buildingBlock:nai', 'buildingBlock:ne', 'buildingBlock:ni', 'buildingBlock:no', 'buildingBlock:past', 'buildingBlock:tai', 'buildingBlock:tara', 'buildingBlock:te', 'buildingBlock:wa', 'buildingBlock:wo', 'buildingBlock:yo', 'conversationBasic:jaa', 'conversationBasic:konnichiwa', 'conversationBasic:matane', 'conversationBasic:un']
    T('A11', 'jaGrammarMigrateV1 still works and seeds the same records (keys buildingBlock:<id> / conversationBasic:<id>); a record the learner already had (known, interval 30, 9 exposures) is not overwritten',
      JSON.stringify(keys) === JSON.stringify(MIG) && mig.store['buildingBlock:wo'].interval === 30 && mig.store['buildingBlock:wo'].exposures === 9 && mig.store['buildingBlock:wo'].status === 'known', keys)
  } catch (e) { T('A!', 'section A stopped: ' + String(e && e.message).split('\n')[0], false, String(e && e.stack).slice(0, 400)) }

  out.forEach(l => console.log(l))
  console.log('\n' + (n - fails) + '/' + n + ' passed' + (fails ? ' · ' + fails + ' FAILED' : ' — ALL PASS'))
  process.exit(fails ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
