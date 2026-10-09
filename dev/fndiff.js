// Lists top-level functions whose source differs between two tt.jsx versions.
const fs = require('fs')
const grab = f => { const s = fs.readFileSync(f, 'utf8'); const m = new Map(); const re = /^(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/gm; let x; const idx = []
  while ((x = re.exec(s))) idx.push([x[1], x.index]); idx.forEach(([n, i], k) => { const seg = s.slice(i, k + 1 < idx.length ? idx[k + 1][1] : s.length); const e = seg.search(/\n}\s*(\n|$)/); m.set(n, e >= 0 ? seg.slice(0, e + 2) : seg) }); return m }
const a = grab(process.argv[2]), b = grab(process.argv[3])
const changed = [...b.keys()].filter(k => a.has(k) && a.get(k) !== b.get(k)), added = [...b.keys()].filter(k => !a.has(k)), removed = [...a.keys()].filter(k => !b.has(k))
const jz = n => /(Ja|Zh|Japanese|Mandarin|Chinese|Kana|Hanzi|Pinyin|Kanji)/.test(n)
console.log('CHANGED (' + changed.length + '): ' + changed.join(', '))
console.log('ADDED (' + added.length + '): ' + added.join(', '))
console.log('REMOVED (' + removed.length + '): ' + removed.join(', '))
console.log('JA/ZH-named functions changed/removed: ' + (changed.concat(removed).filter(jz).join(', ') || 'none'))
