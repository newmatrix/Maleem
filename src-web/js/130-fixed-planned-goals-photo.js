/* fixed expenses */
function fixedEvery(f){return intIn(f.everyMonths,1,120,1)}
function fixedEveryLabel(n){return LANG==='en'?(n===1?'Every month':`Every ${n} months`):n===1?'كل شهر':n===2?'كل شهرين':`كل ${n} شهور`}
function fixedScheduled(f,mk){
  if(f.paused)return false;
  const anchor=f.from||monKey(f.created||Date.now());
  if(mk<anchor)return false;
  const [y,m]=mk.split('-').map(Number),[ay,am]=anchor.split('-').map(Number);
  return ((y-ay)*12+m-am)%fixedEvery(f)===0;
}
function fixedOcc(f,mk){const [y,m]=mk.split('-').map(Number), d=new Date(y,m-1,Math.min(f.day,daysIn(mk)));return {dk:dayKey(d),ts:d.getTime()}}
function fixedUnit(f){return f.repeat==='daily'||f.repeat==='weekly'?f.repeat:'monthly'}
function fixedRuleLabel(f){return TX(fixedUnit(f)==='daily'?'كل يوم':fixedUnit(f)==='weekly'?'كل أسبوع':fixedEveryLabel(fixedEvery(f)))}
function fixedOccurrences(f,start,end){
  if(f.paused||!(end>start))return [];
  const out=[],unit=fixedUnit(f),anchor=f.startDate||(f.from?f.from+'-01':dayKey(f.created||Date.now()));
  const add=(dk,key)=>{const ts=dkToTs(dk);if(ts>=start&&ts<end&&dk>=anchor&&(!f.endDate||dk<=f.endDate))out.push({dk,ts,key})};
  if(unit==='monthly'){
    let mk=monKey(start);const last=monKey(end-1);
    while(mk<=last){if(fixedScheduled(f,mk)){const o=fixedOcc(f,mk);add(o.dk,mk)}mk=nextMonth(mk)}
  }else{
    const utcDay=dk=>{const [y,m,d]=dk.split('-').map(Number);return Date.UTC(y,m-1,d)/864e5};
    const origin=utcDay(anchor),step=unit==='weekly'?7:1,d=new Date(Math.max(start,dkToTs(anchor)));d.setHours(0,0,0,0);
    while(d.getTime()<end){const dk=dayKey(d);if((utcDay(dk)-origin)%step===0)add(dk,dk);d.setDate(d.getDate()+1)}
  }
  return out;
}
function fixedDueItems(range){
  const out=[],mk=monKey(Date.now()),start=dkToTs(mk+'-01'),end=dkToTs(nextMonth(nextMonth(mk))+'-01');
  S.fixed.forEach(f=>fixedOccurrences(f,start,end).forEach(o=>{
    if(S.fixedLog[f.id+':'+o.key])return;const n=diffDays(o.dk);if(n>range)return;const c=CAT[f.cat]||CAT.other;
    out.push({id:'f:'+f.id+':'+o.key,n,icon:c.e,title:f.name,amount:+f.amount||0,when:relDay(n),cls:dueCls(n),fpay:f.id+':'+o.key});
  }));return out;
}
function fixedPendingIn(start,end){
  let total=0;S.fixed.forEach(f=>{if(!(+f.amount))return;fixedOccurrences(f,start,end).forEach(o=>{if(!S.fixedLog[f.id+':'+o.key])total+=+f.amount})});
  S.plans.forEach(x=>{const t=dkToTs(x.due);if(t>=start&&t<end)total+=+x.amount||0});return total;
}
function openFixed(id,pre){
  const f=id?S.fixed.find(x=>x.id===id):null;pre=!f&&pre?pre:null;
  const catOpts=S.cats.map(c=>({v:c.id,t:c.e+' '+c.name})),dayOpts=Array.from({length:31},(_,i)=>({v:i+1,t:String(i+1)}));
  const start=f?(f.startDate||fixedOcc(f,f.from||monKey(f.created||Date.now())).dk):todayKey();
  const legacyEvery=f?fixedEvery(f):1;
  openForm({title:f?'تعديل المصروف الثابت':'مصروف ثابت جديد',save:f?'حفظ التعديل':'إضافة',fields:[
    {key:'name',placeholder:'اسمه، مثلاً الإيجار',value:f?f.name:pre?pre.name:''},
    {key:'cat',type:'select',label:'الفئة',options:catOpts,value:f?f.cat:pre&&CAT[pre.cat]?pre.cat:(CAT.home?'home':'other')},
    {key:'amount',type:'money',label:'المبلغ (سيبه فاضي لو بيتغير)',value:f&&f.amount?f.amount:pre&&pre.amount?pre.amount:''},
    {key:'repeat',type:'select',label:'نوع التكرار',options:[{v:'daily',t:'يومي'},{v:'weekly',t:'أسبوعي'},{v:'monthly',t:'شهري'}],value:f?fixedUnit(f):'monthly'},
    {key:'everyMonths',type:'select',label:'تكرار المصروف',options:[...Array.from({length:24},(_,i)=>({v:i+1,t:fixedEveryLabel(i+1)})),...(legacyEvery>24?[{v:legacyEvery,t:fixedEveryLabel(legacyEvery)}]:[])],value:legacyEvery},
    {key:'day',type:'select',label:'يوم الدفع في الشهر',options:dayOpts,value:f?f.day:pre&&pre.day?pre.day:new Date().getDate()},
    {key:'startDate',type:'date',label:'بداية التكرار',value:start},
    {key:'endDate',type:'date',label:'نهاية التكرار (اختياري)',value:f&&f.endDate||''},
    {key:'status',type:'select',label:'حالة التكرار',options:[{v:'active',t:'شغال'},{v:'paused',t:'متوقف'}],value:f&&f.paused?'paused':'active'}],
    onSave:v=>{
      const amount=parseFloat(v.amount)||0,day=Math.min(31,Math.max(1,parseInt(v.day)||1)),everyMonths=Number(v.everyMonths),cat=CAT[v.cat]?v.cat:'other';
      if(!v.name)return 'اكتب اسم المصروف';if(amount<0||amount>=MAXAMT)return TX('اكتب مبلغ صحيح');
      if(!isDK(v.startDate)||v.startDate<'2000-01-01')return TX('اختار تاريخ بداية صحيح');
      if(v.endDate&&(!isDK(v.endDate)||v.endDate<v.startDate))return TX('تاريخ النهاية لازم يكون بعد البداية أو نفس اليوم');
      if(!Number.isInteger(everyMonths)||everyMonths<1||(everyMonths>24&&everyMonths!==legacyEvery))return 'اختار عدد الشهور من 1 إلى 24';
      const repeat=['daily','weekly'].includes(v.repeat)?v.repeat:'monthly';
      const next={name:v.name,cat,amount,day,everyMonths,from:v.startDate.slice(0,7),startDate:v.startDate,repeat,paused:v.status==='paused'};
      if(f){Object.assign(f,next);if(v.endDate)f.endDate=v.endDate;else delete f.endDate}
      else S.fixed.push({id:uid(),...next,...(v.endDate?{endDate:v.endDate}:{}),created:Date.now()});
      save();renderAll();toast(TX(f?'اتحفظ التكرار':'اتضاف المصروف المتكرر'));
    }});
  const mode=$('#formBody [data-k=repeat]'),row=mode.closest('.pay-row');row.hidden=true;
  row.insertAdjacentHTML('afterend',`<div class="fixed-repeat-chips" role="group" aria-label="${esc(TX('نوع التكرار'))}">${[['daily','يومي'],['weekly','أسبوعي'],['monthly','شهري']].map(([v,t])=>`<button type="button" data-repeat="${v}" aria-pressed="${mode.value===v}">${esc(TX(t))}</button>`).join('')}</div>`);
  const paint=()=>{['everyMonths','day'].forEach(k=>$('#formBody [data-k='+k+']').closest('.pay-row').hidden=mode.value!=='monthly');$('#formBody').querySelectorAll('[data-repeat]').forEach(b=>b.setAttribute('aria-pressed',String(mode.value===b.dataset.repeat)))};
  $('#formBody .fixed-repeat-chips').onclick=e=>{const b=e.target.closest('[data-repeat]');if(b){mode.value=b.dataset.repeat;paint()}};paint();
  ['startDate','endDate'].forEach(k=>{const input=$('#formBody [data-k='+k+']');input.id='fixed-'+k;input.hidden=true;const button=document.createElement('button');button.type='button';button.className='sf-pick';button.id='fixedPick-'+k;input.after(button);
    const label=()=>{button.textContent='📅 '+(input.value?dkToDMY(input.value):TX(k==='endDate'?'بدون نهاية':'اختار اليوم'))};input.addEventListener('change',label);label();
    button.onclick=()=>{sfCalId=input.id;sfCalMonth=input.value?new Date(sfDay(input.value)):new Date();sfCalMonth.setDate(1);$('#sfCalendarTitle').textContent=TX(k==='startDate'?'بداية التكرار':'نهاية التكرار (اختياري)');sfCalendarPaint();$('#sfCalendar').showModal()};
  });
  const status=$('#formBody [data-k=status]');status.hidden=true;
  const toggle=document.createElement('label');toggle.className='switch';toggle.innerHTML='<input type="checkbox" id="fixedActiveToggle" role="switch" aria-label="'+esc(TX('حالة التكرار'))+'"><i></i>';status.after(toggle);
  const input=toggle.querySelector('input');input.checked=status.value!=='paused';input.onchange=()=>{status.value=input.checked?'active':'paused'};

}
function deleteFixed(id){const i=S.fixed.findIndex(x=>x.id===id); if(i<0) return; const [f]=S.fixed.splice(i,1); const tid=trashPut('fix',f,i); save();renderAll();
  toast('اتحذف '+f.name,'تراجع',()=>{trashDel(tid);S.fixed.splice(i,0,f);save();renderAll()},3000)}
