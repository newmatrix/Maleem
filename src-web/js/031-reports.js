/* Reports */
/* Reports use the same "month" as the budget: from payday to the day before the next payday (calendar month when payday is 1).
   curMonth holds the period's start day key (yyyy-mm-dd). */
const repP=k=>{const [y,m,d]=String(k).split('-').map(Number);return periodAt(new Date(y,m-1,d,12).getTime(),repPd())};
const repPrev=P=>periodAt(P.start-432e5,repPd());
const repNext=P=>periodAt(P.next+432e5,repPd());
const repDays=P=>Math.round((P.next-P.start)/864e5);
function repRange(P,yr){
  const e=new Date(P.next); e.setDate(e.getDate()-1);
  const f=ts=>new Date(ts).toLocaleDateString(LOC,{day:'numeric',month:'long'});
  return f(P.start)+' - '+f(e.getTime())+(yr?' '+e.getFullYear():'');
}
const repName=P=>P.pd===1? monthName(monKey(P.start)) : repRange(P,true);
const repShort=P=>P.pd===1? monthOnly(monKey(P.start)) : repRange(P,false);
const repAllWord=()=>repPd()===1?'كل الشهور':'كل الفترات';
function repSheetName(P){
  if(P.pd===1) return mkToMY(monKey(P.start)).replace('/','-');
  const s=new Date(P.start), e=new Date(P.next); e.setDate(e.getDate()-1);
  return `${pad(s.getDate())}.${pad(s.getMonth()+1)} - ${pad(e.getDate())}.${pad(e.getMonth()+1)}.${e.getFullYear()}`;
}
let curMonth=periodOf(Date.now()).key;
function renderReports(){
  const P=repP(curMonth); curMonth=P.key;
  const list=ofPeriod(P), total=sum(list), curP=periodOf(Date.now());
  $('#mLabel').textContent=repName(P);
  renderPayReport(list,total);
  try{renderMoneyReport(P,list,total)}catch(e){console.error(e)}
  paintRepTab();
  $('#mNext').disabled = P.key>=curP.key;
  $('#monthCard').innerHTML=`<div class="row"><span class="mname">مصاريف ${P.pd===1?'شهر ':'فترة '}${repShort(P)}</span><span style="opacity:.85">${list.length} عملية</span></div>
    <div class="big">${money(total)}<small>${CS()}</small></div>
    <div class="go">شوف التفاصيل <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M15 6l-6 6 6 6"/></svg></div>`;

  // daily bar chart
  const n=repDays(P), daily=Array(n).fill(0), sd=new Date(P.start);
  const idxOf=ts=>{const d=new Date(ts);return Math.min(n-1,Math.max(0,Math.round((new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime()-P.start)/864e5)))};
  list.forEach(x=>{daily[idxOf(x.ts)]+=x.amount});
  const dnum=i=>new Date(sd.getFullYear(),sd.getMonth(),sd.getDate()+i).getDate();
  const max=Math.max(...daily,1), W=Math.max(320,n*14), H=170, top=14, bot=24, bw=W/n;
  const isCur=P.key===curP.key, td=isCur? idxOf(Date.now())+1 : 0;
  $('#dailyHint').textContent= total? `متوسط ${fmt(total/(isCur?td:n))} ${CS()} في اليوم · أعلى يوم ${fmt(max)} ${CS()}` : 'مفيش مصاريف في الشهر ده.';
  let bars='';
  daily.forEach((v,i)=>{
    const h=v? Math.max(3,(v/max)*(H-top-bot)):0, x=i*bw+bw*.18, y=H-bot-h;
    const hl=isCur&&i+1===td;
    bars+=`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(bw*.64).toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="${hl?'var(--gold)':'var(--brand)'}" opacity="${v?1:0}"><title>يوم ${dnum(i)}: ${fmt(v)} ${CS()}</title></rect>`;
    if((i+1)%5===0||i===0) bars+=`<text x="${(i*bw+bw/2).toFixed(1)}" y="${H-6}" text-anchor="middle" font-size="10" fill="var(--muted)">${dnum(i)}</text>`;
  });
  $('#dailyChart').innerHTML=`<svg viewBox="0 0 ${W} ${H}" width="100%" style="min-width:${Math.min(W,320)}px;display:block;direction:ltr" role="img" aria-label="رسم بياني للصرف اليومي">
    <line x1="0" x2="${W}" y1="${H-bot}" y2="${H-bot}" stroke="var(--line)"/>${bars}</svg>`;

  // comparison
  const pm=repPrev(P), prev=ofPeriod(pm), pTot=sum(prev), cA=byCat(list), pA=byCat(prev);
  $('#cmpHint').textContent=`${repShort(P)} مقابل ${repShort(pm)}`;
  const badge=(cur,old)=>{
    if(!old&&!cur) return '<span class="badge flat">—</span>';
    if(!old) return '<span class="badge up">جديد</span>';
    const p=Math.round((cur-old)/old*100);
    if(p===0) return '<span class="badge flat">زي ما هو</span>';
    return `<span class="badge ${p>0?'up':'down'}"><span class="num">${Math.abs(p)}%</span> ${p>0?'أكتر':'أقل'}</span>`;
  };
  const sentence=(name,cur,old)=>{
    if(!old) return `صرفت ${fmt(cur)} ${CS()}، والشهر اللي فات مكنتش صرفت حاجة`;
    if(!cur) return `مصرفتش حاجة، والشهر اللي فات ${fmt(old)} ${CS()}`;
    return `${fmt(cur)} ${CS()} مقابل ${fmt(old)} ${CS()}`;
  };
  const ids=[...new Set([...Object.keys(cA),...Object.keys(pA)])].sort((a,b)=>(cA[b]||0)-(cA[a]||0));
  if(!ids.length){$('#cmpList').innerHTML='<p class="hint" style="padding:8px 0">مفيش بيانات كفاية للمقارنة.</p>';}
  else{
    let html=`<div class="cmp"><div class="ico" style="background:var(--surface-2)">Σ</div><div class="txt"><b>الإجمالي</b><small>${sentence('',total,pTot)}</small></div>${badge(total,pTot)}</div>`;
    html+=ids.map(id=>{const c=CAT[id]||CAT.other, cur=cA[id]||0, old=pA[id]||0;
      return `<button type="button" class="cmp category-link" data-report-cat="${esc(id)}"><div class="ico" style="background:${colr(c.c)}22">${esc(c.e)}</div><div class="txt">${esc(c.name)}<small>${sentence(c.name,cur,old)}</small></div>${badge(cur,old)}</button>`}).join('');
    $('#cmpList').innerHTML=html;
  }
}

