# v694: Listening reliability and Daily quality repairs

Development branch `claude/session-continuation-check-a19meq`. Build v694, planner `meaning-first-2`.

All of this is offline work:

- no paid model calls;
- nothing merged or deployed;
- no model or provider was switched;
- no vocabulary IDs, curriculum, belts, SRS data, bookmarks or settings were touched.

The Listening detail is in `2026-10-13-v694-checkpoint-A-listening.md` (Checkpoint A). This report summarises it and adds the Daily and cross-language work.

**What I read.** All 9 reference files listed in the brief, plus the brief and the rating summary. Their contents are captured as in-repo fixtures (`sandbox/oct13-v693/README.md`), so the tests run offline.

**How to read the test results:**

| Kind of result | What it proves |
|---|---|
| Unit / rule tests | Single functions, on real export lines. |
| Offline end-to-end tests | The app's real pipeline with scripted model replies. They prove the pipeline, not what the real model will write. |
| Real model output quality | Unproven until a live run. |
| Production readiness | Not claimed. |

---

## 1. Listening

**Root causes confirmed**

1. **The 16,000-token truncation.** The whole conversation was requested in one reply: 30 words, 6 situations, about 40 turns, 14 fields each. Adaptive thinking counts toward the cap.
   - Measured offline, the visible plan is only about 2.6–3.3k tokens, so the cap went to thinking. This is an inference: thinking can't be measured offline.
   - Long replies also outlived the proxy connection ("HTTP 200 without a reply").
2. **Japanese repairs never converged:**
   - an untargeted これ、いくら？ slipped past feasibility (which only checked lesson words);
   - question → answer repairs rejected only the answer, so the price question survived every round;
   - escalation never reached "change the intention";
   - the prompt never said "no numbers";
   - three segmentation false positives cost rounds (頃, すぐ, 姉).

**Files and functions modified** (`dev/tt.jsx` unless noted)

- **Per-situation planning:** `lnMfPlanByScenes`, `lnMfScenePlanCall`, `lnMfScenePrompt`, `lnMfSceneFromReply`, `lnMfSceneLocalIssues`, `lnMfUnheardSoFar`, `LN_MF_SCENE_SCHEMA`.
  - These replace `lnMfPlanCall`, `lnMfPlanPrompt`, `lnMfNormalise` and `LN_MF_PLAN_SCHEMA`.
  - `_lnComposeMeaningFirst` was rewired to use them.
- **Infeasible intentions:**
  - `lnMfHasNumbers`, `lnMfInfeasibleAsk`, `LN_MF_NO_NUMBERS_RULE`;
  - the `INFEASIBLE_INTENTION` check in `lnMfValidate`;
  - the repair prompt in `lnMfRepairCall`.
- **Failure signatures and the recovery ladder:**
  - `lnMfFailSig`, `lnMfCountSignatures`, `LN_MF_LADDER`;
  - target reassignment in `lnMfScopes`;
  - question rejection in `lnMfApply`.
- **Deferral review:** `LN_MF_SITUATIONS` patterns (MEET, PLAN, SHOP, LOOK).
- **Japanese segmentation** (Oct13 switch):
  - `JA_SUGI_TAILS` in `jaInflectionPairs`;
  - `JA_LANGUAGE_LEXICON_V694`;
  - `COST.kanaOfKanji` in `_jaLexiconAdapter`.
- **Versions:** `APP_BUILD_VERSION` / `LISTENING_BUILD_VERSION` = v694; `LISTENING_PLANNER_VERSION` = meaning-first-2.
- **Tests and fixtures:**
  - `tests49.js` (new section J; A1 / A5 / D1 / H2 updated for the new architecture);
  - `benchmark/v692/{learners,mock,plans}.js`;
  - new `benchmark/v694/plans.js`.

**Before → after**

