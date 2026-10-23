// v716 — the owner's Thai speaking guide (23 Oct) and the word-list decisions that came with it
//   G1   the guide is in the app with the owner's three decisions: a formal lesson word is used formally, no พี่ as "I", เธอ practised as "she"
//   G2   the exchange writer's prompt starts with the guide; the replacement writer, scene polish and greetings get it; judges and
//        Japanese prompts do not
//   G3   the guide is its own cached block in front of the writer's cached rules (two cache marks); Gemini gets plain text
//   G4   the guide's example sentences are refused like a recent-lesson repeat (they illustrate a rule, never lesson content)
//   G5   word list: conversation glue (ล่ะ เหรอ งั้น เดี๋ยว อ้าว แล้วกัน …) passes the closed-vocabulary gate untaught; the written words
//        การ / ความ / อย่างไร / สามารถ / เมื่อ / พบ no longer pass unless taught
//
//   node tests67.js            (current build: tt.compiled.js, or TT_FILE)
const fs = require('fs')
const { load } = require('./harness')
const FILE = process.env.TT_FILE || __dirname + '/tt.compiled.js'
const out = []; let n = 0, fails = 0
const T = (id, name, ok, got) => { n++; if (!ok) fails++; out.push((ok ? 'PASS ' : 'FAIL ') + id.padEnd(4) + ' ' + name + (ok ? '' : '\n       got: ' + JSON.stringify(got).slice(0, 400))) }

