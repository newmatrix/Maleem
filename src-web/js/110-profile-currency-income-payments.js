/* Me / profile */
function streaks(){
  const days=new Set(S.expenses.map(x=>dayKey(x.ts)));
  let cur=0, d=new Date(todayStart());
  if(!days.has(dayKey(d))) d.setDate(d.getDate()-1);
  while(days.has(dayKey(d))){cur++; d.setDate(d.getDate()-1)}
  const sorted=[...days].sort(); let best=0, run=0, prev=null;
  sorted.forEach(k=>{const t=dkToTs(k); run= prev!==null&&Math.round((t-prev)/864e5)===1? run+1 : 1; best=Math.max(best,run); prev=t});
  return {cur,best,days:days.size};
}
const incomeTotal=()=>r2(S.incomes.reduce((a,x)=>a+(+x.amount||0),0));
/* the round button next to the greeting opens the "أنا" page: photo if there is one, else the first letter of the name (or م) */
function paintHomeAv(){
  const P=S.profile||{}, n=(P.name||'').trim(), el=$('#homeAv'); if(!el) return;
  el.innerHTML= isPhoto(P.photo)? `<img src="${esc(P.photo)}" alt="">` : esc(n? Array.from(n)[0].toUpperCase() : 'م');
}
function renderMe(){
  const P=S.profile||{}, name=(P.name||'').trim();
  paintHomeAv();
  if(P.photo) $('#meAv').dataset.obmore='photo:me'; else delete $('#meAv').dataset.obmore;
  $('#meAv').innerHTML= isPhoto(P.photo)? `<img src="${esc(P.photo)}" alt="">` : esc(name? name[0] : '👋');
  const dav=$('#dataAv'); if(dav){ if(P.photo) dav.dataset.obmore='photo:me'; else delete dav.dataset.obmore;
    dav.innerHTML= isPhoto(P.photo)? `<img src="${esc(P.photo)}" alt="">` : esc(name? Array.from(name)[0].toUpperCase() : 'م') }
  $('#meName').textContent= name || 'أهلاً بيك';
  const sinceTxt='بتستخدم مليم من '+shortDate(S.since||Date.now());
  $('#meSub').textContent= name? (P.age? `${P.age} سنة · `:'')+sinceTxt : 'اكتب اسمك تحت عشان التطبيق يناديك بيه';
  if(document.activeElement!==$('#profName')) $('#profName').value=P.name||'';
  if(document.activeElement!==$('#profAge')) $('#profAge').value=P.age||'';
  $('#currencySel').value=S.currency;
  const st=streaks();
  $('#meStreak').hidden=st.cur<2; $('#meStreak').textContent=`🔥 ${st.cur} ${st.cur<=10?'أيام':'يوم'}`;

  // money this period
  const Pd=periodOf(Date.now()), spent=sum(ofPeriod(Pd)), II=incomeIn(Pd), inc=II.amt, sv=inc-spent;
  document.querySelector('.mm.in small').textContent= II.expected?'الدخل (متوقع)':'الدخل';
  $('#mmPeriod').textContent= Pd.pd===1? monthName(monKey(Date.now())) : periodRange(Pd);
  $('#mmIn').innerHTML=money(inc); $('#mmOut').innerHTML=money(spent); $('#mmSv').innerHTML=money(Math.abs(sv));
  $('#mmSvL').textContent= sv<0?'صرفت زيادة':'حوشت';
  document.querySelector('.mm.sv').classList.toggle('neg',sv<0);
  let t='';
  if(!inc) t=`<p class="hint" style="margin-top:12px">${'سجّل دخلك من "الدخل المستلم" (جوه الميزانية وطريقة القبض والدخل)'} عشان تعرف حوشت كام.</p>`;
  else if(S.saveTarget>0){const pct=Math.max(0,Math.min(100,sv/S.saveTarget*100));
    t=`<div class="tgt"><div class="row"><span>هدفك تحوش ${fmt(S.saveTarget)} ${CS()}</span><span>${sv>=S.saveTarget?'وصلت 🎉':Math.round(pct)+'%'}</span></div><div class="pbar"><i style="width:${pct}%"></i></div></div>`}
  $('#mmTarget').innerHTML=t;

  // incomes

  // fixed expenses
  const thisMk=monKey(Date.now()),fxT=S.fixed.reduce((a,f)=>a+fixedOccurrences(f,dkToTs(thisMk+'-01'),dkToTs(nextMonth(thisMk)+'-01')).length*(+f.amount||0),0);
  $('#fixTotal').innerHTML= fxT? `${money(fxT)} ${CS()}` : '';
  $('#fixList').innerHTML= S.fixed.slice().sort((a,b)=>a.day-b.day).map(f=>{const c=CAT[f.cat]||CAT.other, st=S.fixedLog[f.id+':'+thisMk];
    return `<div class="crow" style="--cc:${colr(c.c)}"><div class="tile">${esc(c.e)}</div><div class="n">${esc(f.name)}${spByTag(f)}<small>${f.amount?fmt(f.amount)+' '+CS():'مبلغ متغير'} · ${esc(fixedRuleLabel(f))}${fixedUnit(f)==='monthly'?' · '+TX('يوم')+' '+f.day:''}${f.paused?' · '+TX('متوقف'):''}${f.endDate?' · '+TX('لحد')+' '+dkToDMY(f.endDate):''}${st==='done'?' · اتسجل الشهر ده ✓':st==='skip'?' · اتخطى الشهر ده':''}</small></div><button class="more" data-obmore="fix:${esc(f.id)}" aria-label="خيارات ${esc(f.name)}" aria-haspopup="menu" aria-expanded="false">${ICON_MORE}</button></div>`}).join('');

  // planned (one-time) expenses
  {const ps=S.plans.slice().sort((a,b)=>a.due<b.due?-1:a.due>b.due?1:0), tot=ps.reduce((a,x)=>a+(+x.amount||0),0);
   $('#plTotal').innerHTML= tot? `${money(tot)} ${CS()}` : '';
   $('#plList').innerHTML= ps.length? ps.map(x=>{const c=CAT[x.cat]||CAT.other, n=diffDays(x.due);
     return `<div class="crow" style="--cc:${colr(c.c)}"><div class="tile">${esc(c.e)}</div><div class="n">${esc(x.name)}<small>${x.amount?fmt(x.amount)+' '+CS():'مبلغ مش محدد'} · ${dkToDMY(x.due)} · <span class="due ${dueCls(n)}">${relDay(n)}</span></small></div><button class="paybtn" style="--cc:var(--brand)" data-ppay="${esc(x.id)}">سجّل</button><button class="more" data-obmore="plan:${esc(x.id)}" aria-label="خيارات ${esc(x.name)}" aria-haspopup="menu" aria-expanded="false">${ICON_MORE}</button></div>`}).join('')
     : '<p class="hint" style="padding:8px 0">مفيش مصروفات جاية.</p>'}

  // the log of money that came back from expenses
  {const L=S.refunds, tot=L.reduce((a,x)=>a+x.amount,0);
   $('#rfTotal').innerHTML= tot? `${money(r2(tot))} ${CS()}` : '';
   $('#rfLog').innerHTML= L.length? L.map(x=>{const c=CAT[x.cat]||CAT.other;
     return `<div class="crow" style="--cc:${colr(c.c)}"><div class="tile">${esc(c.e)}</div><div class="n">${esc(x.note||c.name)}<small>${esc(TX('رجع'))} ${fmt(x.amount)} ${CS()} · ${dkToDMY(dayKey(x.ts))} · ${x.full?TX('كله'):TX('جزء منه')}${x.accName?' · '+esc(x.accName):''}</small></div></div>`}).join('')
     : '<p class="hint" style="padding:8px 0">لسه مفيش مبالغ مرجوعة.</p>'}

  // expected incomes (one time)
  {const ps=S.iplans.slice().sort((a,b)=>a.due<b.due?-1:a.due>b.due?1:0), tot=ps.reduce((a,x)=>a+(+x.amount||0),0);
   $('#ilTotal').innerHTML= tot? `${money(tot)} ${CS()}` : '';
   $('#ilList').innerHTML= ps.length? ps.map(x=>{const n=diffDays(x.due);
     return `<div class="crow" style="--cc:#16A34A"><div class="tile">💰</div><div class="n">${esc(x.name)}<small>${x.amount?fmt(x.amount)+' '+CS():'مبلغ مش محدد'} · ${dkToDMY(x.due)} · <span class="due ${dueCls(n)}">${relDay(n)}</span></small></div><button class="paybtn" style="--cc:#16A34A" data-ipin="${esc(x.id)}">استلمت</button><button class="more" data-obmore="ipl:${esc(x.id)}" aria-label="خيارات ${esc(x.name)}" aria-haspopup="menu" aria-expanded="false">${ICON_MORE}</button></div>`}).join('')
     : '<p class="hint" style="padding:8px 0">مفيش دخل جاي.</p>'}

  // saving
  if(document.activeElement!==$('#saveTargetIn')) $('#saveTargetIn').value=S.saveTarget||'';
  $('#goalList').innerHTML=S.goals.map(g=>{const pct=Math.min(100,(g.saved||0)/g.target*100), done=(g.saved||0)>=g.target;
    return `<div class="goal${done?' done':''}"><div class="gtop"><div class="tile">${esc(g.e||'🎯')}</div><div class="body"><b>${esc(g.name)}${spByTag(g)}</b><small>${fmt(g.saved||0)} من ${fmt(g.target)} ${CS()} · ${Math.round(pct)}%</small></div>
      <button class="more" data-obmore="goal:${esc(g.id)}" aria-label="خيارات ${esc(g.name)}" aria-haspopup="menu" aria-expanded="false">${ICON_MORE}</button></div>
      <div class="pbar"><i style="width:${pct}%"></i></div>
      <div class="gbot"><small>${done?'وصلت لهدفك 🎉':'فاضل '+fmt(g.target-(g.saved||0))+' '+CS()}</small>${done?'':`<button class="paybtn" data-gdep="${esc(g.id)}">+ ضيف فلوس</button>`}</div></div>`}).join('');

  // stats
  const ml=ofPeriod(periodOf(Date.now())), cA=byCat(ml), topId=Object.keys(cA).sort((a,b)=>cA[b]-cA[a])[0];
  const dayT={}; ml.forEach(x=>{const k=dayKey(x.ts); dayT[k]=(dayT[k]||0)+x.amount}); const topDay=Object.keys(dayT).sort((a,b)=>dayT[b]-dayT[a])[0];
  const all=sum(S.expenses), first=S.expenses.length? Math.min(...S.expenses.map(x=>x.ts)) : null;
  const spanDays= first? Math.max(1,Math.round((todayStart()-new Date(first).setHours(0,0,0,0))/864e5)+1) : 0;
  const tile=(l,v,sub)=>`<div class="st2"><small>${l}</small><b>${v}</b>${sub?`<span>${sub}</span>`:''}</div>`;
  $('#statsGrid').innerHTML=
    tile('أكتر فئة الشهر ده', topId? `${(CAT[topId]||CAT.other).e} ${esc((CAT[topId]||CAT.other).name)}`:'—', topId? `${fmt(cA[topId])} ${CS()}`:'') +
    tile('أغلى يوم الشهر ده', topDay? dkToDMY(topDay):'—', topDay? `${fmt(dayT[topDay])} ${CS()}`:'') +
    tile('إجمالي اللي سجلته', `${fmt(all)} ${CS()}`, `${S.expenses.length} مصروف`) +
    tile('متوسط صرفك في اليوم', spanDays? `${fmt(all/spanDays)} ${CS()}`:'—', spanDays? `على ${daysTxt(spanDays)}`:'') +
    tile('السلسلة الحالية', st.cur? `🔥 ${daysTxt(st.cur)}`:'—', 'أيام ورا بعض سجلت فيها') +
    tile('أطول سلسلة', st.best? daysTxt(st.best):'—', `سجلت في ${daysTxt(st.days)}`);
}
function applyCurrency(){document.querySelectorAll('.cur').forEach(e=>e.textContent=CS())}
function fillCurSelects(){
  const cs=$('#currencySel'); if(!cs) return; const v=cs.value;
  cs.innerHTML=CURRENCIES.map(c=>`<option value="${esc(c.id)}">${esc(c.n)} (${esc(c.s)})</option>`).join('')+'<option value="__more">＋ عملة تانية…</option>';
  cs.value=CURRENCIES.some(c=>c.id===v)?v:S.currency;
}
fillCurSelects();
/* the "other currency" picker: only currencies that have a real rate in rates.json */
/* every currency in use in the world today (ISO 4217): the list does not depend on what rates.json happens to carry, so a currency
   like SYP is always there. If no rate is published for it, the person types today's dollar rate (see curAsk). */
