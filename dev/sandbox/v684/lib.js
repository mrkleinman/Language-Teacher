// v684 offline helpers: a gate context from a benchmark fixture, reference fixtures → lesson lines, the v683 baseline → lines.
'use strict'
const fs = require('fs'), path = require('path')
const ROOT = path.join(__dirname, '..', '..')
function fixture(id) { return JSON.parse(fs.readFileSync(path.join(ROOT, 'benchmark', 'fixtures', id + '.json'), 'utf8')) }
// the learner state of a fixture, exactly as the bench builds it, and a v684 context for the gate
function gateContext(c, fxId, onlyTargets) {
  const fx = fixture(fxId), lang = fx.language
  c.setLearnerStateOverride({ rank: fx.belt.rank, source: 'v684-offline ' + fx.id })
  const vocab = c.ttBenchApplyFixture(c.ttBenchBank(lang), fx), byId = new Map(vocab.map(w => [w.id, w]))
  const all = fx.targets.map(t => byId.get(t.id)).filter(Boolean)
  const targets = onlyTargets ? all.filter(t => onlyTargets.includes(c.v684Surface(lang, t))) : all
  const ctx = c.v684Context({ lang, vocab, targets: all, onLog: () => {} })
  if (onlyTargets) { ctx.recs = ctx.recs.filter(r => onlyTargets.includes(r.surface)); ctx.targets = targets }
  return { fx, lang, vocab, ctx, targets, allTargets: all }
}
// reference fixtures (exchange format) → lesson lines + cards
function referenceLesson(lang, ref, ctx) {
  const lines = []
  ref.forEach(t => {
    const rec = ctx.recs.find(r => r.surface === t.target.surface)
    t.recalls.forEach(r => {
      const exId = t.target.surface + '#' + r.k
      r.exchange.forEach((x, i) => {
        const l = { id: exId + '.' + (i + 1), exchange: exId, idx: i, voice: x.voice, role: x.role, addressee: x.target ? r.intent.addressee : (r.exchange.find(y => y.target) || {}).role,
          relation: x.target ? r.intent.relation : (r.intent.relation), situation: r.intent.situation, purpose: x.target ? r.intent.purpose : '', text: x.text, english: x.en, cue: x.cue || '',
          reading: x.reading, romaji: x.romaji, pinyin: x.pinyin, spoken: x.spoken || '', ph: x.ph,
          target: x.target ? { id: rec ? rec.id : null, surface: t.target.surface, recall: r.k, functionId: r.function, sense: r.sense } : null }
        lines.push(l)
      })
    })
  })
  return lines
}
// a judge that says "true" for every criterion (to exercise everything EXCEPT the judge) — never used to claim quality
function passAllJudge(c, lines) { c.v684JudgeApply(lines, { items: lines.map(l => ({ id: l.id, sense: true, grammar: true, natural: true, cue: true, meaning: true, intent: true, distinct: true, coherence: true, note: '' })) }) }
module.exports = { fixture, gateContext, referenceLesson, passAllJudge, ROOT }
