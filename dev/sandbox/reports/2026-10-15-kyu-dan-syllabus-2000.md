# Kyu–Dan syllabus corrected to 2,000 words (dev branch, not deployed)

Owner brief: "LANGUAGE TEACHER APP — CORRECT KYU–DAN SYLLABUS TO 2,000 WORDS" (2026-10-15).

## 1. TL;DR

- Thai, Japanese and Mandarin now share one rank table:
  - Mukyu 1–100 and 10th Kyu 101–200;
  - then 200 words per rank, ending with 1st Kyu at 1,801–2,000.
- Shodan has no word range. It is reached only when all 2,000 positions exist and are proven under the existing rank-test rules.
- The table is defined once (stage sizes). Everything else is derived from it: rank list, new-word slots, belt page, dictionary filter, selectors and word labels.
- A real bug is fixed. A learner who finished every word the bank currently holds (Thai 500, Japanese 200, Mandarin 100) was shown as **Shodan**. Ranks are now measured against the positions they require, so an unfinished stage can never be skipped or completed early.
- **Owner's Thai profile:** no change in rank, new-word quota or sentence length. The owner still studies 10th Kyu (96/100 proven), and the dashboard now also says "Awarded: Mukyu".
- **Corrupt duplicate flag found and fixed:** the owner's saved profile marked 863 เริ่ม "start" as a duplicate of 725 อุณหภูมิ "temperature". Under the new rule that would have blocked 10th Kyu for good.
- No vocabulary order, ID, SRS record, Known status or bookmark changed. The 200 Thai bank entries at positions 301–500 only had their stored belt label and in-stage position recalculated.
- **Tests:**
  - new tests58: 32/32;
  - updated tests46: 26/26;
  - tests37 G2 is updated for the new table (C1 is a known old failure);
  - full regression: **2,010 checks passed, 7 failed** (frozen copy of the combined Japanese + syllabus build, 58 suites).
  - 5 are the long-standing known failures, which also fail on v699: tests33 2G, tests35 2C-th / 2C-zh, tests37 C1, tests39 A5.
  - 2 are tests55 cases 3 and 6. They fail identically on the unchanged v700 code when run today, but passed yesterday, so they are not caused by these changes. They look date-dependent and are worth a separate look..
- Not deployed.

## 2. Old versus new thresholds

| Rank | Old (v689) | New (v701) |
|---|---|---|
| Mukyu | 1–100 | 1–100 · 100 |
| 10th Kyu | 101–200 | 101–200 · 100 |
| 9th Kyu | 201–300 (100) | **201–400 · 200** |
| 8th Kyu | 301–400 (100) | **401–600 · 200** |
| 7th Kyu | 401–500 (100) | **601–800 · 200** |
| 6th Kyu | 501–700 | **801–1,000** |
| 5th Kyu | 701–900 | **1,001–1,200** |
| 4th Kyu | 901–1,100 | **1,201–1,400** |
| 3rd Kyu | 1,101–1,300 | **1,401–1,600** |
| 2nd Kyu | 1,301–1,550 (250) | **1,601–1,800 · 200** |
| 1st Kyu | 1,551–1,800 (250) | **1,801–2,000 · 200** |
| Shodan | 1,801–2,000 (a word band) | **no band**: 2,000 qualifying words + the required assessment |

The belt page also used to show positions shifted down by one ("500–699"). It now shows the real positions, for example "201–400 · 200 words".

## 3. Every rank-threshold definition found

