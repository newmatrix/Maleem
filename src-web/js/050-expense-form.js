/* expense date: today / yesterday / any past day */
const todayKey=()=>dayKey(Date.now());
const yestKey=()=>{const d=new Date();d.setDate(d.getDate()-1);return dayKey(d)};
let selDay=dayKey(Date.now());
const expenseClock=ts=>{const d=new Date(ts);return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')};
function expenseTimestamp(keep){
  const time=$('#expenseTime').value;
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)||!isDK(selDay))return null;
  if(keep&&dayKey(keep)===selDay&&expenseClock(keep)===time)return keep;
  const [y,m,d]=selDay.split('-').map(Number),[h,n]=time.split(':').map(Number);
  return new Date(y,m-1,d,h,n).getTime();
}
/* Expense date: a pill next to the payment pill. Any day other than today colours the pill, so it is not missed. */
const CHEV='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>';
function paintDate(){
  const t=todayKey(), y=yestKey(), other=selDay!==t&&selDay!==y;
  const [sy,sm,sd]=selDay.split('-'), label= selDay===t?'النهارده': selDay===y?'امبارح': (+sy===new Date().getFullYear()? `${sd}/${sm}` : dkToDMY(selDay));
  $('#datePill').innerHTML=`📅 <span>${label}</span>${CHEV}`;
  $('#datePill').classList.toggle('alt',selDay!==t);
  $('#datePill').setAttribute('aria-label','تاريخ المصروف: '+(other?dkToDMY(selDay):label));
  document.querySelectorAll('#dateMenu [data-d]').forEach(b=>b.setAttribute('aria-checked',String((b.dataset.d==='0'?t:y)===selDay)));
  $('#dateMenu .dm-other').setAttribute('aria-checked',String(other));
  $('#dateOtherTxt').textContent=TX('تاريخ تاني…');
  $('#dateIn').max=t; $('#dateIn').value=selDay;
}
function closeDateMenu(){$('#dateMenu').classList.remove('open');$('#datePill').setAttribute('aria-expanded','false')}
$('#datePill').addEventListener('mousedown',e=>e.preventDefault());
$('#datePill').onclick=e=>{e.stopPropagation(); const m=$('#dateMenu');
  if(m.classList.contains('open')){closeDateMenu();return}
  closePayMenu(); paintDate();
  m.classList.add('open'); $('#datePill').setAttribute('aria-expanded','true');
  const r=$('#datePill').getBoundingClientRect(); m.style.left=Math.max(8,Math.min(r.left,innerWidth-m.offsetWidth-8))+'px'; m.style.top=Math.max(8,Math.min(r.bottom+6,innerHeight-m.offsetHeight-8))+'px'};
