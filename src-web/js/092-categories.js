/* Categories management */
const EMOJIS=['🍽️','🍔','☕','🛒','🥖','🚌','🚕','⛽','🚇','✈️','🧾','💡','💧','🔥','📱','📶','🌐','📺','🛍️','👕','💊','🏥','🎬','🎮','⚽','🏠','🛋️','🧹','📚','🎓','🎁','👶','🐱','💇','🏋️','💳','🏦','🎉','🚗','📦'];
const COLORS=['#E07A2E','#2D7FD3','#8B5CF6','#0EA5A4','#D9466F','#C79A2B','#16A34A','#E11D48','#7C6A55','#4F46E5','#DB2777','#64748B'];
let catEdit=null, catEmoji=EMOJIS[0], catColor=COLORS[0], justAddedCat=null;
function renderCatList(){
  const counts={}; S.expenses.forEach(x=>{counts[x.cat]=(counts[x.cat]||0)+1});
  $('#catCount').textContent=S.cats.length+' فئة';
  const byCat={}; if(S.cats.some(c=>c.lim>0)) ofPeriod(periodOf(Date.now())).forEach(x=>{byCat[x.cat]=(byCat[x.cat]||0)+x.amount});
  const limTxt=c=>{const sp=byCat[c.id]||0, r=sp/c.lim; return `<small class="${r>=1?'lim-bad':r>=S.alertPct/100?'lim-warn':''}">صرفت ${money(sp)} من حد ${money(c.lim)} ${CS()}</small><span class="lim-bar${r>=1?' bad':r>=S.alertPct/100?' warn':''}"><i style="width:${Math.min(100,Math.round(r*100))}%"></i></span>`};
  $('#catList').innerHTML=S.cats.map(c=>`<div class="crow${c.id===justAddedCat?' new':''}" data-cid="${esc(c.id)}" style="--cc:${colr(c.c)}">
    <div class="tile">${esc(c.e)}</div>
    <div class="n">${esc(c.name)}${c.lim>0?limTxt(c):`<small>${counts[c.id]?counts[c.id]+' مصروف':'مفيش مصاريف لسه'}</small>`}</div>
    <span class="grip" role="img" aria-label="اسحب لتغيير ترتيب ${esc(c.name)}"><svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.7"/><circle cx="15" cy="6" r="1.7"/><circle cx="9" cy="12" r="1.7"/><circle cx="15" cy="12" r="1.7"/><circle cx="9" cy="18" r="1.7"/><circle cx="15" cy="18" r="1.7"/></svg></span>
    <button class="more" data-catmore="${esc(c.id)}" aria-label="خيارات ${esc(c.name)}" aria-haspopup="menu" aria-expanded="false">${ICON_MORE}</button></div>`).join('');
}
$('#emojiGrid').innerHTML=EMOJIS.map(e=>`<button type="button" data-emoji="${esc(e)}" aria-pressed="false">${e}</button>`).join('');
/* Drag & drop reorder for categories: grip in Settings, long-press in the add-expense sheet */
let sortSuppress=0;
function sortable(box,itemSel,o){
  let st=null;
  const items=()=>[...box.querySelectorAll(itemSel)];
  const place=()=>{
    const el=st.el; el.style.transform='none';
    const r=el.getBoundingClientRect();
    el.style.transform=`translate(${st.px-st.ox-r.left}px,${st.py-st.oy-r.top}px) scale(1.04)`;
  };
  const hit=()=>{
    for(const t of items()){
      if(t===st.el) continue;
      const r=t.getBoundingClientRect();
      if(st.px>=r.left&&st.px<=r.right&&st.py>=r.top&&st.py<=r.bottom){
        if(st.el.compareDocumentPosition(t)&Node.DOCUMENT_POSITION_FOLLOWING) t.after(st.el); else t.before(st.el);
        return;
      }
    }
  };
  const tick=()=>{
    if(!st||!st.on) return;
    let ch=false;
    if(o.vscroll){
      if(st.py<80){window.scrollBy(0,-10);ch=true}
      else if(st.py>window.innerHeight-150){window.scrollBy(0,10);ch=true}
    }
    if(box.scrollWidth>box.clientWidth+2){
      const b=box.getBoundingClientRect();
      if(st.px<b.left+34){box.scrollLeft-=9;ch=true}
      else if(st.px>b.right-34){box.scrollLeft+=9;ch=true}
    }
    if(ch){hit();place()}
    st.raf=requestAnimationFrame(tick);
  };
  const start=()=>{
    if(!st||st.on) return;
    clearTimeout(st.t); st.on=true;
    const r=st.el.getBoundingClientRect(); st.ox=st.px-r.left; st.oy=st.py-r.top;
    st.el.classList.add('srt-drag'); st.el.classList.remove('pressed');
    box.classList.add('sorting'); document.body.classList.add('sorting');
    st.before=items().map(o.id).join();
    try{box.setPointerCapture(st.pid)}catch(_){}
    if(navigator.vibrate) try{navigator.vibrate(15)}catch(_){}
    closeMenu(); place(); st.raf=requestAnimationFrame(tick);
  };
  const end=e=>{
    if(!st||(e&&e.pointerId!==st.pid)) return;
    clearTimeout(st.t); cancelAnimationFrame(st.raf);
    const s=st; st=null;
    if(!s.on) return;
    s.el.classList.remove('srt-drag'); s.el.style.transform='';
    box.classList.remove('sorting'); document.body.classList.remove('sorting');
    sortSuppress=Date.now()+400;
    const ids=items().map(o.id);
    if(ids.join()!==s.before) o.done(ids);
  };
  box.addEventListener('pointerdown',e=>{
    if(st||(e.pointerType==='mouse'&&e.button!==0)) return;
    const el=e.target.closest(itemSel); if(!el||!box.contains(el)) return;
    if(o.grip){ if(!e.target.closest(o.grip)) return }
    else if(e.target.closest('.more')) return;
    st={el,pid:e.pointerId,px:e.clientX,py:e.clientY,sx:e.clientX,sy:e.clientY,on:false,t:null,raf:0};
    if(o.grip) start(); else st.t=setTimeout(start,380);
  });
  box.addEventListener('pointermove',e=>{
    if(!st||e.pointerId!==st.pid) return;
    st.px=e.clientX; st.py=e.clientY;
    if(!st.on){ if(Math.hypot(st.px-st.sx,st.py-st.sy)>9){clearTimeout(st.t);st=null} return }
    hit(); place();
  });
  ['pointerup','pointercancel'].forEach(t=>box.addEventListener(t,end));
  box.addEventListener('touchmove',e=>{if(st&&st.on&&e.cancelable) e.preventDefault()},{passive:false});
  box.addEventListener('contextmenu',e=>{if(st) e.preventDefault()});
  box.addEventListener('click',e=>{if(Date.now()<sortSuppress){e.preventDefault();e.stopPropagation()}},true);
}
function commitCatOrder(vis){
  const full=S.cats.map(c=>c.id), pos=[];
  full.forEach((id,i)=>{if(vis.includes(id)) pos.push(i)});
  vis.forEach((id,k)=>{full[pos[k]]=id});
  const by=Object.fromEntries(S.cats.map(c=>[c.id,c]));
  S.cats=full.map(id=>by[id]); syncCats(); save();
  const sl=$('#cats').scrollLeft; renderCatGrid(); $('#cats').scrollLeft=sl; markCat(); renderCatList();
  toast('اتغير ترتيب الفئات');
}
sortable($('#cats'),'.cat',{id:el=>el.dataset.cat,done:commitCatOrder});
sortable($('#catList'),'.crow',{id:el=>el.dataset.cid,grip:'.grip',vscroll:true,done:commitCatOrder});

