# Mandarin word list changes, 12 Nov 2026

Owner approval: "add and edit as needed". Ids of existing words never change (saved progress is keyed by id). New words take ids 3001–3268; phrase ids 9001+ are untouched.

## Counts

- Added: **268 words** (9 at T1, 32 at T2, 66 at T3, 161 at T4).
- Retiered: **9 existing words** (ids unchanged).
- New subgroups (cells): **31**.
- Checker: `一下` is now a free word (see below).

## How the curriculum position works for added / retiered words

Each added or retiered word has an `after_id` (new last column in `mandarin-word-base.csv` and `mandarin-word-tags.csv`). It is the id of the existing word the new word should follow in the curriculum, and its belt is that word's belt (T1 White = after id 100, T1 Orange = after 200, T2 = after 400 / 600 / 800, T3 = after 1000 / 1200, T4 = after 1525 / 1850). The app builder `dev/tools/build_ja_zh_banks.py` currently takes the unlock position and belt from the id (`belt_for(cid)` and an assertion), so it must be changed to sort by `(after_id or id, id)` and to take the belt from the anchor before these words are embedded. Nothing else in the repository reads `after_id`.

## Tier changes (existing words, ids unchanged)

| id | word | before | after |
|---|---|---|---|
| 2859 | 他 | T5 · Beyond curriculum | T1 · White |
| 2860 | 她 | T5 · Beyond curriculum | T1 · White |
| 2861 | 它 | T5 · Beyond curriculum | T1 · White |
| 1330 | 本 | T4 · Green | T2 · Blue |
| 1498 | 女 | T4 · Green | T2 · Blue |
| 1061 | 饭店 | T3 · Yellow + Stripe | T2 · Blue |
| 1097 | 商店 | T3 · Yellow + Stripe | T2 · Blue |
| 1213 | 生病 | T4 · Green | T3 · Yellow |
| 1235 | 跳舞 | T4 · Green | T3 · Yellow |

Not retiered on purpose: 手表 (T5) and 号码 (T4), HSK2 words, because moving them down would make unchecked lower-tier modules of their cells fit them (N_CLOTHES.WEAR T3/T4, N_ABSTRACT.INFO).

## New subgroups

`A_CONDITION.ADDED`, `A_CONDITION.WEATHER`, `A_PERSONSTATE.ADDED`, `A_TASTE.ADDED`, `A_THING.ADDED`, `N_ABSTRACT.ADDED`, `N_BODY.ADDED`, `N_CLOTHES.ADDED`, `N_FOODSTUFF.ADDED`, `N_ITEM.ADDED`, `N_NUMBER.ORDER`, `N_PERSONROLE.ADDED`, `N_PLACE.ADDED`, `N_STUDYWORK.TOOL`, `N_TIMEUNIT.ADDED`, `N_TRANSPORT.ADDED`, `T_TIME.ADDED`, `V_CHANGE.ADDED`, `V_COMMUNICATE.ADDED`, `V_HANDLE.ADDED`, `V_MIND.ADDED`, `V_MOVE.ADDED`, `V_ROUTINE.ADDED`, `V_TRADE.ADDED`, `X_ADVERB.ADDED`, `X_FUNCTION.ADDED`, `X_FUNCTION.COPULA`, `X_MEASURE.ADDED`, `X_PHRASE.ADDED`, `X_QUANTITY.ADDED`, `X_QUESTION.ADDED`

Words were put in an existing cell only when they are plainly the same kind of thing (fruit, furniture, tableware, clothes, colours, drinks, snacks, a bus, an animal). Every such cell was re-checked with `zh_check.py` (a measure-word check caught 服装, 水果 and 牛奶, which were moved to new subgroups).

## Existing cells whose modules now fit new words (153 modules in 8 cells)

- `A_COLOUR.COLOUR`: 20 modules now also fit 绿, 蓝
- `N_ANIMAL.WILD`: 16 modules now also fit 老虎
- `N_CLOTHES.WEAR`: 24 modules now also fit 皮鞋, 衬衫
- `N_DISH.SNACK`: 21 modules now also fit 巧克力, 饼干
- `N_DRINK.GENERAL`: 20 modules now also fit 葡萄酒
- `N_FOODSTUFF.FRUIT`: 22 modules now also fit 苹果, 葡萄, 香蕉
- `N_HOME.FURNITURE`: 20 modules now also fit 桌子, 椅子, 沙发
- `N_ITEM.TABLEWARE`: 10 modules now also fit 杯子

These pairings were not read by the module writers; the blind-read pass should render them (`zh_check.py render`).

## Checker change (`tools/zh_check.py`)

`一下` is in the checker's FREE list but the segmenter preferred 一 + 下 (two content units) on a tie. A multi-character free word now beats its characters, so `一下` counts as zero content units. Effect on the 18 finished batches: 12 lines in 11 modules fall one unit below the minimum length (they were padded by the two units); and adding the word 最近 (one word instead of 最 + 近) shortens 10 more lines by one unit. The 22 lines are listed in `drafts/write/RECHECK-units.csv` and need one more content word each. No other check result changed (all other problems: 0).

## Assignment files for the new words

