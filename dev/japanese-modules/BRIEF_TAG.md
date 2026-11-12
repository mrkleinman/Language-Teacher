# Brief: tag Japanese words for gap-fill exchange modules (casual speech)

Input: `japanese-word-base.csv` (id, word, romaji, meaning, belt, tier, entry_type, pos, conj, notes). Tag ONLY the rows named in your batch.
Output: a CSV `drafts/<BATCH>-tags.csv` with header
`id,word,group,subgroup,frame,english_slot,english_plural,counter,register_note,skip`

## What the tags are for
A module is a three-line exchange A(man) -> B(woman) -> A(man) written ONCE with the word as a slot, usable for EVERY word in the same group/subgroup.
So every word in a subgroup must fit the same three Japanese lines AND the same English lines. Group strictly: when two words would need different particles, a different verb frame, or different English, they belong to different subgroups.

## Groups (pick exactly one `group`; `subgroup` splits big groups so one set of lines works for all; format GROUP.NAME, e.g. N_PLACE.EAT)
Nouns: N_FOODSTUFF N_DISH N_DRINK N_PLACE N_PERSONROLE N_FAMILY N_BODY N_CLOTHES N_ITEM N_HOME N_DEVICE N_TRANSPORT N_WEATHER N_ANIMAL N_MONEY N_STUDYWORK N_MEDIA N_EVENT N_HEALTH N_TIMEUNIT (days, months, weeks, years as things) T_TIME (time words used as adverbs: 今日 明日 今 朝 ...) N_NUMBER (numbers, counted things) N_ABSTRACT N_OUTDOORS
Verbs (frame says the particle pattern): V_CONSUME V_MOVE V_HANDLE V_COMMUNICATE V_ROUTINE V_SOCIAL V_MIND V_CHANGE V_TRADE V_WANTLIKE
Adjectives (i-adjectives and na-adjectives): A_THING A_PERSONSTATE A_CONDITION A_TASTE A_CHARACTER A_COLOUR
Quirky one-offs (one small module family per word): X_FUNCTION (は, も, もう, まだ, ちょっと, ...) X_QUESTION (何 どこ 誰 いつ いくら どう) X_PRONOUN (これ それ ここ そこ) X_ADVERB X_PHRASE (fixed expressions: ありがとう, すみません, はい, ...) X_QUANTITY X_PROPER X_COUNTER
You may add a new group name only if nothing fits; say so in register_note.

## frame (verbs and adjectives; leave empty for nouns) - the particle frame the lines must use
Verbs: `obj` (X を V: 食べる, 見る), `goal` (X に/へ V: 行く, 来る, 帰る), `itr` (no object: 寝る, 起きる, 休む), `with` (X と V: 会う, 話す), `place` (X で V / X に V static: 住む), `obj+goal`, `say` (「…」と V / X と V: 言う, 思う), `exist` (ある, いる: X が ある/いる, X に ある), `special` (a word that needs its own lines).
Adjectives: `i` or `na` (copied from conj), plus `person` or `thing` in subgroup.
For nouns, `frame` is empty.

## english_slot / english_plural (very important - the same rules as the Thai set)
- `english_slot` is what fills `{E}` in English lines. Nouns: the bare noun ("coffee", "station", "ticket"); mass/uncountable and pair nouns keep the same form in english_plural.
- `english_plural` is the plural form for `{Es}` ("tickets"); empty means the same as english_slot.
- Verbs: the BASE FORM that fits after "to / can / will / let's / please / don't" ("eat", "go home").
- Adjectives: the bare adjective ("expensive", "delicious").
- Use ONE natural everyday English word or short phrase; never put "a/an" or "the" in the slot (the module supplies `{a}`).
- If the Japanese word has two meanings in the list (e.g. "okay / all right"), pick the one a beginner uses most and note the rest in register_note.
- `counter`: the typical counter for nouns that are counted (個, 人, 台, 枚, 冊, 本, 杯, 匹, 階, 回...), else empty.

## skip
Put a reason in `skip` (and still fill group = X_...) for words that cannot be used in a slot module: a speaker cannot say the other's word, written-style only words, banned/chat-only words, duplicates of another row (name the id), pure fragments.

## Rules of thumb
- Casual speech only (plain forms). The word is used in plain form: verbs by form slot, adjectives by form slot.
- Be conservative: if a word could go in two groups, choose the one where the three lines are most natural and say the other in register_note.
- Keep subgroup names short, upper case, one word (EAT, SHOP, HOME, WORK, MOVE, ...). Every subgroup should have at least 3 words unless the word is truly one-of-a-kind (then use X_ group).
- Do not change ids or words. One output row per input row.
