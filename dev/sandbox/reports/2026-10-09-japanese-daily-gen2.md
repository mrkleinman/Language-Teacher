# Sandbox report: Gen2 Japanese Daily, 9 Oct 2026

All work happened in the development sandbox (`dev/`). Production (`../index.html`, v677) was not touched, nothing was deployed, and no learner data exists here. The fixture is `ja-daily-2026-10-08`: the same 30 targets, vocabulary and belt as the three live v677 runs.

## What was genuinely executed

| Stage | Executed | Evidence |
|---|---|---|
| Build v678 from `tt.jsx` | yes | `IN SYNC v678`; v677 baseline restored from git, byte-identical to the deployed page |
| Offline regression, real compiled app | yes | 39 suites, 1,259 checks pass. tests33 2G fails as it already does on v677. tests35 2C (TH/ZH) is BLOCKED: its replay script and logs are missing. tests12 R is BLOCKED: v646 was never published. |
| Production unchanged | yes | 18/18 live v677 runs replay with identical learner-facing content |
| Live Gemini, **Gen2 pipeline only** | 7 runs | every request carried a `[task: gen2-…]` tag; 0 refused by the pipeline guard; 0 by the cost cap |
| Generator model | gemini-2.5-flash-lite | `P_gen2_probe` |
| Judge and pronunciation model | gemini-2.5-flash | `R_gen2_judge`, `S_gen2_reading` |
| Recording complete | yes | each run was replayed offline straight away: faithful, identical content |
| Independent inspection | yes | my own line-by-line read, plus blind reviews of 180, 264 and 450 items, all generators mixed and labels hidden |

Spend: **US$0.522 of the US$1 cap**, from Gemini's own `usageMetadata`, over 7 runs plus one zero-cost plumbing run (`sandbox/spend-ledger.json`).

## Runs: diagnose → fix → retest

| Run | Gen2 build | Status | Targets | Deferred | Requests | US$ | What it taught us |
|---|---|---|---|---|---|---|---|
| 1 | 1.0 (handover) | READY | 30 (6 replacements) | 8 | 121 | 0.064 | READY hid real defects: no romaji at all; spaces inside Japanese (12 items); はい recalls containing both a question and its answer; untaught words (いもうと, あなた) passed. Core words (する, 何, すみません, ありがとう) were deferred because good sentences were thrown away as "fragments". |
| 2 | 1.1a | NOT_READY | 23 | 15 | 116 | 0.077 | My first fix asked for reading + romaji inside the sentence request. flash-lite then wrote whole sentences in kana, and a dictionary veto misread unlisted words. |
| 3 | 1.1b | NOT_READY | 28 | 10 | 120 | 0.083 | Pronunciation moved to its own stage. Deferred words often had 5–7 accepted sentences but failed the "3 distinct uses" picker, which merged sentences by the model's function label. |
| 4 | 1.1c | NOT_READY | 30 | 6 | 104 | 0.079 | Picker fixed. Reply words (はい/うん/いいえ) were rejected because their situation cues were not treated as instructions. |
| 5 | 1.1d | NOT_READY | 30 | 3 | 91 | 0.073 | Every mechanical limit met; one sentence (遅れた) used an untaught verb hidden behind the kanji of 遅い. |
| 6 | 1.1e | **READY** | 30 | 5 | 99 | 0.076 | romaji 90/90 |
| 7 | 1.1e | **READY** | 30 | 3 | 89 | 0.071 | romaji 90/90 (2 spare swaps) |

## Defects found and fixed (all inside the disabled Gen2 block; tests39 F1–F19)

1. Adverbs (また, たぶん, ちょっと) were classed as verbs, because the word "adverb" contains "verb".
2. Spaces between Japanese words: removed before any check.
3. Two turns in one item (a question together with its own answer): rejected.
4. The fragment rule used the length estimate, which counts 今、何してるの？ as one unit. It now counts words.
5. **Closed vocabulary, hiragana:** the shared production line checker accepts any all-hiragana word (ねこ, いもうと, あなた). Gen2 now checks every stand-alone kana word. この/その/あの/どの are allowed only when これ/それ/あれ/どれ is taught.
6. **Closed vocabulary, kanji stems:** the shared checker accepts 遅れた because 遅 is the stem of the taught 遅い. Gen2 now requires the taught word's own endings. Across 1,435 recorded candidates this flags exactly the 9 real cases, and none of the 270 v677 sentences.
7. **Romaji:** a separate stage after acceptance. The reading must be exactly this sentence (each kanji read with its dictionary readings), and the romaji must transcribe it. A failure is swapped for another accepted sentence and never guessed.
8. はい/いいえ/すみません are taught in polite speech, with a stranger, a shop assistant or a colleague. Polite verb endings count as grammar for those words only.
9. Reply words: only the learner's reply is written; the other person's question goes in the cue.
10. Three distinct uses: the same template with a different noun counts once; a shared function label alone does not merge different sentences.
11. Cue rules: manner adverbs ("Politely refuse…") and situation set-ups ("Your friend asks…") count as intents.
12. Generator prompt: vocabulary discipline (no unlisted nouns, names, 私/あなた) and "different real situations".
13. Judge prompt: one utterance only, the cue must lead to this word, translation nuance, and a calibration of "marginal".

## Is it better than v677? (blind review of 450 items, final build)

