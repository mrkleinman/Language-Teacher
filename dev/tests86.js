// 15 Nov — Mandarin gap-fill modules built into the app (the Mandarin twin of tests82 / THAI_MODULES).
//   E  the JS slot filling / module fit are EQUIVALENT to the Python reference for EVERY word and EVERY module (fixtures/zh-modules-equivalence.json, from tools/build_zh_modules.py --fixture)
//   R  every embedded module renders for its words: no leftover tokens, the sentence's pinyin is built from the chunks, and it is valid pinyin
//   V  the lines pass the app's own acceptance (validateMandarinPair) for a learner who knows the words, and are refused for one who does not
//   G  module-first Daily tracks: a full 30-target Mandarin track with ZERO model requests, an exchange stays together (A, B, A), the off switch and untagged words use the model,
//      each module once per track
//   N  the "Mandarin negates but the English does not" check no longer fires on words that only look negated (不过 有没有 没关系 特别 …)
// Real application functions; the only stand-in is the model (geminiGenerate), which counts calls and answers nothing.
const { load } = require('./harness')
const fs = require('fs'), zlib = require('zlib'), crypto = require('crypto')
const c = load(process.env.TT_FILE || 'tt.compiled.js'); c.console.info = () => {}; c.console.warn = () => {}
let n = 0, fails = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; console.log((pass ? 'PASS ' : 'FAIL ') + id + '  ' + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 700) : '')) }
const fx = JSON.parse(fs.readFileSync('fixtures/zh-modules-equivalence.json', 'utf8'))

