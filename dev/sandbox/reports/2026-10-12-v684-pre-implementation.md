# v684 — Teaching-quality overhaul: defect assessment and design (before implementation)

**Date:** 2026-10-12

**Scope:**
- An offline audit of the three real production v683 Daily Tracks you exported (Thai, Japanese and Mandarin, 12 Oct): all 270 target exercises plus the framing lines.
- **No paid API calls were made.** Production v683 is untouched, and no learner data was read from or written to any device.

**How each judgement was reached (three independent kinds of evidence):**

| Kind of evidence | What it is |
|---|---|
| **Mechanical checks** | Deterministic comparisons against independent open-source references that the app does not use: the Japanese morphological dictionaries UniDic and IPADIC, the pypinyin dictionary with the standard Mandarin tone-change rules, and a Thai consonant-class tone calculator. These are objective. |
| **AI review** | One independent Claude reviewer per language, reading every exercise against 11 criteria. **This is AI judgement, not native-speaker certification.** |
| **Your review** | Every item you named was checked individually (section 1.4). |

## TL;DR

- **The three lessons are worse than "90/90 READY" suggests.** Exercises the AI reviewers rated fully clean:

  | | Fully clean | Clean or minor only | Critical (teaches something wrong) |
  |---|---|---|---|
  | Thai | 12 of 90 (13%) | 34 of 90 | 16 |
  | Japanese | 17 of 90 (19%) | 53 of 90 | 1, plus framing pair 91 |
  | Mandarin | 30 of 90 (33%) | 65 of 90 | 7 |

- **Every problem you raised is real**, and more of the same kinds exist:
  - Thai: wrong tones on แล้ว (5 lines) and โกรธ (3 lines); พอ taught through a different word (พอดี).
  - Japanese: a second wrong reading (何にも read なににも); はい/いいえ used with a friend six times.
  - Mandarin: 我们 shown as "wómen" three times; 可以 missing its spoken tone change in five lines; six Mandarin cues that each lead to two different answers.
- **Four structural causes produce almost all of it:**
  1. **Nothing decides what a sentence is *for*.** Each line is written one at a time for one word, with no purpose, listener or reply planned. The model fills the gap with whatever allowed words are at hand, and the conversation is stitched together afterwards. This one cause explains the incoherent turns (the largest group), the same-pattern repeats and the "pointless" lines.
  2. **Pronunciation is never checked against the sentence.** The Japanese check confirms only that the romaji matches the kana, so a wrong-but-consistent pair (どこかいきの / dokokaikino) passes. The Mandarin tone-change code mishandles 一 and neutral tones. The Thai checks compare the line with the app's own dictionary, and that **dictionary itself has about 20 wrong tones** (แล้ว, ใช้, ซ้าย, สาย, เริ่ม, โกรธ …). The app even contains a correct Thai tone engine, but nothing calls it.
  3. **The "sense" of a word is not part of the plan.** A fixed hint ("หลัง counts houses") is attached to the spelling หลัง whatever sense is being taught. Target checks only test whether the spelling appears.
  4. **Many checks, none on the finished lesson.** Each language runs a dozen overlapping checks at different stages. The AI judges see one sentence at a time, and nothing re-checks the frozen final lesson as a whole after recovery, reordering and pronunciation repair. So "READY" means "the checks ran", not "the lesson is good".
- **Proposed design:**
  - **A teaching plan** (sense, function, who speaks to whom about what and why) in which every recall lives inside a short exchange.
  - **Pronunciation computed or verified by rules, not by the model.**
  - **One final gate** on the frozen lesson with 12 criteria, reporting seven separate scores. One failed exercise means not READY.
  - **Targeted repair:** change the plan, regenerate only the failed line, and stop honestly.
- **Next:** I will implement this offline (no paid calls) on the development branch, with a regression corpus built from these 270 exercises and reference fixtures. Then I'll propose a live budget and wait for your approval.

---

## 1. Defect assessment

### 1.1 Totals (all 270 target exercises)

| | Thai | Japanese | Mandarin |
|---|---|---|---|
| Fully clean | 12 | 17 | 30 |
| Minor only (subjective, or low value) | 22 | 36 | 35 |
| Major (unnatural, unproducible cue, contradiction, same-use repeat, incoherent turn) | 40 | 36 | 18 |
| Critical (teaches something wrong: sense, grammar, pronunciation or meaning) | 16 | 1 | 7 |
| AI reviewer's overall score | 4/10 | 5/10 | 5/10 |
| Your score | 5.0/10 | 4.0/10 | 4.0/10 |

