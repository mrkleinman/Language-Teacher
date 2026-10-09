// Step 0 — the six live v674 logs of 8 Oct 2026, preserved VERBATIM as historical observations (one uncontrolled live
// run each; different targets per track; not a benchmark). The manifest pins their bytes (sha256) so later work can
// prove the evidence was not altered.
'use strict'
const fs = require('fs'), path = require('path'), crypto = require('crypto')
const D = path.join(__dirname, 'historical', '2026-10-08-v674')
const KIND = { 'gen-log-2026-10-08T06-40-49.txt': ['th', 'daily'], 'japanese-gen-log-2026-10-08.txt': ['ja', 'daily'], 'mandarin-gen-log-2026-10-08.txt': ['zh', 'daily'],
  'listening-log-2026-10-08T06-45-28.txt': ['th', 'listening'], 'listening-log-2026-10-08T06-33-32.txt': ['ja', 'listening'], 'listening-log-2026-10-08T06-31-46.txt': ['zh', 'listening'] }
const files = Object.keys(KIND).map(f => { const b = fs.readFileSync(path.join(D, f)); const t = b.toString('utf8')
  return { file: f, language: KIND[f][0], trackType: KIND[f][1], bytes: b.length, sha256: crypto.createHash('sha256').update(b).digest('hex'),
    build: (t.match(/build=(v\d+)/) || [])[1] || 'v674 (no build stamp in this log; recorded the same day as the stamped v674 logs)',
    source: 'Google Drive folder 17TInnpRNsGdU9pf2PXSk1sKq5lmz3sK_ (downloaded 2026-10-08)' } })
const m = { format: 'tt-historical-manifest/1', label: 'HISTORICAL OBSERVATIONS — six uncontrolled live v674 runs (one per track type), NOT controlled benchmark runs',
  caveats: ['Each log is ONE live run with its own targets and learner state; they are not repeated runs and cannot measure variance.',
    'No cassette (prompt/response capture) exists for these runs — they cannot be replayed; they are evidence, not reproducible inputs.',
    'Learner snapshots were not exported from the device; the fixtures in ../../fixtures reconstruct the learner from these logs and say how, per word.'],
  files }
fs.writeFileSync(path.join(D, 'MANIFEST.json'), JSON.stringify(m, null, 1))
console.log(files.map(f => f.file + ' ' + f.bytes + ' ' + f.sha256.slice(0, 16)).join('\n'))
