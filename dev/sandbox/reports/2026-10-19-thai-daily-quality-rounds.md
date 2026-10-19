# Thai Daily quality rounds after the 501–800 update (19 Oct)

Goal from the owner: "keep testing until the tracks are 8–8.5/10".
Status: **not reached.** Four tracks were rated blind; all scored between 6.2 and 6.5. Nothing has been deployed.

## How it was tested

- **Track generation.** The real app path ran on the owner's profile (backup 2026-10-15, never committed): `pickWords` → scene → generation → QC → quota recovery → final audit → the app's own export. Every model request was answered by a Claude Haiku stand-in through a file queue (`sandbox/daily-relay/bridge-daily.js`), at no API cost. Each track takes about 126–133 requests.
- **Words.** The same 30 words were used every time (5 new, 25 review), so tracks can be compared.
- **Rating.** An independent reviewer rated each track blind, reading only the exported lines. It used the owner's rubric:

  | Area | Weight |
  |---|---|
  | Thai correctness and naturalness | 35% |
  | English cues and translations | 20% |
  | Vocabulary practice | 20% |
  | Romanisation | 15% |
  | Coherence | 10% |

## Results

| Track | Total | Thai | Cue / EN | Vocab | Roman | Coherence | Notes |
|---|---|---|---|---|---|---|---|
| 1 | 6.5 | 6.0 | 7.5 | 7.5 | 5.0 | 6.5 | Baseline after the 501–800 data |
| 2 | 6.4 | 6.5 | 6.5 | 6.0 | **8.0** | 4.5 | Romanisation fixed; line 3 often ignored line 2 |
| 3 | 6.2 | 6.0 | 6.5 | 6.0 | 7.5 | 5.0 | Exchanges answer better; new forced-Thai cases (ครึ่งพัน) |
| 4 | 6.3 | 6.5 | 6.5 | 6.0 | 7.0 | 4.5 | Lines in A-B-A order; coherence judge sees real order |

All four tracks were READY 90/90, with technical reliability rated 8–10.

## What was fixed (all pushed, `tests63` 22/22)

**Romanisation**
- Unaspirated ป, ต and ก are now spelled bp, dt and g in 167 dictionary entries.
- Long vowels are now written long when shown: ชอบ châawp, ต้อง dtâawng, เงิน ngooen.
- Tone and vowel-length errors were corrected in 25 dictionary words, plus the compounds that contain them:
  - ห้าทุ่ม, จริงเหรอ, ทะเล, ตึก;
  - ร้อน, ห้อง, น้อง, ส้อม, ข่าว, ดื่ม, ครอบครัว and others.
- The app's one-syllable checker now flags only ยาวเฟื้อย, a two-word entry it misreads.
- The old v684 correction table now uses the same convention as the dictionary.

**Conversation structure**
- **Writer rule:** the three lines of a word are one exchange. Line 3 answers line 2, roles stay straight, and nothing contradicts an earlier line.
- **Speaker slots:** a regenerated line only fills a slot of its own speaker. This removes the A-A-A monologues where a man's line took the woman's slot.
- **Line order:** each word's lines are put back in A-B-A order, but only when that repairs the turn-taking.
- **Coherence judge:** it now reads the lines in the track's real order. Before, it saw every word's line 1, then every line 2.

**Generation inputs**
- Number words (ศูนย์, พัน, ครึ่ง) no longer get a random extra number forced in. For other words, the number hint is now an example, not an order.
- Thai compounds on a noun head (ทางออก, เครื่องดื่ม …) are briefed as nouns, not verbs.

**Framing lines**
- No Thai name inside an English cue.
- A "you too" reply is changed when the closing it answered was replaced.
- Every English line now ends with punctuation, and whether it is a question is decided from the Thai.

**Naturalness guidance and rules**
- The writer and the native-speaker checker share about 15 new guidance lines for recurring errors, including:
  - English word order;
  - offers with เดี๋ยว…ให้นะ and conditionals with ถ้า…ก็/จะ;
  - บางที + อาจจะ for "maybe";
  - แล้วหรือยัง for "yet?";
  - ไม่ใช่ทุกวัน, ห้าร้อย, นึกว่า, บนโต๊ะ;
  - a classifier with นี้.
- Six deterministic rules were added for common errors:
  - travelling by vehicle with ไปรถ…;
  - บางที inside a ไหม question;
  - แล้วไหม for "yet?";
  - ไม่ทุกวัน;
  - ครึ่งพัน for 500;
  - นะค่ะ, corrected automatically to นะคะ.

## Regression suite

The full run shows the same 11 known failures as the integration report: 8 that predate this work and 3 intentional ones. There are no new regressions.

Five expectation changes were made on purpose, each with a comment in the test:
- **tests17 G2:** the dictionary now spells it bplàwt.
- **tests34 1L/1M:** a man's line no longer takes the woman's slot.
- **tests44 V3/T3/G1th:** spelling-only differences, and fixtures updated to the dictionary spelling.
- **tests47 P4/P6:** long ɔɔ is written aaw; กระ is spelled grà.

## Why the score has stalled

Every round removes the specific defects the reviewer named, but the reviewer then finds new instances of the same two kinds:

1. **Forced Thai built around a target word.** Examples: ครึ่งพัน, ที่นี่ for "right here", and three near-identical uses of one word.
2. **Replies that don't follow the previous line.** This happens mostly where a slot was regenerated or a line came from quota recovery. Those lines are written with only partial context. Some checking stages deliberately judge the three lines as unrelated alternatives, not as one conversation.

The tracks are also written by free Haiku stand-ins, not the paid Haiku path. A coherence of 4.5–5 out of 10 accounts for most of the gap; the weighted Thai and vocabulary scores sit at 6–6.5.

Reaching 8 most likely needs a structural change rather than more rules. The main candidate is one final pass per mini-scene that rewrites the scene's lines together with full context and is then re-checked. It costs one or two extra model calls per scene, about 6–8 per track. This changes cost and architecture, so it is the owner's decision.

## TL;DR

- Four blind-rated tracks on the owner's profile scored 6.5, 6.4, 6.2 and 6.3. The 8–8.5 target is not reached, and nothing has been deployed.
- Romanisation went from 5.0 to 7–8. Speaker order, line order, number forcing, noun roles, punctuation and about 40 dictionary spellings are fixed, with tests63 at 22/22 and no new regressions.
- The remaining gap is mostly coherence (4.5–5) and forced Thai in lines written outside their exchange. Closing it likely needs a per-scene rewrite pass, about 6–8 extra calls per track, or paid Haiku testing. Both are owner decisions.
