// Thai curriculum 501–800 (8th Kyu Blue 501–600, 7th Kyu Blue + Stripe 601–800): data integrity.
// Reads the RAW_VOCAB source literal and the runtime dictionary of the compiled build. No provider calls.
//   node tests61.js            (current build: tt.compiled.js, or TT_FILE)
'use strict'
const fs = require('fs'), crypto = require('crypto')
const { load } = require('./harness')
const out = []; let fails = 0, n = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + String(id).padEnd(4) + ' ' + name + (!pass && detail !== undefined ? '\n      ' + JSON.stringify(detail).slice(0, 600) : '')) }
const FILE = process.env.TT_FILE || 'tt.compiled.js'
const LIT = JSON.parse(/^const RAW_VOCAB = (\[.*\])\s*$/m.exec(fs.readFileSync('tt.jsx', 'utf8'))[1])
// sha256 of the 1–500 records (sorted by curriculumIndex) as they stood before 501–800 were assigned, WITHOUT the pronunciation
// fields: v704 corrects wrong romanisations in the dictionary on purpose (แล้ว láaeo, ใช้ chái, เช่า châo …); everything else —
// Thai, gloss, ids, curriculum position, belt, SRS seeds, semantic QC — must stay byte-identical
const PRON_FIELDS = ['ph', 'phoneticQc', 'qcStatus', 'qcIssues', 'qcAudit', 'verificationEvidence']
const DIGEST_1_500 = 'f0dedc125d67dfee774604427b1e808810d66f9260287bee499c366e3451c791'
const TOPIC_REUSED = { 532: 5028, 539: 5027, 542: 5032, 555: 5019, 676: 5005 }
// v706 — EXPECTED CHANGE (owner, 2026-10-20: "ดู = watch / look, เห็น = notice — never generalise them as look or see"): the glosses of
// ดู (id 53, slot 55) and เห็น (id 786, slot 214) were changed on purpose. Only those gloss fields are put back before hashing, so every
// other field of 1–500 is still pinned byte-for-byte.
const V706_OWNER_GLOSS = { 53: { e: 'look' }, 786: { e: 'see', note: 'seeing something', usageNote: 'Perceive with the eyes. Deliberately "look at / watch" is ดู.' } }

;(async () => {
  const c = load(FILE, { realBelt: true }); c.console.info = () => {}; c.console.warn = () => {}
  const RT = c.ev('RAW_VOCAB')
  for (const [label, R] of [['source', LIT], ['runtime', RT]]) {
    const cur = R.filter(d => d.curriculumIndex > 0), cis = cur.map(d => d.curriculumIndex).sort((a, b) => a - b)
    T('A-' + label[0], label + ': curriculumIndex 1–800 continuous, no duplicate', cis.length === 800 && cis.every((v, i) => v === i + 1), { n: cis.length })
  }
  const cur = LIT.filter(d => d.curriculumIndex > 0)
  const at = (lo, hi) => cur.filter(d => d.curriculumIndex >= lo && d.curriculumIndex <= hi)
  const dg = crypto.createHash('sha256').update(JSON.stringify(at(1, 500).sort((a, b) => a.curriculumIndex - b.curriculumIndex).map(d => { const o = { ...d, ...(V706_OWNER_GLOSS[d.id] || {}) }; PRON_FIELDS.forEach(k => delete o[k]); return o }))).digest('hex')
  T('B', '1–500 byte-identical to the pre-update records apart from romanisation corrections', dg === DIGEST_1_500, dg)
  T('C', '501–600: exactly 100 records', at(501, 600).length === 100)
  T('D', '601–800: exactly 200 records', at(601, 800).length === 200)
  const belt = (name, lo) => { const rs = cur.filter(d => d.belt === name), bo = rs.map(d => d.beltOrder).sort((a, b) => a - b)
    return rs.length === 200 && rs.every(d => d.beltOrder === d.curriculumIndex - lo + 1 && c.beltForCurriculumIndex(d.curriculumIndex) === name &&
      c.beltOrderForCurriculumIndex(d.curriculumIndex) === d.beltOrder) && bo.every((v, i) => v === i + 1) }
  T('E', 'Blue: 401–600, beltOrder 1–200, matching the runtime belt functions', belt('Blue', 401))
  T('F', 'Blue + Stripe: 601–800, beltOrder 1–200, matching the runtime belt functions', belt('Blue + Stripe', 601))
  const k7 = at(601, 800), ctx = d => d.curriculumIndex % 10 === 9 || d.curriculumIndex % 10 === 0
  T('G', '7th Kyu buckets: 160 GENERAL_CONVERSATION, 40 LANGUAGE_CONTEXT on the [CTX] slots (…9, …0)',
    k7.filter(d => d.curriculumBucket === 'GENERAL_CONVERSATION').length === 160 && k7.every(d => (d.curriculumBucket === 'LANGUAGE_CONTEXT') === ctx(d)))
  T('G2', '8th Kyu 501–600: GENERAL_CONVERSATION', at(501, 600).every(d => d.curriculumBucket === 'GENERAL_CONVERSATION'))
  const norm = t => t.normalize('NFC').replace(/[\s​-‍﻿]/g, '')
  const ids = LIT.map(d => d.id), thai = cur.map(d => norm(d.t))
  T('I', 'unique ids; no duplicate Thai headword within 1–800; no curriculum record is a duplicate alias', new Set(ids).size === ids.length && new Set(thai).size === 800 && cur.every(d => !d.dup))
  T('I2', 'Thai field clean in 501–800 (Thai script only — no [CTX], numbering, Latin or labels)', at(501, 800).every(d => /^[฀-๿]+$/.test(d.t)),
    at(501, 800).filter(d => !/^[฀-๿]+$/.test(d.t)).map(d => d.curriculumIndex + ' ' + d.t))
  const top = c.topicById('th', 'wedding-speech'), rt = new Map(RT.map(d => [d.id, d]))
  T('I3', 'reused topic words keep their topic ids and membership; the topic still lists the same 50 ids 5001–5050',
    Object.entries(TOPIC_REUSED).every(([ci, id]) => { const d = rt.get(id); return d && d.curriculumIndex === +ci && !d.topicOnly && (d.topics || []).includes('wedding-speech') }) &&
    top.vocabIds.length === 50 && top.vocabIds.every((id, k) => id === 5001 + k))
  const fresh = LIT.filter(d => d.id >= 6001)
  T('J', 'new records 6001–6151 are curriculum words that start unintroduced (l hard, i/r/lp 0), semantic QC PASS',
    fresh.length === 151 && fresh.every((d, k) => d.id === 6001 + k && d.curriculumIndex > 500 && d.l === 'hard' && !d.i && !d.r && !d.lp && d.semanticQc === 'PASS' && d.ph))
  out.forEach(l => console.log(l))
  console.log('\nThai curriculum 501–800 data: ' + (n - fails) + '/' + n + ' passed' + (fails ? ' — ' + fails + ' FAILED' : ''))
  process.exit(fails ? 1 : 0)
})().catch(e => { out.forEach(l => console.log(l)); console.error(e); process.exit(1) })
