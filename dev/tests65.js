// v713 — regressions from the owner's review of the live v712 Thai Daily track (5.0/10, NOT_READY 89/90)
//   R1   the closing-particle repair keeps the line's judged verdicts (the live เชื่อ line went stale, was re-judged and dropped → 89/90)
//   R2   greeting / goodbye set pieces are left as written by that repair; นะ gets นะคะ, never นะค่ะ
//   R3   the owner's flagged sentences are caught by the lexical rules (applied while writing, not only in the final audit);
//        the natural versions are not
//   R4   a line the scene critic's polish changed and the final judge refuses gets its original back
//   R5   the final cue revalidation is followed by a bounded recovery that replaces a removed line
//   R6   เขา (he / she / they) is a teachable target with its own teaching contract
//   R7   refilled lines alternate speakers; ในสัปดาห์ / colour-without-classifier rules (D7 blind reviews)
//   R8   no repeated phrase across an exchange, line 1 starts fresh, dish classifiers, กัน in invitations (D8 blind reviews)
//   R9   the exchange checks do not burn the track budget (D9b ran out at US$0.40: 117 exchange writes, two checks alternating)
//
//   node tests65.js            (current build: tt.compiled.js, or TT_FILE)
const fs = require('fs')
const { load } = require('./harness')
const out = []; let fails = 0, n = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + String(id).padEnd(4) + ' ' + name + (!pass && detail !== undefined ? '\n      ' + JSON.stringify(detail).slice(0, 700) : '')) }
const FILE = process.env.TT_FILE || 'tt.compiled.js'

