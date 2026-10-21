# Review brief — Thai Listening conversation library (second pass, a different writer)

Read AUTHOR.md first (format, hard rules). You are a strict native Thai teacher. The blind grader scores each conversation: Thai
correctness and naturalness 35 % · story and coherence 25 % · lesson words 20 % · English 10 % · romanisation 10 %. The first pilot
conversations scored 7.3–8.6; nearly every lost point was one of the faults below. Your job: find them and fix them IN PLACE, keeping
the format and every hard rule. Change only what is wrong; a good line stays exactly as it is.

## 1. Read each conversation as the grader will, start to finish, and list every fault, then fix it
STORY (the biggest loss):
- Contradictions: B says "drive slowly", then "why are you slowing down?"; A agreed to buy a jacket, then B says "you didn't believe me".
- Timeline: a three-day trip summed up on the first evening; "next Saturday" vs "this Saturday"; the day / time each scene happens.
- Unmotivated events: why the news had to be a secret, why the rented car is nearly out of fuel, how A knows the partner is handsome —
  plant the reason earlier in one short line.
- Roles: who is the customer and who sells; who pays; ลองใส่ดูนะครับ is "(you) try it on" — the customer says ขอลองใส่ดูก่อนนะครับ.
- References the listener cannot resolve: เขา after several people were mentioned (say แฟนฉัน / เพื่อนฉัน); "the wedding" before any
  wedding was mentioned; "the station" when they leave from different places.
- A yes / no question gets its answer first (ใช่ค่ะ … / ไม่ครับ …) where Thai would; every question is answered.
- A reply must follow the line before it (an answer to "you're smiling a lot" is about why, not "I've decided").

THAI (what a Thai friend really says):
- Collocations: cold enough for a jacket = หนาว (เย็น = cool); clothes too tight = คับ (if known; otherwise rephrase); a price per item
  = ขวดละสี่สิบบาท (not ขวดหนึ่งสี่สิบบาท); ดีใจ = glad about news (a happy couple ดูมีความสุข); my treat = เลี้ยง (if known);
  ทำไม…ถึง…; duration up to now takes มา (ไม่มีแฟนมาหลายปีแล้ว); a condition and its result link with ก็ (ถ้าเขาจริงใจ ก็…).
- No translated English; no bookish register; subjects where Thai needs them to avoid misreading (คืนนี้ไปซื้อ… = "let's go buy" —
  ผมจะไปซื้อ… = "I'll go and buy").
- คุณ in nearly every line sounds distant between close friends: drop it where Thai drops it.
- Avoid ambiguous-by-ear lines (ฉันบอกเขาคนเดียว = "I told her alone" or "only her"?).

LESSON WORDS (any content word may become a lesson word for some learner):
- Every content word in its common sense, in a line that makes it clear. A lot of different content words is good; the same noun in
  five lines is not (vary it or drop repeats).

ENGLISH: exactly what the Thai says, natural English (น่าสงสาร = "I feel sorry for her", not "that's sad"; หรือยัง = "… yet?").

## 2. Self-check after editing each file (every conversation must stay USABLE)
    sh /home/user/Language-Teacher/dev/sandbox/curriculum/thai-listening-library/check.sh <file>
A fix that needs an untaught word → find another natural phrasing with known words (the known-words file is in the prompt).
Reply with: file, conversations reviewed, lines changed per conversation, USABLE count, and up to 6 example corrections
(before → after, why).
