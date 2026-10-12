#!/usr/bin/env python3
"""Mechanical (deterministic) checks of the 270 exported exercises, using independent
open-source references: fugashi+unidic-lite (Japanese readings), pypinyin (Mandarin
dictionary pinyin) + standard sandhi rules, pythainlp (Thai syllables + tone rules).
Usage: mech.py <audit_dir>   -> writes <audit_dir>/mechanical.json"""
import sys, json, re, unicodedata
from collections import Counter, defaultdict

A = sys.argv[1]
out = {'ja': [], 'zh': [], 'th': []}

def flag(lang, p, check, sev, msg):
    out[lang].append({'pair': p['pos'], 'target': p.get('target'), 'check': check, 'severity': sev, 'detail': msg})

# ---------------- Japanese ----------------
from fugashi import Tagger, GenericTagger
import ipadic
tag = Tagger()
tag2 = GenericTagger(ipadic.MECAB_ARGS)
def kata2hira(s): return ''.join(chr(ord(c) - 0x60) if 'ァ' <= c <= 'ヶ' else c for c in s)
KANA = {}
for row in ("あa いi うu えe おo かka きki くku けke こko さsa しshi すsu せse そso たta ちchi つtsu てte とto なna にni ぬnu ねne のno "
            "はha ひhi ふfu へhe ほho まma みmi むmu めme もmo やya ゆyu よyo らra りri るru れre ろro わwa をo んn "
            "がga ぎgi ぐgu げge ごgo ざza じji ずzu ぜze ぞzo だda ぢji づzu でde どdo ばba びbi ぶbu べbe ぼbo ぱpa ぴpi ぷpu ぺpe ぽpo "
            "ぁa ぃi ぅu ぇe ぉo ゃya ゅyu ょyo ー-").split():
    KANA[row[0]] = row[1:]
def romanize(h):
    r, i = '', 0
    while i < len(h):
        c = h[i]; n = h[i + 1] if i + 1 < len(h) else ''
        if n in 'ゃゅょ' and n and c in KANA:
            base = KANA[c]
            if base in ('shi', 'chi', 'ji'): r += base[:-1] + KANA[n][1:]
            else: r += base[:-1] + KANA[n]
            i += 2; continue
        if c == 'っ':
            nx = KANA.get(n, '')
            r += ('t' if nx.startswith('ch') else nx[:1]); i += 1; continue
        if c == 'ー': r += r[-1:] if r else ''; i += 1; continue
        r += KANA.get(c, ''); i += 1
    return r
def jnorm(s): return re.sub(r'[\s、。！？!?,.・「」『』…〜~]', '', kata2hira(s or ''))
def rnorm(s): return re.sub(r'[^a-z]', '', (s or '').lower().replace('ā', 'aa').replace('ō', 'ou').replace('ū', 'uu'))

for p in json.load(open(f'{A}/ja.json')):
    text, reading, romaji = p.get('text') or '', p.get('reading') or '', p.get('romaji') or ''
    toks = list(tag(text))
    ref = ''.join(kata2hira(t.feature.kana or t.surface) for t in toks)
    ref2 = ''.join(kata2hira(w.feature[7] if len(w.feature) > 7 and w.feature[7] != '*' else w.surface) for w in tag2(text))
    if jnorm(ref) != jnorm(reading) and jnorm(ref2) != jnorm(reading):
        flag('ja', p, 'reading_vs_sentence', 'critical', f'reading "{reading}" ≠ independent readings "{ref}" / "{ref2}" of "{text}"')
    # romaji should be the reading romanised (は/へ particles may be wa/e)
    particles = {i for i, t in enumerate(toks) if t.feature.pos1 == '助詞' and t.surface in ('は', 'へ', 'を')}
    rom_ref = ''
    for i, t in enumerate(toks):
        k = kata2hira(t.feature.kana or t.surface)
        if i in particles: rom_ref += {'は': 'wa', 'へ': 'e', 'を': 'o'}[t.surface]
        else: rom_ref += romanize(k)
    rom_read = romanize(jnorm(reading))
    if rnorm(romaji).replace('cch','tch').replace('wa','ha') not in (rnorm(rom_ref).replace('wa','ha'), rnorm(rom_read).replace('wa','ha')) and rnorm(romaji).replace('ou', 'o') != rnorm(rom_ref).replace('ou', 'o'):
        flag('ja', p, 'romaji_vs_sentence', 'critical', f'romaji "{romaji}" ≠ expected "{rom_ref}"')

