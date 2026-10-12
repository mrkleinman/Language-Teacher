# Phase 2 — evidence, release candidate, and what is structurally wrong

**Date:** 2026-10-12

**Scope:**
- Offline work only, using the existing recorded runs.
- No new paid Gemini calls.
- No deployment, no learner data touched, and the experimental generator is not switched on.

## TL;DR

- **Evidence is preserved.**
  - The development branch is `claude/session-continuation-check-a19meq`, at commit 6e03cd1 before this report.
  - The final report is complete in the repo; the Google Doc copy was cut off.
  - The known suite exceptions are **tests33 2G** and **tests35 2C-thTH / 2C-zhZH**. The final report now names both.
- **Release candidate is ready for your approval.**
  - Branch `claude/v683-release-candidate`, commit **ca4453c**.
  - It contains only the quota table, Japanese 10th Kyu = 5, the Mandarin "Next targets" display and their tests.
  - It is built from a commit that predates the experimental code, so that code is simply absent.
  - The three recorded v682 live runs replay through it byte-for-byte: 527 requests, 0 differences, identical tracks.
- **Japanese scene contamination: the root cause is the plan design, not the scene words.**
  - Each word's three uses are chosen from its grammar label (verb / adjective …), not from how the word is used in conversation.
  - Abstract uses ("describe that something is so") leave the model to fill the gap with the scene's objects (shop, then train).
  - Old v682 also told the model to use "a different everyday context" for recall 3. I removed that counterweight.
- **Japanese has no working quality gate, in v682 or the new generator.**
  - Its AI group check answered "clean" **94 times out of 94** across three runs.
  - Its cue check gave 89–90% of cues the top score, yet the blind reviewer found 6–12 misleading cues per run.
- **Mandarin 86/90: all four failures are planning problems, not vocabulary.**
  - 可以 / 想 / 要 were told to "suggest doing it together". The model wrote 我们一起去吧 ("let's go together"), which needs no modal, and the validator correctly rejected it 17 times.
  - 这个 #2 was fixed on 我喜欢这个。, already used for the word 我.
  - Recovery re-sent the same instructions, so it failed the same way.
  - No hand-written backup existed for any of the four.
- **Proposed next step:** six structural changes (section 6), all offline-testable first. Live verification needs about US$0.20, which I am asking you to approve. Two decisions are yours: the Japanese register of すみません / いいえ, and the release.

## 1. Evidence

| Item | Value |
|---|---|
| Development branch | `claude/session-continuation-check-a19meq` |
| Last commit before this phase | `6e03cd1e8d5ab4531d03008db4b05a9dff1e4db5` |
| Release-candidate branch | `claude/v683-release-candidate` at `ca4453cb9fe7823638aa663783198c21287df0ea` |
| Deployed production (main) | d2669bc (v682) |
| Complete final report | `dev/sandbox/reports/2026-10-12-final-report.md`, sections 1–7 plus a corrections note |
| Known suite exceptions | tests33 **2G**: a real failure, present since deployed v677. tests35 **2C-thTH / 2C-zhZH**: blocked because `replay_v673_listening_plan.js` and `logs673/` are not in the package. |
| Live runs | All 11 runs are recorded under `dev/sandbox/runs/*v683*`, and each replays offline identically. |

## 2. Release candidate (`claude/v683-release-candidate`, ca4453c)

- **Contents:**
  - the one quota table, with Thai Mukyu ⚠ 5 → 3 and Japanese 10th Kyu = 5;
  - Mandarin "Next targets (30) · 5 new · 25 review" and the 30-word generation heading;
  - the tests for these;
  - the v683 version label.
