# Cantonese: the beginner teaching order of the first 200 words

Source of truth: `beginner-order-src.txt` (hand-edited), checked and expanded by `tools/yue_beginner_order.py` into `beginner-order.csv` (position, id, word, yale, day, unlocks), `framing-lines.csv` and this page.
Applied by `tools/build_base.py`: the first 200 positions of the word list follow `beginner-order.csv`; every other word keeps its present relative order after them; ids and tiers are untouched.

## Why

A real day-one track taught 嘅 我 想 巴士 係 (the 80/20 usage order: function words first) and its lines used 狗 名字 乜嘢 多士 鍾意 今日 超市 買咗 ... none of them taught yet, with no greeting and no goodbye.
Usage order is the wrong order for a beginner: a learner needs the words that let them BUILD sentences. So the first 200 words (White 1-100 and Orange 101-200, five new words a day, 40 days) are chosen and ordered by hand:

1. Day 1-3: hello, I / you / be / not, thanks, sorry, goodbye, he / she, friend, never mind: a learner can greet, say who they are and be polite on day 1.
2. Day 4-14: feeling, want / eat / drink / need, this / that / what, go / come / home / where, have / not have, numbers and prices: the words of a first meal, a first shop and a first "where is ...".
3. Day 15-21: today / tomorrow / now / what time, family, jobs, Hong Kong, places, transport, parting phrases, we / you (plural) / they and "together".
4. Day 22-28: the learner's own survival lines: "I speak a little Cantonese", "I do not understand", "say it again, slowly", "I do not know", "what is your name", "can I", buy / wait / ask / look for, live / work / learn / sleep, the day and the clock.
5. Day 29-40: breakfast and food, drinks, likes, phone and books, clothes, "already / not yet / still", "first / also / again", "why / when / how many", left / right / in front, fast / slow and the stations.

Tiers are untouched (a word keeps the tier of the first release): the 200 words are 142 T1, 56 T2 and 2 T3 words; the other 105 T1 words (茶餐廳 巴士 嘩 常餐 ...: real words a beginner does not need first) now follow the 200, from rank 201, in their old order.
Words used by a sentence that are NOT yet taught can only be **free words** (`free-words.csv`: names, loanwords, interjections and sentence-final particles) or the **framing lines** (`framing-lines.csv`: opening and closing lines).

## The proof: what each day lets a learner say

Rule checked by the tool for every day: the learner's vocabulary (the words of that day and the days before, plus the free words) can say at least 4 distinct useful sentences that use the day's new words, and every new word of the day is in at least one of them.

### Day 1 (White, positions 1-5)

| New word | Yale | Meaning |
| --- | --- | --- |
| 1 你好 | néih hóu | hello |
| 2 我 | ngóh | I |
| 3 你 | néih | you (singular) |
| 4 係 | haih | be |
| 5 唔 | m̀h | no |

| Sentence | Yale | English |
| --- | --- | --- |
| 你好！ | néih hóu! | Hello! |
| 你好，我係阿明。 | néih hóu, ngóh haih a mìhng. | Hello, I am Ah Ming. |
| 我係阿欣。 | ngóh haih a yān. | I am Ah Yan. |
| 你係阿明呀？ | néih haih a mìhng a? | Oh, you are Ah Ming? |
| 我唔係阿明。 | ngóh m̀h haih a mìhng. | I am not Ah Ming. |
| 你係唔係阿欣？ | néih haih m̀h haih a yān? | Are you Ah Yan? |

### Day 2 (White, positions 6-10)

| New word | Yale | Meaning |
| --- | --- | --- |
| 6 早晨 | jóu sàhn | good morning |
| 7 多謝 | dō jeh | thank you |
| 8 唔該 | m̀h gōi | please |
| 9 對唔住 | deui m̀h jyuh | I'm sorry |
| 10 再見 | joi gin | goodbye (T2) |

| Sentence | Yale | English |
| --- | --- | --- |
| 早晨！ | jóu sàhn! | Good morning! |
| 早晨，阿明！ | jóu sàhn, a mìhng! | Good morning, Ah Ming! |
| 多謝你。 | dō jeh néih. | Thank you. |
| 唔該！ | m̀h gōi! | Thank you! / Excuse me! / Please! |
| 對唔住，我唔係阿欣。 | deui m̀h jyuh, ngóh m̀h haih a yān. | Sorry, I am not Ah Yan. |
| 多謝，再見！ | dō jeh, joi gin! | Thanks, goodbye! |
| 再見，阿明！ | joi gin, a mìhng! | Goodbye, Ah Ming! |

### Day 3 (White, positions 11-15)

| New word | Yale | Meaning |
| --- | --- | --- |
| 11 佢 | kéuih | he |
| 12 朋友 | pàhng yáuh | friend |
| 13 學生 | hohk sāang | student (T2) |
| 14 嘅 | ge | indicates possession, like adding 's to a noun |
| 15 唔緊要 | m̀h gán yiu | it doesn't matter (T2) |

| Sentence | Yale | English |
| --- | --- | --- |
| 佢係我朋友。 | kéuih haih ngóh pàhng yáuh. | He (she) is my friend. |
| 我係學生。 | ngóh haih hohk sāang. | I am a student. |
| 佢唔係學生。 | kéuih m̀h haih hohk sāang. | He (she) is not a student. |
| 阿明係我嘅朋友。 | a mìhng haih ngóh ge pàhng yáuh. | Ah Ming is my friend. |
| 佢係唔係你嘅朋友？ | kéuih haih m̀h haih néih ge pàhng yáuh? | Is she your friend? |
| 對唔住！ 唔緊要！ | deui m̀h jyuh! m̀h gán yiu! | Sorry! Never mind! |

### Day 4 (White, positions 16-20)

| New word | Yale | Meaning |
| --- | --- | --- |
| 16 好 | hóu | very |
| 17 開心 | hōi sām | happy |
| 18 忙 | mòhng | busy (T2) |
| 19 累 | leuih | tired (T2) |
| 20 餓 | ngoh | hungry |

| Sentence | Yale | English |
| --- | --- | --- |
| 我好開心。 | ngóh hóu hōi sām. | I am very happy. |
| 佢好忙。 | kéuih hóu mòhng. | He is very busy. |
| 我好累。 | ngóh hóu leuih. | I am very tired. |
| 我好餓。 | ngóh hóu ngoh. | I am very hungry. |
| 你忙唔忙？ | néih mòhng m̀h mòhng? | Are you busy? |
| 你餓唔餓？ | néih ngoh m̀h ngoh? | Are you hungry? |

### Day 5 (White, positions 21-25)

| New word | Yale | Meaning |
| --- | --- | --- |
| 21 想 | séung | want to |
| 22 食 | sihk | eat |
| 23 飲 | yám | to drink |
| 24 水 | séui | water |
| 25 茶 | chàh | tea (T2) |

| Sentence | Yale | English |
| --- | --- | --- |
| 我想食。 | ngóh séung sihk. | I want to eat. |
| 我想飲水。 | ngóh séung yám séui. | I would like some water. |
| 我想飲茶。 | ngóh séung yám chàh. | I would like some tea. |
| 你想唔想飲茶？ | néih séung m̀h séung yám chàh? | Would you like some tea? |
| 我唔想食。 | ngóh m̀h séung sihk. | I do not want to eat. |
| 唔該，我想飲水。 | m̀h gōi, ngóh séung yám séui. | Excuse me, I would like some water, please. |

### Day 6 (White, positions 26-30)

| New word | Yale | Meaning |
| --- | --- | --- |
| 26 要 | yiu | to want |
| 27 飯 | faahn | (cooked) rice |
| 28 麵 | mihn | noodles (T2) |
| 29 咖啡 | ga fē | coffee (T2) |
| 30 奶茶 | náaih chàh | Hong Kong milk tea |

| Sentence | Yale | English |
| --- | --- | --- |
| 我要咖啡，唔該。 | ngóh yiu ga fē, m̀h gōi. | A coffee, please. |
| 我要奶茶，唔該。 | ngóh yiu náaih chàh, m̀h gōi. | A milk tea, please. |
| 你要唔要飯？ | néih yiu m̀h yiu faahn? | Do you want rice? |
| 我想食麵。 | ngóh séung sihk mihn. | I want to eat noodles. |
| 我唔要咖啡，我要奶茶。 | ngóh m̀h yiu ga fē, ngóh yiu náaih chàh. | I do not want coffee, I want milk tea. |
| 佢想食飯，我想食麵。 | kéuih séung sihk faahn, ngóh séung sihk mihn. | He wants rice, I want noodles. |

### Day 7 (White, positions 31-35)

| New word | Yale | Meaning |
| --- | --- | --- |
| 31 呢個 | nī go | this one |
| 32 嗰個 | gó go | that one |
| 33 乜嘢 | māt yéh | what? |
| 34 好食 | hóu sihk | tasty |
| 35 係咪 | haih maih | right? isn't it? |

| Sentence | Yale | English |
| --- | --- | --- |
| 呢個係乜嘢？ | nī go haih māt yéh? | What is this? |
| 嗰個係乜嘢？ | gó go haih māt yéh? | What is that? |
| 你想食乜嘢？ | néih séung sihk māt yéh? | What do you want to eat? |
| 你想飲乜嘢？ | néih séung yám māt yéh? | What do you want to drink? |
| 呢個好食。 | nī go hóu sihk. | This is tasty. |
| 嗰個唔好食。 | gó go m̀h hóu sihk. | That is not tasty. |
| 呢個係咪麵？ | nī go haih maih mihn? | Is this noodles? |

### Day 8 (White, positions 36-40)

| New word | Yale | Meaning |
| --- | --- | --- |
| 36 去 | heui | go |
| 37 嚟 | làih | come |
| 38 返 | fāan | to return |
| 39 屋企 | ūk kéi | family |
| 40 學校 | hohk haauh | school (T2) |

| Sentence | Yale | English |
| --- | --- | --- |
| 我去學校。 | ngóh heui hohk haauh. | I am going to school. |
| 我想返屋企。 | ngóh séung fāan ūk kéi. | I want to go home. |
| 你去唔去學校？ | néih heui m̀h heui hohk haauh? | Are you going to school? |
| 阿明嚟我屋企。 | a mìhng làih ngóh ūk kéi. | Ah Ming is coming to my home. |
| 你嚟唔嚟我屋企？ | néih làih m̀h làih ngóh ūk kéi? | Are you coming to my home? |
| 佢返屋企，我去學校。 | kéuih fāan ūk kéi, ngóh heui hohk haauh. | He goes home, I go to school. |

### Day 9 (White, positions 41-45)

| New word | Yale | Meaning |
| --- | --- | --- |
| 41 邊度 | bīn douh | where? |
| 42 喺 | hái | at |
| 43 呢度 | nī douh | here |
| 44 嗰度 | gó douh | there |
| 45 有 | yáuh | have |

