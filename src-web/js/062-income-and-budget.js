/* what is owed in the next 30 days: installments left + fixed monthly expenses */
function obligations30(){
  const end=dayKey(new Date(Date.now()+30*864e5)); let a=0;
  S.insts.forEach(p=>p.items.forEach(i=>{ if(i.due<=end&&!itemDone(i)) a+=itemRem(i) }));
  S.fixed.forEach(f=>{a+=+f.amount||0});
  return r2(a);
}
/* average of what came in over the last 90 days (or since the first record) */
function inflowStats(){
  const now=Date.now(), from=now-90*864e5, L=S.inflows.filter(x=>x.ts>=from&&x.ts<=now+864e5);
  if(!L.length) return null;
  const first=Math.min(...L.map(x=>x.ts)), span=Math.max(14,Math.min(90,Math.ceil((now-first)/864e5)+1)), tot=r2(L.reduce((a,x)=>a+x.amount,0));
  const l60=S.inflows.filter(x=>x.ts>=now-60*864e5&&x.ts<=now+864e5).length;
  const per30= S.payType==='weekly'?30.4/7 : S.payType==='biweekly'?30.4/14 : S.payType==='monthly'?1 : Math.max(1,l60/2);
  return {n:L.length,week:r2(tot/span*7),month:r2(tot/span*30.4),per30};
}
function reservePerPayment(){ const st=inflowStats(), per=st?st.per30:(S.payType==='weekly'?30.4/7:S.payType==='biweekly'?30.4/14:1); const o=obligations30(); return o>0?r2(o/Math.max(1,per)):0 }

