/* Settings */
function renderSettings(){
  renderSpace();
  applyTheme();
  renderCatList();
  renderPayList();
  $('#budgetInput').value=S.budget?S.budget:'';
  const fx=S.budgetMode==='fixed';
  document.querySelectorAll('#budgetSeg button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mode===S.budgetMode));
  $('#budgetFixed').hidden=!fx; $('#budgetOpen').hidden=fx;
  $('#alert80').checked=S.alert80;
  $('#lbl80').textContent=`لما أوصل ${S.alertPct}% من الميزانية`; $('#pctChip').textContent=S.alertPct+'%';
  const can=fx&&S.budget>0;
  $('#payday').value=String(S.payday);
  const P=periodOf(Date.now());
  $('#payHint').textContent= S.payday===1? 'الشهر بيبدأ من أول الشهر عادي' : 'شهرك الحالي من '+periodRange(P)+(S.payday>28?' (أو آخر يوم لو الشهر أقصر)':'');
  $('#remindToggle').checked=S.remind;
  $('#remindTimeChip').textContent=fmtRemAt(S.remindAt); $('#remindTimeChip').disabled=!S.remind; $('#remindTimeRow').classList.toggle('off',!S.remind);
  $('#dueToggle').checked=S.dueRemind;
  $('#sumToggle').checked=S.sumOn;
  try{renderCapSettings()}catch(e){console.error(e)}
  {let ex=true;try{ex=!(AB&&AB.exactAlarmsAllowed)||AB.exactAlarmsAllowed()}catch(e){} $('#exactRow').hidden=ex||!(S.remind||S.dueRemind)}
  $('#alert80').disabled=!can; $('#previewNotif').disabled=!can;
  $('#row80').classList.toggle('off',!can);
  $('#pctChip').disabled=!can||!S.alert80; $('#rowPct').classList.toggle('off',!can||!S.alert80);
  $('#alertsHint').textContent= can? 'هيظهرلك التنبيه مرة واحدة في الشهر لما توصل النسبة دي.' : 'التنبيهات بتشتغل لما تختار “تحديد ميزانية” وتكتب الرقم.';
  $('#pinToggle').checked=!!hasPin(); $('#lockChangeRow').hidden=!hasPin();
  renderMembers(); renderSetHome();
  $('#wgCard').hidden=!AB; $('#wgHide').checked=!!S.wgHide;
  {const bits=[]; if(S.lastBackup) bits.push('آخر نسخة يدوية: '+shortDate(S.lastBackup)+' '+timeStr(S.lastBackup)); if(AB&&S.lastAutoBk) bits.push('آخر نسخة تلقائية: '+shortDate(S.lastAutoBk)+' '+timeStr(S.lastAutoBk));
    $('#backupHint').textContent=(bits.length?bits.join(' · ')+'. ':'')+(AB?'النسخة اليدوية بتتحفظ كملف، اختار Google Drive من قايمة المشاركة واسترجعها من هناك في أي وقت.':bits.length?'':'احفظ نسخة من مصاريفك على السحابة واسترجعها في أي وقت.')}
  $('#autoBkChip').textContent=autoBkLabel(S.autoBkDays);
  try{paintDrive()}catch(e){} try{paintUpd()}catch(e){}
  const bioOk=!!(AB&&AB.canBiometric&&AB.canBiometric());
  $('#bioToggle').disabled=!(bioOk&&hasPin()); $('#bioToggle').checked=!!(S.bio&&hasPin()&&bioOk);
  $('#bioHint').textContent= !AB? 'بيشتغل في نسخة أندرويد' : !bioOk? 'الموبايل ده مفيهوش بصمة متسجلة' : !hasPin()? 'فعّل القفل بكلمة سر الأول' : 'افتح التطبيق ببصمتك بدل كلمة السر';
}

function renderAll(){
  userTextCache=null;
  /* each screen renders on its own: a problem in one of them must not leave the whole app blank */
  [renderMe,renderMeHome,renderGold,paintIpFee,renderIncome,renderAccounts,renderHome,renderLimCard,renderDebts,renderReports,()=>{if(!$('#reportsDetail').hidden)renderDetail()},()=>{if(!$('#reportsCategory').hidden)renderReportCategory()},()=>{if($('#searchSheet').classList.contains('open'))renderSearch()},bkePaint,renderSettings]
    .forEach(f=>{try{f()}catch(e){console.error(e)}});
}

/* Navigation */
let tab='expenses';
let fabIdleTimer;
function fabRest(){clearTimeout(fabIdleTimer);document.documentElement.classList.toggle('fab-awake',S.fabPin===true)} // pinned: the + and the mic always stay out, one tap does it
function fabWake(){
  document.documentElement.classList.add('fab-awake');
  clearTimeout(fabIdleTimer);fabIdleTimer=setTimeout(fabRest,3000);
}
['fab','micFab'].forEach(id=>{
  $('#'+id).addEventListener('click',e=>{
    const asleep=!document.documentElement.classList.contains('fab-awake');
    fabWake();
    if(asleep){e.preventDefault();e.stopImmediatePropagation()}
  },true);
  $('#'+id).addEventListener('keydown',e=>{if(e.key==='Escape')fabRest()});
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)fabRest()});
fabRest();
const TABS=['expenses','reports','debts','me','settings'];
/* Each tab remembers how far down its main screen you were (until the app closes). A page opened inside a tab
   (a settings section, managing the shared space, a report's details, search) closes when you leave the tab,
   and coming back puts you on the main screen at the place you opened it from. */
