# Second review brief — Thai exchange bank (v710, target 8/10)

The bank already passed one native-teacher review (REVIEW.md). Tracks built from it score about 7.4/10 with a strict blind reviewer.
This pass removes what still costs points. Read AUTHOR.md (format, hard rules) and REVIEW.md first. Fix files IN PLACE, keep the
format, and change only what is wrong: a good line stays exactly as it is.

The blind reviewer scores Thai 35 %, cues + English 20 %, vocabulary practice 20 %, romanisation 15 %, coherence 10 %. It treats
"merely understandable" as a defect. What it still finds:

1. ENGLISH (EN) that is not natural English. EN is a natural, idiomatic translation of exactly what the Thai says.
   "It's very worth it." → "It's really worth it." · "I very like it." → "I really like it." · no Thai word order in English.
2. INVENTED GENDER. Thai rarely marks gender. Never give a third person a he / she / his / her the Thai does not support:
   ลูกคุณ (your child) → "your child … their teeth" or repeat the noun ("your child's teeth"), not "his teeth". เขา with no context
   → choose the reading the exchange makes clear, or rephrase the cue with the noun ("Tell her your friend is late.").
   The LISTENER pronouns stay as AUTHOR.md says (A talks to "her", B talks to "him").
3. CUE that does not say exactly what the Thai says: extra content, missing content, a statement cued as a question or the reverse,
   or a cue that only makes sense after reading the Thai. The learner hears only the cue and must produce this Thai.
   Cue person: the learner IS the speaker — "you / your / yours" are the speaker's own (ผม / ฉัน). "Tell him the medicine is in your
   bag" = ยาอยู่ในกระเป๋าค่ะ (my bag) is RIGHT; do not change it.
4. THAI that is understandable but not what a Thai friend says: unnatural word order, a missing or odd particle in a two-clause line
   (a statement ends with ครับ / ค่ะ; B's question with คะ; do not stack particles), wrong classifier, a verb missing its object,
   textbook or written register, a reply that does not follow from the line before it.
5. VOCABULARY PRACTICE: the three lines use the target in genuinely different frames (different collocation, function, sense where
   it has more than one). The same frame twice with one noun swapped counts as the same use. For a word with one sense (คุ้ม,
   แนะนำ), vary the frame: question / answer / follow-up, different objects, different persons, negative vs positive.
6. COHERENCE inside the exchange: A says or asks, B answers that, A follows up on B's answer. Nothing refers outside the three lines.

Do NOT rewrite a sound exchange for taste. Do not change PH except for a clear error (the app re-romanises the Thai from its own
dictionary; PH here is only a reading aid).

After editing, run the self-check on each file until every word passes (closed vocabulary, length, speakers, target present):
  sh /home/user/Language-Teacher/dev/sandbox/curriculum/thai-exchange-bank/check.sh <file>
A word that passed before must still pass. Reply with: files reviewed, exchanges changed (count), final USABLE counts, and up to 8
example corrections (before → after, with the reason).