const WORLD_CUR='AED AFN ALL AMD ANG AOA ARS AUD AWG AZN BAM BBD BDT BGN BHD BIF BMD BND BOB BRL BSD BTN BWP BYN BZD CAD CDF CHF CLP CNY COP CRC CUP CVE CZK DJF DKK DOP DZD EGP ERN ETB EUR FJD FKP GBP GEL GHS GIP GMD GNF GTQ GYD HKD HNL HTG HUF IDR ILS INR IQD IRR ISK JMD JOD JPY KES KGS KHR KMF KPW KRW KWD KYD KZT LAK LBP LKR LRD LSL LYD MAD MDL MGA MKD MMK MNT MOP MRU MUR MVR MWK MXN MYR MZN NAD NGN NIO NOK NPR NZD OMR PAB PEN PGK PHP PKR PLN PYG QAR RON RSD RUB RWF SAR SBD SCR SDG SEK SGD SHP SLE SOS SRD SSP STN SVC SYP SZL THB TJS TMT TND TOP TRY TTD TWD TZS UAH UGX USD UYU UZS VES VND VUV WST XAF XCD XCG XOF XPF YER ZAR ZMW ZWG'.split(' ');
function curPool(){
  const r=(RT.data&&RT.data.rates)||{};
  return WORLD_CUR.filter(c=>!CUR_SKIP.has(c)&&!CURRENCIES.some(x=>x.id===c))
    .map(c=>({id:c,ar:curNameAr(c),en:curNameEn(c),own:!!RT.data&&!(+r[c]>0)&&!(manRate(c)>0)})).sort((a,b)=>a.ar.localeCompare(b.ar,'ar'));
}
function curAddPaint(){
  const q=$('#curAddQ').value.trim(), qa=vNorm(q), ql=q.toLowerCase(), all=curPool();
  const hit=q? all.filter(x=>x.id.toLowerCase().includes(ql)||vNorm(x.ar).includes(qa)||x.en.toLowerCase().includes(ql)) : all;
  $('#curAddList').innerHTML=hit.slice(0,80).map(x=>`<button type="button" class="cur-item" data-cc="${x.id}"><span>${esc(x.ar)}${x.own?'<small style="display:block;font-weight:400;opacity:.7">السعر بإيدك</small>':''}</span><b dir="ltr">${x.id}</b></button>`).join('');
  $('#curAddMsg').textContent= !all.length? 'مفيش عملات تانية متاحة' : !hit.length? 'مفيش عملة بالاسم ده. جرّب الكود (زي TRY) أو اسم تاني' : hit.length>80? 'اكتب أكتر عشان تضيّق القايمة' : '';
}
function openCurAdd(){
  $('#curAddQ').value=''; $('#curAddList').innerHTML=''; $('#curAddMsg').textContent='';
  rateFor('USD','EGP'); // loads the saved copy of the rates, if there is one
  openSheetEl('curAddSheet'); curAddPaint();
  if(!RT.data) ratesRefresh(false,()=>{ if($('#curAddSheet').classList.contains('open')) curAddPaint() }); // only to show which currencies have a published rate
}
function curPickCustom(c){
  if(!curPool().some(x=>x.id===c)) return;
  if(!CURRENCIES.some(x=>x.id===c)){
    const used=id=>S.currency===id||S.accounts.some(a=>a.cur===id)||S.debts.some(d=>d.cur===id);
    if((S.curs||[]).length>=CUR_MAX_CUSTOM){ /* make room by dropping one the person is not using */
      const drop=(S.curs||[]).find(id=>!used(id));
      if(!drop){toast('وصلت للحد الأقصى: '+CUR_MAX_CUSTOM+' عملات إضافية مستخدمة');return}
      S.curs=S.curs.filter(id=>id!==drop); const i=CURRENCIES.findIndex(x=>x.id===drop&&x.x); if(i>=0) CURRENCIES.splice(i,1);
    }
    curMerge([c]); fillCurSelects(); save();
  }
  closeSheets(); $('#currencySel').value=c; setTimeout(()=>curAsk(c),0);
}
/* ===== Changing the currency: every amount is converted with today's rate =====
   A 50 EGP cheese is not 50 USD. The rate comes from rates.json (see Rates.kt); with no rate the change is refused rather than done wrong. */
