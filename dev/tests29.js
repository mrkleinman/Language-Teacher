// v666 — TWO-TIER BELT COMPLEXITY (spec "v666 Belt Complexity Soft Range + Hard Safety Ceiling", §27–§33).
// preferred range = the normal generation target; hardMax = absolute safety ceiling. Only HARD_FAIL_TOO_COMPLEX is
// rejected; a natural 5–6 unit Mukyu line is valid and is NOT repaired. TH / JA / ZH through the real pipeline, the
// model simulated at the Gemini boundary (tests14 responder). The fixture learner is Mukyu (preferred 2–4, hardMax 6).
const fs = require('fs')
const { setup, mock, makeTrack } = require('./tests14')
const out = []; let fails = 0, n = 0
const T = (lang, id, name, pass, detail) => { n++; if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + lang.toUpperCase() + ' ' + id.padEnd(4) + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 900) : '')) }
const LANGS = process.argv[2] ? process.argv[2].split(',') : ['th', 'ja', 'zh']
const KEY = 'AIzaSyTEST-harness-key-000000'
const surfOf = (lang, w) => lang === 'th' ? w.thai : lang === 'ja' ? w.japanese : w.chinese
function learner(lang, belt) {
  const S = setup(lang)
  S.c.setLearnerStateOverride(belt ? { rank: belt, source: 'test' } : null)
  const ids = new Set(S.targets.map(t => t.id))
  S.vocab.forEach(w => { if (ids.has(w.id)) { w.dueDate = '2026-01-01'; w.difficulty = 'hard' } else { w.dueDate = '2099-01-01'; if (w.difficulty === 'hard') w.difficulty = 'medium' } })
  return S
}
async function run(S, lang, ln, opt = {}) {
  const st = mock(S, lang, { ln })
  const inner = S._mockFn; st.prompts = []; st.sceneTexts = []
  S.c.mockGeminiGenerate = async (k, m, msgs, max, o) => {
    const q = msgs[msgs.length - 1].content; st.prompts.push(q)
    let r = await inner(k, m, msgs, max, o)
    const sm = q.match(/^Write SCENE (LS\d+) /)
    if (sm && opt.inject) { const j = JSON.parse(r); opt.inject(sm[1], j); r = JSON.stringify(j) }
    if (opt.post) r = opt.post(q, r)
    return r
  }
  const logs = []
  const r = await S.c.buildStandaloneListeningTrack({ lang, vocab: S.vocab, apiKey: KEY, model: 'gemini-2.5-flash-lite', onLog: m => logs.push(m), attemptId: 'lattempt-v666' })
  return { ...r, st, logs, L: logs.join('\n'), lines: r.track.listening ? r.track.listening.lines.map(l => l.thai) : [] }
}
// a line of EXACTLY `units` canonical units: the given text (kept) + taught, non-target filler words
function grow(S, lang, cc, text, units) {
  const tgt = new Set(S.targets.map(t => surfOf(lang, t)))
  const fill = S.vocab.filter(w => S.c.isLearnerTaught(w) && surfOf(lang, w) && surfOf(lang, w).length >= 2 && !/[.…\s～~（(]/.test(surfOf(lang, w)) &&
    ![...tgt].some(t => t && (surfOf(lang, w).includes(t) || t.includes(surfOf(lang, w)))) &&
    !/^(ผม|ฉัน|คุณ|เขา|เรา|เธอ|ดิฉัน|พวกเรา|私|僕|あなた|彼|彼女|我|你|他|她|我们|你们|他们)$/.test(surfOf(lang, w)) && !/(ผม|ฉัน|คุณ|ครับ|ค่ะ|คะ)/.test(surfOf(lang, w)) &&
    /^(noun|n\b)/i.test(String(w.partOfSpeech || w.pos || 'noun')))
  const strip = x => lang === 'th' ? x.replace(/(ครับ|ค่ะ|คะ)$/, '') : x.replace(/[。？！]$/, '')
  const tail = lang === 'th' ? ((text.match(/(ครับ|ค่ะ|คะ)$/) || [])[0] || 'ครับ') : '。'
  let body = strip(text), k = 0
  while (cc.countUnits(body + tail) < units && k < fill.length) { const nb = body + surfOf(lang, fill[k++]); if (cc.countUnits(nb + tail) <= units) body = nb }
  return body + tail
}

;(async () => {
  // ══ §1/§26 — the ONE table, two tiers; nothing assumes preferredMax = hardMax ══
  {
    const src = fs.readFileSync(process.env.TT_SRC || 'tt.jsx', 'utf8')
    const rows = [...src.matchAll(/'([^']+)':\s*Object\.freeze\(\{ preferredMin: (\d+), preferredMax: (\d+),\s*hardMax: (\d+) \}\)/g)].map(m => [m[1], +m[2], +m[3], +m[4]])
    const want = [['Mukyu', 2, 4, 6], ['10th Kyu', 3, 5, 7], ['9th Kyu', 4, 6, 8], ['8th Kyu', 5, 7, 9], ['7th Kyu', 5, 8, 10], ['6th Kyu', 6, 9, 11], ['5th Kyu', 6, 10, 12],
      ['4th Kyu', 7, 11, 13], ['3rd Kyu', 7, 12, 14], ['2nd Kyu', 8, 13, 15], ['1st Kyu', 8, 14, 16], ['Shodan', 4, 16, 20]]
    T('all', 'A1', '§1 BELT_COMPLEXITY is the v666 table (12 rows, preferred range + hard ceiling headroom, Shodan 4–16 / 20) — and the only one in tt.jsx',
      JSON.stringify(rows) === JSON.stringify(want) && (src.match(/preferredMin:\s*\d+,\s*preferredMax:\s*\d+,\s*hardMax:\s*\d+/g) || []).length === 12, rows)
    const eq = [/hardMax\s*[:=]\s*(cc|b|_cc)\.preferredMax/, /preferredMax\s*===\s*hardMax/, /hardCeil:\s*cc\.preferredMax/]
    T('all', 'A2', '§26 no code equates hardMax with preferredMax', !eq.some(re => re.test(src)), eq.filter(re => re.test(src)).map(String))
  }
  for (const lang of LANGS) {
    const S0 = learner(lang, null); const c0 = S0.c
    const cc = c0.getLearnerComplexityContract({ lang, vocab: S0.vocab })
    // ══ §4/§27–§30 — the four states at Mukyu ══
    {
      const base = lang === 'th' ? 'ผม' + surfOf(lang, S0.targets[0]) + 'ครับ' : surfOf(lang, S0.targets[0]) + '。'
      const l5 = grow(S0, lang, cc, base, 5), l6 = grow(S0, lang, cc, base, 6), l7 = grow(S0, lang, cc, base, 7)
      const short = lang === 'th' ? 'ใช่ครับ' : lang === 'ja' ? 'はい。' : '好。'
      const a5 = cc.analyse(l5), a6 = cc.analyse(l6), a7 = cc.analyse(l7), aS = cc.analyse(short)
      T(lang, 'B1', '§4/§27/§28/§29/§30 Mukyu (preferred 2–4, max 6): ' + aS.units + 'u SHORT_NATURAL_ALLOWED · 5u / 6u ABOVE_PREFERRED_BUT_ALLOWED (pass) · 7u HARD_FAIL_TOO_COMPLEX',
        cc.belt === 'Mukyu' && cc.preferredMin === 2 && cc.preferredMax === 4 && cc.hardMax === 6 &&
        a5.units === 5 && a5.state === 'ABOVE_PREFERRED_BUT_ALLOWED' && !a5.overHardMax && a6.units === 6 && a6.state === 'ABOVE_PREFERRED_BUT_ALLOWED' && !a6.overHardMax &&
        a7.units === 7 && a7.state === 'HARD_FAIL_TOO_COMPLEX' && a7.overHardMax && aS.state === 'SHORT_NATURAL_ALLOWED' && !aS.overHardMax,
        { l5: [l5, a5.units, a5.state], l6: [l6, a6.units], l7: [l7, a7.units, a7.state], short: [aS.units, aS.state] })
      // §6/§12 — the Main (Daily / Revision) acceptance contract: 5 and 6 pass, 7 fails
      const kw = S0.targets[0], tgt = surfOf(lang, kw)
      const judge = text => {
        if (lang === 'th') { const v = c0.validateThaiTargetPair({ speaker: 'A', thai: text, english: 'x', prompt: 'x', pairType: 'content', targetId: kw.id }, { thai: tgt, wordId: kw.id }, { vocab: S0.vocab }, 'generation'); return v.dimensions.LENGTH }
        const ad = c0.ev('TRACK_ADAPTERS')[lang]
        const v = c0.trackPairValidity({ [lang === 'ja' ? 'japanese' : 'chinese']: text, english: 'x', pairType: 'content', targetId: kw.id, isTargetPair: true, language: lang, wordId: kw.id, recallIndex: 1 },
          { wordId: kw.id, [lang === 'ja' ? 'japanese' : 'chinese']: tgt }, ad, { vocab: S0.vocab, vocabById: new Map(S0.vocab.map(w => [w.id, w])) })
        return v.reasons.some(r => /LEVEL_COMPLEXITY_FAIL/.test(r)) ? 'FAIL' : 'PASS'
      }
      T(lang, 'B2', '§6/§12 Daily / Revision acceptance: a 5- and a 6-unit Mukyu sentence PASS the LENGTH dimension; 7 units FAIL (LEVEL_COMPLEXITY_FAIL)',
        judge(l5) === 'PASS' && judge(l6) === 'PASS' && judge(l7) === 'FAIL', { l5: judge(l5), l6: judge(l6), l7: judge(l7) })
    }
    // ══ §16/§27/§28 Listening — a natural 5- and 6-unit line is NOT repaired; §29 a 7-unit line is ══
    {
      const S = learner(lang, null), cc1 = S.c.getLearnerComplexityContract({ lang, vocab: S.vocab })
      const want = { 1: 5, 3: 6 }, made = {}
      const r = await run(S, lang, {}, { inject: (sid, j) => { if (sid !== 'LS2') return; Object.entries(want).forEach(([k, u]) => { if (j.turns[k]) { j.turns[k].text = grow(S, lang, cc1, j.turns[k].text, u); made[k] = j.turns[k].text } }) } })
      const repairs = r.logs.filter(l => /LISTENING_ATOMIC_REPAIR issue=.*TOO_COMPLEX/.test(l)).length
      const kept = Object.values(made).every(t => r.lines.some(x => x === t || (x && x.replace(/\s/g, '') === t.replace(/\s/g, ''))))
      const ab = r.L.match(/ABOVE_PREFERRED_BUT_ALLOWED scene=LS2 ([^\n]*?) \(preferred 2–4, max 6\) — valid, no repair/)
      T(lang, 'C1', '§16/§27/§28 Listening: a natural 5-unit and a 6-unit turn are logged ABOVE_PREFERRED_BUT_ALLOWED and kept byte-for-byte — 0 TOO_COMPLEX repair calls · READY',
        !!ab && repairs === 0 && kept && r.track.status === 'READY' && r.track.listening.gates.LENGTH_PASS === true, { ab: ab && ab[1], repairs, kept, made, status: r.track.status, failed: r.track.failedChecks })
      const tel = r.track.telemetry
      T(lang, 'C2', '§13/§24 telemetry + LISTENING_COMPLEXITY_AUDIT: preferredRange 2–4 · hardMax 6 · withinPreferred / shortNatural / abovePreferredAllowed (≥2) / hardFail 0 · preferredRatio advisory',
        tel.COMPLEXITY_PREFERRED_RANGE === '2–4' && tel.COMPLEXITY_HARD_MAX === 6 && tel.COMPLEXITY_ABOVE_PREFERRED_ALLOWED >= 2 && tel.COMPLEXITY_HARD_FAIL === 0 &&
        typeof tel.COMPLEXITY_WITHIN_PREFERRED === 'number' && typeof tel.COMPLEXITY_SHORT_NATURAL === 'number' && /%$/.test(tel.COMPLEXITY_PREFERRED_RATIO) &&
        /LISTENING_COMPLEXITY_AUDIT belt=Mukyu preferred=2–4 hardMax=6 lines=\d+ withinPreferred=\d+ shortNatural=\d+ abovePreferredAllowed=\d+ overHardMax=0 maxObserved=\d+ · preferredRatio=\d+% \(advisory ≥80%/.test(r.L),
        { tel: Object.fromEntries(Object.entries(tel).filter(([k]) => /COMPLEXITY/.test(k))) })
      // §29 — 7 units at Mukyu: HARD_FAIL → atomic repair; unchanged it can never be READY
      const S2 = learner(lang, null), cc2 = S2.c.getLearnerComplexityContract({ lang, vocab: S2.vocab })
      const r2 = await run(S2, lang, { atomicNoop: true }, { inject: (sid, j) => { if (sid === 'LS2' && j.turns[1]) j.turns[1].text = grow(S2, lang, cc2, j.turns[1].text, 7) } })
      T(lang, 'C3', '§29 a 7-unit Mukyu turn → LEVEL_COMPLEXITY_FAIL (as generated) → atomic TOO_COMPLEX repair (repairRule "prefer 2–4 …, absolute maximum 6") → unchanged ⇒ never committed (v669 re-planned / UNCOMMITTED · v673 regenerated / replanned once / trimmed), no line over hardMax in the track',
        /LEVEL_COMPLEXITY_FAIL scene=LS2 line=L\d+ belt=Mukyu units=7 hardMax=6 \(as generated\)/.test(r2.L) && /LISTENING_ATOMIC_REPAIR issue=TOO_COMPLEX scene=LS2/.test(r2.L) &&
        // v669 §17: the unchanged 7-unit candidate is never committed — LS2 is re-planned / UNCOMMITTED; no line over hardMax
        r2.st.prompts.some(q => /ATOMIC REPAIR/.test(q) && /prefer 2–4 .*absolute maximum 6/.test(q)) && /SCENE_REPLAN LS2|SCENE_NOT_COMMITTED LS2|PHASE_REGENERATE LS2 |LISTENING_GLOBAL_REPLAN after LS2 |PHASE_TRIMMED LS2 |PHASE_NOT_COMMITTED LS2 /.test(r2.L) &&
        r2.track.lengthAudit.over.length === 0 && (r2.track.status === 'READY') === (r2.track.failedChecks.length === 0),
        { status: r2.track.status, failed: r2.track.failedChecks })
    }
    // ══ §11 — every generation prompt separates PREFERRED and ABSOLUTE MAX ══
    {
      const S = learner(lang, null)
      const r = await run(S, lang, {})
      const scenePrompt = r.st.prompts.find(q => /^Write SCENE LS1 /.test(q)) || ''
      const rule = S.c.getLearnerComplexityContract({ lang, vocab: S.vocab }).promptRule
      T(lang, 'D1', '§11 the scene prompt says "CURRENT LEVEL: Mukyu · PREFERRED LENGTH: 2–4 … · ABSOLUTE MAXIMUM: 6 …", prefer 2–4, 5–6 only when needed, never exceed 6',
        scenePrompt.includes(rule) && /CURRENT LEVEL: Mukyu · PREFERRED LENGTH: 2–4 .* · ABSOLUTE MAXIMUM: 6 /.test(rule) && /Use 5–6 only when/.test(rule) && /Never exceed 6/.test(rule) && !/up to 6/i.test(rule), rule)
    }
    // ══ §31/§17/§18 — a target that needs 5 units is placed with a 5-unit line, never marked unplaceable ══
    {
      const S = learner(lang, null), cc3 = S.c.getLearnerComplexityContract({ lang, vocab: S.vocab })
      const miss = S.targets[2], ms = surfOf(lang, miss)
      // the model's placement patch: the original exchange, with the missing word worked into its second line as a 5-unit sentence
      const post = (q, r) => {
        if (!/ATOMIC REPAIR of .* LISTENING lines/.test(q) || !q.includes('MUST NOW ALSO CONTAIN the lesson word ' + ms)) return r
        const blocks = q.split(/\n(?=\[i\d+\] )/).filter(b => /^\[i\d+\] /.test(b))
        return JSON.stringify({ repairs: blocks.map(b => {
          const issueId = b.match(/^\[(i\d+)\]/)[1]
          if (!b.includes('MUST NOW ALSO CONTAIN the lesson word ' + ms)) return { issueId, lines: [] }
          const scope = (b.match(/lines ((?:L\d+\+?)+)/) || [])[1]; const ids = scope ? scope.split('+') : [b.match(/line (L\d+) only/)[1]]
          const textOf = id => (b.match(new RegExp('>>> ' + id + ' [AB]: (.*?) \\(')) || [])[1] || ''
          const last = ids[ids.length - 1], orig = textOf(last)
          const withT = lang === 'th' ? orig.replace(/(ครับ|ค่ะ|คะ)?$/, m => ms + m) : orig.replace(/([。？！])?$/, m => ms + m)
          return { issueId, lines: ids.map(id => ({ lineId: id, text: id === last ? grow(S, lang, cc3, withT, Math.max(5, cc3.countUnits(withT))) : textOf(id), english: 'Mock.' })) }
        }) })
      }
      const r = await run(S, lang, { missing: [miss.id] }, { post })
      const placed = r.lines.find(t => t && t.includes(ms) && cc3.countUnits(t) >= 5)
      T(lang, 'E1', '§31 the missing target only fits naturally in a 5-unit line → that ABOVE_PREFERRED candidate is ACCEPTED (no LENGTH rejection, no LISTENING_TARGET_UNPLACED) → 30/30 READY',
        !!placed && cc3.countUnits(placed) <= 6 && /PATCH_ACCEPTED issue=i\d+ line=L\d+/.test(r.L) && !/LISTENING_TARGET_UNPLACED/.test(r.L) &&
        !r.logs.some(l => /PATCH_REJECTED .*reason=LENGTH: L\d+ [56] /.test(l)) && r.track.coverage.covered === 30 && r.track.status === 'READY',
        { placed, units: placed && cc3.countUnits(placed), status: r.track.status, failed: r.track.failedChecks })
    }
    // ══ §32/§33 — Daily, Revision and Listening resolve the same belt, preferred range and hardMax (only counting differs) ══
    {
      const S = learner(lang, null); const c = S.c
      const cc4 = c.getLearnerComplexityContract({ lang, vocab: S.vocab })
      const gen = lang === 'th' ? c.getSentenceLengthForVocab(S.vocab) : lang === 'ja' ? c.japaneseUnitRange(S.vocab) : { max: null, hardMax: c.mandarinComplexityCeiling(S.vocab) }
      const ml = []
      const t = makeTrack(S, lang); t.trackContext = undefined
      await c.finaliseMainTrack(t, c.ev('TRACK_ADAPTERS')[lang], { vocab: S.vocab, onLog: m => ml.push(String(m)) })
      const r = await run(learner(lang, null), lang, {})
      const lvl = x => (x.match(/LEVEL belt=(.+?) preferred=(\d+)–(\d+) hardMax=(\d+)/) || []).slice(1).join()
      T(lang, 'F1', '§32/§33 parity: the generator, Main (Daily / Revision) finalisation and Listening all resolve Mukyu · 2–4 · 6 from the one table',
        lvl(ml.join('\n')) === 'Mukyu,2,4,6' && lvl(r.L) === 'Mukyu,2,4,6' && (gen.hardMax === 6 || gen.hardCeil === 6) && cc4.hardMax === 6 &&
        /MAIN_COMPLEXITY_AUDIT belt=Mukyu preferred=2–4 hardMax=6 /.test(ml.join('\n')), { main: lvl(ml.join('\n')), listening: lvl(r.L), gen })
    }
  }
  console.log(out.join('\n'))
  console.log(fails ? fails + ' FAILED of ' + n : 'all passed (' + n + ' checks)')
  process.exit(fails ? 1 : 0)
})().catch(e => { console.log(out.join('\n')); console.log('CRASH', e.stack); process.exit(1) })
