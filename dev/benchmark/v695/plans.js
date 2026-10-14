// v695 — CONTROLLED MOCK MODEL OUTPUTS reproducing the three v694 Listening failures of 13–14 Oct (owner logs
// listening-log-2026-10-13T23-53-42 Thai · T23-59-52 Japanese · 2026-10-14T00-14-02 Mandarin). Learners: the targets those
// runs selected (V694_IDS) + the words they deferred (V694_DEFERRED) as due words, as benchmark/v692/learners.js does for v693.
// *_V694: the situation replies Claude Haiku actually returned (the version each v694 run kept), re-filed by situation.
// *_FIX: the corrected replies a replan / repair is scripted to return. Rows: [situation, speaker, intent, asks, about, text, english].
// They test the PIPELINE (what is caught, what is repaired, what is published); they are not evidence of what the real model writes.
'use strict'
const V694_IDS = {
  th: [779, 359, 1233, 1479, 1536, 1539, 821, 839, 653, 676, 717, 719, 730, 737, 761, 858, 744, 750, 817, 840, 841, 860, 667, 669, 672, 686, 787, 815, 847, 712],
  ja: [101, 102, 80, 103, 104, 105, 106, 44, 83, 20, 43, 40, 82, 87, 84, 85, 86, 19, 46, 47, 31, 32, 14, 21, 23, 81, 33, 34, 36, 50],
  zh: [32, 54, 62, 63, 57, 58, 55, 56, 51, 53, 50, 47, 48, 49, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 30, 31, 52],
}
const V694_DEFERRED = { th: [1524], ja: [22, 45], zh: [29] }

