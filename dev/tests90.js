// 16 Nov — Japanese / Mandarin cues are rebuilt FROM THE VERIFIED ENGLISH MEANING (owner: "thanks for calling me, how would I know it's a phone call?").
// Real application functions; the model is a stand-in that answers with fixed cues and counts its calls.
const { load } = require('./harness')
const c = load(process.env.TT_FILE || 'tt.compiled.js'); c.console.info = () => {}; c.console.warn = () => {}
let n = 0, fails = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; console.log((pass ? 'PASS ' : 'FAIL ') + id + '  ' + name + (!pass && detail !== undefined ? '\n      ' + JSON.stringify(detail) : '')) }
const acc = c.ev('jazhCueAccept'), run = c.ev('jazhCuesFromMeaning')
;(async () => {
  T('A1', 'a cue that keeps the words of the meaning is accepted (Thank him for the phone call. for "Thanks for the phone call.")', acc('Thank him for the phone call.', { english: 'Thanks for the phone call.' }, []))
  T('A2', 'a cue that drops the key noun is refused ("Suggest a movie." for "Well then, how about a movie? I like them.")', !acc('Suggest a movie.', { english: 'Well then, how about a movie? I like them.' }, []))
  T('A3', 'names, "they" and a narrated first word are refused', !acc('Ask Kenji which movie he wants.', { english: 'Which movie do you want?' }, ['Kenji']) && !acc('Say whichever way they look at it, this movie looks fun.', { english: 'Whichever way you look at it, this movie looks fun.' }, []) && !acc('Turns down an offer of help, saying it is fine.', { english: "No, I'm fine." }, []))
  T('A4', 'a question line needs an Ask, a statement line is not given a bare Ask', acc('Ask if she is free today.', { english: 'Are you free today?' }, []) && !acc('Say you are free today.', { english: 'Are you free today?' }, []))
  const pairs = [
    { speaker: 'A', japanese: '電話、ありがとう。', english: 'Thanks for the phone call.', prompt: 'Thank him for calling you.', pairType: 'content', targetId: 1 },
    { speaker: 'B', japanese: 'また来る？', english: 'Will you come again?', prompt: 'Ask if she will come again.', pairType: 'content', targetId: 2, _moduleId: 'X' },
    { speaker: 'A', japanese: 'こんにちは。', english: 'Hello.', prompt: 'Greet your friend.', pairType: 'framing' },
    { speaker: 'B', japanese: '今日、暇？', english: 'Are you free today?', prompt: 'Ask Kenji: Are you free today?', pairType: 'content', targetId: 3 } ]
  let calls = 0, sent = ''
  c.mockGeminiGenerate = async (k, m, msgs) => { calls++; sent = msgs[0].content; return JSON.stringify({ cues: [{ i: 1, cue: 'Thank her for the phone call.' }, { i: 2, cue: 'Ask Kenji if he is free today.' }] }) }
  const lg = []
  const r = await run(pairs, 'ja', { apiKey: 'k', model: 'm', names: ['Kenji', 'Mio'], log: x => lg.push(x) })
  T('R1', 'one request carries the lines that need a cue (not the framing line, not the module line) and states the speaker\'s listener (A → her, B → him)', calls === 1 && /Speaker A \(man/.test(sent) && /Speaker B \(woman/.test(sent) && !/Hello\./.test(sent) && !/Will you come again/.test(sent), { calls })
  T('R2', 'the accepted cue replaces the old one and keeps the old one for the record', r.pairs[0]._cueFromMeaning === true && r.pairs[0].prompt === 'Thank her for the phone call.' && r.pairs[0]._cueBefore === 'Thank him for calling you.', r.pairs[0])
  T('R3', 'a returned cue that fails the checks (a name) leaves the earlier cue as it was; module and framing lines are untouched', r.pairs[3].prompt === 'Ask Kenji: Are you free today?' && !r.pairs[3]._cueFromMeaning && r.pairs[1].prompt === pairs[1].prompt && r.pairs[2].prompt === pairs[2].prompt)
  T('R4', 'the log line says how many cues were rebuilt and how many kept', lg.some(x => /CUE_FROM_MEANING \(ja\): 1 of 2 cues rebuilt/.test(x)), lg)
  c.mockGeminiGenerate = async () => { throw new Error('network') }
  const r2 = await run(pairs, 'ja', { apiKey: 'k', model: 'm', names: [], log: () => {} })
  T('R5', 'when the request fails every cue stays as it was (no track is ever lost for this)', r2.pairs.every((p, i) => p.prompt === pairs[i].prompt))
  console.log((fails ? 'FAIL ' : 'ALL PASS ') + (n - fails) + '/' + n)
  process.exit(fails ? 1 : 0)
})()
