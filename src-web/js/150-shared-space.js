/* ===== Shared space (Firebase Firestore) ===== */
const FB_CFG={apiKey:"AIzaSyBCF3hwtmYnsffFb5f-_1UhCbiaD9eo1Y8",authDomain:"maleem-f6b40.firebaseapp.com",projectId:"maleem-f6b40",storageBucket:"maleem-f6b40.firebasestorage.app",messagingSenderId:"575574288717",appId:"1:575574288717:web:84f38641a4809252946f04"};
const SP_ABC='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const SP_SHARE_META=[
  {key:'expenses',label:'المصروفات',icon:'💸',desc:'تفاصيل مصروفاتك؛ تقدر تعدّل أو تحذف مصروفاتك فقط، والآخرون يشوفوها للقراءة فقط.'},
  {key:'reports',label:'التقارير الشهرية',icon:'📊',desc:'إجماليات الشهر وتوزيع الفئات، من غير تفاصيل كل عملية.'},
  {key:'debts',label:'السلف والديون',icon:'🤝',desc:'الأشخاص والمبالغ ومواعيد الاستحقاق وسجل السداد. بتتزامن ويقدر أي عضو يعدّلها.'},
  {key:'gams',label:'الجمعيات',icon:'🧩',desc:'قيمة القسط والأدوار والأقساط المسددة. بتتزامن ويقدر أي عضو يعدّلها.'},
  {key:'goals',label:'أهداف الادخار',icon:'🎯',desc:'اسم الهدف ومبلغه والرصيد المحفوظ. بتتزامن ويقدر أي عضو يعدّلها.'},
  {key:'incomes',label:'الدخل الشهري',icon:'💰',desc:'الدخل اللي بيتكرر كل شهر (زي المرتب) ومبالغه. بتتزامن ويقدر أي عضو يعدّلها.'},
  {key:'fixed',label:'المصاريف الثابتة',icon:'🧾',desc:'المصاريف المجدولة وحالة تسجيل كل شهر. بتتزامن ويقدر أي عضو يعدّلها.'}
];
const SP_EXTRA_TYPES=['reports','debts','gams','goals','incomes','fixed'];
let spMemberIds=[], spRemoveArm=null, spRemoveT=null, spListening=false;
let fbP=null, fb=null, spUnsub=null, spUnsubM=null, spUnsubR=null, spUnsubP=null, spJoinUnsub=null, spTimer=null, spHash={}, spOwners={}, spCloudExpenses={}, spReady=false, spMembers=0, spSt='off', spMode='create', spOwner=false, spRequests=[], spRequestsPrimed=false, spReqErr=false;
const SP_RETRY_MS=10*60*1000; // keep in sync with firestore.rules (requesterRetriesRequest)
const spCurrencyBlocked={};
let spExtraUnsubs=[], spExtraData={reports:[],debts:[],gams:[],goals:[],incomes:[],fixed:[]}, spExtraCloud={reports:{},debts:{},gams:{},goals:{},incomes:{},fixed:{}}, spExtraReady={}, spMemberProfiles=[];
const spMe=()=>(fb&&fb.uid)||(S.space&&S.space.uid)||'';
function expenseCanManage(e){
  if(!e||!S.space)return true;
  if(e.legacyReadOnly)return false;
  const cloudOwner=spOwners[String(e.id)]||(spCloudExpenses[String(e.id)]&&spCloudExpenses[String(e.id)].by);
  if(cloudOwner)return cloudOwner===spMe();
  if(e.sp!==S.space.code)return true;
  const owner=e.by;
  return !!owner&&owner===spMe();
}
function expenseReadOnly(e){return !expenseCanManage(e)}
const cloudAmt=e=>e.o?+e.o.a:+e.amount, cloudCur=e=>e.o?e.o.c:S.currency;
const hashE=e=>JSON.stringify([cloudAmt(e),cloudCur(e),e.cat,e.note||'',e.pay||'',+e.ts]);
const SP_CODE_LEN=8; // new spaces get 8 characters; spaces made before keep their 10-character codes
const spFmt=c=>String(c||'').replace(/^(.{4})(.{4})$/,'$1-$2').replace(/^(.{5})(.{5})$/,'$1-$2');
const spCodeOk=c=>/^[A-HJ-NP-Z2-9]{8}(?:[A-HJ-NP-Z2-9]{2})?$/.test(c);
const spNorm=s=>String(s||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const spGen=()=>{const a=new Uint32Array(SP_CODE_LEN);crypto.getRandomValues(a);return Array.from(a,x=>SP_ABC[x%32]).join('')};
const withTimeout=(p,ms)=>Promise.race([p,new Promise((_,no)=>setTimeout(()=>no({code:'timeout'}),ms))]);
function spBlankPrefs(expenses=true){return {expenses:!!expenses,reports:false,debts:false,gams:false,goals:false,incomes:false,fixed:false}}
function spNormPrefs(p,legacy=true){const d=spBlankPrefs(false), src=p&&typeof p==='object'?p:{};SP_SHARE_META.forEach(x=>{d[x.key]=typeof src[x.key]==='boolean'?src[x.key]:(legacy&&x.key==='expenses')});return d}
function spDraftPrefs(){if(!S.space&&!S.spaceRequest&&!S.spaceShareDraft)S.spaceShareDraft=spBlankPrefs(true);return spNormPrefs(S.space?S.space.shareDraft:S.spaceRequest?S.spaceRequest.sharePrefs:S.spaceShareDraft,S.space?true:!!(S.spaceRequest&&S.spaceRequest.sharePrefs))}
function spPrefSame(a,b){const x=spNormPrefs(a,false),y=spNormPrefs(b,false);return SP_SHARE_META.every(t=>x[t.key]===y[t.key])}
function spShareLabels(p){const n=SP_SHARE_META.filter(t=>spNormPrefs(p,false)[t.key]).map(t=>t.label);return n.length?n.join('، '):'مش هيشارك بيانات حاليًا'}
function spLocalExpenses(){const uid=spMe();return (S.expenses||[]).filter(e=>!e.sp||e.by===uid)}
function spCountLocal(type){
  if(type==='expenses') return spLocalExpenses().length;
  if(type==='reports') return new Set(spLocalExpenses().filter(e=>Number.isFinite(+e.ts)).map(e=>periodAt(+e.ts,repPd()).key)).size;
  const a=S[type];return Array.isArray(a)?a.length:0;
}
function spErrMsg(e){const c=e&&e.code;
  return c==='nf'?'الكود ده مش موجود، اتأكد منه':c==='full'?'المساحة دي اكتملت (5 أعضاء)':
  (c==='timeout'||c==='unavailable')?'مفيش اتصال بالسيرفر. اتأكد من الإنترنت وجرب تاني':
  c==='permission-denied'?'تعذر تنفيذ العملية؛ اتأكد من نشر قواعد Firestore المحدّثة':
  (c==='auth/operation-not-allowed'||c==='auth/admin-restricted-operation')?'فعّل الدخول المجهول (Anonymous) من Firebase Authentication':'حصلت مشكلة، جرب تاني'}
function fbInit(){
  if(fbP) return fbP;
  fbP=loadScript('libs/fb.js').then(async()=>{
    const F=window.FB, app=ME.id==='m1'?F.initializeApp(FB_CFG):F.initializeApp(FB_CFG,fbAppName(ME.id)); // each member has his own anonymous account
    const auth=F.initializeAuth(app,{persistence:[F.indexedDBLocalPersistence,F.browserLocalPersistence]});
    let db; try{db=F.initializeFirestore(app,{localCache:F.persistentLocalCache({tabManager:F.persistentSingleTabManager(undefined)}),experimentalAutoDetectLongPolling:true})}
    catch(e){db=F.initializeFirestore(app,{localCache:F.memoryLocalCache(),experimentalAutoDetectLongPolling:true})}
    await new Promise(res=>{const un=F.onAuthStateChanged(auth,()=>{un();res()})});
    if(!auth.currentUser) await F.signInAnonymously(auth);
    fb={F,db,auth,uid:auth.currentUser.uid}; return fb;
  }).catch(e=>{fbP=null;throw e});
  return fbP;
}
function spSetStatus(s){spSt=s;renderSpace()}
function spTypeRows(prefs,disabled=false){
  return SP_SHARE_META.map(t=>{const count=spCountLocal(t.key);return `<label class="sp-type-row"><span class="sp-ti" aria-hidden="true">${t.icon}</span><span class="sp-tt"><b>${t.label}</b><small>${t.desc}</small><span class="sp-count">${count} ${t.key==='reports'?'فترة':'سجل'} موجود${count===1?'':'ة'} عندك</span></span><span class="switch sp-type-switch"><input type="checkbox" data-sp-type="${t.key}" ${prefs[t.key]?'checked':''} ${disabled?'disabled':''} aria-label="مشاركة ${t.label}"><i></i></span></label>`}).join('');
}
function spRenderSetupTypes(){
  const prefs=spDraftPrefs();$('#spSetupTypeList').innerHTML=spTypeRows(prefs,false);
  $('#spSetupTitle').textContent=spMode==='create'?'اختار البيانات اللي هتشاركها في المساحة':'اختار البيانات اللي هتشاركها بعد الانضمام';
  $('#spSetupIntro').textContent=spMode==='create'?'اختار البيانات اللي هتشاركها مع الطرف التاني, وتقدر تسيب اي نوع مش محدد براحتك':'حدد اللي انت عايزه يظهر في المساحة المشتركة بينك وبين صاحب المساحة';
}
function spRenderShareTypes(){
  const list=$('#spTypeList'), on=!!S.space, req=!!S.spaceRequest, prefs=spDraftPrefs(), pending=req&&S.spaceRequest.status==='pending';
  const base=S.space?spNormPrefs(S.space.sharePrefs,true):req?spNormPrefs(S.spaceRequest.sharePrefs,true):spNormPrefs(S.spaceShareDraft,false);
  const dirty=on&&!spPrefSame(prefs,base);
  $('#spPrefsCard').hidden=!on&&!req;
  $('#spPrefsTitle').textContent=on?'البيانات اللي هشاركها':'اختيارات المشاركة';
  $('#spPrefsIntro').textContent=on?'اختار بياناتك أنت. كل عضو يحدد بنفسه إيه اللي يشاركه؛ تقدر تشوف بيانات الأعضاء اللي اختاروا المشاركة.':pending?'دي اختياراتك المرفقة بطلب الانضمام، وتبدأ المشاركة بعد موافقة صاحب المساحة.':'طلبك اترفض. غيّر اختياراتك لو حابب قبل إرسال طلب جديد.';
  list.innerHTML=spTypeRows(prefs,pending);
  $('#spPrefsNote').textContent='تفعيل نوع بيانات يرفع سجلاتك ويستقبل سجلات الأعضاء المفعّلين لنفس النوع. المصروفات لا يعدّلها أو يحذفها إلا صاحبها؛ وباقي الصلاحيات موضحة لكل نوع (التقارير للقراءة فقط). عند إيقاف النوع تتوقف المزامنة، وتظل النسخ التي رُفعت ظاهرة للأعضاء.';
  $('#spSavePrefs').hidden=!on||!dirty;
  const auto=$('#spAuto'); if(auto){auto.checked=!!(S.space&&S.space.auto);auto.disabled=!!(on&&!prefs.expenses);const wrap=auto.closest('.sp-auto');if(wrap)wrap.classList.toggle('off',auto.disabled)}
}
function spRenderSharedData(){
  const card=$('#spDataCard'), out=$('#spSharedData'); if(!S.space){card.hidden=true;return} card.hidden=false;
  const code=S.space.code, exp=(S.expenses||[]).filter(e=>e.sp===code).sort((a,b)=>b.ts-a.ts);
  const groups=[];
  if(exp.length){
    const people={};exp.forEach(e=>{const k=e.by||'unknown',g=people[k]||(people[k]={name:e.byName||'عضو',count:0,total:0});g.count++;g.total+=(+e.amount||0)});
    const rows=Object.values(people).map(x=>`<div class="sp-share-record"><div class="main"><b>${esc(x.name)}</b><small class="sp-owner-tag">مصاريف مشتركة · ${x.count} عملية</small></div><span class="amt">${money(x.total)} ${CS()}</span></div>`).join('');
    groups.push(`<details class="sp-share-group"><summary>المصروفات <span class="n">${exp.length} عملية</span></summary>${rows}</details>`);
  }
  const titleBy=Object.fromEntries(SP_SHARE_META.map(t=>[t.key,t.label]));
  // debts / gams / goals / incomes / fixed are merged into the member's own lists (spApplyShared); only reports are listed here
  ['reports'].forEach(type=>{
    const rows=(spExtraData[type]||[]).slice().sort((a,b)=>String(b.localId||'').localeCompare(String(a.localId||'')));
    if(!rows.length)return;
    const body=rows.map(r=>{const d=r.payload||{};const cat=Object.entries(d.categories||{}).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([k,v])=>`${esc((CAT[k]||CAT.other).name)} ${money(v*rpK(d))}`).join(' · ');return `<div class="sp-share-record"><div class="main"><b>${esc(r.ownerName||'عضو')} · ${esc(d.periodLabel||d.periodKey||'تقرير شهري')}</b><small>${+d.count||0} عملية${cat?' · '+cat:''}</small></div><span class="amt">${money((d.total||0)*rpK(d))} ${esc(rpK(d)===1?(d.currency||CS()):CS())}</span></div>`}).join('');
    groups.push(`<details class="sp-share-group"><summary>${titleBy[type]} <span class="n">${rows.length} ${type==='reports'?'فترة':'سجل'}</span></summary>${body}</details>`);
  });
  out.innerHTML=groups.length?groups.join(''):'<div class="sp-empty">لسه مفيش بيانات اتشاركت في المساحة. لما أي عضو يفعّل نوع بيانات، هتظهر هنا.</div>';
}
function renderSpace(){
  const currencyNotice=document.getElementById('spCurrencyNotice'); if(currencyNotice) currencyNotice.remove();
  if(S.space&&Object.values(spCurrencyBlocked).some(Boolean)){const n=document.createElement('p');n.id='spCurrencyNotice';n.className='hint';n.textContent='مشاركة السلف والجمعيات والأهداف والدخل والثوابت تحتاج نفس العملة عند كل الأعضاء. المزامنة متوقفة للأنواع المختلفة أو غير المحددة العملة لحماية الأرقام.';document.querySelector('#v-settings [data-page=space]').appendChild(n)}
  const on=!!S.space, waiting=!on&&!!S.spaceRequest;
  $('#spOff').hidden=on||waiting; $('#spWait').hidden=!waiting; $('#spOn').hidden=!on;
  const wipeNote=$('#wipeSpNote');if(wipeNote)wipeNote.hidden=!on;
  const st={on:'متصل',sync:'بيتزامن...',off:'أوفلاين',err:'مشكلة في الاتصال',denied:'راجع قواعد Firebase'};
  $('#spStatus').textContent=on?(st[spSt]||''):(waiting?'في انتظار الموافقة':'');
  if(waiting){
    const rejected=S.spaceRequest.status==='rejected';
    $('#spWaitText').textContent=rejected?'صاحب المساحة رفض طلب الانضمام. تقدر تعدل اختيارات المشاركة، تمسح الرسالة، وتبعت طلبًا جديدًا.':'طلب الانضمام اتبعت لصاحب المساحة. هتقدر تدخل بعد ما يوافق.';
    $('#spCancelRequest').textContent=rejected?'مسح الرسالة':'إلغاء الطلب';
  }
  if(on){const code=S.space.code, prefs=spNormPrefs(S.space.sharePrefs,true), priv=(S.expenses||[]).filter(e=>!e.sp&&!Object.prototype.hasOwnProperty.call(spHash,e.id)).length, up=$('#spUpload');
    $('#spCode').textContent=spFmt(code);
    up.hidden=!prefs.expenses||!!S.space.auto||!priv;up.dataset.idle=`مشاركة مصاريفي يدويًا (${priv})`;if(!up.dataset.arm)up.textContent=up.dataset.idle;
    $('#spInfo').textContent=!prefs.expenses?'مشاركة المصاريف متوقفة. النسخ التي سبق رفعها تظل ظاهرة للطرف الآخر.':(spMembers?`عدد الأعضاء: ${spMembers}. `:'')+(spSt==='denied'?'تعذر الوصول؛ راجع نشر قواعد Firestore الجديدة.':S.space.auto?'المصاريف الجديدة بتتشارك تلقائيًا. المصاريف القديمة غير المشتركة تحتاج رفعًا يدويًا.':'المشاركة التلقائية متوقفة؛ المصاريف الجديدة خاصة حتى ترفعها يدويًا، والمصاريف المشتركة بالفعل تظل ظاهرة.');
    $('#spReqWrap').hidden=!spOwner;
    if(spOwner) $('#spReqList').innerHTML=spReqErr?'<p class="hint" style="margin-top:6px">تعذر تحميل الطلبات. تأكد من نشر قواعد Firestore الجديدة.</p>':spRequests.length?spRequests.map(r=>`<div class="sp-req-item"><div class="sp-req-name">${esc(r.name||'عضو')}<small class="hint" style="display:block">هيشارك: ${esc(spShareLabels(r.sharePrefs))}</small></div><div class="sp-req-actions"><button class="btn primary" data-sp-accept="${esc(r.uid)}">موافقة</button><button class="btn" data-sp-reject="${esc(r.uid)}">رفض</button></div></div>`).join(''):'<p class="hint" style="margin-top:6px">مفيش طلبات انضمام معلقة.</p>';
  } else $('#spReqWrap').hidden=true;
  {const mw=$('#spMembersWrap');if(mw){const others=on&&spOwner?spMemberIds.filter(u=>u!==spMe()):[];mw.hidden=!others.length;
    if(others.length){const names=Object.fromEntries(spMemberProfiles.map(p=>[p.uid,p.name]));
      $('#spMemList').innerHTML=others.map(u=>`<div class="sp-mem-item"><span>${esc(names[u]||'عضو')}</span><button class="btn" data-sp-remove="${esc(u)}">${spRemoveArm===u?'دوس تاني للتأكيد':'إزالة من المساحة'}</button></div>`).join('')}}}
  spRenderShareTypes();spRenderSharedData();
  if(spManageOn){if(!on&&!waiting)spManage(false);else $('#spManageTitle').textContent=on?'إدارة المساحة':'اختيارات المشاركة'}
}
var spManageOn=false;
function spManage(on){
  spManageOn=!!on;$('#v-settings').classList.toggle('sp-managing',spManageOn);
  $('#spManageTitle').textContent=S.space?'إدارة المساحة':'اختيارات المشاركة';
  if(spManageOn){const m=$('#spManage');m.classList.remove('sub-anim');void m.offsetWidth;m.classList.add('sub-anim')}
  pageTo(0);
}
$('#spManageBtn').onclick=()=>spManage(true);
$('#spManageWait').onclick=()=>spManage(true);
$('#spManageBack').onclick=()=>spManage(false);
function spQueue(){if(!S.space)return;clearTimeout(spTimer);spTimer=setTimeout(spPush,700)}
function spStop(){
  if(spUnsub){spUnsub();spUnsub=null}if(spUnsubM){spUnsubM();spUnsubM=null}if(spUnsubR){spUnsubR();spUnsubR=null}if(spUnsubP){spUnsubP();spUnsubP=null}
  spExtraUnsubs.forEach(u=>{try{u()}catch(e){}});spExtraUnsubs=[];spOwner=false;spMemberIds=[];spRemoveArm=null;spRequests=[];spRequestsPrimed=false;spReqErr=false;spReady=false;spHash={};spOwners={};spCloudExpenses={};spMemberProfiles=[];spExtraData={reports:[],debts:[],gams:[],goals:[],incomes:[],fixed:[]};spExtraCloud={reports:{},debts:{},gams:{},goals:{},incomes:{},fixed:{}};spExtraReady={};clearTimeout(spTimer)
}
function spStopJoinWatch(){if(spJoinUnsub){spJoinUnsub();spJoinUnsub=null}}
function spActivateJoin(code,uid,name,prefs){
  spStopJoinWatch();const p=spNormPrefs(prefs||S.spaceRequest&&S.spaceRequest.sharePrefs,true);
  S.space={code,uid,name,auto:false,old:S.expenses.map(e=>e.id),sharePrefs:p,shareDraft:{...p}};S.spaceRequest=null;S.spaceShareDraft=null;
  save();renderSpace();spListen();toast('صاحب المساحة وافق على انضمامك');
}
function spWatchJoinRequest(){
  if(!S.spaceRequest||S.spaceRequest.status!=='pending'||spJoinUnsub)return;
  const pending={...S.spaceRequest};
  fbInit().then(f=>{
    if(!S.spaceRequest||S.spaceRequest.code!==pending.code||S.spaceRequest.uid!==pending.uid||spJoinUnsub)return;
    if(f.uid!==pending.uid){S.spaceRequest=null;S.spaceLostCode=pending.code;save();renderSpace();toast('طلب الانضمام القديم كان على حساب اتمسح من الموبايل ده. ابعت الطلب تاني بنفس الكود.',null,null,6000);return}
    const ref=f.F.doc(f.db,'spaces',pending.code,'joinRequests',pending.uid);
    spJoinUnsub=f.F.onSnapshot(ref,snap=>{
      if(!S.spaceRequest||S.spaceRequest.code!==pending.code||S.spaceRequest.uid!==pending.uid)return;
      if(!snap.exists()){spStopJoinWatch();S.spaceRequest=null;save();renderSpace();spIsClosed(f,pending.code).then(c=>{if(c)toast(SP_CLOSED_MSG,null,null,7000)});return}
      const d=snap.data()||{};
      if(d.status==='approved'){spActivateJoin(pending.code,pending.uid,pending.name,d.sharePrefs||pending.sharePrefs);return}
      if(d.status==='rejected'){spStopJoinWatch();S.spaceRequest.status='rejected';S.spaceRequest.sharePrefs=spNormPrefs(d.sharePrefs||pending.sharePrefs,true);save();renderSpace();return}
      if(d.status==='cancelled'){spStopJoinWatch();S.spaceShareDraft=spNormPrefs(d.sharePrefs||pending.sharePrefs,true);S.spaceRequest=null;save();renderSpace()}
    },()=>{});
    // a request left pending on a space that closed before anyone answered: nobody can approve it anymore
    spIsClosed(f,pending.code).then(c=>{
      if(!c||!S.spaceRequest||S.spaceRequest.code!==pending.code||S.spaceRequest.status!=='pending')return;
      spStopJoinWatch();S.spaceRequest=null;save();renderSpace();toast(SP_CLOSED_MSG,null,null,7000);
      const ref2=f.F.doc(f.db,'spaces',pending.code,'joinRequests',pending.uid);
      f.F.updateDoc(ref2,{status:'cancelled',resolvedBy:pending.uid,resolvedAt:f.F.serverTimestamp()}).catch(()=>{});
    });
  }).catch(()=>{});
}
async function spDecideRequest(uid,approve){
  if(!S.space||!fb||!spOwner)return;
  const code=S.space.code,{F,db}=fb,reqRef=F.doc(db,'spaces',code,'joinRequests',uid),spaceRef=F.doc(db,'spaces',code);
  try{
    const [reqSnap,spaceSnap]=await Promise.all([F.getDoc(reqRef),F.getDoc(spaceRef)]);
    if(!reqSnap.exists()||!spaceSnap.exists()||reqSnap.data().status!=='pending'){toast('الطلب اتعالج بالفعل');return}
    if(approve){
      const ids=(spaceSnap.data().memberIds)||[];if(ids.includes(uid)){toast('العضو موجود بالفعل');return}if(ids.length>=5){toast('المساحة وصلت للحد الأقصى: 5 أعضاء');return}
      const batch=F.writeBatch(db);batch.update(spaceRef,{memberIds:F.arrayUnion(uid),lastApprovedUid:uid,lastApprovedAt:F.serverTimestamp()});batch.update(reqRef,{status:'approved',resolvedBy:fb.uid,resolvedAt:F.serverTimestamp()});await batch.commit();toast('تمت الموافقة على طلب الانضمام');
    }else{await F.updateDoc(reqRef,{status:'rejected',resolvedBy:fb.uid,resolvedAt:F.serverTimestamp()});toast('تم رفض طلب الانضمام')}
  }catch(e){toast(e&&e.code==='permission-denied'?'تعذر تنفيذ القرار. تأكد من نشر قواعد Firestore الجديدة':spErrMsg(e))}
}
/* Leaving a space (or being removed): your own records stay, the other members' copies are removed,
   so they don't silently become "your" expenses / debts afterwards. Returns how many records were removed. */
