/* ===== Trash: what you delete stays here for 30 days, and you can bring it back (Settings > سلة المحذوفات). Entries: see cleanTrash. ===== */
const TRASH_LABEL={xp:'مصروف',debt:'سلفة',gam:'جمعية',inc:'دخل',goal:'هدف',fix:'مصروف ثابت',plan:'مصروف جاي',ipl:'دخل جاي',inst:'تقسيط'};
const TRASH_ARR={xp:'expenses',debt:'debts',gam:'gams',inc:'incomes',goal:'goals',fix:'fixed',plan:'plans',ipl:'iplans',inst:'insts'};
const trashAll=()=>Array.isArray(S.trash)?S.trash:(S.trash=[]);
/* a record leaves the trash for good: its receipt photo goes too, unless something else still uses that photo */
function trashLetGo(t){
  if(!t||t.k!=='xp'||!RC.can||!RC.ids.has(t.d.id)) return;
  if(S.expenses.some(e=>e.id===t.d.id)||trashAll().some(o=>o!==t&&o.k==='xp'&&o.d.id===t.d.id)) return;
  try{rcDel(t.d.id).catch(()=>{})}catch(e){}
}
function trashSweep(){ // drop what is older than 30 days
  const cut=Date.now()-TRASH_DAYS*864e5, L=trashAll(), gone=L.filter(t=>t.ts<cut);
  if(!gone.length) return false;
  S.trash=L.filter(t=>t.ts>=cut); gone.forEach(trashLetGo); return true;
}
/* called by every delete function right after it takes the record out of its list; returns the entry id (the "undo" of the toast removes the entry again) */
function trashPut(k,rec,i,m){
  trashSweep();
  const t={id:uid(),k,ts:Date.now(),i:Math.max(0,i|0),d:JSON.parse(JSON.stringify(rec))}; if(m&&m.length) t.m=m;
  const L=trashAll(); L.unshift(t);
  while(L.length>TRASH_MAX) trashLetGo(L.pop());
  return t.id;
}
function trashDel(id){S.trash=trashAll().filter(t=>t.id!==id)}
function trashRestore(id){
  const t=trashAll().find(x=>x.id===id); if(!t) return false;
  const cl=TRASH_CLEAN[t.k](t.d), arr=S[TRASH_ARR[t.k]];
  if(!cl){trashDel(id);save();return false}
  if(arr.some(x=>x.id===cl.id)) cl.id=uid();
  if(t.k==='xp'){
    if(cl.acc&&!ACC(cl.acc)){delete cl.acc;delete cl.accAmt} // its account was deleted meanwhile
    if(cl.inst&&!S.insts.some(p=>p.items.some(it=>it.id===cl.inst))) delete cl.inst;
    if(S.space&&cl.sp===S.space.code&&expenseCanManage(cl)) S.space.manual=Array.from(new Set([...(S.space.manual||[]),String(cl.id)]));
    arr.push(cl); justAdded=cl.id;
  }else arr.splice(Math.min(t.i,arr.length),0,cl);
  if(t.k==='inst') (t.m||[]).forEach(([eid,v])=>{const e=S.expenses.find(x=>x.id===eid); if(e&&!e.inst) e.inst=v});
  trashDel(id); save(); renderAll(); justAdded=null;
  return true;
}
function trashForever(id){const t=trashAll().find(x=>x.id===id); trashDel(id); trashLetGo(t); save()}
function trashEmpty(){const L=trashAll(); S.trash=[]; L.forEach(trashLetGo); save()}
function trashInfo(t){
  const d=t.d, m=v=>fmt(v)+' '+CS();
  try{switch(t.k){
    case 'xp': return {t:d.note||(CAT[d.cat]||CAT.other).name, a:m(d.amount)};
    case 'debt': return {t:d.person||'—', a:fmt(d.amount)+' '+debtSym(d)};
    case 'gam': return {t:d.name, a:m(d.inst)};
    case 'goal': return {t:d.name, a:m(d.target)};
    case 'inst': return {t:d.name, a:m(instTotal(d))};
    default: return {t:d.name, a:m(d.amount)};
  }}catch(e){return {t:d.name||d.person||d.note||'—',a:''}}
}
const trashAgo=n=>n<=0?'اتحذف النهارده':n===1?'اتحذف امبارح':'اتحذف من '+daysTxt(n);
function renderTrash(){
  trashSweep();
  const L=trashAll(), now=Date.now();
  $('#trashEmpty').hidden=!L.length;
  $('#trashList').innerHTML=L.length?L.map(t=>{
    const i=trashInfo(t), ago=Math.floor((now-t.ts)/864e5), left=Math.max(1,TRASH_DAYS-ago);
    return `<div class="tr-row" data-tid="${esc(t.id)}"><div class="tr-main"><b>${esc(i.t)}</b><span>${TRASH_LABEL[t.k]} · ${esc(i.a)}</span><small>${trashAgo(ago)} · فاضل ${daysTxt(left)}</small></div><div class="tr-btns"><button type="button" class="btn sm primary" data-tr="res">رجّع</button><button type="button" class="btn sm" data-tr="del">امسح</button></div></div>`
  }).join(''):'<p class="hint center tr-none">السلة فاضية</p>';
}
function openTrash(){renderTrash(); $('#scrim').classList.add('open'); $('#trashSheet').classList.add('open')}
$('#trashList').onclick=e=>{
  const b=e.target.closest('[data-tr]'), row=b&&b.closest('[data-tid]'); if(!row) return;
  const id=row.dataset.tid;
  if(b.dataset.tr==='res'){
    const t=trashAll().find(x=>x.id===id), name=t?trashInfo(t).t:'';
    if(trashRestore(id)){renderTrash();renderSetHome();toast('اتسترجع «'+name+'»')} else toast('مقدرتش أرجّع العنصر ده'); return }
  if(!b.dataset.arm){b.dataset.arm='1';b.textContent='دوس تاني';clearTimeout(b._t);b._t=setTimeout(()=>{delete b.dataset.arm;b.textContent='امسح'},4000);return}
  trashForever(id); renderTrash(); renderSetHome(); toast('اتمسح نهائيًا');
};
armBtn($('#trashEmpty'),'فضّي السلة','دوس تاني للتأكيد',()=>{trashEmpty();renderTrash();renderSetHome();toast('السلة اتفضّت')});
$('#trashClose').onclick=()=>closeSheets();
