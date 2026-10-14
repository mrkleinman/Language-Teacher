# v696: Daily Track prompt clarity

Scope: the learner-facing English cues ("prompts") of the Thai, Japanese and Mandarin Daily Tracks. Listening is not touched.

Safeguards:

- The Daily generators were not redesigned.
- No vocabulary IDs, curriculum, learner history, SRS, Known status or bookmarks changed.
- No provider or model change, no paid call, no deploy, no merge.
- Everything is on the development branch.

Material reviewed (every final learner-facing pair, read in full):

| Language | Track | Pairs | Notes |
|---|---|---|---|
| Thai | Your v694 Daily track of 14 Oct (`thai-track-14-Oct-2026-daily.txt`) | 94 | The generation log `gen-log-2026-10-14T00-05-05` flagged 18 prompt mismatches |
| Japanese | Your latest Daily export (`sandbox/oct13-v693`, 13 Oct) | 101 | |
| Mandarin | Your latest Daily export (`sandbox/oct13-v693`, 13 Oct) | 94 | |

They are now offline regression fixtures: `benchmark/v696/cue_fixtures.js`.

---

## 1. Root cause of over-contextualised prompts

### 1. The generators were told to describe what is said, not to instruct the speaker

The Thai main generator's rules ask for a prompt that "must describe the SPECIFIC CONTENT … include the actual numbers, names, and facts". The examples are third person: "He says he is fifty-six years old", "She asks if the shop is near here". The quota-recovery and repair prompts say "prompt = a third-person cue … ("He asks if…", "She says…")".

The same request carries the whole scene ("Two friends catching up at a local café… ordering seafood and seasonings"). Nothing says the scene stays out of the cue. So the model put the scene, reasons and narration into the cue:

- "… to share with the seafood and seasonings"
- "… since you're ordering to share"
- "He tells her …"

Japanese and Mandarin had only "an instruction a learner can act on", with no limit on background:

- "As Ken, tell Yui with a relaxed tone that …"
- "… while pointing across the road …"

### 2. QC let background pass and never removed it

The cue judge scores "very close, minor phrasing difference" as 4/5, which passes. In the v694 Thai log, 14 of the 18 "prompt mismatches" were 4/5 notes such as "Omits the seafood and seasonings sharing context", so the bloated cue was saved. Nothing removes background from a cue whose sentence is correct.

### 3. The fallback rebuild produced literal copies

When a cue was judged ≤ 3/5, it was rebuilt as "Tell the other person: <English>." or "Ask: <English>?". Mandarin always derives its cue this way (`mandarinCueFromProposition`). That is why most Mandarin cues read like this:

- "Tell the other person: Okay, then no eating."
- "Ask: Have a little, go on?"

### 4. Nothing checked the cue against the verified meaning word by word

"Tell her that the sign over there is the songthaew stop" (for ป้ายนั้นเป็นป้ายรถเมล์ = bus stop) was not caught: the judge did not list it among the 18. On the other side, a wrong translation ("Is the small size cheaper?" for ขนาดเล็กถูกไหม, where the Thai has no กว่า) was treated as the meaning.

## 2. Code changes (`dev/tt.jsx`; switch `cueClarityOn()` = Oct13 quality on + v693 Daily on + `setCueClarity`)

### One shared deterministic cue pass, `cueClarify` / `cueClarityPass`, no model call

It edits only the cue: never the sentence, its English, the target or the pronunciation. It is idempotent. Per cue it does five things:

1. **Narration becomes an instruction to the speaker.**
   - Person and verb are shifted: "He tells her he really likes sugar." → "Say you really like sugar."
   - The speaker's gender comes from the Thai particle (ครับ / ค่ะ / คะ) or the scene's characters. That fixes self-contradictions, e.g. pair 58, spoken by Nida, said "He asks …".
2. **Template copies become reported speech.**
   - "Tell the other person: I came by songthaew." → "Say you came by songthaew."
   - "Ask: Is that bottle yellow?" → "Ask if that bottle is yellow."
   - "Let's …" → "Suggest we …"; imperatives → "Tell them to …".
   - A question that cannot be reported safely (tag questions, two sentences) is left as it is.
3. **Background the sentence does not express is removed.**
   - What can be removed: a reason, purpose or manner clause, or a trailing place or time phrase ("since …", "to share with …", "pointing …", "with a happy tone", "for the day", "at the next corner").
   - Only if none of its words is in the verified meaning, or the rest of the cue already carries the whole meaning.
   - Deixis and aspect words (here / now / already / still / too …) count as "in the sentence" when the sentence has the marker (ここ, ที่นี่, もう, ด้วย …).
   - Politeness words stay.
