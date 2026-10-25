# Handover: Thai gap-fill exchange modules (complete draft set)

Upload this file with the files in section 2 to carry on in a regular Claude chat or in the build chat.

## 1. What this is

**The app.** "Thai Teacher" (index.html) has a Daily track. Each day covers 30 words, and each word gets a 3-line mini-exchange: **A (man) → B (woman) → A (man)**, with the target word in every line. Claude Haiku writes these live today and blind reviews scored them about 6/10 (contradictions between lines, missing small words, one use of a word every time).

**The plan.** Replace live generation and the 0.75 MB `THAI_EXCHANGE_BANK` with **gap-fill modules**: a 3-line exchange written once with a slot `{W}`, usable for any word of the right type. Every word has a type tag (`group`, and now `subgroup`) and a tier. The app picks a module whose group/subgroup and tier match, then fills the slots. Tone: casual, friendly, polite Bangkok Thai (`thai-speaking-guide.md`, 41 rules).

**Where we are.** Every group is now written, reviewed by blind native-level reviewers, fixed and merged. **6,115 usable modules** cover all 2,860 words except those listed in section 6 (about 130 words with fewer modules than the target, 31 skipped words).

## 2. Files

| File | What it is |
|---|---|
| `thai-modules.csv` | 6,650 rows: **6,115 usable** + 535 `superseded` (old part-1 modules that were replaced; do not use). |
| `thai-word-tags.csv` | All 2,860 words: `id, thai, english, belt, tier, group, second_group, subgroup, classifier, english_slot, english_slot_2, english_plural`. **`subgroup` is new** (1,820 words, 498 subgroups). `english_slot` is now filled for every word. |
| `thai-allowed-words.csv` | The closed vocabulary (word → first allowed tier). |
| `thai-speaking-guide.md` | The 41 rules for spoken Thai. |
| `thai-skipped-words.txt` | 31 words that cannot have gap-fill modules, with reasons (section 6). |
| `thai-modules-gaps-log.txt` | The running log of every gap, accepted false alarm and unreviewed module. |
| `thai-modules-workbench.zip` | The drafts and scripts to regenerate and extend everything (section 7). |
| `check_modules.py`, `render.py`, `coverage.py` | Checker, English renderer (reference implementation of the slot rules), coverage report. |

### thai-modules.csv columns

`module_id, group, tier, belts, status, job, scene, exclude_ids, fits_words, cell_words, A1_thai, A1_english, A1_prompt, B_thai, B_english, B_prompt, A2_thai, A2_english, A2_prompt`

- `group` is the **subgroup name** (`GROUP.NAME`, e.g. `V_HANDLE.KITCHEN`) for split groups, otherwise the plain group.
- `status`: `ready` (use) or `superseded` (do not use). The old `needs_split` and `redo` statuses no longer exist: the modules they covered were replaced.
- `exclude_ids`: word ids this module does **not** suit (`;`-separated). The app must skip the module for those words. Single-word and small-family modules list everything else as excluded.
- Thai slots: `{W}` = the word, `{CLF}` = its classifier. English/prompt slots: `{E}`, `{Es}`, `{a}` (section 5).

## 3. Tiers (Thai words per line, end particle not counted)

T1 2–5 · T2 4–8 · T3 6–10 · T4 7–12 · T5 8–14 (belts: T1 White/Orange, T2 Orange+Stripe/Blue/Blue+Stripe, T3 Yellow(+Stripe), T4 Green(+Stripe), T5 Brown(+Stripe)/beyond).

A module at tier k was only checked against words of tier ≤ k, so a word may use modules **from its own tier up to the learner's tier**, never below its own tier.

## 4. What was built

Module counts (usable):

| Kind | Groups (modules) |
|---|---|
| Nouns | N_ABSTRACT 456 · N_PLACE 330 · N_PERSONROLE 261 · N_ITEM 167 · N_BODY 161 · N_MONEY 160 · N_STUDYWORK 150 · N_HOME 144 · N_MEDIA 134 · N_EVENT 129 · N_HEALTH 109 · N_TIMEUNIT 106 · T_TIME 90 · N_OUTDOORS 75 · N_FOODSTUFF 66 · N_DISH 56 · N_DEVICE 56 · N_FAMILY 55 · N_TRANSPORT 55 · N_ANIMAL 53 · N_WEATHER 51 · N_DRINK 48 · N_CLOTHES 42 |
| Adjectives | A_THING 302 · A_PERSONSTATE 219 · A_CONDITION 62 · A_TASTE 48 · A_CHARACTER 41 · A_COLOUR 39 |
| Verbs | V_HANDLE 381 · V_COMMUNICATE 192 · V_ROUTINE 174 · V_SOCIAL 174 · V_MIND 169 · V_CHANGE 163 · V_MOVE 154 · V_TRADE 124 · V_CONSUME 44 · V_WANTLIKE 33 |
| Quirky words (one module per word or tiny family, selected with `+id`) | X_FUNCTION 455 · X_PHRASE 138 · X_ADVERB 103 · X_QUANTITY 90 · X_PROPER 56 |

