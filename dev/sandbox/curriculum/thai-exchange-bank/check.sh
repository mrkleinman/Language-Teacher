#!/bin/sh
# sh check.sh <lines.txt> [word …] — parse a lesson file into a bank, embed it into a scratch copy of tt.jsx, build it, and run every
# word through the app's own writer on the owner's vocabulary (validate.js). USABLE n/m = exchanges accepted with no model call.
set -e
D=$(cd "$(dirname "$0")" && pwd); DEV="$D/../../.."; SP=${SCRATCH:-/tmp/claude-0/-home-user-Language-Teacher/676fe26a-1df8-5b6e-8a48-17ab21481baf/scratchpad}
W="$SP/bankcheck.$$"; mkdir -p "$W"
python3 "$D/parse.py" "$1" "$W/bank.json" >/dev/null
cp "$DEV/tt.jsx" "$W/tt.jsx"; python3 "$D/embed.py" "$W/bank.json" "$W/tt.jsx" >/dev/null
(cd "$DEV" && node build.js "$W/tt.jsx" "$W/app.js" >/dev/null)
shift; node "$D/validate.js" "$W/app.js" "$SP/snapshot/thai-backup-2026-10-15.json" "$@"
rm -rf "$W"
