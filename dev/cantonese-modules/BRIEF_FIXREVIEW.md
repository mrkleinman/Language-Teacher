# Brief: fix the reviewers' findings in the Cantonese modules

Read BRIEF_WRITE.md first (slots {W}/{M}, closed vocabulary per tier, lengths, colloquial Hong Kong Cantonese in traditional characters, A = man / B = woman, English and prompt rules). Independent readers reviewed the finished modules and found real problems. Your file `drafts/review/FIXnn-findings.csv` lists the findings you own (source_file, module_id, word_id, line, kind, severity, problem, suggested_fix, review_file). All are severity FIX and none is an "exclude" suggestion (those were applied already). A few listed modules may no longer exist (they fitted no word after the excludes and were removed): skip those.

## What to do
For each module in your file (several findings may belong to one module):
1. See it in its source file (`source_file` column; edit ONLY your source files) and filled in: `python3 tools/yue_check.py render drafts/ALL-modules.csv MODULE_ID [WORD_ID]` (after editing re-run `python3 tools/yue_merge_modules.py`; it is safe to run at any time).
2. Fix the root cause so the module reads naturally for EVERY word it fits:
   - a wrong line (Cantonese, English or prompt): rewrite it (same slot tokens; vocabulary allowed at the module's tier; unit length in range; still one coherent conversation; English natural; prompts: A never "him", B never "her"). Use the reviewer's suggested_fix when good, improve it when not.
   - a fit problem a line cannot solve for the flagged word: first try to rewrite so it works for all fitting words; else add the word id to the module's `exclude_ids` (keep existing ids, `;`-separated). Do not leave a word with fewer modules than before without saying so: `python3 tools/yue_check.py drafts/ALL-modules.csv | tail -1` prints how many words have fewer than 3 fitting modules (1201 before your work).
   - a finding you believe is wrong: leave the module and say why in the report.
   - Slot problems that come from the TAG (english_slot / english_plural / classifier wrong): you may NOT edit the tag files (other fixers run at the same time). Write the patch to your scratchpad `FIXnn-fix/tag-patch.csv` (id,word,field,old,new) and report it; rewrite the module line only if it can read correctly with either slot.
3. Edit source files with a small python script that rewrites only the rows you change (UTF-8 with BOM, same header and column order, csv quoting), atomically (temp file + os.replace). Never touch a file that is not in your findings; never commit; `drafts/ALL-modules.csv` is derived (rebuild with the merge script, never commit it by hand).
4. Validate: `python3 tools/yue_check.py drafts/ALL-modules.csv --quiet` must show `problems 0` for your modules (other fixers' modules may show problems while they work).

## Report (short)
Modules fixed by rewriting / excluded / findings rejected (with reasons); words pushed below 3 modules; the tag-patch list; systematic problems you noticed.
