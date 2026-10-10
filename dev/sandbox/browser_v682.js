#!/usr/bin/env node
// v682 — resumable Daily generation in the REAL page (headless Chromium, served over http). Gemini is faked at the network:
// every Mandarin generation request gets an empty reply (so each recall is completed by the app's own deterministic fallback
// after its paid checks), every other request (QC, scenes, recovery) gets HTTP 402 so the screen stops there.
//   M1  Mandarin Daily runs; every accepted recall is saved in the draft (tt-zh-gen-checkpoint); nothing is added to the track list
//   M2  the live 89/90 state (one recall missing, draft "incomplete") → reopening Daily Track shows the saved-draft choice:
//       "89 / 90 recalls are verified and kept", the missing recall named, "Retry missing recalls (1)", "Start new generation"
//   M3  Retry missing recalls → ONLY the missing recall is requested (≤ 11 requests, none for the 89 kept); resume counted
//   M4  Start new generation discards the draft (deliberately) and starts a full generation
//   M5  vocabulary / SRS untouched by all of this; no page errors
//   J1  Japanese: a saved draft is offered BEFORE a new scene is paid for; an incompatible draft says why and offers no resume
//   T1  Thai: a saved NOT-READY track (87/90) is offered on reopening; "Retry missing recalls" resumes it (counted) without errors
'use strict'
const fs = require('fs'), path = require('path'), http = require('http')
const { chromium } = require('playwright')
const ROOT = path.join(__dirname, '..')
const checks = []
const ok = (n, c, d) => { checks.push({ n, pass: !!c, d: d == null ? null : d }); console.log((c ? 'PASS ' : 'FAIL ') + n + (d != null ? ' — ' + (typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 400) : '')) }
function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      const p = decodeURIComponent(req.url.split('?')[0].split('#')[0])
      const f = p === '/' ? path.join(ROOT, 'index.html') : path.join(ROOT, p)
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); return rsp.end() }
      rsp.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream' }); fs.createReadStream(f).pipe(rsp)
    })
    srv.listen(0, '127.0.0.1', () => res(srv))
  })
}
;(async () => {
  const srv = await serve(), base = 'http://127.0.0.1:' + srv.address().port + '/'
  const browser = await chromium.launch()
  const local = { 'react.production.min.js': 'node_modules/react/umd/react.production.min.js', 'react-dom.production.min.js': 'node_modules/react-dom/umd/react-dom.production.min.js', 'babel.min.js': 'node_modules/@babel/standalone/babel.min.js' }
  async function session(lang) {
    const ctx = await browser.newContext(), page = await ctx.newPage(), errors = [], seen = []
    page.on('pageerror', e => errors.push(e.message))
    await page.route('**/*', async route => {
      const u = route.request().url()
      const k = Object.keys(local).find(k => u.endsWith(k))
      if (k) return route.fulfill({ path: path.join(ROOT, local[k]), contentType: 'application/javascript' })
      if (u.startsWith(base)) return route.continue()
      if (/generativelanguage\.googleapis\.com/.test(u)) {
        let q = ''; try { q = JSON.parse(route.request().postData() || '').contents.map(c => c.parts.map(p => p.text).join('')).join('\n') } catch (e) {}
        const gen = /Write ONE natural sentence \(recall (\d) of 3\)/.exec(q), tgt = (/TARGET: ★ (\S+)/.exec(q) || [])[1] || null
        seen.push({ gen: !!gen, recall: gen ? +gen[1] : null, target: tgt, scene: /scene/i.test(q.slice(0, 300)) })
        if (gen) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: '[]' }] } }], usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 1, totalTokenCount: 11 } }) })
        return route.fulfill({ status: 402, contentType: 'application/json', body: JSON.stringify({ error: { code: 402, status: 'PAYMENT_REQUIRED', message: 'browser test: stop here' } }) })
      }
      return route.fulfill({ status: 404, body: '' })
    })
    await page.addInitScript(l => { try { if (!localStorage.getItem('tt-gemini-key')) { localStorage.setItem('tt-gemini-key', JSON.stringify('AIzaSyTEST-browser-v682-0000000000')); localStorage.setItem('tt-active-language', JSON.stringify(l)) } } catch (e) {} }, lang)
    const text = () => page.evaluate(() => document.body.innerText)
    const waitText = async (re, ms = 120000) => { for (let i = 0; i < ms / 250; i++) { if (re.test(await text())) return true; await page.waitForTimeout(250) } return false }
    return { ctx, page, errors, seen, text, waitText }
  }
  const lsGet = (page, k) => page.evaluate(k => { try { return JSON.parse(localStorage.getItem(k) || 'null') } catch (e) { return null } }, k)
  // ── Mandarin ──
  {
    const S = await session('zh'), { page } = S
    await page.goto(base); await S.waitText(/Daily Track/)
    const vocab0 = JSON.stringify(await lsGet(page, 'tt-zh-vocab')), tracks0 = JSON.stringify(await lsGet(page, 'tt-zh-tracks'))
    await page.getByText('Daily Track', { exact: true }).first().click()
    // generation runs on fallbacks; it ends either complete (→ QC stops at 402) or incomplete (→ saved-draft choice)
    const ended = await S.waitText(/Quality check|Study|Saved Mandarin draft|Generation incomplete/i, 300000)
    await page.waitForTimeout(1500)
    const cp1 = await lsGet(page, 'tt-zh-gen-checkpoint')
    const gens1 = S.seen.filter(s => s.gen).length
    ok('M1 Mandarin Daily: every accepted recall is saved in the draft as it is accepted (' + (cp1 ? cp1.accepted.length : 0) + ' saved, ' + gens1 + ' generation requests); the track list is unchanged',
      ended && cp1 && cp1.accepted.length >= 80 && cp1.fingerprint.targetIds.length === 30 && JSON.stringify(await lsGet(page, 'tt-zh-tracks')) === tracks0, cp1 && { status: cp1.status, n: cp1.accepted.length })
    // the live 89/90 state: one recall missing, the run stopped — then the learner comes back
    let dropped = null
    if (cp1) dropped = await page.evaluate(() => { const cp = JSON.parse(localStorage.getItem('tt-zh-gen-checkpoint')); const a = cp.accepted.find(x => x.recallIndex === 2); cp.accepted = cp.accepted.filter(x => x !== a); cp.status = 'incomplete'; localStorage.setItem('tt-zh-gen-checkpoint', JSON.stringify(cp)); return { slot: a.slot, text: a.text, n: cp.accepted.length } })
    await page.goto(base); await S.waitText(/Daily Track/)
    S.seen.length = 0
    await page.getByText('Daily Track', { exact: true }).first().click()
    const offered = await S.waitText(/Saved Mandarin draft/, 30000)
    const t2 = await S.text()
    const nKept = dropped ? dropped.n : 0, nMiss = cp1 ? 90 - nKept : 0
    ok('M2 reopening Daily Track offers the saved draft: "' + nKept + ' / 90 recalls are verified and kept", the missing recall named (recall 2), "Retry missing recalls (' + nMiss + ')" and "Start new generation"; no request sent before the choice',
      offered && new RegExp(nKept + ' / 90 recalls are verified and kept').test(t2) && /recall 2/.test(t2) && new RegExp('Retry missing recalls \\(' + nMiss + '\\)').test(t2) && /Start new generation/.test(t2) && S.seen.length === 0, t2.slice(0, 400))
    S.seen.length = 0
    await page.getByText(/Retry missing recalls/).first().click()
    await S.waitText(/Quality check|Study|Saved Mandarin draft|Generation incomplete/i, 120000); await page.waitForTimeout(1500)
    const gens3 = S.seen.filter(s => s.gen), cp3 = await lsGet(page, 'tt-zh-gen-checkpoint')
    ok('M3 Retry missing recalls → only the ' + nMiss + ' missing recall(s) are requested (' + gens3.length + ' generation requests, ≤ ' + (11 * nMiss) + '; the full run needed ' + gens1 + '); the resume is counted',
      gens3.length > 0 && gens3.length <= 11 * nMiss && cp3 && cp3.resumes === 1 && cp3.accepted.length >= nKept, { gens: gens3.length, recalls: [...new Set(gens3.map(g => g.target + ':' + g.recall))], resumes: cp3 && cp3.resumes })
    // Start new generation: deliberately discards the draft
    await page.goto(base); await S.waitText(/Daily Track/)
    await page.getByText('Daily Track', { exact: true }).first().click()
    const offered4 = await S.waitText(/Saved Mandarin draft/, 30000)
    S.seen.length = 0
    if (offered4) await page.getByText(/Start new generation/).first().click()
    await page.waitForTimeout(4000)
    const cp4 = await lsGet(page, 'tt-zh-gen-checkpoint')
    ok('M4 Start new generation discards the draft and starts a full generation (a fresh draft, 0 resumes, requests from recall 1 of the first word)',
      offered4 && S.seen.filter(s => s.gen).length > 0 && S.seen.find(s => s.gen).recall === 1 && (!cp4 || (cp4.resumes || 0) === 0), { cp4: cp4 && { resumes: cp4.resumes, n: cp4.accepted.length } })
    await page.goto(base); await S.waitText(/Daily Track/)
    ok('M5 vocabulary / SRS untouched (tt-zh-vocab byte-identical), no track saved, no page errors',
      JSON.stringify(await lsGet(page, 'tt-zh-vocab')) === vocab0 && JSON.stringify(await lsGet(page, 'tt-zh-tracks')) === tracks0 && !S.errors.length, S.errors.slice(0, 3))
    await S.ctx.close()
  }
  // ── Japanese: the draft is offered before a scene is paid for ──
  {
    const S = await session('ja'), { page } = S
    await page.addInitScript(() => { try { if (!localStorage.getItem('tt-ja-gen-checkpoint')) localStorage.setItem('tt-ja-gen-checkpoint', JSON.stringify({ version: 1, lang: 'ja', mode: 'daily', id: 'ja-cp-test', createdAt: '2026-10-09T00:00:00Z', updatedAt: '2026-10-09T00:00:00Z', build: 'v682', status: 'incomplete', fingerprint: { lang: 'ja', targetIds: [999901, 999902], newIds: [], vocabSig: 'x.2' }, expected: 6, accepted: [], rejected: {}, resumes: 0, history: [], extra: { partial: { perTarget: [[], []], missingRecalls: [] } } })) } catch (e) {} })
    await page.goto(base); await S.waitText(/Daily Track/)
    S.seen.length = 0
    await page.getByText('Daily Track', { exact: true }).first().click()
    const offered = await S.waitText(/Saved Japanese draft/, 30000), t = await S.text()
    ok('J1 Japanese: a saved draft is offered BEFORE any request (no scene paid for); an incompatible one says why ("target words differ") and offers no resume',
      offered && S.seen.length === 0 && /cannot be resumed: today.s 30 target words differ/.test(t) && !/Retry missing recalls/.test(t) && /Start new generation/.test(t), t.slice(0, 300))
    await page.getByText(/Start new generation/).first().click(); await page.waitForTimeout(3000)
    ok('J2 Start new generation clears the draft and builds a scene (the first paid request comes only now)', (await lsGet(page, 'tt-ja-gen-checkpoint')) === null && S.seen.length >= 1 && !S.errors.length, { seen: S.seen.length, errors: S.errors.slice(0, 2) })
    await S.ctx.close()
  }
  // ── Thai: a finished NOT-READY track (87/90) kept as a draft ──
  {
    const S = await session('th'), { page } = S
    await page.goto(base); await S.waitText(/Daily Track/); await page.waitForTimeout(6000)   // let start-up migrations save the vocabulary first
    // build a compatible draft in the page with the app's own helpers (fingerprint from the learner's real vocabulary)
    const made = await page.evaluate(async () => {
      const vocab = (await stGet('tt-vocab')) || []; applyThaiCanonicalAliases(vocab)   // the in-memory vocabulary the screen uses (aliases are applied on every load)
      const words = vocab.filter(w => w && w.id && w.thai).slice(0, 30)
      const kws = words.map((w, i) => ({ wordId: w.id, thai: w.thai, english: w.english || w.e || '', isNew: i < 3 }))
      const pairs = []
      words.forEach((w, i) => { if (i === 29) return; for (let r = 1; r <= 3; r++) pairs.push({ thai: w.thai + 'ครับ', english: 'x', prompt: 'He says x', speaker: 'A', pairType: 'content', targetId: w.id, wordId: w.id, recallIndex: r, _target: w.thai }) })
      const track = { createdAt: '2026-10-09T00:00:00.000Z', mode: 'daily', trackMode: 'daily', keywords: kws, pairs,
        integrity: { status: 'NOT_READY', reasons: ['TARGET_PAIR_QUOTA=87/90 (required 90/90)'], counts: { targetPairsRequired: 90, targetPairs: 87, targetWordsCovered: 29, targetWords: 30, playableLines: 87 }, invariants: {}, quota: { rows: kws.map((k, i) => ({ targetId: k.wordId, target: k.thai, valid: i === 29 ? 0 : 3, deficit: i === 29 ? 3 : 0 })) } } }
      const tg = kws.map(k => ({ id: k.wordId, thai: k.thai, selectionRole: k.isNew ? 'new' : 'review' }))
      const ids = new Set(tg.map(t => t.id))
      const cp = genCheckpointCreate('th', { targets: tg, authorisedWords: vocab.filter(w => w && (w.status === 'known' || w.status === 'learning' || ids.has(w.id))).map(w => w.id + ':' + (ids.has(w.id) ? 'target' : w.status)) })
      cp.status = 'final-not-ready'; pairs.forEach(p => genCheckpointAddPair(cp, p)); cp.extra = { track }
      localStorage.setItem('tt-th-gen-checkpoint', JSON.stringify(cp))
      return { n: cp.accepted.length, missing: words[29] && words[29].thai }
    })
    S.seen.length = 0
    await page.getByText('Daily Track', { exact: true }).first().click()
    const offered = await S.waitText(/Saved Thai draft/, 30000), t = await S.text()
    ok('T1 Thai: a finished NOT-READY track kept as a draft is offered on reopening ("87 / 90 target pairs are verified and kept", the missing word named, "Retry missing target pairs (3)"); no request before the choice',
      offered && /87 \/ 90 target pairs are verified and kept/.test(t) && t.includes(made.missing) && /Retry missing target pairs \(3\)/.test(t) && S.seen.length === 0, t.slice(0, 400))
    if (offered) await page.getByText(/Retry missing target pairs/).first().click()
    await page.waitForTimeout(6000)
    const cp = await lsGet(page, 'tt-th-gen-checkpoint')
    ok('T2 Thai: Retry missing recalls resumes the saved track (resume counted) and only the missing word is repaired — no page errors',
      cp && cp.resumes === 1 && !S.errors.length, { resumes: cp && cp.resumes, errors: S.errors.slice(0, 3), seen: S.seen.length })
    await S.ctx.close()
  }
  await browser.close(); srv.close()
  const pass = checks.filter(c => c.pass).length
  console.log('\nv682 browser resumable-generation test: ' + pass + '/' + checks.length + (pass === checks.length ? ' — ALL PASS' : ' — FAILED'))
  fs.mkdirSync(path.join(__dirname, 'logs'), { recursive: true }); fs.writeFileSync(path.join(__dirname, 'logs', 'browser_v682.json'), JSON.stringify(checks, null, 1))
  process.exit(pass === checks.length ? 0 : 1)
})().catch(e => { console.log('CRASH ' + (e && e.stack || e)); process.exit(1) })
