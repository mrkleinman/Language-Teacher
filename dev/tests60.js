// v703 — owner review of the live v702 Thai Daily track (thai-track-15-Oct-2026-daily.txt, 90/90 READY but 6.0/10) and the
// "To reach 8/10" plan (Stage 2: a failed repair must never restore the original).
//   A  a line QC flagged is never kept because its rewrite failed (pairs 11, 73) — its slot goes to quota recovery
//   B  unnatural / wrong-sense Thai that passed QC (27, 28, 33, 46, 50) · C romantic promises to a friend (15–17)
//   D  three near-identical recalls (33–35) · E cues naming the wrong person (4, 5, 7, 10, 13, 54, 67, 68, 80, 92, 93)
//   F  English that says more than the Thai (54, 68) · G lost reply space (20) · H greeting after the catch-up · I version labels
// Real app code throughout; the model is simulated at the transport boundary (tests14). No provider calls.
//   node tests60.js            (current build: tt.compiled.js, or TT_FILE)
'use strict'
const fs = require('fs')
const { load } = require('./harness')
const { setup, makeTrack, mock } = require('./tests14')
const out = []; let fails = 0, n = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + String(id).padEnd(4) + ' ' + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 1500) : '')) }
const FILE = process.env.TT_FILE || 'tt.compiled.js'
const SRC = fs.readFileSync('tt.jsx', 'utf8')
const FIX = fs.readFileSync('sandbox/thai-daily-v702-fixture/thai-track-15-Oct-2026-daily.txt', 'utf8')
const SCENE_TEXT = (FIX.match(/^SCENE: .*$/m) || [''])[0]
function exportPairs() {
  const P = []
  for (const b of FIX.split(/\n(?=\[\d{3}\] )/)) { const m = /^\[(\d{3})\] (.*)/.exec(b); if (!m) continue
    const g = k => ((new RegExp('^\\s*' + k + ':\\s*(.*)$', 'm')).exec(b) || [, ''])[1].trim()
    P.push({ n: +m[1], prompt: m[2], thai: g('TH'), english: g('EN'), pairType: (/TYPE: (\w+)/.exec(b) || [])[1], targetSurface: (/TARGET: (\S+)/.exec(b) || [])[1],
      targetId: +((/TARGET_ID: (\d+)/.exec(b) || [])[1] || 0) || null, speaker: (/SPEAKER: (\w)/.exec(b) || [])[1] }) }
  return P
}
const KEY = 'k', MODEL = 'gemini-2.5-flash-lite'

