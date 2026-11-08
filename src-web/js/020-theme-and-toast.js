/* Theme */
const ACCENTS=[
  {id:'maleem',name:'مليم',    l:'#017D84', l2:'#00535F', d:'#0E8A86', d2:'#0A4A51'},
  {id:'green', name:'أخضر',   l:'#0E6B57', l2:'#0A5243', d:'#2FA586', d2:'#13574A'},
  {id:'blue',  name:'أزرق',   l:'#1D5FBF', l2:'#164A94', d:'#4C8DF0', d2:'#1B3F78'},
  {id:'purple',name:'بنفسجي', l:'#6D3FC0', l2:'#532F96', d:'#9B7BEA', d2:'#43287A'},
  {id:'pink',  name:'وردي',   l:'#C2366E', l2:'#962A56', d:'#EC6A9C', d2:'#7A2348'},
  {id:'orange',name:'برتقالي', l:'#C2571A', l2:'#964314', d:'#F08A4B', d2:'#7A3912'},
  {id:'teal',  name:'تركواز',  l:'#0E7490', l2:'#0B5A70', d:'#2BB3D3', d2:'#0E4C5E'},
  {id:'terracotta',name:'طوبي', l:'#B5532A', l2:'#8E3F1F', d:'#E08A5C', d2:'#6E301A'},
  {id:'ocean', name:'محيط',   l:'#0B5C86', l2:'#084664', d:'#4FB0E0', d2:'#0E4560'},
  {id:'gold',  name:'ذهبي',   l:'#9A7410', l2:'#7A5C0C', d:'#B38B1C', d2:'#6B5410'}
];
if(!ACCENTS.some(a=>a.id===S.accent)) S.accent='maleem'; // colors removed in later versions fall back to green
const STYLES={
  calm:    {name:'هادئ',        dark:false, ac:null,         pv:{bg:'#EEF6F6',sf:'#FFFFFF',ac:'#017D84'}},
  midnight:{name:'منتصف الليل', dark:true,  ac:'blue',       pv:{bg:'#000000',sf:'#1A1A1F',ac:'#4C8DF0'}},
  paper:   {name:'ورقي دافي',   dark:false, ac:'terracotta', pv:{bg:'#F6F1E7',sf:'#FFFBF3',ac:'#B5532A'}},
  royal:   {name:'ملكي',        dark:true,  ac:'gold',       pv:{bg:'#0A1020',sf:'#1B2540',ac:'#D4AF37'}},
  ocean:   {name:'محيط',        dark:false, ac:'ocean',      pv:{bg:'#EAF3F8',sf:'#FFFFFF',ac:'#0B5C86'}}
};
const styleId=()=>STYLES[S.style]?S.style:'calm';
const LOOKS=[
  {id:'classic',name:'كلاسيك',d:'الشكل الأصلي لمليم'},
  {id:'flat',name:'مسطح',d:'حدود رفيعة من غير ظلال، وأيقونات أصغر'},
  {id:'compact',name:'مضغوط',d:'مسافات أقل وخط أصغر شوية، فتشوف حاجات أكتر'},
  {id:'comfy',name:'مريح',d:'خط وأيقونات وأزرار أكبر، مريح للعين'},
  {id:'soft',name:'ناعم',d:'حواف دايرية، وكل مصروف ملوّن بلون فئته'}];
