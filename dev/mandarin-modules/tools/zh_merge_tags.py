#!/usr/bin/env python3
"""Merge the Mandarin tagger drafts (drafts/T1-tags.csv, drafts/B*-tags.csv) into mandarin-word-tags.csv and apply the harmonisation overrides
(drafts/harmonize-*.csv: id,group,subgroup[,pos][,reason]). Prints consistency problems."""
import csv, glob, os, collections
HERE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
base = {r['id']: r for r in csv.DictReader(open(f'{HERE}/mandarin-word-base.csv', encoding='utf-8-sig'))}
tags = {}
for p in sorted(glob.glob(f'{HERE}/drafts/*-tags.csv')):
    for r in csv.DictReader(open(p, encoding='utf-8-sig')): tags[r['id']] = r
over = {}
for p in sorted(glob.glob(f'{HERE}/drafts/harmonize-*.csv')):
    for r in csv.DictReader(open(p, encoding='utf-8-sig')): over[r['id']] = r
out, problems = [], []
KIND = lambda g: 'V' if g.startswith('V_') else 'A' if g.startswith('A_') else 'W'
for i, b in base.items():
    t = tags.get(i)
    if not t: problems.append((i, b['word'], 'no tag row')); continue
    group, sub, pos = t['group'].strip(), (t.get('subgroup') or '').strip(), (t.get('pos') or '').strip()
    if i in over:
        o = over[i]
        if (o.get('group') or '').strip(): group, sub = o['group'].strip(), (o.get('subgroup') or '').strip()
        if (o.get('pos') or '').strip(): pos = o['pos'].strip()
    skip = (t.get('skip') or '').strip()
    r = {'id': i, 'word': b['word'], 'pinyin': b['pinyin'], 'meaning': b['meaning'], 'belt': b['belt'], 'tier': b['tier'], 'entry_type': b['entry_type'], 'pos': pos,
         'group': group, 'subgroup': sub, 'frame': t.get('frame', ''), 'english_slot': t.get('english_slot', ''), 'english_plural': t.get('english_plural', ''),
         'measure_word': t.get('measure_word', ''), 'register_note': t.get('register_note', ''), 'skip': skip}
    out.append(r)
    if skip: continue
    if not pos: problems.append((i, b['word'], 'no pos'))
    if not r['english_slot']: problems.append((i, b['word'], 'no english_slot'))
    if sub and sub.split('.')[0] != group: problems.append((i, b['word'], f'subgroup {sub} not under group {group}'))
    if group.startswith('V_') and pos not in ('verb',): problems.append((i, b['word'], f'group {group} but pos {pos}'))
    if group.startswith('A_') and pos not in ('adj',): problems.append((i, b['word'], f'group {group} but pos {pos}'))
    if group.startswith('N_') and pos in ('verb', 'adj'): problems.append((i, b['word'], f'group {group} but pos {pos}'))
with open(f'{HERE}/mandarin-word-tags.csv', 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.DictWriter(f, fieldnames=list(out[0].keys())); w.writeheader(); w.writerows(out)
c = collections.Counter((r['subgroup'] or r['group']) for r in out if not r['skip'])
print('words', len(out), 'tagged', sum(1 for r in out if not r['skip']), 'skipped', sum(1 for r in out if r['skip']), 'subgroups', len(c), 'under 3:', sum(1 for v in c.values() if v < 3))
print('problems', len(problems))
for p in problems[:40]: print(p)
