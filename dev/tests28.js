// v665 — ONE LEARNER LEVEL (spec "v662 Universal Belt Complexity + Hard Taught-Vocab Gates", §37–§47).
// The canonical BELT_COMPLEXITY contract + the learner-authorised inventory, for Thai / Japanese / Mandarin and for
// Daily / Revision / Listening; the model is simulated at the Gemini boundary (tests14 responder), everything else is
// app code. Belts are set explicitly (setLearnerStateOverride) or resolved from the fixture learner (Mukyu).
const fs = require('fs')
const { setup, mock, makeTrack } = require('./tests14')
const out = []; let fails = 0, n = 0
const T = (lang, id, name, pass, detail) => { n++; if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + lang.toUpperCase() + ' ' + id.padEnd(4) + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 900) : '')) }
const LANGS = process.argv[2] ? process.argv[2].split(',') : ['th', 'ja', 'zh']
const KEY = 'AIzaSyTEST-harness-key-000000'
const F = { th: 'จักรวาล', ja: '宇宙', zh: '宇宙' }
const surfOf = (lang, w) => lang === 'th' ? w.thai : lang === 'ja' ? w.japanese : w.chinese
const addWord = (lang, text, w) => lang === 'th' ? text.replace(/(ครับ|ค่ะ|คะ)?$/, m => w + m) : text.replace(/([。？！])?$/, m => w + m)
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
  const la = S.c.listeningAdapterFor(lang)
  S.c.mockGeminiGenerate = async (k, m, msgs, max, o) => {
    const q = msgs[msgs.length - 1].content; st.prompts.push(q)
    let r = await inner(k, m, msgs, max, o)
    const sm = q.match(/^Write SCENE (LS\d+) /)
    if (sm) { const j = JSON.parse(r); if (opt.inject) opt.inject(sm[1], j); r = JSON.stringify(j)
      j.turns.forEach((t, i) => st.sceneTexts.push(la.text(la.makeLine({ text: t.text, english: t.english }, t.speaker || (i % 2 ? 'B' : 'A'))))) }
    return r
  }
  const logs = []
  const r = await S.c.buildStandaloneListeningTrack({ lang, vocab: S.vocab, apiKey: KEY, model: 'gemini-2.5-flash-lite', onLog: m => logs.push(m), attemptId: 'lattempt-v665' })
  const lines = r.track.listening ? r.track.listening.lines.map(l => l.thai) : []
  return { ...r, st, logs, L: logs.join('\n'), lines }
}
// one long line of KNOWN words: turn 0 + turn 2 of a scene (same speaker), folded into turn 0
// a dictionary word that was never introduced (the fixture banks are mostly studied, so one is reset explicitly)
const makeNew = (S, lang, skip) => { const used = new Set((skip || []).map(w => w.id)), c = S.c, la = c.listeningAdapterFor(lang)
  const cands = S.vocab.filter(x => !used.has(x.id) && !S.targets.some(t => t.id === x.id) && surfOf(lang, x) && surfOf(lang, x).length >= 2 && !/[.…\s]/.test(surfOf(lang, x)) &&
    !S.vocab.some(y => y !== x && surfOf(lang, y) && surfOf(lang, y).includes(surfOf(lang, x))))
  for (const w of cands) {
    const keep = { ...w }
    Object.assign(w, { status: 'new', introducedAt: null, lastSeen: null, okStreak: 0, repCount: 0, manualKnown: false, dueDate: null })
    // a real lexical word: once untaught, the closed-vocabulary checker must see it (grammar words like ที่นี่ are skipped)
    const line = la.makeLine({ text: lang === 'th' ? 'ผม' + surfOf(lang, w) + 'ครับ' : surfOf(lang, w) + '。', english: 'x' }, 'A')
    if (c.listeningUnexposedWords(lang, line, [], S.targets, S.vocab).length) return w
    Object.assign(w, keep)
  }
  return null }
const dbl = (lang, j) => { const t = j.turns[0]; if (!t) return null; const head = lang === 'th' ? t.text.replace(/(ครับ|ค่ะ|คะ)$/, '') : t.text.replace(/[。？！]$/, '，'); let k = 2; while (lang === 'ja' && (head.repeat(k) + t.text).length < 30 && k < 6) k++   // v669: the v669 scene plan can put a very short line first (それはここよ) — keep it over hardMax
  t.text = head.repeat(k) + t.text; t.english += (' ' + t.english).repeat(k); return t.text }   // ~3× one line: above hardMax 6, one target
