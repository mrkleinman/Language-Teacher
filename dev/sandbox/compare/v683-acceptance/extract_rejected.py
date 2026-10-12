#!/usr/bin/env python3
"""Rejected candidates of a recorded sandbox run (offline, no model).
Candidates = every sentence the generator model proposed (from the recorded replies); accepted = the run's final target pairs
(or, for a Mandarin run that built no track, the accepted lines of its log); rejected = the rest. The reason is the log line
that names the sentence (Japanese / Thai) or, for Mandarin, the verdict that follows each generation check in order.
Reason classes: RULE (untaught word, target missing, length, duplicate / same application, register-by-rule) or QUALITY
(an AI or grammar judgement about naturalness, grammar, meaning or cue).
usage: extract_rejected.py <run dir> <out.json>"""
import json, re, sys
d, outp = sys.argv[1], sys.argv[2]
lang = d.split('/')[-1][:2]
run = json.load(open(d + '/run.json')); E = run['cassette']['entries']; log = open(d + '/log.txt', encoding='utf8').read().split('\n')
field = {'ja': 'japanese', 'zh': 'chinese', 'th': 'thai'}[lang]
norm = lambda s: re.sub(r'[\s。！？?!、，,.…]', '', s or '')
def ptxt(e):
    b = e['request']; b = json.loads(b) if isinstance(b, str) else b
    return '\n'.join(p.get('text', '') for c in b.get('contents', []) for p in c.get('parts', []))
def rtxt(e):
    r = e['response']; r = json.loads(r) if isinstance(r, str) else r
    try: return r['body']['candidates'][0]['content']['parts'][0]['text']
    except Exception: return ''
def objs(t):
    t = re.sub(r'```json|```', '', t).strip()
    try: j = json.loads(t)
    except Exception: return []
    out = []
    def walk(x):
        if isinstance(x, dict):
            if x.get(field): out.append(x)
            for v in x.values(): walk(v)
        elif isinstance(x, list):
            for v in x: walk(v)
    walk(j); return out
GEN = {'ja': r'JAPANESE TARGET: ★ (\S+)', 'zh': r'TARGET: ★ (\S+)', 'th': None}
cands = []
for e in E:
    p = ptxt(e)
    if re.search(r'^(LANGUAGE: \w+\s*\n)?(Evaluate|Rate how well|Judge|Check)', p[:80]): continue
    m = re.search(GEN[lang], p) if GEN[lang] else None
    for o in objs(rtxt(e)):
        s = o.get(field); tgt = (m.group(1) if m else o.get('target') or o.get('word') or None)
        cands.append({'seq': e['seq'], 'target': tgt, 'text': s, 'english': o.get('english') or o.get('englishMeaning'), 'cue': o.get('prompt') or o.get('englishCue') or o.get('cue')})
c = run['outcome']['content'] or {}
acc = {norm(p['text']) for p in (c.get('pairs') or []) if p.get('targetId') is not None}
if not acc and lang == 'zh':
    acc = {norm(m.group(1)) for ln in log for m in [re.search(r'✅ .*passed: (.+)$', ln)] if m}
QUALITY = re.compile(r'UNNATURAL|unnatural|ungrammatical|grammar|GRAMMAR|semantic|SEMANTIC|meaning|cue|CUE|register|REGISTER|naturalness|2/5|1/5|3/5|judge|WRONG_SENSE|fragment|incomplete|misleading', re.I)
RULE = re.compile(r'untaught|UNTAUGHT|not present|TARGET_MISSING|duplicate|DUPLICATE|already used|same application|too long|LEVEL_COMPLEXITY|hardMax|segments do not|SPEAKER|speaker|particle', re.I)
# Mandarin: verdict lines follow each paid check in request order
zhq = []
if lang == 'zh':
    for ln in log:
        if re.search(r'check: \S+ · recall \d', ln) and 'no request' not in ln: zhq.append(None)
        elif zhq and zhq[-1] is None and re.search(r'^\s+(❌|✅)', ln): zhq[-1] = ln.strip()
rej, seen = [], set()
zi = 0
for k, x in enumerate(cands):
    reason = None
    if lang == 'zh':
        reason = zhq[zi] if zi < len(zhq) else None; zi += 1
    key = norm(x['text'])
    if key in acc or key in seen: continue
    seen.add(key)
    if not reason and lang == 'th':
        # v683 plan (fix 6): each rejected Thai candidate has its own log line with stage and reason
        th = [ln.strip() for ln in log if 'TH_CANDIDATE_REJECTED' in ln and ('"' + (x['text'] or '').strip() + '"') in ln]
        reason = th[0] if th else None
    if not reason:
        hits = [ln.strip() for ln in log if key[:10] and key[:10] in norm(ln) and ('❌' in ln or 'REJECT' in ln or '⛔' in ln or 'rejected' in ln or 'DROP' in ln)]
        reason = hits[0] if hits else None
    cls = 'UNKNOWN' if not reason else ('QUALITY' if QUALITY.search(reason) and not re.search(r'untaught|not present', reason) else ('RULE' if RULE.search(reason) else 'OTHER'))
    rej.append({**x, 'reason': (reason or '')[:240], 'class': cls})
json.dump({'run': d.split('/')[-1], 'lang': lang, 'candidates': len(cands), 'acceptedDistinct': len(acc), 'rejected': rej}, open(outp, 'w'), ensure_ascii=False, indent=1)
from collections import Counter
print(d.split('/')[-1][:60], '| candidates', len(cands), '| rejected distinct', len(rej), dict(Counter(r['class'] for r in rej)))
