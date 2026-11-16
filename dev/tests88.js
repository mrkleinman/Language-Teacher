// 16 Nov — several browser tabs at once: saves MERGE instead of overwriting, a tab learns what another tab saved, a generation's recovery save and the Thai draft belong to ONE tab,
// the spend counter adds. Real application functions; two "tabs" = two copies of the app loaded in two contexts that share ONE localStorage (as two tabs of one site do) but have
// their own sessionStorage; the browser's "storage" event (sent to the OTHER tabs only) is delivered by the test.
const { load } = require('./harness')
let n = 0, fails = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; console.log((pass ? 'PASS ' : 'FAIL ') + id + '  ' + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 700) : '')) }
const mkStore = () => { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), clear: () => m.clear(), key: i => [...m.keys()][i], get length() { return m.size } } }
const shared = mkStore()
const tabs = []
function openTab() {
  const handlers = [], session = mkStore()
  // a write by this tab fires "storage" in the OTHER tabs (never in this one)
  const ls = { getItem: k => shared.getItem(k), removeItem: k => { shared.removeItem(k) }, clear: () => shared.clear(), key: i => shared.key(i), get length() { return shared.length },
    setItem: (k, v) => { const old = shared.getItem(k); shared.setItem(k, v); tabs.forEach(t => { if (t !== me) t.fire({ key: k, newValue: String(v), oldValue: old, storageArea: t.ls }) }) } }
  const me = { ls, session, handlers, fire: e => handlers.forEach(h => h(e)) }
  me.c = load('tt.compiled.js', { globals: { localStorage: ls, sessionStorage: session, addEventListener: (t, f) => { if (t === 'storage') handlers.push(f) } } })
  me.c.console.info = () => {}; me.c.console.warn = () => {}
  tabs.push(me); return me
}
const ev = (t, x) => t.c.ev(x)
const trk = (id, extra) => ({ createdAt: id, date: id.slice(0, 10), pairs: [{ english: 'x ' + id }], ...(extra || {}) })
const wd = (id, extra) => ({ id, thai: 'w' + id, status: 'new', repCount: 0, ...(extra || {}) })
const ids = l => l.map(x => x.id != null ? x.id : x.createdAt).join(',')

