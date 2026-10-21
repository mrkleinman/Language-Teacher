# python3 parse.py <lines.txt> <out.json> — a reviewed lesson in the review format ("003 [สะพาน] B / CUE / TH / PH / EN") → bank
# entries { "<target Thai>": [[{speaker, thai, english, prompt}, ×3]] }. Framing lines are skipped. Merges into out.json if it exists.
import json, re, sys, os
src, out = sys.argv[1], sys.argv[2]
bank = json.load(open(out, encoding='utf-8')) if os.path.exists(out) else {}
cur = {}
for blk in re.split(r'\n\s*\n', open(src, encoding='utf-8').read().strip()):
    m = re.match(r'\s*\d+\s+\[([^\]]+)\]\s+([AB])', blk)
    if not m or m.group(1) == 'framing': continue
    f = dict(re.findall(r'^\s*(CUE|TH|PH|EN):\s*(.*)$', blk, re.M))
    cur.setdefault(m.group(1).strip(), []).append({'speaker': m.group(2), 'thai': f['TH'].strip(), 'english': f['EN'].strip(), 'prompt': f['CUE'].strip()})
n = 0
for t, ls in cur.items():
    if len(ls) != 3: print('skip (not 3 lines):', t, len(ls)); continue
    v = bank.setdefault(t, [])
    if ls not in v: v.append(ls); n += 1
json.dump(bank, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print('added', n, 'exchanges ·', len(bank), 'words in', out)
