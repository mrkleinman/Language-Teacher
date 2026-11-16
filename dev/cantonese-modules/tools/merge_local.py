#!/usr/bin/env python3
"""Merge the reviewed Hong Kong local-context words (the 20%) into the Cantonese tag table.

Reads  drafts/local/L0N-candidates.csv + R1/R2-review.csv (OK / FIX / DROP) + drafts/classify/ALL-tags.csv
Writes drafts/classify/ALL-tags-merged.csv : the deck rows (as before) + the kept local rows (key L001..), and the cut list drafts/classify/CUT.csv.
Rules   : local words kept in priority order (high confidence, A before B before C, then by candidate order) until LOCAL_TARGET (500);
          the curriculum is 2,500 words, so the weakest live deck words (class D first, then C with the latest tier hint) beyond 2,000 are cut (skip = 'cut for the local-context words').
"""
import csv, glob, os, sys, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import yale
HERE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
LOCAL_TARGET, CURRICULUM = 500, 2500
def rd(p): return list(csv.DictReader(open(p, encoding='utf-8-sig')))
def main():
    cands = []
    for f in sorted(glob.glob(f'{HERE}/drafts/local/L0*-candidates.csv')):
        for i, r in enumerate(rd(f)): r['_src'] = os.path.basename(f)[:3]; r['_i'] = i; cands.append(r)
    rev = {}
    for f in sorted(glob.glob(f'{HERE}/drafts/local/R*-review.csv')):
        for r in rd(f): rev.setdefault(r['word'], []).append(r)
    kept = []
    seen = set()
    for r in cands:
        v = rev.get(r['word'])
        if not v: continue
        rr = next((x for x in v if x['verdict'] != 'DROP'), None)
        if rr is None or r['word'] in seen: continue
        r = dict(r)
        if rr['verdict'] == 'FIX':
            if rr['jyutping_fixed'].strip(): r['jyutping'] = rr['jyutping_fixed'].strip()
            if rr['english_slot_fixed'].strip(): r['english_slot'] = rr['english_slot_fixed'].strip()
        r['_note'] = rr['note']
        seen.add(r['word']); kept.append(r)
    CR = {'A': 0, 'B': 1, 'C': 2}; CF = {'high': 0, 'medium': 1, 'low': 2}
    kept.sort(key=lambda r: (CF.get(r['confidence'], 2), CR.get(r['use_class'], 2), r['_src'], r['_i']))
    local = kept[:LOCAL_TARGET]
    deck = rd(f'{HERE}/drafts/classify/ALL-tags.csv')
    cells = {}
    for f in sorted(glob.glob(f'{HERE}/drafts/classify/H[1-9]-cells.csv')):
        for r in rd(f): cells[r['key']] = r
    live = [r for r in deck if not r['skip']]
    need_cut = len(live) + len(local) - CURRICULUM
    th = lambda r: int((r['tier_hint'] or 'T3')[1])
    order = sorted(live, key=lambda r: ({'D': 0, 'C': 1, 'B': 2, 'A': 3}.get(r['use_class'], 1), -th(r), -int(r['key'])))
    cut = {r['key'] for r in order[:max(0, need_cut)]}
    out = []
    for r in deck:
        r = dict(r)
        if r['key'] in cut: r['skip'] = 'cut for the local-context words (lowest-value deck word)'
        out.append(r)
    for n, r in enumerate(local, 1):
        out.append({'key': 'L%03d' % n, 'word': r['word'], 'jyutping': r['jyutping'], 'yale': yale.convert(r['jyutping']), 'meaning': r['meaning'], 'use_class': r['use_class'], 'tier_hint': r['tier_hint'],
                    'group': r['group'], 'subgroup': r['subgroup'], 'frame': r['frame'], 'english_slot': r['english_slot'], 'english_plural': r['english_plural'], 'classifier': r['classifier'],
                    'pos': r['pos'], 'cantonese_note': ('LOCAL (Hong Kong) · ' + r['note'] + (' · review: ' + r['_note'] if r['_note'] else '')).strip(' ·'), 'skip': ''})
    cols = ['key', 'word', 'jyutping', 'yale', 'meaning', 'use_class', 'tier_hint', 'group', 'subgroup', 'frame', 'english_slot', 'english_plural', 'classifier', 'pos', 'cantonese_note', 'skip']
    with open(f'{HERE}/drafts/classify/ALL-tags-merged.csv', 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.DictWriter(f, fieldnames=cols); w.writeheader(); w.writerows([{c: r.get(c, '') for c in cols} for r in out])
    print('candidates', len(cands), 'kept after review', len(kept), '· local used', len(local), '· deck live', len(live), '· deck cut', len(cut), '· curriculum', len(live) - len(cut) + len(local))
    print('local use classes', dict(collections.Counter(r['use_class'] for r in local)), 'tiers', dict(collections.Counter(r['tier_hint'] for r in local)))
if __name__ == '__main__': main()