$('#swatches').innerHTML=COLORS.map(c=>`<button type="button" data-color="${c}" style="background:${c}" aria-label="لون" aria-pressed="false"></button>`).join('');
function paintCatSheet(){
  $('#catPrevTile').textContent=catEmoji; $('#catPreview').style.setProperty('--cc',catColor);
  document.querySelectorAll('#emojiGrid button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.emoji===catEmoji));
  document.querySelectorAll('#swatches button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.color===catColor));
}
$('#emojiGrid').onclick=e=>{const b=e.target.closest('[data-emoji]');if(b){catEmoji=b.dataset.emoji;paintCatSheet()}};
$('#swatches').onclick=e=>{const b=e.target.closest('[data-color]');if(b){catColor=b.dataset.color;paintCatSheet()}};
function openCatSheet(id){
  const c=id?CAT[id]:null; catEdit=c?id:null;
  $('#catTitle').textContent=c?'تعديل الفئة':'فئة جديدة';
  $('#catSave').textContent=c?'حفظ التعديل':'إضافة';
  $('#catName').value=c?c.name:''; $('#catLim').value=c&&c.lim?c.lim:'';
  catEmoji=c?c.e:EMOJIS[Math.floor(Math.random()*EMOJIS.length)];
  catColor=c?c.c:COLORS[S.cats.length%COLORS.length];
  if(!EMOJIS.includes(catEmoji)) $('#emojiGrid').insertAdjacentHTML('afterbegin',`<button type="button" data-emoji="${esc(catEmoji)}" aria-pressed="false">${esc(catEmoji)}</button>`);
  $('#catErr').textContent=''; paintCatSheet();
  $('#scrim').classList.add('open');$('#catSheet').classList.add('open');
  $('#catName').focus({preventScroll:true});
}
$('#addCat').onclick=()=>openCatSheet();
/* suggested categories: the ones people use most in money apps that this person does not have yet */
const catSugList=()=>{const have=new Set(S.cats.map(c=>c.id)), names=new Set(S.cats.map(c=>normAr(c.name)));
  return CATS.concat(CATS_MORE).filter(c=>c.id!=='other'&&!have.has(c.id)&&!names.has(normAr(c.name)))};
const catSugGroups=()=>{const L=catSugList(), have=new Set(L.map(c=>c.id)), out=[], basic=L.filter(c=>CATS.some(d=>d.id===c.id));
  if(basic.length) out.push(['الفئات الأساسية',basic]);
  CAT_GROUPS.forEach(g=>{const l=g[1].filter(c=>have.has(c.id)); if(l.length) out.push([g[0],l])});
  return out};
function openCatSug(){
  if(!catSugList().length){toast('عندك كل الفئات المقترحة بالفعل');return}
  $('#sugSearch').value='';
  $('#sugList').innerHTML=`<label class="pay-row" style="cursor:pointer"><span class="txt"><b>تحديد الكل</b></span><input type="checkbox" id="sugAll" style="width:22px;height:22px"></label>`
    +catSugGroups().map(([n,l],gi)=>`<div class="sug-g" data-sg="${gi}"><b>${esc(n)}</b><button type="button" class="linkbtn" data-sgall="${gi}">تحديد الكل</button></div>`
      +l.map(c=>`<label class="pay-row sug-row" data-g="${gi}" data-name="${esc(normAr(n+' '+c.name))}" style="cursor:pointer;--cc:${colr(c.c)}"><span class="txt">${esc(c.e)} ${esc(c.name)}</span><input type="checkbox" data-sug="${esc(c.id)}" style="width:22px;height:22px"></label>`).join('')).join('')
    +`<p class="hint center" id="sugNone" hidden>مفيش فئة بالاسم ده</p>`;
  $('#sugErr').textContent=''; openSheetEl('sugSheet');
}
$('#addCatSug').onclick=openCatSug;
const sugRows=g=>[...document.querySelectorAll('#sugList .sug-row'+(g===undefined?'':`[data-g="${g}"]`))].filter(r=>!r.classList.contains('sug-off'));
$('#sugList').onchange=e=>{ if(e.target.id==='sugAll'){sugRows().forEach(r=>{r.querySelector('input').checked=e.target.checked})} };
$('#sugList').onclick=e=>{const b=e.target.closest('[data-sgall]'); if(!b) return;
  const rows=sugRows(b.dataset.sgall), all=rows.length&&rows.every(r=>r.querySelector('input').checked);
  rows.forEach(r=>{r.querySelector('input').checked=!all})};
$('#sugSearch').addEventListener('input',()=>{
  const q=normAr($('#sugSearch').value.trim());
  document.querySelectorAll('#sugList .sug-row').forEach(r=>r.classList.toggle('sug-off',!!q&&!r.dataset.name.includes(q)));
  document.querySelectorAll('#sugList .sug-g').forEach(h=>h.classList.toggle('sug-off',!sugRows(h.dataset.sg).length));
  $('#sugNone').hidden=sugRows().length>0;
});
$('#sugCancel').onclick=closeSheets;
$('#sugSave').onclick=()=>{
  const ids=[...document.querySelectorAll('#sugList [data-sug]:checked')].map(c=>c.dataset.sug);
  if(!ids.length){$('#sugErr').textContent='اختار فئة واحدة على الأقل';return}
  const add=catSugList().filter(c=>ids.includes(c.id)).map(c=>({...c})), old=S.cats.map(k=>({...k}));
  if(!add.length){closeSheets();return}
  const i=S.cats.findIndex(c=>c.id==='other'); S.cats.splice(i<0?S.cats.length:i,0,...add);
  save();syncCats();closeSheets();renderAll();
  toast(`اتضافت ${add.length} ${add.length<=10?'فئات':'فئة'}`,'تراجع',()=>{S.cats=old;save();syncCats();renderAll()},5000);
};
$('#catCancel').onclick=closeSheets;
$('#catName').addEventListener('input',()=>$('#catErr').textContent='');
$('#catName').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('#catSave').click()}});
$('#catSave').onclick=()=>{
  const name=$('#catName').value.trim().replace(/\s+/g,' ');
  if(!name){$('#catErr').textContent='اكتب اسم الفئة';$('#catName').focus();return}
  if(S.cats.some(c=>c.id!==catEdit&&c.name.toLowerCase()===name.toLowerCase())){$('#catErr').textContent='فيه فئة بالاسم ده بالفعل';return}
  const limRaw=String($('#catLim').value).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[,،\s]/g,'').replace('٫','.');
  const lim=limRaw?parseFloat(limRaw):0;
  if(limRaw&&!(lim>0&&lim<1e9)){$('#catErr').textContent='اكتب الحد رقم بس، أو سيبه فاضي';$('#catLim').focus();return}
  if(catEdit){Object.assign(CAT[catEdit],{name,e:catEmoji,c:catColor}); if(lim) CAT[catEdit].lim=Math.round(lim*100)/100; else delete CAT[catEdit].lim}
  else{const id='c_'+uid(), nc={id,name,e:catEmoji,c:catColor}; if(lim) nc.lim=Math.round(lim*100)/100; S.cats.push(nc); justAddedCat=id}
  const was=catEdit; save();syncCats();closeSheets();renderAll();justAddedCat=null;
  toast(was?'اتعدلت الفئة':'اتضافت فئة '+name);
};
function deleteCat(id){
  if(id==='other') return;
  const c=CAT[id]; if(!c) return;
  const moved=S.expenses.filter(x=>x.cat===id&&expenseCanManage(x)).map(x=>x.id);
  const oldCats=S.cats.map(k=>({...k}));
  const row=document.querySelector(`.crow[data-cid="${CSS.escape(String(id))}"]`); if(row) row.classList.add('removing');
  setTimeout(()=>{
    S.cats=S.cats.filter(k=>k.id!==id);
    S.expenses.forEach(x=>{if(x.cat===id&&expenseCanManage(x))x.cat='other'});
    save();syncCats();renderAll();
    toast(moved.length?`اتحذفت ${c.name} واتنقل ${moved.length} مصروف لـ${CAT.other.name}`:`اتحذفت فئة ${c.name}`,'تراجع',()=>{
      S.cats=oldCats; const set=new Set(moved); S.expenses.forEach(x=>{if(set.has(x.id)&&expenseCanManage(x))x.cat=id});
      justAddedCat=id; save();syncCats();renderAll();justAddedCat=null;
    },3000);
  },row?200:0);
}


