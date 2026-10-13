# v691 — three-language Daily quality + Listening planner fix (dev branch, not deployed)

Inputs: the 13-Oct v690 exports and logs made with Claude Haiku 5.5 (`dev/sandbox/oct13-v690/`), the owner's assessments
(Thai 6.0/10 · Japanese 6.0 · Mandarin 4.5) and the two briefs in the Drive folder. No paid calls, no deployment, no learner data touched.
Every v691 behaviour change sits behind the same switch as v690's (`oct13On()`, ON in the app); with it off the build replays the
v682 recordings byte-identically (proof that nothing else changed).

---

## Part A — Daily Tracks (v691 brief)

### 1. Root causes confirmed from code

| # | Symptom (v690 export / log) | Root cause | Where |
|---|---|---|---|
| A1 | ja: app said 90/90, export had **91** target lines (はい ×4) and 95 playable; NOT_READY for length | (1) a QC **repair** rewrote はい、ごめん、あそこの店で食べよう。 into the 11-unit はい、今行く。あそこの店で一緒に食べよう。 — the Japanese repair validator never checked the belt length (Mandarin's did); (2) the next recovery round counted that line invalid but **only appended** a new recall ("recall 4") — invalid lines were removed once, before round 1, never again | `japaneseQcEngine.validatePair`, `enforceTrackPairQuota`, `_missingRecallSlots` |
| A2 | final audit missed the extra line | the quota counts VALID pairs (90/90); nothing counted the target lines actually persisted | `finaliseMainTrack` |
| A3 | zh: judge flagged "the same speaker A asks and answers" ~15 times; coherence 1/5 | the legacy Mandarin generator writes each sentence **alone** (no previous line), gives almost no line a speaker (25 A · 4 B · rest blank → the judge reads blank as A), then **interleaves** all targets (recall 1 of every word, then recall 2 …). Local coherence was structurally impossible | `generateMandarinTrack`, `generateMandarinOneRecall`, `buildMandarinPrompt` |
| A4 | zh: 230 requests (35 QC repairs, 38 recovery) | most repairs were triggered by A3's false self-answer verdicts; **17 repair calls** then failed LEVEL_COMPLEXITY because the repair prompt never stated the length limit | `aiQcRegenerateGroup` prompt |
| A5 | ja: "correct Ken" on Ken's own line | the v690 cue fix only rewrote names after a fixed verb list | `fixCueAddressees` |
| A6 | ja: 今日の昼、どこで食べよう。 translated "Let's eat somewhere…" | the question test only knew ？ / sentence-final か; a question word + 。 counted as a statement | `jaCueFormProblems` |
| A7 | ja romaji "mata ae ta ne", "shite ku reru", "o hiru" | the dictionary reader splits words it does not know whole (potential 会え+た, unknown く+れる, honorific お+昼); v690's word-level romaji inherited the split | `v684JaDerive` / `_jaAssemble` |
| A8 | zh pinyin "zhè ge / dōng xi / kě yǐ", a segment "，我拿吧。" | the model's pinyin line was kept whenever its letters matched the words; malformed segments were kept whenever their characters joined back to the sentence | `_zhFinaliseMetadata`, `runMandarinQualityCheckCore` |
| A9 | th ขนาดนั้น "khà-nàt-nán" vs ขนาด "khà-nàat" | dictionary data inconsistency (compound entry) | bank data (display corrected) |
| A10 | th/ja/zh awkward lines the judge passed (วันนี้ฉันดีค่ะ, ถอดจาน, ขนาดนี่, どれで食べる？, おいしそう for a shop, 一起吃什么吧？, 东西 → "drink", added reasons) | no guidance for these patterns in the writer or the judge | prompts |

### 2. Changes by file and function (all `dev/tt.jsx`)

| Stage | Change | Function(s) |
|---|---|---|
| 1 Integrity | invalid target lines removed at the **start of every recovery round** and after the last; the replacement takes the **same slot**; never a 4th recall | `enforceTrackPairQuota` (`dropInvalidNow`) |
| 1 Integrity | READY gate **TARGET_LINES_EXACT**: exactly 3 persisted target lines per selected target, 90 in all, none for other words | `targetLinesExact`, `finaliseMainTrack` |
| 1 Integrity | Japanese QC repairs held to the belt length contract | `japaneseQcEngine.validatePair` |
| 2 Cue/speaker | any mention of the speaker's own name in a cue becomes the listener's (introductions kept) | `fixCueAddressees` |
| 2 Cue/speaker | question-word questions written with 。 are questions (どこで食べよう。); indefinites / embedded questions excluded | `jaWhQuestion`, `jaCueFormProblems` |
| 2 Cue/speaker | Mandarin speakers fixed before the cue: line 1 A, line 2 B, line 3 A | `generateMandarinTrack`, `_zhRecoverTargetPairs` |
| 3 Naturalness | writer + judge guidance with the v690 examples: Thai (สบายดี, ถึง, นี้/นี่, ถอด, goodbyes), **new Japanese guide**, Mandarin (你想吃什么, no self-answer in one line, 东西, no added reasons, 好喝吗) | `THAI_NATURALNESS_GUIDE`, `JA_NATURALNESS_GUIDE`, `ZH_NATURALNESS_GUIDE`, `aiQcEvaluateGroup` |
| 3 Pronunciation | Japanese word pieces rejoined before romaji (aeta · kureru · ohiru · mattete) | `jaJoinWordPieces`, `v684JaDerive(…, {wordJoin})`, `jaFinalRomaji` |
| 3 Pronunciation | Mandarin final segments from the learner lexicon (我们 joined), pinyin line rebuilt from those words, spoken line recomputed | `_zhFinaliseMetadata` |
| 3 Pronunciation | Thai ขนาดนั้น → khà-nàat-nán (display); 104 other compound/component differences **listed for review, not changed** (many are real, e.g. น้ำ shortened in compounds): `sandbox/reports/2026-10-13-thai-compound-phonetics.txt` | `THAI_PHONETIC_DISPLAY_FIXES` |
| 4 Mandarin | **mini exchanges**: each target = one 3-line exchange (A opens · B replies · A follows up); each request sees the accepted lines; exchanges kept together; coherence judged exchange by exchange | `zhExchangeRoleLine`, `buildMandarinPrompt`, `generateMandarinTrack`, `mainCoherenceSections` |
| 5 Recovery | every QC repair prompt states the learner's length rule | `aiQcRegenerateGroup`, `runAiQualityCheck` |

### 3. Before → after (from the v690 exports, run through v691 code)

| | Before (v690) | After (v691) |
|---|---|---|
| ja integrity | 91 target lines, はい=4, NOT_READY (length) | the overlength line is removed and its slot refilled; TARGET_LINES_EXACT blocks any 89/91 |
| ja cue | Ken: "…correct Ken that it's tomorrow" | "…correct Yuka that it's tomorrow" |
| ja meaning | どこで食べよう。 = "Let's eat somewhere at lunch today." | CUE_FORM mismatch → regenerated as a question |
| ja romaji | mata ae ta ne · shite ku reru · ima, o hiru da ne | mata aeta ne · shite kureru · ima, ohiru da ne |
| zh structure | 我可以喝吗？ (no speaker) · 可以，东西到了 (B) · 这个东西很好 (no speaker) … one target after another | 可以: A 我可以喝吗？ → B (reply to that line) → A (follow-up); next target's exchange follows |
| zh pinyin | zhè ge dōng xi kě yǐ yòng · "，我拿吧。" as one segment | zhège dōngxi kěyǐ yòng · 东西/不/多/，/我/拿/吧/。 |
| th phonetics | ขนาดนั้น khà-nàt-nán | khà-nàat-nán |

Sentence-level naturalness can only be judged on new exports.

### 4. Offline regression results

- `tests48.js` (new, 24 checks — Daily integrity, cues, pronunciation, Mandarin exchanges, Listening semantics, full simulated workflow in
  all three languages): **24/24**.
- `tests47.js` (13-Oct v690 fixes, 47 checks): 47/47.
- Full shared suite on v691: **OFFLINE REGRESSION OK** (only the two known pre-existing items: tests33 2G; tests35 2C BLOCKED — files not in the package).
- Gemini replay proof with the switch off: 527/527 recorded requests, content identical. Browser release smoke test (live v690 vs v691, owner's
  Thai backup): 19/19.
- Tests updated for intended changes: tests34 4D (Mandarin recall prompt is now an exchange role), tests44 X1 (romaji call now passes
  `{ wordJoin: true }`).

### 5. Remaining defects and risks

1. **Teaching quality 8+/10 is not claimed** — it must be judged on new finished exports.
2. Mandarin still uses its legacy per-sentence generator (now in mini exchanges). The full migration is designed below, not built.
3. Japanese unit counting depends on the segmentation source (the v690 repair line counts 11 on the model's segments, 7 on the dictionary's).
4. Thai compound phonetics: 104 differences listed for a decision; only ขนาดนั้น changed.
5. Guidance-only items (Thai collocations, Japanese はい/いいえ, Mandarin referents) depend on the model following it and the judge catching misses.

### 6. Changed generation / QC rules

- **Stricter:** TARGET_LINES_EXACT (READY gate); Japanese repairs length-checked; question-word questions must be questions in English; Thai /
  Japanese / Mandarin judge guidance.
- **Structure:** Mandarin recalls are a 3-line exchange per target with fixed speakers; coherence for Mandarin is local (per exchange).
- Nothing loosened: 90/90, closed vocabulary, hardMax, unverified-never-READY unchanged.

### 7. Expected impact on cost and requests (estimate, not measured)

- Mandarin: far fewer false "self-answer" verdicts → fewer repairs (v690: 35 repair + 38 recovery requests); repairs no longer fail on length
  (17 wasted in v690). Expect roughly **150–180 requests** instead of 230 (still one generation request per line).
- Japanese: no extra recall cycle from an appended 4th recall; similar request count.
- Prompts grow by ~150–300 tokens per request: ≈ +US$0.001–0.003 per track at Haiku prices.

### 8. Ready for a controlled live retest?

Yes for all three on the dev build (same budget guard as before). The live run needs either approval to publish v691 or the environment
to allow the Haiku server address from this sandbox.

### Mandarin generator migration — design (for approval before building)

- **Today:** `generateMandarinTrack` → one `generateMandarinOneRecall` request per line (90 + retries), no scene plan; v691 adds mini exchanges.
- **Proposed:** a `mandarinTargetGroupAdapter` for the shared `generateTargetGroup` core already used by Japanese: ONE request writes the
  3-line exchange of a target; each line is validated by the existing Mandarin validators; only a failed line is regenerated (with the
  other two as context); the shared per-recall ledger and checkpoints carry over. Optional second step: micro-scene clusters (asking
  permission · eating and drinking · buying · going · waiting · finding · helping · sizes) using the existing scene-plan code.
- **Expected:** generation ~35–45 requests instead of ~117 (incl. retries); total ~110–130 per track.
- **Risks:** grouped JSON parsing and per-line validation for Mandarin; checkpoint format change (resume of an old draft); cue derivation
  per line; replay guards need the switch-off path. Mandarin grammar rules stay Mandarin-specific (nothing copied from Japanese).
- **Plan:** build behind its own switch → offline replay + simulated runs → one controlled live track (≤ US$0.15) → compare with v691.

---

## Part B — Listening planner (Thai 0/30)

### Root cause and why the gate passed

The planner assigns targets to question/answer frames and "proves" each frame with the learner's words. The proof checked **closed
vocabulary + hardMax + target presence only**; the scene check asked whether each *scene* is a plausible situation. Nothing checked whether an
**exchange** makes sense, so these were "VERBALIZABILITY PROVEN" and "MEANING_PLAN VALID":

| Plan line | Defect |
|---|---|
| ทางเข้าเป็นอย่างไร → แก่มาก | แก่ = old (people, living things) cannot describe an entrance |
| ค่าโดยสารนานเท่าไหร่ | "how long" asked about a fare (money has no duration) |
| ผัดไทยเป็นอย่างไร → ตลกมาก | "funny" is not a taste |
| อันนั้นคือเลี้ยว | a verb ("turn") as the THING answering "what is that?" |
| พวกคุณชอบขนาด | "size" with nothing to measure |

Contributing: the role classifier read ตลก "funny", น่าดู "worth seeing" and เลี้ยว "turn" as plain nouns. Once generation began, the repair
ladder kept rewriting sentences from the same broken plan (6 scene calls, 8 atomic repairs, 3 replans, 0/30).

### Fix (shared runtime — Thai, Japanese, Mandarin)

- `lnExchangeSemanticProblems` — semantic compatibility of every planned exchange from the English glosses (unknown classes are never
  blocked): a describing word must fit the subject of "how is X?" (people-adjectives ≠ places/food; taste ≠ non-food); "how long" never
  about money/people/food; a verb is never the THING answering "what?"; a measure word (size, colour, number) needs a concrete referent in
  its exchange. Wired into `validateListeningMeaningPlan` as SEMANTIC_MISMATCH, so a misfit target is **re-planned or deferred before the
  freeze** — through the existing pre-freeze loop that keeps SRS obligations and takes the next candidate in SRS order.
- `listeningTargetRole`: common bare verbs (turn, walk, stop, …) are ACTIONs; describing words (funny, worth seeing, …) DESCRIPTIONs.
- If no valid 30-target plan exists in the eligible pool → the existing pre-generation stop (0 paid calls, explicit diagnostic).
- Logs: a preflight that passes structure but fails the semantic gate now says "→ NOT COMMITTED"; only ✅ SCENE_COMMIT commits.

### Before → after plan

- Before: the five exchanges above, all "VALID".
- After (same learner, real candidate pool of 791 words): ขนาด deferred (reported, SRS obligation kept), replaced from the pool; plan feasible;
  **0 semantic mismatches** in the final plan. Japanese and Mandarin plans unchanged and feasible.

### Offline results (tests48 L1–L7)

L1 roles · L2 the five Thai mismatches caught · L3 a sensible exchange passes · L4 wired into the plan validator · L5 analogous Japanese
(おいしい for a station) and Mandarin ("how long" about 钱) cases · L6 real-pool selection for Thai ×2, Japanese, Mandarin: feasible, 30
unique targets, 0 mismatches, ขนาด deferred · L7 full simulated workflow READY in all three languages; a fixture with only 30 frozen
candidates including ขนาด stops before generation with **0 paid calls** (v690 spent 6 scene-generation and 8 repair calls and ended 0/30).

### Cost impact and risks

- Fewer wasted calls: semantic contradictions are found before generation. No new paid call was added.
- Risk: gloss-based classes are coarse — a word with an unusual gloss may be misclassified (unknown classes pass). The rules cover the
  observed failure kinds; new kinds need new rules. Not claimed solved until a live Listening run confirms it.

## TL;DR
v691 fixes the root causes behind the 13-Oct v690 scores. Japanese: a repair could exceed the length limit, and recovery appended a 4th
recall instead of replacing the bad one (91 lines) — both fixed, with a new exact-90 audit. Mandarin: its lines had no speakers, no previous
line and were interleaved, so coherence was impossible — now each word is a short A→B→A exchange judged on its own. Romaji, pinyin and one
Thai phonetic are fixed on the final text, and all three languages get the v690 examples as writer and judge guidance. The Listening planner
now rejects nonsense exchanges (แก่ for an entrance, "how long" for a fare, "funny" pad thai) before spending anything, swapping the misfit
word from the SRS pool. 24 new offline checks pass; 8+/10 still has to be proven on new live exports.
