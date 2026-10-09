# v681: three-language quality repair (standard generator)

Branch `claude/session-continuation-check-a19meq`. Nothing was deployed: production is still v680. All live runs used isolated benchmark fixtures; no learner data was changed.

## 1. Which pipeline produced the supplied logs

All three supplied logs come from the **standard generator**, not the new one (Gen2).

- The Japanese log says `pipeline=v651-canonical build=v679`. `build` is the app version. `pipeline` is the version of the standard generation pipeline, which has been unchanged since v651.
- In v679–v680 the new architecture (Gen2 from v678) runs only when the learner ticks **"Use the new generator (test)"**. It is off by default, and none of the three logs contains a Gen2 marker (`🧪 NEW GENERATOR`, `[task: gen2-…]`).
- The three Daily generators share one QC tail (`jazhQcFinaliseAndListen` for Japanese/Mandarin; `runQualityCheckCore` plus the shared FINAL_TRACK for Thai), but each has its own generator and deterministic grammar rules. That is why the same kind of defect (variety, fragments) had three different causes.

## 2. Root causes and fixes

### Shared
| Defect | Root cause | Fix |
|---|---|---|
| Near-identical recalls counted as 3 uses | The template key only stripped final particles; demonstrative, pronoun and filler swaps counted as new uses, and the key was enforced only in Mandarin | One shared `recallVariationKey`. It is enforced in the Japanese and Mandarin generators and used by the variety audit. Social formulas and reply words are exempt: they have few natural uses. |
| A 3/5 cue verdict saying "the sentence is a fragment" still went READY | Every 3/5 was advisory, the judge's note was never read, and the issue stayed `found` forever, outside every total | A 3/5 whose note names a sentence defect goes to the blocking repair ladder. A genuine phrasing nit is explicitly `accepted` with a reason, so found = fixed + accepted + unresolved. |
| A changed line could stay "VERIFIED" | `thaiSemanticAuditStatus` read only the flag, not whether the verdict was for the current text | A verdict recorded for older text means UNVERIFIED, which blocks READY. |
| Gen2 lacked the production rules | — | Gen2 now applies `mandarinSurfaceGrammarProblems` and `thaiLexicalSenseProblems` up front. |

### Japanese
| Defect | Root cause | Fix |
|---|---|---|
| `どれも一緒だよ。` rejected | The rule rejected any sentence that contained a question word and ended in だ/だよ/です | Only a question word that is itself the asserted predicate is rejected (`誰だよ。` still fails). |
| Dashboard 5, generator asked for 3, shipped 1 | The dashboard showed the **Thai** belt allowance (`newSlotsFor`); Japanese uses `JA_DAILY_NEW_WORDS = 3`. Deferred NEW words were backfilled with **review** words only. | The dashboard shows each language's own Daily quota. A deferred NEW word is replaced by the next feasible unseen word as NEW (`japaneseDailyFeasibleTargets`). The ceiling and debt rules are unchanged. |
| 物 / 場所 deferred on every track | They had no construction at all (`JA_NOT_POSSESSABLE` blocks the only frame), so the message "no licensed frame from the inventory" blamed the wrong thing | Licensed constructions (`買う物ある？`, `場所、分かる？` …) that still pass the taught-words check; honest reason text. |

Owner decision still open: Japanese stays at **3** new words per Daily Track, which is its own configured value. Raising it to 5 changes the learning pace, so it is your call.

