/* 5 wrong tries -> wait 30s, then 60s, 120s ... up to 15 minutes */
function pinWait(){const f=lkS().pinFail; return f&&+f.until>Date.now()? Math.ceil((f.until-Date.now())/1000) : 0}
function pinFailed(){const T=lkS(), f=T.pinFail=(T.pinFail&&typeof T.pinFail==='object')?T.pinFail:{n:0,until:0}; f.n=(+f.n||0)+1; if(f.n>=5) f.until=Date.now()+Math.min(15*60e3,30e3*2**(f.n-5)); lkSave()}
function pinOk(){const T=lkS(); if(T.pinFail){delete T.pinFail;lkSave()}}
const waitTxt=w=>w>90? `استنى ${Math.ceil(w/60)} دقيقة وجرب تاني` : `استنى ${w} ثانية وجرب تاني`;
/* FLAG_SECURE while a PIN is on: no screenshots and no preview of your numbers in the recent-apps screen */
function applySecure(){try{AB&&AB.setSecure&&AB.setSecure(hasPin())}catch(e){}}
/* migrate a plain PIN saved by an older version right away */
if(typeof S.pin==='string'&&!(S.pinH&&S.pinH.h)){ if(/^\d{4}$/.test(S.pin)){const p=S.pin; pinMake(p).then(h=>{if(S.pin===p){S.pinH=h;delete S.pin;save()}}).catch(()=>{})} else delete S.pin }
else if(S.pin!==undefined) delete S.pin;

let pinMode=null, pinBuf='', pinFirst='', pinBusy=false, pinChkFn=null;
function dots(el,n){el.querySelectorAll('i').forEach((d,i)=>d.classList.toggle('on',i<n))}
function shake(el){el.classList.remove('shake');void el.offsetWidth;el.classList.add('shake')}
buildPad($('#pinPad'),k=>{
  if(pinBusy) return;
  if(pinMode==='chk'){const w=pinWait(); if(w){$('#pinTitle').textContent=waitTxt(w);shake($('#pinDots'));return}}
  if(k==='⌫'){pinBuf=pinBuf.slice(0,-1)} else if(pinBuf.length<4) pinBuf+=k;
  dots($('#pinDots'),pinBuf.length);
  if(pinBuf.length===4){
    pinBusy=true; const typed=pinBuf;
    setTimeout(async()=>{
      try{
        if(pinMode==='set1'){pinFirst=typed;pinBuf='';pinMode='set2';$('#pinTitle').textContent='اكتب الرقم السري تاني للتأكيد';dots($('#pinDots'),0)}
        else if(pinMode==='set2'){
          if(typed===pinFirst){$('#pinTitle').textContent='لحظة...'; S.pinH=await pinMake(typed); S.lockKind='pin'; delete S.pin; delete S.pinFail; pinFirst=''; save();pinMode=null;closeSheets();renderSettings();applySecure();toast('اتفعل القفل بالرقم السري')}
          else{shake($('#pinDots'));pinBuf='';pinFirst='';pinMode='set1';$('#pinTitle').textContent='الرقمين مش زي بعض. اختار رقم سري تاني';dots($('#pinDots'),0)}
        }
        else if(pinMode==='chk'){
          if(await pinCheck(typed)){pinOk();pinMode=null;const fn=pinChkFn;pinChkFn=null;closeSheets();if(fn)fn()}
          else{pinFailed();shake($('#pinDots'));pinBuf='';dots($('#pinDots'),0);const w=pinWait();$('#pinTitle').textContent=w?waitTxt(w):'الرقم غلط، جرب تاني'}
        }
      }finally{pinBusy=false; if(pinBuf.length===4){pinBuf='';dots($('#pinDots'),0)}}
    },120);
  }
},false);
/* Lock setup: the member chooses a 4-digit PIN (keypad above) or a password (credSheet). Both are stored the same
   way (S.pinH, PBKDF2) and S.lockKind says which screen to show. */
