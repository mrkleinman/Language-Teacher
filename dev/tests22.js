// v657 — Thai 90/90 repair: early QC = final QC, one canonical target matcher, constrained recovery,
// cluster-validated scenes, pronunciation expected tokens. §26–§30 required regressions + the supporting
// checks (acceptance contract, per-line target presence, log severity, politeness normalisation).
// The app's real functions run in the node harness; Gemini is simulated at the transport boundary.
// Usage: node tests22.js
const { load } = require('./harness')
const tests14 = require('./tests14')
const out = []; let passes = 0, fails = 0
const T = (id, name, pass, detail) => { pass ? passes++ : fails++; out.push((pass ? 'PASS ' : 'FAIL ') + id.padEnd(5) + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 1400) : '')) }
const learned = v => { v.forEach(w => { if (w.curriculumIndex >= 1 && w.curriculumIndex <= 360) { w.status = 'learning'; w.lastSeen = '2026-09-20'; w.introducedAt = '2026-08-01' } }); return v }
const scene = { scene: 'Two friends at home after lunch.', characterA: 'Somchai, a Thai man', characterB: 'Nida, a Thai woman',
  opening: 'สวัสดีครับ', opening_phonetic: 'sà-wàt-dii khráp', opening_english: 'Hello.', opening_prompt: 'He greets her',
  reply: 'สวัสดีค่ะ', reply_phonetic: 'sà-wàt-dii khâ', reply_english: 'Hello.' }
const L = (speaker, thai, english) => ({ speaker, thai, english, prompt: (speaker === 'A' ? 'He says: ' : 'She says: ') + english.replace(/[.?]$/, '').toLowerCase() })

