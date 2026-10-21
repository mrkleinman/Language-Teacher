// v711 — Thai Listening conversation library (sandbox/curriculum/thai-listening-library): whole conversations written and reviewed
// offline; a new Listening Track picks the one holding the most of the learner's due words, and those words become the lesson words.
//   Y1–Y4  the pick: revision priority, ≤ 3 lesson words per line, recent conversations skipped, a Rebuild keeps its frozen ids,
//          a conversation that fails a gate for this learner is never picked
//   Y5–Y7  end to end through generateCohesiveListeningTrack: READY with no paid writing, the conversation as written, the fallbacks
//   Y8     every embedded conversation is structurally sound (speakers, particles, turn-taking, greeting / goodbye placement, length)
// Real app code; no provider calls. The learner is built from the library itself: every dictionary word heard in it is "known" and due.
//   node tests64.js            (current build: tt.compiled.js, or TT_FILE)
'use strict'
const { load } = require('./harness')
const out = []; let fails = 0, n = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + String(id).padEnd(4) + ' ' + name + (!pass && detail !== undefined ? '\n      ' + JSON.stringify(detail).slice(0, 600) : '')) }
const FILE = process.env.TT_FILE || 'tt.compiled.js'

function learnerFrom(c, lib, opt = {}) {
  const lines = lib.flatMap(cv => cv.scenes.flatMap(s => s.lines.map(l => l[1])))
  const day = 86400000, now = Date.now()
  return c.initVocab().map((w, i) => {
    const heard = w.thai && lines.some(t => t.includes(w.thai))
    if (!heard && !(opt.extra && opt.extra(w))) return w
    // due a little longer ago for lower ids → a stable revision order
    return { ...w, status: 'known', repCount: 3, interval: 4, okStreak: 1, lapses: 0, introducedAt: new Date(now - 60 * day).toISOString(),
      lastSeen: new Date(now - 20 * day).toISOString(), dueDate: new Date(now - (5 + (i % 9)) * day).toISOString() }
  })
}

