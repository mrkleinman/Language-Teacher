#!/usr/bin/env python3
"""Rule-based Thai tone for ONE written syllable (standard consonant-class rules), and a scan of
the app's canonical vocabulary bank: monosyllabic entries whose written tone disagrees with the rules.
Usage: thtone.py <tt.jsx> <out.json>"""
import sys, json, re, unicodedata
MID = set('กจฎฏดตบปอ'); HIGH = set('ขฃฉฐถผฝศษสห'); CONS = set(chr(c) for c in range(0x0E01, 0x0E2F))
LOW = CONS - MID - HIGH
SONOR = set('งญนมยรลวฬ'); LEAD = set('เแโใไ')
LIVE_FINAL = set('งนมยวญณรลฬ')
MARKS = {'่': 1, '้': 2, '๊': 3, '๋': 4}

def tone_of(syl):
    s = re.sub('.์', '', syl)            # silent letter + thanthakhat
    s = s.replace('์', '')
    mark = next((MARKS[c] for c in s if c in MARKS), 0)
    s2 = ''.join(c for c in s if c not in MARKS)
    i = 1 if s2 and s2[0] in LEAD else 0
    cons = [j for j, c in enumerate(s2) if c in CONS]
    if not cons: return None
    first = s2[cons[0]]
    cls = 'm' if first in MID else 'h' if first in HIGH else 'l'
    nxt = s2[cons[0] + 1] if cons[0] + 1 < len(s2) else ''
    initial_len = 1
    if first == 'ห' and nxt in SONOR: cls = 'h'; initial_len = 2
    elif first == 'อ' and nxt == 'ย': cls = 'm'; initial_len = 2
    elif nxt in 'รลว' and first not in 'ว' and len(s2) > cons[0] + 2: initial_len = 2   # cluster: class of first
    rest = s2[cons[0] + initial_len:]
    pre = s2[:cons[0]]
    # vowel length and final
    short_v = bool(re.search('[ะัิึุ็]', rest)) or ('เ' in pre and rest.endswith('าะ'))
    long_v = bool(re.search('[าีืู]', rest)) or (pre in ('เ', 'แ', 'โ') and not short_v) or 'อ' in rest[:-1] or rest.endswith('อ') or 'ว' in rest[:1] and len(rest) > 1
    if re.search('[ำ]', rest) or pre in ('ใ', 'ไ') or (pre == 'เ' and rest.endswith('า')): return {1: 'l' if cls != 'l' else 'f', 2: 'f' if cls != 'l' else 'h', 3: 'h', 4: 'r'}.get(mark) or ('r' if cls == 'h' else 'm')
    finals = [c for c in rest if c in CONS and c != 'อ']
    fin = finals[-1] if finals else ''
    if fin == 'ว' and len(finals) == 1 and not re.search('[ั]', rest) and pre == '' and len(rest) == 1: fin = ''  # ตัว-like handled loosely
    if fin == 'ย' or fin == 'ว': live = True
    elif fin: live = fin in LIVE_FINAL
    else: live = not short_v
    if not short_v and not long_v and fin and not re.search('[ะ-ู]', rest): short_v = True   # implicit o (รถ, คน)
    if mark == 1: return 'l' if cls != 'l' else 'f'
    if mark == 2: return 'f' if cls != 'l' else 'h'
    if mark == 3: return 'h'
    if mark == 4: return 'r'
    if live: return 'r' if cls == 'h' else 'm'
    if cls in ('m', 'h'): return 'l'
    return 'h' if short_v else 'f'

PHT = {'̀': 'l', '́': 'h', '̂': 'f', '̌': 'r'}
def ph_tone(ph):
    for c in unicodedata.normalize('NFD', ph):
        if c in PHT: return PHT[c]
    return 'm'

if __name__ == '__main__':
    src = open(sys.argv[1], encoding='utf-8').read().split('\n')
    bank = json.loads(re.sub(r'^const RAW_VOCAB = ', '', src[59]).rstrip().rstrip(';'))
    IRREG = {'ก็': 'f', 'เขา': 'r', 'ค่ะ': 'f', 'นะ': 'h', 'คะ': 'h', 'ไหม': 'r', 'ฉัน': 'r', 'เปล่า': 'l', 'เหรอ': 'r'}
    out = []
    for d in bank:
        t, ph = d.get('t', ''), d.get('ph', '')
        if not t or not ph or re.search(r'[\s\-]', ph.strip()) or ' ' in t: continue
        want = IRREG.get(t) or tone_of(t)
        got = ph_tone(ph)
        if want and want != got:
            out.append({'id': d.get('id'), 'thai': t, 'bank_phonetic': ph, 'gloss': d.get('e'), 'belt': d.get('belt'),
                        'bank_tone': got, 'rule_tone': want})
    json.dump(out, open(sys.argv[2], 'w'), ensure_ascii=False, indent=1)
    mono = sum(1 for d in bank if d.get('ph') and not re.search(r'[\s\-]', d['ph'].strip()))
    print('monosyllabic entries', mono, 'disagreements', len(out))
    for x in out: print(x['id'], x['thai'], x['bank_phonetic'], x['bank_tone'], '→ rule', x['rule_tone'], '|', x['gloss'], '|', x['belt'])