function spPurgeOthers(code,me){
  let n=0;const other=x=>!!(me&&x&&x.by&&x.by!==me);
  S.expenses=S.expenses.filter(e=>{const o=e.legacyReadOnly||(e.sp===code&&other(e));if(o)n++;return !o});
  S.expenses.forEach(e=>{delete e.sp;delete e.legacyReadOnly;if(me&&e.by===me){delete e.by;delete e.byName}});
  ['debts','gams','goals','incomes','fixed'].forEach(t=>{if(!Array.isArray(S[t]))return;
    S[t]=S[t].filter(x=>{const o=other(x);if(o){n++;if(t==='fixed')Object.keys(S.fixedLog).forEach(k=>{if(k.startsWith(x.id+':'))delete S.fixedLog[k]})}return !o});
    S[t].forEach(x=>{delete x.by;delete x.byName})});
  return n;
}
function spDetach(){if(!S.space)return;Object.keys(spCurrencyBlocked).forEach(k=>delete spCurrencyBlocked[k]);const code=S.space.code,me=S.space.uid||spMe();spStop();spPurgeOthers(code,me);S.space=null;renderSpace()}
/* the space was lost on this phone (removed by the owner, or the anonymous account changed): leave locally */
function spLocalLeave(msg){
  if(!S.space)return;const code=S.space.code,me=S.space.uid||spMe();
  spStop();spPurgeOthers(code,me);S.spaceLostCode=code;S.space=null;save();renderSpace();renderAll();toast(msg,null,null,8000);
}
// One server read of a collection (the bundled Firebase has no getDocs): the first snapshot that is not from the cache.
function spReadOnce(f,ref,ms=12000){
  return new Promise((res,rej)=>{let un=null,done=false;
    const end=(fn,v)=>{if(done)return;done=true;clearTimeout(t);if(un)un();fn(v)};
    const t=setTimeout(()=>end(rej,Object.assign(new Error('timeout'),{code:'timeout'})),ms);
    un=f.F.onSnapshot(ref,{includeMetadataChanges:true},snap=>{if(!snap.metadata.fromCache)end(res,snap.docs.map(d=>d.ref))},e=>end(rej,e));
    if(done)un();
  });
}
// The last member wipes the space's shared data before leaving. Best effort: what can't be deleted stays
// locked, because a space with no members can't be read or joined.
async function spWipeSpace(f,code){
  const {F,db}=f,res={deleted:0,failed:0};
  const cols=[['expenses'],...SP_EXTRA_TYPES.map(t=>['sharedData',t,'items']),['joinRequests'],['members']];
  for(const c of cols){
    let refs;try{refs=await spReadOnce(f,F.collection(db,'spaces',code,...c))}catch(e){res.failed++;continue}
    for(let i=0;i<refs.length;i+=50){
      const part=refs.slice(i,i+50);
      try{const b=F.writeBatch(db);part.forEach(r=>b.delete(r));await withTimeout(b.commit(),12000);res.deleted+=part.length}
      catch(e){ // one refused delete fails the whole batch: retry them one by one
        const out=await Promise.allSettled(part.map(r=>{const b=F.writeBatch(db);b.delete(r);return withTimeout(b.commit(),12000)}));
        out.forEach(o=>{if(o.status==='fulfilled')res.deleted++;else res.failed++});
      }
    }
  }
  return res;
}
// true when the space exists and every member has left (the rules let anyone read a closed space)
async function spIsClosed(f,code){
  try{const s=await withTimeout(f.F.getDoc(f.F.doc(f.db,'spaces',code)),10000),d=s.exists()?(s.data()||{}):null;return !!(d&&Array.isArray(d.memberIds)&&d.memberIds.length===0)}
  catch(e){return false}
}
const SP_CLOSED_MSG='المساحة دي اتقفلت لأن كل الأعضاء خرجوا منها، ومحدش يقدر ينضم ليها تاني. اطلب من صاحبك يعمل مساحة جديدة';
let spRemovedCheck=false;
async function spCheckRemoved(){
  if(!S.space||!fb||spRemovedCheck)return;spRemovedCheck=true;const code=S.space.code;
  try{const {F,db,uid}=fb,s=await withTimeout(F.getDoc(F.doc(db,'spaces',code,'joinRequests',uid)),10000);
    if(S.space&&S.space.code===code&&s.exists()&&(s.data()||{}).status==='removed')spLocalLeave('صاحب المساحة شالك من المساحة المشتركة. بياناتك الخاصة فضلت عندك.');
    else if(S.space&&S.space.code===code&&await spIsClosed(fb,code))spLocalLeave('المساحة المشتركة اتقفلت لأن كل الأعضاء خرجوا منها. بياناتك الخاصة فضلت عندك.');
  }catch(e){}finally{spRemovedCheck=false}
}
async function spRemoveMember(uid){
  if(!S.space||!fb||!spOwner||!isId(uid)||uid===fb.uid)return;
  const code=S.space.code,{F,db}=fb,spaceRef=F.doc(db,'spaces',code),reqRef=F.doc(db,'spaces',code,'joinRequests',uid);
  try{
    let req=null;try{req=await withTimeout(F.getDoc(reqRef),10000)}catch(e){}
    const b=F.writeBatch(db);b.update(spaceRef,{memberIds:F.arrayRemove(uid)});
    if(req&&req.exists()&&(req.data()||{}).status==='approved')b.update(reqRef,{status:'removed',resolvedBy:fb.uid,resolvedAt:F.serverTimestamp()});
    await withTimeout(b.commit(),12000);toast('اتشال العضو من المساحة');
  }catch(e){toast(e&&e.code==='permission-denied'?'تعذر إزالة العضو. تأكد من نشر قواعد Firestore الجديدة':spErrMsg(e))}
}
function spClearOldId(id){if(!S.space)return false;let changed=false;['old','manual'].forEach(k=>{const a=Array.isArray(S.space[k])?S.space[k]:[];if(a.includes(id)){S.space[k]=a.filter(x=>x!==id);changed=true}});return changed}
function spApply(snap){
  const code=S.space.code;let changed=false,stateChanged=false;
  snap.docChanges().forEach(ch=>{
    const id=ch.doc.id; if(!isId(id)) return; /* ids are generated by the app; anything else is not ours */
    const d=ch.doc.data()||{},i=S.expenses.findIndex(e=>e.id===id),local=i>=0?S.expenses[i]:null;
    d.by=isId(d.by)?d.by:undefined; d.byName=str(d.byName,40);
    if(d.del||ch.type==='removed'){
      const manual=new Set(S.space.manual||[]),undoPending=!!(d.del&&manual.has(id)&&local&&local.by===spMe()&&d.by===spMe()),legacyLocalCopy=!!(d.del&&!d.by&&local&&local.by);
      if(legacyLocalCopy){local.legacyReadOnly=true;spOwners[id]=local.by;delete spHash[id];delete spCloudExpenses[id];changed=true;stateChanged=spClearOldId(id)||stateChanged;return}
      if(d.by)spOwners[id]=d.by;
      delete spHash[id];delete spCloudExpenses[id];
      if(undoPending)return;
      if(i>=0){S.expenses.splice(i,1);changed=true}
      stateChanged=spClearOldId(id)||stateChanged;return
    }
    if(!(+d.amount>0&&+d.amount<MAXAMT)||!(+d.ts>0&&+d.ts<MAXTS)) return;
    const inc=spIncoming(d,i>=0?S.expenses[i]:null);
    const e={id,amount:inc.amount,cat:CAT[d.cat]?d.cat:'other',note:str(d.note,200),ts:+d.ts,sp:code,by:d.by,byName:d.byName};if(isId(d.pay))e.pay=d.pay;if(inc.o)e.o=inc.o;
    spOwners[id]=d.by||'';spCloudExpenses[id]={...e};
    const h=hashE(e);
    if(i>=0&&hashE(S.expenses[i])===h){spHash[id]=h;if(S.expenses[i].by!==d.by||S.expenses[i].byName!==d.byName||S.expenses[i].sp!==code||S.expenses[i].legacyReadOnly){S.expenses[i].by=d.by;S.expenses[i].byName=d.byName;S.expenses[i].sp=code;delete S.expenses[i].legacyReadOnly;changed=true}stateChanged=spClearOldId(id)||stateChanged;return}
    if(i>=0){const l0=S.expenses[i]; if(l0&&l0.acc){e.acc=l0.acc;e.accAmt=l0.accAmt} if(l0&&l0.inst) e.inst=l0.inst; if(l0&&l0.fund==='free')e.fund='free'; S.expenses[i]=e}else S.expenses.push(e);spHash[id]=h;changed=true;stateChanged=spClearOldId(id)||stateChanged;
  });
  if(changed||stateChanged)save();if(changed){renderAll();setTimeout(checkAlerts,500)}else if(stateChanged)renderSpace();
}
/* The amount of a shared expense is written in the author's currency (d.cur). Here it is converted ONCE, with the rate of the day it arrives,
   and then kept: the same expense never changes its value because the rate moved tomorrow (it changes only if the author edits it).
   A record without d.cur (older app versions) is taken as already being in this member's currency. */