| | v693 | v694 (offline) |
|---|---|---|
| Plan request | 1 request, budget 7000 (adapter cap 16000) | 1 request per situation, budget 2000 (cap 6000), compact 9-field turns |
| Cut-off reply | Retried as the same giant prompt | Logged `SCENE_PLAN_TRUNCATED` (technical); only that situation is retried; earlier situations kept |
| これ、いくら？ (untargeted, no number words) | Survived 3 repair rounds with new non-answers | `INFEASIBLE_INTENTION` at the situation check; the situation is re-planned; never in the final text |
| Same failure twice | Same repair level again | `REPEATED_FAILURE_SIGNATURE`, one rung higher (line → exchange → intention → scene → reassign) |
| เพราะ / 話す / 做 | Deferred ("no situation fits") | Selected and heard (valid uses proven with the authorised words) |
| ところで / 使いすぎ / じゃあね | Reported as 頃 / すぐ / 姉 | Unauthorised ところで is reported by its real name; 使いすぎ and じゃあね are accepted |

**Offline regression:**

- tests49 72/72 (58 existing + 14 new, section J), on learners modelled on the three v693 runs. Thai, Japanese and Mandarin all READY 30/30 end to end through the default path. This includes the actual v693 Haiku Japanese plan as the defective input, cut-off replies, and repeated failures.
- Full suite: OFFLINE REGRESSION OK (section 6).

**Remaining limitations**

- What Haiku actually writes per situation is unproven.
- Cross-situation coherence now comes from context plus the audit, not one joint plan.
- Re-plans can add calls.
- ขนาด can be deferred repeatedly while no conversation includes a shop.
- The infeasible-question check is pattern-based.
- Thai prompts are about 10k input tokens per situation request.

**Cost implications**

- A clean run is 7–8 requests.
- Estimated Thai cost: about US$0.01–0.02 per clean run, about US$0.05 for a bad run.
- Japanese and Mandarin are cheaper.
- v693's failed Thai and Mandarin attempts each spent about US$0.018 and produced nothing.

**Ready for one controlled paid live test?** Yes, one Listening run per language, with these stop conditions:
- stop at the first `LISTENING_PLAN_BLOCKED`;
- report per-situation token usage;
- at most about US$0.05 per language.

---

## 2. Thai Daily

**Root causes confirmed.** v693's contradiction rule only compared adjectives on a word-for-word identical subject, and only inside one target group. It had no rules for:
- something run out and then requested;
- "no need to V" then V;
- a shop custom stated as a general rule.

The four defects in the export:

| Pair | Problem |
|---|---|
| 3–5 | เกลือหมด → เอาเกลือมาให้หน่อย (salt run out, then requested with no source) |
| 44 → 45 | ไม่ต้องข้ามสะพาน → ข้ามสะพานก็ถึง (same speaker, next line) |
| 60 → 63 | ค่าโดยสารไม่แพง → ค่ารถแพง |
| 84 | ลองเสื้อต้องถอดรองเท้า (taught as a general rule) |

The songthaew route and the prices (1,000-baht tickets, a two-day car rental) are plausible, so they were not changed.

**Files and functions modified**

- `thaiLocalContradictions` (new): self-contradiction within 3 lines, self-reversal, run-out request, general rule.
- `thaiSubjectKey`: ค่าโดยสาร and ค่ารถ count as the same subject.
- `finaliseMainTrack`: flagged target lines go to quota recovery; flagged bridge lines are removed.
- Final invariant `STATE_CONTRADICTIONS` for Thai.
- Thai cues are deliberately left out of the v694 cue repair, because a changed Thai cue triggers a paid re-judgement.

**Before → after:** the four lines above are flagged, and their slots are regenerated by quota recovery. On the v691 export, two more genuine findings are flagged:
- pair 35: "the fare is a bit expensive" → "not expensive at all";
- pair 81: "take your shoes off" at the dinner table.

Controls that are not flagged:
- salt that is bought (ซื้อ);
- a shop's own rule (ร้านนี้ต้องถอดรองเท้า);
- two different shops;
- a conditional (ถ้า);
- a question;
- "really out?".

**Offline regression:**
- tests53 H1–H3;
- tests50 19/19 (v693 Thai suite, unchanged and passing).

