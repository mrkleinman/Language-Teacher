// Compile tt.jsx (classic JSX → React.createElement) for the node harness.
const esbuild = require('esbuild'), fs = require('fs')
const src = fs.readFileSync(process.argv[2] || 'tt.jsx', 'utf8')
const out = esbuild.transformSync(src, { loader: 'jsx', jsx: 'transform', target: 'es2020' })
fs.writeFileSync(process.argv[3] || 'tt.compiled.js', out.code)
console.log('compiled', out.code.length, 'bytes')
