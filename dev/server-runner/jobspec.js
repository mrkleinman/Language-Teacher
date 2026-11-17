// What a job may contain, validated. Nothing from a job body is ever executed or used as a path: every field is checked against a fixed
// list or a strict shape, and anything unknown is refused.
'use strict'

const LANGUAGES = ['th', 'ja', 'zh', 'yue']
const MODES = ['daily', 'revision']

// The localStorage keys the page keeps a language's learner data under (tt.jsx: the Thai literals, JA / ZH / YUE namespaces). test/run.js checks this table
// against tt.jsx so a renamed key cannot go unnoticed.
const LANGUAGE_KEYS = {
  th:  { vocab: 'tt-vocab', tracks: 'tt-tracks', dailyNew: 'tt-daily-new', extra: ['thaiTeacherSettings'] },
  ja:  { vocab: 'tt-ja-vocab', tracks: 'tt-ja-tracks', dailyNew: 'tt-ja-daily-new', extra: ['tt-ja-register'] },
  zh:  { vocab: 'tt-zh-vocab', tracks: 'tt-zh-tracks', dailyNew: 'tt-zh-daily-new', extra: ['tt-zh-grammar', 'tt-zh-settings'] },
  yue: { vocab: 'tt-yue-vocab', tracks: 'tt-yue-tracks', dailyNew: 'tt-yue-daily-new', extra: ['tt-yue-settings'] },
}
const allowedKeys = lang => { const k = LANGUAGE_KEYS[lang]; return [k.vocab, k.tracks, k.dailyNew].concat(k.extra) }
const resultKeys = lang => { const k = LANGUAGE_KEYS[lang]; return [k.vocab, k.tracks, k.dailyNew] }

// The optional model setting the app's Settings → AI Generation Model offers (tt.jsx AI_GEN_MODELS). These ids are the only ones accepted.
const MODELS = ['gemini-2.5-flash-lite', 'claude-haiku-5-5']
const OPTIONAL_MODEL = 'claude-haiku-5-5'
// the app's own rule for the server address (aiNormaliseGenPref): https, or this computer
const SERVER_URL_RX = /^(https:\/\/[^\s/?#]+|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)(\/[^\s?#]*)?$/

const TOP_FIELDS = ['language', 'mode', 'data', 'model', 'timezone', 'timeLimitSec']
const MODEL_FIELDS = ['model', 'serverUrl', 'accessCode', 'geminiKey', 'limitUsd', 'limitRequests']

const isObj = x => x && typeof x === 'object' && !Array.isArray(x)

function validTimezone(tz) { try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return /^[A-Za-z0-9_+\-/]{1,64}$/.test(tz) } catch (e) { return false } }

// returns { spec } or { errors: [..] }. opts: { allowLocalModel, maxTimeLimitSec, allowedModelHosts: [] | null }
function validateJob(body, opts) {
  opts = opts || {}
  const errors = [], err = m => { errors.push(m) }
  if (!isObj(body)) return { errors: ['the body must be a JSON object'] }
  Object.keys(body).forEach(k => { if (!TOP_FIELDS.includes(k)) err('unknown field: ' + String(k).slice(0, 40)) })
  const language = body.language
  if (!LANGUAGES.includes(language)) err('language must be one of ' + LANGUAGES.join(', '))
  if (!MODES.includes(body.mode)) err('mode must be one of ' + MODES.join(', '))
  // data: { "<localStorage key>": <the value the page keeps under it> }
  const data = {}
  if (body.data !== undefined) {
    if (!isObj(body.data)) err('data must be an object of localStorage key -> value')
    else if (LANGUAGES.includes(language)) {
      const ok = allowedKeys(language)
      Object.keys(body.data).forEach(k => {
        if (!ok.includes(k)) { err('data key not allowed for ' + language + ': ' + String(k).slice(0, 40)); return }
        data[k] = body.data[k]
      })
      const K = LANGUAGE_KEYS[language]
      if (data[K.vocab] !== undefined && !(Array.isArray(data[K.vocab]) && data[K.vocab].every(isObj))) err(K.vocab + ' must be a list of word objects')
      if (data[K.tracks] !== undefined && !(Array.isArray(data[K.tracks]) && data[K.tracks].every(isObj))) err(K.tracks + ' must be a list of track objects')
      if (data[K.dailyNew] !== undefined && data[K.dailyNew] !== null && !(isObj(data[K.dailyNew]) && Array.isArray(data[K.dailyNew].wordIds))) err(K.dailyNew + ' must be { date, wordIds: [..] }')
    }
  }
  // model
  const m = body.model, model = {}
  if (!isObj(m)) err('model must be an object')
  else {
    Object.keys(m).forEach(k => { if (!MODEL_FIELDS.includes(k)) err('unknown model field: ' + String(k).slice(0, 40)) })
    if (!MODELS.includes(m.model)) err('model.model must be one of ' + MODELS.join(', '))
    else model.model = m.model
    for (const f of ['serverUrl', 'accessCode', 'geminiKey']) {
      if (m[f] === undefined || m[f] === null || m[f] === '') continue
      if (typeof m[f] !== 'string' || m[f].length > 400 || /[\r\n\0]/.test(m[f])) { err('model.' + f + ' must be a single-line string'); continue }
      model[f] = m[f].trim()
    }
    if (m.limitUsd !== undefined) { const u = Number(m.limitUsd); if (!(u > 0 && u <= 5)) err('model.limitUsd must be above 0 and at most 5'); else model.limitUsd = u }
    if (m.limitRequests !== undefined) { const r = Math.floor(Number(m.limitRequests)); if (!(r >= 10 && r <= 2000)) err('model.limitRequests must be 10 to 2000'); else model.limitRequests = r }
    if (model.model === OPTIONAL_MODEL) {
      if (!model.serverUrl) err('model.serverUrl is required for ' + OPTIONAL_MODEL)
      else if (!SERVER_URL_RX.test(model.serverUrl.replace(/\/+$/, ''))) err('model.serverUrl must be https (or this computer, for tests)')
      else {
        const u = new URL(model.serverUrl), local = /^(localhost|127\.0\.0\.1)$/.test(u.hostname)
        if (local && !opts.allowLocalModel) err('model.serverUrl may not point at this computer')
        else if (!local && opts.allowedModelHosts && opts.allowedModelHosts.length && !opts.allowedModelHosts.includes(u.hostname)) err('model.serverUrl host is not on this runner\'s allowed list')
      }
      if (!model.accessCode) err('model.accessCode is required for ' + OPTIONAL_MODEL)
    } else if (model.model) {
      if (!model.geminiKey) err('model.geminiKey is required for ' + model.model)
      if (model.serverUrl) delete model.serverUrl
    }
  }
  let timezone = null
  if (body.timezone !== undefined) { if (typeof body.timezone === 'string' && validTimezone(body.timezone)) timezone = body.timezone; else err('timezone must be an IANA name such as Asia/Singapore') }
  let timeLimitSec = null
  if (body.timeLimitSec !== undefined) {
    const t = Number(body.timeLimitSec), max = opts.maxTimeLimitSec || 1500
    if (!(t >= 30 && t <= max)) err('timeLimitSec must be 30 to ' + max); else timeLimitSec = Math.floor(t)
  }
  if (errors.length) return { errors }
  return { spec: { language, mode: body.mode, data, model, timezone, timeLimitSec } }
}

module.exports = { LANGUAGES, MODES, MODELS, OPTIONAL_MODEL, LANGUAGE_KEYS, allowedKeys, resultKeys, validateJob, SERVER_URL_RX }