function renderDetail(){
  const P=repP(curMonth), list=ofPeriod(P), total=sum(list), cA=byCat(list);
  $('#detailTitle').textContent='تفاصيل '+repName(P);
  const ids=Object.keys(cA).sort((a,b)=>cA[b]-cA[a]);
  // donut
  const R=70, C=2*Math.PI*R; let off=0, segs='';
  ids.forEach(id=>{const f=cA[id]/total, len=f*C;
    segs+=`<circle r="${R}" cx="90" cy="90" fill="none" stroke="${colr((CAT[id]||CAT.other).c)}" stroke-width="26" stroke-dasharray="${Math.max(0,len-1.5)} ${C}" stroke-dashoffset="${-off}" transform="rotate(-90 90 90)"/>`;off+=len});
  $('#donut').innerHTML= total? `<svg viewBox="0 0 180 180" width="210" height="210" role="img" aria-label="توزيع المصاريف حسب الفئة"><circle r="${R}" cx="90" cy="90" fill="none" stroke="var(--surface-2)" stroke-width="26"/>${segs}</svg>
     <div class="donut-center"><b>${money(total)}</b><span>${CS()}</span></div>` : '<p class="hint" style="padding:20px 0">مفيش مصاريف في الشهر ده.</p>';
  $('#legend').innerHTML=ids.map(id=>{const c=CAT[id]||CAT.other;
    return `<li><button type="button" class="category-link" data-report-cat="${esc(id)}"><span class="dot" style="background:${colr(c.c)}"></span><span class="n">${esc(c.e)} ${esc(c.name)}</span><b>${money(cA[id])} ${CS()}</b><span class="p num">${Math.round(cA[id]/total*100)}%</span><span aria-hidden="true">‹</span></button></li>`}).join('');
  // by day
  const days={};list.forEach(x=>{(days[dayKey(x.ts)]=days[dayKey(x.ts)]||[]).push(x)});
  const keys=Object.keys(days).sort().reverse();
  $('#dayByDay').innerHTML= keys.map(k=>{const arr=days[k].sort((a,b)=>b.ts-a.ts);
    return `<div class="day-h"><span>${dayName(k)}</span><span>${money(sum(arr))} ${CS()}</span></div><div class="day-list">${arr.map(homeExpenseRow).join('')}</div>`}).join('');
}

