#!/usr/bin/env node
// Rewrites the Thai and Mandarin sections of reference-fixtures.json (DESIGNED BY CLAUDE — not Gemini output, not native-reviewed).
// Thai keeps 3-line exchanges; Thai phonetics are the app's dictionary rendering (v684ThLexicon: bank + the pending corrections),
// so they match what the v684 pipeline displays — the gate then checks them independently against the tone / vowel rules.
'use strict'
const fs = require('fs'), path = require('path'), { load } = require('../../harness')
const c = load(path.join(__dirname, '..', '..', 'tt.compiled.js'), { realBelt: true })
const P = path.join(__dirname, 'reference-fixtures.json'), ref = JSON.parse(fs.readFileSync(P, 'utf8'))
const lex = c.v684ThLexicon(c.ev('RAW_VOCAB').map(d => ({ id: d.id, thai: d.t, phonetic: d.ph })))
const ph = t => c.composeThaiPhonetic(t, lex).phonetic
const T = (voice, role, text, en, cue) => ({ voice, role, text, ph: ph(text), en, ...(cue ? { target: true, cue } : {}) })
const R = (k, sense, fn, speaker, addressee, relation, register, situation, purpose, exchange) => ({ k, sense, function: fn, intent: { speaker, addressee, relation, register, situation, purpose }, exchange })
ref.th = [
  { target: { surface: 'หลัง', gloss: 'after / back', pos: 'preposition / noun' }, recalls: [
    R(1, 'after (an event)', 'suggest-sequence', 'A', 'friend', 'friend', 'polite-friendly', 'finishing lunch', 'Somchai suggests to his friend that they go for a walk after eating', [
      T('A', 'friend', 'หลังกินข้าว เราไปเดินกันไหมครับ', 'After we eat, shall we go for a walk?', 'You are finishing lunch with a friend. Suggest going for a walk after you eat.'),
      T('B', 'friend', 'ดีค่ะ ไปไหนดีคะ', 'Good idea — where shall we go?'),
      T('A', 'friend', 'ไปร้านกาแฟกันครับ', "Let's go to the coffee shop.")]),
    R(2, 'back (rear of a place)', 'give-location', 'B', 'customer', 'staff', 'polite', 'in a café', 'the waitress tells a customer that the toilet is at the back of the shop', [
      T('A', 'customer', 'ห้องน้ำอยู่ที่ไหนครับ', 'Where is the toilet?'),
      T('B', 'waitress', 'อยู่หลังร้านค่ะ', "It's at the back of the shop.", 'You work in a café. A customer asks where the toilet is: tell him it is at the back of the shop.'),
      T('A', 'customer', 'ขอบคุณครับ', 'Thank you.')]),
    R(3, 'after (a time)', 'arrange-time', 'B', 'friend', 'friend', 'polite-friendly', 'arranging to meet', 'Nida agrees to meet her friend tomorrow and says it should be after five o\'clock', [
      T('A', 'friend', 'พรุ่งนี้เจอกันไหมครับ', 'Shall we meet tomorrow?'),
      T('B', 'friend', 'ได้ค่ะ เจอกันหลังห้าโมงนะคะ', "Sure — let's meet after five.", 'Your friend asks to meet tomorrow. Agree, and say to meet after five o\'clock.'),
      T('A', 'friend', 'ตกลงครับ', 'OK.')])] },
  { target: { surface: 'พอ', gloss: 'enough', pos: 'adjective / verb' }, recalls: [
    R(1, 'enough (stop serving)', 'decline-more', 'A', 'host', 'friend', 'polite-friendly', 'at dinner', 'Somchai tells his host that he has had enough rice and thanks her', [
      T('B', 'host', 'เอาข้าวอีกไหมคะ', 'Would you like more rice?'),
      T('A', 'guest', 'พอแล้วครับ ขอบคุณครับ', "That's enough, thank you.", 'Your host offers you more rice. Say that is enough, and thank her.'),
      T('B', 'host', 'ไม่เป็นไรค่ะ', "You're welcome.")]),
    R(2, 'enough (sufficient — question)', 'ask-sufficiency', 'A', 'friend', 'friend', 'polite-friendly', 'at a shop counter', 'Somchai checks whether his friend has enough money before she pays', [
      T('A', 'friend', 'เงินพอไหมครับ', 'Do you have enough money?', 'Your friend is about to pay. Ask if she has enough money.'),
      T('B', 'friend', 'มีค่ะ', 'Yes, I have it.'),
      T('A', 'friend', 'งั้นไปกันครับ', "Then let's go.")]),
    R(3, 'not enough', 'report-shortage', 'B', 'friend', 'friend', 'polite-friendly', 'at a party', 'Nida tells her friend that there is not enough food for everyone yet', [
      T('A', 'friend', 'ทุกคนได้กินไหมครับ', 'Did everyone get to eat?'),
      T('B', 'friend', 'ยังค่ะ ข้าวไม่พอค่ะ', "Not yet — there isn't enough food.", 'Your friend asks if everyone has eaten. Say not yet, there is not enough food.'),
      T('A', 'friend', 'งั้นผมไปซื้ออีกครับ', "Then I'll go and buy more.")])] },
  { target: { surface: 'ล่ะ', gloss: 'what about…? (question particle)', pos: 'particle' }, recalls: [
    R(1, 'what about you? (return the question)', 'return-question', 'A', 'friend', 'friend', 'polite-friendly', 'choosing drinks', 'Somchai says what he likes to drink and asks his friend the same question', [
      T('A', 'friend', 'ผมชอบกาแฟครับ คุณล่ะครับ', 'I like coffee. What about you?', 'You are choosing drinks. Say you like coffee, then ask your friend what about her.'),
      T('B', 'friend', 'ฉันชอบชาค่ะ', 'I like tea.'),
      T('A', 'friend', 'ร้านนี้มีชาครับ', 'This shop has tea.')]),
    R(2, 'what about that one? (offer an alternative)', 'suggest-alternative', 'A', 'friend', 'friend', 'polite-friendly', 'shopping together', 'Somchai points to another item after his friend rejects the first one', [
      T('B', 'friend', 'อันนี้ไม่ชอบค่ะ', "I don't like this one."),
      T('A', 'friend', 'อันนั้นล่ะครับ', 'What about that one?', "Your friend doesn't like this one. Point to another one and ask what about that one."),
      T('B', 'friend', 'อันนั้นดีค่ะ', 'That one is good.')]),
    R(3, 'then …? (follow-up question after a problem)', 'ask-next-step', 'A', 'friend', 'friend', 'polite-friendly', 'the planned shop is closed', 'Somchai asks his friend where they should go now that the shop is closed', [
      T('B', 'friend', 'ร้านปิดแล้วค่ะ', "The shop's closed."),
      T('A', 'friend', 'แล้วเราจะไปไหนล่ะครับ', 'So where shall we go then?', 'Your friend says the shop is closed. Ask where you should go then.'),
      T('B', 'friend', 'ไปร้านกาแฟกันค่ะ', "Let's go to the coffee shop.")])] },
  { target: { surface: 'ตรงไป', gloss: 'go straight', pos: 'verb phrase' }, recalls: [
    R(1, 'go straight (giving directions)', 'give-directions', 'A', 'tourist', 'stranger', 'polite', 'a tourist asks the way to the station', 'Somchai tells a lost tourist to go straight on and that she will see the station', [
      T('B', 'tourist', 'สถานีไปทางไหนคะ', 'Which way is the station?'),
      T('A', 'local', 'ตรงไปครับ แล้วจะเจอสถานีครับ', "Go straight on and you'll see the station.", 'A tourist asks you the way to the station. Tell her to go straight on and she will see it.'),
      T('B', 'tourist', 'ขอบคุณค่ะ', 'Thank you.')]),
    R(2, 'go straight (checking)', 'confirm-direction', 'B', 'passer-by', 'stranger', 'polite', 'after receiving directions', 'Nida checks with the passer-by that she has understood his directions correctly', [
      T('A', 'passer-by', 'สถานีอยู่ทางนั้นครับ', 'The station is that way.'),
      T('B', 'tourist', 'ตรงไปใช่ไหมคะ', 'Straight ahead, right?', 'A passer-by points the way to the station. Check with him that you go straight ahead.'),
      T('A', 'passer-by', 'ใช่ครับ', "That's right.")]),
    R(3, 'keep going straight (instructing a driver)', 'instruct-driver', 'A', 'driver', 'staff', 'polite', 'in a car near the destination', 'Somchai tells the driver that they have not arrived yet and should keep going a little further', [
      T('B', 'driver', 'ตรงนี้ใช่ไหมคะ', 'Is it here?'),
      T('A', 'passenger', 'ยังครับ ตรงไปอีกหน่อยครับ', 'Not yet — a bit further straight on.', 'The driver asks if this is the place. Say not yet, go a bit further straight on.'),
      T('B', 'driver', 'ได้ค่ะ', 'OK.')])] },
  { target: { surface: 'โกรธ', gloss: 'angry', pos: 'verb / adjective' }, recalls: [
    R(1, 'angry (ask)', 'ask-feeling', 'B', 'friend', 'friend', 'polite-friendly', 'her friend has gone quiet', 'Nida asks her friend whether he is angry with her because he has gone quiet', [
      T('B', 'friend', 'คุณโกรธฉันเหรอคะ', 'Are you angry with me?', 'Your friend has gone quiet. Ask if he is angry with you.'),
      T('A', 'friend', 'ไม่ครับ ไม่เป็นไรครับ', "No, it's fine."),
      T('B', 'friend', 'จริงเหรอคะ', 'Really?')]),
    R(2, 'not angry (reassure)', 'reassure', 'A', 'friend', 'friend', 'polite-friendly', 'his friend apologises for being late', 'Somchai reassures his friend that he is not angry about her being late', [
      T('B', 'friend', 'ขอโทษนะคะ ฉันมาสาย', "Sorry, I'm late."),
      T('A', 'friend', 'ไม่เป็นไรครับ ผมไม่โกรธครับ', "That's OK, I'm not angry.", 'Your friend apologises for being late. Tell her it is OK, you are not angry.'),
      T('B', 'friend', 'ขอบคุณค่ะ', 'Thank you.')]),
    R(3, 'angry (reason)', 'explain-cause', 'B', 'friend', 'friend', 'polite-friendly', 'talking about a friend', 'Nida explains to her friend why their other friend is angry', [
      T('A', 'friend', 'เพื่อนคุณเป็นอะไรครับ', "What's wrong with your friend?"),
      T('B', 'friend', 'เขาโกรธเพราะเรามาสายค่ะ', "He's angry because we were late.", 'Your friend asks what is wrong with your other friend. Say he is angry because you were late.'),
      T('A', 'friend', 'งั้นไปขอโทษเขากันครับ', "Then let's go and apologise to him.")])] },
]
// Mandarin: a few lines changed so every word is taught (水 / 对 / 走 / 时候 were not) and no exchange ends on an unanswered question
const Z = ref.zh, byS = s => Z.find(t => t.target.surface === s)
byS('一点').recalls[0].exchange = [
  { voice: 'B', role: 'friend', target: true, text: '可以说慢一点吗？', pinyin: 'kěyǐ shuō màn yīdiǎn ma?', spoken: 'kéyǐ shuō màn yìdiǎn ma?', en: 'Could you speak a bit more slowly?', cue: 'Your friend is speaking too fast for you. Ask them to speak a bit more slowly.' },
  { voice: 'A', role: 'friend', text: '好，我说慢一点。', pinyin: 'hǎo, wǒ shuō màn yīdiǎn.', spoken: 'hǎo, wǒ shuō màn yìdiǎn.', en: "OK, I'll speak more slowly." }]