4. **Context is kept where the sentence is elliptical (class C).** A referent named in the previous lines stays in the cue when the sentence leaves it out, e.g. "the large size is worth it" for ไม่ต้องคิดมากคุ้มครับ.
5. **A cue whose core names something the sentence does not say is rebuilt from the verified meaning.**
   - Example: "songthaew stop" for ป้ายรถเมล์ → "Say that sign is the bus stop.", reported as class A.
   - The English counts as verified only where it agrees with the sentence. An English comparison with no comparison marker in the sentence (กว่า / より / 比 …) is flagged `TRANSLATION_ADDS_COMPARISON` and never used.
   - A degree conflict ("only a little easy" vs "pretty easy") is flagged `DEGREE_DIFFERS` for the sentence, not silently rewritten.

### Checks on every change

- A question never becomes a statement.
- Negation, numbers, comparison and already / still / too / only / might are never lost, unless they were inside removed background. That case is reported as `CUE_ADDED_MEANING (fixed)`, e.g. "…, not today" for 昨天人很少.
- The language's own cue-form check (`thaiCueFormProblems` / `jaCueFormProblems` / `zhCueFormProblems`) may not get worse; otherwise the original cue is kept.

### Where it runs (cues are clarified before they are judged, so no verdict is paid for twice)

| Language | Where |
|---|---|
| Thai | At the entry of `finalPairSemanticAudit` (the early-generation gate, the QC, recovery and final audits) and before the QC prompt-match judge |
| Japanese / Mandarin | Before QC (`jazhQcFinaliseAndListen`) |
| All three | Once more in `finaliseMainTrack` on the pairs that will be saved |

A Thai cue changed by the final pass has a stale verdict and is judged again before saving (`thaiRevalidateStaleCues`). A changed Japanese cue goes through the final text check. The saved cue is always the judged cue.

The cue rebuilds (`thaiLocalCueRepair`, `thaiCueFormRepair`, `mandarinCueFromProposition`) and the judge's own cue repair now produce the short instruction form instead of "Tell the other person: …" or a third-person description.

### Generator contract

All Daily generators — the Thai main generator, Thai quota recovery, the Mandarin recall prompt and the Japanese recall policy — now ask for:

> "a SHORT instruction to the speaker: the speaking act + exactly what the sentence says, in the second person … Keep negation, question vs statement, time, numbers, comparison and words like already / still / too / might … NEVER narrate, never give the scene, reasons or background … Usually 4–12 words."

The Thai prompt adds: "The scene above is for writing the Thai only — it never goes into the prompt." This is the biggest lever: the model writes the concise cue in the first place. Length is not a gate.

### QC classes (brief §7)

The cue judges (Thai final cue audit, Japanese / Mandarin prompt match) now also return `cls`:

| Class | Meaning | Judge score | Effect |
|---|---|---|---|
| A | The cue or the English says what the sentence does not | 1–3 | Cue repair or drop, as before |
| B | Background only | 4 | Never a reason to change the sentence |
| C | Elided referent named from the dialogue | 5 | Kept |
| D | Exact | 5 | Kept |

The deterministic pass records its own class per cue: `_cueClass`, with `_cueFlags` holding the reason.

### Reporting

- **Log:** `✂ CUE_CLARITY (final, th) checked … A … B … C … D … changed …`
- **Export:** a "CUE CLARITY" block under TRACK INTEGRITY, with up to 12 before → after examples and every flagged meaning error.
- **Rollback:** `setCueClarity(false)` restores the v695 cues, prompts and judges byte for byte. The v682 production cassette replay (Oct13 off) is unchanged: 0 mismatches.

## 3. Before and after: all three languages

The full lists are in the fixtures. These rows include over-contextualised, mismatched and already-correct cues.

### Thai

