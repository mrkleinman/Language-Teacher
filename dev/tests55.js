// v698 — TOPICS + THAI WEDDING SPEECH regression (the owner's Phase 9 list, cases 1–36).
// Real app code throughout: the dictionary seed, the topic selector, the shared Daily freeze, the closed-vocabulary gate,
// the complexity contract, the cue-clarity pass, the shared finaliser (finaliseMainTrack, the model simulated at the
// transport boundary — tests14) and the Teachers / Topics screens rendered with react-test-renderer. No provider calls.
//   node tests55.js            (current build: tt.compiled.js, or TT_FILE)
//   TT_BASE=path node tests55.js  also compares Daily / Revision selection with a pre-Topics build (case 36)
'use strict'
const { load } = require('./harness')
const { sentence, mock, FR } = require('./tests14')
const React = require('react'), TR = require('react-test-renderer')
const fs = require('fs')
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const out = []; let fails = 0, n = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + String(id).padStart(2) + '  ' + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 1500) : '')) }
const FILE = process.env.TT_FILE || 'tt.compiled.js'
const KEY = 'AIzaSyTEST-harness-key-000000'
const textOf = x => x == null ? '' : typeof x === 'string' ? x : Array.isArray(x) ? x.map(textOf).join(' ') : textOf(x.children)
const flush = async (k = 40) => { for (let i = 0; i < k; i++) await new Promise(r => setImmediate(r)) }
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const rc = () => { const c = load(FILE, { React }); c.console.info = () => {}; c.console.warn = () => {}; return c }

// The owner's list, verbatim order (independent of the app's own data block)
const WEDDING = ['ทุกคน', 'ขอบพระคุณ', 'พ่อแม่', 'ความรัก', 'ดูแล', 'ต้อนรับ', 'เลี้ยงดู', 'ขอให้', 'งานแต่งงาน', 'จริงใจ',
  'เชื่อใจ', 'เสมอ', 'ให้อภัย', 'ตลอดไป', 'เคารพ', 'ความทรงจำ', 'อบอุ่น', 'คิดถึง', 'หัวเราะ', 'เจ้าสาว',
  'ร่วมกัน', 'เป็นห่วง', 'ให้กำลังใจ', 'ความสัมพันธ์', 'อวยพร', 'ทุกอย่าง', 'ปัญหา', 'ผ่าน', 'เรียนรู้', 'ในที่สุด',
  'ทำให้', 'ความหมาย', 'ฝัน', 'ซื่อสัตย์', 'เอาใจใส่', 'ความหวัง', 'สบายใจ', 'ยินดี', 'ยอมรับ', 'แบ่งปัน',
  'ประสบการณ์', 'เติบโต', 'เปลี่ยนแปลง', 'บางครั้ง', 'คำพูด', 'สนับสนุน', 'แสดง', 'คนอื่น', 'แม้ว่า', 'เจ้าบ่าว']

// A realistic learner: curriculum ranks 1–311 learned (due on varied dates), everything else unseen. Topic entries come
// from the dictionary as unintroduced words, exactly as the load sync appends them.
function learner(c) {
  const v = c.initVocab().map(w => ({ ...w }))
  v.forEach(w => { const ci = w.curriculumIndex
    if (ci >= 1 && ci <= 311) { w.status = 'learning'; w.introducedAt = '2026-08-01'; w.lastSeen = '2026-09-20'; w.okStreak = 1; w.interval = 3; w.dueDate = '2026-09-2' + (ci % 7); w.difficulty = 'medium' }
    else { if (w.status !== 'locked') w.status = 'new'; w.lastSeen = null; w.introducedAt = null; w.dueDate = null; w.okStreak = 0 } })
  return v
}
const introduce = (w, extra = {}) => Object.assign(w, { status: 'learning', introducedAt: '2026-09-01', lastSeen: '2026-09-25', okStreak: 1, interval: 3, dueDate: '2026-09-30', difficulty: 'medium' }, extra)

