// node tools/topic_words_csv.js muay-thai   → thai-modules/topic-<topic>-words.csv : the topic's words in priority order (position, group, word id, Thai,
// reused / new, the bank gloss and romanisation). The ONE source is the app (LANGUAGE_TOPICS in tt.jsx); this file lets the Python module tools and the
// module writers read the topic without parsing JSX. Rerun after the topic changes; test 99 checks the file against the app.
'use strict'
const fs = require('fs'), path = require('path')
const { load } = require(path.join(__dirname, '..', 'harness.js'))
const topicId = process.argv[2] || 'muay-thai'
const c = load(path.join(__dirname, '..', 'tt.compiled.js'), { realBelt: true })
const T = c.topicById('th', topicId); if (!T) { console.error('no topic ' + topicId); process.exit(1) }
const canon = c.thaiCanonicalById(), created = new Set((T.seed.created || []).map(x => x.id))
const q = s => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"'
const rows = ['position,group,word_id,thai,status,english,romanisation']
T.vocabIds.forEach((id, k) => { const d = canon.get(id), g = c.topicGroupAt(T, k)
  rows.push([k + 1, q(g), id, q(d.t), created.has(id) ? 'new' : 'reused', q(d.e), q(c.loadCanonicalThaiPhonetic(d.ph, d.t))].join(',')) })
const out = path.join(__dirname, '..', 'thai-modules', 'topic-' + topicId + '-words.csv')
fs.writeFileSync(out, '﻿' + rows.join('\r\n') + '\r\n', 'utf8'); console.log('wrote', path.relative(process.cwd(), out), rows.length - 1, 'words')
