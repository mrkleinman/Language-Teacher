// v639 fixture suite. Real app functions, loaded from the compiled tt.jsx; only the
// external model call (the Gemini client, geminiRequest) and generateWordLines' model are mocked.
const { load } = require('./harness'), { loadFixture } = require('./fixture'), { lnRespond } = require('./ln_mock')
const results = []
const T = (id, name, pass, detail) => { results.push({ id, name, pass: !!pass, detail }); }

function fixtureGroups(track) {
  // target thai → the fixture's own lines for that target, in track order
  const IMPROVED = { 3:'ซึ่ง', 4:'ซึ่ง', 5:'ซึ่ง', 9:'นอกจาก', 10:'นอกจาก', 38:'เนื้อ', 39:'เนื้อ', 67:'หมายถึง', 68:'หมายถึง' }
  const g = new Map()
  track.pairs.forEach((p, i) => {
    const t = IMPROVED[i + 1] || p._target
    if (!t || t === 'greeting' || t === 'parting') return
    if (!g.has(t)) g.set(t, [])
    g.get(t).push({ speaker: p.speaker, thai: p.thai, phonetic: p.phonetic, english: p.english, prompt: p.prompt,
                    _source: p._source && !p._source.startsWith('ai:') ? p._source : 'gemini-check-1:conv' })
  })
  return g
}
// Mock model: answers each QC/audit prompt type the way a well-behaved model would,
// with scripted failures where a test needs one.
function mockModel(c, script) {
  const calls = []
  c.mockGeminiGenerate = async (key, model, msgs, max) => {
    const q = msgs[msgs.length - 1].content
    calls.push(q.slice(0, 60))
    // v656: the Listening conversation composer (written from the suite's own verified sentences)
    if (c.__lnPool) { const r = lnRespond(q, c.__lnPool, script.ln); if (r) return r }
    const nums = re => [...q.matchAll(re)].map(m => +m[1])
    if (/Rate how well each Thai sentence matches its prompt/.test(q))
      return JSON.stringify(nums(/^(\d+)\. Prompt:/gm).map(i => ({ i, s: 5 })))
    if (/native Thai speaker checking learner material/.test(q)) {
      const items = [...q.matchAll(/^(\d+)\. Thai: (.*)$/gm)]
      return JSON.stringify(items.map(m => ({ i: +m[1], s: (script.unnatural || []).some(x => m[2].includes(x)) ? 2 : 5, note: 'mock' })))
    }
    if (/Evaluate this Thai language learning group/.test(q)) {
      const t = (q.match(/Target word: "([^"]+)"/) || [])[1]
      return JSON.stringify(script.improve && script.improve[t] ? { action: 'improve', reason: 'mock: force a rewrite' } : { action: 'clean', reason: 'ok' })
    }
    if (/Fix this Thai learning group/.test(q)) {
      const t = (q.match(/Target word: "([^"]+)"/) || [])[1]
      return JSON.stringify(script.improve[t])
    }
    if (/Judge this short scene/.test(q)) return JSON.stringify({ A: 5, B: 5, C: 5, D: 5, E: 5, brokenAtPair: null, reason: 'mock' })
    // v649: the whole-listening coherence audit
    if (/Judge the WHOLE listening track/.test(q)) return JSON.stringify({ scenes: [...q.matchAll(/^Scene (\d+)/gm)].map(m => ({ scene: +m[1], pass: true, breakAfterLine: null, reason: 'mock' })), overall: 5, reason: 'mock' })
    return '[]'
  }
  return calls
}