// ── THAI v694: S1 passed its v694 local check without พวกคุณ / นักท่องเที่ยว (only global coverage was checked); S6 asked
// "what is your phone number?" and answered with a promise; the repairs then ADDED turns (41 → 45) and the round-2 repair
// (4 scene-sized parts in one request) was cut off at 10,500 output tokens twice
const TH_V694 = [
  ['S1', 'A', 'GREET', '', '', 'สวัสดีครับ คุณสบายดีไหมครับ', 'Hello, how are you?'],
  ['S1', 'B', 'ANSWER', '', 'I', 'สวัสดีค่ะ ฉันสบายดีค่ะ', 'Hello, I\'m fine.'],
  ['S1', 'A', 'ASK', 'STATE', 'trip', 'ไปเที่ยวมาเป็นอย่างไรครับ', 'How was the trip?'],
  ['S1', 'B', 'ANSWER', '', 'trip', 'สนุกมากค่ะ เพราะเพื่อนตลกค่ะ', 'Very fun, because my friend is funny.'],
  ['S1', 'A', 'REACT', '', 'friend', 'ตลกจังครับ', 'That\'s really funny.'],
  ['S1', 'A', 'ASK', 'AGE', 'you', 'คุณอายุเท่าไหร่ครับ', 'How old are you?'],
  ['S1', 'B', 'ANSWER', '', 'age', 'ยี่สิบเจ็ดปีค่ะ', 'Twenty-seven years old.'],
  ['S1', 'A', 'REACT', '', 'age', 'ยังไม่แก่เลยครับ', 'You\'re not old at all.'],
  ['S2', 'B', 'ASK', 'PLACE', 'we', 'ขอบคุณค่ะ เราไปที่ไหนดีคะ', 'Thank you. Where shall we go?'],
  ['S2', 'A', 'PROPOSE', '', 'national museum', 'ไปพิพิธภัณฑสถานแห่งชาติดีไหมครับ', 'How about going to the National Museum?'],
  ['S2', 'B', 'COUNTER', '', 'Sanam Luang', 'สนามหลวงดีกว่าไหมคะ', 'Would Sanam Luang be better?'],
  ['S2', 'A', 'ACCEPT', '', 'Sanam Luang', 'ไปสนามหลวงก็ได้ครับ', 'Going to Sanam Luang is fine too.'],
  ['S2', 'B', 'ASK', 'YESNO', 'Sanam Luang', 'ที่นั่นน่าดูไหมคะ', 'Is it worth seeing there?'],
  ['S2', 'A', 'ANSWER', '', 'Sanam Luang', 'น่าดูมากครับ', 'Very much worth seeing.'],
  ['S2', 'B', 'ASK', 'PLACE', 'entrance', 'ทางเข้าอยู่ที่ไหนคะ', 'Where is the entrance?'],
  ['S2', 'A', 'ANSWER', '', 'entrance', 'ทางเข้าอยู่ที่นั่นครับ', 'The entrance is over there.'],
  ['S2', 'B', 'ACCEPT', '', 'way', 'ไปทางนั้นก็ได้ค่ะ', 'We can go that way.'],
  ['S2', 'A', 'PROPOSE', '', 'restaurant', 'ไปร้านอาหารด้วยไหมครับ', 'Shall we go to a restaurant too?'],
  ['S2', 'B', 'ACCEPT', '', 'restaurant', 'ดีค่ะ ไปที่ร้านอาหารกันค่ะ', 'Good, let\'s go to the restaurant together.'],
  ['S3', 'A', 'ASK', 'CLOCK_TIME', 'time tomorrow', 'พรุ่งนี้ไปกี่โมงดีครับ', 'What time shall we go tomorrow?'],
  ['S3', 'B', 'PROPOSE', '', '10 AM', 'สิบโมงเช้าดีไหมคะ', 'How about 10 AM?'],
  ['S3', 'A', 'COUNTER', '', '11 AM', 'ผมว่าสิบเอ็ดโมงเช้าดีกว่าครับ', 'I think 11 AM is better.'],
  ['S3', 'B', 'ACCEPT', '', '11 AM', 'ได้ค่ะ สิบเอ็ดโมงเช้าก็ได้ค่ะ', 'Okay, 11 AM is fine too.'],
  ['S4', 'A', 'ASK', 'METHOD', 'getting there', 'ไปอย่างไรดีครับ', 'How shall we go?'],
  ['S4', 'B', 'PROPOSE', '', 'taxi', 'รถแท็กซี่ดีไหมคะ', 'How about a taxi?'],
  ['S4', 'A', 'COUNTER', '', 'songthaew', 'รถสองแถวดีกว่าครับ', 'A songthaew is better.'],
  ['S4', 'B', 'ASK', 'PRICE', 'fare', 'ค่าโดยสารเท่าไหร่คะ', 'How much is the fare?'],
  ['S4', 'A', 'ANSWER', '', 'baht', 'สิบบาทครับ', 'Ten baht.'],
  ['S4', 'B', 'ASK', 'DURATION', 'travel time', 'จากตรงนี้นานเท่าไหร่คะ', 'How long from here?'],
  ['S4', 'A', 'ANSWER', '', 'minutes', 'สิบนาทีครับ', 'Ten minutes.'],
  ['S4', 'B', 'ASK', 'PLACE', 'turn', 'ต้องเลี้ยวที่ไหนคะ', 'Where do we have to turn?'],
  ['S5', 'A', 'PROPOSE', '', 'eating', 'ทานกันเลยไหมครับ', 'Shall we eat now?'],
  ['S5', 'B', 'ACCEPT', '', 'hunger', 'ดีค่ะ ฉันหิวแล้วค่ะ', 'Good, I\'m already hungry.'],
  ['S5', 'A', 'PROPOSE', '', 'pad thai', 'ผัดไทยดีไหมครับ', 'How about pad thai?'],
  ['S5', 'B', 'ASK', 'YESNO', 'price', 'ราคาคุ้มไหมคะ', 'Is the price worth it?'],
  ['S5', 'A', 'ANSWER', '', 'price', 'ไม่เชิงครับ แพงนิดหน่อยครับ', 'Not exactly, a little expensive.'],
  ['S5', 'B', 'ACCEPT', '', 'ordering', 'งั้นกินเลยค่ะ', 'Then let\'s eat it.'],
  ['S6', 'A', 'ASK', 'THING', 'phone number', 'เบอร์โทรศัพท์ของคุณคืออะไรครับ', 'What is your phone number?'],
  ['S6', 'B', 'ANSWER', '', 'phone number', 'ได้ค่ะ ฉันจะส่งให้นะคะ', 'Okay, I\'ll send it to you.'],
  ['S6', 'A', 'FAREWELL', '', '', 'โชคดีนะครับ', 'Good luck.'],
  ['S6', 'B', 'FAREWELL', '', '', 'ขอบคุณค่ะ ลาก่อนนะคะ', 'Thank you, goodbye.'],
]
const TH_FIX = {
  // S1 again, now carrying พวกคุณ / นักท่องเที่ยว (the v695 local check names them; the v694 one never asked)
  S1: [
    ['S1', 'A', 'GREET', '', '', 'สวัสดีครับ คุณสบายดีไหมครับ', 'Hello, how are you?'],
    ['S1', 'B', 'ANSWER', '', 'I', 'สวัสดีค่ะ ฉันสบายดีค่ะ', 'Hello, I\'m fine.'],
    ['S1', 'A', 'ASK', 'YESNO', 'you all', 'พวกคุณเป็นนักท่องเที่ยวเหรอครับ', 'Are you all tourists?'],
    ['S1', 'B', 'ANSWER', '', 'we', 'ใช่ค่ะ', 'Yes.'],
    ['S1', 'A', 'ASK', 'STATE', 'trip', 'ไปเที่ยวมาเป็นอย่างไรครับ', 'How was the trip?'],
    ['S1', 'B', 'ANSWER', '', 'trip', 'สนุกมากค่ะ เพราะเพื่อนตลกค่ะ', 'Very fun, because my friend is funny.'],
    ['S1', 'A', 'ASK', 'AGE', 'you', 'คุณอายุเท่าไหร่ครับ', 'How old are you?'],
    ['S1', 'B', 'ANSWER', '', 'age', 'ยี่สิบเจ็ดปีค่ะ', 'Twenty-seven years old.'],
    ['S1', 'A', 'REACT', '', 'age', 'ยังไม่แก่เลยครับ', 'You\'re not old at all.'],
  ],
  // S2 without the opening "thank you" (nothing to thank for once S1 ends on a reaction)
  S2first: ['ขอบคุณค่ะ เราไปที่ไหนดีคะ', ['S2', 'B', 'ASK', 'PLACE', 'we', 'เราไปที่ไหนดีคะ', 'Where shall we go?']],
  // S6: ask FOR the number + a promise to send it (no "what is your number?")
  S6: [
    ['S6', 'A', 'REQUEST', '', 'phone number', 'ขอเบอร์โทรศัพท์หน่อยได้ไหมครับ', 'Could I have your phone number?'],
    ['S6', 'B', 'ACCEPT', '', 'phone number', 'ได้ค่ะ ฉันจะส่งให้นะคะ', 'Sure, I\'ll send it to you.'],
    ['S6', 'A', 'INFORM', '', 'my number', 'อันนี้คือเบอร์โทรศัพท์ของผมครับ', 'This is my phone number.'],
    ['S6', 'B', 'FAREWELL', '', '', 'ขอบคุณค่ะ โชคดีนะคะ', 'Thanks — good luck!'],
  ],
}