| Sentence | Yale | English |
| --- | --- | --- |
| 你去邊度？ | néih heui bīn douh? | Where are you going? |
| 你喺邊度？ | néih hái bīn douh? | Where are you? |
| 我喺屋企。 | ngóh hái ūk kéi. | I am at home. |
| 阿明喺呢度。 | a mìhng hái nī douh. | Ah Ming is here. |
| 學校喺嗰度。 | hohk haauh hái gó douh. | The school is over there. |
| 呢度有水。 | nī douh yáuh séui. | There is water here. |
| 嗰度有咖啡。 | gó douh yáuh ga fē. | There is coffee over there. |

### Day 10 (White, positions 46-50)

| New word | Yale | Meaning |
| --- | --- | --- |
| 46 冇 | móuh | not have |
| 47 有冇 | yáuh móuh | do (you) have ...? (yes/no) |
| 48 錢 | chín | money |
| 49 蚊 | mān | lump |
| 50 一 | yāt | one |

| Sentence | Yale | English |
| --- | --- | --- |
| 我冇錢。 | ngóh móuh chín. | I have no money. |
| 你有冇錢？ | néih yáuh móuh chín? | Do you have any money? |
| 呢度冇水。 | nī douh móuh séui. | There is no water here. |
| 嗰度有冇咖啡？ | gó douh yáuh móuh ga fē? | Is there any coffee over there? |
| 我有一蚊。 | ngóh yáuh yāt mān. | I have one dollar. |
| 呢個一蚊。 | nī go yāt mān. | This one is one dollar. |

### Day 11 (White, positions 51-55)

| New word | Yale | Meaning |
| --- | --- | --- |
| 51 個 | go | general measure word |
| 52 兩 | léuhng | two |
| 53 三 | sāam | three |
| 54 四 | sei | four |
| 55 五 | ńgh | five |

| Sentence | Yale | English |
| --- | --- | --- |
| 我要一個。 | ngóh yiu yāt go. | I would like one. |
| 我要三個，唔該。 | ngóh yiu sāam go, m̀h gōi. | Three, please. |
| 我有兩個朋友。 | ngóh yáuh léuhng go pàhng yáuh. | I have two friends. |
| 呢個五蚊。 | nī go ńgh mān. | This one is five dollars. |
| 嗰個四蚊。 | gó go sei mān. | That one is four dollars. |
| 我有四蚊。 | ngóh yáuh sei mān. | I have four dollars. |

### Day 12 (White, positions 56-60)

| New word | Yale | Meaning |
| --- | --- | --- |
| 56 六 | luhk | six |
| 57 七 | chāt | seven |
| 58 八 | baat | eight |
| 59 九 | gáu | nine |
| 60 十 | sahp | ten |

| Sentence | Yale | English |
| --- | --- | --- |
| 呢個六蚊。 | nī go luhk mān. | This one is six dollars. |
| 嗰個八蚊。 | gó go baat mān. | That one is eight dollars. |
| 我要七個，唔該。 | ngóh yiu chāt go, m̀h gōi. | Seven, please. |
| 我有十個朋友。 | ngóh yáuh sahp go pàhng yáuh. | I have ten friends. |
| 我有九蚊。 | ngóh yáuh gáu mān. | I have nine dollars. |
| 十蚊，唔該。 | sahp mān, m̀h gōi. | Ten dollars, please. |

### Day 13 (White, positions 61-65)

| New word | Yale | Meaning |
| --- | --- | --- |
| 61 二 | yih | two |
| 62 百 | baak | hundred |
| 63 幾多 | géi dō | how much? |
| 64 貴 | gwai | expensive |
| 65 平 | pìhng | flat |

| Sentence | Yale | English |
| --- | --- | --- |
| 呢個幾多錢？ | nī go géi dō chín? | How much is this? |
| 嗰個幾多錢？ | gó go géi dō chín? | How much is that? |
| 一百蚊。 | yāt baak mān. | A hundred dollars. |
| 呢個好貴。 | nī go hóu gwai. | This is very expensive. |
| 嗰個好平。 | gó go hóu pìhng. | That is very cheap. |
| 你有幾多錢？ | néih yáuh géi dō chín? | How much money do you have? |
| 二十蚊。 | yih sahp mān. | Twenty dollars. |
| 十二蚊，唔該。 | sahp yih mān, m̀h gōi. | Twelve dollars, please. |

### Day 14 (White, positions 66-70)

| New word | Yale | Meaning |
| --- | --- | --- |
| 66 大 | daaih | big |
| 67 細 | sai | small |
| 68 多 | dō | many |
| 69 人 | yàhn | person |
| 70 少少 | síu síu | a bit |

| Sentence | Yale | English |
| --- | --- | --- |
| 呢度好多人。 | nī douh hóu dō yàhn. | There are many people here. |
| 我有好多朋友。 | ngóh yáuh hóu dō pàhng yáuh. | I have many friends. |
| 我有少少錢。 | ngóh yáuh síu síu chín. | I have a little money. |
| 我屋企好細。 | ngóh ūk kéi hóu sai. | My home is very small. |
| 我嘅學校好大。 | ngóh ge hohk haauh hóu daaih. | My school is very big. |
| 呢個大，嗰個細。 | nī go daaih, gó go sai. | This one is big, that one is small. |
| 嗰個人係我朋友。 | gó go yàhn haih ngóh pàhng yáuh. | That person is my friend. |

### Day 15 (White, positions 71-75)

| New word | Yale | Meaning |
| --- | --- | --- |
| 71 今日 | gām yaht | today |
| 72 聽日 | tīng yaht | tomorrow |
| 73 琴日 | kàhm yaht | yesterday |
| 74 而家 | yìh gā | now |
| 75 幾點 | géi dím | what time |

| Sentence | Yale | English |
| --- | --- | --- |
| 我今日好忙。 | ngóh gām yaht hóu mòhng. | I am very busy today. |
| 琴日我好累。 | kàhm yaht ngóh hóu leuih. | I was very tired yesterday. |
| 你聽日去唔去學校？ | néih tīng yaht heui m̀h heui hohk haauh? | Are you going to school tomorrow? |
| 我而家想返屋企。 | ngóh yìh gā séung fāan ūk kéi. | I want to go home now. |
| 而家幾點？ | yìh gā géi dím? | What time is it now? |
| 你今日想食乜嘢？ | néih gām yaht séung sihk māt yéh? | What do you want to eat today? |

### Day 16 (White, positions 76-80)

| New word | Yale | Meaning |
| --- | --- | --- |
| 76 媽媽 | mā mā | mom |
| 77 爸爸 | bā bā | Dad |
| 78 哥哥 | gō gō | older brother (T2) |
| 79 姐姐 | jē jē | older sister (T2) |
| 80 弟弟 | daih daih | younger brother (T2) |

| Sentence | Yale | English |
| --- | --- | --- |
| 佢係我媽媽。 | kéuih haih ngóh mā mā. | She is my mum. |
| 我爸爸好忙。 | ngóh bā bā hóu mòhng. | My dad is very busy. |
| 你有冇哥哥？ | néih yáuh móuh gō gō? | Do you have an older brother? |
| 我有一個姐姐。 | ngóh yáuh yāt go jē jē. | I have an older sister. |
| 我弟弟係學生。 | ngóh daih daih haih hohk sāang. | My younger brother is a student. |
| 我媽媽喺屋企。 | ngóh mā mā hái ūk kéi. | My mum is at home. |
| 你爸爸今日去邊度？ | néih bā bā gām yaht heui bīn douh? | Where is your dad going today? |

### Day 17 (White, positions 81-85)

| New word | Yale | Meaning |
| --- | --- | --- |
| 81 妹妹 | muih muih | younger sister (T2) |
| 82 醫生 | yī sāng | doctor |
| 83 老師 | lóuh sī | teacher (T2) |
| 84 香港 | hēung góng | Hong Kong (T2) |
| 85 公司 | gūng sī | company (T2) |

| Sentence | Yale | English |
| --- | --- | --- |
| 我妹妹係醫生。 | ngóh muih muih haih yī sāng. | My younger sister is a doctor. |
| 我爸爸係老師。 | ngóh bā bā haih lóuh sī. | My dad is a teacher. |
| 我係香港人。 | ngóh haih hēung góng yàhn. | I am from Hong Kong. |
| 你係唔係香港人？ | néih haih m̀h haih hēung góng yàhn? | Are you from Hong Kong? |
| 我哥哥喺公司。 | ngóh gō gō hái gūng sī. | My older brother is at the office. |
| 你嘅公司喺邊度？ | néih ge gūng sī hái bīn douh? | Where is your company? |
| 你妹妹係老師呀？ | néih muih muih haih lóuh sī a? | Your younger sister is a teacher? |

### Day 18 (White, positions 86-90)

| New word | Yale | Meaning |
| --- | --- | --- |
| 86 唔好意思 | m̀h hóu yi sih | be sorry |
| 87 洗手間 | sái sáu gāan | toilet |
| 88 超市 | chīu síh | supermarket |
| 89 茶餐廳 | chàh chāan tēng | Hong Kong-style cafe |
| 90 醫院 | yī yún | hospital (T2) |

| Sentence | Yale | English |
| --- | --- | --- |
| 唔好意思，洗手間喺邊度？ | m̀h hóu yi sih, sái sáu gāan hái bīn douh? | Excuse me, where is the toilet? |
| 唔好意思，茶餐廳喺邊度？ | m̀h hóu yi sih, chàh chāan tēng hái bīn douh? | Excuse me, where is the cha chaan teng? |
| 超市喺嗰度。 | chīu síh hái gó douh. | The supermarket is over there. |
| 我想去超市。 | ngóh séung heui chīu síh. | I want to go to the supermarket. |
| 我媽媽喺醫院。 | ngóh mā mā hái yī yún. | My mum is in the hospital. |
| 你去唔去茶餐廳？ | néih heui m̀h heui chàh chāan tēng? | Are you going to the cha chaan teng? |

### Day 19 (White, positions 91-95)

| New word | Yale | Meaning |
| --- | --- | --- |
| 91 巴士 | bā sí | bus |
| 92 地鐵 | deih tit | underground (railway) |
| 93 的士 | dīk sí | taxi (T2) |
| 94 搭 | daap | take (a bus, train) (T2) |
| 95 點樣 | dím yéung | how about? |

| Sentence | Yale | English |
| --- | --- | --- |
| 你點樣去學校？ | néih dím yéung heui hohk haauh? | How do you get to school? |
| 我搭巴士。 | ngóh daap bā sí. | I take the bus. |
| 我搭地鐵返屋企。 | ngóh daap deih tit fāan ūk kéi. | I take the MTR home. |
| 你想搭的士？ | néih séung daap dīk sí? | Do you want to take a taxi? |
| 我想搭的士去醫院。 | ngóh séung daap dīk sí heui yī yún. | I want to take a taxi to the hospital. |
| 佢點樣去公司？ | kéuih dím yéung heui gūng sī? | How does he get to the office? |

### Day 20 (White, positions 96-100)

| New word | Yale | Meaning |
| --- | --- | --- |
| 96 拜拜 | bāai baai | bye-bye |
| 97 聽日見 | tīng yaht gin | see you tomorrow (T3) |
| 98 冇問題 | móuh mahn tàih | no problem |
| 99 多謝晒 | dō jeh saai | thanks a lot |
| 100 唔該晒 | m̀h gōi saai | thank you very much (for the help) |

