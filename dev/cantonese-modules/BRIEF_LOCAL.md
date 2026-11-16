# Brief: propose LOCAL-CONTEXT words for the Cantonese list (the "20%")

The Cantonese word list is 80% standard vocabulary (from a Cantonese HSK-style deck, 2,000 words kept) plus 20% (about 500) words from LOCAL CONTEXT: what a learner living in or visiting Hong Kong meets and says in ordinary life. The deck is largely a Mandarin-textbook list adapted to Cantonese, so it lacks exactly these words (it has 成語, 拼音, 人民幣, 元旦 but not 八達通 or 茶餐廳). You propose candidates for ONE topic area; the owner will review and cut.

Place: HONG KONG usage, colloquial spoken Cantonese, TRADITIONAL characters. Learner: an adult who wants to function in Hong Kong life (get around, eat, shop, work/study, handle money and services, chat with friends and neighbours). Prefer words people really say (and write in everyday life: signs, menus, WhatsApp) over rare ones.

Files: `input/deck-headwords.txt` (every word already in the deck: do NOT propose any of these headwords; a different sense of an existing headword is also out), `input/existing-cells.txt` (the cells the words will be grouped into: reuse one of these names for `subgroup` when it fits, otherwise make a new GROUP.TOPIC name; the group is the part before the dot).
Output: `drafts/local/L0N-candidates.csv` (UTF-8 with BOM), header exactly
`word,jyutping,meaning,pos,use_class,tier_hint,group,subgroup,frame,english_slot,english_plural,classifier,confidence,note`
- `jyutping`: standard Jyutping with tone numbers 1-6, syllables separated by spaces, lower case, nothing else (e.g. `baat3 daat6 tung1`). Be exact: it becomes the learner's reading (converted to Yale). If you are not sure of a reading, set confidence `low` and say so in `note`.
- `meaning`: short natural English (the learner sees `english_slot`, not this).
- `pos`: noun / verb / adj / adverb / pronoun / question / number / classifier / particle / aspect / conjunction / preposition / phrase / proper / interjection.
- `use_class`: A = said or heard almost daily by someone living in Hong Kong, B = common, C = useful. (No D: do not propose rare words.) `tier_hint` T1..T5 (T1 = within a learner's first 200 words, T2 next 600, T3 next 400, T4 next 650, T5 the rest). Local words should mostly be A/B and T1-T3.
- `group`, `subgroup`, `frame`, `english_slot`, `english_plural`, `classifier` as in BRIEF_TAG.md (read it: groups, frames, slot rules; nouns bare, verbs base form, adjectives bare; a classifier for counted nouns; proper names (places, MTR lines, brands) go in X_PROPER with a one-word slot).
- `confidence`: high / medium / low (is this word REALLY used this way in Hong Kong, and is the Jyutping right?). `note`: anything the owner must know (register, regional variant, loan word, "written on signs only", ...). Never invent a word; if you are unsure it exists, leave it out.
- Single words or fixed short compounds only (no sentences). Include a few classifiers and numbers units that Hong Kong life needs (蚊, 毫, 個半鐘, 層, 座 ...) when they fit your topic. No politics, religion or romance vocabulary beyond festival and custom names.
- Quantity: propose 150 candidates for your topic area (the owner cuts to the best ~125). Check your file with a script: no duplicates inside it, none in the deck headword list, Jyutping syntax valid, allowed pos / use_class / tier_hint values. Print the counts. Do not edit any other file and do not commit.