;(async () => {
  const c = rc()
  const TOP = c.topicById('th', 'wedding-speech')
  const ids = TOP ? TOP.vocabIds.slice() : []
  const canon = c.thaiCanonicalById()
  const RAW = c.ev('RAW_VOCAB')
  const idOf = th => ids[WEDDING.indexOf(th)]

  // ══ Vocabulary integrity ══
  {
    const recs = ids.map(id => canon.get(id))
    T(1, 'all 50 ordered topic entries resolve to valid canonical Thai ids, in the owner\'s exact order, with Thai, English and tone-marked phonetics',
      ids.length === 50 && recs.every(Boolean) && same(recs.map(r => r.t), WEDDING) && recs.every(r => r.e && r.ph && /[àáâǎ]|[èéêě]|[ìíîǐ]|[òóôǒ]|[ùúûǔ]|-/.test(r.ph)) &&
      c.initVocab().filter(w => ids.includes(w.id)).length === 50,
      { n: ids.length, bad: recs.map((r, k) => r && r.t === WEDDING[k] ? null : [k + 1, r && r.t]).filter(Boolean).slice(0, 5) })
    const live = RAW.filter(d => !d.dup)
    const perThai = WEDDING.map(th => live.filter(d => d.t === th).length)
    const seed = TOP.seed || {}
    T(2, 'no duplicate canonical records: 50 unique ids, each Thai headword exactly once in the live dictionary; created + reused = 50',
      new Set(ids).size === 50 && perThai.every(k => k === 1) && (seed.created || []).length + (seed.reused || []).length === 50 && new Set(RAW.map(d => d.id)).size === RAW.length,
      { perThai, seed })
    // the pre-Topics runtime dictionary (TT_BASE) — or, without it, the source literal minus the v645 runtime audit fixes — vs now
    let orig, how
    if (process.env.TT_BASE && fs.existsSync(process.env.TT_BASE)) { orig = load(process.env.TT_BASE).ev('RAW_VOCAB'); how = 'pre-Topics build' }
    else { const m = /^const RAW_VOCAB = (\[.*\])\s*$/m.exec(fs.readFileSync('tt.jsx', 'utf8')); const aud = new Set(c.ev('THAI_LEXICON_AUDIT_V645').filter(a => a.applied).map(a => a.id))
      orig = (m ? JSON.parse(m[1]) : []).filter(d => !aud.has(d.id)); how = 'source literal' }
    const byIdNow = new Map(RAW.map(d => [d.id, d]))
    const changed = orig.filter(d => JSON.stringify(byIdNow.get(d.id)) !== JSON.stringify(d))
    T(6, 'existing belt assignments preserved: every pre-existing dictionary record is byte-identical to the ' + how + ' (curriculum index, belt, belt order, text, phonetic, QC)',
      orig.length > 1500 && changed.length === 0 && RAW.filter(d => !orig.some(o => o.id === d.id)).length === (seed.created || []).length, { orig: orig.length, now: RAW.length, changed: changed.slice(0, 3).map(d => d.id) })
    const created = ids.map(id => canon.get(id)).filter(r => r.topicOnly)
    T(5, 'new topic-only entries carry no Shodan position: curriculumIndex 0, beltOrder 0, "Beyond curriculum", not Known, not introduced; no rank lists them',
      created.length === (seed.created || []).length && created.every(r => r.curriculumIndex === 0 && !r.beltOrder && r.belt === 'Beyond curriculum' && r.l === 'new' && !r.r) &&
      c.ev('RANK_ORDER').every(rk => !c.wordsForRank(learner(c), rk).some(w => ids.includes(w.id))) &&
      c.initVocab().filter(w => ids.includes(w.id)).every(w => w.status === 'new' && !c.hasBeenIntroduced(w)),
      { created: created.length })
    // idempotent: seeding again finds all 50 and creates nothing
    const copy = RAW.map(d => ({ ...d }))
    const again = c.seedThaiTopicEntries(copy, c.ev('TOPIC_WEDDING_SPEECH_TH'), 'wedding-speech', c.ev('THAI_TOPIC_ID_BASE'))
    T(4, 'reinitialising the topic is idempotent: a second seed creates 0 records, reuses all 50 and returns the same ids',
      again.created.length === 0 && again.reused.length === 50 && same(again.ids, ids) && copy.length === RAW.length, again)
  }

  // ══ 3 / 35-a  the load sync: an existing learner save (no topic entries) keeps every record; topic entries arrive unintroduced ══
  {
    // the saved learner (no topic rows) is loaded by the real Teacher; the result is compared with the SAME load on the
    // pre-Topics build (TT_BASE), so the app's existing load migrations (v641 aliases etc.) are not mistaken for the import
    const loadSync = async file => {
      const cx = load(file, { React }); cx.console.info = () => {}; cx.console.warn = () => {}
      const before = learner(cx).filter(w => !ids.includes(w.id))
      before.find(w => w.curriculumIndex === 5).bookmarked = true
      cx.localStorage.setItem('tt-vocab', JSON.stringify(before)); cx.localStorage.setItem('tt-tracks', JSON.stringify([]))
      let r
      await TR.act(async () => { r = TR.create(React.createElement(cx.ThaiTeacher, { lang: 'th', onSetLang: () => {} })); await flush(60) })
      const after = JSON.parse(cx.localStorage.getItem('tt-vocab'))
      await TR.act(async () => { r.unmount() })
      return { cx, before, after }
    }
    const { cx: c3, before, after } = await loadSync(FILE)
    const keep = ['status', 'introducedAt', 'lastSeen', 'okStreak', 'interval', 'dueDate', 'difficulty', 'manualKnown', 'bookmarked', 'repCount', 'lapses']
    const pick = w => JSON.stringify(keep.map(f => w ? w[f] : null))
    let ref = null, how = 'saved input'
    if (process.env.TT_BASE && fs.existsSync(process.env.TT_BASE)) { ref = (await loadSync(process.env.TT_BASE)).after; how = 'pre-Topics build after the same load' }
    const refById = new Map((ref || before).map(w => [w.id, w])), nowById = new Map(after.map(w => [w.id, w]))
    const diff = before.filter(w => pick(refById.get(w.id)) !== pick(nowById.get(w.id)))
    const topicRows = after.filter(w => ids.includes(w.id))
    T(3, 'existing word histories unchanged by the import: every saved record\'s SRS / Known / bookmark state equals the ' + how + '; the 50 topic rows are appended as new and unintroduced',
      diff.length === 0 && topicRows.length === 50 && topicRows.every(w => w.status === 'new' && !w.introducedAt && !c3.hasBeenIntroduced(w)) && after.length === before.length + 50 && (!ref || ref.length === before.length),
      { diff: diff.slice(0, 3).map(w => [w.id, pick(refById.get(w.id)), pick(nowById.get(w.id))]), topicRows: topicRows.length })
  }

  // ══ 7  the normal Daily new-word picker never selects a topic-only entry ══
  {
    const L = learner(c)
    // exhaust the curriculum so the only unseen words left are Beyond-curriculum ones (where a generic pool would reach)
    L.forEach(w => { if (w.curriculumIndex >= 1) introduce(w) })
    const pick = c.pickWords(L, 'daily', [])
    const raw = (pick.targets || []).map(w => w.id)
    const res = (pick.reserve || []).map(w => w.id)
    const elig = L.filter(w => ids.includes(w.id)).map(w => c.isEligibleNewTarget(w, new Set()))
    T(7, 'normal Daily Track new-word selection excludes the unranked topic-only entries (picker targets, reserve, eligibility layer)',
      raw.length > 0 && !raw.some(id => ids.includes(id)) && !res.some(id => ids.includes(id)) && elig.every(x => x === false),
      { topicInPick: raw.filter(id => ids.includes(id)), topicInReserve: res.filter(id => ids.includes(id)).length })
  }

  // ══ 8  dictionary search and detail views reach topic words ══
  {
    const c8 = rc(); const L = learner(c8)
    let r
    await TR.act(async () => { r = TR.create(React.createElement(c8.Browser, { vocab: L, onBack() {}, initialFilter: 'all', initialQuery: 'ขอบพระคุณ', phonetics: {}, onCustomTrack() {}, apiKey: '', onVocabUpdate() {} })); await flush() })
    const t = textOf(r.toJSON())
    T(8, 'global dictionary search finds a topic word (Browse, the existing vocabulary inspector): ขอบพระคุณ with its English',
      t.includes('ขอบพระคุณ') && /thank you/i.test(t), t.slice(0, 300))
    await TR.act(async () => { r.unmount() })
  }

  // ══ Topic selection ══
  const L0 = learner(c)
  const s0 = c.selectThaiTopicTargets(L0, 'wedding-speech')
  T(9, 'first topic generation selects the first five eligible unintroduced words (priority 1–5)',
    same(s0.selectedNewTargetIds, ids.slice(0, 5)), { got: s0.selectedNewTargetIds, want: ids.slice(0, 5) })
  {
    const L = learner(c); introduce(L.find(w => w.id === idOf('ทุกคน'))); introduce(L.find(w => w.id === idOf('ความรัก')))
    const s = c.selectThaiTopicTargets(L, 'wedding-speech')
    const want = ['ขอบพระคุณ', 'พ่อแม่', 'ดูแล', 'ต้อนรับ', 'เลี้ยงดู'].map(idOf)
    T(10, 'already-introduced topic words are skipped (owner\'s example: ทุกคน and ความรัก learned → ขอบพระคุณ, พ่อแม่, ดูแล, ต้อนรับ, เลี้ยงดู)',
      same(s.selectedNewTargetIds, want) && !s.selectedNewTargetIds.includes(idOf('ทุกคน')), { got: s.selectedNewTargetIds.map(id => canon.get(id).t) })
    const L2 = learner(c); ids.slice(0, 5).forEach(id => introduce(L2.find(w => w.id === id)))
    const s2 = c.selectThaiTopicTargets(L2, 'wedding-speech')
    T(11, 'the next highest-priority eligible words follow (after 1–5 are introduced: priority 6–10)', same(s2.selectedNewTargetIds, ids.slice(5, 10)), s2.selectedNewTargetIds)
  }
  T(12, 'exactly 30 unique targets when feasible, not blocked', s0.targets.length === 30 && new Set(s0.targetIds).size === 30 && !s0.blocked, { n: s0.targets.length, blocked: s0.blocked })
  {
    const rv = c.selectThaiRevisionTargets(L0, 100000).targets.map(w => w.id)
    T(13, 'the 25 remaining targets come from the existing global SRS revision queue, in its order',
      s0.selectedRevisionTargetIds.length === 25 && same(s0.selectedRevisionTargetIds, rv.filter(id => !s0.selectedNewTargetIds.includes(id)).slice(0, 25)),
      { rev: s0.selectedRevisionTargetIds.slice(0, 6), queue: rv.slice(0, 6) })
    const byId = new Map(L0.map(w => [w.id, w]))
    const shodanNew = s0.targetIds.filter(id => !ids.includes(id) && !c.hasBeenIntroduced(byId.get(id)))
    T(14, 'no regular Shodan-new word enters a Topic Track (every non-topic target was already introduced)', shodanNew.length === 0, shodanNew)
  }
  {
    const L = learner(c); ids.slice(0, 47).forEach(id => introduce(L.find(w => w.id === id)))
    const s = c.selectThaiTopicTargets(L, 'wedding-speech')
    T(15, '3 remaining topic-new words → 3 new + 27 revision (30 targets)',
      same(s.selectedNewTargetIds, ids.slice(47)) && s.selectedRevisionTargetIds.length === 27 && s.targets.length === 30 && !s.blocked, { nw: s.selectedNewTargetIds.length, rev: s.selectedRevisionTargetIds.length })
    const L2 = learner(c); ids.forEach(id => introduce(L2.find(w => w.id === id)))
    const s2 = c.selectThaiTopicTargets(L2, 'wedding-speech'), p2 = c.topicProgress('th', 'wedding-speech', L2)
    T(16, 'all 50 introduced → a revision-only track (0 new + 30 revision) and the "All topic words introduced" state',
      s2.selectedNewTargetIds.length === 0 && s2.selectedRevisionTargetIds.length === 30 && !s2.blocked && p2.allIntroduced && p2.remaining === 0, { nw: s2.selectedNewTargetIds.length, all: p2.allIntroduced })
  }
  {
    // ดูแล was met and rated Hard: status stays 'new' (the app's rule) but it IS introduced, and it is due
    const L = learner(c); const w = L.find(x => x.id === idOf('ดูแล'))
    Object.assign(w, { status: 'new', introducedAt: '2026-09-20', lastSeen: '2026-09-20', difficulty: 'hard', dueDate: '2026-09-21', okStreak: 0, interval: 1 })
    const s = c.selectThaiTopicTargets(L, 'wedding-speech')
    T(17, 'a due topic word (introduced, rated Hard) is selected as REVISION, never as new; the new slots go to the next unintroduced words',
      s.selectedRevisionTargetIds.includes(w.id) && !s.selectedNewTargetIds.includes(w.id) && same(s.selectedNewTargetIds, [ids[0], ids[1], ids[2], ids[3], ids[5]]),
      { rev: s.selectedRevisionTargetIds.includes(w.id), nw: s.selectedNewTargetIds.map(id => canon.get(id).t) })
  }
  {
    const L = learner(c); let k = 0
    L.forEach(w => { if (c.hasBeenIntroduced(w)) { if (k++ >= 12) Object.assign(w, { status: 'new', introducedAt: null, lastSeen: null, dueDate: null, okStreak: 0 }) } })
    const s = c.selectThaiTopicTargets(L, 'wedding-speech')
    const byId = new Map(L.map(w => [w.id, w]))
    T(18, 'insufficient SRS revision words → explicitly BLOCKED (mode topic, eligible < 30, a plain reason) and never padded with unintroduced Shodan words',
      !!s.blocked && s.blocked.mode === 'topic' && s.blocked.required === 30 && /needs 30 targets/.test(s.blocked.reason) && /no curriculum word/.test(s.blocked.reason) &&
      s.targets.every(t => ids.includes(t.id) || c.hasBeenIntroduced(byId.get(t.id))), s.blocked)
  }

  // ══ 19  a failed generation marks nothing introduced (the real Generator, provider down) ══
  {
    const c19 = rc(); const L = learner(c19); c19.applyThaiCanonicalAliases(L)   // the state a real load leaves (v641 aliases applied)
    const LEARN = ['status', 'introducedAt', 'lastSeen', 'okStreak', 'interval', 'dueDate', 'difficulty', 'manualKnown', 'repCount', 'lapses']
    const learnState = () => JSON.stringify(L.map(w => [w.id, ...LEARN.map(f => w[f])]))
    const snap = learnState()
    c19.mockGeminiGenerate = async () => { throw new Error('Failed to fetch') }
    const phon = []
    let r
    await TR.act(async () => { r = TR.create(React.createElement(c19.Generator, { vocab: L, mode: 'daily', topicId: 'wedding-speech', onGenerated() { phon.push('generated') }, onBack() {}, apiKey: KEY,
      tracks: [], dailyNewWords: null, onSaveDailyNewWords: x => phon.push(['slots', x]), onPhonetics: m => phon.push(['ph', m]) })); await flush(80) })
    await TR.act(async () => { await flush(80) })
    const gb = r.root.findAll(x => x.type === 'button').find(b => /Generate Track from this Scene/.test(textOf(b.children)))
    if (gb) { await TR.act(async () => { gb.props.onClick(); await flush(200) }); for (let i = 0; i < 10; i++) await TR.act(async () => { await flush(100) }) }
    const t = textOf(r.toJSON()).replace(/\s+/g, ' ')
    T(19, 'failed generation (provider down → 0/90, Track not ready) creates no learning progress: every word\'s SRS / introduced state is unchanged, no topic word is introduced, the Daily new-word slots are not written, nothing is saved',
      !!gb && /not ready/i.test(t) && learnState() === snap && ids.every(id => !c19.hasBeenIntroduced(L.find(w => w.id === id))) && !phon.some(x => Array.isArray(x) && x[0] === 'slots') && !phon.includes('generated'),
      { phon: phon.map(x => Array.isArray(x) ? x[0] : x), text: t.slice(0, 200) })
    await TR.act(async () => { r.unmount() })
  }

  // ══ Daily Track integrity: a Topic Track runs through the SAME shared finaliser as a Daily Track ══
  const S = { c, vocab: L0, targets: s0.targetIds.map(id => L0.find(w => w.id === id)) }
  const topicTrack = (o = {}) => {
    const fr = [{ pairType: 'framing', speaker: 'A', thai: 'สวัสดีครับ', english: 'Hello.', prompt: 'greeting', _semanticState: 'VERIFIED', _semNat: 5, _semCue: 'n/a', _pairKey: 'f0' },
                { pairType: 'framing', speaker: 'B', thai: 'สวัสดีค่ะ', english: 'Hello.', prompt: 'greeting', _semanticState: 'VERIFIED', _semNat: 5, _semCue: 'n/a', _pairKey: 'f1' }]
    const pairs = fr.slice()
    S.targets.forEach(t => { const k3 = o.counts && o.counts[t.id] != null ? o.counts[t.id] : 3
      for (let k = 0; k < k3; k++) { const s = (o.sent && o.sent(t, k)) || sentence(S, 'th', t, 'gen', k)
        pairs.push({ ...s, targetId: t.id, wordId: t.id, recallIndex: k + 1, _source: 'gemini-check-1:conv', language: 'th', pairType: 'content', _target: t.thai, recallGroupId: 'rg-' + t.id, _semanticState: 'VERIFIED', _semNat: 5, _semCue: 5, words: [], phonetic: '' }) } })
    const nw = new Set(s0.selectedNewTargetIds)
    const tr = { createdAt: '2026-10-14T01:00:00.000Z-topic' + (o.tag || ''), date: '14 Oct 2026', mode: 'daily', trackMode: 'daily', language: 'th', trackType: 'daily', selectionMode: 'topic',
      topicId: 'wedding-speech', topicTitle: 'Wedding Speech', pairs, keywords: S.targets.map(t => ({ wordId: t.id, thai: t.thai, english: t.english, phonetic: t.phonetic || '', rating: null, isNew: nw.has(t.id), isUnseen: nw.has(t.id) })), rated: false }
    tr.selectedTargetIds = tr.keywords.map(k => k.wordId); tr.selectedNewTargetIds = s0.selectedNewTargetIds.slice()
    tr.selectedRevisionTargetIds = s0.selectedRevisionTargetIds.slice()
    return tr
  }
  const ADAPTER = c.ev('TRACK_ADAPTERS').th
  const NOREC = { ...ADAPTER, recoverTargetPairs: async () => ({ accepted: [], reasons: ['recovery unavailable in this test'] }) }
  const fin = async (track, adapter) => { const log = []; const t = await c.finaliseMainTrack(track, adapter || ADAPTER, { vocab: L0, apiKey: 'k', model: 'gemini-2.5-flash-lite', qcRan: true, onLog: m => log.push(m) }); return { t, log } }
  mock(S, 'th', {})
  {
    const { t, log } = await fin(topicTrack())
    const rd = c.trackReadiness(t)
    const occ = {}; (t.pairs || []).forEach(p => { if (p && p.targetId != null && c.classifyTrackPair(p) === 'TARGET') occ[p.targetId] = (occ[p.targetId] || 0) + 1 })
    T(21, 'all 90 target-bearing pairs of a Topic Track pass the existing final integrity checks (READY 90/90, every invariant true)',
      rd.ready && rd.validTargetPairs === 90 && rd.expectedTargetPairs === 90 && t.integrity && t.integrity.status === 'READY', { rd: { ready: rd.ready, v: rd.validTargetPairs, reasons: rd.reasons }, log: log.filter(l => /⛔|NOT_READY/.test(l)).slice(0, 4) })
    T(20, 'every selected target — the 5 topic words included — appears in all three target-practice recalls', s0.targetIds.every(id => occ[id] === 3) && t.integrity.invariants.EVERY_TARGET_3_OF_3 === true,
      s0.targetIds.filter(id => occ[id] !== 3).map(id => [id, occ[id] || 0]))
    // 25 romanisation aligned with the persisted Thai
    const lex = c.buildThaiPhoneticLexicon(L0)
    const tp = (t.pairs || []).filter(p => p && s0.selectedNewTargetIds.includes(p.targetId))
    const aligned = tp.filter(p => { const r = canon.get(p.targetId); const ph = c.loadCanonicalThaiPhonetic(r.ph, r.t); return p.phonetic && p.phonetic.replace(/[\s.?]/g, '').includes(ph.replace(/[\s.?]/g, '').split('-')[0]) })
    T(25, 'romanisation stays aligned with the final persisted Thai: every topic-word line carries a phonetic built from the canonical tone-marked entry',
      tp.length === 15 && aligned.length === 15 && typeof lex === 'object', { lines: tp.length, aligned: aligned.length, ex: tp.slice(0, 2).map(p => [p.thai, p.phonetic]) })
    // 33-a: the finalised Topic Track keeps its provenance through the shared finaliser
    T('33a', 'the shared finaliser keeps the topic provenance (selectionMode, topicId, topicTitle, new / revision ids)',
      t.selectionMode === 'topic' && t.topicId === 'wedding-speech' && t.topicTitle === 'Wedding Speech' && same(t.selectedNewTargetIds, s0.selectedNewTargetIds) && same(t.selectedRevisionTargetIds, s0.selectedRevisionTargetIds))
  }
  {
    const miss = s0.selectedNewTargetIds[2]
    const { t, log } = await fin(topicTrack({ counts: { [miss]: 2 }, tag: '-89' }), NOREC)
    const rd = c.trackReadiness(t)
    T('20b', 'a topic word with only 2 of 3 recalls keeps the track NOT_READY (89/90), the word listed unresolved — the 3/3 rule is not relaxed for topics',
      !rd.ready && rd.validTargetPairs <= 89 && rd.unresolvedTargetIds.map(String).includes(String(miss)), { v: rd.validTargetPairs, unresolved: rd.unresolvedTargetIds, log: log.filter(l => /\[22\]|ⓘ|rejected/.test(l)).slice(0, 6) })
  }
  {
    // 22 closed vocabulary: only the 5 selected topic words are unlocked — not the other 45
    const sel = new Set(s0.selectedNewTargetIds)
    const allowed = c.buildThaiAllowedSet({ vocab: L0, trackTargets: S.targets, grammarWords: c.ev('THAI_TRACK_GRAMMAR_WORDS') })
    const others = ids.filter(id => !sel.has(id)).map(id => canon.get(id).t)
    const leaks = others.filter(th => allowed.has(th))
    const ctx = c.buildThaiTrackVocabContext(L0, S.targets, [])
    const tgtById = new Map(S.targets.map(t => [t.id, t]))
    const bad = { speaker: 'A', thai: 'ผมรักคุณตลอดไปครับ', english: 'I will love you forever.', prompt: 'He says he will love her forever', targetId: S.targets[10].id, recallIndex: 1, pairType: 'content', _target: S.targets[10].thai }
    const ok = { speaker: 'A', thai: 'ผมชอบ' + canon.get(s0.selectedNewTargetIds[0]).t + 'มากครับ', english: 'I really like everyone.', prompt: 'He says he really likes everyone', targetId: s0.selectedNewTargetIds[0], recallIndex: 1, pairType: 'content', _target: canon.get(s0.selectedNewTargetIds[0]).t }
    const audit = p => c.auditThaiTextVocabulary ? c.auditThaiTextVocabulary(p.thai, ctx) : null
    const cv = c.enforceThaiClosedVocabulary([bad, ok], ctx, { targetsById: tgtById, stage: 'save', onLog: () => {} })
    const keptBad = (cv.pairs || []).some(p => p && /ตลอดไป/.test(p.thai || ''))
    T(22, 'no closed-vocabulary leak: the 5 selected topic words are legal targets, the other 45 stay locked (ตลอดไป in a line is caught, never saved)',
      s0.selectedNewTargetIds.every(id => allowed.has(canon.get(id).t)) && leaks.length === 0 && !keptBad && (cv.pairs || []).some(p => p && p.thai === ok.thai),
      { leaks: leaks.slice(0, 5), keptBad, stats: cv.stats, a: audit(bad) })
  }
  {
    // 22b words the approved grammar lists already authorised for EVERY learner stay authorised although a topic made them dictionary entries
    const Lr = learner(c), tg = Lr.filter(w => w.status === 'learning').slice(0, 30)
    const A = c.buildThaiTrackVocabContext(Lr, tg, []).allowedSet
    let baseSame = null
    if (process.env.TT_BASE && fs.existsSync(process.env.TT_BASE)) {
      const b = load(process.env.TT_BASE); b.console.info = () => {}; b.console.warn = () => {}
      const Lb = learner(b), tb = Lb.filter(w => w.status === 'learning').slice(0, 30), Ab = b.buildThaiTrackVocabContext(Lb, tb, []).allowedSet
      baseSame = WEDDING.filter(w => Ab.has(w)).join() === WEDDING.filter(w => A.has(w)).join()
    }
    T('22b', 'approved-list words (ทุกคน, ทุกอย่าง, ปัญหา) stay legal in every regular track exactly as before Topics; other unintroduced topic words stay locked' + (baseSame == null ? ' (TT_BASE not set)' : ''),
      ['ทุกคน', 'ทุกอย่าง', 'ปัญหา'].every(w => A.has(w)) && !A.has('ตลอดไป') && !A.has('ความหวัง') && baseSame !== false, { allowed: WEDDING.filter(w => A.has(w)), baseSame })
  }
  {
    // 23 the same complexity contract (9th Kyu learner → same limits as the Daily Track)
    // the owner's belt (9th Kyu) pinned, as the app resolves it; the contract takes no topic input at all
    const st9 = { rank: '9th Kyu', label: 'Orange + Stripe', source: 'test' }
    const cc = c.getLearnerComplexityContract({ vocab: L0, lang: 'th', learnerState: st9 })
    const long = 'พ่อแม่ของผมดูแลทุกคนที่บ้านดีมากทุกวันครับ'
    const a = cc.analyse(long)
    const aTopic = cc.analyse('ผมขอบพระคุณพ่อแม่มากครับ')
    T(23, 'existing level limits stay in force on a Topic Track: the learner\'s contract (preferred 4–6, hard max ≤ 8) rejects an over-long topic sentence and accepts a short one',
      cc.hardMax === 8 && cc.preferredMin === 4 && cc.preferredMax === 6 && a.overHardMax === true && !aTopic.overHardMax, { belt: cc.belt, pref: cc.preferredMin + '-' + cc.preferredMax, hard: cc.hardMax, long: a.units, short: aTopic.units })
  }
  {
    // 24 topic membership / introduction never moves belt progress
    const L = learner(c)
    const b0 = JSON.stringify({ r: c.currentRankName(L), p: c.rankProgressFor(L), b: c.currentLearnerBelt(L) })
    ids.forEach(id => { const w = L.find(x => x.id === id); Object.assign(w, c.markWordKnown(w)) })
    const b1 = JSON.stringify({ r: c.currentRankName(L), p: c.rankProgressFor(L), b: c.currentLearnerBelt(L) })
    T(24, 'topic words — even all 50 marked Known — do not increase belt progress (rank, rank progress and belt identical)', b0 === b1, { b0: b0.slice(0, 200), b1: b1.slice(0, 200) })
  }
  {
    // 26 cue clarity (v696) still runs: a narrated wedding cue is reduced to the short spoken act
    const p = { speaker: 'A', thai: 'ผมขอบพระคุณพ่อแม่ครับ', english: 'I thank my parents.', prompt: 'Because the two families have come together at the wedding ceremony, he tells the bride\'s parents that he wishes to express his heartfelt gratitude for how warmly they have welcomed him into their family', targetId: idOf('ขอบพระคุณ') }
    const r = c.cueClarityPass('th', [p], { ...c.cueClarityCtx('th'), force: true })
    const np = r.pairs[0]
    T(26, 'cue clarity and translation checks stay active: an over-contextualised wedding cue is rewritten to a short cue that keeps the meaning',
      np.prompt !== p.prompt && np.prompt.length < 80 && /thank/i.test(np.prompt) && r.stats.checked === 1, { cue: np.prompt, stats: r.stats })
  }
  {
    // 26b the topic reaches the scene as a light preference only; a normal Daily scene prompt is unchanged
    const cx = rc(); const L = learner(cx); const sel = cx.selectThaiTopicTargets(L, 'wedding-speech')
    const prompts = []
    cx.mockGeminiGenerate = async (k, m, msgs) => { prompts.push(msgs.map(x => x.content).join('\n')); return JSON.stringify({ scene: 'Two friends talk.', characterA: 'Somchai', characterB: 'Nida', opening: 'สวัสดีครับ' }) }
    await cx.establishConvoScene(sel.targets, L, KEY, 'gemini-2.5-flash-lite', { topic: cx.topicById('th', 'wedding-speech') })
    await cx.establishConvoScene(sel.targets, L, KEY, 'gemini-2.5-flash-lite')
    T('26b', 'the topic reaches the scene request as a preference only ("Wedding Speech", never forced, speakers stay friends); without a topic the scene prompt has no topic text',
      prompts.length === 2 && /TOPIC \(preference only\)[^\n]*Wedding Speech/.test(prompts[0]) && /never force them/.test(prompts[0]) && /not family members/.test(prompts[0]) && !/TOPIC \(preference only\)/.test(prompts[1]),
      prompts.map(p => p.slice(-400)))
  }
  {
    // 27 target-word variety: three identical recalls of a topic word are not three distinct applications
    const tw = s0.selectedNewTargetIds[1]
    const { t } = await fin(topicTrack({ tag: '-dup', sent: (x, k) => x.id === tw ? sentence(S, 'th', x, 'gen', 0) : null }), NOREC)
    const rd = c.trackReadiness(t)
    const n3 = (t.pairs || []).filter(p => p && p.targetId === tw && c.classifyTrackPair(p) === 'TARGET').length
    T(27, 'target-word variety is still required: a topic word whose 3 recalls are the same sentence does not count 3/3 (NOT_READY)',
      !rd.ready && n3 < 3, { n3, v: rd.validTargetPairs })
  }

  // ══ UI and persistence ══
  const storeT = (cx, vocab, tracks) => { cx.localStorage.setItem('tt-vocab', JSON.stringify(vocab)); cx.localStorage.setItem('tt-tracks', JSON.stringify(tracks || [])) }
  {
    const found = {}
    for (const lang of ['th', 'ja', 'zh']) {
      const cx = rc()
      if (lang === 'th') storeT(cx, learner(cx))
      else cx.localStorage.setItem('tt-gemini-key', JSON.stringify(KEY))
      const Teacher = lang === 'ja' ? cx.JapaneseTeacher : lang === 'zh' ? cx.MandarinTeacher : cx.ThaiTeacher
      let r
      await TR.act(async () => { r = TR.create(React.createElement(Teacher, { lang, onSetLang: () => {} })); await flush(60) })
      const entry = r.root.findAll(x => x.props && x.props['data-topics-entry'] === lang && x.type === 'button')
      const banner = r.root.findAll(x => x.props && x.props['data-listening-latest'] && typeof x.type === 'string')
      const trackBtns = ['Daily Track', 'Revision Track', 'Listening Track'].every(l => r.root.findAll(x => x.type === 'button').some(b => textOf(b.children).includes(l)))
      found[lang] = { entry: entry.length, banner: banner.length, trackBtns, text: entry[0] ? textOf(entry[0].children) : '' }
      if (entry[0]) await TR.act(async () => { entry[0].props.onClick(); await flush(20) })
      found[lang].view = textOf(r.toJSON())
      found[lang].r = r; found[lang].c = cx
    }
    T(28, 'Topics appears on the Thai, Japanese and Mandarin dashboards, in the old banner position, with "Learn vocabulary for specific situations"; Daily / Revision / Listening cards are all still there',
      ['th', 'ja', 'zh'].every(l => found[l].entry === 1 && found[l].banner === 0 && found[l].trackBtns && /Topics/.test(found[l].text) && /Learn vocabulary for specific situations/.test(found[l].text)),
      Object.fromEntries(Object.entries(found).map(([k, v]) => [k, { entry: v.entry, banner: v.banner, trackBtns: v.trackBtns }])))
    const th = found.th
    const thView = th.view.replace(/\s+/g, ' ')
    const viewAll = th.r.root.findAll(x => x.props && x.props['data-topic-view-all'] === 'wedding-speech')[0]
    let rows = []
    if (viewAll) {
      const btn = th.r.root.findAll(x => x.type === 'button').find(b => b.findAll(y => y === viewAll).length)
      await TR.act(async () => { btn.props.onClick(); await flush(20) })
      rows = th.r.root.findAll(x => x.props && x.props['data-topic-word'] != null && typeof x.type === 'string')
    }
    T(29, 'Thai Topics shows Wedding Speech with its description, 50 total and a Generate button; "View all 50 words" lists the 50 in priority order with number, Thai, phonetic, English and status',
      /Wedding Speech/.test(thView) && thView.includes('Learn useful Thai for thanking family, telling your story, making promises and celebrating your wedding.') && /Generate Wedding Speech Track/.test(thView) &&
      rows.length === 50 && same(rows.map(x => +x.props['data-topic-word']), ids) && textOf(rows[0].children).includes('ทุกคน') && /thúk-khon/.test(textOf(rows[0].children)) && /everyone/i.test(textOf(rows[0].children)) && /Not introduced/.test(textOf(rows[0].children)),
      { rows: rows.length, first: rows[0] && textOf(rows[0].children) })
    // tapping a word opens the existing vocabulary inspector on that word, and Back returns to the list
    if (rows[1]) await TR.act(async () => { rows[1].props.onClick(); await flush(20) })
    const br = th.r.root.findAllByType(th.c.Browser)
    T('29b', 'tapping a topic word opens it in the existing vocabulary inspector (Browse, no second editor)', br.length === 1 && br[0].props.initialQuery === 'ขอบพระคุณ', { br: br.length })
    for (const lang of ['ja', 'zh']) {
      const v = found[lang].view
      found[lang].empty = /Topics coming soon\./.test(v) && !/[฀-๿]/.test(v) && !/Wedding Speech/.test(v)
    }
    T(30, 'Japanese and Mandarin show the proper empty state "Topics coming soon." — no Thai vocabulary, no dummy topics',
      found.ja.empty && found.zh.empty && (c.ev('LANGUAGE_TOPICS').ja || []).length === 0 && (c.ev('LANGUAGE_TOPICS').zh || []).length === 0)
    for (const l of ['th', 'ja', 'zh']) await TR.act(async () => { found[l].r.unmount() })
  }
  {
    // 31 / 35 progress from the global history; refresh keeps progress and track identity
    const c31 = rc(); const L = learner(c31)
    introduce(L.find(w => w.id === idOf('ดูแล')))                                  // learned in a normal Daily Track
    Object.assign(L.find(w => w.id === idOf('ทุกคน')), c31.markWordKnown(L.find(w => w.id === idOf('ทุกคน'))))
    const track = { createdAt: '2026-10-14T02:00:00.000Z', date: '14 Oct 2026', mode: 'daily', trackMode: 'daily', language: 'th', trackType: 'daily', selectionMode: 'topic',
      topicId: 'wedding-speech', topicTitle: 'Wedding Speech', topicsVersion: 'topics-v1', pairs: [], keywords: s0.targetIds.slice(0, 3).map(id => ({ wordId: id, thai: canon.get(id) ? canon.get(id).t : '', english: '', rating: null })),
      selectedTargetIds: s0.targetIds, selectedNewTargetIds: s0.selectedNewTargetIds, selectedRevisionTargetIds: s0.selectedRevisionTargetIds, rated: false, bookmark: 4 }
    storeT(c31, L, [track])
    const p = c31.topicProgress('th', 'wedding-speech', L)
    T(31, 'topic progress reflects global learning history: ดูแล (learned in a Daily Track) counts as introduced, ทุกคน as Known; 48 remain new',
      p.total === 50 && p.introduced === 2 && p.known === 1 && p.remaining === 48 && p.words[4].status === 'learning' && p.words[0].status === 'known', { p: { i: p.introduced, k: p.known, r: p.remaining } })
    const open = async () => { let r; await TR.act(async () => { r = TR.create(React.createElement(c31.ThaiTeacher, { lang: 'th', onSetLang: () => {} })); await flush(60) }); return r }
    let r = await open()
    const badge = () => r.root.findAll(x => x.props && x.props['data-track-topic'] === 'wedding-speech' && typeof x.type === 'string')
    const b1 = badge().map(x => textOf(x.children))
    T(32, 'a generated Topic Track appears in the existing Recent Tracks list labelled "Wedding Speech · Daily Track" (its bookmark still shown)',
      b1.length === 1 && /Wedding Speech · Daily Track/.test(b1[0]) && /🔖 5/.test(textOf(r.toJSON()).replace(/\s+/g, ' ')), { b1 })
    const stats1 = async () => { const e = r.root.findAll(x => x.props && x.props['data-topics-entry'] === 'th' && x.type === 'button')[0]; await TR.act(async () => { e.props.onClick(); await flush(20) })
      return r.root.findAll(x => x.props && x.props['data-topic-stat'] && typeof x.type === 'string').map(x => x.props['data-topic-stat'] + '=' + textOf(x.children).replace(/\s+/g, ' ').trim()) }
    const sA = await stats1()
    await TR.act(async () => { r.unmount() })
    r = await open()
    const b2 = badge().map(x => textOf(x.children))
    const sB = await stats1()
    const saved = JSON.parse(c31.localStorage.getItem('tt-tracks'))[0]
    T(35, 'refreshing / reopening the app keeps topic progress (same stats) and the track\'s topic identity (label, topicId, new / revision ids)',
      same(sA, sB) && sA.length === 4 && sA.includes('introduced=2 Introduced') && same(b1, b2) && saved.topicId === 'wedding-speech' && saved.selectionMode === 'topic' && same(saved.selectedNewTargetIds, s0.selectedNewTargetIds),
      { sA, sB })
    await TR.act(async () => { r.unmount() })
  }
  {
    // 33 the existing SRS operations work on topic words: rating a topic keyword introduces it globally (then it is revision)
    const L = learner(c)
    const w = L.find(x => x.id === s0.selectedNewTargetIds[0])
    const rated = c.applyRating(w, 'ok')
    const L2 = L.map(x => x.id === w.id ? rated : x)
    const s = c.selectThaiTopicTargets(L2, 'wedding-speech')
    const rv = c.selectRevisionTargets('th', L2)
    const inQueue = c.selectThaiRevisionTargets(L2, 100000).targets.some(x => x.id === w.id)          // the normal Revision queue
    const inQueueBefore = c.selectThaiRevisionTargets(L, 100000).targets.some(x => x.id === w.id)
    T(33, 'existing SRS interactions work on topic words: rating ทุกคน "ok" introduces it globally — it leaves the topic\'s new list and is eligible for normal Revision',
      c.hasBeenIntroduced(rated) && rated.status === 'learning' && !s.selectedNewTargetIds.includes(w.id) && c.topicProgress('th', 'wedding-speech', L2).introduced === 1 &&
      inQueue && !inQueueBefore, { st: rated.status, nw: s.selectedNewTargetIds.length, revN: rv.targets.length, inQueue, inQueueBefore })
  }
  {
    // 34 Listening repair: dashboard → Listening Track → "needs repair" offer → Rebuild with the SAME ids (selector not re-run)
    const c34 = rc(); const L = learner(c34); storeT(c34, L)
    const failIds = c34.selectRevisionTargets('th', L).targetIds.slice().reverse()
    c34.localStorage.setItem('tt-listening-attempts-th', JSON.stringify([{ attemptId: 'lattempt-x', createdAt: '2026-10-06T04:00:00.000Z', language: 'th', trackType: 'listening', selectedTargetIds: failIds, state: 'NOT_READY', coverage: { covered: 27, required: 30, missing: failIds.slice(0, 3) }, failedChecks: ['COVERAGE_PASS=FAIL'], log: [] }]))
    c34.mockGeminiGenerate = async () => { throw new Error('Failed to fetch') }
    let r
    await TR.act(async () => { r = TR.create(React.createElement(c34.ThaiTeacher, { lang: 'th', onSetLang: () => {} })); await flush(60) })
    const lnBtn = r.root.findAll(x => x.type === 'button').find(b => /Listening Track/.test(textOf(b.children)))
    await TR.act(async () => { lnBtn.props.onClick(); await flush(30) })
    const offer = r.root.findAll(x => x.props && x.props['data-listening-latest'] === 'needs-repair' && typeof x.type === 'string')
    const ot = textOf(offer[0] || null).replace(/\s/g, '')
    let selN = 0; const rs = c34.selectRevisionTargets; c34.selectRevisionTargets = (...a) => { selN++; return rs(...a) }
    const rb = r.root.findAll(x => x.props && x.props['data-listening-latest-rebuild'] && x.type === 'button')[0]
    if (rb) await TR.act(async () => { rb.props.onClick(); await flush(30) })
    const tiles = r.root.findAll(x => x.props && x.props['data-listening-tile'] != null && typeof x.type === 'string').map(x => +x.props['data-listening-tile'])
    c34.selectRevisionTargets = rs
    T(34, 'Listening repair stays reachable from Listening: opening the Listening Track shows "Your last Listening Track needs repair · 27/30" BEFORE any new build, and Rebuild restarts with the SAME 30 ids (selector not re-run)',
      offer.length === 1 && /needsrepair/.test(ot) && /27\/30/.test(ot) && !!rb && selN === 0 && same(tiles, failIds), { offer: offer.length, selN, tiles: tiles.length })
    await TR.act(async () => { r.unmount() })
  }
  {
    // 36 Daily and Revision behaviour unchanged: the same learner gets the same Daily and Revision selection as before Topics
    const seedRandom = cx => cx.ev('(function(){ var s = 20261014; Math.random = function(){ s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }; return true })()')
    const L = learner(c); seedRandom(c)
    const pick = c.pickWords(L, 'daily', [])
    const f = c.freezeThaiTargetSelection({ selected: pick.targets, reserve: pick.reserve, required: 30, mode: 'daily', noNewOverflow: false, feasibility: c.thaiSelectionFeasibility(c.thaiAuthorisedSurfaces(L, pick.targets || [])) })
    const rev = c.selectRevisionTargets('th', L)
    const noTopic = f.targets.every(t => !ids.includes(t.id)) && rev.targets.every(t => !ids.includes(t.id))
    let baseOk = null, detail = { noTopic }
    if (process.env.TT_BASE && fs.existsSync(process.env.TT_BASE)) {
      const b = load(process.env.TT_BASE, { React }); b.console.info = () => {}; b.console.warn = () => {}
      const LB = learner(b); seedRandom(b)
      const pb = b.pickWords(LB, 'daily', [])
      const fb = b.freezeThaiTargetSelection({ selected: pb.targets, reserve: pb.reserve, required: 30, mode: 'daily', noNewOverflow: false, feasibility: b.thaiSelectionFeasibility(b.thaiAuthorisedSurfaces(LB, pb.targets || [])) })
      const rb = b.selectRevisionTargets('th', LB)
      baseOk = same(fb.targets.map(t => t.id), f.targets.map(t => t.id)) && same(rb.targetIds, rev.targetIds)
      detail = { ...detail, daily: [f.targets.slice(0, 6).map(t => t.id), fb.targets.slice(0, 6).map(t => t.id)], rev: [rev.targetIds.slice(0, 6), rb.targetIds.slice(0, 6)] }
    }
    T(36, 'the original Daily and Revision Track behaviour is unchanged: no topic word in either; ' + (baseOk == null ? '(TT_BASE not set — pre-Topics comparison skipped)' : 'identical 30 Daily and 30 Revision ids to the pre-Topics build'),
      noTopic && f.targets.length === 30 && rev.targets.length === 30 && baseOk !== false, detail)
  }

  console.log(out.join('\n'))
  console.log('\nv698 Topics + Wedding Speech regression: ' + (n - fails) + '/' + n + (fails ? ' — ' + fails + ' FAIL' : ' — ALL PASS'))
  process.exit(fails ? 1 : 0)
})().catch(e => { console.error(e); process.exit(2) })