$('#dateMenu').addEventListener('mousedown',e=>{if(!e.target.closest('.dm-other,.dm-time')) e.preventDefault()});
$('#dateMenu').addEventListener('click',e=>{const b=e.target.closest('[data-d]'); if(!b) return; selDay=b.dataset.d==='0'?todayKey():yestKey(); paintDate(); closeDateMenu()});
function expenseWheelMark(el){
  const i=Math.max(0,Math.min(el.children.length-1,Math.round(el.scrollTop/44)));
  [...el.children].forEach((c,j)=>{c.classList.toggle('sel',i===j);c.setAttribute('aria-selected',String(i===j))});
  el.setAttribute('aria-activedescendant',el.children[i].id);return i;
}
function expenseWheelsRead(){
  const h=expenseWheelMark($('#expenseHourWheel')),m=expenseWheelMark($('#expenseMinuteWheel'));
  $('#expenseTimeDraft').value=String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');
}
function expenseWheelsSet(){
  const cols=[$('#expenseHourWheel'),$('#expenseMinuteWheel')];
  cols.forEach((el,k)=>{if(el.children.length)return;
    el.innerHTML=Array.from({length:k?60:24},(_,i)=>`<div class="tp-it" id="${el.id}-${i}" role="option" aria-selected="false">${String(i).padStart(2,'0')}</div>`).join('');
    el.addEventListener('scroll',expenseWheelsRead);
    el.addEventListener('click',e=>{const it=e.target.closest('.tp-it');if(it){el.scrollTop=[...el.children].indexOf(it)*44;expenseWheelsRead()}});
    el.addEventListener('keydown',e=>{const i=expenseWheelMark(el),last=el.children.length-1;
      const next=e.key==='ArrowDown'?Math.min(last,i+1):e.key==='ArrowUp'?Math.max(0,i-1):e.key==='Home'?0:e.key==='End'?last:null;
      if(next!==null){e.preventDefault();el.scrollTop=next*44;expenseWheelsRead()}});
  });
  const [h,m]=$('#expenseTimeDraft').value.split(':').map(Number);
  cols[0].scrollTop=(h||0)*44;cols[1].scrollTop=(m||0)*44;cols.forEach(expenseWheelMark);
}
$('#expenseTime').addEventListener('input',paintDate);
$('#dateOtherOpen').onclick=()=>{
  closeDateMenu();$('#dateIn').value=selDay;$('#dateIn').max=todayKey();$('#expenseTimeDraft').value=$('#expenseTime').value;$('#expenseDateError').textContent='';
  $('#expenseDatePopup').showModal();expenseWheelsSet();
};
$('#expenseDateCancel').onclick=()=>$('#expenseDatePopup').close();
$('#expenseDateApply').onclick=()=>{
  const day=$('#dateIn').value,time=$('#expenseTimeDraft').value;
  if(!isDK(day)||day<'2000-01-01'||day>todayKey()){$('#expenseDateError').textContent=TX('اختار تاريخ صحيح للمصروف');return}
  const [y,m,d]=day.split('-').map(Number),[h,n]=time.split(':').map(Number);
  if(new Date(y,m-1,d,h,n).getTime()>Date.now()){$('#expenseDateError').textContent=TX('وقت المصروف مينفعش يكون في المستقبل');return}
  selDay=day;$('#expenseTime').value=time;paintDate();$('#expenseDatePopup').close();
};
document.addEventListener('click',e=>{if(!e.target.closest('#dateMenu,#datePill')) closeDateMenu()});
/* «مصروف جاي»: keeps what was typed (amount, category, note) and turns it into a reminder for a later day */
$('#dmPlan').addEventListener('click',()=>{ const pre={amount:parseFloat(amtIn.value)||'',cat:selCat,name:$('#noteInput').value.trim()}; closeDateMenu(); closeSheets(); openPlan(null,pre) });
/* quick date change from the expense menu */
let dsId=null;
function openDateSheet(id){
  const x=S.expenses.find(e=>e.id===id); if(!x) return;
  if(!expenseCanManage(x)){toast('مصروفات الأعضاء الآخرين للقراءة فقط');return} dsId=id;
  const cur=dayKey(x.ts), t=todayKey(), y=yestKey(), other=cur!==t&&cur!==y;
  $('#dsInfo').textContent=`${fmt(x.amount)} ${CS()} · ${(CAT[x.cat]||CAT.other).name} · ${dkToDMY(cur)}`;
  document.querySelectorAll('#dsRow [data-d]').forEach(b=>b.classList.toggle('on',(b.dataset.d==='0'?t:y)===cur));
  $('#dsOther').classList.toggle('on',other); $('#dsOtherTxt').textContent= other? '📅 '+dkToDMY(cur) : '📅 تاريخ تاني';
  $('#dsIn').max=t; $('#dsIn').value=cur; openSheetEl('dateSheet');
}
function moveExpenseTo(dk){
  const x=S.expenses.find(e=>e.id===dsId); closeSheets(); if(!x||dk===dayKey(x.ts)) return;
  if(!expenseCanManage(x)){toast('مصروفات الأعضاء الآخرين للقراءة فقط');return}
  const old=x.ts, o=new Date(old), [y,m,d]=dk.split('-').map(Number);
  x.ts=Math.min(Date.now(), new Date(y,m-1,d,o.getHours(),o.getMinutes()).getTime());
  const id=x.id; save(); renderAll(); setTimeout(checkAlerts,450);
  toast('اتنقل المصروف لتاريخ '+dkToDMY(dk),'تراجع',()=>{const z=S.expenses.find(e=>e.id===id); if(z){z.ts=old; save(); renderAll(); setTimeout(checkAlerts,450)}},4000);
}
$('#dsRow').addEventListener('click',e=>{const b=e.target.closest('[data-d]'); if(b) moveExpenseTo(b.dataset.d==='0'?todayKey():yestKey())});
$('#dsIn').addEventListener('change',e=>{const v=e.target.value; if(/^\d{4}-\d{2}-\d{2}$/.test(v)) moveExpenseTo(v>todayKey()?todayKey():v)});
$('#dsCancel').onclick=closeSheets;
function tsForDay(dk,keep){
  if(keep&&dayKey(keep)===dk) return keep;
  if(dk===todayKey()) return Date.now();
  const [y,m,d]=dk.split('-').map(Number); return new Date(y,m-1,d,12).getTime();
}
function closeFundMenu(){$('#fundMenu').classList.remove('open');$('#fundPill').setAttribute('aria-expanded','false')}
$('#fundPill').addEventListener('mousedown',e=>e.preventDefault());
$('#fundPill').onclick=e=>{e.stopPropagation();const m=$('#fundMenu');if(m.classList.contains('open')){closeFundMenu();return}closePayMenu();closeDateMenu();closeKindMenu();
 m.innerHTML=[['budget','💵','المرتب'],['free','💰','دخل حر']].map(([value,icon,label])=>`<button type="button" role="menuitemradio" aria-checked="${$('#expenseFund').value===value}" data-fund="${value}"><span class="pe">${icon}</span>${esc(TX(label))}</button>`).join('');
 m.classList.add('open');m.classList.remove('up');$('#fundPill').setAttribute('aria-expanded','true');const r=$('#fundPill').getBoundingClientRect();m.style.left=Math.max(8,Math.min(r.left,innerWidth-m.offsetWidth-8))+'px';m.style.top=(r.bottom+6)+'px'};
