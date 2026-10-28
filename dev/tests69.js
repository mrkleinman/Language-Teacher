// v722 — owner's Phase 1 (26 Oct): the app-side slips from the D18–D20 reviews, and the module-led Listening prototype
//   P1   goodbye cue: a name repeated in brackets is written once; "Say goodbye" is never kept over a Thai line with no goodbye
//   P2   romanisation: แต่ dtàae, เพิ่ง phôoeng, ตอนกลางคืน dtaawn glaang-khuuen (a token the dictionary lacks is read from its parts),
//        ได้เลย / จริงเหรอ / ก็ได้ read as two words (no over-hyphenation)
//
//   node tests69.js            (current build: tt.compiled.js, or TT_FILE)
const fs = require('fs')
const { load } = require('./harness')
const FILE = process.env.TT_FILE || __dirname + '/tt.compiled.js'
const out = []; let n = 0, fails = 0
const T = (id, name, ok, got) => { n++; if (!ok) fails++; out.push((ok ? 'PASS ' : 'FAIL ') + id.padEnd(4) + ' ' + name + (ok ? '' : '\n       got: ' + JSON.stringify(got).slice(0, 400))) }

;(async () => {
  const c = load(FILE, { realBelt: true }); c.console.info = () => {}; c.console.warn = () => {}
  const src = fs.readFileSync(__dirname + '/tt.jsx', 'utf8')
  const tidy = c.ev('thaiCueTidy')
  {
    const a = tidy('Thank Somchai and say you will see Somchai (Somchai) again.', 'ขอบคุณครับ แล้วเจอกันนะครับ')
    T('P1', 'a name repeated in brackets straight after itself is written once (the D19 closing cue)', a === 'Thank Somchai and say you will see Somchai again.', a)
    const b = tidy('Say goodbye to Nida and tell her to take care of herself.', 'ดูแลตัวเองด้วยนะครับ')
    T('P1', '"Say goodbye to X and …" over a Thai line with no goodbye keeps only what the line says', b === 'Tell her to take care of herself.', b)
    const k = tidy('Say goodbye to Nida and tell her to take care of herself.', 'ไว้เจอกันนะครับ ดูแลตัวเองด้วย')
    T('P1', 'a line that does say goodbye keeps its "Say goodbye" cue; a bare "Say goodbye" is never emptied', k.startsWith('Say goodbye') && tidy('Say goodbye', 'ครับ') === 'Say goodbye', [k, tidy('Say goodbye', 'ครับ')])
    const m = c.ev('thaiFinalCueTidyPass')([{ speaker: 'A', thai: 'ดูแลตัวเองนะครับ', prompt: 'Say goodbye and take care' }, { speaker: 'B', thai: 'ค่ะ', prompt: 'Agree' }])
    T('P1', 'the final pass tidies the cue of a track line and leaves other lines untouched; it is wired after the final particle pass and after final recovery',
      m.fixed === 1 && m.pairs[0].prompt === 'Take care' && m.pairs[1].prompt === 'Agree' && /thaiFinalCueTidyPass\(t\.pairs\)/.test(src) && /thaiFinalCueTidyPass\(fp0\.pairs\)/.test(src), m.pairs.map(p => p.prompt))
  }
  {
    const vocab = c.initVocab(), lex = c.ev('buildThaiPhoneticLexicon')(vocab)
    const mk = (thai, toks) => ({ speaker: 'A', thai, phonetic: '', english: 'x', words: toks.map(t => ({ p: t, e: '' })) })
    const r = c.ev('finaliseThaiTrackPhonetics')([
      mk('สะพานนี้สวยมากตอนกลางคืนครับ', ['สะพาน', 'นี้', 'สวย', 'มาก', 'ตอนกลางคืน', 'ครับ']), mk('ได้เลยครับ', ['ได้เลย', 'ครับ']), mk('จริงเหรอคะ', ['จริงเหรอ', 'คะ']),
      mk('ไปก็ได้ครับ', ['ไป', 'ก็ได้', 'ครับ']), mk('ผมเพิ่งไปแต่ไม่ได้ครับ', ['ผม', 'เพิ่ง', 'ไป', 'แต่', 'ไม่ได้', 'ครับ'])], lex, () => {})
    const ph = (r.pairs || r).map(p => p.phonetic)
    T('P2', 'ตอนกลางคืน (one token the dictionary lacks) is read from its words: dtaawn glaang-khuuen, not the model\'s "tòn klaang khuun"', /dtaawn glaang-khuuen/.test(ph[0]) && !/tòn/.test(ph[0]), ph[0])
    T('P2', 'ได้เลย / จริงเหรอ / ก็ได้ are two words each (dâi looei, jing rǒoe, gâw dâi), not hyphenated blocks', /dâi looei/.test(ph[1]) && /jing rǒoe/.test(ph[2]) && /gâw dâi/.test(ph[3]), ph.slice(1, 4))
    T('P2', 'แต่ is dtàae and เพิ่ง is phôoeng (the app\'s own convention for แ and long əə)', /dtàae/.test(ph[4]) && /phôoeng/.test(ph[4]) && !/dtàe\b/.test(ph[4]), ph[4])
    T('P2', 'none of the five lines has a pronunciation issue', (r.pairs || r).every(p => !(p._pronIssues || []).length), (r.pairs || r).map(p => (p._pronIssues || []).length))
  }
  {
    // v723 (owner: "use the word jointly — together makes me want to say duai gan")
    const G = c.ev('THAI_USAGE_TARGET_GUIDE')['ร่วมกัน'] || ''
    T('P3', 'ร่วมกัน is taught as "jointly": the word card says jointly (not "together, jointly") and the writer is told to say "jointly" in the English and the cue, never "together" (that is ด้วยกัน)',
      /"jointly"/.test(G) && /NEVER "together"/.test(G) && /ด้วยกัน/.test(G) && /\['ร่วมกัน', 'jointly',/.test(src) && !/\['ร่วมกัน', 'together/.test(src), G.slice(0, 120))
  }
  out.forEach(l => console.log(l))
  console.log('\nv722 Phase 1 (cue + romanisation) and the module-led Listening prototype: ' + (n - fails) + '/' + n + ' passed' + (fails ? ' — ' + fails + ' FAILED' : ''))
  process.exit(fails ? 1 : 0)
})().catch(e => { out.forEach(l => console.log(l)); console.error(e); process.exit(1) })
