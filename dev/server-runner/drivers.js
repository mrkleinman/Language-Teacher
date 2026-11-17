// How each language's screens are driven. A driver is { waitHome(ctx), instrument(ctx), run(ctx) }:
//   waitHome   the language's dashboard is on screen (the app has loaded, compiled and read its saved data)
//   instrument wraps the page's own generator function so its progress and log callbacks are copied out; the wrapper passes every argument and the result straight
//              through, so the app runs exactly the code the screen runs
//   run        clicks through the screens a user would, waits until the app has SAVED the track, and returns { notes }; throws via ctx.fail(reason) when the app's own
//              failure screen shows (the page's reason is passed on)
// ctx = { page, spec, log, progress, guard, fail, seedTrackIds, trackId, deepEqual }
'use strict'
const { LANGUAGE_KEYS } = require('./jobspec')

// wrap a global generator function so its (onProgress(done, total, meta), onLog(line)) callbacks are mirrored into window.__ltRunner
function wrapScript() {
  return table => {
    const R = window.__ltRunner = window.__ltRunner || { lines: [], done: 0, total: 0 }
    const out = {}
    table.forEach(([name, pi, li]) => {
      let f; try { f = window[name] } catch (e) {}
      if (typeof f !== 'function') { out[name] = 'missing'; return }
      if (f.__ltWrapped) { out[name] = 'already'; return }
      const w = function () {
        const args = Array.prototype.slice.call(arguments)
        if (typeof args[pi] === 'function') { const o = args[pi]; args[pi] = function (d, t) { try { if (Number.isFinite(d)) R.done = d; if (Number.isFinite(t)) R.total = t } catch (e) {} return o.apply(this, arguments) } }
        if (typeof args[li] === 'function') { const o = args[li]; args[li] = function (m) { try { R.lines.push(String(m).slice(0, 300)); if (R.lines.length > 600) R.lines.splice(0, R.lines.length - 600) } catch (e) {} return o.apply(this, arguments) } }
        return f.apply(this, args)
      }
      w.__ltWrapped = true
      try { window[name] = w; out[name] = 'wrapped' } catch (e) { out[name] = 'not writable' }
    })
    return out
  }
}
async function instrumentWith(ctx, table) {
  const r = await ctx.page.evaluate(wrapScript(), table)
  ctx.log('instrumented: ' + Object.entries(r).map(([k, v]) => k + '=' + v).join(', '))
  return r
}

// resolves with the first of the named outcomes to happen in the page; each probe is a function source evaluated in the page returning truthy
async function firstOf(ctx, probes, timeout) {
  const names = Object.keys(probes)
  const h = await ctx.page.waitForFunction(src => {
    for (const [n, body] of Object.entries(src)) { try { if ((new Function('return (' + body + ')()'))()) return n } catch (e) {} }
    return null
  }, Object.fromEntries(names.map(n => [n, String(probes[n])])), { timeout: timeout || 120000, polling: 250 })
  return h.jsonValue()
}

// wait until the app has saved a track the job did not start with, then let the follow-up saves (daily slots, vocabulary) settle
async function waitForSavedTrack(ctx, timeout) {
  const K = LANGUAGE_KEYS[ctx.spec.language]
  const ids = [...ctx.seedTrackIds].map(String)
  await ctx.page.waitForFunction(({ key, ids }) => {
    let a = null; try { a = JSON.parse(localStorage.getItem(key)) } catch (e) {}
    if (!Array.isArray(a)) return false
    const id = t => String(t && (t.id != null ? t.id : (t.createdAt || ((t.date || '') + ':' + ((t.pairs && t.pairs.length) || 0)))))
    return a.some(t => !ids.includes(id(t)))
  }, { key: K.tracks, ids }, { timeout: timeout || 30000, polling: 250 })
  if (ctx.spec.mode === 'daily') {
    await ctx.page.waitForFunction(k => { try { const v = JSON.parse(localStorage.getItem(k)); return !!(v && Array.isArray(v.wordIds)) } catch (e) { return false } }, K.dailyNew, { timeout: 8000, polling: 250 }).catch(() => {})
  }
  await ctx.page.waitForTimeout(800)
}