$('#fundMenu').addEventListener('mousedown',e=>e.preventDefault());
$('#fundMenu').onclick=e=>{const b=e.target.closest('[data-fund]');if(!b)return;$('#expenseFund').value=b.dataset.fund;paintExpenseFund();closeFundMenu()};
document.addEventListener('click',e=>{if(!e.target.closest('#fundMenu,#fundPill'))closeFundMenu()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeFundMenu()});
function paintPay(){const m=PAY[selPay]||PAY.cash; $('#payPill').innerHTML=`${m.e} <span>${esc(m.name)}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>`}
function closePayMenu(){$('#payMenu').classList.remove('open');$('#payPill').setAttribute('aria-expanded','false'); closeAccMenu()}
$('#payPill').addEventListener('mousedown',e=>e.preventDefault());
$('#payPill').onclick=e=>{e.stopPropagation(); const m=$('#payMenu');
  if(m.classList.contains('open')){closePayMenu();return}
  closeDateMenu();
  m.innerHTML=S.pays.map(x=>`<button type="button" role="menuitemradio" aria-checked="${x.id===selPay}" data-pay="${esc(x.id)}"><span class="pe">${esc(x.e)}</span>${esc(x.name)}</button>`).join('');
  m.classList.add('open'); m.classList.remove('up'); $('#payPill').setAttribute('aria-expanded','true');
  const r=$('#payPill').getBoundingClientRect(); m.style.left=Math.max(8,r.left)+'px'; m.style.top=(r.bottom+6)+'px'};
