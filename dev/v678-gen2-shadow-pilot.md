# v678: Controlled generation architecture — Stage 1 findings and a shadow-mode pilot

**Status: the new generator ("Gen2") is built and offline-tested, but it is behind a feature flag that is off, and no learner-facing screen calls it.**

- **Not yet run live.** This workspace has no Gemini key, so no live comparison with the current generator has happened yet. The pilot is one button in the benchmark panel; the steps are in section 6.
- **Your learners still get the current generator, unchanged.** All 18 live v677 runs, with their real Gemini responses, replay on v678 with identical requests and identical learner-facing content.
- **Nothing is switched on, and Steps beyond the pilot are not started.**

---

## 1. Stage 1: the remaining defects, verified on all 18 v677 runs

I took the 18 run files from your Drive folder and replayed them in Node. All 18 replay faithfully on the deployed v677 build (the deployed `index.html` rebuilt byte-for-byte from its source). They are now a reproducible offline baseline in `benchmark/live/v677/`.

| Track type | READY | Detail |
|---|---|---|
| Japanese Daily | 3 / 3 | 90 / 90 in every run |
| Mandarin Daily | 2 / 3 | run 2 stopped at GENERATION_INCOMPLETE |
| Thai Daily | 0 / 3 | 87, 87 and 88 of 90 recalls |
| Listening (all languages) | 0 / 9 | coverage 99 / 270: Japanese 17 + 2 + 0, Thai 19 + 15 + 6, Mandarin 13 + 8 + 19 |

The 18 runs used 2,120 requests and cost US$0.48 in total. Each claim from your list, checked:

**1. READY Japanese and Mandarin tracks still contain questionable teaching examples — confirmed.**
- **How this was checked.** All 450 recalls in the five READY tracks were reviewed blind by an independent evaluator, using the rubric plus per-target distinctness. The evaluator was a separate Claude instance from the same model family as me, so this is **uncalibrated**; no native speaker has reviewed it.
- **Overall rates:**

  | | Japanese (270 recalls) | Mandarin (180 recalls) |
  |---|---|---|
  | Recalls with at least one problem | 54 (20%) | 30 (17%) |
  | Grammar errors | 4 | 1 |
  | Unnatural | 10 | 7 |
  | Marginal | 33 | 20 |
  | Misleading translations | 16 | 5 |
  | Targets without three genuinely distinct uses | 33 / 90 | 15 / 60 |

  "At least one problem" means a grammar error, unnatural or marginal wording, a misleading translation, a fragment, or not useful.
- **Japanese examples:**
  - たぶん、明日また会おうよ ("probably" with a suggestion)
  - じゃあ、ご飯、一緒はどう？ (ungrammatical)
  - ごめん、今日、暇なんだ ("sorry, I'm free today")
  - 今日、友達と映画でもする？ (wrong collocation; the English quietly fixes it)
  - 水、飲む？ translated "Are you drinking water?"
- **Mandarin examples:**
  - 这个什么？ (missing 是)
  - 一点吗？ and 我想要 (fragments)
  - 你到哪里？ translated "Where are you going?"
  - 今天好。, 你慢吗？, 我用钱。
- Files: `results/v677-audit/review/independent-review.json` and `results/v677-audit/*.content.txt`.

**2. Japanese cues copy the English answer — confirmed, and Mandarin is worse.**
- **Exact copies, counted mechanically:** 20–25 of 90 per Japanese run. For example, 今日、何する？ with cue "What are you doing today?" and English "What are you doing today?"
- **Including near-copies** (with or without "Ask:" / "Tell the other person:"), per the independent review:
  - Japanese: 162 of 270 cues (60%).
  - Mandarin: 180 of 180, because every Mandarin cue is "Tell the other person: <the English>".

**3. Listening coverage and coherence are poor — confirmed.**
- Coverage is 99 / 270. Scenes contain non-sequiturs:
  - 你帮人吗？ / 不帮。
  - 我在这里。 appears out of nowhere.
  - 好，我们一起来。 is translated as "let's go together".
  - もう、大丈夫？ is translated as "Already, is it okay?"
- Four of the nine runs failed WHOLE_CONVERSATION_COHERENCE.

**4. Thai Daily struggles to reach 90 / 90 — confirmed, and the main cause is structural.**
- The failures cluster on the particle **คะ** (all three runs) and on classifiers and similar words (ครั้ง, ใบ, ยาว, เบา, เล่า, รีบ, คุ้ม).
- For คะ, the recall slot was always given to speaker A (the man). Every candidate then failed SPEAKER_GENDER_CONFLICT, about eight paid attempts each, for example ผมอยากได้ตู้เย็นนั้นคะครับ. The speaker is fixed by slot alternation instead of by what the word requires.

