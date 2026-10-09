#!/usr/bin/env node
// Step 0 — BEHAVIOUR EQUIVALENCE: replays every cassette in benchmark/cassettes against an app build (default: the
// current tt.compiled.js). A build is behaviour-equivalent on a cassette when (1) every model request it sends is
// byte-identical to a recorded one (no CASSETTE_MISMATCH), (2) no recorded request goes unused, and (3) the learner-facing
// content outcome (sentences, cues, translations, pronunciation, speakers, check outcomes, statuses, coverage) is identical.
// Telemetry / log lines are allowed to differ and are summarised separately.
'use strict'
const fs = require('fs'), path = require('path')
const { runOnce, runOnceUi, loadFixture, compareContent } = require('./run')
const app = process.argv[2] || path.join(__dirname, '..', 'tt.compiled.js')
;(async () => {
  const dir = path.join(__dirname, 'cassettes'), rows = []
  for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.json')).sort()) {
    const cas = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
    const fx = loadFixture(cas.cassette.meta.fixture)
    const ui = cas.cassette.meta && cas.cassette.meta.path === 'ui-path/1'
    const r = await (ui ? runOnceUi : runOnce)(fx, { mode: 'replay', cassette: cas.cassette, appFile: app })
    const cmp = compareContent(cas.outcome.content, r.content)
    const recLog = new Set(cas.outcome.log), newLog = new Set(r.log)
    const added = r.log.filter(l => !recLog.has(l)), removed = cas.outcome.log.filter(l => !newLog.has(l))
    rows.push({ cassette: f, path: ui ? 'ui-path/1 (the screens\u2019 steps)' : 'legacy v675 Node path', recordedOn: cas.cassette.meta.appBuild, provider: cas.cassette.meta.provider, requests: r.replay.requests, recorded: r.replay.recorded,
      mismatches: r.replay.mismatches.length, unused: r.replay.unused.length, contentIdentical: cmp.identical, error: r.error ? r.error.slice(0, 200) : null,
      logLinesChanged: { added: added.length, removed: removed.length, sampleAdded: added.slice(0, 3).map(l => l.slice(0, 160)) },
      firstMismatch: r.replay.mismatches[0] || null, contentDiff: cmp.identical ? null : cmp })
    const x = rows[rows.length - 1]
    console.log((x.mismatches || x.unused || !x.contentIdentical || x.error ? 'DIFF ' : 'SAME ') + f.padEnd(46) + ' recorded on ' + x.recordedOn + ' · requests ' + x.requests + '/' + x.recorded +
      ' · mismatches ' + x.mismatches + ' · unused ' + x.unused + ' · content ' + (x.contentIdentical ? 'identical' : 'DIFFERENT') + ' · log lines +' + added.length + '/-' + removed.length)
  }
  const ok = rows.every(x => !x.mismatches && !x.unused && x.contentIdentical && !x.error)
  const out = path.join(__dirname, 'results', 'equivalence-' + path.basename(app).replace(/\W+/g, '_') + '.json')
  fs.writeFileSync(out, JSON.stringify({ app, at: 'deterministic', allEquivalent: ok, rows }, null, 1))
  console.log((ok ? 'ALL EQUIVALENT' : 'NOT EQUIVALENT') + ' — ' + rows.length + ' cassette(s) · ' + path.relative(process.cwd(), out))
  process.exit(ok ? 0 : 1)
})()
