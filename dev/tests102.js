// 18 Nov — the Cantonese cloud voice (owner: "sounds very robotic"). Cantonese asks for the Chirp 3 HD voices Thai already uses (Charon for the man A, Aoede for the woman B) and, because
// Chirp 3 HD for Hong Kong Cantonese is a Preview, repeats the request ONCE with the Standard voice when Google answers without audio. Thai, Japanese and Mandarin keep their one voice.
// Real application code (ttsSynthesize, TTS_VOICES); the only stand-in is Google's answer (fetch).
const { load } = require('./harness')
const FILE = process.env.TT_FILE || 'tt.compiled.js'
let n = 0, fails = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; console.log((pass ? 'PASS ' : 'FAIL ') + id + '  ' + name + (!pass && detail !== undefined ? '\n      ' + JSON.stringify(detail).slice(0, 300) : '')) }
;(async () => {
  const V = load(FILE).ev('TTS_VOICES')
  T('V1', 'Cantonese is asked for the Chirp 3 HD voices (Charon man, Aoede woman), languageCode yue-HK, with the Standard voices only as the fallback', V.yue.languageCode === 'yue-HK' && V.yue.male === 'yue-HK-Chirp3-HD-Charon' && V.yue.female === 'yue-HK-Chirp3-HD-Aoede' && V.yue.fallbackMale === 'yue-HK-Standard-B' && V.yue.fallbackFemale === 'yue-HK-Standard-A', V.yue)
  T('V2', 'Thai, Japanese and Mandarin are unchanged and have no fallback voice', V.th.male === 'th-TH-Chirp3-HD-Charon' && V.th.female === 'th-TH-Chirp3-HD-Aoede' && V.ja.male === 'ja-JP-Neural2-C' && V.zh.male === 'cmn-CN-Wavenet-C' && !V.th.fallbackMale && !V.ja.fallbackMale && !V.zh.fallbackMale)
  const run = async (answers, lang, male) => {
    const c = load(FILE); c.console.info = () => {}
    c.ev('globalThis.__reqs = []; globalThis.__ans = ' + JSON.stringify(answers) + '; globalThis.fetch = async (url, o) => { const b = JSON.parse(o.body); globalThis.__reqs.push({ url, voice: b.voice, text: b.input.text, rate: b.audioConfig.speakingRate }); const a = globalThis.__ans[Math.min(globalThis.__reqs.length - 1, globalThis.__ans.length - 1)]; return { json: async () => a } }')
    const d = await c.ev('ttsSynthesize')('KEY', '你好', lang, male, 0.9)
    return { d, reqs: c.ev('globalThis.__reqs') }
  }
  { const r = await run([{ audioContent: 'AAA' }], 'yue', true)
    T('S1', 'when Google answers with audio there is ONE request, with the man\'s Chirp 3 HD voice, the text and the rate', r.reqs.length === 1 && r.reqs[0].voice.name === 'yue-HK-Chirp3-HD-Charon' && r.reqs[0].voice.languageCode === 'yue-HK' && r.reqs[0].text === '你好' && r.reqs[0].rate === 0.9 && r.d.audioContent === 'AAA', r) }
  { const r = await run([{ audioContent: 'AAA' }], 'yue', false)
    T('S2', 'the woman (speaker B) gets Aoede', r.reqs[0].voice.name === 'yue-HK-Chirp3-HD-Aoede', r.reqs) }
  { const r = await run([{ error: { code: 400, message: 'voice not found' } }, { audioContent: 'BBB' }], 'yue', true)
    T('S3', 'when Google refuses the Chirp 3 HD voice the request is repeated once with the Standard voice and its audio is used', r.reqs.length === 2 && r.reqs[1].voice.name === 'yue-HK-Standard-B' && r.d.audioContent === 'BBB', r.reqs) }
  { const r = await run([{ error: { code: 400 } }, { error: { code: 400 } }], 'yue', false)
    T('S4', 'when both voices are refused there is no audio and exactly two requests (no loop)', r.reqs.length === 2 && !(r.d && r.d.audioContent), r) }
  { const r = await run([{ error: { code: 400 } }], 'th', true)
    T('S5', 'Thai has no fallback: one request, its own voice, the refusal is returned', r.reqs.length === 1 && r.reqs[0].voice.name === 'th-TH-Chirp3-HD-Charon' && !(r.d && r.d.audioContent), r) }
  const SRC = require('fs').readFileSync('tt.jsx', 'utf8')
  T('S6', 'the Player\'s cloud path and the Cantonese word screen both go through ttsSynthesize (no direct fetch with a fixed voice left for Cantonese)', (SRC.match(/ttsSynthesize\(gcpTtsKey/g) || []).length >= 2 && !/ttsVoiceFor\('yue', false\)/.test(SRC))
  console.log((fails ? 'FAIL ' : 'ALL PASS ') + (n - fails) + '/' + n)
  process.exit(fails ? 1 : 0)
})()