**Sub-groups.** The mixed groups were split so that the same three lines work for every word in a subgroup (e.g. N_PLACE.EAT/SHOP/BANK…, V_HANDLE.KITCHEN/…, A_THING.PRICE/SIZE…). Splits are in the `subgroup` column. N_ITEM and N_OUTDOORS were not split; they use per-module exclusions instead. All verb groups, N_ABSTRACT and X_PROPER are split.

**Superseded.** The part-1 modules of N_PLACE, A_THING, N_HOME, A_PERSONSTATE, N_PERSONROLE, N_BODY, N_TIMEUNIT and V_MOVE (535 rows) are replaced by the subgrouped sets and marked `superseded`. The 672 other part-1 modules (N_DISH, N_DRINK, N_FAMILY, N_FOODSTUFF, N_TRANSPORT, N_ANIMAL, A_TASTE, A_COLOUR, N_WEATHER, N_CLOTHES, A_CONDITION, A_CHARACTER, N_DEVICE) are unchanged, except that N_ANIMAL-T5-08 now uses `{a} {E}`.

**Counts per cell.** Ordinary cells: `min(24, 8 + ceil(cell words/10))` where the cell has 10+ words, and for small subgroups at least 3 modules per word at its own tier (4 for T1–T2 words). The quirky X_ groups have 2 modules per word (3 at T1).

**Process.** Writer agent → vocabulary/length/English checker (0 problems) → blind native-level reviewers (about 50 modules each) → fixer agent (fixes that broke a rule were adapted) → re-check. A last spot-review pass covered about 310 late-added replacement modules.

**Verification on the merged files:** `render.py` finds 0 English-filling problems; module ids are unique; the 1,207 original rows are unchanged apart from the `superseded` marks and the one N_ANIMAL fix; every usable module fits at least one word. `check_modules.py` still reports the known false alarms listed in section 6 for the new modules, and some real alarms in part-1 modules (section 6).

## 5. Rules for the app

**Picking a module for a word**

1. Candidate modules: `group` equals the word's `subgroup` (when it has one) or its `group`; fall back to `second_group` if there are none.
2. Use tier between the word's own tier and the learner's tier, preferring the learner's tier. Never use a module below the word's tier.
3. Skip modules whose `exclude_ids` contain the word id; skip `status = superseded`.
4. Avoid repeating a module within a day.
5. Fill the slots:
   - `{W}` ← `thai`; `{CLF}` ← `classifier`.
   - `{E}` ← `english_slot_2` if the module's group (before the dot) equals the word's `second_group` and `english_slot_2` is filled; otherwise `english_slot`.
   - `{Es}` ← `english_plural`, or the `{E}` form if empty.
   - `{a}` ← nothing when `english_plural` equals `english_slot` (pair and mass nouns); otherwise "an" before a vowel sound, else "a". Collapse double spaces.
   `render.py` is the reference.
6. If nothing fits (skipped words, words below target in section 6), fall back to live generation.

