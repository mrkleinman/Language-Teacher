# python3 embed.py <library.json> [tt.jsx] — writes the conversation library into the `const THAI_LISTENING_LIBRARY = [...]` line of tt.jsx
# (data only, one line). Each conversation: { id, title, scenes: [{ title, lines: [[speaker, thai, english], …] }] }.
import json, sys
b = json.load(open(sys.argv[1], encoding='utf-8')); p = sys.argv[2] if len(sys.argv) > 2 else '../../../tt.jsx'
s = open(p, encoding='utf-8').read()
a = s.index('const THAI_LISTENING_LIBRARY = '); e = s.index('\n', a)
s = s[:a] + 'const THAI_LISTENING_LIBRARY = ' + json.dumps(b, ensure_ascii=False, separators=(',', ':')) + s[e:]
open(p, 'w', encoding='utf-8').write(s); print('embedded', len(b), 'conversations,', sum(len(sc['lines']) for c in b for sc in c['scenes']), 'lines')