**5. Rejected candidates keep being repeated — confirmed.**
- Across the 18 runs, 52 extra rejections were of a sentence already rejected in the same run.
- For example, 你什么时候回？ was rejected four times in one run, and じゃあ、何か食べに行こうよ。 three times.

**6. Japanese target-presence auditing wrongly flags valid する conjugations — confirmed, with a correction on where it happens.**
- **Where the false flags come from.** They come from the v677 benchmark's own audit (`ttBenchTargetPresence`). It checks the target without its conjugation class, so 今、何してるの？ and 一緒に何かしない？ are marked "target absent" (1 + 0 + 2 recalls in the three runs). The app's own generation and QC checks use the full word and accept してる, しない and した.
- **The one real gap in the production list.** It is missing a few forms: すれば, させる, される.
- **What I did about it.** I did not patch production; Gen2 has its own inflection-aware check (section 2).

**READY did not establish linguistic quality.** All five READY tracks contain the problems above.

---

## 2. The new architecture and its boundaries

```
candidate selection → teachability → target freezing → composition → independent acceptance → persistence
 (existing SRS and      (per word,       (only taught-     (lesson          (deterministic rules plus   (OFF in the
  belt order:           before it enters  able words       assembled from   a separate judge model that  pilot)
  unchanged)            the lesson)       enter)           accepted parts)  sees only the material)
```

**Candidate selection.**
- Gen2 takes the existing selectors' order unchanged. In the pilot that means the fixture's 30 fixed targets, then the reserve from `selectRevisionTargets` (Thai) or `selectRevisionTrackTargets` (Japanese / Mandarin).
- Selection, SRS, new-word quotas and belts are not touched.

**Teachability, Daily.** One request per word asks for six candidate practice sentences.
- **What each candidate carries:**
  - a communicative function and a situation;
  - an intent cue, such as "Ask your friend whether they are free tonight" — never a translation of the answer;
  - the sentence, a faithful English rendering, and the speaker the sentence requires.
- **Word-class guidance is built into the request.** There is specific guidance for particles (คะ means a woman asking a real question), classifiers (counting or pointing out with a noun the classifier actually fits), set expressions (three different real moments), question words and function words. Difficult words are taught appropriately rather than removed.
- **Deterministic checks run first and are free:**
  - closed vocabulary, using the app's existing per-language checkers;
  - inflection-aware target presence;
  - the length limit for the belt;
  - speaker conventions;
  - the cue must not copy the answer, must not contain target-language script, and must be an intent;
  - duplicates within the lesson;
  - repeats of an already-rejected sentence are dropped before any paid judging.
- **An independent judge comes next.** It is a separate request on a separate, stronger model (gemini-2.5-flash), sees only the material, and runs at temperature 0. Every check must pass: grammar, *natural* (not "marginal"), accurate translation, correct sense of the target, useful and unambiguous cue, right speaker, useful, not a fragment. A missing or unreadable verdict accepts nothing.
- **Three distinct uses are required.** A word is teachable when three accepted candidates have different functions and clearly different sentences, so a sentence with a filler like あれ？ added does not count as new. The word then gets one more targeted request, with the rejected sentences listed as "do not repeat".
- **Otherwise the word is deferred.** The reason is recorded, the word's SRS state is not touched, so it stays due, and the next candidate from the existing order takes the slot. At most 8 replacements are allowed.

**Teachability, Listening.**
- Each target needs one workable two-turn exchange (question and answer, suggestion and reply, statement and reaction), judged as a pair: does turn two really respond? This happens before the word is frozen.

**Freezing.** The lesson is the 30 words with established material. 30 words and 90 recalls are preserved; a shortfall is named, never padded.

**Composition, Daily.**
- Recalls are grouped by five targets, as now.
- **The speaker follows each sentence's requirement:** ค่ะ / คะ go to the woman, ครับ to the man. There is no fixed alternation.
- Nothing is rewritten after acceptance.

**Composition, Listening.**
1. **Plan:** one request plans one connected conversation in 3–5 scenes, chosen for this vocabulary; there is no fixed seven-phase storyline.
2. **Write:** each scene is written as a whole dialogue, questions and answers together, continuing from the previous lines.
3. **Check:** each scene is checked deterministically, then by the judge for each line, whether each question is answered, scene coherence and the transition.
4. **Retry or give up:** a failed scene is rewritten up to 3 times, with rejected lines refused again. If it still fails it is not committed, and its words are spread over the remaining scenes or deferred, never silently lost.
- No PROVEN template realisation is used.