var CURX=null; // the change waiting for the person to confirm: {from,to,k,at}
const CUR_NAME=id=>(CURRENCIES.find(c=>c.id===id)||{n:id}).n;
const CUR_SHARED_TYPES={debts:'السلف',gams:'الجمعيات',goals:'أهداف الادخار',incomes:'الدخل',fixed:'المصاريف الثابتة'};
const curHasMoney=()=>!!(S.expenses.length||S.budget>0||S.saveTarget>0||S.incomes.length||S.goals.length||S.debts.length||S.gams.length||S.fixed.length||S.plans.length||S.iplans.length||S.refunds.length||S.insts.length||S.inflows.length||S.gold.length||S.bMoves.length||S.cats.some(c=>c.lim>0));
function curSharedBlock(){
  if(!S.space) return [];
  let p; try{p=spNormPrefs(S.space.sharePrefs,true)}catch(e){return []}
  return Object.keys(CUR_SHARED_TYPES).filter(t=>p&&p[t]).map(t=>CUR_SHARED_TYPES[t]);
}
const curFmtRate=v=>(Math.round(v*10000)/10000).toLocaleString('en-US',{maximumFractionDigits:4});
/* the currency has no published rate: show the same sheet with a box for today's dollar rate */
function curManualAsk(from,to,code){
  CURX={from,to,k:0,at:0,man:code};
  const old=manRate(code);
  $('#curTxt').textContent='هتتحول كل مبالغك من '+CUR_NAME(from)+' إلى '+CUR_NAME(to)+': المصروفات والميزانية والدخل والمصاريف الثابتة والأهداف والجمعيات. السلف بتفضل بعملتها المستقلة.';
  $('#curRate').textContent='مفيش سعر منشور لـ'+CUR_NAME(code)+'. اكتب سعر النهارده بنفسك (من بنكك أو موقع تثق فيه).';
  $('#curManRow').hidden=false; $('#curManLab').textContent='1 دولار = كام '+CUR_NAME(code)+'؟';
  $('#curMan').value=old?String(old):''; $('#curOld').hidden=true;
  curManPaint(); clearTimeout(toastT); $('#toast').classList.remove('show');
  $('#scrim').classList.add('open'); $('#curSheet').classList.add('open');
}
/* the rate from → to if [code] costs [r] per dollar */
function curManK(x,r){ const a=x.man===x.from?r:usdRate(x.from), b=x.man===x.to?r:usdRate(x.to); return a>0&&b>0?b/a:0 }
function curManPaint(){
  const x=CURX; if(!x||!x.man) return; const r=evalExpr($('#curMan').value), k=Number.isFinite(r)&&r>0?curManK(x,r):0;
  const sym=id=>(CURRENCIES.find(c=>c.id===id)||{s:id}).s, iso=t=>'\u2068'+t+'\u2069';
  $('#curEx').textContent= k? 'يعني مثلًا '+iso('100 '+sym(x.from))+' هتبقى '+iso(fmt(100*k)+' '+sym(x.to)) : '';
}
$('#curMan').addEventListener('input',curManPaint);
function curAsk(to){
  const from=S.currency; if(!to||to===from) return;
  const back=()=>{$('#currencySel').value=S.currency};
  if(!curHasMoney()){S.currency=to;save();applyCurrency();renderAll();toast('العملة بقت '+CUR_NAME(to));return} // nothing to convert yet
  const bl=curSharedBlock();
  if(bl.length){back();toast('مينفعش تغيّر العملة وانت بتشارك '+bl.join(' و')+' في المساحة المشتركة، لأن أرقامهم هتتلخبط عند الباقيين. اقفل مشاركتهم الأول وبعدين غيّر العملة',null,null,9000);return}
  toast('بجيب سعر العملة...',null,null,3000);
  ratesRefresh(true,()=>{
    const k=rateFor(from,to);
    if(!k){
      const none=[to,from].filter(c=>c!=='USD'&&!usdRate(c));
      if(RT.data&&none.length===1){ curManualAsk(from,to,none[0]); return } // one side has a rate, the other one the person types
      if(RT.data&&none.length===2){back();toast('مفيش سعر لا لـ '+CUR_NAME(from)+' ولا لـ '+CUR_NAME(to)+'. غيّر العملة لواحدة ليها سعر منشور الأول',null,null,7000);return}
    }
    if(!k){back();toast(RT.err==='bad'||RT.err==='big'?'ملف أسعار العملات لسه مش جاهز عندنا، وده مش بسبب النت عندك. جرّب تاني بعد شوية':RT.err==='http'?'مش قادر أوصل لملف أسعار العملات دلوقتي. جرّب تاني بعد شوية'+(RT.why?' ['+RT.why+']':''):'محتاج نت عشان أجيب سعر العملة. جرّب تاني لما النت يشتغل'+(RT.why?' ['+RT.why+']':''),null,null,6000);return}
    CURX={from,to,k,at:RT.data?RT.data.updated*1000:0};
    const strong=rateFor(to,from)>=1;
    $('#curTxt').textContent='هتتحول كل مبالغك من '+CUR_NAME(from)+' إلى '+CUR_NAME(to)+': المصروفات والميزانية والدخل والمصاريف الثابتة والأهداف والجمعيات. السلف بتفضل بعملتها المستقلة.';
    $('#curRate').textContent=strong?('1 '+to+' = '+curFmtRate(rateFor(to,from))+' '+from):('1 '+from+' = '+curFmtRate(k)+' '+to);
    const sym=id=>(CURRENCIES.find(c=>c.id===id)||{s:id}).s;
    const iso=t=>'\u2068'+t+'\u2069'; // keeps the symbols and the date in their own direction inside the Arabic sentence
    $('#curEx').textContent='يعني مثلًا '+iso('100 '+sym(from))+' هتبقى '+iso(fmt(100*k)+' '+sym(to))+(CURX.at?'، بسعر يوم '+iso(shortDate(CURX.at)):'');
    const days=CURX.at?Math.floor((Date.now()-CURX.at)/864e5):0;
    $('#curManRow').hidden=true; $('#curOld').hidden=!(days>=3); $('#curOld').textContent=days>=3?('السعر ده عمره '+days+' أيام، لأن مفيش نت دلوقتي. لو عايز سعر النهارده جرّب تاني بعد ما النت يشتغل.'):'';
    clearTimeout(toastT); $('#toast').classList.remove('show'); // the "getting the rate" message is done
    $('#scrim').classList.add('open'); $('#curSheet').classList.add('open');
  });
}
/* multiplies every amount by [k]; [keepO] remembers the original amount/currency of each expense (needed while in a shared space) */
function curScaleAll(k,from,keepO){
  const sc=v=>{v=+v; if(!(v>0)) return 0; const n=r2(v*k); return n>0?n:0.01};
  const exp=e=>{ if(!e) return; if(e.o&&e.o.p) return; /* still waiting for its own rate: it is converted from its original later */
    if(keepO&&!e.o) e.o={a:e.amount,c:from}; e.amount=sc(e.amount) };
  S.expenses.forEach(exp); Object.values(spCloudExpenses||{}).forEach(exp);
  S.budget=sc(S.budget); S.saveTarget=sc(S.saveTarget); S.bMoves.forEach(m=>{m.amt=Math.max(0.01,sc(m.amt))});
  S.incomes.forEach(x=>{x.amount=sc(x.amount)});
  S.goals.forEach(g=>{g.target=sc(g.target)||0.01; g.saved=sc(g.saved)});
  S.debts.forEach(d=>{if(!d.cur)d.cur=from}); // Debt units remain independent of the display currency.
  S.gams.forEach(g=>{g.inst=sc(g.inst)||0.01});
  S.fixed.forEach(f=>{f.amount=sc(f.amount)});
  S.plans.forEach(x=>{x.amount=sc(x.amount)}); S.iplans.forEach(x=>{x.amount=sc(x.amount)}); S.refunds.forEach(x=>{x.amount=sc(x.amount)});
  S.insts.forEach(p=>p.items.forEach(i=>{i.amount=sc(i.amount)||0.01})); S.instPays.forEach(x=>{x.amount=sc(x.amount)||0.01});
  S.inflows.forEach(x=>{x.amount=sc(x.amount)||0.01; if(x.alloc){x.alloc={spend:sc(x.alloc.spend),bills:sc(x.alloc.bills),save:sc(x.alloc.save)}}});
  S.gold.forEach(g=>{g.price=sc(g.price)||0.01; if(g.sold) g.sold.price=sc(g.sold.price)||0.01}); GOLD_KS.forEach(k=>{if(S.goldPx[k]>0) S.goldPx[k]=sc(S.goldPx[k])});
  S.cats.forEach(c=>{if(c.lim>0) c.lim=sc(c.lim)}); syncCats();
}
function curApply(x){
  const snap=JSON.parse(JSON.stringify({currency:S.currency,expenses:S.expenses,budget:S.budget,bMoves:S.bMoves,saveTarget:S.saveTarget,incomes:S.incomes,goals:S.goals,debts:S.debts,gams:S.gams,fixed:S.fixed,plans:S.plans,iplans:S.iplans,refunds:S.refunds,cats:S.cats,insts:S.insts,instPays:S.instPays,inflows:S.inflows,gold:S.gold,goldPx:S.goldPx,cloud:spCloudExpenses}));
  curScaleAll(x.k,x.from,!!S.space);
  S.currency=x.to; save(); applyCurrency(); $('#currencySel').value=x.to; closeSheets(); renderAll();
  toast('اتحوّلت كل المبالغ من '+CUR_NAME(x.from)+' لـ '+CUR_NAME(x.to),'تراجع',()=>curRestore(snap),10000);
}
function curRestore(snap){
  Object.assign(S,{currency:snap.currency,expenses:snap.expenses,budget:snap.budget,saveTarget:snap.saveTarget,incomes:snap.incomes,goals:snap.goals,debts:snap.debts,gams:snap.gams,fixed:snap.fixed,plans:snap.plans||S.plans,iplans:snap.iplans||S.iplans,refunds:snap.refunds||S.refunds,cats:snap.cats,insts:snap.insts||S.insts,instPays:snap.instPays||S.instPays,inflows:snap.inflows||S.inflows,gold:snap.gold||S.gold,goldPx:snap.goldPx||S.goldPx,bMoves:snap.bMoves||S.bMoves});
  spCloudExpenses=snap.cloud||{}; syncCats(); save(); applyCurrency(); $('#currencySel').value=S.currency; renderAll();
  toast('رجّعنا العملة والمبالغ زي ما كانت');
}
/* shared expenses that arrived before there was a rate: convert them now */
function curFixPending(){
  let ch=false;
  const fix=e=>{ if(!(e&&e.o&&e.o.p)) return; const k=rateFor(e.o.c,S.currency); if(!k) return; e.amount=Math.max(0.01,r2(e.o.a*k)); e.o={a:e.o.a,c:e.o.c}; ch=true };
  S.expenses.forEach(fix); Object.values(spCloudExpenses||{}).forEach(fix);
  if(ch){save();renderAll()}
}
$('#currencySel').onchange=e=>{ if(e.target.value==='__more'){e.target.value=S.currency; openCurAdd(); return} curAsk(e.target.value) };
$('#curAddQ').addEventListener('input',curAddPaint);
$('#curAddList').addEventListener('click',e=>{const b=e.target.closest('[data-cc]'); if(b) curPickCustom(b.dataset.cc)});
$('#curAddCancel').onclick=()=>closeSheets();
$('#curGo').onclick=()=>{const x=CURX; if(!x) return;
  if(x.man){ const r=evalExpr($('#curMan').value), k=Number.isFinite(r)&&r>0&&r<1e12?curManK(x,r):0;
    if(!k){ $('#curEx').textContent='اكتب سعر الدولار بالرقم'; return }
    S.manRates[x.man]={r:Math.round(r*1e6)/1e6,ts:Date.now()}; x.k=k; x.at=Date.now() }
  CURX=null; curApply(x)};
