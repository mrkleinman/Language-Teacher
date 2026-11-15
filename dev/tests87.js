// 15 Nov — Japanese register: the meal blessing いただきます (and the other fixed polite expressions) are not "keigo" in a casual / natural track.
// Found in the owner's 15 Nov Japanese log: 3 of 3 recalls of いただきます were refused "register: keigo in a Natural sentence" on every attempt (11 paid checks) and the track
// ended 87/90. Real application function; no model.
const { load } = require('./harness')
const c = load(process.env.TT_FILE || 'tt.compiled.js'); c.console.info = () => {}; c.console.warn = () => {}
let n = 0, fails = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; console.log((pass ? 'PASS ' : 'FAIL ') + id + '  ' + name + (!pass && detail !== undefined ? '\n      ' + JSON.stringify(detail) : '')) }
const fit = (jp, reg) => c.ev('jaValidateRegisterFit')({ japanese: jp }, reg, { allContent: [] }, {})
const regs = ['casual', 'natural']
for (const r of regs) {
  for (const jp of ['いただきます。', 'うん、いただきます。', 'いただきますって言ってから食べよう。', 'ご飯来た、いただきます。', 'ごちそうさま。', 'ごちそうさまでした。', 'ありがとうございます。'])
    T('R1-' + r, r + ': the fixed expression passes the register check — ' + jp, fit(jp, r).ok, fit(jp, r).problems)
  for (const jp of ['これ、いただけます？', '社長がおっしゃいました。', 'そちらにございます。', 'お客様、いただきます、でございます。'])
    T('R2-' + r, r + ': other keigo is still refused — ' + jp, !fit(jp, r).ok && fit(jp, r).problems.some(p => /keigo/.test(p)), fit(jp, r).problems)
}
console.log((fails ? 'FAIL ' : 'ALL PASS ') + (n - fails) + '/' + n)
process.exit(fails ? 1 : 0)
