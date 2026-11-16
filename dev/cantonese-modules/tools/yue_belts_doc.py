#!/usr/bin/env python3
"""Regenerate CANTONESE-BELTS.md (the word list by belt, with Yale) from cantonese-word-tags.csv."""
import csv, os, collections
HERE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
rows = [r for r in csv.DictReader(open(f'{HERE}/cantonese-word-tags.csv', encoding='utf-8-sig')) if not r['skip']]
rows.sort(key=lambda r: int(r['rank']) if r.get('rank') else int(r['id']))
by = collections.OrderedDict()
for r in rows: by.setdefault(r['belt'], []).append(r)
local = sum(1 for r in rows if r['key'].startswith('L')); core = sum(1 for r in rows if r['key'].startswith('C'))
out = ['# Cantonese word list by belt (Yale romanisation)', '',
       f'Order: everyday use first (80/20); about every fifth word is a Hong Kong local-context word `[L]` ({local}); {core} everyday words the deck lacked are marked `[C]`. {len(rows)} curriculum words.', '']
for belt, ws in by.items():
    out += [f'## {belt} ({len(ws)} words)', '', ' · '.join(f"{w['word']} {w['yale']}" + (' [L]' if w['key'].startswith('L') else ' [C]' if w['key'].startswith('C') else '') for w in ws), '']
open(f'{HERE}/CANTONESE-BELTS.md', 'w', encoding='utf-8').write('\n'.join(out))
print('belts doc:', len(rows), 'words')
