// Step 0 — GOLDEN EVALUATION DATASET v1: material taken VERBATIM from the six historical 8-Oct-2026 v674 logs, each item
// with explicit expected verdicts on the eight rubric dimensions and error categories.
//
// LABEL PROVENANCE (stated per item):
//   annotator A = model "claude-opus-5-5" — the same model that wrote and reviewed the pipeline under test, so these labels
//   are NOT independent of the code being evaluated. humanReviewed=false on every item: no native speaker has reviewed
//   this dataset yet. The calibration report therefore cannot and does not claim native-speaker calibration.
// Each item's source (log file + line) is located automatically from its text, so it can be audited.
'use strict'
const fs = require('fs'), path = require('path')
const HIST = path.join(__dirname, '..', '..', 'historical', '2026-10-08-v674')
const LOG = { th: { daily: 'gen-log-2026-10-08T06-40-49.txt', listening: 'listening-log-2026-10-08T06-45-28.txt' },
  ja: { daily: 'japanese-gen-log-2026-10-08.txt', listening: 'listening-log-2026-10-08T06-33-32.txt' },
  zh: { daily: 'mandarin-gen-log-2026-10-08.txt', listening: 'listening-log-2026-10-08T06-31-46.txt' } }
const SPEAKERS = { th: 'A = Thai man (ผม / ครับ), B = Thai woman (ฉัน / ค่ะ, คะ); friends', ja: 'A and B are adult friends (plain, casual Japanese)', zh: 'A and B are friends (casual Mandarin)' }
const LEVEL = { th: '10th Kyu, sentences of 3–5 words', ja: '10th Kyu, 3–5 content units', zh: 'Mukyu (first 100 words), 2–4 words' }
// verdict shorthand → rubric values, in rubric order: grammar naturalness targetUsage cue qa coherence register usefulness
const MAP = [{ ok: 'ok', err: 'error' }, { nat: 'natural', marg: 'marginal', unnat: 'unnatural' }, { ok: 'correct', sense: 'wrong-sense', form: 'wrong-form', absent: 'absent', na: 'n/a' },
  { match: 'match', mis: 'mismatch', na: 'n/a' }, { ans: 'answers', no: 'does-not-answer', na: 'n/a' }, { coh: 'coherent', inc: 'incoherent', na: 'n/a' }, { ok: 'ok', err: 'error', na: 'n/a' },
  { use: 'useful', weak: 'weak', not: 'not-useful' }]
const KEYS = ['grammar', 'naturalness', 'targetUsage', 'cue', 'qa', 'coherence', 'register', 'usefulness']
const exp = s => Object.fromEntries(s.trim().split(/\s+/).map((v, i) => { const x = MAP[i][v]; if (!x) throw new Error('bad verdict ' + v + ' @' + i + ' in ' + s); return [KEYS[i], x] }))

