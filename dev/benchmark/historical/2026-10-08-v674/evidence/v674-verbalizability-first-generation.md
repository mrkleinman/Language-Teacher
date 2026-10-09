# v674 — Verbalizability-First Generation (Thai · Japanese · Mandarin)

**STATUS: IMPLEMENTED — LIVE VALIDATION PENDING.** This sandbox has no Gemini access, so none of the six required live runs happened. Nothing below is live-verified. Every "run" in this report used either a simulated model at the REST boundary or a deterministic replay of the 8-Oct live target sets with no model call.

## TL;DR

**What was wrong (8-Oct logs)**
- **Listening planned meaning that the language could not voice.** The planner accepted a turn without first checking that the learner's authorised words could say it.
  - Thai reached 23/30 targets, and its coherence audit passed only 1/7 scenes ("the reply does not answer the question"). Cost: 52 paid calls (15 gen + 14 repair + 23 QC).
  - Japanese reached 11/30 in 35 calls. Its OPEN phase asked "how are you / who are you", which needs 元気 / あなた / 私 / 考える, none of them taught.
  - Mandarin reached 11/30 in 42 calls.
- **Transitions were only judged at the end.** A phase could pass locally and still break the conversation (an unanswered question, a second payment). The break was found only by the final audit, after commit.
- **Daily:**
  - Japanese looped on する recall 3 at 11/11 checks (EXHAUSTED_AT_11), re-picking a dead recall.
  - Mandarin reported a duplicate pair while the track said READY.
  - Thai's preferred-length ratio was 76%.

**What v674 does**
1. **Core contract enforced in code.** No turn enters the meaning plan until a language adapter proves at least one natural authorised realisation (a **proven frame**) for it.
   - The proof runs on the same closed-vocabulary checker as the final audit, plus the belt hardMax and target presence, on both sides of every exchange.
2. **Three thin language adapters feed one shared planner:** `buildThaiListeningBlueprints`, `buildJapaneseListeningBlueprints` and `buildMandarinListeningBlueprints`.
3. **Infeasible targets are handled before the freeze.**
   - An unvoiceable target is **deferred** before the set is frozen, and its SRS obligation is kept.
   - A frozen set that cannot be voiced ends `LISTENING_PLAN_INFEASIBLE` with **0 paid calls**.
4. **A transition gate runs before each commit.**
   - The conversation state is recomputed from the committed text.
   - Deterministic state checks run, and then the **same judge as the final audit** checks the window around the new phase.
5. **Up to 3 remaining-plan rebuilds.** If a proven frame fails at runtime, it is marked `RUNTIME_REALISATION_FAILED` and the adapter must prove a different one. Committed phases are kept.
6. **Daily fixes:**
   - Japanese 11/11 is terminal: never re-enqueued, and the next open recall is picked.
   - する gets target-specific licensed constructions.
   - Mandarin has one authoritative final pair set, and its duplicate audit is reconciled with READY.
   - Thai asks for the 4–16-word version first.

**Proof so far (offline)**
- Full regression battery: **35 suites, all exit 0, 1,140 checks, 0 failures** on the final code.
- New `tests36.js`: 28/28. That includes A15, a seed-dependent-infeasibility defect found and fixed during this verification (§16.9).
- Fuzz: 132 runs, 0 build errors, 0 READY tracks with a failed gate.
- Browser boot and smoke tests pass. `tt.jsx` → `index.html`: **IN SYNC v674**.
- Replays of the three live 8-Oct target sets: **all three become feasible, with every target turn proven**. Thai has 39 proven turns, Japanese 36 (no 元気 / あなた / 私 / 考える), Mandarin 36.

**Cost of the change**
- About +5 transition-judge QC calls per Listening track.
- About +15–20% input tokens per track (simulated).
- 2–6 s more planning CPU.
- The repair spiral the gate replaces cost far more than that on 8-Oct (14 / 6 / 9 repair calls), but this trade is **unproven live**.

---

## 1. Root causes