function spIncoming(d,local){
  const a=r2(+d.amount), c=(typeof d.cur==='string'&&CURRENCIES.some(x=>x.id===d.cur))?d.cur:'';
  if(local&&local.o&&!local.o.p&&r2(local.o.a)===a&&(!c||local.o.c===c)) return {amount:local.amount,o:local.o};
  if(!c||c===S.currency) return {amount:a};
  const k=rateFor(c,S.currency);
  if(!k){ratesRefresh(false);return {amount:a,o:{a,c,p:true}}}
  return {amount:Math.max(0.01,r2(a*k)),o:{a,c}};
}
let spPushBusy=false,spPushAgain=false;
function spRestoreReadOnlyExpenses(uid,code){
  if(!S.space||S.space.code!==code)return;
  let changed=false;
  Object.entries(spCloudExpenses).forEach(([id,cloud])=>{
    if(!cloud||cloud.by===uid)return;
    const i=S.expenses.findIndex(e=>String(e.id)===String(id));
    if(i<0){S.expenses.push({...cloud});changed=true;return}
    const local=S.expenses[i];
    if(hashE(local)!==hashE(cloud)||local.by!==cloud.by||local.byName!==cloud.byName||local.sp!==code){S.expenses[i]={...cloud};changed=true}
  });
  if(changed){persist();renderAll()}
}
async function spPush(){
  clearTimeout(spTimer);if(!S.space||!fb||!spReady)return;if(spPushBusy){spPushAgain=true;return}spPushBusy=true;
  const {F,db,uid}=fb,code=S.space.code;
  try{
    spRestoreReadOnlyExpenses(uid,code);
    const prefs=spNormPrefs(S.space.sharePrefs,true),manual=new Set(S.space.manual||[]),nm=S.space.name||(S.profile&&S.profile.name)||'عضو';
    if(prefs.expenses){
      const writes=[],cur=new Set();
      S.expenses.forEach(e=>{
        const serverKnown=Object.prototype.hasOwnProperty.call(spHash,e.id);if(e.sp&&e.sp!==code)return;
        if(!serverKnown&&!e.sp&&!S.space.auto&&!manual.has(String(e.id)))return;
        if(e.sp===code&&!serverKnown&&!manual.has(String(e.id)))return;
        const author=(e.sp===code?(spOwners[e.id]||e.by||uid):uid);if(author!==uid)return;
        const authorName=e.sp===code?String(e.byName||nm).slice(0,40):String(nm).slice(0,40);
        cur.add(e.id);const h=hashE(e);if(spHash[e.id]!==h)writes.push([e.id,{amount:cloudAmt(e),cur:cloudCur(e),cat:e.cat,note:String(e.note||'').slice(0,200),pay:e.pay||'',ts:+e.ts,by:author,byName:authorName,del:false,upd:F.serverTimestamp()},h]);
      });
      Object.keys(spHash).forEach(id=>{if(!cur.has(id)&&spOwners[id]===uid)writes.push([id,{del:true,by:uid,upd:F.serverTimestamp()},null])});
      for(let i=0;i<writes.length;i+=400){const chunk=writes.slice(i,i+400),b=F.writeBatch(db);chunk.forEach(([id,data])=>b.set(F.doc(db,'spaces',code,'expenses',id),data));await b.commit();let localChanged=false;chunk.forEach(([id,data,h])=>{if(h===null){delete spHash[id];spOwners[id]=uid;return}spHash[id]=h;spOwners[id]=data.by;const e=S.expenses.find(x=>String(x.id)===String(id));const cloud={id,amount:e?+e.amount:+data.amount,cat:data.cat,note:data.note||'',ts:+data.ts,sp:code,by:data.by,byName:data.byName};if(data.pay)cloud.pay=data.pay;if(e&&e.o)cloud.o={...e.o};spCloudExpenses[id]=cloud;if(e&&S.space&&S.space.code===code){if(e.sp!==code){e.sp=code;localChanged=true}if(e.by!==data.by){e.by=data.by;localChanged=true}if(e.byName!==data.byName){e.byName=data.byName;localChanged=true}if(spClearOldId(id))localChanged=true}});if(localChanged&&S.space&&S.space.code===code)persist()}
    }
    await spPushTypes();renderSpace();
  }catch(e){spSetStatus(e&&e.code==='permission-denied'?'denied':'err')}
  finally{spPushBusy=false;if(spPushAgain){spPushAgain=false;spQueue()}}
}
function spStable(v){return Array.isArray(v)?'['+v.map(spStable).join(',')+']':(v&&typeof v==='object')?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+spStable(v[k])).join(',')+'}':(v===undefined?'null':JSON.stringify(v))}
function spByTag(x){return (x&&x.byName&&x.by&&x.by!==spMe())?` <span class="xby">· ${esc(x.byName)}</span>`:''}
function spItemClean(x){const c=spClone(x);delete c.by;delete c.byName;return c}
function spClone(x){try{return JSON.parse(JSON.stringify(x))}catch(e){return {}}}
/* a member's monthly summary is written in his currency (d.currency): show it in mine with today's rate (1 = same currency or no rate yet) */
function rpK(d){const c=d&&typeof d.currency==='string'?d.currency:''; if(!c||c===S.currency||!CURRENCIES.some(x=>x.id===c)) return 1; const k=rateFor(c,S.currency); return k>0?k:1}
function spReportRows(uid){
  const groups={};spLocalExpenses().filter(e=>Number.isFinite(+e.ts)).forEach(e=>{
    const P=periodAt(+e.ts,repPd()),g=groups[P.key]||(groups[P.key]={periodKey:P.key,periodLabel:repName(P),total:0,count:0,categories:{},currency:String(S.currency||'EGP')});
    const amount=+e.amount||0;g.total+=amount;g.count++;g.categories[e.cat]=(g.categories[e.cat]||0)+amount;
  });
  return Object.values(groups).map(g=>({localId:g.periodKey,payload:g}));
}
function spBuildLocalRows(type){
  if(type==='reports')return spReportRows(spMe());
  if(type==='debts'||type==='gams'||type==='goals'||type==='incomes')return (Array.isArray(S[type])?S[type]:[]).filter(x=>x&&x.id!=null).map(x=>({localId:String(x.id),payload:{...spItemClean(x),currency:S.currency}}));
  if(type==='fixed')return (Array.isArray(S.fixed)?S.fixed:[]).filter(x=>x&&x.id!=null).map(x=>{const prefix=String(x.id)+':',log=Object.fromEntries(Object.entries(S.fixedLog||{}).filter(([k])=>k.startsWith(prefix)));return {localId:String(x.id),payload:{...spItemClean(x),log,currency:S.currency}}});
  return [];
}
function spDocId(uid,id){return encodeURIComponent(String(uid)+'__'+String(id))}
/* Three-way merge for records several members can edit (debts, gam'eyas, goals, incomes, fixed):
   base = the last cloud version this phone saw, local = this phone, cloud = the new snapshot.
   Lists of payments and maps of paid months / logs keep what each side added and drop what each side removed,
   so two people recording payments at the same time don't wipe each other's entries. */
