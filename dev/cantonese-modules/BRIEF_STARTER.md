# Brief: starter modules for the first 200 Cantonese words (beginner dialogues with a tiny vocabulary)

Read `BRIEF_WRITE.md` first and follow its rules for slots, English, prompts, A = man / B = woman, particles, Mandarin forms and the opening clash. This brief changes the job and the vocabulary.

## Why
The first 200 words are now taught in a hand-made order (`BEGINNER-ORDER.md`, `beginner-order.csv`: 40 days of 5 words). A learner on day 1 knows one word. A normal module uses the whole tier list, so it
contains words the learner has never been taught (the owner heard exactly that: a day-one track full of untaught words). The app will use a module for a word only when every fixed word of the module is a word the learner
has been taught, a word of today's targets, or a free word. 172 of the first 200 words have no such module. **You write the starter modules: short, believable beginner exchanges that use almost nothing but the words taught before the target.**

## Your files
- Assignment: `drafts/starter/SSnn.csv` (nn = 01..08), one line per (cell, tier):
  `cell, tier, modules (the MINIMUM to write), up_to (the most that can be needed), anchors, anchor_ids, serve, serve_ids, vocab, exclude_anchors_only, exclude_anchors_plus_serve`.
  - `anchors` = the target words that create the need, with `p<position> d<day>` and how many modules they already have: a module must fit the first anchor, and its vocabulary is the words taught BEFORE the first word it fits.
  - `serve` = later words of the same cell (tier at most the line's tier) that also have fewer than 3 usable modules. A module that reads naturally for them should fit them too (take their ids out of `exclude_ids`), because one module then counts for several words. Do NOT force it: a module that is wrong for one of its words is a bug.
  - `modules` is a floor (it assumes every module fits every later word). `up_to` is the ceiling (no module fits two words). Greetings, polite phrases, pronouns, function words (係 唔 嘅 好 有 冇 都 咗 ...) usually need more than the floor. **Keep writing until `yue_starter_cov.py` shows no LOW word, or report why a word cannot be done.**
- Output: `drafts/STARTER-SSnn-modules.csv` (UTF-8 with BOM) with the BRIEF_WRITE header
  `module_id,group,tier,belts,status,job,scene,exclude_ids,fits_words,cell_words,A1_yue,A1_english,A1_prompt,B_yue,B_english,B_prompt,A2_yue,A2_english,A2_prompt`
  (`group` = the cell, `status` = ready, `fits_words` and `cell_words` empty). `belts`: T1 `White;Orange`, T2 `Orange+Stripe;Blue;Blue+Stripe`, T3 `Yellow;Yellow+Stripe`.
- **Module id = `<CELL>-<tier>-S<nn>`**, e.g. `X_FUNCTION.BE-T1-S03`; nn runs 01, 02, 03 ... per cell and tier inside your file. The `-S<nn>` segment is what switches the checker to the starter rule.
- Example to read: `drafts/STARTER-SS00-sample-modules.csv` (four modules: 你好, 我, 係, 多謝). It is NOT merged into the module set; yours are (the merge picks up `drafts/STARTER-SS01..08-modules.csv`).
- Use your own scratchpad subfolder while working; touch no other repo file; do not commit.

## The allowed vocabulary (the heart of the job)
A starter module may use, in its fixed Cantonese text, ONLY:
1. the words at curriculum positions **strictly before the first position among the words the module fits** (position = the number in `beginner-order.csv`; day d teaches positions 5(d-1)+1 .. 5d; a word of the same day is NOT available unless its position is lower than the first fitted word's),
2. the **free words** (`free-words.csv`): names in characters (men 阿明 阿強 大衛 彼得; women 阿欣 阿芬 瑪麗 安娜), 哈囉, the loanwords 三文治 麥當勞 肯德基 星巴克, the interjections 哇 嘩 喂 嗯 哦 噢 哎 嘿 哈 and the sentence-final particles 呀 啊 啦 喇 囉 嘛 喎 啩 噃 咯 吖 啫. (`OK` is free in the app but it is Latin letters and the app rejects Latin letters in a line: do NOT use it.)
3. the module's own target word(s) in `{W}` (and `{M}`, its classifier, only when the classifier was taught by the target's position).
Nothing else: no word from the tier list that is taught later, no 再見 / 早晨 before their position (the opening and closing framing lines of a track are the app's business, not yours).
The checker covers each line with exactly this vocabulary; anything it cannot cover is rejected ("NOT ALLOWED before position N").

**See the exact list for your target before writing:**
```
python3 tools/yue_check.py starter-allowed WORD_ID [WORD_ID ...]        # a planned module: the words it fits (same cell); --tier T2 to ask for a higher tier
python3 tools/yue_check.py starter-allowed MODULE_ID                   # an existing starter module of a drafts/STARTER-*-modules.csv file
```
It prints the taught words (position, word, meaning), the free words, whether `{M}` is usable, and the `exclude_ids` string that makes the module fit exactly those words, plus the other words it could also fit.
Also useful: `python3 tools/yue_check.py words CELL` (the cell's words with tier, slot, classifier, notes) and the day sentences in `BEGINNER-ORDER.md` (`beginner-order.csv` column `unlocks`): they show real sentences from the same vocabulary.

## Which words a module fits (exclude_ids)
- `fits_words` stays empty; the fits come from the cell, the tier and `exclude_ids`: a module at tier k fits every word of its cell with tier <= k that is NOT in `exclude_ids`.
- A starter module must be explicit: put in `exclude_ids` every word of the cell (up to the tier) it does not fit, and ALWAYS every word of the cell beyond position 200 (the checker refuses a starter module that fits one). The `exclude_anchors_only` / `exclude_anchors_plus_serve` columns of your assignment give a starting string; `starter-allowed` gives it for any set of words.
- The module tier is at least the tier of every word it fits (a T2 word needs a module of tier T2 or higher; the assignment line gives the tier to use).
- Render with EVERY word the module fits: `python3 tools/yue_check.py render drafts/STARTER-SSnn-modules.csv MODULE_ID WORD_ID` and read it as a learner and as a native speaker.
- **A module that fits exactly one word may write its English and prompts literally, without `{E}`** ("I am Ah Ming.", "Are you Ah Yan?"): the slot English of a function word (be, not, want to, of) fits no real sentence. With two or more fitting words `{E}` / `{Es}` / `{a}` are required as in BRIEF_WRITE, so only fit several words when the English slot works in every line for all of them.

## What a good starter module is
- **A believable beginner conversation**, not a textbook sentence: greeting and being greeted, thanks, sorry and "never mind", who are you / are you Ah Yan, I'm a student, this is my friend, are you hungry, want some tea, how much is it, where is the toilet, I'm going home, I don't understand, say it again. Pick the scene the target word belongs to; the vocabulary will tell you what is possible.
- **Three lines A / B / A, the slot in every line**, a real mini-conversation: A opens (question, offer, remark), B answers or reacts, A answers or follows up. A is a man, B a woman (prompts: A's say "her", B's say "him"; no names, no "they", never "A" or "B").
- **Short and natural.** Lines of 2-5 words are right; nothing needs to be long. A line of 2 words and 3 characters is allowed (the starter minimum); the tier maximum (T1 5 words, T2 8) still holds. One idea per line. Repeating a pattern across the three lines (ask, answer, ask about something else) is good: it is how a day-one conversation really goes.
- **Names are your friends.** Use 阿明 / 阿強 / 大衛 / 彼得 for men and 阿欣 / 阿芬 / 瑪麗 / 安娜 for women, written in characters, to fill a line with something other than the target ("阿欣，你好！"). A names the woman he talks to, B names the man; never make a man call himself 阿欣. A name counts as a word of the line. Prompts never contain a name ("Say hello to her", not "Say hello to Ah Yan"); the English line may ("Ah Yan, hello!").
- **Hong Kong colloquial, no Mandarin forms** (唔 係 嘅 佢 冇 喺 ... as in BRIEF_WRITE), natural particles, no romance, no rude words. If a Mandarin-looking word is on the taught list it is there because Hong Kong says it.
- **Fixed expressions are USED, not talked about** (BRIEF_WRITE): 你好, 多謝, 對唔住, 再見 are said inside a small scene (A bumps into B and says sorry, B says never mind). No "「{W}」係乜嘢意思".
- English: plain, spoken, says exactly what the Cantonese says (a question stays a question, a negation a negation). A two-word Cantonese line gets a two-or-three-word English line ("Thanks, Ah Yan!"), not a paragraph.
- Vary scene, job and the opening of A1 across the modules of a cell and tier (the checker compares the first two characters, also against the existing modules: see below). `{W}` as the very first thing of A1 is used by many existing modules, so open with a name, an interjection (喂, 哦, 噢, 哈囉) or a taught word.

## When the rule cannot be satisfied
Some words really have no sentence from the words before them (the first few positions have almost no vocabulary: 你好 knows only free words, 我 only 你好, 你 only 你好 and 我; 想 at position 21 has no verb to lean on). Do the best natural thing the vocabulary allows (see the sample), keep the rule intact (no untaught word, ever), and **say in the report exactly which word, which line and what you did**. Never smuggle in an untaught word, a Latin letter or a Mandarin form to make a line nicer.

## Validate (run until clean)
```
python3 -I tools/yue_check.py drafts/STARTER-SSnn-modules.csv --quiet --against drafts/ALL-modules.csv      # must print "problems 0"
python3 tools/yue_starter_cov.py drafts/starter/SSnn.csv drafts/STARTER-SSnn-modules.csv                       # every word OK (3 or more usable modules)
```
`--against` makes the checker compare the openings of your A1 lines with the existing modules too (the rule that two modules of one cell and tier may not start with the same two characters). A line is cut into words by dynamic programming exactly as in BRIEF_WRITE, but against the starter vocabulary: `NOT ALLOWED before position N: X` names the uncovered stretch X.
`yue_starter_cov.py` counts, for each word of your batch, the existing modules that a learner who knows only the earlier words can use (they are counted as in `tools/yue_stage_fit.py`) plus your starter modules that fit the word and pass the checker; a word below 3 is LOW. A module with problems is listed and not counted.

## The batches (balanced by minimum number of modules; a cell is never split; ordered by the teaching position of each cell's first word)
| File | Minimum modules (up_to) | Cells | Words in the lines | First positions (days) | First anchor word of each line |
| --- | --- | --- | --- | --- | --- |
| SS01 | 39 (101) | 10 | 33 | 1-16 (1-4) | 你好 再見 聽日見 我 係 唔 多謝 朋友 學生 嘅 唔緊要 好 咁 |
| SS02 | 41 (101) | 13 | 36 | 17-34 (4-7) | 開心 忙 餓 想 食 水 茶 要 飯 魚 麵 呢個 乜嘢 好食 |
| SS03 | 39 (85) | 12 | 29 | 35-63 (7-13) | 係咪 得唔得 去 屋企 學校 邊度 喺 有 錢 一 個 百 幾多 |
| SS04 | 42 (69) | 13 | 23 | 64-85 (13-17) | 貴 平 大 多 人 少少 今日 而家 幾點 媽媽 哥哥 醫生 香港 公司 |
| SS05 | 40 (51) | 11 | 18 | 87-110 (18-22) | 洗手間 超市 茶餐廳 巴士 的士 搭 點樣 同 一起 慢慢 講 廣東話 英文 明白 |
| SS06 | 40 (49) | 13 | 17 | 111-130 (23-26) | 再 又 次 咩 叫 名字 邊個 歲 坐 買 等 問 搵 做 |
| SS07 | 38 (51) | 14 | 19 | 132-166 (27-34) | 返工 學 玩 瞓覺 星期 朝早 點鐘 蛋撻 肉 生果 杯 熱 鍾意 睇 |
| SS08 | 42 (60) | 15 | 25 | 168-199 (34-40) | 電話 手機 書 衫 新 靚 件 咗 已經 都 好似 點解 幾耐 左邊 快 慢 地鐵站 |
The plan has 321 modules as a floor (tier-aware: a T1 starter cannot fit a T2 word; the Stage A table in `BEGINNER-ORDER.md` counted 286 without that rule), up to 567 if no module can serve two words. The early files (SS01, SS02) are the hardest (the smallest vocabulary) and probably need the most beyond the floor.

## Report (short)
Per assignment line: modules written (floor / written), the exclusions you used, final coverage of every word (from `yue_starter_cov.py`), words you could not support and why (word, position, what the vocabulary allowed), lines you are unsure about (not quite natural for a native speaker), slot / tag problems you noticed (word id + issue), any new checker quirk.
