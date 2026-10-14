# v698 build report: Topics + Thai Wedding Speech

Dev branch only. Nothing is deployed, and no paid API calls were made.

## TL;DR

- **Topics is built end to end.**
  - A Topics card now sits on the Thai, Japanese and Mandarin dashboards, where the orange Listening repair banner was.
  - Thai has **Wedding Speech**, with the owner's 50 words in the fixed order.
  - Japanese and Mandarin show "Topics coming soon."
- **One dictionary.** All 50 words are records in the one master Thai dictionary.
  - None of them existed before, so 50 entries were added (ids 5001–5050).
  - They are unranked: no Shodan position, no belt, not Known, not introduced.
  - Learning a word anywhere counts everywhere.
- **A Wedding Speech Track is a normal Daily Track.** Only the new words differ.
  - It takes up to 5 not-yet-introduced topic words in priority order, plus 25 from the global revision queue.
  - It uses no curriculum new words, and generation is the same engine.
- **Unchanged:** regular Daily and Revision selection is identical to the pre-Topics build (same learner, same random seed).
- **Listening repair moved.** It is now offered inside the Listening screen, before any new build.
- **Tests:**
  - New suite (tests55): __TESTS55__.
  - Full regression: __REGRESSION__.
- **Not done:** no live generation was run (paid, needs approval), and nothing is deployed.

## Features implemented

1. **Dashboard Topics card**, in all three languages.
   - It shows an icon, "Topics" and "Learn vocabulary for specific situations".
   - It spans the full width under the Daily / Revision / Listening cards, in the banner's old position.
   - The three track cards are unchanged.
2. **Topics screen.**
   - **Thai:** a Wedding Speech card with the exact description and four live stats: Total 50, Introduced, Not yet introduced, Known. It also has:
     - a progress bar;
     - **View all 50 words**;
     - **Generate Wedding Speech Track**;
     - an "All topic words introduced" note once all 50 are introduced.
   - **Japanese and Mandarin:** an empty-state card, "Topics coming soon.", with no topics, no Thai and no dummy content.
3. **Wedding Speech word list.** All 50 words appear in priority order, under the owner's ten group headings (display only). Each row shows:
   - the number;
   - the Thai;
   - the tone-marked phonetics from the dictionary;
   - the English;
   - a live status: Not introduced, Introduced or Known.

   Tapping a word opens it in the existing vocabulary inspector (Browse), and Back returns to the list. There is no second editor.
4. **Wedding Speech Track.** The Generate button opens the existing Daily Track generator with the topic attached. Its "Scene Ready" screen shows:
   - "💍 Wedding Speech · Daily Track";
   - "5 new topic words + 25 revision";
   - the actual five words chosen, or the all-introduced message.
5. **Provenance** saved on the track:
   - `language: 'th'`, `trackType: 'daily'`, `selectionMode: 'topic'`;
   - `topicId: 'wedding-speech'`, `topicTitle`;
   - `selectedTargetIds`, `selectedNewTargetIds`, `selectedRevisionTargetIds`;
   - `generatorVersion`, `qcVersion`, `topicsVersion`.

   The track's `trackContext` also carries the topic. A partly generated draft (Resume / Study now) keeps the topic too.
6. **Recent Tracks.** A topic track carries a "💍 Wedding Speech · Daily Track" label in the existing list. The player, download, bookmark, convo and SRS buttons are untouched.
7. **Listening repair moved into Listening.**
   - Tapping the Listening Track card first checks for a failed last attempt. If one exists, the screen offers:
     - "Your last Listening Track needs repair · TARGET COVERAGE x/30";
     - **🔁 Rebuild with the same 30 words**;
     - **Build a new Listening Track instead**;
     - Back.
   - The existing History rebuild inside the Listening screen is unchanged.

## Files changed

- **`dev/tt.jsx`** (the app):
  - topic data, the dictionary seed, and the selection functions;
  - the Daily Generator integration;
  - the Topics screens;
  - the Thai, Japanese and Mandarin dashboards and app navigation;
  - Recent Tracks;
  - the ListeningGenerator repair offer;
  - the scene request (an optional topic hint).
