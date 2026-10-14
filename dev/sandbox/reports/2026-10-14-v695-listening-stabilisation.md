# v695: Listening repair stabilisation

Scope: Listening only, on the development branch. The Daily generators, learner data, SRS, IDs and settings are unchanged. There were no paid calls, no deploy and no merge. The planner is still meaning-first, now labelled `meaning-first-3` (the corrected successor of `meaning-first-2`), and it stays the default. Nothing falls back to the legacy planner.

Evidence used: your three v694 logs (Thai 23-53-42, Japanese 23-59-52, Mandarin 00-14-02). They are replayed offline with the same learners (the 30 targets each run selected, plus its deferred words), the same situation groupings (identical to the logs), and the replies Claude Haiku actually returned.

---

## 1. Root cause of each failure

### Thai: blocked (TECHNICAL), the repair was cut off at 10,500 tokens

1. **S1 was accepted without two of its lesson words** (พวกคุณ, นักท่องเที่ยว). The v694 local check deliberately skipped "word missing" and left coverage to the whole-plan check (see §4).
2. **The whole-plan check then asked for two "add" repairs.** Each added 2 turns, taking the plan from 41 to 45 turns. That broke the hard 24–44 limit.
3. **S6 asked "เบอร์โทรศัพท์ของคุณคืออะไรครับ" ("what is your phone number?").** Nothing caught this deterministically; only the audit objected. The repair then wrote digits with unknown words (เบอร์, ศูนย์) and 10 words, over the limit of 8.
4. **Round 2 was cut off.** It put four parts, two of them whole situations, into one request using the old verbose turn format. The reply was cut off, the same request (with only a "not valid JSON" note added) was sent again and cut off again, and the plan was blocked (see §6).

### Japanese: blocked after 3 rounds by one today → tomorrow transition

1. **ごめん、聞いちゃった。 was read as an unknown 聞.** The segmenter had no 〜ちゃう / 〜ちゃった contractions, so this correct line kept failing the vocabulary check and pulled in whole-situation rewrites.
2. **S3 ended with an agreement for today.** "じゃ、今日あそこ行こう。 — いいよ、行こう。" was followed by S4 opening "明日、行かない？".
   - No deterministic rule tracked an agreed day, so only the audit noticed, and only in the last round.
   - The repair could not fix it (see §5).

### Mandarin: blocked after 3 rounds by pinyin inside the sentence field

1. **Three correct lines were rejected by over-broad grammar rules:**
   - 好，一起去。 (reply ellipsis: "we" is understood);
   - 你知道哪里吗？ (an embedded question with 吗 after 知道);
   - 好，我拿。 (object ellipsis after "take this").
   These forced replans and worse replacements.
2. **The repairs returned "中文 (pinyin)" in the one text field.** For example: 好，我们一起去。(hǎo, wǒmen yìqǐ qù). The patches were applied without being checked first, so they replaced valid lines. The next validation then counted the pinyin syllables as 16–31 "words" (limit 6) and reported Latin script. Round 3 repeated the pattern, and the plan was blocked.

## 2. Code changes (all in `dev/tt.jsx`, Listening meaning-first path)

### Scene acceptance

- **Each situation must prove its assignment.** A new local defect, `SCENE_TARGET_MISSING`, fires when a lesson word assigned to the situation has not been heard by its end.
- **A replan names the defects.** If the replan still misses a word, the word moves to the best-fitting later situation. This is logged as `LISTENING_TARGET_REASSIGNED`.
- **Each situation gets a status:** `PASS`, `PASS_AFTER_REPLAN`, `PASS_TARGETS_MOVED` or `FAILED`. A failed situation is logged "kept for global recovery, NOT approved".
- **A FAILED situation is never accepted silently.**
  - It is re-checked on the final plan.
  - If a lesson-word or meaning defect is still left, the plan is blocked.
  - Otherwise it is logged `SCENE_STATUS Sk FAILED (…) → CLEARED_BY_GLOBAL_VALIDATION` with the reason.
- **Turn reserve:**
  - Situations are planned toward about 34 turns in all.
  - Each situation gets an aim, and at most aim + 2 turns.
  - The running total may be at most the aims so far + 4, but a situation may always use at least its own aim.
  - The prompt says "N–M turns (never more than M)".
  - The reserve is a planning and repair-room budget. The whole conversation's hard limit is still 24–44.

### Malformed repairs