function spBase(type){if(!S.space)return {};const b=S.space.base=(S.space.base&&typeof S.space.base==='object')?S.space.base:{};return b[type]=(b[type]&&typeof b[type]==='object')?b[type]:{}}
function spMergeList(b,l,c){
  const m=a=>new Map((Array.isArray(a)?a:[]).filter(x=>x&&x.id!=null).map(x=>[String(x.id),x]));
  const B=m(b),L=m(l),C=m(c),out=[];
  [...L.keys(),...[...C.keys()].filter(k=>!L.has(k))].forEach(k=>{if(B.has(k)&&(!L.has(k)||!C.has(k)))return;out.push(L.has(k)?L.get(k):C.get(k))});
  return out.sort((x,y)=>(+x.ts||0)-(+y.ts||0));
}
function spMergeMap(b,l,c){
  b=b||{};l=l||{};c=c||{};const out={};
  new Set([...Object.keys(l),...Object.keys(c)]).forEach(k=>{
    if(k in b&&(!(k in l)||!(k in c)))return;
    out[k]=(k in l)&&(!(k in c)||spStable(l[k])!==spStable(b[k]))?l[k]:c[k];
  });
  return out;
}
function spMerge3(b,l,c){
  const out={};
  new Set([...Object.keys(l),...Object.keys(c)]).forEach(k=>{
    if(k==='payments'||k==='adds')out[k]=spMergeList(b[k],l[k],c[k]);
    else if(k==='paid'||k==='recvT')out[k]=spMergeMap(b[k],l[k],c[k]);
    else{const v=spStable(l[k])!==spStable(b[k])?l[k]:c[k];if(v!==undefined)out[k]=v}
  });
  return out;
}
function spApplyShared(type,rows){
  if(!S.space||!spNormPrefs(S.space.sharePrefs,true)[type])return false;
  const clean=CLEAN[type];if(!clean)return false;
  spCurrencyBlocked[type]=rows.some(r=>r.payload.currency!==S.currency);
  if(spCurrencyBlocked[type]){spExtraReady[type]=false;renderSpace();return false}
  if(!Array.isArray(S[type]))S[type]=[];
  const arr=S[type],prev=spExtraCloud[type]||{},seen=new Set(),base=spBase(type);let changed=false,baseChanged=false;
  rows.forEach(r=>{
    const id=String(r.localId);if(!isId(id))return;
    const raw=spClone(r.payload||{});const pre=id+':';
    const cloudLog=type==='fixed'?Object.fromEntries(Object.entries(cleanFixedLog(raw.log)).filter(([k])=>k.startsWith(pre))):null;
    delete raw.log;raw.id=id;
    const p=clean(raw);if(!p)return;seen.add(id);delete p.by;delete p.byName;
    const owner=isId(r.ownerUid)?r.ownerUid:'',ownerName=str(r.ownerName,40),b=base[id];
    if(type==='fixed'){
      const localLog=Object.fromEntries(Object.entries(S.fixedLog).filter(([k])=>k.startsWith(pre)));
      const ml=b?spMergeMap(b.log,localLog,cloudLog):{...localLog,...cloudLog};
      Object.keys(localLog).forEach(k=>{if(!(k in ml)){delete S.fixedLog[k];changed=true}});
      Object.keys(ml).forEach(k=>{if(S.fixedLog[k]!==ml[k]){S.fixedLog[k]=ml[k];changed=true}});
    }
    const i=arr.findIndex(x=>String(x.id)===id);
    if(i<0){const n=spClone(p);if(owner){n.by=owner;n.byName=ownerName}arr.push(n);changed=true}
    else{
      const local=spItemClean(arr[i]);let m=p;
      if(b){const bb=spClone(b);delete bb.log;delete bb.by;delete bb.byName;m=clean({...spMerge3(bb,local,p),id})||p;delete m.by;delete m.byName}
      if(type==='debts'){const c=debtRem(m)<=0;if(c!==m.closed){m.closed=c;m.closedAt=c?(Math.max(0,...m.payments.map(x=>+x.ts||0))||null):null}}
      if(spStable(local)!==spStable(m)){const by=arr[i].by||owner,byName=arr[i].byName||ownerName;if(by){m.by=by;m.byName=byName}arr[i]=m;changed=true}
    }
    const nb=type==='fixed'?{...p,log:cloudLog}:p;
    if(spStable(b)!==spStable(nb)){base[id]=spClone(nb);baseChanged=true}
  });
  Object.keys(prev).forEach(id=>{if(prev[id].fromSnap&&!seen.has(id)){const i=arr.findIndex(x=>String(x.id)===id);if(i>=0){arr.splice(i,1);changed=true}if(base[id]){delete base[id];baseChanged=true}}});
  if(changed){save();renderAll()}else if(baseChanged)persist();
  return changed;
}
let spTypesBusy=false,spTypesAgain=false;
async function spPushTypes(){
  if(!S.space||!fb)return;if(spTypesBusy){spTypesAgain=true;return}spTypesBusy=true;
  const {F,db,uid}=fb,code=S.space.code;
  try{
    for(const type of SP_EXTRA_TYPES){
      if(!S.space||S.space.code!==code)break;
      if(spCurrencyBlocked[type]||!spExtraReady[type]||!spNormPrefs(S.space.sharePrefs,true)[type])continue;
      const isEdit=type!=='reports',records=spBuildLocalRows(type),current=new Map(),known=spExtraCloud[type]||{},writes=[],ownerName=String(S.space.name||(S.profile&&S.profile.name)||'عضو').slice(0,40);
      records.forEach(r=>{const id=String(r.localId);current.set(id,r);const k=known[id],hash=isEdit?spStable(r.payload):spStable([r.payload,ownerName]);if(!k||k.hash!==hash)writes.push({op:'set',id,docId:k?k.docId:(isEdit?encodeURIComponent(id):spDocId(uid,id)),hash,payload:r.payload,ownerUid:(isEdit&&k)?k.ownerUid:uid,ownerName:(isEdit&&k)?k.ownerName:ownerName})});
      Object.entries(known).forEach(([id,v])=>{if(!current.has(id)&&(!isEdit||v.fromSnap))writes.push({op:'delete',id,docId:v.docId})});
      for(let i=0;i<writes.length;i+=400){const chunk=writes.slice(i,i+400),b=F.writeBatch(db);chunk.forEach(w=>{const ref=F.doc(db,'spaces',code,'sharedData',type,'items',w.docId);if(w.op==='delete')b.delete(ref);else b.set(ref,{kind:type,localId:w.id,ownerUid:w.ownerUid,ownerName:w.ownerName,payload:w.payload,updatedAt:F.serverTimestamp()})});await b.commit();const base=isEdit?spBase(type):null;chunk.forEach(w=>{if(w.op==='delete'){delete spExtraCloud[type][w.id];if(base)delete base[w.id]}else{spExtraCloud[type][w.id]={docId:w.docId,hash:w.hash,ownerUid:w.ownerUid,ownerName:w.ownerName,fromSnap:false};if(base)base[w.id]=spClone(w.payload)}});if(isEdit)persist()}
    }
  }catch(e){spSetStatus(e&&e.code==='permission-denied'?'denied':'err')}
  finally{spTypesBusy=false;if(spTypesAgain){spTypesAgain=false;setTimeout(spPushTypes,180)}}
}
async function spEnsureMemberProfile(f,code){
  const {F,db,uid}=f,ref=F.doc(db,'spaces',code,'members',uid),snap=await F.getDoc(ref),nm=String(S.space.name||(S.profile&&S.profile.name)||'عضو').slice(0,24);
  let prefs=spNormPrefs(S.space.sharePrefs,true);
  if(snap.exists()){
    const d=snap.data()||{};if(d.sharePrefs&&typeof d.sharePrefs==='object')prefs=spNormPrefs(d.sharePrefs,true);
    if(!d.sharePrefs||!spPrefSame(d.sharePrefs,prefs))await F.setDoc(ref,{uid,name:nm,sharePrefs:prefs,updatedAt:F.serverTimestamp()},{merge:true});
  }else await F.setDoc(ref,{uid,name:nm,sharePrefs:prefs,updatedAt:F.serverTimestamp()});
  S.space.sharePrefs=prefs;S.space.shareDraft={...prefs};S.space.uid=uid;persist();
}
/* one listener set at a time: the boot timer and the "online" event could both start one */
async function spListen(){
  if(!S.space||spUnsub||spListening)return;spListening=true;
  try{await spListenInner()}finally{spListening=false}
}
async function spListenInner(){
  if(!S.space||spUnsub)return;spSetStatus('sync');let f;try{f=await fbInit()}catch(e){spSetStatus('off');return}if(!S.space||spUnsub)return;
  if(S.space.uid&&f.uid!==S.space.uid){spLocalLeave('حساب المساحة على الموبايل ده اتغير (غالبًا بعد مسح بيانات التطبيق أو تثبيته من جديد). ابعت طلب انضمام جديد بنفس الكود من "الانضمام لمساحة".');return}
  spReady=false;spHash={};spOwners={};spCloudExpenses={};const {F,db}=f,code=S.space.code;
  try{await spEnsureMemberProfile(f,code)}catch(e){}
  spUnsub=F.onSnapshot(F.collection(db,'spaces',code,'expenses'),snap=>{if(!S.space||S.space.code!==code)return;spApply(snap);spReady=true;spSetStatus((snap.metadata.fromCache&&!navigator.onLine)?'off':'on');spPush()},err=>{spSetStatus(err&&err.code==='permission-denied'?'denied':'err');if(err&&err.code==='permission-denied')spCheckRemoved()});
  SP_EXTRA_TYPES.forEach(type=>{
    spExtraReady[type]=false;
    const unsub=F.onSnapshot(F.collection(db,'spaces',code,'sharedData',type,'items'),snap=>{
      if(!S.space||S.space.code!==code)return;
      const rows=snap.docs.map(docSnap=>({docId:docSnap.id,...(docSnap.data()||{})})).filter(x=>x.payload&&!x.deleted);
      spExtraData[type]=rows;
      if(type==='reports'){const own={};rows.forEach(d=>{if(d.ownerUid===f.uid)own[String(d.localId)]={docId:d.docId,hash:spStable([d.payload||{},d.ownerName||''])}});spExtraCloud[type]=own}
      else{const prefOn=!!spNormPrefs(S.space.sharePrefs,true)[type];spApplyShared(type,rows);const all={};rows.forEach(d=>{all[String(d.localId)]={docId:d.docId,hash:spStable(d.payload||{}),ownerUid:d.ownerUid,ownerName:d.ownerName||'',fromSnap:prefOn}});spExtraCloud[type]=all}
      spExtraReady[type]=!spCurrencyBlocked[type];renderSpace();spPushTypes();
    },err=>{if(err&&err.code==='permission-denied')spSetStatus('denied');else spSetStatus('err')});spExtraUnsubs.push(unsub);
  });
  spUnsubP=F.onSnapshot(F.collection(db,'spaces',code,'members'),snap=>{if(!S.space||S.space.code!==code)return;spMemberProfiles=snap.docs.map(d=>({uid:d.id,...(d.data()||{})}));renderSpace()},()=>{});
  spUnsubM=F.onSnapshot(F.doc(db,'spaces',code),s=>{
    if(!S.space||S.space.code!==code)return;const data=s.data()||{};spMemberIds=Array.isArray(data.memberIds)?data.memberIds.filter(isId):[];spMembers=spMemberIds.length;spOwner=data.owner===f.uid;
    if(s.exists()&&!spMemberIds.includes(f.uid)){spCheckRemoved();return}
    if(spOwner&&!spUnsubR){spRequestsPrimed=false;spUnsubR=F.onSnapshot(F.collection(db,'spaces',code,'joinRequests'),snap=>{
      if(!S.space||S.space.code!==code||!spOwner)return;
      if(spRequestsPrimed)snap.docChanges().forEach(ch=>{const d=ch.doc.data()||{};if(ch.type==='added'&&d.status==='pending')toast(`طلب انضمام جديد من ${d.name||'عضو'}`)});
      spRequestsPrimed=true;spReqErr=false;spRequests=snap.docs.map(d=>({uid:d.id,...(d.data()||{})})).filter(r=>r.status==='pending');renderSpace();
    },()=>{spReqErr=true;spRequests=[];renderSpace()})}
    if(!spOwner&&spUnsubR){spUnsubR();spUnsubR=null;spRequests=[]}renderSpace();
  },err=>{if(err&&err.code==='permission-denied')spCheckRemoved()});
}
/* create / join: the form opens right under the two buttons (no sheet); tapping the same button again closes it */
function openSpPanel(mode){
  const pn=$('#spPanel'); if(!pn.hidden&&spMode===mode){spPanelClose();return}
  spMode=mode;$('#spCodeWrap').hidden=mode!=='join';$('#spGo').textContent=mode==='create'?'إنشاء':'إرسال طلب الانضمام';$('#spName').value=(S.profile&&S.profile.name)||'';$('#spCodeIn').value=mode==='join'&&S.spaceLostCode?spFmt(S.spaceLostCode):'';$('#spErr').textContent='';spRenderSetupTypes();
  $('#spCreate').classList.toggle('primary',mode==='create');$('#spJoin').classList.toggle('primary',mode==='join');
  $('#spCreate').setAttribute('aria-expanded',mode==='create');$('#spJoin').setAttribute('aria-expanded',mode==='join');
  pn.hidden=false;pn.classList.remove('sub-anim');void pn.offsetWidth;pn.classList.add('sub-anim');
  setTimeout(()=>{try{pn.scrollIntoView({behavior:'smooth',block:'nearest'})}catch(e){}},60);
}
function spPanelClose(){const pn=$('#spPanel'); if(!pn) return; pn.hidden=true; $('#spErr').textContent='';
  $('#spCreate').classList.add('primary');$('#spJoin').classList.remove('primary');
  $('#spCreate').setAttribute('aria-expanded','false');$('#spJoin').setAttribute('aria-expanded','false');
  ['spName','spCodeIn'].forEach(i=>{const x=$('#'+i); if(x) x.blur()})}
