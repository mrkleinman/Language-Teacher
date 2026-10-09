# Replay coverage audit

38 cassettes replayed against the current build (all faithful: true).

| Cassette | Track type | Runner path | Variant | Status | Requests | Paths reached |
|---|---|---|---|---|---|---|
| ja-daily-2026-10-08.sim.json | ja-daily | legacy v675 Node path | historical fixture | READY | 76 | Japanese scene step (generateJapaneseScene); Mandarin paid regeneration (check 2+); candidates rejected during generation (CANDIDATE_ACCOUNTING); final audit judges; track READY |
| ja-daily-2026-10-08.ui.sim.json | ja-daily | screens (ui-path/1) | historical fixture | NOT_READY | 74 | Japanese scene step (generateJapaneseScene); Mandarin paid regeneration (check 2+); candidates rejected during generation (CANDIDATE_ACCOUNTING); final audit judges; track NOT_READY |
| ja-listening-2026-10-08.sim.json | ja-listening | legacy v675 Node path | historical fixture | READY | 19 | Listening scene committed; Listening repair; track READY |
| ja-listening-2026-10-08.ui.sim.json | ja-listening | screens (ui-path/1) | historical fixture | READY | 19 | Listening scene committed; Listening repair; track READY |
| synthetic-ja-daily.sim.json | ja-daily | legacy v675 Node path | synthetic learner | READY | 75 | Japanese scene step (generateJapaneseScene); Mandarin paid regeneration (check 2+); candidates rejected during generation (CANDIDATE_ACCOUNTING); final audit judges; track READY |
| synthetic-ja-daily.ui.jafail.sim.json | ja-daily | screens (ui-path/1) | {"jaFailTargets":["今日"]} | INCOMPLETE_AWAITING_USER | 48 | Japanese scene step (generateJapaneseScene); Japanese auto-recovery loop (screen); Japanese stop awaiting learner Retry; Mandarin paid regeneration (check 2+); QC replacement / quota recovery |
| synthetic-ja-daily.ui.sim.json | ja-daily | screens (ui-path/1) | synthetic learner | NOT_READY | 73 | Japanese scene step (generateJapaneseScene); Mandarin paid regeneration (check 2+); candidates rejected during generation (CANDIDATE_ACCOUNTING); final audit judges; track NOT_READY |
| synthetic-ja-listening.cohfail.sim.json | ja-listening | legacy v675 Node path | {"cohFail":true} | NOT_READY | 10 | Listening repair; Listening transition / coherence FAIL; Listening targets left unplaced; Listening VACUOUS verdict (0 lines); track NOT_READY |
| synthetic-ja-listening.sim.json | ja-listening | legacy v675 Node path | synthetic learner | READY | 16 | Listening scene committed; Listening repair; track READY |
| synthetic-ja-listening.ui.cohfail.sim.json | ja-listening | screens (ui-path/1) | {"cohFail":true} | NOT_READY | 10 | Listening repair; Listening transition / coherence FAIL; Listening targets left unplaced; Listening VACUOUS verdict (0 lines); track NOT_READY |
| synthetic-ja-listening.ui.sim.json | ja-listening | screens (ui-path/1) | synthetic learner | READY | 16 | Listening scene committed; Listening repair; track READY |
| synthetic-th-daily.reject.sim.json | th-daily | legacy v675 Node path | {"reject":["ดีมากครับ"]} | READY | 206 | Mandarin paid regeneration (check 2+); candidates rejected during generation (CANDIDATE_ACCOUNTING); QC replacement / quota recovery; final audit judges; track READY |
| synthetic-th-daily.sim.json | th-daily | legacy v675 Node path | synthetic learner | READY | 87 | Mandarin paid regeneration (check 2+); candidates rejected during generation (CANDIDATE_ACCOUNTING); QC replacement / quota recovery; final audit judges; track READY |
| synthetic-th-daily.ui.reject.sim.json | th-daily | screens (ui-path/1) | {"reject":["ดีมากครับ"]} | READY | 208 | Thai scene step (establishConvoScene); Mandarin paid regeneration (check 2+); candidates rejected during generation (CANDIDATE_ACCOUNTING); QC replacement / quota recovery; final audit judges; track READY |
| synthetic-th-daily.ui.sim.json | th-daily | screens (ui-path/1) | synthetic learner | READY | 89 | Thai scene step (establishConvoScene); Mandarin paid regeneration (check 2+); candidates rejected during generation (CANDIDATE_ACCOUNTING); QC replacement / quota recovery; final audit judges; track READY |
| synthetic-th-listening.missing.sim.json | th-listening | legacy v675 Node path | {"ln":{"missing":[63,64],"noRepair":true}} | NOT_READY | 23 | Listening scene committed; Listening repair; Listening targets left unplaced; track NOT_READY |
| synthetic-th-listening.sim.json | th-listening | legacy v675 Node path | synthetic learner | READY | 16 | Listening scene committed; Listening repair; track READY |
| synthetic-th-listening.ui.missing.sim.json | th-listening | screens (ui-path/1) | {"ln":{"missing":[63,64],"noRepair":true}} | NOT_READY | 23 | Listening scene committed; Listening repair; Listening targets left unplaced; track NOT_READY |
| synthetic-th-listening.ui.sim.json | th-listening | screens (ui-path/1) | synthetic learner | READY | 16 | Listening scene committed; Listening repair; track READY |
| synthetic-zh-daily.reject.sim.json | zh-daily | legacy v675 Node path | {"reject":["我喜欢"]} | READY | 288 | Mandarin paid regeneration (check 2+); deterministic fallback accepted; candidates rejected during generation (CANDIDATE_ACCOUNTING); QC replacement / quota recovery; final audit judges; track READY |
| synthetic-zh-daily.sim.json | zh-daily | legacy v675 Node path | synthetic learner | READY | 147 | Mandarin paid regeneration (check 2+); deterministic fallback accepted; candidates rejected during generation (CANDIDATE_ACCOUNTING); final audit judges; track READY |
| synthetic-zh-daily.ui.incomplete.sim.json | zh-daily | screens (ui-path/1) | {"reject":["我喜欢"],"noRecovery":true} | GENERATION_INCOMPLETE | 634 | Mandarin generation incomplete (the screen shows an error; no track); Mandarin paid regeneration (check 2+) |
| synthetic-zh-daily.ui.reject.sim.json | zh-daily | screens (ui-path/1) | {"reject":["我喜欢"]} | READY | 288 | Mandarin paid regeneration (check 2+); deterministic fallback accepted; candidates rejected during generation (CANDIDATE_ACCOUNTING); QC replacement / quota recovery; final audit judges; track READY |
| synthetic-zh-daily.ui.sim.json | zh-daily | screens (ui-path/1) | synthetic learner | READY | 147 | Mandarin paid regeneration (check 2+); deterministic fallback accepted; candidates rejected during generation (CANDIDATE_ACCOUNTING); final audit judges; track READY |
| synthetic-zh-listening.sim.json | zh-listening | legacy v675 Node path | synthetic learner | READY | 16 | Listening scene committed; Listening repair; track READY |
| synthetic-zh-listening.ui.missing.sim.json | zh-listening | screens (ui-path/1) | {"ln":{"missing":[30,31],"noRepair":true}} | NOT_READY | 23 | Listening scene committed; Listening repair; Listening targets left unplaced; track NOT_READY |
| synthetic-zh-listening.ui.sim.json | zh-listening | screens (ui-path/1) | synthetic learner | READY | 16 | Listening scene committed; Listening repair; track READY |
| th-daily-2026-10-08.sim.json | th-daily | legacy v675 Node path | historical fixture | NOT_READY | 206 | Mandarin paid regeneration (check 2+); deterministic fallback accepted; candidates rejected during generation (CANDIDATE_ACCOUNTING); QC replacement / quota recovery; final audit judges; track NOT_READY |
| th-daily-2026-10-08.ui.sim.json | th-daily | screens (ui-path/1) | historical fixture | NOT_READY | 208 | Thai scene step (establishConvoScene); Mandarin paid regeneration (check 2+); deterministic fallback accepted; candidates rejected during generation (CANDIDATE_ACCOUNTING); QC replacement / quota recovery; final audit judges; track NOT_READY |
| th-listening-2026-10-08.sim.json | th-listening | legacy v675 Node path | historical fixture | NOT_READY | 44 | Listening repair; Listening targets left unplaced; Listening VACUOUS verdict (0 lines); track NOT_READY |
| th-listening-2026-10-08.ui.sim.json | th-listening | screens (ui-path/1) | historical fixture | NOT_READY | 46 | Listening repair; Listening targets left unplaced; Listening VACUOUS verdict (0 lines); track NOT_READY |
| zh-daily-2026-10-08.sim.json | zh-daily | legacy v675 Node path | historical fixture | READY | 161 | Mandarin paid regeneration (check 2+); deterministic fallback accepted; candidates rejected during generation (CANDIDATE_ACCOUNTING); final audit judges; track READY |
| zh-daily-2026-10-08.ui.http429.sim.json | zh-daily | screens (ui-path/1) | {"http429Every":9} | READY | 181 | Mandarin paid regeneration (check 2+); deterministic fallback accepted; candidates rejected during generation (CANDIDATE_ACCOUNTING); final audit judges; track READY; provider HTTP error (429/5xx) + retry |
| zh-daily-2026-10-08.ui.sim.json | zh-daily | screens (ui-path/1) | historical fixture | READY | 161 | Mandarin paid regeneration (check 2+); deterministic fallback accepted; candidates rejected during generation (CANDIDATE_ACCOUNTING); final audit judges; track READY |
| zh-listening-2026-10-08.sim.json | zh-listening | legacy v675 Node path | historical fixture | READY | 16 | Listening scene committed; Listening repair; track READY |
| zh-listening-2026-10-08.ui.fatal402.sim.json | zh-listening | screens (ui-path/1) | {"fatalAt":6} | NOT_READY | 6 | Listening scene committed; Listening repair; track NOT_READY; fatal provider error (401/402/403) stops the run |
| zh-listening-2026-10-08.ui.neterror.sim.json | zh-listening | screens (ui-path/1) | {"netErrorEvery":5} | READY | 19 | Listening scene committed; Listening repair; track READY; network failure / timeout + retry |
| zh-listening-2026-10-08.ui.sim.json | zh-listening | screens (ui-path/1) | historical fixture | READY | 16 | Listening scene committed; Listening repair; track READY |

