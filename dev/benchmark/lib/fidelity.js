// Step 0 — how exact a benchmark fixture's learner state is. Every fixture carries one of these classes, and every
// run file, bundle and report repeats it, so a reconstructed learner is never mistaken for a captured one.
//
//   DEVICE_SNAPSHOT      EXACT per-word learner state exported from the device (exact for the export moment — NOT the
//                        8-Oct learner). Only produced by the in-app "capture my current progress" button or
//                        benchmark/import_snapshot.js.
//   LOG_EXACT_INVENTORY  targets, belt and the COMPLETE list of authorised words are printed in the 8-Oct log; which
//                        targets were NEW and the SRS dates are reconstructed.
//   LOG_PARTIAL          targets and belt from the log; the inventory is completed from the same day's OTHER logs.
//   RECONSTRUCTED        targets and belt from the log; most of the inventory is RECONSTRUCTED (curriculum order,
//                        excluding words the log shows as untaught). An approximation, never a historical snapshot.
//   SYNTHETIC            the test-suite learner — mechanics and equivalence only.
'use strict'
function countsOf(fx) {
  const inv = fx.inventory || {}
  return { observed: (inv.observedIds || []).length, crossLog: (inv.crossLogIds || []).length, reconstructed: (inv.reconstructedIds || []).length,
    declared: inv.declaredCount != null ? inv.declaredCount : (inv.taughtIds || []).length }
}
function fidelityOf(fx) {
  if (/^synthetic-/.test(fx.id)) return { class: 'SYNTHETIC', exactLearnerState: false, historical8Oct: false,
    summary: 'Synthetic test-suite learner (every word taught, Shodan). Mechanics and equivalence only — never a learner baseline.' }
  if (fx.wordState || (fx.inventory && (fx.inventory.deviceIds || []).length)) return { class: 'DEVICE_SNAPSHOT', exactLearnerState: true, historical8Oct: false,
    exactAsOf: fx.capturedAt || (fx.deviceSnapshot && fx.deviceSnapshot.exportedAt) || null,
    summary: 'EXACT learner state exported from the device' + (fx.capturedAt ? ' on ' + String(fx.capturedAt).slice(0, 10) : '') + ' + the historical 8-Oct targets. NOT the 8-Oct learner.' }
  const c = countsOf(fx)
  const newRecon = /RECONSTRUCTED/.test((fx.provenanceSummary && fx.provenanceSummary.newFlags) || '')
  const exact = ['30 targets (8-Oct log)', 'belt ' + fx.belt.rank + ' (8-Oct log)']
  const recon = []
  if (newRecon) recon.push('which targets were NEW (the log gives only the count)')
  recon.push('SRS dates and intervals (synthetic: every taught word "learning", fixed dates)')
  let cls
  if (c.reconstructed > 0) {
    cls = 'RECONSTRUCTED'
    exact.push(c.observed + ' taught words seen in the log')
    recon.unshift(c.reconstructed + ' of ' + c.declared + ' taught words (' + Math.round(100 * c.reconstructed / Math.max(1, c.declared)) + '%), filled in curriculum order')
  } else if (c.crossLog > 0) {
    cls = 'LOG_PARTIAL'
    exact.push(c.observed + ' taught words listed in this log')
    recon.unshift(c.crossLog + ' of ' + c.declared + ' taught words inferred from the same day’s other logs')
  } else {
    cls = 'LOG_EXACT_INVENTORY'
    exact.push('all ' + c.declared + ' authorised words (listed in the log)')
  }
  const lead = cls === 'RECONSTRUCTED' ? 'RECONSTRUCTED learner — ' + Math.round(100 * c.reconstructed / Math.max(1, c.declared)) + '% of the taught words inferred. Not a historical snapshot. '
    : cls === 'LOG_PARTIAL' ? 'Learner from the 8-Oct logs; part of the inventory taken from the same day’s other logs. Not a device snapshot. '
    : 'Inventory exact from the 8-Oct log; SRS details reconstructed. Not a device snapshot. '
  return { class: cls, exactLearnerState: false, historical8Oct: true, counts: c, exact, reconstructed: recon,
    summary: lead + 'Exact: ' + exact.join('; ') + '. Reconstructed: ' + recon.join('; ') + '.' }
}
module.exports = { fidelityOf }