**English writing rules used** (keep them for new modules): never "a/an" before `{E}` (use `{a}`); never "{E} is/are" or "it/them" for number-ambiguous words; verbs use `{E}` only in base-form positions (after to/can/will/let's/imperative); never start a sentence with a token; single-word modules may spell the word out. A prompts say "her", B prompts say "him".

**Speakers.** A (man): ครับ/นะครับ/สิครับ, ผม. B (woman): ค่ะ statements, คะ questions, ฉัน. One end particle per line. No romance/flirting between A and B, no insults.

## 6. Gaps and known issues (read this before shipping)

**Words with fewer modules than the target** (full list: run `python3 coverage.py thai-modules.csv thai-word-tags.csv`; 133 of 2,860 words):

- 31 X_ words are skipped on purpose (`thai-skipped-words.txt`): ผม, ฉัน, ครับ, ค่ะ, คะ (a speaker cannot say the other's word), เธอ (means "you"), เมื่อ/อย่างไรก็ตาม/นอกจากนี้/ขณะที่ (written style), จ้า/ป่าว/รึ/รึเปล่า/เว้ย/ดิฉัน (banned or chat-only), นาย/นาง (need a name), ตั้งแต่…ถึง…, …ให้หน่อย, ช่วย…ได้ไหม, …อยู่ที่ไหน (templates with blanks), phrases containing ฉัน/ครับ (นี่ครับ, ครับผม, ฉันชื่อ …), กรุณาช้ากว่านี้.
- Part-1 groups still have thin words: N_CLOTHES (5), N_DEVICE (16), N_FOODSTUFF (4), N_TRANSPORT (10), N_WEATHER (3), A_CONDITION (18), A_CHARACTER (10), N_DISH (1), A_COLOUR แดง 678 (0 modules; duplicate of สีแดง), N_FAMILY คู่รัก (0).
- A few new words sit at 2 modules where 3–4 were wanted, mostly T2 words at 3 of 4 (e.g. in N_HOME, N_ITEM, N_PLACE, V_TRADE). Details in `thai-modules-gaps-log.txt`.

**Probable mis-tags (for a tagging pass).**

- 517 `ถนนคนเดิน ...` has a literal " ..." in the word itself; the app should strip it, or fix the tag.
- Duplicates / near-duplicates: 678 แดง vs 706 สีแดง; 7016 and 217 (novice monk); 1566, 6044 and 6047 (vendor); เด็ด/เด็ดๆ; ชัด/ชัดเจน/แน่ชัด.
- Not persons / not the stated type: 6406 ดับเพลิง, 6913 ทีม (N_PERSONROLE); 620 ฝรั่ง has N_PERSONROLE only as `second_group`; 6202 แม่บ้าน is tiered T3.
- Wrong-sounding glosses: เอว 421 (slot "lower back", means "waist"); น้ำลาย 6513 ("drool"); หุ่น 1133; กระดูกสันหลัง 6893 (tag T4, allowed list T5); ฉีด 1096 (only the medical sense is used); สระ 1180 (wash hair; second group N_OUTDOORS); ใกล้เคียง (used as "similar"); สอดคล้อง (a verb in A_THING); ดีกว่า (comparative); พอดี (also "happen to").
- Written style that people rarely say: ผู้แพ้ 6788, พลเมืองอาวุโส 6871, ขนบนใบหน้า (facial hair: the vocabulary has no โกน/หนวด/เครา), โทรทัศน์, คอมพิวเตอร์พกพา, เครื่องฉาย, พื้นที่จัดเก็บ; เหตุ 7027 and ประวัติ 1285 only work in special frames.
- Slot overlaps are handled by `english_slot_2` (35 words), e.g. จน 1212 ("until" in X_FUNCTION, "broke" in A_PERSONSTATE), แพ้ 1023, หาย 975, โต 1257, สาย 108, หนัง 504, คืน 6075, หลัง 551, เย็น 76, ดัง 802, ตั้งใจ 1330, ประหยัด 6102, เตี้ย 6507, ละเอียด 7379, โชคดี 672, เฉยๆ 1113.

**Review coverage.**

- Every group had a blind review and a fix pass.
- Replacement modules written during the fix pass: about 310 were spot-reviewed and fixed. Roughly 250 more were not (N_EVENT, N_STUDYWORK, N_TIMEUNIT, V_TRADE, A_PERSONSTATE, N_ABSTRACT, T_TIME, V_CHANGE, the X_ groups, a second round of V_HANDLE, and a handful written at the very end such as V_WANTLIKE LIKE-T1-05/06 and ENTHUSE-T5). The lists are in `thai-modules-gaps-log.txt`. Treat them as a second-priority review target.
- The three real-world dubious items to check by eye: ขนบนใบหน้า modules (N_BODY.HAIR T4), ผู้แพ้ (N_PERSONROLE.CONTEST T4), พลเมืองอาวุโส (N_PERSONROLE.AGE T4).

**Accepted false length alarms** (tokenizer merges compounds: สีขาว, สองทุ่ม, วันเสาร์, ท้องว่าง, แอป, รถติด): X_FUNCTION T2-12 A2, T5-12 A1, T5-14 B, T1-59 A2; X_ADVERB T2-06 B; X_PROPER SIGHT-T4-04 B; N_HEALTH MEDS-T3-03 A1; N_OUTDOORS T2-04 B, T5-03 B, T5-08 A1; N_TIMEUNIT DATE-T1-04 A2; A_THING LOOKS-T2-09 A2; V_MOVE TRANSFER-T3-02 B (embedded ที่ไหน → ค่ะ is right), JOURNEY-T5-02 B, LATE-T5-03 B; A_THING METHOD-T5-01 B (embedded question). Several single-word modules deliberately spell the word out in English instead of `{E}` (V_ROUTINE MORNING possessive verbs, V_HANDLE RULES, V_MOVE GESTURE, etc.).

**Part-1 modules the stricter checker now flags** (672 older ready modules; not rewritten): about 90 alarms concentrated in N_TRANSPORT (16), N_DISH (14), N_DRINK (11), N_FAMILY (10), A_TASTE (10), N_FOODSTUFF (9), N_ANIMAL (8), A_CONDITION (4), A_CHARACTER (1). Typical: a literal "a {E}" (should be `{a}`), a prompt saying "him" in an A line, ค่ะ on a question, a repeated opening. These are cheap to fix with `check_modules.py` (see section 7).

**Vocabulary gaps** (wanted by modules or reviewers; worth adding at T2–T3): particles/reactions จัง, เถอะ, หรอก, อ๋อ, โห, อ้าว, เนอะ; ตก, แรง, หลับ, เสีย, แย่, นาน, เก่ง, ผิด, ตรง, ห่วง, นิสัย; ผ้า, ชุด, คับ, หลวม; ปุ่ม, ช่าง, ลบ, รุ่น, ระบบ, รหัส, กล้อง, เพลง, เกม, แบต, เสียบ, จอ; สัปดาห์/อาทิตย์ as "week"; ปวด/เจ็บ at T2 (they start at T3); นวด, ทา, แปรง, เมื่อย, แหวน, ขยับ, ชี้, ยุบ; ธุรกิจ, ฝึก, ซ้อม, ตลก, ทีวี, โรงงาน, สนาม, แข่ง, สู้, คลิป, วิดีโอ; ธูป, เข็ม, แชมพู, โรค, เหงื่อ, อุ่น, ตึก, บันทึก; ปากกา, ดินสอ, พลาสติก, ขยะ, พาสปอร์ต, ใบขับขี่. **Tier mismatches:** basic speech words allowed only from T3: ว่า, ไว้, ค่อย, เอง, งั้น, ยอม, น่าจะ, บ้าง, ตัวเอง; at T1 even ขวด, แก้ว, ประตู, ห้อง are missing. คะแนน and โยคะ trip the checker's female-particle test (they contain คะ).

## 7. Scripts and how to continue

Unzip `thai-modules-workbench.zip` (a folder `thai-workbench`; run everything from inside it).

- `drafts/KEY.txt` pipe-separated modules, `KEY.slots` (`id|english_slot|english_plural`), `KEY.subgroups` (`id|GROUP.NAME`), `KEY.skip` (`id|reason`). Format and rules: `BRIEF.md` (writer) and `REVIEW_BRIEF.md` (reviewer).
- `python3 tool.py check KEY` runs the checker on one draft (vocabulary by tier, length, particles, English tokens, openings, coverage). Also `words KEY`, `lookup w…`, `render KEY ID`, `packet KEY` (writes a review packet).
- `python3 merge_v2.py` rebuilds `final/thai-modules.csv` and `final/thai-word-tags.csv` from the part-1 files in `base/` plus all drafts (it reproduces the delivered files byte for byte).
- `python3 check_modules.py thai-modules.csv` checks a whole CSV; `python3 render.py thai-modules.csv` checks the English filling; `python3 coverage.py thai-modules.csv thai-word-tags.csv` lists thin words.
- `review/*.findings.md` are the reviewers' findings tables (audit trail); `spotpacket.py` builds a packet of late-added modules.
- To add words: tag them, add them to a group's `.slots` (and `.subgroups`), write modules to cover them with `tool.py check`, then run `merge_v2.py`.

## 8. Other app-side notes

- Add an opposite-pair contradiction check for live generation (ถูก/แพง, เปิด/ปิด, มี/ไม่มี).
- `THAI_NATURALNESS_GUIDE_V701` says "ใช่ค่ะ only answers a yes/no question", which contradicts the guide; remove it.
- `THAI_ALWAYS_OK_WORDS` includes formal words that push Haiku toward written Thai (สามารถ, เมื่อ, อย่างไร, สถานที่, พบ, การ, ความ). Consider removing them.
- The old exchange bank can be turned off with `thaiBankSetEnabled(false)` and then removed (0.75 MB).
