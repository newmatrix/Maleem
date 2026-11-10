/* Android native sync */
function syncWidget(){
  if(!AB||!AB.syncWidget) return;
  const now=Date.now(), fixed=S.budgetMode==='fixed', P=periodOf(now), mk=monKey(now), dk=dayKey(now);
  const list= fixed? budgetExpenses(P) : ofMonth(mk), bc=byCat(list);
  let top=null; for(const id in bc){ if(!top||bc[id]>top.a) top={id,a:bc[id]} }
  const d=new Date(now);
  AB.syncWidget(JSON.stringify({
    day:dk,language:LANG,labels:I18N[LANG].native,
    end: fixed? P.next : new Date(d.getFullYear(),d.getMonth()+1,1).getTime(),
    label: fixed? periodLabel(P).replace(/^ميزانية\s*/,'') : monthOnly(mk),
    today: sum(S.expenses.filter(x=>dayKey(x.ts)===dk)),
    spent: sum(list),
    budget: fixed&&S.budget>0? budOf(P) : 0,
    topName: top? TX((CAT[top.id]&&CAT[top.id].name)||'') : '',
    per: fixed? 'period' : 'month',
    cur: CS(),
    hide: !!S.wgHide
  }));
}
function syncNative(){ if(AB) try{syncWidget()}catch(e){}
  if(AB&&AB.captureIncoming) try{AB.captureIncoming(S.accounts.length>0)}catch(e){}
  if(!AB||!AB.syncReminders) return;
  const out=[], now=Date.now();
  const at10=(dk,off)=>{const t=new Date(dkToTs(dk)); t.setDate(t.getDate()+off); t.setHours(10,0,0,0); return t.getTime()};
  if(S.dueRemind){
    S.debts.filter(x=>!x.closed&&x.due&&isMine(x)).forEach(x=>{
      const what= x.dir==='in'? `${x.person} يرجعلك ${fmt(debtRem(x))} ${debtSym(x)}` : `ترد لـ ${x.person} ${fmt(debtRem(x))} ${debtSym(x)}`;
      out.push({at:at10(x.due,-1),title:'بكرة ميعاد سلفة',body:what},{at:at10(x.due,0),title:'النهارده ميعاد سلفة',body:what});
    });
    S.gams.filter(isMine).forEach(g=>{for(let i=0;i<g.members;i++){const mk=addMonths(g.start,i); if((g.paid||{})[mk]) continue;
      const [y,m]=mk.split('-').map(Number), dk=dayKey(new Date(y,m-1,Math.min(g.day,daysIn(mk))));
      out.push({at:at10(dk,-1),title:'بكرة قسط '+g.name,body:`القسط ${fmt(gamMonthly(g))} ${CS()}`},{at:at10(dk,0),title:'النهارده قسط '+g.name,body:`القسط ${fmt(gamMonthly(g))} ${CS()}`});
      if(gamTurns(g).includes(i+1)&&!gamRecvd(g,i+1)) out.push({at:at10(dk,0),title:'النهارده دورك تقبض '+g.name,body:`${fmt(g.inst*g.members)} ${CS()}`});
    }});
  }
  if(S.dueRemind){
    S.insts.forEach(p=>p.items.forEach(it=>{ if(itemDone(it)) return; const body=`القسط ${fmt(itemRem(it))} ${CS()}`;
      out.push({at:at10(it.due,-1),title:'بكرة قسط '+p.name,body},{at:at10(it.due,0),title:'النهارده قسط '+p.name,body}) }));
    const mk=monKey(now);
    /* daily / weekly schedules would fill the 40 alarm slots and push debt reminders out: a daily one reminds on the day itself for the next 7 days, a weekly one a day before and on the day for the next 4 weeks */
    S.fixed.forEach(f=>{const unit=fixedUnit(f),horizon=unit==='daily'?now+7*864e5:unit==='weekly'?now+28*864e5:Infinity;
      fixedOccurrences(f,dkToTs(mk+'-01'),dkToTs(nextMonth(nextMonth(mk))+'-01')).forEach(o=>{
        if(S.fixedLog[f.id+':'+o.key]||o.ts>horizon)return;const body=f.amount?`${fmt(f.amount)} ${CS()}، سجله في مليم`:'سجله في مليم';
        if(unit!=='daily')out.push({at:at10(o.dk,-1),title:'بكرة ميعاد '+f.name,body});
        out.push({at:at10(o.dk,0),title:'النهارده ميعاد '+f.name,body});
      })});
    S.plans.forEach(x=>{ const body= x.amount? `${fmt(x.amount)} ${CS()}، سجله في مليم` : 'سجله في مليم';
      out.push({at:at10(x.due,-1),title:'بكرة ميعاد '+x.name,body},{at:at10(x.due,0),title:'النهارده ميعاد '+x.name,body}) });
    S.iplans.forEach(x=>{ const body= x.amount? `${fmt(x.amount)} ${CS()}، سجله في مليم` : 'سجله في مليم';
      out.push({at:at10(x.due,-1),title:'بكرة هتستلم '+x.name,body},{at:at10(x.due,0),title:'النهارده هتستلم '+x.name,body}) });
  }
  let sn=null; try{sn=sumNotif(now)}catch(e){}
  const due=(sn?[sn]:[]).concat(out.filter(x=>x.at>now).sort((a,b)=>a.at-b.at).slice(0,sn?39:40));
  try{AB.syncReminders(JSON.stringify({language:LANG,labels:I18N[LANG].native,daily:!!S.remind,dailyAt:S.remindAt,due:due.map(x=>({...x,title:TX(x.title),body:TX(x.body)}))}))}catch(e){}
}
window.__onBack=()=>{
  if(!$('#updLock').hidden) return false;
  if($('#mbPick').classList.contains('open')){ if(mbPickFrom==='boot') return false; mbPickClose(); return true }
  if($('#lock').classList.contains('open')) return false;
  if(!$('#rcView').hidden){rcViewClose();return true}
  if(voiceOn){voiceCancel();return true}
  if($('#rsSheet').classList.contains('open')){closeSheets();return true} // may be open over the welcome screen
  if(!$('#welcome').hidden){ if(!$('#wlS2').hidden){wlGo(1);return true} return false }
  if($('#menu').classList.contains('open')){closeMenu();return true}
  if(document.querySelector('.sheet.open')){closeSheets();return true}
  if(spManageOn){spManage(false);return true}
  if(tab==='me'&&mePage){meGo(null);return true}
  if(tab==='settings'&&setPage){setGo(null);return true}
  if(tab==='settings'&&$('#setQ').value){$('#setQ').value='';setSearch();return true}
  if($('#notif').classList.contains('show')){$('#notif').classList.remove('show');return true}
  if(tab==='reports'&&$('#reportsMain').hidden){showSub('main');return true}
  if(tab!=='expenses'){go('expenses');return true}
  return false;
};

