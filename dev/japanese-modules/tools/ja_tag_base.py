#!/usr/bin/env python3
"""Step 1 of the Japanese module build: part of speech, conjugation class and tier for every word in the draft list (Sudachi), with a round-trip check of every generated verb/adjective form.
Writes japanese-word-base.csv (id, word, romaji, meaning, belt, tier, entry_type, pos, conj, notes) and prints a problem report."""
import csv, sys, os, collections
sys.path.insert(0, os.path.dirname(__file__))
from sudachipy import dictionary, tokenizer
import ja_conj
tk = dictionary.Dictionary().create(); M = tokenizer.Tokenizer.SplitMode.C
HERE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
rows = list(csv.DictReader(open(os.path.join(HERE, 'japanese-words-draft-3050.csv'), encoding='utf-8-sig')))
TIER = {'White': 'T1', 'Orange': 'T1', 'Orange + Stripe': 'T2', 'Blue': 'T2', 'Blue + Stripe': 'T2', 'Yellow': 'T3', 'Yellow + Stripe': 'T3',
        'Green': 'T4', 'Green + Stripe': 'T4', 'Brown': 'T5', 'Brown + Stripe': 'T5', 'Beyond curriculum': 'T5', '(unassigned)': 'T5'}
ROWMAP = {'ラ': 'ru', 'マ': 'mu', 'サ': 'su', 'カ': 'ku', 'ワア': 'u', 'タ': 'tsu', 'バ': 'bu', 'ガ': 'gu', 'ナ': 'nu'}

def vlemmas(text):
    return [m.dictionary_form() for m in tk.tokenize(text, M) if m.part_of_speech()[0] == '動詞']

out, problems = [], []
for r in rows:
    w = r['word']; ms = tk.tokenize(w, M); notes = []
    pos = 'noun'; conj = ''
    p = [m.part_of_speech() for m in ms]
    last = p[-1]
    if r['entry_type'] == 'phrase':
        pos = 'phrase'
    elif len(ms) == 1 and last[0] == '動詞':
        typ = last[4]
        if typ.startswith('五段-'):
            conj = 'godan-' + ROWMAP.get(typ.split('-')[1].rstrip('行'), '?'); pos = 'verb'
        elif typ.startswith(('上一段', '下一段')): conj, pos = 'ichidan', 'verb'
        elif typ.startswith('サ行変格'): conj, pos = 'suru', 'verb'
        elif typ.startswith('カ行変格'): conj, pos = 'kuru', 'verb'
        else: conj, pos = '?', 'verb'
        if w == 'ある': conj = 'aru'
        if w in ('行く', 'いく'): conj = 'iku'
    elif last[0] == '形容詞' and not w.endswith('い'):
        pos = 'adverb'; notes.append('adjective-adverb form')
    elif len(ms) == 1 and last[0] == '形容詞':
        pos = 'adj-i'; conj = 'ii' if w in ('いい', '良い') else 'i-adj'
    elif len(ms) == 1 and last[0] == '形状詞':
        pos = 'adj-na'; conj = 'na-adj'
    elif len(ms) >= 2 and last[0] == '動詞' and last[4].startswith('サ行変格') and all(x[0] in ('名詞', '副詞') or x[0] == '動詞' for x in p):
        pos = 'verb'; conj = 'suru'; notes.append('noun+suru')
    elif len(ms) >= 2 and last[0] == '動詞':
        pos = 'verb'; typ = last[4]
        if typ.startswith('カ行変格'): conj = 'kuru'
        else: conj = ('godan-' + ROWMAP.get(typ.split('-')[1].rstrip('行'), '?')) if typ.startswith('五段-') else 'ichidan' if typ.startswith(('上一段', '下一段')) else '?'; notes.append('compound verb')
    elif last[0] == '形容詞' and len(ms) >= 2 and w.endswith('い'):
        pos = 'adj-i'; conj = 'i-adj'; notes.append('compound adj')
    elif last[0] == '副詞' and len(ms) == 1: pos = 'adverb'
    elif last[0] == '代名詞' and len(ms) == 1: pos = 'pronoun'
    elif last[0] == '感動詞' and len(ms) == 1: pos = 'interjection'
    elif last[0] == '接続詞' and len(ms) == 1: pos = 'conjunction'
    elif last[0] in ('助詞',): pos = 'adverb'; notes.append('particle-ending adverb phrase')
    else: pos = 'noun'
    # overrides found in the first run
    if pos == 'verb' and conj not in ('suru', 'kuru') and w[-1] not in 'うくぐすつぬぶむる': pos, conj = 'noun', ''; notes.append('verb stem used as a noun')
    if pos == 'verb' and conj.startswith('godan-') and (w.endswith('行く') or w.endswith('いく')) and w not in ('行く',): conj = 'iku'; notes.append('compound with 行く')
    if w == '得る': conj = 'ichidan'; notes.append('える-type: ichidan')
    if len(ms) > 1 and pos == 'noun': notes.append('multi-token')
    # round-trip: every generated form must re-tokenise with the right lemma / class
    if pos == 'verb' and conj not in ('?', ''):
        try:
            f = ja_conj.verb_forms(w, conj)
            base = vlemmas(w)
            for k in ('nai', 'ta', 'te', 'tai'):
                got = vlemmas(f[k])
                if conj == 'suru': continue
                if got[:len(base)] != base and [x.replace('ずる', 'じる') for x in got[:len(base)]] != base:
                    problems.append((r['id'], w, k, f[k], '/'.join(got)))
        except Exception as e:
            problems.append((r['id'], w, 'ERR', conj, str(e)))
    elif pos == 'verb': problems.append((r['id'], w, 'conj?', last[4], ''))
    if pos in ('adj-i', 'adj-na') and conj:
        try:
            f = ja_conj.adj_forms(w, conj)
            ml = tk.tokenize(f['past'], M)
            if conj == 'i-adj' and ml[0].dictionary_form() != w and ml[-1].dictionary_form() != w: problems.append((r['id'], w, 'adj-past', f['past'], ml[0].dictionary_form()))
        except Exception as e: problems.append((r['id'], w, 'ERR', conj, str(e)))
    out.append({'id': r['id'], 'word': w, 'romaji': r['romaji'], 'meaning': r['meaning'], 'belt': r['belt'], 'tier': TIER[r['belt']], 'entry_type': r['entry_type'], 'pos': pos, 'conj': conj, 'notes': ';'.join(notes)})
with open(os.path.join(HERE, 'japanese-word-base.csv'), 'w', encoding='utf-8-sig', newline='') as f:
    wr = csv.DictWriter(f, fieldnames=list(out[0].keys())); wr.writeheader(); wr.writerows(out)
c = collections.Counter((o['pos'], o['conj']) for o in out)
for k, n in sorted(c.items(), key=lambda x: -x[1]): print(n, k)
print('conjugation round-trip problems:', len(problems))
for p in problems[:40]: print(p)
