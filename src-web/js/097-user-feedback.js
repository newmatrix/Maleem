/* Feedback improvements: small controls over the existing financial model. */
function captureCurrencyCode(raw){
  const s=String(raw||'').trim(), codes={'ريال':'SAR','ريال سعودي':'SAR','ر.س':'SAR','ريال قطري':'QAR','ريال عماني':'OMR','درهم':'AED','درهم إماراتي':'AED','درهم اماراتي':'AED','درهم مغربي':'MAD','دولار':'USD','دولار أمريكي':'USD','دولار امريكي':'USD','يورو':'EUR','ليرة تركية':'TRY','ليرة سورية':'SYP','ليرة لبنانية':'LBP','دينار كويتي':'KWD','دينار بحريني':'BHD','دينار أردني':'JOD','دينار عراقي':'IQD'};
  return codes[s]||s.toUpperCase();
}
function entryCurrencyOptions(el,cur){
  el.innerHTML=CURRENCIES.map(c=>`<option value="${esc(c.id)}">${esc(c.id)} · ${esc(curSym(c.id))}</option>`).join('');el.value=cur||S.currency;
}
function entryOriginal(x){return x&&x.o&&!x.o.p?{a:x.o.a,c:x.o.c}:x?{a:x.amount,c:S.currency}:null}
function entryValue(raw,cur,old){
  if(!(Number.isFinite(raw)&&raw>0&&raw<MAXAMT)||!CURRENCIES.some(c=>c.id===cur))return null;
  const prev=entryOriginal(old);
  if(prev&&prev.c===cur&&r2(prev.a)===r2(raw))return old.amount;
  const k=cur===S.currency?1:rateFor(cur,S.currency), v=k>0?r2(raw*k):null;
  return v>0&&v<MAXAMT?v:null;
}
function entryAccountAmount(raw,cur,base,ac,old){
  const prev=entryOriginal(old);
  if(old&&old.acc===ac.id&&old.accAmt>0&&prev.c===cur&&r2(prev.a)===r2(raw))return old.accAmt;
  if(cur===ac.cur)return r2(raw);
  return toAcc(base,ac);
}
function entryStamp(day,time,keep){
  if(!isDK(day)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))return null;
  if(keep&&dayKey(keep)===day&&expenseClock(keep)===time)return keep;
  const [y,m,d]=day.split('-').map(Number),[h,n]=time.split(':').map(Number);
  const ts=new Date(y,m-1,d,h,n).getTime();return ts<=Date.now()?ts:null;
}
function paintEntryCurrency(){
  const c=$('#expenseCurrency').value||S.currency;
  $('#amountBox .cur').textContent=curSym(c);$('#inCur').textContent=curSym($('#incomeCurrency').value||S.currency);
  ipFeeSync();
}
$('#expenseCurrency').onchange=paintEntryCurrency;$('#incomeCurrency').onchange=paintEntryCurrency;
$('#ipFeeAmount').addEventListener('input',()=>{$('#ipFeeAmount').dataset.manual='1'});
$('#screenshotBlock').onchange=e=>{S.blockScreenshots=e.target.checked;save();applySecure()};

function categoryGroup(c){
  if(c.g)return c.g;
  const more=CAT_GROUPS.find(g=>g[1].some(x=>x.id===c.id));if(more)return more[0];
  const basics={food:0,groc:0,cafe:0,trans:1,fuel:1,car:1,bills:2,home:2,phone:3,health:4,beauty:4,shop:5,clothes:5,fun:6,subs:6,travel:6,edu:7,charity:8,family:8,gifts:8,bank:9};
  return basics[c.id]!==undefined?CAT_GROUPS[basics[c.id]][0]:'فئاتي';
}
function renderGroupedCategories(){
  const groups=new Map();S.cats.forEach(c=>{const key=categoryGroup(c);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(c)});
  $('#cats').classList.add('grouped');$('#catGrouping').checked=true;
  $('#cats').innerHTML=[...groups].map(([name,cats])=>`<details class="cat-group"${cats.some(c=>c.id===selCat)?' open':''}><summary><span data-notr>${esc((CAT_GROUPS.some(g=>g[0]===name)||name==='فئاتي')?TX(name):name)}</span><small>${cats.length}</small></summary><div class="cat-group-grid">${cats.map(c=>`<button type="button" class="cat" data-cat="${esc(c.id)}" aria-pressed="${c.id===selCat}"><span class="e">${esc(c.e)}</span><span class="cat-name" data-notr>${esc(c.name)}</span></button>`).join('')}</div></details>`).join('');
}
$('#catGrouping').onchange=e=>{S.catGrouping=e.target.checked;save();renderCatGrid();markCat()};

