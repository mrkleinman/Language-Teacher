// v676 — STEP 0 (completion tooling) regression suite: the in-app live-baseline capture and its safeguards.
// H fixtures (fidelity classes, embedded copy) · I in-app run path (= screens' steps; = Node) · J sandbox · K recorder /
// replayer · L import of browser results · M replay coverage (UI-path cassettes) · N human review pack · O preservation
// Generation behaviour itself is covered by tests37 C1 (every cassette — legacy and UI path — replays on this build).
'use strict'
const fs = require('fs'), path = require('path'), crypto = require('crypto'), vm = require('vm')
const { load } = require('./harness')
const B = path.join(__dirname, 'benchmark')
const { runOnceUi, runOnce, loadFixture, applyFixture, contentOutcome, compareContent } = require('./benchmark/run')
const { fidelityOf } = require('./benchmark/lib/fidelity')
const { embeddedBlock, compact } = require('./benchmark/embed_fixtures')
const { importSnapshot } = require('./benchmark/import_snapshot')
const { importBundle } = require('./benchmark/import_bundle')
const out = []; let n = 0, fails = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + id.padEnd(5) + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 600) : '')) }
const readJ = f => JSON.parse(fs.readFileSync(f, 'utf8'))
const sha = b => crypto.createHash('sha256').update(b).digest('hex')
const FIX = ['th-daily', 'ja-daily', 'zh-daily', 'th-listening', 'ja-listening', 'zh-listening'].map(x => x + '-2026-10-08')
const SRC = fs.readFileSync(path.join(__dirname, 'tt.jsx'), 'utf8')

