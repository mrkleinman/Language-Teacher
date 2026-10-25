// v715 — regressions from the owner's review of the live v714 Thai Daily track (23 Oct, 5.8/10) and the D12 check run
//   R1   a cue for a line about a third person (เขา) names the listener after "Ask" and says "that person" (lines 28 / 36)
//   R2   a cue-judge repair that brings back a defect the deterministic checks catch is refused (the lint and the judge undid each
//        other six times and the judge's wrong "Somchai respects you" was saved)
//   R3   "let she look" is broken English: caught and fixed to "let her look" (line 77)
//   R4   ใครดื่มเหล้าไหมคะ (a question word + ไหม) is refused; มีใคร…ไหม / ใคร…คะ / รู้ไหมว่า…กี่โมง pass (line 43)
//   R5   three uses, not three copies: a greeting opening two lines (3–5), an echo (84–86) and a question asked back (90–92) are
//        refused; the owner's good examples (ป่วย 63–65, ไว้ 72–74) pass
//   R6   recent-lesson repeats: a sentence from the last saved tracks (exact or nearly the same) is refused; short everyday lines are not
//   R7   greetings / goodbyes are written fresh: the scene plan's own lines are used when they pass, "ฉันดีมาก" does not pass, a failing
//        pair with no fresh replacement is left out — the four set pieces are never used; the provenance says where each came from
//   R8   the final speaker-order pass puts every exchange in A–B–A (D12: two exchanges went out A–A–A)
//   R9   D13: a swapped line changes ผม / ฉัน wherever it stands (Thai has no spaces) but not ผม = hair, and the cue's pronouns follow
//   R11  D13: lines written by the final recovery (after the speaker-order pass) also take their A–B–A seat before they are judged
//   R12  D15 (owner's review, line 94): a parting is a set phrase — "See you then." is cued "Say see you then.", never "Say see them then."
//   R10  D13: recovered lines for the same word from two recovery cycles get different keys (th-654-q1-1-s0 twice → NOT_READY)
//
//   node tests66.js            (current build: tt.compiled.js, or TT_FILE)
const fs = require('fs')
const { load } = require('./harness')
const out = []; let fails = 0, n = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + String(id).padEnd(4) + ' ' + name + (!pass && detail !== undefined ? '\n      ' + JSON.stringify(detail).slice(0, 700) : '')) }
const FILE = process.env.TT_FILE || 'tt.compiled.js'

