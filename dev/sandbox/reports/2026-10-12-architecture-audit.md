# Generation architecture audit: first report (2026-10-12)

Brief: "Generation Architecture Stabilisation" (Drive, 2026-10-12).
Evidence:
- the three production logs from 2026-10-12 (Japanese 89/90, Mandarin 90/90 READY, Thai 89/90);
- the v676–v682 sandbox runs;
- a read-only trace of `dev/tt.jsx` (≈40,900 lines).

No generation behaviour has been changed for this report.

**Builds.**
- Production: `main` @ d2669bc, "Release v682". The live logs say `build=v682`.
- Development: `claude/session-continuation-check-a19meq` @ bf1cb4a. Same app code as production, plus the regression corpus below.

---

## 1. Why quality and reliability have deteriorated

The short answer is that we kept adding rules instead of fixing the design. I contributed to this in v682. Six causes, each visible in the code and the logs:

1. **Every live failure got a narrow patch.**
   - Each bad sentence became a new regular expression, frame or exception, e.g. 你到吗？, 有你。, 这个多吗？, 多很好。.
   - v682 alone added dozens.
   - A blocklist only catches what it lists, so the next variant of the same mistake ships. 有不。 passed on 2026-10-12 because no rule mentions it.

2. **Backups are built by gluing strings, then filtered by those blocklists.**
   - Mandarin builds `'有' + word`, `'我要' + word`, `word + '。'`. Japanese builds `word + 'ある？'` and `'明日' + word + '？'`.
   - They pass the same validator as Gemini's sentences, but that validator only knows the listed mistakes.
   - Japanese even licenses "any noun + ある" (`JA_BARE_SUBJECT_VERBS`), which is why 一緒ある？ was accepted.

3. **A word counts as "teachable" if the backup can build anything for it.**
   - Japanese `japaneseTargetFeasibility` and Mandarin `mandarinTargetTeachable` decide teachability by whether the backup generator can build any sentence.
   - So a broken backup frame makes a word look teachable (一緒 because of 一緒ある？; 不 because of 有不).
   - The word is selected, Gemini struggles, and the broken backup is used.

4. **The instructions to Gemini contradict the checks.**
   - Thai หลัง: the prompt says "INTENDED SENSE: after / back" and also, from a classifier guide looked up by spelling, "หลัง counts houses: บ้านหลังนี้". Gemini followed the second, and every recovery round repeated both lines.
   - Japanese: the prompt says "particles are free", but the grammar check rejects かな / な / だけ and treats the interjection あ as untaught content.
   - Mandarin: the prompt calls "similar structures DESIRABLE" at low scarcity and lists the same 很 frame as the example, while the generator rejects that structure as "same application".

5. **Retries don't learn.**
   - Mandarin "same application" rejections are never recorded and the feedback never names the clashing sentence. Result: 很 recall 3 got the same 这个很小 nine times.
   - Mandarin quota recovery receives no rejection memory and feeds its own rejected sentences back as if they had been accepted.
   - Thai recovery re-sends the same contradictory instructions every round.

6. **READY and the test suite measure the machinery, not the language.**
   - READY means "every mandatory check ran and passed". Each check can only catch what it was written for.
   - Most of the ~60 regression checks assert that a rule exists or that a listed sentence is caught. They pass while new variants ship.
   - The Mandarin track on 2026-10-12 was READY with 有不。 in it. QC even flagged it (2/5) and still accepted it.

The result is too many mechanisms judging the same thing in different ways. Roughly:

| Stage | Thai | Japanese | Mandarin |
|---|---|---|---|
| Checking / repair / recovery stages per sentence | ≈45–50 | ≈35 | ≈30 |
| Separate "same application" judges | 3 | 4 | 4 |
| Exact-duplicate checks | 9 | 5 | 5 |
| Coherence systems | 5 | 2 | 1 |
| Recovery paths | 4 | 6 (+1 dead) | 3 |

They disagree. For example, Mandarin's fallback counts 我去 / 我不去 as different uses, while the generator counts them as the same.

---

## 2. The active generation architecture

The same order applies to all three languages. File: `dev/tt.jsx`; line numbers are approximate.

1. **Vocabulary selection.** `selectTrackTargets` (35328), with language selectors:
   - Thai `pickWords` 6707 → `freezeThaiTargetSelection` 6825
   - Japanese `japaneseSelectNewSlots` 40616
   - Mandarin `mandarinSelectTargets` 4763
   - New-word count: `newWordsPerTrack` 31335
2. **Teachability.**
   - Thai `thaiVocabEligibility` 31386 + `targetActivityPreflight` 31299 (metadata only)
   - Japanese `japaneseTargetFeasibility` 38634 (= "can the backup build something")
   - Mandarin `mandarinTargetTeachable` 3999 (same idea)
