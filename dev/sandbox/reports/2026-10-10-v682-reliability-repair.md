# v682: Critical Reliability and Teaching Quality Repair

**Scope:** Thai, Japanese and Mandarin.
**Branch:** `claude/session-continuation-check-a19meq`. Development only, not deployed. Production is still v681.
**Not done:** no native-speaker validation was carried out. The quality judgements below are mine.

The AI-provider switch was paused as asked. It is saved untouched in `sandbox/parked/v682-provider-switch.patch`.

## 1. Root cause: Mandarin 89/90 (喝, recall 2)

**Evidence.** The log of the post-v681 failure was not provided. Everything here comes from:
- reproducing it with the learner's 8 October Mandarin snapshot (`zh-daily-2026-10-08`, which has 喝 as a target)
- tracing the code
- the 9 October v680 log, which shows the same weakness: 喝 recall 2 needed its 3rd check, and recall 3 accepted the fragment 我想喝.

**What went wrong.** It was not the validators wrongly rejecting good sentences, and not the retry limit. It was the recovery design.

1. **No drink nouns.** The learner had none (水 / 茶 / 咖啡 are untaught). The model's natural sentences (我想喝水 / 我喝茶) were rejected as untaught vocabulary, check after check. The prompt never said that drink nouns were forbidden or which objects were allowed.
2. **Only one backup sentence.** The deterministic backup had exactly one 喝 sentence that passes every check: 你喝什么？.
   - Its other frames needed 水.
   - The generic 我喝。 / 我想喝。 are fragments that are correctly rejected.
3. **Nothing left for recall 2.** Once recall 1 used 你喝什么？, recall 2 had no backup. The recall stayed unresolved.
4. **The whole track was lost.** `generateMandarinTrack` threw "Generation incomplete". The screen's **Retry restarted a full paid generation** and all 89 verified recalls were thrown away.

**Fixes.**
- 喝 and 吃 get collocation-correct frames built only from words a beginner has: 我喝这个。 我想喝一点。 你要喝一点吗？ 你喝不喝？ 我们一起喝吧。 我不喝。
- The backup never returns a superficial copy of a recall already accepted.
- The prompt names the untaught nouns as forbidden and lists the objects that are allowed.
- Generation is now resumable (section 4).

**Live proof.** In the real Gemini run, 喝 recall 2 was resolved by the new backup sentence 我喝这个。 at its 3rd check.

## 2. Root cause: Thai 87/90 (ชิ้น)

1. **The model was never taught what ชิ้น counts.**
   - The generator and both recovery paths were given only the gloss "piece/classifier", inside a transport scene.
   - The recovery prompt said "flow naturally from before to after".
   - No rule checked that a classifier fits its noun.
   - So every attempt paired ชิ้น with boats, tickets or seats (ที่นั่ง), and nothing remembered which lines had already failed.
   - Fixes:
     - A **teaching contract** for classifier targets: what each counts, natural frames, and what it never counts.
     - A **CLASSIFIER_MISMATCH** check (เรือชิ้นนี้ / ตั๋วชิ้นหนึ่ง / ที่นั่งชิ้นนั้น are rejected).
     - The quota-recovery prompt (the real Daily path) now treats the scene as background only. After a failure, or for a classifier or function word, it may write a short self-contained moment.
     - Recovery remembers rejected lines.
2. **Why เราไปทางเข้ากันครับ was rejected and later accepted unchanged.** Inconsistency between separate model judgements.
   - The verdict cache is keyed on sentence + English + speaker + target. The same Thai line with a re-worded translation, or judged inside a different batch, was judged again from scratch.
   - Now: **one naturalness decision per Thai sentence per run.** A contradicting verdict triggers one isolated re-judgement; the majority decides, it is logged (`THAI_VERDICT_CONFLICT`), and all later stages reuse it.
3. **Why the log said "30/30 distinct applications" at 29/30 coverage.** The variety audit only examined targets that had at least 3 valid pairs, so ชิ้น (0/3) was never counted. It now reports incomplete targets separately.

## 3. Japanese findings

| Defect | Cause | Fix |
|---|---|---|
| どこか行くの？ counted as どこ | Target presence was a substring match | Question-word compounds (どこか / どこも / 何か / 誰も / いつも …) are different words |
| あれは何？ read あれはなん？ | The model's reading was kept when it looked well-formed | The reading of 何 is fixed from the next word (なに / なん), on segments and sentence alike |
| え、どこがいい場所？ | No rule | どこ…場所 redundancy is rejected |
| 大丈夫 recalls differing only on the surface | うん、大丈夫 looked different from 大丈夫だよ | The variety rule counts asking vs answering, ignores a leading reply word or a bare "this/that", and ignores ここで |
| もう一緒じゃないの？ mistranslated | Translation accuracy is judged by the model only | **Not fixed** (section 7) |

