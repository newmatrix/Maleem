/* Reports controls */
$('#mPrev').onclick=()=>{curMonth=repPrev(repP(curMonth)).key;renderReports()};
$('#mNext').onclick=()=>{const P=repP(curMonth); if(P.key<periodOf(Date.now()).key){curMonth=repNext(P).key;renderReports()}};
$('#monthCard').onclick=()=>showDetail(true);
$('#backBtn').onclick=()=>showDetail(false);

/* Settings controls */
$('#themeSeg').onclick=e=>{const b=e.target.closest('button');if(!b)return;S.theme=b.dataset.theme;save();applyTheme()};
$('#accentRow').innerHTML=ACCENTS.map(a=>`<button type="button" data-accent="${a.id}" aria-label="${a.name}" title="${a.name}" aria-pressed="false" style="background:linear-gradient(135deg,${a.l},${a.l2})"></button>`).join('');
$('#styleGrid').innerHTML=Object.entries(STYLES).map(([id,s])=>`<button type="button" class="sty" data-style="${id}" aria-pressed="false" aria-label="ستايل ${s.name}"><span class="sty-pv" style="background:${s.pv.bg}"><i style="background:${s.pv.sf}"></i><b style="background:${s.pv.ac}"></b></span><span class="sty-n">${s.name}</span></button>`).join('');
$('#fontList').innerHTML=FONTS.map(x=>`<button type="button" class="font-opt" role="radio" data-fid="${x.id}" aria-pressed="false" aria-checked="false" aria-label="خط ${x.name}"><span class="fo-s" style="font-family:${x.f},sans-serif" aria-hidden="true">أبجد ١٢٣</span><span class="fo-n">${x.name}</span></button>`).join('');
$('#fontList').onclick=e=>{const b=e.target.closest('[data-fid]'); if(!b||b.dataset.fid===fontId()) return; S.font=b.dataset.fid; save(); applyTheme(); toast('اتغير الخط: '+(FONTS.find(x=>x.id===S.font)||{}).name)};
$('#fwSeg').onclick=e=>{const b=e.target.closest('[data-fw]'); if(!b) return; const v=b.dataset.fw==='bold'?'bold':'normal'; if(v===(S.fontW==='bold'?'bold':'normal')) return; S.fontW=v; save(); applyTheme()};
$('#lookList').innerHTML=LOOKS.map(x=>`<button type="button" class="look-opt" role="radio" data-look="${x.id}" aria-pressed="false" aria-checked="false"><span class="lk-pv ${x.id}" aria-hidden="true"><i></i><i></i>${x.id==='compact'?'<i></i>':''}</span><span class="lt"><b>${x.name}</b><small>${x.d}</small></span><span class="ok" aria-hidden="true">✓</span></button>`).join('');
$('#lookList').onclick=e=>{const b=e.target.closest('[data-look]'); if(!b) return; const id=b.dataset.look; if(id===lookId()) return;
  S.look=id; save(); applyTheme(); renderCatGrid(true); toast('اتغير شكل الواجهة: '+(LOOKS.find(x=>x.id===id)||{}).name)};
const motionOpt=(x,attr)=>`<button type="button" class="look-opt" role="radio" data-${attr}="${x.id}" aria-pressed="false" aria-checked="false"><span class="lt"><b>${x.name}</b><small>${x.d}</small></span><span class="ok" aria-hidden="true">✓</span></button>`;
$('#pressList').innerHTML=PRESSES.map(x=>motionOpt(x,'press')).join('');
$('#transList').innerHTML=TRANSES.map(x=>motionOpt(x,'trans')).join('');
$('#pressList').onclick=e=>{const b=e.target.closest('[data-press]'); if(!b||b.dataset.press===pressId()) return;
  S.press=b.dataset.press; save(); applyTheme(); toast('نبضة الأزرار: '+PRESSES.find(x=>x.id===S.press).name+'. جرّب تدوس على أي زرار')};
$('#transList').onclick=e=>{const b=e.target.closest('[data-trans]'); if(!b||b.dataset.trans===transId()) return;
  S.trans=b.dataset.trans; save(); applyTheme();
  const pg=document.querySelector('#v-settings>.set-page[data-page="appearance"]'); if(pg&&!pg.hidden){pg.style.setProperty('--dx','-24px');pg.classList.remove('sub-anim');void pg.offsetWidth;pg.classList.add('sub-anim')} // a quick taste of it
  toast('حركة التنقل: '+TRANSES.find(x=>x.id===S.trans).name)};