// ── JAPANESE v694: 聞いちゃった was read as an unknown 聞 (no ちゃう forms in the segmenter); こっち / こと unauthorised; S3 agreed
// "今日あそこ行こう — いいよ、行こう" and S4 opened with 明日、行かない？ — the audit found the transition only after the last
// repair round, and the repairs could only rewrite whole situations (never the boundary)
const JA_V694 = [
  ['S1', 'A', 'GREET', '', '', 'こんにちは。', 'Hello.'],
  ['S1', 'B', 'ASK', 'YESNO', 'today free', '今日は暇？', 'Are you free today?'],
  ['S1', 'A', 'ANSWER', '', 'today free', 'うん、暇。', 'Yeah, I\'m free.'],
  ['S1', 'B', 'ASK', 'STATE', 'yesterday', '昨日どうだった？', 'How was yesterday?'],
  ['S1', 'A', 'ANSWER', '', 'yesterday', 'ちょっと忙しかった。', 'It was a little busy.'],
  ['S1', 'B', 'ASK', 'REASON', 'being busy', 'なんで忙しかったの？', 'Why were you busy?'],
  ['S1', 'A', 'ANSWER', '', 'meeting a friend', '友達に会ってたから。', 'Because I was meeting a friend.'],
  ['S1', 'B', 'ASK', 'YESNO', 'talking with friend', 'へえ、友達と話した？', 'Oh, did you talk with your friend?'],
  ['S1', 'A', 'ANSWER', '', 'talking with friend', 'うん、話した。', 'Yeah, I talked with them.'],
  ['S1', 'B', 'APOLOGISE', '', 'asking too much', 'ごめん、聞いちゃった。', 'Sorry, I went ahead and asked.'],
  ['S2', 'A', 'REACT', '', 'apology', '大丈夫だよ。', 'It\'s okay.'],
  ['S2', 'B', 'ASK', 'THING', 'today plans', '今日、何する？', 'What are we doing today?'],
  ['S2', 'A', 'PROPOSE', '', 'movie', '映画行かない？', 'Want to go see a movie?'],
  ['S2', 'B', 'ASK', 'THING', 'movie', 'いいね。何の映画？', 'Sounds good. What movie?'],
  ['S2', 'A', 'ANSWER', '', 'book movie', '本の映画だよ。', 'It\'s a movie based on a book.'],
  ['S2', 'B', 'ACCEPT', '', '', 'いいね、一緒に行こう。', 'Sounds good, let\'s go together.'],
  ['S2', 'B', 'ASK', 'THING', 'photo', 'あれ、写真？', 'That over there, a photo?'],
  ['S3', 'A', 'INFORM', '', 'photo shop', 'ああ、あれ、あそこの店の写真だよ。', 'Oh, that? It\'s a photo of the shop over there.'],
  ['S3', 'B', 'ASK', 'CHOICE', 'which shop', 'どっちの店？', 'Which shop?'],
  ['S3', 'A', 'ANSWER', '', 'this shop', 'こっちの店がいい。', 'I like this one better.'],
  ['S3', 'B', 'ASK', 'CHOICE', 'what to eat', 'いいね。どれ食べる？', 'Sounds good. Which one are you going to eat?'],
  ['S3', 'A', 'PROPOSE', '', 'menu item', 'これ見て、おいしそう。', 'Look at this, it looks delicious.'],
  ['S3', 'B', 'REACT', '', 'menu item', '本当だ、これ欲しい。', 'Really, I want this one.'],
  ['S3', 'A', 'PROPOSE', '', 'going there', 'じゃ、今日あそこ行こう。', 'Then let\'s go there today.'],
  ['S3', 'B', 'ACCEPT', '', 'going there', 'いいよ、行こう。', 'Okay, let\'s go.'],
  ['S4', 'A', 'PROPOSE', '', 'tomorrow', '明日、行かない？', 'Want to go tomorrow?'],
  ['S4', 'B', 'COUNTER', '', 'tomorrow', '明日はまだ分からない。', 'I don\'t know yet about tomorrow.'],
  ['S4', 'A', 'PROPOSE', '', 'later', 'じゃ、また言うね。', 'Then I\'ll tell you again.'],
  ['S4', 'B', 'ACCEPT', '', 'plan', 'うん、分かった。もう大丈夫？', 'Yeah, got it. Is it already okay?'],
  ['S5', 'B', 'ASK', 'METHOD', 'getting there', '何で行く？', 'How shall we go?'],
  ['S5', 'A', 'ANSWER', '', 'train', '電車で行こう。', 'Let\'s go by train.'],
  ['S5', 'B', 'COUNTER', '', 'bus', 'バスは？', 'What about the bus?'],
  ['S5', 'A', 'INFORM', '', 'bus', 'バスは乗らない。ちょっと遠いから。', 'I won\'t take the bus. It\'s a bit far.'],
  ['S5', 'B', 'PROPOSE', '', 'station', 'じゃ、駅で待とうか。', 'Then shall we meet and wait at the station?'],
  ['S5', 'A', 'ACCEPT', '', '', 'はい、いいよ。', 'Yes, okay.'],
  ['S5', 'B', 'ASK', 'YESNO', 'car', '帰るのは車？', 'Are we going back by car?'],
  ['S5', 'A', 'DECLINE', '', 'train', 'いいえ、電車で帰ろう。', 'No, let\'s go back by train.'],
  ['S5', 'B', 'ACKNOWLEDGE', '', '', '分かった、いいよ。', 'Got it, okay.'],
  ['S6', 'B', 'ASK', 'YESNO', 'this', 'これ買う？', 'Are you going to buy this?'],
  ['S6', 'A', 'ANSWER', '', 'this', 'うん、買おうかな。', 'Yeah, I think I\'ll buy it.'],
  ['S6', 'B', 'ASK', 'YESNO', 'money', 'お金ある？', 'Do you have money?'],
  ['S6', 'A', 'ANSWER', '', 'money', 'うん、ある。大丈夫だよ。', 'Yeah, I have it. It\'s okay.'],
  ['S6', 'B', 'ASK', 'YESNO', 'paying here', 'ここで買うことできる？', 'Can we buy it here?'],
  ['S6', 'A', 'FAREWELL', '', 'paying here', 'うん、できるよ。じゃ、またね。', 'Yeah, we can. Okay, see you later.'],
]
const JA_FIX = {
  // S3 replan: こっち → あそこ (the replan keeps the today agreement — the model does not see S4 yet)
  S3: [['こっちの店がいい。', ['S3', 'A', 'ANSWER', '', 'that shop', 'あそこの店がいい。', 'That shop over there.']]],
  // S6 replan: こと → a plain question
  S6: [['ここで買うことできる？', ['S6', 'B', 'ASK', 'YESNO', 'paying here', 'ここで買うの、できる？', 'Can we buy it here?']]],
  // the BOUNDARY repair (end of S3 + start of S4): the day is no longer fixed in S3
  boundary: [['A', 'PROPOSE', '', 'going there', 'じゃ、あそこ行こう。', 'Then let\'s go there.'], ['B', 'ACCEPT', '', 'going there', 'いいよ、行こう。', 'Okay, let\'s go.'],
    ['A', 'PROPOSE', '', 'tomorrow', '明日、行かない？', 'Want to go tomorrow?'], ['B', 'COUNTER', '', 'tomorrow', '明日はまだ分からない。', 'I don\'t know yet about tomorrow.']],
}

