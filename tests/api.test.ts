import {afterAll,beforeAll,describe,it,expect} from 'vitest';
import {app} from '../server/index';import type {Server} from 'node:http';
let server:Server,base:string;
beforeAll(async()=>{await new Promise<void>((resolve,reject)=>{server=app.listen(0,'127.0.0.1',error=>error?reject(error):resolve());});base='http://127.0.0.1:'+(server.address() as any).port;});
afterAll(()=>new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve())));
const post=(url:string,body:any)=>fetch(base+url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
describe('API',()=>{
 it('accepts saved bills for export and rejects duplicate IDs',async()=>{
  const bill={id:1,text:'36\n63\n39\n93=8*8',options:{}};
  const calculated=await post('/api/calculate',{bills:[bill]});
  expect((await calculated.json()).lines).toEqual([{line:1,total:64}]);
  const exported=await post('/api/export',{bills:[bill]});expect(exported.status).toBe(200);
  expect((await post('/api/export',{bills:[bill,bill]})).status).toBe(400);
 });
 it('shares core results with the browser',async()=>{const r=await post('/api/calculate',{text:'123=20*6'});expect(r.status).toBe(200);expect((await r.json()).total).toBe(120);});
 it('rejects invalid payloads and export with bad lines',async()=>{expect((await post('/api/calculate',{text:12})).status).toBe(400);expect((await post('/api/export',{text:'12=20\nbad'})).status).toBe(422);});
 it('checks with explicit rates and draw',async()=>{const r=await post('/api/check',{text:'01=20',result:{top3:'001',bottom2:'99'},rates:{top3:500,tod3:100,top2:70,bottom2:70}});expect((await r.json()).payout).toBe(1400);});
 it('returns genuine XLSX ZIP bytes',async()=>{const r=await post('/api/export',{text:'01=20'});expect(r.headers.get('Content-Type')).toContain('spreadsheetml');const bytes=new Uint8Array(await r.arrayBuffer());expect([...bytes.slice(0,2)]).toEqual([80,75]);});
 it('rejects unsupported OCR uploads before extraction',async()=>{const f=new FormData();f.append('image',new Blob(['bad'],{type:'text/plain'}),'bad.txt');const r=await fetch(base+'/api/ocr',{method:'POST',body:f});expect(r.status).toBe(400);});
});