- **The generator code is v682's; the proofs:**
  1. **Baseline:** dev commit 5b831e7 builds an index.html byte-identical to the one deployed on main.
  2. **Change set:** compared with that baseline, the candidate changes only the quota constants and selection quota, the dashboard and heading display, and the version labels (53 lines added, 34 removed in `tt.jsx`).
  3. **No experimental code:** zero teaching-plan symbols in the source, the compiled app or the page (tests43 R1).
  4. **Replay:** the three recorded v682 live Daily runs replay through the candidate with every request byte-identical. Japanese 99, Thai 178 and Mandarin 250 requests; 0 mismatches, 0 unused, identical tracks (`sandbox/rc_replay_check.js`).
  5. **Tests:** the full offline suite is OK, with only the known exceptions. The browser tests pass 7/7 (display and quota) and 9/9 (resumable generation).
- **Approval:** the candidate is not merged and not deployed. Releasing it means copying its built `index.html` to main, which waits for your approval.

## 3. Japanese: why the scene contaminates the recalls

The evidence comes from the recorded prompts of the v682 and new runs.

1. **The plan's uses come from the grammar label, not from the word's job.**
   - 好き ("like") is labelled an adjective, so its plan says: "describe that something is so · ask whether it is so · say it is not so".
   - "Something" is a hole the model fills with the nearest concrete noun, which is the scene's: この電車、好きだよ ("I like this train").
   - The same mechanism produced 入る in the first run's shop scene.
2. **A counterweight was removed.**
   - v682's recall 3 said "a different everyday context".
   - The plan's applications carry no situation, so the scene is the only situation the model sees.
   - That is why v682, with an even stronger "every recall must fit THIS scene", stayed general: its most frequent words were 思う / 何 / 明日.
   - The new runs lean on scene nouns: 店 / 入る, then 駅 / 電車 at 14%.
3. **The scene planner writes one physical setting.**
   - Every mini-scene restates it, for example "standing near the departure boards", "deciding which train to take", "looking at their tickets".
   - Both that premise and the "lesson theme" line go into every recall prompt.
4. **"Already used in this track" is not the main cause.**
   - I suspected the growing list of earlier sentences (up to 87 lines) was snowballing the topic.
   - The very first prompt, with an empty list, already came back one-third on-topic, and the rate barely rises later.
   - The list does make prompts long, but it is not what started the drift.
5. **Example shapes conflict with the plan.**
   - The Japanese prompt still says "NATURAL PATTERNS … use one of these shapes" (これ、好き？ / それ、好き？) beside the plan.
   - Mandarin lost its example lists in the earlier work; Japanese did not.

**Fix direction:**
- The plan for each word must name uses that the word itself needs. Each use should carry its own everyday situation.
- The scene should shrink to who is speaking to whom (relationship and register) for Daily recalls.
- No noun or verb lists are involved.

**Register errors** (ください / です / ですか, いいえ):
- Every Japanese track must give three recalls each to すみません (itself a polite form) and いいえ (a formal "no") inside a casual "friends" register.
- The model resolves the clash by switching to talking with a stranger, which brings polite forms. This happened in v682 too (どこで買いましたか？).
- The register check rejected some of them (はい、行きます / はい、分かりました) but not all.
- **This is a curriculum decision.** Either these words get an explicit polite or stranger context, or they keep the casual frame and are taught only in their casual uses (すみません as a light "sorry / excuse me" between friends, ううん instead of いいえ). Please choose.

**Unnatural sentences accepted:**
- The Japanese AI group check is a rubber stamp. It answered "clean" **94/94** in v682 and both new runs, and 31 of those replies copied the template's placeholder reason.
- It is never shown the register, the cue or the plan.
- It is told "simple repetitive sentences are GOOD".
- It runs at temperature 0.7 and is the same Flash-Lite model grading its own output.

**Misleading cues:**
- The cue check gave 5/5 to 89–90% of cues. It is told "if a learner would produce this sentence, score 5; never score a synonym below 4".
- The generator, the cue check and the blind reviewer each define a good cue differently.
- So the misleading cues the reviewer found (6–12 per run, old and new) pass unseen.

## 4. Mandarin: the four missing recalls (86/90)

All attempts were read from the recording.

