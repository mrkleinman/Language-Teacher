#!/bin/bash
# list queued requests that have no reply yet and no claim marker; mark them claimed
H=/tmp/claude-0/-home-user-Language-Teacher/676fe26a-1df8-5b6e-8a48-17ab21481baf/scratchpad/lb
for l in th ja zh; do d=$H/q-$l; [ -f $d/DONE ] && { echo "$l DONE"; continue; }
  for r in $(ls $d/*.req.txt 2>/dev/null); do id=$(basename $r .req.txt); [ -f $d/$id.reply.txt ] || [ -f $d/$id.claim ] || { touch $d/$id.claim; echo "$l $id $(grep -o '"stage":"[^"]*"' $d/$id.meta.json) $(grep -o '"maxTokens":[0-9]*' $d/$id.meta.json)"; }; done; done