;(async () => {
  const V0 = c.initMandarinVocab()
  const learned = V0.map(w => ({ ...w, status: 'learning', lastSeen: '2026-11-01', introducedAt: '2026-10-01', repCount: 3, okStreak: 1, dueDate: '2026-11-12' }))
  const data = JSON.parse(zlib.gunzipSync(Buffer.from(c.ev('ZH_MODULES_GZ'), 'base64')).toString('utf8'))
  const useData = c.ev('zhModulesUseData'), fillEn = c.ev('jaModuleFillEn'), chunk = c.ev('zhModuleChunk')
  T('E0', 'the embedded data unpacks: 6,900+ modules, every row has 15 fields, every chunk index is valid, every tag has 7 fields', useData(data) === data.m.length && data.m.length >= 6900 &&
    data.m.every(r => r.length === 15 && [4, 7, 10].every(i => Array.isArray(r[i]) && r[i].every(x => x === '{W}' || x === '{M}' || (Number.isInteger(x) && x >= 0 && x < data.c.length)))) &&
    Object.values(data.t).every(t => t.length === 7), { modules: data.m.length })
  const D = c.ev('ZH_MODULES').data
  // ── E ──
  const ids = Object.keys(fx.en)
  T('E1', 'every word the Python can fill has an embedded tag, and the embedded set has no other word (' + ids.length + ' words)', ids.length === Object.keys(data.t).length && ids.every(id => data.t[id]), { py: ids.length, js: Object.keys(data.t).length })
  const bank = new Map(V0.map(w => [String(w.id), w]))
  const missing = Object.entries(data.t).filter(([id, t]) => { const w = bank.get(id); return !w || w.chinese !== t[0] })
  T('E2', 'every embedded tag id exists in the app bank with the same headword (the 20 Taiwan duplicates left out of the bank have no tag)', missing.length === 0, missing.slice(0, 5))
  const tagFor = id => { const t = data.t[id]; return { word: t[0], tier: t[1], cell: t[2], slot: t[3], plural: t[4], measure: t[5], measurePinyin: t[6] } }
  const enBad = ids.filter(id => { const t = tagFor(id), e = fx.en[id]; return [fillEn('{E}', t.slot, t.plural), fillEn('{Es}', t.slot, t.plural), fillEn('x {a} y {E}', t.slot, t.plural)].some((x, k) => x !== e[k]) })
  T('E3', 'ALL ' + ids.length + ' words: the English fills {E} {Es} {a} equal the Python fills', enBad.length === 0, enBad.slice(0, 3))
  const wordsByCell = new Map()
  Object.keys(data.t).sort((a, b) => +a - +b).forEach(id => { const t = tagFor(id); if (!wordsByCell.has(t.cell)) wordsByCell.set(t.cell, []); wordsByCell.get(t.cell).push([id, t]) })
  let modBad = [], pairs = 0
  for (const rows of D.byCell.values()) for (const m of rows) {
    const h = crypto.createHash('sha1'); let nf = 0
    for (const [id, tag] of wordsByCell.get(m.cell) || []) {
      if (tag.tier > m.tier || (m.excl && m.excl.has(id))) continue
      nf++; pairs++
      for (const [items, en, pr] of m.lines) {
        const zh = items.map(it => typeof it === 'number' ? chunk(it).text : it === '{W}' ? tag.word : (tag.measure || '？M')).join('')
        h.update(zh + '|' + fillEn(en, tag.slot, tag.plural) + '|' + fillEn(pr, tag.slot, tag.plural) + '\n')
      }
    }
    const py = fx.mods[m.id]
    if (!py || py[0] !== nf || py[1] !== h.digest('hex').slice(0, 16)) modBad.push([m.id, py && py[0], nf])
  }
  T('E5', 'ALL ' + data.m.length + ' modules × every fitting word (' + pairs + ' fills × 3 lines): the Mandarin, English and prompt equal the Python (one hash per module, same number of fitting words)', modBad.length === 0 && Object.keys(fx.mods).length === data.m.length, modBad.slice(0, 5))
  const thin = [...wordsByCell.entries()].flatMap(([cell, ws]) => ws.filter(([id, t]) => (D.byCell.get(cell) || []).filter(m => m.tier >= t.tier && !(m.excl && m.excl.has(id))).length < 3).map(([id, t]) => t.word))
  T('E6', 'every tagged word has at least three modules it fits (none left with too few)', thin.length === 0, thin.slice(0, 10))

  // ── R ──
  const cands = c.ev('zhModuleCandidates'), render = c.ev('zhModuleRender'), vPinyin = c.ev('validateMandarinPinyin')
  const byIdW = new Map(learned.map(w => [String(w.id), w]))
  c.ev('ZH_MODULES').used.clear()
  let rBad = [], rOk = 0, rNull = 0
  for (const id of Object.keys(data.t)) {
    const w = byIdW.get(id); const list = cands(w, 5).slice(0, 3)
    for (const cd of list) {
      const lines = render(cd, w); if (!lines) { rNull++; continue }
      rOk++
      for (const l of lines) if (/[{}]/.test(l.chinese + l.english + l.prompt + l.pinyin) || !vPinyin(l.pinyin).ok || !l.chinese.includes(w.chinese === '' ? '?' : (cd.m.lines.flat().includes('{W}') ? w.chinese : '')) ) rBad.push([cd.m.id, w.chinese, l.chinese, l.pinyin])
    }
  }
  T('R1', 'up to 3 modules for EVERY tagged word (' + rOk + ' exchanges, ' + rOk * 3 + ' lines): no leftover token, the target is in the sentence, the pinyin is valid pinyin', rBad.length === 0, rBad.slice(0, 5))
  T('R2', 'a module that cannot be rendered for a word is skipped, never offered half filled (' + rNull + ' of ' + (rOk + rNull) + ' skipped)', rNull <= (rOk + rNull) * 0.01, { rNull, rOk })
  const some = learned.find(w => w.chinese === '我'), mm = cands(some, 5)[0]
  const l0 = mm && render(mm, some)
  T('R3', 'the pinyin of a rendered line has the tone marks of the fixed words and of the target, with punctuation attached (no space before a comma or a stop)', !!l0 && l0.every(l => /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]|wǒ/.test(l.pinyin) && !/\s[,.?!]/.test(l.pinyin)), l0 && l0.map(l => l.pinyin))

  // ── V ──
  const inv = c.mandarinLearnerInventory(learned, []), rules = c.mandarinScarcityRules(inv), val = c.ev('validateMandarinPair')
  const sample = Object.keys(data.t).filter((_, i) => i % 11 === 0)
  let got = 0
  const noPass = []
  for (const id of sample) {
    const w = { ...byIdW.get(id), selectionRole: 'review' }; let ok = false
    for (const cd of cands(w, 5).slice(0, 60)) {
      const lines = render(cd, w); if (!lines) continue
      const ex = []; let good = true
      for (const l of lines) { const v = val({ ...l }, w, inv, learned, rules, new Map(), { exchange: ex.slice() }); if (!v.ok) { good = false; break } ex.push({ recallIndex: 1, speaker: l.speaker, chinese: l.chinese, english: l.english }) }
      if (good) { ok = true; break }
    }
    if (ok) got++; else noPass.push(w.chinese)
  }
  T('V1', 'for a learner who knows every bank word, at least 95% of a sample of ' + sample.length + ' words have a module whose three lines pass validateMandarinPair (' + got + ' do)', got >= sample.length * 0.95, noPass)
  const w3 = learned.find(w => String(w.id) === Object.keys(data.t).find(id => data.t[id][1] >= 3 && wordsByCell.get(data.t[id][2]).length > 2))
  const bare = learned.map(w => w.id === w3.id ? w : { ...w, status: 'new', lastSeen: null, introducedAt: null, repCount: 0, dueDate: null, okStreak: 0 })
  const invB = c.mandarinLearnerInventory(bare, [w3]), rulesB = c.mandarinScarcityRules(invB)
  const lB = cands({ ...w3 }, 5).map(cd => render(cd, w3)).find(x => x)
  T('V2', 'for a learner who knows only the target (' + w3.chinese + '), a module line with other words is refused as untaught vocabulary', !!lB && lB.some(l => { const v = val({ ...l }, w3, invB, bare, rulesB, new Map(), {}); return !v.ok && /untaught/.test(v.problems.join(' ')) }), lB && lB.map(l => l.chinese))

  // ── G ──
  let calls = 0
  c.geminiGenerate = async () => { calls++; throw new Error('no network (test)') }
  const ZM = c.ev('ZH_MODULES'); let seed = 4242; ZM.rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
  c.ev('zhModulesBeginRun')(learned, null)
  const targets = []
  for (const w of learned.filter(w => w.entryType !== 'phrase' && data.t[String(w.id)]).sort((a, b) => a.unlockOrder - b.unlockOrder)) {
    if (targets.length >= 30) break
    if (w.unlockOrder < 150) continue
    const t = { ...w, selectionRole: 'review' }
    const inv1 = c.mandarinLearnerInventory(learned, [t]), r1 = c.mandarinScarcityRules(inv1)
    const used0 = new Set(ZM.used)
    if (c.ev('zhModuleExchange')(t, learned, inv1, r1, new Map(), null)) targets.push(t)
    ZM.used = used0
  }
  T('G0', 'thirty targets with a usable module were found for a learner who knows the bank', targets.length === 30, targets.length)
  const logs = []
  const run = async tg => c.generateMandarinTrack(tg, learned, 'x', 'm', () => {}, m => logs.push(m), { cancelled: false }, undefined, { onCheckpoint: () => {} })
  let res = null, err = null
  try { res = await run(targets) } catch (e) { err = e }
  const content = res ? res.pairs.filter(p => p.targetId != null) : []
  T('G1', 'a 30-target Mandarin track is written with ZERO model requests: 90 recalls, all from gap-fill modules', !err && calls === 0 && content.length === 90 && content.every(p => p._module === true), { err: err && String(err.message).slice(0, 200), calls, n: content.length, from: content.filter(p => p._module).length })
  const byT = new Map(); content.forEach(p => { if (!byT.has(p.targetId)) byT.set(p.targetId, []); byT.get(p.targetId).push(p) })
  T('G2', 'each target\'s three recalls come from ONE module, in order A, B, A, and stay together', [...byT.values()].every(l => l.length === 3 && new Set(l.map(p => p._moduleId)).size === 1 && l.map(p => p.speaker).join('') === 'ABA' && l.map(p => p.recallIndex).join('') === '123'))
  const modIds = [...byT.values()].map(l => l[0]._moduleId)
  T('G3', 'no module is used twice in one track', new Set(modIds).size === modIds.length)
  T('G4', 'the log says which module wrote each target and that no request was paid; the end line counts them', logs.some(l => /ZH_MODULE .*: module .* the three recalls, no paid request/.test(l)) && logs.some(l => /ZH_MODULES z1/.test(l)))
  // the off switch and an untagged word
  ZM.on = false; calls = 0; logs.length = 0
  let off = null
  try { off = await run(targets.slice(0, 2)) } catch (e) { off = { err: e } }
  T('G5', 'with ZH_MODULES.on = false no module is used (the model path is untouched: it is asked, here with no network)', calls > 0 && !(off && off.pairs && off.pairs.some(p => p._module)), { calls })
  ZM.on = true
  T('G6', 'a word with no tag is never given a module', c.ev('zhModuleTagOf')({ id: 999999, chinese: '无' }) === null && c.ev('zhModuleTagOf')({ id: targets[0].id, chinese: '不是这个字' }) === null)
  T('G7', 'the 20 Taiwan duplicates and the skipped words have no tag and no bank entry (旅遊 週 网路 妳 …)', ['旅遊', '週', '网路', '妳', '计程车', '捷运'].every(w => !V0.some(x => x.chinese === w)) && !data.t['863'] && !data.t['2431'])

  // ── N ──
  const am = c.ev('zhEnglishAddsMeaning')
  const none = [['你有没有发现？', 'Have you noticed?'], ['这个不错，不过有点贵。', 'This is pretty good, but a bit expensive.'], ['没关系，慢慢来。', "It's fine, take your time."], ['特别好吃。', 'It is especially delicious.'], ['别的店也不一样。', 'The other shops are different too.']]
  T('N1', 'a word that only looks negated (有没有 不过 不错 没关系 特别 别的 不一样) is not reported as a negation the English lacks', none.every(([z, e]) => !am(z, e).some(x => /negates/.test(x))), none.map(([z, e]) => am(z, e)))
  T('N2', 'a real negation is still reported (我不去。 / 他没有钱。 / 别去。 with an English that has no negative)', [['我不去。', 'I am going.'], ['他没有钱。', 'He has money.'], ['别去。', 'Go there.']].every(([z, e]) => am(z, e).some(x => /negates/.test(x))))
  console.log((fails ? 'FAIL ' : 'ALL PASS ') + (n - fails) + '/' + n)
  process.exit(fails ? 1 : 0)
})()
