import ExcelJS from 'exceljs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {check,types,labels,type Parsed,type BetType} from '../packages/core/index';
export interface ExportOptions { title?:string; commissionPercent?:number; result?:{top3:string;bottom2:string}; rates?:Record<BetType,number> }
export async function exportWorkbook(parsed:Parsed,options:ExportOptions={}){
 if(parsed.errors.length||!parsed.bets.length)throw new Error('ต้องมีรายการที่ถูกต้องก่อนส่งออก');
 const commission=options.commissionPercent??27;
 if(!Number.isFinite(commission)||commission<0||commission>100)throw new Error('เปอร์เซ็นต์ส่วนลดต้องเป็น 0–100');
 if(options.title!==undefined&&(typeof options.title!=='string'||options.title.length>120))throw new Error('ชื่อรายงานไม่เกิน 120 ตัวอักษร');
 if(options.rates && types.some(t=>!Number.isFinite(options.rates![t])||options.rates![t]<0||options.rates![t]>1000000))throw new Error('Invalid payout rates');
 const checked=options.result?check(parsed.bets,options.result,options.rates??{} as Record<BetType,number>):null;
 const wb=new ExcelJS.Workbook();
 await wb.xlsx.readFile(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../reference/template.xlsx'));
 wb.calcProperties.fullCalcOnLoad=true;
 const ws=wb.worksheets[0];ws.name='สรุปบิล';
 ws.getCell('A1').value=options.title?.trim()||'สรุปโพย';
 const end=Math.max(63,parsed.lines.length+3);
 // Saved bills are aggregated into one summary row; details retain source lines.
 const rowByLine=new Map<number,number>();
 for(let r=4;r<=end;r++){for(let col=1;col<=11;col++){const cell=ws.getCell(r,col);if(r>63)cell.style=structuredClone(ws.getCell(63,col).style);cell.value=null;}if(r>63)ws.getRow(r).height=ws.getRow(63).height;}
 parsed.lines.forEach((line,i)=>{const row=i+4;rowByLine.set(line.line,row);ws.getCell(row,1).value=parsed.billNames?.[line.line]??i+1;ws.getCell(row,2).value=line.total;});
 const cols:Record<BetType,string>={top3:'D',tod3:'E',top2:'F',bottom2:'G'};
 if(checked){for(const win of checked.wins){const c=ws.getCell(cols[win.type]+rowByLine.get(win.source));c.value=Math.round((Number(c.value??0)+win.amount)*100)/100;}}
 const summaryCols=['D','E','F','G','H','I','J','K'];
 for(let i=0;i<8;i++){
 const row=i+3;const type=types[i];const amount=type&&checked?checked.wins.filter(w=>w.type===type).reduce((n,w)=>n+w.amount,0):0;
 ws.getCell('N'+row).value=checked?{formula:'SUM('+summaryCols[i]+'4:'+summaryCols[i]+end+')',result:amount}:null;
 ws.getCell('P'+row).value=type&&options.rates?options.rates[type]:null;
 const payout=type&&checked?Math.round(checked.wins.filter(w=>w.type===type).reduce((n,w)=>n+w.payout,0)*100)/100:0;
 ws.getCell('Q'+row).value=checked?{formula:type?`SUMIF('รายละเอียด'!D2:D${parsed.bets.length+1},"${labels[type]}",'รายละเอียด'!G2:G${parsed.bets.length+1})`:'N'+row+'*P'+row,result:payout}:null;
 }
 ws.getCell('Q11').value=checked?{formula:'SUM(Q3:Q10)',result:checked.payout}:null;
 ws.getCell('M17').value={formula:'SUM(B4:B'+end+')',result:parsed.total};
 ws.getCell('O16').value=commission/100;ws.getCell('O16').numFmt='0.##%';
 const discount=Math.round(parsed.total*commission)/100;
 ws.getCell('O17').value={formula:'ROUND(M17*O16,2)',result:discount};
 ws.getCell('P17').value={formula:'M17-O17',result:Math.round((parsed.total-discount)*100)/100};
 ws.getCell('M18').value=checked?'ตรวจผลแล้ว':'ยังไม่ได้ตรวจผล';
 ws.getCell('O18').value='ส่วนลด';
 ws.getCell('P18').value='อั้น / วิ่ง: ไม่อยู่ในแผน';
 for(const a of ['M18','O18','P18']){ws.getCell(a).font={name:'Tahoma',size:10};ws.getCell(a).alignment={horizontal:'center',vertical:'middle',wrapText:true};}ws.getRow(18).height=30;
 ws.views=[{state:'frozen',ySplit:3}];ws.pageSetup={orientation:'landscape',paperSize:9,fitToPage:true,fitToWidth:1,fitToHeight:0,printArea:'A1:T'+end,printTitlesRow:'1:3'};
 const detail=wb.addWorksheet('รายละเอียด');
 detail.columns=[{header:'บิล',key:'bill',width:9},{header:'บรรทัดต้นฉบับ',key:'source',width:18},{header:'เลข',key:'number',width:12},{header:'ประเภท',key:'type',width:18},{header:'ยอดซื้อ',key:'amount',width:16},{header:'ผลตรวจ',key:'status',width:17},{header:'ยอดจ่าย (ปัดเศษ/รายการ)',key:'payout',width:28}];
 const wins=new Map(checked?.wins.map(w=>[w.index,w])??[]);
 parsed.bets.forEach((bet,i)=>detail.addRow({bill:parsed.billNames?.[bet.source]??rowByLine.get(bet.source)!-3,source:bet.originalSource??bet.source,number:bet.number,type:labels[bet.type],amount:bet.amount,status:checked?(wins.has(i)?'ถูก':'ไม่ถูก'):'ยังไม่ได้ตรวจ',payout:checked?(wins.get(i)?.payout??0):null}));
 detail.getColumn('number').numFmt='@';detail.getColumn('amount').numFmt='#,##0.00';detail.getColumn('payout').numFmt='#,##0.00';
 detail.eachRow((row,n)=>{row.height=24;row.eachCell(cell=>{cell.font={name:'Tahoma',size:11,color:{argb:n===1?'FFFFFFFF':'FF234B3E'}};cell.alignment={vertical:'middle'};if(n===1)cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF234B3E'}};});});
 for(let r=4;r<=end;r++)for(let col=2;col<=11;col++){const c=ws.getCell(r,col);c.numFmt='#,##0.00';c.alignment={...c.alignment,shrinkToFit:true};}
 for(const a of ['M17','O17','P17','Q11']){ws.getCell(a).numFmt='#,##0.00';ws.getCell(a).alignment={...ws.getCell(a).alignment,shrinkToFit:true};}
 for(let r=3;r<=10;r++)for(const col of ['N','P','Q']){const c=ws.getCell(col+r);c.numFmt='#,##0.00';c.alignment={...c.alignment,shrinkToFit:true};}
 detail.views=[{state:'frozen',ySplit:1}];detail.autoFilter='A1:G'+(parsed.bets.length+1);
 return wb.xlsx.writeBuffer();
}