**Independent acceptance of the whole lesson.** All invariants are re-checked on the composed lesson:
- 30 × 3;
- every recall judge-accepted;
- no duplicate sentences or cues across targets;
- every deterministic rule again.

**Persistence is off.** Gen2 returns a track to the benchmark and writes nothing.

**In scope for this pilot:**
- Daily and Listening teachability, freezing, composition and acceptance in Thai, Japanese and Mandarin;
- the shadow entry point;
- the simulator, the tests, and the comparison and blind-review tooling.

**Out of scope until the pilot shows a real improvement:**
- wiring Gen2 into the screens and saving;
- carrying deferred words into the next lesson;
- pronunciation, romanisation and gloss metadata (the existing pipeline would be reused);
- opening and closing lines;
- showing Gen2's checks in the 11-check display (Gen2 records every candidate evaluation, so each displayed check would be a real one);
- the per-language function-word policy (Decision 2).

## 3. The smallest useful pilot

**Gen2 on the six historical fixtures** — Thai, Japanese and Mandarin × Daily and Listening — with the same vocabulary, targets and belt as the v677 runs, using the app's own Gemini connection inside the sealed benchmark page.

- **Start with 6 × 1** (about 15–25 minutes, by my estimate under US$1).
- **Then 6 × 3** if the single runs look sound.

The v677 runs are the comparison side. One pilot answers all four comparison questions at once:

- Does teachability-first fix the Daily defects?
- Does whole-scene Listening reach coverage with coherence?
- What does it cost?
- Does the judge actually reject what the v677 review found?

## 4. Acceptance criteria

These are measured on the live pilot against the 18 v677 runs, with the same functions applied to both sides (`benchmark/compare_gen.js`).

**Mechanical (deterministic)**

| # | Criterion | v677 |
|---|---|---|
| M1 | Daily: at least 8 of 9 runs reach 30 targets × 3 recalls; every deferral named with its reason; at most 3 deferrals per track | 5 / 9 |
| M2 | Daily: 0 cues copying the answer, 0 near-duplicate recalls, 30 / 30 targets with three distinct uses, 0 targets absent, 0 closed-vocabulary or speaker-particle violations | cues copying: Japanese 20–25 per run exact; distinct uses 16–29 / 30 per run |
| M3 | Listening: total coverage at least 240 / 270, at least 5 / 9 READY, 3–5 scenes each | 99 / 270, 0 / 9 |
| M4 | Cost: at most 2.5× the v677 median for the same track type and at most US$0.15 per track; requests at most the v677 median (Thai Daily 239, Japanese 105, Mandarin 226, Listening 52–66) | Daily $0.03–0.07, Listening $0.004–0.013 |

**Linguistic.** These come from an independent evaluator applied blind to both generators' output, and are labelled uncalibrated until native review.

| # | Criterion | v677 READY tracks |
|---|---|---|
| Q1 | Daily recalls with any problem at most 5% | Japanese 20%, Mandarin 17% |
| Q2 | Grammar errors at most 0.5%; misleading translations at most 1% | 1.1% and 4.7% |
| Q3 | Cues useful at least 95%; ambiguous at most 3% | Japanese 40%, Mandarin 0% |
| Q4 | Listening: at least 95% of questions answered appropriately; at least 90% of scenes coherent; unnatural lines at most 3% | — |
| Q5 | Native-speaker review: at least 30 items per language, blind and mixed with v677 output; Gen2 better or equal on every dimension and strictly better on naturalness and cue usefulness | not yet |

**Before any switch for learners.** M1–M4 and Q1–Q4 must hold on the live pilot, and Q5 once native review exists. On top of that, a separate approved change must do the production wiring:

- saving through the existing SRS code;
- carrying deferred words forward;
- pronunciation metadata;
- the 11-check display mapping;
- the full regression suite.

QC is never weakened to meet these numbers. The judge's rules are stricter than v677's (a "marginal" or "weak" verdict rejects).

## 5. Code changes

**`tt.jsx` → v678.** Function diff against v677: 34 functions added, 4 changed, 0 removed. The changed ones are `ttBenchRunFixture`, `ttBenchWorkerRun`, `ttBenchPanelMain`, and `listeningSetStatus`, which only holds the version constant.