3. **Scene planning.**
   - Thai and Japanese: `planTargetScenes` 15463 / `finaliseScenePlan` 15525
   - Mandarin: none (greeting/goodbye lines only)
4. **Sentence generation.**
   - Thai `generateWordLines` 14365: one request per target, 3 lines
   - Japanese `generateTargetGroup` 39696: one request per target
   - Mandarin `generateMandarinOneRecall` 4314: one request per recall
5. **Validation.**
   - Thai: `validateSmartPairs` 13540 + `lintThaiContent` + speaker / particle / classifier / closed-vocabulary checks + an AI early semantic gate
   - Japanese: `jaEvaluateRecallCandidate` 39592 → `japaneseAcceptanceGate` 38735, about 15 sub-checks
   - Mandarin: `validateMandarinPair` 3741 → surface-grammar regexes (3593), then a separate same-application check in the generator (4401)
6. **Recovery.**
   - Slot regeneration (all languages)
   - Japanese auto-recovery loop (up to 45 passes)
   - Quota recovery (`enforceTrackPairQuota` 18400 → `_th/_ja/_zhRecoverTargetPairs`)
   - Coherence repair
   - Checkpoint resume / "Retry missing recalls"
7. **Deterministic backup.**
   - Japanese `jaFallbackRecall` 38998
   - Mandarin `mandarinFallbackPair` 4019
   - Thai template fallbacks 15841
8. **Final QC.**
   - Thai `runQualityCheckCore` 29651
   - Japanese / Mandarin `runAiQualityCheck` 34552: AI evaluation + regeneration
9. **Final audit.** `finaliseMainTrack` 18565: quota → coherence → text freeze → pronunciation → duplicate audit → READY / NOT_READY (18753).
10. **Save and playback.** Saved track list per language; playback unchanged.

**Dead or bypassed code found:**
- Japanese `japaneseRecoveryEngine` and its per-recall path
- Japanese `_retiredValidatePair`
- The `NEW_SLOTS_BY_KNOWN` table
- A Thai `_knownThai` check that can never run
- The Gen2 "new generator (test)" path: complete, but switched off

---

## 3. Contradictory and redundant rules

Each rule is classified using the brief's categories.

| Rule / mechanism | Classification | Evidence |
|---|---|---|
| Japanese "any noun + ある is fine" (`JA_BARE_SUBJECT_VERBS`) | **Unsafe: accepts bad output** | 一緒ある？ |
| Mandarin generic backup templates (有X, 我要X, X。, 很X …) filtered by blocklist | **Unsafe** | 有不。, 我要不。 |
| Japanese generic backup add-ons (今日/明日/一緒に + verb) | **Unsafe** | 明日分かる？ |
| Teachability = "backup can build something" (ja, zh) | **Incorrectly implemented** | 一緒 and 不 judged teachable via broken frames |
| Thai classifier guide looked up by spelling (`THAI_CLASSIFIER_TARGET_GUIDE['หลัง']`) | **Contradictory** with the intended sense | หลัง taught as the house classifier |
| Thai sense check (only an AI judge flag; `THAI_SENSE_POLICY` has 5 words) | **Necessary but not implemented** | wrong-sense หลัง accepted at check 1 |
| Japanese particle closure (かな, な, だけ) vs prompt "particles are free" | **Contradictory**; policy decision needed | どれがいいかな？ rejected 3×, forcing backups |
| Japanese interjection あ counted as untaught content | **Too restrictive / incorrect** | あ、すみません、分からない。 rejected |
| Japanese "どこ cannot be the object of 知る" also matching どこか | **Incorrectly implemented** | いい場所、どこか知ってる？ rejected |
| Japanese morphology reading 早く as noun 早い | **Incorrectly implemented** | 早く来てね rejected |
| Japanese cue-form check reading ")" instead of "?" | **Incorrectly implemented** | 一緒に乗らない？ rejected |
| Mandarin generation rejects Gemini's bad word segments, while QC repairs them | **Contradictory** | 我找你 / 我等你 rejected |
| Mandarin "same application": 4 different judges | **Redundant + contradictory** | generator vs backup vs audit vs recovery disagree |
| Mandarin bare-adjective rules (two regexes, start-of-sentence only) | **Incorrectly implemented** | 这个大 rejected; 这里人多 / 那个累 pass |
| Mandarin quota recovery seeds rejected sentences as "already used" | **Incorrectly implemented** | "identical sentence already used" for sentences never accepted |
| Mandarin final duplicate audit vs scarcity-A "repeats allowed" | **Contradictory** | generation and QC accept a repeat the final audit fails |
| Thai target presence: whole exchange in `validateSmartPairs` vs every line elsewhere | **Contradictory** | B lines without the target banked, then dropped |
| Thai topic carry-over (`runningTopic`, random reset) vs per-scene premise | **Contradictory** | prompts say both "flow from the last topic" and "stay in this scene" |
| Japanese QC deterministic checks skipped on the main path (flags not passed) | **Bypassed: unverified** | closed-vocabulary QC status always "pass" on the main path |
| Two Japanese conversation-basics lists (10 offered, 5 accepted) | **Contradictory** | そっか / なるほど offered, then rejected |
| Duplicate `JA_HINT_PAIRS` key (`'ごめん'` twice) | **Incorrectly implemented** | newer backups silently overwritten |
| Exact-duplicate checks (5–9 per language) | **Redundant** | different text normalisers in each |
| Coherence: 5 Thai systems | **Redundant** | |
| Closed vocabulary, early slot regeneration, early semantic gate, final audit target presence | **Necessary and working** | correct rejections in the corpus (時間, 时候, ไปรถตู้, etc.) |
| Transport collocation, Thai speaker / particle gender | **Necessary and working** | ผมจะไปรถตู้ครับ rejected; คะ fixed in v682 |
| Mandarin bare 不 with nothing after it | **Missing** | 有不。 |

