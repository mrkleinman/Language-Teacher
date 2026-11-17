// Credential scrubbing. A job's access code / Gemini key arrive in the request body and live in memory for that job only; EVERYTHING that leaves the
// service (status, log lines, errors, results) goes through a scrubber built from the job's own secrets plus generic key shapes.
'use strict'

const GENERIC = [
  [/AIza[0-9A-Za-z_-]{20,}/g, '[key]'],
  [/sk-[A-Za-z0-9_-]{16,}/g, '[key]'],
  [/([?&]key=)[^&\s"'#]+/gi, '$1[key]'],
  [/(x-lt-access|x-runner-token|x-api-key|authorization)(["']?\s*[:=]\s*["']?)[^\s"',}]+/gi, '$1$2[hidden]'],
]

function variants(secret) {
  const s = String(secret == null ? '' : secret)
  if (s.length < 4) return []
  const set = new Set([s, s.trim(), s.replace(/\s+/g, ''), encodeURIComponent(s), JSON.stringify(s).slice(1, -1), encodeURI(s)])
  try { set.add(Buffer.from(s, 'utf8').toString('base64')) } catch (e) {}
  return [...set].filter(x => x && x.length >= 4).sort((a, b) => b.length - a.length)
}

// secrets: array of strings (empty / short ones are ignored). Returns { text(str), deep(any), add(secret) }.
function makeScrubber(secrets) {
  let list = []
  const add = s => { variants(s).forEach(v => { if (!list.includes(v)) list.push(v) }); list.sort((a, b) => b.length - a.length) }
  ;(secrets || []).forEach(add)
  const text = t => {
    let m = String(t == null ? '' : t)
    for (const v of list) if (m.indexOf(v) >= 0) m = m.split(v).join('[hidden]')
    for (const [rx, to] of GENERIC) m = m.replace(rx, to)
    return m
  }
  // a copy of any JSON-like value with every string scrubbed (keys too)
  const deep = v => {
    if (typeof v === 'string') return text(v)
    if (Array.isArray(v)) return v.map(deep)
    if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v)) o[text(k)] = deep(v[k]); return o }
    return v
  }
  return { text, deep, add, count: () => list.length }
}

module.exports = { makeScrubber }