$('#addFixed').onclick=()=>openFixed();
document.addEventListener('click',e=>{const b=e.target.closest('[data-fpay]'); if(!b) return; e.stopPropagation();
  const [fid,mk]=b.dataset.fpay.split(':'), f=S.fixed.find(x=>x.id===fid); if(!f||f.paused||S.fixedLog[fid+':'+mk]) return;
  openSheet(null,{amount:+f.amount||'',cat:f.cat,note:f.name,fx:{id:fid,mk}})});
$('#fxSkip').onclick=()=>{
  if(plPending){ const id=plPending, i=S.plans.findIndex(x=>x.id===id); plPending=null; closeSheets();
    if(i<0) return; const [x]=S.plans.splice(i,1); const tid=trashPut('plan',x,i); save(); renderAll();
    toast(`اتشال ${x.name} من المصروفات الجاية`,'تراجع',()=>{trashDel(tid);S.plans.splice(i,0,x);save();renderAll()},3000); return }
  if(!fxPending) return; const {id,mk}=fxPending, k=id+':'+mk;
  S.fixedLog[k]='skip'; fxPending=null; save(); closeSheets(); renderAll();
  toast(TX('تم تخطي الاستحقاق'),'تراجع',()=>{delete S.fixedLog[k];save();renderAll()},3000);
};

