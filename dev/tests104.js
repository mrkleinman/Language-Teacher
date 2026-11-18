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
  let blocks = 0, bad = [], firstOk = 0, laterOk = 0, laterN = 0, named = 0
  for (const rows of D.byCell.values()) for (const m of rows) {
    const id = Object.keys(data.t).find(i => data.t[i][2] === m.cell && data.t[i][1] <= m.tier && !(m.excl && m.excl.has(i))); if (!id) continue
    const t = data.t[id], tag = { word: t[0], tier: t[1], cell: t[2], slot: t[3], plural: t[4], measure: t[5], measureYale: t[6] }
    const L = c.ev('yueModuleRender')({ m, tag }, bank.get(id)); if (!L) continue
    blocks++
    if (L[0].prompt === (/^[A-Za-z]/.test(L[0].prompt) ? L[0].prompt : '') && /^[A-Z][^:]*, say: “/.test(L[0].prompt) && L[0].prompt.endsWith('“' + L[0].english + '”')) firstOk++
    if (/^(At|On|In)\b/.test(L[0].prompt)) named++
    L.slice(1).forEach(l => { laterN++; if (l.prompt === 'Say: “' + l.english + '”') laterOk++ })
    if (L.some(l => !l._basePrompt) || /[{}]/.test(L.map(l => l.prompt).join(''))) bad.push(m.id)
  }
  T('K1', blocks + ' lesson blocks: the first cue is "<Place>, say: “the English”" (or "New chat, say: …" when the place has no name here)', blocks > 4000 && firstOk === blocks, { blocks, firstOk })
  T('K2', 'every later cue is exactly "Say: “the English”" — one short line, nothing else', laterN > 8000 && laterOk === laterN, { laterN, laterOk })
  T('K3', 'a place is named on the first cue of nearly every block (' + named + ' of ' + blocks + ')', named > blocks * 0.98, { named, blocks })
  T('K4', 'no slot token is left in any cue, and the module\'s own cue is kept as _basePrompt', bad.length === 0, bad.slice(0, 3))
  const m = [...D.byCell.values()].flat().find(x => x.id === 'X_PRONOUN.PERSON-T1-S03')
  if (m) {
    const w = V0.find(x => x.chinese === '我'), tg = data.t[String(w.id)]
    const L = c.ev('yueModuleRender')({ m, tag: { word: tg[0], tier: tg[1], cell: tg[2], slot: tg[3], plural: tg[4], measure: tg[5], measureYale: tg[6] } }, w)
    T('K5', 'the owner\'s example now reads "At a café, say: “Oh, Carrie? It is me!”" then "Say: “…”"', !!L && L[0].prompt === 'At a café, say: “Oh, Carrie? It is me!”' && L[1].prompt === 'Say: “Leon! Hello! I am Carrie.”', L && L.map(l => l.prompt))
  } else T('K5', 'example module present', false)
  T('K6', 'the quality reviewer is told each group of three is its own short chat (it flagged "Carrie? It is me!" and a repeated introduction in the owner\'s export); an idiomatic English is not a mismatch', /EACH GROUP IS ITS OWN SHORT CHAT/.test(SRC) && /is NOT a mismatch/.test(SRC)) //, /EACH GROUP IS ITS OWN SHORT CHAT/.test(SRC))
  console.log('\n' + (n - fails) + '/' + n + ' passed'); process.exit(fails ? 1 : 0)
})()
