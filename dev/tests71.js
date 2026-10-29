// Thai phrase / word split (builder prompt of 29 Oct) — a candidate behind THAI_PHRASE_SPLIT.on (off by default; nothing changes until the owner confirms)
//   S1  off by default: the bank, the belt sizes and getStats are exactly as before
//   S2  on: 114 phrases + 3,159 words = 3,273 entries; every numbered belt keeps its size; phrases leave the syllabus; the 55 promoted words fill the vacated positions
//   S3  the plan is complete (no unfilled position, no missing record) and applying it twice changes nothing
//   S4  stats: phrases are counted on their own and never added to the word figures; fill-in templates are held out of selection
//   S5  a promoted word takes its new belt's tier in the module tags
//
//   node tests71.js            (current build: tt.compiled.js, or TT_FILE)
const fs = require('fs')
const { load } = require('./harness')
const FILE = process.env.TT_FILE || __dirname + '/tt.compiled.js'
const out = []; let n = 0, fails = 0
const T = (id, name, ok, got) => { n++; if (!ok) fails++; out.push((ok ? 'PASS ' : 'FAIL ') + id.padEnd(4) + ' ' + name + (ok ? '' : '\n       got: ' + JSON.stringify(got).slice(0, 400))) }
const mk = on => { const c = load(FILE, { realBelt: true }); c.console.info = () => {}; c.console.warn = () => {}; if (on) { c.ev('THAI_PHRASE_SPLIT').on = true; c.plan = c.ev('thaiPhraseSplitApply')(c.ev('RAW_VOCAB')) } return c }
const sizes = c => { const iv = c.ev('initVocab')(); const r = {}; c.ev('CURRICULUM_BELTS').forEach(b => { r[b.name] = c.ev('wordsForRank')(iv, b.name).length }); return r }

;(async () => {
  const off = mk(false), on = mk(true)
  const D = off.ev('THAI_PHRASE_SPLIT_DATA'), ivOff = off.ev('initVocab')(), ivOn = on.ev('initVocab')()
  T('S1', 'off by default: the phrase list is not applied, stats are the old flat counts, no phrase is flagged',
    off.ev('THAI_PHRASE_SPLIT').on === false && off.ev('RAW_VOCAB').every(d => d.entryType == null) && off.ev('getStats')(ivOff).phrases === undefined && !ivOff.some(w => off.ev('isThaiPhraseEntry')(w)), off.ev('getStats')(ivOff))
  T('S2', 'the file lists 114 phrases and 55 promoted words; the bank holds 3,273 entries = 3,159 words + 114 phrases',
    D.phrases.length === 114 && D.promoted.length === 55 && ivOn.length === 3273 && ivOn.filter(w => on.ev('isThaiPhraseEntry')(w)).length === 114, [D.phrases.length, D.promoted.length, ivOn.length])
  T('S2', 'every numbered belt keeps exactly its size (100/100/200/200/200/200/200/325/325/325/325) with the split on',
    JSON.stringify(sizes(on)) === JSON.stringify(sizes(off)) && Object.values(sizes(on)).reduce((a, b) => a + b, 0) === 2500, sizes(on))
  const inSyl = on.ev('isCurriculumWord')
  T('S2', 'no phrase counts as a syllabus word (curriculum position 0) and every promoted word does, on the belt the file names',
    ivOn.filter(w => D.phrases.includes(w.id)).every(w => !inSyl(w)) && D.promoted.every(([id, belt]) => { const w = ivOn.find(x => x.id === id); return inSyl(w) && w.belt === belt }), null)
  T('S2', 'a phrase keeps its old belt only as a default home (homeBelt), e.g. สวัสดี → White, and ไม่ได้เจอกันตั้งนาน → Green + Stripe',
    on.ev('RAW_VOCAB').find(d => d.id === 97).homeBelt === 'White' && on.ev('RAW_VOCAB').find(d => d.id === 747).homeBelt === 'Green + Stripe' && on.ev('RAW_VOCAB').find(d => d.id === 1405).homeBelt === 'Beyond curriculum', null)
  T('S3', 'the plan has no problem; applying it twice gives the same positions',
    (on.plan.problems || []).length === 0 && (() => { const a = JSON.stringify(on.ev('RAW_VOCAB').map(d => [d.id, d.curriculumIndex])); on.ev('thaiPhraseSplitApply')(on.ev('RAW_VOCAB')); return a === JSON.stringify(on.ev('RAW_VOCAB').map(d => [d.id, d.curriculumIndex])) })(), on.plan.problems)
  // the two loads draw their own random due dates (initVocab spreads the seeded 'easy' words over a week), so the totals are compared on ONE list
  const st = on.ev('getStats')(ivOn), today = new Date().toISOString().slice(0, 10)
  const flat = { total: ivOn.length, due: ivOn.filter(w => w.status !== 'new' && w.dueDate && w.dueDate <= today).length, newW: ivOn.filter(w => w.status === 'new').length, learning: ivOn.filter(w => w.status === 'learning').length, known: ivOn.filter(w => w.status === 'known').length }
  T('S4', 'stats: words 3,159, phrases 114 on their own; word + phrase counts add up to the old flat counts and are never mixed',
    st.total === 3159 && flat.total === 3273 && st.phrases.total === 114 && st.due + st.phrases.due === flat.due && st.known + st.phrases.known === flat.known && st.learning + st.phrases.learning === flat.learning && st.newW + st.phrases.newW === flat.newW, [st, flat])
  const el = on.ev('thaiVocabEligibility')
  T('S4', 'the three fill-in templates (ช่วย…ได้ไหม, …อยู่ที่ไหน, …เป็นอย่างไร) are held out of selection; an ordinary phrase is not',
    D.templates.length === 3 && D.templates.every(id => el(ivOn.find(w => w.id === id)).reason === 'VOCAB_TEMPLATE_PHRASE') && el(ivOn.find(w => w.id === 97)).ok === true && D.templates.every(id => off.ev('thaiVocabEligibility')(ivOff.find(w => w.id === id)).ok), null)
  const z = require('zlib'), data = JSON.parse(z.gunzipSync(Buffer.from(on.ev('THAI_MODULES_GZ'), 'base64')).toString('utf8'))
  on.ev('thaiModulesUseData')(data)
  const tag = id => on.ev('thaiModuleTagOf')(ivOn.find(w => w.id === id))
  T('S5', 'with the split on, สบายดี (877) is a T1 word, ร้านกาแฟ (278) T4, ความรัก (5004) T5 in the module tags; before it was T5',
    tag(877).tier === 1 && tag(278).tier === 4 && tag(5004).tier === 5, [tag(877), tag(278)])
  out.forEach(l => console.log(l))
  console.log('\nThai phrase / word split: ' + (n - fails) + '/' + n + ' passed' + (fails ? ' — ' + fails + ' FAILED' : ''))
  process.exit(fails ? 1 : 0)
})().catch(e => { out.forEach(l => console.log(l)); console.error(e); process.exit(1) })
