#!/usr/bin/env node
// FIX 3 CALIBRATION — does the rebuilt Japanese / Mandarin quality judge (tpJudgePrompt + tpJudgeDecide in the REAL app build)
// fail the sentences independent reviewers marked as wrong, and pass the ones they marked clean?
//   node sandbox/judge_calibration.js --dry                 → builds every request, prints counts and one prompt; no network
//   node sandbox/judge_calibration.js --cap 0.02 --session-cap X
// Reference labels: the blind v683 reviews (independent Claude reviewers — AI judgements, NOT native-speaker certification) and the
// language-quality corpus entries that carry an expected verdict. Spend is priced from Gemini's own usageMetadata, capped before
// every request (worst case), and appended to sandbox/spend-ledger.json; every request and reply is recorded.
'use strict'
if (process.env.NODE_USE_ENV_PROXY !== '1' && !process.argv.includes('--dry')) {
  const r = require('child_process').spawnSync(process.execPath, process.argv.slice(1), { stdio: 'inherit', env: { ...process.env, NODE_USE_ENV_PROXY: '1', NODE_NO_WARNINGS: '1' } })
  process.exit(r.status == null ? 1 : r.status)
}
const fs = require('fs'), path = require('path')
const DEV = path.join(__dirname, '..'); process.chdir(DEV)
const { load } = require('../harness')
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d }
const DRY = process.argv.includes('--dry'), CAP = +arg('cap', 0.02), SESSION_CAP = +arg('session-cap', 0)
const MODEL = 'gemini-2.5-flash-lite', PRICE = { in: 0.10, out: 0.40 }, BATCH = +arg('batch', 8)
const c = load(path.join(DEV, 'tt.compiled.js'), { realBelt: true })
const B = path.join(__dirname, 'compare', 'v683-blind')
const J = f => JSON.parse(fs.readFileSync(path.join(B, f), 'utf8'))
// reference set
const items = []
for (const [lang, it, lab] of [['ja', 'items-ja.json', 'labels-ja.json'], ['ja', 'items-ja2.json', 'labels-ja2.json'], ['zh', 'items-zh.json', 'labels-zh.json']]) {
  const L = new Map(J(lab).map(x => [x.id, x]))
  for (const x of J(it)) { const l = L.get(x.id); if (!l || items.some(y => y.lang === lang && y.text === x.text)) continue
    const bad = l.grammar === 'error' || l.natural === 'unnatural' || l.translation === 'misleading' || l.targetSense === 'wrong'
    const clean = l.grammar === 'ok' && l.natural === 'natural' && l.translation === 'accurate' && l.targetSense === 'correct'
    items.push({ lang, src: 'blind:' + it, target: x.target, sense: String(x.gloss || '').split(/[;,]/)[0], to: 'a friend', text: x.text, english: x.english || '', cue: x.cue || '', refBad: bad, refClean: clean, refCueMisleading: l.cue === 'misleading', note: l.note || '' }) }
}
// rejected candidates from the v683 acceptance study, blind-reviewed the same way (more genuinely wrong sentences)
{ const A = path.join(__dirname, 'compare', 'v683-acceptance'), RI = JSON.parse(fs.readFileSync(path.join(A, 'rejected-blind-items.json'), 'utf8')), RL = new Map(JSON.parse(fs.readFileSync(path.join(A, 'rejected-labels.json'), 'utf8')).map(x => [x.id, x]))
  for (const x of RI) { const l = RL.get(x.id); if (!l || !['ja', 'zh'].includes(x.lang) || !x.english || items.some(y => y.lang === x.lang && y.text === x.text)) continue
    const bad = l.grammar === 'error' || l.natural === 'unnatural' || l.translation === 'misleading' || l.targetUse === 'wrong' || l.targetUse === 'absent'
    const clean = l.grammar === 'ok' && l.natural === 'natural' && l.translation === 'accurate' && (l.targetUse === 'correct' || l.targetUse === 'n/a')
    items.push({ lang: x.lang, src: 'rejected-candidates', target: x.target || '', sense: '', to: 'a friend', text: x.text, english: x.english || '', cue: x.cue || '', refBad: bad, refClean: clean, refCueMisleading: false, note: l.note || '' }) } }
const corpus = JSON.parse(fs.readFileSync(path.join(__dirname, 'corpus', 'language-quality-corpus.json'), 'utf8'))
for (const e of (corpus.entries || corpus)) { if (!['ja', 'zh'].includes(e.lang) || !e.expected || !e.text) continue
  items.push({ lang: e.lang, src: 'corpus', target: e.target, sense: '', to: 'a friend', text: e.text, english: e.english || '', cue: e.cue || '', refBad: e.expected === 'reject', refClean: e.expected === 'accept', refCueMisleading: false, note: e.reason || '' }) }