$('#payMenu').addEventListener('mousedown',e=>e.preventDefault());
$('#payMenu').onclick=e=>{const b=e.target.closest('[data-pay]'); if(!b) return; selPay=b.dataset.pay; paintPay(); closePayMenu()};
document.addEventListener('click',e=>{if(!e.target.closest('#payMenu,#payPill')) closePayMenu()});
function openSheet(id,pre){
  const target=id?S.expenses.find(e=>e.id===id):null;
  if(target&&!expenseCanManage(target)){toast('مصروفات الأعضاء الآخرين للقراءة فقط');return}
  editId=id||null; fxPending= pre&&pre.fx? pre.fx : null; plPending= !target&&pre&&pre.pl? pre.pl : null;
  capOpen= !target&&pre&&pre.cap? {id:pre.cap,ts:pre.ts} : null;
  rcStage=null;
  const x=target;
  $('#expenseFund').value=x&&x.fund==='free'?'free':'budget';paintExpenseFund();
  renderCatGrid();
  amtIn.value= x? String(x.amount): pre&&pre.amount? String(pre.amount):''; selCat= x&&CAT[x.cat]? x.cat: pre&&CAT[pre.cat]? pre.cat:null;
  $('#noteInput').value= x? (x.note||''): pre? (pre.note||''):'';
  $('#ipFeeRow').hidden=!(!target&&pre&&pre.ipf&&S.ipFee.on); $('#ipFeeChk').checked=true; ipFeePaint();
  $('#fxSkip').hidden=!(fxPending||plPending); $('#fxSkip').textContent= plPending? 'مش هسجله، شيله من المصروفات الجاية' : TX('تخطي الاستحقاق ده'); setCalc(false); showCalc(); renderNoteSug();
  selPay= x? payOf(x) : pre&&PAY[pre.pay]? pre.pay : (PAY[S.lastPay]?S.lastPay:'cash'); paintPay(); closePayMenu();
  selAcc= x? (x.acc||'') : pre&&typeof pre.acc==='string'? (ACC(pre.acc)?pre.acc:'') : (ACC(S.lastAcc)?S.lastAcc:''); paintAccRow();
  $('#expenseTime').value=expenseClock(x?x.ts:capOpen&&capOpen.ts?capOpen.ts:Date.now());
  selDay= x? dayKey(x.ts) : pre&&isDK(pre.day)&&pre.day<=todayKey()? pre.day : todayKey(); paintDate();
  $('#rcRow').hidden=!RC.can; rcPaint();
  $('#sheetTitle').textContent= x?'تعديل مصروف':'مصروف جديد';
  $('#kindPill').hidden=!!(x||fxPending||plPending||capOpen); $('#sheetTitle').hidden=!$('#kindPill').hidden;
  $('#saveBtn').textContent= x?'حفظ التعديل':'حفظ';
  $('#delInSheet').hidden=!x; $('#expActions').classList.toggle('has-del',!!x);
  $('#amountBox').classList.remove('err');$('#sheetErr').textContent='';markCat();$('#cats').classList.remove('err');
  $('#scrim').classList.add('open');$('#sheet').classList.add('open');
  amtIn.focus({preventScroll:true}); if(x||(pre&&pre.amount)) amtIn.select();
}
function ipFeePaint(){ if($('#ipFeeRow').hidden) return; const v=readAmt(), f=v>0?ipFeeOf(v):0; $('#ipFeeTxt').innerHTML=`سجّل رسوم إنستاباي كمان${f?': '+fmt(f)+' '+CS():''}<small>مصروف منفصل بفئة «رسوم بنكية»، على نفس الحساب وطريقة الدفع</small>` }
amtIn.addEventListener('input',ipFeePaint);
function closeSheets(){
  $('#updNever').hidden=true;
  closeDebtCurrency();
  if($('#expenseDatePopup').open)$('#expenseDatePopup').close();
  closeFundMenu();
  if(voiceOn) voiceCancel();
  if(CURX){CURX=null; $('#currencySel').value=S.currency} // a currency change nobody confirmed
  $('#scrim').classList.remove('hi'); if(RS){RS.seq++; RS.busy=false; RS.hold=null}
  wpCloseAll();
  rcStage=null; capOpen=null; trCaps=null; inCap=null; dCap=null; payCap=null; RF=null;
  closePayMenu(); closeDateMenu(); closeKindMenu();
  $('#scrim').classList.remove('open');$('#sheet').classList.remove('open');$('#pinSheet').classList.remove('open');$('#expSheet').classList.remove('open');$('#catSheet').classList.remove('open');['debtSheet','paySheet','gamSheet','wipeSheet','curSheet','formSheet','timeSheet','pctSheet','autoBkSheet','dateSheet','capSheet','impSheet','credSheet','mbSheet','updSheet','rsSheet','accSheet','trSheet','mvSheet','freeSheet','moneySheet','instSheet','iiSheet','ipSheet','inSheet','caSheet','pkSheet','curAddSheet','dAddSheet','dLogSheet','sugSheet','rcnSheet','clsSheet','gdSheet','rfSheet','trashSheet','searchSheet','bkEncSheet','bkPassSheet'].forEach(i=>$('#'+i).classList.remove('open'));
  $('#noteInput').blur();$('#catName').blur();$('#searchIn').blur();bkePassDone(null);amtIn.blur();
  if(pinMode){pinMode=null;$('#pinToggle').checked=!!hasPin()}
}
$('#fab').onclick=()=>{ if(tab==='debts'){ obTab==='gams'? openGamSheet() : obTab==='insts'? openInstSheet() : openDebtSheet() } else openSheet() };
$('#cancelBtn').onclick=closeSheets;
$('#scrim').onclick=closeSheets;
$('#saveBtn').onclick=()=>{
  const v=readAmt();
  if(!v||v<=0){$('#amountBox').classList.add('err');$('#sheetErr').textContent='اكتب المبلغ الأول';amtIn.focus();return}
  if(!selCat){$('#cats').classList.add('err');$('#sheetErr').textContent='اختار الفئة';return}
  const note=$('#noteInput').value.trim();
  const ac=selAcc&&ACC(selAcc)||null; let accAmt=null;
  if(ac){ const x0=editId&&S.expenses.find(e=>e.id===editId);
    accAmt= x0&&x0.acc===ac.id&&x0.accAmt&&x0.amount===v? x0.accAmt : toAcc(v,ac);
    if(accAmt==null){$('#sheetErr').textContent='الحساب ده بعملة تانية ومفيش سعر صرف متاح دلوقتي. اختار حساب بنفس العملة، أو جرّب لما النت يشتغل'; ratesRefresh(false); return} }
  const funding=$('#expenseFund').value==='free'?'free':'budget';
  const extraFee=!editId&&!$('#ipFeeRow').hidden&&$('#ipFeeChk').checked?ipFeeOf(v):0;
  if(funding==='free'&&v+extraFee>freeIncomeBalance(editId)+EPS){$('#sheetErr').textContent=TX('رصيد الدخل الحر مش كفاية للمصروف ورسومه. اختار ميزانية المرتب أو زوّد الدخل الحر.');return}
  const previous=editId&&S.expenses.find(e=>e.id===editId);
  const expenseTs=expenseTimestamp(previous?previous.ts:capOpen&&capOpen.ts);
  if(expenseTs===null){$('#sheetErr').textContent=TX('اختار وقت صحيح للمصروف');return}
  if(expenseTs>Date.now()){$('#sheetErr').textContent=TX('وقت المصروف مينفعش يكون في المستقبل');return}
  if(!editId&&fxPending&&S.fixedLog[fxPending.id+':'+fxPending.mk]){$('#sheetErr').textContent=TX('الاستحقاق ده متسجل بالفعل');return}
  let savedId=editId, feeAdded=0;
  if(editId){const x=S.expenses.find(e=>e.id===editId); if(x&&!expenseCanManage(x)){closeSheets();toast('مصروفات الأعضاء الآخرين للقراءة فقط');return} if(x){x.amount=v;if(funding==='free')x.fund='free';else delete x.fund;delete x.o;x.cat=selCat;x.note=note;x.pay=selPay;x.ts=expenseTs; if(ac){x.acc=ac.id;x.accAmt=accAmt}else{delete x.acc;delete x.accAmt}}}
  else {const id=uid();justAdded=id;savedId=id;
    const ts=expenseTs; // Keep captured timestamps unless the user changes their date or time.
    const e={id,amount:v,cat:selCat,note,pay:selPay,ts};if(funding==='free')e.fund='free'; S.lastPay=selPay; if(S.accounts.length) S.lastAcc=ac?ac.id:''; if(ac){e.acc=ac.id;e.accAmt=accAmt}
    if(fxPending){e.fx=fxPending.id;S.fixedLog[fxPending.id+':'+fxPending.mk]='done'}
    if(plPending) S.plans=S.plans.filter(x=>x.id!==plPending); // the planned expense became a real one
    if(capOpen) S.capQ=(S.capQ||[]).filter(q=>q.id!==capOpen.id);
    S.expenses.push(e)
    if(!$('#ipFeeRow').hidden&&$('#ipFeeChk').checked){ const fee=ipFeeOf(v), fa=ac&&fee>0?toAcc(fee,ac):null;
      if(fee>0){ if(!CAT.bank){const k=S.cats.findIndex(c=>c.id==='other'); S.cats.splice(k<0?S.cats.length:k,0,{id:'bank',name:'رسوم بنكية',e:'🏦',c:'#0F766E'}); syncCats()}
        const fe={id:uid(),amount:fee,cat:CAT.bank?'bank':'other',note:'رسوم إنستاباي',pay:selPay,ts};if(funding==='free')fe.fund='free'; if(ac&&fa!=null){fe.acc=ac.id;fe.accAmt=fa} S.expenses.push(fe); feeAdded=fee } } }
  fxPending=null; plPending=null; capOpen=null;
  rcCommit(savedId);
  save();closeSheets();renderAll();justAdded=null;
  setTimeout(checkAlerts,450);
  toast(editId?'اتعدل المصروف':'اتسجل '+fmt(v)+' '+CS()+' في '+CAT[selCat].name+(selDay!==todayKey()?' بتاريخ '+dkToDMY(selDay):'')+(feeAdded?' + رسوم إنستاباي '+fmt(feeAdded)+' '+CS():''));
};
/* ===== Accounts, balances and transfers =====
   One rule keeps the numbers honest: a balance is never stored. It is always  opening balance - what was paid from it + what came in by transfer.
   So editing or deleting an expense or a transfer fixes every balance by itself, and nothing is counted twice.
   A transfer between my own accounts lives in S.transfers only: it is never an expense and never income, so reports ignore it.
   An amount in another currency is converted only with a real rate (rates.json or one the person typed): never guessed. */
