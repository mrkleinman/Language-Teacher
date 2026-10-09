// offline: every validated Japanese reading recorded in the sandbox runs → aligned segments → production's own audit
'use strict'
const fs = require('fs'), path = require('path'), { load } = require('../harness')
const c = load(path.join(__dirname, '..', 'tt.compiled.js'), { realBelt: true })
const fx = require('../benchmark/fixtures/ja-daily-2026-10-08.json'); const V = c.ttBenchApplyFixture(c.ttBenchBank('ja'), require('../benchmark/embed_fixtures').compact(fx)); const byId = new Map(V.map(w => [w.id, w]))
const pool = c.gen2CandidateOrder('ja', V, fx.targets.map(t => byId.get(t.id))).slice(0, 38), ctx = c.gen2Context({ lang: 'ja', vocab: V, apiKey: 'x' }), inv = c.gen2Inventory(ctx, pool)
const m = new Map()
for (const d of fs.readdirSync(path.join(__dirname, 'runs'))) { if (!/^ja-/.test(d)) continue
  const r = JSON.parse(fs.readFileSync(path.join(__dirname, 'runs', d, 'run.json'), 'utf8'))
  for (const e of r.cassette.entries) { const q = e.request.contents[0].parts[0].text; if (!/gen2-ja-reading/.test(q)) continue
    let j; try { j = JSON.parse(String(e.response.body.candidates[0].content.parts[0].text).replace(/^```json|```$/g, '')) } catch (x) { continue }
    const lines = [...q.matchAll(/^(\d+)\. (.*?)(   \(your previous.*)?$/gm)]
    ;(j.items || []).forEach(v => { const l = lines.find(x => +x[1] === v.n); if (l && !c.gen2JaReadingProblem({ text: l[2], reading: v.reading, romaji: c.gen2RomajiNorm ? c.gen2RomajiNorm(v.romaji) : v.romaji }, inv)) m.set(l[2], v) }) } }
let seg = 0, bad = []
for (const [t, g] of m) { const sg = c.gen2JaSegments(t, g.reading, inv); if (!sg) { bad.push(t + ' → NO SEGMENTS'); continue } seg++
  const ro = String(g.romaji).trim().replace(/\s+/g, ' ').replace(/tch/g, 'cch'), a = c.auditJapaneseReading({ japanese: t, reading: sg.reading, romaji: ro, phonetic: ro, segments: sg.segments }), pr = (a && a.problems) || []
  if (pr.length) bad.push(t + ' → ' + pr.join('; ')) }
console.log('validated readings ' + m.size + ' · segmented ' + seg + ' · production-audit problems ' + bad.length); bad.slice(0, 8).forEach(x => console.log('  ' + x))
for (const [t, r] of [['あの映画をまた見たよ。', 'あのえいがをまたみたよ。'], ['今何してるの？', 'いまなにしてるの？'], ['昨日、一緒にご飯を食べるのは楽しかった。', 'きのう、いっしょにごはんをたべるのはたのしかった。']]) { const sg = c.gen2JaSegments(t, r, inv); console.log('  ' + t + ' → ' + (sg && sg.romaji) + ' · ' + (sg && sg.segments.map(x => x.surface).join('|'))) }
