export type BetType = 'top3'|'tod3'|'top2'|'bottom2';
export type Section = 'top'|'bottom'|'topBottom'|null;
export interface Bet { number:string; type:BetType; amount:number; source:number; originalSource?:number }
export interface Issue { line:number; msg:string }
export interface Parsed { billNames?:Record<number,string>; bets:Bet[]; errors:Issue[]; total:number; breakdown:Record<BetType,number>; lines:{line:number;total:number}[] }
export type BetEdit = Pick<Bet,'number'|'type'|'amount'>;
export interface Options { permutationRule?:boolean; adjustments?:Record<string,BetEdit|null> }
export const types:BetType[]=['top3','tod3','top2','bottom2'];
export const labels:Record<BetType,string>={top3:'3 ตัวบน',tod3:'3 ตัวโต๊ด',top2:'2 ตัวบน',bottom2:'2 ตัวล่าง'};
const money=(n:number)=>Math.round((n+Number.EPSILON)*100)/100;
export function normalize(text:string):string {
 return text.replace(/[๐-๙]/g,c=>String(c.charCodeAt(0)-'๐'.charCodeAt(0))).replace(/[xX×✕]/g,'*').replace(/ตัวล่ะ/g,'ตัวละ').replace(/บน\s*-?\s*ล่าง/g,'บน-ล่าง').replace(/\r\n?/g,'\n').split('\n').map(l=>l.trim().replace(/[\t ]+/g,' ')).join('\n');
}
export function permutations(s:string):string[] {
 if(s.length<2)return [s];
 return [...new Set([...s].flatMap((c,i)=>permutations(s.slice(0,i)+s.slice(i+1)).map(p=>c+p)))].sort();
}
export function calculate(text:string,options:Options={}):Parsed {
 const bets:Bet[]=[];const errors:Issue[]=[];let section:Section=null;
 const rows=normalize(text).split('\n');
 // A price on the final row applies to the preceding consecutive unpriced rows.
 // Keep each row in place so edits and Excel retain the original source line.
 let pending:number[]=[];
 rows.forEach((raw,index)=>{
  if(/^\d{2,3}(?:[ ,]+\d{2,3})*$/.test(raw)){pending.push(index);return;}
  const priced=raw.match(/^\d{2,3}(?:[ ,]+\d{2,3})*\s*(?:=|ตัวละ)\s*(\d+(?:\.\d{1,2})?(?:\s*\*\s*\d+(?:\.\d{1,2})?)?)$/);
  if(priced)for(const line of pending)rows[line]+=' = '+priced[1];
  pending=[];
 });
 if(text.length>100000)throw new Error('ข้อความยาวเกิน 100,000 ตัวอักษร');
 rows.forEach((raw,index)=>{
 const source=index+1;if(!raw)return;
 if(['บน','ล่าง','บน-ล่าง'].includes(raw)){section=raw==='บน'?'top':raw==='ล่าง'?'bottom':'topBottom';return;}
 const match=raw.match(/^([\d,\s]+?)\s*(=|ตัวละ)\s*(\d+(?:\.\d{1,2})?)(?:\s*\*\s*(\d+(?:\.\d{1,2})?))?$/);
 if(!match){errors.push({line:source,msg:'รูปแบบไม่ถูกต้อง เช่น 12,13 = 20*20 หรือ 12 ตัวละ 20'});return;}
 const numbers=match[1].split(/[,\s]+/).filter(Boolean);const a=Number(match[3]);const b=match[4]===undefined?undefined:Number(match[4]);
 if(!numbers.length||numbers.some(n=>!/^\d{2,3}$/.test(n))||a>10000000||(b??0)>10000000){errors.push({line:source,msg:'ใช้เลข 2–3 หลัก และยอดไม่เกิน 10,000,000'});return;}
 if(numbers.some(n=>n.length===3)&&section&&section!=='top'){errors.push({line:source,msg:'เลข 3 หลักใช้ได้ในหัวข้อบน หรือไม่มีหัวข้อเท่านั้น'});return;}
 const lineBets:Bet[]=[];
 const add=(number:string,type:BetType,amount:number)=>{if(amount>0)lineBets.push({number,type,amount,source});};
 for(const n of numbers){
 if(n.length===3){
 const perms=permutations(n);
 if(b!==undefined&&(options.permutationRule??true)&&b===perms.length){for(const p of perms)add(p,'top3',a);}
 else {add(n,'top3',a);if(b!==undefined)add(n,'tod3',b);}
 }else if(section==='topBottom'){add(n,'top2',a);add(n,'bottom2',b??a);}
 else {const type=section==='bottom'?'bottom2':'top2';add(n,type,a);if(b!==undefined)add([...n].reverse().join(''),type,b);}
 }
 bets.push(...lineBets);
 });
 if(options.adjustments!==undefined){
  if(!options.adjustments||typeof options.adjustments!=='object'||Array.isArray(options.adjustments))throw new Error('Invalid row changes');
  const removed=new Set<number>();
  for(const [key,edit] of Object.entries(options.adjustments)){
   const index=Number(key);
   if(!/^\d+$/.test(key)||!Number.isSafeInteger(index)||index>=bets.length)throw new Error('Invalid row index');
   if(edit===null){removed.add(index);continue;}
   if(!edit||!types.includes(edit.type)||typeof edit.number!=='string'||!(edit.type==='top3'||edit.type==='tod3'?/^\d{3}$/:/^\d{2}$/).test(edit.number)||typeof edit.amount!=='number'||!Number.isFinite(edit.amount)||edit.amount<=0||edit.amount>10000000||Math.abs(edit.amount-money(edit.amount))>1e-8)throw new Error('Enter a valid number and amount (up to 2 decimal places)');
   bets[index]={number:edit.number,type:edit.type,amount:money(edit.amount),source:bets[index].source};
  }
  for(let i=bets.length-1;i>=0;i--)if(removed.has(i))bets.splice(i,1);
 }
 const breakdown={top3:0,tod3:0,top2:0,bottom2:0};const totals=new Map<number,number>();
 for(const b of bets){breakdown[b.type]=money(breakdown[b.type]+b.amount);totals.set(b.source,money((totals.get(b.source)??0)+b.amount));}
 return {bets,errors,total:money(types.reduce((n,t)=>n+breakdown[t],0)),breakdown,lines:[...totals].map(([line,total])=>({line,total}))};
}
export function check(bets:Bet[],result:{top3:string;bottom2:string},rates:Record<BetType,number>){
 if(!/^\d{3}$/.test(result.top3)||!/^\d{2}$/.test(result.bottom2))throw new Error('กรอกผล 3 ตัวบน และ 2 ตัวล่างให้ครบ');
 if(types.some(t=>typeof rates[t]!=='number'||!Number.isFinite(rates[t])||rates[t]<0||rates[t]>1000000))throw new Error('กรอกอัตราจ่ายทุกประเภทเป็นเลข 0–1,000,000');
 const key=(s:string)=>[...s].sort().join('');
 const wins=bets.map((b,index)=>({...b,index,won:b.type==='top3'?b.number===result.top3:b.type==='tod3'?key(b.number)===key(result.top3):b.type==='top2'?b.number===result.top3.slice(-2):b.number===result.bottom2})).filter(b=>b.won).map(b=>({...b,payout:money(b.amount*rates[b.type])}));
 return {wins,payout:money(wins.reduce((n,b)=>n+b.payout,0))};
}
