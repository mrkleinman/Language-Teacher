#!/usr/bin/env python3
"""Merge the mechanical checks and the independent AI reviews into one per-exercise audit.
Usage: combine.py <audit_dir>  -> audit.json, audit.md"""
import sys, json, collections
A = sys.argv[1]
CAUSE = {
    'pronunciation': 'PRON — reading/phonetic/pinyin produced by the model or a word-level lookup and never verified against the frozen sentence',
    'sense': 'SENSE — the sense is not planned; target presence is checked by spelling, and a fixed word hint can push another sense',
    'coherence': 'CONV — recalls are generated one at a time and assembled/reordered afterwards; no check of adjacent turns on the final lesson',
    'distinct': 'DIST — "distinct use" is judged by string difference, not by communicative function',
    'cue': 'CUE — the cue is derived from the translation/ad-hoc and judged against the sentence alone, not the speaker, addressee or context',
    'meaning': 'CUE — English meaning written by the generator; checked only for gross mismatch',
    'speaker': 'ROLE — speaker, addressee and register are not part of the plan; the cue is not checked against the speaker',
    'natural': 'INTENT — no communicative intent: the model fills content from whatever allowed words are at hand',
    'grammar': 'INTENT — no communicative intent; naturalness judge sees one sentence and passes most',
    'value': 'INTENT — no communicative intent / no usefulness criterion in any gate',
    'intent': 'INTENT — no communicative intent in the plan',
    'register': 'ROLE — register not derived from the addressee',
}
MECH2CRIT = {'reading_vs_sentence': 'pronunciation', 'romaji_vs_sentence': 'pronunciation', 'spoken_pinyin': 'pronunciation',
             'spoken_pinyin_missing': 'pronunciation', 'dictionary_pinyin': 'pronunciation', 'speaker_addresses_self': 'speaker',
             'near_duplicate_recall': 'distinct', 'speaker_gender_particle': 'speaker'}
RANK = {'critical': 3, 'major': 2, 'minor': 1, 'clean': 0}
mech = json.load(open(f'{A}/mechanical.json'))
allrows, summary = {}, {}
for lang in ('th', 'ja', 'zh'):
    pairs = json.load(open(f'{A}/{lang}.json'))
    rev = {p['pair']: p for p in json.load(open(f'{A}/{lang}.ai-review.json'))['pairs']}
    rows = []
    for p in pairs:
        r = rev.get(p['pos'], {'issues': []})
        issues = [dict(i, source='AI review (Claude, not native)') for i in r.get('issues', [])]
        for m in mech[lang]:
            if m['pair'] == p['pos'] and m['check'] in MECH2CRIT:
                issues.append({'criterion': MECH2CRIT[m['check']], 'severity': m['severity'], 'objective': True,
                               'explain': m['detail'], 'correction': '', 'source': 'mechanical (' + m['check'] + ')'})
        for i in issues: i['cause'] = CAUSE.get(i['criterion'], 'OTHER')
        worst = max([RANK.get(i['severity'], 0) for i in issues] + [0])
        rows.append({'lang': lang, 'pair': p['pos'], 'type': p['type'], 'target': p.get('target'), 'recall': p.get('k'),
                     'speaker': p.get('speaker'), 'cue': p.get('cue'), 'text': p.get('text'),
                     'pron': p.get('ph') or p.get('reading') or p.get('pinyin'), 'spoken': p.get('spoken') or p.get('romaji'),
                     'en': p.get('en'), 'severity': ['clean', 'minor', 'major', 'critical'][worst], 'issues': issues})
    allrows[lang] = rows
    c = [x for x in rows if x['type'] == 'content']
    sv = collections.Counter(x['severity'] for x in c)
    obj = collections.Counter(); subj = collections.Counter(); cause = collections.Counter()
    for x in c:
        for i in x['issues']:
            if i['severity'] in ('critical', 'major'):
                (obj if i.get('objective') else subj)[i['criterion']] += 1
                cause[i['cause'].split(' ')[0]] += 1
    summary[lang] = {'exercises': len(c), 'severity': dict(sv), 'clean_pct': round(100 * sv.get('clean', 0) / len(c), 1),
                     'clean_or_minor_pct': round(100 * (sv.get('clean', 0) + sv.get('minor', 0)) / len(c), 1),
                     'objective_major_or_critical_by_criterion': dict(obj.most_common()),
                     'subjective_major_by_criterion': dict(subj.most_common()), 'by_cause': dict(cause.most_common())}
json.dump({'summary': summary, 'rows': allrows}, open(f'{A}/audit.json', 'w'), ensure_ascii=False, indent=1)

L = ['# v683 transcript audit — all 270 target exercises', '',
     'Sources per issue: **mechanical** = deterministic check against independent open-source references (fugashi + unidic-lite / ipadic, pypinyin + standard sandhi rules); **AI review** = independent Claude reviewer per language (AI judgement, not native-speaker certification). Severity: critical = teaches something wrong; major = clearly unnatural, unproducible cue, contradiction, same-use repeat, incoherent turn; minor = subjective or low value.', '']
NAMES = {'th': 'Thai', 'ja': 'Japanese', 'zh': 'Mandarin'}
for lang, rows in allrows.items():
    s = summary[lang]
    L += [f'## {NAMES[lang]}', '', f"- Exercises: {s['exercises']} · clean {s['severity'].get('clean',0)} · minor {s['severity'].get('minor',0)} · major {s['severity'].get('major',0)} · critical {s['severity'].get('critical',0)}",
          f"- Objective major/critical issues by criterion: {s['objective_major_or_critical_by_criterion']}",
          f"- Subjective major issues by criterion: {s['subjective_major_by_criterion']}", '',
          '| Pair | Target (recall) | Sentence | Severity | Issues (criterion · objective/subjective · source → correction) |', '|---|---|---|---|---|']
    for x in rows:
        iss = '<br>'.join(f"**{i['criterion']}** {i['severity']} · {'obj' if i.get('objective') else 'subj'} · {i['source'].split(' ')[0]}: {i['explain']}" + (f" → {i['correction']}" if i.get('correction') else '') for i in sorted(x['issues'], key=lambda i: -RANK.get(i['severity'], 0)))
        tg = f"{x['target']} ({x['recall']})" if x['type'] == 'content' else x['type']
        L.append(f"| {x['pair']} | {tg} | {x['text']} <br><sub>{x['pron'] or ''}</sub> | {x['severity']} | {iss.replace('|', '/') or '—'} |")
    L.append('')
open(f'{A}/audit.md', 'w').write('\n'.join(L) + '\n')
print(json.dumps(summary, ensure_ascii=False, indent=1))
