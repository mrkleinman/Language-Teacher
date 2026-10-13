# v692 — Listening architecture repair (Thai · Japanese · Mandarin)

Branch: `claude/session-continuation-check-a19meq` (development only). No paid calls were made. Nothing was deployed.

## 1. Root cause of the repeated v690 / v691 failures (Phase 1)

Evidence: the three v691 logs (Mandarin 11-32-01, Japanese 11-32-24, Thai 11-32-50) read against the code of
`generateCohesiveListeningTrack` → `_buildStandaloneListeningTrackCore` → `selectFeasibleListeningTargets` →
`planListeningConversationBest` → `planListeningConversation` → `buildListeningConversation` → `_lnComposeByScenes`.

### The 12 stages, as built in v691

| # | Stage | Function(s) | What it really does |
|---|---|---|---|
| 1 | Select SRS candidates | `selectRevisionTargets`, `listeningCandidatePool` | SRS order; correct, not the problem |
| 2 | Sentence blueprints | `_lnSoloShapes`, `_lnAbstractExchanges`, `_thBpRender` / `_jaBpRender` / `_zhBpRender` | ~60 fixed sentence frames per language (`ชอบ X ครับ`, `X、ある？`, `我们X吧`, `跟…吗`) filled with whatever word is assigned |
| 3 | Words → conversational roles | `listeningTargetRole`, `listeningTargetMetadata`, `lnSemClass` | role from the English gloss by regex: 很 → ACTION, 开 → PLACE, 跟 → CONTENT, あれ → PLACE, 電車 → PLACE, คุ้ม → ACTION, ไว้ → CONTENT |
| 4 | Meaning plan | `LISTENING_STORY_PHASES`, `listeningStoryPhaseOf`, `planListeningConversation`, `_lnPlanMeaningExchanges`, `buildListeningMeaningPlan` | a FIXED story arc (OPEN → DECIDE → ARRANGE → MOVE → DO → PAY/CLOSE) is chosen first; targets are dropped into phases by gloss keywords and a seeded shuffle, ≤6 per phase; each phase is then filled with generic acts ("A asks a yes / no question using X", "A tells B something about X + Y") |
| 5 | "VERBALIZABILITY PROVEN" | `realiseListeningExchange` → `vx.check` | a frame passes when (a) every word is authorised, (b) the turn is under hardMax, (c) the target string is present. **Nothing checks meaning.** |
| 6 | Semantic compatibility | `validateListeningMeaningPlan`, `lnExchangeSemanticProblems` (v691) | slot/role bookkeeping + 6 coarse gloss classes (FOOD, PLACE, PERSON, MONEY, VEHICLE, MEASURE); unknown classes are never blocked |
| 7 | Generate sentences | `_lnGenerateScene` | the model is told to follow the turn plan and the "proven" frames |
| 8 | Naturalness / transition QC | `la.verdicts` (score ≥ 4 or REJECTED), `phaseTransitionValidation` | the AI judges are right: they reject what the plan forced |
| 9 | Repair | `_lnAtomicQueue`, exchange repair | may change only the line, must keep the "protected" targets in the SAME intention |
| 10 | Replan | `PHASE_REGENERATE` (same frozen plan), `LISTENING_REMAINING_PLAN_REBUILD` (same planner, new seed) | regenerates from the defective plan, or re-runs the same template machinery |
| 11 | Commit | `SCENE_PREFLIGHT` → commit | logs `decision=COMMIT (candidate)` before the semantic gate has run |
| 12 | Finalise | `buildListeningConversation` gates | runs on 0 lines: `PASS [VACUOUS]` |

### Why the planner says "VALID" for invalid plans

"Valid" in v691 meant **structurally valid**: every planned turn had a frame whose words are authorised, short enough, and
contain the target. The validator never asked whether the sentence means anything, whether the reply answers the
question, or whether the word's grammar is satisfied. The examples in the brief are exactly what the frames produce:

