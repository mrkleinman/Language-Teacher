// v694 — CONTROLLED MOCK MODEL OUTPUTS for the per-situation Listening planner, modelled on the three v693 Listening runs of
// 13 Oct (owner logs listening-log-2026-10-13T14-46-45 Thai · T14-54-41 Japanese · T14-57-34 Mandarin; learners:
// benchmark/v692/learners.js V693_IDS). Rows: [situation, speaker, intent, asks, about, text, english].
// GOOD693: plans written ONLY with each learner's authorised words (the app's own validators prove it) for the v694 target
// selection (เพราะ · 話す · 做 are kept by the v694 feasibility review). They test the PIPELINE; they are not evidence of
// what the real model writes.
// JA_V693: the plan Claude Haiku actually returned for the Japanese v693 run (attempt 2, 41 turns), re-filed under the five
// v694 situations — the defective response: なる / 二千 are unauthorised, これ、いくら？ is answered with an opinion, どれ見る
// after choosing food, いいえ answering a statement.
'use strict'
const { GOOD } = require('../v692/plans')
const swap = (rows, text, row) => rows.map(r => r[5] === text ? row : r)
const after = (rows, text, add) => { const i = rows.findIndex(r => r[5] === text); return rows.slice(0, i + 1).concat(add, rows.slice(i + 1)) }
const GOOD693 = {
  // ค่าโดยสาร / ไว้ are no longer targets (เพราะ / ว่า joined); ไว้ stays as a support word, the fare exchange is dropped (turn budget)
  th: (() => {
    let r = after(GOOD.th, 'สนุกค่ะ แต่ฉันรู้สึกแก่แล้วค่ะ', [['S1', 'A', 'ASK', 'REASON', 'you', 'ทำไมครับ', 'Why?'], ['S1', 'B', 'ANSWER', '', 'I', 'เพราะเดินมากค่ะ', 'Because I walked a lot.']])
    r = r.filter(x => !['ขอบคุณค่ะ โชคดีนะคะ', 'ลาก่อนครับ', 'ค่าโดยสารเท่าไหร่ครับ', 'สิบบาทค่ะ'].includes(x[5]))
    return r.concat([['S6', 'B', 'THANK', '', '', 'ขอบคุณค่ะ', 'Thanks.'], ['S6', 'A', 'INFORM', '', 'we', 'คิดว่าเราจะเจอกันอีกครับ', 'I think we\'ll meet again.'], ['S6', 'B', 'FAREWELL', '', '', 'ค่ะ โชคดีนะคะ', 'Yes. Good luck!'], ['S6', 'A', 'FAREWELL', '', '', 'ลาก่อนครับ', 'Goodbye.']])
  })(),
  // 明天我们去买东西吧 carried four lesson words (东西 is a v693 target and is heard in S3 already)
  zh: swap(GOOD.zh, '明天我们去买东西吧。', ['S2', 'A', 'PROPOSE', '', 'we', '明天我们去买吧。', 'Let\'s go shopping tomorrow.']),
  ja: [
    ['S1', 'A', 'GREET', '', 'you', 'あっ、来た。', 'Oh, you came.'],
    ['S1', 'B', 'APOLOGISE', '', 'I', 'ごめん、遅かった。', 'Sorry, I was late.'],
    ['S1', 'A', 'ACKNOWLEDGE', '', '', 'いいよ、大丈夫。', 'It\'s fine, no problem.'],
    ['S1', 'A', 'ASK', 'PERSON', 'you', '昨日、誰と会った？', 'Who did you meet yesterday?'],
    ['S1', 'B', 'ANSWER', '', 'a friend', '友達と会った。', 'I met a friend.'],
    ['S1', 'A', 'ASK', 'STATE', 'it', 'どうだった？', 'How was it?'],
    ['S1', 'B', 'ANSWER', '', 'we', '楽しかった。日本語で話した。', 'It was fun. We talked in Japanese.'],
    ['S1', 'A', 'ASK', 'YESNO', 'you', '日本語、できる？', 'You can speak Japanese?'],
    ['S1', 'B', 'ANSWER', '', 'I', 'うん、ちょっと。', 'Yeah, a little.'],
    ['S1', 'A', 'ASK', 'REASON', 'you', 'なんで日本語？', 'Why Japanese?'],
    ['S1', 'B', 'ANSWER', '', 'my friend', '友達が日本語、好きだから。', 'Because my friend likes Japanese.'],
    ['S2', 'A', 'PROPOSE', '', 'we', '今日、映画見ない？', 'Do you want to watch a movie today?'],
    ['S2', 'B', 'COUNTER', '', 'a book', '映画もいいけど、本が欲しい。', 'A movie is good too, but I want a book.'],
    ['S2', 'A', 'ASK', 'CHOICE', 'book or movie', '本と映画、どっち？', 'A book or a movie — which?'],
    ['S2', 'B', 'ANSWER', '', 'a book', '今日は本。', 'A book today.'],
    ['S2', 'A', 'ASK', 'CHOICE', 'the book', 'どれが欲しい？', 'Which one do you want?'],
    ['S2', 'B', 'ANSWER', '', 'that book', 'あれがいい。写真の本。', 'That one over there. The photo book.'],
    ['S2', 'A', 'ASK', 'PLACE', 'the book', 'どこにある？', 'Where do they have it?'],
    ['S2', 'B', 'ANSWER', '', 'the shop', 'あそこの店。', 'The shop over there.'],
    ['S3', 'A', 'PROPOSE', '', 'the movie', 'じゃあ、映画は明日？', 'So the movie tomorrow?'],
    ['S3', 'B', 'ACCEPT', '', 'I', 'うん、明日また来る。', 'Yeah, I\'ll come again tomorrow.'],
    ['S3', 'A', 'ASK', 'YESNO', 'you', 'もう食べた？', 'Have you eaten already?'],
    ['S3', 'B', 'ANSWER', '', 'I', 'まだ。', 'Not yet.'],
    ['S3', 'A', 'PROPOSE', '', 'we', 'じゃあ、一緒に食べよう。', 'Then let\'s eat together.'],
    ['S3', 'B', 'ACCEPT', '', '', 'いいよ。', 'Okay.'],
    ['S4', 'A', 'ASK', 'METHOD', 'we', '店まで、電車で行く？', 'Shall we go to the shop by train?'],
    ['S4', 'B', 'ANSWER', '', 'the bus', 'いいえ、バスがいい。', 'No, the bus is better.'],
    ['S4', 'A', 'ASK', 'YESNO', 'the bus', 'バス、ここで待つ？', 'Shall we wait for the bus here?'],
    ['S4', 'B', 'ANSWER', '', 'we', 'うん、待とう。', 'Yeah, let\'s wait.'],
    ['S4', 'A', 'ASK', 'METHOD', 'you', '今日、何で帰る？', 'How are you going home today?'],
    ['S4', 'B', 'ANSWER', '', 'I', '車で帰る。', 'By car.'],
    ['S5', 'B', 'PROPOSE', '', 'we', 'ここだ。入ろう。', 'This is it. Let\'s go in.'],
    ['S5', 'A', 'ASK', 'THING', 'you', '何、買う？', 'What will you buy?'],
    ['S5', 'B', 'ANSWER', '', 'the book', '写真の本を買う。', 'I\'ll buy the photo book.'],
    ['S5', 'A', 'ASK', 'YESNO', 'money', 'お金、ある？', 'Do you have money?'],
    ['S5', 'B', 'ANSWER', '', 'I', 'うん、ある。', 'Yeah, I do.'],
    ['S5', 'A', 'ASK', 'YESNO', 'money', 'お金、使いすぎじゃない？', 'Aren\'t you spending too much?'],
    ['S5', 'B', 'ANSWER', '', 'I', '大丈夫。好きな本だから。', 'It\'s fine. It\'s a book I like.'],
    ['S5', 'A', 'OFFER', '', 'money', 'はい、ちょっと使って。', 'Here, use some of mine.'],
    ['S5', 'B', 'THANK', '', '', 'ありがとう。', 'Thanks.'],
    ['S5', 'B', 'FAREWELL', '', '', 'じゃあ、また明日。', 'Well then, see you tomorrow.'],
    ['S5', 'A', 'FAREWELL', '', '', 'うん、じゃあね。', 'Yeah, bye.'],
  ],
}
const JA_V693 = [
  ['S1', 'A', 'GREET', '', 'B', 'あっ、来た。', 'Oh, you came.'],
  ['S1', 'B', 'APOLOGISE', '', 'B', 'ごめん、遅くなった。', 'Sorry, I\'m late.'],
  ['S1', 'A', 'ACKNOWLEDGE', '', 'B', 'いいよ、大丈夫。', 'It\'s okay, no problem.'],
  ['S1', 'A', 'ASK', 'PERSON', 'B', '昨日、誰と会った？', 'Who did you meet yesterday?'],
  ['S1', 'B', 'ANSWER', '', 'B', '友達と会った。', 'I met a friend.'],
  ['S1', 'A', 'ASK', 'STATE', 'B', 'どうだった？', 'How was it?'],
  ['S1', 'B', 'ANSWER', '', 'B', '仕事、休んだ。', 'I took the day off from work.'],
  ['S1', 'A', 'ASK', 'REASON', 'B', 'なんで？', 'Why?'],
  ['S1', 'B', 'ANSWER', '', 'B', '暇だったから。', 'Because I was free.'],
  ['S2', 'A', 'PROPOSE', '', 'movie', '映画行かない？', 'Shall we go see a movie?'],
  ['S2', 'B', 'COUNTER', '', 'book', '映画もいいけど、本は？', 'A movie\'s fine, but how about a book?'],
  ['S2', 'A', 'ASK', 'THING', 'that thing', 'あれ何？', 'What\'s that over there?'],
  ['S2', 'B', 'ANSWER', '', 'photo book', '写真の本だよ。', 'It\'s a photo book.'],
  ['S2', 'A', 'REACT', '', 'photo book', 'へえ、いいね。', 'Oh, nice.'],
  ['S2', 'B', 'PROPOSE', '', 'movie', 'じゃ、映画行こう。', 'Then let\'s go see a movie.'],
  ['S2', 'A', 'ASK', 'CHOICE', 'food or movie', 'ご飯と映画、どっちがいい？', 'Food or movie, which do you want?'],
  ['S2', 'B', 'PROPOSE', '', 'food', 'ご飯がいい。あそこの店行こう。', 'I want food. Let\'s go to that place over there.'],
  ['S2', 'A', 'ASK', 'CHOICE', 'menu item', 'どれ見る？', 'Which one shall we look at?'],
  ['S2', 'A', 'INFORM', '', 'A', '水が欲しい。', 'I want water.'],
  ['S2', 'B', 'ACCEPT', '', 'water', 'いいよ、水ある。', 'Okay, there\'s water.'],
  ['S3', 'A', 'ASK', 'YESNO', 'B', '明日はできる？', 'Can you do tomorrow?'],
  ['S3', 'B', 'COUNTER', '', 'B', '明日はまだ分からない。', 'I still don\'t know about tomorrow.'],
  ['S3', 'A', 'ASK', 'YESNO', 'B', 'もう食べた？', 'Have you already eaten?'],
  ['S3', 'B', 'ANSWER', '', 'B', 'もう食べた。おいしかった。', 'Already ate. It was delicious.'],
  ['S3', 'A', 'PROPOSE', '', 'both', 'じゃ明日、また会おう。', 'Then let\'s meet again tomorrow.'],
  ['S3', 'B', 'ACCEPT', '', 'both', 'いいよ、明日ね。', 'Okay, tomorrow then.'],
  ['S4', 'A', 'ASK', 'METHOD', 'B', '明日、電車で来る？', 'Are you coming by train tomorrow?'],
  ['S4', 'B', 'ANSWER', '', 'B', '車で来る。', 'I\'m coming by car.'],
  ['S4', 'A', 'COUNTER', '', 'bus', 'いいえ、バスでしょ？', 'No, it\'s by bus, right?'],
  ['S4', 'B', 'PROPOSE', '', 'B', 'じゃ、バス待つね。', 'Then I\'ll wait for the bus.'],
  ['S4', 'A', 'ASK', 'METHOD', 'B', '帰るのも電車？', 'Are you going home by train too?'],
  ['S4', 'B', 'ANSWER', '', 'B', 'そう、電車で帰る。', 'Yes, I\'ll go home by train.'],
  ['S5', 'A', 'ASK', 'PRICE', 'this', 'これ、いくら？', 'How much is this?'],
  ['S5', 'B', 'ANSWER', '', 'this', '二千円。高いね。', 'Two thousand yen. Expensive, huh.'],
  ['S5', 'A', 'ASK', 'YESNO', 'B', 'それ買う？', 'Are you going to buy that?'],
  ['S5', 'B', 'ACCEPT', '', 'B', 'うん、買う。', 'Yeah, I\'ll buy it.'],
  ['S5', 'A', 'COUNTER', '', 'money', 'お金、使いすぎ？', 'Are you spending too much money?'],
  ['S5', 'B', 'REACT', '', 'B', '大丈夫。', 'It\'s okay.'],
  ['S5', 'B', 'OFFER', '', 'money', 'はい、お金。', 'Here, the money.'],
  ['S5', 'A', 'THANK', '', 'A', 'ありがとう。', 'Thanks.'],
  ['S5', 'A', 'FAREWELL', '', 'both', 'じゃ、また明日ね。', 'Okay, see you again tomorrow.'],
]
module.exports = { GOOD693, JA_V693 }
