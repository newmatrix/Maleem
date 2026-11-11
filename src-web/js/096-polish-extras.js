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
