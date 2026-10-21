# Thai Daily v708: the owner's v707 review (21 Oct)

The owner rated the live v707 track **6.0/10**. Scores by area:

| Area | Score |
|---|---|
| Vocabulary | 8 |
| Complexity | 8 |
| Natural Thai | 6 |
| Cues / translation | 5 |
| Target sense | 6.5 |
| Three applications | 5.5 |
| Coherence | 5 |
| Speaker / politeness | 8 |
| Romanisation | 7 |

The owner gave four priorities and one constraint: "I wouldn't add more QC layers now." v708 follows all four and removes work rather than adding it. Nothing here has been deployed.

## 1. Short, self-contained mini-conversations

**Cause.** The writer was told to write "one exchange in an ongoing conversation", so a scene had to tell one connected story. This caused three kinds of fault:
- lines pointing at something said for another word ("too", "then", ด้วย, ก็, นั้น);
- contradictions across words;
- the critic flagging a line for not connecting to a different word.

**Fix:**
- **The writer.** It now asks for "one short, SELF-CONTAINED three-line exchange between two friends". The exchange does not continue earlier lines, and the scene is only its setting. The Daily switch must be on; the legacy prompt is unchanged.
- **The scene critic.** It shows each word's exchange as its own block ("exchange 2 (word: ถ้วย)") and judges each one on its own. "The lesson so far" is no longer sent, and a contradiction now means within the same exchange.
- **The final strict judge.** It reads a line after the earlier lines of the same word's exchange only. The opening greeting and other words are no longer its context.

## 2. Conservative polish

**Cause.** An open-ended "scene polish" pass could rewrite any line of a scene, including lines that were fine. Fix mode could then also change the line before each refused line.

**Fix:**
- **The open-ended pass is off** (`THAI_OPEN_SCENE_POLISH = false`). The polish now runs only in fix mode, on lines the critic or the final judge refused.
- **Fix mode changes only the refused line.** It may also change the line before it only when the refusal says the reply does not follow, contradicts, or dangles, and both lines belong to the same exchange.
- **The fix prompt.** It asks for "the SMALLEST change that fixes the stated problem — keep it as short and simple as the original, never more elaborate".
- **Revert-on-fail.** If a line passed the audit before a fix pass, was changed by it, and fails afterwards, it gets its earlier text back.
- **Fewer calls:**
  - critic rounds go from 2 to 1;
  - fix passes go from 3 to 2;
  - the open-ended polish (about 1 request per scene) is gone.

## 3. Deterministic cue guarantee

**Cause.** The cue guard knew the earlier broken shapes, but not "Say are they cold?" or "Thank Somchai you wish him…".

**Fix:** `thaiCueGuarantee` is the last word on a cue's grammar.
- **When it runs.** It runs on every line with a cue, opening and closing included. It runs inside the final audit right after the cue lint, so the new cue is judged again. It runs once more on the saved text.
- **What it rewrites:**
  - "Say are they cold?" → "Ask whether they are cold.";
  - "Say oh, are you cold?" → "Say oh, then ask whether she is cold.";
  - "Thank Somchai you wish him a safe trip." → "Thank Somchai and wish him a safe trip.".
- **Fallback.** Anything still broken becomes a quoted instruction built from the English: Ask, "What time do you leave?". It is plain, but always grammatical.
- **The guard** now also recognises "Say + a question" and "Thank + name + clause".

## 4. Dictionary metadata and the same standard for opening and closing lines

**Cause of the skips.** 96 records carried `lexiconDisposition: RECOGNITION` with no reason recorded, a blanket early decision. The suitability grader reads that as "recognition only, a human must review", and the Daily preflight skips the word. On the owner's backup, the preflight skipped **113** candidates with the 2,500-word list, including:
- เส้นทาง, วัฒนธรรม, ผู้โดยสาร, อุณหภูมิ;
- กำไร, รายได้, ประเพณี.