/* planned (one-time) expenses */
function openPlan(id,pre){
  const p=id? S.plans.find(x=>x.id===id):null; pre=!p&&pre?pre:null;
  const catOpts=S.cats.map(c=>({v:c.id,t:c.e+' '+c.name}));
  const tm=new Date(todayStart()); tm.setDate(tm.getDate()+1);
  openForm({title:p?'تعديل المصروف الجاي':'مصروف جاي', save:p?'حفظ التعديل':'إضافة',
    fields:[{key:'name',placeholder:'هتدفع إيه؟ مثلاً قسط الحضانة',value:p?p.name:pre?pre.name:''},
      {key:'cat',type:'select',label:'الفئة',options:catOpts,value:p?p.cat:pre&&CAT[pre.cat]?pre.cat:'other'},
      {key:'amount',type:'money',label:'المبلغ (سيبه فاضي لو لسه متعرفش)',value:p&&p.amount?p.amount:pre&&pre.amount?pre.amount:''},
      {key:'due',type:'date',label:'ميعاده',min:p?'':todayKey(),value:p?p.due:dayKey(tm)}],
    onSave:v=>{const amount=parseFloat(v.amount)||0, cat=CAT[v.cat]?v.cat:'other';
      if(!v.name) return 'اكتب اسم المصروف';
      if(!isDK(v.due)) return 'اختار ميعاده';
      if(!p&&v.due<todayKey()) return 'اختار ميعاد من النهارده وجاي';
      if(p){Object.assign(p,{name:v.name,cat,amount,due:v.due}); save();renderAll();toast('اتعدل '+v.name);return}
      S.plans.push({id:uid(),name:v.name,cat,amount,due:v.due,created:Date.now()}); save();renderAll();
      toast(`اتضاف ${v.name}، وهيفكّرك يوم ${dkToDMY(v.due)}`)}});
}
function deletePlan(id){const i=S.plans.findIndex(x=>x.id===id); if(i<0) return; const [x]=S.plans.splice(i,1); const tid=trashPut('plan',x,i); save();renderAll();
  toast('اتحذف '+x.name,'تراجع',()=>{trashDel(tid);S.plans.splice(i,0,x);save();renderAll()},3000)}
$('#addPlan').onclick=()=>openPlan();
document.addEventListener('click',e=>{const b=e.target.closest('[data-ppay]'); if(!b) return; e.stopPropagation();
  const x=S.plans.find(y=>y.id===b.dataset.ppay); if(!x) return;
  openSheet(null,{amount:+x.amount||'',cat:x.cat,note:x.name,pl:x.id})});