let credMode=null, credKind='pin', credFn=null;
function credPaint(){const v=credMode==='verify', pass=v||credKind==='pass';
  document.querySelectorAll('#credSeg button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.kind===credKind));
  $('#credTitle').textContent=v?'اكتب كلمة السر الحالية':'اختار طريقة القفل';
  $('#credKindBox').hidden=v; $('#credPassBox').hidden=!pass; $('#credP2Wrap').hidden=v;
  $('#credP1').autocomplete=v?'current-password':'new-password';
  $('#credP1').placeholder=v?'كلمة السر':'كلمة سر (4 حروف أو أرقام على الأقل)';
  $('#credGo').textContent=v?'تأكيد':pass?'حفظ':'كمّل'; $('#credErr').textContent=''}
function credOpen(mode,fn){credMode=mode;credFn=fn||null;$('#credP1').value='';$('#credP2').value='';if(mode==='new')credKind=S.lockKind==='pass'?'pass':'pin';credPaint();openSheetEl('credSheet')}
function pinPadOpen(mode,title){pinBuf='';pinFirst='';dots($('#pinDots'),0);pinMode=mode;$('#pinTitle').textContent=title;openSheetEl('pinSheet')}
/* asks for the current PIN / password, then runs fn */
function credVerify(fn){
  if(S.lockKind==='pass'){credOpen('verify',fn);return}
  pinChkFn=fn; const w=pinWait(); pinPadOpen('chk',w?waitTxt(w):'اكتب الرقم السري الحالي');
}
$('#credSeg').onclick=e=>{const b=e.target.closest('[data-kind]'); if(b){credKind=b.dataset.kind;credPaint()}};
$('#credCancel').onclick=closeSheets;
['#credP1','#credP2'].forEach(id=>$(id).addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('#credGo').click()}}));
$('#credGo').onclick=async()=>{
  const b=$('#credGo'); if(b.disabled) return; const err=t=>{$('#credErr').textContent=t};
  if(credMode==='verify'){
    const w=pinWait(); if(w) return err(waitTxt(w));
    const v=$('#credP1').value; if(!v) return err('اكتب كلمة السر');
    b.disabled=true; let ok=false; try{ok=await pinCheck(v)}catch(e){} b.disabled=false;
    if(ok){pinOk(); const fn=credFn; credFn=null; closeSheets(); if(fn) fn()}
    else{pinFailed(); $('#credP1').value=''; const w2=pinWait(); err(w2?waitTxt(w2):'كلمة السر غلط، جرب تاني')}
    return;
  }
  if(credKind==='pin'){closeSheets(); pinPadOpen('set1','اختار رقم سري من 4 أرقام'); return}
  const p1=$('#credP1').value, p2=$('#credP2').value;
  if(p1.length<4) return err('كلمة السر لازم تكون 4 حروف أو أرقام على الأقل');
  if(p1!==p2) return err('كلمتين السر مش زي بعض');
  b.disabled=true; b.textContent='لحظة...';
  try{S.pinH=await pinMake(p1); S.lockKind='pass'; delete S.pin; delete S.pinFail; save(); closeSheets(); renderSettings(); applySecure(); toast('اتفعل القفل بكلمة السر')}
  catch(e){err('حصلت مشكلة، جرب تاني')}
  finally{b.disabled=false; credPaint()}
};
function lockOff(){S.pinH=null;delete S.pin;delete S.lockKind;S.bio=false;save();renderSettings();applySecure();$('#bioBtn').hidden=true;toast('اتلغى القفل')}
$('#pinToggle').onchange=e=>{
  const on=e.target.checked; e.target.checked=!!hasPin();
  if(on){credOpen('new');return}
  if(MB.list.length>1){toast('طول ما فيه أكتر من عضو على الموبايل، لازم كل عضو يكون ليه كلمة سر',null,null,4500);return}
  credVerify(lockOff);
};
$('#lockChange').onclick=()=>credVerify(()=>credOpen('new'));
$('#pinCancel').onclick=closeSheets;

let lockBuf='', lockBusy=false, lockMsgT=null;
function lockMsgPaint(){
  clearTimeout(lockMsgT); const el=$('#lockMsg'); if(!el) return;
  const w=pinWait();
  const T=lkS(), pass=T.lockKind==='pass';
  el.textContent= w? 'محاولات غلط كتير. '+waitTxt(w) : (T.pinFail&&T.pinFail.n? (pass?'كلمة السر غلط، جرب تاني':'الرقم غلط، جرب تاني') : (pass?'اكتب كلمة السر':'اكتب الرقم السري'));
  el.classList.toggle('err',!!(w||(T.pinFail&&T.pinFail.n)));
  if(w&&$('#lock').classList.contains('open')) lockMsgT=setTimeout(lockMsgPaint,1000);
}
function unlockApp(){
  if(LK){const id=LK.id; pinOk(); $('#lockMsg').textContent='لحظة...'; $('#lockMsg').classList.remove('err'); mbGo(id,true); return} // right PIN of another member: open his data
  pinOk();$('#lock').classList.remove('open');lockBuf='';dots($('#lockDots'),0);lockMsgPaint();runQuickAdd()}
