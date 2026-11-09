/* --- add / edit a plan --- */
var instEdit=null, instMonthlyAuto=true;
(function(){ const m=$('#instMonths'); for(let i=1;i<=60;i++) m.insertAdjacentHTML('beforeend',`<option value="${i}">${i} ${i<=10?(i===1?'شهر':'شهور'):'شهر'}</option>`) })();
function instAutoMonthly(){ if(!instMonthlyAuto) return; const t=evalExpr($('#instTotal').value), n=+$('#instMonths').value; $('#instMonthly').value= t>0&&n>0? String(r2(t/n)) : '' }
$('#instTotal').oninput=instAutoMonthly; $('#instMonths').onchange=instAutoMonthly; $('#instMonthly').oninput=()=>{instMonthlyAuto=false};
function openInstSheet(id){
  const p=id?S.insts.find(x=>x.id===id):null; instEdit=p?p.id:null; instMonthlyAuto=true;
  $('#instTitle').textContent=p?'تعديل التقسيط':'تقسيط جديد'; $('#instSave').textContent=p?'حفظ التعديل':'حفظ';
  $('#instName').value=p?p.name:''; $('#instParty').value=p?p.party:''; $('#instGen').hidden=!!p; $('#instCur').textContent=CS();
  $('#instTotal').value=''; $('#instMonths').value='6'; $('#instMonthly').value=''; $('#instFirst').value=addMonthDK(todayKey(),1);
  $('#instRec').checked=p?p.rec:false; $('#instRec').disabled=!!p; $('#instErr').textContent='';
  $('#scrim').classList.add('open'); $('#instSheet').classList.add('open');
}
$('#instCancel').onclick=closeSheets;
$('#instSave').onclick=()=>{
  const E=m=>{$('#instErr').textContent=m}, name=$('#instName').value.trim(), party=$('#instParty').value.trim();
  if(!name){E('اكتب اشتريت إيه');return}
  if(instEdit){ const p=S.insts.find(x=>x.id===instEdit); if(!p) return; p.name=name.slice(0,60); p.party=party.slice(0,40); save();closeSheets();renderAll();toast('اتعدّل التقسيط');return }
  const total=evalExpr($('#instTotal').value), n=+$('#instMonths').value, monthly=evalExpr($('#instMonthly').value), first=$('#instFirst').value;
  if(!(total>0&&total<MAXAMT)){E('اكتب إجمالي المبلغ');return}
  if(!(monthly>0&&monthly<MAXAMT)){E('اكتب القسط الشهري');return}
  if(!isDK(first)){E('اختار ميعاد أول قسط');return}
  const last=r2(total-r2(monthly)*(n-1)); if(!(last>0)){E('القسط الشهري × عدد الشهور أكبر من الإجمالي');return}
  const items=[]; for(let i=0;i<n;i++) items.push({id:uid(),amount:i===n-1?last:r2(monthly),due:addMonthDK(first,i)});
  const id=uid(); justAddedOb=id; S.insts.push({id,name:name.slice(0,60),party:party.slice(0,40),rec:$('#instRec').checked,items,created:Date.now()});
  obTab='insts'; save();closeSheets();renderAll();justAddedOb=null;
  toast(`اتسجّل تقسيط «${name}»: ${n} ${n<=10?'أقساط':'قسط'}`);
};
function deleteInst(id){
  const i=S.insts.findIndex(x=>x.id===id); if(i<0) return; const p=S.insts[i], ids=new Set(p.items.map(x=>x.id));
  if(S.instPays.some(x=>ids.has(x.item))){toast('التقسيط ده عليه مدفوعات متسجلة من غير مصروف. احذفها الأول من داخل كل قسط عشان الأرصدة متتلخبطش',null,null,6000);return}
  const linked=S.expenses.filter(e=>e.inst&&ids.has(e.inst)).map(e=>[e,e.inst]);
  S.insts.splice(i,1); const tid=trashPut('inst',p,i,linked.map(([e,v])=>[e.id,v])); linked.forEach(([e])=>{delete e.inst}); save();renderAll();
  toast('اتحذف «'+p.name+'» (الأقساط اللي دفعتها فاضلة في مصاريفك)','تراجع',()=>{trashDel(tid);S.insts.splice(Math.min(i,S.insts.length),0,p);linked.forEach(([e,v])=>{e.inst=v});save();renderAll()},5000);
}

