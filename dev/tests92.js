// 16 Nov — Cantonese as the fourth language, part 2: the gap-fill modules and the module-only Daily writer (the Cantonese twin of tests86).
//   E  the JS slot filling / module fit / Yale composition are EQUIVALENT to the Python reference for EVERY word and EVERY module (fixtures/yue-modules-equivalence.json,
//      from tools/build_yue_modules.py --fixture)
//   R  every embedded module renders for its words: no leftover tokens, valid Yale, segments rebuild the sentence, the target is in it, 呢 is read both ways
//   C  the structural checks (yueLineProblems) catch each defect they claim to catch, and pass a sound line
//   G  a full 30-target Cantonese track with ZERO model requests: 90 recalls, an exchange stays together (A, B, A), each module once per track, a word with no module and a
//      switched-off module set stop the run with a plain message (never a silent substitute); Revision tracks use the same writer; nothing of Mandarin runs on it
// Real application functions; the only stand-in is the model transport, which counts calls and answers nothing.
const { load } = require('./harness')
const fs = require('fs'), zlib = require('zlib'), crypto = require('crypto')
const c = load(process.env.TT_FILE || 'tt.compiled.js'); c.console.info = () => {}; c.console.warn = () => {}
let n = 0, fails = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; console.log((pass ? 'PASS ' : 'FAIL ') + id + '  ' + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 700) : '')) }
const fx = JSON.parse(fs.readFileSync('fixtures/yue-modules-equivalence.json', 'utf8'))
const SRC = fs.readFileSync('tt.jsx', 'utf8')

