# v684 audit: code paths behind the 12-Oct v683 Daily Track defects

Source traced: `/home/user/Language-Teacher/dev/tt.jsx` (41,782 lines; `APP_BUILD_VERSION` in this file reads 'v682' and it carries the Phase-3 teaching-plan code). Every finding below is on the **canonical path** (`TEACHING_PLAN_ACTIVE = false`, line 9378). Any branch guarded by `teachingPlanOn()` is **dead in production**, and I call it out where it matters.
Version constants: `PIPELINE_VERSION`, `GENERATOR_VERSIONS` and `QC_VERSION` are at 19585–19587.
Inputs cross-checked: `scratchpad/v684-inputs/*`.
Offline reproductions (no network): `scratchpad/v684-audit/{zhs,keys,ipa,tone,nani}.js`. Each one extracts the real functions from tt.jsx and runs them.

Pipeline order (all three languages): generation, then per-language QC (`runJapaneseTrackQC` 36335, `runMandarinTrackQC` 4921, Thai `runQualityCheckCore` 30137), then `finaliseMainTrack` 19037. The finaliser runs quota recovery, coherence audit and repair, a text freeze, `adapter.finaliseMetadata` (pronunciation) and the invariants, in that order.

**Labelling note:** the Mandarin header says "PIPELINE_VERSION: legacy (pre-v651)". The cause is that `generateMandarinTrack` (4666) and its caller never set `track.pipelineVersion` or `generatorVersion`. Only Thai (9195, 27359) and Japanese (37628) do. The header (19817) then falls back to the legacy label. The track still has a `trackContext`, so `_v651` (19171) is true and the canonical finaliser ran. This is a cosmetic or provenance defect, not a different code path.

---

## 1. Japanese reading/romaji: pair 91 「どこか行くの？」→ どこかいきの / dokokaikino, pair 48 何にも → なににも

### Where Japanese readings come from

| Line type | Producer | What fills `reading` |
|---|---|---|
| Target recalls (pair 48) | `generateTargetGroup` 40385 → `japaneseTargetGroupAdapter.evaluate` 40665 → `jaEvaluateRecallCandidate` 40269 | The **model's own `reading`** from the group JSON (schema `JA_RECALL_SCHEMA` 40011). It is kept as-is whenever `structuralValidateJapanesePair` (38973) passes. |
| | `jaRepairPairStructure` 39000 / `rebuildJapaneseReadingPipeline` 34686 (both use `jaReadingForWord` 34679) | Run **only if** the structural check fails (40309–40311). Deterministic, from the inventory. |
| | `jaModelReadingRepair` 40655 (stage J_romanisation) | Paid fallback, **only** for derived-field failures (`repairDerived`, 40702). Used once in this run (時間). |
| | `jaFallbackRecall` 39689 → `jaReadingFromInventory` 39615 | **Only** deterministic fallback recalls (11 of 90). |
| Framing lines (pair 91) | `generateJapaneseScene` 38889 → `jaFramingPair` 38957 | `closing_reading` / `closing_romaji` **verbatim from the scene model JSON** (prompt fields at `buildJapaneseConvoPrompt` 6118, line +54). With `jaContextualOpeningRepair` 38932, the repair model's `reading` instead. No segments, no structural validation. |

Code that produced the defects:

- **Pair 91:** the scene model wrote `closing_reading = "どこかいきの？"`. The closing passed `japaneseCheckLine` (5862, closed vocabulary only), so it was never repaired; the log shows only opening, reply and closing_reply being repaired or dropped. `jaFramingPair` copied the reading as-is:
  ```js
  reading: reading || '',
  phonetic: romaji || '', romaji: romaji || '',
  _source: 'ja:scene', _target: kind, _framing: true,
  ```
  At finalisation, `_jaFinaliseMetadata` (20855) found that the model's romaji (presumably "doko ka iku no?") did **not** match the bad reading. It **rewrote the romaji from the reading** instead of flagging the line. The framing pair has no segments, so it took the `kanaToRomaji` branch, which emits no spaces. That is exactly how "dokokaikino？" was produced (reproduced: `kanaToRomaji('どこかいきの？') = 'dokokaikino？'`).
  ```js
  // 20874-20875
  const sentOk = romajiMatchesReading(q.romaji || q.phonetic, q.reading) || (segsGood && ...)
  if (q.reading && !/[一-鿿]/.test(q.reading) && !sentOk) { q.romaji = segsGood ? segRomaji : kanaToRomaji(q.reading); q.phonetic = q.romaji }
  ```
  `runJapaneseTrackQC` does the same (36381–36386: "romaji derived from reading → fixed"). **The reading is treated as ground truth everywhere.**

- **Pair 48:** this is the model's reading, and it passed `structuralValidateJapanesePair`, which checks only kana-only reading, romaji↔reading, and that segments reconstruct the surface. Worse, the v682 何 rule **enforces** なに here. `jaNaniReadingFor` (20817) returns なん only before で/の/と/だ/な/counters, so `にもないよ` yields なに. `jaFixNaniReading` (20820, called from `_jaFinaliseMetadata` 20860 and from `auditJapaneseReading` 34761) would have rewritten a correct なんにも into なににも. Reproduced offline: input `なんにも` came out as `なににも` with `fixed: 1`.
  ```js
  function jaNaniReadingFor(following) {
    return /^(でも|で|の|と|だ|です|な|[時人回個年月日歳分本枚匹杯度階週])/.test(String(following || '')) ? 'なん' : 'なに'
  ```

