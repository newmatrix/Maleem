/* ===== Obligations: debts & gam'eyas ===== */
let obTab='debts', dueNotifItems=[];
const todayStart=()=>{const t=new Date();return new Date(t.getFullYear(),t.getMonth(),t.getDate()).getTime()};
const dkToTs=dk=>{const [y,m,d]=dk.split('-').map(Number);return new Date(y,m-1,d).getTime()};
const diffDays=dk=>Math.round((dkToTs(dk)-todayStart())/864e5);
const relDay=n=> n<0? 'متأخر '+daysTxt(-n) : n===0?'النهارده': n===1?'بكرة': 'بعد '+daysTxt(n);
const dueCls=n=> n<0?'late': n<=2?'soon':'';
const addMonths=(mk,i)=>{const [y,m]=mk.split('-').map(Number);return monKey(new Date(y,m-1+i,1))};
const shortDate=ts=>{const d=new Date(ts);return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`};
const dkToDMY=dk=>{const [y,m,d]=dk.split('-');return `${d}/${m}/${y}`};
const mkToMY=mk=>{const [y,m]=mk.split('-');return `${m}/${y}`};
function parseDMY(v){const m=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v.trim()); if(!m) return undefined;
  const d=+m[1], mo=+m[2], y=+m[3]; if(y<2000||y>2100) return undefined;
  const dt=new Date(y,mo-1,d); if(dt.getMonth()!==mo-1||dt.getDate()!==d) return undefined; return dayKey(dt)}
function parseMY(v){const m=/^(\d{1,2})\/(\d{4})$/.exec(v.trim()); if(!m) return undefined; const mo=+m[1], y=+m[2]; if(mo<1||mo>12||y<2000||y>2100) return undefined; return `${y}-${pad(mo)}`}
function cleanMoney(v){
  if(/[\-−–]/.test(v)) return "";
  v=v.replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/(\d)[,،](?=\d{3}(?!\d))/g,'$1').replace(/[٫,،]/g,'.').replace(/[^0-9.]/g,'');
  const p=v.split('.'); if(p.length>2) v=p[0]+'.'+p.slice(1).join('');
  let [i,d]=v.split('.'); i=(i||'').replace(/^0+(?=\d)/,'').slice(0,9);
  return d!==undefined? (i||'0')+'.'+d.slice(0,2) : i;
}
function bindMoney(el,box){el.addEventListener('input',()=>{if(/[\-−–]/.test(el.value))toast(TX('المبلغ السالب غير مسموح. اكتب مبلغًا موجبًا'));const v=cleanMoney(el.value);if(el.value!==v)el.value=v;box&&box.classList.remove('err')});
  el.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();el.blur()}})}
const debtPaid=x=>r2((x.payments||[]).reduce((a,p)=>a+p.amount,0));
const debtAdded=x=>r2((x.adds||[]).reduce((a,p)=>a+p.amount,0));
const debtTotal=x=>r2(x.amount+debtAdded(x));
const debtRem=x=>Math.max(0,Math.round((debtTotal(x)-debtPaid(x))*100)/100);
const openSheetEl=id=>{$('#scrim').classList.add('open');$('#'+id).classList.add('open')};
function ensureGamCat(){
  if(CAT.gam) return;
  const i=S.cats.findIndex(c=>c.id==='other');
  S.cats.splice(i<0?S.cats.length:i,0,{id:'gam',name:'جمعية',e:'🤝',c:'#0E7490'}); syncCats();
}
/* shares: the months this person gets paid (one per share), what he pays each month (inst x shares), and which payouts he already got */
function gamTurns(g){let t=[...new Set((Array.isArray(g.turns)?g.turns:[]).map(Number).filter(n=>Number.isInteger(n)&&n>=1&&n<=g.members))]; if(!t.length) t=[Math.min(Math.max(1,+g.turn||1),g.members)]; return t.sort((a,b)=>a-b)}
function gamShares(g){return gamTurns(g).length}
function gamMonthly(g){return r2(g.inst*gamShares(g))}
function gamRecvd(g,t){return g.recvT&&typeof g.recvT==='object'? !!g.recvT[t] : g.received===true}
function gamSetRecv(g,t,on){
  if(!g.recvT||typeof g.recvT!=='object'){g.recvT={}; if(g.received===true) gamTurns(g).forEach(x=>{g.recvT[x]={ts:g.created||Date.now()}})}
  if(on) g.recvT[t]={ts:Date.now()}; else delete g.recvT[t];
  g.received=gamTurns(g).every(x=>g.recvT[x]);
}
const GAM_ORD=['الأول','التاني','التالت','الرابع','الخامس'];
function gamInfo(g){
  const cur=monKey(Date.now()), last=addMonths(g.start,g.members-1), turnMk=addMonths(g.start,gamTurns(g)[0]-1);
  const paidN=Object.keys(g.paid||{}).filter(k=>k>=g.start&&k<=last).length, active= cur>=g.start && cur<=last;
  return {cur,last,turnMk,paidN,active,ended:cur>last,notStarted:cur<g.start,total:g.inst*g.members};
}

/* --- render --- */
/* records another space member shared with you: they are listed with the owner's name, but they are not
   *your* debts, so they don't count in your totals and don't send you reminders */
function isMine(x){return !x||!x.by||x.by===spMe()}
function debtCur(x){return x.cur||S.currency}
function debtSym(x){return curSym(debtCur(x))}
function debtToAcc(v,a,cur){const k=cur===a.cur?1:rateFor(cur,a.cur);return k>0?Math.max(0.01,r2(v*k)):null}
function debtTotalsHtml(rows){const totals={};rows.forEach(x=>{const c=debtCur(x);totals[c]=(totals[c]||0)+debtRem(x)});return Object.keys(totals).length?Object.entries(totals).map(([c,v])=>`<span>${money(v)} <small>${esc(curSym(c))}</small></span>`).join(''):`<span>${money(0)} <small>${CS()}</small></span>`}
function renderDebts(){
  paintObFixed();
  const act=S.debts.filter(x=>!x.closed);
  const inL=act.filter(x=>x.dir==='in'&&isMine(x)), outL=act.filter(x=>x.dir==='out'&&isMine(x));
  $('#sumIn').innerHTML=debtTotalsHtml(inL);
  $('#sumOut').innerHTML=debtTotalsHtml(outL);
  $('#sumInN').textContent=inL.length? inL.length+' '+(inL.length===1?'شخص':inL.length<=10?'أشخاص':'شخص') : 'مفيش';
  $('#sumOutN').textContent=outL.length? outL.length+' '+(outL.length===1?'شخص':outL.length<=10?'أشخاص':'شخص') : 'مفيش';
  document.querySelectorAll('#obSeg button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.ob===obTab));
  $('#obDebts').hidden=obTab!=='debts'; $('#obGams').hidden=obTab!=='gams'; $('#obInsts').hidden=obTab!=='insts'; document.querySelector('.ob-sum').hidden=obTab!=='debts';
  $('#fab').setAttribute('aria-label', tab==='debts'? (obTab==='gams'?'إضافة جمعية':obTab==='insts'?'إضافة تقسيط':'إضافة سلفة') : 'إضافة مصروف');

  const sorted=act.slice().sort((a,b)=>(a.due?dkToTs(a.due):9e15)-(b.due?dkToTs(b.due):9e15)||b.created-a.created);
  const closed=S.debts.filter(x=>x.closed).sort((a,b)=>(b.closedAt||0)-(a.closedAt||0));
  let h= sorted.length? sorted.map(debtCard).join('') : `<div class="empty"><b>مفيش سلف مفتوحة</b>دوس + وسجل أي فلوس ليك عند حد أو عليك لحد.</div>`;
  if(closed.length) h+=`<details class="closed-list"><summary>اتقفلت (${closed.length})</summary>${closed.map(debtCard).join('')}</details>`;
  $('#obDebts').innerHTML=h;

  try{renderInsts()}catch(e){console.error(e)}
  $('#obGams').innerHTML= S.gams.length? gamSummary()+S.gams.map(gamCard).join('') : `<div class="empty"><b>مفيش جمعيات</b>دوس + وضيف الجمعية اللي داخل فيها عشان تتابع أقساطها ودورك.</div>`;
}
function debtCard(x){
  const rem=debtRem(x), paid=debtPaid(x), n=x.due?diffDays(x.due):null;
  return `<div class="dc ${x.dir}${x.closed?' closed':''}${x.id===justAddedOb?' new':''}">
    <div class="av">${esc((x.person.trim()[0]||'؟'))}</div>
    <div class="body">
      <div class="top"><b><span data-notr dir="auto">${esc(x.person)}</span>${spByTag(x)}</b><span class="dir">${isMine(x)?(x.dir==='in'?'ليك':'عليك'):(x.dir==='in'?'ليه':'عليه')}</span></div>
      <div class="arow">
        <div class="amt">${x.closed? money(debtTotal(x)) : money(rem)} <small>${debtSym(x)}</small>${!x.closed&&paid>0?` <small>من ${money(debtTotal(x))}</small>`:''}</div>
      <div class="side">
        <div class="btnrow"><button class="paybtn plus" data-debtadd="${esc(x.id)}" aria-label="${x.dir==='in'?'زوّد المبلغ اللي ليك عند ':'زوّد المبلغ اللي عليك لـ '}${esc(x.person)}">+</button>${x.closed?'':`<button class="paybtn" data-debtpay="${esc(x.id)}">${x.dir==='in'?'استلمت':'سددت'}</button>`}</div>
        <button class="more" data-obmore="debt:${esc(x.id)}" aria-label="خيارات" aria-haspopup="menu" aria-expanded="false">${ICON_MORE}</button>
      </div>
      </div>
      ${!x.closed&&paid>0?`<div class="mini"><i style="width:${Math.min(100,paid/debtTotal(x)*100)}%"></i></div>`:''}
      <div class="meta">${x.closed?`<span class="due">اتقفلت ${shortDate(x.closedAt||Date.now())}</span>`: n!==null?`<span class="due ${dueCls(n)}">${relDay(n)}</span>`:''}${x.note?`<span class="nt" data-notr dir="auto">${esc(x.note)}</span>`:''}${(x.adds||[]).length?`<span class="nt">+${fmt(debtAdded(x))} زيادة</span>`:''}${(x.adds||[]).length||(x.payments||[]).length?`<button type="button" class="dlog" data-debtlog="${esc(x.id)}">السجل</button>`:''}${x.dir==='in'&&!x.closed&&isMine(x)?`<button type="button" class="dlog" data-debtremind="${esc(x.id)}">ذكّره</button>`:''}</div>
    </div>
  </div>`;
}
/* the totals across all the associations this person is in (only his own, not other members' shared ones) */
function gamSummary(){
  const mine=S.gams.filter(isMine); if(!mine.length) return '';
  let pay=0,paid=0,due=0,get=0,got=0;
  mine.forEach(g=>{const I=gamInfo(g), mo=gamMonthly(g), T=gamTurns(g), pot=r2(g.inst*g.members);
    pay+=mo*g.members; paid+=mo*I.paidN;
    if(I.active&&!(g.paid||{})[I.cur]) due+=mo;
    get+=pot*T.length; got+=pot*T.filter(t=>gamRecvd(g,t)).length});
  pay=r2(pay);paid=r2(paid);due=r2(due);get=r2(get);got=r2(got);
  const cell=(l,v,c)=>`<div><small>${l}</small><b${c?` style="color:${c}"`:''}>${money(v)}</b></div>`, cs=CS();
  return `<div class="gsum"><div class="gsum-h"><b>ملخص جمعياتك</b><span>${mine.length} ${mine.length===1?'جمعية':mine.length<=10?'جمعيات':'جمعية'} · ${cs}</span></div>
    <div class="gsum-t">اللي بتدفعه</div>
    <div class="gsum-g">${cell('إجمالي الأقساط',pay)}${cell('دفعت',paid,'var(--ok)')}${cell('باقي عليك',r2(pay-paid))}</div>
    <div class="gsum-due"><span>مطلوب منك الشهر ده</span><b>${money(due)} <small>${cs}</small></b></div>
    <div class="gsum-t">اللي بتقبضه</div>
    <div class="gsum-g">${cell('إجمالي القبض',get)}${cell('استلمت',got,'var(--ok)')}${cell('باقيلك تقبضه',r2(get-got))}</div></div>`;
}
function gamCard(g){
  const I=gamInfo(g), T=gamTurns(g), K=T.length;
  let dots='';
  for(let i=0;i<g.members;i++){
    const mk=addMonths(g.start,i), paid=!!(g.paid||{})[mk];
    dots+=`<button class="md${paid?' paid':''}${mk===I.cur?' cur':''}${T.includes(i+1)?' turn':''}" data-gdot="${esc(g.id)}|${esc(mk)}" ${mk>I.cur?'disabled':''} title="${monthName(mk)}" aria-label="${monthName(mk)}${paid?' مدفوع':''}">${i+1}</button>`;
  }
  const curPaid=!!(g.paid||{})[I.cur];
  const payDate=(()=>{const [y,m]=I.cur.split('-').map(Number);return new Date(y,m-1,Math.min(g.day,daysIn(I.cur)))})();
  let stat=`دفعت ${I.paidN} من ${g.members} ${g.members<=10?'أقساط':'قسط'}`;
  if(I.notStarted) stat+=` · بتبدأ ${monthName(g.start)}`;
  else if(I.ended) stat+=' · الجمعية خلصت';
  else if(!curPaid) stat+=` · قسط ${monthOnly(I.cur)} يوم ${shortDate(payDate)}`;
  let foot='';
  const turnNow=I.turnMk===I.cur;
  const turnBtn= gamRecvd(g,T[0])? `<span class="ok-badge">قبضتها ✓</span>` : (I.turnMk<=I.cur? `<button class="btn sm goldb" data-grecv="${esc(g.id)}|${T[0]}">قبضت الجمعية</button>`:'');
  const payBtn= I.active&&!curPaid? `<button class="btn sm teal" data-gpay="${esc(g.id)}">دفعت قسط ${monthOnly(I.cur)}</button>` : '';
  foot=`<div class="gfoot"><div class="t"><small>${gamRecvd(g,T[0])?'قبضت':turnNow?'دورك الشهر ده':'دورك تقبض'}</small><b>${monthName(I.turnMk)}</b> <small style="display:inline">· ${fmt(I.total)} ${CS()}</small></div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">${payBtn}${turnBtn}</div></div>`;
  if(K>1){ /* several shares: one row per payout, and the monthly payment button on its own */
    foot=(payBtn?`<div class="gfoot" style="justify-content:flex-end">${payBtn}</div>`:'')+T.map((t,i)=>{const mk=addMonths(g.start,t-1), done=gamRecvd(g,t);
      const btn= done? `<span class="ok-badge">قبضتها ✓</span>` : (mk<=I.cur? `<button class="btn sm goldb" data-grecv="${esc(g.id)}|${t}">قبضت الجمعية</button>`:'');
      return `<div class="gfoot"><div class="t"><small>${done?'قبضت':mk===I.cur?'دورك الشهر ده':'دورك تقبض'} · الفرد ${GAM_ORD[i]}</small><b>${monthName(mk)}</b> <small style="display:inline">· ${fmt(I.total)} ${CS()}</small></div><div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">${btn}</div></div>`}).join('');
  }
  return `<div class="gc${g.id===justAddedOb?' new':''}">
    <div class="gh"><div class="tile">🤝</div><div class="body"><b>${esc(g.name)}${spByTag(g)}</b><small>${K>1?`قسط ${fmt(gamMonthly(g))} ${CS()} كل شهر · ${K===2?'فردين':K+' أفراد'}`:`قسط ${fmt(g.inst)} ${CS()} كل شهر`} · ${g.members} ${g.members<=10?'شهور':'شهر'}</small></div>
      <button class="more" data-obmore="gam:${esc(g.id)}" aria-label="خيارات" aria-haspopup="menu" aria-expanded="false">${ICON_MORE}</button></div>
    <div class="months">${dots}</div>
    <div class="glegend"><span><i style="background:#0E7490"></i>مدفوع</span><span><i style="border:1.5px dashed var(--muted)"></i>لسه</span><span style="color:var(--gold)">★ <span style="color:var(--muted)">دورك</span></span></div>
    <div class="gstat">${stat}</div>
    ${foot}
  </div>`;
}

