// Offline proof for the optional Claude Haiku generation model: replay a recorded LIVE Gemini Daily run with the app's
// generation requests routed to /api/anthropic, answered by a stand-in for the site's server function that returns the
// SAME recorded text in the Messages API shape (thinking block + text block + usage). Judges, pronunciation and
// segmentation still go to the Gemini recording unchanged. If the provider switch is a pure transport change, the
// learner-facing track is identical and every recorded request is used exactly once. No network, no model.
//   haikuReplayWrap(cassette, { thinkingTokens, mutate }) → { wrapFetch, stats }
//   mutate(text, prompt) lets a test corrupt what "Haiku" returns (to prove the same QC rejects it).
'use strict'
const { promptTextOf } = require('../benchmark/lib/cassette')
const squash = s => String(s || '').replace(/\s+/g, '')

function haikuReplayWrap(cassette, o) {
  o = o || {}
  const thinkingTokens = o.thinkingTokens == null ? 120 : o.thinkingTokens
  const byPrompt = new Map()
  cassette.entries.forEach(e => { const k = squash(promptTextOf(JSON.stringify(e.request))); if (!byPrompt.has(k)) byPrompt.set(k, []); byPrompt.get(k).push(e) })
  const taken = new Set()
  const stats = { anthropic: 0, gemini: 0, accessHeaders: new Set(), bodies: [], unmatched: [] }
  const wrapFetch = (replayFetch) => async (url, opts) => {
    if (String(url) !== '/api/anthropic') { stats.gemini++; return replayFetch(url, opts) }
    stats.anthropic++
    stats.accessHeaders.add(opts.headers['x-lt-access'])
    const body = JSON.parse(opts.body)
    stats.bodies.push(body)
    const prompt = [body.system || ''].concat(body.messages.map(m => m.content)).join('')
    const q = byPrompt.get(squash(prompt)) || []
    const e = q.find(x => !taken.has(x.seq))
    if (!e) { stats.unmatched.push(prompt.slice(0, 160)); return { ok: false, status: 400, json: async () => ({ type: 'error', error: { type: 'invalid_request_error', message: 'HAIKU_REPLAY: prompt not in recording' } }) } }
    taken.add(e.seq)
    // consume the recorded entry through the real replayer (so faithfulness/unused accounting stays exact)
    let res
    try { res = await replayFetch('https://generativelanguage.googleapis.com/v1beta/models/' + e.model + ':generateContent?key=REPLAY', { method: 'POST', body: JSON.stringify(e.request) }) }
    catch (err) { throw err }                                             // a recorded network failure → the same failure
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      const type = res.status === 429 ? 'rate_limit_error' : res.status >= 500 ? 'api_error' : 'invalid_request_error'
      return { ok: false, status: res.status, json: async () => ({ type: 'error', error: { type, message: (data && data.error && data.error.message) || 'HTTP ' + res.status } }) }
    }
    let text = ((((data || {}).candidates || [])[0] || {}).content || {}).parts ? data.candidates[0].content.parts.map(p => p.text || '').join('') : ''
    if (o.mutate) text = o.mutate(text, prompt)
    const fmt = body.output_config && body.output_config.format
    if (fmt && fmt.schema && fmt.schema.properties && fmt.schema.properties.items && fmt.schema.required && fmt.schema.required[0] === 'items' && Object.keys(fmt.schema.properties).length === 1) {
      let v; try { v = JSON.parse(text) } catch (x) { v = text }
      text = JSON.stringify({ items: v })                                    // structured output with a wrapped (non-object) root
    }
    const u = (data && data.usageMetadata) || {}
    const out = (u.candidatesTokenCount || 0) + thinkingTokens
    return { ok: true, status: 200, json: async () => ({ id: 'msg_replay_' + e.seq, type: 'message', role: 'assistant', model: body.model,
      content: [{ type: 'thinking', thinking: '', signature: 'sig' }, { type: 'text', text }], stop_reason: 'end_turn', stop_details: null,
      usage: { input_tokens: u.promptTokenCount || 0, output_tokens: out, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, output_tokens_details: { thinking_tokens: thinkingTokens } } }) }
  }
  return { wrapFetch, stats }
}

// The same idea with the SIMULATED model (benchmark sim provider, mechanics only): /api/anthropic requests are answered by
// the simulator through the recorder (so a simulated Haiku-routed run is directly comparable with a simulated Gemini run),
// and mutate() can corrupt what "Haiku" writes.
function haikuSimWrap(o) {
  o = o || {}
  const stats = { anthropic: 0, gemini: 0, mutated: 0 }
  const wrapFetch = (innerFetch) => async (url, opts) => {
    if (String(url) !== '/api/anthropic') { stats.gemini++; return innerFetch(url, opts) }
    stats.anthropic++
    const body = JSON.parse(opts.body)
    const prompt = [body.system || ''].concat(body.messages.map(m => m.content)).filter(Boolean).join('\n')
    const res = await innerFetch('https://generativelanguage.googleapis.com/v1beta/models/sim-haiku:generateContent?key=SIM',
      { method: 'POST', body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: {} }) })
    const data = await res.json().catch(() => null)
    let text = data && data.candidates ? data.candidates[0].content.parts.map(p => p.text || '').join('') : ''
    if (o.mutate) { const t2 = o.mutate(text, prompt); if (t2 !== text) stats.mutated++; text = t2 }
    const fmt = body.output_config && body.output_config.format
    if (fmt && fmt.schema && fmt.schema.properties && fmt.schema.properties.items && Object.keys(fmt.schema.properties).length === 1) { let v; try { v = JSON.parse(text) } catch (x) { v = text } text = JSON.stringify({ items: v }) }
    return { ok: true, status: 200, json: async () => ({ id: 'msg_sim', type: 'message', role: 'assistant', model: body.model, content: [{ type: 'text', text }], stop_reason: 'end_turn',
      usage: { input_tokens: Math.ceil(prompt.length / 3), output_tokens: Math.ceil(text.length / 3) + 50, output_tokens_details: { thinking_tokens: 50 } } }) }
  }
  return { wrapFetch, stats }
}
module.exports = { haikuReplayWrap, haikuSimWrap }
