import {calculate,types,type Options,type Parsed} from './index';
export interface Bill { id:number; text:string; options:Options }
export function calculateBills(bills:Bill[]):Parsed {
 if(!Array.isArray(bills)||bills.length>1000)throw new Error('Invalid bills');
 const result:Parsed={bets:[],errors:[],total:0,breakdown:{top3:0,tod3:0,top2:0,bottom2:0},lines:[],billNames:{}};
 const seen=new Set<number>();
 const round=(n:number)=>Math.round((n+Number.EPSILON)*100)/100;
 bills.forEach((bill,index)=>{
  if(!bill||!Number.isSafeInteger(bill.id)||bill.id<1||seen.has(bill.id)||typeof bill.text!=='string')throw new Error('Invalid or duplicate bill number');
  seen.add(bill.id);
  const p=calculate(bill.text,bill.options);
  if(p.errors.length||!p.bets.length)throw new Error(`la(${bill.id}): invalid or empty bill`);
  const source=index+1;
  result.billNames![source]=`la(${bill.id})`;
  result.bets.push(...p.bets.map(b=>({...b,originalSource:b.source,source})));
  result.lines.push({line:source,total:p.total});
  for(const type of types)result.breakdown[type]=round(result.breakdown[type]+p.breakdown[type]);
 });
 result.total=round(types.reduce((sum,type)=>sum+result.breakdown[type],0));
 return result;
}
