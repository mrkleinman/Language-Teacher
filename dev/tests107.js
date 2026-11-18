// 18 Nov — the Thai Listening story: why it was incoherent and slow (owner: "why is the listening track still struggling for coherence? why does it take so long?").
// Read from the finished export and the generation log of the 17 Nov run (25 words, 5 scenes, 47 paid calls, NOT_READY on naturalness and coherence):
//   • the 25 words come out of the spaced-repetition order and share no theme, yet the plan had to give every scene "exactly 5" and leave none out, so it invented a
//     place for each handful (a beauty pageant inside a bus, "แบ่งปัน" a restaurant, three month names that became three different dates in one Saturday);
//   • the editor graded 6, 6, 4 and kept fixes in the rounds that did not help; the QC then ran a round that restored the better text and a third round that started
//     from the very same text; the five English translations and the two judges waited for each other.
// This file proves, with the app's real functions and a scripted stand-in for the model transport only, that
//   G  the words are grouped by what belongs together BEFORE the plan; a word that fits no place is MENTIONED (read / told / quoted), never forced; dates stay together;
//      the plan keeps the groups; an unusable grouping falls back to the planner's own grouping; every word is still placed, written and heard (25/25) with every gate intact
//   E  the editing ends at the first round that does not improve the grade, and undoes a round that made it worse
//   Q  the QC ends at the first round that does not improve the whole
//   L  an untaught word the writer reached for in one scene is forbidden in every later call; the writer is given known words for each place
//   P  the independent steps (English per scene, the two judges, the 12-line judging chunks) run at the same time and give the same results
//   T  the log says where the time went
//   node tests107.js            (current build: tt.compiled.js, or TT_FILE)
'use strict'
const fs = require('fs')
const { load } = require('./harness')
const out = []; let fails = 0, n = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + String(id).padEnd(4) + ' ' + name + (!pass && detail !== undefined ? '\n      ' + JSON.stringify(detail).slice(0, 700) : '')) }
const FILE = process.env.TT_FILE || 'tt.compiled.js'
const FIX = JSON.parse(fs.readFileSync(__dirname + '/sandbox/curriculum/thai-listening-library/library.json', 'utf8'))
const FIXLINES = FIX.flatMap(cv => cv.scenes.flatMap(s => s.lines.map(l => ({ sp: l[0], th: l[1], en: l[2], conv: cv.id }))))
const ticks = async k => { for (let i = 0; i < k; i++) await null }

// a learner whose due words all occur somewhere in the fixture text (so the scripted writer can place each one); ~1000 taught words
function learner(c) {
  const day = 86400000, now = Date.now(), text = FIXLINES.map(l => l.th), v0 = c.initVocab()
  return v0.map((w, i) => {
    const inFix = !!w.thai && text.some(t => t.includes(w.thai) && c.thaiTargetPresent(t, w.thai, v0)), core = w.curriculumIndex > 0 && w.curriculumIndex <= 1000
    if (!inFix && !core) return w
    return { ...w, status: 'known', repCount: 3, interval: 4, okStreak: 1, lapses: 0, introducedAt: new Date(now - 60 * day).toISOString(),
      lastSeen: new Date(now - 20 * day).toISOString(), dueDate: new Date(now + (inFix ? -(5 + (i % 9)) : 30) * day).toISOString() }
  })
}

