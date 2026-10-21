# Thai Daily v709: curated exchange bank (21 Oct)

The owner asked: "please get to at least 7/10". Nothing in this report has been deployed.

## Result

All scores come from the same calibrated blind reviewer: strict, with "merely understandable is a defect".

| Track | Words | Build | Result | Cost | Blind review |
|---|---|---|---|---|---|
| live v707 (owner's own rating) | owner's 30 | v707 | READY | ≈US$0.25 | 6.0 |
| paid 7 | owner's 30 | v708 | READY 90/90 | US$0.216 | 5.5 |
| paid 9 | owner's 30 | bank (30 words) + trust | READY 90/90 | US$0.049 | **7.4** |
| paid 11 | 30 different words | reviewed bank (934) | READY 90/90 | US$0.036 | **7.4** |
| paid 12 | a third set of 30 | reviewed bank + cue protection | 90/90 (held only by one empty dictionary reading, now fixed) | US$0.046 | **7.4** |

Three independent word sets each score 7.4, about a quarter of v707's cost per track.

## Why the earlier approach stopped at about 6

Every Haiku track scored between 5.5 and 6.2, however many checks surrounded the writer.

To find out whether the format or the writer was the limit, I ran a ceiling test. A stronger writer (a Claude agent) wrote the same 30-word lesson under the app's exact rules: the learner's known words, three uses per word, and the same speaker and length limits. It scored **8.2**. So the format can reach 8, and the limit was Haiku's Thai.

## What v709 does

### 1. A curated exchange bank (`sandbox/curriculum/thai-exchange-bank`)

The bank holds one vetted three-line exchange (A–B–A) per word.
- **Coverage: 1,092 words.** That is every one of the owner's known words the preflight allows, plus the next 200 new curriculum words.
- **How each batch was made:**
  - Claude agents wrote the exchanges against a brief (`AUTHOR.md`).
  - Each exchange is checked by `check.sh`, which runs it through the app's own writer on the owner's vocabulary. That covers closed vocabulary, speakers, length, target presence and the writer's rules.
  - A native-teacher review pass then corrected each batch (`REVIEW.md`). It mainly fixed cue person, word order, answers that did not follow, and repeated frames.
- **How the app uses it.** The writer's first candidate for a word is its bank exchange, so no paid call is needed. A word with no usable bank exchange is written by Haiku exactly as before.

### 2. Vetted lines are not re-judged or rewritten

On paid track 8, the bank's lines were damaged by the existing quality stages, which had been built to catch Haiku's errors.
- **The effect:** 13 of 30 exchanges were rewritten for the worse. For example, ครึ่ง became "ครึ่งชิ้น" said three times by one speaker.
- **The fix:** a line that is still exactly its bank text (and, for the cue, still its bank cue) now passes these stages unchanged:
  - the paid judges and the scene critic;
  - the early gate;
  - the single-sentence lexical rules;
  - the cue lint and the cue-clarity rewrite;
  - the whole-track coherence gate.

  The hard checks still run: closed vocabulary, speaker particles, length and target presence.
- **The coherence gate** still judged a track as one connected story, which contradicted the owner's self-contained exchanges. It now treats vetted sections as coherent and judges the rest exchange by exchange.

### 3. Vetted opening and closing lines

There are three set-piece greeting and goodbye pairs, written without Thai names so they fit any characters; the cue names the characters.

### 4. App fixes found along the way

- **Romanisation word breaks.** A word never spans a space, so ครับ ผม reads khráp phǒm, not ครับผม ("yes, sir"). Phrase entries read as their words, e.g. duu-lae dtua-eeng dûai and sà-wàt-dii khráp.
- **Banned-word list.** A word on the "not in your vocabulary" list (อินเทอร์เน็ต, รถยนต์, ไปรษณีย์) is allowed when the learner has been taught it.
- **Dictionary readings.**
  - 11 readings corrected: เลย looei, เงินสด ngooen-sòt, จมูก jà-mùuk and others.
  - 37 empty readings filled. ปวดท้อง had no reading, which held back paid track 12.
- **Test harness.** The bank is switched off whenever a test mocks the model, because those tests check the model path.

## Tests

- **tests63 Z1–Z5 (new):**
  - Z1: the bank and the writer's first candidate;
  - Z2: trust of vetted lines;
  - Z3: romanisation word breaks;
  - Z4: the banned-word list;
  - Z5: the opening and closing set pieces.
- **Expected changes, each explained in its test:**
  - tests20 G6: the audit row count;
  - tests24 P4: reopened words may take revision slots;
  - tests14: the §28 mock now drops a protected word that no other protected word contains;
  - tests44, tests46, tests39 and tests61: the 2,500-word import;
  - tests63 F5 and J1.
- **Full suite:** see the end of this report.

## Spend

| Item | Amount |
|---|---|
| Paid tracks this round (7–12) | about US$0.42 |
| Session total | about US$1.79 of the US$2.00 cap |

## Limits

- **Words outside the bank are still written by Haiku.** That will happen for new words beyond the next 200 and for words the bank could not cover:
  - ฉัน, ครับ, ค่ะ, คะ, นี่ครับ and เธอ: the A–B–A speaker pattern cannot carry them;
  - ตี: its lines needed digits;
  - ผมจองไว้ครับ.

  More batches will extend the bank toward all 2,500 words.
- **Remaining reviewer findings** are line-level: a few cues, some single-sense words (คุ้ม, แนะนำ), and the occasional exchange that does not quite follow. They can be fixed in the bank data without touching the code.
- **The checker's target matcher** rejects a target inside a compound (ปวดฟัน for ฟัน, อาจจะ for อาจ). That sometimes forced a less natural phrasing.

## TL;DR

v709 scores **7.4/10 on three separate sets of 30 words**, up from 6.0 for the live v707. Each track costs about US$0.04, a quarter of before.

It works by using vetted, reviewed exchanges for 1,092 words instead of having Haiku write them, and by stopping the old Haiku-oriented checks from rewriting those lines. It is ready to go live once the owner says so.
