import {expect,it} from 'vitest';
import ExcelJS from 'exceljs';
import {calculate,check} from '../packages/core/index';
import {exportWorkbook} from '../server/export';

it('edits and deletes individual expanded rows without changing their source',()=>{
 const p=calculate('123=20*6',{adjustments:{0:null,1:{number:'001',type:'tod3',amount:12.50}}});
 expect(p.bets).toHaveLength(5);
 expect(p.bets[0]).toEqual({number:'001',type:'tod3',amount:12.5,source:1});
 expect(p.total).toBe(92.5);
 expect(p.breakdown.tod3).toBe(12.5);
 expect(p.lines).toEqual([{line:1,total:92.5}]);
 expect(check(p.bets,{top3:'100',bottom2:'99'},{top3:1,tod3:100,top2:1,bottom2:1}).payout).toBe(1250);
});
it('allows deleting the final entry',()=>{
 const p=calculate('01=20',{adjustments:{0:null}});
 expect(p.total).toBe(0);expect(p.bets).toEqual([]);expect(p.lines).toEqual([]);
});
it('rejects invalid edits rather than exporting inconsistent data',()=>{
 for(const edit of [{number:'1',type:'top2',amount:20},{number:'01',type:'top2',amount:-1},{number:'01',type:'top2',amount:1.001}]){
  expect(()=>calculate('01=20',{adjustments:{0:edit as any}})).toThrow();
 }
 expect(()=>calculate('01=20',{adjustments:{3:null}})).toThrow();
});
it('exports the edited total and preserves leading zeros after deletion',async()=>{
 const p=calculate('12=20\n34=30',{adjustments:{0:null,1:{number:'01',type:'bottom2',amount:45.5}}});
 const wb=new ExcelJS.Workbook();await wb.xlsx.load(await exportWorkbook(p));
 expect(wb.worksheets[0].getCell('B4').value).toBe(45.5);
 expect(wb.worksheets[1].getCell('C2').value).toBe('01');
 expect(wb.worksheets[1].getCell('E2').value).toBe(45.5);
 expect(wb.worksheets[1].rowCount).toBe(2);
});
