// Step 0 benchmark — deterministic globals for a recorded / replayed run.
// The app derives seeds and ids from the clock (e.g. the Listening attempt id is an ISO timestamp) and from
// Math.random (run ids). A replay can only reproduce the recorded prompts if both are pinned. The clock ADVANCES by a
// fixed step on every read, so ids stay distinct and ordering logic keeps working, but the sequence is identical on
// every run with the same call order.
'use strict'
function deterministicGlobals(o = {}) {
  const start = o.startMs != null ? o.startMs : Date.UTC(2026, 9, 8, 6, 0, 0)   // 2026-10-08T06:00:00Z (the historical day)
  const step = o.stepMs != null ? o.stepMs : 7
  let now = start
  const RealDate = Date
  const tick = () => (now += step)
  class FixedDate extends RealDate {
    constructor(...a) { if (a.length) super(...a); else super(tick()) }
    static now() { return tick() }
  }
  let seed = (o.seed != null ? o.seed : 20261008) % 2147483647 || 1
  const math = Object.create(Math)
  math.random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 }
  const seed0 = seed
  // v676: __ttBenchClockReset rewinds the clock and the seed — called by the UI-path runner right before a run, in Node
  // AND in the in-app worker, so a browser recording and a Node replay see the same clock from the run's first read
  const g = { Date: FixedDate, Math: math, __ttBenchClockReset: () => { now = start; seed = seed0 } }
  if (o.realTimers) { g.setTimeout = setTimeout; g.clearTimeout = clearTimeout }
  return g
}
module.exports = { deterministicGlobals }
