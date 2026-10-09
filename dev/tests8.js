// v643 — politeness validator split (A–K) + live ข้าวเหนียว replay. Model mocked; real app code.
const { load } = require('./harness')
const out = []; let fails = 0
const T = (id, name, pass, detail) => { if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + id.padEnd(3) + name + (detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')) }
const LIVE = [{ speaker: 'A', thai: 'เรามีข้าวเหนียวเยอะนะครับ', english: 'We have a lot of sticky rice.', prompt: 'He says they have a lot of sticky rice', phonetic: 'rao mii khâao-nǐiao yóe ná khráp' },
              { speaker: 'B', thai: 'ดีเลยค่ะ ฉันอยากกินข้าวเหนียว', english: 'Great, I want to eat sticky rice.', prompt: 'She says she wants to eat sticky rice', phonetic: 'dii loei khâ chǎn yàak gin khâao-nǐiao' },
              { speaker: 'A', thai: 'ผมชอบกินข้าวเหนียวครับ', english: 'I like eating sticky rice.', prompt: 'He says he likes eating sticky rice', phonetic: 'phǒm châwp gin khâao-nǐiao khráp' }]
async function gen(file, lines) {
  const c = load(file)
  const v = c.initVocab(); v.forEach(w => { if (w.curriculumIndex >= 1 && w.curriculumIndex <= 320) { w.status = 'learning'; w.lastSeen = '2026-09-20'; w.introducedAt = '2026-08-01' } })
  const target = { ...v.find(w => w.thai === 'ข้าวเหนียว') }
  target._trackTargets = [target]; target._allowedSet = c.buildThaiAllowedSet({ vocab: v, trackTargets: [target], grammarWords: c.ev('THAI_TRACK_GRAMMAR_WORDS') })
  let calls = 0; c.mockGeminiGenerate = async () => { calls++; return JSON.stringify(lines || LIVE) }
  const log = []; let res = null, err = null
  try { res = await c.generateWordLines(target, 'At a market.', 'Somchai, a Thai man', 'Nida, a Thai woman', [], v, 'k', 'm', 0,
    (d, t, m) => { if (m && m.apiError) log.push(m.apiError) }, '', new Set()) } catch (e) { err = e }
  return { c, res, err, calls, log }
}
;(async () => {
  const old = await gen('tt.v642.compiled.js'), neu = await gen('tt.compiled.js')
  out.push('REPLAY live ข้าวเหนียว lines — v642: ' + old.calls + ' model calls, log: ' + JSON.stringify(old.log.filter(l => /speaker=|fail/i.test(l)).slice(0, 2)))
  out.push('                              v643: ' + neu.calls + ' model call(s), log: ' + JSON.stringify(neu.log.filter(l => /POLITENESS|CONFLICT|NATURALNESS|passed|fail/i.test(l)).slice(0, 3)))
  T('R1', 'v642 reproduces the live loop: all 11 checks fail on "no politeness particle at the end"', old.calls === 11 && old.log.filter(l => /particle=\(none\) result=FAIL \(no politeness particle at the end\)/.test(l)).length >= 11)
  T('R2', 'v643: the same output passes on the 1st check (politeness logged as advisory, never as a gender failure)', neu.calls === 1 && neu.res && neu.res.length === 3 &&
    neu.log.some(l => /POLITENESS_ISSUE \(advisory\) speaker=B: politeness particle only in an earlier clause/.test(l)) && !neu.log.some(l => /Gender fail|SPEAKER_GENDER_CONFLICT/.test(l)))
  const c = neu.c, V = (t, sp) => c.validateThaiSpeakerParticle(t, c.thaiSpeakerMapGender(sp))
  const g = (id, t, sp, pass) => { const r = V(t, sp); T(id, sp + '/' + c.thaiSpeakerMapGender(sp) + ': ' + t + ' ⇒ gender ' + (pass ? 'PASS' : 'FAIL'), r.ok === pass && (pass || r.code === 'SPEAKER_GENDER_CONFLICT'), { ok: r.ok, code: r.code, reason: r.reason, politeness: r.politeness.map(x => x.reason) }) }
  g('A', 'ดีเลยค่ะ ฉันอยากกินข้าวเหนียว', 'B', true)
  g('B', 'ฉันอยากกินข้าวเหนียว', 'B', true)
  g('C', 'ผมอยากกินข้าวครับ', 'A', true)
  g('D', 'อยากกินข้าว', 'A', true)
  g('E', 'ผมอยากกินข้าวครับ', 'B', false)
  g('F', 'ฉันอยากกินข้าวค่ะ', 'A', false)
  g('G', 'ฉันอยากกินข้าวครับ', 'B', false)
  g('H', 'ผมอยากกินข้าวค่ะ', 'A', false)
  const i = V('ดีเลยค่ะ ฉันอยากกินข้าวเหนียว', 'B')
  T('I', 'particle in the first clause only: no "particle=(none)", no gender failure; one advisory politeness note', i.ok && i.detected !== '(none)' && i.politeness.length === 1 && !i.politeness[0].blocking, { detected: i.detected, politeness: i.politeness })
  const j = V('ฉันอยากกินข้าวเหนียว', 'B')
  T('J', 'no particle anywhere: gender neutral/PASS; advisory only', j.ok && j.code === null && j.politeness.every(x => !x.blocking) && !j.blockingNaturalness, j.politeness)
  const k1 = V('ฉันชอบข้าวเหนียวคะ', 'B'), k2 = V('คุณชอบข้าวเหนียวไหมค่ะ', 'B')
  T('K', 'คะ/ค่ะ misuse is a POLITENESS advisory, never a gender mismatch', k1.ok && k2.ok && k1.politeness.some(x => /คะ on a statement/.test(x.reason)) && k2.politeness.some(x => /ค่ะ on a question/.test(x.reason)),
    { statementWithคะ: k1.politeness.map(x => x.reason), questionWithค่ะ: k2.politeness.map(x => x.reason) })
  // pronoun contradictions still fail through the identity gate (final audit / Listening)
  T('P', 'pronoun + particle contradictions still fail the identity gate (ผม+ค่ะ, ฉัน+ครับ, B+ผม…ครับ)',
    c.thaiSpeakerIdentity({ speaker: 'A', thai: 'ผมอยากกินข้าวค่ะ' }).status !== 'ok' && c.thaiSpeakerIdentity({ speaker: 'B', thai: 'ฉันอยากกินข้าวครับ' }).status !== 'ok' &&
    c.thaiSpeakerIdentity({ speaker: 'B', thai: 'ผมอยากกินข้าวครับ' }).status !== 'ok' && c.thaiSpeakerIdentity({ speaker: 'B', thai: 'ฉันอยากกินข้าวเหนียว' }).status === 'ok')
  T('N', 'doubled particle still blocks, as NATURALNESS_ISSUE (not gender)', V('อร่อยมากครับครับ', 'A').ok && V('อร่อยมากครับครับ', 'A').blockingNaturalness)
  const conf = await gen('tt.compiled.js', [LIVE[0], { ...LIVE[1], thai: 'ดีเลยครับ ผมอยากกินข้าวเหนียวครับ' }, LIVE[2]])
  T('Q', 'a real conflict in generation is logged as SPEAKER_GENDER_CONFLICT (and is not mistaken for an internal map error)', !conf.err && conf.log.some(l => /SPEAKER_GENDER_CONFLICT speaker=B gender=female particles=ครับ\+ครับ result=FAIL/.test(l)), conf.log.find(l => /CONFLICT/.test(l)))
  T('S', 'sentence break after a particle is not "spaced Thai"; token-spaced Thai still is',
    !c.thaiIsTokenSpaced('ดีเลยค่ะ ฉันอยากกินข้าวเหนียว') && !c.thaiIsTokenSpaced('ร้านอาหารนี้เปิดแล้วครับ ยินดีต้อนรับครับ') &&
    c.thaiIsTokenSpaced('คุณ อยาก ซื้อ อะไร ครับ') && c.thaiIsTokenSpaced('ดีเลยค่ะ ฉัน อยาก กิน'))
  T('M', 'speaker map integrity still holds', c.assertThaiSpeakerMapIntegrity().ok)
  console.log(out.join('\n') + '\n\n' + (fails ? fails + ' FAILED' : 'all passed'))
})().catch(e => { console.error(e); process.exit(1) })
