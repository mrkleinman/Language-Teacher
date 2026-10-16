# Thai Listening relay runs on the owner's profile (v703, offline)

The real app path (selectRevisionTargets snapshot → generateCohesiveListeningTrack) on the owner's learner profile
(backup 2026-10-15; the backup itself is private and NOT in the repository). Every model request was answered by a
Claude Haiku stand-in (no API cost); `bridge-live.js` is the relay.

| Run | Build | Result | Words heard | Turns | Requests |
|---|---|---|---|---|---|
| run1 | before the v703 Listening fixes (rescue only) | READY | 18/30 (12 moved to Revision) | 27 | 22 |
| run2 | + lesson words exempt from the speaker rule, situation keywords, episode repair, หรอก/เถอะ | READY | **30/30** | 40 | 18 |
| run5 | + '…' pattern targets, ไว้เจอกัน allowed; a second word set (30 words, 21 not in run2) | READY | 25/30 (5 moved to Revision) | 35 | 20 |
| run5b | run5 replayed (answers 1–18 reused) + the narrow salvage cut | READY | **28/30** (2 moved to Revision) | 38 | 20 |

run2 was interrupted by a container restart after request 6; the resumed bridge reused answers 1–6 only for
byte-identical requests (`run2/log.before-restart.txt` is the first part of its log).

run5 first stopped at the farewell scene: ไว้เจอกันนะคะ (a lesson word) was rejected as a misplaced ไว้. After the fix it was
restarted, reusing answers 1–7. Its salvage then cut a whole 5-turn situation for one bad price question + answer, because
every turn "replies to" the one before and the cut followed the chain; run5b is the same run with the narrow cut (only that
exchange goes, the rest is re-checked). `nextreviewed.js` builds the REVIEWED id list that selects the next word set.
