// Step 0 — INDEPENDENT LINGUISTIC EVALUATION: the rubric (single source for the evaluator, the golden dataset and the
// calibration report). Eight dimensions, closed verdict sets, closed error categories.
'use strict'
// /1.1 (v676): same dimensions and values; adds the clarifications below (coherence vs naturalness, usefulness) and
// renders the review context — so model evaluators and native reviewers judge with the SAME definitions and context
const RUBRIC_VERSION = 'tt-eval-rubric/1.1'
const DIMENSIONS = Object.freeze({
  grammar:     { values: ['ok', 'error'], question: 'Is the sentence grammatical and morphologically correct (particles, classifiers / measure words, verb forms, word order)?' },
  naturalness: { values: ['natural', 'marginal', 'unnatural'], question: 'Would a native speaker plausibly say this, in this situation? marginal = understandable but odd or stilted.' },
  targetUsage: { values: ['correct', 'wrong-sense', 'wrong-form', 'absent', 'n/a'], question: 'Is the TARGET word present and used in its intended sense and a correct form?' },
  cue:         { values: ['match', 'mismatch', 'n/a'], question: 'If a learner followed the cue / English, would they produce this sentence (same meaning)? n/a when no cue is given.' },
  qa:          { values: ['answers', 'does-not-answer', 'n/a'], question: 'For a question→reply exchange: does the reply answer the question asked (right type: time for "when", reason for "why", amount for "how much")?' },
  coherence:   { values: ['coherent', 'incoherent', 'n/a'], question: 'Do the turns make sense together as a conversation (logic, facts, chronology)? n/a for a single sentence.' },
  register:    { values: ['ok', 'error', 'n/a'], question: 'Are politeness, speech level and speaker-gendered forms right for the stated speaker and relationship?' },
  usefulness:  { values: ['useful', 'weak', 'not-useful'], question: 'Would this teach the target word well to a learner at this level (a real, reusable communicative use)?' },
})
const ERROR_CATEGORIES = Object.freeze({
  GRAMMAR_MORPHOLOGY: 'wrong particle / inflection / 的-得 / verb form',
  GRAMMAR_WORD_ORDER: 'word order error',
  MISSING_ARGUMENT: 'a required object / complement / verb is missing (e.g. 跟 with no object, 想 + 可以 with no verb)',
  SELECTIONAL_MISMATCH: 'words that cannot combine in meaning (money "big", milk "funny", a movie you "want" as 欲しい)',
  WRONG_SENSE: 'the target is used in a sense other than the intended one',
  CLASSIFIER_ERROR: 'wrong classifier / measure word',
  TENSE_ASPECT_CONFLICT: 'time reference conflicts with mood / aspect (let\'s go … yesterday; もう … 買わなかった)',
  QA_TYPE_MISMATCH: 'the reply gives the wrong type of answer (a day for "what time")',
  NON_ANSWER: 'the reply does not answer the question at all',
  TOPIC_JUMP: 'unmotivated change of topic',
  CUE_MISMATCH: 'cue / English does not lead to this sentence',
  REGISTER_GENDER_PARTICLE: 'a speaker uses the other gender\'s particle / pronoun',
  REGISTER_POLITENESS: 'wrong politeness / speech level for the relationship',
  TEMPLATE_FRAGMENT: 'a mechanical template / fragment nobody would say alone',
  UNIDIOMATIC: 'grammatical but not how it is said',
  REDUNDANT_DUPLICATE: 'repeats another item\'s construction with no new function',
})
const CLARIFICATIONS = Object.freeze({
  coherence: 'Judge MEANING across the turns: does the reply connect to what was said AND does the exchange make sense (logic, facts, time)? A reply of the right form with absurd content ("Is the money big?" — "Very big.") is INCOHERENT. Phrasing alone belongs to naturalness.',
  usefulness: 'useful = a real, reusable way to use this word that a beginner needs · weak = correct but artificial, rare or low-value · not-useful = teaches something wrong, meaningless or misleading.',
  naturalness: 'Judge the wording only (would a native speaker say it like this in this situation?). Meaning problems across turns go to coherence.',
})
const LANG_NAME = { th: 'Thai', ja: 'Japanese', zh: 'Mandarin Chinese' }
function contextText(item) {
  const c = item.reviewContext
  if (!c) return item.context ? 'CONTEXT (previous turns): ' + item.context + '\n' : ''
  if (c.kind === 'listening') return 'CONTEXT: scene ' + (c.scene || '?') + (c.phase ? ' (' + c.phase + ')' : '') + (c.situation ? ': ' + c.situation : '') + '\n' +
    ((c.plannedTurnsOfThisScene || []).length ? 'Planned turns of this scene, in order:\n' + c.plannedTurnsOfThisScene.map(t => '  ' + t.turn + '. ' + t.text + ' (' + t.function.toLowerCase() + ')').join('\n') + '\n' : '') + (c.note ? c.note + '\n' : '')
  return 'CONTEXT: ' + (c.scene || '') + '\n' + ((c.otherSentencesForThisTarget || []).length ? 'Other sentences written for this word in the same lesson: ' + c.otherSentencesForThisTarget.join(' / ') + '\n' : '') + (c.note ? c.note + '\n' : '')
}
// ONE item → ONE prompt (temperature 0, JSON only). The evaluator never sees the expected verdicts.
function evaluatorPrompt(item) {
  const dims = Object.entries(DIMENSIONS).map(([k, d]) => '- ' + k + ' (' + d.values.join(' | ') + '): ' + d.question + (CLARIFICATIONS[k] ? ' ' + CLARIFICATIONS[k] : '')).join('\n')
  const turns = item.turns.map(t => '  ' + (t.speaker ? t.speaker + ': ' : '') + t.text + (t.english ? '   [English: ' + t.english + ']' : '')).join('\n')
  return 'You are an expert native-level evaluator of ' + LANG_NAME[item.language] + ' learning material for adult beginners (' + (item.level || 'early beginner') + ').\n' +
    'Judge the material below strictly and independently. Do not be lenient because it is for learners.\n\n' +
    'TARGET WORD: ' + item.target.surface + (item.target.gloss ? ' ("' + item.target.gloss + '")' : '') + '\n' +
    (item.speakers ? 'SPEAKERS: ' + item.speakers + '\n' : '') + (item.cue ? 'CUE given to the learner: "' + item.cue + '"\n' : '') +
    contextText(item) + 'MATERIAL (' + item.kind + '):\n' + turns + '\n\n' +
    'Give one verdict per dimension (use exactly one of the listed values):\n' + dims + '\n\n' +
    'Also list error categories that apply (from: ' + Object.keys(ERROR_CATEGORIES).join(', ') + ') and a one-sentence rationale.\n' +
    'Return ONLY JSON: {"grammar":"…","naturalness":"…","targetUsage":"…","cue":"…","qa":"…","coherence":"…","register":"…","usefulness":"…","errorCategories":["…"],"rationale":"…"}'
}
function validVerdict(v) {
  if (!v || typeof v !== 'object') return false
  return Object.entries(DIMENSIONS).every(([k, d]) => d.values.includes(v[k]))
}
module.exports = { RUBRIC_VERSION, DIMENSIONS, ERROR_CATEGORIES, CLARIFICATIONS, evaluatorPrompt, validVerdict }
