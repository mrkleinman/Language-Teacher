# Brief: top-up modules for thin Cantonese words

Read `BRIEF_WRITE.md` first and follow ALL its rules (slots, closed vocabulary per tier, lengths, A = man / B = woman, English rules, prompts, checker quirks). This brief only changes the job.

## The job
All writer batches and fixes are merged in `drafts/ALL-modules.csv`. Some words have fewer fitting modules than their tier asks (T1/T2 words 3, T3/T4 words 2, T5 words 1; a word can only use modules at its own tier or higher). Your assignment file `drafts/topup/TUnn.csv` lists, per line, a `cell`, a `tier`, the `thin_word_ids` / `thin_words` and `modules` (the MINIMUM number to write for that line). Write enough new modules at that tier for that cell so that every thin word reaches its target. Words that cannot share one sentence frame (different grammar, different English slot) need dedicated modules: each fits one word (or a small compatible group) and lists every other word of the cell (up to that tier) in `exclude_ids`.
- Each module must read naturally for every thin word it fits (render with every word: `python3 tools/yue_check.py words CELL` and `render`). Obey the `register_note` and `english_slot` of each word. If a word has no natural frame at all (a bound element, a slot that cannot sit in an English sentence), skip it and say so in the report - do not force a bad line.
- Core words (tag keys starting with C) are not yours: they have dedicated modules.
- `module_id` = `<CELL>-<tier>-U<nn>` (U01, U02, ... per cell and tier). Same CSV header as BRIEF_WRITE. A module at tier k uses only words allowed at tier k.
- Existing modules of the same cell and tier are in `drafts/ALL-modules.csv`: read their A1 openings and do not repeat them (the checker compares the first two characters of A1 within a cell and tier).
- Output: `drafts/TOPUP-TUnn-modules.csv` (UTF-8 with BOM). Use your own scratchpad subfolder; touch no other repo file; do not commit.
- Validate: `python3 -I tools/yue_check.py drafts/TOPUP-TUnn-modules.csv --quiet` must print `problems 0`, and `python3 tools/yue_topup_cov.py drafts/topup/TUnn.csv drafts/TOPUP-TUnn-modules.csv` shows the coverage of the thin words (note: its OK/LOW threshold is 3; judge against the tier targets above).

## Report
Per line: modules written, exclusions used, final coverage of each thin word, words you could not support naturally, tag/slot problems noticed, new checker quirks.