/* goals */
function openGoal(id){
  const g=id? S.goals.find(x=>x.id===id):null;
  openForm({title:g?'تعديل الهدف':'هدف ادخار جديد', save:g?'حفظ التعديل':'إضافة',
    fields:[{type:'emoji',value:g?g.e:null},{key:'name',placeholder:'بتحوش لإيه؟ مثلاً موبايل جديد',value:g?g.name:''},{key:'target',type:'money',label:'المبلغ المطلوب',value:g?g.target:''},{key:'saved',type:'money',label:'حوشت قد إيه لحد دلوقتي',value:g?(g.saved||''):''}],
    onSave:v=>{const target=parseFloat(v.target), saved=parseFloat(v.saved)||0; if(!v.name) return 'اكتب اسم الهدف'; if(!(target>0)) return 'اكتب المبلغ المطلوب';
      if(g) Object.assign(g,{name:v.name,target,saved,e:v.e}); else S.goals.push({id:uid(),name:v.name,target,saved,e:v.e,created:Date.now()});
      save();renderAll();toast(g?'اتعدل الهدف':`اتضاف هدف ${v.name}`)}});
}
function deleteGoal(id){const i=S.goals.findIndex(x=>x.id===id); if(i<0) return; const [g]=S.goals.splice(i,1); const tid=trashPut('goal',g,i); save();renderAll();
  toast('اتحذف هدف '+g.name,'تراجع',()=>{trashDel(tid);S.goals.splice(i,0,g);save();renderAll()},3000)}
function depositGoal(id){
  const g=S.goals.find(x=>x.id===id); if(!g) return;
  openForm({title:`ضيف فلوس لـ ${g.name}`, save:'ضيف', fields:[{key:'amount',type:'money',label:`فاضل ${fmt(g.target-(g.saved||0))} ${CS()}`}],
    onSave:v=>{const a=parseFloat(v.amount); if(!(a>0)) return 'اكتب المبلغ';
      const before=g.saved||0; g.saved=before+a; save();renderAll();
      toast(g.saved>=g.target? `وصلت لهدف ${g.name} 🎉` : `حوشت ${fmt(a)} ${CS()} لـ ${g.name}`,'تراجع',()=>{g.saved=before;save();renderAll()},3000)}});
}
$('#addGoal').onclick=()=>openGoal();
document.addEventListener('click',e=>{const b=e.target.closest('[data-gdep]'); if(b) depositGoal(b.dataset.gdep)});

/* photo */
$('#meAv').onclick=()=>{ if(!(S.profile&&S.profile.photo)) $('#photoFile').click() };
$('#dataAv').onclick=()=>{ if(!(S.profile&&S.profile.photo)) $('#photoFile').click() };
$('#photoFile').onchange=e=>{
  const f=e.target.files&&e.target.files[0]; e.target.value=''; if(!f) return;
  const r=new FileReader(); r.onload=()=>{const img=new Image(); img.onload=()=>{
    const N=240, c=document.createElement('canvas'); c.width=c.height=N; const x=c.getContext('2d');
    const m=Math.min(img.width,img.height); x.drawImage(img,(img.width-m)/2,(img.height-m)/2,m,m,0,0,N,N);
    S.profile={...S.profile,photo:c.toDataURL('image/jpeg',.85)}; save();renderMe();toast('اتغيرت الصورة')};
    img.onerror=()=>toast('الملف ده مش صورة'); img.src=r.result};
  r.readAsDataURL(f);
};
function removePhoto(){const old=S.profile.photo; S.profile={...S.profile,photo:null}; save();renderMe();
  toast('اتشالت الصورة','تراجع',()=>{S.profile={...S.profile,photo:old};save();renderMe()},3000)}
$('#profAge').addEventListener('input',e=>{const v=e.target.value.replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/\D/g,'').slice(0,3); if(e.target.value!==v) e.target.value=v; $('#profErr').textContent=''});
$('#profName').addEventListener('input',()=>$('#profErr').textContent='');
$('#profName').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('#profAge').focus()}});
$('#profAge').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('#saveProfile').click()}});
$('#saveProfile').onclick=()=>{
  const name=$('#profName').value.trim().replace(/\s+/g,' '), ageTxt=$('#profAge').value.trim(), age=ageTxt?+ageTxt:null;
  if(age!==null&&(age<5||age>120)){$('#profErr').textContent='اكتب عمر صحيح';$('#profAge').focus();return}
  S.profile={...S.profile,name,age}; save(); $('#profName').blur(); $('#profAge').blur(); renderAll();
  const first=name.split(' ')[0];
  toast(first? `اتحفظت بياناتك، أهلاً يا ${first} 👋` : 'اتحفظت بياناتك');
};

