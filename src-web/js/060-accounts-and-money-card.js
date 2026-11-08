/* --- the accounts card (أنا) --- */
const accLow=a=>a.low>0&&accBal(a.id)<a.low;
function renderAccounts(){
  const L=$('#accList'); if(!L) return;
  accEnsureRates();
  const own=S.accounts.filter(a=>!a.sav), savs=S.accounts.filter(a=>a.sav);
  L.innerHTML=own.length? own.map(a=>{
    const b=accBal(a.id), T=ACC_TYPES[a.type];
    const sub=[T.n,a.bank,a.last4?'\u2066••'+a.last4+'\u2069':'',a.phone?'\u2066'+a.phone+'\u2069':'',a.cur!==S.currency?a.cur:''].filter(Boolean).join(' · ');
    return `<button type="button" class="acc-row" data-acc="${esc(a.id)}"><span class="ai">${T.e}</span><span class="an">${esc(accDisp(a))}<small>${esc(sub)}${accLow(a)?' · <b class="lowchip">رصيد منخفض</b>':''}</small></span><span class="ab${b<0?' neg':''}">${money(b)}<small>${esc(curSym(a.cur))}</small></span></button>`
  }).join('') : '<div class="empty"><b>لسه مضفتش حسابات</b>ضيف حساب بنكي أو محفظة أو كاش، وسجّل رصيده.</div>';
  const part=list=>{let t=0,miss=0; list.forEach(a=>{const m=toMain(accBal(a.id),a.cur); if(m==null) miss++; else t+=m}); return `${money(r2(t))} ${CS()}${miss?' *':''}`};
  $('#accTotal').innerHTML=own.length?part(own):'';
  $('#savTotal').innerHTML=savs.length?part(savs):'';
  $('#savList').innerHTML=savs.length? savs.map(a=>{ const b=accBal(a.id);
    return `<button type="button" class="acc-row" data-acc="${esc(a.id)}"><span class="ai">💰</span><span class="an">${esc(accDisp(a))}<small>مدخرات${a.cur!==S.currency?' · '+esc(a.cur):''}</small></span><span class="ab${b<0?' neg':''}">${money(b)}<small>${esc(curSym(a.cur))}</small></span></button>` }).join('')
    : '<div class="empty"><b>لسه مضفتش مدخرات</b>لو عندك فلوس محوشها من قبل مليم، ضيفها هنا برصيدها.</div>';
  $('#savMv').hidden=!savs.length; $('#accMv').hidden=!S.accounts.length;
  const trs=[...S.transfers].sort((a,b)=>b.ts-a.ts).slice(0,5);
  $('#trList').innerHTML=trs.length? '<p class="acc-sub">آخر التحويلات</p>'+trs.map(t=>{
    const f=ACC(t.from), to=ACC(t.to), cross=f&&to&&f.cur!==to.cur;
    const when=dkToDMY(dayKey(t.ts))+' · '+new Date(t.ts).toLocaleTimeString(LOC,{hour:'2-digit',minute:'2-digit'});
    return `<button type="button" class="acc-row" data-tr="${esc(t.id)}"><span class="ai">⇄</span><span class="an">${trMode(f,to)==='wd'?'سحب كاش: ':trMode(f,to)==='dep'?'إيداع كاش: ':''}من ${esc(f?accDisp(f):'؟')} إلى ${esc(to?accDisp(to):'؟')}<small>${esc(when)}${t.fee?' · رسوم '+fmt(t.fee):''}</small></span><span class="ab">${money(t.out)}<small>${esc(curSym(f?f.cur:S.currency))}${cross?' ← '+fmt(t.in)+' '+esc(curSym(to.cur)):''}</small></span></button>`
  }).join(''):'';
  $('#addTr').disabled=S.accounts.length<2&&!(S.accounts.length===1&&!cashAccFor(S.currency));
  $('#moneyViewSel').value=S.moneyView;
}
$('#accList').onclick=e=>{const b=e.target.closest('[data-acc]'); if(b) openAccSheet(b.dataset.acc)};
$('#savList').onclick=e=>{const b=e.target.closest('[data-acc]'); if(b) openAccSheet(b.dataset.acc)};
$('#accMv').onclick=()=>openMv('in'); $('#savMv').onclick=()=>openMv('in');
$('#trList').onclick=e=>{const b=e.target.closest('[data-tr]'); if(b) openTrSheet(b.dataset.tr)};
$('#addAcc').onclick=()=>openAccSheet();
$('#addTr').onclick=()=>openTrSheet();
$('#addSav').onclick=()=>{ openAccSheet(); accType='cash'; accSav=true; paintAccType(); $('#accName').value=S.accounts.some(a=>a.sav)?'':'مدخراتي'; $('#accTitle').textContent='مدخرات كنت محوشها قبل مليم'; setTimeout(()=>$('#accBal').focus(),350) };
$('#moneyViewSel').onchange=e=>{S.moneyView=e.target.value;save();renderAll()};

