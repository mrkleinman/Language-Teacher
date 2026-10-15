// v700 — THAI DAILY TRACK QUALITY & RECOVERY FIX (the owner's brief on the live v699 export thai-track-14-Oct-2026-daily.txt).
// Real app code throughout: the Thai target matcher, the time / lexical-sense / contradiction rules, the cue-clarity pass, the shared
// finaliser (finaliseMainTrack, with the model simulated at the transport boundary — tests14) and the topic selector. No provider calls.
//   node tests56.js            (current build: tt.compiled.js, or TT_FILE)
//   TT_BASE=path node tests56.js  also shows the v699-era build failing the matcher cases (before → after)
'use strict'
const { load } = require('./harness')
const { sentence, mock } = require('./tests14')
const fs = require('fs')
const out = []; let fails = 0, n = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + String(id).padEnd(4) + ' ' + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 1500) : '')) }
const FILE = process.env.TT_FILE || 'tt.compiled.js'
const FIX = fs.readFileSync('sandbox/thai-daily-v699-fixture/thai-track-14-Oct-2026-daily.txt', 'utf8')
const SRC = fs.readFileSync('tt.jsx', 'utf8')

function learner(c) {
  const v = c.initVocab().map(w => ({ ...w }))
  v.forEach(w => { const ci = w.curriculumIndex
    if (ci >= 1 && ci <= 311) { w.status = 'learning'; w.introducedAt = '2026-08-01'; w.lastSeen = '2026-09-20'; w.okStreak = 1; w.interval = 3; w.dueDate = '2026-09-2' + (ci % 7); w.difficulty = 'medium' }
    else { if (w.status !== 'locked') w.status = 'new'; w.lastSeen = null; w.introducedAt = null; w.dueDate = null; w.okStreak = 0 } })
  return v
}

