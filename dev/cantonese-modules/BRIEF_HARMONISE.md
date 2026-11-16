# Brief: merge the subgroups (cells) of the Cantonese word tags

Input: `input/H0N.csv` (key, word, yale, meaning, group, old_subgroup, frame, english_slot, classifier, pos, use_class, cantonese_note) for the not-skipped words of some groups. Five taggers worked in parallel and each invented their own subgroup names: 1,477 names for 2,180 words, 1,133 of them used once. That is useless: a MODULE (a three-line exchange A man -> B woman -> A, written once with the word as a slot) must fit EVERY word of its subgroup (a "cell"), so a cell needs several words that can share the same three Cantonese lines and the same English lines.
Output: `drafts/classify/H0N-cells.csv`, header exactly `key,word,subgroup,frame,note`, one row per input key. Do not edit any other file and do not commit.

## What to do
Assign every word a FINAL `subgroup` named `GROUP.TOPIC` (its own group, one short upper-case topic word) so that:
- every cell holds words that can share a sentence frame: nouns together (and a person-noun apart from a thing-noun when the lines differ), verbs together by FRAME (obj, goal, itr, with, place, say, exist, separable, special), adjectives together (person-state apart from thing-property, taste/price/size etc. as the lines need);
- cell size: aim for 6-40 words. Cells of 3-5 are allowed only when those words really need their own lines. NO singletons except words in X_ groups (one-off function words, question words, pronouns, particles, aspect markers, classifiers, phrases), which keep a cell per word or per tiny family (e.g. X_PARTICLE.FINAL for several sentence-final particles only if the same lines work).
- when a word does not fit any cell with 3+ words, put it in the closest general cell of its group (e.g. N_ABSTRACT.IDEA, V_HANDLE.GENERAL, A_CHARACTER.GENERAL) rather than leaving it alone; if it truly cannot be in a slot module, say `SKIP: reason` in `note` (the owner will check) and keep its old subgroup.
- you may change `frame` for verbs when the old one is wrong; write the final value (empty for nouns and adjectives with no frame).
- use the same cell names across the whole file for the same topic, names other taggers would also pick. Aim for a total of roughly 25-45 cells per 300 words.
- keep the words within their GROUP: do not move words to another group (say in `note` if you think a word is in the wrong group).

## Checks (run in a script before you finish and print them)
One row per input key; every subgroup starts with its own group name + '.'; number of cells, number of cells with fewer than 3 words (list them, max 10 allowed outside X_ groups); largest cell; no key missing or duplicated.