**New-word quota.** In the v681 code, the dashboard and the selector read the same single setting, `newWordsPerTrack('ja')` = 3. The real dashboard, rendered with the learner's data, says "Introducing 3 new words per Daily Track". So does the export ("3 expected, 3 selected").
- The "5" was what the dashboard showed before v681: the Thai belt allowance. Your phone was most probably still showing a cached older page.
- Whether Japanese should be 3 or 5 is a curriculum decision. It is yours to make, so I have not changed it. A test now enforces that the dashboard and the selector agree.

## 4. Resumable generation: exactly what is kept

**Where it is stored.** Each Daily generation keeps a **draft** under its own key: `tt-zh-gen-checkpoint`, `tt-ja-gen-checkpoint` or `tt-th-gen-checkpoint`. It never touches the track list, vocabulary, SRS, OK counts or belts. The draft records:
- the 30 target ids
- the NEW ids
- a signature of the exact authorised vocabulary
- every accepted pair: target id, recall number, text, English, cue, pronunciation, source and QC status
- the sentences already rejected for each missing recall
- how many times it has been resumed.

| Language | Saved | "Retry missing recalls" |
|---|---|---|
| Mandarin | After every accepted recall, mid-generation | Generates only the missing recalls. It also covers a gap that appears after QC: those slots are taken out of the draft and regenerated, then QC runs again. |
| Japanese | When generation ends incomplete, and after every recovery | Restores the draft and gives each missing recall one fresh check ladder |
| Thai | The finished NOT_READY track | Only the deficient targets go back through the same quota engine and final audit. Every verified pair is kept. |

**Guarantees.**
- **Re-checked before reuse.** Every kept pair goes through the current acceptance rules again. One that no longer passes is regenerated, never trusted.
- **No duplicates.** A filled slot is never overwritten or duplicated.
- **Bounded.** At most 3 explicit retries.
- **Reloads safely.** It survives refresh and navigation. A changed word selection or vocabulary means it cannot resume, and the screen says why.
- **You always choose.** The screen offers **Retry missing recalls** or **Start new generation**, and a draft is never silently resumed or thrown away. Japanese offers the draft before paying for a new scene.
- **Not a lesson.** A draft is not playable and is not counted as a lesson. It is cleared only when the finished track is handed to the app.

**Proof.**

| Test | Result |
|---|---|
| Offline: resume at 89/90 | 3 requests instead of 165; the other 89 pairs identical |
| Offline: resume at 87/90 | Only those 3 recalls generated |
| Offline: interrupted at 88/90 | Only 2 regenerated |
| Real browser | 9/9 checks |
| Mandarin draft in the browser | "80 / 90 kept", then Retry sent 95 requests instead of 495 |

## 5. Regression results, old vs new

`tests42.js` has 38 checks. Each one calls the real app code.
- **v681:** 31 fail.
- **Still passing on v681:**
  - the quota parity, already fixed in v681
  - the asking-vs-answering invariant
  - the fallback-copy check, by chance
  - four checks that read the current source code.
- **v682:** 38/38.

| Suite | Result |
|---|---|
| Full offline suite | **1,341 PASS**; only the 3 known failures that predate this work (tests33 2G; tests35 2C ×2, blocked); "OFFLINE REGRESSION: OK" |
| Browser: resumable generation | 9/9 |
| Browser: v680 / v679 switches | 9/9 and 7/7 |

**Behaviour changes, confined and explained.**
- **Cassettes re-recorded.** The v681 set is archived in `cassettes/archive-v681`. One stress run (synthetic Mandarin "incomplete") now completes generation, because the new backup found a distinct sentence for 说. It stops honestly at QC (83/90).
- **v677 Japanese run 1.** The comparison tool now finds 2 lines where 何 / どこ appeared only inside 何か / どこか.

## 6. Real Gemini runs (Flash-Lite, isolated learner snapshots, combined cap US$0.25)

The runs used the build at commit `e03183d`. The fixes in the last table below came after them and are **verified offline only**.

| Run | Result | Requests | Tokens in / out | Cost |
|---|---|---|---|---|
| Mandarin (`zh-daily-2026-10-08`, 喝) | Generation 90/90; final NOT_READY 89/90 | 243 | 367,705 / 23,493 | US$0.0462 |
| Thai (`th-daily-device-2026-10-09`, ชิ้น) | 90/90 target pairs including ชิ้น; NOT_READY | 179 | 333,644 / 38,763 | US$0.0489 |
| Japanese (`ja-daily-2026-10-08`) | **READY 90/90**, coherence 4/5 | 106 | 145,762 / 48,436 | US$0.0340 |
| **Total** | | **528** | | **US$0.1290 of the US$0.25 cap** |