| Change | What it does |
|---|---|
| New block `TT_GEN2_BEGIN … TT_GEN2_END` | `GEN2_FLAG` (off), `GEN2_CONFIG`, language and speaker conventions; `gen2WordClass` and class guidance; `gen2JaForms` / `gen2TargetPresent`; `gen2CueProblem`; `gen2DetCheck` and `gen2SpeakerProblem`; `gen2Verdict`; `gen2PickDistinct`; `gen2TeachTarget`, `gen2CandidateOrder` and `gen2Daily` with `gen2AcceptDaily`; the Listening functions (`gen2ListenTeachability`, `gen2ValidatePlan`, `gen2Listening`) plus their request and judge prompts. |
| `ttBenchRunFixture` | Gains a `pipeline === 'gen2'` branch; this is the only call site. |
| Worker | Passes the pipeline through and records it. |
| Panel | New "Shadow pilot — the NEW generator" card (6 × 1, 6 × 3, download). Pilot files are named `-gen2-` and kept apart from baseline runs. An optional tick box, "judge with flash-lite", runs the judge on the generator's own model; it is off by default and exists only to measure how much the stronger judge matters. |
| Versions | v678. |

**Benchmark tooling:**

| File | Change |
|---|---|
| `gen2_sim.js` (new) | Simulator for the Gen2 requests; mechanics only. |
| `run.js` | `--pipeline gen2`, plus stress options. |
| `compare_gen.js` (new) | Old vs new measures; label files; blind review export. |
| `audit_v677.js` (new) | The Stage 1 measures. |
| `rebase_cassettes.js` (new) | See the note below the table. |
| `import_bundle.js` | Takes `--app` and keeps pipelines apart. |
| `browser_bench_test.js` | Adds P9: the Gen2 pilot inside the sandboxed browser worker. |
| `cassettes/gen2/` | 16 Gen2 simulator recordings, including stress runs: an unreadable judge, declined Daily and Listening words, a rejected scene. |

The deployed build changed generation between v674 and v677, so the simulator cassette library was re-recorded on v677, the production baseline. The v674 recordings are kept unchanged in `cassettes/archive-v674/`.

**Tests:**
- `tests39.js` (new, 28 checks).
- tests37, 38, 16, 34, 35 and 36 were updated only for the v677 baseline and the version number. tests38 I4 now compares the legacy fields of the content record, because v677 added target fields to it.
- tests12 M still requires every production route to use flash-lite. It now also requires that the only other model name in the file is the Gen2 judge (`gemini-2.5-flash`), inside the disabled Gen2 block.
- tests7 H (Thai speakers must come from the shared gender map) passes because Gen2 uses `thaiSpeakerMapGender` rather than its own mapping. The test was not changed.

## 6. Results

**Live comparison: NOT RUN.** This session has no Gemini key and its network cannot reach Gemini, so there is no evidence yet that Gen2 teaches better. Every Gen2 number below is from the simulator and proves only that the mechanics work.

**Production is unchanged (proved, not assumed)**

| Check | Result |
|---|---|
| The 18 live v677 runs replayed on v678 | 18 / 18 faithful, learner-facing content identical |
| The 38 simulator cassettes (re-recorded on v677) replayed on v678 | all equivalent |
| Word banks, belt contracts, places that write storage | byte-identical to v677 |
| Callers of Gen2 outside the benchmark | none; `GEN2_FLAG.enabled` is `false` |

**Offline tests**

| Suite | Result |
|---|---|
| tests39 (new, Gen2 pilot) | 28 / 28 |
| Full battery | 38 suites: 37 exit 0, 1,242 checks passed. tests33 fails one check (2G); this failure is **already present in the deployed v677**, which makes 4 coherence-judge calls where the check allows 3. Fixing it would be a production change, so it was left alone. |
| Browser benchmark (headless Chromium, Gemini faked at the network) | 52 / 52, including Run-all 18 and P9: the Gen2 pilot inside the sandboxed worker |
| Fuzz | 132 runs, 0 build errors |
| Renderer, smoke boot, browser checks | all pass; no page errors; the 11 checks display |
| `check_sync` | IN SYNC v678 |

**Gen2 mechanics on the simulator** (template sentences, so this says nothing about quality)

| Fixture | Status | Requests | Deferred | Notes |
|---|---|---|---|---|
| Japanese Daily | READY 30 × 3 | 63 | 1 | |
| Mandarin Daily | READY 30 × 3 | 69 | 3 | |
| Thai Daily | READY 30 × 3 | 123 | 1 (คะ: only one distinct accepted use) | v677: 87–89 / 90, 193–249 requests |
| Japanese Listening | READY, 4 scenes, coverage 30 / 30 | 15 | 0 | |
| Mandarin Listening | READY, 4 scenes, coverage 30 / 30 | 18 | 3 | |
| Thai Listening | READY, 4 scenes, coverage 30 / 30 | 15 | 0 | |
| Stress: judge replies unreadable | NOT_READY at the 170-request cap, nothing accepted | 170 | | |
| Stress: two words declined (Daily and Listening) | READY; both deferred with reason, SRS untouched, next SRS words fill the slots | 62 / 18 | 2 | |
| Stress: a scene rejected three times | READY; the scene is not committed; its words move to the other scenes | 20 | | |

