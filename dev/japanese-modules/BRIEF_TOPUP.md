# Brief: top-up modules for thin words (Japanese, casual speech)

Read `BRIEF_WRITE.md` first and follow ALL its rules (slots, closed vocabulary per tier, lengths, casual A=man / B=woman, English rules, prompts, checker quirks). This brief only changes the job.

## The job
The 50 writer batches are merged in `drafts/ALL-modules.csv` (5669 modules). A few words still have fewer than 3 modules that fit them (a word can only use modules at its own tier or higher). Your assignment file `drafts/topup/TUnn.csv` lists, per line, a `cell`, a `tier`, the `thin_word_ids` / `thin_words` and `modules` (how many new modules to write for that line). Write exactly that many modules at that tier for that cell, so that EVERY thin word in the line ends up with at least 3 fitting modules in total.

- Each new module must read naturally for the thin words of its line (render it with every thin word). A module may also fit other words of the cell, but only if it reads naturally for them too; otherwise list them in `exclude_ids`.
- If the thin words of one line cannot share frames (different grammar, different meaning), write dedicated modules: each fits one thin word only and lists every other word of the cell in `exclude_ids` (find the ids with `python3 tools/ja_check.py words CELL`). You may write MORE modules than `modules` if a word otherwise cannot reach 3; never fewer.
- `module_id` = `<CELL>-<tier>-U<nn>` (U01, U02, ... per cell and tier; the U avoids clashes with the existing ids). Same CSV header as BRIEF_WRITE. A module at tier k only uses words allowed at tier k.
- The existing modules of the cell are in `drafts/ALL-modules.csv` and the `W*-modules.csv` files: READ the openings (A1) of that cell and tier and do not repeat them (the checker rejects the same first three characters of A1 within a cell and tier; run it with your file plus the existing file merged: `python3 tools/ja_check.py` accepts one file, so check yours alone, then also check no A1 of yours starts like an existing one in the same cell and tier).
- Words with weak or awkward english slots or notes: obey the `register_note` shown by `ja_check.py words` (e.g. 背 = height, この間 slot already contains "the", 干す = hang out to dry with を, 噛み付く takes に: you may write に-compatible lines only if the slot allows it; if a word truly cannot be supported naturally, say so in your report instead of forcing it).
- Output file: `drafts/TOPUP-TUnn-modules.csv` (UTF-8 with BOM). Use your own scratchpad subfolder `TUnn` for scratch files; touch no other repo file.
- Validate: `python3 tools/ja_check.py drafts/TOPUP-TUnn-modules.csv` must print `problems 0`, and `python3 tools/ja_topup_cov.py drafts/topup/TUnn.csv drafts/TOPUP-TUnn-modules.csv` must show no `LOW` word (or you explain why in the report).

## Report
Per line: modules written, exclusions used, final coverage of each thin word, words you could not support naturally, tag/slot problems noticed, new checker quirks.
