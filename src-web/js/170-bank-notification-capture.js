/* --- which of MY accounts is this notification about? --- */
const capDigits=t=>String(t||'').replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
const capNorm=t=>normAr(String(t||'')).toLowerCase();
/* card last 4 digits (after a mask, "ending", "رقم", "تنتهي بـ"...) and wallet phone numbers (full or masked), each with the words just before it */
function capHints(c){
  const t=capDigits((c.text||'')+' '+(c.merchant||'')), last4=new Set(), phones=[]; let m;
  const re1=/(?:[*xX•·]{2,}\s*|\.{3,}\s*|(?:ending|ends)(?:\s+in|\s+with)?\s*[:#]?\s*|(?:card|visa|master\w*|meeza)\s*(?:no\.?|number|#)?\s*[:#]?\s*|(?:ينتهي|تنتهي|المنتهي|المنتهية)\s*(?:بـ|ب)?\s*|(?:رقم|كارت|بطاقة|فيزا|ميزة|حسابكم|حسابك)\s*(?:رقم)?\s*[:#]?\s*)(\d{4})(?!\d)(?!\s*(?:جنيه|جنية|ج\.?\s?م|egp|le\b|l\.e))/gi;
  while((m=re1.exec(t))) last4.add(m[1]);
  const re2=/(?<!\d)(?:\+?20|0)?(1[0125]\d{8})(?!\d)/g; while((m=re2.exec(t))) phones.push({full:m[1],before:t.slice(Math.max(0,m.index-16),m.index)});
  const re3=/(?<!\d)(?:\+?20|0)?1[0125][*xX•.]{3,}(\d{2,4})(?!\d)/g; while((m=re3.exec(t))) phones.push({tail:m[1],before:t.slice(Math.max(0,m.index-16),m.index)});
  return {last4:[...last4],phones};
}
const capPhoneOf=a=>capDigits(a.phone).replace(/\D/g,'').replace(/^20/,'').replace(/^0/,'');
/* src = the account the money LEFT, dst = the account it went INTO, weak = only a guess from the app/bank name (never used without asking) */
function capMatch(c){
  const h=capHints(c), out={src:null,dst:null,weak:null,amb:false}, toWords=/(?:إلى|الى|الي|to|لمحفظة|لحساب|لرقم)\s*(?:محفظة|محفظه|حساب|رقم|wallet|account)?\s*(?:رقم)?\s*:?\s*$/i, fromWords=/(?:من|from)\s*:?\s*(?:رقم|محفظة|محفظه)?\s*$/i;
  const set=(role,a)=>{ if(!a) return; if(out[role]&&out[role].id!==a.id) out.amb=true; else out[role]=a };
  S.accounts.forEach(a=>{
    if(a.last4&&h.last4.includes(a.last4)) set(c.dir==='in'?'dst':'src',a);
    else if(a.phone){ const ap=capPhoneOf(a);
      h.phones.forEach(p=>{ const hit=p.full? p.full===ap : (p.tail&&ap.endsWith(p.tail)); if(!hit) return;
        const toward=toWords.test(p.before), from=fromWords.test(p.before);
        set(c.dir==='in'? (from?'src':'dst') : (toward?'dst':'src'),a) }) }
  });
  if(!out.src&&!out.dst&&!out.amb){ const label=capNorm((c.source||'')+' '+(c.text||'')), hit=S.accounts.filter(a=>{const n=capNorm(a.bank||a.name); return n.length>=3&&label.includes(n)}); if(hit.length===1) out.weak=hit[0] }
  return out;
}
/* two notifications about ONE move between my own accounts (money out of one, the same amount into the other, minutes apart) */
var capNoPair=new Set();
function capView(){
  const q=S.capQ||[], used=new Set(), list=[];
  q.forEach(c=>{ if(used.has(c.id)) return; used.add(c.id);
    const mate= S.accounts.length>1&&!capNoPair.has(c.id)&&!capIsCash(c)? q.find(o=>!used.has(o.id)&&!capNoPair.has(o.id)&&!capIsCash(o)&&o.dir!==c.dir&&o.amount===c.amount&&capCurrency(o)===capCurrency(c)&&!!capReference(c)&&capReference(o)===capReference(c)&&Math.abs(o.at-c.at)<=5*6e4) : null; // a cash withdrawal is never one half of a move between my accounts
    if(mate){used.add(mate.id); const o=c.dir==='out'?c:mate, i=c.dir==='out'?mate:c; list.push({pair:true,id:c.id,o,i,mo:capMatch(o),mi:capMatch(i)})}
    else list.push({pair:false,id:c.id,c,m:capMatch(c)}) });
  return list;
}
/* A cash withdrawal (ATM, a bank cashier, a wallet agent): the money only moved into the person's pocket, so it is not an expense (round 47).
   Strong words decide on their own; a bare «سحب» counts only when nothing in the message says it was a purchase or a transfer to someone. */
const CAP_CASH_STRONG=/\batm\b|cash\s*withdraw|صراف|ماكين|سحب\s*(?:نقد|كاش)|مسحوبات\s*نقدي/i;
function capIsCash(c){
  if(!c||c.dir!=='out') return false;
  const t=capDigits((c.text||'')+' '+(c.merchant||''));
  if(CAP_CASH_STRONG.test(t)) return true;
  return !String(c.merchant||'').trim()&&/سحب|withdraw/i.test(t)&&!/شراء|مشتريات|purchase|\bpos\b|لدى|لدي|تحويل|حوالة|transfer|sent/i.test(t);
}
/* open loans to someone (ليك عند حد) that money coming in may be paying back: only the same amount (what is left, the loan, or one addition) */
function capDebtCands(){ return S.debts.filter(d=>debtCur(d)===S.currency&&d.dir==='in'&&!d.closed&&debtRem(d)>0) }
function capDebtMatch(c){
  const k=capCurrency(c)===S.currency?1:rateFor(capCurrency(c),S.currency); if(!(k>0)) return null;
  const v=r2(c.amount*k), same=a=>Math.abs(a-v)<0.01, sender=capNorm(c.merchant||'').trim(); if(!sender) return null;
  const hit=capDebtCands().filter(d=>{const r=debtRem(d); return capNorm(d.person).trim()===sender&&v<=r+0.01&&(same(r)||same(d.amount)||(d.adds||[]).some(a=>same(a.amount)))});
  return hit.sort((a,b)=>(same(debtRem(a))?0:1)-(same(debtRem(b))?0:1)||(b.created||0)-(a.created||0))[0]||null;
}
/* the message itself says it is a refund / a reversal */
const CAP_REFUND=/refund|reversal|reversed|استرداد|مسترد|مرتجع|استرجاع|ارتجاع|عكس\s*(?:عملي|قيد)|(?:الغاء|إلغاء)\s*عملي/i;
/* what to do with it: kind = expense | income | transfer | cash | cashx | debtback | refund | ask (never guess when the account or the kind of operation is unclear) */
function capPlan(e){
  if(!S.accounts.length) return {kind:e.pair?'ask':(e.c.dir==='in'?'ask':capIsCash(e.c)?'cashx':'expense')};
  if(e.pair){ const from=e.mo.src||e.mi.src, to=e.mi.dst||e.mo.dst; return {kind:'ask',from,to,mode:'transfer'} }
  const c=e.c, m=e.m, cash=capIsCash(c);
  if(m.amb) return {kind:'ask',mode:cash?'cash':''};
  if(c.dir==='out'){ if(m.src&&m.dst&&m.src.id!==m.dst.id) return {kind:'transfer',from:m.src,to:m.dst}; if(m.dst&&!m.src) return {kind:'ask',to:m.dst,mode:'transfer'};
    if(cash) return m.src&&m.src.type!=='cash'? {kind:'cash',from:m.src} : {kind:'ask',mode:'cash',weak:m.weak};
    if(m.src) return {kind:'expense',acc:m.src}; return {kind:'ask',weak:m.weak} }
  if(m.src&&m.dst&&m.src.id!==m.dst.id) return {kind:'transfer',from:m.src,to:m.dst};
  if(m.src&&!m.dst) return {kind:'ask',from:m.src,mode:'transfer'};
  if(m.dst){ if(CAP_REFUND.test(capDigits((c.text||'')+' '+(c.merchant||'')))) return {kind:'refund',acc:m.dst};
    const d=capDebtMatch(c); if(d) return {kind:'ask',was:'debtback',acc:m.dst,debt:d};
    return {kind:'income',acc:m.dst} }
  return {kind:'ask',weak:m.weak};
}
function capLabel(e,pl){
  const nm=a=>esc(a.name);
  if(pl.kind==='transfer') return `⇄ تحويل بين حساباتك: ${nm(pl.from)} ← ${nm(pl.to)}`;
  if(pl.kind==='expense'&&pl.acc) return `من «${nm(pl.acc)}»`;
  if(pl.kind==='income') return `على «${nm(pl.acc)}»`;
  if(pl.kind==='cash') return `مش مصروف · من «${nm(pl.from)}»`;
  if(pl.kind==='cashx') return 'مش مصروف: سجّل اللي هتصرفه منه وقت ما تصرفه';
  if(pl.kind==='debtback') return `سلفة «${esc(pl.debt.person)}» رجعت؟`;
  if(pl.kind==='refund') return 'فلوس رجعت من مصروف؟';
  if(pl.kind==='ask'&&pl.mode==='cash') return '⚠ سحب كاش، مش متأكد من الحساب: هسألك';
  if(pl.kind==='ask') return `⚠ مش متأكد من الحساب${pl.mode==='transfer'||e.pair?' أو نوع العملية':''}: هسألك`;
  return '';
}
function renderCaps(){
  const box=$('#capBox'), q=S.capQ||[];
  if(!q.length){box.innerHTML='';return}
  const view=capView(), list=capExpanded? view : view.slice(0,CAP_SHOW);
  box.innerHTML=`<div class="upc cap"><div class="upc-h"><b>💳 عمليات لقطناها (${q.length})</b><button type="button" data-capall>تجاهل الكل</button></div>
    ${list.map(e=>{ const c=e.pair?e.o:e.c, pl=capPlan(e), lab=capLabel(e,pl), isIn=!e.pair&&c.dir==='in';
      const icon= e.pair?'⇄' : (pl.kind==='cash'||pl.kind==='cashx'||pl.mode==='cash')?'💵' : (pl.kind==='debtback'||pl.kind==='refund')?'↩' : isIn?'📥' : c.method==='instapay'?'📲':c.method==='wallet'?'👛':c.method==='card'?'💳':'🏦';
      const btn= pl.kind==='transfer'?'سجّل تحويل' : pl.kind==='income'?'سجّل دخل' : pl.kind==='cash'?'سجّل سحب' : pl.kind==='cashx'?'تمام' : pl.kind==='debtback'?'سجّل استلام' : pl.kind==='refund'?'سجّل رجوع' : pl.kind==='ask'?'حدّد' : 'سجّل';
      const title= e.pair? 'تحويل بين حساباتك؟' : (pl.kind==='cash'||pl.kind==='cashx')? 'سحب كاش' : isIn? 'فلوس داخلة' : (c.merchant||c.source||'عملية دفع');
      return `<div class="ur" data-capid="${esc(e.id)}"><div class="ui">${icon}</div>
      <div class="ut" data-capdet="${esc(e.id)}"><b>${money(c.amount)} <small style="display:inline">${capCur(c)}</small></b>
        <small>${esc(title)}${!e.pair&&c.merchant&&c.source?' · '+esc(c.source):''} · ${esc(capAgo(c.at))}</small>
        ${lab?`<small class="cap-acc">${lab}</small>`:''}${!e.pair?`<button type="button" class="cap-alt" data-capask="${esc(e.id)}">نوع تاني؟</button>`:''}
        ${capDetail===e.id?`<div class="cap-det">${esc(c.text)}${e.pair&&e.i?'<br>'+esc(e.i.text):''}${e.pair?`<button type="button" data-capsplit="${esc(e.id)}">مش تحويل؟ سجّلهم لوحدهم</button>`:''}${!e.pair&&c.pkg?`<label class="cap-cur"><span>عملة عمليات التطبيق ده</span><select data-capcur="${esc(c.pkg)}" aria-label="عملة عمليات التطبيق ده"><option value="">زي ما في الرسالة</option>${CURRENCIES.map(x=>`<option value="${esc(x.id)}"${S.capCurBy[c.pkg]===x.id?' selected':''}>${esc(x.id)} ${esc(curSym(x.id))}</option>`).join('')}</select></label>`:''}${!e.pair&&c.pkg?`<button type="button" data-capblock="${esc(c.id)}">تجاهل كل اللي جاي من «${esc(c.source||'التطبيق ده')}»</button>`:''}</div>`:''}</div>
      <div class="cap-act"><button type="button" class="cap-ok" data-capok="${esc(e.id)}">${btn}</button><button type="button" class="cap-no" data-capno="${esc(e.id)}" aria-label="تجاهل العملية دي">✕</button></div></div>`}).join('')}
    ${view.length>CAP_SHOW?`<button type="button" class="cap-more" data-capmore>${capExpanded?'عرض أقل':'+ '+(view.length-CAP_SHOW)+' كمان'}</button>`:''}</div>`;
}
/* the person confirms: open the matching sheet already filled in (nothing is saved before they press save) */
/* the InstaPay fee: pct % of the amount, between min and max */
const ipFeeOf=a=>r2(Math.min(S.ipFee.max,Math.max(S.ipFee.min,a*S.ipFee.pct/100)));
/* a fee to suggest for this capture, or 0: only for money going OUT through InstaPay, in pounds, when the person turned it on, and only when
   the message does not already talk about a fee (then it is probably the fee itself, or the amount already includes it) */
function capIpFee(c){
  if(!S.ipFee.on||S.currency!=='EGP'||c.dir!=='out'||c.method!=='instapay') return 0;
  if(capCurrency(c)!=='EGP') return 0;
  if(/رسوم|عمولة|عموله|مصاريف الخدمة|\bfees?\b|\bcharges?\b/i.test(capDigits((c.text||'')+' '+(c.merchant||'')))) return 0;
  return ipFeeOf(c.amount);
}
function capConfirm(e){
  const pl=capPlan(e), c=e.pair?e.o:e.c;
  if(pl.kind==='ask'){ openCapAsk(e,pl); return }
  if(pl.kind==='cashx'){ capRemove(c.id,'اتشال السحب: مش هيتحسب مصروف'); return }
  const dest=['cash','transfer'].includes(pl.kind)?pl.from.cur:pl.kind==='refund'&&pl.acc?pl.acc.cur:S.currency;
  const value=capAmount(c,dest); if(value==null) return;
  if(pl.kind==='cash'){ openCashMove(pl.from.id,'wd',{out:value,day:dayKey(c.at),caps:[c.id]}); return }
  if(pl.kind==='debtback'){ openPaySheet(pl.debt.id,{amount:value,acc:pl.acc.id,cap:c.id,ts:c.at}); return }
  if(pl.kind==='refund'){ openRefund({amount:value,acc:pl.acc.id,cap:c.id,ts:c.at}); return }
  if(pl.kind==='transfer'){ openTrSheet(null,{from:pl.from.id,to:pl.to.id,out:value,day:dayKey(c.at),caps:e.pair?[e.o.id,e.i.id]:[c.id],fee:pl.from.cur==='EGP'?capIpFee(c):0}); return }
  if(pl.kind==='income'){ openInSheet(null,{amount:value,src:c.merchant||c.source,acc:pl.acc.id,day:dayKey(c.at),cap:c.id}); return }
  openSheet(null,{amount:value,cat:capCat(c),note:c.merchant,pay:capPay(c),day:dayKey(c.at),cap:c.id,ts:c.at,acc:pl.acc?pl.acc.id:undefined,ipf:capIpFee(c)>0});
}
/* --- "which account / what kind?" when the app is not sure --- */
var caFor=null, caMode='';
function openCapAsk(e,pl){
  caFor=e.id; const c=e.pair?e.o:e.c, isIn=!e.pair&&c.dir==='in', was=pl.was||'', hasAcc=!!S.accounts.length;
  caMode= pl.mode==='transfer'||e.pair||was==='transfer'? 'transfer' : isIn? (was==='debtback'||was==='refund'?was:'income')
    : (pl.mode==='cash'||was==='cash'||was==='cashx')? (hasAcc?'cash':'cashx') : 'expense';
  $('#caTitle').textContent= was? 'العملية دي إيه؟' : 'العملية دي محتاجة تحديد';
  $('#caInfo').textContent=`${fmt(c.amount)} ${capCur(c).replace(/&[a-z]+;/g,'')} · ${e.pair?'خروج من حساب ودخول لحساب تاني':(c.merchant||c.source||'عملية')} · ${capAgo(c.at)}`;
  const kinds= e.pair? [['transfer','تحويل بين حساباتي'],['split','مش تحويل']]
    : isIn? [['income','دخل']].concat(capDebtCands().length?[['debtback','رجوع سلفة']]:[], rfCands().length?[['refund','رجعت من مصروف']]:[], [['transfer','تحويل من حساب تاني']])
    : hasAcc? [['expense','مصروف'],['cash','سحب كاش'],['loan','سلّفتها لحد'],['transfer','تحويل لحساب تاني']]
    : [['expense','مصروف'],['cashx','سحب كاش'],['loan','سلّفتها لحد']];
  $('#caKind').innerHTML=kinds.map(k=>`<button type="button" data-ck="${k[0]}">${k[1]}</button>`).join('');
  const src=pl.from||(e.pair?e.mo.src:null)||(!isIn&&e.m?e.m.src:null), dst=pl.to||pl.acc&&isIn&&pl.acc||(e.pair?e.mi.dst:null)||(isIn&&e.m?e.m.dst:null), weak=pl.weak||null;
  caPaint(e,{src,dst,weak,debt:pl.debt||null}); $('#caErr').textContent='';
  $('#scrim').classList.add('open'); $('#caSheet').classList.add('open');
}
var caPre={};
function caPaint(e,pre){
  if(pre) caPre=pre;
  document.querySelectorAll('#caKind button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.ck===caMode?'true':'false'));
  const c=e.pair?e.o:e.c, isIn=!e.pair&&e.c.dir==='in', opt=a=>`<option value="${esc(a.id)}">${esc(accDisp(a))} (${esc(curSym(a.cur))})</option>`, accs=S.accounts.map(opt).join('');
  const none='<option value="">من غير حساب</option>', ph='<option value="" disabled>اختار الحساب</option>';
  $('#caOtherRow').hidden=true; $('#caAcc').parentElement.hidden= caMode==='cashx'||!S.accounts.length&&caMode!=='transfer';
  if(caMode==='transfer'){
    $('#caAccLab').textContent='من حساب'; $('#caOtherLab').textContent='إلى حساب'; $('#caOtherRow').hidden=false;
    $('#caAcc').innerHTML=ph+accs; $('#caOther').innerHTML=ph+accs;
    $('#caAcc').value=caPre.src?caPre.src.id:''; $('#caOther').value=caPre.dst?caPre.dst.id:'';
  }else if(caMode==='cash'){
    $('#caAccLab').textContent='اتسحبت من'; $('#caAcc').innerHTML=ph+S.accounts.filter(a=>a.type!=='cash').map(opt).join('');
    const p=caPre.src||caPre.weak; $('#caAcc').value=p&&p.type!=='cash'?p.id:'';
  }else if(caMode==='debtback'){
    $('#caAccLab').textContent='اتضافت على'; $('#caAcc').innerHTML=ph+none+accs; const p=caPre.dst||caPre.weak; $('#caAcc').value=p?p.id:'';
    const ds=capDebtCands(); $('#caOtherRow').hidden=false; $('#caOtherLab').textContent='سلفة مين؟';
    $('#caOther').innerHTML='<option value="" disabled>اختار السلفة</option>'+ds.map(d=>`<option value="${esc(d.id)}">${esc(d.person)} · فاضل ${fmt(debtRem(d))} ${esc(CS())}</option>`).join('');
    const m=caPre.debt||capDebtMatch(c); $('#caOther').value=m&&ds.includes(m)?m.id:'';
  }else{
    $('#caAccLab').textContent= isIn? (caMode==='refund'?'رجعت على':'اتضافت على') : caMode==='loan'?'الفلوس خرجت من':'اتخصمت من';
    $('#caAcc').innerHTML=ph+none+accs;
    const pick=isIn?(caPre.dst||caPre.weak):(caPre.src||caPre.weak); $('#caAcc').value=pick?pick.id:'';
  }
}
$('#caKind').onclick=e=>{const b=e.target.closest('[data-ck]'); if(!b) return;
  const en=capView().find(x=>x.id===caFor); if(!en) return;
  if(b.dataset.ck==='split'){ capNoPair.add(en.o.id); capNoPair.add(en.i.id); closeSheets(); renderHome(); toast('اتفصلوا: كل عملية لوحدها'); return }
  caMode=b.dataset.ck; caPaint(en)};
$('#caCancel').onclick=closeSheets;
$('#caIgnore').onclick=()=>{ const en=capView().find(x=>x.id===caFor); closeSheets(); if(en) capDrop(en) };
$('#caGo').onclick=()=>{
  const en=capView().find(x=>x.id===caFor); if(!en){closeSheets();return} const c=en.pair?en.o:en.c, E=m=>{$('#caErr').textContent=m};
  const a=$('#caAcc').value, o=$('#caOther').value;
  const dest=['cash','transfer'].includes(caMode)&&ACC(a)?ACC(a).cur:caMode==='refund'&&ACC(a)?ACC(a).cur:S.currency;
  const value=capAmount(c,dest); if(value==null) return;
  if(caMode==='transfer'){ if(!a||!o){E('اختار الحسابين');return} if(a===o){E('اختار حسابين مختلفين');return}
    const caps=en.pair?[en.o.id,en.i.id]:[c.id]; closeSheets(); setTimeout(()=>openTrSheet(null,{from:a,to:o,out:value,day:dayKey(c.at),caps,fee:ACC(a)&&ACC(a).cur==='EGP'?capIpFee(c):0}),260); return }
  if(caMode==='cash'){ if(!a){E('اختار الحساب اللي سحبت منه');return} closeSheets(); setTimeout(()=>openCashMove(a,'wd',{out:value,day:dayKey(c.at),caps:[c.id]}),260); return }
  if(caMode==='cashx'){ closeSheets(); capRemove(c.id,'اتشال السحب: مش هيتحسب مصروف'); return }
  if(caMode==='debtback'){ if(!o){E('اختار السلفة');return} closeSheets(); setTimeout(()=>openPaySheet(o,{amount:value,acc:a,cap:c.id,ts:c.at}),260); return }
  if(caMode==='refund'){ closeSheets(); setTimeout(()=>openRefund({amount:value,acc:a,cap:c.id,ts:c.at}),260); return }
  if(caMode==='loan'){ closeSheets(); setTimeout(()=>openDebtSheet(null,{dir:'in',amount:value,acc:a,cap:c.id,ts:c.at}),260); return }
  closeSheets();
  if(!en.pair&&en.c.dir==='in') setTimeout(()=>openInSheet(null,{amount:value,src:c.merchant||c.source,acc:a,day:dayKey(c.at),cap:c.id}),260);
  else setTimeout(()=>openSheet(null,{amount:value,cat:capCat(c),note:c.merchant,pay:capPay(c),day:dayKey(c.at),cap:c.id,ts:c.at,acc:a,ipf:capIpFee(c)>0}),260);
};
function capDrop(en){
  const ids=en.pair?[en.o.id,en.i.id]:[en.c.id], old=(S.capQ||[]).filter(q=>ids.includes(q.id));
  S.capQ=(S.capQ||[]).filter(q=>!ids.includes(q.id)); save(); renderHome();
  toast('اتجاهلت العملية','تراجع',()=>{S.capQ=old.concat(S.capQ||[]).sort((a,b)=>b.at-a.at);save();renderHome()},3000);
}
/* ===== Money that came back from an expense (round 47) =====
   A refund, a cancelled payment, or money a friend sent back after you recorded it as spent. Nothing new is stored: the expense gets
   smaller (or goes away when all of it came back), so the reports and the budget only see what was really spent. And the money lands:
   - back in the expense's own account: that expense's accAmt shrinks by the same amount;
   - in another account: the expense's account is made whole and a transfer (with a note) moves that money to where it really arrived;
   - an expense that was not paid from an account, back into an account: that account's opening balance grows (it is not income). */
function rfCands(){ const lim=Date.now()-120*864e5; return S.expenses.filter(e=>e.ts>=lim&&e.amount>0&&!e.inst&&!e.legacyReadOnly&&expenseCanManage(e)) }
const rfLabel=e=>(CAT[e.cat]||CAT.other).name+(e.note?': '+e.note:'')+' · '+fmt(e.amount)+' '+CS()+' · '+shortDate(e.ts);
const rfExp=()=>S.expenses.find(x=>String(x.id)===$('#rfExp').value)||null;
function openRefund(o){
  RF=Object.assign({exp:null,amount:0,acc:'',cap:null,ts:0,fixed:false},o||{});
  const want=+RF.amount||0, fixedE=RF.exp!=null? S.expenses.find(x=>String(x.id)===String(RF.exp)) : null;
  if(RF.exp!=null&&!fixedE){toast('المصروف ده مش موجود');RF=null;return}
  let L=fixedE? [fixedE] : rfCands();
  if(!L.length){toast('مفيش مصروفات في آخر 4 شهور ترجع منها فلوس');RF=null;return}
  const B0=ACC(RF.acc), cmp=e=>B0&&ACC(e.acc)&&ACC(e.acc).cur===B0.cur? e.accAmt : e.amount, same=e=>want>0&&Math.abs(cmp(e)-want)<0.01?0:1;
  const fits=e=>want>0&&cmp(e)<want-0.005?1:0; // an expense smaller than what came back cannot be the one
  L=L.slice().sort((a,b)=>same(a)-same(b)||fits(a)-fits(b)||(B0?(a.acc===B0.id?0:1)-(b.acc===B0.id?0:1):0)||b.ts-a.ts).slice(0,60);
  const sure=!!fixedE||want>0&&same(L[0])===0; // no expense with that exact amount: the person picks it, nothing is chosen for them
  $('#rfExp').innerHTML=(sure?'':'<option value="" disabled>اختار المصروف</option>')+L.map(e=>`<option value="${esc(String(e.id))}">${esc(rfLabel(e))}</option>`).join(''); $('#rfExp').value=sure?String(L[0].id):'';
  $('#rfExpRow').hidden=!!fixedE;
  $('#rfTitle').textContent= fixedE? 'رجعتلي فلوس من المصروف ده' : 'فلوس رجعتلك من مصروف';
  $('#rfInfo').textContent= fixedE? rfLabel(fixedE)+'. اللي رجع بيقلل المصروف، ومش بيتحسب دخل.' : RF.cap? `وصلك ${fmt(want)} ${B0?curSym(B0.cur):CS()} ${capAgo(RF.ts)}. اختار المصروف اللي الفلوس دي رجعت منه: هيقل، ومش هتتحسب دخل.` : 'اللي رجع بيقلل المصروف، ومش بيتحسب دخل.';
  $('#rfAmt').value= want>0? String(want) : ''; $('#rfErr').textContent=''; $('#rfAmtBox').classList.remove('err');
  rfAccOpts(true); rfPaint();
  openSheetEl('rfSheet'); if(!want) setTimeout(()=>$('#rfAmt').focus({preventScroll:true}),300);
}
function rfAccOpts(init){
  const e=rfExp(), A=e&&ACC(e.acc), keep=init?RF.acc:$('#rfAcc').value;
  $('#rfAccRow').hidden=!S.accounts.length;
  $('#rfAcc').innerHTML=(A?'':'<option value="">من غير حساب</option>')+S.accounts.map(a=>`<option value="${esc(a.id)}">${esc(accDisp(a))} (${esc(curSym(a.cur))})</option>`).join('');
  $('#rfAcc').value= ACC(keep)? keep : A? A.id : '';
  $('#rfAccHint').textContent= A? `المصروف اتدفع من «${accDisp(A)}»` : 'المصروف ده مكانش من حساب';
}
function rfCalc(){
  const e=rfExp(); if(!e) return {err:'اختار المصروف'};
  const r=evalExpr($('#rfAmt').value); if(!(r>0&&r<MAXAMT)) return {err:'اكتب المبلغ اللي رجع'};
  const B=ACC($('#rfAcc').value), A=e.acc&&ACC(e.acc)||null;
  if(A){
    if(!B) return {err:'اختار الحساب اللي الفلوس رجعت عليه'};
    let rA=r2(r); if(B.cur!==A.cur){ const k=rateFor(B.cur,A.cur); if(!(k>0)) return {err:'مفيش سعر صرف بين العملتين دلوقتي. جرّب لما النت يشتغل',rate:true}; rA=r2(r*k) }
    if(rA>e.accAmt+0.005) return {err:`المبلغ أكبر من المصروف نفسه (${fmt(e.accAmt)} ${curSym(A.cur)})`};
    let full=rA>=e.accAmt-0.005, left=full?0:r2(e.amount*(1-rA/e.accAmt)); if(!full&&left<0.01){full=true;left=0}
    return {e,r:r2(r),A,B,rA:full?e.accAmt:rA,full,left};
  }
  const main= B? toMain(r,B.cur) : r; if(main==null) return {err:'مفيش سعر صرف للعملة دي دلوقتي. جرّب لما النت يشتغل',rate:true};
  if(main>e.amount+0.005) return {err:`المبلغ أكبر من المصروف نفسه (${fmt(e.amount)} ${CS()})`};
  let full=main>=e.amount-0.005, left=full?0:r2(e.amount-main); if(!full&&left<0.01){full=true;left=0}
  return {e,r:r2(r),A:null,B,full,left};
}
function rfPaint(){
  const B=ACC($('#rfAcc').value); $('#rfCur').textContent=B?curSym(B.cur):CS(); $('#rfErr').textContent=''; $('#rfAmtBox').classList.remove('err');
  const s=rfCalc(); if(s.err){$('#rfAfter').textContent='';return}
  let t= s.full? 'المصروف هيتشال، لأن فلوسه رجعت كلها.' : `المصروف هيبقى ${fmt(s.left)} ${CS()} بدل ${fmt(s.e.amount)} ${CS()}.`;
  if(s.A&&s.B.id!==s.A.id) t+=` والفلوس هتتحسب في «${accDisp(s.B)}»، وهنسجّل تحويل من «${accDisp(s.A)}» عشان الأرصدة تفضل مظبوطة.`;
  else if(s.B) t+=` ورصيد «${accDisp(s.B)}» هيزيد ${fmt(s.r)} ${curSym(s.B.cur)}.`;
  $('#rfAfter').textContent=t;
}
$('#rfExp').onchange=()=>{rfAccOpts(false);rfPaint()};
$('#rfAcc').onchange=rfPaint;
$('#rfAmt').addEventListener('input',rfPaint);
$('#rfCancel').onclick=closeSheets;
$('#rfSave').onclick=()=>{
  const s=rfCalc(); if(s.err){$('#rfErr').textContent=s.err; if(/المبلغ/.test(s.err)) $('#rfAmtBox').classList.add('err'); if(s.rate) ratesRefresh(false); return}
  const e=s.e, idx=S.expenses.indexOf(e), snap=JSON.parse(JSON.stringify(e)), when=RF&&RF.ts>0?Math.min(RF.ts,Date.now()):Date.now();
  const capId=RF&&RF.cap, capOld=capId?(S.capQ||[]).find(q=>q.id===capId):null; let tr=null, openOld=null;
  if(s.full) S.expenses.splice(idx,1);
  else { e.amount=s.left; delete e.o; if(s.A) e.accAmt=r2(e.accAmt-s.rA) }
  if(s.A&&s.B.id!==s.A.id){ tr={id:uid(),ts:when,from:s.A.id,to:s.B.id,out:s.rA,in:s.r,fee:0,note:str('رجوع من مصروف: '+(e.note||(CAT[e.cat]||CAT.other).name),80)};
    if(s.A.cur!==s.B.cur){tr.rate=s.r/s.rA;tr.rs='m'} S.transfers.push(tr) }
  if(!s.A&&s.B){ openOld=s.B.open; s.B.open=r2(s.B.open+s.r) }
  if(capId) S.capQ=(S.capQ||[]).filter(q=>q.id!==capId);
  const logE={id:uid(),ts:when,amount:s.full?snap.amount:r2(snap.amount-s.left),cat:snap.cat,note:str(snap.note||'',80),full:!!s.full,acc:s.B?s.B.id:'',accName:s.B?str(accDisp(s.B),40):''}; // the log entry (undo removes it)
  S.refunds.unshift(logE); if(S.refunds.length>300) S.refunds.length=300;
  save(); closeSheets(); renderAll();
  toast(s.full?'اتشال المصروف: فلوسه رجعت كلها':`المصروف بقى ${fmt(s.left)} ${CS()}`,'تراجع',()=>{
    const j=S.expenses.findIndex(x=>String(x.id)===String(snap.id));
    if(j>=0) S.expenses[j]=snap;
    else { if(S.space&&snap.sp===S.space.code&&expenseCanManage(snap)) S.space.manual=Array.from(new Set([...(S.space.manual||[]),String(snap.id)])); S.expenses.splice(Math.min(idx,S.expenses.length),0,snap) }
    if(tr) S.transfers=S.transfers.filter(t=>t.id!==tr.id);
    S.refunds=S.refunds.filter(x=>x.id!==logE.id);
    if(openOld!=null&&ACC(s.B.id)) ACC(s.B.id).open=openOld;
    if(capOld&&!(S.capQ||[]).some(q=>q.id===capOld.id)) S.capQ=[capOld].concat(S.capQ||[]).sort((a,b)=>b.at-a.at);
    save(); renderAll() },6000);
};
/* an expense that was really a cash withdrawal (recorded before round 47, or by mistake): it becomes a transfer to the cash account */
function expToCash(id){
  const e=S.expenses.find(x=>String(x.id)===String(id)), a=e&&ACC(e.acc); if(!a||a.type==='cash'||!(e.accAmt>0)) return;
  if(!expenseCanManage(e)){toast('مصروفات الأعضاء الآخرين للقراءة فقط');return}
  let c=cashAccFor(a.cur), made=false;
  if(!c){ c={id:uid(),name:'كاش',type:'cash',bank:'',cur:a.cur,open:0,last4:'',phone:'',ts:Date.now()}; S.accounts.push(c); made=true }
  const i=S.expenses.indexOf(e), tr={id:uid(),ts:e.ts,from:a.id,to:c.id,out:r2(e.accAmt),in:r2(e.accAmt),fee:0,note:str('كان متسجل مصروف'+(e.note?': '+e.note:''),80)};
  S.expenses.splice(i,1); S.transfers.push(tr);
  save(); renderAll(); checkAlerts();
  toast(`بقى سحب كاش ${fmt(tr.out)} ${curSym(a.cur)} من «${accDisp(a)}» لـ«${accDisp(c)}»، ومش محسوب مصروف${made?'. اتعمل حساب «كاش» جديد':''}`,'تراجع',()=>{
    S.transfers=S.transfers.filter(t=>t.id!==tr.id);
    if(made&&!accUsed(c.id)) S.accounts=S.accounts.filter(x=>x.id!==c.id);
    if(!S.expenses.some(x=>String(x.id)===String(e.id))){ if(S.space&&e.sp===S.space.code&&expenseCanManage(e)) S.space.manual=Array.from(new Set([...(S.space.manual||[]),String(e.id)])); S.expenses.splice(Math.min(i,S.expenses.length),0,e) }
    save(); renderAll() },6000);
}
function capRemove(id,msg){
  const i=(S.capQ||[]).findIndex(q=>q.id===id); if(i<0) return;
  const [c]=S.capQ.splice(i,1); save(); renderHome();
  toast(msg||'اتجاهلت العملية','تراجع',()=>{S.capQ.splice(Math.min(i,S.capQ.length),0,c);save();renderHome()},3000);
}
$('#capBox').addEventListener('change',e=>{const sel=e.target.closest('[data-capcur]'); if(!sel) return;
  const pkg=sel.dataset.capcur, v=sel.value; if(!/^[A-Za-z0-9_.]{1,200}$/.test(pkg)) return;
  if(v&&CURRENCIES.some(x=>x.id===v)) S.capCurBy[pkg]=v; else delete S.capCurBy[pkg];
  save(); renderCaps(); toast(v?'اتحفظت العملة لعمليات التطبيق ده':'رجعنا لعملة الرسالة نفسها')});
$('#capBox').addEventListener('click',e=>{
  if(e.target.closest('.cap-cur')) return; // choosing a currency must not fold the details
  const ok=e.target.closest('[data-capok]'), no=e.target.closest('[data-capno]'), all=e.target.closest('[data-capall]'),
        more=e.target.closest('[data-capmore]'), blk=e.target.closest('[data-capblock]'), det=e.target.closest('[data-capdet]');
  if(ok){const en=capView().find(x=>x.id===ok.dataset.capok); if(!en) return; capConfirm(en); return}
  if(no){const en=capView().find(x=>x.id===no.dataset.capno); if(en) capDrop(en); return}
  const alt=e.target.closest('[data-capask]'); if(alt){const en=capView().find(x=>x.id===alt.dataset.capask); if(en&&!en.pair){const pl=capPlan(en); openCapAsk(en,Object.assign({},pl,{kind:'ask',was:pl.kind,mode:pl.mode==='transfer'?'':pl.mode}))} return}
  const spl=e.target.closest('[data-capsplit]'); if(spl){const en=capView().find(x=>x.id===spl.dataset.capsplit); if(en&&en.pair){capNoPair.add(en.o.id);capNoPair.add(en.i.id);capDetail=null;renderCaps()} return}
  if(all){const old=S.capQ.slice(); S.capQ=[]; save(); renderHome();
    toast('اتجاهلت كل العمليات','تراجع',()=>{S.capQ=old;save();renderHome()},3000); return}
  if(more){capExpanded=!capExpanded; renderCaps(); return}
  if(blk){const c=S.capQ.find(q=>q.id===blk.dataset.capblock); if(!c||!c.pkg) return;
    try{AB&&AB.captureBlock&&AB.captureBlock(c.pkg,c.source||c.pkg,true)}catch(err){}
    S.capQ=S.capQ.filter(q=>q.pkg!==c.pkg); capDetail=null; save(); renderHome(); renderCapSettings();
    toast(`مش هنلقط حاجة من «${c.source||'التطبيق ده'}» تاني. تقدر ترجّعه من الإعدادات`); return}
  if(det){capDetail= capDetail===det.dataset.capdet? null : det.dataset.capdet; renderCaps()}
});
