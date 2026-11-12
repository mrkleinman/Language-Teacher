#!/usr/bin/env python3
"""Merge the tagger drafts (drafts/T1-tags.csv, drafts/B*-tags.csv) into japanese-word-tags.csv:
  - applies pos_fix / conj_fix to the base part of speech and conjugation class
  - applies harmonisation overrides from drafts/harmonize-*.csv  (id,group,subgroup[,reason])
  - writes one row per word: id,word,romaji,meaning,belt,tier,entry_type,pos,conj,group,subgroup,frame,english_slot,english_plural,counter,register_note,skip
and prints consistency problems (slot kind vs group prefix, verbs without conj, adjectives without a frame ...).
"""
import csv, glob, os, sys, collections
HERE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
base = {r['id']: r for r in csv.DictReader(open(f'{HERE}/japanese-word-base.csv', encoding='utf-8-sig'))}
tags = {}
for p in sorted(glob.glob(f'{HERE}/drafts/*-tags.csv')):
    for r in csv.DictReader(open(p, encoding='utf-8-sig')):
        tags[r['id']] = r
over = {}
for p in sorted(glob.glob(f'{HERE}/drafts/harmonize-*.csv')):
    for r in csv.DictReader(open(p, encoding='utf-8-sig')):
        over[r['id']] = r
ADJ = {'adj-i': 'i-adj', 'adj-na': 'na-adj'}
out, problems = [], []
for i, b in base.items():
    t = tags.get(i)
    if not t: problems.append((i, b['word'], 'no tag row')); continue
    pos, conj = b['pos'], b['conj']
    pf, cf = (t.get('pos_fix') or '').strip(), (t.get('conj_fix') or '').strip()
    if pf and pf != pos:
        pos = pf
        conj = cf if pos == 'verb' else ('ii' if pos == 'adj-i' and b['word'] in ('いい', '良い') else ADJ.get(pos, ''))
    elif cf: conj = cf
    group, sub = t['group'].strip(), (t.get('subgroup') or '').strip()
    if i in over:
        if over[i]['group'].strip():
            group = over[i]['group'].strip()
            sub = over[i]['subgroup'].strip()
    if i in over:
        if (over[i].get('pos') or '').strip(): pos = over[i]['pos'].strip()
        if (over[i].get('conj') or '').strip(): conj = over[i]['conj'].strip()
    skip = (t.get('skip') or '').strip()
    r = {'id': i, 'word': b['word'], 'romaji': b['romaji'], 'meaning': b['meaning'], 'belt': b['belt'], 'tier': b['tier'], 'entry_type': b['entry_type'],
         'pos': pos, 'conj': conj, 'group': group, 'subgroup': sub, 'frame': t.get('frame', ''), 'english_slot': t.get('english_slot', ''),
         'english_plural': t.get('english_plural', ''), 'counter': t.get('counter', ''), 'register_note': t.get('register_note', ''), 'skip': skip}
    out.append(r)
    if skip: continue
    kind = 'V' if pos == 'verb' else 'A' if pos in ('adj-i', 'adj-na') else 'W'
    gk = 'V' if group.startswith('V_') else 'A' if group.startswith('A_') else 'W'
    if kind != gk and not (group.startswith('X_') and kind in ('V', 'A')):
        problems.append((i, b['word'], f'pos {pos} but group {group}'))
    if group.startswith('X_') and kind != 'W': pass
    if kind == 'V' and not conj: problems.append((i, b['word'], 'verb without conj'))
    if not r['english_slot']: problems.append((i, b['word'], 'no english_slot'))
    if sub and sub.split('.')[0] != group: problems.append((i, b['word'], f'subgroup {sub} not under group {group}'))
with open(f'{HERE}/japanese-word-tags.csv', 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.DictWriter(f, fieldnames=list(out[0].keys())); w.writeheader(); w.writerows(out)
c = collections.Counter((r['subgroup'] or r['group']) for r in out if not r['skip'])
print('words', len(out), 'tagged', sum(1 for r in out if not r['skip']), 'skipped', sum(1 for r in out if r['skip']), 'subgroups', len(c), 'under 3:', sum(1 for v in c.values() if v < 3))
print('problems', len(problems))
for p in problems[:60]: print(p)
