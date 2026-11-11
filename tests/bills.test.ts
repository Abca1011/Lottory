import {expect,it} from 'vitest';
import ExcelJS from 'exceljs';
import {calculateBills} from '../packages/core/bills';
import {exportWorkbook} from '../server/export';
const bills=[{id:1,text:'36\n63\n39\n93=8*8',options:{}},{id:7,text:'01=20\n02=30',options:{}}];
it('groups multiple input lines into a saved bill and retains their source lines',()=>{
 const p=calculateBills(bills);
 expect(p.total).toBe(114);expect(p.lines).toEqual([{line:1,total:64},{line:2,total:50}]);
 expect(p.billNames).toEqual({1:'la(1)',2:'la(7)'});
 expect(p.bets[6].source).toBe(1);expect(p.bets[6].originalSource).toBe(4);
});
it('exports one summary row per bill and groups winning stakes in that row',async()=>{
 const p=calculateBills(bills),wb=new ExcelJS.Workbook();
 await wb.xlsx.load(await exportWorkbook(p,{result:{top3:'001',bottom2:'99'},rates:{top3:500,tod3:100,top2:70,bottom2:70}}));
 const sheet=wb.worksheets[0],detail=wb.worksheets[1];
 expect(sheet.getCell('A4').value).toBe('la(1)');expect(sheet.getCell('B4').value).toBe(64);
 expect(sheet.getCell('A5').value).toBe('la(7)');expect(sheet.getCell('B5').value).toBe(50);
 expect(sheet.getCell('B6').value).toBeNull();expect(sheet.getCell('F5').value).toBe(20);
 expect(detail.getCell('A8').value).toBe('la(1)');expect(detail.getCell('B8').value).toBe(4);
 expect(detail.getCell('C10').value).toBe('01');
});
it('rejects duplicate bill IDs and empty or invalid saved slips',()=>{
 expect(()=>calculateBills([bills[0],bills[0]])).toThrow();
 for(const text of ['', 'bad'])expect(()=>calculateBills([{id:1,text,options:{}}])).toThrow();
 expect(calculateBills([]).total).toBe(0);
});
it('keeps saved row adjustments within the correct bill',()=>{
 const p=calculateBills([{...bills[1],options:{adjustments:{0:null,1:{number:'03',type:'bottom2',amount:10}}}},bills[0]]);
 expect(p.lines.map(b=>b.total)).toEqual([10,64]);expect(p.total).toBe(74);
});
