# Thai 501–800: runtime integration fixes (dev branch, not deployed)

A mid-way check also caught tests49 S4b and tests39 F20 failing. Both were fixed before the final commit (the grammar-only exception for ไม่ได้, and topic words such as ความหวัง being taught as themselves) and both pass in the final run.

This follow-up fixes the integration problems that the 501–800 curriculum exposed in the regression suite. The approved curriculum data was not reordered or replaced. Japanese and Mandarin are untouched.

## Files and functions changed

All code changes are in `dev/tt.jsx`.

| Item | Change |
|---|---|
| 1. Exact entry beats decomposition | **New:** `thaiIsExactLexicalEntry`, `thaiHasOwnLesson`, `thaiIsGrammarComposition`. **Changed:** `thaiTargetConceptPresent`, `classifyThaiSpan`, `resolveThaiSpan`, `segmentThaiWithDiagnostics`, `composeThaiPhonetic`. |
| 2. การ / ความ as grammar | **New constant:** `THAI_NOMINALISER_GRAMMAR`. **Changed:** `buildThaiTrackVocabContext`, `validateSmartPairs`, `classifyThaiToken`, `thaiQcCheckVocabulary`. |
| 3. Curriculum target beats suppression | **New:** `thaiCurriculumTargetOverridesSuppression`. **Changed:** `thaiVocabEligibility`, `pickBeltPriorityTargets` (the new-word suppression list). **Added:** teaching contracts for จะ / ของ / และ / เธอ in `THAI_FUNCTION_TARGET_GUIDE`. |
| 4. Labels (data, RAW_VOCAB) | บัตรคิว (id 947, slot 709): `RECOGNITION` → `ACTIVE`. |
| 5. Romanisation metadata (data, RAW_VOCAB) | 66 records: phoneticQc PASS, with the evidence written on each record. 6 records stay `NEEDS_REVIEW` (`PHONETIC:LOANWORD_TONE_UNCERTAIN`). |

**Tests changed:**
- New: `dev/tests62.js` (18 checks), added to `run_all.sh`.
- No existing test was edited.

The function-level diff against the approved data commit (f049313) shows 9 Thai functions changed and 3 added, with 0 Japanese or Mandarin functions changed or removed.

## 1. Exact lexical entry beats decomposition

**Target matching.** A word that is itself a dictionary entry is never split into smaller words just because those parts are known.
- It counts as containing a target only through its meaning. บัตรเครดิต "credit card" contains บัตร "card"; เก็บไว้ contains เก็บ.
- น้ำแข็ง "ice" no longer counts as a use of น้ำ "water" or of แข็ง. This holds at every stage: matcher, generation, detection, quota, final line gate, contract and Listening.
- No exposure credit is given.

**Vocabulary gate.** A word with its own lesson (a curriculum slot or a topic list) is allowed only as itself: introduced, known or a current target.
- It is never assembled from known parts. น้ำแข็ง, ทำอาหาร (557) and ความหวัง (Wedding Speech) wait for their own lesson.
- **Exception 1:** an entry made only of approved grammar words is grammar itself. Example: ไม่ได้ = ไม่ + ได้.
- **Exception 2:** phrase entries with no lesson of their own keep the old compositional rule. Examples: ไม่ต้อง and กลับบ้าน.

Why not block every dictionary compound outright, as the brief literally says? Those phrase entries can never be taught on their own, so a blanket block would make them unusable forever. ไม่ต้อง alone appears 7 times in the 637 recorded Thai lines.

**Segmenter and line romanisation.** When two complete splits tie, the one that keeps the longer exact entry whole wins.
- ผม|อ่าน|หนังสือพิมพ์|ทุกวัน is split correctly again, and it romanises as àan nǎng-sǔue-phim, exactly as before พิมพ์ entered the curriculum.
- อ่านหนังสือ and พิมพ์ still segment on their own when used alone.

**Impact on your profile.** On the 637 recorded Thai lines, 6 more lines are blocked than at f049313. They use three words you have not been taught yet:
- ทำอาหาร (557);
- หลังจาก (635);
- ขอให้ (Wedding Speech topic word).

## 2. Grammar authorisation is not introduction

**การ and ความ** are again approved grammar units (nominalisers) in every vocabulary check. That was their status before 501–800 made them curriculum words.
- The recorded Daily line ผมหมายถึง การไปเที่ยวครับ passes, with การ classified as GRAMMAR.
- **Grammar ≠ introduced.** การ stays new: not introduced, not due for revision, not seen or proven for its belt. As a target it is still a NEW target to teach.

