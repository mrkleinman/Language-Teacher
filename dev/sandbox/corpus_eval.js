#!/usr/bin/env node
// v683 — runs the REAL application validators over the language-quality corpus, once with the v682 pipeline (switch OFF) and
// once with the teaching-plan pipeline (switch ON), and reports false acceptances / false rejections for each.
// Only entries with judge = 'deterministic' are decided here; 'semantic' entries need the AI judge or a human (live runs / blind review).
//   node sandbox/corpus_eval.js [--json out.json]
'use strict'
const fs = require('fs'), path = require('path')
const DEV = path.join(__dirname, '..')
const { load } = require(path.join(DEV, 'harness'))
const R = require(path.join(DEV, 'benchmark', 'run'))
function evaluator(c) {
  const zfx = R.loadFixture('zh-daily-2026-10-08'), ZV = c.ttBenchApplyFixture(c.initMandarinVocab(), zfx), ZTG = c.ttBenchJazhTargets(zfx, ZV)
  const zinv0 = c.mandarinLearnerInventory(ZV, ZTG), zrules = c.mandarinScarcityRules(zinv0)
  const jfx = R.loadFixture('ja-daily-2026-10-08'), JV = c.ttBenchApplyFixture(c.initJapaneseVocab(), jfx), JTG = c.ttBenchJazhTargets(jfx, JV)
  const jinv = c.japaneseLearnerInventory(JV, JTG), jrules = c.scarcityRules(jinv)
  const TV = c.initVocab()
  const strip = x => String(x || '').replace(/[\s，。？！；、]/g, '')
  return e => {
    if (e.lang === 'zh') {
      const t = ZTG.find(w => w.chinese === e.target) || ZV.find(w => w.chinese === e.target)
      if (!t) return { verdict: 'n/a', why: 'target not in the fixture' }
      const zinv = ZTG.some(w => w.id === t.id) ? zinv0 : c.mandarinLearnerInventory(ZV, ZTG.concat([t]))
      const segs = c.segmentMandarin(e.text, zinv.lexicon)
      const cand = { chinese: e.text, english: e.english || 'x', prompt: e.cue || 'Say x', pinyin: segs.map(s => s.pinyin || s.surface).join(' '), segments: e.modelSegments || segs }
      const seen = new Map((e.accepted || []).map(a => [strip(a), t.id]))
      const v = c.validateMandarinPair(cand, t, zinv, ZV, zrules, seen)
      if (!v.ok) return { verdict: 'reject', why: v.problems[0] }
      const mine = e.accepted || []
      const same = c.teachingPlanOn() ? mine.find(m => c.zhSameUse(m, e.text, t.chinese))
        : mine.find(m => c.zhAskOrSay(m) + '|' + c.zhApplicationKey(m, t.chinese) === c.zhAskOrSay(e.text) + '|' + c.zhApplicationKey(e.text, t.chinese))
      return same ? { verdict: 'reject', why: 'same application as ' + same } : { verdict: 'accept', why: '' }
    }
    if (e.lang === 'ja') {
      const t = JTG.find(w => w.japanese === e.target) || JV.find(w => w.japanese === e.target)
      if (!t) return { verdict: 'n/a', why: 'target not in the fixture' }
      const seen = new Map((e.accepted || []).map((a, i) => ['acc' + i, { targetId: t.id, text: a }]))
      // the target is always part of the learner's allowed words for its own recall
      const inv = JTG.some(w => w.id === t.id) ? jinv : c.japaneseLearnerInventory(JV, JTG.concat([t]))
      const r = c.jaEvaluateRecallCandidate({ japanese: e.text, english: e.english || 'x', prompt: e.cue || 'Say x', ...(e.reading ? { reading: e.reading } : {}), ...(e.romaji ? { romaji: e.romaji } : {}), ...(e.segments ? { segments: e.segments } : {}) },
        { target: t, inv, vocab: JV, registerId: c.ev('JA_REGISTER_DEFAULT'), seenMap: seen, rules: c.scarcityRules(inv), opts: {}, onLog: null })
      if (!r.ok) return { verdict: 'reject', why: r.failure }
      if (r.dup && r.dup.ok === false) return { verdict: 'reject', why: r.dup.reason || 'duplicate' }
      return { verdict: 'accept', why: '' }
    }
    if (e.lang === 'th') {
      const surf = String(e.target).split(' ')[0]
      const t = TV.find(w => w.thai === surf)
      if (!t) return { verdict: 'n/a', why: 'target not in the bank' }
      const why = []
      const ws = c.teachingPlanOn() ? c.thaiTpSenseProblem(e.text, t) : ''
      if (ws) why.push(ws)
      c.thaiLexicalSenseProblems({ thai: e.text, english: e.english || '' }).forEach(g => why.push(g.id))
      // the speaker the pipeline assigns to a line carrying this target (gender-bound targets → their own speaker)
      const sp = c.thaiGenderedTargetSpeaker(surf) || (/(ค่ะ|คะ)$/.test(e.text) && /คะ/.test(surf) ? 'B' : 'A')
      const pr = c.validateThaiSpeakerParticle(e.text, c.thaiSpeakerMapGender(sp))
      if (pr && pr.ok === false) why.push('SPEAKER: ' + (pr.reason || pr.problems && pr.problems[0] || 'particle'))
      if (/^(ผม|ฉัน|เรา|คุณ)?(จะ)?ไป(รถตู้|รถเมล์|รถไฟ|แท็กซี่|รถสองแถว|ตุ๊กตุ๊ก)/.test(e.text.replace(/\s/g, '')) && !c.thaiLexicalSenseProblems({ thai: e.text, english: '' }).length) {
        // the vehicle collocation is judged by the early semantic gate (AI) in v682 — reported as such, not decided here
        return { verdict: 'needs-ai', why: 'vehicle collocation is judged by the semantic gate' }
      }
      return why.length ? { verdict: 'reject', why: why[0] } : { verdict: 'accept', why: '' }
    }
    return { verdict: 'n/a', why: 'unknown language' }
  }
}
function run(appFile) {
  const corpus = JSON.parse(fs.readFileSync(path.join(__dirname, 'corpus', 'language-quality-corpus.json'), 'utf8'))
  const c = load(appFile || path.join(DEV, 'tt.compiled.js'), { realBelt: true })
  const ev = evaluator(c)
  const rows = []
  for (const e of corpus.entries.filter(x => x.judge === 'deterministic')) {
    const exp = /^reject/.test(e.expected) ? 'reject' : 'accept'
    const out = {}
    for (const mode of ['old', 'new']) {
      const was = c.setTeachingPlan(mode === 'new')
      let r; try { r = ev(e) } catch (err) { r = { verdict: 'error', why: String(err && err.message || err).slice(0, 120) } }
      c.setTeachingPlan(was)
      out[mode] = { ...r, correct: r.verdict === exp }
    }
    rows.push({ lang: e.lang, target: e.target, text: e.text, expected: exp, old: out.old, new: out.new })
  }
  const score = mode => {
    const dec = rows.filter(r => r[mode].verdict === 'accept' || r[mode].verdict === 'reject')
    return { decided: dec.length, correct: dec.filter(r => r[mode].correct).length,
      falseAccept: dec.filter(r => r.expected === 'reject' && r[mode].verdict === 'accept').map(r => r.lang + ' ' + r.text),
      falseReject: dec.filter(r => r.expected === 'accept' && r[mode].verdict === 'reject').map(r => r.lang + ' ' + r.text + ' — ' + r[mode].why) }
  }
  return { rows, old: score('old'), new: score('new') }
}
module.exports = { run }
if (require.main === module) {
  const res = run(process.argv.includes('--app') ? process.argv[process.argv.indexOf('--app') + 1] : null)
  for (const r of res.rows) console.log((r.old.correct ? '✓' : '✗') + (r.new.correct ? '✓' : '✗') + ' ' + r.lang + ' [' + r.target + '] ' + r.text + ' — expected ' + r.expected +
    ' · old ' + r.old.verdict + (r.old.why ? ' (' + r.old.why.slice(0, 70) + ')' : '') + ' · new ' + r.new.verdict + (r.new.why ? ' (' + r.new.why.slice(0, 70) + ')' : ''))
  for (const m of ['old', 'new']) console.log('\n' + m.toUpperCase() + ': ' + res[m].correct + '/' + res[m].decided + ' correct · false acceptances ' + res[m].falseAccept.length + ' · false rejections ' + res[m].falseReject.length +
    (res[m].falseAccept.length ? '\n  FA: ' + res[m].falseAccept.join(' | ') : '') + (res[m].falseReject.length ? '\n  FR: ' + res[m].falseReject.join(' | ') : ''))
  const j = process.argv.indexOf('--json'); if (j > 0) fs.writeFileSync(process.argv[j + 1], JSON.stringify(res, null, 1))
}