| Sentence | Yale | English |
| --- | --- | --- |
| 拜拜！ | bāai baai! | Bye bye! |
| 聽日見！ | tīng yaht gin! | See you tomorrow! |
| 冇問題！ | móuh mahn tàih! | No problem! |
| 多謝晒！ | dō jeh saai! | Thanks a lot! |
| 唔該晒！ | m̀h gōi saai! | Thank you very much! |
| 多謝晒，拜拜！ | dō jeh saai, bāai baai! | Thanks a lot, bye! |
| 冇問題，聽日見！ | móuh mahn tàih, tīng yaht gin! | No problem, see you tomorrow! |

### Day 21 (Orange, positions 101-105)

| New word | Yale | Meaning |
| --- | --- | --- |
| 101 我哋 | ngóh deih | we |
| 102 你哋 | néih deih | you (plural) |
| 103 佢哋 | kéuih deih | they |
| 104 同 | tùhng | and |
| 105 一起 | yāt héi | together |

| Sentence | Yale | English |
| --- | --- | --- |
| 我哋一起去。 | ngóh deih yāt héi heui. | Let us go together. |
| 我哋一起食飯。 | ngóh deih yāt héi sihk faahn. | We eat together. |
| 我同朋友一起去超市。 | ngóh tùhng pàhng yáuh yāt héi heui chīu síh. | I am going to the supermarket with a friend. |
| 你哋想食乜嘢？ | néih deih séung sihk māt yéh? | What do you want to eat? |
| 佢哋係我朋友。 | kéuih deih haih ngóh pàhng yáuh. | They are my friends. |
| 你同我一起去。 | néih tùhng ngóh yāt héi heui. | You come with me. |
| 我哋今日去茶餐廳。 | ngóh deih gām yaht heui chàh chāan tēng. | We are going to the cha chaan teng today. |

### Day 22 (Orange, positions 106-110)

| New word | Yale | Meaning |
| --- | --- | --- |
| 106 講 | góng | speak |
| 107 識 | sīk | can |
| 108 廣東話 | gwóng dūng wá | Cantonese |
| 109 英文 | yīng mán | English (language) (T2) |
| 110 明白 | mìhng baahk | clear (T2) |

| Sentence | Yale | English |
| --- | --- | --- |
| 我識講少少廣東話。 | ngóh sīk góng síu síu gwóng dūng wá. | I can speak a little Cantonese. |
| 你識唔識講英文？ | néih sīk m̀h sīk góng yīng mán? | Can you speak English? |
| 佢識講廣東話。 | kéuih sīk góng gwóng dūng wá. | He can speak Cantonese. |
| 我唔明白。 | ngóh m̀h mìhng baahk. | I do not understand. |
| 你明白唔明白？ | néih mìhng baahk m̀h mìhng baahk? | Do you understand? |
| 我唔識講廣東話。 | ngóh m̀h sīk góng gwóng dūng wá. | I cannot speak Cantonese. |

### Day 23 (Orange, positions 111-115)

| New word | Yale | Meaning |
| --- | --- | --- |
| 111 再 | joi | again |
| 112 次 | chi | (mw for number of times of occurrence) (T2) |
| 113 慢慢 | maahn maahn | slowly (T2) |
| 114 唔知 | m̀h jī | not know |
| 115 知 | jī | know |

| Sentence | Yale | English |
| --- | --- | --- |
| 唔該，再講一次。 | m̀h gōi, joi góng yāt chi. | Please say it once more. |
| 唔該，慢慢講。 | m̀h gōi, maahn maahn góng. | Please speak slowly. |
| 我唔知。 | ngóh m̀h jī. | I do not know. |
| 你知唔知洗手間喺邊度？ | néih jī m̀h jī sái sáu gāan hái bīn douh? | Do you know where the toilet is? |
| 我聽日再嚟。 | ngóh tīng yaht joi làih. | I will come again tomorrow. |
| 對唔住，我唔知。 | deui m̀h jyuh, ngóh m̀h jī. | Sorry, I do not know. |

### Day 24 (Orange, positions 116-120)

| New word | Yale | Meaning |
| --- | --- | --- |
| 116 咩 | mē | sentence-final particle expressing doubt, surprise (T2) |
| 117 叫 | giu | to be called (T2) |
| 118 名字 | mèhng jih | name |
| 119 邊個 | bīn go | who |
| 120 歲 | seui | years old (T2) |

| Sentence | Yale | English |
| --- | --- | --- |
| 你叫咩名字？ | néih giu mē mèhng jih? | What is your name? |
| 我叫阿明。 | ngóh giu a mìhng. | My name is Ah Ming. |
| 你係邊個呀？ | néih haih bīn go a? | Who are you? |
| 佢係邊個？ | kéuih haih bīn go? | Who is he? |
| 你幾多歲？ | néih géi dō seui? | How old are you? |
| 我二十歲。 | ngóh yih sahp seui. | I am twenty. |
| 你朋友叫咩名字？ | néih pàhng yáuh giu mē mèhng jih? | What is your friend called? |

### Day 25 (Orange, positions 121-125)

| New word | Yale | Meaning |
| --- | --- | --- |
| 121 會 | wúih | will |
| 122 可以 | hó yíh | can |
| 123 唔可以 | m̀h hó yíh | may not |
| 124 坐 | chóh | sit |
| 125 得唔得 | dāk m̀h dāk | is that OK (T2) |

| Sentence | Yale | English |
| --- | --- | --- |
| 我會講廣東話。 | ngóh wúih góng gwóng dūng wá. | I can speak Cantonese. |
| 你會唔會講英文？ | néih wúih m̀h wúih góng yīng mán? | Can you speak English? |
| 我坐呢度，得唔得？ | ngóh chóh nī douh, dāk m̀h dāk? | Is it all right if I sit here? |
| 呢度唔可以坐。 | nī douh m̀h hó yíh chóh. | You cannot sit here. |
| 你可以食呢個。 | néih hó yíh sihk nī go. | You can eat this one. |
| 我唔會講。 | ngóh m̀h wúih góng. | I cannot speak it. |

### Day 26 (Orange, positions 126-130)

| New word | Yale | Meaning |
| --- | --- | --- |
| 126 買 | máaih | to buy |
| 127 等 | dáng | to wait |
| 128 問 | mahn | ask |
| 129 搵 | wán | seek |
| 130 做 | jouh | do |

| Sentence | Yale | English |
| --- | --- | --- |
| 我想買奶茶。 | ngóh séung máaih náaih chàh. | I want to buy a milk tea. |
| 你想買乜嘢？ | néih séung máaih māt yéh? | What do you want to buy? |
| 我等朋友。 | ngóh dáng pàhng yáuh. | I am waiting for a friend. |
| 你等邊個？ | néih dáng bīn go? | Who are you waiting for? |
| 我想問你。 | ngóh séung mahn néih. | I would like to ask you something. |
| 我搵洗手間。 | ngóh wán sái sáu gāan. | I am looking for the toilet. |
| 你今日做咩？ | néih gām yaht jouh mē? | What are you doing today? |

### Day 27 (Orange, positions 131-135)

| New word | Yale | Meaning |
| --- | --- | --- |
| 131 住 | jyuh | to live |
| 132 返工 | fāan gūng | go to work |
| 133 學 | hohk | learn |
| 134 玩 | wún | to play (T2) |
| 135 瞓覺 | fan gaau | to sleep |

| Sentence | Yale | English |
| --- | --- | --- |
| 我住喺香港。 | ngóh jyuh hái hēung góng. | I live in Hong Kong. |
| 你住喺邊度？ | néih jyuh hái bīn douh? | Where do you live? |
| 我聽日返工。 | ngóh tīng yaht fāan gūng. | I am going to work tomorrow. |
| 你今日返唔返工？ | néih gām yaht fāan m̀h fāan gūng? | Are you going to work today? |
| 我想學廣東話。 | ngóh séung hohk gwóng dūng wá. | I want to learn Cantonese. |
| 我哋一起玩。 | ngóh deih yāt héi wún. | Let us play together. |
| 我而家想瞓覺。 | ngóh yìh gā séung fan gaau. | I want to sleep now. |

### Day 28 (Orange, positions 136-140)

| New word | Yale | Meaning |
| --- | --- | --- |
| 136 星期 | sīng kèih | week (T2) |
| 137 朝早 | jīu jóu | morning (T2) |
| 138 晚上 | máahn seuhng | evening (T2) |
| 139 點鐘 | dím jūng | o'clock (T2) |
| 140 早唞 | jóu táu | good night (T3) |

| Sentence | Yale | English |
| --- | --- | --- |
| 我星期五返工。 | ngóh sīng kèih ńgh fāan gūng. | I go to work on Friday. |
| 我朝早七點鐘返工。 | ngóh jīu jóu chāt dím jūng fāan gūng. | I go to work at seven in the morning. |
| 我晚上十點鐘瞓覺。 | ngóh máahn seuhng sahp dím jūng fan gaau. | I go to bed at ten in the evening. |
| 而家十點鐘。 | yìh gā sahp dím jūng. | It is ten o'clock now. |
| 你朝早食咩？ | néih jīu jóu sihk mē? | What do you eat in the morning? |
| 早唞！ | jóu táu! | Good night! |
| 早唞，阿明！ | jóu táu, a mìhng! | Good night, Ah Ming! |

### Day 29 (Orange, positions 141-145)

| New word | Yale | Meaning |
| --- | --- | --- |
| 141 早餐 | jóu chāan | breakfast |
| 142 多士 | dō sí | toast |
| 143 蛋撻 | dáan tāat | egg tart |
| 144 菠蘿包 | bō lòh bāau | pineapple bun |
| 145 麵包 | mihn bāau | bread |

| Sentence | Yale | English |
| --- | --- | --- |
| 我朝早食早餐。 | ngóh jīu jóu sihk jóu chāan. | I have breakfast in the morning. |
| 我想食多士。 | ngóh séung sihk dō sí. | I want to eat toast. |
| 我要一個蛋撻，唔該。 | ngóh yiu yāt go dáan tāat, m̀h gōi. | One egg tart, please. |
| 呢個菠蘿包好食。 | nī go bō lòh bāau hóu sihk. | This pineapple bun is tasty. |
| 你想食麵包？ | néih séung sihk mihn bāau? | Do you want bread? |
| 我哋一起食早餐。 | ngóh deih yāt héi sihk jóu chāan. | We have breakfast together. |

### Day 30 (Orange, positions 146-150)

| New word | Yale | Meaning |
| --- | --- | --- |
| 146 粥 | jūk | congee |
| 147 湯 | tōng | soup (T2) |
| 148 肉 | yuhk | meat (T2) |
| 149 魚 | yùh | fish (Kangxi radical 195) (T2) |
| 150 菜 | choi | dish (type of food) (T2) |

| Sentence | Yale | English |
| --- | --- | --- |
| 我想食粥。 | ngóh séung sihk jūk. | I want to eat congee. |
| 呢個湯好食。 | nī go tōng hóu sihk. | This soup is tasty. |
| 我唔食肉。 | ngóh m̀h sihk yuhk. | I do not eat meat. |
| 我食魚。 | ngóh sihk yùh. | I eat fish. |
| 你想食菜？ | néih séung sihk choi? | Do you want vegetables? |
| 我要一個湯，唔該。 | ngóh yiu yāt go tōng, m̀h gōi. | One soup, please. |

