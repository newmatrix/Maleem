/* settings card */
function capState(){try{return JSON.parse(AB.captureState()||'{}')}catch(e){return {}}}
function renderCapSettings(){
  const can=!!(AB&&AB.captureState); $('#capCard').hidden=!can; if(!can) return;
  const st=capState(); $('#capToggle').checked=!!st.on;
  $('#capStatus').textContent= !st.on? 'مقفولة. لما تفعّلها هنطلب منك إذن «الوصول للإشعارات» من أندرويد.'
    : st.access? '✓ شغالة. أي عملية دفع جديدة هتظهرلك في الصفحة الرئيسية عشان تأكدها.'
    : '⚠️ لسه مستنية إذن «الوصول للإشعارات». من غيره مليم مش هيشوف أي إشعار.';
  $('#capPerm').hidden=!(st.on&&!st.access);
  let bl=[]; try{bl=JSON.parse(AB.captureBlocked()||'[]')}catch(e){}
  bl=(Array.isArray(bl)?bl:[]).filter(b=>b&&typeof b.pkg==='string'&&/^[A-Za-z0-9_.]{1,200}$/.test(b.pkg));
  $('#capBlockedWrap').hidden=!bl.length;
  $('#capBlocked').innerHTML=bl.map(b=>`<div class="cap-bl"><span>${esc(str(b.name,40)||b.pkg)}</span><button type="button" class="linkbtn" style="padding:0" data-capunblock="${esc(b.pkg)}">رجّعه</button></div>`).join('');
}
function openCapSheet(){
  const st=capState();
  $('#capRestricted').hidden=!(st.sdk>=33); $('#capAppInfo').hidden=!(st.sdk>=33);
  openSheetEl('capSheet');
}
$('#capToggle').onchange=e=>{
  if(e.target.checked){e.target.checked=false; openCapSheet(); return}
  try{AB.captureSet(false)}catch(err){}
  renderCapSettings(); toast('اتقفل التسجيل من الإشعارات');
};
$('#capGo').onclick=()=>{
  try{AB.captureSet(true)}catch(err){}
  askNotif(); closeSheets();
  const st=capState();
  if(st.access){renderCapSettings(); toast('اتفعل التسجيل من الإشعارات'); return}
  try{AB.captureOpenSettings()}catch(err){}
  renderCapSettings();
};
$('#capCancel').onclick=closeSheets;
$('#capAppInfo').onclick=()=>{try{AB.openAppInfo()}catch(e){}};
$('#capPerm').onclick=openCapSheet;
$('#capBlocked').onclick=e=>{const b=e.target.closest('[data-capunblock]'); if(!b) return;
  try{AB.captureBlock(b.dataset.capunblock,'',false)}catch(err){} renderCapSettings(); toast('رجع تاني')};

/* ===== Monthly summary =====
   Shown on the home screen for the first days of a new month (budget month when payday isn't 1),
   and sent as a notification at 10 AM on the day the new month starts. */