`drafts/write/ZT01.csv`–`ZT04.csv`: 61 (cell, tier) lines, 434 modules, in the same format as `W*.csv`. Only (cell, tier) pairs that the original plan did not contain are listed; pairs that are in the plan but not yet written will pick the new words up automatically (writers read the live tags), and a final thin-word top-up (words with fewer than 3 fitting modules) follows, as for Japanese.

## Added words

| id | word | pinyin | meaning | tier | belt | cell | after_id |
|---|---|---|---|---|---|---|---|
| 3001 | 是 | shì | to be (copula) | T1 | White | X_FUNCTION.COPULA | 100 |
| 3002 | 我们 | wǒmen | we; us | T1 | White | X_PRONOUN.PLURAL | 100 |
| 3003 | 杯子 | bēizi | cup; glass | T2 | Orange + Stripe | N_ITEM.TABLEWARE | 400 |
| 3004 | 苹果 | píngguǒ | apple | T1 | Orange | N_FOODSTUFF.FRUIT | 200 |
| 3005 | 水果 | shuǐguǒ | fruit | T1 | Orange | N_FOODSTUFF.ADDED | 200 |
| 3006 | 牛奶 | niúnǎi | milk | T2 | Orange + Stripe | N_FOODSTUFF.ADDED | 400 |
| 3007 | 香蕉 | xiāngjiāo | banana | T3 | Yellow | N_FOODSTUFF.FRUIT | 1000 |
| 3008 | 葡萄 | pútao | grape | T4 | Green | N_FOODSTUFF.FRUIT | 1525 |
| 3009 | 桌子 | zhuōzi | table; desk | T2 | Orange + Stripe | N_HOME.FURNITURE | 400 |
| 3010 | 椅子 | yǐzi | chair | T2 | Orange + Stripe | N_HOME.FURNITURE | 400 |
| 3011 | 沙发 | shāfā | sofa | T4 | Green | N_HOME.FURNITURE | 1525 |
| 3012 | 汉语 | Hànyǔ | Chinese (language) | T1 | Orange | N_STUDYWORK.LANGUAGE | 200 |
| 3013 | 公共汽车 | gōnggòng qìchē | bus | T2 | Blue | N_TRANSPORT.PUBLIC | 600 |
| 3014 | 雪 | xuě | snow | T2 | Blue | N_WEATHER.GENERAL | 600 |
| 3015 | 晴 | qíng | clear; sunny | T2 | Blue | A_CONDITION.WEATHER | 600 |
| 3016 | 阴 | yīn | overcast; cloudy | T2 | Blue | A_CONDITION.WEATHER | 600 |
| 3017 | 去年 | qùnián | last year | T2 | Orange + Stripe | T_TIME.ADDED | 400 |
| 3018 | 今年 | jīnnián | this year | T2 | Orange + Stripe | T_TIME.ADDED | 400 |
| 3019 | 明年 | míngnián | next year | T2 | Orange + Stripe | T_TIME.ADDED | 400 |
| 3020 | 最近 | zuìjìn | recently; lately | T3 | Yellow + Stripe | T_TIME.ADDED | 1200 |
| 3021 | 后来 | hòulái | afterwards; later (past) | T3 | Yellow + Stripe | T_TIME.ADDED | 1200 |
| 3022 | 最后 | zuìhòu | finally; last | T3 | Yellow + Stripe | T_TIME.ADDED | 1200 |
| 3023 | 第一 | dì-yī | first | T2 | Orange + Stripe | N_NUMBER.ORDER | 400 |
| 3024 | 生日 | shēngrì | birthday | T2 | Orange + Stripe | N_TIMEUNIT.ADDED | 400 |
| 3025 | 春 | chūn | spring | T3 | Yellow | N_TIMEUNIT.ADDED | 1000 |
| 3026 | 夏 | xià | summer | T3 | Yellow | N_TIMEUNIT.ADDED | 1000 |
| 3027 | 秋 | qiū | autumn | T3 | Yellow | N_TIMEUNIT.ADDED | 1000 |
| 3028 | 冬 | dōng | winter | T3 | Yellow | N_TIMEUNIT.ADDED | 1000 |
| 3029 | 季节 | jìjié | season | T3 | Yellow + Stripe | N_TIMEUNIT.ADDED | 1200 |
| 3030 | 周 | zhōu | week | T2 | Blue | N_TIMEUNIT.ADDED | 600 |
| 3031 | 铅笔 | qiānbǐ | pencil | T2 | Blue | N_STUDYWORK.TOOL | 600 |
| 3032 | 笔记本 | bǐjìběn | notebook | T3 | Yellow | N_STUDYWORK.TOOL | 1000 |
| 3033 | 黑板 | hēibǎn | blackboard | T3 | Yellow | N_STUDYWORK.TOOL | 1000 |
| 3034 | 题 | tí | question; problem (exam) | T2 | Blue | N_STUDYWORK.TOOL | 600 |
| 3035 | 班 | bān | class (group of students) | T3 | Yellow | N_STUDYWORK.TOOL | 1000 |
| 3036 | 年级 | niánjí | school year; grade | T3 | Yellow + Stripe | N_STUDYWORK.TOOL | 1200 |
| 3037 | 词语 | cíyǔ | word; expression | T3 | Yellow + Stripe | N_STUDYWORK.TOOL | 1200 |
| 3038 | 服务员 | fúwùyuán | waiter; attendant | T2 | Orange + Stripe | N_PERSONROLE.ADDED | 400 |
| 3039 | 售货员 | shòuhuòyuán | shop assistant | T4 | Green | N_PERSONROLE.ADDED | 1525 |
| 3040 | 导游 | dǎoyóu | tour guide | T4 | Green | N_PERSONROLE.ADDED | 1525 |
| 3041 | 演员 | yǎnyuán | actor; performer | T4 | Green | N_PERSONROLE.ADDED | 1525 |
| 3042 | 大夫 | dàifu | doctor | T4 | Green | N_PERSONROLE.ADDED | 1525 |
| 3043 | 服装 | fúzhuāng | clothing | T3 | Yellow + Stripe | N_CLOTHES.ADDED | 1200 |
| 3044 | 衬衫 | chènshān | shirt | T3 | Yellow | N_CLOTHES.WEAR | 1000 |
| 3045 | 皮鞋 | píxié | leather shoes | T3 | Yellow | N_CLOTHES.WEAR | 1000 |
| 3046 | 鼻子 | bízi | nose | T3 | Yellow | N_BODY.ADDED | 1000 |
| 3047 | 胳膊 | gēbo | arm | T4 | Green | N_BODY.ADDED | 1525 |
| 3048 | 汗 | hàn | sweat | T4 | Green | N_BODY.ADDED | 1525 |
| 3049 | 灯 | dēng | lamp; light | T3 | Yellow | N_ITEM.ADDED | 1000 |
| 3050 | 盒子 | hézi | box | T4 | Green | N_ITEM.ADDED | 1525 |
| 3051 | 刀 | dāo | knife | T4 | Green | N_ITEM.ADDED | 1525 |
| 3052 | 镜子 | jìngzi | mirror | T4 | Green | N_ITEM.ADDED | 1525 |
| 3053 | 毛巾 | máojīn | towel | T4 | Green | N_ITEM.ADDED | 1525 |
| 3054 | 牙膏 | yágāo | toothpaste | T4 | Green | N_ITEM.ADDED | 1525 |
| 3055 | 信封 | xìnfēng | envelope | T4 | Green | N_ITEM.ADDED | 1525 |
| 3056 | 塑料袋 | sùliàodài | plastic bag | T4 | Green | N_ITEM.ADDED | 1525 |
| 3057 | 垃圾桶 | lājītǒng | rubbish bin | T4 | Green | N_ITEM.ADDED | 1525 |
| 3058 | 项链 | xiàngliàn | necklace | T4 | Green | N_ITEM.ADDED | 1525 |
| 3059 | 信用卡 | xìnyòngkǎ | credit card | T3 | Yellow + Stripe | N_ITEM.ADDED | 1200 |
| 3060 | 行李箱 | xínglǐxiāng | suitcase | T3 | Yellow + Stripe | N_ITEM.ADDED | 1200 |
| 3061 | 照相机 | zhàoxiàngjī | camera | T3 | Yellow + Stripe | N_ITEM.ADDED | 1200 |
| 3062 | 巧克力 | qiǎokèlì | chocolate | T4 | Green | N_DISH.SNACK | 1525 |
| 3063 | 饼干 | bǐnggān | biscuit; cracker | T4 | Green | N_DISH.SNACK | 1525 |
| 3064 | 葡萄酒 | pútaojiǔ | wine | T4 | Green | N_DRINK.GENERAL | 1525 |
| 3065 | 城市 | chéngshì | city | T3 | Yellow | N_PLACE.ADDED | 1000 |
| 3066 | 街道 | jiēdào | street | T3 | Yellow + Stripe | N_PLACE.ADDED | 1200 |
| 3067 | 花园 | huāyuán | garden | T3 | Yellow | N_PLACE.ADDED | 1000 |
| 3068 | 院子 | yuànzi | yard; courtyard | T4 | Green | N_PLACE.ADDED | 1525 |
| 3069 | 客厅 | kètīng | living room | T4 | Green | N_PLACE.ADDED | 1525 |
| 3070 | 卫生间 | wèishēngjiān | bathroom; toilet | T4 | Green | N_PLACE.ADDED | 1525 |
| 3071 | 加油站 | jiāyóuzhàn | petrol station | T4 | Green | N_PLACE.ADDED | 1525 |
| 3072 | 大使馆 | dàshǐguǎn | embassy | T4 | Green | N_PLACE.ADDED | 1525 |
| 3073 | 郊区 | jiāoqū | suburbs | T4 | Green | N_PLACE.ADDED | 1525 |
| 3074 | 首都 | shǒudū | capital city | T4 | Green | N_PLACE.ADDED | 1525 |
| 3075 | 入口 | rùkǒu | entrance | T4 | Green | N_PLACE.ADDED | 1525 |
| 3076 | 北方 | běifāng | the north | T3 | Yellow | N_PLACE.ADDED | 1000 |
| 3077 | 景色 | jǐngsè | scenery | T4 | Green | N_PLACE.ADDED | 1525 |
| 3078 | 爱好 | àihào | hobby | T3 | Yellow + Stripe | N_ABSTRACT.ADDED | 1200 |
| 3079 | 主意 | zhǔyi | idea; plan | T4 | Green | N_ABSTRACT.ADDED | 1525 |
| 3080 | 质量 | zhìliàng | quality | T4 | Green | N_ABSTRACT.ADDED | 1525 |
| 3081 | 特点 | tèdiǎn | feature; characteristic | T4 | Green | N_ABSTRACT.ADDED | 1525 |
| 3082 | 愿望 | yuànwàng | wish | T4 | Green | N_ABSTRACT.ADDED | 1525 |
| 3083 | 友谊 | yǒuyì | friendship | T4 | Green | N_ABSTRACT.ADDED | 1525 |
| 3084 | 力气 | lìqi | strength | T4 | Green | N_ABSTRACT.ADDED | 1525 |
| 3085 | 脾气 | píqi | temper | T4 | Green | N_ABSTRACT.ADDED | 1525 |
| 3086 | 信息 | xìnxī | information; message | T4 | Green | N_ABSTRACT.ADDED | 1525 |
| 3087 | 日记 | rìjì | diary | T4 | Green | N_ABSTRACT.ADDED | 1525 |
| 3088 | 笑话 | xiàohua | joke | T4 | Green | N_ABSTRACT.ADDED | 1525 |
| 3089 | 温度 | wēndù | temperature | T4 | Green | N_ABSTRACT.ADDED | 1525 |
| 3090 | 短信 | duǎnxìn | text message | T4 | Green | N_ABSTRACT.ADDED | 1525 |
| 3091 | 网站 | wǎngzhàn | website | T4 | Green | N_ABSTRACT.ADDED | 1525 |
| 3092 | 互联网 | hùliánwǎng | the internet | T4 | Green | N_ABSTRACT.ADDED | 1525 |
| 3093 | 聚会 | jùhuì | get-together; party | T4 | Green | N_ABSTRACT.ADDED | 1525 |
| 3094 | 展览 | zhǎnlǎn | exhibition | T4 | Green | N_ABSTRACT.ADDED | 1525 |
| 3095 | 穿 | chuān | to wear; to put on | T2 | Blue | V_ROUTINE.ADDED | 600 |
| 3096 | 起床 | qǐchuáng | to get up (out of bed) | T2 | Blue | V_ROUTINE.ADDED | 600 |
| 3097 | 跑步 | pǎobù | to run; to jog | T2 | Blue | V_ROUTINE.ADDED | 600 |
| 3098 | 刷牙 | shuāyá | to brush one's teeth | T3 | Yellow | V_ROUTINE.ADDED | 1000 |
| 3099 | 锻炼 | duànliàn | to exercise; to work out | T3 | Yellow | V_ROUTINE.ADDED | 1000 |
| 3100 | 练 | liàn | to practise | T3 | Yellow + Stripe | V_ROUTINE.ADDED | 1200 |
| 3101 | 踢 | tī | to kick; to play (football) | T3 | Yellow + Stripe | V_ROUTINE.ADDED | 1200 |
| 3102 | 复习 | fùxí | to review (study) | T3 | Yellow | V_ROUTINE.ADDED | 1000 |
| 3103 | 减肥 | jiǎnféi | to lose weight | T4 | Green | V_ROUTINE.ADDED | 1525 |
| 3104 | 理发 | lǐfà | to get a haircut | T4 | Green | V_ROUTINE.ADDED | 1525 |
| 3105 | 出差 | chūchāi | to go on a business trip | T4 | Green | V_ROUTINE.ADDED | 1525 |
| 3106 | 迟到 | chídào | to be late (arrive late) | T3 | Yellow | V_ROUTINE.ADDED | 1000 |
| 3107 | 醒 | xǐng | to wake up; to be awake | T4 | Green | V_ROUTINE.ADDED | 1525 |
| 3108 | 躺 | tǎng | to lie (down) | T4 | Green | V_ROUTINE.ADDED | 1525 |
| 3109 | 完 | wán | to finish; to be done | T2 | Blue | V_CHANGE.ADDED | 600 |
| 3110 | 关 | guān | to close; to turn off | T2 | Blue | V_CHANGE.ADDED | 600 |
| 3111 | 关掉 | guāndiào | to turn off; to shut down | T3 | Yellow | V_CHANGE.ADDED | 1000 |
| 3112 | 搬 | bān | to move (things); to move house | T3 | Yellow | V_HANDLE.ADDED | 1000 |
| 3113 | 擦 | cā | to wipe; to rub | T4 | Green | V_HANDLE.ADDED | 1525 |
| 3114 | 掉 | diào | to drop; to fall off | T4 | Green | V_HANDLE.ADDED | 1525 |
| 3115 | 丢 | diū | to lose; to throw away | T4 | Green | V_HANDLE.ADDED | 1525 |
| 3116 | 寄 | jì | to send; to post | T4 | Green | V_HANDLE.ADDED | 1525 |
| 3117 | 租 | zū | to rent | T4 | Green | V_HANDLE.ADDED | 1525 |
| 3118 | 推 | tuī | to push | T4 | Green | V_HANDLE.ADDED | 1525 |
| 3119 | 敲 | qiāo | to knock; to tap | T4 | Green | V_HANDLE.ADDED | 1525 |
| 3120 | 偷 | tōu | to steal | T4 | Green | V_HANDLE.ADDED | 1525 |
| 3121 | 修理 | xiūlǐ | to repair | T4 | Green | V_HANDLE.ADDED | 1525 |
| 3122 | 收拾 | shōushi | to tidy up; to pack | T4 | Green | V_HANDLE.ADDED | 1525 |
| 3123 | 打印 | dǎyìn | to print | T4 | Green | V_HANDLE.ADDED | 1525 |
| 3124 | 复印 | fùyìn | to photocopy | T4 | Green | V_HANDLE.ADDED | 1525 |
| 3125 | 翻译 | fānyì | to translate | T4 | Green | V_HANDLE.ADDED | 1525 |
| 3126 | 晒 | shài | to dry in the sun; to sunbathe | T3 | Yellow + Stripe | V_HANDLE.ADDED | 1200 |
| 3127 | 泡 | pào | to soak; to steep | T3 | Yellow + Stripe | V_HANDLE.ADDED | 1200 |
| 3128 | 挑 | tiāo | to choose; to pick | T3 | Yellow + Stripe | V_HANDLE.ADDED | 1200 |
| 3129 | 尝 | cháng | to taste; to try (food) | T3 | Yellow + Stripe | V_HANDLE.ADDED | 1200 |
| 3130 | 付 | fù | to pay | T3 | Yellow + Stripe | V_TRADE.ADDED | 1200 |
| 3131 | 付款 | fùkuǎn | to pay (a bill) | T4 | Green | V_TRADE.ADDED | 1525 |
| 3132 | 存 | cún | to save; to deposit | T4 | Green | V_TRADE.ADDED | 1525 |
| 3133 | 预约 | yùyuē | to book; to make an appointment | T3 | Yellow + Stripe | V_TRADE.ADDED | 1200 |
| 3134 | 聊 | liáo | to chat | T2 | Blue | V_COMMUNICATE.ADDED | 600 |
| 3135 | 聊天 | liáotiān | to chat | T2 | Blue | V_COMMUNICATE.ADDED | 600 |
| 3136 | 通知 | tōngzhī | to notify | T4 | Green | V_COMMUNICATE.ADDED | 1525 |
| 3137 | 道歉 | dàoqiàn | to apologise | T4 | Green | V_COMMUNICATE.ADDED | 1525 |
| 3138 | 夸 | kuā | to praise | T4 | Green | V_COMMUNICATE.ADDED | 1525 |
| 3139 | 骗 | piàn | to deceive; to cheat | T4 | Green | V_COMMUNICATE.ADDED | 1525 |
| 3140 | 商量 | shāngliang | to discuss; to talk over | T4 | Green | V_COMMUNICATE.ADDED | 1525 |
| 3141 | 联系 | liánxì | to contact | T4 | Green | V_COMMUNICATE.ADDED | 1525 |
| 3142 | 开玩笑 | kāi wánxiào | to joke | T4 | Green | V_COMMUNICATE.ADDED | 1525 |
| 3143 | 打扰 | dǎrǎo | to disturb | T4 | Green | V_COMMUNICATE.ADDED | 1525 |
| 3144 | 猜 | cāi | to guess | T4 | Green | V_MIND.ADDED | 1525 |
| 3145 | 后悔 | hòuhuǐ | to regret | T4 | Green | V_MIND.ADDED | 1525 |
| 3146 | 想念 | xiǎngniàn | to miss (someone) | T4 | Green | V_MIND.ADDED | 1525 |
| 3147 | 讨厌 | tǎoyàn | to dislike; to hate | T4 | Green | V_MIND.ADDED | 1525 |
| 3148 | 羡慕 | xiànmù | to envy | T4 | Green | V_MIND.ADDED | 1525 |
| 3149 | 原谅 | yuánliàng | to forgive | T4 | Green | V_MIND.ADDED | 1525 |
| 3150 | 允许 | yǔnxǔ | to allow | T4 | Green | V_MIND.ADDED | 1525 |
| 3151 | 逛 | guàng | to stroll; to browse | T3 | Yellow + Stripe | V_MOVE.ADDED | 1200 |
| 3152 | 降落 | jiàngluò | to land | T4 | Green | V_MOVE.ADDED | 1525 |
| 3153 | 软 | ruǎn | soft | T3 | Yellow + Stripe | A_THING.ADDED | 1200 |
| 3154 | 硬 | yìng | hard; stiff | T3 | Yellow + Stripe | A_THING.ADDED | 1200 |
| 3155 | 新鲜 | xīnxiān | fresh | T3 | Yellow | A_THING.ADDED | 1000 |
| 3156 | 厚 | hòu | thick | T4 | Green | A_THING.ADDED | 1525 |
| 3157 | 合适 | héshì | suitable; fitting | T4 | Green | A_THING.ADDED | 1525 |
| 3158 | 准确 | zhǔnquè | accurate | T4 | Green | A_THING.ADDED | 1525 |
| 3159 | 精彩 | jīngcǎi | brilliant; wonderful | T4 | Green | A_THING.ADDED | 1525 |
| 3160 | 糟糕 | zāogāo | terrible; bad (situation) | T4 | Green | A_THING.ADDED | 1525 |
| 3161 | 凉快 | liángkuai | pleasantly cool | T4 | Green | A_CONDITION.ADDED | 1525 |
| 3162 | 暖和 | nuǎnhuo | warm; nice and warm | T4 | Green | A_CONDITION.ADDED | 1525 |
| 3163 | 烫 | tàng | scalding hot | T3 | Yellow + Stripe | A_CONDITION.ADDED | 1200 |
| 3164 | 冰 | bīng | icy; iced | T3 | Yellow + Stripe | A_CONDITION.ADDED | 1200 |
| 3165 | 香 | xiāng | fragrant; tasty (smelling good) | T3 | Yellow + Stripe | A_TASTE.ADDED | 1200 |
| 3166 | 矮 | ǎi | short (height) | T3 | Yellow | A_PERSONSTATE.ADDED | 1000 |
| 3167 | 胖 | pàng | fat; plump | T3 | Yellow | A_PERSONSTATE.ADDED | 1000 |
| 3168 | 瘦 | shòu | thin; slim | T3 | Yellow | A_PERSONSTATE.ADDED | 1000 |
| 3169 | 疼 | téng | painful; sore | T3 | Yellow | A_PERSONSTATE.ADDED | 1000 |
| 3170 | 着急 | zháojí | anxious; worried (in a hurry) | T3 | Yellow | A_PERSONSTATE.ADDED | 1000 |
| 3171 | 懒 | lǎn | lazy | T4 | Green | A_PERSONSTATE.ADDED | 1525 |
| 3172 | 帅 | shuài | handsome | T4 | Green | A_PERSONSTATE.ADDED | 1525 |
| 3173 | 笨 | bèn | stupid; clumsy | T4 | Green | A_PERSONSTATE.ADDED | 1525 |
| 3174 | 穷 | qióng | poor | T4 | Green | A_PERSONSTATE.ADDED | 1525 |
| 3175 | 富 | fù | rich; wealthy | T4 | Green | A_PERSONSTATE.ADDED | 1525 |
| 3176 | 勇敢 | yǒnggǎn | brave | T4 | Green | A_PERSONSTATE.ADDED | 1525 |
| 3177 | 幽默 | yōumò | humorous | T4 | Green | A_PERSONSTATE.ADDED | 1525 |
| 3178 | 友好 | yǒuhǎo | friendly | T4 | Green | A_PERSONSTATE.ADDED | 1525 |
| 3179 | 冷静 | lěngjìng | calm | T4 | Green | A_PERSONSTATE.ADDED | 1525 |
| 3180 | 难受 | nánshòu | unwell; upset | T4 | Green | A_PERSONSTATE.ADDED | 1525 |
| 3181 | 伤心 | shāngxīn | sad; heartbroken | T4 | Green | A_PERSONSTATE.ADDED | 1525 |
| 3182 | 激动 | jīdòng | excited; moved | T4 | Green | A_PERSONSTATE.ADDED | 1525 |
| 3183 | 害羞 | hàixiū | shy | T4 | Green | A_PERSONSTATE.ADDED | 1525 |
| 3184 | 骄傲 | jiāo'ào | proud | T4 | Green | A_PERSONSTATE.ADDED | 1525 |
| 3185 | 吃惊 | chījīng | surprised | T4 | Green | A_PERSONSTATE.ADDED | 1525 |
| 3186 | 无聊 | wúliáo | bored; boring | T4 | Green | A_PERSONSTATE.ADDED | 1525 |
| 3187 | 热情 | rèqíng | warm; enthusiastic | T3 | Yellow | A_PERSONSTATE.ADDED | 1000 |
| 3188 | 蓝 | lán | blue | T3 | Yellow | A_COLOUR.COLOUR | 1000 |
| 3189 | 绿 | lǜ | green | T3 | Yellow | A_COLOUR.COLOUR | 1000 |
| 3190 | 一下 | yíxià | a bit; for a moment | T2 | Blue | X_FUNCTION.ADDED | 600 |
| 3191 | 一点儿 | yìdiǎnr | a little | T2 | Orange + Stripe | X_QUANTITY.ADDED | 400 |
| 3192 | 为了 | wèile | in order to; for | T3 | Yellow + Stripe | X_FUNCTION.ADDED | 1200 |
| 3193 | 比如 | bǐrú | for example | T4 | Green | X_FUNCTION.ADDED | 1525 |
| 3194 | 千万 | qiānwàn | by all means; must | T4 | Green | X_ADVERB.ADDED | 1525 |
| 3195 | 稍微 | shāowēi | slightly; a little | T4 | Green | X_ADVERB.ADDED | 1525 |
| 3196 | 挺 | tǐng | quite; rather | T4 | Green | X_ADVERB.ADDED | 1525 |
| 3197 | 平时 | píngshí | usually; ordinarily | T4 | Green | X_ADVERB.ADDED | 1525 |
| 3198 | 首先 | shǒuxiān | first of all | T4 | Green | X_ADVERB.ADDED | 1525 |
| 3199 | 顺便 | shùnbiàn | while at it; on the way | T4 | Green | X_ADVERB.ADDED | 1525 |
| 3200 | 差不多 | chàbuduō | about; almost the same | T4 | Green | X_ADVERB.ADDED | 1525 |
| 3201 | 一共 | yīgòng | altogether | T3 | Yellow + Stripe | X_ADVERB.ADDED | 1200 |
| 3202 | 将来 | jiānglái | in the future | T4 | Green | T_TIME.ADDED | 1525 |
| 3203 | 当时 | dāngshí | at that time | T4 | Green | T_TIME.ADDED | 1525 |
| 3204 | 顿 | dùn | (measure for meals; scolding) | T3 | Yellow + Stripe | X_MEASURE.ADDED | 1200 |
| 3205 | 遍 | biàn | (measure: complete times) | T4 | Green | X_MEASURE.ADDED | 1525 |
| 3206 | 趟 | tàng | (measure: trips) | T4 | Green | X_MEASURE.ADDED | 1525 |
| 3207 | 双 | shuāng | (measure: pairs) | T3 | Yellow | X_MEASURE.ADDED | 1000 |
| 3208 | 不客气 | bú kèqi | you are welcome; do not mention it | T1 | Orange | X_PHRASE.ADDED | 200 |
| 3209 | 喂 | wèi | hello (on the phone) | T1 | Orange | X_PHRASE.ADDED | 200 |
| 3210 | 哎 | āi | hey; oh (surprise or calling attention) | T2 | Orange + Stripe | X_PHRASE.ADDED | 400 |
| 3211 | 哇 | wā | wow | T2 | Orange + Stripe | X_PHRASE.ADDED | 400 |
| 3212 | 哪儿 | nǎr | where | T1 | White | X_QUESTION.WHERE | 100 |
| 3213 | 再见 | zàijiàn | goodbye | T1 | White | X_PHRASE.ADDED | 100 |
| 3214 | 姓 | xìng | to be surnamed; surname | T2 | Blue | V_COMMUNICATE.ADDED | 600 |
| 3215 | 票 | piào | ticket | T2 | Blue | N_ITEM.ADDED | 600 |
| 3216 | 上网 | shàngwǎng | to go online; to surf the web | T3 | Yellow + Stripe | V_HANDLE.ADDED | 1200 |
| 3217 | 游戏 | yóuxì | game | T3 | Yellow | N_ITEM.ADDED | 1000 |
| 3218 | 瓶子 | píngzi | bottle | T3 | Yellow | N_ITEM.ADDED | 1000 |
| 3219 | 请假 | qǐngjià | to ask for leave | T3 | Yellow | V_ROUTINE.ADDED | 1000 |
| 3220 | 起飞 | qǐfēi | to take off (plane) | T3 | Yellow | V_MOVE.ADDED | 1000 |
| 3221 | 电子邮件 | diànzǐ yóujiàn | email | T3 | Yellow | N_ABSTRACT.ADDED | 1000 |
| 3222 | 抱歉 | bàoqiàn | sorry; apologetic | T4 | Green | A_PERSONSTATE.ADDED | 1525 |
| 3223 | 棒 | bàng | great; excellent | T4 | Green | A_THING.ADDED | 1525 |
| 3224 | 表扬 | biǎoyáng | to praise | T4 | Green | V_COMMUNICATE.ADDED | 1525 |
| 3225 | 窗户 | chuānghu | window | T4 | Green | N_ITEM.ADDED | 1525 |
| 3226 | 对话 | duìhuà | dialogue; conversation | T4 | Green | N_ABSTRACT.ADDED | 1525 |
| 3227 | 烦恼 | fánnǎo | worried; troubled | T4 | Green | A_PERSONSTATE.ADDED | 1525 |
| 3228 | 反对 | fǎnduì | to oppose; to object | T4 | Green | V_MIND.ADDED | 1525 |
| 3229 | 回忆 | huíyì | to recall; memory | T4 | Green | V_MIND.ADDED | 1525 |
| 3230 | 及时 | jíshí | in time; promptly | T4 | Green | X_ADVERB.ADDED | 1525 |
| 3231 | 节约 | jiéyuē | to save (resources) | T4 | Green | V_TRADE.ADDED | 1525 |
| 3232 | 流利 | liúlì | fluent | T4 | Green | A_THING.ADDED | 1525 |
| 3233 | 区别 | qūbié | difference | T4 | Green | N_ABSTRACT.ADDED | 1525 |
| 3234 | 缺少 | quēshǎo | to lack; to be short of | T4 | Green | V_MIND.ADDED | 1525 |
| 3235 | 剩 | shèng | to be left over | T4 | Green | V_CHANGE.ADDED | 1525 |
| 3236 | 省 | shěng | to save; to economise | T4 | Green | V_TRADE.ADDED | 1525 |
| 3237 | 输 | shū | to lose (a game; a bet) | T4 | Green | V_CHANGE.ADDED | 1525 |
| 3238 | 赢 | yíng | to win | T4 | Green | V_CHANGE.ADDED | 1525 |
| 3239 | 提前 | tíqián | in advance; ahead of time | T4 | Green | X_ADVERB.ADDED | 1525 |
| 3240 | 误会 | wùhuì | to misunderstand | T4 | Green | V_MIND.ADDED | 1525 |
| 3241 | 同情 | tóngqíng | to sympathise with | T4 | Green | V_MIND.ADDED | 1525 |
| 3242 | 痒 | yǎng | itchy | T4 | Green | A_PERSONSTATE.ADDED | 1525 |
| 3243 | 老虎 | lǎohǔ | tiger | T4 | Green | N_ANIMAL.WILD | 1525 |
| 3244 | 座位 | zuòwèi | seat | T4 | Green | N_ITEM.ADDED | 1525 |
| 3245 | 祝贺 | zhùhè | to congratulate | T4 | Green | V_COMMUNICATE.ADDED | 1525 |
| 3246 | 周围 | zhōuwéi | surroundings; around | T4 | Green | N_PLACE.ADDED | 1525 |
| 3247 | 左右 | zuǒyòu | about; or so (after a number) | T4 | Green | X_ADVERB.ADDED | 1525 |
| 3248 | 准时 | zhǔnshí | on time; punctual | T4 | Green | X_ADVERB.ADDED | 1525 |
| 3249 | 堵车 | dǔchē | to be stuck in traffic | T4 | Green | V_MOVE.ADDED | 1525 |
| 3250 | 抽烟 | chōuyān | to smoke (cigarettes) | T4 | Green | V_ROUTINE.ADDED | 1525 |
| 3251 | 诚实 | chéngshí | honest | T4 | Green | A_PERSONSTATE.ADDED | 1525 |
| 3252 | 乘坐 | chéngzuò | to travel by; to ride | T4 | Green | V_MOVE.ADDED | 1525 |
| 3253 | 登机牌 | dēngjīpái | boarding pass | T4 | Green | N_ITEM.ADDED | 1525 |
| 3254 | 航班 | hángbān | flight | T4 | Green | N_TRANSPORT.ADDED | 1525 |
| 3255 | 来得及 | láidejí | to have time to; to be in time | T4 | Green | V_CHANGE.ADDED | 1525 |
| 3256 | 来不及 | láibují | to have no time to; to be too late | T4 | Green | V_CHANGE.ADDED | 1525 |
| 3257 | 受不了 | shòubuliǎo | cannot stand | T4 | Green | V_MIND.ADDED | 1525 |
| 3258 | 粗心 | cūxīn | careless | T4 | Green | A_PERSONSTATE.ADDED | 1525 |
| 3259 | 马虎 | mǎhu | sloppy; careless | T4 | Green | A_PERSONSTATE.ADDED | 1525 |
| 3260 | 耐心 | nàixīn | patient | T4 | Green | A_PERSONSTATE.ADDED | 1525 |
| 3261 | 顺序 | shùnxù | order; sequence | T4 | Green | N_ABSTRACT.ADDED | 1525 |
| 3262 | 难怪 | nánguài | no wonder | T4 | Green | X_ADVERB.ADDED | 1525 |
| 3263 | 怪不得 | guàibude | no wonder | T4 | Green | X_ADVERB.ADDED | 1525 |
| 3264 | 受欢迎 | shòu huānyíng | popular | T4 | Green | A_THING.ADDED | 1525 |
| 3265 | 家务 | jiāwù | housework | T4 | Green | N_ABSTRACT.ADDED | 1525 |
| 3266 | 晚 | wǎn | late | T2 | Blue | A_THING.ADDED | 600 |
| 3267 | 怎样 | zěnyàng | how; what is it like | T2 | Orange + Stripe | X_QUESTION.ADDED | 400 |
| 3268 | 假 | jiǎ | fake; false | T4 | Green | A_THING.ADDED | 1525 |

## Deliberately not added

Words from my HSK 1–4 check that are still missing, left out because they are rarer or only bound forms, not because they are wrong; they can be added in a later pass:

外 草 发 黄河 角 接 米 爬山 水平 按时 百分之 长江 传真 打招呼 打针 代替 得意 放暑假 广播 寒假 合格 积累 交 谨慎 克 刻苦 昆虫 俩 弄 排列 硕士 抬 弹钢琴 填空 突出 退 响 叶子 亿 应聘 预习 乐 云 摘 粘贴 占线 招聘 著名 转 字幕 总结 做生意 今 免 记 鲜 咦 顺 网 排 房 聚

Bound characters from the writers' reports that are not words on their own and were not added alone: 今 免 记 鲜 咦 顺 网 假(as vacation) 排 房 聚 外 草 发 角 接 米 黄河. 咸 and 办法 already exist (T4 and T2). 点 (T2), 一点 (T1), 电话 (T2), 老板 and 打包 (T3) exist at the tiers the writers found them.