/* --- upcoming (home) & reminders --- */
function dueItems(range){
  const out=[];
  S.debts.filter(x=>!x.closed&&x.due&&isMine(x)).forEach(x=>{const n=diffDays(x.due); if(n<=range) out.push({id:'d:'+x.id,n,
    icon:x.dir==='in'?'📥':'💸', title:x.dir==='in'?`${x.person} يرجعلك فلوس`:`ترد لـ ${x.person}`, amount:debtRem(x),cur:debtSym(x), when:relDay(n), cls:dueCls(n), rcv:x.dir==='in'})});
  S.gams.filter(isMine).forEach(g=>{const I=gamInfo(g); if(!I.active) return;
    const [y,m]=I.cur.split('-').map(Number), dk=dayKey(new Date(y,m-1,Math.min(g.day,daysIn(I.cur)))), n=diffDays(dk);
    if(!(g.paid||{})[I.cur] && n<=range) out.push({id:'g:'+g.id+':'+I.cur,n,icon:'🤝',title:`قسط ${g.name}`,amount:gamMonthly(g),when:relDay(n),cls:dueCls(n),gpay:g.id});
    gamTurns(g).forEach(t=>{ if(addMonths(g.start,t-1)===I.cur && !gamRecvd(g,t) && n<=range) out.push({id:'t:'+g.id+':'+t,n,icon:'🎉',title:`دورك تقبض ${g.name}`,amount:I.total,when:relDay(n),cls:'soon',rcv:true}) });
  });
  S.insts.forEach(p=>p.items.forEach(it=>{ if(itemDone(it)) return; const n=diffDays(it.due); if(n<=range) out.push({id:'i:'+it.id,n,icon:'💳',title:`قسط ${p.name}`,amount:itemRem(it),when:relDay(n),cls:dueCls(n),ipay:it.id})}));
  fixedDueItems(range).forEach(x=>out.push(x));
  S.plans.forEach(p=>{const n=diffDays(p.due); if(n>range) return; const c=CAT[p.cat]||CAT.other;
    out.push({id:'p:'+p.id,n,icon:c.e,title:p.name,amount:+p.amount||0,when:relDay(n),cls:dueCls(n),ppay:p.id})});
  S.iplans.forEach(p=>{const n=diffDays(p.due); if(n>range) return;
    out.push({id:'ip:'+p.id,n,icon:'💰',title:`هتستلم ${p.name}`,amount:+p.amount||0,when:relDay(n),cls:dueCls(n),ipin:p.id,rcv:true})});
  return out.sort((a,b)=>a.n-b.n);
}
/* a way into the fixed expenses and subscriptions from the التزاماتي tab (they live in أنا ← المصاريف الثابتة والجاية) */
function paintObFixed(){ const a=S.fixed.length, b=S.plans.length, c=S.iplans.length;
  $('#obFixedSub').textContent= a||b||c? [a?`${a} ثابتة`:'',b?`${b} جاية`:'',c?`${c} دخل جاي`:''].filter(Boolean).join(' · ') : 'الإيجار والنت والاشتراكات اللي بتتكرر'}
