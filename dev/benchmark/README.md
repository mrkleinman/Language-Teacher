# Step 0 benchmark: how to use it

This folder holds the measurement system for the generation pipeline. It does not change how tracks are generated.

| Folder or file | What it is |
|---|---|
| `historical/2026-10-08-v674/` | The six live v674 logs from 8 Oct 2026, stored byte-for-byte. `MANIFEST.json` records each file's sha256. These are **historical observations** (one uncontrolled live run each), not benchmark runs. |
| `fixtures/*-2026-10-08.json` | Six reproducible learner fixtures built from those logs by `build_fixtures.js`. Each records the logged belt, the 30 targets, the inventory with per-word provenance (OBSERVED / CROSS_LOG / RECONSTRUCTED), the untaught words seen in the log, and the historical outcome. |
| `fixtures/synthetic-*.json` | The test-suite learner (every word taught, Shodan belt). Used only for record/replay equivalence, never as a learner baseline. |
| `run.js` | Runs one fixture through the app's real creation path, in `record` (sim or live) or `replay` mode. |
| `lib/cassette.js` | Record/replay at the Gemini REST boundary. |
| `lib/determinism.js` | Pins the clock and `Math.random`, so a run can be replayed exactly. |
| `equivalence.js` | Replays every cassette against a build. "Equivalent" means identical requests and identical learner-facing content. |
| `telemetry_diff.js` | Shows report lines before and after a change, for the same cassette. |
| `evaluator/` | The independent evaluator: `rubric.js`, `evaluate.js` (panel and votes) and `calibrate.js` (agreement and kappa), plus the golden dataset in `golden/`. |
| `import_snapshot.js` | Turns a real learner export from a device into DEVICE-provenance fixtures. |
| `cassettes/` | Recorded runs. All current ones come from the **simulator**: they show the mechanics work and that behaviour is unchanged, and **say nothing about teaching quality**. |
| `results/` | Reports: equivalence, the before/after telemetry, and golden-set agreement. |

## Typical commands

```sh
# offline: is a new build behaviour-equivalent to the recorded runs?
node benchmark/equivalence.js                    # defaults to ./tt.compiled.js

# controlled LIVE baseline (needs network access to Gemini and GEMINI_API_KEY; the key is never written)
GEMINI_API_KEY=… node benchmark/run.js --fixture zh-daily-2026-10-08 --mode record --provider live --runs 3
#   → benchmark/cassettes/zh-daily-2026-10-08.live.run{1,2,3}.json  (repeat for the other five fixtures)

# replay a recorded run with no model (a changed prompt or setting causes CASSETTE_MISMATCH, never a mock answer)
node benchmark/run.js --fixture zh-daily-2026-10-08 --mode replay --cassette benchmark/cassettes/zh-daily-2026-10-08.live.run1.json

# independent evaluation (the panel must be a different model tier or family from the generator, gemini-2.5-flash-lite)
GEMINI_API_KEY=… ANTHROPIC_API_KEY=… node benchmark/evaluator/evaluate.js --items benchmark/evaluator/golden/golden-v1.json \
   --panel gemini:gemini-2.5-pro,anthropic:<model-id> --repeat 2 --out benchmark/results/eval-golden.json
node benchmark/evaluator/calibrate.js --golden benchmark/evaluator/golden/golden-v1.json --against benchmark/results/eval-golden.json
```

## v676: the live baseline from inside the app (no local setup)

The app has a **benchmark mode**. Open it from Settings → "🧪 Benchmark mode", or add `#tt-benchmark` to the app's address.

- **It runs the six fixtures × 3** through the same steps the app's own screens take after target selection (`ttBenchRunFixture`, the `TT_BENCH_UI_PATHS` block in tt.jsx).
- **It uses your Gemini key, read-only.** The key never appears on the page or in any file.
- **Each run happens in a fresh hidden page,** so no run carries anything over from the previous one.
- **Your saved data cannot be touched.** Before any app code runs, the page swaps your saved data for an empty in-memory copy for its whole lifetime, and the real browser storage refuses every write.
- **It saves one file per run plus one bundle.** Import them with:

