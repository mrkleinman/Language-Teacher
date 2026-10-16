# Thai Listening on the owner's profile: tested until it works (dev branch, not deployed)

The owner reported that the Thai Listening track was failing again (500 words, up to 8th Kyu). I ran the real app path on the
owner's own learner profile (backup 2026-10-15, private, not in the repository): the app chooses the 30 due words, then the
Listening generator runs with every model request answered by a Claude Haiku stand-in. There was no API cost. I read every
finished track line by line, fixed each fault I found in the code, and ran again on new sets of 30 words.

Evidence: `sandbox/listening-v703-relay/` (README, logs, final lines of every run).

## Results

| Word set | Run | Result | Words heard | Judge | Model requests |
|---|---|---|---|---|---|
| 1 (greetings, beach, bus) | run2 | READY | 30/30 | 4/5 | 18 |
| 2 (same 9 core words + 21 new) | run5b | READY | 28/30 (2 to Revision) | 3/5 | 20 |
| 3 (afternoon / evening greetings, captain, fresh fruit) | run6e | READY | 30/30 | 4/5 | 29 |
| 4 (nature, body, clothing: raft, Karen, nose, swimsuit) | run7c | READY | 30/30 | 4/5 | 11 |
| 5 (amulet, Khmer, wood-flower craft, "clear up") | run8 | READY | 30/30 | 3/5 | 20 |

- Each run used the newest build at that time. Sets 1 and 2 ran before fixes 5–11, so their result on the final build is not measured (they were not re-run).
- Set 5 ran start to finish on the final build with no code change during the run.
- Sets 3 and 4 needed fixes mid-run. They were replayed with the earlier answers reused only where the request was byte-identical.
- All five tracks are one conversation; no lines were cut on sets 3–5.
- The judge is the app's own final story check (1–5, pass ≥ 3).

## What was wrong and is now fixed

Each item was found in a real run on the owner's profile and has a regression check in tests49.

1. **"See you later" rejected.** ไว้เจอกันนะคะ was rejected as a misplaced ไว้, although ไว้เจอกัน is itself a lesson word.
2. **Pattern words "not heard".** A pattern word with a gap in the middle was "not heard": ช่วย...ได้ไหม in ช่วยเลือกได้ไหมคะ.
3. **Salvage cut too much.** One bad question and answer took the whole following chain with it: 5 lines and 5 words. Now only that exchange is cut.
4. **Cutting can't fix a join.** At the join between two situations, cutting only moves the gap. In run 6 that lost two whole situations and 11 words. Such joins now become scene breaks, judged scene by scene, and nothing is cut.
5. **"Good afternoon" answered with "Good evening!"** Two greetings for different times of day never open the same meeting now. The later one opens a later scene where the two meet again that day, and the story and continuity checks accept that.
6. **โชคดีนะค่ะ** is now written นะคะ.
7. **ตลอดไป misused.** ต้องขับตลอดไป ("have to drive forever") and อย่ามาสายตลอดไป passed the audit. A rule now rejects ตลอดไป with a duty or a "don't".
8. **ไม่ว่าง ("not free") rejected as unknown.** ไม่ and ว่าง were both taught, but the word splitter took ไม่ว่า ("no matter") first. This check is shared with Daily.
9. **Crowded situations.** A set full of nature, body and clothing words got only 4 situations of 8 words each, with nose and finger in "agreeing when". More situations now join when words have no home, and the situation keywords know these words.
10. **ไม่หรอก ("not really")** was rejected as an unknown word.
11. **A planned reaction after "not really …"** was treated as a contradiction and failed a scene the judge had passed.

## Still not perfect

- **Some lines are a little abrupt**, such as a topic changing with no lead-in. The judge rates these tracks 3–4 out of 5, not 5.
- **Some lesson words cannot be used naturally together** (amulet + flower festival, captain + fresh fruit). The track still uses them all, sometimes stiffly.
- **Request counts vary** from 11 to 29 per track, depending on how hard the words are. At Haiku list prices that is roughly US$0.20–0.40 per track before prompt caching. This is an estimate; no paid run was made.
- **One borderline rule is left as it is.** A line rejected only for wording blocks a new line that carries the same idea. This costs one extra repair; it never lowers quality.
- **Full regression:** the only failures are the same 7 that were already failing before this work (tests33 2G, tests35 2C-th / 2C-zh, tests37 C1, tests39 A5, tests55 cases 3 and 6). tests49: 113/113. tests60: 36/36.

## Next step

Nothing is deployed. Releasing these fixes needs the owner's "go live".

## TL;DR

- **Result:** Thai Listening now reaches READY on the owner's profile for all 5 word sets tested, with 30/30 words on 4 sets and 28/30 on the other.
- **Fixes:** 11 real faults found in these runs were fixed and covered by tests. The biggest:
  - false "unknown word" and "word not heard" rejections;
  - salvage cutting whole scenes;
  - contradictory greetings;
  - crowded scenes.
- **Not done:** quality is good but not perfect (judge 3–4/5), nothing is deployed, and going live needs your approval.
