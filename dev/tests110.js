// 18 Nov — Thai Daily NOT_READY 87/90 with เวลาที่ 0/3 (the owner's 18 Nov export). The final check swapped the stuck revision word เวลาที่ for the next due word อ่าน (three อ่าน lines,
// stage target-substitution), but the Quality Check screen's "Save & Study" copied only the pairs into the saved track: the track still named เวลาที่ and the three อ่าน lines counted
// as "lines for no selected target". qcSavedTrack now takes the finalised word list with the pairs. Real application functions: the substitution step, the integrity count, the save payload.
const { load } = require('./harness')
const FILE = process.env.TT_FILE || 'tt.compiled.js'
let n = 0, fails = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; console.log((pass ? 'PASS ' : 'FAIL ') + id + '  ' + name + (!pass && detail !== undefined ? '\n      ' + JSON.stringify(detail).slice(0, 300) : '')) }
const c = load(FILE); c.console.info = () => {}
const kw = (id, thai) => ({ wordId: id, thai, english: thai })
const track = { keywords: [kw(1462, 'เวลาที่'), kw(288, 'ค่าใช้จ่าย')], selectedTargetIds: [1462, 288], selectedRevisionTargetIds: [1462, 288], trackContext: { selectedTargetIds: [1462, 288], requiredReviewTargetIds: [1462, 288] }, pairs: [], integrity: { status: 'NOT_READY' } }
const subs = [{ fromId: 1462, fromSurface: 'เวลาที่', toId: 55, toSurface: 'อ่าน', toEnglish: 'to read', toPhonetic: 'àan', reason: 'QUOTA_RECOVERY_EXHAUSTED', recalls: 3 }]
const finalisedTrack = c.ev('applyThaiTargetSubstitutions')(track, subs)
const pairsOf = id => [1, 2, 3].map(k => ({ targetId: id, pairType: 'content', isTargetPair: true, thai: 'x' + k, english: 'y', recallIndex: k }))
finalisedTrack.pairs = [...pairsOf(288), ...pairsOf(55)]
finalisedTrack.integrity = { status: 'READY' }; finalisedTrack.finalTrack = { pairCount: 6 }
const saved = c.ev('qcSavedTrack')(track, finalisedTrack, null)
T('Q1', 'the saved track takes the swapped word list: เวลาที่ is replaced by อ่าน in keywords, selected ids and trackContext', saved.keywords.map(k => k.wordId).join() === '55,288' && saved.selectedTargetIds.join() === '55,288' && saved.trackContext.selectedTargetIds.join() === '55,288' && saved.targetSubstitutions && saved.targetSubstitutions.length === 1, saved)
T('Q2', 'the three อ่าน lines now count for a selected target (no "lines for no selected target"), and the old behaviour left them stray', (() => {
  const ok = c.ev('targetLinesExact')(saved.pairs, saved.keywords, k => k.thai)
  const old = c.ev('targetLinesExact')(saved.pairs, track.keywords, k => k.thai)        // what the saved track used to carry: the OLD word list with the NEW pairs
  return ok.ok === true && ok.stray === 0 && old.ok === false && old.stray === 3 && /เวลาที่=0/.test(old.detail)
})())
const plain = c.ev('qcSavedTrack')(track, null, [{ a: 1 }])
T('Q3', 'without a finalised result (a QC that changed only pairs) the track keeps its own word list and takes the updated pairs', plain.keywords === track.keywords && plain.pairs.length === 1)
T('Q4', 'the Listening English translation is told never to turn ครับ / ค่ะ / คะ into "sir" / "ma\'am" (the owner\'s 18 Nov Listening: "I see, ma\'am.", "Good, sir." in lines that carry only the polite ending)', /NEVER translate them as "sir" or "ma\\?'am"/.test(require('fs').readFileSync('tt.jsx', 'utf8')))
console.log('\n' + (n - fails) + '/' + n + ' passed'); process.exit(fails ? 1 : 0)
