// Fails if index.html's embedded app is not byte-identical to tt.jsx (canonical source).
const fs = require('fs')
const [jsx, html] = [process.argv[2] || 'tt.jsx', process.argv[3] || 'index.html']
const h = fs.readFileSync(html, 'utf8'), j = fs.readFileSync(jsx, 'utf8')
const _m = h.match(/<script type="text\/babel"[^>]*>/)
const emb = h.slice(h.indexOf(_m[0]) + _m[0].length, h.lastIndexOf('</script>'))
const ok = emb.trim() === j.trim()
const ver = (h.match(/app-version" content="(v\d+)"/) || [])[1], sw = [...new Set(h.match(/tt-v\d+/g))]
console.log((ok ? 'IN SYNC' : 'DRIFT') + ' · app-version ' + ver + ' · SW cache ' + sw.join(','))
if (!ok) { const a = emb.trim().split('\n'), b = j.trim().split('\n'); const i = a.findIndex((l, k) => l !== b[k]); console.log('first difference at embedded line ' + (i + 1) + ':\n  html: ' + a[i] + '\n  jsx:  ' + b[i]); process.exit(1) }
