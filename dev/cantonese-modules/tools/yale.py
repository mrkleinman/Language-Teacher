#!/usr/bin/env python3
"""Jyutping -> Yale romanisation (with tone marks, low tones marked with h), for the Cantonese word list.

Rules (standard Yale):
  initials  z -> j, c -> ch, j -> y; b p m f d t n l g k ng h gw kw w s unchanged
  finals    oe -> eu, eo -> eu (oeng -> eung, oek -> euk, eoi -> eui, eon -> eun, eot -> eut); aa -> a (a long a before a final is written aa: aai aau aam aan aang aap aat aak);
            a (short) -> a; yu stays yu, and y + yu is written yu (jyu -> yu); everything else is written as in Jyutping (ou stays ou, ei, ai, au, ...)
  tones     1 high  = macron (a-bar)      2 mid rising = acute      3 mid level = no mark
            4 low falling = grave + h     5 low rising = acute + h   6 low level = no mark + h
  the h of a low tone follows the vowel(s) (nàahm, sàhm, jeuhng); at the end of a syllable it is final (néih, hóu -> hóu has no h: tone 2)
  syllabic m and ng: m4 -> m̀h, ng5 -> ńgh, m2 -> ḿ
"""
import re, unicodedata
INIT = ['ng', 'gw', 'kw', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'w', 'z', 'c', 's', 'j']
INIT_YALE = {'z': 'j', 'c': 'ch', 'j': 'y'}
FINAL_MAP = {'oe': 'eu', 'oeng': 'eung', 'oek': 'euk', 'eoi': 'eui', 'eon': 'eun', 'eot': 'eut', 'eo': 'eu'}
LONG_A = {'aai', 'aau', 'aam', 'aan', 'aang', 'aap', 'aat', 'aak'}
MACRON = {'a': 'ā', 'e': 'ē', 'i': 'ī', 'o': 'ō', 'u': 'ū', 'm': 'm̄', 'n': 'n̄'}
ACUTE = {'a': 'á', 'e': 'é', 'i': 'í', 'o': 'ó', 'u': 'ú', 'm': 'ḿ', 'n': 'ń'}
GRAVE = {'a': 'à', 'e': 'è', 'i': 'ì', 'o': 'ò', 'u': 'ù', 'm': 'm̀', 'n': 'ǹ'}
VOWELS = 'aeiou'

def split_syllable(s):
    m = re.fullmatch(r'([a-z]+)([1-6])', s)
    if not m: raise ValueError('not a Jyutping syllable: ' + s)
    body, tone = m.group(1), int(m.group(2))
    if body in ('m', 'ng', 'hm', 'hng'): return '', body, tone
    for ini in INIT:
        if body.startswith(ini) and len(body) > len(ini) and body[len(ini):][0] in 'aeiouy':
            return ini, body[len(ini):], tone
    return '', body, tone

def syllable(s):
    ini, fin, tone = split_syllable(s)
    if fin in ('m', 'ng'):                                    # syllabic nasals: m4 -> m̀h, ng5 -> ńgh
        base = fin; mark = {1: MACRON, 2: ACUTE, 4: GRAVE, 5: ACUTE}.get(tone)
        first = base[0]; out = (mark[first] if mark else first) + base[1:]
        return unicodedata.normalize('NFC', out + ('h' if tone in (4, 5, 6) else ''))
    y_ini = INIT_YALE.get(ini, ini)
    y_fin = fin
    if fin in FINAL_MAP: y_fin = FINAL_MAP[fin]
    elif fin.startswith('oe'): y_fin = 'eu' + fin[2:]
    elif fin.startswith('eo'): y_fin = 'eu' + fin[2:]
    elif fin == 'aa': y_fin = 'a'
    elif fin.startswith('aa') and fin not in LONG_A: y_fin = fin                 # aa + something unusual: keep
    if ini == 'j' and fin.startswith('yu'): y_ini = ''                            # jyu -> yu (not yyu)
    # find the vowel to carry the mark: the first vowel letter of the final (u in yu, e in eu, ...)
    chars = list(y_fin)
    idx = next((i for i, ch in enumerate(chars) if ch in VOWELS), None)
    if idx is None: idx = 0
    mark_tbl = {1: MACRON, 2: ACUTE, 4: GRAVE, 5: ACUTE}.get(tone)
    if mark_tbl and chars[idx] in mark_tbl: chars[idx] = mark_tbl[chars[idx]]
    if tone in (4, 5, 6):                                                             # the h of a low tone: after the vowel group, before a final consonant
        j = idx
        while j + 1 < len(chars) and chars[j + 1] in 'aeiouyiu': j += 1
        # the vowel group of the final: letters up to the first consonant (m n ng p t k)
        k = idx
        while k < len(chars) and unicodedata.normalize('NFD', chars[k])[0] in 'aeiouy': k += 1
        chars.insert(k, 'h')
    return unicodedata.normalize('NFC', y_ini + ''.join(chars))

def convert(jp):
    """'ngo5 dei6' -> 'ngóh deih'; punctuation and other text pass through."""
    out = []
    for tok in re.split(r'(\s+)', jp.strip()):
        if re.fullmatch(r'[a-z]+[1-6]', tok): out.append(syllable(tok))
        elif re.fullmatch(r'([a-z]+[1-6])[.,?!;:]+', tok): out.append(syllable(tok[:-1] if not tok[-2].isalpha() else tok) if False else syllable(re.match(r'[a-z]+[1-6]', tok).group(0)) + tok[len(re.match(r'[a-z]+[1-6]', tok).group(0)):])
        else: out.append(tok)
    return ''.join(out)

if __name__ == '__main__':
    tests = {'nei5': 'néih', 'hou2': 'hóu', 'ngo5': 'ngóh', 'hai6': 'haih', 'hai2': 'hái', 'm4': 'm̀h', 'ng5': 'ńgh', 'zo2': 'jó', 'ge3': 'ge', 'keoi5': 'kéuih', 'jat1': 'yāt',
             'mat1': 'māt', 'je5': 'yéh', 'gong2': 'góng', 'sik1': 'sīk', 'nam2': 'nám', 'gaa3': 'ga', 'zung1': 'jūng', 'cing4': 'chìhng', 'saam1': 'sāam', 'sam1': 'sām', 'naam4': 'nàahm',
             'sai3': 'sai', 'jyu4': 'yùh', 'syu1': 'syū', 'heoi3': 'heui', 'seung2': 'séung', 'gwaan1': 'gwāan', 'dou1': 'dōu', 'zi6': 'jih', 'cin4': 'chìhn', 'gau2': 'gáu', 'luk6': 'luhk',
             'baak3': 'baak', 'dik1': 'dīk', 'wong4': 'wòhng', 'maa5': 'máh', 'zaai6': 'jaaih', 'jyun4': 'yùhn', 'soeng6': 'seuhng', 'coeng4': 'chèuhng', 'ceoi4': 'chèuih'}
    bad = [(k, v, syllable(k)) for k, v in tests.items() if syllable(k) != v]
    print('yale self-test', len(tests) - len(bad), '/', len(tests)); [print('  ', b) for b in bad]
