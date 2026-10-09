#!/usr/bin/env node
// Step 0 — telemetry BEFORE (log recorded with v674) / AFTER (replay of the same cassette on the current build) for the
// corrected report lines. Same model responses, same content (see equivalence.js) — only the reporting differs.
'use strict'
const fs = require('fs'), path = require('path')
const { runOnce, loadFixture } = require('./run')
const PICK = /GENERATION WASTE|PAID REQUESTS BY PURPOSE|GENERATION \(app level|CANDIDATE_ACCOUNTING|^\s*QC: |UNVERIFIED FINAL PAIRS|LISTENING_NATURALNESS|LISTENING_CLOSED_VOCAB|LISTENING_DIALOGUE|LISTENING_MAX3|LISTENING_COHERENCE |COHERENCE AUDIT|PHASE_TRANSITION_VALIDATION|SCENE_COMMIT|LISTENING_TURN_BUDGET|CUE_CHECK|Retry requests|Total requests/
;(async () => {
  const out = []
  for (const f of process.argv.slice(2)) {
    const cas = JSON.parse(fs.readFileSync(path.join(__dirname, 'cassettes', f), 'utf8'))
    const r = await runOnce(loadFixture(cas.cassette.meta.fixture), { mode: 'replay', cassette: cas.cassette })
    const before = cas.outcome.log.concat(cas.outcome.telemetry.usageSummary || []).filter(l => PICK.test(l))
    const after = r.log.concat(r.telemetry.usageSummary || []).filter(l => PICK.test(l))
    out.push('══ ' + f + ' (recorded on ' + cas.cassette.meta.appBuild + ', replayed on the current build; content identical: ' + (JSON.stringify(cas.outcome.content) === JSON.stringify(r.content)) + ')')
    const bs = new Set(before), as = new Set(after)
    out.push('  BEFORE (lines that changed):'); before.filter(l => !as.has(l)).slice(0, 14).forEach(l => out.push('   - ' + l.trim().slice(0, 420)))
    out.push('  AFTER  (lines that changed / were added):'); after.filter(l => !bs.has(l)).slice(0, 14).forEach(l => out.push('   + ' + l.trim().slice(0, 420)))
  }
  const file = path.join(__dirname, 'results', 'telemetry-before-after.txt')
  fs.writeFileSync(file, out.join('\n') + '\n'); console.log(out.join('\n'))
})()