const lookId=()=>LOOKS.some(x=>x.id===S.look)?S.look:'classic';
const FONTS=[{id:'plex',name:'الأصلي',f:"'IBM Plex Sans Arabic'"},{id:'cairo',name:'كايرو',f:"'Cairo'"},{id:'tajawal',name:'تجوال',f:"'Tajawal'"},{id:'almarai',name:'المراعي',f:"'Almarai'"},{id:'alexandria',name:'الإسكندرية',f:"'Alexandria'"},{id:'readex',name:'ريدكس',f:"'Readex Pro'"}];
const fontId=()=>FONTS.some(x=>x.id===S.font)?S.font:'plex';
const PRESSES=[
  {id:'bounce',name:'نابضة',d:'الزرار ينضغط ويرتد سنة'},
  {id:'soft',name:'هادية',d:'ضغطة خفيفة من غير ارتداد'},
  {id:'ripple',name:'موجة',d:'دايرة بتتمد من مكان صباعك'},
  {id:'glow',name:'توهج',d:'حلقة بلون التطبيق حوالين الزرار'},
  {id:'none',name:'من غير',d:'مفيش أي حركة'}];
const TRANSES=[
  {id:'rise',name:'ناعمة',d:'الشاشة تظهر وتطلع سنة لفوق'},
  {id:'slide',name:'انزلاق',d:'الشاشة تدخل من ناحية التاب اللي رايحله'},
  {id:'zoom',name:'تكبير',d:'الشاشة تكبر من جوه وهي بتظهر'},
  {id:'fade',name:'تلاشي',d:'تظهر بهدوء في مكانها'},
  {id:'none',name:'فورية',d:'من غير حركة خالص'}];