async function main() {
  // ══ §26 EARLY VS FINAL VALIDITY ══════════════════════════════════════════════════════════
  {
    const c = load('tt.compiled.js'); const vocab = learned(c.initVocab())
    const W = th => ({ ...vocab.find(w => w.thai === th) })
    const targets = ['มีด', 'ชาม', 'ล้าง'].map(W)
    const BAD = ['ชามนี้มีมีดไหมครับ', 'ซื้อมีดดีครับเราจะได้กินส้มตำครับ']
    const FIX = { 'มีด': [[L('A', 'ชามนี้มีมีดไหมครับ', 'Does this bowl have a knife?'), L('B', 'ไม่มีมีดค่ะ', 'There is no knife.'), L('A', 'ซื้อมีดดีครับเราจะได้กินส้มตำครับ', 'Buying a knife is good, then we can eat som tam.')],
                          [L('A', 'ผมใช้มีดนี้ครับ', 'I use this knife.'), L('B', 'มีดนี้ดีค่ะ', 'This knife is good.'), L('A', 'ผมล้างมีดก่อนครับ', 'I wash the knife first.')]],
      'ชาม': [[L('A', 'ผมล้างชามครับ', 'I wash the bowl.'), L('B', 'ชามนี้ดีค่ะ', 'This bowl is good.'), L('A', 'ผมใช้ชามนี้ครับ', 'I use this bowl.')]],
      'ล้าง': [[L('A', 'ผมล้างผักครับ', 'I wash the vegetables.'), L('B', 'ฉันล้างชามค่ะ', 'I wash the bowls.'), L('A', 'ผมล้างมือก่อนครับ', 'I wash my hands first.')]] }
    const nCall = {}
    c.generateWordLines = async (t) => { const k = (nCall[t.thai] = (nCall[t.thai] || 0) + 1); const g = FIX[t.thai]; return (g[Math.min(k, g.length) - 1] || g[0]).map(x => ({ ...x, words: [] })) }
    const judged = { nat: 0, cue: 0, natLines: 0 }
    c.mockGeminiGenerate = async (k, m, msgs) => {
      const q = msgs[msgs.length - 1].content
      if (/native Thai speaker checking learner material/.test(q)) { judged.nat++; const it = [...q.matchAll(/^(\d+)\. Thai: (.*)$/gm)]; judged.natLines += it.length; return JSON.stringify(it.map(x => ({ i: +x[1], s: BAD.includes(x[2]) ? 2 : 5, note: BAD.includes(x[2]) ? 'a bowl does not contain a knife / knife unrelated to eating som tam' : 'ok', issue: BAD.includes(x[2]) ? 'SENTENCE_UNNATURAL' : null }))) }
      if (/Rate how well each Thai sentence matches its prompt/.test(q)) { judged.cue++; return JSON.stringify([...q.matchAll(/^(\d+)\. Prompt:/gm)].map(x => ({ i: +x[1], s: 5, thaiEnglishMatch: true }))) }
      return '[]'
    }
    const logs = []
    const gen = await c.generateConversationTrack(targets, [], 'k', (d, t, meta) => { if (meta && meta.apiError) logs.push(meta.apiError) }, vocab, 'm', null, scene)
    const eg = gen._earlyGate || {}
    const knife = gen.filter(p => p && p.pairType === 'content' && p.targetId === targets[0].id)
    T('E1', '§26 มีด: "ชามนี้มีมีดไหมครับ" / "ซื้อมีดดีครับเราจะได้กินส้มตำครับ" are rejected by the EARLY semantic gate — they never become accepted target slots',
      BAD.every(b => !gen.some(p => p && p.thai === b)) && eg.rejected >= 2 && BAD.every(b => eg.rejectedLines.some(x => x.thai === b && /UNNATURAL/.test(x.why))) &&
      logs.some(l => /EARLY_SEMANTIC_GATE .*2 rejected before the group counts as PASSED/.test(l)) && logs.some(l => /TARGET_GROUP_ACCEPTANCE .*มีด 1\/3/.test(l)),
      { eg, knife: knife.map(p => p.thai), logs: logs.filter(l => /EARLY|ACCEPTANCE/.test(l)) })
    T('E2', '§4 only the rejected slots are regenerated (one generation for มีด, none for the others) and the refilled slots pass the SAME judge ⇒ มีด 3/3',
      nCall['มีด'] === 2 && nCall['ชาม'] === 1 && nCall['ล้าง'] === 1 && eg.regenerated === 1 && eg.recovered === 2 && knife.length === 3 && knife.every(p => c.thaiTargetPresent(p.thai, 'มีด', vocab)),
      { nCall, eg: { regenerated: eg.regenerated, recovered: eg.recovered }, knife: knife.map(p => p.thai) })
    const before = { ...judged }
    const fin = await c.finalPairSemanticAudit(gen, 'k', 'm', null, { label: 'main' })
    const content = gen.filter(p => p && p.pairType !== 'framing' && p.thai).length
    T('E3', '§4 no second paid judgment: the final audit reuses every early verdict for unchanged text (0 new naturalness / cue calls) and keeps every early PASS',
      judged.nat === before.nat && judged.cue === before.cue && fin.stats.cachedVerdicts >= content && fin.stats.dropped === 0 && fin.pairs.filter(p => p && p._semanticState === 'VERIFIED').length === content,
      { before, after: judged, cached: fin.stats.cachedVerdicts, content, dropped: fin.stats.dropped })
    // the one acceptance contract
    const tk = { thai: 'มีด', wordId: targets[0].id }
    const raw = { speaker: 'A', thai: BAD[0], english: 'Does this bowl have a knife?', prompt: 'He asks if this bowl has a knife', pairType: 'content', targetId: targets[0].id, _target: 'มีด' }
    const pend = c.validateThaiTargetPair(raw, tk, { vocab }, 'generation')
    const judgedBad = (await c.finalPairSemanticAudit([raw], 'k', 'm', null, { label: 'probe' })).stats.failures.length
    const good = knife[0], vGood = c.validateThaiTargetPair(good, tk, { vocab }, 'final')
    T('E4', '§3 validateThaiTargetPair: an unjudged line is PENDING (never PASS) on NATURAL / TARGET_SENSE / CUE; a judged good line PASSES all 11 dimensions (v665: + LENGTH); the judged bad line fails',
      pend.state === 'PENDING' && !pend.valid && ['NATURAL', 'TARGET_SENSE', 'CUE_CONSISTENT'].every(k => pend.dimensions[k] === 'PENDING') && pend.dimensions.TARGET_PRESENT === 'PASS' &&
      vGood.valid && vGood.state === 'PASS' && Object.keys(vGood.dimensions).length === 11 && vGood.dimensions.LENGTH === 'PASS' && judgedBad === 1,
      { pend: pend.dimensions, good: vGood.dimensions, judgedBad })
  }
  // ══ §3 per-line target presence in the generation PASS (the สาย case) ═════════════════════
  {
    const c = load('tt.compiled.js'); const v = learned(c.initVocab())
    const target = { ...v.find(w => w.thai === 'ข้าวเหนียว') }
    target._trackTargets = [target]; target._allowedSet = c.buildThaiAllowedSet({ vocab: v, trackTargets: [target], grammarWords: c.ev('THAI_TRACK_GRAMMAR_WORDS') })
    const G1 = [L('A', 'ผมชอบกินข้าวเหนียวครับ', 'I like eating sticky rice.'), L('B', 'ข้าวเหนียวอร่อยค่ะ', 'Sticky rice is delicious.'), L('A', 'เราไปกินข้าวกันนะครับ', "Let's go eat.")]
    const G2 = [L('A', 'ผมชอบกินข้าวเหนียวครับ', 'I like eating sticky rice.'), L('B', 'ข้าวเหนียวอร่อยค่ะ', 'Sticky rice is delicious.'), L('A', 'ผมอยากกินข้าวเหนียวครับ', 'I want to eat sticky rice.')]
    let calls = 0; c.mockGeminiGenerate = async () => { calls++; return JSON.stringify(calls === 1 ? G1 : G2) }
    const log = []
    const res = await c.generateWordLines(target, 'At a market.', 'Somchai, a Thai man', 'Nida, a Thai woman', [], v, 'k', 'm', 0, (d, t, m) => { if (m && m.apiError) log.push(m.apiError) }, '', new Set())
    T('G1', '§3 a group where only SOME lines carry the target is NOT passed (v656 passed สาย with "เราไปกินข้าวกันนะครับตกลงไหมครับ"): target lines are banked, only the missing slot is re-asked, every returned line contains the target',
      calls === 2 && res && res.length === 3 && res.every(l => c.thaiTargetPresent(l.thai, 'ข้าวเหนียว', v)) && !res.some(l => l.thai === 'เราไปกินข้าวกันนะครับ') && log.some(l => /TARGET_MISSING_LINE_REJECT .*2\/3 banked/.test(l)),
      { calls, res: res && res.map(l => l.thai), log: log.filter(l => /TARGET|passed/.test(l)) })
  }
  {
    // §32 cost guard: the model returns the IDENTICAL exchange again ⇒ stop (no 11-check ladder); banked lines are kept
    const c = load('tt.compiled.js'); const v = learned(c.initVocab())
    const target = { ...v.find(w => w.thai === 'ข้าวเหนียว') }
    target._trackTargets = [target]; target._allowedSet = c.buildThaiAllowedSet({ vocab: v, trackTargets: [target], grammarWords: c.ev('THAI_TRACK_GRAMMAR_WORDS') })
    const G = [L('A', 'ผมชอบกินข้าวเหนียวครับ', 'I like eating sticky rice.'), L('B', 'ข้าวเหนียวอร่อยค่ะ', 'Sticky rice is delicious.'), L('A', 'เราไปกินข้าวกันนะครับ', "Let's go eat.")]
    let calls = 0; c.mockGeminiGenerate = async () => { calls++; return JSON.stringify(G) }
    const log = []
    const res = await c.generateWordLines(target, 'At a market.', 'Somchai, a Thai man', 'Nida, a Thai woman', [], v, 'k', 'm', 0, (d, t, m) => { if (m && m.apiError) log.push(m.apiError) }, '', new Set())
    const t2 = { ...target, _maxChecks: 3 }; let calls2 = 0
    c.mockGeminiGenerate = async () => { calls2++; return JSON.stringify([L('A', 'ผมชอบข้าวครับ', 'x'), L('B', 'ฉันชอบข้าวค่ะ', 'y'), L('A', 'ผมกินข้าว' + calls2 + 'ครับ', 'z')]) }
    await c.generateWordLines(t2, 'At a market.', 'Somchai, a Thai man', 'Nida, a Thai woman', [], v, 'k', 'm', 0, () => {}, '', new Set())
    T('G2', '§32 cost guard: an identical repeated exchange stops after 2 requests (v656 could burn 11) and returns the 2 banked target lines; a selective slot regeneration is bounded to 3 checks',
      calls === 2 && res && res.length === 2 && res.every(l => /ข้าวเหนียว/.test(l.thai)) && log.some(l => /GENERATION_STOPPED_REPEATING/.test(l)) && calls2 === 3, { calls, calls2, res: res && res.map(l => l.thai) })
  }
  // ══ §27 COMPOUND TARGET MATCH — one matcher, every stage agrees ═══════════════════════════
  {
    const c = load('tt.compiled.js'); const vocab = learned(c.initVocab())
    const A = c.ev('TRACK_ADAPTERS').th, LA = c.ev('LISTENING_ADAPTERS').th
    const POS = [['บัตร', 'ผมมีบัตรเครดิตนะครับ'], ['แสน', 'ฉันคิดว่าน่าจะหลายแสนนะคะ'], ['หมื่น', 'ผมมีเงินสดหมื่นบาทนะครับ'], ['สาย', 'เมื่อวานฉันตื่นสายนะคะ'], ['เก็บ', 'ผมจะเก็บไว้ในกระเป๋าครับ'], ['ลดราคา', 'ร้านนี้มีลดราคาไหมครับ']]
    const NEG = [['น้ำ', 'ห้องน้ำอยู่ไหนครับ'], ['ขา', 'ขาวมากครับ'], ['ถึง', 'คุณหมายถึงอะไรครับ'], ['มี', 'ผมซื้อมีดครับ']]
    const kwOf = th => { const w = vocab.find(x => x.thai === th) || { id: 9999, thai: th, english: '' }; return { wordId: w.id, thai: th, english: w.english } }
    const stages = (th, s) => {
      const kw = kwOf(th), p = { speaker: /ครับ$/.test(s) ? 'A' : 'B', thai: s, english: 'x', prompt: 'x', pairType: 'content', targetId: kw.wordId, _target: th, _typedAt: 'creation', _semanticState: 'VERIFIED' }
      return {
        matcher: c.thaiTargetConceptPresent(th, s, vocab).present,
        generation: c.thaiTargetPresent(s, th, vocab),
        detectTargetPresence: c.detectTargetPresence([{ thai: s }], { thai: th }, vocab).found,
        quota: A.targetPresent(p, kw, { vocab }),
        quotaValidity: !c.trackPairValidity(p, kw, A, { vocab }).reasons.some(r => /TARGET_MISSING/.test(r)),
        finalLineGate: !c.thaiLineGate(p, [kw], vocab).problems.some(x => x.code === 'TARGET_MISSING'),
        contract: c.validateThaiTargetPair(p, kw, { vocab }, 'final').dimensions.TARGET_PRESENT === 'PASS',
        listening: LA.present(s, th, { vocab }),
      }
    }
    const pos = POS.map(([th, s]) => ({ th, s, r: stages(th, s) })), neg = NEG.map(([th, s]) => ({ th, s, r: stages(th, s) }))
    T('M1', '§27 บัตร→บัตรเครดิต · แสน→หลายแสน · หมื่น→หมื่นบาท · สาย→ตื่นสาย · เก็บ→เก็บไว้ · ลดราคา→มีลดราคา ⇒ TARGET_PRESENT=true at EVERY stage (generation, QC detector, quota, final gate, acceptance contract, Listening)',
      pos.every(x => Object.values(x.r).every(Boolean)), pos.filter(x => !Object.values(x.r).every(Boolean)))
    T('M2', '§7 no arbitrary substring matches: น้ำ in ห้องน้ำ ("bathroom"), ขา in ขาว, ถึง in หมายถึง, มี in มีด ⇒ NOT present, and every stage agrees',
      neg.every(x => Object.values(x.r).every(v => v === false)), neg.map(x => ({ th: x.th, r: x.r })))
    const form = c.thaiTargetConceptPresent('บัตร', 'ผมมีบัตรเครดิตนะครับ', vocab)
    T('M3', '§7 the matcher explains itself: บัตรเครดิต = COMPOUND_SENSE ("credit card" ⊃ "card"); ห้องน้ำ = NOT_A_COMPONENT; หมายถึง = SHADOWED',
      form.form === 'COMPOUND_SENSE' && form.token === 'บัตรเครดิต' && c.thaiTargetConceptPresent('น้ำ', 'ห้องน้ำอยู่ไหนครับ', vocab).form === 'NOT_A_COMPONENT' &&
      c.thaiTargetConceptPresent('ถึง', 'คุณหมายถึงอะไรครับ', vocab).form === 'SHADOWED', form)
    // closed vocabulary: เก็บไว้ = เก็บ + ไว้ (composition) in the generation QC check too
    const allowed = new Set(['ผม', 'จะ', 'เก็บ', 'ไว้', 'ใน', 'กระเป๋า', 'ครับ'])
    const cv = c.thaiQcCheckVocabulary({ thai: 'ผมจะเก็บไว้ในกระเป๋าครับ' }, allowed, vocab)
    const cv2 = c.thaiQcCheckVocabulary({ thai: 'ผมจะเก็บไว้ในกระเป๋าครับ' }, new Set(['ผม', 'จะ', 'ใน', 'กระเป๋า', 'ครับ']), vocab)
    T('M4', '§7 closed vocabulary: the generation QC check authorises เก็บไว้ when เก็บ and ไว้ are both taught (the live run rejected it as "untaught vocabulary: เก็บไว้"); without เก็บ it is still blocked',
      cv.ok && !cv2.ok, { cv, cv2 })
  }
  // ══ §28 แสน RECOVERY ════════════════════════════════════════════════════════════════════
  {
    const c = load('tt.compiled.js'); const vocab = learned(c.initVocab())
    const w = vocab.find(x => x.thai === 'แสน')
    const kw = { wordId: w.id, thai: 'แสน', english: w.english }
    const have = [['A', 'เงินแสนนึงก็เยอะมากครับ', 'A hundred thousand baht is a lot.'], ['B', 'ฉันคิดว่าน่าจะหลายแสนนะคะ', 'I think it is probably several hundred thousand.']]
      .map(([sp, th, en], k) => ({ speaker: sp, thai: th, english: en, prompt: 'x', pairType: 'content', targetId: w.id, wordId: w.id, _target: 'แสน', _typedAt: 'creation', _pairKey: 'th-' + w.id + '-' + (k + 1), sceneId: 'S2', _semanticState: 'VERIFIED' }))
    const track = { language: 'th', createdAt: '2026-09-30T11:41:51.177Z', keywords: [{ ...kw, rating: null }], pairs: have,
      scenePlan: { scenes: [{ sceneId: 'S2', purpose: 'Checking payment options', localPremise: 'A and B talk about how they will pay', targetIds: [w.id] }] },
      sceneContract: { premise: 'Two friends at a market', characters: [{ speaker: 'A', name: 'Somchai' }, { speaker: 'B', name: 'Nida' }], allowedSceneEntities: [] } }
    const prompts = []; let judge = 0, reply = 0
    c.mockGeminiGenerate = async (k, m, msgs) => {
      const q = msgs[msgs.length - 1].content
      if (/QUOTA RECOVERY — Thai/.test(q)) {
        prompts.push(q); reply++
        return JSON.stringify(reply === 1
          ? [{ targetId: w.id, targetSurfaceUsed: 'แสน', speaker: 'A', thai: 'อาหารมื้อนี้ราคาเท่าไหร่ครับ', english: 'How much is this meal?', prompt: 'He asks how much the meal costs' },
             { targetId: w.id, targetSurfaceUsed: 'แสน', speaker: 'B', thai: 'เยอะขนาดนั้นเลยเหรอคะ', english: 'Is it that much?', prompt: 'She asks if it is that much' }]
          : [{ targetId: w.id, targetSurfaceUsed: 'แสน', speaker: 'A', thai: 'ราคานี้หลายแสนบาทเลยครับ', english: 'This price is several hundred thousand baht.', prompt: 'He says the price is several hundred thousand baht' }])
      }
      if (/native Thai speaker checking|Rate how well each Thai sentence/.test(q)) { judge++; return JSON.stringify([...q.matchAll(/^(\d+)\. /gm)].map(x => ({ i: +x[1], s: 5, thaiEnglishMatch: true }))) }
      return '[]'
    }
    const st = c.createRecoveryState(kw, { surface: 'แสน', sense: 'hundred thousand' })
    const ctx = { track, vocab, apiKey: 'k', model: 'm', recoveryState: st, onLog: () => {} }
    const r1 = await c.ev('TRACK_ADAPTERS').th.recoverTargetPairs(kw, 1, ctx)
    const judgeAfter1 = judge
    const r2 = await c.ev('TRACK_ADAPTERS').th.recoverTargetPairs(kw, 1, { ...ctx, round: 2 })
    const pal = (prompts[0].match(/USE ONLY THESE CONTENT WORDS[^\n]*\n\s+(.*)\n/) || [])[1] || ''
    if (process.env.SHOW) console.log('PROMPT1\n' + prompts[0] + '\nPROMPT2\n' + prompts[1])
    T('R1', '§9 the recovery request names the target it repairs, demands it in EVERY candidate, allows an empty answer, and asks each candidate to declare targetSurfaceUsed (verified independently)',
      /^YOU ARE REPAIRING TARGET: แสน \(id \d+\)/.test(prompts[0]) && /EVERY candidate MUST contain "แสน"/.test(prompts[0]) && /or an empty array/.test(prompts[0]) && /targetSurfaceUsed/.test(prompts[0]) &&
      c.ev('GEMINI_SCHEMAS').recoveryLines.items.required.includes('targetSurfaceUsed'), prompts[0].slice(0, 400))
    T('R2', '§11 a SMALL POSITIVE palette from the learner\'s authorised lexicon (scene words + domain words + support forms), never the 800+ word list; excludes words the learner was not taught',
      pal && pal.split(/\s+/).length >= 10 && pal.split(/\s+/).length <= 90 && !/Use ONLY these words plus the target/.test(prompts[0]) && ['มื้อ', 'หรอก', 'สั่ง', 'เกิน'].every(x => !pal.split(/\s+/).includes(x)) && pal.split(/\s+/).includes('เงิน'),
      { size: pal.split(/\s+/).length, pal })
    T('R3', '§28 candidates without แสน are rejected LOCALLY (0 paid judge calls) — then the next request states the failure class and a different construction yields a valid แสน pair ⇒ 3/3',
      r1.accepted.length === 0 && judgeAfter1 === 0 && r1.reasons.length === 2 && r1.reasons.every(x => /TARGET_MISSING/.test(x)) &&
      /PREVIOUS FAILURES for this target/.test(prompts[1]) && /TARGET_MISSING ×2/.test(prompts[1]) && /DIFFERENT construction/.test(prompts[1]) &&
      r2.accepted.length === 1 && c.thaiTargetPresent(r2.accepted[0].thai, 'แสน', vocab) && have.length + r2.accepted.length === 3,
      { r1: r1.reasons, judgeAfter1, r2: r2.accepted.map(p => p.thai), reasons2: r2.reasons, p2: prompts[1] && prompts[1].slice(0, 700) })
    // §13 unsuitability evidence
    const S = tests14.setup('th'); tests14.mock(S, 'th')
    const tA = S.targets[0], tB = S.targets[1]
    const failRec = async () => ({ accepted: [], reasons: ['CLOSED_VOCABULARY (มื้อ): ค่าอาหารมื้อนี้คงจะหลายแสนนะครับ', 'CLOSED_VOCABULARY (หรอก สั่ง): ไม่ถึงแสนหรอกค่ะ', 'CLOSED_VOCABULARY (เกิน): งั้นเราไม่เกินแสน', 'TARGET_MISSING: x'] })
    const AD = { ...S.c.ev('TRACK_ADAPTERS').th, recoverTargetPairs: failRec }
    const lg = []
    await S.c.finaliseMainTrack(tests14.makeTrack(S, 'th', { counts: { [tA.id]: 2, [tB.id]: 0 }, tag: '-ev' }), AD, { vocab: S.vocab, apiKey: 'k', model: 'm', qcRan: true, onLog: m => lg.push(m) })
    T('R4', '§13 TARGET_UNSUITABLE_FOR_CURRENT_LEXICON is NOT recorded for a target with valid pairs (the แสน case: 2/3 proves it is usable); it is recorded only when no pair exists and ≥ 3 target-bearing candidates failed on vocabulary',
      lg.some(l => new RegExp('TARGET_UNSUITABLE_FOR_CURRENT_LEXICON not recorded for ' + tA.thai + ': 2 valid pair').test(l)) && !lg.some(l => new RegExp('evidence recorded for ' + tA.thai + ' ').test(l)) &&
      lg.some(l => new RegExp('TARGET_UNSUITABLE_FOR_CURRENT_LEXICON evidence recorded for ' + tB.thai).test(l)),
      lg.filter(l => /UNSUITABLE/.test(l)))
  }
  // ══ §29 SCENE CLUSTERING ══════════════════════════════════════════════════════════════════
  {
    const c = load('tt.compiled.js'); const vocab = c.initVocab()
    const LIVE = ['ข้าวเหนียว', 'ส้มตำ', 'ผัก', 'กระเทียม', 'หอมใหญ่', 'เงินสด', 'บัตร', 'โอน', 'ลดราคา', 'หมื่น', 'แสน', 'ล้าน', 'ตกลง', 'คง', 'สาย', 'ทัน', 'พยายาม', 'เชื่อ', 'นอกจาก', 'เท่านั้น', 'เก็บ', 'ถอด', 'ชาม', 'มีด', 'ทำความสะอาด', 'ดูแลตัวเองด้วย', 'หมายถึง', 'อธิบาย', 'นามสกุล', 'ร้านสะดวกซื้อ']
    const targets = LIVE.map(th => { const w = vocab.find(x => x.thai === th); return { id: w.id, thai: th, english: w.english } })
    const id = th => targets.find(t => t.thai === th).id
    const S4 = ['นอกจาก', 'เท่านั้น', 'เก็บ', 'ถอด', 'ชาม', 'มีด', 'ทำความสะอาด', 'ดูแลตัวเองด้วย']
    const livePlan = [['Discussing lunch options', LIVE.slice(0, 5)], ['Checking payment options', LIVE.slice(5, 12)], ['Making a decision and planning', LIVE.slice(12, 18)], ['Concluding the conversation', S4],
      ['Clarifying details', ['หมายถึง', 'อธิบาย']], ['Identifying oneself', ['นามสกุล']], ['Considering alternatives', ['ร้านสะดวกซื้อ']]]
    c.mockGeminiGenerate = async (k, m, msgs) => /Plan a language lesson conversation/.test(msgs[msgs.length - 1].content)
      ? JSON.stringify({ scenes: livePlan.map(([purpose, ts]) => ({ purpose, localPremise: 'A and B are finishing their discussion and preparing to leave.', targetIds: ts.map(id) })) }) : '[]'
    const lg = []
    const plan = await c.planTargetScenes(targets, { premise: 'Two friends are at a market discussing what to eat for lunch' }, { apiKey: 'k', model: 'm', lang: 'th', onLog: m => lg.push(m) })
    const s4ids = S4.map(id)
    const byId = new Map(targets.map(t => [t.id, t]))
    T('C1', '§29 the planner\'s "Concluding the conversation" dump (bowl, knife, clean, keep, take off, besides, only, take care) is NOT accepted: SCENE_CLUSTER_VALIDATION FAIL ⇒ split before any generation',
      !plan.scenes.some(sc => s4ids.every(x => sc.targetIds.includes(x))) && lg.some(l => /SCENE_CLUSTER_VALIDATION FAIL "Concluding the conversation" \[8\]/.test(l)) &&
      plan.scenes.flatMap(sc => sc.targetIds).length === 30, lg.filter(l => /CLUSTER|SCENE_ID/.test(l)))
    T('C2', '§16/§17 every resulting scene passes the cluster check (one plausible everyday context); small scenes are allowed; the goodbye goes to the end; split scenes get their OWN derived local premise',
      plan.scenes.every(sc => c.sceneClusterCompatibility(sc.targetIds, byId).compatible) && plan.scenes.some(sc => sc.targetIds.length === 1) &&
      plan.scenes[plan.scenes.length - 1].targetIds.includes(id('ดูแลตัวเองด้วย')) &&
      plan.scenes.filter(sc => sc.clusterValidation.compatibility === 'SPLIT').every(sc => sc.localPremiseSource.startsWith('derived:') && !/finishing their discussion/.test(sc.localPremise)),
      plan.scenes.map(sc => ({ id: sc.sceneId, p: sc.purpose, lp: sc.localPremise, n: sc.targetIds.length, v: sc.clusterValidation })))
    // §18 coherence recluster: a failing scene with an invalid cluster is re-clustered, not rewritten
    const kws = targets.map(t => ({ wordId: t.id, thai: t.thai, english: t.english }))
    const tr = { keywords: kws, pairs: targets.map(t => ({ thai: t.thai + 'ครับ', targetId: t.id, pairType: 'content', sceneId: s4ids.includes(t.id) ? 'S4' : 'S1' })),
      scenePlan: { scenes: [{ sceneId: 'S1', purpose: 'rest', targetIds: targets.filter(t => !s4ids.includes(t.id)).map(t => t.id) }, { sceneId: 'S4', purpose: 'Concluding the conversation', targetIds: s4ids }] } }
    const lg2 = []
    const rc = c.reclusterFailingScenes(tr, { sectionScores: [{ sceneId: 'S1', score: 4 }, { sceneId: 'S4', score: 2 }] }, m => lg2.push(m))
    const newIds = rc.track.scenePlan.scenes.map(sc => sc.sceneId)
    T('C3', '§18 coherence S4 = 2/5 with an INVALID cluster ⇒ MAIN_TRACK_RECLUSTER (S4a, S4b …) with derived premises and re-stamped line sceneIds — no sentence rewrite',
      rc.reclustered.length === 1 && newIds.includes('S4a') && newIds.includes('S4b') && !newIds.includes('S4') && lg2.some(l => /MAIN_TRACK_RECLUSTER S4 /.test(l)) &&
      rc.track.pairs.filter(p => s4ids.includes(p.targetId)).every(p => /^S4[a-z]$/.test(p.sceneId)),
      { lg2, newIds })
    const rc2 = c.reclusterFailingScenes({ ...tr, scenePlan: { scenes: [{ sceneId: 'S1', purpose: 'food', targetIds: LIVE.slice(0, 5).map(id) }] } }, { sectionScores: [{ sceneId: 'S1', score: 2 }] }, m => lg2.push(m))
    T('C4', '§18 a failing scene whose cluster IS valid is left for line repair (only its off-topic lines are rewritten)', rc2.reclustered.length === 0 && lg2.some(l => /SCENE_CLUSTER_VALIDATION S1 PASS/.test(l)))
  }
  // ══ §30 PRONUNCIATION ZERO EXPECTED TOKENS ════════════════════════════════════════════════
  {
    const c = load('tt.compiled.js'); const vocab = c.initVocab()
    const lex = c.buildThaiPhoneticLexicon(vocab)
    const LIVE = [['th-1155-1', 'เรามีเงินสดเท่าไหร่ครับ', 'rao mii ngoen-sòt thâo-rài khráp'], ['th-1522-3', 'ผมอยากได้ลดราคาครับ', 'phǒm yàak dâi lót-raa-khaa khráp'], ['th-1455-1', 'คุณหมายถึงอะไรครับ', 'khun mǎai-thǔeng à-rai khráp']]
    // the generation shape that caused it: words are ROMANISED tokens, every one with an English gloss
    const mk = ([key, thai, ph]) => ({ thai, phonetic: ph, words: ph.split(' ').map(p => ({ p, e: 'gloss' })), speaker: 'A', _pairKey: key, pairType: 'content', english: 'x', prompt: 'x' })
    const one = c.thaiPronunciationLineAudit(mk(LIVE[0]), lex)
    T('P1', '§21 a non-empty Thai line with NO canonical Thai tokens reports PRONUNCIATION_EXPECTED_SEGMENTATION_MISSING — never EXTRA_ROMANISATION / SEGMENTATION_DRIFT against an empty expected side',
      one.issues.length === 1 && one.issues[0].failureClass === 'PRONUNCIATION_EXPECTED_SEGMENTATION_MISSING' && one.expectedTokenCount === 0 && !one.issues.some(x => /EXTRA_ROMANISATION|SEGMENTATION_DRIFT/.test(x.failureClass)), one.issues)
    const seg = await c.thaiFinaliseWords(LIVE.map(mk), { vocab })
    T('P2', '§20 ROOT CAUSE fixed: a fully-glossed ROMANISED word list is no longer taken as a segmentation — the three live lines get canonical Thai tokens (expectedTokenCount > 0)',
      seg.pairs.every(p => p.words.length >= 3 && p.words.every(w => /[฀-๿]/.test(w.p)) && p.words.map(w => w.p).join('') === p.thai) && seg.stats.deterministic === 3,
      seg.pairs.map(p => p.words.map(w => w.p).join('|')))
    const logs = []
    const fa = c.thaiFinalPronunciationAudit(LIVE.map(mk), lex, { onLog: m => logs.push(m), vocab })
    T('P3', '§30 เรามีเงินสดเท่าไหร่ครับ · ผมอยากได้ลดราคาครับ · คุณหมายถึงอะไรครับ: expected tokens rebuilt LOCALLY (no model) and the existing romanisation then matches ⇒ 0 issues',
      fa.issues.length === 0 && fa.expectedRebuilt === 3 && logs.filter(l => /PRONUNCIATION_EXPECTED_SEGMENTATION_MISSING/.test(l)).length === 3 && fa.pairs.every(p => p.words.every(w => /[฀-๿]/.test(w.p))),
      { issues: fa.issues, logs })
    // through the real Thai metadata stage: 0 model re-romanisations for these lines, sceneId restored
    let reRom = 0
    c.mockGeminiGenerate = async (k, m, msgs) => { const q = msgs[msgs.length - 1].content; if (/Re-romanize/.test(q)) reRom++; return '[]' }
    const track = { keywords: [], scenePlan: { scenes: [{ sceneId: 'S2', purpose: 'paying', targetIds: [1155, 1522] }, { sceneId: 'S5', purpose: 'clarifying', targetIds: [1455] }] } }
    const pairs = LIVE.map(mk).map((p, k) => ({ ...p, targetId: [1155, 1522, 1455][k] }))
    const flog = []
    const meta = await c.ev('TRACK_ADAPTERS').th.finaliseMetadata(pairs, { vocab, apiKey: 'k', model: 'm', track, onLog: m => flog.push(m) })
    T('P4', '§22/§23 through the real metadata stage: 0 pronunciation issues, 0 model re-romanisation requests for these lines, and every line carries its sceneId (never "sceneId=-")',
      meta.alignmentIssues.length === 0 && reRom === 0 && meta.pairs.map(p => p.sceneId).join() === 'S2,S2,S5' && !flog.some(l => /PRONUNCIATION_REPAIR lineId/.test(l)),
      { issues: meta.alignmentIssues, reRom, scenes: meta.pairs.map(p => p.sceneId), flog: flog.filter(l => /PRON|SCENE/.test(l)) })
  }
  // ══ §23 sceneId at creation, §24 log severity + user summary, §25 politeness ═══════════════
  {
    const c = load('tt.compiled.js')
    const sev = m => c.generationLogSeverity(m)
    T('L1', '§24 severity: candidate rejections are ℹ debug (untaught token, dropped pair, final-audit drop, 0/n recovery), a final quota miss / pronunciation failure is ⛔; the ❌ prefix is gone from transient lines',
      sev('  ⛔ token=มื้อ canonicalId=none vocabAuthorisation=BLOCKED_UNSEEN') === 'DEBUG' && sev('  ⛔ dropped pair 31 (gemini-check-2:conv): no authorised repair for มื้อ') === 'DEBUG' &&
      sev('  ⛔ final audit: [มีด] UNNATURAL — x → dropped') === 'DEBUG' && sev('⚠️ Quality fail: VOCAB: untaught vocabulary') === 'DEBUG' && sev('  ⛔ QUOTA RECOVERY แสน: 0/2 accepted — x') === 'DEBUG' &&
      sev('  ⛔ TARGET_PAIR_QUOTA_UNMET แสน (1628): 2/3') === 'BLOCKER' && sev('  ⛔ PRONUNCIATION_ALIGNMENT_FAIL lineId=x') === 'BLOCKER' &&
      c.generationLogFormat('  ⛔ token=มื้อ x BLOCKED_UNSEEN') === '  ℹ token=มื้อ x BLOCKED_UNSEEN' && c.generationLogFormat('  ⛔ TARGET_PAIR_QUOTA_UNMET แสน') === '  ⛔ TARGET_PAIR_QUOTA_UNMET แสน')
    const g = { status: 'NOT_READY', reasons: ['TARGET_PAIR_QUOTA=89/90 (required 90/90)', 'PRONUNCIATION_ALIGNMENT_ISSUES=3', 'MAIN_TRACK_COHERENCE=FAIL (overall 4/5 · S4=2)'],
      counts: { targetPairs: 89, targetPairsRequired: 90 }, quota: { unresolved: [{ target: 'แสน', valid: 2 }] }, invariants: { PRONUNCIATION_ALIGNMENT_ISSUES: 3 },
      mainCoherence: { state: 'VERIFIED', passed: false, overall: 4, incoherent: [{ sceneId: 'S4', score: 2 }] },
      alignmentIssues: [1, 2, 3].map(k => ({ detail: [{ failureClass: 'PRONUNCIATION_EXPECTED_SEGMENTATION_MISSING' }] })) }
    const sum = c.trackIntegritySummaryLines({ integrity: g })
    T('L2', '§24 USER SUMMARY: "MAIN TRACK NOT_READY · Reasons: target quota 89/90: แสน 2/3 · coherence: S4 2/5 · pronunciation: 3 validator failures" (details stay in the debug trace)',
      sum.join('\n') === 'MAIN TRACK NOT_READY\nReasons:\n- target quota 89/90: แสน 2/3\n- coherence: S4 2/5\n- pronunciation: 3 line(s) (3 validator failure(s))', sum)
    const pv = (t, en, sp) => c.validateThaiSpeakerParticle(t, sp).politeness.map(x => x.reason)
    T('L3', '§25 no false POLITENESS noise: นะคะ / ล่ะคะ on a statement is normal Thai (no advisory); a real ค่ะ-on-a-question with an English question is normalised locally to คะ; an embedded question (ไม่รู้ว่า…หรือเปล่าค่ะ) is left alone',
      pv('ข้าวเหนียวน่าอร่อยนะคะ', '', 'female').length === 0 && pv('แล้วคุณล่ะคะ', '', 'female').every(r => !/statement/.test(r)) &&
      c.thaiNormalisePoliteParticle('คุณจะไปไหมค่ะ', 'Are you going?', 'female').thai === 'คุณจะไปไหมคะ' &&
      !c.thaiNormalisePoliteParticle('ฉันไม่รู้ว่ามีลดราคาหรือเปล่าค่ะ', 'I do not know if there is a discount.', 'female').changed &&
      !c.thaiNormalisePoliteParticle('ผมจะไปไหมครับ', 'Will I go?', 'male').changed)
    const src = require('fs').readFileSync(__dirname + '/tt.jsx', 'utf8')
    T('L4', '§23 target pairs carry lineId / sceneId from creation (generation, early regeneration, quota recovery) and the identity-preserving copy keeps them',
      /_pairKey:_lineKeys\[_ri\], lineId:_lineKeys\[_ri\],\s*\n\s*sceneId: target\._sceneId/.test(src) && /sceneId: \(c\.coherenceRepair && c\.coherenceRepair\.sceneId\) \|\| \(_lp && _lp\.sceneId\)/.test(src) &&
      /'speakerGender', 'sceneId', 'scenePurpose', 'lineId'\]/.test(src))
  }
  console.log(out.join('\n'))
  console.log('v657 Thai 90/90 repair regression: ' + passes + '/' + (passes + fails) + (fails ? ' — ' + fails + ' FAILED' : ' — ALL PASS'))
  process.exitCode = fails ? 1 : 0
}
main().catch(e => { console.error(e); process.exitCode = 1 })
