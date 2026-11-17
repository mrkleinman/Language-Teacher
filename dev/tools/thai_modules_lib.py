"""Shared loading and rules for the Thai gap-fill module tools (need report, cross-use links, draft merge).

Everything here mirrors what the repo already does, so the tools agree with the app and with thai-modules/coverage.py:
  * a word is served by the modules of its own cell: group = its subgroup (or its group), the plain group, or its second_group,
    at its own tier (coverage.py); the app takes tiers from the word's tier up to the learner's tier and skips exclude_ids;
  * the target number of modules: 3 (4 for T1-T2 words); the quirky X_ groups need 2 (3 at T1)  (coverage.py);
  * only `ready` modules are embedded in the app (tools/build_thai_modules.py).
"""
import csv, os, re
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', 'thai-modules')
TIERS = ['T1', 'T2', 'T3', 'T4', 'T5']
COMFORT = 12          # usable modules per word that make a Daily track rotate comfortably (a cap for automatic links, not a floor)
clean = lambda s: re.sub(r'\s*(\.\.\.|…)\s*$', '', s or '').strip()


def read_csv(name):
    return list(csv.DictReader(open(os.path.join(SRC, name), encoding='utf-8-sig')))


def tier_i(t):
    return TIERS.index(t)


def need_of(w):
    """Modules a word must have at its own tier (coverage.py)."""
    x = w['group'].startswith('X_')
    return (3 if w['tier'] == 'T1' else 2) if x else (4 if w['tier'] in ('T1', 'T2') else 3)


def keys_of(w):
    """The cell whose modules serve the word directly. The APP's rule (thaiModuleCandidates): the word's subgroup, else its group; only when that
    cell has no usable module does the app fall back to the word's second_group family. (coverage.py also counts the plain parent group of a
    word that has a subgroup: the same thing for every old cell, but wrong for a new subgroup inside an unsplit group such as N_ITEM.GEAR.)"""
    return {w['subgroup'] or w['group']}


class Data:
    def __init__(self, extra_modules=None):
        self.tags = read_csv('thai-word-tags.csv')
        self.byid = {t['id']: t for t in self.tags}
        mods = [r for r in read_csv('thai-modules.csv') if r['status'] == 'ready']
        if extra_modules:
            mods += extra_modules
        self.mods = mods
        for m in self.mods:
            m['_ex'] = set(x for x in (m.get('exclude_ids') or '').split(';') if x)
            m['_t'] = tier_i(m['tier'])
        self.bymod = {m['module_id']: m for m in self.mods}
        self.by_cell = defaultdict(list)
        for m in self.mods:
            self.by_cell[m['group']].append(m)
        self.peers = {}
        try:
            for r in read_csv('thai-module-peers.csv'):
                self.peers[r['word_id']] = [x for x in r['peer_ids'].split(';') if x]
        except FileNotFoundError:
            pass
        self.skipped = set()
        try:
            for line in open(os.path.join(SRC, 'thai-skipped-words.txt'), encoding='utf-8'):
                if '|' in line:
                    self.skipped.add(line.split('|')[0].strip())
        except FileNotFoundError:
            pass
        self.links = defaultdict(set)         # word id -> module ids linked to it (status applied)
        try:
            for r in read_csv('thai-module-word-links.csv'):
                if r['status'] == 'applied':
                    self.links[r['word_id']].add(r['module_id'])
        except FileNotFoundError:
            pass

    def direct(self, w, own_tier_only=False):
        """Modules that serve word w by its own cell (not excluded, tier at or above the word's); the second_group family only when the cell has none."""
        def pick(cells, prefix=False):
            out, seen = [], set()
            for g, ms in self.by_cell.items():
                if not (g in cells or (prefix and any(g.startswith(c + '.') for c in cells))):
                    continue
                for m in ms:
                    if m['module_id'] in seen or w['id'] in m['_ex'] or m['_t'] < tier_i(w['tier']):
                        continue
                    if own_tier_only and m['tier'] != w['tier']:
                        continue
                    seen.add(m['module_id']); out.append(m)
            return out
        out = pick(keys_of(w))
        if not out and w['second_group'] not in ('', '-'):
            out = pick({w['second_group']}, prefix=True)
        return out

    def counts(self, w, with_links=True):
        """(modules at the word's own tier [the coverage.py rule], modules at its tier or above [what the app can reach for a T5 learner])"""
        d = self.direct(w)
        ids = {m['module_id'] for m in d}
        if with_links:
            for mid in self.links.get(w['id'], ()):
                m = self.bymod.get(mid)
                if m and mid not in ids and m['_t'] >= tier_i(w['tier']) and w['id'] not in m['_ex']:
                    d.append(m); ids.add(mid)
        own = sum(1 for m in d if m['tier'] == w['tier'])
        return own, len(d)
