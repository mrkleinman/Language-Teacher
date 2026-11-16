# Addendum: modules for the missing core words (keys C001...)

Read BRIEF_WRITE.md first; everything in it applies. These are the everyday words the deck lacked (想 會 未 呢度 但係 ... ) - the most important words of the whole list, so these modules must be the most natural ones in the set.
- Assignment: `drafts/plan/WC1.csv` (or WC2/WC3). Columns: `cell,tier,words,word_ids,exclude_ids,modules`. For each row write exactly `modules` modules for that (cell, tier).
- Each module fits ONLY the core words of its row: put the row's `exclude_ids` into the module's `exclude_ids` column exactly (you may add more if one core word does not fit a frame). `fits_words`/`cell_words` stay empty.
- Module ids: `<CELL>-<tier>-11`, `-12`, `-13` (numbers from 11 so they never clash with the main set).
- A word of a function type (想 會 未 但係 噉 即係 ...) is usually not a plain slot word: write small modules where the slot word really is the function word in a natural sentence (e.g. 你想{W}... is wrong when {W}=想; use frames like 我{W}飲茶 / 你{W}唔{W}去呀 as appropriate). Where the words of one row cannot share a frame, split the row with `exclude_ids` so that each module fits at least one word and every word gets as many modules as the row allows; list the leftovers in your report.
- Vocabulary: the checker's closed list now contains the core words at their own tier, so 想, 會, 未, 呢度 etc. are allowed in free text from their tier on.
- Run `python3 -I tools/yue_check.py drafts/WCn-modules.csv --quiet` until `problems 0`, render every module for every word it fits and read them.
- Output `drafts/WC<n>-modules.csv`. Touch no other file, do not commit.