```sh
node benchmark/import_bundle.js ~/Downloads/tt-benchmark-v676-….json   # → cassettes/live/*.json + results/live-baseline-v676.{json,md}
```

Each imported run is replayed in Node at once. "Faithful + identical content" proves the recording is complete. A later build can then be compared against the baseline offline with `equivalence.js`.

| Tool | What it does |
|---|---|
| `coverage_audit.js` | Shows which track types, runner paths and failure modes the recorded cassettes reach, and lists the gaps. |
| `browser_bench_test.js` | Checks the whole in-app flow in headless Chromium, with Gemini faked at the network. That covers mechanics only, not teaching quality. |
| `lib/fidelity.js` | Gives every fixture its fidelity class: `DEVICE_SNAPSHOT` (exact, as exported), `LOG_EXACT_INVENTORY`, `LOG_PARTIAL`, `RECONSTRUCTED` (Thai: most of the inventory inferred, never a historical snapshot) or `SYNTHETIC`. |
| `evaluator/golden/golden-v1-review.html` | The blind native-speaker review page; it shows no model labels. Answers are imported with `evaluator/golden/import_human_labels.js` into a separate `golden-v1.human-labels.json`. |
| `evaluator/calibrate.js --human …` | Compares the model labels or the evaluator with the human labels. |

## In the app (browser console only; no user interface; inactive unless you start it)

```js
await ttBenchmark.exportLearnerSnapshot()   // downloads tt-learner-snapshot-YYYY-MM-DD.json (read-only; per-word SRS state)
ttBenchmark.startRecording('zh daily 9 Oct') // then generate a track as usual
ttBenchmark.stopRecording(); ttBenchmark.downloadCassette()   // tt-cassette-….json (API key redacted)
```

`node benchmark/import_snapshot.js tt-learner-snapshot-….json` writes DEVICE fixtures. They keep the historical target sets, and they record the export date: the learner on that date is not the learner of 8 Oct.

A browser cassette is an exact record of a live run, but it cannot be replayed byte-for-byte, because the browser uses the real clock.

## Honesty rules this folder enforces

- **Each measure says what it is.** Historical logs, simulator cassettes, live cassettes, model labels and human labels are each labelled as such.
- **"Calibrated" needs real human labels.** It is claimed only against human-reviewed golden labels: at least 30 items per language and at least 85% agreement on every dimension.
- **Nothing missing is filled in.** A run with no key prints `NOT RUN`, and a vote that cannot be parsed is reported as `UNVERIFIED`. Neither is ever replaced by a simulated or default value.

## v678: the Gen2 shadow pilot (new generator, disabled by default)

The new pipeline is `candidate selection → teachability → target freezing → composition → independent acceptance`, and persistence is off. It lives in the `TT_GEN2` block of tt.jsx and is reachable **only** from the benchmark: `ttBenchRunFixture(fx, { pipeline: 'gen2' })`. In the app that means Benchmark mode → "Shadow pilot — the NEW generator".

```sh
# simulator (mechanics only) — one fixture through Gen2
node benchmark/run.js --fixture zh-daily-2026-10-08 --mode record --provider sim --pipeline gen2
# compare the current generator (v677 live runs) with live pilot runs, using the same deterministic measures
node benchmark/compare_gen.js --old benchmark/live/v677 --new benchmark/live/v678-gen2 --emit-review benchmark/results/compare-review
# → blind-items.json (pipeline hidden) for the independent evaluator / native reviewers; add their labels with --labels
```

| Location | Contents |
|---|---|
| `live/v677/` | The 18 live v677 runs, the comparison baseline. All 18 replay identically on v678. |
| `cassettes/` | The simulator library, re-recorded on the production baseline v677. The original v674 recordings are in `cassettes/archive-v674/`. |
| `cassettes/gen2/` | 16 Gen2 simulator recordings, including stress runs (unreadable judge, declined Daily and Listening words, a rejected scene). |
| `results/v677-audit/` | The Stage 1 audit: mechanical metrics, per-run content dumps, and the independent (uncalibrated) review of the 450 READY recalls. |
