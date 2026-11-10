/* ===== Google Drive (Android): link a Google account once ===== */
const DRIVE_ERR={cancel:'اتلغى الربط',config:'ربط Google Drive لسه مش متجهّز من ناحية المطوّر (Google Cloud)',api:'Google Drive API مش متفعّل في مشروع المطوّر',
  gms:'الموبايل ده مفيهوش خدمات Google Play، فمش هينفع يربط Drive',auth:'جوجل محتاج توافق تاني: دوس «نسخة دلوقتي»',
  net:'مفيش اتصال بالنت',full:'مساحة Google Drive بتاعتك اتملت',gone:'فولدر Maleem مش موجود',http:'حصلت مشكلة في Google Drive',other:'حصلت مشكلة في Google Drive'};
const driveErrMsg=c=>DRIVE_ERR[c]||DRIVE_ERR.other;
const driveCbs={}; let driveBusy=false;
window.__driveRes=(id,json)=>{const f=driveCbs[id]; delete driveCbs[id]; let r={ok:false,err:'other'}; try{r=JSON.parse(json)}catch(e){} if(f) f(r)};
function driveCall(fn,cb){const id='d'+uid().replace(/[^a-z0-9]/gi,'').slice(0,16); driveCbs[id]=cb; fn(id)}
/* uploads one backup; on failure counts it, and says so after 3 failures in a row (or at once when Google wants the user) */
function driveSend(name,b64,interactive,done){
  if(!S.drive||!AB||!AB.driveUpload||driveBusy){if(done) done(false); return}
  driveBusy=true; S.driveTryAt=Date.now(); paintDrive();
  const email=S.drive.email;
  driveCall(id=>AB.driveUpload(id,email,name,b64,!!interactive),r=>{
    driveBusy=false;
    if(!S.drive||S.drive.email!==email){paintDrive(); if(done) done(false); return} // unlinked meanwhile
    if(r.ok){S.lastDriveBk=Date.now(); S.driveFails=0; S.driveErr=null}
    let warned=false;
    if(!r.ok){S.driveFails=(+S.driveFails||0)+1; S.driveErr=String(r.err||'other');
      if(!interactive&&!$('#lock').classList.contains('open')&&(S.driveFails===3||(S.driveErr==='auth'&&S.driveFails===1)))
        {warned=true; toast('⚠️ الرفع على Google Drive مش شغال','السبب',()=>{go('settings');setGo('backup')},8000)}}
    save(); renderSettings(); if(done) done(!!r.ok,r.err,warned);
  });
}
const bkWhen=x=>shortDate(x)+' '+timeStr(x);
function paintDrive(){
  const on=!!(AB&&AB.driveLink&&AB.autoBackup); $('#bkAuto').hidden=!on; if(!on) return;
  const linked=!!S.drive;
  $('#driveOff').hidden=linked; $('#driveOn').hidden=!linked; $('#bkToWrap').hidden=!linked;
  $('#backupBtnTxt').textContent='نسخة دلوقتي';
  $('#backupHint').textContent=linked
    ?'نسخك بتترفع على Google Drive بتاعك في فولدر «Maleem». مليم بيشوف الملفات اللي هو عملها بس، وبنحتفظ بآخر 7 نسخ.'
    :'اربط حساب جوجل، ونسخك هتترفع على Google Drive لوحدها كل فترة تختارها. مليم بيشوف الملفات اللي هو عملها بس، ومش بيشوف أي حاجة تانية في الـ Drive. ولحد ما تربط، النسخ بتتحفظ على الموبايل في Download/Maleem.';
  if(linked){ $('#driveEmail').textContent=S.drive.email;
    document.querySelectorAll('#bkToSeg [data-to]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.to===bkTo())) }
  const st=$('#driveStatus'), bits=[];
  if(driveBusy) bits.push('بنرفع نسخة دلوقتي...');
  else{
    if(!(+S.autoBkDays>0)) bits.push('النسخ التلقائي مقفول، والنسخ بتتعمل بس لما تدوس «نسخة دلوقتي»');
    if(linked){
      bits.push(S.lastDriveBk?'آخر رفع على Drive: '+bkWhen(S.lastDriveBk):'لسه مترفعش نسخ على Drive');
      if(bkTo()==='both'&&S.lastAutoBk) bits.push('آخر نسخة على الموبايل: '+bkWhen(S.lastAutoBk));
      if(S.driveFails&&S.driveErr) bits.push('آخر محاولة فشلت: '+driveErrMsg(S.driveErr));
    } else bits.push(S.lastAutoBk?'آخر نسخة على الموبايل: '+bkWhen(S.lastAutoBk):'لسه معملتش نسخة');
  }
  st.textContent=bits.join('. ')+(bits.length?'.':''); st.classList.toggle('err',linked&&!driveBusy&&!!S.driveFails);
}
$('#driveLink').onclick=()=>{
  if(!AB||!AB.driveLink) return; const b=$('#driveLink'); if(b.disabled) return; b.disabled=true; b.textContent='لحظة...';
  driveCall(id=>AB.driveLink(id),r=>{
    b.disabled=false; b.textContent='ربط Google Drive';
    if(!r.ok){ if(r.err!=='cancel') toast(driveErrMsg(r.err),null,null,6000); return }
    S.drive={email:String(r.email||'حساب جوجل').slice(0,120)}; S.driveFails=0; S.driveErr=null; S.lastDriveBk=0;
    if(S.autoBkTo==='device') S.autoBkTo='both';
    save(); renderSettings(); toast('اتربط Google Drive. بنرفع أول نسخة...');
    setTimeout(()=>backupNow(false),400);
  });
};
$('#bkToSeg').onclick=e=>{const b=e.target.closest('[data-to]'); if(!b||b.dataset.to===S.autoBkTo) return;
  S.autoBkTo=b.dataset.to; save(); renderSettings();
  toast(S.autoBkTo==='drive'?'النسخ هتترفع على Google Drive بس':'النسخ هتترفع على Google Drive وتتحفظ على الموبايل كمان'); setTimeout(maybeAutoBackup,500)};
armBtn($('#driveUnlink'),'فك الربط','دوس تاني للتأكيد',()=>{
  if(!S.drive) return; try{AB.driveForget(S.drive.email)}catch(e){}
  S.drive=null; S.autoBkTo='both'; S.driveFails=0; S.driveErr=null; S.lastDriveBk=0; save(); renderSettings();
  toast('اتفك الربط، والنسخ هتتحفظ على الموبايل لحد ما تربط تاني. النسخ اللي على Drive زي ما هي',null,null,8000)});

/* ===== Restore (Android): pick a Google account -> Maleem finds its newest backup on that Drive -> restore.
   The newest backup on the chosen account is restored automatically; existing restore undo remains available.
   Afterwards the same account stays linked, so automatic backups carry on there. ===== */
var RS={seq:0,busy:false,email:'',hold:null}; // var on purpose: closeSheets() may run before this line
const RS_ERR={gms:'الموبايل ده مفيهوش خدمات Google Play، فاستعمل «من ملف على الموبايل»',config:DRIVE_ERR.config,api:DRIVE_ERR.api,
  auth:'جوجل ماسمحش لمليم يوصل للـ Drive بتاع الحساب ده. جرّب تاني',net:'مفيش اتصال بالنت. اتأكد من النت وجرّب تاني',
  gone:'النسخة دي اتمسحت من Drive. جرّب تاني',big:'النسخة دي كبيرة أوي ومعرفناش نفتحها',bad:'الملف ده مش نسخة سليمة من مليم',enc:'النسخة دي مشفّرة وماتفتحتش',
  http:'حصلت مشكلة في Google Drive. جرّب تاني بعد شوية',other:'حصلت مشكلة في Google Drive. جرّب تاني بعد شوية'};
const rsOpen=()=>$('#rsSheet').classList.contains('open');
function rsView(v,err){
  const id='rs'+v.charAt(0).toUpperCase()+v.slice(1); // 'home' -> #rsHome
  ['rsHome','rsBusy','rsPick','rsAsk'].forEach(i=>{$('#'+i).hidden=i!==id});
  const e=$('#rsErr'); e.hidden=!err; e.textContent=err||'';
  $('#rsGo').hidden=v!=='ask';
  $('#rsDrive').textContent=RS.email&&err?'جرّب حساب تاني':'من Google Drive';
}
function rsBusy(t){$('#rsBusyTxt').textContent=t; rsView('busy')}
function openRestore(){
  if(!AB) return;
  if(!AB.driveList){$('#restoreFile').click();return}
  closeSheets(); RS.email='';
  rsView('home'); $('#scrim').classList.add('hi'); openSheetEl('rsSheet');
}
/* Maleem-<name>-auto-<yyyy-mm-dd>.json, newest first -> one entry per member name with its newest file */
function rsGroups(files){
  const by=new Map();
  (Array.isArray(files)?files:[]).forEach(f=>{
    if(!f||typeof f.id!=='string'||typeof f.name!=='string') return;
    const m=/^Maleem(?:-(.+?))?-auto-\d{4}-\d{2}-\d{2}\.json$/.exec(f.name); if(!m) return;
    const who=(m[1]||'').slice(0,24), at=+f.at||0, g=by.get(who);
    if(!g) by.set(who,{who,f:{id:f.id,at},n:1,fs:[{id:f.id,at}]}); else{g.n++; g.fs.push({id:f.id,at}); if(at>g.f.at) g.f={id:f.id,at}}
  });
  const me=String(ME.name||(S.profile&&S.profile.name)||'');
  by.forEach(g=>g.fs.sort((a,b)=>b.at-a.at));
  return [...by.values()].sort((a,b)=>(b.who===me)-(a.who===me)||b.f.at-a.f.at);
}
$('#rsDrive').onclick=()=>{
  if(RS.busy||!AB||!AB.driveList) return;
  RS.busy=true; const seq=++RS.seq; rsBusy('اختار حساب جوجل...');
  driveCall(id=>AB.driveList(id),r=>{
    if(seq!==RS.seq||!rsOpen()) return; RS.busy=false;
    if(!r.ok){rsView('home',r.err==='cancel'?'':(RS_ERR[r.err]||RS_ERR.other)); return}
    RS.email=String(r.email||'').slice(0,120);
    const gs=rsGroups(r.files);
    if(!gs.length){rsView('home',`مفيش نسخ احتياطية من مليم على ${RS.email||'الحساب ده'}`); return}
    const latest=gs.map(g=>g.f).sort((a,b)=>b.at-a.at)[0];
    rsFetch(latest);
  });
};
function rsFetch(f){
  RS.busy=true; const seq=++RS.seq; rsBusy('بننزّل نسخة '+bkWhen(f.at)+'...');
  driveCall(id=>AB.driveFetch(id,RS.email,f.id),r=>{
    let txt=''; try{txt=r.ok?String(AB.driveTake()||''):''}catch(e){}
    if(seq!==RS.seq||!rsOpen()) return; RS.busy=false;
    if(!r.ok){rsView('home',RS_ERR[r.err]||RS_ERR.other); return}
    const finish=b=>{
      if(seq!==RS.seq||!rsOpen()) return;
      if(b&&b.cancel){rsView('home',RS_ERR.enc); return}
      if(!b){rsView('home',RS_ERR.bad); return}
      const at=+b.o.at>0&&+b.o.at<MAXTS?+b.o.at:(f.at||Date.now());
      RS.hold={b,at,email:RS.email};
      rsApply();
    };
    if(bkSniffEnc(txt)) bkOpen(txt).then(finish,()=>finish(null)); else finish(bkParse(txt)); // a plain backup stays synchronous
  });
}

function rsApply(){
  const h=RS.hold; if(!h) return;
  closeSheets(); bkRestore(h.b,h.at);
  // keep backing up to the account the backup came from
  if(h.email&&AB.driveUpload){
    const same=S.drive&&S.drive.email.toLowerCase()===h.email.toLowerCase();
    if(!same){ if(S.drive) try{AB.driveForget(S.drive.email)}catch(e){}
      S.drive={email:h.email}; S.driveFails=0; S.driveErr=null; S.lastDriveBk=h.at }
    else S.lastDriveBk=Math.max(+S.lastDriveBk||0,h.at);
    if(S.autoBkTo==='device') S.autoBkTo='both';
    save(); renderSettings();
  }
}
$('#rsGo').onclick=rsApply;
$('#rsFile').onclick=()=>{closeSheets(); $('#restoreFile').click()};
$('#rsCancel').onclick=closeSheets;

function autoBkPaint(v){
  v=Math.min(30,Math.max(0,Math.round(+v)||0)); $('#autoBkRange').value=v; $('#autoBkBig').textContent=autoBkLabel(v);
  document.querySelectorAll('#autoBkPresets button').forEach(b=>b.classList.toggle('on',+b.dataset.d===v)); return v;
}
$('#autoBkChip').onclick=()=>{autoBkPaint(S.autoBkDays); openSheetEl('autoBkSheet')};
$('#autoBkRange').oninput=e=>autoBkPaint(e.target.value);
$('#autoBkPresets').onclick=e=>{const b=e.target.closest('[data-d]'); if(b) autoBkPaint(b.dataset.d)};
$('#autoBkCancel').onclick=closeSheets;
$('#autoBkSave').onclick=()=>{S.autoBkDays=autoBkPaint($('#autoBkRange').value); save(); closeSheets(); renderSettings();
  toast(S.autoBkDays? 'هنعمل نسخة احتياطية تلقائية '+autoBkLabel(S.autoBkDays) : 'اتقفل النسخ الاحتياطي التلقائي'); setTimeout(maybeAutoBackup,500)};

/* ===== Updates from GitHub (Android, release builds): update.json says the newest version, its APK, the oldest
   version still allowed, and an optional message. Kotlin (Updater.kt) reads it, downloads + checks the APK, and opens
   Android's installer. "Skip this version" and "message seen" are kept per phone, not per member. ===== */
const UPDK='maleem.upd';
let UPD={st:null,phase:'idle',pct:0,msg:'',manual:false,retried:false,offered:0}; // offered: shown once per app session
function updLocal(){try{return JSON.parse(lsGet(UPDK)||'{}')||{}}catch(e){return {}}}
function updLocalSet(k,v){const o=updLocal(); o[k]=v; lsSet(UPDK,JSON.stringify(o))}
function updLatest(){const st=UPD.st; if(!st||!st.enabled) return null; const L=(st.info&&st.info.latest)||{};
  const code=Math.floor(+L.code||0); return code>(+st.cur||0)&&typeof L.apk==='string'&&/^https:\/\//.test(L.apk)?{code,name:String(L.name||'').slice(0,20),apk:L.apk,sha:String(L.sha256||''),notes:String(L.notes||'').split(/\r?\n/).map(s=>s.trim()).join('\n').trim().slice(0,1500)}:null}
/* "update required" only when there is a newer APK to install: a wrong minCode never locks people out */
const updForced=()=>{const st=UPD.st, L=updLatest(); return !!(L&&st&&+((st.info||{}).minCode)>(+st.cur||0))};
function updLabel(){const st=UPD.st; if(!st) return 'دوس عشان تدوّر على تحديث'; if(!st.enabled) return 'نسخة تجربة، مش بتدوّر على تحديثات';
  if(UPD.manual) return 'بدوّر على تحديث...';
  if(UPD.phase==='down') return 'بيحمّل التحديث... '+UPD.pct+'%';
  if(UPD.phase==='ready') return 'التحديث جاهز، دوس عشان تثبّته';
  const L=updLatest(); return L?'فيه نسخة جديدة '+(L.name||'')+'، دوس عشان تحدّث':'عندك آخر نسخة'+(st.curName?' ('+st.curName+')':'')+'، دوس عشان تدوّر'}
const UPD_ERR={net:'التحميل وقف. اتأكد من النت ودوس تاني، وهيكمّل من مكان ما وقف',http:'ملف التحديث مش موجود على GitHub دلوقتي، جرب كمان شوية',
  sha:'الملف اللي نزل مش مطابق للنسخة المنشورة، دوس تاني',sig:'الملف ده مش متوقّع بمفتاح مليم، فمش هنثبّته',pkg:'الملف اللي نزل مش تطبيق مليم',apk:'الملف اللي نزل بايظ، دوس تاني',
  old:'النسخة دي مش أحدث من اللي عندك',url:'رابط التحديث مش من GitHub، فمش هنحمّله',big:'ملف التحديث كبير بشكل غريب، مش هنحمّله',io:'مفيش مساحة كفاية على الموبايل',busy:'التحميل شغال فعلًا'};
function updPaintBar(bar){bar.hidden=UPD.phase!=='down'; bar.firstChild.style.width=UPD.pct+'%'}
function paintUpd(){
  const L=updLatest(), down=UPD.phase==='down';
  const goTxt=down?'بيحمّل... '+UPD.pct+'%':UPD.phase==='ready'?'تثبيت':'تحديث'+(L&&L.name?' لـ '+L.name:'');
  // sheet
  if($('#updSheet').dataset.mode==='update'&&L){updPaintBar($('#updBar')); $('#updMsg').textContent=UPD.msg; $('#updGo').textContent=goTxt; $('#updGo').disabled=down; $('#updLater').textContent=down?'إخفاء':'بعدين'}
  // forced screen
  const lk=$('#updLock'); lk.hidden=!updForced();
  if(!lk.hidden&&L){$('#updLockNotes').textContent=L.notes; updPaintBar($('#updLockBar')); $('#updLockMsg').textContent=UPD.msg; $('#updLockGo').textContent=down?'بيحمّل... '+UPD.pct+'%':UPD.phase==='ready'?'تثبيت':'تحديث دلوقتي'; $('#updLockGo').disabled=down}
  try{setSub('update',()=>updLabel())}catch(e){}
}
function updStart(){
  const L=updLatest(); if(!L||!AB||!AB.updateDownload) return;
  if(UPD.phase==='ready'){updInstall();return}
  if(UPD.phase==='down') return;
  UPD.phase='down'; UPD.pct=0; UPD.msg='بيحمّل التحديث، تقدر تكمّل شغلك عادي'; paintUpd();
  AB.updateDownload(L.apk,L.sha,String(L.code));
}
function updInstall(){
  let r='err'; try{r=AB.updateInstall()}catch(e){}
  if(r==='missing'){UPD.phase='idle'; updStart(); return}
  UPD.msg=r==='perm'?'اسمح لمليم بتثبيت التطبيقات من الشاشة اللي فتحت، وارجع، والتثبيت هيبدأ لوحده':r==='ok'?'كمّل التثبيت من شاشة أندرويد':'مقدرتش أفتح شاشة التثبيت، دوس تاني';
  paintUpd();
}
window.__updProgress=p=>{UPD.pct=Math.max(0,Math.min(100,+p||0)); paintUpd()};
window.__updDone=err=>{
  if(!err){UPD.phase='ready'; UPD.pct=100; UPD.msg='التحديث جاهز'; paintUpd();
    // the sheet (or the "update required" screen) is open: install now. Hidden with «إخفاء»: don't pop up the installer
    if($('#updSheet').classList.contains('open')||!$('#updLock').hidden) updInstall();
    else if(!$('#lock').classList.contains('open')) toast('التحديث جاهز','تثبيت',()=>updInstall(),10000);
    return}
  if(err==='busy') return;
  if(err==='retry'&&!UPD.retried){UPD.retried=true; UPD.phase='idle'; updStart(); return}
  UPD.phase='idle'; UPD.msg=UPD_ERR[err]||'حصلت مشكلة في التحميل، دوس تاني'; paintUpd();
};
window.__updPermDenied=()=>{UPD.msg='لازم تسمح لمليم بتثبيت التطبيقات عشان التحديث يتثبت. دوس «تثبيت» تاني'; paintUpd()};
function updSheetOpen(L){
  UPD.offered=L.code; const sh=$('#updSheet');
  sh.dataset.mode='update'; $('#updIco').textContent='✨'; $('#updTitle').textContent='فيه نسخة جديدة من مليم';
  $('#updSub').textContent=(L.name?'النسخة '+L.name:'')+(UPD.st.curName?' · عندك '+UPD.st.curName:'');
  $('#updNotes').textContent=L.notes; $('#updLater').textContent='بعدين'; $('#updGo').hidden=false;
  paintUpd(); openSheetEl('updSheet');
}
/* the "التحديثات" row in settings: look now (or show the update already found / downloading) */
function updManualCheck(){
  if(!AB||!AB.updateCheck) return;
  if(UPD.st&&!UPD.st.enabled){toast('دي نسخة التجربة، ومش بتدوّر على تحديثات');return}
  const L=updLatest(); if(L&&UPD.phase!=='idle'){updSheetOpen(L);return}
  if(UPD.manual) return;
  UPD.manual=true; paintUpd(); AB.updateCheck(true);
}
/* the sheet waits until nothing else is on screen (lock, welcome, another sheet) */
let updShowT=null;
function updOffer(tries){
  clearTimeout(updShowT);
  const busy=$('#lock').classList.contains('open')||$('#mbPick').classList.contains('open')||!$('#welcome').hidden||!!document.querySelector('.sheet.open')||!$('#updLock').hidden||voiceOn;
  if(busy){ if((tries||0)<150) updShowT=setTimeout(()=>updOffer((tries||0)+1),2000); return }
  const L=updLatest(), loc=updLocal(), info=(UPD.st&&UPD.st.info)||{}, m=info.message||{};
  const sh=$('#updSheet');
  if(L&&UPD.offered!==L.code){updSheetOpen(L); return}
  const mid=String(m.id||'').slice(0,60), mtx=String(m.text||'').slice(0,1500).trim();
  if(mid&&mtx&&loc.seen!==mid){
    sh.dataset.mode='msg'; $('#updIco').textContent='📣'; $('#updTitle').textContent='رسالة من مليم'; $('#updSub').textContent='';
    $('#updNotes').textContent=mtx; $('#updBar').hidden=true; $('#updMsg').textContent=''; $('#updGo').hidden=true; $('#updLater').textContent='تمام';
    updLocalSet('seen',mid); openSheetEl('updSheet');
  }
}
window.__updInfo=json=>{ // (json|null, errorCode): only whether it came matters here
  const manual=UPD.manual; UPD.manual=false;
  if(json){try{UPD.st=JSON.parse(json)}catch(e){}}
  paintUpd();
  if(manual){
    if(!json){toast('مقدرتش أوصل لـ GitHub، اتأكد من النت',null,null,4000);return}
    const L=updLatest(); if(!L){toast('عندك آخر نسخة من مليم');return}
    if(!updForced()){closeSheets(); updSheetOpen(L)} // asked for it: show it even if "بعدين" was pressed before
    return;
  }
  if(json&&!updForced()) afterSplash(()=>updOffer(0));
};
$('#updGo').onclick=()=>{ if($('#updSheet').dataset.mode==='nudge') nudgeGo(); else updStart() };
/* «بعدين» only hides the sheet: nothing is skipped. It comes back the next time the app opens, and the «التحديثات» row in
   settings opens it any time. While downloading the button says «إخفاء» and the download carries on. */
$('#updLater').onclick=()=>closeSheets();
$('#updLockGo').onclick=()=>updStart();
$('#updLockSave').onclick=()=>{try{$('#backupBtn').click()}catch(e){}};
/* first look after the first frame (the bridge call is synchronous): the saved copy applies "update required" offline too */
function updBoot(){
  if(!AB||!AB.updateState) return;
  {const o=updLocal(); if('skip' in o){delete o.skip; lsSet(UPDK,JSON.stringify(o))}} // the old "skip this version" mark
  try{UPD.st=JSON.parse(AB.updateState())}catch(e){}
  if(UPD.st&&UPD.st.curName){const v=document.querySelector('.dev2 .dv-ver'); if(v) v.textContent='v'+UPD.st.curName}
  paintUpd();
  if(UPD.st&&UPD.st.enabled) AB.updateCheck(false);
}

/* A gentle reminder now and then (support / suggestions), inside the same sheet as «رسالة من مليم».
   Only after 10 days of use and 15 expenses, then every 14 to 30 days at random, at most 3 times in all, never while anything else
   is on screen or an update / developer message is waiting, and «مش عايز أشوف دي تاني» stops it for good.
   Its state lives under its own key, so it is not part of backups or shared spaces. */
const NUDGE_KEY='maleem.nudge', NUDGE_MAX=3, NUDGE_AFTER_DAYS=10, NUDGE_MIN_EXPENSES=15, NUDGE_GAP=[14,30];
const NUDGES=[
  {ico:'❤️',title:'مليم مجاني وبدون إعلانات',text:'لو مليم فادك وعاجبك، تقدر تدعمه من الإعدادات. أي مبلغ بيساعده يكمّل.',go:'support',btn:'ادعم مليم'},
  {ico:'💡',title:'عندك فكرة أو لقيت مشكلة؟',text:'ابعتلنا اقتراحك أو مشكلتك من «اقتراحات وملاحظات»، وبنقراها كلها.',go:'feedback',btn:'ابعت ملاحظة'}
];
let NUDGE_CUR=null;
function nudgeState(){try{const o=JSON.parse(lsGet(NUDGE_KEY)||'{}'); return o&&typeof o==='object'?o:{}}catch(e){return {}}}
function nudgeSave(o){lsSet(NUDGE_KEY,JSON.stringify(o))}
function nudgeDue(now,st,expenses){
  return !st.off&&(+st.shown||0)<NUDGE_MAX&&+st.first>0&&now-st.first>=NUDGE_AFTER_DAYS*864e5&&expenses>=NUDGE_MIN_EXPENSES&&now>=(+st.next||0);
}
function nudgeBusy(){
  return $('#lock').classList.contains('open')||$('#mbPick').classList.contains('open')||!$('#welcome').hidden||!!document.querySelector('.sheet.open')||!$('#updLock').hidden||voiceOn||!$('#rcView').hidden;
}
function nudgeOffer(tries){
  const now=Date.now(), st=nudgeState();
  if(!nudgeDue(now,st,S.expenses.length)) return;
  const info=(UPD.st&&UPD.st.info)||{}, m=info.message||{};
  if(updLatest()||(m.id&&m.text&&updLocal().seen!==String(m.id).slice(0,60))) return; // an update or a message from the developer comes first
  if(nudgeBusy()){ if((tries||0)<60) setTimeout(()=>nudgeOffer((tries||0)+1),5000); return }
  let i=Math.floor(Math.random()*NUDGES.length); if(NUDGES.length>1&&i===st.lastIdx) i=(i+1)%NUDGES.length;
  st.shown=(+st.shown||0)+1; st.last=now; st.lastIdx=i;
  st.next=now+(NUDGE_GAP[0]+Math.random()*(NUDGE_GAP[1]-NUDGE_GAP[0]))*864e5;
  nudgeSave(st);
  const n=NUDGES[i], sh=$('#updSheet'); NUDGE_CUR=n;
  sh.dataset.mode='nudge'; $('#updIco').textContent=n.ico; $('#updTitle').textContent=n.title; $('#updSub').textContent='';
  $('#updNotes').textContent=n.text; $('#updBar').hidden=true; $('#updMsg').textContent='';
  $('#updGo').hidden=false; $('#updGo').disabled=false; $('#updGo').textContent=n.btn; $('#updLater').textContent='مش دلوقتي'; $('#updNever').hidden=false;
  openSheetEl('updSheet');
}
function nudgeGo(){
  const n=NUDGE_CUR; closeSheets(); if(!n) return;
  go('settings'); setGo(n.go==='feedback'?'feedback':null);
  if(n.go==='support') setTimeout(()=>{const c=$('#supportCard'); if(c&&!c.hidden) c.scrollIntoView({behavior:'smooth',block:'center'})},400);
}
$('#updNever').onclick=()=>{const st=nudgeState(); st.off=true; nudgeSave(st); closeSheets(); toast('تمام، مش هنظهرلك الرسايل دي تاني')};
function nudgeBoot(){
  const st=nudgeState(); if(!(+st.first>0)){st.first=Date.now(); nudgeSave(st)}
  afterSplash(()=>setTimeout(()=>nudgeOffer(0),4000));
}

