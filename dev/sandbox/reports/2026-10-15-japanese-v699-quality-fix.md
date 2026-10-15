# Japanese Daily — v699 quality fix (dev branch, not released)

Source: the owner's brief "LANGUAGE TEACHER — JAPANESE v699 QUALITY FIX", applied to the live v699 export
`sandbox/japanese-daily-v699-fixture/japanese-track-2026-10-15-daily.txt` (94 lines, 90 target lines, marked READY) and its
generation log `japanese-gen-log-2026-10-15.txt`.

No paid run was made and nothing was deployed. Every result below comes from offline tests that run the app's real code on the
real export.

## 1. TL;DR

- All ten wrong-addressee cues are now caught by the final check and fixed. The old check skipped the whole track because the
  scene gave no gender words. Speaker roles are now worked out from the lines themselves.
- Reply words (はい / うん / いいえ) are judged in context. An acknowledgement ("ちょっと待って" → "うん、分かった") is valid. A reply
  that answers nothing is not. A failed repair can no longer pass silently: it blocks READY.
- The repair request that was cut off (MAX_TOKENS) is now sent in small batches of up to 3, and a failed batch is retried one line
  at a time.
- Romaji is joined correctly: tabetara, hima nan da, wakannai, shitenai, iku n da.
- Target-sense errors are fixed:
  - declarative どっちの…も is no longer treated as a question;
  - どっちかな / どっちか分かんない still count as practising どっち;
  - どれ and どれも stay distinct.
- じゃあ、どっちにする？ no longer counts as a different use from どっちにする？.
- Problem lines:
  - pairs 34, 67 and 85 are now rejected by deterministic rules;
  - pair 02 is repaired in place (いいよ → 大丈夫);
  - the English of pairs 24 and 46 is corrected without regenerating the Japanese.
- The deterministic Japanese rules now run on every final target line, not only on lines changed after acceptance.
- Offline: the new Japanese suite (tests57) passes 50/50. Full regression: **2,010 checks passed, 7 failed** (frozen copy of the combined Japanese + syllabus build, 58 suites).
  - 5 are the long-standing known failures, which also fail on v699: tests33 2G, tests35 2C-th / 2C-zh, tests37 C1, tests39 A5.
  - 2 are tests55 cases 3 and 6. They fail identically on the unchanged v700 code when run today, but passed yesterday, so they are not caused by these changes. They look date-dependent and are worth a separate look..
- Not claimed: that Japanese quality has reached 8.5/10. That needs a fresh generated track and an independent content review.

## 2. Confirmed root causes

