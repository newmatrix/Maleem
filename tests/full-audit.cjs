/* npm install --no-save playwright; BROWSER_PATH may point to Chrome/Edge.
   All requests are fulfilled from the local source tree; no production services are contacted. */
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('node:assert/strict');
let playwright;try{playwright=require('playwright')}catch(e){playwright=require(process.env.PLAYWRIGHT_MODULE)}
const root=path.join(__dirname,'../app/src/main/assets/www');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/\r\n?/g,'\n');
for(const x of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new(require('vm').Script)(x[1]);
const i=html.lastIndexOf('})();');
html=html.slice(0,i)+`window.testApp={get S(){return S},get RT(){return RT},get RC(){return RC},syncNative,parseVoiceIn,parseVoice,impCsv,cleanPlan,deleteDebt,deleteGam,deleteInst,openGoal,openFixed,openPlan,openIncome,openAccSheet,openTrSheet,openGold,openGamSheet,openInstSheet,openDebtSheet,deleteGoal,deleteFixed,deletePlan,deleteIncome,cleanMoney,isDK,isMK,evalExpr,meGo,setGo,save,backupData,applyBackup,bkRestore,rcGet,rcPut,rcTx,monthsWithData,yearReportHtml,capView,capPlan,capConfirm,capAmount,capPull,capCurrency,openCapAsk,capMatch,cleanDebt,debtRem,accBal,openPaySheet,langPaint,go,openSheet,closeSheets,renderAll,spBuildLocalRows,spApplyShared,trText,dailyAllowance,periodOf,renderHome,exportXlsx,setSearch,bindDownloads:d=>downloads=d};\n`+html.slice(i);
const hashes=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>`'sha256-${crypto.createHash('sha256').update(x[1]).digest('base64')}'`).join(' ');
const csp=`default-src 'self'; script-src 'self' ${hashes}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://*.googleapis.com; frame-src 'self' blob: data:; object-src 'none'; base-uri 'none'; form-action 'none'`;
const results=[];
(async()=>{const browser=await playwright.chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{})});
async function run(name,fn,lang='eg',width=360){const page=await browser.newPage({viewport:{width,height:800},locale:'ar-EG',timezoneId:'Africa/Cairo'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.pathname==='/')return r.fulfill({contentType:'text/html',headers:{'Content-Security-Policy':csp},body:html});try{return r.fulfill({body:fs.readFileSync(path.join(root,u.pathname)),contentType:u.pathname.endsWith('.js')?'application/javascript':u.pathname.endsWith('.css')?'text/css':'application/octet-stream'});}catch{return r.abort();}});
await page.addInitScript(lang=>{window.__queue=[];window.AndroidBridge={takeCaptures:()=>JSON.stringify(window.__queue.splice(0)),captureState:()=>'{"on":false}',updateState:()=>'{"enabled":false}',ratesState:()=>'{}',syncWidget:()=>{},syncReminders:()=>{},captureIncoming:()=>{},setBars:()=>{},setSecure:()=>{},haptic:()=>{}};
if(!localStorage.getItem('maleem.v1'))localStorage.setItem('maleem.v1',JSON.stringify({onboarded:true,lang,profile:{name:'هشام'},currency:'EGP',budget:12000,budgetMode:'fixed',expenses:[]}));sessionStorage.setItem('maleem.splashed','1')},lang);
try{await page.goto('http://maleem.test/');await page.waitForFunction(()=>!!window.testApp);await fn(page);assert.deepEqual(errors,[]);results.push({name,pass:true});console.log('PASS',name)}catch(e){results.push({name,pass:false,error:e.stack});console.error('FAIL',name,e.message)}finally{await page.close()}}
try{

const value=async(p,id,v)=>p.locator(id).fill(String(v));
const form=async(p,v)=>{for(const [k,x]of Object.entries(v))await value(p,`#formBody [data-k="${k}"]`,x);await p.locator('#formSave').click()};
for(const [label,open,del,list,fields]of [
 ['goal','openGoal','deleteGoal','goals',{name:'Audit goal',target:5000,saved:100}],
 ['recurring expense','openFixed','deleteFixed','fixed',{name:'Audit rent',amount:500}],
 ['planned expense','openPlan','deletePlan','plans',{name:'Audit plan',amount:200}],
 ['recurring income','openIncome','deleteIncome','incomes',{name:'Audit salary',amount:1000}]
])await run(label+' create/edit/delete/undo/reload',async p=>{
 await p.evaluate(open=>testApp[open](),open);await form(p,fields);
 let rows=await p.evaluate(list=>testApp.S[list],list);assert.equal(rows.length,1);const id=rows[0].id;
 await p.evaluate(({open,id})=>testApp[open](id),{open,id});await form(p,{name:'Changed'});
 assert.equal(await p.evaluate(list=>testApp.S[list][0].name,list),'Changed');
 await p.evaluate(({del,id})=>testApp[del](id),{del,id});assert.equal(await p.evaluate(list=>testApp.S[list].length,list),0);
 await p.locator('#toastAct').click();assert.equal(await p.evaluate(list=>testApp.S[list].length,list),1);
 await p.reload();assert.equal(await p.evaluate(list=>testApp.S[list][0].name,list),'Changed');
});
await run('Account create/edit/delete/undo/reload',async p=>{
 await p.evaluate(()=>testApp.openAccSheet());await value(p,'#accName','Audit bank');await value(p,'#accBal','1500');await p.locator('#accSave').click();
 const id=await p.evaluate(()=>testApp.S.accounts[0].id);assert.equal(await p.evaluate(id=>testApp.accBal(id),id),1500);
 await p.evaluate(id=>testApp.openAccSheet(id),id);await value(p,'#accName','Edited bank');await p.locator('#accSave').click();
 await p.evaluate(id=>testApp.openAccSheet(id),id);await p.locator('#accDel').click();assert.equal(await p.evaluate(()=>testApp.S.accounts.length),0);
 await p.locator('#toastAct').click();await p.reload();assert.equal(await p.evaluate(()=>testApp.S.accounts[0].name),'Edited bank');
});
await run('Account balance ledger: expenses, income and transfer fees',async p=>{
 const r=await p.evaluate(()=>{const a=testApp,s=a.S;s.accounts=[{id:'a',name:'A',type:'bank',cur:'EGP',open:1000},{id:'b',name:'B',type:'cash',cur:'EGP',open:0}];s.expenses=[{id:'e',amount:100,acc:'a',accAmt:100,ts:Date.now(),cat:'other'}];s.inflows=[{id:'i',amount:50,acc:'a',accAmt:50,ts:Date.now()}];s.transfers=[{id:'t',from:'a',to:'b',out:200,in:200,fee:5,ts:Date.now()}];return [a.accBal('a'),a.accBal('b')]});assert.deepEqual(r,[745,200]);
});
await run('Expense arithmetic calculator and invalid expression rejection',async p=>{const r=await p.evaluate(()=>['2+3×4','5×4','1÷0','abc','012'].map(testApp.evalExpr));assert.equal(r[0],14);assert.equal(r[1],20);assert(!Number.isFinite(r[2]));assert(!Number.isFinite(r[3]));});
await run('Invalid calendar dates rejected by data validators',async p=>{const r=await p.evaluate(()=>[testApp.isDK('2026-02-31'),testApp.isDK('2026-13-01'),testApp.isMK('2026-99')]);assert.deepEqual(r,[false,false,false]);});
await run('Negative pasted money is not silently made positive',async p=>{await p.evaluate(()=>testApp.openGoal());await value(p,'#formBody [data-k="target"]','-100');const v=await p.locator('#formBody [data-k="target"]').inputValue();assert.notEqual(v,'100');});
await run('All Me and Settings subpages open without runtime errors',async p=>{
 const pages=await p.evaluate(()=>({me:[...document.querySelectorAll('[data-mepage]')].map(e=>e.dataset.mepage),settings:[...document.querySelectorAll('#v-settings>.set-page')].map(e=>e.dataset.page)}));
 for(const id of pages.me)await p.evaluate(id=>{testApp.go('me');testApp.meGo(id)},id);
 for(const id of pages.settings)await p.evaluate(id=>{testApp.go('settings');testApp.setGo(id)},id);
 assert(pages.me.length>5);assert(pages.settings.length>5);
});
await run('Theme and appearance changes persist after restart',async p=>{await p.evaluate(()=>{const s=testApp.S;Object.assign(s,{theme:'dark',font:'cairo',fontW:'bold',haptic:false});testApp.save();testApp.renderAll()});await p.reload();const r=await p.evaluate(()=>[testApp.S.theme,testApp.S.font,testApp.S.fontW,testApp.S.haptic]);assert.deepEqual(r,['dark','cairo','bold',false]);});
await run('Backup serialize and restore preserves personal data collections',async p=>{const r=await p.evaluate(()=>{const a=testApp,b=a.backupData();return ['expenses','accounts','transfers','debts','gams','goals','gold','insts','inflows','fixed','plans','prefs'].filter(k=>!(k in b))});assert.deepEqual(r,[])});
await run('Arabic personal notes remain unmodified after English rendering',async p=>{const r=await p.evaluate(()=>{testApp.S.expenses=[{id:'user',amount:30,cat:'other',note:'حفظ الميزانية',ts:Date.now()}];testApp.renderAll();return document.querySelector('.xnote').textContent});assert.equal(r,'حفظ الميزانية')},'en');
await run('Local catalogs loaded for all languages',async p=>{const r=await p.evaluate(()=>['eg','ar','en'].map(k=>({keys:Object.keys(I18N[k].x).length,ui:!!I18N[k].ui,days:typeof I18N[k].days})));assert(r.every(x=>x.keys>100&&x.ui&&x.days==='function'))});

await run('CSV quoted delimiters, embedded newlines and numeric values',async p=>{const r=await p.evaluate(()=>testApp.impCsv('note,amount\n"food, cafe",25\n"line1\nline2",30'));assert.deepEqual(r,[['note','amount'],['food, cafe',25],['line1\nline2',30]])});
await run('Arabic voice text parser extracts numeric amount',async p=>{const r=await p.evaluate(()=>testApp.parseVoice('دفعت ٥٠ جنيه أكل'));assert.equal(r.amount,50)});
await run('English voice text parser understands number words',async p=>{const r=await p.evaluate(()=>testApp.parseVoice('spent fifty pounds on food'));assert.equal(r.amount,50)},'en');
await run('Imported planned expenses reject nonexistent dates',async p=>{const r=await p.evaluate(()=>testApp.cleanPlan({id:'bad',name:'Bad date',amount:50,due:'2026-02-31'}));assert.equal(r,null)});
await run('Loan creation, deletion and undo through controls',async p=>{await p.evaluate(()=>testApp.openDebtSheet());await value(p,'#debtPerson','Audit borrower');await value(p,'#debtAmt','100');await p.locator('#debtSave').click();const d=await p.evaluate(()=>testApp.S.debts[0]);assert(d);await p.evaluate(id=>testApp.deleteDebt(id),d.id);assert.equal(await p.evaluate(()=>testApp.S.debts.length),0);await p.locator('#toastAct').click();assert.equal(await p.evaluate(()=>testApp.S.debts.length),1)});
await run('Savings circle create, delete and undo',async p=>{await p.evaluate(()=>testApp.openGamSheet());await value(p,'#gamName','Audit circle');await value(p,'#gamAmt','100');await p.locator('#gamSave').click();const g=await p.evaluate(()=>testApp.S.gams[0]);assert(g);await p.evaluate(id=>testApp.deleteGam(id),g.id);await p.locator('#toastAct').click();assert.equal(await p.evaluate(()=>testApp.S.gams.length),1)});
await run('Installment schedule totals and restart',async p=>{await p.evaluate(()=>testApp.openInstSheet());await value(p,'#instName','Audit purchase');await value(p,'#instTotal','1200');await p.locator('#instMonths').selectOption('12');await value(p,'#instMonthly','100');await p.locator('#instSave').click();const r=await p.evaluate(()=>testApp.S.insts[0]);assert(r);assert.equal(r.items.length,12);assert.equal(r.items.reduce((a,i)=>a+i.amount,0),1200);await p.reload();assert.equal(await p.evaluate(()=>testApp.S.insts[0].items.length),12)});
await run('Gold purchase, sale and persistent records',async p=>{await p.evaluate(()=>testApp.openGold());await value(p,'#gdQty','2');await value(p,'#gdPrice','8000');await p.locator('#gdSave').click();const g=await p.evaluate(()=>testApp.S.gold[0]);assert(g);assert.equal(g.qty,2);await p.evaluate(id=>testApp.openGold(id),g.id);await p.locator('#gdSold').evaluate(el=>el.open=true);await value(p,'#gdSPrice','9000');await p.locator('#gdSave').click();await p.reload();assert.equal(await p.evaluate(()=>testApp.S.gold[0].sold.price),9000)});

await run('Leap years, month boundaries and invalid dates',async p=>{const r=await p.evaluate(()=>['2024-02-29','2026-02-28','2000-02-29','1900-02-29','2026-04-31','0000-01-01','2026-00-01'].map(testApp.isDK));assert.deepEqual(r,[true,true,true,false,false,false,false])});
await run('English voice compound amounts, decimals, category and income',async p=>{const r=await p.evaluate(()=>({numbers:['fifty pounds for food','one hundred and twenty five pounds on groceries','two thousand three hundred pounds','twelve point five pounds for taxi'].map(x=>testApp.parseVoice(x).amount),category:testApp.parseVoice('spent fifty pounds on food').cat,income:testApp.parseVoiceIn('received salary of two thousand pounds')}));assert.deepEqual(r.numbers,[50,125,2300,12.5]);assert.equal(r.category,'food');assert.equal(r.income.amount,2000);assert.equal(r.income.src,'Salary')},'en');
for(const lang of ['eg','ar','en'])await run('Native language payload '+lang,async p=>{const r=await p.evaluate(()=>{let w,r;AndroidBridge.syncWidget=x=>w=JSON.parse(x);AndroidBridge.syncReminders=x=>r=JSON.parse(x);testApp.syncNative();return {w,r}});assert.equal(r.w.language,lang);assert.equal(r.r.language,lang);assert(r.w.labels.today);assert(r.r.labels.dailyTitle);if(lang==='en'){assert.equal(r.w.labels.today,'Today');assert(!/[\u0600-\u06ff]/.test(r.r.labels.dailyTitle))}},lang);
}finally{await browser.close();fs.writeFileSync(path.join(__dirname,'full-audit-results.json'),JSON.stringify(results,null,2));}
if(results.some(r=>!r.pass))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});

