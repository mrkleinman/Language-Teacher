# Brief: write Japanese gap-fill exchange modules (casual speech)

You write modules for the Japanese part of "Thai Teacher" (a language-learning app). A **module** is a three-line exchange written ONCE with a slot, usable for every word in one group or subgroup.
Speakers: **A = a man, B = a woman**, friends in everyday CASUAL speech (plain forms). Lines go A1 -> B -> A2, and the slot word appears in EVERY line.
Everything is checked by `tools/ja_check.py`; run it on your draft until it prints `problems 0`.

## Files
- `japanese-word-base.csv` + `drafts/*-tags.csv`: the words and their tags (group, subgroup, frame, english_slot ...).
- `python3 tools/ja_check.py words SUBGROUP [TIER]` lists the words of a cell. `python3 tools/ja_check.py allowed T1` lists EVERY word you may use at tier T1 (T2 includes T1, and so on).
- `python3 tools/ja_check.py render FILE.csv MODULE_ID [WORD_ID]` shows a module filled in for real words (Japanese, English, prompt). READ these renderings; they must read naturally for every word.
- Output: CSV with header
  `module_id,group,tier,belts,status,job,scene,exclude_ids,fits_words,cell_words,A1_ja,A1_english,A1_prompt,B_ja,B_english,B_prompt,A2_ja,A2_english,A2_prompt`
  `module_id` = `<GROUP>-<tier>-<nn>` (e.g. V_CONSUME-T1-03), `status` = ready, `belts` = White;Orange for T1 (T2 Orange+Stripe;Blue;Blue+Stripe, T3 Yellow;Yellow+Stripe, T4 Green;Green+Stripe, T5 Brown;Brown+Stripe;Beyond), `fits_words`/`cell_words` leave empty (the tool fills them), `exclude_ids` = `;`-separated word ids the module does NOT suit (words in the cell whose meaning breaks the lines), `job` = what the speakers do (offer, ask, request, recommend, react, plan, agree, refuse, comment, warn, ...), `scene` = a place or situation (home, cafe, station, school, shop, phone, street, ...).

## Slots
Japanese: `{W}` for nouns and every word that is not a verb or adjective (written exactly as in the list). Verbs: `{V}` dictionary form, `{Vnai}` plain negative, `{Vta}` plain past, `{Vte}` te-form, `{Vtai}` want-to, `{Vstem}` stem, `{Vnakatta}`, `{Vtakunai}`. Adjectives (i and na): `{A}` plain predicate (おいしい / きれいだ), `{Aq}` bare form for questions (おいしい / きれい), `{Aneg}` `{Apast}` `{Anegpast}` `{Ate}` `{Aadv}` `{Aattr}` (before a noun: おいしい / きれいな). A cell uses ONE kind of slot only (a noun cell uses {W}, a verb cell {V...}, an adjective cell {A...}).
English: `{E}` the word, `{Es}` its plural, `{a}` = a/an/nothing as needed. Rules: never write "a {E}" or "an {E}" (use `{a}`); never "{E} is/are" or "it/them" for words whose number can change; in verb cells `{E}` only in BASE-FORM positions (after to/can/will/let's/please/don't/ to-infinitive) - so write "I want to {E}.", "Let's {E}.", "Did you {E}?" (do not use {E} where English needs -ed/-ing); never start an English line with a token; no slashes; no "he/she said"; one question mark in English exactly when the Japanese has ？.
Prompts (`*_prompt`): short English instruction telling the learner what to say, e.g. "Ask her if she wants some {E}." A prompts say "her" never "him"; B prompts say "him" never "her".

## Vocabulary and length
- Closed vocabulary: ONLY words from `allowed TIER` for the module's tier (plus particles, auxiliaries like だ/た/ない/たい/て, sentence-final particles ね よ か の かな, and a few fillers: うん ええ ああ えっ へえ ねえ じゃあ ほら まあ そう). The checker tokenises with Sudachi and rejects anything else. Do NOT use です/ます/ください (casual only).
- A module at tier k is checked against the words of tier <= k in its cell: a word may use modules from its own tier upward (never below its own tier).
- Length in content units (particles/auxiliaries not counted, the slot counts 1): T1 2-5, T2 4-8, T3 6-10, T4 7-12, T5 8-14 per line.
- Every line ends with 。 ？ or ！ .

## Natural casual speech (this matters most)
- Friends at the same level: plain form + ね/よ/かな/の？/じゃん? Keep it neutral: A may use だ/だよ/だね/かな/ぞ-free; B may use の？/よ/ね/かな/だよ/わ-free (NO ぜ/ぞ/おれ/お前 for B; NO かしら/わよ/のよ/だわ for A). One sentence-final particle group per line (よ, ね, よね, かな, の？ ...), and the line must end naturally.
- A1 opens (often a question or offer), B answers or reacts with something real (not just "yes"), A2 answers or follows up - the three lines must be ONE coherent mini-conversation about the slot word. No romance, no flirting, no insults, no politics/religion.
- Vary jobs, scenes and openings across the modules of a cell; each module's A1 must start differently. Do not write "a classroom drill": write what two friends really say (shopping, cafes, trains, the weather, plans, food, work).
- The English must be natural spoken English, not a gloss of the Japanese structure.
- Every module must read naturally for EVERY word it fits - if one word in the cell does not fit, list it in `exclude_ids` (or ask for a split). Test with `render` on at least four different words of the cell.

## Counts
For each cell (group or subgroup with its tier): `min(24, 8 + ceil(words/10))` modules when the cell has 10+ words; small cells need at least 3 modules per word at the word's own tier (4 for T1-T2 words). Quirky X_ groups: 2 modules per word (3 at T1), written for that word with `exclude_ids` listing everything else.