;(async () => {
  const c = load(FILE, { realBelt: true }); c.console.info = () => {}; c.console.warn = () => {}
  const src = fs.readFileSync(__dirname + '/tt.jsx', 'utf8')
  const lint = c.ev('thaiFinalCueLint'), defects = c.ev('thaiCueDefects'), broken = c.ev('thaiCueEnglishBroken')
  const oB = { addr: 'm', addrName: 'Somchai', names: ['Somchai', 'Nida'] }, oA = { addr: 'f', addrName: 'Nida', names: ['Somchai', 'Nida'] }

  {
    const p28 = { speaker: 'B', thai: 'ทำไมเคารพเขามากขนาดนั้นคะ', english: 'Why do you respect him so much?', prompt: 'Ask why Somchai respects you so much.' }
    const p36 = { speaker: 'B', thai: 'ให้กำลังใจเขาตอนไหนคะ', english: 'When do you encourage him?', prompt: 'Ask when Somchai encourages you.' }
    const r28 = lint(p28, oB), r36 = lint(p36, oB)
    T('R1', 'lines 28 / 36: "Ask why Somchai respects you so much." → "Ask Somchai why he respects that person so much." (the listener named after Ask, เขา = "that person"); no defect left',
      r28.cue === 'Ask Somchai why he respects that person so much.' && r36.cue === 'Ask Somchai when he encourages that person.' && !defects(r28.cue, p28, oB).length && !defects(r36.cue, p36, oB).length,
      { r28: r28.cue, r36: r36.cue })
  }
  {
    const p = { speaker: 'B', thai: 'ทำไมเคารพเขามากขนาดนั้นคะ', english: 'Why do you respect him so much?' }
    const good = 'Ask Somchai why he respects that person so much.', bad = 'Ask why Somchai respects you so much.'
    T('R2', 'the judge\'s "repair" back to "…respects you" carries a defect the lint catches and the lint\'s cue has none, so the repair is refused (and the refusal is in the audit path)',
      defects(bad, p, { addr: 'm' }).includes('ADDRESSEE_AS_YOU') && !defects(good, p, { addr: 'm' }).length && /CUE_REPAIR_REFUSED/.test(src) && /bad\(_rep\.cue\) && !bad\(p\.prompt/.test(src))
  }
  {
    const p77 = { speaker: 'A', thai: 'มีครับ ผมให้ดูข้อมูลไหมครับ', english: 'Yes, shall I let you look at the information?', prompt: 'Say yes, then ask if you should let she look at the information.' }
    const r = lint(p77, oA)
    T('R3', 'line 77: "let she look" is caught as broken English and becomes "let her look"; "make sure him" style rules still apply, "let her look" is not flagged',
      broken(p77.prompt).length > 0 && r.cue === 'Say yes, then ask if you should let her look at the information.' && !broken(r.cue).length, { cue: r.cue, broken: broken(p77.prompt) })
  }
  {
    const lx = c.ev('thaiLexicalSenseProblems'), ids = t => lx({ thai: t, english: 'x' }).map(x => x.id)
    const bad = ['ใครดื่มเหล้าไหมคะ', 'กี่โมงไหมคะ', 'ทำไมไม่มาไหมครับ'], good = ['มีใครดื่มเหล้าไหมคะ', 'ใครดื่มเหล้าคะ', 'รู้ไหมว่ากี่โมงคะ', 'คุณจำได้ไหมว่าเขาออกไปกี่โมงคะ', 'ไปกินข้าวไหมครับ', 'ใครก็ได้ไหมคะ']
    const missed = bad.filter(t => !ids(t).includes('WH_PLUS_MAI')), fp = good.filter(t => ids(t).includes('WH_PLUS_MAI'))
    T('R4', 'line 43: ใครดื่มเหล้าไหมคะ (and กี่ / ทำไม + ไหม) are refused; มีใคร…ไหม, ใคร…คะ, รู้ไหมว่า…กี่โมง, จำได้ไหมว่า…กี่โมง pass', !missed.length && !fp.length, { missed, fp })
  }
  {
    const f = c.ev('thaiExchangeVarietyProblems'), L = a => a.map(t => ({ thai: t }))
    const greet = f(L(['สวัสดีทุกคนครับ วันนี้ดีใจมากครับ', 'ฉันก็ดีใจค่ะ สวัสดีทุกคนนะคะ', 'สวัสดีทุกคนครับ ขอบคุณมากครับ']), 'สวัสดีทุกคน')
    const echo = f(L(['ผมดีใจที่ได้คุยกันอีกครับ', 'คุณดีใจที่ได้คุยกันอีกใช่ไหมคะ', 'จริงครับ ผมก็ดีใจที่ได้คุยกันอีกครับ']), 'ดีใจที่ได้คุยกันอีก')
    const back = f(L(['ช่วยถือของให้หน่อยได้ไหมครับ', 'ได้ค่ะ ช่วยดูของให้หน่อยได้ไหมคะ', 'ได้ครับ ช่วยดูให้ได้ไหมครับ']), 'ช่วย...ได้ไหม')
    const ok1 = f(L(['วันนี้คุณป่วยไหมครับ', 'วันนี้ฉันป่วย ไปหาไม่ได้ค่ะ', 'ป่วยก็อยู่บ้านนะครับ']), 'ป่วย')
    const ok2 = f(L(['ผมจองตั๋วเครื่องบินไว้ครับ', 'คุณจองไว้ที่ไหนคะ', 'ผมจองที่นี่ไว้ครับ']), 'ไว้')
    const ok3 = f(L(['ช่วยถือของให้หน่อยได้ไหมครับ', 'ได้ค่ะ ช่วยดูของให้หน่อยได้ไหมคะ', 'ได้ครับ แล้วช่วยปิดประตูให้ได้ไหมครับ']), 'ช่วย...ได้ไหม')
    T('R5', 'lines 3–5 (สวัสดีทุกคน opens two lines), 84–86 (ดีใจที่ได้คุยกันอีก echoed) and 90–92 (the question asked back) are refused; ป่วย 63–65, ไว้ 72–74 and a NEW request in line 3 pass; the writer is told "three uses, not three copies"',
      greet.length && echo.length && back.length && !ok1.length && !ok2.length && !ok3.length && /Each line adds something NEW — never an echo/.test(src), { greet, echo, back, ok1, ok2, ok3 })
  }
  {
    await c.ev('stSet')('tt-tracks', [{ pairs: [{ thai: 'ผมจองตั๋วเครื่องบินไว้ครับ' }, { thai: 'วันนี้อากาศร้อนมากเลยนะครับ' }, { thai: 'ได้ครับ' }] }])
    await c.ev('thaiLoadRecentLines')(null)
    const rr = c.ev('thaiRecentRepeat')
    T('R6', 'a sentence from a recent lesson is refused (exact: ผมจองตั๋วเครื่องบินไว้ครับ; the same sentence with another particle: วันนี้อากาศร้อนมากเลยค่ะ; nearly the same: วันนี้อากาศร้อนมากๆ เลยนะครับ); a short everyday line (ได้ครับ) and a new sentence are not; the history is not offered as content',
      rr('ผมจองตั๋วเครื่องบินไว้ครับ') === 'exact' && rr('วันนี้อากาศร้อนมากเลยค่ะ') === 'exact' && rr('วันนี้อากาศร้อนมากๆ เลยนะครับ') === 'near' && rr('ได้ครับ') === null && rr('พรุ่งนี้ผมจะไปตลาดครับ') === null &&
      /used only to refuse repeats, never as content/.test(src), { a: rr('ผมจองตั๋วเครื่องบินไว้ครับ'), b: rr('วันนี้อากาศร้อนมากเลยค่ะ'), c: rr('วันนี้อากาศร้อนมากๆ เลยนะครับ') })
    await c.ev('stSet')('tt-tracks', []); await c.ev('thaiLoadRecentLines')(null)
  }
  {
    const fp = c.ev('thaiFramingLineProblems'), ff = c.ev('thaiFreshFraming')
    const sd = { scene: 'x', characterA: 'Somchai, a Thai man', characterB: 'Nida, a Thai woman', opening: 'สวัสดีครับ นิดา สบายดีไหมครับ', reply: 'สบายดีค่ะ ขอบคุณค่ะ', closing: 'แล้วเจอกันพรุ่งนี้นะครับ', closing_reply: 'ค่ะ เดินทางปลอดภัยนะคะ' }
    const keep = await ff(sd, {}, null)
    const bad = await ff({ ...sd, reply: 'ฉันดีมากค่ะ' }, {}, null)
    const gen = fs.readFileSync(__dirname + '/tt.jsx', 'utf8').match(/async function generateConversationTrack[\s\S]{0,1500}/)[0]
    T('R7', 'the scene plan\'s own greeting / goodbye are kept (provenance ai:scene); "ฉันดีมากค่ะ" fails, and with no fresh pair that passes the greeting pair is left out (never a set piece); generateConversationTrack no longer calls the set-piece framing',
      !fp(sd.opening, 'A').length && fp('ฉันดีมากค่ะ', 'B').length > 0 && keep.opening === sd.opening && keep._framingSource.opening === 'ai:scene' && keep._framingSource.closing_reply === 'ai:scene' &&
      bad.opening === '' && bad.reply === '' && bad.closing === sd.closing && !/thaiBankFraming\(/.test(gen) && /thaiFreshFraming\(/.test(gen),
      { keep: keep._framingSource, bad: [bad.opening, bad.reply] })
  }
  {
    const f = c.ev('thaiFinalSpeakerOrderPass')
    const P = (sp, th, pr, id) => ({ speaker: sp, thai: th, english: 'x', prompt: pr, targetId: id, _target: 'สิบ', pairType: 'content' })
    const r = f([P('A', 'ผมซื้อสิบตัวครับ', 'Say you will buy ten.', 7), P('A', 'ผมจ่ายสิบบาทครับ', 'Tell her you will pay ten baht.', 7), P('A', 'ผมมีเงินสิบบาทครับ', 'Say you have ten baht.', 7),
      P('A', 'ไปกันครับ', 'x', 8), P('B', 'ไปไหนคะ', 'x', 8), P('A', 'ตลาดครับ', 'x', 8)])
    T('R8', 'D12\'s A–A–A exchange becomes A–B–A (the middle line ฉันจ่ายสิบบาทค่ะ, cue "Tell him …"); a correct exchange is untouched; a changed line is no longer its judged text, so the final revalidation judges it',
      r.fixed === 1 && r.pairs[1].speaker === 'B' && r.pairs[1].thai === 'ฉันจ่ายสิบบาทค่ะ' && r.pairs[1].prompt === 'Tell him you will pay ten baht.' && r.pairs.slice(3).map(p => p.speaker).join('') === 'ABA' &&
      src.indexOf('thaiFinalSpeakerOrderPass(t.pairs)') < src.indexOf("'cue-revalidation (final)'"), r.pairs.map(p => p.speaker + ':' + p.thai))
  }

  {
    const f = c.ev('thaiFinalSpeakerOrderPass')
    const P = (sp, th, pr, id) => ({ speaker: sp, thai: th, english: 'x', prompt: pr, targetId: id, _target: 'วันศุกร์', pairType: 'content' })
    const r = f([P('A', 'วันศุกร์ไปไหมครับ', 'Ask her if she will go on Friday.', 9), P('A', 'วันศุกร์ผมไม่ได้ไปครับ', 'Tell her her plan is off: you are not going.', 9), P('A', 'วันศุกร์ผมไปตัดผมครับ', 'Say you get a haircut on Friday.', 9),
      P('B', 'ถ้าว่างฉันช่วยได้ค่ะ', 'Tell him he can ask you.', 10), P('B', 'ช่วยอะไรครับ', 'x', 10), P('A', 'ช่วยยกของครับ', 'x', 10)])
    const sw = r.pairs
    T('R9', 'D13 "วันศุกร์ผมไม่ได้ไปค่ะ": the swapped line reads วันศุกร์ฉันไม่ได้ไปค่ะ, its cue "Tell him his plan …"; ผม = hair stays (ตัดผม); a B line moved to A reads ผม…ครับ',
      sw[1].thai === 'วันศุกร์ฉันไม่ได้ไปค่ะ' && sw[1].prompt === 'Tell him his plan is off: you are not going.' && sw[3].thai === 'ถ้าว่างผมช่วยได้ครับ' && sw[3].prompt === 'Tell her she can ask you.' &&
      sw.slice(0, 3).map(p => p.speaker).join('') === 'ABA', sw.map(p => p.speaker + ':' + p.thai + ' | ' + p.prompt))
    const hair = c.ev('thaiSwapFirstPerson')('ผมไปตัดผมมาครับผม', 'B')
    T('R9', 'ผมไปตัดผมมาครับผม as a female line: ฉันไปตัดผมมาค่ะ (the pronoun swaps, the hair word does not)', hair === 'ฉันไปตัดผมมาค่ะ', hair)
    // the recovery prompt runs only against a live model, so the key itself is checked where it is built: a running number is part of it
    const k = src.match(/_pairKey: 'th-' \+ kw\.wordId \+ '-q'[^\n]*/)
    T('R10', 'a quota-recovery line key carries a running number, so a second recovery cycle for the same word cannot reuse th-654-q1-1-s0',
      !!k && /\+\+_thQuotaKeySeq/.test(k[0]), k && k[0].slice(0, 160))
  }

  {
    // structural: the final recovery runs only after a live judge refuses a line, so the order of the steps is checked in the source
    const a = src.indexOf("const qf = await enforceTrackPairQuota(t, adapter, { ...c, quotaRounds: 1 })"), so = src.indexOf('thaiFinalSpeakerOrderPass(t.pairs)', a),
      m2 = src.indexOf('const m2 = await adapter.finaliseMetadata', a), rv2 = src.indexOf("'cue-revalidation (after final recovery)'", a)
    T('R11', 'after the final recovery the speaker-order and particle passes run, then pronunciation, then the replacement lines are judged',
      a > 0 && so > a && so < m2 && m2 < rv2, [a, so, m2, rv2].join(' '))
  }

  {
    const rep = c.ev('thaiLocalCueRepair'), strict = en => c.ev('cueFromEnglish')('th', en, 'x', { names: [], addr: 'm', strict: true })
    const cases = [['See you then.', 'Say see you then.'], ['See you tomorrow.', 'Say see you tomorrow.'], ['Goodbye, see you!', 'Say goodbye, see you.'], ['See you on Friday.', 'Say see you on Friday.']]
    T('R12', 'a parting keeps its "you": See you then / tomorrow / Goodbye, see you / on Friday are cued "Say see you …" (the local cue repair and the strict builder), while a real object ("Thank you very much.") is still "Thank him"',
      cases.every(([en, want]) => rep({ english: en, thai: 'แล้วเจอกันค่ะ', speaker: 'B', prompt: 'Say see you then and say you are leaving.' }) === want && strict(en) === want) && strict('Thank you very much.') === 'Thank him very much.',
      cases.map(([en]) => [rep({ english: en, thai: 'x', speaker: 'B', prompt: 'a b c d' }), strict(en)]))
  }

  out.forEach(l => console.log(l))
  console.log('\nv715 Thai Daily owner-review (23 Oct) regressions: ' + (n - fails) + '/' + n + ' passed' + (fails ? ' — ' + fails + ' FAILED' : ''))
  process.exit(fails ? 1 : 0)
})().catch(e => { out.forEach(l => console.log(l)); console.error(e); process.exit(1) })
