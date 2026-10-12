#!/usr/bin/env node
// Release-candidate proof: replay recorded v682 LIVE Daily runs through an app build. Faithful = every request the build makes
// matches a recorded request byte-for-byte (prompt hash) and no recorded request is left unused; content identical = the same
// learner-facing track. Any change to the generator (prompts, validators, recovery, fallbacks) breaks faithfulness.
//   node sandbox/rc_replay_check.js [app file] <run dir> ...   (run dirs under sandbox/runs, e.g. *.production.v682-final4-*)
'use strict'
const path = require('path'), fs = require('fs'), DEV = path.join(__dirname, '..')
process.chdir(DEV)
const { runOnceUi, loadFixture, compareContent } = require('../benchmark/run')
const args = process.argv.slice(2), appFile = /\.js$/.test(args[0] || '') ? path.resolve(args.shift()) : path.join(DEV, 'tt.compiled.js')
;(async () => {
  let ok = true
  for (const d of args) {
    const run = JSON.parse(fs.readFileSync(path.join(__dirname, 'runs', d, 'run.json'))), fxId = d.split('.')[0]
    const r = await runOnceUi(loadFixture(fxId), { mode: 'replay', cassette: run.cassette, appFile, pipeline: 'production' })
    const cmp = compareContent(run.outcome.content, r.content), good = r.replay.faithful && !r.replay.mismatches.length && !r.replay.unused.length && cmp.identical
    ok = ok && good
    console.log((good ? 'PASS ' : 'FAIL ') + d + ' · requests ' + run.cassette.entries.length + ' · mismatches ' + r.replay.mismatches.length + ' · unused ' + r.replay.unused.length + ' · content identical ' + cmp.identical)
  }
  process.exit(ok ? 0 : 1)
})()