buildPad($('#lockPad'),k=>{
  if(lockBusy) return;
  if(pinWait()){lockMsgPaint();shake($('#lockDots'));return}
  if(k==='⌫') lockBuf=lockBuf.slice(0,-1); else if(lockBuf.length<4) lockBuf+=k;
  dots($('#lockDots'),lockBuf.length);
  if(lockBuf.length===4){
    lockBusy=true; const typed=lockBuf;
    setTimeout(async()=>{
      let ok=false; try{ok=await pinCheck(typed)}catch(e){}
      if(ok) unlockApp(); else{pinFailed();shake($('#lockDots'));lockMsgPaint()}
      lockBuf='';dots($('#lockDots'),0);lockBusy=false;
    },120);
  }
},false);
/* things that should wait for the opening animation (the fingerprint prompt) */
var splashQ=[];
function afterSplash(fn){ if(document.documentElement.classList.contains('splash-on')) splashQ.push(fn); else fn() }
function lockPaintKind(){const T=lkS(), pass=T.lockKind==='pass', nm=LK?LK.name:ME.name;
  $('#lockDots').hidden=pass; $('#lockPad').hidden=pass; $('#lockPassBox').hidden=!pass;
  $('#lockName').textContent=MB.list.length>1&&nm?nm:'مليم'; $('#lockSwitch').hidden=MB.list.length<2;
  $('#bioBtn').hidden=!(AB&&T.bio&&lkHas(T))}
async function lockPassTry(){
  if(lockBusy) return; if(pinWait()){lockMsgPaint();shake($('#lockPassBox'));return}
  const v=$('#lockPass').value; if(!v) return;
  lockBusy=true; let ok=false; try{ok=await pinCheck(v)}catch(e){} lockBusy=false;
  $('#lockPass').value='';
  if(ok){$('#lockPass').blur();unlockApp()} else{pinFailed();shake($('#lockPassBox'));lockMsgPaint()}
}
$('#lockPassGo').onclick=lockPassTry;
$('#lockPass').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();lockPassTry()}});
/* Member picker: shown when the app starts with more than one member, and from the lock screen / settings */
let mbPickFrom=null;
function mbPickOpen(from){
  mbPickFrom=from;
  $('#mbPickList').innerHTML=MB.list.map(m=>`<button type="button" data-mb="${esc(m.id)}"><span class="mb-av" aria-hidden="true">${esc(mbInitial(m.name))}</span><span>${esc(m.name||'بدون اسم')}</span></button>`).join('');
  $('#mbPick').classList.add('open');
}
function mbPickClose(){$('#mbPick').classList.remove('open');mbPickFrom=null}
function mbInitial(n){const t=String(n||'').trim(); return t?[...t][0]:'؟'}
/* switch to another member: save, remember the choice, reload (his lock screen shows unless he was just created) */
function mbGo(id,unlocked){
  try{save()}catch(e){}
  MB.active=id; mbSave();
  try{sessionStorage.setItem('maleem.picked','1'); if(unlocked) sessionStorage.setItem('maleem.unlock',id)}catch(e){}
  location.reload();
}
/* the picked member's lock shows right away (his PIN / password is checked against his stored data) */
function lockShowFor(id){
  if(id===ME.id) LK=null;
  else{let st=null; try{st=JSON.parse(lsGet(mbKey(id))||'null')}catch(e){}
    const m=MB.list.find(x=>x.id===id);
    if(!st||typeof st!=='object'||!lkHas(st)){mbGo(id);return} // no lock to ask for: just open him
    LK={id,name:(m&&m.name)||'',st}}
  lockBuf=''; dots($('#lockDots'),0); $('#lockPass').value='';
  $('#lock').classList.add('open'); lockPaintKind(); lockMsgPaint(); setTimeout(askBio,250);
}
$('#mbPickList').onclick=e=>{const b=e.target.closest('[data-mb]'); if(!b) return; const id=b.dataset.mb;
  mbPickClose();
  if(id===ME.id&&!hasPin()){LK=null;$('#lock').classList.remove('open');runQuickAdd();return}
  lockShowFor(id);
};
$('#lockSwitch').onclick=()=>mbPickOpen('lock');
let mbPicked=false, mbSkipLock=false;
try{mbPicked=sessionStorage.getItem('maleem.picked')==='1'; mbSkipLock=sessionStorage.getItem('maleem.unlock')===ME.id; sessionStorage.removeItem('maleem.picked'); sessionStorage.removeItem('maleem.unlock')}catch(e){}
lockPaintKind();
if(hasPin()&&!mbSkipLock){$('#lock').classList.add('open');lockMsgPaint()}
if(MB.list.length>1&&!mbPicked) mbPickOpen('boot');
applySecure();
window.__bioResult=ok=>{if(ok) unlockApp()};
/* Launcher shortcut "مصروف جديد": opens the add sheet (after unlocking if the app is locked) */
let quickAddWanted=false, quickVoiceWanted=false, capWanted=false;
function runQuickAdd(){
  if($('#lock').classList.contains('open')||$('#mbPick').classList.contains('open')) return;
  if(capWanted){capWanted=false; capPull(); go('expenses'); renderHome(); setTimeout(()=>{const b=$('#capBox'); if(b&&b.firstChild) b.scrollIntoView({behavior:'smooth',block:'center'})},200)}
  if(quickAddWanted){quickAddWanted=false; quickVoiceWanted=false; go('expenses'); openSheet(); return}
  if(quickVoiceWanted){quickVoiceWanted=false; go('expenses'); try{closeSheets()}catch(e){} setTimeout(()=>{if(!voiceOn){fabWake();$('#micFab').click()}},250)}
}
window.__quickAdd=()=>{quickAddWanted=true; setTimeout(runQuickAdd,150)};
/* Launcher shortcut "تسجيل مصروف بالصوت": opens the voice card straight away (after unlocking if the app is locked) */
window.__quickVoice=()=>{quickVoiceWanted=true; setTimeout(runQuickAdd,150)};
function askBio(){const T=lkS(); if(AB&&T.bio&&lkHas(T)&&$('#lock').classList.contains('open')&&!$('#mbPick').classList.contains('open')){try{AB.authenticate()}catch(e){}}}
$('#bioBtn').hidden=!(AB&&S.bio&&hasPin()); $('#bioBtn').onclick=askBio;
if(hasPin()&&!mbSkipLock&&!$('#mbPick').classList.contains('open')) afterSplash(()=>setTimeout(askBio,250));
$('#bioToggle').onchange=e=>{S.bio=e.target.checked;save();$('#bioBtn').hidden=!S.bio;toast(S.bio?'اتفعل القفل بالبصمة':'اتقفل القفل بالبصمة')};
window.__relock=()=>{if(hasPin()&&!$('#lock').classList.contains('open')){LK=null;closeSheets();$('#lock').classList.add('open');lockPaintKind();lockMsgPaint();setTimeout(askBio,300)}};