# ---------------- Mandarin ----------------
from pypinyin import pinyin, Style
TONEMARK = {'ā': 1, 'á': 2, 'ǎ': 3, 'à': 4, 'ē': 1, 'é': 2, 'ě': 3, 'è': 4, 'ī': 1, 'í': 2, 'ǐ': 3, 'ì': 4, 'ō': 1, 'ó': 2, 'ǒ': 3, 'ò': 4,
            'ū': 1, 'ú': 2, 'ǔ': 3, 'ù': 4, 'ǖ': 1, 'ǘ': 2, 'ǚ': 3, 'ǜ': 4, 'ń': 2, 'ň': 3, 'ǹ': 4}
def tone(s):
    for c in s:
        if c in TONEMARK: return TONEMARK[c]
    return 5
def bare(s):
    s = unicodedata.normalize('NFD', s)
    return ''.join(c for c in s if unicodedata.category(c) != 'Mn').replace('ü', 'v').lower()
from pypinyin.pinyin_dict import pinyin_dict as _PD
VALID = set()
for _v in _PD.values():
    for _r in _v.split(','): VALID.add(bare(_r))
VALID |= {'ng', 'm', 'n', 'r'}
def split_syllables(word):
    w = word.lower(); b = bare(w)
    from functools import lru_cache
    @lru_cache(None)
    def rec(i):
        if i == len(b): return ()
        for j in range(min(len(b), i + 6), i, -1):
            if b[i:j] in VALID:
                r = rec(j)
                if r is not None: return ((i, j),) + r
        return None
    r = rec(0)
    return None if r is None else [w[i:j] for i, j in r]
def syllables(pystr):
    sylls = []
    for chunk in re.findall(r"[a-zA-Züāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜńňǹ]+", pystr or ''):
        s = split_syllables(chunk)
        if s is None: return None
        sylls += s
    return sylls
HAN = re.compile(r'[一-鿿]')
NEUTRAL_OK = set('的了吗呢吧么们子个么啊呀')
for p in json.load(open(f'{A}/zh.json')):
    text = p.get('text') or ''
    chars = HAN.findall(text)
    dic = syllables(p.get('pinyin'))
    if dic is None or len(dic) != len(chars):
        flag('zh', p, 'pinyin_alignment', 'major', f'cannot align pinyin "{p.get("pinyin")}" to {len(chars)} characters'); continue
    # dictionary pinyin: every syllable must be a valid reading of its character (heteronyms allowed; neutral tone allowed for particles/suffix)
    for c, s in zip(chars, dic):
        cands = pinyin(c, style=Style.TONE, heteronym=True)[0]
        cb = {bare(x) for x in cands}
        if bare(s) not in cb:
            flag('zh', p, 'dictionary_pinyin', 'critical', f'{c} given "{s}", dictionary readings {cands}')
        elif tone(s) != 5 and tone(s) not in {tone(x) for x in cands if bare(x) == bare(s)}:
            flag('zh', p, 'dictionary_pinyin', 'critical', f'{c} given tone {tone(s)} "{s}", dictionary readings {cands}')
    # citation tones that the spoken line must change (standard rules)
    base = [tone(s) for s in dic]
    for i, c in enumerate(chars):
        if c == '一' and base[i] == 1 and i + 1 < len(chars):
            if p.get('spoken') is None:
                pass
    expect = list(base)
    for i, c in enumerate(chars):
        nxt = base[i + 1] if i + 1 < len(chars) else None
        if c == '一' and nxt and not (i > 0 and chars[i - 1] in '第') and not re.search('一[一二三四五六七八九十]', text):
            expect[i] = 2 if nxt == 4 else (4 if nxt in (1, 2, 3) else expect[i])
        if c == '不' and nxt == 4: expect[i] = 2
    # 3-3 sandhi: a 3rd tone before a (citation) 3rd tone becomes 2nd (prosodic grouping ambiguous for runs; flag only certain cases)
    sandhi33 = [i for i in range(len(chars) - 1) if base[i] == 3 and base[i + 1] == 3]
    for i in sandhi33: expect[i] = 2
    needs_spoken = expect != base
    spoken = p.get('spoken')
    if needs_spoken and not spoken:
        changed = ', '.join(f'{chars[i]} {dic[i]}→tone {expect[i]}' for i in range(len(chars)) if expect[i] != base[i])
        flag('zh', p, 'spoken_pinyin_missing', 'major', f'sandhi applies ({changed}) but no spoken pinyin shown')
    if spoken:
        sp = syllables(spoken)
        if sp is None or len(sp) != len(chars):
            flag('zh', p, 'spoken_alignment', 'major', f'cannot align spoken "{spoken}"'); continue
        for i, (c, s) in enumerate(zip(chars, sp)):
            if bare(s) != bare(dic[i]):
                flag('zh', p, 'spoken_pinyin', 'critical', f'{c}: spoken "{s}" spells a different syllable from "{dic[i]}"')
            elif tone(s) != expect[i]:
                # runs of 3rd tones have more than one acceptable grouping: allow 2/3 inside a 3-run
                in_run = base[i] == 3 and ((i + 1 < len(chars) and base[i + 1] == 3) or (i > 0 and base[i - 1] == 3))
                if in_run and tone(s) in (2, 3): continue
                flag('zh', p, 'spoken_pinyin', 'critical', f'{c}: spoken "{s}" (tone {tone(s)}) but rules give tone {expect[i]} (citation "{dic[i]}")')

