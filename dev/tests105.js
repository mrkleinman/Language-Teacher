// 17 Nov — Mandarin: "if I press 'didn't appear' on new words in review, the generation plan shows fewer NEW words (3 instead of 5); once generation starts all 5 show".
// Cause: the feasibility gate swaps a NEW word that cannot be taught yet for the next teachable NEW word, but the replacement was a plain word with no role, so the plan counted it as a
// review word. The replacement now takes the role of the word it replaces. Real application functions (selector, gate, daily contract) on the real Mandarin word bank.
const { load } = require('./harness')
const c = load(process.env.TT_FILE || 'tt.compiled.js'); c.console.info = () => {}; c.console.warn = () => {}
let n = 0, fails = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; console.log((pass ? 'PASS ' : 'FAIL ') + id + '  ' + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 300) : '')) }
const V = c.initMandarinVocab(), today = new Date().toISOString().slice(0, 10)
const order = [...V].sort((a, b) => (a.beltOrder - b.beltOrder) || ((a.unlockOrder || a.id) - (b.unlockOrder || b.id))), first = new Set(order.slice(0, 95).map(w => w.id))
const vocab = V.map(w => first.has(w.id) ? { ...w, status: 'learning', lastSeen: '2026-11-10', introducedAt: '2026-11-01', introducedDate: '2026-11-01', repCount: 2, okStreak: 1, dueDate: '2026-11-20', interval: 3 } : { ...w, status: 'new', repCount: 0, lastSeen: null, dueDate: null, introducedDate: null })
const sel = (v, slots, recent) => c.ev('selectTrackTargets')({ vocab: c.ev('jazhWordsOnly')(v), targetCap: c.ev('TRACK_TARGET_CAP'), recentTrackWordIds: recent || [], lang: 'zh', newSelector: x => c.ev('mandarinSelectTargets')(x, slots) })
function plan(v, slots, recent) {          // the dashboard's own steps
  const raw = sel(v, slots, recent).targets, inv0 = c.ev('mandarinLearnerInventory')(v, raw), rules0 = c.ev('scarcityRules')(inv0), wv = c.ev('jazhWordsOnly')(v)
  const pool = [...wv].sort((a, b) => (a.unlockOrder || 0) - (b.unlockOrder || 0))
  const g = c.ev('gateTargetsByFeasibility')(raw, pool, w => c.ev('mandarinTargetTeachable')(w, inv0, v, rules0), w => !c.ev('hasBeenIntroduced')(w))
  const fin = c.ev('jazhDailyTargets')(g.targets, v, 'zh')
  return { g, fin, newByRole: fin.filter(t => t.selectionRole === 'new').length, newByWord: fin.filter(t => !c.ev('hasBeenIntroduced')(t)).length }
}
const p1 = plan(vocab, [])
T('Z1', 'a fresh Daily plans 5 NEW words', p1.newByRole === 5, p1.newByRole)
const newIds = sel(vocab, []).targets.filter(t => t.selectionRole === 'new').map(t => t.id)
const v2 = vocab.map(w => newIds.slice(2).includes(w.id) ? c.ev('applyRating')(w, 'ok') : w)      // three rated ok, two "didn't appear" (they stay NEW)
const slots2 = v2.filter(w => newIds.includes(w.id) && w.status === 'new').map(w => w.id)
const p2 = plan(v2, slots2, [newIds])
T('Z2', 'after two "didn\'t appear" words the plan still shows 5 NEW (a swapped-in NEW word counts as NEW)', p2.newByRole === 5 && p2.newByWord === 5, { byRole: p2.newByRole, byWord: p2.newByWord, deferred: p2.g.deferred.map(d => d.target.chinese + '→' + (d.replacedBy && d.replacedBy.chinese)) })
T('Z3', 'a swapped-in word takes the role of the word it replaces (new for new, review for review)', (() => {
  const raw = [{ id: 1, status: 'new', selectionRole: 'new', targetIndex: 4 }, { id: 2, status: 'learning', selectionRole: 'due' }], pool = [{ id: 3, status: 'new' }, { id: 4, status: 'learning', introducedAt: 'x' }]
  const g = c.ev('gateTargetsByFeasibility')(raw, pool, w => w.id > 2, w => w.status === 'new')
  return g.targets[0].id === 3 && g.targets[0].selectionRole === 'new' && g.targets[0].targetIndex === 4 && g.targets[1].id === 4 && g.targets[1].selectionRole === 'due'
})())
console.log('\n' + (n - fails) + '/' + n + ' passed'); process.exit(fails ? 1 : 0)