**No blanket authorisation.** ปัญหา, คำ, สวน, ผล, เสิร์ฟ, รสชาติ, อย่าง, ทั้ง and เท่า stay blocked until taught.
- อย่าง, ทั้ง and เท่า have no grammatical use on the strict grammar list. Their grammatical phrases (อย่างนี้, ทั้งหมด, เท่าไหร่, เท่ากับ) are dictionary entries of their own.

## 3. Explicit curriculum target beats suppression

The rule: a word with its own curriculum slot and a teaching contract is selectable as a NEW or REVIEW target. The not-generatable list and the new-word suppression list do not block it.
- จะ (501), ของ (504), และ (506) and เธอ (518) now have teaching contracts. ว่า (503) already had one, but the new-word list also kept it out.
- Without this, the 8th Kyu rank test could never unlock, because it needs every word in the belt to have appeared in a track.
- The per-track cap of 2 function-word targets still applies.
- These words are never offered as incidental substitutes.
- Words without a contract stay suppressed: ผม, คุณ, ไป, มา, เป็น and the rest.

**Pre-existing gap in 1–500, not changed.** 15 suppressed words in 1–500 have curriculum slots but no contract: ผม, ฉัน, คุณ, เขา, เรา, ไม่, กับ, ไป, มา, มี, เป็น, ได้, ทำ, รู้ and ที่. A brand-new learner could therefore never "see" them through a track. Adding a contract for each would apply the same rule. I left this alone because it would change 1–500 behaviour; it needs your decision.

## 4. The five flagged records

| Slot | Word (id) | Metadata | Did it block normal targeting or proving? | Action |
|---|---|---|---|---|
| 506 | และ (26) | RECOGNITION, note "More formal; กับ is more natural", spoken alternative กับ | **No.** The app reads it as formal-but-spoken and usable in natural/polite lessons. The only block was the not-generatable list (item 3). | Label kept; fixed via item 3. |
| 573 | รถยนต์ (102) | RECOGNITION, note "a car specifically", spoken alternative รถ | No (register-dependent, usable). | Kept. |
| 618 | เพียง (1157) | RECOGNITION, note "merely, formal", spoken alternative แค่ | No (register-dependent, usable). | Kept. |
| 709 | บัตรคิว (947) | RECOGNITION with no reason | **Yes.** It was "recognition-only", unsuitable for spoken practice, and never selectable as NEW. | Now **ACTIVE**. LANGUAGE_CONTEXT bucket, id and history kept. |
| 792 | ปวดหัว (1338) | EXCLUDE | No. It is read as context-dependent, and its suitability is "needs review", which still counts as usable. | Kept. |

All 300 slots in 501–800 are now eligible, suitable for spoken practice, selectable as NEW, learnable, reviewable and provable (tests62 I1).

## 5. Romanisation review

The app's tone checker splits Thai into syllables with its own splitter, not the dictionary segmenter. So the fix in item 1 does not change what the checker can confirm. I reviewed the 72 unconfirmed new romanisations separately:

| Result | Count | How |
|---|---|---|
| Confirmed by parts | 12 | The word's dictionary parts, with their already-confirmed romanisations, spell out the stored value exactly. Examples: ร้านขายยา, หัวหน้า. |
| Confirmed by syllables | 46 | Split into proper syllables using the standard reading; the app's own tone calculator then agrees on every syllable. |
| Checker error | 8 | The tone calculator is wrong on a spelling pattern: ัว (พวก), อ used as a vowel (ทอด), ็ before a final consonant (เซ็น, แข็ง, แข็งแรง, จำเป็น, เอ็มอาร์ที), and short syllables with no final consonant (อุบัติเหตุ). |
| **Remaining questionable** | **6** | All loanwords, where the spoken tone is a matter of convention (below). |

The 6 remaining loanwords:
- ซูเปอร์มาร์เก็ต suu-bpôoe-maa-gèt
- โซฟา soo-faa
- คอมพิวเตอร์ khaawm-phiu-dtôoe
- ชาร์จ châat
- ดาวน์โหลด daao-lòot
- บีทีเอส bii-thii-ét

No stored pronunciation was changed.
- The 66 confirmed records are marked phoneticQc PASS, with the evidence written on each record.
- The 6 loanwords stay NEEDS_REVIEW.
- Separately, 42 reused records in 501–800 carry older non-PASS phonetic flags that were not written in this work.

## Regression

- **Before:** the approved data commit, f049313.
- **After:** the final code (commits 5c7c79c + 2477bca).

