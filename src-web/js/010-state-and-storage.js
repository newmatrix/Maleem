/* localStorage full: warn instead of silently keeping the data in memory only */
let storageWarnAt=0;
function storageFull(){const now=Date.now(); if(now-storageWarnAt<60000) return; storageWarnAt=now; errLog('app','storage full');
  setTimeout(()=>{try{toast('⚠️ مساحة التخزين اتملت، والتعديلات الجديدة مش هتتحفظ لما تقفل التطبيق. اعمل نسخة احتياطية حالًا، وشيل الصورة الشخصية أو امسح بيانات قديمة.',null,null,9000)}catch(e){}},0)}
function persist(){if(!lsSet(KEY,JSON.stringify(S))) storageFull(); mbSyncName()}

/* ===== Members: several people use the app on one phone, each with his own data, settings and password.
   The list lives in its own key; each member's data has its own key. The first member keeps the original
   key 'maleem.v1' (and the original receipts database / Firebase account), so data saved by older versions
   simply becomes the first member. Switching member saves, then reloads the page with the other member. */
const MKEY='maleem.members', MB_MAX=6;
const mbKey=id=>id==='m1'?'maleem.v1':'maleem.m.'+id;
const rcDbName=id=>id==='m1'?'maleem':'maleem-'+id;
const fbAppName=id=>id==='m1'?'[DEFAULT]':'maleem-'+id;
let MB=null;
try{const r=JSON.parse(lsGet(MKEY)||'null');
  if(r&&Array.isArray(r.list)) MB={active:String(r.active||''),list:r.list.filter(m=>m&&typeof m.id==='string'&&/^m[a-z0-9]{1,20}$/.test(m.id)).map(m=>({id:m.id,name:String(m.name||'').slice(0,24)}))};
}catch(e){}
if(!MB||!MB.list.length) MB={active:'m1',list:[{id:'m1',name:''}]};
if(!MB.list.some(m=>m.id===MB.active)) MB.active=MB.list[0].id;
const ME=MB.list.find(m=>m.id===MB.active);
const KEY=mbKey(ME.id);
function mbSave(){lsSet(MKEY,JSON.stringify(MB))}
/* the member's name in the list follows the name he sets in "أنا" */
function mbSyncName(){const n=String((S.profile&&S.profile.name)||'').trim().replace(/\s+/g,' ').slice(0,24); if(n&&ME.name!==n){ME.name=n;mbSave()}}
/* "Maleem-هشام": the start of every backup / export file name */
function fileTag(){const n=String(ME.name||(S.profile&&S.profile.name)||'').replace(/[\\/:*?"<>|\u0000-\u001f]/g,'').replace(/\s+/g,' ').trim().slice(0,24); return n?'Maleem-'+n:'Maleem'}

let S = {expenses:[], budget:0, theme:'system', pin:null, lastBackup:null};
try{const raw=lsGet(KEY); if(raw){S=Object.assign(S,JSON.parse(raw))}}catch(e){}
const AB = window.AndroidBridge || null;
let syncT;
function save(){userTextCache=null;persist(); if(S.space) spQueue(); if(AB){clearTimeout(syncT);syncT=setTimeout(()=>{try{syncNative()}catch(e){logErr('sync',e)}},800)}}
function syncCats(){
  if(!Array.isArray(S.cats)||!S.cats.length) S.cats=CATS.map(c=>({...c}));
  if(!S.cats.some(c=>c.id==='other')) S.cats.push({...CATS[CATS.length-1]});
  CAT=Object.fromEntries(S.cats.map(c=>[c.id,c]));
}
syncCats();
if(!S.budgetMode) S.budgetMode= S.budget>0?'fixed':'open';
if(S.alert80===undefined) S.alert80=true;
if(!Number.isInteger(S.alertPct)||S.alertPct<10||S.alertPct>99) S.alertPct=80;
if(!S.alerted) S.alerted={};
if(!S.payday) S.payday=1;
if(S.remind===undefined) S.remind=true;
if(!Number.isInteger(S.remindAt)||S.remindAt<0||S.remindAt>=1440) S.remindAt=1380;
if(!Array.isArray(S.debts)) S.debts=[];
if(!Array.isArray(S.trash)) S.trash=[];
if(!Array.isArray(S.gams)) S.gams=[];
if(S.dueRemind===undefined) S.dueRemind=true;
if(!S.dueSeen) S.dueSeen={};
if(!S.profile) S.profile={name:'',age:null};
mbSyncName();
if(!Array.isArray(S.incomes)) S.incomes=[];
if(!Array.isArray(S.goals)) S.goals=[];
if(!S.saveTarget) S.saveTarget=0;
if(!Array.isArray(S.fixed)) S.fixed=[];
if(!Array.isArray(S.plans)) S.plans=[];
  if(!Array.isArray(S.iplans)) S.iplans=[];
  if(!Array.isArray(S.refunds)) S.refunds=[];
  if(!S.capCurBy||typeof S.capCurBy!=='object'||Array.isArray(S.capCurBy)) S.capCurBy={};
if(!Array.isArray(S.gold)) S.gold=[];
if(!S.ipFee||typeof S.ipFee!=='object') S.ipFee={};
if(!S.manRates||typeof S.manRates!=='object') S.manRates={};
if(typeof S.fbEmail!=='string') S.fbEmail='';
if(!S.goldPx||typeof S.goldPx!=='object') S.goldPx={};
if(!S.closedP||typeof S.closedP!=='object') S.closedP={};
if(!Array.isArray(S.accounts)) S.accounts=[];
if(!Array.isArray(S.transfers)) S.transfers=[];
if(!Array.isArray(S.bMoves)) S.bMoves=[];
/* ===== Language (round 51) =====
   S.lang: 'eg' العامية المصرية (the language the app is written in), 'ar' العربية الفصحى, 'en' English.
   No choice yet: Egyptian Arabic on an Arabic phone, English on any other.
   Translation happens when text reaches the screen: every text node, placeholder, aria-label and title is looked up in
   I18N[lang] (x = exact strings, p = [regex source, replacement] for strings with numbers or names inside).
   Anything not in the dictionary stays in Egyptian Arabic, so a missing entry never breaks a screen.
   [data-notr] keeps a subtree as it is (names of languages, the person's own words where it matters). */
if(!['eg','ar','en'].includes(S.lang)) delete S.lang;
const LANG_NAMES=Object.fromEntries(['eg','ar','en'].map(k=>[k,I18N[k].name]));
const LANG= S.lang || (/^ar\b/i.test(navigator.language||'')?'eg':'en');
/* The dictionary is its own <script> before this one. If it is ever missing or broken (on Android a script the page does not know is
   blocked), the app must still open: it just shows Egyptian Arabic. */

const I18D= LANG==='eg'? null : (()=>{ try{ const d=(typeof I18N!=='undefined'&&I18N[LANG])||{x:{},p:[]}; return {x:new Map(Object.entries(d.x||{})), p:(d.p||[]).map(([s,r])=>[new RegExp('^'+s+'$'),r]), sym:d.sym||null, symRe:d.sym?new RegExp('(?<![\\u0600-\\u06FF])('+Object.keys(d.sym).map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')(?![\\u0600-\\u06FF])','g'):null} }catch(e){ return null } })();
const HAS_AR=/[\u0600-\u06FF]/;
function dayCount(n,lang){return I18N[lang||LANG].days(+n)}
function trText(s){
  if(!I18D||!s||!HAS_AR.test(s)) return null;
  const k=s.replace(/\u200E/g,'').replace(/\s+/g,' ').trim();
  const dayMatch=k.match(/^فاضل (\d+) يوم$/); if(dayMatch) return dayCount(dayMatch[1],LANG);
  let v=trKey(k,0); // marks this code added earlier are dropped first, so the result is the same every time
  if(v!=null&&I18D.symRe) v=v.replace(I18D.symRe,m=>I18D.sym[m]||m); // a currency symbol inside a translated sentence: ج.م -> EGP
  if(v==null||v===k) return null;
  const lead=s.match(/^\s*/)[0], tail=s.match(/\s*$/)[0]; return lead+v+tail;
}
/* exact entry, else each « · » part on its own, else the first pattern that fits (its $n parts are translated again) */
function trKey(k,depth){
  if(depth>0&&isUserText(k))return null;
  let v=I18D.x.get(k); if(v!=null) return v;
  if(depth>4||!HAS_AR.test(k)) return null;
  if(k.includes(' · ')){ const ps=k.split(' · '), out=ps.map(p=>{const t=trKey(p,depth+1); return t===p?null:t}); if(out.some(x=>x!=null)) return ps.map((p,i)=>out[i]!=null?out[i]:p).join(LANG==='en'?' · \u200E':' · ') } // LRM: an Arabic name next to English text keeps its place
  for(const [re,r] of I18D.p){ const m=k.match(re); if(m){ const v=r.replace(/\$(\d)/g,(_,i)=>{ const g=m[+i]||''; const t=g&&g!==k?trKey(g,depth+1):null; return t!=null?t:g }); if(v!==k) return v } } // a pattern that changes nothing is no translation
  return null;
}
const TX=s=>trText(s)||s; // for text that never reaches the page as a node (document.title, share text...)
// User fields are not UI labels; protect exact matches in generated selectors and labels as well.
let userTextCache=null;
function isUserText(text){const k=String(text||'').trim();if(!k)return false;
  if(!userTextCache){const values=new Set(),add=x=>{if(typeof x==='string'&&x.trim())values.add(x.trim())};
    add(S.profile?.name);add(S.profile?.name?.trim().split(/\s+/)[0]);
    for(const list of [S.expenses,S.debts,S.accounts,S.inflows,S.gold,S.goals,S.gams,S.fixed,S.incomes,S.plans,S.iplans,S.insts,(S.trash||[]).map(t=>t&&t.d).filter(Boolean)])
      if(Array.isArray(list))for(const x of list)for(const p of ['person','name','src','party','byName'])add(x[p]);
    for(const c of S.cats||[])if(!CATS.some(d=>d.id===c.id&&d.name===c.name))add(c.name);
    userTextCache=values;
  }
  return userTextCache.has(k);
}
const TR_ATTRS=['placeholder','aria-label','title'];
function trNode(n){
  if(n.nodeType===3){ const p=n.parentNode; if(!p||p.nodeName==='SCRIPT'||p.nodeName==='STYLE'||(p.closest&&p.closest('[data-notr]'))) return;
    if(isUserText(n.nodeValue)&&!p.closest('button,label,#cats,.cat-name,.set-item,.nav,.kind-pill'))return; const v=trText(n.nodeValue); if(v!=null&&v!==n.nodeValue){ n.nodeValue=v } return }
  if(n.nodeType!==1||n.nodeName==='SCRIPT'||n.nodeName==='STYLE'||n.hasAttribute('data-notr')) return;
  if(n.closest('[data-notr]'))return;
  for(const a of TR_ATTRS){ const x=n.getAttribute(a); if(x){ const v=trText(x); if(v!=null&&v!==x) n.setAttribute(a,v) } }
  for(let c=n.firstChild;c;c=c.nextSibling) trNode(c);
}
if(LANG!=='eg'){
  document.documentElement.lang= LANG==='en'?'en':'ar';
  if(LANG==='en'){ document.documentElement.dir='ltr'; document.querySelectorAll('input[dir="rtl"],textarea[dir="rtl"]').forEach(e=>e.dir='auto') }
  if(I18D){ trNode(document.body); document.title=TX(document.title);
    new MutationObserver(ms=>{ for(const m of ms){
      if(m.type==='characterData') trNode(m.target);
      else if(m.type==='attributes'){ const x=m.target.getAttribute(m.attributeName); const v=x&&!(m.target.closest&&m.target.closest('[data-notr]'))&&trText(x); if(v&&v!==x) m.target.setAttribute(m.attributeName,v) }
      else m.addedNodes.forEach(trNode) } })
      .observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:TR_ATTRS});
  }
}
/* «الإعدادات ← اللغة» (round 52): the three languages side by side; picking one shows a sample of the home screen in it,
   with the person's own name, budget and days left, and nothing changes until «حفظ». */
let langSel=null;
const LANG_UI=Object.fromEntries(['eg','ar','en'].map(k=>[k,I18N[k].ui]));
function langPaint(sel){
  langSel=sel; const U=LANG_UI[sel];
  $('#langSeg').innerHTML=['eg','ar','en'].map(k=>`<button type="button" role="radio" aria-checked="${k===sel}" data-lang="${k}" dir="${LANG_UI[k].dir}"><b>${LANG_UI[k].t}</b><small>${LANG_UI[k].s}</small></button>`).join('');
  // a sample built from his own numbers (falls back to round figures if anything is missing)
  let name='', B=0, sp=0, days=0, fixed=false;
  try{ name=((S.profile&&S.profile.name)||'').trim().split(/\s+/)[0]||''; const P=periodOf(Date.now()); fixed=S.budgetMode==='fixed'&&S.budget>0; B=fixed?budOf(P):0; sp=budgetSpent(P); days=daysLeft(P) }catch(e){ B=10000; sp=2500; days=20; fixed=true }
  const cur= sel==='en'? S.currency : CS(), h=new Date().getHours(), month=new Date().toLocaleDateString(U.loc,{month:'long'});
  const daily=fixed?fmt(dailyAllowance(B-sp,periodOf(Date.now())).per):'';
  const periodTitle=S.payType==='weekly'?(sel==='en'?'Weekly budget':sel==='ar'?'ميزانية الأسبوع':'ميزانية الأسبوع'):S.payType==='biweekly'?(sel==='en'?'Two-week budget':'ميزانية الأسبوعين'):U.bud(month);
  const el=$('#langDemo'); el.dir=U.dir; el.lang= sel==='en'?'en':'ar';
  el.innerHTML=`<div class="ld-cap">${esc(U.cap)}</div>
    <div class="ld-greet">${esc(U.hi[h>=5&&h<12?0:1])}${name?esc(U.ya(name)):''}</div>
    <div class="ld-bud"><span>${esc(fixed?periodTitle:U.month)}</span><b>${fmt(fixed?B:sp)} <small>${esc(cur)}</small></b></div>
    ${fixed?`<div class="ld-row"><span>${esc(U.spent)} ${fmt(sp)} ${esc(cur)}</span><span>${esc(U.left(days))}</span></div><div class="ld-tip">${esc(U.tip(daily,cur))}</div>`:''}
    <div class="ld-btns"><span class="ld-btn">${esc(U.add)}</span><span class="ld-chip">${esc(U.set)}</span></div>`;
  const n=$('#langNote'); n.dir=U.dir; n.textContent=U.note;
  const b=$('#langSave'); b.dir=U.dir; b.disabled= sel===LANG; b.textContent= sel===LANG? LANG_UI[LANG].cur : U.save;
}
document.getElementById('langSeg').onclick=e=>{ const b=e.target.closest('[data-lang]'); if(b) langPaint(b.dataset.lang) };
document.getElementById('langSave').onclick=()=>{ if(!langSel||langSel===LANG) return;
  S.lang=langSel; save(); try{ sessionStorage.setItem('maleem.picked','1'); sessionStorage.setItem('maleem.unlock',ME.id) }catch(x){} // same as switching members: no lock screen, he was already in
  location.reload() };
if(!Array.isArray(S.insts)) S.insts=[];
if(!Array.isArray(S.inflows)) S.inflows=[];
if(!['monthly','weekly','biweekly','variable'].includes(S.payType)) S.payType='monthly';
if(typeof S.payAnchor!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(S.payAnchor)) S.payAnchor='';
if(!Array.isArray(S.instPays)) S.instPays=[];
if(!['off','sum','split'].includes(S.moneyView)) S.moneyView='sum';
if(typeof S.lastAcc!=='string') S.lastAcc='';
if(!S.homeHide||typeof S.homeHide!=='object') S.homeHide={};
S.fabPin=S.fabPin===true;
if(!Number.isInteger(S.autoBkDays)||S.autoBkDays<0||S.autoBkDays>30) S.autoBkDays=7;
/* Google Drive backup (per member, this phone only: not part of the backup file) */
if(!(S.drive&&typeof S.drive==='object'&&typeof S.drive.email==='string'&&S.drive.email)) S.drive=null;
if(!['drive','both'].includes(S.autoBkTo)) S.autoBkTo='both';
if(!Number.isInteger(S.driveFails)||S.driveFails<0) S.driveFails=0;
if(typeof S.sumOn!=='boolean') S.sumOn=true; // monthly summary (card + notification) // automatic local backup every N days (0 = off)
delete S.backupRemind; delete S.backupSnooze;
const PAYS=[{id:'cash',name:'كاش',e:'💵'},{id:'card',name:'فيزا',e:'💳'},{id:'instapay',name:'إنستاباي',e:'📲'},{id:'wallet',name:'محفظة موبايل',e:'👛'}];
if(!Array.isArray(S.pays)||!S.pays.length) S.pays=PAYS.map(x=>({...x}));
if(!S.pays.some(x=>x.id==='cash')) S.pays.unshift({...PAYS[0]});
let PAY={}; const syncPays=()=>{PAY=Object.fromEntries(S.pays.map(x=>[x.id,x])); if(!PAY[S.lastPay]) S.lastPay='cash'}; syncPays();
const payOf=x=>PAY[x.pay]?x.pay:'cash';
if(!S.fixedLog||typeof S.fixedLog!=='object') S.fixedLog={};
if(!S.currency) S.currency='EGP';
const CURRENCIES=[{id:'EGP',s:'ج.م',n:'جنيه مصري'},{id:'SAR',s:'ر.س',n:'ريال سعودي'},{id:'AED',s:'د.إ',n:'درهم إماراتي'},{id:'KWD',s:'د.ك',n:'دينار كويتي'},{id:'QAR',s:'ر.ق',n:'ريال قطري'},{id:'BHD',s:'د.ب',n:'دينار بحريني'},{id:'OMR',s:'ر.ع',n:'ريال عماني'},{id:'JOD',s:'د.أ',n:'دينار أردني'},{id:'DZD',s:'د.ج',n:'دينار جزائري'},{id:'SDG',s:'ج.س',n:'جنيه سوداني'},{id:'USD',s:'$',n:'دولار أمريكي'},{id:'EUR',s:'€',n:'يورو'},{id:'GBP',s:'£',n:'جنيه إسترليني'},{id:'ILS',s:'₪',n:'شيكل'}];
const CS=()=>(CURRENCIES.find(c=>c.id===S.currency)||CURRENCIES[0]).s;
/* Currencies the person adds himself (Settings ▸ بياناتي ▸ عملة تانية): any currency that has a rate in rates.json, so the conversion is real.
   They live in S.curs (codes only) and are pushed into CURRENCIES, so every screen, account and backup sees them like the built-in ones. */
const CUR_BASE=new Set(CURRENCIES.map(c=>c.id)), CUR_MAX_CUSTOM=8;
const CUR_SKIP=new Set(['XAU','XAG','XPT','XPD','XDR','XTS','XXX','XBA','XBB','XBC','XBD','XSU','XUA']);
let CUR_DN=null; try{CUR_DN={ar:new Intl.DisplayNames(['ar'],{type:'currency'}),en:new Intl.DisplayNames(['en'],{type:'currency'})}}catch(e){}
const curNameAr=c=>{try{const n=CUR_DN&&CUR_DN.ar.of(c); return n&&n!==c?n:c}catch(e){return c}};
const curNameEn=c=>{try{const n=CUR_DN&&CUR_DN.en.of(c); return n&&n!==c?n:c}catch(e){return c}};
function curAddCustom(c){ if(!/^[A-Z]{3}$/.test(c)||CURRENCIES.some(x=>x.id===c)) return false; CURRENCIES.push({id:c,s:c,n:curNameAr(c),x:1}); return true }
function curMerge(list){
  const cur=(Array.isArray(S.curs)?S.curs:[]).filter(c=>typeof c==='string'&&/^[A-Z]{3}$/.test(c)&&!CUR_BASE.has(c));
  (Array.isArray(list)?list:[]).forEach(c=>{ if(typeof c==='string'&&/^[A-Z]{3}$/.test(c)&&!CUR_BASE.has(c)&&!cur.includes(c)&&cur.length<CUR_MAX_CUSTOM) cur.push(c) });
  S.curs=cur.slice(0,CUR_MAX_CUSTOM); S.curs.forEach(curAddCustom);
}
if(!S.since) S.since=Date.now();

const $ = s=>document.querySelector(s);
const esc = s=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const cleanE=v=>String(v==null?'':v).replace(/[<>&"'`\\]/g,'').slice(0,8);
const colr=v=>/^#[0-9a-fA-F]{6}$/.test(String(v))?String(v):'#64748B';
const fmt = n=>(Math.round(n*100)/100).toLocaleString('en-US',{maximumFractionDigits:2});
const money = n=>`<span class="num">${fmt(n)}</span>`;
const pad = n=>String(n).padStart(2,'0');
const dayKey = d=>{d=new Date(d);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};
const monKey = d=>{d=new Date(d);return `${d.getFullYear()}-${pad(d.getMonth()+1)}`};
const LOC= LANG==='en'?'en-GB':'ar-EG-u-nu-latn'; // dates and times follow the language (round 51)
const monthName = mk=>{const [y,m]=mk.split('-').map(Number);return new Date(y,m-1,1).toLocaleDateString(LOC,{month:'long',year:'numeric'})};
const monthOnly = mk=>{const [y,m]=mk.split('-').map(Number);return new Date(y,m-1,1).toLocaleDateString(LOC,{month:'long'})};
const dayName = dk=>{const [y,m,d]=dk.split('-').map(Number);const dt=new Date(y,m-1,d);
  const t=dayKey(Date.now()), yst=dayKey(Date.now()-864e5);
  const base=dt.toLocaleDateString(LOC,{weekday:'long',day:'numeric',month:'long'});
  return dk===t?'النهارده · '+base: dk===yst?'امبارح · '+base: base};
const timeStr = ts=>new Date(ts).toLocaleTimeString(LOC,{hour:'numeric',minute:'2-digit'});
const daysIn = mk=>{const [y,m]=mk.split('-').map(Number);return new Date(y,m,0).getDate()};
const nextMonth = mk=>{const [y,m]=mk.split('-').map(Number);return monKey(new Date(y,m,1))};
const ofMonth = mk=>S.expenses.filter(x=>monKey(x.ts)===mk);
const sum = arr=>r2(arr.reduce((a,x)=>a+x.amount,0)); // cents never drift: 0.1+0.2 is 0.3 here
const byCat = arr=>{const o={};arr.forEach(x=>{o[x.cat]=(o[x.cat]||0)+x.amount});Object.keys(o).forEach(k=>{o[k]=r2(o[k])});return o};
const uid = ()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);

/* ===== Data validation =====
   Everything that comes from storage, a backup file or the shared space passes through these cleaners,
   so a broken or hostile record can't inject HTML or crash the screens. Each cleaner is idempotent. */
const isId=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(v);
const idOr=v=>{v=v==null?'':String(v);return isId(v)?v:uid()};
const numIn=(v,min,max,d)=>{v=+v;return Number.isFinite(v)&&v>=min&&v<=max?v:d};
const intIn=(v,min,max,d)=>{v=+v;return Number.isInteger(v)&&v>=min&&v<=max?v:d};
const str=(v,max)=>(v==null?'':String(v)).slice(0,max);
const isDK=v=>{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const [y,m,d]=v.split('-').map(Number);if(y<1||m<1||m>12||d<1)return false;const t=new Date(0);t.setUTCFullYear(y,m-1,d);return t.getUTCFullYear()===y&&t.getUTCMonth()===m-1&&t.getUTCDate()===d};
const isMK=v=>typeof v==='string'&&/^\d{4}-\d{2}$/.test(v)&&isDK(v+'-01');
const isPhoto=v=>typeof v==='string'&&v.length<600000&&/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/]+=*$/.test(v);
const MAXAMT=1e10, MAXTS=9e15;
const r2=n=>Math.round(n*100)/100;
function cleanOwner(o,x){if(x&&isId(x.by)){o.by=x.by;o.byName=str(x.byName,40)}return o}
function cleanExpense(x,keepSpace){
  if(!x||typeof x!=='object') return null;
  const amount=+x.amount, ts=+x.ts; if(!(amount>0&&amount<MAXAMT)||!(ts>=0&&ts<MAXTS)) return null;
  const e={id:idOr(x.id),amount:r2(amount),cat:isId(x.cat)?x.cat:'other',note:str(x.note,200),ts};
  if(isId(x.pay)) e.pay=x.pay; if(isId(x.fx)) e.fx=x.fx;
  if(x.fund==='free') e.fund='free';
  /* acc = the account it was paid from; accAmt = what left that account, in THAT account's currency (it never changes when the app currency does) */
  if(isId(x.acc)){const aa=+x.accAmt; if(aa>0&&aa<MAXAMT){e.acc=x.acc;e.accAmt=r2(aa)}}
  if(isId(x.inst)) e.inst=x.inst; // the installment this expense paid
  /* o = the amount and currency this expense was first written in (kept when the currency is changed, so a shared
     expense keeps showing the same value to the other members; p = still waiting for an exchange rate) */
  if(x.o&&typeof x.o==='object'){const oa=+x.o.a; if(oa>0&&oa<MAXAMT&&typeof x.o.c==='string'&&CURRENCIES.some(c=>c.id===x.o.c)){e.o={a:oa,c:x.o.c}; if(x.o.p===true) e.o.p=true}}
  cleanOwner(e,x);
  if(keepSpace){ if(isId(x.sp)) e.sp=x.sp; if(x.legacyReadOnly===true) e.legacyReadOnly=true }
  return e;
}
function cleanDebt(x,legacyCurrency){
  if(!x||typeof x!=='object') return null;
  const amount=numIn(x.amount,0.01,MAXAMT,0); if(!amount) return null;
  const pays=(Array.isArray(x.payments)?x.payments:[]).map((p,i)=>p&&typeof p==='object'&&+p.amount>0&&+p.amount<MAXAMT?
    {id:isId(p.id)?p.id:'p'+i+'_'+Math.round(numIn(p.ts,0,MAXTS,0)).toString(36),amount:r2(+p.amount),ts:numIn(p.ts,0,MAXTS,0),...(isId(p.acc)&&+p.accAmt>0&&+p.accAmt<MAXAMT?{acc:p.acc,accAmt:r2(+p.accAmt)}:{})}:null).filter(Boolean);
  /* extra amounts added to the same debt later: [{id,amount,ts,note}] */
  const adds=(Array.isArray(x.adds)?x.adds:[]).map((a,i)=>a&&typeof a==='object'&&+a.amount>0&&+a.amount<MAXAMT?
    {id:isId(a.id)?a.id:'a'+i+'_'+Math.round(numIn(a.ts,0,MAXTS,0)).toString(36),amount:r2(+a.amount),ts:numIn(a.ts,0,MAXTS,0),note:str(a.note,60),...(isId(a.acc)&&+a.accAmt>0&&+a.accAmt<MAXAMT?{acc:a.acc,accAmt:r2(+a.accAmt)}:{})}:null).filter(Boolean).slice(0,500);
  const closed=x.closed===true;
  return cleanOwner({id:idOr(x.id),dir:x.dir==='out'?'out':'in',person:str(x.person,60).trim()||'؟',amount:r2(amount),cur:CURRENCIES.some(c=>c.id===x.cur)?x.cur:(CURRENCIES.some(c=>c.id===legacyCurrency)?legacyCurrency:(CURRENCIES.some(c=>c.id===S.currency)?S.currency:'EGP')),due:isDK(x.due)?x.due:null,
    note:str(x.note,200),created:numIn(x.created,0,MAXTS,0),...(isId(x.acc)&&+x.accAmt>0&&+x.accAmt<MAXAMT?{acc:x.acc,accAmt:r2(+x.accAmt)}:{}),payments:pays,adds,closed,closedAt:closed&&+x.closedAt>0&&+x.closedAt<MAXTS?+x.closedAt:null},x);
}
function cleanGam(g){
  if(!g||typeof g!=='object') return null;
  const inst=numIn(g.inst,0.01,MAXAMT,0); if(!inst) return null;
  const members=intIn(g.members,2,60,10), paid={};
  /* one person can be in the gam'eya with several shares: turns = the month number of each share's payout (1 share = 1 turn),
     recvT = which of those payouts were already received. Old records only have turn/received and still work. */
  let turns=[...new Set((Array.isArray(g.turns)?g.turns:[]).map(Number).filter(n=>Number.isInteger(n)&&n>=1&&n<=members))].slice(0,5).sort((a,b)=>a-b);
  if(!turns.length) turns=[intIn(g.turn,1,members,1)];
  let recvT=null; if(g.recvT&&typeof g.recvT==='object'){recvT={}; turns.forEach(t=>{const r=g.recvT[t]; if(r&&typeof r==='object') recvT[t]={ts:numIn(r.ts,0,MAXTS,0)}})}
  if(g.paid&&typeof g.paid==='object') Object.keys(g.paid).forEach(k=>{const r=g.paid[k];
    if(isMK(k)&&r&&typeof r==='object'){const o={ts:numIn(r.ts,0,MAXTS,0)}; if(isId(r.exp)) o.exp=r.exp; paid[k]=o}});
  return cleanOwner({id:idOr(g.id),name:str(g.name,60).trim()||'جمعية',inst:r2(inst),members,start:isMK(g.start)?g.start:monKey(Date.now()),
    day:intIn(g.day,1,31,1),turn:turns[0],turns,asExp:g.asExp!==false,paid,received:recvT?turns.every(t=>recvT[t]):g.received===true,...(recvT?{recvT}:{}),created:numIn(g.created,0,MAXTS,0)},g);
}
function cleanIncome(x){
  if(!x||typeof x!=='object') return null;
  return cleanOwner({id:idOr(x.id),name:str(x.name,60).trim()||'دخل',amount:r2(numIn(x.amount,0,MAXAMT,0))},x);
}
function cleanGoal(g){
  if(!g||typeof g!=='object') return null;
  const target=numIn(g.target,0.01,MAXAMT,0); if(!target) return null;
  return cleanOwner({id:idOr(g.id),name:str(g.name,60).trim()||'هدف',target:r2(target),saved:r2(numIn(g.saved,0,MAXAMT,0)),e:cleanE(g.e)||'🎯',created:numIn(g.created,0,MAXTS,0)},g);
}
function cleanFixed(f){
  if(!f||typeof f!=='object') return null;
  const o={id:idOr(f.id),name:str(f.name,60).trim()||'مصروف ثابت',cat:isId(f.cat)?f.cat:'other',amount:r2(numIn(f.amount,0,MAXAMT,0)),day:intIn(f.day,1,31,1),created:numIn(f.created,0,MAXTS,0)};
  o.everyMonths=intIn(f.everyMonths,1,120,1);
  if(isMK(f.from)) o.from=f.from;
  else if(o.everyMonths>1) o.from=monKey(o.created||Date.now());
  if(f.repeat==='daily'||f.repeat==='weekly')o.repeat=f.repeat;
  if(isDK(f.startDate))o.startDate=f.startDate;
  if(isDK(f.endDate)&&(!o.startDate||f.endDate>=o.startDate))o.endDate=f.endDate;
  if(f.paused===true)o.paused=true;
  return cleanOwner(o,f);
}
/* planned one-time expenses: something to pay on a given day (not repeated). Personal: never shared in a space. */
function cleanPlan(p){
  if(!p||typeof p!=='object'||!isDK(p.due)) return null;
  return {id:idOr(p.id),name:str(p.name,60).trim()||'مصروف جاي',cat:isId(p.cat)?p.cat:'other',amount:r2(numIn(p.amount,0,MAXAMT,0)),due:p.due,created:numIn(p.created,0,MAXTS,0)};
}
/* an income you expect on a day (one time): reminds you, then «استلمت» opens the income sheet filled in */
function cleanIplan(p){
  if(!p||typeof p!=='object'||!isDK(p.due)) return null;
  return {id:idOr(p.id),name:str(p.name,60).trim()||'دخل جاي',amount:r2(numIn(p.amount,0,MAXAMT,0)),due:p.due,created:numIn(p.created,0,MAXTS,0)};
}
/* a log of every «رجعتلي منها فلوس»: what came back, when, and where (the expense itself just gets smaller or goes away) */
function cleanRefund(x){
  if(!x||typeof x!=='object') return null; const amount=r2(numIn(x.amount,0,MAXAMT,0)), ts=+x.ts; if(!(amount>0)||!(ts>=0&&ts<MAXTS)) return null;
  return {id:idOr(x.id),ts,amount,cat:isId(x.cat)?x.cat:'other',note:str(x.note,80),full:x.full===true,acc:isId(x.acc)?x.acc:'',accName:str(x.accName,40)};
}
const FXLOG_KEY=/^[A-Za-z0-9_-]{1,64}:\d{4}-\d{2}(?:-\d{2})?$/;
function cleanFixedLog(l){const o={}; if(l&&typeof l==='object') Object.keys(l).forEach(k=>{if(FXLOG_KEY.test(k)&&(l[k]==='done'||l[k]==='skip')) o[k]=l[k]}); return o}
function cleanCat(c){if(!(c&&isId(c.id))) return null; const o={id:c.id,name:str(c.name,30).trim()||'فئة',e:cleanE(c.e)||'📦',c:colr(c.c)}; const l=+c.lim; if(l>0&&l<1e9) o.lim=Math.round(l*100)/100; return o}
/* Accounts (bank / wallet / cash). Only the last 4 digits of a card are ever kept: never the full number, never the CVV. */
const ACC_TYPES={bank:{n:'حساب بنكي',e:'🏦'},wallet:{n:'محفظة إلكترونية',e:'👛'},cash:{n:'كاش',e:'💵'}};
function cleanAcc(x){
  if(!x||typeof x!=='object'||!isId(x.id)) return null;
  const type=ACC_TYPES[x.type]?x.type:'bank', open=+x.open;
  return {id:x.id,name:str(x.name,40).trim()||'حساب',type,bank:type==='cash'?'':str(x.bank,40).trim(),
    cur:CURRENCIES.some(c=>c.id===x.cur)?x.cur:'EGP',open:Number.isFinite(open)&&Math.abs(open)<MAXAMT?r2(open):0,
    last4:type==='bank'&&/^\d{4}$/.test(String(x.last4||''))?String(x.last4):'',
    phone:type==='wallet'?str(x.phone,16).replace(/[^\d+]/g,''):'',ts:numIn(x.ts,0,MAXTS,0),...(+x.low>0&&+x.low<MAXAMT?{low:r2(+x.low)}:{}),
    ...(type==='cash'&&(x.sav===true||x.sav===undefined&&str(x.name,40).trim()==='مدخرات سابقة')?{sav:true}:{})}; // «مدخراتي»: savings from before Maleem, shown in their own card

}
/* a move of money between two of my own accounts: not an expense and not income. out/fee are in the "from" currency, in is in the "to" currency */
function cleanTr(x){
  if(!x||typeof x!=='object'||!isId(x.id)||!isId(x.from)||!isId(x.to)||x.from===x.to) return null;
  const out=+x.out, inn=+x.in, ts=+x.ts; if(!(out>0&&out<MAXAMT)||!(inn>0&&inn<MAXAMT)||!(ts>0&&ts<MAXTS)) return null;
  const t={id:x.id,ts,from:x.from,to:x.to,out:r2(out),in:r2(inn),fee:r2(numIn(x.fee,0,MAXAMT,0)),note:str(x.note,80)};
  const rate=+x.rate; if(rate>0&&rate<1e9&&Number.isFinite(rate)) t.rate=rate;
  if(x.rs==='a'||x.rs==='m') t.rs=x.rs;
  return t;
}
/* Money moved into or out of the budget of ONE period (round 48). The budget itself (S.budget) never changes: the period that the move
   belongs to (pk = the period's key) gets more or less to spend, and the next period starts again from S.budget. When money really moved
   between two accounts, tr points at that transfer (it is never an expense or income); without tr the money stayed where it was. */
function cleanBMove(x){
  if(!x||typeof x!=='object'||!isId(x.id)||!/^\d{4}-\d{2}-\d{2}$/.test(String(x.pk))) return null;
  const amt=+x.amt; if(!(amt>0&&amt<MAXAMT)) return null;
  return {id:x.id,ts:numIn(x.ts,0,MAXTS,0),pk:String(x.pk),amt:r2(amt),dir:x.dir==='out'?'out':'in',acc:isId(x.acc)?x.acc:'',...(isId(x.tr)?{tr:x.tr}:{})};
}
/* what one period really has to spend: the budget + what was moved in - what was moved out, for that period only */
function budOf(P){ const k=P&&P.key; let b=+S.budget||0; (S.bMoves||[]).forEach(m=>{ if(m.pk===k) b+= m.dir==='in'?m.amt:-m.amt }); (S.inflows||[]).forEach(x=>{if(x.fund==='period'&&(x.fundPk||periodOf(x.ts).key)===k)b+=x.amount}); return r2(Math.max(0,b)) }
/* Funding is personal metadata; account balances and report totals still include every transaction once. */
function budgetExpenses(P){return ofPeriod(P).filter(e=>e.fund!=='free')}
function budgetSpent(P){return sum(budgetExpenses(P))}
function freeIncomeBalance(skipExpense,skipIncome){
  const income=r2((S.inflows||[]).filter(x=>x.id!==skipIncome&&x.fund==='free').reduce((a,x)=>a+x.amount,0));
  const spent=r2((S.expenses||[]).filter(x=>x.id!==skipExpense&&x.fund==='free').reduce((a,x)=>a+x.amount,0));
  return r2(income-spent);
}
function freeIncomeActive(){return S.inflows.some(x=>x.fund==='free')||S.expenses.some(e=>e.fund==='free')}
function incomeFundLabel(x){return TX(x.fund==='free'?'دخل حر':x.fund==='period'?'زيادة للفترة دي بس':x.fund==='permanent'?'زيادة دائمة للميزانية':'مرتب محسوب أصلًا في الميزانية')}
function incomeChangeError(old,next){
  const available=freeIncomeBalance(null,old&&old.id)+(next&&next.fund==='free'?next.amount:0);
  if(available < -EPS && available < freeIncomeBalance()-EPS)return TX('الدخل الحر اتصرف منه؛ عدّل مصدر المصاريف الأول قبل تقليل الدخل أو نقله.');
  const b=r2(S.budget-(old&&old.fund==='permanent'?old.amount:0)+(next&&next.fund==='permanent'?next.amount:0));
  if(b<0||b>=MAXAMT)return TX('التعديل ده هيخلي الميزانية الأساسية غير صالحة. راجع مبلغ الميزانية الأول.');
  return '';
}
function changeIncome(old,next){
  S.budget=r2(S.budget-(old&&old.fund==='permanent'?old.amount:0)+(next&&next.fund==='permanent'?next.amount:0));
  const i=old?S.inflows.findIndex(x=>x.id===old.id):-1;
  if(i>=0){if(next)S.inflows[i]=next;else S.inflows.splice(i,1)}else if(next)S.inflows.push(next);
}
function paintExpenseFund(){
  const field=$('#expenseFund'), edited=editId&&S.expenses.find(e=>e.id===editId);
  const available=freeIncomeBalance(), visible=available>EPS;
  $('#fundPill').hidden=!visible;
  if(!visible)closeFundMenu();
  if(!visible&&!edited)field.value='budget';
  $('#fundPillText').textContent=TX(field.value==='free'?'دخل حر':'المرتب');
  field.setAttribute('aria-description',TX('المتاح من الدخل الحر')+': '+fmt(available)+' '+CS());
  $('#sheet .sheet-head').classList.toggle('has-fund',visible);
}
function paintIncomeFund(){
  const add=$('#incomeFund').value==='add', mode=$('#incomeScope').value;
  $('#incomeScopeRow').hidden=!add;
  $('#incomeFundingOptions').classList.toggle('has-scope',add);
  $('#incomeFundHint').textContent=TX(!add?($('#incomeFund').value==='free'?'يفضل رصيد مستقل وتختار تصرف منه وقت تسجيل المصروف.':'تسجيل استلام فقط؛ الميزانية مش هتزيد.'):
    mode==='period'?'الزيادة لفترة تاريخ الاستلام بس؛ الفترة الجاية ترجع للميزانية الأساسية.':'الميزانية الأساسية هتزيد للمستقبل حتى لو الدخل مجاش تاني. تعديل أو حذف الدخل ده يعكس زيادته.');
}
/* Installments: a plan has a list of installments (each with its own amount and due day). What was paid is NOT stored on the plan:
   it is always counted from the expenses that point at the installment (e.inst) plus S.instPays (payments for a purchase that was already recorded as an expense) */
function cleanInst(x){
  if(!x||typeof x!=='object'||!isId(x.id)) return null;
  const items=(Array.isArray(x.items)?x.items:[]).map(it=>{
    if(!it||typeof it!=='object'||!isId(it.id)) return null; const a=+it.amount;
    return a>0&&a<MAXAMT&&/^\d{4}-\d{2}-\d{2}$/.test(String(it.due))?{id:it.id,amount:r2(a),due:String(it.due)}:null}).filter(Boolean).slice(0,120);
  return items.length?{id:x.id,name:str(x.name,60).trim()||'تقسيط',party:str(x.party,40).trim(),rec:x.rec===true,items,created:numIn(x.created,0,MAXTS,0)}:null;
}
/* money that really came in (a salary, a weekly pay, a gig). Not the same as "income sources", which are only what is expected */
function cleanInflow(x){
  if(!x||typeof x!=='object'||!isId(x.id)) return null;
  const a=+x.amount, ts=+x.ts; if(!(a>0&&a<MAXAMT)||!(ts>0&&ts<MAXTS)) return null;
  const o={id:x.id,amount:r2(a),ts,src:str(x.src,40).trim(),note:str(x.note,80)};
  if(['free','salary','period','permanent'].includes(x.fund)) o.fund=x.fund;
  if(o.fund==='period'&&isDK(x.fundPk)) o.fundPk=x.fundPk;
  if(isId(x.acc)){const aa=+x.accAmt; if(aa>0&&aa<MAXAMT){o.acc=x.acc;o.accAmt=r2(aa)}}
  if(x.alloc&&typeof x.alloc==='object'){const al={spend:numIn(x.alloc.spend,0,MAXAMT,0),bills:numIn(x.alloc.bills,0,MAXAMT,0),save:numIn(x.alloc.save,0,MAXAMT,0)}; if(al.spend+al.bills+al.save>0) o.alloc={spend:r2(al.spend),bills:r2(al.bills),save:r2(al.save)}}
  return o;
}
/* gold you bought: {id,ts,k,qty,price,note,acc?,accAmt?,sold?:{ts,price,acc?,accAmt?}}. qty = grams (coins: a count), price = what you paid in total */
const GOLD_KS=['21','24','18','coin'];
function cleanGold(x){
  if(!x||typeof x!=='object'||!isId(x.id)) return null;
  const q=+x.qty, p=+x.price, ts=+x.ts;
  if(!(q>0&&q<=100000)||!(p>0&&p<MAXAMT)||!(ts>0&&ts<MAXTS)) return null;
  const o={id:x.id,k:GOLD_KS.includes(x.k)?x.k:'21',qty:Math.round(q*1000)/1000,price:r2(p),ts,note:str(x.note,80)};
  if(isId(x.acc)){const aa=+x.accAmt; if(aa>0&&aa<MAXAMT){o.acc=x.acc;o.accAmt=r2(aa)}}
  if(x.sold&&typeof x.sold==='object'){const sp=+x.sold.price, st=+x.sold.ts;
    if(sp>0&&sp<MAXAMT&&st>0&&st<MAXTS){o.sold={ts:st,price:r2(sp)}; if(isId(x.sold.acc)){const aa=+x.sold.accAmt; if(aa>0&&aa<MAXAMT){o.sold.acc=x.sold.acc;o.sold.accAmt=r2(aa)}}}}
  return o;
}
/* a dollar rate the person typed for a currency that has no published rate: {CODE:{r,ts}}, r = how many CODE are 1 USD */
function cleanManRates(v){
  const o={}; if(v&&typeof v==='object') Object.keys(v).slice(0,40).forEach(k=>{ const x=v[k], r=x&&+x.r;
    if(/^[A-Z]{3}$/.test(k)&&r>0&&r<1e12&&Number.isFinite(r)) o[k]={r:Math.round(r*1e6)/1e6,ts:numIn(x.ts,0,MAXTS,0)} });
  return o;
}
/* InstaPay fee the person asked us to suggest on outgoing InstaPay captures: pct % of the amount, never below min nor above max.
   The numbers are theirs to edit (banks and the central bank change them), so nothing here is treated as a fixed truth. */
function cleanIpFee(v){
  v=v&&typeof v==='object'?v:{}; const pct=Math.round(numIn(v.pct,0,5,0.1)*1000)/1000, min=r2(numIn(v.min,0,1000,0.5)); let max=r2(numIn(v.max,0,10000,20)); if(max<min) max=min;
  return {on:v.on===true,pct,min,max};
}
/* today's price per gram (per coin for coins), typed by the person: nothing is fetched from anywhere */
function cleanGoldPx(v){ const o={}; if(v&&typeof v==='object'){ GOLD_KS.forEach(k=>{const n=+v[k]; if(n>0&&n<MAXAMT) o[k]=r2(n)}); const t=+v.ts; if(t>0&&t<MAXTS) o.ts=t } return o }
function cleanInstPay(x){
  if(!x||typeof x!=='object'||!isId(x.id)||!isId(x.item)) return null;
  const a=+x.amount, ts=+x.ts; if(!(a>0&&a<MAXAMT)||!(ts>0&&ts<MAXTS)) return null;
  const o={id:x.id,item:x.item,amount:r2(a),ts};
  if(isId(x.acc)){const aa=+x.accAmt; if(aa>0&&aa<MAXAMT){o.acc=x.acc;o.accAmt=r2(aa)}}
  return o;
}
function cleanPay(x){return x&&isId(x.id)?{id:x.id,name:str(x.name,30).trim()||'طريقة دفع',e:cleanE(x.e)||'💵'}:null}
/* a payment captured from a bank / wallet notification, waiting for the user to confirm it */
function cleanCap(x){
  if(!x||typeof x!=='object'||!isId(x.id)) return null;
  const amount=+x.amount, at=+x.at; if(!(amount>0&&amount<MAXAMT)||!(at>0&&at<MAXTS)) return null;
  return {id:x.id,at,amount:r2(amount),cur:str(x.cur,8),merchant:str(x.merchant,40).trim(),method:['card','wallet','instapay'].includes(x.method)?x.method:'',dir:x.dir==='in'?'in':'out',
    source:str(x.source,40).trim(),pkg:typeof x.pkg==='string'&&/^[A-Za-z0-9_.]{1,200}$/.test(x.pkg)?x.pkg:'',text:str(x.text,300)};
}
/* the currency of every operation captured from one app (package name -> currency id), for senders whose messages carry no usable currency */
function cleanCapCur(v){const o={}; if(v&&typeof v==='object'&&!Array.isArray(v)) Object.keys(v).slice(0,60).forEach(k=>{ if(/^[A-Za-z0-9_.]{1,200}$/.test(k)&&typeof v[k]==='string'&&CURRENCIES.some(c=>c.id===v[k])) o[k]=v[k] }); return o}
function cleanProfile(p){p=p&&typeof p==='object'?p:{}; return {name:str(p.name,60),age:intIn(p.age,5,120,null),photo:isPhoto(p.photo)?p.photo:null}}
/* ===== Exchange rates =====
   rates.json (base USD) is refreshed daily by a GitHub workflow and read by Kotlin (Rates.kt), which keeps the last good copy.
   rateFor(a,b) = how many b one a is worth (0 = no rate yet). */
const RT={data:null,at:0,tried:false,busy:false,waiters:[],err:'',why:''}; // err: why the last refresh gave nothing ('net' | 'http' | 'bad' | 'big' | '')
function ratesLoad(j){
  try{const o=typeof j==='string'?JSON.parse(j):j, d=o&&o.data;
    if(d&&d.base==='USD'&&d.rates&&typeof d.rates==='object'&&+d.updated>0){RT.data={updated:+d.updated,rates:d.rates};RT.at=+o.checkedAt||0;return true}}catch(e){}
  return false;
}
function rateFor(from,to){
  if(from===to) return 1;
  if(!RT.tried){RT.tried=true; if(AB&&AB.ratesState){try{ratesLoad(AB.ratesState())}catch(e){}}}
  const a=usdRate(from), b=usdRate(to); return a>0&&b>0?b/a:0;
}
/* how many [c] are 1 USD: the published rate, else the one the person typed, else 0 (never a guess) */
function manRate(c){ const m=S.manRates&&S.manRates[c]; return m&&m.r>0?m.r:0 }
function usdRate(c){
  if(c==='USD') return 1;
  if(!RT.tried){RT.tried=true; if(AB&&AB.ratesState){try{ratesLoad(AB.ratesState())}catch(e){}}}
  const r=RT.data&&RT.data.rates, a=r?+r[c]:0; if(a>0&&Number.isFinite(a)) return a;
  return manRate(c);
}
function ratesDone(){RT.busy=false; RT.waiters.splice(0).forEach(f=>{try{f()}catch(e){}})}
window.__ratesInfo=(json,err)=>{ const ok=!!(json&&ratesLoad(json)); RT.err=ok?'':(err||(json?'bad':'net')); RT.why=ok?'':(err||''); if(ok) setTimeout(()=>{try{curFixPending()}catch(e){}},0); ratesDone() };
/* asks for fresh rates (Android: through Kotlin, which throttles to once every 3 hours unless [force]); [cb] runs when done or after 9 seconds */
function ratesRefresh(force,cb){
  if(cb) RT.waiters.push(cb);
  if(RT.busy) return;
  RT.busy=true; RT.err=''; RT.why=''; setTimeout(()=>{if(RT.busy){RT.err='net'; RT.why='timeout9'; ratesDone()}},9000);
  if(AB&&AB.ratesRefresh){AB.ratesRefresh(!!force); return}
  /* the web version has no CSP in the way, so it can read the file itself */
  try{ const ctl=new AbortController(); setTimeout(()=>ctl.abort(),8000);
    fetch('https://raw.githubusercontent.com/newmatrix/Maleem/main/rates.json?t='+Math.floor(Date.now()/60000),{cache:'no-store',signal:ctl.signal})
      .then(r=>{ if(!r.ok){RT.err='http'; RT.why='http'+r.status; return null} return r.json() }).then(j=>{ if(j){ if(ratesLoad({data:j,checkedAt:Date.now()})) setTimeout(()=>{try{curFixPending()}catch(e){}},0); else RT.err='bad' } ratesDone() }).catch(e=>{RT.err='net'; RT.why=(e&&e.name==='AbortError')?'timeout8':String((e&&e.message)||e).slice(0,40); ratesDone()});
  }catch(e){ratesDone()}
}
/* ===== Trash: what the person deletes stays here for 30 days. Each entry = {id, k: kind, ts: when deleted, i: place in its list, d: the record, m: extra links (installments)}.
   Not in backups and not shared: it is only this phone's safety net. ===== */
const TRASH_DAYS=30, TRASH_MAX=150;
const TRASH_CLEAN={xp:x=>cleanExpense(x,true),debt:x=>cleanDebt(x,S.currency),gam:cleanGam,inc:cleanIncome,goal:cleanGoal,fix:cleanFixed,plan:cleanPlan,ipl:cleanIplan,inst:cleanInst};
function cleanTrash(l){
  const seen=new Set();
  return (Array.isArray(l)?l:[]).map(t=>{
    if(!t||typeof t!=='object'||!isId(t.id)||!TRASH_CLEAN[t.k]||seen.has(t.id)) return null;
    const ts=numIn(t.ts,0,MAXTS,0), d=ts?TRASH_CLEAN[t.k](t.d):null; if(!d) return null; seen.add(t.id);
    const o={id:t.id,k:t.k,ts,i:intIn(t.i,0,100000,0),d};
    if(t.k==='inst'&&Array.isArray(t.m)) o.m=t.m.filter(q=>Array.isArray(q)&&isId(q[0])&&isId(q[1])).slice(0,120).map(q=>[q[0],q[1]]);
    return o}).filter(Boolean).slice(0,TRASH_MAX);
}
const CLEAN={debts:cleanDebt,gams:cleanGam,incomes:cleanIncome,goals:cleanGoal,fixed:cleanFixed};
/* clean whatever is already stored on the phone (older versions, old backups) */
curMerge([]); // the currencies this person added, before anything is checked against CURRENCIES
(function(){
  const arr=v=>Array.isArray(v)?v:[];
  S.expenses=arr(S.expenses).map(x=>cleanExpense(x,true)).filter(Boolean);
  Object.keys(CLEAN).forEach(k=>{S[k]=arr(S[k]).map(CLEAN[k]).filter(Boolean)});
  S.fixedLog=cleanFixedLog(S.fixedLog);
  S.trash=cleanTrash(S.trash);
  S.plans=arr(S.plans).map(cleanPlan).filter(Boolean); S.iplans=arr(S.iplans).map(cleanIplan).filter(Boolean); S.capCurBy=cleanCapCur(S.capCurBy); S.refunds=arr(S.refunds).map(cleanRefund).filter(Boolean).sort((a,b)=>b.ts-a.ts).slice(0,300);
  S.gold=arr(S.gold).map(cleanGold).filter(Boolean); S.goldPx=cleanGoldPx(S.goldPx); S.ipFee=cleanIpFee(S.ipFee); S.manRates=cleanManRates(S.manRates); S.fbEmail=str(S.fbEmail,100);
  S.closedP=cleanClosed(S.closedP);
  {const ids=new Set(); S.accounts=arr(S.accounts).map(cleanAcc).filter(a=>a&&!ids.has(a.id)&&ids.add(a.id)); S.transfers=arr(S.transfers).map(cleanTr).filter(Boolean); S.bMoves=arr(S.bMoves).map(cleanBMove).filter(Boolean); S.insts=arr(S.insts).map(cleanInst).filter(Boolean); S.instPays=arr(S.instPays).map(cleanInstPay).filter(Boolean); S.inflows=arr(S.inflows).map(cleanInflow).filter(Boolean)}
  S.profile=cleanProfile(S.profile);
  S.capQ=arr(S.capQ).map(cleanCap).filter(Boolean).slice(0,30);
  {const cs=arr(S.cats).map(cleanCat).filter(Boolean); S.cats=cs.length?cs:CATS.map(c=>({...c})); syncCats()}
  {const ps=arr(S.pays).map(cleanPay).filter(Boolean); S.pays=ps.length?ps:PAYS.map(x=>({...x})); if(!S.pays.some(x=>x.id==='cash')) S.pays.unshift({...PAYS[0]}); syncPays()}
  S.payday=intIn(S.payday,1,31,1); S.budget=numIn(S.budget,0,MAXAMT,0); S.saveTarget=numIn(S.saveTarget,0,MAXAMT,0);
  if(!CURRENCIES.some(c=>c.id===S.currency)) S.currency='EGP';
  if(!['fixed','open'].includes(S.budgetMode)) S.budgetMode=S.budget>0?'fixed':'open';
  if(!['light','dark','system'].includes(S.theme)) S.theme='system';
})();


