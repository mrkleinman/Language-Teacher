# Brief: write Cantonese gap-fill exchange modules (colloquial Hong Kong / Guangzhou Cantonese)

You write modules for the Cantonese part of "Thai Teacher" (a language-learning app). A **module** is a three-line exchange written ONCE with a slot, usable for every word in one cell (subgroup).
Speakers: **A = a man, B = a woman**, friends talking in everyday, relaxed spoken Cantonese written in TRADITIONAL characters, Hong Kong usage. Lines go A1 -> B -> A2, and the slot word appears in EVERY line.
Everything is checked by `tools/yue_check.py`; run it on your draft until it prints `problems 0`.

## Files
- `cantonese-word-base.csv` + `cantonese-word-tags.csv`: the words (id = curriculum position) and their tags (group, subgroup = the CELL, frame, english_slot, classifier, register_note ...).
- `python3 tools/yue_check.py words CELL [TIER]` lists the words of a cell with tier, slot, frame, classifier and notes (OBEY the register_note and english_slot warnings). `python3 tools/yue_check.py allowed T1` lists EVERY word you may use at tier T1 (T2 includes T1, and so on).
- `python3 tools/yue_check.py render FILE.csv MODULE_ID [WORD_ID]` shows a module filled in for real words (Cantonese, English, prompt). READ these renderings; they must read naturally for every word the module fits.
- Output: CSV (UTF-8 with BOM) `drafts/<BATCH>-modules.csv` with header
  `module_id,group,tier,belts,status,job,scene,exclude_ids,fits_words,cell_words,A1_yue,A1_english,A1_prompt,B_yue,B_english,B_prompt,A2_yue,A2_english,A2_prompt`
  `module_id` = `<CELL>-<tier>-<nn>` (e.g. V_CONSUME.INTAKE-T2-03); `group` holds the CELL name; `status` = ready; `belts`: T1 White;Orange, T2 Orange+Stripe;Blue;Blue+Stripe, T3 Yellow;Yellow+Stripe, T4 Green;Green+Stripe, T5 Brown;Brown+Stripe;Beyond; `job` = what the exchange does (ask, offer, agree, comment, share, plan, complain ...); `scene` = where (home, shop, street, school, office, phone, cafe, station ...); `fits_words`/`cell_words` leave empty; `exclude_ids` = `;`-separated word ids the module does NOT suit.
- Your assignment is `drafts/plan/<BATCH>.csv` (lines `cell,tier,words_up_to_tier,words_at_tier,modules`): write EXACTLY that many modules for each (cell, tier). A module at tier k fits every word of the cell whose own tier is <= k, so the lines must suit the whole cell up to that tier (use `exclude_ids` for the odd word out). If a cell's words cannot share one sentence frame, say so in your report (and use `exclude_ids` so each module still fits at least one word).

## Slots
Cantonese: `{W}` the word, written exactly as in the list (Cantonese words never change form). `{M}` = the word's CLASSIFIER, ONLY when every word the module fits has one (e.g. 呢{M}{W}, 一{M}{W}); a module that uses {M} must exclude words without a classifier.
English: `{E}` the word, `{Es}` its plural, `{a}` = a/an/nothing as needed. Never write "a {E}" or "an {E}" (use `{a}`); never "{E} is/are" or "it/them" for words whose number can change; in verb cells `{E}` only in BASE-FORM positions (after to/can/will/let's/please/don't/did you ...): "I want to {E}.", "Let's {E}.", "Did you {E}?" - never where English needs -ed/-ing/-s; adjectives take "is {E}", "so {E}", "too {E}", "not {E}".
Prompts (`*_prompt`): a short English instruction telling the learner what to say, ONE speech act per prompt (Ask / Tell / Say / Suggest / Thank / Check), at most two short parts. A prompts say "her" (A is a man speaking to a woman), B prompts say "him". NEVER a name, never "they/them" for the other person, never "A", "B" or "the other person's question", never "Ask her: <English sentence>", never a prompt that describes something the line does not say.

## Vocabulary and length
- Closed vocabulary: ONLY words from `allowed TIER` for the module's tier, plus the free sentence-final particles 呀 啊 啦 喇 囉 嘛 喎 啩 噃 咯 吖 啫 and the interjections 哦 噢 嗯 喂 哎 哇 嘿 哈. There is no tokeniser: the checker covers each line with allowed words by dynamic programming, so a character the list cannot cover is rejected ("NOT ALLOWED at T1: ..."). Check every line.
- NO Mandarin forms: use 唔 not 不, 係 not 是, 嘅 not 的, 喺 not 在, 佢 not 他/她, 哋 not 們, 呢/嗰 not 這/那, 乜嘢 not 什麼, 點解 not 為什麼, 冇 not 沒有, 咗 not 了, 食/飲/睇/講 not 吃/喝/看/說, 而家 not 現在, 今日/聽日/琴日, 多謝/唔該 not 謝謝, 仲 not 還. Sentence-final 嗎 and 吧 are Mandarin: ask with 呀, 咩, 未, "X唔X" or an intonation question.
- A module at tier k is checked against the cell's words of tier <= k: a word may use modules from its own tier UPWARD (never below its own tier).
- Length in content units (particles not counted, the slot counts 1): T1 2-5, T2 4-8, T3 6-10, T4 7-12, T5 8-14 per line. Higher tiers allow richer, more natural exchanges - use that, not just longer endings.
- Every line ends with 。 ？ ！ or … . At most two sentence-final particles per line. No rude words, no politics/religion/romance.

## Natural casual speech (this matters most)
- Real Cantonese a Hong Kong friend would say: the particles in place (啦, 喎, 㗎, 啩, 囉, 呀 ...), 唔該/多謝, 好 / 幾 / 咁 as degree, 乜嘢/邊度/點樣/幾多/幾時 as questions, 食咗飯未呀？, 你有冇…呀？. No textbook phrasing, no word-for-word Mandarin. One idea per line.
- A1 opens (often a question or offer), B answers or reacts with something real (not just "yes"), A2 answers or follows up - the three lines are ONE coherent mini-conversation about the slot word. A line is ONE speaker's turn: NEVER ask a question and answer it in the same line; the answer words 係/唔係/好/冇 open the OTHER speaker's reply.
- Vary jobs, scenes and openings across the modules of a cell; each module's A1 must start differently from the other modules of the same cell and tier (the checker compares the first two characters).
- The English must be natural spoken English, not a gloss of the Cantonese structure, and it must say what the Cantonese says (a negation stays a negation, a question a question).
- Every module must read naturally for EVERY word it fits: if one word does not fit, list it in `exclude_ids`. Test with `render` on at least four different words of the cell (all of them for small cells).

## Lessons from the Thai, Japanese and Mandarin sets (do not repeat these)
1. A line that needs an untaught word is wasted: stay inside the tier's list. 2. The slot English must make sense in every frame ("this clothes" for 衫 is wrong: report such slots instead of writing around them). 3. Aspect markers, particles and one-off function words (咗 過 啦 …) cannot be dropped into an ordinary frame: write the small one-off modules the cell needs and keep each line natural. 4. Keep the three lines about the same word and the same situation (no jumping from lunch to school). 5. Prompts must match the Cantonese exactly: if the line starts with a thank-you the prompt says so.

## Report (short)
Module count per cell/tier, exclusions you used, words with fewer than 3 fitting modules in your cells, any tag/slot problems you noticed (name word id + issue), new checker quirks.