;(async () => {
  const c = load(FILE); c.console.info = () => {}; c.console.warn = () => {}
  const P = exportPairs(), byN = k => P.find(p => p.n === k)
  T('X0', 'the fixture is the complete live v702 export: 94 lines, 90 target lines, Thana (A) and Nida (B), close friends', P.length === 94 && P.filter(p => p.pairType === 'content').length === 90 && /close friend/.test(SCENE_TEXT))

  // ══ A — a QC-flagged line is never kept because its rewrite failed ══
  try {
    const S = setup('th'), cc = S.c
    const tr = makeTrack(S, 'th', { tag: '-v703qc' }); tr.scene = { characterA: 'Thana, a man', characterB: 'Nida, a woman, his close friend' }
    const tLose = S.targets[5], tLong = S.targets[6]
    const gp = (t, id) => t.pairs.filter(p => p && p.targetId === id && p.pairType === 'content')
    const loseOrig = gp(tr, tLose.id).map(p => p.thai), longOrig = gp(tr, tLong.id).map(p => p.thai)
    // a rewrite above this learner's hardMax (the live one was 9 units > 7; the test learner's hardMax is higher)
    const LONG = p => p.thai.replace(/(ครับ|ค่ะ|คะ)$/, '') + 'และเราไปกินข้าวที่ร้านใกล้ๆบ้านด้วยกันตอนเย็นนี้แล้วก็ไปดูหนังที่ห้างใหญ่ใกล้ๆสถานีรถไฟด้วยกันกับเพื่อนอีกสองคนไหม' + (p.speaker === 'B' ? 'คะ' : 'ครับ')
    const _cc = cc.getLearnerComplexityContract({ lang: 'th', vocab: S.vocab })
    T('A0', 'precondition: the scripted rewrite is above the learner\'s hardMax and the original is not', _cc.analyse(LONG(gp(tr, tLong.id)[1])).overHardMax && !_cc.analyse(gp(tr, tLong.id)[1].thai).overHardMax, _cc.analyse(LONG(gp(tr, tLong.id)[1])))
    mock(S, 'th', {}); const inner = S._mockFn
    cc.mockGeminiGenerate = async (k, m, msgs, max, o) => {
      const q = msgs[msgs.length - 1].content
      if (/Evaluate this Thai language learning group/.test(q)) {
        const tw = (q.match(/Target word: "([^"]+)"/) || [])[1]
        if (tw === tLose.thai) return JSON.stringify({ action: 'improve', reason: 'The third line is an odd thing to say to a friend.' })
        if (tw === tLong.thai) return JSON.stringify({ action: 'improve', reason: 'The second line glues two unrelated statements together.' })
        return JSON.stringify({ action: 'clean', reason: 'ok' })
      }
      if (/Fix this Thai learning group/.test(q)) {
        const tw = (q.match(/Target word: "([^"]+)"/) || [])[1]
        if (tw === tLose.thai) return JSON.stringify(gp(tr, tLose.id).map((p, k) => ({ speaker: p.speaker, thai: k === 2 ? 'ใช่ครับ ไปด้วยกันไหมครับ' : p.thai, english: k === 2 ? 'Yes, shall we go together?' : p.english, prompt: p.prompt })))
        if (tw === tLong.thai) return JSON.stringify(gp(tr, tLong.id).map((p, k) => ({ speaker: p.speaker, thai: k === 1 ? LONG(p) : p.thai, english: p.english, prompt: p.prompt })))
      }
      return inner(k, m, msgs, max, o)
    }
    const logs = []
    const q = await cc.runQualityCheckCore(tr, KEY, MODEL, { vocab: S.vocab, onLog: m => logs.push(m), deferMetadata: true })
    const lose = gp(q, tLose.id), long = gp(q, tLong.id)
    T('A1', 'pair 11 (live): the rewrite of a flagged line lost the target — the flagged ORIGINAL is marked QC_FLAGGED_NOT_REPAIRED, not kept as a valid line (was "(original kept)")',
      lose[2] && lose[2].thai === loseOrig[2] && /^QC_FLAGGED_NOT_REPAIRED/.test(lose[2]._qcInvalid || '') && /TARGET_MISSING/.test(lose[2]._qcInvalid) && lose[2]._qcAvoid === loseOrig[2] &&
      !lose[0]._qcInvalid && !lose[1]._qcInvalid && logs.some(l => /is NOT kept; its slot goes to quota recovery/.test(l)) && !logs.some(l => /original kept/.test(l)), { lose: lose.map(p => [p.thai, p._qcInvalid]), logs: logs.filter(l => /QC improve/.test(l)) })
    T('A2', 'pair 73 (live): the rewrite was over the learner\'s length limit — the flagged original is marked invalid the same way; the unflagged lines of the group are untouched',
      long[1] && /^QC_FLAGGED_NOT_REPAIRED/.test(long[1]._qcInvalid || '') && /units > max/.test(long[1]._qcInvalid) && !long[0]._qcInvalid && !long[2]._qcInvalid, long.map(p => [p.thai, p._qcInvalid]))
    T('A3', 'the QC report counts it (flaggedNotKept = 2)', q.counts && q.counts.flaggedNotKept === 2, q.counts)
    const flog = []
    const ft = await cc.finaliseMainTrack({ ...tr, pairs: q.pairs }, cc.ev('TRACK_ADAPTERS').th, { vocab: S.vocab, apiKey: KEY, model: MODEL, qcRan: true, onLog: m => flog.push(m) })
    const valid = ft.integrity.quota.rows.reduce((a, r) => a + Math.min(3, r.valid), 0)
    T('A4', 'their slots are recovered through the normal fail-closed quota recovery: 90/90, and neither flagged sentence is in the saved track',
      valid === 90 && !ft.pairs.some(p => p && p.thai === loseOrig[2] && !p._qcInvalid) && !ft.pairs.some(p => p && p.thai === longOrig[1] && !p._qcInvalid) && flog.some(l => /QUOTA RECOVERY/.test(l)),
      { valid, rows: ft.integrity.quota.rows.filter(r => r.valid !== 3).map(r => [r.target, r.valid]) })
  } catch (e) { T('ERR', 'section A crashed: ' + String(e && e.stack).slice(0, 500), false) }

  // ══ B — unnatural / wrong-sense Thai the judges passed ══
  try {
    const ids = k => c.thaiLexicalSenseProblems(byN(k), byN(k).targetSurface).map(x => x.id)
    const want = { 27: 'NI_KHRAP_AFTER', 28: 'NI_KHRAP_AFTER', 33: 'TODAY_LONG_TIME', 46: 'REASON_PEN_ARAI', 50: 'QWORD_INDEFINITE_SENSE' }
    const miss = Object.entries(want).filter(([k, id]) => !ids(+k).includes(id)).map(([k, id]) => k + ' ' + byN(+k).thai + ' (' + id + ')')
    T('B1', 'each reviewed line is rejected by an objective rule: 27 ช้อนนะ นี่ครับ · 28 อร่อยไหม นี่ครับ · 33 วันนี้ไม่ได้เจอกันตั้งนาน · 46 เหตุผล…เป็นอะไร · 50 ชื่ออะไรก็ได้ (a different sense)', !miss.length, miss)
    const flagged = P.filter(p => p.pairType === 'content' && c.thaiLexicalSenseProblems(p, p.targetSurface).length).map(p => p.n)
    T('B2', 'across the whole v702 export nothing else is flagged by the lexical rules (no false positives on the other 85 target lines)', JSON.stringify(flagged) === JSON.stringify([27, 28, 33, 46, 50]), flagged)
    const ok = [['นี่ครับ ช้อนครับ', 'นี่ครับ'], ['นี่ครับ ลองชิมดูนะครับ', 'นี่ครับ'], ['ไม่ได้เจอกันตั้งนานเลยนะครับ', 'ไม่ได้เจอกันตั้งนาน'], ['เหตุผลในการมาคืออะไรคะ', 'เหตุผลในการมา'],
      ['ร้านนี้ชื่ออะไรคะ', 'ชื่ออะไร'], ['อะไรก็ได้ค่ะ', 'ขอบคุณ'], ['กินอะไรก็ได้ครับ', 'กิน'], ['วันนี้เจอกันที่ร้านนะครับ', 'วันนี้']]
    const fp = ok.filter(([t, tg]) => c.thaiLexicalSenseProblems({ thai: t, english: '' }, tg).length)
    T('B3', 'the natural forms pass (นี่ครับ first · ไม่ได้เจอกันตั้งนานเลย · เหตุผล…คืออะไร · ร้านนี้ชื่ออะไร), and อะไรก็ได้ is fine when the target is NOT the question word', !fp.length, fp)
    const G = c.ev('THAI_USAGE_TARGET_GUIDE')
    T('B4', 'teaching guides steer the writer for the v702 words: ตลอดไป, เสมอ (no swapping), ไม่ได้เจอกันตั้งนาน (start of the talk, three different jobs), นี่ครับ (first), เหตุผลในการมา (คือ), ชื่ออะไร (a question)',
      ['ตลอดไป', 'เสมอ', 'ไม่ได้เจอกันตั้งนาน', 'นี่ครับ', 'เหตุผลในการมา', 'ชื่ออะไร'].every(w => typeof G[w] === 'string') && /Do not swap it for เสมอ/.test(G['ตลอดไป']) && /Do not swap it for ตลอดไป/.test(G['เสมอ']) && /START of a conversation/.test(G['ไม่ได้เจอกันตั้งนาน']))
  } catch (e) { T('ERR', 'section B crashed: ' + String(e && e.stack).slice(0, 300), false) }

  // ══ C — relationship ══
  try {
    const rel = k => c.thaiRelationshipProblem(byN(k).thai, SCENE_TEXT)
    T('C1', 'pairs 15–17: a romantic promise to the listener is a RELATIONSHIP_MISMATCH when the scene says they are close friends', [15, 16, 17].every(k => /^RELATIONSHIP_MISMATCH/.test(rel(k) || '')), [15, 16, 17].map(rel))
    T('C2', 'no other v702 target line is flagged; the same lines are fine for a couple; friendship / wedding-wish forms pass',
      P.filter(p => p.pairType === 'content' && ![15, 16, 17].includes(p.n) && c.thaiRelationshipProblem(p.thai, SCENE_TEXT)).length === 0 &&
      !c.thaiRelationshipProblem(byN(15).thai, 'Thana and his wife Nida plan their anniversary dinner') &&
      !['เราจะเป็นเพื่อนกันตลอดไปนะครับ', 'ขอให้ทั้งสองคนรักกันตลอดไปค่ะ', 'ผมจะจำวันนี้ไว้ตลอดไปครับ', 'เขาเชื่อใจผมเสมอครับ'].some(t => c.thaiRelationshipProblem(t, SCENE_TEXT)))
    T('C3', 'it is enforced where lines are accepted: the early generation gate (regenerated at once) and the final snapshot audit (slot recovered)',
      /const rel = !c && !echo && thaiRelationshipProblem\(p\.thai, scene/.test(SRC) && /thaiRelationshipProblem\(p\.thai, _st\)/.test(SRC))
  } catch (e) { T('ERR', 'section C crashed: ' + String(e && e.stack).slice(0, 300), false) }

  // ══ D — three near-identical recalls ══
  try {
    const e = k => c.thaiBareEcho(byN(k).thai, byN(k).targetSurface)
    T('D1', 'pairs 33–35 are all bare echoes of ไม่ได้เจอกันตั้งนาน (only particles / ใช่ / แล้ว / มาก / วันนี้ around it)', e(33) && e(34) && e(35))
    T('D2', 'a line that does something with the target is not an echo (ไม่ได้เจอกันตั้งนาน สบายดีไหมครับ · ผมไม่ไหวครับ · แล้วคุณล่ะครับ after a statement)',
      !c.thaiBareEcho('ไม่ได้เจอกันตั้งนาน สบายดีไหมครับ', 'ไม่ได้เจอกันตั้งนาน') && !c.thaiBareEcho('ผมไม่ไหวครับ', 'ไหว') && !c.thaiBareEcho('ช่วงนี้ยุ่งมาก แล้วคุณล่ะครับ', 'แล้วคุณล่ะ'))
    const echoes = new Map(); const bad = []
    P.filter(p => p.pairType === 'content').forEach(p => { if (!c.thaiBareEcho(p.thai, p.targetSurface)) return; if (echoes.has(p.targetId)) bad.push(p.n); else echoes.set(p.targetId, p.n) })
    T('D3', 'over the whole export, only the ไม่ได้เจอกันตั้งนาน group has a second (and third) bare echo', JSON.stringify(bad) === JSON.stringify([34, 35]), bad)
    T('D4', 'the first echo is allowed, later ones are rejected — in the early generation gate and the final snapshot audit', /ECHO_RECALL: only repeats/.test(SRC) && /ECHO_RECALL: the line only repeats/.test(SRC))
  } catch (e) { T('ERR', 'section D crashed: ' + String(e && e.stack).slice(0, 300), false) }

  // ══ E — cues ══
  try {
    const lint = k => { const p = byN(k); return c.thaiFinalCueLint(p, { addr: p.speaker === 'A' ? 'f' : 'm', addrName: p.speaker === 'A' ? 'Nida' : 'Thana', names: ['Thana', 'Nida'] }) }
    const want = {
      4: 'Check that Thana is sincere with him.',
      5: 'Tell her to just listen a bit, then say you have to speak sincerely.',
      7: 'Ask if he trusts Thana.',
      10: 'Ask if Thana always trusts him.',
      13: 'Ask if Thana forgives him.',
      42: 'Say Bangkokians like to come here.',
      67: 'Ask who he is going to the Grand Palace with.',
      80: "Then say you'll buy her a pair of shorts.",
      92: 'Then tell her to teach you slowly, please.',
      93: 'Tell her to take care of herself.',
    }
    const wrong = Object.entries(want).map(([k, w]) => [k, lint(+k).cue, w]).filter(([, got, w]) => got !== w)
    T('E1', 'the reviewed cues are rebuilt so the learner knows who does what: 10 "Ask whether he always trusts him." → "Ask if Thana always trusts him." · 80 "Offer to buy you…" → "…buy her…" · 5 two raw sentences · 92 "Then say teach you…" · 93 "them / themselves"', !wrong.length, wrong)
    const defective = P.filter(p => thaiDef(p).length).map(p => p.n)
    function thaiDef(p) { return c.thaiCueDefects(p.prompt, p, { addr: p.speaker === 'A' ? 'f' : 'm', addrName: p.speaker === 'A' ? 'Nida' : 'Thana' }) }
    T('E2', 'only defective cues are touched: 14 of 94 on the v702 export, every other cue is left exactly as it was', JSON.stringify(defective) === JSON.stringify([4, 5, 7, 10, 13, 29, 42, 54, 67, 68, 73, 80, 92, 93]), defective)
    const left = P.map(p => ({ p, r: lint(p.n) })).filter(x => x.r.defects.length && thaiDef({ ...x.p, prompt: x.r.cue }).length).map(x => x.p.n + ': ' + x.r.cue)
    T('E3', 'after the lint no cue on the export still has a detectable defect', !left.length, left)
    const fx = c.thaiFinalCueLint({ thai: 'คุณเชื่อใจเขาเสมอไหมคะ', english: 'Do you always trust him?', prompt: 'Ask if he always trusts her.', speaker: 'B' }, { addr: 'm', addrName: 'Thana', names: ['Thana', 'Nida'] })
    T('E4', 'a cue without a detectable defect is never rebuilt (meaning checks stay with the cue judge)', fx.cue === 'Ask if he always trusts her.' && !fx.fixed)
    T('E5', 'the lint runs at the start of every final snapshot audit, so a changed cue loses its old verdict and is judged again on its final text',
      /try \{ pairs = thaiFinalCueLintPass\(pairs, track, log\) \} catch/.test(SRC) && SRC.indexOf('pairs = thaiFinalCueLintPass(pairs, track, log)') > SRC.indexOf('async function thaiFinalSnapshotAudit'))
  } catch (e) { T('ERR', 'section E crashed: ' + String(e && e.stack).slice(0, 300), false) }

  // ══ F — English that says more than the Thai ══
  try {
    const e54 = c.thaiEnglishFaithfulFix(byN(54)), e68 = c.thaiEnglishFaithfulFix(byN(68))
    T('F1', 'pair 54: เลขาผมจัดนัดให้ครับ — "My secretary arranges appointments for me." (the Thai names no คุณ)', e54 === 'My secretary arranges appointments for me.', e54)
    T('F2', 'pair 68: งั้นไปพระบรมมหาราชวังกับคุณไหมครับ — "Then shall I go to the Grand Palace with you?" (was "how about going … with you")', e68 === 'Then shall I go to the Grand Palace with you?', e68)
    const p68 = { ...byN(68), english: e68 }; p68.prompt = c.cueFromEnglish('th', e68, p68.thai, { addr: 'f', names: [] })
    const l68 = c.thaiFinalCueLint(p68, { addr: 'f', addrName: 'Nida', names: ['Thana', 'Nida'] })
    T('F3', 'and its cue then names the listener: "Then ask if you should go to the Grand Palace with her."', l68.cue === 'Then ask if you should go to the Grand Palace with her.', [p68.prompt, l68.cue])
    T('F4', 'unchanged where the Thai does say it: "Then I\'ll ask the secretary for you." (ผมถามเลขาให้ — the speaker does it) and "I\'ll buy you shorts" (ให้คุณ)',
      c.thaiEnglishFaithfulFix(byN(56)) === byN(56).english && c.thaiEnglishFaithfulFix(byN(80)) === byN(80).english)
  } catch (e) { T('ERR', 'section F crashed: ' + String(e && e.stack).slice(0, 300), false) }

  // ══ G — spacing ══
  try {
    T('G1', 'pair 20: "ได้ ผมลองซาลาเปาครับ" keeps its reply space (live: collapsed to ได้ผมลอง…); ได้ inside a clause is still joined',
      c.normaliseThaiSpacing('ได้ ผมลองซาลาเปาครับ') === 'ได้ ผมลองซาลาเปาครับ' && c.normaliseThaiSpacing('ผม ไป ได้ ครับ') === 'ผมไปได้ครับ' && c.normaliseThaiSpacing('ได้ เลย ครับ') === 'ได้เลยครับ',
      [c.normaliseThaiSpacing('ได้ ผมลองซาลาเปาครับ'), c.normaliseThaiSpacing('ผม ไป ได้ ครับ'), c.normaliseThaiSpacing('ได้ เลย ครับ')])
  } catch (e) { T('ERR', 'section G crashed: ' + String(e && e.stack).slice(0, 300), false) }

  // ══ H — the greeting comes first ══
  try {
    const mkp = (n0, tid, surf, th) => ({ pairType: 'content', targetId: tid, targetSurface: surf, _target: surf, thai: th, english: 'x', prompt: 'Say x.', speaker: 'A', _pairKey: 'k' + n0 })
    const fr = (k, th) => ({ pairType: 'framing', thai: th, english: 'Hello', prompt: 'Greet', speaker: k, _pairKey: 'f' + k })
    const pairs = [fr('A', 'สวัสดีครับ'), fr('B', 'สวัสดีค่ะ'), mkp(1, 1, 'จริงใจ', 'ผมอยากพูดให้จริงใจครับ'), mkp(2, 1, 'จริงใจ', 'คุณจริงใจไหมคะ'), mkp(3, 1, 'จริงใจ', 'ผมจริงใจครับ'),
      mkp(4, 2, 'ไม่ได้เจอกันตั้งนาน', 'ไม่ได้เจอกันตั้งนาน สบายดีไหมครับ'), mkp(5, 2, 'ไม่ได้เจอกันตั้งนาน', 'ไม่ได้เจอกันตั้งนานเลยค่ะ'), mkp(6, 2, 'ไม่ได้เจอกันตั้งนาน', 'ไม่ได้เจอกันตั้งนาน เกือบปีแล้วนะครับ')]
    const log = []
    const o = c.thaiGreetingTargetsFirst(pairs, m => log.push(m))
    T('H1', '"long time no see" moves to just after the opening greeting, as a whole group; nothing else moves or changes',
      o.map(p => p._pairKey).join(',') === 'fA,fB,k4,k5,k6,k1,k2,k3' && log.some(l => /TH_GREETING_FIRST/.test(l)), o.map(p => p._pairKey))
    const o2 = c.thaiGreetingTargetsFirst(o, null)
    T('H2', 'already first → unchanged (idempotent)', o2.map(p => p._pairKey).join(',') === o.map(p => p._pairKey).join(','))
    T('H3', 'the finaliser applies it before the final snapshot audit (whose local-contradiction check then sees the final order)',
      // v706: the declaration became `let s1` (the scene-polish fix mode reassigns it); the ORDER this checks is unchanged
      SRC.indexOf('thaiGreetingTargetsFirst(t.pairs, log)') > 0 && SRC.indexOf('thaiGreetingTargetsFirst(t.pairs, log)') < SRC.search(/(?:const|let) s1 = await thaiFinalSnapshotAudit\(t, c, log\)/))
  } catch (e) { T('ERR', 'section H crashed: ' + String(e && e.stack).slice(0, 300), false) }

  // ══ I — the export says which code produced the track ══
  try {
    const v = c.ev('GENERATOR_VERSIONS').th + ' ' + c.ev('QC_VERSION') + ' ' + c.ev('FINALIZER_VERSION')
    // Expectation widened in v705: the labels move with each Thai Daily release (v705: scene polish); the point of I1 is that they
    // are no longer the v657 labels, so any v703–v709 label passes
    T('I1', 'the Thai generator / QC / finaliser labels are no longer the v657 ones the owner saw on v702 (th-gen-v70x…, qc-v70x…, final-v70x…)', /th-gen-v70[3-9]/.test(v) && /qc-v70[3-9]/.test(v) && /final-v70[3-9]/.test(v) && !/v657/.test(v), v)
  } catch (e) { T('ERR', 'section I crashed: ' + String(e && e.stack).slice(0, 300), false) }

  // ══ J — cost: prompt caching of the shared part of the Thai writer prompt ══
  try {
    const M = c.ev('PROMPT_CACHE_MARK')
    const rb = c.anthropicRequestBody({ model: 'claude-haiku-5-5', messages: [{ role: 'user', content: 'RULES …' + M + 'TARGET X' }], maxTokens: 1000 })
    const blk = rb.body.messages[0].content
    T('J1', 'Haiku request: the text before the mark is one cached block (cache_control ephemeral), the rest a plain block; no mark is sent',
      Array.isArray(blk) && blk.length === 2 && blk[0].text === 'RULES …' && blk[0].cache_control && blk[0].cache_control.type === 'ephemeral' && !blk[1].cache_control && !JSON.stringify(rb.body).includes(M), blk)
    const plain = c.anthropicRequestBody({ model: 'claude-haiku-5-5', messages: [{ role: 'user', content: 'no mark here' }], maxTokens: 1000 })
    T('J2', 'a prompt without the mark is sent exactly as before (a plain string, no cache_control)', plain.body.messages[0].content === 'no mark here')
    T('J3', 'Gemini (and any other provider) never sees the mark: it is replaced by a newline before the request is built',
      c.ev('stripPromptCacheMark')('a' + M + 'b') === 'a\nb' && /if \(!_optModel && \(messages \|\| \[\]\)\.some\(m => typeof m\.content === 'string' && m\.content\.includes\(PROMPT_CACHE_MARK\)\)\) messages = messages\.map/.test(SRC))
    // the real writer prompts of a mocked 6-target generation: the part before the mark is byte-identical for every target
    const S = setup('th'); mock(S, 'th', {}); const inner = S._mockFn, cap = []
    S.c.mockGeminiGenerate = async (k, m, msgs, max, o) => { cap.push(msgs.map(x => x.content).join('\n')); return inner(k, m, msgs, max, o) }
    await S.c.generateConversationTrack(S.targets.slice(0, 6), [], 'k', () => {}, S.vocab, 'm', null, { scene: 'Two friends at a café.', characterA: 'Thana, a Thai man', characterB: 'Nida, a Thai woman, his friend', opening: 'สวัสดีครับ', opening_english: 'Hello' })
    const gen = cap.filter(t => /The target word for this exchange is: /.test(t)), heads = new Set(gen.map(t => t.slice(0, t.indexOf(M))))
    const tg = new Set(gen.map(t => t.match(/The target word for this exchange is: (\S+)/)[1]))
    const share = gen.length ? Math.min(...gen.map(t => t.indexOf(M) / t.length)) : 0
    T('J4', 'the writer prompt: one identical shared part for all 6 targets (and their retries), ≥ 80% of each prompt; the target line comes after the mark',
      gen.length >= 6 && tg.size === 6 && heads.size === 1 && share >= 0.8 && gen.every(t => t.indexOf(M) > 0 && t.indexOf(M) < t.indexOf('The target word for this exchange is:')), { prompts: gen.length, targets: tg.size, distinctHeads: heads.size, share })
    // the server function forwards the cached block (and only an ephemeral cache_control, at most 4)
    const os = require('os'), path = require('path')
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lt-proxy60-')), modFile = path.join(tmp, 'anthropic.mjs')
    fs.writeFileSync(modFile, fs.readFileSync('../netlify/edge-functions/anthropic.js', 'utf8').replace(/^import Anthropic from "npm:@anthropic-ai\/sdk@[\d.]+";$/m, 'const Anthropic = null; const Netlify = null;'))
    const mod = await import('file://' + modFile)
    const bp = mod.buildParams({ model: 'claude-haiku-5-5', max_tokens: 100, system: [{ type: 'text', text: 'S', cache_control: { type: 'ephemeral', ttl: '1h' } }],
      messages: [{ role: 'user', content: [{ type: 'text', text: 'A', cache_control: { type: 'ephemeral' } }, { type: 'image', source: {} }, { type: 'text', text: 'B', cache_control: { type: 'ephemeral' } }, { type: 'text', text: 'C', cache_control: { type: 'ephemeral' } }, { type: 'text', text: 'D', cache_control: { type: 'ephemeral' } }] }] }).params
    const bm = bp.messages[0].content
    T('J5', 'server function: text blocks are kept with cache_control {type:"ephemeral"} only (no ttl), non-text blocks dropped, at most 4 breakpoints; a plain string stays a string',
      bp.system[0].cache_control && !('ttl' in bp.system[0].cache_control) && bm.length === 4 && bm.filter(b => b.cache_control).length === 3 && !bm[3].cache_control && bm.every(b => b.type === 'text') &&
      mod.buildParams({ model: 'claude-haiku-5-5', messages: [{ role: 'user', content: 'hi' }] }).params.messages[0].content === 'hi', { system: bp.system, bm })
  } catch (e) { T('ERR', 'section J crashed: ' + String(e && e.stack).slice(0, 500), false) }

  out.forEach(l => console.log(l))
  console.log('\nv703 Thai v702-review regression: ' + (n - fails) + '/' + n + (fails ? ' — ' + fails + ' FAILED' : ' — ALL PASS'))
  process.exit(fails ? 1 : 0)
})().catch(e => { out.forEach(l => console.log(l)); console.error(e); process.exit(1) })
