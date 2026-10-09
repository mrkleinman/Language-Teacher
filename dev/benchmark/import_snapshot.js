#!/usr/bin/env node
// Step 0 — turns a REAL learner snapshot exported from the app (window.ttBenchmark.exportLearnerSnapshot() in the
// browser console → tt-learner-snapshot-YYYY-MM-DD.json) into benchmark fixtures with DEVICE provenance:
//   • the learner state (taught words, new / review status, belt) comes from the device snapshot, word by word
//   • the TARGET SETS stay the historical 8-Oct ones (so runs stay comparable with the historical logs)
// The snapshot is read only; the app's data is never touched. A snapshot taken after 8 Oct is NOT the 8-Oct learner:
// the fixture records the snapshot date and says so.
//   node benchmark/import_snapshot.js tt-learner-snapshot-2026-10-09.json
'use strict'
const fs = require('fs'), path = require('path')
const { fidelityOf } = require('./lib/fidelity')
function importSnapshot(snap, histFixtures) {
  if (!snap || snap.format !== 'tt-learner-snapshot/1') throw new Error('not a tt-learner-snapshot/1 file')
  return histFixtures.filter(fx => snap.languages[fx.language] && !/^synthetic-/.test(fx.id)).map(fx => {
    const L = snap.languages[fx.language], st = new Map(L.state.map(w => [w.id, w]))
    const taughtStatus = w => w && (w.status === 'learning' || w.status === 'known')
    const tids = fx.targets.map(t => t.id)
    const taught = L.state.filter(w => taughtStatus(w) && !tids.includes(w.id)).map(w => w.id)
    return { ...fx, id: fx.id.replace(/-2026-10-08$/, '') + '-device-' + String(snap.exportedAt).slice(0, 10),
      label: 'DEVICE SNAPSHOT (' + snap.exportedAt + ') learner state + the historical 8-Oct target set — the device state is the learner on the export date, not on 8 Oct',
      belt: { rank: (L.belt && L.belt.rank) || fx.belt.rank, source: L.belt ? 'device snapshot (currentLearnerBelt at export)' : fx.belt.source },
      targets: fx.targets.map(t => ({ ...t, status: taughtStatus(st.get(t.id)) ? 'review' : 'new', evidence: t.evidence + ' · status from DEVICE snapshot' })),
      inventory: { observedIds: [], crossLogIds: [], reconstructedIds: [], deviceIds: taught, taughtIds: taught, declaredCount: taught.length },
      provenanceSummary: { targets: 'historical (8-Oct log)', newFlags: 'DEVICE snapshot status', inventory: 'DEVICE snapshot: ' + taught.length + ' taught word(s)' },
      // v676: the EXACT per-word SRS fields as exported (applied by id by ttBenchApplyFixture), and the clock starts at
      // the export moment so due dates mean what they meant on the device
      wordState: L.state, capturedAt: snap.exportedAt, clockStartMs: Date.parse(snap.exportedAt) || null,
      deviceSnapshot: { exportedAt: snap.exportedAt, appBuild: snap.appBuild, words: L.words } }
  }).map(fx => ({ ...fx, fidelity: fidelityOf(fx) }))
}
module.exports = { importSnapshot }
if (require.main === module) {
  const snap = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
  const dir = path.join(__dirname, 'fixtures')
  const hist = fs.readdirSync(dir).filter(f => /-2026-10-08\.json$/.test(f)).map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')))
  importSnapshot(snap, hist).forEach(fx => { fs.writeFileSync(path.join(dir, fx.id + '.json'), JSON.stringify(fx, null, 1)); console.log(fx.id + ' · ' + fx.provenanceSummary.inventory + ' · belt ' + fx.belt.rank) })
}
