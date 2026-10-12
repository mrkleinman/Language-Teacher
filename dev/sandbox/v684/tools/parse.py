#!/usr/bin/env python3
"""Parse the three v683 exported tracks into one JSON per language.
Usage: parse.py <inputs_dir> <out_dir>"""
import sys, re, json, os

ind, outd = sys.argv[1], sys.argv[2]
os.makedirs(outd, exist_ok=True)

def section(text):
    i = text.index('TRACK PAIRS (')
    j = text.find('\nLISTENING COVERAGE', i)
    return text[i:j if j > 0 else len(text)]

def parse_th(text):
    out = []
    for blk in re.split(r'\n(?=\[\d{3}\] )', section(text))[1:]:
        m = re.match(r'\[(\d{3})\] (.*)', blk)
        p = {'pos': int(m.group(1)), 'cue': m.group(2).strip()}
        for k, rx in [('type', r'TYPE: (\S+)'), ('targetId', r'TARGET_ID: (\S+)'), ('target', r'TARGET: (\S+)'),
                      ('group', r'GROUP: ([^\n]*?)\s+SPEAKER'), ('speaker', r'SPEAKER: (\S+)'), ('pairId', r'PAIR_ID: (\S+)'),
                      ('stage', r'STAGE: (\S+)'), ('text', r'\n\s*TH: ([^\n]*)'), ('ph', r'\n\s*PH: ([^\n]*)'),
                      ('en', r'\n\s*EN: ([^\n]*)'), ('src', r'\n\s*SRC: ([^\n]*)')]:
            mm = re.search(rx, blk)
            p[k] = mm.group(1).strip() if mm else None
        out.append(p)
    return out

def parse_jz(text, lang):
    out = []
    for blk in re.split(r'\n(?=PAIR \d+)', section(text))[1:]:
        m = re.match(r'PAIR (\d+)(?:\s+\[([^\]]+)\])?', blk)
        p = {'pos': int(m.group(1)), 'frame': m.group(2)}
        fields = {'SPEAKER': 'speaker', 'ENGLISH CUE': 'cue', 'JAPANESE': 'text', 'CHINESE': 'text', 'READING': 'reading',
                  'ROMAJI': 'romaji', 'ENGLISH MEANING': 'en', 'ENGLISH': 'en', 'PINYIN': 'pinyin', 'SPOKEN PINYIN': 'spoken',
                  'TARGET': 'target', 'BREAKDOWN': 'breakdown'}
        for line in blk.split('\n')[1:]:
            mm = re.match(r'\s+([A-Z][A-Z ]+?):\s+(.*)$', line)
            if mm and mm.group(1) in fields:
                p[fields[mm.group(1)]] = mm.group(2).strip()
        if p.get('target'):
            t = re.match(r'(\S+)(?:\s+\(recall (\d+), check tier (\d+)\))?', p['target'])
            p['target'] = t.group(1)
            if t.group(2): p['recall'] = int(t.group(2))
        p['type'] = 'framing' if p.get('frame') else ('content' if p.get('target') else 'other')
        out.append(p)
    return out

files = {'th': 'thai-track-12-Oct-2026-daily.txt', 'ja': 'japanese-track-2026-10-12-daily.txt', 'zh': 'mandarin-track-2026-10-12.txt'}
for lang, fn in files.items():
    text = open(os.path.join(ind, fn), encoding='utf-8').read()
    pairs = parse_th(text) if lang == 'th' else parse_jz(text, lang)
    # recall index per target, in lesson order
    seen = {}
    for p in pairs:
        if p['type'] == 'content':
            seen[p['target']] = seen.get(p['target'], 0) + 1
            p['k'] = seen[p['target']]
    json.dump(pairs, open(os.path.join(outd, f'{lang}.json'), 'w'), ensure_ascii=False, indent=1)
    c = [p for p in pairs if p['type'] == 'content']
    print(lang, 'pairs', len(pairs), 'content', len(c), 'targets', len(seen), 'not3', {k: v for k, v in seen.items() if v != 3})

# target glosses + available vocabulary
for lang, fn in files.items():
    text = open(os.path.join(ind, fn), encoding='utf-8').read()
    head = text[:text.index('TRACK PAIRS (')]
    i = max(head.rfind('TARGET WORDS ('), head.rfind('TARGET VOCABULARY ('))
    gl = {}
    for line in head[i:].split('\n'):
        m = re.match(r'(\d\d)\. (\S+)\s+\[([^\]]*)\](?:\s+(\S[^—]*?))?\s+—\s+(.*)$', line)
        if m: gl[m.group(2)] = {'n': int(m.group(1)), 'pron': m.group(3), 'romaji': (m.group(4) or '').strip(), 'gloss': m.group(5).strip()}
    vocab = []
    m = re.search(r'VOCABULARY AVAILABLE THIS TRACK \(\d+\)\n-+\n(.*?)\n\n', head, re.S)
    if m: vocab = [re.sub(r'\s*\(.*\)$', '', x.strip()) for x in m.group(1).split('·')]
    json.dump({'targets': gl, 'vocab': vocab}, open(os.path.join(outd, f'{lang}.meta.json'), 'w'), ensure_ascii=False, indent=1)
    print(lang, 'glosses', len(gl), 'vocab', len(vocab))