| # | Symptom (8-Oct) | Root cause |
|---|---|---|
| R1 | TH coherence 1/7 scenes; "the reply does not answer the question" ×6 | The v673 meaning plan named acts (QUESTION(STATE) → ANSWER) without proving that any authorised sentence could ask *and* answer it. The model then filled the gap with an answer to a different question. |
| R2 | JA 11/30. The OPEN phase asked "how are you / who are you" | The phase goal ("greet each other, how they are") needed untaught words (元気, あなた, 私, 考える). Every candidate failed the closed vocabulary or skipped the target. |
| R3 | ZH 11/30; 为什么 answered with 大; ศูนย์ used as filler (also seen in v673) | Target metadata said *what act* a word takes, not *what sentence can carry it*. A WHY question had no proven reason answer, and a digit had no number context. |
| R4 | Transition failures were found only by the final audit | Phase gates were local. Nothing checked the new phase against the committed state (an open question, payment done, an agreed time). |
| R5 | Repair calls 14 / 6 / 9 with low first-pass rates (13% / 0% / 0%) | The consequence of R1–R4: the plan could not be voiced, so repair kept patching language the plan had made impossible. |
| R6 | JA Daily: する recall 3 UNRESOLVED after 11/11, re-picked | The recovery picker did not treat 11/11 as terminal. A stale `recovered` flag survived, and the next open recall (すみません r3) was never tried. |
| R7 | JA Daily: weak する sentences | する had no target-specific constructions, so the model produced generic, repetitive sentences. |
| R8 | ZH Daily: "duplicate of pair N / could not repair" while READY | The duplicate audit and the READY verdict looked at different pair sets. |
| R9 | TH Daily: preferred ratio 76% (advisory 80%) | The generation request did not ask for the preferred-length version first. |

## 2. Files and functions changed

**`tt.jsx`** (the only source; `index.html` is built from it)

Measured with `fndiff.js` (v673 → v674, top-level functions): **28 changed, 34 added, 0 removed**. The full list is in `results/v674-fndiff.txt`.

- **Changed:**
  - Main Track and QC: `generateTrack`, `finaliseMainTrack`, `runMandarinTrackQC`, `runJapaneseTrackQC`, `createRecallCheckLedger`, `JapaneseGenerator`, `jaFallbackRecall`, `buildJapaneseGroupPrompt`, `recoverJapaneseMissingRecall`.
  - Listening plan: `listeningSetStatus`, `buildScenePalette`, `validateIntentSkeleton`, `_lnPlanSkeleton`, `listeningTargetMetadata`, `buildListeningMeaningPlan`, `validateListeningMeaningPlan`, `listeningMeaningPlanLog`, `planListeningConversation`, `planListeningConversationBest` (8 → up to 24 planning seeds when none of the first 8 is valid).
  - Listening composition: `_lnGenerateScene`, `listeningTurnPalettes`, `listeningTurnPlanBlock`, `_lnScenePaletteFor`, `_lnComposeByScenes`, `buildListeningConversation`, `selectFeasibleListeningTargets`, `listeningFeasibilityLog`, `_buildStandaloneListeningTrackCore`.
- **Added:**
  - Daily: `thaiPreferredLengthNudge`, `finalDuplicateAudit`, `reconcileQcIssues`, `jaLicensedConstructions`, `jaLicensedConstructionsLine`.
  - Verbal context and roles: `_lnUnits`, `_lnBpPosOf`, `_lnBpHead`, `_lnBpCatOfGloss`, `listeningVerbalContext`, `_lnBpRoles`, `_lnAbstractExchanges`.
  - Language renderers: `_jaBpClass`, `_jaBpVerbForm`, `_jaBpIAdj`, `_jaBpPred`, `_jaBpRender`, `_zhBpRender`, `_thBpRender`.
  - Adapters: `_lnBlueprintsVia`, `buildJapaneseListeningBlueprints`, `buildMandarinListeningBlueprints`, `buildThaiListeningBlueprints`, `buildListeningBlueprints`.
  - Realisation: `realiseListeningExchange`, `_lnShapeValid`, `_lnSoloShapes`, `listeningTargetBlueprints`, `_lnPickAlt`, `realisePhaseExchanges`, `_lnVerbalBudgetMerge`.
  - Transition gate: `recomputeListeningConversationState`, `listeningTransitionStateIssues`, `phaseTransitionValidation`.

What each one does:

