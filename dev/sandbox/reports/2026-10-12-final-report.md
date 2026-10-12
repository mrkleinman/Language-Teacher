# Language Teacher — Generation Architecture Stabilisation: final report

Date: 2026-10-12 · Branch: `claude/session-continuation-check-a19meq` · Nothing merged, nothing deployed, no learner data touched.

## TL;DR

- **The new generator ("teaching plan") is built and tested, but it is switched off.** The app still runs the v682 generator exactly as deployed, which remains the rollback. Only the sandbox can turn the new generator on.
- **Accuracy on the known problem sentences improved a lot.** On the 26 sentences in the regression set that a rule can decide:
  - v682 got 17 right. It accepted 4 bad sentences (一緒ある？, 明日分かる？, 有不。, บ้านหลังนั้น…) and rejected 5 good ones.
  - The new generator gets 25 right. It accepts 1 bad sentence (明日分かる？) and rejects no good ones.
- **Blind teaching-quality review, judged by AI and not native-verified:**
  - **Thai: clearly better.** 79% of sentences fully clean vs 72%. Grammar errors fell from 5 to 1.
  - **Mandarin: better sentences, but incomplete.** 85% fully clean vs 77%. However, only 86 of 90 recalls were produced, so no track was built.
  - **Japanese: not better.** 69–72% fully clean vs 73%.
- **Repeated "same sentence with one word swapped" recalls dropped:**
  - Japanese: 3 → 0.
  - Thai: 6 → 3 in the live run; the remaining three are closed by a later fix that has been tested offline only.
  - Mandarin: 1 → 0.
- **Quotas now agree everywhere and follow your table.** Japanese 10th Kyu = 5. **Thai Mukyu drops from 5 to 3**, as your table says. Mandarin Next Targets shows all 30 words (5 new · 25 review).
- **Spend:** US$0.230 of the US$0.25 cap on 11 real Gemini 2.5 Flash-Lite runs. No request was refused and no simulated answers were used.
- **Recommendation:**
  - Approve the quota and Mandarin display changes for release, with the new generator still switched off.
  - **Do not switch the new generator on yet**, because Japanese quality is not better and Mandarin cannot reliably reach 30 words at Mukyu.

## 1. What was built

All changes are in `dev/tt.jsx`, commits 6ccbfad → 98cf479.

**Owner decisions 2 and 3 (live as soon as released)**

- **One new-word table for all three languages:**

  | Rank | Thai | Japanese | Mandarin |
  |---|---|---|---|
  | Mukyu | 3 | 3 | 5 |
  | 10th–9th Kyu | 5 | 5 | 5 |
  | 8th–7th Kyu | 7 | 7 | 7 |
  | 6th–5th Kyu | 10 | 10 | 10 |
  | 4th–3rd Kyu | 12 | 12 | 12 |
  | 2nd Kyu–Shodan | 15 | 15 | 15 |

  - The dashboard, the word selector, the generation screen, the logs and QC all read this one table.
  - Every track still has 30 targets.
- **Mandarin display:**
  - The "Next targets" card shows the whole Daily Track, for example "Next targets (30) · 5 new · 25 review".
  - The generation heading reads "TARGETING 30 WORDS · 5 NEW · 25 DUE".
  - The "Learn New Words" card is unchanged, and selection and saved progress are untouched.
- ⚠ **Thai Mukyu learners will get 3 new words per Daily Track instead of 5.** This follows your table, but it is a visible change for new Thai learners.

**The teaching-plan generator (behind a switch that is off everywhere except the sandbox)**

- **One teaching plan per target word.** The plan states the word's meaning, its word class and three different uses (for example: ask, say, suggest). The same plan drives three things:
  - the instruction to the model,
  - the repair message when an attempt fails, which names the real failure and the clashing sentence,
  - the check that rejects two recalls that are the same use.
- **No more string-built backups.**
  - Mandarin "有X / 我要X" joins, which produced 有不。, are gone.
  - Japanese add-on frames, which produced 一緒ある？, are gone.
  - Thai gloss-guessed templates are gone.
  - Only hand-written backup sentences remain.
- **No more contradictory instructions:**
  - Mandarin no longer says "similar structures are DESIRABLE" or copies example sentences.
  - Japanese no longer says "particles are free" while the check rejected かな.
  - The Japanese scene no longer has to appear in every line.
