# Language Teacher App: Generation Architecture Review (v674)

**Status: read-only investigation. No application code was changed, and the build stays v674.**

**Evidence base:**
- **Logs:** the six live logs of 8 October 2026, downloaded from the Drive folder and read end to end.

  | Log | Size |
  |---|---|
  | `gen-log-2026-10-08T06-40-49.txt` (Thai Daily) | 93,681 B |
  | `japanese-gen-log-2026-10-08.txt` | 52,397 B |
  | `mandarin-gen-log-2026-10-08.txt` | 32,326 B |
  | `listening-log-…06-45-28` (Thai) | 95,054 B |
  | `…06-33-32` (Japanese) | 44,075 B |
  | `…06-31-46` (Mandarin) | 67,011 B |

- **Code:** `tt.jsx` (37,576 lines), with line numbers cited throughout.
- **Earlier live logs** for trend: `logs671`–`logs674`, which cover the v671–v673 builds.
- **The 32 build reports** v642–v674.

**Labels used in this review:**
- **PROVEN:** shown directly by a log line or by code I read.
- **HYPOTHESIS:** plausible, but not demonstrated.
- **UNRESOLVED:** could not be attributed confidently.

---

## 1. Baseline: what actually passed, what failed, and what was mis-reported

### 1.1 The six tracks across the dimensions you asked to separate

Rows are dimensions; columns are tracks (TH = Thai, JA = Japanese, ZH = Mandarin).

| Dimension | TH Daily | JA Daily | ZH Daily | TH Listening | JA Listening | ZH Listening |
|---|---|---|---|---|---|---|
| **Final status** | NOT_READY | **READY** | NOT_READY | NOT_READY | NOT_READY | NOT_READY |
| **Coverage** | 30/30 words, **89/90** pairs | 30/30, 90/90 | 30/30 words, **89/90** pairs | **21/30** | **25/30** | **7/30** (9 turns) |
| **Mechanical validation** | Pass except the คะ quota | Pass | Pass except the 可以 quota | Committed phases pass local gates | Same | Same |
| **Linguistic correctness** | Mostly sound. ตัว used with tickets was caught and dropped | Sound. 7 template sentences ("fallbacks") | **Defects accepted:** "这个到。" ("this arrive.") passed QC; "我想可以。" was accepted, then rejected at QC | Planned sentences were wrong, e.g. "ศูนย์ตลกไหม" ("is zero/centre funny?") | Mostly sound | Planned sentences were ungrammatical, e.g. "我跟在这里" and "我太买东西" |
| **Natural spoken usage** | Good. 82% of lines in the preferred length range | Good, with one odd fallback: "明日分かる？" ("will you understand tomorrow?") | Mixed. Template replacements such as "好。" and "今天好。" replaced natural lines | **Poor.** Naturalness failures trace back to the planned sentences | Fair | Poor |
| **Cue/answer accuracy** | One cue mismatch dropped | OK | "我想可以" was cue-mismatched (2/5), leaving 可以 recall 3 unresolved | — | — | — |
| **Teaching usefulness** | Good for 29 targets | Good, but **only 1/3 NEW words** | Weak. 65-word inventory, 7 fallbacks accepted (6 persisted), 2 near-duplicates for 回 | Low | Medium | Very low |
| **Conversation coherence** | Scene 8 scored 2/5 (FAIL) | 4/5 overall (scenes 2 and 7 at 3/5) | 1 scene, 4/5 | **3 of 7 scenes pass** | **1 of 5 scenes pass** (was 4 of 5 before a one-exchange patch in scene 5) | 2 of 2 pass, but only 9 turns |
| **SRS integrity** | Unchanged by generation | Unchanged. 2 NEW words deferred | Unchanged. **Probable new-word slot bookkeeping defect**, see 1.3 | Deferral preserved SRS | Same | `多少` deferred, SRS preserved |
| **Paid calls / tokens** | 175 / 372,697 | 109 / 210,177 | **283 / 483,196** | 64 / 83,754 | 29 / 39,079 | 34 / 39,445 |

Two findings about the readiness gates:
- **The final READY/NOT_READY verdict was correct in all six runs.** No track was falsely declared READY. The final integrity gates are doing their job.
- **The quality problems sit inside tracks that pass the gates, and in work wasted before a gate fails.** Two examples:
  - JA Daily is READY, but 7 recalls are template fallbacks and it delivered 1 of 3 NEW words.
  - ZH Daily put "这个到。" (meaningless) into the persisted track. The QC group judge passed it (`✓ 这个`, mandarin log line 556).

### 1.2 The reviewer's scores, checked against the logs

| Track | Reviewer's claim | Log verdict |
|---|---|---|
| TH Daily 6/10 | "Incomplete valid recalls, speaker-particle conflicts, coherence failures" | **Confirmed.** คะ reached recall 1 at 11/11 checks with 10 paid attempts, with SPEAKER_GENDER_CONFLICT repeated (lines 637–741). Scene 8 scored 2/5 (line 962). |
| JA Daily 7.5/10 | "New-word shortfall and fallback dependence" | **Confirmed.** NEW 1/3 (物 and 場所 deferred, line 3). 7 fallback recalls (line 533). |
| ZH Daily 5/10 | "Incomplete recalls, unnatural accepted constructions, excessive attempts" | **Confirmed.** 可以 r3 unresolved. "这个到。" accepted. 246 candidate attempts for 90 recalls; 75 duplicate rejections by the telemetry counter. |
| TH Listening 3/10 | "21/30, poor coherence" | **Confirmed.** 21/30; 3 of 7 scenes coherent. |
| JA Listening 4/10 | "25/30, failed final scene and coherence" | **Confirmed.** LS6 (5 targets) was lost to **one extra turn** (8 turns against a maximum of 7). Coherence fell to 1 of 5 scenes. |
| ZH Listening 1.5/10 | "7/30, repeated replanning failures" | **Confirmed.** All 3 rebuilds were spent on LS1 and LS10. A transition-only failure then **stopped the composition** (v674 rule). |

### 1.3 Statuses and figures that were mis-reported or misleading (PROVEN)

1. **"PROVEN" turns were not proven in any useful sense.**
   - Every planned Listening turn carried `⟦proven: …⟧`, including "钱大吗？" ("is money big?"), "我们昨天去这里吧。" ("let's go here yesterday") and "นมเป็นอย่างไร → ตลกมาก" ("how is the milk? → very funny").
   - "PROVEN" only meant three things: the words are authorised, the length fits, and the target is present (`listeningVerbalContext.check`, 19522–19549).
   - The English used for the check is a dummy `'Q?'`/`'S.'` (19527).
2. **"every phase gate clean (… continuity, naturalness)" was logged on commits whose continuity score was 3/5.** The final audit later failed the same scenes.
3. **"LISTENING_NATURALNESS PASS" and "COHERENCE PASS overall 5/5" were logged for a 9-turn, 7/30 Mandarin fragment.** They are true of the fragment and meaningless for the track.
4. **TH Daily integrity summary says "QC: 0 candidate sentence(s) rejected"** although dozens were rejected.
   - That counter (`thaiQcRejections` → line 16698) excludes generation-time, early-gate, closed-vocabulary, group-evaluation and quota-recovery rejections.
5. **ZH Daily says "GENERATION WASTE … regeneration share 0%"** despite 246 attempts for 90 recalls.
   - `aiStageOf` (7737) classifies every Mandarin generation and regeneration prompt as `A_generation` (7762–7763), unless the call chain marks it as recovery.
   - Mandarin never writes the per-recall stat rows (`aiRecordGenerationRecall`).
6. **Thai Daily reports two attempt totals that do not reconcile:** "total attempts 66" (the GENERATION summary, paid generation requests) against "candidateAttempts=210" (`CHECK_MODEL`, candidates judged per recall). Both are correct for what they count, but neither label says what that is.
7. **Mandarin new-word slots (probable defect).**
   - In the Mandarin `onTrackGenerated` (37382–37392), a `_qcDone` track returns **before** `saveSlots` (return at 37388–37390, `saveSlots` at 37392). Japanese saves slots before that return (34540–34549).
   - The code order is proven. The effect on which words are offered as "new" was not observed in these logs: **UNRESOLVED**.

### 1.4 Trend across versions (no live Listening run on file, v671–v674, has been READY)

Coverage and paid calls per live Listening run:

| Language | v671 | v672 | v673 (7 Oct) | v673 (8 Oct) | **v674** |
|---|---|---|---|---|---|
| Thai | 20/30 (49 calls) | 29/30 (82) | 30/30 (98), still NOT_READY | 23/30 (52) | **21/30 (64)** |
| Japanese | — | — | 18/30 (159) | 11/30 (35) | **25/30 (29)** |
| Mandarin | — | — | 6/30 (180) | 11/30 (42) | **7/30 (34)** |

Daily results over the same period:
- **Japanese Daily:** READY in v671, the 7-Oct v673 run and v674. The v672 run stopped at 57/90 (cost guard), and the 8-Oct v673 run ended with する recall 3 unresolved at 11/11.
- **Mandarin Daily:** READY in v672, then NOT_READY in v673 (length) and v674 (quota).
- **Thai Daily:** NOT_READY 88/90 in v671 and 89/90 in v672, NOT_READY in v673 (pronunciation), READY in the 8-Oct v673 run, NOT_READY 89/90 in v674.

**The numbers oscillate rather than converge.** Each architecture change fixes the last failure and exposes another. With one live run per change and different targets each time, a code regression cannot be told apart from target variation. That is a core finding in its own right: see sections B6 and E.

---

## A. Executive diagnosis

The repeated fixes have not converged for three connected reasons.

### 1. Meaning is validated last, by a noisy judge, while form is validated first, by many deterministic rules

Every pipeline does the same three steps:
1. It decides what to say with deterministic machinery: templates, regexes, role tables, story phases, and fixed speaker A/B layouts.
2. It checks the result's *form* in many places: 11 Thai closed-vocabulary checkers, 20+ allow-lists, length, presence and particles.
3. It discovers whether the content *means anything* only at the end, through model judges (naturalness, cue, coherence).

When the late judge rejects, recovery re-asks the same impossible question: same targets, same plan, same speaker. Repair layers multiply, and each new layer has been added downstream of the defect rather than at its source.