- **New v674 module** (placed before `planListeningConversation`):
  - Context and checks: `listeningVerbalContext` (`check`, `fill`, `setTargets`, semantic helpers), `_lnUnits`, and the caches `LN_VERBAL_UNKNOWN_CACHE` / `LN_VERBAL_UNITS_CACHE` / `LN_VERBAL_PRESENT_CACHE`.
  - Semantic data: the `LN_BP_*` semantic classes, `_lnBpCatOfGloss`, `_lnBpPosOf`, `LN_BP_VERB_CATS`, `LN_BP_VERB_OVERRIDE`, `LN_BP_OBJ_OK`, `LN_BP_DEM_OK`, `LN_BP_WITH_OK`, `LN_BP_MOTION` and `LN_BP_BARE_OK`.
  - Roles and exchanges: `_lnBpRoles`, `_lnAbstractExchanges`.
  - Adapters: `buildThaiListeningBlueprints`, `buildJapaneseListeningBlueprints`, `buildMandarinListeningBlueprints`, `_lnBlueprintsVia` and `LN_BLUEPRINT_ADAPTERS`.
  - Realisation: `realiseListeningExchange`, `_lnShapeValid`, `_lnSoloShapes`, `listeningTargetBlueprints`, `realisePhaseExchanges`, `_lnPickAlt` and `_lnVerbalBudgetMerge`.
  - Transition gate: `recomputeListeningConversationState`, `listeningTransitionStateIssues` and `phaseTransitionValidation`.
  - Constant: `LN_MAX_REMAINING_PLAN_REBUILDS = 3`.
- **Changed:**
  - Planning: `planListeningConversation` (verbal mode), `planListeningConversationBest` (8 seeds in verbal mode), `selectFeasibleListeningTargets` and `listeningFeasibilityLog`.
  - Skeleton and turn plan: `validateIntentSkeleton` (the `NOT_VERBALIZED` check, frame-based length), `listeningTurnPalettes`, `listeningTurnPlanBlock` (PROVEN frames, no extra turn) and `buildScenePalette` (frame support).
  - Goals and metadata: `LISTENING_PHASE_GOALS.OPEN` and `listeningTargetMetadata` (the excuse-me / pardon branch).
  - Composition loop `_lnComposeByScenes`:
    - verbal context and the trace and verbalizability logs;
    - `phaseIssues` (the transition gate after local gates);
    - state recompute on commit;
    - `globalReplan` (rebuild budget, runtime-failed frames);
    - `_trOnly` (stop on a transition-only failure);
    - `allowedMax` and UNPLACED logging;
    - non-strict mode for Daily-derived Listening.
  - Versions: `LISTENING_BUILD_VERSION`, `APP_BUILD_VERSION` (v674) and `LISTENING_ARCHITECTURE_V674`.
- **Daily:**
  - Japanese recall recovery: ledger `terminal`, `RECALL_TERMINAL_STATE`, `recoverJapaneseMissingRecall`, `finishJapaneseIncomplete` and `retryMissingRecall`.
  - Japanese する constructions: `JA_TARGET_CONSTRUCTIONS` and `jaLicensedConstructions(Line)`.
  - Mandarin duplicates: `finalDuplicateAudit`, `reconcileQcIssues`, `JAZH_INVALIDATING` (+duplicate) and the `finaliseMainTrack` invariants.
  - Thai length: `thaiPreferredLengthNudge`.

**Tests and tools:**
- New: `tests36.js` and `replay_v674_verbal.js`.
- Updated for intended behaviour changes: tests14, 16, 19, 21, 23 (J: PROVEN frames excluded from the reuse check), 24, 25, 26, 33, 34 and 35.
- `run_all.sh` updated.

## 3. Japanese 11/11 fix (Daily)

- **Terminal recalls stay terminal.** A recall that reaches 11/11 checks is marked `exhausted: true, terminal: RECALL_TERMINAL_STATE` in the ledger. That includes the "no pick" exit of `recoverJapaneseMissingRecall`, which v673 left open.
  - It is never enqueued again: no "Recovering…" line, no check, no paid call.
  - A stale `recovered` flag cannot override it.
