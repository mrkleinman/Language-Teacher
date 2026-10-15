# Thai Daily v702 review → towards 8/10 (dev branch, not deployed)

Source: the owner's review of `thai-track-15-Oct-2026-daily.txt` (v702, 90/90 READY, rated 6.0/10), its generation log
(`sandbox/thai-daily-v702-fixture/`) and the plan "To reach 8/10". This covers stages 1–3 of that plan, which are offline and
free. Stage 4, a full paid run audited on all 90 lines, needs the owner's approval.

## 1. Why v702 kept lines the checker had flagged

**Pairs 11 and 73.** The group checker flagged ผมอยากรักเขาเสมอครับ and คุณดูหิวนะร้านใกล้ๆอร่อยมากครับ and asked for a rewrite. The rewrites failed a hard rule: one dropped เสมอ, the other was 9 words when the limit is 7. The code then threw away the rewrite **and kept the flagged original** as a valid line, logging "(original kept)".

**Now.** The flagged line is marked `QC_FLAGGED_NOT_REPAIRED` with the checker's reason, and its slot goes to the normal fail-closed quota recovery. A failed repair never puts the original back, as Stage 2 of the plan requires.

## 2. What is fixed

| Review point | Fix |
|---|---|
| 11, 73 kept after being flagged | Never kept (above). tests60 A1–A4: both slots are recovered and 90/90 is still reached. |
| 15–17 romantic promise to a friend | New rule: a romantic promise to the listener when the scene says the two are friends or colleagues is `RELATIONSHIP_MISMATCH`. It is checked in the early generation check, so the line is rewritten at once, and in the final audit. Teaching guides for ตลอดไป and เสมอ also say not to swap one for the other. |
| 20 ได้ผมลอง… lost its space | ได้ before a pronoun is a reply of its own; the spacing repair keeps "ได้ ผมลอง…". |
| 27, 28 X นะ / question + นี่ครับ | Rule `NI_KHRAP_AFTER` (นี่ครับ comes first). Guide added. |
| 33 วันนี้ไม่ได้เจอกันตั้งนาน | Rule `TODAY_LONG_TIME`. Guide added: said when people meet again, and the three lines do three different things. |
| 33–35 three near-identical lines | A line that is only the target plus particles is a "bare echo". The first is allowed; a second is rejected, in the early check and the final audit. |
| Greeting came after the catch-up | Greeting words (ไม่ได้เจอกันตั้งนาน, สวัสดี…, ยินดีที่ได้รู้จัก, สบายดีไหม…) move as a whole group to just after the opening greeting. |
| 46 เหตุผลในการมาเป็นอะไร | Rule `REASON_PEN_ARAI` (use คืออะไร). Guide added. |
| 50 ชื่ออะไรก็ได้ | Rule `QWORD_INDEFINITE_SENSE`: a question-word target followed by ก็ได้ / ก็ตาม is a different meaning ("whatever"). Guide added. |
| Cue 10 "Ask whether he always trusts him." | New **final cue check**, deterministic and free (§3). It now reads "Ask if Thana always trusts him." |
| Cue 54 "for you" | The English is corrected to "My secretary arranges appointments for me." (the Thai has no คุณ). The cue is rebuilt from it. |
| Cue 68 "… with them" | English: "Then shall I go to the Grand Palace with you?". Cue: "Then ask if you should go to the Grand Palace with her." |
| Export still said th-gen-v657 / qc-v657 | Now `th-gen-v703-echo-relationship · qc-v703 · final-v703-cue-lint`, so the export shows which code ran. |

## 3. The final cue check

The cue check runs at the start of every final audit, so a changed cue loses its old verdict and is judged again on its final text. It rebuilds a cue from the line's English only when it finds one of these defects:

- the listener left as "you", e.g. "Offer to buy you a pair of shorts.";
- an ambiguous "he … him", which it fixes by naming the listener;
- "Say" followed by a command, e.g. "Then say teach you slowly";
- "them" or "themselves" for one person;
- two raw sentences;
- inverted word order, e.g. "Ask what café is this.";
- "bangkokians" not capitalised.

A rebuilt cue replaces the old one only if it has no defect itself. On the v702 export it changes 14 of 94 cues and leaves the other 80 exactly as they were. On v699 and v700 every change was checked by hand and is an improvement.

## 4. Stage 1: calibrating the Haiku judge

The test set has **20 lines the owner rejected** (v699, v700, v702) and **20 lines from v702 the owner accepted**. Each was judged with the app's exact naturalness prompt, with Haiku stand-ins answering in place of the API, so there was no API cost. A line counts as rejected below 4/5, the app's threshold. Data: `sandbox/thai-calibration-v703/`.