## Track types covered

| Track type | Original 16 (v675, legacy path) | All 38 now |
|---|---|---|
| th-daily | 3 | 6 |
| ja-daily | 2 | 5 |
| zh-daily | 3 | 8 |
| th-listening | 3 | 6 |
| ja-listening | 3 | 6 |
| zh-listening | 2 | 7 |

## Gaps in the original 16

- **th-daily** — not recorded through the screens’ steps (the v675 runner used a fixed default scene instead of the model-written scene the screen requests, and no scene contract reached QC)
- **ja-daily** — not recorded through the screens’ steps (no scene step, no screen auto-recovery loop, no TrackContext / cost guard from the screen)
- **ja-daily** — no NOT_READY outcome
- **zh-daily** — not recorded through the screens’ steps
- **zh-daily** — no NOT_READY outcome
- **th-listening** — not recorded through the screens’ steps (the v675 runner used its own attempt id, which seeds the conversation planner, and passed no speech style / attempt record — the requests differ from what the screen sends)
- **ja-listening** — not recorded through the screens’ steps (the v675 runner used its own attempt id, which seeds the conversation planner, and passed no speech style / attempt record — the requests differ from what the screen sends)
- **zh-listening** — not recorded through the screens’ steps (the v675 runner used its own attempt id, which seeds the conversation planner, and passed no speech style / attempt record — the requests differ from what the screen sends)
- **zh-listening** — no NOT_READY outcome
- **all** — never reached: Thai scene step (establishConvoScene)
- **all** — never reached: Thai target romanisation request (only when a target has no romanisation)
- **all** — never reached: Japanese auto-recovery loop (screen)
- **all** — never reached: Japanese finish with exhausted recalls
- **all** — never reached: Japanese stop awaiting learner Retry
- **all** — never reached: Japanese cost guard limit
- **all** — never reached: Mandarin generation incomplete (the screen shows an error; no track)
- **all** — never reached: provider HTTP error (429/5xx) + retry
- **all** — never reached: network failure / timeout + retry
- **all** — never reached: fatal provider error (401/402/403) stops the run
- **all** — never reached: backup Gemini key used (needs two keys; never in a simulator run)

## Gaps remaining with all 38 cassettes

- **zh-daily** — no NOT_READY outcome recorded
- **all** — never reached: Thai target romanisation request (only when a target has no romanisation)
- **all** — never reached: Japanese finish with exhausted recalls
- **all** — never reached: Japanese cost guard limit
- **all** — never reached: backup Gemini key used (needs two keys; never in a simulator run)
- **all** — every cassette is SIMULATED (template sentences): none says anything about teaching quality, and real-model behaviours (prose replies, malformed JSON variety, latency, 429/5xx, timeouts) are absent until live cassettes exist
