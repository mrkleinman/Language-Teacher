// 18 Nov — a real beginner whose SAVED state comes from the old teaching order must still get a day (the v760 bug: "No lesson fits yet").
// v756-v759 taught 嘅 我 想 巴士 係 first and saved them as "today's new words"; v760 teaches 你好 我 你 係 唔 first, and a saved word that no lesson can teach yet kept its
// place, so the gate swapped each one on its own, found nothing teachable on its own (the first words lean on each other as a day of five) and the Daily came out EMPTY.
// Real application code with the REAL embedded lesson data (the strict rule ON), no stand-ins except the data being unpacked by the test (Node has no browser decompressor for it here).
const { load } = require('./harness')
const zlib = require('zlib')
const FILE = process.env.TT_FILE || 'tt.compiled.js'
let n = 0, fails = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; console.log((pass ? 'PASS ' : 'FAIL ') + id + '  ' + name + (!pass && detail !== undefined ? '\n      ' + JSON.stringify(detail).slice(0, 400) : '')) }
const c = load(FILE, { realBelt: true }); c.console.info = () => {}
c.ev('yueModulesUseData')(JSON.parse(zlib.gunzipSync(Buffer.from(c.ev('YUE_MODULES_GZ'), 'base64')).toString('utf8')))
const run = c.ev(`(mode) => {
  const base = mergeCantoneseVocab(null), ch = ['嘅', '我', '想', '巴士', '係']
  const idsOf = v => ch.map(x => v.find(w => w.chinese === x).id)
  const vocab = base.map(w => mode !== 'hard' || !ch.includes(w.chinese) ? w : { ...w, status: 'new', lastSeen: '2026-11-17', introducedAt: '2026-11-17', repCount: 1, difficulty: 'hard' })
  const slots = mode === 'fresh' ? [] : idsOf(vocab)
  const sel = selectTrackTargets({ vocab: jazhWordsOnly(vocab), targetCap: TRACK_TARGET_CAP, recentTrackWordIds: [], lang: 'yue', newSelector: v => cantoneseSelectTargets(v, slots) })
  const d = yueDailyTargets(sel.targets, vocab)
  const isNewW = w => w.selectionRole === 'new'
  return { strict: yueTeachCtx(vocab).strict, raw: sel.targets.map(t => t.chinese), built: d.targets.map(t => t.chinese), newCount: d.targets.filter(isNewW).length, allowance: newWordsPerTrack('yue', 'daily', vocab) }
}`)
const fresh = run('fresh'), stale = run('stale'), hard = run('hard')
T('S0', 'the strict rule is really on with the real data (this test would prove nothing otherwise)', fresh.strict === true, fresh)
T('S1', 'a brand-new learner gets the first day of the order: 你好 我 你 係 唔', fresh.built.join(' ') === '你好 我 你 係 唔', fresh)
T('S2', 'saved slots from the OLD order (嘅 我 想 巴士 係) no longer fill the day: the Daily is the first day of the CURRENT order, 5 new words, not empty', stale.built.length === 5 && stale.newCount === stale.allowance && !stale.built.includes('嘅') && !stale.built.includes('想') && stale.built.includes('你好'), stale)
T('S3', 'a learner who had hard-rated those old words (they hold their slots as seen words) still gets the full allowance of NEW words, taught as one set', hard.newCount === hard.allowance && hard.built.includes('你好'), hard)
T('S4', 'no Daily of any of the three states is empty', fresh.built.length > 0 && stale.built.length > 0 && hard.built.length > 0, { fresh: fresh.built, stale: stale.built, hard: hard.built })
console.log((fails ? 'FAIL ' : 'ALL PASS ') + (n - fails) + '/' + n)
process.exit(fails ? 1 : 0)
