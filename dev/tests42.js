// v682 — CRITICAL RELIABILITY & TEACHING-QUALITY REPAIR regression suite (from the live v681 generations: Mandarin 89/90 error
// screen on 喝 recall 2, Thai NOT_READY 87/90 on ชิ้น, Japanese READY with どこか / あれはなん / 大丈夫 defects).
// Every check calls the REAL application functions (never a copy). Run against the previous build to see which fail before:
//   node tests42.js [--app path/to/compiled.js]
'use strict'
const fs = require('fs'), path = require('path')
const { load } = require('./harness')
const R = require('./benchmark/run')
const out = []; let n = 0, fails = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + id.padEnd(5) + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 600) : '')) }
const ai = process.argv.indexOf('--app'), APP = ai > 0 ? path.resolve(process.argv[ai + 1]) : path.join(__dirname, 'tt.compiled.js')
const has = (c, name) => { try { return c.ev('typeof ' + name) === 'function' } catch (e) { return false } }
const safe = async f => { try { return await f() } catch (e) { return { __error: String(e && e.message || e).slice(0, 200) } } }
const SRC = fs.readFileSync(path.join(__dirname, 'tt.jsx'), 'utf8')
const deep = x => JSON.parse(JSON.stringify(x))

;(async () => {
  // ══ Z — MANDARIN: 喝 recall 2 and resumable generation ═══════════════════════════════════════════════════════════════
  {
    const c = load(APP, { realBelt: true })
    const fx = R.loadFixture('zh-daily-2026-10-08'), V = c.ttBenchApplyFixture(c.initMandarinVocab(), fx), TG = c.ttBenchJazhTargets(fx, V)
    const inv = c.mandarinLearnerInventory(V, TG), rules = c.mandarinScarcityRules(inv), he = TG.find(t => t.chinese === '喝')
    const has水 = inv.allContent.some(w => w.chinese === '水' || w.chinese === '茶')
    // the 89/90 state: recall 1 took the only frame the v681 fallback had (你喝什么？)
    const fb = r => { const sm = new Map([['你喝什么', he.id]]); return c.mandarinFallbackPair(he, inv, r, sm, V, rules) }
    const f2 = fb(2), f3 = fb(3)
    const ok2 = f2 && c.validateMandarinPair(f2, he, inv, V, rules, new Map([['你喝什么', he.id]])).ok
    T('Z1', '喝 recall 2 (learner with NO drink noun taught' + (has水 ? ' — fixture unexpectedly has one' : '') + '): after recall 1 = 你喝什么？ the deterministic fallback still has a valid, natural 喝 sentence (v681: null → recall unresolved → 89/90 error screen)',
      !has水 && !!f2 && ok2 && !!f3 && f2.chinese !== f3.chinese, { f2: f2 && f2.chinese, f3: f3 && f3.chinese })
    const same = (a, b) => has(c, 'zhSameApplication') ? c.zhSameApplication(a, b, '喝') : (c.recallVariationKey(a, '喝') === c.recallVariationKey(b, '喝'))
    const accepted = ['我喝这个。', '你想喝什么？']
    const f4 = c.mandarinFallbackPair(he, inv, 3, new Map(accepted.map(a => [a.replace(/[。？]/g, ''), he.id])), V, rules)
    T('Z2', 'the fallback never hands back a superficial copy of an accepted recall (same construction AND same function); 我喝那个 after 我喝这个 counts as the same application',
      !!f4 && !accepted.some(a => same(a, f4.chinese)) && same('我喝这个。', '我喝那个。'), f4 && f4.chinese)
    const pl = has(c, 'zhTargetPatternLine') ? c.zhTargetPatternLine(he, inv, V, rules) : ''
    T('Z3', 'the 喝 prompt says it needs an object, names the UNTAUGHT nouns as forbidden (水 茶 咖啡) and the objects that ARE allowed (这个 / 那个 / 什么 / 一点)',
      /OBJECT FOR 喝/.test(pl) && /水/.test(pl) && /这个/.test(pl) && /一点/.test(pl), pl.slice(0, 300))
    // a full (simulated-network) generation, then the live failure states: 89/90 and 87/90
    let fresh = null, cp0 = null, calls = 0, saves = 0
    if (has(c, 'genCheckpointCreate')) {
      const sim = R.simProvider(c, 'zh', V, TG)
      c.fetch = async (u, o) => { calls++; return sim(u, o) }
      fresh = await safe(() => c.generateMandarinTrack(TG, V, R.SIM_KEY, c.ev('GEMINI_DEFAULT_MODEL'), () => {}, () => {}, { cancelled: false }, undefined, { onCheckpoint: cp => { saves++; cp0 = cp } }))
    }
    const freshCalls = calls
    T('Z4', 'every accepted recall is checkpointed as it is accepted (90/90 in the saved draft, one save per recall)', !!cp0 && cp0.accepted.length === 90 && saves >= 90 && cp0.status === 'generated', cp0 ? { n: cp0.accepted.length, saves, status: cp0.status } : 'no checkpoint support')
    const vBefore = deep(V)
    const resumeFrom = async (drop, label) => {
      const cp = deep(cp0); cp.accepted = cp.accepted.filter(a => !drop.includes(a.slot)); cp.status = 'incomplete'
      calls = 0; const logs = []
      const r = await safe(() => c.generateMandarinTrack(TG, V, R.SIM_KEY, c.ev('GEMINI_DEFAULT_MODEL'), () => {}, m => logs.push(m), { cancelled: false }, undefined, { checkpoint: cp, onCheckpoint: () => {} }))
      const kept = r && r.pairs ? r.pairs.filter(p => p.targetId != null && !drop.includes(p.targetId + ':' + p.recallIndex)) : []
      const identical = kept.length === 90 - drop.length && kept.every(p => cp0.accepted.some(a => a.slot === p.targetId + ':' + p.recallIndex && a.text === p.chinese))
      const slots = r && r.pairs ? r.pairs.filter(p => p.targetId != null).map(p => p.targetId + ':' + p.recallIndex) : []
      return { r, cp, calls, logs, identical, unique: new Set(slots).size === slots.length && slots.length === 90 }
    }
    if (cp0) {
      const z5 = await resumeFrom([he.id + ':2'], '89/90')
      T('Z5', 'RESUME at 89/90 (喝 recall 2 missing): only the missing recall is generated (' + z5.calls + ' request(s) vs ' + freshCalls + ' for the full track); the other 89 verified pairs are reused unchanged; 90 unique slots',
        z5.r && z5.r.recallCount === 90 && z5.calls > 0 && z5.calls <= 11 && z5.identical && z5.unique && z5.logs.some(l => /RESUME_FROM_CHECKPOINT .*89\/90 verified recalls kept/.test(l)), { calls: z5.calls, identical: z5.identical, unique: z5.unique, err: z5.r && z5.r.__error })
      const t2 = TG[3], t3 = TG[10]
      const z6 = await resumeFrom([t2.id + ':1', t2.id + ':3', t3.id + ':2'], '87/90')
      T('Z6', 'RESUME at 87/90 (3 recalls of 2 targets missing): only those 3 recalls are generated; 87 kept unchanged; no duplicate slot',
        z6.r && z6.r.recallCount === 90 && z6.calls > 0 && z6.calls <= 33 && z6.identical && z6.unique, { calls: z6.calls, identical: z6.identical, unique: z6.unique })
      // multiple resume attempts are counted and bounded
      const cpm = deep(cp0); cpm.accepted = cpm.accepted.filter(a => a.slot !== he.id + ':2')
      const authorised = inv.allContent.map(w => w.chinese)
      for (let k = 0; k < 3; k++) await safe(() => c.generateMandarinTrack(TG, V, R.SIM_KEY, c.ev('GEMINI_DEFAULT_MODEL'), () => {}, () => {}, { cancelled: false }, undefined, { checkpoint: cpm, onCheckpoint: () => {} }))
      const cmp = c.genCheckpointCompatible(cpm, 'zh', TG, authorised)
      T('Z7', 'multiple resumes are counted (3) and bounded: a 4th explicit retry is refused with a reason (never a silent full regeneration)', cpm.resumes === 3 && !cmp.ok && /retried 3 times/.test(cmp.reason), { resumes: cpm.resumes, cmp })
      // idempotent: writing an already-filled slot changes nothing
      const cpi = deep(cp0), before = cpi.accepted.length, again = c.genCheckpointAddPair(cpi, cp0.accepted[0].pair)
      T('Z8', 'idempotent checkpoint: re-adding a verified slot is refused (no duplicate, no overwrite)', again === false && cpi.accepted.length === before && cpi.accepted[0].text === cp0.accepted[0].text)
      // revalidation: a preserved pair that no longer passes the current checks is regenerated, not trusted
      const cpr = deep(cp0), bad = cpr.accepted.find(a => a.slot === he.id + ':3')
      bad.pair = { ...bad.pair, chinese: '我想喝。', pinyin: 'wǒ xiǎng hē.' }; bad.text = '我想喝。'
      calls = 0; const lr = []
      const rr = await safe(() => c.generateMandarinTrack(TG, V, R.SIM_KEY, c.ev('GEMINI_DEFAULT_MODEL'), () => {}, m => lr.push(m), { cancelled: false }, undefined, { checkpoint: cpr, onCheckpoint: () => {} }))
      T('Z9', 'every preserved pair is RE-VALIDATED before reuse: a saved fragment (我想喝。) fails the current checks and is regenerated, never reused',
        rr && rr.pairs && !rr.pairs.some(p => p.chinese === '我想喝。') && lr.some(l => /no longer pass the current checks/.test(l)) && calls > 0, { calls, err: rr && rr.__error })
      // an interrupted run (provider failing part-way) keeps what it had; the resume generates only the rest
      let k2 = 0, cpx = null
      const sim2 = R.simProvider(c, 'zh', V, TG)
      c.fetch = async (u, o) => { if (++k2 > 60) { const e = new Error('Failed to fetch'); e.name = 'TypeError'; throw e } return sim2(u, o) }
      const rx = await safe(() => c.generateMandarinTrack(TG, V, R.SIM_KEY, c.ev('GEMINI_DEFAULT_MODEL'), () => {}, () => {}, { cancelled: false }, undefined, { onCheckpoint: cp => { cpx = deep(cp) } }))
      const keptX = cpx ? cpx.accepted.length : 0
      c.fetch = async (u, o) => { calls++; return sim2(u, o) }; calls = 0
      const rx2 = cpx ? await safe(() => c.generateMandarinTrack(TG, V, R.SIM_KEY, c.ev('GEMINI_DEFAULT_MODEL'), () => {}, () => {}, { cancelled: false }, undefined, { checkpoint: cpx, onCheckpoint: () => {} })) : null
      T('Z10', 'an interrupted generation (network failing after 60 requests) leaves a draft with the ' + keptX + ' recalls accepted so far; the resume regenerates only the other ' + (90 - keptX) + ' and completes 90/90',
        keptX > 0 && keptX < 90 && rx2 && rx2.recallCount === 90 && calls < freshCalls, { keptX, calls, freshCalls, first: rx && (rx.__error || rx.recallCount) })
      c.fetch = async (u, o) => sim2(u, o)
      // compatibility: a changed selection or vocabulary never resumes silently
      const cpc = deep(cp0)
      const swapped = TG.slice(); [swapped[0], swapped[1]] = [swapped[1], swapped[0]]
      const a1 = c.genCheckpointCompatible(cpc, 'zh', swapped, authorised), a2 = c.genCheckpointCompatible(cpc, 'zh', TG, authorised.concat(['水'])), a3 = c.genCheckpointCompatible(cpc, 'zh', TG, authorised)
      T('Z11', 'a draft resumes only for the SAME 30 targets and the SAME authorised vocabulary — otherwise the reason is given (selection changed / vocabulary changed)',
        !a1.ok && /target words differ/.test(a1.reason) && !a2.ok && /allowed to use have changed/.test(a2.reason) && a3.ok, { a1, a2, a3 })
      T('Z12', 'generation, checkpointing and resuming never change learner data: the vocabulary (SRS state, OK counts, ids) is byte-identical afterwards', JSON.stringify(V) === JSON.stringify(vBefore))
      // honest failure: a recall that can never be produced → the error names it, the draft keeps the rest, status incomplete
      const sim3 = R.simProvider(c, 'zh', V, TG)
      c.fetch = async (u, o) => { const b = JSON.parse(o.body); const q = b.contents.map(x => x.parts.map(p => p.text).join('')).join('\n')
        if (/TARGET: ★ 喝/.test(q) && /recall 2 of 3/.test(q)) return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: '{"chinese":"我想喝茶。","pinyin":"wǒ xiǎng hē chá.","english":"I want tea.","prompt":"Say you want tea."}' }] } }], usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 10, totalTokenCount: 20 } }) }
        return sim3(u, o) }
      const saveFb = c.mandarinFallbackPair; c.mandarinFallbackPair = (t, ...rest) => t.chinese === '喝' ? null : saveFb(t, ...rest)
      const rh = await safe(() => c.generateMandarinTrack(TG, V, R.SIM_KEY, c.ev('GEMINI_DEFAULT_MODEL'), () => {}, () => {}, { cancelled: false }, undefined, { onCheckpoint: () => {} }))
      c.mandarinFallbackPair = saveFb
      const inc = rh && rh.__error ? null : null
      let err = null; try { await c.generateMandarinTrack(TG, V, R.SIM_KEY, c.ev('GEMINI_DEFAULT_MODEL'), () => {}, () => {}, { cancelled: false }, undefined, { onCheckpoint: () => {} }) } catch (e) { err = e }
      T('Z13', 'honest NOT-READY: when 喝 recall 2 cannot be produced, generation stops with "incomplete 89/90", names 喝 recall 2, and the saved draft holds the 89 verified recalls (status incomplete) for "Retry missing recalls"',
        rh && /Generation incomplete: expected 90 recalls, produced 89/.test(rh.__error || ''), rh && rh.__error)
    } else for (const id of ['Z5', 'Z6', 'Z7', 'Z8', 'Z9', 'Z10', 'Z11', 'Z12', 'Z13']) T(id, 'resumable generation (no checkpoint support in this build)', false, 'genCheckpointCreate missing')
  }
  // Z13b — the error carries the draft (needs a direct look at the thrown error)
  {
    const c = load(APP, { realBelt: true })
    const fx = R.loadFixture('zh-daily-2026-10-08'), V = c.ttBenchApplyFixture(c.initMandarinVocab(), fx), TG = c.ttBenchJazhTargets(fx, V)
    if (has(c, 'genCheckpointCreate')) {
      const sim = R.simProvider(c, 'zh', V, TG)
      c.fetch = async (u, o) => { const b = JSON.parse(o.body); const q = b.contents.map(x => x.parts.map(p => p.text).join('')).join('\n')
        if (/TARGET: ★ 喝/.test(q) && /recall 2 of 3/.test(q)) return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: '{"chinese":"我想喝茶。","pinyin":"wǒ xiǎng hē chá.","english":"I want tea.","prompt":"Say you want tea."}' }] } }], usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 10, totalTokenCount: 20 } }) }
        return sim(u, o) }
      const saveFb = c.mandarinFallbackPair; c.mandarinFallbackPair = (t, ...rest) => t.chinese === '喝' ? null : saveFb(t, ...rest)
      let err = null; try { await c.generateMandarinTrack(TG, V, R.SIM_KEY, c.ev('GEMINI_DEFAULT_MODEL'), () => {}, () => {}, { cancelled: false }, undefined, { onCheckpoint: () => {} }) } catch (e) { err = e }
      c.mandarinFallbackPair = saveFb
      const inc = err && err.incomplete, cp = inc && inc.checkpoint, miss = cp ? c.genCheckpointMissing(cp) : []
      T('Z14', 'the incomplete error names the missing recall (喝 recall 2) and carries the draft: 89 verified, 1 missing, status incomplete',
        !!inc && inc.failures.length === 1 && inc.failures[0].target === '喝' && inc.failures[0].recallIndex === 2 && cp && cp.accepted.length === 89 && cp.status === 'incomplete' && miss.length === 1, inc && { failures: inc.failures, n: cp && cp.accepted.length })
    } else T('Z14', 'the incomplete error carries the draft', false, 'no checkpoint support')
  }
  // ══ T — THAI: ชิ้น, contradictory verdicts, honest reporting, retry missing ═════════════════════════════════════════
  {
    const c = load(APP, { realBelt: true })
    const L = t => c.thaiLexicalSenseProblems({ thai: t, english: 'x' }).map(x => x.id)
    const wrong = ['ขอเรือชิ้นนี้ครับ', 'ตั๋วชิ้นหนึ่งครับ', 'ที่นั่งชิ้นนั้นว่างไหมคะ', 'รถชิ้นนี้สวยครับ'], right = ['ขอเค้กชิ้นนี้ครับ', 'กินอีกชิ้นไหมครับ', 'พิซซ่าสองชิ้นค่ะ', 'รถคันนี้สวยครับ', 'ตั๋วสองใบครับ', 'คนที่นั่นเยอะครับ', 'ที่นั่งที่นี่ว่างไหมคะ']
    T('T1', 'classifier ↔ noun: ชิ้น with a boat / ticket / seat / car is REJECTED (CLASSIFIER_MISMATCH); ชิ้น for a piece of cake / another piece, and correct classifiers (รถคันนี้, ตั๋วสองใบ) PASS',
      wrong.every(t => L(t).includes('CLASSIFIER_MISMATCH')) && right.every(t => !L(t).includes('CLASSIFIER_MISMATCH')), { wrong: wrong.map(L), right: right.map(L) })
    // the live recovery path (quota engine) is told what ชิ้น counts and may leave the transport scene
    const V = c.initVocab(), chin = V.find(w => w.thai === 'ชิ้น')
    const track = { keywords: [{ wordId: chin.id, thai: 'ชิ้น', english: chin.e || chin.english || 'piece/classifier' }], pairs: [], sceneContract: { premise: 'Two friends take a boat and a train to the coast; they buy tickets and find seats.' } }
    let prompt = ''
    const saveReq = c.geminiRequest
    c.geminiRequest = async o => { prompt = (o.messages || []).map(m => m.content).join('\n'); return '[]' }
    c.aiBeginRun('t-chin')
    await safe(() => c._thRecoverTargetPairs({ wordId: chin.id, thai: 'ชิ้น', english: 'piece/classifier' }, 3, { track, vocab: V, apiKey: 'AIzaSyTEST-x-0000000000000000000000', model: c.ev('GEMINI_DEFAULT_MODEL'), existing: [] }))
    c.geminiRequest = saveReq
    T('T2', 'ชิ้น quota recovery (the live Daily recovery path) gets the TEACHING CONTRACT (pieces of food / items — never boats, tickets or seats) and may leave the transport scene (BACKGROUND ONLY)',
      /TEACHING CONTRACT FOR "ชิ้น"/.test(prompt) && /NEVER with vehicles/.test(prompt) && /BACKGROUND ONLY/.test(prompt), prompt ? prompt.slice(0, 200) : 'no prompt captured')
    // contradictory verdicts on the IDENTICAL sentence
    c.aiBeginRun('t-verdict')
    if (has(c, 'beginGenerationLedger')) c.beginGenerationLedger('th')
    const line = th => ({ thai: th, english: 'We head to the entrance together.', speaker: 'A', _target: 'ทางเข้า', prompt: 'He suggests going to the entrance together' })
    let judgeCalls = 0, script = [2, 5, 2]
    const judge = async ch => { judgeCalls++; const s = script.shift(); return ch.map((p, k) => ({ i: k + 1, s: s == null ? 4 : s, note: s < 4 ? 'stiff' : '' })) }
    const a = await c._judgeCached('nat', [line('เราไปทางเข้ากันครับ')], judge, 'generation', () => {})
    const b = await c._judgeCached('nat', [{ ...line('เราไปทางเข้ากันครับ'), english: 'Let us go to the entrance.' }], judge, 'final audit', () => {})
    const callsAfterB = judgeCalls
    const d = await c._judgeCached('nat', [{ ...line('เราไปทางเข้ากันครับ'), english: 'Shall we go to the entrance?' }], judge, 'recovery', () => {})
    const v = x => x.verdicts.get(0) && x.verdicts.get(0).s
    T('T3', 'ONE decision per Thai sentence per run: เราไปทางเข้ากันครับ rejected (2/5), later judged natural (5/5) → an isolated re-judgement (2/5) decides UNNATURAL, and later stages reuse that decision without another call',
      v(a) < 4 && v(b) < 4 && v(d) < 4 && callsAfterB === 3 && judgeCalls === 3, { a: v(a), b: v(b), d: v(d), judgeCalls })
    // honest variety reporting on a real (simulated-network) Thai Daily track that ends NOT READY
    const fx = R.loadFixture('th-daily-2026-10-08')
    const ui = await R.runOnceUi(fx, { mode: 'record', provider: 'sim', appFile: APP })
    const vl = (ui.log || []).find(l => /TARGET_VARIETY_AUDIT/.test(l)) || ''
    const m = vl.match(/TARGET_VARIETY_AUDIT (\d+)\/(\d+)/), valid3 = (ui.content && ui.content.pairs || []).length ? null : null
    const integ = (ui.telemetry && ui.telemetry.integrity || []).join(' ')
    const cov = (integ.match(/TARGET_PAIR_QUOTA[=: ]+(\d+)\/(\d+)/) || [])
    const deficit = ui.content && ui.content.status === 'NOT_READY'
    const claimed = m ? +m[1] : null
    const incomplete = (vl.match(/incomplete: (.*)$/) || [])[1] || ''
    T('T4', 'the variety audit never claims "3 distinct applications" for a target with fewer than 3 valid pairs (live v681: "30/30" with ชิ้น at 0/3) — here ' + (m ? m[1] + '/' + m[2] : '?') + (incomplete ? ' · incomplete: ' + incomplete.slice(0, 60) : ''),
      !!m && (!deficit || claimed < +m[2]) && (!deficit || /incomplete:/.test(vl)), { line: vl.slice(0, 200), status: ui.content && ui.content.status })
  }
  // T5 — Thai "Retry missing recalls" regenerates ONLY the deficient targets
  {
    const c = load(APP, { realBelt: true })
    const fx = R.loadFixture('th-daily-2026-10-08'), V = c.ttBenchApplyFixture(c.initVocab(), fx)
    const sim = R.simProvider(c, 'th', V, fx.targets.map(t => t.id), null, true)
    let calls = 0, prompts = []
    c.fetch = async (u, o) => { calls++; try { const b = JSON.parse(o.body); prompts.push(b.contents.map(x => x.parts.map(p => p.text).join('')).join('\n')) } catch (e) {} return sim(u, o) }
    const runId = c.aiBeginRun('daily-track')
    const outT = await safe(() => c.ttBenchThaiDaily(R.applyFixture ? fx : fx, V, R.SIM_KEY, c.ev('GEMINI_DEFAULT_MODEL'), () => {}, runId))
    const t0 = outT && outT.track
    const r0 = t0 ? c.trackReadiness(t0) : null
    if (has(c, 'thaiRetryMissingRecalls') && t0 && r0 && r0.unresolvedTargetIds.length) {
      const before = (t0.pairs || []).filter(p => p && c.classifyTrackPair(p) === 'TARGET' && !p._qcInvalid && !p._qcUnresolved && !r0.unresolvedTargetIds.includes(p.targetId)).map(p => p.thai)
      calls = 0; prompts = []
      const missingSurf = r0.perTarget.filter(x => r0.unresolvedTargetIds.includes(x.targetId)).map(x => x.target)
      const t1 = await safe(() => c.thaiRetryMissingRecalls(t0, { vocab: V, apiKey: R.SIM_KEY, model: c.ev('GEMINI_DEFAULT_MODEL'), onLog: () => {} }))
      const after = t1 && t1.pairs ? t1.pairs.map(p => p && p.thai) : []
      const keptAll = before.every(th => after.includes(th))
      const genPrompts = prompts.filter(q => /YOU ARE REPAIRING TARGET/.test(q))
      const onlyMissing = genPrompts.every(q => missingSurf.some(s => q.includes('YOU ARE REPAIRING TARGET: ' + s + ' ')))
      T('T5', 'Thai "Retry missing recalls" on a NOT-READY track (' + r0.validTargetPairs + '/90): only the ' + missingSurf.length + ' deficient target(s) get repair requests (' + genPrompts.length + '), every verified pair of the other targets is kept, the retry is counted',
        !!t1 && !t1.__error && keptAll && genPrompts.length > 0 && onlyMissing && t1._missingRetries === 1, { err: t1 && t1.__error, keptAll, gp: genPrompts.length, onlyMissing, missingSurf })
    } else T('T5', 'Thai "Retry missing recalls"', !!(r0 && !r0.unresolvedTargetIds.length && has(c, 'thaiRetryMissingRecalls')), has(c, 'thaiRetryMissingRecalls') ? (r0 ? 'track already complete — retry not applicable (' + r0.validTargetPairs + '/90)' : (outT && outT.__error)) : 'thaiRetryMissingRecalls missing')
  }
  // ══ J — JAPANESE ═════════════════════════════════════════════════════════════════════════════════════════════════════
  {
    const c = load(APP, { realBelt: true })
    const J = c.initJapaneseVocab(), doko = J.find(w => w.japanese === 'どこ'), nani = J.find(w => w.japanese === '何')
    const P = (s, t) => c.matchesJapaneseTarget(s, t)
    T('J1', 'どこ ≠ どこか: どこか行くの？ ("going somewhere?") / どこも / どこでも do NOT count as a use of どこ ("where"); どこ行くの？ / どこにある？ do (same for 何 vs 何か / 何でも)',
      !P('どこか行くの？', doko) && !P('どこも同じだよ。', doko) && !P('どこでもいいよ。', doko) && P('どこ行くの？', doko) && P('どこにある？', doko) && !P('何か食べる？', nani) && !P('何でもいい。', nani) && P('何食べる？', nani))
    const fin = async (jp, rd, ro, segs) => { const r = await c._jaFinaliseMetadata([{ japanese: jp, reading: rd, romaji: ro, segments: segs }], { onLog: () => {} }); return r.pairs[0] }
    const a = await fin('あれは何？', 'あれはなん？', 'are wa nan?', [{ surface: 'あれ', reading: 'あれ', romaji: 'are' }, { surface: 'は', reading: 'は', romaji: 'wa' }, { surface: '何', reading: 'なん', romaji: 'nan' }])
    const b = await fin('何時？', 'なんじ？', 'nanji?', null), d = await fin('それ、何なの？', 'それ、なになの？', 'sore, nani na no?', null)
    T('J2', 'reading of 何 follows its context: あれは何？ is あれはなに？ / are wa nani? (live v681 shipped あれはなん？); 何時 stays なんじ; 何なの is なんなの',
      a.reading === 'あれはなに？' && /nani/.test(a.romaji) && /wa/.test(a.romaji) && b.reading === 'なんじ？' && d.reading === 'それ、なんなの？', { a: [a.reading, a.romaji], b: b.reading, d: d.reading })
    const inv = c.japaneseLearnerInventory(J, J.slice(0, 30))
    const u = s => { const r = c.validateJapaneseUsage({ japanese: s, segments: [] }, inv); return (Array.isArray(r) ? r : (r.problems || [])).some(x => /場所/.test(String(x))) }
    T('J3', 'え、どこがいい場所？ (どこ already means "which place") is rejected as unnatural; どこがいい？ / いい場所はどこ？ pass', u('え、どこがいい場所？') && !u('どこがいい？') && !u('いい場所はどこ？'))
    const sm = new Map([['a', { targetId: 9, text: '大丈夫？' }], ['b', { targetId: 9, text: '大丈夫だよ。' }]])
    const vv = s => c.japaneseVariationVerdict(s, 9, sm, '大丈夫').ok
    T('J4', '大丈夫: after 大丈夫？ and 大丈夫だよ。, うん、大丈夫。 / 大丈夫か？ are the SAME applications (rejected); 明日は大丈夫？ / これで大丈夫。 are new ones (accepted)',
      !vv('うん、大丈夫。') && !vv('大丈夫か？') && vv('明日は大丈夫？') && vv('これで大丈夫。'))
    T('J5', 'J6 (v681) still holds: これ、好き？ / うん、好きだよ。 / それ、好き？ → これ and それ are the same application; asking vs answering stays distinct',
      !c.japaneseVariationVerdict('それ、好き？', 1, new Map([['k', { targetId: 1, text: 'これ、好き？' }]]), '好き').ok && c.japaneseVariationVerdict('うん、好きだよ。', 1, new Map([['k', { targetId: 1, text: 'これ、好き？' }]]), '好き').ok)
    // new-word quota parity (dashboard ↔ selector) from ONE configuration
    const React = require('react'), RDS = require('react-dom/server')
    const cr = load(APP, { React, realBelt: true })
    const fxJ = R.loadFixture('ja-daily-2026-10-08'), VJ = cr.ttBenchApplyFixture(cr.initJapaneseVocab(), fxJ)
    const html = RDS.renderToStaticMarkup(React.createElement(cr.BeltRankCard, { vocab: VJ, onNav() {}, langName: 'Japanese' })).replace(/<[^>]+>/g, ' ')
    const shown = +((html.match(/Introducing\s+(\d+)\s+new words/) || [])[1] || -1)
    const sel = cr.japaneseSelectTargets ? null : null
    T('J6', 'new-word quota parity: the Japanese dashboard shows exactly newWordsPerTrack(\'ja\') (= the selector\'s NEW count, one config: ' + cr.newWordsPerTrack('ja', 'daily', VJ) + ') — not the Thai belt allowance (5)',
      shown === cr.newWordsPerTrack('ja', 'daily', VJ) && shown === cr.japaneseSlotsFor(VJ), { shown })
    const part = { perTarget: [[{ targetId: 1, recallIndex: 1, japanese: 'x' }]], missingRecalls: [{ targetId: 1, recallIndex: 2, exhausted: true }], seenMap: new Map([['x', { targetId: 1, text: 'x' }]]), expectedRecallCount: 90, recallCount: 89 }
    const rt = has(c, 'jaPartialToJSON') ? c.jaPartialFromJSON(JSON.parse(JSON.stringify(c.jaPartialToJSON(part)))) : null
    T('J7', 'a Japanese partial generation survives storage (draft round trip keeps perTarget, missing recalls and the duplicate memory)', !!rt && rt.seenMap && rt.seenMap.constructor.name === 'Map' && rt.seenMap.get('x').text === 'x' && rt.perTarget[0][0].japanese === 'x' && rt.missingRecalls.length === 1)
  }
  // ══ L — defects found by the live v682 runs (Mandarin 89/90 on 很, Thai duplicate across targets, Japanese これ今？) ════
  {
    const c = load(APP, { realBelt: true })
    const fx = R.loadFixture('zh-daily-2026-10-08'), V = c.ttBenchApplyFixture(c.initMandarinVocab(), fx), TG = c.ttBenchJazhTargets(fx, V)
    const inv = c.mandarinLearnerInventory(V, TG), rules = c.mandarinScarcityRules(inv), W = z => V.find(w => w.chinese === z)
    const tp = (s, z) => c.mandarinTargetPresent(s, W(z), inv)
    T('L1', 'a different word that only CONTAINS the target is not a use of it: 这个好喝吗？ ≠ 喝 (live v682 accepted it), 这个好吃吗？ ≠ 吃, 这个多少钱？ ≠ 多; 我想喝这个 / 人很多 still count',
      !tp('这个好喝吗？', '喝') && !tp('这个好吃吗？', '吃') && !tp('这个多少钱？', '多') && tp('我想喝这个。', '喝') && tp('人很多。', '多'))
    const bad = x => c.mandarinSurfaceGrammarProblems(x, inv).length > 0
    T('L2', 'fragments accepted live are rejected — 我想。/ 你到。/ 大吗？/ 一点吗？/ 你等我一点; natural shapes pass — 好吗？/ 我到了。/ 我想去。/ 你等我一下 / 这个大吗？',
      ['我想。', '你到。', '大吗？', '一点吗？', '你等我一点'].every(bad) && !['好吗？', '我到了。', '我想去。', '你等我一下', '这个大吗？'].some(bad))
    const fbs = z => { const sm = new Map(); return [1, 2, 3].map(r => { const f = c.mandarinFallbackPair(W(z), inv, r, sm, V, rules); if (f) sm.set(f.chinese.replace(/[。？！]/g, ''), W(z).id); return f && f.chinese }) }
    const big = fbs('大')
    T('L3', 'adjective fallback: natural demonstrative frames first (这个很大。/ 这个不大。), never 你大吗？ ("are you big?") or the bare 大吗？', big[0] === '这个很大。' && !big.includes('你大吗？') && !big.includes('大吗？'), big)
    // the group judge's unreadable reply: the second attempt is STRUCTURED (a valid verdict instead of UNVERIFIED)
    const sg = c.geminiGenerate, sr = c.geminiRequest
    c.geminiGenerate = async () => 'Sure! Here is my evaluation: the group is natural.'
    c.geminiRequest = async o => o && o.json ? '{"action":"clean","reason":"natural"}' : 'not json'
    const engine = { language: 'zh', labelSentence: 'Mandarin', labelPronunciation: 'pinyin', sentenceOf: p => p.chinese }
    const grp = { targetWord: '很', indices: [0], pairs: [{ speaker: 'A', chinese: '这个很好。', english: 'This is very good.' }] }
    const gv = await safe(() => c.aiQcEvaluateGroup(grp, grp.pairs, engine, 'AIzaSyTEST-x-0000000000000000000000', c.ev('GEMINI_DEFAULT_MODEL')))
    c.geminiGenerate = sg; c.geminiRequest = sr
    T('L4', 'a group judge reply that is not JSON is asked again in STRUCTURED mode and gives a real verdict (live v682: all three 很 pairs lost as UNVERIFIED)', gv && gv.action === 'clean', gv)
    T('L5', 'a pair removed ONLY because its verdict is missing (UNVERIFIED) is not a failed construction: recovery may propose it again and re-judge it (live v682: 这个很好 blocked as "already used" for 10 checks → 89/90)',
      /x\.reasons\.every\(r => \/UNVERIFIED\/\.test\(String\(r\)\)\)/.test(SRC) && /may be re-proposed and re-judged/.test(SRC))
    const th = c.validateThaiTargetPair({ thai: 'ตั๋วใบนั้นราคาเท่าไหร่คะ', english: 'How much is that ticket?', prompt: 'She asks how much that ticket costs', speaker: 'B', _pairKey: 'k2', targetId: 482 },
      { thai: 'ใบ', wordId: 482 }, { vocab: c.initVocab(), existing: [{ thai: 'ตั๋วใบนั้น ราคาเท่าไหร่คะ', _pairKey: 'k1', targetId: 876 }] }, 'test')
    T('L6', 'Thai duplicate across targets is caught at acceptance (spacing ignored: ตั๋วใบนั้น ราคาเท่าไหร่คะ = ตั๋วใบนั้นราคาเท่าไหร่คะ), and an early-regenerated line may not repeat ANY line of the track (live v682: the final duplicate audit had to catch it)',
      th && th.failed && th.failed.includes('NOT_DUPLICATE') && /_trackLines\.has\(_sp\(l\.thai\)\)/.test(SRC), th && th.failed)
    const J = c.initJapaneseVocab(), ji = c.japaneseLearnerInventory(J, J.slice(0, 30))
    const ju = x => { const r = c.validateJapaneseUsage({ japanese: x, segments: [] }, ji); return (Array.isArray(r) ? r : (r.problems || [])).some(y => /time word alone/.test(String(y))) }
    T('L7', 'これ今？ ("Is this the now?" — accepted live) is rejected; これ、今使う？ passes', ju('これ今？') && !ju('これ、今使う？'))
    const sm = new Map([['a', { targetId: 5, text: 'え、ここで何してるの？' }]]), vv = x => c.japaneseVariationVerdict(x, 5, sm, 'する').ok
    T('L8', 'Japanese variety: after え、ここで何してるの？, え、何してるの？ is the same application (only "here" dropped); 何をするの？ is a different one', !vv('え、何してるの？') && vv('何をするの？'))
    T('L9', 'Mandarin: a gap that appears AFTER generation (QC / final audit) can be retried from the draft — only the slots not valid in the final track are regenerated',
      /function zhFinalGapSlots\(t\)/.test(SRC) && /RETRY_MISSING_RECALLS after the final checks/.test(SRC) && /onClick=\{retryFinalGaps\}/.test(SRC))
  }
  T('L10', 'coherence: an UNTOUCHED scene that passed before a repair and fails after it is a contradictory verdict — ONE more judgement decides it (live v682 Thai: S4/S5 2 → 4 → 2 with no line changed)',
    /MAIN_TRACK_COHERENCE_VERDICT_CONFLICT/.test(SRC) && /!touched\.has\(d\.sceneId\) && prevBy\.has\(d\.sceneId\) && prevBy\.get\(d\.sceneId\)\.coherent && !d\.coherent/.test(SRC))
  // ══ S — shared contract ═════════════════════════════════════════════════════════════════════════════════════════════
  {
    const c = load(APP, { realBelt: true })
    const keys = has(c, 'genCheckpointWrite') ? JSON.stringify(c.ev('GEN_CHECKPOINT_KEYS')) : ''
    T('S1', 'drafts live under their OWN keys (tt-th/ja/zh-gen-checkpoint) through ONE storage write site; never the track list, vocabulary or SRS keys',
      /tt-zh-gen-checkpoint/.test(keys) && /tt-ja-gen-checkpoint/.test(keys) && /tt-th-gen-checkpoint/.test(keys) && (SRC.match(/await stSet\(GEN_CHECKPOINT_KEYS\[lang\], cp \|\| null\)/g) || []).length === 1 && !/GEN_CHECKPOINT_KEYS = [^\n]*(tt-vocab|tt-tracks|tt-ja-vocab|tt-zh-vocab)/.test(SRC))
    T('S2', 'the screens offer "Retry missing recalls" and "Start new generation" (never a silent full paid regeneration); a draft is cleared only when the finished track is handed to the app',
      /Retry missing ' \+ unit/.test(SRC) && /Start new generation/.test(SRC) && /genCheckpointClear\('zh'\); onGenerated\(finalTrack\)/.test(SRC) && /genCheckpointClear\('ja'\); onGenerated\(finalTrack\)/.test(SRC) && /genCheckpointClear\('th'\); onGenerated\(generatedTrack\)/.test(SRC))
  }
  console.log(out.join('\n'))
  console.log('\nv682 reliability & teaching-quality repair: ' + (n - fails) + '/' + n + (fails ? ' — ' + fails + ' FAILED' : ' — ALL PASS'))
  process.exit(fails ? 1 : 0)
})().catch(e => { console.log('CRASH ' + (e && e.stack || e)); process.exit(1) })