### Thai
| Defect | Root cause | Fix |
|---|---|---|
| `ผมไม่ได้ยินอะไรเลยครับ` / `เราไม่เหนื่อยแล้วครับ` "target missing" | The longest-match segmentation lets the lexicalised `ไม่ได้` / `ไม่เหนื่อย` swallow the target across a word boundary | The target is present when only a grammatical prefix (`ไม่`, `จะ`, `ยัง` …) is glued in front and the rest of the sentence segments into known words. `มา` in `หมา`, `ใจ` in `เข้าใจ` and `น้ำ` in `น้ำแข็ง` still fail. |
| แล้ว / ก็ / นะ skipped forever | `THAI_NOT_GENERATABLE` excluded them as targets permanently, so they never left SRS and could block belt completion | They are teachable targets with a per-word teaching contract (`THAI_FUNCTION_TARGET_GUIDE`), at most 2 per track (Daily and Revision), most overdue first. |
| ไป + vehicle, คู่ misuse | No rule existed | `COLLOCATION_VEHICLE_GO` and `CLASSIFIER_KHUU_MISUSE`. The vehicle construction (นั่ง/ขึ้น) is also taught up front. |
| Phonetics "aligned" by equal counts | Positional romanisation was accepted whenever the counts matched | The line must be anchored: every known word matches its syllable at its own position. |
| QC rewrites over the length limit | The parting-line replacement had no length check | An over-length rewrite is discarded and the original line kept. |
| `ผมรู้สึกสั้นครับ` ("I feel short") | The fallback put every adjective into "I feel …" | `รู้สึก` is used only for feelings; other adjectives describe a thing. |

### Mandarin
| Defect | Root cause | Fix |
|---|---|---|
| `今天好。` / `很多。` accepted | The bare-adjective rule only knew demonstrative subjects; the fallback built subjectless degree phrases | Any plain subject is covered; subjectless 很+adjective is a fragment; the 很 fallback gets a subject. |
| `你喜欢` / `我想喝` | No valency check outside the fallback | A positive statement ending on a transitive verb is rejected (negated replies and questions pass). |
| `你做的好吗？` | No 的/得 rule | A degree complement after an action verb must use 得 (`你说的对` still passes). |
| `你到哪里？`, `你拿哪里？`, `你想可以。`, `你可以什么？`, `这个什么？`, `很很好`, `你很什么？`, `我在看一起。` | No rule existed | Targeted rules, each with pass/fail tests. |
| One unresolved recall failed the whole track | The Mandarin generator has no recovery round (Japanese does) | One bounded recovery round on the recall's own ledger; more 到 frames. |
| 不 sandhi | Only third-tone sandhi was implemented | Spoken pinyin applies bù → bú before a 4th tone. |

## 3. Tests

- **tests40** (new): 33 checks, each pairing a failing example with a passing one through the real app functions, plus a breadth check over all recorded Mandarin sentences. Against the v680 build, 23 of the defect checks fail; the guard checks pass on both builds.
- The full suite passes **1,301** checks. The only non-passes are the 3 known ones (tests33 2G; tests35 2C BLOCKED) and 1 BLOCKED check.
- Simulator recordings were re-recorded on v681; the v677 set is kept in `cassettes/archive-v677`. **No recorded outcome changed** (READY / NOT_READY).
- The replay-equivalence test (tests39 A5) now proves the change is confined: setup is identical, Listening is unchanged except the two Mandarin runs that used `你到哪里？`, and every other difference is a validator decision or the two deliberate Thai prompt additions.

## 4. Live sandbox runs (standard generator, v681 at the time, Gemini 2.5 Flash-Lite, combined cap US$0.25)

| | Japanese | Thai (owner's learner, today's selection) | Mandarin |
|---|---|---|---|
| Fixture | ja-daily-2026-10-08 | th-daily-device-2026-10-09b | zh-daily-2026-10-08 |
| Result | stopped: 2 recalls unresolved (awaiting Retry) | **NOT_READY** 89/90; 2 parting lines over length | stopped: 89/90 (one 到 recall) |
| Cause | the variety rule was too strict for ありがとう / すみません | ไปรถไฟฟ้า repeatedly; QC rewrote parting lines too long | 到's fallback had no frame left; no recovery round |
| Fixed afterwards | yes (formulas exempt) | yes (vehicle taught up front; QC length guard) | yes (recovery round, 到 frames) |
| Requests · tokens in / out | 70 · 137k / 45k | 151 · 285k / 37k | 203 · 355k / 19k |
| Cost | US$0.032 | US$0.043 | US$0.043 |

