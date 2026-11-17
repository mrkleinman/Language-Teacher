# Brief: gap-fill modules for the Muay Thai topic words (Thai)

You write modules for the Thai part of "Thai Teacher". A **module** is a three-line exchange written ONCE with a slot, usable for every word of one **cell** (a subgroup of words
that can share the same three lines). The app fills the slot for a Daily word, checks the filled Thai against the learner's own vocabulary and offers it as the word's first
candidate. Speakers: **A = a man, B = a woman**, friends in casual, friendly, polite Bangkok Thai. Lines run A1 -> B -> A2 and the slot word appears in EVERY line.

## Why this job exists
The owner added a **Muay Thai topic** (60 words, 12 groups; `topic-muay-thai-words.csv`). 27 of the 60 were already in the bank and have modules. The other **33 are new words**
with **no module at all**: they sit in 15 new cells (tags in `thai-word-tags.csv`, ids 5502-5559). A word needs **3 modules at its own tier** (the repo's coverage rule for a T3-T5 word;
T1-T2 words need 4). Without them a Muay Thai word is written by the model on every Daily track. You write the missing ones: **at least 65 and at most about 112 modules in 8 batches**
(table at the end; the exact assignment line per cell is in `drafts-muaythai/MTnn.csv`).

## Read first (in this order)
1. `thai-modules-handover.md` - sections 3 (tiers, words per line), 5 (rules for the app, English writing rules, speakers) and 6 (known gaps). The rules below repeat what you need.
2. `../thai-guide/thai-speaking-guide-g1.md` - the 41 rules of spoken Thai (questions, particles, who says ผม / ฉัน, classifiers). Follow them.
3. `drafts-muaythai/MT00-sample-modules.csv` - three hand-written sample modules that pass the checker (NOT merged): a body cell with three words, a verb cell with four, a person cell with
   six and a classifier. Open them with `python3 tools/check_thai_drafts.py thai-modules/drafts-muaythai/MT00-sample-modules.csv --render N_PERSONROLE.FIGHT-T4-01`.