$('#curCancel').onclick=()=>closeSheets();
bindMoney($('#saveTargetIn'));
$('#saveTargetIn').addEventListener('change',()=>{S.saveTarget=parseFloat($('#saveTargetIn').value)||0;save();renderMe();toast(S.saveTarget?`هدفك تحوش ${fmt(S.saveTarget)} ${CS()} كل شهر`:'اتشال هدف الادخار الشهري')});

/* generic form */
let formCfg=null, formEmoji=null;
const GOAL_EMOJIS=['🎯','📱','💻','🚗','🏠','✈️','💍','🎓','🕋','🛋️','🏖️','💰'];
function openForm(cfg){
  formCfg=cfg; formEmoji=null;
  $('#formTitle').textContent=cfg.title; $('#formSave').textContent=cfg.save||'حفظ'; $('#formErr').textContent='';
  $('#formBody').innerHTML=cfg.fields.map(f=>{
    if(f.type==='emoji'){const EM=f.emojis||GOAL_EMOJIS; formEmoji=f.value||EM[0]; return `<div class="form-emoji" data-emo>${EM.map(e=>`<button type="button" data-e="${e}" aria-pressed="${e===formEmoji}">${e}</button>`).join('')}</div>`}
    if(f.type==='select') return `<div class="pay-row"><div class="txt">${f.label}</div><select data-k="${f.key}" aria-label="${f.label}">${f.options.map(o=>`<option value="${esc(o.v)}"${String(o.v)===String(f.value)?' selected':''}>${esc(o.t)}</option>`).join('')}</select></div>`;
    if(f.type==='date') return `<div class="pay-row"><div class="txt">${f.label}</div><input type="date" class="date-in" data-k="${f.key}" ${f.min?`min="${f.min}"`:''} value="${esc(f.value||'')}" dir="ltr" style="width:auto;min-width:150px;max-width:190px" aria-label="${f.label}"></div>`;
    if(f.type==='money') return `${f.label?`<div class="lbl">${f.label}</div>`:''}<label class="amount-box"><input class="v" data-k="${f.key}" type="text" inputmode="decimal" placeholder="0" dir="ltr" autocomplete="off" value="${f.value!=null&&f.value!==''?f.value:''}" aria-label="${f.label||f.placeholder||'المبلغ'}"><span class="c">${CS()}</span></label>`;
    return `<div class="field"><input data-k="${f.key}" type="text" maxlength="30" placeholder="${f.placeholder||''}" value="${esc(f.value||'')}" aria-label="${f.placeholder||''}" style="font-size:1.05rem"></div>`;
  }).join('');
  $('#formBody').querySelectorAll('.amount-box .v').forEach(i=>bindMoney(i,i.parentElement));
  openSheetEl('formSheet');
  const first=$('#formBody').querySelector('input'); if(first) first.focus({preventScroll:true});
}
$('#formBody').addEventListener('click',e=>{const b=e.target.closest('[data-e]'); if(!b) return; formEmoji=b.dataset.e;
  $('#formBody').querySelectorAll('[data-e]').forEach(x=>x.setAttribute('aria-pressed',x.dataset.e===formEmoji))});
