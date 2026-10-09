// v649 §34 — one fresh track per language through the app's REAL creation path, with the model
// simulated at the Gemini boundary (the sandbox has no Gemini access and no key):
//   TH: generateConversationTrack → runQualityCheckCore(deferMetadata) → finaliseThaiTrackAfterQc
//       (quota → recovery → metadata → invariants) → ensureListeningBuilt
//   JA/ZH: generateJapaneseTrack / generateMandarinTrack → jazhQcFinaliseAndListen
//       (QC → FINAL_TRACK → Listening → usage summary)
// Prints the counters §34 asks for AND the actual conversation content.
const { setup, sentence, mock, kwOf, txt } = require('./tests14')
const out = []
const say = s => out.push(s)

async function runLang(lang) {
  const S = setup(lang)
  const c = S.c
  const realClient = c.geminiRequest
  const st = mock(S, lang, { reject: lang === 'th' ? ['ดีมากครับ'] : lang === 'ja' ? ['Right now it is'] : ['我喜欢'], bridges: true })   // the simulated QC rejects one generated frame per target
  const inner = c.geminiRequest                        // the simulated model (prompt → reply text)
  c.geminiRequest = realClient                         // the app's REAL Gemini client stays in place
  // generation prompts of each language's real generator, answered from the same fixture frames
  const genCount = {}
  const reply = async o => {
    const q = o.messages[o.messages.length - 1].content
    if (lang === 'th' && /You design Thai language lesson scenarios/.test(q)) return JSON.stringify({ scene: 'Two friends planning a weekend trip.', characterA: 'Somchai, a Thai man', characterB: 'Nida, a Thai woman',
      opening: 'สวัสดีครับ', opening_phonetic: 'sà-wàt-dii khráp', opening_english: 'Hello.', opening_prompt: 'Somchai greets Nida', reply: 'สวัสดีค่ะ', reply_phonetic: 'sà-wàt-dii khâ', reply_english: 'Hello.',
      reply_prompt: 'Nida greets him', closing: 'แล้วเจอกันครับ', closing_phonetic: 'lâeo joe kan khráp', closing_english: 'See you later.', closing_prompt: 'Somchai says goodbye',
      closing_reply: 'แล้วเจอกันค่ะ', closing_reply_phonetic: 'lâeo joe kan khâ', closing_reply_english: 'See you later.', closing_reply_prompt: 'Nida says goodbye' })
    const m = lang === 'th' && /The target word for this exchange is: (.+)\n/.exec(q)
    if (m) { const t = S.targets.find(w => w.thai === m[1].trim()); genCount[t.id] = (genCount[t.id] || 0) + 1
      return JSON.stringify([0, 1, 2].map(k => sentence(S, 'th', t, 'gen', k))) }
    const jaT = lang === 'ja' && /(?:TARGET WORDS \(each needs exactly 3 sentences\):\n|JAPANESE TARGET: )★ ([^\s\[=]+)/.exec(q)
    const zhT = lang === 'zh' && /TARGET: ★ (\S+) \[/.exec(q)
    const rc = lang === 'zh' ? /recall (\d) of 3/.exec(q) : null
    if ((jaT || zhT) && !/QUOTA|previous|ALREADY/.test(q.slice(-400)) ) {
      const t = S.targets.find(w => (lang === 'ja' ? w.japanese : w.chinese) === (jaT || zhT)[1])
      if (t && lang === 'ja' && /TARGET GROUP|REPLACEMENT ONLY/.test(q)) {
        // v653: one target-group request → EXACTLY k recalls in one structured reply
        const k = +((/Return EXACTLY (\d) recall/.exec(q) || [])[1] || 1), out = []
        for (let j = 0; j < k; j++) { const n = genCount[t.id] = (genCount[t.id] || 0) + 1; if (n <= 3) out.push(sentence(S, lang, t, 'gen', n - 1)) }
        if (out.length) return JSON.stringify({ targetConcept: t.japanese, recalls: out })
      } else if (t) { const n = genCount[t.id] = (genCount[t.id] || 0) + 1
        if (n <= 3) { const s = sentence(S, lang, t, 'gen', n - 1); return JSON.stringify(lang === 'ja' ? [s] : s) } }
    }
    const _r = await inner(o)
    if (process.env.SIM_DEBUG === '3' && /LISTENING track: a real conversation/.test(q)) { const j = JSON.parse(_r); const rows = Object.fromEntries([...q.matchAll(/^(a\d+) \[(\w)\] (.+?) — (.*?)(?:   · target.*)?$/gm)].map(x => [x[1], x[2] + ': ' + x[4]])); console.log('COMPOSED scene1: ' + j.scenes[0].lines.map(l => l.anchor ? rows[l.anchor] : l.speaker + ': ' + l.english).join(' / ')) }
    return _r
  }
  // the network boundary: Gemini REST request → simulated model → Gemini REST response
  const models = {}
  c.fetch = async (url, opts) => {
    const model = (String(url).match(/models\/([^:]+):/) || [])[1]; models[model] = (models[model] || 0) + 1
    const body = JSON.parse(opts.body)
    const q = body.contents.map(x => x.parts.map(p => p.text).join('')).join('\n')
    const text = await reply({ messages: [{ role: 'user', content: q }], model })
    const est = x => Math.ceil(String(x).length / 3)
    return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: String(text) }] } }], usageMetadata: { promptTokenCount: est(q), candidatesTokenCount: est(text), totalTokenCount: est(q) + est(text) } }) }
  }
  const V = S.vocab
  S.targets.forEach((t, i) => { if (i >= 27) { t.status = 'new'; t.lastSeen = null; t.introducedAt = null; t.repCount = 0 } })
  const log = []
  const L = m => log.push(m)
  const run = c.aiBeginRun(lang + '-track')
  let track
  if (lang === 'th') {
    const pairs = await c.generateConversationTrack(S.targets, [], 'AIzaSyTEST-harness-key-000000', (d, t, meta) => { if (meta && meta.apiError) L(meta.apiError) }, V, c.ev('GEMINI_DEFAULT_MODEL'), { cancelled: false }, null)
    track = { createdAt: '2026-09-29T09:00:00.000Z', date: '29 Sept 2026', mode: 'daily', trackMode: 'daily', pairs, keywords: S.targets.map((t, i) => kwOf('th', t, i >= 27)), _finalAudit: pairs._finalAudit || null }
    track.selectedTargetIds = track.keywords.map(k => k.wordId)
    const qc = await c.runQualityCheckCore(track, 'AIzaSyTEST-harness-key-000000', c.ev('GEMINI_DEFAULT_MODEL'), { vocab: V, onLog: L, deferMetadata: true })
    track = await c.finaliseThaiTrackAfterQc(track, qc, { vocab: V, apiKey: 'AIzaSyTEST-harness-key-000000', model: c.ev('GEMINI_DEFAULT_MODEL'), onLog: L })
  } else {
    const gen = lang === 'ja'
      ? await c.generateJapaneseTrack(S.targets, V, 'natural', 'AIzaSyTEST-harness-key-000000', c.ev('GEMINI_DEFAULT_MODEL'), () => {}, L, { cancelled: false }, null)
      : await c.generateMandarinTrack(S.targets, V, 'AIzaSyTEST-harness-key-000000', c.ev('GEMINI_DEFAULT_MODEL'), () => {}, L, { cancelled: false }, null)
    track = { createdAt: '2026-09-29T09:00:00.000Z-' + lang, date: '2026-09-29', language: lang, mode: 'daily', trackMode: 'daily', speechStyle: 'natural', pairs: gen.pairs,
      keywords: S.targets.map((t, i) => kwOf(lang, t, i >= 27)) }
    track.selectedTargetIds = track.keywords.map(k => k.wordId)
    const r = await c.jazhQcFinaliseAndListen(track, lang, { vocab: V, apiKey: 'AIzaSyTEST-harness-key-000000', model: c.ev('GEMINI_DEFAULT_MODEL'), register: 'natural', runId: run, push: L })
    track = r.track
  }
  // v658 — the Daily track ends with its Main Track (0 Listening calls); Listening is its OWN track:
  // Revision-rule selection (NEW 0 · REVIEW 30) → one fresh conversation, no Main generation
  const sum = c.aiUsageSummary(run)
  const dailyListeningCalls = sum.categories.listening
  const lrun = c.aiBeginRun(lang + '-listening-track')
  const n0 = log.length
  const stl = await c.buildStandaloneListeningTrack({ lang, vocab: V, apiKey: 'AIzaSyTEST-harness-key-000000', model: c.ev('GEMINI_DEFAULT_MODEL'), onLog: L })
  if (process.env.SIM_LN_LOG) require('fs').writeFileSync('/tmp/claude-0/simln-' + lang + '.txt', log.slice(n0).join('\n'))
  const lsum = c.aiUsageSummary(lrun)
  const g = track.integrity, lt = stl.track.listening
  const lb = { status: stl.track.status, coveredTargetCount: stl.track.coverage.covered, requiredTargetCount: stl.track.coverage.required, sceneCount: lt ? lt.sceneGroups.length : 0, lineCount: lt ? lt.lines.length : 0, bridgeLineCount: 0 }
  say('━━━━ ' + lang.toUpperCase() + ' — simulated real-path track ━━━━')
  c.trackIntegrityLines(track).forEach(l => say(l))
  say('  DAILY TRACK: SELECTED ' + track.selectedTargetIds.length + ' · NEW ' + c.trackNewTargetIds(track).length + ' · LISTENING CALLS after the Daily track: ' + dailyListeningCalls + ' · listeningBuild: ' + (track.listeningBuild ? track.listeningBuild.status : 'none'))
  say('  LISTENING TRACK (standalone): selected ' + stl.track.keywords.length + ' · NEW ' + stl.track.targetCounts.newTargetCount + ' · REVIEW ' + stl.track.targetCounts.reviewTargetCount +
    ' · Main generation calls ' + (lsum.categories.generation || 0) + ' · ' + Object.entries(stl.track.telemetry).map(([k, v]) => k + '=' + v).join(' ') + (stl.track.failedChecks.length ? ' · failed: ' + stl.track.failedChecks.join(', ') : ''))
  say('  QUOTA before recovery → after: ' + g.quota.before + ' → ' + g.quota.after + ' · removed TARGET PAIRS: ' + g.removedTargetPairs.length + ' · recovered: ' + g.recoveredTargetPairs.length)
  say('  LISTENING: ' + lb.status + ' · ' + (lb.coveredTargetCount != null ? lb.coveredTargetCount + '/' + lb.requiredTargetCount : '-') + ' required targets · scenes ' + lb.sceneCount + ' · lines ' + lb.lineCount + ' · BRIDGE lines ' + lb.bridgeLineCount + ' · coherence ' + JSON.stringify(lb.coherence) + (lb.partialReasons && lb.partialReasons.length ? ' · ' + lb.partialReasons.join(', ') : ''))
  if (lt) {
    // truthfulness: every covered target is audibly present in a line that claims it
    const kws = stl.track.keywords   // v658: the standalone Listening Track's own 30 targets
    const surf = id => { const k = kws.find(x => x.wordId === id); return k && (k.thai || k.japanese || k.chinese) }
    const bad = lt.coverage.coveredRequiredIds.filter(id => !lt.lines.some(l => l.coversTargetIds.includes(id) && String(l.thai || '').includes(surf(id))))
    say('  COVERAGE TRUTHFUL: ' + (bad.length ? 'NO — ' + bad.join(',') : 'yes (' + lt.coverage.coveredRequiredIds.length + ' covered targets each present in a line that claims it)'))
    say('  CONVERSATION (first 2 scenes):')
    const scenes = [...new Set(lt.lines.map(l => l.scene))].slice(0, 2)
    scenes.forEach(sn => { say('   Scene ' + sn + (lt.sceneTitles[sn - 1] ? ' — ' + lt.sceneTitles[sn - 1] : ''))
      lt.lines.filter(l => l.scene === sn).forEach(l => say('     ' + l.speaker + ': ' + l.thai + '  — ' + l.english + (l.coversTargetIds.length ? '  [TARGET ' + l.coversTargetIds.map(surf).join(',') + ']' : '  [' + (l.source || 'context') + ']'))) })
  }
  if (process.env.SIM_DEBUG) {
    const cnt = {}; g.removedTargetPairs.forEach(x => x.reasons.forEach(r => { const k = r.slice(0, 70); cnt[k] = (cnt[k] || 0) + 1 }))
    say('  DEBUG removed reasons: ' + JSON.stringify(Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 8)))
    say('  DEBUG unresolved: ' + JSON.stringify(g.quota.unresolved).slice(0, 1500))
    say('  DEBUG reasons: ' + JSON.stringify(g.reasons))
    if (process.env.SIM_DEBUG === '2') { const lg2 = []; await c.buildListeningByAnchors(track, V, { lang, apiKey: 'AIzaSyTEST-harness-key-000000', model: c.ev('GEMINI_DEFAULT_MODEL'), onLog: m => lg2.push(m) }); say('  DEBUG listening: ' + lg2.filter(l => /🎬|COMPOS|bridge|⛔/.test(l)).slice(0, 20).join('\n     ')) }
    say('  DEBUG lb.log: ' + JSON.stringify((lb.log || []).map(x => String(x).slice(0, 300))))
    if (lt) say('  DEBUG coherence: ' + JSON.stringify(lt.coherenceAudit.verdicts.filter(v => !v.pass).slice(0, 4)))
    say('  DEBUG qc: ' + log.filter(l => /found ·|QC complete/.test(l)).join(' | '))
    say('  DEBUG coherence log: ' + log.filter(l => /COHERENCE|🎬/.test(l)).slice(0, 6).join('\n     '))
    say('  DEBUG log tail: ' + log.filter(l => /QUOTA|UNMET|⛔/.test(l)).slice(0, 12).join('\n     '))
  }
  const recPairs = track.pairs.filter(p => p && p.sourceStage === 'quota-recovery').slice(0, 3)
  say('  RECOVERED TARGET PAIRS (sample, with final pronunciation): ' + recPairs.map(p => txt(lang, p) + ' / ' + (p.phonetic || p.romaji || p.pinyin) + ' {' + p.pairId + ' target ' + p.targetId + '}').join(' · '))
  say('  GEMINI (simulated at the REST boundary): ' + c.aiUsageSummaryLines(sum).slice(1, 11).join(' | '))
  say('  REST requests actually sent: ' + JSON.stringify(models))
  // v652 §13 — Thai: quality checks vs paid generation attempts; §9 the one authoritative pronunciation audit
  c.aiUsageSummaryLines(sum).filter(l => /^THAI GENERATION/.test(l)).forEach(l => say('  ' + l))
  log.filter(l => /FINAL_PRONUNCIATION_AUDIT|CUE_REPAIRED_KEEP_PAIR|SCENE_PLAN /.test(l)).slice(0, 4).forEach(l => say('  ' + String(l).trim()))
  const seg = log.filter(l => /SEGMENTATION|FINAL readings|FINAL pinyin/.test(l))
  if (seg.length) say('  ' + seg.join(' | ').trim())
  say('')
  return { lang, status: g.status, pairs: g.counts.targetPairs, dailyListeningCalls, listeningTrack: lb.status, listeningCoverage: lb.coveredTargetCount + '/' + lb.requiredTargetCount, listeningMainGenerationCalls: lsum.categories.generation || 0 }
}
;(async () => {
  const res = []
  for (const l of (process.argv[2] || 'th,ja,zh').split(',')) {
    try { res.push(await runLang(l)) } catch (e) { say('✖ ' + l + ' crashed: ' + (e && e.stack || e)) }
  }
  console.log(out.join('\n'))
  console.log('SUMMARY ' + JSON.stringify(res))
})()