// ── MANDARIN v694: 好，一起去。/ 你知道哪里吗？/ 好，我拿。 were rejected by over-broad grammar rules; the repairs returned
// "Chinese (pinyin)" in the sentence field, which replaced valid lines and failed as 16–31 "words" with Latin script
const ZH_V694 = [
  ['S1', 'A', 'GREET', '', '', '你好呀！', 'Hi there!'],
  ['S1', 'B', 'ANSWER', '', 'I', '我好，你呢？', 'I\'m good, and you?'],
  ['S1', 'A', 'ASK', 'THING', 'yesterday', '昨天你做什么？', 'What did you do yesterday?'],
  ['S1', 'B', 'ANSWER', '', 'work', '我做工作。', 'I worked.'],
  ['S1', 'A', 'ASK', 'REASON', 'work', '为什么？', 'Why?'],
  ['S1', 'B', 'ANSWER', '', 'work', '我要工作。', 'I have to work.'],
  ['S1', 'A', 'ASK', 'PERSON', 'help', '谁帮你？', 'Who helped you?'],
  ['S1', 'B', 'ANSWER', '', 'my friend', '那个人，我朋友。', 'That person, my friend.'],
  ['S2', 'A', 'PROPOSE', '', 'today eating', '今天吃，好吗？', 'Eat today, okay?'],
  ['S2', 'B', 'COUNTER', '', 'tomorrow', '今天不可以，明天吧。', 'Not today, tomorrow maybe.'],
  ['S2', 'A', 'ACCEPT', '', 'tomorrow', '好，明天。', 'Okay, tomorrow.'],
  ['S2', 'B', 'ASK', 'THING', 'drink', '现在喝什么？', 'What to drink now?'],
  ['S2', 'A', 'ANSWER', '', 'this drink', '我要这个。', 'I want this one.'],
  ['S3', 'A', 'ASK', 'PLACE', 'going place', '我们去什么地方？', 'Where shall we go?'],
  ['S3', 'B', 'ANSWER', '', 'home', '我想回家。', 'I want to go home.'],
  ['S3', 'A', 'PROPOSE', '', 'waiting', '你等我，好吗？', 'Wait for me, okay?'],
  ['S3', 'B', 'ACCEPT', '', 'waiting', '好，我等你。', 'Okay, I\'ll wait for you.'],
  ['S3', 'A', 'INFORM', '', 'arriving', '我到了。', 'I\'ve arrived.'],
  ['S4', 'B', 'ASK', 'METHOD', 'we', '我们怎么去？', 'How shall we go?'],
  ['S4', 'A', 'ANSWER', '', 'me, you', '我跟你去。', 'I\'ll go with you.'],
  ['S4', 'B', 'ASK', 'PLACE', 'going', '去哪里？', 'Where to?'],
  ['S4', 'A', 'ANSWER', '', 'home', '你家。', 'Your home.'],
  ['S4', 'B', 'ACCEPT', '', 'we', '好，一起去。', 'Okay, let\'s go together.'],
  ['S4', 'A', 'REQUEST', '', 'you', '你来，好吗？', 'Come along, okay?'],
  ['S5', 'A', 'ASK', 'THING', 'shopping', '你想买什么？', 'What do you want to buy?'],
  ['S5', 'B', 'ANSWER', '', 'this item', '这个可以吗？', 'Is this one okay?'],
  ['S5', 'A', 'ASK', 'YESNO', 'money', '你有钱吗？', 'Do you have money?'],
  ['S5', 'B', 'ANSWER', '', 'money', '钱在家。', 'The money is at home.'],
  ['S5', 'A', 'OFFER', '', 'money', '我给你钱，好吗？', 'I\'ll give you the money, okay?'],
  ['S5', 'B', 'ACCEPT', '', 'taking', '好，你拿这个。', 'Okay, you take this one.'],
  ['S5', 'A', 'REQUEST', '', 'this one', '你开这个，好吗？', 'Open this one for me, okay?'],
  ['S5', 'B', 'ACCEPT', '', 'buying', '好，我用钱买。', 'Okay, I\'ll use money to buy it.'],
  ['S6', 'A', 'INFORM', '', 'this one', '这个很大。', 'This one is very big.'],
  ['S6', 'B', 'COUNTER', '', 'that one', '那个太小了。', 'That one is too small.'],
  ['S6', 'A', 'ASK', 'THING', 'over there', '那里有什么？', 'What is over there?'],
  ['S6', 'B', 'ANSWER', '', 'small ones', '那里有小的。', 'Over there there are small ones.'],
  ['S6', 'A', 'INFORM', '', 'I', '我找大的。', 'I\'m looking for a big one.'],
  ['S6', 'B', 'ANSWER', '', 'here', '这里没有大的。', 'There isn\'t a big one here.'],
  ['S6', 'A', 'INFORM', '', 'it', '我觉得很好。', 'I think it\'s very good.'],
  ['S6', 'B', 'ASK', 'STATE', 'you', '你喜欢吗？', 'Do you like it?'],
  ['S6', 'A', 'ANSWER', '', 'I', '我喜欢。', 'I like it.'],
  ['S6', 'B', 'FAREWELL', '', 'we', '好，我们回家，好吗？', 'Okay, shall we go home now?'],
]
// the three lines the v694 grammar rules rejected (each is correct Mandarin in its context)
const ZH_ELLIPSIS = {
  together: '好，一起去。',                       // reply ellipsis: the subject (我们) is understood from 我跟你去
  embedded: ['S4', 'B', 'ASK', 'YESNO', 'place', '你知道哪里吗？', 'Do you know where?'],   // 知道 + wh + 吗: an embedded question
  take: ['S5', 'B', 'ACCEPT', '', 'this one', '好，我拿。', 'Okay, I\'ll take it.'],          // object ellipsis after 你拿这个 / 钱
}
// the v694 repair replies, verbatim: Chinese + pinyin in the one text field
const ZH_REPAIR_V694 = {
  together: ['B', 'ACCEPT', '', 'we', '好，我们一起去。(hǎo, wǒmen yìqǐ qù)', 'Okay, let\'s go together.'],
  work: [['A', 'ASK', 'THING', 'yesterday', '昨天你做什么？(zuótiān nǐ zuò shénme?)', 'What did you do yesterday?'], ['B', 'ANSWER', '', 'work', '我工作了。(wǒ gōngzuò le.)', 'I worked.']],
  arrive: ['A', 'INFORM', '', 'arriving', '我到了，我跟你回家。 Wǒ dào le, wǒ gēn nǐ huí jiā.', 'I\'ve arrived, I\'ll go home with you.'],
  // not cleanable: the romanisation comes FIRST — the patch must be rejected, never applied
  leading: ['B', 'ANSWER', '', 'work', 'wǒ gōngzuò le 我工作了。', 'I worked.'],
}
module.exports = { V694_IDS, V694_DEFERRED, TH_V694, TH_FIX, JA_V694, JA_FIX, ZH_V694, ZH_ELLIPSIS, ZH_REPAIR_V694 }
