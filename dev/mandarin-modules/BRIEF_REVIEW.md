# Brief: independent quality review of the Mandarin gap-fill modules (read-only)

You are a careful reader checking lessons for a language-learning app. A module is a three-line exchange (A = a man, B = a woman, friends, everyday casual-polite mainland Mandarin, Simplified characters) with a slot filled by a word. The machine checker already guarantees vocabulary, length and slot syntax. What it cannot judge is whether the exchange is NATURAL and CORRECT for the word in the slot. That is your job. You do NOT edit any module.

## What to do
1. Your assignment is `drafts/review/Rnn.csv` (columns module_id, word_id). Render it: `python3 tools/zh_render_batch.py drafts/review/Rnn.csv > <your scratchpad>/Rnn.txt`, then read that text in chunks (about 150 blocks at a time, Read with offset/limit). Each block shows one module filled in for one word: Chinese | English | learner prompt, for A1, B and A2.
2. FLAG only real problems:
   - **Chinese**: unnatural or wrong for friends talking casually; a collocation that does not exist (verb/object, measure word with the wrong noun, 的/地/得 misuse, aspect particle misuse, a separable verb split wrongly); register wrong (written style, 您, stiff); a reply that does not answer the line before; the word used in a different meaning than listed; a line that is grammatical only for some words of the cell.
   - **English**: not natural spoken English; wrong article/number/tense/verb form ("a hour", "he want", "an new", "{E} is" with a plural, a slot gloss like "(passive)" leaking); the English not matching the Chinese.
   - **Prompt**: does not tell the learner what to say, or says something different from the line; an A prompt using "him" or a B prompt using "her"; nonsensical.
   - **Fit**: the line makes no sense for THIS word although it would for others (needs `exclude_ids`), or the three lines are not one coherent mini-conversation.
   Do NOT flag style preferences, or things that real people could say. When unsure, do not flag. The same module appears for other words in other files; judge it for the word shown.
3. Write findings to `drafts/review/Rnn-issues.csv` (UTF-8 with BOM), header `module_id,word_id,line,kind,severity,problem,suggested_fix`: `line` A1/B/A2/ALL; `kind` chinese/english/prompt/fit; `severity` FIX (clearly wrong or unnatural) or MINOR; `problem` one short sentence; `suggested_fix`: the corrected line keeping the slot tokens ({W}, {M}, {E}, {Es}, {a}) when a clean fix exists, or "exclude <word_id>" when the module simply does not fit that word, or empty. The unfilled templates are in `drafts/ALL-modules.csv` (columns A1_zh, A1_english, A1_prompt, B_..., A2_...); `python3 tools/zh_check.py render drafts/ALL-modules.csv MODULE_ID WORD_ID` shows one filled in.
4. Scratchpad subfolder `Rnn-review`; touch no other repo file; do not commit.

## Report (short)
Blocks read; FIX and MINOR counts by kind; the 5 worst patterns (root causes, such as a tag problem with one word); any english_slot / english_plural / measure_word problem with a specific word.
