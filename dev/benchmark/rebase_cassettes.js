#!/usr/bin/env node
// v678 — moves the simulator cassette library onto a new PRODUCTION BASELINE build. The deployed build changed from v674
// to v677 (v677 altered Mandarin / Japanese generation and the benchmark's content record), so cassettes recorded on
// v674 can no longer prove "no behaviour change" for later builds. This re-records every cassette (same fixture, same
// runner path, same simulator options) on the baseline build; the v674 recordings are KEPT in cassettes/archive-v674/.
//   node benchmark/rebase_cassettes.js benchmark/results/tt.v677.compiled.js
'use strict'
const fs = require('fs'), path = require('path')
const { runOnce, runOnceUi, loadFixture } = require('./run')
const app = process.argv[2]
const DIR = path.join(__dirname, 'cassettes'), ARCH = path.join(DIR, 'archive-v674')
;(async () => {
  fs.mkdirSync(ARCH, { recursive: true })
  const files = fs.readdirSync(DIR).filter(f => f.endsWith('.json')).sort()
  for (const f of files) {
    const old = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')), meta = old.cassette.meta
    if (meta.appBuild === 'v674' && !fs.existsSync(path.join(ARCH, f))) fs.copyFileSync(path.join(DIR, f), path.join(ARCH, f))
    const ui = meta.path === 'ui-path/1'
    const r = await (ui ? runOnceUi : runOnce)(loadFixture(meta.fixture), { mode: 'record', provider: 'sim', appFile: app, simOpts: meta.simOpts || null, pipeline: meta.pipeline || 'production' })
    fs.writeFileSync(path.join(DIR, f), JSON.stringify({ cassette: r.cassette, outcome: { content: r.content, telemetry: r.telemetry, log: r.log, error: r.error } }))
    console.log(f.padEnd(50) + ' re-recorded on ' + r.cassette.meta.appBuild + ' · ' + r.cassette.entries.length + ' requests (v674: ' + old.cassette.entries.length + ')')
  }
})()
