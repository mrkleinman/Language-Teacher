// A STAND-IN for the model function, for tests only. It answers the same two protocols the page speaks:
//   * the model function (what dev/server/google-cloud-anthropic/index.js is): POST <any path>, header x-lt-access, a Messages-API body,
//     a Messages-API style reply;
//   * the Gemini REST call: POST /v1beta/models/<id>:generateContent?key=..., a contents/candidates style reply
//     (the runner can map the page's call to generativelanguage.googleapis.com onto this server in tests).
// Replies are canned and VALID for the prompts the stand-in knows (see `handlers`); for any other prompt it builds a reply that satisfies the
// JSON schema the page asked for, so the page gets a well-formed (if meaningless) answer instead of an error. No real model, no cost.
// It never prints a credential: the access code / key are compared, counted and dropped.
'use strict'
const http = require('http')

const HAIKU = 'claude-haiku-5-5'

// ---- a reply that satisfies a schema (JSON Schema from the model function path, or the Gemini OpenAPI subset) ----
function synth(schema) {
  if (!schema || typeof schema !== 'object') return 'ok'
  if (Array.isArray(schema.anyOf)) { const s = schema.anyOf.find(x => x && x.type !== 'null'); return synth(s) }
  if (schema.nullable && schema.type == null) return null
  const t = String(schema.type || '').toLowerCase()
  if (Array.isArray(schema.enum) && schema.enum.length) return schema.enum[0]
  if (t === 'object') { const o = {}; Object.entries(schema.properties || {}).forEach(([k, v]) => { o[k] = synth(v) }); return o }
  if (t === 'array') return [synth(schema.items)]
  if (t === 'integer') return 1
  if (t === 'number') return 1
  if (t === 'boolean') return true
  return 'ok'
}

// ---- canned handlers: ({ q, system, user, schema }) -> reply text, or undefined to let the next handler / schema synthesis answer ----
function yueReviewHandler(opts) {
  return ctx => {
    if (!/reviewing the lines of a finished lesson track/.test(ctx.system || ctx.q)) return undefined
    const m = /LINES \((\d+)\)/.exec(ctx.q); const n = m ? +m[1] : 0
    const flags = (opts && opts.yueFlags) || {}
    if (opts && opts.yueMalformed) return '{"verdict":"pass","lines":[]}'
    const lines = Array.from({ length: n }, (_, k) => { const i = k + 1, f = flags[i]; return f ? { i, ok: false, kind: f.kind, reason: f.reason } : { i, ok: true } })
    const nf = Object.keys(flags).length
    return JSON.stringify({ verdict: nf ? 'review' : 'pass', summary: 'Stand-in reviewer: ' + (nf ? nf + ' line(s) flagged.' : 'all lines fine.'), lines })
  }
}

function defaultHandlers(opts) {
  return [yueReviewHandler(opts)].concat((opts && opts.handlers) || [])
}

function textOfAnthropic(body) {
  const sys = Array.isArray(body.system) ? body.system.map(b => b && b.text || '').join('\n') : String(body.system || '')
  const parts = []
  ;(body.messages || []).forEach(m => { parts.push(typeof m.content === 'string' ? m.content : (Array.isArray(m.content) ? m.content.map(b => b && b.text || '').join('') : '')) })
  return { system: sys, user: parts.join('\n'), q: (sys + '\n' + parts.join('\n')) }
}
function textOfGemini(body) {
  const parts = []
  ;(body.contents || []).forEach(c => parts.push((c.parts || []).map(p => p.text || '').join('')))
  const gc = body.generationConfig || {}
  return { system: '', user: parts.join('\n'), q: parts.join('\n'), schema: gc.responseSchema || null, wantJson: gc.responseMimeType === 'application/json' }
}

function startFakeModel(opts) {
  opts = opts || {}
  const handlers = defaultHandlers(opts)
  const stats = { anthropic: 0, gemini: 0, denied: 0, options: 0, prompts: [], codeSeen: false, keySeen: false, headers: [] }
  const send = (res, status, obj, extra) => { const b = JSON.stringify(obj); res.writeHead(status, Object.assign({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, x-lt-access', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }, extra || {})); res.end(b) }
  const server = http.createServer((req, res) => {
    if (req.method === 'OPTIONS') { stats.options++; res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, x-lt-access', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }); return res.end() }
    const chunks = []; let size = 0
    req.on('data', c => { size += c.length; if (size > 2e6) req.destroy(); else chunks.push(c) })
    req.on('end', async () => {
      let body = null; try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch (e) { return send(res, 400, { type: 'error', error: { type: 'invalid_request_error', message: 'body is not JSON' } }) }
      const url = new URL(req.url, 'http://x')
      const isGemini = /\/v1beta\/models\/[^/:]+:generateContent$/.test(url.pathname)
      if (opts.latencyMs) await new Promise(r => setTimeout(r, opts.latencyMs))
      if (isGemini) {
        if (opts.geminiKey != null && url.searchParams.get('key') !== opts.geminiKey) { stats.denied++; return send(res, 403, { error: { code: 403, message: 'API key not valid' } }) }
        stats.keySeen = true; stats.gemini++
        const ctx = textOfGemini(body); stats.prompts.push(ctx.q.slice(0, 300))
        let text; for (const h of handlers) { text = h(ctx); if (text != null) break }
        if (text == null) text = JSON.stringify(synth(ctx.schema))
        return send(res, 200, { candidates: [{ content: { role: 'model', parts: [{ text }] }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 1500, candidatesTokenCount: 300, totalTokenCount: 1800 } })
      }
      // the model function
      const given = String(req.headers['x-lt-access'] || '')
      if (!opts.accessCode || given !== opts.accessCode) { stats.denied++; return send(res, 401, { type: 'error', error: { type: 'access_denied', message: 'wrong or missing site access code' } }) }
      stats.codeSeen = true; stats.anthropic++
      if (opts.failWith) return send(res, opts.failWith.status || 500, { type: 'error', error: { type: opts.failWith.type || 'api_error', message: opts.failWith.message || 'stand-in failure' } })
      const ctx = textOfAnthropic(body); const schema = body.output_config && body.output_config.format && body.output_config.format.schema
      stats.prompts.push(ctx.q.slice(0, 300))
      let text; for (const h of handlers) { text = h(Object.assign({ schema }, ctx)); if (text != null) break }
      if (text == null) text = JSON.stringify(synth(schema))
      return send(res, 200, { id: 'msg_standin', type: 'message', role: 'assistant', model: HAIKU, stop_reason: 'end_turn', stop_details: null,
        content: [{ type: 'text', text }], usage: { input_tokens: 1500, output_tokens: 600, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } })
    })
  })
  return new Promise(resolve => server.listen(opts.port || 0, '127.0.0.1', () => {
    const port = server.address().port
    resolve({ port, url: 'http://127.0.0.1:' + port, stats, close: () => new Promise(r => { server.close(r); server.closeAllConnections && server.closeAllConnections() }) })
  }))
}

module.exports = { startFakeModel, synth }
if (require.main === module) {
  // node test/fake-model-server.js  (access code from the STANDIN_ACCESS_CODE environment variable)
  startFakeModel({ port: +process.env.PORT || 8788, accessCode: process.env.STANDIN_ACCESS_CODE || 'stand-in-code' }).then(s => console.log('stand-in model listening on ' + s.url))
}