;(async () => {
  const c = load(FILE, { realBelt: true }); c.console.info = () => {}; c.console.warn = () => {}
  const base = process.env.TT_BASE && fs.existsSync(process.env.TT_BASE) ? load(process.env.TT_BASE, { realBelt: true }) : null
  const V = c.initVocab()
  const pres = (cc, tw, s) => cc.thaiTargetConceptPresent(tw, s, cc === c ? V : cc.initVocab())

  // ══ 1. Thai target recognition — โมงเช้า and the time system ══
  {
    const ok = ['เขาให้ผมไปแปดโมงเช้า', 'พรุ่งนี้เจ็ดโมงเช้าผมไปครับ', 'ผมมีนัดเก้าโมงเช้าครับ', 'เจ็ดโมงเช้าคุณมีงานไหมคะ', 'หกโมงเช้าค่ะ', 'สิบโมงเช้าจริงเหรอคะ', 'สิบเอ็ดโมงเช้าครับ', 'พรุ่งนี้แปดโมงเช้าได้ไหมคะ']
    const r = ok.map(s => [s, pres(c, 'โมงเช้า', s)])
    const b = base ? ok.filter(s => !pres(base, 'โมงเช้า', s).present) : null
    T('1a', 'valid Thai morning times contain the target โมงเช้า and are recognised without spaces (แปด/เจ็ด/เก้า/หก/สิบ/สิบเอ็ด + โมงเช้า)' + (b ? ' — the v699-era build rejected ' + b.length + ' of them' : ''),
      r.every(([, x]) => x.present), r.filter(([, x]) => !x.present).map(([s, x]) => s + ' ' + x.form))
    // the exact rejected candidates from the v699 generation log (11 paid checks)
    // the export cuts each logged sentence at 20 characters (often mid-word) — the time expression itself is judged: the text up to
    // and including its โมงเช้า
    const logged = [...FIX.matchAll(/TARGET_MISSING: no target "โมงเช้า" in: (\S+)/g)].map(m => m[1]).filter(s => s.includes('โมงเช้า')).map(s => s.slice(0, s.indexOf('โมงเช้า') + 7))
    const nowOk = logged.filter(s => pres(c, 'โมงเช้า', s).present)
    T('1b', 'the ' + logged.length + ' v699 candidates rejected as TARGET_MISSING (generation checks 2–11) are no longer a matcher failure: every one with an hour + โมงเช้า now carries the target (' + nowOk.length + '/' + logged.length + '; กี่โมงเช้า is not a clock time)',
      logged.length >= 6 && logged.filter(s => /(หก|เจ็ด|แปด|เก้า|สิบ)โมงเช้า/.test(s)).every(s => pres(c, 'โมงเช้า', s).present), logged.map(s => s + ':' + pres(c, 'โมงเช้า', s).form))
    const neg = [['หมา', 'มา', 'หมาตัวนี้น่ารักครับ'], ['ตอนเช้า', 'โมงเช้า', 'ตอนเช้าผมไปทำงานครับ'], ['เข้าใจ', 'ใจ', 'ผมเข้าใจแล้วครับ'], ['กี่โมง', 'โมงเช้า', 'คุณมากี่โมงคะ']]
    T('1c', 'no unrestricted substring matching: มา in หมา, โมงเช้า vs ตอนเช้า / กี่โมง, ใจ in เข้าใจ are NOT the target',
      neg.every(([, tw, s]) => !pres(c, tw, s).present), neg.map(([w, tw, s]) => tw + ' in ' + w + ': ' + pres(c, tw, s).form))
    const other = [['ป้ายรถเมล์', 'ผมอยู่ที่ป้ายรถเมล์ครับ'], ['ไม่ทราบว่า', 'ไปไม่ได้ค่ะ ไม่ทราบว่าคุณกลับเมื่อไหร่คะ'], ['ทุ่ม', 'สองทุ่มเจอกันนะคะ'], ['โมงเย็น', 'ห้าโมงเย็นค่ะ']]
    T('1d', 'Thai target detection without English-style spaces for other targets (ป้ายรถเมล์, ไม่ทราบว่า, ทุ่ม in สองทุ่ม, โมงเย็น in ห้าโมงเย็น)',
      other.every(([tw, s]) => pres(c, tw, s).present), other.map(([tw, s]) => tw + ':' + pres(c, tw, s).form))
    const bad = ['พรุ่งนี้สามโมงเช้าไปด้วยกันไหมครับ', 'สองโมงเช้าค่ะ', 'สิบสองโมงเช้าครับ', '3 โมงเช้าครับ', 'เจ็ดทุ่มครับ', 'เก้าโมงเย็นค่ะ', 'ตีเจ็ดค่ะ', 'บ่ายหกโมงครับ']
    const good = ['ตีสามครับ', 'หกโมงเช้าค่ะ', 'ห้าโมงเช้าค่ะ', '8 โมงเช้าครับ', 'บ่ายโมงค่ะ', 'บ่ายสามโมงค่ะ', 'ห้าโมงเย็นค่ะ', 'สองทุ่มเจอกันนะคะ', 'ร้านปิดหกทุ่มครับ', 'ตีห้าผมตื่นแล้วครับ', 'เที่ยงครับ', 'สิบโมงเช้าครับ']
    T('1e', 'Thai time rules: สามโมงเช้า is NOT 3 AM (ตีสาม is) — v699\'s พรุ่งนี้สามโมงเช้าไปด้วยกันไหมครับ is rejected; each period word keeps its own hours (โมงเช้า 5–11, โมงเย็น 4–6, ทุ่ม 1–6, ตี 1–5, บ่าย…โมง 1–4) and every valid time passes',
      bad.every(s => c.thaiTimeExpressionProblems(s).length) && good.every(s => !c.thaiTimeExpressionProblems(s).length),
      { missed: bad.filter(s => !c.thaiTimeExpressionProblems(s).length), overStrict: good.filter(s => c.thaiTimeExpressionProblems(s).length) })
    // the rule is wired into every gate a line passes: the shared acceptance contract and the final audit
    const p = { thai: 'พรุ่งนี้สามโมงเช้าไปด้วยกันไหมครับ', english: 'Tomorrow at 3 AM, shall we go together?', speaker: 'A', prompt: 'Ask if he wants to go together tomorrow at 3 AM.', targetId: 740, _target: 'โมงเช้า', pairType: 'content' }
    const v = c.validateThaiTargetPair(p, { thai: 'โมงเช้า', wordId: 740 }, { vocab: V }, 'quota-recovery')
    T('1f', 'the time rule is part of the ONE acceptance contract (generation, quota recovery, quota count, final audit): สามโมงเช้า fails validateThaiTargetPair',
      !v.valid && v.reasons.some(x => /clock time/.test(x)), v.reasons)
    T('1g', 'a usage contract teaches โมงเช้า as morning hours 6–11 (generation and recovery prompts) — prevention, not only rejection',
      /THAI_USAGE_TARGET_GUIDE\[target\.thai\]/.test(SRC) && /THAI_USAGE_TARGET_GUIDE\[kw\.thai\]/.test(SRC) && /'โมงเช้า': 'TEACH โมงเช้า AS A MORNING CLOCK TIME, hours 6–11/.test(SRC))
  }

  T('1h', 'stop expensive loops: a TARGET_MISSING where the target is visibly in the sentence twice in a row is a VALIDATOR DISPUTE — no more paid regeneration for it (it goes to quota recovery and is logged), next to the existing same-sentence guard',
    /_disputeStreak >= 2\) \{\s*\n\s*onProgress && onProgress\(-1, -1, \{ apiError: '⚖ VALIDATOR_DISPUTE '/.test(SRC) && /GENERATION_STOPPED_REPEATING/.test(SRC))

  // ══ 2. ไม่ทราบว่า — the variety ban never fights the target ══
  {
    const lint = tw => c.lintThaiContent('ไม่ทราบว่าห้องน้ำอยู่ที่ไหนครับ', 'May I ask where the restroom is?', 'A', { thai: tw })
    T('2a', 'ไม่ทราบว่า as THE TARGET may begin its line (the polite opener "may I ask…?"); for every other target the old variety rule stays',
      !lint('ไม่ทราบว่า').some(x => /ไม่ทราบว่า/.test(x)) && lint('ห้องน้ำ').some(x => /ไม่ทราบว่า/.test(x)))
    T('2b', 'the generator prompt no longer tells the model "NEVER start a line with ไม่ทราบว่า" when it IS the target, and the conversation check exempts it too (v699: both v699 recalls were rejected for it)',
      /target && target\.thai === 'ไม่ทราบว่า' \? '' : '• VARIETY: NEVER start a line with ไม่ทราบว่า/.test(SRC) && /if \(target\.thai !== 'ไม่ทราบว่า' && \(lThai\.startsWith\('ไม่ทราบว่า'\)/.test(SRC))
    const gen = [...FIX.matchAll(/generation check \d+\/11: Do not start with ไม่ทราบว่า/g)].length
    T('2c', 'the fixture proves the cause: ' + gen + ' paid generation checks were rejected only for "Do not start with ไม่ทราบว่า" while ไม่ทราบว่า was the target', gen >= 3)
  }

  // ══ 3. unnatural Thai that passed QC ══
  {
    const L = th => c.thaiLexicalSenseProblems({ thai: th, english: '' }).map(x => x.id)
    const rej = { 'ชอบแต่ไม่เชิงชอบมากครับ': 'MAI_CHOENG_CALQUE', 'ผมไม่เชิงชอบผัดไทยครับ': 'MAI_CHOENG_CALQUE', 'วันหลังมาบ้านผมนะครับ ผมต้อนรับ': 'TONRAP_INCOMPLETE', 'คุณจะมาต้อนรับไหมครับ': 'TONRAP_INCOMPLETE',
      'ภาษาอังกฤษต้องจ่ายเงินไหมคะ': 'LANGUAGE_AS_PRODUCT', 'ภาษาอังกฤษไม่แพงครับ': 'LANGUAGE_AS_PRODUCT' }
    T('3a', 'the v699 lines are rejected deterministically: ไม่เชิง as an English "not exactly V" calque, a bare ต้อนรับ (welcome whom?), English treated as a priced product',
      Object.entries(rej).every(([s, id]) => L(s).includes(id)), Object.entries(rej).map(([s]) => s + ':' + L(s).join(',')))
    const legit = ['ก็ไม่เชิงครับ', 'ไม่เชิงหรอกค่ะ', 'ไม่เชิงว่าไม่ชอบนะครับ', 'ไม่เชิงครับ แค่เหนื่อยนิดหน่อย', 'ไม่เชิงอย่างนั้นค่ะ', 'ยินดีต้อนรับครับ', 'ขอบคุณที่ต้อนรับผมครับ', 'ขอบคุณที่มาต้อนรับค่ะ',
      'ทุกคนมาต้อนรับเราค่ะ', 'เขาต้อนรับเราดีมากครับ', 'เรียนภาษาอังกฤษแพงไหมคะ', 'ภาษาอังกฤษยากไหมคะ', 'หนังสือภาษาอังกฤษราคาเท่าไหร่ครับ', 'ผมพูดภาษาอังกฤษได้นิดหน่อยครับ', 'พ่อแม่เลี้ยงดูผมมาดีมากครับ']
    T('3b', 'challenging but legitimate beginner Thai is NOT rejected (natural ไม่เชิง answers, ยินดีต้อนรับ / ขอบคุณที่ต้อนรับ / an object, a course or book with a price, ordinary ellipsis)',
      legit.every(s => !L(s).length), legit.filter(s => L(s).length).map(s => s + ':' + L(s)))
    const A = { thai: 'พ่อแม่เลี้ยงดูผมดีมากครับ', speaker: 'A', targetId: 5007, _target: 'เลี้ยงดู' }, B = { thai: 'พ่อแม่ไม่เลี้ยงดูผมเลยครับ', speaker: 'A', targetId: 5007, _target: 'เลี้ยงดู' }
    const C1 = { thai: 'ผมอยากเลี้ยงดูพ่อแม่ตอนแก่ครับ', speaker: 'A', targetId: 5007, _target: 'เลี้ยงดู' }, Q = { thai: 'พ่อแม่เลี้ยงดูคุณอย่างไรคะ', speaker: 'B', targetId: 5007, _target: 'เลี้ยงดู' }
    const B2 = { ...B, speaker: 'B', thai: 'พ่อแม่ไม่เลี้ยงดูฉันเลยค่ะ' }
    T('3c', 'contradictory parental statements are detected (pairs 56 / 58: raised me very well vs didn\'t raise me at all, same speaker); a different use, a question, or another speaker is not a contradiction',
      !!c.thaiSelfContradiction(A, B) && !c.thaiSelfContradiction(A, C1) && !c.thaiSelfContradiction(A, Q) && !c.thaiSelfContradiction(A, B2))
    T('3d', 'usage contracts for ไม่เชิง, ต้อนรับ, ภาษาอังกฤษ, เลี้ยงดู, ไม่ทราบว่า go into the generation and recovery prompts (change the context instead of forcing a construction)',
      ['ไม่เชิง', 'ต้อนรับ', 'ภาษาอังกฤษ', 'เลี้ยงดู', 'ไม่ทราบว่า'].every(w => c.ev('THAI_USAGE_TARGET_GUIDE')[w]) && !c.ev('THAI_FUNCTION_TARGET_GUIDE')['ไม่เชิง'])
  }

  // ══ 4. English cue clarity ══
  {
    const ctx = { names: ['Somchai', 'Nida'] }
    const cue = (prompt, english, thai, x = {}) => c.cueClarify('th', { prompt, english, thai, ...x }, { ...ctx, ...(x.ctx || {}) })
    const cases = [
      ["Say you can't go, then politely ask him when he will be back, starting with 'may I ask'.", "I can't go. When are you coming back, if I may ask?", 'ไปไม่ได้ค่ะ ไม่ทราบว่าคุณกลับเมื่อไหร่คะ', "Say you can't go, then politely ask him when he will be back."],
      ["Ask her if she wants pad thai, since you're going to get it.", 'Do you want pad thai?', 'คุณเอาผัดไทยไหมครับ', 'Ask if she wants pad thai.'],
      ['Ask how your parents raised him.', 'How did your parents raise you?', 'พ่อแม่เลี้ยงดูคุณอย่างไรคะ', 'Ask him how his parents raised him.'],
      ['Say okay, then asks where she is at this moment.', 'Okay. So where are you right now?', 'ได้ครับ แล้วตอนนี้คุณอยู่ที่ไหนครับ', 'Say okay, then ask where she is at this moment.'],
      ['Nida says: thank you very much, Somchai', 'Thank you very much, Somchai', 'ขอบคุณมากค่ะ สมชาย', 'Thank Somchai very much.', { pairType: 'framing' }],
      ['Nida greets Somchai back and says she is very well today.', 'Hello Somchai, today I am very well', 'สวัสดีค่ะ สมชาย วันนี้ฉันดีมากค่ะ', 'Greet Somchai back and say you are very well today.', { pairType: 'framing', speaker: 'B', ctx: { genderOf: () => 'f' } }]]
    const got = cases.map(([p, e, th, want, x]) => [cue(p, e, th, x).cue, want])
    T('4a', 'concise, accurate cues from the learner\'s perspective: no "starting with \'may I ask\'" hint, no "since you\'re going to get it", the listener\'s parents are "his", "then asks" → "then ask", thanking names the person, B greets and says SHE (you) is well',
      got.every(([g, w]) => g === w), got.filter(([g, w]) => g !== w))
    T('4b', 'framing reply cues keep B\'s own she / her as a pronoun under cue clarity (it became B\'s name, then A\'s: "say Somchai is very well today")',
      /cueClarityOn\(\) \? \(sceneData\.reply_prompt\|\|''\)\.replace\(\/\\bhe\\b\/gi,_nameA\)\.replace\(\/\\bhim\\b\/gi,_nameA\) :/.test(SRC))
    const oh = [['รถติดมากแย่แล้วครับ', "The traffic's really bad, oh no."], ['ทำไมแย่แล้วคะ', 'Oh no, why is it bad?'], ['ตอนนี้แย่แล้วครับ', "Oh no, it's already bad now."]]
    const flags = oh.map(([th, en]) => cue('Say it.', en, th).flags.filter(f => /NEGATION/.test(f)).length)
    const real = cue("Say you don't like it.", "I don't like it.", 'ผมชอบครับ').flags.some(f => /ADDS_NEGATION/.test(f))
    T('4c', 'no false-negation flag for แย่แล้ว ("bad" / "oh no" is negative MEANING, not a negator) — a real added negation is still flagged',
      flags.every(k => k === 0) && real, { flags, real })
  }

  // ══ 5. the shared finaliser: final snapshot audit, bounded recovery, substitution ══
  const L0 = learner(c)
  const s0 = c.selectThaiTopicTargets(L0, 'wedding-speech')
  const ADAPTER = c.ev('TRACK_ADAPTERS').th
  const mkTrack = (S, o = {}) => {
    const pairs = [{ pairType: 'framing', speaker: 'A', thai: 'สวัสดีครับ', english: 'Hello.', prompt: 'greeting', _semanticState: 'VERIFIED', _semNat: 5, _semCue: 'n/a', _pairKey: 'f0' },
      { pairType: 'framing', speaker: 'B', thai: 'สวัสดีค่ะ', english: 'Hello.', prompt: 'greeting', _semanticState: 'VERIFIED', _semNat: 5, _semCue: 'n/a', _pairKey: 'f1' }]
    const tail = []
    S.targets.forEach(t => { const k3 = o.counts && o.counts[t.id] != null ? o.counts[t.id] : 3
      for (let k = 0; k < k3; k++) { const s = (o.sent && o.sent(t, k)) || sentence(S, 'th', t, 'gen', k)
        const p = { ...s, targetId: t.id, wordId: t.id, recallIndex: k + 1, _source: 'gemini-check-1:conv', language: 'th', pairType: 'content', _target: t.thai, recallGroupId: 'rg-' + t.id, _semanticState: 'VERIFIED', _semNat: 5, _semCue: 5, words: [], phonetic: '' }
        ;(o.toEnd && o.toEnd(t, k) ? tail : pairs).push(p) } })
    pairs.push(...tail)
    const nw = new Set(s0.selectedNewTargetIds)
    const tr = { createdAt: '2026-10-15T01:00:00.000Z' + (o.tag || ''), date: '15 Oct 2026', mode: 'daily', trackMode: 'daily', language: 'th', trackType: 'daily', selectionMode: 'topic', topicId: 'wedding-speech', topicTitle: 'Wedding Speech', pairs,
      keywords: S.targets.map(t => ({ wordId: t.id, thai: t.thai, english: t.english, phonetic: t.phonetic || '', rating: null, isNew: nw.has(t.id), isUnseen: nw.has(t.id) })), rated: false }
    tr.selectedTargetIds = tr.keywords.map(k => k.wordId); tr.selectedNewTargetIds = s0.selectedNewTargetIds.slice(); tr.selectedRevisionTargetIds = s0.selectedRevisionTargetIds.slice()
    tr.trackContext = c.makeTrackContext({ trackId: tr.createdAt, language: 'th', mode: 'daily', selectedTargetIds: tr.selectedTargetIds, selectedNewTargetIds: tr.selectedNewTargetIds })
    return tr
  }
  const fin = async (track, adapter, S) => { const log = []; const t = await c.finaliseMainTrack(track, adapter || ADAPTER, { vocab: L0, apiKey: 'k', model: 'gemini-2.5-flash-lite', qcRan: true, onLog: m => log.push(m) }); return { t, log, calls: S && S._calls } }
  const occOf = t => { const o = {}; (t.pairs || []).forEach(p => { if (p && p.targetId != null && c.classifyTrackPair(p) === 'TARGET') o[p.targetId] = (o[p.targetId] || 0) + 1 }); return o }
  {
    const S = { c, vocab: L0, targets: s0.targetIds.map(id => L0.find(w => w.id === id)) }
    mock(S, 'th', {})
    const before = JSON.stringify(L0)
    const { t: t0 } = await fin(mkTrack(S, { tag: '-clean' }), ADAPTER, S)
    const fa0 = t0.integrity && t0.integrity.finalSnapshotAudit
    // the save gate re-finalises the saved track: every line now carries a verdict for its exact final text → nothing is judged again
    const { t, log } = await fin(t0, ADAPTER, S)
    const fa = t.integrity && t.integrity.finalSnapshotAudit
    T('5a', 'a clean track: the FINAL SNAPSHOT AUDIT checks all 90 target lines on the saved text and finds nothing (READY 90/90); a line already judged on its exact final text is never judged again (re-finalisation: 0 judge calls)',
      !!fa0 && fa0.first.checked === 90 && fa0.first.invalid.length === 0 && !fa0.secondPass && c.trackReadiness(t0).ready && !!fa && fa.first.checked === 90 && fa.first.judgedNow === 0 && fa.first.judgeCalls === 0 && c.trackReadiness(t).ready,
      { first: fa0 && { ...fa0.first, invalid: fa0.first.invalid.length }, again: fa && { ...fa.first, invalid: fa.first.invalid.length }, rd: c.trackReadiness(t).reasons })
    T('5b', 'the shared dictionary, SRS and belt state are untouched by finalisation (the learner vocabulary is byte-identical)', JSON.stringify(L0) === before)
    const ex = (c.semanticAuditExportLines({ ...t, _semanticAudit: t._semanticAudit || {} }) || []).join('\n')
    T('5c', 'the export states what was audited on the SAVED text ("FINAL SNAPSHOT AUDIT …") and no longer says recovered lines were never audited', /FINAL SNAPSHOT AUDIT \(the saved text\): 90 target line\(s\) checked/.test(ex) && !/none \(no QC-stage recovery ran\)/.test(ex), ex.split('\n').filter(l => /SNAPSHOT|recovery pairs/.test(l)).join(' | '))

    // a contradiction far apart (outside the 3-line local window, so only the snapshot audit sees it) → invalid → ONE bounded quota
    // round replaces it → the result is audited again → READY 90/90, exactly 3 recalls per target
    const tw = S.targets.find(x => { const s1 = sentence(S, 'th', x, 'gen', 0); return s1 && s1.thai && s1.thai.indexOf(x.thai) >= 0 && !/^ไม่/.test(x.thai) && !/ไม่/.test(s1.thai) })
    const s1 = sentence(S, 'th', tw, 'gen', 0)
    const contra = { ...sentence(S, 'th', tw, 'gen', 2), thai: s1.thai.replace(tw.thai, 'ไม่' + tw.thai), speaker: s1.speaker, english: 'Not ' + (s1.english || '') }
    const r2 = await fin(mkTrack(S, { tag: '-contra', sent: (x, k) => x.id === tw.id && k === 2 ? contra : null, toEnd: (x, k) => x.id === tw.id && k === 2 }), ADAPTER, S)
    const fa2 = r2.t.integrity && r2.t.integrity.finalSnapshotAudit, occ2 = occOf(r2.t)
    T('5d', 'a recall that contradicts another recall of its target ("' + contra.thai + '" vs "' + s1.thai + '", far apart) is caught by the final snapshot audit, replaced by one bounded recovery round, audited again → READY 90/90',
      !!fa2 && fa2.first.invalid.length === 1 && /SELF_CONTRADICTION/.test(fa2.first.invalid[0].reason) && fa2.secondPass && fa2.secondPass.recovered >= 1 && fa2.after.invalid.length === 0 &&
      !r2.t.pairs.some(p => p && p.thai === contra.thai && !p._qcInvalid) && c.trackReadiness(r2.t).ready,
      { fa: fa2 && { first: fa2.first.invalid, second: fa2.secondPass, after: fa2.after && fa2.after.invalid }, rd: c.trackReadiness(r2.t).reasons, log: r2.log.filter(l => /SNAPSHOT|QUOTA RECOVERY/.test(l)).slice(0, 6) })
    T('5e', 'exactly three valid target-bearing recalls per selected target after the recovery (30 × 3 = 90 target lines, no 4th recall appended)',
      s0.targetIds.every(id => occ2[id] === 3) && Object.values(occ2).reduce((a, b) => a + b, 0) === 90, s0.targetIds.filter(id => occ2[id] !== 3).map(id => [id, occ2[id]]))
    const rec = r2.t.pairs.filter(p => p && p.targetId === tw.id && /quota-recovery/.test(String(p.sourceStage || p._source || '')))
    T('5f', 'the recovered line gets its final romanisation from the SAME pronunciation stage as every other line (built after the repair, not stale)',
      rec.length >= 1 && rec.every(p => p.phonetic && p.phonetic.trim().length > 0), rec.map(p => [p.thai, p.phonetic]))

    // a new topic word that cannot be completed is NEVER substituted (fail closed, NOT_READY)
    const newStuck = s0.selectedNewTargetIds[0]
    const NOREC_NEW = { ...ADAPTER, recoverTargetPairs: (kw, need, ctx) => kw.wordId === newStuck ? Promise.resolve({ accepted: [], reasons: ['no candidate (test)'] }) : ADAPTER.recoverTargetPairs(kw, need, ctx) }
    const r3 = await fin(mkTrack(S, { tag: '-newstuck', counts: { [newStuck]: 2 } }), NOREC_NEW, S)
    T('5g', 'a topic NEW word stuck at 2/3 is never swapped for another word: the five Wedding Speech words are preserved and the track fails closed (NOT_READY, not 89/90 published as ready)',
      !(r3.t.targetSubstitutions || []).length && r3.t.keywords.map(k => k.wordId).includes(newStuck) && !c.trackReadiness(r3.t).ready && s0.selectedNewTargetIds.every(id => r3.t.selectedTargetIds.includes(id)),
      { subs: r3.t.targetSubstitutions, rd: c.trackReadiness(r3.t).reasons })
  }
  {
    // an unsuitable REVISION target: its bounded recovery fails → the next due revision word is tried and, with 3 accepted recalls, swapped in
    const S0 = { c, vocab: L0, targets: s0.targetIds.map(id => L0.find(w => w.id === id)) }
    const revStuck = s0.selectedRevisionTargetIds[0]
    const probe = mkTrack(S0, { tag: '-probe' })
    const cands = c.thaiSubstitutionCandidates(probe, L0, probe.keywords)
    const S = { c, vocab: L0, targets: S0.targets.concat(cands.slice(0, 2)) }
    mock(S, 'th', {})
    const STUCK = { ...ADAPTER, recoverTargetPairs: (kw, need, ctx) => kw.wordId === revStuck ? Promise.resolve({ accepted: [], reasons: ['TARGET_USAGE_UNSUITABLE_FOR_REGISTER (test)'] }) : ADAPTER.recoverTargetPairs(kw, need, ctx) }
    const tr = mkTrack({ ...S, targets: S0.targets }, { tag: '-sub', counts: { [revStuck]: 2 } })
    const before = JSON.stringify(L0)
    const r = await fin(tr, STUCK, S)
    const sub = (r.t.targetSubstitutions || [])[0]
    const occ = occOf(r.t)
    T('5h', 'candidates for a substitution are due REVISION words only (introduced, eligible, not in the track) — never a new curriculum word, never a topic word',
      cands.length > 0 && cands.every(w => c.hasBeenIntroduced(w) && !s0.targetIds.includes(w.id) && !c.topicById('th', 'wedding-speech').vocabIds.includes(w.id)), cands.slice(0, 3).map(w => [w.id, w.thai, w.status]))
    T('5i', 'an unsuitable revision target is REPLACED through the approved revision order after its bounded recovery: 3 accepted recalls for the new word, keywords / selection / TrackContext name it, READY 90/90 with 30 targets',
      !!sub && sub.fromId === revStuck && sub.toId === cands[0].id && sub.recalls === 3 && r.t.keywords.length === 30 && !r.t.keywords.some(k => k.wordId === revStuck) && r.t.keywords.some(k => k.wordId === sub.toId && k.substitutedFor === revStuck) &&
      r.t.selectedTargetIds.includes(sub.toId) && !r.t.selectedTargetIds.includes(revStuck) && r.t.trackContext.selectedTargetIds.includes(sub.toId) && r.t.selectedRevisionTargetIds.includes(sub.toId) &&
      occ[sub.toId] === 3 && !occ[revStuck] && c.trackReadiness(r.t).ready && s0.selectedNewTargetIds.every(id => r.t.selectedNewTargetIds.includes(id)),
      { sub, rd: c.trackReadiness(r.t).reasons, occ: [occ[revStuck], sub && occ[sub.toId]], log: r.log.filter(l => /SUBSTITU/.test(l)).slice(0, 4) })
    T('5j', 'the replaced word\'s SRS state is untouched (it was not practised; it stays due) and the substitution is reported in the export',
      JSON.stringify(L0) === before && (c.semanticAuditExportLines({ ...r.t, _semanticAudit: r.t._semanticAudit || {} }) || []).join('\n').includes('TARGET SUBSTITUTED'))
  }

  // ══ 6. Wedding Speech topic logic protected; why a topic word was passed over is recorded ══
  {
    const L1 = learner(c)
    const w1 = L1.find(w => w.thai === 'ทุกคน' && w.id === 5001); Object.assign(w1, { status: 'learning', introducedAt: '2026-10-10', lastSeen: '2026-10-12', okStreak: 1, interval: 3, dueDate: '2026-10-15' })
    const sel = c.selectThaiTopicTargets(L1, 'wedding-speech', { pendingWordIds: new Set([5005]) })
    const topicIds = c.topicById('th', 'wedding-speech').vocabIds
    T('6a', 'Wedding Speech selection unchanged: up to 5 new words in the topic\'s priority order, the rest from the revision queue, 30 unique targets, no ordinary curriculum new word',
      sel.selectedNewTargetIds.length === 5 && sel.selectedNewTargetIds.every(id => topicIds.includes(id)) && new Set(sel.targetIds).size === 30 &&
      sel.selectedRevisionTargetIds.every(id => { const w = L1.find(x => x.id === id); return c.hasBeenIntroduced(w) || topicIds.includes(id) }), sel.selectedNewTargetIds)
    const sk = sel.topicSkipped || []
    T('6b', 'a higher-priority topic word that is passed over is recorded WITH its reason: ทุกคน "already introduced", ดูแล "queued in an unrated track" (the v699 export could not say why) — and the export prints it',
      sk.some(x => x.id === 5001 && /already introduced/.test(x.reason)) && sk.some(x => x.id === 5005 && /queued in an unrated track/.test(x.reason)) &&
      c.trackVersionExportLines({ ...mkTrack({ c, vocab: L0, targets: s0.targetIds.map(id => L0.find(w => w.id === id)) }), topicSkipped: sk }).join('\n').includes('topic words passed over: ทุกคน (5001: already introduced'), sk)
    T('6c', 'the 50-word Wedding Speech priority order is unchanged', JSON.stringify(c.ev('TOPIC_WEDDING_SPEECH_TH').map(x => x[0])).startsWith(JSON.stringify(['ทุกคน', 'ขอบพระคุณ', 'พ่อแม่', 'ความรัก', 'ดูแล', 'ต้อนรับ', 'เลี้ยงดู']).slice(0, -1)) && c.ev('TOPIC_WEDDING_SPEECH_TH').length === 50)
  }

  console.log(out.join('\n'))
  console.log('\nv700 Thai Daily quality & recovery regression: ' + (n - fails) + '/' + n + (fails ? ' — ' + fails + ' FAILED' : ' — ALL PASS'))
  process.exit(fails ? 1 : 0)
})().catch(e => { console.log(out.join('\n')); console.log('CRASH', e && e.stack); process.exit(1) })
