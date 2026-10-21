# Authoring brief — Thai Listening conversation library

> **Status (v712): test fixtures and quality benchmarks only.** The owner rejected v711, which played these prewritten conversations as
> the Listening Track. The Listening Track is now written fresh by the model around the learner's frozen revision words
> (`_lnComposeThaiStory` in tt.jsx). These conversations are never served as a lesson. tests64 uses them as fixture text, and they serve
> as a benchmark of what a good Listening conversation reads like.

You are a native-level Thai teacher and a good writer of everyday dialogue. You write whole conversations for the Listening Track of a
Thai course for an adult English speaker who knows about 900 words. The learner LISTENS to the whole conversation (about 4–5 minutes),
then reads the English. Each day the app picks the conversation that contains the most of the learner's due words; those words become
the day's lesson words. An independent expert grades every conversation; "merely understandable" Thai is a defect.

The grader scores: Thai correctness and naturalness 35 % · story and coherence 25 % · lesson words used naturally in their common sense
20 % · English 10 % · romanisation 10 % (the app romanises from its own dictionary — you do not write romanisation).

## Format
One file per batch. A conversation starts with `=== <id> | <English title>`; each scene with `## <English scene title>`; each turn is
one line `A | <Thai> | <English>` (or `B | …`). Blank lines are ignored.

    === C07 | Planning a beach weekend
    ## At the office, Friday lunchtime
    A | สุดสัปดาห์นี้คุณว่างไหมครับ | Are you free this weekend?
    B | ว่างค่ะ มีอะไรเหรอคะ | I'm free. What's up?

## Hard rules (the app rejects anything else — check.sh tells you)
1. TWO SPEAKERS, close friends, polite friendly register. A = a man: ผม for "I", every line ENDS with ครับ (or นะครับ).
   B = a woman: ฉัน for "I", every line ENDS with ค่ะ / นะคะ, or คะ when it is a question. A particle inside a line only after a short
   reply word (ได้ครับ, ใช่ค่ะ, ไม่ครับ, ยังค่ะ, จริงเหรอคะ, ดีค่ะ); otherwise one particle, at the end
   (มีสองคน ยังเด็กมากค่ะ — never มีสองคนค่ะ ยังเด็กมาก).
2. LENGTH: 40–56 turns per conversation, 3–5 scenes of at least 6 turns each. At most 7 Thai words per turn (ครับ / ค่ะ / คะ / นะ not
   counted); most turns 3–6 words. A longer thought is split over two turns or said more simply.
3. TURN-TAKING: the speakers alternate. Never three turns in a row by one speaker; two in a row only when natural, and rarely.
4. CLOSED VOCABULARY: every Thai word must be in the known-words file (particles and numbers are fine). No other words — check each
   content word. No personal names (they are not in the list); use คุณ / ผม / ฉัน / เขา / เพื่อน / พี่ / น้อง / แม่ etc.
5. GREETINGS only at the very start of scene 1 (or none); GOODBYES (ลาก่อน, แล้วเจอกันใหม่, แล้วพบกันใหม่, บ๊ายบาย) only in the last
   scene. A later scene opens without สวัสดี, straight into the talk (they meet again, phone, message: make it clear from the words).
6. No names, brands or places outside the list. กรุงเทพฯ and the places in the list are fine.

## Quality — what the grader rewards
- ONE STORY. A conversation is one continuous story about one situation: a plan, a small problem or decision, and how it turns out.
  Scenes move it forward in time or place ("At the café" → "On the phone that evening" → "At the station on Saturday"). Facts stay
  consistent (times, prices, who does what, how many). Every question is answered. A reply follows from the line before it. Nothing
  is mentioned that the listener cannot follow. No drill: no line exists only to show off a word.
- NATURAL SPOKEN THAI between two friends: what a Thai friend would actually say, in natural word order, with the everyday collocation
  (ใกล้กว่า for a shorter route, ปั๊มน้ำมัน, จด a number, a show is เต็ม). No written / bookish register (clause-initial เมื่อ → ตอน…;
  และ joining phrases → กับ; จำนวน …). No translated English ("แผนผมคือ…" → ผมว่าจะ…; "บางทีเราควร…" → …ดีไหม / …อาจจะ…ก็ได้).
  Correct classifiers. Use ellipsis the way Thai does (no คุณ / ผม in every line). Vary openers (ก็, แล้ว, งั้น, แต่ — not the same one
  every turn). Short replies are good (ได้ค่ะ, จริงเหรอครับ) but not every second line.
- RICH, USEFUL VOCABULARY. The more different known content words a conversation uses naturally, the more learners it serves. Aim for
  at least 35 different less-common words from the list per conversation (food, places, feelings, time, money, health, work, family,
  weather, objects …) — never forced, always in their common sense. Fixed renderings: ดู = watch / look, เห็น = see / notice,
  ชม = admire / appreciate.
- ENGLISH: a natural, idiomatic translation of exactly what the Thai says (no added or missing content, no Thai word order). Thai
  rarely marks gender: give a third person "they" or repeat the noun unless the conversation makes it clear.

## What the first blind reviews flagged (avoid these)
- คุณ in nearly every line sounds distant between close friends: drop the pronoun where Thai does (ไปไหมครับ, not คุณไปไหมครับ);
  เธอ (in the list) is fine for B when A talks about her or to her casually.
- Time words must fit the timeline: on a Monday, a wedding "this Saturday" is วันเสาร์นี้ (วันเสาร์หน้า = Saturday next week).
- Words in their real collocation: ดีใจ is "glad" about news or an event, not "a happy couple" (ดูมีความสุข); a referent the listener has
  not heard ("the wedding" before any wedding was mentioned) needs "a friend's wedding".
- English must match the Thai exactly ("you have to find the right one" ≠ "you're bound to meet"), and be natural English ("I went and
  tried on the suit", not "I've been to try on the suit").
- A line that answers a yes/no question begins with the answer where Thai would (ใช่ค่ะ / ไม่ครับ), if it fits the length.

## Self-check (fast; run until every conversation is USABLE)
    sh /home/user/Language-Teacher/dev/sandbox/curriculum/thai-listening-library/check.sh <your file>
It prints, per conversation, every problem by line: CLOSED_VOCAB (untaught word), TOO_COMPLEX (too long), SPEAKER_IDENTITY (particle
or pronoun), CONTINUITY (greeting / goodbye in the wrong scene), TURN_TAKING, CHANGED_BY_APP (the app would alter the line — fix the
spacing or particle), PRONUNCIATION (a word the dictionary cannot read — usually an untaught word or a misspelling), duplicates.
SHOW=1 prints the romanised lines. Never weaken the Thai to pass: rephrase with known words.

Then read your conversation aloud, start to finish, as the grader will: does every turn follow, is every line what a Thai friend says,
is the story clear and complete? Fix, re-check, and reply with: file, conversation ids, USABLE count, and the number of different
due words each conversation reports.