**Major and critical problems by kind (O = objective error, S = subjective judgement):**

| Kind | Thai | Japanese | Mandarin |
|---|---|---|---|
| Conversation does not hang together (reply ignores the question, a speaker answers himself, a contradiction, a referent never mentioned) | 28 O | 20 O | 1 O, 1 S |
| Pronunciation wrong or missing | 16 O | 2 O, plus framing pair 91 | 20 O |
| Same use repeated (one word or frame swapped) | 15 O | 8 O | 11 O |
| Cue cannot produce the answer, or two cues are identical | 9 O | 5 O | 6 O |
| Unnatural or ungrammatical | 13 O | 2 O, 3 S | 2 O |
| Wrong sense of the target | 6 O | — | 1 O |
| Wrong English meaning | 3 O | 6 O | 1 O |
| Speaker or register | 1 O | 2 O, 6 S | — |
| Weak teaching value | — | 2 S | 2 O |

Full per-exercise table (language, pair, target, recall, severity, criterion, objective or subjective, source, correction): `dev/sandbox/v684/audit/audit.md` and `audit.json`.

### 1.2 Pronunciation, found mechanically

| Language | Pair | Line | Shown | Correct | Why it passed |
|---|---|---|---|---|---|
| Japanese | 91 (framing) | どこか行くの？ | どこかいきの / dokokaikino | どこかいくの / doko ka iku no | Copied from the model unchecked; the finaliser then **rewrote the romaji to match** the wrong reading (section 3) |
| Japanese | 48 | 欲しい物、何にもないよ。 | なににも | なんにも | The app's own 何 rule **forces** なに before に (it would have changed a correct なんにも) |
| Mandarin | 39 | 有一点。 | yóu yìdiǎn | yǒu yìdiǎn | The tone code treats "yìdiǎn" as a 3rd-tone word because a 3rd-tone mark appears anywhere in it |
| Mandarin | 82 | 你等一下。 | yī xià | yíxià | No 一 rule exists. The line kept the model's yī xià; the corrected word yíxià was compared without tone marks, so they "matched" |
| Mandarin | 15, 45, 77 | 我们… | wómen | wǒmen | Same tone-reading bug: "wǒmen" and "yìqǐ" are both treated as 3rd-tone words |
| Mandarin | 3, 9, 33, 65, 71 | …可以… | no spoken line | kéyǐ | Tone change is applied only between words, never inside one; an unchanged spoken line is not printed |
| Thai | 11, 14, 27, 54, 55 | แล้ว | lâeo (falling) | láeo (high) | The app's dictionary entry is wrong and overrides the correct function-word table; the line check **drops tone marks** before comparing |
| Thai | 60, 61, 62 | โกรธ | krôot (falling) | kròot (low) | Dictionary entry wrong |
| Thai | 38 | ร้อน | rón | ráawn | Dictionary entry has the wrong vowel |
| Thai | 78–80 | ผู้ชาย | phûu-chai | phûu-chaai | Dictionary entry has a short vowel |
| Thai | 51–53 | พอ | phaw | phaaw | The display converter drops vowel length (ɔɔ → "aw") |
| Thai | 7 | หน่อย | nàwi | dictionary nɔ̀i; the tone is right | The converter's spelling of ɔ + i as "awi" (open question 1) |

**Thai dictionary scan:**
- I checked all 587 one-syllable words in the canonical bank with the tone rules: 27 disagreements.
- I adjudicated each by hand. **20 are real dictionary errors**, and 7 were limits of my first-draft calculator.
- The real errors include common White and Orange words: ใช้ (chây → chái), แล้ว, ซ้าย (sâai → sáai), สาย (sâai → sǎai), เริ่ม, เหรอ, เช่า, ช้อน, ชัด, แก่ and เกิด.
- List: `dev/sandbox/v684/audit/th-bank-tone-scan.json`.
- **I have not changed any dictionary entry.** That needs your approval (section 7).
- The Mandarin (100) and Japanese (100) banks matched the independent references, apart from legitimate neutral tones and alternative readings.

### 1.3 Representative defects per language

**Thai (3-line exchanges):**
- **Wrong sense:**
  - หลัง (72–74) is taught three times as the house counting word.
  - พอ (51, 52) appears only inside พอดี, "just right", which is a different word.
  - ล่ะ (10) is put on a statement (ฉันอยากกินข้าวล่ะค่ะ).
- **Grammar:**
  - ไปตรงไป (54).
  - ตกลงครับ is used as a question (21).
  - Questions with no question word: บ้านหลังนั้นของคุณคะ (73) and ผู้ชายคนนั้นของคุณคะ (79).
