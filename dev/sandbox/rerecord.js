#!/usr/bin/env node
// v681 — re-record every top-level simulator cassette on the CURRENT build with its own recorded settings (fixture, path,
// simOpts, pipeline), after archiving the previous version. Reports each outcome change (READY ↔ NOT_READY) — the
// behaviour change a validator edit causes is shown, never hidden behind a fresh baseline.
//   node sandbox/rerecord.js [--archive archive-v677] [file…]
'use strict'
const fs = require('fs'), path = require('path')
const { runOnce, runOnceUi, loadFixture } = require('../benchmark/run')
const dir = path.join(__dirname, '..', 'benchmark', 'cassettes')
const ai = process.argv.indexOf('--archive'), archive = ai > 0 ? process.argv[ai + 1] : null
const only = process.argv.slice(2).filter((x, i, a) => !x.startsWith('--') && a[i - 1] !== '--archive')
;(async () => {
  const files = only.length ? only : fs.readdirSync(dir).filter(f => f.endsWith('.sim.json'))
  const rows = []
  for (const f of files) {
    const full = path.join(dir, f), old = JSON.parse(fs.readFileSync(full, 'utf8')), m = old.cassette.meta
    if (archive) { fs.mkdirSync(path.join(dir, archive), { recursive: true }); const a = path.join(dir, archive, f); if (!fs.existsSync(a)) fs.copyFileSync(full, a) }
    const run = m.path === 'ui-path/1' ? runOnceUi : runOnce
    const r = await run(loadFixture(m.fixture), { mode: 'record', provider: 'sim', simOpts: m.simOpts || null, pipeline: m.pipeline || 'production' })
    fs.writeFileSync(full, JSON.stringify({ cassette: r.cassette, outcome: { content: r.content, telemetry: r.telemetry, log: r.log, error: r.error, gen2: r.gen2 || null } }))
    const was = old.outcome && old.outcome.content ? old.outcome.content.status : (old.outcome && old.outcome.error ? 'ERROR' : '?'), now = r.content ? r.content.status : (r.error ? 'ERROR' : '?')
    rows.push({ f, was, now, changed: was !== now, requests: [old.cassette.entries.length, r.cassette.entries.length] })
    console.log((was !== now ? 'CHANGED ' : '        ') + f.padEnd(52) + ' ' + was + ' → ' + now + '  requests ' + old.cassette.entries.length + ' → ' + r.cassette.entries.length)
  }
  fs.mkdirSync(path.join(__dirname, 'logs'), { recursive: true })
  fs.writeFileSync(path.join(__dirname, 'logs', 'rerecord.json'), JSON.stringify(rows, null, 1))
})().catch(e => { console.error(e); process.exit(1) })