### What should have caught it, and why it passed

- `auditJapaneseReading` (34756) is the only check behind "PRONUNCIATION ALIGNMENT" (`_jaFinaliseMetadata` 20881 → `meta.alignmentIssues` → invariant at 19141). It checks: reading present; 何 なに/なん (which actively endorses なににも); no slash alternatives; no kanji left in the reading; no kana in the romaji; and romaji == `kanaToRomaji(reading)`. Because the finaliser had just re-derived the romaji from the reading, that last test is a tautology. **Result: 0 issues.**
- `japanesePronunciationAlignment` (21231) is used only by **Listening** (`japaneseListeningPronunciation` 21274; `LISTENING_ADAPTERS.ja.pronunciationProblems` 21330). It is never used on the Daily main track, and it also only wraps `auditJapaneseReading` plus script-purity checks.
- `validateJapaneseContextualReading` (34817) and `validateJapaneseReadingOutput` (34802) (both inside `japaneseAcceptanceGate` 39403) check script purity and slash alternatives only.
- **Confirmed: nothing compares the reading with the kanji sentence.** There is no check that the sentence's own kana (どこか, く, の) appear in the reading in order, and no comparison against a dictionary-derived reading. A deterministic comparator already exists: `jaDeterministicReading` (21188, segmentation → dictionary → morphology). It is used **only** for Listening. `jaReadingFromInventory` (39615) and `rebuildJapaneseReadingPipeline` (34686) could also have produced a reference reading to diff against, but they are only used as repair fallbacks.
- **Framing lines are a separate, almost unchecked path.**
  - They are excluded from `aiQcPromptMatch` (`!p._framing`, 34998–35001), from `aiQcGroups` (35198) and from coherence (`mainCoherenceSections` 19287 keeps `classifyTrackPair(p) === 'TARGET'` only).
  - They are excluded from TARGET_VARIETY and from `finalDuplicateAudit` (TARGET only).
  - Their only gate is `japaneseCheckLine` (closed vocabulary). **No model or deterministic check ever looked at the pair-91 reading.**

---

## 2. Mandarin pinyin and spoken pinyin

### Producers

- **Dictionary (sentence) pinyin:** the model's `pinyin` from `generateMandarinOneRecall` (4349), set at 4491 via `tidyPinyin(cand.pinyin)`. Generation-time validation is `validateMandarinPair` (3760). Its only pinyin rule is `validateMandarinPinyin` (≈3203), a **character-class / format** check (tone marks present, no hanzi or kana).
- **Segment pinyin:** corrected from the lexicon (`inv.lexicon`, built by `mandarinLexicon` 3139, `MANDARIN_EXTRA_LEXICON` 3105 with `一下 'yíxià'`; bank `一点 'yìdiǎn'` at 3003). This happens at 4496 and again in `runMandarinQualityCheckCore` (4859, segment loop ≈4880). **The sentence pinyin is not rebuilt from the corrected segments.**
- **Spoken pinyin:** `mandarinSpokenPinyin` (3244), called at 4493, 4900, 20914, 35472/35490 and 37759:
  ```js
  // 3252-3257
  for (let k = 0; k < words.length - 1; k++) {
    if (toneOf(words[k].p) === 3 && toneOf(words[k + 1].p) === 3) {
      words[k].p = words[k].p.replace(TONE3, m => T3_TO_T2[m] || m)
  ```
  `toneOf` (3225) tests tone 1, then 2, then **3 (any ǎěǐǒǔǚ anywhere in the token)**, then 4. Tokens are whitespace-split pinyin *words*, not syllables.

### Why each case is wrong (reproduced offline in `zhs.js`)

| Case | Output | Root cause |
|---|---|---|
| 有一点 `yǒu yìdiǎn.` → spoken `yóu yìdiǎn.` | wrong | `toneOf("yìdiǎn.")` returns **3**, because the ǎ in the second syllable wins over the leading ì (tone 4). So 3+3 fires on 有. The lexicalised `yì` already encodes 一 sandhi, so no change was due. |
| 我们一起… `wǒmen yìqǐ` → `wómen yìqǐ` | wrong | Double bug. (a) `toneOf("wǒmen")` = 3 although its last syllable 们 is neutral. (b) `toneOf("yìqǐ")` = 3 because of ǐ. Correct is `wǒmen yìqǐ` (a neutral tone blocks the 3-3 rule). |
| 你等一下 `nǐ děng yī xià` → `ní děng yī xià` | 一 unchanged, 一下 split | `ní děng` is correct 3-3 sandhi. But **there is no 一 sandhi at all** (only 不, at 3248, and 3-3; grep finds no 一 rule). The sentence pinyin `yī xià` is the model's: the segment for 一下 was corrected to `yíxià` (the export BREAKDOWN shows `一下 yíxià`), but the line was not. See the final check below. |
| 可以 lines: no SPOKEN line | omitted | The 3-3 rule only runs **between** tokens, so `kěyǐ` (one token) is never changed internally. `kěyǐ ma?` and `xiànzài kěyǐ qù` therefore produce spoken == dictionary. The export prints SPOKEN only when it differs: `if (p.spokenPinyin && p.spokenPinyin !== p.pinyin)` (36613). Also, `nǐ kěyǐ zǒu` yields `ní kéyǐ zǒu` only by accident, because `.replace(TONE3, …)` is non-global and hits the first ě. |