// the scripted stand-in for the model transport. Every stage the story composer sends is answered; opt switches the behaviour a test needs.
//   groups: 'bad' → an unusable grouping reply · groupK: places asked for · mention: surfaces marked "mention" · support: words offered as the palette of place 1
//   grades: the editor's grades, one per review · slip: an untaught word the writer puts into the first scene's second line · cohFail: a scene the coherence judge always fails
//   planShort: the planner's first reply has one scene too few
function scripted(c, vocab, opt = {}) {
  const la = c.ev('LISTENING_ADAPTERS').th, G = c.ev('LISTENING_GREETING_RE').th, B = c.ev('LISTENING_GOODBYE_RE').th, V = c.ev('GEMINI_SCHEMAS').verdicts
  const ctx = { vocab }
  const st = { calls: [], prompts: [], used: new Set(), variant: opt.variant || 0, live: [], maxIn: {}, overlap: false, order: [], reviews: 0, edits: 0, qcRepairs: 0, english: 0, plans: 0, grouped: null, replies: [] }
  const has = (l, s) => l.th.includes(s) && la.present(l.th, s, ctx)
  const rowsOf = p => [...p.matchAll(/^T(\d+) \| ([^|]+) \|/gm)].map(m => ({ id: Number(m[1]), s: m[2].trim() }))
  const filler = sp => FIXLINES.find((l, k) => (k + st.variant * 7) % 3 === 0 && l.sp === sp && !st.used.has(l.th) && !G.test(l.th) && !B.test(l.th) && la.text({ thai: l.th }).length > 6)
  const sceneTurns = (rows, si, nS) => {
    const lines = []
    rows.forEach(r => {
      const cand = FIXLINES.filter(l => has(l, r.s) && !st.used.has(l.th) && !(si > 0 && G.test(l.th)) && !(si < nS - 1 && B.test(l.th)))
      const l = cand[st.variant % Math.max(1, cand.length)] || cand[0]
      if (l) { st.used.add(l.th); lines.push(l) }
    })
    const turns = []
    lines.forEach(l => { const want = turns.length % 2 ? 'B' : 'A'
      if (l.sp !== want) { const f = filler(want); if (f) { st.used.add(f.th); turns.push(f) } }
      turns.push(l) })
    while (turns.length < 10) { const f = filler(turns.length % 2 ? 'B' : 'A'); if (!f) break; st.used.add(f.th); turns.push(f) }
    return turns.map(l => ({ speaker: l.sp, thai: l.th, english: l.en }))
  }
  const REPLY = [['ได้เลยครับ', 'ได้เลยค่ะ'], ['ใช่ครับ', 'ใช่ค่ะ'], ['ดีครับ', 'ดีค่ะ']]
  const answer = async (stage, p, o) => {
    if (stage === 'O_word_usage') { const ws = [...p.matchAll(/^(\S+) = /gm)].map(m => m[1]); return JSON.stringify({ words: ws.map(w => ({ thai: w, use: 'everyday sense of ' + w + ' (usage-note)', situations: ['at home', 'at work', 'on the phone'] })) }) }
    if (stage === 'O_listening_story_groups') {
      if (opt.groups === 'bad') return '[]'
      const rows = rowsOf(p), K = opt.groupK || 5, gs = Array.from({ length: K }, () => [])
      rows.forEach((r, i) => gs[i % K].push(r))
      st.grouped = gs.map(g => g.map(r => r.s))
      return JSON.stringify({ scenes: gs.map((g, i) => ({ place: 'Place ' + (i + 1), words: g.map(r => (opt.mention || []).includes(r.s) ? { id: r.id, use: 'mention', frame: 'frame for ' + r.s } : { id: r.id, use: 'say' }), support: i === 0 ? (opt.support || []) : [] })) })
    }
    if (stage === 'O_listening_story_plan') {
      st.plans++
      if (/THE SCENES ARE ALREADY CHOSEN/.test(p)) {
        const sc = [...p.matchAll(/^SCENE (\d+) — [^:\n]*: (.+)$/gm)].map(m => ({ n: Number(m[1]), ids: [...m[2].matchAll(/T(\d+) /g)].map(x => Number(x[1])) }))
        // the planner scrambles the words (each scene lists the NEXT scene's words): the app must keep the groups anyway
        const rot = sc.map((s, i) => ({ title: 'Planned ' + (i + 1), present: 'together', happens: 'part ' + (i + 1), facts: 'x', uses: sc[(i + 1) % sc.length].ids.map(id => ({ id, moment: 'planner moment ' + id })) }))
        const use = opt.planShort && st.plans === 1 ? rot.slice(0, -1) : rot
        return JSON.stringify({ title: 'Scripted story', story: 'two friends spend a day out', scenes: use })
      }
      const rows = rowsOf(p.slice(p.indexOf('TASK: plan'))), nS = 4, sc = [[], [], [], []]
      rows.forEach((r, i) => { const ls = FIXLINES.filter(l => has(l, r.s)); const gOnly = ls.length && ls.every(l => G.test(l.th)), bOnly = ls.length && ls.every(l => B.test(l.th))
        sc[gOnly ? 0 : bOnly ? nS - 1 : i % nS].push(r.id) })
      return JSON.stringify({ title: 'Scripted story ' + st.variant, story: 'two friends plan a day out', scenes: sc.map((t, i) => ({ title: 'Scene ' + (i + 1), happens: 'part ' + (i + 1), targets: t })) })
    }
    if (stage === 'O_listening_story_beats') {
      const rows = rowsOf(p.slice(p.indexOf('TASK: write')))
      return JSON.stringify({ lines: rows.map((r, k) => ({ speaker: k % 2 ? 'B' : 'A', english: 'line about ' + r.s, ids: [r.id] })) })
    }
    if (stage === 'O_listening_story_write') {
      const mm = p.match(/TASK: (?:write|put) scene (\d+) of (\d+)/), si = Number(mm[1]) - 1, nS = Number(mm[2])
      const turns = sceneTurns(rowsOf(p.slice(p.search(/TASK: (?:write|put) scene/))).filter(r => !(opt.skip || []).includes(r.s)), si, nS)
      if (opt.slip && si === 0) turns[1] = { speaker: turns[1].speaker, thai: turns[1].speaker === 'A' ? 'ผมอยากกิน' + opt.slip + 'ครับ' : 'ฉันอยากกิน' + opt.slip + 'ค่ะ', english: 'slip' }
      return JSON.stringify({ turns })
    }
    if (stage === 'O_listening_story_repair' || stage === 'O_listening_story_qc_repair') {
      if (stage === 'O_listening_story_qc_repair') st.qcRepairs++
      const body = p.slice(p.lastIndexOf('AS WRITTEN:') + 11).split('\n\n')[0].trim().split('\n').map(r => r.split(' | ')).filter(r => r.length >= 3)
      const turns = body.map(r => ({ speaker: r[0].replace(/^\d+\.\s*/, '').trim(), thai: r[1].trim(), english: r[2].trim() }))
      const fixOf = t => opt.slip && t.thai.includes(opt.slip) ? { thai: t.speaker === 'A' ? 'ผมอยากไปด้วยครับ' : 'ฉันอยากไปด้วยค่ะ', english: 'I want to come too.' } : null
      if (/Rewrite ONLY lines/.test(p)) return JSON.stringify({ fixes: turns.map((t, k) => ({ line: k + 1, ...t, ...(fixOf(t) || {}) })).filter((t, k) => fixOf(turns[k])) })
      turns.forEach(t => { const f = fixOf(t); if (f) Object.assign(t, f) })
      return JSON.stringify({ turns })
    }
    if (stage === 'O_listening_story_review') {
      const g = opt.grades || [7], score = g[Math.min(st.reviews, g.length - 1)]; st.reviews++
      // a fault is always named, so the editor has work to do whenever the grade allows another round
      return JSON.stringify({ score, faults: opt.grades ? [{ from: 2, to: 2, problem: 'reply missing', fix: 'add a reply' }] : [] })
    }
    if (stage === 'O_listening_story_edit') {
      st.edits++
      if (opt.grades) { const m = p.match(/^2\. ([AB]) \| ([^|]+) \| ([^|\n]*)/m)
        if (m) { const sp = m[1], ot = sp === 'A' ? 'B' : 'A', rep = REPLY[Math.min(st.edits, 3) - 1][ot === 'A' ? 0 : 1]; st.replies.push(rep)
          return JSON.stringify({ score: 6, fixes: [{ from: 2, to: 2, problem: 'reply missing', turns: [{ speaker: sp, thai: m[2].trim(), english: m[3].trim() }, { speaker: ot, thai: rep, english: 'Sure.' }] }] }) } }
      return JSON.stringify({ fixes: [] })
    }
    if (stage === 'O_listening_story_english') { st.english++; return JSON.stringify({ english: [...p.matchAll(/^\d+\. [AB]: (.+)$/gm)].map(m => 'EN of ' + m[1]) }) }
    if (stage === 'O_listening_story_line_fix') return JSON.stringify({ fixes: [] })
    if (stage === 'O_listening_word_check' || stage === 'O_listening_scene_check') return JSON.stringify({ fixes: [] })
    if (stage === 'verdicts') {
      const items = [...p.matchAll(/^\s*(\d+)[.)]\s/gm)].map(x => Number(x[1])), nItems = Math.max(12, ...items)
      return JSON.stringify(Array.from({ length: nItems }, (_, i) => ({ i: i + 1, s: 5, note: '' })))
    }
    if (stage === 'O_listening_coherence') return JSON.stringify({ scenes: [1, 2, 3, 4, 5, 6, 7].map(s => ({ scene: s, pass: s !== opt.cohFail, breakAfterLine: null, reason: s === opt.cohFail ? 'the reply does not follow' : 'ok' })), overall: opt.cohFail ? 3 : 5, reason: 'ok' })
    return '[]'
  }
  c.mockGeminiGenerate = async (k, m, msgs, max, o) => {
    const p = msgs.map(x => typeof x.content === 'string' ? x.content : '').join('\n'), stage = (o && o.stage) || (o && o.json === V ? 'verdicts' : '?')
    st.calls.push(stage); st.prompts.push({ stage, p }); st.order.push(stage)
    // concurrency: the stages in flight at this moment (each request yields a few turns so that overlapping requests can be seen)
    st.live.push(stage); st.maxIn[stage] = Math.max(st.maxIn[stage] || 0, st.live.filter(x => x === stage).length)
    if ((stage === 'O_listening_coherence' && st.live.includes('verdicts')) || (stage === 'verdicts' && st.live.includes('O_listening_coherence'))) st.overlap = true
    try { await ticks(4); return await answer(stage, p, o) } finally { st.live.splice(st.live.indexOf(stage), 1) }
  }
  return st
}
async function run(c, vocab, opt = {}) {
  c.ev('LN_STORY_WORD_CAP').maxWords = opt.cap != null ? opt.cap : 25
  const logs = []
  const st = scripted(c, vocab, opt)
  const snap = c.selectRevisionTargets('th', vocab)
  const r = await c.generateCohesiveListeningTrack({ lang: 'th', vocab, apiKey: 'AIzaSyTEST-harness-key-000000', model: c.ev('GEMINI_DEFAULT_MODEL'), attemptId: 'lattempt-t107-' + (opt.variant || 0), snapshot: snap,
    onLog: x => logs.push(String(x)), onProgress: () => {} })
  return { r, tr: r.track, st, logs, snap }
}

