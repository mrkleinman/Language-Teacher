# v693 live runs of 13 Oct 2026: regression fixtures for v694

These are the owner's v693 Daily exports and logs, copied from Drive folder `1zN7NeVChBrBMe4ssSfZMsBf0avLemE1N`. They are app output only: they contain no learner data, keys or access codes.

## Files in this folder

| File | Drive file id | Used by |
|---|---|---|
| `japanese-track-2026-10-13-daily(3).txt` | 13Wr2MJQVLmTgThrcR29DTqrX59etviaK | tests53 J1–J13 |
| `japanese-gen-log-2026-10-13(3).txt` | 1bcXGwjECJo5uwJgX_ekEEdpm9HO6vDi- | the source of the Japanese false-rejection list (J8–J11) |
| `mandarin-track-2026-10-13(3).txt` | 1nLbpEzDkhW1o0VOvSs-Hxw2DIRYb5eHh | tests53 Z1–Z6 |
| `thai-track-13-Oct-2026-daily(3).txt` | 1T5nduTGaeO9Jutd1bd-FTDLLQjWvP0LL | tests53 H1–H3 |
| `gen-log-2026-10-13T14-47-27.txt` (Thai) | 1yprNfk15VVS9NBdv0tkUtXj6gmjdnGJq | cost baseline |

## Read from Drive, not copied here

I read these in full during the investigation:

- **The Mandarin generation log** (`14HahQKbTkn5LIo0XVIMxFxxvls5bC83r`). It shows that the QC improve step wrote three of the brief's defective lines: 好吧，你去吧。 · 那个慢一点吧。 · 好，我要喝一点吧。
- **The three Listening logs:**
  - Thai: `1Qk_2YphFBJ6Ml62Xr09v4zHafaPyEnLh`
  - Japanese: `1uNquZ1teZww6jzRWNggJLPi6nNUZ_QJM`
  - Mandarin: `1sIktphPYoqFcPrukI-tf_1WWO7PWz2S6`

  Their substance is captured in two places:
  - `benchmark/v692/learners.js`: `V693_IDS` / `V693_DEFERRED`, the selected and deferred target ids of each run.
  - `benchmark/v694/plans.js`: `JA_V693`, the plan Claude Haiku actually returned for the Japanese run.
