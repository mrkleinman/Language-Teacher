// Vocab bank "Next in queue" (Thai): the chosen words go first into the next Daily, then the queue empties.
//   Q1  queue helpers: words are queued / removed; a word the generator can never teach is refused with a reason
//   Q2  the next Daily: queued NEW words come first (in the order queued), keep the belt's new-word allowance; a queued learned word is reviewed; the queue never changes Revision
//   Q3  queued phrases: a learned greeting becomes the opening, a new phrase is taught inside the new words
//   Q4  the queue empties when a track has used the words; the bank shows the button, the chip and the tag
//   node tests72.js   (TT_FILE=<compiled>)
const fs = require('fs'), { load } = require('./harness')
const FILE = process.env.TT_FILE || __dirname + '/tt.compiled.js'
const React = require('react'), RDS = require('react-dom/server')
const out = []; let n = 0, fails = 0
const T = (id, name, ok, got) => { n++; if (!ok) fails++; out.push((ok ? 'PASS ' : 'FAIL ') + id.padEnd(4) + ' ' + name + (ok ? '' : '\n       got: ' + String(JSON.stringify(got)).slice(0, 500))) }
;(async () => {
  const c = load(FILE, { realBelt: true, React }); c.console.info = () => {}; c.console.warn = () => {}
  const today = new Date().toISOString().slice(0, 10)
  const fresh = () => { const v = c.ev('initVocab')(); v.forEach(w => { if (w.status !== 'new' && w.dueDate) w.dueDate = '2999-01-01' }); return v }
  const idsOf = x => new Set(x), isNew = w => c.ev('isGenuinelyNew')(w)
  {
    const v = fresh(), newWords = v.filter(w => isNew(w) && !c.ev('isThaiPhraseEntry')(w) && c.ev('thaiVocabEligibility')(w).ok && w.curriculumIndex > 0).slice(40, 43)
    const r = c.ev('thaiQueueApply')(v, idsOf(newWords.map(w => w.id)), true, '2026-11-02T10:00:00Z')
    T('Q1', 'words are queued with a time stamp; taking them out clears it; the vocab is not mutated',
      r.refused.length === 0 && newWords.every(w => r.vocab.find(x => x.id === w.id).queuedNext === '2026-11-02T10:00:00Z') && !v.find(w => w.id === newWords[0].id).queuedNext &&
      c.ev('thaiQueueApply')(r.vocab, idsOf([newWords[0].id]), false).vocab.find(x => x.id === newWords[0].id).queuedNext === null, null)
    const bad = v.find(w => w.id === 492)      // มั้ย: a duplicate of ไหม, never taught
    const rb = c.ev('thaiQueueApply')(v, idsOf([492]), true)
    T('Q1', 'a word the generator can never teach (มั้ย, a duplicate) is refused with its reason and not queued', rb.refused.length === 1 && rb.refused[0].thai === 'มั้ย' && !rb.vocab.find(w => w.id === 492).queuedNext, rb.refused)
  }
  {
    const v = fresh()
    const cand = v.filter(w => isNew(w) && !c.ev('isThaiPhraseEntry')(w) && c.ev('thaiVocabEligibility')(w).ok && w.curriculumIndex > 400)
    const want = [cand[5], cand[9]]          // two NEW words far from the learner's current belt
    const learned = v.find(w => w.status === 'known' && !c.ev('isThaiPhraseEntry')(w) && c.ev('thaiVocabEligibility')(w).ok)
    let q = c.ev('thaiQueueApply')(v, idsOf(want.map(w => w.id)), true, '2026-11-02T10:00:00Z').vocab
    q = c.ev('thaiQueueApply')(q, idsOf([learned.id]), true, '2026-11-02T10:05:00Z').vocab
    const base = c.ev('pickWords')(v, 'daily', 0), withQ = c.ev('pickWords')(q, 'daily', 0)
    const tid = withQ.targets.map(w => w.id), lim = c.ev('getBeltConfig')(c.ev('currentRankName')(q)).newWordLimit
    T('Q2', 'the next Daily starts with the queued new words (in the order queued) and the queued learned word; none of them was in an ordinary Daily',
      withQ.targets.slice(0, 3).map(w => w.id).join() === [want[0].id, want[1].id, learned.id].join() && !want.some(w => base.targets.some(b => b.id === w.id)) && withQ.targets.filter(w => w._selectorStage === 'queued').length === 3, { tid: tid.slice(0, 6), want: want.map(w => w.id), learned: learned.id })
    T('Q2', 'the belt\'s new-word allowance still holds (' + lim + ') and the Daily keeps its 30 words',
      withQ.targets.filter(w => !w._phraseReview && isNew(w)).length <= lim && withQ.targets.filter(w => !w._phraseReview).length === 30, [withQ.targets.filter(w => isNew(w)).length, withQ.targets.length])
    // more queued new words than the allowance: the extra wait
    const many = cand.slice(20, 20 + lim + 3), qm = c.ev('thaiQueueApply')(v, idsOf(many.map(w => w.id)), true, '2026-11-02T11:00:00Z').vocab
    const pm = c.ev('pickWords')(qm, 'daily', 0)
    T('Q2', 'queue longer than the new-word allowance: only the allowance is used (oldest first), the rest wait for the following track',
      pm.targets.filter(w => w._selectorStage === 'queued').length === lim && many.slice(0, lim).every(w => pm.targets.some(t => t.id === w.id)) && !many.slice(lim).some(w => pm.targets.some(t => t.id === w.id)), pm.targets.filter(w => w._selectorStage === 'queued').length)
    const rv = c.ev('pickWords')(q, 'weak', 0)
    T('Q2', 'weak-word and Revision selection ignore the queue', !rv.targets.some(w => w._selectorStage === 'queued') && !c.ev('selectRevisionTargets')('th', q).targets.some(w => want.some(x => x.id === w.id)), null)
  }
  {
    const v = fresh(), yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    Object.assign(v.find(w => w.id === 97), { status: 'learning', dueDate: '2999-01-01', repCount: 2, lastSeen: yest, introducedAt: '2026-10-01', okStreak: 1 })      // สวัสดี learned, not due
    const newPh = v.filter(w => c.ev('isThaiPhraseEntry')(w) && isNew(w) && c.ev('thaiVocabEligibility')(w).ok)[3]
    let q = c.ev('thaiQueueApply')(v, idsOf([97, newPh.id]), true).vocab
    const pool = c.ev('thaiEligibleCandidatePool')(q, today), plan = c.ev('thaiPhrasePlan')(q, today, pool.eligibleIds)
    const pw = c.ev('pickWords')(q, 'daily', 0)
    T('Q3', 'a queued learned greeting becomes the opening even when it is not due; a queued NEW phrase is taught inside the new words (it is one of the 30)',
      plan.open && plan.open.id === 97 && plan.newPhrases.some(w => w.id === newPh.id) && pw.framing && pw.framing.open && pw.framing.open.id === 97 && pw.targets.some(w => w.id === newPh.id && !w._phraseReview), [plan.open && plan.open.thai, plan.newPhrases.map(w => w.thai)])
  }
  {
    const v = fresh(), w1 = v.find(w => isNew(w) && c.ev('thaiVocabEligibility')(w).ok && w.curriculumIndex > 400), w2 = v.find(w => isNew(w) && c.ev('thaiVocabEligibility')(w).ok && w.curriculumIndex > 500 && w.id !== w1.id)
    const q = c.ev('thaiQueueApply')(v, idsOf([w1.id, w2.id]), true).vocab
    const cl = c.ev('thaiQueueClearUsed')(q, { selectedTargetIds: [w1.id], framingWords: [] })
    T('Q4', 'after a track has used a queued word, only that word leaves the queue; with nothing used the vocab is untouched (null)',
      cl && !cl.find(w => w.id === w1.id).queuedNext && cl.find(w => w.id === w2.id).queuedNext && c.ev('thaiQueueClearUsed')(q, { selectedTargetIds: [], framingWords: [] }) === null, null)
    const html = RDS.renderToStaticMarkup(React.createElement(c.ev('Browser'), { vocab: q, onBack() {}, onVocabUpdate() {}, onCustomTrack() {}, phonetics: {} }))
    T('Q4', 'the vocab bank shows the quick ⏭ button on a word, the "queued" tag on a queued word, and the Queued (2) filter chip',
      html.includes('data-queue-word="' + w1.id + '"') && /⏭ queued/.test(html) && /Queued \(2\)/.test(html), html.length)
    const src = fs.readFileSync(__dirname + '/tt.jsx', 'utf8')
    T('Q4', 'wired: Select mode has the Next in queue / Remove buttons, and onTrackGenerated empties the queue', /Next in queue<\/button>/.test(src) && /queueWords\(managed, false\)/.test(src) && /thaiQueueClearUsed\(vocab, track\)/.test(src))
  }
  out.forEach(l => console.log(l))
  console.log('\nVocab bank "Next in queue": ' + (n - fails) + '/' + n + ' passed' + (fails ? ' — ' + fails + ' FAILED' : ''))
  process.exit(fails ? 1 : 0)
})().catch(e => { out.forEach(l => console.log(l)); console.error(e); process.exit(1) })
