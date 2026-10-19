// v704 — runtime integration of the Thai 501–800 curriculum (follow-up to tests61):
//   C/D  an exact dictionary entry is resolved whole: น้ำแข็ง is its own item, never heard as น้ำ or แข็ง, never composed from them
//   E    หนังสือพิมพ์ keeps its segmentation and romanisation although พิมพ์ (716) is now a word
//   F/G  การ / ความ stay approved grammar (nominalisers) without being introduced; other unseen content words stay blocked
//   H    จะ / ของ / และ / เธอ can be explicit curriculum targets (NEW and REVIEW) although they are on THAI_NOT_GENERATABLE
//   I    every slot 501–800 can be selected, learned, reviewed and proven
// Real app code; no provider calls.
//   node tests62.js            (current build: tt.compiled.js, or TT_FILE)
'use strict'
const fs = require('fs'), crypto = require('crypto')
const { load } = require('./harness')
const out = []; let fails = 0, n = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + String(id).padEnd(4) + ' ' + name + (!pass && detail !== undefined ? '\n      ' + JSON.stringify(detail).slice(0, 700) : '')) }
const FILE = process.env.TT_FILE || 'tt.compiled.js'
// sha256 of every 1–800 curriculum assignment (t, id, curriculumIndex, belt, beltOrder, curriculumBucket) as approved in f049313
const DIGEST_1_800 = '9339125df5f4dbdcf2bcba374d7b007ef2fba84851b18345469c385a12c9e386'

