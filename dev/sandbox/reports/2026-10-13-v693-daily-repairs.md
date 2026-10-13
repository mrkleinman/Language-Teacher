# v693 — Daily Track repairs from the 13 Oct v691 Thai, Japanese and Mandarin briefs

Development branch only. No paid API calls, no deployment. All results are from offline tests. The model is simulated; the app's own code does everything else.

New tests built from the exact v691 exports and logs:

| Suite | Language | New build | Previous build (v692) |
|---|---|---|---|
| tests50 | Thai | 19/19 | 3/19 (several sections crash: the functions do not exist yet) |
| tests51 | Japanese | 29/29 | 5/22 |
| tests52 | Mandarin | 25/25 | 7/16 |

All three Daily Tracks share one new switch, `dailyV693On()`. It is on by default; `setDailyV693(false)` is the rollback. Replays of the three recorded v682 runs still match exactly (0 mismatches, content identical).

---

## Part 1 — Thai Daily (v691 brief)

### 1. Root causes confirmed

**A. 89/90 (ง่าย at 2/3)** — `fixCueAddressees`, `finaliseMainTrack`
- The v691 cue fixer ran after quota recovery and after every judgement.
- It replaced every mention of the speaker's own name with the listener's name, including when the name was the sentence's subject. So "Somchai says, with a smile…" on Somchai's recovered ง่าย line became "Nida says, with a smile…".
- The changed cue no longer matched its stored "cue verdict", which is tied to the exact cue text. The final count therefore saw the line as never checked, and it silently stopped counting.
- Recovery had already finished, so nothing replaced it: 89/90.
- The same bug wrote "Nida greets Nida", "Somchai greets Somchai back" and "Nida says goodbye to Nida".
- It is also the source of the Japanese "As Daiki, tell Daiki". There the fixer half-swapped a cue that had been written for the other speaker.

**B. ซื้อตั๋วที่ไหนคะ rejected as a classifier mismatch** — `thaiLexicalSenseProblems`
- The classifier rule matched noun + ที่ + ไหน and read ที่ as a classifier.
- Without a number before it, ที่ is never a classifier here. It is part of the question word ที่ไหน, the relative "that" (ร้านที่ถูก), or the ordinal (ตั๋วที่หนึ่ง).
- The rule also stopped at its first match, so a false match could hide a real error later in the line.

**C. Unnatural lines that passed QC**

| Line | Why it got through |
|---|---|
| ป้ายนี้ถูกที่รอครับ | QC *rewrote* the good line ป้ายนี้ถูกครับ. The cue asked for more than the Thai said ("right place to wait", scored 3/5), and v691 "fixed" the Thai instead of the cue. |
| ถอดได้เลยครับ จานนั้นขนาดใหญ่มาก | The group judge said the lines were natural but the topic "should be bridged". The rewrite glued an unrelated clause on to make a bridge. |
| ใช่หลังกินข้าวกลับบ้านครับ | The model wrote "ใช่ หลังกินข้าวกลับบ้านครับ" with a pause after ใช่. The automatic spacing tidy-up removed that pause and created the run-on. |
| ไปกับรถสองแถวนี้ไหมครับ | No rule covered ไปกับ + vehicle ("go *with* the songthaew"). There was one for มากับ only. |
| ขนาดเล็กกินง่ายดีครับ | The naturalness judge was never asked to check whether the subject is clear. |
| Fare expensive, then not expensive | Nothing compared one speaker's lines inside the same exchange. |

Also: the QC rewrite of the จอด line lost its target word, and only the final audit caught it. That cost a recovery call.

### 2. Files / functions changed (`dev/tt.jsx`)

**Cue addressee fixing**
- `fixCueAddressees`:
  - the cue's subject ("Somchai says …", "As Daiki, …") is kept as the speaker;
  - a cue whose subject is the listener is swapped whole, names and pronouns (new `_swapCuePronouns`);
  - a cue where only the subject names the wrong person gets just the subject corrected.

**Re-checking a cue that changed after its judgement**
- New `thaiStaleCuePairs` and `thaiRevalidateStaleCues`: any target line whose cue changed after it was judged is judged again with the same audit. The naturalness verdict is reused because the Thai text did not change.
- In `finaliseMainTrack`, cue fixing plus re-judging now runs **before** the quota is counted, so a pair that fails is replaced by recovery. A second re-check runs just before the final count.
- In `_thRecoverTargetPairs`, recovered lines get their final cue **before** they are judged.

