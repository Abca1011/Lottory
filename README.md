# Lottory
เว็บคำนวณโพยตามแผน Vue + Vite + Express พร้อม OCR และส่งออก Excel

## เริ่มใช้งาน
ต้องมี Node.js 22 ขึ้นไป
```powershell
cd C:\Lottory
npm.cmd install
Copy-Item .env.example .env
npm.cmd run dev
```
เปิด http://localhost:5173 (API ใช้พอร์ต 3000)

## Production
```powershell
npm.cmd run build
npm.cmd start
```
เปิด http://localhost:3000 หรือใช้ Dockerfile

## ตรวจสอบ
```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
```

## กติกา
- หัวข้อ บน-ล่าง: `12=20*30` คือบน 20 และล่าง 30
- หัวข้อ บน หรือ ล่าง: `12=20*30` คือ 12 ยอด 20 และ 21 ยอด 30 ในประเภทนั้น
- เลข 2 หลักไม่มีหัวข้อ: ใช้บน; หากมีสองยอด ใช้เลขตรง/เลขกลับ
- เลข 3 หลัก: ยอดแรกเป็นบน ยอดที่สองเป็นโต๊ด
- เปิดกฎกลับเลข: หากยอดหลัง * เท่ากับจำนวนเลขกลับไม่ซ้ำ จะใช้ยอดแรกกับทุกเลขกลับ
- `ตัวละ` ใช้กับเลขทุกตัวที่ระบุ; ภายใต้ บน-ล่าง ยอดเดี่ยวใช้ทั้งบนและล่าง
- เลขเบิ้ลที่กรอกสองยอดจะรวมทั้งสองยอด ไม่ตัดยอดทิ้ง
- เลขซ้ำหลายรายการยังนับทุกยอดตามที่กรอก
- จำนวนเงินไม่ติดลบ ทศนิยมสูงสุด 2 ตำแหน่ง ยอด 0 ไม่สร้างรายการ
- เลขเป็นข้อความเสมอ จึงเก็บ 01 / 001 ครบ
- บรรทัดผิดแสดงข้อผิดพลาดและไม่นับยอด; ตรวจผล/ส่งออกจะถูกปิดจนแก้ครบ
- 3 ตัวล่างไม่รองรับตามชนิดข้อมูลในแผน
- ผล 2 ตัวบน = 2 หลักท้ายของผล 3 ตัวบน; โต๊ดเทียบชุดตัวเลขรวมจำนวนตัวซ้ำ
- ต้องกรอกอัตราจ่ายเองทุกประเภท ไม่มีค่าเริ่มต้นที่สมมติขึ้น
- ยอดจ่าย = จำนวนเงิน × อัตราจ่าย ไม่ใช่กำไรสุทธิ

## OCR
ค่าเริ่มต้นใช้ Tesseract tha+eng โดยการใช้งานครั้งแรกต้องใช้อินเทอร์เน็ตเพื่อดาวน์โหลดตัวอ่านภาษา
ตั้ง `OCR_PROVIDER=vision` และตัวแปร `VISION_API_URL`, `VISION_API_KEY`, `VISION_MODEL` เพื่อใช้ endpoint แบบ OpenAI-compatible chat completions ที่รองรับภาพ
เก็บ key เฉพาะในเซิร์ฟเวอร์ รูปใช้ในหน่วยความจำ ไม่บันทึกภาพลงดิสก์
ก่อนคำนวณต้องตรวจและกดใช้ข้อความ OCR เอง ตัวอ่านภาพเขียนมืออาจผิดพลาด
JPG / PNG / WEBP ไม่เกิน 5 MB และ 24 ล้านพิกเซล; จำกัด OCR ครั้งละงานและ 5 คำขอต่อนาที

## API
- GET /api/health
- POST /api/calculate: {text, options:{permutationRule}}
- POST /api/check: {text, options, result:{top3,bottom2}, rates:{top3,tod3,top2,bottom2}}
- POST /api/ocr: multipart ช่อง image
- POST /api/export: {text, options} → .xlsx

ไม่บันทึกประวัติหรือรูปโดยอัตโนมัติ ประวัติเป็นส่วน optional ในแผน

## Excel template
Exports use reference/template.xlsx. The web app exports saved bills: each la(number) bill has one summary row containing its total purchase amount. Details retains every expanded number and its original line. Legacy text-only API requests retain line grouping. D:G contains winning stakes only after checking a draw. Unsupported restricted/running bets remain blank. Discount defaults to the template value of 27% and is editable. Payout rates always come from user input. Summary formulas expand to fit all rows. The original template remains unchanged.

## Saved bills
Enter a bill number and slip, then click Save bill. Only saved bills appear in the saved-bills dropdowns, draw checks, and Excel exports. Edit bill loads a draft; Update bill commits changes. Bills are stored in this browser (localStorage); drafts are not stored. Clearing browser data removes saved bills, so export Excel for a separate copy. The export API accepts {bills:[{id:1,text:"01=20",options:{}}],exportOptions:{}}.
