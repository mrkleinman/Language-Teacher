const { setup, mock } = require('./tests14')
;(async () => {
  const opts = [{}, { missing: [0] }, { missingOnce: [0, 1, 2] }, { max4: true }, { dup: true }, { merged: true }, { oneSpeaker: true }, { overshoot: 99 }, { badJsonScene: 2 }, { badJsonRepair: 3, missingOnce: [0] }, { noRepair: true, missing: [0, 5] }]
  let bad = 0, runs = 0, maxCalls = 0, noneValidated = 0; const tally = {}, softBlocked = []
  for (const lang of ['th', 'ja', 'zh']) for (const o of opts) for (let i = 0; i < 4; i++) {
    const S = setup(lang); const ids = new Set(S.targets.map(t => t.id))
    S.vocab.forEach(w => { if (ids.has(w.id)) { w.dueDate = '2026-01-01'; w.difficulty = 'hard' } else { w.dueDate = '2099-01-01'; if (w.difficulty === 'hard') w.difficulty = 'medium' } })
    const ln = JSON.parse(JSON.stringify(o)); ['missing', 'missingOnce'].forEach(k => { if (ln[k]) ln[k] = ln[k].map(j => S.targets[j].id) })
    mock(S, lang, { ln })
    const r = await S.c.buildStandaloneListeningTrack({ lang, vocab: S.vocab, apiKey: 'k', model: 'm', attemptId: 'fz' + i })
    runs++; maxCalls = Math.max(maxCalls, r.track.telemetry.LISTENING_TOTAL_PAID_CALLS)
    const k = JSON.stringify(o); tally[k] = tally[k] || { READY: 0, NOT_READY: 0, notes: new Set(), failed: new Set() }; tally[k][r.track.status]++
    ;(r.track.qualityNotes || []).forEach(q => tally[k].notes.add(q.gate)); (r.track.failedChecks || []).forEach(f => tally[k].failed.add(f.split('=')[0]))
    // v665 invariant: READY ⇒ every gate passed, LENGTH and CLOSED_VOCAB included (§47)
    if (r.track.status === 'READY' && (r.track.failedChecks.length || (r.track.lengthAudit && r.track.lengthAudit.overHardMax) || (r.track.unknownWords || []).length)) softBlocked.push(lang + ' ' + k)
    // v669 §17: when NO scene candidate validates (every candidate one-speaker / over budget …) nothing is committed —
    // a NOT_READY track whose reason names the UNCOMMITTED_SCENE candidates is the contract, not a build error
    if (!r.track.listening && /UNCOMMITTED_SCENE/.test(r.track.failureReason || '') && r.track.status === 'NOT_READY') noneValidated++
    else if (!r.track.listening) { bad++; console.log('NO LISTENING', lang, JSON.stringify(o), i, r.track.failureReason) }
  }
  Object.entries(tally).forEach(([k, v]) => console.log(k.padEnd(44), 'READY', v.READY, 'NOT_READY', v.NOT_READY, 'notes=[' + [...v.notes].join(',') + ']', 'hardFailed=[' + [...v.failed].join(',') + ']'))
  console.log('READY tracks with a failed gate / overlong line / unknown word:', softBlocked.length)
  console.log('runs', runs, 'build errors', bad, 'nothing-validated (UNCOMMITTED_SCENE, NOT_READY)', noneValidated, 'max paid calls', maxCalls)
})().catch(e => console.log('ERR', e.stack))