;(async () => {
  const c = load(FILE, { realBelt: true }); c.console.info = () => {}; c.console.warn = () => {}
  const src = fs.readFileSync(__dirname + '/tt.jsx', 'utf8')
  const G = c.ev('THAI_SPEAKING_GUIDE'), GM = c.ev('PROMPT_GUIDE_MARK'), CM = c.ev('PROMPT_CACHE_MARK')

  T('G1', 'the guide carries the owner\'s decisions: formal lesson word used formally, no พี่ว่า as "I", เธอ as "she"; the rest is the owner\'s text',
    G.length > 15000 && /lesson word always comes first/.test(G) && /สามารถ, อย่างไร, เมื่อ/.test(G) && !/พี่ว่า/.test(G) && /when เธอ is the lesson word, use it as "she"/.test(G) &&
    !/never "she"/.test(G) && /Question words take no ไหม/.test(G) && /Spoken words, not written ones/.test(G), G.length)

  {
    const f = c.ev('thaiGuideMessages'), th = [{ role: 'user', content: 'เขียนประโยคใหม่ ผมไปตลาด' }]
    const rec = f(th, 'H_recovery'), pol = f(th, 'F_scene_polish'), fr = f(th, 'th_framing'), judge = f(th, 'NATURALNESS_CHECK'), cue = f(th, 'CUE_CHECK')
    const ja = f([{ role: 'user', content: '次の文を直して 日本語' }], 'H_recovery'), twice = f(rec, 'H_recovery')
    T('G2', 'the replacement writer, polish and greetings get the guide in front; the naturalness and cue judges and a Japanese prompt do not; never twice',
      [rec, pol, fr].every(m => m[0].content.startsWith(G + GM)) && [judge, cue, ja].every(m => !m[0].content.includes(GM)) && twice[0].content.split(GM).length === 2,
      [rec, pol, fr, judge, cue, ja].map(m => m[0].content.includes(GM)))
    T('G2', 'the exchange writer\'s cached rules start with the guide (its requests have no stage label, so it is added where the rules are built)',
      /const _stableSystem = thaiGuidePrefix\(\) \+ 'You write Pimsleur-style Thai lessons\. '/.test(src))
  }

  {
    const cb = c.ev('anthropicCacheBlocks'), strip = c.ev('stripPromptCacheMark')
    const b = cb(G + GM + 'RULES' + CM + 'TARGET'), b1 = cb(G + GM + 'only a guide and a prompt')
    T('G3', 'two cached blocks (guide, then the writer\'s rules) and the per-target tail; a guide-only prompt is one cached block plus the prompt; Gemini text has no marks',
      b.length === 3 && b[0].text === G && b[0].cache_control && b[1].text === 'RULES' && b[1].cache_control && b[2].text === 'TARGET' && !b[2].cache_control &&
      b1.length === 2 && b1[0].cache_control && !b1[1].cache_control && !strip('a' + GM + 'b' + CM + 'c').includes('⁤') && !strip('a' + GM + 'b' + CM + 'c').includes('⁣'),
      b.map(x => [x.text.slice(0, 12), !!x.cache_control]))
  }

  {
    c.ev('stSet') && await c.ev('stSet')('tt-tracks', [])
    await c.ev('thaiLoadRecentLines')(null)
    const rep = c.ev('thaiRecentRepeat'), ex = c.ev('thaiGuideExampleLines')()
    T('G4', 'the guide\'s examples are refused as copies (ส่งงานแล้วหรือยังครับ, อยู่กรุงเทพมาสามปีแล้วครับ, the ✘ ร้านนี้ปิดกี่โมงไหมครับ); a new sentence and a short line are not',
      ex.length > 100 && rep('ส่งงานแล้วหรือยังครับ') === 'exact' && rep('อยู่กรุงเทพมาสามปีแล้วค่ะ') === 'exact' && rep('ร้านนี้ปิดกี่โมงไหมครับ') === 'exact' &&
      rep('พรุ่งนี้ผมจะไปซื้อผลไม้ที่ตลาดครับ') === null && rep('ได้ครับ') === null, [ex.length, rep('ส่งงานแล้วหรือยังครับ'), rep('พรุ่งนี้ผมจะไปซื้อผลไม้ที่ตลาดครับ')])
  }

  {
    // a learner who has been taught only a few words: the gate allows glue words and refuses untaught written words
    // (กัน / ก่อน / คุณ are curriculum words, so the learner is given them; แล้วคุณล่ะ is itself a curriculum phrase, so the test says คุณล่ะ)
    const vocab = c.initVocab(), taught = new Set(['ไป', 'กิน', 'ข้าว', 'ร้าน', 'นี้', 'ดี', 'พรุ่งนี้', 'ทำงาน', 'วันนี้', 'กัน', 'ก่อน', 'คุณ'])
    vocab.forEach(w => { if (taught.has(w.thai)) { w.status = 'learning'; w.repCount = 5; w.lastSeen = Date.now() } else if (w.status !== 'locked') { w.status = 'new'; w.repCount = 0; w.lastSeen = null } })
    const ctx = c.buildThaiTrackVocabContext(vocab, [vocab.find(w => w.thai === 'กิน')], [])
    const blockedOf = th => (c.validateThaiVocabulary([{ thai: th }], ctx).blocked || []).map(b => b.token || b)
    const glue = ['ไปครับ คุณล่ะครับ', 'ไปเหรอคะ', 'งั้นไปกินข้าวกันครับ', 'เดี๋ยวไปครับ', 'อ้าว ร้านนี้ไม่ดีเหรอคะ', 'งั้นไปร้านนี้แล้วกันค่ะ', 'กินข้าวก่อนดีกว่าครับ'].map(t => [t, blockedOf(t)])
    const written = [['การกินข้าว', 'การ'], ['ความดี', 'ความ'], ['ไปอย่างไรครับ', 'อย่างไร'], ['เมื่อไปทำงานครับ', 'เมื่อ']].map(([t, w]) => [t, w, blockedOf(t)])
    T('G5', 'conversation glue passes the closed-vocabulary gate before its lesson (ล่ะ เหรอ งั้น เดี๋ยว อ้าว แล้วกัน ดีกว่า)', glue.every(([, b]) => !b.length), glue.filter(([, b]) => b.length))
    T('G5', 'untaught written words are refused: การ / ความ (nouns from verbs), อย่างไร, เมื่อ', written.every(([, w, b]) => b.includes(w)), written)
  }

  out.forEach(l => console.log(l))
  console.log('\nv716 Thai speaking guide: ' + (n - fails) + '/' + n + ' passed' + (fails ? ' — ' + fails + ' FAILED' : ''))
  process.exit(fails ? 1 : 0)
})().catch(e => { out.forEach(l => console.log(l)); console.error(e); process.exit(1) })
