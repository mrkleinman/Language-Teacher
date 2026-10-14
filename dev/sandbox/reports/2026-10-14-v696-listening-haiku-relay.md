# v696: Listening with Haiku, end to end (relay run)

This was the first time the v695 Listening pipeline met Haiku and not scripted replies.

## How it was run

- **App and learners.** The real app pipeline, `generateCohesiveListeningTrack` on build v696, ran with the same learners as the three failed v694 runs: `benchmark/v695/plans.js`, `V694_IDS` plus the deferred words.
- **Model replies.** Every model request was written to a queue file and answered by its own Haiku agent. Nothing was scripted. The app's own checks, repairs and final judge decided every outcome.
- **Caveats.**
  - The agents carry some Claude Code instructions of their own.
  - The `max_tokens` cut-off is not enforced.
  - So this is close to production behaviour, but it is not the production API path.
- **Files.** Everything is in `sandbox/haiku-listening-relay-v696/`: every request and reply, the app logs, the summaries, the final lines, and the relay script.

## Results

| | Thai | Japanese | Mandarin |
|---|---|---|---|
| Model calls | 17 | 15 | 15 |
| Situations passing the local check first time | 6/6 | 6/6 | 5/6 (S3 grammar → replanned → pass) |
| Rule-based validation | PASS | PASS | PASS |
| Meaning-check repairs | 4 rounds (3 + 1 boundary) | 3 rounds | 3 rounds |
| Words heard | 30/30 | 30/30 | — (blocked before assembly) |
| Turns | 40 | 40 | — |
| New words / SRS changed | 0 / no | 0 / no | 0 / no |
| **Result** | **NOT_READY**: final judge failed 3/6 scenes | **NOT_READY**: final judge failed 3/6 scenes | **NOT_READY**: blocked by one unresolved reply check |

## The v695 fixes, checked against real model behaviour

| v694 failure | v695 fix | Seen in this run |
|---|---|---|
| Thai accepted a situation missing two of its words | A situation must carry its own words | Every situation carried its words; Mandarin S3 was correctly replanned |
| Thai repair cut off at 10,500 tokens, resent identically | Repairs are bounded and split, and never resent identically | Japanese repair split into 2 requests of ≤10 turns. "REPEATED_FAILURE_SIGNATURE … never the same repair again" fired in Thai and Mandarin. No cut-off. |
| Japanese could not repair a today → tomorrow transition | Boundary repairs and the day-state check | Boundary repairs worked in all three languages |
| Mandarin applied repair lines that had pinyin in them, unchecked | Every patch is validated before it is applied | Patches were rejected before applying: Thai (unknown word ไว้เจอกันใหม่), Mandarin ×2 (a lesson word, 来, removed) |
| Repairs grew the conversation past the limit | Turn reserve | 40 turns in Thai and Japanese (allowed 24–44) |

The v694 failures did not recur. The tracks still did not reach READY, for the new reasons below.

## What stopped the tracks (new findings)

### 1. The final whole-conversation judge is stricter than the meaning check, and its failure is terminal

**What happened.** In Thai and Japanese, the meaning check passed every situation and transition. The final judge then failed 3 of 6 scenes. The track went straight to NOT_READY: there is no repair after the final judge (`tt.jsx:28092`).

**My review of the 40 Japanese lines.** I agree with the judge. Each exchange is fine on its own, but the storyline drifts:
- the speakers agree on a movie, then look at a book of photos;
- they plan a restaurant, then ask "is the shop still far?" without having set off;
- they argue about bus versus car, and end at a shop counter saying "let's eat".

**My review of the Thai lines.** Two of the three failures are real:
- "Ten baht." is followed by "Go straight, then turn left", then "closed there today", then "let's go eat";
- the closing does not follow on, and คุณคือเพื่อนครับ is stiff, forced by the lesson word คือ.

One failure looks like a judge mistake. It says the "Thank you" at the start of scene 2 has no referent, but it answers the compliment "You're not old at all."

**Root cause.**
- Each situation is planned on its own from a word group, so a single storyline is not guaranteed.
- The meaning check asks whether each situation is "one plausible moment" and whether the transition "follows".
- The final judge asks whether the whole thing is one coherent conversation, which is a harder question.

### 2. The meaning checker gives advice that the lesson rules forbid

**What happened.**
- Thai: the checker suggested ไว้เจอกันใหม่, which the learner has not been taught. Haiku used it, and the patch was rejected twice.
- Mandarin: the checker said to use 去 instead of 来, but 来 is a lesson word. The patch was rejected twice (PROTECTED_TARGET_LOST).

**Cost.** The guards were right each time, but each rejection spent a repair round.

**Root cause.** The checker sees which words are lesson words. It is not told that its advice must keep them and use only the learner's vocabulary. Its note is passed into the repair request.

### 3. One borderline reply check blocks the whole Mandarin track

**What happened.** After 3 rounds, one fault was left:

> 吃了，你怎么回家？ — 不知道，我去朋友家。
> ("How are you getting home?" — "Don't know, I'm going to a friend's.")

- The checker itself rated the reply's wording "natural", but said the reply "does not answer how".
- That single item blocked the whole track: LISTENING_PLAN_BLOCKED, 0/30 published.

**My view.** This is a reasonable conversational reply, so the block is a severity problem.

## Proposed fixes (not implemented; for approval)

1. **One bounded repair after the final judge.** Repair the scenes the judge failed, using the existing scene or boundary repair, then judge once more before NOT_READY. Ask the meaning check the same storyline question, so the two agree earlier.
2. **Keep the checker's advice within the lesson rules.** Tell the meaning checker the protected lesson words and the allowed vocabulary, and have it describe the problem instead of dictating wording. Expected effect: fewer wasted repair rounds.
3. **Severity for a lone "does not answer".** When the wording is natural or acceptable and only one such item is left after the rounds, let the final judge decide instead of blocking the plan.
4. **Larger, separate change: give each situation request a running story summary.** This is the root of finding 1: where the speakers are, what they have decided, and what happens next.

Fixes 1–3 are small and offline-testable: fixtures from these exact replies, plus a regression run. Fix 4 is a planner change and needs its own brief.

## Cost

- These runs used the session's own Haiku agents, not the API.
- At API prices the same traffic would cost roughly US$0.01–0.02 per run. That is an estimate from the character counts: about 470k request and 73k reply characters in total.