| Original prompt | Revised prompt | Target sentence | Reason |
|---|---|---|---|
| He tells her he really likes sugar. | Say you really like sugar. | ผมชอบน้ำตาลมากครับ | B: narration → instruction |
| Suggest they order some sugar as well, to share with the seafood and seasonings | Suggest we order some sugar as well. | งั้นเอาน้ำตาลด้วยครับ | B: background removed (Example A) |
| Tell her you don't want any salt with the shrimp order | Say you don't want salt. | ผมไม่เอาเกลือครับ | B: background removed, negation kept (Example B) |
| Ask him if there is a bigger bottle, since you wanted a bigger spoon | Ask him if there is a bigger bottle. | ขวดใหญ่มีไหมคะ | B: reason removed (Example C). Also flagged: the translation "bigger" adds a comparison the Thai lacks |
| Tell her to go straight and then turn left at the next corner. | Tell her to go straight and then turn left. | ตรงไปเลี้ยวซ้ายครับ | B: "at the next corner" removed (Example D) |
| Ask him how much it costs to rent a car for the day. | Ask him how much it costs to rent a car. | เช่ารถเท่าไหร่คะ | B: "for the day" removed (Example E) |
| Tell her that the sign over there is the songthaew stop. | Say that sign is the bus stop. | ป้ายนั้นเป็นป้ายรถเมล์ครับ | **A: meaning mismatch** (songthaew ≠ bus), rebuilt from the verified meaning (Example F) |
| Tell the other person: I came by songthaew. | Say you came by songthaew. | ผมมารถสองแถวครับ | B: template copy → instruction |
| He asks if you two have to cross the bridge. (spoken by Nida) | Ask if you two have to cross the bridge. | ต้องข้ามสะพานไหมคะ | B: speaker contradiction removed |
| Ask him if the small size of the shirt is cheap | *(unchanged)* | ขนาดเล็กถูกไหมคะ | Cue correct. **Translation flagged**: "cheaper" adds a comparison |
| He tells her it's only a little easy. | Say it's only a little easy. | ง่ายนิดเดียวครับ | **A flagged**: degree conflict with "It's pretty easy." — the sentence needs review |
| Tell her not to overthink it, the large size is worth it. | *(unchanged)* | ไม่ต้องคิดมากคุ้มครับ | C: the referent from the previous lines is kept |
| Ask him whether the chilli is very spicy. | *(unchanged)* | พริกเผ็ดมากไหมคะ | D: already concise |
| Tell Nida you might arrive late tomorrow. | *(unchanged)* | พรุ่งนี้ผมอาจจะมาสายครับ | D: already concise |

### Japanese

| Original prompt | Revised prompt | Target sentence | Reason |
|---|---|---|---|
| Tell your friend, with a happy tone, that you've run into each other again. | Say we met again. | また会ったね。 | B: manner removed, generic addressee dropped |
| As Ken, tell Yui with a relaxed tone that you feel like eating something today, and check that she agrees. | Tell Yui that you feel like eating something today, and check that she agrees. | 今日、何か食べたいね。 | B: "As Ken", tone removed; the agreement-seeking ね is kept |
| Tell Ken, while pointing across the road, that there is a shop over there. | Tell Ken that there is a shop over there. | あそこに店があるよ。 | B: setting removed |
| Tell your friend, as you set off on foot, that you'll go together so they don't need to worry. | Say you'll go together. | 一緒に行くから、大丈夫だよ。 | B: setting + reason removed |
| Ask Ken: Are you taking the train today? | Ask Ken if he is taking the train today. | 今日は電車に乗る？ | B: template copy → reported, addressee resolved |
| Saying you're still not going home yet, after B said it's fine. | Say you're still not going home yet. | いいえ、まだ帰らない。 | B: gerund narration, "after B said…" removed, まだ = "still" kept |
| Ask your friend, in a casual way, whether it was far for them to get here. | Ask whether it was far for them to get here. | ここまで来るの、遠くなかった？ | B + **A flagged**: the sentence is a negative question |
| Ask him where he is right now. | *(unchanged)* | 今どこにいる？ | D |
| Ask what they will drink | *(unchanged)* | 何飲む？ | D |

### Mandarin

| Original prompt | Revised prompt | Target sentence | Reason |
|---|---|---|---|
| Ask: Can I have a look? | Ask if you can have a look. | 我可以看吗？ | B: template copy → reported |
| Tell the other person: I haven't arrived yet. | Say you haven't arrived yet. | 我没到。 | B |
| Tell the other person: Drive a little faster. | Tell them to drive a little faster. | 你开快一点。 | B: imperative |
| Tell the other person: Let's go home together. | Suggest we go home together. | 我们一起回家吧。 | B: suggestion |
| Tell the other person: I'm not going, you go. | Say you're not going and tell them to go. | 我不去，你去吧。 | B |
| A suggests that the other option should go a bit slower instead. | Suggest that the other option should go a bit slower. | 那个慢一点吧。 | B: narration, "instead" removed |
| Say that yesterday there were very few people, not today. | Say that yesterday there were very few people. | 昨天人很少。 | **A fixed**: the cue added "not today" |
| Ask: How much is that one? | Ask how much that one is. | 那个多少钱？ | B |
| Ask: Really? You feel like eating it? | *(unchanged)* | 你真的想吃？ | Not reportable safely (two sentences): left as it is |

