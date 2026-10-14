// v693 — Thai Daily regression set built from the EXACT failures of the live v691 Thai Daily track (13 Oct 2026):
// 89/90 (ง่าย 2/3), cue / speaker errors, the ที่ไหน classifier false positive and the unnatural lines that passed QC.
// The app's real functions run in the node harness; the model is simulated only at the transport boundary.
const fs = require('fs'), path = require('path')
const { setup, makeTrack, mock } = require('./tests14')
const out = []; let fails = 0, n = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + id.padEnd(5) + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 900) : '')) }
const ai = process.argv.indexOf('--app'); if (ai > 0) process.env.TT_FILE = path.resolve(process.argv[ai + 1])
const KEY = 'k', MODEL = 'gemini-2.5-flash-lite'
const SCENE = { characterA: 'Somchai, a man waiting at the songthaew stop', characterB: 'Nida, a woman friend who arrives just in time' }

// a judged Thai track: every TARGET PAIR carries cue + naturalness verdicts keyed to its CURRENT cue (as after the final audit)
async function judgedTrack(S, mutate) {
  const c = S.c
  let tr = makeTrack(S, 'th', { tag: '-v693' })
  tr.scene = { ...SCENE }
  if (mutate) tr = mutate(tr) || tr
  const sem = await c.finalPairSemanticAudit(tr.pairs, KEY, MODEL, null, { label: 'test-main', failClosed: false })
  return { ...tr, pairs: sem.pairs }
}
// the base mock + a scripted cue judge (cueBad: prompts the judge scores 2/5 with Thai/English disagreeing)
function mockTh(S, opt = {}) {
  const st = mock(S, 'th', {}), inner = S._mockFn
  st.cueJudged = []
  S.c.mockGeminiGenerate = async (k, m, msgs, max, o) => {
    const q = msgs[msgs.length - 1].content
    if (/Rate how well each Thai sentence matches its prompt/.test(q)) {
      const rows = [...q.matchAll(/^(\d+)\. Prompt: "([^"]*)"/gm)]
      rows.forEach(r => st.cueJudged.push(r[2]))
      return JSON.stringify(rows.map(r => { const bad = (opt.cueBad || []).some(x => r[2].includes(x)); return { i: +r[1], s: bad ? 2 : 5, thaiEnglishMatch: !bad, note: bad ? 'cue names the wrong person' : 'ok' } }))
    }
    return inner(k, m, msgs, max, o)
  }
  return st
}
const fin = async (S, tr) => { const log = []; const t = await S.c.finaliseMainTrack(tr, S.c.ev('TRACK_ADAPTERS').th, { vocab: S.vocab, apiKey: KEY, model: MODEL, qcRan: true, onLog: m => log.push(m) }); return { t, log } }
const met = t => t.integrity.quota.rows.reduce((n, r) => n + Math.min(3, r.valid), 0)
const thirdOf = (tr, id) => tr.pairs.filter(p => p && p.targetId === id && p.pairType === 'content')[2]