function paintPayType(){
  document.querySelectorAll('#payTypeSeg button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.pt===S.payType?'true':'false'));
  const L=payLen(), fx=S.budgetMode==='fixed';
  $('#anchorRow').hidden=!(L&&fx); $('#paydayRow').hidden=!!L;
  $('#payAnchor').max=todayKey(); if(S.payAnchor) $('#payAnchor').value=S.payAnchor;
  const unit=S.payType==='weekly'?'الأسبوع':S.payType==='biweekly'?'الأسبوعين':'الشهر';
  $('#budgetCardTitle').textContent='ميزانية '+unit; $('#mmTitle').textContent='فلوسي '+(L?(S.payType==='weekly'?'الأسبوع ده':'الأسبوعين دول'):'الشهر ده');
  $('#payTypeHint').textContent= S.payType==='weekly'?'الميزانية بتتحسب لكل أسبوع من آخر يوم قبضت فيه.' : S.payType==='biweekly'?'الميزانية بتتحسب لكل أسبوعين من آخر يوم قبضت فيه.' : S.payType==='variable'?'سجّل كل مبلغ بتستلمه، ومليم يحسبلك متوسط دخلك ويقترح عليك مبلغ المصاريف.' : '';
  if(L&&!fx) $('#payTypeHint').textContent='اختار «تحديد ميزانية» عشان الميزانية تتحسب لكل '+(S.payType==='weekly'?'أسبوع':'أسبوعين')+'.';
}
$('#payTypeSeg').onclick=e=>{
  const b=e.target.closest('[data-pt]'); if(!b||b.dataset.pt===S.payType) return;
  S.payType=b.dataset.pt; if(payLen()&&!S.payAnchor) S.payAnchor=todayKey();
  curMonth=periodOf(Date.now()).key;
  save();renderAll();setTimeout(checkAlerts,500);
  toast('اتغيّرت طريقة القبض: '+PT_TXT[S.payType]);
};
$('#payAnchor').onchange=e=>{ const v=e.target.value; if(!isDK(v)) return; S.payAnchor=v>todayKey()?todayKey():v; curMonth=periodOf(Date.now()).key; save();renderAll();toast('اتحدّدت بداية الفترة') };

var incomeVisibleCount=3;
function renderIncome(){
  const box=$('#inList'); if(!box) return;
  paintPayType(); renderHomeToggles();
  const recBox=$('#inRec'), Pn=periodOf(Date.now()), monthly=S.payType==='monthly'&&S.incomes.length>0;
  recBox.hidden=!monthly;
  recBox.innerHTML= !monthly? '' : '<p class="hint" style="margin:8px 0 0">بيتكرر كل شهر</p>'+S.incomes.map(t=>{
    const nm=String(t.name||'').trim(), got=r2(S.inflows.filter(x=>x.ts>=Pn.start&&x.ts<Pn.next&&String(x.src||'').trim()===nm).reduce((a,x)=>a+x.amount,0));
    return `<div class="crow inc-row" style="--cc:var(--ok)"><div class="tile">💰</div><div class="n">${esc(t.name)}${spByTag(t)}<small>${got?`اتسجّل ${fmt(got)} ${CS()} ✓`:`${fmt(t.amount)} ${CS()} كل شهر · لسه متسجلش`}</small></div>${got?'':`<button type="button" class="btn" data-recpay="${esc(t.id)}" style="padding:6px 14px;font-size:.88rem">سجّله</button>`}<button class="more" data-obmore="inc:${esc(t.id)}" aria-label="خيارات ${esc(t.name)}" aria-haspopup="menu" aria-expanded="false">${ICON_MORE}</button></div>`}).join('');
  const P=periodOf(Date.now()), II=incomeIn(P);
  $('#inTotal').innerHTML= S.inflows.length? `${money(II.amt)} ${CS()}`:'';
  $('#inHint').textContent= S.inflows.length? (II.n? 'اللي استلمته في الفترة دي' : 'لسه مستلمتش حاجة في الفترة دي') : 'سجّل أي فلوس استلمتها: مرتب، أسبوعية، شغل حر. الرصيد بيزيد في الحساب اللي تختاره.';
  const st=inflowStats(); let h='';
  if(st&&(st.n>=2||S.payType!=='monthly')){
    const obl=obligations30(), room=Math.max(0,r2(st.month-obl-(S.saveTarget||0))), res=reservePerPayment();
    h+=`<div class="mny-split"><div><small>متوسط دخلك في الأسبوع</small><b>${money(st.week)} ${CS()}</b></div><div><small>في الشهر</small><b>${money(st.month)} ${CS()}</b></div></div>`;
    if(obl>0) h+=`<p class="hint" style="margin:8px 0 0">عليك أقساط وفواتير حوالي ${fmt(obl)} ${CS()} خلال 30 يوم${res>0&&S.payType!=='monthly'?`، فاحجز حوالي ${fmt(res)} ${CS()} من كل دفعة`:''}.</p>`;
    h+=`<p class="hint" style="margin:8px 0 0">المبلغ المناسب للمصاريف ${fmt(room)} ${CS()} في الشهر${S.saveTarget>0?' بعد هدف الادخار':''}.</p>`;
    if(room>0) h+=`<button type="button" class="btn" id="inUseBudget" style="width:100%;margin-top:8px">اعتمده كميزانية ${payLen()?(S.payType==='weekly'?'الأسبوع':'الأسبوعين'):'الشهر'}</button>`;
  }
  $('#inStats').innerHTML=h;
  const ub=$('#inUseBudget'); if(ub) ub.onclick=()=>{ const st2=inflowStats(); if(!st2) return; const L=payLen(), room=Math.max(0,r2(st2.month-obligations30()-(S.saveTarget||0))), v=r2(L?room*L/30.4:room);
    if(!(v>0)){toast('مفيش مبلغ مناسب دلوقتي');return} const old={b:S.budget,m:S.budgetMode}; S.budget=v; S.budgetMode='fixed'; save();renderAll();
    toast('الميزانية بقت '+fmt(v)+' '+CS(),'تراجع',()=>{S.budget=old.b;S.budgetMode=old.m;save();renderAll()},5000) };
  const rows=[...S.inflows].sort((a,b)=>b.ts-a.ts).slice(0,incomeVisibleCount||3);
  $('#inMore').hidden=S.inflows.length<=rows.length;
  $('#inLess').hidden=rows.length<=3;
  box.innerHTML=rows.map(x=>{ const a=ACC(x.acc), al=x.alloc;
    const sub=[dkToDMY(dayKey(x.ts)),a?a.name:'',x.note,incomeFundLabel(x)].filter(Boolean).join(' · ');
    return `<button type="button" class="acc-row" data-in="${esc(x.id)}"><span class="ai">💰</span><span class="an">${esc(x.src||'دخل')}<small>${esc(sub)}${al?'<br>'+esc(`للمصاريف ${fmt(al.spend)} · أقساط وفواتير ${fmt(al.bills)} · ادخار ${fmt(al.save)}`):''}</small></span><span class="ab" style="color:var(--ok)">+${money(x.amount)}<small>${CS()}</small></span></button>` }).join('');
}
$('#inMore').onclick=()=>{incomeVisibleCount=(incomeVisibleCount||3)+20;renderIncome()};
$('#inLess').onclick=()=>{incomeVisibleCount=3;renderIncome();$('#inList').scrollIntoView({block:'nearest'})};
$('#inList').onclick=e=>{const b=e.target.closest('[data-in]'); if(b) openInSheet(b.dataset.in)};
$('#inRec').onclick=e=>{const b=e.target.closest('[data-recpay]'); if(!b) return; const t=S.incomes.find(i=>i.id===b.dataset.recpay); if(t) openInSheet(null,{src:t.name,amount:t.amount,rec:1})};
$('#addIn').onclick=()=>openInSheet();

var inEdit=null;
const inNum=el=>{const v=evalExpr(el.value); return Number.isFinite(v)?v:0};
function openInSheet(id,pre){
  const x=id?S.inflows.find(z=>z.id===id):null; inEdit=x?x.id:null; inCap=null;
  $('#inTitle').textContent=x?'تعديل دخل':'استلمت دخل'; $('#inSave').textContent=x?'حفظ التعديل':'حفظ'; $('#inDel').hidden=!x;
  $('#inAmt').value=x?String(x.amount):''; $('#inCur').textContent=CS(); $('#inAmtBox').classList.remove('err');
  $('#inSrc').value=x?x.src:''; $('#inSrcList').innerHTML=S.incomes.map(i=>`<option value="${esc(i.name)}">`).join('');
  $('#inAccRow').hidden=!S.accounts.length;
  $('#inAcc').innerHTML='<option value="">من غير حساب</option>'+S.accounts.map(a=>`<option value="${esc(a.id)}">${esc(accDisp(a))} (${esc(curSym(a.cur))})</option>`).join('');
  $('#inAcc').value= x? (x.acc||'') : (ACC(S.lastAcc)?S.lastAcc:'');
  $('#inDay').max=todayKey(); $('#inDay').value=x?dayKey(x.ts):todayKey(); $('#inNote').value=x?x.note:'';
  const al=x&&x.alloc; $('#inAlSpend').value=al&&al.spend?String(al.spend):''; $('#inAlBills').value=al&&al.bills?String(al.bills):''; $('#inAlSave').value=al&&al.save?String(al.save):'';
  $('#inAlloc').open=!!al; $('#inSetBudget').checked=false; $('#inSetBudgetRow').hidden=true;
  const res=reservePerPayment(); $('#inAllocHint').textContent= res>0&&S.payType!=='monthly'? `عليك التزامات حوالي ${fmt(res)} ${CS()} لكل دفعة، فخصّص لها جزء.` : 'قسّم الفلوس اللي قبضتها على اللي محتاجه.';
  if(!x&&pre){ if(pre.amount) $('#inAmt').value=String(pre.amount); if(pre.src) $('#inSrc').value=String(pre.src).slice(0,40); if(typeof pre.acc==='string') $('#inAcc').value=ACC(pre.acc)?pre.acc:''; if(isDK(pre.day)&&pre.day<=todayKey()) $('#inDay').value=pre.day; inCap=pre.cap||null }
  $('#inRepeat').checked=false; $('#inRepeatChip').setAttribute('aria-pressed','false'); $('#inRepeatRow').hidden=!(S.payType==='monthly'&&!x&&!(pre&&pre.rec));
  $('#inKindPill').hidden=!!(x||inCap||(pre&&pre.rec)); $('#inTitle').hidden=!$('#inKindPill').hidden; $('#inNoAcc').hidden=!!S.accounts.length; paintInChips();
  $('#incomeFund').value=x?(x.fund==='period'||x.fund==='permanent'?'add':x.fund||'salary'):(pre&&pre.rec?'salary':'free');
  $('#incomeScope').value=x&&x.fund==='permanent'?'permanent':'period';paintIncomeFund();
  $('#inErr').textContent=''; $('#scrim').classList.add('open'); $('#inSheet').classList.add('open');
}
$('#inCancel').onclick=closeSheets;
$('#expenseFund').onchange=paintExpenseFund;
$('#incomeFund').onchange=paintIncomeFund;
$('#incomeScope').onchange=paintIncomeFund;
/* the sources you can tap: what you used before (newest first), then your monthly ones, then the usual ones */
const IN_BASE=['المرتب','تبس','شغل حر','عيدية','هدية','أخرى'];
const inKey=s=>vNorm(s).replace(/[^\u0621-\u064Aa-z0-9]/g,'').replace(/^ال/,'');
function inSrcOptions(){
  const seen=new Set(), out=[], add=s=>{s=String(s||'').trim().slice(0,40); const k=inKey(s); if(!k||seen.has(k)) return; seen.add(k); out.push(s)};
  [...S.inflows].sort((a,b)=>b.ts-a.ts).forEach(x=>{if(out.length<6) add(x.src)});
  S.incomes.forEach(t=>add(t.name)); IN_BASE.forEach(add);
  return out.slice(0,10);
}
function paintInChips(){
  const cur=inKey($('#inSrc').value);
  $('#inChips').innerHTML=inSrcOptions().map(s=>`<button type="button" data-isrc="${esc(s)}" aria-pressed="${inKey(s)===cur?'true':'false'}">${esc(s)}</button>`).join('');
}
$('#inRepeatChip').onclick=e=>{const c=$('#inRepeat'); c.checked=!c.checked; e.currentTarget.setAttribute('aria-pressed',c.checked?'true':'false')};
$('#inChips').onclick=e=>{const b=e.target.closest('[data-isrc]'); if(!b) return; $('#inSrc').value=b.dataset.isrc; paintInChips()};
$('#inSrc').addEventListener('input',paintInChips);
/* مصروف / دخل: the pill at the top of each sheet opens a small menu; switching keeps the amount you typed */
const KIND_ITEMS=[['exp','💸','مصروف'],['inc','💰','دخل']];
function closeKindMenu(){ $('#kindMenu').classList.remove('open'); ['kindPill','inKindPill'].forEach(i=>$('#'+i).setAttribute('aria-expanded','false')) }
function openKindMenu(btn,cur){
  const m=$('#kindMenu'); if(m.classList.contains('open')){closeKindMenu();return}
  closePayMenu(); closeDateMenu();
  m.innerHTML=KIND_ITEMS.concat(S.accounts.some(a=>a.type!=='cash')?[['cash','💵','سحب كاش من حساب']]:[]).map(([k,e,n])=>`<button type="button" role="menuitemradio" aria-checked="${k===cur}" data-kind="${k}"><span class="pe">${e}</span>${n}</button>`).join('');
  m.dataset.cur=cur; m.classList.add('open'); btn.setAttribute('aria-expanded','true');
  const r=btn.getBoundingClientRect(); m.style.left=Math.max(8,Math.min(r.right-m.offsetWidth,innerWidth-m.offsetWidth-8))+'px'; m.style.top=(r.bottom+6)+'px';
}
['kindPill','inKindPill'].forEach(id=>$('#'+id).addEventListener('mousedown',e=>e.preventDefault()));
$('#kindPill').onclick=e=>{e.stopPropagation(); openKindMenu(e.currentTarget,'exp')};
$('#inKindPill').onclick=e=>{e.stopPropagation(); openKindMenu(e.currentTarget,'inc')};
$('#kindMenu').addEventListener('mousedown',e=>e.preventDefault());
$('#kindMenu').addEventListener('click',e=>{ const b=e.target.closest('[data-kind]'); closeKindMenu(); if(!b||b.dataset.kind===$('#kindMenu').dataset.cur) return;
  if(b.dataset.kind==='cash'){ const fromExp=$('#kindMenu').dataset.cur==='exp', a=fromExp?readAmt():inNum($('#inAmt')), acc=fromExp?selAcc:$('#inAcc').value;
    closeSheets(); setTimeout(()=>openCashMove(acc,'wd',a>0?{out:a}:null),200); return }
  if(b.dataset.kind==='inc'){ const a=readAmt(); closeSheets(); openInSheet(null,a>0?{amount:a}:null) }
  else { const a=inNum($('#inAmt')); closeSheets(); openSheet(null,a>0?{amount:a}:null) } });
document.addEventListener('click',e=>{ if(!e.target.closest('#kindMenu,#kindPill,#inKindPill')) closeKindMenu() });
$('#inAlSuggest').onclick=()=>{
  const a=evalExpr($('#inAmt').value); if(!(a>0)){$('#inErr').textContent='اكتب المبلغ الأول';return}
  const bills=Math.min(a,reservePerPayment()), per=inflowStats()?inflowStats().per30:(S.payType==='weekly'?30.4/7:S.payType==='biweekly'?30.4/14:1);
  const save=Math.min(Math.max(0,a-bills),r2((S.saveTarget||0)/Math.max(1,per))), spend=r2(a-bills-save);
  $('#inAlBills').value=bills?String(r2(bills)):''; $('#inAlSave').value=save?String(save):''; $('#inAlSpend').value=spend>0?String(spend):''; $('#inErr').textContent='';
};
$('#inSave').onclick=()=>{
  const E=m=>{$('#inErr').textContent=m}, v=evalExpr($('#inAmt').value);
  if(!(v>0&&v<MAXAMT)){E('اكتب المبلغ');$('#inAmtBox').classList.add('err');return}
  const day=$('#inDay').value, dk=/^\d{4}-\d{2}-\d{2}$/.test(day)?(day>todayKey()?todayKey():day):todayKey();
  const old=inEdit?S.inflows.find(z=>z.id===inEdit):null, ac=ACC($('#inAcc').value)||null; let accAmt=null;
  if(ac){ accAmt= old&&old.acc===ac.id&&old.accAmt&&old.amount===v? old.accAmt : toAcc(v,ac);
    if(accAmt==null){E('الحساب ده بعملة تانية ومفيش سعر صرف متاح دلوقتي. اختار حساب بنفس العملة، أو جرّب لما النت يشتغل'); ratesRefresh(false); return} }
  const rpt=!$('#inRepeatRow').hidden&&$('#inRepeat').checked, srcN=$('#inSrc').value.trim().slice(0,40);
  if(rpt&&!srcN){E('اكتب اسم الدخل (مثلاً المرتب) عشان يتكرر كل شهر');return}
  const sp=inNum($('#inAlSpend')), bi=inNum($('#inAlBills')), sv=inNum($('#inAlSave'));
  if(sp<0||bi<0||sv<0){E('التوزيع مش مظبوط');return}
  if(sp+bi+sv>v+EPS){E(`التوزيع (${fmt(r2(sp+bi+sv))}) أكبر من المبلغ`);return}
  const rec={id:old?old.id:uid(),amount:r2(v),ts:tsForDay(dk,old&&old.ts),src:$('#inSrc').value.trim().slice(0,40),note:$('#inNote').value.trim().slice(0,80)};
  if(ac){rec.acc=ac.id;rec.accAmt=accAmt}
  if(sp+bi+sv>0) rec.alloc={spend:r2(sp),bills:r2(bi),save:r2(sv)};
  rec.fund=$('#incomeFund').value==='add'?$('#incomeScope').value:$('#incomeFund').value;
  if(!['free','salary','period','permanent'].includes(rec.fund)){E(TX('اختار الدخل يروح فين.'));return}
  if((rec.fund==='period'||rec.fund==='permanent')&&!(S.budgetMode==='fixed'&&S.budget>0)){E(TX('حدد ميزانية أساسية الأول، أو احتفظ بالدخل كدخل حر.'));return}
  if(rec.fund==='period')rec.fundPk=periodOf(rec.ts).key;
  const fundingError=incomeChangeError(old,rec);if(fundingError){E(fundingError);return}
  changeIncome(old,rec);
  if(inCap) S.capQ=(S.capQ||[]).filter(q=>q.id!==inCap);
  if(S.accounts.length) S.lastAcc=ac?ac.id:'';
  // Budget destination above is the only income-to-budget action; optional allocation is descriptive.
  if(rpt){ const t=S.incomes.find(i=>String(i.name).trim()===srcN); if(t) t.amount=rec.amount; else if(S.incomes.length<30) S.incomes.push({id:uid(),name:srcN,amount:rec.amount}) }
  save();closeSheets();renderAll();setTimeout(checkAlerts,450);
  toast(`اتسجّل دخل ${fmt(rec.amount)} ${CS()}${ac?' على '+ac.name:''}${rpt?' · هيتكرر كل شهر':''} · ${incomeFundLabel(rec)}`);
};
$('#inDel').onclick=()=>{
  const x=S.inflows.find(z=>z.id===inEdit);if(!x)return;
  const err=incomeChangeError(x,null);if(err){$('#inErr').textContent=err;return}
  changeIncome(x,null);save();closeSheets();renderAll();
  toast('اتحذف الدخل','تراجع',()=>{if(S.inflows.some(z=>z.id===x.id))return;const er=incomeChangeError(null,x);if(er){toast(er);return}changeIncome(null,x);save();renderAll()},5000);
};

/* InstaPay fee settings (Settings ▸ التسجيل من إشعارات البنك) */
function paintIpFee(){
  const t=$('#ipFeeToggle'); if(!t) return; const f=S.ipFee;
  t.checked=!!f.on; $('#ipFeeBox').hidden=!f.on;
  if(document.activeElement!==$('#ipFeePct')) $('#ipFeePct').value=String(f.pct);
  if(document.activeElement!==$('#ipFeeMin')) $('#ipFeeMin').value=String(f.min);
  if(document.activeElement!==$('#ipFeeMax')) $('#ipFeeMax').value=String(f.max);
  $('#ipFeeHint').textContent=`مثال: تحويل ${fmt(5000)} ج.م = رسوم ${fmt(ipFeeOf(5000))} ج.م. الأرقام دي اللي بنحسب بيها، ولو بنكك غيّرها أو بيخصم رسوم تانية عدّلها هنا. بتتطبق على الجنيه المصري بس، ومبتتضافش لو رسالة البنك نفسها بتذكر رسوم.`;
}
$('#ipFeeToggle').onchange=e=>{ S.ipFee.on=e.target.checked; save(); paintIpFee() };
['Pct','Min','Max'].forEach(k=>$('#ipFee'+k).addEventListener('change',e=>{
  const v=evalExpr(e.target.value); const o={...S.ipFee}; o[k.toLowerCase()]=Number.isFinite(v)&&v>=0?v:NaN;
  const c=cleanIpFee({...o,on:S.ipFee.on}); if(!Number.isFinite(o[k.toLowerCase()])){toast('اكتب رقم صحيح');paintIpFee();return}
  S.ipFee=c; save(); paintIpFee() }));
/* ===== Suggestions and problems -> the developer's Google Form. On Android Kotlin posts the answers (Feedback.kt); if that fails, or on the web,
   the form opens in the browser already filled in. The ids below are public (they are in the form's own link). ===== */
const FB={form:'1FAIpQLSef3Dr3rdUU4nS_vrxcmjElgBxFT5-mk2fg_PKiUJGcn10QMw',name:'entry.1144655711',email:'entry.391619419',kind:'entry.789292250',text:'entry.1444139243',
  sug:'\u0625\u0642\u062A\u0631\u0627\u062D',bug:'\u0645\u0634\u0643\u0644\u0629'}; // the two choices exactly as the form spells them
let fbKind='sug', fbBusy=false;
const fbName=()=>$('#fbName').value.trim().slice(0,60), fbEmail=()=>$('#fbEmail').value.trim().slice(0,100);
function fbPaint(){
  document.querySelectorAll('#fbKind button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.fk===fbKind?'true':'false'));
  $('#fbText').placeholder= fbKind==='bug'? 'اشرح المشكلة: عملت إيه وإيه اللي حصل؟' : 'اكتب اقتراحك بالتفصيل...';
  $('#fbAttachRow').hidden=!(fbKind==='bug'&&errLogRead().length>0);
  if(!$('#fbName').value) $('#fbName').value=(S.profile&&S.profile.name)||'';
  if(!$('#fbEmail').value) $('#fbEmail').value=S.fbEmail||'';
}
const fbAttachOn=()=>fbKind==='bug'&&!$('#fbAttachRow').hidden&&$('#fbAttach').checked; // the person ticked «أرفق تقرير الأخطاء»
const fbBody=web=>{const t=$('#fbText').value.trim(); return fbAttachOn()? t.slice(0,web?700:1250)+'\n\n'+errReport(web?450:700) : t.slice(0,web?1200:2000)};
function fbBrowser(){
  const meta='\u2014 \u0645\u0644\u064A\u0645 '+((UPD.st&&UPD.st.curName)||'')+(AB?' \u00B7 Android':' \u00B7 web'), txt=(fbBody(true)+'\n\n'+meta);
  const q=(k,v)=>'&'+k+'='+encodeURIComponent(v);
  const a=document.createElement('a'); a.href='https://docs.google.com/forms/d/e/'+FB.form+'/viewform?usp=pp_url'+q(FB.name,fbName())+q(FB.email,fbEmail())+q(FB.kind,FB[fbKind])+q(FB.text,txt);
  a.target='_blank'; a.rel='noopener'; document.body.appendChild(a); a.click(); a.remove();
  return a.href;
}
$('#fbKind').onclick=e=>{const b=e.target.closest('[data-fk]'); if(!b) return; fbKind=b.dataset.fk; fbPaint()};
$('#fbSend').onclick=()=>{
  if(fbBusy) return; const E=m=>{$('#fbMsg').textContent=m}, text=$('#fbText').value.trim(), email=fbEmail();
  if(text.length<5){E('اكتب الاقتراح أو المشكلة الأول (5 حروف على الأقل)');return}
  if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)){E('الإيميل مش مكتوب صح. صلّحه أو امسحه لو مش عايزني أرد عليك');return}
  E(''); S.fbEmail=email; save();
  if(!(AB&&AB.feedbackSend)){ fbBrowser(); toast('فتحتلك الفورم. دوس «إرسال» هناك'); return } // the web version: no way to post from the page
  fbBusy=true; $('#fbSend').disabled=true; $('#fbSend').textContent='بيتبعت...'; $('#fbOpen').hidden=true;
  try{AB.feedbackSend(fbName(),email,fbKind,fbBody(false))}catch(err){window.__fbDone('net')}
};
window.__fbDone=err=>{
  fbBusy=false; $('#fbSend').disabled=false; $('#fbSend').textContent='ابعت';
  if(!err){ $('#fbText').value=''; $('#fbAttach').checked=false; $('#fbMsg').textContent=''; $('#fbOpen').hidden=true; toast('وصلني، شكرًا ليك 🙏'); setGo(null); return }
  const known={rate:'استنى دقيقة قبل ما تبعت حاجة تانية',net:'مفيش نت دلوقتي، جرّب تاني لما النت يشتغل',bad:'اكتب الاقتراح أو المشكلة الأول'};
  $('#fbMsg').textContent=known[err]||'ما قدرتش أبعتها من التطبيق. تقدر تبعتها من الفورم في المتصفح';
  $('#fbOpen').hidden=!!known[err];
};
$('#fbOpen').onclick=()=>{ fbBrowser(); toast('فتحتلك الفورم. دوس «إرسال» هناك') };
/* ===== Gold: what you bought (date, karat, weight, price), what it is worth at the price YOU type today, and what you sold.
   No price is fetched from anywhere: the Egyptian price differs from the world one (customs, making charge). ===== */
