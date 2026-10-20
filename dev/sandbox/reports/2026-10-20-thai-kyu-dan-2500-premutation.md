# Thai Kyu–Dan 2,500 migration: pre-mutation report (20 Oct)

Nothing has been changed yet. This report covers what would change, what depends on it, and what is still needed from the owner.

## 1. Where the belt thresholds come from

There is **one authoritative table** in `tt.jsx`:

| Line | Definition | What it is |
|---|---|---|
| 6659 | `SHODAN_CURRICULUM_TOTAL = 2000` | Shodan total |
| 6660–6672 | `CURRICULUM_STAGE_SIZES` | 11 rows of colour, rank and size |
| 6673–6679 | `CURRICULUM_BELTS`, `SHODAN_RANK`, `RANK_LADDER` | Ranges built by adding up the sizes |

Every range table derives from it:
- `BELT_RANKS`, `RANK_ORDER`, `NEW_SLOTS_BY_KNOWN`;
- the belt page (`BELTS`) and the dictionary belt filter;
- both Daily selectors;
- `beltForCurriculumIndex`;
- `rankRangeText`.

A run-time check (`assertBeltTablesAligned`) confirms that these agree.

Separate tables keyed by belt name, which don't depend on size:

| Table | What it holds |
|---|---|
| `BELT_VIEW_META` | Colours and descriptions (Black = Shodan) |
| `BELT_ABILITIES` | Ability text, per language |
| `BELT_CONFIG` / `BELT_NEW_ALLOWANCE` | New-word quotas |
| `BELT_COMPLEXITY` | Sentence lengths. Already matches the requested table exactly, Mukyu 2–4/6 through Shodan 4–16/20 |

Belt names, colours and order do not change. Mukyu through 5th Kyu (1–1200) are identical in the old and new ladders. Only 4th–1st Kyu change, from 200 to 325 words each, and the total goes from 2000 to 2500.

## 2. Dependencies on 2,000 and Shodan

**Code that changes:**
- line 6659 (`2000` → `2500`);
- lines 6668–6671 (`200` → `325` for 4th, 3rd, 2nd and 1st Kyu).

There are no hard-coded 1201/1401/1601/1801 bounds anywhere. A test already checks for that.

**Uses that follow automatically:**
- **Belt page and card:** range text, words to go, next belt, progress bars, the missing-positions warning.
- **Dictionary:** the belt filter, and the "Extended" filter (`> SHODAN_CURRICULUM_TOTAL`).
- **Belt tests:** `rankTestStatus` (`total` = belt size, so 325 for 4th–1st Kyu) and the unlock rule.
- **Ranks:** `currentRankName`, where every belt complete means Shodan.
- **Daily:** `pickBeltPriorityTargets` (the earliest incomplete belt) and `isCurriculumWord`.

**Comments to correct:**
- lines 6654–6658 and 6680 ("1–2,000", "2,000 qualifying words");
- lines 6696 and 7964 ("curated 2000");
- line 8023;
- lines 7939–7941 (out of date: it says the Thai bank holds 1–500).

**Shodan assessment.** Shodan already has no word block (`SHODAN_RANK.requires`), which matches the new design. But nothing implements the assessment: `currentRankName` returns Shodan as soon as every belt is complete. To meet "do not auto-award", Shodan must wait until an assessment flag is set. There is no assessment screen yet (`'rank-test'` has no view), so for now Shodan would show as "eligible, assessment required" rather than awarded.

**The table is shared with Japanese and Mandarin.** None of the belt functions takes a language argument. To keep the change Thai-only, the ladder would become per-language: Thai 2,500 and Japanese and Mandarin 2,000, unchanged. The language would then be passed through about 12 functions:
- `curriculumRangeFor`, `beltForCurriculumIndex`, `isCurriculumWord`;
- `wordsForRank`, `rankTestStatus`, `currentRankName`, `rankProgressFor`;
- `currentLearnerBelt`;
- `earliestIncompleteBelt`, `beltPriorityCandidates`;
- `BeltRankCard`, `BeltRankView`, the dictionary filter.

The Japanese bank (1–200) and the Mandarin bank (1–100) would see no difference either way.

**Tests that check the old thresholds** (each would be an EXPECTED THRESHOLD CHANGE):