### Day 31 (Orange, positions 151-155)

| New word | Yale | Meaning |
| --- | --- | --- |
| 151 生果 | sāang gwó | fruit (T2) |
| 152 蘋果 | pìhng gwó | apple (T2) |
| 153 雞蛋 | gāi daahn | (chicken) egg (T2) |
| 154 汽水 | hei séui | soft drink / fizzy drink |
| 155 可樂 | hó lohk | cola |

| Sentence | Yale | English |
| --- | --- | --- |
| 我想食蘋果。 | ngóh séung sihk pìhng gwó. | I want to eat an apple. |
| 你想飲汽水？ | néih séung yám hei séui? | Do you want a soft drink? |
| 我要可樂，唔該。 | ngóh yiu hó lohk, m̀h gōi. | A cola, please. |
| 我朝早食雞蛋。 | ngóh jīu jóu sihk gāi daahn. | I eat eggs in the morning. |
| 你想食生果？ | néih séung sihk sāang gwó? | Do you want some fruit? |
| 我要一個蘋果。 | ngóh yiu yāt go pìhng gwó. | I would like one apple. |

### Day 32 (Orange, positions 156-160)

| New word | Yale | Meaning |
| --- | --- | --- |
| 156 呢 | nī | this |
| 157 嗰 | gó | that |
| 158 杯 | būi | cup (T2) |
| 159 熱 | yiht | heat (T2) |
| 160 凍 | dung | cold (T2) |

| Sentence | Yale | English |
| --- | --- | --- |
| 我要熱奶茶。 | ngóh yiu yiht náaih chàh. | I want a hot milk tea. |
| 我要凍咖啡。 | ngóh yiu dung ga fē. | I want an iced coffee. |
| 我要一杯熱茶。 | ngóh yiu yāt būi yiht chàh. | I would like a cup of hot tea. |
| 呢杯好熱。 | nī būi hóu yiht. | This cup is very hot. |
| 嗰杯好凍。 | gó būi hóu dung. | That cup is very cold. |
| 呢杯係乜嘢？ | nī būi haih māt yéh? | What is this cup? |
| 我要呢杯，唔該。 | ngóh yiu nī būi, m̀h gōi. | I will take this cup, please. |

### Day 33 (Orange, positions 161-165)

| New word | Yale | Meaning |
| --- | --- | --- |
| 161 鍾意 | jūng yi | to like |
| 162 太 | taai | too (much) |
| 163 咁 | gam | so (T2) |
| 164 真係 | jān haih | really (T2) |
| 165 最 | jeui | the most (T2) |

| Sentence | Yale | English |
| --- | --- | --- |
| 我鍾意奶茶。 | ngóh jūng yi náaih chàh. | I like milk tea. |
| 你鍾意食乜嘢？ | néih jūng yi sihk māt yéh? | What do you like to eat? |
| 呢杯太熱。 | nī būi taai yiht. | This cup is too hot. |
| 咁貴呀？ | gam gwai a? | So expensive? |
| 呢度真係好食。 | nī douh jān haih hóu sihk. | The food here is really good. |
| 我最鍾意食麵。 | ngóh jeui jūng yi sihk mihn. | I like noodles most. |
| 佢真係好開心。 | kéuih jān haih hóu hōi sām. | He is really happy. |

### Day 34 (Orange, positions 166-170)

| New word | Yale | Meaning |
| --- | --- | --- |
| 166 睇 | tái | see |
| 167 聽 | tēng | listen |
| 168 電話 | dihn wá | phone |
| 169 手機 | sáu gēi | mobile (cell) phone (T2) |
| 170 書 | syū | book (T2) |

| Sentence | Yale | English |
| --- | --- | --- |
| 我想睇書。 | ngóh séung tái syū. | I want to read a book. |
| 你睇乜嘢？ | néih tái māt yéh? | What are you looking at? |
| 我嘅手機好細。 | ngóh ge sáu gēi hóu sai. | My phone is very small. |
| 電話喺嗰度。 | dihn wá hái gó douh. | The phone is over there. |
| 你鍾意睇書？ | néih jūng yi tái syū? | Do you like reading? |
| 我今日睇書。 | ngóh gām yaht tái syū. | I read today. |
| 你聽電話。 | néih tēng dihn wá. | You answer the phone. |

### Day 35 (Orange, positions 171-175)

| New word | Yale | Meaning |
| --- | --- | --- |
| 171 衫 | sāam | clothes |
| 172 新 | sān | new |
| 173 靚 | leng | pretty (T2) |
| 174 件 | gihn | (mw for things, clothes, and items) |
| 175 買嘢 | máaih yéh | go shopping |

| Sentence | Yale | English |
| --- | --- | --- |
| 我想買新衫。 | ngóh séung máaih sān sāam. | I want to buy new clothes. |
| 呢件衫好靚。 | nī gihn sāam hóu leng. | This top is very pretty. |
| 嗰件幾多錢？ | gó gihn géi dō chín? | How much is that one? |
| 我今日去買嘢。 | ngóh gām yaht heui máaih yéh. | I am going shopping today. |
| 你鍾意呢件衫？ | néih jūng yi nī gihn sāam? | Do you like this top? |
| 呢件好貴，嗰件好平。 | nī gihn hóu gwai, gó gihn hóu pìhng. | This one is expensive, that one is cheap. |

### Day 36 (Orange, positions 176-180)

| New word | Yale | Meaning |
| --- | --- | --- |
| 176 咗 | jó | indicates a completed or finished action |
| 177 過 | gwo | indicates a past experience |
| 178 已經 | yíh gīng | already (T2) |
| 179 未 | meih | not yet |
| 180 仲 | juhng | still |

| Sentence | Yale | English |
| --- | --- | --- |
| 我食咗飯。 | ngóh sihk jó faahn. | I have eaten. |
| 你食咗飯未？ | néih sihk jó faahn meih? | Have you eaten yet? |
| 我未食飯。 | ngóh meih sihk faahn. | I have not eaten yet. |
| 我去過香港。 | ngóh heui gwo hēung góng. | I have been to Hong Kong. |
| 佢已經返咗屋企。 | kéuih yíh gīng fāan jó ūk kéi. | He has already gone home. |
| 你仲喺呢度呀？ | néih juhng hái nī douh a? | You are still here? |

### Day 37 (Orange, positions 181-185)

| New word | Yale | Meaning |
| --- | --- | --- |
| 181 先 | sīn | first |
| 182 都 | dōu | also |
| 183 又 | yauh | again (T2) |
| 184 好啦 | hóu lā | OK then |
| 185 好似 | hóu chíh | as if |

| Sentence | Yale | English |
| --- | --- | --- |
| 你先食。 | néih sīn sihk. | You go ahead and eat. |
| 我都想去。 | ngóh dōu séung heui. | I want to go too. |
| 佢又嚟呀？ | kéuih yauh làih a? | He is coming again? |
| 好啦，我哋一起去。 | hóu lā, ngóh deih yāt héi heui. | OK then, let us go together. |
| 呢個好似好食。 | nī go hóu chíh hóu sihk. | This looks tasty. |
| 佢好似好忙。 | kéuih hóu chíh hóu mòhng. | He seems very busy. |
| 我先去洗手間。 | ngóh sīn heui sái sáu gāan. | I will go to the toilet first. |

### Day 38 (Orange, positions 186-190)

| New word | Yale | Meaning |
| --- | --- | --- |
| 186 點解 | dím gáai | why |
| 187 幾時 | géi sìh | when |
| 188 幾 | géi | how many |
| 189 幾耐 | géi noih | how long |
| 190 做咩 | jouh mē | why |

| Sentence | Yale | English |
| --- | --- | --- |
| 點解你唔食？ | dím gáai néih m̀h sihk? | Why are you not eating? |
| 你幾時返屋企？ | néih géi sìh fāan ūk kéi? | When are you going home? |
| 你要幾個？ | néih yiu géi go? | How many do you want? |
| 你住咗幾耐？ | néih jyuh jó géi noih? | How long have you lived here? |
| 你做咩呀？ | néih jouh mē a? | What are you doing? |
| 我哋幾時去？ | ngóh deih géi sìh heui? | When are we going? |

### Day 39 (Orange, positions 191-195)

| New word | Yale | Meaning |
| --- | --- | --- |
| 191 左邊 | jó bīn | the left side (T2) |
| 192 右邊 | yauh bīn | the right (as opposed to left) side (T2) |
| 193 前面 | chìhn mihn | in front (T2) |
| 194 後面 | hauh mihn | back (T2) |
| 195 旁邊 | pòhng bīn | side, beside (T2) |

| Sentence | Yale | English |
| --- | --- | --- |
| 洗手間喺左邊。 | sái sáu gāan hái jó bīn. | The toilet is on the left. |
| 超市喺右邊。 | chīu síh hái yauh bīn. | The supermarket is on the right. |
| 學校喺前面。 | hohk haauh hái chìhn mihn. | The school is ahead. |
| 醫院喺後面。 | yī yún hái hauh mihn. | The hospital is behind. |
| 茶餐廳喺旁邊。 | chàh chāan tēng hái pòhng bīn. | The cha chaan teng is next door. |
| 唔好意思，洗手間喺左邊呀？ | m̀h hóu yi sih, sái sáu gāan hái jó bīn a? | Excuse me, is the toilet on the left? |

### Day 40 (Orange, positions 196-200)

| New word | Yale | Meaning |
| --- | --- | --- |
| 196 快 | faai | fast |
| 197 慢 | maahn | slow (T2) |
| 198 小巴 | síu bā | minibus (green or red) |
| 199 地鐵站 | deih tit jaahm | MTR station |
| 200 巴士站 | bā sí jaahm | bus stop |

| Sentence | Yale | English |
| --- | --- | --- |
| 地鐵好快。 | deih tit hóu faai. | The MTR is very fast. |
| 巴士好慢。 | bā sí hóu maahn. | The bus is very slow. |
| 小巴好快。 | síu bā hóu faai. | The minibus is very fast. |
| 地鐵站喺邊度？ | deih tit jaahm hái bīn douh? | Where is the MTR station? |
| 巴士站喺前面。 | bā sí jaahm hái chìhn mihn. | The bus stop is ahead. |
| 我哋喺地鐵站等。 | ngóh deih hái deih tit jaahm dáng. | We wait at the MTR station. |

## Free words (`free-words.csv`)

35 words a sentence may use without the learner having been taught them. Kinds: loanword 6, name 8, interjection 9, particle 12. Each row says why a beginner already has it; the Yale is checked with the app's Yale rules (`tools/yue_free_words.py`).

