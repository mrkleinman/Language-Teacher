#!/usr/bin/env node
// Blind review export / scoring for Daily runs (any generator), romaji included.
//
//   node sandbox/blind.js export <outDir> <run file or sandbox run dir> ...   → blind-items.json (shuffled, source hidden) + blind-key.json
//   node sandbox/blind.js score  <outDir> [labels file]                      → per-source totals from the reviewer's labels
//
// A run file is a tt-benchmark-run/1 file (e.g. benchmark/live/v677/…) or a sandbox run directory (uses bench-run.json).
// Labels are model labels unless stated otherwise: UNCALIBRATED until native-speaker review.
'use strict'
const fs = require('fs'), path = require('path'), crypto = require('crypto')
const [mode, outDir, ...rest] = process.argv.slice(2)
const F = { th: 'thai', ja: 'japanese', zh: 'chinese' }
function readRun(p) {
  const f = fs.statSync(p).isDirectory() ? path.join(p, 'bench-run.json') : p
  const r = JSON.parse(fs.readFileSync(f, 'utf8'))
  return { source: (r.pipeline || 'production') + ':' + path.basename(p).replace(/\.json$/, ''), lang: r.fixtureId.slice(0, 2), pairs: ((r.outcome || {}).content || {}).pairs || [] }
}
if (mode === 'export') {
  fs.mkdirSync(outDir, { recursive: true })
  const items = [], key = []
  for (const p of rest) {
    const r = readRun(p)
    r.pairs.filter(x => x && x.targetId != null).forEach((x, i) => {
      const id = crypto.createHash('sha256').update(r.source + '|' + i).digest('hex').slice(0, 12)
      items.push({ blindId: id, target: x.targetSurface || null, gloss: x.targetEnglish || null, speaker: x.speaker, text: x.text, romaji: x.pron || null, english: x.english, cue: x.cue })
      key.push({ blindId: id, source: r.source, index: i })
    })
  }
  items.sort((a, b) => a.blindId < b.blindId ? -1 : 1)
  fs.writeFileSync(path.join(outDir, 'blind-items.json'), JSON.stringify(items, null, 1))
  fs.writeFileSync(path.join(outDir, 'blind-key.json'), JSON.stringify(key, null, 1))
  console.log(items.length + ' items → ' + outDir)
} else if (mode === 'score') {
  const L = JSON.parse(fs.readFileSync(rest[0] || path.join(outDir, 'labels-blind-claude.json'), 'utf8'))
  const key = new Map(JSON.parse(fs.readFileSync(path.join(outDir, 'blind-key.json'), 'utf8')).map(k => [k.blindId, k.source]))
  const S = {}
  for (const l of L) {
    const s = S[key.get(l.blindId)] = S[key.get(l.blindId)] || { n: 0, anyProblem: 0, grammarError: 0, unnatural: 0, marginal: 0, registerMismatch: 0, misleadingTranslation: 0, targetWrong: 0, cueUseful: 0, cueCopiesAnswer: 0, cueOtherProblem: 0, weakOrNotUseful: 0, formatProblem: 0, romajiProblem: 0, romajiMissing: 0 }
    s.n++
    const prob = l.grammar !== 'ok' || l.natural !== 'natural' || l.translation !== 'accurate' || l.target !== 'correct' || l.useful !== 'useful' || l.fragment === true || l.register !== 'ok' || l.format !== 'ok' || (l.romaji && l.romaji !== 'ok')
    if (prob) s.anyProblem++
    if (l.grammar !== 'ok') s.grammarError++
    if (l.natural === 'unnatural') s.unnatural++
    if (l.natural === 'marginal') s.marginal++
    if (l.register !== 'ok') s.registerMismatch++
    if (l.translation !== 'accurate') s.misleadingTranslation++
    if (l.target !== 'correct') s.targetWrong++
    if (l.cue === 'useful') s.cueUseful++; else if (l.cue === 'copies-answer') s.cueCopiesAnswer++; else s.cueOtherProblem++
    if (l.useful !== 'useful') s.weakOrNotUseful++
    if (l.format !== 'ok') s.formatProblem++
    if (l.romaji === 'missing') s.romajiMissing++; else if (l.romaji && l.romaji !== 'ok') s.romajiProblem++
  }
  console.log(JSON.stringify(S, null, 1))
} else { console.log('usage: blind.js export <outDir> <runs…> | score <outDir> [labels]'); process.exit(2) }