**Classifiers and collocations** (`thaiLexicalSenseProblems`)
- ที่ counts as a classifier only after a number, and every match is examined.
- New ไปกับ + vehicle rule.

**Spacing** (`normaliseThaiSpacing`, new `THAI_RESPONSE_HEAD_RE`)
- A sentence-initial reply word (ใช่ / ไม่ใช่ / โอเค / งั้น / จริงเหรอ …) keeps its pause.
- Token-by-token spacing is still collapsed (ใช่ แล้ว → ใช่แล้ว).

**Same-speaker contradictions** (new `thaiSelfContradiction`)
- One speaker saying X and then not-X about the same subject inside a target's exchange. Questions and different subjects are excluded.
- Applied where the slot can still be regenerated: the generation early gate and quota recovery.

**QC rewrites** (`runQualityCheckCore` group step)
- A 3/5 prompt mismatch now rebuilds the **cue** from the line's own English, with no paid call; the Thai is kept.
- A verdict that complains only about a topic change is treated as clean (`THAI_TOPIC_ONLY_VERDICT_RE` / `THAI_LINE_DEFECT_VERDICT_RE`). The Thai group-judge prompt no longer lists "topic jump" as a reason to improve.
- Every rewrite must pass the hard line checks before it replaces the original (`thaiQcRewriteProblems`: target present, line gate, lexical sense). These run *after* markup is stripped.

**Naturalness judge prompt**
- Now names three faults:
  - glued-on unrelated clauses;
  - a subject the listener cannot identify;
  - wrong collocations.

### 3. Before → after (from the v691 export)

| v691 | v693 |
|---|---|
| Cue "Nida says, with a smile…" on Somchai's ง่าย line → 2/3 | Cue stays "Somchai says…"; ง่าย 3/3 |
| "Nida greets Nida…", "Somchai greets Somchai back…", "Nida says goodbye to Nida…" | "Somchai greets Nida…", "Nida greets Somchai back…", "Somchai says goodbye to Nida…" |
| ซื้อตั๋วที่ไหนคะ rejected | accepted; ตั๋วชิ้นนี้ / เรือชิ้นนี้ / ตั๋วสองที่ still rejected |
| ป้ายนี้ถูกครับ rewritten to ป้ายนี้ถูกที่รอครับ | Thai kept; the cue is rebuilt from the English ("This stop is the right one.") |
| ถอด line glued to "จานนั้นขนาดใหญ่มาก" | not rewritten (topic remark only) |
| "ใช่ หลังกินข้าวกลับบ้านครับ" collapsed to ใช่หลังกิน… | pause kept |
| ไปกับรถสองแถวนี้ไหมครับ accepted | rejected (COLLOCATION_VEHICLE) at generation, so it is regenerated |
| ค่าโดยสารแพงนิดหน่อย … ค่าโดยสารไม่แพงเลย (both Somchai) | the second is rejected as STATE_CONTRADICTION and regenerated |
| A QC rewrite that lost จอด was persisted, then dropped at the final audit | the rewrite is discarded at once; the original is kept |

### 4. Exact 90/90 tests (tests50 A1–A6)

- **Live ง่าย case:** Somchai's line cued "Somchai says, with a smile…", with verdicts attached → **90/90**. The cue is unchanged and nothing needs re-judging.
- **Genuine fix after judgement:** "Tell Somchai…" on Somchai's line becomes "Tell Nida…", is judged again, and keeps → **90/90**.
- **Corrected cue fails its new judgement:** the pair is removed *before* counting, and quota recovery replaces it → **90/90**.
- **Previous build:** the same fixtures give 89/90 (A2, A5, A6 fail).

### 5. Classifier false-positive evidence (tests50 C1–C4)

- ซื้อตั๋วที่ไหนคะ, ร้านที่ถูกอยู่ไหนครับ and ตั๋วที่หนึ่งครับ pass.
- ตั๋วชิ้นนี้แพงครับ, เรือชิ้นนี้สวยค่ะ and ตั๋วสองที่ครับ are still rejected.
- A false ที่ match no longer hides a real mismatch later in the line.

### 6. Speaker / cue tests (tests50 B1–B2)

- All four live framing cues come out correct.
- "As Daiki, tell Kenji…" stays on Daiki's line and becomes "As Kenji, tell Daiki…" on Kenji's.
- The older v690/v691 cue tests (tests47 K, tests48 K) still pass.