const GOLD_K=[['21','عيار 21'],['24','عيار 24'],['18','عيار 18'],['coin','جنيه ذهب']];
const goldPer=k=>k==='coin'?'للجنيه':'للجرام';
const gdTitle=g=>g.k==='coin'?`${fmt(g.qty)} جنيه ذهب`:`${fmt(g.qty)} جرام عيار ${g.k}`;
const sgn=n=>(n<0?'-':'+')+fmt(Math.abs(n));
const sgnCol=n=>n<0?'var(--bad)':'var(--ok)';
function goldStats(){
  const by={}; let nS=0,got=0,paid=0;
  S.gold.forEach(g=>{ if(g.sold){nS++;got+=g.sold.price;paid+=g.price;return} const b=by[g.k]=by[g.k]||{k:g.k,qty:0,paid:0,n:0}; b.qty+=g.qty; b.paid+=g.price; b.n++ });
  return {by:GOLD_K.map(x=>by[x[0]]).filter(Boolean).map(b=>({...b,qty:Math.round(b.qty*1000)/1000,paid:r2(b.paid)})), sold:{n:nS,got:r2(got),paid:r2(paid)}};
}
const goldNow=b=>{const px=+S.goldPx[b.k]; return px>0?r2(px*b.qty):null};
function renderGold(){
  const box=$('#goldSum'), list=$('#goldList'); if(!box||!list) return;
  const st=goldStats(), cs=CS();
  if(!S.gold.length){ box.innerHTML='<p class="hint" style="margin:0">سجّل أي دهب اشتريته: التاريخ والعيار والوزن والسعر، ومليم يحسبلك دهبك وصل لكام. الأسعار بتكتبها انت بإيدك.</p>'; list.innerHTML=''; return }
  let h='', tp=0, tn=0, all=true;
  st.by.forEach(b=>{ tp+=b.paid; const now=goldNow(b); if(now==null) all=false; else tn+=now;
    h+=`<div class="gd-kind"><div class="gd-top"><b>${b.k==='coin'?'جنيه ذهب':'عيار '+b.k}</b><input class="date-in" data-gpx="${b.k}" type="text" inputmode="decimal" dir="ltr" placeholder="سعر ${b.k==='coin'?'الجنيه':'الجرام'} النهارده" value="${+S.goldPx[b.k]>0?esc(String(S.goldPx[b.k])):''}" aria-label="سعر ${b.k==='coin'?'الجنيه':'الجرام'} النهارده لـ${b.k==='coin'?'الجنيه الذهب':'عيار '+b.k}"></div><small>${fmt(b.qty)} ${b.k==='coin'?'جنيه':'جرام'} · دفعت ${fmt(b.paid)} ${cs} (متوسط ${fmt(b.paid/b.qty)} ${goldPer(b.k)})</small>${now==null?'':`<small>قيمته دلوقتي ${fmt(now)} ${cs} · الفرق <span style="color:${sgnCol(now-b.paid)}">${sgn(now-b.paid)}</span> ${cs}</small>`}</div>`});
  if(st.by.length){
    if(all) h+=`<div class="gd-tot" style="margin-top:8px"><span><b>قيمة دهبك دلوقتي</b></span><b>${money(tn)} ${cs}</b></div><div class="gd-tot"><span>الفرق عن اللي دفعته</span><b style="color:${sgnCol(tn-tp)}">${sgn(tn-tp)} ${cs}</b></div>`;
    else h+=`<p class="hint" style="margin:8px 0 0">اكتب سعر ${st.by.length===1&&st.by[0].k==='coin'?'الجنيه':'الجرام'} النهارده عشان تشوف قيمة دهبك.</p>`;
    h+=`<p class="hint" style="margin:8px 0 0">الفرق بين اللي دفعته وسعر النهارده اللي كتبته، من غير المصنعية ومصاريف البيع.${S.goldPx.ts?` آخر تحديث للسعر: ${esc(shortDate(S.goldPx.ts))}.`:''}</p>`;
  }
  if(st.sold.n) h+=`<p class="hint" style="margin:8px 0 0">بعت ${st.sold.n} من مشترياتك: استلمت ${fmt(st.sold.got)} ${cs} مقابل ${fmt(st.sold.paid)} اللي دفعتها، والفرق <span style="color:${sgnCol(st.sold.got-st.sold.paid)}">${sgn(st.sold.got-st.sold.paid)}</span> ${cs}.</p>`;
  box.innerHTML=h;
  list.innerHTML=[...S.gold].sort((a,b)=>b.ts-a.ts).slice(0,80).map(g=>{ const a=ACC(g.acc);
    const sub=esc([dkToDMY(dayKey(g.ts)),g.note,a?a.name:''].filter(Boolean).join(' · '))+`<br>دفعت ${fmt(g.price)} ${cs} (${fmt(g.price/g.qty)} ${goldPer(g.k)})`;
    const sold=g.sold?`<br>اتباع ${esc(dkToDMY(dayKey(g.sold.ts)))} بـ ${fmt(g.sold.price)} ${cs} · الفرق <span style="color:${sgnCol(g.sold.price-g.price)}">${sgn(g.sold.price-g.price)}</span>`:'';
    return `<button type="button" class="acc-row gd-row" data-gd="${esc(g.id)}"${g.sold?' style="opacity:.78"':''}><span class="ai">🪙</span><span class="an">${esc(gdTitle(g))}<small>${sub}${sold}</small></span></button>` }).join('');
}
var gdEdit=null, gdK='21';
function gdPaintK(){
  document.querySelectorAll('#gdKarat button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.gk===gdK?'true':'false'));
  $('#gdQty').placeholder= gdK==='coin'?'عدد الجنيهات':'الوزن بالجرام'; $('#gdQtyU').textContent= gdK==='coin'?'جنيه':'جرام'; gdPer();
}
function gdPer(){ const q=inNum($('#gdQty')), p=inNum($('#gdPrice')); $('#gdPerTxt').textContent= q>0&&p>0? `يعني ${fmt(p/q)} ${CS()} ${goldPer(gdK)}` : '' }
function openGold(id){
  const x=id?S.gold.find(g=>g.id===id):null; gdEdit=x?x.id:null; gdK=x?x.k:'21';
  $('#gdTitle').textContent=x?'تعديل شراء دهب':'شراء دهب'; $('#gdSave').textContent=x?'حفظ التعديل':'حفظ'; $('#gdDel').hidden=!x;
  $('#gdQty').value=x?String(x.qty):''; $('#gdPrice').value=x?String(x.price):''; $('#gdCur').textContent=CS(); $('#gdSCur').textContent=CS(); $('#gdPriceBox').classList.remove('err');
  $('#gdDay').max=todayKey(); $('#gdDay').value=x?dayKey(x.ts):todayKey(); $('#gdNote').value=x?x.note:'';
  const opts='<option value="">من غير حساب</option>'+S.accounts.map(a=>`<option value="${esc(a.id)}">${esc(accDisp(a))} (${esc(curSym(a.cur))})</option>`).join('');
  $('#gdAccRow').hidden=!S.accounts.length; $('#gdAcc').innerHTML=opts; $('#gdAcc').value=x&&x.acc||'';
  $('#gdSAccRow').hidden=!S.accounts.length; $('#gdSAcc').innerHTML=opts;
  $('#gdSold').hidden=!x; $('#gdSold').open=!!(x&&x.sold); $('#gdSPrice').value=x&&x.sold?String(x.sold.price):''; $('#gdSDay').max=todayKey(); $('#gdSDay').value=x&&x.sold?dayKey(x.sold.ts):todayKey(); $('#gdSAcc').value=x&&x.sold&&x.sold.acc||'';
  gdPaintK(); $('#gdErr').textContent=''; $('#scrim').classList.add('open'); $('#gdSheet').classList.add('open');
}
$('#addGold').onclick=()=>openGold();
$('#goldList').onclick=e=>{const b=e.target.closest('[data-gd]'); if(b) openGold(b.dataset.gd)};
$('#gdKarat').onclick=e=>{const b=e.target.closest('[data-gk]'); if(!b) return; gdK=b.dataset.gk; gdPaintK()};
$('#gdQty').addEventListener('input',gdPer); $('#gdPrice').addEventListener('input',gdPer);
$('#gdCancel').onclick=closeSheets;
$('#goldSum').addEventListener('change',e=>{
  const i=e.target.closest('[data-gpx]'); if(!i) return; const k=i.dataset.gpx; if(!GOLD_KS.includes(k)) return;
  const raw=i.value.trim(), v=evalExpr(raw);
  if(raw===''){ delete S.goldPx[k] } else if(Number.isFinite(v)&&v>0&&v<MAXAMT){ S.goldPx[k]=r2(v) } else { toast('اكتب سعر صحيح'); renderGold(); return }
  S.goldPx.ts=Date.now(); save(); renderGold(); renderMeHome();
});
$('#gdSave').onclick=()=>{
  const E=m=>{$('#gdErr').textContent=m}, q=inNum($('#gdQty')), pr=inNum($('#gdPrice'));
  if(!(q>0&&q<=100000)){E(gdK==='coin'?'اكتب عدد الجنيهات':'اكتب الوزن بالجرام');return}
  if(!(pr>0&&pr<MAXAMT)){E('اكتب السعر اللي دفعته');$('#gdPriceBox').classList.add('err');return}
  const dv=$('#gdDay').value, dk=isDK(dv)?(dv>todayKey()?todayKey():dv):todayKey();
  const old=gdEdit?S.gold.find(g=>g.id===gdEdit):null, ac=ACC($('#gdAcc').value)||null; let accAmt=null;
  if(ac){ accAmt= old&&old.acc===ac.id&&old.accAmt&&old.price===pr? old.accAmt : toAcc(pr,ac);
    if(accAmt==null){E('الحساب ده بعملة تانية ومفيش سعر صرف متاح دلوقتي. اختار حساب بنفس العملة، أو جرّب لما النت يشتغل'); ratesRefresh(false); return} }
  const rec={id:old?old.id:uid(),k:gdK,qty:Math.round(q*1000)/1000,price:r2(pr),ts:tsForDay(dk,old&&old.ts),note:$('#gdNote').value.trim().slice(0,80)};
  if(ac){rec.acc=ac.id;rec.accAmt=accAmt}
  if(!$('#gdSold').hidden&&$('#gdSPrice').value.trim()!==''){
    const sp=inNum($('#gdSPrice')); if(!(sp>0&&sp<MAXAMT)){E('اكتب سعر البيع صح، أو امسحه لو مبعتش');return}
    const sv=$('#gdSDay').value, sk=isDK(sv)?(sv>todayKey()?todayKey():sv):todayKey();
    if(sk<dk){E('تاريخ البيع قبل تاريخ الشراء');return}
    const sac=ACC($('#gdSAcc').value)||null; let sAmt=null;
    if(sac){ const os=old&&old.sold; sAmt= os&&os.acc===sac.id&&os.accAmt&&os.price===sp? os.accAmt : toAcc(sp,sac);
      if(sAmt==null){E('الحساب ده بعملة تانية ومفيش سعر صرف متاح دلوقتي. اختار حساب بنفس العملة، أو جرّب لما النت يشتغل'); ratesRefresh(false); return} }
    rec.sold={ts:tsForDay(sk,old&&old.sold&&old.sold.ts),price:r2(sp)}; if(sac){rec.sold.acc=sac.id;rec.sold.accAmt=sAmt}
  }
  if(old) S.gold[S.gold.indexOf(old)]=rec; else S.gold.push(rec);
  save(); closeSheets(); renderAll();
  toast(old?'اتعدّل الشراء':`اتسجّل ${gdTitle(rec)} بـ ${fmt(rec.price)} ${CS()}`);
};
$('#gdDel').onclick=()=>{
  const i=S.gold.findIndex(g=>g.id===gdEdit); if(i<0) return;
  if(goldAccRows(S.gold[i]).some(p=>p.acc)){ $('#gdErr').textContent='الشراء ده مربوط بحساب (هو أو بيعه). غيّر الحساب لـ«من غير حساب» واحفظ الأول، وبعدين احذفه، عشان الأرصدة متتلخبطش'; return }
  const [x]=S.gold.splice(i,1); save(); closeSheets(); renderAll();
  toast('اتحذف الشراء','تراجع',()=>{S.gold.splice(Math.min(i,S.gold.length),0,x);save();renderAll()},5000);
};

/* ===== Reports: real income, real spending, transfers, savings and installments kept apart so the numbers stay true ===== */
/* how the period will probably end: what is in the accounts (or left of the budget) minus the obligations still to pay minus the usual daily spending */
function forecastEnd(){
  const now=Date.now(), P=periodOf(now), t0=todayStart(), left=Math.max(1,Math.round((P.next-t0)/864e5));
  const items=dueItems(left-1), outs=items.filter(x=>!x.rcv&&x.amount>0), ins=items.filter(x=>x.rcv&&x.amount>0);
  const obl=r2(outs.reduce((a,x)=>a+x.amount,0)), inc=r2(ins.reduce((a,x)=>a+x.amount,0));
  const vs=S.expenses.filter(e=>(S.accounts.length||e.fund!=='free')&&!e.fx&&!e.inst&&e.cat!=='gam'&&e.cat!=='inst'&&e.note!=='فرق رصيد'&&e.ts>=t0-29*864e5);
  const first=S.expenses.length?Math.min(...S.expenses.map(e=>e.ts)):t0, span=Math.min(30,Math.max(7,Math.round((t0-new Date(first).setHours(0,0,0,0))/864e5)+1)); // at least a week, so a few early days do not set the pace
  const rate=sum(vs)/span, vspend=r2(rate*(left-0.5));
  let base=null, label='';
  if(S.accounts.length){ const m=moneyTotals(); base=m.tot; label='الفلوس اللي معاك دلوقتي' }
  else if(S.budgetMode==='fixed'&&S.budget>0){ base=r2(budOf(P)-budgetSpent(P)); label='المتبقي في الميزانية' }
  if(base===null) return null;
  return {P,left,base,label,obl,nObl:outs.length,inc,rate:r2(rate),vspend,end:r2(base-obl-vspend)};
}
function renderForecast(cur){
  const box=$('#repFc'); if(!box) return;
  const f=cur&&S.expenses.length?forecastEnd():null;
  if(!f){box.hidden=true;box.innerHTML='';return}
  const cs=CS(), neg=f.end<0, warn=f.base<f.obl;
  let h=`<div class="card-h"><h3>توقع نهاية ${f.P.pd===1?'الشهر':'الفترة'}</h3><span class="hint">${daysTxt(f.left)}</span></div>`;
  h+=`<div class="mny-acc"><span>${f.label}</span><b>${money(f.base)} ${cs}</b></div>`;
  h+=`<div class="mny-acc"><span>التزامات لسه مدفعتهاش${f.nObl?` (${f.nObl})`:''}</span><b>- ${money(f.obl)} ${cs}</b></div>`;
  h+=`<div class="mny-acc"><span>صرف متوقع بمعدلك (حوالي ${money(f.rate)} في اليوم)</span><b>- ${money(f.vspend)} ${cs}</b></div>`;
  h+=`<div class="mny-acc"><span><b>المتوقع في آخر ${f.P.pd===1?'الشهر':'الفترة'}</b></span><b style="color:${neg?'var(--bad)':'var(--ok)'}">${neg?'-':''}${money(Math.abs(f.end))} ${cs}</b></div>`;
  if(warn) h+=`<p class="hint" style="margin:8px 0 0;color:var(--bad)">⚠️ ${S.accounts.length?'الفلوس اللي في حساباتك':'المتبقي في الميزانية'} أقل من الالتزامات الجاية.</p>`;
  else if(neg) h+=`<p class="hint" style="margin:8px 0 0;color:var(--bad)">⚠️ بالمعدل ده الفلوس مش هتكفي لآخر ${f.P.pd===1?'الشهر':'الفترة'}، خلي بالك من الصرف.</p>`;
  if(f.inc>0) h+=`<p class="hint" style="margin:8px 0 0">وفيه ${fmt(f.inc)} ${cs} مستنيهم ترجعلك (مش محسوبين فوق).</p>`;
  box.hidden=false; box.innerHTML=h;
}
function renderMoneyReport(P,list,total){
  const ov=$('#repMoney'), ac=$('#repAccts'); if(!ov||!ac) return;
  const inR=S.inflows.filter(x=>x.ts>=P.start&&x.ts<P.next), trR=S.transfers.filter(t=>t.ts>=P.start&&t.ts<P.next);
  const ipR=S.instPays.filter(x=>x.ts>=P.start&&x.ts<P.next), iexp=list.filter(e=>e.inst);
  const any=S.accounts.length||inR.length||trR.length||S.insts.length||ipR.length;
  const cur=P.key===periodOf(Date.now()).key, name=P.pd===1?'الشهر':'الفترة';
  const income=r2(inR.reduce((a,x)=>a+x.amount,0)), net=r2(income-total), st=inflowStats();
  /* --- overview --- */
  let h='';
  if(any){
    h=`<div class="card-h"><h3>الأرقام الفعلية</h3><span class="hint">${esc(repShort(P))}</span></div>`;
    h+=`<div class="mny-split"><div><small>دخل مستلم</small><b style="color:var(--ok)">${money(income)} ${CS()}</b></div><div><small>مصروف</small><b>${money(total)} ${CS()}</b></div></div>`;
    h+=`<div class="mny-acc"><span>الصافي</span><b style="color:${net<0?'var(--bad)':'var(--ok)'}">${net<0?'-':''}${money(Math.abs(net))} ${CS()}</b></div>`;
    if(st&&(S.payType!=='monthly'||st.n>=2)) h+=`<div class="mny-acc"><span>متوسط دخلك (أسبوع / شهر)</span><b>${money(st.week)} / ${money(st.month)} ${CS()}</b></div>`;
    if(cur&&S.budgetMode==='fixed'&&S.budget>0){ const rem=r2(budOf(P)-budgetSpent(P)); h+=`<div class="mny-acc"><span>المتبقي من الميزانية</span><b${rem<0?' style="color:var(--bad)"':''}>${rem<0?'-':''}${money(Math.abs(rem))} ${CS()}</b></div>` }
    if(S.insts.length){
      let due=0, left=0; const paidP=r2(iexp.reduce((a,e)=>a+e.amount,0)+ipR.reduce((a,x)=>a+x.amount,0));
      S.insts.forEach(p=>p.items.forEach(i=>{ const t=dkToTs(i.due); if(t>=P.start&&t<P.next) due+=i.amount; left+=itemRem(i) }));
      h+=`<p class="acc-sub">الأقساط</p><div class="mny-acc"><span>مطلوب في ${name} ده</span><b>${money(r2(due))} ${CS()}</b></div><div class="mny-acc"><span>اللي دفعته في ${name} ده</span><b>${money(paidP)} ${CS()}</b></div><div class="mny-acc"><span>الباقي من كل الأقساط</span><b>${money(r2(left))} ${CS()}</b></div>`;
    }
    h+=`<p class="hint" style="margin:10px 0 0">المصروف هنا من غير التحويلات بين حساباتك، ومن غير أقساط الشراء اللي اتسجل قبل كده.</p>`;
  }
  ov.hidden=!any; ov.innerHTML=h; $('#repOvEmpty').hidden=!!any;
  try{renderForecast(cur)}catch(e){console.error(e)}
  /* --- accounts --- */
  const hasAc=S.accounts.length||trR.length; let a='';
  if(hasAc){
    const t=moneyTotals(), m=mvState();
    a=`<div class="card-h"><h3>الحسابات</h3><span class="hint">${esc(repShort(P))}</span></div>`;
    if(S.accounts.length){
      a+=`<div class="mny-split"><div><small>إجمالي الحسابات (دلوقتي)</small><b>${money(t.tot)} ${CS()}${t.missing.length?' *':''}</b></div>${m.fixed?`<div><small>مدخرات</small><b>${money(m.sav)} ${CS()}</b></div>`:`<div><small>عدد الحسابات</small><b>${S.accounts.length}</b></div>`}</div>`;
      a+=`<p class="acc-sub">الأرصدة</p>`+S.accounts.map(x=>{const b=accBal(x.id); return `<div class="mny-acc"><span>${esc(ACC_TYPES[x.type].e)} ${esc(accDisp(x))}</span><b${b<0?' style="color:var(--bad)"':''}>${money(b)} ${esc(curSym(x.cur))}</b></div>`}).join('');
      const by={}, none={n:0,a:0}; list.forEach(e=>{ if(e.acc&&ACC(e.acc)){const o=by[e.acc]||(by[e.acc]={n:0,a:0}); o.n++; o.a+=e.amount} else {none.n++; none.a+=e.amount} });
      a+=`<p class="acc-sub">المصروفات من كل حساب</p>`+S.accounts.map(x=>{const o=by[x.id]||{n:0,a:0}; return `<div class="mny-acc"><span>${esc(accDisp(x))} · ${o.n} عملية</span><b>${money(o.a)} ${CS()}</b></div>`}).join('')+`<div class="mny-acc"><span>🧾 من غير حساب · ${none.n} عملية</span><b>${money(none.a)} ${CS()}</b></div>`;
      const recv={}; inR.forEach(x=>{ if(x.acc&&ACC(x.acc)) recv[x.acc]=(recv[x.acc]||0)+x.amount });
      if(Object.keys(recv).length) a+=`<p class="acc-sub">الدخل المستلم على كل حساب</p>`+Object.keys(recv).map(id=>`<div class="mny-acc"><span>${esc(ACC(id).name)}</span><b style="color:var(--ok)">+${money(recv[id])} ${CS()}</b></div>`).join('');
    }
    if(trR.length||S.transfers.length){
      let fee=0, miss=false; trR.forEach(x=>{ if(!x.fee) return; const f=ACC(x.from), mm=f?toMain(x.fee,f.cur):null; if(mm==null) miss=true; else fee+=mm });
      a+=`<p class="acc-sub">التحويلات بين حساباتك (مش مصروف ولا دخل)</p><div class="mny-acc"><span>${trR.length===1?'تحويل واحد':trR.length+' '+(trR.length<=10?'تحويلات':'تحويل')} في ${name} ده</span><b>${trR.length?'رسوم '+money(r2(fee))+' '+CS()+(miss?' *':''):'—'}</b></div>`;
      a+=trR.slice().sort((x,y)=>y.ts-x.ts).slice(0,5).map(x=>{const f=ACC(x.from), to=ACC(x.to); return `<div class="mny-acc"><span>${esc(f?accDisp(f):'؟')} ← ${esc(to?accDisp(to):'؟')} · ${esc(dkToDMY(dayKey(x.ts)))}</span><b>${money(x.out)} ${esc(curSym(f?f.cur:S.currency))}</b></div>`}).join('');
    }
    if(S.accounts.length&&t.missing.length) a+=`<p class="hint" style="margin:8px 0 0">* فيه حسابات بعملة تانية ومفيش سعر صرف دلوقتي، فمش محسوبة في الإجمالي.</p>`;
  }
  ac.hidden=!hasAc; ac.innerHTML=a; $('#repAcEmpty').hidden=!!hasAc;
}
var repTab='ov';
function paintRepTab(){
  document.querySelectorAll('#repSeg button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.rt===repTab?'true':'false'));
  [['ov','#rpOv'],['ac','#rpAc'],['sp','#rpSp'],['tl','#rpTl']].forEach(([k,sel])=>{ $(sel).hidden=k!==repTab });
}
$('#repSeg').onclick=e=>{const b=e.target.closest('[data-rt]'); if(!b||b.dataset.rt===repTab) return; repTab=b.dataset.rt; paintRepTab()};

/* ===== "أنا": a home of grouped rows, each opening its own page (like Settings) ===== */
var mePage=null, meHomeY=0;
const ME_TITLES={"accounts": "الحسابات", "fixed": "المصاريف الثابتة والجاية", "saving": "الادخار", "gold": "الدهب", "budget": "الميزانية وطريقة القبض والدخل", "data": "بياناتي", "stats": "إحصائياتي", "home": "الصفحة الرئيسية"};
const ME_ICO={gold:'<path d="M3 18l3-8h12l3 8z"/><path d="M8.5 10L10 5h4l1.5 5"/>',accounts:'<path d="M3 7a2 2 0 0 1 2-2h13v4"/><path d="M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2z"/><circle cx="16.5" cy="14.5" r="1"/>',income:'<circle cx="12" cy="12" r="9"/><path d="M12 7v10M8 13l4 4 4-4"/>',budget:'<path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/>',saving:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',sources:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>',fixed:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',data:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',stats:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',home:'<path d="M3 11l9-8 9 8M5 10v10h14V10"/>'};
const ME_GROUPS=[['',[['stats','#E07A2E']]],['فلوسي',[['home','#0EA5A4'],['accounts','#0E7490'],['budget','#C79A2B'],['saving','#8B5CF6'],['gold','#D4A017']]],['الالتزامات الثابتة',[['fixed','#D9466F']]],['عنّي',[['data','#475569']]]];
$('#meGroups').innerHTML=ME_GROUPS.map(([g,rows])=>`${g?`<div class="set-gt">${g}</div>`:''}<div class="card set-list"${g?'':' style="margin-top:0"'}>${rows.map(([k,c])=>`<button type="button" class="set-item" data-me-go="${k}" id="mi-${k}"><span class="si" style="--c:${c}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ME_ICO[k]}</svg></span><span class="st"><b>${ME_TITLES[k]}</b><small id="ms-${k}"></small></span><svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg></button>`).join('')}</div>`).join('');
function meGo(p,quiet){
  if(p&&!mePage) meHomeY=pageY();
  mePage=p||null; $('#meHome').hidden=!!mePage;
  document.querySelectorAll('#v-me>.me-page').forEach(x=>{x.hidden=x.dataset.mepage!==mePage});
  if(mePage){ const el=document.querySelector(`#v-me>.me-page[data-mepage="${mePage}"]`); if(!quiet){el.classList.remove('sub-anim');void el.offsetWidth;el.classList.add('sub-anim')} pageTo(0) }
  else { renderMeHome(); if(!quiet){const h=$('#meHome');h.classList.remove('sub-anim');void h.offsetWidth;h.classList.add('sub-anim')} pageTo(quiet?0:meHomeY) }
}
document.querySelectorAll('#v-me [data-me-back]').forEach(b=>b.onclick=()=>meGo(null));
$('#meGroups').onclick=e=>{const b=e.target.closest('[data-me-go]'); if(b) meGo(b.dataset.meGo)};
function renderMeHome(){
  const sub=(k,t)=>{const el=$('#ms-'+k); if(el) el.textContent=t}, n=S.accounts.length, mt=moneyTotals();
  sub('accounts',n?`${n===1?'حساب واحد':n===2?'حسابين':n<=10?n+' حسابات':n+' حساب'} · الإجمالي ${fmt(mt.tot)} ${CS()}`:'ضيف حساباتك وأرصدتها');
  sub('budget',(S.budgetMode==='fixed'&&S.budget>0?fmt(S.budget)+' '+CS()+(budOf(periodOf(Date.now()))!==S.budget?' · الفترة دي '+fmt(budOf(periodOf(Date.now()))):''):'ميزانية مفتوحة')+' · قبض '+(PT_TXT[S.payType]||''));
  {const st=goldStats(); sub('gold', st.by.length? st.by.slice(0,2).map(b=>b.k==='coin'?`${fmt(b.qty)} جنيه ذهب`:`${fmt(b.qty)} جرام عيار ${b.k}`).join(' · ')+(st.by.length>2?' · ...':'') : S.gold.length?'كله اتباع':'سجّل مشترياتك من الدهب')}
  sub('saving',S.saveTarget>0?`هدف ${fmt(S.saveTarget)} ${CS()} في الشهر`:S.goals.length?S.goals.length+' أهداف ادخار':'حدد هدف ادخارك');
  sub('fixed',(S.fixed.length||S.plans.length)? [S.fixed.length?`${S.fixed.length} ${S.fixed.length<=10?'مصاريف':'مصروف'} · ${fmt(S.fixed.reduce((a,f)=>a+(+f.amount||0),0))} ${CS()}`:'',S.plans.length?`${S.plans.length} جاية`:''].filter(Boolean).join(' · ') : 'الإيجار والنت والاشتراكات والمصروفات الجاية');
  sub('data',((S.profile&&S.profile.name)||'اسمك')+' · '+((CURRENCIES.find(c=>c.id===S.currency)||{n:''}).n));
  sub('stats',S.expenses.length?`${S.expenses.length} ${S.expenses.length<=10?'مصاريف':'مصروف'} متسجلة`:'لسه مفيش مصاريف');
  const hid=Object.keys(S.homeHide||{}).length; sub('home',hid?`${hid} ${hid<=10?'حاجات':'حاجة'} مخفية`:'كل حاجة ظاهرة');
}