/* --- add / edit / delete an account --- */
var accSav=false, accEdit=null, accType='bank', accBalInit='', accDelAsk=false, accHistAll=false;
/* every movement of one account, newest first, in the account's own currency */
function accMoves(id){
  const L=[], nm=x=>{const a=ACC(x); return a?accDisp(a):'؟'};
  S.expenses.forEach(e=>{ if(e.acc===id) L.push({ts:e.ts,amt:-e.accAmt,t:(CAT[e.cat]||CAT.other).name+(e.note?': '+e.note:'')}) });
  S.transfers.forEach(t=>{ const md=trMode(ACC(t.from),ACC(t.to)), nt=t.note?' · '+t.note:'';
    if(t.from===id) L.push({ts:t.ts,amt:-(t.out+t.fee),t:(md==='wd'?'سحب كاش إلى ':md==='dep'?'إيداع في ':'تحويل إلى ')+nm(t.to)+(t.fee?' (برسوم '+fmt(t.fee)+')':'')+nt});
    if(t.to===id) L.push({ts:t.ts,amt:t.in,t:(md==='wd'?'سحب كاش من ':md==='dep'?'إيداع من ':'تحويل من ')+nm(t.from)+nt}) });
  S.inflows.forEach(x=>{ if(x.acc===id) L.push({ts:x.ts,amt:x.accAmt,t:'دخل: '+(x.src||'استلام')}) });
  S.instPays.forEach(x=>{ if(x.acc===id){const p=instOf(x.item); L.push({ts:x.ts,amt:-x.accAmt,t:'قسط '+(p?p.name:'')}) } });
  S.debts.forEach(d=>{ const s=d.dir==='in'?1:-1;
    if(d.acc===id) L.push({ts:+d.created||0,amt:-s*d.accAmt,t:(d.dir==='in'?'سلّفت ':'استلفت من ')+d.person});
    (d.adds||[]).forEach(a=>{ if(a.acc===id) L.push({ts:a.ts,amt:-s*a.accAmt,t:(d.dir==='in'?'زيادة سلفة على ':'زيادة استلفتها من ')+d.person}) });
    (d.payments||[]).forEach(p=>{ if(p.acc===id) L.push({ts:p.ts,amt:s*p.accAmt,t:(d.dir==='in'?'استلمت من ':'سددت لـ ')+d.person}) }) });
  S.gold.forEach(g=>{ if(g.acc===id) L.push({ts:g.ts,amt:-g.accAmt,t:'شراء دهب: '+gdTitle(g)}); if(g.sold&&g.sold.acc===id) L.push({ts:g.sold.ts,amt:g.sold.accAmt,t:'بيع دهب: '+gdTitle(g)}) });
  return L.sort((a,b)=>b.ts-a.ts);
}
function paintAccHist(){
  const a=ACC(accEdit), box=$('#accHistBox'); box.hidden=!a; if(!a) return;
  const all=accMoves(a.id), L=accHistAll?all:all.slice(0,12), c=esc(curSym(a.cur));
  $('#accHist').innerHTML=L.map(m=>`<li><span>${esc(m.t)}</span><span class="ipd" style="color:${m.amt<0?'var(--bad)':'var(--ok)'}">${m.amt<0?'-':'+'}${fmt(Math.abs(m.amt))} ${c} · ${esc(shortDate(m.ts))}</span></li>`).join('')+`<li><span>رصيد البداية</span><span>${fmt(a.open)} ${c}</span></li>`;
  $('#accHistMore').hidden=all.length<=12; $('#accHistMore').textContent=accHistAll?'عرض أقل':'عرض الكل ('+all.length+')';
}
$('#accHistMore').onclick=()=>{accHistAll=!accHistAll;paintAccHist()};
function paintAccType(){
  document.querySelectorAll('#accType button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.t===accType?'true':'false'));
  $('#accBankRow').hidden=accType==='cash'; $('#accLast4Row').hidden=accType!=='bank'; $('#accPhoneRow').hidden=accType!=='wallet';
  $('#accType').hidden=accSav; // savings are savings: nothing to pick
  $('#accType [data-t="cash"]').hidden=!(accType==='cash'&&!accSav&&accEdit); // «كاش» is not offered for a new account (round 48): cash comes from «سحب كاش», savings from their own card
  $('#accBank').placeholder= accType==='wallet'?'اسم المحفظة (مثلًا فودافون كاش)':'اسم البنك (مثلًا البنك الأهلي)';
  $('#accName').placeholder= accSav?'اسمها (مثلًا: فلوس البيت)':accType==='cash'?'اسم الحساب (مثلًا: كاش في البيت)':'اسم الحساب (مثلًا: الأهلي المرتب)';
}
document.querySelectorAll('#accType button').forEach(b=>b.onclick=()=>{accType=b.dataset.t;paintAccType()});
function openAccSheet(id){
  const a=id?ACC(id):null; accEdit=a?a.id:null; accType=a?a.type:'bank'; accDelAsk=false; accSav=!!(a&&a.sav);
  $('#accTitle').textContent=a?(a.sav?'تعديل المدخرات':'تعديل حساب'):'حساب جديد';
  $('#accName').value=a?a.name:''; $('#accBank').value=a?a.bank:''; $('#accLast4').value=a?a.last4:''; $('#accPhone').value=a?a.phone:'';
  $('#accCur').innerHTML=CURRENCIES.map(c=>`<option value="${c.id}">${c.n} (${c.s})</option>`).join('');
  $('#accCur').value=a?a.cur:S.currency; const used=!!(a&&accUsed(a.id)); $('#accCur').disabled=used; $('#accCurNote').hidden=!used;
  accBalInit=a?String(accBal(a.id)):''; $('#accBal').value=accBalInit; $('#accBalLab').textContent=a?'الرصيد الحالي':'الرصيد دلوقتي';
  $('#accLow').value=a&&a.low?a.low:''; $('#accRecon').hidden=!a; $('#accCashRow').hidden=!(a&&a.type!=='cash');
  $('#accDel').hidden=!a; $('#accSave').textContent=a?'حفظ التعديل':'حفظ'; $('#accErr').textContent=''; paintAccType(); accHistAll=false; paintAccHist();
  $('#scrim').classList.add('open'); $('#accSheet').classList.add('open');
}
$('#accCancel').onclick=closeSheets;
$('#accWd').onclick=()=>{const id=accEdit; closeSheets(); setTimeout(()=>openCashMove(id,'wd'),260)};
$('#accDep').onclick=()=>{const id=accEdit; closeSheets(); setTimeout(()=>openCashMove(id,'dep'),260)};
/* reconcile: the person types what the bank really shows; the app says the difference and records it as an expense or income on that account (or only moves the opening balance) */
var rcnFor=null;
function rcnState(){ const a=ACC(rcnFor); if(!a) return null; const raw=$('#rcnAmt').value.trim(), real=raw===''?NaN:evalExpr(raw);
  if(!Number.isFinite(real)||Math.abs(real)>=MAXAMT) return {a,real:NaN}; return {a,real,diff:r2(real-accBal(a.id))} }
function rcnPaint(){
  const s=rcnState(), sym=s?curSym(s.a.cur):'', rec=$('#rcnRec'), adj=$('#rcnAdj');
  $('#rcnErr').textContent=''; rec.hidden=adj.hidden=true;
  if(!s||!Number.isFinite(s.real)){$('#rcnDiff').textContent='';return}
  if(Math.abs(s.diff)<0.005){$('#rcnDiff').textContent='الرصيد مطابق ✓'; return}
  const n=fmt(Math.abs(s.diff))+' '+sym;
  $('#rcnDiff').textContent= s.diff<0? `الحساب الحقيقي أقل من التطبيق بـ ${n}. يعني فيه فلوس خرجت ومسجلتهاش.` : `الحساب الحقيقي أكتر من التطبيق بـ ${n}. يعني فيه فلوس دخلت ومسجلتهاش.`;
  rec.hidden=adj.hidden=false; rec.textContent= s.diff<0? `سجّل ${n} كمصروف «فرق رصيد»` : `سجّل ${n} كدخل «فرق رصيد»`;
}
function openRecon(id){
  const a=ACC(id); if(!a) return; rcnFor=id; closeSheets();
  $('#rcnInfo').textContent=`رصيد «${accDisp(a)}» في التطبيق دلوقتي ${fmt(accBal(id))} ${curSym(a.cur)}`;
  $('#rcnAmt').value=''; rcnPaint(); openSheetEl('rcnSheet'); $('#rcnAmt').focus({preventScroll:true});
}
$('#accRecon').onclick=()=>openRecon(accEdit);
$('#rcnAmt').addEventListener('input',rcnPaint);
$('#rcnCancel').onclick=closeSheets;
$('#rcnAdj').onclick=()=>{ const s=rcnState(); if(!s||!Number.isFinite(s.real)||Math.abs(s.diff)<0.005) return;
  const old=s.a.open; s.a.open=r2(s.a.open+s.diff); save();closeSheets();renderAll();
  toast('اتظبط رصيد '+s.a.name,'تراجع',()=>{s.a.open=old;save();renderAll()},5000) };
$('#rcnRec').onclick=()=>{ const s=rcnState(); if(!s||!Number.isFinite(s.real)||Math.abs(s.diff)<0.005) return;
  const abs=Math.abs(s.diff), main=toMain(abs,s.a.cur);
  if(main==null||!(main>=0.01)){$('#rcnErr').textContent='مفيش سعر صرف متاح دلوقتي للعملة دي. جرّب لما النت يشتغل'; ratesRefresh(false); return}
  let rec; const amount=r2(main);
  if(s.diff<0){ rec={id:uid(),amount,cat:'other',note:'فرق رصيد',pay:PAY[S.lastPay]?S.lastPay:'cash',ts:Date.now(),acc:s.a.id,accAmt:abs}; S.expenses.push(rec) }
  else { rec={id:uid(),ts:Date.now(),amount,src:'فرق رصيد',note:'',acc:s.a.id,accAmt:abs}; S.inflows.push(rec) }
  const isExp=s.diff<0; save();closeSheets();renderAll();
  toast(isExp?`اتسجل مصروف «فرق رصيد» ${fmt(abs)} ${curSym(s.a.cur)}`:`اتسجل دخل «فرق رصيد» ${fmt(abs)} ${curSym(s.a.cur)}`,'تراجع',()=>{ if(isExp) S.expenses=S.expenses.filter(x=>x.id!==rec.id); else S.inflows=S.inflows.filter(x=>x.id!==rec.id); save();renderAll() },5000) };
$('#accSave').onclick=()=>{
  const E=m=>{$('#accErr').textContent=m}, name=$('#accName').value.trim();
  if(!name){E('اكتب اسم الحساب');return}
  const raw=$('#accBal').value.trim(); let v;
  if(accEdit&&raw===accBalInit) v=+accBalInit; else v= raw===''?0:evalExpr(raw);
  if(!Number.isFinite(v)||Math.abs(v)>=MAXAMT){E('اكتب الرصيد بالأرقام');return}
  const last4=$('#accLast4').value.trim(), phone=$('#accPhone').value.trim().replace(/[\s-]/g,'');
  if(accType==='bank'&&last4&&!/^\d{4}$/.test(last4)){E('اكتب آخر 4 أرقام من الكارت بس');return}
  if(accType==='wallet'&&phone&&!/^\+?\d{8,15}$/.test(phone)){E('رقم المحفظة مش مظبوط');return}
  const lowRaw=$('#accLow').value.trim(), low=lowRaw?evalExpr(lowRaw):0;
  if(lowRaw&&!(low>0&&low<MAXAMT)){E('اكتب حد الرصيد المنخفض رقم بس، أو سيبه فاضي');return}
  const base={name,type:accSav?'cash':accType,bank:accType==='cash'||accSav?'':$('#accBank').value.trim(),cur:$('#accCur').value,last4:accType==='bank'&&!accSav?last4:'',phone:accType==='wallet'&&!accSav?phone:'',...(low>0?{low:r2(low)}:{}),...(accSav?{sav:true}:{})};
  /* the same name is fine; only an account identical in name + bank + last 4 digits + phone is refused (it would be a copy) */
  {const k=x=>[x.name.trim().toLowerCase(),(x.bank||'').trim().toLowerCase(),x.last4||'',x.phone||'',x.type].join('|');
   if(S.accounts.some(a=>a.id!==accEdit&&k(a)===k(base))){E(accType==='bank'?'عندك حساب بنفس الاسم والبنك وآخر 4 أرقام. غيّر آخر 4 أرقام أو اسم البنك':'عندك حساب بنفس البيانات دي بالظبط');return}}
  if(accEdit){ const a=ACC(accEdit), cur=accBal(a.id); Object.assign(a,base); if(!(low>0)) delete a.low; a.open=r2(a.open+(v-cur)) } // typing the balance you see now moves the opening balance, never the history
  else S.accounts.push({id:uid(),...base,open:r2(v),ts:Date.now()});
  save();closeSheets();renderAll();
  toast(accEdit?(accSav?'اتعدّلت المدخرات':'اتعدّل الحساب'):(accSav?'اتضافت «'+name+'» لمدخراتك':'اتضاف حساب «'+name+'»'));
};
$('#accDel').onclick=()=>{
  const a=ACC(accEdit); if(!a) return;
  if(S.transfers.some(t=>t.from===a.id||t.to===a.id)){$('#accErr').textContent='الحساب ده عليه تحويلات. احذف التحويلات الأول عشان الأرصدة متتلخبطش';return}
  const linked=S.expenses.filter(e=>e.acc===a.id), nIp=S.instPays.concat(S.inflows,S.debts.flatMap(debtAccRows),S.gold.flatMap(goldAccRows)).filter(p=>p.acc===a.id).length;
  if((linked.length||nIp)&&!accDelAsk){accDelAsk=true;$('#accErr').textContent=`الحساب ده مربوط بـ ${linked.length+nIp} حركة. دوس «حذف الحساب» تاني: المصاريف هتفضل زي ما هي بس هتتفك من الحساب`;return}
  const oldAccs=S.accounts, links=linked.map(e=>({e,acc:e.acc,accAmt:e.accAmt})), oldLast=S.lastAcc;
  S.accounts=S.accounts.filter(x=>x.id!==a.id); linked.forEach(e=>{delete e.acc;delete e.accAmt}); const ipL=S.instPays.concat(S.inflows,S.debts.flatMap(debtAccRows),S.gold.flatMap(goldAccRows)).filter(p=>p.acc===a.id).map(p=>({p,acc:p.acc,accAmt:p.accAmt})); ipL.forEach(l=>{delete l.p.acc;delete l.p.accAmt}); if(S.lastAcc===a.id) S.lastAcc='';
  save();closeSheets();renderAll();
  toast('اتحذف حساب «'+a.name+'»','تراجع',()=>{S.accounts=oldAccs;links.forEach(l=>{l.e.acc=l.acc;l.e.accAmt=l.accAmt});ipL.forEach(l=>{l.p.acc=l.acc;l.p.accAmt=l.accAmt});S.lastAcc=oldLast;save();renderAll()},6000);
};

/* --- a transfer between my accounts (also between currencies, with the rate that was really used) --- */
var trEdit=null, trAuto=0, trAsked=false;
const trNum=el=>{const v=evalExpr(el.value); return Number.isFinite(v)?v:NaN};
const trAvailOf=f=>{ let v=accBal(f.id); const old=trEdit&&S.transfers.find(z=>z.id===trEdit); if(old&&old.from===f.id) v+=old.out+old.fee; if(old&&old.to===f.id) v-=old.in; return r2(v) };
function trSides(){
  const side=v=>v===NEWCASH? {id:NEWCASH,name:'كاش',type:'cash',cur:trCashCur,open:0,virt:true} : ACC(v);
  const f=side($('#trFrom').value), t=side($('#trTo').value); return {f,t,x:!!(f&&t&&f.id!==t.id&&f.cur!==t.cur)}}
function trCalcIn(){const o=trNum($('#trOut')), r=parseFloat($('#trRate').value); $('#trIn').value= o>0&&r>0? String(r2(o*r)):''}
function trPaint(reset){
  const {f,t,x}=trSides(); $('#trOutCur').textContent=f?curSym(f.cur):''; $('#trRateRow').hidden=!x;
  { const md=trMode(f,t); if(!trEdit) $('#trTitle').textContent= md==='wd'?'سحب كاش':md==='dep'?'إيداع كاش':'تحويل بين حساباتي';
    $('#trFeeLab').firstChild.textContent= md==='wd'?'رسوم السحب':md==='dep'?'رسوم الإيداع':'رسوم التحويل';
    $('#trHint').textContent= md==='wd'? 'السحب مش مصروف: الفلوس بتنقل من حسابك للكاش اللي معاك. ولما تصرف منها، سجّل المصروف من حساب الكاش.'
      : md==='dep'? 'الإيداع مش دخل: الفلوس بتنقل من الكاش اللي معاك لحسابك.' : 'بتسجّل تحويل عملته فعلاً. مش مصروف ومش دخل.' }
  $('#trAvail').textContent= f? `المتاح في «${accDisp(f)}»: ${fmt(trAvailOf(f))} ${curSym(f.cur)}` : '';
  if(!x) return;
  trAuto=rateFor(f.cur,t.cur)||0;
  if(reset){ $('#trRate').value=trAuto?String(+trAuto.toPrecision(6)):''; trCalcIn() }
  $('#trRateHint').textContent= trAuto? `سعر النهارده: \u2068${'1 '+f.cur+' = '+curFmtRate(trAuto)+' '+t.cur}\u2069. عدّله لو البنك نفّذ بسعر تاني` : 'مفيش سعر متاح دلوقتي. اكتب السعر أو المبلغ اللي وصل: مليم مش بيخمّن';
  if(!trAuto&&!trAsked){trAsked=true; ratesRefresh(false,()=>{if($('#trSheet').classList.contains('open')&&!$('#trRateRow').hidden&&!$('#trRate').value) trPaint(true)})}
}
var trCaps=null, inCap=null, dCap=null, payCap=null, RF=null;
/* Cash withdrawal (round 47): taking money out of the bank or a wallet is a transfer to a cash account, never an expense; the expense is
   recorded when the cash is spent. Paying it back into the bank is the same transfer the other way. If there is no cash account in that
   currency yet, the lists offer a new one (NEWCASH) and it is only made when the person presses save. */
var NEWCASH='__newcash', trCashCur='EGP';
function cashAccFor(cur){ return S.accounts.find(a=>a.type==='cash'&&!a.sav&&a.cur===cur)||null }
function trMode(f,t){ if(f&&f.sav||t&&t.sav) return 'tr'; return f&&t&&t.type==='cash'&&f.type!=='cash'? 'wd' : f&&t&&f.type==='cash'&&t.type!=='cash'? 'dep' : 'tr' }
function openCashMove(accId,mode,pre){
  const g=ACC(accId), a= g&&g.type!=='cash'? g : S.accounts.find(x=>x.type!=='cash');
  if(!a){toast('ضيف حسابك البنكي أو محفظتك الأول من «أنا ← الحسابات»');return}
  const c=cashAccFor(a.cur), cid=c?c.id:NEWCASH;
  openTrSheet(null,Object.assign({},pre||{},{from:mode==='dep'?cid:a.id,to:mode==='dep'?a.id:cid,cashCur:a.cur}));
}
function openTrSheet(id,pre){
  const t=id?S.transfers.find(z=>z.id===id):null;
  if(t&&S.bMoves.some(m=>m.tr===t.id)){ toast('التحويل ده جزء من نقل للميزانية. تقدر تمسحه من «نقل بين حساباتي والميزانية»',null,null,4500); openMv('in'); return }
  trCashCur= !t&&pre&&pre.cashCur&&CURRENCIES.some(c=>c.id===pre.cashCur)? pre.cashCur : S.currency;
  const virt=!cashAccFor(trCashCur);
  if(S.accounts.length+(virt?1:0)<2&&!t){toast('محتاج حسابين على الأقل');return}
  trEdit=t?t.id:null; trAsked=false;
  const o=S.accounts.map(a=>`<option value="${esc(a.id)}">${esc(accDisp(a))} (${esc(curSym(a.cur))})</option>`).join('')+(virt?`<option value="${NEWCASH}">💵 كاش (حساب جديد${trCashCur!==S.currency?' بالـ'+esc(curSym(trCashCur)):''})</option>`:'');
  const ids=S.accounts.map(a=>a.id).concat(virt?[NEWCASH]:[]);
  $('#trFrom').innerHTML=o; $('#trTo').innerHTML=o;
  $('#trFrom').value=t?t.from:ids[0]; $('#trTo').value=t?t.to:ids[1];
  $('#trTitle').textContent=t?'تعديل تحويل':'تحويل بين حساباتي'; $('#trSave').textContent=t?'حفظ التعديل':'حفظ'; $('#trDel').hidden=!t;
  $('#trOut').value=t?String(t.out):''; $('#trFee').value=t&&t.fee?String(t.fee):''; $('#trNote').value=t?t.note:'';
  $('#trDay').max=todayKey(); $('#trDay').value=t?dayKey(t.ts):todayKey(); $('#trErr').textContent='';
  trCaps=null;
  const okSide=v=>v===NEWCASH? virt : !!ACC(v);
  if(!t&&pre&&okSide(pre.from)&&okSide(pre.to)&&pre.from!==pre.to){ $('#trFrom').value=pre.from; $('#trTo').value=pre.to; $('#trOut').value=pre.out?String(pre.out):''; if(isDK(pre.day)&&pre.day<=todayKey()) $('#trDay').value=pre.day; trCaps=pre.caps||null; if(pre.fee>0) $('#trFee').value=String(pre.fee) }
  trPaint(!t);
  if(t&&!$('#trRateRow').hidden){ $('#trRate').value=String(+(t.rate||t.in/t.out).toPrecision(6)); $('#trIn').value=String(t.in) }
  $('#scrim').classList.add('open'); $('#trSheet').classList.add('open');
  if(!t&&!$('#trOut').value) setTimeout(()=>$('#trOut').focus({preventScroll:true}),300);
}
$('#trFrom').onchange=()=>{ if($('#trTo').value===$('#trFrom').value){const o=S.accounts.find(a=>a.id!==$('#trFrom').value); if(o) $('#trTo').value=o.id} trPaint(true) };
$('#trTo').onchange=()=>{ if($('#trTo').value===$('#trFrom').value){const o=S.accounts.find(a=>a.id!==$('#trTo').value); if(o) $('#trFrom').value=o.id} trPaint(true) };
$('#trOut').oninput=()=>{ if(!$('#trRateRow').hidden) trCalcIn() };
$('#trRate').oninput=()=>{trCalcIn()};
$('#trIn').oninput=()=>{const o=trNum($('#trOut')), i=trNum($('#trIn')); if(o>0&&i>0){$('#trRate').value=String(+(i/o).toPrecision(6))}};
$('#trRefresh').onclick=()=>{ $('#trErr').textContent=''; ratesRefresh(true,()=>{ trPaint(true); if(RT.err&&!trAuto) $('#trErr').textContent='مقدرتش أجيب السعر دلوقتي. اكتب السعر بنفسك أو جرّب لما النت يشتغل'; else toast('اتحدّث سعر الصرف') }) };
$('#trCancel').onclick=closeSheets;
$('#trSave').onclick=()=>{
  const E=m=>{$('#trErr').textContent=m}, {f,t,x}=trSides();
  if(!f||!t){E('اختار الحسابين');return} if(f.id===t.id){E('اختار حسابين مختلفين');return}
  const out=trNum($('#trOut')); if(!(out>0&&out<MAXAMT)){E('اكتب المبلغ');return}
  const feeRaw=$('#trFee').value.trim(), fee=feeRaw===''?0:trNum($('#trFee')); if(!(fee>=0&&fee<MAXAMT)){E('الرسوم مش مظبوطة');return}
  { const need=r2(out+fee), avail=trAvailOf(f); /* never move more than the account really has */
    if(need>avail+0.004){E(avail>0? `المبلغ ${fmt(need)}${fee?' (مع الرسوم)':''} أكبر من المتاح في «${accDisp(f)}»: ${fmt(avail)} ${curSym(f.cur)}. قلّل المبلغ`:`مفيش رصيد متاح في «${accDisp(f)}» للتحويل`);return} }
  let inn=out, rate=null;
  if(x){ const r=parseFloat($('#trRate').value), i=trNum($('#trIn'));
    if(i>0){ inn=r2(i); rate= r>0&&Math.abs(r2(out*r)-inn)<0.011? r : inn/out }
    else if(r>0){ inn=r2(out*r); rate=r }
    else {E('اكتب سعر الصرف أو المبلغ اللي وصل. مليم مش بيخمّن السعر');return}
    if(!(inn>0&&inn<MAXAMT)){E('المبلغ اللي وصل مش مظبوط');return} }
  const day=$('#trDay').value, dk=/^\d{4}-\d{2}-\d{2}$/.test(day)?(day>todayKey()?todayKey():day):todayKey();
  const old=trEdit?S.transfers.find(z=>z.id===trEdit):null;
  let made=null; // the new cash account is made only now, when the person saves
  if(f.virt||t.virt){ made={id:uid(),name:'كاش',type:'cash',bank:'',cur:trCashCur,open:0,last4:'',phone:'',ts:Date.now()}; S.accounts.push(made) }
  const fid=f.virt?made.id:f.id, tid=t.virt?made.id:t.id, md=trMode(f,t);
  const rec={id:old?old.id:uid(),ts:tsForDay(dk,old&&old.ts),from:fid,to:tid,out:r2(out),in:inn,fee:r2(fee),note:$('#trNote').value.trim().slice(0,80)};
  if(x){rec.rate=rate;rec.rs=trAuto&&Math.abs(rate/trAuto-1)<1e-6?'a':'m'}
  if(old) S.transfers[S.transfers.indexOf(old)]=rec; else S.transfers.push(rec);
  if(trCaps) S.capQ=(S.capQ||[]).filter(q=>!trCaps.includes(q.id));
  if(md==='wd'&&!old) S.lastAcc=tid; // the next expense is most likely paid from that cash
  save();closeSheets();renderAll();
  const fa=ACC(fid), ta=ACC(tid);
  if(md==='wd') toast(`اتسجّل سحب ${fmt(rec.out)} ${curSym(fa.cur)} من ${accDisp(fa)} لـ«${accDisp(ta)}». مش مصروف: سجّل اللي هتصرفه منه وقت ما تصرفه${made?'. اتعمل حساب «كاش» جديد':''}`,null,null,5500);
  else if(md==='dep') toast(`اتسجّل إيداع ${fmt(rec.out)} ${curSym(fa.cur)} من «${accDisp(fa)}» في ${accDisp(ta)}`);
  else toast(`اتسجّل تحويل ${fmt(rec.out)} ${curSym(fa.cur)} من ${accDisp(fa)} إلى ${accDisp(ta)}${made?'. اتعمل حساب «كاش» جديد':''}`);
};
$('#trDel').onclick=()=>{
  const t=S.transfers.find(z=>z.id===trEdit); if(!t) return;
  const i=S.transfers.indexOf(t); S.transfers.splice(i,1); save();closeSheets();renderAll();
  toast('اتحذف التحويل','تراجع',()=>{S.transfers.splice(Math.min(i,S.transfers.length),0,t);save();renderAll()},6000);
};

/* --- "my money" card on the expenses screen --- */
/* two small buttons under the budget card; each opens the card it used to show on the home screen as a pop-up */
function paintHomeChips(){
  const f=$('#chipFree'),m=$('#chipMoney'); if(!f||!m) return;
  const fa=freeIncomeActive(), ma=S.accounts.length>0&&S.moneyView!=='off';
  f.hidden=!fa; m.hidden=!ma; $('#homeChips').hidden=!(fa||ma);
  if(fa) f.innerHTML=`<span>💼 ${esc(TX('الدخل الحر'))}</span><b>${money(freeIncomeBalance())} ${CS()}</b>`;
  if(ma){const mv=mvState(); m.innerHTML=`<span>👛 ${esc(TX('فلوسي'))}</span><b>${money(mv.tot)} ${CS()}</b>`}
}
$('#chipFree').onclick=()=>{closeSheets();openSheetEl('freeSheet')};
$('#chipMoney').onclick=()=>{closeSheets();openSheetEl('moneySheet')};
function renderMoney(){
  const box=$('#moneyBox'); if(!box) return;
  if(!S.accounts.length||S.moneyView==='off'){box.innerHTML='';return}
  accEnsureRates();
  const m=mvState();
  let h=`<div class="card mny"><div class="card-h"><h3>الفلوس اللي معايا</h3><b>${money(m.tot)} ${CS()}</b></div>`;
  if(m.fixed) h+=`<div class="mny-split"><div><small>للميزانية</small><b>${money(m.forB)} ${CS()}</b></div><div><small>مدخرات</small><b>${money(m.sav)} ${CS()}</b></div></div>`;
  if(m.fixed&&m.tot<m.rem&&!m.missing.length) h+=`<p class="hint" style="margin:8px 0 0">المتبقي في الميزانية (${fmt(m.rem)}) أكبر من الفلوس اللي في حساباتك.</p>`;
  if(m.missing.length) h+=`<p class="hint" style="margin:8px 0 0">مفيش سعر صرف دلوقتي لـ ${esc(m.missing.map(a=>a.name).join('، '))}، فمش محسوبين في الإجمالي.</p>`;
  if(S.moneyView==='split') h+=S.accounts.map(a=>{const b=accBal(a.id); return `<div class="mny-acc"><span>${a.sav?'💰':esc(ACC_TYPES[a.type].e)} ${esc(accDisp(a))}</span><b${b<0?' style="color:var(--bad)"':''}>${money(b)} ${esc(curSym(a.cur))}</b></div>`}).join('');
  if(m.fixed) h+=`<button type="button" class="btn mny-btn" id="mvOpen">⇅ نقل بين حساباتي والميزانية</button>`;
  box.innerHTML=h+'</div>';
  const b=$('#mvOpen'); if(b) b.onclick=()=>openMv('in');
}
/* Moving money between my accounts and the budget (round 48).
   «للميزانية»: this period gets more to spend; the budget itself stays (next period starts again from S.budget). If the money is spent from
   another account (savings at home -> cash in my pocket), a transfer moves it there; it is never an expense or income.
   «من الميزانية»: this period gets less to spend and the money goes into the account for good (a transfer from the account it was in). */
var mvDir='in';
const mvOpt=a=>`<option value="${esc(a.id)}">${a.sav?'💰 ':''}${esc(accDisp(a))} (${esc(curSym(a.cur))})</option>`;
function openMv(dir){
  if(!(S.budgetMode==='fixed'&&S.budget>0)){toast('النقل للميزانية بيشتغل لما تكون الميزانية محددة. حددها من «أنا ← الميزانية»',null,null,4500);return}
  if(!S.accounts.length){toast('ضيف حساب أو مدخرات الأول');return}
  closeSheets(); mvDir=dir==='out'?'out':'in';
  const L=S.accounts.slice().sort((a,b)=>(b.sav?1:0)-(a.sav?1:0));
  $('#mvAcc').innerHTML=L.map(mvOpt).join(''); $('#mvAcc').value=L[0].id;
  $('#mvAmt').value=''; $('#mvErr').textContent=''; $('#mvAmtBox').classList.remove('err');
  mvPaint(true); openSheetEl('mvSheet');
}
function mvPaint(resetVia){
  document.querySelectorAll('#mvDir button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.d===mvDir?'true':'false'));
  const P=periodOf(Date.now()), B=budOf(P), rem=r2(B-budgetSpent(P)), adj=r2(B-S.budget), inn=mvDir==='in', a=ACC($('#mvAcc').value);
  $('#mvInfo').textContent=`ميزانية الفترة دي ${fmt(B)} ${CS()}${adj?` (الأساسية ${fmt(S.budget)} ${adj>0?'+':'-'} ${fmt(Math.abs(adj))} نقلتهم)`:''}، والمتبقي منها ${fmt(Math.max(0,rem))} ${CS()}.`;
  $('#mvAccLab').textContent= inn?'من':'إلى';
  $('#mvViaLab').innerHTML= inn? 'هتصرفهم من<small>الفلوس بتتنقل للحساب ده عشان تصرف منها</small>' : 'الفلوس دي موجودة في<small>بتتنقل منه للحساب اللي فوق</small>';
  const others=S.accounts.filter(x=>!x.sav&&a&&x.id!==a.id), newCash=inn&&a&&!cashAccFor(a.cur), keep=$('#mvVia').value;
  $('#mvVia').innerHTML=others.map(mvOpt).join('')+(newCash?`<option value="${NEWCASH}">💵 كاش (حساب جديد)</option>`:'')+`<option value="">${inn?'هيفضلوا في نفس الحساب':'هيفضلوا مكانهم (من غير نقل)'}</option>`;
  let v=resetVia?null:keep; if(v!==null&&![...$('#mvVia').options].some(o=>o.value===v)) v=null;
  if(v===null){ const c=a&&cashAccFor(a.cur), last=ACC(S.lastAcc);
    v= !a||!a.sav? '' : inn? (c&&c.id!==a.id?c.id:newCash?NEWCASH:others[0]?others[0].id:'') : (last&&!last.sav&&last.id!==a.id?last.id:others[0]?others[0].id:'') }
  $('#mvVia').value=v; $('#mvCur').textContent=CS();
  const via=v===NEWCASH?'كاش':ACC(v)?accDisp(ACC(v)):'', an=a?accDisp(a):'';
  $('#mvHint').textContent= inn? (via? `هيتسجل تحويل من «${an}» لـ«${via}» (مش مصروف)، وميزانية الفترة دي بس هتزيد. الفترة الجاية ترجع ${fmt(S.budget)} ${CS()}.` : `الفلوس هتفضل في «${an}»، وميزانية الفترة دي بس هتزيد. الفترة الجاية ترجع ${fmt(S.budget)} ${CS()}.`)
    : (via? `هيتسجل تحويل من «${via}» لـ«${an}»، فرصيد «${an}» هيزيد على طول، والمتبقي من ميزانية الفترة دي هيقل.` : `الأرصدة مش هتتغير؛ المتبقي من ميزانية الفترة دي هيقل والفلوس دي تتحسب مدخرات.`);
  const ms=S.bMoves.filter(m=>m.pk===P.key).sort((x,y)=>y.ts-x.ts);
  $('#mvListBox').hidden=!ms.length;
  $('#mvList').innerHTML=ms.map(m=>{ const ac=ACC(m.acc), t=m.tr&&S.transfers.find(z=>z.id===m.tr), o=t&&ACC(m.dir==='in'?t.to:t.from);
    return `<li><span>${m.dir==='in'?'للميزانية من':'من الميزانية لـ'} «${esc(ac?accDisp(ac):'؟')}»${o?` · ${m.dir==='in'?'اتنقلت لـ':'من'} «${esc(accDisp(o))}»`:''}</span><span class="ipd">${m.dir==='in'?'+':'-'}${fmt(m.amt)} · ${esc(shortDate(m.ts))}<button type="button" data-mvdel="${esc(m.id)}">حذف</button></span></li>` }).join('');
}
document.querySelectorAll('#mvDir button').forEach(b=>b.onclick=()=>{mvDir=b.dataset.d;$('#mvErr').textContent='';mvPaint(true)});
$('#mvAcc').onchange=()=>mvPaint(true);
$('#mvVia').onchange=()=>mvPaint(false);
$('#mvCancel').onclick=closeSheets;
$('#mvList').onclick=e=>{ const b=e.target.closest('[data-mvdel]'); if(!b) return; const m=S.bMoves.find(x=>x.id===b.dataset.mvdel); if(!m) return;
  const t=m.tr&&S.transfers.find(z=>z.id===m.tr), mi=S.bMoves.indexOf(m), ti=t?S.transfers.indexOf(t):-1;
  S.bMoves.splice(mi,1); if(t) S.transfers.splice(ti,1); save(); renderAll(); mvPaint(false);
  toast('اتمسح النقل','تراجع',()=>{ S.bMoves.splice(Math.min(mi,S.bMoves.length),0,m); if(t) S.transfers.splice(Math.min(ti,S.transfers.length),0,t); save(); renderAll(); if($('#mvSheet').classList.contains('open')) mvPaint(false) },5000) };
$('#mvSave').onclick=()=>{
  const E=t=>{$('#mvErr').textContent=t}, P=periodOf(Date.now()), a=ACC($('#mvAcc').value), X=evalExpr($('#mvAmt').value), inn=mvDir==='in', via=$('#mvVia').value;
  if(!a){E('اختار الحساب');return}
  if(!(X>0&&X<MAXAMT)){E('اكتب المبلغ');$('#mvAmtBox').classList.add('err');return}
  if(!inn){ const rem=r2(budOf(P)-budgetSpent(P)); if(X>rem+0.004){E(rem>0?`المتبقي من ميزانية الفترة دي ${fmt(rem)} ${CS()} بس`:'مفيش متبقي في ميزانية الفترة دي');return} }
  let tr=null, made=null;
  if(via){
    const v=via===NEWCASH?{id:NEWCASH,name:'كاش',type:'cash',cur:a.cur,virt:true}:ACC(via); if(!v){E('اختار الحساب التاني');return}
    const from=inn?a:v, to=inn?v:a, fo=toAcc(X,from), ti=toAcc(X,to);
    if(fo==null||ti==null){E('مفيش سعر صرف متاح دلوقتي للعملة دي. جرّب لما النت يشتغل');ratesRefresh(false);return}
    if(!from.virt&&fo>accBal(from.id)+0.004){E(`مفيش في «${accDisp(from)}» غير ${fmt(accBal(from.id))} ${curSym(from.cur)}`);return}
    if(v.virt){ made={id:uid(),name:'كاش',type:'cash',bank:'',cur:a.cur,open:0,last4:'',phone:'',ts:Date.now()}; S.accounts.push(made) }
    const fid=from.virt?made.id:from.id, tid=to.virt?made.id:to.id;
    tr={id:uid(),ts:Date.now(),from:fid,to:tid,out:fo,in:ti,fee:0,note:inn?'نقل للميزانية':'نقل من الميزانية'}; if(from.cur!==to.cur){tr.rate=ti/fo;tr.rs='a'}
    S.transfers.push(tr);
  }
  const bm={id:uid(),ts:Date.now(),pk:P.key,amt:r2(X),dir:inn?'in':'out',acc:a.id,...(tr?{tr:tr.id}:{})}; S.bMoves.push(bm);
  save(); closeSheets(); renderAll();
  toast(inn?`ميزانية الفترة دي بقت ${fmt(budOf(P))} ${CS()}، والفترة الجاية ترجع ${fmt(S.budget)}`:`اتنقل ${fmt(X)} ${CS()} من الميزانية لـ«${accDisp(a)}»`,'تراجع',()=>{
    S.bMoves=S.bMoves.filter(m=>m.id!==bm.id); if(tr) S.transfers=S.transfers.filter(t=>t.id!==tr.id); if(made&&!accUsed(made.id)) S.accounts=S.accounts.filter(x=>x.id!==made.id); save(); renderAll() },6000);
};

/* ===== Installments (التقسيط) =====
   A plan = a list of installments, each with its own amount and due day (change one without touching the others).
   What was paid is never stored on the plan. It is counted from (1) expenses that point at the installment, and
   (2) S.instPays: payments for a purchase the person already recorded as an expense, so the same money is never counted twice. */
const EPS=0.02;
const itemPaid=it=>r2(S.expenses.reduce((a,e)=>e.inst===it.id?a+e.amount:a,0)+S.instPays.reduce((a,p)=>p.item===it.id?a+p.amount:a,0));
const itemRem=it=>Math.max(0,r2(it.amount-itemPaid(it)));
const itemDone=it=>itemRem(it)<=EPS;
const instTotal=p=>r2(p.items.reduce((a,i)=>a+i.amount,0));
const instPaidSum=p=>r2(p.items.reduce((a,i)=>a+Math.min(i.amount,itemPaid(i)),0));
const instRemSum=p=>r2(p.items.reduce((a,i)=>a+itemRem(i),0));
const instNext=p=>p.items.filter(i=>!itemDone(i)).sort((a,b)=>a.due<b.due?-1:a.due>b.due?1:0)[0]||null;
const instOf=itemId=>S.insts.find(p=>p.items.some(i=>i.id===itemId))||null;
function ensureInstCat(){
  if(CAT.inst) return;
  const i=S.cats.findIndex(c=>c.id==='other');
  S.cats.splice(i<0?S.cats.length:i,0,{id:'inst',name:'تقسيط',e:'💳',c:'#7C3AED'}); syncCats();
}
const addMonthDK=(dk,i)=>{const [y,m,d]=dk.split('-').map(Number), t=new Date(y,m-1+i,1); return dayKey(new Date(t.getFullYear(),t.getMonth(),Math.min(d,new Date(t.getFullYear(),t.getMonth()+1,0).getDate())))};
function instMonth(mk){ let tot=0,rem=0; S.insts.forEach(p=>p.items.forEach(i=>{ if(i.due.slice(0,7)===mk){tot+=i.amount; rem+=itemRem(i)} })); return {tot:r2(tot),rem:r2(rem)} }
function instLate(){ const tk=todayKey(), mk=monKey(Date.now()); let a=0; S.insts.forEach(p=>p.items.forEach(i=>{ if(i.due<tk&&i.due.slice(0,7)<mk&&!itemDone(i)) a+=itemRem(i) })); return r2(a) }

function instCard(p){
  const tot=instTotal(p), paid=instPaidSum(p), rem=instRemSum(p), nx=instNext(p), n=nx?diffDays(nx.due):null;
  const rows=p.items.map((it,i)=>{ const d=itemDone(it), pd=itemPaid(it), late=!d&&diffDays(it.due)<0;
    return `<button type="button" class="acc-row" data-iedit="${esc(it.id)}"><span class="ai">${d?'✅':late?'⏰':pd>0?'◐':'○'}</span><span class="an">القسط ${i+1} · ${esc(dkToDMY(it.due))}<small>${d?'اتدفع':pd>0?`دفعت ${fmt(pd)} وفاضل ${fmt(itemRem(it))}`:late?'متأخر':relDay(diffDays(it.due))}</small></span><span class="ab">${money(it.amount)}<small>${CS()}</small></span></button>` }).join('');
  return `<div class="gc${p.id===justAddedOb?' new':''}"><div class="gh"><div class="tile">💳</div><div class="body"><b>${esc(p.name)}</b><small>${p.party?esc(p.party)+' · ':''}${p.items.length} ${p.items.length<=10?'أقساط':'قسط'}</small></div>
      <button class="more" data-obmore="inst:${esc(p.id)}" aria-label="خيارات" aria-haspopup="menu" aria-expanded="false">${ICON_MORE}</button></div>
    <div class="ibar"><i style="width:${tot?Math.min(100,paid/tot*100):0}%"></i></div>
    <div class="gstat">دفعت ${fmt(paid)} من ${fmt(tot)} ${CS()} · فاضل ${fmt(rem)} ${CS()}</div>
    ${nx?`<div class="gfoot"><div class="t"><small>القسط الجاي</small><b>${fmt(itemRem(nx))} ${CS()}</b> <small style="display:inline">· ${esc(dkToDMY(nx.due))} (${relDay(n)})</small></div><button class="btn sm teal" data-ipay="${esc(nx.id)}">دفعت</button></div>`:`<div class="gstat">خلّصت التقسيط 🎉</div>`}
    <details class="inst-all"><summary>كل الأقساط</summary>${rows}</details></div>`;
}
function renderInsts(){
  const box=$('#obInsts'); if(!box) return;
  if(!S.insts.length){box.innerHTML='<div class="empty"><b>مفيش تقسيط</b>دوس + وسجّل أي حاجة اشتريتها بالتقسيط أو قرض أقساط، عشان تتابع كل قسط وميعاده.</div>';return}
  const mk=monKey(Date.now()), cur=instMonth(mk), late=instLate();
  let up=''; for(let i=1;i<=6;i++){const m=addMonths(mk,i), x=instMonth(m); if(x.rem>0) up+=`<div class="mny-acc"><span>${esc(monthName(m))}</span><b>${money(x.rem)} ${CS()}</b></div>`}
  let h=`<div class="card mny"><div class="card-h"><h3>أقساط الشهر ده</h3><b>${money(cur.tot)} ${CS()}</b></div><div class="mny-split"><div><small>دفعت</small><b>${money(r2(cur.tot-cur.rem))} ${CS()}</b></div><div><small>فاضل</small><b>${money(cur.rem)} ${CS()}</b></div></div>`
    +(late>0?`<p class="hint" style="margin:8px 0 0;color:var(--bad)">متأخر من شهور فاتت: ${fmt(late)} ${CS()}</p>`:'')
    +(up?`<p class="acc-sub">الشهور الجاية (الباقي)</p>${up}`:'')+'</div>';
  const act=S.insts.filter(p=>instRemSum(p)>EPS), done=S.insts.filter(p=>instRemSum(p)<=EPS);
  h+=act.map(instCard).join('');
  if(done.length) h+=`<details class="closed-list"><summary>خلصت (${done.length})</summary>${done.map(instCard).join('')}</details>`;
  box.innerHTML=h;
}

