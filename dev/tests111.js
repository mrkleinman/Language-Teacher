// 18 Nov (second round) — the Thai Listening story after the word groups: scenes that are ONE beat, scenes that are linked, a fact check before the editor, stable judging, reviewed uses of each
// lesson word, fewer and faster calls, an explanation of a NOT_READY track, and the track saved the moment it is finished.
// Read from the owner's 18 Nov export (7 scenes, 88 lines, 57 paid calls, NOT_READY on one line — "ได้ครับ ข่าวบอกว่าเงินเติบโตครับ" after "shall we watch the news?" — and on whole-conversation coherence;
// beach → food → waves → a shop → the weather and the news with no word that said so; the judges' verdicts moving between scenes after small edits).
// Real application functions throughout; only the model transport is scripted (the same stand-in as tests107, with the replies this round's behaviours need).
//   A  STORY BEATS      one beat per scene (set-up, middle, ending); every lesson word follows the beat; a word that cannot is a mention; a known-awkward collocation is refused
//   B  LINKED SCENES    the places in the order of a day; a spoken move opens each later scene; labelled facts are carried forward
//   C  FACT CHECK       contradictions named before the editor rounds (a date given two ways, a price asked again) and handed to the editor as faults
//   D  STABLE JUDGING   a scene is judged once; only a changed scene is judged again; a rewrite is kept or undone scene by scene
//   E  REVIEWED USES    the writer and the editor see vetted lines of each lesson word
//   F  SPEED            never more than three requests at once; one wave of independent reads; one editor round unless the grade clearly rises; lighter judge effort; scenes in parallel (switch)
//   G  WHY NOT READY    which scene and which line failed, in plain words; a NOT_READY track can be played with a label
//   H  SAVE EARLY       the finished track is saved at once, before anything else, READY or not
//   node tests111.js            (current build: tt.compiled.js, or TT_FILE)
'use strict'
const fs = require('fs')
const { load } = require('./harness')
const React = require('react'), TR = require('react-test-renderer')
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const out = []; let fails = 0, n = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + String(id).padEnd(4) + ' ' + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 700) : '')) }
const FILE = process.env.TT_FILE || 'tt.compiled.js'
const FIX = JSON.parse(fs.readFileSync(__dirname + '/sandbox/curriculum/thai-listening-library/library.json', 'utf8'))
const FIXLINES = FIX.flatMap(cv => cv.scenes.flatMap(s => s.lines.map(l => ({ sp: l[0], th: l[1], en: l[2], conv: cv.id }))))
let GLOBAL_MAX_LIVE = 0
const ticks = async k => { for (let i = 0; i < k; i++) await null }
const textOf = x => x == null ? '' : typeof x === 'string' ? x : Array.isArray(x) ? x.map(textOf).join(' ') : textOf(x.children)
const flush = async (k = 40) => { for (let i = 0; i < k; i++) await new Promise(r => setImmediate(r)) }

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

// ── the scripted stand-in for the model transport ──
// options: variant · groupK (places asked for) · flow (the flow tag of each place, in the order the model gives them) · mention (surfaces marked "mention" by the grouping)
//   plan: 'beats' → the planner gives a beat, a step per word (in the REVERSE of the group order) and a move into every later scene · 'nomove' → a beat but no moves · 'plain' → the old reply shape
//   plannerMention: surfaces the planner itself marks as mentions · invert: the FIRST write of scene 2 puts its lesson words in the reverse order · badLine: a line of the first scene's second turn with a known-awkward collocation
//   grades / review faults · cohFail: scene numbers the coherence judge fails (a function (scene, nth call that judged it) → pass is also accepted as cohScript)
//   facts: contradictions the fact check replies with [[line, line, problem]] · qcBetter / qcWorse: scenes whose QC rewrite changes the text (the judge then passes / fails them)
function scripted(c, vocab, opt = {}) {
  const la = c.ev('LISTENING_ADAPTERS').th, G = c.ev('LISTENING_GREETING_RE').th, B = c.ev('LISTENING_GOODBYE_RE').th, V = c.ev('GEMINI_SCHEMAS').verdicts
  const ctx = { vocab }
  const st = { calls: [], prompts: [], used: new Set(), variant: opt.variant || 0, live: [], maxIn: {}, maxLive: 0, order: [], reviews: 0, edits: 0, qcRepairs: 0, plans: 0, grouped: null, cohCalls: [], cohPrompts: [], scene: new Map(), judged: new Map(), factCalls: 0, starts: [], efforts: [] }
  const has = (l, s) => l.th.includes(s) && la.present(l.th, s, ctx)
  const rowsOf = p => [...p.matchAll(/^T(\d+) \| ([^|]+) \|/gm)].map(m => ({ id: Number(m[1]), s: m[2].trim() }))
  const filler = sp => FIXLINES.find((l, k) => (k + st.variant * 7) % 3 === 0 && l.sp === sp && !st.used.has(l.th) && !G.test(l.th) && !B.test(l.th) && la.text({ thai: l.th }).length > 6)
  const lessonLines = (rows, si, nS) => {
    const lines = []
    rows.forEach(r => {
      const cand = FIXLINES.filter(l => has(l, r.s) && !st.used.has(l.th) && !(si > 0 && G.test(l.th)) && !(si < nS - 1 && B.test(l.th)))
      const l = cand[st.variant % Math.max(1, cand.length)] || cand[0]
      if (l) { st.used.add(l.th); lines.push({ ...l, _id: r.id }) }
    })
    return lines
  }
  const turnsOf = lines => {
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
      st.grouped = gs.map(g => g.map(r => r.s)); st.groupRows = gs
      st.groupsPrompt = p
      return JSON.stringify({ scenes: gs.map((g, i) => ({ place: 'Place ' + (i + 1), ...(opt.flow ? { flow: opt.flow[i] } : {}), words: g.map(r => (opt.mention || []).includes(r.s) ? { id: r.id, use: 'mention', frame: 'frame for ' + r.s } : { id: r.id, use: 'say' }), support: [] })) })
    }
    if (stage === 'O_listening_story_plan') {
      st.plans++; st.planPrompt = p
      if (/THE SCENES ARE ALREADY CHOSEN/.test(p)) {
        const sc = [...p.matchAll(/^SCENE (\d+) — [^:\n]*: (.+)$/gm)].map(m => ({ n: Number(m[1]), ids: [...m[2].matchAll(/T(\d+) /g)].map(x => Number(x[1])) }))
        st.planScenes = sc
        // the planner scrambles the words (each scene lists the NEXT scene's words): the app keeps the groups anyway. With a beat, each word has a step — the reverse of the order the group gave it
        const rot = sc.map((s, i) => {
          const ids = sc[(i + 1) % sc.length].ids, stepOf = k => ids.length < 3 ? 'middle' : k < ids.length / 3 ? 'ending' : k >= (2 * ids.length) / 3 ? 'setup' : 'middle'
          return { title: 'Planned ' + (i + 1), present: 'together', happens: 'part ' + (i + 1), facts: 'x',
            ...(opt.plan === 'beats' || opt.plan === 'nomove' ? { beat: { setup: 'they set out ' + (i + 1), middle: 'they do part ' + (i + 1), ending: 'part ' + (i + 1) + ' ends' } } : {}),
            ...(opt.plan === 'beats' && i > 0 ? { transition: 'the friends say they are going on to place ' + (i + 1) } : {}),
            uses: ids.map((id, k) => ({ id, moment: 'planner moment ' + id, ...(opt.plan === 'beats' || opt.plan === 'nomove' ? { step: stepOf(k) } : {}),
              ...((opt.plannerMention || []).some(sf => { const r = (st.groupRows || []).flat().find(x => x.id === id); return r && r.s === sf }) ? { use: 'mention', frame: 'read off a sign (planner)' } : {}) })) }
        })
        return JSON.stringify({ title: 'Scripted story', story: 'two friends spend a day out', scenes: rot })
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
      const rows = rowsOf(p.slice(p.search(/TASK: (?:write|put) scene/))).filter(r => !(opt.skip || []).includes(r.s))
      // the same scene is always written from the same lines (a scene written twice, or at the same time as another, gets what it would have got alone)
      let lines = st.scene.get(si)
      if (!lines) { lines = lessonLines(rows, si, nS); st.scene.set(si, lines) }
      const first = !st.written || !st.written.has(si); (st.written = st.written || new Set()).add(si)
      const use = opt.invert && si === 1 && first ? lines.slice().reverse() : lines
      const turns = turnsOf(use.map(l => ({ ...l })))
      if (opt.priceFacts && opt.priceFacts[si]) {
        const isLesson = t => rows.some(r => t.thai.includes(r.s)), k = turns.findIndex((t, i) => i > 0 && i < turns.length - 1 && t.speaker === 'B' && turns[i + 1].speaker === 'A' && !isLesson(t) && !isLesson(turns[i + 1]))
        if (k >= 0) { turns[k] = { speaker: 'B', thai: opt.priceFacts[si][0], english: 'price talk' }; turns[k + 1] = { speaker: 'A', thai: opt.priceFacts[si][1], english: 'price answer' } }
      }
      if (opt.badLine && si === 0) turns[1] = { speaker: turns[1].speaker, thai: turns[1].speaker === 'A' ? opt.badLine : 'ฉันเห็นด้วยค่ะ', english: 'bad collocation' }
      return JSON.stringify({ turns, facts: ['WHERE: scene ' + (si + 1) + ' place', 'PAID: nothing yet'] })
    }
    if (stage === 'O_listening_story_repair' || stage === 'O_listening_story_qc_repair') {
      if (stage === 'O_listening_story_qc_repair') st.qcRepairs++
      const sceneNo = Number((p.match(/SCENE (\d+) AS WRITTEN:/) || [])[1]) - 1
      const body = p.slice(p.lastIndexOf('AS WRITTEN:') + 11).split('\n\n')[0].trim().split('\n').map(r => r.split(' | ')).filter(r => r.length >= 3)
      let turns = body.map(r => ({ speaker: r[0].replace(/^\d+\.\s*/, '').trim(), thai: r[1].trim(), english: r[2].trim() }))
      const fixOf = t => opt.badLine && t.thai === opt.badLine ? { thai: t.speaker === 'A' ? 'ผมเห็นด้วยครับ' : 'ฉันเห็นด้วยค่ะ', english: 'I agree.' } : null
      if (/Rewrite ONLY lines/.test(p)) return JSON.stringify({ fixes: turns.map((t, k) => ({ line: k + 1, ...t, ...(fixOf(t) || {}) })).filter((t, k) => fixOf(turns[k])) })
      turns.forEach(t => { const f = fixOf(t); if (f) Object.assign(t, f) })
      // a whole-scene rewrite for the beat order: the same lines, now in the order of the lesson words listed in the prompt
      if (/BEAT_ORDER/.test(p) && st.scene.has(sceneNo)) turns = turnsOf(st.scene.get(sceneNo).map(l => ({ ...l })).sort((a, b) => rowsOf(p.slice(p.lastIndexOf('Lesson words of this scene:'))).findIndex(r => r.id === a._id) - rowsOf(p.slice(p.lastIndexOf('Lesson words of this scene:'))).findIndex(r => r.id === b._id)))
      st.qcSeen = (st.qcSeen || []).concat([sceneNo + 1])
      if (stage === 'O_listening_story_qc_repair' && ((opt.qcBetter || []).includes(sceneNo + 1) || (opt.qcWorse || []).includes(sceneNo + 1)) && turns.length > 2) {
        // a rewrite that changes the text: the second line becomes another valid line of its speaker
        const keep = new Set((st.scene.get(sceneNo) || []).map(l => l.th)), kk = turns.findIndex((t, i) => i > 0 && !keep.has(t.thai))
        const sp = kk >= 0 ? turns[kk].speaker : 'A', alt = FIXLINES.find(l => l.sp === sp && !st.used.has(l.th) && !G.test(l.th) && !B.test(l.th) && la.text({ thai: l.th }).length > 6)
        if (alt && kk >= 0) { st.used.add(alt.th); turns[kk] = { speaker: sp, thai: alt.th, english: alt.en }; if ((opt.qcWorse || []).includes(sceneNo + 1)) (st.worseAlt = st.worseAlt || new Set()).add(alt.th) }
      }
      return JSON.stringify({ turns })
    }
    if (stage === 'O_listening_story_review') {
      const g = opt.grades || [7], score = g[Math.min(st.reviews, g.length - 1)]; st.reviews++
      return JSON.stringify({ score, faults: opt.grades ? [{ from: 2, to: 2, problem: 'reply missing', fix: 'add a reply' }] : [] })
    }
    if (stage === 'O_listening_story_edit') {
      st.edits++; st.lastEdit = p; (st.editPrompts = st.editPrompts || []).push(p)
      if (opt.fixFacts) { const fl = [...p.matchAll(/^- lines (\d+): FACT — /gm)].map(m => Number(m[1])), fixes = []
        fl.forEach(n0 => { const m = p.match(new RegExp('^' + n0 + '\\. ([AB]) \\|', 'm')); if (!m) return; const f = filler(m[1]); if (!f) return; st.used.add(f.th); fixes.push({ from: n0, to: n0, problem: 'fact', turns: [{ speaker: m[1], thai: f.th, english: f.en }] }) })
        if (fixes.length) return JSON.stringify({ score: 7, fixes }) }
      if (opt.grades) { const m = p.match(/^2\. ([AB]) \| ([^|]+) \| ([^|\n]*)/m)
        if (m) { const sp = m[1], ot = sp === 'A' ? 'B' : 'A', rep = REPLY[Math.min(st.edits, 3) - 1][ot === 'A' ? 0 : 1]
          return JSON.stringify({ score: 6, fixes: [{ from: 2, to: 2, problem: 'reply missing', turns: [{ speaker: sp, thai: m[2].trim(), english: m[3].trim() }, { speaker: ot, thai: rep, english: 'Sure.' }] }] }) } }
      return JSON.stringify({ fixes: [] })
    }
    if (stage === 'O_listening_story_facts') {
      st.factCalls++; st.factPrompt = p
      return JSON.stringify({ scenes: [{ scene: 1, facts: ['they are at the first place'] }], contradictions: (opt.facts || []).map(([a, b, why]) => ({ lines: [a, b], problem: why, fix: 'say it once' })) })
    }
    if (stage === 'O_listening_story_english') return JSON.stringify({ english: [...p.matchAll(/^\d+\. [AB]: (.+)$/gm)].map(m => 'EN of ' + m[1]) })
    if (stage === 'O_listening_story_line_fix') { st.lineFixPrompt = p
      if (!opt.lineFixes) return JSON.stringify({ fixes: [] })
      const fixes = [...p.matchAll(/^- line (\d+): /gm)].map(m => Number(m[1])).map(n0 => { const mm = p.match(new RegExp('^' + n0 + '\\. ([AB]) \\|', 'm')); const f = mm && filler(mm[1]); if (!f) return null; st.used.add(f.th); return { line: n0, thai: f.th, english: f.en } }).filter(Boolean)
      return JSON.stringify({ fixes }) }
    if (stage === 'O_listening_word_check' || stage === 'O_listening_scene_check') return JSON.stringify({ fixes: [] })
    if (stage === 'verdicts') {
      const items = [...p.matchAll(/^\s*(\d+)[.)]\s/gm)].map(x => Number(x[1])), nItems = Math.max(12, ...items)
      const low = (opt.lowLines || []).concat([...(st.worseAlt || [])]), bads = [...p.matchAll(/^\s*(\d+)\. Thai: (.+)$/gm)].map(m => ({ i: Number(m[1]), t: m[2] }))
      return JSON.stringify(Array.from({ length: nItems }, (_, i) => { const b = bads.find(x => x.i === i + 1); return { i: i + 1, s: b && low.some(t => b.t.includes(t)) ? 2 : 5, note: b && low.some(t => b.t.includes(t)) ? 'Non sequitur; unrelated to the line before' : '' } }))
    }
    if (stage === 'O_listening_coherence') {
      st.cohCalls.push(p); st.cohPrompts.push(p)
      // which scenes this call was asked to judge: all of them, or only the ones not listed as "already judged"
      const already = ((p.match(/Scenes ([\d, ]+) were already judged/) || [])[1] || '').split(',').map(x => Number(x)).filter(Boolean)
      const sceneTexts = new Map([...p.matchAll(/^Scene (\d+) —[^\n]*\n((?:  \(planned opening:[^\n]*\n)?(?:  \d+\. [^\n]*\n?)+)/gm)].map(m => [Number(m[1]), m[2]]))
      const verdict = s => {
        if (typeof opt.cohScript === 'function') return opt.cohScript(s, (st.judged.get(s) || 0) + 1, sceneTexts.get(s) || '')
        return !(opt.cohFail || []).includes(s) && opt.cohFail !== s
      }
      const rows = [1, 2, 3, 4, 5, 6, 7].filter(s => sceneTexts.has(s) && !already.includes(s)).map(s => { const pass = verdict(s); st.judged.set(s, (st.judged.get(s) || 0) + 1); return { scene: s, pass, breakAfterLine: pass ? null : ((opt.breakAt || {})[s] || null), reason: pass ? 'ok' : '2: the reply does not follow' } })
      return JSON.stringify({ scenes: rows, overall: rows.some(r => !r.pass) ? 3 : 5, reason: 'ok' })
    }
    return '[]'
  }
  c.mockGeminiGenerate = async (k, m, msgs, max, o) => {
    const p = msgs.map(x => typeof x.content === 'string' ? x.content : '').join('\n'), stage = (o && o.stage) || (o && o.json === V ? 'verdicts' : '?')
    st.calls.push(stage); st.prompts.push({ stage, p }); st.order.push(stage); st.starts.push({ stage, live: st.live.slice() })
    st.live.push(stage); st.maxIn[stage] = Math.max(st.maxIn[stage] || 0, st.live.filter(x => x === stage).length); st.maxLive = Math.max(st.maxLive, st.live.length)
    try { await ticks(opt.ticks || 4); return await answer(stage, p, o) } finally { st.live.splice(st.live.indexOf(stage), 1) }
  }
  return st
}
async function run(c, vocab, opt = {}) {
  c.ev('LN_STORY_WORD_CAP').maxWords = opt.cap != null ? opt.cap : 25
  const logs = []
  const st = scripted(c, vocab, opt)
  const snap = c.selectRevisionTargets('th', vocab)
  const r = await c.generateCohesiveListeningTrack({ lang: 'th', vocab, apiKey: 'AIzaSyTEST-harness-key-000000', model: c.ev('GEMINI_DEFAULT_MODEL'), attemptId: 'lattempt-t111-' + (opt.variant || 0), snapshot: snap,
    onLog: x => logs.push(String(x)), onProgress: () => {} })
  GLOBAL_MAX_LIVE = Math.max(GLOBAL_MAX_LIVE, st.maxLive)
  return { r, tr: r.track, st, logs, snap }
}