| | Bad lines caught | Critical caught | Good lines wrongly rejected |
|---|---|---|---|
| Haiku judge alone (prompt as the app sends it) | 13/20 (65%) | 3/5 | 1/20 |
| Judge told who the speakers are (tried, then removed) | 12/20 | 4/5 | 2/20 |
| New objective rules alone | 18/20 | 5/5 | 0/20 |
| Rules + judge + never-keep fix | **20/20** | **5/5** | 1/20 (5%) |

- The judge alone misses the friend-romance lines: it never sees the scene. Telling it who the speakers are caught those two but lost others. Run-to-run variance is about as large as the difference, so I removed that change rather than add prompt cost.
- **Honest caveat:** the rules were written from these same lines, so 18/20 is not proof that they catch the *next* new mistake. Only a fresh run audited line by line (Stage 4) measures that.
- In a first attempt I gave the judge the previous line as context, which the app's Daily audit does not do. That caused 7 false rejections for "non sequitur", so the results above use the app's real prompt.

**False alarms.** Across 7,941 distinct Thai sentences stored in the repo, the new rules flag only the v702 lines they target.

## 5. Cost and time

**Saving: prompt caching.** The writer prompt is about 14k characters per word. Its rules and allowed-word list are identical for all 30 words of a track, but they used to sit after the per-word target line, so they could not be reused.

- **Change:** the per-word lines now come after the shared part, and the shared part (84% of each prompt) is sent to Haiku as a cached block. Later requests read it at 10% of the input price.
- **Gemini:** gets exactly the same text, without the mark.
- **Server function:** now forwards text blocks with `cache_control: {type: "ephemeral"}` (at most 4). Until it is deployed, the old server function simply joins the blocks, so nothing breaks.
- **Old-run replays:** with the newer Daily switch off, the prompt is byte-identical to v702.
- **Estimate:** generation was 54% of the US$0.145 track cost, so caching should save about US$0.03 a track, roughly 20%. This is an estimate until a live run reports cache reads.

**Added cost:**
- a flagged line or a second echo now costs one recovery or regeneration (about 2–4 small requests a track at v702's rate);
- a changed cue is re-judged inside the final audit's existing batch.

The new writer guidance should mean fewer bad lines are written in the first place. Net: lower than v702. Time: about the same.

## 6. Tests

- **tests60** (new, built on the live v702 export): **36/36**.
- **tests50 F3:** updated on purpose. It pinned "a failed rewrite → original kept", which the owner's plan reverses. It now checks that the flagged original is marked for recovery. 20/20.
- **tests16 X:** the version-pin regex accepts qc-v7xx (same widening as before).
- **tests45:** the replay stand-in for the Haiku server reads text blocks. **83/83**.
- **tests59:** 19/19.
- **Full regression:** 2,066 passed, 7 failed (the same 7 known failures; see §8).

## 7. Next step: needs approval

Stage 4 is one full 30-word Haiku Daily run, then an independent audit of all 90 lines against the owner's rubric and gates. Expected cost is about US$0.12–0.15 through the site's Haiku server function. That run is the only way to know whether the track now reaches 8/10, and it also measures the caching saving. I have not run it.

## 8. Full regression

**60 suites on a frozen copy of this build: 2,066 checks passed, 7 failed.**

- The 7 are the same ones that fail on the unchanged earlier builds:
  - 5 long-standing: tests33 2G, tests35 2C-th / 2C-zh, tests37 C1, tests39 A5;
  - 2 from tests55: cases 3 and 6, which are date-dependent and also fail on v700 today.
- The run also found one new failure: tests13 I1. A comment I added named the generation model outside its own code block, which that test forbids. I reworded the comment, and tests13 passes again (28/28).

## TL;DR

- **Why 6/10:** v702 kept two lines its own checker flagged, because their rewrites failed. Its judge also cannot see that a romantic promise to a friend is wrong.
- **Fixed:**
  - a flagged line is never kept;
  - every Thai and cue defect in the review is now caught by a free rule or fixed by a deterministic cue check (14 cues fixed, 80 untouched);
  - "long time no see" goes first, echoes are rejected, and the version labels show the active code.
- **Measured offline:** rules + judge catch 20/20 known bad lines with 1/20 false rejections. That is in-sample, so not proof of 8/10.
- **Price:** prompt caching should make tracks cheaper (about −20% estimated).
- **Not done:** nothing is deployed, and the full paid test run waits for your approval.