$('#spCreate').onclick=()=>openSpPanel('create');$('#spJoin').onclick=()=>openSpPanel('join');$('#spCancel').onclick=spPanelClose;
$('#spGo').onclick=async()=>{
  const btn=$('#spGo');if(btn.disabled)return;$('#spErr').textContent='';const name=$('#spName').value.trim().replace(/\s+/g,' ').slice(0,24);let code='';
  if(spMode==='join'){if(!name){$('#spErr').textContent='اكتب اسمك عشان صاحب المساحة يعرف مين مقدم الطلب';return}code=spNorm($('#spCodeIn').value);if(!spCodeOk(code)){$('#spErr').textContent='الكود لازم يكون 8 حروف وأرقام (المساحات القديمة كودها 10)';return}}
  btn.disabled=true;const t0=btn.textContent;btn.textContent='لحظة...';
  try{
    const f=await withTimeout(fbInit(),15000),{F,db}=f,prefs=spNormPrefs(spDraftPrefs(),false);
    if(spMode==='create'){
      // a code that is already taken is refused by the rules (writing it would be an update, not a create),
      // so try a fresh code a couple of times before showing an error
      for(let tries=0;;tries++){
        code=spGen();const spaceRef=F.doc(db,'spaces',code),memberRef=F.doc(db,'spaces',code,'members',f.uid),batch=F.writeBatch(db);
        batch.set(spaceRef,{owner:f.uid,memberIds:[f.uid],createdAt:F.serverTimestamp()});batch.set(memberRef,{uid:f.uid,name,sharePrefs:prefs,updatedAt:F.serverTimestamp()});
        try{await withTimeout(batch.commit(),12000);break}catch(e){if(tries>=2||!e||e.code!=='permission-denied')throw e}
      }
      S.space={code,uid:f.uid,name,auto:false,old:S.expenses.map(e=>e.id),sharePrefs:prefs,shareDraft:{...prefs}};S.spaceRequest=null;S.spaceShareDraft=null;save();spPanelClose();renderSpace();spListen();toast('اتعملت المساحة. ابعت الكود لصاحبك');
    }else{
      if(await spIsClosed(f,code)){$('#spErr').textContent=SP_CLOSED_MSG;return}
      const reqRef=F.doc(db,'spaces',code,'joinRequests',f.uid),snap=await withTimeout(F.getDoc(reqRef),12000);
      if(snap.exists()&&snap.data().status==='pending'){
        const requested=spNormPrefs(snap.data().sharePrefs||prefs,true);S.spaceRequest={code,uid:f.uid,name,status:'pending',sharePrefs:requested};save();spPanelClose();renderSpace();spWatchJoinRequest();toast('طلب الانضمام مستني موافقة صاحب المساحة');
      }else if(snap.exists()&&snap.data().status==='approved'){
        let ids=[];try{const spaceSnap=await withTimeout(F.getDoc(F.doc(db,'spaces',code)),12000);ids=spaceSnap.exists()?(spaceSnap.data().memberIds||[]):[]}catch(e){if(!e||e.code!=='permission-denied')throw e}
        if(ids.includes(f.uid))spActivateJoin(code,f.uid,name,snap.data().sharePrefs||prefs);else{
          await withTimeout(F.setDoc(reqRef,{uid:f.uid,name,status:'pending',sharePrefs:prefs,requestedAt:F.serverTimestamp()}),12000);S.spaceRequest={code,uid:f.uid,name,status:'pending',sharePrefs:prefs};save();spPanelClose();renderSpace();spWatchJoinRequest();toast('طلب الانضمام مستني موافقة صاحب المساحة');
        }
      }else{
        // after a rejection / removal the rules make the requester wait SP_RETRY_MS before asking again
        const od=snap.exists()?snap.data():null, rAt=od&&od.resolvedAt&&od.resolvedAt.toMillis?od.resolvedAt.toMillis():0, wait=od&&['rejected','removed'].includes(od.status)&&rAt?SP_RETRY_MS-(Date.now()-rAt):0;
        if(wait>0){$('#spErr').textContent=`تقدر تبعت طلب انضمام جديد للمساحة دي بعد ${Math.max(1,Math.ceil(wait/60000))} دقيقة`;return}
        await withTimeout(F.setDoc(reqRef,{uid:f.uid,name,status:'pending',sharePrefs:prefs,requestedAt:F.serverTimestamp()}),12000);S.spaceRequest={code,uid:f.uid,name,status:'pending',sharePrefs:prefs};save();spPanelClose();renderSpace();spWatchJoinRequest();toast('طلب الانضمام اتبعت لصاحب المساحة');
      }
    }
    if(S.space||S.spaceRequest){S.spaceLostCode=null;save()}
  }catch(e){$('#spErr').textContent=(spMode==='join'&&e&&e.code==='permission-denied')?'الكود غلط، أو المساحة اكتملت (5 أعضاء)':spErrMsg(e)}finally{btn.disabled=false;btn.textContent=t0}
};
function armBtn(b,idle,confirmTxt,fn){const id=()=>b.dataset.idle||idle;b.onclick=()=>{if(!b.dataset.arm){b.dataset.arm='1';b.textContent=confirmTxt;clearTimeout(b._t);b._t=setTimeout(()=>{delete b.dataset.arm;b.textContent=id()},4000);return}delete b.dataset.arm;clearTimeout(b._t);b.textContent=id();fn()}}
let spLeaving=false;
armBtn($('#spLeave'),'الخروج من المساحة','دوس تاني للتأكيد',async()=>{
  const code=S.space&&S.space.code;if(!code||spLeaving)return;
  const netFail=()=>toast('مفيش اتصال بالسيرفر، اتأكد من الإنترنت وجرب الخروج تاني');
  let f=fb;if(!f){try{f=await withTimeout(fbInit(),8000)}catch(e){netFail();return}}
  spLeaving=true;let last=false,wipe=null;
  try{const ref=f.F.doc(f.db,'spaces',code),upd={memberIds:f.F.arrayRemove(f.uid)};
    const s=await withTimeout(f.F.getDoc(ref),8000),data=s.data()||{},ids=Array.isArray(data.memberIds)?data.memberIds:[],others=ids.filter(x=>x!==f.uid);
    if(data.owner===f.uid&&others.length)upd.owner=others[0];
    // the last member out closes the space: its shared data is wiped first (while he is still a member),
    // then he leaves, and the empty space stays as a marker so nobody can join it or take its code again
    last=ids.length===1&&ids[0]===f.uid;
    if(last){spStop();toast('بنقفل المساحة ونمسح بياناتها المشتركة...',null,null,8000);wipe=await spWipeSpace(f,code)}
    await withTimeout(f.F.updateDoc(ref,upd),8000)}
  catch(e){if(!e||(e.code!=='permission-denied'&&e.code!=='not-found')){spLeaving=false;if(last)spListen();netFail();return}}
  spLeaving=false;
  const me=(S.space&&S.space.uid)||spMe();spStop();const n=spPurgeOthers(code,me);
  S.space=null;save();renderSpace();renderAll();
  if(last)toast(wipe&&wipe.failed?'خرجت من المساحة واتقفلت، ومحدش يقدر ينضم ليها تاني. شوية بيانات مقدرتش تتمسح من السيرفر، بس محدش يقدر يوصلها':'خرجت من المساحة واتقفلت، واتمسحت بياناتها المشتركة من السيرفر. بياناتك فضلت على موبايلك',null,null,7000);
  else toast(n?`خرجت من المساحة. بياناتك فضلت عندك، واتشالت ${n} سجلات بتاعة الأعضاء التانيين`:'خرجت من المساحة. بياناتك المحلية فضلت عندك');
});
armBtn($('#spUpload'),'مشاركة مصاريفي يدويًا','دوس تاني للتأكيد',()=>{
  if(!S.space||!spNormPrefs(S.space.sharePrefs,true).expenses)return;
  const pending=S.expenses.filter(e=>!e.sp&&!Object.prototype.hasOwnProperty.call(spHash,e.id)).map(e=>e.id);S.space.manual=Array.from(new Set([...(S.space.manual||[]),...pending]));save();spPush();renderSpace();toast('بنشارك المصاريف المحددة للمساحة');
});
$('#spAuto').onchange=e=>{if(!S.space)return;if(!spNormPrefs(S.space.sharePrefs,true).expenses){e.target.checked=false;return}S.space.auto=e.target.checked;save();spPush();toast(S.space.auto?'المشاركة التلقائية مفعلة للمصاريف الجديدة':'اتوقفت المشاركة التلقائية؛ المصاريف المشتركة تفضل ظاهرة والجديدة تبقى خاصة');renderSpace()};
$('#spTypeList').onchange=e=>{
  const type=e.target&&e.target.dataset&&e.target.dataset.spType;if(!type)return;const prefs=spDraftPrefs();prefs[type]=!!e.target.checked;
  if(S.space){S.space.shareDraft=prefs;save()}else if(S.spaceRequest){S.spaceRequest.sharePrefs=prefs;save()}else{S.spaceShareDraft=prefs;save()}renderSpace();
};
$('#spSetupTypeList').onchange=e=>{
  const type=e.target&&e.target.dataset&&e.target.dataset.spType;if(!type)return;const prefs=spDraftPrefs();prefs[type]=!!e.target.checked;
  if(S.spaceRequest&&S.spaceRequest.status==='rejected')S.spaceRequest.sharePrefs=prefs;else S.spaceShareDraft=prefs;save();
};
$('#spSavePrefs').onclick=async()=>{
  if(!S.space)return;if(!fb){toast('اتصل بالإنترنت أولًا لحفظ اختيارات المشاركة');return}const btn=$('#spSavePrefs'),prefs=spNormPrefs(S.space.shareDraft||S.space.sharePrefs,true),old=spNormPrefs(S.space.sharePrefs,true);if(spPrefSame(prefs,old)){renderSpace();return}
  btn.disabled=true;const text=btn.textContent;btn.textContent='جارٍ الحفظ...';
  try{
    const {F,db,uid}=fb,ref=F.doc(db,'spaces',S.space.code,'members',uid);await withTimeout(F.setDoc(ref,{uid,name:String(S.space.name||(S.profile&&S.profile.name)||'عضو').slice(0,24),sharePrefs:prefs,updatedAt:F.serverTimestamp()},{merge:true}),12000);
    S.space.sharePrefs=prefs;S.space.shareDraft={...prefs};if(!prefs.expenses)S.space.auto=false;SP_EXTRA_TYPES.filter(t=>t!=='reports'&&prefs[t]).forEach(t=>{spApplyShared(t,spExtraData[t]||[]);Object.values(spExtraCloud[t]||{}).forEach(v=>{v.fromSnap=true})});
    save();spQueue();renderSpace();toast('اتحفظت اختيارات المشاركة');
  }catch(e){toast(spErrMsg(e))}finally{btn.disabled=false;btn.textContent=text}
};
$('#spMemList').onclick=e=>{const b=e.target.closest('[data-sp-remove]');if(!b)return;const u=b.dataset.spRemove;clearTimeout(spRemoveT);
  if(spRemoveArm!==u){spRemoveArm=u;renderSpace();spRemoveT=setTimeout(()=>{spRemoveArm=null;renderSpace()},4000);return}
  spRemoveArm=null;renderSpace();spRemoveMember(u)};
