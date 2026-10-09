#!/usr/bin/env node
// Settings → Backup & Restore → Export Data (thai-teacher-backup-*.json: { version, exportedAt, vocab, tracks }) →
// a tt-learner-snapshot/1 file for benchmark/import_snapshot.js. Only per-word learner state is kept (no tracks).
//   node sandbox/backup_to_snapshot.js <backup.json> <lang th|ja|zh> <out.json>
'use strict'
const fs = require('fs'), path = require('path'), { load } = require('../harness')
const [file, lang, out] = process.argv.slice(2)
const b = JSON.parse(fs.readFileSync(file, 'utf8'))
if (!Array.isArray(b.vocab)) throw new Error('not an app backup (no vocab)')
const c = load(path.join(__dirname, '..', 'tt.compiled.js'), { realBelt: true })
let belt = null; try { const r = c.currentLearnerBelt(b.vocab); belt = r && { rank: r.rank, label: r.label } } catch (e) {}
const keep = ['id', 'status', 'lastSeen', 'dueDate', 'repCount', 'interval', 'okStreak', 'lapses', 'introducedAt', 'manualKnown']
const state = b.vocab.map(w => Object.fromEntries(keep.filter(k => w[k] !== undefined).map(k => [k, w[k]])))
const snap = { format: 'tt-learner-snapshot/1', exportedAt: b.exportedAt, appBuild: 'Settings backup v' + b.version, languages: { [lang]: { state, belt, words: state.length } } }
fs.writeFileSync(out, JSON.stringify(snap))
console.log(lang + ': ' + state.length + ' words · belt ' + (belt && belt.rank) + ' → ' + out)
