# How a Thai topic is built (recipe: Wedding Speech v698, Muay Thai v761)

A topic is **an ordered list of canonical dictionary ids**, never a second dictionary. Progress is read from the learner's real SRS state (nothing is stored per topic). Everything is data in
`dev/tt.jsx`; the screens, the selector and the generator are shared. History: `04cd97a` / `ad78636` (Topics + Wedding Speech, v698), `32b38a9` (topic words that were approved grammar stay legal),
`2477bca` (a topic word is "a lexical item with its own lesson"), `f132349` (reused records; `composable`), `9ea0c11` (every topic word tagged for modules), `56ca540` (Muay Thai).

## 1  The pieces in tt.jsx (grep the names)
| Piece | What it is |
|---|---|
| `THAI_TOPIC_ID_BASE` (5001) and `THAI_MUAY_ID_BASE` (5501) | id spaces for NEW topic records: id = base + the word's position in the topic list (0-based). Wedding 5001–5050; Muay Thai 5502–5559 (the reused positions leave gaps). Clear of learner-added words (max id + 1) and of the curriculum (6001+). |
| `TOPIC_<NAME>_TH` | `[thai, english, romanisation, usageNote?, { composable?, sense? }?]` per word, in the owner's order. For a word already in the bank only the Thai matters (the bank's record is reused). |
| `TOPIC_<NAME>_GROUPS`, `groupSize` / `groupSizes` | display only: group names, and the words per group (`groupSize: 5` or `groupSizes: [5,5,5,5,6,...]` when groups differ). `topicGroupInfo(topic, k)` serves the progress model and the word list. |
| `seedThaiTopicEntries(RAW_VOCAB, words, topicId, base)` | idempotent, runs at load. Existing headword (a retired alias follows to its kept record): reused, `topics` gets the topic id, nothing else changes. Absent word: ONE new record `{ topicOnly: true, topics: [id], curriculumIndex: 0, belt: 'Beyond curriculum', beltOrder: 0, l: 'new', QC PASS, curriculumBucket: 'TOPIC' }` (+ `usageNote`, + `composable`). |
| `LANGUAGE_TOPICS.th[]` | the registry entry: `id, title, icon, available, description, sceneHint, vocabIds, groups, groupSize(s), seed`. A new topic is ONE entry here. The Topics card, "View all N words", "Generate <title> Track", Recent Tracks labels and the Daily scene preference (`sceneHint`) all follow from it. |
| `selectThaiTopicTargets` (`TOPIC_NEW_PER_TRACK = 5`) | up to 5 not-yet-introduced topic words in priority order (a word is skipped when it fails `thaiVocabEligibility` or `targetActivityPreflight`) + the global revision queue, 30 targets, never a curriculum new word. |
| `thaiHasOwnLesson` | every word with `topics` (or `topicOnly`) is authorised only as itself, never composed from known parts; `composable: true` (a compound made only of dictionary words whose meaning is their sum) keeps the compositional rule, like the 801–2500 import. |
| load sync (`Sync: add any RAW_VOCAB entries that are missing…`) | records absent from a saved learner are appended unintroduced; ids must therefore never be reused for another word. |

## 2  Recipe for the next topic (checklist)
1. **Words.** For each of the owner's words look it up in the real bank (`RAW_VOCAB`, source literal of tt.jsx): same Thai = reuse (check the sense; a second sense goes in `{ sense: {...} }`, see 5); else new. Check near-duplicates (other spellings, `dup` records) before adding.
2. **Readings** for the new words: convert to the dictionary's convention (section 4) and write the reason of every change down.
3. **Data block** after `_weddingSeed`: `THAI_<X>_ID_BASE`, `TOPIC_<X>_TH`, `..._GROUPS`, `..._GROUP_SIZES`, `const _xSeed = seedThaiTopicEntries(...)`, then add the registry entry. Wording of description and sceneHint in the style of the others (what the learner will be able to say; a scene the two friends could be in).
4. **Usage notes are read by the suitability classifier.** A note that calls a word "literary", "written" or "formal" makes `targetActivityPreflight` mark it `WRITTEN_DOMINANT` and the Topic Track silently skips it (it happened to สังเวียน in v761). Describe the use, not the register, unless it is true.
5. **Module tags** for every new word (section 6) — test M11 (`tests68`) fails otherwise.
6. **Tests:** copy `tests99.js` (registered, 60 distinct ids, reuse, no duplicates, phonetics, groups, selection, screens, wedding untouched, links valid). Expected changes in older tests (each edited with a reason in the file): `tests46` W3/W4 (topic-only count), `tests55` 6 and 35 (reused words gain `topics`; two cards on the screen), `tests68` M1 (tag count), `tests71` S2/S4/F2 (bank size). Add the suite to `run_all.sh`.
7. Build `node build.js tt.jsx tt.compiled.js`, run the suites above plus the Thai topic / vocabulary / module ones, then look at the Topics screen in a browser (`build_index.py` into a scratch folder, never a release folder).

## 3  What a reused word keeps
Id, SRS history, curriculum position, belt and romanisation are the bank's. Only `topics` is added (and, for a two-sense word such as ยก "lift" / "a round", the gloss, `note`, `usageNote`, `senseId` and `senseBefore`).
Words the phrase / word split promotes (`THAI_PHRASE_SPLIT_DATA`) can show a different position at run time than in the source literal; that is the split, not the topic.