var tabY={};
function go(t){
  renderRest(); // a tab tapped in the very first moment
  if(t==='me'&&tab==='me'&&mePage){meGo(null);return}
  if(t==='settings'&&tab==='settings'&&(setPage||spManageOn)){if(spManageOn)spManage(false); setGo(null); return}
  if(t===tab){ if(t==='reports'&&$('#reportsMain').hidden) showSub('main'); else pageTopSmooth(); return }
  tabY[tab]=pageY();
  if(tab==='me'&&mePage){tabY.me=meHomeY; meGo(null,true)}
  if(tab==='settings'){ if(spManageOn) spManage(false); if(setPage){tabY.settings=setHomeY; setGo(null,true)} }
  if(tab==='reports'&&$('#reportsMain').hidden){tabY.reports=repMainY; showSub('main',true)}
  const dir=TABS.indexOf(t)-TABS.indexOf(tab); tab=t; fabRest();
  closeMenu();
  document.querySelectorAll('.view').forEach(v=>{
    const on=v.id==='v-'+t;
    if(on){v.style.setProperty('--dx',dir>0?'-24px':dir<0?'24px':'0px');v.classList.remove('active');void v.offsetWidth}
    v.classList.toggle('active',on)});
  document.querySelectorAll('.nav button').forEach(b=>{if(b.dataset.tab===t)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
  $('#fab').hidden = t==='settings'||t==='me'||t==='reports'; $('#micFab').hidden = t==='settings'||t==='me'||t==='reports'; $('#micFab').setAttribute('aria-label', t==='debts'?'إضافة بالصوت':'تسجيل مصروف بالصوت');
  if(t==='reports') renderReports();
  if(t==='debts') renderDebts();
  const y=tabY[t]||0; pageTo(y); if(y) requestAnimationFrame(()=>pageTo(y));
}
document.querySelectorAll('.nav button').forEach(b=>b.onclick=()=>go(b.dataset.tab));
$('#homeAv').onclick=()=>go('me');
$('#eyeBtn').onclick=()=>{S.hideAmt=!S.hideAmt;save();paintEye()};
$('#meBack').onclick=()=>go('expenses');
/* Swipe right / left to move between the main tabs. The tabs run right-to-left, so a swipe to the right opens the next one.
   Not while a sheet, the lock, a long-press sort or a form is in use, not inside a sub-page, and not on something that scrolls sideways. */
(function(){
  let sx=0, sy=0, st=0, ok=false;
  const hs=el=>{ for(let n=el; n&&n!==document.body&&n!==document.documentElement; n=n.parentElement){
    if(n.matches&&n.matches('input,textarea,select,canvas,[contenteditable="true"],.noswipe')) return true;
    if(n.scrollWidth>n.clientWidth+4){ const o=getComputedStyle(n).overflowX; if(o==='auto'||o==='scroll') return true } } return false };
  const busy=()=>$('#lock').classList.contains('open')||$('#mbPick').classList.contains('open')||!$('#welcome').hidden||!!document.querySelector('.sheet.open')||!$('#updLock').hidden||voiceOn||Date.now()<sortSuppress||!S.onboarded;
  const inSub=()=>(tab==='me'&&mePage)||(tab==='settings'&&(setPage||spManageOn))||(tab==='reports'&&$('#reportsMain').hidden);
  document.addEventListener('touchstart',e=>{ if(e.touches.length!==1){ok=false;return} const t=e.touches[0];
    ok= t.clientX>24&&t.clientX<innerWidth-24&&!hs(e.target); sx=t.clientX; sy=t.clientY; st=Date.now() },{passive:true});
  document.addEventListener('touchcancel',()=>{ok=false},{passive:true});
  document.addEventListener('touchend',e=>{ if(!ok) return; ok=false; const t=e.changedTouches[0], dx=t.clientX-sx, dy=t.clientY-sy;
    if(Date.now()-st>700||Math.abs(dx)<70||Math.abs(dy)>Math.abs(dx)*.55) return;
    if(busy()||inSub()||String(getSelection()).length) return;
    const step=dx>0?1:-1, j=TABS.indexOf(tab)+(document.documentElement.dir==='ltr'?-step:step); if(j>=0&&j<TABS.length) go(TABS[j]) },{passive:true});
})();

/* Sheet */
let selCat=null, editId=null, voiceOn=false;
let capOpen=null;   // the captured payment being turned into an expense: {id, ts}
let rcStage=null;   // receipt change waiting for "حفظ": null = no change, {blob} = new photo, 'del' = remove
const amtIn=$('#amountInput');
/* Calculator: the amount box accepts things like 45+30×2 */
const OPS=/[+\-×÷]/;
function cleanExpr(v){
  v=v.replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/(\d)[,،](?=\d{3}(?!\d))/g,'$1').replace(/[٫,،]/g,'.').replace(/[*xX]/g,'×').replace(/\//g,'÷').replace(/[−–]/g,'-').replace(/[^0-9.+\-×÷]/g,'');
  v=v.replace(/^[+×÷]+/,'').replace(/[+\-×÷]+(?=[+\-×÷])/g,'');
  return v.replace(/[0-9.]+/g,n=>cleanMoney(n)).slice(0,60);
}
function evalExpr(s){
  const raw=String(s??'').replace(/\s+/g,'').replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  const t=raw.match(/(?:\d+(?:\.\d*)?|\.\d+)|[+\-×÷]/g)||[];
  if(!t.length||t.join('')!==raw)return NaN;
  let i=0;
  const factor=()=>{let sign=1;if(t[i]==='-'||t[i]==='+')sign=t[i++]==='-'?-1:1;const v=t[i++];return v&&/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(v)?sign*Number(v):NaN};
  const product=()=>{let v=factor();while(t[i]==='×'||t[i]==='÷'){const op=t[i++],n=factor();v=op==='×'?v*n:n===0?NaN:v/n}return v};
  let result=product();while(t[i]==='+'||t[i]==='-'){const op=t[i++],n=product();result=op==='+'?result+n:result-n}
  return i===t.length&&Number.isFinite(result)?Math.round(result*100)/100:NaN;
}
function readAmt(){return evalExpr(amtIn.value)}
function setCalc(on){$('#calcRow').hidden=!on;$('#calcTg').setAttribute('aria-pressed',on)}
$('#calcTg').addEventListener('mousedown',e=>e.preventDefault());
$('#calcTg').onclick=e=>{e.preventDefault();setCalc($('#calcRow').hidden);amtIn.focus({preventScroll:true})};
function showCalc(){
  if(OPS.test(amtIn.value)&&$('#calcRow').hidden) setCalc(true);
  const v=amtIn.value, has=OPS.test(v.replace(/[+\-×÷]$/,'')), r=evalExpr(v);
  $('#calcRes').innerHTML= has&&isFinite(r)? `= <b>${fmt(r)}</b> ${CS()}` : '';
}
amtIn.addEventListener('input',()=>{
  const v=cleanExpr(amtIn.value);
  if(amtIn.value!==v) amtIn.value=v;
  $('#amountBox').classList.remove('err');$('#sheetErr').textContent='';showCalc();
});
function calcEquals(){const r=evalExpr(amtIn.value); if(OPS.test(amtIn.value)&&isFinite(r)&&r>0){amtIn.value=String(r);showCalc()}}
amtIn.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();calcEquals();amtIn.blur()}});
$('#calcOps').addEventListener('mousedown',e=>e.preventDefault());
$('#calcOps').onclick=e=>{const b=e.target.closest('[data-op]'); if(!b) return;
  if(b.dataset.op==='='){calcEquals()}
  else{const v=amtIn.value; if(!v) {amtIn.focus({preventScroll:true});return}
    amtIn.value=cleanExpr(v+b.dataset.op); showCalc()}
  amtIn.focus({preventScroll:true}); const L=amtIn.value.length; try{amtIn.setSelectionRange(L,L)}catch(_){}
  $('#amountBox').classList.remove('err');$('#sheetErr').textContent='';
};
function buildPad(el,onKey,withDot){
  const keys=['1','2','3','4','5','6','7','8','9',withDot?'.':'','0','⌫'];
  el.innerHTML=keys.map(k=>k?`<button type="button" data-k="${k}" aria-label="${k==='⌫'?'مسح':k}">${k}</button>`:'<span></span>').join('');
  el.onclick=e=>{const b=e.target.closest('button');if(b)onKey(b.dataset.k)};
}
function renderCatGrid(keepScroll){const n=S.cats.length, cols=Math.max(6,Math.ceil(n/2)); $('#cats').style.setProperty('--cols',cols); $('#cats').classList.toggle('wide',cols>6); if(!keepScroll) $('#cats').scrollLeft=0;
  $('#cats').innerHTML=S.cats.map(c=>`<button type="button" class="cat" data-cat="${esc(c.id)}" aria-pressed="false"><span class="e">${esc(c.e)}</span><span class="cat-name"${CATS.some(d=>d.id===c.id&&d.name===c.name)?'':' data-notr'}>${esc(c.name)}</span></button>`).join('')}