;(async () => {
  const c = load(FILE, { realBelt: true }); c.console.info = () => {}; c.console.warn = () => {}
  const key = c.ev('_semCacheKey'), stale = c.ev('thaiStaleCuePairs'), pass = c.ev('thaiFinalParticlePass')

  {
    // the live v712 line, as it stood when it was judged (no closing particle), with verdicts keyed to that exact text
    const p = { pairId: 'p-chuea-3', pairType: 'content', speaker: 'A', thai: 'เชื่อผมไหมครับ จองดีกว่า', english: 'Believe me? Booking is better.', prompt: 'Ask her to believe you; booking is better.', targetId: 20, _target: 'เชื่อ', _targetSense: 'believe' }
    p._semVerdicts = { cue: { key: key('cue', p), v: { s: 5 } }, nat: { key: key('nat', p), v: { s: 4 } } }
    const r = pass([p]), q = r.pairs[0]
    T('R1', 'the closing-particle repair adds ครับ and moves the judged verdicts to the new text, so the final cue revalidation does not judge (and drop) the line again',
      r.fixed === 1 && q.thai === 'เชื่อผมไหมครับ จองดีกว่าครับ' && stale([q]).length === 0 && q._semVerdicts.cue.key === key('cue', q) && q._semVerdicts.nat.key === key('nat', q),
      { thai: q.thai, stale: stale([q]).length })
  }
  {
    const fr = { pairId: 'th-close-name', pairType: 'framing', _framing: true, speaker: 'A', thai: 'สวัสดีครับ คุณมานพ', english: 'Hello, Manop.' }
    const b = { pairId: 'p-b', pairType: 'content', speaker: 'B', thai: 'ไปกันนะ', english: 'Let us go.', targetId: 1, _target: 'ไป' }
    const r = pass([fr, b])
    T('R2', 'greeting / goodbye set pieces keep their text; a B line ending in นะ gets นะคะ (never นะค่ะ)',
      r.pairs[0].thai === 'สวัสดีครับ คุณมานพ' && r.pairs[1].thai === 'ไปกันนะคะ', r.pairs.map(p => p.thai))
  }
  {
    const lx = c.ev('thaiLexicalSenseProblems')
    const ids = (t, e) => lx({ thai: t, english: e }).map(x => x.id)
    const bad = [['คุณเจ็บท้องมากครับ', 'You have a bad stomachache.', 'PUAT_NOT_JEP'], ['โรงพยาบาลอะไรก็ได้ครับ', 'Any hospital is fine.', 'PLACE_NAI_KO_DAI'],
      ['ฉันหวังว่าไม่ต้องไปโรงพยาบาลใช่ไหมคะ', "I hope we don't have to go to hospital, right?", 'HOPE_TAG_QUESTION'], ['ผมไม่เชื่อ โรงแรมเต็มครับ', "I don't believe the hotel is full.", 'CHUEA_WAA'],
      ['ผมจองโต๊ะอันนี้เก้าโมงเช้าครับ', 'I booked this table for 9 a.m.', 'TO_CLASSIFIER_TUA'], ['คุณกินยาไหมครับ', 'Did you take your medicine?', 'DONE_NEEDS_LAEW']]
    const good = [['ผมปวดท้องครับ', 'I have a stomachache.'], ['โรงพยาบาลไหนก็ได้ครับ', 'Any hospital is fine.'], ['ผมไม่เชื่อว่าโรงแรมเต็มครับ', "I don't believe the hotel is full."],
      ['ผมจองโต๊ะตัวนี้ครับ', 'I booked this table.'], ['คุณกินยาแล้วหรือยังครับ', 'Did you take your medicine?'], ['เชื่อผมไหมครับ', 'Do you believe me?'], ['ผมไม่เชื่อครับ', "I don't believe it."], ['ชอบไหมครับ', 'Did you like it?']]
    const missed = bad.filter(([t, e, id]) => !ids(t, e).includes(id)).map(x => x[0])
    const falsePos = good.filter(([t, e]) => ids(t, e).some(i => /PUAT|PLACE_NAI|HOPE_TAG|CHUEA|TO_CLASS|DONE_NEEDS/.test(i))).map(x => x[0])
    const src = fs.readFileSync(__dirname + '/tt.jsx', 'utf8')
    T('R3', 'the owner\'s v712 sentences are caught (ปวด not เจ็บ, ไหนก็ได้, no ใช่ไหม on หวังว่า, เชื่อว่า, โต๊ะตัวนี้, …แล้วหรือยัง) and the natural versions pass; the rules also run while the exchange is written',
      !missed.length && !falsePos.length && /lexical rules the final audit applies are applied here/.test(src), { missed, falsePos })
  }
  {
    const rb = c.ev('thaiRevertBrokenEdits')
    const before = [{ pairId: 'a', thai: 'น้ำปลาอยู่ที่ไหนครับ' }, { pairId: 'b', thai: 'ข้างบนมีน้ำปลาค่ะ' }]
    const after = [{ pairId: 'a', thai: 'น้ำปลาอยู่ตรงไหนครับ' }, { pairId: 'b', thai: 'ป้ายนั้นบอกว่าโรงแรมไหมคะ' }]
    const r = rb(before, [], after, [{ pairId: 'b', thai: 'ป้ายนั้นบอกว่าโรงแรมไหมคะ' }], null)
    const src = fs.readFileSync(__dirname + '/tt.jsx', 'utf8')
    T('R4', 'a line the critic\'s polish changed that the final judge refuses gets its original back (an accepted edit stays), and the critic round uses this guard',
      r.reverted === 1 && r.pairs[1].thai === 'ข้างบนมีน้ำปลาค่ะ' && r.pairs[0].thai === 'น้ำปลาอยู่ตรงไหนครับ' && /rv0 = thaiRevertBrokenEdits\(_preCritic, \[\], t\.pairs/.test(src), r.pairs.map(p => p.thai))
  }
  {
    const src = fs.readFileSync(__dirname + '/tt.jsx', 'utf8')
    const i = src.indexOf("'cue-revalidation (final)'"), j = src.indexOf('FINAL_RECOVERY', i), k = src.indexOf('enforceTrackPairQuota(t, adapter', i)
    T('R5', 'after the final cue revalidation, a removed line goes to one bounded quota-recovery round (its pronunciation built, the new line judged), before the quota is counted',
      i > 0 && k > i && j > k && src.indexOf('const quota = trackQuotaReport(t.pairs, kws, adapter, c)', i) > j, { i, k, j })
  }
  {
    const V = c.ev('RAW_VOCAB'), w = V.find(v => v.t === 'เขา'), el = c.ev('thaiVocabEligibility')({ ...w, thai: w.t, english: w.e })
    T('R6', 'เขา (he / she / they) is eligible as a target and has its own teaching contract (a third person, never the person spoken to)',
      el.ok && /THIRD PERSON/.test(c.ev('THAI_FUNCTION_TARGET_GUIDE')['เขา'] || ''), el)
  }

  {
    // D7 blind reviews (6.5 / 6.1): two refilled เขา lines were both B (A–B–B); ในสัปดาห์ for "this week"; สีเหลืองนั้น for "that yellow one"
    const lx = c.ev('thaiLexicalSenseProblems'), ids = t => lx({ thai: t, english: 'x' }).map(x => x.id)
    const src = fs.readFileSync(__dirname + '/tt.jsx', 'utf8')
    T('R7', 'several refilled lines continue the exchange in turn (no speaker twice in a row); ในสัปดาห์ and ชอบสีเหลืองนั้น are caught, สัปดาห์นี้ / อันสีเหลืองนั้น pass',
      /several refilled lines continue the exchange in turn/.test(src) && ids('ในสัปดาห์ผมมีประชุมสามวันครับ').includes('NAI_SAPDAA') && !ids('สัปดาห์นี้ผมมีประชุมครับ').includes('NAI_SAPDAA') &&
      ids('ผมชอบสีเหลืองนั้นครับ').includes('COLOUR_NEEDS_CLASSIFIER') && !ids('ผมชอบอันสีเหลืองนั้นครับ').includes('COLOUR_NEEDS_CLASSIFIER'))
  }

  {
    // D8 blind reviews (6.1 / 6.3): the same phrase in all three uses, an exchange leaning on the one before, a dish without its classifier, an invitation without กัน
    const lx = c.ev('thaiLexicalSenseProblems'), ids = (t, e) => lx({ thai: t, english: e || 'x' }).map(x => x.id)
    const src = fs.readFileSync(__dirname + '/tt.jsx', 'utf8')
    T('R8', 'generation refuses an exchange that repeats the target\'s phrase or whose line 1 continues an earlier exchange; ก๋วยเตี๋ยวหนึ่ง and an invitation without กัน are caught, the fixed forms pass',
      /two lines must not use the\s*\n?\s*\/\/ target in the same phrase/.test(src) && /every exchange starts fresh/.test(src) &&
      ids('ขอก๋วยเตี๋ยวหนึ่งครับ').includes('FOOD_NEEDS_CLASSIFIER') && !ids('ขอก๋วยเตี๋ยวน้ำชามหนึ่งครับ').includes('FOOD_NEEDS_CLASSIFIER') && !ids('กาแฟหนึ่งร้อยบาทครับ').includes('FOOD_NEEDS_CLASSIFIER') &&
      ids('วันศุกร์ไปร้านกาแฟไหมคะ', 'Shall we go to the café on Friday?').includes('INVITE_NEEDS_KAN') && !ids('วันศุกร์ไปร้านกาแฟกันไหมคะ', 'Shall we go to the café on Friday?').includes('INVITE_NEEDS_KAN'))
  }

  {
    // D9b: "two lines repeat the phrase" and "ใช่ answers a ไหม question" alternated (สีเหลือง: 10 paid rewrites; พัน, นม: 4–7) — the first
    // now refuses only a phrase shared by all three lines, the second is repaired locally (…ไหม → …ใช่ไหม) with no paid call
    const src = fs.readFileSync(__dirname + '/tt.jsx', 'utf8')
    T('R9', 'a phrase shared by only two of three lines is not refused; a ไหม question answered with ใช่ is turned into …ใช่ไหม locally (no paid rewrite)',
      /nWith >= 3 && v\.length === nWith && v\.every\(x => x === v\[0\]\)/.test(src) && /LOCAL_REPAIR ไหม → ใช่ไหม/.test(src) && /'ใช่ไหม\$1\$2'/.test(src))
  }

  out.forEach(l => console.log(l))
  console.log('\nv713 Thai Daily owner-review regressions: ' + (n - fails) + '/' + n + ' passed' + (fails ? ' — ' + fails + ' FAILED' : ''))
  process.exit(fails ? 1 : 0)
})().catch(e => { out.forEach(l => console.log(l)); console.error(e); process.exit(1) })