- **The picker skips terminal recalls and takes the next open one.** On 8-Oct it re-picked する r3 and never tried すみません r3. The test reproduces exactly that order (tests36 D1, D2).
- **The SRS obligation is preserved:** an exhausted recall is reported honestly (`noRecoverableRecalls`) rather than hidden.
- **Recall quality for する:** it now gets **target-specific licensed constructions**, each passing the Japanese line check, shown in the target-group request (D3). Examples: 何してるの？, 今日は何する？, これ、どうする？, 明日、何する？ and 一緒に何かする？. A construction is offered only if every word in it is authorised for the learner.

## 4. Mandarin READY/QC fix (Daily)

- **One authoritative final pair set.** `finalDuplicateAudit` runs on the **final persisted pairs**, not on an earlier candidate list.
- **Stale issues are reconciled.** `reconcileQcIssues` drops QC issues whose pair is no longer present and keeps any that are STILL_PRESENT. A duplicate is now in `JAZH_INVALIDATING`, so an unresolved duplicate cannot coexist with READY.
- **The `finaliseMainTrack` invariant:** a track is READY only if no invalidating issue remains on a persisted pair (tests36 D4).

## 5. Blueprint architecture

A **blueprint** is a target-level, language-neutral contract with a proven surface. It carries:

- targetId, targetSurface and intendedSense;
- communicativeAct and propositionType;
- requiredLexemes and optionalLexemes;
- allowedGrammar;
- canonicalFrame (the proven sentence or sentences, both sides of the exchange);
- answerType, contextNeeds, incompatibleActs, hardMax and support words.

These fields are verified by tests36 A2.

**How blueprints are built**
1. `_lnBpRoles` classifies each target into a role from its gloss and part of speech: question word, digit, amount, yes / no, copula, conjunction, unit, verb, place, thing, demonstrative, state, and so on.
2. `_lnAbstractExchanges` turns the roles into language-neutral exchange ops: Q_WHERE_GO / A_GO, Q_WHY / BECAUSE, Q_PHONE / A_DIGITS, P_LETS / ACCEPT, and so on.
3. A language adapter renders each op with the learner's **authorised** fillers: places, foods, times, people, numbers, objects.
4. `realiseListeningExchange` checks every rendered alternative with `vx.check`:
   - the same closed-vocabulary checker as the final audit;
   - the belt hardMax;
   - target presence;
   - the per-turn target ceiling.

   Only passing frames survive. Up to 4 alternatives are kept for variety and for later rebuilds.

**Semantic guards stop nonsense frames.**
- The head noun's category decides which verbs it may take: eat → food, drink → drink, ride → vehicle, read → readable.
- Only like-for-like nouns are coordinated.
- Function words never become objects.
- Phrasal verbs are detected.

These guards removed "eat socks", "buy money", "ไปชุดนักเรียน" and "เบาหรือน้ำแข็ง" (tests36 A12).

**The plan carries its proof.**
- Every target-bearing skeleton turn carries its `frame`, and every meaning turn its `provenFrame`.
- With verbal mode on, a target turn without a frame is **`NOT_VERBALIZED`** and the plan is invalid.

**The model sees the frames.** Each phase request shows "TURN PLAN — MEANING FIRST, VERBALIZABILITY PROVEN" with `PROVEN: <frame>` on each row. The model may rephrase naturally with authorised words, but it knows one valid sentence exists. Proven-frame words get a palette boost.

## 6. Per-language adapters

| | Thai | Japanese | Mandarin |
|---|---|---|---|
| Register | Polite particle per speaker (ครับ / ค่ะ) | Casual plain form (だよ / ね / の？), consistent within the track | Neutral (吗 / 呢 / 吧 / 了) |
| Questions | ไหม, อะไร, ที่ไหน, เท่าไหร่, ทำไม | か-less casual rising, 何 / どこ / いつ / いくら / なんで | 吗, 什么, 哪里, 多少, 为什么 |
| Digits | Phone / amount contexts only (ศูนย์ = a digit, never "centre") | Phone / amount contexts only | Phone / amount contexts only |
| Reason | ทำไม → ไม่อยาก… / …มาก | なんで → …から / いいから | 为什么 → 太…了 / 不想… / 喜欢… (A6) |
| Tested | A3, A4, A7 | A3, A4, A5, A8 (no 元気 / 私 / あなた / 考える in ≈1,296 frames) | A3, A4, A6 |

All three return the same blueprint objects to one shared planner (A1). There is no per-language Listening engine.

## 7. Feasibility and defer logic