/* --- one installment: change its amount / date, see and delete its payments --- */
var iiFor=null;
function instPayList(it){
  const L=[]; S.expenses.forEach(e=>{if(e.inst===it.id) L.push({k:'e',id:e.id,amount:e.amount,ts:e.ts,acc:e.acc})});
  S.instPays.forEach(x=>{if(x.item===it.id) L.push({k:'p',id:x.id,amount:x.amount,ts:x.ts,acc:x.acc})});
  return L.sort((a,b)=>a.ts-b.ts);
}
function openItemSheet(itemId){
  const p=instOf(itemId); if(!p) return; const it=p.items.find(i=>i.id===itemId), idx=p.items.indexOf(it); iiFor=itemId;
  $('#iiTitle').textContent=`${p.name} · القسط ${idx+1}`;
  $('#iiInfo').textContent=`دفعت ${fmt(itemPaid(it))} من ${fmt(it.amount)} ${CS()}`;
  $('#iiAmt').value=String(it.amount); $('#iiDue').value=it.due; $('#iiErr').textContent=''; $('#iiPay').hidden=itemDone(it);
  $('#iiHist').innerHTML=instPayList(it).map(x=>{const a=ACC(x.acc); return `<li><span>دفعت ${fmt(x.amount)} ${CS()}${a?' · '+esc(accDisp(a)):''}</span><span class="ipd">${esc(shortDate(x.ts))}<button type="button" data-ipdel="${x.k}:${esc(x.id)}">حذف</button></span></li>`}).join('');
  $('#scrim').classList.add('open'); $('#iiSheet').classList.add('open');
}
$('#iiCancel').onclick=closeSheets;
$('#iiPay').onclick=()=>{const id=iiFor; closeSheets(); setTimeout(()=>openInstPay(id),260)};
$('#iiSave').onclick=()=>{
  const p=instOf(iiFor); if(!p) return; const it=p.items.find(i=>i.id===iiFor), E=m=>{$('#iiErr').textContent=m};
  const a=evalExpr($('#iiAmt').value), due=$('#iiDue').value;
  if(!(a>0&&a<MAXAMT)){E('اكتب قيمة القسط');return}
  if(!/^\d{4}-\d{2}-\d{2}$/.test(due)){E('اختار ميعاد القسط');return}
  if(a<itemPaid(it)-EPS){E(`أنت دافع ${fmt(itemPaid(it))} من القسط ده، فمينفعش يبقى أقل من كده`);return}
  const old={a:it.amount,d:it.due}; it.amount=r2(a); it.due=due; save();closeSheets();renderAll();
  toast('اتعدّل القسط','تراجع',()=>{it.amount=old.a;it.due=old.d;save();renderAll()},4000);
};
$('#iiHist').onclick=e=>{
  const b=e.target.closest('[data-ipdel]'); if(!b) return; const [k,id]=b.dataset.ipdel.split(':');
  if(k==='e'){closeSheets(); delExpense(id); return}
  const j=S.instPays.findIndex(x=>x.id===id); if(j<0) return; const [x]=S.instPays.splice(j,1); save();closeSheets();renderAll();
  toast('اتحذف الدفع','تراجع',()=>{S.instPays.push(x);save();renderAll()},5000);
};

