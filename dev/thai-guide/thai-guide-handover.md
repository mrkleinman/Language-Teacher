# Thai Guide: handover brief

**Purpose of this chat:** write a short "how spoken Thai actually works" guide. A language-learning app will put it in the instructions it gives a small AI model (Claude Haiku) every time it writes Thai practice sentences. Haiku's Thai is weak in predictable ways, and the guide should help it write correct, natural Thai from the start.

Attached alongside this brief:
- **thai-guide-source.md**: the app's own material, with 202 grammar cards (pattern, meaning, one example) and 394 lessons (key pattern plus the teacher's explanation). Use it as reference for how the patterns work.

---

## 1. How the guide will be used

- It is pasted, unchanged, into the instructions for the Thai **Daily track** writer. Every Daily track has 30 target words, and each gets a 3-line mini-exchange between two speakers (A–B–A). Each line has the Thai, a romanised reading and a short English cue the learner says from.
- The same guide goes into every request, so it is cached and its length costs little. It must still be **short enough that a small model follows it**.
- After the AI writes, the app runs its own checks. Those already catch many specific mistakes (section 4). The guide's job is to prevent mistakes, not to replace the checks.
- It may later be given to the **Listening** story writer too, so keep it general Thai, not Daily-specific.

## 2. What the guide should look like

- **About 30–40 numbered points, roughly 1,500–2,500 words in total.**
- Each point has:
  - a one-line rule in plain English;
  - ✔ a short correct Thai example (with English);
  - ✘ the typical wrong version, where there is a common mistake.
- Group the points under a few headings, for example: Questions · Answers · Particles and politeness · Pronouns and who is speaking · Word order and classifiers · Time, "already" and "not yet" · Requests, offers and invitations · Natural spoken register · Common collocations.
- Target **natural everyday spoken (Bangkok) Thai at a beginner-to-lower-intermediate level**: what a friendly Thai person would actually say, not textbook or written Thai.
- Examples should be **short and use common words**. They illustrate a rule; they are not sentences for the app to reuse.

## 3. Hard constraints (from the app owner)

1. **No prewritten content.** The guide teaches *how* to build Thai. It must not be a bank of sentences, greetings, endings or stories to reuse. The app also refuses any line that copies a guide example.
2. **Don't copy the lesson dialogues or example sentences** from the source file into the guide verbatim. Distil the rule instead.
3. **No lesson-pattern matching.** The guide is general Thai know-how and is not tied to which lessons the learner has done.
4. **Plain words.** No linguistics jargon unless it is explained in a few words.
5. **Rules must be right.** If something is debatable or regional, leave it out or say so.

## 4. Mistakes the app has already seen Haiku make

These come from real reviews of generated tracks. The guide should cover the underlying rules, especially the first group.

**Questions (the biggest problem area)**
- ใคร … ไหม is not Thai. "Does anyone…?" is มีใคร…ไหม (มีใครดื่มเหล้าไหมคะ), and "Who…?" takes no ไหม (ใครดื่มเหล้าคะ).
- ทำไม / กี่ / เท่าไหร่ / เมื่อไหร่ / อะไร questions take no ไหม (กี่โมงคะ, not กี่โมงไหมคะ). To ask whether someone knows, use รู้ไหมว่า….
- "Did you … yet / already?" is …แล้วหรือยัง (กินยาแล้วหรือยังครับ). …แล้วไหม is wrong, and …ไหม asks about a habit or the future.
- Haiku often answers a ไหม question with ใช่. That is wrong: ใช่ only answers a ใช่ไหม-type confirmation. A ไหม question is answered by repeating the verb or adjective (ไปไหม, then ไปครับ / ไม่ไปครับ).
- An invitation ("shall we / let's…") needs กัน: ไปร้านกาแฟกันไหมคะ.
- บางที (sometimes / maybe) does not go inside a ไหม question.
- "What time?" is กี่โมง, not เวลาไหน.
- หวังว่า… states a hope, so don't add ใช่ไหม.
- เชิญ is an invitation (เชิญนั่งครับ), not a yes/no question.
- Choosing among places is …ไหนก็ได้, not …อะไรก็ได้. A question word + ก็ได้ means "any / whatever", not a question.

**Pronouns, speakers, cues**
- เขา is "he / she / they", a third person. It is never "you". The English cue must match: a line about เขา is about someone else.
- พี่ at the start of a question is an address term ("you", to someone a bit older), not "older brother / sister".
- Gendered particles must match the speaker: ครับ for a male speaker; ค่ะ (statement) / คะ (question) for a female speaker.
- The English cue must be ONE translation of the line. No "A / B" alternatives and no dictionary glosses.

**Natural spoken Thai**
- "ฉันดีมาก" as a reply to "how are you" is unnatural. Use สบายดี-type answers.
- Formal words (สามารถ) are formal. Everyday "can" is ได้ / เป็น / ไหว.
- An ache is ปวด (ปวดหัว, ปวดท้อง). เจ็บ is sharp or wound pain.
- Travelling *by* a vehicle is นั่ง / ขึ้น + vehicle (นั่งรถเมล์ไป). ไปกับ / มากับ mean "with a person". ไปรถ… is wrong.
- รถเมล์ is the public city bus.
- Location takes อยู่: น้ำตาลอยู่บนโต๊ะ, not น้ำตาลบนโต๊ะ.
- Prices per unit take ละ: เดือนละพันบาท, คนละร้อยบาท.
- "Lots of people" is คนเยอะ, not มีคนหลายคน.
- "Not every day" is ไม่ใช่ทุกวัน.
- 500 is ห้าร้อย, never ครึ่งพัน.
- หน่อย softens a request or means "a bit more". It does not attach to a descriptive adjective to mean "quite".
- นี่ครับ (handing something over) comes first: นี่ครับ ช้อนครับ.
- งั้น and แล้ว don't stack.
- ไม่เชิง is a hedged answer (ไม่เชิงครับ แค่…), not "not exactly" placed before a verb.
- ต้อนรับ needs who is welcomed, or a fixed frame (ยินดีต้อนรับ).
- Wishes: ขอให้มีความสุขนะ / ขอให้โชคดี, not ขอให้…ดี.
- Believing a fact needs ว่า: ไม่เชื่อว่า….
- A reason is asked with คืออะไร or ทำไม, not เป็นอะไร.
- "Tell you when I know" is รู้แล้วจะบอกนะ / ถ้ารู้จะบอก, not a literal …เมื่อรู้.
- เจอ with a person means "meet / see", not "find". หิวข้าว means "hungry" (no "rice" in the English).
- "Today we haven't met for ages" contradicts itself.

**Classifiers and numbers**
- noun + number + classifier. A dish or drink with หนึ่ง needs its classifier.
- โต๊ะ / เก้าอี้ take ตัว. คู่ is only for pairs or couples.
- "That yellow one" needs a classifier: อันสีเหลืองนั้น.
- Clock times: บ่าย N โมง / N ทุ่ม / N นาฬิกา, not "13 โมง".
- A price of zero baht isn't credible. ศูนย์ belongs in phone numbers, scores and the like.

**Variety (the owner's priority)**
- Each word's three lines must use the word in three **meaningfully different** ways (ask / tell / decline / plan / react…). No echoing the previous line, no opening two lines with the same phrase, and no asking the same question back.

## 5. What to bring back

Paste the finished guide into the original app chat, or upload it as a .md / .txt file. In that chat it will be:
1. checked against the app's existing rules so the two don't contradict each other;
2. wired into the Daily prompt (cached), with the guide's examples added to the app's copy check;
3. tested with one paid Daily track against the current version, with two blind reviews. It is kept only if the scores go up.
