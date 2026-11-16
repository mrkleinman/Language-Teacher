#!/usr/bin/env python3
"""Build cantonese-word-base.csv and cantonese-word-tags.csv from the tagging passes.

Inputs : drafts/classify/ALL-tags.csv (use class A-D, tier hint, group, slots, notes) and drafts/classify/H0N-cells.csv (the merged cells; frame may be revised there).
Order  : the 80/20 rule. Words that are used in a module-able way come first by use class (A core -> B common -> C useful -> D rare), inside a class by tier hint then by the deck's own
         order; skipped words (written-style, exam-only, fragments ...) come last. Position = rank 1..N; the belt follows the position through the usual eleven belts (100, 100, 200,
         200, 200, 200, 200, 325, 325, 325, 325); the tier follows the position: T1 1-200, T2 201-800, T3 801-1200, T4 1201-1850, T5 beyond.
Output : the id of a word is its position (as in the Mandarin and Japanese lists); `key` keeps the deck's own number.
"""
import csv, glob, collections, os
HERE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
STAGES = [('White', 100), ('Orange', 100), ('Orange + Stripe', 200), ('Blue', 200), ('Blue + Stripe', 200), ('Yellow', 200), ('Yellow + Stripe', 200), ('Green', 325), ('Green + Stripe', 325), ('Brown', 325), ('Brown + Stripe', 325)]
TIER_END = [('T1', 200), ('T2', 800), ('T3', 1200), ('T4', 1850)]
def belt_for(i):
    at = 0
    for n, sz in STAGES:
        if at < i <= at + sz: return n
        at += sz
    return 'Beyond curriculum'
def tier_for(i):
    for t, e in TIER_END:
        if i <= e: return t
    return 'T5'
def rd(p): return list(csv.DictReader(open(p, encoding='utf-8-sig')))
def main():
    allt = rd(f'{HERE}/drafts/classify/ALL-tags.csv')
    cells = {}
    for f in sorted(glob.glob(f'{HERE}/drafts/classify/H0*-cells.csv')) + sorted(glob.glob(f'{HERE}/drafts/classify/H[1-9]-cells.csv')):
        for r in rd(f): cells[r['key']] = r
    # the deck repeats some headwords (醫生 twice, 銀行 twice ...): the same word in the same cell is ONE word (the earlier deck row stays, the later one is skipped as a duplicate); a word the
    # deck lists with really different senses (好 good / very, 都 all / also, 點 how / o'clock, 坐 sit / ride) keeps one row per sense
    EXTRA = {('或者', 'perhaps; probably; maybe'), ('面對', 'be faced with; be up against')}
    seen = {}
    for r in sorted(allt, key=lambda r: int(r['key'])):
        if r['skip']: continue
        k = (r['word'], cells.get(r['key'], r)['subgroup'] if r['key'] in cells else r['subgroup'])
        if k in seen: r['skip'] = 'duplicate of deck row ' + seen[k]; r['use_class'] = 'D'; continue
        seen[k] = r['key']
        if (r['word'], r['meaning']) in EXTRA: r['skip'] = 'duplicate sense of ' + r['word']; r['use_class'] = 'D'
    CR = {'A': 0, 'B': 1, 'C': 2, 'D': 3}
    live = [r for r in allt if not r['skip']]
    skipped = [r for r in allt if r['skip']]
    missing = [r['key'] for r in live if r['key'] not in cells]
    assert not missing, ('no cell for', missing[:10], len(missing))
    th = lambda r: int((r['tier_hint'] or 'T3')[1])
    live.sort(key=lambda r: (CR.get(r['use_class'], 3), th(r), int(r['key'])))
    skipped.sort(key=lambda r: (CR.get(r['use_class'], 3), int(r['key'])))
    order = live + skipped
    # slot English that cannot stand in 'this {E}' / '{Es}': (word, english_slot, english_plural)
    SLOT_FIX = {'衫': ('top', 'tops'), '牛仔褲': ('jeans', 'jeans'), '物理': ('physics', 'physics')}
    for r in order:
        if r['word'] in SLOT_FIX and r['english_slot'] in ('clothes', 'jeans', 'physics'): r['english_slot'], r['english_plural'] = SLOT_FIX[r['word']]
    base, tags = [], []
    for i, r in enumerate(order, 1):
        c = cells.get(r['key'])
        sub = c['subgroup'] if c else r['subgroup']
        frame = (c['frame'] if c and c['frame'] != '' else r['frame']) if c else r['frame']
        base.append({'id': i, 'key': r['key'], 'word': r['word'], 'jyutping': r['jyutping'], 'yale': r['yale'], 'meaning': r['meaning'], 'belt': belt_for(i), 'tier': tier_for(i), 'entry_type': 'word', 'use_class': r['use_class']})
        tags.append({'id': i, 'key': r['key'], 'word': r['word'], 'jyutping': r['jyutping'], 'yale': r['yale'], 'meaning': r['meaning'], 'belt': belt_for(i), 'tier': tier_for(i), 'entry_type': 'word',
                     'pos': r['pos'], 'group': r['group'], 'subgroup': sub, 'frame': frame, 'english_slot': r['english_slot'], 'english_plural': r['english_plural'], 'classifier': r['classifier'],
                     'register_note': r['cantonese_note'] + ((' | cell note: ' + c['note']) if c and c['note'] else ''), 'skip': r['skip'], 'use_class': r['use_class']})
    for name, rows in (('cantonese-word-base.csv', base), ('cantonese-word-tags.csv', tags)):
        with open(f'{HERE}/{name}', 'w', encoding='utf-8-sig', newline='') as f:
            w = csv.DictWriter(f, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
    bc = collections.Counter(b['belt'] for b in base); print('words', len(base), dict(bc))
    tc = collections.Counter(b['tier'] for b in base); print('tiers', dict(tc))
    cc = collections.Counter(t['subgroup'] for t in tags if not t['skip'])
    print('cells', len(cc), '· <3 words', sum(1 for v in cc.values() if v < 3), '· largest', cc.most_common(1))
    ac = collections.Counter(b['use_class'] for b in base[:200]); print('first 200 words by class', dict(ac))
if __name__ == '__main__': main()
