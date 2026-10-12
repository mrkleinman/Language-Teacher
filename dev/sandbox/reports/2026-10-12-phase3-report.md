# Phase 3 — v683 release, and progress on the experimental generator

**Date:** 2026-10-12

**Scope:**
- The v683 release is deployed. The experimental generator stays switched off and is not merged.
- No learner data was changed.
- Every "quality" figure below is an AI judgement by independent Claude reviewers, **not native-speaker certification**.

## TL;DR

- **Release:** v683 (quota table plus the Mandarin display) is **live on main (91b680d)**.
  - The release smoke test caught a real defect first. A 10th Kyu learner with some White words still "learning", which includes your own Thai profile, would have dropped to the Mukyu quota.
  - I fixed it on the release branch and re-verified everything before deploying.
  - The v682 generator is proven unchanged: 527 of 527 recorded requests replay byte-for-byte.
  - No stored learner data changes.
- **Experimental generator:** all six structural fixes are built and offline-tested, but the live results are **worse overall than v682**. **Do not enable it.**
  - **Gains:**
    - cues no longer copy the answer (Japanese 46 → 2, Mandarin 90 → 3);
    - repeated "same use" recalls are almost gone;
    - fewer paid requests per recall;
    - the Japanese/Mandarin quality judge now actually rejects bad sentences (it rejected none before);
    - Thai rejections are now logged with their reasons.
  - **Losses:** "fully clean" sentences fell in every language: Japanese 77% → 67%, Thai 78% → **56%**, Mandarin 81% → 77%. Mandarin still stopped at 88/90, and the Japanese run hit its budget cap during the final check.
- **Root cause, what remains structurally wrong:** the plan now says *what kind* of sentence to write, but nothing supplies sensible *content*. The model fills the gap by combining whatever allowed words are at hand ("I'll drink water at the station tomorrow", "my room has no bed"). Removing the scene fixed contamination but left nothing coherent in its place.
- **Spend:** US$0.196 of the US$0.20 cap.

---

## Part A — Release status (separate from the experimental work)

| Item | Status |
|---|---|
| Deployed | **main @ 91b680d**, "Release v683". Only `index.html` changed. |
| Built from | `claude/v683-release-candidate` @ **a4601e3**: ca4453c plus one release-only correction (below) |
| Experimental code in the release | **None**: 0 teaching-plan symbols in the source, compiled app or page (tests43 R1) |
| v682 generator unchanged | **527 / 527** recorded v682 live requests byte-identical (Japanese 99, Thai 178, Mandarin 250); identical tracks |
| Japanese 10th Kyu | **5 new words**: belt card and real selector (5 of 30 targets); tests43 Q3 / Q6; release smoke test |
| Mandarin Next Targets | **"Next targets (30) · 5 new · 25 review"**; Learn New Words unchanged (5); real-browser test |
| Thai Mukyu | **3 new words**, the approved policy; release smoke test with a Thai Mukyu beginner |
| Learner data | Identical to v682 after opening, for every learner. Tested on a Mandarin learner, a Japanese 10th Kyu learner, a Thai beginner, and **your real Thai device backup** (1,644 words, 1 saved track). The only differences are the timestamps of v682's own one-time migrations. |
| Test suite | OFFLINE REGRESSION: OK. Known exceptions only: **tests33 2G**, and **tests35 2C-thTH / 2C-zhZH** (blocked: replay files missing) |
| Browser tests | 7/7 (display and quota), 9/9 (resumable generation), release smoke 19/19 |
| Post-deploy check | main's `index.html` is byte-identical to the verified build (SHA-256 `360c21be…bdc7`) and reports app-version v683 |
| Rollback | `git revert 91b680d` on main restores v682's `index.html`, and Netlify redeploys. No data repair is needed. |

**The release-only correction:**
- **The defect:** the first candidate (ca4453c) took the quota from the strict "every word known" belt. Your Thai backup's rank is **10th Kyu**: White rank test passed, 36 White words still learning. That candidate gave it the **Mukyu** quota (3 instead of 5).
- **The fix:** the quota now follows the rank the belt card shows.
- I stopped the deployment, fixed it on the release branch and re-ran every check before deploying the verified equivalent.
- **What changes for you:** your Thai profile keeps 5 new words. A Thai learner who is genuinely at Mukyu gets 3.

