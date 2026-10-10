#!/bin/bash
# Offline regression: every suite against the real compiled app, in parallel. One line per suite with its exit code
# and PASS/FAIL counts; full output per suite in $OUT/<suite>.txt. Exit 0 only if every suite exits 0 (or is listed
# in KNOWN_FAIL with the exact failing check ids).
cd "$(dirname "$0")/.." || exit 2
OUT=${1:-sandbox/logs/tests}; mkdir -p "$OUT"
# Pre-existing failures carried over from deployed v677 (documented): suite → failing check ids
declare -A KNOWN_FAIL=( [tests33.js]="2G" [tests35.js]="2C-thTH 2C-zhZH" )
declare -A KNOWN_WHY=( [tests33.js]="(known: pre-existing in deployed v677)" [tests35.js]="(BLOCKED: replay_v673_listening_plan.js + logs673/ not in the package or Drive)" )
SUITES=$(grep -oE 'tests[0-9]*\.js' run_all.sh | sort -uV)
JOBS=${JOBS:-6}
run1() { t=$1; OUT=$2; start=$(date +%s); timeout 900 node "$t" > "$OUT/$t.txt" 2>&1; echo $? > "$OUT/$t.exit"; echo $(( $(date +%s) - start )) > "$OUT/$t.secs"; }
export -f run1
printf '%s\n' $SUITES | xargs -P "$JOBS" -I{} bash -c 'run1 {} '"$OUT"
node render_test.js > "$OUT/render_test.txt" 2>&1; echo $? > "$OUT/render_test.exit"
bad=0
printf "%-14s %4s %5s %5s %5s %5s  %s\n" SUITE EXIT PASS FAIL BLOCK SECS FAILING
for t in $SUITES render_test; do
  f="$OUT/$t"; [ "$t" = render_test ] || f="$OUT/$t"
  txt="$f"; [ -f "$f.txt" ] && txt="$f.txt"
  e=$(cat "$f.exit"); p=$(grep -cE '^PASS' "$txt"); n=$(grep -cE '^FAIL' "$txt")
  ids=$(grep -E '^FAIL' "$txt" | awk '{print $2}' | tr '\n' ' ')
  note=""
  if [ "$e" != 0 ] || [ "$n" != 0 ]; then   # v682: a FAIL line counts even if the suite exited 0
    if [ -n "${KNOWN_FAIL[$t]}" ] && [ "$(echo $ids | xargs)" = "${KNOWN_FAIL[$t]}" ]; then note="${KNOWN_WHY[$t]}"; else bad=1; note="<<< NEW FAILURE"; fi
  fi
  bl=$(grep -cE '^BLOCKED' "$txt")
  printf '%-14s %4s %5s %5s %5s %5s  %s %s\n' "$t" "$e" "$p" "$n" "$bl" "$(cat $f.secs 2>/dev/null)" "$ids" "$note"
done
[ $bad = 0 ] && echo "OFFLINE REGRESSION: OK" || echo "OFFLINE REGRESSION: FAILED"
exit $bad
