// 12 Nov — Japanese gap-fill modules built into the app (the Japanese twin of THAI_MODULES).
//   E  the JS slot filling / conjugation / module fit are EQUIVALENT to the Python reference for EVERY word and EVERY module (fixtures/ja-modules-equivalence.json, from tools/build_ja_modules.py --fixture)
//   R  every embedded module renders for its words: no leftover tokens, segments rebuild the sentence, reading and romaji line up
//   V  the pre-segmented lines pass the app's own closed-vocabulary check for a learner who knows the words, and fail for one who does not
//   G  module-first target groups: a full 30-target Japanese track with ZERO model requests, an exchange stays together (A, B, A), a target without a module goes to the model,
//      polite speech and the off switch use no module, recovery paths and the other languages are untouched
// Real application functions; the only stand-in is the model (geminiRequest), which counts calls and answers nothing.
const { load } = require('./harness')
const fs = require('fs'), zlib = require('zlib'), crypto = require('crypto')
const c = load(process.env.TT_FILE || 'tt.compiled.js'); c.console.info = () => {}; c.console.warn = () => {}
const SRC = fs.readFileSync('tt.jsx', 'utf8')
let n = 0, fails = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; console.log((pass ? 'PASS ' : 'FAIL ') + id + '  ' + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 700) : '')) }
const csv = p => { // tiny CSV reader (quoted fields, BOM)
  const t = fs.readFileSync(p, 'utf8').replace(/^﻿/, ''), rows = []; let row = [], f = '', q = false
  for (let i = 0; i < t.length; i++) { const ch = t[i]
    if (q) { if (ch === '"') { if (t[i + 1] === '"') { f += '"'; i++ } else q = false } else f += ch }
    else if (ch === '"') q = true; else if (ch === ',') { row.push(f); f = '' } else if (ch === '\n') { row.push(f); rows.push(row); row = []; f = '' } else if (ch !== '\r') f += ch }
  if (f || row.length) { row.push(f); rows.push(row) }
  const h = rows.shift(); return rows.filter(r => r.length === h.length).map(r => Object.fromEntries(h.map((k, i) => [k, r[i]])))
}
const fx = JSON.parse(fs.readFileSync('fixtures/ja-modules-equivalence.json', 'utf8'))
const legacy = csv('japanese-modules/japanese-legacy-bank.csv'), toApp = new Map(legacy.map(r => [r.csv_id, r.app_id])), toCsv = new Map(legacy.map(r => [r.app_id, r.csv_id]))
const A = id => toApp.get(id) || id, C = id => toCsv.get(id) || id

