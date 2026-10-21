#!/bin/sh
# sh check.sh <source file …> — parse conversation files and run each conversation through the app's own Listening line checks on the
# owner's vocabulary (check.js). USABLE n/m = conversations with no problem. Set ONLY="C01 C02" to check some conversations.
set -e
D=$(cd "$(dirname "$0")" && pwd); DEV="$D/../../.."; SP=${SCRATCH:-/tmp/claude-0/-home-user-Language-Teacher/676fe26a-1df8-5b6e-8a48-17ab21481baf/scratchpad}
W="$SP/libcheck.$$"; mkdir -p "$W"
python3 "$D/parse.py" "$W/lib.json" "$@"
APP="$SP/libcheck-app.js"
if [ ! -f "$APP" ]; then (cd "$DEV" && node build.js tt.jsx "$W/app.js" >/dev/null && mv "$W/app.js" "$APP"); fi
node "$D/check.js" "$APP" "$SP/snapshot/thai-backup-2026-10-15.json" "$W/lib.json" $ONLY
rm -rf "$W"