Policy inconsistency: the lexicon stores some words with sandhi already applied (`一点 yìdiǎn`, `一下 yíxià`, `一起 yìqǐ`) and others in citation form (`可以 kěyǐ`, `你好`). So "dictionary" and "spoken" pinyin mean different things from word to word.

### Checks that should have caught it

- `_zhFinaliseMetadata` (20887) is the source of the Daily "PRONUNCIATION ALIGNMENT". It calls `runMandarinQualityCheckCore`, then `validateMandarinPinyin` (format), segments-reconstruct, and every Han segment has pinyin. Its "sentence pinyin equals its words" test **strips tone marks**:
  ```js
  // 20909-20911
  const N = x => String(x || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/gi, '').toLowerCase()
  ...
  else if (N(hanSegs.map(s => s.pinyin).join('')) !== N(q.pinyin)) {
  ```
  So `yíxià` (segment) vs `yī xià` (line) compares as `yixia == yixia` and passes. **No tone, and no spokenPinyin, is ever validated anywhere.**
- `runMandarinQualityCheckCore` (4859): pinyin is only re-derived when `validateMandarinPinyin` fails (format). Segment corrections are logged as "fixed" in `runMandarinTrackQC` (4949–4954), while the line pinyin stays stale.
- `LISTENING_ADAPTERS.zh.pronunciationProblems` (21346) is a **Listening-only** adapter. It filters core issues matching `/pinyin|tone/`, but the core never emits tone issues, only `pinyin: <format reason>`. It does not run on Daily tracks.
- The AI judges never see pinyin. `aiQcEvaluateGroup` formats `speaker: sentence (english)` only (35111), although it offers a `fix_pronunciation` action.

---

## 3. Thai phonetics: แล้ว "lâeo", หน่อย "nàwi", โกรธ "krôot"

### Where the final PH comes from

`_thFinaliseMetadata` (20560) runs after the text freeze:
1. Broken lines (IPA, Thai script, untoned) are recomposed with `composeThaiPhonetic` (12798) from the lexicon. The log shows 84 lines.
2. `_qrFixBrokenPhonetics` (32399) is a model re-romanisation, but only for IPA / Thai / untoned / double-conversion. **It never triggers on a wrong tone.**
3. `thaiFinaliseWords` (segmentation).
4. **`finaliseThaiTrackPhonetics` (12828)**: every token the lexicon knows gets `lex.get(th)` (12860, `_phSrc: 'canonical'`).
5. `thaiFinalPronunciationAudit` (12905) and a bounded model repair.

The lexicon is `buildThaiPhoneticLexicon` (12771). **The canonical bank `RAW_VOCAB` (line 60) is loaded first**, and the reviewed function-word table can only fill gaps:
```js
// 12777, 12780
if (!lex.has(d.t)) lex.set(d.t, loadCanonicalThaiPhonetic(d.ph))
Object.entries(extra || THAI_FUNCTION_PHONETICS).forEach(([k, v]) => { if (!lex.has(k)) lex.set(k, v) })
```

Bank entries (parsed from line 60):

| Word | Bank entry | Notes |
|---|---|---|
| แล้ว | `ph:"lâeo"`, qcStatus `NEEDS_REVIEW` | This shadows `THAI_FUNCTION_PHONETICS['แล้ว'] = 'láaeo'` (12789). `LEXICALLY_INVALID_STATUSES` (31555) excludes only INVALID_FRAGMENT and RETIRED_PENDING_MIGRATION, so NEEDS_REVIEW entries are canonical. |
| โกรธ | `ph:"krôot"`, `NEEDS_REVIEW` | Wrong tone. |
| หน่อย | `ph:"nɔ̀i"` (IPA) | `loadCanonicalThaiPhonetic` (32326) → `fixIPAPhonetic` (32361) maps ɔ̀ to "àw" and keeps the trailing i, giving **"nàwi"** (reproduced in `ipa.js`). |

So the PH field is **deterministic, from the bank**, not model output. The model is not to blame for these three.

### What the audits compare

- `thaiPronunciationLineAudit` (13071) compares the PH line with the line the tokens produce. Each token's expected value is `w.ph || lex.get(t)` (13096), which is the same lexicon that produced the line, so it is circular. The comparison goes through `thaiPhoneticMatchKey` (13133), which **drops tone diacritics and collapses vowel length**:
  ```js
  .normalize('NFD').replace(/[̀-ͯ]/g, '')   // drop tone diacritics
  .replace(/[^a-z]/g, '')
  .replace(/([aeiou])\1+/g, '$1')                      // khawng == khaawng
  ```
  So even `lâeo` vs `láaeo` would match (`laeo`).
