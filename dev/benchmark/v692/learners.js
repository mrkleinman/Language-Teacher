// v692 regression learners: the three v691 Listening runs of 13 Oct (the selected target ids from the owner's logs; the
// inventory size of each run reconstructed from the bank — Thai 9th Kyu ≈ 876 introduced words, Japanese 10th Kyu 76 + 30
// targets (curriculum 1–106), Mandarin Mukyu 30 + 30 targets (curriculum 1–63 minus 一点 / 多 / 少)). No owner data is used.
'use strict'
const V691_IDS = {
  th: [779, 359, 1233, 1479, 1536, 1539, 821, 839, 653, 717, 719, 730, 737, 761, 858, 750, 817, 840, 841, 860, 667, 669, 672, 686, 787, 815, 847, 712, 726, 799],
  ja: [101, 102, 80, 103, 104, 105, 106, 44, 83, 20, 43, 40, 82, 87, 84, 85, 86, 19, 46, 47, 31, 32, 14, 21, 22, 23, 45, 81, 33, 34],
  zh: [32, 54, 62, 63, 57, 58, 55, 56, 51, 53, 50, 47, 48, 49, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 30, 31, 52],
}
// v694: the three v693 Listening runs of 13 Oct (owner logs 14-46-45 / 14-54-41 / 14-57-34): the 30 selected ids plus the
// candidates the v693 feasibility check deferred (Thai ขนาด 1524 · เพราะ 676; Japanese いくら 22 · 何時 45 · 話す 36; Mandarin
// 多少 29 · 做 49), all due — so the v694 feasibility review decides them again
const V693_IDS = {
  th: [779, 359, 1233, 1479, 1536, 1539, 821, 839, 653, 717, 719, 730, 737, 761, 858, 744, 750, 817, 840, 841, 860, 667, 669, 672, 686, 787, 815, 847, 712, 726],
  ja: [101, 102, 80, 103, 104, 105, 106, 44, 83, 20, 43, 40, 82, 87, 84, 85, 86, 19, 46, 47, 31, 32, 14, 21, 23, 81, 33, 34, 50, 49],
  zh: [32, 54, 62, 63, 57, 58, 55, 56, 51, 53, 50, 47, 48, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 30, 31, 52, 33],
}
const V693_DEFERRED = { th: [1524, 676], ja: [22, 45, 36], zh: [29, 49] }
const surf = lang => lang === 'ja' ? 'japanese' : lang === 'zh' ? 'chinese' : 'thai'
// v695: o.dueOrder — the due words fall due one day apart in the order given (the order a run's log selected them in)
const lnDay = i => new Date(Date.UTC(2026, 0, 1 + Math.max(0, i))).toISOString().slice(0, 10)
function learner(c, lang, o = {}) {
  const vocab = lang === 'th' ? c.initVocab() : lang === 'ja' ? c.initJapaneseVocab() : c.initMandarinVocab()
  const due = new Set(o.dueIds || V691_IDS[lang].concat(lang === 'zh' ? [29] : []))
  const learn = w => { w.status = 'learning'; w.lastSeen = '2026-10-05'; w.introducedAt = w.introducedAt || '2026-09-01'; w.repCount = Math.max(w.repCount || 0, 3); w.okStreak = 1 }
  if (lang === 'zh') vocab.forEach(w => { if (w.curriculumIndex <= 63 && ![59, 60, 61].includes(w.id)) learn(w) })
  if (lang === 'ja') vocab.forEach(w => { if (w.curriculumIndex <= 106) learn(w) })
  if (lang === 'th') {
    vocab.forEach(w => { if (due.has(w.id)) learn(w) })
    let n = vocab.filter(w => w.status === 'known' || w.status === 'learning').length
    // the owner's 9th Kyu inventory contained numbers and social phrases (the v691 palettes list ห้า สอง สาม หนึ่ง สิบ ลาก่อน …):
    // they are learned first, then the bank in id order up to ≈ 876 introduced words
    const early = w => /^(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|hundred|thousand|minute|hour|goodbye|see you|thank|sorry|excuse|hello|next to|beside|travel|visit|ticket|book|reserve)/i.test(String(w.english || ''))
    for (const w of vocab.slice().sort((a, b) => (early(b) - early(a)) || a.id - b.id)) { if (n >= (o.thaiIntroduced || 906)) break; if (w.status === 'new') { learn(w); n++ } }
  }
  vocab.forEach(w => { if (w.status === 'known' || w.status === 'learning') { if (due.has(w.id)) { w.dueDate = o.dueOrder ? lnDay(o.dueIds.indexOf(w.id)) : '2026-01-01'; w.difficulty = 'hard' } else { w.dueDate = '2099-01-01'; if (w.difficulty === 'hard') w.difficulty = 'ok' } } })
  // the belt of each v691 run (log: Thai 9th Kyu · Japanese 10th Kyu · Mandarin Mukyu)
  if (o.belt !== false && typeof c.setLearnerStateOverride === 'function') c.setLearnerStateOverride({ rank: { th: '9th Kyu', ja: '10th Kyu', zh: 'Mukyu' }[lang], source: 'v692-regression' })
  return { vocab, field: surf(lang), byId: new Map(vocab.map(w => [w.id, w])) }
}
module.exports = { V691_IDS, V693_IDS, V693_DEFERRED, learner, surf }