1. `selectFeasibleListeningTargets` builds **one** verbal context and runs the verbal planner over the SRS-ordered pool. `setTargets` re-targets that same context each round.
2. **Deferral.** A target with no proven blueprint (`UNVERBALIZABLE id surface — why`) is **deferred before the freeze**:
   - log line: `⏭ LISTENING_TARGET_DEFERRED target=… reason=… stage=… srsObligationPreserved=true`;
   - its due date and interval are untouched, and the next SRS candidate takes the slot (A9).
3. **Infeasible frozen set.** After the freeze, target ids are never swapped. A frozen set that cannot be voiced logs `⛔ LISTENING_PLAN_INFEASIBLE paidLanguageGenerationCalls=0` and ends NOT_READY with the exact word and reason (A10).
4. **Feasibility of a frozen set does not depend on the clock.** The attempt seed is a timestamp. If none of the first 8 planning seeds gives a valid plan, up to 16 more are tried before INFEASIBLE (planning only; tests36 A15).
5. **One plan, checked twice.** The plan proven before the freeze is the plan the composition re-proves. It uses the same context, closed vocabulary and turn ceiling. The Thai test plan has 44 turns at feasibility and 44 at composition (A13). v673 had 42 vs 46.
6. **Log lines:** `🧩 LISTENING_VERBALIZABILITY PROVEN|INCOMPLETE` and `LISTENING_TARGET_TRACE`.

**Daily-derived Listening** (the Listening built from a Daily track) runs **non-strict**. Targets that templates cannot voice keep their original exchange rather than being dropped, because that target set is fixed by the Daily track. A NOT_READY there would be a regression.

## 8. Transition-state validation

- **`recomputeListeningConversationState`** rebuilds the state from the **committed text** after every commit. The state covers speakers, agreed times, payments, eating, the open question, the previous turn and the remaining targets. It is logged as `🧾 CONVERSATION_STATE after LSn` (B1).
- **`listeningTransitionStateIssues`** runs deterministic checks against that state (B2):
  - an outstanding real question must be answered first (tag questions are excluded, and the Q-type is checked);
  - no second payment;
  - eating does not restart;
  - an agreed time stays agreed.
- **`phaseTransitionValidation`** runs **after** the local gates pass. It uses the **same judge as the final audit** (`listeningWholeCoherenceAudit`) on the window of the last 3 committed turns plus the candidate phase, and caches results per window. It logs `🔗 PHASE_TRANSITION_VALIDATION LSn LOCAL_PHASE_PASS · TRANSITION_PASS|FAIL`.
- **The 8-Oct Thai case is now caught before commit.** The 1/7 case is reproduced: LS2's reply does not answer LS1's question. `TRANSITION_FAIL` is logged **before** any `SCENE_COMMIT LS2` (B3).
- **Repaired or regenerated phases are re-validated**, through both the local and transition gates. The final whole-conversation audit stays as the safety net (B4).
- **No spiral.** A phase whose *only* residual issue is TRANSITION does not trigger target moves or rebuilds. It logs `⛔ PHASE_TRANSITION_UNRESOLVED` and the composition stops (`LISTENING_COMPOSITION_STOPPED`).
  - Test: with an always-failing judge, this ends in 10 calls instead of the 89-call spiral seen during development.

## 9. Remaining-conversation replan

- `LN_MAX_REMAINING_PLAN_REBUILDS = 3` replaces v673's single global replan (C1).
  - Only the **uncommitted future** is rebuilt, and committed phases are kept.
  - Logs: `🧭 LISTENING_REMAINING_PLAN_REBUILD n/3 … committed phase(s) kept`, then `⛔ LISTENING_REMAINING_PLAN_REBUILDS_SPENT 3/3` once spent.
- **Runtime failure.** If a phase cannot carry its proven frame, that frame is logged `🧩 RUNTIME_REALISATION_FAILED target=… frame="…"` and stored in `env.failedFrames`.
  - The rebuild passes it as `avoidFrames`, so the adapter must prove **another** blueprint (C2, C3).
  - The target id never changes.
- If no other blueprint exists, the target is logged `⛔ LISTENING_TARGET_UNPLACED`. It is never scattered into a replacement scene.
- Retries were **not** increased: the per-phase repair limits are unchanged, and the rebuild budget is a ceiling, not a target.

