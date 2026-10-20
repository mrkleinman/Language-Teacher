# Thai Daily: fixes from the owner's v705 review (20 Oct)

The owner rated the live v705 track 5.5/10 (v702: 6.0) and asked for five things before v706. Their instruction: test tracks are fine, but no live track until it is fixed. Nothing here has been deployed.

## What went wrong with the earlier testing

Before this review, I rated relay test tracks with a blind reviewer that scored about 7. That reviewer was easier than the owner.

The reviewer prompt now says that "a sentence that is merely understandable is a defect". On the owner's own v705 track it gives **5.8**, against the owner's 5.5. All test-track scores below use this calibrated reviewer.

## The owner's five requirements

### 1. The cue fixer must never make English worse

**Cause.** The final cue fixer swapped "you" for he or she by text rule without fixing the verb. That produced "Ask what vehicle do he need…", "make sure him arrive" and "Thank him they have fun too". The cue judge checks meaning, not grammar, so these got through.

**Fix:**
- **Grammar guard.** The guard looks for these patterns:
  - do/did + he/she;
  - does + I/you/we/they;
  - make sure + him/her;
  - thank + pronoun + clause;
  - he/she + a bare verb.
- **Fixes that fail the guard are discarded.** The original cue is kept.
- **Broken cues are repaired.** A cue that still fails the guard counts as a failed cue in the final audit and goes to repair. A repair that is itself broken is refused.
- **Question marks.** A Thai statement no longer gets a "?" in English ("ค่ะ เดินทางปลอดภัยนะคะ" → "Yes, have a safe trip."). Closing lines are included, and the cue is kept.

Tests: tests63 C2 and C3.

### 2. Unteachable targets: stop before paying

**Cause.** ดิฉันเอง contains ดิฉัน, and the writer refuses every line with ดิฉัน ("use ฉัน instead"). All 11 paid attempts were certain to fail. The same kind of self-contradiction earlier caused the สวัสดีครับ loop.

**Fix:**
- **Preflight skip.** Before any paid call, a target that contains a word the writer always refuses is skipped. It stays due for review.
- **Early stop.** If the writer refuses a target three times in a row for a reason triggered by the target itself, it stops paying and hands the word to recovery or substitution.
- **Fixable failures still retry.** A missing target word, a lazy cue or an untaught word is still retried, because asking again fixes those.

Tests: tests63 R9, tests17 B2 and B3.

### 3. Canonical vocabulary quality

This is not done for all 800 words. A first experiment gave the writer four real example uses for each of the 30 test words. It did not get Haiku to spread a word's senses (ถูก was still used only as "cheap"), so the main lever turned out to be the judge (item 5).

The example table stays in the code for those 30 words. Writing it for all 800 is on hold until it shows a measurable gain.

### 4. Target-list pronunciation after a substitution

**Cause.** A substitution kept the old word's reading, so แวะ was shown as dì-chǎn-eeng.

**Fix:**
- **The substitution carries the reading.** It includes the new word's dictionary reading.
- **A final check.** Every target-list reading is set to the dictionary's reading before the track is saved. Until now only the sentence readings were checked.

Test: tests63 K1.

### 5. A fixed benchmark first, then naturalness calibration

**Benchmark.** 63 lines from the v700, v702 and v705 reviews:
- 31 lines the owner confirmed as bad;
- 4 lines the owner praised;
- 28 strict control lines.

Each line comes with the line or two before it. The app's own judge prompt was run with Haiku stand-ins, two runs per version.

| Judge | Owner's bad lines caught | Caught on unseen reviews (v700/v702) | Good lines wrongly rejected |
|---|---|---|---|
| Current app judge (sentence alone, lenient) | 11–13 of 31 | 7–8 of 19 | 0–1 of 32 |
| + previous lines | 18 of 31 | 12 of 19 | 0 of 32 |
| + previous lines + strict standard | 29–30 of 31 | 17–18 of 19 | 2–3 of 32 |

**What this means.** The live judge misses about two thirds of what the owner flags, which is why those lines reached the owner.

**Fix:**
- **Where.** The final snapshot judge now reads each target line after the one or two previous lines of the same scene, and applies the strict standard.
- **The strict standard.** It is built from the owner's confirmed error types:
  - verbs missing their object;
  - translated wishes;
  - ไม่ใช่ answering a ไหม question;
  - หลาย used for "a lot";
  - question word + ไหม;
  - and others.
- **Caching.** Its verdicts are cached apart from the plain ones.

Test: tests63 J1.

**Repair.** When the strict judge rejects a line, it also proposes a corrected line. A calibrated reviewer graded those proposals:
- 29 of 59 are good;
- 14 are better but still flawed;
- 16 are bad: the lesson word dropped, the complaint left in place, or the neighbouring line repeated.

So the app does not use Haiku's proposed fix directly. A rejected line goes to recovery, and the new line must pass the same strict, in-context judge.

## Regression suite

Each fix ran against the full suite.

New failures found and fixed:
- **tests28 E2.** A test helper skipped ที่นี่ only because of the old segmentation bug; the skip is now explicit.
- **tests17 B2 and B3.** The early stop was first too broad; it was narrowed to refusals triggered by the target itself.
- **tests13 I1.** A code comment named the model; it was reworded.
- **tests60, tests20 and tests17.** The context fields were first stripped from the saved pairs, which made every pair unverified; they are now kept.

Expectation changes, each explained in its test:
- tests60 I1 accepts v703–v709 version labels;
- tests28 skips ที่นี่ explicitly.

## Status

- **Relay test tracks.**
  - Tracks 15 and 17 were lost to container restarts.
  - Tracks 16 and 18 ended NOT_READY: 82/90 and 80/90. The strict judge refused lines, and single-line replacements failed again in context.
  - Track 16 scored 6.5 with the calibrated reviewer.
  - Track 19 (three polish-fix passes) is still running.
- **First paid test track** (real Haiku, the owner's API, cap US$0.20): it **hit the cap at US$0.197 after 178 requests and did not finish.**
  - **Quality.** It was close: 90 target lines, and the strict judge refused only 2, then 1 after repair. Real Haiku is refused far less often than the stand-ins.
  - **Cost.** Tokens were 766k input and 241k output, of which 191k were thinking. That is about US$0.077 for input and US$0.12 for output.
  - **Caching was not working.** 41 requests carried a cache mark, but the API created no cache entries. **Cause: the Cloud Run server the site uses (`dev/server/google-cloud-anthropic/index.js`) flattened the message blocks to plain text, which dropped the cache marks.** The Netlify function has passed them through since v703; the Cloud Run one never did.
  - **Fix.** Fixed in the repository, with test tests45 G7. The live server only changes when the owner redeploys the function. Deploying is the owner's step and has not been done.
- **Cue guard.** It now also catches an adverb between the pronoun and the verb ("Check that he sometimes swim.", seen on track 19). Test: tests63 C2.

## TL;DR

The strict in-context judge catches what the owner flags. Relay tracks still end a few lines short, because the stand-ins can't write passing replacements.

The first real-Haiku track nearly finished, with only 1–2 strict refusals, but it ran out of its US$0.20 cap. Part of the reason is that prompt caching never worked on the Cloud Run server. That is fixed in code and needs a redeploy by the owner.
