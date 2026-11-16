# Brief: review proposed core Cantonese words

Input `input/RC1.csv`: 150 candidate core words (word, jyutping, meaning, pos, use_class, tier_hint, group, subgroup, frame, english_slot, english_plural, classifier, confidence, note, why_missing) that the AnkiWeb deck lacks. Each will be shown to the learner with Yale romanisation (converted from your Jyutping) and spoken by a voice from the written word, so a wrong reading, wrong meaning or a word nobody says is a real harm.
Output `drafts/core/RC1-review.csv`, header exactly `word,verdict,jyutping_fixed,english_slot_fixed,tier_fixed,note`, one row per input row, in input order:
- `verdict` = OK / FIX (fill jyutping_fixed, english_slot_fixed and/or tier_fixed) / DROP (not said, wrong, duplicate of a deck word, or duplicate inside the file - say which).
- Check EVERY reading syllable by syllable (standard Hong Kong Jyutping, tone numbers). Check meaning, part of speech, and that english_slot works in "this {E}" / "I want to {E}" / "{E} is so ..." frames for its pos.
- Check tier: T1 = first words a beginner needs in a first month, T2 = common daily words, T3 = later. Fix obviously wrong tiers.
- Six words (咋 咪 埋 都係 啫 吖) are also in the local drafts; mark them OK here but note "dup-local" so the merge removes them from one file.
- Be strict: owner prefers fewer right words to doubtful ones.
- Script-check that every row is answered and every Jyutping in jyutping_fixed is valid. Do not edit any other file and do not commit. Report counts and the 10 most important FIX/DROP decisions.