- **Coherence (28 lines):**
  - A says "I probably have to go now" (14), then "we'll eat until night" (15).
  - A answers "yes" to his own line (16).
  - B asks "what will you wear?" right after A said it twice (29).
  - Hands, trousers and "he" appear with no antecedent (39, 28, 60).
- **Cues:** "buy" for อยากได้ (3); "wash his hands" when the Thai has no มือ (39).
- **Repeats:** ผู้ชายคนนั้น…×3, ผู้หญิงคนนั้น…×3, ทำงานถึง…×2, ผมมีเสื้อผ้า(ใหม่)เยอะ×2.

**Japanese (Kenji ↔ Yumi at a station):**
- **Readings:** pairs 91 and 48.
- **Speaker:** pair 4 tells Yumi to "ask Yumi".
- **Register:** はい/いいえ with plain endings between friends (25, 29, 33, 58, 61, 64).
- **Pointless questions:** この電車、どこか行く？, この電車、好き？ and 今ある？ (no referent).
- **English:**
  - "How do you think about this?" (60), "How is today?" (66), "Are you riding together?" (19).
  - 何するの？ glossed "What are you doing?" (86); that is pair 51's 何してるの？.
- **Coherence (20 lines):**
  - "Yeah, I'm going" is followed by "Why aren't you going?" (26→27).
  - "What will you drink?" is answered "Yeah, I'll eat it" (77→78).
  - A speaks twice in a row four times.
- **Repeats:** ああ、分かるよ / うん、分かるよ; 買う物ある？ / 何か買う物ある？; また来る？×2; じゃあ、またね×2.

**Mandarin:**
- **Pronunciation:** the 20 lines in section 1.2.
- **Sense and meaning:** 回什么？ (57) is not a sentence (回 is "go back"; returning an item is 还); 那个谁？ (64) means "what's-his-name", not "Who is that?".
- **Cues:** six cues each map to two different answers (23/26, 33/58, 34/52, 55/61, 62/87, 53/86).
- **Repeats:**
  - 这个(很/太/不)+adjective in about 20 lines.
  - 这个可以慢一点吗 / 这个可以快一点吗.
  - 等一下 ×3.
- **Weak lines:** 我想喝一点 after "Is this good?" (59); 这个东西很慢 (75); 家很大 (67).
- **Framing:** the greeting and the goodbye are both answered only by 嗯 (2, 94).
- **Why 255 requests, 112 of them retries:** 134 candidates were rejected.
  - 38 were "sentence already used for another target", 25 "same use as an accepted recall" and 21 "identical sentence already used for this target". That is **84 of 134 rejections** from the model producing 这个很X again and again, because nothing told it what each sentence was about.
  - 29 were untaught words.
  - The retry prompt differs only by a short "rejected because …" note, so the model often returned the same sentence.

### 1.4 Your named items

| Your item | Verdict |
|---|---|
| Thai 72–74 หลัง as a house classifier | **Confirmed, critical.** All three are the classifier, in one repeated frame. 73's cue also says "hers" where the Thai says "yours". |
| Thai 18 ผมทำงานถึงตอนนี้ครับ | **Confirmed, major.** Not idiomatic Thai, ungrammatical English, and it doesn't answer B's invitation. |
| Thai 54 ไปตรงไป | **Confirmed, critical.** It doubles ไป, "yes" confirms nothing, and แล้ว has the wrong tone. |
| Thai 79 ผู้ชายคนนั้นของคุณคะ | **Confirmed, major.** No question word, and ของคุณ is not how Thai asks "is he your boyfriend". |
| Thai 7 nàwi for หน่อย | **Partly confirmed.** The tone and vowel are right (dictionary nɔ̀i). The **display converter** writes ɔ + i as "awi", which reads wrongly to an English speaker. A convention to fix, with your choice of spelling (open question 1). |
| Thai conversation integrity | **Confirmed, the largest Thai problem** (28 lines). |
| Japanese 91 どこかいきの / dokokaikino | **Confirmed, critical.** It passed because no check compares the reading with the sentence. |
| Japanese 4: Yumi told to ask Yumi | **Confirmed.** No check compares the cue's addressee with the speaker. |
| この電車、どこか行く？ / 今ある？ / この電車、好き？ | **Confirmed, major** (empty or odd questions; no train in the scene). |
| Japanese 60 "How do you think about this?" | **Confirmed.** The English meaning is ungrammatical. |
| 分かる: ああ、分かるよ / うん、分かるよ | **Confirmed, same-use repeat.** The "distinct" check counts a different interjection as different. |
| はい/いいえ in casual talk | **Confirmed: six lines.** |
| Mandarin 39 有一点 yóu | **Confirmed, critical.** Also, after 这个小吗？ it means "a little, yes", not "there is a little". |
| Mandarin 82 一下 yī xià | **Confirmed, critical.** |
| Mandarin weak material | **Confirmed:** 我想喝一点 (59), 这个东西很慢 (75), 那个谁？ (64, wrong meaning), 回什么？ (57, not a sentence). |
| Repetitive 这个很X | **Confirmed:** about 20 lines, and 84 rejected candidates of the same shape. |
| Greeting and goodbye followed by 嗯 | **Confirmed** (2 and 94). |
| Why 255 requests / 112 retries | **Explained above:** no content plan, plus near-identical retry prompts. |