$('#formCancel').onclick=closeSheets;
$('#formSave').onclick=()=>{
  if(!formCfg) return; const v={};
  $('#formBody').querySelectorAll('[data-k]').forEach(i=>v[i.dataset.k]=i.value.trim());
  v.e=formEmoji;
  const err=formCfg.onSave(v); if(err){$('#formErr').textContent=err;return}
  closeSheets();
};

/* incomes */
function openIncome(id){
  const x=id? S.incomes.find(i=>i.id===id):null;
  openForm({title:x?'تعديل الدخل':'دخل جديد', save:x?'حفظ التعديل':'إضافة',
    fields:[{key:'name',placeholder:'اسم الدخل، مثلاً المرتب',value:x?x.name:(S.incomes.length?'':'المرتب')},{key:'amount',type:'money',label:'المبلغ كل شهر',value:x?x.amount:''}],
    onSave:v=>{const amount=parseFloat(v.amount); if(!v.name) return 'اكتب اسم الدخل'; if(!(amount>0)) return 'اكتب المبلغ';
      if(x) Object.assign(x,{name:v.name,amount}); else S.incomes.push({id:uid(),name:v.name,amount});
      save();renderAll();toast(x?'اتعدل الدخل':`اتضاف ${v.name}: ${fmt(amount)} ${CS()}`)}});
}
function deleteIncome(id){const i=S.incomes.findIndex(x=>x.id===id); if(i<0) return; const [x]=S.incomes.splice(i,1); const tid=trashPut('inc',x,i); save();renderAll();
  toast('اتحذف '+x.name,'تراجع',()=>{trashDel(tid);S.incomes.splice(i,0,x);save();renderAll()},3000)}

