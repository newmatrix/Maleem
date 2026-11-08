/* receipts whose expense is gone (deleted, wiped, restored over) */
function rcPrune(){const live=new Set(S.expenses.map(e=>e.id)); [...RC.ids].forEach(id=>{if(!live.has(id)) rcDel(id)})}
/* phone photos are big: keep a sharp but small JPEG (longest side 1600px) */
function rcShrink(file){return new Promise((res,rej)=>{
  const u=URL.createObjectURL(file), img=new Image();
  img.onload=()=>{URL.revokeObjectURL(u);
    const w=img.naturalWidth, h=img.naturalHeight; if(!w||!h) return rej(new Error('img'));
    const k=Math.min(1,1600/Math.max(w,h)), c=document.createElement('canvas'); c.width=Math.round(w*k); c.height=Math.round(h*k);
    const x=c.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,c.width,c.height); x.drawImage(img,0,0,c.width,c.height);
    c.toBlob(b=>b?res(b):rej(new Error('blob')),'image/jpeg',.72)};
  img.onerror=()=>{URL.revokeObjectURL(u);rej(new Error('img'))};
  img.src=u;
})}
let rcThumbUrl=null;
function rcSetThumb(b){if(rcThumbUrl) URL.revokeObjectURL(rcThumbUrl); rcThumbUrl=b?URL.createObjectURL(b):null; if(rcThumbUrl) $('#rcImg').src=rcThumbUrl; else $('#rcImg').removeAttribute('src')}
function rcPaint(){
  const id=editId, has= rcStage&&rcStage.blob? true : rcStage==='del'? false : !!(id&&RC.ids.has(id));
  $('#rcEmpty').hidden=has; $('#rcHas').hidden=!has;
  if(!has){rcSetThumb(null);return}
  if(rcStage&&rcStage.blob) rcSetThumb(rcStage.blob);
  else rcGet(id).then(b=>{if(b&&editId===id&&!rcStage) rcSetThumb(b)}).catch(()=>{});
}
/* called by "حفظ" once the expense id is known */
function rcCommit(id){
  const st=rcStage; rcStage=null; if(!id||!st) return;
  if(st==='del'){rcDel(id).then(()=>renderAll()); return}
  if(st.blob) rcPut(id,st.blob).then(()=>renderAll()).catch(()=>toast('المصروف اتحفظ، بس صورة الإيصال ما اتحفظتش. جرب تضيفها تاني'));
}
/* ===== Reading a receipt photo (Android, on the phone with Google ML Kit: Latin letters and digits, no Arabic).
   The photo never leaves the phone. Only empty fields are filled; nothing is saved until "حفظ". ===== */
const OCR_TOTAL=/\b(grand\s*total|net\s*total|net\s*amount|net\s*payable|total\s*due|amount\s*due|total\s*amount|invoice\s*total|total\s*egp|to\s*pay|balance\s*due|total|net|amount|payable)\b/i;
const OCR_BEST=/grand|net|due|payable|to\s*pay|invoice\s*total|total\s*amount|total\s*egp/i;
const OCR_SKIP=/sub\s*-?\s*total|total\s*(items?|qty|quantity|pcs|discount|saving|tax|vat)|\b(tax|vat|discount|change|cash|tender(ed)?|saved?|savings|points?|rounding|tip|service|qty|items?)\b/i;
const OCR_NOTNAME=/\b(tel|phone|mob|fax|tax|vat|reg|invoice|receipt|bill|date|time|cashier|order|table|welcome|thank|www|http|\.com|street|st\.|road|branch|no\.|cr\b|id\b|pos|terminal|copy|customer|address)\b|@/i;
const OCR_MERCH=[[/carrefour|spinneys|seoudi|kazyon|metro|hyper|market|gourmet|oscar|bim|lulu|panda|fathalla|kheir\s*zaman|zahran/i,'shop'],
  [/pharm|seif|el\s*ezaby|ezaby|19011|misr\s*pharmacies|hospital|clinic|lab\b/i,'health'],
  [/uber|careem|indriver|didi|swvl|taxi|metro\s*ticket/i,'trans'],
  [/vodafone|orange|etisalat|\bwe\b|telecom/i,'phone'],
  [/mcdonald|kfc|pizza|burger|starbucks|costa|cafe|coffee|restaurant|cilantro|cook\s*door|hardee|buffalo|domino|talabat|elmenus|bakery|patisserie/i,'food'],
  [/cinema|vox|imax|bowling|club/i,'fun'],
  [/ikea|home\s*centre|homebox|hardware|furniture/i,'home'],
  [/book|library|school|academy|course/i,'edu']];
