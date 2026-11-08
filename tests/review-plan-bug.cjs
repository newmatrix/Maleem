/* npm install --no-save playwright; BROWSER_PATH may point to Chrome/Edge.
   All requests are fulfilled from the local source tree; no production services are contacted. */
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('node:assert/strict');
let playwright;try{playwright=require('playwright')}catch(e){playwright=require(process.env.PLAYWRIGHT_MODULE)}
const root=path.join(__dirname,'../app/src/main/assets/www');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/\r\n?/g,'\n');
for(const x of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new(require('vm').Script)(x[1]);
const i=html.lastIndexOf('})();');
html=html.slice(0,i)+`window.testApp={get S(){return S},openPlan,fixedScheduled,fixedOcc,fixedDueItems,fixedPendingIn,cleanFixed,openFixed,openRestore,rsGroups,save,get RT(){return RT},get RC(){return RC},backupData,applyBackup,bkRestore,rcGet,rcPut,rcTx,monthsWithData,yearReportHtml,capView,capPlan,capConfirm,capAmount,capPull,capCurrency,openCapAsk,capMatch,cleanDebt,debtRem,accBal,openPaySheet,langPaint,go,openSheet,closeSheets,renderAll,spBuildLocalRows,spApplyShared,trText,dailyAllowance,periodOf,renderHome,exportXlsx,setSearch,bindDownloads:d=>downloads=d};\n`+html.slice(i);
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
await run('One-time planned expense creation and edit save successfully',async p=>{
await p.evaluate(()=>testApp.openPlan());
await p.locator('[data-k=name]').fill('Review planned expense');
await p.locator('#formSave').click();
const created=await p.evaluate(()=>({count:testApp.S.plans.length,error:document.querySelector('#formErr').textContent}));
assert.equal(created.count,1);assert.equal(created.error,'');
await p.evaluate(()=>{testApp.S.plans=[{id:'existing',name:'Existing',cat:'other',amount:50,due:'2026-12-01'}];testApp.openPlan('existing')});
await p.locator('[data-k=name]').fill('Updated');await p.locator('#formSave').click();
const edited=await p.evaluate(()=>({name:testApp.S.plans[0].name,error:document.querySelector('#formErr').textContent}));
assert.equal(edited.name,'Updated');assert.equal(edited.error,'');await p.reload();await p.waitForFunction(()=>!!window.testApp);assert.equal(await p.evaluate(()=>testApp.S.plans[0].name),'Updated');
});
for(const lang of ['eg','ar','en'])await run('Recurrence capped at 24 months: '+lang,async p=>{
await p.evaluate(()=>testApp.openFixed());await p.locator('[data-k=name]').fill('Recurring');
const options=await p.locator('[data-k=everyMonths] option').evaluateAll(xs=>xs.map(x=>Number(x.value)));
assert.equal(options.length,24);assert.equal(Math.max(...options),24);
await p.locator('[data-k=everyMonths]').evaluate(el=>{el.add(new Option('25','25'));el.value='25'});
await p.locator('#formSave').click();assert.equal(await p.evaluate(()=>testApp.S.fixed.length),0);
assert((await p.locator('#formErr').textContent()).includes('24'));
await p.locator('[data-k=everyMonths]').selectOption('24');await p.locator('#formSave').click();
assert.equal(await p.evaluate(()=>testApp.S.fixed[0].everyMonths),24);
await p.reload();await p.waitForFunction(()=>!!window.testApp);
assert.equal(await p.evaluate(()=>testApp.S.fixed[0].everyMonths),24);
await p.evaluate(()=>testApp.openFixed(testApp.S.fixed[0].id));
assert.equal(await p.locator('[data-k=everyMonths]').inputValue(),'24');
},lang);
}finally{await browser.close();fs.writeFileSync(path.join(__dirname,'review-plan-bug-results.json'),JSON.stringify(results,null,2));}
if(results.some(r=>!r.pass))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