| Test | Assertions |
|---|---|
| tests46 | B1, B3, B5, E1–E5, W1–W3 |
| tests58 | T1, T3–T5, T17–T19. T19 checks that th, ja and zh share one table, which conflicts with a Thai-only change |
| tests37 | G2, the exact ladder |

The fix keeps their Japanese and Mandarin checks at 2,000 and adds Thai checks at 2,500.

## 3. Records

| Item | Count |
|---|---|
| Thai `RAW_VOCAB` records | **1,844** |
| Records with a curriculum position | 800 (1–800, continuous) |
| Records without a curriculum position | 1,044 |
| Highest id | 6151 |

The 1,044 records without a position, by `lexiconDisposition`:

| Disposition | Count |
|---|---|
| ACTIVE | 578 |
| RECOGNITION | 149 |
| EXCLUDE | 316 |
| None | 1 |

These are the candidates for **reusing a stable id**.

The 7th Kyu list (601–800) as supplied matches the current slots exactly: 200 of 200, with 0 bucket differences.

**Buckets in 1–800:**
- 726 GENERAL_CONVERSATION
- 71 LANGUAGE_CONTEXT
- 3 with no bucket: 201 ต้องการ, 202 สามารถ, 452 พบ

**Duplicates and merges to respect when matching** (the app uses `dup`, `canonicalId` and `canonicalOf`, not `duplicateOf`):
- 688 "น้ำส้ม …" → 790; 776 "ใบเสร็จ …" → 885 (slot 344).
- The same surface twice:
  - ถือ: ids 336 and 622;
  - ทั้งหมด: ids 852 and 1090.

  Each match resolves to the curriculum record, or to the canonical one.

No records are marked retired.

## 4. Requested assignments

| Belt | Slots | Words |
|---|---|---|
| 6th Kyu | 801–1000 | 200 |
| 5th Kyu | 1001–1200 | 200 |
| 4th Kyu | 1201–1525 | 325 |
| 3rd Kyu | 1526–1850 | 325 |
| 2nd Kyu | 1851–2175 | 325 |
| 1st Kyu | 2176–2500 | 325 |
| **Total** | | **1,700 new curriculum positions** |

## 5–7. Collisions, reusable ids, new records (all six lists supplied 20 Oct)

The lists are stored in `dev/sandbox/curriculum/thai-801-2500/`. `match.js` there re-runs the matching read-only.

Each word was matched against all 1,844 records:
- exact NFC, ignoring spaces;
- through `dup` / `canonicalOf`.

| Belt | Slots | Words | Context 🇹🇭 | Reuse an existing id | New record | Collides with 1–800 | Repeats an earlier slot in 801–2500 |
|---|---|---|---|---|---|---|---|
| 6th Kyu | 801–1000 | 200 | 40 | 80 | 120 | 0 | — |
| 5th Kyu | 1001–1200 | 200 | 40 | 38 | 162 | 0 | 0 |
| 4th Kyu | 1201–1525 | 325 | 65 | 35 | 290 | 0 | 5 |
| 3rd Kyu | 1526–1850 | 325 | 65 | 23 | 286 (incl. the 1849 placeholder) | 16 | 2 |
| 2nd Kyu | 1851–2175 | 325 | 65 | 32 | 280 | 13 | 0 |
| 1st Kyu | 2176–2500 | 325 | 65 | 21 | 298 | 6 | 0 |
| **Total** | | **1,700** | **340 (20%)** | **229** | **1,436** | **35** | **6** |

- No slot is missing or duplicated within any list.
- No existing id is claimed twice.
- No match was ambiguous.
- The 229 reusable ids are:

  | Disposition | Count |
  |---|---|
  | ACTIVE | 158 |
  | RECOGNITION | 45 |
  | EXCLUDE | 26 |

  Their learner history would be kept untouched.

### Collisions with 1–800 (35): same word, same meaning, already taught

