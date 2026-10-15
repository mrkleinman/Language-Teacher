const fs = require('fs'); process.chdir('/home/user/Language-Teacher/dev')
const { load } = require('/home/user/Language-Teacher/dev/harness')
const c = load('tt.compiled.js')
function parse(f) { const FIX = fs.readFileSync(f, 'utf8'), P = []
  for (const b of FIX.split(/\n(?=\[\d{3}\] )/)) { const m = /^\[(\d{3})\] (.*)/.exec(b); if (!m) continue
    const g = k => ((new RegExp('^\\s*' + k + ':\\s*(.*)$', 'm')).exec(b) || [, ''])[1].trim()
    P.push({ n: +m[1], prompt: m[2], thai: g('TH'), english: g('EN'), _target: (/TARGET: (\S+)/.exec(b) || [])[1], speaker: (/SPEAKER: (\w)/.exec(b) || [])[1] }) }
  return P }
const F = { v702: parse('sandbox/thai-daily-v702-fixture/thai-track-15-Oct-2026-daily.txt'), v700: parse('sandbox/thai-daily-v700-fixture/thai-track-15-Oct-2026-daily.txt'), v699: parse('sandbox/thai-daily-v699-fixture/thai-track-14-Oct-2026-daily.txt') }
const BAD = { v702: [11, 15, 17, 27, 28, 33, 46, 50, 73], v700: [17, 23, 30, 43, 45, 61, 80, 85], v699: [32, 74, 88] }
const CRIT = new Set(['v702:15', 'v702:17', 'v702:33', 'v702:50', 'v699:74'])
const GOOD = { v702: [3, 6, 9, 12, 14, 18, 21, 22, 30, 36, 38, 42, 52, 55, 57, 60, 66, 77, 84, 88] }
const items = []
const add = (v, n, bad) => { const P = F[v], i = P.findIndex(p => p.n === n), p = P[i], prev = P[i - 1]
  items.push({ id: v + ':' + n, bad, critical: CRIT.has(v + ':' + n), thai: p.thai, english: p.english, speaker: p.speaker, _context: process.env.CTX ? (prev ? prev.thai : '') : '', _target: p._target, _targetSense: '' }) }
for (const v in BAD) BAD[v].forEach(n => add(v, n, true))
for (const v in GOOD) GOOD[v].forEach(n => add(v, n, false))
// deterministic shuffle
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
for (let i = items.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [items[i], items[j]] = [items[j], items[i]] }
// target senses from the bank
const bank = c.initVocab(); items.forEach(it => { const w = bank.find(x => x.thai === it._target); it._targetSense = w ? w.english : '' })
fs.writeFileSync(__dirname + '/items.json', JSON.stringify(items, null, 1))
const tag = process.argv[2] || 'cur'
for (let k = 0; k < 2; k++) fs.writeFileSync(__dirname + '/prompt-' + tag + '-' + (k + 1) + '.txt', c._naturalnessPromptText(items.slice(k * 20, k * 20 + 20)))
console.log(items.length, 'items; bad', items.filter(x => x.bad).length)
if (process.env.SCENE) for (let k = 0; k < 2; k++) fs.writeFileSync(__dirname + '/prompt-' + tag + '-' + (k + 1) + '.txt', c._naturalnessPromptText(items.slice(k * 20, k * 20 + 20), process.env.SCENE))
