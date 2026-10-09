// v656 test helper: a simulated Listening composer. The model is asked for ONE conversation that uses every
// target; this responder writes it from a pool of the suite's own verified sentences (one per target, in
// the prompt's order, speakers as authored), in scenes of up to 10 turns. Repairs return no edit unless
// the suite supplies a responder. Everything else (coverage, max-3, speakers, duplicates, closed vocabulary,
// naturalness, coherence, pronunciation) is the app's own code.
function lnText(p) { return p && (p.thai || p.japanese || p.chinese) }
function lnCompose(q, pool, opt = {}) {
  const rows = [...q.matchAll(/^T(\d+) \| (.+?) \| /gm)].map(m => ({ id: +m[1], surface: m[2] }))
  const used = new Set()
  const turns = []
  // v669: the INTENT SKELETON's speaker for the turn that "uses" each target (used when the pool is one-speaker).
  // opt.authoredSpeakers keeps the pool's speakers as authored (one-speaker fixtures).
  const skel = new Map(), sk = (q.match(/^INTENT SKELETON[^:]*: (.*)$/m) || [])[1] || ''
  for (const m of sk.matchAll(/(\d+)\. ([AB]) [A-Z_]+[^·]*?— uses ([^·]+)/g)) m[3].split(/,\s*/).forEach(x => skel.set(x.trim(), m[2]))
  // v672: the sentences that BELONG to a row's target are reserved first, so a substring fallback (ลา ⊂ เวลา) for an
  // earlier row can never consume a later row's own sentence (the one-conversation planner orders targets by story)
  const own = new Set((pool || []).filter(p => p && rows.some(r => !(opt.skip || []).includes(r.id) && (p.targetId === r.id || p.wordId === r.id))).map(lnText))
  rows.forEach(r => {
    if ((opt.skip || []).includes(r.id)) return
    const cands = (pool || []).filter(p => p && lnText(p) && !used.has(lnText(p)) && p.pairType !== 'framing' && !p._framing && p._semanticState !== 'REJECTED' && !p._qcInvalid)
    const p = cands.find(x => x.targetId === r.id || x.wordId === r.id) || cands.find(x => lnText(x).includes(r.surface) && !own.has(lnText(x))) || cands.find(x => lnText(x).includes(r.surface))
    if (!p) return
    used.add(lnText(p))
    turns.push({ _sk: skel.get(r.surface.replace(/ \[.*$/, '').trim()), speaker: p.speaker === 'B' ? 'B' : 'A', text: lnText(p), english: p.english || '', reading: p.reading || null, romaji: p.romaji || null, pinyin: p.pinyin || null, intendedTargetIds: [r.id] })
  })
  // v673: a composer that follows the TURN PLAN never answers a question with an unrelated question — the mock keeps
  // its pool sentences but moves a statement between two adjacent questions (as a model following the plan would)
  const isQ = t => /[?？]|ไหม|เหรอ|หรือ|ทำไม|อะไร|ที่ไหน|กี่|เมื่อไหร่|ยังไง|か$|吗|呢/.test((t.text || '') + ' ' + (t.english || ''))   // the app's own _isQuestion
  for (let i = 1; i < turns.length; i++) if (isQ(turns[i - 1]) && isQ(turns[i])) { const j = turns.findIndex((t, k) => k > i && !isQ(t)); if (j > 0) { const [st] = turns.splice(j, 1); turns.splice(i, 0, st) } }
  // a pool whose lines are all one speaker's: the composer gives the turns the skeleton's speakers (else alternates)
  if (!opt.authoredSpeakers && turns.length >= 2 && new Set(turns.map(t => t.speaker)).size < 2) turns.forEach((t, i) => {
    t.speaker = t._sk || (i % 2 ? 'B' : 'A')
    // a composer writes speaker B's (female) Thai lines with her own pronoun and particles
    if (t.speaker === 'B' && /[\u0E00-\u0E7F]/.test(t.text || '')) t.text = t.text.replace(/^ผม/, 'ฉัน').replace(/ครับ/g, 'ค่ะ')
  })
  turns.forEach(t => { delete t._sk })
  const scenes = []
  for (let i = 0; i < turns.length; i += 10) scenes.push({ sceneId: 'L' + (scenes.length + 1), setting: 'scene', turns: turns.slice(i, i + 10) })
  if (scenes.length > 1 && scenes[scenes.length - 1].turns.length < 2) { const last = scenes.pop(); scenes[scenes.length - 1].turns.push(...last.turns) }
  return JSON.stringify({ scenes })
}
function lnRespond(q, pool, opt) {
  if (/Write ONE natural .* LISTENING conversation|Write SCENE \S+ .* LISTENING conversation/.test(q)) return lnCompose(q, pool, opt)   // v662: a scene call lists only its required targets
  if (/REVISE this .* LISTENING conversation locally|REPAIR SCENE \S+ of a .* LISTENING conversation/.test(q)) return JSON.stringify({ edits: [] })
  if (/ATOMIC REPAIR of .* LISTENING lines/.test(q)) return JSON.stringify({ repairs: [] })   // v663: no patch unless the suite supplies one
  // the targeted pronunciation repair: fill each token still written in Thai script with a romanisation
  if (/Re-romanize each Thai sentence/.test(q)) return JSON.stringify([...q.matchAll(/^(\d+)\. Thai: .*\n\s*Current \(broken\): (.*)$/gm)].map(m => ({ n: +m[1], ph: m[2].split(/\s+/).map(x => /[\u0E00-\u0E7F]/.test(x) ? 'khām' : x).join(' ') })))
  return null
}
module.exports = { lnCompose, lnRespond, lnText }