;(async () => {
  const V0 = c.initCantoneseVocab()
  const learned = V0.map(w => ({ ...w, status: 'learning', lastSeen: '2026-11-01', introducedAt: '2026-10-01', repCount: 3, okStreak: 1, dueDate: '2026-11-12' }))
  const data = JSON.parse(zlib.gunzipSync(Buffer.from(c.ev('YUE_MODULES_GZ'), 'base64')).toString('utf8'))
  const useData = c.ev('yueModulesUseData'), fillEn = c.ev('jaModuleFillEn'), chunk = c.ev('yueModuleChunk')
  c.yueModulesSetEnabled(true)
  T('E0', 'the embedded data unpacks: 2,995 modules, every row has 15 fields, every chunk index is valid, every tag has 7 fields', useData(data) === data.m.length && data.m.length === 2995 && data.v === 'y1' &&
    data.m.every(r => r.length === 15 && [4, 7, 10].every(i => Array.isArray(r[i]) && r[i].every(x => x === '{W}' || x === '{M}' || (Number.isInteger(x) && x >= 0 && x < data.c.length)))) &&
    Object.values(data.t).every(t => t.length === 7), { modules: data.m.length })
  const D = c.ev('YUE_MODULES').data
  // ── E ──
  const ids = Object.keys(fx.en)
  T('E1', 'every word the Python can fill has an embedded tag, and the embedded set has no other word (' + ids.length + ' words)', ids.length === Object.keys(data.t).length && ids.every(id => data.t[id]), { py: ids.length, js: Object.keys(data.t).length })
  const bank = new Map(V0.map(w => [String(w.id), w]))
  const missing = Object.entries(data.t).filter(([id, t]) => { const w = bank.get(id); return !w || w.chinese !== t[0] })
  T('E2', 'every embedded tag id exists in the app bank with the same headword', missing.length === 0, missing.slice(0, 5))
  const noMod = V0.filter(w => !data.t[String(w.id)]).map(w => w.chinese)
  T('E2b', 'the words with no module are exactly 穿 睜 當, and YUE_NO_MODULE_IDS lists exactly them (the selector knows before the data is unpacked)', noMod.length === 3 && ['穿', '睜', '當'].every(x => noMod.includes(x)) &&
    JSON.stringify(c.ev('YUE_NO_MODULE_IDS')) === JSON.stringify(V0.filter(w => !data.t[String(w.id)]).map(w => w.id).sort((a, b) => a - b)), noMod)
  const tagFor = id => { const t = data.t[id]; return { word: t[0], tier: t[1], cell: t[2], slot: t[3], plural: t[4], measure: t[5], measureYale: t[6] } }
  const enBad = ids.filter(id => { const t = tagFor(id), e = fx.en[id]; return [fillEn('{E}', t.slot, t.plural), fillEn('{Es}', t.slot, t.plural), fillEn('x {a} y {E}', t.slot, t.plural)].some((x, k) => x !== e[k]) })
  T('E3', 'ALL ' + ids.length + ' words: the English fills {E} {Es} {a} equal the Python fills', enBad.length === 0, enBad.slice(0, 3))
  const wordsByCell = new Map()
  Object.keys(data.t).sort((a, b) => +a - +b).forEach(id => { const t = tagFor(id); if (!wordsByCell.has(t.cell)) wordsByCell.set(t.cell, []); wordsByCell.get(t.cell).push([id, t]) })
  // the REAL renderer produces the lines (Cantonese, Yale, English, cue); the hash is the Python's: the fixed text, the Yale of every word and the slots' fill
  let modBad = [], fills = 0, nullFills = 0
  const sha = x => crypto.createHash('sha1').update(x)
  for (const rows of D.byCell.values()) for (const m of rows) {
    const h = sha('') ; const parts = []; let nf = 0
    for (const [id, tag] of wordsByCell.get(m.cell) || []) {
      if (tag.tier > m.tier || (m.excl && m.excl.has(id))) continue
      nf++; fills++
      const w = bank.get(id), lines = c.ev('yueModuleRender')({ m, tag }, w)
      if (!lines) { nullFills++; continue }
      lines.forEach(l => parts.push(l.chinese + '|' + l.pinyin + '|' + l.english + '|' + l.prompt + '\n'))
    }
    const hh = crypto.createHash('sha1'); parts.forEach(p => hh.update(p))
    const py = fx.mods[m.id]
    if (!py || py[0] !== nf || py[1] !== hh.digest('hex').slice(0, 16)) modBad.push([m.id, py && py[0], nf])
  }
  T('E5', 'ALL ' + data.m.length + ' modules × every fitting word (' + fills + ' fills × 3 lines): the Cantonese, Yale, English and cue produced by the app equal the Python reference (one hash per module, same number of fitting words)', modBad.length === 0 && Object.keys(fx.mods).length === data.m.length && nullFills === 0, { bad: modBad.slice(0, 5), nullFills })
  // Mandarin's twin of this test asserts "at least three modules for every word". The Cantonese data does not have that yet: the checker itself reports 1,021 words with fewer
  // than 3 modules (430 with exactly one, 588 with two, and 穿 睜 當 with none, which are untagged). That is a DATA debt of the module set, not an app defect, so it is NOT hidden:
  // the test below asserts what the app needs (every tagged word has at least ONE module: a track's three recalls come from one), pins the number of thin words as a ceiling so it
  // can only go down, and prints it. A word with one module gets the same three sentences each time it is taught (listed in the report as an open item).
  const modCount = ([cell, ws]) => ws.map(([id, t]) => [t.word, (D.byCell.get(cell) || []).filter(m => m.tier >= t.tier && !(m.excl && m.excl.has(id))).length])
  const counts = [...wordsByCell.entries()].flatMap(modCount)
  const thin = counts.filter(([, k]) => k < 3), none = counts.filter(([, k]) => k < 1), one = counts.filter(([, k]) => k === 1)
  T('E6', 'every tagged word has at least one module (none without); words with fewer than 3 modules (known data debt, ceiling ' + 1018 + ') are counted here, not hidden: ' + thin.length + ' thin, ' + one.length + ' with exactly one', none.length === 0 && thin.length <= 1018 && thin.length > 0, { thin: thin.length, one: one.length, none: none.slice(0, 5) })

  // ── R ──
  const cands = c.ev('yueModuleCandidates'), render = c.ev('yueModuleRender'), lineProblems = c.ev('yueLineProblems')
  const byIdW = new Map(learned.map(w => [String(w.id), w]))
  c.ev('YUE_MODULES').used.clear()
  let rBad = [], rOk = 0, rNull = 0
  for (const id of Object.keys(data.t)) {
    const w = byIdW.get(id); const list = cands(w, 5).slice(0, 3)
    for (const cd of list) {
      const lines = render(cd, w); if (!lines) { rNull++; continue }
      rOk++
      for (const l of lines) { const p = lineProblems(l, w, null); if (p.length) rBad.push([cd.m.id, w.chinese, l.chinese, p[0]]) }
    }
  }
  T('R1', 'up to 3 modules for EVERY tagged word (' + rOk + ' exchanges, ' + rOk * 3 + ' lines): no leftover token, the target is in the sentence, valid Yale for every word and the sentence, the segments rebuild the sentence', rBad.length === 0 && rOk > 4900, rBad.slice(0, 5))
  T('R2', 'a module that cannot be rendered for a word is skipped, never offered half filled (' + rNull + ' of ' + (rOk + rNull) + ' skipped)', rNull <= (rOk + rNull) * 0.01, { rNull, rOk })
  const eat = learned.find(w => w.chinese === '食'), mm = cands(eat, 5)[0], l0 = mm && render(mm, eat)
  T('R3', 'a rendered line has the Yale of the fixed words and of the target, punctuation attached (no space before a comma or a stop), no tone number', !!l0 && l0.every(l => /[āáàēéèīíìōóòūúù]/.test(l.pinyin) && !/\s[,.?!]/.test(l.pinyin) && !/[0-9]/.test(l.pinyin)) && l0.some(l => l.pinyin.includes('sihk')), l0 && l0.map(l => l.pinyin))
  T('R4', 'the word-by-word view: every non-punctuation segment has its own Yale and a short English, the target segment carries the word id and the English slot, a punctuation segment has no Yale',
    l0.every(l => l.segments.every(s => s.type === 'punct' ? !s.pinyin : (s.pinyin && c.validateYale(s.pinyin).ok))) && l0.some(l => l.segments.some(s => s.vocabId === eat.id && s.english === 'eat')) && l0.some(l => l.segments.some(s => s.type === 'vocab' && s.english)), l0[0].segments)
  // 呢: nī before a word, nē at the end of a clause
  {
    const seen = { ni: 0, ne: 0 }, wrong = []
    for (const m of data.m.slice(0, 3000)) for (const k of [4, 7, 10]) for (const it of m[k]) if (typeof it === 'number') { const ch = chunk(it)
      ch.words.forEach((w, i) => { if (w.surface === '呢') { const after = i + 1 < ch.words.length ? ch.words[i + 1].surface : null
        if (w.yale === 'nī') seen.ni++; else if (w.yale === 'nē') seen.ne++; else wrong.push(w.yale)
        if (w.yale === 'nē' && after !== null && !/^[，。？！、…」]$/.test(after)) wrong.push('nē before ' + after)
        if (w.yale === 'nī' && after !== null && /^[，。？！、…」]$/.test(after)) wrong.push('nī before ' + after) } }) }
    T('R5', '呢 is nī (this) before a word and nē (the question / topic particle) at the end of a clause: both readings occur and never the wrong one', seen.ni > 100 && seen.ne > 50 && !wrong.length, { seen, wrong: wrong.slice(0, 4) })
  }
  T('R6', 'the classifier slot {M}: the classifier and its Yale are written (個 go, 張 jēung, a classifier that is not a word of the list such as 把 bá)', (() => { const out = []
    for (const m of data.m) if ([4, 7, 10].some(k => m[k].includes('{M}'))) for (const [id, tag] of wordsByCell.get(m.cell) || []) { if (tag.tier > m.tier || (m.excl && m.excl.has(id))) continue
      const l = render({ m: D.byCell.get(m.cell).find(x => x.id === m[0]), tag }, bank.get(id)); if (!l) { out.push([m[0], tag.word]); continue }
      if (!tag.measure || !tag.measureYale || !l.some(x => x.chinese.includes(tag.measure) && x.pinyin.includes(tag.measureYale))) out.push([m[0], tag.word]) }
    return !out.length && Object.values(data.t).filter(t => t[5] === '把').every(t => t[6] === 'bá') && Object.values(data.t).filter(t => t[5] === '個').every(t => t[6] === 'go') })())
  T('R7', 'no classifier is "-" in the data (a word with no classifier has an empty one; no module line uses {M} for it)', Object.values(data.t).every(t => t[5] !== '-'))

  // ── C ──
  const w1 = learned.find(w => w.chinese === '食'), good = l0[0]
  const P = (mut, w) => lineProblems({ ...good, ...mut }, w || w1, null)
  T('C1', 'a sound line has no problem', P({}).length === 0, P({}))
  T('C2', 'a leftover slot token is found', P({ chinese: good.chinese + '{W}' }).some(x => /slot token/.test(x)) && P({ english: 'Do {E}?' }).some(x => /slot token/.test(x)))
  T('C3', 'a line without the target word is found', lineProblems({ ...good, chinese: '你好。', segments: [{ surface: '你', pinyin: 'néih', english: 'you', type: 'vocab' }, { surface: '好', pinyin: 'hóu', english: 'good', type: 'vocab' }, { surface: '。', pinyin: '', english: '', type: 'punct' }], pinyin: 'néih hóu.' }, w1, null).some(x => /not in the sentence/.test(x)))
  T('C4', 'segments that do not rebuild the sentence are found', P({ segments: good.segments.slice(1) }).some(x => /do not rebuild/.test(x)) && P({ segments: [] }).some(x => /do not rebuild/.test(x)))
  T('C5', 'a missing Yale on a word is found (a segment with no Yale) and so is a Yale that is not Yale (Jyutping, pinyin)',
    P({ segments: good.segments.map((s, i) => i === 1 ? { ...s, pinyin: '' } : s) }).some(x => /Yale missing/.test(x)) && P({ segments: good.segments.map((s, i) => i === 1 ? { ...s, pinyin: 'nei5' } : s) }).some(x => /not Yale/.test(x)) &&
    P({ pinyin: 'nei5 hou2' }).some(x => /sentence Yale/.test(x)) && P({ pinyin: 'nǐ hǎo' }).some(x => /sentence Yale/.test(x)) && P({ pinyin: '' }).some(x => /sentence Yale/.test(x)))
  T('C6', 'a sentence Yale that does not match its words is found (words reordered, a syllable dropped)', P({ pinyin: good.pinyin.split(' ').reverse().join(' ') }).some(x => /does not match its words|target/.test(x)) && P({ pinyin: good.pinyin.replace(/^\S+ /, '') }).some(x => /does not match its words/.test(x)))
  T('C7', 'Latin, Thai or kana text in the Cantonese is found; a missing English or cue; a line with no closing mark', P({ chinese: good.chinese + 'ok' }).length > 0 && P({ chinese: 'こんにちは' + good.chinese }).length > 0 && P({ english: '' }).some(x => /English or cue/.test(x)) && P({ prompt: ' ' }).some(x => /English or cue/.test(x)) &&
    lineProblems({ ...good, chinese: good.chinese.replace(/[。？！]$/, ''), segments: good.segments.slice(0, -1) }, w1, null).some(x => /does not end/.test(x)))
  const seen = new Map([[good.chinese.replace(/[\s，。？！；、]/g, ''), 99999]])
  T('C8', 'a sentence already used for ANOTHER word in the track is found; for the same word it is not', lineProblems(good, w1, seen).some(x => /already used/.test(x)) && !lineProblems(good, w1, new Map([[good.chinese.replace(/[\s，。？！；、]/g, ''), w1.id]])).some(x => /already used/.test(x)))

  // ── G ──
  let calls = 0
  c.geminiGenerate = async () => { calls++; throw new Error('no network (test)') }
  c.ev('geminiRequest = async () => { __modelCalls++; throw new Error("no network (test)") }; var __modelCalls = 0')
  const modelCalls = () => c.ev('__modelCalls')
  const ZM = c.ev('YUE_MODULES'); let seed = 4242; ZM.rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
  const withMod = learned.filter(w => data.t[String(w.id)]).sort((a, b) => a.unlockOrder - b.unlockOrder)
  const targets = withMod.filter(w => w.unlockOrder >= 150).slice(0, 30).map(w => ({ ...w, selectionRole: 'review' }))
  const logs = []
  let res = null, err = null
  try { res = await c.generateCantoneseTrack(targets, learned, () => {}, m => logs.push(m), { cancelled: false }) } catch (e) { err = e }
  const content = res ? res.pairs.filter(p => p.targetId != null) : []
  T('G1', 'a 30-target Cantonese track is written with ZERO model requests: 90 recalls, all from gap-fill modules', !err && calls === 0 && modelCalls() === 0 && content.length === 90 && content.every(p => p._module === true), { err: err && String(err.message).slice(0, 200), calls, n: content.length })
  const byT = new Map(); content.forEach(p => { if (!byT.has(p.targetId)) byT.set(p.targetId, []); byT.get(p.targetId).push(p) })
  T('G2', 'each target\'s three recalls come from ONE module, in order A, B, A, and stay together', [...byT.values()].every(l => l.length === 3 && new Set(l.map(p => p._moduleId)).size === 1 && l.map(p => p.speaker).join('') === 'ABA' && l.map(p => p.recallIndex).join('') === '123') &&
    res.pairs.every((p, i) => i % 3 === 0 ? p.recallIndex === 1 : p.recallIndex === (i % 3) + 1))
  const modIds = [...byT.values()].map(l => l[0]._moduleId)
  T('G3', 'no module is used twice in one track, and no sentence twice', new Set(modIds).size === modIds.length && new Set(content.map(p => p.chinese)).size === 90)
  T('G4', 'every pair carries the shared identity the Player and the finisher read: language yue, targetId, wordId, recallIndex, pairId, thai / phonetic (= the Cantonese and the Yale), segments, spokenPinyin = pinyin (no tone sandhi)',
    content.every(p => p.language === 'yue' && p.isTargetPair === true && p.wordId === p.targetId && p.thai === p.chinese && p.phonetic === p.pinyin && p.spokenPinyin === p.pinyin && p.pairId && Array.isArray(p.segments) && p.segments.length && c.validateYale(p.pinyin).ok &&
      c.ev('assertTrackPairsProvenance')(res.pairs, 'yue').ok), content.slice(0, 1))
  T('G5', 'the log says which module wrote each target and that no request was made', logs.some(l => /YUE_MODULE .*: module .* the three recalls, no request/.test(l)) && logs.some(l => /YUE_MODULES y1 · 2995 gap-fill modules/.test(l)) && logs.some(l => /0 model requests/.test(l)), logs.slice(0, 3))
  const track = c.cantoneseBuildTrack(res, targets, 'daily', '2026-11-16T10:00:00.000Z'), chk = c.cantoneseTrackCheck(track)
  T('G6', 'the finished track record: language yue, mode, 30 keywords with Yale, 90 pairs, module marker, trackContext for yue; the structure check passes (every target 3 recalls, every line sound)',
    track.language === 'yue' && track.trackMode === 'daily' && track.keywords.length === 30 && track.keywords.every(k => k.pinyin && k.wordId != null) && track.pairs.length === 90 && track.moduleTrack.modelRequests === 0 &&
    track.trackContext.language === 'yue' && c.ev('assertTrackContext')(track.trackContext).ok && chk.ok && chk.pairs === 90 && chk.fromModules === 90 && track.generatorVersion === 'yue-modules-v1', { chk, tc: c.ev('assertTrackContext')(track.trackContext) })
  const broken = { ...track, pairs: track.pairs.map((p, i) => i === 5 ? { ...p, pinyin: 'nei5' } : i === 7 ? { ...p, segments: [] } : p).filter((p, i) => i !== 40) }
  const chk2 = c.cantoneseTrackCheck(broken)
  T('G7', 'the structure check of a finished track finds a bad Yale, lost segments and a missing recall', !chk2.ok && chk2.problems.length >= 3 && chk2.problems.some(x => /recalls \(3 needed\)/.test(x)), chk2.problems)
  // a word with no module: the run stops, names it, and says nothing else can write it
  const tNo = { ...learned.find(w => w.chinese === '穿'), selectionRole: 'review' }
  let e2 = null
  try { await c.generateCantoneseTrack([targets[0], tNo], learned, () => {}, () => {}, { cancelled: false }) } catch (e) { e2 = e }
  T('G8', 'a word with no module (穿) makes the run INCOMPLETE and names the word and the reason; nothing is written for it by another path', !!e2 && !!e2.incomplete && e2.incomplete.failures.some(f => f.target === '穿' && /no module can fill/.test(f.reason)) && e2.incomplete.produced === 3 && calls === 0, e2 && e2.message)
  // modules switched off: a plain message, not another language and not a model
  c.yueModulesSetEnabled(false)
  let e3 = null
  try { await c.generateCantoneseTrack(targets.slice(0, 2), learned, () => {}, () => {}, { cancelled: false }) } catch (e) { e3 = e }
  T('G9', 'with the module set switched off the run stops with a plain message (no model is asked, no Mandarin / Thai writer is used)', !!e3 && /built-in lesson modules/.test(e3.message) && calls === 0 && modelCalls() === 0, e3 && e3.message)
  c.yueModulesSetEnabled(true)
  // revision targets (previously learned words): the same writer, 0 NEW
  const rev = c.selectRevisionTargets('yue', learned)
  let r2 = null
  try { c.ev('YUE_MODULES').used.clear(); r2 = await c.generateCantoneseTrack(rev.targets.filter(w => data.t[String(w.id)]).slice(0, 12), learned, () => {}, () => {}, { cancelled: false }) } catch (e) { r2 = { err: e } }
  T('G10', 'Revision uses the same writer: 12 learned words → 36 recalls from modules, no request; the revision track record carries 0 NEW', !r2.err && r2.pairs.length === 36 && modelCalls() === 0 && c.cantoneseBuildTrack(r2, rev.targets.slice(0, 12), 'revision').selectedNewTargetIds.length === 0 && c.cantoneseBuildTrack(r2, rev.targets.slice(0, 12), 'revision').trackMode === 'revision', r2.err && r2.err.message)
  // each new run starts clean: used modules are forgotten, so the same targets can be written again
  let r3 = null; try { r3 = await c.generateCantoneseTrack(targets.slice(0, 5), learned, () => {}, () => {}, { cancelled: false }) } catch (e) { r3 = { err: e } }
  T('G11', 'a second run starts clean (the used-module memory is reset per run)', !r3.err && r3.pairs.length === 15, r3.err && r3.err.message)
  // cancel
  let cancelled = 0; const stop = { cancelled: false }
  let r4 = null; try { r4 = await c.generateCantoneseTrack(targets.slice(0, 6), learned, (d) => { if (d >= 3) stop.cancelled = true }, () => {}, stop) } catch (e) { r4 = { err: e } }
  T('G12', 'cancelling stops the run without an error and without a half track being returned as complete', !r4.err && r4.pairs.length < 18, r4.err ? r4.err.message : r4.pairs.length)
  // a learned word that no module can fill never blocks a Revision track: it is swapped for the next learned word
  {
    const noWord = learned.filter(w => !data.t[String(w.id)]).map(w => w.id)
    const L2 = learned.map((w, i) => noWord.includes(w.id) ? { ...w, dueDate: '2020-01-01', status: 'learning', lastSeen: '2026-10-30', okStreak: 0 } : i < 120 ? w : { ...w, status: 'new', lastSeen: null, introducedAt: null, repCount: 0, dueDate: null, okStreak: 0 })
    const rv = c.selectRevisionTargets('yue', L2)
    const rawRv = c.ev('selectRevisionTrackTargets')({ vocab: c.ev('jazhWordsOnly')(L2), maxTargets: 30, language: 'yue' }).targets
    T('G15', 'Revision never offers a word no module can fill (穿 睜 當 are the most overdue words here, so the plain selector would put them first): they are swapped for the next learned words and the track keeps its 30 words',
      rawRv.some(w => noWord.includes(w.id)) && !rv.targets.some(w => noWord.includes(w.id)) && rv.targets.length === 30 && rv.targets.every(w => data.t[String(w.id)]), { raw: rawRv.map(w => w.chinese).slice(0, 5), got: rv.targets.length })
  }
  // the module-less words are out of every selection path, including a hand-queued word and the 30-target backfill
  {
    const noWord = V0.filter(w => !data.t[String(w.id)])
    const fresh = V0.map(w => ({ ...w })), Q = fresh.map(w => noWord.some(x => x.id === w.id) ? { ...w, queuedNext: '2026-11-16T00:00:00Z' } : w)
    const sel = c.selectTrackTargets({ vocab: c.ev('jazhWordsOnly')(Q), targetCap: 30, recentTrackWordIds: [], lang: 'yue', newSelector: v => c.cantoneseSelectTargets(v, []) })
    const tg = c.jazhDailyTargets(sel.targets, Q, 'yue')
    T('G16', 'a Daily for a new learner holds 30 words, none of 穿 睜 當 (not even hand-queued: they are not eligible targets); every target has a module', tg.length === 30 && !tg.some(w => noWord.some(x => x.id === w.id)) && tg.every(w => data.t[String(w.id)]) && noWord.every(w => !c.ev('jazhTargetEligible')(w, 'yue')) && c.ev('jazhTargetEligible')(V0[1], 'yue'))
  }
  // ── nothing of Mandarin ──
  const body = SRC.slice(SRC.indexOf('function generateCantoneseTrack') - 20, SRC.indexOf('function cantoneseBuildTrack'))
  T('G13', 'the Cantonese writer never calls a Mandarin or model function (no mandarin*, no segmentMandarin, no validateMandarin*, no geminiGenerate / geminiRequest, no tone sandhi)', !/mandarin|Mandarin|segmentMandarin|validateMandarin|gemini|TONE3|v684Zh|zhModule/.test(body.replace(/\/\/[^\n]*/g, '')), body.match(/mandarin\w*|gemini\w*|zhModule\w*/g))
  const lay = SRC.slice(SRC.indexOf('const YUE_MODULES = {'), SRC.indexOf('function generateCantoneseTrack'))
  T('G14', 'the module loader / renderer / checks are Cantonese code only: no Mandarin function, no model transport', !/mandarinSpoken|segmentMandarin|validateMandarin|geminiGenerate|geminiRequest|ZH_MODULES|zhModule/.test(lay.replace(/\/\/[^\n]*/g, '')), lay.match(/mandarin\w*|gemini\w*|ZH_MODULES|zhModule\w*/g))
  console.log((fails ? 'FAIL ' : 'ALL PASS ') + (n - fails) + '/' + n)
  process.exit(fails ? 1 : 0)
})()