---

## 2. Common underlying causes

1. **No communicative intent: the biggest cause.**
   - Each recall is generated alone, for one word. The model is told the word, a grammar label or function, and the allowed vocabulary; it is never told *what this sentence is for*.
   - So it writes the shortest sentence that contains the word (这个很慢, 今ある？, บ้านหลังนั้น…).
   - The conversation is then assembled, and sometimes reordered, from independently written lines. That is why replies ignore questions, people answer themselves, and topics jump.
   - This one cause explains the coherence group (49 lines across the three lessons), most of the repeats (34) and the pointless lines. It also explains the Mandarin retry storm.
2. **Pronunciation is trusted, not verified.**
   - Readings, pinyin and Thai phonetics come from the model or from word-level lookups.
   - The checks test the form of the pronunciation (no kanji left, romaji matches kana, a dictionary entry exists), never whether it is the pronunciation *of this sentence*.
   - In Thai, the reference itself (the vocabulary bank) has wrong tones, and its display converter loses vowel length.
3. **Sense is not part of the plan.**
   - The target check is "does the spelling appear?".
   - Hints are keyed by spelling, not by sense: หลัง → "counts houses", reinforced by หลัง being listed as a classifier building block.
   - So a different sense passes, and is even encouraged.
4. **Checks are scattered and run on drafts, not on the finished lesson.**
   - Each language has its own set of overlapping checks with different rules (section 4), at different stages.
   - The AI judges see a single sentence (or a group of three) without the speaker, the addressee or the previous line, so they cannot see coherence or cue/speaker contradictions.
   - The final coherence judge scores the whole conversation once, returns a number (4/5 passed), and does not fail individual lines.
   - Then recovery replaces lines, the track is reordered, and pronunciation is repaired. Nothing re-checks the frozen result.
   - The final summary counts *checks that ran*, so "READY · 0 pronunciation issues" was printed over lessons with wrong readings.
5. **Retries instead of a different plan.** When a candidate fails, the next request is nearly the same prompt with a short rejection note. The model repeats itself (21 identical Mandarin repeats). The phase-3 "application switch" helped only the experimental path.

---

## 3. Code paths responsible

**Scope of the trace:**
- Traced on the production (canonical) path: experimental switch off, in `dev/tt.jsx`.
- Full detail, with line numbers and quoted code: `dev/sandbox/v684/audit/code-paths.md`.
- Each case was reproduced offline by running the app's real functions.