renderCatGrid(true); // at start: no scroll reset (it would force a full layout before the first frame)
$('#cats').onclick=e=>{const b=e.target.closest('.cat');if(!b)return;selCat=b.dataset.cat;markCat();renderNoteSug();$('#cats').classList.remove('err');$('#sheetErr').textContent=''};
/* Note suggestions: the notes you used most (and most recently) in the chosen category */
function noteSuggestions(cat,typed){
  const t=normAr(typed.trim()), score={}, show={};
  S.expenses.slice().sort((a,b)=>b.ts-a.ts).slice(0,600).forEach((x,i)=>{
    const n=(x.note||'').trim(); if(!n||x.cat!==cat) return; const k=normAr(n);
    if(!show[k]) show[k]=n; score[k]=(score[k]||0)+1+Math.max(0,1-i/600);
  });
  return Object.keys(score).filter(k=>!t||(k.includes(t)&&k!==t)).sort((a,b)=>score[b]-score[a]).slice(0,8).map(k=>show[k]);
}
function renderNoteSug(){
  const box=$('#noteSug'), list= selCat? noteSuggestions(selCat,$('#noteInput').value) : [];
  box.hidden=!list.length;
  box.innerHTML=list.map(n=>`<button type="button" data-sug="${esc(n)}">${esc(n)}</button>`).join('');
  box.scrollLeft=0;
}
$('#noteInput').addEventListener('input',renderNoteSug);
$('#noteSug').onclick=e=>{const b=e.target.closest('[data-sug]'); if(!b) return; $('#noteInput').value=b.dataset.sug; renderNoteSug()};
function markCat(){document.querySelectorAll('.cat').forEach(b=>b.setAttribute('aria-pressed',b.dataset.cat===selCat))}

let fxPending=null, plPending=null, selPay='cash';