const pressId=()=>PRESSES.some(x=>x.id===S.press)?S.press:'bounce';
const transId=()=>TRANSES.some(x=>x.id===S.trans)?S.trans:'rise';
function applyTheme(){
  const r=document.documentElement;
  {const pr=pressId(), tr=transId();
    if(pr==='bounce') r.removeAttribute('data-press'); else r.setAttribute('data-press',pr);
    if(tr==='rise') r.removeAttribute('data-trans'); else r.setAttribute('data-trans',tr);
    document.querySelectorAll('#pressList [data-press]').forEach(b=>{const on=b.dataset.press===pr; b.setAttribute('aria-pressed',on); b.setAttribute('aria-checked',on)});
    {const d=$('#pressDesc'); if(d) d.textContent=(PRESSES.find(x=>x.id===pr)||{}).d||''}
    document.querySelectorAll('#transList [data-trans]').forEach(b=>{const on=b.dataset.trans===tr; b.setAttribute('aria-pressed',on); b.setAttribute('aria-checked',on)});
    {const d=$('#transDesc'); if(d) d.textContent=(TRANSES.find(x=>x.id===tr)||{}).d||''}
    const ht=$('#hapticToggle'); if(ht) ht.checked=!!S.haptic; const hr=$('#hapticRow'); if(hr) hr.hidden=!(AB&&AB.haptic)}
  {const fn=fontId(), fw=S.fontW==='bold'?'bold':'normal';
    if(fn==='plex') r.removeAttribute('data-font'); else r.setAttribute('data-font',fn);
    if(fw==='bold') r.setAttribute('data-fw','bold'); else r.removeAttribute('data-fw');
    document.querySelectorAll('#fontList [data-fid]').forEach(b=>{const on=b.dataset.fid===fn; b.setAttribute('aria-pressed',on); b.setAttribute('aria-checked',on)});
    document.querySelectorAll('#fwSeg [data-fw]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.fw===fw?'true':'false'))}
  {const lk=lookId(); if(lk==='classic') r.removeAttribute('data-look'); else r.setAttribute('data-look',lk);
    document.querySelectorAll('#lookList [data-look]').forEach(b=>{const on=b.dataset.look===lk; b.setAttribute('aria-pressed',on); b.setAttribute('aria-checked',on)});
    {const d=$('#lookDesc'); if(d) d.textContent=(LOOKS.find(x=>x.id===lk)||{}).d||''}}
  const A=ACCENTS.find(a=>a.id===S.accent)||ACCENTS[0];
  r.style.setProperty('--ac-l',A.l); r.style.setProperty('--ac2-l',A.l2); r.style.setProperty('--ac-d',A.d); r.style.setProperty('--ac2-d',A.d2);
  document.querySelectorAll('#accentRow button').forEach(b=>{const on=b.dataset.accent===A.id; b.setAttribute('aria-pressed',on); b.textContent=on?'✓':''});
  const sid=styleId(), sd=STYLES[sid];
  const sysDark=!!(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);
  if(sid==='calm'){ r.removeAttribute('data-style'); if(S.theme==='system') r.removeAttribute('data-theme'); else r.setAttribute('data-theme',S.theme) }
  else{ r.setAttribute('data-style',sid); r.setAttribute('data-theme', sd.dark?'dark':(S.theme==='system'?(sysDark?'dark':'light'):S.theme)) }
  document.querySelectorAll('#styleGrid button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.style===sid));
  $('#styleHint').hidden=!(sd.dark&&S.theme==='light');
  document.querySelectorAll('#themeSeg button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.theme===S.theme));
  if(AB&&AB.setBars){const dark=r.getAttribute('data-theme')? r.getAttribute('data-theme')==='dark' : sysDark;
    let bg=''; try{bg=getComputedStyle(r).getPropertyValue('--bg').trim()}catch(e){}
    try{AB.setBars(bg||(dark?'#061A1D':'#EEF6F6'),dark)}catch(e){}}
}
try{window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{if(S.theme==='system')applyTheme()})}catch(e){}

/* Toast */
let toastT;
function toast(msg,actLabel,act,ms){
  ms=ms||(actLabel?3000:2400);
  $('#toastMsg').textContent=TX(msg);
  const b=$('#toastAct'), bar=$('#tbar');
  if(actLabel){b.hidden=false;b.textContent=TX(actLabel);b.onclick=()=>{clearTimeout(toastT);$('#toast').classList.remove('show');act()}}
  else b.hidden=true;
  bar.classList.remove('run');void bar.offsetWidth;
  bar.style.display=actLabel?'block':'none';
  if(actLabel){bar.style.animationDuration=ms+'ms';bar.classList.add('run')}
  $('#toast').classList.add('show');
  clearTimeout(toastT);toastT=setTimeout(()=>$('#toast').classList.remove('show'),ms);
}

/* Item row */
const ICON_MORE='<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="12" cy="19" r="1.9"/></svg>';
let justAdded=null;
function itemRow(x){
  const c=CAT[x.cat]||CAT.other;
  return `<div class="xp${x.id===justAdded?' new':''}" data-id="${esc(x.id)}" style="--cc:${colr(c.c)}">
    <div class="tile">${esc(c.e)}</div>
    <div class="body">
      <div class="title">${esc(c.name)}: <span class="val">${money(x.amount)} <small>${CS()}</small></span></div>
      ${expenseReadOnly(x)?`<div class="xnote xby">${x.legacyReadOnly?'نسخة محلية قديمة · ':''}${x.byName?`👤 ${esc(x.byName)} · `:''}قراءة فقط</div>`:(x.byName&&x.by&&x.by!==spMe()?`<div class="xnote xby">👤 ${esc(x.byName)}</div>`:'')}
      ${x.note?`<div class="xnote" data-notr dir="auto">${esc(x.note)}</div>`:''}
      <div class="time">${timeStr(x.ts)}${x.fund==='free'?` · ${esc(TX('دخل حر'))}`:''}<span class="pm" title="${esc(PAY[payOf(x)].name)}">· ${esc(PAY[payOf(x)].e)}</span>${ACC(x.acc)?`<span class="pm" title="الحساب">· ${esc(ACC(x.acc).name)}</span>`:''}${RC.ids.has(x.id)?`<button type="button" class="rc-ic" data-rc="${esc(x.id)}" aria-label="صورة الإيصال" title="صورة الإيصال">🧾</button>`:''}</div>
    </div>
    ${expenseReadOnly(x)?'':`<button class="more" data-more="${esc(x.id)}" aria-label="خيارات" aria-haspopup="menu" aria-expanded="false">${ICON_MORE}</button>`}
  </div>`;
}

