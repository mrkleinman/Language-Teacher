#!/usr/bin/env node
// v684 — benchmark fixtures matching the owner's three exported v683 Daily Tracks of 12 Oct 2026, so v683 and v684 can be
// compared on IDENTICAL inputs (same 30 targets, same new-word flags, same authorised vocabulary, same belt).
//   ja / zh: the export lists every authorised content word ("CONTENT VOCABULARY AVAILABLE THIS TRACK") → mapped to bank ids.
//   th: the export lists no inventory → word state from the 9-Oct DEVICE snapshot fixture (th-daily-device-2026-10-09),
//       targets from the 12-Oct export. Reconstructed parts are labelled in each fixture's `fidelity`.
//   node sandbox/v684/build_fixtures_1012.js
'use strict'
const fs = require('fs'), path = require('path'), { load } = require('../../harness')
const ROOT = path.join(__dirname, '..', '..'), FX = path.join(ROOT, 'benchmark', 'fixtures'), AUD = path.join(__dirname, 'audit')
const c = load(path.join(ROOT, 'tt.compiled.js'), { realBelt: true })
const EXPORT = {
  th: { sel: [1528, 1538, 1536, 1537, 1539, 24, 1577, 566, 195, 1449, 520, 1123, 563, 562, 1596, 528, 1435, 521, 307, 1464, 559, 565, 1598, 1129, 1111, 1246, 362, 553, 551, 1427], neu: [1528, 1538, 1536, 1537, 1539], belt: '9th Kyu' },
  ja: { sel: [44, 80, 83, 107, 108, 109, 110, 20, 43, 82, 87, 40, 84, 85, 86, 56, 1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 112, 15], neu: [107, 108, 109, 110, 112], belt: '10th Kyu' },
  zh: { sel: [12, 54, 57, 58, 62, 63, 59, 60, 61, 64, 65, 55, 56, 53, 51, 50, 49, 47, 48, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], neu: [59, 60, 61, 64, 65], belt: 'Mukyu' },
}
const FILES = { th: 'thai-track-12-Oct-2026-daily.txt', ja: 'japanese-track-2026-10-12-daily.txt', zh: 'mandarin-track-2026-10-12.txt' }
for (const lang of ['ja', 'zh', 'th']) {
  const e = EXPORT[lang], bank = lang === 'th' ? c.ev('RAW_VOCAB').map(d => ({ id: d.id, surface: d.t })) : (lang === 'ja' ? c.ev('RAW_JAPANESE_VOCAB') : c.ev('RAW_MANDARIN_VOCAB')).map(w => ({ id: w.id, surface: lang === 'ja' ? w.japanese : w.chinese }))
  const byId = new Map(bank.map(w => [w.id, w])), bySurf = new Map(bank.map(w => [w.surface, w]))
  const targets = e.sel.map(id => ({ id, surface: (byId.get(id) || {}).surface, status: e.neu.includes(id) ? 'new' : 'review', evidence: 'OBSERVED (12-Oct export: selectedTargetIds / selectedNewTargetIds)' }))
  const fx = { format: 'tt-benchmark-fixture/1', id: lang + '-daily-2026-10-12', language: lang, trackType: 'daily', label: 'v684 — the owner\'s exported v683 Daily Track of 12 Oct 2026 (' + FILES[lang] + ')',
    historicalLog: FILES[lang], belt: { rank: e.belt, source: 'export gen-log "LEVEL belt=…"' }, targets, targetsUnmapped: targets.filter(t => !t.surface).map(t => t.id) }
  if (lang !== 'th') {
    const meta = JSON.parse(fs.readFileSync(path.join(AUD, lang + '.meta.json'), 'utf8'))
    const ids = meta.vocab.map(s => (bySurf.get(s) || {}).id).filter(Boolean), unmapped = meta.vocab.filter(s => !bySurf.get(s))
    const taught = ids.filter(id => !e.sel.includes(id))
    fx.inventory = { observedIds: ids, taughtIds: taught, declaredCount: meta.vocab.length, unmappedSurfaces: unmapped }
    fx.fidelity = { class: 'EXPORT_EXACT_INVENTORY', exactLearnerState: false, summary: 'Targets, new flags, belt and all ' + meta.vocab.length + ' authorised words exact from the 12-Oct export (' + unmapped.length + ' surface(s) not in the bank: ' + unmapped.join(' ') + '); SRS dates reconstructed (synthetic "learning").' }
  } else {
    const dev = JSON.parse(fs.readFileSync(path.join(FX, 'th-daily-device-2026-10-09.json'), 'utf8'))
    fx.wordState = dev.wordState.map(s => e.sel.includes(s.id) && !e.neu.includes(s.id) && (s.status === 'new' || !s.status) ? { ...s, status: 'learning' } : e.neu.includes(s.id) ? { ...s, status: 'new' } : s)
    fx.inventory = { taughtIds: fx.wordState.filter(s => s.status === 'learning' || s.status === 'known').map(s => s.id) }
    fx.fidelity = { class: 'DEVICE_STATE_9OCT_TARGETS_12OCT', exactLearnerState: false, summary: 'Targets, new flags and belt from the 12-Oct export; per-word state from the 9-Oct device snapshot (the 12-Oct export lists no inventory) — reconstructed.' }
    fx.capturedAt = dev.capturedAt; fx.clockStartMs = dev.clockStartMs
  }
  fs.writeFileSync(path.join(FX, fx.id + '.json'), JSON.stringify(fx, null, 1))
  console.log(fx.id, 'targets', targets.length, 'unmapped targets', fx.targetsUnmapped.length, lang !== 'th' ? 'authorised ' + fx.inventory.observedIds.length + ' unmapped ' + fx.inventory.unmappedSurfaces.length : 'wordState ' + fx.wordState.length)
}
