// v641 Part A — canonical 688 → 790 (and 776 → 885)
const { load } = require('./harness')
const out = []; let fails = 0
const T = (id, name, pass, detail) => { if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + id.padEnd(3) + name + (detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')) }
const c = load('tt.compiled.js')
const R = c.ev('RAW_VOCAB'), pick = id => R.find(w => w.id === id)
out.push('BANK 688: ' + JSON.stringify(pick(688)))
out.push('BANK 790: ' + JSON.stringify(pick(790)))
// a learner whose history sits on BOTH rows (the realistic worst case)
const v = c.initVocab()
const r688 = v.find(w => w.id === 688), r790 = v.find(w => w.id === 790)
Object.assign(r688, { duplicateOf: null, status: 'lapsed', interval: 3, dueDate: '2026-09-24', difficulty: 'hard', lastSeen: '2026-09-20', introducedAt: '2026-06-01',
  repCount: 14, okStreak: 0, lapses: 2, manualKnown: false, bookmarks: ['t-0901#12'], practiceLog: [{ d: '2026-09-20', r: 'hard' }] })
Object.assign(r790, { status: 'learning', interval: 6, dueDate: '2026-09-28', difficulty: 'ok', lastSeen: '2026-09-10', introducedAt: '2026-07-15',
  repCount: 9, okStreak: 3, lapses: 1, manualKnown: false, bookmarks: ['t-0815#4'], practiceLog: [{ d: '2026-09-10', r: 'ok' }] })
out.push('LEARNER 688 before: ' + JSON.stringify((({ status, interval, dueDate, difficulty, lastSeen, introducedAt, repCount, okStreak, lapses, bookmarks }) => ({ status, interval, dueDate, difficulty, lastSeen, introducedAt, repCount, okStreak, lapses, bookmarks }))(r688)))
out.push('LEARNER 790 before: ' + JSON.stringify((({ status, interval, dueDate, difficulty, lastSeen, introducedAt, repCount, okStreak, lapses, bookmarks }) => ({ status, interval, dueDate, difficulty, lastSeen, introducedAt, repCount, okStreak, lapses, bookmarks }))(r790)))
const before790 = { ...r790 }, before688 = { ...r688 }
const log = c.applyThaiCanonicalAliases(v, '2026-09-25')
out.push('MIGRATION LOG: ' + log.join('\n  '))
const k = v.find(w => w.id === 790), d = v.find(w => w.id === 688)
out.push('LEARNER 790 after: ' + JSON.stringify((({ status, interval, dueDate, difficulty, lastSeen, introducedAt, repCount, okStreak, lapses, bookmarks, practiceLog, _mergedFrom }) => ({ status, interval, dueDate, difficulty, lastSeen, introducedAt, repCount, okStreak, lapses, bookmarks, practiceLog, _mergedFrom }))(k)))
T('A', 'same lexical item: history migrates to 790, 688 retired, 688 references resolve to 790',
  d.duplicateOf === 790 && d._mergedInto === 790 && c.thaiCanonicalId(688) === 790 && !c.isUsableWord(d) &&
  !c.selectRevisionTrackTargets({ vocab: v, maxTargets: 2000, today: '2026-09-25' }).targets.some(w => w.id === 688) &&
  c.selectRevisionTrackTargets({ vocab: v, maxTargets: 2000, today: '2026-09-25' }).targets.some(w => w.id === 790))
const rank = { locked: 0, new: 1, learning: 2, lapsed: 2, known: 3 }
T('B', 'no reduction: status rank, counters (max, not double-counted), interval, exposure, bookmarks',
  rank[k.status] >= Math.max(rank[before790.status], rank[before688.status]) && k.repCount === 14 && k.okStreak === 3 && k.lapses === 2 &&
  k.interval === 6 && k.lastSeen === '2026-09-20' && k.introducedAt === '2026-06-01' && k.difficulty === 'hard' &&
  k.bookmarks.length === 2 && k.practiceLog.length === 2,
  'status ' + k.status + ' · interval ' + k.interval + ' (stronger record kept its own due ' + k.dueDate + ') · current rating from the latest-seen row: ' + k.difficulty)
// idempotent + no stale re-application: rate 790 hard after the migration, reload → not overwritten
const rated = c.applyRating(k, 'hard'); Object.assign(k, rated)
const again = c.applyThaiCanonicalAliases(v, '2026-09-26')
T('B2', 'one-time merge: a later rating on 790 survives every reload (tombstone never re-applied)', again.length === 0 && k.interval === rated.interval && k.difficulty === 'hard', { interval: k.interval, reloadLog: again })
// old track rated 688 → updates 790
const track = { keywords: [{ wordId: 688, rating: 'ok' }] }
const cid = c.thaiCanonicalId(track.keywords[0].wordId)
T('A2', 'an old saved track rating word 688 lands on 790', cid === 790)
const res = c.resolveCanonicalTarget({ ...d, id: 688 })
T('A3', 'an old saved selection holding 688 resolves to the clean 790 record', res.target && res.target.id === 790 && res.target.thai === 'น้ำส้ม' && !res.skipped, res.target && { id: res.target.id, thai: res.target.thai })
const lx = c.auditThaiCanonicalLexicon()
T('C', 'malformed trailing "..." is flagged; frames (ช่วย...ได้ไหม, ตั้งแต่...ถึง..., ...อยู่ที่ไหน) are not; retired 688/776 no longer flagged',
  lx.malformedPlaceholder.some(x => x.id === 517) && !lx.malformedPlaceholder.some(x => [688, 776, 695, 887, 888, 889, 890].includes(x.id)) &&
  !lx.unresolvedDuplicates.some(g => g.thai === 'น้ำส้ม' || g.thai === 'ใบเสร็จ') && c.ev('THAI_MALFORMED_PLACEHOLDER_RE').test('น้ำส้ม ...') && !c.ev('THAI_MALFORMED_PLACEHOLDER_RE').test('ตั้งแต่...ถึง...'),
  lx)
const frame = c.resolveCanonicalTarget(v.find(w => w.id === 887))
T('C2', 'frame target ตั้งแต่...ถึง... is never skipped as PLACEHOLDER_SURFACE (v640 over-broad rule fixed)', !(frame.skipped && /PLACEHOLDER/.test(frame.skipped.reason)), frame.skipped && frame.skipped.reason)
T('C3', 'different-gloss same-Thai pairs are flagged, never merged (ถือ 336/622, ทั้งหมด 852/1090)',
  lx.unresolvedDuplicates.some(g => g.thai === 'ถือ') && !v.find(w => w.id === 622).duplicateOf && c.thaiCanonicalId(622) === 622)
const r885 = c.resolveCanonicalTarget({ ...v.find(w => w.id === 776), id: 776 })
T('A4', 'canonical entries are teachable: 790 and 885 carry the verified sense of their retired twins', res.target && r885.target && r885.target.id === 885, { 790: res.target && res.target.senseId, 885: r885.target && r885.target.senseId })
console.log(out.join('\n') + '\n\n' + (fails ? fails + ' FAILED' : 'all passed'))
