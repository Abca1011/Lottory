import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdir} from 'node:fs/promises';
import {calculate,check} from '../packages/core/index';
import {calculateBills} from '../packages/core/bills';
import {extract} from './ocr';
import {exportWorkbook} from './export';
export const app=express();
app.disable('x-powered-by');
app.use(express.json({limit:'200kb'}));
app.use('/api',rateLimit({windowMs:60000,limit:100,standardHeaders:'draft-8',legacyHeaders:false}));
function parse(body:any){
 if(body?.bills!==undefined)return calculateBills(body.bills);
 if(!body||typeof body.text!=='string')throw new Error('text ต้องเป็นข้อความ');
 if(body.options?.permutationRule!==undefined&&typeof body.options.permutationRule!=='boolean')throw new Error('permutationRule ต้องเป็น boolean');
 return calculate(body.text,body.options);
}
app.get('/api/health',(_req,res)=>res.json({ok:true}));
app.post('/api/calculate',(req,res)=>{try{res.json(parse(req.body));}catch(e){res.status(400).json({error:(e as Error).message});}});
app.post('/api/check',(req,res)=>{try{const p=parse(req.body);if(p.errors.length)return res.status(422).json({error:'แก้ไขบรรทัดที่ผิดก่อนตรวจผล',errors:p.errors});res.json(check(p.bets,req.body.result??{},req.body.rates??{}));}catch(e){res.status(400).json({error:(e as Error).message});}});
app.post('/api/export',async(req,res)=>{try{const p=parse(req.body);if(p.errors.length)return res.status(422).json({error:'แก้ไขบรรทัดที่ผิดก่อนส่งออก',errors:p.errors});if(!p.bets.length)return res.status(400).json({error:'ยังไม่มีรายการส่งออก'});
 const buffer=await exportWorkbook(p,req.body.exportOptions);
 res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');res.setHeader('Content-Disposition','attachment; filename="lottory.xlsx"');res.send(Buffer.from(buffer));
 }catch(e){res.status(400).json({error:(e as Error).message});}});
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024,files:1},fileFilter:(_req,file,cb)=>{if(['image/jpeg','image/png','image/webp'].includes(file.mimetype))cb(null,true);else cb(new Error('รองรับ JPG, PNG, WEBP เท่านั้น'));}});
let ocrBusy=false;
app.post('/api/ocr',rateLimit({windowMs:60000,limit:5}),upload.single('image'),async(req,res)=>{
 if(!req.file)return res.status(400).json({error:'กรุณาแนบรูปภาพ'});
 if(ocrBusy)return res.status(429).json({error:'OCR กำลังทำงาน โปรดลองอีกครั้ง'});
 ocrBusy=true;
 try{await mkdir('reference/ocr-cache',{recursive:true});res.json(await extract(req.file.buffer));}
 catch(e){res.status(422).json({error:(e as Error).message});}finally{ocrBusy=false;}
});
app.use('/api',(_req,res)=>res.status(404).json({error:'ไม่พบ API'}));
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
app.use(express.static(path.join(root,'dist')));
app.use((err:Error,_req:express.Request,res:express.Response,_next:express.NextFunction)=>res.status(400).json({error:err.message}));
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))app.listen(Number(process.env.PORT)||3000,()=>console.log('Lottory: http://localhost:'+(process.env.PORT||3000)));