byS('一点').recalls[1].exchange[0] = { voice: 'A', role: 'friend', text: '你要不要喝？', pinyin: 'nǐ yào bù yào hē?', spoken: 'nǐ yào bu yào hē?', en: 'Do you want some?' }
byS('什么').recalls[0].exchange[1] = { voice: 'B', role: 'friend', text: '我喝这个。', pinyin: 'wǒ hē zhège.', en: "I'll have this one." }
byS('什么').recalls[2].exchange = [
  { voice: 'A', role: 'friend', target: true, text: '你说什么？', pinyin: 'nǐ shuō shénme?', en: 'What did you say?', cue: "You didn't catch what your friend just said. Ask what they said." },
  { voice: 'B', role: 'friend', text: '我说，我们明天去吧。', pinyin: 'wǒ shuō, wǒmen míngtiān qù ba.', en: "I said, let's go tomorrow." }]
byS('回').recalls[0].exchange[1] = { voice: 'A', role: 'friend', text: '不，我在这里等朋友。', pinyin: 'bù, wǒ zài zhèlǐ děng péngyou.', en: "No, I'm waiting for a friend here." }
byS('回').recalls[1].exchange = [
  { voice: 'B', role: 'friend', text: '你要去哪里？', pinyin: 'nǐ yào qù nǎlǐ?', en: 'Where are you going?' },
  { voice: 'A', role: 'friend', target: true, text: '我去朋友家，明天回来。', pinyin: 'wǒ qù péngyou jiā, míngtiān huí lái.', en: "I'm going to a friend's place; I'll be back tomorrow.", cue: "Your friend asks where you're going. Say you're going to a friend's place and will be back tomorrow." }]
byS('回').recalls[1].intent = { speaker: 'A', addressee: 'friend', relation: 'friend', register: 'casual', situation: 'leaving for a short trip', purpose: 'he tells his friend where he is going and when he will be back' }
fs.writeFileSync(P, JSON.stringify(ref, null, 1))
console.log('th recalls', ref.th.reduce((a, t) => a + t.recalls.length, 0), 'zh recalls', ref.zh.reduce((a, t) => a + t.recalls.length, 0))
