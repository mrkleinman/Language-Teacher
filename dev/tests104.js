// 17 Nov — Cantonese cues: "the prompts are still very confusing" (a day-one export: Leon and Carrie "met" four times with nothing to say a new chat had started, and a cue like
// "Call out to her and say it is you" did not say what to say). Every lesson block is its own little chat in a place the learner never saw. Now the first cue of each block says
// "New chat · at a café — ", and every cue ends with the English to put into Cantonese. Real application renderer and data.
const { load } = require('./harness')
const fs = require('fs'), zlib = require('zlib')
const c = load(process.env.TT_FILE || 'tt.compiled.js'); c.console.info = () => {}; c.console.warn = () => {}
let n = 0, fails = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; console.log((pass ? 'PASS ' : 'FAIL ') + id + '  ' + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 400) : '')) }
const SRC = fs.readFileSync('tt.jsx', 'utf8')
;(async () => {
  const V0 = c.initCantoneseVocab(), data = JSON.parse(zlib.gunzipSync(Buffer.from(c.ev('YUE_MODULES_GZ'), 'base64')).toString('utf8'))
  c.ev('yueModulesUseData')(data); c.yueModulesSetEnabled(true)
  const D = c.ev('YUE_MODULES').data, bank = new Map(V0.map(w => [String(w.id), w]))
  let blocks = 0, bad = [], noScene = 0, enMissing = 0, firstNew = 0, laterNew = 0
  const seenScenes = new Set()
  for (const rows of D.byCell.values()) for (const m of rows) {
    const id = Object.keys(data.t).find(i => data.t[i][2] === m.cell && data.t[i][1] <= m.tier && !(m.excl && m.excl.has(i))); if (!id) continue
    const t = data.t[id], tag = { word: t[0], tier: t[1], cell: t[2], slot: t[3], plural: t[4], measure: t[5], measureYale: t[6] }
    const L = c.ev('yueModuleRender')({ m, tag }, bank.get(id)); if (!L) continue
    blocks++; seenScenes.add(m.scene)
    if (/^New chat( · [^—]+)? — /.test(L[0].prompt)) firstNew++
    if (L.slice(1).some(l => /New chat/.test(l.prompt))) laterNew++
    if (!L.every(l => l.prompt.endsWith(' Say: “' + l.english + '”'))) enMissing++
    if (!/ · /.test(L[0].prompt.split(' — ')[0])) noScene++
    if (/[{}]/.test(L.map(l => l.prompt).join(''))) bad.push(m.id)
  }
  T('K1', blocks + ' lesson blocks: the first cue of every block starts "New chat", and no later cue does', blocks > 4000 && firstNew === blocks && laterNew === 0, { blocks, firstNew, laterNew })
  T('K2', 'every cue of every block ends with the English to say, as written on the line', enMissing === 0, { enMissing })
  T('K3', 'a place the cue names is shown ("New chat · at a café"); only a block whose place has no wording here shows just "New chat" (' + noScene + ')', noScene < blocks * 0.02 && seenScenes.size > 5, { noScene, blocks })
  T('K4', 'no slot token is left in any cue', bad.length === 0, bad.slice(0, 3))
  // the example from the owner's export
  const m = [...D.byCell.values()].flat().find(x => x.id === 'X_PRONOUN.PERSON-T1-S03'), id = '9'
  const t = data.t['3'] || data.t[id]
  if (m) {
    const w = V0.find(x => x.chinese === '我'), tg = data.t[String(w.id)]
    const L = c.ev('yueModuleRender')({ m, tag: { word: tg[0], tier: tg[1], cell: tg[2], slot: tg[3], plural: tg[4], measure: tg[5], measureYale: tg[6] } }, w)
    T('K5', 'the owner\'s example: "Call out to her and say it is you" now reads "New chat · at a café — Call out to her and say it is you. Say: “Oh, Carrie? It is me!”"', L && L[0].prompt === 'New chat · at a café — Call out to her and say it is you. Say: “Oh, Carrie? It is me!”', L && L[0].prompt)
  } else T('K5', 'example module present', false)
  T('K6', 'the quality reviewer is told each group of three is its own short chat (it flagged "Carrie? It is me!" and a repeated introduction in the owner\'s export)', /EACH GROUP IS ITS OWN SHORT CHAT/.test(SRC))
  console.log('\n' + (n - fails) + '/' + n + ' passed'); process.exit(fails ? 1 : 0)
})()
