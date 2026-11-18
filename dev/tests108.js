// 18 Nov — Thai Daily speed: the owner's 17 Nov export spent 41% of its model time on 24 blind retries of single hard words (ไม่เชิง took 11 paid checks, นั่นอะไร 8): the reason text
// quoted the rejected sentence, so the SAME refusal looked different every time and the "same rejection 3 times" guard never fired; and nothing capped a word that kept failing for
// different reasons. Now the refusal key ignores the quoted sentence, and a word still rejected after THAI_RETRY_GUARD.maxChecks (7) paid checks goes to targeted quota recovery.
// Real application functions; the only stand-in is the model transport (scripted replies). Switch: thaiRetryGuardSetEnabled(false) restores the 11-check ladder.
const { load } = require('./harness')
const FILE = process.env.TT_FILE || 'tt.compiled.js'
let n = 0, fails = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; console.log((pass ? 'PASS ' : 'FAIL ') + id + '  ' + name + (!pass && detail !== undefined ? '\n      ' + JSON.stringify(detail).slice(0, 300) : '')) }
const learned = v => { v.forEach(w => { if (w.curriculumIndex >= 1 && w.curriculumIndex <= 360) { w.status = 'learning'; w.lastSeen = '2026-09-20'; w.introducedAt = '2026-08-01' } }); return v }
const L = (speaker, thai, english) => ({ speaker, thai, english, prompt: (speaker === 'A' ? 'He says: ' : 'She says: ') + english.replace(/[.?]$/, '').toLowerCase() })
;(async () => {
  {
    const c = load(FILE); const key = c.ev('thaiRejectionKey')
    const a = key('Line 1: "ไม่เชิงครับ ผมชอบน้ำ" — after ไม่เชิง the speaker must say what they do mean'), b = key('Line 2: "ไม่เชิงค่ะ ฉันอยากดื่มน้ำเย็น" — after ไม่เชิง the speaker must say what they do mean')
    const x = key('"นั่นอะไร" opens two lines — the same phrase said twice is one use, not two'), y = key('Two lines use "ร้อย" in the same phrase ("ร้อยบาท…") — give each line a different use')
    T('R1', 'the same rule refusing two DIFFERENT quoted sentences has the SAME key (it did not before: the guard never fired for ไม่เชิง)', a === b && a.length > 10, { a, b })
    T('R2', 'different rules keep different keys, and a trailing " in: <sentence>" is dropped', x !== y && key('TARGET_MISSING: no target "พวก" in: ผมชอบ') === key('TARGET_MISSING: no target "พวก" in: ฉันไป'), { x, y })
  }
  async function run(guardOn) {
    const c = load(FILE); const v = learned(c.initVocab()); c.thaiRetryGuardSetEnabled(guardOn)
    const target = { ...v.find(w => w.thai === 'ข้าวเหนียว') }
    target._trackTargets = [target]; target._allowedSet = c.buildThaiAllowedSet({ vocab: v, trackTargets: [target], grammarWords: c.ev('THAI_TRACK_GRAMMAR_WORDS') })
    let calls = 0; c.mockGeminiGenerate = async () => { calls++; return JSON.stringify([L('A', 'ผมชอบข้าว' + 'ๆ'.repeat(calls) + 'ครับ', 'x'), L('B', 'ฉันชอบข้าว' + 'ๆ'.repeat(calls + 1) + 'ค่ะ', 'y'), L('A', 'ผมกินข้าว' + 'ๆ'.repeat(calls) + 'ครับ', 'z')]) }
    const log = []
    await c.generateWordLines(target, 'At a market.', 'Somchai, a Thai man', 'Nida, a Thai woman', [], v, 'k', 'm', 0, (d, t, m) => { if (m && m.apiError) log.push(m.apiError) }, '', new Set())
    return { calls, log }
  }
  const on = await run(true), off = await run(false)
  T('R3', 'a word that fails every check for different reasons stops after 7 paid checks with the guard on', on.calls === 7, { calls: on.calls })
  T('R4', 'with the guard switched off the old ladder is back (more than 7 checks), so the switch really compares the two', off.calls > 7, { calls: off.calls })
  {
    const SRC = require('fs').readFileSync('tt.jsx', 'utf8')
    T('R5', 'the Haiku request timeout waits through appSleep (counts in a worker while the page is hidden) instead of an ordinary timer: a call that hangs is abandoned on time (live: 154 / 243 / 515 s calls under a 180 s limit)',
      /appSleep\(anthropicTimeoutFor\(stageNow\)\)\.then\(\(\) => \{ if \(!_timedOut\)/.test(SRC) && !/setTimeout\(\(\) => controller\.abort\(\), ANTHROPIC_CONFIG\.timeoutMs\)/.test(SRC))
    T('R5b', 'the Gemini request timeout waits through appSleep too', /appSleep\(GEMINI_TIMEOUT_MS\)\.then\(\(\) => \{ if \(!_gTimedOut\)/.test(SRC) && !/setTimeout\(\(\) => controller\.abort\(\), GEMINI_TIMEOUT_MS\)/.test(SRC))
    T('R5c', 'a writing / checking / bridge stage is given 90 s (answers take 3-65 s), a planning stage keeps 180 s', (() => { const c2 = load(FILE); const f = c2.ev('anthropicTimeoutFor'); return f('B_generation_retry') === 90000 && f('Y_bridge') === 90000 && f('F_naturalness_final') === 90000 && f('O_listening_plan') === 180000 && f('') === 180000 })())
    T('R6', 'after one bridge batch is cut off with thinking on, the later batches of the run start with thinking off', /let _cutOnce = false/.test(SRC) && /const noThinkFirst = _cutOnce/.test(SRC))
  }
  console.log('\n' + (n - fails) + '/' + n + ' passed'); process.exit(fails ? 1 : 0)
})()
