# python3 embed.py <bank.json> [tt.jsx] — writes the bank into the `const THAI_EXCHANGE_BANK = {...}` line of tt.jsx (data only, one line)
import json, sys, re
b = json.load(open(sys.argv[1], encoding='utf-8')); p = sys.argv[2] if len(sys.argv) > 2 else '../../../tt.jsx'
s = open(p, encoding='utf-8').read()
a = s.index('const THAI_EXCHANGE_BANK = '); e = s.index('\n', a)
s = s[:a] + 'const THAI_EXCHANGE_BANK = ' + json.dumps(b, ensure_ascii=False, separators=(',', ':')) + s[e:]
open(p, 'w', encoding='utf-8').write(s); print('embedded', len(b), 'words,', sum(len(v) for v in b.values()), 'exchanges')
