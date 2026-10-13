# v694 — Checkpoint A: Listening

Branch `claude/session-continuation-check-a19meq`. Offline work only: no paid calls were made, nothing was deployed.

## Reference files

I read all three v693 Listening logs:

- `listening-log-2026-10-13T14-46-45.txt` (Thai)
- `listening-log-2026-10-13T14-54-41.txt` (Japanese)
- `listening-log-2026-10-13T14-57-34.txt` (Mandarin)

None was inaccessible. Each log ends in a truncated `LISTENING_EFFICIENCY` line (cut off in the file itself), so the per-run token and cost totals are not in the logs.

## 1. Why v693 hit the 16,000-token limit

**What happened in v693:**

| Language | Attempt 1 | Attempt 2 |
|---|---|---|
| Thai | "CLAUDE HAIKU CONNECTION LOST: HTTP 200 without a reply" | `MAX_TOKENS` (16,000 output tokens) |
| Mandarin | `MAX_TOKENS` | `MAX_TOKENS` |
| Japanese | connection lost | received a plan |

**The cause, in the code:**

- `lnMfPlanPrompt` / `lnMfPlanCall` asked for the whole conversation in one reply: all 30 lesson words, 6 situations and about 40 turns.
- Each turn had 14 fields: n, speaker, addressee, intent, asks, referent, action, object, context, expects, respondsTo, targetIds, text, english.
- The request said `maxTokens: 7000`. The Anthropic adapter (`anthropicRequestBody`) multiplies this by 3 and caps it at the ceiling, so the real limit was 16,000.
- Haiku uses adaptive thinking, and thinking tokens count toward that limit.

**What I measured offline,** on the same learners and plans (estimated tokens):

| | Visible plan reply | Request (input) |
|---|---|---|
| v693, one reply | about 2,600–3,300 tokens | Thai about 10,300 · Japanese about 3,000 · Mandarin about 1,800 |
| v694, per situation | at most about 650 tokens per situation | Thai at most about 10,200 · Japanese about 2,700 · Mandarin about 1,600 |

The visible JSON alone would have fitted easily. So most of the 16,000 tokens must have been the model's thinking, as it tried to satisfy 30 word constraints, 6 situations and 40 turns in one go. I can't see thinking tokens offline. This is an inference from the measured reply size and the logged `16000 output tokens`.

**The "connection lost" attempts.** The proxy (`netlify/edge-functions/anthropic.js`) answers 200 at once and keeps the connection open with spaces until Haiku replies. A reply of up to 16,000 tokens takes long enough that the connection was dropped before the body arrived. Short per-situation replies avoid this. This is also an inference: the proxy logs are not available to me.

**Was it verbosity, extra fields, repeated vocabulary or turn count?** It was mostly the size of the single task, not any one of these:

- **Turns per reply:** 40 → 5–12.
- **Fields per turn:** 14 → 9 (addressee, action, context and expects dropped; the others kept and renamed). The validators only need speaker, intent, asks, respondsTo, about (= referent), object, targetIds, text and english.
- **Repeated vocabulary:** this affects input size, not output. Thai's 876 authorised words make about 10k input tokens per request (see section 6).

## 2. Why the Japanese plan was never approved after three repair rounds

1. **An infeasible question entered through an untargeted line.** The selector had deferred いくら because the learner has no number words. But the plan still wrote これ、いくら？ on a turn carrying no lesson word. Feasibility was only checked for lesson words, so nothing rejected the intention itself.
2. **Only the answer was rejected, never the question.** A question → answer failure (`ANSWER_TYPE`) rejected the reply and deliberately kept the question ("the question may be fine"). So every repair kept これ、いくら？ and wrote a new non-answer: 高いね → ちょっと高いね → 高いよ、これ. The price question was still there in round 3.
3. **Escalation never reached "change the intention".** Escalation counted attempts per turn id, and repaired turns get new ids. So the price exchange went exchange → exchange → scene, and the same defect came back in each new shape.
4. **The plan prompt never said "no numbers".** The model reached for 二千円 / 三千円 (unauthorised) to answer its own price question.
5. **Two closed-vocabulary false positives used up repair rounds and gave misleading guidance:**
   - ところで was rejected as 頃 (と + ころ);
   - 使いすぎ was rejected as すぐ (すぎ read as a form of the adverb すぐ).

   While writing the fixtures I found a third: じゃあね was split into じゃ + 姉.