// batches by language
const batches = []
for (const lang of ['ja', 'zh']) { const L = items.filter(x => x.lang === lang); for (let k = 0; k < L.length; k += BATCH) batches.push({ lang, items: L.slice(k, k + BATCH) }) }
console.log('reference items: ' + items.length + ' (ja ' + items.filter(x => x.lang === 'ja').length + ', zh ' + items.filter(x => x.lang === 'zh').length + ') · reviewer-bad ' + items.filter(x => x.refBad).length + ' · reviewer-clean ' + items.filter(x => x.refClean).length + ' · requests ' + batches.length)
if (DRY) { console.log('--- first prompt ---\n' + c.tpJudgePrompt(batches[0].lang, batches[0].items).slice(0, 1500)); process.exit(0) }
const LEDGER = path.join(__dirname, 'spend-ledger.json')
const ledger = JSON.parse(fs.readFileSync(LEDGER, 'utf8')), spentBefore = ledger.runs.reduce((a, r) => a + (r.costUsd || 0), 0)
const schema = c.ev('TP_JUDGE_SCHEMA')
;(async () => {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19), runId = 'judge-calibration.' + stamp
  const dir = path.join(__dirname, 'runs', runId); fs.mkdirSync(dir, { recursive: true })
  let cost = 0, sent = 0, refused = 0; const records = []
  for (const b of batches) {
    const prompt = c.tpJudgePrompt(b.lang, b.items)
    const worst = (Math.ceil(prompt.length / 2) + 50) * PRICE.in / 1e6 + 900 * PRICE.out / 1e6
    if (cost + worst > CAP || (SESSION_CAP && spentBefore + cost + worst > SESSION_CAP)) { refused++; b.refused = true; continue }
    const body = { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 900, responseMimeType: 'application/json', responseSchema: schema } }
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + MODEL + ':generateContent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const j = await r.json().catch(() => null); sent++
    const um = j && j.usageMetadata
    cost += um ? ((um.promptTokenCount || 0) * PRICE.in + ((um.candidatesTokenCount || 0) + (um.thoughtsTokenCount || 0)) * PRICE.out) / 1e6 : worst
    records.push({ lang: b.lang, request: body, status: r.status, response: j })
    let arr = null; try { arr = JSON.parse(j.candidates[0].content.parts[0].text).items } catch (e) {}
    b.items.forEach((x, k) => { const v = arr && (arr.find(y => y && y.i === k + 1) || arr[k]); x.verdict = v || null; x.judgeFail = v ? c.tpJudgeDecide([v]).action !== 'clean' : null; x.judgeCue = v ? v.cue : null })
  }
  const judged = items.filter(x => x.judgeFail != null)
  const rate = (a, b) => b ? Math.round(100 * a / b) + '% (' + a + '/' + b + ')' : 'n/a'
  const out = { runId, model: MODEL, costUsd: +cost.toFixed(5), requests: sent, refusedByCap: refused, byLang: {} }
  for (const lang of ['ja', 'zh']) { const L = judged.filter(x => x.lang === lang)
    const bad = L.filter(x => x.refBad), clean = L.filter(x => x.refClean), cm = L.filter(x => x.refCueMisleading)
    out.byLang[lang] = { judged: L.length, badCaught: rate(bad.filter(x => x.judgeFail).length, bad.length), cleanPassed: rate(clean.filter(x => !x.judgeFail).length, clean.length),
      misleadingCuesCaught: rate(cm.filter(x => x.judgeCue === 'misleading').length, cm.length),
      missedBad: bad.filter(x => !x.judgeFail).map(x => x.text + ' — reviewer: ' + x.note).slice(0, 12),
      failedClean: clean.filter(x => x.judgeFail).map(x => x.text + ' — judge: ' + c.tpJudgeDecide([x.verdict]).reason).slice(0, 12) } }
  fs.writeFileSync(path.join(dir, 'records.json'), JSON.stringify(records))
  fs.writeFileSync(path.join(dir, 'summary.json'), JSON.stringify({ ...out, items: judged.map(x => ({ lang: x.lang, src: x.src, text: x.text, refBad: x.refBad, refClean: x.refClean, judgeFail: x.judgeFail, verdict: x.verdict })) }, null, 1))
  const L2 = JSON.parse(fs.readFileSync(LEDGER, 'utf8')); L2.runs.push({ runId, at: new Date().toISOString(), costUsd: out.costUsd, requests: sent, status: 'CALIBRATION' }); fs.writeFileSync(LEDGER, JSON.stringify(L2, null, 1))
  console.log(JSON.stringify(out, null, 1)); console.log('→ ' + path.relative(DEV, dir))
})().catch(e => { console.error('CRASH ' + (e && e.stack || e)); process.exit(2) })
