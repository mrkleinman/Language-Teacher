// 17 Nov — Cantonese stage 1: the AI quality review of a finished module track ("still no AI check?" — the owner).
// A Cantonese Daily / Revision track is written from modules (no model). Once it is built, ONE model request judges all its lines as a Hong Kong speaker would
// (natural colloquial Cantonese, not Mandarin or written Chinese; the English says what the Cantonese says; the Yale matches the characters; the target word is used in
// the sense the word list intends; register suits A man / B woman). It follows the model setting every other language follows, through the same transport, credentials, retries
// and cost ledger, and it only JUDGES: Yale and every sentence stay as the data has them.
//   A  the question: every line, the targets with their intended meaning, A man / B woman, judge-only; the strict JSON schema for both models
//   B  the reply is parsed STRICTLY: anything that is not exactly one verdict per line is "malformed", and nothing counts as judged
//   C  ONE request per track with ALL lines; flagged lines, verdicts, counts; the result is stored on the track (survives JSON / reload / export)
//   D  the screens: result card with counts, flagged lines and reasons, cost; Study stays possible; the saved-track screen; the Not-available card
//   E  the whole flow with a key: dashboard → Daily → Build → review → Study anyway → saved with the review → Review button → run again
//   F  malformed reply, provider error, cancel: said in words, counted, never a silent skip, no hidden retry, an earlier good review is never wiped
//   G  no key / no model: nothing is sent, the screen says so, the track can still be studied; never a fall-back to another model
//   H  the model setting is honoured (default vs the optional model), through the shared transport, with no Gemini key needed for the optional one
//   I  no credential is written anywhere (track, transcript, storage, ledger, error text)
//   J  cost counted: the request is in the ledger, the track's usage, the header cost chip and the transcript
//   K  never another language's reviewer or QC function for yue
// Real application code; the model is a scripted stand-in at the network boundary (no network, no model, no cost).
const { load } = require('./harness')
const fs = require('fs'), zlib = require('zlib')
const React = require('react'), TR = require('react-test-renderer'), RDS = require('react-dom/server')
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const FILE = process.env.TT_FILE || 'tt.compiled.js'
const SRC = fs.readFileSync('tt.jsx', 'utf8')
let n = 0, fails = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; console.log((pass ? 'PASS ' : 'FAIL ') + id + '  ' + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 700) : '')) }
const textOf = x => x == null ? '' : typeof x === 'string' ? x : Array.isArray(x) ? x.map(textOf).join(' ') : textOf(x.children)
const flush = async (k = 120) => { for (let i = 0; i < k; i++) await new Promise(r => setImmediate(r)) }
const txt = r => textOf(r.toJSON()).replace(/\s+/g, ' ')
const html = el => RDS.renderToStaticMarkup(el).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
const DATA = JSON.parse(zlib.gunzipSync(Buffer.from(load(FILE).ev('YUE_MODULES_GZ'), 'base64')).toString('utf8'))
const HAIKU = 'claude-haiku-5-5', GEM = 'gemini-2.5-flash-lite', KEY = 'AIzaSyTEST-harness-key-000000', CODE = 'test-access-code-7f3a'

// ── the scripted model ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const resp = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => JSON.parse(JSON.stringify(body)) })
const gemOk = text => resp(200, { candidates: [{ content: { parts: [{ text }] } }], usageMetadata: { promptTokenCount: 1500, candidatesTokenCount: 300, totalTokenCount: 1800 } })
const msg = text => ({ id: 'msg_1', type: 'message', role: 'assistant', model: HAIKU, stop_reason: 'end_turn', stop_details: null, content: [{ type: 'thinking', thinking: '', signature: 's' }, { type: 'text', text }],
  usage: { input_tokens: 1500, output_tokens: 600, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, output_tokens_details: { thinking_tokens: 100 } } })
// what a reviewer says about N lines: flags = { lineNumber: { kind, reason } }
const reply = (nLines, flags, verdict, extra) => JSON.stringify({ verdict: verdict || (flags && Object.keys(flags).length ? 'review' : 'pass'), summary: 'Mostly natural Hong Kong Cantonese.',
  lines: Array.from({ length: nLines }, (_, k) => { const i = k + 1, f = flags && flags[i]; return f ? { i, ok: false, kind: f.kind, reason: f.reason } : { i, ok: true } }), ...(extra || {}) })
const linesIn = body => { const m = /LINES \((\d+)\)/.exec(JSON.stringify(body)); return m ? +m[1] : 0 }
// a fresh app with a scripted transport. script(kind, body, opts) → text (or a Response-like) for the 'gemini' or 'anthropic' endpoint
function app(o) {
  o = o || {}
  // the harness runs every setTimeout at once (a timeout would fire immediately); a test of a request that HANGS until it is cancelled needs the real clock
  const c = load(FILE, o.realTimers ? { React, realBelt: true, globals: { setTimeout, clearTimeout } } : { React, realBelt: true }); c.console.info = () => {}; c.console.warn = () => {}
  c.yueModulesSetEnabled(true); c.ev('yueModulesUseData')(DATA)
  c.yueStrictVocabSetEnabled(false)     // starter modules not merged yet: remove this switch when they are (these tests review a track built for a learner who has been taught nothing: the real first-day flow)
  const calls = { gemini: [], anthropic: [], urls: [] }
  c.fetch = async (url, opts) => {
    const body = JSON.parse((opts && opts.body) || 'null'), isA = String(url) === '/api/anthropic'
    calls.urls.push(String(url)); (isA ? calls.anthropic : calls.gemini).push({ url: String(url), body, headers: opts && opts.headers })
    const s = o.script ? await o.script(isA ? 'anthropic' : 'gemini', body, opts) : reply(linesIn(body), o.flags)
    if (s && typeof s === 'object' && 'ok' in s) return s
    return isA ? resp(200, msg(s)) : gemOk(s)
  }
  c.__calls = calls
  if (o.optional) { c.aiSetGenerationPreference({ model: HAIKU, limitUsd: 1, limitRequests: 300 }); if (o.code !== null) c.aiSetAnthropicAccess(o.code || CODE) }
  return c
}
async function mkTrack(c, k) {
  // TEST CHANGED (stage B-1): the track is the first day's 5 NEW words plus, for a longer track (the 90-line size test), words 6..k as LEARNED words under review, as a real Daily is,
  // for a learner who has been taught every other word (so no lesson is short of words). Before, all k words were NEW with nothing taught, which the learner-vocabulary rule (a line may
  // only use taught words, free words and the day's own words) refuses for 30 new words; a track of 5 new + 25 learned words is the realistic shape and builds under the rule.
  const V = c.initCantoneseVocab().map((w, i) => i >= 5 && (k || 5) > 5 ? { ...w, status: 'learning', lastSeen: '2026-11-01', introducedAt: '2026-10-01', repCount: 3, okStreak: 1, dueDate: '2026-11-12', interval: 3 } : w)
  const tg = V.slice(0, k || 5).map((w, i) => ({ ...w, selectionRole: i < 5 ? 'new' : 'review' }))
  const res = await c.generateCantoneseTrack(tg, V, () => {}, () => {}, { cancelled: false }), tr = c.cantoneseBuildTrack(res, tg, 'daily', '2026-11-17T10:00:00.000Z')
  return { V, tg, tr }
}
const ledger = (c, stage) => c.ev('AI_LEDGER').filter(r => !stage || r.stage === stage)

