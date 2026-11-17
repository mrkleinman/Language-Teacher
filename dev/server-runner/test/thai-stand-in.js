// Canned replies for the Thai prompts of a Daily / Revision track, for the stand-in model (test/fake-model-server.js `handlers`). The replies are small fixed frames
// around the target word the prompt names, so the app's OWN validators, closed-vocabulary gate, judges' parsing and recovery run for real; only the model is absent.
// A prompt this file does not know is answered by the stand-in's schema-built fallback and counted in `seen.unhandled` so a test can say what was not covered.
'use strict'

const gloss = q => { const m = /INTENDED SENSE of "[^"]+": ([^\n]*?)(?: —|\.|\n|$)/.exec(q); return m ? m[1].trim() : 'it' }
const first = g => String(g || 'it').split(/[,;/(]/)[0].replace(/^to\s+/, '').trim() || 'it'

const FRAMES = [
  ['A', 'ผมชอบ{T}มากครับ', 'I really like {g}.', 'He says he really likes {g}'],
  ['B', 'ฉันชอบ{T}ค่ะ', 'I like {g} too.', 'She says she likes {g} too'],
  ['A', '{T}ดีมากครับ', '{g} is very good.', 'He says {g} is very good'],
]

function thaiHandlers(seen) {
  seen = seen || { unhandled: [], handled: {} }
  const hit = k => { seen.handled[k] = (seen.handled[k] || 0) + 1 }
  const list = []
  // scene design
  list.push(ctx => {
    if (!/You design Thai language lesson scenarios/.test(ctx.q)) return undefined
    hit('scene')
    return JSON.stringify({ scene: 'Two friends chat about everyday things at a market. They help each other with small plans.', characterA: 'Somchai, a Thai man', characterB: 'Nida, a Thai woman',
      nameA_th: 'สมชาย', nameB_th: 'นิดา',
      opening: 'สวัสดีครับ', opening_phonetic: 'sà-wàt-dii khráp', opening_english: 'Hello.', opening_prompt: 'Somchai greets Nida',
      reply: 'สวัสดีค่ะ', reply_phonetic: 'sà-wàt-dii khâ', reply_english: 'Hello.', reply_prompt: 'Nida greets him back',
      closing: 'แล้วเจอกันครับ', closing_phonetic: 'láew jəə kan khráp', closing_english: 'See you later.', closing_prompt: 'Somchai says goodbye to Nida',
      closing_reply: 'แล้วเจอกันค่ะ', closing_reply_phonetic: 'láew jəə kan khâ', closing_reply_english: 'See you later.', closing_reply_prompt: 'Nida says goodbye to him' })
  })
  // the greeting / parting pair
  list.push(ctx => {
    if (!/Reply ONLY with JSON: \{"a":\{"thai"/.test(ctx.q)) return undefined
    hit('framing')
    const part = /parting|goodbye|farewell|END of a chat|CLOSE/i.test(ctx.q.slice(-1800)) && !/at the START of a chat/.test(ctx.q.slice(-1800))
    return JSON.stringify(part ? { a: { thai: 'แล้วเจอกันครับ', english: 'See you later.', cue: 'Say goodbye to Nida and say you will see her again' }, b: { thai: 'แล้วเจอกันค่ะ', english: 'See you later.', cue: 'Say goodbye to him' } }
      : { a: { thai: 'สวัสดีครับ', english: 'Hello.', cue: 'Greet Nida and say hello' }, b: { thai: 'สวัสดีค่ะ', english: 'Hello.', cue: 'Greet him back' } })
  })
  // mini-scene plan: every target id once, five to a scene
  list.push(ctx => {
    if (!/Group these target words into 2.7 MINI-SCENES/.test(ctx.q)) return undefined
    hit('scene-plan')
    const ids = [...ctx.q.matchAll(/^(\d+): .+ = .+\[domain:/gm)].map(m => +m[1])
    const scenes = []
    for (let i = 0; i < ids.length; i += 5) scenes.push({ purpose: 'everyday talk ' + (scenes.length + 1), localPremise: 'A and B are chatting at a market.', location: 'a market', immediateGoal: 'to chat', targetIds: ids.slice(i, i + 5) })
    return JSON.stringify({ scenes })
  })
  // a three-line exchange for one target word
  list.push(ctx => {
    if (!/You write Pimsleur-style Thai lessons/.test(ctx.q)) return undefined
    const m = /The target word for this exchange is: ([^\n]+)/.exec(ctx.q); if (!m) return undefined
    hit('generation')
    const T = m[1].trim(), g = first(gloss(ctx.q))
    return JSON.stringify(FRAMES.map(f => ({ speaker: f[0], thai: f[1].replace('{T}', T), english: f[2].replace('{g}', g), prompt: f[3].replace(/\{g\}/g, g), ok: true, glosses: [] })))
  })
  // judges: every candidate is rated top marks (the app's own deterministic validators still decide what they decide)
  list.push(ctx => {
    if (!/Rate how well each Thai sentence matches its prompt description/.test(ctx.q)) return undefined
    hit('cue-check')
    const ns = [...ctx.q.matchAll(/^(\d+)\. Prompt:/gm)].map(m => +m[1])
    return JSON.stringify(ns.map(i => ({ i, s: 5, thaiEnglishMatch: true, cueRepair: null })))
  })
  list.push(ctx => {
    if (!/native Thai speaker checking learner material/.test(ctx.q)) return undefined
    hit('naturalness')
    const ns = [...ctx.q.matchAll(/^(\d+)\. Thai:/gm)].map(m => +m[1])
    return JSON.stringify(ns.map(i => ({ i, s: 5, note: 'ok', wrongSense: false, issue: null, construction: '', alternative: '' })))
  })
  list.push(ctx => {
    if (!/Evaluate this Thai language learning group/.test(ctx.q) && !/^Target word: ".*Sentences:/s.test(ctx.q)) return undefined
    hit('group-eval'); return JSON.stringify({ action: 'clean', reason: 'ok' })
  })
  // the bridge line between two exchanges, and the English / cue fixes
  list.push(ctx => {
    if (!/Reply ONLY with JSON: \{"bridges":/.test(ctx.q)) return undefined
    hit('bridges')
    const gaps = [...ctx.q.matchAll(/^GAP (\d+) — bridge speaker (A|B)/gm)]
    return JSON.stringify({ bridges: gaps.map(g => g[2] === 'A' ? { gap: +g[1], thai: 'ได้ครับ', english: 'Okay.', cue: 'Tell her okay' } : { gap: +g[1], thai: 'ได้ค่ะ', english: 'Okay.', cue: 'Tell him okay' }) })
  })
  list.push(ctx => { if (!/Reply ONLY with JSON: \{"fixes":/.test(ctx.q)) return undefined; hit('fixes'); return JSON.stringify({ fixes: [] }) })
  // a replacement / improved group of three
  list.push(ctx => {
    const m = /(?:Generate 3 replacement Thai learning pairs|Fix this Thai learning group)[^\n]*?Target word: "([^"]+)"/s.exec(ctx.q) || (/Generate 3 replacement Thai learning pairs\. Target word: "([^"]+)"/.exec(ctx.q))
    if (!m) return undefined
    hit('replace')
    const T = m[1], g = first(gloss(ctx.q))
    return JSON.stringify(FRAMES.map(f => ({ speaker: f[0], thai: f[1].replace('{T}', T), phonetic: '', english: f[2].replace('{g}', g), prompt: f[3].replace(/\{g\}/g, g), words: [{ p: T, e: g }, { p: f[0] === 'A' ? 'ครับ' : 'ค่ะ', e: '-' }] })))
  })
  // quota recovery: N new sentences, each with the target
  const REC = [['A', 'ผมชอบ{T}มากครับ', 'I really like {g}.', 'Say you really like {g}.'], ['B', 'ฉันชอบ{T}ค่ะ', 'I like {g} too.', 'Say you like {g} too.'], ['A', '{T}ดีมากครับ', '{g} is very good.', 'Say {g} is very good.'],
    ['B', 'ฉันมี{T}ค่ะ', 'I have {g}.', 'Say you have {g}.'], ['A', 'ผมไม่มี{T}ครับ', 'I do not have {g}.', 'Say you do not have {g}.'], ['B', '{T}ก็ดีค่ะ', '{g} is good too.', 'Say {g} is good too.'],
    ['A', 'ผมอยากได้{T}ครับ', 'I want {g}.', 'Say you want {g}.'], ['B', '{T}ดีไหมคะ', 'Is {g} good?', 'Ask if {g} is good.']]
  list.push(ctx => {
    if (!/Return ONLY a JSON array: \[\{"targetId":/.test(ctx.q)) return undefined
    const n = +((/Write (\d+) NEW natural spoken Thai sentences/.exec(ctx.q) || [])[1] || 4)
    const id = +((/"targetId":(\d+)/.exec(ctx.q) || [])[1] || 0), T = (/"targetSurfaceUsed":"([^"]+)"/.exec(ctx.q) || [])[1], g = first((/TARGET WORD: "[^"]+" = ([^\n]+)/.exec(ctx.q) || [])[1])
    if (!T) return undefined
    hit('recovery')
    return JSON.stringify(Array.from({ length: n }, (_, k) => { const f = REC[k % REC.length]; return { targetId: id, targetSurfaceUsed: T, speaker: f[0], thai: f[1].replace('{T}', T), english: f[2].replace('{g}', g), prompt: f[3].replace(/\{g\}/g, g) } }))
  })
  // anything else: counted
  list.push(ctx => { const k = (ctx.user || ctx.q).replace(/\s+/g, ' ').slice(-140); if (!seen.unhandled.some(x => x.k === k)) seen.unhandled.push({ k, n: 1 }); return undefined })
  return list
}

module.exports = { thaiHandlers }
