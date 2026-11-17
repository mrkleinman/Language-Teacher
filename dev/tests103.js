// 17 Nov — a save that does not fit in the browser's 5 MB must not be lost silently.
// The owner's new Thai topic track "disappeared after creation": the word list (1.2 MB) and its backup copy (1.2 MB) leave room for about five 0.3 MB tracks; the sixth save threw
// a quota error that stSet swallowed, so the track showed on screen and was gone after a reload. A value that does not fit now goes to an overflow store (the browser's IndexedDB;
// replaced here by an in-memory stand-in, the real code path is the app's own stGet / stSet / stSyncSave), and a learner whose device takes neither is told.
const { load } = require('./harness')
const FILE = process.env.TT_FILE || 'tt.compiled.js'
let n = 0, fails = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; console.log((pass ? 'PASS ' : 'FAIL ') + id + '  ' + name + (!pass && detail !== undefined ? '\n      ' + JSON.stringify(detail).slice(0, 300) : '')) }

function boot(quota, withBackend) {
  const c = load(FILE); c.console.info = () => {}
  // a localStorage with a size limit (characters), like the browser's
  const ls = c.ev('localStorage'), real = ls.setItem.bind(ls)
  let used = () => { let t = 0; for (let i = 0; i < ls.length; i++) t += (ls.getItem(ls.key(i)) || '').length; return t }
  ls.setItem = (k, v) => { const cur = (ls.getItem(k) || '').length; if (used() - cur + String(v).length > quota) throw new Error('QuotaExceededError'); real(k, v) }
  const mem = new Map()
  if (withBackend) c.ev('ST_OVF').backend = { get: async k => mem.has(k) ? mem.get(k) : undefined, put: async (k, v) => { mem.set(k, v) }, del: async k => { mem.delete(k) } }
  else c.ev('ST_OVF').backend = { get: async () => undefined, put: async () => { throw new Error('no idb') }, del: async () => {} }
  return { c, ls, mem }
}
;(async () => {
  {
    const { c, ls, mem } = boot(1000, true)
    await c.ev('stSet')('tt-a', { x: 'a'.repeat(100) })
    T('O1', 'a value that fits is kept in localStorage and nothing is put in the overflow store', ls.getItem('tt-a') && mem.size === 0)
    await c.ev('stSet')('tt-big', { x: 'b'.repeat(5000) })
    T('O2', 'a value that does not fit is kept in the overflow store (not lost), and read back whole by stGet', mem.has('tt-big') && (await c.ev('stGet')('tt-big')).x.length === 5000 && c.ev('ST_OVF').failed === 0, { keys: [...mem.keys()] })
    await c.ev('stSet')('tt-big', { x: 'c'.repeat(200) })
    T('O3', 'when the value fits again it goes back to localStorage and the older overflow copy is removed (so a stale copy can never win)', !mem.has('tt-big') && (await c.ev('stGet')('tt-big')).x === 'c'.repeat(200))
    await c.ev('stSet')('tt-grow', { x: 'd'.repeat(300) })
    await c.ev('stSet')('tt-grow', { x: 'e'.repeat(4000) })
    const g = await c.ev('stGet')('tt-grow')
    T('O4', 'a key that grew past the limit reads back the NEW value, not the old copy that stayed in localStorage', g.x === 'e'.repeat(4000) && !ls.getItem('tt-grow'))
  }
  {
    const { c } = boot(1000, false)
    const added = []; const doc = c.ev('document'); doc.getElementById = () => null; doc.body.appendChild = e => added.push(e); doc.createElement = () => ({ style: {}, remove() {} })
    await c.ev('stSet')('tt-big', { x: 'b'.repeat(5000) })
    T('O5', 'when neither store takes the value the learner is told on screen (a warning bar), and the failure is counted', c.ev('ST_OVF').failed === 1 && added.length === 1 && /out of storage/.test(added[0].textContent || ''), { failed: c.ev('ST_OVF').failed, n: added.length })
  }
  {
    // the real track save: tracks 1..3 fit, the 4th does not; all four are there after a "reload" (a fresh read through the app's own merge)
    const { c, ls, mem } = boot(2600, true)
    const mk = i => ({ createdAt: '2026-11-1' + i + 'T00:00:00.000Z', date: '1' + i + ' Nov 2026', pairs: [{ thai: 'x'.repeat(700) }], keywords: [], language: 'th' })
    const save = c.ev('(t) => stSyncSave("tt-tracks", t, stTrackId, ST_TRACK_OPTS)')
    let list = []
    for (let i = 1; i <= 4; i++) { list = [...list, mk(i)]; await save(list) }
    const back = await c.ev('stGet')('tt-tracks')
    T('O6', 'four tracks of 0.7 KB saved one after the other into a 2.6 KB store: all four are read back (the fourth went to the overflow store)', back.length === 4 && mem.has('tt-tracks'), { n: back && back.length, ovf: [...mem.keys()] })
    // another save merges with what is stored (overflow included): a fifth track keeps the first four
    list = [...list, mk(5)]; await save(list)
    const b2 = await c.ev('stGet')('tt-tracks')
    T('O7', 'the next save merges with the overflow copy: five tracks, none lost', b2.length === 5, { n: b2.length })
  }
  const src = require('fs').readFileSync('tt.jsx', 'utf8')
  T('O8', 'stSet no longer swallows a failed localStorage write (it falls back and warns)', /async function stSet\(key, val\) \{[\s\S]{0,900}stOvfWarn\(key\)/.test(src) && !/async function stSet\(key, val\) \{\n  try \{ await window\.storage\.set\(key, JSON\.stringify\(val\)\) \} catch \{\}\n  try \{ localStorage\.setItem\(key, JSON\.stringify\(val\)\) \} catch \{\}\n\}/.test(src))
  console.log('\n' + (n - fails) + '/' + n + ' passed'); process.exit(fails ? 1 : 0)
})()
