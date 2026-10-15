const fs = require('fs'), D = __dirname, tag = process.argv[2] || 'cur'
const items = JSON.parse(fs.readFileSync(D + '/items.json'))
const r = JSON.parse(fs.readFileSync(D + '/r-' + tag + '-1.json')).concat(JSON.parse(fs.readFileSync(D + '/r-' + tag + '-2.json')).map(x => ({ ...x, i: x.i + 20 })))
let tp = 0, fn = [], fp = [], tn = 0, crit = 0, critMiss = []
items.forEach((it, k) => { const v = r.find(x => x.i === k + 1); const rej = v && (v.s < 4 || v.wrongSense)
  if (it.bad) { if (rej) tp++; else fn.push(it.id + ' ' + it.thai + ' s=' + (v && v.s)); if (it.critical) { if (rej) crit++; else critMiss.push(it.id) } }
  else { if (rej) fp.push(it.id + ' ' + it.thai + ' s=' + v.s + ' ctx=' + it._context); else tn++ } })
console.log(tag, 'caught', tp + '/20', '(' + Math.round(tp / 20 * 100) + '%) · critical', crit + '/5', critMiss.join(','), '· false rejections', fp.length + '/20')
console.log(' MISSED:', fn.join(' | ')); console.log(' FALSE:', fp.join(' | '))