| Recall | Attempts | What the model wrote | Why it was rejected | Cause class |
|---|---|---|---|---|
| 可以 #3 | 5 | 我们明天可以去 (same use as #2) → 我们一起去吧 ×4 | target missing (validator correct) | **Planning** |
| 想 #3 | 7 | 我们一起去 / 我们一起去，好吗？ / 我们一起去吧 / 我们不去了 ×2 | target missing (correct) | **Planning** |
| 要 #3 | 6 | 我们一起去吧 ×4 / 我不想去 / 我们明天一起去吧 | target missing (correct) | **Planning** |
| 这个 #2 | 4 | 我喜欢这个。 ×4 | already used for the word 我 (correct) | **Duplicate handling + recovery** |

**Planning:**
- 可以 / 想 / 要 are modal verbs but were planned as ordinary verbs.
- Use 3 was "NEGATE or SUGGEST — suggest doing it together".
- A suggestion ("let's go together") needs no modal, so the model dropped the word every time.
- The prompt also told it "use it as an action someone does" (TARGET ROLE: VERB), which is wrong for a modal.
- Natural third uses existed with the learner's words, for example 我不想去 (the model even wrote that, but for 要), 你可以吃这个 and 我要这个.

**Validation:** correct in every case. The target really was absent.

**Restrictions:** not the cause. The needed words (不, 吃, 这个, 去) were all taught.

**Duplicate handling and recovery:**
- 这个 #2 was correctly planned ("as the object of a verb"), but the model kept returning the one sentence already taken, even when told.
- Recovery re-sent the same instructions, so it failed identically.
- No hand-written backup sentence exists for any of the four. That is correct: no string-built backups were added.

**The 86 accepted recalls:**
- They passed only the rule-based checks. Mandarin's AI quality stage runs only after a track is complete, so these 86 have **never** been AI-checked. v682 made 42 such calls on its complete track.
- They can be preserved: the v682 resumable-generation mechanism keeps accepted recalls and asks only for the missing ones (browser test 9/9).
- A targeted repair must then send the repaired track through the same QC as a complete one.

## 5. Acceptance criteria and the numbers they give today

**Method:**
- Same fixed fixtures, with old v682 and the new generator compared on identical learner states.
- Blind review: shuffled sentences, source hidden.
- **All labels are AI judgements (Claude reviewers), not native-speaker certification.**

**Definitions:**
- **Completion:** recalls accepted out of 90, and whether the track was built.
- **False acceptance (FA):** an accepted sentence the blind reviewer marks as a grammar error, unnatural, misleading English or the wrong sense.
- **False rejection (FR):** a rejected candidate rejected for a *quality* reason that the blind reviewer judges a good recall. Rejections for untaught words, a missing target or duplicates are rule decisions and are reported separately.
- **Cue accuracy:** reviewer labels: cue misleading / copies the answer / ok.
- **Meaningful variety:** recalls of the same word that are the same use with one word swapped, counted mechanically. Plus **topic concentration:** the share of lines using the single most frequent content word other than the target.

| | Completion | FA (serious problems) | FR (quality) | Misleading cues | Same-use repeats | Topic concentration |
|---|---|---|---|---|---|---|
| Thai v682 | 90/90 READY | 8 / 90 | 5 of 8 quality rejections* | 0 | 6 | — |
| Thai new | 90/90 READY | **3** / 90 | 4 of 9* | 2 | 3 | — |
| Mandarin v682 | 90/90 READY | 3 / 90 | 2 of 9 (arguable) | 1 | 1 | — |
| Mandarin new | **86/90, no track** | 3 / 86 | 3 of 4 (arguable) | 5 | 0 | — |
| Japanese v682 (2 reviews) | 90/90 READY | 2 / 90 · 1 / 90 | 0 of 1 | 1 · 6 | 3 | 11% (思う) |
| Japanese new, first run | 89/90 | 5 / 89 | — | 6 | 0 | 11% (明日), 店 8% |
| Japanese new, rerun | 90/90 READY | 3 / 90 | 3 of 4: 2 are polite forms correctly rejected by the register rule, 1 arguable (あそこは何？) | 6 | 0 | **14% (駅)** |