### 7. Remaining Thai problems

- **ขนาดเล็กกินง่ายดีครับ** (unclear subject) is handled only through the judge prompt, not a deterministic rule.
- **Rebuilt cues** read "Tell the other person: …". They are faithful but plain.
- **The contradiction check** covers state adjectives (expensive, far, easy…) with the same subject; other kinds of contradiction still rely on the judges.
- **The naturalness judge** still decides most naturalness questions; only the five listed patterns are now deterministic.

### 8. Readiness

Ready for **one controlled live Thai Daily run**. Watch for:
- `CUE_REVALIDATED`, `THAI_CUE_REBUILT_FROM_TRANSLATION`, `QC improve discarded`, `STATE_CONTRADICTION`;
- `TARGET_PAIR_QUOTA` 90/90.

Teaching quality is not claimed above 7/10 until a new lesson has been reviewed.

---

## Part 2 — Japanese Daily (v692 brief, with your revised priorities)

### 1. Root causes confirmed

**A. Romaji ("dore nishiyokka", "ima narao mise", "tabe rare nai", "tabe rarenaikamo")** — `v684JaDerive` / `jaJoinWordPieces`
- The deterministic word-by-word romaji left any kana run the dictionary did not know as one "word": にしよっか, ならお, られないかも.
- It also split a verb stem from its endings (食べ | られ | ない).
- The alignment check compared characters, not word boundaries, so it reported 0 issues.

**B. "As Daiki, tell Daiki" (pairs 70, 79, 90)** — the same `fixCueAddressees` bug as Thai, on cues written for the other speaker. There was no final check for self-addressed cues.

**C. 遅くなる / 早く行く rejected ("遅いなる needs a particle")** — `validateJapaneseUsage`
- The rule saying an adverbial く form is not a bare noun existed, but only with the teaching-plan switch on.
- The live Daily path has that switch off.

**D. かな allowed in one place, rejected in another**
- Permission depended on how a segmenter *typed* the segment: grammar → rejected (大丈夫かな？); content (安いかな) → passed.
- The final count did not check grammar permission at all, so ねえ、どれが安いかな？ reached the lesson.

**E. どれも / 何も reported as "target not present"**
- They are different words (all / nothing). The message made it look like a parser miss.

**F. あれ、… and うん as filler counted as target uses**
- Target presence was a character match only. あれ、ちょっと高いね (the interjection "huh") and 今日は、うん、忙しいんだ (うん as a hesitation) counted as practising あれ "that over there" and the reply うん.

**G. Replies with nothing to reply to**
- Recalls are laid out round-robin within a scene, so はい、… / いいえ、… often followed an unrelated line.

**H. The final scene's contradictions**
- Mio cancels and then asks why there is no lunch; "busy today" is followed by "how about today?"; "busy tomorrow" by "something tomorrow?".
- No deterministic check looked at conversational state. The coherence judge scored the scene 3 and the track 4/5.

**I. 5 lines rejected for length at the end, plus 2 wasted recovery replacements**
- The same sentence was measured with different word splits: the model's segments at generation, rebuilt segments at the final count.
- The Japanese recovery path did not check length before accepting a replacement.

**J. 何時に時間ある？** was not caught.

### 2. Files / functions changed (`dev/tt.jsx`)

**Romaji**
- New `jaSplitKanaRuns`: splits unknown kana runs at particle boundaries, and attaches お/ご to the next word.
- `jaJoinWordPieces` now joins a verb stem with its endings (`JA_VERB_AUX_RE`).

**Cues**
- `fixCueAddressees` as in Part 1.
- New `cueSelfAddressLines` plus a final `CUE_SELF_ADDRESS` invariant in `finaliseMainTrack`, which blocks READY.

**Morphology**
- `validateJapaneseUsage`: the adverbial-form and indefinite-pronoun permissions now apply on the Daily path.
- New rule for 何時に時間ある.

**Grammar permission**
- New `jaSentenceFinalGrammarProblems` reads かな from the text. It is used in `validateJapaneseGrammarClosure` (generation / QC / recovery) **and** in the Japanese final count (`TRACK_ADAPTERS.ja.hardProblems`), through `jaAllowedGrammarForms`.

