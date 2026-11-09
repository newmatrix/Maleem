/* Exports */
let downloads=null;
const mimeOf=n=>n.endsWith('.pdf')?'application/pdf':n.endsWith('.xlsx')?'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':'application/json';
async function toB64(data){const blob= data instanceof Blob? data : new Blob([data]); const buf=new Uint8Array(await blob.arrayBuffer());
  let s=''; for(let i=0;i<buf.length;i+=0x8000) s+=String.fromCharCode.apply(null,buf.subarray(i,i+0x8000)); return btoa(s)}
async function saveFile(filename,data){
  if(AB){ try{ const r=AB.saveFile(filename,await toB64(data),mimeOf(filename));
      toast(r===true||r==='ok'?'اتحفظ في التنزيلات ← Maleem': r==='perm'?'اسمح للتطبيق بحفظ الملفات من الرسالة اللي ظهرت، وبعدين احفظ تاني':'معرفناش نحفظ الملف') }catch(e){toast('معرفناش نحفظ الملف')} return }
  if(!downloads){toast('الحفظ مش متاح في العرض ده');return}
  try{await downloads.save({filename,data});toast('اتحفظ الملف')}
  catch(err){ if(err&&err.code==='declined') return; toast(err&&err.code==='rate_limited'?'استنى ثانية وجرب تاني':'معرفناش نحفظ الملف') }
}
function reportTimes(){return S.expenses.concat(S.inflows,S.transfers,S.instPays).map(x=>x.ts)
  .concat(S.insts.flatMap(p=>p.items.map(i=>dkToTs(i.due)))).filter(t=>Number.isFinite(t)&&t>0)}
function monthsWithData(){return [...new Set(reportTimes().map(t=>periodAt(t,repPd()).key))].sort()}
function reportHasData(P){return reportTimes().some(t=>t>=P.start&&t<P.next)}
/* Heavy export libraries are loaded only when needed (keeps app start fast) */
const _ld={};
function loadScript(src){return _ld[src]||(_ld[src]=new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>{delete _ld[src];no(new Error(src))};document.head.appendChild(s)}))}
const needLib=()=>Promise.all([window.html2canvas?0:loadScript('libs/html2canvas.min.js'),window.jspdf?0:loadScript('libs/jspdf.umd.min.js')]);
/* Built-in XLSX writer (replaces the SheetJS library and its known vulnerabilities): the workbook is a small
   ZIP (stored, no compression) of the XML parts Excel needs. Text is always written as text, never as a formula. */
