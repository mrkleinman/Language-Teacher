# Thai Listening relay runs on the owner's profile (v703, offline)

The real app path (selectRevisionTargets snapshot → generateCohesiveListeningTrack) on the owner's learner profile
(backup 2026-10-15; the backup itself is private and NOT in the repository). Every model request was answered by a
Claude Haiku stand-in (no API cost); `bridge-live.js` is the relay.

| Run | Build | Result | Words heard | Turns | Requests |
|---|---|---|---|---|---|
| run1 | before the v703 Listening fixes (rescue only) | READY | 18/30 (12 moved to Revision) | 27 | 22 |
| run2 | + lesson words exempt from the speaker rule, situation keywords, episode repair, หรอก/เถอะ | READY | **30/30** | 40 | 18 |

run2 was interrupted by a container restart after request 6; the resumed bridge reused answers 1–6 only for
byte-identical requests (`run2/log.before-restart.txt` is the first part of its log).