| Word | Yale | English | Kind | Why |
| --- | --- | --- | --- | --- |
| OK | ōu kēi | OK; fine | loanword | English OK, said everywhere in Hong Kong as ou1 kei1 |
| 哈囉 | hā lōu | hello (casual) | loanword | English hello, written 哈囉 in Hong Kong |
| 三文治 | sāam màhn jih | sandwich | loanword | sounds like sandwich; the only word Hong Kong uses |
| 麥當勞 | mahk dōng lòuh | McDonald's | loanword | the brand every visitor has seen; the Hong Kong name |
| 肯德基 | háng dāk gēi | KFC | loanword | the brand every visitor has seen; the Hong Kong name |
| 星巴克 | sīng bā hāk | Starbucks | loanword | the brand every visitor has seen; the Hong Kong name |
| 阿明 | a mìhng | Ah Ming (man) | name | common Hong Kong given name with 阿, for a male speaker or third person |
| 阿強 | a kèuhng | Ah Keung (man) | name | common Hong Kong given name with 阿, for a male speaker or third person |
| 大衛 | daaih waih | David (man) | name | the Chinese spelling of the English name David used in Hong Kong |
| 彼得 | béi dāk | Peter (man) | name | the Chinese spelling of the English name Peter used in Hong Kong |
| 阿欣 | a yān | Ah Yan (woman) | name | common Hong Kong given name with 阿, for a female speaker or third person |
| 阿芬 | a fān | Ah Fan (woman) | name | common Hong Kong given name with 阿, for a female speaker or third person |
| 瑪麗 | máh laih | Mary (woman) | name | the Chinese spelling of the English name Mary used in Hong Kong |
| 安娜 | ōn nàh | Anna (woman) | name | the Chinese spelling of the English name Anna used in Hong Kong |
| 哇 | wā | wow | interjection | wow: a reaction, not a word to learn |
| 嘩 | wā | wow (the other spelling) | interjection (also list word 20) | the same sound as 哇, spelled 嘩 in the word list (a list word, taught later) |
| 喂 | wai | hey; hello (on the phone) | interjection (also list word 84) | hey / hello on the phone: a calling sound; also a list word, taught later |
| 嗯 | ńg | mm; um (agreeing or thinking) | interjection (also list word 1046) | mm / um: a sound; also a list word, taught later |
| 哦 | òh | oh; I see | interjection | oh / I see: a reaction |
| 噢 | ō | oh! | interjection | oh!: a reaction |
| 哎 | āai | hey; oh dear | interjection | hey / oh dear: a reaction |
| 嘿 | hēi | hey | interjection | hey: calls someone, as in English |
| 哈 | hā | ha (laughing, or hey) | interjection | ha: laughter or a light hey |
| 呀 | a | (softening final particle) | particle (also list word 201) | sentence-final particle with no meaning of its own; the build checker already treats it as free |
| 啊 | a | (softening final particle) | particle (also list word 666) | same particle as 呀; the build checker already treats it as free |
| 啦 | lā | (final particle: OK then / do it) | particle (also list word 111) | sentence-final particle; the build checker already treats it as free |
| 喇 | la | (final particle: now / already) | particle (also list word 450) | sentence-final particle; the build checker already treats it as free |
| 囉 | lō | (final particle: of course) | particle (also list word 810) | sentence-final particle; the build checker already treats it as free |
| 嘛 | ma | (final particle: obviously) | particle (also list word 1640) | sentence-final particle; the build checker already treats it as free |
| 喎 | wo | (final particle: you know / reportedly) | particle (also list word 2468) | sentence-final particle; the build checker already treats it as free |
| 啩 | gwa | (final particle: probably) | particle (also list word 3146) | sentence-final particle; the build checker already treats it as free |
| 噃 | bo | (final particle: reminding) | particle | sentence-final particle; the build checker already treats it as free |
| 咯 | lo | (final particle: so it is) | particle | sentence-final particle; the build checker already treats it as free |
| 吖 | ā | (final particle: softening a request) | particle (also list word 3116) | sentence-final particle; the build checker already treats it as free |
| 啫 | jē | (final particle: only) | particle (also list word 3115) | sentence-final particle; the build checker already treats it as free |

Left out on purpose: MTR, app, WhatsApp, Wi-Fi, sorry (no single standard spoken reading), bye bye / taxi / bus (they are the list words 拜拜 的士 巴士). The only Latin-spelled free word is `OK`: the app's line check rejects Latin letters, so stage B must let a free word through it.

## Framing lines (`framing-lines.csv`)

The opening and closing lines of a track, like Mandarin's hello / mm / goodbye. They are free as framing from day 1 even before they are targets; `taught_day` is the day the word becomes a taught word.

| Role | Line | Yale | English | Time of day | Taught on day |
| --- | --- | --- | --- | --- | --- |
| open | 你好 | néih hóu | hello | any time | 1 |
| open | 早晨 | jóu sàhn | good morning | morning | 2 |
| open | 哈囉 | hā lōu | hello (casual) | any time | free (never taught) |
| open | 喂 | wai | hey; hello (calling someone, or on the phone) | any time | 45 |
| close | 再見 | joi gin | goodbye | any time | 2 |
| close | 拜拜 | bāai baai | bye bye | any time | 20 |
| close | 聽日見 | tīng yaht gin | see you tomorrow | any time | 20 |
| close | 早唞 | jóu táu | good night | evening / night | 28 |

## Stage fit: how many starter modules stage B must write

<!-- STAGE-FIT BEGIN -->
(generated by `python3 tools/yue_stage_fit.py --write-md`; the exact list is `starter-needs.csv`)