;(async () => {
  const c = load(FILE, { realBelt: true }); c.console.info = () => {}; c.console.warn = () => {}
  const LIB = c.ev('THAI_LISTENING_LIBRARY')
  T('Y0', 'the build embeds a conversation library (' + LIB.length + ' conversations) and it is on for Thai', LIB.length >= 2 && c.thaiListeningLibraryOn(), LIB.length)
  if (LIB.length < 2) { out.forEach(l => console.log(l)); process.exit(1) }
  // about 1000 taught words (the owner's level, belt hardMax 7): the curriculum's first 900 plus every word the library uses
  const vocab = learnerFrom(c, LIB, { extra: w => w.curriculumIndex > 0 && w.curriculumIndex <= 1000 })
  const snap = c.selectRevisionTargets('th', vocab), pool = c.listeningCandidatePool('th', vocab, snap)
  const la = c.ev('LISTENING_ADAPTERS').th
  const pick = c.thaiListeningLibraryPick(vocab, pool, { need: 30 })
  const linesOf = cv => cv.scenes.flatMap(s => s.lines.map(l => l[1]))
  const ctx0 = c.thaiListeningLibraryContext(vocab, [])
  const at = (cv, w) => linesOf(cv).map((t, i) => t.includes(w.thai) && la.present(t, w.thai, ctx0) ? i : -1).filter(i => i >= 0)
  {
    const ok = pick && pick.words.length === 30 && pick.words.every(w => at(pick.conv, w).length > 0)
    const per = pick ? linesOf(pick.conv).map((t, i) => pick.words.filter(w => at(pick.conv, w).includes(i)).length) : []
    const order = pick ? pick.words.map(w => pool.indexOf(w)) : []
    T('Y1', 'the pick returns a conversation and 30 due words that are all heard in it, in revision order, never more than 3 in one line',
      ok && Math.max(...per) <= 3 && order.every((x, k) => k === 0 || x > order[k - 1]), { conv: pick && pick.conv.id, words: pick && pick.words.length, max: Math.max(...per) })
  }
  {
    c.localStorage.removeItem(c.ev('LISTENING_LIBRARY_RECENT_KEY'))
    c.thaiListeningLibraryRemember(pick.conv.id)
    const p2 = c.thaiListeningLibraryPick(vocab, pool, { need: 30 })
    const frozen = pick.words.map(w => w.id)
    const p3 = c.thaiListeningLibraryPick(vocab, frozen.map(id => vocab.find(w => w.id === id)), { need: frozen.length, frozen: true })
    T('Y2', 'a conversation played recently is not picked again (another one that fits is)', p2 && p2.conv.id !== pick.conv.id, p2 && p2.conv.id)
    T('Y3', 'a Rebuild (frozen ids) ignores recency and gets a conversation that holds every frozen word, ids unchanged',
      p3 && p3.words.map(w => w.id).join() === frozen.join(), p3 && { conv: p3.conv.id, n: p3.words.length })
    c.localStorage.removeItem(c.ev('LISTENING_LIBRARY_RECENT_KEY'))
  }
  {
    // the picked conversation, for a learner who has not been taught one content word in it, fails the closed-vocabulary gate → not picked
    const cv = pick.conv, w0 = c.initVocab().find(w => w.thai && w.thai.length >= 4 && w.curriculumIndex > 400 && at(cv, w).length > 0 && !pick.words.some(p => p.id === w.id) && !c.isThaiFunctionWord?.(w.thai))
    const v2 = vocab.map(w => w.id === w0.id ? { ...w, status: 'new', repCount: 0, interval: 0, lastSeen: null, dueDate: null, okStreak: 0, introducedAt: null } : w)
    const logs = []; const p4 = c.thaiListeningLibraryPick(v2, c.listeningCandidatePool('th', v2, c.selectRevisionTargets('th', v2)), { need: 30, log: x => logs.push(x) })
    T('Y4', 'a conversation that fails a gate for this learner (an untaught word: ' + (w0 && w0.thai) + ') is never picked, and the reason is logged',
      (!p4 || p4.conv.id !== cv.id) && logs.some(l => l.includes(cv.id) && /CLOSED_VOCAB/.test(l)), { p4: p4 && p4.conv.id, logs: logs.slice(0, 2) })
  }
  {
    let calls = 0; const stages = {}
    c.__bankForced = true
    c.mockGeminiGenerate = async (k, m, msgs, max, o) => { calls++; const st = (o && o.stage) || '?'; stages[st] = (stages[st] || 0) + 1; return '[]' }
    c.thaiBankSetEnabled(true)
    c.localStorage.removeItem(c.ev('LISTENING_LIBRARY_RECENT_KEY'))
    const logs = []
    const r = await c.generateCohesiveListeningTrack({ lang: 'th', vocab, apiKey: 'AIzaSyTEST-harness-key-000000', model: c.ev('GEMINI_DEFAULT_MODEL'), attemptId: 'lattempt-t64', snapshot: c.selectRevisionTargets('th', vocab), onLog: x => logs.push(String(x)), onProgress: () => {} })
    const tr = r.track, Lx = tr.listening || {}
    const conv = LIB.find(cv => cv.id === tr.listeningLibraryId)
    const asWritten = conv && Lx.lines && Lx.lines.length === linesOf(conv).length && Lx.lines.every((l, i) => l.thai.replace(/\s+/g, '') === linesOf(conv)[i].replace(/\s+/g, ''))
    T('Y5', 'end to end: READY, every lesson word heard, composer = library, the conversation exactly as written, no paid writing / repair / judging call',
      tr.status === 'READY' && tr.coverage.covered === 30 && Lx.composer === 'library' && asWritten && !logs.some(l => /LISTENING_GENERATION_CALLS=[1-9]|LISTENING_REPAIR_CALLS=[1-9]|LISTENING_QC_CALLS=[1-9]/.test(l)),
      { status: tr.status, cov: tr.coverage, composer: Lx.composer, lib: tr.listeningLibraryId, asWritten, calls, stages, failed: tr.failedChecks })
    T('Y6', 'the track records its conversation and the conversation is remembered as played (the next pick skips it)',
      !!tr.listeningLibraryId && c.thaiListeningLibraryRecent()[0] === tr.listeningLibraryId, { id: tr.listeningLibraryId, recent: c.thaiListeningLibraryRecent() })
    c.thaiBankSetEnabled(false)
    T('Y7', 'with the vetted Thai content switched off (tests of the model writer) the library is off too; a learner no conversation fits gets null (the planner runs)',
      !c.thaiListeningLibraryOn() && (c.thaiBankSetEnabled(true), c.thaiListeningLibraryPick(c.initVocab(), [], { need: 30 }) === null))
  }
  {
    const G = c.ev('LISTENING_GREETING_RE').th, B = c.ev('LISTENING_GOODBYE_RE').th, bad = []
    LIB.forEach(cv => { const L = cv.scenes.flatMap((s, si) => s.lines.map(l => ({ si, sp: l[0], th: l[1], en: l[2] }))), ns = cv.scenes.length
      if (L.length < 36 || L.length > 60) bad.push(cv.id + ' length ' + L.length)
      if (ns < 2 || cv.scenes.some(s => s.lines.length < 6)) bad.push(cv.id + ' scenes')
      L.forEach((l, i) => {
        if (!/^[AB]$/.test(l.sp)) bad.push(cv.id + ' speaker ' + (i + 1))
        if (!(l.sp === 'A' ? /ครับ$/ : /(ค่ะ|คะ)$/).test(l.th)) bad.push(cv.id + ' particle ' + (i + 1))
        if (i >= 2 && L[i - 1].sp === l.sp && L[i - 2].sp === l.sp) bad.push(cv.id + ' three in a row ' + (i + 1))
        if (l.si > 0 && G.test(l.th)) bad.push(cv.id + ' greeting ' + (i + 1))
        if (l.si < ns - 1 && B.test(l.th)) bad.push(cv.id + ' goodbye ' + (i + 1))
        if (!l.en || /[฀-๿]/.test(l.en)) bad.push(cv.id + ' english ' + (i + 1))
      }) })
    const ids = LIB.map(cv => cv.id)
    T('Y8', 'every embedded conversation: 36–60 turns, ≥ 2 scenes of ≥ 6, A ends with ครับ / B with ค่ะ·คะ, never three turns in a row, greetings only in scene 1, goodbyes only in the last, English present, unique ids',
      !bad.length && new Set(ids).size === ids.length, bad.slice(0, 12))
  }

  out.forEach(l => console.log(l))
  console.log('\nv711 Thai Listening library: ' + (n - fails) + '/' + n + ' passed' + (fails ? ' — ' + fails + ' FAILED' : ''))
  process.exit(fails ? 1 : 0)
})().catch(e => { out.forEach(l => console.log(l)); console.error(e); process.exit(1) })
