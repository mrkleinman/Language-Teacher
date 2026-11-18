// 18 Nov — "track still throttling in minimised Chrome mobile tab". The quiet Web Audio tone (v760) is not counted as playing media by Chrome on a phone, so the tab was still throttled in
// the background. While a track is written the page now also plays a looping, almost silent sound in an <audio> element and shows a "now playing" entry (MediaSession); a tap on that
// entry's pause button cannot stop it; it is let go 20 s after the last request; keepAliveMediaSetEnabled(false) switches it off. Real application code; the stand-ins are the browser's
// Audio, Blob, URL.createObjectURL, MediaMetadata and navigator.mediaSession.
const { load } = require('./harness')
const FILE = process.env.TT_FILE || 'tt.compiled.js'
let n = 0, fails = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; console.log((pass ? 'PASS ' : 'FAIL ') + id + '  ' + name + (!pass && detail !== undefined ? '\n      ' + JSON.stringify(detail).slice(0, 300) : '')) }
function boot() {
  const c = load(FILE); c.console.info = () => {}
  c.ev(`globalThis.__au = []; globalThis.__ms = { metadata: null, playbackState: 'none', handlers: {}, setActionHandler(k, f) { this.handlers[k] = f } }
    globalThis.Audio = function (src) { const a = this; a.src = src; a.loop = false; a.volume = 1; a.paused = true; a.plays = 0; a.play = () => { a.paused = false; a.plays++; return Promise.resolve() }; a.pause = () => { a.paused = true }; a.removeAttribute = () => {}; a.setAttribute = () => {}; globalThis.__au.push(a) }
    globalThis.URL = { createObjectURL: () => 'blob:wav' }; globalThis.MediaMetadata = function (o) { Object.assign(this, o) }
    globalThis.navigator = { userAgent: 'node', mediaSession: globalThis.__ms }`)
  return c
}
;(async () => {
  {
    const c = boot(), hold = c.ev('keepAliveHold'), st = c.ev('keepAliveState')
    const rel = hold()
    const a = c.ev('globalThis.__au')[0], ms = c.ev('globalThis.__ms')
    T('M1', 'holding starts ONE looping <audio> sound that is really playing', c.ev('globalThis.__au').length === 1 && a.loop === true && a.paused === false && a.plays === 1 && st().media === true, { n: c.ev('globalThis.__au').length, loop: a.loop, paused: a.paused })
    T('M2', 'the phone gets a "now playing" entry (title and playing state)', ms.playbackState === 'playing' && /Writing your track/.test(ms.metadata && ms.metadata.title || ''), { state: ms.playbackState, md: ms.metadata })
    const rel2 = hold()
    T('M3', 'a second hold takes no second sound', c.ev('globalThis.__au').length === 1 && st().holds === 2)
    ms.handlers.pause && ms.handlers.pause()
    T('M4', 'a tap on the notification\'s pause button cannot stop the writing: the sound plays again', a.paused === false && a.plays === 2, { paused: a.paused, plays: a.plays })
    rel(); rel2()
    await new Promise(r => setTimeout(r, 10))
    for (let i = 0; i < 5 && st().media; i++) await new Promise(r => setImmediate(r))
    T('M5', 'after the last release (20 s later) the sound is stopped and the entry removed', a.paused === true && ms.playbackState === 'none' && st().media === false, { paused: a.paused, state: ms.playbackState, media: st().media })
  }
  {
    const c = boot(); c.ev('keepAliveMediaSetEnabled')(false)
    const rel = c.ev('keepAliveHold')()
    T('M6', 'with the switch off no sound is made (the old behaviour)', c.ev('globalThis.__au').length === 0 && c.ev('keepAliveState')().media === false); rel()
  }
  {
    const c = load(FILE); c.console.info = () => {}; c.ev('globalThis.Audio = function () { throw new Error("no audio") }; globalThis.navigator = { userAgent: "node" }')
    let threw = false; try { c.ev('keepAliveHold')()() } catch (e) { threw = true }
    T('M7', 'a browser that cannot make the sound simply does without (no error)', !threw)
  }
  {
    // the owner's choice: "allow the generation to play the sound while YouTube is playing" — the phone pauses other apps for an audio element, so the learner picks
    const c = boot(), ls = c.ev('localStorage')
    T('M8', 'the default is "keep it running" (the sound plays)', c.ev('keepAliveModeApply')() === 'media' && c.ev('KA_MEDIA').on === true)
    await c.ev('keepAliveModeSave')('mix')
    T('M9', 'choosing "do not pause my other apps" is saved, switches the sound off and keeps only the quiet tone', c.ev('KA_MEDIA').on === false && JSON.parse(ls.getItem('tt-keep-awake-mode')) === 'mix')
    const rel = c.ev('keepAliveHold')()
    T('M10', 'in that mode a hold makes no audio element (nothing for the phone to give audio focus to), only the web-audio tone path', c.ev('globalThis.__au').length === 0 && c.ev('keepAliveState')().media === false); rel()
    const c2 = boot(); c2.ev('localStorage').setItem('tt-keep-awake-mode', JSON.stringify('mix'))
    T('M11', 'the choice is read again when the app starts (next visit)', c2.ev('keepAliveModeApply')() === 'mix' && c2.ev('KA_MEDIA').on === false)
    await c.ev('keepAliveModeSave')('media')
    T('M12', 'switching back to "keep it running" plays the sound again', c.ev('KA_MEDIA').on === true && (c.ev('keepAliveHold')(), c.ev('globalThis.__au').length === 1))
    T('M13', 'the Settings screen offers both choices (Keep running in the background)', /function KeepRunningCard\(\)/.test(require('fs').readFileSync('tt.jsx', 'utf8')) && /<GenerationModelCard \/>\s*\n\s*<KeepRunningCard \/>/.test(require('fs').readFileSync('tt.jsx', 'utf8')))
  }
  console.log('\n' + (n - fails) + '/' + n + ' passed'); process.exit(fails ? 1 : 0)
})()