async function main() {
  const c = load('tt.compiled.js')
  const { track: fx, vocab } = loadFixture(c)
  const byThai = new Map(vocab.map(w => [w.thai, w]))
  const kws = fx.keywords

  // ── GENERATION (real generateConversationTrack; model lines = the real 25 Sept lines) ──
  const groups = fixtureGroups(fx)
  const progress = []
  c.generateWordLines = async (target) => (groups.get(target.thai) || []).map(l => ({ ...l, words: [] }))
  const targets = kws.map(k => ({ ...byThai.get(k.thai) }))
  const scene = { scene: 'Two friends talk about food.', characterA: 'Somchai, a Thai man', characterB: 'Nida, a Thai woman',
    opening: 'สวัสดีครับ', opening_phonetic: 'sà-wàt-dii khráp', opening_english: 'Hello.', opening_prompt: 'He greets her',
    reply: 'สวัสดีค่ะ', reply_phonetic: 'sà-wàt-dii khâ', reply_english: 'Hello.',
    closing: 'แล้วเจอกันครับ', closing_phonetic: 'lâeo joe kan khráp', closing_english: 'See you later.',
    closing_reply: 'แล้วเจอกันค่ะ', closing_reply_phonetic: 'lâeo joe kan khâ', closing_reply_english: 'See you later.' }
  const gen = await c.generateConversationTrack(targets, [], 'k', (d, t, meta) => { if (meta && meta.apiError) progress.push(meta.apiError) }, vocab, 'm', null, scene)
  const genAudit = gen._finalAudit
  const track = { date: '25 Sept 2026', mode: 'revision', pairs: gen, keywords: kws, createdAt: new Date().toISOString(), _finalAudit: genAudit }

  // C — a genuine bridge is typed at creation and accepted
  const b004 = gen.find(p => p.thai === 'น่าสนใจค่ะร้านนั้นขายอะไรคะ')
  T('C', 'genuine bridge accepted with explicit bridge type and no fake targetId',
    b004 && b004.pairType === 'bridge' && b004.targetId == null && b004.supportsTargetId === byThai.get('ซึ่ง').id && b004._typedAt === 'creation',
    b004 && { type: b004.pairType, targetId: b004.targetId, supportsTargetId: b004.supportsTargetId })
  // F (generation side) — markup never survives into generated pairs
  const genLeaks = gen.reduce((n, p) => n + c.pairMarkupLeaks(p).length, 0)
  const cleaned = gen.find(p => p._rawModelText && /__น้ำปลา__/.test(p._rawModelText.thai || ''))
  T('F1', 'model underscores removed at the parse boundary; raw kept for diagnostics',
    genLeaks === 0 && cleaned && cleaned.thai === 'ผมอยากลองอาหารใส่น้ำปลาครับ', { leaks: genLeaks, cleaned: cleaned && cleaned.thai, raw: cleaned && cleaned._rawModelText.thai })
  // E, H — generation audit rejects the speaker conflict and the malformed lines
  // v657: the early semantic gate (same acceptance contract) may reject a line before the generation audit sees it
  const _early = (gen._earlyGate || {}).rejectedLines || []
  const rejectedThai = genAudit.rejected.map(r => r.thai).concat(_early.map(x => x.thai))
  T('E1', 'ฉัน…ครับ rejected by the speaker-consistency gate (generation audit)',
    rejectedThai.includes('ฉันอยากไปกินข้าวคนเดียวครับ') && !gen.some(p => p.thai === 'ฉันอยากไปกินข้าวคนเดียวครับ'),
    genAudit.rejected.find(r => /ฉันอยาก/.test(r.thai)))
  T('H1', 'malformed ผมไม่รู้ซึ่งผมไม่เคยไปครับ rejected (naturalness)',
    rejectedThai.includes('ผมไม่รู้ซึ่งผมไม่เคยไปครับ'), genAudit.rejected.find(r => /ไม่รู้ซึ่ง/.test(r.thai)))

  // ── QC (real runQualityCheckCore) with a rewrite that REMOVES a target ──
  // ฝาก group: the model rewrites line 1 (content, had ฝาก) into a sentence without ฝาก,
  // and wraps the target in markup on line 2.
  const calls = mockModel(c, {
    improve: { 'ฝาก': [
      { speaker: 'A', thai: 'ผมอยากไปธนาคารครับ', phonetic: 'phǒm yàak pai tha-naa-khaan khráp', english: 'I want to go to the bank.', prompt: 'He says he wants to go to the bank' },
      { speaker: 'B', thai: '__ฝาก__ที่ไหนคะ', phonetic: 'fàak thîi-nǎi khá', english: 'Deposit it where?', prompt: 'She asks where' },
      { speaker: 'A', thai: 'ผมจะไปธนาคารครับ', phonetic: 'phǒm jà pai tha-naa-khaan khráp', english: 'I will go to the bank.', prompt: 'He says he will go to the bank' } ] },
    unnatural: ['ผมตื่นห้าทุ่มครับ'] })
  const qlog = []
  const qc = await c.runQualityCheckCore(track, 'k', 'm', { onLog: m => qlog.push(m), vocab })
  const fa = qc.counts.finalAudit
  const fakId = byThai.get('ฝาก').id
  const lost = fa.rejected.find(r => r.thai === 'ผมอยากไปธนาคารครับ')
  const fakContent = qc.pairs.filter(p => p.pairType === 'content' && p.targetId === fakId)
  T('A', 'target-bearing pair whose target disappears after repair is rejected',
    lost && lost.reasons.some(x => /TARGET_MISSING/.test(x)) && !qc.pairs.some(p => p.thai === 'ผมอยากไปธนาคารครับ'),
    { rejected: lost, fakContentLinesAfter: fakContent.map(p => p.thai + (p._rescued ? ' (rescued pre-QC candidate)' : '')) })
  T('F2', 'markup inside a QC rewrite is removed before persistence',
    qc.pairs.every(p => c.pairMarkupLeaks(p).length === 0) && qc.pairs.some(p => p.thai === 'ฝากที่ไหนคะ' && p._markupStripped),
    qc.pairs.filter(p => p._markupStripped).map(p => [p.thai, p._markupStripped]))
  T('INV', 'final invariants hold on the QC output',
    fa.ok && fa.invariants.TARGET_BEARING_PAIR_TARGET_MISSING === 0 && fa.invariants.TYPE_UNKNOWN === 0 &&
    fa.invariants.THAI_FINAL_SPEAKER_CONFLICTS === 0 && fa.invariants.FINAL_SENTENCE_MARKUP_COUNT === 0, fa.invariants)
  T('NAT', 'model naturalness gate drops a line the model scores < 4',
    qc.counts.finalSemanticAudit && qc.counts.finalSemanticAudit.unnatural >= 1 && !qc.pairs.some(p => /ผมตื่นห้าทุ่มครับ/.test(p.thai)),
    qc.counts.finalSemanticAudit && qc.counts.finalSemanticAudit.failures.map(f => f.reason))
  const qcTrack = { ...track, pairs: qc.pairs, _finalAudit: fa, _coverage: qc.counts.coverage }

  // ── LEGACY: the real stored 25 Sept track through the same audit ──
  const legacy = c.thaiFinalTrackAudit(fx.pairs, { keywords: kws, vocab, stage: 'legacy-25-sept' })
  const l38 = legacy.pairs.find(p => p.thai === 'ผมอยากกินเนื้อครับ')
  T('B', 'conversation-path target line with no targetId has its identity restored',
    l38 && l38.pairType === 'content' && l38.targetId === byThai.get('เนื้อ').id,
    { thai: l38 && l38.thai, type: l38 && l38.pairType, targetId: l38 && l38.targetId, how: (legacy.report.identityRestored.find(r => r.thai === 'ผมอยากกินเนื้อครับ') || {}).how })
  T('E2', 'ฉัน…ครับ fails the gate on the legacy track too',
    legacy.report.rejected.some(r => r.thai === 'ฉันอยากไปกินข้าวคนเดียวครับ' && r.reasons.some(x => /SPEAKER_CONFLICT/.test(x))), null)

  // ── LISTENING from the QC'd track ──
  const llog = []
  c.__lnPool = qcTrack.pairs
  const L = await c.buildListeningTrack(qcTrack, vocab, { lang: 'th', apiKey: 'k', model: 'm', onLog: m => llog.push(m) })
  const lt = L.listeningTrack
  // D — male sentence renders male
  const maleLines = lt.lines.filter(l => /ครับ/.test(l.thai))
  T('D', 'ผม…ครับ lines render as the male speaker (icon and voice)',
    maleLines.length > 0 && maleLines.every(l => l.gender === 'male' && c.convoLineIsMale(l)) &&
    lt.lines.filter(l => /ค่ะ|คะ/.test(l.thai)).every(l => !c.convoLineIsMale(l)),
    { male: maleLines.length, female: lt.lines.length - maleLines.length })
  T('E3', 'no ฉัน…ครับ line reaches Listening', !lt.lines.some(l => /ฉัน/.test(l.thai) && /ครับ/.test(l.thai)), null)
  T('F3', 'no markup reaches Listening display or TTS',
    lt.lines.every(l => !c.modelMarkupFound(l.thai).length && !c.modelMarkupFound(c.ttsTextForPair(l)).length), null)
  // legacy Listening lines saved by v638 still contain __ — renderer + TTS strip them
  const legacyLine = { speaker: 'A', thai: 'ผมอยากลองอาหารใส่__น้ำปลา__ครับ' }
  T('F4', 'legacy saved line: display and TTS receive clean text',
    c.learnerDisplayText(legacyLine.thai) === 'ผมอยากลองอาหารใส่น้ำปลาครับ' && c.ttsTextForPair(legacyLine) === 'ผมอยากลองอาหารใส่น้ำปลาครับ' &&
    c.stripModelMarkup('อาหาร__หลาย__อย่าง__น่า__สนใจ__ค่ะ') === 'อาหารหลายอย่างน่าสนใจค่ะ' &&
    c.stripModelMarkup('ผมกินอาหาร__เบา__ดีกว่าครับ') === 'ผมกินอาหารเบาดีกว่าครับ', null)
  T('F5', 'sanitiser leaves Thai tone marks, spaces, punctuation, kana and hanzi untouched',
    ['ร้านไหนดังคะ บางทีตอนตีห้าก็ไปถึงค่ะ', 'Wow, 5 AM? I arrive at sunset.', '今日、何を食べる？', '你好吗？', "don't"].every(x => c.stripModelMarkup(x) === x), null)

  // G — the real price scenes fail coherence
  const P = n => ({ idx: n - 1, speaker: fx.pairs[n - 1].speaker, pair: fx.pairs[n - 1] })
  const g1 = c.listeningCoherenceCheck([P(43), P(44), P(45)]), g2 = c.listeningCoherenceCheck([P(46), P(47), P(48)]), g3 = c.listeningCoherenceCheck([P(49), P(50), P(51)])
  const g0 = c.listeningCoherenceCheck([P(35), P(36), P(37)])
  T('G', 'restaurant scenes with implausible prices score below the acceptance threshold',
    g1.score < 4 && g2.score < 4 && g3.score < 4 && g0.score >= 4,
    { '043-045': [g1.score, g1.reason], '046-048': [g2.score, g2.reason], '049-051': [g3.score, g3.reason], 'control 035-037 squid': [g0.score, g0.reason] })
  // v656: every selected target must be heard, so a price target is not "left out" — a conversation carrying the
  // implausible restaurant prices fails the whole-conversation coherence gate and is never READY / playable
  T('G2', 'implausible price lines in the conversation ⇒ whole-conversation coherence FAIL ⇒ Listening NOT_READY (not playable)',
    !lt.lines.some(l => /หมื่น|แสน|ล้าน/.test(l.thai)) || (lt.gates.WHOLE_CONVERSATION_COHERENCE === 'FAIL' && lt.readiness === 'NOT_READY'), lt.gates)
  // H — also rejected by Listening
  T('H2', 'ผมไม่รู้ซึ่ง… is rejected by the Listening gate', !lt.lines.some(l => /ไม่รู้ซึ่ง/.test(l.thai)), null)

  // I — coverage label is computed from what Listening actually teaches
  const v638Lines = [49,50,51,52,53,35,36,37,38,39,43,44,45,46,47,78,79,80,5,9,11,14,19,23]
  const tgt = { 49:1629,52:202,35:944,38:1495,43:1627,46:1628,78:1506,5:160,9:800,11:819,14:828,19:1091,23:1414 }
  const v638Lt = { lines: v638Lines.map(n => ({ pairIndex: n - 1, targetId: tgt[n] != null ? tgt[n] : null, supporting: tgt[n] == null })) }
  const full = { lines: kws.map((k, i) => ({ pairIndex: i, targetId: k.wordId, supporting: false })) }
  T('I', '13/30 represented ⇒ label is "13/30 targets covered", never "all"',
    c.listeningCoverageLabel(v638Lt, fx) === '13/30 targets covered' && c.listeningCoverageLabel(full, fx) === 'all 30 track words covered' &&
    // v640 Listening: required-coverage label (legacy saved tracks keep the old wording above)
    /^TARGET COVERAGE \d+\/30/.test(c.listeningCoverageLabel(lt, qcTrack)) && !/all track words/.test(c.listeningCoverageLabel(lt, qcTrack)),
    { v638Listening: c.listeningCoverageLabel(v638Lt, fx), thisBuild: c.listeningCoverageLabel(lt, qcTrack) })

  // J — end screen headings
  const secs = c.endScreenSections(kws)
  T('J', 'Revision, 0 new, 16 relearn ⇒ RELEARNING (16), no INTRODUCING',
    !secs.some(s => /INTRODUCING/.test(s.heading)) && secs.some(s => s.heading === 'RELEARNING (16)') && secs.some(s => s.heading === 'REVIEWED (14)'),
    secs.map(s => s.heading))
  const secsNew = c.endScreenSections([{ thai: 'x', isNew: true, isUnseen: true }, { thai: 'y', isNew: true, isUnseen: false }, { thai: 'z', isNew: false }])
  T('J2', 'genuinely new words still get INTRODUCING', secsNew.map(s => s.heading).join('|') === '✦ INTRODUCING (1)|RELEARNING (1)|REVIEWED (1)', secsNew.map(s => s.heading))

  // P — Listening failure never touches the Main Track
  const before = JSON.stringify(qcTrack.pairs)
  c.mockGeminiGenerate = async () => { throw new Error('model down') }
  let threw = null
  try { await c.buildListeningTrack(qcTrack, vocab, { lang: 'th', apiKey: 'k', model: 'm' }) } catch (e) { threw = e.message }
  T('P', 'Listening build with a failing model leaves the Main Track byte-identical', JSON.stringify(qcTrack.pairs) === before, { threw })

  // export shows real identity
  const exp = c.exportTrackAsText ? c.exportTrackAsText(qcTrack) : null
  return { results, gen, genAudit, qc, fa, legacy, lt, llog, qlog, exp, track: qcTrack, fx, vocab, progress, c }
}
module.exports = { main }
if (require.main === module) main().then(r => {
  r.results.forEach(x => console.log((x.pass ? 'PASS ' : 'FAIL ') + x.id.padEnd(4) + x.name + (x.pass ? '' : '\n      ' + JSON.stringify(x.detail))))
  console.log('\n' + r.results.filter(x => x.pass).length + '/' + r.results.length + ' passed')
}).catch(e => { console.error(e); process.exit(1) })
