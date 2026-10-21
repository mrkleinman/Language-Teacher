# python3 suitability.py — v708 (owner review of v707: "correct dictionary suitability metadata": the preflight skipped ordinary words
# such as เส้นทาง, วัฒนธรรม, ผู้โดยสาร, อุณหภูมิ). Those records carried lexiconDisposition RECOGNITION with no reason recorded, a blanket
# early decision; the grader treats that as "recognition only, a human must review" and the Daily preflight skips the word.
# Every such record becomes ACTIVE, except the few whose limit is real (listed below with the reason, which is recorded on the
# record). Data only; the json.dumps settings of the line are kept (checked byte-identical before the change).
import json
TT = '../../../tt.jsx'
KEEP = {
  'ขอให้เป็นวันที่ดี': 'A translated wish; Thai people say โชคดีนะ or แล้วเจอกัน.',
  'แก': 'Very informal "you" between close peers; not for polite lessons.',
  'ลาก่อน': 'A final farewell; for an everyday "bye" say แล้วเจอกัน.',
  'จ้ะ': 'Familiar particle to friends, children or partners; the lessons use ครับ / ค่ะ.',
  'จ๊ะ': 'Familiar question particle for close people; the lessons use ครับ / คะ.',
  'ป๊ะ': 'Slangy question particle (ไปป๊ะ); not for polite lessons.',
  'กิ๊ก': 'Slang for a casual lover.',
  'ขึ้นคาน': 'Can be hurtful ("left on the shelf").',
  'ศพ': 'Corpse; not for everyday practice lines.',
  'มัว': 'Two unrelated senses (blurry; preoccupied — มัวแต่); taught through มัวแต่.',
  'มั้ย': 'Spoken spelling of ไหม; the lessons write ไหม.',
}
s = open(TT, encoding='utf-8').read(); a = s.index('const RAW_VOCAB = '); b = s.index('\n', a)
lit = s[a + len('const RAW_VOCAB = '):b]; data = json.loads(lit)
assert json.dumps(data, ensure_ascii=False) == lit
act, kept = [], []
for d in data:
    if d.get('lexiconDisposition') != 'RECOGNITION': continue
    if any(d.get(k) for k in ('conversationNote',)) and d['t'] not in KEEP: continue      # a recorded register reason stays as it is
    if d['t'] in KEEP:
        if not d.get('conversationNote'): d['conversationNote'] = KEEP[d['t']]
        kept.append(d['t']); continue
    d['lexiconDisposition'] = 'ACTIVE'; act.append(d['t'])
    if d['t'] == 'ปฏิบัติ' and 'garbled' in (d.get('usageNote') or ''): d['usageNote'] = 'Carry out (duties, rules) or practise (meditation, religion): ปฏิบัติตามกฎ.'
s = s[:a] + 'const RAW_VOCAB = ' + json.dumps(data, ensure_ascii=False) + s[b:]
open(TT, 'w', encoding='utf-8').write(s)
print('ACTIVE', len(act), ' '.join(act)); print('kept RECOGNITION', len(kept), ' '.join(kept))
