# Mandarin word list changes, 13 Nov 2026 (one standard for both mainland China and Taiwan)

Owner decision: the Mandarin course uses Simplified characters and word forms recognised in both mainland China and Taiwan. Ids, tiers, belts, groups and tags are unchanged; only the `word` column (and `pinyin` where it differs) was edited, identically in `mandarin-word-tags.csv` and `mandarin-word-base.csv`. Meaning, register_note and skip columns were deliberately left as they were (some now carry stale remarks such as `(Taiwan)` or `traditional form of ...`; see the follow-up note at the end).

## Counts

- Words changed: **33** (every `word` was checked, incl. the 23 phrases and all skipped words).
- Of these, 22 have modules (the rest are skipped words that no module targets).
- Pinyin changed: 23.
- Collisions left alone: **20 pairs** (see below).
- Module text edited: 2 modules in `drafts/W37-modules.csv`.

## Changes

| id | old word | new word | pinyin old | pinyin new | reason |
|---|---|---|---|---|---|
| 802 | 土豆 | 马铃薯 | tǔdòu | mǎlíngshǔ | 土豆 means peanut in Taiwan; 马铃薯 is understood on both sides |
| 1772 | 着名 | 著名 | zhùmíng | zhùmíng | mixed/variant spelling; Simplified standard is 著名 |
| 1789 | 想像 | 想象 | xiǎngxiàng | xiǎngxiàng | Taiwan variant; mainland 想象 |
| 2050 | 彷彿 | 仿佛 | fǎngfú | fǎngfú | Traditional characters |
| 2100 | 萤幕 | 屏幕 | yíngmù | píngmù | Taiwan-only term; mainland 屏幕 |
| 2432 | 软体 | 软件 | ruǎntǐ | ruǎnjiàn | Taiwan-only term |
| 2477 | 报导 | 报道 | bàodǎo | bàodào | Taiwan form; mainland 报道 |
| 2496 | 公尺 | 米 | gōngchǐ | mǐ | Taiwan term; mainland 米 |
| 2608 | 硬体 | 硬件 | yìngtǐ | yìngjiàn | Taiwan-only term |
| 2612 | 市府 | 市政府 | shìfǔ | shìzhèngfǔ | Taiwan abbreviation; mainland 市政府 |
| 2613 | 谘询 | 咨询 | zīxún | zīxún | Traditional/variant char 谘 |
| 2706 | 幼稚园 | 幼儿园 | yòuzhìyuán | yòu'éryuán | Taiwan form; mainland 幼儿园 |
| 2787 | 华航 | 中华航空 | huáháng | zhōnghuá hángkōng | Taiwan abbreviation; spelled out |
| 2797 | 蒐集 | 搜集 | sōují | sōují | Traditional/Taiwan variant char 蒐 |
| 2800 | 师大 | 师范大学 | shīdà | shīfàn dàxué | Taiwan abbreviation; spelled out |
| 2810 | 古蹟 | 古迹 | gǔjì | gǔjì | Traditional character 蹟 |
| 2829 | 印表机 | 打印机 | yìnbiǎojī | dǎyìnjī | Taiwan-only term |
| 2875 | 国中 | 初中 | guózhōng | chūzhōng | Taiwan-only term; mainland 初中 |
| 2889 | 资料库 | 数据库 | zīliàokù | shùjùkù | Taiwan-only term |
| 2898 | 政大 | 政治大学 | zhèngdà | zhèngzhì dàxué | Taiwan abbreviation; spelled out |
| 2905 | 行销 | 营销 | xíngxiāo | yíngxiāo | Taiwan form; mainland 营销 |
| 2918 | 立委 | 立法委员 | lìwěi | lìfǎ wěiyuán | Taiwan abbreviation; spelled out |
| 2932 | 藉由 | 借由 | jièyóu | jièyóu | Traditional/variant char 藉 |
| 2933 | 县府 | 县政府 | xiànfǔ | xiànzhèngfǔ | Taiwan abbreviation; mainland 县政府 |
| 2937 | 光碟 | 光盘 | guāngdié | guāngpán | Taiwan form; mainland 光盘 |
| 2939 | 中研院 | 中央研究院 | zhōngyányuàn | zhōngyāng yánjiūyuàn | Taiwan abbreviation; spelled out |
| 2948 | 奥会 | 奥委会 | Àohuì | Àowěihuì | Taiwan abbreviation; mainland 奥委会 |
| 2949 | 委讬 | 委托 | wěituō | wěituō | variant/Traditional char 讬 |
| 2954 | 呼籲 | 呼吁 | hūyù | hūyù | Traditional character 籲 |
| 2956 | 安非他命 | 安非他明 | ānfēitāmìng | ānfēitāmíng | Taiwan form; mainland 安非他明 |
| 2961 | 订定 | 制定 | dìngdìng | zhìdìng | Taiwan usage; mainland 制定 |
| 2969 | 藉着 | 借着 | jièzhe | jièzhe | Traditional/variant char 藉 |
| 2971 | 辅大 | 辅仁大学 | Fǔdà | Fǔrén Dàxué | Taiwan abbreviation; spelled out |

