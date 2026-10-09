#!/usr/bin/env node
// Offline re-score (no model): every generator candidate recorded in a live Gen2 Daily run is re-checked with the
// CURRENT build's deterministic gates. Shows what a gate change would have rejected / let through on real model output,
// before any money is spent on a retest. (Gates needing fields the old run lacked, e.g. reading/romaji, are skipped.)
//   node sandbox/rescore.js sandbox/runs/<runId>
'use strict'
const fs = require('fs'), path = require('path')
const { load } = require('../harness')
const DEV = path.join(__dirname, '..')
const dir = path.resolve(process.argv[2])
const run = JSON.parse(fs.readFileSync(path.join(dir, 'run.json'), 'utf8')), sum = JSON.parse(fs.readFileSync(path.join(dir, 'summary.json'), 'utf8'))
const fx = JSON.parse(fs.readFileSync(path.join(DEV, 'benchmark/fixtures', sum.fixture + '.json'), 'utf8'))
const lang = fx.language, F = { th: 'thai', ja: 'japanese', zh: 'chinese' }[lang]
const c = load(path.join(DEV, 'tt.compiled.js'), { realBelt: true })
const vocab = c.ttBenchApplyFixture(c.ttBenchBank(lang), require('../benchmark/embed_fixtures').compact(fx))
const byId = new Map(vocab.map(w => [w.id, w]))
const g2 = run.outcome.gen2
const pool = c.gen2CandidateOrder(lang, vocab, fx.targets.map(t => byId.get(t.id))).slice(0, 30 + 8)
const ctx = c.gen2Context({ lang, vocab, apiKey: 'x', maxCalls: 1 }), inv = c.gen2Inventory(ctx, pool)
ctx.allowedSet = new Set(inv.list)
const bySurface = new Map(pool.map(w => [w[F], w]))
const accepted = new Set((run.outcome.content.pairs || []).map(p => p.text))
const rows = []
for (const e of run.cassette.entries) {
  const q = e.request.contents[0].parts[0].text
  if (!/^\[task: gen2-daily-probe/.test(q)) continue
  const w = bySurface.get((q.match(/TARGET WORD: (\S+)/) || [])[1]); if (!w) continue
  let j; try { j = JSON.parse(e.response.body.candidates[0].content.parts[0].text) } catch (x) { continue }
  for (const cand of j.candidates || []) {
    const tctx = c.gen2TargetCtx(ctx, w)
    const k = { ...cand, text: c.gen2Tidy(lang, cand.text), speaker: /^(male|female)$/.test(cand.speaker) ? cand.speaker : 'either', reading: cand.reading || 'あ', romaji: cand.romaji || 'a' }
    const p = c.gen2DetCheck(tctx, w, k, inv).filter(x => !/^reading|^romaji|disagrees with the dictionary/.test(x))
    rows.push({ target: w[F], text: cand.text, tidy: k.text, wasAccepted: accepted.has(cand.text), nowDet: p })
  }
}
if (process.argv[3]) rows.filter(r => r.target === process.argv[3]).forEach(r => console.log("  [" + process.argv[3] + "] " + r.tidy + "  → " + (r.nowDet.join("; ") || "PASS det")))
const nowRejectedAccepted = rows.filter(r => r.wasAccepted && r.nowDet.length)
const formerlyDetRejected = new Set(); g2.frozen.concat(g2.deferred).forEach(r => r.rejectionReasons.forEach(x => { const t = x.split(': ')[0]; if (!/judge:/.test(x)) formerlyDetRejected.add(t) }))
const nowPassDet = rows.filter(r => !r.wasAccepted && !r.nowDet.length && formerlyDetRejected.has(r.text))
console.log('candidates re-scored:', rows.length)
console.log('\nPREVIOUSLY ACCEPTED, NOW REJECTED by a deterministic gate (' + nowRejectedAccepted.length + '):'); nowRejectedAccepted.forEach(r => console.log('  ' + r.target + ' | ' + r.text.replace(/\n/g, '⏎') + '  → ' + r.nowDet.join('; ')))
console.log('\nPREVIOUSLY DET-REJECTED, NOW PASS the deterministic gates (would go to the judge) (' + nowPassDet.length + '):'); nowPassDet.forEach(r => console.log('  ' + r.target + ' | ' + r.tidy))
