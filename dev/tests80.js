// 12 Nov — a Thai track whose generation wrote NO line must stop with a clear message (owner's Wedding Speech run showed
// "0 lines generated", 100%, then a paid recovery request for each of the 30 targets).
// Source-level guard: the Generator cannot be driven end to end without a network, so this checks the real code path.
const fs = require('fs')
const SRC = fs.readFileSync('tt.jsx', 'utf8')
let n = 0, fails = 0
const T = (id, name, pass) => { n++; if (!pass) fails++; console.log((pass ? 'PASS ' : 'FAIL ') + id + '  ' + name) }
const gen = SRC.slice(SRC.indexOf('function Generator({ vocab, mode'), SRC.indexOf('function Generator({ vocab, mode') + 120000)
const iGuard = gen.indexOf('NO_LINES_GENERATED'), iKeywords = gen.indexOf('const allTargets = resumeDraft')
T('N1', 'an empty result stops with NO_LINES_GENERATED and the error phase', iGuard > 0 && /if \(!pairs \|\| !pairs\.length\) \{[\s\S]{0,700}setPhase\('error'\)[\s\S]{0,900}NO_LINES_GENERATED/.test(gen))
T('N2', 'the guard runs BEFORE the track is built and before the auto quality check', iGuard > 0 && iGuard < iKeywords && iKeywords < gen.indexOf('Auto quality check starting'))
T('N3', 'it reports the last failed requests of this run from the AI ledger', /AI_LEDGER\.filter\(r => r && r\.runId === aiRunRef\.current && !r\.ok\)/.test(gen))
T('N4', 'a resumed draft that already has lines is not affected (merged before the guard)', gen.indexOf('pairs = [...resumeDraft.pairs') > 0 && gen.indexOf('pairs = [...resumeDraft.pairs') < iGuard)
console.log(fails ? 'FAILED ' + fails + '/' + n : 'ALL PASS ' + n + '/' + n); process.exit(fails ? 1 : 0)