| Defect | Produced by | Should have been caught by | Why it wasn't |
|---|---|---|---|
| JA pair 91 どこかいきの / dokokaikino | Scene model's `closing_reading`, copied by `jaFramingPair` | `auditJapaneseReading` (the only check behind "PRONUNCIATION ALIGNMENT") | `_jaFinaliseMetadata` saw the romaji disagree with the reading and **rewrote the romaji from the reading**. The audit then compared the romaji with that same reading, so the test was circular. Framing lines get no model check at all. |
| JA pair 48 なににも | Model reading, endorsed by `jaNaniReadingFor` / `jaFixNaniReading` | same | The 何 rule returns なん only before で/の/と/だ/な/counters. It **actively rewrites** なんにも to なににも. Nothing compares the reading with the sentence: a dictionary-based reading builder exists (`jaDeterministicReading`), but only Listening uses it. |
| ZH yóu / wómen | `mandarinSpokenPinyin`, `toneOf` | `_zhFinaliseMetadata` | `toneOf` returns 3 if a 3rd-tone mark appears *anywhere* in a word ("yìdiǎn", "wǒmen"), so 3-3 fires wrongly. Tones are never validated: the pinyin comparison strips tone marks. |
| ZH 一下 yī xià; 可以 with no spoken line | Model pinyin; `mandarinSpokenPinyin` | same | There is no 一 rule. 3-3 is applied only between words, never inside 可以. The export prints the spoken line only if it differs. |
| TH แล้ว / โกรธ tones, ร้อน / ชาย vowels | **The app's word bank**, loaded first by `buildThaiPhoneticLexicon`. It overrides the correct `THAI_FUNCTION_PHONETICS` entry (แล้ว láaeo). | `thaiPronunciationLineAudit` | It compares the line with the same bank (circular), and its match key **drops tone marks and vowel length**. The correct tone engine (`calcThaiSyllableTone`) is never called. |
| TH หน่อย "nàwi", พอ "phaw" | `fixIPAPhonetic` display converter (ɔ → aw; ɔɔ → aw) | — | No check looks at the converted spelling. |
| TH หลัง as a classifier | `thaiClassifierGuideFor` puts "หลัง counts houses: บ้านหลังนี้" into line 1 of the prompt, beside "INTENDED SENSE: after / back" | `thaiTargetPresent`; `_finalNaturalnessJudge` (wrongSense) | Presence is a spelling match. `THAI_NOUN_CLASSIFIER` marks บ้านหลัง as *correct*. One lenient early AI verdict was **cached and reused** by every later stage. The sense check that would catch it (`thaiTpSenseProblem`) runs only with the experimental switch on. |
| JA pair 4 "ask Yumi" spoken by Yumi | The model writes the cue before any speaker exists; `assembleRecallsByScene` then assigns A/B by alternating position | `aiQcPromptMatch` | The cue judge is never shown the speaker and is told person differences are "never a mismatch". It still scored 3/5, and **3/5 is auto-accepted** for Japanese and Mandarin (Thai rejects below 4). |
| Same-use repeats (分かる, 等, …) | Per-recall generation without a plan | `recallVariationKey`, `japaneseFormulaKey`, `zhApplicationKey` | Regex order bug (あ is stripped before ああ). The Mandarin key keeps an object pronoun as "different". **The final distinct-uses count is diagnostic only and never blocks READY.** The group judge is told "simple repetitive sentences are GOOD". |
| Incoherent conversation | Recalls written one by one, then assembled; speakers assigned by position; the track reordered | `mainTrackCoherenceAudit` | It sees **English only, target lines only**, scores whole sections (pass ≥ 3/5), runs **before** the text is frozen, and never fails an individual line. |
| Mandarin 255 requests | `generateMandarinOneRecall`: one request per recall, up to **10 paid attempts** at this level (Japanese is capped at 3), plus 3 quota rounds, each with full QC | — | From the 4th attempt on, the retry prompt is byte-identical when the failure repeats. The ledger shows 10 identical prompts sent. |
| "READY · 0 issues" | `_jazhQcStatus` reports semantic QC COMPLETE whenever QC *ran* | — | No model judge runs on the frozen final lesson. After the freeze, only pronunciation rebuilding and deterministic checks run. |

**A pattern worth naming:** fixes for several of these exist in the file (classifier sense, speaker line in the prompt, the per-sentence judge, re-judging repaired groups, a single same-use test). They sit behind the experimental switch, so production runs none of them. Meanwhile the experimental path showed in phase 3 that adding rules to the old generators does not fix the missing content plan. **The new design therefore does not keep patching the old per-language pipelines.**

## 4. Old validations: fix, consolidate or remove

**Production v683 keeps all of its current checks** until a replacement has proven better. Everything below applies to the new v684 path, which runs behind the experimental switch on the development branch.

### Fix (correct idea, wrong implementation). Fixed once, inside the new verifiers

| Check | Fix |
|---|---|
| `jaNaniReadingFor` | 何にも → なんにも (the rule now enforces an error) |
| `mandarinSpokenPinyin` / `toneOf` | Replace with syllable-level rules: 一 and 不 first, then 3-3 on the resulting tones; intrinsic neutral tones block 3-3; always show the spoken line when anything changes |
| `_zhFinaliseMetadata` pinyin comparison | Compare **with** tones; rebuild the line pinyin from the corrected words |
| `thaiPronunciationLineAudit` match key | Keep tones and vowel length |
| `buildThaiPhoneticLexicon` | A disagreement between the bank, the reviewed function-word table and the tone engine is reported, never silently resolved in favour of the bank |
| `recallVariationKey` / `zhApplicationKey` | Superseded by plan function ids (below) |
| `aiQcPromptMatch` | A missing score counts as **fail**, not 5; 3/5 is not auto-accepted; the judge sees the speaker |
| `_jazhQcStatus` | COMPLETE only when every line of the frozen lesson carries a verdict |
| Mandarin generator | Set its version labels (the "legacy (pre-v651)" header was a missing label, not a different path) |