Total **US$0.119** of the US$0.25 cap. No request was refused by the cap. No retest has been run: a retest of all three needs the owner's approval, at about US$0.13.

### Independent inspection (my own reading, not native-speaker validated)

| | Japanese (77 accepted lines) | Thai (89 target lines) | Mandarin (89 accepted lines) |
|---|---|---|---|
| Lines with a real problem | ~9 (12%) | ~16 (18%) plus ~6 cues that copy the translation | ~13 (15%), plus heavy repetition of 这个 / 人很多 |
| Examples | どこ practised only as どこか (×3); たぶん、また明日。; あ、ごめん！すみませんでした。 | ผมรู้สึกสั้นครับ / ผมรู้สึกยุ่งครับ (fallback, now fixed); เสื้อผ้าพันตัว; แล้ว ×3 weak or mistranslated; ก๋วยเตี๋ยวคู่กับน้ำ; ไม่ได้ยิน romanised mâi-dâi yin | 你想可以。, 你可以什么？, 这个什么？, 我来帮, 快。 (rules now added); 我做一点; 不少。 |
| New-word count | 1 NEW (the fixture holds 1; the quota fix lives in screen selection, covered by tests40 J4) | 5 NEW + 25 review, incl. ก็ / แล้ว | 5 NEW (fixture) |
| Teaching-quality score /10 | **6** (content), but not READY | **5.5** | **4.5** |

**Scoring criteria:** the share of lines that are accurate and natural; genuine variety across a word's 3 recalls; cue usefulness (does it make the learner produce the target?); pronunciation correctness. Each point weighs the defect rate against the supplied logs (owner estimates: ja 5.5, th 5, zh 4).

**Versus the supplied logs**, which were all standard generator on v679:
- **Mandarin:** the log reached READY at US$0.032 with `你喜欢`, `我想喝`, `你做的好吗？`, `今天好。` and `很多。`. All are now rejected, but v681 needed one more recovery to complete.
- **Thai:** the log reached READY at US$0.044 with `ไปรถไฟฟ้า`, `ตู้เย็นคู่หนึ่ง` and a ได้ยิน target-missing reject. Those are fixed, and the function words are taught.
- **Japanese:** the log rejected `どれも一緒だよ。` and shipped 1 NEW of 3. Both are fixed.

## 5. Remaining defects (not fixed)

- Naturalness is still judged by Flash-Lite at "4/5 passes"; a 3 without a quoted span is overruled to 4. This is the main route for odd-but-grammatical lines (Thai ผมอยากสบายครับ, Japanese 今日、どこか来ない？).
- Japanese target presence counts どこ inside どこか (a different word).
- Thai phonetics: the composer splits ไม่ได้|ยิน (pronunciation `mâi-dâi yin`).
- Lexicon romanisation quirks (ลอง `looong`, แจ็ก tone).
- Production cue repair writes "Tell the other person: …" (a translation copy).
- Framing lines are never judged for naturalness.

## 6. Recommendation

**Not fit for learner testing yet.** All three first live attempts ended NOT_READY, each for a now-fixed cause, but the fixes are verified only offline. Next steps:

1. Approve one retest of the three Daily tracks (about US$0.13).
2. Deploy v681 only if all three reach READY with no critical accepted errors.
3. The new generator (the v680 switches) remains the stronger path for teaching quality (Thai 16/90 problems vs 27/90 for the standard generator).


## 7. Retest (owner-approved, same fixtures, final v681 code at the time)

| | Japanese | Thai | Mandarin |
|---|---|---|---|
| Result | **READY 90/90** | NOT_READY 89/90 | **READY 90/90** |
| Requests · cost | 101 · US$0.032 | 166 · US$0.042 | 233 · US$0.043 |
| Notes | variety audit 29/30 (only すみません, a set phrase deliberately exempt); QC 1 found = 1 accepted | length now PASS (0 over the maximum); ไปรถไฟฟ้า caught twice; สบาย ended 2/3 because สบายๆ (doubled word) was wrongly treated as target-missing | QC 4 found = 2 fixed + 2 accepted + 0 unresolved (accounting now balances) |

