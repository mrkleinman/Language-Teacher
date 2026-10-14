// Capture the real app's model requests (simulated replies) for one fixture, with the cue-clarity switch on or off.
const path = require('path'), fs = require('fs')
const DEV = '/home/user/Language-Teacher/dev'
const { runOnceUi, loadFixture } = require(DEV + '/benchmark/run')
const [fxId, arm, outFile] = process.argv.slice(2)
;(async () => {
  const fx = loadFixture(fxId), reqs = []
  const wrapFetch = (inner) => async (url, opts) => {
    try { const b = JSON.parse(opts.body)
      const sys = b.systemInstruction ? b.systemInstruction.parts.map(p => p.text).join('\n') : (b.system || '')
      const msgs = (b.contents || b.messages || []).map(m => ({ role: m.role, text: m.parts ? m.parts.map(p => p.text).join('\n') : (typeof m.content === 'string' ? m.content : JSON.stringify(m.content)) }))
      reqs.push({ seq: reqs.length + 1, url: String(url).replace(/key=[^&]+/, 'key=X'), system: sys, messages: msgs, maxTokens: b.generationConfig ? b.generationConfig.maxOutputTokens : b.max_tokens, json: !!(b.generationConfig && b.generationConfig.responseMimeType) })
    } catch (e) {}
    return inner(url, opts)
  }
  const r = await runOnceUi(fx, { mode: 'record', provider: 'sim', pipeline: 'production', wrapFetch, prepare: c => { if (arm === 'old') c.setCueClarity(false) } })
  fs.writeFileSync(outFile, JSON.stringify(reqs, null, 1))
  console.log(fxId, arm, 'requests', reqs.length, 'status', r.content && r.content.status)
})().catch(e => { console.error(e); process.exit(1) })
