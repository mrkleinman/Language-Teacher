#!/usr/bin/env node
// v676 (Step 0) — imports the answer files native-speaker reviewers download from golden-v1-review.html into ONE
// separate file, golden-v1.human-labels.json. Model labels (golden-v1.json = annotator A, golden-v1.annotator-b.json =
// annotator B) are never read or changed here: a human label never overwrites a model label, and a model label is never
// counted as human. Every value is validated against the rubric; incomplete items are kept but marked incomplete.
//   node benchmark/evaluator/golden/import_human_labels.js answers-th-Anna.json [answers-ja-Ken.json …]
'use strict'
const fs = require('fs'), path = require('path')
const { DIMENSIONS, ERROR_CATEGORIES } = require('../rubric')
const OUT = path.join(__dirname, 'golden-v1.human-labels.json')
function importFiles(objs, existing) {
  const pack = JSON.parse(fs.readFileSync(path.join(__dirname, 'golden-v1.review-pack.json'), 'utf8'))
  const ids = new Map(pack.items.map(it => [it.id, it]))
  const db = existing || { format: 'tt-golden-human-label-set/1', golden: 'golden-v1', labelKind: 'HUMAN — native-speaker review (blind)', reviewers: [], labels: [] }
  const problems = []
  for (const o of objs) {
    if (!o || o.format !== 'tt-golden-human-labels/1') { problems.push('not a review answer file'); continue }
    const r = o.reviewer || {}
    const rid = (r.name || 'anonymous') + '|' + (r.reviewedLanguage || '?')
    if (!db.reviewers.some(x => x.id === rid)) db.reviewers.push({ id: rid, name: r.name || null, nativeLanguage: r.nativeLanguage || null, selfDeclaredNative: !!r.isNative, reviewedLanguage: r.reviewedLanguage || null, exportedAt: o.exportedAt || null })
    for (const a of o.items || []) {
      const it = ids.get(a.id)
      if (!it) { problems.push(a.id + ': unknown item'); continue }
      if (it.language !== r.reviewedLanguage) { problems.push(a.id + ': language mismatch'); continue }
      const v = {}, bad = []
      Object.entries(DIMENSIONS).forEach(([d, D]) => { const x = a.verdicts && a.verdicts[d]; if (x == null) return; if (D.values.includes(x)) v[d] = x; else bad.push(d + '=' + x) })
      const complete = Object.keys(DIMENSIONS).every(d => v[d] != null)
      const row = { id: a.id, language: it.language, reviewer: rid, labelKind: 'HUMAN', complete, unsure: !!a.unsure, verdicts: v,
        errorCategories: (a.errorCategories || []).filter(c => ERROR_CATEGORIES[c]), comment: a.comment || '', answeredAt: a.answeredAt || null, invalidValues: bad }
      const k = db.labels.findIndex(x => x.id === row.id && x.reviewer === rid)
      if (k >= 0) db.labels[k] = row; else db.labels.push(row)
    }
  }
  db.counts = db.labels.filter(l => l.complete).reduce((acc, l) => { acc[l.language] = (acc[l.language] || 0) + 1; return acc }, {})
  return { db, problems }
}
module.exports = { importFiles }
if (require.main === module) {
  const files = process.argv.slice(2)
  if (!files.length) { console.log('usage: node import_human_labels.js <answer files…>'); process.exit(2) }
  const existing = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : null
  const { db, problems } = importFiles(files.map(f => JSON.parse(fs.readFileSync(f, 'utf8'))), existing)
  fs.writeFileSync(OUT, JSON.stringify(db, null, 1))
  console.log('human labels: ' + db.labels.length + ' (' + JSON.stringify(db.counts) + ' complete) from ' + db.reviewers.length + ' reviewer(s) → ' + path.relative(process.cwd(), OUT))
  if (problems.length) console.log('problems: ' + problems.slice(0, 10).join('; '))
}