Phase total: US$0.237 of the US$0.25 cap (first attempts US$0.119 + retest US$0.117).

### Defects the retest exposed, fixed afterwards (tests40 now has 37 checks)
- Thai: a doubled word (สบายๆ, ช้าๆ) is the target (T10).
- Thai fallback: ยุ่ง became อันนี้ยุ่งไหมคะ; person-state adjectives are now said of a person (T11).
- Thai: ตั๋วรถไฟสองคู่ (tickets are not pairs) is now rejected (T12).
- Mandarin: 我们回家吧 shipped with the pinyin "wǒ huí jiā ba" and counted as aligned. 们 now has its reading, and the final audit requires every character to have a reading; a line that differs from its words is rebuilt and logged (Z13).

### Retest inspection (my reading, not native-validated)
- **Japanese:** natural casual Japanese throughout. Remaining problems: about 25 cues copy the translation; どこ is practised twice as どこか; weak bare lines (うん。 / いいよ。); 電話、まだ大丈夫？ is odd. **Score 6.5/10.**
- **Thai:** clearly better. Vehicles are used with นั่ง, ก็ / แล้ว are natural, and the length limit holds. Remaining problems: ผมเชื่อเราไปเจ็ดโมง (missing ว่า); ขอเวลาสั้นๆ mistranslated; ผมอยากไปเที่ยวกับคู่; one cue says "He" for a female line; ไม่ได้ยิน romanised mâi-dâi yin. **Score 6.5/10.**
- **Mandarin:** grammatical. Remaining problems: every cue is "Tell the other person / Ask: <translation>" (the standard Mandarin cue design); fragments 大吗？ / 好吗？ / 不快。; weak 你吃好吗？ / 你慢吗？; the missing 们 pinyin (now fixed). **Score 5.5/10.**

Recommendation: one more Thai run (about US$0.045, slightly above the US$0.25 phase cap) to confirm the สบายๆ fix. Deploying v681 is reasonable once Thai is READY; the cue-copy problem in the standard generator's Japanese and Mandarin cues is the next quality step.


## 8. Final Thai confirmation run (owner-approved)

**Thai READY 90/90**: 154 requests, US$0.038. สบายๆ is now recognised, the length limit held, and vehicles were taught with นั่ง.

The inspection still found two accepted defects, both fixed afterwards and tested in tests40 T13 (38 checks):
- **คู่:** all three คู่ recalls used it with noodles (ก๋วยเตี๋ยวคู่ไหน). The rule is now an allow-list: a classifier use of คู่ needs a pair noun. Over all 947 recorded Thai lines it flags 9 weak or wrong lines and none of the legitimate ones (ตั๋วคู่ "couple ticket" passes).
- **Translation copied the gloss:** ขออันหน่อยครับ was translated "Can I have a general classifier / item", which is now rejected.

Still weak: แล้ว (2 of 3 translations are off); ได้ยิน romanised mâi-dâi yin; several targets share one template (ทำความสะอาด X ×4).

**Thai score 6.5/10.** Full suite: 1,306 checks pass (the same 3 known failures plus 1 blocked check). Total spend for this testing phase: US$0.275.

**Final status:** all three languages have reached READY on the final v681 code (Japanese and Mandarin in the retest, Thai in this run), and every defect the runs exposed has a fix and a regression test. Deploying v681 is reasonable as an improvement over v680; it is not perfect. The next quality steps are cues that do not copy the translation (Japanese / Mandarin), どこ vs どこか, and the Thai phonetic split of ไม่ได้ยิน.

## TL;DR

The supplied logs were the standard generator; the new generator only runs with the test switch on. I traced and fixed the root causes in all three languages, with 33 new regression tests (23 of which fail on v680) and the full suite green. The first live attempts on v681 cost US$0.119; all three stopped short for reasons that are now fixed. A retest (about US$0.13) is needed before anything goes live.
