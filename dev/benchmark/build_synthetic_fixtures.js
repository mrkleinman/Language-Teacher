// Step 0 — SYNTHETIC fixtures (not historical): the test-suite learner (whole bank taught, Shodan belt) and the suite's
// 30 targets per language. They exist only to widen the record/replay behaviour-equivalence check to code paths the
// historical fixtures do not reach (e.g. full multi-phase Listening compositions). They say nothing about a real learner.
'use strict'
const fs = require('fs'), path = require('path')
const { setup } = require('../tests14')
for (const lang of ['th', 'ja', 'zh']) {
  const S = setup(lang)
  const tids = S.targets.map(t => t.id), tset = new Set(tids)
  const taught = S.vocab.filter(w => !tset.has(w.id) && !w.duplicateOf && w.status !== 'locked').map(w => w.id)
  for (const trackType of ['daily', 'listening']) {
    const id = 'synthetic-' + lang + '-' + trackType
    const fx = { format: 'tt-benchmark-fixture/1', id, language: lang, trackType, label: 'SYNTHETIC (test-suite learner) — mechanics / equivalence only, not a learner baseline',
      historicalLog: null, belt: { rank: 'Shodan', source: 'synthetic' },
      targets: tids.map((tid, i) => ({ id: tid, surface: S.vocab.find(w => w.id === tid)[lang === 'th' ? 'thai' : lang === 'ja' ? 'japanese' : 'chinese'], status: trackType === 'daily' && i >= 27 ? 'new' : 'review', evidence: 'SYNTHETIC (tests14 targets)' })),
      targetsUnmapped: [], inventory: { observedIds: [], crossLogIds: [], reconstructedIds: [], taughtIds: taught, declaredCount: taught.length }, notTaughtObserved: [], historicalOutcome: null,
      provenanceSummary: { targets: 'SYNTHETIC', inventory: 'whole bank taught (synthetic)' }, notes: [] }
    fx.fidelity = require('./lib/fidelity').fidelityOf(fx)
    fs.writeFileSync(path.join(__dirname, 'fixtures', id + '.json'), JSON.stringify(fx, null, 1))
    console.log(id, tids.length, 'targets', taught.length, 'taught')
  }
}
