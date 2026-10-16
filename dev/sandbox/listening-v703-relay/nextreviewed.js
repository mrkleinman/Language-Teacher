// prints the 30 ids the bridge would select with REVIEWED=<in>, and writes <in> ∪ those ids to <out>
'use strict'
const fs = require('fs'), path = require('path'), DEV = '/home/user/Language-Teacher/dev'
const { load } = require(DEV + '/harness')
const [IN, OUT, TT] = process.argv.slice(2)
const c = load(TT, { realBelt: true }); c.console.info = () => {}; c.console.warn = () => {}
const B = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'snapshot', 'thai-backup-2026-10-15.json'), 'utf8'))
const byId = new Map(B.vocab.map(w => [w.id, w]))
const F = ['status', 'difficulty', 'interval', 'lastSeen', 'dueDate', 'repCount', 'lapses', 'okStreak', 'manualKnown', 'introducedAt', 'note']
const vocab = c.initVocab().map(w => { const o = byId.get(w.id); if (!o) return w; const n = { ...w }; F.forEach(k => { if (o[k] !== undefined) n[k] = o[k] }); return n })
B.vocab.forEach(o => { if (!vocab.some(w => w.id === o.id)) vocab.push({ ...o }) })
const ids = new Set(IN ? JSON.parse(fs.readFileSync(IN, 'utf8')) : []), d = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10)
vocab.forEach((w, i) => { if (ids.has(w.id)) vocab[i] = { ...w, dueDate: d, lastSeen: new Date().toISOString().slice(0, 10) } })
const snap = c.selectRevisionTargets('th', vocab)
const sel = (snap.ids || snap.targetIds || (snap.targets || snap.words || []).map(w => w.id))
console.log(Object.keys(snap).join(','), sel.length, sel.map(id => (vocab.find(w => w.id === id) || {}).thai).join(' '))
fs.writeFileSync(OUT, JSON.stringify([...ids, ...sel]))
