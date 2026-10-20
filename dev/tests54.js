// v696 — DAILY CUE CLARITY regression (Thai · Japanese · Mandarin Daily Tracks; Listening is out of scope).
// The learner-facing English cue must say the speaking act and exactly what the sentence says — no scene, reasons or narration.
// Fixtures: the owner's v694 Thai Daily track of 14 Oct (its 18 flagged prompt mismatches) and the latest Japanese / Mandarin Daily
// exports (benchmark/v696/cue_fixtures.js). Part A runs the app's own deterministic cue pass on every final pair of the three
// tracks; part B runs the shared finaliser (finaliseMainTrack, the model simulated at the transport boundary — tests14) to show the
// pass is wired in, edits only the cue and that a Thai cue it changes is judged again.
'use strict'
const { load } = require('./harness')
const F = require('./benchmark/v696/cue_fixtures')
const out = []; let n = 0, fails = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; out.push((pass ? 'PASS ' : 'FAIL ') + id.padEnd(5) + name + (!pass && detail !== undefined ? '\n      ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 1200) : '')) }
const c = load(__dirname + '/tt.compiled.js', { realBelt: true })
const FIELD = { th: 'thai', ja: 'japanese', zh: 'chinese' }
const NAMES = { th: ['Somchai', 'Nida'], ja: ['Ken', 'Yui', 'Yuka'], zh: [] }
const G = { th: { A: 'm', B: 'f' }, ja: { A: 'm', B: 'f' }, zh: {} }
const ctxOf = lang => { const base = c.cueClarityCtx(lang); return { ...base, names: NAMES[lang], genderOf: p => (lang === 'th' && p.gender) || G[lang][p.speaker] || null, addrOf: p => G[lang][p.speaker === 'A' ? 'B' : 'A'] || null } }
const pairsOf = lang => F[lang].map(p => ({ ...p, pairType: p.type }))
const run = lang => { const pairs = pairsOf(lang); const r = c.cueClarityPass(lang, pairs, ctxOf(lang)); return { pairs, r, by: n => r.pairs[pairs.findIndex(p => p.n === n)], orig: n => pairs.find(p => p.n === n) } }
const W = s => (String(s || '').toLowerCase().match(/[a-zà-ÿ][a-zà-ÿ'-]*/g) || [])
const negN = s => (String(s || '').toLowerCase().replace(/^\s*no[,.!]\s*/, '').replace(/,?\s*(isn't it|aren't you|don't you( think)?)\s*[?.!]*$/, '').match(/\b(not|no|never|can't|cannot|don't|doesn't|didn't|isn't|aren't|wasn't|won't|haven't|hasn't)\b|n't\b/g) || []).length
const isQcue = s => /^\s*(ask|check)\b|[?？]\s*$|\bwhether\b/i.test(s)
const NARR = /^(He|She|A|B)\s+(tells|says|asks|suggests|offers|answers|agrees|apologi[sz]es)\b|^(Asking|Saying|Declining|Agreeing)\b|^As [A-Z][a-z]+,|^Tell the other person:/

;(async () => {
  const th = run('th'), ja = run('ja'), zh = run('zh')
  // ══ A — the v694 Thai examples of the brief (§3) ═══════════════════════════════════════════════════════════════════════════
  {
    const cue = k => th.by(k).prompt
    T('A1', 'Example A — "Suggest they order some sugar as well, to share with the seafood and seasonings" (งั้นเอาน้ำตาลด้วยครับ) → a suggestion about sugar, nothing about sharing / seafood / seasonings, "as well" kept',
      /^Suggest\b/.test(cue(5)) && /sugar/.test(cue(5)) && /as well|too/.test(cue(5)) && !/share|seafood|season/.test(cue(5)), cue(5))
    T('A2', 'Example B — "Tell her you don\'t want any salt with the shrimp order" → "Say you don\'t want … salt." (negation kept, the shrimp order gone)',
      /^Say you don't want (any )?salt\.$/.test(cue(9)), cue(9))
    T('A3', 'Example C — "Ask him if there is a bigger bottle, since you wanted a bigger spoon" → still a question about a bigger bottle, the spoon reason gone',
      /^Ask\b/.test(cue(31)) && /bigger bottle/.test(cue(31)) && !/spoon|since/.test(cue(31)), cue(31))
    T('A4', 'Example D — "Tell her to go straight and then turn left at the next corner." → "Tell her to go straight and then turn left." (the corner is not in ตรงไปเลี้ยวซ้ายครับ)',
      cue(54) === 'Tell her to go straight and then turn left.', cue(54))
    T('A5', 'Example E — "Ask him how much it costs to rent a car for the day." → asks the price of renting a car, "for the day" gone',
      /^Ask\b/.test(cue(79)) && /how much/.test(cue(79)) && /rent a car/.test(cue(79)) && !/for the day/.test(cue(79)), cue(79))
    T('A6', 'Example F — "the sign over there is the songthaew stop" for ป้ายนั้นเป็นป้ายรถเมล์ครับ is a MEANING MISMATCH (class A): the cue is rebuilt from the verified meaning ("bus stop") and the mismatch is reported',
      th.by(48)._cueClass === 'A' && /bus stop/.test(cue(48)) && !/songthaew/.test(cue(48)) && (th.by(48)._cueFlags || []).some(f => /CUE_MEANING_MISMATCH/.test(f)), { cue: cue(48), flags: th.by(48)._cueFlags })
    T('A7', 'third-person narration becomes an instruction to the speaker, with person shifted and the verb agreeing: "He tells her he really likes sugar." → "Say you really like sugar."; "He says then he won\'t order any chilli after all." keeps "won\'t"',
      cue(3) === 'Say you really like sugar.' && /^(Then say|Say then) you won't (order|get) any chilli/.test(cue(20)), [cue(3), cue(20)])
    T('A8', 'speaker contradiction fixed: pair 58 is spoken by B (a woman) but the cue said "He asks if you two…" → "Ask if you two have to cross the bridge."',
      /^Ask if (we|you two) have to cross the bridge\.$/.test(cue(58)), cue(58))
    T('A9', '"Tell the other person: …" copies become reported speech: "Tell the other person: I came by songthaew." → "Say you came by songthaew."; "Ask: Is that bottle yellow?" → "Ask if that bottle is yellow."',
      cue(39) === 'Say you came by songthaew.' && cue(34) === 'Ask if that bottle is yellow.', [cue(39), cue(34)])
  }
  // ══ B — meaning is preserved (brief §4, §9.2–9.7) on EVERY changed cue of all three tracks ═══════════════════════════════════
  for (const [lang, R] of [['th', th], ['ja', ja], ['zh', zh]]) {
    const ch = R.pairs.map((p, i) => [p, R.r.pairs[i]]).filter(([a, b]) => a.prompt !== b.prompt)
    const lostNeg = ch.filter(([a, b]) => negN(b.prompt) < negN(a.prompt) && !(b._cueFlags || []).some(f => /CUE_ADDED_MEANING/.test(f)) && negN(b.english) === negN(b.prompt) ? false : negN(b.prompt) < negN(a.prompt) && negN(a.english) > 0)
    T('B1-' + lang, lang + ': no changed cue loses a negation the sentence has (' + ch.length + ' cues changed)', !lostNeg.length, lostNeg.map(([a, b]) => a.prompt + ' → ' + b.prompt))
    const sentQ = p => lang === 'th' ? /(ไหม|มั้ย|หรือเปล่า|หรือยัง|เหรอ|หรือ.*คะ$|อะไร|ที่ไหน|ไหน|ใคร|ทำไม|ยังไง|เท่าไหร่|กี่)/.test(p.thai) && /[?]$/.test(p.english) : /[?？]$/.test(p[FIELD[lang]]) || /[?]$/.test(p.english)
    const qFlip = ch.filter(([a, b]) => isQcue(a.prompt) !== isQcue(b.prompt) && isQcue(a.prompt) === sentQ(a) && !/^(Suggest|Offer)\b/.test(b.prompt))
    T('B2-' + lang, lang + ': questions stay questions and statements stay statements (no changed cue flips the form the sentence has)', !qFlip.length, qFlip.map(([a, b]) => a.prompt + ' → ' + b.prompt))
    // no new meaning: every content word of a changed cue comes from the original cue or the verified English
    const extra = ch.map(([a, b]) => ({ a, b, add: W(b.prompt).filter(w => w.length > 3 && !W(a.prompt).includes(w) && !W(b.english).includes(w) && !/^(say|tell|ask|suggest|them|they|their|then|whether|your|yours|yourself|that|this|there|have|will|would|should|could|okay|sure|you'll|you're|you've|they'll|they're|they've|he's|she's|he'll|she'll|his|hers)$/.test(w) && !W(a.prompt).some(x => x.slice(0, 4) === w.slice(0, 4))) })).filter(x => x.add.length)
    T('B3-' + lang, lang + ': no changed cue introduces a word that is neither in the original cue nor in the verified meaning (no new meaning)', !extra.length, extra.map(x => x.a.prompt + ' → ' + x.b.prompt + ' [' + x.add.join(',') + ']'))
    const narr = R.r.pairs.filter(p => NARR.test(p.prompt))
    T('B4-' + lang, lang + ': no final cue narrates in the third person or copies the English after a template ("He tells her…", "She asks…", "Tell the other person: …", "As Ken, …")', !narr.length, narr.map(p => p.prompt))
    const touched = R.pairs.filter((p, i) => { const q = R.r.pairs[i]; return ['thai', 'japanese', 'chinese', 'english', 'phonetic', 'reading', 'romaji', 'pinyin', 'target', 'targetId', 'speaker', 'type'].some(k => p[k] !== q[k]) })
    T('B5-' + lang, lang + ': only the cue is edited — sentence, translation, pronunciation (phonetic / reading / romaji / pinyin), target and speaker of every pair are unchanged', !touched.length, touched.map(p => p.n))
    const again = c.cueClarityPass(lang, R.r.pairs, ctxOf(lang))
    T('B6-' + lang, lang + ': the pass is idempotent (running it on its own output changes nothing)', again.stats.changed === 0, again.stats.examples.slice(0, 3))
    const val = p => lang === 'th' ? c.thaiCueFormProblems(p).length : lang === 'ja' ? c.ev('jaCueFormProblems')(p).length : c.ev('zhCueFormProblems')(p).length
    const worse = R.pairs.map((p, i) => [p, R.r.pairs[i]]).filter(([a, b]) => a.prompt !== b.prompt && val(b) > val(a))
    T('B7-' + lang, lang + ': every changed cue is revalidated — none fails the language\'s cue-form check (question ↔ statement, subject) that the original passed', !worse.length, worse.map(([a, b]) => b.prompt))
    const st = R.r.stats
    T('B8-' + lang, lang + ': not everything is rewritten for uniformity — already-correct cues are left as they are (' + st.D + ' unchanged, ' + st.C + ' kept for context), and the changes are counted by class (A ' + st.A + ' · B ' + st.B + ')', st.D >= 10 && st.A + st.B + st.C + st.D === st.checked, st)
  }
  // ══ C — the hard cases: degree / comparison / ellipsis / already-correct (§4, §7) ══════════════════════════════════════════
  {
    const k85 = th.by(85), k83 = th.by(83), k89 = th.by(89)
    T('C1', 'th 85 ขนาดเล็กถูกไหมคะ: the cue keeps "cheap" (no "cheaper" — the Thai has no กว่า) and the TRANSLATION "Is the small size cheaper?" is flagged as adding a comparison — the English is never used to rebuild the cue',
      /cheap\b/.test(k85.prompt) && !/cheaper/.test(k85.prompt) && (k85._cueFlags || []).some(f => /TRANSLATION_ADDS_COMPARISON/.test(f)), { cue: k85.prompt, flags: k85._cueFlags })
    T('C2', 'th 83 ง่ายนิดเดียวครับ: cue "only a little easy" vs translation "pretty easy" is a DEGREE conflict — flagged for the sentence check, not silently rewritten either way',
      /only a little easy/.test(k83.prompt) && (k83._cueFlags || []).some(f => /DEGREE_DIFFERS/.test(f)), { cue: k83.prompt, flags: k83._cueFlags })
    T('C3', 'th 89 ไม่ต้องคิดมากคุ้มครับ ("it\'s worth it"): the elided referent "the large size" comes from the lines before and stays in the cue (class C — kept, not rebuilt from the elliptical English) — the cue still tells the learner what is worth it',
      /large size/.test(k89.prompt) && th.r.stats.C >= 1 && c.cueClarify('th', th.orig(89), { ...ctxOf('th'), prevEnglish: th.orig(87).english + ' ' + th.orig(88).english }).cls === 'C', { cue: k89.prompt })
    const r = c.cueClarify('th', { prompt: 'Ask how much the shrimp costs.', thai: 'เท่าไหร่คะ', english: 'How much is it?' }, { ...ctxOf('th'), prevEnglish: 'I want to eat shrimp too.' })
    T('C4', 'ellipsis: "Ask how much the shrimp costs" for เท่าไหร่คะ ("How much is it?") keeps "the shrimp" — "Ask how much it costs" would not tell the learner what to ask about', r.cue === 'Ask how much the shrimp costs.', r)
    const keep = [[th, 19], [th, 66], [th, 76], [ja, 9], [ja, 24], [zh, 3]].map(([R, k]) => [R.orig(k).prompt, R.by(k).prompt])
    T('C5', 'already-correct concise cues are not touched ("Ask him whether the chilli is very spicy." · "Tell Nida you might arrive late tomorrow." · "Ask what they will drink" …)',
      keep.slice(0, 2).every(([a, b]) => a === b) && keep[4][0] === keep[4][1], keep)
    const zf = zh.by(29)
    T('C6', 'zh 29 昨天人很少。: the cue "…very few people, not today" ADDED a contrast the sentence does not have — removed, and reported as a fixed meaning mismatch',
      zf.prompt === 'Say that yesterday there were very few people.' && (zf._cueFlags || []).some(f => /CUE_ADDED_MEANING/.test(f)), { cue: zf.prompt, flags: zf._cueFlags })
    const jn = ja.by(16)
    T('C7', 'ja 16 遠くなかった？: the negative question is flagged when the cue asks the positive one (negation is kept visible, not hidden)', (jn._cueFlags || []).some(f => /CUE_NEGATION_DIFFERS/.test(f)), jn)
    T('C8', 'ja: manner / setting asides are removed ("with a happy tone", "as you set off on foot", "pointing across the road", "casually"), politeness words are not', !ja.r.pairs.some(p => /happy tone|relaxed tone|set off on foot|pointing across|\bcasually\b|in a casual (way|tone)/i.test(p.prompt)) && /politely/.test(ja.by(89).prompt),
      ja.r.pairs.filter(p => /tone|pointing|casual/i.test(p.prompt)).map(p => p.prompt))
    T('C9', 'ja addressee is resolved from the scene: "Ask Ken: Are you taking the train today?" → "Ask Ken if he is taking the train today."', ja.by(81).prompt === 'Ask Ken if he is taking the train today.', ja.by(81).prompt)
    T('C10', 'zh: the "Tell the other person: …" / "Ask: …?" template copies become instructions — "Ask if they want to eat together." · "Say you haven\'t arrived yet." · "Tell them to drive a little faster." · "Suggest we go home together."',
      zh.by(39).prompt === 'Ask if they want to eat together.' && zh.by(7).prompt === "Say you haven't arrived yet." && zh.by(21).prompt === 'Tell them to drive a little faster.' && zh.by(41).prompt === 'Suggest we go home together.', [39, 7, 21, 41].map(k => zh.by(k).prompt))
    // two grammar faults found by the Haiku prompt-following check (old-contract cues through the pass)
    const one = (cue, en, thai) => c.cueClarify('th', { prompt: cue, english: en, thai, speaker: 'A', pairType: 'recall' }, ctxOf('th')).cue
    const c11 = one('He tells her that pair of socks costs twenty-nine baht.', 'That pair of socks is twenty-nine baht.', 'ถุงเท้าคู่นั้นยี่สิบเก้าบาทครับ')
    T('C11', 'narration "He tells her that pair of socks costs…" keeps the determiner "that" (not "Tell her pair of socks…")', /\bthat pair of socks\b/.test(c11) && !/^He\b/.test(c11), c11)
    const c12 = one("Ask him why he can't buy the plane ticket.", "Why can't you buy it?", 'ทำไมซื้อไม่ได้คะ')
    T('C12', 'a rebuilt wh-question with a negated modal is in reported order: "Ask why she can\'t buy it." (listener Nida; not "why can\'t they")', /^Ask why (she|they) can't buy it\.$/.test(c12), c12)
  }
  // ══ D — prompt-length: shorter on average, never a hard gate (§2) ════════════════════════════════════════════════════════════
  for (const [lang, R] of [['th', th], ['ja', ja], ['zh', zh]]) {
    const wc = s => W(s).length, cont = R.pairs.map((p, i) => [p, R.r.pairs[i]]).filter(([a]) => a.type !== 'framing')
    const before = cont.reduce((s, [a]) => s + wc(a.prompt), 0) / cont.length, after = cont.reduce((s, [, b]) => s + wc(b.prompt), 0) / cont.length
    const long = cont.filter(([, b]) => wc(b.prompt) > 14).length
    T('D1-' + lang, lang + ': average cue length ' + before.toFixed(1) + ' → ' + after.toFixed(1) + ' words; ' + long + ' cue(s) still over 14 words (allowed where the meaning needs it — not a gate)', after <= before && after <= 10, { before, after, long })
  }
  // ══ E — wired into the Daily pipeline (shared finaliser, simulated model) ═══════════════════════════════════════════════════
  {
    const t14 = require('./tests14')
    for (const lang of ['th', 'ja', 'zh']) {
      const go = async on => { const S = t14.setup(lang); t14.mock(S, lang, {}); const was = S.c.setCueClarity(on); const log = []
        const t = await S.c.finaliseMainTrack(t14.makeTrack(S, lang), S.c.ev('TRACK_ADAPTERS')[lang], { vocab: S.vocab, apiKey: 'k', model: 'gemini-2.5-flash-lite', qcRan: true, onLog: m => log.push(m) })
        S.c.setCueClarity(was); return { t, Ls: log.join('\n') } }
      const ON = await go(true), OFF = await go(false), t = ON.t, Ls = ON.Ls
      const content = t.pairs.filter(p => p && p.targetId != null)
      const narr = content.filter(p => /^(He|She)\s+(says|remarks|asks)\b/.test(p.prompt || ''))
      // v706 — _cueLint / _cueLintFrom are cue metadata like _cueFlags: with the cue pass OFF the fixture's "He says: he really like the price"
      // now (correctly) carries BROKEN_ENGLISH from the cue grammar guard; with it ON the cue is rewritten first. Only the cue side differs.
      const strip = p => { const { prompt, _cueClarifiedFrom, _cueClass, _cueFlags, _semVerdicts, _semCue, _cueLint, _cueLintFrom, ...rest } = p || {}; return JSON.stringify(rest) }
      const offBy = new Map(OFF.t.pairs.map(p => [t14.txt(lang, p), p]))
      const meta = content.filter(p => { const b = offBy.get(t14.txt(lang, p)); return !b || strip(b) !== strip(p) })
      const qOn = JSON.stringify((t.integrity || {}).quota || null), qOff = JSON.stringify((OFF.t.integrity || {}).quota || null)
      T('E1-' + lang, lang + ': finaliseMainTrack runs the cue pass on the pairs it saves (CUE_CLARITY final log, track.cueClarity stats), no "He says: …" narration is left in a saved target cue',
        /CUE_CLARITY \(final, /.test(Ls) && t.cueClarity && t.cueClarity.checked > 0 && !narr.length, { log: (Ls.match(/[^\n]*CUE_CLARITY[^\n]*/) || [''])[0].slice(0, 300), narr: narr.slice(0, 3).map(p => p.prompt) })
      T('E2-' + lang, lang + ': ON vs OFF on the same track: only the cue differs — sentence, English, pronunciation, target, speaker and every other field of each saved pair are identical, the same pairs are saved and the quota / integrity result is identical (30 targets × 3 recalls kept)',
        !meta.length && qOn === qOff && content.length === OFF.t.pairs.filter(p => p && p.targetId != null).length && t.status === OFF.t.status, { meta: meta.slice(0, 3).map(p => t14.txt(lang, p)), qOn: qOn.slice(0, 120), qOff: qOff.slice(0, 120) })
    }
    // a Thai cue changed after it was judged is STALE → judged again before saving (thaiRevalidateStaleCues), never saved unjudged
    {
      const p = { ...pairsOf('th')[8] }; p._semVerdicts = { cue: { key: c.ev('_semCacheKey')('cue', p), v: { s: 4 } } }
      const after = c.cueClarityPass('th', [p], ctxOf('th')).pairs
      T('E3', 'th: a cue the pass changes after it was judged has a stale verdict → finaliseMainTrack re-judges it (thaiStaleCuePairs → cue-revalidation) — the persisted cue is always the judged cue', after[0].prompt !== p.prompt && c.ev('thaiStaleCuePairs')(after).length === 1, after[0].prompt)
    }
    // the switch: off → the legacy cues and prompts, byte for byte
    const was = c.setCueClarity(false)
    const off = c.cueClarityPass('th', pairsOf('th'), ctxOf('th'))
    const p0 = pairsOf('th')[2]
    T('E4', 'rollback switch: setCueClarity(false) leaves every cue as generated and the Thai cue rebuild falls back to the v695 template', off.stats.off === true && off.pairs.every((p, i) => p.prompt === pairsOf('th')[i].prompt) &&
      /^Tell the other person: /.test(c.thaiLocalCueRepair({ thai: 'ผมมารถสองแถวครับ', english: 'I came by songthaew.', prompt: 'x' }) || ''), off.stats)
    c.setCueClarity(was)
    T('E5', 'generator contract: with the switch on, the Daily generators ask for a short second-person instruction and say the scene never goes into the cue (no "third-person cue")', /SHORT instruction to the speaker/.test(c.ev('DAILY_CUE_CONTRACT')) && c.dailyCueRule('legacy') === c.ev('DAILY_CUE_CONTRACT') && /NEVER narrate/.test(c.ev('DAILY_CUE_CONTRACT')))
  }
  console.log(out.join('\n'))
  console.log('\n' + (n - fails) + '/' + n + ' passed')
  process.exit(fails ? 1 : 0)
})().catch(e => { console.error(e); process.exit(2) })
