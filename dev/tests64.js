// v712 — Thai Listening = a FRESH conversation written around the frozen revision words (owner, on v711: "Your Listening Track is
// supposed to be a newly generated conversation built around the vocabulary you're due to revise, not a prewritten conversation selected
// from a library"). This file replaces the v711 library tests (that path is removed from production; the reviewed library conversations
// are used here only as FIXTURE TEXT for the scripted model below).
//   S1–S2  targets first: the Revision selector's 30 ids are frozen BEFORE any story call, unchanged, and the plan is asked for exactly them
//   S3     end to end: READY, every frozen word heard, composer = story, the lines are what the model wrote, real write + QC calls logged
//   S4     repeated requests generate again (new calls, a different conversation) — nothing is replayed from storage
//   S5–S6  the deterministic gates and the paid QC drive targeted rewrites (an untaught word; a line the naturalness judge rejects)
//   S7     a frozen word the writer never uses is deferred and reported; its SRS state is untouched
//   S9     the planner may defer at most 4 words with no natural place (reported, still due in SRS); a 5th and 6th are placed anyway
//   S10    the story prompts take the line length from the learner's belt (not a fixed 7 words)
//   S11    an editor fix may add a missing reply (a span of 1 line replaced by 2), kept when the gates and turn-taking still pass
//   S12    the lesson-word usage check (one call per scene): a fix that drops the lesson word is refused, a valid fix is applied
//   S13    the app default plans the story around 25 of the 30 frozen words; the other 5 stay due (reported as over the cap)
//   S8     no stored-conversation path in production; the Daily exchange bank is unchanged
// Real app code; the model is a deterministic script (no provider calls).
//   node tests64.js            (current build: tt.compiled.js, or TT_FILE)
'use strict'
const fs = require('fs')
const { load } = require('./harness')
const out = []; let fails = 0, n = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + String(id).padEnd(4) + ' ' + name + (!pass && detail !== undefined ? '\n      ' + JSON.stringify(detail).slice(0, 700) : '')) }
const FILE = process.env.TT_FILE || 'tt.compiled.js'
const FIX = JSON.parse(fs.readFileSync(__dirname + '/sandbox/curriculum/thai-listening-library/library.json', 'utf8'))
const FIXLINES = FIX.flatMap(cv => cv.scenes.flatMap(s => s.lines.map(l => ({ sp: l[0], th: l[1], en: l[2], conv: cv.id }))))

// a learner whose due words all occur somewhere in the fixture text (so the scripted writer can place each one); ~1000 taught words
function learner(c) {
  const day = 86400000, now = Date.now(), text = FIXLINES.map(l => l.th), v0 = c.initVocab()
  // heard as a WORD (ตู้ inside ตู้เย็น does not count), so the scripted writer can always place it
  return v0.map((w, i) => {
    const inFix = !!w.thai && text.some(t => t.includes(w.thai) && c.thaiTargetPresent(t, w.thai, v0)), core = w.curriculumIndex > 0 && w.curriculumIndex <= 1000
    if (!inFix && !core) return w
    return { ...w, status: 'known', repCount: 3, interval: 4, okStreak: 1, lapses: 0, introducedAt: new Date(now - 60 * day).toISOString(),
      lastSeen: new Date(now - 20 * day).toISOString(), dueDate: new Date(now + (inFix ? -(5 + (i % 9)) : 30) * day).toISOString() }
  })
}

