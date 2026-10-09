# The development sandbox

Everything in `dev/` is development only. **Production is `../index.html` (v677), and nothing here touches it.**
`dev/index.html` is rebuilt from `dev/tt.jsx` when needed and is never committed, so the branch carries no installable
development page.

## The loop: build → generate → validate → diagnose → fix → retest

```sh
cd dev
bash sandbox/sandbox.sh setup          # fresh container: npm install, restore baseline builds from git history
bash sandbox/sandbox.sh build          # tt.jsx → tt.compiled.js (+ index.html for the browser tests) + sync check
bash sandbox/sandbox.sh test           # 1. offline regression, real compiled app, no model
bash sandbox/sandbox.sh equivalence    # 2. the 18 live v677 runs replayed: production behaviour unchanged?
bash sandbox/sandbox.sh live ja-daily-2026-10-08 0.25 gen2   # 3. ONE real Gemini run, hard cost cap
bash sandbox/sandbox.sh inspect sandbox/runs/<runId>         # 4. readable sheet + independent production checks
bash sandbox/sandbox.sh compare sandbox/runs/<runId> ...     # 5. deterministic measures vs the v677 runs
bash sandbox/sandbox.sh spend          # money spent, from Gemini's own usage figures
node sandbox/rescore.js sandbox/runs/<runId> [target|*] [x]  # FREE: re-check every recorded candidate with the current gates
node sandbox/blind.js export <dir> <runs…> / score <dir>     # blind review set (romaji included) and per-generator totals
```

After step 4, read `inspection.md` yourself. A READY status is not success. Fix in `tt.jsx`, then repeat from `build`.

## What makes a live run trustworthy

| Guarantee | How |
|---|---|
| The real app code runs | `tt.compiled.js` is compiled from `tt.jsx`; the run enters through `ttBenchRunFixture`, the same entry the in-app Benchmark mode uses. |
| The real model answers | Requests go to `generativelanguage.googleapis.com` via the sandbox proxy, which adds the key as a header. The key never reaches this code; the app's URL key is a placeholder that is stripped before sending. Node needs `NODE_USE_ENV_PROXY=1` for this; `live.js` sets it itself. |
| No silent substitution | With `--pipeline gen2`, any request without a `[task: gen2-…]` prompt tag is refused, unsent, and reported (`pipeline-guard.json`). Nothing is ever mocked. |
| Money is bounded | Before each request its worst case (prompt + full `maxOutputTokens`) is priced. If it could cross the run cap (default US$0.25) or the session cap (US$2, set by the owner; `spend-ledger.json`), it is not sent, and the app gets HTTP 402 `SANDBOX_COST_CAP`, so it stops without retrying. Actual spend comes from `usageMetadata`. |
| The record is complete | Every run is replayed offline with no model straight afterwards and must reproduce identical learner-facing content. |
| Learner data is safe | The learner comes from a benchmark fixture applied to a fresh in-memory copy of the word banks. There is no saved learner data in the sandbox, and Gen2 persistence is off. |

## Files

| File | Purpose |
|---|---|
| `sandbox.sh` | the commands above |
| `test_all.sh` | every suite in parallel, with a per-suite exit code and PASS / FAIL / BLOCKED counts. The old `run_all.sh` grepped its output and hid crashed suites. |
| `baselines.js` | restores v641–v677 from the production `index.html` history, pinned by commit; v677 is proven byte-identical to the deployed page |
| `live.js` | one capped, guarded, replay-verified live run → `runs/<runId>/` (`run.json` = cassette + outcome, `summary.json`, `log.txt`) |
| `rescore.js` | re-checks every candidate a live run recorded with the current deterministic gates, at no cost: what a gate change would reject or let through, before paying for a retest |
| `blind.js` | blind review export (shuffled, source hidden, romaji included) and scoring per generator |
| `reports/` | written results, e.g. `2026-10-09-japanese-daily-gen2.md` |
| `inspect.js` | `inspection.md` (every recall, cue, translation, romaji, independent checks, the v677 recalls for the same target) and `bench-run.json` for `compare_gen.js` |

## Known gaps in the offline suite

- tests33 2G fails, as it already does on deployed v677.
- These checks are reported BLOCKED, never as passes:
  - tests35 2C (TH / ZH): `replay_v673_listening_plan.js` and `logs673/` were not in the package or the Drive folder.
  - tests12 R: v646 was never published, so the v646 half cannot run; the current-build half runs as R-cur.
