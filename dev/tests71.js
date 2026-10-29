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
const React0 = require('react')
const mk = (on, withReact) => { const c = load(FILE, withReact ? { realBelt: true, React: React0 } : { realBelt: true }); c.console.info = () => {}; c.console.warn = () => {}; if (on) { c.ev('THAI_PHRASE_SPLIT').on = true; c.plan = c.ev('thaiPhraseSplitApply')(c.ev('RAW_VOCAB')) } return c }
const sizes = c => { const iv = c.ev('initVocab')(); const r = {}; c.ev('CURRICULUM_BELTS').forEach(b => { r[b.name] = c.ev('wordsForRank')(iv, b.name).length }); return r }

;(async () => {
  const off = mk(false), on = mk(true)
  const on2 = mk(true, true), off2 = mk(false, true)       // copies loaded with React, for rendering
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
  {
    // scheduling (the PROPOSAL awaiting the owner's approval): phrases are never among the 30 words; the opening / closing / one extra phrase come from the phrase plan
    const today = new Date().toISOString().slice(0, 10), yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    const iv = on.ev('initVocab')(), set = (id, o) => Object.assign(iv.find(w => w.id === id), o)
    iv.forEach(w => { if (w.status !== 'new' && w.dueDate) w.dueDate = '2999-01-01' })      // nothing is due unless the test says so
    const due = { status: 'learning', dueDate: yest, repCount: 2, lastSeen: yest, introducedAt: '2026-10-01', okStreak: 1 }
    set(97, due); set(100, due)                      // สวัสดี (an opening) and ไม่เป็นไร (an ordinary phrase) are due
    const pool = on.ev('thaiEligibleCandidatePool')(iv, today), plan = on.ev('thaiPhrasePlan')(iv, today, pool.eligibleIds)
    T('P1', 'a due opening phrase is the opening and a due ordinary phrase is the one extra target; no NEW phrase while a due one is available for that place',
      plan.open && plan.open.id === 97 && plan.extra && plan.extra.id === 100 && plan.open.status !== 'new', [plan.open && plan.open.thai, plan.extra && plan.extra.thai, plan.close && plan.close.thai])
    const r = on.ev('pickWords')(iv, 'daily', 0), ph = x => on.ev('isThaiPhraseEntry')(x)
    T('P2', 'a Daily has 30 targets of which exactly one is a phrase (the extra); the opening is a framing word; no other phrase is among the targets or the reserve',
      r.targets.length === 30 && r.targets.filter(ph).length === 1 && r.targets.find(ph).id === 100 && r.framing && r.framing.open && r.framing.open.id === 97 && !r.reserve.some(ph), [r.targets.length, r.targets.filter(ph).map(w => w.thai), r.framing && r.framing.open && r.framing.open.thai])
    const rv = on.ev('revisionEligible')
    T('P3', 'Revision never takes a phrase; with the split off a phrase is an ordinary word again',
      !rv(iv.find(w => w.id === 97)) && off.ev('revisionEligible')(Object.assign({}, ivOff.find(w => w.id === 97), due, { introducedAt: '2026-10-01', okStreak: 1, lastSeen: yest })), null)
    // NEW phrases: at most one per track, and only once the belt has been reached
    const fresh = on.ev('initVocab')(); fresh.forEach(w => { if (w.status !== 'new' && w.dueDate) w.dueDate = '2999-01-01' })
    const p2 = on.ev('thaiPhrasePlan')(fresh, today, on.ev('thaiEligibleCandidatePool')(fresh, today).eligibleIds)
    const newOnes = [p2.open, p2.close, p2.extra].filter(x => x && on.ev('isGenuinelyNew')(x))
    const rank = on.ev('currentRankName')(fresh), idx = on.ev('CURRICULUM_BELTS').findIndex(b => b.name === rank)
    T('P4', 'NEW phrases: never more than one per track, and each one\'s default-home belt is at or below the learner\'s current belt',
      newOnes.length <= 1 && newOnes.every(w => on.ev('thaiPhraseHomeIndex')(w) <= Math.max(idx, 0)), [rank, newOnes.map(w => w.thai)])
    const html = require('react-dom/server').renderToStaticMarkup(require('react').createElement(on2.ev('Dashboard'), { vocab: iv, tracks: [], onNav() {}, onOpenTrack() {}, onDeleteTrack() {} }))
    const txt = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
    T('P5', 'the home screen shows three groups — New items, Due words, Due phrases — and the phrase count is not in the word figure',
      /New items/.test(txt) && /Due words/.test(txt) && /Due phrases/.test(txt) && html.includes('data-item-groups'), txt.slice(0, 300))
    const html0 = require('react-dom/server').renderToStaticMarkup(require('react').createElement(off2.ev('Dashboard'), { vocab: ivOff, tracks: [], onNav() {}, onOpenTrack() {}, onDeleteTrack() {} }))
    T('P5', 'with the split off the home screen is unchanged (no item groups)', !html0.includes('data-item-groups'), null)
  }
  out.forEach(l => console.log(l))
  console.log('\nThai phrase / word split: ' + (n - fails) + '/' + n + ' passed' + (fails ? ' — ' + fails + ' FAILED' : ''))
  process.exit(fails ? 1 : 0)
})().catch(e => { out.forEach(l => console.log(l)); console.error(e); process.exit(1) })