### Consolidate (many overlapping checks become one)

| Area | Today | New |
|---|---|---|
| Japanese pronunciation | `structuralValidateJapanesePair`, `auditJapaneseReading`, `japanesePronunciationAlignment`, `validateJapaneseContextualReading`, `validateJapaneseReadingOutput`, plus the romaji rewrite | **One** `jaVerifyReading`: is the reading derivable from the sentence (kana unchanged, kanji read as the taught words read them, 何 by context), and does the romaji transcribe it? |
| Mandarin pronunciation | Format check plus toneless comparison | **One** `zhVerifyPinyin`: dictionary syllables per character, and spoken = computed |
| Thai pronunciation | Bank-first lexicon plus a tone-blind line audit | **One** `thVerifyPhonetic`: per-word dictionary match plus tone rules plus vowel length |
| Same use | 4 Mandarin key functions, `japaneseFormulaKey`, `recallVariationKey`, the Thai variation key | Plan function ids, plus one target-masked frame-similarity measure |
| Cue | 3 form checkers, 3 AI cue judges with different thresholds (≥4 Thai, ≥3 ja/zh), "Say: …" and "Tell the other person: …" rewrites | One cue criterion: deterministic form + addressee ≠ speaker + no duplicate cue with a different answer, plus judge criterion 4 |
| Naturalness, sense, coherence | `aiQcEvaluateGroup`, `_qrEvaluateGroup`, `_finalNaturalnessJudge`, `_qrBatchPromptCheck`, `mainTrackCoherenceAudit` | **One final judge on the frozen exchanges** (section 6) |
| Grammar building blocks | 2 Mandarin lists, 4 Japanese lists, 5+ Thai lists | One scaffolding table per language |

### Remove (in the new path)

- **Verdicts cached at generation time and reused as final verdicts.** The final gate always judges the final text.
- **Rewriting romaji to match a wrong reading.** Mismatches are flagged instead.
- **Overwriting model cues** with "Tell the other person: <English>" / "Say: <English>". The cue comes from the intent card.
- **Repair prompts that say "repeat a correct one"**, and the judge instruction "repetitive sentences are GOOD".
- **Spelling-keyed sense hints** (the หลัง classifier guide), replaced by sense-keyed hints in the plan.
- **Blind identical retries.** A prompt identical to one already sent is refused.
- **Generation-time cheap checks are kept** as early filters, but they call the *same* functions as the final gate, so the two can never disagree.

---

## 5. Proposed teaching-plan design

**Principle:** *every exercise teaches a specific vocabulary sense through a natural, useful act of communication.* The plan is decided before any sentence is written, and it is the only source of instructions. Generator, checker and repair all read the same plan.

### 5.1 Step 1 — the sense record (deterministic, per target)

- **What the learner is studying:** gloss, part of speech and sense label, from the vocabulary entry. Thai entries already carry `senseId`.
- **Other senses** this spelling has that must *not* be taught today, e.g. หลัง: house classifier; 回: "return an item" (还).
- **Register.** For example いいえ/すみません are polite and go to staff or strangers only; between friends the casual alternatives are used.
- **Word hints keyed by sense, not spelling.** "หลัง counts houses" applies only when the entry's sense is the classifier.

### 5.2 Step 2 — three functions (deterministic)

- From the word's **function class** (modal, preference, degree, question word, classifier, particle, verb of motion …; the phase-3 table), three **different** function ids per word.
  - Example for 一点: request a change / accept a small amount / ask for a slightly different item.
- Recovery may switch to an unused function. It never re-sends the same one.

### 5.3 Step 3 — the intent card for each recall (one planning request per batch, then validated)

**What the model writes:** one card per recall (no target-language sentences):
- who speaks (A or B);
- to whom (friend / shop assistant / station staff / stranger / driver …);
- the situation;
- the purpose in one plain sentence.

Example: *"A customer asks whether the shop has a slightly bigger one before deciding to buy."*

**Deterministic validation of each card:**
- Functions are distinct, as in step 2.
- The speaker is not the addressee.
- The register follows the addressee: friend → casual; staff or stranger → polite.
- Polite-only words appear only in polite cards.
- No situation is used more than 3 times in a lesson.
- The purpose names an action, not a topic.

A card that fails is re-planned (a different function or situation), not re-phrased.

### 5.4 Step 4 — exchanges, not one stitched-together story