/* Press pulse */
document.addEventListener('pointerdown',e=>{
  const b=e.target.closest('button,.socials a'); if(!b||b.disabled) return;
  const pr=pressId(); if(pr==='none'||(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
  if(pr==='ripple'){ // a circle growing from the finger, clipped to the button
    const host=b.closest('.nav')?(b.querySelector('.pill')||b):b, r=host.getBoundingClientRect(), d=Math.max(r.width,r.height)*2.2, sp=document.createElement('span');
    if(getComputedStyle(host).position==='static') host.classList.add('rp-host'); host.classList.add('rp-clip');
    sp.className='rip'; sp.style.width=sp.style.height=d+'px'; sp.style.left=(e.clientX-r.left-d/2)+'px'; sp.style.top=(e.clientY-r.top-d/2)+'px';
    host.appendChild(sp); setTimeout(()=>{sp.remove(); if(!host.querySelector('.rip')) host.classList.remove('rp-clip','rp-host')},480); return}
  b.classList.remove('pressed'); void b.offsetWidth; b.classList.add('pressed');
});
/* light vibration on a real tap (click, not the touch that starts a scroll) */
document.addEventListener('click',e=>{if(!(S.haptic&&AB&&AB.haptic)) return; const b=e.target.closest('button,.socials a'); if(b&&!b.disabled){try{AB.haptic()}catch(err){}}},true);
document.addEventListener('animationend',e=>{if(/^press/.test(e.animationName)){const b=e.target.closest('.pressed'); if(b) b.classList.remove('pressed')}});

/* Welcome / first run */
(function(){const sel=$('#wlPayday');for(let i=1;i<=31;i++)sel.insertAdjacentHTML('beforeend',`<option value="${i}">يوم ${i}</option>`)})();
let wlMode='fixed', wlPt='monthly';
$('#wlPt').onclick=e=>{const b=e.target.closest('[data-pt]'); if(!b) return; wlPt=b.dataset.pt; document.querySelectorAll('#wlPt button').forEach(x=>x.setAttribute('aria-pressed',x===b?'true':'false')); $('#wlPaydayRow').hidden=wlPt==='weekly'||wlPt==='biweekly'};
function wlGo(n){
  $('#wlS1').hidden=n!==1; $('#wlS2').hidden=n!==2;
  document.querySelectorAll('.wl-dots i').forEach((d,i)=>d.classList.toggle('on',i===n-1));
  const el=$(n===1?'#wlS1':'#wlS2'); el.classList.remove('sub-anim'); void el.offsetWidth; el.classList.add('sub-anim'); $('#welcome').scrollTop=0;
}
function wlModeSet(m){
  wlMode=m; document.querySelectorAll('#wlSeg button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mode===m));
  $('#wlFixed').hidden=m!=='fixed'; $('#wlOpen').hidden=m!=='open'; $('#wlErr').textContent='';
}
function showWelcome(){$('#wlName').value=(S.profile&&S.profile.name)||''; $('#welcome').hidden=false; document.documentElement.style.overflow='hidden'; wlModeSet('fixed'); wlGo(1)}
function hideWelcome(){const w=$('#welcome'); if(w.hidden) return; w.hidden=true; document.documentElement.style.overflow=''}
$('#wlSeg').onclick=e=>{const b=e.target.closest('[data-mode]'); if(b) wlModeSet(b.dataset.mode)};
$('#wlNext1').onclick=()=>{$('#wlName').blur(); wlGo(2)};
$('#wlName').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('#wlNext1').click()}});
$('#wlBack').onclick=()=>wlGo(1);
$('#wlRestore').onclick=()=>$('#restoreBtn').onclick();
$('#wlBudget').addEventListener('input',()=>$('#wlErr').textContent='');
$('#wlBudget').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('#wlBudget').blur()}});
$('#wlDone').onclick=()=>{
  let v=0;
  if(wlMode==='fixed'){
    v=parseFloat(String($('#wlBudget').value).replace(/[,٬\s]/g,'').replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
    if(!(v>0)){$('#wlErr').textContent='اكتب ميزانيتك، أو اختار ميزانية مفتوحة';$('#wlBudget').focus();return}
  }
  const name=$('#wlName').value.trim().replace(/\s+/g,' ');
  S.profile={...S.profile,name};
  if(wlMode==='fixed'){S.budget=v;S.budgetMode='fixed';S.payday=+$('#wlPayday').value||1;S.payType=wlPt; if(payLen()) S.payAnchor=todayKey()} else S.budgetMode='open';
  S.onboarded=true; S.notifAsked=true; save(); hideWelcome(); renderAll(); setTimeout(checkAlerts,600);
  if(S.remind||S.dueRemind) setTimeout(askNotif,700);
  toast(name? `أهلاً ${name.split(' ')[0]} 👋` : 'جاهز! ضيف أول مصروف 👋');
};

