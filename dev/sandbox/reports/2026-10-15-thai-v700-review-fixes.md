# Thai Daily v700 — why it isn't getting better, and what is fixed (dev branch, not deployed)

Source: the owner's review of `thai-track-15-Oct-2026-daily.txt` (v700, 90/90 READY, rated 5.5/10) and its generation log
(`sandbox/thai-daily-v700-fixture/`).

## Why it isn't improving

Each release fixed the exact lines from the previous review, and none of those came back. But the model writes different sentences every run, and the checks that decide READY are still mostly the model judging itself. That judging is lenient:

- 8 unnatural lines were scored "natural" and passed.
- Every new run brings new awkward lines that no rule exists for yet.

On top of that, v700 added recovery and substitution so the track could finish 90/90. That worked, but it exposed three plain bugs in code that had never run on a real track before:

1. **Stale target IDs after a substitution.** The finaliser swapped สวัสดีครับ for ใกล้ๆ correctly. But the app copied back only the lines and the integrity report onto the track it was showing, so it threw away the new keyword list, target IDs and substitution record. The export therefore still listed 788, and a Listening Track would have expected a word the lesson never taught.
2. **Lines after the goodbye.** A replacement word that had no lines at all got its three lines appended at the very end. The rule that should have found the closing exchange looked for a label that Thai closing lines don't carry.
3. **สวัสดีครับ took 11 paid attempts.** The "only the man says this" rule recognised only bare ครับ / ผม / ค่ะ, not phrases containing them. So every request still told the model to give one of the three lines to Nida. Each line she said was rejected, the same way, 11 times. ผมเอง needed 3 recovery rounds for the same reason.

The cue error ("you're glad her came") came from the step that rebuilds a cue from the English. The person-swap turned "you came" into "her came". The English itself also said more than the Thai ("glad you came" for ผมดีใจ).

## What is fixed

| Review point | Fix |
|---|---|
| 1 Stale target IDs | Every place the app copies a finalised track back (Thai screen ×2, save gate, bench path ×2) now also copies the keywords, `selectedTargetIds`, TrackContext and the substitution record. tests59 1b reproduces the live defect; 1c proves the saved track and its export list the taught word. |
| 2 Speaker-bound words | Phrases with ครับ, a leading ผม, ดิฉัน or a final ค่ะ/คะ are recognised as one speaker's words, and the prompt asks for all three lines from that speaker. If the same speaker conflict comes back 3 checks in a row, paid attempts stop and recovery/substitution takes over. |
| 3 Unnatural Thai | New objective rules reject all 8 reviewed lines (17, 23, 30, 43, 45, 61, 80, 85) plus pair 32, the same งั้นแล้ว mistake. Over the whole export they flag nothing else, and the natural versions pass. Teaching guides were added for ความรัก, ขอให้ and เชิญนั่ง, and the writer prompt lists these mistakes so fewer get written in the first place. |
| 3 Cues / translations | English that adds meaning is corrected in place without regenerating the Thai: "Do you want to come…" becomes "Are you coming…" when there is no อยาก, and "glad you came" becomes "glad" when there is no มา. The cue is then rebuilt. The person-swap now keeps a subject as a subject ("glad she came"), and a second sentence becomes "…, and say …". |
| 4 Track order | Recovered or substituted lines with no group to join are inserted before the closing exchange, so the goodbye always stays last. |

## Results

- tests59 (new, built on the live v700 export): **19/19**.
- The Thai, Japanese, syllabus and Topics suites run after these changes all pass, except tests55 cases 3 and 6. Those two also fail on the unchanged v700 code today.
- Full regression: **2,030 checks passed, 7 failed** (59 suites). The 7 are the same as before: 5 long-standing (tests33 2G, tests35 2C-th / 2C-zh, tests37 C1, tests39 A5), plus tests55 cases 3 and 6, which fail identically on the unchanged v700 code today.

## What this does not fix

The model judge is still lenient. These rules catch the patterns found so far, not the next new awkward sentence. The real fix is a stricter naturalness check, for example a second, stronger judge only for lines a rule can't decide. That would cost a little more per track and needs your decision. It also needs a fresh paid run to measure, which I have not done.

## TL;DR

It looks stuck because each fix covers yesterday's lines, while the lenient model judge keeps passing new awkward ones. The v700 recovery work also exposed three real bugs:

- the saved track lost its swapped target IDs;
- recovered lines were placed after the goodbye;
- speaker-bound phrases like สวัสดีครับ were sent to the wrong speaker 11 times.

All three are fixed, along with the 8 unnatural lines and the broken cues, and proven offline on the live export. Nothing is deployed.
