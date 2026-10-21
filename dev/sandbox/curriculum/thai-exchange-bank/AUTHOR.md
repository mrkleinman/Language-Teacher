# Authoring brief — Thai exchange bank

You are a native-level Thai teacher writing vetted three-line mini-conversations for a Pimsleur-style Thai course (adult English
speaker). Each word in your batch gets ONE exchange. The app plays the lines; the learner hears the English CUE and must say the Thai.
An independent expert grades the result; "merely understandable" Thai is a defect. The standard: what a Thai friend would really say.

## Format (one block per line, blank line between blocks, numbered from 001 within the file)
003 [<target word exactly as given>] A
  CUE: Ask her if the bridge is far.
  TH: สะพานไกลไหมครับ
  PH: sà-phaan glai mǎi khráp
  EN: Is the bridge far?

## Hard rules (the app rejects anything else — check with check.sh)
1. Speakers A–B–A for every word: line 1 A, line 2 B, line 3 A. A = man (ends polite sentences with ครับ, says ผม). B = woman (ค่ะ for
   statements, คะ for questions, says ฉัน). They are friends; polite register.
2. EVERY line contains the target word as its own word (exact spelling).
3. At most 7 Thai words per line (particles ครับ / ค่ะ / คะ / นะ not counted); aim for 3–6.
4. CLOSED VOCABULARY: every word is the target or appears in the known-words file (numbers and particles excepted). No other words —
   check each content word. Do not use Thai names; use คุณ / ผม / ฉัน / เขา.
5. The exchange is self-contained: nothing points at something not said in these three lines.
6. CUE: grammatical English that says exactly what the Thai says, addressed as an instruction: "Ask her …", "Tell him …", "Say …".
   Refer to the listener as he/him (B speaks to A) or she/her (A speaks to B). Never "Say <question>?". A question → "Ask …".
7. Fixed renderings: ดู = watch / look, เห็น = notice, ชม = admire / appreciate.
8. PH: unaspirated ป=bp, ต=dt, ก=g; aspirated ph/th/kh; long ɔɔ = aaw, long əə = ooe, ʉ = ue / uue; tones à low, á high, â falling,
   ǎ rising, unmarked mid; hyphens join syllables of ONE word only (words separated by spaces; particles are separate words).

## Quality
- Three genuinely DIFFERENT, useful uses of the word across the three lines (different frames, collocations, senses where it has
  them) — never the same frame three times ("X is delicious / yes X is delicious / X delicious too").
- An answer answers the question. Correct classifiers (ใบ, ตัว, คน, ชาม, จาน, แก้ว, ขวด …) where Thai needs them, if known.
- Natural Thai word order and particles; no translated English ("บางทีเราควร…" is English; บางที…อาจจะ…ก็ได้ is Thai).
- Function words / particles (แล้ว, ก็, นะ, เลย …) are practised in their natural uses.

## Self-check (fast; run until every word passes)
  sh /home/user/Language-Teacher/dev/sandbox/curriculum/thai-exchange-bank/check.sh <your file> [word …]
It prints USABLE n/m and, for each failing word, the reason (untaught word, too long, missing target, speaker …). Never weaken the Thai
to pass: rephrase with known words. If a word truly cannot be done naturally with the known words, leave it out and list it.