| Where | What it was | Now |
|---|---|---|
| `CURRICULUM_BELTS` (tt.jsx) | Hand-written from/to table, 12 rows including the Shodan band | Built from `CURRICULUM_STAGE_SIZES`, 11 stages. This is the one authoritative table. |
| `BELT_RANKS` | Derived from CURRICULUM_BELTS, with Shodan at 1,800 | Derived from `RANK_LADDER` (11 stages + Shodan at 2,000) |
| `RANK_ORDER` | A hand-written list of 12 names (a second copy) | Derived from `RANK_LADDER` |
| `NEW_SLOTS_BY_KNOWN` | Derived, with Shodan's minimum from the band | Derived from `RANK_LADDER` (`start`) |
| `BeltRankView` `BELTS` + current belt | Shodan max 99999; ranges shown as from−1…to−1; current belt and progress from a **known-word count** (it disagreed with the dashboard) | Derived from `RANK_LADDER`. Shows `rankRangeText`. Current stage and progress come from `rankProgressFor`, the same function the dashboard and rank test use. |
| `currentRankName` | Skipped stages with no words, so it returned "Shodan" | First stage not complete (including unwritten ones). Shodan only after all 11. |
| `rankTestStatus` | Counted only the entries the bank holds | Counts against required positions. Reports `populated` / `missingPositions`. |
| Stored `belt` / `beltOrder` per word: the Thai `RAW_VOCAB` literal; the Mandarin and Japanese merges (`d.belt ||` preferred the stale stored label); Thai init and load sync (`d.beltOrder`) | Written under the old ranges | Always derived from `curriculumIndex` (`beltForCurriculumIndex`, `beltOrderForCurriculumIndex`). The 200 Thai literal entries at 301–500 were relabelled. |
| `unseenRankTargets` | Sorted by stored `beltOrder`, which restarted every 100 words and would interleave the new 200-word stages | Sorts by curriculum position |
| Duplicate `wordsForRank` (defined twice, identically) and `wordsForBeltLabel` | Derived from `curriculumRangeFor` | Unchanged. Both already read the one table. |
| `calculateBeltRank` (used by the Japanese stats line) | A known-count ladder from `BELT_RANKS` | Same function, now on the new ladder (Shodan at 2,000) |
| Dictionary belt filter | Options from CURRICULUM_BELTS (it included an empty-to-be "Shodan") | The 11 stages plus "Extended". Shodan has no words to filter. |
| Netlify functions / `index.html` | No threshold copies. `index.html` is a build of tt.jsx. | — |

## 4. Files changed

- **`dev/tt.jsx`:**
  - the rank table and its derivations;
  - `rankTestStatus`, `currentRankName`, `awardedRankName` (new), `rankProgressFor`, `RankTestButton` text;
  - `BeltRankView`;
  - the dashboard rank card ("studying 201–400 · 200 words", "Awarded: …");
  - word-load derivations (Thai init + load sync, Japanese, Mandarin);
  - `unseenRankTargets`;
  - the corrupt-duplicate-pointer repair in the Thai load sync;
  - the Thai `RAW_VOCAB` belt labels for positions 301–500.
- **`dev/tests58.js`:** new, the brief's cases 1–27 (32 checks).
- **`dev/tests46.js`:** rewritten from the v689 ladder to the v701 ladder (same structure).
- **`dev/tests37.js`:** G2 now pins the v701 ladder (the Japanese bank and complexity table are still compared byte-for-byte with v674).
- **Version pins:** tests34, 35, 36, 37, 38, 39 and 16 also accept v7xx.
- **`dev/run_all.sh`:** adds tests58.

## 5. One authoritative configuration

Yes.

- `CURRICULUM_STAGE_SIZES` → `CURRICULUM_BELTS` (11 stages) → `RANK_LADDER` (+ `SHODAN_RANK`) → `BELT_RANKS`, `RANK_ORDER`, `NEW_SLOTS_BY_KNOWN`, the belt page, the dictionary filter, `beltForCurriculumIndex`, `beltOrderForCurriculumIndex` and `curriculumRangeFor`.
- `assertBeltTablesAligned` still checks the derived tables against each other.
- tests46 B4 fails if a hand-written `from:`/`to:` bound reappears anywhere in the app.

## 6. Ownership of all 2,000 positions

tests58 cases 4–16 check every position from 1 to 2,000:

- each position belongs to exactly one stage;
- there are no gaps or overlaps;
- every boundary is exact: 350 → 9th, 500 → 8th, 750 → 7th, 1,850 → 1st Kyu, 2,000 → 1st Kyu, 2,001 → beyond the curriculum.

## 7. Impact on current learners' displayed progress

**Owner's Thai profile** (scratchpad backup, run offline and never committed):

