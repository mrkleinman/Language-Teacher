// Step 0 benchmark — builds the six reproducible learner fixtures from the HISTORICAL 8-Oct-2026 v674 logs.
//
// Honesty rules (every fixture states its own provenance, per word):
//   OBSERVED   the log names the word (a target id/surface, an "available content" list, a scene palette)
//   CROSS_LOG  the word is named by another log of the same learner on the same day (e.g. the Mandarin Daily log's
//              "Available:" list completes the Mandarin Listening inventory)
//   RECONSTRUCTED  the log only gives a COUNT (e.g. Thai introducedContent=863); the remainder is filled in
//              curriculum order, never with a word the log shows as untaught (blockedUnseen / untaught vocabulary)
// The device's real learner state was NOT available (no export was provided) — a fixture is a reproducible
// approximation at the logged belt and inventory size, not a copy of the learner's data. No app data is read or written.
'use strict'
const fs = require('fs'), path = require('path'), crypto = require('crypto')
const { load } = require('../harness')
const HIST = path.join(__dirname, 'historical', '2026-10-08-v674')
const OUT = path.join(__dirname, 'fixtures')
const sha = b => crypto.createHash('sha256').update(b).digest('hex')
const read = f => fs.readFileSync(path.join(HIST, f), 'utf8')

const c = load(path.join(__dirname, '..', 'tt.compiled.js'))
const BANK = { th: c.initVocab(), ja: c.initJapaneseVocab(), zh: c.initMandarinVocab() }
const FIELD = { th: 'thai', ja: 'japanese', zh: 'chinese' }
const curr = w => (w.curriculumIndex != null ? w.curriculumIndex : w.unlockOrder != null ? w.unlockOrder : w.id)

function idOf(lang, surface, gloss) {
  const all = BANK[lang].filter(w => w[FIELD[lang]] === surface && !w.duplicateOf)
  if (!all.length) return null
  if (all.length > 1 && gloss) { const g = all.find(w => String(w.english || '').toLowerCase().includes(String(gloss).split(/[;,/]/)[0].trim().toLowerCase())); if (g) return g.id }
  return all.sort((a, b) => curr(a) - curr(b))[0].id
}
const surfaceOf = (lang, id) => { const w = BANK[lang].find(x => x.id === id); return w ? w[FIELD[lang]] : null }
const listIn = (txt, re) => { const m = txt.match(re); return m ? m[1].trim().split(/\s+/).filter(Boolean) : [] }
const paletteUnion = txt => [...new Set([...txt.matchAll(/supportVocabulary=\[([^\]]*)\]/g)].flatMap(m => m[1].split(',').map(s => s.trim()).filter(Boolean)))]
const notTaughtThai = txt => [...new Set([
  ...[...txt.matchAll(/blockedUnseen=\d+ tokens=(.+?) repairs=/g)].flatMap(m => m[1] === 'none' ? [] : m[1].split(/\s+/)),
  ...[...txt.matchAll(/CLOSED_VOCABULARY \(([^)]+)\)/g)].map(m => m[1]),
  ...[...txt.matchAll(/untaught vocabulary: (\S+)/g)].map(m => m[1]),
  ...[...txt.matchAll(/token=(\S+) .*?vocabAuthorisation=BLOCKED_UNSEEN/g)].map(m => m[1]),
  ...[...txt.matchAll(/unknown=\[([^\]]+)\]/g)].flatMap(m => m[1].split(/\s+/)),
].filter(Boolean))]

