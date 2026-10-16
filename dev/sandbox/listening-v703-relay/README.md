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
| run6 | third word set (21 words new to these runs) — stopped: three salvage passes cut the bus stop → restaurant join again and again (19/30 left) | — | — | — | 19 |
| run6b | run6 replayed (answers 1–16 reused) + joins become scene breaks | READY | **30/30** (episode judge 4/5) | 40 | 17 |
| run6c | third set, fresh, + time-greeting split, นะคะ — stopped: the story judge failed the planned "good evening" as a mid-track greeting | — | — | — | 17 |
| run6d | fresh, + reopening scene says so (title, judge) — stopped: the continuity check flagged the reply สวัสดีค่ะ | — | — | — | 8 |
| run6e | run6d replayed (answers 1–7 reused) + continuity exception | READY | **30/30** (one conversation, story judge 4/5, no cut) | 40 | 29 |

run2 was interrupted by a container restart after request 6; the resumed bridge reused answers 1–6 only for
byte-identical requests (`run2/log.before-restart.txt` is the first part of its log).

run5 first stopped at the farewell scene: ไว้เจอกันนะคะ (a lesson word) was rejected as a misplaced ไว้. After the fix it was
restarted, reusing answers 1–7. Its salvage then cut a whole 5-turn situation for one bad price question + answer, because
every turn "replies to" the one before and the cut followed the chain; run5b is the same run with the narrow cut (only that
exchange goes, the rest is re-checked). `nextreviewed.js` builds the REVIEWED id list that selects the next word set.

run6 also first stopped on ช่วย...ได้ไหม "not heard" in ช่วยเลือกได้ไหมคะ (an inner '...' slot); restarted after the fix with answers 1–5.
Its salvage then showed that a defect only at the JOIN of two situations cannot be cut away — each cut moved the join, until
two situations and 11 words were gone (`run6/log.txt`). run6b: such joins become scene breaks, judged scene by scene.
Reading run6b's lines found two more faults, now fixed for the next runs: "Good afternoon." answered by "Good evening!" (two
time-of-day greetings were both S1 lesson words) and โชคดีนะค่ะ (should be นะคะ).

run6e's lines still had one wrong ตลอดไป (ฉันต้องขับตลอดไป "I have to drive forever") that the audit passed; a deterministic
rule now rejects ตลอดไป with a duty or a "don't". It also showed ไม่ว่าง ("not free") rejected as unknown although ไม่ and
ว่าง are taught (a greedy split took ไม่ว่า); fixed. Both fixes are in the build used from run7 on.