**Limitations**
- The rules are pattern-based. A contradiction phrased differently still depends on the QC judge.
- Whether the regenerated replacement lines are better is unproven offline.

**Cost:** about +4 quota-recovery generations on a track like v693 (estimated +US$0.005–0.01 on the US$0.0909 baseline). There is no extra judging for clean tracks.

**Ready for a live test?** Yes. Expect regeneration above v693's zero.

---

## 3. Japanese Daily

**Root causes confirmed**

1. **Cues.**
   - The v693 cue fixer only corrected cues that *named* someone, so "Tell him …" / "Ask him where he is" (to Yui) passed.
   - Speaker letters ("Tell B") and a wrong name ("Tell Yuka") were never checked.
   - Descriptions ("Asking whether …", "Declining to …") were accepted as cues.
2. **Contradictions.** Only day-plan contradictions were checked. Same-speaker reversals (行くよ → 行けない; 乗ろうか → 乗らない), call ownership, and a reply word answering the speaker's own line were not.
3. **Over-strict validation** (from the generation log). About 14 paid slot regenerations were caused by false rejections:
   - verb forms not recognised as the target: 乗らなくて, 行かなきゃ, しなくても, 分かんなかったら;
   - casual dropped particles: 電話来た, どこ見てる;
   - 好きな物は何？;
   - "X asks …; reply yes" read as "the cue asks a question";
   - 好きなんだよね read as a question (なん taken as "what");
   - "what I want to eat";
   - 〜てくれてありがとう labelled a grammar error.

**Files and functions modified**

- **Cues:** `_cueImperative`, `_cueListenerRepair`, `_cuePronounsFor`, `cueAddresseeProblems` (final invariant `CUE_ADDRESSEE`, blocks READY), all inside `fixCueAddressees`.
- **Contradictions:** `jaStateContradictions` with rules R1 self-reversal, R2 call ownership and R3 reply to own line (`JA_VERB_POLARITY`, `JA_DAY_WORD_RE`). Contradicting bridge lines are removed.
- **Validation and target matching:**
  - `japaneseConjugate`: negative stem なく / なきゃ, ん-contraction;
  - `jaCasualParticleDrop`;
  - `validateJapaneseUsage`: 〜てくれてありがとう;
  - `jaPragmaticProblems`: 好きな物は何？;
  - `jaWhQuestion`: explanatory なんだ;
  - `jaCueFormProblems`: reply cues, embedded "what I want".
- **Final check:** a deterministic pass on every final target line.

**Before → after (v693 export)**

- **11 cues corrected:**
  - "Tell him you have only just got here." → "Tell her …";
  - "Ask him where he is right now." → "Ask her where she is right now.";
  - "Tell B yes …" → "Tell Yui yes …";
  - "Tell Yuka …" (Yui speaking) → "Tell Ken …";
  - "Asking whether …" → "Ask whether …".

  Every other cue is unchanged.
- **4 contradictions flagged:** 82, 83, 85, 87. Nothing else in the export is flagged, and v691's three earlier findings are unchanged.
- **The false rejections above now pass.** Genuine errors are still rejected: 水行く？, 日本語行く？, 場所は何？, ありがとう、行く。, どっちも / 何でも as a different word.
- **Kept:** the あれ interjection fix.
- **Verified:** readings and romaji. Every persisted romaji equals the app's deterministic romaji.

**Offline regression:**
- tests53 J1–J13;
- tests51 29/29 (E3 updated to list the four v694 cue repairs of the v691 export);
- tests47 47/47.

**Limitations**
- The pronoun repair assumes two speakers, and that a cue not led by a name or pronoun addresses the listener.
- Regenerated replacements are unproven offline.
- Untaught-but-correct grammar (かな, だけ, なら, くれる) still costs regenerations by policy.

**Cost:** an estimated 10–14 fewer paid slot regenerations (false positives removed) against about 4 extra recoveries. That is roughly −US$0.02 to −US$0.03 on the US$0.1216 baseline; the regeneration share should fall below v693's 36%.

