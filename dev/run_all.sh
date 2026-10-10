#!/bin/sh
# v649: compile tt.jsx and run every suite (requires npm i in this folder)
node build.js tt.jsx tt.compiled.js
for t in tests.js tests2.js tests3.js tests5.js tests6.js tests7.js tests8.js tests9.js tests10.js tests11.js tests12.js tests13.js tests14.js tests15.js tests16.js tests17.js tests18.js tests19.js tests20.js tests21.js tests22.js tests23.js tests24.js tests25.js tests26.js tests27.js tests28.js tests29.js tests30.js tests31.js tests32.js tests33.js tests34.js tests35.js tests36.js tests37.js tests38.js tests39.js tests40.js tests42.js; do
  echo "== $t"; node $t 2>&1 | grep -E "^FAIL|passed|FAILED|TOTALS" | tail -3
done
# regress.js retired (retired/regress.js)
node render_test.js | tail -1
node sim_live.js > v673-simulated-live-path.txt && tail -1 v673-simulated-live-path.txt
