# Brief: fix the reviewers' findings in the Mandarin modules

Read BRIEF_WRITE.md first (slots {W}/{M}, closed vocabulary per tier, lengths, casual-polite mainland Mandarin, A = man / B = woman, English and prompt rules, the Nov 12 word-list repair). Independent readers reviewed the finished modules and found real problems. Your file `drafts/review/FIXnn-findings.csv` lists the findings you own (source_file, module_id, word_id, line, kind, severity, problem, suggested_fix). All are severity FIX and none is an "exclude" suggestion (those were applied already).

## What to do
For each module in your file (several findings may belong to one module):
1. See it in its source file (`source_file` column; edit ONLY your source files) and filled in: `python3 tools/zh_check.py render drafts/ALL-modules.csv MODULE_ID [WORD_ID]` (re-run `python3 tools/zh_merge_modules.py` after editing).
2. Fix the root cause so the module reads naturally for EVERY word it fits:
   - a wrong line (Chinese, English or prompt): rewrite it (same slot tokens; Chinese vocabulary allowed at the module's tier; unit length in range; still one coherent conversation; English natural, `{E}/{Es}/{a}` as BRIEF_WRITE.md allows; prompts: A never "him", B never "her"). Use the reviewer's suggested_fix when good, improve it when not.
   - a fit problem a line cannot solve for the flagged word: first try to rewrite so it works for all fitting words; else add the word id to the module's `exclude_ids` (keep existing ids, `;`-separated). Do not push any word below 3 fitting modules: `python3 tools/zh_check.py drafts/ALL-modules.csv | tail -1` prints the number of words with fewer than 3 modules (it was 52 before your work; do not raise it without saying which words).
   - a finding you believe is wrong: leave the module and say why in the report.
   - Slot problems that come from the TAG (english_slot / english_plural / measure_word wrong, such as a missing plural or a Taiwan-only form): you may NOT edit mandarin-word-tags.csv (other fixers run at the same time). Instead write the patch to your scratchpad `FIXnn-fix/tag-patch.csv` (id,word,field,old,new) and report it; rewrite the module line only if it can read correctly with either slot.
3. Edit source files with a small python script that rewrites only the rows you change (UTF-8 with BOM, same header and column order, CRLF, csv quoting), atomically (temp file + os.replace). Never touch a file that is not in your findings; never commit; `drafts/ALL-modules.csv` is derived (rebuild with the merge script, never commit it).
4. Validate: `python3 tools/zh_check.py drafts/ALL-modules.csv --quiet` must show `problems 0` for your modules.

## Report (short)
Modules fixed by rewriting / excluded / findings rejected (with reasons); words pushed below 3 modules; the tag-patch list; systematic problems you noticed (for example Taiwan-only wording of a word in the list: report the word and its mainland form, do not change it).
