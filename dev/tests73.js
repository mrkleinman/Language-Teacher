// 11 Nov — ONE "what this track will teach" screen for every language, and the dashboards follow the Thai layout.
// Owner request: Japanese's Scene Ready screen is the model for all languages; Japanese and Mandarin lose "Next targets";
// Japanese keeps its speech-style selector; Mandarin loses the register badge and the "Learn New Words" button.
// Real app code, rendered with react-test-renderer (same harness as tests24).
const { setup, mock } = require('./tests14')
const { load } = require('./harness')
const fs = require('fs')
const React = require('react'), TR = require('react-test-renderer')
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const FILE = process.env.TT_FILE || 'tt.compiled.js'
const SRC = fs.readFileSync('tt.jsx', 'utf8')   // JSX source: the compiled file has no JSX to match
let n = 0, fails = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; console.log((pass ? 'PASS ' : 'FAIL ') + id + '  ' + name + (!pass && detail !== undefined ? '\n      ' + JSON.stringify(detail).slice(0, 400) : '')) }
const textOf = x => x == null ? '' : typeof x === 'string' ? x : Array.isArray(x) ? x.map(textOf).join(' ') : textOf(x.children)
const flush = async (k = 160) => { for (let i = 0; i < k; i++) await new Promise(r => setImmediate(r)) }
const KEY = 'AIzaSyTEST-harness-key-000000'
const txt = r => textOf(r.toJSON()).replace(/\s+/g, ' ')
async function open(lang) {
  const c = load(FILE, { React }); c.console.info = () => {}
  const S = setup(lang); S.c = c
  const key = lang === 'ja' ? c.ev('JA.vocab') : lang === 'zh' ? c.ev('ZH.vocab') : 'tt-vocab'
  c.localStorage.setItem(key, JSON.stringify(S.vocab))
  c.localStorage.setItem('tt-gemini-key', JSON.stringify(KEY))
  mock(S, lang, {})
  const Teacher = lang === 'ja' ? c.JapaneseTeacher : lang === 'zh' ? c.MandarinTeacher : c.ThaiTeacher
  let r
  await TR.act(async () => { r = TR.create(React.createElement(Teacher, { lang, onSetLang: () => {} })); await flush(60) })
  return { r, c }
}
;(async () => {
  // ── dashboards ──
  {
    const { r: zh } = await open('zh'); const z = txt(zh)
    T('U1', 'Mandarin dashboard: no Next targets, no register badge, no Learn New Words button',
      !/Next targets/.test(z) && !/very casual/i.test(z) && !/Learn New Words/.test(z), z.slice(0, 300))
    T('U2', 'Mandarin dashboard Daily button uses the Thai/Japanese line ("~45 min · N due")', /~45 min · \d+ due/.test(z), z.slice(0, 400))
    T('U3', 'Mandarin dashboard no longer carries the generator switch (it lives on the Ready screen, like Thai and Japanese)', !/Use the new generator/.test(z))
    await TR.act(async () => { zh.unmount() })
    const { r: ja } = await open('ja'); const j = txt(ja)
    T('U4', 'Japanese dashboard: no Next targets; the speech-style selector is kept', !/Next targets/.test(j) && /Speech|style|Style/.test(j), j.slice(0, 300))
    await TR.act(async () => { ja.unmount() })
    // ── stat tiles open the word list, like the Thai dashboard ──
    for (const L of ['zh', 'ja']) {
      const { r } = await open(L)
      const tile = r.root.findAll(x => typeof x.type === 'string' && x.props && typeof x.props.onClick === 'function' && /^\s*\d+\s+Learning\s*$/.test(textOf(x.children)))[0]
      let ok = !!tile
      if (tile) { await TR.act(async () => { tile.props.onClick(); await flush(20) }); const t = txt(r); ok = /\d+ words?/.test(t) && /LEARNING/.test(t) && !/Daily Track/.test(t) }
      T('U10' + L, L.toUpperCase() + ' dashboard: tapping a stat tile opens the filtered word list (as on Thai)', ok, { found: !!tile, text: txt(r).replace(/@import[^;]*;/, '').slice(-300) })
      await TR.act(async () => { r.unmount() })
    }
    // ── Mandarin Ready screen (was: generation started the moment Daily Track was tapped) ──
    const { r: z2 } = await open('zh')
    const daily = z2.root.findAll(x => x.type === 'button').find(b => /Daily Track/.test(textOf(b.children)))
    await TR.act(async () => { daily.props.onClick(); await flush(60) })
    const t = txt(z2)
    T('U5', 'Mandarin: Daily Track opens a Scene Ready screen first (nothing generated yet)', /Scene Ready/.test(t) && !/Generating Mandarin track/.test(t), t.slice(0, 300))
    T('U6', 'Mandarin Ready screen has the same parts as Japanese: summary, characters block when the scene step returns one, opening/closing lines, TARGETING counts, content words available, Conversation basics, Generate, generator switch, Try a different scene, Back',
      /TARGETING \d+ WORD/.test(t) && /content words available/.test(t) && /Conversation basics/.test(t) && /Opening/.test(t) && /Closing/.test(t) &&
      /Generate Track from this Scene/.test(t) && /Use the new generator \(test\)/.test(t) && /Try a different scene/.test(t) && /Back/.test(t), t.slice(0, 500))
    const gen = z2.root.findAll(x => x.type === 'button').find(b => /Generate Track from this Scene/.test(textOf(b.children)))
    await TR.act(async () => { gen.props.onClick(); await flush(20) })
    // the simulated model leaves a few recalls missing, so the run ends on the draft screen — what matters is that generation ran
    T('U7', 'Mandarin: pressing Generate starts generation', !/Scene Ready/.test(txt(z2)) && /recall/i.test(txt(z2)), txt(z2).replace(/@import[^;]*;/, '').slice(-400))
    await TR.act(async () => { z2.unmount() })
  }
  // ── Thai Scene Ready: source checks (the Thai scene step needs a live scene request to render) ──
  {
    const i = SRC.indexOf('phase === \'scene_preview\'')
    const thai = SRC.slice(SRC.indexOf('✅ Scene Ready'), SRC.indexOf('Try a different scene') + 400)
    T('U8', 'Thai Scene Ready shows the shared targets block (counts line, available words, chips, Conversation basics) and a Back button',
      /GenTargetPreview/.test(thai) && /availableCount/.test(thai) && /basics=/.test(thai) && /onClick=\{onBack\}/.test(thai))
    T('U9', 'the same block is used by Mandarin (shared component)', (SRC.match(/<GenTargetPreview /g) || []).length >= 2)
  }
  console.log('\nU: ' + (n - fails) + '/' + n + (fails ? ' — FAILURES' : ' — ALL PASS'))
  process.exit(fails ? 1 : 0)
})().catch(e => { console.log('CRASH', e); process.exit(2) })