// [language, track, origin, target, gloss, turns ("A: … / B: …" or a single sentence), cue|null, verdicts, categories, rationale]
const R = [
  // ── Mandarin Daily (recall sentences; speaker not fixed) ───────────────────────────────────────────────────────
  ['zh', 'daily', 'accepted', '可以', 'can', '这个可以吗？', null, 'ok nat ok na na na na use', [], 'Natural "Is this OK?".'],
  ['zh', 'daily', 'fallback', '可以', 'can', '我想可以。', 'I want to can', 'err unnat form mis na na na not', ['MISSING_ARGUMENT', 'TEMPLATE_FRAGMENT', 'CUE_MISMATCH'], '想 + 可以 needs a following verb; template output; the QC later rejected it.'],
  ['zh', 'daily', 'accepted', '可以', 'can', '你现在可以来吗？', null, 'ok nat ok na na na na use', [], 'Natural "Can you come now?".'],
  ['zh', 'daily', 'accepted', '到', 'arrive', '我到家了', null, 'ok nat ok na na na na use', [], 'Natural "I\'m home."'],
  ['zh', 'daily', 'accepted', '到', 'arrive', '你到哪里？', null, 'ok marg ok na na na na weak', ['UNIDIOMATIC'], 'Understandable; 你到哪儿了？ is the natural form.'],
  ['zh', 'daily', 'accepted', '到', 'arrive', '你到这里', 'You arrive here', 'ok marg ok match na na na weak', ['UNIDIOMATIC'], 'Bare statement/imperative, stilted without 来 or 了.'],
  ['zh', 'daily', 'accepted', '一点', 'a little', '我想要一点。', null, 'ok nat ok na na na na use', [], 'Natural.'],
  ['zh', 'daily', 'accepted', '一点', 'a little', '你慢一点', null, 'ok nat ok na na na na use', [], 'Natural "Slow down a bit".'],
  ['zh', 'daily', 'accepted', '少', 'few', '人太少了。', null, 'ok nat ok na na na na use', [], 'Natural.'],
  ['zh', 'daily', 'accepted', '太', 'too', '这个太快了', null, 'ok nat ok na na na na use', [], 'Natural.'],
  ['zh', 'daily', 'accepted', '一起', 'together', '我们一起吃吧？', null, 'ok nat ok na na na na use', [], 'Natural suggestion (吧 with a rising question is fine).'],
  ['zh', 'daily', 'accepted', '一起', 'together', '一起做', null, 'ok marg ok na na na na weak', ['TEMPLATE_FRAGMENT'], 'A fragment with no object or context.'],
  ['zh', 'daily', 'accepted', '回', 'return', '你回。', null, 'err unnat ok na na na na not', ['MISSING_ARGUMENT', 'TEMPLATE_FRAGMENT'], '回 needs a destination or 来/去; "你回。" is not said.'],
  ['zh', 'daily', 'fallback', '回', 'return', '你回家吗？', null, 'ok nat ok na na na na use', [], 'Natural; it was rejected 7× as a "same template" by a paid-attempt rule and then accepted unchanged as the fallback.'],
  ['zh', 'daily', 'fallback', '这个', 'this', '这个到。', null, 'err unnat sense na na na na not', ['SELECTIONAL_MISMATCH', 'TEMPLATE_FRAGMENT'], '"This arrive." — meaningless; it passed the QC group judge.'],
  ['zh', 'daily', 'fallback', '要', 'want', '我想要。', null, 'ok marg ok na na na na weak', ['TEMPLATE_FRAGMENT'], 'Possible as a reply in context, weak as a stand-alone recall.'],
  ['zh', 'daily', 'accepted', '做', 'do', '你做的好吗？', null, 'err unnat ok na na na na weak', ['GRAMMAR_MORPHOLOGY'], 'Should be 你做得好吗 (得 complement), and the question itself is odd.'],
  ['zh', 'daily', 'rejected-unverified', '好', 'good', '你很好', null, 'ok nat ok na na na na weak', [], 'Natural; removed only because the judge reply was unparseable (UNVERIFIED).'],
  ['zh', 'daily', 'rejected-unverified', '好', 'good', '嗯，好。', null, 'ok nat ok na na na na use', [], 'Natural agreement; removed as UNVERIFIED and replaced by templates.'],
  ['zh', 'daily', 'fallback', '好', 'good', '今天好。', null, 'err unnat ok na na na na not', ['TEMPLATE_FRAGMENT'], '"Today good." — template; replaced a natural line.'],
  ['zh', 'daily', 'fallback', '好', 'good', '好。', null, 'ok nat ok na na na na weak', ['TEMPLATE_FRAGMENT'], 'Fine as a reply, teaches little alone.'],
  ['zh', 'daily', 'accepted', '那个', 'that', '那个好吃吗？', null, 'ok nat ok na na na na use', [], 'Natural.'],
  ['zh', 'daily', 'accepted', '喝', 'drink', '你喝不喝？', null, 'ok nat ok na na na na use', [], 'Natural A-not-A question.'],
  ['zh', 'daily', 'accepted', '跟', 'with', '我跟你去。', null, 'ok nat ok na na na na use', [], 'Natural.'],
  // ── Mandarin Listening (planned "PROVEN" frames and accepted lines) ────────────────────────────────────────────
  ['zh', 'listening', 'proven-frame', '钱', 'money', 'A: 钱大吗？ / B: 很大。', null, 'ok unnat sense na ans inc na not', ['SELECTIONAL_MISMATCH'], '"Is money big?" — money is not big/small; nonsense exchange.'],
  ['zh', 'listening', 'proven-frame', '太', 'too', 'A: 你买什么？ / B: 我太买东西。', null, 'err unnat form na no inc na not', ['GRAMMAR_WORD_ORDER', 'NON_ANSWER'], '太 cannot modify 买东西; does not say what is bought.'],
  ['zh', 'listening', 'proven-frame', '昨天', 'yesterday', 'A: 我们昨天去这里吧。 / B: 好啊。', null, 'err unnat sense na na inc na not', ['TENSE_ASPECT_CONFLICT'], 'A proposal (吧) about yesterday; 去这里 is also odd.'],
  ['zh', 'listening', 'proven-frame', '跟', 'with', 'A: 你在哪里？ / B: 我跟在这里。', null, 'err unnat form na ans inc na not', ['MISSING_ARGUMENT'], '跟 needs an object (跟你/跟朋友).'],
  ['zh', 'listening', 'proven-frame', '跟', 'with', 'A: 你去哪里？ / B: 我跟去那里。', null, 'err unnat form na ans inc na not', ['MISSING_ARGUMENT'], '跟 needs an object.'],
  ['zh', 'listening', 'proven-frame', '找', 'look for', 'A: 一起找钱吗？ / B: 找。', null, 'ok unnat ok na ans inc na weak', ['UNIDIOMATIC'], '"Look for money together?" is a strange thing to propose.'],
  ['zh', 'listening', 'proven-frame', '在', 'be at', 'A: 你在哪里？ / B: 我在家。', null, 'ok nat ok na ans coh na use', [], 'Natural.'],
  ['zh', 'listening', 'proven-frame', '昨天', 'yesterday', 'A: 你昨天回家了吗？ / B: 回了。', null, 'ok nat ok na ans coh na use', [], 'Natural.'],
  ['zh', 'listening', 'proven-frame', '开', 'open', 'A: 我可以开吗？ / B: 可以。', null, 'ok marg ok na ans coh na weak', ['MISSING_ARGUMENT'], 'Fine only if the thing to open is visible; no object given.'],
  ['zh', 'listening', 'proven-frame', '为什么', 'why', 'A: 你为什么买东西？ / B: 太好了。', null, 'ok unnat ok na no inc na not', ['NON_ANSWER'], 'A why-question answered with "Great!".'],
  ['zh', 'listening', 'proven-frame', '谁', 'who', 'A: 你跟谁去？ / B: 我跟朋友去。', null, 'ok nat ok na ans coh na use', [], 'Natural.'],
  ['zh', 'listening', 'proven-frame', '用', 'use', 'A: 你用钱吗？ / B: 用。', null, 'ok unnat ok na ans inc na weak', ['UNIDIOMATIC'], '"Do you use money?" — odd question.'],
  ['zh', 'listening', 'proven-frame', '人', 'person', 'A: 你帮人吗？ / B: 帮。', null, 'ok unnat ok na ans inc na weak', ['UNIDIOMATIC'], '"Do you help people?" out of the blue.'],
  ['zh', 'listening', 'proven-frame', '怎么', 'how', 'A: 这个怎么来？ / B: 我不知道。', null, 'ok unnat ok na ans inc na weak', ['UNIDIOMATIC'], '这个怎么来的 / 你怎么来的 would be natural.'],
  ['zh', 'listening', 'patch', '一起', 'together', '我们一起去哪里？', null, 'ok nat ok na na na na use', [], 'Natural (accepted patch).'],
  ['zh', 'listening', 'proven-frame', '明天', 'tomorrow', 'A: 我们今天去吧。 / B: 明天好。 / A: 好，明天。', null, 'ok marg ok na ans coh na use', ['UNIDIOMATIC'], '明天吧 / 明天比较好 is the natural counter-proposal.'],
  ['zh', 'listening', 'proven-frame', '做', 'do', 'A: 你做什么？ / B: 我做工作。', null, 'ok unnat ok na ans coh na weak', ['UNIDIOMATIC'], '我在工作 / 我工作 — "我做工作" is unidiomatic.'],
  ['zh', 'listening', 'proven-frame', '小', 'small', 'A: 钱小吗？ / B: 很大。', null, 'ok unnat sense na ans inc na not', ['SELECTIONAL_MISMATCH'], 'Money small/big — nonsense.'],
  ['zh', 'listening', 'patch', '等', 'wait', '你等什么呢？', null, 'ok nat ok na na na na use', [], 'Natural (accepted patch).'],
  // ── Japanese Daily ─────────────────────────────────────────────────────────────────────────────────────────────
  ['ja', 'daily', 'accepted', 'どう', 'how', 'これ、どう思う？', null, 'ok nat ok na na na ok use', [], 'Natural.'],
  ['ja', 'daily', 'accepted', 'どう', 'how', '今日、どう？', null, 'ok nat ok na na na ok use', [], 'Natural.'],
  ['ja', 'daily', 'accepted', 'なんで', 'why', 'なんで行かないの？', null, 'ok nat ok na na na ok use', [], 'Natural.'],
  ['ja', 'daily', 'accepted', 'どっち', 'which', 'じゃあ、どっちにする？', null, 'ok nat ok na na na ok use', [], 'Natural.'],
  ['ja', 'daily', 'accepted', 'どっち', 'which way', 'え、駅はどっち？', null, 'ok nat ok na na na ok use', [], 'Natural.'],
  ['ja', 'daily', 'fallback', 'どれ', 'which one', 'どれが好き？', null, 'ok nat ok na na na ok use', [], 'Natural (fallback).'],
  ['ja', 'daily', 'fallback', 'あれ', 'that over there', 'あれ、高い？', null, 'ok nat ok na na na ok use', [], 'Natural (fallback).'],
  ['ja', 'daily', 'fallback', '乗る', 'ride', '何時に乗る？', null, 'ok nat ok na na na ok use', [], 'Natural (fallback).'],
  ['ja', 'daily', 'fallback', '飲む', 'drink', '今日、飲む？', null, 'ok nat ok na na na ok use', [], 'Natural casual invitation to drink (fallback).'],
  ['ja', 'daily', 'fallback', '分かる', 'understand', '明日分かる？', null, 'ok marg ok na na na ok weak', ['TEMPLATE_FRAGMENT'], '"Will you know tomorrow?" — possible only with context; template origin.'],
  ['ja', 'daily', 'fallback', 'いい', 'good', 'いいよ。', null, 'ok nat ok na na na ok use', [], 'Natural.'],
  ['ja', 'daily', 'fallback', 'いいえ', 'no', 'いいえ、大丈夫。', null, 'ok nat ok na na na ok use', [], 'Natural.'],
  ['ja', 'daily', 'accepted', 'また', 'again', 'また、ここ、好きだよ。', null, 'ok unnat sense na na na ok weak', ['WRONG_SENSE', 'UNIDIOMATIC'], 'また does not fit; the sentence is odd.'],
  ['ja', 'daily', 'accepted', '電話', 'phone', '電話、まだ使ってないんだ。', null, 'ok marg ok na na na ok weak', ['UNIDIOMATIC'], 'Understandable but contextless.'],
  ['ja', 'daily', 'accepted', 'たぶん', 'probably', 'たぶん、もう行っちゃう？', null, 'ok unnat ok na na na ok weak', ['UNIDIOMATIC'], 'たぶん in a question to the listener is odd.'],
  ['ja', 'daily', 'accepted', 'いいえ', 'no', 'いいえ、大丈夫じゃない。', null, 'ok nat ok na na na ok use', [], 'Natural.'],
  ['ja', 'daily', 'accepted', 'ごめん', 'sorry', 'ごめん、今日、暇じゃないんだ。', null, 'ok nat ok na na na ok use', [], 'Natural.'],
  ['ja', 'daily', 'accepted', 'うん', 'yeah', 'うん、いいよ。じゃあ、また明日ね。', null, 'ok nat ok na na na ok use', [], 'Natural.'],
  ['ja', 'daily', 'accepted', 'ありがとう', 'thank you', 'わあ、これ、ありがとう。', null, 'ok nat ok na na na ok use', [], 'Natural.'],
  ['ja', 'daily', 'accepted', 'すみません', 'excuse me', 'すみません、あれ、何？', null, 'ok marg ok na na na err weak', ['REGISTER_POLITENESS'], 'すみません with casual 何？ mixes registers.'],
  // ── Japanese Listening (planned frames) ───────────────────────────────────────────────────────────────────────
  ['ja', 'listening', 'proven-frame', 'どれ', 'which one', 'A: どれを見る？ / B: 本を見る。', null, 'ok marg ok na ans coh ok weak', ['UNIDIOMATIC'], '本 is read (読む), not "looked at".'],
  ['ja', 'listening', 'proven-frame', '欲しい', 'want', 'A: 映画、欲しい？ / B: うん、欲しい。', null, 'ok unnat sense na ans inc ok not', ['SELECTIONAL_MISMATCH'], 'You do not "want (to possess)" a movie with 欲しい.'],
  ['ja', 'listening', 'proven-frame', '昨日', 'yesterday', 'A: いつ行った？ / B: 昨日、行った。', null, 'ok nat ok na ans coh ok use', [], 'Natural.'],
  ['ja', 'listening', 'proven-frame', 'あそこ', 'over there', 'A: あそこに行く？ / B: うん、行く。', null, 'ok nat ok na ans coh ok use', [], 'Natural.'],
  ['ja', 'listening', 'proven-frame', 'できる', 'can', 'A: 日本語、できる？ / B: うん、できる。', null, 'ok nat ok na ans coh ok use', [], 'Natural.'],
  ['ja', 'listening', 'proven-frame', '何時', 'what time', 'A: 何時に行く？ / B: 明日、行く。', null, 'ok unnat ok na no inc ok weak', ['QA_TYPE_MISMATCH'], 'A clock time is asked; a day is given.'],
  ['ja', 'listening', 'proven-frame', 'なんで', 'why', 'A: 映画、なんで見るの？ / B: 好きだから。', null, 'ok nat ok na ans coh ok use', [], 'Natural.'],
  ['ja', 'listening', 'proven-frame', 'たぶん', 'probably', 'A: 行く？ / B: たぶん行く。', null, 'ok nat ok na ans coh ok use', [], 'Natural.'],
  ['ja', 'listening', 'proven-frame', 'はい', 'yes', 'A: 電車とバス、ある？ / B: はい、ある。', null, 'ok marg ok na ans coh err weak', ['REGISTER_POLITENESS'], 'はい + plain ある between friends is a register mix; うん expected.'],
  ['ja', 'listening', 'proven-frame', 'また', 'again', 'A: また写真、見ようか？ / B: いいね。', null, 'ok marg ok na ans coh ok weak', ['UNIDIOMATIC'], 'Plausible only with prior context.'],
  ['ja', 'listening', 'proven-frame', 'どう', 'how', 'A: 車、どう？ / B: いいね。', null, 'ok nat ok na ans coh ok use', [], 'Natural.'],
  ['ja', 'listening', 'proven-frame', 'ごめん', 'sorry', 'A: ごめん。 / B: 大丈夫。', null, 'ok nat ok na ans coh ok use', [], 'Natural.'],
  ['ja', 'listening', 'proven-frame', 'まだ', 'still', 'A: まだ行く？ / B: 行く。', null, 'ok marg ok na ans coh ok weak', ['UNIDIOMATIC'], 'Possible but bare.'],
  ['ja', 'listening', 'proven-frame', 'いくら', 'how much', 'A: これ、いくら？ / B: 高いね。', null, 'ok nat ok na no inc ok weak', ['NON_ANSWER'], 'The price is asked; a comment is given.'],
  ['ja', 'listening', 'proven-frame', 'もう', 'already', 'A: もうご飯、買った？ / B: いいえ、買わなかった。', null, 'ok unnat ok na ans coh ok weak', ['TENSE_ASPECT_CONFLICT'], 'After もう…た the natural negative is まだ (買ってない), not 買わなかった.'],
  ['ja', 'listening', 'proven-frame', 'お金', 'money', 'A: お金、あるよ。 / B: 本当？', null, 'ok nat ok na na coh ok weak', [], 'Natural but thin.'],
  // ── Thai Daily ────────────────────────────────────────────────────────────────────────────────────────────────
  ['th', 'daily', 'quota-recovery', 'กังวล', 'to worry', 'B: คุณกังวลไหมคะ', null, 'ok nat ok na na na ok use', [], 'Natural.'],
  ['th', 'daily', 'quota-recovery', 'คะ', 'polite question particle (female)', 'B: คุณจะไปตลาดเมื่อไหร่คะ', null, 'ok nat ok na na na ok use', [], 'Natural; คะ correctly on a female question.'],
  ['th', 'daily', 'quota-recovery', 'คะ', 'polite question particle (female)', 'B: อันนี้หมายถึงอะไรคะ', null, 'ok nat ok na na na ok use', [], 'Natural.'],
  ['th', 'daily', 'rejected', 'คะ', 'polite question particle (female)', 'A: ผมอยากไปตลาดใหม่คะ', null, 'ok unnat ok na na na err not', ['REGISTER_GENDER_PARTICLE'], 'ผม (male) with คะ (female question particle) on a statement.'],
  ['th', 'daily', 'quota-recovery', 'คุ้ม', 'worthwhile', 'B: ครั้งนี้ไปทางนั้นคุ้มไหมคะ', null, 'ok marg ok na na na ok weak', ['UNIDIOMATIC'], 'Stilted.'],
  ['th', 'daily', 'quota-recovery', 'คู่', 'pair', 'A: ผมอยากได้เสื้อคู่หนึ่งครับ', null, 'err unnat sense na na na ok weak', ['CLASSIFIER_ERROR'], 'Shirts are counted with ตัว; คู่ is for pairs.'],
  ['th', 'daily', 'quota-recovery', 'รถเมล์', 'bus', 'A: ผมจะไปตลาดใหม่ด้วยรถเมล์ครับ', null, 'ok marg ok na na na ok use', ['UNIDIOMATIC'], 'นั่งรถเมล์ไป is more natural.'],
  ['th', 'daily', 'quota-recovery', 'หน้าต่าง', 'window', 'B: หน้าต่างห้องนอนใหญ่ไหมคะ', null, 'ok nat ok na na na ok use', [], 'Natural.'],
  ['th', 'daily', 'quota-recovery', 'หวัง', 'hope', 'B: คุณมีหวังว่าจะได้อะไรคะ', null, 'err unnat form na na na ok weak', ['GRAMMAR_MORPHOLOGY'], 'มีหวัง means "have a chance"; คุณหวังว่า… intended.'],
  ['th', 'daily', 'quota-recovery', 'เบา', 'light', 'B: กระเป๋าใบนี้เบาดีค่ะ', null, 'ok nat ok na na na ok use', [], 'Natural.'],
  ['th', 'daily', 'quota-recovery', 'ใบ', 'classifier (flat things)', 'B: นี่คือตั๋วรถเมล์ใบหนึ่งค่ะ', null, 'ok marg ok na na na ok weak', ['UNIDIOMATIC'], 'Stilted textbook phrasing.'],
  ['th', 'daily', 'quota-recovery', 'ใบ', 'classifier (flat things)', 'A: คุณมีตั๋วรถเมล์กี่ใบครับ', null, 'ok nat ok na na na ok use', [], 'Natural.'],
  ['th', 'daily', 'quota-recovery', 'ไฟ', 'light / electricity', 'A: ผมหวังว่าไฟจะพอครับ', null, 'ok marg ok na na na ok weak', ['UNIDIOMATIC'], 'Odd without context.'],
  ['th', 'daily', 'rejected', 'ไฟ', 'light / electricity', 'B: อาหารนี้ไฟดีมากค่ะ', null, 'ok unnat sense na na na ok not', ['WRONG_SENSE'], 'ไฟ used as if it meant something about food.'],
  ['th', 'daily', 'rejected', 'ตัว', 'classifier (animals / things)', 'B: ตั๋วรถเมล์ตัวนี้กี่ใบคะ', null, 'err unnat form na na na ok not', ['CLASSIFIER_ERROR'], 'Tickets take ใบ, and the sentence mixes two classifiers.'],
  ['th', 'daily', 'rejected', 'คู่', 'pair', 'B: ฉันจะซื้ออาหารอีกคู่นะคะ', null, 'ok unnat sense na na na ok not', ['WRONG_SENSE'], 'Food is not bought in pairs.'],
  // ── Thai Listening (planned frames and accepted patches) ───────────────────────────────────────────────────────
  ['th', 'listening', 'proven-frame', 'แก่', 'old (people)', 'A: นี่เป็นอย่างไรครับ / B: แก่มากค่ะ', null, 'ok unnat sense na ans inc ok not', ['SELECTIONAL_MISMATCH'], 'แก่ is for people/animals; "this is very old (aged)" is wrong.'],
  ['th', 'listening', 'proven-frame', 'คุณอายุเท่าไหร่', 'how old are you', 'A: คุณอายุเท่าไหร่ครับ / B: สิบปีค่ะ', null, 'ok nat ok na ans coh ok use', [], 'Natural exchange (odd between adults who are 10 — content only).'],
  ['th', 'listening', 'proven-frame', 'ไปที่', 'go to', 'A: ไปที่ไหนครับ / B: ที่นั่นค่ะ', null, 'ok marg ok na ans coh ok weak', ['UNIDIOMATIC'], '"ไปไหนครับ" is more natural; "over there" is a vague answer.'],
  ['th', 'listening', 'proven-frame', 'น่าดู', 'worth seeing', 'A: พิพิธภัณฑสถานแห่งชาติน่าดูไหมครับ / B: น่าดูค่ะ', null, 'ok nat ok na ans coh ok use', [], 'Natural (formal place name).'],
  ['th', 'listening', 'proven-frame', 'นักท่องเที่ยว', 'tourist', 'A: เรียกนักท่องเที่ยวไหมครับ / B: เรียกค่ะ', null, 'ok unnat ok na ans inc ok not', ['UNIDIOMATIC'], '"Do you call tourists?" — meaningless here.'],
  ['th', 'listening', 'proven-frame', 'สิบเอ็ดโมงเช้า', '11 a.m.', 'A: สิบโมงเช้าไปกันไหมครับ / B: สิบเอ็ดโมงเช้าดีกว่าค่ะ / A: ได้สิบเอ็ดโมงเช้านะครับ', null, 'ok nat ok na ans coh ok use', [], 'Natural proposal, counter-proposal and agreement.'],
  ['th', 'listening', 'proven-frame', 'ศูนย์', 'zero', 'A: ศูนย์ตลกไหมครับ / B: ไม่เชิงตลกค่ะ', null, 'ok unnat sense na ans inc ok not', ['SELECTIONAL_MISMATCH', 'WRONG_SENSE'], '"Is zero/the centre funny?" — nonsense.'],
  ['th', 'listening', 'proven-frame', 'นานเท่าไหร่', 'how long', 'A: ทางนานเท่าไหร่ครับ / B: สิบนาทีค่ะ', null, 'ok marg ok na ans coh ok weak', ['UNIDIOMATIC'], 'ไปนานเท่าไหร่ / ใช้เวลานานเท่าไหร่ is natural.'],
  ['th', 'listening', 'proven-frame', 'รถแท็กซี่', 'taxi', 'A: อันนั้นอะไรครับ / B: อันนั้นคือรถแท็กซี่ค่ะ', null, 'ok marg ok na ans coh ok weak', ['UNIDIOMATIC'], 'อันนั้น for a vehicle and the คือ answer are stilted.'],
  ['th', 'listening', 'proven-frame', 'ทานกันเลย', "let's eat", 'A: ทานกันเลยครับ / B: ได้ค่ะ', null, 'ok nat ok na ans coh ok use', [], 'Natural.'],
  ['th', 'listening', 'proven-frame', 'ผัดไทย', 'pad thai', 'A: ผัดไทยอยู่ที่ไหนครับ / B: อยู่ร้านอาหารค่ะ', null, 'ok marg ok na ans coh ok weak', ['UNIDIOMATIC'], 'Odd question about where pad thai "is".'],
  ['th', 'listening', 'proven-frame', 'ขนาด', 'size', 'A: ชอบขนาดครับ / B: จริงเหรอคะ', null, 'ok unnat ok na na inc ok not', ['UNIDIOMATIC'], '"(I) like size" — incomplete and unnatural.'],
  ['th', 'listening', 'proven-frame', 'ใบเสร็จ', 'receipt', 'A: ใบเสร็จราคาเท่าไหร่ครับ / B: พันบาทค่ะ', null, 'ok unnat sense na ans inc ok not', ['SELECTIONAL_MISMATCH'], 'A receipt has no price.'],
  ['th', 'listening', 'proven-frame', 'นม', 'milk', 'A: นมเป็นอย่างไรครับ / B: ตลกมากค่ะ', null, 'ok unnat ok na ans inc ok not', ['SELECTIONAL_MISMATCH'], '"How is the milk?" — "Very funny."'],
  ['th', 'listening', 'proven-frame', 'บัตร', 'card / ticket', 'A: ซื้อนมหรือบัตรครับ / B: ซื้อบัตรค่ะ', null, 'ok marg ok na ans coh ok weak', ['UNIDIOMATIC'], 'Milk-or-card choice has no situation.'],
  ['th', 'listening', 'proven-frame', 'เบอร์โทรศัพท์', 'phone number', 'A: เบอร์โทรศัพท์อะไรครับ / B: ห้าสามสามสองสองหนึ่งค่ะ', null, 'ok marg ok na ans coh ok weak', ['UNIDIOMATIC'], 'เบอร์อะไร is natural; a 6-digit number is not a Thai phone number.'],
  ['th', 'listening', 'patch', 'ไม่เชิง', 'not exactly', 'A: มีนามบัตรไหมครับ / B: ไม่เชิงมีค่ะ มีแต่ใบเสร็จค่ะ', null, 'ok unnat form na ans coh ok weak', ['UNIDIOMATIC'], '"ไม่เชิงมี" is not idiomatic.'],
  ['th', 'listening', 'patch', 'สิบโมงเช้า', '10 a.m.', 'A: เราไปกันตอนสิบเอ็ดโมงเช้าดีไหมครับ / B: สิบโมงเช้าก็ดีค่ะ', null, 'ok nat ok na ans coh ok use', [], 'Natural.'],
  ['th', 'listening', 'patch', 'ขนาด', 'size', 'A: ขนาดกำลังดีครับ', null, 'ok nat ok na na na ok use', [], 'Natural "The size is just right."'],
]