/* ===== Members (settings card) ===== */
function renderMembers(){
  $('#mbList').innerHTML=MB.list.map(m=>{const me=m.id===ME.id;
    return `<div class="set-row mb-row"><span class="mb-av" aria-hidden="true">${esc(mbInitial(m.name))}</span><div class="txt">${esc(m.name||'بدون اسم')}<small>${me?'انت فاتح دلوقتي':'بياناته منفصلة وليه كلمة سر'}</small></div>${me?'':`<button class="btn danger" type="button" data-mb-del="${esc(m.id)}">مسح</button>`}</div>`}).join('');
  $('#mbSwitch').hidden=MB.list.length<2;
}
$('#mbSwitch').onclick=()=>mbPickOpen('settings');
$('#mbList').onclick=e=>{const b=e.target.closest('[data-mb-del]'); if(!b) return; const id=b.dataset.mbDel, m=MB.list.find(x=>x.id===id); if(!m||id===ME.id) return;
  if(!b.dataset.arm){b.dataset.arm='1'; b.textContent='دوس تاني للتأكيد'; clearTimeout(b._t); b._t=setTimeout(()=>{delete b.dataset.arm; b.textContent='مسح'},4000);
    toast(`هيتمسح ${m.name||'العضو'} وكل بياناته من الموبايل ده، ومفيش رجوع`,null,null,4000); return}
  mbDelete(id);
};
function mbDelete(id){
  const m=MB.list.find(x=>x.id===id); if(!m||id===ME.id) return;
  let inSpace=false; try{const o=JSON.parse(lsGet(mbKey(id))||'{}'); inSpace=!!(o.space&&o.space.code)}catch(e){}
  MB.list=MB.list.filter(x=>x.id!==id); mbSave();
  try{localStorage.removeItem(mbKey(id))}catch(e){} delete mem[mbKey(id)];
  try{indexedDB.deleteDatabase(rcDbName(id))}catch(e){}
  try{indexedDB.deleteDatabase(`firestore/${fbAppName(id)}/${FB_CFG.projectId}/main`)}catch(e){}
  renderMembers();
  toast(inSpace?`اتمسح ${m.name||'العضو'} وبياناته. كان في مساحة مشتركة، فهيفضل ظاهر فيها لحد ما صاحبها يشيله`:`اتمسح ${m.name||'العضو'} وكل بياناته من الموبايل ده`,null,null,6000);
}
let mbKind='pin';
const digitsEn=v=>String(v).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d));
const mbNorm=v=>String(v||'').trim().replace(/\s+/g,' ').toLowerCase();
function mbKindSet(k){mbKind=k; const pin=k==='pin';
  document.querySelectorAll('#mbSeg button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.kind===k));
  $('#mbPassLab').textContent=pin?'الرقم السري':'كلمة السر';
  ['#mbP1','#mbP2'].forEach((sel,i)=>{const el=$(sel); el.value=''; el.inputMode=pin?'numeric':'text'; el.maxLength=pin?4:64;
    el.placeholder=pin?(i?'اكتب الرقم تاني للتأكيد':'رقم سري من 4 أرقام'):(i?'اكتب كلمة السر تاني للتأكيد':'كلمة سر (4 حروف أو أرقام على الأقل)')});
  $('#mbErr').textContent=''}
$('#mbSeg').onclick=e=>{const b=e.target.closest('[data-kind]'); if(b) mbKindSet(b.dataset.kind)};
$('#mbAdd').onclick=()=>{
  if(!hasPin()){toast('عشان تضيف عضو، اعمل كلمة سر لنفسك الأول، عشان محدش يفتح بياناتك',null,null,5000); credOpen('new'); return}
  if(MB.list.length>=MB_MAX){toast(`أقصى عدد ${MB_MAX} أعضاء على الموبايل`);return}
  $('#mbName').value=''; mbKindSet('pin'); openSheetEl('mbSheet');
};
$('#mbCancel').onclick=closeSheets;
['#mbName','#mbP1','#mbP2'].forEach(id=>$(id).addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('#mbGo').click()}}));
function mbNewId(){const a='abcdefghijkmnpqrstuvwxyz23456789';let id;do{const r=new Uint32Array(8);crypto.getRandomValues(r);id='m'+Array.from(r,x=>a[x%32]).join('')}while(MB.list.some(m=>m.id===id));return id}
$('#mbGo').onclick=async()=>{
  const b=$('#mbGo'); if(b.disabled) return; const err=t=>{$('#mbErr').textContent=t};
  const name=$('#mbName').value.trim().replace(/\s+/g,' ').slice(0,24);
  if(!name) return err('اكتب اسم العضو');
  if(MB.list.some(m=>mbNorm(m.name)===mbNorm(name))) return err('فيه عضو بنفس الاسم، اختار اسم تاني');
  let p1=$('#mbP1').value, p2=$('#mbP2').value;
  if(mbKind==='pin'){p1=digitsEn(p1);p2=digitsEn(p2); if(!/^\d{4}$/.test(p1)) return err('الرقم السري لازم يكون 4 أرقام')}
  else if(p1.length<4) return err('كلمة السر لازم تكون 4 حروف أو أرقام على الأقل');
  if(p1!==p2) return err(mbKind==='pin'?'الرقمين مش زي بعض':'كلمتين السر مش زي بعض');
  b.disabled=true; b.textContent='لحظة...';
  try{
    const id=mbNewId(), ns={onboarded:false,profile:{name,age:null},pinH:await pinMake(p1),lockKind:mbKind,theme:S.theme,accent:S.accent,style:S.style,look:S.look,font:S.font,fontW:S.fontW,press:S.press,trans:S.trans,haptic:S.haptic,currency:S.currency,curs:S.curs};
    if(!lsSet(mbKey(id),JSON.stringify(ns))){try{localStorage.removeItem(mbKey(id))}catch(e){} delete mem[mbKey(id)]; err('مساحة التخزين مش كفاية لعضو جديد'); return}
    MB.list.push({id,name}); mbGo(id,true);
  }catch(e){err('حصلت مشكلة، جرب تاني')}
  finally{b.disabled=false; b.textContent='إضافة'}
};