# ---------------- Thai ----------------
from pythainlp.tokenize import syllable_tokenize
from pythainlp.util import tone_detector
PHT = {'̀': 'l', '́': 'h', '̂': 'f', '̌': 'r'}
def ph_tone(s):
    d = unicodedata.normalize('NFD', s)
    for c in d:
        if c in PHT: return PHT[c]
    return 'm'
for p in json.load(open(f'{A}/th.json')):
    th, ph = p.get('text') or '', p.get('ph') or ''
    sy = [x for x in syllable_tokenize(re.sub(r'[\s,.?!]', '', th)) if x.strip()]
    ps = [x for x in re.split(r'[\s\-]+', ph.strip()) if re.search(r'[a-z]', x)]
    if len(sy) != len(ps):
        out['th'].append({'pair': p['pos'], 'target': p.get('target'), 'check': 'phonetic_alignment', 'severity': 'info',
                          'detail': f'{len(sy)} Thai syllables {sy} vs {len(ps)} phonetic syllables'})
        continue
    for a, b in zip(sy, ps):
        t = tone_detector(a)
        if t and ph_tone(b) != t:
            flag('th', p, 'phonetic_tone', 'review', f'{a} written "{b}" (tone {ph_tone(b)}), spelling rules give tone {t}')

# ---------------- shared: speaker / cue addressee ----------------
for lang in ('ja', 'th'):
    for p in json.load(open(f'{A}/{lang}.json')):
        cue = p.get('cue') or ''
        sp = (p.get('speaker') or '')[:1]
        names = {'ja': {'A': 'Kenji', 'B': 'Yumi'}, 'th': {'A': 'Somchai', 'B': 'Nida'}}[lang]
        if sp in names and re.search(r'\b(ask|tell|greet|say to)\s+' + names[sp] + r'\b', cue, re.I):
            flag(lang, p, 'speaker_addresses_self', 'major', f'speaker {sp} ({names[sp]}) is told: "{cue}"')
        if lang == 'th' and sp == 'A' and re.search('(ค่ะ|คะ|ดิฉัน)', p.get('text') or ''):
            flag(lang, p, 'speaker_gender_particle', 'critical', 'male speaker uses a female particle')
        if lang == 'th' and sp == 'B' and re.search('(ครับ|ผม)', p.get('text') or ''):
            flag(lang, p, 'speaker_gender_particle', 'critical', 'female speaker uses a male particle/pronoun')

# ---------------- shared: repeated frames ----------------
for lang in ('ja', 'zh', 'th'):
    P = [p for p in json.load(open(f'{A}/{lang}.json')) if p['type'] == 'content']
    byt = defaultdict(list)
    for p in P: byt[p['target']].append(p)
    for t, ps in byt.items():
        for i in range(len(ps)):
            for j in range(i + 1, len(ps)):
                a = re.sub(r'[\s、。！？!?,.]', '', ps[i]['text']); b = re.sub(r'[\s、。！？!?,.]', '', ps[j]['text'])
                ra, rb = a.replace(t, '§'), b.replace(t, '§')
                # same frame: identical once a single leading interjection is removed, or edit distance ≤ 2 chars
                import difflib
                ratio = difflib.SequenceMatcher(None, ra, rb).ratio()
                if ratio >= 0.8:
                    out[lang].append({'pair': ps[j]['pos'], 'target': t, 'check': 'near_duplicate_recall', 'severity': 'major',
                                      'detail': f'recall {ps[j]["k"]} "{ps[j]["text"]}" ≈ recall {ps[i]["k"]} "{ps[i]["text"]}" (similarity {ratio:.2f})'})

json.dump(out, open(f'{A}/mechanical.json', 'w'), ensure_ascii=False, indent=1)
for lang in out:
    c = Counter((x['check'], x['severity']) for x in out[lang])
    print(lang, dict(c))
