# v683 release candidate — quota table + Mandarin display only

Branch `claude/v683-release-candidate`. It is built from commit 6ccbfad, which comes before any teaching-plan code. The first candidate was ca4453c; the verified equivalent is the commit carrying this note. It adds one release-only correction (below).

## What it contains

- **One new-word table** for Thai, Japanese and Mandarin. ⚠ Thai Mukyu goes from 5 to 3 new words.

  | Rank | Thai | Japanese | Mandarin |
  |---|---|---|---|
  | Mukyu | 3 | 3 | 5 |
  | 10th–9th Kyu | 5 | 5 | 5 |
  | 8th–7th Kyu | 7 | 7 | 7 |
  | 6th–5th Kyu | 10 | 10 | 10 |
  | 4th–3rd Kyu | 12 | 12 | 12 |
  | 2nd Kyu–Shodan | 15 | 15 | 15 |

- **Japanese 10th Kyu** introduces 5 new words, and the track is still 30 targets.
- **Mandarin "Next targets"** shows all 30 words (5 new · 25 review). The generation heading counts 30 too. The "Learn New Words" card is unchanged.
- **Version label v683.**
- **Regression tests:**
  - tests43: Q1–Q5 (quota), D1–D2 (display) and R1 (no experimental code).
  - Seven older checks were updated to the owner's quota table.
  - Five suites' version patterns now accept v683.

## Proof that the generator is v682's, unchanged

1. **Baseline.** Dev commit 5b831e7 builds an index.html byte-identical to the one deployed on main (d2669bc).
2. **No experimental code.** The source, compiled app and page contain zero teaching-plan symbols (tests43 R1).
3. **Recorded live runs replay exactly.** The three recorded v682 live Daily runs replay through this build with every request matching byte-for-byte. Command: `node sandbox/rc_replay_check.js <runs>`.

   | Run | Requests | Mismatches | Unused | Track identical |
   |---|---|---|---|---|
   | Japanese | 99 | 0 | 0 | yes |
   | Thai | 178 | 0 | 0 | yes |
   | Mandarin | 250 | 0 | 0 | yes |

   Any change to prompts, validators, recovery or backups would break this match.
4. **Full offline suite.** `bash sandbox/test_all.sh` reports OFFLINE REGRESSION: OK. The only failures are the long-known exceptions:
   - tests33 2G, present since v677;
   - tests35 2C-thTH / 2C-zhZH, blocked because their replay files are missing.
5. **Browser tests.** The real app passes `sandbox/browser_v683.js` 7/7 and `sandbox/browser_v682.js` 9/9.

**Note:** in the live app, the quota change alters *which* words a Japanese 10th Kyu learner gets (5 new instead of 3). It does not change *how* sentences are generated.

## To release (only after approval)

Build with `node build.js tt.jsx tt.compiled.js && python3 build_index.py tt.jsx build/index-1.shell.html index.html v683`, then copy `dev/index.html` to main's `index.html`.

## Release-only correction (found by the release smoke test)

- **The defect:** on the owner's real Thai device backup, the dashboard rank is **10th Kyu** (White rank test passed, 36 White words still learning). But ca4453c gave this learner the **Mukyu** quota: 3 new words instead of 5. The quota used the strict "every word known" belt, while the belt card, the rank test and the length rules use the rank. A Japanese 10th Kyu learner with a few White words still learning would likewise have got 3 instead of 5.
- **The fix:** `newWordQuotaFor(vocab, lang)` reads the quota from the learner's rank (`rankProgressFor`, the belt card's own resolver). Every quota site uses it: the dashboard line, the Thai selector and its final check, the shared selector and the shortfall report. The strict belt still decides *which* words are drawn.
- **Unchanged v682 behaviour:** a learner whose every White word is still "learning" is offered no new words by v682's belt-priority rule. That remains so in both builds.
- **New checks:**
  - tests43 Q6: rank 10th Kyu with White words still learning gives Thai 5 (dashboard and selector) and Japanese 5 (selector).
  - Release smoke test `sandbox/browser_v683_release.js`: the deployed v682 page and this candidate are opened on identical saved learners. Every stored learner record is compared, along with the dashboards.

## Final verification of the release build

| Check | Result |
|---|---|
| No experimental generator code (source, compiled app, page) | 0 matches; tests43 R1 |
| Recorded v682 live requests replayed | **527 / 527 byte-identical** (Japanese 99, Thai 178, Mandarin 250); identical tracks |
| Release smoke test (`browser_v683_release.js`) | **19 / 19** |
| Mandarin Mukyu learner (35 words met) | Next targets (30) · 5 new · 25 review; Learn New Words unchanged (5) |
| Japanese learner at 10th Kyu | "Introducing 5 new words" (v682: 3); the real selector picks 5 new out of 30 (tests43 Q3 / Q6) |
| Thai Mukyu beginner | 3 new words (v682: 5), the approved policy |
| Owner's real Thai backup (1,644 words, 1 saved track, rank 10th Kyu) | 5 new words, as in v682; the dashboard is otherwise identical |
| Stored learner data (vocabulary / SRS, saved tracks, drafts, settings) | Identical to v682 for every learner after opening. The only differences are the timestamps of v682's own one-time migrations, which both builds run identically. |
| Full offline suite | OK; only the known exceptions (tests33 2G; tests35 2C-thTH / 2C-zhZH) |
| Browser tests | 7 / 7 (display and quota), 9 / 9 (resumable generation) |

## Rollback

- Production is main. The release commit only replaces `index.html`.
- **To roll back:**
  1. Run `git revert <release commit>` on main and push. This restores v682's `index.html` from d2669bc.
  2. Netlify redeploys automatically.
- v682 stays byte-reproducible from dev commit 5b831e7.
- The release changes no stored learner data, so a rollback needs no data repair.