**Target sense** (`matchesJapaneseTarget`)
- あれ followed by a pause at the start of a sentence is the interjection.
- はい / うん / いいえ count only when they open an utterance.
- New `jaTargetAbsentReason` gives the `TARGET_SENSE_DIFFERENT` diagnostic, and `generationFailureCategory` has a new `TARGET_SENSE` category.

**Replies**
- New `jaPlaceReplyLines` moves a reply after an unanswered yes/no question from the other speaker in the same scene, without changing its text.
- New `jaBridgeReplyTriggers`: ONE batched request writes the missing yes/no question as a bridge line (never counted as a target line). Each question must pass the closed vocabulary, grammar, usage and length gates.

**State**
- New `jaStateContradictions`:
  - a day ruled out, then proposed by the other speaker;
  - the person who cancelled asking why the plan is off.
- Lines are marked before the quota count, so recovery replaces them. A `STATE_CONTRADICTIONS` invariant blocks READY.

**Length**
- `complexityUnits` counts Japanese from one deterministic split of the text at every stage (new `_jaDeterministicUnits`).
- `_jaRecoverTargetPairs` checks length and grammar permission before accepting a line.

### 3. How conversational state is now checked

On the final ordered lines, deterministically:
- **Ruled-out day:** the days ruled out (今日 / 昼 / 明日 with 忙しい / だめ / 無理 / 行けない / 食べられない / 帰れない …) are tracked per speaker. A later *proposal* of that day by the other speaker is flagged. "What shall we do?" (どうする) is not a proposal.
- **Cancelled plan:** the cancelled shared plan (一緒に…られない) is tracked; the same speaker later asking なんで…一緒に…ないの？ is flagged.
- On the v691 export it finds exactly 78, 86 and 91. It finds nothing in the brief's model exchange.
- It does not judge narrative flow; topic jumps are left alone, per your priorities.

### 4. Morphology

Separate diagnostics now exist for:

| Case | Diagnostic |
|---|---|
| Invalid Japanese | e.g. 水行く → "needs a particle" |
| Valid but untaught | `CURRICULUM_NOT_YET_ALLOWED` (かな) |
| Different word or sense | `TARGET_SENSE_DIFFERENT` (どれも / 何も / あれ、 / filler うん) |
| Parser misses | 遅く / 早く adverbial forms, unknown kana runs — now handled |

### 5. Vocabulary and grammar permission, unified

- かな is decided from the text by one function.
- Generation, QC, recovery, the reply-trigger questions and the **final count** all call it, with the learner's grammar scaffold.
- The curriculum is unchanged: かな is still not taught at 10th Kyu, so it is now consistently excluded.

### 6. Before → after (v691 export)

| v691 | v693 |
|---|---|
| ごめん、ちょっと遅くなるかも。 / ちょっと早く行こうね。 rejected | accepted; 水行く？ still rejected |
| 大丈夫かな？ rejected, ねえ、どれが安いかな？ kept | both consistently not taught; the final count would not count the second |
| あれ、ちょっと高いね。 / あれ、行ってみない？ counted as あれ | not counted; あれがいいかも。 / あれは何？ count |
| 今日は、うん、忙しいんだ。 counted as うん | not counted; うん、もう大丈夫だよ。 counts |
| どれも近いね。 "target どれ not present" | "TARGET_SENSE_DIFFERENT: どれも is a different word…" |
| 何時に時間ある？ accepted | rejected; 何時なら時間ある？ suggested |
| 78 / 86 / 91 contradictions kept, READY | flagged, slots replaced by recovery; READY blocked while any remain |
| Reply はい、分かった。 after an unrelated line | moved after a yes/no question, or given one (bridge line) |

### 7. Romaji regression (tests51 D1–D6)

| Pair | Before | After |
|---|---|---|
| 24 | dore nishiyokka? | **dore ni shiyokka?** |
| 51 | ima narao mise ni iru kamo. | **ima nara omise ni iru kamo.** |
| 68 | gomen, hiru wa issho ni tabe rare nai. | **gomen, hiru wa issho ni taberarenai.** |
| 89 | … tabe rarenaikamo. | **… taberarenai kamo.** |

- No rebuilt romaji anywhere in the export glues a particle onto a word.
- Well-formed lines are unchanged (konnichiwa, ii yo. doko iku?, wakaranai, mattete).

### 8. Speaker / addressee (tests51 E1–E3)

- The final check finds the three live self-addressed cues.
- After the fix, none remain: "As Mio, tell Daiki…", "As Daiki, ask Mio…", "As Mio, tell Daiki…". Every other cue is untouched.

