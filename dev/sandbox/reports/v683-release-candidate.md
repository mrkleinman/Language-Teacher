# v683 release candidate — quota table + Mandarin display only

Branch `claude/v683-release-candidate`. It is built from commit 6ccbfad, which comes before any teaching-plan code. Nothing is merged or deployed.

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