let sumForce=false;
function sumRecurring(P){
  const P1=repPrev(P), P2=repPrev(P1), periods=[P2,P1,P], groups=new Map(), me=spMe();
  periods.forEach((Q,qi)=>ofPeriod(Q).forEach(x=>{
    if(x.fx||!x.note||(x.by&&x.by!==me)) return;
    const n=normAr(x.note.trim()); if(n.length<2) return;
    const k=x.cat+'|'+n; let g=groups.get(k);
    if(!g){g={note:x.note.trim(),cat:x.cat,per:[[],[],[]]}; groups.set(k,g)}
    g.per[qi].push(x);
  }));
  const fixedNames=new Set(S.fixed.map(f=>normAr(f.name.trim()))), out=[];
  groups.forEach(g=>{
    if(g.per.some(a=>a.length<1||a.length>2)) return;           // once (or twice) every month, 3 months in a row
    const avg=g.per.map(a=>sum(a)/a.length), lo=Math.min(...avg), hi=Math.max(...avg);
    if(lo<=0||hi/lo>1.2) return;                                 // about the same amount each time
    if(fixedNames.has(normAr(g.note))) return;
    const last=g.per[2].slice().sort((a,b)=>b.ts-a.ts)[0];
    out.push({name:g.note,cat:g.cat,amount:r2(last.amount),day:new Date(last.ts).getDate()});
  });
  return out.sort((a,b)=>b.amount-a.amount).slice(0,3);
}
function sumData(P){
  const prevP=repPrev(P), list=ofPeriod(P), plist=ofPeriod(prevP), total=sum(list), ptotal=sum(plist);
  const hasPrev= plist.length>=3 && (S.since||0)<=prevP.start+3*864e5;
  const bc=byCat(list), pbc=byCat(plist);
  const cats= !hasPrev? [] : Object.keys({...bc,...pbc}).filter(id=>CAT[id]).map(id=>({id,now:bc[id]||0,prev:pbc[id]||0}))
    .filter(c=>c.prev>0&&Math.abs(c.now-c.prev)>=Math.max(50,total*.03)&&Math.abs(c.now-c.prev)/c.prev>=.15)
    .sort((a,b)=>Math.abs(b.now-b.prev)-Math.abs(a.now-a.prev)).slice(0,3);
  let top=null; for(const id in bc) if(CAT[id]&&(!top||bc[id]>top.a)) top={id,a:bc[id]};
  return {P,prevP,list,total,ptotal,hasPrev,cats,top,rec:sumRecurring(P)};
}
const sumPct=(a,b)=>Math.round((a-b)/b*100);
function sumDiffTxt(d){
  if(!d.hasPrev||!d.ptotal) return '';
  const pc=sumPct(d.total,d.ptotal);
  const was= d.P.pd===1? 'شهر '+repShort(d.prevP) : unitBefore();
  return Math.abs(pc)<3? `، تقريبًا زي ${was}` : `، ${pc>0?'أكتر':'أقل'} من ${was} بـ ${Math.abs(pc)}%`;
}
function sumWanted(){
  const now=Date.now(), cur=periodOf(now), P=repPrev(cur);
  if(sumForce) return P;
  if(!S.sumOn||S.sumSeen===P.key) return null;
  if(now-cur.start>(wk()?2:10)*864e5) return null;              // only the first days of the new period
  if((S.since||0)>P.start+3*864e5) return null;                 // you started using Maleem in the middle of it
  return ofPeriod(P).length>=(wk()?3:5)? P : null;
}
function renderSummary(){
  const box=$('#sumBox'), P=sumWanted();
  if(!P){box.innerHTML='';return}
  const d=sumData(P); if(wk()) d.rec=[]; // "repeats every month" makes no sense for weekly periods
  if(!d.list.length){box.innerHTML='';sumForce=false;toast('مفيش مصاريف متسجلة في '+unitPrev());return}
  const B= S.budgetMode==='fixed'&&S.budget>0? budOf(P) : 0;
  let h=`<div class="sum-card"><div class="sum-h"><span class="sum-ic" aria-hidden="true">📊</span><div><b>ملخص ${P.pd===1?'شهر '+esc(repShort(P)):unitPrev()}</b><small>${esc(repRange(P,true))} · ${d.list.length} مصروف</small></div><button type="button" class="sum-x" data-sumx aria-label="إخفاء الملخص">✕</button></div>
    <p class="sum-total">صرفت <b>${money(d.total)} ${CS()}</b>${esc(sumDiffTxt(d))}.</p>`;
  if(B) h+=`<p class="sum-note">${budgetSpent(P)<=B? `فضل من الميزانية ${money(B-budgetSpent(P))} ${CS()} 👏` : `عديت الميزانية بـ ${money(budgetSpent(P)-B)} ${CS()}`}</p>`;
  if(d.cats.length){
    h+=`<div class="sum-sec"><h4>أكتر حاجات اتغيرت</h4>${d.cats.map(c=>{const k=CAT[c.id], pc=sumPct(c.now,c.prev), up=pc>0;
      return `<div class="sum-cat"><span aria-hidden="true">${esc(k.e)}</span><div class="n">${esc(k.name)}<small>${money(c.now)} بدل ${money(c.prev)} ${CS()}</small></div><span class="pc ${up?'up':'down'}">${up?'↑':'↓'} ${Math.abs(pc)}%</span></div>`}).join('')}</div>`;
  }else if(d.top){
    const k=CAT[d.top.id]; h+=`<div class="sum-sec"><h4>أكتر فئة صرفت عليها</h4><div class="sum-cat"><span aria-hidden="true">${esc(k.e)}</span><div class="n">${esc(k.name)}<small>${Math.round(d.top.a/d.total*100)}% من مصاريفك</small></div><span class="pc">${money(d.top.a)}</span></div></div>`;
  }
  if(d.rec.length){
    h+=`<div class="sum-sec"><h4>🔁 بتتكرر كل شهر ومش متسجلة ثابتة</h4>${d.rec.map((r,i)=>{const k=CAT[r.cat]||CAT.other;
      return `<div class="sum-rec"><span aria-hidden="true">${esc(k.e)}</span><div class="n">${esc(r.name)}<small>حوالي ${money(r.amount)} ${CS()} · يوم ${r.day} في الشهر</small></div><button type="button" data-sumfix="${i}">ضيفها ثابتة</button></div>`}).join('')}</div>`;
  }
  h+=`<button type="button" class="btn sum-ok" data-sumx>تمام</button></div>`;
  box.innerHTML=h; box._rec=d.rec; box._key=P.key;
}
$('#sumBox').addEventListener('click',e=>{
  const x=e.target.closest('[data-sumx]'), f=e.target.closest('[data-sumfix]'), box=$('#sumBox');
  if(x){S.sumSeen=box._key; sumForce=false; save(); renderHome(); return}
  if(f){const r=(box._rec||[])[+f.dataset.sumfix]; if(r) openFixed(null,r)}
});
$('#sumToggle').onchange=e=>{S.sumOn=e.target.checked; save(); renderHome(); toast(S.sumOn?'هيوصلك ملخص أول كل شهر':'اتقفل الملخص الشهري')};
$('#sumShow').onclick=()=>{
  const P=repPrev(periodOf(Date.now()));
  if(!ofPeriod(P).length){toast('مفيش مصاريف متسجلة في الشهر اللي فات');return}
  sumForce=true; go('expenses'); renderHome(); setTimeout(()=>{const c=$('#sumBox').firstChild; if(c) c.scrollIntoView({behavior:'smooth',block:'start'})},150);
};
/* the notification for the month that is running now, sent when it ends */
function sumNotif(now){
  if(!S.sumOn) return null;
  const P=periodOf(now), d=sumData(P); if(wk()) d.rec=[];
  if(d.list.length<(wk()?3:5)||(S.since||0)>P.start+3*864e5) return null;
  const t=new Date(P.next); t.setHours(10,0,0,0); if(t.getTime()<=now) return null;
  let body=`صرفت ${fmt(d.total)} ${CS()}${sumDiffTxt(d)}.`;
  const c=d.cats[0]; if(c){const pc=sumPct(c.now,c.prev); body+=` ${CAT[c.id].name} ${pc>0?'زادت':'قلت'} ${Math.abs(pc)}%.`}
  if(d.rec.length) body+=' وفيه حاجات بتتكرر كل شهر ممكن تضيفها كمصاريف ثابتة.';
  return {at:t.getTime(), title:P.pd===1?`📊 ملخص شهر ${repShort(P)} جاهز`:(wk()?(S.payType==='weekly'?'📊 ملخص الأسبوع جاهز':'📊 ملخص الأسبوعين جاهز'):'📊 ملخص الشهر جاهز'), body:body.slice(0,290)};
}

