# Brief: top-up modules for thin words (Mandarin, casual-polite speech)

Read `BRIEF_WRITE.md` first and follow ALL its rules (slots, closed vocabulary per tier, lengths, A = man / B = woman, English rules, prompts, checker quirks, the 2026-11-12 word-list repair in WORDLIST-CHANGES-2026-11-12.md). This brief only changes the job.

## The job
All writer batches are merged in `drafts/ALL-modules.csv` (6,903 modules, 0 checker problems). A few words still have fewer than 3 modules that fit them (a word can only use modules at its own tier or higher). Your assignment file `drafts/topup/TU01.csv` lists, per line, a `cell`, a `tier`, the `thin_word_ids` / `thin_words` and `modules` (the MINIMUM number to write for that line). Write enough new modules at that tier for that cell so that EVERY thin word ends up with at least 3 fitting modules in total. Words that cannot share one sentence frame (different grammar, different English slot) need dedicated modules: each fits one word (or a small compatible group) and lists every other word of the cell in `exclude_ids` (find the ids with `python3 tools/zh_check.py words CELL`). Write MORE modules than `modules` whenever a word would otherwise stay below 3; never fewer. In X_ADVERB.ADDED T4 there are 13 thin words that cannot share frames: plan about 2 dedicated modules per word (some pairs may share one: 难怪/怪不得, 一共/差不多, 提前/准时/及时).

- Each module must read naturally for every thin word it fits (render with every word). Obey the `register_note` and `english_slot` of each word (`python3 tools/zh_check.py words CELL`): e.g. 姓/剩/掉 slots are base-form only (after to/can/will/must/don't), 顺便 is always said to "you", adverb slots can never open an English line (put them after a comma/conjunction).
- `module_id` = `<CELL>-<tier>-U<nn>` (U01, U02, ... per cell and tier). Same CSV header as BRIEF_WRITE. A module at tier k uses only words allowed at tier k.
- Existing modules of the same cell and tier are in `drafts/ALL-modules.csv`: read their A1 openings and do not repeat them (the checker compares the first two characters of A1 within a cell and tier).
- Output: `drafts/TOPUP-TU01-modules.csv` (UTF-8 with BOM). Use your own scratchpad subfolder `TU01-zh`; touch no other repo file.
- Validate: `python3 tools/zh_check.py drafts/TOPUP-TU01-modules.csv` must print `problems 0`, and `python3 tools/zh_topup_cov.py drafts/topup/TU01.csv drafts/TOPUP-TU01-modules.csv` must show no `LOW` word (or you explain exactly why in the report). Also run `python3 tools/zh_merge_modules.py` is NOT needed.

## Report
Per line: modules written, exclusions used, final coverage of each thin word, words you could not support naturally, tag/slot problems noticed, new checker quirks.