## 10. The six live runs — PENDING

None ran; there is no provider access here. Required:

| Run | What to check in the log |
|---|---|
| TH Daily | `preferredRatio` ≥ 80% (8-Oct: 76%); READY; no change elsewhere |
| JA Daily | No "Recovering…" line for a recall at 11/11; a different open recall is tried next; する sentences use the licensed constructions |
| ZH Daily | No "duplicate of pair N / could not repair" alongside READY; request count vs 240 / 405,531 tokens |
| TH Listening | `🧩 LISTENING_VERBALIZABILITY PROVEN`; every plan row `⟦proven: …⟧`; `PHASE_TRANSITION_VALIDATION … TRANSITION_PASS` per phase; coverage vs 23/30; coherence vs 1/7 |
| JA Listening | OPEN phase uses no 元気 / あなた / 私 / 考える; coverage vs 11/30 |
| ZH Listening | 为什么 answered with a reason; coverage vs 11/30; repair calls vs 9 |

In every log, also check:
- any `LISTENING_TARGET_DEFERRED`, with its reason;
- any `RUNTIME_REALISATION_FAILED` and the rebuild that followed;
- `LISTENING_TOTAL_PAID_CALLS`.

## 11. Final coverage (offline evidence only)

| | 8-Oct live (v673) | v674 replay of the same live target set (no model) | v674 simulated provider |
|---|---|---|---|
| TH | 23/30 | Feasible; 30/30 placed in a 39-turn plan, all proven | READY 30/30 (21 calls) |
| JA | 11/30 | Feasible; 30/30 placed in 36 turns, all proven, no untaught opener words | READY 30/30 (16 calls) |
| ZH | 11/30 | Feasible; 30/30 placed in 36 turns, all proven | NOT_READY 0/30 — simulator artefact (below) |

**The ZH simulator result is not a code regression.** The simulated QC judge rejects **every line containing 我喜欢**: that rule is meant for Main Track QC. The mock Listening composer writes 我喜欢X on every line. v673 ends identically: NOT_READY 0/30 in 35 calls; v674 does so in 45 calls.

The replay learner inventory is **reconstructed** from the log (introducedContent count + bank order). It approximates the live learner and is not the learner itself.

## 12. First-pass phase rate

| | 8-Oct live (v673) | v674 simulated |
|---|---|---|
| TH | 13% | 83% (5/6 committed first pass) |
| JA | 0% | 100% (5/5) |
| ZH | 0% | 0% (simulator artefact, §11) |

The simulator's composer is cooperative, so these rates show that the gates and plans don't *block* a good model. They do not predict live rates.

## 13. Repair, generation and QC call counts

| | 8-Oct live v673 (gen + repair + QC = total) | Sim v673 | Sim v674 |
|---|---|---|---|
| TH | 15 + 14 + 23 = **52** | 6 + 1 + 8 = 15 | 6 + 1 + 14 = 21 (6 are transition judges) |
| JA | 11 + 6 + 18 = **35** | 5 + 0 + 6 = 11 | 5 + 0 + 11 = 16 (5 transition) |
| ZH | 12 + 9 + 21 = **42** | 12 + 12 + 11 = 35 | 16 + 15 + 14 = 45 (artefact path) |

The new cost is one transition judge per committed phase (+5–6 QC calls). The intended saving is the repair and regeneration spiral that unproven plans caused live. That saving is **not yet measured live**.

## 14. Token and cost comparison with v673 (simulated; the live logs carry no token metadata)

| | v673 sim tokens / USD | v674 sim tokens / USD | Δ |
|---|---|---|---|
| TH | 26,632 / 0.003275 | 30,893 / 0.003762 | +16% |
| JA | 21,092 / 0.002772 | 24,133 / 0.003127 | +14% |
| ZH | 45,936 / 0.006143 | 55,952 / 0.007280 | +22% (artefact path, 3 rebuilds) |

- Input prompt characters per track also rose: TH 60k → 72k, JA 56k → 66k, ZH 43k → 53k. The causes are the proven-frame rows and the transition windows.
- Daily tracks are unchanged in the simulator: TH 206 requests, JA 215, ZH 288.
- Planning CPU: TH 1.8 → 2–6 s; JA 0.5 → 2–3 s; ZH 0.3 → 3 s. No paid calls.