/* Linked obligations remain their original records. No duplicate fixed expense is created. */
function renderLinkedObligations(){
  const pins=new Set(S.fixedLinks||[]), all=[...S.insts.map(p=>({key:'inst:'+p.id,name:p.name,p})),...S.gams.map(g=>({key:'gam:'+g.id,name:g.name,g}))];
  $('#fixedLinkChoices').innerHTML=all.map(x=>`<label class="pay-row"><span class="txt" data-notr>${esc(x.name)}</span><input type="checkbox" data-fixed-link="${esc(x.key)}"${pins.has(x.key)?' checked':''}></label>`).join('')||'<p class="hint">مفيش أقساط أو جمعيات لسه</p>';
  $('#fixedLinkedList').innerHTML=all.filter(x=>pins.has(x.key)).map(x=>{
    let rows='';
    if(x.p)rows=x.p.items.filter(i=>!itemDone(i)).map(i=>`<div class="pay-row"><span>${esc(dkToDMY(i.due))} · ${money(itemRem(i))} ${CS()}</span><button type="button" class="btn" data-ipay="${esc(i.id)}">سجّل الدفعة</button></div>`).join('');
    else for(let n=0;n<x.g.members;n++){const mk=addMonths(x.g.start,n);if(!(x.g.paid||{})[mk])rows+=`<div class="pay-row"><span>${esc(monthOnly(mk))} · ${money(gamMonthly(x.g))} ${CS()}</span><button type="button" class="btn" data-linked-gpay="${esc(x.g.id)}|${mk}">سجّل الدفعة</button></div>`}
    return `<details class="linked-obligation"><summary data-notr>${esc(x.name)}</summary>${rows||'<p class="hint">كل الدفعات متسجلة</p>'}</details>`;
  }).join('');
}
$('#fixedLinkChoices').onchange=e=>{const b=e.target.closest('[data-fixed-link]');if(!b)return;const s=new Set(S.fixedLinks||[]);if(b.checked)s.add(b.dataset.fixedLink);else s.delete(b.dataset.fixedLink);S.fixedLinks=[...s];save();renderLinkedObligations()};
document.addEventListener('click',e=>{const b=e.target.closest('[data-linked-gpay]');if(!b)return;const [id,mk]=b.dataset.linkedGpay.split('|'),g=S.gams.find(x=>x.id===id);if(g&&!(g.paid||{})[mk])toggleGamPaid(id,mk)});

/* Balances are derived from ledger rows. Removing/changing a row reverses its old effect automatically. */
function editDebtEntry(debtId,kind,rowId){
  const d=S.debts.find(x=>x.id===debtId);if(!d)return;
  if(kind==='start'){closeSheets();openDebtSheet(d.id);return}
  const row=(kind==='pay'?d.payments:d.adds||[]).find(x=>x.id===rowId);if(!row)return;
  closeSheets();
  openForm({title:'تعديل حركة السلفة',fields:[{key:'amount',type:'money',label:'المبلغ',value:row.amount},{key:'acc',type:'select',label:'الحساب المرتبط',value:row.acc||'',options:[{v:'',t:'من غير حساب'},...S.accounts.map(a=>({v:a.id,t:accDisp(a)+' · '+curSym(a.cur)}))]}],onSave:v=>{
    const amount=r2(evalExpr(v.amount));if(!(amount>0&&amount<MAXAMT))return 'اكتب المبلغ';
    const paid=debtPaid(d)+(kind==='pay'?amount-row.amount:0),total=debtTotal(d)+(kind==='add'?amount-row.amount:0);
    if(paid>total+EPS)return 'المبلغ أقل من الدفعات المسجلة';
    const ac=ACC(v.acc);let aa=null;
    if(ac){aa=row.acc===ac.id&&amount===row.amount?row.accAmt:debtToAcc(amount,ac,debtCur(d));if(!(aa>0))return 'مفيش سعر صرف للعملية دي';}
    const before=JSON.parse(JSON.stringify(d));row.amount=amount;
    if(ac){row.acc=ac.id;row.accAmt=aa}else{delete row.acc;delete row.accAmt}
    d.closed=debtRem(d)<=0;d.closedAt=d.closed?(d.closedAt||Date.now()):null;save();renderAll();
    toast('اتعدلت حركة السلفة','تراجع',()=>{Object.assign(d,before);save();renderAll()},5000);
  }});
  $('#formBody .amount-box .c').textContent=debtSym(d);
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-debt-entry]');if(b){const [id,kind,row]=b.dataset.debtEntry.split('|');editDebtEntry(id,kind,row)}});

function recordedAvailable(){
  // Only account balances are known cash balances. Unlinked free income keeps its existing, separate chip.
  const total=moneyTotals();return total.missing.length?null:total.tot;
}
function renderFeedbackControls(){
  $('#screenshotBlock').checked=S.blockScreenshots!==false;
  $('#catGrouping').checked=!!S.catGrouping;
  renderLinkedObligations();
  const value=recordedAvailable(),known=S.accounts.length;
  $('#availableBalance').hidden=!known;
  $('#availableValue').textContent=value===null?TX('سعر صرف ناقص'):fmt(value)+' '+CS();
}
