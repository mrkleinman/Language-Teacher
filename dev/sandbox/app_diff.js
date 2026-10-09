#!/usr/bin/env node
// For a gen2-app run: did the unchanged production tail (QC / final audit / pronunciation) change what Gen2 accepted?
// Compares the final track's recalls with the Gen2-accepted sentences and the romaji the pronunciation stage validated.
'use strict'
const f = process.argv[2], r = JSON.parse(require('fs').readFileSync(f, 'utf8'))
const run = r.outcome ? r : r, es = run.cassette.entries
const romaji = new Map(), accepted = new Set()
for (const e of es) {
  const q = e.request.contents[0].parts[0].text
  let j; try { j = JSON.parse(String(e.response.body.candidates[0].content.parts[0].text).replace(/^```json|```$/g, '')) } catch (x) { continue }
  if (/^\[task: gen2-ja-reading/.test(q)) { const lines = [...q.matchAll(/^(\d+)\. (.*)$/gm)]; (j.items || []).forEach(v => { const l = lines.find(x => +x[1] === v.n); if (l) romaji.set(l[2], String(v.romaji || '').trim().replace(/\s+/g, ' ').replace(/tch/g, 'cch')) }) }
  if (/^\[task: gen2-daily-judge/.test(q)) { const lines = [...q.matchAll(/^(\d+)\. \[speaker: [^\]]*\] (.*?) \| English:/gm)]; (j.items || []).forEach(v => { const l = lines.find(x => +x[1] === v.n); if (l && v.grammar === 'ok' && v.natural === 'natural') accepted.add(l[2]) }) }
}
const P = ((run.outcome.content || {}).pairs || []).filter(p => p && p.targetId != null)
const textChanged = P.filter(p => !accepted.has(p.text)), pronChanged = P.filter(p => romaji.has(p.text) && romaji.get(p.text) !== p.pron)
console.log(JSON.stringify({ recalls: P.length, status: run.outcome.content && run.outcome.content.status, sentencesNotFromGen2: textChanged.map(p => p.text), romajiChangedAfterGen2: pronChanged.map(p => p.text + ' | gen2: ' + romaji.get(p.text) + ' | final: ' + p.pron) }, null, 1))