const XL={
  crcT:null,
  crc(b){let t=XL.crcT;if(!t){t=XL.crcT=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}}
    let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=t[(c^b[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0},
  zip(files){
    const enc=new TextEncoder(), parts=[], cen=[]; let off=0;
    files.forEach(f=>{
      const nm=enc.encode(f.name), d=typeof f.data==='string'?enc.encode(f.data):f.data, crc=XL.crc(d);
      const h=new Uint8Array(30+nm.length), v=new DataView(h.buffer);
      v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x0800,true);v.setUint16(12,0x21,true);
      v.setUint32(14,crc,true);v.setUint32(18,d.length,true);v.setUint32(22,d.length,true);v.setUint16(26,nm.length,true);h.set(nm,30);
      parts.push(h,d);
      const c=new Uint8Array(46+nm.length), w=new DataView(c.buffer);
      w.setUint32(0,0x02014b50,true);w.setUint16(4,20,true);w.setUint16(6,20,true);w.setUint16(8,0x0800,true);w.setUint16(14,0x21,true);
      w.setUint32(16,crc,true);w.setUint32(20,d.length,true);w.setUint32(24,d.length,true);w.setUint16(28,nm.length,true);w.setUint32(42,off,true);c.set(nm,46);
      cen.push(c); off+=h.length+d.length;
    });
    const cs=cen.reduce((a,c)=>a+c.length,0), e=new Uint8Array(22), x=new DataView(e.buffer);
    x.setUint32(0,0x06054b50,true);x.setUint16(8,files.length,true);x.setUint16(10,files.length,true);x.setUint32(12,cs,true);x.setUint32(16,off,true);
    return new Blob([...parts,...cen,e],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  },
  x:s=>String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g,'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])),
  col(i){let s='';i++;while(i){const m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=Math.floor((i-1)/26)}return s},
  sheet(rows,widths,boldRows){
    const bold=new Set(boldRows||[]);
    const data=rows.map((row,ri)=>`<row r="${ri+1}">`+(row||[]).map((v,ci)=>{
      if(v==null||v==='') return ''; const ref=XL.col(ci)+(ri+1), st=bold.has(ri)?' s="1"':'';
      return typeof v==='number'&&isFinite(v)? `<c r="${ref}"${st}><v>${v}</v></c>` : `<c r="${ref}"${st} t="inlineStr"><is><t xml:space="preserve">${XL.x(v)}</t></is></c>`;
    }).join('')+'</row>').join('');
    const cols=widths&&widths.length?'<cols>'+widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')+'</cols>':'';
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0" rightToLeft="1"/></sheetViews>${cols}<sheetData>${data}</sheetData></worksheet>`;
  },
  book(sheets){
    const used=new Set(), H='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
    const names=sheets.map((s,i)=>{const n=String(s.name||'').replace(/[\[\]:*?\/\\]/g,'-').replace(/^'+|'+$/g,'').slice(0,31)||('Sheet'+(i+1));
      let k=n,j=2; while(used.has(k.toLowerCase())) k=n.slice(0,26)+' ('+(j++)+')'; used.add(k.toLowerCase()); return k});
    const files=[
      {name:'[Content_Types].xml',data:H+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
        +sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')+'</Types>'},
      {name:'_rels/.rels',data:H+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'},
      {name:'xl/workbook.xml',data:H+'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>'
        +names.map((n,i)=>`<sheet name="${XL.x(n)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')+'</sheets></workbook>'},
      {name:'xl/_rels/workbook.xml.rels',data:H+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        +sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')
        +`<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`},
      {name:'xl/styles.xml',data:H+'<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'},
      ...sheets.map((s,i)=>({name:`xl/worksheets/sheet${i+1}.xml`,data:XL.sheet(s.rows,s.widths,s.bold)}))
    ];
    return XL.zip(files);
  }
};
async function exportXlsx(all){
  const months= all? monthsWithData(): [repP(curMonth).key];
  if(!months.length||(!all&&!reportHasData(repP(curMonth)))){toast('مفيش مصاريف تتحفظ');return}
  try{
    const amtH='المبلغ ('+CS()+')', per=months.map(mk=>{const P=repP(mk),l=ofPeriod(P);return {P,l,c:byCat(l)}});
    const usedCats=S.cats.filter(k=>per.some(x=>x.c[k.id]));
    const extra=[...new Set(per.flatMap(x=>Object.keys(x.c)))].filter(id=>!usedCats.some(k=>k.id===id)); // categories deleted since
    const catCols=[...usedCats.map(k=>({id:k.id,name:k.name})),...extra.map(id=>({id,name:(CAT[id]||CAT.other).name}))];
    const summary=[[repPd()===1?'الشهر':'الفترة','الإجمالي',...catCols.map(c=>c.name)],
      ...per.map(x=>[repName(x.P),r2(sum(x.l)),...catCols.map(c=>x.c[c.id]?r2(x.c[c.id]):'')])];
    const sheets=[{name:'الملخص',rows:summary,widths:[30,12,...catCols.map(()=>14)],bold:[0]}];
    if(S.accounts.length||S.inflows.length||S.transfers.length||S.insts.length){
      const inP=t=>per.some(x=>t>=x.P.start&&t<x.P.next), rows=[], hdr=[];
      rows.push(['الحسابات (الأرصدة دلوقتي)']); hdr.push(rows.length-1);
      rows.push(['الحساب','النوع','العملة','الرصيد']); S.accounts.forEach(a=>rows.push([accDisp(a),ACC_TYPES[a.type].n,a.cur,accBal(a.id)])); rows.push([]);
      const inf=S.inflows.filter(x=>inP(x.ts)).sort((a,b)=>a.ts-b.ts);
      rows.push(['الدخل المستلم']); hdr.push(rows.length-1); rows.push(['التاريخ','المصدر',amtH,'الحساب','ملاحظة']);
      inf.forEach(x=>rows.push([dkToDMY(dayKey(x.ts)),x.src||'دخل',x.amount,(ACC(x.acc)||{}).name||'',x.note||''])); rows.push(['الإجمالي','',r2(inf.reduce((a,x)=>a+x.amount,0))],[]);
      const trs=S.transfers.filter(t=>inP(t.ts)).sort((a,b)=>a.ts-b.ts);
      rows.push(['التحويلات بين الحسابات (مش مصروف ولا دخل)']); hdr.push(rows.length-1); rows.push(['التاريخ','الوقت','من','إلى','المبلغ المحوّل','المبلغ اللي وصل','سعر الصرف','الرسوم']);
      trs.forEach(t=>rows.push([dkToDMY(dayKey(t.ts)),timeStr(t.ts),(ACC(t.from)||{}).name||'',(ACC(t.to)||{}).name||'',t.out,t.in,t.rate||'',t.fee||''])); rows.push([]);
      rows.push(['الأقساط']); hdr.push(rows.length-1); rows.push(['الحاجة','الجهة','رقم القسط','الميعاد','القيمة','اللي اتدفع','الباقي']);
      S.insts.forEach(p=>p.items.forEach((i,ix)=>{ if(inP(dkToTs(i.due))) rows.push([p.name,p.party||'',ix+1,dkToDMY(i.due),i.amount,itemPaid(i),itemRem(i)]) }));
      sheets.push({name:'الحسابات والدخل',rows,widths:[22,16,14,14,14,14,12,10],bold:hdr});
    }
    per.forEach(x=>{
      const rows=[['التاريخ','الوقت','الفئة',amtH,'طريقة الدفع','ملاحظة']];
      x.l.slice().sort((a,b)=>a.ts-b.ts).forEach(e=>rows.push([dkToDMY(dayKey(e.ts)),timeStr(e.ts),(CAT[e.cat]||CAT.other).name,e.amount,PAY[payOf(e)].name,e.note||'']));
      rows.push([],['الإجمالي','','',r2(sum(x.l))]);
      sheets.push({name:repSheetName(x.P),rows,widths:[12,10,14,12,14,30],bold:[0,rows.length-1]});
    });
    await saveFile(all?`${fileTag()} - ${repAllWord()}.xlsx`:`${fileTag()} - ${repName(repP(curMonth))}.xlsx`, XL.book(sheets));
  }catch(e){console.error(e);toast('معرفناش نعمل ملف Excel')}
}
function pdfMoneyHtml(months){
  if(!(S.accounts.length||S.inflows.length||S.transfers.length||S.insts.length)) return '';
  const per=months.map(k=>repP(k)), inP=t=>per.some(P=>t>=P.start&&t<P.next), A=a=>(a&&esc(a.name))||'';
  let h='<h2>الحسابات والدخل والتحويلات والأقساط</h2>';
  if(S.accounts.length) h+=`<table><tr><th>الحساب</th><th>النوع</th><th>العملة</th><th>الرصيد دلوقتي</th></tr>${S.accounts.map(a=>`<tr><td>${esc(accDisp(a))}</td><td>${esc(ACC_TYPES[a.type].n)}</td><td>${esc(a.cur)}</td><td>${fmt(accBal(a.id))}</td></tr>`).join('')}</table>`;
  const inf=S.inflows.filter(x=>inP(x.ts)).sort((a,b)=>a.ts-b.ts);
  if(inf.length) h+=`<table style="margin-top:14px"><tr><th>التاريخ</th><th>الدخل المستلم</th><th>الحساب</th><th>المبلغ (${CS()})</th></tr>${inf.map(x=>`<tr><td>${dkToDMY(dayKey(x.ts))}</td><td>${esc(x.src||'دخل')}</td><td>${A(ACC(x.acc))}</td><td>${fmt(x.amount)}</td></tr>`).join('')}<tr><td colspan="3"><b>الإجمالي</b></td><td><b>${fmt(r2(inf.reduce((a,x)=>a+x.amount,0)))}</b></td></tr></table>`;
  const trs=S.transfers.filter(t=>inP(t.ts)).sort((a,b)=>a.ts-b.ts);
  if(trs.length) h+=`<table style="margin-top:14px"><tr><th>التاريخ</th><th>تحويل بين حساباتك (مش مصروف ولا دخل)</th><th>المبلغ</th><th>رسوم</th></tr>${trs.map(t=>`<tr><td>${dkToDMY(dayKey(t.ts))}</td><td>${A(ACC(t.from))} ← ${A(ACC(t.to))}</td><td>${fmt(t.out)}</td><td>${t.fee?fmt(t.fee):''}</td></tr>`).join('')}</table>`;
  const rows=[]; S.insts.forEach(p=>p.items.forEach((i,ix)=>{ if(inP(dkToTs(i.due))) rows.push(`<tr><td>${esc(p.name)}</td><td>${ix+1}</td><td>${dkToDMY(i.due)}</td><td>${fmt(i.amount)}</td><td>${fmt(itemPaid(i))}</td></tr>`) }));
  if(rows.length) h+=`<table style="margin-top:14px"><tr><th>قسط</th><th>رقم</th><th>الميعاد</th><th>القيمة</th><th>اتدفع</th></tr>${rows.join('')}</table>`;
  return h;
}
async function exportPdf(all){
  if(!window.html2canvas||!window.jspdf){toast('بيتجهز ملف PDF...'); try{await needLib()}catch(e){toast('مقدرتش أحمّل مكتبة PDF، جرب تاني');return}}
  const months= all? monthsWithData(): [repP(curMonth).key];
  if(!months.length||(!all&&!reportHasData(repP(curMonth)))){toast('مفيش مصاريف تتحفظ');return}
  toast('بيتجهز ملف PDF...');
  const box=$('#pdfReport');
  box.innerHTML=`<h1>مليم</h1><div style="color:#53706F">تقرير ${all?repAllWord():repName(repP(curMonth))} · اتعمل ${shortDate(Date.now())}</div>`+(repPd()>1?`<div style="color:#53706F;font-size:12px">الفترة بتبدأ يوم ${repPd()} من كل شهر (يوم القبض)</div>`:'')+
   months.map(mk=>{const P=repP(mk), l=ofPeriod(P), c=byCat(l), t=sum(l);
     return `<h2>${repName(P)} · الإجمالي ${fmt(t)} ${CS()}</h2>
     <table><tr><th>الفئة</th><th>المبلغ (${CS()})</th><th>النسبة</th></tr>${Object.keys(c).sort((a,b)=>c[b]-c[a]).map(k=>`<tr><td>${esc((CAT[k]||CAT.other).name)}</td><td>${fmt(c[k])}</td><td>${Math.round(c[k]/t*100)}%</td></tr>`).join('')}</table>
     <table style="margin-top:14px"><tr><th>التاريخ</th><th>الفئة</th><th>ملاحظة</th><th>الدفع</th><th>المبلغ (${CS()})</th></tr>${l.slice().sort((a,b)=>a.ts-b.ts).map(x=>`<tr><td>${dkToDMY(dayKey(x.ts))}</td><td>${esc((CAT[x.cat]||CAT.other).name)}</td><td data-notr dir="auto">${esc(x.note||'')}</td><td>${esc(PAY[payOf(x)].name)}</td><td>${fmt(x.amount)}</td></tr>`).join('')}</table>`}).join('')+pdfMoneyHtml(months);
  await pdfRun(all?`${fileTag()} - ${repAllWord()}.pdf`:`${fileTag()} - ${repName(repP(curMonth))}.pdf`);
}
/* turns what is in #pdfReport into A4 pages (never cutting a row, table headers repeated) and saves the file */
async function pdfRun(fileName){
  const box=$('#pdfReport');
  try{
    await document.fonts.ready;
    const {jsPDF}=window.jspdf; const pdf=new jsPDF({unit:'pt',format:'a4'});
    const pw=pdf.internal.pageSize.getWidth(), ph=pdf.internal.pageSize.getHeight();
    // Split the report into A4 pages between rows (never through a row), repeat the table header on each page,
    // and draw one small page at a time: one huge canvas comes out blank on phones once there are a few hundred expenses
    const W=box.getBoundingClientRect().width, MARGIN=36, pageH=Math.floor(W*ph/pw)-MARGIN*2-50, top0=box.getBoundingClientRect().top;
    const units=[]; // {el, top, bottom, head, table}
    [...box.children].forEach(el=>{
      if(el.tagName==='TABLE') [...el.rows].forEach(tr=>{const r=tr.getBoundingClientRect(); units.push({el:tr,top:r.top-top0,bottom:r.bottom-top0,head:!!tr.querySelector('th'),table:el})});
      else {const r=el.getBoundingClientRect(); units.push({el,top:r.top-top0,bottom:r.bottom-top0,head:el.tagName==='H2'})}
    });
    const pages=[]; let cur=[], start=0;
    units.forEach((u,i)=>{
      if(cur.length&&u.bottom-start>pageH){
        let keep=[]; while(cur.length>1&&cur[cur.length-1].head){keep.unshift(cur.pop())} // titles go with their rows
        pages.push(cur); cur=keep; start=(keep[0]||u).top;
      }
      cur.push(u);
    });
    if(cur.length) pages.push(cur);
    const pageEls=pages.map(list=>{
      const pg=document.createElement('div'); let tbl=null, src=null;
      list.forEach(u=>{
        if(!u.table){pg.appendChild(u.el.cloneNode(true)); tbl=null; return}
        if(src!==u.table||!tbl){tbl=u.table.cloneNode(false); pg.appendChild(tbl); src=u.table;
          if(!u.head){const hd=[...u.table.rows].find(r=>r.querySelector('th')); if(hd) tbl.appendChild(hd.cloneNode(true))}}
        tbl.appendChild(u.el.cloneNode(true));
      });
      if(pg.firstElementChild) pg.firstElementChild.style.marginTop='0';
      return pg;
    });
    for(let i=0;i<pageEls.length;i++){
      box.innerHTML=''; box.appendChild(pageEls[i]); box.style.paddingTop=box.style.paddingBottom='0';
      const c=await html2canvas(box,{scale:1.7,backgroundColor:'#ffffff'});
      if(i) pdf.addPage();
      const k=pw/c.width; pdf.addImage(c.toDataURL('image/jpeg',.82),'JPEG',0,MARGIN*pw/W,pw,c.height*k);
      pdf.setFontSize(9); pdf.setTextColor(150); pdf.text(`${i+1} / ${pageEls.length}`,pw/2,ph-14,{align:'center'});
    }
    box.style.paddingTop=box.style.paddingBottom='';
    box.innerHTML='';
    await saveFile(fileName, pdf.output('blob'));
  }catch(e){box.innerHTML='';box.style.paddingTop=box.style.paddingBottom='';toast('معرفناش نعمل ملف PDF')}
}
/* yearly report: one PDF with every period of a year, the categories and the biggest expenses */
function yearReportHtml(Y){
  const keys=monthsWithData().filter(k=>k.slice(0,4)===String(Y)), per=keys.map(k=>repP(k)), cs=CS();
  const rows=per.map(P=>{const l=ofPeriod(P), inc=r2(S.inflows.filter(x=>x.ts>=P.start&&x.ts<P.next).reduce((a,x)=>a+x.amount,0)); return {P,l,t:sum(l),inc}});
  const all=rows.flatMap(r=>r.l), tExp=r2(sum(all)), tInc=r2(rows.reduce((a,r)=>a+r.inc,0)), c=byCat(all);
  const hi=rows.slice().sort((a,b)=>b.t-a.t)[0], lo=rows.slice().sort((a,b)=>a.t-b.t)[0], avg=rows.length?tExp/rows.length:0;
  let h=`<h1>مليم</h1><div style="color:#53706F">تقرير سنة ${Y} · اتعمل ${shortDate(Date.now())}</div>`;
  h+=`<h2>ملخص السنة · إجمالي المصاريف ${fmt(tExp)} ${cs}</h2>`;
  h+=`<table><tr><th>${repPd()===1?'الشهر':'الفترة'}</th><th>عدد المصاريف</th><th>المصروف (${cs})</th><th>الدخل المستلم (${cs})</th><th>الصافي (${cs})</th></tr>${rows.map(r=>`<tr><td>${esc(repName(r.P))}</td><td>${r.l.length}</td><td>${fmt(r.t)}</td><td>${fmt(r.inc)}</td><td>${fmt(r2(r.inc-r.t))}</td></tr>`).join('')}<tr><td><b>الإجمالي</b></td><td><b>${all.length}</b></td><td><b>${fmt(tExp)}</b></td><td><b>${fmt(tInc)}</b></td><td><b>${fmt(r2(tInc-tExp))}</b></td></tr></table>`;
  if(hi) h+=`<div style="margin-top:10px">متوسط الصرف ${fmt(r2(avg))} ${cs} ${repPd()===1?'في الشهر':'في الفترة'}. ${repPd()===1?'أكتر شهر صرفت فيه':'أكتر فترة صرفت فيها'}: ${esc(repName(hi.P))} (${fmt(hi.t)}).${rows.length>1?` وأقل ${repPd()===1?'شهر':'فترة'}: ${esc(repName(lo.P))} (${fmt(lo.t)}).`:''}</div>`;
  h+=`<h2>حسب الفئة</h2><table><tr><th>الفئة</th><th>المبلغ (${cs})</th><th>النسبة</th></tr>${Object.keys(c).sort((a,b)=>c[b]-c[a]).map(k=>`<tr><td>${esc((CAT[k]||CAT.other).name)}</td><td>${fmt(c[k])}</td><td>${tExp?Math.round(c[k]/tExp*100):0}%</td></tr>`).join('')}</table>`;
  const top=all.slice().sort((a,b)=>b.amount-a.amount).slice(0,10);
  if(top.length) h+=`<h2>أكبر ${top.length} مصاريف</h2><table><tr><th>التاريخ</th><th>الفئة</th><th>ملاحظة</th><th>المبلغ (${cs})</th></tr>${top.map(x=>`<tr><td>${dkToDMY(dayKey(x.ts))}</td><td>${esc((CAT[x.cat]||CAT.other).name)}</td><td data-notr dir="auto">${esc(x.note||'')}</td><td>${fmt(x.amount)}</td></tr>`).join('')}</table>`;
  return h;
}
async function exportYearPdf(Y){
  if(!window.html2canvas||!window.jspdf){toast('بيتجهز ملف PDF...'); try{await needLib()}catch(e){toast('مقدرتش أحمّل مكتبة PDF، جرب تاني');return}}
  if(!monthsWithData().some(k=>k.slice(0,4)===String(Y))){toast('مفيش مصاريف في سنة '+Y);return}
  toast('بيتجهز ملف PDF...'); $('#pdfReport').innerHTML=yearReportHtml(Y);
  await pdfRun(`${fileTag()} - تقرير ${Y}.pdf`);
}
function openYearReport(){
  const ys=[...new Set(monthsWithData().map(k=>k.slice(0,4)))].sort().reverse();
  if(!ys.length){toast('مفيش مصاريف تتحفظ');return}
  if(ys.length===1){exportYearPdf(ys[0]);return}
  openForm({title:'تقرير سنوي', save:'اعمل التقرير', fields:[{key:'year',type:'select',label:'السنة',options:ys.map(y=>({v:y,t:y})),value:ys[0]}],
    onSave:v=>{ const y=/^\d{4}$/.test(v.year)?v.year:ys[0]; setTimeout(()=>exportYearPdf(y),250) }});
}
let expFmt='xlsx';
$('#exportGrid').onclick=e=>{ if(e.target.closest('[data-year]')){ if(!window.html2canvas||!window.jspdf) needLib().catch(()=>{}); openYearReport(); return }
  const b=e.target.closest('[data-fmt]');if(!b||b.disabled)return;expFmt=b.dataset.fmt;
  $('#expTitle').textContent= expFmt==='xlsx'?'حفظ المصاريف Excel':'حفظ المصاريف PDF';
  if(expFmt!=='xlsx') needLib().catch(()=>{});
  const P=repP(curMonth), n=ofPeriod(P).length, ms=monthsWithData().length, mo=P.pd===1;
  $('#optMonth').textContent=`${repName(P)} · ${n} مصروف`;
  $('#optAll').textContent= ms? `${ms} ${mo?(ms===1?'شهر':ms<=10?'شهور':'شهر'):(ms===1?'فترة':ms<=10?'فترات':'فترة')} · ${S.expenses.length} مصروف` : 'مفيش مصاريف لسه';
  document.querySelector('#expSheet [data-scope="month"] b').textContent= mo?'الشهر ده بس':'الفترة دي بس';
  document.querySelector('#expSheet [data-scope="all"] b').textContent= repAllWord();
  $('#scrim').classList.add('open');$('#expSheet').classList.add('open')};
$('#expSheet').querySelector('.opts').onclick=e=>{const b=e.target.closest('[data-scope]');if(!b)return;closeSheets();
  setTimeout(()=>(expFmt==='xlsx'?exportXlsx:exportPdf)(b.dataset.scope==='all'),250)};
$('#expCancel').onclick=closeSheets;

/* Cloud backup */
let db=null, myId=null;
async function backupDoc(){return db.collection('data/users/'+myId).doc(ME.id==='m1'?'backup':'backup-'+ME.id)}
const backupData=()=>({expenses:S.expenses,budget:S.budget,budgetMode:S.budgetMode,payday:S.payday,cats:S.cats,debts:S.debts,gams:S.gams,profile:S.profile,since:S.since,incomes:S.incomes,goals:S.goals,saveTarget:S.saveTarget,currency:S.currency,fixed:S.fixed,fixedLog:S.fixedLog,plans:S.plans,closedP:S.closedP,pays:S.pays,lastPay:S.lastPay,accounts:S.accounts,transfers:S.transfers,bMoves:S.bMoves,insts:S.insts,instPays:S.instPays,inflows:S.inflows,gold:S.gold,goldPx:S.goldPx,manRates:S.manRates,payType:S.payType,payAnchor:S.payAnchor,prefs:{lang:S.lang||LANG,moneyView:S.moneyView,theme:S.theme,accent:S.accent,style:S.style,look:S.look,font:S.font,fontW:S.fontW,curs:S.curs,press:S.press,trans:S.trans,haptic:S.haptic,alert80:S.alert80,alertPct:S.alertPct,remind:S.remind,remindAt:S.remindAt,dueRemind:S.dueRemind,autoBkDays:S.autoBkDays,sumOn:S.sumOn,homeHide:S.homeHide,ipFee:S.ipFee}});
let restoreReloadT;
function applyBackup(p,at,onUndo){
  clearTimeout(restoreReloadT);
  const beforeRestore=JSON.parse(JSON.stringify(S));
  if(S.space) spDetach();
  curMerge(p.prefs&&typeof p.prefs==='object'?p.prefs.curs:[]); // custom currencies first: accounts and the currency check below use them
  /* every record goes through the same cleaners used for stored data: a crafted file can't inject HTML or break the screens */
  {const seen=new Set(); S.expenses=(Array.isArray(p.expenses)?p.expenses:[]).map(x=>cleanExpense(x,false)).filter(Boolean)
    .map(e=>{if(seen.has(e.id)) e.id=uid(); seen.add(e.id); return e})}
  {const old=trashAll(); S.trash=[]; old.forEach(trashLetGo)} // the trash belongs to the data it was made from
  if(p.budget!==undefined) S.budget=numIn(p.budget,0,MAXAMT,0);
  {const cs=Array.isArray(p.cats)?p.cats.map(cleanCat).filter(Boolean):[]; if(cs.length) S.cats=cs}
  S.budgetMode= ['fixed','open'].includes(p.budgetMode)? p.budgetMode : (S.budget>0?'fixed':S.budgetMode);
  if(p.payday!==undefined) S.payday=intIn(p.payday,1,31,1);
  Object.keys(CLEAN).forEach(k=>{if(Array.isArray(p[k])) S[k]=p[k].map(x=>k==='debts'?cleanDebt(x,p.currency):CLEAN[k](x)).filter(Boolean)});
  /* a restore brings back the accounts of that moment (an older file has none), so balances always match the restored expenses */
  {const ids=new Set(); S.accounts=(Array.isArray(p.accounts)?p.accounts:[]).map(cleanAcc).filter(a=>a&&!ids.has(a.id)&&ids.add(a.id)); S.transfers=(Array.isArray(p.transfers)?p.transfers:[]).map(cleanTr).filter(Boolean); S.bMoves=(Array.isArray(p.bMoves)?p.bMoves:[]).map(cleanBMove).filter(Boolean); if(!ACC(S.lastAcc)) S.lastAcc=''}
  S.insts=(Array.isArray(p.insts)?p.insts:[]).map(cleanInst).filter(Boolean); S.instPays=(Array.isArray(p.instPays)?p.instPays:[]).map(cleanInstPay).filter(Boolean);
  S.inflows=(Array.isArray(p.inflows)?p.inflows:[]).map(cleanInflow).filter(Boolean);
  S.plans=(Array.isArray(p.plans)?p.plans:[]).map(cleanPlan).filter(Boolean);
  S.gold=(Array.isArray(p.gold)?p.gold:[]).map(cleanGold).filter(Boolean); S.goldPx=cleanGoldPx(p.goldPx); S.manRates=cleanManRates(p.manRates);
  S.closedP=cleanClosed(p.closedP);
  S.payType=['monthly','weekly','biweekly','variable'].includes(p.payType)?p.payType:'monthly'; S.payAnchor=typeof p.payAnchor==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(p.payAnchor)?p.payAnchor:'';
  if(p.profile&&typeof p.profile==='object') S.profile=cleanProfile(p.profile);
  if(MB.list.length>1&&ME.name) S.profile.name=ME.name; // a backup restored into a member keeps that member's name
  if(p.fixedLog&&typeof p.fixedLog==='object') S.fixedLog=cleanFixedLog(p.fixedLog);
  {const ps=Array.isArray(p.pays)?p.pays.map(cleanPay).filter(Boolean):[]; if(ps.length){S.pays=ps; if(!S.pays.some(x=>x.id==='cash')) S.pays.unshift({...PAYS[0]})}}
  if(isId(p.lastPay)) S.lastPay=p.lastPay;
  syncPays();
  if(p.prefs&&typeof p.prefs==='object'){const f=p.prefs;
    if(['eg','ar','en'].includes(f.lang)) S.lang=f.lang;
    if(['light','dark','system'].includes(f.theme)) S.theme=f.theme; if(ACCENTS.some(a=>a.id===f.accent)) S.accent=f.accent; if(typeof f.style==='string'&&STYLES[f.style]) S.style=f.style; if(LOOKS.some(x=>x.id===f.look)) S.look=f.look; if(FONTS.some(x=>x.id===f.font)) S.font=f.font; if(f.fontW==='bold'||f.fontW==='normal') S.fontW=f.fontW; if(PRESSES.some(x=>x.id===f.press)) S.press=f.press; if(TRANSES.some(x=>x.id===f.trans)) S.trans=f.trans; if(typeof f.haptic==='boolean') S.haptic=f.haptic;
    if(['off','sum','split'].includes(f.moneyView)) S.moneyView=f.moneyView;
    S.homeHide=f.homeHide&&typeof f.homeHide==='object'?Object.fromEntries(['upcoming','caps','summary','close','today'].filter(k=>f.homeHide[k]===true).map(k=>[k,true])):{};
    ['alert80','remind','dueRemind','sumOn'].forEach(k=>{if(typeof f[k]==='boolean') S[k]=f[k]});
    if(Number.isInteger(f.remindAt)&&f.remindAt>=0&&f.remindAt<1440) S.remindAt=f.remindAt;
    if(Number.isInteger(f.autoBkDays)&&f.autoBkDays>=0&&f.autoBkDays<=30) S.autoBkDays=f.autoBkDays;
    if(Number.isInteger(f.alertPct)&&f.alertPct>=10&&f.alertPct<=99) S.alertPct=f.alertPct;
    if(f.ipFee&&typeof f.ipFee==='object') S.ipFee=cleanIpFee(f.ipFee)}
  if(p.saveTarget!==undefined) S.saveTarget=numIn(p.saveTarget,0,MAXAMT,0);
  if(CURRENCIES.some(c=>c.id===p.currency)) S.currency=p.currency;
  if(+p.since>0&&+p.since<MAXTS) S.since=+p.since;
  if(at&&isFinite(+at)) S.lastBackup=Math.max(S.lastBackup||0,+at); // the file you restored from is itself a backup
  S.onboarded=true; hideWelcome();
  save();syncCats();renderAll();
  const langChanged=(S.lang||LANG)!==LANG;
  if(langChanged) restoreReloadT=setTimeout(()=>location.reload(),8500);
  toast('اترجعت '+S.expenses.length+' مصروف من نسخة '+shortDate(at)+(langChanged?' · اللغة هتتطبق بعد مهلة التراجع':''),'تراجع',()=>{
    clearTimeout(restoreReloadT); if(S.space) spStop(); S=beforeRestore;
    if(onUndo) Promise.resolve(onUndo()).catch(()=>toast('تعذر إرجاع بعض صور الإيصالات'));
    syncPays();syncCats();save();renderAll(); if(S.space) spListen();
  },8000);
}
/* a backup file's text -> {o, p} (file object and its data), or null when it isn't a Maleem backup */
function bkParse(txt){try{const o=JSON.parse(txt), p=o&&(o.data||o); return p&&Array.isArray(p.expenses)?{o,p}:null}catch(e){return null}}
async function bkRestore(b,at){
  let previous=null, importDone=Promise.resolve();
  if(b.o.receipts){try{previous=new Map();const ids=await rcTx('readonly',st=>st.getAllKeys());
    for(const id of ids) previous.set(id,await rcGet(id));
  }catch(e){toast('تعذر قراءة الإيصالات الحالية؛ لم تبدأ الاستعادة');return}}
  applyBackup(b.p,at,previous?async()=>{
    await importDone;
    const ids=await rcTx('readonly',st=>st.getAllKeys());
    for(const id of ids) if(!previous.has(id)) await rcDel(id);
    for(const [id,blob] of previous) if(blob) await rcPut(id,blob);
    renderAll();
  }:null);
  if(b.o.receipts) importDone=rcImport(b.o.receipts);
  await importDone;
}
$('#restoreFile').onchange=async e=>{
  const f=e.target.files&&e.target.files[0]; e.target.value=''; if(!f) return;
  let b=null; try{b=bkParse(await f.text())}catch(err){}
  if(!b){toast('الملف ده مش نسخة احتياطية من مليم');return}
  bkRestore(b,b.o.at||f.lastModified||Date.now());
};
/* ===== Import expenses from a PDF / Excel / CSV / text file =====
   Everything runs on the phone: the file is read here, nothing is uploaded.
   Excel is read with a small built-in reader (unzip by fflate), PDF text with pdf.js; both load only when needed.
   The rows are guessed into categories (known category name, the same note saved before, keywords),
   anything not understood goes to «أخرى», and the user reviews the list before anything is saved. */
const IMP_MAX_BYTES=15e6, IMP_MAX_ROWS=1000, IMP_MAX_PAGES=60;
const impErr=msg=>Object.assign(new Error(msg),{user:msg});
const AR_NORM=s=>String(s==null?'':s).toLowerCase().normalize('NFKC')
  .replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي')
  .replace(/ؤ/g,'و').replace(/ئ/g,'ي').replace(/\s+/g,' ').trim();
/* digits and separators: Arabic-Indic → Latin, Arabic decimal / thousands marks, direction marks out */
const impDigits=s=>String(s==null?'':s).normalize('NFKC')
  .replace(/[٠-٩]/g,c=>'٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/[۰-۹]/g,c=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(c))
  .replace(/٫/g,'.').replace(/٬/g,',').replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069\u00a0]/g,' ');
/* total / balance lines are not expenses (no \b here: it does not work after Arabic letters) */
const IMP_TOTAL=/^(?:ال)?(?:اجمالي|إجمالي|إجمالى|اجمالى|مجموع|صافي|الصافي|net|total|sub ?total|grand total|sum)(?=$|[\s:.\-،,()])|^(?:ال)?رصيد\s*(?:ال)?(?:متاح|حالي|سابق|افتتاحي|ختامي|نهائي|بعد|قبل)|^(?:opening |closing |available |current )?balance\b|(?:^|\s)(?:الإجمالي|الاجمالي|المجموع|total|subtotal)(?=$|[\s:])/iu;
const IMP_CUR='(?:ج\\.?\\s?م\\.?|جنيه(?:ا|ات)?|جنية|جم|ج|egp|le|l\\.e\\.?|ريال|درهم|دولار|usd|sar|aed|\\$)';
const IMP_AMT_RE=new RegExp(`((?<![\\p{L}])${IMP_CUR}\\s*)?(\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.(\\d{1,2}))?(?!\\d)(\\s*${IMP_CUR}(?![\\p{L}]))?`,'giu');
const IMP_DATE_RE=/(?<!\d)(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})(?!\d)|(?<!\d)(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})(?!\d)/;
const IMP_TIME_RE=/(?<!\d)(\d{1,2}):(\d{2})(?::\d{2})?\s*(ص|م|am|pm|a\.m\.|p\.m\.)?/i;

/* "28/10/2026", "2026-10-28", "28-10-26" → "2026-10-28" (day first, as written in Egypt) */
function impDate(v){
  if(v==null||v==='') return null;
  if(typeof v==='object'&&v.d!=null) return dayKey(v.d);
  const m=IMP_DATE_RE.exec(impDigits(v)); if(!m) return null;
  let y,mo,d;
  if(m[1]){y=+m[1];mo=+m[2];d=+m[3]} else {d=+m[4];mo=+m[5];y=+m[6]; if(y<100) y+=2000; if(mo>12&&d<=12){const t=d;d=mo;mo=t}}
  if(y<2000||y>2100||mo<1||mo>12||d<1||d>new Date(y,mo,0).getDate()) return null;
  return `${y}-${pad(mo)}-${pad(d)}`;
}
function impTime(v){
  if(v==null||v==='') return null;
  if(typeof v==='number'&&v>=0&&v<1){const mins=Math.round(v*1440);return mins} // Excel time fraction
  if(typeof v==='object'&&v.d!=null){const t=new Date(v.d);return t.getHours()*60+t.getMinutes()}
  const m=IMP_TIME_RE.exec(impDigits(v)); if(!m) return null;
  let h=+m[1]; const mi=+m[2], ap=(m[3]||'').toLowerCase(); if(h>23||mi>59) return null;
  if(/^(م|pm|p\.m\.)$/.test(ap)&&h<12) h+=12; if(/^(ص|am|a\.m\.)$/.test(ap)&&h===12) h=0;
  return h*60+mi;
}
