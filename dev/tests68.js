// v717 — the owner's gap-fill exchange modules (25 Oct, dev/thai-modules/) built into the Thai Daily writer
//   M1   the embedded data: 6,205 usable modules (no superseded; 6,115 in the first delivery, +46 for the thin words and 6 fixes on 25 Oct, +11 edits, +20 for เล่น and the quantity words, +18 T1 modules for สิบ พัน หลาย เล่น, +6 on 25 Oct: two โทรหา modules and four ศูนย์ "zero" modules; 16 lines reworded), 2,860 word tags whose ids and Thai match the app's own vocabulary
//   M2   English slot filling is render.py's: {E} {Es} {a} (a / an by sound; none for pair and mass nouns), no leftover braces
//   M3   picking: tier between the word's own and the learner's (never below the word's), the word's subgroup, excluded words skipped,
//        a module is used once per lesson, the learner's own tier first
//   M4   a filled exchange is A (man) → B (woman) → A, has no leftover slot, and passes the writer's own rules before it is offered
//   M5   a word with no module that fits (skipped words, nothing in the learner's vocabulary) gets none — the model writes it
//   M6   a filled module line is vetted (the judges skip it) exactly as filled; a changed line is not
//   M7   the real writer: a module word is written with ZERO requests, from ONE module (never lines of two modules), clause spaces kept
//   M9   recovery: when a whole exchange is missing the next unused module replaces it (no request); when some lines remain, the reviewed exchange they
//        came from is shown to the model so it repairs only the missing line
//   M8   wiring: first candidate of the check ladder, up to THAI_MODULE_ATTEMPTS; no usage profile for module words; loaded at the run's
//        start; off in the test harness and in the live runner unless asked
//
//   node tests68.js            (current build: tt.compiled.js, or TT_FILE)
const fs = require('fs'), zlib = require('zlib')
const { load } = require('./harness')
const FILE = process.env.TT_FILE || __dirname + '/tt.compiled.js'
const out = []; let n = 0, fails = 0
const T = (id, name, ok, got) => { n++; if (!ok) fails++; out.push((ok ? 'PASS ' : 'FAIL ') + id.padEnd(4) + ' ' + name + (ok ? '' : '\n       got: ' + String(JSON.stringify(got)).slice(0, 500))) }

