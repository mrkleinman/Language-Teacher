#!/usr/bin/env node
// Restores the earlier production builds that the regression suites compare against, from this repository's own
// history of the production index.html (each version pinned to the exact commit below). Writes tt.vNNN.jsx and
// tt.vNNN.compiled.js next to tt.jsx (git-ignored), and tt.orig.compiled.js = the current production build (v677).
// Proof of fidelity: the v677 source is re-embedded in the page shell and must rebuild the deployed page byte-for-byte.
'use strict'
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process')
const DEV = path.join(__dirname, '..'), REPO = path.join(DEV, '..')
const PINS = { v641: 'c3b2c470651d84ca12f73af2e3e56d39bf344261', v642: 'ab7787f6e1e4f6dfaa2e52fd1fcaf3c3fe2f2c37', v643: '48089e9aaf54977b325f2334cca2444f415059f1',
  v644: 'e0887c41da73c526f68b8a616ca3631fa98236e6', v650: '932c19cf162dd126ff1392ce875c0109cf682725', v654: 'fe83cb904da0f7ba097d254b21aacf6dfd028083',
  v658: 'db97c9e05e27e10377e9e794d2c14b196dbeb558', v674: '808e727f92a0934783b287e1708c19921d12aecc', v677: 'cb7dff99fb21c4a3388dd2545611e33e79740c65' }
const PRODUCTION = 'v677'
const git = (...a) => execFileSync('git', ['-C', REPO, ...a], { encoding: 'utf8', maxBuffer: 1 << 28 })
function ensureCommit(c) { try { git('cat-file', '-e', c + '^{commit}') } catch (e) { git('fetch', '-q', '--depth=1000', 'origin', 'main') } }
function embedded(h) { const m = h.match(/<script type="text\/babel"[^>]*>/); return h.slice(h.indexOf(m[0]) + m[0].length, h.lastIndexOf('</script>')) }
for (const [v, c] of Object.entries(PINS)) {
  ensureCommit(c)
  const html = git('show', c + ':index.html')
  const ver = (html.match(/app-version" content="(v\d+)"/) || [])[1]
  if (ver !== v) throw new Error(c + ' holds ' + ver + ', not ' + v)
  const jsx = embedded(html).replace(/^\n/, '').replace(/\n$/, '')
  const jf = path.join(DEV, 'tt.' + v + '.jsx'), cf = path.join(DEV, 'tt.' + v + '.compiled.js')
  fs.writeFileSync(jf, jsx)
  if (!fs.existsSync(cf) || fs.statSync(cf).mtimeMs < fs.statSync(jf).mtimeMs) execFileSync('node', [path.join(DEV, 'build.js'), jf, cf], { cwd: DEV, stdio: 'ignore' })
  if (v === PRODUCTION) {
    const tmp = path.join(DEV, 'sandbox', '.v677-rebuilt.html')
    execFileSync('python3', [path.join(DEV, 'build_index.py'), jf, path.join(DEV, 'build/index-1.shell.html'), tmp, v], { stdio: 'ignore' })
    const same = fs.readFileSync(tmp).equals(Buffer.from(git('show', c + ':index.html'), 'utf8')); fs.unlinkSync(tmp)
    const live = fs.readFileSync(path.join(REPO, 'index.html'), 'utf8') === html
    console.log(v + ' rebuilt from extracted source: ' + (same ? 'BYTE-IDENTICAL to the deployed page' : 'DIFFERS') + ' · repo index.html is this commit: ' + live)
    if (!same) process.exit(1)
    fs.copyFileSync(cf, path.join(DEV, 'tt.orig.compiled.js'))
  }
  console.log(v + ' ← ' + c.slice(0, 9) + ' · ' + jsx.length + ' chars')
}