;(async () => {
  const c0 = app()
  const { V, tr: TRACK } = await mkTrack(c0, 5)
  // 18 Nov (stage B-1): the track also holds 4 greeting / parting pairs; the reviewer judges the LESSON lines only (the framing lines are fixed, curated and have no target), so N is the lesson-line count
  const N = TRACK.pairs.filter(p => !p._framing).length
  // the lesson lines of a track (what the reviewer sees, numbered 1..N); pairIndex of a flag counts in the WHOLE track, whose first two pairs are the opening greeting
  const lesson = t => t.pairs.filter(p => !p._framing)

  // ═════ A — the question ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  {
    const q = c0.yueReviewPrompt(TRACK, V), all = q.system + '\n' + q.user
    T('A1', 'the question carries EVERY line (Cantonese, Yale, English), numbered 1…N, with the speaker as A man / B woman, and the targets with the meaning the word list intends',
      q.count === 15 && lesson(TRACK).every((p, i) => q.user.includes((i + 1) + '. [' + (p.speaker === 'B' ? 'B, woman' : 'A, man') + ']') && q.user.includes('Cantonese: ' + p.chinese) && q.user.includes('Yale: ' + p.pinyin) && q.user.includes('English: ' + p.english)) &&
      TRACK.keywords.every(k => q.user.includes(k.chinese + ' (' + k.pinyin + ') = ' + k.english)) && /\[(particle|pronoun|verb)\]/.test(q.user), q.user.slice(0, 600))
    T('A2', 'the reviewer is told to JUDGE only: natural Hong Kong Cantonese (Mandarin-isms and written Chinese are flags, with the 係 唔 冇 咗 嘅 喺 佢 / 是 不 没有 了 的 在 他 contrast), English fidelity, Yale vs the characters, target sense, register A man / B woman; never to rewrite or write romanisation',
      /native Hong Kong Cantonese speaker/.test(q.system) && /only JUDGE/.test(q.system) && /never rewrite, correct or translate a line and you never write romanisation/.test(q.system) && /係 唔 冇 咗 嘅 喺 佢/.test(q.system) && /是 不 没有 了 的 在 他/.test(q.system) &&
      /Flag Mandarin/.test(q.system) && /stiff written Chinese/.test(q.system) && /says what the Cantonese says/.test(q.system) && /Yale matches the characters syllable by syllable/.test(q.system) && /do not write the correct Yale/.test(q.system) &&
      /sense the word list gives/.test(q.system) && /a man speaking as A or a woman speaking as B/.test(q.system) && !/Thai|Japanese|pinyin/i.test(all), q.system.slice(0, 400))
    const f = c0.anthropicJsonFormat(c0.ev('GEMINI_SCHEMAS.yueReview')), objs = []; const walk = s => { if (!s || typeof s !== 'object') return; if (s.type === 'object') objs.push(s); Object.values(s).forEach(walk) }; walk(f.format.schema)
    const sch = c0.ev('GEMINI_SCHEMAS.yueReview')
    T('A3', 'the strict JSON schema: an object with a verdict (pass / review / fail) and a list of {i, ok, kind, reason}; for the optional model it becomes a closed JSON Schema (additionalProperties:false, no wrapper)',
      sch.type === 'OBJECT' && JSON.stringify(sch.required) === '["verdict","lines"]' && JSON.stringify(sch.properties.verdict.enum) === '["pass","review","fail"]' && JSON.stringify(sch.properties.lines.items.required) === '["i","ok"]' &&
      f.wrapped === false && f.format.type === 'json_schema' && objs.length === 2 && objs.every(o => o.additionalProperties === false), f)
    T('A4', 'the token cap grows with the track but stays inside the 16,000 ceiling the optional model is held to (1,500 for a short track, 4,550 for 90 lines, never more than 9,000)', c0.yueReviewMaxTokens(15) === 1500 && c0.yueReviewMaxTokens(90) === 4550 && c0.yueReviewMaxTokens(1000) === 9000)
  }

  // ═════ B — strict parsing ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  {
    const P = (raw, k) => c0.yueReviewParse(raw, k == null ? 4 : k), ok4 = reply(4, { 2: { kind: 'mandarin', reason: 'uses 是' } })
    const good = P(ok4)
    T('B1', 'a good reply parses: verdict, summary, one entry per line, the flag keeps its kind and reason', good.ok && good.verdict === 'review' && good.lines.length === 4 && good.lines[1].ok === false && good.lines[1].kind === 'mandarin' && good.lines[1].reason === 'uses 是' && good.lines[0].ok === true, good)
    T('B2', 'an outer markdown fence is the only thing tolerated', P('```json\n' + ok4 + '\n```').ok && !P('Here you go: ' + ok4).ok && !P(ok4 + ' hope this helps').ok)
    const j = JSON.parse(ok4), bad = (m, why) => { const r = P(JSON.stringify(m)); return !r.ok && r.problem }
    T('B3', 'malformed replies are refused with a plain reason: not JSON, cut off, empty, an array, no verdict, an unknown verdict, no lines list',
      /not valid JSON/.test(P('the lines look fine').problem) && /cut off/.test(P(ok4.slice(0, 40)).problem) && /empty/.test(P('  ').problem) && /not a JSON object/.test(P('[]').problem) &&
      /verdict is missing/.test(bad({ lines: j.lines })) && /verdict is missing/.test(bad({ ...j, verdict: 'great' })) && /no "lines" list/.test(bad({ verdict: 'pass' })))
    T('B4', 'every line must be judged exactly once: a missing line, an extra line, a duplicate, a number out of range, a non-integer number — all refused',
      /judges 3 lines, the track has 4/.test(bad({ ...j, lines: j.lines.slice(1) })) && /judges 5 lines/.test(bad({ ...j, lines: [...j.lines, { i: 5, ok: true }] })) &&
      /judged twice/.test(bad({ ...j, lines: [j.lines[0], j.lines[0], j.lines[2], j.lines[3]] })) && /no valid line number/.test(bad({ ...j, lines: [{ i: 0, ok: true }, ...j.lines.slice(1)] })) &&
      /no valid line number/.test(bad({ ...j, lines: [{ i: '1', ok: true }, ...j.lines.slice(1)] })) && /no valid line number/.test(bad({ ...j, lines: [null, ...j.lines.slice(1)] })))
    T('B5', 'a line verdict must be a real true / false (the string "true", a missing ok, or an unknown kind is refused); a flag without a reason gets a plain placeholder',
      /no true \/ false verdict/.test(bad({ ...j, lines: [{ i: 1, ok: 'true' }, ...j.lines.slice(1)] })) && /no true \/ false verdict/.test(bad({ ...j, lines: [{ i: 1 }, ...j.lines.slice(1)] })) &&
      /unknown kind/.test(bad({ ...j, lines: [{ i: 1, ok: false, kind: 'rude', reason: 'x' }, ...j.lines.slice(1)] })) &&
      (() => { const r = P(JSON.stringify({ ...j, lines: [{ i: 1, ok: false }, ...j.lines.slice(1)] })); return r.ok && r.lines[0].reason === 'flagged, no reason given' && r.lines[0].kind === 'other' })())
    T('B6', 'lines given out of order are put back in order; a good line carries no kind or reason', (() => { const r = P(JSON.stringify({ ...j, lines: [...j.lines].reverse() })); return r.ok && r.lines.map(l => l.i).join() === '1,2,3,4' && r.lines[0].kind === null && r.lines[0].reason === '' })())
  }

  // ═════ C — one request, all lines, flags, stored ══════════════════════════════════════════════════════════════════════════════════════════════
  const FLAGS = { 4: { kind: 'mandarin', reason: 'uses 是 and 没有: Mandarin, not Hong Kong Cantonese' }, 9: { kind: 'yale', reason: 'Yale has one syllable too few' } }
  let reviewed
  {
    const c = app({ flags: FLAGS }), { V: V2, tr } = await mkTrack(c, 5)
    const out = await c.runCantoneseQualityReview(tr, V2, { apiKey: KEY })
    const r = out.review, body = c.__calls.gemini[0] && c.__calls.gemini[0].body, sent = JSON.stringify(body)
    T('C1', 'ONE request for the whole track (15 lines), to the default model, with every line in it, the strict schema as the response schema, and the judging stage in the ledger',
      c.__calls.gemini.length === 1 && c.__calls.anthropic.length === 0 && /gemini-2\.5-flash-lite:generateContent/.test(c.__calls.gemini[0].url) && lesson(tr).every(p => sent.includes(p.chinese)) && linesIn(body) === 15 &&
      body.generationConfig.responseMimeType === 'application/json' && body.generationConfig.responseSchema && body.generationConfig.responseSchema.properties.verdict && ledger(c, 'E_yue_review').length === 1 && ledger(c, 'E_yue_review')[0].provider === 'gemini', c.__calls.urls)
    T('C2', 'the result: done, 2 of 15 flagged, each flag keeps its line number, pair index, speaker, target, Cantonese, kind and reason; the verdict is "review"; reviewer and model named',
      r.status === 'done' && r.total === 15 && r.flagged === 2 && r.verdict === 'review' && r.flags.map(f => f.n).join() === '4,9' && r.flags[0].pairIndex === tr.pairs.indexOf(lesson(tr)[3]) && r.flags[0].pairIndex === 5 && r.flags[0].chinese === lesson(tr)[3].chinese && r.flags[0].speaker === lesson(tr)[3].speaker &&
      r.flags[0].targetChinese === lesson(tr)[3].targetChinese && r.flags[0].kind === 'mandarin' && /Mandarin/.test(r.flags[0].reason) && r.flags[1].kind === 'yale' && r.model === GEM && r.provider === 'gemini' && /Gemini 2\.5 Flash-Lite/.test(r.modelLabel) && r.version === 'yue-review-v1', r)
    // verdict arithmetic: the worse of the reviewer's own verdict and what its flags add up to
    const run = async (flags, verdict) => { const cc = app({ flags, script: (k, b) => reply(linesIn(b), flags, verdict) }), t2 = await mkTrack(cc, 5); return (await cc.runCantoneseQualityReview(t2.tr, t2.V, { apiKey: KEY })).review }
    const many = Object.fromEntries([1, 2, 3, 4, 5, 6].map(i => [i, { kind: 'mandarin', reason: 'Mandarin' }]))
    const rClean = await run({}), rPassWithFlags = await run({ 2: { kind: 'other', reason: 'odd' } }, 'pass'), rMany = await run(many, 'review'), rFailNoFlags = await run({}, 'fail')
    T('C3', 'verdict: no flags → pass; the reviewer says "pass" but flags a line → review (flags win); more than a third flagged → fail; the reviewer\'s own "fail" is kept even with no flag',
      rClean.verdict === 'pass' && rClean.flagged === 0 && rPassWithFlags.verdict === 'review' && rPassWithFlags.modelVerdict === 'pass' && rMany.verdict === 'fail' && rMany.flagged === 6 && rFailNoFlags.verdict === 'fail' && rFailNoFlags.flagged === 0, { rClean, rPassWithFlags: rPassWithFlags.verdict, rMany: rMany.verdict })
    reviewed = c.yueApplyReview(tr, out)
    // 18 Nov (stage B-1): a saved track now holds 15 lesson pairs + 4 greeting / parting pairs = 19; the review still judges the 15 lesson lines
    T('C4', 'the result is stored ON the track (track.qualityReview) and survives a JSON round trip (reload / export / tab sync); the pairs are untouched (nothing rewritten, Yale as the data has it)',
      reviewed.qualityReview && reviewed.qualityReview.status === 'done' && JSON.stringify(JSON.parse(JSON.stringify(reviewed)).qualityReview) === JSON.stringify(reviewed.qualityReview) && JSON.stringify(reviewed.pairs) === JSON.stringify(tr.pairs) &&
      reviewed.pairs.every(p => c.validateYale(p.pinyin).ok) && reviewed.pairs.length === 19 && tr.qualityReview === undefined, Object.keys(reviewed))
    const keep = c.yueApplyReview(reviewed, { review: { status: 'failed', reason: 'x' } }), keep2 = c.yueApplyReview(reviewed, { review: { status: 'not-run', reason: 'x' } }), repl = c.yueApplyReview(tr, { review: { status: 'failed', reason: 'x' } })
    T('C5', 'a failed or not-run attempt NEVER wipes an earlier completed review; on a track with none it is recorded as what it was', keep.qualityReview.status === 'done' && keep2.qualityReview.status === 'done' && repl.qualityReview.status === 'failed')
  }

  // ═════ D — the screens ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  {
    const cred = { geminiKey: KEY }, c = c0
    const done = html(React.createElement(c.CantoneseReviewPanel, { track: reviewed, vocab: V, cred, auto: false }))
    T('D1', 'the result card: "2 of 15 lines flagged", the verdict in words, the reviewer, requests and cost, and for each flagged line its number, speaker, target, kind, the Cantonese and the reason; nothing rewritten',
      /Quality review: 2 of 15 lines flagged/.test(done) && /Some lines need a look/.test(done) && /Reviewed by Gemini 2\.5 Flash-Lite \(default\) · 1 request · ≈ S\$/.test(done) && /Line 4 /.test(done) && /Line 9 /.test(done) && /Mandarin or written Chinese/.test(done) &&
      /Yale does not match the characters/.test(done) && done.includes(lesson(reviewed)[3].chinese) && /uses 是 and 没有: Mandarin, not Hong Kong Cantonese/.test(done) && /Flagged lines stay in the track/.test(done) && /Nothing was rewritten/.test(done) && /Run the quality review again/.test(done), done)
    const clean = c.yueApplyReview(TRACK, { review: { version: 'yue-review-v1', status: 'done', verdict: 'pass', modelVerdict: 'pass', summary: 'All natural.', total: 15, flagged: 0, flags: [], requests: 1, costUsd: 0.0004, modelLabel: 'Gemini 2.5 Flash-Lite (default)', ranAt: '2026-11-17T10:00:00Z' } })
    const dClean = html(React.createElement(c.CantoneseReviewPanel, { track: clean, vocab: V, cred, auto: false }))
    T('D2', 'a clean review says "all 15 lines judged fine" and lists no flagged line', /all 15 lines judged fine/.test(dClean) && /No problems found/.test(dClean) && !/Line \d+ /.test(dClean))
    const nr = html(React.createElement(c.CantoneseReviewPanel, { track: { ...TRACK, qualityReview: { status: 'not-run', reason: 'no Gemini key is saved in Settings', modelLabel: 'x', total: 15 } }, vocab: V, cred: {}, auto: false }))
    T('D3', 'not run: said in words (no model asked, the reason, structure check only, can still study, nothing sent to any other model)', /Quality review not run/.test(nr) && /No model was asked, because no Gemini key is saved in Settings/.test(nr) && /checked by its structure only/.test(nr) && /you can still study it/.test(nr) && /Nothing was sent to any other model/.test(nr), nr)
    const fl = html(React.createElement(c.CantoneseReviewPanel, { track: { ...TRACK, qualityReview: { status: 'failed', reason: 'the reviewer\'s answer could not be used (the reply is not valid JSON); no line was judged', modelLabel: 'Gemini 2.5 Flash-Lite (default)', total: 15, requests: 1, costUsd: 0.0003 } }, vocab: V, cred, auto: false }))
    T('D4', 'failed: the reason, which model was asked, that no other model was tried, the cost, that Study is still possible, and a button to run it again', /could not be completed/.test(fl) && /not valid JSON/.test(fl) && /Gemini 2\.5 Flash-Lite \(default\) was asked; no other model was tried/.test(fl) && /1 request/.test(fl) && /still study the track/.test(fl) && /Run the quality review \(Gemini/.test(fl), fl)
    const saved = html(React.createElement(c.CantoneseQualityReview, { track: reviewed, vocab: V, cred, onSave() {}, onBack() {} }))
    T('D5', 'the saved-track screen shows the earlier result and offers to run it again (nothing is sent until the button)', /Quality review/.test(saved) && /2 of 15 lines flagged/.test(saved) && /Run the quality review again/.test(saved) && /Back to the track/.test(saved))
    const fresh = html(React.createElement(c.CantoneseQualityReview, { track: TRACK, vocab: V, cred, onSave() {}, onBack() {} })), nokey = html(React.createElement(c.CantoneseQualityReview, { track: TRACK, vocab: V, cred: {}, onSave() {}, onBack() {} }))
    T('D6', 'a saved track with no review: "not run yet" + a button when a model can be reached; when none can, the reason in words and no button', /Quality review not run yet/.test(fresh) && /Nothing is sent until you press the button/.test(fresh) && /Run the quality review \(/.test(fresh) &&
      /Quality review not run/.test(nokey) && /no Gemini key is saved in Settings/.test(nokey) && !/Run the quality review/.test(nokey), nokey)
    const nyNames = c.ev('YUE_NOT_YET').map(r => r[0])
    const dash = html(React.createElement(c.CantoneseDashboard, { vocab: V.map(w => ({ ...w })), tracks: [], targets: [], trackTargets: [], notice: '', onStartTrack() {}, onNav() {}, onDeleteTrack() {}, onOpenTrack() {}, revisionSelection: { counts: { total: 0, due: 0 }, targets: [] }, selection: null, onNotYet() {} }))
    const card = dash.slice(dash.indexOf('Not available for Cantonese yet'))
    // 18 Nov (stage B-1): the review judges the LESSON lines only (the greeting and goodbye are fixed words with no target), so the screens now say "every lesson line" instead of "every line"
    T('D7', 'the "Not available for Cantonese yet" card no longer lists Quality review; Listening track, Topics and the model-written tracks / test generator stay; the card says a model now reviews the tracks',
      JSON.stringify(nyNames) === JSON.stringify(['Listening track', 'Topics', 'Model-written tracks and the test generator']) && !/Quality review/.test(card.slice(0, card.indexOf('Daily and Revision'))) && ['Listening track', 'Topics', 'Model-written tracks and the test generator'].every(x => card.includes(x)) &&
      /quality review by the model chosen in Settings then judges every lesson line/.test(card) && /no AI request to write them/.test(card), card.slice(0, 500))
    const ny = html(React.createElement(c.CantoneseNotYet, { what: 'Model-written tracks and the test generator', onBack() {} }))
    T('D8', 'the "model-written tracks" screen still says it is not available and now adds that a model only reviews the tracks', /is not available for Cantonese yet/.test(ny) && /a model only reviews them afterwards/.test(ny))
    const gen = html(React.createElement(c.CantoneseGenerator, { vocab: V, targets: V.slice(0, 5).map(w => ({ ...w, selectionRole: 'new' })), selection: null, cred: { geminiKey: KEY }, trackMode: 'daily', tracks: [], onGenerated() {}, onBack() {} }))
    const gen0 = html(React.createElement(c.CantoneseGenerator, { vocab: V, targets: V.slice(0, 5).map(w => ({ ...w, selectionRole: 'new' })), selection: null, cred: {}, trackMode: 'daily', tracks: [], onGenerated() {}, onBack() {} }))
    T('D9', 'before the build the screen says what will happen after it: with a key "Gemini 2.5 Flash-Lite (default) reviews every lesson line in one request"; without one that the review will not run and why',
      /no AI request writes it/.test(gen) && /Afterwards Gemini 2\.5 Flash-Lite \(default\) reviews every lesson line in one request/.test(gen) && /no AI request writes it/.test(gen0) && /will not run; the track is checked by its structure only/.test(gen0) && /no Gemini key is saved in Settings/.test(gen0))
  }

  // ═════ E — the whole flow with a key ══════════════════════════════════════════════════════════════════════════════════════════════════════════
  {
    const c = app({ flags: FLAGS })
    c.localStorage.setItem('tt-gemini-key', JSON.stringify(KEY))
    let r; await TR.act(async () => { r = TR.create(React.createElement(c.CantoneseTeacher, { lang: 'yue', onSetLang() {} })); await flush(80) })
    const btn = rx => r.root.findAll(x => x.type === 'button').find(b => rx.test(textOf(b.children)))
    const click = async rx => { const b = btn(rx); if (!b) return false; await TR.act(async () => { b.props.onClick(); await flush(80) }); return true }
    T('E1', 'Daily Track → the generator says a review follows; Build the track → the track is built, the structure check passes, then ONE review request is made on its own and its result is shown',
      await click(/Daily Track/) && /Afterwards Gemini 2\.5 Flash-Lite \(default\) reviews every lesson line in one request/.test(txt(r)) && c.__calls.gemini.length === 0 && await click(/Build the track/) && /Structure check passed/.test(txt(r)) && c.__calls.gemini.length === 1 &&
      /Quality review: 2 of 15 lines flagged/.test(txt(r)) && /1 model request \(the review\)/.test(txt(r)), txt(r).slice(-700))
    T('E2', 'the flagged lines are listed with reasons on the generator screen; Study is offered as "Study anyway — 2 lines flagged" (the learner chooses; nothing is removed)', /Line 4 /.test(txt(r)) && /Line 9 /.test(txt(r)) && /Mandarin, not Hong Kong Cantonese/.test(txt(r)) && !!btn(/Study anyway — 2 lines flagged/), txt(r).slice(-500))
    await click(/Study anyway — 2 lines flagged/)
    const saved = () => { const s = JSON.parse(c.localStorage.getItem('tt-yue-tracks') || 'null'); const a = s && (s.items || s.list || s); return Array.isArray(a) ? a : (a && a.v) || [] }
    const t1 = saved()[0]
    // 18 Nov (stage B-1): a saved track now holds 15 lesson pairs + 4 greeting / parting pairs = 19; the review still judges the 15 lesson lines
    T('E3', 'Study anyway saves the track WITH its review under the Cantonese key (2 flags, requests 1, cost counted, the reviewer named) and opens the Player',
      /Say in Cantonese/.test(txt(r)) && saved().length === 1 && t1.qualityReview && t1.qualityReview.status === 'done' && t1.qualityReview.flagged === 2 && t1.qualityReview.requests === 1 && t1.qualityReview.costUsd > 0 && t1.pairs.length === 19 && t1.aiUsage && t1.aiUsage.total === 1, t1 && t1.qualityReview)
    T('E4', 'the Player has a Review button for Cantonese; it opens the saved-track review screen with the earlier result', await click(/Review$/) && /Quality review/.test(txt(r)) && /2 of 15 lines flagged/.test(txt(r)) && /Run the quality review again/.test(txt(r)) && !/is not available for Cantonese yet/.test(txt(r)), txt(r).slice(0, 400))
    c.__calls.gemini.length = 0
    T('E5', 'Run the quality review again: ONE more request, the result replaces the earlier one on the saved track (a new date), and the screen shows it', await click(/Run the quality review again/) && c.__calls.gemini.length === 1 && saved().length === 1 &&
      saved()[0].qualityReview.status === 'done' && saved()[0].qualityReview.ranAt !== t1.qualityReview.ranAt && /2 of 15 lines flagged/.test(txt(r)), c.__calls.gemini.length)
    T('E6', 'Back to the track returns to the Player; the dashboard row downloads a transcript that carries the review', await click(/Back to the track/) && /Say in Cantonese|Cantonese/.test(txt(r)))
    // opened from the END-OF-LESSON screen (the Player calls onReviewQuality('lesson-complete')): Back returns to that finished-lesson state, not to the first cue
    const playerNow = () => r.root.findAll(x => x.type === c.Player)[0]
    const fromHeader = playerNow() && playerNow().props.startCompleted === false
    await TR.act(async () => { playerNow().props.onReviewQuality('lesson-complete'); await flush(40) })
    const onReview = /Quality review/.test(txt(r)) && /Back to the track/.test(txt(r))
    await click(/Back to the track/)
    T('E6b', 'Back from the review returns to the Player as it was left: a review opened from the header button returns to the lesson, one opened from the end-of-lesson screen returns to the finished lesson (startCompleted)', fromHeader && onReview && !!playerNow() && playerNow().props.startCompleted === true)
    await TR.act(async () => { r.unmount() })
    // the transcript of the stored track
    let captured = ''
    const cx = load(FILE, { React, globals: { Blob: class { constructor(parts) { this.text = parts.join('') } }, URL: { createObjectURL: b => { captured = b.text; return 'blob:x' }, revokeObjectURL() {} },
      document: { querySelector: () => null, getElementById: () => ({ style: {} }), createElement: () => ({ style: {}, click() {} }), body: { appendChild() {}, removeChild() {} }, head: {}, addEventListener() {} } } }); cx.console.info = () => {}
    cx.downloadCantoneseTrack(saved()[0])
    T('E7', 'the transcript: a Quality review line (counts, verdict, reviewer, date, cost, version), each FLAG with line, speaker, target, Cantonese, kind and reason, a REVIEW: marker on the flagged pair, and the usage block; the old "not available" sentence is gone',
      /Quality review: 2 of 15 lines flagged · Some lines need a look · reviewed by Gemini 2\.5 Flash-Lite \(default\) on 2026-|Quality review: 2 of 15 lines flagged · Some lines need a look · reviewed by Gemini 2\.5 Flash-Lite \(default\) on \d{4}-/.test(captured) &&
      /yue-review-v1/.test(captured) && /FLAG line 4 \(/.test(captured) && /FLAG line 9 \(/.test(captured) && /Mandarin or written Chinese: uses 是/.test(captured) && (captured.match(/REVIEW:\s+FLAGGED/g) || []).length === 2 && /AI USAGE|GEMINI USAGE/i.test(captured) && /E_yue_review/.test(captured) &&
      !/not available for Cantonese yet/.test(captured), captured.slice(0, 900))
  }

  // ═════ F — malformed reply, provider error, cancel ═══════════════════════════════════════════════════════════════════════════════════════════════
  {
    const c = app({ script: () => 'I looked at them and they seem fine.' }), { V: V2, tr } = await mkTrack(c, 5)
    const out = await c.runCantoneseQualityReview(tr, V2, { apiKey: KEY }), r = out.review
    T('F1', 'a malformed reply: status failed + malformed, "no line was judged", the cost of the request is counted, exactly ONE request (no hidden retry), and no flags are invented',
      r.status === 'failed' && r.malformed === true && /could not be used \(the reply is not valid JSON\); no line was judged/.test(r.reason) && r.requests === 1 && r.costUsd > 0 && c.__calls.gemini.length === 1 && r.flags === undefined && r.flagged === undefined, r)
    const c2 = app({ script: () => reply(7, {}) }), t2 = await mkTrack(c2, 5), o2 = await c2.runCantoneseQualityReview(t2.tr, t2.V, { apiKey: KEY })
    T('F2', 'a reply that judges 7 of 15 lines is refused as a whole (nothing counts as judged)', o2.review.status === 'failed' && /judges 7 lines, the track has 15/.test(o2.review.reason) && o2.review.malformed === true && !('flags' in o2.review))
    const c3 = app({ script: () => resp(400, { error: { message: 'API key not valid: ' + KEY + ' — please pass a valid API key', status: 'INVALID_ARGUMENT' } }) }), t3 = await mkTrack(c3, 5), o3 = await c3.runCantoneseQualityReview(t3.tr, t3.V, { apiKey: KEY })
    T('F3', 'a provider error: status failed with the provider\'s words, the key is blanked out of the text, nothing is sent to another model', o3.review.status === 'failed' && o3.review.reason.length > 5 && !o3.review.reason.includes(KEY) && c3.__calls.anthropic.length === 0 && o3.review.malformed === undefined, o3.review)
    // cancel: the request hangs until the run is cancelled
    const c4 = app({ realTimers: true, script: (k, b, opts) => new Promise((res, rej) => { opts.signal.addEventListener('abort', () => { const e = new Error('aborted'); e.name = 'AbortError'; rej(e) }) }) }), t4 = await mkTrack(c4, 5)
    let rid = null, stop = false
    const p4 = c4.runCantoneseQualityReview(t4.tr, t4.V, { apiKey: KEY, onRun: id => { rid = id }, cancelled: () => stop })
    await flush(20); stop = true; c4.aiCancelRun(rid, 'test'); const o4 = await p4
    T('F4', 'cancelling a running review aborts the request and returns "cancelled": no review is recorded on the track', o4.cancelled === true && !o4.review && c4.yueApplyReview(t4.tr, o4) === t4.tr && c4.__calls.gemini.length === 1)
    // the same through the screen
    const c5 = app({ realTimers: true, script: (k, b, opts) => new Promise((res, rej) => { opts.signal.addEventListener('abort', () => { const e = new Error('aborted'); e.name = 'AbortError'; rej(e) }) }) }), t5 = await mkTrack(c5, 5)   // never answered: the learner cancels
    let pr; await TR.act(async () => { pr = TR.create(React.createElement(c5.CantoneseReviewPanel, { track: t5.tr, vocab: t5.V, cred: { geminiKey: KEY }, auto: true })); await flush(30) })
    const running = txt(pr)
    const cancelBtn = pr.root.findAll(x => x.type === 'button').find(b => /Cancel the review/.test(textOf(b.children)))
    await TR.act(async () => { cancelBtn.props.onClick(); await flush(60) })
    T('F5', 'on the screen: "Quality review in progress" with a Cancel button; after Cancel "Quality review cancelled", nothing judged, a button to run it again', /Quality review in progress/.test(running) && /judging all 15 lines in one request/.test(running) && /Quality review cancelled/.test(txt(pr)) && /Nothing was judged/.test(txt(pr)) && /Run the quality review/.test(txt(pr)), txt(pr))
    await TR.act(async () => { pr.unmount() })
    // generator: a malformed reply still lets the learner study; the Study button is held only while the request runs
    const c6 = app({ script: () => 'nonsense' }), t6 = await mkTrack(c6, 5); let got = null
    let gr; await TR.act(async () => { gr = TR.create(React.createElement(c6.CantoneseGenerator, { vocab: t6.V, targets: t6.tg, selection: null, cred: { geminiKey: KEY }, trackMode: 'daily', tracks: [], onGenerated: t => { got = t }, onBack() {} })); await flush(20) })
    await TR.act(async () => { gr.root.findAll(x => x.type === 'button').find(b => /Build the track/.test(textOf(b.children))).props.onClick(); await flush(120) })
    const g1 = txt(gr), studyBtn = gr.root.findAll(x => x.type === 'button').find(b => /Study track/.test(textOf(b.children)))
    // 18 Nov (stage B-1): a saved track now holds 15 lesson pairs + 4 greeting / parting pairs = 19; the review still judges the 15 lesson lines
    T('F6', 'generator: a malformed reply is said in words ("could not be completed"), the Study button is enabled, and the track handed on carries the failed attempt (no flags, nothing wiped)', /Structure check passed/.test(g1) && /Quality review could not be completed/.test(g1) && !!studyBtn && !studyBtn.props.disabled &&
      (await TR.act(async () => { studyBtn.props.onClick(); await flush(10) }), got && got.qualityReview && got.qualityReview.status === 'failed' && got.pairs.length === 19), g1.slice(-400))
    await TR.act(async () => { gr.unmount() })
  }

  // ═════ G — no key / no model ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  {
    const c = app({}), { V: V2, tr } = await mkTrack(c, 5), out = await c.runCantoneseQualityReview(tr, V2, { apiKey: '' }), r = out.review
    T('G1', 'default model and no key: nothing is sent (no request of any kind), status not-run, the reason in words, 0 requests, no usage', r.status === 'not-run' && /no Gemini key is saved in Settings/.test(r.reason) && c.__calls.urls.length === 0 && r.requests === 0 && r.costUsd === 0 && !out.usage && ledger(c).length === 0, r)
    const cK = app({}), tK = await mkTrack(cK, 5), oK = await cK.runCantoneseQualityReview(tK.tr, tK.V, { apiKey: 'sk-short' })
    T('G2', 'a value that is not a Gemini key counts as no key (nothing sent)', oK.review.status === 'not-run' && cK.__calls.urls.length === 0)
    const c2 = app({ optional: true, code: null }), t2 = await mkTrack(c2, 5), o2 = await c2.runCantoneseQualityReview(t2.tr, t2.V, { apiKey: KEY })
    T('G3', 'the optional model chosen but no site access code saved: not-run with that reason — and NOTHING goes to Gemini even though a Gemini key is saved (never a silent fall-back to another model)',
      o2.review.status === 'not-run' && /site access code for the selected model/.test(o2.review.reason) && /Settings → AI Generation Model/.test(o2.review.reason) && c2.__calls.urls.length === 0 && o2.review.provider === 'anthropic', o2.review)
    const st = c.aiSelectedModelStatus('', 'yue-quality-review'), st2 = c.aiSelectedModelStatus(KEY, 'yue-quality-review')
    T('G4', 'the availability check itself: the default model needs a Gemini key; with one it is ready; it reports the label of the model chosen', st.ready === false && st.optional === false && st2.ready === true && st2.model === GEM && /Gemini 2\.5 Flash-Lite/.test(st2.label) && st.reason === 'no Gemini key is saved in Settings')
    // through the generator with no key: the whole screen, the study button, the track carries the not-run statement
    const c3 = app({}), t3 = await mkTrack(c3, 5); let got = null
    let gr; await TR.act(async () => { gr = TR.create(React.createElement(c3.CantoneseGenerator, { vocab: t3.V, targets: t3.tg, selection: null, cred: {}, trackMode: 'daily', tracks: [], onGenerated: t => { got = t }, onBack() {} })); await flush(20) })
    await TR.act(async () => { gr.root.findAll(x => x.type === 'button').find(b => /Build the track/.test(textOf(b.children))).props.onClick(); await flush(120) })
    const g = txt(gr), study = gr.root.findAll(x => x.type === 'button').find(b => /Study track/.test(textOf(b.children)))
    // 18 Nov (stage B-1): a saved track now holds 15 lesson pairs + 4 greeting / parting pairs = 19; the review still judges the 15 lesson lines
    T('G5', 'generator, no key: "Structure check passed", "Quality review not run … no Gemini key is saved in Settings", still 0 model requests, Study is enabled and hands on a track whose review says not-run; nothing was sent',
      /Structure check passed/.test(g) && /Quality review not run/.test(g) && /No model was asked, because no Gemini key is saved in Settings/.test(g) && /0 model requests/.test(g) && !!study && !study.props.disabled && c3.__calls.urls.length === 0 &&
      (await TR.act(async () => { study.props.onClick(); await flush(10) }), got && got.qualityReview.status === 'not-run' && got.qualityReview.requests === 0 && got.pairs.length === 19), g.slice(-500))
    await TR.act(async () => { gr.unmount() })
  }

  // ═════ H — the model setting is honoured ══════════════════════════════════════════════════════════════════════════════════════════════════════
  {
    const c = app({ optional: true, flags: FLAGS }), { V: V2, tr } = await mkTrack(c, 5)
    const out = await c.runCantoneseQualityReview(tr, V2, { apiKey: '' }), r = out.review, a = c.__calls.anthropic[0], b = a && a.body
    T('H1', 'the optional model selected: the ONE request goes to the site\'s server function (not to Gemini), with the access-code header, the system prompt separate, and the strict schema as a closed JSON Schema; NO Gemini key is needed',
      c.__calls.anthropic.length === 1 && c.__calls.gemini.length === 0 && a.url === '/api/anthropic' && a.headers['x-lt-access'] === CODE && b.model === HAIKU && /only JUDGE/.test(b.system) && b.messages[0].role === 'user' && linesIn(b) === 15 &&
      b.output_config.format.type === 'json_schema' && b.output_config.format.schema.properties.verdict && b.output_config.format.schema.additionalProperties === false, a && Object.keys(b))
    T('H2', 'the result records which model judged: provider, model id and its label (from the shared model table); the ledger row is the optional provider\'s; the same flags come out',
      r.status === 'done' && r.provider === 'anthropic' && r.model === HAIKU && /Haiku/.test(r.modelLabel) && r.flagged === 2 && ledger(c, 'E_yue_review').length === 1 && ledger(c, 'E_yue_review')[0].provider === 'anthropic', r)
    const d = html(React.createElement(c.CantoneseReviewPanel, { track: c.yueApplyReview(tr, out), vocab: V2, cred: {}, auto: false }))
    T('H3', 'the screen names the reviewer that was used', /Reviewed by Claude Haiku 5\.5 \(experimental\) · 1 request/.test(d), d.slice(0, 300))
    // switching the setting back: the default again
    c.aiSetGenerationPreference({ model: GEM }); c.__calls.anthropic.length = 0
    const out2 = await c.runCantoneseQualityReview(tr, V2, { apiKey: KEY })
    T('H4', 'the setting is read for every review: back on the default the next review goes to Gemini and not to the optional model', out2.review.provider === 'gemini' && c.__calls.gemini.length === 1 && c.__calls.anthropic.length === 0)
    // optional model fails (billing): said in words, latched, never replaced by the other model
    const c2 = app({ optional: true, script: (k) => resp(200, { type: 'error', status: 402, error: { type: 'billing_error', message: 'credit balance too low' } }) }), t2 = await mkTrack(c2, 5)
    const o2 = await c2.runCantoneseQualityReview(t2.tr, t2.V, { apiKey: KEY })
    T('H5', 'the optional model fails (billing): the review is "failed" with the provider\'s plain message and "your model choice was NOT changed", and NOTHING was sent to Gemini although a Gemini key is saved', o2.review.status === 'failed' && /billing|credit/i.test(o2.review.reason) && /model choice was NOT changed/.test(o2.review.reason) && c2.__calls.gemini.length === 0 && c2.__calls.anthropic.length === 1, o2.review)
    // through the screen: the generator with the optional model and no Gemini key reviews (the key is not needed)
    const c3 = app({ optional: true, flags: {} }), t3 = await mkTrack(c3, 5); let gr
    await TR.act(async () => { gr = TR.create(React.createElement(c3.CantoneseGenerator, { vocab: t3.V, targets: t3.tg, selection: null, cred: {}, trackMode: 'daily', tracks: [], onGenerated() {}, onBack() {} })); await flush(20) })
    const pre = txt(gr)
    await TR.act(async () => { gr.root.findAll(x => x.type === 'button').find(b => /Build the track/.test(textOf(b.children))).props.onClick(); await flush(150) })
    T('H6', 'generator with the optional model and no Gemini key: the plan names the optional model, the review runs (one request, to its server function) and the screen shows "all 15 lines judged fine"',
      /Afterwards Claude Haiku 5\.5 \(experimental\) reviews every lesson line in one request/.test(pre) && c3.__calls.anthropic.length === 1 && c3.__calls.gemini.length === 0 && /all 15 lines judged fine/.test(txt(gr)) && /Reviewed by Claude Haiku 5\.5/.test(txt(gr)), txt(gr).slice(-400))
    await TR.act(async () => { gr.unmount() })
    // the run is its own kind: it is a quality-review run, bound to the model chosen NOW
    c.aiSetGenerationPreference({ model: HAIKU }); const rid = c.aiBeginRun('yue-quality-review', 't')
    T('H7', 'the review run kind binds the model chosen in Settings like any other run (and sits in the quality-review lane, so it never cancels a track being written)', c.ev('AI_RUN_GEN_MODEL').get(rid) === HAIKU && c.ev('aiLaneOf')('yue-quality-review') === 'qc')
  }

  // ═════ I — no credential written anywhere ═════════════════════════════════════════════════════════════════════════════════════════════════════
  {
    const c = app({ optional: false, flags: FLAGS }), { V: V2, tr } = await mkTrack(c, 5), out = await c.runCantoneseQualityReview(tr, V2, { apiKey: KEY }), t = c.yueApplyReview(tr, out)
    let captured = ''
    const cx = load(FILE, { React, globals: { Blob: class { constructor(parts) { this.text = parts.join('') } }, URL: { createObjectURL: b => { captured = b.text; return 'blob:x' }, revokeObjectURL() {} },
      document: { querySelector: () => null, getElementById: () => ({ style: {} }), createElement: () => ({ style: {}, click() {} }), body: { appendChild() {}, removeChild() {} }, head: {}, addEventListener() {} } } }); cx.console.info = () => {}
    cx.downloadCantoneseTrack(t)
    const dump = JSON.stringify(t) + captured + JSON.stringify(c.ev('AI_LEDGER').map(r => ({ ...r, prompt: undefined }))) + [...Array(c.localStorage.length).keys()].map(i => c.localStorage.getItem(c.localStorage.key(i))).join('')
    T('I1', 'after a review with a saved Gemini key: the key is in no track, no transcript, no storage value and no ledger row', !dump.includes(KEY) && !/AIza/.test(JSON.stringify(t) + captured), dump.indexOf(KEY))
    const cO = app({ optional: true, flags: FLAGS }), tO = await mkTrack(cO, 5), oO = await cO.runCantoneseQualityReview(tO.tr, tO.V, { apiKey: '' }), tt = cO.yueApplyReview(tO.tr, oO)
    cx.downloadCantoneseTrack(tt)
    const dumpO = JSON.stringify(tt) + captured + JSON.stringify(cO.ev('AI_LEDGER').map(r => ({ ...r, prompt: undefined }))) + [...Array(cO.localStorage.length).keys()].map(i => cO.localStorage.getItem(cO.localStorage.key(i))).join('')
    T('I2', 'with the optional model: the site access code is in no track, no transcript, no storage value and no ledger row (it is sent only as the request header)', !dumpO.includes(CODE) && cO.__calls.anthropic[0].headers['x-lt-access'] === CODE, dumpO.indexOf(CODE))
    const cE = app({ script: () => resp(401, { error: { message: 'bad key ' + KEY + ' and code ' + CODE } }) }), tE = await mkTrack(cE, 5)
    cE.aiSetAnthropicAccess(CODE)
    const oE = await cE.runCantoneseQualityReview(tE.tr, tE.V, { apiKey: KEY })
    T('I3', 'an error text that echoes a key or the access code is blanked before it is shown or stored', oE.review.status === 'failed' && !oE.review.reason.includes(KEY) && !oE.review.reason.includes(CODE) && cE.aiScrubSecrets('x ' + CODE + ' y ' + KEY, [KEY]) === 'x … y …')
    const block = SRC.slice(SRC.indexOf('// ══ CANTONESE QUALITY REVIEW'), SRC.indexOf('// ── Japanese adapter for the target-group core'))
    const ui = SRC.slice(SRC.indexOf('function CantoneseReviewPanel('), SRC.indexOf('// The Cantonese generator screen:'))
    T('I4', 'no key literal, key header or endpoint in the review code (the key is only ever passed to the shared transport; the access code is never read here)', !/AIza[0-9A-Za-z_-]{20,}|sk-[A-Za-z0-9]{20,}|x-api-key|x-lt-access|AI_ANTHROPIC_ACCESS|api\.anthropic\.com|stSet\(|localStorage|sessionStorage/.test(block + ui), (block + ui).match(/x-lt-access|stSet\(|localStorage|AI_ANTHROPIC_ACCESS/))
  }

  // ═════ J — cost counted ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  {
    const c = app({ flags: FLAGS }), { V: V2, tr } = await mkTrack(c, 5), out = await c.runCantoneseQualityReview(tr, V2, { apiKey: KEY }), r = out.review
    const rows = ledger(c, 'E_yue_review'), sum = rows.reduce((a, x) => a + (x.costUsd || 0), 0)
    const chip = await c.stGet('tt-last-track-ai-usage')
    T('J1', 'the cost is counted from the same ledger as every language: 1 request, its tokens from the provider, a cost above zero that equals the ledger row, in the review record', r.requests === 1 && r.costUsd > 0 && Math.abs(r.costUsd - sum) < 1e-12 && r.inputTokens === 1500 && r.outputTokens === 300 && rows.length === 1, { r, sum })
    const t = c.yueApplyReview(tr, out)
    T('J2', 'the track carries the usage (aiUsage + compact call rows) like any other language\'s track, with the review stage counted as a QC call', t.aiUsage && t.aiUsage.total === 1 && Math.abs(t.aiUsage.costUsd - sum) < 1e-12 && t.aiUsage.categories.qc === 1 && Array.isArray(t.aiCalls) && t.aiCalls.length === 1 && t.aiCalls[0][1] === 'E_yue_review')
    T('J3', 'the header cost chip is fed (the last track\'s cost, language yue, 1 request, in SGD)', chip && chip.language === 'yue' && chip.totalRequests === 1 && chip.estimatedUsd > 0 && chip.currency === 'SGD' && Math.abs(chip.estimatedUsd - sum) < 1e-12, chip)
    const txtc = c.yueReviewCostText(r)
    T('J4', 'the cost line shows requests, S$ and US$', /^1 request · ≈ S\$0\.\d+ \(US\$0\.\d{4}\)$/.test(txtc), txtc)
    const cF = app({ script: () => 'garbage' }), tF = await mkTrack(cF, 5), oF = await cF.runCantoneseQualityReview(tF.tr, tF.V, { apiKey: KEY })
    T('J5', 'a wasted request (malformed reply) is counted too: the cost is on the failed record and in the usage', oF.review.requests === 1 && oF.review.costUsd > 0 && oF.usage && oF.usage.total === 1)
    // 90 lines: still ONE request
    const c90 = app({ flags: {} }), t90 = await mkTrack(c90, 30), o90 = await c90.runCantoneseQualityReview(t90.tr, t90.V, { apiKey: KEY })
    // 18 Nov (stage B-1): the track is 94 pairs (90 lesson + 4 greeting / parting); the review still sends exactly the 90 lesson lines in ONE request
    T('J6', 'a full 30-word track (90 lines) is still ONE request with all 90 lines, and the answer must judge all 90', t90.tr.pairs.length === 94 && t90.tr.pairs.filter(p => !p._framing).length === 90 && c90.__calls.gemini.length === 1 && linesIn(c90.__calls.gemini[0].body) === 90 && o90.review.status === 'done' && o90.review.total === 90 && c90.__calls.gemini[0].body.generationConfig.maxOutputTokens === 4550)
  }

  // ═════ K — never another language's reviewer ══════════════════════════════════════════════════════════════════════════════════════════════════
  {
    const c = app({ flags: FLAGS }), { V: V2, tr } = await mkTrack(c, 5), hit = []
    ;['runMandarinTrackQC', 'runAiQualityCheck', 'runMandarinQualityCheckCore', 'aiQcPromptMatch', 'aiQcEvaluateGroup', 'runQualityCheckCore', 'runJapaneseTrackQC', 'jazhQcFinaliseAndListen', 'mandarinQuickScan', 'finaliseThaiTrackAfterQc', 'finaliseJaZhTrackAfterQc', 'geminiJudge'].forEach(name => {
      if (typeof c[name] === 'function') c[name] = (...a) => { hit.push(name); throw new Error(name + ' must not run for Cantonese') } })
    const out = await c.runCantoneseQualityReview(tr, V2, { apiKey: KEY })
    T('K1', 'a Cantonese review runs none of the Mandarin, Japanese or Thai reviewers / QC functions (instrumented) and still completes', out.review.status === 'done' && hit.length === 0, hit)
    const block = SRC.slice(SRC.indexOf('// ══ CANTONESE QUALITY REVIEW'), SRC.indexOf('// ── Japanese adapter for the target-group core')), code = block.replace(/\/\/[^\n]*/g, '')
    T('K2', 'the review code names no other language\'s function and does not use the generic generate / judge wrappers: only the shared transport (geminiRequest) and the run / usage plumbing',
      !/runMandarin|mandarin[A-Z]|runJapanese|japanese[A-Z]|runAiQualityCheck|aiQc|runQualityCheckCore|finalise\w*After|qcRunnerFor|trackAdapterFor|geminiGenerate|geminiJudge|MandarinQualityReview|JapaneseQualityReview/.test(code) && /geminiRequest\(/.test(code) && /aiBeginRun\(YUE_REVIEW_RUN_KIND/.test(code), code.match(/runMandarin\w*|mandarin\w*|geminiGenerate|geminiJudge/g))
    const refuse = f => { try { f(); return null } catch (e) { return String(e && e.message) } }
    T('K3', 'the shared dispatchers still refuse yue in words (the review is its own Cantonese path, nothing falls through to another language)', /yue/.test(refuse(() => c.ev('qcRunnerFor')('yue')) || '') && /yue/.test(refuse(() => c.ev('trackAdapterFor')('yue')) || ''))
    T('K4', 'the Cantonese writer is still model-free: generateCantoneseTrack makes no request (the review is a separate step after the build)', (() => { const w = SRC.slice(SRC.indexOf('async function generateCantoneseTrack('), SRC.indexOf('function cantoneseBuildTrack(')); return !/geminiRequest|geminiGenerate|aiBeginRun|fetch\(/.test(w) })())
  }

  console.log((fails ? 'FAIL ' : 'ALL PASS ') + (n - fails) + '/' + n)
  process.exit(fails ? 1 : 0)
})().catch(e => { console.log('CRASH', e && e.stack || e); process.exit(2) })