- `thaiFinalPronunciationAudit` (12905): stale-text rebuild, a local re-segmentation when expected tokens are missing, then `thaiPronunciationLineAudit`. Same blind spot.
- **A deterministic Thai tone engine exists and is never consulted on the final line.** `calcThaiSyllableTone` (31447, with `_thCls` and the consonant tables ≈31432) returns **high** for แล้ว, **low** for โกรธ and **low** for หน่อย (reproduced in `tone.js`). It is only reachable through `correctVocabPhonetic` / `thaiPhoneticToneAdvisory` (32332, "VALIDATOR, not a mutator"), and nothing in the canonical path calls the advisory.
- The model group judge `_qrEvaluateGroup` (32545) offers `fix_phonetic`, but it is shown only `speaker: thai (english)`, never the romanisation. It cannot see a wrong tone.

---

## 4. Thai target sense: หลัง ("after / back") taught three times as the house classifier

### The generation prompt itself asks for the classifier

`generateWordLines` (14822) is called by `generateConversationTrack` (16107) at 16271/16305. `_usageHint` (14934) resolves to the classifier guide for หลัง, because `thaiClassifierGuideFor` (31856) returns the guide unconditionally when the teaching plan is off:
```js
// 31858
if (!g || !teachingPlanOn()) return g || null
// THAI_CLASSIFIER_TARGET_GUIDE 31934
'หลัง': 'หลัง counts houses and buildings: บ้านหลังนี้ (this house).',
```
The hint is used at 14993 (`if (thaiClassifierGuideFor(target)) return thaiClassifierGuideFor(target)`), so **LINE 1** of the prompt (15038) says: "LINE 1 (A): หลัง counts houses and buildings: บ้านหลังนี้ (this house) — … MUST contain the Thai word "หลัง"".

The same prompt also contains the gloss (15046): `'INTENDED SENSE of "หลัง": after / back'`. That comes from `thaiTargetSenseInfo` (20375); `THAI_SENSE_POLICY` (20182) has no หลัง entry, so it falls back to the gloss. **The two instructions contradict each other.** The comment at 31850–31853 documents this exact v682 failure and says it was fixed, but the fix (`thaiTpNotSense`, `thaiTpSenseProblem`) is behind `teachingPlanOn()`.

### The checks, and why the classifier use passed

- **Presence:** `thaiTargetPresent` (20056) → `thaiTargetConceptPresent` (20012). This is a surface/segmentation test: หลัง is a standalone token in บ้านหลังนั้น, so `STANDALONE` is present. There is no part-of-speech or sense test. `validateSmartPairs` (14098) checks presence **per group** (`_grp.some(...)`, 14135).
- **Deterministic sense rejection:** `thaiTpSenseProblem` (31903) is invoked only as `teachingPlanOn() ? thaiTpSenseProblem(...) : ''` (14137, 16651, 20520). It is **dead in production**.
- `thaiLexicalSenseProblems` (30964) is a fixed list. Its `CLASSIFIER_MISMATCH` rule uses `THAI_NOUN_CLASSIFIER` (31938), which maps `'บ้าน': 'หลัง'`. So the check **confirms** บ้านหลัง… as correct Thai.
- **Model sense check:** `_finalNaturalnessJudge` (30478) via `finalPairSemanticAudit` (30646). The early gate (16228) is the first to judge these lines. It receives `Target word: หลัง — intended sense: after / back` (`_naturalnessPromptText` 30459) and may set `wrongSense`. It returned natural / not wrongSense; the log shows `TARGET_GROUP_ACCEPTANCE … หลัง 3/3 PASSED`. That verdict is cached on the pair (`_semVerdicts`, `_semCacheKey` 30534) and **reused** by the later 'main' audit (30289) and by every subsequent stage, because the text did not change. So one lenient judgement at generation time was the only sense check.
- `_qrEvaluateGroup` (32545) receives only the target word, not its sense, and returned "✓ หลัง" (log line 707).

---

## 5. Japanese speaker vs cue: pair 4, SPEAKER B (Yumi), cue "Ask Yumi if she's coming soon."

### Where the speaker and cue are assigned

- **The cue is written by the model** (`englishCue`), at a point where the model does not know who will speak the line. On the canonical path, `buildJapaneseGroupPrompt` (40598) gives no speaker; `jaTpSpeakersLine()` is only added under `teachingPlanOn()` (40624). What it does give is `THIS SCENE: Kenji and Yumi bump into each other…` (local premise), which invites cues that name the characters. If the cue is empty or contains Japanese, it is rebuilt as "Say: <english>" (40699–40701).
- **The speaker is assigned afterwards, by position.** The model's `l.speaker` is defaulted to `'A'` at 41001. Then `assembleRecallsByScene` (16092) overwrites it by alternation inside each scene:
  ```js
  // 16100
  inScene.forEach((p, k) => { p.sceneId = sc.sceneId; p.scenePurpose = sc.purpose; if (c.alternateSpeakers) p.speaker = k % 2 === 0 ? 'A' : 'B'; out.push(p) })
  ```
  This is called with `alternateSpeakers: true` at 41029. Coherence repair keeps the *old* line's speaker for JA/ZH (19499).

