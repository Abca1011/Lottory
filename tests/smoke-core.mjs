import assert from 'node:assert/strict';
import {calculate,check} from '../packages/core/index.ts';
const cases=[['123=20*20',40],['123=20*6',120],['112=20*3',60],['บน-ล่าง\n12=20*20\n13=50*50\n14=50*50',240],['บน-ล่าง\n12,21=20*20\n13,31=50*50',280],['บน\n12=20*20\n13=20*20',80],['ล่าง\n12=20*20\n13=20*20',80],['12,21 ตัวละ 20',40]];
for(const [text,total] of cases){const p=calculate(text);assert.equal(p.total,total);assert.deepEqual(p.errors,[]);}
assert.equal(calculate('123=20*6',{permutationRule:false}).total,26);
assert.equal(calculate('๐๑ ตัวล่ะ ๒๐').bets[0].number,'01');
assert.equal(calculate('12,9999=20').bets.length,0);
assert.equal(calculate('12,12 ตัวละ 0.10').total,.2);
const c=check(calculate('12 ตัวละ 20\n123=20*20').bets,{top3:'321',bottom2:'12'},{top3:900,tod3:150,top2:90,bottom2:90});
assert.deepEqual(c.wins.map(b=>b.type),['tod3']);assert.equal(c.payout,3000);
console.log('Core smoke: all 8 plan examples and 6 boundary assertions passed.');