v674 is the clearest case, and it was my own design. It added a template "verbalizability proof" that certified forms ("钱大吗？") as meanings. It then showed those sentences to the model as **PROVEN FRAMES** to follow. The Thai offline replay (`v674-replay-th.txt`) produced a 39-turn plan whose frames largely match the live 39-turn plan (25 of the live plan's 33 distinct frames are identical). The live run then failed naturalness on the proven sentences themselves: "แก่มาก", "ชอบขนาด", "ทางนานเท่าไหร่" and "ใบเสร็จราคาเท่าไหร่".

### 2. The product contract is applied without asking whether the learner's inventory can satisfy it naturally

Examples:
- **Mandarin Listening** asked for 30 targets out of **60 authorised words** (`authorised=60`, Mukyu, hardMax 6), in one 5-phase story, **without 是** (not in the 100-word bank, not in any function-word list). The model wrote natural Chinese with 是 and was rejected for it on every LS1 attempt (3 `CLOSED_VOCAB_FAIL` lines; 是 is cited on 7 log lines in total).
- **Mandarin Daily** asked for 90 distinct sentences from 65 words. 75 rejections were for duplicates.
- **Thai Daily** asked for three recalls of the female question particle **คะ**. The prompt fixes the speaker order A (male), B (female), A (11921–11923), so recalls 1 and 3 must be spoken by the man. The recall assigned to A cannot succeed: it burned 10 paid attempts and ended unresolved. Quota recovery got 2 valid คะ pairs only because the model gave them to B (gen-log line 917).

None of these is a model failure. They are planning failures that the downstream machinery can only fail on expensively.

### 3. Development has had no fixed yardstick

- The test battery (35 suites, 1,140 checks) uses template-mock models, with every learner pinned to **Shodan** (hardMax 20, `harness.js:41`) and **every non-locked word set to 'learning'** (`tests14.js:35`; the whole bank for Japanese and Mandarin).
- So it cannot see small-inventory, low-belt or naturalness failures, which are exactly the live failures.
- Reports could truthfully say "all suites pass" while live quality fell.
- Listening has been re-architected at least four times; the code still carries all four labels (`LISTENING_ARCHITECTURE` v656, `_V672`, `_V673`, `_V674`, lines 18145–18148). Alongside this, 75 functions are referenced nowhere and stale messages remain ("the one global replan is spent", 21671). **HYPOTHESIS:** the dead code is a by-product of these rebuilds.

### The direction

Move the meaning decision **upstream, into one model-backed "teachability" step that runs before targets are frozen**. That step yields a bank of validated sentences and exchanges per target. Then make generation, validation and recovery thin layers on top of that bank:
- one deterministic contract;
- one judge policy;
- recovery that *changes the content* (swap to another banked candidate), not the wording of the request.

This removes, rather than adds, roughly a thousand lines of template planning and several recovery loops.

---

## B. Root-cause analysis (ranked by severity × frequency × impact)

### RC1 — Semantic acceptability is not checked until after generation; deterministic "planning" checks only form. PROVEN · all 6 tracks · highest impact

**Listening.** `listeningVerbalContext.check` (19522) validates only four things:
- presence of the target;
- unit count ≤ hardMax;
- at most 3 targets in the line;
- closed vocabulary.

`_lnShapeValid` (20308) validates the abstract act shape, not the rendered text. The renderers then produce the bad frames mechanically:

| Live frame | Generating op / template | Missing check |
|---|---|---|
| 钱大吗？ ("is money big?") | `Q_YN_STATE` (19827), `_zhBpRender` 20120 `s+a+'吗？'` | Whether the noun can take that adjective |
| 我太买东西。 ("I too buy things.") | `A_OBJ_V` with mods including 太 (19694, 19733); render 20099 | 太 is tagged `modifies:'STATE'` (19646) but the tag is ignored |
| 我们昨天去这里吧。 ("let's go here yesterday") | `P_LETS` with `t: R0.time` (19886) | Past time inside a proposal |
| 我跟在这里。 ("I with am here.") | `A_GO` + `together()` mod (19720, 19695) | 跟 needs an object |
| นมเป็นอย่างไร → ตลกมาก ("how is the milk? → very funny") | `Q_HOW` + `STATE{a: any adjective}` (19742–19746) | Whether the adjective suits the referent |
| ศูนย์ตลกไหมครับ ("is zero/centre funny?") | YES/NO state question with the noun ศูนย์ | Number words as subjects |
| 何時に行く？ → 明日、行く。 ("what time are we going? → tomorrow") | `Q_WHEN` + `A_WHEN{t from timeFuture}` (19726–19730) | Clock-time question answered with a day; `_answersQuestion` (14907) also accepts it |

These are not seven bugs. **Template rendering without a semantic model cannot be made safe across three languages.** Each fix would add another selectional table: v674 already carries `LN_BP_OBJ_OK`, `LN_BP_DEM_OK`, `LN_BP_WITH_OK`, `LN_BP_MOTION` and about 25 category regexes. Sooner or later every word pair the planner can form needs a table entry.

**Daily.** The same pattern appears in the deterministic fallbacks:
- `mandarinFallbackPair` (3784) produces pronoun + verb ("这个到。", 3831) and a bare target ("好。", 3864).
- `jaFallbackRecall` (35559) produces "明日分かる？" (35612–35621).
- Fallbacks pass **deterministic checks only** at acceptance (3994; `jaEvaluateRecallCandidate` 36132). The model judges them only later, in batch QC, and that judge can also pass them ("这个到。" passed).

**Consequence.** Every downstream rejection (NATURALNESS_FAIL, COHERENCE, CUE_MISMATCH) arrives after the plan is fixed, so recovery cannot change what is being attempted. See RC4.

### RC2 — The contract is not reconciled with the learner's inventory and the speaker setup before freezing. PROVEN · ZH both tracks, TH Daily, JA NEW words · high impact

**Mandarin Listening.**
- `LEARNER_INVENTORY introducedContent=30 targets=30 authorised=60` (ZH listening log line 10). Half of everything the learner can say is a target.
- Feasibility "PASSED" because the template proof found a lexical string for each target.

**Function words.** 是 is not in the bank (2932–3031) or in any scaffold:
- `MANDARIN_GRAMMAR_SCAFFOLD` 3039
- `ZH_PARTICLES` 3713
- `ZH_FUNCTION_FORMS` 14516
- `MANDARIN_CONVERSATION_BASICS` 3068

Natural Mandarin needs it constantly. In LS1 alone there are 3 `CLOSED_VOCAB_FAIL … unknown=[是]` lines, plus the preflight and repair lines that cite them (lines 133–151).

**Mandarin Daily.** 65 words, scarcity C, hardMax 6, 90 distinct sentences. The result was 75 duplicate rejections (telemetry line 506; the `CHECK_MODEL` counter says 55 — the two counters disagree) and 41 untaught-word rejections, with 2.73 attempts per recall.

**Thai คะ.**
- `THAI_SPEAKER_MAP` fixes A = male, B = female (11438).
- The prompt hard-codes the order A, B, A (11921–11923), and the fallbacks use `si%2===0 ? 'A':'B'` (13275).
- Nothing assigns a female-particle target to B. Worse, `thaiNormalisePoliteParticle` rewrites คะ→ค่ะ on statements (12277), which deletes the target.

**Japanese NEW words.** 物 and 場所 were deferred because "no licensed frame could be built". Feasibility is judged by whether a *template* exists (`japaneseTargetFeasibility`, 35234/35257), not whether a natural sentence exists. The template's limits become the curriculum's limits.

### RC3 — Stochastic model judges are used as hard, authoritative gates without a stability policy. PROVEN · all Listening tracks, ZH Daily · high impact

**Verdicts flip without any text change.**
- **JA Listening:** the coherence audit gave scenes 1–4 PASS and scene 5 FAIL. One exchange in scene 5 was patched (L26–L27). The re-audit then failed **scenes 2, 3 and 4 as well**, whose text had not changed (log lines 240–244).
- **TH Listening:** scene 4 flipped from pass to fail. The only patch that survived was in scene 6 (the scene 7 patch was reverted, the scene 5 patch returned no change), so scene 4's text was unchanged (lines 488–501).

**Two calls to the same judge disagree.** Transition validation and the final audit both call `listeningWholeCoherenceAudit` (18091) with the rule `detOk = det ≥ 4 || (det === 3 && model.pass)` (18127). But:
- they judge different windows (3 committed turns + phase, against each phase alone inside one whole-track call);
- they are separate calls at temperature 0.2.

JA phases LS2–LS5 and every committed TH phase passed transition at "det 3/5" (TH LS9 failed twice before passing), and the final audit then failed several of them.

**The failure reason names the wrong cause.** When the model fails a det-3 scene, the logged reason is replaced with "deterministic continuity 3/5" (18132). The deterministic score did not change; the model verdict did.

**UNVERIFIED is handled inconsistently.**
- An unverified transition judge counts as a **pass** (20777); an unverified final audit counts as a **fail** (18129, 22229).
- In Daily QC, an unparseable group reply marks the pairs `_qcUnresolved` (31593–31597). The quota then removes them (17736/17767, 15818). In ZH Daily that replaced three natural 好 pairs ("你很好", "这个好吗？", "嗯，好。") with fallback templates ("不好。", "今天好。", and a bare "好。" at check 11).

**This step is labelled quality control, but here it lowered quality.** Measurement noise — a judge reply that could not be parsed — was treated as evidence against the content.

### RC4 — Recovery re-asks the same impossible question instead of changing the content. PROVEN · all tracks · high cost

| Mechanism | Evidence | Assessment |
|---|---|---|
| 11-check ladder + `RECOVERY_STRATEGIES` (15594) | คะ: the same sentence "ผมอยากไปตลาดใหม่คะ" came back 3 times. "Strategy changes" are prompt text only (`recoveryStrategyPromptLines` 15662). | **Compensating.** The speaker plan was the cause, and no strategy can change it. |
| ZH tiers (`generateMandarinOneRecall` 3940) | 回 r3: the model's 你回家吗？ was rejected 7× as "same template as an accepted recall". At check 11, the deterministic fallback produced **the identical sentence** and accepted it, because the template rule is skipped for fallbacks (`if (!isFallback)`, 4006). | **Contradictory rule.** The fallback silently overrides the rule the paid attempts were failing. |
| Atomic repair (Listening) | Rejections in the 3 logs: PROTECTED_TARGET_LOST 7, NO_CHANGE 5, TARGET_NOT_PLACED 2, plus one each of ADJACENCY_REGRESSION, NO_PATCH_RETURNED and CLOSED_VOCAB (17 in total). The repair prompt keeps the planned target in a sentence the judge has already called unnatural. | **Mostly compensating** for bad frames. |
| PHASE_REGENERATE | Regenerates "from its FROZEN meaning plan … the exact rejected defects named". The same frames come back. | **Compensating.** |
| Remaining-plan rebuild (×3, 21559) | ZH spent 2 rebuilds on LS1 and 1 on LS10. TH's rebuild 2 was **INVALID** ("TURN_BUDGET 31 > 27"), but the counter is incremented before the validity check (21577 vs 21582), so it was still counted. | **Partly useful** (it does change targets), but budgeted badly. |
| Transition-only abort (21702–21704, 21789; **added in v674**) | ZH LS14 failed transition only. Composition stopped, and **16 targets in the three ungenerated phases were never attempted**: 7/30. | **Harmful. Introduced by v674. Revert.** |
| Turn-budget reject (`validateScenePreflight` 18718, path 21702–21769) | JA LS6 returned 8 turns against a maximum of 7 twice and was otherwise clean. `bad` was empty, so no rebuild ran, and **5 targets became UNPLACED**. | **Over-strict.** A deterministic one-turn trim would have kept all 5. |
| Quota recovery (`enforceTrackPairQuota` 15813) | Useful in TH Daily: 73 → 89 pairs. In ZH Daily it replaced good lines with templates (RC3). | **Useful.** Keep it, but feed it banked candidates. |
| Post-assembly coherence repair (22041) | JA: 1 patch was accepted and the re-audit got worse. TH: 1 of 4 accepted. | **Low value** while judges are unstable. |
| Deterministic fallbacks (Mandarin 3784, Japanese 35559, Thai 13275) | Produce the worst accepted sentences in the run. | Keep only as **candidates that must pass the same judge**, never as automatic acceptance. |

### RC5 — Multiple, contradictory sources of truth. PROVEN · cross-cutting · medium–high impact

- **Closed vocabulary.**
  - Thai: **11** checker implementations (`validateSmartPairs` ×2 algorithms, `thaiQcCheckVocabulary`, `validateThaiVocabulary`/`classifyThaiSpan`, `enforceThaiClosedVocabulary`, `isAllowedThaiWord`, `lintThaiContent`, a legacy `validateSmartPairs` inside `generateTrack` 13557, banned-substring lists, `validateClosedWorldCandidate`, `finalTrackQc`). Some variants are no longer called — `finalTrackQc` (11747), and `auditThaiTrackVocabulary` (10450) / `finalThaiVocabAudit` (10495), a further audit variant not counted above — so the live count is lower, but still several per sentence.
  - Thai also has three allowed-set builders that disagree (generation `_trackAllowed` 13151; final `buildThaiTrackVocabContext` 10733; `buildTrackAllowedContext` 10619).
  - **20+ allow-lists** across the three languages.
  - In Mandarin, 的 and 了 are stage-gated in prompts (`MANDARIN_GRAMMAR_SCAFFOLD`) but always allowed by the validator (`ZH_PARTICLES`).
- **"Taught" predicates.** **Seven** predicates disagree: `isLearnerTaught` 7108, `hasBeenIntroduced` 32008, `revisionEligible` 32165, `isWordIntroduced` 31950, and three language-specific ones.
- **Belt thresholds** live in four tables: `CURRICULUM_BELTS` 5636, `BELT_RANKS` 6787, `NEW_SLOTS_BY_KNOWN` 5653, `BELT_CONFIG` 5830. They are only cross-checked by a warning (6881).
- **QC runners.**
  - Three per-language runners: Thai `runQualityCheckCore` 26758, `runJapaneseTrackQC` 32626, `runMandarinTrackQC` 4315.
  - They sit on top of a shared `runAiQualityCheck` 31516.
  - The Listening judges are separate again: naturalness, transition and whole-track coherence.
- **Duplicate rules.** Mandarin QC accepts repetition at scarcity A/B, but `finalDuplicateAudit` treats any repetition without `_acceptedRepetition` as a hard fail.
- **Speaker identity.**
  - Generation checks particles only (`validateThaiSpeakerParticle` 11531).
  - The final, quota and early stages also count ฉัน as female (`thaiSpeakerIdentity` 27454). A line can pass generation and fail later.
- **Feasibility.** There are three different notions:
  - Thai sense deferral (`freezeThaiTargetSelection` 6208);
  - Japanese template-licence (`japaneseTargetFeasibility`);
  - Mandarin teachability (`gateTargetsByFeasibility` 3772 / `mandarinTargetTeachable` 3764).

  On top of these, Listening has a fourth: the v674 template proof.

### RC6 — No fixed benchmark; the tests and simulator measure the mock, not the product. PROVEN (process) · drives regression accumulation

- **No live model.** No test calls a live model. The `tests14.js` responder writes template lines ("我喜欢{}。", "ผมชอบ{}มากครับ").
- **Unrealistic learners.** Belt is pinned to Shodan (`harness.js:41`) and every non-locked word is set to "learning" (`tests14.js:35`). Small-inventory and closed-vocabulary conflicts are invisible.
- **The simulator hides real failures.** It failed Mandarin Listening for a reason unrelated to the real one (the mock rejects every line containing 我喜欢).
- **One real fixture.** The only fixed real output is one Thai revision track from 25 September. There is no golden, human-judged quality set.
- **One live run per version, with fresh targets each time.** Improvements and regressions are indistinguishable (§1.4).
- **No checks on the reports.** Build reports declare fixes "complete" against offline tests, then live runs contradict them. v674's report presented "TH 39 proven turns" as evidence. The live run planned 39 proven turns with largely the same frames, and failed on them.

**HYPOTHESIS:** much of the accumulated complexity exists because each version could only see its own failure. The 280 Listening-named definitions (about 5,500 lines), 75 functions referenced nowhere, and stale comments and messages fit that pattern. They are consistent with layers being added rather than replaced, but I cannot prove causation from the history alone.

### Investigations A–F, answered

#### A. Invalid verbalizability proofs

**Proven, and the cause is RC1.**

- **What the system checks:** whether a sentence *can be built from authorised words*. It does not check whether that sentence is *meaningful, natural or appropriate*.
- **Why each example was accepted:**
  - 钱大吗？, 我太买东西。 and ศูนย์ตลกไหมครับ: each word is authorised, the target is present, and the length is ≤ hardMax.
  - นมเป็นอย่างไรครับ / ตลกมากค่ะ ("how is the milk? / very funny", the frame behind your example นมตลกมากค่ะ): the STATE answer takes any adjective.
  - 何時に行く？ → 明日、行く。: the TIME slot accepts any future time word, and `_answersQuestion` (14907) also accepts it.

#### B. Contradictory rules

| Contradiction | Evidence | Which rule should be authoritative |
|---|---|---|
| Authorised entry, grammatical component rejected | 是 and 啦 in Mandarin; มัน in Thai (in `THAI_ALWAYS_OK_WORDS` 11113 but removed because it is a bank word, 10738) | One per-language **function-word scaffold**, decided by product. Function words are not curriculum content. |
| Natural sentence rejected by an over-strict rule | Model sentences with 是; JA LS6 one turn over (all 5 targets lost) | Length is a soft target. Trim deterministically; don't reject. |
| Unnatural sentence accepted by a deterministic fallback | "这个到。", "你回家吗？" (bypassing the template rule), "明日分かる？" | The **judge**. No path should accept content the judge has not seen. |
| Feasible before generation, impossible during recovery | Thai "proven" frames rejected as unnatural; then RUNTIME_REALISATION_FAILED; the rebuild is INVALID | Feasibility must use the same semantic authority as acceptance. |
| QC PASS despite recorded failures | "every phase gate clean" at det 3/5; "NATURALNESS PASS" for a 7/30 fragment; "QC: 0 rejected" | The integrity report should show **counts at every stage**, and gate names should say what they cover. |
| Passes alone, fails in conversation | JA and TH phases pass transition, then fail the final audit | One judging unit and one window. Judge each dialogue once, at the same granularity everywhere. |
| Final track differs from what was validated | Post-assembly patches change lines after the phase verdicts (22023); the save gate re-runs `enforceThaiClosedVocabulary` and can re-finalise without `qcRejections` (29674) | Freeze text once. Any later change re-runs the full acceptance function. |

#### C. Recovery

See the RC4 table. Useful: quota recovery, and the rebuild that actually changes targets.

Compensating for defective planning:
- strategy-prompt escalation;
- phase regeneration from the same frozen plan;
- atomic repair of planned frames;
- the coherence patch loop.

Harmful:
- the transition-only abort;
- rejecting a phase for one extra turn;
- deterministic fallback auto-acceptance;
- treating UNVERIFIED as rejection.

#### D. Conversation planning

**Proven: the fixed story forces unrelated words into predefined phases.**

The story is `LISTENING_STORY_PHASES` (19268): OPEN → DECIDE → ARRANGE → MOVE → DO → PAY → CLOSE. Targets are routed into it by gloss regexes (`listeningStoryPhaseOf` 19293), at most 7 per phase.

For a Revision set drawn by SRS order, the targets are semantically unrelated: แก่, พิพิธภัณฑสถานแห่งชาติ, ขนาด, ใบเสร็จ, ศูนย์ and พัน in one Thai set. Phases then hold words that have no reason to be together, and the turns are built to carry words, not to communicate.

The PAY phase demanded a receipt price ("ใบเสร็จราคาเท่าไหร่" — "how much is the receipt?"), which the judge rightly called unnatural.

**A conversation should be chosen to fit the target words, not the other way round** (see D.2).

#### E. Cross-language interference

**Appropriate as shared code:**
- the selection and freezing contract;
- the closed-vocabulary *principle*;
- the target and pair quota;
- the integrity report;
- the 11-check ledger;
- the judge service;
- the persistence path.

**Must be language-specific:**
- function-word scaffolds;
- segmentation and closed-vocabulary checkers;
- register (Thai gendered particles; Japanese plain vs polite);
- grammatical well-formedness;
- pronunciation (Thai phonetics, romaji, pinyin).

**Cases where code was shared or copied when it should not have been:**
- One template grammar (`_lnAbstractExchanges`) for three typologically different languages.
- The same fixed phase story imposed on Thai (888 authorised words, 7 phases) and Mandarin (60 authorised words, 5 phases).
- Mandarin was never moved to the target-group generator Japanese uses: there is no Mandarin adapter, and `GENERATOR_VERSIONS.zh='zh-gen-v650'` (16417). So Mandarin pays per recall (231 generation calls, against 66 for Japanese).

**Where a shared fix was copied without a language check:**
- The v672 "same template" rule targets a Mandarin pattern but does not apply to Mandarin fallbacks.
- The v674 Thai `ศูนย์`-as-digit rule passed its test fixture, but the live plan still produced "ศูนย์ตลกไหม".

#### F. Regression accumulation

**Proven instances:**
- **The v674 transition abort** cost the Mandarin run its last three phases (16 targets never attempted). The 11/30 → 7/30 comparison with v673 uses different targets, so it is not on its own proof of regression.
- **v674 PROVEN frames anchored the model on unnatural sentences.** The Thai naturalness failures are the frame sentences themselves.
- **v674 added transition judge calls.** Live Thai QC calls went from 23 to 33. Japanese stayed at 18, and Mandarin went from 21 to 18 (it stopped early).
- **The v672 template rule** was silently bypassed by fallbacks.

**Missing:**
- tests at real belts and real inventories;
- a golden quality set;
- record/replay of live responses;
- cross-component invariant tests (for example: a feasibility verdict implies the acceptance verdict on the same sentence);
- one source of truth per contract.

**Stale:**
- 75 unreferenced functions, including `japaneseRecoveryEngine` (36919, which leaves `generateJapaneseOneRecall` unreachable), `finalTrackQc` (11747), `validateThaiPersona` (11593) and `buildListeningBlueprints` (20380);
- stale messages (21671, 21532, 21718);
- a stale comment at 37383 ("builds its Listening Track automatically", which is no longer true).

---

## C. Current architecture map

### C.1 Daily (as implemented)

```
SELECT (per language, 3 implementations)
  TH: thaiVocabEligibility 28382 → pickBeltPriorityTargets 5922 → pickWords 6101 → freezeThaiTargetSelection 6208 (sense deferral)
  JA: selectTrackTargets 32287 + japaneseSelectNewSlots → japaneseTargetFeasibility (template licence) → jazhContractTargets 17796 → makeTrackContext 16431 (frozen)
  ZH: selectTrackTargets + mandarinSelectTargets 4223 → gateTargetsByFeasibility 3772 → jazhContractTargets   (NOT frozen at creation; context rebuilt later 16556)
        │  authorised vocabulary: TH 3 builders (13151 / 10733 / 10619) · JA/ZH snapshotLearnerInventory 14714 · 20+ allow-lists
        ▼
SCENE PLAN  establishConvoScene 9570 → buildSceneContract 15521 → planTargetScenes 12907 → finaliseScenePlan 12969
        ▼
GENERATE per target, 3 recalls, ≤11 checks each (RECALL_MAX_CHECKS 8225, ledger 8247)
  TH: generateWordLines 11832 (A,B,A fixed) → local repairs → validateSmartPairs (2 closed-vocab algorithms) → speaker/particle → early semantic gate (_earlyFlush) → HARDCODED_FALLBACKS 13275
  JA: generateTargetGroup 36229 (one request per target group) → jaEvaluateRecallCandidate 36132 → jaFallbackRecall 35559 (template, deterministic-only acceptance)
  ZH: generateMandarinOneRecall 3940 (ONE REQUEST PER CHECK) → validateMandarinPair 3582 → mandarinFallbackPair 3784 (template, deterministic-only, template rule skipped 4006)
        ▼
QC (3 runners → shared runAiQualityCheck 31516): cue batches (unparseable batch silently skipped 31417) → group judge (UNVERIFIED ⇒ _qcUnresolved ⇒ removed) → replace/improve
  TH additionally: finalPairSemanticAudit 27228 (cue + naturalness), enforceThaiClosedVocabulary ×3 stages
        ▼
finaliseMainTrack 15974: enforceTrackPairQuota 15813 (≤3 rounds, recovery per language: 17231 / 17509 / 17559)
  → mainTrackCoherenceAudit 16224 → recluster → premise replan → coherence repair → TEXT FREEZE 16037 → pronunciation
  → invariants → finalDuplicateAudit → reconcileQcIssues → integrity
        ▼
SAVE: TH onTrackGenerated 29650 (re-runs closed vocab "save" stage, may re-finalise) · JA saveTracksJa · ZH saveTracksZh (saves slots only if not _qcDone)
SRS: written only on play completion (TH 29696 · JA 34598 · ZH 37421) ✔ generation never writes SRS fields
```

### C.2 Listening (as implemented)

```
selectRevisionTargets 22360 → selectFeasibleListeningTargets 22453 (≤8 rounds × planListeningConversationBest 22432, ≤24 seeds)
   └─ planListeningConversation 20473: route targets → 7 fixed STORY PHASES (19268, gloss regexes 19293)
        └─ v674 template proof: _lnBpRoles 19618 → _lnAbstractExchanges 19679 → _th/_ja/_zhBpRender → check() [vocab+length+presence only]
        └─ _lnVerbalBudgetMerge 20432 → validateListeningMeaningPlan 19358  ("PROVEN", "VALID")
   FREEZE 30 ids
        ▼
_lnComposeByScenes 21378, per phase (≤2 generations):
   generate (prompt shows PROVEN FRAMES) → preflight 18686 (turn budget = hard reject) → local gates (closed vocab, adjacency, dupes, max3)
   → naturalness judge → [if locally clean] phaseTransitionValidation 20761 (judge on 3-turn window; UNVERIFIED = pass)
   → atomic repair (_lnAtomicQueue) → exchange repair → REPAIR_STRATEGY_GUARD → PHASE_REGENERATE
   → on failure: TRANSITION-only ⇒ ABORT whole composition (v674) │ coverage-only ⇒ globalReplan │ other ⇒ globalReplan (≤3, counted even if INVALID) → PHASE_TRIMMED → UNPLACED
        ▼
post-assembly: structure repair → quality atomic queue (6 calls) → listeningWholeCoherenceAudit 18091 (one call, all phases; UNVERIFIED = fail)
   → coherence atomic repair → re-audit (verdicts flip on unchanged scenes) → 20 final gates → status
```

### C.3 The problematic interactions

1. **Template proof → PROVEN frames → model told to say the frame → naturalness judge rejects the frame → repair keeps the target → regeneration repeats the frame → rebuild.** This is a closed loop whose only exit is losing targets.
2. **Local judge (window) against global judge (whole track)**, each stochastic, with opposite UNVERIFIED policies.
3. **Turn-budget hard reject → no replan path → targets UNPLACED.**
4. **A rule enforced on paid attempts but bypassed by fallbacks** (Mandarin template rule): the paid attempts are wasted and the outcome is the rejected sentence anyway.
5. **QC parse noise → UNVERIFIED → quota removes good pairs → fallback templates replace them.**
6. **Fixed speaker order (A, B, A) × a target that encodes speaker gender** → the recall voiced by A is lost by construction, after all 11 checks.

---

## D. Simplification proposal

### D.1 Principles

1. **Decide meaning once, early, with the only component that can judge meaning: the model.** That decision is checked by deterministic form rules and by the *same* judge contract used at acceptance. Templates may *suggest* candidates; they never *certify* them.
2. **Targets are frozen only after they are teachable.** Teachable means at least one candidate exchange or sentence per target has been accepted by the full acceptance contract.
3. **Recovery means choosing different content, not rephrasing the request:** the next banked candidate, a different speaker, or a different scenario.
4. **One acceptance function per output type**, which is the single source of truth. Everything else is telemetry.
5. **Judges are instruments with a stability policy:**
   - fixed prompts at temperature 0;
   - verdicts cached by text;
   - UNVERIFIED means "re-measure once"; if it stays unverified it blocks READY, but it is never treated as a rejection (content removed) or as a pass;
   - a final verdict is never overturned without a text change.

### D.2 Recommended architecture

Four stages, each with one responsibility and an explicit boundary.

```
① TEACHABILITY (new; replaces 4 feasibility notions + template blueprints + deterministic fallbacks-as-acceptance)
   in : SRS-ordered candidate pool (> 30), learner inventory snapshot, belt contract, speaker setup
   do : batched model request(s): for each candidate target, K short sentences (Daily) / Q–A exchanges (Listening)
        using only authorised words, each tagged with a situation (meeting, shopping, travel, home, food, phone…)
        → ONE deterministic contract per language (closed vocab, presence, hardMax, register/particles, pronunciation-ready)
        → ONE batched judge (meaning, naturalness, cue match) — the same judge contract as ④
   out: BANK[targetId] = accepted candidates; targets with none are DEFERRED (SRS untouched) and replaced from the pool
        before freezing; if 30 teachable targets cannot be found → INFEASIBLE, 0 generation calls
   FREEZE the 30 ids + bank
② COMPOSE (Daily: assign recalls; Listening: choose dialogues)
   Daily    : pick 3 distinct banked sentences per target (distinctness rule in ONE place); speaker chosen per target
              (a female-particle target is voiced by B)
   Listening: cluster banked exchanges by situation tag → 3–5 short dialogues that each have a plausible purpose
              (no fixed 7-phase story); order exchanges; specify connective turns
③ GENERATE (only what the bank does not already contain)
   Daily    : usually nothing (bank sentences are the recalls); one group request per target only for missing slots
   Listening: one request per dialogue: "write this dialogue around these exchanges (light adaptation allowed), add N
              connective turns, authorised words only"
④ ACCEPT (one function per output type; the single source of truth)
   deterministic contract (same as ①) → judge once per new/changed text (cached) → coverage / quota / invariants
   → text freeze → pronunciation → integrity report → persist
   RECOVERY lives here and has exactly two moves, both content changes:
     (a) swap the failing sentence/exchange for the next banked candidate of the same target
     (b) if the bank for that target is empty: one targeted group request with the judge's exact objection; else UNPLACED
   (Listening: a turn over budget is trimmed deterministically if no target is lost; a dialogue that fails coherence is
    regenerated once with a different exchange order, then its weakest exchange is swapped)
```

**Why this is simpler.** It replaces each item below with one stage:

- **① Teachability** replaces:
  - the Listening template planner: `_lnBpRoles`, `_lnAbstractExchanges`, the three renderers, `realiseListeningExchange`, `_lnShapeValid`, `_lnVerbalBudgetMerge` and the `LN_BP_*` tables (roughly 1,000+ lines);
  - the four feasibility notions;
  - automatic acceptance of fallbacks.
- **② Compose** replaces:
  - `LISTENING_STORY_PHASES`/`listeningStoryPhaseOf`;
  - phase balancing;
  - `validateListeningMeaningPlan`'s role checks.
- **④'s two recovery moves** replace:
  - atomic repair and exchange repair;
  - `REPAIR_STRATEGY_GUARD` and phase regeneration;
  - the three remaining-plan rebuilds and `PHASE_TRIMMED`;
  - the transition abort and the post-assembly coherence patch loop.

The 11-check ledger stays as the learner-visible record. A "check" becomes "a candidate judged for that recall", and banked candidates count as checks. That makes the display honest about what was tried.

**Cost expectation (HYPOTHESIS, to be measured by the benchmark):**
- ① costs about 3–6 batched requests per track.
- In exchange it removes most per-recall regenerations: Mandarin 231 generation calls, Thai 35 retries, and the Listening repair, regeneration and rebuild cycles (17 repair calls and 5 regenerations in Thai).

### D.3 Retain, correct, consolidate, replace, remove

| Mechanism | Decision | Reason |
|---|---|---|
| SRS model, selection order, belt tables (content), 30 targets, 3 recalls, NEW policies | **Retain** | Working. Generation never writes SRS (verified). |
| Closed-vocabulary *principle*, Layer A (segmentation) / Layer B (permission) split | **Retain** | Sound. |
| Japanese target-group generation (`generateTargetGroup` 36229) | **Retain; extend to Mandarin** | Japanese is the most reliable Daily (READY in 3 of the 5 live runs on file). Mandarin makes about 3.5× the generation calls. |
| Pronunciation pipelines (Thai canonical phonetics, Japanese reading pipeline, pinyin) | **Retain** | 0 alignment issues in all six logs. |
| Text freeze, `finaliseMainTrack` invariants, integrity report, "no commit with defects", deferral with SRS preserved, frozen-ids snapshot invariant | **Retain** | Correct verdicts in all six runs. |
| 11-check display / ledger | **Retain as presentation** | As you specified. |
| Judge usage | **Correct:** one judge service with temperature 0, cache, re-measure-once for UNVERIFIED, verdicts tied to text hashes | RC3 |
| Thai speaker assignment and particle normalisation | **Correct:** speaker chosen per target; never normalise away a target particle | RC2 |
| Mandarin `onTrackGenerated` slot order (37388–37392); telemetry stage tags (`aiStageOf` 7737); "QC rejected" counter | **Correct** | §1.3 |
| Listening turn budget | **Correct:** soft, with deterministic trim | JA LS6 |
| Function-word scaffolds (是, 啦, มัน…) | **Correct, after a product decision** | RC2 / B |
| Closed-vocabulary checkers (Thai 11 → 1 per language), allow-lists (20+ → 1 scaffold per language), "taught" predicates (7 → 1), belt tables (4 → 1), QC runners (3 + Listening judges → 1 judge service + language adapters), duplicate rules (several → 1) | **Consolidate** | RC5 |
| Feasibility gates (Thai sense deferral, Japanese template licence, Mandarin teachable, Listening template proof) | **Replace** with ① Teachability | RC1 / RC2 |
| Listening fixed story + meaning-plan role validation + rebuild/regenerate/atomic stack | **Replace** with ② + ④ | RC1 / RC4 / D |
| Deterministic fallback auto-acceptance (Mandarin 3784, Japanese 35559, Thai 13275) | **Replace:** fallbacks become bank candidates that must pass the judge | RC1 / RC4 |
| Transition-only composition abort (21702–21789) | **Remove** (v674 regression) | RC4 |
| "PROVEN FRAME" prompt rows (`listeningTurnPlanBlock`) and the v674 verbal module | **Remove** once ① exists. Until then, at least stop showing frames to the model. | RC1 |
| 75 unreferenced functions, `_lnPlanExchangesLegacy`, `o.legacyScenes`, stale messages, `LISTENING_ARCHITECTURE_*` labels | **Remove** (after the benchmark baseline is captured) | RC6 |

### D.4 Preserving the learning system

- **No changes to stored data.** Vocabulary entries, ids, statuses, OK counts, SRS fields, belts, histories and saved tracks are untouched.
  - All proposed changes are in generation.
  - **No migrations**; any future one would need explicit approval.
- **Old tracks stay playable.** The track schema is unchanged. New tracks may add fields, such as a bank provenance id.
- **Every product requirement on your list is preserved:**
  - 30 targets, 3 distinct recalls, and the NEW-word policies (Japanese 3 when feasible: ① makes "feasible" mean "a natural sentence exists", not "a template exists");
  - closed vocabulary;
  - pronunciation;
  - register;
  - the 11-check display.
- **Deferral only happens before freezing**, and never changes SRS fields.

**Product decisions needed (not engineering ones):**
1. Whether a Listening Track may be **3–5 short coherent dialogues** rather than one 7-phase story. Your brief says "coherent conversations", plural. I recommend yes.
2. The **function-word scaffold per language**, for example whether 是 and 的 are always allowed in Mandarin as grammar rather than curriculum.
3. Whether Thai female-particle targets (คะ, ค่ะ) should always be voiced by speaker B.

---

## E. Regression testing strategy

### E.1 Fixed benchmark corpus (one-off capture, then frozen)

**Six learner snapshots.** Export the real learner state per language (vocabulary with statuses and SRS fields, belt) from your devices, as JSON. Store them under `fixtures/benchmark/<lang>/learner.json`. These are read-only fixtures; the app's data is not touched.

**Target sets per combination:**
- the 8-October live sets for TH/JA/ZH Daily and Listening, whose ids are in the logs;
- plus the difficult cases below.

**Difficult-case targets, each a fixed list:**

| Case | Examples |
|---|---|
| Small authorised vocabulary | ZH Mukyu 60/65 words |
| Particles and register | คะ, ค่ะ; JA plain/polite |
| Polysemy | บัตร (card / business card), ตัว (classifier / body), ศูนย์ (zero / centre) |
| Question/answer correspondence | 何時, いつ, 为什么, ทำไม, เท่าไหร่ |
| Multiple targets per exchange | 今天/明天 contrast |
| Incompatible combinations | 钱 + 大, นม + ตลก |
| Duplicate-prone targets | 好, 回, 可以 |
| Previously failed words | คะ, ศูนย์, 可以, 好, 是-dependent lines |
| Eligibility and deferral | 物, 場所, 多少 |
| Recovery exhaustion | Forced-reject judge cassette |

**Record/replay cassettes.** Every benchmark live run stores each prompt and model response, keyed by a hash of the prompt.
- Replay mode reproduces the run byte-for-byte offline.
- Because prompts change when code changes, a cassette miss is reported, not silently mocked. This is how "did the code change the outcome?" becomes answerable.

### E.2 Two tiers, never mixed in reporting

| Tier | What runs | What it can claim |
|---|---|---|
| **T1 automated (offline)** | The existing suites plus new invariant tests. They run on the **real learner snapshots and real belts** (not Shodan or a whole-bank learner) and on cassette replay. | Mechanical correctness, determinism, and "same input gives the same output". **No quality claims.** |
| **T2 live** | Each of the 6 combinations × 3 runs, on the fixed snapshots and targets, against live Gemini. | Coverage, readiness, calls, tokens and quality, scored by the evaluator in E.3. |

### E.3 Independent linguistic evaluation

The evaluator is **independent** of the generator's judges:
- a different model family or tier from the generator;
- fixed rubric prompts at temperature 0;
- a majority of 3 votes;
- line-level scores.

It is **calibrated against a golden set**: about 150 lines per language from these logs, labelled once by a native speaker (correct / unnatural / wrong meaning / cue mismatch / register error). The evaluator's agreement with the golden set is reported. **If agreement falls below 85%, quality numbers are marked "uncalibrated".**

Each release also gets a human spot check: 20 random lines per track, read by a native speaker. That is the only route to a "native-speaker plausibility" claim.

### E.4 Measurements and pass criteria

The thresholds are proposals for your approval.

| Measurement | Definition | Daily criterion | Listening criterion |
|---|---|---|---|
| Valid target coverage | Targets present in a line that passed acceptance, in the intended sense | 30/30 | 30/30, or honest pre-freeze deferral with 30 teachable replacements |
| Recall completeness | 3 accepted, distinct recalls per target | 90/90; distinctness rule from one source | n/a |
| Cue accuracy | Evaluator: cue ↔ answer meaning and form | ≥ 95% of pairs | n/a |
| Naturalness | Evaluator: native plausibility ≥ 4/5 | ≥ 90% of lines; **0 deterministic-template lines that were not judged** | ≥ 90% of lines |
| Coherence | Evaluator: Q→A answered; no topic jump without a cue; state consistent | Scene-level ≥ 3/5 for all scenes | ≥ 95% of Q/A pairs answered; every dialogue ≥ 4/5 |
| Closed vocabulary | Single checker | 0 violations | 0 |
| Register | Particles and politeness by speaker | 100% | 100% |
| Pronunciation | Alignment audit | 0 issues | 0 |
| Recovery rate | Recoveries that changed content and were accepted ÷ recoveries attempted | Reported; regression if it drops more than 10 points | Same |
| Calls / tokens | Provider metadata | ≤ v674 baseline per combination (TH 175 / 372,697; JA 109 / 210,177; ZH 283 / 483,196) | ≤ v674 baseline (TH 64; JA 29; ZH 34), and READY |
| Final readiness | READY and every row above passing | 3 of 3 runs | 3 of 3 runs |
| **Report honesty** | Every PASS in the integrity report matches the evaluator | 0 PASS-but-evaluator-fail on blocking rows | Same |

### E.5 Safeguards against future regression

**1. One contract file per output type**, read by planning, generation, acceptance and tests. It defines:
- targets and recalls;
- the allowed-word scaffold;
- hardMax;
- register;
- the distinctness rule;
- the judge thresholds;
- the UNVERIFIED policy.

There is one implementation of each rule. A rule that must be skipped somewhere, as the fallback skip did, is a contract change, not a code branch.

**2. Cross-component invariant tests:**
- Anything ① accepts, ④ accepts (same text, same verdict).
- Every persisted line has a judge verdict.
- No path accepts content the judge has not seen.
- No READY track has a blocking evaluator failure.
- Generation never writes SRS fields.
- A frozen id set is never altered.
- Judge verdicts never change without a text change.

**3. Every observed failure becomes a cassette case** in the benchmark: คะ, 这个到, 是, LS6 one turn over, the transition abort, UNVERIFIED for 好, and the coherence flips.

**4. Comparison against a baseline.**
- Each change runs T1 on cassettes and T2 on the six combinations.
- The results are compared with the frozen v674 baseline, and with the last known good per combination where one exists: JA Daily v674; ZH Daily v672; TH Daily the v673 run of 8 Oct 01:05. **No live Listening run on file (v671–v674) has been READY**, so Listening has no "good" baseline.

**5. Acceptance criteria are set before implementation.** A change is "successful" only when its stated benchmark rows improve and no other row regresses beyond noise (3-run variance).

**6. No relaxation by stealth.** Thresholds live in the contract file. Any change to them is listed in the report and needs your approval.

**7. No destructive migrations** without explicit approval. The benchmark fixtures are read-only copies.

**8. Report discipline.**
- Reports separate T1 from T2.
- "Fixed" requires a T2 benchmark row.
- Simulator numbers are labelled "simulator" and never used as quality evidence.

---

## F. Implementation roadmap (ordered by dependency and impact)

**Each step ships alone and is benchmarked before the next starts. Nothing below has been started.**

### Step 0 — Benchmark and honest instrumentation (no behaviour change)

1. **Root problem:** RC6. Change cannot be measured. Telemetry mislabels: Mandarin regeneration 0%, "QC: 0 rejected".
2. **Modules:**
   - `harness.js`, `tests14.js` (belt and inventory realism);
   - new `fixtures/benchmark/*`;
   - a cassette layer at `geminiRequest`;
   - an evaluator script;
   - `aiStageOf` 7737 and `aiUsageSummary` 7841 (stage tags);
   - the integrity counters (16141, 16698).
3. **Alteration:**
   - capture snapshots and cassettes;
   - add the independent evaluator and golden set;
   - fix the stage tags and counters so they report what happens;
   - add per-stage rejection counts to the integrity report.
4. **Removes or simplifies:** nothing yet.
5. **Risks:** the snapshot export must be read-only. Protection: export via the existing export path, and verify checksums before and after.
6. **Tests:** cassette replay is byte-identical; the evaluator agrees with the golden set.
7. **Success:** the v674 baseline table for all 6 combinations × 3 runs exists, and telemetry matches the ledger counts.

### Step 1 — Remove the v674 regressions and the contradictions that cost targets (small, high value)

1. **Root problem:** RC3 and RC4 harms.
2. **Modules:**
   - `_lnComposeByScenes` (21702–21704, 21789; budget path 21718–21769; counter 21577/21582);
   - `listeningTurnPlanBlock` (PROVEN rows);
   - `aiQcGroups` (31593);
   - `generateMandarinOneRecall` (4006);
   - `onTrackGenerated` (Mandarin, 37382–37392).
3. **Alteration:**
   - remove the transition-only abort;
   - make the turn budget soft (deterministic trim when no target is lost);
   - count a rebuild only when it is valid;
   - stop showing PROVEN frames to the model;
   - treat UNVERIFIED as "re-measure once"; if still unverified, the pair stays flagged and still blocks READY, but is never removed and replaced by an unjudged template;
   - apply the template rule to fallbacks or drop that fallback path;
   - fix the Mandarin slot-save order;
   - correct the stale messages.
4. **Removes:** the abort branch and the fallback rule bypass.
5. **Risks:** more lines committed with a coherence 3/5. Protection: the final audit still gates READY, and the evaluator measures the effect.
6. **Tests:** cassette cases for ZH LS14, JA LS6 and ZH 好 UNVERIFIED.
7. **Success:** on the fixed sets, ZH Listening attempts every phase; JA LS6 targets are kept; ZH Daily 好 pairs are not replaced by templates; no evaluator-row regression.

### Step 2 — Single sources of truth (consolidation, no new behaviour)

1. **Root problem:** RC5.
2. **Modules:**
   - Thai closed-vocabulary checkers (the 11 listed in RC5);
   - allowed-set builders 13151 / 10733 / 10619;
   - allow-lists (`THAI_*`, `JA_*`, `MANDARIN_*`, `ZH_*`);
   - "taught" predicates (7108, 32008, 32165, 31950…);
   - belt tables (5636, 6787, 5653, 5830);
   - duplicate rules (Mandarin QC 4355, `finalDuplicateAudit` 15946);
   - Thai speaker checks (11531 against 27454).
3. **Alteration:**
   - one closed-vocabulary checker, one scaffold and one "taught" predicate per language;
   - one belt table;
   - one duplicate rule;
   - one speaker-identity rule;
   - the contract file.
4. **Removes:** about 10 checker variants, 15+ lists and 6 predicates.
5. **Risks:** a verdict changes on existing content. Protection: replay cassettes and diff every verdict; any change needs an explanation.
6. **Tests:** the invariant tests from E.5.
7. **Success:** identical or explained verdict diffs; fewer "checks used" for the same output.

### Step 3 — The teachability bank (the upstream fix)

1. **Root problem:** RC1 and RC2.
2. **Modules:**
   - new `buildTeachabilityBank(lang, inventory, candidates, contract)` with a language adapter per language (prompt, deterministic contract, judge rubric);
   - it is called by the Thai selection (`freezeThaiTargetSelection` 6208), the JA/ZH selection (`japaneseTargetFeasibility`, `gateTargetsByFeasibility`) and `selectFeasibleListeningTargets` 22453.
3. **Alteration:** freeze targets only when they have accepted bank entries; defer the rest (SRS untouched); speaker chosen per target.
4. **Removes or simplifies:**
   - the four feasibility notions;
   - fallback auto-acceptance (fallbacks become bank candidates that are judged);
   - the Japanese "licensed frame" gate.
5. **Risks:** extra upfront calls; the bank could repeat itself. Protection: batch requests; the distinctness rule applies across the bank; benchmark calls and tokens.
6. **Tests:** the difficult-case suite (E.1); invariant "bank accept ⇒ final accept".
7. **Success:**
   - JA NEW 3/3 when natural sentences exist;
   - Thai คะ resolved via speaker B or deferred before generation;
   - 0 unjudged template lines;
   - Daily calls ≤ baseline.

### Step 4 — Daily on the bank (generation becomes "fill only what is missing")

1. **Root problem:** RC4 and the Mandarin cost.
2. **Modules:**
   - `generateWordLines` 11832 and `generateMandarinOneRecall` 3940, which become thin "missing slot" requests;
   - Mandarin moves to `generateTargetGroup` 36229 with a Mandarin adapter;
   - `enforceTrackPairQuota` 15813 recovers from the bank first.
3. **Alteration:** recalls come from the bank. Recovery uses the next banked candidate, then one targeted group request with the judge's objection.
4. **Removes:**
   - per-check Mandarin requests;
   - strategy-prompt escalation (`RECOVERY_STRATEGIES` 15594, `recoveryStrategyPromptLines` 15662) as a recovery mechanism;
   - the A,B,A fixed template for target-encoded speakers.
5. **Risks:** variety drops if the bank is small. Protection: the distinctness rule and the variety audit are kept as blocking.
6. **Tests:** benchmark rows for Daily; cassette cases คะ, 可以, 回, 这个.
7. **Success:** 3 of 3 runs READY per language on the fixed sets; ZH calls well below 283; evaluator naturalness ≥ 90%.

### Step 5 — Listening on the bank (replace the planner and recovery stack)

1. **Root problem:** RC1, RC3, RC4 and investigation D.
2. **Modules:**
   - replace `planListeningConversation` 20473, `LISTENING_STORY_PHASES` 19268, `listeningStoryPhaseOf` 19293, the v674 verbal module (19496–20470) and `validateListeningMeaningPlan` role checks with **dialogue composition from bank exchanges**;
   - simplify `_lnComposeByScenes` 21378 to: generate dialogue → accept → swap exchange → UNPLACED;
   - keep the final integrity gates.
3. **Alteration:** 3–5 short dialogues chosen to fit the bank's situation tags; one judge pass per dialogue (cached); deterministic trim; recovery by swapping exchanges.
4. **Removes:** atomic repair queues, exchange repair, the strategy guard, phase regeneration, remaining-plan rebuilds, `PHASE_TRIMMED`, and post-assembly coherence patching. The removable code is roughly the Listening-named ~5,500 lines minus final gates, pronunciation and persistence; an estimate, to be confirmed while implementing.
5. **Risks:** this is the largest change. Protections:
   - it ships behind a flag that **only** switches the Listening builder;
   - old tracks stay playable;
   - the benchmark decides whether it ships.
6. **Tests:** benchmark Listening rows; cassette cases for the coherence flips, LS6 and LS14.
7. **Success:** Listening 30/30 READY in at least 2 of 3 runs per language on the fixed sets; evaluator coherence ≥ 95% of Q/A pairs answered; calls ≤ baseline.

### Step 6 — Delete dead and stale code

1. **Root problem:** RC6.
2. **Modules:** the 75 functions that are unreferenced inside `tt.jsx` (Appendix A), and legacy flags and labels.
3. **Alteration:** deletion only.
4. **Removes:** as listed.
5. **Risks:** a function reached via string or eval. Protection: run T1, T2 replay and a browser smoke test.
6. **Tests:** the full battery.
7. **Success:** no benchmark change; smaller bundle.

**Order rationale.**
- Step 0 makes every later claim checkable.
- Step 1 recovers targets immediately at almost no risk.
- Step 2 removes contradictory rules, so Step 3's bank is judged by one contract.
- Steps 3–5 move the meaning decision upstream, then delete the downstream compensation it makes unnecessary.
- Step 6 is safe only after the new paths are benchmarked.

---

## G. TL;DR

- **Diagnosis.**
  - The app checks the *form* of content early, in many contradictory places, and its *meaning* late, with stochastic judges used as hard gates.
  - Recovery then re-asks the same impossible question.
  - v674's "verbalizability proof" (my design) made this worse. It certified template strings such as 钱大吗？, 我太买东西。 and ศูนย์ตลกไหม as "PROVEN" and showed them to the model.
  - The final READY/NOT_READY verdicts were honest in all six runs.
  - What failed was everything before them, plus some PASS labels and telemetry that over-state quality.
- **Biggest proven causes:**
  1. No semantic check before freezing or in fallbacks.
  2. Contracts not reconciled with the learner's inventory and speakers (ZH: 30 targets from 60 words with no 是; Thai คะ forced onto the male speaker).
  3. Judges that flip verdicts without any text change, and UNVERIFIED treated as rejection.
  4. Recovery that cannot change content, plus two v674 rules that discard targets: the transition abort, and a one-turn-over phase losing all 5 targets.
  5. 11 Thai closed-vocabulary checkers, 20+ allow-lists and 7 "taught" predicates.
  6. Tests run on Shodan learners who already know almost the whole bank, against template mocks, so live failures are invisible.
- **Direction.** One model-backed **teachability bank** before freezing, then thin layers on top of it: compose from the bank, one acceptance function, and recovery by swapping banked content. Listening becomes 3–5 short dialogues that fit their words, instead of one forced 7-phase story. This removes about a thousand lines of template planning and most of the repair and rebuild stack. Learner data, SRS, belts, the 30/3 contracts, closed vocabulary, pronunciation and the 11-check display are untouched.
- **Immediate next action.** Approve **Step 0**: capture your six learner snapshots and the 8-Oct target sets as a frozen benchmark, add record/replay and an independent evaluator, and fix the mislabelled telemetry. Every later step is then judged against v674 on the same inputs.
- **Decisions needed from you:**
  1. Can a Listening Track be 3–5 short dialogues?
  2. The per-language function-word scaffold (for example 是).
  3. Should Thai female-particle targets always be voiced by speaker B?


---

## Appendix A — Top-level functions with no reference inside `tt.jsx`

These 75 names appear only at their own definition, counting whole-word occurrences anywhere in the file, out of 1,020 top-level functions. **Two are used by the test suites through the harness**: `setLearnerStateOverride` and `buildStandaloneListeningTrack`. Each one must be checked against the tests before it is deleted.

GenerationWorkspace, TrackTargetPill, _countSurface, _gateCodes, _lnResponseType, _thaiAllowedLine, acceptJapaneseFraming, acceptPair, acceptThaiLanguageRepair, aggregateQcResult, applyJapaneseFinalRepair, applyRankTestResult, assertCollisionDebt, assertEngineComplete, assertTrackReadyForQc, auditJapaneseTrackReadings, auditThaiTrackVocabulary, buildAndPersistThaiListening, buildJapaneseFinalQcPrompt, buildListeningBlueprints, buildStandaloneListeningTrack, buildThaiLanguageQcPrompt, buildTrackAllowedContext, checkVocabAddition, classifyDuplicate, currentThaiTargetGloss, daysBetween, disambiguatingCue, ensureThaiListeningBuilt, evaluatePromptAlignment, explainThaiSpan, explainThaiToken, finalThaiVocabAudit, finalTrackQc, finaliseThaiPair, formatQcVerdict, formatTrackMetrics, generatePairsLocal, getWordTypeHint, jaConceptIdsForSentence, jaGrammarRecordExposure, jaReadingForWord, jaRealiseConcept, japaneseBeltFor, japaneseInventoryForms, japaneseRecoveryEngine, japaneseRepairInstruction, listeningClosedWorldLine, listeningSpeakerOf, listeningTargetAllocation, makeRecallProvenance, mandarinComplexityCeiling, mandarinContextualReading, mandarinReadingInContext, mandarinSegmentSource, mandarinSelectSrsTargets, markWordIntroduced, newTrackMetrics, normaliseJapanesePunctuation, parseJapaneseFinalQc, parseThaiLanguageQc, preserveThaiPairIdentity, promoteRank, recordTargetOutcome, rollbackThaiLexiconMigrationV1, setLearnerStateOverride, thaiPhoneticToneAdvisory, thaiSuitabilityAuditCsv, thaiSupportLanguageCategory, thaiTangTaeNeedsThueng, thirdPerson, unseenRankTargets, validateJapaneseContentVocabulary, validatePairs, validateThaiPersona

## Appendix B — Key log lines cited

| Claim | Log (8 Oct, v674) | Lines |
|---|---|---|
| Mandarin Listening inventory: 30 introduced, 60 authorised | `listening-log-…06-31-46` | 10 |
| "PROVEN" plan with 钱大吗？ / 我跟在这里。 / 我太买东西。 / 我们昨天去这里吧。 | same | 40–76, 155–189, 220–251 |
| 是 rejected as an unknown lexeme | same | 133, 139–140 |
| Transition-only failure stops composition at 7/30 | same | 378, 388 |
| Japanese Listening LS6 lost to one extra turn | `listening-log-…06-33-32` | 211–228 |
| Coherence verdicts flip on unchanged scenes (Japanese) | same | 240–244 |
| Thai "proven" ศูนย์ตลกไหมครับ and frames later judged unnatural | `listening-log-…06-45-28` | 61, 143–169, 226–258, 307–329 |
| Thai coherence flip (scene 4) | same | 488–501 |
| Thai Daily: คะ on the male speaker, 10 paid attempts, unresolved | `gen-log-…06-40-49` | 627–741, 952, 958 |
| Thai Daily NOT_READY 89/90 + scene 8 at 2/5 | same | 962, 994–1000 |
| Japanese Daily NEW 1/3 and 7 fallbacks | `japanese-gen-log` | 3, 533 |
| Mandarin Daily: 你回家吗？ rejected 7× then accepted as fallback | `mandarin-gen-log` | 217–249 |
| Mandarin Daily: "这个到。" accepted, passes the group judge | same | 457–458, 556 |
| Mandarin Daily: UNVERIFIED 好 pairs removed, replaced by templates | same | 553–590 |
| Mandarin telemetry: regeneration share 0% | same | 629 |
