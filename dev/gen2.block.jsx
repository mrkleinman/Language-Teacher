// TT_GEN2_BEGIN ═════════════════════════════════════════════════════════════════════════════════════════════════════
// v678 — CONTROLLED GENERATION ARCHITECTURE ("Gen2"), SHADOW-MODE PILOT. DISABLED BY DEFAULT.
//
//   candidate selection → TEACHABILITY → target freezing → composition → INDEPENDENT ACCEPTANCE → persistence
//
// • No learner-facing screen calls anything in this block. The only entry point is the benchmark worker
//   (ttBenchRunFixture with o.pipeline === 'gen2'), which runs inside the storage sandbox. Persistence is therefore
//   OFF: Gen2 returns a track object to the benchmark and writes nothing (no SRS, no vocabulary, no saved track).
// • A target is FROZEN into a lesson only after its teaching material exists and has been accepted:
//     Daily      three distinct, natural, useful applications (sentence + faithful English + an intent cue)
//     Listening  one workable two-turn exchange
//   A target that cannot be taught after a bounded number of attempts is DEFERRED (reason recorded) and the next
//   candidate from the existing SRS / belt order takes its slot. Deferral never touches the word's SRS state, so its
//   obligation stands (production would carry it to the next lesson — not wired in this pilot).
// • ACCEPTANCE IS INDEPENDENT OF GENERATION: deterministic checks (closed vocabulary, morphology-aware target presence,
//   length, speaker conventions, cue ≠ answer, duplicates, repeated rejects) and a separate JUDGE request that sees only
//   the material, never the generator's reasoning. By default the judge is a different, stronger model than the
//   generator. A judge reply that cannot be parsed accepts NOTHING. Nothing is accepted because it is constructible.
// • Listening is written scene by scene as whole dialogues (questions and answers together), 3–5 connected scenes chosen
//   for THIS vocabulary — no fixed phase list, no PROVEN template sentences.
const GEN2_VERSION = 'gen2-pilot/1'
const GEN2_FLAG = Object.freeze({ enabled: false, shadowOnly: true })   // activation for learners needs a separate change
const GEN2_CONFIG = Object.freeze({
  generatorModel: 'gemini-2.5-flash-lite', judgeModel: 'gemini-2.5-flash',
  candidatesPerProbe: 6, probesPerTarget: 2, maxReplacements: 8, dailyMaxCalls: 170,
  listeningProbeBatch: 10, listeningMaxCalls: 60, sceneAttempts: 3, minScenes: 3, maxScenes: 5, maxTargetsPerScene: 9,
})
const GEN2_LANG = {
  th: { name: 'Thai', field: 'thai', script: /[฀-๿]/,
    speakers: 'Two adult friends. A is a man: he says ผม and ends polite sentences with ครับ. B is a woman: she says ฉัน and ends statements with ค่ะ and questions with คะ. A sentence that needs a female particle (ค่ะ / คะ) must be spoken by the woman; one that needs ครับ by the man.' },
  ja: { name: 'Japanese', field: 'japanese', script: /[぀-ヿ一-鿿]/,
    speakers: 'Two adult friends speaking casual Japanese (plain forms, no です/ます except fixed phrases such as すみません or ありがとうございます). Avoid strongly gendered sentence endings.' },
  zh: { name: 'Mandarin Chinese', field: 'chinese', script: /[一-鿿]/,
    speakers: 'Two adult friends speaking everyday Mandarin (simplified characters, no pinyin in the sentence).' },
}
// ── word class: how a word is taught (particles, classifiers and set phrases are taught differently from content words)
function gen2WordClass(lang, w) {
  const g = String((w && w.english) || '').toLowerCase(), pos = String((w && w.partOfSpeech) || '').toLowerCase(), s = String((w && (w.thai || w.japanese || w.chinese)) || '')
  if (/particle/.test(g) || /particle/.test(pos)) return 'particle'
  if (/classifier|counter/.test(g) || /classifier|counter/.test(pos)) return 'classifier'
  if (/^(hello|thank|thanks|sorry|excuse me|goodbye|bye|yes|no|okay|ok)\b/.test(g) || /expression|interjection|phrase/.test(pos) || (lang === 'ja' && /^(すみません|ありがとう|ごめん|はい|いいえ|うん)/.test(s))) return 'expression'
  if (/^(what|where|when|who|why|how|which)\b/.test(g) || /interrogative|question/.test(pos)) return 'question-word'
  if (/conjunction|preposition|coverb/.test(pos) || /^(and|or|but|with|because|if|so|then)\b/.test(g)) return 'function-word'
  if (/verb/.test(pos)) return 'verb'
  if (/adj/.test(pos)) return 'adjective'
  if (/adverb/.test(pos)) return 'adverb'
  if (/pronoun|demonstrative/.test(pos)) return 'pronoun'
  return pos || 'word'
}
const GEN2_CLASS_GUIDE = {
  'particle': 'This is a PARTICLE. Each application must be a complete sentence whose function REQUIRES this particle (for a female polite question particle: a woman asking a real question; for a softening particle: a real suggestion or reminder). Give the speaker the particle requires.',
  'classifier': 'This is a CLASSIFIER. Use it the way it is really used: counting (noun + number + classifier) or pointing out one item (noun + classifier + this/that), with a noun it actually classifies.',
  'expression': 'This is a SET EXPRESSION. Each application is a different real moment where people say it (e.g. apologising for being late, getting someone’s attention, declining politely), as a complete natural utterance.',
  'question-word': 'This is a QUESTION WORD. Use real questions whose answers would be natural; the three applications ask about different things.',
  'function-word': 'This is a FUNCTION WORD. Use it in its grammatical role linking two parts; every sentence must be complete.',
}
// ── Japanese inflection: every form of the lemma counts as the target (する → して/した/しない/すれば/させる…)
function gen2JaForms(w) {
  const lemma = (w && (w.lemma || w.japanese)) || ''
  const forms = new Set([lemma])
  try { if (w.conjugationClass) japaneseConjugate(lemma, w.conjugationClass).forEach(f => f && forms.add(f)) } catch (e) {}
  if (w && w.conjugationClass === 'irregular-suru') ['すれば', 'させる', 'させて', 'される', 'しろ', 'しない', 'しよう', 'しちゃう', 'しといて'].forEach(f => forms.add(f))
  if (w && w.conjugationClass === 'irregular-kuru') ['来い', '来られる', 'こられる'].forEach(f => forms.add(f))
  return [...forms].filter(Boolean)
}
function gen2TargetPresent(lang, text, w, vocab) {
  const s = String(text || '')
  if (!s || !w) return false
  if (lang === 'ja') {
    if (w.partOfSpeech === 'verb' || w.conjugationClass) {
      // the single-kana stem し / 来 only counts inside an inflection it starts (して, した, しない …), never alone
      return gen2JaForms(w).some(f => f.length > 1 && s.includes(f)) || !!matchesJapaneseTarget(s, w)
    }
    return !!matchesJapaneseTarget(s, w)
  }
  if (lang === 'th') { try { return !!thaiTargetPresent(s, w.thai, vocab || null) } catch (e) { return s.includes(w.thai) } }
  return s.includes(w.chinese)
}
// ── deterministic helpers
const gen2Norm = s => String(s || '').toLowerCase().replace(/["'“”‘’.,!?;:()\-—…。、！？「」]/g, ' ').replace(/\s+/g, ' ').trim()
function gen2Core(lang, s) {
  let t = String(s || '')
  if (lang === 'ja') t = t.replace(/^(あれ|え|ねえ|じゃあ|うん|あ|ああ|そう|ほら|まあ)[？?、。!！]*/u, '')
  if (lang === 'zh') t = t.replace(/^(嗯|啊|哦|那|好)[，,。！？!?]*/u, '')
  if (lang === 'th') t = t.replace(/(ครับ|ค่ะ|คะ|นะ|จ้ะ|จ้า)+[\s?!.]*$/u, '')
  return t.replace(/[\s。、，,.！？!?「」]/g, '')
}
function gen2Bigrams(s) { const a = new Set(); for (let i = 0; i < s.length - 1; i++) a.add(s.slice(i, i + 2)); return a }
function gen2Similar(a, b) { const A = gen2Bigrams(a), B = gen2Bigrams(b); if (!A.size || !B.size) return a === b ? 1 : 0; let n = 0; A.forEach(x => { if (B.has(x)) n++ }); return n / (A.size + B.size - n) }
const GEN2_CUE_INTENT = /^(ask|tell|say|suggest|offer|invite|refuse|decline|agree|accept|apologi[sz]e|thank|greet|explain|express|confirm|check|propose|describe|mention|point out|admit|warn|complain|request|answer|reply|respond|react|insist|remind|encourage|praise|compliment|let|order|count|call|wish|introduce|recommend|correct|disagree|admit)\b/i
function gen2CueProblem(cue, english, lang) {
  const c = String(cue || '').trim(), e = String(english || '').trim()
  if (!c) return 'cue-missing'
  if (GEN2_LANG[lang].script.test(c)) return 'cue-contains-target-language'
  const stripped = c.replace(/^(ask|say|tell( the other person| your friend| them| him| her)?|answer|reply)\s*[:,-]\s*/i, '')
  if (gen2Norm(stripped) === gen2Norm(e) || gen2Similar(gen2Norm(stripped), gen2Norm(e)) >= 0.75) return 'cue-copies-answer'
  if (!GEN2_CUE_INTENT.test(c)) return 'cue-not-an-intent'
  if (/:\s*["“]?[A-Z]/.test(c) && gen2Similar(gen2Norm(c.split(':').slice(1).join(':')), gen2Norm(e)) >= 0.5) return 'cue-copies-answer'
  return null
}
function gen2ParseJson(text) {
  if (text == null) return null
  let s = String(text).trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
  try { return JSON.parse(s) } catch (e) {}
  const a = s.indexOf('{'), b = s.lastIndexOf('}')
  if (a >= 0 && b > a) { try { return JSON.parse(s.slice(a, b + 1)) } catch (e) {} }
  return null
}
// ── the run context: one place for models, budget, inventory, accounting
function gen2Context(o) {
  const lang = o.lang, vocab = o.vocab
  const cc = getLearnerComplexityContract({ lang, vocab })
  const ctx = { lang, vocab, apiKey: o.apiKey, genModel: o.generatorModel || GEN2_CONFIG.generatorModel, judgeModel: o.judgeModel || GEN2_CONFIG.judgeModel,
    log: o.onLog || (() => {}), cc, calls: 0, maxCalls: o.maxCalls, byStage: {}, speechStyle: o.speechStyle || 'natural', events: [] }
  ctx.byId = new Map(vocab.map(w => [w.id, w]))
  return ctx
}
function gen2Inventory(ctx, targets) {
  const lang = ctx.lang
  if (lang === 'th') {
    const allowed = thaiAuthorisedSurfaces(ctx.vocab, targets)
    return { list: [...allowed], check: text => { const r = thaiQcCheckVocabulary({ thai: text }, allowed, ctx.vocab); return r.ok ? [] : r.problems } }
  }
  if (lang === 'ja') {
    const inv = japaneseLearnerInventory(ctx.vocab, targets)
    const list = [...new Set([...inv.allContent.map(w => w.japanese), ...inv.conversationBasics.map(b => b.form)])]
    return { list, grammar: inv.grammarScaffold.map(g => g.form), check: text => { const r = japaneseCheckLine(text, inv); return r.ok ? [] : ['untaught: ' + r.unknown.join(' ')] } }
  }
  const inv = mandarinLearnerInventory(ctx.vocab, targets)
  return { list: [...new Set((inv.lexicon || []).map(x => x.w))], check: text => { const r = mandarinCheckLine(text, inv); const g = mandarinSurfaceGrammarProblems(text, inv) || []; return (r.ok ? [] : ['untaught: ' + r.unknown.join(' ')]).concat(g.map(x => typeof x === 'string' ? x : (x && (x.code || x.reason)) || 'grammar')) } }
}
async function gen2Ask(ctx, stage, prompt, o) {
  o = o || {}
  if (ctx.maxCalls && ctx.calls >= ctx.maxCalls) { const e = new Error('GEN2_BUDGET_EXHAUSTED after ' + ctx.calls + ' calls'); e.gen2Budget = true; throw e }
  ctx.calls++; ctx.byStage[stage] = (ctx.byStage[stage] || 0) + 1
  const judge = !!o.judge
  const text = await geminiRequest({ apiKey: ctx.apiKey, model: judge ? ctx.judgeModel : ctx.genModel, messages: [{ role: 'user', content: prompt }],
    maxTokens: o.maxTokens || 2000, temperature: judge ? 0 : 0.8, json: true, stage, attempt: o.attempt != null ? o.attempt : null })
  return gen2ParseJson(text)
}
function gen2ConventionLine(ctx) {
  if (ctx.lang === 'ja' && ctx.speechStyle === 'polite') return 'Two adults speaking politely (です/ます).'
  if (ctx.lang !== 'th' || !ctx.allowedSet) return GEN2_LANG[ctx.lang].speakers
  // Thai: the speaker contract names only pronouns the learner has been taught (a convention never smuggles in a word)
  const has = w => ctx.allowedSet.has(w)
  return 'Two adult friends. A is a man: his polite sentences end with ครับ' + (has('ผม') ? ' and he says ผม for "I"' : ' (ผม is not taught yet: he leaves out "I", as Thai allows)') + '. ' +
    'B is a woman: she ends statements with ค่ะ and questions with คะ' + (has('ฉัน') ? ' and says ฉัน for "I"' : ' (ฉัน is not taught yet: she leaves out "I")') + '. ' +
    'A sentence that needs a female particle (ค่ะ / คะ) must be spoken by the woman; one that needs ครับ by the man.'
}
function gen2Siblings(ctx, w, pool) {
  const key = g => String(g || '').toLowerCase().split(/[;,/(]/)[0].replace(/^(to|a|an|the)\s+/, '').trim()
  const k = key(w.english)
  return pool.filter(x => x.id !== w.id && (key(x.english) === k || (k.length > 3 && (key(x.english).includes(k) || k.includes(key(x.english)))))).map(x => x[GEN2_LANG[ctx.lang].field] + ' ("' + x.english + '")')
}
// ════ DAILY: teachability of ONE target ════════════════════════════════════════════════════════════════════════════
function gen2ProbePrompt(ctx, w, inv, siblings, feedback, n) {
  const L = GEN2_LANG[ctx.lang], cls = gen2WordClass(ctx.lang, w), cc = ctx.cc
  return '[task: gen2-daily-probe v1]\n' +
    'You are an experienced teacher of ' + L.name + ' writing practice sentences for an adult beginner (' + cc.belt + '). Sentences are ' + cc.preferredMin + '–' + cc.preferredMax + ' ' + cc.unitName + ', never more than ' + cc.hardMax + '.\n' +
    'TARGET WORD: ' + w[L.field] + ' — "' + w.english + '"' + (w.note ? ' (' + w.note + ')' : '') + ' · word class: ' + cls + '\n' +
    (GEN2_CLASS_GUIDE[cls] ? GEN2_CLASS_GUIDE[cls] + '\n' : '') +
    (siblings.length ? 'OTHER WORDS IN THIS LESSON WITH A SIMILAR MEANING: ' + siblings.join(' · ') + '. Each cue must lead to THIS word, not those.\n' : '') +
    'SPEAKERS: ' + gen2ConventionLine(ctx) + '\n' +
    'ALLOWED WORDS — use ONLY these words, the target word, and normal grammar (particles, inflection): ' + inv.list.join(' ') + (inv.grammar ? '\nALLOWED GRAMMAR: ' + inv.grammar.join(' ') : '') + '\n' +
    'Write ' + n + ' candidate practice sentences. Together they must contain at least THREE DIFFERENT real uses of the target (different communicative functions, e.g. asking, answering, offering, refusing, suggesting, describing) — never the same sentence with one word changed.\n' +
    'Every sentence must be complete, grammatically perfect, and something a native speaker would naturally say to a friend in an everyday situation, using the target in the sense "' + w.english + '". Do not invent odd combinations just to use the allowed words.\n' +
    'For each candidate give: "function" (1–3 words), "situation" (when it is said, short English), "cue" (an English instruction telling the learner WHAT TO COMMUNICATE without giving the words, e.g. "Ask your friend whether they are free tonight." — never a translation of the sentence), "text" (the ' + L.name + ' sentence), "english" (a faithful natural translation), "speaker" ("male", "female" or "either").\n' +
    'If this word cannot be used naturally with the allowed words, return "teachable": false with a short "reason" instead of forcing sentences.\n' +
    (feedback ? feedback + '\n' : '') +
    'Return ONLY JSON: {"teachable": true, "reason": "", "candidates": [{"function": "", "situation": "", "cue": "", "text": "", "english": "", "speaker": ""}]}'
}
function gen2JudgePrompt(ctx, w, items, siblings) {
  const L = GEN2_LANG[ctx.lang]
  return '[task: gen2-daily-judge v1]\n' +
    'You are a strict native ' + L.name + ' editor checking practice material for adult beginners. You did not write it. Do not be lenient because it is for learners.\n' +
    'TARGET WORD: ' + w[L.field] + ' — "' + w.english + '"\n' + (siblings.length ? 'Other lesson words with similar meanings: ' + siblings.join(' · ') + '\n' : '') +
    'SPEAKERS: ' + gen2ConventionLine(ctx) + '\n' +
    'For EACH item judge:\n' +
    ' grammar: ok | error\n natural: natural | marginal | unnatural   (would a native speaker say exactly this to a friend?)\n' +
    ' translation: accurate | misleading   (does the English say what the sentence says?)\n target: correct | wrong-sense | absent   (target present in a correct form, used in the sense given)\n' +
    ' cue: useful | copies-answer | ambiguous | misleading   (could a learner who reads ONLY the cue produce essentially this sentence with this target word?)\n' +
    ' speaker: ok | wrong   (fits the stated speaker)\n useful: useful | weak | not-useful   (a real, reusable thing a beginner needs to say)\n fragment: true | false\n note: a short reason when anything is wrong\n' +
    'ITEMS:\n' + items.map((c, i) => (i + 1) + '. [speaker: ' + c.speaker + '] ' + c.text + ' | English: ' + c.english + ' | Cue: ' + c.cue).join('\n') + '\n' +
    'Return ONLY JSON: {"items": [{"n": 1, "grammar": "", "natural": "", "translation": "", "target": "", "cue": "", "speaker": "", "useful": "", "fragment": false, "note": ""}]}'
}
function gen2Verdict(v) {
  if (!v) return { ok: false, why: 'judge: no verdict (UNVERIFIED)' }
  const bad = []
  if (v.grammar !== 'ok') bad.push('grammar ' + v.grammar)
  if (v.natural !== 'natural') bad.push('naturalness ' + v.natural)
  if (v.translation !== 'accurate') bad.push('translation ' + v.translation)
  if (v.target !== 'correct') bad.push('target ' + v.target)
  if (v.cue !== 'useful') bad.push('cue ' + v.cue)
  if (v.speaker && v.speaker !== 'ok') bad.push('speaker ' + v.speaker)
  if (v.useful !== 'useful') bad.push('usefulness ' + v.useful)
  if (v.fragment === true || v.fragment === 'true') bad.push('fragment')
  return bad.length ? { ok: false, why: 'judge: ' + bad.join(', ') + (v.note ? ' — ' + v.note : '') } : { ok: true }
}
function gen2SpeakerProblem(ctx, c) {
  if (ctx.lang === 'th') {
    const g = c.speaker === 'male' || c.speaker === 'female' ? c.speaker : null
    const parts = typeof thaiParticlesIn === 'function' ? thaiParticlesIn(c.text) : []
    const fem = parts.some(p => p === 'ค่ะ' || p === 'คะ'), mas = parts.includes('ครับ')
    if (fem && mas) return 'speaker: male and female particles in one sentence'
    const need = fem ? 'female' : mas ? 'male' : g
    if (!need) return null
    if (g && g !== need) return 'speaker: declared ' + g + ' but the particles need a ' + need + ' speaker'
    const r = validateThaiSpeakerParticle(c.text, need)
    if (!r.ok) return 'speaker: ' + (r.reason || 'particle conflict')
    c.speaker = need
    return null
  }
  if (ctx.lang === 'ja' && ctx.speechStyle !== 'polite' && /(です|ます|ました|ません|ましょう|でした)(か|ね|よ)?[。？！?!]*$/.test(c.text) && !/(すみません|ありがとうございます|おはようございます|お願いします|いただきます|ございます)[。？！?!]*$/.test(c.text))
    return 'register: polite ending in casual speech'
  return null
}
// deterministic gate for one candidate (cheap, before any paid judging)
function gen2DetCheck(ctx, w, c, inv) {
  const L = GEN2_LANG[ctx.lang], p = []
  if (!c || !c.text || !c.english) return ['incomplete candidate']
  if (!L.script.test(c.text)) p.push('not ' + L.name)
  if (!gen2TargetPresent(ctx.lang, c.text, w, ctx.vocab)) p.push('target absent')
  p.push(...inv.check(c.text))
  const a = ctx.cc.analyse(c.text)
  if (a.overHardMax) p.push('too long (' + a.units + ' > ' + ctx.cc.hardMax + ')')
  if (a.units < 2 && gen2WordClass(ctx.lang, w) !== 'expression') p.push('fragment (' + a.units + ' unit)')
  const cp = gen2CueProblem(c.cue, c.english, ctx.lang); if (cp) p.push(cp)
  const sp = gen2SpeakerProblem(ctx, c); if (sp) p.push(sp)
  return p
}
// three accepted, mutually distinct applications (different function, different core sentence, low overlap)
function gen2PickDistinct(lang, accepted, need) {
  const out = []
  for (const c of accepted) {
    const core = gen2Core(lang, c.text), fn = gen2Norm(c.function)
    if (out.some(o => gen2Norm(o.function) === fn && fn) ) continue
    if (out.some(o => { const oc = gen2Core(lang, o.text); return oc === core || gen2Similar(oc, core) >= 0.6 })) continue
    out.push(c)
    if (out.length >= need) break
  }
  return out
}
async function gen2TeachTarget(ctx, w, st) {
  const L = GEN2_LANG[ctx.lang], rec = { id: w.id, surface: w[L.field], english: w.english, wordClass: gen2WordClass(ctx.lang, w), attempts: [], status: null, reason: null, recalls: [] }
  const siblings = gen2Siblings(ctx, w, st.pool)
  const rejected = st.rejectedByTarget.get(w.id) || new Set(); st.rejectedByTarget.set(w.id, rejected)
  let accepted = []
  for (let k = 1; k <= GEN2_CONFIG.probesPerTarget; k++) {
    const need = 3 - gen2PickDistinct(ctx.lang, accepted, 3).length
    const fb = k === 1 ? '' : 'ALREADY REJECTED — do not repeat or lightly edit these: ' + [...rejected].slice(-12).join(' / ') + '\nREASONS: ' + rec.attempts[rec.attempts.length - 1].reasons.slice(0, 6).join('; ') +
      (accepted.length ? '\nALREADY ACCEPTED (write DIFFERENT functions from these): ' + accepted.map(a => a.text + ' [' + a.function + ']').join(' / ') : '') + '\nWrite new candidates; at least ' + need + ' must be acceptable.'
    const att = { probe: k, candidates: 0, detRejected: 0, repeatsSuppressed: 0, judged: 0, accepted: 0, reasons: [] }
    rec.attempts.push(att)
    const res = await gen2Ask(ctx, 'P_gen2_probe', gen2ProbePrompt(ctx, w, st.inv, siblings, fb, GEN2_CONFIG.candidatesPerProbe), { attempt: k })
    if (res && res.teachable === false) { att.reasons.push('generator: not teachable — ' + (res.reason || '')); if (!accepted.length) { rec.status = 'deferred'; rec.reason = 'NOT_TEACHABLE_WITH_INVENTORY: ' + (res.reason || 'generator declined'); return rec } continue }
    const cands = (res && Array.isArray(res.candidates) ? res.candidates : []).filter(Boolean).map(c => ({ function: String(c.function || ''), situation: String(c.situation || ''), cue: String(c.cue || '').trim(),
      text: String(c.text || '').trim(), english: String(c.english || '').trim(), speaker: /^(male|female)$/.test(c.speaker) ? c.speaker : 'either' }))
    att.candidates = cands.length
    if (!cands.length) { att.reasons.push('generator reply unusable'); continue }
    const toJudge = []
    for (const c of cands) {
      const key = gen2Core(ctx.lang, c.text)
      if (rejected.has(key) || st.usedCores.has(key) || accepted.some(a => gen2Core(ctx.lang, a.text) === key)) { att.repeatsSuppressed++; continue }
      const dp = gen2DetCheck(ctx, w, c, st.inv)
      if (st.usedCues.has(gen2Norm(c.cue))) dp.push('cue already used by another recall in this lesson')
      if (dp.length) { att.detRejected++; att.reasons.push(c.text + ': ' + dp.join(', ')); rejected.add(key); continue }
      toJudge.push(c)
    }
    if (toJudge.length) {
      att.judged = toJudge.length
      let jr = await gen2Ask(ctx, 'R_gen2_judge', gen2JudgePrompt(ctx, w, toJudge, siblings), { judge: true, attempt: k, maxTokens: 1800 })
      if (!jr || !Array.isArray(jr.items)) jr = await gen2Ask(ctx, 'R_gen2_judge', gen2JudgePrompt(ctx, w, toJudge, siblings) + '\n(Reply with valid JSON only.)', { judge: true, attempt: k + 10, maxTokens: 1800 })
      const items = jr && Array.isArray(jr.items) ? jr.items : []
      toJudge.forEach((c, i) => {
        const v = items.find(x => +x.n === i + 1) || null
        const vr = gen2Verdict(v)
        c.judge = v
        if (vr.ok) { accepted.push(c); att.accepted++ } else { att.reasons.push(c.text + ': ' + vr.why); rejected.add(gen2Core(ctx.lang, c.text)) }
      })
    }
    if (gen2PickDistinct(ctx.lang, accepted, 3).length >= 3) break
  }
  const pick = gen2PickDistinct(ctx.lang, accepted, 3)
  if (pick.length >= 3) { rec.status = 'teachable'; rec.recalls = pick }
  else { rec.status = 'deferred'; rec.reason = 'ONLY_' + pick.length + '_DISTINCT_ACCEPTED after ' + rec.attempts.length + ' probe(s)' }
  return rec
}
// the candidate order from the EXISTING selectors (SRS + belt priority): the fixed targets first, then their reserve
function gen2CandidateOrder(lang, vocab, fixedTargets) {
  const ids = new Set(fixedTargets.map(w => w.id)), out = fixedTargets.slice()
  let rest = []
  try {
    if (lang === 'th') { const s = selectRevisionTargets('th', vocab); rest = [...(s.targets || []), ...(s.reserve || [])] }
    else rest = selectRevisionTrackTargets({ vocab, maxTargets: 100000, language: lang }).targets.filter(w => jazhTargetEligible(w, lang))
  } catch (e) { rest = [] }
  const byId = new Map(vocab.map(w => [w.id, w]))
  rest.forEach(x => { const w = byId.get(x.id) || x; if (w && !ids.has(w.id)) { ids.add(w.id); out.push(w) } })
  return out
}
async function gen2Daily(o) {
  const ctx = gen2Context({ ...o, maxCalls: o.maxCalls || GEN2_CONFIG.dailyMaxCalls })
  const lang = ctx.lang, L = GEN2_LANG[lang], need = o.fixedTargets.length
  const order = gen2CandidateOrder(lang, ctx.vocab, o.fixedTargets)
  const st = { pool: order.slice(0, need + GEN2_CONFIG.maxReplacements), inv: null, rejectedByTarget: new Map(), usedCores: new Set(), usedCues: new Set() }
  st.inv = gen2Inventory(ctx, st.pool)
  ctx.allowedSet = new Set(st.inv.list)
  ctx.log('🧪 GEN2 DAILY ' + lang + ' · ' + GEN2_VERSION + ' · generator ' + ctx.genModel + ' · judge ' + ctx.judgeModel + ' · candidates ' + order.length + ' (fixed ' + need + ' + reserve)')
  const frozen = [], deferred = []
  let next = 0, replacements = 0, stop = null
  try {
    while (frozen.length < need && next < order.length) {
      const w = order[next++]
      const isReplacement = next > need
      if (isReplacement && replacements >= GEN2_CONFIG.maxReplacements) break
      if (isReplacement) replacements++
      const rec = await gen2TeachTarget(ctx, w, st)
      rec.replacement = isReplacement
      if (rec.status === 'teachable') {
        rec.recalls.forEach(r => { st.usedCores.add(gen2Core(lang, r.text)); st.usedCues.add(gen2Norm(r.cue)) })
        frozen.push(rec)
        ctx.log('✅ TEACHABLE ' + rec.surface + ' (' + rec.wordClass + ') · ' + rec.recalls.map(r => r.text).join(' / '))
      } else {
        deferred.push(rec)
        ctx.log('↪ DEFERRED ' + rec.surface + ' — ' + rec.reason + ' · SRS unchanged (stays due)')
      }
    }
  } catch (e) { if (!e.gen2Budget) throw e; stop = e.message; ctx.log('⛔ ' + e.message) }
  // composition: groups of five targets, recalls round-robin (the shape learners already know); the speaker follows
  // each sentence's own requirement (female particles → the woman), never a fixed alternation
  const pairs = []
  let alt = 0
  for (let g = 0; g < frozen.length; g += 5) {
    const grp = frozen.slice(g, g + 5)
    for (let r = 0; r < 3; r++) grp.forEach(rec => {
      const c = rec.recalls[r]; if (!c) return
      const spk = c.speaker === 'male' || c.speaker === 'female' ? gen2LetterFor(c.speaker) : (alt++ % 2 ? 'B' : 'A')
      pairs.push({ speaker: spk, [L.field]: c.text, thai: c.text, english: c.english, prompt: c.cue, targetId: rec.id, recallIndex: r + 1, isTargetPair: true,
        _source: 'gen2:teachability', _gen2: { function: c.function, situation: c.situation, judge: c.judge || null } })
    })
  }
  // independent acceptance of the COMPOSED lesson: invariants re-checked on the final pairs
  const inv = gen2AcceptDaily(ctx, frozen, pairs, need, st)
  const status = inv.ok && frozen.length === need ? 'READY' : 'NOT_READY'
  const reasons = (frozen.length < need ? ['TARGETS_FROZEN=' + frozen.length + '/' + need] : []).concat(inv.problems).concat(stop ? [stop] : [])
  ctx.log('📋 GEN2 DAILY ' + status + ' · targets ' + frozen.length + '/' + need + ' · recalls ' + pairs.length + '/' + (need * 3) + ' · deferred ' + deferred.length + ' · calls ' + ctx.calls + ' ' + JSON.stringify(ctx.byStage))
  const keywords = frozen.map(rec => ({ wordId: rec.id, [L.field]: rec.surface, thai: rec.surface, english: rec.english }))
  return { track: { language: lang, mode: 'daily', trackMode: 'daily', generator: GEN2_VERSION, pairs, keywords, selectedTargetIds: frozen.map(r => r.id),
      integrity: { status, reasons, checkModel: null }, deferredTargets: deferred.map(d => ({ wordId: d.id, surface: d.surface, reason: d.reason, srs: 'unchanged — still due' })) },
    gen2: { version: GEN2_VERSION, models: { generator: ctx.genModel, judge: ctx.judgeModel }, calls: ctx.calls, byStage: ctx.byStage, frozen: frozen.map(gen2RecSummary), deferred: deferred.map(gen2RecSummary), replacementsUsed: replacements, acceptance: inv } }
}
// the speaker letter for a gender, read from THE speaker map (no local A/B ↔ gender table anywhere else)
function gen2LetterFor(gender) { return Object.keys(THAI_SPEAKER_MAP).find(k => THAI_SPEAKER_MAP[k].gender === gender) || 'A' }
function gen2RecSummary(r) { return { id: r.id, surface: r.surface, wordClass: r.wordClass, status: r.status, reason: r.reason, replacement: !!r.replacement,
  probes: r.attempts.length, candidates: r.attempts.reduce((a, x) => a + x.candidates, 0), detRejected: r.attempts.reduce((a, x) => a + x.detRejected, 0),
  repeatsSuppressed: r.attempts.reduce((a, x) => a + x.repeatsSuppressed, 0), judged: r.attempts.reduce((a, x) => a + x.judged, 0), accepted: r.attempts.reduce((a, x) => a + x.accepted, 0),
  rejectionReasons: r.attempts.flatMap(x => x.reasons).slice(0, 12) } }
function gen2AcceptDaily(ctx, frozen, pairs, need, st) {
  const problems = [], lang = ctx.lang, field = GEN2_LANG[lang].field
  const byT = new Map(); pairs.forEach(p => { if (!byT.has(p.targetId)) byT.set(p.targetId, []); byT.get(p.targetId).push(p) })
  if (pairs.length !== frozen.length * 3) problems.push('RECALLS=' + pairs.length + '/' + frozen.length * 3)
  frozen.forEach(rec => {
    const ps = byT.get(rec.id) || [], w = ctx.byId.get(rec.id)
    if (ps.length !== 3) problems.push(rec.surface + ': ' + ps.length + ' recalls')
    if (new Set(ps.map(p => gen2Core(lang, p[field]))).size !== ps.length) problems.push(rec.surface + ': duplicate recalls')
    ps.forEach(p => { const d = gen2DetCheck(ctx, w, { text: p[field], english: p.english, cue: p.prompt, speaker: lang === 'th' ? thaiSpeakerMapGender(p.speaker) : 'either' }, st.inv)
      if (d.length) problems.push(rec.surface + ': ' + d.join(', ')) ; if (!p._gen2 || !p._gen2.judge || !gen2Verdict(p._gen2.judge).ok) problems.push(rec.surface + ': not judge-accepted') })
  })
  const cores = pairs.map(p => gen2Core(lang, p[field])), cues = pairs.map(p => gen2Norm(p.prompt))
  if (new Set(cores).size !== cores.length) problems.push('DUPLICATE_SENTENCES_ACROSS_TARGETS')
  if (new Set(cues).size !== cues.length) problems.push('DUPLICATE_CUES_ACROSS_TARGETS')
  return { ok: problems.length === 0, problems }
}
// ════ LISTENING: workable exchanges → scene plan → whole scenes → independent judge ════════════════════════════════
function gen2ExchangeProbePrompt(ctx, ws, inv, feedback) {
  const L = GEN2_LANG[ctx.lang], cc = ctx.cc
  return '[task: gen2-listen-probe v1]\n' +
    'You write listening material in ' + L.name + ' for an adult beginner (' + cc.belt + ', lines of at most ' + cc.hardMax + ' ' + cc.unitName + ').\n' +
    'SPEAKERS: ' + gen2ConventionLine(ctx) + '\n' +
    'ALLOWED WORDS — use ONLY these, the target words and normal grammar: ' + inv.list.join(' ') + (inv.grammar ? '\nALLOWED GRAMMAR: ' + inv.grammar.join(' ') : '') + '\n' +
    'For EACH target word write ONE natural two-turn exchange between the two friends (either may speak first; the other replies): a real question and its answer, a suggestion and its reply, or a statement and a fitting reaction. The target must appear (in any correct form) in its intended sense; the second turn must truly respond to the first.\n' +
    'TARGETS:\n' + ws.map(w => '- ' + w[L.field] + ' — "' + w.english + '" (' + gen2WordClass(ctx.lang, w) + ')').join('\n') + '\n' +
    (feedback ? feedback + '\n' : '') +
    'If a target cannot be used naturally with these words, give "possible": false for it.\n' +
    'Return ONLY JSON: {"exchanges": [{"target": "", "possible": true, "kind": "question-answer", "turns": [{"speaker": "A", "text": "", "english": ""}, {"speaker": "B", "text": "", "english": ""}]}]}'
}
function gen2ExchangeJudgePrompt(ctx, items) {
  const L = GEN2_LANG[ctx.lang]
  return '[task: gen2-listen-judge-exchange v1]\n' +
    'You are a strict native ' + L.name + ' editor. You did not write these. Judge each two-turn exchange between two friends.\nSPEAKERS: ' + gen2ConventionLine(ctx) + '\n' +
    'For each: grammar (ok|error, both turns), natural (natural|marginal|unnatural), translation (accurate|misleading), target (correct|wrong-sense|absent), responds (yes|no — does turn 2 genuinely answer / respond to turn 1, with the right kind of answer?), note.\n' +
    'ITEMS:\n' + items.map((x, i) => (i + 1) + '. target ' + x.target + ' · ' + x.turns[0].speaker + ': ' + x.turns[0].text + ' (' + x.turns[0].english + ') · ' + x.turns[1].speaker + ': ' + x.turns[1].text + ' (' + x.turns[1].english + ')').join('\n') + '\n' +
    'Return ONLY JSON: {"items": [{"n": 1, "grammar": "", "natural": "", "translation": "", "target": "", "responds": "", "note": ""}]}'
}
function gen2LineDet(ctx, text, inv, speaker) {
  const p = []
  if (!text || !GEN2_LANG[ctx.lang].script.test(text)) return ['not ' + GEN2_LANG[ctx.lang].name]
  p.push(...inv.check(text))
  if (ctx.cc.analyse(text).overHardMax) p.push('too long')
  if (ctx.lang === 'th' && speaker) { const r = validateThaiSpeakerParticle(text, thaiSpeakerMapGender(speaker)); if (!r.ok) p.push('speaker particle: ' + (r.reason || 'conflict')) }
  if (ctx.lang === 'ja') { const sp = gen2SpeakerProblem(ctx, { text, speaker: 'either' }); if (sp) p.push(sp) }
  return p
}
async function gen2ListenTeachability(ctx, order, need, inv) {
  const L = GEN2_LANG[ctx.lang], frozen = [], deferred = []
  let next = 0, round = 0
  while (frozen.length < need && next < order.length && round < 6) {
    round++
    const batch = order.slice(next, next + Math.min(GEN2_CONFIG.listeningProbeBatch, need - frozen.length)); next += batch.length
    let pending = batch, fb = ''
    for (let k = 1; k <= 2 && pending.length; k++) {
      const res = await gen2Ask(ctx, 'P_gen2_listen_probe', gen2ExchangeProbePrompt(ctx, pending, inv, fb), { attempt: round * 10 + k, maxTokens: 2600 })
      const exs = res && Array.isArray(res.exchanges) ? res.exchanges : []
      const cand = [], failed = []
      pending.forEach(w => {
        const e = exs.find(x => x && String(x.target || '').trim() === w[L.field])
        if (!e || e.possible === false || !Array.isArray(e.turns) || e.turns.length < 2) { failed.push({ w, why: e && e.possible === false ? 'generator: not possible' : 'no exchange' }); return }
        // either friend may open (a female polite question needs B, the woman, to ask it); the two turns are different speakers
        const sp0 = e.turns[0] && e.turns[0].speaker === 'B' ? 'B' : 'A'
        const t = e.turns.slice(0, 2).map((x, i) => ({ speaker: i ? (sp0 === 'A' ? 'B' : 'A') : sp0, text: String(x.text || '').trim(), english: String(x.english || '').trim() }))
        const d = [...gen2LineDet(ctx, t[0].text, inv, t[0].speaker), ...gen2LineDet(ctx, t[1].text, inv, t[1].speaker)]
        if (!gen2TargetPresent(ctx.lang, t[0].text + ' ' + t[1].text, w, ctx.vocab)) d.push('target absent')
        if (d.length) failed.push({ w, why: d.join(', ') }); else cand.push({ w, target: w[L.field], kind: e.kind || '', turns: t })
      })
      if (cand.length) {
        const jr = await gen2Ask(ctx, 'R_gen2_listen_judge', gen2ExchangeJudgePrompt(ctx, cand), { judge: true, attempt: round * 10 + k, maxTokens: 2200 })
        const items = jr && Array.isArray(jr.items) ? jr.items : []
        cand.forEach((x, i) => {
          const v = items.find(y => +y.n === i + 1)
          const ok = v && v.grammar === 'ok' && v.natural === 'natural' && v.translation === 'accurate' && v.target === 'correct' && v.responds === 'yes'
          if (ok) frozen.push({ id: x.w.id, w: x.w, surface: x.target, english: x.w.english, exchange: x, judge: v }); else failed.push({ w: x.w, why: v ? 'judge: ' + [v.grammar, v.natural, v.translation, v.target, 'responds ' + v.responds].join(' ') + (v.note ? ' — ' + v.note : '') : 'judge: no verdict (UNVERIFIED)' })
        })
      }
      pending = failed.map(f => f.w)
      fb = failed.length ? 'PREVIOUS ATTEMPT FAILED FOR THESE TARGETS: ' + failed.map(f => f.w[L.field] + ' (' + f.why.slice(0, 120) + ')').join(' · ') + '\nWrite a different, natural exchange for each.' : ''
      if (k === 2) failed.forEach(f => deferred.push({ id: f.w.id, surface: f.w[L.field], reason: 'NO_WORKABLE_EXCHANGE: ' + f.why.slice(0, 200) }))
    }
  }
  return { frozen: frozen.slice(0, need), deferred }
}
function gen2ScenePlanPrompt(ctx, frozen) {
  const L = GEN2_LANG[ctx.lang]
  return '[task: gen2-scene-plan v1]\n' +
    'Plan ONE connected everyday conversation between two adult friends (' + gen2ConventionLine(ctx) + ') that naturally uses these ' + L.name + ' words. Choose the situation from the words themselves — do not force a standard storyline.\n' +
    'Split it into ' + GEN2_CONFIG.minScenes + '–' + GEN2_CONFIG.maxScenes + ' consecutive scenes of the SAME conversation (e.g. meeting, deciding, doing, leaving), each with a short situation, and assign EVERY word to exactly one scene where it fits naturally (at most ' + GEN2_CONFIG.maxTargetsPerScene + ' words per scene).\n' +
    'WORDS (with an example of how each can be used):\n' + frozen.map(f => '- ' + f.surface + ' — "' + f.english + '" e.g. ' + f.exchange.turns.map(t => t.text).join(' / ')).join('\n') + '\n' +
    'Return ONLY JSON: {"story": "", "scenes": [{"title": "", "situation": "", "words": [""]}]}'
}
function gen2ScenePrompt(ctx, scene, idx, total, story, prev, inv, feedback) {
  const L = GEN2_LANG[ctx.lang], cc = ctx.cc
  return '[task: gen2-scene v1]\n' +
    'Write scene ' + (idx + 1) + ' of ' + total + ' of one continuous ' + L.name + ' conversation between two adult friends for a beginner listener (' + cc.belt + ': every line at most ' + cc.hardMax + ' ' + cc.unitName + ').\n' +
    'SPEAKERS: ' + gen2ConventionLine(ctx) + ' (A = the first friend, B = the second; either may open the scene).\nSTORY: ' + story + '\nTHIS SCENE: ' + scene.title + ' — ' + scene.situation + '\n' +
    (prev.length ? 'THE CONVERSATION SO FAR ENDS WITH:\n' + prev.slice(-6).map(l => l.speaker + ': ' + l.text + ' (' + l.english + ')').join('\n') + '\nContinue naturally from there (a short transition line is fine); do not contradict anything already said.\n' : '') +
    'WORDS THIS SCENE MUST USE (each at least once, in its intended sense; the example shows one natural use — you may reuse or adapt it):\n' +
    scene.items.map(f => '- ' + f.surface + ' — "' + f.english + '" e.g. ' + f.exchange.turns.map(t => t.speaker + ': ' + t.text).join(' / ')).join('\n') + '\n' +
    'ALLOWED WORDS — use ONLY these, the words above and normal grammar: ' + inv.list.join(' ') + (inv.grammar ? '\nALLOWED GRAMMAR: ' + inv.grammar.join(' ') : '') + '\n' +
    'Write the scene as whole exchanges: every question is answered in the very next line by the other friend; A and B alternate; ' + gen2SceneLineRange(scene.items.length).join('–') + ' lines (a line may use more than one of the words); natural, coherent, consistent facts (times, places, plans) with the story so far.\n' +
    (feedback ? feedback + '\n' : '') +
    'Return ONLY JSON: {"lines": [{"speaker": "A", "text": "", "english": "", "uses": [""]}]}'
}
function gen2SceneLineRange(n) { return [Math.max(4, Math.ceil(n * 1.2)), Math.ceil(n * 1.6) + 2] }
function gen2SceneJudgePrompt(ctx, story, prev, scene, lines) {
  const L = GEN2_LANG[ctx.lang]
  return '[task: gen2-scene-judge v1]\n' +
    'You are a strict native ' + L.name + ' editor checking a scene of a conversation between two adult friends for beginner listeners. You did not write it. Do not be lenient.\nSPEAKERS: ' + gen2ConventionLine(ctx) + '\nSTORY: ' + story + '\nTHIS SCENE: ' + scene.title + ' — ' + scene.situation + '\n' +
    (prev.length ? 'PREVIOUS LINES:\n' + prev.slice(-4).map(l => l.speaker + ': ' + l.text).join('\n') + '\n' : '') +
    'SCENE LINES:\n' + lines.map((l, i) => (i + 1) + '. ' + l.speaker + ': ' + l.text + ' (' + l.english + ')').join('\n') + '\n' +
    'For EACH line: grammar (ok|error), natural (natural|marginal|unnatural), translation (accurate|misleading), answered (yes|no|n/a — if the line is a question, does the NEXT line answer it with the right kind of answer?), note.\n' +
    'For the scene: coherent (yes|no — the lines make sense together, facts consistent), transition (yes|no|n/a — follows naturally from the previous lines), note.\n' +
    'Return ONLY JSON: {"lines": [{"n": 1, "grammar": "", "natural": "", "translation": "", "answered": "", "note": ""}], "scene": {"coherent": "", "transition": "", "note": ""}}'
}
async function gen2Listening(o) {
  const ctx = gen2Context({ ...o, maxCalls: o.maxCalls || GEN2_CONFIG.listeningMaxCalls })
  const lang = ctx.lang, L = GEN2_LANG[lang], need = o.fixedTargets.length
  const order = gen2CandidateOrder(lang, ctx.vocab, o.fixedTargets)
  const inv = gen2Inventory(ctx, order.slice(0, need + GEN2_CONFIG.maxReplacements))
  ctx.allowedSet = new Set(inv.list)
  ctx.log('🧪 GEN2 LISTENING ' + lang + ' · ' + GEN2_VERSION + ' · generator ' + ctx.genModel + ' · judge ' + ctx.judgeModel)
  let stop = null, frozen = [], deferred = [], lines = [], story = '', scenes = [], sceneLog = []
  try {
    const t = await gen2ListenTeachability(ctx, order, need, inv)
    frozen = t.frozen; deferred = t.deferred
    ctx.log('🧩 GEN2 exchanges accepted for ' + frozen.length + '/' + need + ' targets · deferred ' + deferred.length)
    // scene plan (one request; one retry; deterministic fallback = consecutive chunks)
    let plan = null
    for (let k = 1; k <= 2 && !plan; k++) {
      const pr = await gen2Ask(ctx, 'S_gen2_scene_plan', gen2ScenePlanPrompt(ctx, frozen), { attempt: k, maxTokens: 1600 })
      plan = gen2ValidatePlan(pr, frozen, L)
    }
    if (!plan) { const n = Math.min(GEN2_CONFIG.maxScenes, Math.max(GEN2_CONFIG.minScenes, Math.ceil(frozen.length / 8))), per = Math.ceil(frozen.length / n)
      plan = { story: 'Two friends spend an afternoon together.', scenes: Array.from({ length: n }, (_, i) => ({ title: 'Part ' + (i + 1), situation: 'the conversation continues', items: frozen.slice(i * per, (i + 1) * per) })).filter(s => s.items.length), fallback: true }
      ctx.log('⚠ GEN2 scene plan unusable twice — consecutive chunks used') }
    story = plan.story; scenes = plan.scenes
    // words a scene could not carry are SPREAD over the remaining scenes (never piled onto one), or deferred at the end
    const extra = scenes.map(() => [])
    const spread = (from, list) => { const rest = scenes.length - from - 1; list.forEach((f, i) => { if (rest > 0) extra[from + 1 + (i % rest)].push(f); else deferred.push({ id: f.id, surface: f.surface, reason: 'NOT_PLACED: no accepted scene used it' }) }) }
    for (let si = 0; si < scenes.length; si++) {
      const sc = { ...scenes[si], items: [...extra[si], ...scenes[si].items] }
      let best = null, fb = '', rejectedLines = new Set()
      for (let k = 1; k <= GEN2_CONFIG.sceneAttempts && !best; k++) {
        const res = await gen2Ask(ctx, 'T_gen2_scene', gen2ScenePrompt(ctx, sc, si, scenes.length, story, lines, inv, fb), { attempt: si * 10 + k, maxTokens: 2400 })
        const raw = res && Array.isArray(res.lines) ? res.lines : []
        const ls = raw.map((x, i) => ({ speaker: x.speaker === 'B' ? 'B' : 'A', text: String(x.text || '').trim(), english: String(x.english || '').trim() })).filter(l => l.text)
        const det = ls.map((l, i) => { const d = gen2LineDet(ctx, l.text, inv, l.speaker); if (i && ls[i - 1].speaker === l.speaker) d.push('same speaker twice in a row'); if (rejectedLines.has(gen2Core(lang, l.text))) d.push('repeats a rejected line'); return d })
        if (ls.length > gen2SceneLineRange(sc.items.length)[1] + 2) det[det.length - 1].push('scene too long (' + ls.length + ' lines)')
        const covered = sc.items.filter(f => ls.some(l => gen2TargetPresent(lang, l.text, f.w, ctx.vocab)))
        const detBad = det.map((d, i) => d.length ? (i + 1) + '. ' + ls[i].text + ': ' + d.join(', ') : null).filter(Boolean)
        if (!ls.length) { fb = 'Your previous reply was unusable. Return the JSON exactly as specified.'; sceneLog.push({ scene: si + 1, attempt: k, result: 'unusable' }); continue }
        if (detBad.length) { ls.forEach((l, i) => { if (det[i].length) rejectedLines.add(gen2Core(lang, l.text)) }); fb = 'PREVIOUS VERSION REJECTED: ' + detBad.slice(0, 6).join(' · ') + '\nRewrite the whole scene.'; sceneLog.push({ scene: si + 1, attempt: k, result: 'deterministic', problems: detBad.slice(0, 6) }); continue }
        const jr = await gen2Ask(ctx, 'U_gen2_scene_judge', gen2SceneJudgePrompt(ctx, story, lines, sc, ls), { judge: true, attempt: si * 10 + k, maxTokens: 2400 })
        const jl = jr && Array.isArray(jr.lines) ? jr.lines : null, js = jr && jr.scene
        const lineBad = jl ? ls.map((l, i) => { const v = jl.find(x => +x.n === i + 1); return !v ? (i + 1) + '. no verdict' : (v.grammar !== 'ok' || v.natural !== 'natural' || v.translation !== 'accurate' || v.answered === 'no') ? (i + 1) + '. ' + l.text + ': ' + [v.grammar, v.natural, v.translation, 'answered ' + v.answered].join(' ') + (v.note ? ' — ' + v.note : '') : null }).filter(Boolean) : ['judge reply unusable (UNVERIFIED)']
        const sceneBad = !js ? ['scene verdict missing'] : [js.coherent !== 'yes' ? 'incoherent' + (js.note ? ' — ' + js.note : '') : null, si && js.transition === 'no' ? 'transition not natural' : null].filter(Boolean)
        if (!lineBad.length && !sceneBad.length) best = { lines: ls, covered, judge: jr }
        else { ls.forEach((l, i) => { if (lineBad.some(b => b.startsWith((i + 1) + '. '))) rejectedLines.add(gen2Core(lang, l.text)) }); fb = 'PREVIOUS VERSION REJECTED BY THE EDITOR: ' + lineBad.concat(sceneBad).slice(0, 8).join(' · ') + '\nRewrite the whole scene so every line is natural and every question is answered.'; sceneLog.push({ scene: si + 1, attempt: k, result: 'judge', problems: lineBad.concat(sceneBad).slice(0, 8) }) }
      }
      if (best) {
        best.lines.forEach(l => lines.push({ ...l, scene: si + 1, coversTargetIds: sc.items.filter(f => gen2TargetPresent(lang, l.text, f.w, ctx.vocab)).map(f => f.id) }))
        const miss = sc.items.filter(f => !best.covered.includes(f))
        spread(si, miss)
        sceneLog.push({ scene: si + 1, result: 'accepted', lines: best.lines.length, covered: best.covered.length, carried: miss.length })
        ctx.log('🎬 GEN2 scene ' + (si + 1) + '/' + scenes.length + ' ACCEPTED · ' + best.lines.length + ' lines · words ' + best.covered.length + '/' + sc.items.length)
      } else {
        spread(si, sc.items)
        ctx.log('⛔ GEN2 scene ' + (si + 1) + ' NOT ACCEPTED after ' + GEN2_CONFIG.sceneAttempts + ' attempts — its words ' + (si < scenes.length - 1 ? 'are spread over the remaining scenes' : 'are deferred'))
      }
    }
  } catch (e) { if (!e.gen2Budget) throw e; stop = e.message; ctx.log('⛔ ' + e.message) }
  const fixedIds = o.fixedTargets.map(w => w.id)
  const coveredIds = [...new Set(lines.flatMap(l => l.coversTargetIds))]
  const frozenIds = frozen.map(f => f.id)
  const status = frozenIds.length === need && frozenIds.every(id => coveredIds.includes(id)) && !stop ? 'READY' : 'NOT_READY'
  const failed = [frozenIds.length < need ? 'TARGETS_FROZEN=' + frozenIds.length + '/' + need : null, coveredIds.length < need ? 'COVERAGE=' + coveredIds.length + '/' + need : null, stop].filter(Boolean)
  ctx.log('📋 GEN2 LISTENING ' + status + ' · coverage ' + coveredIds.length + '/' + need + ' · ' + lines.length + ' lines · ' + [...new Set(lines.map(l => l.scene))].length + ' scenes · calls ' + ctx.calls + ' ' + JSON.stringify(ctx.byStage))
  const listening = { lines: lines.map(l => ({ scene: l.scene, speaker: l.speaker, [L.field]: l.text, thai: l.text, english: l.english, coversTargetIds: l.coversTargetIds })) }
  return { track: { trackType: 'listening', language: lang, generator: GEN2_VERSION, status, ready: status === 'READY', failedChecks: failed, selectedTargetIds: frozenIds,
      keywords: frozen.map(f => ({ wordId: f.id, [L.field]: f.surface, thai: f.surface, english: f.english })),
      coverage: { covered: coveredIds.length, required: need, missing: frozenIds.filter(id => !coveredIds.includes(id)) }, listening,
      deferredTargets: deferred.map(d => ({ wordId: d.id, surface: d.surface, reason: d.reason, srs: 'unchanged — still due' })), story },
    gen2: { version: GEN2_VERSION, models: { generator: ctx.genModel, judge: ctx.judgeModel }, calls: ctx.calls, byStage: ctx.byStage, story, scenes: scenes.map(s => ({ title: s.title, situation: s.situation, words: s.items.map(f => f.surface) })), sceneLog,
      frozen: frozen.map(f => ({ id: f.id, surface: f.surface, replacement: !fixedIds.includes(f.id) })), deferred } }
}
function gen2ValidatePlan(pr, frozen, L) {
  if (!pr || !Array.isArray(pr.scenes)) return null
  const bySurface = new Map(frozen.map(f => [f.surface, f])), seen = new Set()
  const scenes = pr.scenes.map(s => ({ title: String(s.title || ''), situation: String(s.situation || ''), items: (Array.isArray(s.words) ? s.words : []).map(x => bySurface.get(String(x).trim())).filter(f => f && !seen.has(f.id) && seen.add(f.id)) })).filter(s => s.items.length)
  if (scenes.length < GEN2_CONFIG.minScenes || scenes.length > GEN2_CONFIG.maxScenes) return null
  if (seen.size !== frozen.length || scenes.some(s => s.items.length > GEN2_CONFIG.maxTargetsPerScene)) return null
  return { story: String(pr.story || ''), scenes }
}
// TT_GEN2_END ═══════════════════════════════════════════════════════════════════════════════════════════════════════