**Please confirm on your device:** I could not open the live site from here, because its address is not recorded in the repository. The app's footer should read "v683".

---

## Part B — Experimental generator: what was built (development branch only)

| Fix | What changed | Offline proof |
|---|---|---|
| 1. Plans by function, sense and register | Each word is planned by what it does in conversation (modal, preference, politeness, question word, degree word …). Each use *requires* the word. Polite words (すみません, いいえ) are taught to staff and strangers, in polite speech (your Decision 1). | tests43 P16: 可以 / 想 / 要 are planned as modals and never "suggest doing it together" |
| 2. Plan authoritative, scenario optional | Japanese prompts lose the lesson theme, the scene, the example shapes and the grammar-label role. Mandarin loses its two competing instructions. Thai keeps its 3-line exchange, with the scene as optional context. Situations are offered only if the learner knows an anchor word for them. | P15, P17, P22 |
| 3. Japanese / Mandarin quality judge rebuilt | Per-sentence verdicts on register, English, target sense and cue, at low temperature, with a group decision rule. **Calibrated** against 523 blind-reviewed examples (section C). | P20; calibration run |
| 4. One cue definition (all three languages) | Generator, checker and reviewer share one definition. Quoting the target language blocks the sentence; copying the English is counted but never costs a good sentence. Mandarin no longer overwrites good cues with "Tell the other person: <English>". | P19 |
| 5. Recovery changes the application | After two failures of the same kind, a recall switches to an unused use (logged as APPLICATION_SWITCH), within the existing attempt budget. A repaired group is judged again before it counts as fixed, and the originals are restored if it fails. | P18; 13 switches in the live Mandarin run |
| 6. Thai rejection log | Every rejected Thai candidate is logged with its stage and its own reason. Thai rejections with no recorded reason fell from about 108 to 26 per run. | P21 |

- tests43 passes **32 / 32**.
- The full offline suite is OK, with the known exceptions only.
- With the switch off, the experimental build still replays all 527 v682 requests exactly.

---

## Part C — Live results (real Gemini 2.5 Flash-Lite, same fixtures as v682)

**Spend:**

| Item | Cost |
|---|---|
| Judge calibration | US$0.0154 |
| Mandarin run | US$0.0398 |
| Japanese, first run | US$0.0543 (stopped by the cap) |
| Thai run | US$0.0372 |
| Japanese, second run after the situation fix | US$0.0496 (stopped by the cap) |
| **Total** | **US$0.1963 of US$0.20** |

Every request and reply is recorded under `dev/sandbox/runs/*v683P3*` and `judge-calibration.*`.

### Judge calibration (fix 3)

The new judge was compared with the blind reviewers (AI against AI):

| | Bad sentences caught | Clean sentences passed | Misleading cues caught |
|---|---|---|---|
| Japanese | 48% (13/27) | 93% (185/198) | 36% (4/11) |
| Mandarin | 50% (16/32) | 94% (145/154) | 33% (2/6) |

- **Against v682:** the old judge passed **every** group (94/94 Japanese, 91/91 Mandarin).
- **Not good enough to rely on alone:** the new judge is a real gate, but it misses about half of the bad sentences. It also sometimes calls a copied cue "misleading".

### Acceptance criteria (blind review: v682 vs the new generator, identical fixtures)

