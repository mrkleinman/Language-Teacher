# python3 apply.py — writes slots 801–2500 into the RAW_VOCAB line of dev/tt.jsx (data only). Reused records keep every field and
# only gain curriculumIndex / belt / beltOrder / curriculumBucket (+ composable); topic records are copied in once with their id;
# new records start unintroduced (l "hard", i/r/lp 0) with the owner's gloss and the prepared reading. Re-serialised with the same
# json.dumps settings the line already uses (verified byte-identical before any change).
import json, os
DIR = os.path.dirname(os.path.abspath(__file__)); TT = os.path.join(DIR, '..', '..', '..', 'tt.jsx')
s = open(TT, encoding='utf-8').read(); a = s.index('const RAW_VOCAB = '); b = s.index('\n', a)
lit = s[a + len('const RAW_VOCAB = '):b]; data = json.loads(lit)
assert json.dumps(data, ensure_ascii=False) == lit
plan = json.load(open(os.path.join(DIR, 'plan.json'), encoding='utf-8'))
prep = json.load(open(os.path.join(DIR, 'prep.json'), encoding='utf-8'))
LADDER = [('White', 1, 100), ('Orange', 101, 200), ('Orange + Stripe', 201, 400), ('Blue', 401, 600), ('Blue + Stripe', 601, 800), ('Yellow', 801, 1000),
          ('Yellow + Stripe', 1001, 1200), ('Green', 1201, 1525), ('Green + Stripe', 1526, 1850), ('Brown', 1851, 2175), ('Brown + Stripe', 2176, 2500)]
def belt(i):
    for n, lo, hi in LADDER:
        if lo <= i <= hi: return n, i - lo + 1
    raise ValueError(i)
byid = {d['id']: d for d in data}
assert not any(d.get('curriculumIndex', 0) > 800 for d in data)
next_id = max(d['id'] for d in data) + 1
stats = {'reused': 0, 'topic': 0, 'new': 0, 'needsReview': 0, 'composable': 0}
for p in plan:
    i = p['slot']; bn, bo = belt(i); r = prep['records'][str(i)]
    bucket = 'LANGUAGE_CONTEXT' if p['ctx'] else 'GENERAL_CONVERSATION'
    if p['id'] is not None and p['id'] in byid:
        d = byid[p['id']]
        assert not d.get('curriculumIndex'), (i, p['t'], d.get('curriculumIndex'))
        d['curriculumIndex'] = i; d['belt'] = bn; d['beltOrder'] = bo; d['curriculumBucket'] = bucket
        stats['reused'] += 1
    elif p['id'] is not None:
        d = dict(prep['topic'][str(p['id'])]); d.pop('topicOnly', None)
        d.update({'curriculumIndex': i, 'belt': bn, 'beltOrder': bo, 'curriculumBucket': bucket})
        data.append(d); byid[d['id']] = d; stats['topic'] += 1
    else:
        ok = r['phSource'] == 'dictionary-parts' or r['toneOk']
        d = {'id': next_id, 't': p['t'], 'e': p['en'], 'ph': r['ph'], 'l': 'hard', 'i': 0, 'r': 0, 'lp': 0, 'curriculumIndex': i, 'belt': bn, 'beltOrder': bo,
             'qcVersion': 'thai-canonical-v1', 'semanticQc': 'PASS', 'phoneticQc': 'PASS' if ok else 'NEEDS_REVIEW', 'qcStatus': 'PASS' if ok else 'NEEDS_REVIEW',
             'qcIssues': [] if ok else ['PHONETIC:TONE_CHECKER_DISAGREES'], 'conversationGroup': 'A', 'lexiconDisposition': 'ACTIVE', 'curriculumBucket': bucket}
        if not ok: stats['needsReview'] += 1
        next_id += 1; data.append(d); byid[d['id']] = d; stats['new'] += 1
    if r['composable']: d['composable'] = True; stats['composable'] += 1
s = s[:a] + 'const RAW_VOCAB = ' + json.dumps(data, ensure_ascii=False) + s[b:]
open(TT, 'w', encoding='utf-8').write(s)
print(stats, 'ids', max(d['id'] for d in data))