// Thai words evidenced as AUTHORISED by the log: they occur in text the app accepted under its closed-vocabulary check
// (Listening proven frames, accepted atomic patches, accepted quota-recovery pairs). Greedy longest match over the
// bundled Thai bank (segmentation evidence only — a bank word found this way is marked OBSERVED, others are ignored).
function thaiAcceptedWords(txt) {
  const texts = [...txt.matchAll(/⟦proven: ([^⟧]+)⟧/g)].map(m => m[1])
    .concat([...txt.matchAll(/PATCH_ACCEPTED [^\n]*candidate="([^"]+)"/g)].map(m => m[1]))
    .concat([...txt.matchAll(/✅ QUOTA RECOVERY [^:]+: \+\d+ TARGET PAIR\(S\) \(needed \d+\) — ([^\n]+)/g)].map(m => m[1]))
  const surf = new Set(BANK.th.filter(w => !w.duplicateOf).map(w => w.thai)), maxL = 24, out = new Set()
  texts.forEach(t => { const s = t.replace(/[^\u0E00-\u0E7F]/g, ' '); s.split(/\s+/).forEach(seg => { let i = 0
    while (i < seg.length) { let hit = null; for (let L = Math.min(maxL, seg.length - i); L >= 1; L--) { const w = seg.slice(i, i + L); if (surf.has(w)) { hit = w; break } }
      if (hit) { out.add(hit); i += hit.length } else i++ } }) })
  return [...out]
}
// reconstruct a taught set of `count` non-target words: observed + cross-log first, then curriculum order
function inventory(lang, targetIds, count, observed, crossLog, notTaught) {
  const tset = new Set(targetIds), blocked = new Set(notTaught || [])
  const ok = id => id != null && !tset.has(id) && !blocked.has(surfaceOf(lang, id))
  const obs = [...new Set(observed.map(s => idOf(lang, s)).filter(ok))]
  const cross = [...new Set(crossLog.map(s => idOf(lang, s)).filter(id => ok(id) && !obs.includes(id)))]
  let taught = obs.concat(cross)
  const recon = []
  if (count != null && taught.length > count) taught = taught.slice(0, count)
  if (count != null && taught.length < count) {
    const pool = BANK[lang].filter(w => !w.duplicateOf && w.status !== 'locked' && ok(w.id) && !taught.includes(w.id)).sort((a, b) => curr(a) - curr(b))
    for (const w of pool) { if (taught.length + recon.length >= count) break; recon.push(w.id) }
  }
  return { observedIds: obs.filter(id => taught.includes(id)), crossLogIds: cross.filter(id => taught.includes(id)), reconstructedIds: recon,
    taughtIds: taught.concat(recon), declaredCount: count }
}

function historical(txt) {
  const g = re => (txt.match(re) || [])[1]
  return { status: g(/TRACK INTEGRITY \(\w+\): ([A-Z_]+)/) || g(/LISTENING_TRACK_RESULT status=([A-Z_]+)/) || null,
    coverage: ((txt.match(/TRACK INTEGRITY \(\w+\): [A-Z_]+[^\n]*\n\s*MAIN_TRACK: [A-Z_]+ · TARGET PAIRS (\d+\/90)/) || [])[1]) || (txt.match(/TARGET COVERAGE (\d+\/30)/g) || []).slice(-1).map(x => x.replace('TARGET COVERAGE ', ''))[0] || null,
    totalRequests: +(g(/Total requests: (\d+)/) || 0) || null, totalTokens: +(g(/Total tokens: (\d+)/) || 0) || null,
    listeningPaidCalls: +(g(/LISTENING_TOTAL_PAID_CALLS=(\d+)/) || 0) || null }
}

function fixture(o) {
  const txt = read(o.log), buf = fs.readFileSync(path.join(HIST, o.log))
  const t = o.targets(txt)
  const inv = o.inventory(txt, t.ids)
  const newIds = t.newIds || []
  const fx = {
    format: 'tt-benchmark-fixture/1', id: o.id, language: o.lang, trackType: o.trackType,
    label: 'HISTORICAL OBSERVATION → reproducible fixture (approximation of the learner, NOT the device data)',
    historicalLog: { file: o.log, bytes: buf.length, sha256: sha(buf), build: (txt.match(/build=(v\d+)/) || [])[1] || 'v674 (gen log carries no build stamp)' },
    belt: { rank: (txt.match(/LEVEL belt=([^ ]+(?: Kyu)?) /) || [])[1] || null, source: 'log line "LEVEL belt=…" (pinned with setLearnerStateOverride)' },
    targets: t.ids.map((id, i) => ({ id, surface: surfaceOf(o.lang, id), status: newIds.includes(id) ? 'new' : 'review',
      evidence: t.evidence, newFlagEvidence: newIds.includes(id) ? t.newEvidence : undefined })),
    targetsUnmapped: t.unmapped || [],
    inventory: inv,
    notTaughtObserved: o.notTaught ? o.notTaught(txt) : [],
    historicalOutcome: historical(txt),
    provenanceSummary: {
      targets: t.evidence, newFlags: newIds.length ? t.newEvidence : 'none (listening: all review)',
      inventory: 'observed ' + inv.observedIds.length + ' · cross-log ' + inv.crossLogIds.length + ' · reconstructed ' + inv.reconstructedIds.length + ' of declared ' + inv.declaredCount },
    notes: o.notes || [],
  }
  if (o.lang === 'ja') fx.speechStyle = 'natural'   // logged: "speechStyle=natural" / "Natural selected (friends)"
  fx.fidelity = require('./lib/fidelity').fidelityOf(fx)   // v676: how exact this learner state is (never a snapshot unless DEVICE_SNAPSHOT)
  fs.writeFileSync(path.join(OUT, o.id + '.json'), JSON.stringify(fx, null, 1))
  return fx
}

const zhDailyTxt = read('mandarin-gen-log-2026-10-08.txt'), jaDailyTxt = read('japanese-gen-log-2026-10-08.txt')
const zhAvail = listIn(zhDailyTxt, /ℹ Available: (.+)\n/), jaAvail = listIn(jaDailyTxt, /ℹ Content available: (.+)\n/)
// highest curriculum position among the targets — the NEW-flag reconstruction where the log gives only a count
const highest = (lang, ids, n) => ids.slice().sort((a, b) => curr(BANK[lang].find(w => w.id === b)) - curr(BANK[lang].find(w => w.id === a))).slice(0, n)

const SPECS = [
  { id: 'th-daily-2026-10-08', lang: 'th', trackType: 'daily', log: 'gen-log-2026-10-08T06-40-49.txt',
    targets: txt => { const rows = [...txt.matchAll(/^━━ 💬 (\d+)\/30: (\S+) \[([^\]]*)\]/gm)]
      const ids = rows.map(r => idOf('th', r[2], r[3])); const unm = rows.filter((r, i) => ids[i] == null).map(r => r[2])
      const real = ids.filter(id => id != null)
      return { ids: real, unmapped: unm, evidence: 'OBSERVED (generation order "━━ 💬 n/30: surface [gloss]")', newIds: highest('th', real, +(txt.match(/NEW_TARGETS=(\d+)/) || [])[1] || 0),
        newEvidence: 'RECONSTRUCTED — the log gives NEW_TARGETS=5 but not which; the 5 targets latest in the curriculum are flagged new' } },
    inventory: (txt, tids) => inventory('th', tids, +(txt.match(/introducedContent=(\d+)/) || [])[1], thaiAcceptedWords(txt), [], notTaughtThai(txt)),
    notTaught: notTaughtThai,
    notes: ['introducedContent=863 is a COUNT. Words occurring in text the app accepted (quota-recovery pairs) are OBSERVED; the rest is reconstructed in curriculum order, excluding every word the log shows as untaught.'] },
  { id: 'ja-daily-2026-10-08', lang: 'ja', trackType: 'daily', log: 'japanese-gen-log-2026-10-08.txt',
    targets: txt => { const rows = [...txt.matchAll(/^(\d+)\/30  (\S+)  /gm)]; const ids = rows.map(r => idOf('ja', r[2])).filter(x => x != null)
      return { ids, unmapped: rows.filter(r => idOf('ja', r[2]) == null).map(r => r[2]), evidence: 'OBSERVED (generation order "n/30  surface  romaji"; ids cross-checked against SCENE_ID TARGET_IDS)',
        newIds: highest('ja', ids, 1), newEvidence: 'RECONSTRUCTED — the log gives new=1/3 but not which; the target latest in the curriculum is flagged new' } },
    inventory: (txt, tids) => inventory('ja', tids, jaAvail.length - tids.length, jaAvail, [], []),
    notes: ['"Content available" lists every authorised content word (107) — the inventory is OBSERVED, not reconstructed.'] },
  { id: 'zh-daily-2026-10-08', lang: 'zh', trackType: 'daily', log: 'mandarin-gen-log-2026-10-08.txt',
    targets: txt => { const rows = [...txt.matchAll(/^(\d+)\/30  (\S+)  /gm)]; const ids = rows.map(r => idOf('zh', r[2])).filter(x => x != null)
      return { ids, unmapped: rows.filter(r => idOf('zh', r[2]) == null).map(r => r[2]), evidence: 'OBSERVED (generation order "n/30  surface  pinyin")',
        newIds: highest('zh', ids, +(txt.match(/newTargets=(\d+)/) || [])[1] || 0), newEvidence: 'RECONSTRUCTED — the log gives newTargets=5 but not which; the 5 targets latest in the curriculum are flagged new' } },
    inventory: (txt, tids) => inventory('zh', tids, zhAvail.length - tids.length, zhAvail, [], []),
    notes: ['"Available:" lists all 65 authorised content words — OBSERVED.'] },
  { id: 'th-listening-2026-10-08', lang: 'th', trackType: 'listening', log: 'listening-log-2026-10-08T06-45-28.txt',
    targets: txt => ({ ids: JSON.parse((txt.match(/LISTENING_SELECTED_TARGET_IDS=(\[[^\]]*\])/) || [])[1] || '[]'), evidence: 'OBSERVED (LISTENING_SELECTED_TARGET_IDS)' }),
    inventory: (txt, tids) => inventory('th', tids, +(txt.match(/introducedContent=(\d+)/) || [])[1], paletteUnion(txt).concat(thaiAcceptedWords(txt)), [], notTaughtThai(txt)),
    notTaught: notTaughtThai,
    notes: ['Scene palettes and proven frames / accepted patches name taught words (OBSERVED); the rest of introducedContent=858 is reconstructed in curriculum order.'] },
  { id: 'ja-listening-2026-10-08', lang: 'ja', trackType: 'listening', log: 'listening-log-2026-10-08T06-33-32.txt',
    targets: txt => ({ ids: JSON.parse((txt.match(/LISTENING_SELECTED_TARGET_IDS=(\[[^\]]*\])/) || [])[1] || '[]'), evidence: 'OBSERVED (LISTENING_SELECTED_TARGET_IDS)' }),
    inventory: (txt, tids) => inventory('ja', tids, +(txt.match(/introducedContent=(\d+)/) || [])[1], paletteUnion(txt), jaAvail, []),
    notes: ['Palette words OBSERVED; completed from the same-day Japanese Daily "Content available" list (CROSS_LOG).'] },
  { id: 'zh-listening-2026-10-08', lang: 'zh', trackType: 'listening', log: 'listening-log-2026-10-08T06-31-46.txt',
    targets: txt => ({ ids: JSON.parse((txt.match(/LISTENING_SELECTED_TARGET_IDS=(\[[^\]]*\])/) || [])[1] || '[]'), evidence: 'OBSERVED (LISTENING_SELECTED_TARGET_IDS)' }),
    inventory: (txt, tids) => inventory('zh', tids, +(txt.match(/introducedContent=(\d+)/) || [])[1], paletteUnion(txt), zhAvail, []),
    notes: ['Palette words OBSERVED; completed from the same-day Mandarin Daily "Available:" list (CROSS_LOG).'] },
]

if (require.main === module) {
  fs.mkdirSync(OUT, { recursive: true })
  const res = SPECS.map(fixture)
  res.forEach(f => console.log(f.id.padEnd(26) + ' belt ' + String(f.belt.rank).padEnd(9) + ' targets ' + f.targets.length + (f.targetsUnmapped.length ? ' (UNMAPPED ' + f.targetsUnmapped.join(',') + ')' : '') +
    ' new ' + f.targets.filter(t => t.status === 'new').length + ' · inventory ' + f.provenanceSummary.inventory + ' · not-taught observed ' + f.notTaughtObserved.length + ' · historical ' + JSON.stringify(f.historicalOutcome)))
}
module.exports = { SPECS, BANK }
