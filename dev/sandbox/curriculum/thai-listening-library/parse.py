# python3 parse.py <out.json> <source file …> — read conversation source files into the library JSON the app embeds.
# Source format (see AUTHOR.md):
#   === C01 | Title in English
#   ## Scene title in English
#   A | ไปไหนมาครับ | Where have you been?
#   B | ไปตลาดมาค่ะ | I went to the market.
import json, re, sys

def parse(path, convs):
    cur = None
    for n, raw in enumerate(open(path, encoding='utf-8'), 1):
        line = raw.strip()
        if not line or line.startswith('#!'):
            continue
        m = re.match(r'^===\s*([A-Za-z0-9_-]+)\s*\|\s*(.+)$', line)
        if m:
            cur = {'id': m.group(1).strip(), 'title': m.group(2).strip(), 'scenes': []}
            convs.append(cur)
            continue
        m = re.match(r'^##\s*(.+)$', line)
        if m:
            if cur is None:
                sys.exit('%s:%d scene before any conversation' % (path, n))
            cur['scenes'].append({'title': m.group(1).strip(), 'lines': []})
            continue
        m = re.match(r'^([AB])\s*\|\s*([^|]+?)\s*\|\s*(.+)$', line)
        if m:
            if cur is None or not cur['scenes']:
                sys.exit('%s:%d line before any scene' % (path, n))
            cur['scenes'][-1]['lines'].append([m.group(1), re.sub(r'\s+', ' ', m.group(2).strip()), m.group(3).strip()])
            continue
        sys.exit('%s:%d cannot read: %s' % (path, n, line[:80]))

convs = []
for p in sys.argv[2:]:
    parse(p, convs)
ids = [c['id'] for c in convs]
dup = sorted({i for i in ids if ids.count(i) > 1})
if dup:
    sys.exit('duplicate conversation ids: ' + ', '.join(dup))
json.dump(convs, open(sys.argv[1], 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print(len(convs), 'conversations,', sum(len(s['lines']) for c in convs for s in c['scenes']), 'lines')
