import json,sys,os
a=sys.argv[1]
for lang in ['th','ja','zh']:
    P=json.load(open(f'{a}/{lang}.json')); M=json.load(open(f'{a}/{lang}.meta.json'))
    L=[]
    L.append('TARGET WORDS (word [pronunciation] — the sense the learner is studying):')
    for w,g in M['targets'].items(): L.append(f"  {w} [{g['pron']}{(' '+g['romaji']) if g['romaji'] else ''}] — {g['gloss']}")
    if M['vocab']: L.append('ALLOWED VOCABULARY (closed set): '+' · '.join(M['vocab']))
    L.append('\nLESSON, in playback order:')
    for p in P:
        tag = f"pair {p['pos']}"
        if p['type']=='content': tag += f" · TARGET {p['target']} (recall {p['k']} of 3)"
        else: tag += f" · {p['type']}{(' '+p['frame']) if p.get('frame') else ''}"
        L.append(f"\n[{tag}]")
        if p.get('speaker'): L.append(f"  speaker: {p['speaker']}")
        L.append(f"  English cue shown to learner: {p.get('cue')}")
        L.append(f"  {'Thai' if lang=='th' else 'Japanese' if lang=='ja' else 'Chinese'}: {p.get('text')}")
        if lang=='th': L.append(f"  phonetic: {p.get('ph')}")
        if lang=='ja': L.append(f"  reading: {p.get('reading')}\n  romaji: {p.get('romaji')}")
        if lang=='zh':
            L.append(f"  pinyin (dictionary): {p.get('pinyin')}")
            if p.get('spoken'): L.append(f"  spoken pinyin (with tone sandhi): {p.get('spoken')}")
        L.append(f"  English meaning: {p.get('en')}")
    open(f'{a}/{lang}.packet.txt','w').write('\n'.join(L)+'\n')
    print(lang, len(L))