### 9. Final quota and length

- **Length:** the 7 live lines that failed hardMax 7 at the final count measure 3–6 units on the single counter, whatever segments a stage carries (I1).
- **Recovery:** checks length and grammar before acceptance, so a round-2 recovery for length cannot happen again.
- **Quota (J1):** a clean Japanese track finalises at **90/90**, exactly 3 lines per target, 0 self-addressed cues, 0 state contradictions.

### 10. API spend (estimates from the v691 log, not measured)

| Change | Estimated effect |
|---|---|
| Length rejections at the final count | ≈5–7 of the 24 quota-recovery-stage requests avoided |
| Second recovery round | 2 requests avoided |
| Reply-trigger questions | adds at most **1** request per track |
| Unchanged sentences | not re-judged (existing verdict cache) |

### 11. Remaining limitations

- **Scene layout:** a whole scene is still built round-robin from target recalls. That was not redesigned, per your instruction. Topic jumps remain.
- **State check:** covers day / plan contradictions only.
- **Pragmatics:** pragmatic awkwardness such as いいえ、いいよ。 and unclear referents such as 今ならお店にいるかも are left to the judges.
- **Reply-trigger questions:** a new paid step (one request). It has only been tested with a simulated model.
- **Length counter:** the single counter is somewhat more lenient than the old final count was. That is intended (it matches generation), but watch the first live track.

### 12. Readiness

Ready for **one controlled live Japanese Daily run**. Watch for:
- `RESPONSE_PLACED` / `RESPONSE_TRIGGER`, `JA_STATE_CONTRADICTION`, `CUE_SELF_ADDRESS=0`, `JA_RECOVERY_REJECTED before acceptance`;
- the romaji of conjugated verbs.

---

## Part 3 — Mandarin Daily (v692 brief)

The `zh-gen-v650` per-recall generator is kept. Every change is a validation or QC fix; there is no architecture migration.

### 1. Root causes confirmed

**A. 不，那里很小。 rejected ("不 cannot negate 那里")** — `mandarinGrammarProblems`
- The word-pair loop removed punctuation first, so 不 and 那里 looked adjacent across the comma.
- The QC audit flagged it, the final count dropped it, and recovery paid for 东西不多，很好。 (then another QC improve).

**B. 我不回。 / 我想吃。 / 我要去买。 rejected as "incomplete"**
- The rules never looked at the previous line, which made the object or destination recoverable.
- Each rejection cost a paid retry.

**C. 你明天回家吗？ discarded**
- A "preferred-range drift" rule rejected a first attempt above the *preferred* 2–4 range whenever the track was below 80% preferred, even though it was within hardMax 6.
- The retry produced 你回不回？.

**D. "Am I too slow?" for 我慢吗？**
- The cue checker scored it 3/5 and the line was accepted.
- No deterministic check compared degree words.

**E. Contradictory three-line exchanges (08, 32, 35, 50)** — no exchange-level check existed.

**F. Five QC rewrites for topic changes alone (可以, 回, 等, 找, 要)**
- The shared Japanese/Mandarin group QC rewrote any group the judge called a "topic jump": paid calls that replaced acceptable lines.

**G. Spoken tones**
- Third-tone sandhi was applied to every adjacent 3+3 pair. So 这里很多人 became "zhèlí hěn" (里 is neutral in 这里/那里), and 我也很好 became "wó yé hén hǎo".

### 2. Exact code changes (`dev/tt.jsx`)

**Grammar context**
- `mandarinGrammarProblems(zh, segs, inv, ctx)`: a pause ends the phrase.
- `mandarinSurfaceGrammarProblems(zh, inv, ctx)` (old body now `_mandarinSurfaceGrammarProblems`) plus new `zhEllipsisRecoverable`: an "incomplete" verb is accepted only when the previous line has the same verb.
- `validateMandarinPair(…, _vctx)`, `mandarinAcceptCandidate`, `runMandarinQualityCheckCore(…, ctx)` and the QC loop pass the exchange / previous line.

**Translation fidelity**
- New `zhEnglishAddsMeaning` detects English that adds "too", "already", "still", "must / have to" or "probably", or that drops a 不/没 negation.
- Candidates are rejected at generation (`CUE_MEANING_MISMATCH`).
- A degree "too" is removed deterministically in QC (`translation fidelity` repair).

