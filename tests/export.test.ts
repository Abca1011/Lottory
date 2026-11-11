import {describe,it,expect} from 'vitest';
import ExcelJS from 'exceljs';import {exportWorkbook} from '../server/export';import {calculate} from '../packages/core/index';
const rates={top3:500,tod3:100,top2:70,bottom2:70};
async function read(text:string,options:any={}){const w=new ExcelJS.Workbook();await w.xlsx.load(await exportWorkbook(calculate(text),options) as any);return w;}
describe('Excel template export',()=>{
 it('preserves template headers, styles, leading zeros and totals',async()=>{
 const w=await read('บน-ล่าง\n01=20*30');const s=w.worksheets[0],d=w.worksheets[1];
 expect(s.getCell('D3').value).toBe('ตรง');expect(s.getCell('G3').value).toBe('ล่าง');
 expect(s.getCell('B4').value).toBe(50);expect(s.getCell('M17').result).toBe(50);
 expect(s.getCell('O17').result).toBe(13.5);expect(s.getCell('P17').result).toBe(36.5);
 expect(s.getCell('Q11').value).toBeNull();expect(s.getCell('P3').value).toBeNull();expect(d.getCell('C2').value).toBe('01');expect(d.getCell('C2').type).toBe(ExcelJS.ValueType.String);
 expect(s.getCell('A1').isMerged).toBe(true);
 });
 it('fills winning stakes only and calculates payout',async()=>{
 const w=await read('123=20*20\nบน-ล่าง\n23=10*15\n01=5*7',{rates,result:{top3:'123',bottom2:'01'},commissionPercent:10});const s=w.worksheets[0];
 expect(s.getCell('D4').value).toBe(20);expect(s.getCell('E4').value).toBe(20);
 expect(s.getCell('F5').value).toBe(10);expect(s.getCell('G6').value).toBe(7);
 expect(s.getCell('G5').value).toBeNull();expect(s.getCell('Q11').result).toBe(13190);
 expect(s.getCell('N7').formula).toBe('SUM(H4:H63)');expect(s.getCell('N9').formula).toBe('SUM(J4:J63)');
 });
 it('extends past 60 bills without dropping rows',async()=>{
 const w=await read(Array(65).fill('12 ตัวละ 1').join('\n'));expect(w.worksheets[0].getCell('B68').value).toBe(1);expect(w.worksheets[0].getCell('M17').formula).toBe('SUM(B4:B68)');expect(w.worksheets[0].getCell('M17').result).toBe(65);
 });
 it('reconciles fractional rates with per-entry rounding',async()=>{const w=await read('01=0.01\n01=0.01',{rates:{...rates,top2:0.5},result:{top3:'001',bottom2:'99'}});expect(w.worksheets[0].getCell('Q5').result).toBe(0.02);expect(w.worksheets[0].getCell('Q11').result).toBe(0.02);expect(w.worksheets[0].getCell('Q5').formula).toContain('SUMIF');});
 it('rejects invalid discounts and empty exports',async()=>{await expect(exportWorkbook(calculate(''))).rejects.toThrow();await expect(read('12=20',{commissionPercent:101})).rejects.toThrow();});
});