;(async () => {
  // ── pure merge / adopt ──
  const A = openTab()
  const merge3 = ev(A, 'stMerge3'), adopt = ev(A, 'stAdoptPure'), snap = ev(A, 'stSyncSnapshot'), wid = ev(A, 'stWordId')
  const base = snap([wd(1), wd(2), wd(3)], wid)
  let m = merge3(base, [wd(1), wd(2, { repCount: 1 }), wd(3)], [wd(1), wd(2), wd(3, { repCount: 5 })], wid)
  T('M1', 'a three-way merge keeps what each side changed: I rated word 2, the other tab rated word 3 → both ratings are kept', m.find(w => w.id === 2).repCount === 1 && m.find(w => w.id === 3).repCount === 5, m)
  m = merge3(base, [wd(1), wd(2, { repCount: 1 }), wd(3)], [wd(1), wd(2, { repCount: 9 }), wd(3)], wid)
  T('M2', 'both tabs changed the same word → mine (the saving tab) wins, nothing is lost for the others', m.find(w => w.id === 2).repCount === 1)
  m = merge3(base, [wd(1), wd(3)], [wd(1), wd(2), wd(3), wd(4)], wid)
  T('M3', 'a list that lacks a stored word does NOT delete it (a save from a screen opened earlier holds an older list); a word another tab added is kept', ids(m) === '1,3,2,4' || ids(m).split(',').sort().join() === '1,2,3,4', ids(m))
  m = merge3(base, [wd(1), wd(3)], [wd(1), wd(2), wd(3), wd(4)], wid, { deleted: [2] })
  T('M3b', 'a DELIBERATE delete (the id is named) removes it, and only it', ids(m).split(',').sort().join() === '1,3,4', ids(m))
  m = merge3(base, [wd(7)], [wd(1), wd(2), wd(3)], wid, { replace: true })
  T('M3c', 'a replacement of everything (an import) removes what is not in the new list', ids(m) === '7', ids(m))
  m = merge3(base, [wd(1), wd(2), wd(3), wd(5)], [wd(1), wd(3)], wid)
  T('M4', 'a word the other tab removed (and I did not touch) is removed; a word only I added is kept', ids(m) === '1,3,5', ids(m))
  const ad1 = adopt([wd(1), wd(2, { repCount: 1 }), wd(3)], base, [wd(1), wd(2), wd(3, { repCount: 5 }), wd(4)], wid)
  T('A1', 'adopting the stored list: untouched words take the stored version, my unsaved change stays, a new word appears', ad1.changed && ad1.next.find(w => w.id === 2).repCount === 1 && ad1.next.find(w => w.id === 3).repCount === 5 && ad1.next.some(w => w.id === 4))
  const ad2 = adopt([wd(1), wd(2), wd(3)], base, [wd(1), wd(2), wd(3)], wid)
  T('A2', 'nothing changed elsewhere → the same list object comes back (no re-render)', !ad2.changed && ad2.next.length === 3)
  const cur0 = [wd(1), wd(2, { repCount: 1 }), wd(3)], tgt = [wd(1), wd(2), wd(3, { repCount: 5 })]
  T('A3', 'the update is pure: running it twice gives the same answer', JSON.stringify(adopt(cur0, base, tgt, wid).next) === JSON.stringify(adopt(cur0, base, tgt, wid).next))

  // ── two tabs, tracks ──
  const B = openTab()
  const key = 'tt-tracks', tid = ev(A, 'stTrackId'), OPT = ev(A, 'ST_TRACK_OPTS')
  const state = { A: [], B: [] }
  const setA = f => { state.A = f(state.A) }, setB = f => { state.B = f(state.B) }
  ev(A, 'stSyncMark')(key, [], tid); ev(B, 'stSyncMark')(key, [], tid)
  // listeners as the app registers them (useTabSyncedList): A and B listen on the key
  const listen = (t, set, setter) => ev(t, 'stSyncOnChange')(key, stored => { const target = Array.isArray(stored) ? stored : []; const expect = t.c.ev('ST_SYNC').base.get(key) || new Map(); t.c.ev('ST_SYNC').base.set(key, snap(target, tid)); setter(cur => adopt(cur, expect, target, tid, OPT).next) })
  listen(A, setA, setA); listen(B, setB, setB)
  // (the message to B is held back, as when B was busy or asleep: B still has an EMPTY list when it saves its own track)
  const held = []; const fireB = B.fire; B.fire = e => held.push(e)
  state.A = [trk('2026-11-16T01:00:00.000Z')]; await ev(A, 'stSyncCommit')(key, state.A, setA, tid, OPT)
  state.B = [trk('2026-11-16T01:05:00.000Z')]; await ev(B, 'stSyncCommit')(key, state.B, setB, tid, OPT)
  B.fire = fireB; held.forEach(e => B.fire(e))
  const stored1 = JSON.parse(shared.getItem(key))
  T('T1', 'tab A builds a track and saves; tab B (which never saw it) builds its own and saves → BOTH are stored (before: B\'s save erased A\'s track)', stored1.length === 2, ids(stored1))
  T('T2', 'tab A sees tab B\'s track without a reload (the storage event), and B sees A\'s after its save merged it in', ids(state.A) === ids(stored1) && ids(state.B) === ids(stored1), { A: ids(state.A), B: ids(state.B) })
  // deletion in A is not undone by an untouched B
  state.A = state.A.filter(t => t.createdAt !== '2026-11-16T01:00:00.000Z'); await ev(A, 'stSyncCommit')(key, state.A, setA, tid, { ...OPT, deleted: ['2026-11-16T01:00:00.000Z'] })
  T('T3', 'a track deleted in tab A is gone in storage and in tab B (B had not changed it)', ids(JSON.parse(shared.getItem(key))) === '2026-11-16T01:05:00.000Z' && ids(state.B) === '2026-11-16T01:05:00.000Z', { stored: ids(JSON.parse(shared.getItem(key))), B: ids(state.B) })
  // a generation that started long ago finishes and saves the list it started with: it must NOT delete a track another tab added meanwhile
  const staleList = [trk('2026-11-16T01:30:00.000Z')]                       // what that screen knew (no 01:05 track)
  await ev(B, 'stSyncCommit')(key, staleList, setB, tid, OPT)
  T('T3b', 'a save from a screen holding an OLDER list (a generation finishing 20 minutes later) keeps the track another tab added in between', ids(JSON.parse(shared.getItem(key))) === '2026-11-16T01:05:00.000Z,2026-11-16T01:30:00.000Z', ids(JSON.parse(shared.getItem(key))))
  state.A = state.B
  // the 20-track cap holds across tabs, newest kept
  for (let i = 0; i < 12; i++) { state.A = state.A.concat([trk('2026-11-16T02:' + String(i).padStart(2, '0') + ':00.000Z')]); await ev(A, 'stSyncCommit')(key, state.A, setA, tid, OPT)
    state.B = state.B.concat([trk('2026-11-16T03:' + String(i).padStart(2, '0') + ':00.000Z')]); await ev(B, 'stSyncCommit')(key, state.B, setB, tid, OPT) }
  const st2 = JSON.parse(shared.getItem(key))
  T('T4', 'with both tabs adding tracks the list is capped at 20 and keeps the newest', st2.length === 20 && st2[st2.length - 1].createdAt === '2026-11-16T03:11:00.000Z' && st2.every((t, i) => !i || st2[i - 1].createdAt < t.createdAt), { n: st2.length, last: st2[st2.length - 1] && st2[st2.length - 1].createdAt })

  // ── two tabs, words ──
  const vk = 'tt-vocab', words = () => [1, 2, 3, 4, 5].map(i => wd(i))
  shared.setItem(vk, JSON.stringify(words()))
  ev(A, 'stSyncMark')(vk, words(), wid); ev(B, 'stSyncMark')(vk, words(), wid)
  const vs = { A: words(), B: words() }
  const setVA = f => { vs.A = f(vs.A) }, setVB = f => { vs.B = f(vs.B) }
  const lv = (t, setter) => ev(t, 'stSyncOnChange')(vk, stored => { const target = Array.isArray(stored) ? stored : []; const expect = t.c.ev('ST_SYNC').base.get(vk) || new Map(); t.c.ev('ST_SYNC').base.set(vk, snap(target, wid)); setter(cur => adopt(cur, expect, target, wid).next) })
  lv(A, setVA); lv(B, setVB)
  vs.A = vs.A.map(w => w.id === 1 ? { ...w, status: 'learning', repCount: 1 } : w); await ev(A, 'stSyncCommit')(vk, vs.A, setVA, wid)
  vs.B = vs.B.map(w => w.id === 2 ? { ...w, status: 'learning', repCount: 1 } : w); await ev(B, 'stSyncCommit')(vk, vs.B, setVB, wid)
  const sv = JSON.parse(shared.getItem(vk))
  T('W1', 'tab A rates word 1, tab B (stale copy) rates word 2 → storage has BOTH ratings (before: the second save undid the first)', sv.find(w => w.id === 1).repCount === 1 && sv.find(w => w.id === 2).repCount === 1 && sv.length === 5, sv.map(w => w.id + ':' + w.repCount))
  T('W2', 'and both tabs show both ratings', [vs.A, vs.B].every(l => l.find(w => w.id === 1).repCount === 1 && l.find(w => w.id === 2).repCount === 1), { A: vs.A.map(w => w.repCount), B: vs.B.map(w => w.repCount) })
  // a save while another tab's change has not arrived yet: B rates word 3 right after A rated word 4 (event not yet delivered)
  tabs.forEach(t => t.deliver = false)
  const stash = []; const origFire = B.fire; B.fire = e => stash.push(e)
  vs.A = vs.A.map(w => w.id === 4 ? { ...w, repCount: 7 } : w); await ev(A, 'stSyncCommit')(vk, vs.A, setVA, wid)
  vs.B = vs.B.map(w => w.id === 3 ? { ...w, repCount: 3 } : w); await ev(B, 'stSyncCommit')(vk, vs.B, setVB, wid)
  B.fire = origFire; stash.forEach(e => B.fire(e))
  const sv2 = JSON.parse(shared.getItem(vk))
  T('W3', 'even when the other tab\'s message has not arrived yet, a save re-reads storage first: both word 3 and word 4 keep their ratings', sv2.find(w => w.id === 3).repCount === 3 && sv2.find(w => w.id === 4).repCount === 7, sv2.map(w => w.id + ':' + w.repCount))

  // a generation finishing in tab A saves the (old) word list it started with: the rating tab B made meanwhile must survive
  const VO = ev(A, 'ST_VOCAB_OPTS')
  vs.B = vs.B.map(w => w.id === 5 ? { ...w, status: 'learning', repCount: 2, lastSeen: '2026-11-16' } : w); await ev(B, 'stSyncCommit')(vk, vs.B, setVB, wid, VO)
  const oldCopy = words().map(w => w.id === 1 ? { ...w, repCount: 1, status: 'learning' } : w)             // tab A's list as it was when its generation began (word 5 unrated)
  await ev(A, 'stSyncCommit')(vk, oldCopy, setVA, wid, VO)
  T('W4', 'a save from an OLD copy of the word list (a generation that started before tab B\'s rating) does not undo word 5\'s rating', JSON.parse(shared.getItem(vk)).find(w => w.id === 5).repCount === 2, JSON.parse(shared.getItem(vk)).map(w => w.id + ':' + w.repCount))
  const imp = [wd(1, { repCount: 0 }), wd(2, { repCount: 0 })]
  await ev(A, 'stSyncCommit')(vk, imp, setVA, wid, { ...VO, replace: true })
  T('W5', 'an import (replace) puts the imported words in, even where they are older, and removes the rest', JSON.parse(shared.getItem(vk)).length === 2 && JSON.parse(shared.getItem(vk)).every(w => w.repCount === 0))
  // ── per-tab recovery saves ──
  const cp = (at, extra) => ({ version: 1, createdAt: at, updatedAt: at, accepted: [], ...(extra || {}) })
  await ev(A, 'genCheckpointWrite')('ja', cp(new Date().toISOString(), { tag: 'A' }))
  const seenByB = await ev(B, 'genCheckpointLoad')('ja')
  T('P1', 'a generation running in tab A (its recovery save written seconds ago) is NOT offered in tab B, and B writing its own does not overwrite it', seenByB === null)
  await ev(B, 'genCheckpointWrite')('ja', cp(new Date().toISOString(), { tag: 'B' }))
  const ownA = await ev(A, 'genCheckpointLoad')('ja'), ownB = await ev(B, 'genCheckpointLoad')('ja')
  T('P2', 'each tab finds ITS OWN recovery save (A → A, B → B)', ownA && ownA.tag === 'A' && ownB && ownB.tag === 'B', { ownA, ownB })
  // a tab that stopped writing 2+ minutes ago: another tab can pick its draft up (as before, "resume" is offered) and it is MOVED
  await ev(A, 'genCheckpointWrite')('ja', cp(new Date(Date.now() - 10 * 60 * 1000).toISOString(), { tag: 'A-old' }))
  await ev(B, 'genCheckpointClear')('ja')
  const C = openTab()
  const taken = await ev(C, 'genCheckpointLoad')('ja')
  T('P3', 'a draft nobody has written to for 10 minutes is offered in a NEW tab, which takes it over (the old tab\'s copy is removed)', taken && taken.tag === 'A-old' && ![...Array(shared.length).keys()].some(i => /gen-checkpoint@/.test(shared.key(i)) && shared.key(i) !== 'tt-ja-gen-checkpoint@' + ev(C, 'TAB_ID')), { taken, keys: [...Array(shared.length).keys()].map(i => shared.key(i)).filter(k => /checkpoint/.test(k)) })
  await ev(C, 'genCheckpointClear')('ja')
  T('P4', 'clearing a recovery save removes only this tab\'s', !(await ev(C, 'genCheckpointLoad')('ja')))
  // the Thai draft (read synchronously by the generator screen)
  ev(A, 'stTabWriteSync')('tt-gen-draft', JSON.stringify({ pairs: [1], savedAt: new Date().toISOString(), who: 'A' }))
  T('P5', 'the Thai draft is per tab: B does not see A\'s fresh draft; A does', ev(B, 'stTabReadSync')('tt-gen-draft') === null && /"who":"A"/.test(ev(A, 'stTabReadSync')('tt-gen-draft')))

  // ── spend ──
  shared.setItem('tt-gemini-spend', '1')
  const s1 = ev(A, 'stAddToNumber')('tt-gemini-spend', 1, 0.5)
  const s2 = ev(B, 'stAddToNumber')('tt-gemini-spend', 1, 0.25)      // B's own copy is stale (1)
  T('S1', 'the spend counter adds to the stored total: 1 + 0.5 (tab A) + 0.25 (tab B, stale copy) = 1.75, not the last tab\'s value', s1 === 1.5 && s2 === 1.75 && parseFloat(shared.getItem('tt-gemini-spend')) === 1.75, { s1, s2 })

  // ── listener plumbing ──
  let got = 0, unsub
  unsub = ev(A, 'stSyncOnChange')('tt-probe', v => { got += v && v.n })
  A.fire({ key: 'tt-probe', newValue: JSON.stringify({ n: 2 }), storageArea: A.ls }); A.fire({ key: 'tt-other', newValue: '{"n":5}', storageArea: A.ls })
  unsub(); A.fire({ key: 'tt-probe', newValue: JSON.stringify({ n: 9 }), storageArea: A.ls })
  T('L1', 'a "storage" event reaches the listener of ITS key only, and not after it is removed', got === 2, got)
  // ── Web Locks: the stored list is read and written inside one lock ──
  let locks = []
  A.c.navigator.locks = { request: async (name, fn) => { locks.push(name); return fn() } }
  await ev(A, 'stSyncCommit')('tt-lockprobe', [wd(1)], null, wid)
  T('L2', 'a merged save runs inside a Web Lock named after the list (two tabs cannot interleave read-and-write)', locks.length === 1 && locks[0] === 'tt-store:tt-lockprobe', locks)
  A.c.navigator.locks.request = async (name, fn) => { throw new Error('the work failed') }
  let threw = false; try { await ev(A, 'stWithLock')('x', () => 1) } catch (e) { threw = true }
  T('L3', 'where Web Locks do not exist the save simply runs (no lock)', await (async () => { delete A.c.navigator.locks; return (await ev(A, 'stWithLock')('x', async () => 42)) === 42 })() && threw)
  console.log((fails ? 'FAIL ' : 'ALL PASS ') + (n - fails) + '/' + n)
  process.exit(fails ? 1 : 0)
})()