const ACC=id=>S.accounts.find(a=>a.id===id)||null;
const curSym=id=>(CURRENCIES.find(c=>c.id===id)||{s:id}).s;
/* several accounts can share a name (two "هشام" cards): the bank and the last 4 digits tell them apart wherever they are listed */
const accDisp=a=>{ if(!a) return ''; const nm=x=>String(x.name).trim().toLowerCase();
  if(!S.accounts.some(o=>o.id!==a.id&&nm(o)===nm(a))) return a.name;
  const bits=[a.bank,a.last4?'••'+a.last4:''].filter(Boolean); return bits.length? a.name+' · '+bits.join(' ') : a.name };
function accBal(id){
  const a=ACC(id); if(!a) return 0; let b=a.open;
  S.expenses.forEach(e=>{if(e.acc===id) b-=e.accAmt||0});
  S.transfers.forEach(t=>{if(t.from===id) b-=t.out+t.fee; if(t.to===id) b+=t.in});
  S.instPays.forEach(p=>{if(p.acc===id) b-=p.accAmt||0});
  S.inflows.forEach(x=>{if(x.acc===id) b+=x.accAmt||0});
  S.debts.forEach(d=>{ const s=d.dir==='in'?1:-1; // got money back (+) / paid a debt (-); and the loan itself and every addition the other way round
    if(d.acc===id) b-=s*(d.accAmt||0); (d.adds||[]).forEach(a=>{if(a.acc===id) b-=s*(a.accAmt||0)}); (d.payments||[]).forEach(p=>{if(p.acc===id) b+=s*(p.accAmt||0)}) });
  S.gold.forEach(g=>{ if(g.acc===id) b-=g.accAmt||0; if(g.sold&&g.sold.acc===id) b+=g.sold.accAmt||0 }); // gold bought from the account (-) and sold into it (+)
  return r2(b);
}
const accUsed=id=>S.expenses.some(e=>e.acc===id)||S.transfers.some(t=>t.from===id||t.to===id)||S.instPays.some(p=>p.acc===id)||S.inflows.some(x=>x.acc===id)||S.debts.some(d=>debtAccRows(d).some(p=>p.acc===id))||S.gold.some(g=>goldAccRows(g).some(p=>p.acc===id));
/* the loan itself, its additions and its payments: every row of a debt that can point at an account */
const debtAccRows=d=>[d].concat(d.adds||[],d.payments||[]);
const goldAccRows=g=>g.sold?[g,g.sold]:[g];
/* an amount in the app currency -> the account's currency (null = no rate, so no guess) */
function toAcc(v,a){ if(a.cur===S.currency) return r2(v); const k=rateFor(S.currency,a.cur); return k>0?Math.max(0.01,r2(v*k)):null }
/* an amount in some currency -> the app currency (null = no rate) */
function toMain(v,cur){ if(cur===S.currency) return v; const k=rateFor(cur,S.currency); return k>0?v*k:null }
function moneyTotals(){
  let tot=0; const missing=[];
  S.accounts.forEach(a=>{const m=toMain(accBal(a.id),a.cur); if(m==null) missing.push(a); else tot+=m});
  return {tot:r2(tot),missing};
}
var accRatesAsked=false;
function accEnsureRates(){
  if(accRatesAsked||!S.accounts.some(a=>a.cur!==S.currency)) return;
  if(S.accounts.every(a=>a.cur===S.currency||rateFor(a.cur,S.currency)>0)) return;
  accRatesAsked=true; ratesRefresh(false,()=>{try{renderAccounts();renderMoney()}catch(e){}});
}
/* money that is really there, split into "for this period's budget" and "savings". Savings are what is left after the budget: the same money is never counted twice */
function mvState(){
  const {tot,missing}=moneyTotals(), fixed=S.budgetMode==='fixed'&&S.budget>0;
  if(!fixed) return {tot,missing,fixed,rem:0,forB:0,sav:0};
  const rem=Math.max(0,r2(budOf(periodOf(Date.now()))-budgetSpent(periodOf(Date.now())))), pos=Math.max(0,tot), forB=Math.min(rem,pos);
  return {tot,missing,fixed,rem,forB:r2(forB),sav:r2(pos-forB)};
}
var selAcc='';
const ACC_NONE_NOTE='بيتحسب من الميزانية بتاعتك';
function paintAccRow(){
  const p=$('#accPill'); p.hidden=!S.accounts.length; document.querySelector('.head-pills').classList.toggle('three',!p.hidden); if(p.hidden){closeAccMenu();return}
  if(!ACC(selAcc)) selAcc='';
  const a=ACC(selAcc);
  p.innerHTML=`${a?esc(ACC_TYPES[a.type].e):'🧾'} <span class="acc-pn">${a?esc(accDisp(a)):'بدون حساب'}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>`;
}
function closeAccMenu(){const m=$('#accMenu'); if(m) m.classList.remove('open'); const p=$('#accPill'); if(p) p.setAttribute('aria-expanded','false')}
$('#accPill').addEventListener('mousedown',e=>e.preventDefault());
$('#accMenu').addEventListener('mousedown',e=>e.preventDefault());
$('#accPill').onclick=e=>{ e.stopPropagation(); const m=$('#accMenu');
  if(m.classList.contains('open')){closeAccMenu();return}
  closePayMenu(); closeDateMenu();
  m.innerHTML=`<button type="button" role="menuitemradio" aria-checked="${!selAcc}" data-accpick=""><span class="pe">🧾</span><span class="acc-mi">من غير حساب<small>${ACC_NONE_NOTE}</small></span></button>`+
    S.accounts.map(a=>`<button type="button" role="menuitemradio" aria-checked="${a.id===selAcc}" data-accpick="${esc(a.id)}"><span class="pe">${esc(ACC_TYPES[a.type].e)}</span><span class="acc-mi">${esc(accDisp(a))}<small>${fmt(accBal(a.id))} ${esc(curSym(a.cur))}</small></span></button>`).join('');
  m.classList.add('open'); $('#accPill').setAttribute('aria-expanded','true');
  positionAccMenu();};
