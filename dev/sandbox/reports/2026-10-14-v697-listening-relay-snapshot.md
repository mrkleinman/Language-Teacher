# v697 Listening with Haiku: snapshot of the relay work (paused)

This is a snapshot taken mid-work, at the owner's request ("take a snapshot here for now, we go back to listening later"). Everything here is on the dev branch only. Nothing has been deployed.

## How the runs work

- **The pipeline.** Each run is the real app's `generateCohesiveListeningTrack`, with the v694 learners (`benchmark/v695/plans.js`).
- **The model.** Every model request is answered by its own Haiku agent, through a file queue. Nothing is scripted.
- **The decisions.** The app's own checks, repairs and final story judge decide every outcome.
- **The files.** Every request, reply, log and summary is in `sandbox/haiku-listening-relay-v697/` (runs 3–6), and the relay script is there too.
- **The same caveats as v696 apply.** The agents are not the production API path, and the output cut-off is not enforced.

## Results by run

| Run | Thai | Japanese | Mandarin |
|---|---|---|---|
| 1–2 (v696 report) | not READY / blocked | not READY | blocked |
| 3 | blocked (museum storyline) | blocked (できる + a jump) | **READY** 30/30, 40 turns, judge 4/5 |
| 4 | **READY** 30/30, 40 turns, judge 4/5, 13 calls | blocked: 1 fault left (できる in the shop) | blocked (older build: 2 transitions + 1 wording fault) |
| 5 | **READY** 30/30, 40 turns, judge 4/5 first time, 14 calls | not READY: 30/30, meaning check passed, story judge 3/5 ×3 (the shop scene turned into a food stall to fit できる) | blocked: 1 clipped line, which escalated to a scene rewrite |
| 6 | (not run: Thai READY twice) | stopped at situation 1 | stopped at situation 2 |

- **Thai has been READY twice in a row** (runs 4 and 5), with SRS untouched and 0 new words.
- **Mandarin has been READY once** (run 3).
- **Japanese has not yet been READY.** Its last blocker was できる sitting in the shopping situation. That is now fixed in the planner, and run 6 is the first run on that fix.

## What was changed (all in `tt.jsx`, WIP commits faddf5d … 5196d3f)

1. **A rejected patch gets one corrected retry, in the same round.**
   - What it covers: a repair patch that the hard checks reject for a fixable reason. The reasons are an unknown word, too many lesson words in one turn, a lost lesson word, the wrong turn count, a grammar contract, or one speaker twice in a row.
   - What changed: the model is asked once more, shown the exact reason and its rejected version.
   - Why: before this, the whole round was lost. Japanese run 3 was blocked by one unknown word, そろそろ.
2. **The meaning check and the story judge accept a stated time skip.**
   - A situation may be a later moment of the same day when its first line says what happened in between ("we've seen the museum").
   - Why: Thai runs 2–3 were blocked because the checker kept rejecting exactly the bridge the planner had been told to write.
3. **A re-check judges only what changed.**
   - Unchanged situations keep their verdict, and a situation that passed before is shown as approved with its changed turns marked.
   - Why: Japanese run 4 was escalated to moving lesson words and rewriting whole situations after a one-line fix. The cause was the re-check overwriting earlier passes.
4. **A failing turn verdict is judged again once its situation changes.**
   - Why: a fix three lines earlier ("they make them here") could never clear the cached fail on "ready today".
5. **Speakers alternate.**
   - A patch may not put two of its own turns by the same speaker side by side (Mandarin run 3: A / B / B / A).
   - Each situation's prompt now names who speaks first (Thai runs 4–5 had A twice at a situation boundary).
   - Speaker order never blacklists a sentence. This was a bug found by the new test.
6. **できる is placed where it fits.**
   - How: a word rule can name the situations a word belongs to. For できる these are catching up, eating, and looking around. After normal grouping, such a word is moved, alone, to one of those situations if it has room. Every other word keeps its place.
   - Why: in the shop, できる was never natural. 買うのができる, "できる for a machine", and a bookshop rewritten as a food stall all came from this.
7. **A wording fault never climbs past its exchange.**
   - Why: Mandarin run 5 turned one clipped reply into a whole-situation rewrite, which then failed in new ways.
8. **Language-check false alarms fixed.**
   - **zh:** 到朋友的地方 / 到朋友家 count as places.
   - **zh:** 好，我帮你找。 counts as a reply whose object is understood.
   - **ja:** a できる usage rule, with no unknown example words.

## Tests

- **tests49 (Listening): 93/93 PASS.** New checks:
  - D4b: the corrected retry.
  - D4c: speaker alternation.
  - D4d: 到 + a place.
  - K10b: できる grouped into catching up.
- **Existing checks updated to the new behaviour (not to hide a defect):**
  - K11: the second attempt is now the retry in the same round.
  - Two scripted test plans had their できる exchange in the shop: v692 ja S6 and v694 ja S6. That exchange now sits in S1, with every word still heard and no turns added.
- **tests24 67/67, tests36 28/28, tests38 32/32.**
- **tests35 33/35.** These are the same 2 known failures as before, blocked on missing v673 replay files.

## Still open (for when we come back)

- **Japanese and Mandarin run 6** on the current build. This is the first Japanese run with できる out of the shop.
- **Recurring quality flaws, even in READY tracks:**
  - one stiff line forced by a lesson word (Thai คือ, แก่);
  - Mandarin's clumsy lines (用钱买, 不 answering "it's big").
- **Not done yet:**
  - the full offline regression on this build;
  - an index rebuild and version bump;
  - a release.

None of this is live. Each go-live still needs explicit approval.

## TL;DR

- **Thai:** reached READY twice in a row with Haiku.
- **Mandarin:** reached READY once.
- **Japanese:** close, but not yet READY. Its last blocker (できる in the shop) is now fixed in the planner, and the run on that fix was paused at the owner's request.
- **Eight pipeline fixes, all found from real Haiku runs.** They include a corrected retry for rejected patches, re-checks that judge only what changed, stated time skips, speakers alternating and できる placement. The Listening tests pass 93/93.
- **Everything is on the dev branch.** Nothing is deployed.