### Validation of the cue, and why nothing compares addressee with speaker

- `jaCueFormProblems` (40243) runs in `jaEvaluateRecallCandidate`, **before** the speaker exists. It checks only question vs statement and desire (たい/欲しい) vs "want". There is no person or addressee logic.
- `aiQcPromptMatch` (34997) is shown only `Cue / Japanese / English`: no speaker, no character names. Its prompt explicitly tells the judge to ignore person differences:
  ```js
  // 35029
  'DIALOGUE RULE: cues are written in the third person ("Ask whether they...") while the sentence is ' +
  'naturally first/second person. That is CORRECT and never a mismatch. Only penalise a real ' +
  ```
  Despite that, it scored this pair **3/5** ("cue asks about a third person ('Is Yumi coming?')"; QC log "Pair 1", in pre-finalisation numbering). The 3/5 band is **auto-accepted**:
  ```js
  // 35255-35257
  if (v.score === 3 && !(all[i] && all[i]._fallback) && !QC_SENTENCE_DEFECT_NOTE.test(v.note || '')) {
    const iss = addIssue(i, 'promptStyle', 'cue could be clearer (' + v.score + '/5)' + ..., 'found')
    if (iss) { iss.status = 'accepted'; iss.acceptReason = 'minor cue phrasing (3/5): the intended learner response is still clear — kept' }
  ```
  Also, an unscored verdict counts as 5 (`score: s || 5`, 35043).
- Thai, by contrast, has `THAI_CUE_PERSPECTIVE_RULE` (30487) and `thaiCueSpeakerLine` (30492) in `_finalCueJudge`, with a ≥4 threshold. **There is no Japanese or Mandarin equivalent, and no deterministic check that a name in the cue equals the speaker's own name** (grep for addressee checks finds nothing).

---

## 6. Same-use repeats pass "TARGETS_WITHOUT_3_DISTINCT_USES = 0"

**Computation:** `finaliseMainTrack` 19148–19163 builds one key per target pair and counts distinct keys:
```js
const keyOf = x => adapter.lang === 'ja' ? japaneseFormulaKey(x, surf) : adapter.lang === 'zh' ? zhAskOrSay(x) + '|' + zhApplicationKey(x, surf) : recallVariationKey(x, surf)
const keys = new Set(ps.map(p => keyOf(adapter.sentenceOf(p))))
if (ps.length < 3) _missing.push(...) else if (keys.size < 3) _short.push(...)
```
It is **diagnostic only**. `inv.TARGETS_WITHOUT_3_DISTINCT_USES` (19162) is never pushed into `reasons`, so it can never block READY.

**Japanese 分かる** (reproduced in `keys.js`):

| Recall | Key |
|---|---|
| `ああ、分かるよ。` | `answer|あ<T>` |
| `うん、分かるよ。` | `answer|<T>` |
| `いや、まだ分からないんだ。` | `answer|まだ分からないんだ` |

That makes 3 "distinct" keys. Root causes:
- **Alternation-order bug:** in `recallVariationKey` (18656) at 18658, `^(え|あ|ねえ|ああ|…)` matches the single `あ` before trying `ああ`, so only half of ああ is stripped. `japaneseFormulaKey` (5940) strips うん/はい/いや but not ああ.
- The surface split `split('分かる')` does not normalise conjugations, so 分からない always yields a different key.
- The generation-time verdict (`japaneseFormulaVariationVerdict` 5962, 40340; `japaneseVariationVerdict`) uses the same key, so it has the same blind spot.

**Mandarin 等:** `你等我一下。` gives `say|<T><P>一下`; `你等一下，好吗？` gives `ask|<T>一下好`; `你等一下。` gives `say|<T>一下`. That is 3 keys. `zhApplicationKey` (4320) strips only a **leading** pronoun. The object 我 becomes `<P>` and is kept, so "wait (me) a moment" counts as a new use. The generation guard (4448–4453) uses `_recoveryConstructionKey` (18665), which gives `<T>我一下` vs `<T>一下`, and the same function key, so it also passes. That guard is skipped entirely for the deterministic fallback ("never enforced on the deterministic fallback", 4454).

**Model judge:** the canonical `aiQcEvaluateGroup` (35106) tells the judge `'The learner is a beginner: simple repetitive sentences are GOOD and should be "clean".'` (35125). The QC repair prompt for Japanese (`japaneseQcEngine.allowedVocabularyLine`, 35387, at 35410–35412) says "repeat a correct one … Correct repetition beats invented nonsense". Both contradict the 3-distinct-uses goal. The stricter per-sentence judge (`tpJudgeGroup`) is teaching-plan only (35107).

---

## 7. Model-based judges on the final v683 track