function positionAccMenu(){
  const m=$('#accMenu');if(!m.classList.contains('open'))return;
  const r=$('#accPill').getBoundingClientRect(), vv=window.visualViewport;
  const top=vv?vv.offsetTop:0, left=vv?vv.offsetLeft:0, height=vv?vv.height:innerHeight, width=vv?vv.width:innerWidth;
  const below=Math.max(0,top+height-r.bottom-14), above=Math.max(0,r.top-top-14);
  const up=below<Math.min(m.scrollHeight,240)&&above>below;
  m.style.maxHeight=Math.max(0,up?above:below)+'px';m.classList.toggle('up',up);
  m.style.left=Math.max(left+8,Math.min(r.left,left+width-m.offsetWidth-8))+'px';
  m.style.top=(up?Math.max(top+8,r.top-m.offsetHeight-6):r.bottom+6)+'px';
}
window.addEventListener('resize',positionAccMenu);
if(window.visualViewport){visualViewport.addEventListener('resize',positionAccMenu);visualViewport.addEventListener('scroll',positionAccMenu)}
$('#sheet').addEventListener('scroll',closeAccMenu);

$('#accMenu').onclick=e=>{const b=e.target.closest('[data-accpick]'); if(!b) return; selAcc=b.dataset.accpick; paintAccRow(); closeAccMenu()};

