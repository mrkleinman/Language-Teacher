// v692 — controlled mock model for the meaning-first Listening pipeline. Plan / audit / repair replies are scripted;
// every other stage (final whole-conversation coherence, pronunciation metadata) goes to the tests14 mock.
'use strict'
const { mock: base14 } = require('../../tests14')
const { planJson, sceneJson } = require('./plans')
// opt: plan (rows; v694: each situation request gets its own rows) · scenePlan(key, st, prompt, replan) → rows | Error | '__truncated__' · audit(turnText, n) → verdict override · repair(scopeId, partText, q) → rows for that part ([speaker, intent, asks, about, text, english, pron?]) or '__truncated__' · repairRaw(q, st) → raw reply text ·
//      cohFail · down (network) · log (array to record stages)
function mockMeaningFirst(c, vocab, lang, opt = {}) {
  const S = { c, vocab, targets: [], zhLex: null }
  base14(S, lang, { cohFail: !!opt.cohFail, storyOnlyFail: !!opt.storyOnlyFail })
  const inner = S._mockFn, st = { stages: [], plan: 0, audit: 0, repair: 0, auditedTexts: [], scenes: [], calls: [] }
  c.mockGeminiGenerate = async (k, m, msgs, max, o) => {
    const q = msgs[msgs.length - 1].content, stage = o && o.stage
    st.stages.push(stage); st.calls.push({ stage, max, prompt: q })
    if (opt.down) throw new Error('Failed to fetch')
    if (stage === 'O_listening_meaning_plan') {
      // v694 — one request per situation ("PLAN SITUATION S3 of 6"): the reply is that situation's rows only
      st.plan++
      const key = (q.match(/^PLAN SITUATION (S\d+) of/m) || [])[1]
      const replan = /HAD THESE DEFECTS/.test(q)
      if (key) { st.scenes.push(key + (replan ? 'r' : ''))
        if (opt.scenePlan) { const ov = opt.scenePlan(key, st, q, replan); if (ov instanceof Error) throw ov; if (ov === '__truncated__') { const e = new Error('CLAUDE HAIKU REPLY REJECTED: MAX_TOKENS: the reply was cut off (6000 output tokens)'); throw e } if (ov) return JSON.stringify(sceneJson(ov, key)) } }
      const rows = typeof opt.plan === 'function' ? opt.plan(st.plan, q, key, replan) : opt.plan
      return JSON.stringify(key ? sceneJson(rows, key) : planJson(rows))
    }
    if (stage === 'O_listening_semantic_audit') {
      st.audit++
      const rows = [...q.matchAll(/^([★ ])(\d+)\. ([AB]) \[[^\]]*\] (.*?) — /gm)]
      const turns = rows.filter(r => r[1] === '★').map(r => { st.auditedTexts.push(r[4]); const ov = opt.audit ? opt.audit(r[4], +r[2], st) : null
        return ov === '__omit__' ? null : { n: +r[2], sense: 'ok', responds: 'ok', usage: 'natural', fault: 0, note: '', ...(ov || {}) } }).filter(Boolean)
      const sits = [...q.matchAll(/^S(\d+) — /gm)].map(r => ({ key: 'S' + r[1], coherent: true, transition: 'ok', note: '', ...((opt.scene && opt.scene('S' + r[1], st)) || {}) }))
      return JSON.stringify({ turns, situations: sits })
    }
    if (stage === 'O_listening_plan_repair') {
      st.repair++
      // v695: a repair reply can be cut off ('__truncated__' for any part → the whole reply is cut off) or be raw text (repairRaw)
      if (opt.repairRaw) { const raw = opt.repairRaw(q, st); if (raw != null) return raw }
      const parts = [...q.matchAll(/^\[(x\d+)\] (.*)$/gm)].map(r => ({ scope: r[1], head: r[2] }))
      const got = parts.map(p => ({ p, rows: (opt.repair && opt.repair(p.scope, p.head, q, st)) || [] }))
      if (got.some(g => g.rows === '__truncated__')) throw new Error('CLAUDE HAIKU REPLY REJECTED: MAX_TOKENS: the reply was cut off (' + max + ' output tokens)')
      return JSON.stringify({ parts: got.map(({ p, rows }) => ({ scope: p.scope, turns: rows.map(r => ({ speaker: r[0], addressee: r[0] === 'A' ? 'B' : 'A', intent: r[1], asks: r[2], referent: r[3],
        action: '', object: '', context: '', expects: '', respondsTo: 0, targetIds: [], text: r[4], english: r[5], ...(r[6] != null ? { pron: r[6] } : {}) })) })) })
    }
    return inner(k, m, msgs, max, o)
  }
  return st
}
module.exports = { mockMeaningFirst }