function ocrNums(t){ // money-looking numbers on a line: 1,234.50 / 245.5 / 1.234 / 85
  const s=String(t).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)), out=[];
  (s.match(/\d+(?:[.,]\d+)*/g)||[]).forEach(tk=>{
    let v=tk, dec=false; const m=tk.match(/^(.*)[.,](\d{1,2})$/);
    if(m&&(m[1]===''||/^\d{1,3}(?:[.,]\d{3})*$|^\d+$/.test(m[1]))){v=m[1].replace(/[.,]/g,'')+'.'+m[2];dec=true}
    else if(/^\d{1,3}(?:[.,]\d{3})+$/.test(tk)) v=tk.replace(/[.,]/g,'');
    else if(!/^\d+$/.test(tk)) return;
    if(v.replace('.','').length>=8) return; // phone numbers, ids
    const n=parseFloat(v); if(n>0&&n<1e7) out.push({n,dec});
  });
  return out;
}
function ocrParse(res){
  const L=(res&&Array.isArray(res.lines)?res.lines:[]).filter(l=>l&&typeof l.t==='string').map(l=>({t:l.t.trim(),y:(+l.y||0)+(+l.h||0)/2,h:+l.h||20,x:+l.x||0})).filter(l=>l.t);
  L.sort((a,b)=>a.y-b.y);
  const out={amount:null,sure:false,date:null,merchant:'',cat:null};
  // total: a "total" line, the amount on it or on the same row
  let best=null;
  L.forEach((l,i)=>{
    if(!OCR_TOTAL.test(l.t)||OCR_SKIP.test(l.t)) return;
    let nums=ocrNums(l.t.replace(OCR_TOTAL,' '));
    if(!nums.length) L.forEach(o=>{if(o!==l&&Math.abs(o.y-l.y)<Math.max(l.h,o.h)*.7&&!OCR_TOTAL.test(o.t)) nums=nums.concat(ocrNums(o.t))});
    if(!nums.length&&L[i+1]&&!OCR_TOTAL.test(L[i+1].t)) nums=ocrNums(L[i+1].t);
    nums=nums.filter(n=>n.n<1e6); if(!nums.length) return;
    const n=nums.sort((a,b)=>(b.dec-a.dec)||(b.n-a.n))[0].n, score=(OCR_BEST.test(l.t)?2:1)*1e7+l.y;
    if(!best||score>best.score) best={n,score};
  });
  if(best){out.amount=best.n;out.sure=true}
  else{ // no "total" word: the biggest money-looking number (with decimals), as a guess
    const all=[]; L.forEach(l=>{if(!/\d{8,}|\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{1,2}:\d{2}/.test(l.t)) ocrNums(l.t).forEach(n=>{if(n.dec&&n.n<1e6) all.push(n.n)})});
    if(all.length) out.amount=Math.max(...all);
  }
  // date: the first valid one, not in the future, at most 90 days old
  const now=Date.now();
  for(const l of L){const m=l.t.match(/\b(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})\b|\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/); if(!m) continue;
    let y,mo,d; if(m[1]){y=+m[1];mo=+m[2];d=+m[3]} else {d=+m[4];mo=+m[5];y=+m[6]; if(y<100) y+=2000; if(mo>12&&d<=12){const t=d;d=mo;mo=t}}
    const ts=new Date(y,mo-1,d,12).getTime(), dt=new Date(ts);
    if(dt.getMonth()===mo-1&&dt.getDate()===d&&ts<=now+864e5&&ts>now-90*864e5){out.date=ts;break}}
  // merchant: the first line near the top with real Latin words
  for(const l of L.slice(0,6)){const w=l.t.replace(/[^A-Za-z&' -]/g,' ').replace(/\s+/g,' ').trim();
    if(w.replace(/[^A-Za-z]/g,'').length>=3&&!OCR_NOTNAME.test(l.t)&&!OCR_TOTAL.test(l.t)&&!/\d{3,}/.test(l.t)){out.merchant=(w===w.toUpperCase()?w.toLowerCase():w).slice(0,30).replace(/\b([a-z])/g,c=>c.toUpperCase());break}}
  if(out.merchant){out.cat=learnedCat(out.merchant); if(!out.cat){const hit=OCR_MERCH.find(([re])=>re.test(L.slice(0,8).map(l=>l.t).join(' '))); if(hit&&CAT[hit[1]]) out.cat=hit[1]}}
  return out;
}
const ocrWait={};
window.__ocrResult=(id,json)=>{const f=ocrWait[id]; if(!f) return; delete ocrWait[id]; let r=null; try{r=JSON.parse(json)}catch(e){} f(r||{ok:false})};
function ocrRun(blob){return new Promise(async res=>{
  const id='o'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  ocrWait[id]=res; setTimeout(()=>{if(ocrWait[id]){delete ocrWait[id];res({ok:false,err:'timeout'})}},25000);
  try{ if(!AB.ocrImage(id,await toB64(blob))){delete ocrWait[id];res({ok:false})} }catch(e){delete ocrWait[id];res({ok:false})}
})}
let ocrTok=0;
async function rcRead(blob){
  if(!(AB&&AB.ocrImage)) return;
  const tok=++ocrTok, wasEdit=editId, row=$('#rcRow');
  row.classList.add('rc-busy'); $('#rcReading').hidden=false;
  const r=await ocrRun(blob);
  if(tok!==ocrTok) return; row.classList.remove('rc-busy'); $('#rcReading').hidden=true;
  if(!$('#sheet').classList.contains('open')||editId!==wasEdit) return;
  if(!r.ok){toast(r.err==='model'?'أداة قراءة الإيصالات لسه بتتنزل على الموبايل، جرب كمان شوية':'مقدرتش أقرا الإيصال، الصورة اتحفظت وكمّل بإيدك',null,null,4500);return}
  const p=ocrParse(r), done=[];
  if(p.amount&&!String(amtIn.value).trim()){amtIn.value=String(p.amount); amtIn.dispatchEvent(new Event('input',{bubbles:true})); done.push('المبلغ '+fmt(p.amount))}
  if(p.merchant&&!$('#noteInput').value.trim()){$('#noteInput').value=p.merchant; done.push(p.merchant)}
  if(p.cat&&!selCat){const b=document.querySelector(`#cats [data-cat="${CSS.escape(p.cat)}"]`); if(b){b.click(); done.push(CAT[p.cat].name)}}
  if(p.date&&!wasEdit&&selDay===dayKey(Date.now())&&dayKey(p.date)!==selDay){selDay=dayKey(p.date); paintDate(); done.push(dkToDMY(selDay))}
  if(!done.length){toast(p.amount?'الإيصال اتقري، والخانات كانت مليانة أصلًا':'مقدرتش ألاقي المبلغ في الصورة، اكتبه بإيدك',null,null,4000);return}
  toast('قريت الإيصال: '+done.join(' · ')+(p.amount&&!p.sure?'. مش متأكد من المبلغ، راجعه':'. راجع وادوس حفظ'),null,null,5500);
}
async function rcPicked(e){
  const f=e.target.files&&e.target.files[0]; e.target.value=''; if(!f) return;
  const row=$('#rcRow'); row.classList.add('rc-busy');
  let b=null;
  try{b=await rcShrink(f); rcStage={blob:b}; rcPaint()}
  catch(err){toast('الملف ده مش صورة')}
  finally{row.classList.remove('rc-busy')}
  if(b) rcRead(b);
}
$('#rcCam').onchange=rcPicked; $('#rcGal').onchange=rcPicked;
$('#rcCamBtn').onclick=()=>$('#rcCam').click();
$('#rcGalBtn').onclick=()=>$('#rcGal').click();
$('#rcDel').onclick=()=>{rcStage='del'; rcPaint()};
$('#rcThumb').onclick=()=>{ if(rcStage&&rcStage.blob) rcViewOpen(rcStage.blob); else if(editId) rcViewOpen(editId) };
let rcViewUrl=null;
async function rcViewOpen(src){
  let b= src instanceof Blob? src : null, cap='';
  if(!b){ try{b=await rcGet(src)}catch(e){}
    const x=S.expenses.find(e=>e.id===src);
    if(x){const c=CAT[x.cat]||CAT.other; cap=`${c.e} ${c.name} · ${fmt(x.amount)} ${CS()}${x.note?' · '+x.note:''} · ${shortDate(x.ts)}`} }
  if(!b){toast('الصورة دي مش موجودة على الموبايل ده');return}
  if(rcViewUrl) URL.revokeObjectURL(rcViewUrl); rcViewUrl=URL.createObjectURL(b);
  $('#rcViewImg').src=rcViewUrl; $('#rcViewCap').textContent=cap;
  $('#rcView').classList.remove('zoom'); $('#rcView').hidden=false; $('#rcViewX').focus({preventScroll:true});
}
function rcViewClose(){
  $('#rcView').hidden=true; $('#rcViewImg').removeAttribute('src');
  if(rcViewUrl){URL.revokeObjectURL(rcViewUrl); rcViewUrl=null}
}
$('#rcViewX').onclick=rcViewClose;
$('#rcViewImg').onclick=()=>$('#rcView').classList.toggle('zoom');
$('#rcScroll').onclick=e=>{if(e.target===$('#rcScroll')) rcViewClose()};
document.addEventListener('click',e=>{const b=e.target.closest('[data-rc]'); if(!b) return; e.stopPropagation(); rcViewOpen(b.dataset.rc)});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#rcView').hidden) rcViewClose()});
/* backup: receipts travel as JPEG data URLs, up to ~15 MB of photos so the file stays shareable */
function blobToDataUrl(b){return new Promise((res,rej)=>{const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=()=>rej(r.error); r.readAsDataURL(b)})}
async function rcExport(){
  if(!RC.ids.size) return {out:null,skipped:0};
  const live=new Set(S.expenses.map(e=>e.id)), out={}; let total=0, skipped=0;
  for(const id of RC.ids){ if(!live.has(id)) continue;
    let b=null; try{b=await rcGet(id)}catch(e){} if(!b) continue;
    if(total+b.size>15e6){skipped++;continue}
    total+=b.size; out[id]=await blobToDataUrl(b) }
  return {out:Object.keys(out).length?out:null, skipped};
}
const RC_DATAURL=/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/;
async function rcImport(map){
  if(!map||typeof map!=='object'||!RC.can) return 0;
  const live=new Set(S.expenses.map(e=>e.id)); let n=0;
  for(const [id,du] of Object.entries(map)){
    if(!isId(id)||!live.has(id)||typeof du!=='string'||du.length>8e6||!RC_DATAURL.test(du)) continue;
    try{const type=du.slice(5,du.indexOf(';')); await rcPut(id,new Blob([b64d(du.slice(du.indexOf(',')+1))],{type})); n++}catch(e){}
  }
  return n;
}
function rcLoad(){
  if(!RC.can) return;
  rcTx('readonly',st=>st.getAllKeys()).then(keys=>{
    RC.ids=new Set((keys||[]).filter(isId));
    if(RC.ids.size) renderAll();
    setTimeout(rcPrune,10000);
  }).catch(()=>{RC.can=false});
}

/* ===== Payments captured from bank / wallet notifications (Android) =====
   The native side keeps a small queue; we take it into S.capQ, show it on the home screen,
   and the user turns each one into an expense (or ignores it). */
const CAP_SHOW=3;
let capExpanded=false, capDetail=null;
function capPull(){
  if(!AB||!AB.takeCaptures) return false;
  let arr=[]; try{arr=JSON.parse(AB.takeCaptures()||'[]')}catch(e){}
  const have=new Set((S.capQ||[]).map(q=>q.id));
  const add=[]; (Array.isArray(arr)?arr:[]).map(cleanCap).forEach(c=>{
    if(!c||have.has(c.id)) return;
    if(c.dir==='in'&&!S.accounts.length) return; // incoming money is only offered to people who track accounts
    const dupOf=(S.capQ||[]).concat(add).some(o=>o.dir===c.dir&&o.amount===c.amount&&o.at===c.at&&o.pkg===c.pkg&&o.text===c.text&&capCurrency(o)===capCurrency(c)); // the same operation reported twice
    if(!dupOf) add.push(c) });
  if(!add.length) return false;
  S.capQ=add.concat(S.capQ||[]).sort((a,b)=>b.at-a.at).slice(0,30); save(); return true;
}
window.__captures=show=>{
  const got=capPull();
  if(show){capWanted=true; setTimeout(runQuickAdd,150)}
  else if(got) renderHome();
};
const capCurrency=c=>!c.cur||/^(egp|le|l\.e\.?|جنيه|جنية|جنيها|جنيهات|ج\.?م?\.?|جم)$/i.test(c.cur)?'EGP':String(c.cur).toUpperCase();
const capCur=c=>esc(curSym(capCurrency(c)));
function capAmount(c,cur=S.currency){const from=capCurrency(c), k=from===cur?1:rateFor(from,cur);
  if(!(k>0)){toast('مفيش سعر صرف للعملية دي. اتصل بالنت وحاول تاني');ratesRefresh(false);return null}
  return r2(c.amount*k);
}
function capReference(c){return capDigits(c.text||'').match(/(?:\bref(?:erence)?|رقم العملية|مرجع العملية)\s*[:#-]?\s*([a-z0-9-]{6,})/i)?.[1]?.toLowerCase()||''}
const capAgo=at=>{const m=Math.round((Date.now()-at)/6e4); return m<1?'دلوقتي':m<60?`من ${m} دقيقة`:dayKey(at)===todayKey()?'النهارده '+timeStr(at):dayKey(at)===yestKey()?'امبارح '+timeStr(at):shortDate(at)+' '+timeStr(at)};
function capPay(c){
  if(c.method&&PAY[c.method]) return c.method;
  const want={card:/فيزا|كارت|بطاق|visa|card/i,wallet:/محفظ|كاش|wallet/i,instapay:/انستا|إنستا|insta/i}[c.method];
  const hit=want&&S.pays.find(p=>want.test(p.name)); return hit?hit.id:null;
}
function capCat(c){
  {const l=learnedCat(c.merchant); if(l) return l}
  const m=normAr(c.merchant);
  if(m){const hit=S.expenses.slice().sort((a,b)=>b.ts-a.ts).find(x=>x.note&&normAr(x.note.trim())===m&&CAT[x.cat]); if(hit) return hit.cat}
  try{const st=vNorm(c.merchant+' '+c.text).split(/\s+/).map(vStem).filter(Boolean); return voiceCat(st)}catch(e){return null}
}
