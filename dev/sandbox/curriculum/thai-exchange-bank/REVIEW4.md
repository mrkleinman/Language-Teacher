# Fourth review brief — Thai exchange bank (v710, Thai naturalness)

Blind reviews of tracks built from the bank now score 7.8–8.4. Thai correctness and naturalness (35 % of the score) is where most
points are still lost. Read AUTHOR.md first. Edit IN PLACE, keep the format, change only what a native speaker would not say.

Read every Thai line aloud as a Thai friend would say it in conversation. Fix it when:
1. THE TARGET IS FORCED IN. A Thai speaker would drop or replace the word ("อร่อยค่ะ แต่อาหารเผ็ดไปหน่อย" → the second อาหาร is forced;
   "ลงน้ำทะเล" → ลงทะเล). Never bend a sentence to fit the target: give the line a situation where the word is what people say.
2. THE SENSE IS NOT WHERE THAIS USE THE WORD. A shorter route is ใกล้กว่า, not สั้นกว่า (use สั้น for hair, clothes, time); a sold-out
   show is เต็ม; write down a number is จด; a petrol station is ปั๊มน้ำมัน. Prefer the everyday collocation.
3. WRITTEN / BOOKISH REGISTER. Clause-initial เมื่อ "when" (เมื่อมาถึง…) → ตอน…; a general condition takes ถ้า, not เมื่อ; และ joining
   phrases → กับ; จำนวน …. Teach spoken uses (เมื่อกี้, เมื่อเช้า, เมื่อวาน, …ที่แล้ว).
4. TRANSLATED ENGLISH. "แผนผมคือ…" (my plan is …) → ผมว่าจะ…; "ราคาแสนไหม" → clipped; คุณเป็นคนตลก is fine, but not three times in one
   frame.
5. PARTICLES. Two ครับ in a short utterance (อิจฉาคุณจังครับ ได้ไปพักร้อนครับ) → one at the end; B's question ends คะ.
6. ONE NARROW SENSE THREE TIMES. ขน only as bird feathers → add fur / body hair (ขนแมว); เติม only fuel → เติมเงิน, เติมน้ำ, เติมข้าว;
   เครื่อง only "machine" → ขึ้นเครื่อง, the classifier (มือถือสองเครื่อง); เมื่อ only clause "when" → เมื่อกี้, เมื่อวาน.
7. THE REPLY DOES NOT FOLLOW (he asks for directions, then tells her which way is closer → make it a question; จะ is "going to", not
   "want to"; the cue / EN say "we" when the Thai says เรา, "you" when it says คุณ).

Flagged in the latest reviews (fix these in the file that holds them): อาหาร (b05), สั้น (b06), ขน and อิจฉา (b15), เติม and เครื่อง
(b27), เมื่อ (b11), น้ำทะเล (b16), แผน (b14), หู (b09: ยังได้ยินชัดอยู่ไหมครับ, without หู as the subject, is what people say), หนึ่งทุ่ม,
เบียร์ช้าง, คุณเป็นคนตลก (b18), กลับ and นี่ (b01), จะ (b10), ทางนี้, กะเทย, ถวายสังฆทาน (b19), ตีหนึ่ง (b17), เที่ยงคืน (b03).

Keep cue and EN in step with any Thai change (AUTHOR.md rules; cue person: you / your = the speaker). Self-check every file you edit
(every word that passed must still pass):
  sh /home/user/Language-Teacher/dev/sandbox/curriculum/thai-exchange-bank/check.sh <file>
Then run the full bank check once at the end of your batch (it also runs the later gates — contract, track vocabulary, fixed verbs):
  cd /home/user/Language-Teacher/dev/sandbox/curriculum/thai-exchange-bank && sh check.sh <file>   (per file is enough)
If a better phrasing uses an untaught word, find another natural phrasing with known words. Reply with: files, exchanges changed (count),
final USABLE counts, and up to 6 example corrections.