---

## 4. Why fallbacks repeat or are unsafe

- **Repetitive.** Rejection memory doesn't reach the model on the paths that loop:
  - Mandarin same-application rejections are never recorded.
  - Mandarin quota recovery has no memory.
  - Thai recovery re-sends identical instructions.
  
  The feedback is generic ("use a different communicative function") instead of naming the sentence it clashed with. The prompt meanwhile recommends the very structure being rejected. So Gemini returns the same sentence until the check budget runs out, and the deterministic backup takes over.
- **Unsafe.** The backup builds sentences by joining strings, not from verified frames. Its only safety net is the blocklist. Sentences the blocklist doesn't know (有不, 一緒ある, 明日分かる) pass straight into the lesson. QC's "accept with a reason" path can then keep a sentence the AI judge itself scored 2/5.

---

## 5. Mandarin "only 5 words": root cause

**Affected screen (most likely):** the Mandarin **dashboard "Next targets" card**.

**What it does wrong:**
- The card lists `newTargets` (the raw selection, `MandarinTeacher` ≈40852/40956).
- It should list `targets`, the 30-word list after the feasibility check and top-up (≈40859–40876), which is what the generator actually receives (40981).
- The raw selection only tops up with words the learner has already met.
- A learner with few met words therefore sees "Next targets (5)": the 5 new words, nothing else. The generator for the same learner gets all 30.

**Also affected:**
- The generator header prints "TARGETING 5 WORDS · 5 NEW" (`describeTargetSelection` called with the raw counts, ≈36389), while 30 word pills render under it.
- Japanese has the same split. Its dashboard would show 3.

**Correct on purpose:**
- "Learn New Words", the "N new words" line on the Daily Track button, and the new-word screen show only new words by design.

**Saved vocabulary:** not truncated. `mergeMandarinVocab` keeps every bank word plus extra saved words.

**Fix (not yet made):**
- Show the 30-word `targets` list in "Next targets" and the header, labelled "30 words · 5 new · 25 review".
- Add a regression check that fails if that card shows fewer than 30 while the generator gets 30.

**Please confirm** this is the screen you saw. If it was the dictionary page, the belt page or the word list after a lesson, tell me and I will check that one instead.

---

## 6. Japanese new words: 3 instead of 5

- One constant, `JA_DAILY_NEW_WORDS = 3` (≈31330), fixes Japanese at 3 new words at every belt. It was added deliberately in v654. Everything downstream reads it, so all Japanese screens agree with each other on 3. None of them reads the belt table.
- The belt table (`BELT_CONFIG` 6436) says 5 at Mukyu, 10th and 9th Kyu, 7 at 8th–7th Kyu, and more above. Thai follows it.
- Mandarin gives 5 at White (Mukyu) and 3 above. The Mandarin word bank only covers White, so this hasn't mattered yet.

**Proposed single rule:** every language reads `BELT_CONFIG` through one function. Japanese at 10th Kyu becomes **5**. Any language exception must be written in that function with its reason, and shown on the belt card.

**Your decision is needed** on one exception: should Mandarin above White follow the table (5 / 7 / 10 …), or stay at 3?

---

## 7. Proposed simplified architecture

**One contract per language, used by every path.**

1. **Teaching plan, before any sentence is written.** For each selected target, the app fixes:
   - its **sense** (e.g. หลัง = "after / back", not the classifier);
   - its **word class** (content, function word, particle, classifier, response, set phrase);
   - **three different applications** it can be practised in with the learner's taught words.
   
   A target is "teachable" only if all three can be built from taught words with **curated, verified frames**, never from string templates. A target that can't be taught naturally is deferred with a reason. Nothing is lost from the curriculum, and the slot goes to the next eligible word.
