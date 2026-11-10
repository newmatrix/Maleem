/* Search */
const normAr=s=>String(s||'').toLowerCase().replace(/[\u064B-\u0652\u0640]/g,'').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/ؤ/g,'و').replace(/ئ/g,'ي').replace(/ء/g,'').replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d));
/* search filters: category, payment method, date range, amount range */
const sfNum=v=>{const t=String(v||'').replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[,،\s]/g,'').replace('٫','.'); if(!t) return null; const n=parseFloat(t); return isFinite(n)?n:null};
const sfDay=v=>{if(!v) return null; const [y,m,d]=v.split('-').map(Number); return y?new Date(y,m-1,d).getTime():null};
function sfSelected(){return [...document.querySelectorAll('#sfCat input:checked')].map(x=>x.value)}
function sfCategoryLabel(){const cats=sfSelected();$('#sfCatSummary').textContent=cats.length?cats.map(id=>(CAT[id]||CAT.other).name).join('، '):TX('كل الفئات')}
function sfGet(){const f={cats:sfSelected(),pay:$('#sfPay').value,from:sfDay($('#sfFrom').value),to:sfDay($('#sfTo').value),min:sfNum($('#sfMin').value),max:sfNum($('#sfMax').value)};
  f.on=!!(f.cats.length||f.pay||f.from!==null||f.to!==null||f.min!==null||f.max!==null); return f}