- **`dev/tests55.js`** (new): the owner's 36 cases, plus 4 extra checks.
- **`dev/tests24.js`:** V2–V4 now expect the repair in the Listening screen, not on the dashboard. This is the owner's requested move, not a hidden defect. The V4 rebuild check is unchanged: same 30 ids, selector not re-run.
- **This report.**

## How the master dictionary handles the 50 words

- **What a topic is.** A topic is an ordered list of canonical dictionary ids (`LANGUAGE_TOPICS.th[0].vocabIds`). It is not a second word list.
- **How the seed runs.** At load, `seedThaiTopicEntries` runs once for each of the 50 words, in order:
  - If an exact live headword already exists (a retired alias follows to its kept record), it is reused: its id, history and curriculum position are untouched, and only a topic membership tag is added.
  - Otherwise, one record is added with the next id from 5001. It carries the owner's English, tone-marked phonetics in the bank's convention, a usage note for the constructions (ขอให้, ทำให้, ให้กำลังใจ, แม้ว่า, ความรัก, …), `curriculumIndex: 0`, `belt: 'Beyond curriculum'`, `beltOrder: 0` and `topicOnly: true`.
- **Idempotent.** A second run creates nothing (test 4).
- **Existing learners.** The existing load sync appends the 50 as new, unintroduced rows to every saved vocabulary. Every existing record's SRS, Known and bookmark state is identical to the same load on the pre-Topics build (test 3).
- **One state per word.** Introduced, SRS, Known, history and pronunciation all live on that one record:
  - A topic word rated in a Wedding Speech Track is introduced globally, and from then on is a normal revision word (test 33).
  - A topic word learned elsewhere is skipped as "new" (tests 10, 31).

## Existing canonical matches

**None.** All 50 headwords were absent from the dictionary, so 0 were reused and 50 were created.

- The check was on the exact headword.
- A component of a compound is not treated as a match. For example, ทำ is in the bank but ทำให้ is not, and ดี is in the bank but ยินดี is not. This follows the brief.
- The owner's own saved data (the local Thai backup, read locally only and never committed) also has none of the 50.

## No Shodan positions

All 50 have `curriculumIndex 0` and `beltOrder 0`, and no belt's word list contains any of them (test 5).

- Every pre-existing dictionary record is byte-identical to the pre-Topics build (test 6).
- Belt thresholds, rank tests and rank order are untouched.
- Marking all 50 as Known changes neither the rank nor the rank progress (test 24).

## How 5 topic + 25 revision works (`selectThaiTopicTargets`)

1. The selector walks the 50 ids in priority order and keeps the words that are not yet introduced anywhere. It uses the app's one introduction check, `hasBeenIntroduced`, and the normal eligibility checks. It skips words already queued in an unplayed track (the existing Daily safety check).
2. It takes the first 5 as the NEW targets.
3. It fills the rest from the global revision queue, `selectThaiRevisionTargets`, in its existing order (hard → overdue → due → reinforce). This is the same queue a Revision Track uses.
4. It passes the result through the shared Daily freeze (`freezeThaiTargetSelection`) with new-word overflow switched off. A shortfall can therefore never be filled with curriculum new words.
5. The 30 frozen targets go into the unchanged Daily generator. The scene, recalls, QC, final integrity, closed vocabulary, cue clarity, phonetics and Listening hand-off are all the same.

**Edge cases:**
- 3 topic words left → 3 new + 27 revision.
- 0 left → 30 revision, with the "All topic words introduced" state.
- A due topic word that was rated Hard (status still "new", but introduced) is a revision target, never new (test 17).
- Too few revision words → an explicit block: "a Wedding Speech track needs 30 targets … learn more words in Daily or Revision Tracks first (no curriculum word is ever added to make up the number)". No track is started.

**Other rules:**
- Only the 5 selected topic words become legal vocabulary in that track. The other 45 stay locked (test 22).
- The new-word label on the track follows the selector's role, so a due topic word shows as review.
- Topic words never occupy the curriculum's Daily new-word slots.
- A topic draft has its own checkpoint slot, so it never overwrites, or is offered as, a regular Daily draft.
- Topic tracks share the existing 3-tracks-per-day Daily cap.

