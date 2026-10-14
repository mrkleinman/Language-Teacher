// Score Haiku's English cues: new contract (v696) vs old, same requests.
const fs = require('fs'), path = require('path')
const DEV = '/home/user/Language-Teacher/dev', H = __dirname
const { load } = require(DEV + '/harness')
const c = load(DEV + '/tt.compiled.js', { realBelt: true })
const NARR = /^(As [A-Z][a-z]+,|(He|She|A|B|[A-Z][a-z]+)\s+(tells|says|asks|suggests|offers|answers|agrees|replies|remarks|explains|apologi[sz]es)\b|(Asking|Saying|Telling|Declining|Agreeing)\b|Tell the other person:)/
const BG = /\b(since|because|so that|to share|while|pointing|in a \w+ (tone|way)|with a \w+ tone|casually|as you|after (he|she|[AB]) said|in case)\b/i
const W = s => (String(s || '').match(/[A-Za-z][A-Za-z'-]*/g) || []).length
const items = []
for (const f of fs.readdirSync(H + '/a')) {
  const [l, i, arm] = f.replace('.txt', '').split('-'); let raw = fs.readFileSync(H + '/a/' + f, 'utf8').trim().replace(/^```(json)?\s*|```$/g, '')
  let j; try { j = JSON.parse(raw) } catch (e) { items.push({ l, i, arm, parseError: true }); continue }
  const rows = l === 'th' ? (Array.isArray(j) ? j : []).map(x => ({ sent: x.thai, en: x.english, cue: x.prompt, speaker: x.speaker }))
    : l === 'ja' ? ((j.recalls || (Array.isArray(j) ? j : [])).map(x => ({ sent: x.japanese, en: x.englishMeaning || x.english, cue: x.englishCue || x.prompt })))
    : (Array.isArray(j) ? j : [j]).map(x => ({ sent: x.chinese, en: x.english, cue: x.prompt }))
  for (const r of rows) items.push({ l, i, arm, ...r })
}
const ctx = {}; for (const l of ['th', 'ja', 'zh']) ctx[l] = { ...c.cueClarityCtx(l), names: l === 'th' ? ['Somchai', 'Nida'] : ['Ken', 'Yui'], genderOf: () => null, addrOf: () => null }
const stat = {}
for (const it of items) {
  if (it.parseError) { (stat[it.l + '-' + it.arm] = stat[it.l + '-' + it.arm] || { n: 0, parseErr: 0 }).parseErr = ((stat[it.l + '-' + it.arm] || {}).parseErr || 0) + 1; continue }
  const k = it.l + '-' + it.arm, s = stat[k] = stat[k] || { n: 0, words: 0, narr: 0, bg: 0, long: 0, passChanged: 0, A: 0, parseErr: 0, cls: {} }
  const r = c.cueClarify(it.l, { prompt: it.cue, english: it.en, [it.l === 'th' ? 'thai' : it.l === 'ja' ? 'japanese' : 'chinese']: it.sent, speaker: it.speaker || 'A', pairType: 'recall' }, ctx[it.l])
  it.after = r.cue; it.cls = r.cls; it.flags = r.flags
  s.n++; s.words += W(it.cue); if (NARR.test(it.cue || '')) s.narr++; if (BG.test(it.cue || '')) s.bg++; if (W(it.cue) > 12) s.long++
  if (r.changed) s.passChanged++; s.cls[r.cls] = (s.cls[r.cls] || 0) + 1
}
console.log('lang-arm   cues  avgWords  >12w  narration  background  v696-pass-would-change  classes')
for (const k of Object.keys(stat).sort()) { const s = stat[k]; console.log(k.padEnd(10), String(s.n).padStart(4), (s.words / s.n).toFixed(1).padStart(9), String(s.long).padStart(5), String(s.narr).padStart(10), String(s.bg).padStart(11), String(s.passChanged).padStart(23), ' ', JSON.stringify(s.cls), s.parseErr ? 'parseErr=' + s.parseErr : '') }
fs.writeFileSync(H + '/items.json', JSON.stringify(items, null, 1))