One correction made while checking these numbers: the simulator ignored the prompt's instruction that the woman leaves out ฉัน when ฉัน is not taught. That made the historical Thai Listening simulator run fail (0 / 30). The fault was in the simulator, not in Gen2, which rejected the untaught word as it should. The simulator now follows the instruction, the run was re-recorded (READY, 30 / 30), and the deferral test now uses a separate stress recording with two declined words.

**Estimated live cost of one pilot pass.** This estimate is based on the simulator's request sizes and Gemini list prices; the live run will measure the real figure.

| Track | Estimate | v677 |
|---|---|---|
| Daily | about US$0.06 (Japanese, Mandarin) and US$0.12 (Thai) | US$0.03–0.07 |
| Listening | about US$0.01–0.015 | US$0.004–0.013 |
| All six tracks | about US$0.28 | |

Thai Daily is the one to watch against M4: it is under US$0.15, but near 2.5× the v677 median.

**How to run the live pilot** (the same sealed benchmark mode as before):

1. Install v678.
2. Open Settings → 🧪 Benchmark mode.
3. In "Shadow pilot — the NEW generator", press **Run pilot (6 tracks × 1)** and keep the tab in front.
4. Press **Download pilot results** and put the file, or the per-run `-gen2-` files, in the Drive folder.

Then I will:

1. import the files and replay them;
2. run `compare_gen.js` against the 18 v677 runs;
3. send both generators' output, blind and shuffled, to the independent evaluator, and prepare a native-speaker sheet from the same items;
4. report each criterion as met or not met.

## 7. Preservation

- **Unchanged:** SRS, dictionaries and vocabulary ids, belts and thresholds, new-word quotas, pronunciation, language settings, the 11-check display, the player, QC and learner progress.
- **The evidence:**
  - the word banks and belt contracts are byte-identical to v677, and so is the count of places that write storage;
  - the Gen2 block contains no storage, SRS, vocabulary or save call;
  - nothing outside the benchmark calls Gen2;
  - all 18 live v677 runs replay identically on v678.
- **Nothing was removed from the curriculum.** คะ, หวัง, 那个 and the other difficult words remain. Gen2 teaches them with class-specific guidance or defers them, keeping their SRS obligation.

## 8. Limitations

- **The live pilot is not run,** so there is no evidence yet that Gen2 is better. Every Gen2 number in this report is from the simulator and proves mechanics only.
- **The judge is a Gemini model.** It is stronger than the generator and blind to its reasoning, but it is not a native speaker and is not calibrated. If its standards are wrong, Gen2 inherits that. The native review is what settles it.
- **Cost will be higher per track** because of the stronger judge. M4 bounds this, and the pilot will measure it.
- **The Listening scene plan relies on one model request.** If it is unusable twice, the deterministic fallback is plain consecutive chunks; the pilot will show how often that happens.
- **The Stage 1 review is a model review** from the same model family as me. It agrees with my own reading, but it is not a native verdict.

---

## TL;DR

- **Stage 1 confirmed every defect on the 18 v677 runs.** Only 5 / 18 tracks were READY, and Listening was 0 / 9 with coverage 99 / 270. Japanese and Mandarin cues copy the answer (162 / 270 and 180 / 180), and an uncalibrated independent review found problems in 17–20% of the READY recalls. Thai คะ always fails because its slot goes to the male speaker. There were 52 repeated rejections. The する false flags come from the benchmark audit, not from production.
- **Built Gen2 in shadow mode** (v678), disabled by default and reachable only from Benchmark mode. It runs: teachability first → a stronger independent judge → frozen targets with three distinct uses → safe deferral that keeps SRS → Listening as 3–5 whole scenes judged as a conversation.
- **Production is provably unchanged.** All 18 live v677 runs replay identically. The battery passes, except one check that already fails on v677. The browser test passes 52 / 52.
- **On the simulator, Gen2 reaches READY on all six tracks**, with 30 / 30 Listening coverage, and no more requests than v677 used for the same tracks. This proves the mechanics, not quality.
- **Not done:** the live comparison (no key or network here), and native review. **Next step:** you run "Run pilot (6 × 1)" in Benchmark mode (about US$0.30) and put the file in Drive. I then score it against criteria M1–M4 and Q1–Q5. Nothing switches for learners until those criteria pass.
