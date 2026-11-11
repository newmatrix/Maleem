/* ===== Polish pass 2 ===== */
/* Home: categories that reached the alert level of their monthly limit (the limit itself is set per category in Settings) */
function renderLimCard(){
  const box=$('#limBox'); if(!box) return;
  const lims=S.cats.filter(c=>c.lim>0); let rows=[];
  if(lims.length){
    const by={}; ofPeriod(periodOf(Date.now())).forEach(x=>{by[x.cat]=r2((by[x.cat]||0)+x.amount)});
    const th=(+S.alertPct||80)/100;
    rows=lims.map(c=>({c,sp:by[c.id]||0,r:(by[c.id]||0)/c.lim})).filter(x=>x.r>=th).sort((a,b)=>b.r-a.r);
  }
  if(!rows.length){box.innerHTML='';return}
  const left=rows.length-3; rows=rows.slice(0,3);
  box.innerHTML=`<div class="upc lim-card"><div class="upc-h"><b>حدود الفئات</b><button type="button" data-golim="">كل الفئات</button></div>`+
    rows.map(({c,sp,r})=>{const bad=r>=1,pc=Math.round(r*100);
      return `<div class="ur lim-row" data-golim=""><div class="ui" style="--cc:${colr(c.c)}">${esc(c.e)}</div><div class="ut">${esc(c.name)}<small>صرفت ${money(sp)} من حد ${money(c.lim)} ${CS()}</small><span class="lim-bar${bad?' bad':' warn'}"><i style="width:${Math.min(100,pc)}%"></i></span></div><span class="due${bad?' late':''}">${bad?'عدّت الحد':'قربت'} · ${pc}%</span></div>`}).join('')+
    (left>0?`<div class="lim-more">و${left} فئة كمان قربت</div>`:'')+`</div>`;
}
document.addEventListener('click',e=>{if(!e.target.closest('[data-golim]'))return; closeSheets(); go('settings'); setGo('cats')});

/* Obligations: this month's monthly fixed expenses, logged or still waiting */
function renderMonthFixed(){
  const box=$('#obMonth'); if(!box) return;
  const mk=monKey(Date.now()), start=dkToTs(mk+'-01'), end=dkToTs(nextMonth(mk)+'-01'), items=[];
  S.fixed.forEach(f=>{
    if(f.paused||fixedUnit(f)!=='monthly'||!(+f.amount>0)) return;
    fixedOccurrences(f,start,end).forEach(o=>items.push({f,o,st:S.fixedLog[f.id+':'+o.key]}));
  });
  if(!items.length){box.innerHTML='';return}
  items.sort((a,b)=>a.o.dk<b.o.dk?-1:a.o.dk>b.o.dk?1:0);
  const total=r2(items.reduce((a,x)=>a+(+x.f.amount),0)), logged=items.filter(x=>x.st==='done'), paid=r2(logged.reduce((a,x)=>a+(+x.f.amount),0));
  const waiting=items.filter(x=>x.st!=='done'&&x.st!=='skip'), left=r2(waiting.reduce((a,x)=>a+(+x.f.amount),0));
  const pc=total>0?Math.min(100,Math.round(paid/total*100)):0;
  box.innerHTML=`<div class="upc mo-card"><div class="upc-h"><b>ثوابت الشهر ده</b><span class="mo-sum">اتسجل ${logged.length} من ${items.length}</span></div>
<div class="mo-bar"><i style="width:${pc}%"></i></div>
<div class="mo-left">${waiting.length?`فاضل تسجّل ${money(left)} ${CS()}`:'كله اتسجل ✓'}</div>`+
  items.map(({f,o,st})=>{const c=CAT[f.cat]||CAT.other, n=diffDays(o.dk), late=!st&&n<0;
    const right=st==='done'?`<span class="due ok">اتسجل ✓</span>`:st==='skip'?`<span class="due">اتخطى</span>`:`<button class="paybtn" style="--cc:var(--brand)" data-fpay="${esc(f.id+':'+o.key)}">سجّل</button>`;
    return `<div class="ur mo-row${st==='done'||st==='skip'?' done':''}"><div class="ui">${esc(c.e)}</div><div class="ut">${esc(f.name)}<small><span class="due${late?' late':''}">${esc(relDay(n))}</span></small></div><span class="ua">${money(f.amount)} <small style="font-weight:500;color:var(--muted)">${CS()}</small></span>${right}</div>`}).join('')+`</div>`;
}

/* Bank-notification capture: send a message the app could not read, with the long numbers hidden first */
function capMask(t){
  const D='[\\d\\u0660-\\u0669]';
  return String(t||'').replace(/https?:\/\/\S+/gi,'•').replace(/[\w.+-]+@[\w-]+\.[\w.]+/g,'•')
    .replace(new RegExp('(?:'+D+'[ -]?){9,}'+D,'g'),'•••').replace(new RegExp('([*xX•]{2,}\\s?)'+D+'{3,4}(?!'+D+')','g'),'$1••••');
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-capteach]'); if(!b) return; e.stopPropagation();
  const c=(S.capQ||[]).find(x=>x.id===b.dataset.capteach); if(!c) return;
  fbKind='sug'; go('settings'); setGo('feedback'); fbPaint();
  const t=$('#fbText'); t.value=TX('رسالة بنك مليم مفهمهاش صح. اتخفت منها الأرقام الطويلة، راجعها قبل ما تبعت:')+'\n\n'+capMask(c.text)+(c.source?'\n('+TX('المصدر')+': '+c.source+')':'')+'\n\n'+TX('المفروض يتسجل كده:')+' ';
  t.focus(); t.setSelectionRange(t.value.length,t.value.length);
},true);
