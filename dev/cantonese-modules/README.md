# Cantonese (廣東話) word list and modules

Source of the word list: the shared Anki deck "Cantonese (粵語) HSK 1–5 — A Complete Colloquial Adaptation" (ankiweb.net/shared/info/1244813928, 2,501 words, Jyutping). Only the headword, Jyutping, English meaning and part of speech are used as a starting point; the deck's example sentences, audio and images are NOT copied into this repository (`input/` is git-ignored), and every module line is written from scratch.

Romanisation: Yale (converted from the deck's Jyutping by `tools/yale.py`, self-test included).
Characters: traditional (Hong Kong usage), colloquial register.
Belts: the same eleven belts and 2,500-word curriculum as the other languages; the order follows an everyday-use (80/20) classification, see `BRIEF_TAG.md`.

## Status (16 Nov 2026)
- Word list: 2,470 curriculum words (deck words + 500 Hong Kong local-context words + 145 core words the deck lacked), belts by position, ids locked (`id-lock.csv`).
- Modules: 2,995 gap-fill modules in `drafts/ALL-modules.csv` (merge with `python3 tools/yue_merge_modules.py`), checker clean (`python3 tools/yue_check.py drafts/ALL-modules.csv`), independently reviewed (8 reviewers, 648 findings applied or answered), top-ups written for thin words. Three words have no module (穿 睜 當: their English slots cannot sit in a sentence).
- Not yet in the app: language picker, Yale display, Cantonese voice, embedded data and tests are the next step (see the project notes).
