/* a cell or a text → amount (>0) or null */
function impNum(v){
  if(typeof v==='number') return v>0&&v<MAXAMT?r2(v):null;
  if(v==null||typeof v==='object') return null;
  const t=impDigits(v).replace(/\s+/g,' ').trim(); if(!t||t.length>40) return null;
  const m=/^(?:[^\d\-]{0,8})?(-)?\s*(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?\s*(?:[^\d]{0,10})$/.exec(t); if(!m||m[1]) return null;
  const n=+(m[2].replace(/,/g,'')+(m[3]?'.'+m[3]:'')); return n>0&&n<MAXAMT?r2(n):null;
}
/* One line of text (PDF / txt / a single spreadsheet cell): "اكل وشرب 500ج" → {note:'اكل وشرب', amount:500} */
function impLine(raw){
  let t=impDigits(raw).replace(/\s+/g,' ').trim();
  if(t.length<2||t.length>240||IMP_TOTAL.test(t)) return null;
  let day=null, mins=null;
  const dm=IMP_DATE_RE.exec(t); if(dm){day=impDate(dm[0]); t=t.replace(dm[0],' ')}
  const tm=IMP_TIME_RE.exec(t); if(tm){mins=impTime(tm[0]); t=t.replace(tm[0],' ')}
  const hits=[]; let m; IMP_AMT_RE.lastIndex=0;
  while((m=IMP_AMT_RE.exec(t))){
    const digits=m[2].replace(/,/g,''); if(!m[2].includes(',')&&digits.length>8) continue; // phone / reference numbers
    const v=+(digits+(m[3]?'.'+m[3]:'')); if(!(v>0&&v<MAXAMT)) continue;
    const near=t.slice(m.index+m[0].length,m.index+m[0].length+2);
    if(/^\s?%/.test(near)) continue;
    hits.push({v:r2(v),cur:!!(m[1]||m[4]),at:m.index,len:m[0].length});
  }
  if(!hits.length) return null;
  const pick=hits.filter(x=>x.cur).pop()||hits[hits.length-1];
  let note=(t.slice(0,pick.at)+' '+t.slice(pick.at+pick.len))
    .replace(new RegExp(`(^|\\s)${IMP_CUR}(?=\\s|$|[:.،,])`,'giu'),' ')
    .replace(/[.·…_]{2,}/g,' ').replace(/[|:=،,;\-–—*•]+/g,' ').replace(/\s+/g,' ').trim();
  if(!/\p{L}/u.test(note)){ if(!pick.cur) return null; note='' }
  return {note:note.slice(0,200),amount:pick.v,cur:pick.cur,day,mins};
}

/* ---- category guess ---- */
const IMP_KW={
  food:'اكل;أكل;شرب;مطعم;مطاعم;فطار;فطور;غدا;غداء;عشا;عشاء;سوبر ماركت;سوبرماركت;ماركت;هايبر;بقاله;بقال;خضار;خضروات;فاكهه;فكهاني;لحمه;لحوم;جزار;فراخ;دواجن;سمك;عيش;خبز;مخبز;فرن;قهوه;كافيه;كافي;شاي;عصير;مشروب;مشروبات;حلويات;حلواني;جاتوه;كشري;فول;طعميه;فلافل;بيتزا;برجر;برجر;شاورما;كريب;سندوتش;ساندوتش;وجبه;وجبات;دليفري;طلبات;مندوب;اكسبريس;كارفور;سبينيس;خير زمان;اولاد رجب;مترو ماركت;لبن;جبنه;بيض;رز;مكرونه;زيت;سكر;food;restaurant;cafe;coffee;starbucks;costa;grocery;market;supermarket;carrefour;spinneys;talabat;elmenus;mcdonald;mcdonalds;kfc;pizza;burger;breakfast;lunch;dinner',
  trans:'مواصلات;مواصله;مترو;اوبر;كريم;سويفل;ديدي;اندرايف;تاكسي;مترو الانفاق;ميكروباص;مكروباص;اتوبيس;باص;توك توك;توكتوك;بنزين;وقود;سولار;محطه بنزين;جراج;ركنه;باركنج;موقف;كارته;غسيل عربيه;مونوريل;uber;careem;swvl;didi;indrive;taxi;metro;bus;fuel;petrol;parking;toll',
  bills:'فاتوره;فواتير;كهربا;كهرباء;نور;مياه;ميه;مايه;غاز;غاز طبيعي;عداد;صيانه العداد;bill;bills;electricity;water;gas bill',
  phone:'نت;انترنت;باقه;باقات;شحن;كارت شحن;رصيد موبايل;فودافون;اورانج;اتصالات;وي;موبايل;تليفون;خط;راوتر;واي فاي;وايفاي;فايبر;adsl;internet;wifi;data;recharge;vodafone;orange;etisalat;we;mobile;phone;sim',
  travel:'سفر;سفريه;طيران;طياره;تذكره طيران;تذاكر;فندق;حجز;رحله;قطر;قطار;مصيف;شاليه;ساحل;الساحل;شرم;الغردقه;دهب;فيزا سفر;جواز;airbnb;booking;hotel;flight;egyptair;travel;trip;train',
  shop:'هدوم;لبس;ملابس;قميص;بنطلون;جزمه;حذاء;شنطه;تسوق;شوبنج;امازون;نون;جوميا;مول;عطر;برفان;اكسسوار;اكسسوارات;ساعه;نظاره شمس;ميكب;مكياج;كوزمتكس;amazon;noon;jumia;shein;shopping;clothes;shoes;mall;zara;h&m;lc waikiki;defacto',
  health:'دكتور;دكتوره;طبيب;صيدليه;اجزخانه;دوا;دواء;ادويه;علاج;تحاليل;تحليل;معمل;اشعه;سونار;مستشفي;كشف;عياده;اسنان;نظاره;عدسات;تامين صحي;pharmacy;doctor;clinic;hospital;medicine;lab;dentist',
  fun:'سينما;فيلم;خروجه;فسحه;نادي;ملاهي;العاب;بلايستيشن;بلاي ستيشن;نتفليكس;شاهد;سبوتيفاي;انغامي;يوتيوب بريميوم;حفله;مسرح;بولينج;كافيه العاب;جيم;netflix;spotify;anghami;shahid;youtube;cinema;movie;game;games;playstation;steam;gym',
  home:'ايجار;البيت;صيانه;تصليح;حنفيه;سباك;سباكه;كهربائي;نجار;نقاش;دهان;منظفات;تنظيف;مسحوق;صابون;مناديل;فرش;اثاث;موبيليا;مطبخ;اجهزه;غساله;تلاجه;بوتاجاز;ادوات منزليه;مفروشات;ستاره;سجاد;مكوجي;خدامه;بواب;زباله;rent;home;furniture;cleaning;maintenance;ikea',
  edu:'كورس;كورسات;دروس;درس;مدرسه;مدارس;جامعه;كليه;مصاريف دراسيه;مصاريف المدرسه;كتب;كتاب;كشكول;ادوات مكتبيه;مكتبه;تعليم;سنتر;ملازم;course;courses;udemy;coursera;school;university;tuition;books;book',
  gift:'هديه;هدايا;عيديه;ورد;بوكيه;نقطه;مناسبه;فرح;عيد ميلاد;gift;gifts;flowers',
  gam:'جمعيه;قسط جمعيه',
  groc:'سوبر ماركت;سوبرماركت;هايبر;بقاله;بقال;تموين;خضار;فاكهه;جزار;لحمه;فراخ;دواجن;كارفور;سبينيس;خير زمان;اولاد رجب;كازيون;fathalla;carrefour;spinneys;seoudi;market;supermarket;grocery',
  cafe:'كافيه;كافي;قهوه;مطعم;مطاعم;كشري;بيتزا;برجر;شاورما;كريب;دليفري;طلبات;ستاربكس;كوستا;mcdonald;kfc;starbucks;costa;cafe;coffee;restaurant;pizza;burger;talabat;elmenus',
  fuel:'بنزين;سولار;وقود;محطه بنزين;توتال;وطنيه;موبيل;كوبل;fuel;petrol;gas station;total;wataniya',
  car:'عربيه;سياره;ميكانيكي;زيت موتور;اطارات;كاوتش;رخصه;ترخيص;غسيل عربيه;جراج;ركنه;باركنج;صيانه العربيه;car;parking;mechanic;tyres;tires',
  cloth:'هدوم;لبس;ملابس;قميص;بنطلون;جزمه;حذاء;فستان;جاكت;تيشرت;zara;h&m;lc waikiki;defacto;shein;clothes;shoes',
  beauty:'كوافير;حلاق;حلاقه;صالون;مكياج;ميكب;عطر;برفان;كريم;عنايه;بشره;شعر;مانيكير;بديكير;salon;barber;makeup;perfume;skincare',
  kids:'اطفال;الاولاد;لعب اطفال;حفاضات;بامبرز;لبن اطفال;حضانه;العاب اطفال;ملابس اطفال;عربيه اطفال;toys;diapers;baby;kids',
  subs:'اشتراك;اشتراكات;نتفليكس;شاهد;سبوتيفاي;انغامي;يوتيوب بريميوم;ديزني;ابل ميوزك;ايكلاود;جوجل ون;chatgpt;netflix;spotify;anghami;shahid;disney;icloud;subscription',
  charity:'صدقه;صدقات;تبرع;تبرعات;زكاه;زكاة;كفاله;اطعام;مستشفي خيري;صندوق;مؤسسه خيريه;مصر الخير;بنك الطعام;مستشفى 57357;charity;donation;zakat',
  family:'الاهل;ماما;بابا;امي;ابويا;اخويا;اختي;مساعده;فلوس البيت;مصروف البيت;حما;حماتي;جدتي;جدي',
  rent:'ايجار;الايجار;ايجار الشقه;ايجار المحل;rent',
  school:'مصاريف مدرسه;مصاريف المدرسه;حضانه;اتوبيس المدرسه;زي مدرسي;كراسات;الدروس;school;nursery',
  sport:'جيم;نادي;اشتراك نادي;كابتن;تمرين;مسبح;حمام سباحه;كره;ملعب;gym;club;fitness;swimming',
  pets:'قطه;قطط;كلب;كلاب;اكل قطط;اكل كلاب;بيطري;دكتور بيطري;pet;vet;cat;dog',
  repair:'صيانه;تصليح;سباك;كهربائي;نجار;نقاش;دهان;فني;تصليح موبايل;repair;plumber;electrician',
  furn:'اثاث;موبيليا;غساله;تلاجه;بوتاجاز;تكييف;تلفزيون;ديب فريزر;مروحه;سجاد;ستاير;ايكيا;ikea;furniture;appliances',
  insur:'تامين;تأمين;وثيقه;قسط تامين;insurance;policy',
  tax:'ضريبه;ضرائب;رسوم;غرامه;مخالفه;مرور;شهر عقاري;جمارك;tax;fee;fine;ticket',
  bank:'رسوم بنكيه;مصاريف بنكيه;عموله;رسوم كارت;رسوم سحب;رسوم تحويل;فوائد;bank fee;commission;atm fee',
  game:'بلايستيشن;بلاي ستيشن;ستيم;العاب;شحن العاب;ببجي;فري فاير;فيفا;xbox;playstation;steam;pubg;fifa;game',
  work:'شغل;للشغل;مكتب;ادوات;لابتوب;طابعه;حبر;ورق;برنامج;استضافه;دومين;work;office;laptop;printer;hosting;domain',
  events:'فرح;افراح;نقطه;نقوط;مناسبه;خطوبه;كتب كتاب;عزاء;سبوع;عقيقه;عيد ميلاد;حفله;wedding;party;birthday'
};
const IMP_NEW=new Set(['groc','cafe','fuel','car','cloth','beauty','kids','subs','charity','family','rent','school','sport','pets','repair','furn','insur','tax','bank','game','work','events']);
let IMP_KWN=null;
const impKw=()=>IMP_KWN||(IMP_KWN=Object.fromEntries(Object.entries(IMP_KW).map(([k,v])=>[k,[...new Set(v.split(';').map(AR_NORM).filter(Boolean))]])));
/* word forms with the usual Arabic prefixes taken off: والفواتير → فواتير */
function impToks(n){
  const out=new Set();
  n.split(/[^\p{L}\p{N}&]+/u).filter(Boolean).forEach(w=>{out.add(w);
    for(const pre of ['وال','بال','لل','فال','كال','ال','و','ب','ل','ف']) if(w.startsWith(pre)&&w.length-pre.length>=2) out.add(w.slice(pre.length))});
  return out;
}
function impScore(n,toks,kws){
  let s=0;
  for(const k of kws){
    if(k.includes(' ')){ if((' '+n+' ').includes(' '+k+' ')||n.includes(k)) s+=k.length+3 }
    else if(k.length<=3){ if(toks.has(k)) s+=k.length+1 }
    else { for(const w of toks){ if(w===k||(w.startsWith(k)&&w.length<=k.length+3)){ s+=k.length; break } } }
  }
  return s;
}
/* note → the category it was saved under most often */
function impHistory(){
  const cnt=new Map();
  S.expenses.forEach(e=>{const n=AR_NORM(e.note); if(!n||!CAT[e.cat]) return; const m=cnt.get(n)||{}; m[e.cat]=(m[e.cat]||0)+1; cnt.set(n,m)});
  const best=new Map(); cnt.forEach((m,n)=>best.set(n,Object.entries(m).sort((a,b)=>b[1]-a[1])[0][0])); return best;
}
function impGuessCat(note,catText,hist){
  const ct=AR_NORM(catText);
  if(ct){ // a category column (our own Excel export, or the user's sheet)
    const c=S.cats.find(c=>AR_NORM(c.name)===ct)||S.cats.find(c=>{const cn=AR_NORM(c.name);return ct.length>=3&&cn.length>=3&&(cn.includes(ct)||ct.includes(cn))});
    if(c) return c.id;
  }
  const n=AR_NORM(note); if(!n&&!ct) return 'other';
  if(n&&hist&&hist.has(n)) return hist.get(n);
  {const l=learnedCat(note); if(l) return l}
  const all=(n+' '+ct).trim(), toks=impToks(all);
  let best='other', score=0;
  S.cats.forEach(c=>{ if(c.id==='other') return;
    const nameToks=[...impToks(AR_NORM(c.name))].filter(w=>w.length>=3);
    let s=nameToks.some(w=>toks.has(w))?12:0;                     // the category's own name (works for custom categories)
    if(IMP_KW[c.id]) s+=impScore(all,toks,impKw()[c.id]);
    if(s>0&&IMP_NEW.has(c.id)) s+=2; // a more specific category wins a tie against the older broad ones
    if(s>score){score=s;best=c.id}
  });
  return CAT[best]?best:'other';
}

/* ---- readers ---- */
const IMP_H={
  amount:/^(?:ال)?(?:مبلغ|سعر|قيمه|تكلفه|ثمن|مصروف|مدفوع|المدفوع)|^(?:amount|price|cost|value|paid|spent|expense)s?\b/i,
  debit:/^(?:ال)?(?:مدين|خصم|سحب|مسحوب|منصرف)|^(?:debit|withdrawal|withdrawals|dr)\b/i,
  credit:/^(?:ال)?(?:دائن|ايداع|اضافه|وارد)|^(?:credit|deposit|deposits|cr)\b/i,
  desc:/^(?:ال)?(?:بيان|وصف|تفاصيل|صنف|بند|اسم|تاجر|جهه|سبب|غرض|شرح)|^(?:description|desc|details|item|items|name|merchant|narration|particulars|payee|memo)\b/i,
  note:/^(?:ال)?(?:ملاحظه|ملاحظات)|^(?:note|notes|comment|comments|remarks)\b/i,
  date:/^(?:ال)?(?:تاريخ|يوم)|^(?:date|day|transaction date|posting date)\b/i,
  time:/^(?:ال)?(?:وقت|ساعه)|^(?:time)\b/i,
  cat:/^(?:ال)?(?:فيه|فئه|تصنيف|نوع|قسم)|^(?:category|type|class)\b/i,
  pay:/^(?:ال)?(?:طريقه الدفع|وسيله الدفع|الدفع)|^(?:payment|method|payment method)\b/i
};
function impHeader(row){
  const map={}; let hits=0;
  (row||[]).forEach((c,i)=>{ if(typeof c!=='string') return; const n=AR_NORM(c).replace(/[():\[\]]/g,' ').trim(); if(!n||n.length>40) return;
    for(const k of ['debit','credit','amount','desc','note','date','time','cat','pay']) if(map[k]==null&&IMP_H[k].test(n)){map[k]=i;hits++;break} });
  return (map.amount!=null||map.debit!=null)&&hits>=2? map : null;
}
const impHasLetters=v=>typeof v==='string'&&/\p{L}/u.test(v);
const impTxt=v=>typeof v==='string'?v.replace(/\s+/g,' ').trim():'';
/* sheets = [{name, rows:[[cell...]]}] → rows for the review list */
function impFromSheets(sheets){
  const out=[]; let headed=false;
  sheets.forEach(sh=>{
    const rows=sh.rows; let hi=-1, H=null;
    for(let i=0;i<Math.min(rows.length,20);i++){const h=impHeader(rows[i]); if(h){hi=i;H=h;break}}
    if(!H) return; headed=true;
    for(let i=hi+1;i<rows.length;i++){
      const r=rows[i]||[]; if(!r.some(c=>c!==''&&c!=null)) continue;
      const cells=r.map(c=>typeof c==='string'?c.trim():c);
      if(cells.some(c=>typeof c==='string'&&IMP_TOTAL.test(impDigits(c)))) continue;
      let amount= H.debit!=null? impNum(cells[H.debit]) : null;
      if(amount==null&&H.amount!=null) amount=impNum(cells[H.amount]);
      if(amount==null) continue;                                   // credit-only rows, empty rows
      const used=new Set(Object.values(H));
      let note=[H.desc,H.note].filter(k=>k!=null).map(k=>impTxt(cells[k])).filter(Boolean).join(' · ');
      if(!note) note=cells.filter((c,j)=>!used.has(j)&&impHasLetters(c)).map(impTxt).join(' · ');
      const day=H.date!=null?impDate(cells[H.date]):null;
      const mins=H.time!=null?impTime(cells[H.time]):(H.date!=null&&cells[H.date]&&cells[H.date].d!=null?impTime(cells[H.date])||null:null); // a date with no time → noon
      out.push({note:note.slice(0,200),amount,day,mins,catText:H.cat!=null?impTxt(cells[H.cat]):'',payText:H.pay!=null?impTxt(cells[H.pay]):''});
    }
  });
  if(headed) return out;
  /* no header anywhere: take each row on its own (a description cell + a number cell, or "اكل 500ج" in one cell) */
  sheets.forEach(sh=>sh.rows.forEach(r=>{
    const cells=(r||[]).filter(c=>c!==''&&c!=null); if(!cells.length) return;
    if(cells.some(c=>typeof c==='string'&&IMP_TOTAL.test(impDigits(c)))) return;
    const nums=cells.map(impNum).map((v,j)=>v!=null&&!(cells[j]&&cells[j].d!=null)?{v,j}:null).filter(Boolean);
    const texts=cells.filter(c=>impHasLetters(c)&&impNum(c)==null);
    if(nums.length&&texts.length){
      const curCell=nums.filter(x=>typeof cells[x.j]==='string'&&new RegExp(IMP_CUR,'iu').test(cells[x.j])).pop();
      const pick=curCell||nums[nums.length-1];
      const dc=cells.find(c=>impDate(c)); 
      out.push({note:texts.map(impTxt).sort((a,b)=>b.length-a.length)[0].slice(0,200),amount:pick.v,day:dc?impDate(dc):null,mins:null,catText:'',payText:''});
    } else {
      const l=impLine(cells.map(c=>typeof c==='object'&&c.d!=null?dkToDMY(dayKey(c.d)):String(c)).join(' '));
      if(l) out.push({...l,catText:'',payText:''});
    }
  }));
  return out;
}
/* text lines (PDF / .txt) → rows. When most money lines carry a currency, lines without one are dropped (page numbers, years...) */
function impFromLines(lines){
  const got=lines.map(impLine).filter(Boolean);
  const withCur=got.filter(x=>x.cur).length;
  const keep= withCur>=2&&withCur>=got.length*0.4? got.filter(x=>x.cur) : got;
  /* a document with one date only (an invoice / receipt date): its rows get that date */
  const dates=new Set(lines.map(l=>{const m=IMP_DATE_RE.exec(impDigits(l));return m?impDate(m[0]):null}).filter(Boolean));
  const docDay= dates.size===1&&!keep.some(x=>x.day)? [...dates][0] : null;
  return keep.map(x=>({note:x.note,amount:x.amount,day:x.day||docDay,mins:x.mins,catText:'',payText:''}));
}
function impCsv(text){
  const first=text.split(/\r?\n/,1)[0]||'';
  const delim=[',',';','\t'].map(d=>[d,first.split(d).length]).sort((a,b)=>b[1]-a[1])[0][0];
  const rows=[]; let row=[], cell='', q=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(q){ if(ch==='"'){ if(text[i+1]==='"'){cell+='"';i++} else q=false } else cell+=ch; continue }
    if(ch==='"'&&cell==='') q=true;
    else if(ch===delim){row.push(cell);cell=''}
    else if(ch==='\n'||ch==='\r'){ if(ch==='\r'&&text[i+1]==='\n') i++; row.push(cell); rows.push(row); row=[]; cell=''; if(rows.length>=20000) break }
    else cell+=ch;
  }
  if(cell!==''||row.length){row.push(cell);rows.push(row)}
  return rows.map(r=>r.map(c=>{const n=impNum(c); return n!=null&&/^\s*[\d.,]+\s*$/.test(impDigits(c))? n : c}));
}
function impDecode(buf){
  let t; try{t=new TextDecoder('utf-8',{fatal:true}).decode(buf)}catch(e){try{t=new TextDecoder('windows-1256').decode(buf)}catch(e2){t=new TextDecoder().decode(buf)}}
  return t.replace(/^\uFEFF/,'');
}
/* ---- .xlsx: unzip (fflate) + read the sheet XML ---- */
async function impXlsx(buf){
  if(!window.fflate){ try{await loadScript('libs/fflate.min.js')}catch(e){throw impErr('مقدرتش أجهز قارئ Excel، جرب تاني')} }
  let total=0, files;
  try{ files=window.fflate.unzipSync(buf,{filter:f=>{ if(!/^xl\/(workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|styles\.xml|worksheets\/[^/]+\.xml)$/i.test(f.name)) return false;
      total+=f.originalSize; if(f.originalSize>40e6||total>80e6) throw impErr('الملف كبير قوي'); return true }}) }
  catch(e){ if(e.user) throw e; throw impErr('الملف ده مش ملف Excel سليم') }
  const dec=n=>files[n]?new TextDecoder().decode(files[n]):'';
  const X=s=>new DOMParser().parseFromString(s,'application/xml');
  const tags=(n,t)=>n?Array.from(n.getElementsByTagNameNS('*',t)):[];
  const wbXml=dec('xl/workbook.xml'); if(!wbXml) throw impErr('الملف ده مش ملف Excel سليم');
  const sst=tags(X(dec('xl/sharedStrings.xml')||'<sst/>'),'si').map(si=>tags(si,'t').filter(t=>t.parentNode&&t.parentNode.localName!=='rPh').map(t=>t.textContent).join(''));
  const st=X(dec('xl/styles.xml')||'<styleSheet/>');
  const fmts={}; tags(st,'numFmt').forEach(f=>{fmts[f.getAttribute('numFmtId')]=f.getAttribute('formatCode')||''});
  const isDateFmt=id=>{id=+id; if((id>=14&&id<=22)||(id>=27&&id<=36)||(id>=45&&id<=47)||(id>=50&&id<=58)) return true;
    const c=(fmts[id]||'').replace(/"[^"]*"|\[[^\]]*\]|\\./g,''); return /[dy]/i.test(c)||(/m/i.test(c)&&!/[hs0#]/i.test(c))};
  const xfs=tags(tags(st,'cellXfs')[0],'xf').map(x=>isDateFmt(x.getAttribute('numFmtId')||0));
  const rels={}; tags(X(dec('xl/_rels/workbook.xml.rels')),'Relationship').forEach(r=>{rels[r.getAttribute('Id')]=r.getAttribute('Target')||''});
  const RNS='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const sheets=[];
  tags(X(wbXml),'sheet').forEach(s=>{
    if((s.getAttribute('state')||'')!=='' && s.getAttribute('state')!=='visible') return; // hidden sheets
    const rid=s.getAttributeNS(RNS,'id')||s.getAttribute('r:id'); let tg=rels[rid]; if(!tg) return;
    tg=tg.startsWith('/')?tg.slice(1):('xl/'+tg).replace(/[^/]+\/\.\.\//g,'');
    const xml=dec(tg); if(!xml) return;
    const rows=[];
    tags(X(xml),'row').some(r=>{
      const cells=[];
      tags(r,'c').forEach(c=>{
        const ref=c.getAttribute('r')||''; let col=0; for(const ch of ref.replace(/\d+$/,'')) col=col*26+(ch.charCodeAt(0)-64); col=col?col-1:cells.length;
        const t=c.getAttribute('t')||'', vEl=tags(c,'v')[0], v=vEl?vEl.textContent:'';
        let val='';
        if(t==='s') val=sst[+v]??'';
        else if(t==='inlineStr') val=tags(c,'t').map(x=>x.textContent).join('');
        else if(t==='str') val=v;
        else if(t==='b'||t==='e') val='';
        else if(v!==''){ const n=+v; if(isFinite(n)){ const s=+(c.getAttribute('s')||0);
            if(xfs[s]&&n>0&&n<2958466){ const d=new Date(Math.round((n-25569)*864e5)); val={d:new Date(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate(),d.getUTCHours(),d.getUTCMinutes()).getTime()} }
            else val=n } }
        if(col<200) cells[col]=val;
      });
      for(let i=0;i<cells.length;i++) if(cells[i]===undefined) cells[i]='';
      rows.push(cells); return rows.length>=20000;
    });
    sheets.push({name:s.getAttribute('name')||'',rows});
  });
  return sheets;
}
/* Many PDFs store the lam-alef ligature (لا / لإ / لأ / لآ) as one glyph that comes back reversed ("مواصالت").
   Both orders are real Arabic, so a word is only flipped when the flipped form is a word we know
   (category keywords and names, the user's own notes) and the word as read is not. */
const IMP_EXTRA_WORDS='الإجمالي;إجمالي;اجمالي;المواصلات;مواصلات;ميلاد;ملابس;علاج;صلاة;بلاستيك;لاب توب;شلال;غلاف;خلاط;سلاطة;بلاط;ملاعق;فلاتر;اشتراك;تلاجة;غسالة;حلاق;حلاقة;كلاس;دولار;ريالات;سلامة;علامة;حلاوة;شوكولاتة;بالاشتراك';
function impVocab(){
  const v=new Set(), add=s=>impToks(AR_NORM(s)).forEach(w=>{if(w.length>=3) v.add(w)});
  Object.values(IMP_KW).forEach(s=>s.split(';').forEach(add)); IMP_EXTRA_WORDS.split(';').forEach(add);
  S.cats.forEach(c=>add(c.name)); S.expenses.slice(-3000).forEach(e=>add(e.note||''));
  return v;
}
function impFixLamAlef(lines){
  let V=null;
  const known=w=>[...impToks(AR_NORM(w))].some(t=>t.length>=3&&V.has(t));
  for(let i=0;i<lines.length;i++){
    lines[i]=lines[i].replace(/[\u0621-\u064A]*[اإأآ]ل[\u0621-\u064A]*/g,w=>{
      const at=[]; for(let j=0;j<w.length-1;j++) if('اإأآ'.includes(w[j])&&w[j+1]==='ل') at.push(j);
      if(!at.length||at.length>4) return w;
      V=V||impVocab(); if(known(w)) return w;
      for(let mask=1;mask<(1<<at.length);mask++){
        const c=[...w]; at.forEach((j,k)=>{ if(mask&(1<<k)){const a=c[j];c[j]='ل';c[j+1]=a} });
        const cand=c.join(''); if(known(cand)) return cand;
      }
      return w;
    });
  }
}
/* ---- PDF text (pdf.js, text layer only: a scanned PDF has none) ---- */
async function impPdf(buf){
  let pdfjs;
  try{ pdfjs=await import('./libs/pdf.min.js'); pdfjs.GlobalWorkerOptions.workerSrc='libs/pdf.worker.min.js' }
  catch(e){ throw impErr('مقدرتش أجهز قارئ PDF، جرب تاني') }
  let doc;
  try{ doc=await pdfjs.getDocument({data:buf,isEvalSupported:false,disableFontFace:true,useSystemFonts:false,enableXfa:false,stopAtErrors:false}).promise }
  catch(e){ throw impErr(e&&e.name==='PasswordException'?'الملف ده عليه باسورد. افتحه واحفظه من غير باسورد وجرب تاني':'الملف ده مش PDF سليم') }
  const lines=[];
  try{
    for(let p=1;p<=Math.min(doc.numPages,IMP_MAX_PAGES);p++){
      const page=await doc.getPage(p), tc=await page.getTextContent({disableNormalization:true}), rows=[];
      tc.items.forEach(it=>{ if(!it.str||!it.str.trim()) return;
        const y=it.transform[5], x=it.transform[4], h=Math.abs(it.transform[3])||it.height||10;
        let r=rows.find(r=>Math.abs(r.y-y)<h*0.55); if(!r){r={y,items:[]};rows.push(r)} r.items.push({x,s:it.str,rtl:it.dir==='rtl'}) });
      rows.sort((a,b)=>b.y-a.y).forEach(r=>{
        const rtl=r.items.filter(i=>i.rtl).length>=r.items.length/2;
        r.items.sort((a,b)=>rtl?b.x-a.x:a.x-b.x); lines.push(r.items.map(i=>i.s).join(' ').normalize('NFKC').replace(/\s+/g,' ').trim());
      });
      page.cleanup();
    }
  } finally { try{await doc.destroy()}catch(e){} }
  impFixLamAlef(lines);
  if(lines.join('').replace(/\s/g,'').length<10) throw impErr('الملف ده شكله صورة (اسكان) ومفيهوش كلام أقدر أقراه. جرب ملف Excel أو PDF متعمل من برنامج');
  return lines;
}
async function impParse(f){
  if(f.size>IMP_MAX_BYTES) throw impErr('الملف كبير قوي (أكتر من 15 ميجا)');
  const buf=new Uint8Array(await f.arrayBuffer()), name=(f.name||'').toLowerCase();
  if(buf[0]===0x25&&buf[1]===0x50&&buf[2]===0x44&&buf[3]===0x46) return impFromLines(await impPdf(buf));
  if(buf[0]===0x50&&buf[1]===0x4B) return impFromSheets(await impXlsx(buf));
  if(buf[0]===0xD0&&buf[1]===0xCF) throw impErr('ملفات Excel القديمة (.xls) مش مدعومة. افتح الملف في Excel واحفظه بصيغة .xlsx وجرب تاني');
  if(buf.slice(0,2000).some(b=>b===0)) throw impErr('نوع الملف ده مش مدعوم. استخدم PDF أو Excel (.xlsx) أو CSV');
  const text=impDecode(buf);
  const first=text.split(/\r?\n/,1)[0]||'';
  if(/\.(csv|tsv)$/.test(name)||/[,;\t]/.test(first)&&impCsv(text.slice(0,4000)).filter(r=>r.length>1).length>=2) return impFromSheets([{name:'',rows:impCsv(text)}]);
  return impFromLines(text.split(/\r?\n/));
}

/* ---- review sheet ---- */
let IMP=null;
function impPrepare(rows,fileName){
  const hist=impHistory(), t=todayKey();
  const have=new Set(S.expenses.map(e=>dayKey(e.ts)+'|'+r2(e.amount)+'|'+AR_NORM(e.note)));
  const payBy=v=>{const n=AR_NORM(v); if(!n) return null; const p=S.pays.find(x=>AR_NORM(x.name)===n)||S.pays.find(x=>{const pn=AR_NORM(x.name);return pn.length>=3&&(n.includes(pn)||pn.includes(n))}); return p?p.id:null};
  const list=rows.slice(0,IMP_MAX_ROWS).map(r=>{
    let day=r.day&&r.day<=t?r.day:(r.day?t:null);
    const cat=impGuessCat(r.note,r.catText,hist);
    const dup=!!day&&have.has(day+'|'+r2(r.amount)+'|'+AR_NORM(r.note));
    return {on:!dup,note:r.note||'',amount:r.amount,cat,day,mins:r.mins,pay:payBy(r.payText),dup};
  });
  IMP={rows:list,name:fileName,cut:rows.length>IMP_MAX_ROWS};
}
function impCatOpts(sel){return S.cats.map(c=>`<option value="${esc(c.id)}"${c.id===sel?' selected':''}>${esc(c.e)} ${esc(c.name)}</option>`).join('')}
function impRender(){
  if(!IMP) return;
  const r=IMP.rows, on=r.filter(x=>x.on), dups=r.filter(x=>x.dup).length;
  $('#impInfo').textContent=`لقيت ${r.length} بند في «\u2068${str(IMP.name,40)}\u2069»`+(IMP.cut?` (أول ${IMP_MAX_ROWS} بس)`:'')+(dups?`، منهم ${dups} متسجل قبل كده ومش متعلّم`:'')+'. راجع الفئات قبل ما تسجّل.';
  const by={}; on.forEach(x=>{by[x.cat]=(by[x.cat]||0)+x.amount});
  $('#impSum').innerHTML=Object.entries(by).sort((a,b)=>b[1]-a[1]).map(([id,v])=>{const c=CAT[id]||CAT.other;return `<span class="imp-chip" style="--cc:${colr(c.c)}">${esc(c.e)} ${esc(c.name)} <b>${fmt(v)}</b></span>`}).join('');
  $('#impDateRow').hidden=!r.some(x=>x.on&&!x.day);
  $('#impAll').textContent=on.length===r.length?'شيل التحديد':'حدد الكل';
  $('#impList').innerHTML=r.map((x,i)=>`<div class="imp-row${x.on?'':' off'}" data-i="${i}">
    <label class="imp-ck"><input type="checkbox" data-imp-on${x.on?' checked':''} aria-label="ضيف ${esc(x.note||'البند ده')}"></label>
    <div class="imp-main"><b>${esc(x.note||'من غير وصف')}</b>
      <small>${x.day?dkToDMY(x.day):'من غير تاريخ'}${x.dup?' · متسجل قبل كده':''}</small>
      <select data-imp-cat aria-label="الفئة">${impCatOpts(x.cat)}</select></div>
    <span class="imp-amt">${money(x.amount)}</span></div>`).join('');
  const total=on.reduce((a,x)=>a+x.amount,0);
  $('#impSave').disabled=!on.length;
  $('#impSave').textContent=on.length?`سجّل ${on.length} مصروف (${fmt(total)} ${CS()})`:'اختار بنود الأول';
}
$('#impList').addEventListener('change',e=>{
  const row=e.target.closest('.imp-row'); if(!row||!IMP) return; const x=IMP.rows[+row.dataset.i]; if(!x) return;
  if(e.target.matches('[data-imp-on]')) x.on=e.target.checked;
  if(e.target.matches('[data-imp-cat]')&&CAT[e.target.value]) x.cat=e.target.value;
  const y=$('#impList').scrollTop; impRender(); $('#impList').scrollTop=y;
});
$('#impAll').onclick=()=>{if(!IMP) return; const all=IMP.rows.every(x=>x.on); IMP.rows.forEach(x=>{x.on=!all}); impRender()};
$('#impCancel').onclick=()=>{IMP=null;closeSheets()};
$('#impSave').onclick=()=>{
  if(!IMP) return; const sel=IMP.rows.filter(x=>x.on); if(!sel.length) return;
  const t=todayKey(), dv=$('#impDate').value, fallback=isDK(dv)&&dv<=t?dv:t, pay=PAY[S.lastPay]?S.lastPay:'cash';
  const added=sel.map(x=>{
    const dk=x.day||fallback; let ts=tsForDay(dk);
    if(x.mins!=null){const [y,m,d]=dk.split('-').map(Number); ts=new Date(y,m-1,d,Math.floor(x.mins/60),x.mins%60).getTime()}
    return cleanExpense({id:uid(),amount:x.amount,cat:CAT[x.cat]?x.cat:'other',note:x.note,pay:x.pay&&PAY[x.pay]?x.pay:pay,ts:Math.min(ts,Date.now())});
  }).filter(Boolean);
  if(!added.length) return;
  S.expenses.push(...added); IMP=null; save(); closeSheets(); renderAll(); setTimeout(checkAlerts,450);
  const ids=new Set(added.map(e=>e.id));
  toast(`اتسجل ${added.length} مصروف بإجمالي ${fmt(sum(added))} ${CS()}`,'تراجع',()=>{S.expenses=S.expenses.filter(e=>!ids.has(e.id)); save(); renderAll()},6000);
};
$('#impBtn').onclick=()=>$('#impFile').click();
$('#impFile').onchange=async e=>{
  const f=e.target.files&&e.target.files[0]; e.target.value=''; if(!f) return;
  const b=$('#impBtn'), t0=b.textContent; b.disabled=true; b.textContent='بقرا الملف...';
  try{
    const rows=await impParse(f);
    if(!rows.length){toast('ملقتش مصاريف في الملف ده. لازم يبقى فيه وصف ومبلغ لكل بند',null,null,5000);return}
    impPrepare(rows,f.name||'الملف');
    $('#impDate').max=todayKey(); $('#impDate').value=todayKey();
    impRender(); openSheetEl('impSheet'); $('#impList').scrollTop=0;
  }catch(err){ console.error(err); toast(err&&err.user?err.user:'معرفتش أقرا الملف ده',null,null,5000) }
  finally{ b.disabled=false; b.textContent=t0 }
};
$('#backupBtn').onclick=async()=>{
  if(AB){backupNow(true);return}
  if(!db||!myId){toast('النسخ الاحتياطي محتاج تكون مسجل دخول');return}
  try{const at=Date.now();
    await (await backupDoc()).set({payload:JSON.stringify(backupData()),at,count:S.expenses.length});
    S.lastBackup=at;save();renderSettings();renderHome();toast('اتعملت نسخة احتياطية ('+S.expenses.length+' مصروف)');
  }catch(e){toast(e&&e.code==='quota_exceeded'?'النسخة كبيرة على المساحة المتاحة':'معرفناش نعمل نسخة احتياطية')}
};
$('#restoreBtn').onclick=async()=>{
  if(AB){openRestore();return}
  if(!db||!myId){toast('الاستعادة محتاجة تكون مسجل دخول');return}
  try{const snap=await (await backupDoc()).get();
    if(!snap.exists){toast('مفيش نسخة احتياطية محفوظة');return}
    const d=snap.data(); applyBackup(JSON.parse(d.payload), d.at);
  }catch(e){toast('معرفناش نسترجع النسخة')}
};