/* Boot: draw the home screen first and show it; the other (hidden) tabs render right after the first frame.
   renderSettings asks the phone several things through the bridge, so it must not hold up the first frame. */
var bootRest=true; // var: go() may run before this line, and must then do nothing
function renderRest(){ if(!bootRest) return; bootRest=false;
  [renderMe,renderMeHome,renderGold,paintIpFee,renderIncome,renderAccounts,renderDebts,renderReports,renderSettings].forEach(f=>{try{f()}catch(e){console.error(e)}}) }
applyCurrency();applyTheme();try{renderHome()}catch(e){console.error(e)}
if(S.onboarded===undefined&&(S.expenses.length||S.budget>0||(S.profile&&(S.profile.name||S.profile.photo))||S.lastBackup||(S.debts||[]).length||(S.gams||[]).length||(S.fixed||[]).length||(S.incomes||[]).length||(S.goals||[]).length)){S.onboarded=true;save()}
if(!S.onboarded) showWelcome();
if(S.space) setTimeout(spListen,1500);
rcLoad();
if(AB&&capPull()) renderHome();
if(AB&&S.onboarded&&(S.remind||S.dueRemind)&&!S.notifAsked){S.notifAsked=true;save();setTimeout(askNotif,2500)}
if(S.spaceRequest&&S.spaceRequest.status==='pending') setTimeout(spWatchJoinRequest,1500);
setInterval(()=>{if(document.hidden) return; greet();checkRemind();checkDue();try{checkLow()}catch(e){}},30000);
setTimeout(()=>{try{checkLow()}catch(e){}},3500); // a low balance is told once a day, soon after the app opens
document.addEventListener('visibilitychange',()=>{if(!document.hidden){greet();checkRemind();checkDue();setTimeout(maybeAutoBackup,1500); if(AB&&AB.updateCheck&&UPD.st&&UPD.st.enabled) setTimeout(()=>{try{AB.updateCheck(false)}catch(e){}},3000)}});setTimeout(checkRemind,1500);setTimeout(checkDue,3500);setTimeout(maybeAutoBackup,5000);
setInterval(()=>{if(!document.hidden&&dayKey(Date.now())!==window.__dk){window.__dk=dayKey(Date.now());renderHome()}},60000);window.__dk=dayKey(Date.now());
(async()=>{
  if(AB){ setTimeout(()=>{try{syncNative()}catch(e){}},1500); return } // widget / reminders refresh: not needed for the first frame
  if(!window.claude||!window.claude.use){$('#exportHint').textContent='حفظ الملفات بيشتغل لما تفتح التطبيق من الرابط المنشور.';return}
  try{downloads=await window.claude.use('downloads')}catch(e){}
  if(!downloads){$('#exportHint').textContent='حفظ الملفات مش متاح في العرض ده.';document.querySelectorAll('[data-fmt]').forEach(b=>b.disabled=true)}
  try{
    db=await window.claude.use('db'); const user=await window.claude.use('user');
    if(user) myId=await user.id();
  }catch(e){}
  if(!db||!myId){$('#backupBtn').disabled=true;$('#restoreBtn').disabled=true;$('#backupHint').textContent='النسخ الاحتياطي محتاج تكون مسجل دخول.'}
})();
document.documentElement.classList.remove('booting');
(function(){const r=document.documentElement; if(!r.classList.contains('splash-on')) return;
  let started=false;
  window.__splashGo=()=>{if(started) return; started=true; r.classList.add('splash-go');
    setTimeout(()=>r.classList.add('splash-out'),760);
    setTimeout(()=>{r.classList.remove('splash-on','splash-go','splash-out'); splashQ.splice(0).forEach(f=>{try{f()}catch(e){console.error(e)}})},1000)};
  setTimeout(window.__splashGo, AB?1800:60); // Android calls __splashGo itself as soon as its own splash is gone
})();
requestAnimationFrame(()=>setTimeout(renderRest,0));
setTimeout(()=>{try{updBoot()}catch(e){}try{nudgeBoot()}catch(e){}},2500);
setTimeout(()=>{try{curFixPending(); if(S.space) ratesRefresh(false)}catch(e){}},3500);