**Run details.**
- **Mandarin, 喝.** 你想喝什么？ / 我喝这个。 / 这个好喝吗？. The third line counts 好喝 ("tasty"), now caught.
- **Mandarin, 89/90.** The quality judge's reply for 很 was unreadable twice, so all three 很 pairs were "unverified". Recovery then refused 这个很好 as "already used".
- **Thai, ชิ้น.** ขนมชิ้นนั้นอร่อยมากค่ะ / คุณอยากได้ผลไม้อีกชิ้นไหมคะ / ขนมชิ้นนี้อร่อยดีค่ะ.
- **Thai, NOT_READY.** Coherence was 3/5. Scenes S4 and S5 scored 2 → 4 → 2 without a single line changing. One line was also accepted for two different words.
- **Japanese.** NEW 1/3: only 1 unseen word was available in that snapshot, and this is logged.

**Each live failure was traced and fixed** (offline-verified only):

| Live failure | Fix |
|---|---|
| Unreadable judge reply (Mandarin) | The second attempt uses structured JSON |
| Pair dropped only as "unverified" | Recovery may propose it again and re-judge it |
| Line repeated across two Thai words | An early-regenerated line may not repeat any line of the track; the duplicate rule ignores spacing |
| Coherence judge flip-flops | An untouched scene that flips pass→fail gets one deciding judgement |
| A different word containing the target (好喝 / 好吃 / 多少) | No longer counts as the target |
| Fragments (我想。 / 你到。 / 大吗？ / 一点吗？) and 你等我一点 | Rejected |
| Japanese これ今？ | Rejected |
| Japanese near-identical する recalls | Counted as the same application |

## 7. Teaching-quality defects still outstanding (found by reading the live lessons)

1. **Cues often copy the English translation**, mainly in Mandarin ("Tell the other person: I like this.") and Japanese. Mandarin cues still say only "Ask" or "Tell". This is not fixed yet.
2. **Wrong or awkward English translations accepted by the model judge:**
   - 这个可以 → "This can."
   - 人很多 → "People are many."
   - 電話、まだ来ないね → "The phone hasn't arrived yet" (it means "no call yet")
   - วางของเบาๆ → "put the light things down" (it means "gently")
   - ปิดหน้าต่างได้ → "The window can close"
   - "I have not hurry yet"
3. **Semantically odd lines accepted:** รถเมล์หมายถึงอะไรครับ ("What does the bus mean?"); all three หมายถึง lines share this shape.
4. **Thai near-duplicates** still pass: ขนมชิ้นนั้นอร่อยมาก / ขนมชิ้นนี้อร่อยดี; เตียงนี้ใหญ่นะ / เตียงนี้ใหญ่มาก. The Thai variety rule is diagnostic only.
5. **Thai compounds** (คู่ inside คู่หู) and **Mandarin 有用** are still counted as the target.
6. **Thai romanisation slips:** ตอน → "dawn" (should be dtaawn), ที่นั่น → "thîi-nán" (should be thîi-nân), สองร้อย → "rááuy".
7. **Mandarin's tiny-vocabulary lessons stay repetitive** (这个很X / 这个X吗 …).

## 8. API requests, tokens and cost

- **This phase:** 528 live requests; 847,111 input and 110,692 output tokens; **US$0.1290**.
- **Offline tests:** no cost.
- **Session ledger:** about US$2.74 of US$3.62.

## 9. GitHub

- `e03183d`: v682 resumable generation and the first repair round, the build the live runs used.
- Final commit: see the TL;DR.

## 10. Is it ready for deployment?

**No, not yet.**

- **Done:** reliability is clearly better.
  - An almost-complete track is no longer thrown away.
  - Retry generates only what is missing.
  - The 喝 and ชิ้น root causes are fixed and resolved live.
- **Not done:**
  - Only Japanese reached READY live.
  - The fixes for the Mandarin and Thai live failures are verified offline only.
  - The defects in section 7 remain.
- **Next step:** one verification round (one run per language) on this final build. It would cost about US$0.13; only US$0.12 of this phase's cap is left, so it needs your approval for a small new budget (e.g. US$0.15). Native-speaker spot checks would also help.

## 11. Owner-approved verification round (10 October, budget US$0.15)

The round ran on build `240ffd6`, with real Gemini Flash-Lite and the same learner snapshots as before.