- Every recall belongs to a **short exchange**: two lines for Japanese and Mandarin; Thai keeps its three-line exchanges.
- **Who plays which line:**
  - Where it fits, the other line is another target's recall: a question with どこ answered by a line teaching あそこ.
  - Otherwise it is a short bridge line. Bridge lines never count toward the 90, and are capped.
- **The lesson is a sequence of exchanges.** Each cue states its situation ("At the station, ask the staff member …"), so a change of scene is explicit rather than a non sequitur.
- **Coherence becomes checkable**, line against line inside an exchange: is the question answered, do the speakers alternate, does a referent appear before it is used?
- **Names are not used in cues.** Cues say "your friend", "the shop assistant" and so on, which removes the "Yumi, ask Yumi" class entirely.

### 5.5 Step 5 — constrained vocabulary and scaffolding

- **Content words stay strictly closed** (no weakening).
- **Grammatical scaffolding comes from one documented table per language:**
  - Mandarin particles and measure words (的 了 吗 吧 呢 个 …);
  - Japanese particles, polite endings and inflections (は が を に で ね よ です ます …);
  - Thai particles and polite markers (ครับ ค่ะ คะ นะ ไหม เหรอ …).
- **This merges today's overlapping lists** (two Mandarin, four Japanese, five or more Thai; section 4).
- **Each exercise records which scaffolding it used.** That is shown as "building blocks" and **never written to the learner's progress (SRS) as mastered**.

### 5.6 Pronunciation produced by rules where possible

| Language | How pronunciation is produced and checked |
|---|---|
| Mandarin | The **spoken line is computed, not generated**. Start from each syllable's citation tone (the dictionary line), apply 一 and 不 first, then 3-3 using the *resulting* tones. Neutral tones (们 的 了 吗 吧 子 …) never trigger 3-3. A spoken line is always shown when any tone changes (可以 → kéyǐ). |
| Japanese | The **reading must be derivable from the sentence.** Every kana in the sentence appears unchanged and in order in the reading (this alone catches どこかいきの). Every kanji run must map to a reading of a taught word, including its inflection. The romaji must transcribe the reading. |
| Thai | Each word's phonetic is checked against the dictionary **and** against the consonant-class tone rules. The app's own unused tone engine is reconnected, and a vowel-length check is added. A disagreement between the dictionary and the rules is reported as a dictionary error; it is never silently accepted. |

---

## 6. Proposed final quality-gate design

**One gate, run once, on the frozen final lesson:** after every regeneration, recovery, reorder and pronunciation step.
- The gate result is tied to a fingerprint of the lesson text. Any later change voids READY.
- **One failed exercise means the track is not READY.** The draft is kept, and repair is targeted (6.4).

### 6.1 The 12 criteria per exercise, and who checks each

| # | Criterion | Deterministic check | AI judge (one batched request, low temperature) |
|---|---|---|---|
| 1 | Target sense | Target present; known other-sense patterns flagged, such as a classifier frame when the sense isn't a classifier | Is the target used in the planned sense? |
| 2 | Grammar | Existing sound language rules (e.g. 太…了, a bare adjective predicate) | Grammatical? |
| 3 | Naturalness | — | Would a native speaker say this, to this person, here? |
| 4 | Producible cue | Cue is English, names the act and the addressee; no other exercise in the lesson has the same cue with a different answer | Can a learner produce *this* sentence from this cue? |
| 5 | English meaning | — | Accurate? |
| 6 | Communicative intent | Linked to a validated intent card | Does the sentence carry out the card's purpose? |
| 7 | Speaker and register | Cue addressee ≠ speaker; Thai gender particles; polite words only to staff or strangers; casual between friends | — |
| 8 | Distinct recalls | Three different function ids; frame similarity with the target masked out | Are they three different uses? |
| 9 | Pronunciation | **Independent verifiers only** (5.6); never the model | — |
| 10 | Coherence | Speakers alternate; a question is followed by the other speaker's reply; a referent appears before it is used | Does the line respond to the previous line in its exchange? |
| 11 | Complexity | Length or word count for the learner's rank | — |
| 12 | Closed vocabulary | The existing tokenisers plus the single scaffolding table | — |

**The AI judge:**
- It sees each exchange whole (speaker, addressee, previous line, cue, sentence, English and intent card) and returns a pass/fail with a reason **per criterion**.
- **It is calibrated** against the regression corpus (6.3) before it is trusted, and its catch rate is reported as AI against AI.

### 6.2 Scores reported separately (no single "100% quality")

