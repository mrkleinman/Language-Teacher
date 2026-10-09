// Gemini REST simulator + fixture groups (shared by cost_audit.js and tests13.js).
// Replaces fetch at the network boundary: every request still goes through the app's own
// Gemini client, retry policy and telemetry.
function fixtureGroups(track) {
  const IMPROVED = { 3:'ซึ่ง', 4:'ซึ่ง', 5:'ซึ่ง', 9:'นอกจาก', 10:'นอกจาก', 38:'เนื้อ', 39:'เนื้อ', 67:'หมายถึง', 68:'หมายถึง' }
  const g = new Map()
  track.pairs.forEach((p, i) => { const t = IMPROVED[i + 1] || p._target; if (!t || t === 'greeting' || t === 'parting') return
    if (!g.has(t)) g.set(t, []); g.get(t).push({ speaker: p.speaker, thai: p.thai, english: p.english, prompt: p.prompt, ok: true, glosses: [] }) })
  return g
}
// Gemini REST simulator. mode: 'clean' | 'retry' (every generation attempt fails validation) | 'rewrite' (QC asks to replace every group) | '402'
function simulator(c, groups, mode, stats) {
  const reply = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body })
  return async (url, opts) => {
    if (!/generativelanguage\.googleapis\.com/.test(String(url))) throw new Error('unexpected network: ' + url)
    const model = (String(url).match(/models\/([^:]+):/) || [])[1]
    stats.models[model] = (stats.models[model] || 0) + 1; stats.fetches = (stats.fetches || 0) + 1
    const body = JSON.parse(opts.body), q = body.contents.map(x => x.parts.map(p => p.text).join('')).join('\n')
    if (mode === '402') return reply(402, { error: { code: 402, message: 'Your prepayment credits are depleted. Please go to AI Studio at https://ai.studio/projects to manage your project and billing.' } })
    let text = '[]'
    const nums = re => [...q.matchAll(re)].map(m => +m[1])
    if (/You design Thai language lesson scenarios/.test(q)) text = JSON.stringify({ scene: 'Two friends at a food market.', characterA: 'Somchai, a Thai man', characterB: 'Nida, a Thai woman',
      opening: 'สวัสดีครับ', opening_phonetic: 'sà-wàt-dii khráp', opening_english: 'Hello.', opening_prompt: 'Somchai greets Nida', reply: 'สวัสดีค่ะ', reply_phonetic: 'sà-wàt-dii khâ', reply_english: 'Hello.',
      reply_prompt: 'Nida greets him', closing: 'แล้วเจอกันครับ', closing_phonetic: 'lâeo joe kan khráp', closing_english: 'See you later.', closing_prompt: 'Somchai says goodbye',
      closing_reply: 'แล้วเจอกันค่ะ', closing_reply_phonetic: 'lâeo joe kan khâ', closing_reply_english: 'See you later.', closing_reply_prompt: 'Nida says goodbye' })
    else if (/You write Pimsleur-style Thai lessons/.test(q)) {
      const t = (q.match(/The target word for this exchange is: (.+)\n/) || [])[1]
      if (!stats.firstGenPrompt) stats.firstGenPrompt = q
      stats.genAttempts[t] = (stats.genAttempts[t] || 0) + 1
      text = mode === 'retry' ? JSON.stringify([{ speaker: 'A', thai: 'ครับ', english: 'x', prompt: 'x' }]) : JSON.stringify((groups.get(t) || []).slice(0, 3))
    }
    else if (/Rate how well each Thai sentence matches its prompt/.test(q)) text = JSON.stringify(nums(/^(\d+)\. Prompt:/gm).map(i => ({ i, s: 5 })))
    else if (/native Thai speaker checking learner material/.test(q)) text = JSON.stringify(nums(/^(\d+)\. Thai:/gm).map(i => ({ i, s: 5, note: 'ok' })))
    else if (/Evaluate this Thai language learning group/.test(q)) text = JSON.stringify(mode === 'rewrite' ? { action: 'replace', reason: 'harness: rewrite all' } : { action: 'clean', reason: 'ok' })
    else if (/Generate 3 replacement Thai learning pairs|Fix this Thai learning group/.test(q)) {
      const t = (q.match(/Target word: "([^"]+)"/) || [])[1]
      text = JSON.stringify((groups.get(t) || []).slice(0, 3))
    }
    else if (/Re-romanize each Thai sentence/.test(q)) text = JSON.stringify(nums(/^(\d+)\. Thai:/gm).map(n => ({ n, ph: 'sà-wàt-dii khráp' })))
    else if (/Segment this Thai sentence/.test(q)) { stats.segInputs.push((q.match(/Thai: (.+)/) || [])[1]); text = JSON.stringify([{ p: 'ผม', e: 'I', ph: 'phǒm' }, { p: 'ไป', e: 'go', ph: 'pai' }, { p: 'ครับ', e: '[m]', ph: 'khráp' }]) }
    else if (/Fill every empty "e"/.test(q)) { const inp = (q.match(/Input: (\[.*\])\n/) || [])[1] || '[]'; stats.glossInputs.push(inp.length <= 2 ? 0 : JSON.parse(inp).length); text = inp }
    else if (/Judge this short scene/.test(q)) text = JSON.stringify({ A: 5, B: 5, C: 5, D: 5, E: 5, brokenAtPair: null, reason: 'ok' })
    else if (/Judge the WHOLE listening track/.test(q)) text = JSON.stringify({ scenes: [...q.matchAll(/^Scene (\d+)/gm)].map(m => ({ scene: +m[1], pass: true, breakAfterLine: null, reason: 'ok' })), overall: 5, reason: 'ok' })
    else if (/ONE line of Thai listening practice/.test(q)) text = 'no idea'
    // v656: the fresh Listening conversation — written from the fixture's own sentences (ln_mock)
    else if (/Write ONE natural .* LISTENING conversation|REVISE this .* LISTENING conversation locally|Write SCENE \S+ .* LISTENING conversation|REPAIR SCENE \S+ of a .* LISTENING conversation|ATOMIC REPAIR of .* LISTENING lines/.test(q)) text = require('./ln_mock').lnRespond(q, [...groups.values()].flat()) || '[]'
    const est = c.aiEstimateTokens || (x => Math.ceil(String(x).length / 3))
    const usageMetadata = { promptTokenCount: est(q), candidatesTokenCount: est(text) }
    usageMetadata.totalTokenCount = usageMetadata.promptTokenCount + usageMetadata.candidatesTokenCount
    return reply(200, { candidates: [{ content: { parts: [{ text }] } }], usageMetadata })
  }
}
module.exports = { fixtureGroups, simulator }
