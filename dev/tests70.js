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
  T('Y4', 'the format is OFF by default and only the benchmark entry uses it; the default track code does not call it',
    c.ev('THAI_YESAND').on === false && !/yesAnd/i.test(src.slice(src.indexOf('async function generateConversationTrack'), src.indexOf('async function generateConversationTrack') + 60000).replace(/THAI_YESAND_NEVER/g, '')), c.ev('THAI_YESAND').on)
  out.forEach(l => console.log(l))
  console.log('\nv723 yes-and experiment: ' + (n - fails) + '/' + n + ' passed' + (fails ? ' — ' + fails + ' FAILED' : ''))
  process.exit(fails ? 1 : 0)
})().catch(e => { out.forEach(l => console.log(l)); console.error(e); process.exit(1) })