For every word of the first 200 positions: a learner who knows exactly the earlier words + that word + the free words + the framing lines; a module is **usable** when it fits the word (same cell, tier, not excluded) and every fixed word of its three lines is a word that learner knows (a {M} module also needs the word's classifier). The table counts the 4174 modules of `drafts/ALL-modules.csv`.

| Day | Words | 0 usable | 1 usable | 2 usable | 3+ usable |
| --- | --- | --- | --- | --- | --- |
| 1 | 5 | 5 | 0 | 0 | 0 |
| 2 | 5 | 5 | 0 | 0 | 0 |
| 3 | 5 | 5 | 0 | 0 | 0 |
| 4 | 5 | 5 | 0 | 0 | 0 |
| 5 | 5 | 5 | 0 | 0 | 0 |
| 6 | 5 | 5 | 0 | 0 | 0 |
| 7 | 5 | 4 | 1 | 0 | 0 |
| 8 | 5 | 5 | 0 | 0 | 0 |
| 9 | 5 | 5 | 0 | 0 | 0 |
| 10 | 5 | 5 | 0 | 0 | 0 |
| 11 | 5 | 5 | 0 | 0 | 0 |
| 12 | 5 | 5 | 0 | 0 | 0 |
| 13 | 5 | 5 | 0 | 0 | 0 |
| 14 | 5 | 5 | 0 | 0 | 0 |
| 15 | 5 | 5 | 0 | 0 | 0 |
| 16 | 5 | 5 | 0 | 0 | 0 |
| 17 | 5 | 5 | 0 | 0 | 0 |
| 18 | 5 | 4 | 1 | 0 | 0 |
| 19 | 5 | 5 | 0 | 0 | 0 |
| 20 | 5 | 5 | 0 | 0 | 0 |
| 21 | 5 | 5 | 0 | 0 | 0 |
| 22 | 5 | 4 | 1 | 0 | 0 |
| 23 | 5 | 5 | 0 | 0 | 0 |
| 24 | 5 | 5 | 0 | 0 | 0 |
| 25 | 5 | 4 | 1 | 0 | 0 |
| 26 | 5 | 4 | 1 | 0 | 0 |
| 27 | 5 | 3 | 2 | 0 | 0 |
| 28 | 5 | 5 | 0 | 0 | 0 |
| 29 | 5 | 0 | 5 | 0 | 0 |
| 30 | 5 | 4 | 1 | 0 | 0 |
| 31 | 5 | 5 | 0 | 0 | 0 |
| 32 | 5 | 3 | 2 | 0 | 0 |
| 33 | 5 | 5 | 0 | 0 | 0 |
| 34 | 5 | 3 | 2 | 0 | 0 |
| 35 | 5 | 4 | 0 | 1 | 0 |
| 36 | 5 | 5 | 0 | 0 | 0 |
| 37 | 5 | 2 | 1 | 2 | 0 |
| 38 | 5 | 1 | 1 | 3 | 0 |
| 39 | 5 | 5 | 0 | 0 | 0 |
| 40 | 5 | 2 | 0 | 3 | 0 |
| **All 40 days** | 200 | **172** | **19** | **9** | **0** |

**Summary.** 0 of the 200 words already have 3 or more usable modules; 172 have none, 19 one, 9 two. The shortfall (3 minus usable, summed over the 200 words that are short) is 563 module slots, but a starter module of a cell serves every LATER word of that cell, so planned cell by cell in teaching order the number of starter modules to WRITE is **286**, in 101 cells (160 of them are needed by White, positions 1-100, and 126 by Orange, 101-200; that is 858 lines to write). For the weaker target of ONE usable module per word, 88 starter modules would do.

A starter module is a normal gap-fill module (3 lines A / B / A, one `{W}` slot) of the word's cell whose fixed text uses only words taught by the word's position (plus free words and framing lines). It must carry a tier at least as high as the words it serves (a T2 word such as 再見 can only fill a T2-or-higher module), however simple its text. It then serves every later word of the cell with that tier or lower.

Cells that need starter modules (modules to write, in teaching order of the first word that needs them):

| Cell | Starter modules | First word that needs them (position) | Words of the cell in the first 200 (position) |
| --- | --- | --- | --- |
| X_PHRASE.GREET | 3 | 你好 (1) | 你好(1) 早晨(6) 再見(10) 拜拜(96) 聽日見(97) 早唞(140) |
| X_PRONOUN.PERSON | 3 | 我 (2) | 我(2) 你(3) 佢(11) 我哋(101) 你哋(102) 佢哋(103) |
| X_FUNCTION.BE | 3 | 係 (4) | 係(4) |
| X_FUNCTION.NEG | 3 | 唔 (5) | 唔(5) 未(179) |
| X_PHRASE.POLITE | 3 | 多謝 (7) | 多謝(7) 唔該(8) 對唔住(9) 唔好意思(86) 多謝晒(99) 唔該晒(100) |
| N_PERSONROLE.SOCIAL | 3 | 朋友 (12) | 朋友(12) |
| N_PERSONROLE.SCHOOL | 3 | 學生 (13) | 學生(13) 老師(83) |
| X_FUNCTION.POSSESS | 3 | 嘅 (14) | 嘅(14) |
| X_PHRASE.REPLY | 3 | 唔緊要 (15) | 唔緊要(15) 冇問題(98) 好啦(184) |
| X_ADVERB.DEGREE | 3 | 好 (16) | 好(16) 太(162) 咁(163) 真係(164) 最(165) |
| A_PERSONSTATE.HAPPY | 3 | 開心 (17) | 開心(17) |
| A_PERSONSTATE.TIRED | 3 | 忙 (18) | 忙(18) 累(19) |
| A_PERSONSTATE.HUNGRY | 3 | 餓 (20) | 餓(20) |
| X_FUNCTION.MODAL | 3 | 想 (21) | 想(21) 識(107) 會(121) 可以(122) 唔可以(123) |
| V_CONSUME.INTAKE | 3 | 食 (22) | 食(22) 飲(23) |
| N_DRINK.WATER | 3 | 水 (24) | 水(24) |
| N_DRINK.DRINK | 3 | 茶 (25) | 茶(25) 咖啡(29) 奶茶(30) 汽水(154) 可樂(155) |
| V_WANTLIKE.WANT | 3 | 要 (26) | 要(26) |
| N_FOODSTUFF.STAPLE | 3 | 飯 (27) | 飯(27) 多士(142) 麵包(145) 魚(149) 雞蛋(153) |
| N_DISH.MEAL | 3 | 麵 (28) | 麵(28) 早餐(141) 粥(146) 湯(147) 菜(150) |
| X_PRONOUN.DEMO | 3 | 呢個 (31) | 呢個(31) 嗰個(32) 呢度(43) 嗰度(44) 呢(156) 嗰(157) |
| X_QUESTION.WHAT | 3 | 乜嘢 (33) | 乜嘢(33) |
| A_TASTE.TASTE | 2 | 好食 (34) | 好食(34) |
| X_QUESTION.CHECK | 3 | 係咪 (35) | 係咪(35) 有冇(47) 得唔得(125) |
| V_MOVE.GOAL | 3 | 去 (36) | 去(36) 嚟(37) 返(38) |
| N_HOME.ROOM | 3 | 屋企 (39) | 屋企(39) |
| N_PLACE.STUDY | 3 | 學校 (40) | 學校(40) |
| X_QUESTION.WHERE | 3 | 邊度 (41) | 邊度(41) |
| X_FUNCTION.LOCATE | 3 | 喺 (42) | 喺(42) |
| X_FUNCTION.HAVE | 3 | 有 (45) | 有(45) 冇(46) |
| N_MONEY.MONEY | 3 | 錢 (48) | 錢(48) 蚊(49) |
| X_COUNTER.NUMBER | 3 | 一 (50) | 一(50) 兩(52) 三(53) 四(54) 五(55) 六(56) 七(57) 八(58) 九(59) 十(60) 二(61) |
| X_MEASURE.GENERAL | 3 | 個 (51) | 個(51) |
| X_COUNTER.BIGNUM | 3 | 百 (62) | 百(62) |
| X_QUESTION.HOWMANY | 3 | 幾多 (63) | 幾多(63) 幾(188) |
| A_THING.PRICE | 3 | 貴 (64) | 貴(64) |
| A_THING.TEXTURE | 3 | 平 (65) | 平(65) |
| A_THING.SIZE | 3 | 大 (66) | 大(66) 細(67) |
| A_THING.QUANTITY | 3 | 多 (68) | 多(68) |
| N_PERSONROLE.PEOPLE | 3 | 人 (69) | 人(69) |
| X_QUANTITY.PART | 3 | 少少 (70) | 少少(70) |
| T_TIME.DATE | 3 | 今日 (71) | 今日(71) 聽日(72) 琴日(73) |
| T_TIME.NOW | 3 | 而家 (74) | 而家(74) |
| X_QUESTION.WHEN | 3 | 幾點 (75) | 幾點(75) 幾時(187) |
| N_FAMILY.CLOSE | 3 | 媽媽 (76) | 媽媽(76) 爸爸(77) 哥哥(78) 姐姐(79) 弟弟(80) 妹妹(81) |
| N_PERSONROLE.JOB | 3 | 醫生 (82) | 醫生(82) |
| X_PROPER.PLACE | 3 | 香港 (84) | 香港(84) |
| N_PLACE.SERVICE | 3 | 公司 (85) | 公司(85) 醫院(90) |
| N_PLACE.TOILET | 2 | 洗手間 (87) | 洗手間(87) |
| N_PLACE.SHOP | 3 | 超市 (88) | 超市(88) |
| N_PLACE.EAT | 3 | 茶餐廳 (89) | 茶餐廳(89) |
| N_TRANSPORT.VEHICLE | 3 | 巴士 (91) | 巴士(91) 地鐵(92) 的士(93) 小巴(198) |
| V_MOVE.RIDE | 3 | 搭 (94) | 搭(94) |
| X_QUESTION.HOW | 3 | 點樣 (95) | 點樣(95) |
| X_FUNCTION.WITH | 3 | 同 (104) | 同(104) |
| X_ADVERB.MANNER | 3 | 一起 (105) | 一起(105) 慢慢(113) |
| V_COMMUNICATE.SPEAK | 3 | 講 (106) | 講(106) |
| N_STUDYWORK.LANGUAGE | 3 | 廣東話 (108) | 廣東話(108) 英文(109) |
| V_MIND.KNOW | 3 | 明白 (110) | 明白(110) 唔知(114) 知(115) |
| X_ADVERB.AGAIN | 3 | 再 (111) | 再(111) 仲(180) 又(183) |
| X_MEASURE.TIMES | 3 | 次 (112) | 次(112) |
| X_PARTICLE.QUESTION | 3 | 咩 (116) | 咩(116) |
| V_COMMUNICATE.GENERAL | 3 | 叫 (117) | 叫(117) |
| N_ABSTRACT.IDENTITY | 3 | 名字 (118) | 名字(118) |
| X_QUESTION.WHO | 3 | 邊個 (119) | 邊個(119) |
| X_COUNTER.AGE | 3 | 歲 (120) | 歲(120) |
| V_ROUTINE.BODY | 2 | 坐 (124) | 坐(124) |
| V_TRADE.BUY | 3 | 買 (126) | 買(126) 買嘢(175) |
| V_ROUTINE.GENERAL | 3 | 等 (127) | 等(127) 住(131) |
| V_COMMUNICATE.ASK | 3 | 問 (128) | 問(128) |
| V_MIND.PERCEIVE | 2 | 搵 (129) | 搵(129) |
| V_HANDLE.MAKE | 3 | 做 (130) | 做(130) |
| V_ROUTINE.WORK | 2 | 返工 (132) | 返工(132) |
| V_ROUTINE.STUDY | 2 | 學 (133) | 學(133) |
| V_SOCIAL.PLAY | 3 | 玩 (134) | 玩(134) |
| V_ROUTINE.REST | 3 | 瞓覺 (135) | 瞓覺(135) |
| N_TIMEUNIT.UNIT | 3 | 星期 (136) | 星期(136) |
| T_TIME.PARTOFDAY | 3 | 朝早 (137) | 朝早(137) 晚上(138) |
| X_COUNTER.TIME | 3 | 點鐘 (139) | 點鐘(139) |
| N_DISH.SNACK | 2 | 蛋撻 (143) | 蛋撻(143) 菠蘿包(144) |
| N_FOODSTUFF.MEAT | 3 | 肉 (148) | 肉(148) |
| N_FOODSTUFF.FRUIT | 3 | 生果 (151) | 生果(151) 蘋果(152) |
| N_ITEM.DAILY | 3 | 杯 (158) | 杯(158) |
| A_CONDITION.WEATHER | 3 | 熱 (159) | 熱(159) 凍(160) |
| V_WANTLIKE.LIKE | 3 | 鍾意 (161) | 鍾意(161) |
| V_CONSUME.SENSE | 2 | 睇 (166) | 睇(166) 聽(167) |
| N_DEVICE.GADGET | 3 | 電話 (168) | 電話(168) 手機(169) |
| N_STUDYWORK.DOCUMENT | 3 | 書 (170) | 書(170) |
| N_CLOTHES.GARMENT | 3 | 衫 (171) | 衫(171) |
| A_THING.AGE | 3 | 新 (172) | 新(172) |
| A_THING.LOOKS | 3 | 靚 (173) | 靚(173) |
| X_MEASURE.PART | 1 | 件 (174) | 件(174) |
| X_ASPECT.MARKER | 3 | 咗 (176) | 咗(176) 過(177) |
| X_ADVERB.TIME | 3 | 已經 (178) | 已經(178) 先(181) |
| X_FUNCTION.ADVERB | 1 | 都 (182) | 都(182) |
| X_FUNCTION.COMPARE | 3 | 好似 (185) | 好似(185) |
| X_QUESTION.WHY | 1 | 點解 (186) | 點解(186) 做咩(190) |
| X_QUESTION.HOWLONG | 2 | 幾耐 (189) | 幾耐(189) |
| X_ADVERB.PLACE | 3 | 左邊 (191) | 左邊(191) 右邊(192) 前面(193) 後面(194) 旁邊(195) |
| A_THING.GENERAL | 3 | 快 (196) | 快(196) 慢(197) |
| N_PLACE.PUBLIC | 1 | 地鐵站 (199) | 地鐵站(199) 巴士站(200) |

Per word (only the words below 3 usable modules): what a starter module for it can lean on. `leans on` = the words of the proof sentences of that word in this file (all taught by its position), other than the word itself; the free words (names, OK, particles) and the framing lines are always allowed as well. "Starters to write" 0 with 0 usable means an earlier word of the same cell already carries the starters that serve this word too.

| Pos | Word | Cell | Tier | Usable now | Starters to write | Can lean on (earlier words) |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 你好 | X_PHRASE.GREET | T1 | 0 | 3 |  |
| 2 | 我 | X_PRONOUN.PERSON | T1 | 0 | 3 |  |
| 3 | 你 | X_PRONOUN.PERSON | T1 | 0 | 0 |  |
| 4 | 係 | X_FUNCTION.BE | T1 | 0 | 3 | 我 你 |
| 5 | 唔 | X_FUNCTION.NEG | T1 | 0 | 3 | 我 係 你 |
| 6 | 早晨 | X_PHRASE.GREET | T1 | 0 | 0 |  |
| 7 | 多謝 | X_PHRASE.POLITE | T1 | 0 | 3 | 你 |
| 8 | 唔該 | X_PHRASE.POLITE | T1 | 0 | 0 |  |
| 9 | 對唔住 | X_PHRASE.POLITE | T1 | 0 | 0 | 我 唔 係 |
| 10 | 再見 | X_PHRASE.GREET | T2 | 0 | 0 | 多謝 |
| 11 | 佢 | X_PRONOUN.PERSON | T1 | 0 | 0 | 係 我 唔 你 |
| 12 | 朋友 | N_PERSONROLE.SOCIAL | T1 | 0 | 3 | 佢 係 我 唔 你 |
| 13 | 學生 | N_PERSONROLE.SCHOOL | T2 | 0 | 3 | 我 係 佢 唔 |
| 14 | 嘅 | X_FUNCTION.POSSESS | T1 | 0 | 3 | 係 我 朋友 佢 唔 你 |
| 15 | 唔緊要 | X_PHRASE.REPLY | T2 | 0 | 3 | 對唔住 |
| 16 | 好 | X_ADVERB.DEGREE | T1 | 0 | 3 | 我 佢 |
| 17 | 開心 | A_PERSONSTATE.HAPPY | T1 | 0 | 3 | 我 好 |
| 18 | 忙 | A_PERSONSTATE.TIRED | T2 | 0 | 3 | 佢 好 你 唔 |
| 19 | 累 | A_PERSONSTATE.TIRED | T2 | 0 | 0 | 我 好 |
| 20 | 餓 | A_PERSONSTATE.HUNGRY | T1 | 0 | 3 | 我 好 你 唔 |
| 21 | 想 | X_FUNCTION.MODAL | T1 | 0 | 3 | 我 你 唔 唔該 |
| 22 | 食 | V_CONSUME.INTAKE | T1 | 0 | 3 | 我 想 唔 |
| 23 | 飲 | V_CONSUME.INTAKE | T1 | 0 | 0 | 我 想 你 唔 唔該 |
| 24 | 水 | N_DRINK.WATER | T1 | 0 | 3 | 我 想 飲 唔該 |
| 25 | 茶 | N_DRINK.DRINK | T2 | 0 | 3 | 我 想 飲 你 唔 |
| 26 | 要 | V_WANTLIKE.WANT | T1 | 0 | 3 | 我 唔該 你 唔 |
| 27 | 飯 | N_FOODSTUFF.STAPLE | T1 | 0 | 3 | 你 要 唔 佢 想 食 我 |
| 28 | 麵 | N_DISH.MEAL | T2 | 0 | 3 | 我 想 食 佢 飯 |
| 29 | 咖啡 | N_DRINK.DRINK | T2 | 0 | 0 | 我 要 唔該 唔 |
| 30 | 奶茶 | N_DRINK.DRINK | T1 | 0 | 0 | 我 要 唔該 唔 咖啡 |
| 31 | 呢個 | X_PRONOUN.DEMO | T1 | 0 | 3 | 係 麵 |
| 32 | 嗰個 | X_PRONOUN.DEMO | T1 | 0 | 0 | 係 唔 |
| 33 | 乜嘢 | X_QUESTION.WHAT | T1 | 0 | 3 | 呢個 係 嗰個 你 想 食 飲 |
| 34 | 好食 | A_TASTE.TASTE | T1 | 1 | 2 | 呢個 嗰個 唔 |
| 35 | 係咪 | X_QUESTION.CHECK | T1 | 0 | 3 | 呢個 麵 |
| 36 | 去 | V_MOVE.GOAL | T1 | 0 | 3 | 我 你 唔 佢 |
| 37 | 嚟 | V_MOVE.GOAL | T1 | 0 | 0 | 我 你 唔 |
| 38 | 返 | V_MOVE.GOAL | T1 | 0 | 0 | 我 想 佢 去 |
| 39 | 屋企 | N_HOME.ROOM | T1 | 0 | 3 | 我 想 返 嚟 你 唔 佢 去 |
| 40 | 學校 | N_PLACE.STUDY | T2 | 0 | 3 | 我 去 你 唔 佢 返 屋企 |
| 41 | 邊度 | X_QUESTION.WHERE | T1 | 0 | 3 | 你 去 |
| 42 | 喺 | X_FUNCTION.LOCATE | T1 | 0 | 3 | 你 邊度 我 屋企 學校 |
| 43 | 呢度 | X_PRONOUN.DEMO | T1 | 0 | 0 | 喺 水 |
| 44 | 嗰度 | X_PRONOUN.DEMO | T1 | 0 | 0 | 學校 喺 咖啡 |
| 45 | 有 | X_FUNCTION.HAVE | T1 | 0 | 3 | 呢度 水 嗰度 咖啡 |
| 46 | 冇 | X_FUNCTION.HAVE | T1 | 0 | 0 | 我 呢度 水 |
| 47 | 有冇 | X_QUESTION.CHECK | T1 | 0 | 0 | 你 嗰度 咖啡 |
| 48 | 錢 | N_MONEY.MONEY | T1 | 0 | 3 | 我 冇 你 有冇 |
| 49 | 蚊 | N_MONEY.MONEY | T1 | 0 | 0 | 我 有 呢個 |
| 50 | 一 | X_COUNTER.NUMBER | T1 | 0 | 3 | 我 有 蚊 呢個 |
| 51 | 個 | X_MEASURE.GENERAL | T1 | 0 | 3 | 我 要 一 唔該 有 朋友 |
| 52 | 兩 | X_COUNTER.NUMBER | T1 | 0 | 0 | 我 有 個 朋友 |
| 53 | 三 | X_COUNTER.NUMBER | T1 | 0 | 0 | 我 要 個 唔該 |
| 54 | 四 | X_COUNTER.NUMBER | T1 | 0 | 0 | 嗰個 蚊 我 有 |
| 55 | 五 | X_COUNTER.NUMBER | T1 | 0 | 0 | 呢個 蚊 |
| 56 | 六 | X_COUNTER.NUMBER | T1 | 0 | 0 | 呢個 蚊 |
| 57 | 七 | X_COUNTER.NUMBER | T1 | 0 | 0 | 我 要 個 唔該 |
| 58 | 八 | X_COUNTER.NUMBER | T1 | 0 | 0 | 嗰個 蚊 |
| 59 | 九 | X_COUNTER.NUMBER | T1 | 0 | 0 | 我 有 蚊 |
| 60 | 十 | X_COUNTER.NUMBER | T1 | 0 | 0 | 我 有 個 朋友 蚊 唔該 |
| 61 | 二 | X_COUNTER.NUMBER | T1 | 0 | 0 | 十 蚊 唔該 |
| 62 | 百 | X_COUNTER.BIGNUM | T1 | 0 | 3 | 一 蚊 |
| 63 | 幾多 | X_QUESTION.HOWMANY | T1 | 0 | 3 | 呢個 錢 嗰個 你 有 |
| 64 | 貴 | A_THING.PRICE | T1 | 0 | 3 | 呢個 好 |
| 65 | 平 | A_THING.TEXTURE | T1 | 0 | 3 | 嗰個 好 |
| 66 | 大 | A_THING.SIZE | T1 | 0 | 3 | 我 嘅 學校 好 呢個 嗰個 |
| 67 | 細 | A_THING.SIZE | T1 | 0 | 0 | 我 屋企 好 呢個 大 嗰個 |
| 68 | 多 | A_THING.QUANTITY | T1 | 0 | 3 | 呢度 好 我 有 朋友 |
| 69 | 人 | N_PERSONROLE.PEOPLE | T1 | 0 | 3 | 呢度 好 多 嗰個 係 我 朋友 |
| 70 | 少少 | X_QUANTITY.PART | T1 | 0 | 3 | 我 有 錢 |
| 71 | 今日 | T_TIME.DATE | T1 | 0 | 3 | 我 好 忙 你 想 食 乜嘢 |
| 72 | 聽日 | T_TIME.DATE | T1 | 0 | 0 | 你 去 唔 學校 |
| 73 | 琴日 | T_TIME.DATE | T1 | 0 | 0 | 我 好 累 |
| 74 | 而家 | T_TIME.NOW | T1 | 0 | 3 | 我 想 返 屋企 |
| 75 | 幾點 | X_QUESTION.WHEN | T1 | 0 | 3 | 而家 |
| 76 | 媽媽 | N_FAMILY.CLOSE | T1 | 0 | 3 | 佢 係 我 喺 屋企 |
| 77 | 爸爸 | N_FAMILY.CLOSE | T1 | 0 | 0 | 我 好 忙 你 今日 去 邊度 |
| 78 | 哥哥 | N_FAMILY.CLOSE | T2 | 0 | 0 | 你 有冇 |
| 79 | 姐姐 | N_FAMILY.CLOSE | T2 | 0 | 0 | 我 有 一 個 |
| 80 | 弟弟 | N_FAMILY.CLOSE | T2 | 0 | 0 | 我 係 學生 |
| 81 | 妹妹 | N_FAMILY.CLOSE | T2 | 0 | 0 | 我 係 你 |
| 82 | 醫生 | N_PERSONROLE.JOB | T1 | 0 | 3 | 我 妹妹 係 |
| 83 | 老師 | N_PERSONROLE.SCHOOL | T2 | 0 | 0 | 我 爸爸 係 你 妹妹 |
| 84 | 香港 | X_PROPER.PLACE | T2 | 0 | 3 | 我 係 人 你 唔 |
| 85 | 公司 | N_PLACE.SERVICE | T2 | 0 | 3 | 我 哥哥 喺 你 嘅 邊度 |
| 86 | 唔好意思 | X_PHRASE.POLITE | T1 | 0 | 0 | 喺 邊度 |
| 87 | 洗手間 | N_PLACE.TOILET | T1 | 1 | 2 | 唔好意思 喺 邊度 |
| 88 | 超市 | N_PLACE.SHOP | T1 | 0 | 3 | 喺 嗰度 我 想 去 |
| 89 | 茶餐廳 | N_PLACE.EAT | T1 | 0 | 3 | 唔好意思 喺 邊度 你 去 唔 |
| 90 | 醫院 | N_PLACE.SERVICE | T2 | 0 | 0 | 我 媽媽 喺 |
| 91 | 巴士 | N_TRANSPORT.VEHICLE | T1 | 0 | 3 | 我 |
| 92 | 地鐵 | N_TRANSPORT.VEHICLE | T1 | 0 | 0 | 我 返 屋企 |
| 93 | 的士 | N_TRANSPORT.VEHICLE | T2 | 0 | 0 | 你 想 我 去 醫院 |
| 94 | 搭 | V_MOVE.RIDE | T2 | 0 | 3 | 我 巴士 地鐵 返 屋企 你 想 的士 去 醫院 |
| 95 | 點樣 | X_QUESTION.HOW | T1 | 0 | 3 | 你 去 學校 佢 公司 |
| 96 | 拜拜 | X_PHRASE.GREET | T1 | 0 | 0 |  |
| 97 | 聽日見 | X_PHRASE.GREET | T3 | 0 | 0 |  |
| 98 | 冇問題 | X_PHRASE.REPLY | T1 | 0 | 0 |  |
| 99 | 多謝晒 | X_PHRASE.POLITE | T1 | 0 | 0 |  |
| 100 | 唔該晒 | X_PHRASE.POLITE | T1 | 0 | 0 |  |
| 101 | 我哋 | X_PRONOUN.PERSON | T1 | 0 | 0 | 去 食 飯 今日 茶餐廳 |
| 102 | 你哋 | X_PRONOUN.PERSON | T1 | 0 | 0 | 想 食 乜嘢 |
| 103 | 佢哋 | X_PRONOUN.PERSON | T1 | 0 | 0 | 係 我 朋友 |
| 104 | 同 | X_FUNCTION.WITH | T1 | 0 | 3 | 我 朋友 去 超市 你 |
| 105 | 一起 | X_ADVERB.MANNER | T1 | 0 | 3 | 我哋 去 食 飯 我 同 朋友 超市 你 |
| 106 | 講 | V_COMMUNICATE.SPEAK | T1 | 0 | 3 | 我 少少 你 唔 佢 |
| 107 | 識 | X_FUNCTION.MODAL | T1 | 0 | 0 | 我 講 少少 你 唔 佢 |
| 108 | 廣東話 | N_STUDYWORK.LANGUAGE | T1 | 1 | 2 | 我 識 講 少少 佢 唔 |
| 109 | 英文 | N_STUDYWORK.LANGUAGE | T2 | 0 | 1 | 你 識 唔 講 |
| 110 | 明白 | V_MIND.KNOW | T2 | 0 | 3 | 我 唔 你 |
| 111 | 再 | X_ADVERB.AGAIN | T1 | 0 | 3 | 唔該 講 一 我 聽日 嚟 |
| 112 | 次 | X_MEASURE.TIMES | T2 | 0 | 3 | 唔該 再 講 一 |
| 113 | 慢慢 | X_ADVERB.MANNER | T2 | 0 | 0 | 唔該 講 |
| 114 | 唔知 | V_MIND.KNOW | T1 | 0 | 0 | 我 你 洗手間 喺 邊度 對唔住 |
| 115 | 知 | V_MIND.KNOW | T1 | 0 | 0 | 你 唔知 洗手間 喺 邊度 |
| 116 | 咩 | X_PARTICLE.QUESTION | T2 | 0 | 3 | 你 朋友 |
| 117 | 叫 | V_COMMUNICATE.GENERAL | T2 | 0 | 3 | 你 咩 我 朋友 |
| 118 | 名字 | N_ABSTRACT.IDENTITY | T1 | 0 | 3 | 你 叫 咩 朋友 |
| 119 | 邊個 | X_QUESTION.WHO | T1 | 0 | 3 | 你 係 佢 |
| 120 | 歲 | X_COUNTER.AGE | T2 | 0 | 3 | 你 幾多 我 二 十 |
| 121 | 會 | X_FUNCTION.MODAL | T1 | 0 | 0 | 我 講 廣東話 你 唔 英文 |
| 122 | 可以 | X_FUNCTION.MODAL | T1 | 0 | 0 | 你 食 呢個 |
| 123 | 唔可以 | X_FUNCTION.MODAL | T1 | 0 | 0 | 呢度 |
| 124 | 坐 | V_ROUTINE.BODY | T1 | 1 | 2 | 我 呢度 唔可以 |
| 125 | 得唔得 | X_QUESTION.CHECK | T2 | 0 | 0 | 我 坐 呢度 |
| 126 | 買 | V_TRADE.BUY | T1 | 0 | 3 | 我 想 奶茶 你 乜嘢 |
| 127 | 等 | V_ROUTINE.GENERAL | T1 | 0 | 3 | 我 朋友 你 邊個 |
| 128 | 問 | V_COMMUNICATE.ASK | T1 | 0 | 3 | 我 想 你 |
| 129 | 搵 | V_MIND.PERCEIVE | T1 | 1 | 2 | 我 洗手間 |
| 130 | 做 | V_HANDLE.MAKE | T1 | 0 | 3 | 你 今日 咩 |
| 131 | 住 | V_ROUTINE.GENERAL | T1 | 0 | 0 | 我 喺 香港 你 邊度 |
| 132 | 返工 | V_ROUTINE.WORK | T1 | 1 | 2 | 我 聽日 你 今日 返 唔 |
| 133 | 學 | V_ROUTINE.STUDY | T1 | 1 | 2 | 我 想 廣東話 |
| 134 | 玩 | V_SOCIAL.PLAY | T2 | 0 | 3 | 我哋 一起 |
| 135 | 瞓覺 | V_ROUTINE.REST | T1 | 0 | 3 | 我 而家 想 |
| 136 | 星期 | N_TIMEUNIT.UNIT | T2 | 0 | 3 | 我 五 返工 |
| 137 | 朝早 | T_TIME.PARTOFDAY | T2 | 0 | 3 | 我 七 返工 你 食 咩 |
| 138 | 晚上 | T_TIME.PARTOFDAY | T2 | 0 | 0 | 我 十 瞓覺 |
| 139 | 點鐘 | X_COUNTER.TIME | T2 | 0 | 3 | 我 朝早 七 返工 晚上 十 瞓覺 而家 |
| 140 | 早唞 | X_PHRASE.GREET | T3 | 0 | 0 |  |
| 141 | 早餐 | N_DISH.MEAL | T1 | 1 | 0 | 我 朝早 食 我哋 一起 |
| 142 | 多士 | N_FOODSTUFF.STAPLE | T1 | 1 | 0 | 我 想 食 |
| 143 | 蛋撻 | N_DISH.SNACK | T1 | 1 | 2 | 我 要 一 個 唔該 |
| 144 | 菠蘿包 | N_DISH.SNACK | T1 | 1 | 0 | 呢個 好食 |
| 145 | 麵包 | N_FOODSTUFF.STAPLE | T1 | 1 | 0 | 你 想 食 |
| 146 | 粥 | N_DISH.MEAL | T1 | 1 | 0 | 我 想 食 |
| 147 | 湯 | N_DISH.MEAL | T2 | 0 | 0 | 呢個 好食 我 要 一 個 唔該 |
| 148 | 肉 | N_FOODSTUFF.MEAT | T2 | 0 | 3 | 我 唔 食 |
| 149 | 魚 | N_FOODSTUFF.STAPLE | T2 | 0 | 0 | 我 食 |
| 150 | 菜 | N_DISH.MEAL | T2 | 0 | 0 | 你 想 食 |
| 151 | 生果 | N_FOODSTUFF.FRUIT | T2 | 0 | 3 | 你 想 食 |
| 152 | 蘋果 | N_FOODSTUFF.FRUIT | T2 | 0 | 0 | 我 想 食 要 一 個 |
| 153 | 雞蛋 | N_FOODSTUFF.STAPLE | T2 | 0 | 0 | 我 朝早 食 |
| 154 | 汽水 | N_DRINK.DRINK | T1 | 0 | 0 | 你 想 飲 |
| 155 | 可樂 | N_DRINK.DRINK | T1 | 0 | 0 | 我 要 唔該 |
| 156 | 呢 | X_PRONOUN.DEMO | T1 | 1 | 0 | 好 係 乜嘢 我 要 唔該 |
| 157 | 嗰 | X_PRONOUN.DEMO | T1 | 1 | 0 | 好 |
| 158 | 杯 | N_ITEM.DAILY | T2 | 0 | 3 | 我 要 一 茶 呢 好 嗰 係 乜嘢 唔該 |
| 159 | 熱 | A_CONDITION.WEATHER | T2 | 0 | 3 | 我 要 奶茶 一 杯 茶 呢 好 |
| 160 | 凍 | A_CONDITION.WEATHER | T2 | 0 | 0 | 我 要 咖啡 嗰 杯 好 |
| 161 | 鍾意 | V_WANTLIKE.LIKE | T1 | 0 | 3 | 我 奶茶 你 食 乜嘢 麵 |
| 162 | 太 | X_ADVERB.DEGREE | T1 | 0 | 0 | 呢 杯 熱 |
| 163 | 咁 | X_ADVERB.DEGREE | T2 | 0 | 0 | 貴 |
| 164 | 真係 | X_ADVERB.DEGREE | T2 | 0 | 0 | 呢度 好食 佢 好 開心 |
| 165 | 最 | X_ADVERB.DEGREE | T2 | 0 | 0 | 我 鍾意 食 麵 |
| 166 | 睇 | V_CONSUME.SENSE | T1 | 1 | 2 | 我 想 你 乜嘢 鍾意 今日 |
| 167 | 聽 | V_CONSUME.SENSE | T1 | 1 | 0 | 你 |
| 168 | 電話 | N_DEVICE.GADGET | T1 | 0 | 3 | 喺 嗰度 你 聽 |
| 169 | 手機 | N_DEVICE.GADGET | T2 | 0 | 0 | 我 嘅 好 細 |
| 170 | 書 | N_STUDYWORK.DOCUMENT | T2 | 0 | 3 | 我 想 睇 你 鍾意 今日 |
| 171 | 衫 | N_CLOTHES.GARMENT | T1 | 0 | 3 | 我 想 買 呢 好 你 鍾意 |
| 172 | 新 | A_THING.AGE | T1 | 0 | 3 | 我 想 買 衫 |
| 173 | 靚 | A_THING.LOOKS | T2 | 0 | 3 | 呢 衫 好 |
| 174 | 件 | X_MEASURE.PART | T1 | 2 | 1 | 呢 衫 好 靚 嗰 幾多 錢 你 鍾意 貴 平 |
| 175 | 買嘢 | V_TRADE.BUY | T1 | 0 | 0 | 我 今日 去 |
| 176 | 咗 | X_ASPECT.MARKER | T1 | 0 | 3 | 我 食 飯 你 佢 返 屋企 |
| 177 | 過 | X_ASPECT.MARKER | T1 | 0 | 0 | 我 去 香港 |
| 178 | 已經 | X_ADVERB.TIME | T2 | 0 | 3 | 佢 返 咗 屋企 |
| 179 | 未 | X_FUNCTION.NEG | T1 | 0 | 0 | 你 食 咗 飯 我 |
| 180 | 仲 | X_ADVERB.AGAIN | T1 | 0 | 0 | 你 喺 呢度 |
| 181 | 先 | X_ADVERB.TIME | T1 | 2 | 0 | 你 食 我 去 洗手間 |
| 182 | 都 | X_FUNCTION.ADVERB | T1 | 2 | 1 | 我 想 去 |
| 183 | 又 | X_ADVERB.AGAIN | T2 | 0 | 0 | 佢 嚟 |
| 184 | 好啦 | X_PHRASE.REPLY | T1 | 1 | 0 | 我哋 一起 去 |
| 185 | 好似 | X_FUNCTION.COMPARE | T1 | 0 | 3 | 呢個 好食 佢 好 忙 |
| 186 | 點解 | X_QUESTION.WHY | T1 | 2 | 1 | 你 唔 食 |
| 187 | 幾時 | X_QUESTION.WHEN | T1 | 0 | 0 | 你 返 屋企 我哋 去 |
| 188 | 幾 | X_QUESTION.HOWMANY | T1 | 2 | 0 | 你 要 個 |
| 189 | 幾耐 | X_QUESTION.HOWLONG | T1 | 1 | 2 | 你 住 咗 |
| 190 | 做咩 | X_QUESTION.WHY | T1 | 2 | 0 | 你 |
| 191 | 左邊 | X_ADVERB.PLACE | T2 | 0 | 3 | 洗手間 喺 唔好意思 |
| 192 | 右邊 | X_ADVERB.PLACE | T2 | 0 | 0 | 超市 喺 |
| 193 | 前面 | X_ADVERB.PLACE | T2 | 0 | 0 | 學校 喺 |
| 194 | 後面 | X_ADVERB.PLACE | T2 | 0 | 0 | 醫院 喺 |
| 195 | 旁邊 | X_ADVERB.PLACE | T2 | 0 | 0 | 茶餐廳 喺 |
| 196 | 快 | A_THING.GENERAL | T1 | 0 | 3 | 地鐵 好 |
| 197 | 慢 | A_THING.GENERAL | T2 | 0 | 0 | 巴士 好 |
| 198 | 小巴 | N_TRANSPORT.VEHICLE | T1 | 2 | 0 | 好 快 |
| 199 | 地鐵站 | N_PLACE.PUBLIC | T1 | 2 | 1 | 喺 邊度 我哋 等 |
| 200 | 巴士站 | N_PLACE.PUBLIC | T1 | 2 | 0 | 喺 前面 |

<!-- STAGE-FIT END -->