| Approved by v691 | Frame that produced it | What was never checked |
|---|---|---|
| นี่เป็นอย่างไรครับ → แก่มากค่ะ | `Q_HOW` → `STATE` | แก่ (old) needs a person/animal; "this" is a thing |
| ไว้ตลกมากครับ | merged STATEMENT `S_STATE` with two "content" words | ไว้ only follows a verb |
| ชอบค่าโดยสารไหมครับ | `Q_LIKE` (`ชอบ X ไหม`) | "like the fare?" — verb–object meaning |
| 何時に行く？ → 明日、行く。 | `Q_WHEN` / `A_WHEN` (slot TIME) | 何時 asks a clock time, 明日 is a day |
| これ、いくら？ → 高いね。 | `Q_PRICE` / `STATE` | いくら needs a price, not an opinion |
| なんで行くの？ → いいから。 | `Q_WHY` / fallback reason | a reason must be given |
| 跟找钱吗？ | `Q_YN_V` with `mod=跟`, subject dropped | 跟 needs a person and a verb after it |
| 我们昨天去这里吧。 | `P_LETS` with a TIME and a PLACE | a suggestion cannot be in the past; 去 + 这里 |
| 我们明天跟用这个吧。 | `P_LETS` with 跟 as "modifier" | 跟 + verb |
| 我现在一起到。 | `S_WILL` with 一起 | 一起 needs a plural subject |

### Why each fix since v673 failed

Every version added a validator or a retry **downstream of the same template planner**: v673 meaning plan (structure
only), v674 verbalizability proof (vocabulary + length + presence), v675–v690 more repair levels and guards, v691
six semantic classes. The planner kept generating meaning-free plans; the AI judges kept rejecting them; repair could
not fix them because repair keeps the same intention and the same protected words; phase regeneration re-used the
FROZEN plan; global replan re-ran the same planner. The logs show the loop: Thai LS1 failed twice for TRANSITION,
was regenerated from the same plan, failed again, and `PHASE_TRANSITION_UNRESOLVED` stopped the whole track at 0/30.
Japanese LS1 and LS2 failed on 何時→明日 / あれ / いいえ in the same way; Mandarin LS1 cycled 3 global replans that
produced 我们昨天去这里吧 / 我现在一起到.

**Root cause (one sentence):** the Listening planner is template-first — it fixes a story arc and sentence frames,
assigns words to grammatical slots, and calls the result "proven" on vocabulary/length/presence alone — so meaning is
never planned, and every downstream judge, repair and replan works from a plan that cannot be made natural.

### The Mandarin proxy failure is separate

`CLAUDE HAIKU UNREACHABLE … Failed to fetch` is a browser network failure (no HTTP status reached the page) after
3 attempts (`ANTHROPIC_CONFIG.maxAttempts`). It is not a model-quality failure. See section 8.

## 2. Why the previous fixes did not solve it

v673–v691 each added a check or a recovery level **after** the template planner (meaning-plan bookkeeping, the
verbalizability proof, repair guards, phase regeneration, global replan, six semantic classes). None of them changed
how the plan was made, so every judge, repair and replan was working from a plan that had no meaning to begin with.
Phase regeneration even re-used the FROZEN defective plan, and global replans ran the same template planner with a
new seed. v691's semantic classes were too coarse to see 何時→明日, いくら→高いね, 跟 + verb or แก่ about "this".

## 3. What changed (files / functions)

`dev/tt.jsx` — new block `TT_V692_MEANING_FIRST` (default ON, `listeningMeaningFirstOn()` / `setListeningMeaningFirst()`):

