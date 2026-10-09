// v675 — STEP 0 (benchmark & honest instrumentation) regression suite.
// A historical baseline · B record/replay · C behaviour equivalence (v674 cassettes replayed on this build)
// D telemetry corrections (reporting only) · E evaluator + golden dataset · F opt-in browser capture · G learner data
'use strict'
const fs = require('fs'), path = require('path'), crypto = require('crypto')
const { load } = require('./harness')
const B = path.join(__dirname, 'benchmark')
const { runOnce, runOnceUi, loadFixture, compareContent } = require('./benchmark/run')
const { createRecorder, createReplayer, stripKey } = require('./benchmark/lib/cassette')
const { evaluate, aggregate, parseVerdict } = require('./benchmark/evaluator/evaluate')
const { compare, kappa } = require('./benchmark/evaluator/calibrate')
const { evaluatorPrompt, DIMENSIONS, validVerdict } = require('./benchmark/evaluator/rubric')
const { importSnapshot } = require('./benchmark/import_snapshot')
const out = []; let n = 0, fails = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + id.padEnd(5) + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 900) : '')) }
const readJ = f => JSON.parse(fs.readFileSync(f, 'utf8'))
const HIST = path.join(B, 'historical', '2026-10-08-v674')
// v678: the production baseline moved to v677 (the deployed build, which changed generation); the simulator cassette
// library was re-recorded on it (v674 recordings kept in benchmark/cassettes/archive-v674)
const BASELINE_BUILD = 'v677'
const FIX = ['th-daily', 'ja-daily', 'zh-daily', 'th-listening', 'ja-listening', 'zh-listening'].map(x => x + '-2026-10-08')