function parseTurns(s) {
  return s.split(' / ').map(t => { const m = t.match(/^([AB]): (.+)$/); return m ? { speaker: m[1], text: m[2].trim() } : { speaker: null, text: t.trim() } })
}
function locate(lang, track, turns) {
  const f = LOG[lang][track], lines = fs.readFileSync(path.join(HIST, f), 'utf8').split('\n')
  const probe = turns[0].text.replace(/[。？！]$/, '')
  const i = lines.findIndex(l => l.includes(probe))
  return { file: f, line: i >= 0 ? i + 1 : null }
}
const items = R.map((r, k) => {
  const [language, trackType, origin, target, gloss, text, cue, verdicts, categories, rationale] = r
  const turns = parseTurns(text)
  return { id: language + '-' + trackType + '-' + String(k + 1).padStart(3, '0'), language, trackType, kind: turns.length > 1 ? 'exchange' : 'sentence',
    level: LEVEL[language], speakers: SPEAKERS[language], target: { surface: target, gloss }, turns, cue: cue || null, context: null,
    source: { ...locate(language, trackType, turns), origin }, expected: exp(verdicts), errorCategories: categories, rationale,
    labels: [{ by: 'model:claude-opus-5-5', role: 'annotator A — author of the pipeline under review (NOT independent)', date: '2026-10-08' }],
    humanReviewed: false, humanReview: null }
})
const out = { format: 'tt-golden/1', version: 'golden-v1', rubric: require('../rubric').RUBRIC_VERSION, createdAt: '2026-10-08',
  provenance: 'Material verbatim from the six historical 8-Oct-2026 v674 logs. Labels: model annotator A only. No native-speaker review yet — human review pending (humanReviewed=false on every item).',
  counts: ['th', 'ja', 'zh'].flatMap(l => ['daily', 'listening'].map(t => l + '-' + t + ' ' + items.filter(i => i.language === l && i.trackType === t).length)),
  items }
if (require.main === module) {
  fs.writeFileSync(path.join(__dirname, 'golden-v1.json'), JSON.stringify(out, null, 1))
  const unloc = items.filter(i => !i.source.line)
  console.log('items ' + items.length + ' · ' + out.counts.join(' · ') + ' · not located in log: ' + (unloc.map(i => i.id + ' ' + i.turns[0].text).join(', ') || 'none'))
}
module.exports = { items }