| | Old | New |
|---|---|---|
| Studying | 10th Kyu (Orange) | 10th Kyu (Orange) |
| Proven | 96/99 | 96/100 |
| Awarded | not shown | Mukyu |
| New words per Daily Track | 5 | 5 |
| Sentence length | 3–5, max 7 | 3–5, max 7 |

The proven count was 96/99 because the corrupt duplicate flag hid position 136. With the flag dropped, 10th Kyu counts all 100 positions.

**Other learners:**

- A learner who has finished 1–300 used to study 8th Kyu (301–400). Now they study 9th Kyu (201–400, 100/200 proven). The new-word quota is 5 instead of 7, and the sentence length is the 9th Kyu contract instead of 8th Kyu. This follows directly from the new table.
- A learner who has finished every word the bank holds now studies the first unfinished stage instead of being shown as Shodan:
  - Thai: 8th Kyu, 100 of 200 written;
  - Japanese: 9th Kyu, 0 of 200 written;
  - Mandarin: 10th Kyu, 0 of 100 written.
- The belt page and rank test say plainly when the rest of a stage is not in the curriculum yet.

## 8. No vocabulary or SRS data lost

- **Word lists:** no word was added, removed or reordered, and no ID changed (tests58 22th / 22ja / 22zh).
- **Learner records:** the load sync was run twice on a full Thai profile through the real Teacher component. No status, streak, recall count, date, Known flag or bookmark moved, and the second load changed nothing (26b). The only exceptions are the app's existing older migrations: alias folding, and unlocking locked words.
- **Japanese / Mandarin merges:** idempotent (26a).
- **Rank-test credit:** passed rank tests (`rankPassed`) are kept and still count (25).
- **Corrupt pointer repair:** it only drops a duplicate pointer that the canonical bank does not confirm. It keeps the old value as `_clearedDuplicateOf` for audit. A duplicate the bank confirms stays (26d).

## 9. Wedding Speech words

- Unranked topic-only words stay unranked: no position, "Beyond curriculum".
- They never count toward a stage. Making every one of them Known changes no stage count.
- Ranked topic words count once, at their own curriculum position (case 24).
- Topic priority order is separate and unchanged.

## 10. Offline regression results

- tests58 (new): **32/32**.
- tests46 (updated to the new ladder): **26/26**.
- tests28, 29, 43, 55: unchanged results. tests55 cases 3 and 6 fail identically on the v700 baseline, so they are not caused by this change.
- Full regression on the syllabus build: **2,010 checks passed, 7 failed** (frozen copy of the combined Japanese + syllabus build, 58 suites).
  - 5 are the long-standing known failures, which also fail on v699: tests33 2G, tests35 2C-th / 2C-zh, tests37 C1, tests39 A5.
  - 2 are tests55 cases 3 and 6. They fail identically on the unchanged v700 code when run today, but passed yesterday, so they are not caused by these changes. They look date-dependent and are worth a separate look.

## 11. Remaining issues

- **Curriculum coverage:** Thai holds positions 1–500 (8th Kyu is half written), Japanese 1–200 and Mandarin 1–100. No learner can pass a stage whose words are not written yet. This is the intended rule, but it needs new curriculum entries to unblock.
- **Japanese stats line:** it still uses the known-word-count ladder (`calculateBeltRank`), now on the new numbers. Moving it to the stage-based rank would make it match the dashboard exactly. It is display only.
- **Owner's profile on the live site:** the corrupt duplicate flag will be dropped on the first load after deployment.

## 12. Deployment status

Not deployed. The change is on `claude/session-continuation-check-a19meq` only and waits for the owner's "go live".

## TL;DR

One rank table now drives every surface for all three languages:

- Mukyu and 10th Kyu are 100 words each, then 200 per rank up to 1st Kyu at 1,801–2,000.
- Shodan is awarded only after all 2,000 positions are proven.

The old bug that showed "Shodan" once a learner finished the words the bank holds is fixed. No learner data changed, and the owner's displayed rank is the same apart from the new "Awarded: Mukyu" line. A corrupt duplicate flag that would have blocked the owner's 10th Kyu is repaired. Offline tests pass. Nothing has been deployed.