**Ready for a live test?** Yes.

---

## 4. Mandarin Daily

**Root causes confirmed**

1. **QC rewrites were never checked.** Three of the brief's lines were written by the QC improve step (generation log, pairs 33, 69, 84), and Mandarin rewrites were spliced in without the Mandarin rules:
   - 好吧，你去吧 was the judge's own suggestion;
   - 那个慢一点吧;
   - 好，我要喝一点吧 dropped the 也 that QC itself proposed.
2. **你快到吧？** is missing 了 (快 + verb + 了).
3. **你一起吃吗？ = "Do you want to eat together?"** is an acceptable invitation paraphrase. It is kept, and the QC judge's 3/5 remark stays a soft note.
4. **`TARGETS_WITHOUT_3_DISTINCT_USES=1` is 少.** 这里人很少 and 昨天人很少 share one construction. The audit was correct; it is a diagnostic, not a READY gate. The report never named the target.

**Files and functions modified**

- `zhV694SurfaceProblems` (via `mandarinSurfaceGrammarProblems`): 快…了 and the unclear 那个 + speed.
- `zhEnglishAddsMeaning`: "too / also" without 也.
- `zhExchangeProblems`: 我不V → 你V吧.
- The QC repair loop: a Mandarin rewrite must pass these rules in its group, or it is undone and the next repair attempt runs.
- The final text check.
- `inv.TARGETS_WITHOUT_3_DISTINCT_USES_DETAIL`: "少 (2 distinct of 3) — diagnostic only …".
- `_cueImperative`, for name-less tracks: "A suggests that …" → "Suggest that …"; "Agrees and says they'd …" → "Agree and say you'd …".

**Before → after:**
- 你快到吧？ is rejected, with 你快到了吧？ named as the fix;
- 那个慢一点吧 is rejected;
- "too" is flagged;
- 好吧，你去吧 is the only exchange contradiction in the export;
- 3 described cues are corrected;
- 你一起吃吗？ is kept.

**Offline regression:**
- tests53 Z1–Z6;
- tests52 25/25.

**Limitations**
- The 快 rule covers 7 common verbs.
- The rewrite revalidation is deterministic only; the QC judge does not re-judge rewrites (the teaching-plan path, which re-judges, stays off).

**Cost:** up to 1–2 extra repair attempts when a rewrite fails the rules, plus about 3 recoveries. Estimated +US$0.003–0.006 on the US$0.1048 baseline.

**Ready for a live test?** Yes.

---

## 5. Cross-language: final-export validation, hard vs soft, cost (Workstream C)

**C1: the final pairs are the authority.** In `finaliseMainTrack`, these run on the final text before the quota is counted, so a changed line is judged on what will be saved, not on an old verdict:
- cue repair;
- local contradictions (Thai, Japanese, Mandarin);
- a deterministic Mandarin / Japanese language check of every target line.

Final invariants then block READY on anything left (`CUE_ADDRESSEE`, `STATE_CONTRADICTIONS`, `CUE_SELF_ADDRESS`). No new paid judges were added. Unchanged lines keep their cached verdicts, as in v693.

**C2: hard vs soft.**
- **Hard (rejected or recovered):** wrong grammar, an untaught word, a wrong answer type, a contradiction, a wrong listener, a description as a cue.
- **Soft (reported, not regenerated):** the distinct-uses diagnostic (now named), topic changes between Daily groups, the QC judge's "could be clearer" cue notes, simple repeated structures.

**C3: cost against the v693 baseline.**

| Track | v693 baseline | Expected v694 change |
|---|---|---|
| Thai | 97 requests, US$0.0909 | about +4 recoveries |
| Japanese | 120 requests, US$0.1216 | net lower |
| Mandarin | 164 requests, US$0.1048 | small increase |
| Listening | failed attempts | 7–8 requests per clean run |

All of these are estimates. Live runs will measure them.

---

## 6. Full offline regression