6. **Genuinely unauthorised words** (なる, メニュー, そんな) were real defects, correctly rejected.

## 3. Planner architecture changes (`dev/tt.jsx`)

**Plan one situation at a time.** `lnMfPlanByScenes` → `lnMfScenePlanCall` → `lnMfScenePrompt` / `lnMfSceneFromReply` replace `lnMfPlanCall`, `lnMfPlanPrompt`, `lnMfNormalise` and `LN_MF_PLAN_SCHEMA`.

- Each situation of the deterministic grouping (`lnMfGroupTargets`, unchanged) is one request.
- Each request asks for 2–12 turns, depending on that situation's number of lesson words.
- Each request uses the compact schema `LN_MF_SCENE_SCHEMA` with a budget of `LN_MF_SCENE_MAX_TOKENS` = 2000, which becomes at most 6,000 after the adapter.
- Situations are planned in order. Each request sees the full outline and every earlier turn ("SO FAR"), plus any earlier lesson word not heard yet. The conversation is still one connected conversation.

**Technical failures stay technical.**

- A cut-off reply (`MAX_TOKENS`) is logged `SCENE_PLAN_TRUNCATED … a TECHNICAL failure (fault 9); a cut-off plan is never parsed, validated or kept`.
- Only that situation is retried, once, asking for a shorter reply.
- If it fails twice, the run is `LISTENING_PLAN_BLOCKED — TECHNICAL (fault 9): situation S4 could not be planned …`. The situations already planned are kept in `plan.keptScenes` (they are not discarded). No validation, audit or repair runs on anything partial.

**Local check per situation** (`lnMfSceneLocalIssues`):

- It runs the same deterministic validator (`lnMfValidate`) on the new situation in the context of the earlier ones: vocabulary, grammar contracts, meaning rules, answer types, infeasible questions, at most 3 lesson words per turn, speakers. No model call.
- A defective situation is re-planned once, with its defects listed ("replan the scene" level).
- The version with fewer defects is kept. Sentences from a discarded version may not come back later.
- After all situations, the existing whole-conversation validation, the one batched semantic audit, the repair rounds and the final gates run unchanged. Cross-situation continuity is judged there.

**A3 — infeasible intentions on every turn** (`lnMfInfeasibleAsk`, `INFEASIBLE_INTENTION` in `lnMfValidate`):

- When the learner has no number words (`lnMfHasNumbers`), any turn asking for a price, clock time, quantity, length of time or age is a fault 5 (meaning) defect, with or without a lesson word.
  - Japanese checks for: 何時, いくら, 何分, 何歳, いくつ, 何人 …
  - Mandarin checks for: 几点, 多少, 几个, 多久 …
  - Thai checks for: กี่, เท่าไหร่ …
- The plan prompt and the repair prompt both state the prohibition (`LN_MF_NO_NUMBERS_RULE`), and the plan schema no longer offers the number answer types.
- The repair instruction for this defect says to remove the question and give the exchange another purpose.

**A4 — failure signatures and the recovery ladder** (`lnMfFailSig`, `lnMfCountSignatures`, `LN_MF_LADDER` in `lnMfScopes`):

