/* npm install --no-save playwright; BROWSER_PATH may point to Chrome/Edge.
   All requests are fulfilled from the local source tree; no production services are contacted. */
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('node:assert/strict');
let playwright;try{playwright=require('playwright')}catch(e){playwright=require(process.env.PLAYWRIGHT_MODULE)}
const root=path.join(__dirname,'../app/src/main/assets/www');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/\r\n?/g,'\n');
for(const x of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new(require('vm').Script)(x[1]);
const i=html.lastIndexOf('})();');
html=html.slice(0,i)+`window.testApp={get S(){return S},fixedScheduled,fixedOcc,fixedDueItems,fixedPendingIn,cleanFixed,openFixed,openRestore,rsGroups,save,get RT(){return RT},get RC(){return RC},backupData,applyBackup,bkRestore,rcGet,rcPut,rcTx,monthsWithData,yearReportHtml,capView,capPlan,capConfirm,capAmount,capPull,capCurrency,openCapAsk,capMatch,cleanDebt,debtRem,accBal,openPaySheet,langPaint,go,openSheet,closeSheets,renderAll,spBuildLocalRows,spApplyShared,trText,dailyAllowance,periodOf,renderHome,exportXlsx,setSearch,bindDownloads:d=>downloads=d};\n`+html.slice(i);
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
for(const lang of ['eg','ar','en'])for(const width of [320,390])await run('Home daily/monthly list, totals and editing '+lang+' '+width,async p=>{
await p.clock.setFixedTime(new Date('2026-01-15T12:00:00+02:00'));
await p.evaluate(()=>{const a=testApp;const ts=(m,d,h)=>new Date(2026,m,d,h).getTime();a.S.accounts=[{id:'bank',name:'Bank',type:'bank',cur:'EGP',open:1000}];a.S.expenses=[{id:'today',amount:20,cat:'other',ts:ts(0,15,10),pay:'cash',acc:'bank',accAmt:20},{id:'earlier',amount:50,cat:'other',ts:ts(0,2,12),pay:'cash',acc:'bank',accAmt:50},{id:'lastyear',amount:80,cat:'other',ts:new Date(2025,11,31,12).getTime(),pay:'cash'}];a.renderHome()});
assert.deepEqual(await p.locator('#todayList .xp').evaluateAll(xs=>xs.map(x=>x.dataset.id)),['today']);
await p.locator('#homeExpensePick').click();await p.locator('[data-home-view=month]').click();assert.deepEqual(await p.locator('#todayList .xp').evaluateAll(xs=>xs.map(x=>x.dataset.id)),['today','earlier']);assert((await p.locator('#todayTotal').textContent()).includes('70'));
assert.equal(await p.locator('#todayList .day-h').count(),2);assert.equal(await p.evaluate(()=>testApp.accBal('bank')),930);
await p.locator('[data-homeedit=earlier]').click();assert.equal(await p.locator('#amountInput').inputValue(),'50');await p.locator('#amountInput').fill('60');await p.locator('#saveBtn').click();
assert((await p.locator('#todayTotal').textContent()).includes('80'));assert.equal(await p.evaluate(()=>testApp.accBal('bank')),920);assert.equal(await p.locator('[data-home-view=month]').getAttribute('aria-checked'),'true');
await p.locator('#homeExpensePick').click();await p.locator('[data-home-view=day]').click();assert.equal(await p.locator('#todayList .xp').count(),1);
await p.evaluate(()=>{testApp.S.expenses=[];testApp.renderHome()});assert.equal(await p.locator('#todayList .empty').count(),1);await p.locator('#homeExpensePick').click();await p.locator('[data-home-view=month]').click();assert.equal(await p.locator('#todayList .empty').count(),1);
assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
},lang,width);
}finally{await browser.close();fs.writeFileSync(path.join(__dirname,'home-month-results.json'),JSON.stringify(results,null,2));}
if(results.some(r=>!r.pass))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