function sfFill(){
  const selected=new Set(sfSelected()), p=$('#sfPay').value;
  $('#sfCat').innerHTML=S.cats.map(x=>`<label><input type="checkbox" value="${esc(x.id)}"${selected.has(x.id)?' checked':''}><span>${esc(x.e+' '+x.name)}</span></label>`).join('');
  $('#sfPay').innerHTML='<option value="">كل الطرق</option>'+S.pays.map(x=>`<option value="${esc(x.id)}">${esc(x.e+' '+x.name)}</option>`).join('');
  sfCategoryLabel(); $('#sfPay').value=S.pays.some(x=>x.id===p)?p:'';sfPaintPicks();
}
function sfPass(x,f){
  if(f.cats.length&&!f.cats.includes(x.cat)) return false;
  if(f.pay&&payOf(x)!==f.pay) return false;
  if(f.from!==null&&x.ts<f.from) return false;
  if(f.to!==null&&x.ts>=f.to+864e5) return false;
  if(f.min!==null&&x.amount<f.min) return false;
  if(f.max!==null&&x.amount>f.max) return false;
  return true;
}
/* everything that is not an expense: transfers, income, debts, installments, gam'eyas, planned and fixed expenses */
function searchOthers(words,numQ){
  const ok=(txt,amts)=>{ if(numQ!==null&&amts.some(a=>Math.abs(a-numQ)<0.005)) return true; const t=normAr(txt); return words.every(w=>t.includes(w)) };
  const A=id=>{const a=ACC(id); return a?accDisp(a):''}, out=[];
  S.transfers.forEach(t=>{ const f=ACC(t.from), to=ACC(t.to); if(ok(`تحويل ${A(t.from)} ${A(t.to)} ${t.note||''}`,[t.out,t.in,t.fee])) out.push({ts:t.ts,icon:'⇄',title:`تحويل من ${f?accDisp(f):'؟'} إلى ${to?accDisp(to):'؟'}`,amt:t.out,cur:f?curSym(f.cur):CS(),go:''}) });
  S.inflows.forEach(x=>{ if(ok(`دخل ${x.src||''} ${x.note||''} ${A(x.acc)}`,[x.amount])) out.push({ts:x.ts,icon:'💰',title:'دخل: '+(x.src||'استلام'),amt:x.amount,cur:CS(),go:''}) });
  S.debts.forEach(d=>{ if(ok(`${d.person} ${d.note||''} ${(d.adds||[]).map(a=>a.note).join(' ')} سلفة دين`,[debtTotal(d),debtRem(d)])) out.push({ts:+d.created||0,icon:d.dir==='in'?'📥':'💸',title:`${d.dir==='in'?'ليك عند':'عليك لـ'} ${d.person}${d.closed?' (اتقفلت)':''}`,amt:debtRem(d)||debtTotal(d),cur:debtSym(d),go:'debts'}) });
  S.insts.forEach(p=>{ if(ok(`${p.name} ${p.party||''} تقسيط قسط`,[instTotal(p)])) out.push({ts:+p.created||0,icon:'💳',title:'تقسيط: '+p.name,amt:instTotal(p),cur:CS(),go:'insts'}) });
  S.gams.forEach(g=>{ if(ok(`${g.name} جمعية`,[g.inst,gamMonthly(g)])) out.push({ts:+g.created||0,icon:'🤝',title:'جمعية: '+g.name,amt:gamMonthly(g),cur:CS(),go:'gams'}) });
  S.plans.forEach(x=>{ if(ok(`${x.name} مصروف جاي`,[x.amount])) out.push({ts:dkToTs(x.due),icon:'📌',title:'مصروف جاي: '+x.name,amt:x.amount,cur:CS(),go:''}) });
  S.fixed.forEach(f=>{ if(ok(`${f.name} مصروف ثابت`,[f.amount])) out.push({ts:+f.created||0,icon:'🔁',title:'مصروف ثابت: '+f.name,amt:f.amount,cur:CS(),go:''}) });
  return out.sort((a,b)=>b.ts-a.ts);
}
function sfCompare(a,b){
  const mode=$('#sfSort').value,asc=mode.endsWith('asc'),dir=asc?1:-1;
  if(mode.startsWith('amount'))return dir*(a.amount-b.amount)||b.ts-a.ts||String(a.id).localeCompare(String(b.id));
  if(mode.startsWith('cat'))return dir*(CAT[a.cat]||CAT.other).name.localeCompare((CAT[b.cat]||CAT.other).name,LOC)||b.ts-a.ts||String(a.id).localeCompare(String(b.id));
  return dir*(a.ts-b.ts)||String(a.id).localeCompare(String(b.id));
}
function renderSearch(){
  sfPaintPicks(); sqPaint();
  const q=normAr($('#searchIn').value.trim()), f=sfGet();
  $('#sfBtn').classList.toggle('on',f.on); $('#sfBtn').textContent=f.on?'فلاتر شغالة':'فلاتر'; $('#sfClear').hidden=!f.on;
  const words=q?q.split(/\s+/):[], numQ=/^\d+(\.\d+)?$/.test(q)? parseFloat(q) : null;
  const hits=S.expenses.filter(x=>{
    if(!sfPass(x,f)) return false;
    if(!q) return true;
    if(numQ!==null && x.amount===numQ) return true;
    const hay=normAr((x.note||'')+' '+(CAT[x.cat]||CAT.other).name+' '+PAY[payOf(x)].name+(numQ===null?' '+shortDate(x.ts)+' '+new Date(x.ts).toLocaleDateString(LOC,{weekday:'long',month:'long'}):''));
    return words.every(w=>hay.includes(w));
  }).sort(sfCompare);
  const oth= q&&!f.on? searchOthers(words,numQ).slice(0,100) : [];
  $('#searchSum').innerHTML=(hits.length? `لقيت <b>${hits.length}</b> ${hits.length===1?'مصروف':hits.length<=10?'مصاريف':'مصروف'} بإجمالي <b>${money(sum(hits))}</b> ${CS()}` : (oth.length?'':'مفيش حاجة بالكلام ده.'))
    +(oth.length? (hits.length?' و':'لقيت ')+`<b>${oth.length}</b> حركة تانية` : '');
  const othHtml= oth.length? `<div class="day-h"><span>حركات تانية</span><span>${oth.length}</span></div><div class="day-list">${oth.map(o=>`<div class="crow"${o.go?` data-goob="${o.go}" style="cursor:pointer"`:''}><div class="tile">${o.icon}</div><div class="n">${esc(o.title)}<small>${o.ts>0?esc(shortDate(o.ts)):''}</small></div><b>${money(o.amt)} <small>${esc(o.cur)}</small></b></div>`).join('')}</div>` : '';
  const shown=hits.slice(0,300),mode=$('#sfSort').value,groups=new Map();
  const datedRow=x=>`<div><small class="sf-result-date">${esc(shortDate(x.ts))}</small>${itemRow(x)}</div>`;
  let rows='';
  if(mode.startsWith('amount'))rows='<div class="day-list">'+shown.map(datedRow).join('')+'</div>';
  else{
    shown.forEach(x=>{const key=mode.startsWith('cat')?x.cat:dayKey(x.ts);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(x)});
    rows=[...groups].map(([key,list])=>`<div class="day-h"><span>${esc(mode.startsWith('cat')?(CAT[key]||CAT.other).name:dayName(key)+(key.slice(0,4)!==String(new Date().getFullYear())?' '+key.slice(0,4):''))}</span><span>${money(sum(list))} ${CS()}</span></div><div class="day-list">${list.map(mode.startsWith('cat')?datedRow:itemRow).join('')}</div>`).join('');
  }
  $('#searchRes').innerHTML=rows+(hits.length>300?`<p class="hint center">${esc(TX('ظاهر أول 300 نتيجة حسب الترتيب المختار؛ الإجمالي لكل النتائج.'))}</p>`:'')+othHtml;

}
var SF_CHEV='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m6 9 6 6 6-6"/></svg>';
function sfPaintPicks(){
  ['sfPay','sfSort'].forEach(id=>{const el=$('#'+id),op=el.selectedOptions[0];$('#'+id+'Pick').innerHTML='<span>'+esc(TX(op?op.textContent:''))+'</span>'+SF_CHEV});
  ['sfFrom','sfTo'].forEach(id=>{$('#'+id+'Pick').innerHTML='<span>📅 '+esc($('#'+id).value?dkToDMY($('#'+id).value):TX('اختار اليوم'))+'</span>'+SF_CHEV});
}
var sfChoiceId='',sfCalId='',sfCalMonth=new Date();
function sfCloseChoice(){ $('#sfChoiceMenu').classList.remove('open');['sfPay','sfSort'].forEach(id=>$('#'+id+'Pick').setAttribute('aria-expanded','false')) }
['sfPay','sfSort'].forEach(id=>$('#'+id+'Pick').onclick=e=>{
  e.stopPropagation();const menu=$('#sfChoiceMenu');if(menu.classList.contains('open')&&sfChoiceId===id){sfCloseChoice();return}sfCloseChoice();sfChoiceId=id;
  const el=$('#'+id);menu.setAttribute('aria-label',TX(id==='sfPay'?'طريقة الدفع':'ترتيب المصروفات'));
  menu.innerHTML=[...el.options].map(o=>`<button type="button" role="menuitemradio" data-value="${esc(o.value)}" aria-checked="${o.selected}"><span class="pe">${id==='sfSort'?'↕':o.value?'':'🧾'}</span><span>${esc(TX(o.textContent))}</span></button>`).join('');
  menu.classList.add('open');$('#'+id+'Pick').setAttribute('aria-expanded','true');const r=e.currentTarget.getBoundingClientRect();menu.style.left=Math.max(8,Math.min(r.left,innerWidth-menu.offsetWidth-8))+'px';menu.style.top=Math.max(8,Math.min(r.bottom+6,innerHeight-menu.offsetHeight-8))+'px';
});
$('#sfChoiceMenu').onclick=e=>{const b=e.target.closest('[data-value]');if(!b)return;$('#'+sfChoiceId).value=b.dataset.value;sfCloseChoice();renderSearch()};
document.addEventListener('click',e=>{if(!e.target.closest('#sfChoiceMenu,#sfPayPick,#sfSortPick'))sfCloseChoice()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')sfCloseChoice()});
window.addEventListener('resize',sfCloseChoice);
function sfCalendarPaint(){
  const y=sfCalMonth.getFullYear(),m=sfCalMonth.getMonth(),count=new Date(y,m+1,0).getDate(),offset=new Date(y,m,1).getDay();
  $('#sfMonthName').textContent=sfCalMonth.toLocaleDateString(LOC,{month:'long',year:'numeric'});
  let html=Array.from({length:7},(_,i)=>'<small>'+esc(new Date(2026,10,1+i).toLocaleDateString(LOC,{weekday:'short'}))+'</small>').join('')+'<span></span>'.repeat(offset);
  for(let d=1;d<=count;d++){const key=dayKey(new Date(y,m,d));html+=`<button type="button" data-day="${key}" aria-label="${dkToDMY(key)}" aria-pressed="${$('#'+sfCalId).value===key}" class="${key===todayKey()?'today':''}">${d}</button>`}
  $('#sfCalendarDays').innerHTML=html;
}
['sfFrom','sfTo'].forEach(id=>$('#'+id+'Pick').onclick=()=>{sfCloseChoice();sfCalId=id;const val=$('#'+id).value;sfCalMonth=val?new Date(sfDay(val)):new Date();sfCalMonth.setDate(1);$('#sfCalendarTitle').textContent=TX(id==='sfFrom'?'من يوم':'لحد يوم');sfCalendarPaint();$('#sfCalendar').showModal()});
function sfCalendarChoose(value){$('#'+sfCalId).value=value;$('#'+sfCalId).dispatchEvent(new Event('change'));$('#sfCalendar').close();renderSearch()}
$('#sfCalendarDays').onclick=e=>{const b=e.target.closest('[data-day]');if(b)sfCalendarChoose(b.dataset.day)};
$('#sfMonthPrev').onclick=()=>{sfCalMonth.setMonth(sfCalMonth.getMonth()-1);sfCalendarPaint()};
$('#sfMonthNext').onclick=()=>{sfCalMonth.setMonth(sfCalMonth.getMonth()+1);sfCalendarPaint()};
$('#sfCalendarToday').onclick=()=>sfCalendarChoose(todayKey());
$('#sfCalendarClear').onclick=()=>sfCalendarChoose('');
$('#sfCalendarCancel').onclick=()=>$('#sfCalendar').close();
let searchT;
$('#searchIn').addEventListener('input',()=>{clearTimeout(searchT);searchT=setTimeout(renderSearch,150)});
$('#searchIn').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('#searchIn').blur()}});
/* quick searches under the box: today / last 7 days / this month (date filters) and the biggest first (sort); tap again to undo */
const SQ=()=>{const t=todayKey(), w=dayKey(new Date().setDate(new Date().getDate()-6)), m=monKey(Date.now())+'-01';
  return {today:{from:t,to:t},week:{from:w,to:t},month:{from:m,to:t},big:{sort:'amount-desc'}}};