\* Thai rejection reasons are logged per *batch*, not per sentence (about 105 of 120 rejected Thai candidates per run have no recorded reason). So Thai false rejections **cannot be measured reliably** from current logs.

**Rule rejections judged good sentences by the reviewer** (`dev/sandbox/compare/v683-acceptance/`):

- **Untaught word:** 13/15 (Japanese), 7–15 (Mandarin). The sentences are fine but correctly blocked by the closed vocabulary. They cost about 15 wasted attempts per track.
- **Target missing:** 0 of 16 judged good. The check is right.
- **Same use:** judged individually good, as expected, because a single sentence cannot show repetition.

**Proposed pass bar** for any future switch-on decision:

1. At least **2 live runs per language**, because each run picks one scene and Japanese varied from 72% to 69% between two runs.
2. Completion 90/90 in every run.
3. FA ≤ v682's.
4. Misleading cues ≤ v682's.
5. Fully-clean share ≥ v682's on the same fixtures.
6. Same-use repeats ≤ 1 per track.
7. Topic concentration ≤ 12%.
8. A native-speaker spot check before any language is switched on.

## 6. What remains structurally wrong, and the proposed changes

These are not implemented: I am reporting before changing code, as you asked.

1. **The plan is driven by grammar labels.**
   - Proposal: one curated "function class" per word in the bank (modal, preference, degree word, response token, politeness formula, question word, demonstrative, …), each with uses that *require* the word and carry their own situation.
   - Example: a modal gets "ask permission or ability · say what you want or can do · refuse or say you can't".
   - This is data in the bank, not rules in the validators.
2. **The context hierarchy is wrong for Daily recalls.**
   - Proposal: the teaching plan first.
   - The scene shrinks to the relationship and register line.
   - Remove the physical setting and lesson theme from recall prompts; they stay for framing lines and Listening.
   - Remove the Japanese "use one of these shapes" example list, as was done for Mandarin.
3. **Quality gates do not gate.**
   - The Japanese group check (94/94 "clean") and the lenient cue check need replacing. The replacement should see the register, the cue and the planned use, return per-sentence verdicts, and run at low temperature.
   - Its agreement with the blind labels must be measured **on the recorded sentences before it is trusted** (about US$0.01 of judge calls).
4. **One cue definition.** The generator, the checker and the reviewer must share one definition, for example: "an instruction a learner can act on, that leads to this sentence and not a near neighbour".
5. **Recovery repeats the failed instructions.**
   - On a repeated failure (target missing, already used), recovery should switch to a *different* planned use that needs the word, instead of re-sending the same prompt.
   - Accepted recalls should be kept, and only the missing ones asked for.
   - A repaired track must go through the same AI QC as a complete one; today an incomplete track is never AI-checked.
6. **Thai rejection logging:** log each rejected sentence with its reason, so Thai false rejections become measurable.

**Proposed live budget** (needs your approval; nothing is spent until then): **US$0.20 cap**.

| Step | Estimate |
|---|---|
| Judge calibration on recorded sentences | ≈ US$0.01 |
| Mandarin targeted repair of the 4 missing recalls from the recorded 86 | ≈ US$0.01 |
| Mandarin, 2 full 30-word runs | ≈ US$0.065 |
| Japanese, 2 full 30-word runs | ≈ US$0.07 |
| Thai, 1 full run (verifies the offline-only repeat fix) | ≈ US$0.045 |
| **Total** | **≈ US$0.19** |

**Decisions needed from you:**
1. Japanese すみません / いいえ: give them an explicit polite context, or teach only their casual uses?
2. Approve the release candidate for deployment, or hold it.
3. Approve, change or decline the US$0.20 budget for the next phase.
