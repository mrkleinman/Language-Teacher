# v684 — Teaching-quality overhaul: offline implementation and verification

**Date:** 2026-10-12. Development branch only.

**Constraints kept:**
- No paid API calls.
- No merge, no deploy, no learner data touched.

The design and the defect assessment are in `2026-10-12-v684-pre-implementation.md`, sent earlier.

**Labels used in this report:**
- *Mechanical* means deterministic checks against independent references.
- *AI review* means independent Claude reviewers. **That is AI judgement, not native-speaker certification.**
- The reference fixtures were **designed by me (Claude)**. They are not Gemini output.

## TL;DR

- **Built (behind its own pipeline; production v683 is untouched):**
  - **One teaching plan:** sense, then function, then an intent card (who says what to whom and why), then an exchange.
  - **One final gate:** runs on the frozen lesson, checks 12 criteria, reports 7 separate scores, and treats one failed exercise as NOT READY.
  - **Pronunciation by rule** for all three languages.
  - **Targeted repair:** a different function, only the failing line regenerated, no identical prompts, an honest stop.
- **Proven offline:**
  - **Exact pronunciation catches.** On your three exported lessons, the new checks flag exactly the audited errors and nothing else: Mandarin 10/10, Japanese 2/2 (pairs 48 and 91), Thai 12 lines (แล้ว ×5, ร้อน, โกรธ ×3, ผู้ชาย ×3).
  - **Thai tone rules** agree with all 587 one-syllable dictionary words, apart from the 20 real dictionary errors I found.
  - **Each criterion fails on its own defect** (14 deliberate defects).
  - **The pipeline completes** with a scripted stand-in model: 7 requests for 15 recalls, against about 100–250 per 90 in v683.
  - **Tests:** the new suite passes 31/31. The v682 generator still replays 527/527 requests byte for byte. The full offline suite is OK, with only the two documented known exceptions.
- **Not proven, and it cannot be offline:**
  - that Gemini writes better sentences from the new plan;
  - that the new AI judge catches what it should.
- **Next step:** both need a small live test. **Proposed budget: US$0.50 cap** (expected about US$0.45). I will wait for your approval.
- **Deployment: not recommended yet.** Nothing has been shown live. Separately, the about 20 Thai dictionary tone corrections could be released on their own, once you approve them.

---

## 1. Production / release status (separate from the experimental work)

- **Live: v683** (main 91b680d), unchanged.
- No commit in this phase touches main, `index.html`, learner data, SRS, belts, quotas, dictionaries, saved tracks, bookmarks, Revision, Listening, playback or preferences.
- **Proof that the production generator is unchanged on the development build:** `sandbox/rc_replay_check.js` replays the recorded v682 live runs. Japanese 99, Thai 178 and Mandarin 250 requests: **527/527 byte-identical**, with an identical learner-facing track.

## 2. Exact files changed

| File | Change |
|---|---|
| `dev/tt.jsx` | A new self-contained block `TT_V684_BEGIN … TT_V684_END` (about 800 lines: plan, gate, pronunciation, repair, pipeline, track adapter). Plus 2 lines in `ttBenchRunFixture`: a `'v684'` pipeline branch and the result label. **No existing function changed.** |
| `dev/benchmark/run.js` | Returns the v684 result alongside the gen2 result (1 line) |
| `dev/tests44.js` | **New** v684 regression suite (31 checks) |
| `dev/run_all.sh` | Adds tests44 to the offline suite |
| `dev/benchmark/fixtures/{ja,zh,th}-daily-2026-10-12.json` | **New** fixtures matching your three exported lessons: the same 30 targets, new-word flags and belt; the Japanese and Mandarin vocabulary exact from the export; Thai word state from the 9-Oct device snapshot (labelled) |
| `dev/sandbox/v684/reference-fixtures.json` | 5 targets × 3 planned recalls per language (designed by me, not Gemini) |
| `dev/sandbox/v684/{lib,scripted_engine,corpus_eval,judge_calibration,build_fixtures_1012,build_reference_th_zh}.js` | Offline harness, regression corpus, the live calibration script (prepared, not run), fixture builders |
| `dev/sandbox/v684/corpus-results.json`, `reference-review.json` | Regression corpus results; independent review of the reference fixtures |
| `dev/sandbox/v684/audit/*` | The phase-1 audit (committed earlier) |

## 3. What the new code does

**The teaching plan:**
- **Sense record:** what is studied, plus the other senses that must not be taught (หลัง: not the classifier).
- **Register:** いいえ / すみません are polite-only; うん is casual-only.
- **Three distinct functions** from the word's function class.
- **One planning request per 10 targets:** the model writes purposes and situations, not sentences. Every plan is then validated deterministically:
  - exchange length and voices alternating;
  - register following the addressee;
  - distinct functions and 3 recalls per word;
  - no situation more than 3 times, concrete purposes, nobody addressing themself.