`sandbox/test_all.sh` on the final build (all 51 suites + render test): **OFFLINE REGRESSION: OK** — 1,774 checks pass. The only failing checks are the documented, pre-existing ones: tests33 2G (known since deployed v677) and tests35 2C-thTH / 2C-zhZH (blocked: the v673 replay script and logs are not in the package). Notable suites: tests13 28/28 (source hygiene), tests37 43/43 (the v682 production cassettes replay byte-identical with the Oct13 switch off), tests23–39 unchanged and passing on their explicit legacy opt-in, tests43 32/32, tests45 83/83, tests49 72/72, tests50 19/19, tests51 29/29, tests52 25/25, tests53 24/24. `rc_replay_check.js` (v682-final4, ja / th / zh): 0 mismatches, content identical.

Found and fixed by the first full run: the final text check also re-judged untouched synthetic lines in tests14 / 15 / 29, so it now covers only lines changed after acceptance (its purpose); tests43 P22 asserted the old false rejection of a reply cue and now checks the default path accepts it and the legacy path keeps the old rule; tests51 E3 lists the four intended v694 cue repairs of the v691 export. No legacy test (tests23–39) assertion was changed.

---

## 7. Cross-language summary

| Track | Before (v693) | After offline tests | Live validation needed? | Status |
|---|---|---|---|---|
| Listening (Thai) | 0/1 completed (2 technical failures) | READY 30/30 end to end with mocks; cut-off replies handled | Yes | Ready for one controlled paid test |
| Listening (Japanese) | 0/1 (plan never approved) | Actual v693 plan caught per situation; re-plan → READY with mocks | Yes | Ready for one controlled paid test |
| Listening (Mandarin) | 0/1 (2 technical failures) | READY 30/30 end to end with mocks | Yes | Ready for one controlled paid test |
| Thai Daily | 7.5/10, READY 90/90 | 4 export defects caught; no false flags on the rest | Yes (replacement quality) | Ready for a live test |
| Japanese Daily | 6.5/10, READY 90/90 | 11 cues fixed; 4 contradictions caught; about 14 false rejections removed | Yes | Ready for a live test |
| Mandarin Daily | 7.0/10, READY 90/90 | 4 cited defects caught (incl. unchecked QC rewrites); distinct-uses flag explained | Yes | Ready for a live test |

The teaching-quality ratings are the owner's, from v693. I have not produced new ones: passing code tests is not a teaching score.

## Permission requested

The offline work is complete. I'm asking for permission to run paid live tests:
- one Listening track per language (Thai, Japanese, Mandarin), at most about US$0.05 each, stopping at the first block;
- then one Daily track per language (about US$0.09–0.12 each, as in v693).

That is roughly US$0.50 in total. Nothing will be merged or deployed without your approval.

## TL;DR

**Listening.** The v693 failure is understood and fixed offline. One huge plan request ran out of tokens (mostly on thinking) or out of connection time, so the plan is now requested one situation at a time:
- in a compact format with a small budget;
- earlier situations are kept;
- cut-off replies count as technical failures, never as plans.

**Japanese planner.** The repairs went in circles because a price question with no number words was never treated as impossible, and only its answers were ever rejected. Impossible questions are now caught on every line. A repeated failure now climbs to a different intention or a re-planned situation.

**Deferrals.** เพราะ, 話す and 做 are now kept, with proven uses. The number questions stay deferred.

**Daily:**
- **Japanese:** cues now address the right person, contradictions are caught, and about 14 false rejections are gone.
- **Thai:** the salt, shoes, bridge and fare defects are caught.
- **Mandarin:** QC rewrites can no longer bypass the rules, and 快…了 / the unclear 那个 / the added "too" / 你去吧 are fixed. The distinct-uses flag is now explained.

**What's proven:** all of this, offline, against the actual v693 exports and the actual v693 Japanese plan.

**What's not proven:** what Haiku will actually write per situation, and the quality of the regenerated Daily lines.

**Is it safe to test?** All three languages are ready for one controlled paid test each. I'm waiting for your approval.