- **Your Japanese grammar decision (Decision 1), implemented in both the instructions and the checks:**
  - あ / え are free, but only for a real reaction.
  - かな and sentence-ending な are allowed as scaffolding. The English must show the uncertainty.
  - The "don't do" な, だけ and しか stay restricted.
  - Scaffolding never counts as vocabulary and never advances SRS.
- **Language-specific grammar fixes, each found in a real log or live run:**
  - Thai classifier guidance now goes by meaning, not spelling. หลัง "after/back" is no longer taught as the house classifier.
  - A Thai classifier always comes with its noun. ใบนี้ had been translated as "this leaf" in a shop.
  - Mandarin 很 + feeling verb is now accepted (我很喜欢这个 / 我很想吃). The old check wrongly rejected these standard sentences.
  - Mandarin 这个太好吗？ is now rejected.

## 2. Old vs new correctness on the regression corpus

- The corpus is 33 entries, AI-judged and not native-verified. The first report said 34; that count was wrong and has been corrected.
- 26 entries can be decided by a rule. The other 7 need a meaning judgement and are listed separately in the corpus.

| | Correct | Bad sentences accepted | Good sentences rejected |
|---|---|---|---|
| v682 | 17 / 26 | 4: 一緒ある？, 明日分かる？, 有不。, บ้านหลังนั้นสวยมากครับ | 5: どれがいいかな？, 一緒に乗らない？, 駅で待ってるよ。早く来てね。, 我找你, 我等你 |
| Teaching plan | 25 / 26 | 1: 明日分かる？ | 0 |

- **Remaining false acceptance (明日分かる？):** the checker still accepts this sentence if the model writes it. The backup frame that used to produce it has been removed.
- **New live findings, added as regression checks P9–P15 in `dev/tests43.js`:**
  - 我很喜欢这个 and 我很想吃 were wrongly rejected.
  - 这个太好吗？ was wrongly accepted.
  - Several kinds of repeated frames slipped through.

## 3. Live sandbox tests (real app code, real Gemini 2.5 Flash-Lite)

- Fixtures are the same learner state as the v682 runs, at 5, 10 and 30 target words. Each run was recorded and replayed offline to confirm the record is complete.

| Stage | Japanese | Thai | Mandarin | Spend |
|---|---|---|---|---|
| A — 5 words | 15/15 | 15/15 | 14/15 (很 recall 3) | US$0.0255 |
| B — 10 words | 30/30 | 29/30 | 29/30, and 29/30 again after a fix | US$0.0579 |
| C — 30 words | 89/90, then 90/90 READY after a fix | **90/90 READY** | **86/90, no track built** | US$0.1466 |
| **Total** | | | | **US$0.2301 of US$0.25** |

- Old v682 on the same 30-word fixtures produced 90/90 READY in all three languages, at US$0.033 (Japanese), US$0.046 (Thai) and US$0.047 (Mandarin).
- New cost per 30-word track: US$0.034–0.036 (Japanese), US$0.045 (Thai) and US$0.031 (Mandarin).
- Paid model requests per accepted recall fell for Thai (1.98 → 1.84) and Mandarin (2.78 → 1.63). Japanese was flat (1.10 → 1.09–1.16).
- After each stage I read every accepted and rejected sentence before going on. The fixes listed in section 1 came from those readings.

## 4. Blind teaching-quality assessment

- **Method:**
  - Each reviewer received old and new sentences mixed together, shuffled, with the source hidden.
  - The reviewers were independent Claude instances, so **these are AI judgements, not native-speaker verification**.
  - "Fully clean" means correct grammar, natural, accurate English, the right sense of the word and useful for teaching.
- The files are in `dev/sandbox/compare/v683-blind/`.

| | Fully clean | Unnatural | Grammar error | Misleading English | Weak teaching value | Cue copies the answer | Misleading cue |
|---|---|---|---|---|---|---|---|
| Thai old | 72% | 7 | 5 | 1 | 8 | 9 | 0 |
| **Thai new** | **79%** | 3 | 1 | 1 | 10 | 11 | 2 |
| Mandarin old | 77% | 2 | 0 | 1 | 7 | 89 | 1 |
| **Mandarin new** (86 recalls) | **85%** | 3 | 0 | 1 | 6 | 24 | 5 |
| Japanese old (review 1 / review 2) | 73% / 73% | 0 / 0 | 0 / 0 | 2 / 1 | 5 / 7 | 48 / 55 | 1 / 6 |
| Japanese new: first run / rerun | 72% / 69% | 3 / 3 | 0 / 1 | 3 / 2 | 9 / 15 | 34 / 21 | 6 / 6 |