function sqActive(k){const q=SQ()[k], v=id=>$('#'+id).value;
  return q.sort? v('sfSort')===q.sort : v('sfFrom')===q.from&&v('sfTo')===q.to}
function sqPaint(){document.querySelectorAll('#sqChips [data-sq]').forEach(b=>b.setAttribute('aria-pressed',sqActive(b.dataset.sq)))}
$('#sqChips').onclick=e=>{const b=e.target.closest('[data-sq]'); if(!b) return;
  const k=b.dataset.sq, q=SQ()[k], on=sqActive(k);
  if(q.sort) $('#sfSort').value=on?'time-desc':q.sort;
  else {$('#sfFrom').value=on?'':q.from; $('#sfTo').value=on?'':q.to}
  renderSearch()};
/* after you edit or delete a result the search comes back, with the same words and filters */
let srBack=false;
$('#searchRes').addEventListener('click',e=>{if(e.target.closest('[data-more],[data-rc]')||!e.target.closest('.xp')) return;
  srBack=true; $('#searchSheet').classList.remove('open'); // the expense form opens in its place (it would sit behind the search otherwise)
  setTimeout(()=>{if(!$('#sheet').classList.contains('open')){srBack=false; openSearch()}},0)},true); // a read-only expense does not open: bring the search back