;(async () => {
  const c = load(FILE, { realBelt: true, React }); c.console.info = () => {}; c.console.warn = () => {}
  c.__bankForced = true
  const vocab = learner(c)
  c.thaiBankSetEnabled(true)
  const isFn = name => { try { return typeof c.ev(name) === 'function' } catch (e) { return false } }
  const sect = async (name, fn) => { if (!(name === 'GH' ? want('G') || want('H') : want(name))) return; try { await fn() } catch (e) { T(name + '!', 'section ' + name + ' stopped early: ' + String(e && e.message || e).slice(0, 220), false) } }
  const want = k => !process.env.ONLY || process.env.ONLY.split(',').includes(k)
  const sw = (name, on) => { if (isFn(name)) c.ev(name)(on) }
  const allOn = () => { ['lnBeatsSetEnabled', 'lnLinkedSetEnabled', 'lnFactCheckSetEnabled', 'lnStableJudgeSetEnabled', 'lnUsageExamplesSetEnabled', 'lnSpeedSetEnabled', 'lnExplainSetEnabled', 'lnSaveEarlySetEnabled'].forEach(f => sw(f, true)); sw('lnParallelScenesSetEnabled', false) }
  allOn()
  const surfOfIds = new Map(c.selectRevisionTargets('th', vocab).targets.map(t => [t.id, t.thai]))
  const lessonOrder = prompts => { const p = (prompts.find(x => x.stage === 'O_listening_story_write') || {}).p || ''; return rowsIn(p.slice(p.search(/TASK: (?:write|put) scene/))) }
  const rowsIn = p => [...p.matchAll(/^T(\d+) \| ([^|]+) \|/gm)].map(m => ({ id: Number(m[1]), s: m[2].trim() }))
  const writePrompts = A => A.st.prompts.filter(x => x.stage === 'O_listening_story_write')


  // a few surfaces the pure-function tests use (the app's own dictionary decides what they mean)
  const byThai = th => vocab.find(w => w.thai === th)
  const tgt = (th, gloss) => { const w = byThai(th); return { id: w ? w.id : 99000, surface: th, gloss: gloss || (w && w.english) || '' } }
  const la0 = c.ev('LISTENING_ADAPTERS').th

  // ══ A — STORY BEATS ══
  await sect('A', async () => {
    const A = await run(c, vocab, { variant: 2, plan: 'beats' })
    const planP = A.st.planPrompt || ''
    T('A1', 'the plan is asked for ONE beat per scene (set-up, middle, ending), a step for every lesson word and a mention for a word that cannot advance the beat — never forced',
      /ONE BEAT PER SCENE/.test(planP) && /"beat":\{"setup":"…","middle":"…","ending":"…"\}/.test(planP) && /"step":"middle"/.test(planP) && /"use":"mention" with a "frame"/.test(planP) && /advances that beat/i.test(planP), planP.slice(planP.indexOf('ONE BEAT'), planP.indexOf('ONE BEAT') + 200))
    // the scripted planner gave the words steps in the REVERSE of the order the grouping gave them; the writer of every scene must list them set-up first, ending last
    const wp = writePrompts(A), groups = A.st.groupRows || []
    const expectOrder = g => { const stepOf = (k, m) => m < 3 ? 'middle' : k < m / 3 ? 'ending' : k >= (2 * m) / 3 ? 'setup' : 'middle', r = { setup: 0, middle: 1, ending: 2 }
      return g.map((w, k) => ({ w, k, st: stepOf(k, g.length) })).sort((a, b) => r[a.st] - r[b.st] || a.k - b.k).map(x => x.w.s) }
    const okOrder = groups.length === 5 && wp.length === 5 && wp.every((x, i) => { const rows = rowsIn(x.p.slice(x.p.search(/TASK: (?:write|put) scene/))).map(r => r.s); return rows.join() === expectOrder(groups[i]).join() })
    T('A2', 'the lesson words of every scene are given to the writer in the order of the beat (set-up words first, ending words last), not the order the grouping happened to list them',
      okOrder && expectOrder(groups[0]).join() !== groups[0].map(w => w.s).join(), { want: groups[0] && expectOrder(groups[0]), got: wp[0] && rowsIn(wp[0].p.slice(wp[0].p.search(/TASK: (?:write|put) scene/))).map(r => r.s) })
    T('A3', 'the writer of a scene is given the beat as three sentences and told that every lesson word\'s line advances it, an unrelated fact or topic does not belong, and a mention is read / told / quoted',
      wp.length === 5 && wp.every((x, i) => x.p.includes('THE BEAT OF THIS SCENE') && x.p.includes('set-up: they set out ' + (i + 1)) && x.p.includes('middle: they do part ' + (i + 1)) && x.p.includes('ending: part ' + (i + 1) + ' ends') && /ADVANCES this beat/.test(x.p) && /unrelated fact or topic does not belong/.test(x.p) && /beat step: (setup|middle|ending)/.test(x.p)), wp.map((x, i) => [i, x.p.includes('THE BEAT OF THIS SCENE'), x.p.includes('set-up: they set out ' + (i + 1)), x.p.includes('ending: part ' + (i + 1) + ' ends'), /ADVANCES this beat/.test(x.p), /unrelated fact or topic does not belong/.test(x.p), /beat step: (setup|middle|ending)/.test(x.p)].join(':')).concat([wp.length]))
    T('A3b', 'the editor\'s whole-story read is told the beat of every scene and to name a line that does not advance it (a non sequitur such as a news item answering "shall we sit and watch?")',
      (rv => !!rv && /\{beat: they set out 1 → they do part 1 → part 1 ends\}/.test(rv.p) && /does not advance its scene's beat/.test(rv.p) && /shall we sit and watch/.test(rv.p))(A.st.prompts.find(x => x.stage === 'O_listening_story_review')))
    T('A3c', 'the lesson-word check of every scene is told the scene\'s beat and that a use which does not advance it (an unrelated fact or topic, a line that does not follow) is a wrong use too',
      (ps => ps.length >= 5 && ps.every(x => /Also check that its line ADVANCES this scene's beat \(set-up: they set out \d/.test(x.p) && /does not follow from the line right before it, is a WRONG use too/.test(x.p)))(A.st.prompts.filter(x => x.stage === 'O_listening_word_check')))
    // a plain planner reply (no beat, no steps) still gives the writer a beat: the plan's own words for the scene
    const Pl = await run(c, vocab, { variant: 3, plan: 'plain' })
    const wpl = writePrompts(Pl)
    T('A4', 'a plan reply without a beat still gives every scene a beat, made of the plan\'s own words (where they are → what happens → what is true after it); the words keep a positional order',
      wpl.length === 5 && wpl.every((x, i) => x.p.includes('set-up: together') && x.p.includes('middle: part ' + (i + 1)) && /ending: x/.test(x.p)) && Pl.tr.coverage.covered === 25, wpl[0] && wpl[0].p.slice(wpl[0].p.indexOf('THE BEAT'), wpl[0].p.indexOf('THE BEAT') + 200))
    // a word the PLANNER says only fits as something read / told is a mention with its frame (within the mention cap), and the writer is told so
    const pm = groups.flat().slice(0, 12).map(w => w.s)
    const M = await run(c, vocab, { variant: 4, plan: 'beats', plannerMention: pm })
    const mentioned = writePrompts(M).flatMap(x => { const m = x.p.match(/MENTION WORDS[^\n]*\n((?:- [^\n]+\n)+)/); return m ? m[1].trim().split('\n').map(l => l.replace(/^- /, '').split(' — ')[0]) : [] })
    T('A5', 'a word the planner marks as a mention is passed on to the writer with its frame (read off a sign), never as live action; at most the mention cap (a third of the words) are taken',
      mentioned.length >= 5 && mentioned.length <= 8 && mentioned.every(w => pm.includes(w)) && writePrompts(M).some(x => /read off a sign \(planner\)/.test(x.p)), { mentioned })
    // the deterministic scene validator: a word planned for the ENDING heard before one planned for the SET-UP
    const byId = new Map([[1, { surface: 'AA' }], [2, { surface: 'BB' }]])
    const sc = ids => ({ turns: ids.map(id => ({ intendedTargetIds: id ? [id] : [] })) })
    const bp = (ids, steps) => isFn('lnStoryBeatProblems') ? c.ev('lnStoryBeatProblems')(sc(ids), steps, byId) : null
    T('A6', 'beat order is checked by the app: an ending word before a set-up word is a BEAT_ORDER problem naming both; the right order, a missing word, no steps, or an ending word that is also used again later (a function word that slips into an earlier line) is not',
      !!bp([2, 0, 1], { 1: 'setup', 2: 'ending' }) && bp([2, 0, 1], { 1: 'setup', 2: 'ending' }).length === 1 && bp([2, 0, 1], { 1: 'setup', 2: 'ending' })[0].code === 'BEAT_ORDER' && /BB.*ENDING.*before AA.*SET-UP/.test(bp([2, 0, 1], { 1: 'setup', 2: 'ending' })[0].detail) &&
      bp([1, 0, 2], { 1: 'setup', 2: 'ending' }).length === 0 && bp([2, 0], { 1: 'setup', 2: 'ending' }).length === 0 && bp([2, 1], null).length === 0 && bp([2, 1, 0, 2], { 1: 'setup', 2: 'ending' }).length === 0, bp([2, 0, 1], { 1: 'setup', 2: 'ending' }))
    // end to end: the writer puts the second scene's words in the wrong order the first time; the scene is asked for again with the problem named and comes back in order
    const I = await run(c, vocab, { variant: 5, plan: 'beats', invert: true })
    const rep = I.st.prompts.find(x => x.stage === 'O_listening_story_repair' && /BEAT_ORDER/.test(x.p))
    const wpI = writePrompts(I)
    const s2 = ((I.tr.listening || {}).lines || []).filter(l => l.sceneId === 'LS2'), s2rows = wpI[1] ? rowsIn(wpI[1].p.slice(wpI[1].p.search(/TASK: (?:write|put) scene/))) : []
    const firstAt = surf => s2.findIndex(l => l.thai.includes(surf))
    T('A7', 'a scene whose lesson words come out of beat order is asked for again with BEAT_ORDER named, and the final scene follows the beat (every gate still passes, 25/25)',
      !!rep && I.logs.some(x => /scene 2 written .*BEAT_ORDER/.test(x)) && s2rows.length >= 3 && s2rows.every((r, k) => k === 0 || firstAt(s2rows[k - 1].s) < firstAt(r.s)) && I.tr.coverage.covered === 25 && I.tr.status === 'READY', { rep: !!rep, logs: I.logs.filter(x => /scene 2 written/.test(x)), order: s2rows.map(r => firstAt(r.s)) })
    // the switch gives back the old prompt
    sw('lnBeatsSetEnabled', false)
    const O = await run(c, vocab, { variant: 2, plan: 'beats' })
    sw('lnBeatsSetEnabled', true)
    T('A8', 'with the beats switch off nothing of A is asked or shown: no beat in the plan prompt, none in the writer prompt, the words keep the order the grouping gave',
      !/ONE BEAT PER SCENE/.test(O.st.planPrompt) && writePrompts(O).every(x => !/THE BEAT OF THIS SCENE/.test(x.p)) && writePrompts(O).every((x, i) => rowsIn(x.p.slice(x.p.search(/TASK: (?:write|put) scene/))).map(r => r.s).join() === (O.st.groupRows[i] || []).map(w => w.s).join()), O.st.planPrompt.slice(0, 50))
    // a known-awkward collocation (the owner's 18 Nov line): a growth word is said of living things, businesses, cities, economies — never of money
    const grow = tgt('เติบโต', 'grow, mature')
    const colo = isFn('lnCollocationFaults') ? (t, ts) => c.ev('lnCollocationFaults')(t, ts || [grow], vocab) : () => null
    T('A9', 'a growth word right after a money word is refused ("ข่าวบอกว่าเงินเติบโตครับ" — the news says money is growing); a business, a child or an economy growing is fine; a word with another meaning is not touched',
      !!colo('ข่าวบอกว่าเงินเติบโตครับ') && colo('ข่าวบอกว่าเงินเติบโตครับ').length === 1 && /เงิน.*เติบโต/.test(colo('ข่าวบอกว่าเงินเติบโตครับ')[0]) && colo('ร้านนี้เติบโตเร็วครับ').length === 0 && colo('เศรษฐกิจเติบโตดีครับ').length === 0 && colo('ลูกผมเติบโตเร็วมากครับ').length === 0 &&
      colo('ข่าวบอกว่าเงินเปลี่ยนแปลงครับ', [tgt('เปลี่ยนแปลง', 'change')]).length === 0, colo('ข่าวบอกว่าเงินเติบโตครับ'))
    const turnOf = (thai, ids) => ({ speaker: 'A', pair: { thai }, intendedTargetIds: ids || [] })
    const scProb = isFn('lnStorySceneProblems') ? c.ev('lnStorySceneProblems')(la0, { turns: [turnOf('ข่าวบอกว่าเงินเติบโตครับ', [grow.id])] }, 1, 3, [grow], { vocab }) : []
    T('A10', 'the scene check and every line fix use it: the line is a LINE_QUALITY problem naming the clash, so a rewrite or a fix cannot bring it back; with the examples switch off it is not checked',
      scProb.some(p => p.code === 'LINE_QUALITY' && /เงิน.*เติบโต/.test(p.detail) && p.line === 1) && (() => { sw('lnUsageExamplesSetEnabled', false); const q = c.ev('lnStorySceneProblems')(la0, { turns: [turnOf('ข่าวบอกว่าเงินเติบโตครับ', [grow.id])] }, 1, 3, [grow], { vocab }); sw('lnUsageExamplesSetEnabled', true); return !q.some(p => p.code === 'LINE_QUALITY' && /เงิน/.test(p.detail)) })(), scProb)
  })

  // ══ B — LINKED SCENES ══
  await sect('B', async () => {
    // pure: the places in the order of a day
    const ts = Array.from({ length: 10 }, (_, i) => ({ id: 200 + i, surface: 'w' + i }))
    const W = ids => ids.map(id => ({ id, use: 'say' }))
    const raw = flow => ({ scenes: [{ place: 'Home again', flow: flow[0], words: W([200, 201]) }, { place: 'Lunch', flow: flow[1], words: W([202, 203]) }, { place: 'Bus stop', flow: flow[2], words: W([204, 205]) }, { place: 'Market', flow: flow[3], words: W([206, 207]) }, { place: 'Beach', flow: flow[4], words: W([208, 209]) }] })
    const norm = (r, o) => isFn('lnStoryNormaliseGroups') ? c.ev('lnStoryNormaliseGroups')(r, ts, o || {}) : null
    const g1 = norm(raw(['leave', 'eat', 'arrive', 'shop', 'activity']))
    T('B1', 'the places are put in the order of a day (arrive, wait, travel, eat, activity, shop, leave) whatever order the model gave them; each place keeps its words',
      !!g1 && g1.map(g => g.place).join() === 'Bus stop,Lunch,Beach,Market,Home again' && g1.find(g => g.place === 'Lunch').ids.join() === '202,203' && g1.flowMoved === true, g1 && g1.map(g => g.place))
    const g2 = norm({ scenes: [{ place: 'A', flow: 'leave', words: W([200, 201]) }, { place: 'B-untagged', words: W([202, 203]) }, { place: 'C', flow: 'arrive', words: W([204, 205]) }, { place: 'D', words: W([206, 207]) }, { place: 'E', flow: 'eat', words: W([208, 209]) }] })
    T('B2', 'a place the model gave no flow tag stays right behind the place before it; with fewer than two tags, or the linking switch off, the model\'s own order is kept',
      !!g2 && g2.map(g => g.place).join() === 'C,D,E,A,B-untagged' && norm(raw(['eat', '', '', '', ''])).map(g => g.place).join() === 'Home again,Lunch,Bus stop,Market,Beach' &&
      (() => { sw('lnLinkedSetEnabled', false); const g = norm(raw(['leave', 'eat', 'arrive', 'shop', 'activity'])); sw('lnLinkedSetEnabled', true); return g.map(x => x.place).join() === 'Home again,Lunch,Bus stop,Market,Beach' })(), g2 && g2.map(g => g.place))
    const L = await run(c, vocab, { variant: 2, plan: 'beats', flow: ['leave', 'eat', 'arrive', 'shop', 'travel'] })
    const gp = L.st.groupsPrompt || '', planP = L.st.planPrompt || ''
    T('B3', 'end to end: the grouping is asked for a flow tag per place, the plan is given the places in the order of the day (Place 3 arrive → 5 travel → 2 eat → 4 shop → 1 leave) and the log says they were reordered',
      /"flow": the stage of the day/.test(gp) && /"flow":"eat"/.test(gp) && ['Place 3', 'Place 5', 'Place 2', 'Place 4', 'Place 1'].every((pl, i) => planP.includes('SCENE ' + (i + 1) + ' — ' + pl)) && L.logs.some(x => /put in the order of a day \(arrive → travel → eat → shop → leave\)/.test(x)), planP.slice(planP.indexOf('SCENE 1'), planP.indexOf('SCENE 1') + 300))
    const planA = L.st.planPrompt
    T('B4', 'the plan is asked for a spoken move into every later scene (one sentence: how the friends get from where the last scene ended and what one of them says), starting from the ending of the scene before',
      /LINKED SCENES: every scene after the first has a "transition"/.test(planA) && /No hop without a transition/.test(planA) && /"transition":"…"/.test(planA) && /the "ending" of scene k-1/.test(planA))
    const lw = writePrompts(L)
    T('B5', 'every later scene is written to OPEN with that move: its prompt carries the planned move, the last lines of the scene before it, and tells the writer to say the move aloud; the first scene has none',
      lw.length === 5 && !/HOW THIS SCENE OPENS/.test(lw[0].p) && lw.slice(1).every((x, i) => /HOW THIS SCENE OPENS/.test(x.p) && x.p.includes('The planned move: the friends say they are going on to place ' + (i + 2)) && /the last lines were "/.test(x.p) && /SAYS that move aloud/.test(x.p)), lw[1] && lw[1].p.slice(lw[1].p.indexOf('HOW THIS'), lw[1].p.indexOf('HOW THIS') + 400))
    const prevLast = ((L.tr.listening || {}).lines || []).filter(l => l.sceneId === 'LS1').slice(-1)[0]
    T('B6', 'the "last lines" given to the writer of scene 2 are really the end of scene 1 as it was written', !!prevLast && lw[1].p.includes(prevLast.thai), prevLast && prevLast.thai)
    // a plan with no move into a scene: the app writes one from the scenes' own words, says so, and the scene still opens with a spoken move
    const NM = await run(c, vocab, { variant: 3, plan: 'nomove' })
    const nw = writePrompts(NM)
    T('B7', 'a plan that gives no move into a scene is not accepted as a silent hop: one is written from the scenes\' own words (and logged), so every later scene still opens with a spoken move',
      NM.logs.some(x => /the plan gave no move into scenes 2, 3, 4, 5/.test(x)) && nw.slice(1).every(x => /The planned move: the friends finish at "Planned \d"/.test(x.p) && /one of them says so aloud/.test(x.p)), nw[1] && nw[1].p.slice(nw[1].p.indexOf('The planned move'), nw[1].p.indexOf('The planned move') + 200))
    T('B8', 'the facts a scene made true are asked for with a label (WHO / WHERE / TIME / ORDERED / PAID / DECIDED) and carried to every later scene; the whole-conversation judge is shown each scene\'s planned opening',
      lw.every(x => /each starting with a label — WHO/.test(x.p)) && /WHERE: scene 1 place/.test(lw[1].p) && /PAID: nothing yet/.test(lw[2].p) && L.st.cohPrompts.length > 0 && /\(planned opening: the friends say they are going on to place 2\)/.test(L.st.cohPrompts[0]),
      { f1: lw[1] && lw[1].p.slice(lw[1].p.indexOf('FACTS ESTABLISHED'), lw[1].p.indexOf('FACTS ESTABLISHED') + 160), coh: (L.st.cohPrompts[0] || '').slice(0, 300) })
    sw('lnLinkedSetEnabled', false)
    const NL = await run(c, vocab, { variant: 2, plan: 'beats', flow: ['leave', 'eat', 'arrive', 'shop', 'travel'] })
    sw('lnLinkedSetEnabled', true)
    T('B9', 'with the linking switch off: no flow asked, no transition asked, no opening move, the places in the order the model gave them, facts unlabelled',
      !/"flow"/.test(NL.st.groupsPrompt) && !/LINKED SCENES/.test(NL.st.planPrompt) && writePrompts(NL).every(x => !/HOW THIS SCENE OPENS/.test(x.p) && !/each starting with a label/.test(x.p)) && NL.st.planPrompt.includes('SCENE 1 — Place 1'), NL.st.planPrompt.slice(NL.st.planPrompt.indexOf('SCENE 1'), 80))
  })


  // ══ C — FACT CROSS-CHECK ══
  await sect('C', async () => {
    const nm = isFn('lnThaiNumber') ? c.ev('lnThaiNumber') : () => null
    T('C1', 'Thai number words and digits are read as numbers (สองพัน 2000, ยี่สิบ 20, สิบเอ็ด 11, ร้อยห้าสิบ 150, หนึ่งหมื่นสองพัน 12000), anything else is not a number',
      nm('สองพัน') === 2000 && nm('ยี่สิบ') === 20 && nm('สิบเอ็ด') === 11 && nm('ร้อยห้าสิบ') === 150 && nm('หนึ่งหมื่นสองพัน') === 12000 && nm('200') === 200 && nm('1,500') === 1500 && nm('ตลาด') === null && nm('') === null,
      ['สองพัน', 'ยี่สิบ', 'สิบเอ็ด', 'ร้อยห้าสิบ', 'หนึ่งหมื่นสองพัน'].map(nm))
    const rows = arr => arr.map(([n, scene, speaker, thai]) => ({ n, scene, speaker, thai }))
    const fc = arr => isFn('lnFactContradictions') ? c.ev('lnFactContradictions')(rows(arr)) : null
    // the owner's 18 Nov run: the fare "200 baht" in scene 1, then "how much is the total?" answered "two thousand"; and a date given as the tenth of July and then another day
    const d1 = fc([[5, 1, 'A', 'ผมอยากไปวันที่สิบกรกฎาคมครับ'], [9, 2, 'B', 'งั้นไปวันที่ยี่สิบกรกฎาคมดีไหมคะ'], [30, 4, 'A', 'ไปเดือนตุลาคมครับ']])
    T('C2', 'a date given two ways is named (the tenth and the twentieth of July, lines 5 and 9; the line to change is the later one); the same day said twice, or two different months, is not',
      !!d1 && d1.length === 1 && d1[0].kind === 'DATE' && d1[0].lines.join() === '5,9' && /กรกฎาคม|July/.test(d1[0].problem) && fc([[5, 1, 'A', 'วันที่สิบกรกฎาคมครับ'], [9, 2, 'B', 'ใช่ค่ะ วันที่สิบกรกฎาคมค่ะ']]).length === 0 && fc([[5, 1, 'A', 'วันที่สิบกรกฎาคมครับ'], [9, 2, 'B', 'วันที่สิบตุลาคมค่ะ']]).length === 0, d1)
    const p1 = fc([[3, 1, 'B', 'ค่าโดยสารไปท่าเรือเท่าไหร่คะ'], [4, 1, 'A', 'สี่สิบบาทครับ'], [20, 3, 'B', 'ค่าโดยสารเท่าไหร่คะ'], [21, 3, 'A', 'แปดสิบบาทครับ']])
    T('C3', 'a fare settled and then asked again is named; answered with another amount it is named as two different prices (40 and 80 baht)',
      !!p1 && p1.length === 1 && p1[0].kind === 'PRICE' && p1[0].lines.join() === '3,20' && /answered two ways: 40 baht.*80 baht/.test(p1[0].problem) &&
      /already asked and answered \(40 baht/.test(fc([[3, 1, 'B', 'ค่าโดยสารไปท่าเรือเท่าไหร่คะ'], [4, 1, 'A', 'สี่สิบบาทครับ'], [20, 3, 'B', 'ค่าโดยสารเท่าไหร่คะ'], [21, 3, 'A', 'ใช่ครับ']])[0].problem), p1)
    T('C4', 'two price questions about different things are not a contradiction (a shirt and a bag; a question with no answer yet), and a vague stem ("this one") is never matched',
      fc([[3, 1, 'B', 'เสื้อตัวนี้ราคาเท่าไหร่คะ'], [4, 1, 'A', 'สามร้อยบาทครับ'], [20, 3, 'B', 'กระเป๋าใบนั้นราคาเท่าไหร่คะ'], [21, 3, 'A', 'ห้าร้อยบาทครับ']]).length === 0 && fc([[3, 1, 'B', 'อันนี้เท่าไหร่คะ'], [4, 1, 'A', 'สามร้อยบาทครับ'], [20, 3, 'B', 'อันนี้เท่าไหร่คะ'], [21, 3, 'A', 'ห้าร้อยบาทครับ']]).length === 0 && fc([[3, 1, 'B', 'ค่าโดยสารไปท่าเรือเท่าไหร่คะ'], [4, 1, 'A', 'ไม่รู้ครับ'], [20, 3, 'B', 'ค่าโดยสารเท่าไหร่คะ']]).length === 0)
    // end to end: the writer puts the same fare in two scenes with two different answers; the program sees it (the model's reply names nothing), BEFORE the editor, and the editor is told it first
    const price = { 0: ['ค่าโดยสารไปท่าเรือเท่าไหร่คะ', 'สี่สิบบาทครับ'], 2: ['ค่าโดยสารเท่าไหร่คะ', 'แปดสิบบาทครับ'] }
    const F = await run(c, vocab, { variant: 2, plan: 'beats', priceFacts: price, fixFacts: true })
    const firstEdit = F.st.order.indexOf('O_listening_story_edit'), factAt = F.st.order.indexOf('O_listening_story_facts')
    const ep = (F.st.editPrompts || [])[0] || ''
    const nums = ((F.tr.listening || {}).lines || []).map(l => ({ thai: l.thai }))
    T('C5', 'end to end: the fact check runs BEFORE the first editor fix, finds the fare asked again with two answers by program alone, and the editor is told it as a named FACT fault (and it is the first fault listed)',
      factAt >= 0 && firstEdit > factAt && /FACT — the price of "ค่าโดยสาร[^"]*" is answered two ways: 40 baht \(L\d+\) and 80 baht \(L\d+\)/.test(ep) && /A NATIVE TEACHER FOUND THESE FAULTS — fix them first:\n- lines \d+: FACT — /.test(ep) &&
      F.logs.some(x => /fact check · \d+ line\(s\) state a fact · 1 contradiction\(s\) named \(1 seen by the program, 0 by the check\)/.test(x)), { factAt, firstEdit, ep: ep.slice(ep.indexOf('A NATIVE'), ep.indexOf('A NATIVE') + 300), logs: F.logs.filter(x => /fact check/.test(x)) })
    const eps = (F.tr.listening || {}).lines || [], priceLines = eps.filter(l => /เท่าไหร่/.test(l.thai) && /ค่าโดยสาร/.test(l.thai))
    T('C6', 'the editor fixes the real fault: the later asking of the fare is replaced (one fare question is left in the conversation), the fix is kept, and every gate and all 25 words still hold',
      priceLines.length === 1 && F.logs.some(x => /edit round 1 .* 1 fix\(es\) kept/.test(x)) && F.tr.coverage.covered === 25 && F.tr.status === 'READY' && c.ev('lnFactContradictions')(eps.map((l, i) => ({ n: i + 1, scene: l.scene, speaker: l.speaker, thai: l.thai }))).length === 0, { price: priceLines.map(l => l.thai), status: F.tr.status, failed: F.tr.failedChecks })
    // the model's own list: contradictions it names reach the editor too; a line number outside the conversation is ignored; the ledger and the fact lines are what it is shown
    const FM = await run(c, vocab, { variant: 3, plan: 'beats', facts: [[12, 30, 'a fare settled then asked again'], [999, 5, 'out of range'], [7, 200, 'out of range too']], grades: [7] })
    const fp = FM.st.factPrompt || '', fep = (FM.st.editPrompts || [])[0] || ''
    T('C7', 'the one-call check is shown each scene\'s recorded facts and the lines that state a fact; what it names is handed to the editor (a line number outside the conversation is dropped), before the editor\'s own read',
      /THE FACTS EACH SCENE'S WRITER RECORDED:\nS1: WHERE: scene 1 place · PAID: nothing yet/.test(fp) && /THE LINES THAT STATE OR ASK A FACT/.test(fp) && /\(the line to change is the LATER one\)/.test(fp) &&
      /- lines 30: FACT — a fare settled then asked again/.test(fep) && !/out of range/.test(fep) && /A NATIVE TEACHER FOUND THESE FAULTS/.test(fep) && fep.indexOf('FACT — a fare') < fep.indexOf('reply missing'), { fp: fp.slice(0, 200), fep: fep.slice(fep.indexOf('A NATIVE'), fep.indexOf('A NATIVE') + 300) })
    sw('lnFactCheckSetEnabled', false)
    const FO = await run(c, vocab, { variant: 2, plan: 'beats', priceFacts: price, grades: [7] })
    sw('lnFactCheckSetEnabled', true)
    T('C8', 'with the fact-check switch off there is no fact call and no FACT fault (the editor reads as before)', FO.st.factCalls === 0 && !FO.st.order.includes('O_listening_story_facts') && !(FO.st.editPrompts || []).some(x => /FACT — /.test(x)), { calls: FO.st.factCalls })
    c.ev('LN_FACT_CHECK').model = false
    const FD = await run(c, vocab, { variant: 2, plan: 'beats', priceFacts: price, grades: [7] })
    c.ev('LN_FACT_CHECK').model = true
    T('C9', 'with only the program\'s part of the check (no model call) the contradictions are still found and still reach the editor', FD.st.factCalls === 0 && (FD.st.editPrompts || []).some(x => /FACT — the price of/.test(x)), { calls: FD.st.factCalls })
  })

  // ══ D — STABLE JUDGING ══
  await sect('D', async () => {
    // a scene whose own text and the end of the scene before it are unchanged keeps its verdict; only the scene that changed goes to the judge again
    const D1 = await run(c, vocab, { variant: 2, plan: 'beats', cohScript: (s, nth) => s !== 3 || nth >= 2, qcBetter: [3] })
    const asked = D1.st.cohPrompts.map(p => ((p.match(/Scenes ([\d, ]+) were already judged/) || [])[1] || '').split(',').map(Number).filter(Boolean))
    T('D1', 'a scene is judged ONCE: the judge is asked about all five scenes the first time, and after scene 3 is rewritten only about scene 3 (scenes 1, 2, 4, 5 are sent as already judged)',
      D1.st.cohPrompts.length === 2 && asked[0].length === 0 && asked[1].join() === '1,2,4,5' && [1, 2, 4, 5].every(s => D1.st.judged.get(s) === 1) && D1.st.judged.get(3) === 2 && D1.tr.status === 'READY', { asked, judged: [...D1.st.judged.entries()], status: D1.tr.status, failed: D1.tr.failedChecks })
    T('D2', 'the log says what was kept and what was judged again', D1.logs.some(x => /coherence: 4 scene verdict\(s\) kept as judged .* judged again: scene 3/.test(x)), D1.logs.filter(x => /coherence:/.test(x)))
    // a judge whose verdict on a scene flips if it is ever asked again: the first verdict stands, so the track is READY (before: the whole conversation was judged again, scene 1 flipped to FAIL)
    const D3 = await run(c, vocab, { variant: 2, plan: 'beats', cohScript: (s, nth) => s === 1 ? nth === 1 : s === 3 ? nth >= 2 : true, qcBetter: [3] })
    T('D3', 'stable verdicts: scene 1 passed once and is not asked again, so scene 3\'s repair leads to READY — a judge that gives another verdict on a second look cannot move the failure from scene to scene',
      D3.tr.status === 'READY' && D3.st.judged.get(1) === 1 && D3.tr.listening.gates.WHOLE_CONVERSATION_COHERENCE === 'PASS', { status: D3.tr.status, judged1: D3.st.judged.get(1), failed: D3.tr.failedChecks })
    // scene by scene: scene 2's rewrite helps (its verdict turns to pass) and scene 4's does not (still failing, and the new line is judged unnatural): scene 2's rewrite stays, scene 4 goes back
    const D4 = await run(c, vocab, { variant: 3, plan: 'beats', cohScript: (s, nth) => s === 2 ? nth >= 2 : s === 4 ? false : true, qcBetter: [2], qcWorse: [4] })
    const textOf4 = r => ((r.tr.listening || {}).lines || []).filter(l => l.sceneId === 'LS4').map(l => l.thai)
    const D4b = await run(c, vocab, { variant: 3, plan: 'beats', cohScript: (s, nth) => s === 4 ? false : true })      // the same story with no rewrite of scene 4 at all (nothing to compare against otherwise)
    T('D4', 'a rewrite is kept or undone SCENE BY SCENE: scene 2 keeps its improved text, scene 4 (still failing, and now with an unnatural line) goes back to the text it had; the track is not NOT_READY because of scene 2',
      D4.st.worseAlt && [...D4.st.worseAlt].length >= 1 && ![...D4.st.worseAlt].some(t => textOf4(D4).includes(t)) && textOf4(D4).join('|') === textOf4(D4b).join('|') && D4.logs.some(x => /QC round 1 kept the rewrite of scene 2 and put scene 4 back/.test(x)) &&
      ((D4.tr.listening || {}).coherenceAudit.verdicts || []).find(v => v.scene === 2).pass === true, { logs: D4.logs.filter(x => /QC round|put scene/.test(x)), worse: D4.st.worseAlt && [...D4.st.worseAlt], s4: textOf4(D4).length, same: textOf4(D4).join('|') === textOf4(D4b).join('|') })
    // the cost of repeating a judgement: with the switch off the whole conversation is judged again after every rewrite
    sw('lnStableJudgeSetEnabled', false)
    const D5 = await run(c, vocab, { variant: 2, plan: 'beats', cohScript: (s, nth) => s !== 3 || nth >= 2, qcBetter: [3] })
    sw('lnStableJudgeSetEnabled', true)
    T('D5', 'with the stable-judging switch off the judge is asked about every scene every time (the earlier behaviour): scenes 1, 2, 4, 5 are judged twice', D5.st.cohPrompts.length === 2 && D5.st.cohPrompts.every(p => !/already judged/.test(p)) && [1, 2, 4, 5].every(s => D5.st.judged.get(s) === 2), { judged: [...D5.st.judged.entries()], calls: D5.st.cohPrompts.length })
    T('D6', 'the judge is given the fixed checklist and told to judge every scene against exactly that (and to start a failed scene\'s reason with the number of the item it fails)',
      /Judge every scene against EXACTLY the checklist above and nothing else/.test(D1.st.cohPrompts[0]) && /Start the reason of a failed scene with the number of the checklist item/.test(D1.st.cohPrompts[0]) && /COHERENCE means a listener can follow it as one real conversation/.test(D1.st.cohPrompts[0]))
  })

  // ══ E — REVIEWED USES ══
  await sect('E', async () => {
    const E = await run(c, vocab, { variant: 2, plan: 'beats' })
    const wp = writePrompts(E), blocks = wp.map(x => (x.p.match(/REVIEWED USES of these words[^\n]*\n((?:[^\n]+\n)+?)(?:\n|THE BEAT|HOW THIS|TASK)/) || [])[1] || '')
    const exLines = blocks.flatMap(b => b.trim().split('\n'))
    T('E1', 'every scene writer is given a few reviewed lines for its lesson words (the vetted bank / the lesson modules), as sense and neighbouring words only — never to be copied',
      E.logs.some(x => /reviewed uses for \d+ of 25 lesson words/.test(x)) && wp.length === 5 && wp.every(x => /REVIEWED USES of these words/.test(x.p) && /Copy neither the sentence nor the situation/.test(x.p)) && exLines.length >= 10, { n: exLines.length, sample: exLines[0] })
    const inv = c.snapshotLearnerInventory('th', vocab, [], 'listening').inventory, taught = inv.taught
    const sample = [...new Set(exLines.flatMap(l => l.split('  |  ')).map(x => x.replace(/^[^:]*: /, '')))]
    const unknown = sample.map(x => { const th = (x.replace(/^\[[^\]]*\] → /, '').split(' — ')[0] || '').trim(); return c.listeningUnexposedWords('th', { thai: th, speaker: 'A' }, taught, [], vocab) }).filter(u => u.length)
    T('E2', 'the reviewed lines are pre-checked for THIS learner: none of them contains a word the learner was not taught (closed vocabulary), and each is a line that really contains its lesson word',
      sample.length >= 10 && unknown.length === 0, { sample: sample.slice(0, 3), unknown: unknown.slice(0, 3) })
    const rv = E.st.prompts.find(x => x.stage === 'O_listening_story_review')
    T('E3', 'the editor\'s whole-story read is given them too (a lesson word in another sense than its reviewed use is a fault)', !!rv && /REVIEWED USES of these words/.test(rv.p), rv && rv.p.slice(0, 40))
    sw('lnUsageExamplesSetEnabled', false)
    const EO = await run(c, vocab, { variant: 2, plan: 'beats' })
    sw('lnUsageExamplesSetEnabled', true)
    T('E4', 'with the examples switch off no scene writer and no editor read is shown a reviewed use', writePrompts(EO).every(x => !/REVIEWED USES/.test(x.p)) && !/REVIEWED USES/.test((EO.st.prompts.find(x => x.stage === 'O_listening_story_review') || {}).p || '') && !EO.logs.some(x => /reviewed uses for/.test(x)))
    // the lesson modules are the second source: a word with no bank exchange but with a module gets its line from there
    const data = (() => { const m = /const THAI_MODULES_GZ = "([^"]+)"/.exec(fs.readFileSync(__dirname + '/tt.jsx', 'utf8')); return JSON.parse(require('zlib').gunzipSync(Buffer.from(m[1], 'base64')).toString('utf8')) })()
    c.thaiModulesSetEnabled(true); c.thaiModulesUseData(data)
    const bank = c.ev('THAI_EXCHANGE_BANK'), cand = vocab.filter(w => w.thai && w.status === 'known' && !bank[w.thai] && w.curriculumIndex > 0 && w.curriculumIndex <= 400).slice(0, 60)
    let found = null
    for (const w of cand) { const r = c.ev('lnUsageExamples')([{ id: w.id, surface: w.thai, gloss: String(w.english || '').split(/[;/]/)[0] }], vocab, la0, { vocab }, 3).get(w.id); if (r && r.some(x => x.from === 'module')) { found = { w, r }; break } }
    T('E5', 'a word without a bank exchange gets reviewed lines from the lesson modules (marked as such), each containing the word, at most three',
      !!found && found.r.length <= 3 && found.r.every(x => x.thai.includes(found.w.thai) && x.english) && found.r.every(x => x.from === 'module'), found && { w: found.w.thai, r: found.r.map(x => x.thai) })
    c.thaiModulesSetEnabled(false)
  })

  // ══ F — FEWER AND FASTER CALLS ══
  await sect('F', async () => {
    const W = await run(c, vocab, { variant: 2, plan: 'beats', grades: [6, 7.5] })
    const ord = W.st.order, firstEdit = ord.indexOf('O_listening_story_edit'), lastWord = ord.lastIndexOf('O_listening_word_check')
    T('F1', 'never more than THREE model requests at once, whatever runs together (writing aside, the judges, the lesson-word checks and the editor\'s read overlap — up to three, never four or more)',
      W.st.maxLive <= 3 && W.st.maxLive >= 2, { maxLive: W.st.maxLive })
    const overlaps = W.st.starts.some(s => s.stage === 'O_listening_word_check' && s.live.some(x => /review|facts|verdicts|coherence/.test(x)))
    T('F2', 'the independent reads run as ONE wave: the lesson-word checks start while the editor\'s read, the fact check or the judges are still running, and every one of them is asked BEFORE the first editor fix',
      overlaps && ord.indexOf('O_listening_story_review') < firstEdit && ord.indexOf('O_listening_story_facts') < firstEdit && lastWord < firstEdit && ord.indexOf('verdicts') < firstEdit && ord.indexOf('O_listening_coherence') < firstEdit && W.logs.some(x => /one wave of reads/.test(x)), { firstEdit, lastWord })
    // one editor round unless the grade clearly rises
    const G1 = await run(c, vocab, { variant: 2, plan: 'beats', grades: [6, 6.5] })
    const G2 = await run(c, vocab, { variant: 3, plan: 'beats', grades: [6, 7] })
    const G3 = await run(c, vocab, { variant: 4, plan: 'beats', grades: [6, 5] })
    T('F3', 'the editor is ONE fix round unless the grade clearly rises: 6 then 6.5 → one fix call (a half point is not clear), 6 then 7 → a second, 6 then 5 → the first round is undone',
      G1.st.reviews === 2 && G1.st.edits === 1 && /not clearly better/.test(G1.logs.filter(x => /edit round 2/.test(x)).join(' ')) && G2.st.reviews >= 2 && G2.st.edits === 2 && G3.st.edits === 1 && G3.logs.some(x => /fixes are undone/.test(x)), { g1: [G1.st.reviews, G1.st.edits], g2: [G2.st.reviews, G2.st.edits], g3: [G3.st.reviews, G3.st.edits] })
    // nothing to fix: no fix call
    const N = await run(c, vocab, { variant: 2, plan: 'beats' })
    sw('lnSpeedSetEnabled', false)
    const NO = await run(c, vocab, { variant: 2, plan: 'beats' })
    sw('lnSpeedSetEnabled', true)
    T('F4', 'when the editor\'s read names no fault and grades 7 or more, no fix call is paid for (before: a second call went looking for faults the read had just said were not there)',
      N.st.edits === 0 && N.logs.some(x => /no fault named — nothing to fix, no fix call is paid for/.test(x)) && NO.st.edits >= 1, { speedOn: N.st.edits, speedOff: NO.st.edits })
    const fe = c.ev('anthropicStageEffort')
    T('F5', 'effort: the editor\'s read runs at MEDIUM while the speed switch is on (HIGH with it off); the plan, the meaning plan, the semantic audit and the coherence judge stay HIGH; the new fact check is MEDIUM and in the table',
      fe('O_listening_story_review') === 'medium' && fe('O_listening_story_plan') === 'high' && fe('O_listening_meaning_plan') === 'high' && fe('O_listening_semantic_audit') === 'high' && fe('O_listening_coherence') === 'high' && fe('O_listening_story_facts') === 'medium' &&
      c.ev('ANTHROPIC_STAGE_EFFORT').O_listening_story_facts === 'medium' && (() => { sw('lnSpeedSetEnabled', false); const v = fe('O_listening_story_review'); sw('lnSpeedSetEnabled', true); return v === 'high' })(), [fe('O_listening_story_review'), fe('O_listening_coherence')])
    // the line a scene breaks at was just rewritten by the line fix: the whole-scene rewrite waits for the next judgement
    const base = await run(c, vocab, { variant: 2, plan: 'beats' })
    const ls3 = base.tr.listening.lines.filter(l => l.sceneId === 'LS3'), jj = ls3.findIndex((l, i) => i > 0 && !(l.coveredTargetIds || []).length)
    const LF = await run(c, vocab, { variant: 2, plan: 'beats', lowLines: [ls3[jj].thai], cohScript: (s, nth) => s !== 3 || nth >= 2, breakAt: { 3: jj + 1 }, lineFixes: true })
    T('F6', 'a scene is not rewritten as a whole when the line it breaks at was just rewritten by the line fix: it is judged again first (one rewrite call less), and it passes',
      LF.st.qcRepairs === 0 && LF.logs.some(x => /scene 3: the line it broke at was just rewritten — the scene is judged again before it is rewritten/.test(x)) && LF.tr.status === 'READY', { qc: LF.st.qcRepairs, status: LF.tr.status, logs: LF.logs.filter(x => /QC round|line fixes|just rewritten/.test(x)) })
  })


  // ══ F7 — SCENES AT THE SAME TIME (a switch, off by default) ══
  await sect('F', async () => {
    T('F7a', 'scenes written at the same time is a switch and it is OFF by default (the live effect on coherence cannot be measured here; the stand-in proves the mechanics only)', c.ev('LN_PARALLEL_SCENES').on === false && isFn('lnParallelScenesSetEnabled'))
    const Sq = await run(c, vocab, { variant: 2, plan: 'beats' })
    sw('lnParallelScenesSetEnabled', true)
    const Pr = await run(c, vocab, { variant: 2, plan: 'beats' })
    sw('lnParallelScenesSetEnabled', false)
    const txt = r => ((r.tr.listening || {}).lines || []).map(l => l.speaker + ':' + l.thai).join('|')
    T('F7b', 'the same scripted replies give the SAME conversation with the scenes written together as one after the other: the same lines, the same gates, the same coverage, READY both ways',
      txt(Sq) === txt(Pr) && txt(Sq).length > 100 && JSON.stringify(Sq.tr.listening.gates) === JSON.stringify(Pr.tr.listening.gates) && Sq.tr.status === 'READY' && Pr.tr.status === 'READY' && Sq.tr.coverage.covered === 25 && Pr.tr.coverage.covered === 25, { same: txt(Sq) === txt(Pr), sq: Sq.tr.status, pr: Pr.tr.status })
    T('F7c', 'written together: several scene writes run at the same time (never more than three requests at all); one after the other they never overlap', Pr.st.maxIn['O_listening_story_write'] >= 2 && Pr.st.maxLive <= 3 && Sq.st.maxIn['O_listening_story_write'] === 1 && Pr.logs.some(x => /scenes written at the same time \(never more than 3 requests at once\)/.test(x)), { par: Pr.st.maxIn['O_listening_story_write'], seq: Sq.st.maxIn['O_listening_story_write'], live: Pr.st.maxLive })
    // a scene depends on the earlier ones ONLY through the plan: its beat, the move that opens it and the facts planned before it — never through their wording
    const pw = writePrompts(Pr), sw3 = writePrompts(Sq)
    const written2 = (Pr.tr.listening.lines.find(l => l.sceneId === 'LS2') || {}).thai
    T('F7d', 'in a parallel write the third scene is given the PLAN of the scenes before it (their beat, the move that opens it, the planned facts) and none of their wording; written in turn it is given the earlier scenes as written',
      pw.length === 5 && /\(the earlier scenes are being written at the same time: this is their PLAN\)/.test(pw[2].p) && /The planned move: the friends say they are going on to place 3/.test(pw[2].p) && /FACTS ESTABLISHED SO FAR \(as planned\)/.test(pw[2].p) && !pw[2].p.includes(written2) && !/the last lines were "/.test(pw[2].p) &&
      sw3[2].p.includes(written2) && /the last lines were "/.test(sw3[2].p), { par: pw[2] && pw[2].p.slice(pw[2].p.indexOf('THE CONVERSATION SO FAR'), pw[2].p.indexOf('THE CONVERSATION SO FAR') + 250) })
  })

  // ══ G — WHY A TRACK IS NOT READY, IN PLAIN WORDS ══
  let notReady = null
  await sect('GH', async () => {
    const base = await run(c, vocab, { variant: 2, plan: 'beats' })
    const bl = base.tr.listening.lines, iLow = bl.findIndex((l, i) => i > 3 && !(l.coveredTargetIds || []).length)
    const lowLine = bl[iLow]
    notReady = await run(c, vocab, { variant: 2, plan: 'beats', lowLines: [lowLine.thai], cohScript: s => s !== 3 })
    notReady.low = { i: iLow + 1, line: lowLine }
  })
  await sect('G', async () => {
    const N = notReady, why = N.tr.whyNotReady || [], low = N.low
    T('G1', 'a NOT_READY track says which scene and which line failed, one plain sentence each: the unnatural line (scene, line number, its Thai and English) and the scene that does not hold together',
      N.tr.status === 'NOT_READY' && why.some(w => w.line === low.i && w.scene === low.line.scene && w.text.startsWith('Scene ' + low.line.scene + ', line ' + low.i + ' (') && w.text.includes(low.line.thai) && /does not sound like something a Thai friend would say/.test(w.text)) &&
      why.some(w => w.scene === 3 && /^Scene 3 .*does not hold together as one conversation/.test(w.text)) && why.every(w => w.text.split(/[.!?]\s/).length <= 2 && w.text.length < 400), why.map(w => w.text))
    const exp = (isFn('listeningTrackExportLines') ? c.ev('listeningTrackExportLines')(N.tr) : []).join('\n')
    T('G2', 'the export carries the same sentences under WHY NOT READY (and the failed gates as before)', /WHY NOT READY \(\d+\):/.test(exp) && why.every(w => exp.includes('  - ' + w.text)) && /NATURALNESS=false/.test(exp) && /WHOLE_CONVERSATION_COHERENCE=FAIL/.test(exp), exp.slice(exp.indexOf('WHY NOT'), exp.indexOf('WHY NOT') + 300))
    const expOn0 = c.ev('listeningTrackExportLines')(N.tr).join('\n')
    sw('lnExplainSetEnabled', false)
    const NO = await run(c, vocab, { variant: 2, plan: 'beats', lowLines: [low.line.thai], cohScript: s => s !== 3 })
    const expOff = c.ev('listeningTrackExportLines')(NO.tr).join('\n')
    sw('lnExplainSetEnabled', true)
    T('G3', 'with the explanation switch off a NOT_READY track carries no sentences and the export has no WHY NOT READY block (it is the switch of the whole item)', NO.tr.status === 'NOT_READY' && (NO.tr.whyNotReady || []).length === 0 && !/WHY NOT READY/.test(expOff) && /WHY NOT READY/.test(expOn0))
    // the screen
    const mkPanel = (track, props) => { let R; TR.act(() => { R = TR.create(React.createElement(c.ListeningStatusPanel, { track, wordOf: id => String(id), building: false, onRebuild() {}, onBack() {}, onStart() {}, onCancel() {}, onPlayAnyway() {}, ...props })) }); return R }
    const panel = mkPanel(N.tr), pt = textOf(panel.toJSON())
    const lineRows = panel.root.findAll(x => x.props && x.props['data-listening-why-line'] !== undefined && typeof x.type === 'string')
    const btns = panel.root.findAll(x => x.type === 'button' || (x.props && x.props.onClick && typeof x.type !== 'string')).map(b => textOf(b.children))
    T('G4', 'the Listening screen shows WHAT WENT WRONG with one line per fault (scene and line kept on the row), keeps ▶ Play anyway with the line count AND a NOT READY label, and keeps the 🔁 Rebuild path',
      /WHAT WENT WRONG/.test(pt) && lineRows.length === (N.tr.whyNotReady || []).length && lineRows.some(r => r.props['data-listening-why-line'] === N.low.i) && /Play anyway \( ?\d+ ?lines\)/.test(pt.replace(/\s+/g, ' ')) && /It plays with a NOT READY label/.test(pt) && /Rebuild/.test(pt) && /LISTENING TRACK NEEDS REPAIR/.test(pt), { pt: pt.slice(0, 400) })
    sw('lnExplainSetEnabled', false)
    const pt2 = textOf(mkPanel(N.tr).toJSON())
    sw('lnExplainSetEnabled', true)
    T('G5', 'with the switch off the screen is as it was (no list, no label)', !/WHAT WENT WRONG/.test(pt2) && !/NOT READY label/.test(pt2) && /Play anyway/.test(pt2))
    // opening a saved NOT_READY track goes to the player with a clear banner; a READY track has none
    const saved = { ...N.tr, playable: true, needsRepair: true, id: N.tr.id }
    let P1, P2
    await TR.act(async () => { P1 = TR.create(React.createElement(c.ListeningGenerator, { lang: 'th', vocab, apiKey: 'AIzaSyTEST-harness-key-000000', model: 'm', gcpTtsKey: '', track: saved, autoPlay: true, onSave() {}, onBack() {} })); await flush() })
    const banner = P1.root.findAll(x => x.props && x.props['data-listening-notready-banner'] && typeof x.type === 'string')
    const readyTrack = { ...base0(), ready: true }
    function base0() { return { ...N.tr, status: 'READY', ready: true, playable: true, whyNotReady: [], failedChecks: [] } }
    await TR.act(async () => { P2 = TR.create(React.createElement(c.ListeningGenerator, { lang: 'th', vocab, apiKey: 'AIzaSyTEST-harness-key-000000', model: 'm', gcpTtsKey: '', track: readyTrack, autoPlay: true, onSave() {}, onBack() {} })); await flush() })
    T('G6', 'a saved NOT_READY track opens straight into the player with a banner "NOT READY — this conversation has issues" and its first sentences; a READY track has no banner',
      P1.root.findAll(x => x.type === c.ConvoPlayer).length === 1 && banner.length === 1 && /NOT READY — this conversation has issues/.test(textOf(banner[0])) && (N.tr.whyNotReady || []).slice(0, 3).every(w => textOf(banner[0]).includes(w.text)) &&
      P2.root.findAll(x => x.type === c.ConvoPlayer).length === 1 && P2.root.findAll(x => x.props && x.props['data-listening-notready-banner']).length === 0, { banner: banner.length, text: textOf(banner[0] || null).slice(0, 200) })
    await TR.act(async () => { P1.unmount(); P2.unmount() })
    // the screen that offers the repair names what went wrong and can play the conversation as it is (the old text said "not playable yet")
    c.localStorage.setItem('tt-listening-attempts-th', JSON.stringify([{ attemptId: 'lattempt-x', createdAt: '2099-01-01T00:00:00.000Z', language: 'th', trackType: 'listening', selectedTargetIds: N.tr.selectedTargetIds, state: 'NOT_READY', coverage: N.tr.coverage, failedChecks: N.tr.failedChecks, whyNotReady: N.tr.whyNotReady, lines: N.tr.listening.lines, qualityNotes: [] }]))
    let O
    await TR.act(async () => { O = TR.create(React.createElement(c.ListeningGenerator, { lang: 'th', vocab, apiKey: 'AIzaSyTEST-harness-key-000000', model: 'm', gcpTtsKey: '', tracks: [], onSave() {}, onBack() {} })); await flush(60) })
    const offer = O.root.findAll(x => x.props && x.props['data-listening-repair-offer'] && typeof x.type === 'string'), ot = textOf(offer[0] || null)
    const playBtn = O.root.findAll(x => x.props && x.props['data-listening-latest-play'] && x.type === 'button')[0]
    T('G7', 'the repair offer says it can still be played (marked NOT READY), lists what went wrong, and offers ▶ Play it as it is next to 🔁 Rebuild; playing it shows the banner',
      offer.length === 1 && /NOT READY — it can still be played/.test(ot) && !/not playable yet/.test(ot) && (N.tr.whyNotReady || []).slice(0, 2).every(w => ot.includes(w.text)) && !!playBtn && /Play it as it is \(NOT READY, \d+ lines\)/.test(textOf(playBtn.children).replace(/\s+/g, ' ')) && /Rebuild/.test(ot), { ot: ot.slice(0, 400) })
    if (playBtn) await TR.act(async () => { playBtn.props.onClick(); await flush(10) })
    T('G8', '▶ Play it as it is opens the player with the NOT READY banner', O.root.findAll(x => x.type === c.ConvoPlayer).length === 1 && O.root.findAll(x => x.props && x.props['data-listening-notready-banner']).length === 1)
    await TR.act(async () => { O.unmount() })
    c.localStorage.removeItem('tt-listening-attempts-th')
  })

  // ══ H — THE TRACK IS SAVED THE MOMENT IT IS FINISHED ══
  await sect('H', async () => {
    const N = notReady
    const mount = async (opt, props) => {
      const events = [], saved = []
      const orig = c.saveListeningAttempt
      c.saveListeningAttempt = async (...a) => { events.push('attempt:' + a[1].state); return orig(...a) }
      c.ev('LN_STORY_WORD_CAP').maxWords = 25
      scripted(c, vocab, opt)
      let R
      await TR.act(async () => { R = TR.create(React.createElement(c.ListeningGenerator, { lang: 'th', vocab, apiKey: 'AIzaSyTEST-harness-key-000000', model: c.ev('GEMINI_DEFAULT_MODEL'), gcpTtsKey: '', onSave: async t => { events.push('track:' + t.status); saved.push(t) }, onBack() {}, ...(props || {}) })); await flush(5) })
      const done = () => events.some(e => /^attempt:(READY|NOT_READY)$/.test(e))
      for (let i = 0; i < 300 && !done(); i++) await TR.act(async () => { await flush(10) })
      await TR.act(async () => { await flush(10) })
      c.saveListeningAttempt = orig
      return { R, events, saved }
    }
    c.localStorage.clear()
    const H1 = await mount({ variant: 2, plan: 'beats', cohScript: s => s !== 3 })
    T('H1', 'a NOT_READY conversation is saved as a track at once — playable, still NOT_READY — and BEFORE its History row; saved once (Play anyway would not save it again)',
      H1.saved.length === 1 && H1.saved[0].playable === true && H1.saved[0].ready === false && H1.saved[0].status === 'NOT_READY' && H1.saved[0].needsRepair === true && (H1.saved[0].whyNotReady || []).length > 0 && H1.events.slice(1).join() === 'track:NOT_READY,attempt:NOT_READY', H1.events)
    const att1 = JSON.parse(c.localStorage.getItem('tt-listening-attempts-th') || '[]')[0] || {}
    T('H2', 'the History row names that track and keeps the explanation and the conversation (so it can be played from History too)', att1.trackId === (H1.saved[0] || {}).id && (att1.whyNotReady || []).length > 0 && (att1.lines || []).length > 40 && /PLAYING WITH ISSUES/.test(att1.coverageLabel || ''), { id: att1.trackId, label: att1.coverageLabel })
    c.localStorage.clear()
    const H3 = await mount({ variant: 2, plan: 'beats' })
    T('H3', 'a READY track is saved before its History row as well', H3.saved.length === 1 && H3.saved[0].ready === true && H3.events.slice(1).join() === 'track:READY,attempt:READY', H3.events)
    sw('lnSaveEarlySetEnabled', false)
    c.localStorage.clear()
    const H4 = await mount({ variant: 2, plan: 'beats', cohScript: s => s !== 3 })
    c.localStorage.clear()
    const H4b = await mount({ variant: 2, plan: 'beats' })
    sw('lnSaveEarlySetEnabled', true)
    T('H4', 'with the switch off it is as before: a NOT_READY conversation is not saved as a track until ▶ Play anyway, and a READY track is saved after its History row',
      H4.saved.length === 0 && H4.events.slice(1).join() === 'attempt:NOT_READY' && H4b.saved.length === 1 && H4b.events.slice(1).join() === 'attempt:READY,track:READY', { h4: H4.events, h4b: H4b.events })
    // leaving the screen while the build is still running: what is finished afterwards is still saved
    c.localStorage.clear()
    const events = [], saved = []
    scripted(c, vocab, { variant: 2, plan: 'beats', cohScript: s => s !== 3 })
    let L
    await TR.act(async () => { L = TR.create(React.createElement(c.ListeningGenerator, { lang: 'th', vocab, apiKey: 'AIzaSyTEST-harness-key-000000', model: c.ev('GEMINI_DEFAULT_MODEL'), gcpTtsKey: '', onSave: async t => { events.push('track:' + t.status); saved.push(t) }, onBack() {} })); await flush(3) })
    await TR.act(async () => { L.unmount() })
    for (let i = 0; i < 300 && !saved.length; i++) await flush(10)
    T('H5', 'a build the learner leaves (the screen is closed while it runs) is not lost when it finishes: the track is saved all the same (the transport here cannot be cancelled; in the app a left screen cancels the run — a half-built track is never saved)', saved.length === 1 && saved[0].status === 'NOT_READY' && saved[0].playable === true, events)
    // a rebuild replaces the NOT_READY track it came from instead of piling up a second copy
    const tw = isFn('listeningTracksWith') ? c.ev('listeningTracksWith') : null
    const A1 = { trackType: 'listening', id: 'a', ready: true, attemptId: 'att-a' }, B1 = { trackType: 'listening', id: 'b', ready: false, playable: true, attemptId: 'att-b' }, C1 = { trackType: 'listening', id: 'c', ready: false, playable: true, attemptId: 'att-c' }
    const D1t = { trackType: 'listening', id: 'd', ready: true, attemptId: 'att-d', rebuildOf: 'att-b' }
    T('H6', 'a rebuild replaces the NOT_READY track of the attempt it rebuilds (and only that one); a READY track is never replaced; the three dashboards save through the same rule',
      !!tw && tw([A1, B1, C1], D1t).map(t => t.id).join() === 'a,c,d' && tw([A1, B1], { ...D1t, rebuildOf: 'att-a' }).map(t => t.id).join() === 'a,b,d' && tw([A1], { ...D1t, rebuildOf: null }).map(t => t.id).join() === 'a,d' && (fs.readFileSync(__dirname + '/tt.jsx', 'utf8').match(/Tracks(Ja|Zh)?\(listeningTracksWith\(tracks, t\)\)/g) || []).length === 3)
    // the screen that offers the repair finds a saved NOT_READY track itself (it is the newest playable track)
    const rc = isFn('listeningRepairCandidate') ? c.ev('listeningRepairCandidate') : () => ({})
    const nrTrack = { ...N.tr, playable: true, needsRepair: true }
    const cand = rc([], [nrTrack]), cand2 = rc([], [{ ...N.tr, status: 'READY', ready: true, playable: true }])
    sw('lnSaveEarlySetEnabled', false)
    const cand3 = rc([], [nrTrack])
    sw('lnSaveEarlySetEnabled', true)
    T('H7', 'the repair candidate is the saved NOT_READY track when it is the newest (so the Listening screen offers Rebuild and ▶ Play instead of silently building another); a READY newest track is not a candidate; switched off, as before',
      !!cand.failed && cand.failed.state === 'NOT_READY' && (cand.failed.lines || []).length > 40 && (cand.failed.whyNotReady || []).length > 0 && cand.latest === nrTrack && !cand2.failed && !cand3.failed, { failed: !!cand.failed, ready: !!cand2.failed, off: !!cand3.failed })
    T('H8', 'Recent Tracks says so: a saved NOT_READY track\'s summary starts with "NOT READY — has issues" (a READY track\'s does not)', /^⚠ NOT READY — has issues · \d+ lines · TARGET COVERAGE/.test(c.listeningTrackSummary(nrTrack)) && !/NOT READY/.test(c.listeningTrackSummary({ ...N.tr, status: 'READY', ready: true, playable: true })))
    c.localStorage.clear()
  })


  // ══ Z — THE GATES, THE BUDGET, THE SWITCHES ══
  await sect('Z', async () => {
    const tm = isFn('lnStoryTurnMax') ? c.ev('lnStoryTurnMax') : () => null
    const S7 = await run(c, vocab, { variant: 6, plan: 'beats', groupK: 7 })
    const S5 = await run(c, vocab, { variant: 6, plan: 'beats' })
    const gs = tr => (tr.listening || {}).gates || {}
    T('Z1', 'the turn budget grows with the number of scenes (75 for five, 105 for seven; never below 75) and is shown that way; five scenes keep /75; a longer story is not cut and not failed for its length',
      tm(5) === 75 && tm(4) === 75 && tm(7) === 105 && tm(8) === 120 && /\/105$/.test(String(gs(S7.tr).TURN_COUNT)) && /\/75$/.test(String(gs(S5.tr).TURN_COUNT)) && gs(S7.tr).TURN_BUDGET === true && S7.tr.status === 'READY' && S7.tr.coverage.covered === 25 && (S7.tr.listening.scenes || []).length === 7, { c7: gs(S7.tr).TURN_COUNT, c5: gs(S5.tr).TURN_COUNT, status: S7.tr.status })
    const G = gs(S5.tr)
    T('Z2', 'every existing gate still holds with all of this on (closed vocabulary, 25/25 coverage, at most 2 words a line, both speakers, no duplicates, pronunciation, length, line quality, naturalness, coherence, one conversation)',
      S5.tr.status === 'READY' && S5.tr.coverage.covered === 25 && S5.tr.coverage.required === 25 && G.CLOSED_VOCAB === true && G.COVERAGE_PASS === true && G.MAX3_PASS === true && G.BOTH_SPEAKERS === true && G.NO_DUPLICATES === true && G.PRONUNCIATION === true && G.LENGTH_PASS === true && G.LINE_QUALITY === true && G.NATURALNESS === true && G.WHOLE_CONVERSATION_COHERENCE === 'PASS' && G.ONE_CONVERSATION === 'PASS' && G.MAX_TARGETS_PER_TURN <= 3, G)
    const sws = ['LN_BEATS', 'LN_LINKED', 'LN_FACT_CHECK', 'LN_STABLE_JUDGE', 'LN_USAGE_EXAMPLES', 'LN_SPEED', 'LN_EXPLAIN', 'LN_SAVE_EARLY'].map(k => c.ev(k).on)
    T('Z3', 'eight switches (beats, linking, fact check, stable judging, reviewed uses, speed, explanation, save early) are ON by default and the scenes-at-the-same-time switch is OFF; each has a setter', sws.every(Boolean) && c.ev('LN_PARALLEL_SCENES').on === false &&
      ['lnBeatsSetEnabled', 'lnLinkedSetEnabled', 'lnFactCheckSetEnabled', 'lnStableJudgeSetEnabled', 'lnUsageExamplesSetEnabled', 'lnSpeedSetEnabled', 'lnParallelScenesSetEnabled', 'lnExplainSetEnabled', 'lnSaveEarlySetEnabled', 'lnSecondRoundSet'].every(isFn), sws)
    // everything off: the earlier flow — the editor reads after the scenes are written, the checks one after the other, no beat, no move, no fact call — and the track is still READY with every gate
    sw('lnSecondRoundSet', false)
    const OFF = await run(c, vocab, { variant: 2, plan: 'beats' })
    sw('lnSecondRoundSet', true)
    sw('lnParallelScenesSetEnabled', false)
    const gO = gs(OFF.tr), wpO = writePrompts(OFF)
    T('Z4', 'with every switch of this round off the story is made the earlier way — no beat, no opening move, no fact call, no reviewed uses, the editor reads after the scenes (not in a wave) — and still READY with 25/25 and every gate',
      OFF.tr.status === 'READY' && OFF.tr.coverage.covered === 25 && gO.CLOSED_VOCAB === true && OFF.st.factCalls === 0 && !OFF.logs.some(x => /one wave of reads/.test(x)) && wpO.every(x => !/THE BEAT OF THIS SCENE|HOW THIS SCENE OPENS|REVIEWED USES/.test(x.p)) && OFF.st.order.indexOf('O_listening_story_review') > OFF.st.order.lastIndexOf('O_listening_story_write'), { status: OFF.tr.status, failed: OFF.tr.failedChecks, why: OFF.tr.whyNotReady, logs: OFF.logs.filter(x => /QC round|edit round|COHERENCE AUDIT|ISSUE|LISTENING_COHERENCE/.test(x)).slice(0, 12) })
    T('Z5', 'whatever is switched, never more than three requests are in flight at once (the largest number seen in any run of this file, switches on or off)', GLOBAL_MAX_LIVE <= 3 && GLOBAL_MAX_LIVE >= 2, GLOBAL_MAX_LIVE)
  })

  if (process.env.PROBE) {
    const P = await run(c, vocab, { variant: 2, plan: 'beats', flow: ['leave', 'eat', 'arrive', 'shop', 'travel'], grades: [6, 7.5] })
    P.logs.forEach(l => console.log(l.slice(0, 700)))
    console.log(P.st.calls.length, 'calls · maxLive', P.st.maxLive, '·', JSON.stringify(P.st.calls.reduce((a, s) => (a[s] = (a[s] || 0) + 1, a), {})))
    console.log(P.tr.status, P.tr.failedChecks)
    process.exit(0)
  }
  out.forEach(l => console.log(l))
  console.log('\n18 Nov (second round) Thai Listening story: ' + (n - fails) + '/' + n + ' passed' + (fails ? ' — ' + fails + ' FAILED' : ''))
  process.exit(fails ? 1 : 0)
})().catch(e => { out.forEach(l => console.log(l)); console.error(e); process.exit(1) })