;(async () => {
  // ══ A — HISTORICAL BASELINE ═══════════════════════════════════════════════════════════════════════════════════════
  {
    const m = readJ(path.join(HIST, 'MANIFEST.json'))
    const ok = m.files.length === 6 && m.files.every(f => { const b = fs.readFileSync(path.join(HIST, f.file)); return b.length === f.bytes && crypto.createHash('sha256').update(b).digest('hex') === f.sha256 })
    T('A1', 'the six live v674 logs of 8 Oct are preserved VERBATIM (sha256 + byte size pinned in MANIFEST.json) and labelled HISTORICAL OBSERVATIONS — not controlled benchmark runs',
      ok && /HISTORICAL OBSERVATIONS/.test(m.label) && /NOT controlled benchmark runs/.test(m.label) && m.caveats.some(c => /cannot be replayed/.test(c)), m.files.map(f => f.file))
    const fx = FIX.map(id => loadFixture(id))
    T('A2', 'six reproducible fixtures (one per combination) pin the log they come from (sha256), the logged belt and 30 targets each — every target mapped to a bank id',
      fx.every(f => f.targets.length === 30 && !f.targetsUnmapped.length && f.belt.rank && m.files.some(x => x.file === f.historicalLog.file && x.sha256 === f.historicalLog.sha256)),
      fx.map(f => [f.id, f.targets.length, f.targetsUnmapped, f.belt.rank]))
    const beltsFromLogs = fx.every(f => fs.readFileSync(path.join(HIST, f.historicalLog.file), 'utf8').includes('LEVEL belt=' + f.belt.rank + ' '))
    T('A3', 'fixtures sit at the ACTUAL belt of each log (Mukyu for Mandarin, 10th Kyu for Thai / Japanese) — not the test-suite Shodan learner', beltsFromLogs && fx.filter(f => f.language === 'zh').every(f => f.belt.rank === 'Mukyu'), fx.map(f => f.belt))
    const prov = fx.every(f => { const i = f.inventory; return i.taughtIds.length === i.observedIds.length + i.crossLogIds.length + i.reconstructedIds.length && (i.declaredCount == null || i.taughtIds.length === i.declaredCount) })
    const zhExact = fx.find(f => f.id === 'zh-daily-2026-10-08').inventory, jaExact = fx.find(f => f.id === 'ja-daily-2026-10-08').inventory
    T('A4', 'every taught word carries its provenance (OBSERVED / CROSS_LOG / RECONSTRUCTED) and matches the logged inventory size; the Mandarin and Japanese Daily inventories are fully OBSERVED (65 / 107 listed words)',
      prov && zhExact.reconstructedIds.length === 0 && zhExact.observedIds.length === 35 && jaExact.reconstructedIds.length === 0, fx.map(f => f.provenanceSummary.inventory))
    const th = fx.filter(f => f.language === 'th')
    const blocked = th.every(f => { const C = load(path.join(__dirname, 'tt.compiled.js')); const V = C.initVocab(); const sur = new Map(V.map(w => [w.id, w.thai])); return f.inventory.taughtIds.every(id => !f.notTaughtObserved.includes(sur.get(id))) })
    T('A5', 'a reconstructed Thai inventory never contains a word the log shows as UNTAUGHT (blockedUnseen / untaught vocabulary — e.g. มัน, เรื่อง, แค่)', blocked && th.every(f => f.notTaughtObserved.length > 0) && th[0].notTaughtObserved.includes('มัน'), th.map(f => f.notTaughtObserved))
    const histOut = fx.every(f => f.historicalOutcome && f.historicalOutcome.status === 'NOT_READY' || f.id === 'ja-daily-2026-10-08')
    T('A6', 'each fixture records the historical outcome of its live run (status, coverage, calls, tokens) for later comparison — e.g. Mandarin Listening 7/30, Thai Daily 89/90',
      histOut && fx.find(f => f.id === 'zh-listening-2026-10-08').historicalOutcome.coverage === '7/30' && fx.find(f => f.id === 'th-daily-2026-10-08').historicalOutcome.coverage === '89/90', fx.map(f => [f.id, f.historicalOutcome]))
  }

  // ══ B — RECORD / REPLAY ═══════════════════════════════════════════════════════════════════════════════════════════
  const fxZ = loadFixture('zh-daily-2026-10-08')
  const r1 = await runOnce(fxZ, { mode: 'record', provider: 'sim' })
  const r2 = await runOnce(fxZ, { mode: 'record', provider: 'sim' })
  {
    const same = JSON.stringify(r1.cassette.entries.map(e => [e.key, e.response])) === JSON.stringify(r2.cassette.entries.map(e => [e.key, e.response]))
    T('B1', 'a fixture run is DETERMINISTIC: two independent recordings send the identical request sequence (pinned clock + seeded Math.random + fixed learner state)', same && r1.cassette.entries.length > 50, [r1.cassette.entries.length, r2.cassette.entries.length])
    const rp = await runOnce(fxZ, { mode: 'replay', cassette: r1.cassette })
    const cmp = compareContent(r1.content, rp.content)
    T('B2', 'REPLAY reproduces the recorded run with NO model: every request answered from the cassette (served = recorded), nothing unused, identical learner-facing content',
      rp.replay.faithful && rp.replay.served === r1.cassette.entries.length && cmp.identical && !rp.error, { replay: rp.replay, cmp })
    const e0 = r1.cassette.entries[0]
    T('B3', 'a cassette entry holds the exact request (contents + generationConfig: temperature, maxOutputTokens, schema) and the exact response (status + body with usageMetadata) — the API key is never stored',
      e0.request && e0.request.contents && e0.request.generationConfig && e0.response.status === 200 && e0.response.body.usageMetadata && /<redacted>/.test(e0.url) && !JSON.stringify(r1.cassette).includes('AIzaSyTEST-harness-key'),
      { url: e0.url, gen: e0.request.generationConfig })
    // prompt change → mismatch, never a mock
    const appSrc = fs.readFileSync(path.join(__dirname, 'tt.compiled.js'), 'utf8')
    const altered = appSrc.replace(/You are a Mandarin teacher writing natural spoken Chinese/g, 'You are a Mandarin teacher writing NATURAL spoken Chinese')
    const altFile = path.join(__dirname, '.tests37-altered.compiled.js'); fs.writeFileSync(altFile, altered)
    const rm = await runOnce(fxZ, { mode: 'replay', cassette: r1.cassette, appFile: altFile })
    fs.unlinkSync(altFile)
    const mm = rm.replay.mismatches[0]
    T('B4', 'a CHANGED PROMPT is reported as CASSETTE_MISMATCH (call number, reason, first differing position) and the request is REFUSED — no mock answer is substituted, the replay is not faithful',
      altered !== appSrc && rm.replay.mismatches.length > 0 && !rm.replay.faithful && mm && /prompt or settings changed/.test(mm.reason) && mm.promptDiff && /NATURAL|natural/.test(mm.promptDiff.requested) && rm.replay.served < r1.cassette.entries.length,
      { mismatches: rm.replay.mismatches.length, first: mm })
    // settings change (temperature) → mismatch with a settings diff
    const rep = createReplayer(r1.cassette)
    const body = JSON.parse(JSON.stringify(r1.cassette.entries[0].request)); body.generationConfig.temperature = 0.123
    let threw = null; try { await rep.fetch('https://generativelanguage.googleapis.com/v1beta/models/' + r1.cassette.entries[0].model + ':generateContent?key=x', { body: JSON.stringify(body) }) } catch (e) { threw = e }
    T('B5', 'a CHANGED SETTING (temperature) is a mismatch too — the report names the settings difference', threw && threw.cassetteMismatch && threw.cassetteMismatch.settingsDiff && /0\.123/.test(threw.cassetteMismatch.settingsDiff.requested), threw && threw.cassetteMismatch)
    const extra = { ...r1.cassette, entries: r1.cassette.entries.concat([{ ...r1.cassette.entries[0], seq: 99999, request: { ...r1.cassette.entries[0].request, contents: [{ role: 'user', parts: [{ text: 'never asked' }] }] } }]) }
    const ru = await runOnce(fxZ, { mode: 'replay', cassette: extra })
    T('B6', 'a recorded request the replay never asks for is reported as UNUSED (the run is not faithful)', ru.replay.unused.length === 1 && !ru.replay.faithful && ru.replay.mismatches.length === 0, ru.replay.unused)
    T('B7', 'stripKey removes the key from any Gemini URL', stripKey('https://x/models/m:generateContent?key=AIzaSECRET') === 'https://x/models/m:generateContent?key=<redacted>')
  }

  // ══ C — BEHAVIOUR EQUIVALENCE (cassettes recorded on v674, replayed on this build) ═════════════════════════════════
  {
    const dir = path.join(B, 'cassettes'), files = fs.readdirSync(dir).filter(f => f.endsWith('.json'))
    const rows = []
    for (const f of files) {
      const cas = readJ(path.join(dir, f))
      // v676: a cassette recorded through the screens' steps (meta.path ui-path/1) replays through the same path
      const r = await (cas.cassette.meta.path === 'ui-path/1' ? runOnceUi : runOnce)(loadFixture(cas.cassette.meta.fixture), { mode: 'replay', cassette: cas.cassette })
      rows.push({ f, onV674: cas.cassette.meta.appBuild === BASELINE_BUILD, faithful: r.replay.faithful, same: compareContent(cas.outcome.content, r.content).identical, n: r.replay.served })
    }
    T('C1', 'BEHAVIOUR UNCHANGED: every cassette recorded on the production baseline build (' + BASELINE_BUILD + ', ' + rows.length + ' runs · 6 historical fixtures + synthetic + stress variants) replays on this build with byte-identical prompts, no unused request and identical learner-facing content',
      rows.length >= 12 && rows.every(x => x.onV674 && x.faithful && x.same), rows.filter(x => !(x.onV674 && x.faithful && x.same)))
    T('C2', 'the equivalence set covers all six combinations (TH/JA/ZH × Daily/Listening) including recovery, QC-replacement, coherence-failure and missing-target paths',
      ['th-daily', 'ja-daily', 'zh-daily', 'th-listening', 'ja-listening', 'zh-listening'].every(k => rows.some(x => x.f.includes(k))) && rows.some(x => /reject/.test(x.f)) && rows.some(x => /cohfail/.test(x.f)) && rows.some(x => /missing/.test(x.f)), rows.map(x => x.f))
  }

  // ══ D — TELEMETRY CORRECTIONS (reporting only) ═════════════════════════════════════════════════════════════════════
  {
    const c = load(path.join(__dirname, 'tt.compiled.js'))
    const sys = 'You are a Mandarin teacher writing natural spoken Chinese for a learner.'
    const first = c.aiStageOf(sys + '\nTARGET: ★ 好 [hǎo]', []), retry2 = c.aiStageOf(sys + '\nThe previous attempt failed: x. Fix exactly that.', []),
      retry3 = c.aiStageOf(sys + '\nSimplify: fewer content words, 2–4 words. Previous failure: x', []), retry4 = c.aiStageOf(sys + '\nUse ONLY 好 plus at most one other known word. Previous failure: x', []),
      rec = c.aiStageOf(sys + '\nThe previous attempt failed: x', ['recoverJapaneseMissingRecall'])
    T('D1', 'Mandarin check 2+ requests are classified as paid REGENERATION (B_generation_retry), first attempts stay A_generation, recovery stays H_recovery — the "regeneration share 0%" was a mislabel',
      first === 'A_generation' && retry2 === 'B_generation_retry' && retry3 === 'B_generation_retry' && retry4 === 'B_generation_retry' && rec === 'H_recovery', [first, retry2, retry3, retry4, rec])
    const ja = c.aiStageOf('writing realistic spoken Japanese for learners\nThe previous attempt failed: x', []), th = c.aiStageOf('You write Pimsleur-style Thai lessons\nREWRITE REQUIRED', [])
    T('D2', 'the classification is a pure function of the prompt (identical prompts → identical stage, so request dedupe is unchanged) and Thai / Japanese classification is untouched',
      ja === 'A_generation' && th === 'B_generation_retry' && c.aiStageOf(sys + '\nThe previous attempt failed: x', []) === retry2)
    const rz = await runOnce(fxZ, { mode: 'replay', cassette: r1.cassette })
    const usage = rz.telemetry.usageSummary.join('\n'), log = rz.log.join('\n')
    const waste = (usage.match(/regeneration share (\d+)%/) || [])[1]
    T('D3', 'on a replayed Mandarin run the summary now reports the real regeneration requests and tokens (share > 0) and "fallback-after-paid-retries" says n/a instead of a false 0',
      +waste > 0 && /fallback-after-paid-retries n\/a/.test(usage) && /Retried: [1-9]/.test(usage), usage.split('\n').filter(l => /WASTE|Retried/.test(l)))
    const acc = (log.match(/CANDIDATE_ACCOUNTING [^\n]*candidates=(\d+)/) || [])[1], chk = (log.match(/CHECK_MODEL recalls=\d+ candidateAttempts=(\d+)/) || [])[1]
    T('D4', 'CANDIDATE_ACCOUNTING is derived from the SAME per-recall check ledger as the 11-check display: its candidate total equals CHECK_MODEL candidateAttempts; it separates model-reply candidates from deterministic fallbacks and states that candidates ≠ paid requests',
      acc && acc === chk && /deterministic fallback \(no request\) \d+/.test(log) && /candidates ≠ paid requests/.test(log), [acc, chk])
    const pr = usage.match(/PAID REQUESTS BY PURPOSE: (.+)/), total = +((usage.match(/Total requests: (\d+)/) || [])[1])
    const sumP = pr ? [...pr[1].matchAll(/ (\d+) \(\d+ tok/g)].reduce((a, m) => a + +m[1], 0) : -1
    T('D5', 'PAID REQUESTS BY PURPOSE attributes every paid request (first attempt / regeneration / recovery / judging / listening repair …) — the purposes sum to Total requests', sumP === total && total > 0, [sumP, total, pr && pr[1]])
    T('D6', 'the "QC: N candidate sentence(s) rejected" line keeps its wording but now states its scope (removals AFTER generation only) and the full ledger tally of candidates evaluated / rejected',
      /QC: \d+ candidate sentence\(s\) rejected .* · scope: removals AFTER generation \(final audit \/ quota\) only — all candidates: \d+ evaluated, \d+ rejected/.test(log))
    // Listening fragment / vacuous PASS
    const L = []; c._lnLogAuditLines(m => L.push(m), { covered: [{}], missing: [{ surface: 'x' }], lines: [{ targetCount: 1 }], issues: [], speakers: ['A', 'B'] }, [], new Array(30).fill({}), 'final')
    const L0 = []; c._lnLogAuditLines(m => L0.push(m), { covered: [], missing: [], lines: [], issues: [], speakers: [] }, [], new Array(30).fill({}), 'final')
    T('D7', 'Listening PASS lines over an incomplete track say they judge the assembled fragment only; over zero lines they say VACUOUS (not a verdict on any content)',
      L.filter(l => /PASS/.test(l)).every(l => /scope: the 1 assembled line\(s\) only — the track covers 1\/30 targets/.test(l)) && L0.filter(l => /PASS/.test(l)).every(l => /VACUOUS/.test(l)), L.concat(L0))
    // cue-check: an unparseable batch is now visible; behaviour (returned map) unchanged
    const cue = load(path.join(__dirname, 'tt.compiled.js')), cl = []
    cue.geminiGenerate = async () => 'not json at all'
    const eng = { sentenceOf: p => p.chinese, labelSentence: 'Mandarin', language: 'zh' }
    const m = await cue.aiQcPromptMatch([{ prompt: 'Ask whether it is good', chinese: '好吗？', english: 'Is it good?' }, { prompt: 'Say it is good please', chinese: '很好。', english: 'Very good.' }], eng, 'k', 'm', x => cl.push(x))
    T('D8', 'an UNPARSEABLE cue-check reply is logged as CUE_CHECK_UNVERIFIED with the number of pairs left without a verdict (it used to be skipped silently); the returned verdict map is unchanged (empty)',
      m.size === 0 && cl.some(x => /CUE_CHECK_UNVERIFIED batch 1: reply unparseable — 2 pair\(s\) carry NO cue verdict/.test(x)) && cl.some(x => /CUE_CHECK_COVERAGE scored 0\/2/.test(x)), cl)
    const g = { language: 'zh', status: 'NOT_READY', reasons: [], counts: { targetPairs: 89, targetPairsRequired: 90, targetWordsCovered: 30, targetWords: 30, rejectedSentences: { total: 1, cueMismatch: 1, unnatural: 0, other: 0 }, replacementSentences: 3, bridgePairs: 0, framingPairs: 4, playableLines: 93 },
      invariants: { PRONUNCIATION_ALIGNMENT_ISSUES: 0, UNVERIFIED_FINAL_PAIRS: 0 }, mainCoherence: { state: 'VERIFIED', overall: 4 }, removedTargetPairs: [{ reasons: ['naturalness UNVERIFIED (group judge reply unparseable twice — UNVERIFIED)'] }, { reasons: ['naturalness UNVERIFIED (x)'] }, { reasons: ['promptMeaning: cue'] }] }
    const il = c.trackIntegrityLines({ integrity: g }).join('\n')
    T('D9', 'pairs REMOVED because a judge could not verify them are disclosed next to "UNVERIFIED FINAL PAIRS: 0" (they were never verified)', /UNVERIFIED FINAL PAIRS: 0 · removed earlier as UNVERIFIED \(judge reply unusable — never verified\): 2/.test(il), il)
    const note = c.ev('(() => { const sc = { turns: [] }; _lnCommitTransition.set(sc, { tr: { pass: true, judge: { verified: false } }, natUnverified: 2 }); return _lnCommitNote(sc, { missing: [] }, {}, new Map()) })()')
    const note3 = c.ev('(() => { const sc = { turns: [] }; _lnCommitTransition.set(sc, { tr: { pass: true, judge: { verified: true, det: 3, pass: true } }, natUnverified: 0 }); return _lnCommitNote(sc, { missing: [] }, {}, new Map()) })()')
    T('D10', 'SCENE_COMMIT now says what "clean" rested on: an UNVERIFIED naturalness / transition verdict is named (not a pass), a continuity 3/5 is shown as accepted only on the model judge\'s PASS',
      /naturalness UNVERIFIED for 2 line\(s\)/.test(note) && /transition judge UNVERIFIED \(counted as pass\)/.test(note) && /continuity det 3\/5 accepted on the model judge's PASS/.test(note3), [note, note3])
    const thU = (await runOnce(loadFixture('th-daily-2026-10-08'), { mode: 'replay', cassette: readJ(path.join(B, 'cassettes', 'th-daily-2026-10-08.sim.json')).cassette })).telemetry.usageSummary.join('\n')
    T('D11', 'the Thai GENERATION (app level) line names its unit — one row is a TARGET-GROUP request (3 recalls), not a recall', /unit = one TARGET-GROUP request \(3 recalls each\) — not one recall\): target-group requests \d+/.test(thU) && /per target group/.test(thU), thU.split('\n').filter(l => /GENERATION \(app/.test(l)))
  }

  // ══ E — EVALUATOR + GOLDEN DATASET ═════════════════════════════════════════════════════════════════════════════════
  {
    const g = readJ(path.join(B, 'evaluator', 'golden', 'golden-v1.json'))
    const per = l => g.items.filter(i => i.language === l).length
    T('E1', 'golden-v1: ' + g.items.length + ' items across all six combinations (TH ' + per('th') + ' · JA ' + per('ja') + ' · ZH ' + per('zh') + '), each with explicit expected verdicts on all 8 dimensions and error categories',
      g.items.length >= 100 && ['th', 'ja', 'zh'].every(l => ['daily', 'listening'].every(t => g.items.filter(i => i.language === l && i.trackType === t).length >= 12)) && g.items.every(i => validVerdict(i.expected) && Array.isArray(i.errorCategories)))
    const verbatim = g.items.every(i => { const txt = fs.readFileSync(path.join(HIST, i.source.file), 'utf8'); return i.source.line && i.turns.every(t => txt.includes(t.text.replace(/[。？！]$/, ''))) })
    T('E2', 'every golden item is VERBATIM from a historical log (each turn\'s text found in the cited file; line located) — no invented material', verbatim, g.items.filter(i => !i.source.line).map(i => i.id))
    T('E3', 'label provenance is explicit: every label is a MODEL label (annotator A, the author of the pipeline — not independent), humanReviewed=false everywhere; nothing claims native-speaker review',
      g.items.every(i => i.humanReviewed === false && i.humanReview === null && i.labels.every(l => /^model:/.test(l.by) && /NOT independent/.test(l.role))) && /No native-speaker review yet/.test(g.provenance))
    const b = readJ(path.join(B, 'evaluator', 'golden', 'golden-v1.annotator-b.json'))
    const cmp = compare(g, b, { label: 'annotator B' })
    T('E4', 'inter-annotator DISAGREEMENT is reported, not concealed: a blind second model annotator (B) was compared per dimension (agreement + Cohen\'s kappa + the disagreeing items); status stays NOT CALIBRATED (no human labels)',
      b.labels.length === g.items.length && /NOT CALIBRATED — no human-reviewed golden labels/.test(cmp.calibrationStatus) && Object.values(cmp.byProvenance.MODEL.dims).some(d => d.disagreements.length > 0),
      Object.fromEntries(Object.entries(cmp.byProvenance.MODEL.dims).map(([k, v]) => [k, Math.round(v.agreement * 100) + '%'])))
    const p = evaluatorPrompt(g.items[0])
    T('E5', 'the evaluator prompt carries the material, target, speakers and rubric but NEVER the expected verdicts or rationale', !p.includes(g.items[0].rationale) && !/expected/i.test(p) && Object.keys(DIMENSIONS).every(d => p.includes(d)))
    const stubOk = async () => JSON.stringify({ grammar: 'ok', naturalness: 'natural', targetUsage: 'correct', cue: 'n/a', qa: 'n/a', coherence: 'n/a', register: 'n/a', usefulness: 'useful', errorCategories: [], rationale: 'x' })
    const stubBad = async () => 'not json', stubAlt = async () => JSON.stringify({ grammar: 'error', naturalness: 'unnatural', targetUsage: 'correct', cue: 'n/a', qa: 'n/a', coherence: 'n/a', register: 'n/a', usefulness: 'weak', errorCategories: [], rationale: 'y' })
    const ev = await evaluate(g.items.slice(0, 2), [{ id: 'stubA', call: stubOk }, { id: 'stubB', call: stubAlt }, { id: 'stubC', call: stubBad }])
    const a0 = ev.items[0].aggregate
    T('E6', 'evaluator aggregation: an unparseable vote is UNVERIFIED (never a pass or a fail); a 1–1 split is reported as TIE (not resolved silently); disagreement rates are reported per dimension',
      a0.unverifiedVotes === 1 && a0.dims.grammar.value === 'TIE' && a0.dims.targetUsage.value === 'correct' && a0.dims.targetUsage.unanimous && ev.summary.byDimension.grammar.ties === 2, a0)
    T('E7', 'Cohen\'s kappa is computed correctly (perfect agreement 1, chance-level 0)', kappa([['a', 'a'], ['b', 'b']]) === 1 && Math.abs(kappa([['a', 'a'], ['a', 'b'], ['b', 'a'], ['b', 'b']])) < 1e-9)
    const human = JSON.parse(JSON.stringify(g)); human.items.forEach(i => { i.humanReviewed = true; i.humanReview = { verdicts: i.expected } })
    const few = JSON.parse(JSON.stringify(g)); few.items.slice(0, 5).forEach(i => { i.humanReviewed = true; i.humanReview = { verdicts: i.expected } })
    T('E8', '"calibrated" is claimed only against HUMAN labels with ≥30 items per language and ≥85% agreement on every dimension — never against model labels',
      /^CALIBRATED/.test(compare(human, { labels: g.items.map(i => ({ id: i.id, verdicts: i.expected })) }).calibrationStatus) && /fewer than 30/.test(compare(few, b).calibrationStatus))
    T('E9', 'with no API key the evaluator CLI reports EVALUATION NOT RUN (no simulated verdicts)', (() => { try { require('child_process').execFileSync('node', [path.join(B, 'evaluator', 'evaluate.js'), '--items', path.join(B, 'evaluator', 'golden', 'golden-v1.json'), '--panel', 'gemini:gemini-2.5-pro'], { env: { ...process.env, GEMINI_API_KEY: '' } }); return false } catch (e) { return e.status === 2 && /EVALUATION NOT RUN/.test(String(e.stdout)) } })())
  }

  // ══ F — OPT-IN BROWSER CAPTURE (window.ttBenchmark) ═══════════════════════════════════════════════════════════════
  {
    const c = load(path.join(__dirname, 'tt.compiled.js'))
    const orig = async (u, o) => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: 'hi' }] } }] }), clone() { return this } })
    c.fetch = orig
    T('F1', 'the capture is INERT by default: window.ttBenchmark exists, nothing is wrapped, nothing is recorded', c.ttBenchmark && c.fetch === orig && c.ttBenchmark.status().recording === false && c.ttBenchmark.status().captured === 0)
    c.ttBenchmark.startRecording('t')
    const wrapped = c.fetch !== orig
    const res = await c.fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-x:generateContent?key=AIzaSECRETKEY', { method: 'POST', body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'q' }] }] }) })
    const body = await res.json()
    const cas = c.ttBenchmark.cassette()
    c.ttBenchmark.stopRecording()
    T('F2', 'while recording, a Gemini exchange is captured in the replayable tt-cassette/1 format with the key REDACTED; the app still receives the original response; stopRecording restores the original fetch',
      wrapped && body.candidates[0].content.parts[0].text === 'hi' && cas.format === 'tt-cassette/1' && cas.entries.length === 1 && /key=<redacted>/.test(cas.entries[0].url) && !JSON.stringify(cas).includes('SECRETKEY') && c.fetch === orig, cas.entries[0] && cas.entries[0].url)
    c.localStorage.setItem('tt-zh-vocab', JSON.stringify([{ id: 1, chinese: '我', pinyin: 'wǒ', english: 'I', status: 'learning', dueDate: '2026-10-01', repCount: 3 }]))
    const before = JSON.stringify([...Array(c.localStorage.length)].map((_, i) => [c.localStorage.key(i), c.localStorage.getItem(c.localStorage.key(i))]))
    const snap = await c.ttBenchmark.learnerSnapshot()
    const after = JSON.stringify([...Array(c.localStorage.length)].map((_, i) => [c.localStorage.key(i), c.localStorage.getItem(c.localStorage.key(i))]))
    T('F3', 'exportLearnerSnapshot is READ-ONLY (storage byte-identical before/after) and exports per-word SRS state only (no dictionary content: no English / pinyin)',
      before === after && snap.format === 'tt-learner-snapshot/1' && snap.languages.zh.state[0].status === 'learning' && !('english' in snap.languages.zh.state[0]) && !('pinyin' in snap.languages.zh.state[0]))
    const fz = loadFixture('zh-daily-2026-10-08'), tgt0 = fz.targets[0].id, nonT = [...Array(100).keys()].map(i => i + 1).find(id => !fz.targets.some(t => t.id === id))
    const dev = importSnapshot({ format: 'tt-learner-snapshot/1', exportedAt: '2026-10-09T00:00:00Z', appBuild: 'v675', languages: { zh: { words: 100, belt: { rank: 'Mukyu' },
      state: [{ id: tgt0, status: 'learning' }, { id: nonT, status: 'known' }, { id: nonT + 1000, status: 'new' }] } } }, [fz])
    T('F4', 'a device snapshot becomes a DEVICE-provenance fixture that keeps the historical target set, takes taught words and new / review status from the device, and says the device state is the learner on the export date (not 8 Oct)',
      dev.length === 1 && /DEVICE SNAPSHOT/.test(dev[0].label) && /not on 8 Oct/.test(dev[0].label) && dev[0].targets.length === 30 && dev[0].inventory.deviceIds.join() === String(nonT) &&
      dev[0].targets[0].status === 'review' && dev[0].targets[1].status === 'new', dev[0] && { inv: dev[0].inventory, t: dev[0].targets.slice(0, 2) })
  }

  // ══ G — LEARNER DATA / APPLICATION PRESERVED ═══════════════════════════════════════════════════════════════════════
  {
    const c = load(path.join(__dirname, 'tt.compiled.js'), { realBelt: true })
    const V = c.initMandarinVocab()
    const srs = v => JSON.stringify(v.map(w => [w.id, w.status, w.interval, w.repCount, w.okStreak, w.lapses, w.lastSeen, w.dueDate, w.manualKnown]))
    const idsBefore = JSON.stringify(V.map(w => [w.id, w.chinese, w.pinyin, w.english]))
    const s0 = srs(V)
    const rp = await runOnce(fxZ, { mode: 'replay', cassette: r1.cassette })
    T('G1', 'the benchmark applies fixtures to a FRESH in-memory copy of the bundled banks — the bank (ids, entries, SRS defaults) of a new app instance is unchanged', srs(c.initMandarinVocab()) === s0 && JSON.stringify(c.initMandarinVocab().map(w => [w.id, w.chinese, w.pinyin, w.english])) === idsBefore && rp.replay.faithful)
    const src = fs.readFileSync(path.join(__dirname, 'tt.jsx'), 'utf8'), base = fs.readFileSync(path.join(__dirname, 'tt.v674.jsx'), 'utf8')
    const banks = s => (s.match(/const RAW_JAPANESE_VOCAB = \[[\s\S]*?\n\]/) || [''])[0] + (s.match(/const BELT_COMPLEXITY = Object\.freeze\(\{[\s\S]*?\}\)/) || [''])[0] + (s.match(/const CURRICULUM_BELTS = [\s\S]*?\n\]/) || [''])[0]
    T('G2', 'no vocabulary entry, belt threshold or complexity contract changed in the source (bank / belt tables byte-identical to v674)', banks(src) === banks(base) && banks(src).length > 1000)
    const writes = s => (s.match(/stSet\(|localStorage\.setItem\(/g) || []).length
    T('G3', 'Step 0 adds NO storage write anywhere in the app (same number of stSet / localStorage.setItem call sites as v674; v679/v680 add exactly two: the new-generator switch settings)', writes(src) === writes(base) + (src.match(/stSet\((JA_GEN2_SETTING_KEY|settingKey), v\)/g) || []).length && (src.match(/stSet\((JA_GEN2_SETTING_KEY|settingKey), v\)/g) || []).length <= 2, [writes(src), writes(base)])
    T('G4', 'version v675+ (Step 0 build)', /^v(67[5-9]|680)$/.test(c.ev('APP_BUILD_VERSION')) && c.ev('LISTENING_BUILD_VERSION') === c.ev('APP_BUILD_VERSION'))
  }

  console.log(out.join('\n'))
  console.log('\nv675 Step 0 benchmark & instrumentation: ' + (n - fails) + '/' + n + (fails ? ' — ' + fails + ' FAILED' : ' — ALL PASS'))
  process.exit(fails ? 1 : 0)
})().catch(e => { console.log('CRASH ' + (e && e.stack || e)); process.exit(1) })
