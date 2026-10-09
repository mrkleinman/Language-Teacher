// v649 — GLOBAL TRACK INTEGRITY: the §30 regression matrix A–S, run for TH, JA and ZH through
// the SAME shared core (finaliseMainTrack / buildListeningByAnchors) with each language's real
// adapter. The model is simulated at the Gemini boundary; every gate, validator, recovery,
// QC and metadata stage is the app's own code.
const { load } = require('./harness')
const results = {}
let fails = 0
const out = []
const T = (lang, id, name, pass, detail) => {
  if (!pass) fails++
  results[lang] = results[lang] || { pass: 0, fail: 0 }
  results[lang][pass ? 'pass' : 'fail']++
  out.push((pass ? 'PASS ' : 'FAIL ') + lang.toUpperCase() + ' ' + id.padEnd(3) + name + (detail !== undefined && !pass ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 900) : ''))
}
const LANG = process.argv[2] ? process.argv[2].split(',') : ['th', 'ja', 'zh']

// ── per-language fixtures: vocabulary, the 30 targets, sentence frames ──────────────────
const FR = {
  th: { gen: [['A', 'ผมชอบ{}มากครับ', 'I really like the {e}.'], ['B', 'ฉันชอบ{}ค่ะ', 'I like the {e}.'], ['A', '{}ดีมากครับ', 'The {e} is very good.']],
        rec: [['B', '{}อยู่ที่ไหนคะ', 'Where is the {e}?'], ['A', 'ผมมี{}ครับ', 'I have a {e}.'], ['B', 'ฉันไม่มี{}ค่ะ', 'I do not have a {e}.'], ['A', 'ผมอยากได้{}ครับ', 'I would like a {e}.'], ['B', '{}สวยมากค่ะ', 'The {e} is very beautiful.'], ['A', '{}ใหญ่มากครับ', 'The {e} is very big.']] },
  ja: { gen: [[['それ', 'は', 'T', 'よ', '。'], 'I think that one is {e}, you know.'], [['T', 'が', 'いい', 'ね', '。'], 'I think {e} would be nice, right?'], [['今', 'T', 'よ', '。'], 'Right now it is {e}, you know.']],
        rec: [[['それ', 'が', 'T', 'ね', '。'], 'So that one is {e}, right?'], [['今', 'は', 'T', 'か', '？'], 'Is it {e} right now?'], [['T', 'は', 'いい', 'よ', '。'], 'Honestly {e} is good, you know.'], [['T', 'か', '？'], 'Wait, is it really {e}?']] },
  zh: { gen: [['我喜欢{}。', 'I like {e}.'], ['{}很好。', '{E} is very good.'], ['你有{}吗？', 'Do you have {e}?']],
        rec: [['我有{}。', 'I have {e}.'], ['我在看{}。', 'I am looking at {e}.'], ['我要{}。', 'I need {e}.'], ['我想{}。', 'I want {e}.'], ['你{}什么？', 'What do you {e}?'], ['我不{}。', 'I do not {e}.'], ['我很{}。', 'I am very {e}.'], ['你喜欢{}吗？', 'Do you like {e}?']] },
}
const gl = t => String(t.english || '').split(/[,;/(]/)[0].replace(/^to\s+/, '').trim()
const fillE = (tpl, t) => tpl.replace('{e}', gl(t)).replace('{E}', gl(t).charAt(0).toUpperCase() + gl(t).slice(1))
const TH_IDS = [63, 64, 79, 80, 81, 82, 83, 84, 85, 86, 94, 96, 102, 106, 109, 110, 113, 114, 116, 117, 122, 123, 124, 131, 134, 135, 136, 139, 140, 91]
const FIELD = { th: 'thai', ja: 'japanese', zh: 'chinese' }
const JAG = { 'です': ['です', 'desu', 'is'], 'か': ['か', 'ka', '?'], 'が': ['が', 'ga', 'SUBJ'], 'は': ['は', 'wa', 'TOP'], 'ね': ['ね', 'ne', 'right'], 'よ': ['よ', 'yo', '!'] }

function setup(lang) {
  const c = load(process.env.TT_FILE || 'tt.compiled.js')
  const vocab = lang === 'th' ? c.initVocab() : lang === 'ja' ? c.initJapaneseVocab() : c.initMandarinVocab()
  vocab.forEach(w => { if (lang !== 'th' || w.status !== 'locked') { w.status = w.status === 'locked' ? 'learning' : (w.status === 'new' ? 'learning' : w.status); w.lastSeen = '2026-09-20'; w.introducedAt = '2026-09-01'; w.repCount = 3 } })
  const pick = lang === 'th' ? TH_IDS.map(id => vocab.find(w => w.id === id))
    : lang === 'ja' ? vocab.filter(w => w.id <= 80 && ![31, 32].includes(w.id) && !['それ', '今', 'いい'].includes(w.japanese) && !/[\/｜|]/.test((w.reading || '') + (w.romaji || ''))).slice(0, 30)
    : vocab.filter(w => w.id >= 30 && !['我', '你', '喜欢', '很', '好', '有', '想', '什么', '不', '吗', '很好', '跟'].includes(w.chinese)).slice(0, 30)
  const zhInv = lang === 'zh' ? c.mandarinLearnerInventory(vocab, pick) : null
  const zhLex = zhInv ? new Map((zhInv.lexicon || []).map(x => [x.w, x])) : null
  return { c, vocab, targets: pick, zhLex }
}
function zhCand(S, text, t) {
  const segs = []; let i = 0
  while (i < text.length) {
    if ('。？！，'.includes(text[i])) { i++; continue }
    let hit = null; for (let L = 4; L >= 1; L--) { const w = text.slice(i, i + L); if (S.zhLex.has(w)) { hit = S.zhLex.get(w); break } }
    if (!hit) return null
    segs.push({ surface: hit.w, pinyin: hit.p, english: hit.e }); i += hit.w.length
  }
  return { chinese: text, pinyin: segs.map(s => s.pinyin).join(' ') + (/？$/.test(text) ? '?' : '.'), english: '', prompt: '', segments: segs }
}
function jaCand(S, fr, t) {
  let jp = '', rd = '', rm = []; const segs = []
  for (const x of fr) {
    if (x === 'T') { jp += t.japanese; rd += t.reading || t.japanese; rm.push(t.romaji); segs.push({ surface: t.japanese, reading: t.reading, romaji: t.romaji, english: t.english, lemma: t.japanese, type: 'content' }) }
    else if (x === '。' || x === '？') { jp += x; rd += x; rm[rm.length - 1] += x === '。' ? '.' : '?' }
    else if (JAG[x]) { jp += x; rd += JAG[x][0]; rm.push(JAG[x][1]); segs.push({ surface: x, reading: JAG[x][0], romaji: JAG[x][1], english: JAG[x][2], lemma: x, type: 'grammar' }) }
    else { const w = S.vocab.find(v => v.japanese === x); jp += x; rd += w.reading; rm.push(w.romaji); segs.push({ surface: x, reading: w.reading, romaji: w.romaji, english: w.english, lemma: x, type: 'content' }) }
  }
  return { japanese: jp, reading: rd, romaji: rm.join(' '), english: '', prompt: '', segments: segs }
}
// a sentence for target t from frame k of set 'gen' | 'rec'
function sentence(S, lang, t, set, k) {
  const f = FR[lang][set][k]
  if (lang === 'th') { const sp = f[0], en = fillE(f[2], t); return { speaker: sp, thai: f[1].replace('{}', t.thai), english: en, prompt: (sp === 'A' ? 'He says: ' : 'She says: ') + en.replace(/^I /, (sp === 'A' ? 'he ' : 'she ')).replace(/\.$/, '') } }
  const en = fillE(f[1], t), sp = k % 2 ? 'B' : 'A'
  const base = lang === 'ja' ? jaCand(S, f[0], t) : zhCand(S, f[0].replace('{}', t.chinese), t)
  return { speaker: sp, ...base, english: en, prompt: (sp === 'A' ? 'He' : 'She') + (/\?$/.test(en) ? ' asks: ' : ' remarks: ') + en.replace(/[.?]$/, '').toLowerCase() }
}
function kwOf(lang, t, isNew) {
  const base = { wordId: t.id, english: t.english, rating: null, isNew: !!isNew, isUnseen: !!isNew }
  if (lang === 'th') return { ...base, thai: t.thai, phonetic: t.phonetic || '' }
  if (lang === 'ja') return { ...base, japanese: t.japanese, reading: t.reading, romaji: t.romaji, thai: t.japanese, phonetic: t.romaji }
  return { ...base, chinese: t.chinese, pinyin: t.pinyin, thai: t.chinese, phonetic: t.pinyin }
}
function targetPair(lang, s, t, k) {
  const p = { ...s, targetId: t.id, wordId: t.id, recallIndex: k + 1, _source: 'gemini-check-1:conv', language: lang }
  if (lang === 'th') return { ...p, pairType: 'content', _target: t.thai, recallGroupId: 'rg-' + t.id, _semanticState: 'VERIFIED', _semNat: 5, _semCue: 5, words: [], phonetic: '' }
  if (lang === 'ja') return { ...p, _target: t.japanese, phonetic: s.romaji }
  return { ...p, _target: t.chinese, thai: s.chinese, phonetic: s.pinyin }
}
function framing(lang, sp, k) {
  if (lang === 'th') return { pairType: 'framing', speaker: sp, thai: sp === 'A' ? 'สวัสดีครับ' : 'สวัสดีค่ะ', english: 'Hello.', prompt: 'greeting', _semanticState: 'VERIFIED', _semNat: 5, _semCue: 'n/a', _pairKey: 'f' + k }
  if (lang === 'ja') return { _framing: true, speaker: sp, japanese: 'こんにちは。', reading: 'こんにちは。', romaji: 'konnichiwa.', english: 'Hello.', prompt: 'greet', segments: [] }
  return { _framing: true, speaker: sp, chinese: '你好。', thai: '你好。', pinyin: 'nǐ hǎo.', english: 'Hello.', prompt: 'greet', segments: [] }
}
function bridge(lang, t) {
  if (lang === 'th') return { pairType: 'bridge', speaker: 'B', thai: 'จริงเหรอคะ', english: 'Really?', prompt: 'She asks if that is true', supportsTargetId: t.id, _semanticState: 'VERIFIED', _semNat: 5, _semCue: 5, targetId: null, wordId: null }
  if (lang === 'ja') return { pairType: 'bridge', speaker: 'B', japanese: '本当？', reading: 'ほんとう？', romaji: 'hontou?', english: 'Really?', prompt: 'Ask if that is true', supportsTargetId: t.id, segments: [] }
  return { pairType: 'bridge', speaker: 'B', chinese: '真的吗？', thai: '真的吗？', pinyin: 'zhēn de ma?', english: 'Really?', prompt: 'Ask if that is true', supportsTargetId: t.id, segments: [] }
}
// a Main Track: 2 framing + 3 TARGET PAIRS per target (+ optional bridges); per-target overrides
function makeTrack(S, lang, o = {}) {
  const pairs = [framing(lang, 'A', 0), framing(lang, 'B', 1)]
  S.targets.forEach((t, ti) => {
    const n = o.counts && o.counts[t.id] != null ? o.counts[t.id] : 3
    for (let k = 0; k < n; k++) pairs.push(targetPair(lang, sentence(S, lang, t, 'gen', k), t, k))
    for (let b = 0; b < (o.bridges && o.bridges[t.id] || (o.bridgeEach ? 1 : 0)); b++) pairs.push(bridge(lang, t))
  })
  const newIds = new Set(o.newIds || [])
  const track = { createdAt: '2026-09-29T0' + lang.length + ':00:00.000Z-' + lang + (o.tag || ''), date: '29 Sept 2026', mode: 'daily', trackMode: 'daily', language: lang,
    pairs, keywords: S.targets.map(t => kwOf(lang, t, newIds.has(t.id))), rated: false }
  if (lang === 'ja') track.speechStyle = 'natural'
  track.selectedTargetIds = track.keywords.map(k => k.wordId)
  return track
}
// ── simulated Gemini (one responder for all three languages) ────────────────────────────
function mock(S, lang, opt = {}) {
  const st = { calls: [], rec: {}, listenRec: {}, stages: [] }
  const byField = new Map(S.targets.map(t => [lang === 'th' ? t.thai : lang === 'ja' ? t.japanese : t.chinese, t]))
  S.c.mockGeminiGenerate = S._mockFn = async (k, m, msgs, max, o) => {
    const q = msgs[msgs.length - 1].content, sys = msgs.length > 1 ? msgs[0].content : ''
    st.calls.push({ stage: o && o.stage, model: m, q: q.slice(0, 80) })
    if (opt.down) throw new Error('Failed to fetch')
    if (/QUOTA RECOVERY — Thai/.test(q)) {
      const t = byField.get(q.match(/TARGET WORD: "([^"]+)"/)[1]); st.rec[t.id] = (st.rec[t.id] || 0) + 1
      if (opt.noRecovery) return '[]'
      return JSON.stringify(FR.th.rec.map((_, k) => sentence(S, 'th', t, 'rec', k)))
    }
    const jaT = lang === 'ja' && /(?:TARGET WORDS \(each needs exactly 3 sentences\):\n|JAPANESE TARGET: )★ ([^\s\[=]+)/.exec(q)
    const zhT = lang === 'zh' && /TARGET: ★ (\S+) \[/.exec(q)
    if (jaT || zhT) {
      const t = byField.get((jaT || zhT)[1]); if (!t) return '[]'
      if (opt.noRecovery) { st.rec[t.id] = (st.rec[t.id] || 0) + 1; return 'no' }
      // v653: a Japanese target-group request asks for EXACTLY k recalls in one reply
      const k = lang === 'ja' ? +((/Return EXACTLY (\d) recall/.exec(q) || [])[1] || 1) : 1
      const out = []
      for (let j = 0; j < k; j++) { const n = st.rec[t.id] = (st.rec[t.id] || 0) + 1; out.push(sentence(S, lang, t, 'rec', (n - 1) % FR[lang].rec.length)) }
      return JSON.stringify(lang === 'ja' ? (k > 1 || /TARGET GROUP|REPLACEMENT ONLY/.test(q) ? { recalls: out } : out) : out[0])
    }
    if (/Evaluate this .*group/.test(q)) return JSON.stringify({ action: 'clean', reason: 'ok' })
    if (/Judge the WHOLE listening track/.test(q)) {
      const scenes = [...q.matchAll(/^Scene (\d+)/gm)].map(x => +x[1])
      return JSON.stringify({ scenes: scenes.map(n => ({ scene: n, pass: !opt.cohFail, breakAfterLine: opt.cohFail ? 1 : null, reason: opt.cohFail ? 'topic jumps between unrelated sentences' : 'ok' })), overall: opt.cohFail ? 2 : 5, reason: 'mock' })
    }
    // v656 — FRESH Listening conversation (one batched call) and its local repair. opt.ln = { missing:[ids],
    // max4:true, oneSpeaker:true, singletons:true, dup:true, merged:true, noRepair:true, unrelated:true }
    const lnTurn = (t, sp, extra) => {
      const s0 = lang === 'th' ? sentence(S, 'th', t, 'gen', sp === 'A' ? 0 : 1) : sentence(S, lang, t, 'gen', sp === 'A' ? 0 : 1)
      const text = lang === 'th' ? s0.thai : lang === 'ja' ? s0.japanese : s0.chinese
      return { speaker: sp, text: text + (extra || ''), english: s0.english, reading: s0.reading || null, romaji: s0.romaji || null, pinyin: s0.pinyin || null, intendedTargetIds: [t.id] }
    }
    // v662 — scene-by-scene composition: one call per planned scene, its REQUIRED targets listed as T-rows.
    // opt.ln adds: missingOnce:[ids] (omitted only the first time), overshoot:n (first n scene calls far too long),
    // badJsonScene:n / badJsonRepair:n (first n replies malformed)
    if (/Write SCENE (LS\d+) .* LISTENING conversation/.test(q)) {
      st.lnScene = (st.lnScene || 0) + 1
      const ln = opt.ln || {}
      if (ln.badJsonScene && st.lnScene <= ln.badJsonScene) return '{"sceneId":"LS1","turns":[{"speaker":"A","text":"'
      const ids = [...q.matchAll(/^T(\d+) \| /gm)].map(x => +x[1])
      st.missedOnce = st.missedOnce || new Set()
      const keep = ids.filter(id => { if ((ln.missing || []).includes(id)) return false; if ((ln.missingOnce || []).includes(id) && !st.missedOnce.has(id)) { st.missedOnce.add(id); return false } return true })
      const ts = keep.map(id => S.vocab.find(w => w.id === id)).filter(Boolean)
      let turns = ts.map((t, k) => lnTurn(t, ln.oneSpeaker ? 'A' : (k % 2 ? 'B' : 'A')))
      // v669: persist:true injects the defect into EVERY candidate of scene LS1 (first call, regeneration and re-plan);
      // persist:'all' into every candidate of every scene —
      // the "cannot be fixed" case now that a re-planned clean candidate is a VALIDATED scene
      const first = ln.persist === 'all' ? true : ln.persist ? /Write SCENE LS1 /.test(q) : st.lnScene === 1 + (ln.badJsonScene || 0)
      if (ln.max4 && first && turns.length >= 4) { const four = turns.slice(0, 4); turns = [{ ...four[0], text: four.map(x => x.text).join(''), intendedTargetIds: four.flatMap(x => x.intendedTargetIds) }].concat(turns.slice(4)) }
      if (ln.dup && first && turns.length >= 3) turns.push({ ...turns[2] })
      if (ln.merged && first && turns.length >= 2) turns[1] = lang === 'th' ? { ...turns[1], text: turns[0].text + turns[1].text } : { ...turns[1], text: turns[1].text.replace(/[。？]$/, '？') + (lang === 'ja' ? 'うん、いいよ。' : '好，可以。'), english: turns[1].english + '? Yeah, okay.' }
      // v668: the scene path's version of "one line per scene" — the scene call returns a single turn
      // singletons:'once' — a model that writes a 1-line scene but OBEYS the regeneration instruction (v673 phase regeneration)
      if (ln.singletons && (ln.singletons !== 'once' || !/WAS REJECTED BEFORE COMMIT/.test(q))) turns = turns.slice(0, 1)
      if (ln.overshoot && st.lnScene <= ln.overshoot) for (let k = 0; k < 16; k++) turns.push({ ...turns[k % Math.max(1, turns.length)], text: turns[k % Math.max(1, turns.length)].text })
      return JSON.stringify({ sceneId: (q.match(/Write SCENE (LS\d+)/) || [])[1], setting: 'market', turns })
    }
    if (/Write ONE natural .* LISTENING conversation/.test(q)) {
      st.lnCompose = (st.lnCompose || 0) + 1
      const ln = opt.ln || {}
      const ids = [...q.matchAll(/^T(\d+) \| /gm)].map(x => +x[1])
      const ts = ids.map(id => S.vocab.find(w => w.id === id)).filter(Boolean)
      let turns = ts.filter(t => !(ln.missing || []).includes(t.id)).map((t, k) => lnTurn(t, ln.oneSpeaker ? 'A' : (k % 2 ? 'B' : 'A')))
      if (ln.max4 && turns.length > 4) { const four = turns.slice(0, 4); turns = [{ ...four[0], text: four.map(x => x.text).join(lang === 'th' ? '' : ''), intendedTargetIds: four.flatMap(x => x.intendedTargetIds) }].concat(turns.slice(4)) }
      if (ln.dup) turns.push({ ...turns[2] })
      if (ln.merged && lang !== 'th') turns[1] = { ...turns[1], text: turns[1].text.replace(/[。？]$/, '？') + (lang === 'ja' ? 'うん、いいよ。' : '好，可以。'), english: turns[1].english + '? Yeah, okay.' }
      if (ln.merged && lang === 'th') turns[1] = { ...turns[1], text: turns[0].text + turns[1].text }
      const scenes = ln.singletons ? turns.map((t, k) => ({ sceneId: 'L' + (k + 1), setting: 'x', turns: [t] }))
        : [0, 1, 2].map(k => ({ sceneId: 'L' + (k + 1), setting: 'market', turns: turns.slice(Math.floor(k * turns.length / 3), Math.floor((k + 1) * turns.length / 3)) })).filter(sc => sc.turns.length)
      return JSON.stringify({ scenes })
    }
    // v663 — ATOMIC REPAIR: one isolated patch per issue, built from the suite's own verified sentence frames for the
    // protected targets (+ the word to place). opt.ln adds: atomicDropProtected:n (the first n patches lose a protected
    // target), atomicBadIssue:'i2' (that issue's patch uses an unauthorised word), atomicNoop (patches unchanged text)
    if (/ATOMIC REPAIR of .* LISTENING lines/.test(q)) {
      st.lnRepair = (st.lnRepair || 0) + 1; st.lnAtomic = (st.lnAtomic || 0) + 1
      const ln = opt.ln || {}
      if (ln.badJsonRepair && st.lnRepair <= ln.badJsonRepair) return '{"repairs":[{"issueId":"i1","lines":[{"lineId":'
      if (ln.noRepair) return JSON.stringify({ repairs: [] })
      const field = lang === 'th' ? 'thai' : lang === 'ja' ? 'japanese' : 'chinese'
      const bySurf = x => S.targets.find(t => t[field] === x) || S.vocab.find(t => t[field] === x)
      st.atomicDrops = st.atomicDrops || 0; st.frameK = st.frameK || 0
      const repairs = q.split(/\n(?=\[i\d+\] )/).filter(b => /^\[i\d+\] /.test(b)).map(b => {
        const issueId = b.match(/^\[(i\d+)\]/)[1]
        const scope = /lines ((?:L\d+\+?)+)/.test(b) ? b.match(/lines ((?:L\d+\+?)+)/)[1].split('+') : [b.match(/line (L\d+) only/)[1]]
        const prot = ((b.match(/PROTECTED lesson words \(must stay in the new text\): (.*)/) || [])[1] || '').split(/,\s*/).filter(x => x && x !== '(none)').map(bySurf).filter(Boolean)
        const place = (b.match(/MUST NOW ALSO CONTAIN the lesson word (\S+)/) || [])[1]
        let words = prot.slice(); if (place && bySurf(place)) words.push(bySurf(place))
        if (ln.atomicDropProtected && st.atomicDrops < ln.atomicDropProtected && prot.length) { st.atomicDrops++; words = words.filter(w => w !== prot[0]) }
        const spk = id => ((b.match(new RegExp(id + ' ([AB]):')) || [])[1]) || 'A'
        const per = scope.map(() => [])
        words.forEach((w, k) => per[k % scope.length].push(w))
        const lines = scope.map((id, k) => {
          const sp = spk(id)
          let text = per[k].map(w => { const frames = FR[lang].rec.map((f, j) => j).filter(j => lang !== 'th' || FR.th.rec[j][0] === sp); const j = frames[(st.frameK++) % frames.length]; const s0 = sentence(S, lang, w, 'rec', j); return lang === 'th' ? s0.thai : lang === 'ja' ? s0.japanese : s0.chinese }).join(lang === 'th' ? ' ' : '')
          if (!text) text = lang === 'th' ? (sp === 'A' ? 'ดีมากครับ' : 'ดีค่ะ') : lang === 'ja' ? 'そうね。' : '好。'
          if (ln.atomicNoop) text = ((b.match(new RegExp(id + ' [AB]: (.*?) \\(')) || [])[1]) || text
          if (ln.atomicBadIssue === issueId) text = text + (lang === 'th' ? 'พิเศษ' : lang === 'ja' ? '特別' : '特别')
          // v665: atomicLong:'i1' — that issue's patch is valid vocabulary but far too long for the learner's belt
          if (ln.atomicLong === issueId) { const h = lang === 'th' ? text.replace(/(ครับ|ค่ะ|คะ)$/, '') : text.replace(/[。？]$/, '') + '，'; text = h + h + h + h + text }   // ~5× — above any low-belt hardMax
          return { lineId: id, text, english: 'Mock repair.' }
        })
        return { issueId, lines }
      })
      return JSON.stringify({ repairs })
    }
    if (/REVISE this .* LISTENING conversation locally|REPAIR SCENE \S+ of a .* LISTENING conversation/.test(q)) {
      st.lnRepair = (st.lnRepair || 0) + 1
      const ln = opt.ln || {}
      if (ln.badJsonRepair && st.lnRepair <= ln.badJsonRepair) return '{"edits":[{"op":"replace","line":'
      if (ln.noRepair) return JSON.stringify({ edits: [] })
      const nLines = [...q.matchAll(/^(\d+)\. (A|B): /gm)].map(x => ({ n: +x[1], sp: x[2] }))
      const last = nLines.length ? nLines[nLines.length - 1] : { n: 1, sp: 'A' }
      const edits = []
      ;[...q.matchAll(/^- MISSING TARGET T(\d+)/gm)].forEach((m, k) => { const t = S.vocab.find(w => w.id === +m[1]); if (t) edits.push({ op: 'insert_after', line: last.n, turns: [lnTurn(t, (last.sp === 'A') === (k % 2 === 0) ? 'B' : 'A')] }) })
      ;[...q.matchAll(/^- line (\d+) has \d+ current targets \(([\d,]+)\)/gm)].forEach(m => {
        const tids = m[2].split(',').map(Number).map(id => S.vocab.find(w => w.id === id)).filter(Boolean)
        edits.push({ op: 'replace', line: +m[1], turns: tids.map((t, k) => lnTurn(t, k % 2 ? 'B' : 'A')) })
      })
      ;[...q.matchAll(/^- line (\d+) (?:repeats|near-repeats) line \d+/gm)].forEach(m => edits.push({ op: 'delete', line: +m[1] }))
      ;[...q.matchAll(/^- line (\d+): (?:question and its answer|both a male)/gm)].forEach(m => {
        const row = (q.match(new RegExp('^' + m[1] + '\\. [AB]: .*?   · targets: (.*)$', 'm')) || [])[1] || ''
        const tids = row.split(/,\s*/).map(x => (S.targets.find(t => (lang === 'th' ? t.thai : lang === 'ja' ? t.japanese : t.chinese) === x) || S.vocab.find(t => (lang === 'th' ? t.thai : lang === 'ja' ? t.japanese : t.chinese) === x))).filter(Boolean)
        edits.push({ op: 'replace', line: +m[1], turns: tids.map((t, k) => lnTurn(t, k % 2 ? 'B' : 'A')) })
      })
      // an UNNATURAL line is rewritten with the same targets (a different sentence frame)
      ;[...q.matchAll(/^- line (\d+): UNNATURAL/gm)].forEach(m => {
        const row = q.match(new RegExp('^' + m[1] + '\\. ([AB]): .*?(?:   · targets: (.*))?$', 'm')) || []
        const tids = String(row[2] || '').split(/,\s*/).map(x => (S.targets.find(t => (lang === 'th' ? t.thai : lang === 'ja' ? t.japanese : t.chinese) === x) || S.vocab.find(t => (lang === 'th' ? t.thai : lang === 'ja' ? t.japanese : t.chinese) === x))).filter(Boolean)
        const alt = tids.map(t => { const s0 = sentence(S, lang, t, 'rec', 0); return { speaker: (lang === 'th' && s0.speaker) || row[1] || 'A', text: lang === 'th' ? s0.thai : lang === 'ja' ? s0.japanese : s0.chinese, english: s0.english, reading: s0.reading || null, romaji: s0.romaji || null, pinyin: s0.pinyin || null } })
        if (alt.length) edits.push({ op: 'replace', line: +m[1], turns: alt })
      })
      if (/merge_scenes/.test(q) && /- .*(has 1 turn|scenes for)/.test(q)) edits.push({ op: 'merge_scenes', line: 0 })
      return JSON.stringify({ edits })
    }
    if (/Plan a language lesson conversation/.test(q)) {
      const ids = [...q.matchAll(/^(\d+): /gm)].map(x => +x[1]); const half = Math.ceil(ids.length / 2)
      st.plan = (st.plan || 0) + 1
      return JSON.stringify({ scenes: [{ purpose: 'planning the shopping', targetIds: ids.slice(0, half) }, { purpose: 'back at home', targetIds: ids.slice(half) }] })
    }
    if (/A language lesson is (a sequence of short exchanges|GROUPED PRACTICE)/.test(q)) {
      const secs = [...q.matchAll(/^Section (\d+)/gm)].map(x => +x[1])
      st.coh = (st.coh || 0) + 1
      // opt.incoherentMain: section 1 fails (score 1) until opt.incoherentMain.fixAfter audits have run
      const inc = opt.incoherentMain && st.coh <= (opt.incoherentMain.fixAfter != null ? opt.incoherentMain.fixAfter : 99)
      const lines1 = inc ? [...(q.split(/\n\nSection 2/)[0]).matchAll(/L(\d+) /g)].map(x => +x[1]).slice(0, 2) : []
      return JSON.stringify({ sections: secs.map(n => inc && n === 1 ? { section: n, score: 1, coherent: false, offTopicLines: lines1, reason: 'random topic jumps' } : { section: n, score: 4, coherent: true, offTopicLines: [], reason: 'ok' }), overall: inc ? 1 : 4, reason: inc ? 'jumps' : 'ok' })
    }
    if (/ONE line of .* listening practice/.test(q)) {
      const surf = (q.match(/contains (?:the exact word )?"([^"]+)"/) || [])[1]; const t = byField.get(surf)
      st.listenRec[surf] = (st.listenRec[surf] || 0) + 1
      if (!t || (opt.noListenRecovery || []).includes(t.id)) return 'no idea'
      const s = sentence(S, lang, t, 'rec', 1)
      return JSON.stringify(lang === 'th' ? { thai: s.thai, phonetic: '', english: s.english, prompt: s.prompt } : lang === 'ja' ? { japanese: s.japanese, reading: s.reading, romaji: s.romaji, english: s.english, prompt: s.prompt } : { chinese: s.chinese, pinyin: s.pinyin, english: s.english, prompt: s.prompt })
    }
    if (/Segment each Thai sentence/.test(q)) {
      const inp = JSON.parse((q.match(/Input: (\[.*\])\n/) || [])[1] || '[]')
      return JSON.stringify(inp.map(x => ({ id: x.id, words: [{ p: x.thai, e: 'sentence', ph: '' }] })))
    }
    const items = [...q.matchAll(/^(\d+)\. /gm)].map(x => +x[1])
    if (items.length) {
      const lines = q.split(/\n(?=\d+\. )/)
      return JSON.stringify(items.map(i => { const blk = lines.find(l => l.startsWith(i + '. ')) || ''
        // the judge rejects the LINE ITSELF — a reply is not unnatural merely because its previous-line context is
        const own = blk.split(/\n\s*Previous line in the conversation:/)[0]
        const bad = (opt.reject || []).some(r => own.includes(r)); return { i, n: i, s: bad ? 2 : 5, note: bad ? 'unnatural' : 'ok' } }))
    }
    return '[]'
  }
  return st
}
const ADAPTER = (S, lang) => S.c.ev('TRACK_ADAPTERS')[lang]
const fin = async (S, lang, track, extra = {}, adapterOverride) => {
  const log = []
  const t = await S.c.finaliseMainTrack(track, adapterOverride || ADAPTER(S, lang), { vocab: S.vocab, apiKey: 'k', model: 'gemini-2.5-flash-lite', qcRan: true, onLog: m => log.push(m), ...extra })
  return { t, log }
}
const rowOf = (t, id) => t.integrity.quota.rows.find(r => r.targetId === id)
const invalidate = (lang, p) => lang === 'th' ? { ...p, _semanticState: 'REJECTED', _semanticUnverified: { stage: 'test', reason: 'QC rejected this sentence' } } : { ...p, _qcInvalid: 'naturalness: QC rejected this sentence' }
const txt = (lang, p) => p && (lang === 'th' ? p.thai : lang === 'ja' ? p.japanese : p.chinese)

async function suite(lang) {
  // ── A / B: selection contract ──
  {
    const S = setup(lang)
    if (lang === 'th') {
      const r = S.c.selectThaiRevisionTargets(S.vocab, 30)
      T(lang, 'A', '30 valid targets ⇒ selected 30', r.targets.length === 30, r.targets.length)
      const pool = S.c.thaiEligibleCandidatePool(S.vocab)
      const top = r.targets.slice(0, 3).map(w => w.id)
      const V2 = S.vocab.map(w => top.includes(w.id) ? { ...w, duplicateOf: 987654 } : w)
      const r2 = S.c.selectThaiRevisionTargets(V2, 30)
      T(lang, 'B', 'bad preferred candidates ⇒ backfilled ⇒ selected still 30', r2.targets.length === 30 && top.every(id => !r2.targets.some(w => w.id === id)),
        { n: r2.targets.length, skipped: (r2.skippedCandidates || []).length, pool: pool.skipped.length })
    } else {
      const sel = { targets: S.targets.slice() }
      const r = S.c.enforceTrackTargetContract(sel, { lang, vocab: S.vocab, mode: 'daily' })
      T(lang, 'A', '30 valid targets ⇒ selected 30', r.targets.length === 30 && !r.blocked, r.targets.length)
      const bad = S.targets.slice(0, 3).map(w => ({ ...w, [FIELD[lang]]: '' }))
      const r2 = S.c.enforceTrackTargetContract({ targets: [...bad, ...S.targets.slice(3)] }, { lang, vocab: S.vocab, mode: 'revision' })
      T(lang, 'B', 'bad preferred candidates ⇒ backfilled ⇒ selected still 30', r2.targets.length === 30 && r2.skippedCandidates.length === 3 && r2.backfillLog.length === 3 && !r2.blocked, { n: r2.targets.length, log: r2.backfillLog })
    }
  }
  // ── C: 30 × 3 = 90 required ──
  {
    const S = setup(lang); const track = makeTrack(S, lang)
    const q = S.c.trackQuotaReport(track.pairs, ADAPTER(S, lang).keywordsOf(track), ADAPTER(S, lang), { vocab: S.vocab, vocabById: new Map(S.vocab.map(w => [w.id, w])) })
    T(lang, 'C', '30 targets × 3 ⇒ 90 required TARGET PAIRS (90/90 on a complete track)', q.required === 90 && q.quotaMet === 90 && q.rows.length === 30, { required: q.required, met: q.quotaMet })
  }
  // ── D / E / F / I / Q / J / K: QC rejects 1, 2, 3 pairs ⇒ exactly that many regenerated ──
  const S = setup(lang); const st = mock(S, lang)
  let track = makeTrack(S, lang, { tag: '-def', newIds: S.targets.slice(27).map(t => t.id) })
  const [tD, tE, tF] = S.targets
  let hit = { [tD.id]: 1, [tE.id]: 2, [tF.id]: 3 }
  track.pairs = track.pairs.map(p => { if (p.targetId != null && hit[p.targetId] > 0) { hit[p.targetId]--; return invalidate(lang, p) } return p })
  const { t: F1, log: L1 } = await fin(S, lang, track)
  const rec = F1.integrity.recoveredTargetPairs
  const recFor = id => rec.filter(r => r.targetId === id).length
  T(lang, 'D', 'QC rejects 1 pair ⇒ 1 regenerated ⇒ still 3 valid for that target', rowOf(F1, tD.id).valid === 3 && recFor(tD.id) === 1, { row: rowOf(F1, tD.id), rec: recFor(tD.id) })
  T(lang, 'E', 'QC rejects 2 ⇒ 2 regenerated', rowOf(F1, tE.id).valid === 3 && recFor(tE.id) === 2, { row: rowOf(F1, tE.id), rec: recFor(tE.id) })
  T(lang, 'F', 'QC rejects all 3 ⇒ 3 regenerated; FINAL_TRACK 90/90 READY', rowOf(F1, tF.id).valid === 3 && recFor(tF.id) === 3 && F1.integrity.counts.targetPairs === 90 && F1.integrity.status === 'READY',
    { row: rowOf(F1, tF.id), status: F1.integrity.status, reasons: F1.integrity.reasons, tail: L1.filter(l => /QUOTA|⛔|UNMET/.test(l)).slice(0, 8) })
  const recPairs = F1.pairs.filter(p => p && p.sourceStage === 'quota-recovery')
  T(lang, 'I', 'recovered pairs keep targetId · canonicalTargetId · targetText · pairId · sourceStage · trackId',
    recPairs.length === 6 && recPairs.every(p => [tD.id, tE.id, tF.id].includes(p.targetId) && p.canonicalTargetId === p.targetId && p.targetText && p.pairId && p.trackId === track.createdAt),
    recPairs.map(p => ({ t: p.targetId, c: p.canonicalTargetId, x: p.targetText, id: p.pairId, tr: p.trackId })))
  const iRec = L1.findIndex(l => /QUOTA RECOVERY round/.test(l)), iInv = L1.findIndex(l => /TRACK INTEGRITY/.test(l))
  const phonOk = recPairs.every(p => lang === 'th' ? (p.phonetic && p.phonetic.trim() && (p.words || []).length >= 1)
    : lang === 'ja' ? (p.romaji && p.romaji === S.c.kanaToRomaji(p.reading).replace(/\s+/g, ' ') || !!p.romaji) : (p.pinyin && (p.segments || []).length))
  T(lang, 'Q', 'post-recovery pronunciation runs LAST with the normal language pipeline (recovered pairs carry it; 0 alignment issues)',
    iRec >= 0 && iInv > iRec && phonOk && F1.integrity.invariants.PRONUNCIATION_ALIGNMENT_ISSUES === 0, { iRec, iInv, phon: recPairs.map(p => p.phonetic || p.romaji || p.pinyin), issues: F1.integrity.alignmentIssues })
  // U / X — the UI panel and the export use the shared WORD / PAIR / BRIDGE / FRAMING wording
  {
    const React = require('react'), RDS = require('react-dom/server')
    const c2 = load('tt.compiled.js', { React })
    const html = RDS.renderToStaticMarkup(React.createElement(c2.TrackIntegrityPanel, { track: F1 })).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
    T(lang, 'U', 'UI panel: TARGET WORDS 30/30 · TARGET PAIRS 90/90 · BRIDGE · FRAMING · TOTAL PLAYABLE (words and sentences never mixed)',
      /TARGET WORDS 30\/30/.test(html) && /TARGET PAIRS 90\/90/.test(html) && /BRIDGE \d+/.test(html) && /FRAMING \d+/.test(html) && /TOTAL PLAYABLE \d+/.test(html) && /Track ready/.test(html), html.slice(0, 300))
    const ex = S.c.trackIntegrityExportLines(F1).join('\n')
    T(lang, 'X', 'export: TRACK INTEGRITY block names every rejected and recovered TARGET PAIR (never a bare "dropped")',
      /TARGET PAIRS: 90\/90/.test(ex) && (ex.match(/REJECTED TARGET PAIR \[/g) || []).length === 6 && (ex.match(/RECOVERED TARGET PAIR \[/g) || []).length === 6 && !/\bdropped\b/i.test(ex), ex.slice(0, 600))
  }
  // J / K / P — v656: Listening is a FRESH conversation over ALL 30 selected targets (NEW + REVIEW)
  const lg = []
  const LR = await S.c.buildListeningTrack(F1, S.vocab, { lang, apiKey: 'k', model: 'gemini-2.5-flash-lite', onLog: m => lg.push(m) })
  const lt = LR.listeningTrack || {}
  T(lang, 'J', 'Listening starts from FINAL_TRACK (targets, vocabulary, speakers) and composes a new conversation (v672: ONE conversation — architecture one-conversation-v672)',
    LR.ok && lt.sourceFinal === true && ['one-conversation-v672', 'planning-first-v673', 'verbalizability-first-v674'].includes(lt.architecture) && lt.oneConversation === true && lg.some(l => /SOURCE FINAL_TRACK/.test(l)) && (lt.lines || []).every(l => l.source === 'listening-conversation'), { ok: LR.ok, arch: lt.architecture, reason: LR.reason })
  const req = S.c.listeningRequiredTargetIds(F1)
  T(lang, 'K', 'required = ALL 30 selected targets (3 NEW are heard too); coverage 30/30 counted from the final lines',
    req.requiredIds.length === 30 && lt.coverage && lt.coverage.requiredTargetIds.length === 30 && lt.coverage.coveredTargetIds.length === 30 && lt.coverage.newHeardIds.length === 3, { req: req.requiredIds.length, covered: lt.coverage && lt.coverage.coveredTargetIds.length })
  T(lang, 'P', 'coherent multi-turn A/B conversation ⇒ whole-conversation coherence PASS ⇒ VERIFIED · READY',
    lt.coherenceAudit && lt.coherenceAudit.passed && lt.listeningQuality === 'VERIFIED' && lt.readiness === 'READY' && lt.lines.length >= 30, { q: lt.listeningQuality, gates: lt.gates, issues: (lt.issues || []).slice(0, 5) })

  // ── G: 30/30 words covered but only 80/90 pairs ⇒ NOT READY ──
  {
    const S2 = setup(lang); mock(S2, lang, { noRecovery: true })
    const counts = {}; S2.targets.slice(0, 10).forEach(t => { counts[t.id] = 2 })
    const NOREC = { ...ADAPTER(S2, lang), recoverTargetPairs: async () => ({ accepted: [], reasons: ['recovery unavailable in this test'] }) }
    const { t } = await fin(S2, lang, makeTrack(S2, lang, { counts, tag: '-g' }), {}, NOREC)
    T(lang, 'G', '30/30 target words covered but TARGET PAIRS 80/90 ⇒ NOT_READY (recovery unable)',
      t.integrity.counts.targetWordsCovered === 30 && t.integrity.counts.targetPairs === 80 && t.integrity.status === 'NOT_READY' && t.integrity.reasons.some(r => /TARGET_PAIR_QUOTA=80\/90/.test(r)),
      { covered: t.integrity.counts.targetWordsCovered, pairs: t.integrity.counts.targetPairs, reasons: t.integrity.reasons })
  }
  // ── H: bridges / framing never satisfy the quota ──
  {
    const S2 = setup(lang); mock(S2, lang, { noRecovery: true })
    const tH = S2.targets[4]
    const NOREC = { ...ADAPTER(S2, lang), recoverTargetPairs: async () => ({ accepted: [], reasons: ['recovery unavailable in this test'] }) }
    const { t } = await fin(S2, lang, makeTrack(S2, lang, { counts: { [tH.id]: 1 }, bridges: { [tH.id]: 5 }, tag: '-h' }), {}, NOREC)
    const r = rowOf(t, tH.id)
    T(lang, 'H', 'a target with 1 TARGET PAIR + 5 BRIDGE lines still has deficit 2 (bridges/framing never count)',
      r.valid === 1 && r.deficit === 2 && t.integrity.counts.bridgePairs === 5 && t.integrity.counts.framingPairs === 2 && t.integrity.status === 'NOT_READY', { r, c: t.integrity.counts })
  }
  // ── L / M / N / O: v656 Listening gates and bounded local repair ──
  {
    const S2 = setup(lang); mock(S2, lang, { ln: { missing: [S2.targets[6].id], noRepair: true } })
    const R2 = await S2.c.buildListeningTrack(makeTrack(S2, lang, { tag: '-l' }), S2.vocab, { lang, apiKey: 'k', model: 'm' })
    const L2 = R2.listeningTrack || {}
    T(lang, 'L', '29/30 targets in the final conversation (repair unable) ⇒ NOT_READY, the missing target is named',
      L2.coverage && L2.coverage.coveredTargetIds.length === 29 && L2.readiness === 'NOT_READY' && L2.coverage.uncoveredTargetIds.includes(S2.targets[6].id) && /COVERAGE_PASS=FAIL/.test(L2.listeningQuality), { q: L2.listeningQuality })
    const S3 = setup(lang); const st3 = mock(S3, lang, { ln: { missing: [S3.targets[3].id, S3.targets[9].id] } })
    const R3 = await S3.c.buildListeningTrack(makeTrack(S3, lang, { tag: '-m' }), S3.vocab, { lang, apiKey: 'k', model: 'm' })
    const L3 = R3.listeningTrack || {}
    // v668 §53/§74: the whole-conversation composer is retired — the child-track path is the same scene transaction
    T(lang, 'M', '2 targets missing ⇒ (v668) each scene\'s preflight repairs its missing word by atomic placement (≤ 2 attempts per word) ⇒ 30/30 ⇒ READY; no whole-conversation composer call',
      L3.readiness === 'READY' && L3.coverage.coveredTargetIds.length === 30 && L3.telemetry.LISTENING_REPAIR_CALLS <= 4 && !st3.lnCompose, { q: L3.listeningQuality, tel: L3.telemetry })
    const S4 = setup(lang); mock(S4, lang, { ln: { max4: true } })
    const R4 = await S4.c.buildListeningTrack(makeTrack(S4, lang, { tag: '-n' }), S4.vocab, { lang, apiKey: 'k', model: 'm' })
    const L4 = R4.listeningTrack || {}
    T(lang, 'N', 'a turn with 4 current targets is split by local repair ⇒ max 3 per turn ⇒ READY',
      L4.readiness === 'READY' && L4.gates.MAX_TARGETS_PER_TURN <= 3 && L4.telemetry.LISTENING_REPAIR_CALLS >= 1, { q: L4.listeningQuality, r: L4.readiness, rc: L4.telemetry && L4.telemetry.LISTENING_REPAIR_CALLS, gen: L4.telemetry && L4.telemetry.LISTENING_SCENE_GENERATION_CALLS })
    const S5 = setup(lang); mock(S5, lang, { cohFail: true })
    const R5 = await S5.c.buildListeningTrack(makeTrack(S5, lang, { tag: '-o' }), S5.vocab, { lang, apiKey: 'k', model: 'm' })
    const L5 = R5.listeningTrack || {}
    T(lang, 'O', 'whole-conversation coherence FAIL is a hard gate ⇒ NOT_READY (never VERIFIED / playable)',
      // v674: the SAME judge now also gates every phase BEFORE commit (PHASE_TRANSITION_VALIDATION) — a judge that fails
      // everything stops the composition before any phase commits; either way the track is NOT_READY and never VERIFIED
      ((L5.coherenceAudit && L5.coherenceAudit.passed === false && L5.readiness === 'NOT_READY') || (R5.ok === false && !R5.listeningTrack)) && L5.listeningQuality !== 'VERIFIED', { q: L5.listeningQuality, ok: R5.ok, reason: R5.reason })
  }
  // ── language-specific regressions found by the v649 simulated real-path run ──
  if (lang === 'ja') {
    const c = S.c
    const p = { japanese: '今日はいいよ。', reading: 'きょうはいいよ。', romaji: 'kyou wa ii yo.', segments: [{ surface: '今日', reading: 'きょう', romaji: 'kyou' }, { surface: 'は', reading: 'は', romaji: 'wa' }, { surface: 'いい', reading: 'いい', romaji: 'ii' }, { surface: 'よ', reading: 'よ', romaji: 'yo' }] }
    const r = await c._jaFinaliseMetadata([p], {})
    T(lang, 'J1', 'particle は keeps its Hepburn romaji "wa" through FINAL metadata (was rewritten to "kyouhaii") and the reading audit accepts it',
      r.pairs[0].romaji === 'kyou wa ii yo.' && r.alignmentIssues.length === 0 && c.auditJapaneseReading({ ...p }).ok, { romaji: r.pairs[0].romaji, issues: r.alignmentIssues })
  }
  if (lang === 'zh') {
    const S5 = setup('zh'); mock(S5, 'zh')
    const tNew = S5.targets[S5.targets.length - 1]
    tNew.status = 'new'; tNew.lastSeen = null; tNew.introducedAt = null; tNew.repCount = 0
    const tr = makeTrack(S5, 'zh', { tag: '-z1', newIds: [tNew.id] })
    const { t } = await fin(S5, 'zh', tr)
    T(lang, 'Z1', 'a NEW target missing from the learner inventory is still recognised in its own sentences (quota and recovery agree; was TARGET_MISSING 87/90)',
      rowOf(t, tNew.id).valid === 3 && t.integrity.counts.targetPairs === 90 && t.integrity.invariants.TARGET_PRESENCE_PASS === true, { row: rowOf(t, tNew.id), target: tNew.chinese })
  }
  if (lang === 'th') {
    const S5 = setup('th'); mock(S5, 'th')
    const water = S5.targets.find(t => t.thai === 'น้ำ')
    const la = S5.c.ev('LISTENING_ADAPTERS').th
    const mk = (sp, thai) => ({ speaker: sp, pair: la.makeLine({ text: thai, english: '' }, sp) })
    const au = S5.c.listeningConversationAudit([{ sceneId: 'L1', turns: [mk('A', 'ห้องน้ำอยู่ที่ไหนครับ'), mk('B', 'อยู่ข้างหลังค่ะ')] }], [{ id: water.id, surface: 'น้ำ', gloss: 'water', role: 'CONTENT' }], la, { vocab: S5.vocab, exposed: S5.vocab, eligTargets: [water] })
    T(lang, 'T1', 'v656 coverage counts the target as its own word: น้ำ is not "heard" in ห้องน้ำ (bathroom)',
      au.occ.get(water.id).length === 0 && au.missing.length === 1, au.lines)
  }
  // ── R: duplicate Gemini request ⇒ ONE provider request ──
  {
    const KEY = 'AIzaSyTEST-harness-key-000000'
    const c = load('tt.compiled.js'); const fetches = []
    c.fetch = async (url, o) => { fetches.push(JSON.parse(o.body)); return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: '[{"i":1,"s":5,"note":"ok"}]' }] } }], usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 } }) } }
    const run = c.aiBeginRun(lang + '-track')
    const vocab = lang === 'th' ? c.initVocab() : lang === 'ja' ? c.initJapaneseVocab() : c.initMandarinVocab()
    let a, b
    if (lang === 'th') { const items = [{ thai: 'ผมชอบกินข้าวครับ', english: 'I like eating rice.', prompt: 'He says he likes eating rice' }]
      ;[a, b] = await Promise.all([c._finalNaturalnessJudge(items, KEY, 'gemini-2.5-flash-lite'), c._finalNaturalnessJudge(items, KEY, 'gemini-2.5-flash-lite')]) }
    else { const p = lang === 'ja' ? [{ japanese: '食べるね。', english: 'I eat.' }] : [{ chinese: '我吃饭。', english: 'I eat.' }]
      ;[a, b] = await Promise.all([c._lnGenericVerdicts(lang, p, { apiKey: KEY, model: 'gemini-2.5-flash-lite' }), c._lnGenericVerdicts(lang, p, { apiKey: KEY, model: 'gemini-2.5-flash-lite' })]) }
    const rows = c.__aiLedger.filter(r => r.runId === run)
    const sum = c.aiUsageSummary(run)
    T(lang, 'R', 'the same Gemini request twice in one run ⇒ ONE provider request; the second is a deduplicated ledger row',
      fetches.length === 1 && rows.length === 2 && rows.filter(r => r.deduped).length === 1 && sum.dedupedRequests === 1 && JSON.stringify(a) === JSON.stringify(b) && !!vocab.length,
      { fetches: fetches.length, rows: rows.map(r => [r.stage, !!r.deduped]), sum: sum.dedupedRequests })
  }
  // ── S: Flash-Lite overload ⇒ no automatic Flash promotion ──
  {
    const KEY = 'AIzaSyTEST-harness-key-000000'
    const c = load('tt.compiled.js'); const models = []
    c.fetch = async (url) => { models.push((String(url).match(/models\/([^:]+):/) || [])[1]); return { ok: false, status: 503, json: async () => ({ error: { code: 503, message: 'The model is overloaded.' } }) } }
    c.aiBeginRun(lang + '-track')
    const S4 = setup(lang); c.initVocab && 0
    const t = S4.targets[0]
    let err = null
    try {
      if (lang === 'th') await c.geminiJudge(KEY, c.ev('GEMINI_DEFAULT_MODEL'), 'Rate how well each Thai sentence matches its prompt\n1. Prompt: x', 400)
      else await c._lnGenericVerdicts(lang, [lang === 'ja' ? { japanese: t.japanese + 'ね。', english: 'x' } : { chinese: '我' + t.chinese + '。', english: 'x' }], { apiKey: KEY, model: c.ev('GEMINI_DEFAULT_MODEL') })
    } catch (e) { err = e }
    T(lang, 'S', 'Flash-Lite 503 on every attempt ⇒ bounded same-model retries, never gemini-2.5-flash (no promotion)',
      models.length >= 1 && models.length <= 3 && models.every(m => m === 'gemini-2.5-flash-lite') && c.ev('GEMINI_DEFAULT_MODEL') === 'gemini-2.5-flash-lite', { models, err: err && err.message })
  }
  return st
}

module.exports = { setup, sentence, makeTrack, mock, FR, kwOf, txt }
if (require.main === module) (async () => {
  for (const lang of LANG) {
    try { await suite(lang) } catch (e) { fails++; out.push('FAIL ' + lang.toUpperCase() + ' suite crashed: ' + (e && e.stack || e).toString().slice(0, 600)); results[lang] = results[lang] || { pass: 0, fail: 0 }; results[lang].fail++ }
  }
  console.log(out.join('\n'))
  console.log('\nTOTALS BY LANGUAGE: ' + Object.entries(results).map(([l, r]) => l.toUpperCase() + ' ' + r.pass + '/' + (r.pass + r.fail)).join(' · '))
  console.log(fails ? fails + ' FAILED' : 'all passed')
  process.exit(fails ? 1 : 0)
})()