**Exchange checks**
- New `zhExchangeProblems` / `zhExchangeContradictions` cover: same-speaker contradiction, a change toward something just denied, an arrival already reported, and 用一点 with nothing measurable named.
- Used at generation (with the exchange context) and before the quota count in `finaliseMainTrack`, so recovery replaces the line.

**Length**
- The drift rejection in `generateMandarinOneRecall` is off on the v693 path. Drift stays visible in `MAIN_COMPLEXITY_AUDIT`.

**Topic changes**
- The shared group QC (`aiQc…` loop) treats topic-only verdicts as clean. Contradictions, "makes no sense", unclear referents and unnatural lines are still repaired.

**Tones** (`mandarinSpokenPinyin`)
- 里 in 这里/那里 is neutral.
- Runs of one-syllable 3rd tones group in pairs (an odd run starts with three).
- Inside a word, and from a longer word into the next 3rd-tone word, the change applies as before (一起等 → yìqí děng).

### 3. What improves actual teaching

- Good beginner replies are no longer thrown away: 不，那里很小 and ellipsis answers.
- Natural 5-word questions are no longer thrown away.
- English never claims more than the Chinese says.
- Each three-line exchange no longer contradicts itself.
- Good lines are no longer rewritten because the group changed topic.
- Spoken pinyin follows phrasing.

### 4. QC false positives removed

- 不 + pause + noun (不，那里很小).
- Recoverable ellipsis (我不回 / 我想吃 / 我要去买 after a question with the same verb).
- Preferred-length drift.
- Topic-only group rewrites.

### 5. Real errors still rejected

- 不那里 (no pause).
- The same ellipsis sentences out of the blue.
- 没 + adjective, 很 + verb/noun, 太 + adjective without 了.
- Unauthorised vocabulary and 把 (unchanged).
- Lines over hardMax.
- The brief's model sentences (我跟你去 / 你想一起吃吗 / 你拿什么 / 我等朋友 / 你想吃什么 / 这个多少钱) pass with no penalty (G1).

### 6. Before → after

| v691 | v693 |
|---|---|
| 不，那里很小。 → dropped, replaced by 东西不多，很好。 | kept |
| 我不回。 after 你回不回？ rejected | accepted (still rejected out of the blue) |
| 你明天回家吗？ discarded → 你回不回？ | kept on the first call |
| 我慢吗？ "Am I too slow?" | "Am I slow?" (cue "Ask: Am I slow?") |
| 08 好，到了说。 after 我到这里了 | flagged, regenerated |
| 32 不太快。 after 我工作很快 (same speaker) | flagged, regenerated |
| 35 我慢一点吧 after 你不慢 | flagged, regenerated |
| 50 我用一点 (of what?) | flagged, regenerated |
| 回 / 等 / 找 / 要 / 可以 rewritten for topic changes | not rewritten |
| zhèlí hěn duō rén · wó yé hén hǎo | zhèlǐ hěn duō rén · wó yě hén hǎo |

### 7. Cue / translation results (tests52 C1–C5)

- Over all 94 lines, **only pair 33** is flagged.
- Natural paraphrases pass: 我喝你的 "I'll have yours", 我很快 "I won't be long", 没什么 "Nothing".

### 8. Pinyin / tone results (tests52 I1–I5)

| Case | Result |
|---|---|
| 这里 / 那里 | neutral 里 |
| 可以 等你 / 一起 等 | kéyí déng nǐ / yìqí děng (unchanged: a longer word still changes before a 3rd tone) |
| 我也很好 | wó yě hén hǎo |
| 我很好 | wó hén hǎo |
| 不 sandhi | bú màn (unchanged) |
| 一起 | yìqǐ (unchanged) |
| 我们 | wǒmen (unchanged) |
| 哪里 | nálǐ (unchanged) |
| 给你 | géi nǐ (unchanged) |

Replayed over all 94 final lines, only those phrasing cases change. Third-tone grouping inside long chains is a teaching convention; I chose the textbook grouping and flag it as a judgement call. (A first draft also kept the last tone of a two-syllable word before the next word, as in kéyǐ déng; the full regression showed this contradicts the v690 rule tested in tests47 P3, 一起等 → yìqí děng. That part was reverted, so 可以等你 stays kéyí déng nǐ.)

### 9. Local exchange results (tests52 D1–D3)

