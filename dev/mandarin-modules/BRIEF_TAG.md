# Brief: tag Mandarin words for gap-fill exchange modules (casual speech)

Input: `mandarin-word-base.csv` (id, word, pinyin, meaning, belt, tier, entry_type). There is NO part-of-speech column: YOU assign it (see `pos` below). Tag ONLY the rows named in your batch.
Output: a CSV `drafts/<BATCH>-tags.csv` with header
`id,word,group,subgroup,frame,english_slot,english_plural,measure_word,pos,register_note,skip`

## What the tags are for
A module is a three-line exchange A(man) -> B(woman) -> A(man) written ONCE with the word as a slot, usable for EVERY word in the same group/subgroup.
So every word in a subgroup must fit the same three Mandarin lines AND the same English lines. Group strictly: when two words would need different particles, a different verb frame, or different English, they belong to different subgroups.

## Groups (pick exactly one `group`; `subgroup` splits big groups so one set of lines works for all; format GROUP.NAME, e.g. N_PLACE.EAT)
Nouns: N_FOODSTUFF N_DISH N_DRINK N_PLACE N_PERSONROLE N_FAMILY N_BODY N_CLOTHES N_ITEM N_HOME N_DEVICE N_TRANSPORT N_WEATHER N_ANIMAL N_MONEY N_STUDYWORK N_MEDIA N_EVENT N_HEALTH N_TIMEUNIT (days, months, weeks, years as things) T_TIME (time words used as adverbs: 今天 明天 现在 早上 ...) N_NUMBER (numbers, counted things) N_ABSTRACT N_OUTDOORS
Verbs (frame says the particle pattern): V_CONSUME V_MOVE V_HANDLE V_COMMUNICATE V_ROUTINE V_SOCIAL V_MIND V_CHANGE V_TRADE V_WANTLIKE
Adjectives: A_THING A_PERSONSTATE A_CONDITION A_TASTE A_CHARACTER A_COLOUR
Quirky one-offs (one small module family per word): X_FUNCTION (small grammar-like words: 是, 有, 在, 也, 都, 就, 还, 又, 再, 会, 能, 要 ...) X_QUESTION (什么 哪里 谁 什么时候 多少 怎么) X_PRONOUN (这个 那个 这里 那里 我 你) X_ADVERB X_PHRASE (fixed expressions: 谢谢, 对不起, 好的, ...) X_QUANTITY X_PROPER X_COUNTER (numbers/units) X_MEASURE (measure words themselves: 个 张 杯 ...)
You may add a new group name only if nothing fits; say so in register_note.

## frame (verbs and adjectives; leave empty for nouns) - the particle frame the lines must use
Verbs: `obj` (V + object: 吃, 看), `goal` (V + place: 去, 来, 回), `itr` (no object: 睡觉, 起床, 休息), `with` (跟 X V: 见面, 聊天), `place` (在 X V: 住, 工作), `obj+goal` (给 X + object), `say` (说/想/觉得 + clause), `exist` (有, 在), `separable` (verb-object compounds that split: 睡觉, 吃饭, 洗澡), `special` (needs its own lines).
Adjectives (Mandarin adjectives take 很 / 不 / 太 / 真 and need no copula): `adj` plus `person` or `thing` in subgroup.
For nouns, `frame` is empty.

## english_slot / english_plural (very important - the same rules as the Thai set)
- `english_slot` is what fills `{E}` in English lines. Nouns: the bare noun ("coffee", "station", "ticket"); mass/uncountable and pair nouns keep the same form in english_plural.
- `english_plural` is the plural form for `{Es}` ("tickets"); empty means the same as english_slot.
- Verbs: the BASE FORM that fits after "to / can / will / let's / please / don't" ("eat", "go home").
- Adjectives: the bare adjective ("expensive", "delicious").
- Use ONE natural everyday English word or short phrase; never put "a/an" or "the" in the slot (the module supplies `{a}`).
- If the Mandarin word has two meanings in the list (e.g. "okay / all right"), pick the one a beginner uses most and note the rest in register_note.
- `measure_word`: the typical measure word for nouns that are counted (个, 位, 张, 本, 杯, 瓶, 只, 条, 件, 辆, 家, 间, 台, 双 ...), else empty. `pos`: noun / verb / adj / adverb / pronoun / question / number / measure / particle / conjunction / preposition / phrase / proper / interjection.

## skip
Put a reason in `skip` (and still fill group = X_...) for words that cannot be used in a slot module: a speaker cannot say the other's word, written-style only words, banned/chat-only words, duplicates of another row (name the id), pure fragments.

## Rules of thumb
- Casual-polite everyday spoken Mandarin (你, never 您). Mandarin words do not change form: every word is used as written through the {W} slot (and {M} for its measure word).
- Be conservative: if a word could go in two groups, choose the one where the three lines are most natural and say the other in register_note.
- Keep subgroup names short, upper case, one word (EAT, SHOP, HOME, WORK, MOVE, ...). Every subgroup should have at least 3 words unless the word is truly one-of-a-kind (then use X_ group).
- Do not change ids or words. Every row needs `pos` (including skipped rows). One output row per input row.

## Batch mode
- Your batch is the id list in `drafts/batches/<BATCH>.txt` (one id per line). Output `drafts/<BATCH>-tags.csv`, header `id,word,group,subgroup,frame,english_slot,english_plural,measure_word,pos,register_note,skip`.
- Many batches are tagged in PARALLEL (and harmonised afterwards), so naming must be shared. Name subgroups `GROUP.TOPIC` with ONE short upper-case topic word that another tagger would also pick (e.g. N_PLACE.EAT, N_PLACE.SHOP, N_FOODSTUFF.MEAT, N_FOODSTUFF.VEG, V_HANDLE.KITCHEN, V_COMMUNICATE.ASK, A_THING.PRICE, N_FAMILY.OWN). Prefer a modest set of well-known topics over many tiny ones.
- Size target: a subgroup should hold words whose three lines can be the same: roughly 6-40 words. Split a big group by topic AND (for verbs) by frame; never mix verbs that need different patterns, nor a person-noun with a thing-noun when the lines would differ.
- Subgroups must be homogeneous: nouns together, verbs together, adjectives together (the lines use the word in different positions).
- Mandarin specifics: separable verb-object words (睡觉, 吃饭, 洗澡, 唱歌, 上班) are `separable` verbs; stative verbs (喜欢, 知道, 觉得) and adjectives behave differently from action verbs, keep them apart; measure words and number words are their own X_ cells; words that only occur inside a fixed pattern (比, 把, 被, 连...都) get their own X_ one-off or are skipped.
- Words that cannot be used in a gap-fill module (written-style only, fragments, suffix/prefix-like items, near-duplicates of another row, rare loan words): set `skip` with the reason; prefer keeping a word if a natural everyday casual line is possible.
- The `phrase` rows go to X_PHRASE / X_ groups as appropriate.
- Work through the batch file with a script that checks: one row per id, allowed group names, `pos` present, no article in english_slot, verbs' english_slot a base form. Do not edit any other file.
