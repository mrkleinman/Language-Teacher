# Brief: independent quality review of the Cantonese gap-fill modules (read-only)

You are a careful reader checking lessons for a language-learning app. A module is a three-line exchange (A = a man, B = a woman, friends, everyday colloquial spoken Hong Kong Cantonese, TRADITIONAL characters) with a slot filled by a word. The machine checker already guarantees vocabulary, length and slot syntax. What it cannot judge is whether the exchange is NATURAL and CORRECT for the word in the slot, and whether it is real Cantonese rather than Mandarin or written Chinese. That is your job. You do NOT edit any module.

## What to do
1. Your assignment is `drafts/review/Rnn.csv` (columns module_id, word_id). Render it: `python3 tools/yue_render_batch.py drafts/review/Rnn.csv > <your scratchpad>/Rnn.txt`, then read that text in chunks (about 150 blocks at a time, Read with offset/limit). Each block shows one module filled in for one word: Cantonese | English | learner prompt, for A1, B and A2.
2. FLAG only real problems:
   - **Cantonese**: Mandarin word order or vocabulary (e.g. 不/是/的/了/吃/看), written-style Chinese, a collocation or classifier that does not exist in spoken Cantonese, wrong particle (啦 喇 喎 囉 㗎 呀 mixed up so the meaning changes), a reply that does not answer the line before, the word used in a different meaning than listed, a line that is grammatical only for some words of the cell, rude or stiff register.
   - **English**: not natural spoken English; wrong article/number/tense/verb form ("a hour", "he want", "{E} is" with a plural, a slot gloss like "[animal (counter)]" leaking where it should not); the English not matching the Cantonese (a negation lost, a question turned into a statement).
   - **Prompt**: does not tell the learner what to say, or says something different from the line; an A prompt using "him" or a B prompt using "her"; nonsensical.
   - **Fit**: the line makes no sense for THIS word although it would for others (needs `exclude_ids`), or the three lines are not one coherent mini-conversation.
   Do NOT flag style preferences, or things that real people could say. When unsure, do not flag. The same module appears for other words in other files; judge it for the word shown.
3. Write findings to `drafts/review/Rnn-issues.csv` (UTF-8 with BOM), header `module_id,word_id,line,kind,severity,problem,suggested_fix`: `line` A1/B/A2/ALL; `kind` cantonese/english/prompt/fit; `severity` FIX (clearly wrong or unnatural) or MINOR; `problem` one short sentence; `suggested_fix`: the corrected line keeping the slot tokens ({W}, {M}, {E}, {Es}, {a}) when a clean fix exists (it must still pass the closed-vocabulary checker for that module's tier: check with `python3 tools/yue_check.py` on a scratch copy), or "exclude <word_id>" when the module simply does not fit that word, or empty. The unfilled templates are in `drafts/ALL-modules.csv`; `python3 tools/yue_check.py render drafts/ALL-modules.csv MODULE_ID WORD_ID` shows one filled in.
4. Scratchpad subfolder `Rnn-review`; touch no other repo file; do not commit.

## Report (short)
Blocks read; FIX and MINOR counts by kind; the 5 worst patterns (root causes, such as a tag problem with one word); any english_slot / english_plural / classifier problem with a specific word.