;(async () => {
  // ══ A — 89/90: a cue rewritten AFTER its judgement silently un-counted a valid pair ═════════════════════════════
  // v696: A1–A6 test the v693 addressee fix + re-judgement mechanism itself, so they run with the v696 cue clarity pass OFF (with it on,
  // these narrated cues become "Say …" before they are ever judged — A7 below); the mechanism still applies to names a clarified cue keeps
  {
    const S = setup('th'); mockTh(S); S.c.setCueClarity(false)
    const c = S.c, tid = S.targets[0].id
    // the live recovered ง่าย line: Somchai's (A) line, cued with Somchai as the SUBJECT
    const tr = await judgedTrack(S, t => { const p = thirdOf(t, tid); p.speaker = 'A'; p.prompt = 'Somchai says, with a smile, that it is not easy at all.' })
    const { t, log } = await fin(S, tr)
    const p3 = thirdOf(t, tid)
    T('A1', 'the speaker named as the cue\'s SUBJECT is kept ("Somchai says …" on Somchai\'s line — live v691 rewrote it to "Nida says …")',
      p3.prompt === 'Somchai says, with a smile, that it is not easy at all.', p3.prompt)
    T('A2', 'exact 90/90: the track keeps 3/3 for every target and reaches READY on the quota invariants', met(t) === 90 && t.integrity.quota.rows.length === 30 && t.integrity.quota.rows.every(r => r.valid === 3),
      t.integrity.quota.rows.filter(r => r.valid !== 3).map(r => [r.target, r.valid, (r.invalid || []).map(x => x && x.reasons)]))
    T('A3', 'no cue was rewritten after judgement, so nothing needed re-judging', !log.some(l => /CUE_REVALIDATED/.test(l)), log.filter(l => /CUE_/.test(l)))
  }
  {
    // a GENUINE addressee fix after judgement ("Tell Somchai …" on Somchai's line) — the changed cue is judged again, the pair still counts
    const S = setup('th'); const st = mockTh(S); S.c.setCueClarity(false)
    const tid = S.targets[1].id
    const tr = await judgedTrack(S, t => { const p = thirdOf(t, tid); p.speaker = 'A'; p.prompt = 'Tell Somchai that it is not easy at all.' })
    st.cueJudged.length = 0
    const { t, log } = await fin(S, tr)
    const p3 = thirdOf(t, tid)
    T('A4', 'a cue that names the speaker as the listener is fixed ("Tell Nida …") and judged AGAIN before the quota is counted (v691 left it unjudged → 2/3)',
      p3.prompt === 'Tell Nida that it is not easy at all.' && st.cueJudged.includes('Tell Nida that it is not easy at all.') && log.some(l => /CUE_REVALIDATED 1 pair/.test(l)), { prompt: p3.prompt, judged: st.cueJudged.slice(0, 5) })
    T('A5', 'exact 90/90 after the revalidation', met(t) === 90, met(t))
  }
  {
    // the corrected cue FAILS its new judgement: the pair is removed BEFORE the quota and quota recovery replaces it (never 89/90)
    const S = setup('th'); const st = mockTh(S, { cueBad: ['Tell Nida that it is not easy at all.'] }); S.c.setCueClarity(false)
    const tid = S.targets[2].id
    const tr = await judgedTrack(S, t => { const p = thirdOf(t, tid); p.speaker = 'A'; p.prompt = 'Tell Somchai that it is not easy at all.' })
    const { t, log } = await fin(S, tr)
    T('A6', 'a pair whose corrected cue fails its re-judgement is removed before counting and REPLACED by quota recovery: 90/90',
      met(t) === 90 && log.some(l => /CUE_REVALIDATED 1 pair.*1 failed/.test(l)) && st.rec[tid] >= 1, { q: met(t), rec: st.rec[tid], log: log.filter(l => /CUE_REVALID|QUOTA RECOVERY/.test(l)) })
  }
  {
    // v696 (cue clarity ON): the same narrated / mis-addressed cues are clarified BEFORE their first judgement — the saved cue is the
    // judged cue, no wrong addressee is left, and the track keeps 90/90
    const S = setup('th'); const st = mockTh(S)
    const t0 = S.targets[0].id, t1 = S.targets[1].id
    const tr = await judgedTrack(S, t => { const a = thirdOf(t, t0); a.speaker = 'A'; a.prompt = 'Somchai says, with a smile, that it is not easy at all.'; const b = thirdOf(t, t1); b.speaker = 'A'; b.prompt = 'Tell Somchai that it is not easy at all.' })
    const { t, log } = await fin(S, tr)
    T('A7', 'v696: "Somchai says, with a smile, that …" and "Tell Somchai that …" on Somchai\'s line become a "Say …" instruction before they are judged (no narration, no self-addressing, no manner aside — and because the scripted cue did not match its line, it is rebuilt from the line\'s own English), they are not re-judged needlessly, and the track keeps 90/90',
      [t0, t1].every(id => /^Say /.test(thirdOf(t, id).prompt) && !/Somchai|Nida|says|smile/.test(thirdOf(t, id).prompt) && st.cueJudged.includes(thirdOf(t, id).prompt)) && !log.some(l => /CUE_REVALIDATED/.test(l)) && met(t) === 90,
      { a: thirdOf(t, t0).prompt, b: thirdOf(t, t1).prompt, q: met(t) })
  }

  // ══ B — cue / speaker ═══════════════════════════════════════════════════════════════════════════════════════════
  {
    const S = setup('th'), c = S.c
    const tr = { scene: SCENE }
    const p = c.fixCueAddressees([
      { speaker: 'A', prompt: 'Somchai greets Nida and asks whether she has already arrived.' },
      { speaker: 'B', prompt: 'Nida greets Somchai back and says she got here just in time.' },
      { speaker: 'B', prompt: 'Somchai thanks Nida for waiting with him.' },
      { speaker: 'A', prompt: 'Nida says goodbye to Somchai and tells him to travel safely.' },
      { speaker: 'A', prompt: 'Tell Somchai that the bus is late.' },
      { speaker: 'B', prompt: 'Ask Somchai which songthaew goes to the market.' }], tr, null).pairs.map(x => x.prompt)
    T('B1', 'live v691 framing cues: no "Nida greets Nida" / "Somchai thanks Somchai" — the subject is the speaker; a cue written for the other speaker is swapped whole (names + pronouns)',
      p[0] === 'Somchai greets Nida and asks whether she has already arrived.' && p[1] === 'Nida greets Somchai back and says she got here just in time.' &&
      p[2] === 'Nida thanks Somchai for waiting with her.' && p[3] === 'Somchai says goodbye to Nida and tells her to travel safely.' &&
      p[4] === 'Tell Nida that the bus is late.' && p[5] === 'Ask Somchai which songthaew goes to the market.', p)
    const j = c.fixCueAddressees([{ speaker: 'A', prompt: 'As Daiki, tell Kenji you are hungry.' }, { speaker: 'B', prompt: 'As Daiki, tell Kenji you are hungry.' }],
      { scene: { characterA: 'Daiki, a male student', characterB: 'Kenji, a male friend' } }, null).pairs.map(x => x.prompt)
    T('B2', '"As Daiki, tell Kenji …" stays on Daiki\'s line and becomes "As Kenji, tell Daiki …" on Kenji\'s (never "As Daiki, tell Daiki")', j[0] === 'As Daiki, tell Kenji you are hungry.' && j[1] === 'As Kenji, tell Daiki you are hungry.', j)
  }

  // ══ C — the ที่ไหน classifier false positive (deterministic lexical rule) ════════════════════════════════════════
  {
    const S = setup('th'), c = S.c
    const ids = th => c.thaiLexicalSenseProblems({ thai: th, english: 'x' }).map(x => x.id)
    T('C1', 'ซื้อตั๋วที่ไหนคะ ("Where do I buy a ticket?") is not a classifier mismatch (live v691 rejected it: "ตั๋วที่ — ตั๋ว is counted with ใบ")', !ids('ซื้อตั๋วที่ไหนคะ').includes('CLASSIFIER_MISMATCH'), ids('ซื้อตั๋วที่ไหนคะ'))
    T('C2', 'relative ที่ (ร้านที่ถูกอยู่ไหนครับ) and ordinal ที่ (ตั๋วที่หนึ่งครับ) are not classifiers either', !ids('ร้านที่ถูกอยู่ไหนครับ').includes('CLASSIFIER_MISMATCH') && !ids('ตั๋วที่หนึ่งครับ').includes('CLASSIFIER_MISMATCH'))
    T('C3', 'genuine classifier errors are still rejected: ตั๋วชิ้นนี้ · เรือชิ้นนี้ · ตั๋วสองที่ (a number + ที่ IS a classifier)',
      ['ตั๋วชิ้นนี้แพงครับ', 'เรือชิ้นนี้สวยค่ะ', 'ตั๋วสองที่ครับ'].every(t => ids(t).includes('CLASSIFIER_MISMATCH')))
    T('C4', 'a false ที่ match earlier in the line no longer hides a real mismatch later in it', ids('ซื้อตั๋วที่ไหนคะ ตั๋วชิ้นนี้แพง').includes('CLASSIFIER_MISMATCH'))
  }

  // ══ D — unnatural Thai that passed QC: the deterministic causes ═══════════════════════════════════════════════════
  {
    const S = setup('th'), c = S.c
    T('D1', 'the spacing repair keeps the clause break after a reply word (live: "ใช่ หลังกินข้าวกลับบ้านครับ" → run-on ใช่หลังกิน…); token spacing is still collapsed',
      c.normaliseThaiSpacing('ใช่ หลังกินข้าวกลับบ้านครับ') === 'ใช่ หลังกินข้าวกลับบ้านครับ' && c.normaliseThaiSpacing('ผม ชอบ สี ดำ ครับ') === 'ผมชอบสีดำครับ' &&
      c.normaliseThaiSpacing('ใช่ แล้ว ครับ') === 'ใช่แล้วครับ' && c.normaliseThaiSpacing('ไม่ แพง ครับ') === 'ไม่แพงครับ')
    const ids = th => c.thaiLexicalSenseProblems({ thai: th, english: 'x' }).map(x => x.id)
    T('D2', 'ไปกับ + vehicle ("go WITH the songthaew") is rejected; ไปกับ + a person is fine', ids('ไปกับรถสองแถวนี้ไหมครับ').includes('COLLOCATION_VEHICLE') && !ids('ไปกับเพื่อนไหมครับ').length && !ids('นั่งรถสองแถวคันนี้ไปไหมครับ').length)
    const hasSC = typeof c.thaiSelfContradiction === 'function'
    const sc = (a, b, sa = 'A', sb = 'A') => hasSC ? c.thaiSelfContradiction({ thai: a, speaker: sa }, { thai: b, speaker: sb }) : ''
    T('D3', 'one speaker saying the fare is expensive and then not expensive is a STATE_CONTRADICTION (live ค่าโดยสาร group)', !!sc('ค่าโดยสารแพงนิดหน่อยครับ', 'ค่าโดยสารไม่แพงเลยครับ'))
    T('D4', 'not a contradiction: two speakers disagreeing · a question · two different things (ร้านนี้ไม่ไกล / ร้านนั้นไกลมาก) · different adjectives',
      hasSC && !sc('ค่าโดยสารแพงนิดหน่อยครับ', 'ค่าโดยสารไม่แพงเลยค่ะ', 'A', 'B') && !sc('ค่าโดยสารแพงไหมครับ', 'ค่าโดยสารไม่แพงเลยครับ') && !sc('ร้านนี้ไม่ไกลครับ', 'ร้านนั้นไกลมากครับ') && !sc('ตั๋วนี้ไม่แพงครับ', 'เช่ารถแพงมากครับ'))
  }

  // ══ F — QC "improvements": cue rebuilt instead of Thai rewritten · topic-only remarks · hard invariants on rewrites ═══
  {
    const S = setup('th'), c = S.c
    const tr = makeTrack(S, 'th', { tag: '-v693qc' }); tr.scene = { ...SCENE }
    const tP = S.targets[3], tTopic = S.targets[4], tLose = S.targets[5]
    const gp = id => tr.pairs.filter(p => p && p.targetId === id && p.pairType === 'content')
    const pmLine = gp(tP.id)[0], pmThai = pmLine.thai
    pmLine.prompt = pmLine.prompt + ' while they wait at the stop for the songthaew'
    const loseOrig = gp(tLose.id).map(p => p.thai)
    const asked = { improve: [] }
    const base = mock(S, 'th', {}), inner = S._mockFn
    c.mockGeminiGenerate = async (k, m, msgs, max, o) => {
      const q = msgs[msgs.length - 1].content
      if (/Rate how well each Thai sentence matches its prompt description\.\n\nScale/.test(q))
        return JSON.stringify([...q.matchAll(/^(\d+)\. Prompt: "([^"]*)"/gm)].map(r => ({ i: +r[1], s: /while they wait at the stop/.test(r[2]) ? 3 : 5, note: /while they wait/.test(r[2]) ? 'Prompt says waiting at the stop; sentence omits this' : '' })))
      if (/Evaluate this Thai language learning group/.test(q)) {
        const tw = (q.match(/Target word: "([^"]+)"/) || [])[1]
        if (tw === tTopic.thai) return JSON.stringify({ action: 'improve', reason: 'Each line uses the target naturally and fits its own cue, but the group is a topic jump that should be bridged to the surrounding context.' })
        if (tw === tLose.thai) return JSON.stringify({ action: 'improve', reason: 'The third line is padded and redundant.' })
        return JSON.stringify({ action: 'clean', reason: 'ok' })
      }
      if (/Fix this Thai learning group/.test(q)) {
        const tw = (q.match(/Target word: "([^"]+)"/) || [])[1]; asked.improve.push(tw)
        return JSON.stringify(gp(tLose.id).map((p, k) => ({ speaker: p.speaker, thai: k === 2 ? 'ใช่ครับ ไปด้วยกันไหมครับ' : p.thai, english: k === 2 ? 'Yes, shall we go together?' : p.english, prompt: p.prompt })))
      }
      return inner(k, m, msgs, max, o)
    }
    const logs = []
    const q = await c.runQualityCheckCore(tr, KEY, MODEL, { vocab: S.vocab, onLog: m => logs.push(m), deferMetadata: true })
    const after = id => q.pairs.filter(p => p && p.targetId === id && p.pairType === 'content')
    const pm = after(tP.id).find(p => p.thai === pmThai)
    T('F1', 'a cue that asks for more than the Thai says is fixed on the CUE side — the Thai is kept (live: ป้ายนี้ถูกครับ became ป้ายนี้ถูกที่รอครับ); v696 removes the extra background before the prompt judge, v693 rebuilt it after a 3/5',
      !!pm && !/while they wait/.test(pm.prompt) && logs.some(l => /THAI_CUE_REBUILT_FROM_TRANSLATION|CUE_CLARITY \(quality review/.test(l)) && !asked.improve.includes(tP.thai), { prompt: pm && pm.prompt, improve: asked.improve })
    T('F2', 'a remark that is ONLY a topic jump is not turned into a rewrite (live: ถอดได้เลยครับ จานนั้นขนาดใหญ่มาก)', !asked.improve.includes(tTopic.thai) && logs.some(l => /topic-change remark only/.test(l)), asked.improve)
    T('F3', 'a QC rewrite that loses the target is discarded and the original line kept (live: the จอด line became ใช่ครับ ไปด้วยกันไหมครับ, then the final audit dropped it)',
      asked.improve.includes(tLose.thai) && after(tLose.id).map(p => p.thai).join('|') === loseOrig.join('|') && logs.some(l => /QC improve discarded.*TARGET_MISSING/.test(l)), { now: after(tLose.id).map(p => p.thai), logs: logs.filter(l => /discarded/.test(l)) })
  }

  out.forEach(l => console.log(l))
  console.log('\n' + (n - fails) + '/' + n + ' passed' + (fails ? ' · ' + fails + ' FAILED' : ''))
  process.exit(fails ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