const bodyText = async ctx => (await ctx.page.evaluate(() => document.body.innerText).catch(() => '')) || ''
const clip = (t, n) => String(t || '').replace(/\s+/g, ' ').trim().slice(0, n || 300)

// ── Cantonese ───────────────────────────────────────────────────────────────────────────────────────────────
// Dashboard -> Daily Track / Revision Track -> "Build the track" (modules, no model) -> the quality review (one model request, automatic) -> "Study track", which hands
// the track to the screen's save (tracks list, daily-new slots, vocabulary). This is the screen's own click path; nothing is called around it.
const yue = {
  async waitHome(ctx) { await ctx.page.getByRole('button', { name: /Daily Track/ }).first().waitFor({ timeout: 180000 }) },
  instrument: ctx => instrumentWith(ctx, [['generateCantoneseTrack', 2, 3]]),
  async run(ctx) {
    const { page, spec } = ctx
    const notes = []
    ctx.progress({ phase: 'opening the ' + spec.mode + ' track screen' })
    const btn = page.getByRole('button', { name: spec.mode === 'revision' ? /Revision Track/ : /Daily Track/ }).first()
    if (!(await btn.isEnabled())) {
      const t = await bodyText(ctx)
      const why = /wait for a lesson you can read|swapped for ones/.test(t) ? 'no Cantonese lesson can be written for the words due yet (the screen lists them as waiting for a lesson)' : spec.mode === 'revision' ? 'there are no learned Cantonese words to revise yet' : 'there are no Cantonese targets for a Daily track'
      ctx.fail('the app does not offer a ' + spec.mode + ' track: ' + why, 'app_refused')
    }
    await btn.click()
    const first = await firstOf(ctx, { build: () => /Build the track/.test(document.body.innerText) && !document.querySelector('[data-yue-error]'), error: () => !!document.querySelector('[data-yue-error]') }, 60000)
    if (first === 'error') ctx.fail('the app refused to start the track: ' + clip(await page.locator('[data-yue-error]').first().innerText(), 300), 'app_refused')
    ctx.progress({ phase: 'building the track' })
    await page.getByRole('button', { name: /Build the track/ }).click()
    const built = await firstOf(ctx, {
      done: () => !!document.querySelector('[data-yue-check]'),
      error: () => !!document.querySelector('[data-yue-error]'),
    }, 120000)
    if (built === 'error') ctx.fail('the app could not build the track: ' + clip(await page.locator('[data-yue-error]').first().innerText(), 400), 'app_failed')
    if (await page.locator('[data-yue-check="bad"]').count()) notes.push('the structure check reported problems: ' + clip(await page.locator('[data-yue-check="bad"]').first().innerText(), 200))
    ctx.progress({ phase: 'quality review' })
    await firstOf(ctx, { review: () => {
      const t = document.body.innerText
      if (/Quality review in progress/.test(t)) return false
      return /Quality review: |Quality review could not be completed|Quality review not run|Quality review cancelled/.test(t)
    } }, 5 * 60 * 1000)
    const reviewLine = clip(((await bodyText(ctx)).match(/Quality review[^\n]*/) || [''])[0], 200)
    if (/could not be completed|not run|cancelled/.test(reviewLine)) notes.push(reviewLine)
    ctx.progress({ phase: 'saving the track' })
    const study = page.getByRole('button', { name: /Study (track|anyway)/ }).first()
    await study.waitFor({ timeout: 30000 })
    for (let i = 0; i < 60 && !(await study.isEnabled()); i++) await page.waitForTimeout(250)
    await study.click()
    await waitForSavedTrack(ctx, 30000)
    return { notes }
  },
}

// Thai, Japanese, Mandarin: see the notes in README.md ("Languages"); added as they are verified.
const unsupported = lang => ({
  async waitHome() { const e = new Error('the ' + lang + ' flow is not driven yet'); e.code = 'unsupported'; throw e },
  instrument: async () => {}, run: async () => { throw new Error('unsupported') },
})

module.exports = { yue, th: unsupported('Thai'), ja: unsupported('Japanese'), zh: unsupported('Mandarin'), instrumentWith, firstOf, waitForSavedTrack }
