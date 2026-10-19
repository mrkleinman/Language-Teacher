# Thai Daily quality rounds after the 501–800 update (19 Oct)

Goal from the owner: "keep testing until the tracks are 8–8.5/10".

Status: **not reached.** Ten tracks have been blind-rated. The best score is 7.0, up from 6.2–6.5 in the first four rounds. Nothing has been deployed.

## How it was tested

- **Track generation.** The real app path ran on the owner's profile (backup 2026-10-15, never committed): `pickWords` → scene → generation → QC → quota recovery → coherence repair → scene polish → final audit → the app's own export.
- **Model requests.** Every model request was answered by a Claude Haiku stand-in through a file queue (`sandbox/daily-relay/bridge-daily.js`), at no API cost. Each track takes about 130–185 requests.
- **Words.** The same 30 words were used every time (5 new, 25 review), so tracks can be compared.
- **Rating.** An independent reviewer rated each track blind, reading only the exported lines. It used the owner's rubric:

  | Area | Weight |
  |---|---|
  | Thai correctness and naturalness | 35% |
  | English cues and translations | 20% |
  | Vocabulary practice | 20% |
  | Romanisation | 15% |
  | Coherence | 10% |

- **Who answered.** Track 5 is the exception to the Haiku rule. When the stand-ins ran out, I answered its last ~45 requests myself, including the whole scene polish. That makes track 5 a less faithful test. From track 6 on, Haiku stand-ins answered every request.

## Results

| Track | Total | Thai | Cue / EN | Vocab | Roman | Coherence | What changed before this track |
|---|---|---|---|---|---|---|---|
| 1 | 6.5 | 6.0 | 7.5 | 7.5 | 5.0 | 6.5 | Baseline after the 501–800 data |
| 2 | 6.4 | 6.5 | 6.5 | 6.0 | 8.0 | 4.5 | Romanisation spellings |
| 3 | 6.2 | 6.0 | 6.5 | 6.0 | 7.5 | 5.0 | Exchange rule (line 3 answers line 2) |
| 4 | 6.3 | 6.5 | 6.5 | 6.0 | 7.0 | 4.5 | Speaker slots, A-B-A order |
| 5 | 6.7 | 7.0 | 7.0 | 6.0 | 7.5 | 5.5 | Scene polish (one request per mini-scene) |
| 6 | 6.9 | 7.0 | 7.0 | 6.0 | **9.0** | 5.0 | Cue fixes, romanisation, polish sees framing lines |
| 8 | **7.0** | 6.5 | 7.0 | **7.0** | 9.0 | 5.5 | Five exchange shapes, polish hints, naturalness rules |
| 10 | 6.9 | 7.0 | 6.5 | 6.5 | 9.0 | 5.0 | Coherence re-judged after polish, more rules |

Tracks 7 and 9 were stopped early so the next build could run sooner.

Every track was READY 90/90 except track 8. Track 8 went NOT_READY because its last coherence verdict was given before the polish rewrote the scene. That gap is now fixed (see below).

## What was fixed after round 4 (all pushed; tests63 33/33)

**Coherence**
- **Scene polish.** One request per mini-scene shows the writer the whole scene in order and asks for the smallest edits that make it one conversation. Each edit must keep its speaker particle, its exact target word, the taught vocabulary and the lexical rules; otherwise the original line stays. An edited line loses its old verdicts and is judged again.
- **Polish context.** The opening and closing lines join the first and last scenes, so the greeting and goodbye fit the place and the plan. A refused edit gets one retry with the reasons. The polisher also receives concrete "fix these" hints a rule can see:
  - ใช่ answering a ไหม question;
  - a question followed by the same speaker;
  - two lines of the same speaker inside one word's exchange;
  - งั้น opening several lines;
  - one phrase repeated in all three of a word's lines.
- **Coherence after the polish.** When the coherence verdict failed and the polish changed lines, coherence is judged again on the polished text. This costs one request.
- **Recovered lines.** A line written in quota recovery now sees the exchange it joins and the line after it.

