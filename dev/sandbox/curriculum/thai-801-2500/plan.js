// node plan.js → plan.json: the final word for every slot 801–2500 (owner lists + the owner's 42 replacements + the three "..." fixes),
// matched against the Thai dictionary literal in tt.jsx (exact NFC, spacing-blind; dup / canonicalOf aliases resolve to the canonical id)
const fs = require('fs'), path = require('path')
const DIR = __dirname, TT = path.join(DIR, '..', '..', '..', 'tt.jsx')
const LIT0 = JSON.parse(/^const RAW_VOCAB = (\[.*\])\s*$/m.exec(fs.readFileSync(TT, 'utf8'))[1])
// the runtime dictionary also holds the Wedding Speech topic words (ids 5001+, built from their own table): they are existing
// records too (same id, same learner history), so matching uses the runtime list; a topic record is copied into the literal on write
const { load } = require(path.join(DIR, '..', '..', '..', 'harness.js'))
const RT = load(path.join(DIR, '..', '..', '..', 'tt.compiled.js'), { realBelt: true }).ev('RAW_VOCAB')
const litIds = new Set(LIT0.map(d => d.id))
const LIT = LIT0.concat(RT.filter(d => !litIds.has(d.id)))
const nf = s => String(s || '').normalize('NFC').replace(/\s+/g, '')
const items = []
for (const f of ['kyu6-owner.txt', 'kyu5-owner.txt', 'kyu4-owner.txt', 'kyu3-owner.txt', 'kyu2-owner.txt', 'kyu1-owner.txt'])
  for (const m of fs.readFileSync(path.join(DIR, f), 'utf8').matchAll(/(\d+) `([^`]+)`( 🇹🇭)? — ([^·\n]+)/g)) items.push({ slot: +m[1], t: m[2].normalize('NFC').trim(), ctx: !!m[3], en: m[4].trim() })
const repl = fs.readFileSync(path.join(DIR, 'replacements-42.tsv'), 'utf8').trim().split('\n').map(l => { const [slot, t, en, ctx] = l.split('\t'); return { slot: +slot, t: t.normalize('NFC'), en, ctx: ctx === '1' } })
const FIX = { 1568: 'อยากจะ', 1631: 'ฉันชื่อ', 1651: 'ยกขึ้น' }   // owner, 2026-10-20: the "..." entries' fixed forms
const bySlot = new Map(items.map(x => [x.slot, x]))
repl.forEach(r => bySlot.set(r.slot, { ...r, replaced: bySlot.get(r.slot) && bySlot.get(r.slot).t }))
Object.entries(FIX).forEach(([s, t]) => { const x = bySlot.get(+s); bySlot.set(+s, { ...x, t, fixedFrom: x.t }) })
const placed = new Map(LIT.filter(d => d.curriculumIndex).map(d => [nf(d.t), d]))
const canon = d => d.dup ? LIT.find(x => x.id === d.dup) || d : d
const plan = [], problems = []
for (let s = 801; s <= 2500; s++) {
  const x = bySlot.get(s); if (!x) { problems.push('missing slot ' + s); continue }
  const hits = LIT.filter(d => nf(d.t) === nf(x.t)).map(canon).filter((d, i, a) => a.indexOf(d) === i)
  if (placed.has(nf(x.t))) problems.push(s + ' ' + x.t + ' already at ' + placed.get(nf(x.t)).curriculumIndex)
  if (hits.length > 1) problems.push(s + ' ' + x.t + ' ambiguous ids ' + hits.map(d => d.id))
  plan.push({ slot: s, t: x.t, en: x.en, ctx: x.ctx, id: hits.length ? hits[0].id : null, ...(hits.length && !litIds.has(hits[0].id) ? { topicRecord: true } : {}), ...(x.replaced ? { replaced: x.replaced } : {}), ...(x.fixedFrom ? { fixedFrom: x.fixedFrom } : {}) })
}
const seen = new Map(); plan.forEach(p => { const k = nf(p.t); if (seen.has(k)) problems.push('duplicate ' + p.t + ' at ' + seen.get(k) + ' and ' + p.slot); seen.set(k, p.slot) })
const ids = plan.filter(p => p.id != null).map(p => p.id); if (new Set(ids).size !== ids.length) problems.push('an id is used twice')
fs.writeFileSync(path.join(DIR, 'plan.json'), JSON.stringify(plan, null, 1))
console.log('topic records reused', plan.filter(p => p.topicRecord).length, '·', 'slots', plan.length, '· reuse', ids.length, '· new', plan.filter(p => p.id == null).length, '· context', plan.filter(p => p.ctx).length, '· problems', problems.length)
problems.forEach(p => console.log('  ' + p))