| Score | What it covers |
|---|---|
| Technical | Completeness, structure, closed vocabulary, complexity |
| Correctness | Sense, grammar, meaning |
| Naturalness | Would a native speaker say it here |
| Meaning and cue | Cue producibility, English meaning |
| Usefulness | Intent realised, teaching value |
| Coherence | Lines respond to each other within an exchange |
| Pronunciation | Independent verifiers |

- Each score is a count of exercises passing that group, out of 90.
- READY requires 90/90 on all of them.
- The export prints exactly which exercises failed which criterion.

### 6.3 Regression corpus (offline)

- **Source:** the 270 audited exercises, each labelled clean / minor / major / critical, with the failing criterion. The audit labels are AI and mechanical; your named items are marked as owner-confirmed.
- **Also included:** examples earlier validators wrongly rejected (from the phase-3 rejected-candidate set), so false rejections are measured too.
- **What is measured:** catch rate and false-alarm rate for each deterministic criterion, and for the gate as a whole. The AI part is measured on recorded or mock verdicts offline, and only measured live after your approval.

### 6.4 Repair loop (replaces "retry")

1. Identify the failing criterion.
2. Keep every accepted exercise.
3. For pronunciation, recompute by rule; no model call.
4. Otherwise choose a different function or intent for that recall. **A prompt identical to one already sent is refused.**
5. Generate only that line, plus its exchange partner if coherence requires it.
6. Validate.
7. Re-run the gate on the exchange and the pronunciation.
8. After two plan changes, stop. The lesson stays a draft, and the report names the exercise and the reason.

No relaxation, no string-built sentences, no blacklists of sentences.

---

## 7. Decisions I need from you (none block the offline work)

1. **Thai dictionary corrections:** about 20 tone entries (list in `th-bank-tone-scan.json`), plus vowel errors such as ร้อน "rón" and ผู้ชาย "chai".
   - Fixing them changes what the app displays and teaches for those words. It does not touch IDs, progress or history.
   - Until you approve, the new gate will **flag** lines containing them rather than pass them.
2. **Thai spelling of ɔ + final i/y** (หน่อย "nàwi"): keep it, or show "nàwy" / "nòi"? Also, should the converter keep vowel length (พอ "phaaw", not "phaw")?
3. **Mandarin dictionary line for 一:** the vocabulary lists 一点 as "yìdiǎn" (already changed). Should the dictionary line show citation "yīdiǎn", with the spoken line "yìdiǎn"? I propose yes, to keep the two lines distinct as you asked. The vocabulary list itself would stay as it is.

---

## 8. What I implement next (offline, development branch, no paid calls)

1. **Independent pronunciation verifiers** for all three languages, in the app code, used only by the new path.
   - They are already prototyped against these lessons, and they find exactly the errors listed in 1.2 with no false alarms on the other lines:
     - Mandarin: the 10 real errors.
     - Japanese: pairs 91 and 48.
2. **The teaching-plan module:**
   - sense record, functions and intent cards;
   - exchange assignment;
   - the planning-request prompt and schema;
   - deterministic plan validation;
   - the single scaffolding table.
3. **The single final gate** (12 criteria, 7 scores) and the batched judge request (prompt, schema, decision rule).
4. **The repair loop** (plan change, generate only the replacement, re-gate, honest stop, identical-prompt refusal), tested with a scripted fake model.
5. **Regression corpus and tests:**
   - the 270 audited exercises (with the v683 versions frozen as the baseline);
   - wrongly rejected examples;
   - the reference fixtures (5 targets × 3 recalls per language, designed by me, not Gemini output; `dev/sandbox/v684/reference-fixtures.json`).
   - **What is measured:** catch rate and false alarms per criterion.
6. Then a report with the files changed, tests passed and failed, the improvements shown, the remaining failures, open linguistic questions, the commit, a **proposed live budget (I will wait for approval)**, and a deployment recommendation.

**What offline work cannot prove:** that Gemini will write better sentences from the new plan. That needs the blinded live comparison in phase 6, which needs your approval.

## TL;DR (repeat)

- **Lesson quality:** fully clean exercises (AI review) are Thai 13%, Japanese 19% and Mandarin 33%. All of your findings are confirmed, and more of the same kinds exist.
- **Four causes:**
  1. No communicative intent: lines are written one at a time and stitched together.
  2. Pronunciation never verified against the sentence. The Thai dictionary has about 20 wrong tones, and correct tone code goes unused.
  3. Sense keyed to spelling.
  4. Many overlapping checks, none on the finished lesson.
- **Fix:** a teaching plan with exchanges; rule-based pronunciation; one final gate on the frozen lesson with 7 separate scores; targeted repair. Production v683 stays untouched.