$('#hapticToggle').onchange=e=>{S.haptic=e.target.checked; save(); if(S.haptic){try{AB.haptic()}catch(err){}} toast(S.haptic?'اتفعل الاهتزاز الخفيف':'اتقفل الاهتزاز الخفيف')};
$('#styleGrid').onclick=e=>{const b=e.target.closest('[data-style]');if(!b)return;const id=b.dataset.style; S.style=id; if(STYLES[id].ac) S.accent=STYLES[id].ac; save(); applyTheme()};
$('#accentRow').onclick=e=>{const b=e.target.closest('[data-accent]');if(!b)return;S.accent=b.dataset.accent;save();applyTheme()};
$('#saveBudget').onclick=()=>{
  const v=parseFloat(String($('#budgetInput').value).replace(/[,٬\s]/g,'').replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  if(!(v>0)){toast('اكتب رقم صحيح للميزانية');return}
  S.budget=v;S.budgetMode='fixed';save();renderAll();toast('اتحفظت الميزانية: '+fmt(v)+' '+CS());
  setTimeout(checkAlerts,600);
};
$('#budgetSeg').onclick=e=>{const b=e.target.closest('[data-mode]');if(!b||b.dataset.mode===S.budgetMode)return;
  S.budgetMode=b.dataset.mode;save();renderAll();
  const el= S.budgetMode==='fixed'?$('#budgetFixed'):$('#budgetOpen');el.classList.remove('sub-anim');void el.offsetWidth;el.classList.add('sub-anim');
  if(S.budgetMode==='fixed'){ if(!S.budget) $('#budgetInput').focus(); else toast('رجعت للميزانية المحددة: '+fmt(S.budget)+' '+CS()) }
  else toast('الميزانية بقت مفتوحة');
};
$('#alert80').onchange=e=>{S.alert80=e.target.checked;save();renderSettings();toast(S.alert80?`اتفعل تنبيه ${S.alertPct}%`:`اتقفل تنبيه ${S.alertPct}%`)};
/* Widgets and Quick Settings tile (Android only) */
$('#wgHide').onchange=e=>{S.wgHide=e.target.checked;save();toast(S.wgHide?'المبالغ اتخفت من الويدجت':'المبالغ ظاهرة في الويدجت')};
const wgPin=k=>{let ok=false;try{ok=!!(AB&&AB.pinWidget&&AB.pinWidget(k))}catch(e){} toast(ok?'وافق على الإضافة من الرسالة اللي ظهرتلك':'اضغط مطولًا على الشاشة الرئيسية ← الويدجت ← مليم')};
$('#wgAddS').onclick=()=>wgPin('small');
$('#wgAddM').onclick=()=>wgPin('medium');
$('#wgAddTile').onclick=()=>{let ok=false;try{ok=!!(AB&&AB.addTile&&AB.addTile())}catch(e){} toast(ok?'وافق على الإضافة من الرسالة اللي ظهرتلك':'اسحب الإعدادات السريعة ← أيقونة القلم ← مليم')};

/* adjustable warning percentage */
function pctPaint(v){
  v=Math.min(99,Math.max(10,Math.round(+v)||80)); $('#pctRange').value=v; $('#pctBig').textContent=v+'%';
  document.querySelectorAll('#pctPresets button').forEach(b=>b.classList.toggle('on',+b.dataset.p===v));
  $('#pctEx').textContent= S.budget>0? `يعني لما تصرف ${fmt(S.budget*v/100)} ${CS()} من ${fmt(S.budget)} ${CS()}` : '';
  return v;
}
$('#pctChip').onclick=()=>{if($('#pctChip').disabled) return; pctPaint(S.alertPct); openSheetEl('pctSheet')};
$('#pctRange').oninput=e=>pctPaint(e.target.value);
$('#pctPresets').onclick=e=>{const b=e.target.closest('[data-p]'); if(b) pctPaint(b.dataset.p)};
$('#pctCancel').onclick=closeSheets;
$('#pctSave').onclick=()=>{S.alertPct=pctPaint($('#pctRange').value); save(); closeSheets(); renderSettings(); toast(`هنبهك لما تصرف ${S.alertPct}% من ميزانيتك`); setTimeout(checkAlerts,500)};

/* Budget alerts */
let notifT;
let notifKind=null;
function showNotif(kind){
  const P=periodOf(Date.now()), spent=budgetSpent(P), B=budOf(P), rem=B-spent, left=daysLeft(P);
  const n=$('#notif'); notifKind=kind; n.classList.toggle('over',kind==='over'); n.classList.toggle('remind',kind==='remind');
  $('#notifIco').textContent= kind==='over'?'🚨': kind==='remind'?'🌙':'⚠️';
  n.classList.toggle('ndue',kind==='due'||kind==='low');
  if(kind==='low'){
    const it=lowItems; $('#notifIco').textContent='💸';
    $('#notifTitle').textContent= it.length===1? `رصيد «${it[0].name}» منخفض` : `${it.length} حسابات رصيدها منخفض`;
    $('#notifBody').textContent= it.slice(0,3).map(a=>`${accDisp(a)}: ${fmt(accBal(a.id))} ${curSym(a.cur)}`).join('، ');
  }else if(kind==='due'){
    $('#notifIco').textContent='🔔';
    const it=dueNotifItems;
    $('#notifTitle').textContent= it.length===1? it[0].title : it.length===2? 'عندك ميعادين قريبين' : `عندك ${it.length} مواعيد قريبة`;
    $('#notifBody').textContent= it.length===1? (it[0].amount? `${it[0].when} · ${fmt(it[0].amount)} ${it[0].cur||CS()}` : it[0].when) : it.slice(0,3).map(x=>`${x.title} (${x.when})`).join('، ');
  }else if(kind==='remind'){
    const td=S.expenses.filter(x=>dayKey(x.ts)===dayKey(Date.now()));
    $('#notifTitle').textContent='سجلت مصاريف النهارده؟';
    $('#notifBody').textContent= td.length? `سجلت ${td.length} ${td.length===1?'مصروف':td.length<=10?'مصاريف':'مصروف'} بـ ${fmt(sum(td))} ${CS()}. لو فيه حاجة نسيتها دوس هنا وضيفها.` : 'لسه مسجلتش أي مصروف النهارده. لو صرفت حاجة دوس هنا وسجلها قبل ما تنسى.';
  }else if(kind==='over'){
    $('#notifTitle').textContent='عديت ميزانية الشهر';
    $('#notifBody').textContent=`صرفت ${fmt(spent)} ${CS()} من ميزانية ${fmt(B)} ${CS()}، يعني زيادة ${fmt(Math.max(0,-rem))} ${CS()}.`;
  }else{
    $('#notifTitle').textContent=`وصلت ${Math.round(spent/B*100)}% من ميزانيتك`;
    $('#notifBody').textContent=`فاضلك ${fmt(Math.max(0,rem))} ${CS()} لآخر الشهر${left>0?` (${LANG==='en'?dayCount(left,'en').replace(' left',''):daysTxt(left)})`:''}. خلي بالك من الصرف.`;
  }
  n.classList.remove('show');void n.offsetWidth;n.classList.add('show');
  clearTimeout(notifT);notifT=setTimeout(()=>n.classList.remove('show'),kind==='remind'?10000:7000);
}
$('#notifClose').onclick=()=>{clearTimeout(notifT);$('#notif').classList.remove('show')};
$('#notif').onclick=e=>{if(e.target.closest('#notifClose'))return;$('#notif').classList.remove('show');
  if(notifKind==='remind'){go('expenses');setTimeout(()=>openSheet(),250)} else if(notifKind==='due') go('debts'); else if(notifKind==='low'){go('me');setTimeout(()=>{try{meGo('accounts')}catch(e){}},200)} else go('reports')};
$('#previewNotif').onclick=()=>{const sp=budgetSpent(periodOf(Date.now()))/budOf(periodOf(Date.now()));showNotif(sp>=1?'over':'warn')};
$('#previewRemind').onclick=()=>showNotif('remind');
const fmtRemAt=m=>{const h=Math.floor(m/60),mi=m%60;return `${h%12||12}:${String(mi).padStart(2,'0')} ${h>=12?'م':'ص'}`};
/* Android 13+: the notification permission is asked when reminders are turned on, not on first launch */
function askNotif(){try{AB&&AB.askNotifications&&AB.askNotifications()}catch(e){}}
$('#remindToggle').onchange=e=>{S.remind=e.target.checked;if(S.remind)askNotif();save();renderSettings();toast(S.remind?'هفكرك كل يوم الساعة '+fmtRemAt(S.remindAt):'اتقفل التذكير اليومي')};
/* daily reminder time: wheel picker (hours / minutes / AM-PM) */
const TP_H=44;
function tpMark(el){const i=Math.min(el.children.length-1,Math.max(0,Math.round(el.scrollTop/TP_H)));[...el.children].forEach((c,j)=>c.classList.toggle('sel',j===i));return i}
function tpRead(){const h12=tpMark($('#tpH'))+1, mi=tpMark($('#tpM')), pm=tpMark($('#tpP'));return ((h12%12)+(pm?12:0))*60+mi}
function tpPreview(){$('#tpPreview').textContent='هفكرك كل يوم الساعة '+fmtRemAt(tpRead())}
function tpBuild(){
  const hc=$('#tpH'),mc=$('#tpM'),pc=$('#tpP'); if(hc.childElementCount) return;
  hc.innerHTML=Array.from({length:12},(_,i)=>`<div class="tp-it" role="option">${i+1}</div>`).join('');
  mc.innerHTML=Array.from({length:60},(_,i)=>`<div class="tp-it" role="option">${String(i).padStart(2,'0')}</div>`).join('');
  pc.innerHTML='<div class="tp-it" role="option">ص</div><div class="tp-it" role="option">م</div>';
  [hc,mc,pc].forEach(el=>{
    el.addEventListener('scroll',()=>{tpMark(el);tpPreview()});
    el.addEventListener('click',e=>{const it=e.target.closest('.tp-it'); if(it) el.scrollTo({top:[...el.children].indexOf(it)*TP_H,behavior:'smooth'})});
  });
}
function tpSet(m){
  const h=Math.floor(m/60),mi=m%60;
  const go=()=>{$('#tpH').scrollTop=((h%12||12)-1)*TP_H;$('#tpM').scrollTop=mi*TP_H;$('#tpP').scrollTop=(h>=12?1:0)*TP_H;tpRead();tpPreview()};
  go(); requestAnimationFrame(go); setTimeout(go,60);
}
$('#remindTimeChip').onclick=()=>{if(!S.remind) return; tpBuild(); openSheetEl('timeSheet'); tpSet(S.remindAt)};
$('#timeCancel').onclick=closeSheets;
$('#timeSave').onclick=()=>{S.remindAt=tpRead(); save(); closeSheets(); renderSettings(); toast('هفكرك كل يوم الساعة '+fmtRemAt(S.remindAt))};
function checkRemind(){
  if(!S.remind) return;
  const now=new Date(), tk=dayKey(now);
  const nm=now.getHours()*60+now.getMinutes();
  if(nm>=S.remindAt && nm<S.remindAt+60 && S.remindedDay!==tk){S.remindedDay=tk;save();showNotif('remind')}
}
(function(){const sel=$('#payday');for(let i=1;i<=31;i++)sel.insertAdjacentHTML('beforeend',`<option value="${i}">يوم ${i}</option>`)})();
$('#payday').onchange=e=>{S.payday=+e.target.value;save();renderAll();
  toast(S.payday===1?'الشهر بقى يبدأ من أول الشهر':'الشهر بقى يبدأ يوم '+S.payday);setTimeout(checkAlerts,500)};
/* a category with its own monthly limit: warn once near it (same % as the budget alert) and once over it */
function checkCatAlerts(){
  const lims=S.cats.filter(c=>c.lim>0); if(!lims.length) return;
  const P=periodOf(Date.now()), by={}; ofPeriod(P).forEach(x=>{by[x.cat]=(by[x.cat]||0)+x.amount});
  const A=S.alerted[P.key]=S.alerted[P.key]||{}, cc=A.c=(A.c&&typeof A.c==='object')?A.c:{}, before=JSON.stringify(cc), th=S.alertPct/100;
  let msg=null;
  lims.forEach(c=>{const sp=(by[c.id]||0)/c.lim, f=cc[c.id]=cc[c.id]||{};
    if(sp<th) f.w=false; if(sp<1) f.o=false;
    if(sp>=1&&!f.o){f.o=true;f.w=true;msg=msg||`🚨 فئة ${c.name} عدّت الحد: صرفت ${fmt(by[c.id])} من ${fmt(c.lim)} ${CS()}`}
    else if(sp>=th&&!f.w){f.w=true;msg=msg||`⚠️ فئة ${c.name} قربت من الحد: صرفت ${fmt(by[c.id])} من ${fmt(c.lim)} ${CS()}`}});
  if(JSON.stringify(cc)!==before) save();
  if(msg&&S.alert80) setTimeout(()=>toast(msg,null,null,6000),2600);
}
/* an account below the limit its owner set: shown once a day per account */
let lowItems=[];
function checkLow(){
  const tk=dayKey(Date.now()); if(!S.lowSeen||typeof S.lowSeen!=='object'||!Array.isArray(S.lowSeen[tk])) S.lowSeen={[tk]:[]};
  const seen=S.lowSeen[tk], fresh=S.accounts.filter(a=>accLow(a)&&!seen.includes(a.id));
  if(!fresh.length) return;
  S.lowSeen[tk]=seen.concat(fresh.map(a=>a.id)); save(); lowItems=fresh; showNotif('low');
}
function checkAlerts(){
  try{checkCatAlerts()}catch(e){console.error(e)}
  try{checkLow()}catch(e){console.error(e)}
  if(S.budgetMode!=='fixed'||!(S.budget>0)) return;
  const P=periodOf(Date.now()), sp=budgetSpent(P)/budOf(P);
  const a=S.alerted[P.key]=S.alerted[P.key]||{}, before=JSON.stringify(a);
  const th=S.alertPct/100;
  /* separate flags: reaching the warning % and going over 100% each alert once per period */
  if(sp<th) a.w=false;
  if(sp<1) a.o=false;
  let fire=null;
  if(sp>=1&&!a.o){a.o=true; a.w=true; if(S.alert80) fire='over'}
  else if(sp>=th&&!a.w){a.w=true; if(S.alert80) fire='warn'}
  /* keep only the last few periods */
  const ks=Object.keys(S.alerted).sort(); if(ks.length>6) ks.slice(0,ks.length-6).forEach(k=>delete S.alerted[k]);
  if(JSON.stringify(a)!==before) save();
  if(fire) showNotif(fire);
}
const WIPE_OPTS=[
  ['exp','المصاريف',()=>S.expenses.length,'كل مصاريفك المتسجلة'],
  ['obl','الالتزامات',()=>S.debts.length+S.gams.length+S.insts.length+S.plans.length,'السلف والجمعيات والتقسيط والمصروفات الجاية'],
  ['inc','الدخل المستلم',()=>S.inflows.length,'اللي سجلته إنك استلمته'],
  ['gold','الدهب',()=>S.gold.length,'مشترياتك من الدهب وأسعار النهارده'],
  ['tr','التحويلات بين الحسابات',()=>S.transfers.length,'أرصدة الحسابات بتفضل زي ما هي'],
  ['acc','الحسابات نفسها',()=>S.accounts.length,'بتتمسح، وبيتفك ربطها بالمصاريف']];
var wipeSel={};
function paintWipe(){
  if(wipeSel.acc) wipeSel.tr=true;
  $('#wipeOpts').innerHTML=WIPE_OPTS.map(([k,n,c,d])=>{ const cnt=c(), dis=!cnt||(k==='tr'&&wipeSel.acc);
    return `<label class="pay-row" style="cursor:pointer${cnt?'':';opacity:.5'}"><span class="txt">${n} (${cnt})<small>${d}</small></span><input type="checkbox" data-wo="${k}" ${wipeSel[k]&&cnt?'checked':''} ${dis?'disabled':''} style="width:22px;height:22px;accent-color:var(--bad)"></label>` }).join('');
  const any=WIPE_OPTS.some(([k,,c])=>wipeSel[k]&&c());
  $('#wipeConfirm').disabled=!any;
  $('#wipeNote').textContent= S.accounts.length&&!wipeSel.acc? 'أرصدة حساباتك مش هتتغير.' : '';
}
$('#wipeOpts').onchange=e=>{const c=e.target.closest('[data-wo]'); if(!c) return; wipeSel[c.dataset.wo]=c.checked; paintWipe()};
function openWipe(){
  wipeSel={exp:S.expenses.length>0, obl:(S.debts.length+S.gams.length+S.insts.length+S.plans.length)>0};
  $('#wipeSpNote').hidden=!S.space; paintWipe(); $('#scrim').classList.add('open'); $('#wipeSheet').classList.add('open');
}
$('#wipeCancel').onclick=()=>closeSheets();
$('#wipeConfirm').onclick=()=>{
  const sel=k=>wipeSel[k]&&WIPE_OPTS.find(o=>o[0]===k)[2](); if(!WIPE_OPTS.some(([k])=>sel(k))) return;
  if(sel('inc')&&!sel('exp')&&S.expenses.some(e=>e.fund==='free')){toast(TX('غيّر مصدر مصاريف الدخل الحر أو امسحها مع الدخل.'));return}
  if(sel('exp')&&S.space) spDetach();
  const keys=['budget','expenses','debts','gams','plans','alerted','dueSeen','accounts','transfers','bMoves','insts','instPays','inflows','lastAcc','gold','goldPx','trash'];
  const old=JSON.parse(JSON.stringify(keys.reduce((o,k)=>(o[k]=S[k],o),{})));
  const bal={}; S.accounts.forEach(a=>{bal[a.id]=accBal(a.id)});
  if(sel('exp')){S.expenses=[];S.alerted={};S.dueSeen={};S.trash=trashAll().filter(t=>t.k!=='xp')}
  if(sel('obl')){S.debts=[];S.gams=[];S.insts=[];S.instPays=[];S.plans=[];S.trash=trashAll().filter(t=>!['debt','gam','inst','plan'].includes(t.k))}
  if(sel('inc')){S.budget=Math.max(0,r2(S.budget-S.inflows.filter(x=>x.fund==='permanent').reduce((a,x)=>a+x.amount,0)));S.inflows=[];}
  if(sel('gold')){S.gold=[];S.goldPx={}}
  if(sel('tr')||sel('acc')){S.transfers=[];S.bMoves=[]}
  if(sel('acc')){
    S.accounts=[]; S.lastAcc='';
    S.expenses.concat(S.inflows,S.instPays,S.debts.flatMap(debtAccRows),S.gold.flatMap(goldAccRows)).forEach(x=>{delete x.acc;delete x.accAmt});
  }else S.accounts.forEach(a=>{ const eff=accBal(a.id)-a.open; a.open=r2(bal[a.id]-eff) }); // what is really in the account does not change
  save(); closeSheets(); renderAll(); go('expenses');
  const what=WIPE_OPTS.filter(([k])=>sel(k)).map(o=>o[1]).join(' و');
  toast('اتمسح: '+what,'تراجع',()=>{Object.assign(S,old);save();renderAll()},5000);
  setTimeout(rcPrune,7000);
};

/* PIN: only a salted PBKDF2-SHA256 hash is stored (never the digits), and wrong attempts are rate-limited */
const PIN_ITER=120000;
const b64e=u8=>{let s='';for(let i=0;i<u8.length;i++) s+=String.fromCharCode(u8[i]);return btoa(s)};
const b64d=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
/* pure-JS SHA-256 / HMAC / PBKDF2: used only if the browser has no WebCrypto (e.g. a non-secure page) */
const SHA_K=(()=>{const k=new Uint32Array(64);let n=2,i=0;const isP=x=>{for(let d=2;d*d<=x;d++)if(x%d===0)return false;return true};
  while(i<64){if(isP(n))k[i++]=Math.floor((Math.cbrt(n)%1)*4294967296);n++}return k})();
function sha256(msg){
  const l=msg.length, n=((l+9+63)>>6)<<6, b=new Uint8Array(n); b.set(msg); b[l]=0x80;
  const dv=new DataView(b.buffer); dv.setUint32(n-4,(l*8)>>>0); dv.setUint32(n-8,Math.floor(l/0x20000000));
  const H=new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]), w=new Uint32Array(64);
  for(let o=0;o<n;o+=64){
    for(let i=0;i<16;i++) w[i]=dv.getUint32(o+i*4);
    for(let i=16;i<64;i++){const a=w[i-15],c=w[i-2];w[i]=w[i-16]+((a>>>7|a<<25)^(a>>>18|a<<14)^(a>>>3))+w[i-7]+((c>>>17|c<<15)^(c>>>19|c<<13)^(c>>>10))}
    let A=H[0],B=H[1],C=H[2],D=H[3],E=H[4],F=H[5],G=H[6],X=H[7];
    for(let i=0;i<64;i++){
      const t1=(X+((E>>>6|E<<26)^(E>>>11|E<<21)^(E>>>25|E<<7))+((E&F)^(~E&G))+SHA_K[i]+w[i])|0,
            t2=(((A>>>2|A<<30)^(A>>>13|A<<19)^(A>>>22|A<<10))+((A&B)^(A&C)^(B&C)))|0;
      X=G;G=F;F=E;E=(D+t1)|0;D=C;C=B;B=A;A=(t1+t2)|0}
    H[0]+=A;H[1]+=B;H[2]+=C;H[3]+=D;H[4]+=E;H[5]+=F;H[6]+=G;H[7]+=X;
  }
  const out=new Uint8Array(32), ov=new DataView(out.buffer); for(let i=0;i<8;i++) ov.setUint32(i*4,H[i]); return out;
}
function hmac256(key,msg){
  if(key.length>64) key=sha256(key);
  const ip=new Uint8Array(64+msg.length), op=new Uint8Array(96);
  for(let i=0;i<64;i++){const k=key[i]||0; ip[i]=k^0x36; op[i]=k^0x5c}
  ip.set(msg,64); op.set(sha256(ip),64); return sha256(op);
}
function pbkdf2js(pass,salt,iter){
  const s=new Uint8Array(salt.length+4); s.set(salt); s[salt.length+3]=1;
  let u=hmac256(pass,s); const t=u.slice();
  for(let i=1;i<iter;i++){u=hmac256(pass,u); for(let j=0;j<32;j++) t[j]^=u[j]}
  return t;
}
async function pinDerive(pin,saltB64,iter){
  const pass=new TextEncoder().encode(String(pin)), salt=b64d(saltB64);
  if(window.crypto&&crypto.subtle){
    try{const key=await crypto.subtle.importKey('raw',pass,'PBKDF2',false,['deriveBits']);
      return b64e(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:iter},key,256)))}catch(e){}
  }
  return b64e(pbkdf2js(pass,salt,iter));
}
async function pinMake(pin){
  const salt=new Uint8Array(16); crypto.getRandomValues(salt); const s=b64e(salt);
  return {s,h:await pinDerive(pin,s,PIN_ITER),i:PIN_ITER};
}
function hasPin(){return !!(S.pinH&&S.pinH.h)||(typeof S.pin==='string'&&S.pin.length===4)}
/* Whose lock is being checked: null = the member loaded now (S). When another member is picked on the member
   screen, LK holds his stored data so his lock shows at once, without reloading the page first; the page
   reloads into him only after the right PIN / password. */
let LK=null;
const lkS=()=>LK?LK.st:S;
function lkSave(){if(LK) lsSet(mbKey(LK.id),JSON.stringify(LK.st)); else save()}
const lkHas=st=>!!(st&&st.pinH&&st.pinH.h)||(st&&typeof st.pin==='string'&&st.pin.length===4);
async function pinCheck(pin){
  const T=lkS();
  if(!(T.pinH&&T.pinH.h)){ // an older version kept the plain digits: check once, then store only the hash
    if(typeof T.pin!=='string') return false;
    const ok=pin===T.pin; if(ok){T.pinH=await pinMake(pin); delete T.pin; lkSave()} return ok;
  }
  const h=await pinDerive(pin,T.pinH.s,+T.pinH.i||PIN_ITER);
  let d=h.length^T.pinH.h.length; for(let i=0;i<h.length;i++) d|=h.charCodeAt(i)^(T.pinH.h.charCodeAt(i)||0); return d===0;
}