/* payment methods */
function renderPayReport(list,total){
  const by={}; list.forEach(x=>{const k=payOf(x); by[k]=(by[k]||0)+x.amount});
  const ids=Object.keys(by).sort((a,b)=>by[b]-by[a]);
  $('#payRep').innerHTML= !total? '<p class="hint" style="padding:8px 0">مفيش مصاريف في الشهر ده.</p>' :
    ids.map(id=>{const m=PAY[id], pct=by[id]/total*100;
      return `<div class="pay-rep"><div class="ico">${esc(m.e)}</div><div class="txt"><div class="row"><span>${esc(payLabel(m))}</span><span>${money(by[id])} <small>${CS()} · ${Math.round(pct)}%</small></span></div><div class="pbar"><i style="width:${pct}%"></i></div></div></div>`}).join('');
}
function payLabel(x){return PAYS.some(p=>p.id===x.id&&p.name===x.name)?TX(x.name):x.name}
const PAY_EMOJIS=['💵','💳','📲','👛','🏦','💰','🪙','📱','🧾','💸','🏧','🎟️'];
function renderPayList(){
  const counts={}; S.expenses.forEach(x=>{const k=payOf(x); counts[k]=(counts[k]||0)+1});
  {const n=S.pays.length; $('#payCount').textContent= n===1?'طريقة واحدة': n===2?'طريقتين': n<=10? n+' طرق' : n+' طريقة';}
  $('#payList').innerHTML=S.pays.map(x=>`<div class="pay-cell${x.id===S.lastPay?' def':''}" data-defpay="${esc(x.id)}" role="button" tabindex="0" aria-label="${esc(x.name)}${x.id===S.lastPay?' (الافتراضية)':''}، ${counts[x.id]||0} مصروف. دوسة مطولة للتعديل أو الحذف"><span class="pe">${esc(x.e)}</span><span class="pn">${esc(payLabel(x))}<small>${x.id===S.lastPay?'الافتراضية · ':''}${counts[x.id]?counts[x.id]+' مصروف':'مفيش مصاريف لسه'}</small></span><span class="pr" aria-hidden="true">✓</span><button class="more" type="button" data-obmore="pay:${esc(x.id)}" aria-label="خيارات ${esc(x.name)}" aria-haspopup="menu" aria-expanded="false">${ICON_MORE}</button></div>`).join('');
}
let lpTimer=null, lpFired=false, lpX=0, lpY=0;
const lpClear=()=>{clearTimeout(lpTimer);lpTimer=null};
$('#payList').addEventListener('pointerdown',e=>{const c=e.target.closest('.pay-cell'); if(!c) return; lpFired=false; lpX=e.clientX; lpY=e.clientY; lpClear();
  lpTimer=setTimeout(()=>{lpFired=true; lpTimer=null; if(navigator.vibrate) try{navigator.vibrate(18)}catch(_){} openMenu(c,'pay',c.dataset.defpay)},450)});
