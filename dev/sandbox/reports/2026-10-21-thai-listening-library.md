# Thai Listening to 7.5/10: a library of written conversations (21 Oct)

The owner asked: "now get the listening track to 7.5", Thai only. Japanese and Mandarin Listening are unchanged.

**Not released.** The work is on the development branch, waiting for the owner's "go live".

## Result

All scores come from the same strict blind reviewer, with two independent reviews per track:
- **Rubric:** Thai 35 %, story and coherence 25 %, lesson words 20 %, English 10 %, romanisation 10 %.
- **Standard:** "merely understandable is a defect".

Every track was built on the owner's profile by the app's own Listening path.

| Track | Composer | Result | Requests / cost | Blind reviews | Mean |
|---|---|---|---|---|---|
| L1 (baseline) | model writer | NOT_READY; only 9 of 30 words left after salvage | 25 / US$0.087 | — | — |
| L3 | one bank exchange per word | READY, 29/30, 91 turns | 1 / ~US$0.0004 | 5.9 · 5.7 | 5.8 |
| Pilot: wedding | library | READY, 30/30, 55 turns | 0 | 7.9 · 8.6 | 8.25 |
| Pilot: trust between friends | library | READY, 30/30 | 0 | 7.7 · 8.2 | 7.95 |
| Pilot: trip up north | library | READY, 30/30 | 1 gloss fill | 7.8 · 7.3 | 7.55 |
| **Day 1: lending money (C39)** | library | READY, 30/30, 50 turns | 0 | **8.2 · 7.7** | **7.95** |
| **Day 3: a shy new boyfriend (C21)** | library | READY, 30/30, 56 turns | 0 | **8.3 · 8.3** | **8.3** |
| **Day 5: acne before the wedding (C29)** | library | READY, 30/30, 56 turns | 1 gloss fill | **7.7 · 8.2** | **7.95** |
| **Day 6: the fridge and the air-con (C40)** | library | READY, 30/30, 53 turns | 1 gloss fill | **7.9 · 7.8** | **7.85** |
| **Live run L4** (Haiku, real path) | library | READY, 30/30, picked C39 | 0 / US$0.00, 11 s | — | — |

- **The day tracks.** They come from six successive Listening tracks on the owner's profile in one session. The app picked six different conversations.
- **The four tracks reviewed.** None of those conversations had been seen by any reviewer, and their writers never saw a review.
- **Their scores.** The mean is **8.0**, and all eight reviews are 7.7 or above.
- **After the reviews.** The four conversations were then revised from the reviewers' notes, so the library in the build is a little better than what was scored.

## Why the earlier approach could not reach 7.5

The bank-first track (v710) heard every lesson word in its vetted three-line exchange. The Thai was good (6.5–7), but story and coherence scored 2/10. The reviewers' comments:
- "drill blocks";
- the same speaker twice in a row about 29 times;
- questions left unanswered;
- plans that contradict each other.

Separate exchanges cannot make one conversation, and a model writer composing a whole conversation from 30 fixed words under the closed vocabulary failed outright (L1).

## What changed

### 1. A library of whole conversations, written and reviewed offline

The library lives in `sandbox/curriculum/thai-listening-library` and holds 52 conversations (2,785 turns).

Each conversation:
- is one continuous story in 3–5 scenes: a plan, a small problem, how it turns out;
- has 40–56 turns between two friends (A: ผม / ครับ; B: ฉัน / ค่ะ / คะ);
- uses only words the owner has been taught, with no line longer than the belt allows (7 words).

Topics include a beach weekend, a wedding, Songkran, Loy Krathong, a seafood dinner, cooking, moving room, a losing shop, an urgent email, a traffic jam, getting around Bangkok, a sale, the fruit market, exam week, a forgotten passport, a power cut, a new phone, the post office, the zoo, a Shan ordination, grandma's village, acne, Muay Thai, a guesthouse, appendicitis, an old school friend, a business visitor, lending money, train tickets, a daughter's first school day, a housewarming and more.

Process:
- **Authoring brief (AUTHOR.md).** Each conversation was written to it.
- **Second-writer review (REVIEW.md).** A different writer then reviewed each one. The brief draws on the pilot's blind reviews: contradictions, timeline, unexplained events, roles, collocations, คุณ overuse, and English that matches the Thai.
- **Offline check (check.js).** Every conversation must pass the app's own Listening line checks on the owner's vocabulary, with no model call:
  - closed vocabulary;
  - length;
  - speaker particles and pronouns;
  - line quality;
  - duplicates;
  - scenes;
  - a greeting only in the first scene and a goodbye only in the last;
  - never three turns in a row by one speaker;
  - the line the app would actually play;
  - pronunciation.