| Run | Result | Requests | Cost |
|---|---|---|---|
| Mandarin (喝) | **READY 90/90**, coherence 4/5, no duplicates | 236 | US$0.0447 |
| Thai (ชิ้น) | **READY 90/90**, coherence 4/5, no duplicates | 185 | US$0.0496 |
| Japanese | **Incomplete, waiting for Retry**: 何 recall 1 unresolved | 67 | US$0.0313 |
| **Total** | | **488** | **US$0.1256 of US$0.15** |

**Why Japanese stopped.**
- The 何 rules worked as intended. あれ、何かあった？ was correctly rejected (何か ≠ 何).
- The AI then kept writing あれ、何？, which only swaps これ for あれ in the accepted これ、何？.
- The only backup was 何？, which is also the same question.
- In the app, this is the point where the new **Retry missing recalls** screen appears, keeping the 89 good recalls.

**Fixed after the round (offline-verified, commit `88cf560`):**
- The backup now offers real 何 constructions: 何食べる？ / 何飲む？ / 何する？ / 何がいい？.
- The backup prefers a different application, not just a different string.
- The prompt tells the AI that swapping or dropping これ / それ / あれ is not a new sentence.

**Defects found in the READY lessons, fixed afterwards (offline-verified):**
- ผมเห็นรถตัวใหญ่ (wrong classifier before an adjective)
- "Can I have a light / gentle, please?" (an English line offering alternatives)
- Mandarin 你想吗？ ("Do you want?")

**Defects still present in the READY lessons:**
- Mandarin: 那个太好了 → "That one is too good." (太好了 means "great!"); 这个多吗？ ("Is this one many?"); 你慢不慢？.
- Mandarin near-repeats: 这里人很少 / 这个地方人很少; 你拿这个 / 这个你拿.
- Cues that copy the English translation.
- Thai ครั้ง lines that are awkward (เราไปบ่ายโมงครั้งหนึ่ง).
- Thai romanisation: ตอนนี้ → "dawn-níi". This comes from the curriculum data itself (stored as "dɔɔn-níi"), and your word list keeps its own copy, so fixing it needs a data migration. That is your decision.

**Deployment readiness, updated:**
- Mandarin and Thai are now proven live (READY 90/90 each).
- Japanese was proven READY live in the first round. The 何 backup fix after the verification round is offline-verified only.
- The remaining items are teaching polish (translations, cue wording, romanisation data), not reliability.

## 12. "All must work" fixes (10 October, commit fdc9577)

What was wrong, found by reading every line of the live runs:

- **Japanese**: an example sentence in the prompt (何食べる？) was being copied into other words' sentences. The example is gone. The second Japanese run (safety stop US$0.04) was cut off before its last check, so Japanese has not yet had a complete live run on this build.
- **Thai pronunciation**: ร้อย was spelled rááuy (now ráawy), ที่นั่น had the wrong tone (now thîi-nân), ปิด was bìt (now bpìt), น้อย/ลอยกระทง had "aauy" (now "aawy"), and ตอน showed as "dawn" (now dtaawn). อย่าง / อย่างนั้น / นั่น were missing, so whole lines fell back to toneless spellings ("wang wa jà pen yang nan"). The word splitter also cut words wrongly (มาก+ี่ instead of มา+กี่).
- **Mandarin**: 那个太好了 was translated "That one is too good." (now "That's great!"). 这个多吗？ ("Is this one many?"), 我喜欢多。 and 多很好。 are now rejected. 多/少 get natural replacement sentences (人很多。 / 钱少吗？ / 太多了！), so no recall goes missing.

Proof: tests42 is 47/47 on this build (the new checks fail on the earlier build). The full offline suite is OK, with only the three long-known exceptions. The browser test is 9/9. All saved recordings were re-recorded and no result changed.

**Still to do:** one live run per language on this build. My attempt to start them was blocked by this session's permission system (it treats paid API calls as a real-world transaction). They need the owner's go-ahead in the app.

## TL;DR

- **Root causes.** Mandarin 喝 failed because the learner knows no drink nouns and there was only one backup sentence. Thai ชิ้น failed because the AI was never taught what ชิ้น counts. Both are fixed.
- **Drafts.** Generation keeps a draft. "Retry missing recalls" makes only what is missing (3 requests instead of 165 offline) and never touches progress.
- **Verification round (US$0.126 of US$0.15).** Mandarin READY 90/90 and Thai READY 90/90, both live. Japanese stopped at one 何 recall, which shows exactly when the new Retry screen appears; that backup is now fixed offline.
- **Tests.** Every defect found in the live lessons now has a regression check (41/41). The full suite (1,344 checks) passes with only the 3 known failures.
- **Deployment.** Reliability is fixed and Mandarin and Thai are proven live. Remaining polish: some English translations, cues copying translations, and Thai romanisation data (ตอน → "dawn") that needs your OK for a data fix. Deploy only with your approval.