- **Strict fields.** Scene and repair replies have separate `text` and `pron` fields. The prompt says text must be the target language only (no romanisation, reading, speaker label or notes) and the reading goes in pron.
- **Deterministic cleaning (`lnMfCleanText`).** It strips a speaker label, parenthesised romanisation, trailing romanisation after the sentence end, and "— note…" text. Cleaned patches are logged as `PATCH_TEXT_CLEANED`.
- **Text that cannot be cleaned safely stays as it is**, such as romanisation written before the Chinese. It then fails as SCRIPT_CONTAMINATION.
- **Every patch is validated before it is applied** (`lnMfApply`).
  - The plan is cloned with the patch in place and run through the full validator.
  - The patch is rejected (`PART_REJECTED … PATCH_INVALID`, old turns stay) if any of these happen:
    - a hard defect on its new turns: length, script, vocabulary, grammar, meaning rule, answer type, infeasible question, duplicate, speaker run, state, a greeting or farewell out of place, or more than 3 targets in a turn;
    - it loses a protected lesson word;
    - it changes the required number of turns;
    - it grows a situation past its budget;
    - it pushes the plan past 44.
- **Only the malformed patch is rejected.** Other patches in the same reply still apply.
- **Validation runs after every round, including the last.**

### Bounded repairs

- **Compact repair format.** A reply contains only the new turns, as speaker, intent, asks, about, object, targetIds, text, pron and english. The old addressee / context / expects / action fields are gone.
- **Size limits.** Each repair request is capped at 2,500 tokens. Batches hold at most 10 turns of parts.
- **Truncation:**
  - A batch with 2+ parts is split (`REPAIR_SPLIT`).
  - A single part gets one retry with a shorter instruction.
  - After that it is left alone (`PARTS_TECHNICAL`): the old turns stay and nothing from a cut-off reply is used.
  - The identical request is never sent twice.
- **Scene planning has the same safeguards:** 2,700 tokens per situation, and a shorter retry after a cut-off.
- **Missing words when there is no room.** A missing word is fitted by a same-size rewrite (`TURN_RESERVE`).
  - The first choice is a target-free exchange.
  - Otherwise it is an exchange with ≤ 2 lesson words in the best-fitting situation, with those words protected.
  - An "add" is the last resort, and is refused if it would pass 44.
  - The rewrite instruction now says "exactly N turns, same speakers"; it used to say "add an exchange".

### Cross-scene continuity

- **A deterministic day-state check (`STATE_CONTRADICTION`).** An accepted proposal fixes a day. A later proposal, counter or yes/no question for another future day with no reason word is flagged. Questions such as "how will you get home today?" are not flagged.
- **A transition fault is repaired at the boundary.** The scope covers the last 2 turns of the earlier situation plus the start of the later one, in one bounded request: "return exactly N turns, the first k end S3, the rest start S4".
- **Escalation.** The boundary is used for the first two attempts and for an extra boundary round. A whole-situation rewrite comes only after that.
- **Extra round.** If only 1–2 transition faults are left after round 3, one more bounded boundary round runs.
- **Semantic validation is not loosened.**

### Mandarin grammar rules (narrowed, not removed)

| Line | Now accepted when | Still rejected |
|---|---|---|
| 一起 | the line opens 好 / 行 / 对 / 嗯 / 那 / 走 with no lone 我 (reply ellipsis) | 我一起去。 |
| 吗 + question word | the question word follows 知道 / 记得 (embedded question) | 你去哪里吗？ |
| 拿 / 用 / 找 without an object | it is a reply (好 / 行 / 对 / 嗯 / 可以) after a turn that names 这个 / 那个 / 东西 / 钱 / 它 | 我拿。 out of context |

The rest is unchanged: an error stays an error, and untaught or unnatural lines are still judged by the closed vocabulary and the audit.

### Answer types and the phone number

- **A phone number is asked FOR (permission) and answered with a promise to send it, or with "this is my number".**
- **"What is your number?" is an infeasible question.** It is flagged in Thai, Japanese and Mandarin before the general numbers check.
- **The answer to an infeasible question is not banned.** Only the question is rejected; the promise in the reply may be reused.

### Two final-gate false positives, found by the replays

The English-based continuity heuristic in the final gate wrongly rejected two kinds of line:

- "Twenty-seven years old." → "You're not old at all.": "N years old" is now read as an age.
- Planned replies such as "Not today, tomorrow." → "Okay, tomorrow." and "I'm looking for a big one." → "There isn't a big one here.": a meaning-first turn planned as an accept / counter / decline / answer is no longer treated as a contradiction.