## 4. Number of prompts requiring correction

| | Thai (94) | Japanese (101) | Mandarin (94) |
|---|---|---|---|
| Changed in total | **64** | **67** | **80** |
| — background removed or cue rebuilt | 30 | 31 | 4 |
| — narration / template → instruction only | 33 | 34 | 76 |
| Kept for context (C) | 1 | 2 | 0 |
| Unchanged (D) | 28 | 33 | 14 |
| Average content-cue length (words) | 10.5 → 8.4 | 12.2 → 9.8 | 8.3 → 6.6 |

What happened to the 18 prompt mismatches the v694 Thai log flagged:

- **11 shortened.** Each had extra background (shrimp order, café, "here", "for the day", "at the next corner", "before they leave", …).
- **5 converted.** v694's QC had already rebuilt them into "Tell the other person: …" copies; v696 turns those into instructions.
- **2 flagged, not hidden.** "only a little easy" vs "pretty easy" and "cheap" vs "cheaper" are genuine meaning questions (§5).
- **1 left as it is.** "Say then you'll take squid too" for "Then let's get some squid too": the judge's note was the speech act ("let's" vs "you'll"). It is borderline and stays for the cue judge.

## 5. Genuine sentence-meaning errors identified separately (not hidden by rewriting the English)

| Language | Sentence | Problem | Status |
|---|---|---|---|
| Thai | ขนาดเล็กถูกไหมคะ | Translation "cheaper" — no กว่า | Flagged; cue kept as "cheap" |
| Thai | ขวดใหญ่มีไหมคะ | Translation "bigger" — no กว่า | Flagged |
| Thai | เอาช้อนใหญ่ไหมครับ | Translation "bigger" — no กว่า | Flagged |
| Thai | ง่ายนิดเดียวครับ | Cue "only a little easy" vs translation "pretty easy" | Flagged: the sentence's intended degree needs a decision (ง่ายนิดเดียว is idiomatically "really easy") |
| Japanese | バスに乗ると早いよ。 | Translation (and cue) "faster" — no より / ほう | Flagged |
| Japanese | 遠くなかった？ | The cue asks the positive question; the sentence is the negative question | Flagged |

Two cue-side mismatches were **fixed**:

- Thai "songthaew stop" → bus stop.
- Mandarin "not today", which the sentence does not say.

The flagged rows are listed in the export ("CUE_FLAG …"). They are for sentence or translation review. No sentence was regenerated or rewritten automatically.

## 6. Offline regression results

| Check | Result |
|---|---|
| **New `tests54.js` — Daily cue clarity** | **55/55**; registered in `run_all.sh` |
| Full offline regression (snapshot) | REG_RESULT |
| Production cassette replay (v682-final4 ja / th / zh) | 0 mismatches, content identical (the switch is gated on the Oct13 quality path, as before) |
| check_sync | v696 in sync |

**Existing tests changed, and why.** Four older suites asserted the exact old cue strings that this brief replaces. Only those string expectations were updated to the new contract. What each test checks — kept, not dropped, repaired, re-judged, 90/90 — is unchanged:

- **tests17 A2–A4:** "Ask: Do you want me to recommend it?" → "Ask if she wants you to recommend it."
- **tests32 H2/H4:** "Tell the other person: I already paid." → "Say you already paid."
- **tests34 4A/4C:** "Ask: Where are you going?" → "Ask where they are going."
- **tests50:**
  - A1–A6 test the v693 addressee-fix + re-judgement mechanism, so they now run with the cue pass off. With it on, a narrated or mis-addressed cue is clarified before its first judgement.
  - A new A7 checks that on-path.
  - F1 accepts the earlier, cue-side fix.

APP and Listening build versions are now both v696, which tests37 / 38 / 39 require; the Listening code is unchanged.

**Two real bugs this exposed, both fixed:**

- **Wrong pronoun in two cases.**
  - The object after "help" became "they": "help they carry it" — now "help them carry it".
  - The speaker's own object pronoun was not shifted: "He asks if she wants him to…" — now "wants you to…".
- **A valid Thai pair could be dropped.** It happened when the judge scored a cue 3/5 that was already the cue built from the English. The pair is now kept.