2. **Generation** asks Gemini for those three applications, with **one consistent instruction set**. The instructions that conflict with the checks are removed (the classifier guide vs the intended sense; "similar structures desirable"; "particles are free" vs the particle check).
3. **One acceptance validator per language.** Generation, recovery, the backup and QC replacement all call it. It is built from the rules that are necessary and working, plus the corrected versions of the incorrectly implemented ones in section 3. One duplicate check and one "same application" key, used everywhere.
4. **Bounded repair.** For a failed recall:
   - one retry that names the exact failure and the sentence it clashed with, and asks for the next planned application;
   - then one retry with a different application;
   - then a **curated** backup frame that already passed the validator;
   - otherwise the recall is honestly **UNRESOLVED**. The draft is saved, and "Retry missing recalls" is offered.
   
   Rejection memory is kept for the whole recall, across every path.
5. **One independent final audit** of the saved content: the same validator, plus the AI meaning/naturalness judge. A 2/5 verdict from the judge can never be "accepted with a reason". READY requires every target to have 3 valid, distinct recalls.
6. **Honest reporting.** The track screen reports two things separately:
   - *Complete* (30 / 90 / fields / pronunciation)
   - *Quality* (AI-judged naturalness and meaning, with any flags)
   
   An incomplete track never shows an unqualified "100%".

**Preserved untouched:**
- vocabulary banks and canonical IDs
- belts and ranks
- SRS / OK counts
- learner history
- saved tracks
- pronunciation systems (Thai phonetics, Japanese readings, pinyin)
- Revision and Listening tracks
- playback and bookmarks
- resumable drafts

The changes are confined to:
- the teachability check
- prompts
- the validator wiring
- the backup frames
- the recovery loop
- the final audit and its labels
- the new-word count function and the dashboard list

**Rollback boundary:**
- The new pipeline sits behind one internal switch, with the current v682 path left intact next to it.
- Nothing is deleted from v682 until the new path has passed the comparison tests (old vs new on the same fixtures and the corpus).
- Production stays on v682 until you approve.

---

## What I will do next (minimum changes to test this)

1. **Regression corpus (started).** `dev/sandbox/corpus/language-quality-corpus.json` has 33 real sentences (corrected from 34 on 2026-10-12: the first count was wrong) from the 2026-10-12 logs and the v682 sandbox runs. Each has an observed verdict, an expected verdict and a reason. All are labelled **AI-judged (Claude), not native-verified**. A test will run the real validators over it and report false acceptances and false rejections, old build vs new.
2. **Minimum changes** for the corpus failures and the contradictions in sections 3–4. These replace or remove rules rather than adding new ones:
   - curated-only backups (remove the string templates and the "any noun + ある" licence)
   - teachability judged by curated frames
   - sense-keyed Thai guides
   - one same-application key and recorded rejection memory
   - Mandarin segments rebuilt locally instead of rejected
   - the cue-form, どこか and 早く corrections
3. **Display and quota.**
   - The Mandarin "Next targets" card and header use the 30-word list.
   - Japanese new words read the belt table (5 at 10th Kyu).
4. **Live tests, US$0.25 combined cap, staged:**
   - 5 targets × 3 recalls per language
   - then 10 targets, only if the first stage is clean
   - then one full 30-word track per language, only if both earlier stages pass
   
   I will examine accepted *and* rejected sentences at each stage.

**Decisions I need from you (they change the curriculum, so I won't decide them myself):**
1. **Japanese sentence-final かな / な and the interjection あ:** count them as free function words (as the prompt already claims), or keep them blocked until taught?
2. **Mandarin new words above White:** follow the belt table, or stay at 3?
3. **Confirm the "5 words" screen:** is it the dashboard "Next targets" card?

## TL;DR

- **The cause:** the generator has accumulated narrow patches instead of a design. String-built backups pass because no blocklist mentions them, and the prompts contradict the checks.
- **Specific findings:**
  - 有不。 and 一緒ある？ came from string templates no rule caught; the Japanese check even allows any noun + ある.
  - Thai หลัง was taught as the house classifier because the prompt says both "after / back" and "counts houses".
  - Mandarin retries repeat themselves because rejections aren't remembered.
- **Mandarin "5 words":** almost certainly the dashboard "Next targets" card, which shows the raw new-word picks instead of the 30 words the lesson uses. Saved vocabulary is intact.
- **Japanese 3 new words:** a single hard-coded constant (3) overrides the belt table (5).
- **Proposed fix:** one teaching plan and one validator per language, used by every path; curated-only backups; bounded retries that learn; honest READY. All of it sits behind a switch next to the intact v682.
- **Next:** I'll implement that and test small (5, then 10, then 30 words) within US$0.25. I need your answers on かな/あ, Mandarin quotas, and which "5 words" screen you saw.