$('#payList').addEventListener('pointermove',e=>{if(lpTimer&&Math.hypot(e.clientX-lpX,e.clientY-lpY)>10) lpClear()});
['pointerup','pointercancel','pointerleave'].forEach(t=>$('#payList').addEventListener(t,lpClear));
$('#payList').addEventListener('contextmenu',e=>{const c=e.target.closest('.pay-cell'); e.preventDefault(); if(c&&!lpFired){lpFired=true; lpClear(); openMenu(c,'pay',c.dataset.defpay)}});
$('#payList').addEventListener('click',e=>{if(lpFired){e.stopPropagation();e.preventDefault();setTimeout(()=>{lpFired=false},0)}},true);
$('#payList').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const c=e.target.closest('.pay-cell'); if(c){e.preventDefault(); c.click()}} else if(e.key==='ContextMenu'||(e.shiftKey&&e.key==='F10')){const c=e.target.closest('.pay-cell'); if(c){e.preventDefault(); openMenu(c,'pay',c.dataset.defpay)}}});
document.addEventListener('click',e=>{const r=e.target.closest('[data-defpay]'); if(!r||e.target.closest('.more')) return;
  if(S.lastPay===r.dataset.defpay) return; S.lastPay=r.dataset.defpay; save(); renderPayList(); toast(PAY[S.lastPay].name+' بقت الافتراضية')});
function openPayForm(id){
  const x=id? S.pays.find(p=>p.id===id):null;
  openForm({title:x?'تعديل طريقة الدفع':'طريقة دفع جديدة', save:x?'حفظ التعديل':'إضافة',
    fields:[{type:'emoji',emojis:PAY_EMOJIS,value:x?x.e:'💳'},{key:'name',placeholder:'اسمها، مثلاً بطاقة البنك الأهلي',value:x?x.name:''}],
    onSave:v=>{if(!v.name) return 'اكتب اسم طريقة الدفع';
      if(S.pays.some(p=>p.id!==(x&&x.id)&&normAr(p.name)===normAr(v.name))) return 'الاسم ده موجود قبل كده';
      if(x) Object.assign(x,{name:v.name,e:v.e}); else S.pays.push({id:uid(),name:v.name,e:v.e});
      syncPays(); save(); renderAll(); toast(x?'اتعدلت طريقة الدفع':`اتضافت ${v.name}`)}});
}
function deletePay(id){
  if(id==='cash') return; const i=S.pays.findIndex(p=>p.id===id); if(i<0) return;
  const [m]=S.pays.splice(i,1), wasDef=S.lastPay===id; syncPays(); save(); renderAll();
  toast(`اتحذفت ${m.name}، ومصاريفها هتتحسب كاش`,'تراجع',()=>{S.pays.splice(i,0,m); if(wasDef) S.lastPay=id; syncPays(); save(); renderAll()},3000);
}
$('#addPay').onclick=()=>openPayForm();