What tests54 covers:

- The six brief examples (A–F), narration, the speaker contradiction and template copies.
- For **every** changed cue of all three tracks:
  - no lost negation;
  - no question / statement flip;
  - no word that is neither in the original cue nor in the verified meaning;
  - no narration left;
  - only the cue edited (sentence, translation, phonetic / reading / romaji / pinyin, target and speaker identical);
  - idempotent;
  - no worse on the language cue-form check;
  - already-correct cues left alone.
- The hard cases:
  - "cheap" kept with the translation flagged;
  - degree flagged;
  - ellipsis kept (two cases);
  - "not today" removed and reported;
  - the negative question flagged;
  - Japanese manner removed with politeness kept;
  - the addressee resolved;
  - Mandarin templates converted.
- Average length falls in all three languages, with no length gate.
- Pipeline, via `finaliseMainTrack` with the simulated model, Thai / Japanese / Mandarin, switch on vs off on the same track:
  - only the cue differs;
  - the same pairs are saved;
  - the quota / integrity result is identical (30 × 3 kept);
  - a Thai cue changed after judging is re-judged before saving;
  - the rollback switch restores the v695 cues;
  - the generators carry the new contract.

## 7. Effect on generation cost

- The cue pass is deterministic: **0 extra calls**.
- The longer cue contract in the generator prompts adds about 110 input tokens per generation request; the class rule adds about 100 per judge batch. That is roughly 6,000 input tokens per track, about **US$0.0006** at Haiku prices — under 1% of the recent US$0.09–0.12 per track.
- Thai cues that change at the final step are re-judged in one batched call. This is normally none, because cues are clarified before their first judgment.
- Expected savings: fewer cue-mismatch rebuilds and fewer group replacements caused by a bloated cue. The v694 track replaced one group (ง่าย) after a 2/5 cue mismatch. These savings are not yet measured live.

## 8. Daily Track integrity unchanged

- Only the `prompt` field changes, plus three bookkeeping fields: `_cueClarifiedFrom`, `_cueClass`, `_cueFlags`.
- The sentence, translation, target id, target surface, speaker and pronunciation of every pair are untouched. tests54 B5 checks this on 289 real pairs; E2 checks it on finalised tracks, switch on vs off.
- 30 targets × 3 valid recalls, belt vocabulary and grammar restrictions, closed vocabulary, SRS / history / Known / bookmarks are not touched.
- The pass never drops or adds a pair.

## 9. Remaining risks

- **The rules are written for English.**
  - Unusual phrasings can escape the background patterns: about 1 Thai and 7 Japanese cues are still over 14 words.
  - A noun not in the learner's bank cannot be identified as "a thing the sentence does not say". For example, "Ask him if the café has any salt" keeps "café" because the bank has no word glossed exactly "café".
- **Some cues are left as "Ask: …?"** where the question cannot be reported safely: tag questions, two-sentence lines, interjection-first questions (10 Mandarin cues).
- **Addressee gender** is known for Thai (particles) and from the scene descriptions. Otherwise the cue uses "they".
- **Live behaviour is unmeasured.** The generator contract change should make most cues short at the source; how well the real model follows it is unknown until a paid run.
- **The flagged meaning errors** are reported, not repaired automatically. Six on these three tracks need a decision on the sentence or translation.

---

## TL;DR

- **Why the prompts were bloated:**
  - the Daily generators were asked to describe each line in the third person, with the whole scene in front of them, and nothing kept the scene out of the cue;
  - the QC judge passed extra background as 4/5;
  - the fallback rebuilt cues as "Tell the other person: <English>".
- **v696 adds a deterministic, cue-only pass for Thai, Japanese and Mandarin.** It:
  - turns narration and template copies into short instructions;
  - removes background the sentence does not say, and keeps an elided referent when needed;
  - rebuilds a cue that names something else from the verified meaning;
  - never loses negation, questions, numbers or comparison.
- **Generators and judges:** the generators now ask for the short form, and the judges classify A/B/C/D.
- **On your real tracks:**
  - Thai 64/94, Japanese 67/101 and Mandarin 80/94 cues changed, with average length down about 20%;
  - 6 genuine sentence or translation meaning errors are flagged, not hidden;
  - 2 cue meaning mismatches are fixed.
- **Tests and cost:** tests54 is 55/55, the replay shows 0 mismatches, there are no extra calls, and the cost is about +US$0.0006 per track. No sentence, pronunciation or SRS data changed. No paid test and no deploy — a live Daily run needs your approval.
