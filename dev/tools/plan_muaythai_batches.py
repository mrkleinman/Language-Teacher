#!/usr/bin/env python3
"""Write the module-writing plan for the Muay Thai topic: thai-modules/drafts-muaythai/MT01..MT08.csv (one line per cell and tier) and MT-PLAN.md numbers.

  python3 tools/plan_muaythai_batches.py          rewrites the batch sheets from the tags, the merged modules and the peers (rerun after a merge to see what is left)

A cell is a subgroup of words that share every module (see thai-modules-handover.md). The 33 new topic words sit in 15 new cells (and ต่อย moves from a cell whose
only modules are about cars into the strike cell); each cell needs at least 3 modules at its tier that fit every word of it (the repo's coverage rule for a T3-T5
word), so a cell of k words needs `3 + (k-1)` modules to leave room for exclusions (min_modules) and at most `3k` (up_to: no module fits two words). The last line
is a top-up of the T2 blood cell (เลือด has 3 of the 4 modules a T2 word needs).
"""
import csv, os, sys
from collections import defaultdict
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from thai_modules_lib import Data, SRC, need_of, tier_i, clean

BATCHES = [  # batch -> [(cell, tier)]
    ('MT01', [('N_PERSONROLE.FIGHT', 'T4')]),
    ('MT02', [('N_ITEM.GEAR', 'T4'), ('N_BODY.SWEAT', 'T4')]),
    ('MT03', [('V_ROUTINE.TRAIN', 'T4'), ('N_EVENT.BOXING', 'T4')]),
    ('MT04', [('N_BODY.COMBAT', 'T4'), ('V_MOVE.DODGE', 'T4')]),
    ('MT05', [('V_HANDLE.STRIKE', 'T4'), ('V_HANDLE.WEIGH', 'T4')]),
    ('MT06', [('N_PLACE.FIGHT', 'T4'), ('N_PLACE.RING', 'T4')]),
    ('MT07', [('V_SOCIAL.COMPETE', 'T4'), ('V_SOCIAL.CHEER', 'T4'), ('N_BODY.FLUID', 'T2')]),
    ('MT08', [('N_ABSTRACT.MOVE', 'T4'), ('N_ABSTRACT.WEIGHT', 'T4')]),
]
HDR = ['batch', 'cell', 'tier', 'word_ids', 'words', 'english_slots', 'classifiers', 'modules_now', 'min_modules', 'up_to', 'read_first', 'serve_candidates', 'constraints']


def main():
    d = Data()
    by_cell = defaultdict(list)
    for t in d.tags:
        by_cell[t['subgroup'] or t['group']].append(t)
    short = {}
    for t in d.tags:
        if t['id'] in d.skipped or int(t['id']) >= 5500 and int(t['id']) < 6000: continue
        own, app = d.counts(t, with_links=True)
        if own < need_of(t): short[t['id']] = t
    outdir = os.path.join(SRC, 'drafts-muaythai')
    os.makedirs(outdir, exist_ok=True)
    total_min = total_up = 0
    for batch, cells in BATCHES:
        rows = []
        for cell, tier in cells:
            ws = [t for t in by_cell[cell] if tier_i(t['tier']) <= tier_i(tier)]
            if cell == 'N_BODY.FLUID': ws = [t for t in ws if t['id'] == '6025']          # the T2 top-up is for เลือด only
            k = len(ws)
            have = sum(1 for m in d.by_cell.get(cell, []) if m['tier'] == tier)
            mn, up = (1, 2) if cell == 'N_BODY.FLUID' else (3 + (k - 1), max(5, 3 * k) if k < 4 else min(12, 3 * k))
            parent = cell.split('.')[0]
            peers = {p for t in ws for p in d.peers.get(t['id'], [])}
            peer_cells = sorted({d.byid[p]['subgroup'] or d.byid[p]['group'] for p in peers if p in d.byid})
            read = [m['module_id'] for pc in peer_cells for m in d.by_cell.get(pc, []) if m['tier'] in (tier, 'T5')][:6] if cell != 'N_BODY.FLUID' else [m['module_id'] for m in d.by_cell.get(cell, []) if m['tier'] == 'T2']
            groups = {parent} | {d.byid[p]['group'] for p in peers if p in d.byid}
            serve = [t for t in short.values() if t['group'] in groups and (t['subgroup'] or t['group']) != cell and tier_i(t['tier']) <= tier_i(tier)]
            serve.sort(key=lambda t: (need_of(t) - d.counts(t)[0], t['id']), reverse=True)
            serve_s = '; '.join('%s %s (%s, %s)' % (t['id'], clean(t['thai']), t['english_slot'], t['tier']) for t in serve[:14])
            cons = ('closed vocabulary: thai-allowed-words.csv words up to %s, plus the slot; none of the 33 new topic words in the fixed text; lines %s words (end particle not counted)'
                    % (tier, {'T2': '4-8', 'T4': '7-12'}.get(tier, '?')))
            rows.append([batch, cell, tier, ';'.join(t['id'] for t in ws), ' '.join(clean(t['thai']) for t in ws), ' / '.join(t['english_slot'] for t in ws),
                         ' '.join(t['classifier'] for t in ws), have, mn, up, ' '.join(read), serve_s, cons])
            total_min += mn; total_up += up
        with open(os.path.join(outdir, batch + '.csv'), 'w', encoding='utf-8-sig', newline='') as fh:
            w = csv.writer(fh, lineterminator='\r\n'); w.writerow(HDR); w.writerows(rows)
        print(batch, [(r[1], r[2], r[8], r[9]) for r in rows], 'min', sum(r[8] for r in rows), 'up to', sum(r[9] for r in rows))
    print('TOTAL min', total_min, 'up_to', total_up)


main()