/* Automatic local backup (Android): a JSON file in Download/Maleem every N days.
   It runs when the app opens or comes back to the front and the chosen number of days has passed. */
function autoBkLabel(n){n=+n||0; return n<1?'إيقاف':n===1?'كل يوم':n===2?'كل يومين':n<=10?`كل ${n} أيام`:`كل ${n} يوم`}
let autoBkBusy=false;
/* Android: one backup. It goes to the linked Google Drive (Drive only, or Drive + phone); until a Google account is
   linked it is kept on the phone (Download/Maleem). Automatic every N days when the app opens, or now with the button. */
const bkTo=()=>S.drive&&AB&&AB.driveUpload?(S.autoBkTo==='drive'?'drive':'both'):'device';
function bkDue(last,n){if(!last) return true; const d0=new Date(last).setHours(0,0,0,0), d1=new Date().setHours(0,0,0,0); return Math.round((d1-d0)/864e5)>=n}
/* the backup file: data + receipt photos (the big ones are left out), named so each member's newest 7 are kept */
async function bkMake(now){
  let rc={out:null,skipped:0}; try{rc=await rcExport()}catch(e){}
  const file={app:'maleem',version:1,at:now,auto:true,data:backupData()}; if(rc.out) file.receipts=rc.out;
  let text=JSON.stringify(file); if(bkeOn()) text=await bkeSeal(text,now); // encryption on: the file is sealed, never plain
  return {name:`${fileTag()}-auto-${dayKey(now)}.json`, b64:await toB64(new Blob([text])), skipped:rc.skipped||0};
}
const bkHasData=()=>S.expenses.length||S.debts.length||S.gams.length||S.incomes.length||S.goals.length||S.fixed.length||S.plans.length||S.iplans.length||S.gold.length;
async function maybeAutoBackup(){
  if(!AB||!AB.autoBackup||autoBkBusy) return;
  const n=+S.autoBkDays||0; if(n<1||!bkHasData()) return;
  const now=Date.now(), to=bkTo();
  const wantDev=to!=='drive'&&bkDue(S.lastAutoBk,n);
  // Drive: after a failed try wait 30 minutes (no internet = don't retry every time the app comes to the front)
  const wantDrive=to!=='device'&&bkDue(S.lastDriveBk,n)&&!driveBusy&&now-(+S.driveTryAt||0)>30*60000;
  if(!wantDev&&!wantDrive) return;
  autoBkBusy=true;
  try{
    const f=await bkMake(now);
    let devOk=false;
    if(wantDev){devOk=!!AB.autoBackup(f.name,f.b64); if(devOk){S.lastAutoBk=now; save(); renderSettings()}}
    const quiet=()=>$('#lock').classList.contains('open');
    if(wantDrive) driveSend(f.name,f.b64,false,(ok,err,warned)=>{ if(quiet()||warned) return;
      if(ok) toast(devOk?'اتعملت نسخة احتياطية على Google Drive والموبايل':'اتعملت نسخة احتياطية على Google Drive',null,null,3200);
      else if(devOk) toast('اتعملت نسخة احتياطية على الموبايل',null,null,3200)});
    else if(devOk&&!quiet()) toast('اتعملت نسخة احتياطية على الموبايل',null,null,3200);
  }catch(e){}
  autoBkBusy=false;
}
/* the button: a copy right now, to the same place(s) as the automatic one */
async function backupNow(interactive){
  const b=$('#backupBtn'); if(!AB||!AB.autoBackup||b.disabled||driveBusy) return;
  if(!bkHasData()){toast('مفيش بيانات لسه عشان نعمل منها نسخة');return}
  b.disabled=true; const t0=$('#backupBtnTxt').textContent; $('#backupBtnTxt').textContent='لحظة...';
  const done=()=>{b.disabled=false; $('#backupBtnTxt').textContent=t0};
  try{
    const now=Date.now(), to=bkTo(), f=await bkMake(now);
    if(f.skipped) setTimeout(()=>toast(`${f.skipped} صورة إيصال مدخلتش النسخة عشان حجمها كبير`,null,null,4000),3200);
    let devOk=false;
    if(to!=='drive'){devOk=!!AB.autoBackup(f.name,f.b64); if(devOk){S.lastAutoBk=now; save(); renderSettings()}}
    if(to==='device'){done(); toast(devOk?'اتحفظت نسخة على الموبايل في Download/Maleem':'معرفناش نعمل نسخة احتياطية'); return}
    driveSend(f.name,f.b64,!!interactive,(ok,err)=>{done();
      toast(ok?(devOk?'اترفعت نسخة على Google Drive واتحفظت على الموبايل':'اترفعت نسخة على Google Drive'):driveErrMsg(err)+(devOk?'. النسخة اتحفظت على الموبايل بس':''),null,null,ok?3000:6000)});
  }catch(e){done(); toast(e&&e.message==='enc'?'التشفير مش شغّال على الجهاز ده، فمعملناش نسخة':'معرفناش نعمل نسخة احتياطية')}
}