Both changes affect only Oct13-on / meaning-first data. The legacy cassette replay stays byte-identical.

### Japanese segmentation

Godan 〜ちゃう / 〜ちゃった / 〜ちゃって (and 〜じゃう) now resolve to the dictionary verb, so 聞いちゃった → 聞く. Unknown words such as こっち and こと are still unknown.

### Test data

- **`benchmark/v695/plans.js`** holds the three v694 runs:
  - `V694_IDS` / `V694_DEFERRED`;
  - the replies Haiku actually returned;
  - the scripted corrected replans and repairs;
  - the verbatim pinyin-contaminated Mandarin repairs.
- **Learners.** A `dueOrder` option reproduces each run's selection order. With it, all three groupings match the v694 logs exactly.
- **Mock.** Repair replies can now be cut off, or come back as raw text.
- **GOOD fixtures (v691 / v693).** These fixtures put some lesson words in a different situation from the one they are assigned to, and some situations over the new reserve. Their scripted replies were updated so each situation carries its own words within its budget. This is fixture data, not expectations. The defect they now trigger is covered by its own new tests (K1, K4).

## 3. Why the parser accepted Mandarin + pinyin

- The JSON was valid, and the turn builder took `text` as it came.
- The schema had only one text field and no place for a reading, and the prompt never forbade romanisation in it.
- The script and length checks ran only on the whole plan **after** the patch had replaced the old lines.
- So a contaminated patch always got in, failed afterwards, and displaced a valid line.

v695 cleans what is safe to clean, then validates the patch in place before applying it. Test K16 shows a patch with leading pinyin is rejected and never reaches the plan.

## 4. Why the Thai missing targets passed

`TARGET_MISSING` was in the local-check skip list (`LN_MF_LOCAL_SKIP`), and no per-situation assignment check existed. The local check verified vocabulary, grammar and the other rules, but not that the situation said its own words, so it logged "S1 PASS · 8 turns". The gap surfaced only in the whole-plan check, whose only remedy was an add, which broke the 44-turn limit. v695 has `SCENE_TARGET_MISSING` (K1), and the reserve stops adds (K4).

## 5. Why Japanese could not fix the transition

The defect was in two places: S3's agreement ("today") and S4's opening ("tomorrow?").

- The repair scope for a transition was the opening of S4, escalating to rewrites of S4 as a whole situation.
- No scope ever included S3's last turns, so no repair could remove the earlier agreement.
- The fault was also found only by the audit in round 3, because earlier rounds were busy with the false 聞 vocabulary failure.

v695:

- finds the contradiction deterministically, at S4's local check (K9);
- repairs S3's last 2 turns and S4's first 2 turns together in one 4-turn request;
- needs one repair call in the replay, and no situation is rebuilt;
- keeps a failed boundary patch at boundary level for the second attempt (K11).

## 6. Why Thai hit 10,500 tokens

- **The cap.** The v694 repair call asked for `maxTokens: 3500`. The Anthropic adapter sets `max_tokens = 3 × that` (10,500), and adaptive thinking counts toward it.
- **The request.** Round 2 asked for four parts in one reply, two of them whole situations. Each turn was in the verbose format, with addressee, context, expects, action and object for every turn.
- **The retry.** After the reply was cut off, the same request was sent again with a "not valid JSON" note added: same parts, same size. Nothing split the batch or shortened the reply.

v695 changes this in three ways:

- only the new turns come back, in the compact format;
- requests are batched at ≤ 10 turns and capped at 2,500 tokens (7,500 after the adapter);
- a cut-off batch is split, and a single part gets one shorter retry (K6, K7).

## 7. Actual results

| Check | Result |
|---|---|
| tests49 (meaning-first, incl. new section K, 17 tests) | **89/89** |
| Section K run against the v694 code with the same fixtures | **0/17**: Thai, Japanese and Mandarin each end NOT_READY for the same reason as the live run (Thai TARGET_MISSING, Japanese unknown 聞, Mandarin 一起 grammar) |
| Production replay (v682-final4 cassettes, ja / th / zh) | **0 mismatches**, content identical |
| check_sync | IN SYNC v695 |
| Full regression (tests1–53, snapshot) | **OFFLINE REGRESSION: OK**: 52 suites. The only failures are the 3 known pre-existing ones: tests33 2G (already failing in deployed v677), and tests35 2C-thTH / 2C-zhZH (their replay inputs are not in the package). tests23–39 (legacy planner) are otherwise unchanged and passing. |