/* --- pay (all or part of) an installment --- */
var ipFor=null;
function openInstPay(itemId){
  const p=instOf(itemId); if(!p) return; const it=p.items.find(i=>i.id===itemId), rem=itemRem(it); ipFor=itemId;
  $('#ipTitle').textContent=`دفع قسط ${p.name}`;
  $('#ipInfo').textContent=`القسط ${fmt(it.amount)} ${CS()} · ميعاده ${dkToDMY(it.due)} · فاضل ${fmt(rem)} ${CS()}`;
  $('#ipAmt').value=String(rem); $('#ipCur').textContent=CS(); $('#ipAmtBox').classList.remove('err');
  $('#ipAccRow').hidden=!S.accounts.length;
  $('#ipAcc').innerHTML='<option value="">من غير حساب</option>'+S.accounts.map(a=>`<option value="${esc(a.id)}">${esc(accDisp(a))} (${esc(curSym(a.cur))})</option>`).join('');
  $('#ipAcc').value=ACC(S.lastAcc)?S.lastAcc:'';
  $('#ipDay').max=todayKey(); $('#ipDay').value=todayKey();
  $('#ipNote').textContent=p.rec?'الشراء ده متسجل قبل كده كمصروف، فالدفع هيتخصم من الحساب بس ومش هيتحسب مصروف تاني':'القسط هيتحسب مصروف في ميزانيتك وتقاريرك';
  $('#ipErr').textContent=''; $('#scrim').classList.add('open'); $('#ipSheet').classList.add('open');
}
$('#ipCancel').onclick=closeSheets;
$('#ipSave').onclick=()=>{
  const p=instOf(ipFor); if(!p) return; const it=p.items.find(i=>i.id===ipFor), rem=itemRem(it), E=m=>{$('#ipErr').textContent=m};
  const v=evalExpr($('#ipAmt').value); if(!(v>0&&v<MAXAMT)){E('اكتب المبلغ');$('#ipAmtBox').classList.add('err');return}
  if(v>rem+EPS){E(`المبلغ أكبر من الباقي في القسط ده (${fmt(rem)} ${CS()})`);$('#ipAmtBox').classList.add('err');return}
  const ac=ACC($('#ipAcc').value)||null; let accAmt=null;
  if(ac){accAmt=toAcc(v,ac); if(accAmt==null){E('الحساب ده بعملة تانية ومفيش سعر صرف متاح دلوقتي. اختار حساب بنفس العملة، أو جرّب لما النت يشتغل'); ratesRefresh(false); return}}
  const day=$('#ipDay').value, dk=/^\d{4}-\d{2}-\d{2}$/.test(day)?(day>todayKey()?todayKey():day):todayKey(), ts=tsForDay(dk);
  let undo;
  if(!p.rec){
    ensureInstCat();
    const e={id:uid(),amount:r2(v),cat:'inst',note:('قسط '+p.name).slice(0,200),pay:PAY[S.lastPay]?S.lastPay:'cash',ts,inst:it.id}; if(ac){e.acc=ac.id;e.accAmt=accAmt}
    S.expenses.push(e); undo=()=>{S.expenses=S.expenses.filter(x=>x.id!==e.id)};
  }else{
    const x={id:uid(),item:it.id,amount:r2(v),ts}; if(ac){x.acc=ac.id;x.accAmt=accAmt}
    S.instPays.push(x); undo=()=>{S.instPays=S.instPays.filter(y=>y.id!==x.id)};
  }
  if(S.accounts.length) S.lastAcc=ac?ac.id:'';
  save();closeSheets();renderAll();setTimeout(checkAlerts,450);
  toast(itemDone(it)?`اتدفع القسط كله 🎉`:`اتسجّل ${fmt(v)} ${CS()} · فاضل ${fmt(itemRem(it))} ${CS()}`,'تراجع',()=>{undo();save();renderAll()},4000);
};

/* ===== Income that really arrived, pay types (monthly / weekly / every two weeks / variable) ===== */
/* income of a period: what was recorded. A monthly salary that was never recorded falls back to the expected "sources" (shown as expected).
   For weekly / biweekly / variable pay, money that was not received yet is never counted. */
function incomeIn(P){
  const rec=S.inflows.filter(x=>x.ts>=P.start&&x.ts<P.next), sum_=r2(rec.reduce((a,x)=>a+x.amount,0));
  if(!rec.length&&S.payType==='monthly') return {amt:incomeTotal(),expected:true,n:0};
  return {amt:sum_,expected:false,n:rec.length};
}
const PT_TXT={monthly:'شهري',weekly:'أسبوعي',biweekly:'كل أسبوعين',variable:'متغير'};