## 4  Romanisation: the dictionary's convention (`dev/sandbox/curriculum/thai-801-2500/phon/RULES.md`)
Lower case, syllables joined by hyphens, tone mark on the vowel (à low · â falling · á high · ǎ rising · none mid; from consonant class, vowel length, final and tone mark). Long vowels are written double:
ɔɔ = **aaw**, ɛɛ = **aae**, ʉʉ = **uue**, ɤɤ = **ooe**, ia = **iia**, ua = **uua** (the display layer collapses doubled i / u before a, so the app shows `sǎng-wian`), เ-ือ = **uea**, short ɔ = **aw**, -วย = uai, -อย = oi. Initials: ก g · จ j · ต dt · ป bp · ผ พ ภ ph · ถ ท ธ th · ค ข kh · ช ฉ ch · ซ ศ ส s · ห / อ lead consonants only change the tone class.
Validators: `thaiPhoneticToneAdvisory(thai, reading)` (an ADVISORY rule engine: it mis-splits some loan words and ที/ตี-final words; `tests99` D3 lists the four disagreements with the bank's own evidence), the format rules, `validateThaiPhoneticAlignment` against the track lexicon and `composeThaiPhonetic`.
The 11 readings changed for Muay Thai: นวม nuam → **nuuam** (long -ว-, as บวม buuam) · ผ้าพันมือ …mue → **muue** (the bank's มือ) · วอร์มอัพ wáwm-àp → **waawm-àp** (long ɔɔ; mid tone, no high mark; อัพ àp as in อัพโหลด) · กระโดดเชือก chûueak → **chûeak** (เ-ือ = uea) ·
หน้าแข้ง khâeng → **khâaeng** · แข่ง khàeng → **khàaeng** · แชมป์ chaem → **chaaem** (long แ-) · ต่อสู้ dtàw → **dtàaw** · คู่ต่อสู้ → **khûu-dtàaw-sûu** (long ɔɔ) · น็อก nók → **náwk** (short ɔ; the bank's หมวกกันน็อก náwk) · เทรนเนอร์ thren-nâa → **threen-nooe** (long เ-; เ-อร์ = ooe, mid).

## 5  A bank word with another sense
Follow the v713 ถูก decision: ONE record carries both everyday senses. In the topic tuple: `{ sense: { e, senseId, note, usageNote } }` — `seedThaiTopicEntries` applies it once and keeps the old text in `senseBefore`. The module tag keeps its single English slot (the word's bank sense): the second sense is taught by the gloss and the model writer, not by modules
(the picker uses a word's `second_group` only when its own cell has no module).

## 6  Modules for a topic (the Thai gap-fill system, `dev/thai-modules/`)
- **Tag every new word** in `thai-word-tags.csv` (CRLF, BOM): `id, thai, english (the record's gloss), belt (Beyond curriculum), tier, group, second_group, subgroup (the CELL), classifier, english_slot, english_slot_2, english_plural`. The picker serves a word the modules of ITS CELL (subgroup, else group) at its tier or above, minus `exclude_ids`.
  A cell is a set of words that can share the same three lines. **Do not drop a new word into an old cell**: the old modules were never read with it (and an unsplit group such as N_ITEM has per-module exclusions); make a NEW subgroup (`N_BODY.COMBAT`, `N_ITEM.GEAR` …) and let the cross-use tool link what is safe. Tier: the tier of the words' cell (T4 for the Muay Thai words; a topic word's belt is "Beyond curriculum" = T5, which would allow T5 modules only).
- **Need** = 3 modules at the word's own tier (4 for T1–T2; X_ groups 2): `python3 tools/thai_module_crossuse.py need --topic thai-modules/topic-<id>-words.csv` (the CSV comes from `node tools/topic_words_csv.js <id>`).
- **Plan and brief:** `tools/plan_muaythai_batches.py` (balanced batches `drafts-muaythai/MTnn.csv`), `BRIEF_MUAYTHAI.md`, three hand-written samples `MT00-sample-modules.csv` (never merged).
- **Check, merge, embed:** `tools/check_thai_drafts.py FILE` (repo checker + new-cell rules; closed vocabulary from `thai-allowed-words.csv`, rebuilt by `tools/build_thai_allowed_words.py` because the original file was never committed) → `tools/merge_thai_drafts.py` (appends to `thai-modules.csv` and `thai-module-links.csv`, writes the writers' `serves_ids` as author links, regenerates the cross-use links, runs `tools/build_thai_modules.py`) → `node build.js` → `tests68`, `tests99`.
- **Cross-use** (`tools/thai_module_crossuse.py`): `thai-module-word-links.csv` (rows with status `applied` are embedded as `x` in the module data and added to the word's candidates by `thaiModuleCandidates`). SAFE = noun twin (same English slot as a noun the module already serves, same group) + tier / classifier / plural / render / vocabulary mechanics; everything that merely has attested frames goes to `thai-module-word-links-review.csv` with a note per row; the writers' `serves_ids` are class `author`. `apply --promote review-strong` applies the strong review rows once a native reader has agreed.

## 7  Gotchas met
Two cards on the Topics screen change any test that counts `data-topic-stat` cells · a reused word's `topics` field makes it a "lesson of its own" for the composition rule · the first id of a new topic must not collide with a saved learner's own words (learner words are max id + 1: stay in 5051–6000) ·
`thai-word-tags.csv` and its siblings are CRLF + BOM (a Python rewrite with LF turns every line into a diff) · `thai-modules/coverage.py` also counts a word's plain parent group and `second_group`, the app does not (`tools/thai_modules_lib.py` follows the app) · the phrase / word split rewrites some tags' tier at load (`thaiPhraseSplitTags`).