;(async () => {
  const c = load(path.join(__dirname, 'tt.compiled.js'), { realBelt: true })
  // ══ H — FIXTURES: what is exact and what is reconstructed ═════════════════════════════════════════════════════════
  {
    const fx = FIX.map(loadFixture)
    const cls = Object.fromEntries(fx.map(f => [f.id, f.fidelity && f.fidelity.class]))
    T('H1', 'every fixture carries a fidelity class; the two Thai fixtures are RECONSTRUCTED (95% / 88% of the taught words inferred), Japanese/Mandarin Daily LOG_EXACT_INVENTORY, Japanese/Mandarin Listening LOG_PARTIAL',
      cls['th-daily-2026-10-08'] === 'RECONSTRUCTED' && cls['th-listening-2026-10-08'] === 'RECONSTRUCTED' && cls['ja-daily-2026-10-08'] === 'LOG_EXACT_INVENTORY' && cls['zh-daily-2026-10-08'] === 'LOG_EXACT_INVENTORY' &&
      cls['ja-listening-2026-10-08'] === 'LOG_PARTIAL' && cls['zh-listening-2026-10-08'] === 'LOG_PARTIAL', cls)
    T('H2', 'no historical fixture claims an exact learner state or calls itself a snapshot; the Thai summary says "Not a historical snapshot" and names the reconstructed share',
      fx.every(f => f.fidelity.exactLearnerState === false && f.fidelity.historical8Oct === true) && fx.filter(f => f.language === 'th').every(f => /RECONSTRUCTED learner — \d+% of the taught words inferred\. Not a historical snapshot/.test(f.fidelity.summary)),
      fx.map(f => f.fidelity.summary.slice(0, 90)))
    T('H3', 'the fidelity class is DERIVED from the per-word provenance (re-deriving it gives the stored class) — it cannot drift from the data', fx.every(f => JSON.stringify(fidelityOf(f)) === JSON.stringify(f.fidelity)))
    const syn = ['synthetic-th-daily', 'synthetic-zh-listening'].map(loadFixture)
    T('H4', 'synthetic fixtures are SYNTHETIC (mechanics only)', syn.every(f => f.fidelity.class === 'SYNTHETIC' && !f.fidelity.historical8Oct))
    const dev = importSnapshot({ format: 'tt-learner-snapshot/1', exportedAt: '2026-10-09T02:00:00.000Z', appBuild: 'v676', languages: { th: { words: 2, state: [{ id: fx[0].targets[0].id, status: 'learning', interval: 4, repCount: 2 }, { id: 5, status: 'known', interval: 30 }] } } }, fx)
    T('H5', 'a DEVICE snapshot becomes DEVICE_SNAPSHOT fixtures (exactLearnerState=true, dated, "NOT the 8-Oct learner"), carrying the exact per-word SRS fields and a clock that starts at the export moment',
      dev.length === 2 && dev.every(d => d.fidelity.class === 'DEVICE_SNAPSHOT' && d.fidelity.exactLearnerState && /NOT the 8-Oct learner/.test(d.fidelity.summary) && d.wordState.length === 2 && d.clockStartMs === Date.parse('2026-10-09T02:00:00.000Z')), dev.map(d => d.fidelity))
    const blk = (SRC.match(/\/\/ TT_BENCH_FIXTURES_BEGIN[\s\S]*?\/\/ TT_BENCH_FIXTURES_END/) || [''])[0]
    T('H6', 'the six fixtures embedded in the app (for the in-app benchmark) are exactly the fixture files (regenerating the block gives the same text)', blk === embeddedBlock() && c.ev('TT_BENCH_FIXTURES').length === 6)
  }
  // ══ I — THE IN-APP RUN PATH ══════════════════════════════════════════════════════════════════════════════════════
  {
    T('I1', 'benchmark mode is inert outside its URL: in a normal load TT_BENCH_MODE and TT_BENCH_SANDBOX are null, and the learner app mounts as before',
      c.ev('TT_BENCH_MODE') === null && c.ev('TT_BENCH_SANDBOX') === null && /if \(TT_BENCH_MODE\) ttBenchMount\(TT_BENCH_MODE\)\n  else \{/.test(SRC))
    const same = FIX.every(id => { const fx = loadFixture(id)
      const a = JSON.stringify(applyFixture(c.initVocab && fx.language === 'th' ? c.initVocab() : fx.language === 'ja' ? c.initJapaneseVocab() : c.initMandarinVocab(), fx).map(w => [w.id, w.status, w.lastSeen, w.dueDate, w.repCount, w.interval]))
      const b = JSON.stringify(c.ttBenchApplyFixture(c.ttBenchBank(fx.language), compact(fx)).map(w => [w.id, w.status, w.lastSeen, w.dueDate, w.repCount, w.interval]))
      return a === b })
    T('I2', 'the in-app fixture application (embedded compact fixture) gives the SAME learner state as the Node runner for all six fixtures', same)
    const ws = c.ttBenchApplyFixture(c.initMandarinVocab(), { targets: [], wordState: [{ id: 1, status: 'learning', interval: 6, repCount: 4, okStreak: 2, lastSeen: '2026-10-05', dueDate: '2026-10-11', introducedAt: '2026-09-02', manualKnown: false }] })
    const w1 = ws.find(w => w.id === 1), w2 = ws.find(w => w.id === 2)
    T('I3', 'a DEVICE_SNAPSHOT fixture applies the exported per-word SRS fields exactly (and leaves unexported bank words unseen)', w1.status === 'learning' && w1.interval === 6 && w1.repCount === 4 && w1.okStreak === 2 && w1.dueDate === '2026-10-11' && w1.introducedAt === '2026-09-02' && w2.status === 'new' && w2.repCount === 0)
    const trk = { integrity: { status: 'READY', reasons: [], checkModel: { unresolvedRecalls: [] } }, selectedTargetIds: [1], pairs: [{ targetId: 1, recallIndex: 1, speaker: 'A', chinese: '你好', english: 'hi', prompt: 'say hi', pinyin: 'nǐ hǎo', _source: 'x', _checkHistory: [{ index: 1, outcome: 'accepted', kind: 'model' }] }] }
    // v677 extended the in-app record with target fields (targetSurface, targetPresent …); every legacy field must be unchanged
    const appO = c.ttBenchContentOutcome('zh', 'daily', trk, c.initMandarinVocab()), legO = contentOutcome('zh', 'daily', trk)
    const proj = (o, ref) => Array.isArray(ref) ? ref.map((x, i) => proj(o && o[i], x)) : ref && typeof ref === 'object' ? Object.fromEntries(Object.keys(ref).map(k => [k, proj(o && o[k], ref[k])])) : o
    T('I4', 'the in-app content outcome agrees with the Node runner’s on every legacy field (v677 added target fields on top)', JSON.stringify(proj(appO, legO)) === JSON.stringify(legO))
    const ui = SRC.slice(SRC.indexOf('// TT_BENCH_UI_PATHS_BEGIN'), SRC.indexOf('// TT_BENCH_UI_PATHS_END'))
    const calls = ['establishConvoScene(', 'generateConversationTrack(', 'runQualityCheckCore(', 'finaliseThaiTrackAfterQc(', 'finaliseMainTrack(', 'generateJapaneseScene(', 'generateJapaneseTrack(', 'recoverJapaneseMissingRecall(', 'jazhQcFinaliseAndListen(', 'generateMandarinTrack(', 'generateCohesiveListeningTrack(', 'freezeThaiTargetSelection(']
    T('I5', 'the run path calls the screens’ own pipeline functions (scene → generation → QC → FINAL_TRACK; Japanese auto-recovery; Listening) and never stSet / localStorage / a save handler',
      calls.every(k => ui.includes(k)) && !/stSet\(|localStorage|onSave|saveTrack|setVocab/.test(ui), calls.filter(k => !ui.includes(k)))
    const r = await runOnceUi(loadFixture('zh-listening-2026-10-08'), { mode: 'record', provider: 'sim' })
    const r2 = await runOnceUi(loadFixture('zh-listening-2026-10-08'), { mode: 'record', provider: 'sim' })
    T('I6', 'a UI-path run is deterministic (two recordings send the identical request sequence) and records path ui-path/1 in the cassette',
      JSON.stringify(r.cassette.entries.map(e => e.key)) === JSON.stringify(r2.cassette.entries.map(e => e.key)) && r.cassette.meta.path === 'ui-path/1' && r.cassette.entries.length > 0)
  }
  // ══ J — STORAGE SANDBOX (simulated browser realm) ════════════════════════════════════════════════════════════════
  {
    const fnSrc = SRC.slice(SRC.indexOf('function ttBenchInstallSandbox()'), SRC.indexOf('// Gemini-only recorder at the fetch boundary'))
    class Storage { constructor() { Object.defineProperty(this, '_m', { value: new Map() }) } getItem(k) { return this._m.has(k) ? this._m.get(k) : null } setItem(k, v) { this._m.set(String(k), String(v)) } removeItem(k) { this._m.delete(k) } clear() { this._m.clear() } key(i) { return [...this._m.keys()][i] || null } get length() { return this._m.size } }
    const real = new Storage(), realSS = new Storage()
    real.setItem('tt-gemini-key', JSON.stringify('AIzaSyREALKEY-not-printed-000')); real.setItem('tt-vocab', JSON.stringify([{ id: 1, status: 'known' }])); real.setItem('tt-tracks', '[]')
    const before = JSON.stringify([...real._m])
    const ctx = { Storage, console }; ctx.window = ctx
    Object.defineProperty(ctx, 'localStorage', { value: real, configurable: true, writable: true })
    Object.defineProperty(ctx, 'sessionStorage', { value: realSS, configurable: true, writable: true })
    vm.createContext(ctx)
    vm.runInContext(require('esbuild').transformSync(fnSrc, { loader: 'jsx' }).code + '\nvar __sb = ttBenchInstallSandbox()', ctx)
    const sb = ctx.__sb
    // app-like activity inside the sandboxed realm
    vm.runInContext('localStorage.setItem("tt-vocab", "[]"); localStorage.setItem("tt-gen-draft", "{}"); localStorage.removeItem("tt-tracks"); sessionStorage.setItem("x", "1"); window.storage.set("tt-zh-vocab", "[]")', ctx)
    let blocked = false
    try { Storage.prototype.setItem.call(real, 'tt-vocab', 'HACK') } catch (e) { blocked = /TT_BENCH_SANDBOX/.test(e.message) }
    const key = await sb.readReal('tt-gemini-key')
    T('J1', 'sandbox installed: localStorage / sessionStorage / host storage are in-memory; the app’s writes land there', sb.installed && vm.runInContext('localStorage.getItem("tt-vocab")', ctx) === '[]' && sb.keysWrittenInMemory.includes('tt-gen-draft'))
    T('J2', 'the REAL storage is byte-identical after app writes, and a direct write to the real Storage is refused and counted', JSON.stringify([...real._m]) === before && blocked && sb.realWriteAttemptsBlocked === 1)
    T('J3', 'real storage can only be READ, by name, and every name read is listed (never a value)', typeof key === 'string' && key.length > 10 && JSON.stringify(sb.summary().realReadKeys) === '["tt-gemini-key"]' && !JSON.stringify(sb.summary()).includes(key))
    T('J4', 'the panel refuses to run when the sandbox is not installed (worker returns SANDBOX_NOT_INSTALLED)', /SANDBOX_NOT_INSTALLED — run refused/.test(SRC) && /if \(!sb \|\| !sb\.installed\) return \{ error: 'SANDBOX_NOT_INSTALLED/.test(SRC))
    T('J5', 'the worker reads only the Gemini key and the fallback key; the vocabulary is read only by the explicit device-snapshot button', (SRC.match(/sb\.readReal\('([^']+)'\)/g) || []).every(x => /tt-gemini-(key|fallback-key)/.test(x)) && /ttBenchDeviceFixtures\(sb\.readReal\)/.test(SRC))
  }
  // ══ K — RECORDER / REPLAYER (in-app, browser) ═══════════════════════════════════════════════════════════════════
  {
    const U = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=AIzaSyREAL-KEY-SECRET'
    const body = JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'hi' }] }], generationConfig: { temperature: 0.7 } })
    let k = 0
    const fake = async () => { k++; if (k === 1) { const e = new TypeError('Failed to fetch'); throw e } if (k === 2) return { status: 502, text: async () => '<html>bad gateway</html>' }
      return { status: 200, text: async () => JSON.stringify({ candidates: [{ content: { parts: [{ text: 'ok' }] } }], usageMetadata: { promptTokenCount: 3 } }) } }
    const rec = c.ttBenchCreateRecorder(fake)
    let e1 = null; try { await rec.fetch(U, { body }) } catch (e) { e1 = e }
    const r2 = await rec.fetch(U, { body }); let nonJson = false; try { await r2.json() } catch (e) { nonJson = e instanceof SyntaxError || /SyntaxError/.test(e.name) }
    const r3 = await rec.fetch(U, { body }); const j3 = await r3.json()
    T('K1', 'the in-app recorder keeps network failures (response.error), non-JSON bodies (bodyKind non-json) and normal replies, with real latency — and never the key',
      e1 && rec.entries[0].response.error.name === 'TypeError' && rec.entries[1].response.bodyKind === 'non-json' && nonJson && j3.candidates[0].content.parts[0].text === 'ok' && rec.entries.every(e => Number.isFinite(e.latencyMs)) && !JSON.stringify(rec.entries).includes('SECRET'))
    const rep = c.ttBenchCreateReplayer({ entries: rec.entries })
    let re1 = null; try { await rep.fetch(U, { body }) } catch (e) { re1 = e }
    const rr2 = await rep.fetch(U, { body }), rr3 = await rep.fetch(U, { body })
    let mm = null; try { await rep.fetch(U, { body: body.replace('hi', 'HI') }) } catch (e) { mm = e }
    T('K2', 'the in-app replayer reproduces the failure, the error status and the reply in order; a changed prompt is CASSETTE_MISMATCH (refused, never mocked)',
      re1 && re1.name === 'TypeError' && rr2.status === 502 && (await rr3.json()).candidates && mm && /CASSETTE_MISMATCH/.test(mm.message) && rep.report().mismatches.length === 1)
    const { createReplayer } = require('./benchmark/lib/cassette')
    const nrep = createReplayer({ format: 'tt-cassette/1', entries: rec.entries })
    let ne = null; try { await nrep.fetch(U, { body }) } catch (e) { ne = e }
    const n2 = await nrep.fetch(U, { body }); let nj = false; try { await n2.json() } catch (e) { nj = true }
    T('K3', 'the Node replayer reads the same browser entries the same way (failure re-thrown, non-JSON body re-served as non-JSON)', ne && ne.name === 'TypeError' && n2.status === 502 && nj && (await (await nrep.fetch(U, { body })).json()).candidates)
  }
  // ══ L — IMPORT OF THE FILES THE IN-APP BENCHMARK SAVES ══════════════════════════════════════════════════════════
  {
    const fx = loadFixture('ja-listening-2026-10-08')
    const r = await runOnceUi(fx, { mode: 'record', provider: 'sim' })
    const run = { format: 'tt-benchmark-run/1', fixtureId: fx.id, runNo: 1, fidelity: fx.fidelity, provider: 'SIMULATED (test)', appBuild: 'v676', startedAt: 'x', cassette: r.cassette, outcome: { content: r.content, telemetry: { costUsd: 0 }, log: r.log, error: r.error } }
    const tmp = path.join(B, 'results', 'import-test-tmp')
    const rep = await importBundle([{ format: 'tt-benchmark-bundle/1', fixtures: [], runs: [run] }, run], { outDir: tmp, verify: true })
    T('L1', 'import_bundle: a bundle and the same run’s own file count once; the run is written as a cassette and REPLAYS FAITHFULLY in Node with identical content; its fidelity class travels with it',
      rep.runs.length === 1 && rep.runs[0].replayFaithful && rep.runs[0].contentIdentical && rep.runs[0].fidelity === 'LOG_PARTIAL' && fs.existsSync(path.join(tmp, fx.id + '.live.v676.run1.json')), rep.runs)
    fs.rmSync(tmp, { recursive: true, force: true })
  }
  // ══ M — REPLAY COVERAGE: the screens' steps are now recorded too ═════════════════════════════════════════════════
  {
    const dir = path.join(B, 'cassettes'), files = fs.readdirSync(dir).filter(f => f.endsWith('.json'))
    const metas = files.map(f => ({ f, m: readJ(path.join(dir, f)).cassette.meta }))
    const ui = metas.filter(x => x.m.path === 'ui-path/1')
    const types = ['th-daily', 'ja-daily', 'zh-daily', 'th-listening', 'ja-listening', 'zh-listening']
    const arch = path.join(dir, 'archive-v674'), archM = fs.readdirSync(arch).filter(f => f.endsWith('.json')).map(f => readJ(path.join(arch, f)).cassette.meta)
    T('M1', 'the original v674 recordings are KEPT (archive-v674: ' + archM.length + ', all recorded on v674); the working library (16 legacy + ' + ui.length + ' through the screens\u2019 steps) is re-recorded on the production baseline v677 and covers all six track types',
      archM.length === 38 && archM.every(m => m.appBuild === 'v674') && metas.filter(x => !x.m.path).length === 16 && types.every(t => ui.some(x => x.f.includes(t))) && ui.every(x => x.m.appBuild === 'v677'), ui.map(x => x.f))
    const net = readJ(path.join(dir, 'zh-listening-2026-10-08.ui.neterror.sim.json')).cassette.entries.filter(e => e.response.error).length
    const r429 = readJ(path.join(dir, 'zh-daily-2026-10-08.ui.http429.sim.json')).cassette.entries.filter(e => e.response.status === 429).length
    const jaf = readJ(path.join(dir, 'synthetic-ja-daily.ui.jafail.sim.json')).outcome.log.some(l => /Auto-recovering missing recall/.test(l))
    T('M2', 'gap-filling stress cassettes: dropped connections (' + net + ' recorded failures), rate limits (' + r429 + ' × HTTP 429) and the Japanese screen’s auto-recovery loop', net >= 2 && r429 >= 5 && jaf)
  }
  // ══ N — HUMAN REVIEW PACK ═════════════════════════════════════════════════════════════════════════════════════════
  {
    const pack = readJ(path.join(B, 'evaluator', 'golden', 'golden-v1.review-pack.json'))
    const html = fs.readFileSync(path.join(B, 'evaluator', 'golden', 'golden-v1-review.html'), 'utf8')
    const withCtx = pack.items.filter(i => i.reviewContext && (i.reviewContext.kind === 'listening' ? i.reviewContext.plannedTurnsOfThisScene.length : (i.reviewContext.otherSentencesForThisTarget.length || i.reviewContext.scene))).length
    T('N1', 'the review pack holds all 114 items (TH 35 · JA 36 · ZH 43 — each ≥ 30, the calibration minimum) with their verbatim text and context from the same log (' + withCtx + '/114)',
      pack.items.length === 114 && pack.counts.th === 35 && pack.counts.ja === 36 && pack.counts.zh === 43 && withCtx >= 108)
    T('N2', 'the pack and the review page carry NO model label (blind review): no expected verdicts, no rationale, no error categories, no origin (accepted / rejected)',
      !/"expected":\{|"rationale":"|"labels":\[|"origin":"/.test(JSON.stringify(pack.items)) && !/"expected":\{|"rationale":"|"origin":"/.test(html))
    T('N3', 'model labels stay where they were and are unchanged (golden-v1.json = annotator A, golden-v1.annotator-b.json = annotator B; same sha256 as v675)',
      sha(fs.readFileSync(path.join(B, 'evaluator', 'golden', 'golden-v1.json'))) === '86d396de0e6dcd353ea05abf0b3568049a6a1c0fc3d2be02211ba4f3e722eea9' &&
      sha(fs.readFileSync(path.join(B, 'evaluator', 'golden', 'golden-v1.annotator-b.json'))) === '2483f71a8273d8fee2137b81f795b052237ea0d33e86ff2bece6faa34baedfa7')
    const { importFiles } = require('./benchmark/evaluator/golden/import_human_labels')
    const it = pack.items.find(i => i.language === 'zh')
    const { db } = importFiles([{ format: 'tt-golden-human-labels/1', reviewer: { name: 'R', nativeLanguage: 'Mandarin', isNative: true, reviewedLanguage: 'zh' }, items: [{ id: it.id, verdicts: { grammar: 'ok', naturalness: 'natural', targetUsage: 'correct', cue: 'n/a', qa: 'n/a', coherence: 'n/a', register: 'n/a', usefulness: 'useful' } }, { id: pack.items.find(i => i.language === 'th').id, verdicts: { grammar: 'ok' } }] }], null)
    T('N4', 'human labels import into a SEPARATE file as labelKind HUMAN with the reviewer recorded; a label for another language than the reviewer’s is refused', db.labels.length === 1 && db.labels[0].labelKind === 'HUMAN' && db.reviewers[0].selfDeclaredNative === true)
    const { RUBRIC_VERSION, CLARIFICATIONS, evaluatorPrompt } = require('./benchmark/evaluator/rubric')
    const p = evaluatorPrompt(pack.items.find(i => i.id === 'th-listening-096'))
    T('N5', 'reviewers and the model evaluator use the SAME definitions (rubric ' + RUBRIC_VERSION + ': coherence vs naturalness and usefulness clarified) and the same context', pack.rubric === RUBRIC_VERSION && /INCOHERENT/.test(CLARIFICATIONS.coherence) && p.includes(CLARIFICATIONS.coherence) && /Planned turns of this scene/.test(p) && pack.dimensions.coherence.clarification === CLARIFICATIONS.coherence)
  }
  // ══ O — PRESERVATION ═════════════════════════════════════════════════════════════════════════════════════════════
  {
    const H = path.join(B, 'historical', '2026-10-08-v674'), m = readJ(path.join(H, 'MANIFEST.json'))
    T('O1', 'the six v674 logs are still byte-identical to MANIFEST.json', m.files.every(f => { const b = fs.readFileSync(path.join(H, f.file)); return b.length === f.bytes && sha(b) === f.sha256 }))
    const ev = path.join(H, 'evidence'), need = ['v674-architecture-review.md', 'v674-verbalizability-first-generation.md', 'v674-tests.zip', 'v674-exitcodes.txt', 'v674-fuzz.txt', 'v674-browser-checks.txt']
    T('O2', 'the v674 architecture review, v674 report, v674 test bundle and v674 test evidence are kept in the benchmark (historical/…/evidence)', need.every(f => fs.existsSync(path.join(ev, f))), need.filter(f => !fs.existsSync(path.join(ev, f))))
    const base = fs.readFileSync(path.join(__dirname, 'tt.v674.jsx'), 'utf8')
    const writes = s => (s.match(/stSet\(|localStorage\.setItem\(/g) || []).length
    T('O3', 'v676 adds NO storage write to the app (same stSet / localStorage.setItem call sites as v674; v679 adds exactly one: the Japanese new-generator switch setting)', writes(SRC) === writes(base) + (SRC.match(/stSet\(JA_GEN2_SETTING_KEY, v\)/g) || []).length && (SRC.match(/stSet\(JA_GEN2_SETTING_KEY, v\)/g) || []).length <= 1, [writes(SRC), writes(base)])
    T('O4', 'version v676+', /^v67[6-9]$/.test(c.ev('APP_BUILD_VERSION')) && c.ev('LISTENING_BUILD_VERSION') === c.ev('APP_BUILD_VERSION'))
  }
  console.log(out.join('\n'))
  console.log('\nv676 Step 0 live-capture tooling: ' + (n - fails) + '/' + n + (fails ? ' — ' + fails + ' FAILED' : ' — ALL PASS'))
  process.exit(fails ? 1 : 0)
})().catch(e => { console.log('CRASH ' + (e && e.stack || e)); process.exit(1) })
