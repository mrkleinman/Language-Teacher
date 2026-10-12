// A scripted stand-in for the model, for OFFLINE pipeline tests only. It answers the v684 plan / generate / judge / repair
// requests from the reference fixtures (designed by Claude, not Gemini output) and can be told to misbehave, so the gate,
// the repair loop and the honest stop can be exercised without paid calls. It never claims anything about Gemini quality.
'use strict'
function scriptedEngine(lang, ref, opts) {
  opts = opts || {}
  const byTarget = new Map(ref[lang].map(t => [t.target.surface, t]))
  const exStore = new Map()                 // exchange id → reference recall (for the generate step)
  const sent = []
  let exSeq = 0
  const bad = new Set(opts.badLines || [])  // "surface#k" → the generated target line is replaced by opts.badText(surface,k)
  return { sent, async ask(stage, prompt) {
    sent.push({ stage, prompt })
    if (stage === 'V684_plan') {
      // the targets and their three planned function ids, read back from the prompt
      const tg = [...prompt.matchAll(/^- "([^"]+)" — teach the sense:.*\n\s+its 3 recalls use these 3 different functions: (.*)$/gm)].map(m => ({ surface: m[1], fns: [...m[2].matchAll(/\d\) ([^ ]+) = /g)].map(x => x[1]) }))
      const exchanges = []
      tg.forEach(t => {
        const r = byTarget.get(t.surface); if (!r) return
        r.recalls.forEach((rc, i) => {
          const id = 'e' + (++exSeq); exStore.set(rc.intent.situation + '|' + t.surface, { t: r, rc, fn: t.fns[i] })
          exchanges.push({ id, situation: rc.intent.situation, lines: rc.exchange.map(x => ({ voice: x.voice, role: x.role, addressee: x.target ? rc.intent.addressee : (rc.exchange.find(y => y.target) || {}).role,
            relation: rc.intent.relation === 'polite-friendly' ? 'friend' : rc.intent.relation, target: x.target ? t.surface : '', recall: rc.k, functionId: x.target ? t.fns[i] : '', sense: rc.sense, purpose: x.target ? rc.intent.purpose : 'replies to the previous line in this exchange' })) })
        })
      })
      if (opts.planMutate) opts.planMutate(exchanges)
      return { exchanges }
    }
    if (stage === 'V684_generate') {
      // the model has no memory: each exchange is recognised from the prompt itself (its situation and target)
      const blocks = prompt.split(/^EXCHANGE /m).slice(1).map(b => ({ id: b.split(' ')[0], situation: (b.match(/— situation: (.*)/) || [])[1], target: (b.match(/TARGET "([^"]+)"/) || [])[1] }))
      return { exchanges: blocks.map(bk => { const id = bk.id, s = exStore.get(bk.situation + '|' + bk.target); if (!s) return { id, lines: [] }; return { id, lines: s.rc.exchange.map(x => {
        const key = s.t.target.surface + '#' + s.rc.k, isBad = x.target && bad.has(key)
        return { text: isBad ? opts.badText(s.t.target.surface, s.rc.k) : x.text, english: x.en, cue: x.cue || 'Reply to what was just said.', reading: x.reading, romaji: x.romaji }
      }) } }) }
    }
    if (stage === 'V684_judge') {
      const ids = [...prompt.matchAll(/^\s+\[([^\]]+)\] /gm)].map(m => m[1])
      return { items: ids.filter(id => !(opts.judgeSkip || []).includes(id)).map(id => ({ id, sense: true, grammar: true, natural: true, cue: true, meaning: true, intent: true, distinct: true, coherence: true, note: '' })) }
    }
    if (stage === 'V684_repair') {
      if (opts.repair) return opts.repair(prompt)
      return null
    }
    throw new Error('unexpected stage ' + stage)
  } }
}
module.exports = { scriptedEngine }
