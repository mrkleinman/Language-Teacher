#!/bin/bash
# The development loop, entirely outside production:  build → test → generate → validate → diagnose → fix → retest
#
#   bash sandbox/sandbox.sh setup                      # once per fresh container: npm install + restore baseline builds
#   bash sandbox/sandbox.sh build [version]            # tt.jsx → tt.compiled.js + index.html (sandbox only) + sync check
#   bash sandbox/sandbox.sh test                       # full offline regression (real compiled app, no model)
#   bash sandbox/sandbox.sh equivalence                # the 18 live v677 runs replayed on this build (production unchanged?)
#   bash sandbox/sandbox.sh live <fixture> [cap] [pipeline]   # ONE real-Gemini run, hard cost cap (default US$0.25, gen2)
#   bash sandbox/sandbox.sh inspect <runDir>           # human inspection sheet + independent production checks
#   bash sandbox/sandbox.sh compare <runDir>...        # deterministic measures vs the 18 v677 runs (compare_gen.js)
#   bash sandbox/sandbox.sh spend                      # money spent so far (from Gemini's own usage figures)
#
# Nothing here deploys, writes learner data, or touches ../index.html (production v677).
set -e
cd "$(dirname "$0")/.."
cmd=$1; shift || true
case "$cmd" in
  setup)
    npm install --no-audit --no-fund >/dev/null
    npm install --no-audit --no-fund --no-save react-test-renderer@18.3.1 >/dev/null
    node build.js tt.jsx tt.compiled.js
    node sandbox/baselines.js ;;
  build)
    v=${1:-$(grep -oE "APP_BUILD_VERSION = '[^']+'" tt.jsx | head -1 | grep -oE "v[0-9]+")}
    node build.js tt.jsx tt.compiled.js
    python3 build_index.py tt.jsx build/index-1.shell.html index.html "$v"
    node check_sync.js ;;
  test)
    bash sandbox/test_all.sh ;;
  equivalence)
    ok=0; n=0
    for f in benchmark/cassettes/live/*.live.v677.run*.json; do n=$((n+1)); fx=$(basename "$f" | sed 's/\.live\..*//')
      if node benchmark/run.js --fixture "$fx" --mode replay --cassette "$f" >/dev/null 2>&1; then ok=$((ok+1)); echo "IDENTICAL  $(basename $f)"; else echo "DIFFERENT  $(basename $f)"; fi; done
    echo "EQUIVALENCE: $ok / $n live v677 runs replay with identical learner-facing content"; [ $ok = $n ] ;;
  live)
    node sandbox/live.js --fixture "$1" --cap "${2:-0.25}" --pipeline "${3:-gen2}" ;;
  inspect)
    node sandbox/inspect.js "$1" ;;
  compare)
    mkdir -p sandbox/compare/new; rm -f sandbox/compare/new/*.json
    for d in "$@"; do [ -f "$d/bench-run.json" ] || node sandbox/inspect.js "$d" >/dev/null; cp "$d/bench-run.json" "sandbox/compare/new/$(basename "$d").json"; done
    node benchmark/compare_gen.js --old benchmark/live/v677 --new sandbox/compare/new ;;
  spend)
    node -e "const l=require('./sandbox/spend-ledger.json');let t=0;l.runs.forEach(r=>{t+=r.costUsd;console.log(r.at.slice(0,19),'US\$'+r.costUsd.toFixed(4),r.requests+' req',r.status||'-',r.runId)});console.log('TOTAL US\$'+t.toFixed(4)+' of session cap US\$'+l.sessionCapUsd)" ;;
  *) sed -n 2,13p "$0"; exit 2 ;;
esac