// the scripted model: plan = targets spread over 4 scenes (greetings first, goodbyes last); each scene = fixture lines holding its words,
// alternating speakers, padded with neutral fixture lines; QC passes unless a test says otherwise
function scriptedModel(c, vocab, opt = {}) {
  const la = c.ev('LISTENING_ADAPTERS').th, G = c.ev('LISTENING_GREETING_RE').th, B = c.ev('LISTENING_GOODBYE_RE').th, V = c.ev('GEMINI_SCHEMAS').verdicts
  const ctx = { vocab }
  const st = { calls: [], prompts: [], seq: opt.seq || [], used: new Set(), variant: opt.variant || 0 }
  const has = (l, s) => l.th.includes(s) && la.present(l.th, s, ctx)
  const rowsOf = p => [...p.matchAll(/^T(\d+) \| ([^|]+) \|/gm)].map(m => ({ id: Number(m[1]), s: m[2].trim() }))
  const filler = sp => FIXLINES.find((l, k) => (k + st.variant * 7) % 3 === 0 && l.sp === sp && !st.used.has(l.th) && !G.test(l.th) && !B.test(l.th) && la.text({ thai: l.th }).length > 6 && !opt.avoid?.some(a => l.th.includes(a)))
  const sceneTurns = (rows, si, nS) => {
    const lines = []
    rows.filter(r => !(opt.skip || []).includes(r.s)).forEach(r => {
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
  c.mockGeminiGenerate = async (k, m, msgs, max, o) => {
    const p = msgs.map(x => typeof x.content === 'string' ? x.content : '').join('\n'), stage = (o && o.stage) || (o && o.json === V ? 'verdicts' : '?')
    st.calls.push(stage); st.prompts.push({ stage, p }); st.seq.push('call:' + stage)
    if (stage === 'O_listening_story_plan') {
      const rows = rowsOf(p.slice(p.indexOf('TASK: plan'))), nS = 4, sc = [[], [], [], []]
      rows.forEach((r, i) => { const ls = FIXLINES.filter(l => has(l, r.s)); const gOnly = ls.length && ls.every(l => G.test(l.th)), bOnly = ls.length && ls.every(l => B.test(l.th))
        sc[gOnly ? 0 : bOnly ? nS - 1 : i % nS].push(r.id) })
      // opt.defer: the planner asks to defer these ids (taken out of the scenes and listed in "defer")
      const dset = new Set(opt.defer || [])
      return JSON.stringify({ title: 'Scripted story ' + st.variant, story: 'two friends plan a day out', scenes: sc.map((t, i) => ({ title: 'Scene ' + (i + 1), happens: 'part ' + (i + 1), targets: t.filter(id => !dset.has(id)) })), defer: [...dset] })
    }
    if (stage === 'O_listening_story_write' && /TASK: write the WHOLE conversation/.test(p)) {
      // v712: one call writes every scene — the prompt lists each scene's lesson words under "SCENE n —"
      const body = p.slice(p.lastIndexOf('STORY: "')), parts = body.split(/^SCENE \d+ — /m).slice(1)
      const scenes = parts.map((part, si) => { const turns = sceneTurns([...part.matchAll(/^\s*T(\d+) \| ([^|]+) \|/gm)].map(m => ({ id: Number(m[1]), s: m[2].trim() })), si, parts.length)
        if (opt.inject && si === 0) turns[1] = { speaker: turns[1].speaker, thai: opt.inject[turns[1].speaker], english: 'injected' }
        return { turns } })
      return JSON.stringify({ scenes })
    }
    if (stage === 'O_listening_story_beats') {
      // v712: the scene is scripted in English first — one line per lesson word of the scene, marked with its id
      const rows = rowsOf(p.slice(p.indexOf('TASK: write')))
      return JSON.stringify({ lines: rows.map((r, k) => ({ speaker: k % 2 ? 'B' : 'A', english: 'line about ' + r.s, ids: [r.id] })) })
    }
    if (stage === 'O_listening_story_write') {
      // the write call either writes the scene from its brief ("TASK: write scene n of m") or puts the English script into Thai
      // ("TASK: put scene n of m")
      const mm = p.match(/TASK: (?:write|put) scene (\d+) of (\d+)/), si = Number(mm[1]) - 1, nS = Number(mm[2])
      const turns = sceneTurns(rowsOf(p.slice(p.search(/TASK: (?:write|put) scene/))), si, nS)
      if (opt.inject && si === 0) turns[1] = { speaker: turns[1].speaker, thai: opt.inject[turns[1].speaker], english: 'injected' }
      return JSON.stringify({ turns })
    }
    if (stage === 'O_listening_story_repair' || stage === 'O_listening_story_qc_repair') {
      const body = p.slice(p.lastIndexOf('AS WRITTEN:') + 11).split('\n\n')[0].trim().split('\n').map(r => r.split(' | ')).filter(r => r.length >= 3)
      const turns = body.map(r => ({ speaker: r[0].replace(/^\d+\.\s*/, '').trim(), thai: r[1].trim(), english: r[2].trim() }))
      // v712 line repair: only the named lines come back, as {"fixes":[{line, thai, english}]}
      if (/Rewrite ONLY lines/.test(p)) { st.lineRepairs = (st.lineRepairs || 0) + 1
        return JSON.stringify({ fixes: turns.map((t, k) => ({ line: k + 1, ...t, ...(opt.fix && opt.fix(t) || {}) })).filter((t, k) => opt.fix && opt.fix(turns[k])) }) }
      if (opt.fix) turns.forEach(t => { const f = opt.fix(t); if (f) Object.assign(t, f) })
      return JSON.stringify({ turns })
    }
    if (stage === 'O_listening_story_review') return JSON.stringify({ score: 7, faults: [] })
    if (stage === 'O_listening_story_english') { st.english = (st.english || 0) + 1; return JSON.stringify({ english: [...p.matchAll(/^\d+\. [AB]: (.+)$/gm)].map(m => 'EN of ' + m[1]) }) }
    if (stage === 'O_word_usage') {
      // v712: the shared per-word usage profiles (one batched call for the words not yet described; cached per word)
      const ws = [...p.matchAll(/^(\S+) = /gm)].map(m => m[1])
      st.usageCalls = (st.usageCalls || 0) + 1
      return JSON.stringify({ words: ws.map(w => ({ thai: w, use: 'everyday sense of ' + w + ' (usage-note)', situations: ['at home', 'at work', 'on the phone'] })) })
    }
    if (stage === 'O_listening_story_edit') { st.edits = (st.edits || 0) + 1
      // opt.addReply: in the first edit round, line 2 is kept and a reply by the other speaker is added after it (span 1 → 2 lines)
      if (opt.addReply && st.edits === 1) { const m = p.match(/^2\. ([AB]) \| ([^|]+) \| ([^|\n]*)/m)
        if (m) { const sp = m[1], ot = sp === 'A' ? 'B' : 'A'; st.added = ot === 'A' ? 'ได้เลยครับ' : 'ได้เลยค่ะ'
          return JSON.stringify({ score: 6, fixes: [{ from: 2, to: 2, problem: 'reply missing', turns: [{ speaker: sp, thai: m[2].trim(), english: m[3].trim() }, { speaker: ot, thai: st.added, english: 'Sure.' }] }] }) } }
      return JSON.stringify({ fixes: [] }) }
    if (stage === 'O_listening_story_line_fix') return JSON.stringify({ fixes: [] })
    if (stage === 'O_listening_word_check') { st.wordChecks = (st.wordChecks || 0) + 1
      // opt.wordCheck: in the first scene checked, one fix drops the line's lesson word (must be refused) and one rewrites a line with
      // the same words (kept); every other scene reports no wrong use
      if (opt.wordCheck && st.wordChecks === 1) {
        const lw = [...p.matchAll(/^LESSON WORDS in this scene: (.+)$/gm)].map(m => m[1])[0] || ''
        const words = [...lw.matchAll(/([^\s,(]+) \(/g)].map(m => m[1])
        const ls = [...p.matchAll(/^(\d+)\. ([AB]) \| ([^|]+) \| /gm)].map(m => ({ n: Number(m[1]), sp: m[2], th: m[3].trim() }))
        const withW = ls.filter(l => words.some(w => l.th.includes(w)))
        if (withW.length >= 2) { const w0 = words.find(w => withW[0].th.includes(w)); st.wcDrop = withW[0].n; st.wcKeep = withW[1].n
          return JSON.stringify({ fixes: [{ line: withW[0].n, thai: withW[0].th.replace(w0, ''), english: 'x', why: 'test: word dropped' }, { line: withW[1].n, thai: withW[1].th, english: 'kept', why: 'test: same words' }] }) }
      }
      return JSON.stringify({ fixes: [] }) }
    if (stage === 'verdicts') {
      const items = [...p.matchAll(/^\s*(\d+)[.)]\s/gm)].map(x => Number(x[1]))
      const nItems = Math.max(12, ...items)
      return JSON.stringify(Array.from({ length: nItems }, (_, i) => ({ i: i + 1, s: opt.reject && opt.reject(p, i + 1) ? 2 : 5, note: opt.reject && opt.reject(p, i + 1) ? 'stiff wording' : '' })))
    }
    if (stage === 'O_listening_coherence') return JSON.stringify({ scenes: [1, 2, 3, 4, 5].map(s => ({ scene: s, pass: true, breakAfterLine: null, reason: 'ok' })), overall: 5, reason: 'ok' })
    return '[]'
  }
  return st
}
async function run(c, vocab, opt = {}) {
  // v713: the app plans the story around 25 of the 30 frozen words (owner's decision). These checks were written for the uncapped
  // composer, so they run with the cap off (0) unless a test asks for one; S13 checks the 25-word default itself.
  c.ev('LN_STORY_WORD_CAP').maxWords = opt.cap != null ? opt.cap : 0
  const seq = [], logs = []
  const st = scriptedModel(c, vocab, { ...opt, seq })
  const snap = c.selectRevisionTargets('th', vocab)
  const r = await c.generateCohesiveListeningTrack({ lang: 'th', vocab, apiKey: 'AIzaSyTEST-harness-key-000000', model: c.ev('GEMINI_DEFAULT_MODEL'), attemptId: 'lattempt-t64-' + (opt.variant || 0), snapshot: snap,
    onLog: x => { logs.push(String(x)); seq.push('log:' + String(x).slice(0, 60)) }, onProgress: () => {} })
  return { r, tr: r.track, st, seq, logs, snap }
}

;(async () => {
  const c = load(FILE, { realBelt: true }); c.console.info = () => {}; c.console.warn = () => {}
  c.__bankForced = true
  const vocab = learner(c)
  c.thaiBankSetEnabled(true)
  const A = await run(c, vocab, { variant: 0 })
  const frozen = A.snap.targetIds.slice()
  {
    const firstCall = A.seq.findIndex(x => x.startsWith('call:O_listening_story')), sel = A.seq.findIndex(x => x.startsWith('log:🎧 LISTENING_SELECTED_TARGET_IDS'))
    const planP = (A.st.prompts.find(x => x.stage === 'O_listening_story_plan') || {}).p || ''
    // the per-track usage notes are written once and reach the English scene scripts (not the shared prefix: it made every call longer — S21)
    const beatP = (A.st.prompts.find(x => x.stage === 'O_listening_story_beats') || {}).p || ''
    const usageOnce = A.st.calls.filter(x => x === 'O_word_usage').length >= 1 && /LESSON WORDS ARE USED[\s\S]*\(usage-note\)/.test(beatP) && !/\(usage-note\)/.test(planP)
    const planIds = [...planP.slice(planP.indexOf('TASK: plan')).matchAll(/^T(\d+) \|/gm)].map(m => Number(m[1]))
    T('S1', 'the 30 revision targets are selected and frozen BEFORE the first story call, and the plan is asked for exactly those ids',
      // v712: the per-track usage notes (one call, after the freeze) reach the English scene scripts
      sel >= 0 && firstCall > sel && planIds.length === 30 && planIds.join() === frozen.join() && usageOnce, { sel, firstCall, planIds: planIds.length, usageOnce })
    T('S2', 'the frozen ids are the Revision selector\'s 30, unchanged (no substitution before the story; the track carries them)',
      A.tr.selectedTargetIds.join() === frozen.join() && frozen.length === 30, { track: A.tr.selectedTargetIds.length })
  }
  {
    // v712: scenes are written one by one (each request kept short), each with the whole plan and the earlier scenes as context
    const L = (A.tr.listening || {}).lines || [], gen = A.st.calls.filter(s => s === 'O_listening_story_write').length
    // v712: each scene is scripted in English first, then the write call puts that script into Thai (it carries the English lines)
    const wrote = A.st.prompts.filter(x => x.stage === 'O_listening_story_write' && /TASK: put scene \d+ of 4/.test(x.p) && /SCENE \(English\):/.test(x.p)).length
    const beats = A.st.calls.filter(s => s === 'O_listening_story_beats').length
    const tel = A.tr.telemetry || {}
    T('S3', 'end to end: READY with all 30 frozen words heard, composer = story, written by the model (plan + one call per scene), the whole-conversation edit and the paid QC ran (naturalness + coherence), real call counts on the track',
      A.tr.status === 'READY' && A.tr.coverage.covered === 30 && A.tr.listening.composer === 'story' && gen === 4 && wrote === 4 && beats === 4 &&
      A.st.calls.includes('O_listening_story_edit') && A.st.calls.includes('O_listening_story_review') /* v712: find-then-fix editor */ &&
      A.st.calls.filter(x => x === 'O_listening_story_english').length === 4 && L.every(l => /^EN of /.test(l.english || '')) /* English re-translated from the final Thai, per scene */ && A.st.calls.includes('verdicts') && A.st.calls.includes('O_listening_coherence') && tel.LISTENING_GENERATION_CALLS >= 2 && tel.LISTENING_QC_CALLS >= 1 && L.length >= 30,
      { status: A.tr.status, cov: A.tr.coverage, composer: A.tr.listening && A.tr.listening.composer, beats, wrote, calls: A.st.calls, tel, failed: A.tr.failedChecks })
  }
  {
    const B = await run(c, vocab, { variant: 1 })
    const la = (A.tr.listening.lines || []).map(l => l.thai).join('|'), lb = ((B.tr.listening || {}).lines || []).map(l => l.thai).join('|')
    T('S4', 'a second Listening request generates again — new plan and write calls, a different conversation, the same frozen targets (nothing replayed from storage)',
      // best-of-2 (v712): a run may write a second complete fresh story when the first is not rated well, so the counts are per candidate
      // (each candidate = one plan + one write per scene); before best-of-2 this asserted exactly 1 plan and 4 writes
      (np => np >= 1 && np <= 2 && B.st.calls.filter(s => s === 'O_listening_story_write').length === 4 * np)(B.st.calls.filter(s => s === 'O_listening_story_plan').length) && la !== lb && B.tr.selectedTargetIds.join() === frozen.join(),
      { bStatus: B.tr.status, same: la === lb })
  }
  {
    // a common word THIS learner has not been taught (the gate decides)
    const un = c.ev('LN_STORY_UNTAUGHT_PROBE').find(w => c.listeningUnexposedWords('th', { thai: 'ผมอยาก' + w + 'ครับ', speaker: 'A' }, c.snapshotLearnerInventory('th', vocab, [], 'listening').inventory.taught, [], vocab).length)
    const C = await run(c, vocab, { variant: 2, inject: { A: 'ผมอยาก' + un + 'ครับ', B: 'ฉันอยาก' + un + 'ค่ะ' }, fix: t => t.thai.includes(un) ? { thai: t.speaker === 'A' ? 'ผมอยากไปด้วยครับ' : 'ฉันอยากไปด้วยค่ะ', english: 'I want to go too.' } : null })
    const rep = C.st.prompts.find(x => x.stage === 'O_listening_story_repair')
    T('S5', 'a deterministic gate failure (a word this learner was not taught) sends that scene back with the named problem; the rewrite is checked again and the final track has no untaught word',
      !!un && !!rep && /CLOSED_VOCAB/.test(rep.p) && !(C.tr.listening.lines || []).some(l => l.thai.includes(un)) && C.tr.status === 'READY' && (C.tr.telemetry.LISTENING_REPAIR_CALLS || 0) >= 1,
      { repair: !!rep, status: C.tr.status, rc: C.tr.telemetry.LISTENING_REPAIR_CALLS, un, left: (C.tr.listening.lines || []).filter(l => l.thai.includes(un)).map(l => l.thai), rp: rep && rep.p.slice(rep.p.indexOf('PROBLEMS'), rep.p.indexOf('PROBLEMS') + 300) })
  }
  {
    let target = null
    const D = await run(c, vocab, { variant: 3, reject: (p, i) => { if (/\[\[QC-FIXED\]\]/.test(p)) return false; if (target == null && i === 3) { target = true; return true } return false },
      fix: null })
    // v712: a rejected line is rewritten on its own (O_listening_story_line_fix) — the prompt names the line and the judge's verdict
    const qr = D.st.prompts.find(x => x.stage === 'O_listening_story_line_fix')
    T('S6', 'a line the paid naturalness judge rejects is sent to a line rewrite naming the line and the judge\'s verdict (the QC is real, not a label)',
      !!qr && /- line \d+: naturalness 2\/5/.test(qr.p), { qc: !!qr, p: qr && qr.p.slice(qr.p.indexOf('flagged'), qr.p.indexOf('flagged') + 300) })
  }
  {
    const before = JSON.stringify(vocab.map(w => [w.id, w.dueDate, w.interval, w.status]))
    const word = c.selectRevisionTargets('th', vocab).targets[5]
    const E = await run(c, vocab, { variant: 4, skip: [String(word.thai).trim()] })
    const after = JSON.stringify(vocab.map(w => [w.id, w.dueDate, w.interval, w.status]))
    const repairAsked = E.st.prompts.some(x => x.stage === 'O_listening_story_repair' && x.p.includes('LESSON_WORD_MISSING') && x.p.includes(String(word.thai).trim()))
    T('S7', 'a frozen word the writer never uses is asked for in a rewrite, then deferred and reported (covered + deferred = 30, ids unchanged); SRS state is untouched',
      repairAsked && (E.tr.coverage.deferred || []).includes(word.id) && E.tr.coverage.covered + E.tr.coverage.deferred.length === 30 && E.tr.selectedTargetIds.join() === frozen.join() && before === after,
      { repairAsked, deferred: E.tr.coverage.deferred, covered: E.tr.coverage.covered, status: E.tr.status })
  }
  {
    const before = JSON.stringify(vocab.map(w => [w.id, w.dueDate, w.interval, w.status]))
    const ask = frozen.slice(10, 16)
    const F = await run(c, vocab, { variant: 5, defer: ask })
    const after = JSON.stringify(vocab.map(w => [w.id, w.dueDate, w.interval, w.status]))
    const d = F.tr.coverage.deferred || [], sal = ((F.tr.listening || {}).salvage || {}).deferred || []
    T('S9', 'the planner defers at most 4 frozen words it finds no natural place for (reported with that reason, still due in SRS); words beyond the cap are placed in the story anyway',
      ask.slice(0, 4).every(id => d.includes(id)) && ask.slice(4).every(id => !d.includes(id)) && d.length === 4 && F.tr.coverage.covered === 26 &&
      sal.filter(x => /no natural place/.test(x.reason)).length === 4 && F.tr.selectedTargetIds.join() === frozen.join() && before === after,
      { deferred: d, covered: F.tr.coverage.covered, reasons: sal.map(x => x.reason), status: F.tr.status })
  }
  {
    // the length in the prompt follows the belt contract the TOO_COMPLEX gate uses: this learner's run, plus two other belts
    const runP = (A.st.prompts.find(x => x.stage === 'O_listening_story_write') || {}).p || ''
    const lv = A.tr.level || {}
    const p7 = c.lnStoryPrefix({ text: x => x }, { complexity: { belt: '7th Kyu', preferredMin: 5, hardMax: 10 }, exposed: [] }, [], [])
    const pM = c.lnStoryPrefix({ text: x => x }, { complexity: { belt: 'Mukyu', preferredMin: 2, hardMax: 6 }, exposed: [] }, [], [])
    T('S10', 'the story prompts take the line length from the learner\'s belt (this run: ' + lv.belt + ' up to ' + lv.hardMax + ' words; 7th Kyu 5–10; Mukyu 2–6), not a fixed 7',
      !!lv.hardMax && runP.includes('–' + lv.hardMax + ' Thai words') && /Lines of 5–10 Thai words/.test(p7) && /Lines of 2–6 Thai words/.test(pM),
      { level: lv, p7: (p7.match(/Lines of [^ ]+ Thai words/) || [])[0], pM: (pM.match(/Lines of [^ ]+ Thai words/) || [])[0] })
  }
  {
    const G = await run(c, vocab, { variant: 6, addReply: true })
    const L = (G.tr.listening || {}).lines || []
    T('S11', 'an editor fix may add a missing reply (1 line → 2 lines), kept when every gate and the turn-taking still pass; the lesson words stay',
      !!G.st.added && L.some(l => l.thai === G.st.added) && G.tr.coverage.covered === 30,
      { added: G.st.added, found: L.some(l => l.thai === G.st.added), covered: G.tr.coverage.covered, status: G.tr.status })
  }
  {
    // v713 lesson-word usage check: one call per scene; a fix that loses the line's lesson word is refused, a fix that keeps it passes
    const H = await run(c, vocab, { variant: 7, wordCheck: true })
    const lg = H.logs.find(x => /lesson-word check/.test(x)) || ''
    T('S12', 'the lesson-word usage check runs once per scene; a line fix that drops the lesson word is refused, one that keeps every gate and word is applied; coverage stays 30/30',
      H.st.wordChecks >= 4 && /2 wrong use\(s\) named/.test(lg) && /1 line\(s\) fixed/.test(lg) && /lesson word lost/.test(lg) && H.tr.coverage.covered === 30,
      { checks: H.st.wordChecks, log: lg.slice(0, 220), covered: H.tr.coverage.covered })
  }
  {
    // v713 default: the story is planned around the first 25 frozen words; the other 5 are reported deferred (the cap reason), SRS untouched
    const before = JSON.stringify(vocab.map(w => [w.id, w.dueDate, w.interval, w.status]))
    const K = await run(c, vocab, { variant: 8, cap: 25 })
    const after = JSON.stringify(vocab.map(w => [w.id, w.dueDate, w.interval, w.status]))
    const planP = (K.st.prompts.find(x => x.stage === 'O_listening_story_plan') || {}).p || ''
    const asked = [...planP.matchAll(/^T(\d+) \|/gm)].map(m => Number(m[1]))
    const d = K.tr.coverage.deferred || [], sal = ((K.tr.listening || {}).salvage || {}).deferred || []
    T('S13', 'the app default plans the story around 25 of the 30 frozen words (the first 25, in the selector\'s order); the other 5 are reported deferred as over the cap and stay due; the frozen ids are unchanged',
      asked.length === 25 && asked.join() === frozen.slice(0, 25).join() && frozen.slice(25).every(id => d.includes(id)) && K.tr.coverage.covered === 25 &&
      sal.filter(x => /25-word cap/.test(x.reason)).length === 5 && K.tr.selectedTargetIds.join() === frozen.join() && before === after,
      { asked: asked.length, deferred: d.length, covered: K.tr.coverage.covered, reasons: sal.map(x => x.reason).slice(0, 2), status: K.tr.status })
    c.ev('LN_STORY_WORD_CAP').maxWords = 25
  }
  {
    const src = fs.readFileSync(__dirname + '/tt.jsx', 'utf8')
    T('S8', 'no stored-conversation path in production (no THAI_LISTENING_LIBRARY, no library pick, no bank-stitched Listening composer); the Daily exchange bank is unchanged',
      !/THAI_LISTENING_LIBRARY|thaiListeningLibraryPick|_lnComposeThaiLibrary|_lnComposeThaiBank/.test(src) && /await _lnComposeThaiStoryBest\(_env\)/.test(src) /* best-of-2 wrapper around _lnComposeThaiStory (v712) */ &&
      Object.keys(c.ev('THAI_EXCHANGE_BANK')).length > 1000 && typeof c.thaiBankLineOf === 'function')
  }

  out.forEach(l => console.log(l))
  console.log('\nv712 Thai Listening fresh story: ' + (n - fails) + '/' + n + ' passed' + (fails ? ' — ' + fails + ' FAILED' : ''))
  process.exit(fails ? 1 : 0)
})().catch(e => { out.forEach(l => console.log(l)); console.error(e); process.exit(1) })
