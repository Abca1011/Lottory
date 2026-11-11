import {expect,it} from 'vitest';
import {calculate} from '../packages/core/index';

it('applies the final 8*8 price to all four preceding numbers',()=>{
 const p=calculate('36\n63\n39\n93 = 8*8');
 expect(p.errors).toEqual([]);
 expect(p.total).toBe(64);
 expect(p.bets).toHaveLength(8);
 expect(p.lines).toEqual([1,2,3,4].map(line=>({line,total:16})));
 expect(p.bets.every(b=>b.amount===8)).toBe(true);
});
it('respects top/bottom sections and preserves leading zeros',()=>{
 const p=calculate('บน-ล่าง\n01\n02=8*8');
 expect(p.errors).toEqual([]);expect(p.breakdown.top2).toBe(16);expect(p.breakdown.bottom2).toBe(16);
 expect(p.bets[0].number).toBe('01');
});
it('keeps separately priced groups independent',()=>{
 const p=calculate('12\n13=5*5\n14\n15=8*8');
 expect(p.errors).toEqual([]);expect(p.total).toBe(52);
});
it('does not borrow prices across blank lines, headers or invalid rows',()=>{
 for(const separator of ['','ล่าง','unknown']){
  const p=calculate('12\n'+separator+'\n13=8*8');
  expect(p.errors.some(e=>e.line===1)).toBe(true);
 }
 expect(calculate('12\n13').errors).toHaveLength(2);
});
