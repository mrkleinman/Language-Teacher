#!/usr/bin/env node
// v676 (Step 0) — WHAT DO THE RECORDED REPLAYS ACTUALLY COVER? Replays every cassette in benchmark/cassettes (top level)
// against the current build and records, per cassette: the track type, the runner path (legacy v675 Node path vs the
// screens' steps), the paid stages reached (from the app's own AI ledger), the code paths reached (from the run log) and
// the final status. Then it lists the GAPS: track types / paths / failure modes no cassette exercises.
//   node benchmark/coverage_audit.js   → benchmark/results/replay-coverage-audit.{json,md}
'use strict'
const fs = require('fs'), path = require('path')
const { runOnce, runOnceUi, loadFixture } = require('./run')
const DIR = path.join(__dirname, 'cassettes')
// code paths, recognised from the app's own log lines (each regex names ONE behaviour)
const PATHS = [
  ['Thai scene step (establishConvoScene)', null, (log, st, rows) => rows.some(r => r.fn === 'establishConvoScene')],
  ['Thai target romanisation request (only when a target has no romanisation)', null, (log, st, rows) => rows.some(r => r.fn === 'fetchTargetPhonetics')],
  ['Japanese scene step (generateJapaneseScene)', null, (log, st, rows) => rows.some(r => r.fn === 'generateJapaneseScene')],
  ['Japanese auto-recovery loop (screen)', /Auto-recovering missing recall/],
  ['Japanese finish with exhausted recalls', /GENERATION_FINISHED_INCOMPLETE/],
  ['Japanese stop awaiting learner Retry', /INCOMPLETE_AWAITING_USER/],
  ['Japanese cost guard limit', /COST_LIMIT_REACHED/],
  ['Mandarin generation incomplete (the screen shows an error; no track)', /Generation incomplete: \d+\/\d+ recalls/],
  ['Mandarin paid regeneration (check 2+)', null, (log, st) => st.has('B_generation_retry')],
  ['deterministic fallback accepted', /fallback accepted for [1-9]/],
  ['candidates rejected during generation (CANDIDATE_ACCOUNTING)', /CANDIDATE_ACCOUNTING[^\n]*rejected [1-9]/],
  ['QC replacement / quota recovery', null, (log, st) => st.has('H_recovery') || [...st].some(s => /^G_/.test(s))],
  ['final audit judges', null, (log, st) => [...st].some(s => /^(F_|L_)/.test(s))],
  ['Listening scene committed', /SCENE_COMMIT/],
  ['Listening repair', null, (log, st) => [...st].some(s => /listening_repair|_repair$/.test(s)) || log.some(l => /LIGHT_REPAIR|line repair|exchange rege/i.test(l))],
  ['Listening transition / coherence FAIL', /TRANSITION_FAIL|PHASE_TRANSITION_UNRESOLVED|LISTENING_COHERENCE[^\n]*FAIL|scene \d+ FAIL/],
  ['Listening targets left unplaced', /UNPLACED|never placed/],
  ['Listening VACUOUS verdict (0 lines)', /VACUOUS/],
  ['track READY', null, (log, st, rows, out) => out === 'READY'],
  ['track NOT_READY', null, (log, st, rows, out) => out === 'NOT_READY'],
  ['provider HTTP error (429/5xx) + retry', null, (log, st, rows) => rows.some(r => r.http === 429 || r.http >= 500)],
  ['network failure / timeout + retry', null, (log, st, rows) => rows.some(r => !r.http && r.error && !r.deduped && !r.latched && !r.cancelled)],
  ['fatal provider error (401/402/403) stops the run', null, (log, st, rows) => rows.some(r => [401, 402, 403].includes(r.http) || r.latched)],
  ['backup Gemini key used (needs two keys; never in a simulator run)', null, () => false],
]
const TYPES = ['th-daily', 'ja-daily', 'zh-daily', 'th-listening', 'ja-listening', 'zh-listening']
;(async () => {
  const rows = []
  for (const f of fs.readdirSync(DIR).filter(x => x.endsWith('.json')).sort()) {
    const cas = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'))
    const meta = cas.cassette.meta, ui = meta.path === 'ui-path/1'
    const fx = loadFixture(meta.fixture)
    let ledger = []
    const r = await (ui ? runOnceUi : runOnce)(fx, { mode: 'replay', cassette: cas.cassette, inspect: c => { ledger = c.ev('AI_LEDGER').slice() } })
    const stages = new Set(ledger.map(x => x.stage)), out = r.content && r.content.status
    const reached = PATHS.filter(([, rx, fn]) => fn ? fn(r.log, stages, ledger, out) : r.log.some(l => rx.test(l))).map(p => p[0])
    const type = fx.language + '-' + fx.trackType
    rows.push({ cassette: f, type, path: ui ? 'screens (ui-path/1)' : 'legacy v675 Node path', fixture: fx.id, variant: meta.simOpts ? JSON.stringify(meta.simOpts) : (/^synthetic/.test(fx.id) ? 'synthetic learner' : 'historical fixture'),
      provider: meta.provider, recordedOn: meta.appBuild, requests: cas.cassette.entries.length, faithful: r.replay.faithful, status: out || r.stop || null,
      stages: [...stages].sort().map(s => s + '×' + ledger.filter(x => x.stage === s).length), reached })
    console.log(f.padEnd(48) + ' ' + type.padEnd(13) + (ui ? ' UI    ' : ' legacy') + ' · ' + (out || '-') + ' · ' + reached.length + ' paths')
  }
  // gaps — first for the ORIGINAL 16 (the v675 Step 0 cassettes, legacy Node path), then for all cassettes now present
  const gapsFor = (set, label) => { const g = []
    for (const t of TYPES) {
      const has = set.filter(r => r.type === t)
      if (!has.length) g.push({ scope: label, type: t, gap: 'no cassette at all' })
      if (!has.some(r => /screens/.test(r.path))) g.push({ scope: label, type: t, gap: 'not recorded through the screens\u2019 steps' + (t === 'th-daily' ? ' (the v675 runner used a fixed default scene instead of the model-written scene the screen requests, and no scene contract reached QC)' : t === 'ja-daily' ? ' (no scene step, no screen auto-recovery loop, no TrackContext / cost guard from the screen)' : /listening/.test(t) ? ' (the v675 runner used its own attempt id, which seeds the conversation planner, and passed no speech style / attempt record — the requests differ from what the screen sends)' : '') })
      if (!has.some(r => r.status === 'READY')) g.push({ scope: label, type: t, gap: 'no READY outcome' })
      if (!has.some(r => r.status === 'NOT_READY')) g.push({ scope: label, type: t, gap: 'no NOT_READY outcome' })
    }
    const reached = new Set(set.flatMap(r => r.reached))
    PATHS.forEach(([name]) => { if (!reached.has(name)) g.push({ scope: label, type: 'all', gap: 'never reached: ' + name }) })
    return g }
  const original = rows.filter(r => /legacy/.test(r.path))
  const gapsOriginal = gapsFor(original, 'original 16 (v675)')
  const gaps = []
  for (const t of TYPES) {
    const has = rows.filter(r => r.type === t), hasUi = has.filter(r => /screens/.test(r.path))
    if (!has.length) gaps.push({ type: t, gap: 'no cassette at all' })
    if (!hasUi.length) gaps.push({ type: t, gap: 'no cassette through the screens’ steps' })
    if (!has.some(r => r.status === 'READY')) gaps.push({ type: t, gap: 'no READY outcome recorded' })
    if (!has.some(r => r.status === 'NOT_READY')) gaps.push({ type: t, gap: 'no NOT_READY outcome recorded' })
  }
  const anyReached = new Set(rows.flatMap(r => r.reached))
  PATHS.forEach(([name]) => { if (!anyReached.has(name)) gaps.push({ type: 'all', gap: 'never reached: ' + name }) })
  const legacyOnly = TYPES.filter(t => rows.filter(r => r.type === t && /legacy/.test(r.path)).length)
  gaps.push({ type: 'all', gap: 'every cassette is SIMULATED (template sentences): none says anything about teaching quality, and real-model behaviours (prose replies, malformed JSON variety, latency, 429/5xx, timeouts) are absent until live cassettes exist' })
  const cov = set => Object.fromEntries(TYPES.map(t => [t, set.filter(r => r.type === t).map(r => r.cassette)]))
  const res = { at: 'deterministic', build: rows[0] && rows[0].recordedOn, cassettes: rows.length, coverageOriginal16: cov(original), coverageAll: cov(rows), gapsOriginal16: gapsOriginal, rows, gaps, legacyPathTypes: legacyOnly }
  fs.writeFileSync(path.join(__dirname, 'results', 'replay-coverage-audit.json'), JSON.stringify(res, null, 1))
  const md = ['# Replay coverage audit', '', rows.length + ' cassettes replayed against the current build (all faithful: ' + rows.every(r => r.faithful) + ').', '',
    '| Cassette | Track type | Runner path | Variant | Status | Requests | Paths reached |', '|---|---|---|---|---|---|---|',
    ...rows.map(r => '| ' + r.cassette + ' | ' + r.type + ' | ' + r.path + ' | ' + r.variant + ' | ' + (r.status || '') + ' | ' + r.requests + ' | ' + r.reached.join('; ') + ' |'),
    '', '## Track types covered', '', '| Track type | Original 16 (v675, legacy path) | All ' + rows.length + ' now |', '|---|---|---|',
    ...TYPES.map(t => '| ' + t + ' | ' + original.filter(r => r.type === t).length + ' | ' + rows.filter(r => r.type === t).length + ' |'),
    '', '## Gaps in the original 16', '', ...gapsOriginal.map(g => '- **' + g.type + '** — ' + g.gap),
    '', '## Gaps remaining with all ' + rows.length + ' cassettes', '', ...gaps.map(g => '- **' + g.type + '** — ' + g.gap)]
  fs.writeFileSync(path.join(__dirname, 'results', 'replay-coverage-audit.md'), md.join('\n') + '\n')
  console.log('GAPS (original 16):'); gapsOriginal.forEach(g => console.log(' - ' + g.type + ': ' + g.gap))
  console.log('GAPS (all ' + rows.length + '):'); gaps.forEach(g => console.log(' - ' + g.type + ': ' + g.gap))
})()