- Exactly 08, 32, 35 and 50 are flagged on the v691 export.
- 85–86 are not flagged, as the brief asked.
- None of the other 26 exchanges is flagged.

### 10. Final 90/90 and closed vocabulary

- A clean Mandarin track finalises at **90/90**, exactly 3 lines per target (K1).
- Flagged lines go to the existing quota recovery, which uses the same closed-vocabulary and grammar gates.
- The closed-vocabulary rules themselves are unchanged.

### 11. Expected API cost impact (estimated from the v691 log, not measured)

| Change | Requests avoided |
|---|---|
| 5 topic-only improves skipped | ≈5 improve requests plus their re-checks |
| 4 generation retries avoided (回 r1 drift, 回 r2 / 吃 r2 / 要 r3 ellipsis) | ≈4 |
| 不，那里很小 recovery cycle (recovery + its QC + improve) | ≈3–4 |

- **Added:** occasional regenerations when a real exchange contradiction is found. In v691 that would be 4 lines.
- **Net:** roughly 8–10 fewer requests out of 164, about 5–6%. Not measured.

### 12. Risks and readiness

- **Narrow checks:** the exchange checks are deliberately narrow and will miss contradictions phrased differently.
- **Ellipsis:** it is accepted only for a bare reply (subject + negation/modal + the verb) whose verb the previous recall used, so 我在看回 is still rejected. The resume path re-checks saved recalls with the same context; the full regression caught this (tests42 Z5/Z6).
- **Live verification:** the fixes have not yet run on a live track.

Ready for **one controlled live Mandarin Daily run**. Watch for:
- `ZH_EXCHANGE_CONTRADICTION`, `CUE_MEANING_MISMATCH`, `translation fidelity`;
- topic-change remarks skipped;
- the request count against v691's 164.

---

## Shared notes (all three languages)

**Legacy suites**
- `tests.js` and `tests39.js` pin pre-v693 behaviour in two places:
  - tests.js A expects a target-less QC rewrite to reach the final audit; v693 discards it earlier.
  - tests39 D1 pins a target-absent count of 2; v693 adds あれ、 / mid-sentence はい, making 5.
- Following your v692 rule, both run on the pre-v693 Daily rules (`TT_DAILY_LEGACY=1`) with their **assertions unchanged**. The new behaviour is tested in tests50 / 51.

**Fixture change**
- One line in my own v692 Listening test plan (`benchmark/v692/plans.js`) changed from あれ、本の店？ to あれは本の店？. The new あれ rule rightly reads the old form as ambiguous.
- That plan is a simulated model reply, not an expectation.

**Rollback**
- `setDailyV693(false)` restores the v692 Daily behaviour. Replays with the Oct13 switch off match the recordings exactly.

**Data preserved**
- No vocabulary ID, SRS field, Known status, bookmark, belt threshold, saved lesson or provider setting is touched.
- The Listening architecture is unchanged; it only shares the corrected Japanese target-sense function.

**Full offline regression**
- Listed at the end of the commit message and in the reply.

## TL;DR

- **Thai 89/90:** a cue tidy-up step wrote the wrong speaker's name onto the recovered ง่าย line after it was checked, so it silently stopped counting. The same bug produced "Nida greets Nida" and Japanese "As Daiki, tell Daiki". Fixed: cues keep their speaker, and any cue changed after checking is checked again before counting. The tests reach exactly 90/90.
- **False rejections removed:**
  - Thai ซื้อตั๋วที่ไหนคะ;
  - Japanese 遅くなる / 早く行く;
  - Mandarin 不，那里很小, ellipsis replies and 你明天回家吗？.
  Real errors are still caught.
- **Bad lines that slipped through are now blocked or not created:**
  - QC rewrites that made Thai worse;
  - Japanese あれ、 / filler うん counted as targets;
  - "busy today → how about today?";
  - Mandarin "Am I too slow?" and same-speaker contradictions.
- **Romaji** (dore ni shiyokka, ima nara omise, taberarenai kamo) and **Mandarin spoken tones** (这里 / 那里, one-syllable chains) are corrected deterministically.
- **Japanese かな:** one consistent decision at every stage.
- **Cost:** wasted calls are cut (length mismatches, topic-only rewrites, needless retries). Savings are estimated, not measured.
- **Unproven:** real teaching quality. Nothing here is claimed at 8/10. The next safe step is **one controlled live Daily run per language**, then an independent review of the three new lessons.
