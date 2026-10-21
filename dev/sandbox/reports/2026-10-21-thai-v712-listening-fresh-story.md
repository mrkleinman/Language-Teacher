# v712 — Thai Listening: a fresh Haiku-written story around the frozen revision words (status report)

Not released. Nothing deployed. `main` still serves v711 (the rejected library version) until the owner decides.

## What the owner asked for (after rejecting v711)
A Listening Track must be a NEW conversation written by Haiku each time, built around the 30 words the Revision selector picks,
frozen before any planning; all words used naturally, closed vocabulary, one coherent story, real QC and repair, SRS preserved with
a bounded, reported deferral, no prewritten conversation in production, honest logging, regression tests. Target: 7.5 / 10 in a
blind review (lowered from 8.5), paid runs approved.

## Why v711 was wrong (root cause)
v711 picked a prewritten conversation from a library first and then took the due words that happened to be in it: the story chose
the targets. The older meaning-first planner went the other way but split the 30 words into fixed 5-turn slots, one word per
turn, with no linking lines, so the result read like a drill.

## What v712 does now (all done, tested, committed)
- **Targets first:** `_buildStandaloneListeningTrackCore` freezes the Revision selector's 30 ids before any model call; the
  library pick is gone from production (the library stays only as test fixtures / a benchmark).
- **Fresh story every time** (`_lnComposeThaiStory`, Haiku):
  1. PLAN — groups the words into situations, links them into one story of 5–6 scenes, names each word's moment; B may play a
     role in a scene (host, staff) so set phrases come from someone who would say them; at most 4 words with no natural place
     may be deferred (reported, still due in SRS).
  2. WRITE — one scene at a time with the whole plan and the conversation so far; deterministic gates (closed vocabulary,
     length, speaker particles, turn-taking, greetings / goodbyes, lesson words present) and up to 2 repair rounds per scene.
  3. EDIT — a strict whole-conversation read (up to 5 rounds) that replaces faulty 1–3-line spans; a fix is kept only if it
     passes every gate and keeps its lesson words.
  4. QC — paid naturalness verdicts and a story-in-scenes coherence judge; flagged lines / scenes rewritten; the best version
     seen is kept.
  5. Best of 2 — a second, different story is written when the first is not rated well; the higher-rated one is kept.
- **Honest status:** a track that fails naturalness or coherence is NOT_READY (never relabelled); every call, token and cost is
  logged; deferred words are listed with their reason.
- **Tests:** `tests64.js` 9/9 — targets frozen before the first story call, ids unchanged, end-to-end READY with 30/30, a second
  request writes a new conversation, a gate failure is repaired, an unnatural line is rewritten, a skipped word is deferred with
  SRS untouched, the planner's deferral is capped at 4 (SRS untouched), no stored-conversation path in production.

## Paid runs on the owner's profile (Haiku, this session)

| Run | Change tried | Result | Cost |
|---|---|---|---|
| S10–S11 | smaller caps | every scene write ran out of tokens in hidden reasoning (no text) | ~US$0.05 |
| S12 | lean prompt (short rules, plain Thai word list) | 30/30, NOT_READY, coherence 2/5 | US$0.06 |
| S13 | each word given a planned moment | **READY**, 30/30, coherence 4/5 — **blind review 5.4 and 5.0** | US$0.07 |
| S14 | B may play a role; best of 2 | NOT_READY (both candidates nearly identical: the server ignores temperature) | US$0.15 |
| S15 | situations first; 5–6 scenes; second story must differ | NOT_READY, coherence 3/5, editor 5/10 | US$0.18 |
| S16 | bounded deferral (≤ 4) | NOT_READY, coherence 3/5, editor 6/10 (no word deferred) | US$0.18 |

Session spend after S16: about US$3.05.

## Where it stands
Quality has plateaued around **5–5.5 / 10**. The blind reviewers' main complaints on S13: story and coherence 3/10 (replies that
do not follow, contradictions, things mentioned before they are set up), lesson words forced into lines, a few wrong collocations
(ทำแผน for วางแผน). The pipeline works end to end; the writing quality is the limit.

Three things together hold it down:
1. **30 unrelated due words in one story.** Several are set phrases (ทุกท่าน, รับอะไรเพิ่มไหม, เชิญนั่ง, ไม่ทราบว่า) or odd
   companions (เลขา, กระป๋อง, กางเกงขาสั้น, ชื่อเสียง); Haiku forces them in.
2. **Closed vocabulary of ~900 words** and lines of at most 7 words.
3. **Short calls.** On this test path a request is cut off at about 30 s, so each call must stay under ~6,000 tokens including
   Haiku's hidden reasoning; the work is split into many small calls, and the whole-conversation editor often runs out of room.
   (The live app's server allows 300 s, so this limit applies to my test path, not necessarily to the owner's browser.)

## Options for the owner
1. **Fewer words per Listening Track** (e.g. 15–20 instead of 30; the rest stay due). Expected to help most: fewer forced
   lines, room for a real story. Owner's decision, since the brief says 30.
2. **Longer calls in the live app** (write the whole conversation in one call and edit it as a whole). Likely better coherence,
   but it cannot be verified from this test path; it would need a test from the owner's browser, or a small server change that
   keeps the connection alive (a deploy — needs approval).
3. **A stronger model for the Listening writer** (the server currently allows Haiku only; the brief says Haiku).
4. **Keep iterating on Haiku prompts** — six runs moved quality little; I do not expect 7.5 this way.

Open question still waiting: roll `main` back from v711 to v710 now, or leave it until v712 is ready?

## TL;DR
v712 now does what the brief asks structurally — targets frozen first, a fresh Haiku story every time, real gates / repair / QC,
honest NOT_READY, bounded deferral, no prewritten content, 9/9 tests — but quality is stuck at about 5–5.5 / 10 in blind review,
not 7.5. The biggest levers are fewer words per track or longer generation calls; both need the owner's decision. Not deployed.
