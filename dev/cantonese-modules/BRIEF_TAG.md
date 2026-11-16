# Brief: classify and tag Cantonese words (one pass: use class + module tags)

Input: `input/B0N.csv` (key, word, jyutping, yale, meaning, pos, deck_sentence, deck_sentence_meaning). The word list comes from a Cantonese HSK 1-5 deck (traditional characters, Jyutping, English). It was made by adapting a Mandarin list, so it MIXES everyday spoken Cantonese with Mandarin-textbook words (成語, 拼音, 人民幣, 胡同, 元旦 ...). The deck's English meaning and sentence are context only (never shown to the learner).
Output: `drafts/classify/C0N-tags.csv`, header exactly
`key,word,use_class,tier_hint,group,subgroup,frame,english_slot,english_plural,classifier,pos,cantonese_note,skip`
One output row per input row, same key and word. Do not edit any other file.

## The 80/20 idea (most important)
About 20% of the words carry about 80% of everyday spoken Cantonese. Judge each word as a speaker in Hong Kong / Guangzhou using it in ordinary talk with friends:
- `use_class` A = core: heard or said almost daily (pronouns, 係/唔/冇/喺/嘅/咗/緊, 好, 食, 飲, 去, 嚟, 睇, 講, 做, numbers, 今日/聽日, 乜嘢/邊度/點樣/幾多, family, food and drink basics, 多謝/唔該/對唔住, ...). Aim for roughly 20% of your batch, no more than 25%.
- B = common: everyday but narrower (shops, transport, weather, feelings, hobbies, most colloquial verbs/adjectives).
- C = useful: real words a learner needs later (work, school, health, travel, opinions).
- D = rare, written-style (書面語), exam/textbook only, or not said in spoken Cantonese (成語, 拼音, 人民幣, 元旦, 國慶節, formal 與其/然而/並且 ...). Mark `skip` as well when it cannot sensibly be a slot word.
`tier_hint` T1..T5: T1 = first 200 words of a learner's life (all of the core), T2 next 600, T3 next 400, T4 next 650, T5 the rest. A -> mostly T1/T2; B -> T2/T3; C -> T3/T4; D -> T5 (or skip).

## Honest Cantonese
Say what a Cantonese speaker really says. If the deck headword is the Mandarin word and Cantonese uses another (deck 食/吃, 衣服 vs 衫, 看 vs 睇, 他 vs 佢), keep the deck row but state the issue in `cantonese_note` ("Cantonese says X"). If the Jyutping or meaning looks wrong, say so there. Do not silently fix: the owner reviews the notes. Traditional characters, Hong Kong usage. Colloquial register only.

## Groups (exactly one `group`; `subgroup` = GROUP.TOPIC, one short upper-case topic word; many taggers work in parallel so use the well-known topics: N_PLACE.EAT, N_PLACE.SHOP, N_FOODSTUFF.MEAT, N_FOODSTUFF.VEG, V_HANDLE.KITCHEN, V_COMMUNICATE.ASK, A_THING.PRICE, N_FAMILY.OWN ...)
Nouns: N_FOODSTUFF N_DISH N_DRINK N_PLACE N_PERSONROLE N_FAMILY N_BODY N_CLOTHES N_ITEM N_HOME N_DEVICE N_TRANSPORT N_WEATHER N_ANIMAL N_MONEY N_STUDYWORK N_MEDIA N_EVENT N_HEALTH N_TIMEUNIT T_TIME N_NUMBER N_ABSTRACT N_OUTDOORS
Verbs: V_CONSUME V_MOVE V_HANDLE V_COMMUNICATE V_ROUTINE V_SOCIAL V_MIND V_CHANGE V_TRADE V_WANTLIKE
Adjectives: A_THING A_PERSONSTATE A_CONDITION A_TASTE A_CHARACTER A_COLOUR
One-offs (one small family per word): X_FUNCTION (係 有 冇 喺 都 就 仲 又 再 會 識 可以 要 ...) X_QUESTION (乜嘢 邊度 邊個 點樣 幾多 點解 幾時) X_PRONOUN (我 你 佢 呢個 嗰個 呢度 嗰度) X_ADVERB X_PHRASE (多謝 唔該 對唔住 再見 ...) X_QUANTITY X_PROPER X_COUNTER (numbers/units) X_MEASURE (the classifiers 個 隻 張 條 件 本 杯 架 間 位 啲 ...)
Cantonese needs two more one-off groups: X_PARTICLE (sentence-final particles 啦 喎 㗎 咩 呀 啊 囉 啫 啩 嘛 呢 ...) and X_ASPECT (咗 緊 過 開 吓 住 ...). Add another group only if nothing fits and say so in cantonese_note.

## frame (verbs and adjectives; empty for nouns)
Verbs: `obj` (食, 睇, 買), `goal` (去, 嚟, 返), `itr` (瞓, 唞, 起身), `with` (同 X V: 傾偈, 見面), `place` (喺 X V: 住, 做嘢), `obj+goal` (畀 X + object), `say` (講/諗/覺得 + clause), `exist` (有, 喺), `separable` (verb-object words that split: 瞓覺, 沖涼, 唱歌), `special`. Adjectives: `adj` (Cantonese adjectives take 好 / 唔 / 咁 / 幾 and need no 係).

## english_slot / english_plural (same rules as the Thai, Japanese and Mandarin sets)
`english_slot` fills `{E}`: nouns the bare noun, verbs the base form after "to / can / will / let's" ("eat", "go home"), adjectives the bare adjective. One natural everyday word or short phrase, never "a/an/the". `english_plural` for `{Es}`, empty = same form (mass and pair nouns). For words with two senses pick the one a beginner uses most (the deck repeats some headwords with different senses: 佢 he / 佢 she, 好 good / 好 very: treat each row on its own and say so in cantonese_note).
`classifier`: the usual Cantonese classifier for counted nouns (個 隻 張 條 件 本 杯 架 間 位 枝 部 ...), else empty. `pos`: noun / verb / adj / adverb / pronoun / question / number / classifier / particle / aspect / conjunction / preposition / phrase / proper / interjection.

## skip
Give a reason (and still fill group = X_ ..., pos) for words that cannot be a slot word: written-style only, exam/textbook only, fragment or morpheme, near-duplicate of another row (name its key), a word the deck uses in a Mandarin way Cantonese speakers do not. When unsure whether a word is usable, keep it and mark use_class C or D rather than skipping.

## Checks to run on your own file before you finish
One row per input key, allowed group names, `pos` present, no article in english_slot, verbs' english_slot a base form, use_class in A/B/C/D, tier_hint in T1..T5, A share of the batch between 12% and 25%. Print the counts.