- **Generation:** the model only *phrases* validated exchanges (5 per request).

**Pronunciation is never the model's word:**

| Language | Rule |
|---|---|
| Mandarin | The spoken line is computed (一/不 first, then 3-3 on the resulting tones; neutral tones block; A-不-A neutral). It is shown whenever any tone changes. |
| Japanese | A reading is accepted only if it can be derived from the sentence. Otherwise the dictionary reading is used, with the corrected 何 rule. |
| Thai | The dictionary rendering, plus the pending corrections, checked against new tone rules and spelled vowel length. |

**The one final gate:**
- **12 criteria** per exercise. The deterministic part covers presence, other-sense patterns, cue form and uniqueness, speaker and register, distinct functions, pronunciation, exchange structure, length and closed vocabulary.
- **One batched AI judge** sees each exchange whole and rules on sense, grammar, naturalness, cue, meaning, intent, distinct use and coherence.
- **Verdicts are bound to the text:** any change voids them.
- **Fail-closed:** a missing verdict means not READY.
- **Seven separate scores.**

**Repair and stopping:**
- **Pronunciation-only failures** are recomputed by rule, with no model call.
- **Other failures:** a different function, only that line, the rest of its exchange fixed, then the exchange is re-judged.
- **At most two plan changes per recall**, then an honest DRAFT.
- **A prompt identical to one already sent is refused.**

**Scaffolding:** one table per language, merged from the old overlapping lists. It is recorded per line and **never written to the SRS as mastered**. Content words stay strictly closed: the gate uses the same production closed-vocabulary checker.

## 4. Regression cases added (tests44: 31 checks, all passing)

| Group | What is proven |
|---|---|
| V1–V3 | On your three exported lessons, the pronunciation checks flag **exactly** the audited errors and nothing else: Mandarin {3, 9, 15, 33, 39, 45, 65, 71, 77, 82}; Japanese {48, 91}; Thai {11, 14, 27, 38, 54, 55, 60, 61, 62, 78, 79, 80} |
| V4–V6 | Mandarin spoken-line rules (有一点 yǒu yì diǎn, 我们 wǒ men, 一下 yí xià, 可以 ké yǐ, 不是 bú shì, 要不要 yào bu yào …); Japanese reading derivation (来ない こない, 話 はなし, 何にも なんにも); romaji transcription |
| T1–T3 | Thai tone rules on all 587 one-syllable bank entries: every adjudicated bank error flagged, no other entry. Hard cases (เป็น, ชอบ, สัตว์, เกาะ, ญาติ …). Corrections reach compound entries. The stored vocabulary is unchanged. |
| P1–P4 | Plans validate for all three languages. Each kind of bad plan is named (8 kinds). The sense record keeps หลัง's classifier sense out. The scaffolding table holds no content word. |
| G1–G4 | All 45 reference recalls pass the 12 criteria. **14 deliberate defects each fail their own criterion and block READY.** Fail-closed on a missing verdict and on text changed after judging. Seven separate scores. |
| E1–E6 | The pipeline runs plan → generate → gate → READY with **7 requests per 15 recalls**. Targeted repair: a different function, only that line, everything else byte-identical. Honest DRAFT when repair cannot succeed, with no prompt sent twice. A wrong model reading is replaced without a model call. Identical prompts are refused. A missing verdict means not READY. |
| X1–X2 | Nothing outside the v684 block calls it except the bench pipeline. The experimental switches stay off. No storage writes. |

## 5. Tests passed and failed

| Test | Result |
|---|---|
| **tests44 (new)** | **31/31 pass** |
| **v682 replay proof** | **527/527 byte-identical; content identical** (3/3 runs) |
| **Full offline suite** (`sandbox/test_all.sh`, 41 suites + render) | **OFFLINE REGRESSION: OK**. Known exceptions only: tests33 2G (since v677), tests35 2C-thTH / 2C-zhZH (blocked: replay files missing). tests43 32/32. tests44 has since been added to `run_all.sh`. |
| **Bench wiring** (`ttBenchRunFixture(..., {pipeline:'v684'})`) | Runs on the 12-Oct Japanese fixture (30 targets). With the scripted engine covering 5 targets it honestly returns a DRAFT naming the 75 missing recalls; no error. |

## 6. Improvements demonstrated (offline)

### 6.1 Regression corpus A: the 270 exported v683 exercises

How many of the audited problems the **deterministic** part of the gate catches:

| Criterion | Thai | Japanese | Mandarin | Notes |
|---|---|---|---|---|
| Pronunciation | **12/16** | **2/3** | **10/10** | Thai misses: พอ "phaw" ×3 (display-converter length, open question 2) and แจ็ก inside a compound. The Japanese miss is a romaji spacing issue (pair 64). |
| Speaker / register | 0/1 | **7/7** | — | All はい/いいえ-to-a-friend lines, plus "Yumi, ask Yumi" |
| Target sense | 3/6 | — | 0/1 | หลัง as a classifier ×3 caught. พอดี (a different word) and 回什么 need the judge. |
| Cue | 0/9 | 0/5 | 4/6 | Duplicate cues caught. Unproducible cues need the judge. |
| Distinct uses | 1/14 | 2/7 | 2/8 | v684 enforces distinctness mainly through **planned function ids** (v683 has none) plus the judge; the frame-similarity rule is only a backstop |
| Coherence | 10/28 | 3/21 | 0/4 | v683 has no exchanges, so only "same speaker twice" is checkable. In v684, coherence is judged inside each exchange. |
| Communicative intent | 90/90 missing | 90/90 missing | 90/90 missing | No v683 exercise has a planned purpose; every v684 exercise must |

**Lines flagged that the audit did not label:**
- Mandarin cues: the *other half* of each duplicate pair.
- Japanese: names in cues (a v684 rule) and "same speaker twice" (also in the reviewer's summary).
- Thai coherence (+18): treating the v683 Thai lesson as one exchange does not fit its structure, so these are not meaningful.

**In plain words:** rules now catch the objective errors (pronunciation, register, speaker, duplicate cues, classifier sense) reliably. **Naturalness, coherence and most cue problems depend on the AI judge**, and only a live calibration can measure that.

### 6.2 Regression corpus B: good sentences that earlier validators rejected

| | Judged good by blind review | Blocked by v684 | …for untaught words, your register rule, or length | Possible false rejections |
|---|---|---|---|---|
| Japanese | 57 | 41 | 38 (8 of them by your register rule, e.g. すみません to a friend) | 3 (each also contains an untaught word) |
| Mandarin | 55 | 38 | 31 | **7** |
| Thai | 42 | 36 | 36 | **0** |

**The 7 Mandarin cases:**
- 6 come from inherited production grammar rules: "太 + adjective needs 了" (人太少 ×3), "回 needs a destination" (我明天回 ×2) and "想吃 needs an object".
- 1 is 好吃 used for the target 吃 "eat", which arguably doesn't teach 吃.
- I did **not** relax these rules; they are open questions (section 8).
- One false rejection of my own verifier was fixed: 話 read as はなし.

### 6.3 Reference fixtures

- **The gate:** all 45 recalls (15 per language) pass every deterministic criterion.
- **The independent AI review** of the same fixtures (an AI reviewer, not a native speaker), 105 lines in all (45 exercises + 60 context lines):

  | | Clean | Minor | Major | Critical |
  |---|---|---|---|---|
  | Japanese | 21 | 8 | 1 | 0 |
  | Mandarin | 20 | 10 | 0 | 0 |
  | Thai | 33 | 12 | 0 | 0 |

  - **The one major item matters:** いいえ、大丈夫です in reply to "thank you" (大丈夫です declines an offer; it doesn't brush off thanks). **It passed every deterministic rule of my gate.** It is precisely the kind of error only the AI judge can catch, which is why the judge must be calibrated live before v684 can be trusted.
  - **Fixed afterwards:** the line now declines a waiter's offer of water, along with three minor lines. Changed lines re-reviewed by the same reviewer: no major or critical issues remain. **After the fixes: Japanese 20 clean / 10 minor, Mandarin 20 / 10, Thai 35 / 10; 0 major, 0 critical.** The remaining minor notes are mostly service-speech politeness (staff should say あちら, お水はいかがですか), not errors.
  - **Remaining minor notes:** staff speak too casually in some lines (あそこ rather than あちら, 你 rather than 您); 可以 recall 2 is close to a context line; Thai compound ร้านกาแฟ shows "rán" (the dictionary's own ร้าน is ráan); inconsistent spelling of unaspirated stops (g/k, b/bp, d/dt) in the app's Thai display convention.
- **Caveat:** I wrote these fixtures and tuned them while building the gate (it caught my own untaught words, an unanswered question and a too-long line). They show the contract **accepts** good material; they are not evidence that Gemini will produce it.

### 6.4 Request count

- **v684 per lesson:** one planning request per 10 targets, one generation request per 5 exchanges, one judge request per 6 exchanges. That comes to about 25–45 requests per full 30-target lesson, repairs included.
- **v683:** Japanese 102, Thai 160, Mandarin 255.

## 7. Remaining known failures and limits

1. **Untested live:** generation quality from the plan, and the judge's catch rate. That is the main risk.
2. **Thai pronunciation coverage:**
   - Tone and vowel rules apply to one-syllable words. Multi-syllable words rely on the dictionary plus corrections.
   - The display converter collapses ɔɔ/əə length and spells ɔ + i as "awi" (open question 2).
3. **Deterministic distinct-use and coherence checks are backstops.** The judge carries the semantic part.
4. **Inherited Mandarin grammar rules** produce a few false rejections (section 6.2).
5. **Lesson length:** a Thai exchange may carry up to 2 bridge lines. Bridge lines never count toward the 90, and the gate reports how many there are.
6. **The v683 Japanese romaji builder has a bug** at word boundaries with っ ("butsuka chatta"). v684 flags it; I did not fix it in production.
7. **Not yet wired into the learner-facing app.** v684 runs only through the bench, by design, until it has proven better.

## 8. Unresolved linguistic questions (your decisions; none block the live test)

1. **Thai dictionary corrections** (about 20 tone entries, plus ร้อน "rón" and ผู้ชาย "chai"):
   - They are applied **only in v684 lessons** until you approve.
   - Approving them would also fix what v683 shows.
   - List: `audit/th-bank-tone-scan.json`.
2. **Thai display spellings:** ɔ + final y (หน่อย "nàwi", or "nàwy" / "nòi"?), and whether to show long ɔɔ / əə (พอ "phaaw" rather than "phaw").
3. **Mandarin dictionary line for 一:** citation "yīdiǎn", with the spoken line "yìdiǎn" (v684's choice, so the two lines stay distinct), or keep v683's "yìdiǎn" in both?
4. **Mandarin rules:**
   - Is 人太少 (no 了) acceptable?
   - Is 我明天回 (no 家/来) acceptable?
   - Is a bare 我想吃 acceptable as a reply?
   - Today all three are rejected.
5. **Neutral-tone directional complements** (回来 huílai vs huílái) and neutral 里 in 哪里 (nǎli): v684 currently shows citation tones.
6. **Thai compound entries** whose syllables disagree with their own parts (ร้านกาแฟ "rán-gaa-fae" vs ร้าน ráan), and the app's mixed g/k, b/bp, d/dt spellings. These are a dictionary-consistency clean-up, offered with item 1.

## 9. Development commit

`fcd776e` (code, tests and fixtures) on `claude/session-continuation-check-a19meq` (pushed). The phase-1 audit and design: c6a5d46.

## 10. Proposed live-testing budget (I will wait for your approval)

**Spend so far:** ledger total about US$3.849. The phase-3 cap was US$3.853. Nothing was spent in this phase.

| Step | Purpose | Model | Est. cost |
|---|---|---|---|
| 1. Judge calibration | The v684 judge on the 270 audited exercises: catch rate on audit-bad, pass rate on audit-clean (AI against AI) | gemini-2.5-flash | ≈ US$0.12 |
| 2. Smoke run | One language, 5 targets, a full plan → gate → repair cycle; stop if anything is structurally wrong | flash-lite + flash judge | ≈ US$0.02 |
| 3. Full runs | v684 Daily, all three languages, on the 12-Oct fixtures (the same targets as your exported v683 lessons), **two runs each** | flash-lite + flash judge | ≈ 6 × US$0.05 = US$0.30 |
| 4. Blinded comparison | v683 (your exported lessons) vs v684, shuffled and unlabelled, scored by independent Claude reviewers; fully clean target ≥ 90% with zero known critical errors | free | US$0 |
| **Cap** | **US$0.50** (expected ≈ US$0.45). Any untested case is reported rather than exceeding the cap. | | |

**What success looks like:** v684 fully clean ≥ 90%, zero known critical errors, every exercise with a planned purpose, and pronunciation 100% rule-verified, all in the blind review. **90/90 completion alone does not count.**

## 11. Deployment recommendation

- **Do not deploy v684 yet.** It has not produced a single live lesson. Your threshold, a blinded improvement on the same fixtures, needs the live test above.
- **Could be released independently later, with your approval:**
  - the Thai dictionary tone corrections (they fix what v683 teaches today);
  - a v683 hotfix with the corrected 何 rule and the Mandarin spoken-tone rules.
  - Both are small, rule-based and testable. I have **not** made either change to production.

## TL;DR (repeat)

- **Built offline:** v684's one teaching plan, one final gate, rule-based pronunciation and targeted repair, without touching production.
- **Proven:**
  - pronunciation checks that flag exactly the audited errors in your lessons;
  - Thai tone rules calibrated on 587 words (finding 20 dictionary errors);
  - every criterion failing on its own defect;
  - honest DRAFT on failure, about 7 requests per 15 recalls, and production replaying 527/527 unchanged.
- **Unproven:** live generation and judge quality. **Proposed: US$0.50 cap; waiting for your approval.**
- **No deployment recommended yet.**
