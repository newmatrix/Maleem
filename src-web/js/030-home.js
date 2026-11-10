/* Home */
const payLen=()=>S.payType==='weekly'?7:S.payType==='biweekly'?14:0;
const wk=()=>typeof repPd()==='string';
const unitPrev=()=>wk()?(S.payType==='weekly'?'الأسبوع اللي فات':'الأسبوعين اللي فاتوا'):'الشهر اللي فات';
const unitBefore=()=>wk()?(S.payType==='weekly'?'الأسبوع اللي قبله':'الأسبوعين اللي قبلهم'):'الشهر اللي قبله';
const endWord=()=>S.budgetMode==='fixed'&&payLen()?(S.payType==='weekly'?'آخر الأسبوع':'آخر الأسبوعين'):'آخر الشهر';
/* the period "kind": a number = monthly with that payday; "w7:2026-11-01" / "w14:..." = every 7 / 14 days counted from that day */
const repPd=()=>{ if(S.budgetMode==='fixed'&&payLen()&&S.payAnchor) return 'w'+payLen()+':'+S.payAnchor; return (S.budgetMode==='fixed'?S.payday:1)||1 };
function periodOf(now){return periodAt(now,repPd())}
function periodAt(now,pd){
  if(typeof pd==='string'&&pd[0]==='w'){
    const [ls,anc]=pd.slice(1).split(':'), len=+ls, [ay,am,ad]=anc.split('-').map(Number), d=new Date(now);
    const dn=Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/864e5, an=Date.UTC(ay,am-1,ad)/864e5, st=an+Math.floor((dn-an)/len)*len;
    const loc=n=>{const t=new Date(n*864e5); return new Date(t.getUTCFullYear(),t.getUTCMonth(),t.getUTCDate())}, start=loc(st), next=loc(st+len);
    return {start:start.getTime(), next:next.getTime(), key:dayKey(start), pd};
  }
  const d=new Date(now);
  const cd=(y,m)=>Math.min(pd,new Date(y,m+1,0).getDate());
  let y=d.getFullYear(), m=d.getMonth();
  if(d.getDate()<cd(y,m)){m--; if(m<0){m=11;y--}}
  const start=new Date(y,m,cd(y,m));
  let ny=y, nm=m+1; if(nm>11){nm=0;ny++}
  const next=new Date(ny,nm,cd(ny,nm));
  return {start:start.getTime(), next:next.getTime(), key:dayKey(start), pd};
}
const daysTxt=n=> n===1?'يوم واحد': n===2?'يومين': n<=10? n+' أيام' : n+' يوم';
const ofPeriod=P=>S.expenses.filter(x=>x.ts>=P.start&&x.ts<P.next);
function daysLeft(P){const t=new Date();return Math.max(0,Math.round((P.next-new Date(t.getFullYear(),t.getMonth(),t.getDate()).getTime())/864e5)-1)}
function periodRange(P){
  const f=ts=>new Date(ts).toLocaleDateString(LOC,{day:'numeric',month:'long'});
  const e=new Date(P.next); e.setDate(e.getDate()-1);
  return `${f(P.start)} لـ ${f(e.getTime())}`;
}
const periodLabel=P=> P.pd===1? 'ميزانية '+monthOnly(monKey(P.start)) : 'ميزانية '+periodRange(P).replace(' لـ ',' - ');
function greet(){
  const h=new Date().getHours();
  const [t,e]= h>=5&&h<12? ['صباح الخير','☀️'] : h>=12&&h<17? ['مساء الخير','🌤️'] : ['مساء الخير','🌙'];
  const first=((S.profile&&S.profile.name)||'').trim().split(/\s+/)[0]||'';
  const key=t+e+first, el=$('#greet'); if(el.dataset.g===key) return; el.dataset.g=key;
  el.innerHTML=`${t}${first?' يا '+esc(first):''} <span class="wave" aria-hidden="true">${e}</span>`;
}
function countUp(el,to){
  const from=parseFloat(el.dataset.v||'0'); el.dataset.v=to;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches||from===to){el.textContent=fmt(to);return}
  const t0=performance.now(), d=700;
  (function step(t){const k=Math.min(1,(t-t0)/d), e=1-Math.pow(1-k,3); el.textContent=fmt(from+(to-from)*e); if(k<1) requestAnimationFrame(step)})(t0);
}
/* Forecast: daily spending pace + fixed expenses, projected to the end of the period */
function forecastLine(list,start,end,B){
  const t0=todayStart(), elapsed=Math.round((t0-start)/864e5)+1, total=Math.round((end-start)/864e5), left=total-elapsed;
  if(elapsed<3||left<1) return '';
  const fxSpent=sum(list.filter(x=>x.fx)), varSpent=sum(list.filter(x=>!x.fx)), rate=varSpent/elapsed;
  if(!varSpent) return '';
  const pend=fixedPendingIn(start,end), proj=fxSpent+pend+rate*total, r10=n=>Math.round(n/10)*10;
  if(!B) return ''; // shown only with a fixed budget
  const spent=fxSpent+varSpent; if(spent>=B) return '';
  if(proj<=B) return `<p class="fc">📈 بالمعدل ده هيفضلك حوالي ${fmt(r10(B-proj))} ${CS()} ${endWord()}</p>`;
  const avail=B-spent-pend;
  if(avail<=0) return `<p class="fc">📈 المصاريف الثابتة اللي جاية أكبر من المتبقي في الميزانية، خلي بالك من الصرف</p>`;
  const d=new Date(t0); d.setDate(d.getDate()+Math.max(1,Math.ceil(avail/rate)));
  return `<p class="fc">📈 بالمعدل ده الميزانية هتخلص يوم ${shortDate(d.getTime())}</p>`;
}
/* "how much can I spend a day": what is left (minus fixed expenses still to come) over the days left, today included */
function dailyAllowance(rem,P){
  const dl=Math.max(1,Math.round((P.next-todayStart())/864e5));
  let pend=0; try{pend=fixedPendingIn(P.start,P.next)||0}catch(e){}
  const per=Math.floor((rem-pend)/dl);
  return {dl,pend,per:Math.max(0,per)};
}
function dailyLine(rem,P){
  const {dl,pend,per}=dailyAllowance(rem,P);
  if(rem<=0||per<=0) return '';
  return `<p class="fc daily">💡 تقدر تصرف حوالي <b>${money(per)}</b> ${CS()} في اليوم${dl===1?' النهارده':' لحد '+endWord()}${pend>0?'، بعد المصاريف الثابتة الجاية':''}</p>`;
}
const EYE_ON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6C3.9 8.3 2 12 2 12s3.6 7 10 7c1.7 0 3.2-.4 4.5-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
function paintEye(){ const h=!!S.hideAmt, b=$('#eyeBtn'); if(!b) return; $('#v-expenses').classList.toggle('amt-hidden',h); b.setAttribute('aria-pressed',h?'true':'false'); b.setAttribute('aria-label',h?'إظهار المبالغ':'إخفاء المبالغ'); b.innerHTML=h?EYE_OFF:EYE_ON }
/* closing a period: what was left of its budget is offered to a savings goal (shown for a while after the period ends) */
function cleanClosed(o){const r={}; if(o&&typeof o==='object') Object.keys(o).slice(0,60).forEach(k=>{ if(/^[A-Za-z0-9:_-]{1,40}$/.test(k)&&o[k]&&typeof o[k]==='object') r[k]={ts:numIn(o[k].ts,0,MAXTS,0),amt:r2(numIn(o[k].amt,0,MAXAMT,0)),goal:isId(o[k].goal)?o[k].goal:'',skip:o[k].skip===true} }); return r}
function closeInfo(){
  if(S.budgetMode!=='fixed'||!(S.budget>0)) return null;
  const P=periodOf(Date.now()), Pp=periodOf(P.start-1), sp=budgetSpent(Pp);
  if(!(sp>0)||(S.closedP||{})[Pp.key]) return null;
  if(Date.now()-P.start>15*864e5) return null;
  const left=r2(budOf(Pp)-sp); if(!(left>=1)) return null;
  return {Pp,left,sp};
}
function renderCloseCard(){
  const box=$('#closeCard'); if(!box) return; const c=closeInfo();
  if(!c){box.innerHTML='';return}
  box.innerHTML=`<div class="upc cls-card"><div class="upc-h"><b>قفّل ${esc(periodLabel(c.Pp))}</b></div><div class="cls-row"><p class="hint">فاضل <b>${money(c.left)}</b> ${CS()}، تحوّلهم للادخار؟</p><div class="cls-btns"><button type="button" class="btn primary" id="clsOpen">قفّل وحوّل</button><button type="button" class="btn" id="clsLater">مش دلوقتي</button></div></div></div>`;
  $('#clsOpen').onclick=()=>openClose(); $('#clsLater').onclick=()=>{ const k=c.Pp.key; S.closedP=S.closedP||{}; S.closedP[k]={ts:Date.now(),amt:0,goal:'',skip:true}; save(); renderCloseCard() };
}
function openClose(){
  const c=closeInfo(); if(!c) return;
  $('#clsInfo').textContent=`فاضل من ${periodLabel(c.Pp)}: ${fmt(c.left)} ${CS()} (الميزانية ${fmt(budOf(c.Pp))}، صرفت ${fmt(c.sp)})`;
  $('#clsAmt').value=String(c.left); $('#clsErr').textContent='';
  $('#clsGoal').innerHTML='<option value="">من غير هدف</option>'+S.goals.filter(g=>isMine(g)).map(g=>`<option value="${esc(g.id)}">${esc(g.e||'🎯')} ${esc(g.name)}</option>`).join('');
  $('#clsGoal').value=S.goals.some(g=>isMine(g))?S.goals.filter(g=>isMine(g))[0].id:'';
  openSheetEl('clsSheet'); $('#clsAmt').focus({preventScroll:true});
}
bindMoney($('#clsAmt'),$('#clsAmtBox'));
$('#clsCancel').onclick=closeSheets;
$('#clsSave').onclick=()=>{
  const c=closeInfo(); if(!c){closeSheets();return}
  const v=parseFloat($('#clsAmt').value); if(!(v>0)||v>c.left+0.001){$('#clsErr').textContent=!(v>0)?'اكتب المبلغ':`الباقي ${fmt(c.left)} بس`;$('#clsAmtBox').classList.add('err');return}
  const g=S.goals.find(x=>x.id===$('#clsGoal').value&&isMine(x))||null, k=c.Pp.key, before=g?(g.saved||0):0;
  S.closedP=S.closedP||{}; S.closedP[k]={ts:Date.now(),amt:r2(v),goal:g?g.id:'',skip:false}; if(g) g.saved=r2(before+v);
  save();closeSheets();renderAll();
  toast(g?`اتقفلت الفترة وحوشت ${fmt(v)} ${CS()} في ${g.name}`:`اتقفلت الفترة، و${fmt(v)} ${CS()} بيتحسبوا في مدخراتك`,'تراجع',()=>{delete S.closedP[k]; if(g) g.saved=before; save();renderAll()},5000);
};
var homeExpenseView='day';
function homeExpenseRow(x){return itemRow(x).replace('<div class="title">',`<button type="button" class="title home-exp-open" data-homeedit="${esc(x.id)}">`).replace('</small></span></div>','</small></span></button>')}
function closeHomeExpenseMenu(){$('#homeExpenseMenu').classList.remove('open');$('#homeExpensePick').setAttribute('aria-expanded','false')}
$('#homeExpensePick').onclick=e=>{e.stopPropagation();const m=$('#homeExpenseMenu');if(m.classList.contains('open')){closeHomeExpenseMenu();return}m.classList.add('open');$('#homeExpensePick').setAttribute('aria-expanded','true');const r=e.currentTarget.getBoundingClientRect();m.style.left=Math.max(8,Math.min(r.left,innerWidth-m.offsetWidth-8))+'px';m.style.top=Math.max(8,Math.min(r.bottom+6,innerHeight-m.offsetHeight-8))+'px'};
$('#homeExpenseMenu').onclick=e=>{const b=e.target.closest('[data-home-view]');if(!b)return;homeExpenseView=b.dataset.homeView;closeHomeExpenseMenu();renderHome()};
document.addEventListener('click',e=>{if(!e.target.closest('#homeExpenseMenu,#homeExpensePick'))closeHomeExpenseMenu()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeHomeExpenseMenu()});
window.addEventListener('resize',closeHomeExpenseMenu);
window.addEventListener('scroll',closeHomeExpenseMenu,{passive:true});
$('#todayList').onclick=e=>{if(e.target.closest('[data-more],[data-rc]'))return;const row=e.target.closest('.xp');if(row)openSheet(row.dataset.id)};
function renderHome(){
  const now=Date.now(), mk=monKey(now), tk=dayKey(now);
  greet(); paintEye(); try{renderCloseCard()}catch(e){console.error(e)}
  $('#todayLabel').textContent=new Date().toLocaleDateString(LOC,{weekday:'long',day:'numeric',month:'long'});
  const fixed=S.budgetMode==='fixed', P=periodOf(now), spent= fixed? budgetSpent(P) : sum(ofMonth(mk)), B=fixed&&S.budget>0?budOf(P):0;
  let h='';
  if(B>0){
    const rem=B-spent, sp=spent/B, w=Math.min(1,sp), pct=Math.round(sp*100);
    const cls= sp>=.9?'bad': sp>=.7?'warn':'';
    h=`<div class="head"><div><div class="label">${periodLabel(P)}</div>
         <div class="big"><span class="num" id="heroBig">0</span><small>${CS()}</small></div></div>
         <span class="chip">${daysLeft(P)?'فاضل '+daysTxt(daysLeft(P)):'آخر يوم'}</span></div>
       <div class="bar ${cls}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.min(100,pct)}" aria-label="نسبة الصرف من الميزانية"><i id="heroFill" style="width:0"></i><span class="pct${w>.84?' dark':''}">${pct}%</span></div>
       <div class="meta"><div class="m"><small>صرفت</small><b>${money(spent)}</b> <small style="display:inline">${CS()}</small></div>
         <div class="m left${rem<0?' over':''}"><small>${rem<0?'متجاوز الميزانية':'المتبقي'}</small><b>${money(Math.abs(rem))}</b> <small style="display:inline">${CS()}</small></div></div>${dailyLine(rem,P)}<div class="hero-foot">${forecastLine(budgetExpenses(P),P.start,P.next,B)}<div class="hero-go" id="heroGo" role="button" tabindex="0">شوف التفاصيل <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M15 6l-6 6 6 6"/></svg></div></div>`;
  }else if(fixed){
    h=`<div class="label">${periodLabel(P)}</div><div class="big">—</div>
       <p class="ctxt">اخترت تحديد ميزانية بس لسه مكتبتش الرقم.</p>
       <button class="cta" id="setBudgetCta">اكتب ميزانية الشهر</button>`;
  }else{
    const nDays=new Date().getDate(), cnt=ofMonth(mk).length, tSum=sum(S.expenses.filter(x=>dayKey(x.ts)===tk));
    h=`<div class="head"><div><div class="label">مصاريف شهر ${monthOnly(mk)}</div>
         <div class="big"><span class="num" id="heroBig">0</span><small>${CS()}</small></div></div>
         <span class="chip">ميزانية مفتوحة</span></div>
       <div class="stats"><div class="st"><small>النهارده</small><b>${money(tSum)}</b></div>
         <div class="st"><small>متوسط اليوم</small><b>${money(spent/nDays)}</b></div>
         <div class="st"><small>عدد المصاريف</small><b>${money(cnt)}</b></div></div><div class="hero-go" id="heroGo" role="button" tabindex="0">شوف التفاصيل <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M15 6l-6 6 6 6"/></svg></div>`;
  }
  $('#hero').innerHTML=h;
  $('#freeWallet').hidden=!freeIncomeActive();
  $('#freeWallet').innerHTML=freeIncomeActive()?`<div class="fw-amt">${money(freeIncomeBalance())} ${CS()}</div><p class="hint center">${esc(TX('منفصل عن ميزانية المرتب؛ الرصيد الباقي بيكمل للفترات الجاية.'))}</p>`:'';
  if(!fixed) countUp($('#heroBig'),spent);
  if(B>0){countUp($('#heroBig'),B);requestAnimationFrame(()=>requestAnimationFrame(()=>{const f=$('#heroFill');if(f)f.style.width=Math.min(100,spent/B*100)+'%'}))}
  const hg=$('#heroGo'); if(hg){const open=()=>{go('reports');showDetail(true)}; hg.onclick=open; hg.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}}}
  const cta=$('#setBudgetCta'); if(cta) cta.onclick=()=>{go('me');meGo('budget');setTimeout(()=>$('#budgetInput').focus(),350)};

  try{renderMoney()}catch(e){console.error(e)}
  try{paintHomeChips()}catch(e){console.error(e)}
  try{applyHomeShow()}catch(e){console.error(e)}
  try{renderSummary()}catch(e){console.error(e)}
  try{renderCaps()}catch(e){console.error(e)}
  renderUpcoming();
  const monthView=homeExpenseView==='month';
  const list=S.expenses.filter(x=>monthView?monKey(x.ts)===mk:dayKey(x.ts)===tk).sort((a,b)=>b.ts-a.ts);
  document.querySelectorAll('#homeExpenseMenu button').forEach(b=>b.setAttribute('aria-checked',String(b.dataset.homeView===homeExpenseView)));
  $('#homeExpensePick').innerHTML='<span>'+esc(TX(monthView?'الشهر ده':'النهارده'))+'</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m6 9 6 6 6-6"/></svg>';
  $('#homeExpenseTitle').textContent=monthView?TX('مصاريف الشهر ده'):TX('مصاريف النهارده');
  $('#todayTotal').innerHTML=list.length?`${money(sum(list))} ${CS()}`:'';
  $('#todayCount').textContent=list.length?` · ${list.length}`:'';
  if(!list.length){$('#todayList').innerHTML=`<div class="empty"><b>${esc(TX(monthView?'مفيش مصاريف الشهر ده':'مفيش مصاريف النهارده'))}</b>${esc(TX('دوس على + وسجل أول مصروف.'))}</div>`;return}
  if(!monthView){$('#todayList').innerHTML=list.map(homeExpenseRow).join('');return}
  const days=new Map();list.forEach(x=>{const k=dayKey(x.ts);if(!days.has(k))days.set(k,[]);days.get(k).push(x)});
  $('#todayList').innerHTML=[...days].map(([k,rows])=>`<div class="day-h"><span>${esc(dayName(k))}</span><span>${money(sum(rows))} ${CS()}</span></div><div class="day-list">${rows.map(homeExpenseRow).join('')}</div>`).join('');

}