**Scene:** the scene request for a topic track gets one extra, optional sentence. It asks the model to let the two friends talk about thanking families, memories, promises or the wedding where it is natural, and never to force revision words into it. Regular Daily scene prompts are byte-identical to before (test 26b).

## Regular Daily Tracks are unchanged

- The Daily new-word picker, the slot logic and the Revision selector are unchanged. They now just ignore the 50 unintroduced topic-only words.
- **Proof.** With the same learner and the same random seed, the Daily selection (30 ids) and the Revision selection (30 ids) are identical on the pre-Topics build and this build (test 36). With every curriculum word learned, the Daily picker still never reaches a topic word (test 7).
- **No-topic path unchanged.** Every Generator change is guarded by the topic. With no topic, the code path, prompts and saved fields are the same as before.

## Screens walkthrough (checked in Chromium at phone width)

1. **Dashboard.** The stats and belt card are unchanged. Daily / Revision / Listening are unchanged. **Topics** sits under them, then Lessons.
2. **Topics.** Wedding Speech, its description, the stats (50 · Introduced · Not yet introduced · Known), the progress bar, **View all 50 words** and **Generate Wedding Speech Track**.
3. **Words.** 1 ทุกคน thúk-khon "everyone" · Not introduced … 5 ดูแล duu-laae "take care of" · **Introduced** (for a learner who met ดูแล in a normal Daily Track) …
4. **Generate.** "Scene Ready" with "💍 Wedding Speech · Daily Track · 5 new topic words + 25 revision". For that same learner the five words are ทุกคน, ขอบพระคุณ, พ่อแม่, ความรัก and ต้อนรับ: ดูแล is skipped because it was already learned.
5. **Listening**, after a failed attempt: the "needs repair · 27/30" panel with Rebuild, Build new, and Back.
6. **Japanese and Mandarin dashboard → Topics:** "Topics coming soon."

## Offline test results

__RESULTS__

## Unresolved issues and notes

- **No live generation yet.**
  - What has been proven offline: the Wedding Speech Track runs through the same finaliser and reaches READY 90/90, with the model simulated at the transport boundary.
  - What still needs a real run: real sentence quality for the topic words, especially the constructions ขอให้, ทำให้ and แม้ว่า.
  - Next step: 1 Thai Wedding Speech Track, about the cost of one Daily Track, once approved.
- **The scene hint is new prompt text** for topic tracks only. It is not yet tested live.
- **Learner custom words.** If a learner had added one of these 50 words as their own custom word, they would now have two records for it. The owner's data has none of the 50, so nothing is affected today. A fold-on-load step can be added if that ever happens.
- **Dashboard word count.** The "Words" total on the dashboard rises by 50 (1643 → 1693), because the stats count every dictionary row. Topic words are unintroduced, so Known and Learning do not change.
- **Pre-existing failures,** unchanged from the pre-Topics build:
  - tests35: 2 checks blocked on missing v673 replay files.
  - tests13 I1 failed on the pre-Topics build too, because a model name appeared in the v697 code comments. Those comments are reworded, so I1 now passes.
- **Version.** The app build label still reads v696 (the v697 Listening work did not bump it either). A version bump and index rebuild belong to release prep.

## Deployment

**Pending approval.** Everything is on `claude/session-continuation-check-a19meq`. Nothing has been merged or deployed, and no paid API test was run.

## TL;DR

- **Built:** Topics on all three dashboards; Thai **Wedding Speech** with the owner's exact 50 words; a word list with live status; and a **Wedding Speech Track** on the unchanged Daily engine (up to 5 topic words + 25 revision).
- **Dictionary:** one master dictionary. 50 new unranked entries were added: no Shodan positions, no belt change, and every existing record byte-identical. Learning a word anywhere counts everywhere.
- **Unchanged:** regular Daily and Revision selection is identical to before (proved with the same learner and seed). The Listening repair now lives inside Listening.
- **Tests:** tests55 __TESTS55__; full regression __REGRESSION__.
- **Next:** one live Wedding Speech Track (paid) and deployment, both waiting for the owner's approval.
