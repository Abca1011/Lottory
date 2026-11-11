import sharp from 'sharp';
import {Worker} from 'node:worker_threads';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
export function recognizeLocal(image:Buffer,cachePath:string,timeoutMs=90000):Promise<OcrResult>{
 return new Promise((resolve,reject)=>{
  const worker=new Worker(`
   const {parentPort,workerData}=require('node:worker_threads');
   const {createWorker}=require(workerData.modulePath);
   (async()=>{
    const engine=await createWorker('tha+eng',1,{cachePath:workerData.cachePath,errorHandler:error=>parentPort.postMessage({error:String(error)})});
    try {const {data}=await engine.recognize(Buffer.from(workerData.image));parentPort.postMessage({text:data.text,confidence:data.confidence,provider:'tesseract'});}
    finally {await engine.terminate();}
   })().catch(error=>parentPort.postMessage({error:String(error)}));
  `,{eval:true,workerData:{modulePath:require.resolve('tesseract.js'),image,cachePath}});
  let finished=false;
  const finish=(error?:Error,result?:OcrResult)=>{
   if(finished)return;finished=true;clearTimeout(timer);
   void worker.terminate();
   if(error)reject(error);else resolve(result!);
  };
  const timer=setTimeout(()=>finish(new Error('OCR timed out. Please retry with a smaller, clearer image.')),timeoutMs);
  worker.once('error',error=>finish(error instanceof Error?error:new Error(String(error))));
  worker.once('exit',code=>finish(new Error('OCR worker stopped ('+code+'). Please retry.')));
  worker.once('message',result=>result.error?finish(new Error(result.error)):finish(undefined,result));
 });
}
export interface OcrResult {text:string;confidence:number|null;provider:string}
export async function extract(buffer:Buffer):Promise<OcrResult>{
 const meta=await sharp(buffer,{limitInputPixels:24000000}).metadata();
 if(!['jpeg','png','webp'].includes(meta.format??''))throw new Error('Unsupported image content');
 const image=await sharp(buffer,{limitInputPixels:24000000}).rotate().resize({width:1800,withoutEnlargement:true}).grayscale().normalize().png().toBuffer();
 if(process.env.OCR_PROVIDER==='vision'){
 const {VISION_API_URL:url,VISION_API_KEY:key,VISION_MODEL:model}=process.env;
 if(!url||!key||!model)throw new Error('ตั้งค่า VISION_API_URL, VISION_API_KEY และ VISION_MODEL ก่อนใช้ Vision OCR');
 const response=await fetch(url,{method:'POST',signal:AbortSignal.timeout(90000),headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model,messages:[{role:'user',content:[{type:'text',text:'Transcribe this Thai lottery slip exactly as plain text, preserving line breaks, Thai headers บน ล่าง บน-ล่าง, digits including leading zeros, amounts and * separators. Do not calculate or invent illegible values. Mark illegible text with ?. Return only transcription without markdown.'},{type:'image_url',image_url:{url:'data:image/png;base64,'+image.toString('base64')}}]}]})});
 if(!response.ok)throw new Error('Vision OCR ไม่สำเร็จ ('+response.status+')');
 const data=await response.json() as {choices?:{message?:{content?:string}}[]};
 const text=data.choices?.[0]?.message?.content;if(typeof text!=='string')throw new Error('OCR ไม่ได้ส่งข้อความกลับมา');
 return {text,confidence:null,provider:'vision'};
 }
 return recognizeLocal(image,process.env.OCR_CACHE_PATH||'reference/ocr-cache');
}
