// node check.js <compiled app> <owner backup.json> <library.json> [conversation id …] — runs each library conversation through the app's
// own Listening line checks on the owner's vocabulary, with no model call:
//   the conversation audit (closed vocabulary, length ≤ hardMax, speaker particles / pronouns, line quality, duplicates, scenes),
//   the continuity rule (a greeting only in the first scene, a goodbye only in the last), the turn-taking rule (never three turns in a
//   row by one speaker), the line the app would actually play (its local particle / spacing repair must leave the line unchanged) and
//   the pronunciation audit. Also prints how many of the owner's due Listening words each conversation contains.
// A conversation is USABLE when it has no problem at all. SHOW=1 prints the romanised lines.
const fs = require('fs'), path = require('path'); const DEV = path.join(__dirname, '../../..'); process.chdir(DEV)
const { load } = require(path.join(DEV, 'harness'))
const C = load(process.argv[2], { realBelt: true }); C.console.info = () => {}; C.console.warn = () => {}
const B = JSON.parse(fs.readFileSync(process.argv[3], 'utf8')), byId = new Map(B.vocab.map(w => [w.id, w]))
const F = ['status', 'difficulty', 'interval', 'lastSeen', 'dueDate', 'repCount', 'lapses', 'okStreak', 'manualKnown', 'introducedAt', 'note']
const vocab = C.initVocab().map(w => { const o = byId.get(w.id); if (!o) return w; const n = { ...w }; F.forEach(k => { if (o[k] !== undefined) n[k] = o[k] }); return n })
const lib = JSON.parse(fs.readFileSync(process.argv[4], 'utf8')), only = process.argv.slice(5)
const la = C.ev('LISTENING_ADAPTERS').th
const snapshot = C.snapshotLearnerInventory('th', vocab, [], 'listening')
const cc = C.getLearnerComplexityContract({ lang: 'th', vocab })
const ctx = { vocab, track: {}, exposed: snapshot.inventory.taught, eligTargets: [], complexity: cc, inventory: snapshot.inventory, snapshot }
const pool = C.listeningCandidatePool('th', vocab, C.selectRevisionTargets('th', vocab))
const nz = s => String(s || '').replace(/\s+/g, '')
let usable = 0
for (const conv of lib.filter(c => !only.length || only.includes(c.id))) {
  const probs = [], flat = []
  const scenes = conv.scenes.map((s, si) => ({ sceneId: 'LS' + (si + 1), setting: s.title, turns: s.lines.map(([sp, th, en], k) => {
    const tu = C.lnMfMakeTurn(la, { speaker: sp, text: th, english: en, targetIds: [] }, 'S' + (si + 1) + '-T' + k, 'S' + (si + 1))
    flat.push({ sp, th, en, pair: tu.pair })
    return { speaker: sp, pair: tu.pair } }) }))
  const lineOf = n => { const f = flat[n - 1]; return f ? f.sp + ': ' + f.th : '' }
  const audit = C.listeningConversationAudit(scenes, [], la, ctx)
  audit.issues.forEach(x => probs.push([x.line, x.code, x.detail]))
  C.conversationContinuityAudit(scenes, la, []).forEach(x => probs.push([x.line, x.code, x.detail]))
  flat.forEach((f, i) => {
    if (i >= 2 && flat[i - 1].sp === f.sp && flat[i - 2].sp === f.sp) probs.push([i + 1, 'TURN_TAKING', 'three turns in a row by ' + f.sp])
    if (nz(f.pair.thai) !== nz(f.th)) probs.push([i + 1, 'CHANGED_BY_APP', 'the app would play "' + f.pair.thai + '"'])
    if (!f.en || /[฀-๿]/.test(f.en)) probs.push([i + 1, 'ENGLISH', 'missing or contains Thai'])
    try { const p2 = la.finaliseLine(f.pair, ctx); f.ph = p2.phonetic || p2.romanization || ''; (la.pronunciationProblems(p2, ctx) || []).forEach(m => probs.push([i + 1, 'PRONUNCIATION', String(m.why || m.code || m).slice(0, 120)])) } catch (e) { probs.push([i + 1, 'PRONUNCIATION', 'error ' + e.message]) }
  })
  const n = flat.length
  if (n < 36 || n > 60) probs.push([0, 'LENGTH', n + ' lines (write 40–56)'])
  conv.scenes.forEach((s, si) => { if (s.lines.length < 6) probs.push([0, 'SCENE_SIZE', 'scene ' + (si + 1) + ' has ' + s.lines.length + ' lines (at least 6)']) })
  const heard = pool.filter(w => flat.some(f => f.th.includes(w.thai) && C.thaiTargetPresent(f.th, w.thai, vocab)))
  const top = heard.filter(w => pool.indexOf(w) < 60).length
  const ok = !probs.length
  if (ok) usable++
  console.log((ok ? '✓ ' : '✗ ') + conv.id + ' ' + conv.title + ' — ' + n + ' lines, ' + conv.scenes.length + ' scenes · owner due words heard ' + heard.length + ' (top-60: ' + top + ')' + (ok ? '' : ' · ' + probs.length + ' problem(s)'))
  probs.sort((a, b) => a[0] - b[0]).forEach(p => console.log('    line ' + p[0] + ' ' + p[1] + ': ' + p[2] + (p[0] ? '  ⟨' + lineOf(p[0]) + '⟩' : '')))
  if (process.env.SHOW) flat.forEach((f, i) => console.log('    ' + String(i + 1).padStart(2) + ' ' + f.sp + ': ' + f.th + '  /' + f.ph + '/  ' + f.en))
}
console.log('USABLE', usable, '/', lib.filter(c => !only.length || only.includes(c.id)).length)
