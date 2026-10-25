// FREE CHECK before a paid run on the owner's own computer: can this computer reach the Haiku server, and is the access code right?
// It sends one request with a model name the server does not allow. The server checks the access code BEFORE it looks at the
// model (server/google-cloud-anthropic/index.js), so:
//   400 "model not allowed"  = reachable and the code was accepted; nothing is sent to Anthropic, so it costs nothing
//   401                      = wrong or missing access code
// The code comes from LT_ACCESS (set by run-daily-test.ps1 from a hidden prompt) and is never printed or saved.
'use strict'
const SERVER = 'https://language-teacher-anthropic-xhuazatwjq-as.a.run.app'   // the same server as sandbox/live_haiku.js
const code = String(process.env.LT_ACCESS || '').replace(/\s+/g, '')
if (!code) { console.log('CHECK FAILED: no access code was given'); process.exit(2) }
;(async () => {
  let res
  try {
    res = await fetch(SERVER, { method: 'POST', headers: { 'content-type': 'application/json', 'x-lt-access': code },
      body: JSON.stringify({ model: 'access-check', messages: [{ role: 'user', content: 'check' }], max_tokens: 1 }) })
  } catch (e) {
    console.log('CHECK FAILED: this computer cannot reach the server (' + ((e.cause && e.cause.code) || e.message) + ')'); process.exit(3)
  }
  let msg = ''
  try { const j = await res.json(); msg = String((j && j.error && j.error.message) || '') } catch (e) {}
  if (res.status === 400 && /model not allowed/.test(msg)) { console.log('CHECK OK: server reachable and access code accepted (nothing was sent to Anthropic, no cost)'); process.exit(0) }
  if (res.status === 401) { console.log('CHECK FAILED: the server did not accept the access code'); process.exit(4) }
  console.log('CHECK FAILED: unexpected reply from the server: ' + res.status + ' ' + msg.slice(0, 160)); process.exit(5)
})()