| Stage | Function | What it does |
|---|---|---|
| Profile | `lnMfProfile`, `LN_MF_CONTRACTS`, `lnMfAsks`, `lnMfNounClass` | what each target asks for (何時 = a clock time, いくら = a price), what it may describe (แก่ = people / animals), what words its grammar needs (跟 = a person, 回 = a place) |
| Feasibility before freeze | `lnMfTargetFeasibility`, `lnMfSelectFeasible` (called by `selectFeasibleListeningTargets`) | a target the learner cannot use naturally (no number words to answer 何時 / いくら / 多少; no situation at all) is deferred and replaced from the SRS pool, due date untouched — 0 paid calls |
| Group by meaning | `LN_MF_SITUATIONS`, `lnMfSituationScore`, `lnMfGroupTargets` | targets join the everyday situations they belong to (meeting, deciding, agreeing a time, getting there, eating, shopping, looking around, home, wrapping up) — the sequence comes from the targets, never a fixed arc |
| Plan intentions | `lnMfPlanPrompt`, `lnMfPlanCall` (1 call) | per turn: speaker, addressee, intent, asks, referent, action, object, context, expects, respondsTo, targets, sentence, English |
| Validate A–E | `lnMfValidate`, `lnMfZhProblems`, `lnMfJaProblems`, `lnMfThProblems`, `lnMfAnswerProblem`, `lnMfQuestionAsks` | A: the same closed-vocabulary / length / duplicate / speaker audit as the final gate · B: grammar contracts · C: referent / object / time rules · D: question → answer types · E: greetings, goodbyes, agreed time, speaker runs |
| Semantic audit | `lnMfAuditCall` (1 batched call), `lnMfVerdictIssue` | sense · reply · usage natural / acceptable / awkward / incorrect · situation coherence · transitions; unverified never passes |
| Recover by fault | `lnMfScopes`, `lnMfRepairCall`, `lnMfApply` | line · exchange · NEW intention · move a target to another situation · scene start; protected lesson words must survive; rejected sentences / relationships cannot come back; ≤ 3 rounds, stops on no progress |
| Commit | `_lnComposeMeaningFirst` | only a fully approved plan is committed; the shared final gates then judge the final text |

Also in `tt.jsx`: `buildListeningConversation` routes the standalone Listening Track to `_lnComposeMeaningFirst`
(no silent fallback — the legacy composer runs only when the switch is turned off); `listeningFeasibilityLog`
(meaning-first wording); architecture label `meaning-first-v692`; `_zhLexiconAdapter` gives Mandarin function words
their pinyin (啊 had none → "no reading for 啊" blocked READY); `matchesJapaneseTarget` + `jaCompoundsContaining`
(behind the quality switch): a one-kanji target is not heard inside a longer bank word (車 in 電車, 本 in 本当);
`APP_BUILD_VERSION` / `LISTENING_BUILD_VERSION` = v692.

Tests: new `tests49.js` + `benchmark/v692/{learners,plans,mock}.js`; `tests23–39` opt in to the legacy planner
(`TT_LISTENING_LEGACY`, assertions unchanged); `tests48` L6/L7 the same; `tests39` C1 replays its v680 cassettes with
the quality switch they were recorded with; `harness.js` and `benchmark/run.js` carry the switch.

## 4. Before and after — semantic blueprints

**Before (v691, from the logs):** a fixed arc, words dropped into slots, frames filled:
Thai `LS1 OPEN [เป็นอย่างไร, พวกคุณ, แก่, คุณอายุเท่าไหร่, รถสองแถว, ทางเข้า]` → "นี่เป็นอย่างไรครับ → แก่มากค่ะ", "ชอบทางเข้าครับ".
Japanese `LS3 ARRANGE [明日, 何時, まだ, うん, 映画]` → "何時に行く？ → 明日、行く。".
Mandarin `LS3 ARRANGE [明天, 今天, 找, 等, 人, 跟, 在]` → "跟找钱吗？".

**After (v692, the real grouping on the same learners — deterministic, no model call):**

