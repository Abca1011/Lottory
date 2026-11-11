import {describe,it,expect} from 'vitest';
import {calculate,check,permutations} from '../packages/core/index';
describe('plan examples',()=>{
 it.each([
 ['123 = 20*20',40],['123 = 20*6',120],['112 = 20*3',60],
 ['บน-ล่าง\n12=20*20\n13=50*50\n14=50*50',240],
 ['บน-ล่าง\n12,21=20*20\n13,31=50*50',280],
 ['บน\n12=20*20\n13=20*20',80],
 ['ล่าง\n12=20*20\n13=20*20',80],['12,21 ตัวละ 20',40]
 ])('%s → %i',(input,total)=>{expect(calculate(input).total).toBe(total);expect(calculate(input).errors).toEqual([]);});
 it('normalizes Thai and preserves leading zeros',()=>{expect(calculate('บน ล่าง\n๐๑ = ๒๐×๓๐').bets).toEqual([{number:'01',type:'top2',amount:20,source:2},{number:'01',type:'bottom2',amount:30,source:2}]);});
 it('supports permutation setting and repeated digits',()=>{expect(calculate('123=20*6',{permutationRule:false}).total).toBe(26);expect(permutations('112')).toEqual(['112','121','211']);expect(calculate('111=20*1').total).toBe(20);});
 it('rejects malformed rows without partial acceptance',()=>{const p=calculate('12,1234=20\nล่าง\n123=20');expect(p.errors).toHaveLength(2);expect(p.bets).toHaveLength(0);});
 it('uses decimal money and retains duplicates explicitly',()=>{expect(calculate('12,12 ตัวละ 0.10').total).toBe(.2);expect(calculate('บน\n11=20*30').total).toBe(50);});
 it('does not win on unpurchased reverse; checks tod',()=>{const p=calculate('12 ตัวละ 20\n123=20*20');const r=check(p.bets,{top3:'321',bottom2:'12'},{top3:900,tod3:150,top2:90,bottom2:90});expect(r.wins.map(b=>b.type)).toEqual(['tod3']);expect(r.payout).toBe(3000);});
 it('requires complete draw and explicit rates',()=>{expect(()=>check([],{top3:'12',bottom2:'12'},{top3:0,tod3:0,top2:0,bottom2:0})).toThrow();});
});