| New slot | Word | Already at |
|---|---|---|
| 1530 | ทำบุญ | 429 |
| 1558 | บ้าน | 76 |
| 1563 | สามี | 421 |
| 1584 | สาย | 232 |
| 1671 | เช่า | 390 |
| 1672 | จอง | 389 |
| 1674 | นั่ง | 143 |
| 1682 | วิ่ง | 146 |
| 1740 | รถตู้ | 370 |
| 1745 | ทางด่วน | 386 |
| 1761 | เปลี่ยน | 158 |
| 1767 | เลี้ยว | 380 |
| 1802 | ใคร | 11 |
| 1804 | ภรรยา | 422 |
| 1812 | กังวล | 262 |
| 1821 | ชื่อ | 96 |
| 1866 | ค่อนข้าง | 475 |
| 1868 | เกือบ | 471 |
| 1876 | ตาม | 454 |
| 1901 | ตัดสินใจ | 208 |
| 1921 | ติดต่อ | 455 |
| 1927 | ตกลง | 219 |
| 1951 | บริษัท | 436 |
| 1965 | จังหวัด | 387 |
| 1999 | เงินสด | 339 |
| 2051 | อาการ | 419 |
| 2117 | สี่แยก | 383 |
| 2120 | ซอย | 196 |
| 2151 | ข่าว | 442 |
| 2301 | หมายถึง | 213 |
| 2316 | ไม่เห็นด้วย | 221 |
| 2320 | วินมอเตอร์ไซค์ | 368 |
| 2384 | หน้าต่าง | 270 |
| 2480 | ตลาดนัด | 430 |
| 2485 | เซเว่น | 336 |

### Words listed twice within 801–2500 (6)

| Word | Slots |
|---|---|
| สุภาพ | 852 and 1656 |
| ถั่ว | 956 and 1234 |
| กราบ | 1019 and 1285 |
| รถตุ๊กตุ๊ก | 1099 and 1300 |
| เครื่องปรุง | 1128 and 1202 |
| ไม่พอใจ | 1512 and 1773 |

A word can hold only one slot. The proposal is to keep the earlier slot and free the later one.

### Outcome: STOP, per the collision rule

No replacements were supplied, so nothing was written. The open slots are:

| Source | Slots |
|---|---|
| Collisions with 1–800 | 35 |
| Later copies of repeated words | 6 |
| Slot 1849, the owner's "reserve for collision replacement" placeholder | 1 |
| **Total slots needing a word** | **42** |

The owner needs to supply **42 replacement words**: 41 if slot 1849 is meant to absorb one of the collisions rather than receive its own word.

### Not blocking, but worth a look

- **Entries with "…"** can't be a target word as written: 1568 ฉันอยากจะ..., 1631 ฉันชื่อ..., 1651 ยก...ขึ้น. The generator needs a fixed surface, for example อยากจะ, ยกขึ้น.
- **Entries with dots or Latin letters**: 1080 รปภ., 1355 อสม., 1440 ปวช., 1445 ปวส., 1450 กศน., 1780 พ.ร.บ., 2105 รถ บขส., 2135 ตม., 2195 อบจ., 2200 กทม., 1159 ฝุ่น PM2.5, 1787 วอชิงตัน ดี.ซี., 2110 หมอชิต 2. The segmenter and phonetics need checking for these before they become targets.
- **Whole sentences as entries**: for example 1561 คุณเป็นยังไงบ้าง, 1796 คุณชื่ออะไร, 1801 ห้องน้ำอยู่ที่ไหน. Most of their parts are taught in 1–800. They will work as phrase targets, but they sit at 3rd Kyu.
- **Near-duplicates (not exact)**:
  - 1027 ล่วงเวลา / 1039 โอที / 1424 งานล่วงเวลา
  - 1174 สอบผ่าน / 1519 ผ่านการสอบ
  - 1386 ประตูทางขึ้น / 2473 ประตูขึ้นเครื่อง
  - 976 แว่นตา / 1531 แว่นสายตา
  - 899 วิน / 2320 วินมอเตอร์ไซค์

## TL;DR

One table drives every Thai belt range. Changing four sizes (200 → 325) and the total (2000 → 2500) moves everything that derives from it, and 1–800 does not change. To keep Japanese and Mandarin untouched, the ladder must become per-language. Shodan must stop being auto-awarded when all belts are complete; it should show "assessment required" instead.

All six lists (1,700 slots) have been matched. 229 words reuse an existing record and its history, and 1,436 need a new record. But 35 words are already taught in 1–800 and 6 are listed twice, so **the migration has stopped as instructed**. It needs 42 replacement words (41 if slot 1849 absorbs one) before anything is written.
