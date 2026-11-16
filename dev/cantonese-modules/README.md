# Cantonese (廣東話) word list and modules

Source of the word list: the shared Anki deck "Cantonese (粵語) HSK 1–5 — A Complete Colloquial Adaptation" (ankiweb.net/shared/info/1244813928, 2,501 words, Jyutping). Only the headword, Jyutping, English meaning and part of speech are used as a starting point; the deck's example sentences, audio and images are NOT copied into this repository (`input/` is git-ignored), and every module line is written from scratch.

Romanisation: Yale (converted from the deck's Jyutping by `tools/yale.py`, self-test included).
Characters: traditional (Hong Kong usage), colloquial register.
Belts: the same eleven belts and 2,500-word curriculum as the other languages; the order follows an everyday-use (80/20) classification, see `BRIEF_TAG.md`.

## Status (16 Nov 2026, after the gap fixes)
- Word list: **2,500 curriculum words** (deck words + 500 Hong Kong local-context words + 145 core words the deck lacked, minus 穿 and 睜, which are not Cantonese for what they teach, plus 32 words that had been cut for the local words), belts by position with no gap, ids locked (`id-lock.csv`). 當 is dōng "work as".
- Modules: **4,174 gap-fill modules** in `drafts/ALL-modules.csv` (merge with `python3 tools/yue_merge_modules.py`), checker clean (`python3 tools/yue_check.py drafts/ALL-modules.csv`). **Every word has at least three modules** (the TV01-TV08 top-up, 697 modules, written against `python3 tools/yue_topup_plan.py 8 TV all3`).
- In the app: language picker, Yale display, Hong Kong voice choice, embedded bank and modules, a module-driven Daily and Revision track, tests. Not yet: model-written Cantonese, Listening, Topics, Gen2, quality review (see APP-INTEGRATION.md "Slice 1 status").