new MutationObserver(()=>{if(!srBack||$('#sheet').classList.contains('open')) return; srBack=false;
  setTimeout(()=>{if(!document.querySelector('.sheet.open')) openSearch()},320)}).observe($('#sheet'),{attributes:true,attributeFilter:['class']});
function openSearch(){closeSheets();sfFill();renderSearch();openSheetEl('searchSheet');setTimeout(()=>$('#searchIn').focus({preventScroll:true}),320)}
['#searchBtn','#homeSearchBtn'].forEach(id=>$(id).onclick=openSearch);
$('#sfBtn').onclick=()=>{const p=$('#sfPanel'); p.hidden=!p.hidden; $('#sfBtn').setAttribute('aria-expanded',!p.hidden); if(!p.hidden) sfFill()};
$('#sfCat').addEventListener('change',()=>{sfCategoryLabel();renderSearch()});
$('#sfSort').addEventListener('change',renderSearch);
['#sfPay','#sfFrom','#sfTo'].forEach(id=>$(id).addEventListener('change',renderSearch));
['#sfMin','#sfMax'].forEach(id=>$(id).addEventListener('input',()=>{clearTimeout(searchT);searchT=setTimeout(renderSearch,200)}));
$('#sfClear').onclick=()=>{['#sfPay','#sfFrom','#sfTo','#sfMin','#sfMax'].forEach(id=>{$(id).value=''});document.querySelectorAll('#sfCat input').forEach(x=>x.checked=false);sfCategoryLabel();renderSearch()};