;(async () => {
  const c = load(FILE, { realBelt: true }); c.console.info = () => {}; c.console.warn = () => {}
  c.__bankForced = true
  const vocab = learner(c)
  c.thaiBankSetEnabled(true)
  const isFn = name => { try { return typeof c.ev(name) === 'function' } catch (e) { return false } }

  // ══ G1 — the grouping reply is turned into groups the plan can rely on (pure function, no model) ══
  {
    const ok = isFn('lnStoryNormaliseGroups')
    const ts = [['พฤษภาคม'], ['กรกฎาคม'], ['ตุลาคม'], ['นางงาม'], ['ทางโค้ง'], ['คลื่น'], ['ขาดทุน'], ['อ่าน'], ['มัน'], ['เอง'], ['ทั้ง'], ['บริการ']].map((x, i) => ({ id: 100 + i, surface: x[0] }))
    const norm = (raw, o) => ok ? c.ev('lnStoryNormaliseGroups')(raw, ts, o) : null
    const W = ids => ids.map(id => ({ id, use: 'say' }))
    // the model scatters the three months over three places, repeats id 103, invents id 999 and leaves 111 out
    const raw = { scenes: [{ place: 'Bus station', words: W([100, 103, 108]) }, { place: 'Bus', words: W([101, 104, 109]) }, { place: 'Beach', words: W([102, 105, 103, 999]) }, { place: 'Cafe', words: W([106, 107, 110]) }] }
    const g = norm(raw, {}), all = g ? g.flatMap(x => x.ids) : []
    T('G1a', 'every word is in exactly one group: an invented id and a repeated id are dropped, a word the model left out is placed',
      !!g && all.length === ts.length && new Set(all).size === ts.length && ts.every(t => all.includes(t.id)), g && { all })
    const home = g ? g.filter(x => [100, 101, 102].some(id => x.ids.includes(id))) : []
    T('G1b', 'the three month names end up in ONE group (one dated moment in the day, not three different dates)', !!g && home.length === 1 && [100, 101, 102].every(id => home[0].ids.includes(id)), g && g.map(x => x.ids))
    const big = norm({ scenes: [{ place: 'A', words: W(ts.slice(0, 10).map(t => t.id)) }, { place: 'B', words: W([110, 111]) }] }, {})
    T('G1c', 'a group over the size cap gives its last words to the smaller one (never the dates); sizes need not be equal', !!big && big.every(x => x.ids.length <= 8) && big.flatMap(x => x.ids).length === ts.length, big && big.map(x => x.ids.length))
    const one = norm({ scenes: [{ place: 'A', words: W([100, 101, 102, 103, 104, 105]) }, { place: 'B', words: W([106]) }, { place: 'C', words: W([107, 108, 109, 110, 111]) }] }, {})
    T('G1d', 'a group of one word joins another group instead of becoming a scene of its own', !!one && one.length === 2 && one.every(x => x.ids.length >= 2), one && one.map(x => x.ids.length))
    const ment = norm({ scenes: [{ place: 'A', words: ts.slice(0, 6).map(t => ({ id: t.id, use: 'mention', frame: t.id === 103 ? 'a poster' : '' })) }, { place: 'B', words: W(ts.slice(6).map(t => t.id)) }] }, {})
    const mIds = ment ? ment.flatMap(x => Object.keys(x.mention)) : []
    T('G1e', 'mentions are capped (a track of mostly quotations is not a conversation: at most a third of the words) and every kept mention has a frame (the model\'s own, else a default)',
      !!ment && mIds.length === 4 && ment.every(x => Object.values(x.mention).every(f => f && f.length > 5)) && ment.flatMap(x => Object.entries(x.mention)).some(([id, f]) => id === '103' && f === 'a poster'), ment && ment.map(x => x.mention))
    const sup = norm({ scenes: [{ place: 'A', words: W([100, 101, 102, 103, 104, 105]), support: ['รถ', 'ท้องฟ้า', 'ตลาด', 'รถ', 'two words', ''] }, { place: 'B', words: W([106, 107, 108, 109, 110, 111]) }] }, { allowed: w => w !== 'ท้องฟ้า' })
    T('G1f', 'the palette keeps only the words the closed-vocabulary check allows, once each, without spaces', !!sup && sup[0].support.join(' ') === 'รถ ตลาด', sup && sup.map(x => x.support))
    T('G1g', 'an unusable reply gives null (the planner then groups the words itself): not an object, no scenes, one scene, more than seven scenes',
      ok && [null, [], 'x', {}, { scenes: [] }, { scenes: [{ place: 'A', words: W([100, 101, 102]) }] }, { scenes: Array.from({ length: 8 }, (_, i) => ({ place: 'P' + i, words: W([100 + i]) })) }].every(x => norm(x, {}) === null))
  }

  // ══ G2 — end to end with groups ══
  const taughtWords = ['ตลาด', 'ข้าว', 'ร้าน', 'รถ', 'น้ำ'].filter(w => !c.listeningUnexposedWords('th', { thai: w + 'ครับ', speaker: 'A' }, c.snapshotLearnerInventory('th', vocab, [], 'listening').inventory.taught, [], vocab).length).slice(0, 2)
  const untaught = 'ปู'      // not taught to this learner and not in the app's own off-limits probe list (checked in L1)
  const snap0 = c.selectRevisionTargets('th', vocab), frozen = snap0.targets.slice(0, 25).map(t => t.id)
  const surfOf = id => snap0.targets.find(t => t.id === id).thai
  const mention = [surfOf(frozen[3]), surfOf(frozen[9])]
  const A = await run(c, vocab, { variant: 2, mention, support: taughtWords.concat([untaught]) })
  const grouped = A.st.grouped || []      // empty when the build never asked for a grouping (so every check below that needs the groups fails instead of passing on nothing)
  {
    const at = s => A.st.order.indexOf(s), firstWrite = A.st.order.findIndex(x => x === 'O_listening_story_write' || x === 'O_listening_story_beats')
    const planP = (A.st.prompts.find(x => x.stage === 'O_listening_story_plan') || {}).p || ''
    T('G2a', 'the words are grouped BEFORE the plan, and the plan comes before the first scene is written', at('O_listening_story_groups') >= 0 && at('O_listening_story_groups') < at('O_listening_story_plan') && at('O_listening_story_plan') < firstWrite, A.st.order.slice(0, 8))
    T('G2b', 'the plan is given the groups as FIXED scenes (every word under its place), not "exactly 5 per scene"; a mention word carries its frame',
      /THE SCENES ARE ALREADY CHOSEN/.test(planP) && grouped.length === 5 && grouped.every((g, i) => g.every(s => planP.includes('SCENE ' + (i + 1) + ' — ') && planP.includes(s))) && !/exactly 5 per scene/.test(planP) && !/Split it into exactly/.test(planP) &&
      mention.every(s => planP.includes(s + ' (MENTION: frame for ' + s + ')')) && /Return exactly 5 SCENES/.test(planP), planP.slice(planP.indexOf('THE SCENES'), planP.indexOf('THE SCENES') + 500))
    // the scripted planner put each scene's words into the NEXT scene: the groups still decide where a word is
    const planLog = A.logs.find(x => /LISTENING_STORY plan "/.test(x)) || ''
    const planned = [...planLog.matchAll(/S\d+ Planned \d+ \[([^\]]*)\]/g)].map(m => m[1].split(', '))
    T('G2c', 'the plan keeps the groups whatever the planner did with the words (it only fleshes the scenes out): scene k holds exactly group k, in order',
      grouped.length === 5 && planned.length === 5 && planned.every((g, i) => g.join() === grouped[i].join()), { planned, grouped })
    const allLines = (A.tr.listening || {}).lines || []
    const heardIn = (si, surf) => allLines.some(l => l.sceneId === 'LS' + (si + 1) && l.thai.includes(surf))
    T('G2d', 'every group\'s words are written and heard in the scene of their group; READY, 25/25, nothing deferred',
      A.tr.status === 'READY' && A.tr.coverage.covered === 25 && A.tr.coverage.required === 25 && !(A.tr.coverage.deferred || []).length && grouped.length === 5 && grouped.every((g, i) => g.every(s => heardIn(i, s))), { status: A.tr.status, cov: A.tr.coverage, failed: A.tr.failedChecks })
    const wr = A.st.prompts.filter(x => x.stage === 'O_listening_story_write')
    const k0 = grouped.findIndex(g => g.includes(mention[0]))
    T('G2e', 'the writer of a scene is told which of its words are MENTIONS (read, told or quoted) and with what frame; a scene without one is not',
      k0 >= 0 && !!wr[k0] && /MENTION WORDS/.test(wr[k0].p) && wr[k0].p.includes('frame for ' + mention[0]) && wr.some(x => !/MENTION WORDS/.test(x.p)), { k0, n: wr.length })
    T('G2f', 'the writer of place 1 is given the known words for that place; a word the learner was not taught is not passed on',
      taughtWords.length === 2 && !!wr[0] && wr[0].p.includes('WORDS FOR THIS PLACE') && taughtWords.every(w => wr[0].p.includes(w)) && !/WORDS FOR THIS PLACE[^\n]*ปู/.test(wr[0].p), { taughtWords, p: (wr[0] || {}).p && wr[0].p.slice(wr[0].p.indexOf('WORDS FOR'), wr[0].p.indexOf('WORDS FOR') + 200) })
    const rv = A.st.prompts.find(x => x.stage === 'O_listening_story_review')
    T('G2g', 'the reviewer and the editor are told the mention words are meant as mentions (so they are not "fixed" into live action)', !!rv && /MEANT as mentions/.test(rv.p) && mention.every(s => rv.p.includes(s)), rv && rv.p.slice(0, 80))
    const g = (A.tr.listening || {}).gates || A.tr.gates || {}
    const gs = A.logs.find(x => /LISTENING_GATES /.test(x)) || ''
    T('G2h', 'every existing gate still passes with the groups: closed vocabulary, coverage, at most 3 targets in a line, both speakers, no duplicates, pronunciation',
      /CLOSED_VOCAB=true/.test(gs) && /COVERAGE_PASS=true/.test(gs) && /MAX3_PASS=true/.test(gs) && /BOTH_SPEAKERS=true/.test(gs) && /NO_DUPLICATES=true/.test(gs) && /PRONUNCIATION=true/.test(gs), gs.slice(0, 400))
  }
  {
    // a mention word is still a lesson word: if the writer leaves it out, it is asked for again and, if still missing, the track is not READY (never silently dropped)
    const word = mention[0]
    const M = await run(c, vocab, { variant: 1, mention, skip: [word] })
    const asked = M.st.prompts.some(x => x.stage === 'O_listening_story_repair' && x.p.includes('LESSON_WORD_MISSING') && x.p.includes(word))
    T('G2i', 'a mention word the writer leaves out is asked for again like any other word and is never silently dropped (coverage is not weakened)',
      asked && (M.tr.status !== 'READY' || M.tr.coverage.covered + (M.tr.coverage.deferred || []).length === 25) && M.tr.coverage.required === 25 && M.tr.selectedTargetIds.length === 25, { asked, status: M.tr.status, cov: M.tr.coverage })
  }
  {
    // an unusable grouping falls back to the planner's own grouping (the old prompt), and the track still comes out
    const F = await run(c, vocab, { variant: 2, groups: 'bad' })
    const planP = (F.st.prompts.find(x => x.stage === 'O_listening_story_plan') || {}).p || ''
    T('G3', 'an unusable grouping reply falls back to the planner grouping the words itself (the old plan prompt); the track still completes with every word heard',
      F.st.calls.includes('O_listening_story_groups') && /exactly 5 per scene/.test(planP) && !/THE SCENES ARE ALREADY CHOSEN/.test(planP) && F.logs.some(x => /word groups unusable|word grouping unusable/.test(x)) && F.tr.coverage.covered === 25 && F.tr.status === 'READY',
      { calls: F.st.calls.slice(0, 6), status: F.tr.status, cov: F.tr.coverage })
    // the plan must keep as many scenes as groups: a first reply with one scene too few is asked for again
    const S = await run(c, vocab, { variant: 3, planShort: true })
    T('G3b', 'a plan with fewer scenes than word groups is refused and asked for again; the second plan is used', S.st.plans === 2 && S.logs.some(x => /fewer scenes than the 5 word groups/.test(x)) && S.tr.status === 'READY' && S.tr.coverage.covered === 25, { plans: S.st.plans, status: S.tr.status })
  }

  // ══ E — the editing ends at the first round that does not improve the grade ══
  {
    const E1 = await run(c, vocab, { variant: 4, grades: [6, 5] })
    const lines = ((E1.tr.listening || {}).lines || []).map(l => l.thai)
    T('E1', 'grades 6 then 5: the second review shows round 1 made the text worse, so round 1\'s fixes are UNDONE and no second fix call is paid for (2 reviews, 1 edit)',
      E1.st.reviews === 2 && E1.st.edits === 1 && !lines.includes(E1.st.replies[0]) && E1.logs.some(x => /fixes are undone/.test(x)), { reviews: E1.st.reviews, edits: E1.st.edits, reply1: E1.st.replies[0], kept: lines.includes(E1.st.replies[0]) })
    const E2 = await run(c, vocab, { variant: 5, grades: [6, 6] })
    const l2 = ((E2.tr.listening || {}).lines || []).map(l => l.thai)
    T('E2', 'grades 6 then 6: no improvement, so the editing stops at once (2 reviews, 1 edit) and the round-1 fix, which did no harm, is kept', E2.st.reviews === 2 && E2.st.edits === 1 && l2.includes(E2.st.replies[0]) && E2.logs.some(x => /fixes of round 1 are kept/.test(x)), { reviews: E2.st.reviews, edits: E2.st.edits })
    const E3 = await run(c, vocab, { variant: 6, grades: [5, 6, 7] })
    T('E3', 'grades 5, 6, 7 (each round better): all three rounds still run (3 reviews, 3 edits) — a round that helps is not stopped', E3.st.reviews === 3 && E3.st.edits === 3 && !E3.logs.some(x => /editing stops here/.test(x)), { reviews: E3.st.reviews, edits: E3.st.edits })
  }

  // ══ Q — the QC ends at the first round that does not improve the whole ══
  {
    const Q1 = await run(c, vocab, { variant: 7, cohFail: 2 })
    const rounds = Q1.logs.filter(x => /LISTENING_STORY QC round \d+ ·/.test(x)).length
    T('Q1', 'a QC round that leaves the whole no better ends the QC (the next round would start from the same text and send the same requests): 1 round, 1 scene rewrite — it used to run 3 rounds and 3 rewrites',
      rounds === 1 && Q1.st.qcRepairs === 1 && Q1.logs.some(x => /did not improve the whole/.test(x) && /QC stops here/.test(x)), { rounds, qcRepairs: Q1.st.qcRepairs })
    const Q2 = await run(c, vocab, { variant: 5 })
    T('Q2', 'with nothing to fix the QC does not run extra rounds either (no rewrite at all)', Q2.st.qcRepairs === 0 && Q2.tr.status === 'READY', { qc: Q2.st.qcRepairs, status: Q2.tr.status })
  }

  // ══ L — an untaught word seen once is forbidden everywhere afterwards ══
  {
    const probe = c.ev('LN_STORY_UNTAUGHT_PROBE'), inv = c.snapshotLearnerInventory('th', vocab, [], 'listening').inventory
    const un = c.listeningUnexposedWords('th', { thai: 'ผมอยากกิน' + untaught + 'ครับ', speaker: 'A' }, inv.taught, [], vocab)
    const L = await run(c, vocab, { variant: 9, slip: untaught })
    const wr = L.st.prompts.filter(x => x.stage === 'O_listening_story_write'), line = p => ((p.match(/NOT TAUGHT to this learner — never use: ([^\n]*)/) || [])[1] || '')
    T('L1', 'a word the learner was not taught that the writer reached for in scene 1 is named off-limits in every later call (the first scene\'s own prompt could not know it)',
      !probe.includes(untaught) && un.includes(untaught) && wr.length >= 2 && !line(wr[0].p).split(' ').includes(untaught) && line(wr[1].p).split(' ').includes(untaught) && L.logs.some(x => /off-limits list grew/.test(x) && x.includes(untaught)) &&
      (rp => !!rp && line(rp.p).split(' ').includes(untaught))(L.st.prompts.find(x => x.stage === 'O_listening_story_repair')), { probe: probe.includes(untaught), un, first: line((wr[0] || {}).p || '').slice(-30), second: line((wr[1] || {}).p || '').slice(-40) })
    const lg = (L.tr.listening || {}).lines || []
    T('L2', 'the untaught word is still repaired away (closed vocabulary intact): no line of the finished track has it, 25/25 heard', !lg.some(l => l.thai.includes(untaught)) && L.tr.coverage.covered === 25, { left: lg.filter(l => l.thai.includes(untaught)).map(l => l.thai), cov: L.tr.coverage })
  }

  // a word the closed-vocabulary check names only as a FRAGMENT (a word cut where the particle starts) is never put on the off-limits list: it would only confuse the writer
  {
    const H = await run(c, vocab, { variant: 9, slip: 'หอย' })
    const wr = H.st.prompts.filter(x => x.stage === 'O_listening_story_write'), line = p => ((p.match(/NOT TAUGHT to this learner — never use: ([^\n]*)/) || [])[1] || '')
    const grew = H.logs.find(x => /off-limits list grew/.test(x)) || ''
    T('L3', 'a fragment ending in the speaker particle is never added to the off-limits list, whatever the check names (guard: holds before and after the change)', wr.length >= 2 && !/ยครับ|ครับ\)|ค่ะ\)/.test(grew) && !line(wr[1].p).split(' ').some(w => /(ครับ|ค่ะ|คะ)$/.test(w)), { grew: grew.slice(0, 160), second: line((wr[1] || {}).p || '').slice(-60) })
  }

  // ══ P — independent steps run at the same time, with the same results ══
  {
    T('P1', 'the five English translations run at the same time (one per scene, each on its own scene)', A.st.maxIn['O_listening_story_english'] >= 2 && A.st.english === 5 && ((A.tr.listening || {}).lines || []).every(l => /^EN of /.test(l.english || '')), { maxIn: A.st.maxIn['O_listening_story_english'], calls: A.st.english })
    T('P2', 'the naturalness judge and the coherence judge run at the same time (they read the same text and do not depend on each other)', A.st.overlap === true, { overlap: A.st.overlap })
    // the 12-line judging chunks: the same verdicts, mapped to the right lines, with up to three in flight
    const mk = k => ({ thai: 'ผมไปตลาด' + 'ก'.repeat(k + 1) + 'ครับ', english: 'x' + k, speaker: 'A' })
    const pairs = Array.from({ length: 40 }, (_, k) => mk(k)), bad = new Set([0, 7, 14, 21, 28, 35])
    const st2 = { live: 0, max: 0, calls: 0 }
    c.mockGeminiGenerate = async (k, m, msgs, max, o) => {
      const p = msgs.map(x => typeof x.content === 'string' ? x.content : '').join('\n'); st2.calls++; st2.live++; st2.max = Math.max(st2.max, st2.live)
      try { await ticks(4)
        const items = [...p.matchAll(/^\s*(\d+)\. Thai: (.+)$/gm)].map(x => ({ i: Number(x[1]), t: x[2] }))
        return JSON.stringify(items.map(x => ({ i: x.i, s: bad.has(pairs.findIndex(q => q.thai === x.t)) ? 2 : 5, note: 'n' + x.i }))) } finally { st2.live-- }
    }
    const vv = await c.listeningQualityVerdicts(pairs, 'AIzaSyTEST-harness-key-000000', c.ev('GEMINI_DEFAULT_MODEL'), () => {})
    const right = pairs.every((p, k) => { const v = vv.get(p.thai); return v && v.score === (bad.has(k) ? 2 : 5) && v.state === (bad.has(k) ? c.ev('QUALITY').REJECTED : c.ev('QUALITY').VERIFIED) })
    T('P3', 'the 12-line naturalness chunks are judged up to three at a time (never more) and every line still gets its own verdict (40 lines, 4 chunks)', vv.size === 40 && right && st2.max >= 2 && st2.max <= 3, { size: vv.size, right, max: st2.max, calls: st2.calls })
  }

  // ══ T — where the time went ══
  {
    const ok = isFn('listeningTimingSummary') && isFn('listeningTimingLine')
    const t0 = Date.parse('2026-11-17T23:02:00.000Z')
    const rows = [{ stage: 'O_listening_story_plan', at: new Date(t0).toISOString(), durationMs: 40000 }, { stage: 'O_listening_story_write', at: new Date(t0 + 40000).toISOString(), durationMs: 20000 },
      { stage: 'O_listening_story_write', at: new Date(t0 + 60000).toISOString(), durationMs: 30000 }, { stage: 'O_listening_story_english', at: new Date(t0 + 90000).toISOString(), durationMs: 8000 }, { stage: 'O_listening_story_english', at: new Date(t0 + 90000).toISOString(), durationMs: 9000 },
      { stage: 'O_listening_story_qc_repair', at: new Date(t0 + 99000).toISOString(), durationMs: 0, deduped: true }, { stage: 'x', at: new Date(t0).toISOString(), durationMs: 5000, latched: true }, { stage: 'y', at: new Date(t0).toISOString(), durationMs: 5000, cancelled: true }]
    const s = ok ? c.ev('listeningTimingSummary')(rows) : null
    T('T1', 'the timing summary counts model time by stage (calls that overlap each count their own time), the wall time from the first request to the last answer, and the requests answered from the cache apart; latched and cancelled requests are left out',
      !!s && s.calls === 5 && s.cached === 1 && s.wallMs === 99000 && s.modelMs === 107000 && s.stages[0].stage === 'story_write' && s.stages[0].ms === 50000 && s.stages.some(x => x.stage === 'story_english' && x.calls === 2 && x.ms === 17000), s)
    const line = ok ? c.ev('listeningTimingLine')(rows) : ''
    T('T2', 'the timing line reads in plain words (wall time, model time, cache hits, the slowest stages first) and the Listening log carries it', /^⏱ LISTENING_TIMING wall 1m39s · model time 1m47s over 5 request\(s\) \(\+1 answered from the request cache/.test(line) && /by stage: story_write ×2 50s/.test(line) && A.logs.some(x => /^⏱ LISTENING_TIMING /.test(x)), { line, inLog: A.logs.some(x => /LISTENING_TIMING/.test(x)) })
  }

  // ══ stage table: the new stage has an effort (tests101 E6 requires every listening stage label to be listed) ══
  {
    const E = c.ev('ANTHROPIC_STAGE_EFFORT')
    T('S1', 'the new grouping stage has a thinking effort in the table (medium: a short classification, not the plan)', E.O_listening_story_groups === 'medium', E.O_listening_story_groups)
  }
  out.forEach(l => console.log(l))
  console.log('\n18 Nov Thai Listening coherence and speed: ' + (n - fails) + '/' + n + ' passed' + (fails ? ' — ' + fails + ' FAILED' : ''))
  process.exit(fails ? 1 : 0)
})().catch(e => { out.forEach(l => console.log(l)); console.error(e); process.exit(1) })
