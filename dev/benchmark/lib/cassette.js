// Step 0 benchmark — model RECORD / REPLAY at the Gemini REST boundary (`fetch`).
//
// The cassette sits BELOW the app's own Gemini client (geminiRequest → _geminiSend → fetch), so every request still
// passes through the app's real transport, dedupe, retry policy and AI ledger. What is captured per request:
//   • the request: model (from the URL), the exact JSON body the app sent (contents + generationConfig: temperature,
//     maxOutputTokens, responseMimeType, responseSchema …) — the API KEY in the URL is NEVER stored
//   • the response: HTTP status and the exact JSON body (candidates text + usageMetadata)
//   • the provider label (live Gemini, or a simulator — labelled, never confused with live output)
// REPLAY serves a recorded response only to a request whose model + body are byte-identical to the recorded one
// (matched by content hash; the n-th identical request gets the n-th recorded response). Anything else is a
// CASSETTE_MISMATCH: the request is refused (an error is thrown into the app — it is never answered by a mock), the
// mismatch is reported with the first differing position, and the run is marked failed. Entries never requested by the
// replay are reported as UNUSED.
'use strict'
const crypto = require('crypto')
const CASSETTE_FORMAT = 'tt-cassette/1'

const sha = s => crypto.createHash('sha256').update(s).digest('hex')
const modelOf = url => (String(url).match(/models\/([^:?]+):/) || [])[1] || null
function stripKey(url) { return String(url).replace(/([?&]key=)[^&]+/, '$1<redacted>') }
// the key is computed from the CANONICAL JSON of the body (parse → stringify), so a cassette captured in the browser
// (which stores the parsed request) and one captured in Node match the same app request byte-for-byte
function canonicalBody(body) { try { return JSON.stringify(JSON.parse(String(body || 'null'))) } catch (e) { return String(body || '') } }
function requestKey(url, body) { return sha((modelOf(url) || '') + '\n' + canonicalBody(body)) }
const entryKey = e => sha((e.model || modelOf(e.url) || '') + '\n' + JSON.stringify(e.request))
function promptTextOf(body) {
  try { const b = JSON.parse(body); return (b.contents || []).map(c => (c.parts || []).map(p => p.text || '').join('')).join('\n') } catch (e) { return String(body || '') }
}
function firstDiff(a, b) {
  const n = Math.min(a.length, b.length); let i = 0
  while (i < n && a[i] === b[i]) i++
  if (i === n && a.length === b.length) return null
  return { at: i, recorded: a.slice(Math.max(0, i - 60), i + 80), requested: b.slice(Math.max(0, i - 60), i + 80) }
}
function responseLike(status, body, rec) {
  const nonJson = rec && rec.bodyKind === 'non-json'
  return { ok: status >= 200 && status < 300, status,
    json: async () => { if (nonJson) throw new SyntaxError('Unexpected token (recorded non-JSON body)'); return JSON.parse(JSON.stringify(body)) },
    text: async () => nonJson ? String(rec.text || '') : JSON.stringify(body), clone() { return this } }
}
// v676: a recorded network failure / timeout (response.error) is replayed as the same thrown error, so the app takes the
// same retry path it took live
function replayResponse(e) {
  const r = e.response || {}
  if (r.error) { const err = new Error(r.error.message || 'network error'); try { err.name = r.error.name || 'TypeError' } catch (x) {} throw err }
  return responseLike(r.status, r.body, r)
}

// provider(url, opts) → Response-like. Records every exchange; returns a response rebuilt from the recorded data so
// the app consumes exactly what a replay will later serve.
function createRecorder(provider, meta = {}) {
  const entries = []
  const fetchFn = async (url, opts) => {
    if (!/generativelanguage\.googleapis\.com/.test(String(url))) throw new Error('CASSETTE: unexpected network request ' + stripKey(url))
    const body = opts && opts.body != null ? String(opts.body) : ''
    const e = { seq: entries.length + 1, key: requestKey(url, body), model: modelOf(url), url: stripKey(url), request: JSON.parse(body || 'null') }
    entries.push(e)
    let res
    try { res = await provider(url, opts) }
    catch (err) { e.response = { error: { name: (err && err.name) || 'TypeError', message: String((err && err.message) || err) } }; throw err }
    let json = null
    try { json = await res.json() } catch (err) { json = null }
    e.response = { status: res.status, body: json }
    return responseLike(res.status, json)
  }
  const cassette = () => ({ format: CASSETTE_FORMAT, meta: { ...meta, recordedAt: meta.recordedAt || null, entries: entries.length }, entries })
  return { fetch: fetchFn, entries, cassette }
}

function createReplayer(cassette) {
  if (!cassette || cassette.format !== CASSETTE_FORMAT) throw new Error('CASSETTE: unknown format ' + (cassette && cassette.format))
  const byKey = new Map()
  cassette.entries.forEach(e => { const k = entryKey(e); if (!byKey.has(k)) byKey.set(k, []); byKey.get(k).push(e) })
  const used = new Set(), mismatches = []
  let n = 0
  const fetchFn = async (url, opts) => {
    n++
    const body = opts && opts.body != null ? String(opts.body) : ''
    const k = requestKey(url, body)
    const q = byKey.get(k) || []
    const next = q.find(e => !used.has(e.seq))
    if (next) { used.add(next.seq); return replayResponse(next) }
    // no identical recorded request left: report precisely, refuse the request (never mock it)
    const reqText = promptTextOf(body)
    const sameOrdinal = cassette.entries[n - 1]
    const unusedSameModel = cassette.entries.filter(e => !used.has(e.seq) && e.model === modelOf(url))
    const ref = sameOrdinal && !used.has(sameOrdinal.seq) ? sameOrdinal : unusedSameModel[0] || sameOrdinal
    const recText = ref ? promptTextOf(JSON.stringify(ref.request)) : ''
    const mm = { call: n, model: modelOf(url), reason: q.length ? 'identical request asked more often than recorded' : 'request not in cassette (prompt or settings changed)',
      comparedWith: ref ? ref.seq : null, promptDiff: ref ? firstDiff(recText, reqText) : null,
      settingsDiff: ref ? firstDiff(JSON.stringify((ref.request || {}).generationConfig || {}), JSON.stringify((JSON.parse(body || '{}') || {}).generationConfig || {})) : null,
      requestedPromptHead: reqText.slice(0, 160) }
    mismatches.push(mm)
    const err = new Error('CASSETTE_MISMATCH call ' + n + ': ' + mm.reason)
    err.cassetteMismatch = mm
    throw err
  }
  const report = () => {
    const unused = cassette.entries.filter(e => !used.has(e.seq)).map(e => ({ seq: e.seq, model: e.model, promptHead: promptTextOf(JSON.stringify(e.request)).slice(0, 120) }))
    return { served: used.size, recorded: cassette.entries.length, requests: n, mismatches, unused, faithful: !mismatches.length && !unused.length }
  }
  return { fetch: fetchFn, report }
}

module.exports = { CASSETTE_FORMAT, createRecorder, createReplayer, requestKey, stripKey, promptTextOf, firstDiff }
