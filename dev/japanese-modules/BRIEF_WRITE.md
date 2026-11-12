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

## Counts (pilot, tier T1)
Every module fits ALL words of its cell, so a cell needs enough different modules for variety, not 3 per word: cells with 8+ words: 10 modules; cells with 5-7 words: 8; cells with 3-4 words: 6; X_ cells with one or two words (one-of-a-kind words): 3 modules per word (write them for that word only: list every other word of the group in `exclude_ids`, or better, make the cell its own subgroup - the cell for X_ words is the subgroup in the tags). Fewer is fine ONLY when a cell's words cannot support more natural lines - say so in your report.

## Lessons from the pilot (tiers T2-T5 writers: read this)
- The tags file the checker uses is `japanese-word-tags.csv` (merged and harmonised). Cells are SUBGROUP names; `module_id` = `<CELL>-<tier>-<nn>` (e.g. N_PLACE.GO-T2-03) and the `group` column holds the CELL name.
- Your assignment is a CSV of lines `cell,tier,words_up_to_tier,words_at_tier,modules`: write exactly that many modules for each (cell, tier) at that tier. A module at tier k fits every word of the cell whose own tier is <= k, so the lines must suit the whole cell up to that tier (use `exclude_ids` for the odd word out, as the pilot did). Higher tiers allow more vocabulary and longer lines: use them to write richer, more natural exchanges, not just longer ones.
- `python3 tools/ja_check.py words CELL` shows every word of a cell with its tier, slot and notes; the `register_note` and english_slot warnings from the taggers are shown there: obey them (slots with a preposition, plural slots, words that need の/に, words that only work for a third person...).
- Checker quirks found in the pilot: it tokenises the text after a slot on its own, so a slot directly followed by で/けど can be rejected: rephrase (a full stop and でも, or {V}のは...). The following are NOT in the tier-1 vocabulary and are rejected at low tiers: この その あの そっか なるほど 〜てみる 一回 中 私 もっと. Check `allowed TIER` instead of guessing.
- Avoid stiff stuff the pilot produced: "Ask her if she does understand this" (write natural English prompts: "Ask her if she understands this."), generic one-size lines that sound like a textbook drill. Each module must be a believable little conversation between friends about the word.
- Adjective cells mix i- and na-adjectives: use {Aq}, {A}, {Aattr} so one set of lines works for both; do not write だ after an adjective slot.
- Verb cells: respect the frame (を / に / で / と); if two verbs in the cell cannot share a line, use exclude_ids.
- Colour words (A_COLOUR cell) are noun-type adjectives (青 赤 黒 ...): they have {A} {Aq} {Aneg} {Apast} {Anegpast} {Ate} {Aattr} (→ 青の) but NO {Aadv}; never use {Aadv} there.
