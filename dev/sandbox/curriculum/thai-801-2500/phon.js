// node phon.js → phon-composed.json (readings built from the dictionary's own PASS readings of each word part, joined with "-",
// the bank's convention) + phon-todo.json (new words with a part the dictionary cannot read)
const fs = require('fs'), path = require('path')
const DIR = __dirname, TT = path.join(DIR, '..', '..', '..', 'tt.jsx')
const LIT = JSON.parse(/^const RAW_VOCAB = (\[.*\])\s*$/m.exec(fs.readFileSync(TT, 'utf8'))[1])
const plan = JSON.parse(fs.readFileSync(path.join(DIR, 'plan.json'), 'utf8'))
const read = new Map()
LIT.forEach(d => { const t = String(d.t || '').trim(); if (!t || /\s|\.\.\.|…/.test(t) || !d.ph || d.phoneticQc !== 'PASS') return; if (!read.has(t)) read.set(t, String(d.ph).trim().replace(/\s+/g, '-')) })
const units = [...read.keys()].sort((a, b) => b.length - a.length)
const composed = {}, todo = []
plan.filter(p => p.id == null).forEach(p => {
  const s = p.t.replace(/\s+/g, ''); const parts = []; let i = 0, ok = true
  while (i < s.length) { const hit = units.find(u => s.startsWith(u, i)); if (!hit) { ok = false; break } parts.push(hit); i += hit.length }
  // a whole-word entry counts; a split needs 2+ parts, each a real dictionary word
  if (ok && parts.length) composed[p.slot] = { t: p.t, ph: parts.map(x => read.get(x)).join('-'), parts }
  else todo.push({ slot: p.slot, t: p.t, en: p.en })
})
fs.writeFileSync(path.join(DIR, 'phon-composed.json'), JSON.stringify(composed, null, 1))
fs.writeFileSync(path.join(DIR, 'phon-todo.json'), JSON.stringify(todo, null, 1))
console.log('new', plan.filter(p => p.id == null).length, '· composed from dictionary parts', Object.keys(composed).length, '· need a reading', todo.length)
