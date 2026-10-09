// Real React SSR of the shared Listening renderer (ConvoPlayer), v638 vs v639.
const { load } = require('./harness'), React = require('react'), RDS = require('react-dom/server')
const LINES = {
  ja: [{ speaker: 'A', gender: 'male', japanese: '今日、何を食べる？', reading: 'きょう、なにをたべる？', romaji: 'kyou, nani wo taberu?', english: 'What are you eating today?' },
       { speaker: 'B', gender: 'female', japanese: 'ご飯を食べる。', reading: 'ごはんをたべる。', romaji: 'gohan wo taberu.', english: 'I will eat rice.' }],
  zh: [{ speaker: 'A', gender: 'male', chinese: '你吃什么？', pinyin: 'nǐ chī shénme?', english: 'What are you eating?' },
       { speaker: 'B', gender: 'female', chinese: '我吃饭。', pinyin: 'wǒ chī fàn.', english: 'I am eating rice.' }],
  th: [{ speaker: 'A', gender: 'male', thai: 'ผมอยากลองอาหารใส่__น้ำปลา__ครับ', phonetic: 'phǒm yàak lawng aa-hǎan sài náam-bplaa khráp', english: 'I want to try food with fish sauce.' },
       { speaker: 'B', gender: 'female', thai: 'อร่อยมากค่ะ', phonetic: 'à-ròi mâak khâ', english: 'Very tasty.' }],
}
function render(file, lang) {
  const c = load(file, { React })
  const props = { lines: LINES[lang], speed: 0.8, onSpeedChange() {}, onSkip() {}, onDone() {}, lang, title: 'T', coverageLabel: lang === 'th' ? '1/30 targets covered' : undefined }
  const html = RDS.renderToStaticMarkup(React.createElement(c.ConvoPlayer, props))
  const text = [...html.matchAll(/<p class="thai"[^>]*>([^<]*)<\/p>/g)].map(m => m[1])
  const phon = [...html.matchAll(/<p class="phon"[^>]*>([^<]*)<\/p>/g)].map(m => m[1])
  const icons = [...html.matchAll(/(👨|👩)/g)].map(m => m[1])
  const header = (html.match(/(\d+ lines[^<]*)<\/div>/) || [])[1]
  const tts = LINES[lang].map(l => c.ttsTextForPair(l))
  return { text, phon, icons, header, tts, gcpInputV638: LINES[lang].map(l => l.thai) }
}
let fails = 0
for (const lang of ['ja', 'zh', 'th']) {
  const b = render('tt.orig.compiled.js', lang), a = render('tt.compiled.js', lang)
  console.log('\n' + lang.toUpperCase())
  console.log('  v638 shows:', JSON.stringify(b.text), 'icons', b.icons.join(''), '| header:', b.header, '| Google TTS input:', JSON.stringify(b.gcpInputV638))
  console.log('  v639 shows:', JSON.stringify(a.text), 'icons', a.icons.join(''), '| header:', a.header, '| TTS input:', JSON.stringify(a.tts))
  const exp = { ja: { text: ['今日、何を食べる？', 'ご飯を食べる。'], tts: ['きょう、なにをたべる？', 'ごはんをたべる。'], phon: ['きょう、なにをたべる？', 'ごはんをたべる。'] },
                zh: { text: ['你吃什么？', '我吃饭。'], tts: ['你吃什么？', '我吃饭。'], phon: ['nǐ chī shénme?', 'wǒ chī fàn.'] },
                th: { text: ['ผมอยากลองอาหารใส่น้ำปลาครับ', 'อร่อยมากค่ะ'], tts: ['ผมอยากลองอาหารใส่น้ำปลาครับ', 'อร่อยมากค่ะ'] } }[lang]
  const ok = JSON.stringify(a.text) === JSON.stringify(exp.text) && JSON.stringify(a.tts) === JSON.stringify(exp.tts) &&
             a.icons.join('') === '👨👩' && (!exp.phon || JSON.stringify(a.phon) === JSON.stringify(exp.phon)) &&
             (lang === 'th' ? /1\/30 targets covered/.test(a.header) : !/covered/.test(a.header))
  if (!ok) fails++
  console.log('  ' + (ok ? 'PASS' : 'FAIL') + ' own-script text, phonetic/reading, speaker icons, TTS text, header')
}
console.log('\n' + (fails ? fails + ' FAILED' : 'all renderer checks pass'))
