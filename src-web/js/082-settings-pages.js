/* ===== Settings: home list + one page per section, with search ===== */
var setPage=null, setHomeY=0; // var on purpose: go() may run before this line on a very early tap
/* the app scrolls inside <body> (html and body are 100% high), not the window: read and set both */
function pageY(){return Math.max(document.body.scrollTop||0,(document.scrollingElement||document.documentElement).scrollTop||0,window.scrollY||0)}
function pageTo(y){document.body.scrollTop=y;(document.scrollingElement||document.documentElement).scrollTop=y;if(window.scrollY!==y)window.scrollTo(0,y)}
function pageTopSmooth(){[document.body,document.scrollingElement||document.documentElement].forEach(el=>{try{el.scrollTo({top:0,behavior:'smooth'})}catch(e){el.scrollTop=0}})}
const SET_T_NAMES={}; document.querySelectorAll('#setGroups [data-set-go]').forEach(b=>{SET_T_NAMES[b.dataset.setGo]=b.querySelector('b').textContent});
function setGo(p,quiet){
  if(p==='data'){openWipe();return} // one action, no page of its own: the row opens the confirm sheet
  if(p==='trash'){openTrash();return} // same: the row opens the trash sheet
  if(p==='update'){updManualCheck();return} // same: the row looks for an update right away
  if(p&&!setPage) setHomeY=pageY();
  if(setPage==='space'&&p!=='space'){try{spPanelClose()}catch(e){}}
  setPage=p||null;
  $('#setHome').hidden=!!setPage;
  document.querySelectorAll('#v-settings>.set-page').forEach(x=>{x.hidden=x.dataset.page!==setPage});
  if(setPage==='feedback'){fbPaint();errPaint()}
  if(setPage==='lang') langPaint(LANG);
  if(setPage){const el=document.querySelector(`#v-settings>.set-page[data-page="${setPage}"]`); if(!quiet){el.classList.remove('sub-anim');void el.offsetWidth;el.classList.add('sub-anim')} pageTo(0)}
  else{renderSetHome(); if(!quiet){const h=$('#setHome');h.classList.remove('sub-anim');void h.offsetWidth;h.classList.add('sub-anim')} pageTo(quiet?0:setHomeY)}
}
document.querySelectorAll('#v-settings [data-set-back]').forEach(b=>b.onclick=()=>setGo(null));
$('#setGroups').onclick=e=>{const b=e.target.closest('[data-set-go]'); if(b) setGo(b.dataset.setGo)};
const SET_THEME={light:'فاتح',dark:'داكن',system:'تابع للنظام'};
function setSub(k,fn){try{const t=fn(); $('#ss-'+k).textContent=t}catch(e){}}
function renderSetHome(){
  setSub('lang',()=>LANG_NAMES[LANG]);
  $('#si-capture').hidden=!(AB&&AB.captureState); $('#si-widget').hidden=!AB;
  setSub('members',()=>{const n=MB.list.length; return (ME.name||(S.profile&&S.profile.name)||'انت')+' · '+(n===1?'عضو واحد':n===2?'عضوين':n+' أعضاء')});
  setSub('security',()=>!hasPin()?'من غير قفل':(S.lockKind==='pass'?'كلمة سر':'رقم سري')+(S.bio&&AB?' وبصمة':''));
  setSub('appearance',()=>(SET_THEME[S.theme]||'تابع للنظام')+(S.style&&STYLES[S.style]?' · ستايل '+STYLES[S.style].name:'')+(lookId()!=='classic'?' · شكل '+LOOKS.find(x=>x.id===lookId()).name:''));
  setSub('cats',()=>S.cats.length+' فئة');
  setSub('trash',()=>{trashSweep(); const n=trashAll().length; return n===0?'فاضية':n===1?'عنصر واحد':n===2?'عنصرين':n<=10?n+' عناصر':n+' عنصر'});
  setSub('pays',()=>{const n=S.pays.length; return n===1?'طريقة واحدة':n===2?'طريقتين':n<=10?n+' طرق':n+' طريقة'});
  setSub('alerts',()=>S.remind?'التذكير اليومي '+fmtRemAt(S.remindAt):'التذكير اليومي مقفول');
  setSub('capture',()=>capState().on?'شغال':'مقفول');
  setSub('widget',()=>S.wgHide?'المبالغ مخفية في الويدجت':'ويدجت للشاشة الرئيسية وبلاطة الصوت');
  setSub('space',()=>S.space?'متصلة · الكود '+spFmt(S.space.code):(S.spaceRequest&&S.spaceRequest.status==='pending')?'طلب انضمام مستني الموافقة':'مش مفعّلة');
  setSub('backup',()=>{
    if(!AB) return S.lastBackup?'آخر نسخة '+shortDate(S.lastBackup):'لسه معملتش نسخة';
    if(S.drive) return S.driveFails?'⚠️ آخر رفع على Drive فشل':S.lastDriveBk?'Drive ✓ · آخر نسخة '+shortDate(S.lastDriveBk):'Drive مربوط';
    return !(+S.autoBkDays>0)?'النسخ التلقائي مقفول':S.lastAutoBk?'على الموبايل · آخر نسخة '+shortDate(S.lastAutoBk):'لسه معملتش نسخة';
  });
  {const on=!!(AB&&AB.updateState); $('#sg-app').hidden=false; $('#sg-app-list').hidden=false; $('#si-update').hidden=!on} // the group always shows now: suggestions work on the web too
  setSub('update',()=>updLabel());
  setSub('feedback',()=>'اقتراح أو مشكلة وصلتلك');
  setSub('data',()=>'المصاريف والسلف والجمعيات');
}
/* search: every setting with the words people would type for it */
const SET_IDX=[
  ['lang','اللغة','لغة language english انجليزي إنجليزي فصحى عامية عربي'],
  ['members','الأعضاء','عضو مستخدم اسم'],['members','إضافة عضو','جديد','mbAdd'],['members','تبديل العضو','غير','mbSwitch'],['members','مسح عضو','حذف نسي كلمة السر','mbList'],
  ['security','قفل بكلمة سر','رقم سري باسورد كلمة مرور pin','pinToggle'],['security','تغيير كلمة السر','رقم سري باسورد','lockChangeRow'],['security','قفل بالبصمة','بصمه fingerprint','bioToggle'],
  ['appearance','فاتح وداكن','ثيم الوضع الليلي dark light','themeSeg'],['appearance','ستايل التطبيق','ثيمات شكل تصميم','styleGrid'],['appearance','لون التطبيق','الوان','accentRow'],['appearance','الخط','خطوط خط عريض غامق سمك bold كايرو تجوال المراعي الاسكندريه ريدكس','fontCard'],['appearance','شكل الواجهة','تصميم مسطح مضغوط مريح ناعم كلاسيك خط كبير صغير','lookCard'],['appearance','نبضة الأزرار','حركه ضغطه زرار موجه توهج نابضه هاديه','pressList'],['appearance','حركة التنقل','انتقال انزلاق تكبير تلاشي انيميشن حركه الشاشات','transList'],['appearance','اهتزاز خفيف','هزاز اهتزاز vibration','hapticRow'],
  ['cats','الفئات','فئه تصنيف ترتيب','catList'],['cats','إضافة فئة جديدة','فئه','addCat'],['cats','حد شهري للفئة','ميزانيه فئه حد اقصي','catList'],
  ['pays','طرق الدفع','كاش فيزا محفظه انستاباي الافتراضيه','payList'],['pays','إضافة طريقة دفع','','addPay'],
  ['alerts','تنبيه قرب نهاية الميزانية','80% ميزانيه','row80'],['alerts','نسبة التنبيه','ميزانيه','rowPct'],['alerts','التذكير اليومي','تذكير','remindToggle'],['alerts','وقت التذكير','ساعه','remindTimeRow'],
  ['alerts','تذكير بالمواعيد','سلف جمعيات مصاريف ثابته','dueToggle'],['alerts','الملخص الشهري','ملخص','sumToggle'],['feedback','اقتراحات وملاحظات','اقتراح مشكلة شكوى ابلاغ رأي فكرة تواصل المطور','fbText'],['feedback','سجل الأخطاء','اخطاء خطأ عطل مشكلة تقرير تعليق سجل log crash','errCard'],['alerts','التذكير في الميعاد بالظبط','منبهات بطاريه','exactRow'],
  ['capture','التسجيل من إشعارات البنك','رسايل بنك محفظه انستاباي لقط تلقائي','capToggle'],['capture','تطبيقات بتتجاهلها','','capBlockedWrap'],['capture','رسوم إنستاباي','رسوم انستاباي تحويل عموله','ipFeeToggle'],
  ['widget','إضافة ويدجت','شاشه رئيسيه','wgAddS'],['widget','بلاطة مصروف بالصوت','اعدادات سريعه صوت','wgAddTile'],['widget','إخفاء المبالغ في الويدجت','','wgHide'],
  ['space','المساحة المشتركة','مشاركه اسره كود','spaceCard'],['space','إنشاء مساحة','','spCreate'],['space','الانضمام بكود','انضمام','spJoin'],['space','الخروج من المساحة','','spLeave'],
  ['backup','اعمل نسخة احتياطية دلوقتي','نسخه جوجل درايف backup','backupBtn'],['backup','استعادة نسخة احتياطية','استرجاع رجوع النسخه من جوجل درايف','restoreBtn'],['backup','نسخ احتياطي تلقائي','تلقائي مده كل قد ايه','autoBkRow'],['backup','Google Drive','جوجل درايف ربط حساب رفع سحابه ايميل','bkAuto'],
  ['update','دوّر على تحديث','تحديث نسخه جديده اصدار ابديت update التحديثات',''],
  ['trash','سلة المحذوفات','محذوفات استرجاع استرجع رجوع رجع مسح بالغلط حذف زباله سله',''],
  ['data','مسح كل المصاريف والالتزامات','حذف تصفير','']
].map(([p,t,k,el])=>({p,t,el,n:normAr(t+' '+TX(t)+' '+k+' '+(SET_T_NAMES[p]||'')+' '+TX(SET_T_NAMES[p]||''))}));
function setVisiblePage(p){const r=$('#si-'+p); return !(r&&r.hidden)}
function setSearch(){
  const q=normAr($('#setQ').value.trim()); $('#setQX').hidden=!q;
  $('#setRes').hidden=!q; $('#setGroups').hidden=!!q; $('#setHome .dev2').hidden=!!q; $('#supportCard').hidden=!!q; if(!q) return;
  const words=q.split(/\s+/).filter(Boolean);
  const hits=SET_IDX.filter(x=>setVisiblePage(x.p)&&words.every(w=>x.n.includes(w))).slice(0,12);
  $('#setResList').innerHTML=hits.length?hits.map((x,i)=>`<button type="button" class="set-item" data-set-hit="${i}"><span class="si" style="--c:${esc($('#si-'+x.p).querySelector('.si').style.getPropertyValue('--c'))}">${$('#si-'+x.p).querySelector('.si').innerHTML}</span><span class="st"><b>${esc(x.t)}</b><small>${esc(SET_T_NAMES[x.p]||'')}</small></span><svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg></button>`).join('')
    :'<div class="set-empty">مفيش إعداد بالاسم ده</div>';
  setHits=hits;
}
let setHits=[];
$('#setQ').addEventListener('input',setSearch);
$('#setQ').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('#setQ').blur();const b=$('#setResList [data-set-hit]');if(b)b.click()}});
$('#setQX').onclick=()=>{$('#setQ').value='';setSearch();$('#setQ').focus()};
$('#setResList').onclick=e=>{const b=e.target.closest('[data-set-hit]'); if(!b) return; const x=setHits[+b.dataset.setHit]; if(!x) return;
  $('#setQ').value=''; $('#setQ').blur(); setSearch(); setGo(x.p);
  const el=x.el&&document.getElementById(x.el); if(!el) return;
  const t=el.closest('.set-row')||el; setTimeout(()=>{t.scrollIntoView({behavior:'smooth',block:'center'}); t.classList.remove('set-flash'); void t.offsetWidth; t.classList.add('set-flash')},260);
};