const fold = (lang, j) => { if (!j.turns[2]) return null; j.turns[0].text = (lang === 'th' ? j.turns[0].text.replace(/(ครับ|ค่ะ|คะ)$/, '') : j.turns[0].text.replace(/[。？！]$/, '，')) + j.turns[2].text; j.turns[0].english += ' ' + j.turns[2].english; return j.turns[0].text }

;(async () => {
  // ══ §37 — ONE complexity table in the source; every path resolves through the same contract ══
  {
    const src = fs.readFileSync(process.env.TT_SRC || 'tt.jsx', 'utf8')
    const ladders = [/goalMin\s*=\s*\d/, /hardCeil\s*=\s*\d/, /sentMin\s*:\s*\d/, /known\s*<\s*\d{2,}\s*\)\s*\{\s*goal/, /\[0,2,4\],\[100,5,6\]/, /if \(known < 10\) return 4/, /4–10 Thai words each/, /'1\\u20134 content units per line/]
    const hits = ladders.filter(re => re.test(src)).map(String)
    const tables = (src.match(/preferredMin:\s*\d+,\s*preferredMax:\s*\d+,\s*hardMax:\s*\d+/g) || []).length
    T('all', 'A1', '§9/§37 no second active sentence-length table in tt.jsx (old known-count ladders, japaneseUnitRange table, mandarin ceiling table, belt-view sentMin/sentMax, "4–10 Thai words", "1–4 content units" all gone) · BELT_COMPLEXITY has exactly 12 rows',
      hits.length === 0 && tables === 12, { hits, tables })
  }
  for (const lang of LANGS) {
    // ══ §3/§36/§37 — Daily, Revision and Listening read the SAME contract ══
    {
      const S = learner(lang, '8th Kyu'); const c = S.c
      const cc = c.getLearnerComplexityContract({ lang, vocab: S.vocab })
      const viaLang = lang === 'th' ? c.getSentenceLengthForVocab(S.vocab).hardCeil : lang === 'ja' ? c.japaneseUnitRange(S.vocab).hardMax : c.mandarinComplexityCeiling(S.vocab)
      const r = await run(S, lang, {})
      const lvl = (r.L.match(/LEVEL belt=(.+?) preferred=(\d+)–(\d+) hardMax=(\d+)/) || []).slice(1)
      T(lang, 'A2', '§36 one learner level: generator (' + (lang === 'th' ? 'getSentenceLengthForVocab' : lang === 'ja' ? 'japaneseUnitRange' : 'mandarinComplexityCeiling') + '), Main acceptance and Listening all resolve 8th Kyu → preferred 5–7, hardMax 9 (v666 two tiers)',
        cc.belt === '8th Kyu' && cc.preferredMin === 5 && cc.preferredMax === 7 && cc.hardMax === 9 && viaLang === 9 && lvl.join() === '8th Kyu,5,7,9' &&
        r.track.level && r.track.level.hardMax === 9, { cc: [cc.belt, cc.preferredMin, cc.preferredMax, cc.hardMax], viaLang, lvl })
      // Main (Daily / Revision) finalisation prints the same LEVEL line and audits the same hardMax
      const t = makeTrack(S, lang)
      const ml = []
      const ft = await c.finaliseMainTrack(t, c.ev('TRACK_ADAPTERS')[lang], { vocab: S.vocab, onLog: m => ml.push(String(m)) })
      const mlvl = (ml.join('\n').match(/LEVEL belt=(.+?) preferred=(\d+)–(\d+) hardMax=(\d+)/) || []).slice(1)
      T(lang, 'A3', '§23/§48 Main finalisation: same LEVEL line · MAIN_COMPLEXITY_AUDIT reported · LENGTH_PASS invariant recorded',
        mlvl.join() === '8th Kyu,5,7,9' && /MAIN_COMPLEXITY_AUDIT belt=8th Kyu preferred=5–7 hardMax=9 lines=\d+ withinPreferred=\d+ shortNatural=\d+ abovePreferredAllowed=\d+ overHardMax=\d+/.test(ml.join('\n')) && ft.integrity && typeof ft.integrity.invariants.LENGTH_PASS === 'boolean' && !!ft.integrity.lengthAudit,
        { mlvl, la: ft.integrity && ft.integrity.lengthAudit && { over: ft.integrity.lengthAudit.overHardMax, max: ft.integrity.lengthAudit.maxObserved } })
    }
    // ══ §6 — the CURRENT learner belt comes from the belt-progression resolver (not known count / bank size) ══
    {
      const S = learner(lang, null); const c = S.c
      const rp = c.rankProgressFor(S.vocab)
      const cc = c.getLearnerComplexityContract({ lang, vocab: S.vocab })
      const known = S.vocab.filter(w => w.status === 'known').length
      T(lang, 'B1', '§6 current belt = rankProgressFor (the belt card / rank test) → ' + rp.current.rank + ' (' + known + ' known words do not raise it)',
        cc.belt === rp.current.rank && cc.beltSource === 'rankProgressFor' && cc.hardMax === c.getBeltComplexity(rp.current.rank).hardMax, { belt: cc.belt, rp: rp.current.rank, known })
    }
    // ══ §38 — a short natural line passes (no padding), flagged tooShortButAllowed ══
    {
      const S = learner(lang, '8th Kyu'); const c = S.c
      const cc = c.getLearnerComplexityContract({ lang, vocab: S.vocab })
      const short = lang === 'th' ? 'ใช่ครับ' : lang === 'ja' ? 'はい、そうです。' : '好的。'
      const a = cc.analyse(short)
      T(lang, 'C1', '§38 "' + short + '" at preferred 5–7 → PASS (' + a.units + ' unit) · tooShortButAllowed=true · not over hardMax', !a.overHardMax && a.tooShortButAllowed && a.units <= 2, a)
    }
    // ══ §39 — an overlong line fails immediately (Main acceptance) ══
    {
      const S = learner(lang, '8th Kyu'); const c = S.c
      const cc = c.getLearnerComplexityContract({ lang, vocab: S.vocab })
      const words = S.vocab.filter(w => w.status === 'known' || w.status === 'learning').map(w => surfOf(lang, w)).filter(x => x && x.length >= 2 && !/[.…\s]/.test(x)).slice(0, 16)
      const long = lang === 'th' ? 'ผม' + words.join('') + 'ครับ' : words.join('') + '。'
      const a = cc.analyse(long)
      const kw = S.targets[0]
      const tgt = surfOf(lang, kw)
      const pair = lang === 'th' ? { speaker: 'A', thai: 'ผม' + tgt + words.join('') + 'ครับ', english: 'x', prompt: 'x', pairType: 'content', targetId: kw.id } :
        lang === 'ja' ? { japanese: tgt + words.join('') + '。', english: 'x', pairType: 'content', targetId: kw.id, isTargetPair: true } : { chinese: tgt + words.join('') + '。', english: 'x', pairType: 'content', targetId: kw.id, isTargetPair: true }
      let rej = ''
      if (lang === 'th') { const v = c.validateThaiTargetPair(pair, { thai: tgt, wordId: kw.id }, { vocab: S.vocab }, 'generation'); rej = v.dimensions.LENGTH + ' ' + v.reasons.join('|') }
      else { const ad = c.ev('TRACK_ADAPTERS')[lang]; const v = c.trackPairValidity({ ...pair, language: lang, wordId: kw.id, recallIndex: 1 }, { wordId: kw.id, [lang === 'ja' ? 'japanese' : 'chinese']: tgt }, ad, { vocab: S.vocab, vocabById: new Map(S.vocab.map(w => [w.id, w])) }); rej = v.reasons.join('|') }
      T(lang, 'C2', '§39 ' + a.units + '-unit line at hardMax 9 → FAIL immediately in the Main acceptance contract (LEVEL_COMPLEXITY_FAIL) — cannot be counted unchanged',
        a.units > 9 && a.overHardMax && /LEVEL_COMPLEXITY_FAIL/.test(rej) && (lang !== 'th' || /^FAIL/.test(rej)), { units: a.units, rej: rej.slice(0, 200) })
    }
    // ══ §39/§24 Listening — an overlong turn → atomic TOO_COMPLEX: level 1 (the line) then level 2 (split over the exchange) ══
    {
      const S = learner(lang, null)   // the fixture learner: Mukyu, preferred 2–4, hardMax 6
      let longText = null
      const r = await run(S, lang, {}, { inject: (sid, j) => { if (sid === 'LS2' && !longText) longText = dbl(lang, j) } })
      const at = r.st.sceneTexts.findIndex(t => t === r.st.sceneTexts.find(x => longText && x.length >= 2 && x.includes(longText.slice(0, 4)) && x.length > 12)) + 1
      const gen = r.logs.find(l => /LEVEL_COMPLEXITY_FAIL scene=LS2 line=L\d+ belt=Mukyu units=\d+ hardMax=6 \(as generated\)/.test(l))
      const tries = r.logs.filter(l => /LISTENING_ATOMIC_REPAIR issue=TOO_COMPLEX scene=LS2/.test(l))
      const iFix = r.logs.findIndex(l => /LISTENING_ATOMIC_REPAIR issue=TOO_COMPLEX scene=LS2/.test(l)), iLS3 = r.logs.findIndex(l => /LISTENING_COMPOSITION scene LS3/.test(l))
      T(lang, 'D1', '§19/§24 overlong LS2 turn (Mukyu, hardMax 6) → LEVEL_COMPLEXITY_FAIL logged as generated → atomic TOO_COMPLEX repair BEFORE LS3 is written (level 1 line, then level 2 exchange split) → LENGTH_PASS · READY 30/30',
        !!gen && tries.length >= 1 && iFix < iLS3 && r.track.status === 'READY' && r.track.listening.gates.LENGTH_PASS === true && r.track.coverage.covered === 30 &&
        /LISTENING_COMPLEXITY_AUDIT belt=Mukyu preferred=2–4 hardMax=6 lines=\d+ .*overHardMax=0 maxObserved=[0-6] .*PASS/.test(r.L),
        { gen: !!gen, tries: tries.map(l => (l.match(/level=\d/) || [])[0]), iFix, iLS3, status: r.track.status, failed: r.track.failedChecks })
      // unfixable: the model keeps returning the same long line → NOT_READY on LENGTH_PASS (never READY unchanged)
      const S2 = learner(lang, null)
      const r2 = await run(S2, lang, { atomicNoop: true }, { inject: (sid, j) => { if (sid === 'LS2') dbl(lang, j) } })
      // v669 §17: the over-hardMax candidate is NEVER committed — LS2 is re-planned (the long line's target moves to a
      // compatible scene) or stays UNCOMMITTED; READY only when every gate (incl. SCENES_VALIDATED, coverage) passes
      T(lang, 'D2', '§22/§39 an overlong turn that cannot be repaired → never committed (v669 re-planned / UNCOMMITTED · v673 regenerated / replanned once / trimmed), no line over hardMax in the track (LENGTH_PASS), READY iff every gate passes',
        /SCENE_REPLAN LS2|SCENE_NOT_COMMITTED LS2|PHASE_REGENERATE LS2 |LISTENING_GLOBAL_REPLAN after LS2 |PHASE_TRIMMED LS2 |PHASE_NOT_COMMITTED LS2 /.test(r2.L) && r2.track.lengthAudit.over.length === 0 && /LISTENING_COMPLEXITY_AUDIT .*overHardMax=0 /.test(r2.L) &&
        (r2.track.status === 'READY') === (r2.track.failedChecks.length === 0) && (r2.track.listening ? r2.track.listening.gates.LENGTH_PASS === true : true),
        { status: r2.track.status, failed: r2.track.failedChecks })
    }
    // ══ §40/§43 — a dictionary word that was never introduced is CLOSED_VOCAB_FAIL; Listening NEW=0 ══
    {
      const S = learner(lang, null); const c = S.c
      const fresh = makeNew(S, lang)
      const fs0 = fresh ? surfOf(lang, fresh) : null
      const inv = c.buildLearnerAuthorizedInventory(lang, S.vocab, S.targets, 'listening')
      T(lang, 'E1', '§12/§40 a dictionary entry with status=new and no history ("' + fs0 + '") is NOT in the learner-authorised inventory',
        !!fresh && !c.isLearnerTaught(fresh) && !inv.words.has(fs0) && inv.words.size > 0 && !inv.newTargets.length, { fresh: fs0, size: inv.words.size })
      if (fresh) {
        const r = await run(S, lang, { atomicNoop: true }, { inject: (sid, j) => { if (sid === 'LS3' && j.turns[1]) j.turns[1].text = addWord(lang, j.turns[1].text, fs0) } })
        // v669 §17: the line with the untaught word is never committed (LS3 re-planned / UNCOMMITTED) — the word never reaches
        // the track, it is never a harmless quality note, and the track is READY only if every gate passes
        T(lang, 'E2', '§17/§40/§43 Gemini uses that untaught database word in Listening → CLOSED_VOCAB_FAIL as generated → atomic repair → (still there) → (v669/v673) LS3 never committed with it (re-planned / regenerated / trimmed / UNCOMMITTED): the word is NOT in the track, no quality notes, NOT_READY unless LS3\'s targets validate elsewhere',
          // (v673: when the fixture's untaught word is one the mock writes in EVERY scene — JA それ — every phase handles it the
          // same way, so the evidence is any scene's, not LS3's)
          new RegExp('CLOSED_VOCAB_FAIL scene=LS\\d+ line=L\\d+ unknown=\\[[^\\]]*' + fs0).test(r.L) && /LISTENING_ATOMIC_REPAIR issue=CLOSED_VOCAB scene=LS\d|PHASE_REGENERATE LS\d/.test(r.L) &&
          /SCENE_REPLAN LS\d|SCENE_NOT_COMMITTED LS\d|PHASE_REGENERATE LS\d+ |LISTENING_GLOBAL_REPLAN after LS\d+ |PHASE_TRIMMED LS\d+ |PHASE_NOT_COMMITTED LS\d+ /.test(r.L) &&
          !(r.track.listening ? r.track.listening.lines : []).some(l => (l.thai || l.japanese || l.chinese || '').includes(fs0)) && !(r.track.qualityNotes || []).length &&
          (r.track.status === 'READY') === (r.track.failedChecks.length === 0), { failed: r.track.failedChecks, unknown: r.track.unknownWords })
      }
      // §43 — a NEW (never-introduced) word offered as a Listening target is not authorised (NEW=0)
      const inv2 = c.buildLearnerAuthorizedInventory(lang, S.vocab, S.targets.concat(fresh ? [fresh] : []), 'listening')
      T(lang, 'E3', '§13/§43 Listening has NEW=0: a never-introduced word among its targets is rejected from the inventory (no lexical teaching through Listening)',
        !!fresh && inv2.rejectedNewTargets.some(w => w.id === fresh.id) && !inv2.words.has(fs0), { rejected: inv2.rejectedNewTargets.map(w => w.id) })
    }
    // ══ §41/§16 — a previously introduced word (status=learning, legacy introducedAt, no review date) is ALLOWED ══
    {
      const S = learner(lang, null); const c = S.c
      const w = makeNew(S, lang)
      Object.assign(w, { status: 'learning', introducedAt: 'legacy', lastSeen: null, okStreak: 0, repCount: 0 })
      const la = c.listeningAdapterFor(lang)
      const exposed = c.buildLearnerAuthorizedInventory(lang, S.vocab, S.targets, 'listening').taught
      const line = la.makeLine({ text: lang === 'th' ? 'ผม' + surfOf(lang, w) + 'ครับ' : surfOf(lang, w) + '。', english: 'x' }, 'A')
      const un = c.listeningUnexposedWords(lang, line, exposed, S.targets)
      T(lang, 'F1', '§16/§41 a status=learning word (legacy introducedAt, no review date — v664 called it unknown) is learner-authorised support vocabulary · revisionEligible alone would have rejected it',
        c.isLearnerTaught(w) && !c.revisionEligible(w) && !un.includes(surfOf(lang, w)) && exposed.includes(w), { un })
    }
    // ══ §42 — Daily NEW target is authorised for THAT track; unrelated new words stay forbidden ══
    {
      const S = learner(lang, null); const c = S.c
      const n0 = makeNew(S, lang), news = [n0, makeNew(S, lang, [n0])]
      const inv = c.buildLearnerAuthorizedInventory(lang, S.vocab, [news[0]], 'daily')
      T(lang, 'G1', '§42 Daily: the selected NEW target "' + surfOf(lang, news[0]) + '" is authorised (newTargets=1); an unrelated new word "' + surfOf(lang, news[1]) + '" is not',
        inv.newTargets.length === 1 && inv.words.has(surfOf(lang, news[0])) && !inv.words.has(surfOf(lang, news[1])), { newTargets: inv.newTargets.length })
    }
    // ══ §44 — repair of a TOO_COMPLEX line that introduces an unseen word is rejected; original retained ══
    {
      const S = learner(lang, null)
      const bad = S.vocab.find(w => surfOf(lang, w) === (lang === 'th' ? 'พิเศษ' : lang === 'ja' ? '特別' : '特别'))
      if (bad) Object.assign(bad, { status: 'new', introducedAt: null, lastSeen: null, okStreak: 0, repCount: 0, manualKnown: false, dueDate: null })   // the mock's "unseen word"
      const r = await run(S, lang, { atomicBadIssue: 'i1' }, { inject: (sid, j) => { if (sid === 'LS2') dbl(lang, j) } })
      const rej = r.logs.filter(l => /PATCH_REJECTED issue=i1 .*reason=(CLOSED_VOCAB|LENGTH)/.test(l))
      T(lang, 'H1', '§27/§44 a shorter repair that adds an unseen word → PATCH_REJECTED (CLOSED_VOCAB) · original retained · retried atomically, never committed',
        // (v673: a model whose every patch AND regeneration keeps the defect ends with the defective exchange trimmed and its
        // target explicitly UNPLACED — NOT_READY, never the unseen word)
        rej.some(l => /reason=CLOSED_VOCAB/.test(l)) && !r.lines.some(t => /พิเศษ|特別|特别/.test(t)) &&
        (r.track.coverage.covered === 30 || (r.track.status === 'NOT_READY' && r.track.coverage.missing.every(id => new RegExp('LISTENING_TARGET_UNPLACED ' + id + ' |PHASE_NOT_COMMITTED').test(r.L)))), { rej: rej.map(l => l.slice(0, 120)), cov: r.track.coverage.covered })
    }
    // ══ §45 — repair of a CLOSED_VOCAB line that becomes too long is rejected ══
    {
      const S = learner(lang, null)
      const cc0 = S.c.getLearnerComplexityContract({ lang, vocab: S.vocab })
      const r = await run(S, lang, { atomicLong: 'i1' }, { inject: (sid, j) => { if (sid === 'LS3' && j.turns[1]) j.turns[1].text = addWord(lang, j.turns[1].text, F[lang]) } })
      T(lang, 'H2', '§27/§45 a repair that removes the unknown word but exceeds hardMax → PATCH_REJECTED reason=LENGTH · no committed line is longer than what was generated',
        r.logs.some(l => /PATCH_REJECTED issue=i1 .*reason=LENGTH: L\d+ \d+ > hardMax 6/.test(l)) &&
        // v669: lines placed by re-allocation (an uncommitted scene's targets) are new lines, so the bound is the belt's hardMax
        r.track.lengthAudit.maxObserved <= Math.max(cc0.hardMax || 6, ...r.st.sceneTexts.filter(t => !t.includes(F[lang])).map(t => cc0.countUnits(t))) && r.track.lengthAudit.over.length === 0,
        { rej: r.logs.filter(l => /PATCH_REJECTED/.test(l)).map(l => l.slice(0, 120)), max: r.track.lengthAudit.maxObserved })
    }
    // ══ §46/§33 — a 4-target line is rejected locally at generation time, never reaches final assembly ══
    {
      const S = learner(lang, '4th Kyu')   // the mock rebuilds the exchange from fixture frames (up to 3 per line) — they fit hardMax 11
      const r = await run(S, lang, { max4: true })
      const iGen = r.logs.findIndex(l => /MAX3_FAIL scene=LS\d line=L\d+ .*\(as generated\)/.test(l)), iAsm = r.logs.findIndex(l => /LISTENING_SCENE_COVERAGE_UNION/.test(l))
      const asm = (r.L.match(/LISTENING_MAX3_AUDIT (PASS|FAIL)/) || [])[1]
      T(lang, 'I1', '§33/§46 a line with 4 current targets → MAX3_FAIL as generated → fixed in its scene (before assembly) → assembled MAX3 audit PASS · READY',
        iGen >= 0 && iGen < iAsm && asm === 'PASS' && r.track.listening.gates.MAX3_PASS === true && r.track.status === 'READY', { iGen, iAsm, asm, status: r.track.status })
    }
    // ══ §5/§24/§30 at the real fixture belt (Mukyu, preferred 2–4, hardMax 6): split a turn that says too much; give a word its own exchange ══
    {
      const S = learner(lang, null)
      const r = await run(S, lang, { max4: true })
      T(lang, 'I2', '§5 Mukyu: a 4-target turn → fixed in its scene (atomically, or — when it is too long to rewrite in place, as in Thai — LISTENING_SPLIT_TURNS into short turns ≤ 4, protected words kept) → READY 30/30',
        /MAX3_FAIL scene=LS\d .*\(as generated\)/.test(r.L) && (!/LISTENING_SPLIT_TURNS LS\d/.test(r.L) || /PATCH_ACCEPTED split LS\d · \d+ → \d+ turns/.test(r.L)) &&
        // v668: a Thai 4-target turn at Mukyu breaks max3 + LENGTH + speaker particles at once → a fundamentally invalid candidate → REGENERATED before commit (or split)
        (lang !== 'th' || /PATCH_ACCEPTED split/.test(r.L) || /SCENE_PREFLIGHT LS\d .*decision=REGENERATE/.test(r.L) || /PATCH_ACCEPTED issue=i\d+ /.test(r.L) || /PHASE_REGENERATE LS\d/.test(r.L)) && r.track.status === 'READY' && r.track.coverage.covered === 30 && r.track.lengthAudit.overHardMax === 0,
        { status: r.track.status, failed: r.track.failedChecks, split: (r.L.match(/PATCH_(ACCEPTED|REJECTED) split[^\n]*/) || [])[0] })
      const S2 = learner(lang, null)
      const miss = S2.targets[0].id
      const r2 = await run(S2, lang, { missing: [miss] })
      T(lang, 'I3', '§30 Mukyu: a word no exchange can absorb within 4 words → its own short A/B exchange is inserted (new turns pass LENGTH / CLOSED_VOCAB / max3) → 30/30 READY',
        r2.track.status === 'READY' && r2.track.coverage.covered === 30 && r2.track.lengthAudit.overHardMax === 0 && /LISTENING_REASSIGN|SCENE_REQUIRED_COVERAGE LS\d \(after atomic repair\)/.test(r2.L),
        { status: r2.track.status, failed: r2.track.failedChecks })
    }
    // ══ §47/§49/§50 — READY contract + telemetry + history ══
    {
      const S = learner(lang, null)
      const r = await run(S, lang, {})
      const g = r.track.listening.gates
      const need = ['COVERAGE_PASS', 'MAX3_PASS', 'LENGTH_PASS', 'CLOSED_VOCAB', 'BOTH_SPEAKERS', 'NO_MERGED_SPEAKER_LINES', 'NO_DUPLICATES', 'NO_SINGLETON_SCENES', 'LINE_QUALITY', 'NATURALNESS', 'WHOLE_CONVERSATION_COHERENCE', 'PRONUNCIATION', 'TURN_BUDGET']
      T(lang, 'J1', '§47 Listening READY contract: all 13 gates present and passing (CLOSED_VOCAB and LENGTH not advisory) · LEVEL / VOCAB INVENTORY / LISTENING_COMPLEXITY_AUDIT / LISTENING_CLOSED_VOCAB logged',
        r.track.status === 'READY' && need.every(k => k in g && (g[k] === true || g[k] === 'PASS')) && /📏 LEVEL belt=Mukyu/.test(r.L) && /VOCAB INVENTORY introducedContent=\d+ selectedTargets=30 NEW=0/.test(r.L) &&
        /LISTENING_COMPLEXITY_AUDIT .* PASS/.test(r.L) && /LISTENING_CLOSED_VOCAB unknown=0 PASS/.test(r.L), { status: r.track.status, missing: need.filter(k => !(k in g)), g })
      const rec = S.c.listeningAttemptRecord({ attemptId: 'a', createdAt: 'x', lang, ids: S.targets.map(t => t.id), state: r.track.status, track: r.track })
      T(lang, 'J2', '§50 History stores belt, preferred range, hardMax, length failures, unknown words and atomic fixes',
        rec.level && rec.level.belt === 'Mukyu' && rec.level.hardMax === 6 && rec.level.preferredMin === 2 && Array.isArray(rec.lengthFailures) && Array.isArray(rec.unknownWords) && !!rec.atomicFixes, rec.level)
    }
  }
  console.log(out.join('\n'))
  console.log(fails ? fails + ' FAILED of ' + n : 'all passed (' + n + ' checks)')
  process.exit(fails ? 1 : 0)
})().catch(e => { console.log(out.join('\n')); console.log('CRASH', e.stack); process.exit(1) })
