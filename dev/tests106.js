// 17 Nov — Cantonese beginners: 學校 (school), 的士 (taxi) and 拜拜 (bye) were planned every day and NEVER taught. Every lesson for them said 返屋企 ("go home", a word of the 239th place)
// instead of 返 + 屋企 (both taught on day 8), so the strict vocabulary rule found no lesson, the gate swapped them for other words, forever. A word made of two taught words is allowed
// (YUE_COMPOUNDS: only the listed ones). Real application code with the real lesson data, a learner who takes the days of the beginner order one after the other.
const { load } = require('./harness'), zlib = require('zlib')
const c = load(process.env.TT_FILE || 'tt.compiled.js', { realBelt: true }); c.console.info = () => {}
c.ev('yueModulesUseData')(JSON.parse(zlib.gunzipSync(Buffer.from(c.ev('YUE_MODULES_GZ'), 'base64')).toString('utf8')))
let n = 0, fails = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; console.log((pass ? 'PASS ' : 'FAIL ') + id + '  ' + name + (!pass && detail !== undefined ? '\n      ' + JSON.stringify(detail).slice(0, 300) : '')) }
const taught = c.ev(`(() => {
  let vocab = mergeCantoneseVocab(null); const dayOf = {}, counts = []
  for (let day = 1; day <= 30; day++) {
    const sel = selectTrackTargets({ vocab: jazhWordsOnly(vocab), targetCap: TRACK_TARGET_CAP, recentTrackWordIds: [], lang: 'yue', newSelector: v => cantoneseSelectTargets(v, []) })
    const nw = yueDailyTargets(sel.targets, vocab).targets.filter(w => w.selectionRole === 'new'); counts.push(nw.length)
    nw.forEach(w => { if (!dayOf[w.chinese]) dayOf[w.chinese] = day })
    const ids = new Set(nw.map(w => w.id))
    vocab = vocab.map(w => ids.has(w.id) ? { ...w, status: 'learning', lastSeen: '2026-11-17', introducedAt: '2026-11-17', repCount: 3, okStreak: 1, dueDate: '2026-11-20' } : w)
  }
  return { dayOf, counts }
})()`)
T('B1', '學校, 的士 and 拜拜 are each taught within the first 25 days (before: never)', ['學校', '的士', '拜拜'].every(w => taught.dayOf[w] && taught.dayOf[w] <= 25), taught.dayOf)
T('B2', 'the first 20 days each bring the full 5 new words', taught.counts.slice(0, 20).every(x => x === 5), taught.counts)
const allowed = c.ev(`(() => { const v = mergeCantoneseVocab(null); const ch = (s) => v.map(w => w.chinese === s ? { ...w, status: 'learning', introducedAt: 'x', lastSeen: '2026-11-01', repCount: 2 } : w)
  const none = yueAllowedSet(v, []), part = yueAllowedSet(ch('返'), []), both = yueAllowedSet(ch('返').map(w => w.chinese === '屋企' ? { ...w, status: 'learning', introducedAt: 'x', lastSeen: '2026-11-01', repCount: 2 } : w), [])
  return { none: none.has('返屋企'), part: part.has('返屋企'), both: both.has('返屋企') } })()`)
T('B3', '返屋企 is allowed only once BOTH 返 and 屋企 are taught', allowed.none === false && allowed.part === false && allowed.both === true, allowed)
console.log('\n' + (n - fails) + '/' + n + ' passed'); process.exit(fails ? 1 : 0)