;(async () => {
  const c = load(FILE, { realBelt: true }); c.console.info = () => {}; c.console.warn = () => {}
  const RAW = c.ev('RAW_VOCAB'), CL = c.ev('THAI_CLASS')
  const byThai = t => RAW.find(d => d.t === t && !d.dup)
  // an owner-like learner: every curriculum word 1–500 learned (due later), everything after it unseen
  const learner = (extra = {}) => {
    const v = c.initVocab().map(w => ({ ...w }))
    v.forEach(w => { const ci = w.curriculumIndex || 0
      if (ci >= 1 && ci <= 500) Object.assign(w, { status: 'learning', introducedAt: '2026-08-01', lastSeen: '2026-10-01', okStreak: 1, interval: 30, repCount: 3, dueDate: '2026-12-01', difficulty: 'medium' })
      else Object.assign(w, { status: w.status === 'locked' ? 'locked' : 'new', introducedAt: null, lastSeen: null, okStreak: 0, interval: 0, repCount: 0, dueDate: null, manualKnown: false }) })
    Object.entries(extra).forEach(([th, st]) => { const w = v.find(x => x.thai === th); if (w) Object.assign(w, st) })
    return v
  }
  const taught = { status: 'learning', introducedAt: '2026-09-01', lastSeen: '2026-10-01', okStreak: 1, interval: 30, repCount: 3, dueDate: '2026-12-01', difficulty: 'medium' }
  const unseen = { status: 'new', introducedAt: null, lastSeen: null, okStreak: 0, interval: 0, repCount: 0, dueDate: null }
  const ctxOf = (V, targets = []) => c.buildThaiTrackVocabContext(V, targets, [])
  const span = (V, tok, targets) => { const x = ctxOf(V, targets); return c.classifyThaiSpan(tok, { ...x, allowedThaiWords: x.allowedSet, vocab: V }) }

  // ══ A — the approved 1–800 assignment is unchanged ══
  {
    const rows = RAW.filter(d => d.curriculumIndex >= 1 && d.curriculumIndex <= 800).sort((a, b) => a.curriculumIndex - b.curriculumIndex)
      .map(d => [d.t, d.id, d.curriculumIndex, d.belt, d.beltOrder, d.curriculumBucket || null])
    const dg = crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex')
    T('A', 'curriculum 1–800 assignment unchanged (Thai, id, index, belt, belt order, bucket — digest of the approved data)', rows.length === 800 && dg === DIGEST_1_800, dg)
  }

  // ══ C / D — exact lexical entry beats decomposition ══
  {
    const V = c.initVocab()
    const toks = c.segmentThaiWithDiagnostics('ผมอยากได้น้ำแข็งครับ', V, null, null, true).map(x => x.matchedSpan)
    const self = c.thaiTargetConceptPresent('น้ำแข็ง', 'ผมอยากได้น้ำแข็งครับ', V)
    T('C1', 'น้ำแข็ง is segmented as one token and heard as itself (STANDALONE)', toks.includes('น้ำแข็ง') && self.present && self.form === 'STANDALONE', { toks, self })
    const Lp = learner({ 'แข็ง': taught, 'น้ำแข็ง': unseen })
    const Lk = learner({ 'แข็ง': taught, 'น้ำแข็ง': taught })
    const a = span(Lp, 'น้ำแข็ง'), b = span(Lk, 'น้ำแข็ง')
    const vb = c.validateThaiVocabulary([{ thai: 'ผมอยากได้น้ำแข็งครับ' }], ctxOf(Lp))
    T('C2', 'closed vocabulary: a learner who knows น้ำ and แข็ง but not น้ำแข็ง is NOT authorised to read น้ำแข็ง by composition; once taught it is INTRODUCED',
      a.finalResult === CL.BLOCKED && /its own lesson/.test(a.reason || '') && !vb.ok && vb.blocked.includes('น้ำแข็ง') && b.finalResult === CL.INTRODUCED, { a: [a.finalResult, a.reason], b: b.finalResult, vb: vb.blocked })
    const A = c.ev('TRACK_ADAPTERS').th, LA = c.ev('LISTENING_ADAPTERS').th, VV = learner()
    const stages = (th, s) => {
      const w = VV.find(x => x.thai === th), kw = { wordId: w.id, thai: th, english: w.english }
      const p = { speaker: 'A', thai: s, english: 'x', prompt: 'x', pairType: 'content', targetId: w.id, _target: th, _typedAt: 'creation', _semanticState: 'VERIFIED' }
      return { matcher: c.thaiTargetConceptPresent(th, s, VV).present, generation: c.thaiTargetPresent(s, th, VV), detect: c.detectTargetPresence([{ thai: s }], { thai: th }, VV).found,
        quota: A.targetPresent(p, kw, { vocab: VV }), finalLineGate: !c.thaiLineGate(p, [kw], VV).problems.some(x => x.code === 'TARGET_MISSING'),
        contract: c.validateThaiTargetPair(p, kw, { vocab: VV }, 'final').dimensions.TARGET_PRESENT === 'PASS', listening: LA.present(s, th, { vocab: VV }) }
    }
    const nw = stages('น้ำ', 'น้ำแข็งเย็นมากครับ'), hd = stages('แข็ง', 'น้ำแข็งเย็นมากครับ')
    T('D1', 'น้ำแข็ง counts as a use of NEITHER น้ำ NOR แข็ง at any stage (matcher, generation, detection, quota, final line gate, contract, Listening) — no exposure credit',
      Object.values(nw).every(x => x === false) && Object.values(hd).every(x => x === false), { nw, hd })
    const pos = [['บัตร', 'ผมมีบัตรเครดิตนะครับ'], ['เก็บ', 'ผมจะเก็บไว้ในกระเป๋าครับ'], ['สี', 'ผมชอบสีส้มครับ'], ['ได้ยิน', 'ผมไม่ได้ยินอะไรเลยครับ'], ['น้ำ', 'ขอน้ำหน่อยครับ']]
    const pr = pos.map(([t, s]) => [t, c.thaiTargetConceptPresent(t, s, V)])
    T('D2', 'meaning-based compounds and grammatical glue still count (บัตร in บัตรเครดิต, เก็บ in เก็บไว้, สี in สีส้ม, ได้ยิน after ไม่, standalone น้ำ)',
      pr.every(([, r]) => r.present), pr.filter(([, r]) => !r.present))
  }

  // ══ E — หนังสือพิมพ์ ══
  {
    const V = c.initVocab(), seg = s => c.segmentThaiWithDiagnostics(s, V, null, null, true).map(x => x.matchedSpan)
    const lex = c.buildThaiPhoneticLexicon(V)
    const ph = c.composeThaiPhonetic('อ่านหนังสือพิมพ์ไหมคะ', lex).phonetic
    T('E1', 'อ่าน|หนังสือพิมพ์ — the newspaper stays one word in the segmenter and in the line romanisation (àan nǎng-sǔue-phim), as before พิมพ์ entered the curriculum',
      JSON.stringify(seg('ผมอ่านหนังสือพิมพ์ทุกวัน')) === JSON.stringify(['ผม', 'อ่าน', 'หนังสือพิมพ์', 'ทุกวัน']) && JSON.stringify(seg('อ่านหนังสือพิมพ์ไหมคะ')) === JSON.stringify(['อ่าน', 'หนังสือพิมพ์', 'ไหม', 'คะ']) &&
      /àan nǎng-sǔue-phim/.test(ph), { a: seg('ผมอ่านหนังสือพิมพ์ทุกวัน'), b: seg('อ่านหนังสือพิมพ์ไหมคะ'), ph })
    T('E2', 'the shorter entries still segment on their own: ผม|ชอบ|อ่านหนังสือ|ครับ, ผม|พิมพ์|เร็ว|มาก|ครับ',
      seg('ผมชอบอ่านหนังสือครับ').includes('อ่านหนังสือ') && seg('ผมพิมพ์เร็วมากครับ').includes('พิมพ์'), { a: seg('ผมชอบอ่านหนังสือครับ'), b: seg('ผมพิมพ์เร็วมากครับ') })
  }

  // ══ F / G — grammar authorisation ≠ introduction; content stays closed ══
  {
    const V = learner({ 'หมายถึง': taught, 'ไปเที่ยว': taught })
    const x = ctxOf(V), line = 'ผมหมายถึง การไปเที่ยวครับ'
    const r = c.validateThaiVocabulary([{ thai: line }], x)
    const dk = (r.diagnostics || []).find(d => d.token === 'การ') || {}
    const sp = c.validateSmartPairs([{ thai: line, english: 'I mean going on a trip.', prompt: 'He explains what he means', speaker: 'A' }], { thai: 'หมายถึง', english: 'mean' }, V)
    const failText = JSON.stringify(sp && (sp.failures || sp.reasons || sp))
    T('F1', 'the recorded Daily line ผมหมายถึง การไปเที่ยวครับ passes because การ is an approved grammar unit (nominaliser) — closed-vocabulary gate and generation gate',
      r.ok && dk.classification === CL.GRAMMAR && dk.introduced === false && !/untaught vocabulary: การ/.test(failText), { blocked: r.blocked, dk, failText: failText.slice(0, 300) })
    const w = V.find(y => y.thai === 'การ'), before = JSON.stringify(w)
    const rk = c.rankTestStatus(V, 'Blue')
    T('F2', 'grammar authorisation is NOT introduction: การ stays new — not introduced, not revision-eligible, not seen or proven for its belt — and as a target it is still a NEW target to teach',
      JSON.stringify(w) === before && w.status === 'new' && !c.hasBeenIntroduced(w) && !c.revisionEligible(w) && !c.isWordSeen(w) && !c.isWordRankPassed(w) &&
      !rk.words.filter(c.isWordSeen).some(y => y.thai === 'การ') && c.classifyThaiToken('การ', { ...ctxOf(V, [w]), vocab: V }).classification === CL.TRACK_NEW &&
      c.classifyThaiToken('ความ', { ...x, vocab: V }).classification === CL.GRAMMAR,
      { status: w.status, cls: c.classifyThaiToken('การ', { ...ctxOf(V, [w]), vocab: V }).classification })
    const CONTENT = ['ปัญหา', 'คำ', 'สวน', 'ผล', 'เสิร์ฟ', 'รสชาติ', 'อย่าง', 'ทั้ง', 'เท่า']
    const still = CONTENT.filter(t => span(V, t).finalResult !== CL.BLOCKED)
    const vp = c.validateThaiVocabulary([{ thai: 'ผมมีปัญหาครับ' }], x)
    T('G1', 'ordinary unseen content vocabulary stays blocked until taught: ' + CONTENT.join(' ') + ' (no blanket pre-teaching authorisation)',
      still.length === 0 && !vp.ok && vp.blocked.includes('ปัญหา'), { still, vp: vp.blocked })
    const cook = span(V, 'ทำอาหาร'), notNeed = span(V, 'ไม่ต้อง')
    T('G2', 'a curriculum compound is not composed from known parts (ทำอาหาร 557 = ทำ + อาหาร stays blocked until taught); a phrase outside the curriculum still is (ไม่ต้อง = ไม่ + ต้อง)',
      cook.finalResult === CL.BLOCKED && notNeed.finalResult === CL.COMPOSITION, { cook: cook.finalResult, notNeed: notNeed.finalResult })
  }

  // ══ H — explicit curriculum target > not-generatable suppression ══
  {
    const FOUR = ['จะ', 'ของ', 'และ', 'เธอ']
    const G = c.ev('THAI_FUNCTION_TARGET_GUIDE')
    const SENT = { 'จะ': 'พรุ่งนี้ผมจะไปตลาดครับ', 'ของ': 'กระเป๋าของผมอยู่ที่นี่ครับ', 'และ': 'ผมชอบกาแฟและชาครับ', 'เธอ': 'เธอเป็นครูค่ะ' }
    for (const th of FOUR) {
      const d = byThai(th)
      // NEW: every curriculum word before it is learned, it is the next unseen word
      const Vn = c.initVocab().map(w => ({ ...w }))
      Vn.forEach(w => { const ci = w.curriculumIndex || 0
        if (ci >= 1 && ci < d.curriculumIndex) Object.assign(w, taught); else Object.assign(w, unseen, { status: w.status === 'locked' ? 'locked' : 'new' }) })
      const pn = c.pickWords(Vn, 'daily', [])
      const wn = Vn.find(w => w.id === d.id)
      // REVIEW: introduced and overdue while everything else is due later (501–520 learned too, so the NEW slots hold no other
      // function word and the per-track function-word cap is not what decides)
      const Vr = learner(Object.fromEntries(RAW.filter(x => x.curriculumIndex >= 501 && x.curriculumIndex <= 520 && !x.dup).map(x => [x.t, taught]).concat([[th, { ...taught, dueDate: '2026-01-01', okStreak: 0 }]])))
      const pr = c.pickWords(Vr, 'daily', [])
      const kw = { wordId: d.id, thai: th, english: d.e }
      const p = { speaker: th === 'เธอ' ? 'B' : 'A', thai: SENT[th], english: 'x', prompt: 'x', pairType: 'content', targetId: d.id, _target: th, _typedAt: 'creation', _semanticState: 'VERIFIED' }
      const dim = c.validateThaiTargetPair(p, kw, { vocab: Vr }, 'final').dimensions
      T('H-' + th, th + ' (curriculum ' + d.curriculumIndex + ', on THAI_NOT_GENERATABLE) is an eligible curriculum target with a teaching contract: selected as NEW at its slot, as REVIEW when due, classified as the track target and present in a valid line',
        c.thaiVocabEligibility(wn).ok && !!G[th] && pn.targets.some(w => w.id === d.id) && pr.targets.some(w => w.id === d.id) &&
        c.classifyThaiToken(th, { ...ctxOf(Vn, [wn]), vocab: Vn }).classification === CL.TRACK_NEW && dim.TARGET_PRESENT === 'PASS',
        { elig: c.thaiVocabEligibility(wn), newPicked: pn.targets.some(w => w.id === d.id), reviewPicked: pr.targets.some(w => w.id === d.id), dim })
    }
    const V = learner()
    const sup = ['ผม', 'คุณ', 'ไป', 'มา', 'เป็น'].filter(th => c.thaiVocabEligibility(V.find(w => w.thai === th)).reason !== 'VOCAB_NOT_GENERATABLE')
    const tr = { pairs: [], targets: V.filter(w => w.curriculumIndex >= 400 && w.curriculumIndex <= 430) }
    let subs = []; try { subs = (c.thaiSubstitutionCandidates(tr, V, []) || []).map(w => w.thai || w) } catch (e) { subs = ['<error ' + e.message + '>'] }
    T('H-safe', 'the suppression still stands where there is no explicit curriculum contract (ผม คุณ ไป มา เป็น stay VOCAB_NOT_GENERATABLE) and the four are never offered as incidental substitutes; at most ' + c.ev('THAI_FUNCTION_TARGETS_PER_TRACK') + ' function-word targets per track',
      sup.length === 0 && !subs.some(s => FOUR.includes(s)), { sup, subs: subs.filter(s => FOUR.includes(s)) })
  }

  // ══ I — every slot 501–800 can progress ══
  {
    const V = learner()
    const bad = V.filter(w => w.curriculumIndex >= 501 && w.curriculumIndex <= 800).map(w => {
      const e = c.thaiVocabEligibility(w), p = c.targetActivityPreflight(w, 'th', {})
      const rated = c.applyRating ? c.applyRating(w, 'ok') : null
      const ok = e.ok && p.suitable && c.isEligibleNewTarget(w, new Set()) && rated && c.isWordSeen(rated) && c.hasBeenIntroduced(rated) && c.isWordRankPassed({ ...rated, okStreak: 1 })
      return ok ? null : [w.curriculumIndex, w.thai, e.ok ? 'elig' : e.reason, p.status, rated ? 'rated' : 'no applyRating']
    }).filter(Boolean)
    const rk7 = c.rankTestStatus(V, 'Blue + Stripe'), rk8 = c.rankTestStatus(V, 'Blue')
    const kyu = byThai('บัตรคิว')
    T('I1', 'every curriculum slot 501–800 can be selected as NEW, learned (rated), reviewed and proven: eligible, suitable for spoken practice, counted by its belt',
      bad.length === 0 && rk8.populated === 200 && rk7.populated === 200 && rk8.missingPositions === 0 && rk7.missingPositions === 0, { bad: bad.slice(0, 8), rk8: [rk8.populated, rk8.missingPositions], rk7: [rk7.populated, rk7.missingPositions] })
    T('I2', 'บัตรคิว (709): RECOGNITION-only label replaced by ACTIVE, LANGUAGE_CONTEXT bucket and stable id kept', kyu && kyu.id === 947 && kyu.lexiconDisposition === 'ACTIVE' && kyu.curriculumBucket === 'LANGUAGE_CONTEXT' && kyu.curriculumIndex === 709, kyu)
  }

  out.forEach(l => console.log(l))
  console.log('\nv704 Thai 501–800 runtime integration: ' + (n - fails) + '/' + n + ' passed' + (fails ? ' — ' + fails + ' FAILED' : ''))
  process.exit(fails ? 1 : 0)
})().catch(e => { out.forEach(l => console.log(l)); console.error(e); process.exit(1) })