**Fix.** The data was corrected with `sandbox/curriculum/thai-801-2500/suitability.py`:
- **85 records are ACTIVE again.** These are ordinary words.
- **11 keep RECOGNITION, with the reason now recorded:**
  - ขอให้เป็นวันที่ดี (a translated wish);
  - แก (very informal "you");
  - ลาก่อน (a final farewell);
  - จ้ะ and จ๊ะ (familiar particles);
  - ป๊ะ and กิ๊ก (slang);
  - ขึ้นคาน (can hurt);
  - ศพ (corpse);
  - มัว (two unrelated senses);
  - มั้ย (the spoken spelling of ไหม).

**Result.** The preflight on the owner's backup now skips **34**, and each skip has a reason:
- rude words;
- formal or written forms with a spoken alternative (เนื่องจาก → เพราะ, พบ → เจอ);
- the ดิฉัน rule;
- the 11 above.

**Opening and closing lines.** The owner noted that ขอให้เป็นวันที่ดี is excluded as a target yet was used in a closing line. Fixes:
- **The scene prompt** no longer offers ขอให้เป็นวันที่ดีนะครับ as a closing. It asks B for a set phrase (ขอบคุณค่ะ เดินทางปลอดภัยนะคะ, โชคดีนะคะ, แล้วเจอกันค่ะ), "never a translated wish with ขอให้".
- **Deterministic replacement.** A closing line built on ขอให้ + anything but โชคดี / มีความสุข becomes a set phrase. For example, ขอบคุณ สมชาย ขอให้เดินทางดีค่ะ → ขอบคุณค่ะ เดินทางปลอดภัยนะคะ ("Thank you. Have a safe trip." · "Thank him and wish him a safe trip.").

## Tests

- **tests63 Y1–Y7 (new):**
  - the cue guarantee and where it runs;
  - set-phrase closings;
  - revert-on-fail;
  - self-contained exchanges, critic layout, rounds and passes;
  - the metadata;
  - the closing prompt.
- **tests63: 58/58.**
- **tests63 J1** was updated as an expected change: the context is now the same exchange, explained in the test.
- **tests61** was updated for the 2,500-word curriculum as an expected change, explained in the test. J2 now checks the 1,429 new records. Result: 14/14.
- **tests60 36/36, tests62 18/18.**

## Paid track 7 (real Haiku, same 30 words as tracks 2–6)

**Result:** READY, 90/90, **US$0.216**, 178 requests. For comparison, v707 took 219 requests and US$0.249.

**Calibrated blind reviewer: 5.5 / 10.** Paid track 5 (v707) scored 6.2, and the owner rated v707 6.0.

| Area | Score |
|---|---|
| Thai | 5.0 |
| Cues / English | 5.5 |
| Vocabulary | 5.0 |
| Reading | 8.0 |
| Coherence | 4.5 |

**Main findings:**
- **The same frame three times** remains: "X is delicious", เย็นดี, ตื่นสาย, yellow bus, หลายคน.
- **Answers that do not answer**, e.g. "how much?" → "very cheap".
- **The same speaker twice in a row** in several exchanges.
- **Non-native usage:** ใช้รถเมล์, เป็น + noun + ไหม, ร้านให้เช่า.
- **A romanisation bug introduced in v706:** the greeting fix joins สวัสดีครับ with a hyphen ("sà-wàt-dii-khráp").

**Decision.** v708 is **not proposed for release**. The simpler structure did not raise the Thai quality with Haiku. Worth keeping:
- the cue guarantee;
- the metadata correction;
- set-phrase closings;
- the lower cost.

**Separate live issue.** The owner's v707 track stopped at the US$0.25 / 300-request per-track default (US$0.2465, 185 requests), because a v707 track costs about US$0.25. The owner can raise the limit in Settings → AI Generation Model and press Continue (the draft is kept). Raising the default to US$0.40 / 400 is offered as a small update, pending the owner's go-live.

## TL;DR

All four of the owner's priorities are built and tested, at lower cost: 178 requests and US$0.216 per track. But the first real-Haiku track scored 5.5 against v707's 6.0, so v708 is not proposed for release. The live per-track default of US$0.25 is too low for v707 and should go to US$0.40.
