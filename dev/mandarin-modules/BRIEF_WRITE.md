# Brief: write Mandarin gap-fill exchange modules (casual-polite spoken Mandarin)

You write modules for the Mandarin part of "Thai Teacher" (a language-learning app). A **module** is a three-line exchange written ONCE with a slot, usable for every word in one cell (subgroup).
Speakers: **A = a man, B = a woman**, friends talking in everyday, casual-polite spoken Mandarin (Simplified characters). Lines go A1 -> B -> A2, and the slot word appears in EVERY line.
Everything is checked by `tools/zh_check.py`; run it on your draft until it prints `problems 0`.

## Files
- `mandarin-word-base.csv` + `mandarin-word-tags.csv`: the words and their tags (group, subgroup = the CELL, frame, english_slot, measure_word, register_note ...).
- `python3 tools/zh_check.py words CELL [TIER]` lists the words of a cell with tier, slot, frame, measure word and notes (OBEY the register_note and english_slot warnings). `python3 tools/zh_check.py allowed T1` lists EVERY word you may use at tier T1 (T2 includes T1, and so on).
- `python3 tools/zh_check.py render FILE.csv MODULE_ID [WORD_ID]` shows a module filled in for real words (Mandarin, English, prompt). READ these renderings; they must read naturally for every word the module fits.
- Output: CSV (UTF-8 with BOM) with header
  `module_id,group,tier,belts,status,job,scene,exclude_ids,fits_words,cell_words,A1_zh,A1_english,A1_prompt,B_zh,B_english,B_prompt,A2_zh,A2_english,A2_prompt`
  `module_id` = `<CELL>-<tier>-<nn>` (e.g. V_EAT.FOOD-T2-03); the `group` column holds the CELL name; `status` = ready; `belts`: T1 White;Orange, T2 Orange+Stripe;Blue;Blue+Stripe, T3 Yellow;Yellow+Stripe, T4 Green;Green+Stripe, T5 Brown;Brown+Stripe;Beyond; `fits_words`/`cell_words` leave empty (the tool fills them); `exclude_ids` = `;`-separated word ids the module does NOT suit (words of the cell whose meaning or grammar breaks the lines); `job` = what the speakers do (offer, ask, request, recommend, react, plan, agree, refuse, comment, warn ...); `scene` = a place or situation (home, cafe, station, school, shop, phone, street ...).

## Slots
Mandarin: `{W}` the word, written exactly as in the list (Mandarin words never change form, so verbs and adjectives also use plain `{W}`). `{M}` = the word's measure word, ONLY when every word the module fits has one (e.g. 一{M}{W}); a module that uses {M} must exclude words without a measure word.
English: `{E}` the word, `{Es}` its plural, `{a}` = a/an/nothing as needed. Rules: never write "a {E}" or "an {E}" (use `{a}`); never "{E} is/are" or "it/them" for words whose number can change; in verb cells `{E}` only in BASE-FORM positions (after to/can/will/let's/please/don't/did you ...), so write "I want to {E}.", "Let's {E}.", "Did you {E}?" - never where English needs -ed/-ing/-s; adjectives: "It's {E}.", "so {E}"; never start an English line with a token; no slashes; no "he/she said"; one question mark in English exactly when the Mandarin has ？.
Prompts (`*_prompt`): a short English instruction telling the learner what to say, e.g. "Ask her if she wants some {E}." A prompts say "her", never "him"; B prompts say "him", never "her".

## Vocabulary and length
- Closed vocabulary: ONLY words from `allowed TIER` for the module's tier (a module at tier k uses words of tier <= k), plus the free grammar words: 的 了 吗 呢 吧 啊 呀 嘛 啦 哦 噢 嗯 哎 哇 着 过 地 得 们 一下 哈 诶 喔. There is no tokeniser: the checker covers each line with allowed words by dynamic programming, so a character the list cannot cover is rejected ("NOT ALLOWED at Tn: ..."). Check `allowed TIER` instead of guessing; a word you think is basic may not be in the list at that tier.
- A module at tier k is checked against the cell's words of tier <= k: a word may use modules from its own tier UPWARD (never below its own tier).
- Length in content units (free particles not counted, the slot counts 1): T1 2-5, T2 4-8, T3 6-10, T4 7-12, T5 8-14 per line. Higher tiers allow richer, more natural exchanges - use that, not just longer endings.
- Every line ends with 。 ？ ！ or … . At most two sentence-final particles per line.
- Banned: 您 (always use 你), formal/written words (并且 然而 因此 以及 从而 之间 ...), rude words, 干嘛, 死了.

## Natural casual speech (this matters most)
- Friends at the same level, casual-polite: 你, 吧/呢/啊/嘛/啦 where natural, no stiff textbook phrasing, no "您". One idea per line, sentences people really say (shopping, cafes, trains, weather, plans, food, work, school, phone).
- A1 opens (often a question or offer), B answers or reacts with something real (not just "yes"), A2 answers or follows up - the three lines are ONE coherent mini-conversation about the slot word. No romance, no flirting, no insults, no politics/religion.
- Vary jobs, scenes and openings across the modules of a cell; each module's A1 must start differently (the checker compares the first two characters of A1 within a cell and tier).
- The English must be natural spoken English, not a gloss of the Mandarin structure.
- Every module must read naturally for EVERY word it fits: if one word does not fit, list it in `exclude_ids`. Test with `render` on at least four different words of the cell (all of them for small cells).

## Counts
Your assignment is a CSV of lines `cell,tier,words_up_to_tier,words_at_tier,modules`: write EXACTLY that many modules for each (cell, tier) at that tier. A module at tier k fits every word of the cell whose own tier is <= k, so the lines must suit the whole cell up to that tier (use `exclude_ids` for the odd word out). When a cell's words cannot share one sentence frame (different grammar, different meaning), split the modules into sub-groups using `exclude_ids` so that every word still ends up with at least 3 fitting modules in total; say in your report which words you could not support naturally.

## Tips
- Measure words: use {M} only when natural (一{M}{W}, 这{M}{W}), never for words without a measure word.
- Verb cells: respect the frame in the tags (obj = takes an object; verb + 了/过; two-part words, 离合词 like 吃饭/睡觉 take insertions): if two words cannot share a line, split with exclude_ids.
- Adjective cells: use 很/太/不/真 + {W} patterns only if the cell's words accept them; do not put 很 before comparatives.
- Words with a weak english_slot: obey the register_note; if a slot reads badly in an English frame, avoid that frame.
- Use your OWN scratchpad subfolder named after your batch for scratch files; do not touch any other file in the repo (several writers work at the same time).

## Report (short)
Module count per cell/tier, exclusions you used, words with fewer than 3 fitting modules in your cells, any tag/slot problems you noticed, and new checker quirks.