$('#obFixedGo').onclick=()=>{go('me');meGo('fixed')};
function renderUpcoming(){
  const it=dueItems(3);
  $('#upcoming').innerHTML= it.length? `<div class="upc"><div class="upc-h"><b>مواعيد قريبة</b><button data-goob="">كل الالتزامات</button></div>
    ${it.slice(0,4).map(x=>`<div class="ur"${x.fpay||x.ppay||x.ipin?'':` data-goob="${x.ipay?'insts':x.gpay||x.id.startsWith('t:')?'gams':'debts'}"`}><div class="ui">${esc(x.icon)}</div><div class="ut">${esc(x.title)}<small><span class="due ${x.cls}">${x.when}</span></small></div>${x.amount? `<span class="ua">${money(x.amount)} <small style="font-weight:500;color:var(--muted)">${x.cur||CS()}</small></span>`:''}${x.gpay?`<button class="paybtn" style="--cc:#0E7490" data-gpay="${esc(x.gpay)}">دفعت</button>`:''}${x.ipay?`<button class="paybtn" style="--cc:#7C3AED" data-ipay="${esc(x.ipay)}">دفعت</button>`:''}${x.fpay?`<button class="paybtn" style="--cc:var(--brand)" data-fpay="${esc(x.fpay)}">سجّل</button>`:''}${x.ppay?`<button class="paybtn" style="--cc:var(--brand)" data-ppay="${esc(x.ppay)}">سجّل</button>`:''}${x.ipin?`<button class="paybtn" style="--cc:#16A34A" data-ipin="${esc(x.ipin)}">استلمت</button>`:''}</div>`).join('')}</div>` : '';
}
function checkDue(){
  if(!S.dueRemind) return;
  const tk=dayKey(Date.now()), seen=S.dueSeen[tk]||[];
  const fresh=dueItems(1).filter(x=>!seen.includes(x.id));
  if(!fresh.length) return;
  S.dueSeen={[tk]:seen.concat(fresh.map(x=>x.id))}; save();
  dueNotifItems=fresh; showNotif('due');
}

/* --- debt sheet --- */
let debtEdit=null, debtDirSel='in', payFor=null, justAddedOb=null, debtCurSel='EGP';
function convertDebt(x,cur,k){const d=JSON.parse(JSON.stringify(x)),wasPaid=debtRem(x)<=0;d.cur=cur;[d,...d.payments,...(d.adds||[])].forEach(r=>r.amount=r2(r.amount*k));if(wasPaid&&d.payments.length){const last=d.payments[d.payments.length-1];last.amount=r2(last.amount+debtTotal(d)-debtPaid(d))}return d}
function paintDebtCurrency(){
 const x=debtEdit&&S.debts.find(d=>d.id===debtEdit),changed=x&&debtCur(x)!==debtCurSel;
 $('#debtCurPick').textContent=TX(CUR_NAME(debtCurSel)+' ('+curSym(debtCurSel)+')')+' ⌄';$('#debtAmtCur').textContent=curSym(debtCurSel);$('#debtConvert').hidden=!changed;
 if(changed){$('#debtRateLabel').textContent='1 '+debtCur(x)+' = '+debtCurSel;const k=parseFloat($('#debtRate').value);$('#debtConvertResult').textContent=k>0?TX('المتبقي بعد التحويل')+': '+fmt(debtRem(convertDebt(x,debtCurSel,k)))+' '+curSym(debtCurSel):TX('اكتب سعر التحويل')}
}
function debtAccountPreview(prefix){const d=prefix==='pay'?S.debts.find(x=>x.id===payFor):prefix==='dAdd'?S.debts.find(x=>x.id===addFor):null,cur=d?debtCur(d):debtCurSel,a=ACC($('#'+prefix+'Acc').value),v=parseFloat($('#'+prefix+'Amt').value);const out=$('#'+prefix+'Fx');out.textContent='';if(a&&a.cur!==cur&&v>0){const amt=debtToAcc(v,a,cur);out.textContent=amt==null?TX('مفيش سعر تحويل متاح'):TX('المبلغ في الحساب')+': '+fmt(amt)+' '+curSym(a.cur)+' · 1 '+cur+' = '+rateFor(cur,a.cur)+' '+a.cur}}
['debt','pay','dAdd'].forEach(p=>{$('#'+p+'Amt').addEventListener('input',()=>debtAccountPreview(p));$('#'+p+'Acc').addEventListener('change',()=>debtAccountPreview(p))});
function closeDebtCurrency(){$('#debtCurMenu').classList.remove('open');$('#debtCurPick').setAttribute('aria-expanded','false')}
$('#debtCurPick').onclick=e=>{e.stopPropagation();const m=$('#debtCurMenu');if(m.classList.contains('open')){closeDebtCurrency();return}m.innerHTML=CURRENCIES.map(c=>`<button type="button" role="menuitemradio" data-cur="${c.id}" aria-checked="${c.id===debtCurSel}"><span>${esc(TX(c.n))}</span><small dir="ltr">${c.id} · ${esc(c.s)}</small></button>`).join('');m.classList.add('open');e.currentTarget.setAttribute('aria-expanded','true');const r=e.currentTarget.getBoundingClientRect();m.style.left=Math.max(8,Math.min(r.left,innerWidth-m.offsetWidth-8))+'px';m.style.top=Math.max(8,Math.min(r.bottom+6,innerHeight-m.offsetHeight-8))+'px'};
$('#debtCurMenu').onclick=e=>{const b=e.target.closest('[data-cur]');if(!b)return;debtCurSel=b.dataset.cur;const x=debtEdit&&S.debts.find(d=>d.id===debtEdit);if(x){const k=debtCur(x)===debtCurSel?1:rateFor(debtCur(x),debtCurSel);$('#debtRate').value=k>0?String(k):'';$('#debtAmt').value=k>0?String(r2(x.amount*k)):''}closeDebtCurrency();paintDebtCurrency();debtAccountPreview('debt')};
$('#debtRate').oninput=()=>{const x=debtEdit&&S.debts.find(d=>d.id===debtEdit),k=parseFloat($('#debtRate').value);if(x)$('#debtAmt').value=k>0?String(r2(x.amount*k)):'';paintDebtCurrency();debtAccountPreview('debt')};
document.addEventListener('click',e=>{if(!e.target.closest('#debtCurPick,#debtCurMenu'))closeDebtCurrency()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDebtCurrency()});
window.addEventListener('resize',closeDebtCurrency);