var reportCategoryId='',reportCategoryReturn='detail';
function openReportCategory(id){if(!CAT[id])return;reportCategoryId=id;reportCategoryReturn=$('#reportsDetail').hidden?'main':'detail';showSub('category')}
function renderReportCategory(){
  const c=CAT[reportCategoryId]||CAT.other,P=repP(curMonth),list=ofPeriod(P).filter(x=>x.cat===reportCategoryId).sort((a,b)=>b.ts-a.ts);
  $('#reportCategoryTitle').textContent=c.e+' '+c.name;
  $('#reportCategoryPeriod').textContent=repName(P);
  $('#reportCategoryTotal').innerHTML=money(sum(list))+' '+esc(CS());
  $('#reportCategoryCount').textContent=list.length+' '+TX('عملية');
  const days=new Map();list.forEach(x=>{const k=dayKey(x.ts);if(!days.has(k))days.set(k,[]);days.get(k).push(x)});
  $('#reportCategoryList').innerHTML=list.length?[...days].map(([k,rows])=>`<div class="day-h"><span>${esc(dayName(k))}</span><span>${money(sum(rows))} ${CS()}</span></div><div class="day-list">${rows.map(homeExpenseRow).join('')}</div>`).join(''):`<div class="empty">${esc(TX('مفيش عمليات في الفئة دي خلال الفترة المختارة'))}</div>`;
}
$('#reportCategoryBack').onclick=()=>showSub(reportCategoryReturn);
['#legend','#cmpList'].forEach(id=>$(id).addEventListener('click',e=>{const b=e.target.closest('[data-report-cat]');if(b)openReportCategory(b.dataset.reportCat)}));
['#reportCategoryList','#dayByDay','#searchRes'].forEach(id=>$(id).addEventListener('click',e=>{if(e.target.closest('[data-more],[data-rc]'))return;const row=e.target.closest('.xp');if(row)openSheet(row.dataset.id)}));
var repMainY=0; // where the reports' main screen was when a page was opened from it
function showSub(name,quiet){
  const ids={main:'#reportsMain',detail:'#reportsDetail',category:'#reportsCategory'};
  if(name!=='main'&&!$('#reportsMain').hidden) repMainY=pageY();
  Object.entries(ids).forEach(([k,s])=>$(s).hidden=k!==name);
  const el=$(ids[name]); if(!quiet){el.classList.remove('sub-anim');void el.offsetWidth;el.classList.add('sub-anim')}
  if(name==='detail') renderDetail();
  if(name==='category')renderReportCategory();
  if(!quiet) pageTo(name==='main'?repMainY:0);
}
function showDetail(on){showSub(on?'detail':'main')}