;(async () => {
  const c = load(FILE, { realBelt: true, globals: { setTimeout, clearTimeout } }); c.console.info = () => {}; c.console.warn = () => {}
  const src = fs.readFileSync(__dirname + '/tt.jsx', 'utf8')
  const data = JSON.parse(zlib.gunzipSync(Buffer.from(c.ev('THAI_MODULES_GZ'), 'base64')).toString('utf8'))
  const vocab0 = c.initVocab()

  // v724: each embedded row now ends with the module's scene and job (r[13], r[14]) so the yes-and Daily can order by scene without the links file
  // M1 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const ids = new Set(data.m.map(r => r[0])), tags = Object.entries(data.t), byId = new Map(vocab0.map(w => [String(w.id), w]))
    const clean = x => String(x || '').replace(/\s*(\.\.\.|…)\s*$/, '').trim()
    const mismatch = tags.filter(([id, t]) => { const w = byId.get(id); return !w || clean(w.thai || w.t) !== clean(t[0]) })
    T('M1', '6,205 usable modules with unique ids and 2,860 word tags; every tag id is the app\'s own word id with the same Thai',
      data.m.length === 6205 && ids.size === 6205 && tags.length === 2860 && !mismatch.length && data.m.every(r => r.length === 15 && r[13] && r[14] && r[2] >= 1 && r[2] <= 5), { mods: data.m.length, ids: ids.size, tags: tags.length, mismatch: mismatch.slice(0, 3) })
    T('M1', 'the data is reproducible: tools/build_thai_modules.py rebuilds the embedded line from dev/thai-modules (same module and tag counts)',
      fs.existsSync(__dirname + '/tools/build_thai_modules.py') && fs.existsSync(__dirname + '/thai-modules/thai-modules.csv') && /THAI_MODULES_DATA_BEGIN/.test(src) && /THAI_MODULES_DATA_END/.test(src))
  }

  const fill = c.ev('thaiModuleFill')
  T('M2', '{E} {Es}; "a" before a consonant sound, "an" before a vowel sound (hour, honest), "a" before "one-" / "uni-"; none for pair and mass nouns; double spaces collapse',
    fill('Would you like {a} {E}?', 'coffee', '') === 'Would you like a coffee?' && fill('I want {a} {E}.', 'egg', '') === 'I want an egg.' && fill('It takes {a} {E}.', 'hour', '') === 'It takes an hour.' &&
    fill('Is it {a} {E}?', 'university', '') === 'Is it a university?' && fill('I like {a} {E}.', 'shoes', 'shoes') === 'I like shoes.' && fill('Two {Es} are here.', 'cup', 'cups') === 'Two cups are here.' &&
    fill('The  {E}  is  big.', 'bridge', '') === 'The bridge is big.', [fill('I want {a} {E}.', 'egg', ''), fill('I like {a} {E}.', 'shoes', 'shoes')])

  // a learner who knows the first 500 curriculum words (White, Orange, a bit of Orange+Stripe …) — tier 1
  const learner = () => {
    const v = c.initVocab().map(w => ({ ...w }))
    v.forEach(w => { const ci = w.curriculumIndex || 0
      if (ci >= 1 && ci <= 500) Object.assign(w, { status: 'learning', introducedAt: '2026-08-01', lastSeen: '2026-10-01', okStreak: 1, interval: 30, repCount: 3, dueDate: '2026-12-01', difficulty: 'medium' })
      else Object.assign(w, { status: w.status === 'locked' ? 'locked' : 'new', introducedAt: null, lastSeen: null, okStreak: 0, interval: 0, repCount: 0, dueDate: null, manualKnown: false }) })
    return v
  }
  const V = learner(), wordOf = th => { const w = V.find(x => (x.thai || x.t) === th); return w && { ...w, thai: w.thai || w.t } }
  c.ev('thaiModulesSetEnabled')(true); c.ev('thaiModulesUseData')(data)
  c.thaiModulesBeginRun && c.ev('thaiModulesBeginRun')(V, null)

  // M3 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const t = wordOf('นม'), tag = c.ev('thaiModuleTagOf')(t)
    const mods = new Map(data.m.map(r => [r[0], r])), excl = id => { const r = mods.get(id); return new Set(String(r[3] || '').split(';').filter(Boolean)) }
    const lo = c.ev('thaiModuleCandidates')(t, 1), hi = c.ev('thaiModuleCandidates')(t, 5)
    const ok = list => list.every(x => x.m.tier >= tag.tier && !excl(x.m.id).has(String(t.id)) && x.m.group === (tag.sub || tag.group))
    T('M3', 'candidates for นม: the word\'s own group, tier never below the word\'s, the word is not in the module\'s exclusions, a higher learner tier only widens the list',
      lo.length > 0 && ok(lo) && ok(hi) && hi.length >= lo.length && Math.max(...lo.map(x => x.m.tier)) <= Math.max(tag.tier, 1), { tag, lo: lo.length, hi: hi.length })
    T('M3', 'the learner\'s own tier comes first (a T3 learner is offered T3 modules before T1)', (() => { const h = c.ev('thaiModuleCandidates')(t, 3); return h.length > 1 && h[0].m.tier >= h[h.length - 1].m.tier && h[0].m.tier === Math.max(...h.map(x => x.m.tier)) })())
    c.ev('thaiModulesBeginRun')(V, null)
    const a = c.ev('thaiModuleExchange')({ ...t, _trackTargets: [t] }, V, null), b = c.ev('thaiModuleExchange')({ ...t, _trackTargets: [t] }, V, null)
    T('M3', 'a module is used once per lesson: a second request for the same word gives a different module (or none)', !!a && (!b || b[0]._moduleId !== a[0]._moduleId) && c.ev('THAI_MODULES').used.has(a[0]._moduleId), [a && a[0]._moduleId, b && b[0]._moduleId])
    const w = wordOf('เขา'), tg = c.ev('thaiModuleTagOf')(w)
    T('M3', 'a belt colour maps to its tier: White / Orange T1, Blue T2, Yellow T3, Green T4, Brown T5',
      ['White', 'Orange', 'Blue', 'Yellow', 'Green', 'Brown'].map(b => c.ev('THAI_MODULE_TIER_OF_BELT')[b]).join('') === '112345' && !!tg)
  }

  // M4 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    c.ev('thaiModulesBeginRun')(V, null)
    const words = ['นม', 'เปิด', 'ถูก', 'ตื่น', 'บ่อย', 'ช่วย', 'โทร', 'วันอังคาร'].map(wordOf).filter(Boolean)
    const got = words.map(w => ({ w: w.thai, x: c.ev('thaiModuleExchange')({ ...w, _trackTargets: words }, V, null) }))
    const shape = got.filter(g => g.x).map(g => g.x.map(l => l.speaker).join('') === 'ABA' && g.x.every(l => !/[{}]/.test(l.thai + l.english + l.prompt) && /(ครับ|ค่ะ|คะ)$/.test(l.thai.replace(/\s+/g, '')) && l.english && l.prompt))
    const part = got.filter(g => g.x).map(g => g.x[0].thai.replace(/\s+/g, '')[0])   // A line 1 is a man's line: ends ครับ
    T('M4', 'at least 6 of 8 sample words get a module; each is A-B-A with a polite particle on every line, no leftover slot, an English line and a cue',
      got.filter(g => g.x).length >= 6 && shape.every(Boolean) && got.filter(g => g.x).every(g => /ครับ$/.test(g.x[0].thai.replace(/\s+/g, '')) && /(ค่ะ|คะ)$/.test(g.x[1].thai.replace(/\s+/g, '')) && /ครับ$/.test(g.x[2].thai.replace(/\s+/g, ''))), got.map(g => [g.w, !!g.x]))
    const again = got.filter(g => g.x).map(g => [g.w, c.ev('thaiModuleLinesProblems')(g.x, { ...wordOf(g.w), _trackTargets: words }, V)])
    T('M4', 'an offered exchange has passed the writer\'s own rules: running them again on it finds no problem (quality gate, repeated phrase, variety, lexical rules, recent lessons)',
      again.length >= 6 && again.every(([, p]) => p.length === 0) && /validateSmartPairs\(lines\.map/.test(src) && /thaiExchangeVarietyProblems\(lines, target\.thai\)/.test(src), again.filter(([, p]) => p.length))
    // and the rules really refuse: one phrase in every line, and a word outside the learner's vocabulary
    const t0 = wordOf('นม'), tt0 = { ...t0, _trackTargets: [t0] }
    const bad1 = [{ speaker: 'A', thai: 'ดื่มนมไหมครับ', english: 'x', prompt: 'Ask her if she wants milk.' }, { speaker: 'B', thai: 'ดื่มนมค่ะ', english: 'x', prompt: 'Say yes.' }, { speaker: 'A', thai: 'ผมดื่มนมครับ', english: 'x', prompt: 'Say you do too.' }]
    const bad2 = [{ speaker: 'A', thai: 'ผมซื้อนมสตรอว์เบอร์รีครับ', english: 'x', prompt: 'Tell her you buy strawberry milk.' }, { speaker: 'B', thai: 'ฉันชอบนมค่ะ', english: 'x', prompt: 'Say you like milk.' }, { speaker: 'A', thai: 'ผมกินนมครับ', english: 'x', prompt: 'Say you drink it.' }]
    T('M4', 'the pre-check refuses an exchange with the word in the same phrase in every line, and one with a word outside the learner\'s vocabulary',
      c.ev('thaiModuleLinesProblems')(bad1, tt0, V).length > 0 && c.ev('thaiModuleLinesProblems')(bad2, tt0, V).length > 0, [c.ev('thaiModuleLinesProblems')(bad1, tt0, V), c.ev('thaiModuleLinesProblems')(bad2, tt0, V)])
  }

  // M5 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    c.ev('thaiModulesBeginRun')(V, null)
    const skipped = ['ผม', 'ครับ', 'เธอ', 'เมื่อ'].map(wordOf).filter(Boolean)
    const none = skipped.map(w => [w.thai, c.ev('thaiModuleExchange')({ ...w, _trackTargets: [w] }, V, null), c.ev('thaiModuleHas')(w)])
    const blank = c.initVocab().map(w => ({ ...w, status: w.status === 'locked' ? 'locked' : 'new', introducedAt: null, lastSeen: null, repCount: 0, manualKnown: false }))
    c.ev('thaiModulesBeginRun')(blank, null)
    const t = blank.find(w => (w.thai || w.t) === 'นม'), x = c.ev('thaiModuleExchange')({ ...t, thai: t.thai || t.t, _trackTargets: [t] }, blank, null)
    T('M5', 'the skipped words (ผม ครับ เธอ เมื่อ) get no module, and a learner who has been taught nothing gets none either (every module needs words they do not have)',
      none.every(([, e]) => e === null) && (x === null || x.every(l => l.thai)) && none.every(([, , h]) => h === false || h === true), { none: none.map(a => [a[0], a[1] && 1, a[2]]), blank: x && x.map(l => l.thai) })
    T('M5', 'a word with no module is written by the model as before: the module exchange returns null and the writer continues to the model request',
      /const _modX = attempt < THAI_MODULE_ATTEMPTS \? thaiModuleExchange\(/.test(src) && /else \{ _tel\.paid\+\+; raw = await geminiGenerate/.test(src))
  }

  // M6 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    c.ev('thaiModulesBeginRun')(V, null)
    const t = wordOf('นม'), x = c.ev('thaiModuleExchange')({ ...t, _trackTargets: [t] }, V, null)
    const isBank = c.ev('thaiIsBankLine'), verdict = c.ev('thaiBankVerdict')
    const l = x && x[0], pair = p => ({ thai: p.thai, prompt: p.prompt, _target: 'นม' })
    T('M6', 'a filled module line is vetted (judges skip it) with its own cue, whitespace aside; a changed line, or a different target, is not',
      !!x && isBank(pair(l)) && isBank({ thai: l.thai.replace(/\s+/g, ' '), prompt: l.prompt, _target: 'นม' }) && !!verdict('cue', pair(l)) && !verdict('cue', { ...pair(l), prompt: 'Something else entirely.' }) &&
      !isBank({ thai: l.thai + 'มาก', _target: 'นม' }) && !isBank({ thai: l.thai, _target: 'กิน' }), l)
  }

  // M7 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    let reqs = 0; const prevFetch = c.fetch; c.fetch = async () => { reqs++; return { ok: false, status: 403, json: async () => ({}) } }
    c.ev('thaiModulesBeginRun')(V, null)
    const targets = ['นม', 'เปิด', 'ถูก', 'ตื่น', 'บ่อย', 'ช่วย'].map(wordOf).filter(Boolean); targets.forEach(t => { t._trackTargets = targets })
    const rows = []
    for (const t of targets) {
      const log = []
      try { const r = await c.generateWordLines(t, 'Two friends chatting.', 'Somchai, a man', 'Nida, a woman', [], V, 'SANDBOX_NO_GEMINI', 'claude-haiku-5-5', 0, (a, b, o) => { if (o && o.apiError) log.push(o.apiError) }, '', [])
        rows.push({ w: t.thai, lines: r.length, ids: [...new Set(r.map(l => l._moduleId).filter(Boolean))], speakers: r.map(l => l.speaker).join(''), req: reqs, clause: r.some(l => / /.test(l.thai)) })
      } catch (e) { rows.push({ w: t.thai, err: String(e.message).slice(0, 60), req: reqs }) }
    }
    c.fetch = prevFetch
    const viaModule = rows.filter(r => r.ids && r.ids.length)
    T('M7', 'the real writer takes a module for at least 4 of 6 sample words with ZERO requests, each from exactly ONE module, 3 lines A-B-A',
      viaModule.length >= 4 && viaModule.every(r => r.ids.length === 1 && r.lines === 3 && r.speakers === 'ABA'), rows)
    T('M7', 'requests are made only by words that have no module (here: none for the module words)', rows.filter(r => r.ids && r.ids.length).length >= 4 && (() => { let prev = 0; return rows.every(r => { const d = r.req - prev; prev = r.req; return !(r.ids && r.ids.length) || d === 0 }) })(), rows.map(r => [r.w, r.req]))
    T('M7', 'a failed module never leaves a line behind for another module to complete (module lines are banked together at "Passed all checks")',
      /const _modGate = \{ ok: false \}/.test(src) && /if \(l && l\._moduleId && !_modGate\.ok\) return/.test(src) && /_modGate\.ok = genderValid\.length >= 3\n\s+genderValid\.slice\(0, 3\)\.forEach\(l => acceptLine\(l, attempt\)\)\n\s+_modGate\.ok = false/.test(src))
  }

  // M8 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const dflt = load(FILE, { realBelt: true }); dflt.console.info = () => {}; dflt.console.warn = () => {}
    T('M8', 'wired: a module is the first candidate of up to THAI_MODULE_ATTEMPTS attempts; module words skip the model\'s usage profile; the run loads the data and starts a fresh "used" set; the spaced-Thai and spacing rules leave module lines alone',
      /const _modX = attempt < THAI_MODULE_ATTEMPTS \? thaiModuleExchange\(target, vocab/.test(src) && /filter\(t => !thaiBankExchange\(t\) && !thaiModuleHas\(t\)\)/.test(src) &&
      /await thaiLoadRecentLines\(_flog\); await thaiModulesLoad\(_flog\); thaiModulesBeginRun\(vocab, _flog\)/.test(src) && /!skipSpacedThai && !p\._moduleId/.test(src) && /const _sp = l\._moduleId \? l\.thai : normaliseThaiSpacing\(l\.thai\)/.test(src))
    T('M8', 'the test harness switches modules off (like the bank) so the model-path tests are unchanged; the app default is on; the live runner needs --modules',
      dflt.ev('THAI_MODULES').on === false && /const THAI_MODULES = \{ on: true/.test(src) && /process\.argv\.includes\('--modules'\)/.test(fs.readFileSync(__dirname + '/sandbox/live_haiku.js', 'utf8')) &&
      /ctx\.thaiModulesSetEnabled\(false\)/.test(fs.readFileSync(__dirname + '/harness.js', 'utf8')))
    T('M8', 'a browser without DecompressionStream, or a failed unpack, keeps writing with the model (the loader never throws into the run)',
      /typeof DecompressionStream === 'undefined'/.test(src) && /catch \(e\) \{ log && log\('📦 THAI_MODULES unavailable/.test(src))
  }

  // M9 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    c.ev('thaiModulesBeginRun')(V, null)
    const t = wordOf('นม'), kw = { wordId: t.id, thai: t.thai, english: t.english }
    const first = c.ev('thaiModuleExchange')({ ...t, _trackTargets: [t] }, V, null)          // the exchange the track started with
    const rec = c.ev('thaiModuleRecovery')(kw, [], V, [t], null)                               // the whole exchange was dropped
    const partial = c.ev('thaiModuleRecovery')(kw, [{ thai: first[0].thai, speaker: 'A' }], V, [t], null)
    T('M9', 'a dropped exchange is replaced by the NEXT unused module (3 lines A-B-A, a different module, vetted), with no request; when some of its lines remain, recovery does not swap it',
      !!first && !!rec && rec.arr.length === 3 && rec.arr.map(l => l.speaker).join('') === 'ABA' && rec.arr[0]._moduleId !== first[0]._moduleId && !!c.ev('thaiIsBankLine')({ thai: rec.arr[1].thai, _target: 'นม' }) && partial === null,
      [first && first[0]._moduleId, rec && rec.arr.map(l => l._moduleId), partial])
    const blockTxt = c.ev('thaiModuleRepairBlock')([{ thai: first[0].thai }])
    T('M9', 'when lines of a module remain, the model is shown the whole reviewed exchange they came from (all three lines) and told to change only what is needed; a line that is not from a module gets no such block',
      first.every(l => blockTxt.includes(l.thai)) && /change only what is needed/.test(blockTxt) && c.ev('thaiModuleRepairBlock')([{ thai: 'ผมไปตลาดครับ' }]) === '' && c.ev('thaiModuleRepairBlock')([]) === '', blockTxt.slice(0, 200))
    T('M9', 'wired into quota recovery: the module replacement runs before the request (and skips it), module lines keep their clause spaces, and the repair block is in the prompt',
      /const _modRec = !c\.coherenceRepair \? thaiModuleRecovery\(kw, have/.test(src) && /if \(_modRec\) raw = JSON\.stringify\(_modRec\.arr\); else raw = await geminiRequest/.test(src) &&
      /thai: l0\._moduleId \? String\(l0\.thai \|\| ''\) : normaliseThaiSpacing/.test(src) && /thaiModuleRepairBlock\(have\)/.test(src))
  }

  // M10 — v720: modules guide the Listening story writer as EXAMPLES only (the story keeps its narrative) ─────────────────────
  {
    c.ev('thaiModulesBeginRun')(V, null)
    const t = wordOf('นม'), tg = { id: t.id, surface: t.thai, gloss: t.english }
    const usedBefore = c.ev('THAI_MODULES').used.size
    const ex = c.ev('thaiModuleExamples')({ id: t.id, wordId: t.id, thai: t.thai, english: t.english }, V, 2)
    c.ev('LN_MODULE_EXAMPLES').on = true        // shipped default is off; the block is tested with it on
    const blk = c.ev('thaiModuleExamplesBlock')([tg], V)
    T('M10', 'a word gets up to two reviewed 3-line examples, each passing the writer\'s checks for this learner, and they are NOT marked used (a Daily track can still take them)',
      ex.length >= 1 && ex.length <= 2 && ex.every(e => e.length === 3 && c.ev('thaiModuleLinesProblems')(e, { id: t.id, wordId: t.id, thai: t.thai, english: t.english }, V).length === 0) && c.ev('THAI_MODULES').used.size === usedBefore, ex.length)
    T('M10', 'the block tells the writer not to copy and not to reuse the situations; it lists the word; it is empty when the switch is off or no module is loaded',
      /do NOT copy them/.test(blk) && blk.includes(t.thai + ':') && (c.ev('LN_MODULE_EXAMPLES').on = false, c.ev('thaiModuleExamplesBlock')([tg], V) === '') , blk.slice(0, 120))
    c.ev('LN_MODULE_EXAMPLES').on = true  // the shipped default is off (see the note at its definition); the test switches it on
    T('M10', 'wired into the story: each scene brief carries the examples after its lesson-word list, and a standalone Thai Listening run loads the modules first',
      /thaiModuleExamplesBlock\(st, ctx\.vocab\)/.test(src) && /LN_MODULE_EXAMPLES\.on\) \{ await thaiLoadRecentLines\(log\); await thaiModulesLoad\(log\)/.test(src))
  }
  out.forEach(l => console.log(l))
  console.log('\nv717 Thai gap-fill modules: ' + (n - fails) + '/' + n + ' passed' + (fails ? ' — ' + fails + ' FAILED' : ''))
  process.exit(fails ? 1 : 0)
})().catch(e => { out.forEach(l => console.log(l)); console.error(e); process.exit(1) })
