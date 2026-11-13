# Brief: fix the reviewers' findings in the Japanese modules

Read BRIEF_WRITE.md first (slots, closed vocabulary per tier, lengths, casual speech, A = man / B = woman, English and prompt rules). Independent readers reviewed the finished modules and found real problems. Your file `drafts/review/FIXnn-findings.csv` lists the findings you own (columns source_file, module_id, word_id, line, kind, severity, problem, suggested_fix). Every finding is severity FIX and is NOT an "exclude" suggestion (those were applied already).

## What to do
For each module in your file (a module may have several findings, for different words and lines):
1. Look at the module in its source file (the `source_file` column; the module rows are there, edit ONLY your source files) and at how it renders: `python3 tools/ja_check.py render drafts/ALL-modules.csv MODULE_ID [WORD_ID]` (rebuild ALL first with `python3 tools/ja_merge_modules.py` when you have edited).
2. Fix the root cause so the module reads naturally for EVERY word it fits, not only the flagged one:
   - a wrong line (Japanese, English, prompt): rewrite that line (Japanese text with the same slot tokens, the English with {E}/{Es}/{a} as BRIEF_WRITE.md allows, and the prompt) so it is natural casual speech, the vocabulary is allowed at the module's tier, the unit length is in range, and the three lines still form one conversation. Use the reviewer's suggested_fix when it is good; improve it when not.
   - a "fit" problem where a line cannot work for the flagged word: first try to rewrite the line so it works for all fitting words; if impossible, add that word id to the module's `exclude_ids` (keep the existing ids; `;`-separated). Never exclude a word from so many modules that it falls below 3 fitting modules in its cell: `python3 tools/ja_check.py drafts/ALL-modules.csv | tail -1` shows the number of words with fewer than 3 modules (it was 67 before your work: do not make it higher without saying so; list every word you pushed below 3 in your report).
   - a finding you believe is wrong (the line is fine): leave the module untouched and say so in the report (with the reason).
3. Edit source files with a small python script that rewrites only the rows you change (UTF-8 with BOM, same header and column order, CRLF line endings, csv quoting), atomically (temp file + os.replace). Other fixers edit OTHER source files at the same time: never touch a file that is not in your findings file, and never touch `drafts/ALL-modules.csv` except by running the merge script (it is a derived file; do not commit it).
4. Validate: `python3 tools/ja_check.py drafts/ALL-modules.csv --quiet` must print `problems 0` for your modules (problems listed for modules outside your files are not yours; report them).
5. Do NOT commit. The parent commits everything after all fixers finish. Use your own scratchpad subfolder `FIXnn-fix`.

## Report (short)
Number of modules fixed by rewriting, number excluded, number of findings you rejected (with the reasons), any word pushed below 3 modules, and anything systematic you noticed (a tag problem with a word, a template type that keeps failing).