4. The example modules named in the `read_first` column of your assignment line (they come from the cells of the new word's bank neighbours: e.g. a shin sits beside knee and calf).

## Your files
- Assignment: `drafts-muaythai/MTnn.csv` (nn = 01..08), one line per cell:
  `batch, cell, tier, word_ids, words, english_slots, classifiers, modules_now, min_modules, up_to, read_first, serve_candidates, constraints`.
  `min_modules` is a floor that assumes every module fits every word of the cell; if a module does not read naturally for one word, that word goes into `exclude_ids` of that module and you write another module
  that does fit it - **every word of the cell must end with at least 3 modules**. `up_to` is the most that can be needed (no module fits two words).
- Output: `drafts-muaythai/MTnn-modules.csv` (UTF-8 with BOM, CRLF) with the header
  `module_id,group,tier,belts,status,job,scene,exclude_ids,fits_words,cell_words,A1_thai,A1_english,A1_prompt,B_thai,B_english,B_prompt,A2_thai,A2_english,A2_prompt,serves_ids`
  - `module_id` = `<CELL>-<tier>-<nn>` with nn = 01, 02 ... (a cell belongs to ONE batch, so ids never clash; the T2 blood top-up continues the merged numbering: `N_BODY.FLUID-T2-04`).
  - `group` = the cell; `status` = ready; `belts`: T2 `Orange+Stripe;Blue;Blue+Stripe`, T4 `Green;Green+Stripe`; `fits_words` and `cell_words` stay empty (the merge fills them).
  - `job` = what the exchange does (ask, tell, offer, plan, complain, react, check, warn, recommend, suggest, praise, compare, decline, request, invite); `scene` = home, work, friends, shop, street, travel, phone, school, restaurant, office, market, family, hospital, temple, cafe, hotel, bank, party, station. Vary both inside a cell.
  - `exclude_ids` = `;`-separated ids of cell words this module does NOT fit. Empty = fits the whole cell.
  - `serves_ids` = see "Other words the module also suits" below.
- Use your own scratch folder for work in progress; touch no other repo file; do not commit.

## Slots (exactly as the older modules)
Thai: `{W}` = the word as written in `english_slots`' list (never changes form); `{CLF}` = its classifier, ONLY when EVERY word the module fits has one (cells with `-` in `classifiers` cannot use it; person and gear cells can: `{W}{CLF}นั้น`).
English and prompts: `{E}` the word, `{Es}` its plural (only when each fitted word has an English plural), `{a}` = "a" / "an" / nothing. Never write "a {E}" or "an {E}" - write `{a} {E}`;
never "{E} is / are", "it / them / this {E}" for a word whose number can change (gloves, sweat, hand wraps have no singular/plural contrast: plural = slot) - rephrase ("my {E} hurts" is fine for fist / shin; for
sweat or gloves use a verb frame that works for both numbers). In VERB cells `{E}` stands only in base-form positions (after to / can / will / let's / please / don't). Never start an English line with a token.
A prompts say "her" (A is a man talking to a woman), B prompts say "him"; one speech act per prompt (Ask / Tell / Say / Suggest / Thank / Check), never a name, never "they". A single-word cell may spell its word out instead of `{E}`.

## The closed vocabulary rule (the heart of the checker)
At tier T a line may use ONLY words that are allowed at tier T or lower in `thai-allowed-words.csv` (rebuilt by `python3 tools/build_thai_allowed_words.py`; `grep "^WORD," thai-modules/thai-allowed-words.csv` tells
the first tier of a word; the file lists the tagged bank words by belt tier plus the glue words the reviewed modules use: ไหน เลย จะ สิ ละ นึง ...). Plus the slot. The checker segments each Thai line into allowed words and refuses
anything it cannot cover ("NOT ALLOWED at T4: ..."). The app then checks the filled module AGAIN against the learner's own vocabulary, so a module built from ordinary bank words is offered to many more learners.
- **None of the 33 new topic words may appear in the fixed text** (they are the slot words; a learner who has not met มวย / ซ้อม / ศอก ... fails the gate). Say กีฬา, ออกกำลังกาย, สู้, เจ็บ, แข็งแรง instead; the 27 older topic words (เตะ เข่า วิ่ง เหนื่อย ...) are ordinary bank words and are allowed.
- Length per line, the slot counts as one word, the end particle does not: T2 4-8 words, T4 7-12 words (T1 2-5, T3 6-10, T5 8-14).
- Tier: a module at tier k fits words of tier <= k only. All 33 new words are T4, so write T4 modules (only the blood top-up is T2). A T4 module is also usable (in the app) for a T5 learner.
- No word from the banned / written-style list of the checker (สามารถ ต้องการ รับประทาน ซึ่ง ... see `BANNED` in `check_modules.py`); no มั้ย / รึเปล่า / เค้า / จ้า; no ดิฉัน.

## Speakers and particles
A (man): ผม, ending ครับ (นะครับ / สิครับ); ONE ครับ per line, at the end. B (woman): ฉัน, ค่ะ for statements and คะ for questions (นะคะ / สิคะ), ONE particle per line, at the end. No romance or flirting between A and B, no insults,
no politics or religion. The first two words of A1 differ from the other modules of the cell (the checker compares).

## Making the three lines natural (this matters most)
- A real mini-conversation about the slot word: A opens (a question, a remark, an offer), B answers or reacts with something real (not only "yes"), A2 answers or follows up. One idea per line.
  Never ask a question and answer it in the same line; the words after the question particle belong to the next speaker.
- The three lines must read naturally for EVERY word the module fits: render them (`--render ID` below) and read each filled line as a learner and as a native. If one word needs a different verb (you do not "train a referee"), put it in `exclude_ids` and write another module for it.
- Use the word in the **topic sense** (below), not a looser one.
- Real scenes, not label sentences: the gym before work, a friend who wants to start, a fight on TV, the weigh-in, the market. Different scene and job per module.
- Do not repeat a line pattern of an existing module of the same cell; and do not copy a line of the samples.

## The words and their senses (use these senses)
- **มวย** boxing as a sport (เรียนมวย, ดูมวย); มวยไทย is Muay Thai itself. **นักมวย** a boxer. **ครูมวย** the boxing trainer at a gym. **เทรนเนอร์** a (fitness / personal) trainer. **กรรมการ** a referee. **คู่ต่อสู้** the opponent. **แชมป์** a champion.
  All six are people (`N_PERSONROLE.FIGHT`, classifier คน): frames about meeting, asking, trusting, respecting, praising, waiting for a person who does a sport or trains others. No frame that only suits one (a referee does not "teach me").
- **ค่ายมวย** a boxing gym / camp (train, join, pay, live there); **สนามมวย** the boxing stadium (watch, tickets, queue, opens at night) - `N_PLACE.FIGHT`, classifier แห่ง.
  **เวที** a stage / the raised platform; **สังเวียน** the ring a fight is held in (step into / up onto, a light above it, the crowd around it) - `N_PLACE.RING`, no classifier.
- **นวม** boxing gloves (a pair), **ผ้าพันมือ** hand wraps (a pair), **กางเกงมวย** boxing shorts, **กระสอบทราย** the punching bag - `N_ITEM.GEAR` (classifiers คู่ คู่ ตัว ใบ). Frames: buy, borrow, forget, bring, wash, dry, price, size, old / new, wear (only if every fitted word can be worn: else exclude the bag).
  Gloves, hand wraps and shorts have no singular/plural contrast in the English slot: phrase around it.
- **ฝึก** to train (over time), **ซ้อม** to practise / spar, **วอร์มอัพ** warm up, **กระโดดเชือก** skip rope - verbs, base form in English (`to {E}`), `V_ROUTINE.TRAIN`. Frames: when and where you do it, with whom, how long, before / after work, being tired afterwards.
- **หน้าแข้ง** shin, **ศอก** elbow, **หมัด** fist (also the punch thrown with it; the slot English is "fist") - body cell `N_BODY.COMBAT`, no classifier. **เหงื่อ** sweat (`N_BODY.SWEAT`, mass noun: no "a sweat", no plural).
- **ต่อย** to punch (the everyday word; a bank word re-tagged into the strike cell), **ชก** to punch / box (the boxing word), **โจมตี** to attack, **น็อก** to knock out - verbs that need someone to hit; `V_HANDLE.STRIKE`. Keep them off real violence between A and B or real people: a sparring partner, a game, a match, "in the ring".
  **หลบ** to dodge (a punch, a ball, the rain, a person in the way; `V_MOVE.DODGE`). **ชั่งน้ำหนัก** to weigh in / weigh yourself (`V_HANDLE.WEIGH`). **แข่ง** to compete / race, **ต่อสู้** to fight / struggle (`V_SOCIAL.COMPETE`). **เชียร์** to cheer (someone on) (`V_SOCIAL.CHEER`).
- **ท่า** a move / technique / stance (`N_ABSTRACT.MOVE`, noun: "a move", "moves"). **น้ำหนัก** weight (`N_ABSTRACT.WEIGHT`, mass noun; "heavy" is หนัก). The blood top-up: **เลือด** (`N_BODY.FLUID`, T2).

## Other words the module also suits (cross-use)
The owner wants the modules used by MORE words of the bank. In the last column `serves_ids` of a module you may list ids (`;`-separated) of words from OTHER cells (same part of speech, tier <= the module's) for which the module
reads just as naturally: the assignment line's `serve_candidates` column proposes the bank words that are short of modules (id, Thai, English slot, tier). Add only ids you read through, filled, and would stand behind;
leave the column empty when unsure. `check_thai_drafts.py` checks the mechanics (same part of speech, tier, classifier, plural, render); the merge writes them as cross-use links (class `author`).

## Validate (run until clean)
```
python3 tools/check_thai_drafts.py thai-modules/drafts-muaythai/MTnn-modules.csv            # problems + the words still short of 3 modules
python3 tools/check_thai_drafts.py thai-modules/drafts-muaythai/MTnn-modules.csv --render MODULE_ID   # the module filled in for every word it fits
```
It must print `0 problem(s)` and no word `SHORT` (or you say in your report which word cannot be done and why). When a word is truly impossible in a cell without breaking the closed vocabulary, say so; do NOT loosen the vocabulary.

## Report
At the end: modules written per cell, any word still short and why, any word where the topic sense made a module hard, the `serves_ids` you added and the ones you considered and refused, and every place you were unsure about the Thai.

## Merge (the owner's session, not you)
`python3 tools/merge_thai_drafts.py --dry-run`, then `python3 tools/merge_thai_drafts.py` (checks again, appends to `thai-modules.csv`, `thai-module-links.csv`, writes author links, regenerates the cross-use links, re-embeds in `tt.jsx`),
then `node build.js tt.jsx tt.compiled.js` and `node tests68.js; node tests99.js`.

## Batch table (65 modules at least, about 112 at most)
| Batch | Cell | Tier | Words (id) | English slot | Classifier | Modules now | Write at least | Up to |
|---|---|---|---|---|---|---|---|---|
| MT01 | `N_PERSONROLE.FIGHT` | T4 | นักมวย (5503), ครูมวย (5504), เทรนเนอร์ (5537), กรรมการ (5541), คู่ต่อสู้ (5550), แชมป์ (5554) | boxer / boxing trainer / trainer / referee / opponent / champion | คน คน คน คน คน คน | 0 | 8 | 12 |
| MT02 | `N_ITEM.GEAR` | T4 | นวม (5507), ผ้าพันมือ (5508), กางเกงมวย (5509), กระสอบทราย (5510) | boxing gloves / hand wraps / boxing shorts / punching bag | คู่ คู่ ตัว ใบ | 0 | 6 | 12 |
| MT02 | `N_BODY.SWEAT` | T4 | เหงื่อ (5559) | sweat | - | 0 | 3 | 5 |
| MT03 | `V_ROUTINE.TRAIN` | T4 | ฝึก (5511), ซ้อม (5512), วอร์มอัพ (5513), กระโดดเชือก (5514) | train / practise / warm up / skip rope | - - - - | 0 | 6 | 12 |
| MT03 | `N_EVENT.BOXING` | T4 | มวย (5502) | boxing | - | 0 | 3 | 5 |
| MT04 | `N_BODY.COMBAT` | T4 | หน้าแข้ง (5526), ศอก (5530), หมัด (5531) | shin / elbow / fist | - - - | 0 | 5 | 9 |
| MT04 | `V_MOVE.DODGE` | T4 | หลบ (5533) | dodge | - | 0 | 3 | 5 |
| MT05 | `V_HANDLE.STRIKE` | T4 | ต่อย (679), โจมตี (5534), ชก (5547), น็อก (5551) | punch / attack / punch / knock out | - - - - | 0 | 6 | 12 |
| MT05 | `V_HANDLE.WEIGH` | T4 | ชั่งน้ำหนัก (5542) | weigh in | - | 0 | 3 | 5 |
| MT06 | `N_PLACE.FIGHT` | T4 | ค่ายมวย (5506), สนามมวย (5538) | boxing gym / boxing stadium | แห่ง แห่ง | 0 | 4 | 6 |
| MT06 | `N_PLACE.RING` | T4 | เวที (5539), สังเวียน (5540) | stage / ring | - - | 0 | 4 | 6 |
| MT07 | `V_SOCIAL.COMPETE` | T4 | แข่ง (5546), ต่อสู้ (5549) | compete / fight | - - | 0 | 4 | 6 |
| MT07 | `V_SOCIAL.CHEER` | T4 | เชียร์ (5555) | cheer | - | 0 | 3 | 5 |
| MT07 | `N_BODY.FLUID` | T2 | เลือด (6025) | blood | - | 3 | 1 | 2 |
| MT08 | `N_ABSTRACT.MOVE` | T4 | ท่า (5536) | move | - | 0 | 3 | 5 |
| MT08 | `N_ABSTRACT.WEIGHT` | T4 | น้ำหนัก (5543) | weight | - | 0 | 3 | 5 |

The blood top-up (`N_BODY.FLUID`, tier T2, word เลือด 6025, 1-2 modules) is the only T2 line: T2 vocabulary, 4-8 words per line, and the opening must differ from `N_BODY.FLUID-T2-01..03`.
