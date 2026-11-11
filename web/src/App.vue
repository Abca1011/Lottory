<script setup lang="ts">
import {computed,ref,watch,onBeforeUnmount,onMounted} from 'vue';
import {useI18n} from 'vue-i18n';import {useDropZone} from '@vueuse/core';
import {calculateBills,type Bill} from '../../packages/core/bills';
import {calculate,check,types,labels,type BetType,type BetEdit,type Options} from '../../packages/core/index';import {useSlip} from './store';
const s=useSlip();const {t,locale}=useI18n();
const adjustments=ref<NonNullable<Options['adjustments']>>({});
const undoChanges=ref<NonNullable<Options['adjustments']>|null>(null);
const editing=ref<number|null>(null),draft=ref({number:'',type:'top2' as BetType,amount:''}),editError=ref('');
const options=()=>({permutationRule:s.permutationRule,adjustments:adjustments.value});
const original=computed(()=>calculate(s.text,{permutationRule:s.permutationRule}));
const parsed=computed(()=>calculate(s.text,options()));
const rowKeys=computed(()=>original.value.bets.map((_,i)=>i).filter(i=>adjustments.value[i]!==null));
const current=()=>parsed.value;
const bills=ref<Bill[]>([]),billNumber=ref(1),editingBill=ref<number|null>(null);
const saved=computed(()=>calculateBills(bills.value));
const billViews=computed(()=>bills.value.map(bill=>({...bill,parsed:calculate(bill.text,bill.options)})));
function resetBill(){s.text='';editingBill.value=null;billNumber.value=Math.max(0,...bills.value.map(b=>b.id))+1;adjustments.value={};undoChanges.value=null;editing.value=null;}
function saveBill(){
 message.value='';
 try{
  const bill:Bill={id:Number(billNumber.value),text:s.text,options:JSON.parse(JSON.stringify(options()))};
  const next=editingBill.value===null?[...bills.value,bill]:bills.value.map(b=>b.id===editingBill.value?bill:b);
  calculateBills(next);bills.value=next;checked.value=null;resetBill();
 }catch(e){message.value=(e as Error).message;}
}
function loadBill(bill:Bill){editingBill.value=bill.id;billNumber.value=bill.id;s.text=bill.text;s.permutationRule=bill.options.permutationRule??true;adjustments.value=JSON.parse(JSON.stringify(bill.options.adjustments??{}));undoChanges.value=null;editing.value=null;}
const deletedBill=ref<{bill:Bill;index:number}|null>(null);
function deleteBill(id:number){const index=bills.value.findIndex(b=>b.id===id);if(index<0)return;deletedBill.value={bill:bills.value[index],index};bills.value=bills.value.filter(b=>b.id!==id);if(editingBill.value===id)resetBill();checked.value=null;}
function restoreBill(){if(!deletedBill.value)return;if(bills.value.some(b=>b.id===deletedBill.value!.bill.id)){message.value=tr('เลขบิลซ้ำ กรุณาเปลี่ยนเลขบิลก่อนย้อนกลับ','Duplicate bill number. Change it before restoring.');return;}bills.value.splice(deletedBill.value.index,0,deletedBill.value.bill);deletedBill.value=null;checked.value=null;}
watch(()=>[s.text,s.permutationRule],()=>{adjustments.value={};undoChanges.value=null;editing.value=null;},{flush:'sync'});
function editRow(index:number){const b=parsed.value.bets[index];editing.value=rowKeys.value[index];draft.value={number:b.number,type:b.type,amount:String(b.amount)};editError.value='';}
function changeRow(index:number,value:BetEdit|null){undoChanges.value=Object.fromEntries(Object.entries(adjustments.value).map(([k,v])=>[k,v?{...v}:null]));adjustments.value={...adjustments.value,[index]:value};editing.value=null;checked.value=null;}
function saveRow(){if(editing.value===null)return;const value={number:draft.value.number.trim(),type:draft.value.type,amount:Number(draft.value.amount)};try{calculate(s.text,{...options(),adjustments:{...adjustments.value,[editing.value]:value}});changeRow(editing.value,value);}catch{editError.value=tr('กรอกเลขให้ตรงประเภท และจำนวนเงินมากกว่า 0 ไม่เกิน 10,000,000 (ทศนิยมไม่เกิน 2 ตำแหน่ง)','Enter the correct number of digits and an amount above 0, up to 10,000,000 (2 decimals).');}}
function undoRow(){if(undoChanges.value){adjustments.value=undoChanges.value;undoChanges.value=null;editing.value=null;checked.value=null;}}
const tr=(th:string,en:string)=>locale.value==='en'?en:th;
const displayLabel=(type:BetType)=>locale.value==='en'?({top3:'3-digit straight',tod3:'3-digit box',top2:'2-digit top',bottom2:'2-digit bottom'}[type]):labels[type];
const fmt=(n:number)=>n.toLocaleString('th-TH',{maximumFractionDigits:2});
const busy=ref(false),message=ref(''),file=ref<File|null>(null),preview=ref(''),ocrText=ref(''),ocrReady=ref(false),confidence=ref<number|null>(null);
onMounted(()=>{
 try{const stored=localStorage.getItem('lottory.saved-bills.v1');if(stored){const loaded=JSON.parse(stored);calculateBills(loaded);bills.value=loaded;billNumber.value=Math.max(0,...loaded.map((b:Bill)=>b.id))+1;}}
 catch{message.value=tr('อ่านบิลที่บันทึกไว้ไม่ได้ กรุณาตรวจพื้นที่จัดเก็บของเบราว์เซอร์','Could not restore saved bills. Check browser storage.');}
});
watch(bills,()=>{try{localStorage.setItem('lottory.saved-bills.v1',JSON.stringify(bills.value));}catch{message.value=tr('เก็บบิลในเบราว์เซอร์ไม่สำเร็จ กรุณาส่งออก Excel ก่อนปิดหน้า','Could not store bills in this browser. Export Excel before closing.');}},{deep:true});
const drop=ref<HTMLElement>();const {isOverDropZone}=useDropZone(drop,{onDrop:files=>selectFile(files?.[0]),dataTypes:['image/jpeg','image/png','image/webp']});
function selectFile(f?:File){if(!f)return;if(!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>5*1024*1024){message.value='เลือกรูป JPG / PNG / WEBP ขนาดไม่เกิน 5 MB';return;}if(preview.value)URL.revokeObjectURL(preview.value);file.value=f;preview.value=URL.createObjectURL(f);ocrReady.value=false;message.value='';}
onBeforeUnmount(()=>{if(preview.value)URL.revokeObjectURL(preview.value);});
async function ocr(){if(!file.value)return;busy.value=true;message.value='';try{const body=new FormData();body.append('image',file.value);const r=await fetch('/api/ocr',{method:'POST',body});const d=await r.json();if(!r.ok)throw new Error(d.error);ocrText.value=d.text;confidence.value=d.confidence;ocrReady.value=true;}catch(e){message.value=(e as Error).message;}finally{busy.value=false;}}
function useOcr(){s.text=ocrText.value;ocrReady.value=false;message.value='นำข้อความที่ตรวจทานแล้วมาใส่ในโพยแล้ว';}
const reportTitle=ref('สรุปโพย'),commissionPercent=ref(27);
async function exportFile(){const p=saved.value;if(p.errors.length||!p.bets.length)return;if((top3.value.trim()||bottom2.value.trim())&&!checkResult())return;busy.value=true;message.value='';try{const r=await fetch('/api/export',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bills:bills.value,exportOptions:{title:reportTitle.value,commissionPercent:Number(commissionPercent.value),...(checked.value?{result:{top3:top3.value,bottom2:bottom2.value},rates:Object.fromEntries(types.map(t=>[t,Number(s.rates[t])]))}:{})}})});if(!r.ok)throw new Error((await r.json()).error);const url=URL.createObjectURL(await r.blob());const a=document.createElement('a');a.href=url;a.download='lottory.xlsx';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){message.value=(e as Error).message;}finally{busy.value=false;}}
const top3=ref(''),bottom2=ref(''),checked=ref<ReturnType<typeof check>|null>(null);
onMounted(()=>{try{const raw=localStorage.getItem('lottory.draw.v1');if(raw){const draw=JSON.parse(raw);if(typeof draw.top3==='string'&&typeof draw.bottom2==='string'&&draw.rates&&types.every(type=>['string','number'].includes(typeof draw.rates[type]))){top3.value=draw.top3;bottom2.value=draw.bottom2;for(const type of types)s.rates[type]=String(draw.rates[type]);}}}catch{}});
watch(()=>[top3.value,bottom2.value,...Object.values(s.rates)],()=>{checked.value=null;},{flush:'sync'});
const checkError=ref('');
const requiredTypes=computed(()=>types.filter(type=>saved.value.bets.some(b=>b.type===type)));
function rateValues(){return Object.fromEntries(types.map(type=>[type,s.rates[type]===''?0:Number(s.rates[type])])) as Record<BetType,number>;}
function checkResult(){
 message.value='';checkError.value='';checked.value=null;
 try{
  if(!saved.value.bets.length)throw new Error(tr('กรุณากดบันทึกบิลก่อนตรวจรางวัล','Save a bill before checking results.'));
  if(!/^\d{3}$/.test(top3.value.trim())||!/^\d{2}$/.test(bottom2.value.trim()))throw new Error(tr('กรอกผล 3 ตัวบนให้ครบ 3 หลัก และ 2 ตัวล่างให้ครบ 2 หลัก','Enter 3 digits for the top result and 2 digits for the bottom result.'));
  const missing=requiredTypes.value.filter(type=>String(s.rates[type]).trim()==='');
  if(missing.length)throw new Error(tr('กรุณากรอกอัตราจ่าย: ','Enter payout rates: ')+missing.map(displayLabel).join(', '));
  top3.value=top3.value.trim();bottom2.value=bottom2.value.trim();
  checked.value=check(saved.value.bets,{top3:top3.value,bottom2:bottom2.value},rateValues());
  try{localStorage.setItem('lottory.draw.v1',JSON.stringify({top3:top3.value,bottom2:bottom2.value,rates:s.rates}));}catch{}
  return true;
 }catch(e){checkError.value=(e as Error).message;message.value=checkError.value;return false;}
}
const billWins=computed(()=>Object.fromEntries(bills.value.map((bill,index)=>{const wins=checked.value?.wins.filter(w=>w.source===index+1)??[];return [bill.id,{count:wins.length,payout:Math.round(wins.reduce((sum,w)=>sum+w.payout,0)*100)/100}];})));
const winIndexes=computed(()=>new Set(checked.value?.wins.map(w=>w.index)??[]));
const examples=[{name:'บน–ล่าง',text:'บน-ล่าง\n12 = 20*20\n13 = 50*50\n14 = 50*50',total:240},{name:'3 ตัว / โต๊ด',text:'123 = 20*20',total:40},{name:'กลับ 6 ประตู',text:'123 = 20*6',total:120},{name:'เลขซ้ำ 3 ประตู',text:'112 = 20*3',total:60},{name:'ล่าง + กลับ',text:'ล่าง\n12 = 20*20\n13 = 20*20',total:80},{name:'ตัวละ',text:'12,21 ตัวละ 20',total:40}];
</script>
<template>
<div class="shell">
<header><a class="brand" href="/"><span class="brand-mark">L.</span>Lottory<span class="badge">CALCULATOR</span></a><select v-model="locale" aria-label="Language"><option value="th">ภาษาไทย</option><option value="en">English</option></select></header>
<main>
<div class="intro"><div><div class="eyebrow">YOUR SLIP, SIMPLIFIED</div><h1>{{tr('คำนวณโพย','Calculate')}}<span>{{tr('อย่างมั่นใจ','with confidence')}}</span></h1><p>{{t('subtitle')}}</p></div><button class="primary" @click="exportFile" :disabled="busy || !saved.bets.length">↓ {{t('export')}}</button></div>
<div v-if="message" class="notice" role="status">{{message}} <button @click="message=''">×</button></div>
<div class="workspace">
<section class="card input-card"><div class="section-heading"><h2><span class="step">01</span>{{t('input')}}</h2><span class="muted">{{tr('คำนวณอัตโนมัติ','Live calculation')}}</span></div>
<label class="field-label" for="slip">{{tr('ข้อความในโพย','Slip text')}}</label><textarea id="slip" v-model="s.text" maxlength="100000" spellcheck="false" placeholder="บน-ล่าง&#10;12 = 20*20&#10;13,14 = 50*50"></textarea><div class="hint">ใช้ = หรือ ตัวละ • ใส่หัวข้อ บน / ล่าง / บน-ล่าง เพื่อระบุประเภท</div>
<div ref="drop" class="drop-zone" :class="{over:isOverDropZone}"><span class="upload-icon">↥</span><strong>{{tr('หรืออ่านโพยจากรูปภาพ','Or upload a slip image')}}</strong><p>{{tr('ลากรูปมาวาง หรือเลือกไฟล์ · ไม่เกิน 5 MB','Drop or choose an image · up to 5 MB')}}</p><input type="file" accept="image/png,image/jpeg,image/webp" aria-label="เลือกรูปโพย" @change="selectFile(($event.target as HTMLInputElement).files?.[0])"></div>
<div v-if="preview" class="preview"><img :src="preview" alt="รูปโพยที่เลือก"><button @click="ocr" :disabled="busy">{{busy?'กำลังอ่าน…':t('extract')}}</button></div>
<div v-if="ocrReady" class="ocr-review"><h3>ตรวจทานข้อความจากรูป</h3><p>ตรวจเลข ยอดเงิน และหัวข้อให้ถูกต้องก่อนใช้ <span v-if="confidence!==null">(ความมั่นใจ {{Math.round(confidence)}}%)</span></p><textarea v-model="ocrText" aria-label="แก้ไขข้อความ OCR"></textarea><button class="primary" @click="useOcr">ใช้ข้อความนี้แทนโพยปัจจุบัน</button></div>
<details><summary>{{t('help')}}</summary><div class="examples"><button v-for="ex in examples" :key="ex.name" @click="s.text=ex.text"><strong>{{ex.name}}</strong><code>{{ex.text}}</code><span>รวม {{ex.total}} บาท ↗</span></button></div><p class="hint">ไม่ซื้อเลขกลับ เลขกลับจะไม่ถูกรางวัล • เลขเบิ้ลที่กรอกสองยอดจะรวมทั้งสองยอด</p></details>
<div class="bill-save"><label>{{tr('เลขบิล','Bill number')}}<input v-model="billNumber" type="number" min="1" step="1" aria-label="Bill number"></label><strong>la({{billNumber}})</strong><span>{{tr('ยอดบิลนี้','Current bill total')}}: {{fmt(parsed.total)}} {{tr('บาท','THB')}}</span><button class="primary" @click="saveBill" :disabled="busy || !parsed.bets.length || !!parsed.errors.length">{{editingBill===null?tr('บันทึกบิล','Save bill'):tr('บันทึกการแก้ไขบิล','Update bill')}}</button><button v-if="editingBill!==null" @click="resetBill">{{tr('ยกเลิกการแก้ไข','Cancel editing')}}</button></div>
<div class="card"><div class="section-heading"><h2>{{tr('รายการในบิลที่กำลังกรอก','Current bill entries')}}</h2><span class="count">{{parsed.bets.length}}</span></div>
<ul v-if="parsed.errors.length" class="errors"><li v-for="e in parsed.errors" :key="e.line">บรรทัด {{e.line}}: {{e.msg}}</li></ul>
<div v-if="!parsed.bets.length" class="empty"><span>≡</span><h3>{{tr('เริ่มจากกรอกโพยของคุณ','Start with your slip')}}</h3><p>{{tr('รายการและยอดรวมจะปรากฏที่นี่ หรือลองเลือกตัวอย่างด้านซ้าย','Your entries and total will appear here. You can also try an example.')}}</p></div>
<div v-else class="table-wrap"><table><thead><tr><th>{{tr('บรรทัด','Line')}}</th><th>{{tr('เลข','Number')}}</th><th>{{tr('ประเภท','Type')}}</th><th class="right">{{tr('จำนวนเงิน','Amount')}}</th><th>{{tr('จัดการ','Actions')}}</th></tr></thead><tbody><tr v-for="(b,i) in parsed.bets" :key="rowKeys[i]" ><td class="muted">{{b.source}}</td><td><strong class="number">{{b.number}}</strong></td><td><span class="type">{{displayLabel(b.type)}}</span></td><td class="right">{{fmt(b.amount)}}</td><td class="row-actions"><button type="button" @click="editRow(i)" :disabled="!!parsed.errors.length">{{tr('แก้ไข','Edit')}}</button><button type="button" class="delete-row" @click="changeRow(rowKeys[i],null)" :disabled="!!parsed.errors.length">{{tr('ลบ','Delete')}}</button></td></tr></tbody></table></div>
<div v-if="undoChanges" class="edit-toolbar"><button type="button" @click="undoRow">{{tr('ย้อนกลับรายการล่าสุด','Undo last change')}}</button></div>
<form v-if="editing!==null" class="row-editor" @submit.prevent="saveRow">
<h3>{{tr('แก้ไขรายการ','Edit entry')}}</h3>
<div class="edit-fields"><label>{{tr('เลข','Number')}}<input v-model="draft.number" inputmode="numeric" maxlength="3" required aria-label="Edit number"></label><label>{{tr('ประเภท','Type')}}<select v-model="draft.type" aria-label="Edit type"><option v-for="type in types" :key="type" :value="type">{{displayLabel(type)}}</option></select></label><label>{{tr('จำนวนเงิน','Amount')}}<input v-model="draft.amount" type="number" min="0.01" max="10000000" step="0.01" required aria-label="Edit amount"></label></div>
<p v-if="editError" class="errors" role="alert">{{editError}}</p><div class="row-actions"><button type="submit" class="primary">{{tr('บันทึก','Save')}}</button><button type="button" @click="editing=null">{{tr('ยกเลิก','Cancel')}}</button></div>
</form>
<p v-if="Object.keys(adjustments).length" class="hint">{{tr('ยอดรวม ตรวจรางวัล และ Excel ใช้รายการที่แก้ไขแล้ว การแก้ข้อความโพยหรือกติกาจะเริ่มรายการใหม่','Totals, results and Excel use your edited entries. Changing slip text or rules resets row changes.')}}</p>
<div v-if="parsed.lines.length" class="line-totals"><span v-for="l in parsed.lines" :key="l.line">บรรทัด {{l.line}}: {{fmt(l.total)}}</span></div>
</div>
</section>
<section class="result-column">
<div class="total-card"><div class="eyebrow">{{tr('ยอดรวมบิลที่บันทึกแล้ว','Saved bills total')}}</div><div class="total">{{fmt(saved.total)}} <span>{{tr('บาท','THB')}}</span></div><p>{{bills.length}} {{tr('บิล','bills')}} · {{saved.bets.length}} {{tr('รายการ','entries')}}</p><div class="subtotals"><div v-for="type in types" :key="type"><span>{{displayLabel(type)}}</span><strong>{{fmt(saved.breakdown[type])}}</strong></div></div></div>
<div class="card saved-bills"><div class="section-heading"><h2><span class="step">02</span>{{tr('รายการที่คำนวณแล้ว','Saved bills')}}</h2><span class="count">{{bills.length}}</span></div>
<p v-if="!bills.length" class="empty">{{tr('ยังไม่มีบิล กรอกข้อมูลแล้วกดบันทึกบิล','No saved bills. Enter a slip and save it first.')}}</p>
<details v-for="bill in billViews" :key="bill.id" class="bill-dropdown"><summary><strong>la({{bill.id}})</strong><span>{{bill.parsed.bets.length}} {{tr('รายการ','entries')}}</span><strong>{{fmt(bill.parsed.total)}} {{tr('บาท','THB')}}</strong></summary>
<p v-if="checked" class="checked">{{tr('ถูก','Wins')}} {{billWins[bill.id].count}} {{tr('รายการ • ยอดจ่าย','entries • payout')}} {{fmt(billWins[bill.id].payout)}} {{tr('บาท','THB')}}</p><div class="row-actions"><button @click="loadBill(bill)">{{tr('แก้ไขบิล','Edit bill')}}</button><button class="delete-row" @click="deleteBill(bill.id)">{{tr('ลบบิล','Delete bill')}}</button></div>
<div class="table-wrap"><table><thead><tr><th>{{tr('บรรทัด','Line')}}</th><th>{{tr('เลข','Number')}}</th><th>{{tr('ประเภท','Type')}}</th><th class="right">{{tr('จำนวนเงิน','Amount')}}</th></tr></thead><tbody><tr v-for="(bet,index) in bill.parsed.bets" :key="index"><td>{{bet.source}}</td><td class="number">{{bet.number}}</td><td>{{displayLabel(bet.type)}}</td><td class="right">{{fmt(bet.amount)}}</td></tr></tbody></table></div></details>
<button v-if="deletedBill" @click="restoreBill">{{tr('ย้อนกลับการลบบิลล่าสุด','Undo last bill deletion')}}</button>
<p class="hint">{{tr('Excel รวมยอดซื้อ 1 แถวต่อบิลที่บันทึกแล้ว','Excel includes one purchase-total row per saved bill.')}}</p></div>
<div class="card"><h2><span class="step">03</span>{{t('check')}}</h2><p class="hint">{{tr('ตรวจเฉพาะบิลที่บันทึกแล้ว กรอกผลรางวัลและอัตราจ่ายต่อ 1 บาท','Checks saved bills. Enter draw results and payout per 1 THB.')}}</p><div class="rates"><label v-for="type in requiredTypes" :key="type">{{displayLabel(type)}} — {{tr('จ่ายต่อ 1 บาท','payout per 1 THB')}}<input v-model="s.rates[type]" type="number" min="0" max="1000000" step="any" :aria-label="'Rate '+type" :placeholder="tr('กรอกอัตราจ่าย','Enter payout rate')"></label></div><p v-if="checkError" class="errors" role="alert">{{checkError}}</p><div class="draw-fields"><label>{{tr('3 ตัวบน','3-digit top')}}<input v-model="top3" inputmode="numeric" maxlength="3" placeholder="000"></label><label>{{tr('2 ตัวล่าง','2-digit bottom')}}<input v-model="bottom2" inputmode="numeric" maxlength="2" placeholder="00"></label><button @click="checkResult">{{tr('ตรวจผล','Check')}}</button></div><div v-if="checked" class="checked">ถูก {{checked.wins.length}} รายการ · ยอดจ่าย <strong>{{fmt(checked.payout)}} บาท</strong></div>
<details><summary>{{t('settings')}}</summary><label class="toggle"><input type="checkbox" v-model="s.permutationRule">{{tr('ตีความ *6 / *3 / *1 เป็นการกลับเลข เมื่อเท่ากับจำนวนเลขกลับที่ไม่ซ้ำ','Interpret *6 / *3 / *1 as permutations when the count matches')}}</label><p class="hint">{{tr('ส่งออกเฉพาะบิลที่บันทึกแล้ว โดยรวมยอดซื้อหนึ่งแถวต่อบิล','Only saved bills are exported, with one total row per bill.')}}</p><div class="rates"><label>{{tr('ชื่อรายงาน Excel','Excel report title')}}<input v-model="reportTitle" maxlength="120"></label><label>{{tr('ส่วนลด (%)','Discount (%)')}}<input v-model="commissionPercent" type="number" min="0" max="100" step="0.01"></label></div></details>
</div>
</section>
</div><footer>LOTTORY <span>{{tr('คำนวณตามรายการที่กรอก · ตรวจทานข้อมูลก่อนใช้งาน','Calculated from your entries · Review before use')}}</span></footer>
</main></div>
</template>
