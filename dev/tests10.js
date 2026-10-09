// v658 — NO AUTOMATIC LISTENING AFTER A MAIN TRACK + stored-Listening compatibility.
// (The v644 auto-handoff lifecycle suite is retired: retired/tests10-v644-auto-handoff.js.)
// Real app code: completeThaiTrackHandoff (the Thai save boundary), the retained shared builder (to create
// "older" stored Listening the way v644–v657 did), and the real ListenFirstGate rendered with
// react-test-renderer (effects run). Model mocked.
const { main } = require('./tests'), { load } = require('./harness')
const React = require('react'), TR = require('react-test-renderer')
const out = []; let fails = 0
const T = (id, name, pass, detail) => { if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + id.padEnd(3) + name + (detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')) }
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const REC = { 'ตื่น': [{ thai: 'พรุ่งนี้ผมต้องตื่นเช้าครับ', phonetic: 'x', english: 'I have to wake up early tomorrow.', prompt: 'He says he must wake early' }],
  'หมื่น': [{ thai: 'ผมมีเงินหนึ่งหมื่นบาทครับ', phonetic: 'x', english: 'I have ten thousand baht.', prompt: 'He says how much money he has' }],
  'แสน': [{ thai: 'บ้านนี้ราคาสามแสนบาทครับ', phonetic: 'x', english: 'This house costs three hundred thousand baht.', prompt: 'He says the house price' }],
  'ล้าน': [{ thai: 'บ้านหลังนี้ราคาสองล้านบาทครับ', phonetic: 'x', english: 'This house costs two million baht.', prompt: 'He says the house price' }] }
let POOL = []
function mock(c, opt = {}) {
  const calls = { total: 0, recovery: {} }
  c.mockGeminiGenerate = async (k, m, msgs) => {
    calls.total++
    if (opt.hold) await opt.hold
    if (opt.down) throw new Error('Failed to fetch')
    const q = msgs[msgs.length - 1].content
    if (/native Thai speaker checking/.test(q)) return JSON.stringify([...q.matchAll(/^(\d+)\. Thai: (.*)$/gm)].map(x => ({ i: +x[1], s: (opt.unnatural || []).some(u => x[2].includes(u)) ? 2 : 5, note: 'mock' })))
    if (/Judge this short scene/.test(q)) return JSON.stringify({ A: 5, B: 5, C: 5, D: 5, E: 5, brokenAtPair: null, reason: 'mock' })
    if (/Judge the WHOLE listening track/.test(q)) return JSON.stringify({ scenes: [...q.matchAll(/^Scene (\d+)/gm)].map(m => ({ scene: +m[1], pass: true, breakAfterLine: null, reason: 'mock' })), overall: 5, reason: 'mock' })
    // v656: the fresh-conversation composer, written from the fixture's verified sentences (+ the good
    // replacement sentences in REC for the targets whose fixture lines are implausible or absent)
    { const r0 = require('./ln_mock').lnRespond(q, POOL, opt.ln); if (r0) return r0 }
    return '[]'
  }
  return calls
}
const textOf = n => n == null ? '' : typeof n === 'string' ? n : Array.isArray(n) ? n.map(textOf).join(' ') : textOf(n.children)
const flush = async () => { for (let i = 0; i < 30; i++) await new Promise(r => setImmediate(r)) }
async function renderGate(c, track, vocab, extra = {}) {
  let r
  await TR.act(async () => { r = TR.create(React.createElement(c.ListenFirstGate, { track, lang: 'th', vocab, apiKey: 'k', model: 'm', onProceed: () => {}, autoCreate: false, ...extra })); await flush() })
  return { r, text: () => textOf(r.toJSON()).replace(/\s+/g, ' '), buttons: () => r.root.findAll(n => n.type === 'button') }
}
function withConsole(c) { const logs = []; c.console.info = (...a) => logs.push(a.join(' ')); return logs }

;(async () => {
  const r = await main()
  const base = r.track
  POOL = Object.entries(REC).map(([th, arr]) => { const k = base.keywords.find(x => x.thai === th); return { ...arr[0], english: 'He talks about money.', speaker: 'A', pairType: 'content', targetId: k && k.wordId } }).concat(base.pairs.filter(p => !/หมื่น|แสน|ล้าน/.test(p.thai || '')))   // the fixture's implausible restaurant prices are not what a composer writes
  const NEW = ['เสื้อ', 'ขนม', 'เกลือ', 'น้ำแข็ง', 'เบา']
  const mkDaily = (createdAt, mode = 'daily') => ({ ...base, createdAt, mode, trackMode: mode, listeningBuild: undefined,
    keywords: base.keywords.map(k => mode === 'daily' && NEW.includes(k.thai) ? { ...k, isNew: true, isUnseen: true } : { ...k, isNew: false, isUnseen: false }),
    targetCounts: { selectedTargetCount: 30, newTargetCount: mode === 'daily' ? 5 : 0, requiredListeningTargetCount: 30, generationTargetCount: 30, unresolvedTargets: [], mode } })
  // v649: Main Track lines that passed the semantic audit are reused as VERIFIED by Listening, so a model
  // outage no longer fails their build. The outage scenarios (D, I) use a track WITHOUT Main Track verdicts.
  const noVerdicts = t => ({ ...t, pairs: t.pairs.map(p => { const { _semanticState, _semanticUnverified, ...rest } = p; return rest }) })
  const dailyVocab = r.vocab.map(w => NEW.includes(w.thai) ? { ...w, lastSeen: null, introducedAt: null, status: 'new', lapses: 0, okStreak: 0, dueDate: null } : w)

  const c = load('tt.compiled.js', { React }); withConsole(c)
  // ── A / B: Daily and Revision end with their Main Track — 0 Listening calls, nothing persisted ──
  for (const [id, mode] of [['A', 'daily'], ['B', 'revision']]) {
    const m = mock(c); const before = m.total
    const t0 = mkDaily('2026-10-01T0' + (id === 'A' ? 1 : 2) + ':00:00.000Z', mode)
    let saved = null; const hlog = []
    const fin = await c.completeThaiTrackHandoff(t0, t0, { tracks: [], vocab: dailyVocab, apiKey: 'k', model: 'm', saveTracks: async t => { saved = t }, onLog: x => hlog.push(x) })
    const stored = JSON.parse(c.localStorage.getItem('tt-listening-v1') || '{}')
    T(id, (mode === 'daily' ? 'Daily' : 'Revision') + ' Track: the Main Track is saved and the flow ENDS — 0 Listening model calls, no listeningBuild, nothing in the Listening store',
      m.total === before && !fin.listeningBuild && saved && saved.length === 1 && !saved[0].listeningBuild && !((stored.th || {})[t0.createdAt]) &&
      hlog.some(x => /MAIN_TRACK_SAVED .*LISTENING_CALLS=0/.test(x)) && !c.trackHasLegacyListening(fin), { calls: m.total - before, hlog })
  }
  // ── an OLDER track that already has a stored Listening (built the v644–v657 way) ──
  const cOld = load('tt.compiled.js', { React }); withConsole(cOld); mock(cOld)
  const tOld = mkDaily('2026-09-28T05:33:01.660Z')
  const built = await cOld.buildAndPersistListening(tOld, dailyVocab, { lang: 'th', apiKey: 'k', model: 'm', creationMode: 'AUTO_PRETRACK' })
  const oldTrack = { ...tOld, listeningBuild: built.listeningBuild }
  const cP = load('tt.compiled.js', { React }); withConsole(cP); mock(cP, { ln: { skip: base.keywords.filter(k => !NEW.includes(k.thai)).slice(0, 3).map(k => k.wordId) } })
  const tP = mkDaily('2026-09-28T09:00:00.000Z')
  const builtP = await cP.buildAndPersistListening(tP, dailyVocab, { lang: 'th', apiKey: 'k', model: 'm', creationMode: 'AUTO_PRETRACK' })
  const partialTrack = { ...tP, listeningBuild: builtP.listeningBuild }
  const reload = async (from, track, vocab) => {
    const c2 = load('tt.compiled.js', { React }); const l2 = withConsole(c2); const m2 = mock(c2)
    ;['tt-listening-v1'].forEach(k => { const v = from.localStorage.getItem(k); if (v != null) c2.localStorage.setItem(k, v) })
    const g = await renderGate(c2, track, vocab)
    return { c2, g, calls: m2.total, load: l2.find(m => /LISTENING_SCREEN_LOAD/.test(m)) || 'MISSING' }
  }
  const rF = await reload(cOld, oldTrack, dailyVocab)
  T('F', 'compatibility: a stored READY Listening of an older track still LOADS and PLAYS from storage (no rebuild, 0 model calls), with its coverage label',
    built.listeningBuild.status === 'READY' && cOld.trackHasLegacyListening(oldTrack) && rF.calls === 0 && rF.load.includes('LISTENING_TRACK_ID=' + built.listeningBuild.listeningTrackId) &&
    /Start Listening/.test(rF.g.text()) && /TARGET COVERAGE 30\/30/.test(rF.g.text()) && !/Rebuild/.test(rF.g.text()), rF.g.text().slice(0, 200))
  const rG = await reload(cP, partialTrack, dailyVocab)
  T('G', 'compatibility: a stored PARTIAL Listening loads read-only — "Listening track needs repair", NOT playable, no rebuild from the Main Track (Continue only)',
    builtP.listeningBuild.status === 'PARTIAL' && rG.calls === 0 && /Listening track needs repair/.test(rG.g.text()) && !/Start Listening/.test(rG.g.text()) && !/Rebuild/.test(rG.g.text()) && /Continue to Main Track/.test(rG.g.text()),
    rG.g.text().slice(0, 240))
  // H / D: a track with no stored Listening, or a stored FAILED one — never a child build
  const cH = load('tt.compiled.js', { React }); withConsole(cH); const mH = mock(cH)
  const legacy = mkDaily('2026-09-20T05:00:00.000Z')
  const gH = await renderGate(cH, legacy, dailyVocab)
  T('H', 'a track with no stored Listening never offers "Create Listening Track": it points to the Listening Track button; 0 calls; the app does not even route new tracks through the gate',
    !cH.trackHasLegacyListening(legacy) && /Listening is now its own track/.test(gH.text()) && !/Create Listening Track/.test(gH.text()) && mH.total === 0 &&
    gH.buttons().map(b => textOf(b.children)).join('|') === 'Continue to Main Track', gH.text().slice(0, 200))
  const failed = { ...mkDaily('2026-09-21T05:00:00.000Z'), listeningBuild: { status: 'FAILED', mainTrackId: '2026-09-21T05:00:00.000Z', failureReason: 'LISTENING_BUILD_ERROR: boom', unresolvedTargetIds: [] } }
  const gD = await renderGate(cH, failed, dailyVocab)
  T('D', 'a stored FAILED build shows its reason with Continue only (no Retry — a retry would be a child build)',
    /Listening build failed/.test(gD.text()) && gD.text().includes('boom') && gD.buttons().map(b => textOf(b.children)).join('|') === 'Continue to Main Track' && mH.total === 0)
  // X: export of an older track still carries its LISTENING BUILD block
  cOld.Blob = class { constructor(parts) { cOld.__blob = parts.join('') } }
  cOld.URL = { createObjectURL: () => 'b', revokeObjectURL() {} }
  cOld.document.createElement = () => ({ click() {}, style: {} }); cOld.document.body.removeChild = () => {}
  await cOld.downloadTrack(oldTrack)
  const blk = (cOld.__blob.split('LISTENING BUILD')[1] || '').split('\n\n')[0]
  T('X', 'compatibility: the export of an older track still carries its LISTENING BUILD block (status, ids, coverage)', /Status: READY/.test(blk) && /TARGET COVERAGE 30\/30/.test(blk), blk.slice(0, 300))
  // source: no automatic Listening creation path is left
  const src = require('fs').readFileSync(__dirname + '/tt.jsx', 'utf8')
  T('S', 'source: no AUTO_PRETRACK build call, no Generator / JA-ZH tail Listening build, the gate cannot build (LISTENING_CHILD_TRACK_BUILDS = false)',
    !/ensureThaiListeningBuilt\(_finalTrack/.test(src) && !/ensureListeningBuilt\(fin, o\.vocab/.test(src) && !/creationMode: 'AUTO_PRETRACK'/.test(src.replace(/\/\/.*$/gm, '')) &&
    /const LISTENING_CHILD_TRACK_BUILDS = false/.test(src) && !/ensureThaiListeningBuilt\(track, o\.vocab/.test(src))
  console.log(out.join('\n') + '\n\n' + (fails ? fails + ' FAILED' : 'all passed') + ' (' + out.filter(l => /^(PASS|FAIL)/.test(l)).length + ' checks)')
})()