$('#spReqList').onclick=e=>{const a=e.target.closest('[data-sp-accept]'),r=e.target.closest('[data-sp-reject]');if(a)spDecideRequest(a.dataset.spAccept,true);else if(r)spDecideRequest(r.dataset.spReject,false)};
$('#spCancelRequest').onclick=async()=>{
  const req=S.spaceRequest;if(!req)return;
  try{if(req.status==='pending'){const f=await withTimeout(fbInit(),12000),ref=f.F.doc(f.db,'spaces',req.code,'joinRequests',req.uid);await withTimeout(f.F.updateDoc(ref,{status:'cancelled',resolvedBy:f.uid,resolvedAt:f.F.serverTimestamp()}),12000)}
    S.spaceShareDraft=spNormPrefs(req.sharePrefs,true);spStopJoinWatch();S.spaceRequest=null;save();renderSpace();
  }catch(e){toast(e&&e.code==='permission-denied'?'تعذر إلغاء الطلب. تأكد من نشر قواعد Firestore الجديدة':spErrMsg(e))}
};
async function copyText(c){try{await navigator.clipboard.writeText(c);return true}catch(e){const t=document.createElement('textarea');t.value=c;t.setAttribute('readonly','');t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);t.select();let ok=false;try{ok=document.execCommand('copy')}catch(_){}t.remove();return ok}}
$('#supVfc').onclick=async()=>{const ok=await copyText('01001649278');
  toast(ok?'اتنسخ الرقم 01001649278. افتح تطبيق محفظتك واختار «تحويل لمحفظة» والصق الرقم':'رقم فودافون كاش: 01001649278',null,null,6000)};
