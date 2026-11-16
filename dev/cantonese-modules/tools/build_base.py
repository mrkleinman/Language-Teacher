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
    merged = f'{HERE}/drafts/classify/ALL-tags-merged.csv'
    allt = rd(merged if os.path.exists(merged) else f'{HERE}/drafts/classify/ALL-tags.csv')
    kn = lambda k: int(k) if str(k).isdigit() else (3000 + int(str(k)[1:]) if str(k)[0] == 'L' else int(str(k)[1:]) - 1000)        # deck keys are numbers; local words (L001 ...) sort after the deck rows of their class; core words (C001 ...) sort before them
    cells = {}
    for f in sorted(glob.glob(f'{HERE}/drafts/classify/H0*-cells.csv')) + sorted(glob.glob(f'{HERE}/drafts/classify/H[1-9]-cells.csv')):
        for r in rd(f): cells[r['key']] = r
    # the deck repeats some headwords (醫生 twice, 銀行 twice ...): the same word in the same cell is ONE word (the earlier deck row stays, the later one is skipped as a duplicate); a word the
    # deck lists with really different senses (好 good / very, 都 all / also, 點 how / o'clock, 坐 sit / ride) keeps one row per sense
    EXTRA = {('或者', 'perhaps; probably; maybe'), ('面對', 'be faced with; be up against')}
    seen = {}
    for r in sorted(allt, key=lambda r: kn(r['key'])):
        if r['skip']: continue
        k = (r['word'], cells[r['key']]['subgroup'] if r['key'] in cells else r['subgroup'])
        if k in seen: r['skip'] = 'duplicate of deck row ' + seen[k]; r['use_class'] = 'D'; continue
        seen[k] = r['key']
        if (r['word'], r['meaning']) in EXTRA: r['skip'] = 'duplicate sense of ' + r['word']; r['use_class'] = 'D'
    CR = {'A': 0, 'B': 1, 'C': 2, 'D': 3}
    live = [r for r in allt if not r['skip']]
    skipped = [r for r in allt if r['skip']]
    missing = [r['key'] for r in live if r['key'] not in cells and not str(r['key'])[0] in 'LC']
    assert not missing, ('no cell for', missing[:10], len(missing))
    th = lambda r: int((r['tier_hint'] or 'T3')[1])
    live.sort(key=lambda r: (CR.get(r['use_class'], 3), th(r), kn(r['key'])))
    skipped.sort(key=lambda r: (CR.get(r['use_class'], 3), kn(r['key'])))
    # the 20%: Hong Kong local-context words are spread EVENLY through the curriculum (every fifth word is a local word, best first), so no belt is crowded with them and
    # no belt lacks them; inside each stream the order is the 80/20 use order above
    deck_live = [r for r in live if not str(r['key']).startswith('L')]
    local_live = [r for r in live if str(r['key']).startswith('L')]
    inter, di, li = [], 0, 0
    while di < len(deck_live) or li < len(local_live):
        if (len(inter) + 1) % 5 == 0 and li < len(local_live): inter.append(local_live[li]); li += 1
        elif di < len(deck_live): inter.append(deck_live[di]); di += 1
        else: inter.append(local_live[li]); li += 1
    # id-lock: the words of the first release keep their id and tier (the written modules stay valid); the missing core words (keys C001 ...) get new ids and are spread evenly through
    # the span of their own tier, so the existing order is kept and no belt is crowded
    lock = {r['key']: (int(r['id']), r['tier']) for r in rd(f'{HERE}/id-lock.csv')} if os.path.exists(f'{HERE}/id-lock.csv') else {}
    if lock:
        old_live = sorted([r for r in inter if r['key'] in lock], key=lambda r: lock[r['key']][0])
        core_new = [r for r in inter if r['key'] not in lock]
        for r in old_live: r['_tier'] = lock[r['key']][1]
        for r in core_new: r['_tier'] = r['tier_hint'] or 'T2'
        merged_live = list(old_live)
        for t in ('T4', 'T3', 'T2', 'T1'):                      # from the back so earlier indexes stay valid
            ins = sorted([r for r in core_new if r['_tier'] == t], key=lambda r: ({'A': 0, 'B': 1}.get(r['use_class'], 2), kn(r['key'])))
            idx = [i for i, r in enumerate(merged_live) if r['_tier'] == t]
            if not ins: continue
            lo, span = (idx[0], len(idx)) if idx else (len(merged_live), 0)
            m = len(ins)
            for j, r in reversed(list(enumerate(ins))):
                merged_live.insert(lo + int((j + 0.5) * span / m), r)
        inter = merged_live
        for r in skipped: r['_tier'] = lock[r['key']][1] if r['key'] in lock else 'T5'
        nid = max(v[0] for v in lock.values())
        for r in inter + skipped:
            if r['key'] in lock: r['_id'] = lock[r['key']][0]
            else: nid += 1; r['_id'] = nid
    order = inter + skipped
    # slot English that cannot stand in 'this {E}' / '{Es}': (word, english_slot, english_plural)
    SLOT_FIX = {'衫': ('top', 'tops'), '牛仔褲': ('jeans', 'jeans'), '物理': ('physics', 'physics')}
    # from the W01 writer's report: slots that read badly in 'I am so {E}' / 'is it {E}'
    SLOT_FIX2 = {'辛苦': ('worn out', ''), '久': ('long', ''), '痛': ('sore', '')}
    for r in order:
        if r['word'] in SLOT_FIX2 and r['english_slot'] in ('exhausting', 'long (time)', 'painful'): r['english_slot'], r['english_plural'] = SLOT_FIX2[r['word']]
        if r['word'] == '好吃' and not r['skip']: r['skip'] = 'Mandarin form (Cantonese says 好食)'
    for r in order:
        if r['word'] in SLOT_FIX and r['english_slot'] in ('clothes', 'jeans', 'physics'): r['english_slot'], r['english_plural'] = SLOT_FIX[r['word']]
    # cells of one or two words (outside the one-off X_ groups) are folded into the nearest cell of their group so a module can serve at least three words
    CELL_MAP = {'A_CHARACTER.CLEVER': 'A_CHARACTER.GENERAL', 'A_CONDITION.HARD': 'A_CONDITION.GENERAL', 'A_PERSONSTATE.STATE': 'A_PERSONSTATE.FEEL', 'A_TASTE.TEXTURE': 'A_TASTE.TASTE',
                'A_THING.IMPORTANCE': 'A_THING.GENERAL', 'A_THING.SPEED': 'A_THING.GENERAL', 'N_CLOTHES.GENERAL': 'N_CLOTHES.GARMENT', 'N_FOODSTUFF.SEAFOOD': 'N_FOODSTUFF.MEAT',
                'N_TIMEUNIT.HOUR': 'N_TIMEUNIT.UNIT', 'V_HANDLE.FIND': 'V_HANDLE.GENERAL', 'V_ROUTINE.WAIT': 'V_ROUTINE.GENERAL', 'V_WANTLIKE.PURSUE': 'V_WANTLIKE.WANT'}
    base, tags = [], []
    for i, r in enumerate(order, 1):
        c = cells.get(r['key'])
        sub = c['subgroup'] if c else r['subgroup']
        sub = CELL_MAP.get(sub, sub)
        frame = (c['frame'] if c and c['frame'] != '' else r['frame']) if c else r['frame']
        base.append({'id': r.get('_id', i), 'rank': i, 'key': r['key'], 'word': r['word'], 'jyutping': r['jyutping'], 'yale': r['yale'], 'meaning': r['meaning'], 'belt': belt_for(i) if not r['skip'] else 'Beyond curriculum', 'tier': r.get('_tier') or tier_for(i), 'entry_type': 'word', 'use_class': r['use_class']})
        tags.append({'id': r.get('_id', i), 'rank': i, 'key': r['key'], 'word': r['word'], 'jyutping': r['jyutping'], 'yale': r['yale'], 'meaning': r['meaning'], 'belt': belt_for(i) if not r['skip'] else 'Beyond curriculum', 'tier': r.get('_tier') or tier_for(i), 'entry_type': 'word',
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