| Brief section | Root cause in the code |
|---|---|
| 1 Speaker / addressee | `cueAddresseeProblems` / `fixCueAddressees` only knew a speaker's gender from words in the scene description ("a male student"). The v699 scene said only "Ken" and "Mai", so the check returned nothing for the whole track, and the export printed CUE_ADDRESSEE=0. |
| 1 "tell his you" | The pronoun swap turned "her" into "his" before any following word, including verbs and question words. |
| 2 Reply words | `jaPlaceReplyLines` accepted only a yes/no question as a trigger. A valid acknowledgement after a request or suggestion was flagged. A reply could also be "fixed" by moving it after an unrelated question. |
| 2 Silent failure | `jaBridgeReplyTriggers` sent one request for all 10 replies. It hit MAX_TOKENS, the parse failed, the repair was dropped with only a log line, and the track stayed READY. |
| 3 Pairs 34 / 67 / 85 / 02 | There were no rules for あれ used as a place, けど with no contrast, a "reason + ここでね" goodbye, or いいよ answering 今日どう？. All four passed the model judges. |
| 3 Pairs 24 / 46 | The English translation added meaning ("both", "got late") and nothing compared it with the Japanese. |
| 4 Romaji | `jaTidyRomaji` had no joins for conditional たら, contracted ない forms, explanatory ん (nda) or ん+な (wakan'nai). |
| 5 Target sense | `jaWhQuestion` treated どっちの…も (statement) as a question. The か-compound list read どっちかな / どっちか分かんない as the separate word どっちか. |
| 6 Variety | `japaneseFormulaKey` kept a leading じゃあ / ねえ / でも, so じゃあ、どっちにする？ counted as a new use. |
| 7 Cues | The cue simplifier had no rule for plan narration ("Following up on the lunch plan, …", "get Ken's attention and suggest asking where they should go"). |
| 8 Final audit | `FINAL_TEXT_CHECK` re-ran the Japanese rules only on lines changed after acceptance (a QC rewrite or cue fix), never on every line of the saved text. |

## 3. Files changed

- `dev/tt.jsx`:
  - `_cueInferGenders` (new);
  - `cueAddresseeProblems`, `fixCueAddressees`, `_cuePronounsFor`, `cueClarify`;
  - `jaReplyAcknowledges`, `jaSharesContent`, `JA_ACK_RE` (new);
  - `jaPlaceReplyLines`, `jaBridgeReplyTriggers` (batches; reports unresolved);
  - `finaliseMainTrack`: JA_TEXT_FIX step, FINAL_TEXT_CHECK on every Japanese target line, RESPONSE_CONTEXT_UNRESOLVED invariant and READY reason;
  - `jaTidyRomaji`, `jaWhQuestion`, `matchesJapaneseTarget`, `japaneseFormulaKey`, `jaCueFormProblems`, `jaPragmaticProblems`;
  - `jaHowAreYouReplyFix` and `jaEnglishFaithfulFix` (new);
  - `JA_NATURALNESS_GUIDE` (prompt guidance lines).
- `dev/tests57.js`: new, 50 checks covering the brief's 20 test areas on the live export.
- `dev/tests16.js`, `dev/tests51.js`, `dev/tests53.js`, `dev/tests56.js`: expectations updated only where the brief changed the contract:
  - the version pin now accepts v7xx;
  - はい、分かった after a request is now a valid acknowledgement, so the test uses a reply that really answers nothing;
  - the new romaji joins are accepted;
  - "Ask if she wants pad thai." is accepted.
- `dev/run_all.sh`: adds tests57.

## 4. The ten speaker / addressee errors

All ten are fixed.

- **Fixed now:** 12, 13, 14, 18, 20, 24, 32, 58, 64 and 76. Mai's cues to Ken now say "him / he"; Ken's cue to Mai (13) now says "her / she".
- **Check result:** before the fix the final check found exactly these 10 (it used to find 0). After the fix it finds 0.
- **Other cues:** no other cue changed. A correct cue such as pair 86 ("Ask if he will take the bus…") is left alone.
- **Gender inference:** works only on clear evidence. It needs 僕/俺 or あたし in a speaker's own lines, or "Name … he/she" in a cue, with at least two votes and a 3:1 margin. When the evidence is unclear, nothing is guessed.

## 5. How はい / うん / いいえ are now validated

A reply line is accepted when the line before it is from the other speaker and:

- **it answers a yes/no question;**
- **or はい / うん acknowledge something.** This covers:
  - agreeing to a suggestion (〜よう / 〜ない？);
  - agreeing to a request (〜て);
  - a bare acknowledgement of a statement (分かった / いいよ / そうだね / 大丈夫);
- **or いいえ / ううん reject what was just said about the same thing.** This covers:
  - a shared content word (高いね → 高くない);
  - 大丈夫 after an apology or thanks;
  - まだ after もう… / 〜た？.

A question-word question (どこ / 何 / どう) is never answered with はい / いいえ.

When a reply has no valid trigger:

1. It may be moved only to after a yes/no question about the same thing, unless the reply is bare.
2. Otherwise a short bridge question is written for it, in batches of up to 3.
3. Whatever is still unresolved is listed as RESPONSE_CONTEXT_UNRESOLVED, and the track is not READY.

## 6. Can a failed response-trigger repair still pass?

No.

- A cut-off or unreadable reply is retried one line at a time.
- Anything still unresolved is reported in the log ("⛔ UNRESOLVED …").
- It is counted on the final lines as RESPONSE_CONTEXT_UNRESOLVED, which is a READY-blocking reason.

Tests 6a, 6b, 7a and 7b cover this.

## 7. Romaji fixes (from the export)

| Pair | Before | After |
|---|---|---|
| 69 / 76 / 90 | tabeta ra | tabetara |
| 05 | hima na nda | hima nan da |
| 48 | suki janai nda | suki janai n da |
| 92 | iku nda | iku n da |
| 51 | wakan'nai | wakannai |
| 07 / 26 | shite nai / tabete nai | shitenai / tabetenai |
| 88 | kaettara | unchanged |

Every exported romaji is checked against the validated Japanese (test 20a).

## 8. Target-sense false-positive fixes

- **どっち:**
  - どっちの店もいいね。 is a statement, not a question;
  - どっちの店がいい？ is still a question;
  - どっちかな？ and どっちか分かんない。 practise どっち;
  - どっちかにしよう。 ("either one") is a different word and does not count.
- **どこ:** in お店、どこにあるか分からない。 (an indirect question) it practises どこ.
- **どれ vs どれも:** どれも近いね。 does not practise どれ; どれがいい？ does.

## 9. Is distinct-use QC now meaningful?

Yes, within limits.

- A leading じゃあ / ねえ / でも / それで / あの / あ / え no longer makes a "new" use, so じゃあ、どっちにする？ equals どっちにする？. The exception is when that word is itself the target.
- Real differences stay distinct: どっちにする？ / どっちの店がいい？ / どっちが近い？.
- Repetition is not over-penalised: only a connective or softener at the front is ignored.

## 10. Offline regression results

- tests57 (new, live v699 export): **50/50**.
- Japanese suites: tests16 40/40, tests47 47/47, tests48 24/24, tests50 20/20, tests51 29/29, tests53 24/24.
- Thai suite tests56: 31/31.
- Full regression: **2,010 checks passed, 7 failed** (frozen copy of the combined Japanese + syllabus build, 58 suites).
  - 5 are the long-standing known failures, which also fail on v699: tests33 2G, tests35 2C-th / 2C-zh, tests37 C1, tests39 A5.
  - 2 are tests55 cases 3 and 6. They fail identically on the unchanged v700 code when run today, but passed yesterday, so they are not caused by these changes. They look date-dependent and are worth a separate look.

## 11. 90/90 track integrity

Intact. On the simulated full Japanese track (tests57 16a–18a), the final track has:

- exactly 90 target lines, 3 for each of the 30 selected canonical ids;
- no change to any learner record (status, interval, due date, streak, Known);
- an export whose cues and romaji are those of the final audited snapshot (19a, 20a).

## 12. Expected API cost impact

Small, and only when something is wrong. The live run cost about US$0.098 over 99 requests.

- **Reply triggers:** 10 orphan replies now take about 4 small requests instead of 1 large request that failed. Normally that is +3 requests. When a batch fails, add up to 3 single-line retries.
- **Deterministic rules on every line** (new naturalness rules, the final text check): no model calls. A line that fails goes to quota recovery, and only that one line is replaced (about 1 request each).
- **The pair 02 / 24 / 46 fixes:** free. The English and the いいよ reply are corrected in place.
- **No new paid QC stages.**

## 13. Remaining issues requiring live validation

- A fresh generated Japanese Daily track is needed to see how often the new rules reject lines in practice, and whether recovery stays within budget.
- The けど / あれ / ここでね rules are deliberately narrow and cover the patterns seen in the live export. Other unnatural lines that the judges pass may still exist and need an independent content review.
- Gender inference needs clear evidence. A scene with no 僕 / あたし and no "Ken … he" in any cue still cannot have its he/she cues checked (the check stays silent rather than guessing). A visible "not checked" note in the export would be a sensible follow-up.
- The pair 02 repair answers 今日どう？ with 大丈夫, because いい感じ / 元気 are not on the 10th Kyu list. The prompt guidance now steers generation to 大丈夫 / 楽しい / ちょっと忙しい.

## TL;DR

The ten wrong-addressee cues, the silent reply-repair failure, the romaji joins, the どっち / どれ sense errors, the じゃあ variety loophole and the specific bad lines (02, 24, 34, 46, 67, 85) are all fixed in code. They are proven offline on the live v699 export (tests57: 50/50), and the 90/90 contract and learner data are unchanged. READY now requires the final saved text to pass every deterministic Japanese rule. No paid run or deploy has been done, and teaching quality still needs a fresh track and an independent review before any 8.5/10 claim.