| | Gen2 run 6 | Gen2 run 7 | v677 run 1 | v677 run 2 | v677 run 3 |
|---|---|---|---|---|---|
| Recalls with any problem | 25 (28%) | 21 (23%) | 42 (47%) | 38 (42%) | 48 (53%) |
| Useful cues | 75 | 81 | 29 | 33 | 28 |
| Cues copying the answer | 1 | 0 | 55 | 48 | 57 |
| Weak or not useful | 11 | 8 | 30 | 30 | 34 |
| Misleading translations | 2 | 2 | 6 | 8 | 7 |
| Grammar errors | 0 | 1 | 2 | 1 | 0 |
| Marginal naturalness | 16 | 15 | 11 | 12 | 11 |
| Unnatural | 2 | 3 | 5 | 1 | 2 |
| Romaji problems | 0 | 0 | 3 | 2 | 5 |

**Verdict:** for Japanese Daily, Gen2 is meaningfully better as teaching material:

- about half the problem rate;
- 2.5× as many usable cues;
- a third of the weak sentences and misleading translations;
- no romaji errors.

It is **not more natural**: "marginal" sentences are slightly more common than in v677. It is also far from the acceptance targets: Q1 asks for at most 5% problems, and it has 23–28%.

All reviews are by the same model family as me. They are **uncalibrated** until a native speaker reviews them.

## Open issues (not fixed)

- Deferrals: run 6 had 5, above the limit of 3. はい was deferred in every run.
- The judge still accepts some odd or mistranslated items: その映画は何？ glossed as "what is it about", これ、できる？ counted as する, and a repeated なんで…んだ？ template.
- **The production line checker has the two vocabulary gaps above (5 and 6), and they affect learners on v677 today.** Fixing them in production needs a separate, approved change.
- Cost is 2.1–2.3× v677 (limit 2.5×), mostly the flash judge.
- Romaji capitalisation is inconsistent (cosmetic).

## Decisions for the owner

1. この/その/あの/どの are allowed when これ/それ/あれ/どれ is taught. v677 allows any kana word.
2. はい/いいえ/すみません are taught in polite situations instead of casual talk between friends.
3. The same question in a clearly different situation (これいくら？ / いくらお金使ったの？) counts as a different use.
4. Whether to fix the production vocabulary checker gaps (separate change).

## Proposed next sandbox tests (nothing spent on these)

| Test | Before it can run | Estimated cost |
|---|---|---|
| Japanese Daily ×3 more, to show repeatability (criterion M1 needs 8/9 READY with at most 3 deferrals) | nothing | about US$0.23 |
| Mandarin Daily ×1 | Gen2 has no pinyin stage yet; build it offline like the romaji stage, and add the zh equivalents of fixes 2–4 | about US$0.08 |
| Thai Daily ×1 | no Thai phonetic stage yet; check the Thai closed-vocabulary checker for gaps like 5–6 | about US$0.12–0.15 |
| Listening ×3 (ja, zh, th) | Listening has not been touched today; it needs the format, vocabulary and pronunciation fixes first | about US$0.02–0.04 each |

---

# v679: the Japanese "Use the new generator (test)" switch

## What changed for the learner

- The Japanese **Scene Ready** screen gains a switch, **"🧪 Use the new generator (test)"**. It is **off by default** and remembered on the device.
- With the switch **off**, everything is exactly v677: the 18 live v677 runs replay identically, and the browser test confirms the standard generator runs.
- With the switch **on**, Gen2 writes the recalls. They then go through the **unchanged** production tail: provenance, QC, the final audit, the 11-check display, and the learner's own Save through the existing SRS code.
- Deferred words stay due. A replacement word is never a NEW word.

## App-path defects found live, and fixed

| Live run | Problem | Fix |
|---|---|---|
| 1, 3 | One unfixable romaji line stopped the whole lesson. | Retry with the exact error; then the dictionary reading, only if it passes the exact check. |
| 2 | Production's audit flagged 21 lines because Gen2 sent no word breakdown. | Dictionary word breakdown aligned to the reading (all 791 recorded readings now pass production's audit). |
| 4, 5, 7 | Production QC replaced 8–15 correct sentences (行きます, してる, 電話しよう) because its noun+verb rule saw word fragments. | Each word carries its lemma. Production's usage rules also run inside Gen2's gate, so production does not need to replace sentences. |
| 7 | Production counted particles as content words ("9 units > 7"). | Segments carry production's own token classes. Gen2's length gate uses production's count. |
| 9 | Coherence 1/5: 90 lines were judged as one scene. | Six sections with honest local premises. The audit is unchanged. |

## Results on the final build (runs 8–12)

- READY in **3 of 4** runs. The other run, 11, failed the coherence audit; the screen then offers "Study anyway", as v677 does.
- About **US$0.08** per lesson.
- Production QC replaced 0–4 sentences per lesson.
- Blind review, against v677 run 2:

| Recalls with any problem | Useful cues | Cues copying the answer | Misleading translations |
|---|---|---|---|
| v679 app path: **12/90 and 22/90** | **83 and 72** | 1 and 0 | 3 and 5 |
| v677: 27/90 | 32 | 49 | 8 |

## Production QC rules that reject natural Japanese (for the owner; not changed)

- ありがとう cannot share a line with a verb, which blocks 来てくれてありがとう.
- あそこ / 店 cannot be the object of 見る, which blocks あそこ見て.
- An adjective in て-form before a verb is rejected (忙しくて行けない).
