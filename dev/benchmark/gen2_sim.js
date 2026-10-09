// v678 — SIMULATED answers to the Gen2 (shadow pilot) prompts. MECHANICS ONLY: template sentences from the test
// suite's simulator (tests14 FR templates). They exercise teachability, deferral, freezing, composition, acceptance,
// scene planning and accounting deterministically; they say NOTHING about teaching quality.
//   opts.declineTargets   [surface]  generator says "not teachable"
//   opts.judgeReject      [substring] judge marks matching sentences unnatural
//   opts.judgeGarbage     true        judge replies with unusable text (→ nothing accepted)
//   opts.sceneReject      [scene no.] scene judge rejects every attempt of these scenes
'use strict'
const { sentence } = require('../tests14')
const FIELD = { th: 'thai', ja: 'japanese', zh: 'chinese' }
const FUNCS = ['state a liking', 'describe', 'ask', 'ask where', 'say you have', 'say you do not have', 'suggest', 'answer']
function cands(S, lang, t) {
  const out = []
  for (let k = 0; k < 3; k++) { try { out.push(sentence(S, lang, t, 'gen', k)) } catch (e) {} }
  for (let k = 0; k < 4; k++) { try { out.push(sentence(S, lang, t, 'rec', k)) } catch (e) {} }
  return out.filter(Boolean)
}
let NO_CHAN = false   // set per request: the prompt says ฉัน is not taught, so the woman leaves out "I" (as instructed)
const textOf = (lang, s) => { const t = s[FIELD[lang]] || s.thai; return lang === 'th' && NO_CHAN ? t.replace(/ฉัน/g, '') : t }
// v678.1: Gen2 asks for a reading + romaji per Japanese candidate; the simulator supplies the dictionary's (mechanics only)
function simReading(S, s) {
  const c = S.c, inv = S.jaInv || (S.jaInv = c.japaneseLearnerInventory(S.vocab, S.targets || []))
  const r = c.rebuildJapaneseReadingPipeline({ japanese: s.japanese }, inv).reading
  return { reading: r, romaji: c.kanaToRomaji(r) }
}
function gen2SimReply(q, S, lang, opts) {
  opts = opts || {}
  NO_CHAN = /ฉัน is not taught yet/.test(q)
  const task = (/^\[task: ([\w-]+)/.exec(q) || [])[1]
  const byField = S.byField
  if (task === 'gen2-daily-probe') {
    const surf = (/TARGET WORD: (.+?) — "/.exec(q) || [])[1]
    const t = byField.get(surf)
    if (!t) return JSON.stringify({ teachable: false, reason: 'sim: unknown target', candidates: [] })
    if ((opts.declineTargets || []).includes(surf)) return JSON.stringify({ teachable: false, reason: 'sim: declined', candidates: [] })
    const second = /ALREADY REJECTED|ALREADY ACCEPTED/.test(q)
    const cs = cands(S, lang, t).slice(second ? 3 : 0, second ? 7 : 6)
    return JSON.stringify({ teachable: true, reason: '', candidates: cs.map((s, i) => ({ function: FUNCS[(i + (second ? 3 : 0)) % FUNCS.length], situation: 'sim',
      cue: 'Tell your friend about item ' + t.id + ' in situation ' + (i + (second ? 3 : 0)) + '.', text: textOf(lang, s), english: s.english,
      speaker: lang === 'th' ? (s.speaker === 'B' ? 'female' : 'male') : 'either', ...(lang === 'ja' ? simReading(S, s) : {}) })) })
  }
  if (task === 'gen2-daily-judge' || task === 'gen2-listen-judge-exchange') {
    if (opts.judgeGarbage) return 'I think these are fine.'
    const items = [...q.matchAll(/^(\d+)\. (.*)$/gm)]
    return JSON.stringify({ items: items.map(m => { const bad = (opts.judgeReject || []).some(r => m[2].includes(r))
      return task === 'gen2-daily-judge'
        ? { n: +m[1], grammar: 'ok', natural: bad ? 'unnatural' : 'natural', translation: 'accurate', target: 'correct', cue: 'useful', speaker: 'ok', useful: 'useful', fragment: false, note: bad ? 'sim reject' : '' }
        : { n: +m[1], grammar: 'ok', natural: bad ? 'unnatural' : 'natural', translation: 'accurate', target: 'correct', responds: 'yes', note: '' } }) })
  }
  if (task === 'gen2-listen-probe') {
    const ts = [...q.matchAll(/^- (.+?) — "/gm)].map(m => m[1]).filter(x => byField.has(x))
    return JSON.stringify({ exchanges: ts.map(surf => { const t = byField.get(surf), c = cands(S, lang, t)
      const a = c[0], b = c[1]
      const sa = lang === 'th' ? (a.speaker || 'A') : 'A', sb = sa === 'A' ? 'B' : 'A'
      if ((opts.declineTargets || []).includes(surf)) return { target: surf, possible: false, turns: [] }
      return { target: surf, possible: true, kind: 'statement-reaction', turns: [{ speaker: sa, text: textOf(lang, a), english: a.english }, { speaker: sb, text: textOf(lang, b), english: b.english }] } }) })
  }
  if (task === 'gen2-scene-plan') {
    const ws = [...q.matchAll(/^- (.+?) — "/gm)].map(m => m[1])
    const n = Math.min(5, Math.max(3, Math.ceil(ws.length / 8))), per = Math.ceil(ws.length / n)
    return JSON.stringify({ story: 'sim: two friends spend an afternoon together', scenes: Array.from({ length: n }, (_, i) => ({ title: 'Scene ' + (i + 1), situation: 'sim situation ' + (i + 1), words: ws.slice(i * per, (i + 1) * per) })).filter(s => s.words.length) })
  }
  if (task === 'gen2-scene') {
    const block = (q.split('WORDS THIS SCENE MUST USE')[1] || '').split('ALLOWED WORDS')[0]
    const ws = [...block.matchAll(/^- (.+?) — "/gm)].map(m => m[1]).filter(x => byField.has(x))
    const lines = []
    ws.forEach(surf => { const t = byField.get(surf), c = cands(S, lang, t)
      // Thai sim templates carry the speaker's own particle; JA / ZH alternate A / B
      const a = c[0], b = c[1]
      const sa = lang === 'th' ? (a.speaker === 'B' ? 'B' : 'A') : (lines.length % 2 ? 'B' : 'A')
      if (lines.length && lines[lines.length - 1].speaker === sa) {
        // keep A/B alternation: use the other template first
        lines.push({ speaker: sa === 'A' ? 'B' : 'A', text: textOf(lang, b), english: b.english }); lines.push({ speaker: sa, text: textOf(lang, a), english: a.english })
      } else { lines.push({ speaker: sa, text: textOf(lang, a), english: a.english }); lines.push({ speaker: sa === 'A' ? 'B' : 'A', text: textOf(lang, b), english: b.english }) }
    })
    return JSON.stringify({ lines })
  }
  if (task === 'gen2-scene-judge') {
    const sceneNo = +((/^THIS SCENE: Scene (\d+)/m.exec(q) || [])[1] || 0)
    const n = [...((q.split('SCENE LINES:')[1] || '').matchAll(/^(\d+)\. /gm))].length
    const bad = (opts.sceneReject || []).includes(sceneNo)
    return JSON.stringify({ lines: Array.from({ length: n }, (_, i) => ({ n: i + 1, grammar: 'ok', natural: bad && i === 0 ? 'unnatural' : 'natural', translation: 'accurate', answered: 'n/a', note: '' })), scene: { coherent: 'yes', transition: 'yes', note: '' } })
  }
  return null
}
module.exports = { gen2SimReply }