- Thai: MEET [คุณอายุเท่าไหร่, แก่, พวกคุณ, เป็นอย่างไร, ตลก, นักท่องเที่ยว] · PLAN [พิพิธภัณฑสถานแห่งชาติ, สนามหลวง, ร้านอาหาร, ทาง, น่าดู, ไปที่, ทางเข้า, ที่นั่น] · TIME [สิบโมงเช้า, สิบเอ็ดโมงเช้า, ไว้, คือ] · TRAVEL [เลี้ยว, นานเท่าไหร่, รถสองแถว, ค่าโดยสาร, รถแท็กซี่] · EAT [ทานกันเลย, ผัดไทย, คุ้ม, ไม่เชิง] · PART [โชคดี, เบอร์โทรศัพท์, แย่แล้ว] — all 30 v691 targets kept.
- Japanese: 何時 and いくら deferred (no number words — a clock time / price can never be answered), replaced from the SRS pool; MEET [どう, 会う, 昨日, なんで, ごめん] · PLAN [見る, あそこ, あれ, 本] · PLAN [映画, 写真, どっち, どれ, 欲しい] · TIME [明日, もう, まだ, また] · TRAVEL [帰る, 行く, 電車, バス, 車, いいえ] · SHOP [買う, お金, できる, はい, うん, 大丈夫].
- Mandarin: 多少 deferred (no amount words); MEET [昨天, 谁, 人, 为什么, 我] · TIME [现在, 今天, 明天] · TRAVEL [去, 来, 哪里, 怎么] · TRAVEL [等, 回, 到, 在, 跟] · SHOP [钱, 买, 用, 拿, 开, 一起] · LOOK [找, 小, 大, 这里, 那里, 很, 太].