## 15. Teaching-quality score per track (assessment of the proven frames, NOT of live output)

| | Score | Why |
|---|---|---|
| TH | **3/5** | Every frame is grammatical and authorised, and the story arc is clear: OPEN → DECIDE → ARRANGE → MOVE → DO → PAY → CLOSE. Some frames are flat or loosely linked: "ใบเสร็จเป็นอย่างไร → ตลกมาก" (how is the receipt → very funny) and "ไม่เชิงไปค่ะ". |
| JA | **3.5/5** | Natural casual exchanges ("どれを見る？—映画を見る。", "バスと電車、ある？—うん、ある。") and no untaught opener. Some replies are weak: "なんで帰るの？—いいから", "映画が好き。—たぶん。" |
| ZH | **3/5** | Correct and authorised, and 为什么 gets a reason. Several frames are thin: "我们跟在哪里？", "你为什么来？—太好了。" |

These are **template floors**. The model writes the final lines with the frame as proof that a valid line exists, so live quality should be higher. That is unverified.

## 16. Unresolved issues

1. **Live validation:** all six runs are pending, and nothing here is live-verified.
2. **Template-frame flatness:** some proven frames are semantically loose (§15). The model is free to improve them, but a weak frame can still anchor a weak line.
3. **Daily-derived Listening is non-strict.** Targets that templates cannot voice keep their original exchange without proof, so the core contract is fully enforced only on standalone Listening.
4. **+5–6 QC calls per track** for transition judges; a token increase of +14–22% (simulated).
5. **Planning CPU of 2–6 s** per track, with no paid cost; Thai is the slowest. In the rare case where the extended seed search runs, it adds about 2 s.
6. **ZH simulator path** stays NOT_READY because of the simulator's reject rule, the same as v673. A real ZH run is the only meaningful check.
7. **No alternate blueprint within a phase.** Switching to another proven blueprint happens via the remaining-plan rebuild (≤3), not inside a phase.
8. **Thai noun-heavy plans** can reach 44 turns (cap 44). The turn plan tells the model to add no extra turn.
9. **Found and fixed during verification: seed-dependent infeasibility.** The first final battery failed tests23 in about 1 run in 6. The failures were not timing; they depended on the seed, which is the attempt timestamp.
   - **TH U2.** A frozen noun-heavy Thai set was declared `LISTENING_PLAN_INFEASIBLE — TURN_BUDGET 46 > 44` for **9 of 100** attempt seeds, because all 8 planning seeds landed 2 turns over budget. In the app, that means a Rebuild could fail with 0 paid calls purely because of the clock.
     - Fix in `planListeningConversationBest`: if none of the first 8 seeds gives a valid plan, up to 16 more planning seeds are tried before INFEASIBLE. This is planning only — no model call, no retry of anything paid.
     - Result: 250/250 Thai seeds feasible; JA 60/60; ZH 60/60.
     - New regression test: tests36 **A15**, which includes the reproducing seed `…06:11:07.113Z`.
   - **ZH J (test refinement, not a code defect).** In 5 of 40 seed pairs, the rebuild prompt contained a short line of the failed track ("觉得很好。"). It appeared only as part of a PROVEN frame the adapter derived independently ("我觉得很好。"). The failed lines themselves are never sent back.
     - tests23 J now checks the prompt with the `PROVEN:` segments removed.
   - After the fix, tests23 passed 4/4 runs executed concurrently under load, plus the full battery.

## 17. tt.jsx → index.html sync

- **Build:** `python3 build_index.py tt.jsx <shell> index.html v674` produced `built index.html v674`.
- **`node check_sync.js`:** **IN SYNC · app-version v674 · SW cache tt-v674**.
- **Full battery on the final code:** tests.js – tests36.js, 35 suites, all exit 0, 1,140 checks, 0 failures (`results/v674-exitcodes.txt`).
- **Other checks:**
  - `fuzz_listening_scenes.js`: 132 runs, 0 build errors, 0 READY tracks with a failed gate, an overlong line or an unknown word.
  - `browser_checks_v672.js`: stages 1–11 pass.
  - `browser_smoke.js`: boots; console notes only (the Babel size note and a 404).
