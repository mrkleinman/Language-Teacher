// v641 Part B — fail-closed Listening quality (D–M) + truthful Main Track claims
const { main } = require('./tests'), { load } = require('./harness'), React = require('react'), RDS = require('react-dom/server')
const out = []; let fails = 0
const T = (id, name, pass, detail) => { if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + id.padEnd(3) + name + (detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')) }
const GOOD = { 'ตื่น': { thai: 'พรุ่งนี้ผมต้องตื่นเช้าครับ', phonetic: 'x', english: 'I have to wake up early tomorrow.', prompt: 'He says he must wake early' },
               'หมื่น': { thai: 'ผมมีเงินหนึ่งหมื่นบาทครับ', phonetic: 'x', english: 'I have ten thousand baht.', prompt: 'He says' },
               'แสน': { thai: 'บ้านนี้ราคาสามแสนบาทครับ', phonetic: 'x', english: 'This house costs three hundred thousand baht.', prompt: 'He says' },
               'ล้าน': { thai: 'บ้านหลังนี้ราคาสองล้านบาทครับ', phonetic: 'x', english: 'This house costs two million baht.', prompt: 'He says' } }
// opt: natDown (all quality calls throw) · omit: [thai substrings with no verdict] · reject: [...] · recDown · recNatOmit · sceneDown
function mock(c, opt = {}) {
  const calls = { recovery: {}, nat: 0 }
  c.mockGeminiGenerate = calls.fn = async (k, m, msgs) => {
    const q = msgs[msgs.length - 1].content
    if (/native Thai speaker checking/.test(q)) {
      calls.nat++
      if (opt.natDown) throw new Error('Failed to fetch')
      const items = [...q.matchAll(/^(\d+)\. Thai: (.*)$/gm)]
      if (opt.recNatDown && items.length === 1 && Object.entries(GOOD).some(([t, g]) => g.thai === items[0][2] && (opt.recNatDown === true || opt.recNatDown.includes(t)))) throw new Error('Failed to fetch')
      return JSON.stringify(items.filter(x => !(opt.omit || []).some(u => x[2].includes(u)))
        .map(x => ({ i: +x[1], s: (opt.reject || []).some(u => x[2].includes(u)) || /ผมตื่นห้าทุ่มครับ/.test(x[2]) ? 2 : 5, note: 'mock' })))
    }
    if (/Judge this short scene/.test(q)) { if (opt.sceneDown) throw new Error('Failed to fetch'); return JSON.stringify({ A: 5, B: 5, C: 5, D: 5, E: 5, reason: 'mock' }) }
    if (/Judge the WHOLE listening track/.test(q)) { if (opt.sceneDown) throw new Error('Failed to fetch'); return JSON.stringify({ scenes: [...q.matchAll(/^Scene (\d+)/gm)].map(m => ({ scene: +m[1], pass: true, breakAfterLine: null, reason: 'mock' })), overall: 5, reason: 'mock' }) }
    if (/ONE line of Thai listening practice/.test(q)) {
      const t = (q.match(/contains the exact word "([^"]+)"/) || [])[1]
      calls.recovery[t] = (calls.recovery[t] || 0) + 1
      if (opt.recDown) throw new Error('Failed to fetch')
      return GOOD[t] ? JSON.stringify(GOOD[t]) : 'no idea'
    }
    return '[]'
  }
  return calls
}
;(async () => {
  const r = await main(); const c = r.c
  // v649: FINAL_TRACK lines that already passed the Main Track semantic audit are REUSED as verified
  // (same model judgement, same immutable sentence — no second paid call). These fail-closed checks
  // exercise the Listening verdict path, so they use a legacy track without Main Track verdicts.
  const verifiedBase = { ...r.track, mode: 'revision', trackMode: 'revision' }
  const base = { ...verifiedBase, pairs: verifiedBase.pairs.map(p => { const { _semanticState, _semanticUnverified, ...rest } = p; return rest }) }
  const kid = t => base.keywords.find(k => k.thai === t).wordId
  const build = async (opt, extra = {}) => { const log = []; const calls = mock(c, opt); const res = await c.buildListeningTrack(base, r.vocab, { lang: 'th', apiKey: 'k', model: 'm', onLog: x => log.push(x), ...extra }); return { res, lt: res.listeningTrack, log, calls } }
  const row = (lt, t) => lt.coverage.rows.find(x => x.target === t)

  // v656 — the anchor path (D–M, RU, V of v641/v649) is retired; the SAME fail-closed principles now apply to the
  // fresh conversation: a line or conversation that cannot be verified is never READY and never played.
  // v669: the composer pool is the fixture's verified sentences minus its implausible restaurant prices (a composer
  // does not write a 300,000-baht lunch; the deterministic coherence check rejects such a scene), plus plausible
  // replacement sentences for those number targets — the same pool tests10 uses
  const kidOf = t => (base.keywords.find(k => k.thai === t) || {}).wordId
  const LNPOOL = [['ตื่น', 'พรุ่งนี้ผมต้องตื่นเช้าครับ', 'I have to wake up early tomorrow.'], ['หมื่น', 'ผมมีเงินหนึ่งหมื่นบาทครับ', 'I have ten thousand baht.'],
    ['แสน', 'บ้านนี้ราคาสามแสนบาทครับ', 'This house costs three hundred thousand baht.'], ['ล้าน', 'บ้านหลังนี้ราคาสองล้านบาทครับ', 'This house costs two million baht.']]
    .map(([t, thai, english]) => ({ thai, english, phonetic: 'x', speaker: 'A', pairType: 'content', targetId: kidOf(t) }))
    .concat(base.pairs.filter(p => !/หมื่น|แสน|ล้าน/.test(p.thai || '')))
  const lnOn = () => { c.__lnPool = LNPOOL }
  const build2 = async (opt) => { lnOn(); const log = []; const calls = mock(c, opt); const _m = calls.fn
    c.mockGeminiGenerate = async (k, m, msgs, max, o2) => { const q = msgs[msgs.length - 1].content; const r0 = require('./ln_mock').lnRespond(q, LNPOOL, opt.ln); if (r0 && !opt.composeDown) return r0; if (r0 && opt.composeDown) throw new Error('Failed to fetch'); return _m(k, m, msgs, max, o2) }
    const res = await c.buildListeningTrack(base, r.vocab, { lang: 'th', apiKey: 'k', model: 'm', onLog: x => log.push(x) }); return { res, lt: res.listeningTrack, log, calls } }
  const readyIff = x => !x.lt || ((x.lt.readiness === 'READY') === Object.values(x.lt.gates).every(v => v === true || v === 'PASS' || typeof v === 'number' || /^\d+\/\d+$/.test(String(v))))
  const nd = await build2({ natDown: true })
  T('F', 'naturalness verdicts unavailable ⇒ NATURALNESS gate FAIL (fail-closed) ⇒ Listening NOT_READY, never played',
    nd.lt && nd.lt.gates.NATURALNESS === false && nd.lt.readiness === 'NOT_READY' && (nd.lt.issues || []).some(x => x.code === 'NATURALNESS_UNVERIFIED'), nd.lt && nd.lt.gates)
  const rj = await build2({ reject: ['เสื้อ'] })
  // v673 §3E — naturalness is a PHASE COMMIT gate: the unrepairable unnatural line's phase is never committed (no
  // COMMIT_WITH_DEFECTS), so the defect never reaches the conversation — NOT_READY either way
  T('E', 'a line judged unnatural that repair cannot fix ⇒ (v673) its phase is NOT committed (naturalness is a phase-commit gate) or NATURALNESS FAIL ⇒ NOT_READY (never counted as a verified conversation)',
    rj.lt && rj.lt.readiness === 'NOT_READY' && ((rj.lt.gates.NATURALNESS === false && (rj.lt.issues || []).some(x => x.code === 'UNNATURAL')) ||
      (rj.log.some(x => /NATURALNESS_FAIL/.test(x)) && rj.log.some(x => /PHASE_NOT_COMMITTED|LISTENING_GLOBAL_REPLAN/.test(x)) && rj.lt.gates.COVERAGE_PASS === false)), rj.lt && { g: rj.lt.gates, codes: [...new Set((rj.lt.issues || []).map(x => x.code))], nat: rj.log.filter(x => /เสื้อ|UNNATURAL|NATURAL/.test(x)).slice(0, 12) })
  const sd = await build2({ sceneDown: true })
  T('M2', 'whole-conversation coherence verdict unavailable ⇒ WHOLE_CONVERSATION_COHERENCE=UNVERIFIED ⇒ NOT_READY',
    sd.lt && sd.lt.gates.WHOLE_CONVERSATION_COHERENCE === 'UNVERIFIED' && sd.lt.readiness === 'NOT_READY', sd.lt && sd.lt.gates)
  const cd = await build2({ composeDown: true })
  T('M', 'composition model unavailable ⇒ no Listening track at all (nothing unverified is played)', !cd.res.ok && !cd.lt, { ok: cd.res.ok, q: cd.res.listeningQuality })
  const lk = c.listeningCoverageLabel(nd.lt, base)
  T('K', 'UI label for a NOT_READY build: TARGET COVERAGE x/30 · NEW · REVIEW · "LISTENING TRACK NEEDS REPAIR" (never a green READY)',
    /^TARGET COVERAGE \d+\/30 · NEW \d+\/\d+ · REVIEW \d+\/\d+/.test(lk) && /LISTENING TRACK NEEDS REPAIR$/.test(lk), lk)
  const ex = c.listeningCoverageExportLines(nd.lt).join('\n')
  T('L', 'export shows the gates, the issues (with line numbers) and per-target occurrences / line IDs',
    /LISTENING_TARGET_COVERAGE \d+\/30/.test(ex) && /Gates: .*NATURALNESS=false/.test(ex) && /ISSUE NATURALNESS_UNVERIFIED line \d+/.test(ex) && /TARGET \| TARGET_ID \| NEW \| OCCURRENCES \| LINE_IDS \| STATUS/.test(ex), ex.slice(0, 500))
  T('V', 'READY ⇔ every Listening gate PASS, on every build', [nd, rj, sd].every(readyIff))
  // §10 — Main Track UI never claims an audit that did not run (real React render)
  const cr = load('tt.compiled.js', { React })
  const html = a => RDS.renderToStaticMarkup(React.createElement(cr.TrackQuality, { track: { pairs: base.pairs, _closedVocab: { remainingIllegalPairs: 0 }, _semanticAudit: a } }))
  const down = html({ cueMismatch: 0, cueCheck: 'UNAVAILABLE: Failed to fetch', naturalnessCheck: 'UNAVAILABLE: Failed to fetch' })
  const partial = html({ cueMismatch: 0, cueCheck: 'ran', naturalnessCheck: 'UNAVAILABLE: Failed to fetch' })
  const fine = html({ cueMismatch: 0, cueCheck: 'ran', naturalnessCheck: 'ran (82/82 judged)' })
  T('N', 'Main Track panel: "meaning audited" only when the check ran; outage shown as NOT audited',
    /meaning NOT audited/.test(down) && !/✅ meaning audited/.test(down) && /naturalness NOT audited/.test(partial) && /meaning audited/.test(partial) && /✅ naturalness audited/.test(fine),
    { outage: down.replace(/<[^>]+>/g, ' ').match(/vocabulary[^%]*$/)[0].trim().slice(0, 120) })
  console.log(out.join('\n') + '\n\n' + (fails ? fails + ' FAILED' : 'all passed'))
})().catch(e => { console.error(e); process.exit(1) })