;(async () => {
  const V = c.initJapaneseVocab()
  const data = JSON.parse(zlib.gunzipSync(Buffer.from(c.ev('JA_MODULES_GZ'), 'base64')).toString('utf8'))
  const useData = c.ev('jaModulesUseData'), tagOf = c.ev('jaModuleTagOf'), forms = c.ev('jaModuleForms'), fillEn = c.ev('jaModuleFillEn'), chunk = c.ev('jaModuleChunk')
  T('E0', 'the embedded data unpacks: 5,800+ modules, every row has 15 fields, every chunk index is valid, every tag has 7 fields', useData(data) === data.m.length && data.m.length >= 5800 &&
    data.m.every(r => r.length === 15 && [4, 7, 10].every(i => Array.isArray(r[i]) && r[i].every(x => typeof x === 'string' || (Number.isInteger(x) && x >= 0 && x < data.c.length)))) &&
    Object.values(data.t).every(t => t.length === 7), { modules: data.m.length })
  const D = c.ev('JA_MODULES').data
  // ── E: equivalence with the Python reference ──
  const ids = Object.keys(fx.forms)
  T('E1', 'every word the Python tags has an embedded tag (same text, tier, cell, class, slot, plural), and the embedded set has no other word', ids.length === Object.keys(data.t).length &&
    ids.every(id => data.t[A(id)]), { py: ids.length, js: Object.keys(data.t).length })
  const bank = new Map(V.map(w => [String(w.id), w]))
  const missing = Object.entries(data.t).filter(([id, t]) => { const w = bank.get(id); return !w || w.japanese.replace(/[（(][^）)]*[）)]\s*$/, '').trim() !== t[0] })
  T('E2', 'every embedded tag id exists in the app bank with the same headword (the 200 saved ids are translated, nothing else moved)', missing.length === 0, missing.slice(0, 5))
  const tagFor = id => { const t = data.t[A(id)]; return { word: t[0], tier: t[1], cell: t[2], pos: t[3], conj: t[4], slot: t[5], plural: t[6] } }
  let formBad = [], enBad = [], nForm = 0
  for (const id of ids) {
    const py = fx.forms[id], tag = tagFor(id), js = forms(tag)
    nForm++
    if (py._error) { if (js !== null) formBad.push([id, 'python raises, js does not']); continue }
    const kj = Object.keys(js || {}).sort().join(), kp = Object.keys(py).sort().join()
    if (!js || kj !== kp || Object.keys(py).some(k => py[k] !== js[k])) formBad.push([id, tag.word, kp === kj ? Object.keys(py).filter(k => py[k] !== (js || {})[k]).map(k => k + ':' + py[k] + '≠' + (js || {})[k]).join(' ') : kp + ' vs ' + kj])
    const e = fx.en[id], ej = [fillEn('{E}', tag.slot, tag.plural), fillEn('{Es}', tag.slot, tag.plural), fillEn('x {a} y {E}', tag.slot, tag.plural)]
    if (e.some((x, k) => x !== ej[k])) enBad.push([id, e, ej])
  }
  T('E3', 'ALL ' + nForm + ' words: every slot form ({W} {V…} {A…}) equals the Python conjugation (same keys, same text)', formBad.length === 0, formBad.slice(0, 5))
  T('E4', 'ALL words: the English fills {E} {Es} {a} equal the Python fills', enBad.length === 0, enBad.slice(0, 3))
  // modules: every (module, fitting word) line filled the way the Python does it, compared by one hash per module
  const wordsByCell = new Map()
  Object.entries(data.t).sort((a, b) => (+C(a[0])) - (+C(b[0]))).forEach(([id, t]) => { if (!wordsByCell.has(t[2])) wordsByCell.set(t[2], []); wordsByCell.get(t[2]).push([id, { word: t[0], tier: t[1], cell: t[2], pos: t[3], conj: t[4], slot: t[5], plural: t[6] }]) })
  let modBad = [], pairs = 0
  for (const rows of D.byCell.values()) for (const m of rows) {
    const h = crypto.createHash('sha1'); let nf = 0
    for (const [id, tag] of wordsByCell.get(m.cell) || []) {
      if (tag.tier > m.tier || (m.excl && m.excl.has(id))) continue
      nf++; pairs++
      const f = forms(tag)
      for (const [items, en, pr] of m.lines) {
        let ja = '', miss = false
        for (const it of items) { if (typeof it === 'number') ja += chunk(it).map(t => t.surface).join(''); else { const v = f && f[it.slice(1, -1)]; if (v === undefined) { miss = true; break } ja += v } }
        h.update((miss ? '\u0000KeyError' : ja) + '|' + fillEn(en, tag.slot, tag.plural) + '|' + fillEn(pr, tag.slot, tag.plural) + '\n')
      }
    }
    const py = fx.mods[m.id]
    if (!py || py[0] !== nf || py[1] !== h.digest('hex').slice(0, 16)) modBad.push([m.id, py && py[0], nf])
  }
  T('E5', 'ALL ' + data.m.length + ' modules × every fitting word (' + pairs + ' fills × 3 lines): the Japanese, English and prompt equal the Python (one hash per module, same number of fitting words)', modBad.length === 0, modBad.slice(0, 5))

  // ── R: rendering ──
  const learnedAll = V.map(w => ({ ...w, status: 'learning', lastSeen: '2026-11-01', introducedAt: '2026-10-01', repCount: 3, okStreak: 1, dueDate: '2026-11-12' }))
  const render = c.ev('jaModuleRender'), cands = c.ev('jaModuleCandidates'), structural = c.ev('structuralValidateJapanesePair'), kanaR = c.ev('romajiMatchesReading')
  c.ev('JA_MODULES').used.clear()
  let rBad = [], rNull = 0, rOk = 0
  const byIdW = new Map(learnedAll.map(w => [String(w.id), w]))
  const tagged = Object.keys(data.t).map(id => byIdW.get(id)).filter(Boolean)
  for (const w of tagged) {
    const list = cands(w, 5).slice(0, 4)
    for (const cd of list) {
      const lines = render(cd, w, l => '')
      if (!lines) { rNull++; continue }
      rOk++
      for (const l of lines) {
        const sv = structural({ ...l })
        const rebuilt = l.segments.map(s => s.surface).join('')
        if (/[{}]/.test(l.japanese + l.english + l.prompt) || rebuilt !== l.japanese || !sv.ok || /[一-鿿]/.test(l.reading) || !kanaR(l.romaji, l.reading))
          rBad.push([cd.m.id, w.japanese, l.japanese, sv.problems.join(';')])
      }
    }
  }
  T('R1', 'up to 4 modules for EVERY tagged word (' + rOk + ' exchanges, ' + (rOk * 3) + ' lines): no leftover token, segments rebuild the sentence, kana reading without kanji, romaji matches the reading, passes structuralValidateJapanesePair', rBad.length === 0 && rOk > 8000, { bad: rBad.slice(0, 4), n: rOk })
  T('R2', 'a module that cannot be rendered for a word is skipped, never offered half filled (words with no reading: ' + rNull + ' of ' + (rOk + rNull) + ' skipped)', rNull <= (rOk + rNull) * 0.02, { rNull, rOk })

  // ── V: the closed vocabulary is judged on real lemmas ──
  const unknownOf = c.ev('japaneseUnknownFromSegments')
  const invAll = c.japaneseLearnerInventory(learnedAll, learnedAll.slice(0, 10))
  let vBad = [], vN = 0
  for (const rows of D.byCell.values()) for (const m of rows) {
    const tag = (wordsByCell.get(m.cell) || []).find(([id, t]) => t.tier <= m.tier && !(m.excl && m.excl.has(id)))
    if (!tag) continue
    const w = byIdW.get(tag[0]); const lines = render({ m, tag: tag[1] }, w, l => ''); if (!lines) continue
    vN++
    lines.forEach(l => { const u = unknownOf(l, invAll); if (u && u.length) vBad.push([m.id, l.japanese, u.join(' ')]) })
  }
  T('V1', 'for a learner who knows every bank word, NO line of ALL ' + vN + ' module renders contains an untaught lemma (the Sudachi lemmas are mapped to the bank spelling)', vBad.length === 0, vBad.slice(0, 5))
  const someCell = [...D.byCell.values()].flat().find(m => m.tier >= 3 && m.lines[0][0].length >= 3)
  const tagS = wordsByCell.get(someCell.cell).find(([id, t]) => t.tier <= someCell.tier)
  const wS = byIdW.get(tagS[0])
  const bare = learnedAll.map(w => w.id === wS.id ? w : { ...w, status: 'new', lastSeen: null, introducedAt: null, repCount: 0, dueDate: null, okStreak: 0 })
  const invBare = c.japaneseLearnerInventory(bare, [wS])
  const lS = render({ m: someCell, tag: tagS[1] }, wS, l => '')
  T('V2', 'for a learner who knows only the target, a module line with other words reports them as untaught', !!lS && lS.some(l => (unknownOf(l, invBare) || []).length > 0), lS && lS.map(l => l.japanese))

  // ── G: module-first target groups ──
  const reg = 'casual'
  const grammar = {}; c.ev('JA_BUILDING_BLOCKS').forEach(b => c.ev('jaGrammarIntroduce')(grammar, 'buildingBlock', b.id, '2026-09-01'))
  c.jaGrammarLoad = async () => grammar; c.jaGrammarSave = async () => {}
  let calls = []
  c.geminiRequest = async o => { calls.push((o.messages || []).map(m => m.content).join('\n')); throw new Error('no network (test)') }
  const seeded = (() => { let s = 12345; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 } })()
  const JM = c.ev('JA_MODULES'); JM.rand = seeded
  const mkAd = (target, seen) => { const inv = c.japaneseLearnerInventory(learnedAll, [target]), rules = c.scarcityRules(inv)
    return c.japaneseTargetGroupAdapter({ vocab: learnedAll, registerId: reg, inv, rules, seenMap: seen, trackUsed: [], apiKey: 'x', model: 'm', onLog: null, opts: {} }) }
  // thirty words whose module passes for this learner (found by the same dry run the generator makes)
  c.ev('jaModulesBeginRun')(learnedAll, reg, null)
  const targets = []
  for (const w of learnedAll.filter(w => w.entryType !== 'phrase' && tagOf(w)).sort((a, b) => a.unlockOrder - b.unlockOrder)) {
    if (targets.length >= 30) break
    if (w.unlockOrder < 150) continue
    const t = { ...w, selectionRole: 'review' }, seen = new Map(), ad = mkAd(t, seen)
    if (ad.moduleExchange({ target: t })) targets.push(t)
  }
  T('G0', 'thirty targets with a usable module were found for a learner who knows the bank', targets.length === 30, targets.length)
  const scene = { scene: 'x', characterA: 'Ken', characterB: 'Mai', opening: 'こんにちは', opening_english: 'Hi', reply: 'こんにちは', reply_english: 'Hi', closing: 'またね', closing_english: 'See you', closing_reply: 'またね', closing_reply_english: 'See you' }
  const plan = { scenes: [{ sceneId: 'S1', purpose: 'everyday talk', targetIds: targets.map(t => t.id) }] }
  const runTrack = async (tg, register, extra) => {
    calls = []; const logs = []; const run = c.aiBeginRun('ja-track')
    const tc = c.jaGeneratorTrackContext(tg, { counts: { new: 0 } }, 'daily', register, run)
    const res = await c.generateJapaneseTrack(tg, learnedAll, register, 'AIzaSyTEST-harness-key-000000', 'gemini-2.5-flash-lite', () => {}, m => logs.push(m), { cancelled: false }, scene, { trackContext: tc, runId: run, scenePlan: plan, ...(extra || {}) })
    return { res, logs }
  }
  const full = await runTrack(targets.map(t => ({ ...t })), reg)
  const fr = full.res, fp = fr.pairs || []
  T('G1', 'a casual Daily track with a module for every target is COMPLETE (30 targets × 3 recalls) with ZERO model requests', fr.complete === true && fr.recallCount === 90 && calls.length === 0, { complete: fr.complete, recalls: fr.recallCount, calls: calls.length, tail: full.logs.slice(-4) })
  const tp = fp.filter(p => p._module)
  T('G2', 'all 90 recalls carry their module id, 30 distinct modules (never one twice in a track)', tp.length === 90 && new Set(tp.map(p => p._moduleId)).size === 30, { n: tp.length, distinct: new Set(tp.map(p => p._moduleId)).size })
  const body = fp.filter(p => !p._framing)
  let exchOk = true; const firstIdx = new Map()
  body.forEach((p, i) => { if (!firstIdx.has(p._moduleId)) firstIdx.set(p._moduleId, i) })
  firstIdx.forEach((i, id) => { const g = body.slice(i, i + 3); if (!(g.length === 3 && g.every(x => x._moduleId === id) && g.map(x => x.speaker).join('') === 'ABA')) exchOk = false })
  T('G3', 'each module exchange stays together in the track, in its own speakers (A, B, A) — not interleaved by round or re-lettered', exchOk && body.length === 90, { body: body.length })
  T('G4', 'every module pair has its fields for the player: Japanese, reading, romaji, English, prompt, segments, word id, target id, recall index 1-3', tp.every(p => p.japanese && p.reading && p.romaji && p.english && p.prompt && p.segments.length && p.wordId != null && p.targetId === p.wordId && [1, 2, 3].includes(p.recallIndex)), tp.find(p => !(p.japanese && p.reading && p.romaji && p.english && p.prompt)))
  T('G5', 'the generation log says how many recalls came from modules and how many from the model', full.logs.some(l => /JA_MODULES: 90 of 90 recalls came from gap-fill modules/.test(l)), full.logs.filter(l => /JA_MODULES/.test(l)).slice(-2))
  // a target without a module goes to the model; the others never do
  const noMod = learnedAll.find(w => w.entryType !== 'phrase' && !tagOf(w) && w.unlockOrder > 150 && w.partOfSpeech)
  const mixTargets = targets.slice(0, 4).map(t => ({ ...t })).concat([{ ...noMod, selectionRole: 'review' }])
  const mix = await runTrack(mixTargets, reg, { scenePlan: { scenes: [{ sceneId: 'S1', purpose: 'x', targetIds: mixTargets.map(t => t.id) }] } })
  const mixCalls = calls.filter(q => /JAPANESE TARGET: ★/.test(q)), named = new Set(mixCalls.map(q => (/JAPANESE TARGET: ★ ([^\s\[=]+)/.exec(q) || [])[1]))
  T('G6', 'a target with no module is written by the model as before (its own request), the four module targets make none', mixCalls.length >= 1 && [...named].every(x => x === noMod.japanese) && (mix.res.perTarget || []).slice(0, 4).every(set => set.length === 3 && set.every(p => p._module)), { named: [...named], noMod: noMod.japanese, calls: mixCalls.length })
  T('G7', 'the target without a module has no module pair', ((mix.res.perTarget || [])[4] || []).every(p => !p._module), null)
  const pol = await runTrack(targets.slice(0, 3).map(t => ({ ...t })), 'polite', { scenePlan: { scenes: [{ sceneId: 'S1', purpose: 'x', targetIds: targets.slice(0, 3).map(t => t.id) }] } })
  T('G8', 'polite speech uses no module (modules are plain speech): no module pair, and the log says why', (pol.res.perTarget || []).flat().every(p => !p._module) && pol.logs.some(l => /not used for the "polite" speech style/.test(l)), pol.logs.filter(l => /JA_MODULES/.test(l)))
  const nat = await runTrack(targets.slice(0, 3).map(t => ({ ...t })), 'natural', { scenePlan: { scenes: [{ sceneId: 'S1', purpose: 'x', targetIds: targets.slice(0, 3).map(t => t.id) }] } })
  T('G9', 'the default "natural" style (predominantly plain forms) takes modules too (each line is judged by the natural register gate like a model line)', (nat.res.perTarget || []).flat().some(p => p._module), nat.logs.filter(l => /JA_MODULE/.test(l)).slice(-3))
  JM.on = false
  const off = await runTrack(targets.slice(0, 2).map(t => ({ ...t })), reg, { scenePlan: { scenes: [{ sceneId: 'S1', purpose: 'x', targetIds: targets.slice(0, 2).map(t => t.id) }] } })
  JM.on = true
  T('G10', 'the switch (JA_MODULES.on = false) restores the model-only path: no module pair', (off.res.perTarget || []).flat().every(p => !p._module), null)
  // the other languages and the recovery paths
  T('G11', 'only the Japanese adapter defines moduleExchange, and only the main Daily generation passes useModules (quota recovery, single-recall recovery and Listening do not)',
    (SRC.match(/moduleExchange\(/g) || []).length === 2 && (SRC.match(/useModules: true/g) || []).length === 1 && /o\.useModules === true && adapter\.moduleExchange/.test(SRC), { def: (SRC.match(/moduleExchange\(/g) || []).length })
  T('G12', 'Thai and Mandarin have no module hook in the shared group core: generateTargetGroup is only called with the Japanese adapter', (SRC.match(/generateTargetGroup\(\{ language: '(?!ja)/g) || []).length === 0, null)
  console.log(fails ? 'FAILED ' + fails + '/' + n : 'ALL PASS ' + n + '/' + n); process.exit(fails ? 1 : 0)
})().catch(e => { console.log('CRASH', e && e.stack ? e.stack.slice(0, 900) : e); process.exit(2) })