bindMoney($('#debtAmt'),$('#debtAmtBox')); bindMoney($('#payAmt'),$('#payAmtBox')); bindMoney($('#gamAmt'),$('#gamAmtBox'));
function paintDir(){document.querySelectorAll('#debtDir button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.dir===debtDirSel))}
$('#debtDir').onclick=e=>{const b=e.target.closest('[data-dir]');if(b){debtDirSel=b.dataset.dir;paintDir();paintDebtAcc()}};
const accOptsHtml=sel=>'<option value="">من غير حساب</option>'+S.accounts.map(a=>`<option value="${esc(a.id)}"${a.id===sel?' selected':''}>${esc(accDisp(a))} (${esc(curSym(a.cur))})</option>`).join('');
const accLabFor=dir=>dir==='in'?'الفلوس خرجت من حساب':'الفلوس دخلت على حساب';
function paintDebtAcc(){ $('#debtAccRow').hidden=!S.accounts.length; $('#debtAccLab').firstChild.textContent=accLabFor(debtDirSel) }
function openDebtSheet(id,pre){
  const x=id?S.debts.find(d=>d.id===id):null; debtEdit=x?id:null;
  debtCurSel=x?debtCur(x):S.currency;$('#debtRate').value='';paintDebtCurrency();
  debtDirSel=x?x.dir:'in'; paintDir();
  $('#debtAcc').innerHTML=accOptsHtml(x&&ACC(x.acc)?x.acc:''); paintDebtAcc();
  $('#debtTitle').textContent=x?'تعديل السلفة':'سلفة جديدة';
  $('#debtSave').textContent=x?'حفظ التعديل':'حفظ';
  $('#debtPerson').value=x?x.person:''; $('#debtAmt').value=x?String(x.amount):'';
  $('#debtDue').value=x&&x.due?dkToDMY(x.due):''; $('#debtDue').classList.remove('err'); $('#debtNote').value=x?(x.note||''):'';
  $('#debtErr').textContent=''; $('#debtAmtBox').classList.remove('err');
  dCap=null; // money that went out in a captured notification: you lent it to someone (round 47)
  if(!x&&pre){ debtDirSel=pre.dir==='out'?'out':'in'; paintDir(); $('#debtAcc').innerHTML=accOptsHtml(ACC(pre.acc)?pre.acc:''); paintDebtAcc();
    if(pre.amount>0) $('#debtAmt').value=String(pre.amount); if(pre.cap){ dCap={id:pre.cap,ts:+pre.ts||0}; $('#debtTitle').textContent='سلّفتها لمين؟' } }
  debtAccountPreview('debt');openSheetEl('debtSheet'); $('#debtPerson').focus({preventScroll:true});
}
$('#debtCancel').onclick=closeSheets;
$('#debtSave').onclick=()=>{
  const person=$('#debtPerson').value.trim(), amount=r2(parseFloat($('#debtAmt').value)), dueTxt=$('#debtDue').value.trim(), note=$('#debtNote').value.trim();
  if(!person){$('#debtErr').textContent='اكتب اسم الشخص';$('#debtPerson').focus();return}
  if(!(amount>0)){$('#debtErr').textContent='اكتب المبلغ';$('#debtAmtBox').classList.add('err');$('#debtAmt').focus();return}
  const due= dueTxt? parseDMY(dueTxt) : null;
  if(due===undefined){$('#debtErr').textContent='اكتب التاريخ كده: يوم/شهر/سنة، مثلاً '+shortDate(Date.now()+7*864e5);$('#debtDue').classList.add('err');$('#debtDue').focus();return}
  const old=debtEdit&&S.debts.find(d=>d.id===debtEdit), changed=old&&debtCur(old)!==debtCurSel, k=changed?parseFloat($('#debtRate').value):1;
  if(!(k>0)||!Number.isFinite(k)||!(amount<MAXAMT)||(changed&&[old,...old.payments,...(old.adds||[])].some(v=>!(r2(v.amount*k)>=0.01&&r2(v.amount*k)<MAXAMT)))){$('#debtErr').textContent='راجع سعر التحويل والمبلغ';return}
  const converted=changed?convertDebt(old,debtCurSel,k):null;
  if(converted&&[converted,...converted.payments,...(converted.adds||[])].some(r=>!(r.amount>=0.01&&r.amount<MAXAMT))){$('#debtErr').textContent='راجع سعر التحويل والمبلغ';return}
  if(old&&r2((converted||old).payments.reduce((t,p)=>t+p.amount,0))>r2(amount+debtAdded(converted||old))){$('#debtErr').textContent='المبلغ أقل من الدفعات المسجلة';return}
  const ac=S.accounts.length&&ACC($('#debtAcc').value)||null; let aa=null;
  if(ac){ const x0=debtEdit&&S.debts.find(d=>d.id===debtEdit);
    aa= x0&&x0.acc===ac.id&&x0.accAmt&&(converted||x0).amount===amount? x0.accAmt : debtToAcc(amount,ac,debtCurSel);
    if(aa==null){$('#debtErr').textContent='الحساب ده بعملة تانية ومفيش سعر صرف متاح دلوقتي. اختار حساب بنفس العملة، أو جرّب لما النت يشتغل'; ratesRefresh(false); return} }
  if(debtEdit){const x=S.debts.find(d=>d.id===debtEdit); if(converted)Object.assign(x,converted);Object.assign(x,{person,amount,cur:debtCurSel,due,note,dir:debtDirSel}); if(ac){x.acc=ac.id;x.accAmt=aa}else{delete x.acc;delete x.accAmt}
    x.closed= debtPaid(x)>=debtTotal(x); if(x.closed&&!x.closedAt) x.closedAt=Date.now(); if(!x.closed) x.closedAt=null; }
  else{const id=uid(); justAddedOb=id; S.debts.push({id,dir:debtDirSel,person,amount,cur:debtCurSel,due,note,created:dCap&&dCap.ts>0?Math.min(dCap.ts,Date.now()):Date.now(),...(ac?{acc:ac.id,accAmt:aa}:{}),payments:[],adds:[],closed:false})}
  if(!debtEdit&&dCap) S.capQ=(S.capQ||[]).filter(q=>q.id!==dCap.id);
  const was=debtEdit; save();closeSheets();renderAll();justAddedOb=null;
  toast(was?'اتعدلت السلفة': debtDirSel==='in'? `اتسجل إن ${person} عليه ${fmt(amount)} ${curSym(debtCurSel)}` : `اتسجل إنك عليك ${fmt(amount)} ${curSym(debtCurSel)} لـ ${person}`);
  setTimeout(checkDue,500);
};
function deleteDebt(id){
  const i=S.debts.findIndex(d=>d.id===id); if(i<0) return;
  if(debtAccRows(S.debts[i]).some(p=>p.acc)){toast('السلفة دي مربوطة بحساب (هي أو زياداتها أو دفعاتها). فك الربط من «تعديل السلفة» واحذف الدفعات المربوطة من داخل «سدد/استلمت» الأول عشان الأرصدة متتلخبطش',null,null,7000);return}
  const [x]=S.debts.splice(i,1); const tid=trashPut('debt',x,i); save();renderAll();
  toast('اتحذفت سلفة '+x.person,'تراجع',()=>{trashDel(tid);S.debts.splice(i,0,x);save();renderAll()},3000);
}
function openPaySheet(id,pre){
  const x=S.debts.find(d=>d.id===id); if(!x) return; payFor=id;
  const rem=debtRem(x);
  $('#payAmtCur').textContent=debtSym(x);
  if(pre&&debtCur(x)!==S.currency){const k=rateFor(S.currency,debtCur(x));pre=k>0?{...pre,amount:r2(pre.amount*k)}:null}
  $('#payTitle').textContent= x.dir==='in'? `استلمت من ${x.person}` : `سددت لـ ${x.person}`;
  $('#payInfo').textContent=`فاضل ${fmt(rem)} ${debtSym(x)} من ${fmt(debtTotal(x))} ${debtSym(x)}`;
  $('#payAll').textContent=`المبلغ كله (${fmt(rem)} ${debtSym(x)})`;
  $('#payAmt').value=''; $('#payErr').textContent=''; $('#payAmtBox').classList.remove('err');
  $('#payAccRow').hidden=!S.accounts.length; $('#payAccLab').textContent= x.dir==='in'?'استلمته على':'اتدفع من';
  $('#payAcc').innerHTML='<option value="">من غير حساب</option>'+S.accounts.map(a=>`<option value="${esc(a.id)}">${esc(accDisp(a))} (${esc(curSym(a.cur))})</option>`).join(''); $('#payAcc').value=ACC(S.lastAcc)?S.lastAcc:'';
  $('#payHist').innerHTML=(x.payments||[]).slice().reverse().map(p=>`<li><span>${x.dir==='in'?'استلمت':'سددت'} ${fmt(p.amount)} ${debtSym(x)}${ACC(p.acc)?' · '+esc(ACC(p.acc).name):''}</span><span class="ipd">${shortDate(p.ts)}<button type="button" data-pdel="${esc(p.id)}">حذف</button></span></li>`).join('');
  payCap=null; // money that came in, in a captured notification: the person paid you back (round 47)
  if(pre){ if(pre.amount>0) $('#payAmt').value=String(Math.min(pre.amount,rem)); if(typeof pre.acc==='string') $('#payAcc').value=ACC(pre.acc)?pre.acc:'';
    if(pre.cap) payCap={id:pre.cap,ts:+pre.ts||0};
    if(pre.amount>rem+0.001) $('#payErr').textContent=`وصلك ${fmt(pre.amount)} والباقي على ${x.person} ${fmt(rem)} ${debtSym(x)} بس. الزيادة سجّلها دخل لوحدها`; }
  debtAccountPreview('pay');openSheetEl('paySheet'); $('#payAmt').focus({preventScroll:true});
}
$('#payAll').onclick=()=>{const x=S.debts.find(d=>d.id===payFor); if(x){$('#payAmt').value=String(debtRem(x));$('#paySave').click()}};
$('#payHist').onclick=e=>{
  const b=e.target.closest('[data-pdel]'); if(!b) return; const x=S.debts.find(d=>d.id===payFor); if(!x) return;
  const p=(x.payments||[]).find(q=>q.id===b.dataset.pdel); if(!p) return; const wasClosed=x.closed, was=x.closedAt;
  x.payments=x.payments.filter(q=>q.id!==p.id); if(debtRem(x)>0){x.closed=false;x.closedAt=null}
  save();renderAll();openPaySheet(x.id);
  toast('اتحذف السداد','تراجع',()=>{x.payments=(x.payments||[]).concat(p);x.closed=wasClosed;x.closedAt=was;save();renderAll()},4000);
};
$('#payCancel').onclick=closeSheets;
$('#paySave').onclick=()=>{
  const x=S.debts.find(d=>d.id===payFor); if(!x) return;
  const v=r2(parseFloat($('#payAmt').value)), rem=debtRem(x);
  if(!(v>0)){$('#payErr').textContent='اكتب المبلغ';$('#payAmtBox').classList.add('err');return}
  if(v>rem+0.001){$('#payErr').textContent=`المبلغ أكبر من الباقي (${fmt(rem)} ${debtSym(x)})`;$('#payAmtBox').classList.add('err');return}
  const ac=ACC($('#payAcc').value)||null; let aa=null;
  if(ac){aa=debtToAcc(v,ac,debtCur(x)); if(aa==null){$('#payErr').textContent='الحساب ده بعملة تانية ومفيش سعر صرف متاح دلوقتي. اختار حساب بنفس العملة، أو جرّب لما النت يشتغل'; ratesRefresh(false); return}}
  const pay={id:uid(),amount:v,ts:payCap&&payCap.ts>0?Math.min(payCap.ts,Date.now()):Date.now()}; if(ac){pay.acc=ac.id;pay.accAmt=aa} if(S.accounts.length) S.lastAcc=ac?ac.id:'';
  x.payments=(x.payments||[]).concat(pay);
  const undoCapture=payCap?(S.capQ||[]).find(q=>q.id===payCap.id):null;
  if(payCap) S.capQ=(S.capQ||[]).filter(q=>q.id!==payCap.id);
  const closedNow= debtRem(x)<=0; if(closedNow){x.closed=true;x.closedAt=Date.now()}
  save();closeSheets();renderAll();
  toast(closedNow? (x.dir==='in'?`${x.person} رجعلك كل الفلوس 🎉`:`خلصت اللي عليك لـ ${x.person} 🎉`) : `اتسجل ${fmt(v)} ${debtSym(x)} · فاضل ${fmt(debtRem(x))} ${debtSym(x)}`,'تراجع',()=>{
    x.payments=x.payments.filter(p=>p.id!==pay.id); if(undoCapture&&!(S.capQ||[]).some(q=>q.id===undoCapture.id)) S.capQ.unshift(undoCapture); x.closed=false; x.closedAt=null; save();renderAll()},3000);
};

/* --- adding to a debt, and the account (ledger) of one person --- */
let addFor=null;
bindMoney($('#dAddAmt'),$('#dAddAmtBox'));
const dWho=x=>x.dir==='in'?'ليك عنده':'عليك له';
function dAddPaint(){const x=S.debts.find(d=>d.id===addFor); if(!x) return; const v=parseFloat($('#dAddAmt').value)||0;
  $('#dAddAfter').textContent= v>0? `هيبقى ${dWho(x)} ${fmt(r2(debtRem(x)+v))} ${debtSym(x)}` : ''}
function openDebtAdd(id){
  const x=S.debts.find(d=>d.id===id); if(!x) return; addFor=id;
  $('#dAddAmtCur').textContent=debtSym(x);
  $('#dAddTitle').textContent= x.dir==='in'? `زوّد على ${x.person}` : `زوّد على اللي عليك لـ ${x.person}`;
  $('#dAddInfo').textContent= debtRem(x)>0? `${dWho(x)} دلوقتي ${fmt(debtRem(x))} ${debtSym(x)}` : 'السلفة دي كانت اتسددت، والزيادة هتفتحها من تاني';
  $('#dAddAccRow').hidden=!S.accounts.length; $('#dAddAccLab').textContent=accLabFor(x.dir); $('#dAddAcc').innerHTML=accOptsHtml('');
  $('#dAddAmt').value=''; $('#dAddNote').value=''; $('#dAddErr').textContent=''; $('#dAddAfter').textContent=''; $('#dAddAmtBox').classList.remove('err');
  debtAccountPreview('dAdd');openSheetEl('dAddSheet'); $('#dAddAmt').focus({preventScroll:true});
}
$('#dAddAmt').addEventListener('input',dAddPaint);
$('#dAddCancel').onclick=closeSheets;
$('#dAddSave').onclick=()=>{
  const x=S.debts.find(d=>d.id===addFor); if(!x) return;
  const v=parseFloat($('#dAddAmt').value), E=m=>{$('#dAddErr').textContent=m;$('#dAddAmtBox').classList.add('err')};
  if(!(v>0)) return E('اكتب المبلغ');
  if(!(v<MAXAMT)||debtTotal(x)+v>=MAXAMT) return E('المبلغ كبير قوي');
  if((x.adds||[]).length>=500) return E('وصلت للحد الأقصى من الزيادات على السلفة دي');
  const ac=S.accounts.length&&ACC($('#dAddAcc').value)||null; let aa=null;
  if(ac){aa=debtToAcc(v,ac,debtCur(x)); if(aa==null){$('#dAddErr').textContent='الحساب ده بعملة تانية ومفيش سعر صرف متاح دلوقتي. اختار حساب بنفس العملة، أو جرّب لما النت يشتغل'; ratesRefresh(false); return}}
  const a={id:uid(),amount:r2(v),ts:Date.now(),note:$('#dAddNote').value.trim().slice(0,60),...(ac?{acc:ac.id,accAmt:aa}:{})}, wasClosed=x.closed, was=x.closedAt;
  x.adds=(x.adds||[]).concat(a); if(x.closed){x.closed=false;x.closedAt=null}
  save();closeSheets();renderAll();
  toast(`اتزوّد ${fmt(a.amount)} ${debtSym(x)} · ${dWho(x)} دلوقتي ${fmt(debtRem(x))} ${debtSym(x)}`,'تراجع',()=>{x.adds=(x.adds||[]).filter(q=>q.id!==a.id);x.closed=wasClosed;x.closedAt=was;save();renderAll()},4000);
};
/* a polite message to the person who owes you, opened in WhatsApp (the contact is picked there); the text is also copied */
function debtRemind(id){
  const x=S.debts.find(d=>d.id===id); if(!x) return;
  const rem=debtRem(x), late=x.due&&diffDays(x.due)<0;
  const txt=`السلام عليكم يا ${x.person}، إزيك؟ 🌷\nبفكّرك بالمبلغ اللي ليا عندك: ${fmt(rem)} ${debtSym(x)}${x.due?(late?`، وكان ميعاده يوم ${dkToDMY(x.due)}`:`، وميعاده يوم ${dkToDMY(x.due)}`):''}.\nلو تقدر تجهّزه يبقى كتر خيرك، وربنا يكرمك 🙏`;
  copyText(txt);
  const a=document.createElement('a'); a.href='https://wa.me/?text='+encodeURIComponent(txt); a.target='_blank'; a.rel='noopener'; document.body.appendChild(a); a.click(); a.remove();
  toast('اتنسخت الرسالة وبنفتحلك واتساب، اختار '+x.person);
}
/* the ledger: first amount, additions and payments in time order, with the total and the rest after each line */
function debtLedger(x){
  const rows=[{k:'start',id:'start',ts:+x.created||0,amount:x.amount,acc:x.acc}];
  (x.adds||[]).forEach(a=>rows.push({k:'add',id:a.id,ts:a.ts,amount:a.amount,note:a.note,acc:a.acc}));
  (x.payments||[]).forEach(p=>rows.push({k:'pay',id:p.id,ts:p.ts,amount:p.amount,acc:p.acc}));
  rows.sort((a,b)=>(a.ts-b.ts)||(a.k==='start'?-1:b.k==='start'?1:0));
  let T=0,P=0; rows.forEach(r=>{ if(r.k==='pay') P+=r.amount; else T+=r.amount; r.total=r2(T); r.rem=r2(Math.max(0,T-P)) });
  return rows;
}
function openDebtLog(id){
  const x=S.debts.find(d=>d.id===id); if(!x) return;
  const cs=debtSym(x), cell=(l,v,c)=>`<div><small>${l}</small><b${c?` style="color:${c}"`:''}>${money(v)} <small>${cs}</small></b></div>`;
  $('#dLogTitle').textContent=`حساب ${x.person}`; $('#dLogTitle').dataset.id=id;
  $('#dLogSum').innerHTML=cell(x.dir==='in'?'إجمالي اللي ليك':'إجمالي اللي عليك',debtTotal(x))+cell('اتضاف عليها',debtAdded(x))+cell(x.dir==='in'?'استلمت':'سددت',debtPaid(x),'var(--ok)')+cell(x.dir==='in'?'باقيلك':'باقي عليك',debtRem(x));
  const lab={start:'السلفة الأصلية',add:'زيادة',pay:x.dir==='in'?'استلمت':'سددت'};
  const when=ts=>{if(!(ts>0)) return ''; const d=new Date(ts); return `${shortDate(ts)} · ${pad(d.getHours())}:${pad(d.getMinutes())}`};
  $('#dLogList').innerHTML=debtLedger(x).reverse().map(r=>`<li class="${r.k}"><div class="r1"><span>${lab[r.k]}${r.note?` <small>· ${esc(r.note)}</small>`:''}${ACC(r.acc)?` <small>· ${esc(ACC(r.acc).name)}</small>`:''}</span><span class="a">${r.k==='pay'?'−':'+'}${fmt(r.amount)} ${cs}</span></div>
    <div class="r2"><span>${when(r.ts)}${r.k==='add'?`<button type="button" data-adel="${esc(r.id)}">حذف</button>`:''}</span><span>الإجمالي ${fmt(r.total)} · المتبقي ${fmt(r.rem)}</span></div></li>`).join('');
  openSheetEl('dLogSheet');
}
$('#dLogClose').onclick=closeSheets;
$('#dLogList').onclick=e=>{
  const b=e.target.closest('[data-adel]'); if(!b) return; const x=S.debts.find(d=>d.id===$('#dLogTitle').dataset.id); if(!x) return;
  const a=(x.adds||[]).find(q=>q.id===b.dataset.adel); if(!a) return;
  if(r2(debtTotal(x)-a.amount)<r2(debtPaid(x))-0.001){toast('مينفعش تحذف الزيادة دي: اللي اتدفع بعد ما اتضافت أكبر من الإجمالي من غيرها',null,null,4500);return}
  const wasClosed=x.closed, was=x.closedAt;
  x.adds=x.adds.filter(q=>q.id!==a.id); if(debtRem(x)<=0&&!x.closed){x.closed=true;x.closedAt=Date.now()}
  save();renderAll();openDebtLog(x.id);
  toast('اتحذفت الزيادة','تراجع',()=>{x.adds=(x.adds||[]).concat(a);x.closed=wasClosed;x.closedAt=was;save();renderAll()},4000);
};

/* --- gam'eya sheet --- */
let gamEdit=null;
(function(){
  const ms=$('#gamMembers'); for(let i=2;i<=36;i++) ms.insertAdjacentHTML('beforeend',`<option value="${i}">${i} ${i<=10?'شهور':'شهر'}</option>`);
  const sh=$('#gamShares'); for(let i=1;i<=5;i++) sh.insertAdjacentHTML('beforeend',`<option value="${i}">${i===1?'فرد واحد':i===2?'فردين':i+' أفراد'}</option>`);
  const ds=$('#gamDay'); for(let i=1;i<=28;i++) ds.insertAdjacentHTML('beforeend',`<option value="${i}">يوم ${i}</option>`);
})();
const gamMonthOpts=n=>Array.from({length:n},(_,i)=>`<option value="${i+1}">الشهر الـ ${i+1}</option>`).join('');
const gamReadTurns=()=>[+$('#gamTurn').value, ...[...document.querySelectorAll('.gam-turn-x')].map(x=>+x.value)].filter(Boolean);
/* sel = the months already chosen (array) or one month number; one select per share, each share gets a different month */
function fillTurns(sel){
  const n=+$('#gamMembers').value, want=Array.isArray(sel)?sel:[sel||1];
  let k=+$('#gamShares').value||1; if(k>n){k=n;$('#gamShares').value=String(k)}
  const used=[], res=[];
  for(let i=0;i<k;i++){ let v=Math.min(+want[i]||0,n); if(!v||used.includes(v)){ v=1; while(used.includes(v)&&v<n) v++ } used.push(v); res.push(v) }
  const t=$('#gamTurn'); t.innerHTML=gamMonthOpts(n); t.value=String(res[0]);
  $('#gamTurnLbl').textContent= k>1? 'دور الفرد الأول' : 'دورك تقبض';
  $('#gamTurnsMore').innerHTML=res.slice(1).map((v,i)=>`<div class="pay-row"><div class="txt">دور الفرد ${GAM_ORD[i+1]}<small></small></div><select class="gam-turn-x" aria-label="دور الفرد ${GAM_ORD[i+1]}">${gamMonthOpts(n)}</select></div>`).join('');
  document.querySelectorAll('.gam-turn-x').forEach((x,i)=>{x.value=String(res[i+1])});
  $('#gamAmtLbl').textContent= k>1? 'قسط للفرد' : 'قسط';
  turnHint();
}
function turnHint(){
  const st=parseMY($('#gamStart').value)||monKey(Date.now());
  $('#gamTurnHint').textContent=monthName(addMonths(st,+$('#gamTurn').value-1));
  document.querySelectorAll('.gam-turn-x').forEach(x=>{const h=x.closest('.pay-row').querySelector('small'); if(h) h.textContent=monthName(addMonths(st,+x.value-1))});
  gamSumm();
}
function gamSumm(){
  const el=$('#gamSumm'), k=+$('#gamShares').value||1, inst=parseFloat($('#gamAmt').value), n=+$('#gamMembers').value;
  if(k<2||!(inst>0)){el.hidden=true;return}
  el.hidden=false; el.textContent=`هتدفع ${fmt(r2(inst*k))} ${CS()} كل شهر (${fmt(inst)} × ${k}) وتقبض ${fmt(r2(inst*n))} ${CS()} ${k===2?'مرتين':k+' مرات'}، يعني ${fmt(r2(inst*n*k))} ${CS()} إجمالي.`;
}
/* Inline wheel pickers: tapping the field opens day / month / year wheels under it (no keyboard, no typing the "/").
   The field keeps its text format (dd/mm/yyyy, mm/yyyy), so the existing checks on save stay the same. */
const WP_MONTHS=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
function wpCloseAll(){document.querySelectorAll('.wp').forEach(b=>{b.hidden=true});document.querySelectorAll('.wp-in.on').forEach(i=>i.classList.remove('on'))}
function wheelField(inp,box,withDay,yFrom,yTo){
  const years=[]; for(let y=yFrom;y<=yTo;y++) years.push(y);
  let cD=null,cM=null,cY=null;
  const cols=()=>[cD,cM,cY].filter(Boolean);
  const mkCol=(items,label)=>{const c=document.createElement('div');c.className='tp-col';c.setAttribute('role','listbox');c.setAttribute('aria-label',label);
    c.innerHTML=items.map(t=>`<div class="tp-it" role="option">${t}</div>`).join('');return c};
  const write=()=>{
    const m=tpMark(cM)+1, y=years[tpMark(cY)]; let v=`${pad(m)}/${y}`;
    if(cD){const d=Math.min(tpMark(cD)+1,new Date(y,m,0).getDate()); v=`${pad(d)}/${v}`}
    if(inp.value!==v){inp.value=v; inp.classList.remove('err'); inp.dispatchEvent(new Event('input')); inp.dispatchEvent(new Event('change'))}
  };
  const build=()=>{
    if(cM) return;
    if(withDay){cD=mkCol(Array.from({length:31},(_,i)=>i+1),'اليوم');box.appendChild(cD)}
    cM=mkCol(WP_MONTHS,'الشهر'); cY=mkCol(years,'السنة'); box.append(cM,cY);
    cols().forEach(el=>{
      el.addEventListener('scroll',()=>{tpMark(el);write()});
      el.addEventListener('click',e=>{const it=e.target.closest('.tp-it'); if(it) el.scrollTo({top:[...el.children].indexOf(it)*TP_H,behavior:'smooth'})});
    });
  };
  const set=()=>{
    const p=inp.value.split('/').map(Number), now=new Date();
    let d=now.getDate(), m=now.getMonth()+1, y=now.getFullYear();
    if(withDay&&p.length===3&&p[1]>=1&&p[1]<=12&&p[0]>=1&&p[0]<=31){d=p[0];m=p[1];y=p[2]}
    else if(!withDay&&p.length===2&&p[0]>=1&&p[0]<=12){m=p[0];y=p[1]}
    const yi=Math.max(0,Math.min(years.length-1,y-yFrom));
    const go=()=>{if(cD) cD.scrollTop=(d-1)*TP_H; cM.scrollTop=(m-1)*TP_H; cY.scrollTop=yi*TP_H; cols().forEach(tpMark)};
    go(); requestAnimationFrame(go); setTimeout(()=>{go();write()},80);
  };
  const open=()=>{wpCloseAll(); build(); box.hidden=false; inp.classList.add('on'); set(); setTimeout(()=>box.scrollIntoView({block:'nearest',behavior:'smooth'}),120)};
  inp.addEventListener('click',()=>{if(box.hidden) open(); else wpCloseAll()});
  inp.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();inp.click()}});
}
{const Y=new Date().getFullYear();
  wheelField($('#gamStart'),$('#gamStartWp'),false,Y-10,Y+10);
  wheelField($('#debtDue'),$('#debtDueWp'),true,Y-5,Y+10);}
