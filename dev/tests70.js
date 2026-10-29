// v723 — owner's yes-and experiment (handover thai-yes-and-handover, 28 Oct). Behind THAI_YESAND.on (off): the default Daily track is untouched.
//   Y1   placement: every word 3 exposures in 2 conversations (2 + 1 mentions), a conversation carries exactly 2 words, gaps ≥ minGap + 1
//   Y2   per-line mechanical checks: particles, banned words, closed vocabulary, repeated phrase, mentions
//   Y3   a conversation is written line by line (mock model): gate + ledger + final check; a conversation that cannot be written is DROPPED
//   Y4   the test track maps to app pairs (one line = one pair with a cue) and the flag is off by default
//
//   node tests70.js            (current build: tt.compiled.js, or TT_FILE)
const fs = require('fs')
const { load } = require('./harness')
const FILE = process.env.TT_FILE || __dirname + '/tt.compiled.js'
const out = []; let n = 0, fails = 0
const T = (id, name, ok, got) => { n++; if (!ok) fails++; out.push((ok ? 'PASS ' : 'FAIL ') + id.padEnd(4) + ' ' + name + (ok ? '' : '\n       got: ' + JSON.stringify(got).slice(0, 500))) }

;(async () => {
  const c = load(FILE, { realBelt: true }); c.console.info = () => {}; c.console.warn = () => {}
  const src = fs.readFileSync(__dirname + '/tt.jsx', 'utf8')
  const plan = c.ev('yesAndPlan')
  const words = k => Array.from({ length: k }, (_, i) => ({ id: 100 + i, thai: 'w' + i }))
  {
    const p = plan(words(30)), per = new Map()
    p.convs.forEach(cv => cv.words.forEach(x => { if (!per.has(x.word.id)) per.set(x.word.id, []); per.get(x.word.id).push({ idx: cv.idx, m: x.mentions }) }))
    const ok = [...per.values()].every(v => v.length === 2 && v[0].m + v[1].m === 3 && Math.abs(v[0].idx - v[1].idx) >= 4 && Math.max(v[0].m, v[1].m) <= 2)
    T('Y1', '30 words → 30 conversations of 2 words; every word has 3 exposures in 2 conversations (2 + 1), at least 3 conversations apart; none names a word more than twice',
      p.convs.length === 30 && p.convs.every(cv => cv.words.length === 2) && ok && p.ok && p.gapMin >= 4 && p.lines === 180, { gapMin: p.gapMin, lines: p.lines })
    const small = plan(words(6))
    T('Y1', 'a track too small for the gap rule says so (ok = false) instead of silently placing the word closer', small.convs.length === 6 && small.ok === false && small.gapMin < 4, small.gapMin)
  }
  {
    // the closing particle follows the LAST clause (the D-run bridge 064: "จำได้หมดแล้วเหรอ เก่งจังเลยคะ" ended a statement with the question particle)
    const f = c.ev('yesAndFixParticles')
    const a = f({ speaker: 'B', thai: 'จำได้หมดแล้วเหรอ เก่งจังเลยคะ', english: "You've remembered them all? So impressive!" }).thai, b = f({ speaker: 'B', thai: 'ไปไหนดี', english: 'Where to?' }).thai
    T('Y5', 'a woman line whose LAST clause is a statement ends with ค่ะ even when an earlier clause is a question; a real question still ends with คะ', a === 'จำได้หมดแล้วเหรอ เก่งจังเลยค่ะ' && b === 'ไปไหนดีคะ', [a, b])
    const vocab = c.initVocab(), lex = c.ev('buildThaiPhoneticLexicon')(vocab)
    const r = c.ev('finaliseThaiTrackPhonetics')([{ speaker: 'B', thai: 'ฉันช่วยจำได้ค่ะ', phonetic: '', english: 'x', words: ['ฉัน', 'ช่วย', 'จำได้', 'ค่ะ'].map(w => ({ p: w, e: '' })) }], lex, () => {})
    T('Y5', 'จำได้ is read as two words (jam dâi), not one hyphenated block', /jam dâi/.test((r.pairs || r)[0].phonetic), (r.pairs || r)[0].phonetic)
  }
  {
    // 90 lines: 30 words, 4 per conversation → 15 conversations of 6 lines; every word still has 3 exposures in 2 conversations
    const p4 = plan(words(30), { perConv: 4 }), per = new Map()
    p4.convs.forEach(cv => cv.words.forEach(x => { if (!per.has(x.word.id)) per.set(x.word.id, []); per.get(x.word.id).push({ idx: cv.idx, m: x.mentions }) }))
    const okW = [...per.values()].every(v => v.length === 2 && v[0].idx !== v[1].idx && v[0].m + v[1].m === 3 && Math.abs(v[0].idx - v[1].idx) >= 4)
    T('Y1', 'perConv 4: 30 words → 15 conversations = 90 lines (the Daily length); every conversation carries 4 words, every word 3 exposures in 2 conversations at least 4 apart',
      p4.convs.length === 15 && p4.lines === 90 && p4.convs.every(cv => cv.words.length === 4) && okW && p4.ok, { n: p4.convs.length, lines: p4.lines, gapMin: p4.gapMin, sizes: p4.convs.map(c => c.words.length) })
  }
  {
    const vocab = c.initVocab(), taught = new Set(['ไป', 'กิน', 'ข้าว', 'ร้าน', 'นี้', 'ดี', 'ราคา', 'เท่าไหร่', 'ผม', 'ฉัน', 'ที่', 'ไหม'])
    vocab.forEach(w => { if (taught.has(w.thai)) { w.status = 'learning'; w.repCount = 5; w.lastSeen = Date.now() } else if (w.status !== 'locked') { w.status = 'new'; w.repCount = 0; w.lastSeen = null } })
    const tg = vocab.find(w => w.thai === 'ราคา'), vctx = c.buildThaiTrackVocabContext(vocab, [tg], [])
    const chk = (speaker, thai, prior) => c.ev('yesAndLineProblems')({ speaker, thai, english: thai.includes('ไหม') || thai.includes('เท่าไหร่') ? 'How much?' : 'ok' }, { vocab, vocabCtx: vctx, prior: prior || [], words: [tg] })
    T('Y2', 'particles: the man must end with ครับ, the woman with ค่ะ (คะ only on a question); two particles are refused',
      chk('A', 'ราคาเท่าไหร่ครับ').length === 0 && chk('A', 'ราคาเท่าไหร่ค่ะ').length > 0 && chk('B', 'ราคาดีค่ะ').length === 0 && chk('B', 'ราคาดีครับ').length > 0 && chk('B', 'ราคาเท่าไหร่คะ').length === 0 && chk('A', 'ราคาครับ ดีครับ').length > 0,
      [chk('A', 'ราคาเท่าไหร่ค่ะ'), chk('B', 'ราคาดีครับ')])
    T('Y2', 'banned words (โอเค, ต้องการ) and a word the learner was never taught (ตลาด) are refused', chk('A', 'โอเคครับ ราคาดี').length > 0 && chk('A', 'ผมไปตลาดครับ').some(x => /not taught/.test(x)), [chk('A', 'ผมไปตลาดครับ')])
    const rep = chk('A', 'ราคาของร้านนี้เท่าไหร่ครับ', [{ thai: 'ราคาของร้านนี้ดีมากค่ะ' }]), norep = chk('A', 'ร้านนี้เท่าไหร่ครับ', [{ thai: 'ราคาดีมากค่ะ' }])
    T('Y2', 'a 9-character phrase repeated from an earlier line of the conversation is refused; a line that shares only a short word with it is not', rep.some(x => /repeats a phrase/.test(x)) && !norep.some(x => /repeats a phrase/.test(x)), [rep, norep])
  }
  {
    // the model is mocked: a scene seed, six lines that pass, an always-coherent gate, and a clean final check
    const vocab = c.initVocab(); vocab.forEach(w => { if (w.status !== 'locked') { w.status = 'learning'; w.repCount = 5; w.lastSeen = Date.now() } })
    const wA = vocab.find(w => w.thai === 'ราคา'), wB = vocab.find(w => w.thai === 'ร้าน'), conv = { idx: 0, words: [{ word: wA, mentions: 2 }, { word: wB, mentions: 2 }] }
    const lines = ['ร้านนี้ราคาเท่าไหร่ครับ||How much is it at this shop?', 'ราคาดีค่ะ||The price is good.', 'ผมไปร้านนี้ได้ไหมครับ||Can I go to this shop?', 'ได้ค่ะ||Yes.', 'ผมกินข้าวครับ||I eat rice.', 'ดีค่ะ||Good.']
    let li = 0, calls = []
    // the mock answers the line NUMBER it is asked for (so a retry gets the same line)
    const call = async (stage, prompt) => { calls.push(stage); if (stage === 'Y_seed') return 'Two friends talk at a small shop.'; if (stage === 'Y_line') return lines[Number(/ONLY line (\d)/.exec(prompt)[1]) - 1]; if (stage === 'Y_gate') return '{"ok":true,"reason":"","facts":["a shop"]}'; return 'NONE' }
    const env = { ...c.ev('THAI_YESAND'), vocab, call, log: () => {}, ctxFor: ws => c.buildThaiTrackVocabContext(vocab, ws, []) , ctx: { complexity: c.getLearnerComplexityContract({ lang: 'th', vocab }) } }
    const r = await c.ev('yesAndConversation')(conv, env)
    T('Y3', 'a conversation is written one line at a time: 1 seed + per line (writer + gate) + 1 final check; the six lines alternate man / woman', r.ok === true && r.lines.length === 6 && r.lines.map(l => l.speaker).join('') === 'ABABAB' && calls.filter(x => x === 'Y_gate').length === 6 && calls.filter(x => x === 'Y_final').length === 1, { ok: r.ok, why: r.why, calls: calls.length })
    // the gate refuses every line → the conversation is dropped, never padded
    const call2 = async (stage, prompt) => { if (stage === 'Y_seed') return 'A seed.'; if (stage === 'Y_line') return lines[Number(/ONLY line (\d)/.exec(prompt)[1]) - 1]; if (stage === 'Y_gate') return '{"ok":false,"reason":"does not follow","facts":[]}'; return 'NONE' }
    const r2 = await c.ev('yesAndConversation')(conv, { ...env, call: call2, lineTries: 2, convTries: 1 })
    T('Y3', 'when the coherence gate refuses a line every time, the conversation is DROPPED (no lines, no padding)', r2.ok === false && r2.lines.length === 0 && /not coherent|line 1/.test(r2.why), r2.why)
    // a final-check problem rejects the whole conversation
    const call3 = async (stage, prompt) => stage === 'Y_final' ? 'PROBLEM|3|A|relies on a price nobody gave' : call(stage, prompt)
    const r3 = await c.ev('yesAndConversation')(conv, { ...env, call: call3, convTries: 1 })
    T('Y3', 'a problem in the final logic check drops the conversation', r3.ok === false && /final check/.test(r3.why), r3.why)
  }
  {
    // v723: the yes-and DAILY hooks live in the Daily generator, behind THAI_YESAND.daily (off); the test-track writer (yesAndTestTrack) is still only used by the benchmark entry
    const g0 = src.indexOf('async function generateConversationTrack'), body = src.slice(g0, g0 + 60000)
    T('Y4', 'the Daily is yes-and by default (v724: THAI_YESAND.daily on, bridge written with thinking); the free-written test-track writer stays OFF and the Daily generator reaches yes-and only through THAI_YESAND.daily (ordering and bridges), never the test-track writer',
      c.ev('THAI_YESAND').on === false && c.ev('THAI_YESAND').daily === true && c.ev('THAI_YESAND').bridgeThinking === true && !/yesAndTestTrack|yesAndConversation/.test(body) && /thaiYesAndBridges\(allPairs/.test(body) && /if \(THAI_YESAND\.daily && dailyV693On\(\)\)/.test(body), [c.ev('THAI_YESAND').on, c.ev('THAI_YESAND').daily])
  }
  {
    // v723: the final Daily line pass re-ran the clause-space collapser on module lines (ดี ฉันรอเริ่มค่ะ → ดีฉันรอเริ่มค่ะ); module lines keep their vetted spacing like the other two paths
    const i = src.indexOf("thai: l._moduleId ? l.thai : normaliseThaiSpacing(l.thai), phonetic: phon")
    T('Y6', 'the final line pass leaves vetted module lines unspaced-changed', i > 0 && c.ev('normaliseThaiSpacing')('ดี ฉันรอเริ่มค่ะ') === 'ดีฉันรอเริ่มค่ะ', i)
  }
  {
    // v724: the cue / English accuracy pass edits ONLY english + cue, refuses bad fixes (Thai script, wrong form, no change), and is off by default
    T('Y7', 'cue-fidelity is on by default for the Daily (v724)', c.ev('THAI_CUE_FIDELITY').on === true)
    const mk = (th, en, cue, sp) => ({ speaker: sp || 'A', thai: th, english: en, prompt: cue, pairType: 'content' })
    const pairs = [mk('ทำไมคุณตอบเขาไม่ได้คะ', 'Why can\'t you answer him?', 'Ask her why she can\'t answer him.', 'A'), mk('สิบบาทครับ', 'Just ten baht, please.', 'Say just ten baht, please.'), mk('จริงค่ะ', 'Really.', 'Say really.', 'B'), mk('แล้วเจอกันนะคะ', 'See you again.', 'Say see you again and you smile', 'B')]
    const reply = { fixes: [{ n: 2, english: 'Ten baht.', cue: 'Say it is ten baht.' }, { n: 3, cue: 'Say ทำ in Thai' }, { n: 4, cue: 'Say see you again.' }, { n: 1, english: 'Why can\'t you answer him?', cue: 'Ask her why she can\'t answer him.' }] }
    c.ev('geminiRequest = async function () { return JSON.stringify(' + JSON.stringify(reply) + ') }')
    const r = await c.ev('thaiCueFidelityPass')(pairs, { apiKey: 'x', model: 'm' })
    T('Y7', 'accurate fixes are applied; a fix with Thai script and a no-change fix are refused; the Thai is never touched',
      r.fixed === 2 && r.refused === 2 && pairs[1].english === 'Ten baht.' && pairs[1].prompt === 'Say it is ten baht.' && pairs[3].prompt === 'Say see you again.' && pairs[2].prompt === 'Say really.' && pairs[1].thai === 'สิบบาทครับ', JSON.stringify(r))
  }
  {
    // v724: opening / closing = the same greeting / parting from the vocabulary bank, A then B, used only in those two lines
    const POOL = c.ev('THAI_GREET_POOL'), line = c.ev('thaiGreetingLine'), cands = c.ev('thaiGreetingCandidates'), mkSd = () => ({ characterA: 'Somchai, a Thai man', characterB: 'Nida, a Thai woman', scene: 'x' })
    const bad = []
    POOL.forEach(e => ['A', 'B'].forEach(sp => {
      const th = line(e, sp), probs = c.ev('thaiFramingLineProblems')(th, sp)
      const cue = e[sp === 'A' ? 6 : 7].replace('{A}', 'Somchai').replace('{B}', 'Nida'), pair = { thai: th, english: e[3], prompt: cue }
      const cp = c.ev('thaiCueFormProblems')(pair).concat(c.ev('thaiCueEnglishBroken')(cue))
      if (probs.filter(x => !/recent/.test(x)).length || cp.length) bad.push([e[1], sp, probs, cp])
    }))
    T('Y8', 'every opening / closing phrase passes the framing-line checks and the cue checks for both speakers (' + POOL.length + ' phrases)', bad.length === 0, JSON.stringify(bad.slice(0, 3)))
    const noon = new Date(2026, 9, 29, 14, 0), night = new Date(2026, 9, 29, 22, 0), tg = [{ id: 5, thai: 'กิน' }]
    const open14 = cands('open', { now: noon, targets: tg }).map(e => e[1]), open22 = cands('open', { now: night, targets: tg }).map(e => e[1]), close22 = cands('close', { now: night, targets: tg }).map(e => e[1]), close14 = cands('close', { now: noon, targets: tg }).map(e => e[1])
    T('Y8', 'time-of-day phrases fit the hour: afternoon at 14:00 (not morning/evening); good night only in the evening', open14.includes('afternoon') && !open14.includes('morning') && !open14.includes('evening') && close22.includes('goodnight') && !close14.includes('goodnight') && cands('open', { now: new Date(2026, 9, 29, 18, 0), targets: tg }).some(e => e[1] === 'evening'), { open14, close14 })
    const sd = c.ev('thaiGreetingFraming')(mkSd(), { now: noon, targets: tg }), strip = x => x.replace(/(นะ)?(ครับ|ค่ะ|คะ)$/, '')
    T('Y8', 'A and B say the SAME phrase (own particle) at both ends, with the matching English and cues', strip(sd.opening) === strip(sd.reply) && strip(sd.closing) === strip(sd.closing_reply) && /ครับ$/.test(sd.opening) && /(ค่ะ|คะ)$/.test(sd.reply) && sd.opening_english === sd.reply_english && !/\{/.test(sd.opening_prompt + sd.reply_prompt + sd.closing_prompt + sd.closing_reply_prompt) && sd._framingSource.opening === 'vocab:greeting', JSON.stringify([sd.opening, sd.reply, sd.closing, sd.closing_reply]))
    const tg2 = [{ id: 1, thai: sd.opening.replace(/(ครับ)$/, '') }], sd2 = c.ev('thaiGreetingFraming')(mkSd(), { now: noon, targets: tg2 })
    T('Y8', 'a phrase that is one of the track\'s own target words is not used for the framing', strip(sd2.opening) !== strip(sd.opening), [sd.opening, sd2.opening])
    // the guard: a content line that already holds the closing phrase moves that end to another phrase
    const pairs = [{ speaker: 'A', thai: sd.opening, _pairKey: 'th-open-A', pairType: 'framing', _target: 'greeting' }, { speaker: 'B', thai: sd.reply, _pairKey: 'th-open-B', pairType: 'framing', _target: 'greeting' },
      { speaker: 'A', thai: 'ผมขอบคุณมากแล้วเจอกันที่ร้านครับ', pairType: 'content' },
      { speaker: 'A', thai: sd.closing, _pairKey: 'th-close-A', pairType: 'framing', _target: 'goodbye' }, { speaker: 'B', thai: sd.closing_reply, _pairKey: 'th-close-B', pairType: 'framing', _target: 'goodbye' }]
    const keep = sd.closing; const sd3 = { ...sd, _greetPick: { ...sd._greetPick, close: 'seeyou' } }; pairs[3].thai = 'แล้วเจอกันครับ'; pairs[4].thai = 'แล้วเจอกันค่ะ'
    const g = c.ev('thaiGreetingGuard')(pairs, sd3, { now: noon, targets: tg })
    T('Y8', 'the guard: a content line holding แล้วเจอกัน moves the closing to a phrase the track does not contain (both lines, same phrase)', g.swapped === 1 && !/แล้วเจอกัน/.test(pairs[3].thai) && strip(pairs[3].thai) === strip(pairs[4].thai) && pairs[3]._source === 'vocab:greeting', [pairs[3].thai, pairs[4].thai, keep])
  }
  out.forEach(l => console.log(l))
  console.log('\nv723 yes-and experiment: ' + (n - fails) + '/' + n + ' passed' + (fails ? ' — ' + fails + ' FAILED' : ''))
  process.exit(fails ? 1 : 0)
})().catch(e => { out.forEach(l => console.log(l)); console.error(e); process.exit(1) })