- A signature is: the check that failed + its lesson words + (for question → answer faults) the kind of question.
- A signature seen again is repaired one rung higher for each repeat: line → exchange → intention → scene → **reassign** (the lesson word moves to another situation that fits it, logged `LISTENING_TARGET_REASSIGNED`, and the old situation is rewritten without forcing it).
- A repeated question → answer failure now also rejects the question sentence.
- The repair prompt says "this part already failed the same way before: do NOT write the same idea again".
- Combined with the existing `REPEATED_REJECTED_SENTENCE` check and the 3-round cap, the same failure is never paid for twice at the same level.
- "Replan the global allocation" (the brief's level 6) is the honest stop: `LISTENING_PLAN_BLOCKED` with the residual faults named. Nothing is committed.

**Unchanged:** feasibility before freezing, situation grouping, meaning-first intentions, the semantic audit's 4-level usage scale, fault classes, fail-closed final gates and the coherence judge. The legacy planner is still reachable only through `setListeningMeaningFirst(false)` / `TT_LISTENING_LEGACY=1`.

## 4. Feasibility and vocabulary corrections

**Deferral review (A5).** Situation patterns in `LN_MF_SITUATIONS` were widened so ordinary uses are recognised:

- MEET gains `speak|talk|do|because`;
- PLAN gains `do|because`;
- SHOP gains `size|clothes|shirt|try on`;
- LOOK gains `size`.

Checked against each run's own vocabulary:

| Word | v693 | v694 | Proof of a valid use with the authorised words |
|---|---|---|---|
| เพราะ (because) | deferred: "no situation fits" | **selected** (MEET) | เพราะเดินมากค่ะ answering ทำไมครับ |
| 話す (speak) | deferred: "no situation fits" | **selected** (MEET) | 楽しかった。日本語で話した。 (友達 and 日本語 are authorised) |
| 做 (do) | deferred: "HOME could not join" | **selected** (MEET) | 你回家做什么？ (什么 is authorised) |
| いくら / 何時 (ja), 多少 (zh) | deferred | **still deferred** | no number words authorised; a price or time question can only get a non-answer (v693 tried 二千円, which is unauthorised) |
| ขนาด (size) | deferred | **still deferred** | not missing vocabulary: its shop / looking situations are not among this conversation's 6. It keeps its SRS obligation |

Every deferral logs `srsObligationPreserved=true`. Closed vocabulary is unchanged.

**Japanese segmentation false positives:**

| Sentence | v693 result | v694 result |
|---|---|---|
| 使いすぎ, 食べすぎた | rejected as すぐ | accepted as the verb + 〜すぎ (new `JA_SUGI_TAILS` in `jaInflectionPairs`; adjectives already had すぎる) |
| ところで (by the way) | rejected as 頃 | still rejected (it is unauthorised), but now named ところで (ところ / ところで added to the segmentation dictionary, which grants no permission) |
| じゃあね | rejected as 姉 | accepted as じゃあ + ね (new `COST.kanaOfKanji` +0.6: a kanji word matched only through its kana reading loses to a real kana word or grammar) |
| すぐ on its own | unknown | still unknown |

## 5. Offline end-to-end results

**tests49 — 72/72 pass.** It runs on the default path; only the model replies are mocked.

The existing checks were kept and updated to the new architecture. These assertions changed, with the reason:

- **A1 / A5:** plan requests now equal the number of situations instead of 1.
- **D1:** 何時→明日 is now repaired as a new intention rather than an exchange patch, which is the behaviour A3/A4 ask for.
- **H2:** the log names the situation.

New section J uses learners modelled on the three v693 runs (`V693_IDS`). These cover the brief's 12 demonstrations:

| Check | Demonstrates | Thai | Japanese | Mandarin |
|---|---|---|---|---|
| J1: READY 30/30; one request per situation; budget ≤ 2000 each; compact format; later situations see earlier turns | 1, 2, 3, 5, 12 | 6 requests | 5 requests | 6 requests |
| J2: each situation passes its local check, then one whole validation + audit, then final gates on the final text (24–44 turns, ≤3 lesson words per turn, closed vocabulary, both speakers, coherence judge) | 2, 5, 12 | pass | pass | pass |
| J3: เพราะ / 話す / 做 selected and heard; いくら / 何時 / 多少 / ขนาด deferred with SRS kept; no SRS change; 0 new words | 9 | pass | pass | pass |
| J4: Thai has number words, so นานเท่าไหร่ is feasible (no false "infeasible") | 6 | pass | | |
| J5: the actual v693 Haiku Japanese plan: なる / 二千 / これ、いくら？ caught per situation; S1 and S5 re-planned; READY with 0 repair calls; no いくら in the final text | 6, 7 | | pass | |
| J6: valid situations S2–S4 of that plan requested once each and kept word for word | 11 | | pass | |
| J7: price question comes back in the re-plan and in the repair: INFEASIBLE → intention repair → `REPEATED_FAILURE_SIGNATURE` + `REPEATED_REJECTED_SENTENCE` → escalates to a scene replan → READY; いくら never final; ≤ 3 rounds | 7 | | pass | |
| J8: S3 reply cut off: TECHNICAL, only S3 re-requested (S1–S2 kept), shorter retry, READY | 8, 10, 11 | | | pass |
| J9: S4 cut off twice: BLOCKED TECHNICAL naming S4, 3 situations kept, no validation / audit / repair on partial output, no linguistic fault named, no legacy fallback | 8, 10 | pass | | |
| J10: segmentation fixes (すぎ, じゃあね, ところで) and closed vocabulary not weakened (すぐ still unknown) | 5 | | pass | |

**Existing coverage that still passes:**

- **C1–C11:** the v691 defective exchanges are rejected (sense, grammar, answer types).
- **D2–D7:** recovery by fault class.
- **E1–E4:** the 4-level usage scale; an unverified turn never passes.
- **G1–G2:** the final coherence judge and the final gates decide READY.
- **H1–H3:** network / provider failures are technical; no silent fallback.

**Full offline regression:** see section 8.

## 6. Expected cost and API calls per Listening run

**Calls:**

- A clean run: one plan request per situation (5–6), plus 1 semantic audit, plus 1 final coherence judge. That is **7–8 requests** (v693 needed 3 when the single plan worked, but it never worked).
- Upper bound: each situation may add 1 retry (technical) and 1 re-plan (local defects); at most 3 repair rounds, each with 1 repair call (up to 2 attempts) and 1 re-audit.

**Tokens, estimated from the fixtures:**

- Plan input: Thai about 59k, Japanese about 12k, Mandarin about 8k across all situations.
- Visible plan output: about 1.9–2.5k across all situations.
- Thinking is unknown offline. Each request's thinking + output is capped at 6,000 tokens.

**Cost at the app's Haiku prices** (US$0.10 / US$0.50 per million input / output tokens):

| Language | Clean run | Bad run (all re-plans and repairs) |
|---|---|---|
| Thai | about US$0.01–0.02 | about US$0.05 |
| Japanese | about US$0.005–0.012 | lower than Thai |
| Mandarin | about US$0.005–0.012 | lower than Thai |

**For comparison,** each failed v693 Thai or Mandarin attempt spent about 32k output tokens (2 × 16,000) plus about 20k input tokens, roughly US$0.018, and produced nothing.

**Thai input is the largest part.** The 876-word list is repeated in each of the 6 requests. Prompt caching would cut this, but the proxy only forwards a string system prompt and drops `cache_control`. Enabling it is a proxy change, so this is a proposal for a later version, not part of v694.

## 7. Remaining risks

1. **Real model behaviour is unproven.** The mocks prove the pipeline, not what Haiku will write. Per-situation requests should end the truncation, but only a live run shows real thinking length, first-pass validity and coherence.
2. **Coherence across situations now relies on context, not one joint plan.** Each request sees every earlier turn, and the audit judges transitions. But a situation can't see what later situations will need. Closing logic depends on the outline in the prompt.
3. **Local re-plans add calls.** If Haiku's first versions are often defective, a run may use up to about 12 plan requests before the global rounds. This is still bounded, and still cheaper than v693's failed attempts.
4. **ขนาด can be deferred repeatedly.** It will only be selected when a conversation includes a shop or looking situation. Its SRS due date is untouched, but repeated deferral is possible. I recommend watching it, not forcing it.
5. **The infeasible-question check is pattern-based** (question words and lesson-word contracts). A price question phrased without those words still has to be caught by the semantic audit.
6. **The Thai prompt size** (about 10k tokens per request) is the main cost driver (see section 6).

## 8. Full offline regression

`sandbox/test_all.sh` on the final build (all 51 suites + render test): **OFFLINE REGRESSION: OK** — 1,774 checks pass. The only failing checks are the documented, pre-existing ones: tests33 2G (known since deployed v677) and tests35 2C-thTH / 2C-zhZH (blocked: the v673 replay script and logs are not in the package). Notable suites: tests13 28/28 (source hygiene), tests37 43/43 (the v682 production cassettes replay byte-identical with the Oct13 switch off), tests23–39 unchanged and passing on their explicit legacy opt-in, tests43 32/32, tests45 83/83, tests49 72/72, tests50 19/19, tests51 29/29, tests52 25/25, tests53 24/24. `rc_replay_check.js` (v682-final4, ja / th / zh): 0 mismatches, content identical.

Found and fixed by the first full run: the final text check also re-judged untouched synthetic lines in tests14 / 15 / 29, so it now covers only lines changed after acceptance (its purpose); tests43 P22 asserted the old false rejection of a reply cue and now checks the default path accepts it and the legacy path keeps the old rule; tests51 E3 lists the four intended v694 cue repairs of the v691 export. No legacy test (tests23–39) assertion was changed.