$('#gamStart').addEventListener('input',()=>{if(parseMY($('#gamStart').value)) turnHint()});
$('#dueChips').onclick=e=>{const b=e.target.closest('[data-qd]'); if(!b) return; const v=b.dataset.qd, t=new Date(todayStart());
  wpCloseAll();
  if(v==='') $('#debtDue').value=''; else { if(v==='m') t.setMonth(t.getMonth()+1); else t.setDate(t.getDate()+(+v)); $('#debtDue').value=shortDate(t.getTime()) }
  $('#debtDue').classList.remove('err'); $('#debtErr').textContent=''};
$('#gamMembers').onchange=()=>fillTurns(gamReadTurns()); $('#gamShares').onchange=()=>fillTurns(gamReadTurns());
$('#gamTurn').onchange=turnHint; $('#gamTurnsMore').onchange=turnHint; $('#gamAmt').addEventListener('input',gamSumm); $('#gamStart').addEventListener('change',turnHint);
function openGamSheet(id){
  const g=id?S.gams.find(x=>x.id===id):null; gamEdit=g?id:null;
  $('#gamTitle').textContent=g?'تعديل الجمعية':'جمعية جديدة';
  $('#gamSave').textContent=g?'حفظ التعديل':'حفظ';
  $('#gamName').value=g?g.name:''; $('#gamAmt').value=g?String(g.inst):'';
  $('#gamMembers').value=String(g?g.members:10); $('#gamStart').value=mkToMY(g?g.start:monKey(Date.now())); $('#gamStart').classList.remove('err');
  $('#gamDay').value=String(g?g.day:1); $('#gamShares').value=String(g?gamShares(g):1); fillTurns(g?gamTurns(g):[1]);
  $('#gamAsExp').checked=g?g.asExp!==false:true;
  $('#gamErr').textContent=''; $('#gamAmtBox').classList.remove('err');
  openSheetEl('gamSheet'); $('#gamName').focus({preventScroll:true});
}
$('#gamCancel').onclick=closeSheets;
$('#gamSave').onclick=()=>{
  const name=$('#gamName').value.trim()||'جمعية', inst=parseFloat($('#gamAmt').value), members=+$('#gamMembers').value,
    start=parseMY($('#gamStart').value), day=+$('#gamDay').value, turns=gamReadTurns().sort((a,b)=>a-b), turn=turns[0], asExp=$('#gamAsExp').checked;
  if(!(inst>0)){$('#gamErr').textContent='اكتب قيمة القسط';$('#gamAmtBox').classList.add('err');$('#gamAmt').focus();return}
  if(!start){$('#gamErr').textContent='اكتب أول شهر كده: شهر/سنة، مثلاً '+mkToMY(monKey(Date.now()));$('#gamStart').classList.add('err');$('#gamStart').focus();return}
  if(new Set(turns).size!==turns.length){$('#gamErr').textContent='اختار شهر قبض مختلف لكل فرد';return}
  if(gamEdit){const g=S.gams.find(x=>x.id===gamEdit);
    /* keep "already received" with the same share (by order) when the months change */
    const oldT=gamTurns(g), rv={}; oldT.forEach((t,i)=>{ if(gamRecvd(g,t)&&i<turns.length) rv[turns[i]]={ts:(g.recvT&&g.recvT[t]&&g.recvT[t].ts)||Date.now()} });
    Object.assign(g,{name,inst,members,start,day,turn,turns,asExp});
    if(Object.keys(rv).length) g.recvT=rv; else delete g.recvT; g.received=turns.every(t=>rv[t])}
  else{const id=uid(); justAddedOb=id; S.gams.push({id,name,inst,members,start,day,turn,turns,asExp,paid:{},received:false,created:Date.now()})}
  const was=gamEdit; save();closeSheets();renderAll();justAddedOb=null;
  toast(was?'اتعدلت الجمعية':`اتضافت ${name} · ${turns.length>1?'أدوارك '+turns.map(t=>monthName(addMonths(start,t-1))).join(' و'):'دورك '+monthName(addMonths(start,turn-1))}`);
  setTimeout(checkDue,500);
};
function deleteGam(id){
  const i=S.gams.findIndex(g=>g.id===id); if(i<0) return;
  const [g]=S.gams.splice(i,1); const tid=trashPut('gam',g,i); save();renderAll();
  toast('اتحذفت '+g.name+' (الأقساط المدفوعة فاضلة في مصاريفك)','تراجع',()=>{trashDel(tid);S.gams.splice(i,0,g);save();renderAll()},3000);
}
const HOME_BLOCKS=[['upcoming','المواعيد القريبة','#upcoming'],['limits','حدود الفئات','#limBox'],['caps','العمليات اللي لقطها مليم من الإشعارات','#capBox'],['summary','ملخص الشهر','#sumBox'],['close','كارت «قفّل الفترة»','#closeCard'],['today','مصاريف النهارده','#todayBlock']];
function applyHomeShow(){ const h=S.homeHide||{}; HOME_BLOCKS.forEach(([k,,sel])=>{ const el=document.querySelector(sel); if(el) el.hidden=!!h[k] }) }
function renderHomeToggles(){
  const box=$('#homeToggles'); if(!box) return; const h=S.homeHide||{};
  box.innerHTML=HOME_BLOCKS.map(([k,n])=>`<label class="pay-row" style="cursor:pointer"><span class="txt">${esc(n)}</span><input type="checkbox" data-hb="${k}" ${h[k]?'':'checked'} style="width:22px;height:22px;accent-color:var(--brand)"></label>`).join('');
}
$('#homeToggles').onchange=e=>{ const c=e.target.closest('[data-hb]'); if(!c) return; S.homeHide=Object.assign({},S.homeHide); if(c.checked) delete S.homeHide[c.dataset.hb]; else S.homeHide[c.dataset.hb]=true; save();applyHomeShow() };
var pkCb=null;
function pickAcc(o,cb){
  pkCb=cb; $('#pkTitle').textContent=o.title; $('#pkInfo').textContent=o.info||''; $('#pkLab').textContent=o.lab||'الحساب';
  $('#pkAcc').innerHTML='<option value="">من غير حساب</option>'+S.accounts.map(a=>`<option value="${esc(a.id)}">${esc(accDisp(a))} (${esc(curSym(a.cur))})</option>`).join('');
  $('#pkAcc').value=ACC(S.lastAcc)?S.lastAcc:''; $('#pkErr').textContent=''; $('#scrim').classList.add('open'); $('#pkSheet').classList.add('open');
}
$('#pkCancel').onclick=closeSheets;
$('#pkGo').onclick=()=>{ const cb=pkCb, a=$('#pkAcc').value; if(!cb) return; if(cb(a)===false) return; closeSheets() };
function toggleGamPaid(id,mk,acc){
  const g=S.gams.find(x=>x.id===id); if(!g) return; g.paid=g.paid||{};
  if(!g.paid[mk]&&acc===undefined&&g.asExp!==false&&S.accounts.length){ pickAcc({title:'قسط '+g.name,info:`${fmt(gamMonthly(g))} ${CS()} · ${monthName(mk)}`,lab:'اتدفع من'},a=>{ setTimeout(()=>toggleGamPaid(id,mk,a),0) }); return }
  if(g.paid[mk]){
    const rec=g.paid[mk]; delete g.paid[mk];
    let exp=null; if(rec.exp){const j=S.expenses.findIndex(e=>e.id===rec.exp); if(j>=0) exp=S.expenses.splice(j,1)[0]}
    save();renderAll();
    toast(`اتلغى قسط ${monthOnly(mk)}`,'تراجع',()=>{g.paid[mk]=rec; if(exp) S.expenses.push(exp); save();renderAll()},3000);
    return;
  }
  const rec={ts:Date.now()};
  if(g.asExp!==false){
    ensureGamCat();
    const [y,m]=mk.split('-').map(Number), ts= mk===monKey(Date.now())? Date.now() : new Date(y,m-1,Math.min(g.day,daysIn(mk)),12).getTime();
    const e={id:uid(),amount:gamMonthly(g),cat:'gam',note:'قسط '+g.name,ts}; const ac=ACC(acc);
    if(ac){const aa=toAcc(gamMonthly(g),ac); if(aa==null){toast('الحساب ده بعملة تانية ومفيش سعر صرف متاح دلوقتي. اختار حساب بنفس العملة، أو جرّب لما النت يشتغل',null,null,5000);ratesRefresh(false);return} e.acc=ac.id;e.accAmt=aa; S.lastAcc=ac.id}
    else if(S.accounts.length) S.lastAcc='';
    S.expenses.push(e); rec.exp=e.id;
    if(mk===monKey(Date.now())) justAdded=e.id;
  }
  g.paid[mk]=rec; save();renderAll();justAdded=null;
  const I=gamInfo(g);
  toast(I.paidN>=g.members? `خلصت كل أقساط ${g.name} 🎉` : `اتسجل قسط ${monthOnly(mk)} · ${I.paidN} من ${g.members}`,'تراجع',()=>toggleGamPaid(id,mk),3000);
  setTimeout(checkAlerts,450);
}

