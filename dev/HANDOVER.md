# Language Teacher: handover to a Gemini-enabled session (v678, 9 Oct 2026)

## Who and what
- The owner is Leon. He is not technical, so give him one step at a time in plain words.
- The app is a single-file language teacher. The source is `tt.jsx`; `index.html` is built from it and must never be hand-edited. It teaches Thai, Japanese and Mandarin, with Daily tracks (30 targets × 3 recalls) and Listening tracks (one conversation).
- The deployed production version is **v677**. This package is **v678**: v677 plus the Gen2 shadow pilot, a new generator that is **disabled by default** and reachable only from the benchmark. Read `v678-gen2-shadow-pilot.md` first.

## Standing rules (from the owner, verbatim where quoted)
- Work from `tt.jsx`. Build with `node build.js tt.jsx tt.compiled.js`, then `python3 build_index.py tt.jsx build/index-1.shell.html index.html <ver>`, then `node check_sync.js`.
- "Do not print secret values. Report only variable names." "Do not expose actual keys."
- Never claim something is fixed without proof.
- Never weaken QC. Do not relax vocabulary rules. Do not remove difficult words (คะ, หวัง, 那个).
- Preserve SRS, dictionaries, vocabulary ids, belts, new-word quotas, pronunciation, language settings, the 11-check display and learner progress. Do not delete baseline materials.
- Do not change production or deploy a new version unless separately authorised.
- "always have tldr after generation".

## Why this session exists
- The previous session could not reach Gemini: no key, and `generativelanguage.googleapis.com` was refused by its network policy.
- The owner has since saved a **network secret** named "Gemini" on his **Default** cloud environment. It applies to host `generativelanguage.googleapis.com` with header `x-goog-api-key`. The proxy adds the key to requests; the session never sees it, and **there is no GEMINI_API_KEY variable**.
- The app puts its key in the URL (`?key=…`). In this sandbox, send a placeholder there or strip it, and let the proxy's header authenticate. Do this only in benchmark or smoke tooling; never change app code for it.

## First steps (in order; stop and report after step 3)
1. `npm install` (installs esbuild etc.), then `node build.js tt.jsx tt.compiled.js` and `node check_sync.js` (should report IN SYNC v678).
2. **Connectivity check, free.** `curl -sS -o /dev/null -w "%{http_code}" https://generativelanguage.googleapis.com/v1beta/models` should return 200. If it returns 403, check `$HTTPS_PROXY/__agentproxy/status` for the reason and report it.
3. **One small paid smoke call** with `gemini-2.5-flash-lite`, through the app's own `geminiRequest` (see `smoke_gemini.js`, which needs adapting to the proxy header). Report the HTTP status, `modelVersion`, `usageMetadata` and the app's cost record. Never print the key.
4. **Wait for the owner's approval** before anything larger.

## Proposed spending caps (the owner has not yet approved anything beyond step 3)
- One fixture once first (Japanese Daily, about 105 requests; about US$0.035 based on v677), then replay its recording to prove it is complete.
- Only with approval after that: the 18 benchmarks (v677 actual cost US$0.48) or the Gen2 pilot 6 × 1 (about US$0.30, estimated).
- Hard stop at US$0.25 per run and **US$2 for the whole session**, computed from real `usageMetadata`. Keep the app's own request budgets and add no extra retries.

## How to run (see `benchmark/README.md`)
- Replay a recording with no model: `node benchmark/run.js --fixture ja-daily-2026-10-08 --mode replay --cassette benchmark/cassettes/live/ja-daily-2026-10-08.live.v677.run1.json`
- Live run: `--mode record --provider live`, adding `--pipeline gen2` for the new generator. `liveProvider()` in `run.js` currently requires `GEMINI_API_KEY`; adapt it to the proxy-header setup. That is a benchmark-tooling change, not an app change.
- Compare generators: `node benchmark/compare_gen.js --old benchmark/live/v677 --new <dir>`.
- Regression suite: `bash run_all.sh`. Expected: everything passes except tests33 check 2G, which **already fails on deployed v677**.

## What is in this package
| Item | Contents |
|---|---|
| `tt.jsx`, `index.html` | v678 source and build |
| `build/index-1.shell.html` | the page shell `build_index.py` needs |
| `build.js`, `build_index.py`, `check_sync.js` | build and check scripts |
| `harness.js`, `tests*.js`, `run_all.sh`, simulators | the test suite |
| `benchmark/` | runner, fixtures (6 historical + synthetic), the 18 live v677 runs (`live/v677`, `cassettes/live`), the Stage-1 audit, Gen2 simulator recordings |
| `results/v678-*` | the verification evidence for v678 |
| `smoke_gemini.js` | the one-call test (to adapt for the proxy header) |
| `v678-gen2-shadow-pilot.md` | the full report: findings, architecture, acceptance criteria, results |

## Known facts worth keeping
- Thai fixtures are **RECONSTRUCTED**: most of the inventory is inferred from logs, never a device snapshot. Label them that way.
- The v677 baseline: 5 / 18 tracks READY, Listening 0 / 9, coverage 99 / 270.
- Gen2 has been run only on the simulator, which proves mechanics, not quality. It has never been run live.
- Gen2 produces no pronunciation (romaji, pinyin or Thai phonetics). Wiring pronunciation in is still pending.