Example approved exchanges (the controlled test plans in `benchmark/v692/plans.js` — written with only each learner's
authorised words and accepted by the app's own validators; they show what passes, not what Haiku will write):
คุณอายุเท่าไหร่ครับ → สามสิบค่ะ → ไม่แก่เลยครับ · ค่าโดยสารเท่าไหร่ครับ → สิบบาทค่ะ · 本と映画、どっちが好き？ → 映画が好き。 · いいえ、電車で行こう。 · 你昨天为什么不来？ → 我有工作。 · 跟我来。

## 5. Proof the original invalid examples are rejected (tests49 C1–C11)

All rejected by the **deterministic** validators, with the audit told to call everything "natural":
แก่มากค่ะ after นี่เป็นอย่างไร (REFERENT_MISMATCH) · ไว้ตลกมากครับ (GRAMMAR ไว้) · ชอบค่าโดยสารไหม (MEANING ค่าโดยสาร) ·
何時に行く？→明日、行く。 / これ、いくら？→高いね。 / なんで行くの？→いいから。 (ANSWER_TYPE) · 跟找钱吗 (跟) ·
我们昨天去这里吧 (吧 + 昨天, 去这里) · 我们明天跟用这个吧 (跟) · 我现在一起到 (一起, 到).
ผัดไทยอยู่ที่ไหน → อยู่ร้านอาหาร has no reliable word rule: it is caught by the **semantic audit** stage (D6).
No defective plan is committed, no legacy fallback runs, and the run stops before paid scene generation.

## 6. Regrouping produces different, more coherent plans
Deterministic evidence (B4/B5): แก่ now sits with "how old are you?" instead of "this thing"; transport words share a
situation; money and buying share a situation; the three languages get three different situation sequences.

## 7. Offline results — reported separately

| Group | Result |
|---|---|
| **v692 meaning-first (tests49, default path, real planning + validation, scripted model replies)** | **58/58** |
| Legacy template planner (tests23–39, assertions unchanged, explicit opt-in) | all pass except the 3 known pre-existing items (tests33 2G; tests35 2C-thTH / 2C-zhZH, fixture not in the package) |
| tests48 (v691; L6/L7 opt in to the legacy planner) | 24/24 |
| Whole offline regression (all suites) | OK |
| Replay proof (527 recorded requests, quality switch off) | 0 mismatches, content identical |
| Release smoke test on the owner's backup (main v691 vs dev v692) | 19/19 |

The legacy results say nothing about v692. tests49 proves the pipeline (selection, feasibility, grouping, validation,
recovery, commit, final gates, telemetry, technical-failure handling) with scripted replies; it does **not** prove what
the real model will write.

## 8. The Mandarin proxy failure (separate)

- What happened: `CLAUDE HAIKU UNREACHABLE … Failed to fetch` = the browser got NO HTTP answer, 3 times (client retries 2 s / 5 s; 180 s client timeout).
- What it is not: a model-quality or planning problem. The Listening pipeline sends one request at a time, so the server's `--max-instances 2` is an unlikely cause.
- Likely causes, in order: (1) the phone slept / switched app during a long generation (mobile browsers drop open requests); (2) a Cloud Run platform error (request timeout at 300 s, a crashed or cold instance, 429 no instance) — these answers come from Google, not the function, so they carry no CORS header and the browser can only report "Failed to fetch"; (3) mobile network loss.
- What I could not check: the server logs and reachability — this sandbox cannot reach `*.run.app` (proxy 403).
- What to check (owner): Google Cloud console → Cloud Run → `language-teacher-anthropic` → Logs, around 11:32 on 13 Oct: look for 5xx / 429 / "memory limit" / "timeout". Keep the screen on during a Listening generation.
- v692 behaviour: a provider failure is logged as `TECHNICAL_FAILURE (fault 9)` — never as a language verdict; the selected provider is never switched; nothing partial is saved as a lesson (H1–H3). Retry counts were not changed without server evidence.

## 9. Expected effect on requests and cost (an estimate — not measured)

Per Listening Track: 1 plan call + 1 semantic audit + the existing final coherence judge (+ the existing pronunciation
calls), plus 0–3 repair rounds (1 repair + 1 audit each, only for the failing parts). v691 made dozens of calls per
failed attempt (generation, atomic repair, exchange repair, regeneration, replans) and committed nothing. Rough Haiku
estimate: ~US$0.01–0.03 per track including repairs (the Thai plan prompt carries the learner's ~880 words). To be
confirmed by a live run.

## 10. Remaining risks and limitations

- The real model has not planned a v692 conversation yet. Plans may fail validation more often than the scripted ones and need repair rounds; Japanese (≈110 words) and Mandarin (≈60) are the hardest.
- Deterministic rules cover the regression words and general patterns (answer types, referents, contracts); everything else rests on the semantic audit — a model judging a model's plan (a separate call with a stricter brief, but the same model family).
- The phrase segmentation decides what counts as "heard": 回家 counts for 回, นี่คือ does not count for คือ (pre-existing behaviour).
- The legacy SCENE_PREFLIGHT wording (`decision=COMMIT (candidate)`) is unchanged on the rollback path to keep its tests' assertions unchanged; the v692 path logs CANDIDATE_GENERATED → STRUCTURAL_VALIDATION → SEMANTIC_AUDIT → APPROVED → SCENE_ACCEPTED → SCENE_COMMITTED → READY.
- Thai selection folds a retired alias's SRS history into its canonical word (pre-existing, idempotent) — not caused by v692.

## 11. Ready for the test environment?

Ready for a controlled, approval-gated live test: one Listening Track per language on the /test/ page (estimated
≤ US$0.10 for all three). Not deployed. No paid call was made.

## TL;DR

The Listening planner failed because it was template-first: a fixed story arc, words forced into sentence frames, and
"proven" meaning only "authorised words, short enough, target present". v692 plans meaning first — targets grouped by
the everyday situation they belong to, one call to plan intentions, deterministic grammar / answer-type / referent
checks, one batched semantic audit, fault-class recovery that never retries the same failed blueprint — and blocks
before paying for anything it cannot prove. Offline: tests49 58/58 on the default path (all three v691 learners READY
with 3 calls; every original v691 defect rejected); legacy suites unchanged and reported separately; full regression OK.
The Mandarin "Failed to fetch" is a connection problem, not a language one — check the Cloud Run logs. Teaching quality
is unproven until a live run is reviewed.
