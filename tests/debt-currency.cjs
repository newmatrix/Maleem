/* npm install --no-save playwright; BROWSER_PATH may point to Chrome/Edge.
   All requests are fulfilled from the local source tree; no production services are contacted. */
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('node:assert/strict');
let playwright;try{playwright=require('playwright')}catch(e){playwright=require(process.env.PLAYWRIGHT_MODULE)}
const root=path.join(__dirname,'../app/src/main/assets/www');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/\r\n?/g,'\n');
for(const x of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new(require('vm').Script)(x[1]);
const i=html.lastIndexOf('})();');
html=html.slice(0,i)+`window.testApp={openDebtSheet,openDebtAdd,openDebtLog,debtCur,debtSym,convertDebt,debtToAcc,curScaleAll,dueItems,capDebtCands,get S(){return S},fixedOccurrences,cleanFixedLog,syncNative,fixedScheduled,fixedOcc,fixedDueItems,fixedPendingIn,cleanFixed,openFixed,openRestore,rsGroups,save,get RT(){return RT},get RC(){return RC},backupData,applyBackup,bkRestore,rcGet,rcPut,rcTx,monthsWithData,yearReportHtml,capView,capPlan,capConfirm,capAmount,capPull,capCurrency,openCapAsk,capMatch,cleanDebt,debtRem,accBal,openPaySheet,langPaint,go,openSheet,closeSheets,renderAll,spBuildLocalRows,spApplyShared,trText,dailyAllowance,periodOf,renderHome,exportXlsx,setSearch,bindDownloads:d=>downloads=d};\n`+html.slice(i);
const hashes=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>`'sha256-${crypto.createHash('sha256').update(x[1]).digest('base64')}'`).join(' ');
const csp=`default-src 'self'; script-src 'self' ${hashes}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://*.googleapis.com; frame-src 'self' blob: data:; object-src 'none'; base-uri 'none'; form-action 'none'`;
const results=[];
(async()=>{const browser=await playwright.chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{})});
async function run(name,fn,lang='eg',width=360){const page=await browser.newPage({viewport:{width,height:800},locale:'ar-EG',timezoneId:'Africa/Cairo'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.pathname==='/')return r.fulfill({contentType:'text/html',headers:{'Content-Security-Policy':csp},body:html});try{return r.fulfill({body:fs.readFileSync(path.join(root,u.pathname)),contentType:u.pathname.endsWith('.js')?'application/javascript':u.pathname.endsWith('.css')?'text/css':'application/octet-stream'});}catch{return r.abort();}});
await page.addInitScript(lang=>{window.__queue=[];window.AndroidBridge={takeCaptures:()=>JSON.stringify(window.__queue.splice(0)),captureState:()=>'{"on":false}',updateState:()=>'{"enabled":false}',ratesState:()=>'{}',syncWidget:()=>{},syncReminders:()=>{},captureIncoming:()=>{},setBars:()=>{},setSecure:()=>{},haptic:()=>{}};
if(!localStorage.getItem('maleem.v1'))localStorage.setItem('maleem.v1',JSON.stringify({onboarded:true,lang,profile:{name:'ظ‡ط´ط§ظ…'},currency:'EGP',budget:12000,budgetMode:'fixed',expenses:[]}));sessionStorage.setItem('maleem.splashed','1')},lang);
try{await page.goto('http://maleem.test/');await page.waitForFunction(()=>!!window.testApp);await fn(page);assert.deepEqual(errors,[]);results.push({name,pass:true});console.log('PASS',name)}catch(e){results.push({name,pass:false,error:e.stack});console.error('FAIL',name,e.message)}finally{await page.close()}}
try{
await run('Legacy backup currency, independent main conversion and shared payload',async p=>{
 const r=await p.evaluate(()=>{const a=testApp,b=a.backupData();b.currency='SAR';b.debts=[{id:'legacy',amount:200,person:'Old',payments:[],adds:[]}];a.applyBackup(b,Date.now());const old=a.S.debts[0];a.S.debts.push(a.cleanDebt({id:'usd',cur:'USD',amount:100,person:'Dollar'}));a.curScaleAll(10,'SAR',false);a.S.currency='EGP';return {old:old.cur,amount:old.amount,usd:a.S.debts[1].amount,shared:a.spBuildLocalRows('debts').map(x=>x.payload.cur),clean:a.cleanDebt(a.S.debts[1]).cur}});
 assert.deepEqual(r,{old:'SAR',amount:200,usd:100,shared:['SAR','USD'],clean:'USD'});
});
await run('Mixed totals, due amounts and unavailable conversion leave balances intact',async p=>{
 await p.evaluate(()=>{const a=testApp;a.S.debts=[a.cleanDebt({id:'egp',person:'EGP',amount:100,cur:'EGP',due:'2026-11-07'}),a.cleanDebt({id:'usd',person:'USD',amount:100,cur:'USD',due:'2026-11-07'})];a.S.accounts=[{id:'cash',type:'cash',name:'Cash',cur:'EGP',open:1000}];a.renderAll();a.go('debts')});
 assert.equal(await p.locator('#sumIn>span').count(),2);assert((await p.locator('#sumIn').innerText()).includes('$'));
 assert.equal(await p.evaluate(()=>testApp.dueItems(100).find(x=>x.id==='d:usd').cur),'$');
 await p.evaluate(()=>testApp.openPaySheet('usd'));await p.locator('#payAmt').fill('20');await p.locator('#payAcc').selectOption('cash');await p.locator('#paySave').click();assert.equal(await p.evaluate(()=>testApp.S.debts[1].payments.length),0);assert.equal(await p.evaluate(()=>testApp.accBal('cash')),1000);
 assert.equal(await p.evaluate(()=>testApp.capDebtCands().length),1);
});
for(const lang of ['eg','ar','en'])for(const width of [320,390])await run('Create, pay, add, explicitly convert and reload '+lang+' '+width,async p=>{
 await p.evaluate(()=>{const a=testApp;a.S.accounts=[{id:'usdacc',type:'cash',name:'USD cash',cur:'USD',open:1000}];a.S.manRates={EGP:{r:50,ts:Date.now()}};a.openDebtSheet()});
 await p.locator('#debtPerson').fill('Currency test');await p.locator('#debtAmt').fill('100');await p.locator('#debtCurPick').click();await p.locator('#debtCurMenu [data-cur=USD]').click();await p.locator('#debtAcc').selectOption('usdacc');await p.locator('#debtSave').click();
 assert.equal(await p.evaluate(()=>testApp.S.debts[0].cur),'USD');assert.equal(await p.evaluate(()=>testApp.accBal('usdacc')),900);
 await p.evaluate(()=>testApp.openPaySheet(testApp.S.debts[0].id));assert.equal(await p.locator('#payAmtCur').innerText(),'$');await p.locator('#payAmt').fill('20');await p.locator('#payAcc').selectOption('usdacc');await p.locator('#paySave').click();assert.equal(await p.evaluate(()=>testApp.accBal('usdacc')),920);
 await p.evaluate(()=>testApp.openDebtAdd(testApp.S.debts[0].id));await p.locator('#dAddAmt').fill('10');await p.locator('#dAddAcc').selectOption('usdacc');await p.locator('#dAddSave').click();assert.equal(await p.evaluate(()=>testApp.accBal('usdacc')),910);
 await p.evaluate(()=>testApp.openDebtSheet(testApp.S.debts[0].id));await p.locator('#debtCurPick').click();await p.locator('#debtCurMenu [data-cur=EGP]').click();assert(await p.locator('#debtConvert').isVisible());await p.locator('#debtRate').fill('50');assert.equal(await p.locator('#debtAmt').inputValue(),'5000');assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.locator('#debtSave').click();
 const r=await p.evaluate(()=>{const a=testApp,d=a.S.debts[0];return {cur:d.cur,amount:d.amount,paid:d.payments[0].amount,add:d.adds[0].amount,rem:a.debtRem(d),acc:a.accBal('usdacc')}});assert.deepEqual(r,{cur:'EGP',amount:5000,paid:1000,add:500,rem:4500,acc:910});
 await p.reload();await p.waitForFunction(()=>!!window.testApp);assert.equal(await p.evaluate(()=>testApp.debtRem(testApp.S.debts[0])),4500);assert.equal(await p.evaluate(()=>testApp.accBal('usdacc')),910);
 await p.evaluate(()=>testApp.openPaySheet(testApp.S.debts[0].id));await p.locator('#payAmt').fill('500');await p.locator('#payAcc').selectOption('usdacc');assert((await p.locator('#payFx').innerText()).includes('10'));await p.locator('#paySave').click();assert.equal(await p.evaluate(()=>testApp.accBal('usdacc')),920);
},lang,width);
}finally{await browser.close();fs.writeFileSync(path.join(__dirname,'debt-currency-results.json'),JSON.stringify(results,null,2));}
if(results.some(r=>!r.pass))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