Full plan assembly + final validation from the **v694 regression fixtures**, each through selection → grouping → per-situation plans → local checks → validation → audit → repair → commit → final gates:

| | Status | Targets | Turns | Model calls (plan / repair / QC) | What happened |
|---|---|---|---|---|---|
| Thai | READY | 30/30 | 42 | 10 / 0 / 2 | S1 missing words caught → replan; phone question caught → replan; two situations over the reserve re-checked and named |
| Japanese | READY | 30/30 | 44 | 11 / 1 / 3 | 聞いちゃった accepted; こっち / こと replanned; today → tomorrow fixed by one 4-turn boundary repair |
| Mandarin | READY | 30/30 | 42 | 7 / 0 / 2 | 好，一起去 accepted first time; no repairs needed |

In all three: 0 new targets, SRS untouched, ≤ 3 targets per turn, two speakers, one conversation, closed vocabulary, and hard lengths 8 / 7 / 6.

Variants also covered:

- Thai: invalid phone patch rejected then fixed (K5); reserve rewrite instead of add (K4); split on cut-off (K6); a cut-off every time → NOT_READY, nothing published (K7).
- Japanese: a bad boundary patch rejected, then a second boundary repair (K11).
- Mandarin: pinyin cleaned (K15); a patch that cannot be cleaned is rejected (K16); 你知道哪里吗 / 好，我拿 accepted while 你去哪里吗 / 我一起去 / 我拿 out of context still fail (K14).

**These are mocked model replies.** They prove the pipeline catches, repairs and refuses the right things. They do not prove the real model will write good replans. The scripted replans and repairs return a correct answer; Haiku may not.

## 8. Risks and costs

### Risks

- **Real replans may not comply.** If Haiku keeps missing a situation's words or ignores the turn limit, the run spends more calls: a replan, then a reassignment, then a global rewrite. It still ends honestly: READY only after every check passes, otherwise NOT_READY.
- **Over-reserve situations.** The v694 replies ignored budgets (they had none), and two to four situations per language ended over the reserve, cleared at the end. Japanese reached exactly 44 turns. The new prompt states the limit, but compliance is unproven.
- **More calls when plans overshoot.** A budget-only overshoot triggers one replan per situation, about 1–4 extra plan calls.
- **The day-state rule is narrow** (days only, not times or places). Other transition faults still depend on the audit, which now has a boundary repair to use.
- **The final-gate continuity heuristic is still English-based.** Two false positives were narrowed; others may exist.

### Costs (estimates; no paid calls were made)

- **Clean run per language:** about 7–12 plan calls, 1–2 audits, 0–2 repairs and 1 coherence judge — about US$0.01–0.03 at Haiku prices.
- **Worst case per language:** about US$0.05. The repair cap is now 7,500 output tokens per call instead of 10,500, and requests are smaller.

## 9. Is a single live test justified?

**Yes: one controlled run per language (three runs), on your device, with the export kept.**

- The offline replays show v695 handles every point where the three v694 runs failed.
- The remaining unknown is whether the real model follows the new rules (situation words, turn limit, separate pron field, phone pattern, boundary repairs), and only a live run can show that.
- Estimated total: about US$0.05–0.15, hard cap US$0.20.
- A NOT_READY result would still be useful: the log now names each situation's status, every rejected patch and every cut-off.

I have not run it. It needs your approval.

---

## TL;DR

- **Thai** accepted a situation that was missing two of its words, broke 44 turns by adding turns, then sent one oversized repair twice and hit the 10,500-token cap.
- **Japanese** could not undo "today" because repairs never touched the earlier situation, and a false unknown 聞 wasted rounds.
- **Mandarin** applied repair lines with pinyin inside them without checking first, after three over-strict grammar rules had rejected correct lines.
- **v695 changes:**
  - situations must carry their own words or are explicitly FAILED;
  - turns are reserved;
  - every patch is validated before it is applied;
  - repairs are compact, split on a cut-off, and never resent identically;
  - a day-state check and a boundary repair fix transitions;
  - the Mandarin rules are narrowed.
- **Results:** tests49 89/89. All three v694 runs replayed offline now assemble to READY 30/30. The same tests fail 0/17 on v694. Replay 0 mismatches.
- **Not proven:** these are mocked replies; Haiku's own behaviour is untested. I recommend one live run per language (about US$0.05–0.15). Waiting for your approval. No deploy, no merge.
