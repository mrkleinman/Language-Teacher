// 24 Nov — Japanese GRAMMAR AS ENTRIES OF ITS OWN, chosen AFTER the 90 target sentences are written, from what those sentences already contain.
// Read from the owner's 17 Nov Daily Track export (99 lines) that printed only two grammar items (は, か) although its sentences use about thirty.
// Real application functions throughout (the curriculum, the detector, the picker, the finaliser, the export, the screens); the only thing scripted is the model transport,
// and only in the one test (C12) that runs the real finaliser. The 99 Japanese lines are in fixtures/ja-grammar-lines-2026-11-17.json (pair number, line, and whether it is a target pair).
//   A  ONE CURRICULUM   the three lists merged: 101 entries + 19 basics, ordered, no entry before its prerequisites, the old 35 / 10 untouched, migration and progress keys unchanged
//   B  THE DETECTOR     reads sentences: masks content words first, conjugation-aware, longest match first, one hit per entry per sentence with its position; the 99 lines; the hard cases
//   C  THE PICKER       NEW (unlocked, not introduced, used at least twice, 5 points) / REVIEW (2) / SEEN IN PASSING / NOT YET UNLOCKED; never touches target words, slots, pairs or the closed-vocabulary check; the switch
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

  // ═══ B — THE DETECTOR ════════════════════════════════════════════════════════════════════════════════════════════════
  try {
    const c = fresh()
    const det = s => c.jaGrammarDetect(s)
    const gotLine = l => { const r = det(l.ja); return r.ids.slice().sort().join(' ') + (r.basics.length ? ' | ' + r.basics.map(b => b.id).sort().join(' ') : '') }
    const wrong = FIXJ.filter(l => gotLine(l) !== GOLD[l.n]).map(l => l.n + ' ' + l.ja + ' → ' + gotLine(l) + '  (expected ' + GOLD[l.n] + ')')
    T('B1', 'all 99 lines of the export are read as recorded (every entry and reaction word per line)', wrong.length === 0 && FIXJ.length === 99, wrong.slice(0, 4))
    // the 12 trickiest lines, set by hand BEFORE the detector was run on them
    const HAND = {
      5: ['nai', 'no-question'], 22: ['te', 'teru', 'yo'], 27: ['te', 'temoii'], 40: ['nai', 'nai-invite'], 42: ['o-go', 'wa', 'janai', 'nda'],
      44: ['past-nai', 'past', 'nai', 'yo'], 58: ['no', 'ka', 'nai', 'kedo', 'plain-present', 'nominal-no', 'wa', 'ne'], 64: ['demo', 'ga', 'plain-present', 'to-cond', 'yo'],
      69: ['datte', 'ni', 'tai', 'nda'], 73: ['masu', 'ka'], 76: ['ga', 'plain-present', 'nda', 'desu', 'kedo', 'ka'], 81: ['da', 'toomou', 'yo'],
    }
    const hw = Object.entries(HAND).filter(([k, ids]) => !setEq(idsOf(c, FIXJ[+k - 1].ja), ids)).map(([k, ids]) => k + ': ' + idsOf(c, FIXJ[+k - 1].ja).join(' ') + ' ≠ ' + ids.join(' '))
    T('B2', 'the 12 trickiest lines (5 来ないの？ · 22 食べてない · 27 飲んでもいい · 40 飲まない？ · 42 好きじゃないんだ · 44 行かなかった · 58 どっちの店か分からないけど · 64 分かると · 69 分かりたいの · 73 いますか · 76 あるんですけど · 81 だと思う) come out as checked by hand', hw.length === 0, hw)
    const A = s => det(s).ids
    T('B3', 'content words are masked first: 分からない does not contain から, 何 does not contain か, 大丈夫 does not contain だ, ありがとう does not contain と, どっち does not contain か',
      !A('分からない。').includes('kara') && !A('分からない。').includes('ka') && A('分からない。').includes('nai') && !A('何？').includes('ka') && !A('大丈夫？').includes('da') && !A('ありがとう。').includes('to') && !A('どっち？').includes('ka'), A('分からない。'))
    T('B4', 'conjugation-aware: 来たくない is 〜たい (negative), 行ったら is 〜たら (not 〜た), 好きじゃないんだ is じゃない and 〜んだ, どっちの店か分からないけど is の, か, けど (and not から)',
      setEq(A('来たくない。'), ['tai']) && A('行ったら言ってね。').includes('tara') && !A('行ったら言ってね。').includes('past') && setEq(A('好きじゃないんだ。'), ['janai', 'nda']) &&
      ['no', 'ka', 'kedo'].every(id => A('どっちの店か分からないけど。').includes(id)) && !A('どっちの店か分からないけど。').includes('kara'), { a: A('来たくない。'), b: A('行ったら言ってね。'), c: A('好きじゃないんだ。'), d: A('どっちの店か分からないけど。') })
    const badCases = CASES.map(([s, must, not]) => { const g = new Set(A(s)); const miss = (must || []).filter(x => !g.has(x)), extra = (not || []).filter(x => g.has(x)); return miss.length || extra.length ? s + ' → ' + [...g].join(' ') + (miss.length ? ' | missing ' + miss.join(' ') : '') + (extra.length ? ' | unexpected ' + extra.join(' ') : '') : null }).filter(Boolean)
    T('B5', 'each entry is read from its own sentence (' + CASES.length + ' sentences: the polite forms, constructions, endings, copula, connectors, names) and not from look-alikes', badCases.length === 0, badCases.slice(0, 5))
    const wholly = FIXJ.every(l => { const r = det(l.ja); const ids = r.hits.map(h => h.id); return new Set(ids).size === ids.length && r.hits.every(h => h.n >= 1 && Number.isInteger(h.at) && h.at >= 0 && h.at < Math.max(1, l.ja.length)) })
    T('B6', 'longest match first and one hit per entry per sentence: every entry appears once per sentence with the position of its first use and a count (たくさん in one line is n = 2, not two hits)',
      wholly && det('お茶の店の場所が分かりたいの？').hits.find(h => h.id === 'no').n === 2 && det('お茶の店の場所が分かりたいの？').hits.filter(h => h.id === 'no').length === 1)
    const pos = det('ここで食べようか。'), p = pos.hits.find(h => h.id === 'volitional')
    T('B7', 'positions are real positions in the sentence (ようか: the 〜よう of 食べよう starts at its own letters)', p && 'ここで食べようか。'.slice(p.at, p.at + p.text.length) === p.text && p.text === 'よう', pos.hits)
    T('B8', 'reaction words are read as basics, not as grammar: ええと ねえ えっ へえ ほら ああ やった よかった あの; いいね is the chunk, not ね; またね is the chunk, not ね',
      det('ええと、すみません。').basics.some(b => b.id === 'eeto') && det('ねえ、何飲む？').basics.some(b => b.id === 'nee') && det('えっ、本当？').basics.some(b => b.id === 'e') && det('へえ、いいね。').basics.some(b => b.id === 'hee') && det('ほら、見て。').basics.some(b => b.id === 'hora') &&
      det('ああ、そうか。').basics.some(b => b.id === 'aa') && det('やった！').basics.some(b => b.id === 'yatta') && det('よかった。').basics.some(b => b.id === 'yokatta') && det('あのさ、いい？').basics.some(b => b.id === 'ano') &&
      !A('いいね。').includes('ne') && !A('じゃあ、またね。').includes('ne'))
    T('B9', 'the old japaneseGrammarUsed (the generation gate, 17 forms) is exactly as it was', ['どれか分かる？', '好きじゃないんだ。', 'ここは楽しいから。', '何食べる？'].map(s => c.japaneseGrammarUsed(s, null).join(',')).join('|') === 'ka|nda|kara,wa|')
    const lonely = det('ぺろぺろ。')
    T('B10', 'a line the rules cannot explain is flagged (unsure), and the 99 lines of the export are not', lonely.unsure.length > 0 && FIXJ.every(l => det(l.ja).unsure.length === 0), FIXJ.filter(l => det(l.ja).unsure.length).map(l => l.n))
    const t0 = Date.now(); FIXJ.forEach(l => det(l.ja)); T('B11', 'the whole export (99 lines) is read in well under a second', Date.now() - t0 < 1500, Date.now() - t0)
  } catch (e) { T('B!', 'section B stopped: ' + String(e && e.message).split('\n')[0], false, String(e && e.stack).slice(0, 400)) }

  // ═══ C — THE PICKER ══════════════════════════════════════════════════════════════════════════════════════════════════
  try {
    const c = fresh()
    const plan = async (known, mutate, today, pairs) => {
      const cc = fresh(), vocab = learner(cc, known)
      await cc.jaGrammarMigrateV1(vocab)
      const store = await cc.jaGrammarLoad(); if (mutate) mutate(cc, store)
      const an = cc.jaGrammarAnalyseTrack(pairs || pairsOf())
      return { cc, vocab, store, an, plan: cc.jaGrammarPlan(an, { known: cc.jaGrammarKnownCount(vocab), store, today: today || TODAY }) }
    }
    const med = await plan(90), low = await plan(25), high = await plan(200)
    const okPlan = (r, label) => {
      const p = r.plan, cur = r.cc.ev('JA_GRAMMAR_CURRICULUM'), byId = id => cur.find(e => e.id === id)
      const cost = p.new.reduce((a, x) => a + x.cost, 0)
      const problems = []
      if (p.new.length > 5) problems.push('more than 5 new')
      if (cost > 5 || cost !== p.budget.spent) problems.push('cost ' + cost + ' vs budget ' + p.budget.spent)
      p.new.forEach((x, i) => {
        const e = byId(x.id), prevChosen = new Set(p.new.slice(0, i).map(y => y.id))
        if (!(r.cc.jaGrammarKnownCount(r.vocab) >= e.minKnown)) problems.push(x.id + ' is not unlocked')
        if (r.store['buildingBlock:' + x.id] && r.store['buildingBlock:' + x.id].introducedAt) problems.push(x.id + ' was already introduced')
        if (x.pairs.length < 2) problems.push(x.id + ' used fewer than 2 times')
        if (!(e.prereq || []).every(q => (r.store['buildingBlock:' + q] && r.store['buildingBlock:' + q].introducedAt) || prevChosen.has(q))) problems.push(x.id + ' lacks a prerequisite')
        if (i && e.order < byId(p.new[i - 1].id).order) problems.push('not in curriculum order at ' + x.id)
      })
      return { problems, label }
    }
    for (const [id, r, label] of [['C1', med, 'medium (90 words)'], ['C2', low, 'low (25 words)'], ['C3', high, 'high (200 words)']]) {
      const k = okPlan(r, label)
      T(id, label + ': at most 5 NEW points (light 1, heavy 2), each unlocked for this learner, not introduced yet, used in at least 2 target sentences, prerequisites met, in curriculum order', k.problems.length === 0 && r.plan.new.length > 0, { problems: k.problems, new: r.plan.new.map(x => x.id) })
    }
    T('C4', 'the picker answers differently at different levels (the same 90 sentences teach different points at 25, 90 and 200 words) and lists what is not unlocked',
      JSON.stringify(low.plan.new.map(x => x.id)) !== JSON.stringify(high.plan.new.map(x => x.id)) && low.plan.locked.length > med.plan.locked.length && med.plan.locked.length >= high.plan.locked.length && low.plan.locked.every(x => x.pairs.length > 0 && x.minKnown > 25), { low: low.plan.locked.length, med: med.plan.locked.length, high: high.plan.locked.length })
    T('C5', 'an item used once is "seen in passing" and is NOT introduced: です (once) is in the list with its reason, and after the plan is applied its record has no introducedAt',
      med.plan.passing.some(x => x.id === 'desu' && x.why === 'used once') && (() => { const s = JSON.parse(JSON.stringify(med.store)); med.cc.jaGrammarApplyPlan(s, med.plan, TODAY); return s['buildingBlock:desu'] && !s['buildingBlock:desu'].introducedAt && s['buildingBlock:desu'].seenInPassing === 1 })())
    // exposure and review
    const withDue = await plan(90, (cc, st) => {
      ;['wa', 'ne', 'yo'].forEach((id, i) => { const r = cc.jaGrammarGet(st, 'buildingBlock', id); st['buildingBlock:' + id] = { ...cc.jaNewProgressRecord('buildingBlock', id), introducedAt: '2026-09-01', status: 'learning', interval: 3, dueDate: ['2026-11-20', '2026-11-22', '2026-11-23'][i], exposures: 4 } })
      st['buildingBlock:ka'] = { ...cc.jaNewProgressRecord('buildingBlock', 'ka'), introducedAt: '2026-09-01', status: 'learning', interval: 3, dueDate: '2027-01-01', exposures: 4 }
    })
    T('C6', 'introduced and used entries count as exposure; up to 2 DUE ones are kept as REVIEW (the most overdue first), the third due one is exposure only',
      withDue.plan.review.length === 2 && withDue.plan.review[0].id === 'wa' && withDue.plan.review[1].id === 'ne' && withDue.plan.alsoUsed.some(x => x.id === 'yo') && withDue.plan.alsoUsed.some(x => x.id === 'ka'), { review: withDue.plan.review.map(x => x.id), also: withDue.plan.alsoUsed.map(x => x.id) })
    const s2 = JSON.parse(JSON.stringify(withDue.store)); const ex0 = s2['buildingBlock:ka'].exposures
    withDue.cc.jaGrammarApplyPlan(s2, withDue.plan, TODAY)
    T('C7', 'applying the plan records the exposures (ka: one per sentence using it), moves a reviewed entry on (wa was due 20 Nov, now later), leaves the not-featured due one (yo) still due, and never touches a rating the learner gave',
      s2['buildingBlock:ka'].exposures === ex0 + withDue.plan.alsoUsed.find(x => x.id === 'ka').pairs.length && s2['buildingBlock:wa'].dueDate > TODAY && s2['buildingBlock:yo'].dueDate === '2026-11-23' && s2['buildingBlock:wa'].interval === 3 && s2['buildingBlock:ka'].dueDate === '2027-01-01',
      { ka: s2['buildingBlock:ka'], wa: s2['buildingBlock:wa'] })
    const overdue = await plan(90, (cc, st) => { for (let i = 0; i < 7; i++) { const id = ['kedo', 'masu', 'mo', 'nai', 'past', 'tai', 'tara'][i]; st['buildingBlock:' + id] = { ...cc.jaNewProgressRecord('buildingBlock', id), introducedAt: '2026-09-01', status: 'learning', dueDate: '2026-11-01', interval: 2, exposures: 1 } } })
    const six = await plan(90, (cc, st) => { for (let i = 0; i < 6; i++) { const id = ['kedo', 'masu', 'mo', 'nai', 'past', 'tai'][i]; st['buildingBlock:' + id] = { ...cc.jaNewProgressRecord('buildingBlock', id), introducedAt: '2026-09-01', status: 'learning', dueDate: '2026-11-01', interval: 2, exposures: 1 } } })
    T('C8', 'no new point while MORE than 6 reviews are overdue (7 overdue ⇒ none added and the candidates wait with the reason; exactly 6 overdue still allows new points)',
      overdue.plan.held === true && overdue.plan.new.length === 0 && overdue.plan.passing.some(x => /held back: 7/.test(x.why || '')) && six.plan.held === false && six.plan.new.length > 0, { overdue: overdue.plan.overdue, held: overdue.plan.held, six: six.plan.overdue })
    // prerequisite chain: a heavy point never jumps its prerequisite
    const mk = lines => lines.map((s, i) => ({ japanese: s, thai: s, targetId: 2000 + i, wordId: 2000 + i, isTargetPair: true, _target: 'x', recallIndex: 1 }))
    const dropTe = (cc, st) => { delete st['buildingBlock:te']; delete st['buildingBlock:nai']; st['buildingBlock:plain-present'] = { ...cc.jaNewProgressRecord('buildingBlock', 'plain-present'), introducedAt: '2026-09-01', status: 'learning', dueDate: '2027-01-01', interval: 9, exposures: 5 } }
    const chain = await plan(200, dropTe, TODAY, mk(['水、飲んでもいい？', '食べてもいい？', 'ここで待ってもいい？']))
    T('C9', 'a point whose prerequisite is not yet introduced waits, and a prerequisite chosen just before it in the same track satisfies it: 〜てもいい (3 sentences) brings て-form with it, because the て-form is inside it',
      chain.plan.new.map(x => x.id).join(' ') === 'te temoii' && chain.plan.budget.spent === 3, chain.plan.new.map(x => x.id + ':' + x.cost))
    const wait = await plan(200, dropTe, TODAY, mk(['行かなくてもいい。', '食べなくてもいい。']))
    T('C9b', 'a heavy point that needs two earlier points (〜なくてもいい needs 〜ない and 〜てもいい) is not chosen while they are missing: it waits with the reason',
      wait.plan.new.map(x => x.id).includes('nai') && !wait.plan.new.some(x => x.id === 'nakutemoii') && wait.plan.passing.some(x => x.id === 'nakutemoii' && /needs/.test(x.why)), { new: wait.plan.new.map(x => x.id), passing: wait.plan.passing.map(x => x.id + ':' + x.why) })
    const heavy = await plan(200, (cc, st) => { ;['wa', 'ka', 'ne', 'yo', 'da', 'plain-present', 'wo', 'ni', 'no', 'de', 'to', 'mo', 'ga', 'demo', 'masu'].forEach(id => { st['buildingBlock:' + id] = { ...cc.jaNewProgressRecord('buildingBlock', id), introducedAt: '2026-09-01', status: 'learning', dueDate: '2027-01-01', interval: 9, exposures: 5 } }) })
    T('C10', 'light entries cost 1, heavy cost 2, and the budget of 5 is never passed (here the heavy 〜た / 〜ない / て-form are next in order)', heavy.plan.new.reduce((a, x) => a + x.cost, 0) <= 5 && heavy.plan.new.some(x => x.cost === 2) && heavy.plan.budget.spent === heavy.plan.new.reduce((a, x) => a + x.cost, 0), { new: heavy.plan.new.map(x => x.id + ':' + x.cost) })
    // ── grammar never counts as a target word, a slot, a pair, or a vocabulary change; closed vocabulary untouched
    {
      const cc = fresh(), vocab = learner(cc, 90); await cc.jaGrammarMigrateV1(vocab)
      const track = trackOf(), before = JSON.stringify(track.pairs), kw0 = JSON.stringify(track.keywords), sel0 = JSON.stringify(track.selectedTargetIds), vocab0 = JSON.stringify(vocab)
      const inv0 = cc.japaneseLearnerInventory(vocab, vocab.slice(0, 30)), line0 = FIXJ.map(l => JSON.stringify(cc.japaneseCheckLine(l.ja, inv0)))
      const res = await cc.jaGrammarFinaliseTrack(track, { vocab, today: TODAY })
      const store = await cc.jaGrammarLoad()
      const inv1 = cc.japaneseLearnerInventory(vocab, vocab.slice(0, 30)), line1 = FIXJ.map(l => JSON.stringify(cc.japaneseCheckLine(l.ja, inv1)))
      T('C11', 'the track gets its grammar (new / review / passing / locked, with pair numbers) and nothing else changes: same 99 pairs (90 target pairs), same sentences, same 30 target words, same slots, the vocabulary list untouched',
        !!res.grammarInTrack && res.grammarInTrack.recorded === true && res.pairs === track.pairs && res.pairs.length === 99 && JSON.stringify(res.pairs) === before && res.pairs.filter(p => cc.jaGrammarIsTargetPair(p)).length === 90 &&
        JSON.stringify(res.keywords) === kw0 && res.keywords.length === 30 && JSON.stringify(res.selectedTargetIds) === sel0 && JSON.stringify(vocab) === vocab0, { has: !!res.grammarInTrack })
      T('C12', 'grammar entries are stored apart from the words: the progress store holds only buildingBlock: / conversationBasic: records, and the vocabulary key is not written',
        Object.keys(store).every(k => /^(buildingBlock|conversationBasic):/.test(k)) && (await cc.stGet('tt-ja-vocab')) == null, Object.keys(store).slice(0, 5))
      T('C13', 'the closed-vocabulary check is not affected: the same words are judged untaught before and after (all 99 lines), and the allowed grammar is the same list',
        JSON.stringify(line0) === JSON.stringify(line1) && JSON.stringify(inv0.grammarScaffold.map(g => g.id)) === JSON.stringify(inv1.grammarScaffold.map(g => g.id)), line1.slice(0, 2))
      const res2 = await cc.jaGrammarFinaliseTrack(res, { vocab, today: TODAY }), store2 = await cc.jaGrammarLoad()
      T('C14', 'a track is never counted twice: finalising it again returns it as it is and the stored exposures do not move', res2 === res && JSON.stringify(store2) === JSON.stringify(store))
      // closed-vocabulary scenario: a sentence the closed vocabulary rejects is rejected the same with the switch off
      const off = fresh(); off.jaGrammarFromSentencesSetEnabled(false)
      const v2 = learner(off, 90); await off.jaGrammarMigrateV1(v2)
      const s0 = JSON.stringify(await off.jaGrammarLoad()), r0 = await off.jaGrammarFinaliseTrack(trackOf(), { vocab: v2, today: TODAY }), s1 = JSON.stringify(await off.jaGrammarLoad())
      T('C15', 'switch OFF (jaGrammarFromSentencesSetEnabled(false)): nothing is chosen, nothing is stored, the track is returned unchanged', !r0.grammarInTrack && s0 === s1 && off.jaGrammarFromSentencesOn() === false)
      const st0 = await off.jaGrammarLoad()
      const legacyFresh = off.jaGrammarPreGenFresh(v2, st0)
      const expected = off.jaBlocksAvailable(v2, st0).filter(b => !off.jaGrammarGet(st0, 'buildingBlock', b.id).introducedAt).sort((a, b) => (a.order || 0) - (b.order || 0)).slice(0, 1)
      T('C16', 'switch OFF: the old path (at most ONE new building block chosen before writing) is exactly what it was; switch ON: nothing is introduced before the sentences exist',
        JSON.stringify(legacyFresh.map(b => b.id)) === JSON.stringify(expected.map(b => b.id)) && legacyFresh.length <= 1 && cc.jaGrammarFromSentencesOn() === true && cc.jaGrammarPreGenFresh(vocab, await cc.jaGrammarLoad()).length === 0, { legacyFresh: legacyFresh.map(b => b.id) })
    }
    // ── through the real finaliser (the model transport scripted, as in the other pipeline suites)
    {
      const { setup, makeTrack, mock } = require('./tests14')
      const run = async on => {
        const S = setup('ja'); S.c.jaGrammarFromSentencesSetEnabled(on); S.c.console.error = () => {}; S.c.console.warn = () => {}
        mock(S, 'ja', {})
        const base = makeTrack(S, 'ja', { tag: on ? '-on' : '-off' }), c = S.c
        const tc = c.jaGeneratorTrackContext(S.targets, null, 'daily', 'natural', 'run-grammar')
        const pairs = base.pairs.map((p, i) => p.targetId != null ? c.stampPairProvenance(p, c.jaPairProvenance(tc, S.targets.find(t => t.id === p.targetId), p.recallIndex || 1, 'generation'))
          : c.stampPairProvenance(p, { language: 'ja', trackId: tc.trackId, generationRunId: tc.generationRunId, isTargetPair: false, kind: i ? 'reply' : 'opening', slot: i, sourceStage: 'scene' }))
        const t0 = c.jaTrackObject(tc, { pairs, scene: null, recallCount: pairs.filter(p => p.targetId != null).length, framingCount: 2 }, S.targets.map(t => ({ ...t, selectionRole: 'review' })), 'natural', 'm', 'daily')
        const logs = []
        const r = await S.c.jazhQcFinaliseAndListen(t0, 'ja', { vocab: S.vocab, apiKey: 'k', model: S.c.ev('GEMINI_DEFAULT_MODEL'), register: 'natural', runId: S.c.aiBeginRun('ja-grammar-' + on), push: m => logs.push(m), onListening: () => {} })
        return { r, logs, S, store: await S.c.jaGrammarLoad() }
      }
      const on = await run(true), off = await run(false)
      const a = on.r.track, b = off.r.track
      T('C17', 'the real finaliser (QC, final audit, then the grammar step): the finished track carries its grammar, the log says so, and the grammar is recorded',
        !!a.grammarInTrack && a.grammarInTrack.recorded === true && on.logs.some(l => /GRAMMAR FROM SENTENCES/.test(l)) && Object.keys(on.store).length > 0, { has: !!a.grammarInTrack, logs: on.logs.filter(l => /GRAMMAR/.test(l)) })
      T('C18', 'the finished track is the same with and without grammar: the same MAIN TRACK readiness line (TARGET PAIRS · TARGET WORDS · every target 3/3), the same invariants and integrity, the same pairs and the same 30 words — grammar adds a section and counts nowhere',
        !b.grammarInTrack && on.S.c.trackReadinessExportLines(a)[0] === off.S.c.trackReadinessExportLines(b)[0] && JSON.stringify(a.integrity && a.integrity.invariants) === JSON.stringify(b.integrity && b.integrity.invariants) &&
        a.pairs.length === b.pairs.length && JSON.stringify(a.keywords) === JSON.stringify(b.keywords) && Object.keys(off.store).length === 0, { on: on.S.c.trackReadinessExportLines(a)[0], off: off.S.c.trackReadinessExportLines(b)[0] })
    }
  } catch (e) { T('C!', 'section C stopped: ' + String(e && e.message).split('\n')[0], false, String(e && e.stack).slice(0, 400)) }

  out.forEach(l => console.log(l))
  console.log('\n' + (n - fails) + '/' + n + ' passed' + (fails ? ' · ' + fails + ' FAILED' : ' — ALL PASS'))
  process.exit(fails ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