### 2. The app picks the conversation, and its due words become the lesson words

For a new Thai Listening Track, the app takes the learner's due Listening words in revision order (the same pool as before).
- **Pick.** It chooses the conversation that holds the most of them, weighted towards the most due. A recently played conversation (the last 8) is skipped.
- **Lesson words.** The due words heard in it, up to 30 and never more than 3 in one line, become the frozen lesson words. The other due words simply stay due for Revision.
- **Integrity.** A conversation that fails any deterministic gate for this learner is never picked. The track still goes through every gate afterwards: coverage, closed vocabulary, length, max 3 words per line, duplicates, scenes, continuity and pronunciation.
- **No paid judging.** There is no paid writing or judging of the conversation, which was written and reviewed offline.
- **Rebuild.** A Rebuild keeps its 30 frozen words and finds a conversation that holds all of them.
- **Fallback.** If no conversation fits (a learner with fewer words, or a lower belt), the existing bank and model composers run as before.

### 3. Romanisation

Twelve dictionary readings were corrected after the reviewers flagged them:

| Word | Reading |
|---|---|
| หล่อ | lɔ̀ɔ |
| เอว | eeo |
| รู้สึก | rúu-sùek |
| หมู่บ้าน | mùu-bâan |
| วิถีชีวิต | wí-thǐi- |
| คดเคี้ยว | khót-khíao |
| อินเทอร์เน็ต | in-thəə-nét |
| ตื่นเต้น | dtùuen-dtên |
| องศาเซลเซียส | ong-sǎa-sen-sîat |

ออฟฟิศ stays áawf-fít: an earlier review settled that reading, which tests63 R7 checks, and the two reviewers here disagreed.

## Tests

- **tests64 (new), 9/9:**
  - the pick follows revision order, with at most 3 lesson words per line;
  - recent conversations are skipped;
  - a Rebuild keeps its frozen ids;
  - a conversation with an untaught word is never picked, and the reason is logged;
  - end to end it is READY with the conversation exactly as written and no paid writing, repair or judging call;
  - the conversation is remembered;
  - the library is off when the vetted content is off;
  - a structure lint covers every embedded conversation.
- **Other suites:** tests63 80/80, tests60 36/36, tests54 57/57, tests17 49/49.
- **Full suite:** see below.

## Spend

The library approach costs nothing per track: the live run sent 0 requests. Earlier Listening runs this round (L1–L3) cost about US$0.09. Session total: about US$1.97 of the US$4.00 cap.

## Limits

- **The library fits the owner's vocabulary.**
  - It was written with the owner's ~918 taught words. A learner who knows fewer words will find fewer (or no) conversations that pass, and then gets the earlier composers.
  - Common words the owner has not been taught (คุย, แค่, เอง, ยืม, หนาว, เดือนหน้า) could not be used, so some lines are a little stiffer than a native would say. Reviewers noted this.
- **Not every most-due word is heard.** Each conversation holds 2–8 of the owner's 60 most-due words and over 100 of the 839 due words. The other most-due words stay due for Revision rather than being forced into an unnatural line.
- **Variety.** With 52 conversations and the last 8 skipped, a conversation repeats after many tracks. More conversations can be added the same way: write, review, check, embed.
- **Remaining reviewer notes are line-level:**
  - a particle after each clause;
  - คุณ between friends;
  - a few clipped lines;
  - hyphenation of a few multi-word dictionary entries in the romanisation.

## TL;DR

Thai Listening now plays a whole conversation written and reviewed in advance, instead of 30 separate drill exchanges. The app picks the conversation that holds the most of the learner's due words, and those words become the lesson words.

- **Scores:** four tracks from conversations no reviewer had seen score **8.0** on average in blind review, with all eight reviews 7.7–8.3. That is up from 5.8 for the bank-first track; the model writer failed outright (NOT_READY).
- **Cost:** each track costs nothing (no model calls).
- **Gates:** every deterministic gate still runs.
- **Live check:** a live run on the owner's profile came back READY 30/30 in 11 seconds.
- **Release:** not released; waiting for the owner's "go live".