/* --- events --- */
$('#obSeg').onclick=e=>{const b=e.target.closest('[data-ob]');if(!b||b.dataset.ob===obTab)return;obTab=b.dataset.ob;renderDebts();
  const el=$(obTab==='gams'?'#obGams':obTab==='insts'?'#obInsts':'#obDebts'); el.style.setProperty('--dx',obTab==='debts'?'20px':'-20px'); el.classList.remove('sub-anim');void el.offsetWidth;el.classList.add('sub-anim')};
document.addEventListener('click',e=>{
  const pb=e.target.closest('[data-debtpay]'); if(pb){openPaySheet(pb.dataset.debtpay);return}
  const da=e.target.closest('[data-debtadd]'); if(da){openDebtAdd(da.dataset.debtadd);return}
  const dl=e.target.closest('[data-debtlog]'); if(dl){openDebtLog(dl.dataset.debtlog);return}
  const dr=e.target.closest('[data-debtremind]'); if(dr){debtRemind(dr.dataset.debtremind);return}
  const ip=e.target.closest('[data-ipay]'); if(ip){e.stopPropagation();openInstPay(ip.dataset.ipay);return}
  const ie=e.target.closest('[data-iedit]'); if(ie){openItemSheet(ie.dataset.iedit);return}
  const gp=e.target.closest('[data-gpay]'); if(gp){e.stopPropagation();toggleGamPaid(gp.dataset.gpay,monKey(Date.now()));return}
  const gd=e.target.closest('[data-gdot]'); if(gd){const [id,mk]=gd.dataset.gdot.split('|');toggleGamPaid(id,mk);return}
  const gr=e.target.closest('[data-grecv]'); if(gr){const [gid,gt]=gr.dataset.grecv.split('|'), g=S.gams.find(x=>x.id===gid); if(g){ const gT=gamTurns(g), turnNo=gT.includes(+gt)?+gt:gT[0];
    const done=acc=>{ let inf=null; const ac=ACC(acc), v=r2(g.inst*g.members);
      if(ac){const aa=toAcc(v,ac); if(aa==null){toast('الحساب ده بعملة تانية ومفيش سعر صرف متاح دلوقتي. اختار حساب بنفس العملة، أو جرّب لما النت يشتغل',null,null,5000);ratesRefresh(false);return false}
        inf={id:uid(),amount:v,ts:Date.now(),src:('قبض جمعية '+g.name+(gT.length>1?' ('+(gT.indexOf(turnNo)+1)+')':'')).slice(0,40),note:'',acc:ac.id,accAmt:aa}; S.inflows.push(inf); S.lastAcc=ac.id}
      gamSetRecv(g,turnNo,true);save();renderAll();
      toast(`مبروك! قبضت ${fmt(v)} ${CS()} 🎉${inf?' واتضافت على «'+ac.name+'»':''}`,'تراجع',()=>{gamSetRecv(g,turnNo,false);if(inf) S.inflows=S.inflows.filter(z=>z.id!==inf.id);save();renderAll()},4000) };
    if(S.accounts.length) pickAcc({title:'قبضت '+g.name,info:`${fmt(g.inst*g.members)} ${CS()}`,lab:'استلمتها على'},a=>done(a)); else done('')
  } return}
  const go_=e.target.closest('[data-goob]'); if(go_){ if(go_.dataset.goob) obTab=go_.dataset.goob; go('debts'); renderDebts() }
});
$('#exactBtn').onclick=()=>{try{AB&&AB.openExactAlarmSettings&&AB.openExactAlarmSettings()}catch(e){}};
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&tab==='settings')try{renderSettings()}catch(e){}});
$('#dueToggle').onchange=e=>{S.dueRemind=e.target.checked;if(S.dueRemind)askNotif();save();toast(S.dueRemind?'هفكرك بمواعيد السلف والجمعيات':'اتقفل تذكير المواعيد')};