| Judge | Line | Language | Sees | Outputs | Pass threshold | When it runs |
|---|---|---|---|---|---|---|
| `generateJapaneseScene` closed-vocab loop | 38889 | ja | n/a (deterministic `japaneseCheckLine` on framing) | | | Scene stage only |
| `aiQcPromptMatch` (E_cue_check) | 34997 | ja, zh | Per pair, batches of 12: cue + sentence + English. **No speaker, no pronunciation, no context.** Temperature 0.7 (default 8873). | score 1–5 + note | ≥4 pass. **3 accepted** unless the pair is a fallback or the note names a sentence defect. ≤2 sends the group to the repair ladder. Missing score counts as 5. | QC, before finalisation. Also inside zh/ja quota and coherence recovery (via `runMandarinTrackQC` / `runJapaneseTrackQC`, H_recovery). |
| `aiQcEvaluateGroup` (C_group_eval), canonical branch | 35106 | ja, zh | The target's 3 sentences + English, with 3 lines of context before and after (speaker, sentence, English). **No cue, no reading/pinyin, no target sense, no register.** Attempt 1 at temperature 0.7, attempt 2 schema at 0.2. | `clean` / `fix_pronunciation` / `improve` / `replace` | Only `clean` passes. "simple repetitive sentences are GOOD". | QC, before finalisation |
| `aiQcRegenerateGroup` (G_improve / G_replace) | 35150 | ja, zh | Generator, not a judge. Output re-validated deterministically (`engine.validatePair`). **Not re-judged** on canonical (the re-judge is teaching-plan only, 35341). | | | QC repair |
| `_qrBatchPromptCheck` | 31391 | th | Prompt + Thai | `_pm` 1–5 | `_pm ≤ 3` leads to a group "improve" verdict (30213) | Thai QC |
| `_qrEvaluateGroup` | 32545 | th | Group lines (speaker, Thai, English) + context; target word only, no sense, no romanisation | `clean` / `fix_phonetic` / `improve` / `replace` | `clean` | Thai QC |
| `finalPairSemanticAudit` = `_finalCueJudge` + `_finalNaturalnessJudge` (+ `thaiControlledAdjudication` 30556) | 30646 / 30498 / 30478 | th | **Cue judge:** prompt + Thai + English + speaker-perspective line. **Naturalness judge:** Thai + English + previous line + speaker + target sense. | cue s 1–5 (+ `thaiEnglishMatch`, `cueRepair`); naturalness s 1–5, `wrongSense`, issue | cue < 4: repair (`thaiCueRepairDecision`) or drop. Naturalness < 4 or `wrongSense`: drop. | Early gate (16228/16283), QC 'main' (30289), 'rescue', quota and coherence recovery (20547). **Verdicts are cached per text (`_semVerdicts`), so later runs reuse the early verdict.** |
| `mainTrackCoherenceAudit` (F_main_coherence `judge`) | 19326 | all | Per scene section: purpose, local premise, target words + gloss, lines as `L# speaker: English`. **No target-language text, no framing lines.** | per-section score, coherent, offTopicLines, premiseFitsTargets, suggestedPremise; overall | No section ≤ 2 (`MAIN_COHERENCE_SCENE_FAIL_AT`) and overall ≥ 3 (`MAIN_COHERENCE_THRESHOLD`, 19268–19269). A third judgement on verdict flips. | Inside `finaliseMainTrack`, **before** the text freeze |
| `_qrFixBrokenPhonetics` (re-romaniser) and the Thai pronunciation repair pass | 32399 / 20640ff | th | Pronunciation only; Thai text mutation is guarded | | | After the freeze |
| `jaModelReadingRepair` | 40655 | ja | Derived-field repair at generation | | | Generation |

**Is anything re-checked on the frozen final lesson?** No model judge runs on the frozen text. `finaliseMainTrack` freezes the text at 19117. After that it only runs `finaliseMetadata` (pronunciation), deterministic audits (quota, length `complexityAudit`, `finalDuplicateAudit` 19009, TARGET_VARIETY), and status readers: `thaiSemanticAuditStatus` (30764), which reads stamps and detects text changed after the audit, and `_jazhQcStatus` (20924), which reports `semantic: 'COMPLETE'` whenever `qcRan`.

Every model verdict therefore predates at least one of the following:
- **(a) quota recovery.** Recovered pairs are judged by the recovery QC. For ja/zh that is `runJapaneseTrackQC` / `runMandarinTrackQC`; for th it is `finalPairSemanticAudit` 'quota-recovery'.
- **(b) premise replan and re-clustering** (`replanLocalPremises`, `reclusterFailingScenes`). These change scene metadata only, with no re-judging.
- **(c) coherence repair lines.** These are judged by recovery QC, but the coherence re-audit sees only English.
- **(d) speaker re-assignment by position** (16100). The cue judge never sees the speaker anyway.
- **(e) the pronunciation rebuild** (`_jaFinaliseMetadata`, `_zhFinaliseMetadata`, `_thFinaliseMetadata`). This is never judged.

Framing lines are never model-judged in any language.

---

## 8. Mandarin used 255 requests

The log breakdown: 90 A_generation + 110 B_generation_retry (both `generateMandarinOneRecall`) + 10 H_recovery + 30 C_group_eval + 8 E_cue_check + 6 G_*, plus 1 F_main_coherence.

The retry loops and their limits:

1. **`generateMandarinOneRecall` (4349).** This is **one request per recall**; Japanese uses one request per target group. The loop is `for k = 1 … rules.maxTiers` with `rules = mandarinScarcityRules(inv)` (3352). The learner is at level C, where `maxTiers: 11` (3350). That allows **up to 10 paid attempts plus 1 deterministic fallback per recall**. Japanese caps paid attempts at `JA_GENERATION_BUDGET.maxPaidAttemptsPerRecall: 3` (39929); Mandarin has no such cap.
   - The ledger cap `RECALL_MAX_CHECKS = 11` (11142) is shared across generation, recovery and quota phases (`L.remaining`, 4369).
   - Early exit: `REJECTED_CANDIDATE_REPEAT` (4442) jumps to the fallback only when the **same sentence** is rejected twice for the same reason.
   - The rejection mix for this run: already used for another target ×38, untaught ×29, same application ×25, identical for this target ×21, segments ×8, unnatural ×7.
2. **Recovery round inside `generateMandarinTrack` (4766–4790).** One bounded round per failed recall, continuing the same ledger.
3. **`enforceTrackPairQuota` (18872).** Up to `TRACK_CONTRACT.QUOTA_ROUNDS = 3` rounds (18433). Each calls `_zhRecoverTargetPairs` (20769) with `maxTiers = min(base, 4)` per slot, followed by a full `runMandarinTrackQC` (H_recovery `aiQcPromptMatch` and `aiQcEvaluateGroup`).
4. **QC repair ladder in `runAiQualityCheck`.** 3 attempts per failing group (`['improve','replace','replace']` / `['replace','replace','improve']`). `aiQcEvaluateGroup` takes 2 attempts on an unparseable reply.
5. **`geminiRequest` provider retries.** `GEMINI_MAX_ATTEMPTS = 3` (8759), used only on provider errors; there were 0 here.

**Identical prompts are re-sent.** The retry prompt (4400–4404) only varies by tier:
- k=2: "The previous attempt failed: <last>"
- k=3: "Simplify… <last>"
- k ≥ 4: the same "Use ONLY <target> plus at most one other known word. Previous failure: <last>"

The memory block only grows with *untaught* words and *other-target* clashes. So consecutive k ≥ 4 attempts with the same failure text send a byte-identical prompt.

The request cache in `geminiRequest` (8839–8864) answers a repeat only for `json` or judge stages (`_reusable`, 8846). For generation stages it shares only **in-flight** requests and deletes the entry on completion (8863). The usage ledger shows exactly this: "DUPLICATES: candidates 10 · prevented 0 · actually sent 10 (B_generation_retry ×9, G_replace ×1)" (detection at 8592: same `promptHash`, attempt 1, no `retryReason`). Generation runs at temperature 0.7, so a resend can return a different sentence, but it is still a blind repeat.

---

## 9. Validators and gates in the canonical path

`D` = deterministic, `M` = model.

### Target presence
- **ja:** `matchesJapaneseTarget` 6045 (D). Used in generation (`jaEvaluateRecallCandidate`), QC (36433) and the final quota (`TRACK_ADAPTERS.ja.targetPresent` 21007).
- **zh:** `mandarinTargetPresent` 3375 (D). Generation and QC use an inventory built from the targets. `TRACK_ADAPTERS.zh.targetPresent` (21026–21037) has to rebuild the inventory so that a NEW target is in the lexicon; this mismatch is documented in the code.
- **th:** `thaiTargetPresent` / `thaiTargetConceptPresent` 20012/20056 (D), plus `thaiTargetIdentityViolations` 18448 (D).
- **Overlap:** `validateSmartPairs` 14135 accepts a line if **any line of its group** contains the target. The final quota checks **per line**, so a line passes generation and is then removed at the quota stage.

### Sense
- **th:** the prompt has `INTENDED SENSE` (15046) and, contradicting it, the classifier `_usageHint` (14993/31858). `thaiLexicalSenseProblems` 30964 (D, a fixed list). `_finalNaturalnessJudge` `wrongSense` (M, cached from the early gate). `thaiTpSenseProblem` (D) is **dead (teaching plan only)**.
- **ja:** `jaPragmaticProblems` 40230 (D); `targetRoleLine` in the prompt; no sense judge.
- **zh:** none beyond `mandarinGrammarProblems` 3569 (D) and the prompt.
- **Contradiction:** `THAI_NOUN_CLASSIFIER` (31938) marks บ้านหลัง as correct, while the target sense is "after / back".

### Closed vocabulary
- **ja:** `japaneseCheckLine` 5862 (scene and framing); `japaneseUnknownFromSegments` with `_structural` / `_compositional` exemptions (generation, 40287–40297); `validateJapaneseUsage` 34527 (QC step 0); QC 'contentVocabulary' (36439). **Overlap:** generation exempts adverbs, interrogatives and どこか-type compounds; QC uses its own rule.
- **zh:** `mandarinUnknownContent` 3406 (generation, QC, finaliser), filtered by `zhIsParticle`.
- **th:** `validateSmartPairs` closed-vocab block (14157ff), `acceptThaiRewrite` 13439, closed-vocab gates per stage (the log "closed-vocab [generation] / [quota-recovery]").

