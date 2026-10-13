// v692 — controlled mock model for the meaning-first Listening pipeline. Plan / audit / repair replies are scripted;
// every other stage (final whole-conversation coherence, pronunciation metadata) goes to the tests14 mock.
'use strict'
const { mock: base14 } = require('../../tests14')
const { planJson } = require('./plans')
// opt: plan (rows) · audit(turnText, n) → verdict override · repair(scopeId, partText, q) → rows for that part ·
//      cohFail · down (network) · log (array to record stages)
function mockMeaningFirst(c, vocab, lang, opt = {}) {
  const S = { c, vocab, targets: [], zhLex: null }
  base14(S, lang, { cohFail: !!opt.cohFail })
  const inner = S._mockFn, st = { stages: [], plan: 0, audit: 0, repair: 0, auditedTexts: [] }
  c.mockGeminiGenerate = async (k, m, msgs, max, o) => {
    const q = msgs[msgs.length - 1].content, stage = o && o.stage
    st.stages.push(stage)
    if (opt.down) throw new Error('Failed to fetch')
    if (stage === 'O_listening_meaning_plan') { st.plan++; return JSON.stringify(typeof opt.plan === 'function' ? opt.plan(st.plan, q) : planJson(opt.plan)) }
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
      const parts = [...q.matchAll(/^\[(x\d+)\] (.*)$/gm)].map(r => ({ scope: r[1], head: r[2] }))
      return JSON.stringify({ parts: parts.map(p => ({ scope: p.scope, turns: ((opt.repair && opt.repair(p.scope, p.head, q, st)) || []).map(r => ({ speaker: r[0], addressee: r[0] === 'A' ? 'B' : 'A', intent: r[1], asks: r[2], referent: r[3],
        action: '', object: '', context: '', expects: '', respondsTo: 0, targetIds: [], text: r[4], english: r[5] })) })) })
    }
    return inner(k, m, msgs, max, o)
  }
  return st
}
module.exports = { mockMeaningFirst }
