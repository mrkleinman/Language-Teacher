# Brief: independent quality review of the Japanese gap-fill modules (read-only)

You are a careful reader checking lessons for a language-learning app. A module is a three-line exchange (A = a man, B = a woman, friends, casual speech) with a slot filled by a word. The machine checker already guarantees vocabulary, length and slot syntax. What it cannot judge is whether the exchange is NATURAL and CORRECT for the word in the slot. That is your job. You do NOT edit any module.

## What to do
1. Your assignment is a file `drafts/review/Rnn.csv` (columns module_id, word_id). Render it to text: `python3 tools/ja_render_batch.py drafts/review/Rnn.csv > <your scratchpad>/Rnn.txt`, then read that text in chunks (about 150 blocks at a time; use the Read tool with offset/limit). Each block shows one module filled in for one word: Japanese | English | the learner prompt, for A1, B and A2.
2. For each block decide whether it is acceptable. FLAG only real problems:
   - **Japanese**: unnatural or wrong for friends talking casually; a collocation that does not exist (verb/object, particle, counter, adjective + noun mismatch); wrong or odd register (stiff, feminine speech for A, masculine for B); a sentence that does not answer the previous line; the word used in a meaning other than the listed one.
   - **English**: not natural spoken English; wrong article/number/tense ("a hour", "an new", "he want"); the slot word leaving a broken phrase; the English not matching the Japanese meaning.
   - **Prompt**: the learner prompt does not tell the learner what to say (or says something different from the line); A prompt uses "him" or B prompt uses "her"; asks for something nonsensical.
   - **Fit**: the line makes no sense for THIS word although it would for others (the module needs `exclude_ids` for it), or the three lines do not form one coherent mini-conversation.
   Do NOT flag style preferences, small stiffness that real people could say, or things that are merely uncommon. When unsure, do not flag. The same module appears for several words in other files; judge it for the word shown.
3. Write your findings to `drafts/review/Rnn-issues.csv` (UTF-8 with BOM) with header `module_id,word_id,line,kind,severity,problem,suggested_fix`:
   - `line`: A1, B, A2 or ALL; `kind`: japanese / english / prompt / fit; `severity`: FIX (clearly wrong or unnatural) or MINOR (works but could be better);
   - `problem`: one short sentence; `suggested_fix`: the corrected line text keeping the same slot tokens ({W}, {V...}, {A...}, {E}, {Es}, {a}) when you can see a clean fix, or "exclude <word_id>" when the module simply does not fit that word, or empty.
   Work from the unfilled module text when you suggest a fix: `python3 tools/ja_check.py render drafts/ALL-modules.csv MODULE_ID WORD_ID` shows it filled, and the templates are in `drafts/ALL-modules.csv` (columns A1_ja, A1_english, A1_prompt, B_..., A2_...).
4. Use your own scratchpad subfolder `Rnn-review` for scratch files. Touch no other file in the repo. Do not commit.

## Report (short)
How many blocks you read, how many FIX and MINOR findings (by kind), the 5 worst patterns you saw (so they can be fixed at the root, for example a tag problem with one word), and any tag or slot problem with a specific word (english_slot/english_plural wrong).
