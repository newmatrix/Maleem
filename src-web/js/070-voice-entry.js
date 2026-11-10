/* ===== Voice entry: say "460 جنيه باقة انترنت ارضي" ===== */
/* The phone's speech service turns speech into text (needs internet); everything after that runs locally. */
const vNorm=s=>String(s||'').toLowerCase().replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/[إأآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
const vStem=t=>{t=vNorm(t).replace(/[^\u0621-\u064Aa-z0-9]/g,''); const m=t.replace(/^(وال|بال|لل|ال)/,''); return m.length>=2?m:t};
const VW={واحد:1,واحده:1,اتنين:2,اثنين:2,تنين:2,تلاته:3,ثلاثه:3,تلات:3,ثلاث:3,اربعه:4,اربع:4,خمسه:5,خمس:5,سته:6,ست:6,سبعه:7,سبع:7,تمانيه:8,ثمانيه:8,تمان:8,ثمان:8,تسعه:9,تسع:9,عشره:10,عشر:10,احداشر:11,اتناشر:12,اثناشر:12,تلتاشر:13,تلاتاشر:13,اربعتاشر:14,خمستاشر:15,ستاشر:16,سبعتاشر:17,تمنتاشر:18,تسعتاشر:19,عشرين:20,تلاتين:30,ثلاثين:30,اربعين:40,خمسين:50,ستين:60,سبعين:70,تمانين:80,ثمانين:80,تسعين:90,ميه:100,مايه:100,مئه:100,مائه:100,ميتين:200,مئتين:200,مائتين:200,تلتميه:300,تلاتميه:300,ثلاثميه:300,ثلاثمائه:300,ربعميه:400,اربعميه:400,اربعمائه:400,خمسميه:500,خمسمائه:500,ستميه:600,ستمائه:600,سبعميه:700,سبعمائه:700,تمنميه:800,ثمانميه:800,ثمانمائه:800,تسعميه:900,تسعمائه:900,الفين:2000,الفان:2000,
  ميت:100,متين:200,حداشر:11,اطناشر:12,
  تلاتلاف:3000,تلتلاف:3000,ثلاثلاف:3000,ثلاثالاف:3000,اربعتلاف:4000,اربعالاف:4000,خمستلاف:5000,خمسالاف:5000,ستلاف:6000,ستالاف:6000,سبعتلاف:7000,سبعالاف:7000,تمنتلاف:8000,ثمانتلاف:8000,تمانتلاف:8000,تسعتلاف:9000,تسعالاف:9000,عشرتلاف:10000,عشرالاف:10000};
const VTH=new Set(['الف','الاف','تلاف']);
const VCUR=/^(جنيه|جنيها|جنيهات|ج|جم|le|egp|pound|pounds)$/;
const VDAY_Y=new Set(['امبارح','امس','البارحه']), VDAY_T=new Set(['النهارده','انهارده','النهاردة','اليوم']);
const VFILL=new Set(['دفعت','دفعنا','صرفت','صرفنا','اشتريت','سجل','سجلي','اضف','اضيف','ضيف','مصروف','مصاريف','جديد','في','على','علي','عشان','علشان','ل','لل','من','ب','دي','ده','يعني','تسجيل','اللي','كان','كانت']);
/* spoken numbers ("اربعميه وستين") -> runs of tokens with their value */
const vUnit=n=> n>=1000&&n%1000===0? 1000 : n>=100&&n%100===0? 100 : 1;
const vFrac=(n,f)=>n+vUnit(n)*f;
function voiceWordRuns(tok){
  const runs=[]; let cur=0,total=0,frac=0,idx=[],on=false;
  const end=()=>{if(on&&total+cur+frac>0) runs.push({n:total+cur+frac,idx:idx.slice()}); cur=total=frac=0;idx=[];on=false};
  const kOf=r=>{let k=vNorm(r||'').replace(/[^\u0621-\u064Aa-z0-9]/g,''); if(k!=='و'&&!(k in VW)&&!VTH.has(k)&&k.length>1&&(k[0]==='و'||k[0]==='ب')) k=k.slice(1); return k};
  let skip=-1;
  tok.forEach((raw,i)=>{
    if(i===skip) return;
    {const k0=kOf(raw), nk=kOf(tok[i+1]);
      if(k0==='تلت'&&VTH.has(nk)){cur+=3;on=true;idx.push(i);return} // «تلت تلاف»
      if(!on&&(k0==='نص'||k0==='نصف')&&VTH.has(nk)){total+=500;on=true;idx.push(i,i+1);skip=i+1;return} // «نص الف»
      if(!on&&k0==='ربع'&&VTH.has(nk)){total+=250;on=true;idx.push(i,i+1);skip=i+1;return}}
    let k=vNorm(raw).replace(/[^\u0621-\u064Aa-z0-9]/g,'');
    if(k!=='و'&&!(k in VW)&&!VTH.has(k)&&!['نص','نصف','ربع'].includes(k)&&k.length>1&&(k[0]==='و'||k[0]==='ب')) k=k.slice(1);
    if(k==='و'&&on){idx.push(i)}
    else if(k in VW){cur+=VW[k];on=true;idx.push(i)}
    else if(VTH.has(k)){total+=(cur||1)*1000;cur=0;on=true;idx.push(i)}
    else if(on&&!frac&&(k==='نص'||k==='نصف')){const b=total+cur; frac=vFrac(b,.5)-b; idx.push(i)}
    else if(on&&!frac&&k==='ربع'){const b=total+cur; frac=vFrac(b,.25)-b; idx.push(i)}
    else end();
  });
  end(); return runs;
}
/* category: your own category names, built-in Egyptian keywords, and what you logged before */
const VSYN=Object.fromEntries(Object.entries({
  food:'اكل شرب غدا عشا فطار فطور سحور مطعم مطاعم كافيه قهوه بقاله ماركت سوبرماركت خضار فاكهه لحمه لحم فراخ سندوتش ساندوتش بيتزا عصير شاي وجبه دليفري طلبات كشري فول طعميه حلويات',
  trans:'مواصلات تاكسي اوبر كريم ميكروباص مترو اتوبيس بنزين بنزن سولار توكتوك توك موقف جراج',
  bills:'فاتوره فواتير كهربا كهرباء مياه غاز عداد',
  phone:'موبايل نت انترنت باقه رصيد شحن كارت فودافون اورنج اتصالات وي ارضي راوتر تليفون',
  travel:'سفر طيران تذكره تذاكر حجز فندق رحله شاليه سياحه عمره حج مطار',
  shop:'تسوق هدوم ملابس لبس جزمه حذاء شنطه بنطلون قميص فستان شراء',
  health:'صحه دكتور دوا دواء ادويه صيدليه علاج تحاليل تحليل كشف مستشفي اشعه عياده',
  fun:'خروج ترفيه سينما فسحه لعبه بلايستيشن نتفليكس مسرح حفله',
  home:'بيت ايجار صيانه سباك نجار كهربائي مفروشات منظفات ديكور',
  edu:'تعليم مدرسه جامعه كورس دروس درس كتب كتاب دراسيه حضانه',
  gift:'هديه هدايا عيديه'
}).map(([k,v])=>[k,new Set(v.split(' ').map(vStem))]));
function voiceCat(stems){
  const score={}, add=(id,n)=>{if(CAT[id]) score[id]=(score[id]||0)+n};
  const has=new Set(stems);
  S.cats.forEach(c=>{
    vNorm(c.name).split(/\s+/).map(vStem).filter(w=>w.length>=2&&!['و','في','من'].includes(w)).forEach(w=>{if(has.has(w)) add(c.id,3)});
    const kw=VSYN[c.id]; if(kw) stems.forEach(w=>{if(kw.has(w)) add(c.id,2)});
  });
  /* learn from the notes you already used */
  const seen=new Map();
  S.expenses.slice(-400).forEach(x=>{ if(!x.note||!CAT[x.cat]) return;
    new Set(vNorm(x.note).split(/\s+/).map(vStem).filter(w=>w.length>=3)).forEach(w=>{ if(!has.has(w)) return;
      const m=seen.get(w)||{}; m[x.cat]=(m[x.cat]||0)+1; seen.set(w,m)}) });
  seen.forEach(m=>Object.entries(m).forEach(([id,n])=>add(id,Math.min(n,3))));
  const r=Object.entries(score).sort((a,b)=>b[1]-a[1]);
  if(!r.length||r[0][1]<2) return null;
  if(r[1]&&r[1][1]===r[0][1]) return null; /* a tie: ask instead of guessing */
  return r[0][0];
}
/* the category you used before for the same words (your corrections included, since the newest expense wins) */
function learnedCat(note){
  const n=normAr(String(note||'').trim()); if(n.length<2) return null;
  const xs=S.expenses.filter(x=>x.note&&CAT[x.cat]&&x.cat!=='other').sort((a,b)=>b.ts-a.ts).slice(0,400);
  const hit=xs.find(x=>normAr(x.note.trim())===n); if(hit) return hit.cat;
  const w=n.split(/\s+/).find(t=>t.length>=3); if(!w) return null;
  const votes={}; let tot=0;
  xs.forEach(x=>{if(normAr(x.note.trim()).split(/\s+/).includes(w)){votes[x.cat]=(votes[x.cat]||0)+1;tot++}});
  const best=Object.entries(votes).sort((a,b)=>b[1]-a[1])[0];
  return best&&best[1]>=2&&best[1]/tot>=.6?best[0]:null;
}
const vK2=t=>{let k=vNorm(t||'').replace(/[^\u0621-\u064Aa-z0-9]/g,''); return k.length>2&&k[0]==='و'?k.slice(1):k};

function parseEnglishVoice(text){
 const units={zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90};
 const tokens=String(text).toLowerCase().replace(/(\d),(?=\d{3}\b)/g,'$1').replace(/([a-z])-([a-z])/g,'$1 $2').match(/[a-z]+|\d+(?:\.\d+)?/g)||[];
 const numeric=w=>w in units||/^\d+(?:\.\d+)?$/.test(w||'');let amount=null,start=-1,end=-1;
 for(let i=0;i<tokens.length;i++){if(!numeric(tokens[i]))continue;let current=0,total=0,j=i;
  for(;j<tokens.length;j++){const w=tokens[j];if(numeric(w))current+=w in units?units[w]:+w;
   else if(w==='hundred')current=(current||1)*100;
   else if(w==='thousand'||w==='million'){total+=(current||1)*(w==='thousand'?1000:1000000);current=0}
   else if(w==='and'&&numeric(tokens[j+1]))continue;
   else if(w==='point'){let decimals='';while(numeric(tokens[j+1])&&+(tokens[j+1] in units?units[tokens[j+1]]:tokens[j+1])<10){j++;decimals+=String(tokens[j] in units?units[tokens[j]]:tokens[j])}current+=+(decimals?'0.'+decimals:0);j++;break}
   else break;
  }amount=r2(total+current);start=i;end=j;break;
 }
 const filler=new Set('spent spend paid pay bought buy on for at a an the pounds pound egp dollars dollar euros euro yesterday today received receive earned earn salary'.split(' '));
 const note=tokens.filter((w,i)=>(i<start||i>=end)&&!filler.has(w)).join(' ').slice(0,200);
 const aliases=I18N.en.voiceCategories||{};let cat=null;for(const [id,words]of Object.entries(aliases))if(CAT[id]&&words.some(w=>tokens.includes(w))){cat=id;break}
 return {amount:amount>0&&amount<=10000000?amount:null,cat:learnedCat(note)||cat,note,yday:tokens.includes('yesterday')};
}

function parseVoice(text){
  if(LANG==='en'&&/[a-z]/i.test(text)&&!/[\u0600-\u06ff]/.test(text))return parseEnglishVoice(text);
  const tok=String(text||'').trim().split(/\s+/).filter(Boolean), out={amount:null,cat:null,note:'',yday:false};
  if(!tok.length) return out;
  const nt=tok.map(t=>vNorm(t).replace(/(\d)[,،](?=\d{3}(?!\d))/g,'$1').replace(/[٫]/g,'.'));
  const drop=new Set(), cands=[];
  nt.forEach((t,i)=>{const m=t.match(/\d+(?:\.\d+)?/); if(m) cands.push({n:parseFloat(m[0]),i,digit:m[0],kind:'d'})});
  if(!cands.length) voiceWordRuns(tok).forEach(r=>cands.push({n:r.n,i:r.idx[r.idx.length-1],idx:r.idx,kind:'w'}));
  const isCur=i=>i>=0&&i<tok.length&&VCUR.test(vNorm(tok[i]).replace(/[^\u0621-\u064Aa-z]/g,''));
  const good=cands.filter(c=>c.n>0&&c.n<=10000000);
  const pick=good.find(c=>isCur(c.i+1)||isCur(c.i-1))||good[0];
  let last=pick?pick.i:0;
  if(pick){
    out.amount=Math.round(pick.n*100)/100;
    if(pick.kind==='d'){
      const rest=tok[pick.i].replace(/[0-9٠-٩۰-۹]+(?:[.,٫،][0-9٠-٩۰-۹]+)*/,'');
      if(vNorm(rest).replace(/[^\u0621-\u064A]/g,'').length>1) tok[pick.i]=rest; else drop.add(pick.i);
      const nx=nt[pick.i+1]&&nt[pick.i+1].replace(/[^\u0621-\u064A]/g,'');
      if(nx==='نص'||nx==='ونص'||nx==='نصف'||nx==='ونصف'){out.amount=vFrac(out.amount,.5);drop.add(pick.i+1);last=pick.i+1}
      else if(nx==='ربع'||nx==='وربع'){out.amount=vFrac(out.amount,.25);drop.add(pick.i+1);last=pick.i+1}
    } else {pick.idx.forEach(i=>drop.add(i));last=pick.idx[pick.idx.length-1]}
    [last+1,pick.i-1].forEach(i=>{if(isCur(i)) drop.add(i)});
    if(isCur(last+1)){ const hk=vK2(tok[last+2]); // «جنيه ونص» = +0.5, «جنيه وربع» = +0.25
      if(hk==='نص'||hk==='نصف'){out.amount+=0.5;drop.add(last+2)} else if(hk==='ربع'){out.amount+=0.25;drop.add(last+2)} }
  }
  tok.forEach((t,i)=>{const k=vStem(t); if(VDAY_Y.has(vNorm(t))||VDAY_Y.has(k)){out.yday=true;drop.add(i)} else if(VDAY_T.has(vNorm(t))) drop.add(i)});
  const words=tok.filter((_,i)=>!drop.has(i));
  out.cat=voiceCat(words.map(vStem).filter(w=>w.length>=2));
  while(words.length&&VFILL.has(vStem(words[0]))) words.shift();
  while(words.length&&VFILL.has(vStem(words[words.length-1]))) words.pop();
  out.note=words.join(' ').replace(/[،,.؟?!]+$/g,'').slice(0,80);
  out.cat=learnedCat(out.note)||out.cat;
  return out;
}
/* income by voice: only when an income verb is said and no spending verb ("استلمت مرتب 8000"). A bare noun such as عيدية
   stays a normal expense (giving eidia is spending), so nothing is guessed. The sheet opens filled in; nothing is saved by itself. */
const IN_VERB=/^(استلم|قبض|كسب|جالي|جالنا|جاتلي|جاتنا|جاتني|جتلي|جاني|اتحول|حولول|وصلني|وصلتني)/;
const OUT_VERB=/^(دفع|صرف|اشتر|سدد|عزم|شحن|ادي|حولت|بعت)/;
const IN_NOUN=[[/^(مرتب|مرتبي|راتب|ماهيه|معاش)$/,'المرتب'],[/^(عيديه|عيدي|عيديات)$/,'عيدية'],[/^(هديه|هدايا)$/,'هدية'],[/^(فريلانس|فريلانسر)$/,'شغل حر'],[/^(مكافاه|مكافئه)$/,'مكافأة'],[/^(بونص|حافز|عموله)$/,'بونص']];
function parseVoiceIn(text){
  if(LANG==='en'&&/\b(received|earned|got paid)\b/i.test(text)&&!/\b(spent|paid for|bought)\b/i.test(text)){const p=parseEnglishVoice(text);return {amount:p.amount,src:/\bsalary\b/i.test(text)?'Salary':p.note,yday:p.yday}}
  const tok=String(text||'').trim().split(/\s+/).filter(Boolean); if(!tok.length) return null;
  const ks=tok.map(vK2);
  if(!ks.some(k=>IN_VERB.test(k))||ks.some(k=>OUT_VERB.test(k))) return null;
  const p=parseVoice(text); let src='';
  for(let i=0;i<ks.length&&!src;i++){ if(ks[i]==='شغل'&&ks[i+1]==='حر') src='شغل حر'; else { const n=IN_NOUN.find(r=>r[0].test(ks[i])); if(n) src=n[1] } }
  if(!src){ const w=p.note.split(/\s+/).filter(t=>t&&!IN_VERB.test(vK2(t))); while(w.length&&VFILL.has(vStem(w[0]))) w.shift(); src=w.join(' ').slice(0,40) }
  return {amount:p.amount,src,yday:p.yday};
}
function voiceOpen(){voiceOn=true;$('#vcTitle').textContent='بحضّر المايك…';$('#vcText').textContent='';$('#vcHint').hidden=false;$('#vcOrb').classList.remove('on');$('#scrim').classList.add('open');$('#voiceCard').classList.add('open')}
function voiceClose(){voiceOn=false;$('#voiceCard').classList.remove('open');$('#vcOrb').classList.remove('on');if(!document.querySelector('.sheet.open'))$('#scrim').classList.remove('open')}
function voiceCancel(){try{AB&&AB.cancelVoice&&AB.cancelVoice()}catch(e){} voiceClose()}
$('#micFab').onclick=()=>{
  if(voiceOn) return;
  if(!(AB&&AB.startVoice)){toast('التسجيل بالصوت شغّال داخل تطبيق الموبايل بس');return}
  $('#vcHint').textContent= tab==='debts'? VOB_HINT[obTab]||VOB_HINT.debts : 'قول المبلغ والفئة، مثلًا: «٤٦٠ جنيه باقة انترنت ارضي». وللدخل: «استلمت مرتب ٨٠٠٠»';
  voiceOpen(); try{AB.startVoice()}catch(e){voiceClose();toast('مقدرتش أشغّل المايك')}
};
$('#vcCancel').onclick=voiceCancel;
window.__voiceState=s=>{if(!voiceOn) return;
  if(s==='listening'){$('#vcTitle').textContent='بسمعك… اتكلم دلوقتي';$('#vcOrb').classList.add('on')}
  else if(s==='processing'){$('#vcTitle').textContent='ثانية واحدة…';$('#vcOrb').classList.remove('on')}};
window.__voicePartial=t=>{if(voiceOn&&t){$('#vcText').textContent=t;$('#vcHint').hidden=true}};
window.__voiceStop=()=>{if(voiceOn) voiceClose()};
window.__voiceError=code=>{if(!voiceOn) return; voiceClose();
  toast(code===7||code===6?'ما سمعتش حاجة واضحة، جرّب تاني'
    :code===1||code===2||code===4?'التسجيل بالصوت محتاج إنترنت'
    :code===9?'لازم تسمح للمايك من إعدادات التطبيق'
    :code===-1?'خدمة التعرف على الكلام مش متاحة على جهازك'
    :code===8?'المايك مشغول، جرّب تاني':'حصلت مشكلة في المايك، جرّب تاني')};
/* what to do with the spoken sentences: the matching sheet opens filled in, nothing is saved by itself */
function voiceApply(list){
  if(tab==='debts'&&list.length){ obVoiceResult(list); return }
  const all=list.map(parseVoice), best=all.find(p=>p.amount)||all[0]||{amount:null,cat:null,note:'',yday:false};
  if(!list.length){toast('ما سمعتش حاجة واضحة، جرّب تاني');return}
  const insAll=list.map(parseVoiceIn).filter(Boolean), ins=insAll.find(x=>x.amount)||insAll[0];
  if(ins){ openInSheet(null,ins.amount?{amount:ins.amount}:null); $('#inSrc').value=ins.src; paintInChips(); if(ins.yday) $('#inDay').value=yestKey();
    toast(!ins.amount?'فهمتها دخل، بس ما سمعتش المبلغ. اكتبه وادوس حفظ':'فهمتها دخل، راجع البيانات وادوس حفظ',null,null,3200); return }
  openSheet(null,{amount:best.amount,cat:best.cat,note:best.note});
  if(best.yday){selDay=yestKey();paintDate()}
  toast(!best.amount?'ما سمعتش المبلغ، اكتبه وادوس حفظ':!best.cat?'مش متأكد من الفئة، اختارها وادوس حفظ':'راجع البيانات وادوس حفظ',null,null,3200)}
window.__voiceResult=alts=>{if(!voiceOn) return; voiceClose();
  const list=(Array.isArray(alts)?alts:[alts]).filter(Boolean);
  voiceApply(list)};
/* ===== Voice entry for التزاماتي: سلف، جمعيات، تقسيط =====
   Same rule as the expenses mic: the speech service gives text, everything after that runs on the phone,
   and nothing is saved by itself: the matching sheet opens filled in so you can check it first. */
const vK=t=>vNorm(t).replace(/[^\u0621-\u064Aa-z0-9]/g,'');
const vMap=o=>Object.assign(Object.create(null),o);
const VMON=vMap({يناير:0,فبراير:1,مارس:2,ابريل:3,مايو:4,يونيو:5,يونيه:5,يوليو:6,يوليه:6,اغسطس:7,سبتمبر:8,اكتوبر:9,نوفمبر:10,ديسمبر:11});
const VWDAYS=vMap({الاحد:0,الاثنين:1,الاتنين:1,التلات:2,الثلاثاء:2,الاربع:3,الاربعاء:3,الخميس:4,الجمعه:5,السبت:6});
const VORD=vMap({الاول:1,اول:1,التاني:2,تاني:2,الثاني:2,التالت:3,تالت:3,الثالث:3,الرابع:4,رابع:4,الخامس:5,خامس:5,السادس:6,سادس:6,السابع:7,سابع:7,التامن:8,الثامن:8,تامن:8,التاسع:9,تاسع:9,العاشر:10,عاشر:10,الحداشر:11,الاتناشر:12});
const VNEXT=new Set(['الجاي','الجايي','القادم','القادمه','الجايه']);
const vMonOf=k=>k in VMON? VMON[k] : (k.length>3&&'وبلف'.includes(k[0])&&(k.slice(1) in VMON)? VMON[k.slice(1)] : -1);
const vNumAt=(k,i)=>{const x=k[i]; if(!x) return null; if(/^\d+$/.test(x)) return +x; if(Object.prototype.hasOwnProperty.call(VW,x)) return VW[x]; return null};
const vHas=(k,i,j,set)=>{for(let x=Math.max(0,i);x<=Math.min(k.length-1,j);x++) if(set.has(k[x])) return true; return false};
/* every number said in the sentence (digits or words), skipping tokens already used for something else */
function vAllNums(tok,skip){
  const nt=tok.map(t=>vNorm(t).replace(/(\d)[,،](?=\d{3}(?!\d))/g,'$1').replace(/[٫]/g,'.')), out=[], used=new Set(skip||[]);
  nt.forEach((t,i)=>{ if(used.has(i)) return; const m=t.match(/\d+(?:\.\d+)?/); if(!m) return;
    let n=parseFloat(m[0]); const idx=[i], nx=(nt[i+1]||'').replace(/[^\u0621-\u064A]/g,'');
    if(!used.has(i+1)){ if(VTH.has(nx)){n*=1000;idx.push(i+1)} else if(nx==='نص'||nx==='نصف'){n=vFrac(n,.5);idx.push(i+1)} else if(nx==='ربع'){n=vFrac(n,.25);idx.push(i+1)} }
    out.push({n:Math.round(n*100)/100,idx}); idx.forEach(x=>used.add(x)) });
  voiceWordRuns(tok.map((t,i)=>used.has(i)?'§':t)).forEach(r=>out.push({n:r.n,idx:r.idx}));
  out.forEach(o=>{ const e=o.idx[o.idx.length-1]; if(VCUR.test(vK(tok[e+1]||''))&&!used.has(e+2)){ const hk=vK2(tok[e+2]);
    if(hk==='نص'||hk==='نصف'){o.n=Math.round((o.n+0.5)*100)/100;o.idx.push(e+1,e+2)} else if(hk==='ربع'){o.n=Math.round((o.n+0.25)*100)/100;o.idx.push(e+1,e+2)} } });
  return out.sort((a,b)=>a.idx[0]-b.idx[0]);
}
/* a spoken date -> yyyy-mm-dd: بكرة، بعد أسبوع، بعد 3 أيام، الشهر الجاي، آخر الشهر، يوم 15، 15 نوفمبر، يوم الخميس */
function voiceDate(tok){
  const k=tok.map(vK), used=new Set(), T=new Date(); T.setHours(12,0,0,0);
  const mk=(y,m,d)=>dayKey(new Date(y,m,Math.min(d,new Date(y,m+1,0).getDate()),12));
  const plus=n=>{const x=new Date(T); x.setDate(x.getDate()+n); return dayKey(x)};
  const done=(dk,...ix)=>{ix.forEach(i=>used.add(i)); return {dk,used}};
  const dayOk=n=>n!=null&&n>=1&&n<=31;
  for(let i=0;i<k.length;i++){ const mi=vMonOf(k[i]); if(mi<0) continue;
    let di=-1, d=null; if(dayOk(vNumAt(k,i-1))){di=i-1;d=vNumAt(k,i-1)} else if(dayOk(vNumAt(k,i+1))){di=i+1;d=vNumAt(k,i+1)}
    if(d==null) d=T.getDate();
    let y=T.getFullYear(); const today0=new Date(y,T.getMonth(),T.getDate(),12);
    if(new Date(y,mi,Math.min(d,28),12)<today0) y++;
    const ix=[i]; if(di>=0){ix.push(di); if(k[Math.min(di,i)-1]==='يوم') ix.push(Math.min(di,i)-1)}
    return done(mk(y,mi,d),...ix);
  }
  for(let i=0;i<k.length;i++){ const w=k[i];
    if(w==='بعد'&&(k[i+1]==='بكره'||k[i+1]==='بكرا')) return done(plus(2),i,i+1);
    if(w==='بكره'||w==='بكرا') return done(plus(1),i);
    if(w==='النهارده'||w==='انهارده') return done(plus(0),i);
    if(w==='بعد'){
      let j=i+1, cnt=1; const n=vNumAt(k,j); if(n!=null){cnt=n;j++}
      const U=vMap({يوم:['d',1],ايام:['d',1],يومين:['d',1,1],اسبوع:['d',7],اسابيع:['d',7],اسبوعين:['d',7,1],شهر:['m',1],شهور:['m',1],اشهر:['m',1],شهرين:['m',1,1],سنه:['m',12],سنين:['m',12],سنتين:['m',12,1]})[k[j]||''];
      if(U){ const c=U[2]?2:cnt, ix=[]; for(let x=i;x<=j;x++) ix.push(x);
        if(U[0]==='d') return done(plus(U[1]*c),...ix);
        const t=new Date(T.getFullYear(),T.getMonth()+U[1]*c,1); return done(mk(t.getFullYear(),t.getMonth(),T.getDate()),...ix) }
    }
    if(w==='اول'&&k[i+1]==='الشهر'){ const nx=VNEXT.has(k[i+2]), t=new Date(T.getFullYear(),T.getMonth()+(nx||T.getDate()>1?1:0),1); return done(mk(t.getFullYear(),t.getMonth(),1),...(nx?[i,i+1,i+2]:[i,i+1])) }
    if((w==='نص'||w==='نصف'||w==='منتصف')&&k[i+1]==='الشهر'){ const nx=VNEXT.has(k[i+2]), t=new Date(T.getFullYear(),T.getMonth()+(nx||T.getDate()>15?1:0),1); return done(mk(t.getFullYear(),t.getMonth(),15),...(nx?[i,i+1,i+2]:[i,i+1])) }
    if((w==='نهايه'||w==='اخر')&&k[i+1]==='الشهر'){ const nx=VNEXT.has(k[i+2]), t=new Date(T.getFullYear(),T.getMonth()+(nx?1:0),1); return done(mk(t.getFullYear(),t.getMonth(),31),...(nx?[i,i+1,i+2]:[i,i+1])) }
    if(w==='الاسبوع'&&VNEXT.has(k[i+1])) return done(plus(7),i,i+1);
    if(w==='الشهر'&&VNEXT.has(k[i+1])){const t=new Date(T.getFullYear(),T.getMonth()+1,1); return done(mk(t.getFullYear(),t.getMonth(),T.getDate()),i,i+1)}
    if(w in VWDAYS){ const diff=((VWDAYS[w]-T.getDay()+7)%7)||7; return done(plus(diff),...(k[i-1]==='يوم'?[i-1,i]:[i])) }
    const n=vNumAt(k,i+1);
    if((w==='يوم'&&dayOk(n))||(dayOk(vNumAt(k,i))&&k[i+1]==='الشهر'&&w!=='يوم')){
      const dd=w==='يوم'?n:vNumAt(k,i), at=w==='يوم'?[i,i+1]:[i,i+1];
      const nxm=w==='يوم'&&k[i+2]==='الشهر'&&VNEXT.has(k[i+3]); if(nxm) at.push(i+2,i+3); // «يوم 15 الشهر الجاي»
      const t=new Date(T.getFullYear(),T.getMonth()+(nxm||T.getDate()>dd?1:0),1); return done(mk(t.getFullYear(),t.getMonth(),dd),...at) }
  }
  return {dk:null,used};
}
const vStopPre=['يوم','بعد','بكر','النهارد','الاسبوع','الشهر','اخر','في','عشان','علشان','دي','ده','لما','وقت','جنيه','ج'];
/* future verbs said after the amount (هرجعهم، هيسددلي، هدفعلك...) end a name; a plain «ها/هي/هد» prefix does not, because it is also the start of real names */
const vFutureVerb=/^ه(?:ي|ت|ن)?(?:رجع|سدد|دفع|بعت|قبض|اخد|جيب|رد|حول|ادفع|سلف|اعطي|ديني|ديلي)/;
const vIsStop=(k,i,taken)=>{const w=k[i]||''; if(!w||taken.has(i)) return true; const b=w.length>2&&w[0]==='و'?w.slice(1):w;
  return vFutureVerb.test(b)||vStopPre.some(p=>b===p||b.startsWith(p)&&p.length>=2&&!['في','ده','دي','لما','وقت'].includes(p))||vMonOf(w)>=0||(w in VWDAYS)||/^\d+$/.test(w)||(w in VW)||VTH.has(w)||VCUR.test(w)};
/* a name: up to 2 words from index s */
function vName(tok,k,s,taken,strip){
  const o=[]; for(let i=s;i<tok.length&&o.length<2;i++){ if(vIsStop(k,i,taken)) break; o.push(tok[i]) }
  if(!o.length) return '';
  if(strip&&o[0].length>=4&&o[0][0]==='ل'&&o[0][1]!=='ي'){ o[0]= o[0][1]==='ل'&&o[0][2]!=='ي'? 'ال'+o[0].slice(2) : o[0].slice(1) }
  return o.join(' ').replace(/[،,.؟?!]+$/g,'').slice(0,30);
}
function vAfterBecause(tok,k,taken){
  const i=k.findIndex(w=>w==='عشان'||w==='علشان'||w==='بسبب'); if(i<0) return '';
  const o=[]; for(let j=i+1;j<tok.length&&o.length<5;j++){ if(taken.has(j)||/^\d+$/.test(k[j])||['ب','في','كل','على','لمده','مده'].includes(k[j])) break; o.push(tok[j]) } return o.join(' ');
}
/* ---- سلفة ---- */
function parseVoiceDebt(text){
  const tok=String(text||'').trim().split(/\s+/).filter(Boolean), out={dir:null,person:'',amount:null,due:null,note:'',score:0};
  if(!tok.length) return out;
  const k=tok.map(vK), D=voiceDate(tok); out.due=D.dk;
  const nums=vAllNums(tok,D.used).filter(r=>r.n>0&&r.n<=10000000), cur=i=>i>=0&&i<tok.length&&VCUR.test(k[i]);
  const pick=nums.find(r=>cur(r.idx[r.idx.length-1]+1)||cur(r.idx[0]-1))||nums[0];
  const taken=new Set(D.used); if(pick){out.amount=pick.n; pick.idx.forEach(i=>taken.add(i))}
  k.forEach((w,i)=>{if(cur(i)) taken.add(i)});
  const c=k.findIndex((w,i)=>w==='عند'&&(k[i-1]==='ليا'||k[i-1]==='لي'));
  const sl=k.findIndex(w=>['سلفت','اسلفت','سلفته','سلفتها'].includes(w));
  const bo=k.findIndex(w=>['استلفت','اقترضت','استدنت','اتسلفت','اخدت'].includes(w));
  const tk=k.findIndex((w,i)=>w==='مني'&&['اخد','خد','استلف','استلفت','اخدوا'].includes(k[i-1]));
  if(c>=0){ out.dir='in'; out.person=vName(tok,k,c+1,taken,false) }
  else if(sl>=0){ out.dir='in'; out.person=vName(tok,k,sl+1,taken,false) }
  else if(tk>=1){ out.dir='in'; out.person=vName(tok,k,tk-2>=0&&!vIsStop(k,tk-2,taken)?tk-2:tk-1,taken,false) }
  else if(bo>=0){ out.dir='out'; const f=k.findIndex((w,i)=>i>bo&&w==='من'); out.person=vName(tok,k,(f>=0?f+1:bo+1),taken,false) }
  else if(k.includes('عليا')||(k[0]==='علي'&&nums.length&&vNumAt(k,1)!=null)||k[0]==='عليا'){
    out.dir='out';
    for(let i=0;i<tok.length;i++){ if(taken.has(i)) continue; const w=tok[i];
      if(w==='ل'||k[i]==='لحد'){ out.person=vName(tok,k,i+1,taken,false); break }
      if(w.length>=4&&w[0]==='ل'&&w[1]!=='ي'&&!['لمده','لحد'].includes(k[i])&&!vIsStop(k,i,taken)||k[i].startsWith('لل')&&w.length>=4){ out.person=vName(tok,k,i,taken,true); break } }
  }
  out.note=vAfterBecause(tok,k,taken).slice(0,80);
  out.score=(out.dir?1:0)+(out.person?1:0)+(out.amount?1:0)+(out.due?.5:0);
  return out;
}
/* ---- جمعية ---- */
function parseVoiceGam(text){
  const tok=String(text||'').trim().split(/\s+/).filter(Boolean), out={name:'',inst:null,pot:null,members:null,shares:1,turns:[],turnNote:'',start:null,day:null,score:0};
  if(!tok.length) return out;
  const k=tok.map(vK), kv=k.map(w=>w.length>3&&w[0]==='و'?w.slice(1):w), taken=new Set(), T=new Date(), cm=T.getMonth(), cy=T.getFullYear();
  const mark=(...ix)=>ix.forEach(i=>taken.add(i));
  /* start month */
  for(let i=0;i<k.length;i++){ const mi=vMonOf(k[i]); if(mi>=0){ out.start=`${mi<cm?cy+1:cy}-${pad(mi+1)}`; mark(i); break } }
  if(!out.start){ const i=k.findIndex((w,j)=>w==='الشهر'&&(VNEXT.has(k[j+1])||k[j+1]==='ده'||k[j+1]==='دا')); if(i>=0){ const nx=VNEXT.has(k[i+1]); const t=new Date(cy,cm+(nx?1:0),1); out.start=`${t.getFullYear()}-${pad(t.getMonth()+1)}`; mark(i,i+1) } }
  /* payment day: يوم 5 */
  k.forEach((w,i)=>{ if(w==='يوم'&&!out.day){const n=vNumAt(k,i+1); if(n>=1&&n<=31){out.day=Math.min(28,n); mark(i,i+1)}} });
  /* shares */
  k.forEach((w,i)=>{ const b=w.length>3&&w[0]==='ب'?w.slice(1):w;
    if(b==='فردين'||b==='اسمين'){out.shares=2;mark(i)}
    else if((b==='افراد'||b==='اسماء')&&vNumAt(k,i-1)>=2){out.shares=Math.min(5,vNumAt(k,i-1));mark(i,i-1)}
    else if(b==='فرد'&&k[i+1]==='واحد'){out.shares=1;mark(i,i+1)} });
  /* months: a number right before شهر/شهور */
  let qabdAfter=null;
  k.forEach((w,i)=>{ if(['شهر','شهور','اشهر'].includes(w)){ let j=i-1; const n=vNumAt(k,j);
      if(n!=null&&n>=2&&n<=60){ const ix=[i,j]; if(!out.members||vHas(k,i-5,i-1,new Set(['لمده','مده','لمدة']))) {} 
        const qabd=vHas(kv,j-4,j-1,new Set(['هقبض','هقبضها','اقبض','اقبضها','هاخد','هاخدها','هستلم','هقبضهم','تقبض','هاخدهم']))&&k[j-1]==='بعد';
        if(qabd) qabdAfter=n; else if(!out.members) out.members=n; else {}
        mark(...ix); if(k[j-1]==='بعد') mark(j-1) } } });
  /* turns: دوري ... / هقبض في الشهر ... */
  const ordAt=i=>{const x=k[i]; if(x in VORD) return VORD[x]; if(x&&x[0]==='و'&&(x.slice(1) in VORD)) return VORD[x.slice(1)]; const n=vNumAt(k,i); return n!=null&&n>=1&&n<=60?n:null};
  const SKIP=new Set(['في','الشهر','شهر','رقم','انا','هو','هي','و','ال']);
  kv.forEach((w,i)=>{ const dor=['دوري','دور','ادواري','دوره'].includes(w), qb=['هقبض','هقبضها','اقبض','هاخد','هاخدها','هستلم','تقبض'].includes(w);
    if(!(dor||qb)) return; let j=i+1, seenMonth=false; const got=[], ix=[];
    for(;j<k.length&&j<i+9;j++){ if(k[j]==='الشهر'||k[j]==='شهر') seenMonth=true; const o=ordAt(j);
      if(o!=null&&!taken.has(j)&&(dor||seenMonth)){got.push(o);ix.push(j)} else if(SKIP.has(k[j])||k[j]==='و'||(k[j][0]==='و'&&ordAt(j)!=null)){} else if(got.length) break; else if(!dor||j>i+3) break }
    if(got.length&&!out.turns.length){out.turns=got;mark(...ix)} });
  if(!out.turns.length&&qabdAfter) {out.turns=[qabdAfter]; out.turnNote='بعد '+qabdAfter+' شهور'}
  if(qabdAfter&&!out.members) out.members=qabdAfter;
  if(out.turns.length>out.shares) out.shares=Math.min(5,out.turns.length);
  /* amounts */
  const nums=vAllNums(tok,taken).filter(r=>r.n>=1&&r.n<=10000000);
  const INST=new Set(['القسط','قسط','بقسط','والقسط','ادفع','هدفع','بدفع','شهريا']), POT=new Set(['هقبض','هقبضها','اقبض','اقبضها','هاخد','هاخدها','هستلم','هقبضهم','تقبض','هاخدهم']);
  let inst=null, pot=null; const rest=[];
  nums.forEach(r=>{ const a=r.idx[0], b=r.idx[r.idx.length-1];
    const instCtx=vHas(kv,a-2,a-1,INST)||vHas(k,b+1,b+3,new Set(['شهريا']))||(k[b+1]==='في'&&k[b+2]==='الشهر')||(k[b+1]==='كل'&&k[b+2]==='شهر')||(k[b+1]==='في'&&k[b+2]==='شهر')||(vCurSkip(k,b+1)&&((k[b+2]==='في'&&k[b+3]==='الشهر')||(k[b+2]==='كل'&&k[b+3]==='شهر')));
    const potCtx=vHas(kv,a-2,a-1,POT);
    if(instCtx&&inst==null) inst=r.n; else if(potCtx&&pot==null) pot=r.n; else rest.push(r.n) });
  rest.sort((x,y)=>x-y);
  if(inst==null&&pot==null){ if(rest.length>=2){inst=rest[0];pot=rest[rest.length-1]} else if(rest.length===1) inst=rest[0] }
  else if(inst==null&&rest.length) inst=rest[0];
  else if(pot==null&&rest.length&&rest[rest.length-1]>inst) pot=rest[rest.length-1];
  if(inst!=null&&inst===pot) pot=null;
  if(inst==null&&pot!=null&&out.members) inst=Math.round(pot/out.members*100)/100;
  if(!out.members&&inst&&pot&&Number.isInteger(pot/inst)&&pot/inst>=2&&pot/inst<=60) out.members=pot/inst;
  out.inst=inst; out.pot=pot;
  /* name */
  const w=vAfterBecause(tok,k,taken).split(/\s+/).filter(Boolean).filter(x=>!['اجيب','اشتري','اشتر','اعمل','اجهز','احوش','اسافر','اجيبلي','اشتريلي','ل','لاجل'].includes(vK(x)));
  let nm= w.length? w.slice(0,3).join(' ') : '';
  if(!nm){ const g=k.indexOf('جمعيه'); if(g>=0){ const o=[]; for(let i=g+1;i<tok.length&&o.length<2;i++){ if(vIsStop(k,i,taken)||['القسط','قسط','بقسط','في','ب','لمده','مده','اول','دوري','دور','يوم','على','كل','هقبض','دخلت','علشان','عشان'].includes(kv[i])) break; o.push(tok[i]) } nm=o.join(' ') } }
  out.name= nm? 'جمعية '+nm : 'جمعية';
  out.name=out.name.slice(0,30);
  out.score=(out.inst?1:0)+(out.members?1:0)+(out.start?.5:0)+(out.turns.length?.5:0);
  return out;
}
const vCurSkip=(k,i)=>i<k.length&&VCUR.test(k[i]||'');
/* ---- تقسيط ---- */
function parseVoiceInst(text){
  const tok=String(text||'').trim().split(/\s+/).filter(Boolean), out={name:'',party:'',total:null,months:null,monthly:null,first:null,score:0};
  if(!tok.length) return out;
  const k=tok.map(vK), D=voiceDate(tok), taken=new Set(D.used); out.first=D.dk;
  /* months: a number before شهر/شهور, or سنة/سنتين */
  k.forEach((w,i)=>{ if(out.months) return;
    if(['شهر','شهور','اشهر'].includes(w)){const n=vNumAt(k,i-1); if(n>=1&&n<=60&&!taken.has(i-1)){out.months=n;taken.add(i);taken.add(i-1)}}
    else if(w==='شهرين'&&!taken.has(i)){out.months=2;taken.add(i)}
    else if(w==='سنتين'&&!taken.has(i)){out.months=24;taken.add(i)}
    else if((w==='سنه'||w==='سنين')&&!taken.has(i)){const n=vNumAt(k,i-1); out.months=Math.min(60,(n!=null&&n<=5?n:1)*12);taken.add(i);if(n!=null&&n<=5)taken.add(i-1)} });
  k.forEach((w,i)=>{ if(VCUR.test(w)) taken.add(i) });
  const nums=vAllNums(tok,taken).filter(r=>r.n>=1&&r.n<=10000000);
  const MON=new Set(['القسط','قسط','قسطه','والقسط','اقساط','شهريا']);
  let total=null, monthly=null; const rest=[];
  nums.forEach(r=>{ const a=r.idx[0], b=r.idx[r.idx.length-1];
    const mctx=vHas(k,a-2,a-1,MON)||(k[b+1]==='في'&&k[b+2]==='الشهر')||(k[b+1]==='كل'&&k[b+2]==='شهر')||k[b+1]==='شهريا';
    const tctx=k[a-1]==='ب'||tok[a][0]==='ب'||vHas(k,a-2,a-1,new Set(['سعره','ثمنه','بسعر','اجمالي','الاجمالي','بقيمه','قيمته','المبلغ']));
    if(mctx&&monthly==null) monthly=r.n; else if(tctx&&total==null) total=r.n; else rest.push(r.n) });
  rest.sort((x,y)=>y-x);
  if(total==null&&rest.length) total=rest.shift();
  if(monthly==null&&rest.length) monthly=rest.pop();
  if(total!=null&&monthly!=null&&monthly>total){const x=total;total=monthly;monthly=x}
  if(total==null&&monthly!=null&&out.months) total=Math.round(monthly*out.months*100)/100;
  if(!out.months&&total&&monthly&&total/monthly>=1&&total/monthly<=60) out.months=Math.round(total/monthly);
  out.total=total; out.monthly=monthly;
  /* what was bought: the first words before the first number or the price word */
  const FILL=new Set(['اشتريت','جبت','اشتري','قسطت','هقسط','هقسطه','بقسط','تقسيط','عايز','عاوز','عملت','اخدت','سجل','سجلي','ضيف','اضف','جديد','قسط','تقسيطه','دخلت','انا','القسط','والقسط','الاقساط','اقساط','سعره','ثمنه','بسعر']);
  const firstNum=Math.min(...nums.map(r=>r.idx[0]).concat([tok.length]));
  const nm=[]; for(let i=0;i<Math.min(firstNum,tok.length)&&nm.length<3;i++){ const w=k[i]; if(FILL.has(w)||w==='ب'||w==='على'||w==='من'||w==='بسعر'||!w) { if(nm.length&&(w==='ب'||w==='على'||w==='من'||w==='بسعر')) break; continue } if(w[0]==='ب'&&/\d/.test(tok[i])) break; nm.push(tok[i]) }
  out.name=nm.join(' ').slice(0,60);
  const f=k.findIndex((w,i)=>(w==='من'||w==='عند'||w==='مع')&&!taken.has(i)&&vNumAt(k,i+1)==null&&vMonOf(k[i+1]||'')<0);
  if(f>=0){ const o=[]; for(let i=f+1;i<tok.length&&o.length<3;i++){ if(vIsStop(k,i,taken)||['اول','على','ب','هقسط'].includes(k[i])) break; o.push(tok[i]) } out.party=o.join(' ').slice(0,40) }
  out.score=(out.total?1:0)+(out.months?1:0)+(out.name?1:0)+(out.first?.5:0);
  return out;
}
/* ---- put the result in the right sheet ---- */
const VOB_HINT={debts:'قول مثلًا: «عليا ٥٠٠ جنيه لمحمد وهرجعهم يوم ١٥» أو «ليا عند محمد ١٠٠٠ جنيه وهيرجعهملي بعد أسبوع»',
  gams:'قول مثلًا: «جمعية ٥٠٠٠ في الشهر لمدة ١٠ شهور، أول شهر نوفمبر، ودوري الشهر ٣»',
  insts:'قول مثلًا: «موبايل بـ ١٢٠٠٠ جنيه على ٦ شهور، أول قسط الشهر الجاي»'};
function obVoiceResult(list){
  const P={debts:parseVoiceDebt,gams:parseVoiceGam,insts:parseVoiceInst}[obTab]||parseVoiceDebt;
  const all=list.map(P), r=all.reduce((b,x)=>x.score>b.score?x:b,all[0]), miss=[];
  if(obTab==='gams'){
    openGamSheet();
    $('#gamName').value=r.name||'جمعية';
    if(r.inst) $('#gamAmt').value=String(r.inst); else miss.push('القسط');
    if(r.members) $('#gamMembers').value=String(Math.min(36,Math.max(2,r.members))); else miss.push('عدد الشهور');
    if(r.members>36) miss.push('الحد الأقصى 36 شهر');
    $('#gamShares').value=String(Math.max(1,Math.min(5,r.shares||1)));
    if(r.start) $('#gamStart').value=mkToMY(r.start); else miss.push('أول شهر');
    if(r.day) $('#gamDay').value=String(r.day);
    fillTurns(r.turns.length?r.turns:[1]);
    if(!r.turns.length) miss.push('دورك');
    gamSumm();
    toast(miss.length? 'ما سمعتش: '+miss.join('، ')+'. كمّلهم وادوس حفظ' : (r.turnNote?`حطيت دورك ${r.turnNote}، غيّره لو غلط وادوس حفظ`:'راجع البيانات وادوس حفظ'),null,null,4200);
  } else if(obTab==='insts'){
    openInstSheet();
    if(r.name) $('#instName').value=r.name; else miss.push('اسم الحاجة');
    if(r.party) $('#instParty').value=r.party;
    if(r.total) $('#instTotal').value=String(r.total); else miss.push('الإجمالي');
    if(r.months) $('#instMonths').value=String(Math.min(60,Math.max(1,r.months))); else miss.push('المدة');
    if(r.first) $('#instFirst').value=r.first;
    if(r.monthly&&r.total&&r.months&&Math.abs(r.monthly*r.months-r.total)>1){instMonthlyAuto=false;$('#instMonthly').value=String(r.monthly)} else instAutoMonthly();
    toast(miss.length? 'ما سمعتش: '+miss.join('، ')+'. كمّلهم وادوس حفظ' : 'راجع البيانات وادوس حفظ',null,null,4200);
  } else {
    openDebtSheet();
    if(r.dir){debtDirSel=r.dir;paintDir()} else miss.push('هي ليك ولا عليك');
    if(r.person) $('#debtPerson').value=r.person; else miss.push('الاسم');
    if(r.amount) $('#debtAmt').value=String(r.amount); else miss.push('المبلغ');
    if(r.due) $('#debtDue').value=dkToDMY(r.due);
    if(r.note) $('#debtNote').value=r.note;
    toast(miss.length? 'ما سمعتش: '+miss.join('، ')+'. كمّلهم وادوس حفظ' : 'راجع البيانات وادوس حفظ',null,null,4200);
  }
}

function delExpense(id){
  const i=S.expenses.findIndex(e=>e.id===id); if(i<0)return;
  if(!expenseCanManage(S.expenses[i])){toast('مصروفات الأعضاء الآخرين للقراءة فقط');return}
  const rows=document.querySelectorAll(`.xp[data-id="${CSS.escape(String(id))}"]`);
  rows.forEach(r=>r.classList.add('removing'));
  setTimeout(()=>{
    const j=S.expenses.findIndex(e=>e.id===id); if(j<0)return;
    const [x]=S.expenses.splice(j,1); const tid=trashPut('xp',x,j); save();renderAll();checkAlerts(); // its receipt photo stays with it in the trash
    toast('اتحذف المصروف','تراجع',()=>{
      trashDel(tid); justAdded=x.id;
      if(S.space&&x.sp===S.space.code&&expenseCanManage(x))S.space.manual=Array.from(new Set([...(S.space.manual||[]),String(x.id)]));
      S.expenses.push(x);save();renderAll();justAdded=null
    },3000);
  },rows.length?200:0);
}
let menuFor=null;
function openMenu(btn,kind,id){
  if(kind==='xp'&&!expenseCanManage(S.expenses.find(x=>String(x.id)===String(id)))){toast('مصروفات الأعضاء الآخرين للقراءة فقط');return}
  const m=$('#menu'); closeMenu(); menuFor={kind,id}; btn.setAttribute('aria-expanded','true');
  m.querySelector('[data-act="del"]').hidden = (kind==='cat' && id==='other') || (kind==='pay' && id==='cash');
  m.querySelector('[data-act="edit"]').hidden = false; m.querySelector('[data-act="date"]').hidden = kind!=='xp';
  { const xe= kind==='xp'? S.expenses.find(x=>String(x.id)===String(id)) : null, xa= xe&&ACC(xe.acc);
    m.querySelector('[data-act="cashwd"]').hidden= !(xa&&xa.type!=='cash'&&!xe.inst&&xe.accAmt>0);
    m.querySelector('[data-act="refund"]').hidden= !(xe&&!xe.inst&&xe.amount>0) }
  m.classList.add('open'); const r=btn.getBoundingClientRect(), mh=m.offsetHeight;
  const up= r.bottom+mh+90>window.innerHeight;
  m.classList.toggle('up',up);
  m.style.left=Math.max(8,r.left)+'px';
  m.style.top=(up? r.top-mh-4 : r.bottom+4)+'px';
  m.querySelector('button').focus({preventScroll:true});
}
function closeMenu(){
  $('#menu').classList.remove('open');
  document.querySelectorAll('[aria-expanded="true"].more').forEach(b=>b.setAttribute('aria-expanded','false'));
  menuFor=null;
}
$('#menu').onclick=e=>{const b=e.target.closest('[data-act]');if(!b||!menuFor)return;const {kind,id}=menuFor;closeMenu();
  if(kind==='cat'){ if(b.dataset.act==='edit') openCatSheet(id); else deleteCat(id) }
  else if(kind==='debt'){ if(b.dataset.act==='edit') openDebtSheet(id); else deleteDebt(id) }
  else if(kind==='gam'){ if(b.dataset.act==='edit') openGamSheet(id); else deleteGam(id) }
  else if(kind==='inst'){ if(b.dataset.act==='edit') openInstSheet(id); else deleteInst(id) }
  else if(kind==='inc'){ if(b.dataset.act==='edit') openIncome(id); else deleteIncome(id) }
  else if(kind==='pay'){ if(b.dataset.act==='edit') openPayForm(id); else deletePay(id) }
  else if(kind==='fix'){ if(b.dataset.act==='edit') openFixed(id); else deleteFixed(id) }
  else if(kind==='plan'){ if(b.dataset.act==='edit') openPlan(id); else deletePlan(id) }
  else if(kind==='ipl'){ if(b.dataset.act==='edit') openIPlan(id); else deleteIPlan(id) }
  else if(kind==='goal'){ if(b.dataset.act==='edit') openGoal(id); else deleteGoal(id) }
  else if(kind==='photo'){ if(b.dataset.act==='edit') $('#photoFile').click(); else removePhoto() }
  else { const a=b.dataset.act; if(a==='edit') openSheet(id); else if(a==='date') openDateSheet(id); else if(a==='cashwd') expToCash(id); else if(a==='refund') openRefund({exp:id,fixed:true}); else delExpense(id) }};
window.addEventListener('scroll',closeMenu,{passive:true}); document.body.addEventListener('scroll',closeMenu,{passive:true});
window.addEventListener('resize',closeMenu);
$('#delInSheet').onclick=()=>{const id=editId;closeSheets();delExpense(id)};
document.addEventListener('click',e=>{
  const mb=e.target.closest('[data-more],[data-catmore],[data-obmore]');
  if(mb){ let kind, id;
    if(mb.dataset.obmore){[kind,id]=mb.dataset.obmore.split(':')} else {kind=mb.dataset.more?'xp':'cat'; id=mb.dataset.more||mb.dataset.catmore}
    if(menuFor&&menuFor.kind===kind&&menuFor.id===id) closeMenu(); else openMenu(mb,kind,id); return }
  if(!e.target.closest('#menu')) closeMenu();
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){closeSheets();closeMenu()}
  if(e.key==='Enter' && document.activeElement===$('#noteInput')){$('#saveBtn').click()}
});