$('#spCopy').onclick=async()=>{if(!S.space)return;const c=spFmt(S.space.code);try{await navigator.clipboard.writeText(c)}catch(e){const t=document.createElement('textarea');t.value=c;document.body.appendChild(t);t.select();try{document.execCommand('copy')}catch(_){}t.remove()}toast('اتنسخ الكود: '+c)};
window.addEventListener('online',()=>{if(S.space&&!spUnsub)spListen();else if(S.space&&spUnsub&&spReady){spPush();spPushTypes()}});


/* ===== Receipt photos =====
   Kept in IndexedDB (localStorage is only a few MB and holds text), keyed by the expense id.
   They stay on this phone: never sent to the shared space. The manual Android backup carries them. */
const RC={db:null, ids:new Set(), can:!!window.indexedDB};
function rcDB(){
  if(RC.db) return Promise.resolve(RC.db);
  return new Promise((res,rej)=>{
    if(!RC.can) return rej(new Error('no-idb'));
    let r; try{r=indexedDB.open(rcDbName(ME.id),1)}catch(e){return rej(e)}
    r.onupgradeneeded=()=>{const d=r.result; if(!d.objectStoreNames.contains('receipts')) d.createObjectStore('receipts')};
    r.onsuccess=()=>{RC.db=r.result; RC.db.onversionchange=()=>{try{RC.db.close()}catch(e){} RC.db=null}; res(RC.db)};
    r.onerror=()=>rej(r.error); r.onblocked=()=>rej(new Error('blocked'));
  });
}
function rcTx(mode,fn){return rcDB().then(d=>new Promise((res,rej)=>{
  const t=d.transaction('receipts',mode), q=fn(t.objectStore('receipts'));
  t.oncomplete=()=>res(q?q.result:undefined); t.onerror=t.onabort=()=>rej(t.error||new Error('tx'));
}))}
const rcPut=(id,blob)=>rcTx('readwrite',st=>st.put(blob,id)).then(()=>{RC.ids.add(id)});
const rcGet=id=>rcTx('readonly',st=>st.get(id));
const rcDel=id=>rcTx('readwrite',st=>st.delete(id)).then(()=>{RC.ids.delete(id)}).catch(()=>{});
