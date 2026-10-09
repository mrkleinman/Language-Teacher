// v648 — GEMINI-ONLY: one transport, no alternate provider, no model promotion, bounded
// same-model retries, controlled failures, clean runtime source, safe legacy-data migration.
const { load } = require('./harness'), { loadFixture } = require('./fixture'), { fixtureGroups, simulator } = require('./gemini_sim')
const React = require('react'), RDS = require('react-dom/server')
const fs = require('fs')
const out = []; let fails = 0
const T = (id, name, pass, detail) => { if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + id.padEnd(4) + name + (detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')) }
const KEY = 'AIzaSyTEST-harness-key-000000', KEY2 = 'AIzaSyTEST-backup-key-1111111'
const gem = (text, status = 200) => ({ ok: status < 300, status, json: async () => status < 300 ? { candidates: [{ content: { parts: [{ text }] } }], usageMetadata: { promptTokenCount: 50, candidatesTokenCount: 5, totalTokenCount: 55 } } : { error: { message: text } } })
const fresh = () => { const c = load('tt.compiled.js'); c.AbortController = AbortController; return c }
// every network request, as { host, model, key } — anything not Gemini REST is recorded too
const recorder = (c, respond) => { const log = []; c.fetch = async (url, opts) => { const u = String(url)
  log.push({ host: (u.match(/^https?:\/\/([^/]+)/) || [])[1] || u, model: (u.match(/models\/([^:]+):/) || [])[1] || null, key: (u.match(/key=([^&]+)/) || [])[1] || null })
  return respond(u, opts, log.length) }; return log }
const msg = [{ role: 'user', content: 'Segment this Thai sentence into individual words.' }]

;(async () => {
  // ── 1. Gemini succeeds → operation succeeds ──
  { const c = fresh(); c.aiBeginRun('t-ok'); const log = recorder(c, () => gem('[{"p":"ผม"}]'))
    const r = await c.geminiGenerate(KEY, 'gemini-2.5-flash-lite', msg, 100)
    const sc = await c.establishConvoScene([{ thai: 'ตลาด', english: 'market' }], c.initVocab(), KEY, c.ev('GEMINI_DEFAULT_MODEL'))
    T('S1', 'Gemini succeeds → the operation succeeds (a call and a scene build: one request each, Gemini REST, gemini-2.5-flash-lite)',
      r === '[{"p":"ผม"}]' && log.length === 2 && log.every(x => x.host === 'generativelanguage.googleapis.com' && x.model === 'gemini-2.5-flash-lite') && !!sc.scene, log) }

  // ── 2. Gemini unavailable → controlled failure ──
  { const c = fresh(); c.aiBeginRun('t-down'); const log = recorder(c, () => { throw new TypeError('Failed to fetch') })
    let e = null; try { await c.geminiGenerate(KEY, 'gemini-2.5-flash-lite', msg, 100) } catch (x) { e = x }
    const max = c.ev('GEMINI_MAX_ATTEMPTS')
    const sc = await c.establishConvoScene([{ thai: 'ตลาด', english: 'market' }], c.initVocab(), KEY, c.ev('GEMINI_DEFAULT_MODEL'))
    T('U1', 'Gemini unreachable → controlled GEMINI_UNAVAILABLE error after exactly GEMINI_MAX_ATTEMPTS same-model attempts; callers degrade (scene → default scene)',
      e && e.geminiUnavailable && /GEMINI_UNAVAILABLE/.test(e.message) && max === 3 && log.length === 3 + 3 && log.every(x => x.model === 'gemini-2.5-flash-lite') && /Somchai/.test(sc.characterA),
      { error: e && e.message, attempts: log.length, max })
    // a whole semantic-audit stage with Gemini down: every item UNVERIFIED, bounded, no crash
    const items = Array.from({ length: 12 }, (_, i) => ({ thai: 'ผมไปตลาดครับ' + i, english: 'x', prompt: 'He says he goes to the market ' + i }))
    const before = log.length
    const jr = await c._judgeWithBoundedRetry(items, ch => c._finalNaturalnessJudge(ch, KEY, 'gemini-2.5-flash-lite'), 'main naturalness', () => {})
    T('U2', 'Gemini down during QC → items marked UNVERIFIED (fail closed), request count bounded, no other service tried',
      jr.verdicts.size === 0 && jr.failed.size === 12 && log.length - before <= 12 && log.every(x => x.host === 'generativelanguage.googleapis.com'), { requests: log.length - before }) }

  // ── 3. Gemini 402 → fail fast ──
  { const c = fresh(); const run = c.aiBeginRun('t-402'); const log = recorder(c, () => gem('Your prepayment credits are depleted.', 402))
    let e1 = null, e2 = null
    try { await c.geminiGenerate(KEY, 'gemini-2.5-flash-lite', msg, 100) } catch (x) { e1 = x }
    try { await c.geminiGenerate(KEY, 'gemini-2.5-flash-lite', msg, 100) } catch (x) { e2 = x }
    const rows = c.__aiLedger.filter(r => r.runId === run)
    T('P1', '402 → fail fast: ONE request, no retry, fatal CREDITS_DEPLETED; the next request in the run is not sent (latched)',
      log.length === 1 && e1 && e1.fatalProvider && e1.fatalProvider.reason === 'CREDITS_DEPLETED' && e2 && e2.fatalProvider && rows.length === 2 && rows[1].latched, { requests: log.length, e1: e1 && e1.message }) }

  // ── 4. Overload → bounded Gemini retry only, same model ──
  { const c = fresh(); const run = c.aiBeginRun('t-503'); const log = recorder(c, (u, o, n) => n < 3 ? gem('The model is overloaded.', 503) : gem('ok'))
    const r = await c.geminiGenerate(KEY, 'gemini-2.5-flash-lite', msg, 100)
    const rows = c.__aiLedger.filter(x => x.runId === run)
    T('O1', '503, 503, 200 → succeeds on attempt 3, every attempt on gemini-2.5-flash-lite (no promotion), retry reasons logged',
      r === 'ok' && log.length === 3 && log.every(x => x.model === 'gemini-2.5-flash-lite') && rows.map(x => x.attempt).join() === '1,2,3' &&
      rows.slice(1).every(x => /same-model retry after HTTP 503/.test(x.retryReason)), rows.map(x => x.model + '#' + x.attempt + ' ' + x.http)) }
  { const c = fresh(); c.aiBeginRun('t-503x'); const log = recorder(c, () => gem('The model is overloaded.', 503))
    let e = null; try { await c.geminiGenerate(KEY, 'gemini-2.5-flash-lite', msg, 100) } catch (x) { e = x }
    T('O2', '503 on every attempt → explicit failure after 3 attempts; never gemini-2.5-flash, never another service',
      e && e.httpStatus === 503 && e.geminiUnavailable && log.length === 3 && !log.some(x => x.model !== 'gemini-2.5-flash-lite'), { requests: log.map(x => x.model), error: e && e.message }) }
  { const c = fresh(); c.aiBeginRun('t-503b'); c.window.__geminiBackupKey = KEY2; const log = recorder(c, (u, o, n) => n === 1 ? gem('overloaded', 503) : gem('ok'))
    await c.geminiGenerate(KEY, 'gemini-2.5-flash-lite', msg, 100)
    T('O3', 'optional backup Gemini key: used only for the retry attempt, SAME model', log.length === 2 && log[0].key === KEY && log[1].key === KEY2 && log[1].model === log[0].model, log.map(x => x.model)) }
  { const c = fresh(); c.aiBeginRun('t-404'); const log = recorder(c, () => gem('models/gemini-9 is not found', 404))
    let e = null; try { await c.geminiGenerate(KEY, 'gemini-2.5-flash-lite', msg, 100) } catch (x) { e = x }
    T('O4', '404 (unknown model) → immediate explicit failure; v647 promoted a 404 to gemini-2.5-flash', e && e.httpStatus === 404 && log.length === 1, { requests: log.length }) }

  // ── 5. No alternate provider is ever invoked ──
  { const c = fresh(); c.aiBeginRun('t-key'); const log = recorder(c, () => gem('x'))
    let e = null; try { await c.geminiGenerate('sk-or-v1-0000000000000000000000000', 'gemini-2.5-flash-lite', msg, 100) } catch (x) { e = x }
    const norm = ['qwen/qwen3.5-flash-02-23:no-thinking', 'anthropic/claude-haiku-4-5', 'openai/gpt-4o', '', null, 'google/gemini-2.5-flash-lite', 'gemini-2.5-flash']
      .map(m => c.geminiModelId(m))
    T('N1', 'a non-Gemini key → controlled GEMINI_KEY_MISSING, ZERO network requests (v647 sent it to another service)',
      e && /GEMINI_KEY_MISSING/.test(e.message) && log.length === 0, e && e.message)
    T('N2', 'any stored non-Gemini model string normalises to gemini-2.5-flash-lite (v647 sent it to Gemini → 404 → promoted to Flash)',
      norm.join() === 'gemini-2.5-flash-lite,gemini-2.5-flash-lite,gemini-2.5-flash-lite,gemini-2.5-flash-lite,gemini-2.5-flash-lite,gemini-2.5-flash-lite,gemini-2.5-flash', norm) }
  { const c = fresh(); c.aiBeginRun('t-kru'); const log = recorder(c, () => gem('สวัสดีครับ — hello'))
    const r = await c.askKru([{ role: 'assistant', content: 'hi' }, { role: 'user', content: 'how do I say hello?' }], '', KEY)
    const af = c.ev('geminiRequest')
    T('N3', 'Kru chat (was a direct call to another vendor) runs on Gemini Flash-Lite through the central client', r === 'สวัสดีครับ — hello' && log.length === 1 && log[0].model === 'gemini-2.5-flash-lite', log) }

  // ── 6. Source invariants: one transport, zero banned identifiers ──
  const src = fs.readFileSync('tt.jsx', 'utf8')
  const shell = (() => { const h = fs.readFileSync(fs.existsSync('/mnt/user-data/uploads/index-1.html') ? '/mnt/user-data/uploads/index-1.html' : require('path').join(__dirname, 'build/index-1.shell.html'), 'utf8'); return h.slice(0, h.indexOf('<script type="text/babel">')) + h.slice(h.lastIndexOf('</script>')) })()
  const BANNED = /qwen|anthropic|claude|openai|gpt-|openrouter|deepseek|mistral|groq|ollama|huggingface|together\.ai|fallbackProvider|secondaryProvider|fallbackModel|secondaryModel|alternateModel|haiku|sk-or-|x-api-key|chat\/completions/i
  const hits = (text, name) => text.split('\n').map((l, i) => BANNED.test(l) ? name + ':' + (i + 1) + ' ' + l.trim().slice(0, 80) : null).filter(Boolean)
  const allHits = hits(src, 'tt.jsx').concat(hits(shell, 'index-shell'))
  T('I1', 'runtime source (tt.jsx + app shell) contains ZERO banned provider identifiers — no exclusions, no allowlist',
    allHits.length === 0, allHits.slice(0, 10))
  const fetches = [...src.matchAll(/\bfetch\(\s*([^,\n]{0,90})/g)].map(m => m[1].trim())
  T('I2', 'network calls: exactly ONE AI transport (geminiRequest → Gemini REST); the only other fetches are Google Cloud TTS (audio, not an LLM)',
    fetches.filter(f => !/texttospeech\.googleapis\.com/.test(f)).length === 1 && /GEMINI_API_BASE \+ modelId/.test(fetches.find(f => !/texttospeech/.test(f)) || '') &&
    /const GEMINI_API_BASE = 'https:\/\/generativelanguage\.googleapis\.com\/v1beta\/models\/'/.test(src), fetches)
  const loopBody = src.slice(src.indexOf('async function geminiRequest('), src.indexOf('async function geminiGenerate('))
  T('I3', 'no model promotion: the model is fixed once (geminiModelId) before the retry loop and never reassigned; no fallback-model constant exists',
    (loopBody.match(/const modelId = /g) || []).length === 1 && !/modelId\s*=(?!=)/.test(loopBody.replace('const modelId = geminiModelId(model)', '')) && !/FALLBACK_MODEL|fallback-model/.test(src))
  T('I4', 'no provider state / selector / key survives: tt-provider, the retired shared-key slot and provider selects are gone from the UI and loaders',
    !/Generate with:/.test(src) && !/stGet\('tt-(provider|orkey|apikey|dskey)'\)/.test(src) && !/onSetProvider|resolveOr|orBalance/.test(src) && /GEMINI_ONLY_LEGACY_SETTING_KEYS = \['tt-orkey', 'tt-apikey', 'tt-dskey', 'tt-provider'\]/.test(src))

  // ── 7. UI: Settings and Header are Gemini-only ──
  { const cr = load('tt.compiled.js', { React })
    const set = RDS.renderToStaticMarkup(React.createElement(cr.Settings, { onBack() {}, geminiKey: KEY, onSaveGeminiKey() {}, geminiSpend: 0.0123, onResetGeminiSpend() {}, gcpTtsKey: '', onSaveGcpTtsKey() {}, geminiBackupKey: '', onSaveGeminiBackupKey() {} })).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
    const hdr = RDS.renderToStaticMarkup(React.createElement(cr.Header, { view: 'dashboard', onNav() {}, geminiKey: KEY, geminiSpend: 0.5, lang: 'th', onSetLang() {} })).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
    T('UI1', 'Settings: one Gemini key + optional backup Gemini key; no provider picker; the saved key value is never rendered',
      /Gemini API key/.test(set) && /Backup Gemini key/.test(set) && /gemini-2\.5-flash-lite/.test(set) && !BANNED.test(set) && !set.includes(KEY) && !/AI Provider/.test(set), set.slice(0, 200))
    // v650 §8: the header is the Gemini mark + LAST TRACK cost (no cumulative spend, no minus sign)
    T('UI2', 'Header: Gemini mark + last-track cost chip (no cumulative "-$" spend), no provider dropdown', /aria-label="Gemini"/.test(RDS.renderToStaticMarkup(React.createElement(cr.Header, { view: 'dashboard', onNav() {}, geminiKey: KEY, geminiSpend: 0.5, lang: 'th', onSetLang() {} }))) &&
      /S\$/.test(hdr) && !/-\$0\.5000/.test(hdr) && !BANNED.test(hdr), hdr.slice(0, 120)) }

  // ── 8. Stored credentials: legacy names removed, a Gemini key in the old slot preserved, values never logged ──
  { const c = fresh(); const secret = 'AIzaSySECRET-VALUE-do-not-print-0000'
    c.localStorage.setItem('tt-orkey', JSON.stringify(secret)); c.localStorage.setItem('tt-apikey', JSON.stringify('sk-ant-secret-zzz'))
    c.localStorage.setItem('tt-dskey', JSON.stringify('sk-ds-secret-yyy')); c.localStorage.setItem('tt-provider', JSON.stringify('qwen3_14b'))
    const infos = []; c.console.info = (...a) => infos.push(a.join(' '))
    const rep = await c.migrateGeminiOnlyCredentials()
    const gk = JSON.parse(c.localStorage.getItem('tt-gemini-key') || 'null')
    const mig = JSON.parse(c.localStorage.getItem('tt-migrations') || '{}')['gemini-only-credentials-v648']
    const logged = infos.join('\n') + JSON.stringify(mig)
    T('K1', 'credentials migration: a Gemini key in the retired slot moves to tt-gemini-key; tt-orkey / tt-apikey / tt-dskey / tt-provider deleted; only NAMES logged',
      gk === secret && ['tt-orkey', 'tt-apikey', 'tt-dskey', 'tt-provider'].every(k => c.localStorage.getItem(k) === null) && rep.removed.length === 4 &&
      !logged.includes('SECRET') && !logged.includes('sk-ant') && !logged.includes('sk-ds') && !logged.includes('qwen3_14b'), { moved: rep.moved, removed: rep.removed })
    const c2 = fresh(); c2.localStorage.setItem('tt-gemini-key', JSON.stringify(KEY)); c2.localStorage.setItem('tt-orkey', JSON.stringify('sk-or-v1-abcdef1234567890'))
    await c2.migrateGeminiOnlyCredentials()
    T('K2', 'an existing Gemini key is never overwritten; a non-Gemini key is deleted, not moved', JSON.parse(c2.localStorage.getItem('tt-gemini-key')) === KEY && c2.localStorage.getItem('tt-orkey') === null) }

  // ── 9. Historical tracks: provenance labels sanitised, lesson content untouched, originals in a ledger ──
  { const c = fresh()
    const legacy = [ { createdAt: 'T1', pairs: [
        { thai: 'ผมไปตลาดครับ', english: 'I go to the market.', phonetic: 'phǒm pai tà-làat khráp', prompt: 'He says…', _source: 'qwen:conv' },
        { thai: 'ไปด้วยกันไหมคะ', english: 'Shall we go together?', phonetic: 'x', prompt: 'She asks…', _source: 'qwen-recheck:conv' },
        { thai: 'ก', english: 'a', _source: 'qwen-recheck10:ตลาด' }, { thai: 'ข', english: 'b', _source: 'haiku:ตลาด' },
        { thai: 'ค', english: 'c', _source: 'fallback:ตลาด' }, { thai: 'ง', english: 'd', _source: 'ai:improve:ตลาด' }, { thai: 'จ', english: 'e', _source: 'closed-vocab-fallback:ตลาด' },
        { thai: 'ฉ', english: 'f', _source: 'qc:recover:ตื่น' }, { thai: 'ช', english: 'g', _source: 'best-attempt:conv' }, { thai: 'ซ', english: 'h', _source: 'gemini-check-3:conv' } ],
        listeningBuild: { track: { pairs: [{ thai: 'ผมไปตลาดครับ', _source: 'qwen:conv' }] } } },
      { createdAt: 'T2', language: 'ja', provider: 'qwen3_14b', model: 'qwen/qwen3.5-flash-02-23:no-thinking', pairs: [{ japanese: 'いく', _source: 'ja-check-2' }] },
      { createdAt: 'T3', pairs: [{ thai: 'ผม', _source: 'gemini-check-1:conv' }] } ]
    const snap = JSON.stringify(legacy)
    const res = c.migrateLegacyProvenanceInTracks(legacy, 'tt-tracks')
    const p = res.tracks[0].pairs
    const content = t => JSON.stringify((t.pairs || []).map(x => [x.thai, x.english, x.phonetic, x.prompt, x.japanese]))
    T('H1', 'retired-generator labels → legacy-check-N (qwen:→1, -recheck:→2, -recheck10:→11, haiku:→1); current labels untouched',
      p.map(x => x._source).join('|') === 'legacy-check-1:conv|legacy-check-2:conv|legacy-check-11:ตลาด|legacy-check-1:ตลาด|fallback:ตลาด|ai:improve:ตลาด|closed-vocab-fallback:ตลาด|qc:recover:ตื่น|best-attempt:conv|gemini-check-3:conv' &&
      res.tracks[0].listeningBuild.track.pairs[0]._source === 'legacy-check-1:conv', p.map(x => x._source))
    T('H2', 'lesson content is byte-identical (Thai / English / phonetic / prompt / Japanese); the input is not mutated; untouched tracks are the same object',
      res.tracks.every((t, i) => content(t) === content(legacy[i])) && JSON.stringify(legacy) === snap && res.tracks[2] === legacy[2])
    T('H3', 'track-level non-Gemini provider/model → provider "legacy", model removed, verbatim original frozen in track.legacyProvenance',
      res.tracks[1].provider === 'legacy' && res.tracks[1].model === undefined && res.tracks[1].legacyProvenance.provider === 'qwen3_14b' && Object.isFrozen(res.tracks[1].legacyProvenance))
    T('H4', 'the ledger holds every original label verbatim, by track id and JSON path', res.ledger.length === 2 && res.ledger[0].labels['/pairs/0/_source'] === 'qwen:conv' &&
      res.ledger[0].labels['/listeningBuild/track/pairs/0/_source'] === 'qwen:conv' && res.ledger[1].track.model === 'qwen/qwen3.5-flash-02-23:no-thinking' && res.labels === 5)
    // apply: ledger first, verified, then tracks; idempotent
    c.localStorage.setItem('tt-tracks', JSON.stringify(legacy))
    let saved = null
    const a1 = await c.applyLegacyProvenanceMigration('tt-tracks', legacy, async t => { saved = t; c.localStorage.setItem('tt-tracks', JSON.stringify(t)) })
    const led = JSON.parse(c.localStorage.getItem('tt-legacy-provenance-v648'))
    const a2 = await c.applyLegacyProvenanceMigration('tt-tracks', a1.tracks, async () => { throw new Error('must not save twice') })
    T('H5', 'apply: ledger written + read back before tracks are saved; second run is a no-op (versioned in tt-migrations)',
      saved && led.entries.length === 2 && a2.skipped === 'already-migrated' && /legacy-check-1:conv/.test(c.localStorage.getItem('tt-tracks')))
    const c3 = fresh(); c3.stSet = async (k, v) => { if (k !== 'tt-legacy-provenance-v648') c3.localStorage.setItem(k, JSON.stringify(v)) }   // ledger write silently fails
    let saved3 = false
    const a3 = await c3.applyLegacyProvenanceMigration('tt-tracks', legacy, async () => { saved3 = true })
    T('H6', 'if the ledger cannot be written, NO track is changed (fail safe)', !saved3 && a3.skipped === 'ledger-write-failed' && a3.tracks === legacy)
    // the real stored 25 Sept track (exported by a pre-v648 build) after load-time migration renders tier colours and exports cleanly
    const cm = fresh(); const { track } = loadFixture(cm)
    cm.Blob = class { constructor(parts) { cm.__blob = parts.join('') } }; cm.URL = { createObjectURL: () => 'b', revokeObjectURL() {} }
    cm.document.createElement = () => ({ click() {}, style: {} }); cm.document.body.removeChild = () => {}
    await cm.downloadTrack(track)
    const srcs = (cm.__blob.match(/SRC: \S+/g) || [])
    T('H7', 'the real 25-Sept legacy track: after migration every SRC exports as ai:check-N / qc / fallback — no retired name reaches the export',
      srcs.length > 50 && !BANNED.test(cm.__blob) && srcs.some(s => s === 'SRC: ai:check-2'), [...new Set(srcs)].slice(0, 8)) }

  // ── 10. Live-path proof (simulated Gemini REST at the network boundary) ──
  { const c = fresh(); const { track: fx, vocab } = loadFixture(c); const groups = fixtureGroups(fx)
    const byThai = new Map(vocab.map(w => [w.thai, w])); const targets = fx.keywords.map(k => ({ ...byThai.get(k.thai) })); targets.forEach(t => { t._trackTargets = targets })
    const stats = { models: {}, genAttempts: {}, segInputs: [], glossInputs: [] }
    const hosts = new Set(); const simF = simulator(c, groups, 'clean', stats)
    c.fetch = async (u, o) => { hosts.add(String(u).match(/^https?:\/\/([^/]+)/)[1]); return simF(u, o) }
    const MODEL = c.ev('GEMINI_DEFAULT_MODEL'); const run = c.aiBeginRun('proof-daily-track')
    const scene = await c.establishConvoScene(targets, vocab, KEY, MODEL)
    const pairs = await c.generateConversationTrack(targets, [], KEY, () => {}, vocab, MODEL, null, scene)
    let track = { date: '29 Sept 2026', mode: 'daily', trackMode: 'daily', pairs, keywords: fx.keywords, createdAt: new Date().toISOString(), targetCounts: { selectedTargetCount: 30, newTargetCount: 5, requiredListeningTargetCount: 25 } }
    c.aiSetTrackId(track.createdAt)
    const qc = await c.runQualityCheckCore(track, KEY, MODEL, { vocab }); track = { ...track, pairs: qc.pairs }
    await c.buildAndPersistThaiListening(track, vocab, { apiKey: KEY, model: MODEL })
    const rows = c.__aiLedger.filter(r => r.runId === run)
    const byStage = {}; rows.forEach(r => { const s = byStage[r.stage] || (byStage[r.stage] = new Set()); s.add(r.model) })
    const sum = c.aiUsageSummary(run)
    const stageLines = Object.entries(byStage).sort().map(([s, m]) => s + ' → ' + [...m].join(','))
    fs.writeFileSync('v648-live-path-proof.txt', ['v648 LIVE-PATH PROOF — real Thai pipeline (scene → generation → QC → romanisation/segmentation/gloss → Listening),',
      'Gemini REST simulated at the network boundary (no key / no network in this sandbox). Every request below went through geminiRequest.', '',
      'network hosts contacted: ' + [...hosts].join(', '), 'generationSource=gemini', 'requests: ' + rows.length + ' · pairs generated: ' + pairs.length, '', 'STAGE → MODEL', ...stageLines, '',
      ...c.aiUsageSummaryLines(sum), '', 'first 12 ledger rows:', ...rows.slice(0, 12).map(r => '  ' + c.aiLedgerLine(r)),
      '', 'every generation-source label on the track: ' + [...new Set(track.pairs.map(p => String(p._source || '').replace(/:.*/, ':')))].join(' ')].join('\n'))
    const models = new Set(rows.map(r => r.model))
    T('L1', 'real Thai pipeline end-to-end: every request hits Gemini REST only; every stage logs its Gemini model; Flash appears ONLY on the explicit romanisation stage',
      hosts.size === 1 && hosts.has('generativelanguage.googleapis.com') && rows.length > 50 && pairs.length > 60 &&
      [...models].every(m => m === 'gemini-2.5-flash-lite' || m === 'gemini-2.5-flash') &&
      rows.filter(r => r.model === 'gemini-2.5-flash').every(r => r.stage === 'J_romanisation') && rows.every(r => r.provider === 'gemini'),
      stageLines)
    T('L2', 'generated pairs carry gemini-check-N labels (generationSource=gemini) — never a retired name',
      track.pairs.some(p => /^gemini-check-1:/.test(p._source || '')) && !track.pairs.some(p => BANNED.test(p._source || '')), [...new Set(track.pairs.map(p => String(p._source || '').replace(/:.*/, ':')))]) }

  console.log(out.join('\n') + '\n\n' + (fails ? fails + ' FAILED' : 'all passed') + ' (' + out.filter(l => /^(PASS|FAIL)/.test(l)).length + ' checks)')
})().catch(e => { console.error(e); process.exit(1) })