| Test | Before | After | Classification |
|---|---|---|---|
| tests33 2G | FAIL | FAIL | PRE-EXISTING (failed before the curriculum work) |
| tests35 2C-th, 2C-zh | FAIL | FAIL | PRE-EXISTING |
| tests37 C1 | FAIL | FAIL | PRE-EXISTING |
| tests39 A5 | FAIL | FAIL | PRE-EXISTING |
| tests55 cases 3, 6 | FAIL | FAIL | PRE-EXISTING |
| tests40 T2 (น้ำ in น้ำแข็ง) | FAIL | **PASS** | fixed |
| tests42 P3 (หนังสือพิมพ์) | FAIL | **PASS** | fixed |
| tests39 C1 (Gen2 recordings) | FAIL | FAIL | INTENTIONAL: see note 1 |
| tests45 P2 (recorded Thai Daily replay) | FAIL | FAIL | INTENTIONAL: see note 2 |
| tests42 T5 (retry missing recalls) | PASS | FAIL | INTENTIONAL: see note 3 |
| tests61 / tests62 | — / new | 13/13 / 18/18 | new |

**Notes on the intentional failures:**
1. **tests39 C1.** All 7 Thai Gen2 recordings were made before 501–800 existed. They have diverged since the data commit itself; Japanese and Mandarin still replay identically.
2. **tests45 P2.** The replay now diverges because the checker correctly names มืด (slot 738, a dictionary word since 501–800) as untaught in ไฟในห้องมืดครับ. Before 501–800 it was not a dictionary word and passed unnoticed. Segmentation of the line is identical on every build.
3. **tests42 T5.** The fixture's made-up beginner has not been taught ที่ไหน (slot 9) or ไม่มี (slot 38). Under the new rule they are no longer assembled from ที่+ไหน / ไม่+มี. The retry still runs, but the simulated model answers the identical repeated repair requests from its cache, so no new request is counted. The retry mechanism itself is unchanged.

**REAL regressions: none found.** No existing test was edited to make it pass.

**Final full run (`run_all.sh` on 2477bca):** 11 failing checks. 8 are pre-existing, 3 are intentional, and there are no real regressions.
- **Pre-existing (8):** tests33 2G, tests35 2C-th and 2C-zh, tests37 C1, tests39 A5, tests55 cases 3 and 6.
- **Intentional (3):** tests39 C1, tests42 T5, tests45 P2.
- **Every other suite passes,** including tests49 113/113, tests58, tests60, tests61 13/13 and tests62 18/18.

## Proof of the requested points

| Point | Evidence | Result |
|---|---|---|
| A. Curriculum 1–800 unchanged | Digest of every assignment (Thai, id, index, belt, belt order, bucket) equals f049313 (tests62 A). 1–500 is byte-identical (tests61 B). | PASS |
| B. Learner history unchanged | Your backup (1,694 words) loaded through the real app: every learner field is identical on f049313 and the final build, and identical to the backup itself. | PASS |
| C. น้ำแข็ง is its own lexical item | tests62 C1, C2 | PASS |
| D. น้ำแข็ง gives no exposure to น้ำ or แข็ง | tests62 D1 | PASS |
| E. หนังสือพิมพ์ segmentation and romanisation | tests62 E1, E2; tests42 P3 | PASS |
| F. การ is grammar without being introduced | tests62 F1, F2 | PASS |
| G. Unseen content stays blocked | tests62 G1, G2 | PASS |
| H. จะ / ของ / และ / เธอ can be explicit targets | tests62 H-จะ … H-เธอ, H-safe | PASS |
| I. Every slot 501–800 can progress | tests62 I1, I2 | PASS |
| J. No Japanese or Mandarin change | No Japanese or Mandarin function changed; their suites are unchanged. | PASS |
| K. No unrelated refactor | Only the listed functions changed. | PASS |

## Not done

- Nothing is deployed.
- The 6 loanword romanisations need a native speaker to decide.
- The 1–500 suppressed-word gap (item 3) needs your decision.

## TL;DR

- **Fixed:**
  - น้ำแข็ง is now its own word, never counted as น้ำ or แข็ง.
  - หนังสือพิมพ์ romanises as before.
  - การ / ความ are grammar again without being "taught"; other unseen words stay closed.
  - จะ / ของ / และ / เธอ / ว่า can now be taught, so the 8th Kyu rank test can be completed.
  - บัตรคิว is active.
  - 66 of the 72 new romanisations are confirmed; 6 loanwords are left for review.
- **Safe:** 1–800 data unchanged, your learning history identical, no Japanese or Mandarin change, no existing test edited.
- **Tests:** two failures fixed (tests40 T2, tests42 P3). The three still failing are explained deliberate consequences, and no real regression was found.
- **Your decisions:**
  - the 6 loanword tones;
  - whether the 15 suppressed 1–500 words (ผม, คุณ …) should get teaching contracts.
- **Not deployed.**