| | Japanese v682 | Japanese new | Thai v682 | Thai new | Mandarin v682 | Mandarin new |
|---|---|---|---|---|---|---|
| **Full-track completion** | 90/90 READY | 89 of 90 in the record; **final check cut off part-way by the cap** | 90/90 READY | **90/90 READY** | 90/90 READY | **88/90, no track** (一起 #2, 想 #1 missing) |
| **Fully clean** (accuracy and naturalness) | 76.7% | 67.4% | 77.8% | **55.6%** | 81.1% | 77.3% |
| Unnatural / marginal | 2 / 13 | 4 / 20 | 7 / 8 | 7 / 23 | 2 / 9 | 6 / 8 |
| **False acceptances** (serious problem accepted) | 3 | 4 | 9 | 8 | 2 | 7 |
| **False rejections** (quality rejections judged good) | 0 of 1 | 3 of 5 | 4 of 8 | 2 of 8 | 2 of 9 | 2 of 7 |
| **Cue accuracy:** ok / copies answer / misleading | 44 / 46 / 0 | **86 / 2 / 1** | 80 / 9 / 1 | 73 / 12 / 5 | 0 / 90 / 0 | **79 / 3 / 5** |
| **Three distinct uses:** same-use repeats | 3 | **0** | 6 | **1** | 1 | **0** |
| **Register problems** | 0 | 2 | 0 | 0 | 0 | 0 |
| Weak teaching value | 5 | 11 | 10 | 22 | 6 | 8 |
| Paid requests (per recall) | 99 (1.10) | 101 (1.13) | 178 (1.98) | **141 (1.57)** | 250 (2.78) | **166 (1.89)** |
| Cost | US$0.033 | US$0.050* | US$0.046 | US$0.037 | US$0.047 | US$0.040 |

\* Stopped by its cap before finishing.

**About the false rejections:**
- 3 of the 5 Japanese "false rejections" are polite sentences to a friend (はい、買います).
- Your register rule rejects these correctly; the reviewer simply rated the sentence alone.
- The two Thai ones were rejected by v682's "line 1 must contain a number" rule. That rule now contradicts the plan's classifier uses.

**Mandarin's 88 recalls:**
- They passed only the rule-based checks. **They have not passed the final AI quality check**, because a track runs that check only when it is complete.
- They are a draft, not a verified track.

**Untested within the cap:**
- second runs for any language (so these are single-run results, and Japanese has varied ±5 points between runs);
- a Japanese run that completes its final check;
- a complete Mandarin track.

---

## Part D — What remains structurally wrong

These are not fixed yet. Code changes are proposed only after you've read this.

1. **No content planning.**
   - The plan says *what kind* of sentence to write (ask, refuse, describe), and each situation is a bare setting. Nothing says *what the sentence is about*.
   - The model combines whatever allowed words are nearby:
     - 明日、駅で水飲むよ ("I'll drink water at the station tomorrow");
     - ห้องผมไม่มีเตียงครับ ("my room has no bed");
     - คุณแนะนำทางเข้าที่นี่ไหมครับ ("do you recommend this entrance?").
   - The scene used to supply coherent content but contaminated every line. Removing it fixed the contamination and left a vacuum.
   - **Proposed direction:** plan a concrete everyday *proposition* per recall from the learner's own words: who does what, where and why. For example, for 飲む: "ask a friend whether they want tea after lunch". The model then only *phrases* that proposition naturally. That is linguistic planning with Gemini doing the wording; it is not hand-written sentences.
2. **The situation pool skews topics.** With few anchored situations, "planning tomorrow" and "at the station" repeat: 明日 is in 20% of the new Japanese lines (v682: 8%) and 駅 in 12%. Content planning (item 1) should replace the pool.
3. **Thai lost its coherent context.** Thai is a 3-line exchange. Demoting the scene, while the uses carried no situation, produced context-free lines and dropped Thai from 79% in phase 2 to 56% now. Thai needs the conversation thread kept, with the plan steering only the word's use.
4. **No gate checks teaching value.** "Pointless" lines ("does this house have a door?") pass every check. The judge checks correctness, not usefulness.
5. **The quality judge catches only about half of the bad sentences**, and adds cost. It needs a second calibration round, plus the "copy vs misleading" cue confusion fixed, before it can be trusted as a gate.
6. **Old rules now contradict the plan:**
   - Thai "line 1 must contain a number";
   - the Japanese/Mandarin cue-form checks.
   Each new use has to be checked against the rules that judge it. I fixed one such contradiction this phase (the "Your friend asks … Say …" cue).
7. **Mandarin at Mukyu remains short:** 88/90. Most failures are untaught vocabulary (33 of 81 rejections) or a missing target.

**Recommendation:**
- Keep the experimental generator off.
- The next phase should tackle **content planning (item 1) first**, with Thai's conversation thread restored (item 3). These address the largest losses.
- Then re-run the same blind comparison with **at least two runs per language**. That needs a fresh budget, which I estimate at about US$0.25 for two full runs of all three languages plus a judge re-calibration. I won't spend it without your approval.