## Collisions (replacement already exists as another entry: NOT merged, both left as they are)

| id | word kept as is | would become | existing id |
|---|---|---|---|
| 863 | 旅遊 | 旅游 | 435 |
| 892 | 週 | 周 | 3030 |
| 686 | 部份 | 部分 | 677 |
| 2008 | 大部份 | 大部分 | 918 |
| 1143 | 计程车 | 出租车 | 234 |
| 1339 | 网路 | 网络 | 1205 |
| 1380 | 计画 | 计划 | 333 |
| 1800 | 作法 | 做法 | 1932 |
| 1656 | 做为 | 作为 | 1471 |
| 2001 | 机车 | 摩托车 | 813 |
| 2076 | 捷运 | 地铁 | 231 |
| 2431 | 妳 | 你 | 4 |
| 2902 | 牠们 | 它们 | 864 |
| 2491 | 程式 | 程序 | 1957 |
| 2865 | 国小 | 小学 | 927 |
| 2899 | 型态 | 形态 | 2753 |
| 2930 | 份子 | 分子 | 2842 |
| 2901 | 专案 | 项目 | 1622 |
| 2960 | 北市 | 台北市 | 2489 |
| 2582 | 网际 | 互联网 | 3092 |

Every one of these is still Traditional or Taiwan-only text in the list; most are already skipped as duplicates. The parent can decide whether to delete the duplicate rows. Pre-existing and not touched: 898 游戏 and 3217 游戏 are the same text.

## Left alone because both sides use them (or recognise them)

百货公司 (and 百货), 新台币, 台币, 台大, 台北, 华语, 国语 (historic term on the mainland, still understood), 资讯, 讯息, 透过, 愈来愈 / 愈, 义工, 功课, 晓得, 澳洲, 熊猫, 青菜, 档案, 公分, 公顷, 纪录, 业者, 原住民, 拜拜, 饭店, 姥姥, 大专, 联络, 视讯, 营运, 储存, 考量, 医师, 现况, 推展, 检讨, 保育, 连线, 其它, 西红柿, 空调, 快递, 短信, 立法院, 行政院, 教育部, 经济部, 国民党, 民进党, 中华民国, 台北市, 高雄, 新竹, 台中, 清华, 台湾, 台, 县市, 国立, 市立, and the single characters 着 (standard Simplified), 警, 素, 欸.

## Method / verification

- Traditional or mixed characters: every word was tested for characters outside GB2312 plus a hand list of Traditional forms; results: 旅遊 週 彷彿 妳 蒐集 古蹟 牠们 委讬 呼籲 (and 欸, which is a valid Simplified character: kept).
- Taiwan-only words: found by reading the whole list and the existing Taiwan/variant notes.
- After the change `tools/zh_merge_modules.py` then `tools/zh_check.py drafts/ALL-modules.csv --quiet`: only 土豆 in two W37 modules failed (fixed text), plus one unrelated-looking effect in `TOPUP-TU02` (see below).
- Module text edited (W37): `V_HANDLE.KITCHEN-T3-02`, `V_HANDLE.KITCHEN-T4-03`, fixed noun 土豆 -> 马铃薯 in A1 and B lines. No other module used an old form as fixed text.
- Modules re-rendered with the new slot word (3 to 6 per word, all when few) for all 22 words that have modules: read naturally, no collocation broke.

## Follow-ups for the parent

- `drafts/TOPUP-TU02-modules.csv` (other agent, not touched): `A_THING.ABSTRACT-T5-U01` A1 line `你觉得这篇报道写得{W}吗？` now counts 7 units (range 8-14) because 报道 (was 报导, id 2477) is now a list word. Lengthen that line, then re-run the checker.
- `drafts/ALL-modules.csv` was regenerated locally by the merge script (it now includes the uncommitted TU02 file) and is not committed; re-merge after TU02 is finished.
- Stale remarks in untouched columns: meaning `(Taiwan)` on 屏幕 (2100) and 米 (2496) and 初中 (2875), register_note on 1772, 2050, 2432 etc. say 'traditional form'/'Taiwan form'. Not changed per the rules.