**Vocabulary practice**
- Each word gets one of five exchange shapes (comment → follow-up → detail; request → accept → react; plan → problem → solve; opinion → reason → reply; problem → suggestion → accept). Neighbouring words get different shapes, and an answer must add something new.
- Track 8's vocabulary score rose from 6.0 to 7.0 after this change.

**Thai naturalness rules** (deterministic; the writer and the final audit both apply them)
- เวลาไหน for "what time?" (use กี่โมง).
- A location without อยู่ (น้ำตาลบนโต๊ะครับ).
- มีคนหลายคน for "lots of people" (use คนเยอะ).
- A price per day, month or person without ละ (use เดือนละพันบาท).
- A space after a phrase-final ค่ะ or ครับ.
- Guide lines:
  - a price question gets an amount;
  - ไม่ใช่ทุกวัน;
  - มา…กันอีกไหม;
  - people already together don't say where they are.

**Cues, roles and romanisation**
- **Cue wording bugs:**
  - "Say thanks, …" was misread as narration;
  - "he rent" now agrees as "he rents";
  - an addressee false alarm on "say you will see";
  - "Here's" stayed capitalised.
- **Names and roles:**
  - a character's Thai name in English text becomes the English name;
  - แล้ว, ข้าม, ตอบ and บ่อย are briefed with the right word class.
- **Romanisation:**
  - เพิ่ง phôeng, รถบัส rót-bát, ได้ยิน dâi-yin, ไม่ได้ยิน mâi-dâi-yin;
  - the diphthongs เอีย อัว เอือ are always shown as ia, ua, uea.
  - Romanisation now scores 9/10.

## Regression suite

The full run shows the same known failures as before, with no new regressions.

Three regressions appeared during the work and were fixed before moving on:
- Phrase entries spelled with a space broke pronunciation alignment. They are hyphenated again.
- One cue-lint exception hid two real addressee leaks.
- A diphthong spelling change needed the test normaliser updated.

Expectation changes made on purpose, each explained in the test:
- **tests63 S1:** one follow-up request for refused polish edits.
- **tests44 V3:** diphthong spelling counts as a spelling-only difference.
- **tests20 N7:** the closing line now has a space after ครับ.

## Cost

Request volume rose by about 30% from track 4 to track 10, from about 1.03M to 1.34M characters sent.
- **Scene polish:** about 5–7 requests per track, plus one coherence re-judgement when it is needed.
- **Recovery:** most of the remaining increase. The stricter rules send more lines back for rewriting.

Paid cost per track has not been measured on the real Haiku path.

## Why the score sits at about 7

Tracks 6, 8 and 10 scored 6.9, 7.0 and 6.9. Each round removes the defects the reviewer named, and the reviewer then finds new ones of the same kinds:

1. **Semantic slips that rules can't see.** Examples: นมเย็น means pink milk, not "cold milk"; รถ needs to be รถเมล์ for "bus"; หลายจาน means many plates, not many dishes; เงินพันบาท means 1,000 baht of money, not a 1,000-baht note.
2. **Replies that don't follow the line before.** Examples are a man who can't find the spoon then saying where it is, and a woman answering her own question.

Both kinds come from the model that writes and polishes the lines. The pipeline now gives Haiku the scene, the order, the hints and the rules, but Haiku's own Thai is the ceiling at about 7.

Track 11 is testing whether a stronger model for the scene polish alone (5–7 requests per track) lifts the score. If it does, the owner can choose a "polish model" setting.

## TL;DR

- Ten blind-rated tracks on the owner's profile. The best score is 7.0, up from 6.2–6.5 before the scene polish, but the 8–8.5 target is not reached. Nothing has been deployed.
- What improved:
  - romanisation, from 5 to 9;
  - vocabulary practice, from 6 to 7, thanks to the exchange shapes;
  - coherence verdicts, which now judge the polished text.
- The remaining gap is Haiku's own Thai: semantic slips and replies that don't follow. Rules have stopped moving the score. A stronger model for the 5–7 polish requests per track is being tested in track 11.
