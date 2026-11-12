// 12 Nov — Japanese romaji after the 3,000-word list. Two real regressions the bigger dictionary caused (found by tests51 / tests53), now covered here:
//  1. a listed word that carries its particle (一緒に "issho ni", お大事に "odaiji ni") was read as ONE glued word ("isshoni"): the list's own romaji spacing is the authority
//  2. the kana spellings にし (西) and よっか (四日) swallowed "に + し…" in どれにしよっか / 電車にしようか and gave "dore nishi yokka" / "densha nishi youka"
const { load } = require('./harness')
const c = load(process.env.TT_FILE || 'tt.compiled.js')
let n = 0, fails = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; console.log((pass ? 'PASS ' : 'FAIL ') + id + '  ' + name + (!pass && detail !== undefined ? '  ' + JSON.stringify(detail) : '')) }
const bank = c.ev('RAW_JAPANESE_VOCAB')
const ro = t => { const r = c.jaDeterministicReading(t, bank); return c.jaFinalRomaji({ japanese: t, reading: r.segs.map(s => s.reading == null ? s.surface : s.reading).join(''), romaji: '' }, bank, null).romaji }
T('R1', '一緒に keeps the list\'s spacing: "issho ni" (not "isshoni")', ro('また一緒に食べる？') === 'mata issho ni taberu?' && ro('ごめん、昼は一緒に食べられない。') === 'gomen, hiru wa issho ni taberarenai.', [ro('また一緒に食べる？'), ro('ごめん、昼は一緒に食べられない。')])
T('R2', 'お大事に keeps its spacing too', /odaiji ni/.test(ro('お大事に。')), ro('お大事に。'))
T('R3', 'どれにしよっか？ / 電車にしようか。 / これにして。 → "ni" stays a particle', ro('どれにしよっか？') === 'dore ni shiyokka?' && ro('じゃあ、電車にしようか。') === 'jaa, densha ni shiyou ka.' && ro('これにして。') === 'kore ni shite.', [ro('どれにしよっか？'), ro('じゃあ、電車にしようか。'), ro('これにして。')])
T('R4', 'ordinary kana spellings still parse as words (すき / いく)', ro('これ、すきだよ。') === 'kore, suki da yo.' && /iku/.test(ro('いくよ。')), [ro('これ、すきだよ。'), ro('いくよ。')])
console.log(fails ? 'FAILED ' + fails + '/' + n : 'ALL PASS ' + n + '/' + n); process.exit(fails ? 1 : 0)