### Cue
- **ja:** `jaCueFormProblems` 40243 (D, form only); "Say: …" rebuild (40700); `aiQcPromptMatch` (M, 3/5 accepted, told to ignore person).
- **zh:** `mandarinCueFromProposition` 3748 (D, overwrites the model cue with "Tell the other person: …"); `zhCueFormProblems` 3557 (D); `aiQcPromptMatch` (M).
- **th:** `thaiCueFormProblems` / `thaiCueFormRepair` 15722/15733 (D); `_qrBatchPromptCheck` (M, ≤3 means improve); `_finalCueJudge` (M, <4 means repair or drop, with speaker perspective).
- **Contradiction:** the same 3/5 cue score is a **failure** in Thai and is **accepted** in Japanese and Mandarin. Thai gives the judge the speaker; Japanese and Mandarin tell the judge person differences "never" count.

### Naturalness
- **ja / zh:** `aiQcEvaluateGroup` (M, group-level; "repetitive is GOOD"; no cue or sense).
- **zh:** `mandarinGrammarProblems` (D: bare adjective predicate, 太…了, and so on).
- **th:** `_finalNaturalnessJudge` (M, per sentence, ≥4) **and** `_qrEvaluateGroup` (M, group). These are two different rubrics on the same lines.

### Register
- **ja:** `JAPANESE_REGISTER_RULES[...].banned` regexes (generation 40301, QC 36442); prompt `japaneseRegisterContract`.
- **zh:** `MANDARIN_REGISTER.tooFormal` / `tooRough` (4915–4916).
- **th:** speaker particle contract (ครับ / ค่ะ / คะ), `thaiSpeakerIdentity`, `thaiAdjudicateRegisterClaim` (M-adjacent overrule).
- The canonical JA/ZH group judge never sees register.

### Pronunciation
- **ja:** `structuralValidateJapanesePair` 38973 (generation; romaji↔reading only); `jaFixNaniReading` 20820 (**rewrites to なに**); `auditJapaneseReading` 34756 (final); `japanesePronunciationAlignment` 21231 (Listening only); `jaDeterministicReading` 21188 (Listening only).
  - **Contradiction:** Listening derives the reading deterministically from the dictionary, while the Main Track trusts the model's reading and rewrites the romaji to match it.
- **zh:** `validateMandarinPinyin` (format); lexicon segment correction; the toneless N() compare in `_zhFinaliseMetadata`; `mandarinSpokenPinyin` (never validated).
- **th:** `buildThaiPhoneticLexicon` (bank-first) → `finaliseThaiTrackPhonetics` → `thaiPronunciationLineAudit` (tone- and length-blind, circular); `_qrFixBrokenPhonetics` (format triggers only); `thaiPhoneticToneAdvisory` / `calcThaiSyllableTone` (exist, unused).
  - **Contradiction:** `THAI_FUNCTION_PHONETICS` 'láaeo' vs bank 'lâeo'. The bank wins.
- **All languages:** the group judges offer "fix_pronunciation" / "fix_phonetic" without being shown any pronunciation.

### Duplicates and same-use
- **Exact repeats:** `jaDedupeKey` 38834, the Mandarin `seenMap` (stripped text), Thai `existingThais`, and `finalDuplicateAudit` 19009 (normalised exact text, TARGET pairs only).
- **Same use:** `japaneseFormulaKey` / `japaneseVariationVerdict` (ja); `_recoveryConstructionKey` + `zhApplicationKey` (zh); `recallVariationKey` (shared; has the あ/ああ bug). The final TARGET_VARIETY audit is diagnostic only (non-blocking).
- **Overlap:** Mandarin has four key functions (`_recoveryConstructionKey`, `zhApplicationKey`, `zhAskOrSay`, `zhCommunicativeFunction`). Different stages combine them differently: generation uses construction **or** application key, while the final audit uses application key + ask/say. A comment at 4333–4334 admits "v682 had four judges that disagreed". The unifying `zhSameUse` is teaching-plan only.

### Coherence
- `mainTrackCoherenceAudit` (M, English only, TARGET lines only) → `reclusterFailingScenes`, `replanLocalPremises`, `mainTrackCoherenceRepair` 19465.
- Thai group-judge context lines (M).

### Length
- `getLearnerComplexityContract(...).analyse` 7768 (generation hardMax: ja 40304, th 14146, zh `PREFERRED_RANGE_DRIFT` 4481); bridge-line drop (19057); `MAIN_COMPLEXITY_AUDIT` / `complexityAudit` 7805 (final, `LENGTH_PASS`).
- Mandarin alone also rejects above-*preferred* first attempts when the track drifts below 80%.

### Other contradictions visible in the code
1. The Japanese QC regeneration prompt says to repeat a correct sentence (35411), while TARGET_VARIETY wants 3 distinct uses.
2. `_jazhQcStatus` (20924) reports SEMANTIC_QC / NATURALNESS_QC = COMPLETE simply because QC ran. Thai requires a per-line VERIFIED stamp on the current text.
3. The fixes for items 4, 5 and 6 (classifier sense, speaker line in the prompt, per-sentence strict judge, re-judging repaired groups, `zhSameUse`) all exist in the file, but **only behind `teachingPlanOn()`**, so v683 production runs none of them.