**What the evidence supports:**

- **Thai is more natural and more accurate.** Grammar errors fell from 5 to 1, unnatural sentences from 7 to 3, and repeated frames from 6 to 3.
- **Mandarin sentences are cleaner.** Far fewer cues simply repeat the answer (89 → 24), and there are no repeated frames. But a few more cues mislead (1 → 5), and the track is incomplete.
- **Japanese is not better.**
  - The fixes removed the problems they targeted: 入る in 10 lines → 0, かな in 10 → 5, repeated frames 3 → 0.
  - But the model then drifted onto the scene's next topic, trains ("I like this train").
  - Polite forms (ください / です) and いいえ still appear in casual speech, as they did in v682.
  - Openers like え、 are still over-used: 16 of 90 lines, vs 10 in v682.
- **Sample size:** each comparison is about 90 sentences, so differences of 2–3 sentences are within noise. Only the Thai and Mandarin gaps are large enough to call.

## 5. Remaining defects (honest list)

1. **Mandarin at Mukyu cannot reliably produce 30 targets × 3 recalls.**
   - The learner knows very few words. Flash-Lite keeps dropping the target word for function words (可以, 想, 要, 这个 as the third recall).
   - The new generator reports this honestly ("generation incomplete: 86/90", with Retry missing recalls) and does not build a weak track.
   - v682 reached 90/90 partly with repetitive "这个很X" lines.
2. **Japanese scene drift and filler interjections** (section 4). These are not solved.
3. **Japanese casual register:** the polite forms ください / です and いいえ appear in casual lines (old and new).
4. **Thai same-frame check:** the fix for recalls accepted in earlier attempts is tested offline only. The live budget ran out before it could be re-run.
5. **One hand-written Mandarin backup has bad English:** 钱多吗？ is glossed "Are there a lot of money?". It is a data fix, not done yet.
6. **明日分かる？** is still a validator false acceptance (section 2).
7. **The bigger repair the brief asked for is not done.** The Thai pipeline still has many stages. I made the plan the single source of instructions and checks, but I did not remove the old stages, because the old path must stay intact as the rollback.

## 6. Answers to the brief's questions

- **Are 30 natural targets achievable in every language?**
  - **Thai: yes**, 90/90 READY at 10th Kyu with better quality.
  - **Japanese: yes mechanically** (90/90 READY on the rerun), but quality is about 70% fully clean, the same as or slightly below v682.
  - **Mandarin at Mukyu: not reliably** with the current vocabulary and model (86/90). I did not loosen vocabulary or raise retries to force it.
- **Does Mandarin display the expected number of words?** Yes. Next Targets shows 30 (5 new · 25 review), the generation heading shows 30, and Learn New Words still shows 5. This is confirmed in a real browser test.
- **Do the quotas agree?** Yes, all from one table. This is confirmed by tests43 Q1–Q5 (including Japanese 10th Kyu = 5 of 30 via the real selector) and by the browser test.
- **Tests:**
  - The full offline suite passes, apart from the long-known exception tests33 2G.
  - tests43 passes 24/24, and the browser tests pass 7/7 and 9/9.
  - Seven older checks were updated to your quota table: six for the Thai Mukyu number, and one test that called the selector without naming the language.
  - I committed step 1 before running the full suite, which was a process slip. It was caught and fixed in step 2.
- **Commits:** 6ccbfad (quota + display), 65b3a5d (teaching plan), 5cca95e (Stage A/B fixes), 98cf479 (Stage C fixes), plus this report.

## 7. Deployment recommendation

1. **Ready on your approval: release v683 with the teaching-plan switch OFF.**
   - Learners get the quota table and the Mandarin display fix, and keep the v682 generator.
   - Tests show the switch-off path behaves exactly like v682.
   - Please confirm the Thai Mukyu 5 → 3 change first, because new Thai learners will notice it.
2. **Not ready: switching the teaching plan on.**
   - It could reasonably be enabled for Thai first, after a native speaker reviews the Thai sample in `dev/sandbox/compare/v683-blind/items-th.json`.
   - Japanese needs the scene and register work above.
   - Mandarin needs a decision on how to handle Mukyu function words when the learner knows too few words. That is a curriculum question, not a code patch.
3. I have not merged or deployed anything.
