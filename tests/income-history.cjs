/* npm install --no-save playwright; BROWSER_PATH may point to Chrome/Edge.
   All requests are fulfilled from the local source tree; no production services are contacted. */
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('node:assert/strict');
let playwright;try{playwright=require('playwright')}catch(e){playwright=require(process.env.PLAYWRIGHT_MODULE)}
const root=path.join(__dirname,'../app/src/main/assets/www');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/\r\n?/g,'\n');
for(const x of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new(require('vm').Script)(x[1]);
const i=html.lastIndexOf('})();');
html=html.slice(0,i)+`window.testApp={meGo,renderIncome,incomeIn,openInSheet,freeIncomeBalance,get S(){return S},get RT(){return RT},get RC(){return RC},backupData,applyBackup,bkRestore,rcGet,rcPut,rcTx,monthsWithData,yearReportHtml,capView,capPlan,capConfirm,capAmount,capPull,capCurrency,openCapAsk,capMatch,cleanDebt,debtRem,accBal,openPaySheet,langPaint,go,openSheet,closeSheets,renderAll,spBuildLocalRows,spApplyShared,trText,dailyAllowance,periodOf,renderHome,exportXlsx,setSearch,bindDownloads:d=>downloads=d};\n`+html.slice(i);
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
for(const lang of ['eg','ar','en'])for(const width of [320,390])await run('Reach old income, edit account/report, delete and undo '+lang+' '+width,async p=>{
 await p.clock.setFixedTime(new Date('2026-11-07T12:00:00+02:00'));
 await p.evaluate(()=>{const a=testApp;a.S.accounts=[{id:'cash',type:'cash',name:'Cash',cur:'EGP',open:1000},{id:'bank',type:'bank',name:'Bank',cur:'EGP',open:2000}];a.S.inflows=Array.from({length:30},(_,i)=>({id:'income'+i,amount:100,ts:Date.now()-i*60000,src:'Income '+i,fund:'salary',acc:'cash',accAmt:100}));a.renderAll();a.go('me');a.meGo('budget')});
 assert.equal(await p.locator('#inList [data-in]').count(),3);assert.equal(await p.locator('#inLess').isVisible(),false);await p.locator('#inMore').click();assert.equal(await p.locator('#inList [data-in]').count(),23);await p.locator('#inLess').click();assert.equal(await p.locator('#inList [data-in]').count(),3);assert.equal(await p.locator('#inLess').isVisible(),false);await p.locator('#inMore').click();await p.locator('#inMore').click();assert.equal(await p.locator('#inList [data-in]').count(),30);assert.equal(await p.locator('#inMore').isVisible(),false);assert.equal(await p.locator('#inLess').isVisible(),true);
 await p.locator('[data-in=income29]').click();await p.locator('#inAmt').fill('150');await p.locator('#inAcc').selectOption('bank');await p.locator('#inSave').click();
 let r=await p.evaluate(()=>{const a=testApp;return [a.accBal('cash'),a.accBal('bank'),a.incomeIn(a.periodOf(Date.now())).amt]});assert.deepEqual(r,[3900,2150,3050]);assert((await p.locator('#inTotal').innerText()).includes('3,050'));
 await p.locator('[data-in=income29]').click();await p.locator('#inDel').click();assert.equal(await p.evaluate(()=>testApp.accBal('bank')),2000);await p.locator('#toastAct').click();assert.equal(await p.evaluate(()=>testApp.accBal('bank')),2150);assert.equal(await p.evaluate(()=>testApp.S.inflows.length),30);
 assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await p.reload();await p.waitForFunction(()=>!!window.testApp);assert.equal(await p.evaluate(()=>testApp.S.inflows.find(x=>x.id==='income29').amount),150);assert.equal(await p.evaluate(()=>testApp.accBal('bank')),2150);
},lang,width);
await run('Spent free income cannot be deleted or reduced',async p=>{
 await p.evaluate(()=>{const a=testApp;a.S.inflows=[{id:'free',amount:100,src:'Freelance',ts:Date.now(),fund:'free'}];a.S.expenses=[{id:'used',amount:80,ts:Date.now(),cat:'other',fund:'free'}];a.renderAll();a.openInSheet('free')});await p.locator('#inAmt').fill('50');await p.locator('#inSave').click();assert.equal(await p.evaluate(()=>testApp.S.inflows[0].amount),100);await p.locator('#inDel').click();assert.equal(await p.evaluate(()=>testApp.S.inflows.length),1);assert.equal(await p.evaluate(()=>testApp.freeIncomeBalance()),20);
});
}finally{await browser.close();fs.writeFileSync(path.join(__dirname,'income-history-results.json'),JSON.stringify(results,null,2));}
if(results.some(r=>!r.pass))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
