/* npm install --no-save playwright; BROWSER_PATH may point to Chrome/Edge.
   All requests are fulfilled from the local source tree; no production services are contacted. */
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('node:assert/strict');
let playwright;try{playwright=require('playwright')}catch(e){playwright=require(process.env.PLAYWRIGHT_MODULE)}
const root=path.join(__dirname,'../app/src/main/assets/www');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/\r\n?/g,'\n');
for(const x of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new(require('vm').Script)(x[1]);
const i=html.lastIndexOf('})();');
html=html.slice(0,i)+`window.testApp={get S(){return S},fixedOccurrences,cleanFixedLog,syncNative,fixedScheduled,fixedOcc,fixedDueItems,fixedPendingIn,cleanFixed,openFixed,openRestore,rsGroups,save,get RT(){return RT},get RC(){return RC},backupData,applyBackup,bkRestore,rcGet,rcPut,rcTx,monthsWithData,yearReportHtml,capView,capPlan,capConfirm,capAmount,capPull,capCurrency,openCapAsk,capMatch,cleanDebt,debtRem,accBal,openPaySheet,langPaint,go,openSheet,closeSheets,renderAll,spBuildLocalRows,spApplyShared,trText,dailyAllowance,periodOf,renderHome,exportXlsx,setSearch,bindDownloads:d=>downloads=d};\n`+html.slice(i);
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
await run('Daily weekly monthly limits, leap-year, DST and pause',async p=>{
const r=await p.evaluate(()=>{const a=testApp,start=new Date(2026,10,1).getTime(),end=new Date(2026,11,1).getTime();return {
daily:a.fixedOccurrences({repeat:'daily',startDate:'2026-11-01',endDate:'2026-11-04'},start,end).map(x=>x.dk),
weekly:a.fixedOccurrences({repeat:'weekly',startDate:'2026-10-23',endDate:'2026-11-06'},new Date(2026,9,20).getTime(),end).map(x=>x.dk),
monthly:a.fixedOccurrences({day:31,from:'2028-01',everyMonths:1,startDate:'2028-01-31',endDate:'2028-03-30'},new Date(2028,0,1).getTime(),new Date(2028,3,1).getTime()).map(x=>x.dk),
paused:a.fixedOccurrences({repeat:'daily',startDate:'2026-11-01',paused:true},start,end).length,
old:a.cleanFixed({id:'old',day:10}).everyMonths}});
assert.deepEqual(r,{daily:['2026-11-01','2026-11-02','2026-11-03','2026-11-04'],weekly:['2026-10-23','2026-10-30','2026-11-06'],monthly:['2028-01-31','2028-02-29'],paused:0,old:1});
});
await run('Daily log forecast, cleaning and shared backup fields',async p=>{
const r=await p.evaluate(()=>{const a=testApp,f=a.cleanFixed({id:'daily',name:'Daily',cat:'other',day:1,amount:10,repeat:'daily',startDate:'2026-11-01',endDate:'2026-11-03',from:'2026-11'});a.S.fixed=[f];a.S.fixedLog=a.cleanFixedLog({'daily:2026-11-01':'done','daily:2026-11-02':'skip'});a.S.plans=[];const remaining=a.fixedPendingIn(new Date(2026,10,1).getTime(),new Date(2026,11,1).getTime()),shared=a.spBuildLocalRows('fixed')[0].payload,b=a.backupData();a.applyBackup(b,Date.now());return {remaining,repeat:a.S.fixed[0].repeat,end:a.S.fixed[0].endDate,log:a.S.fixedLog,sharedRepeat:shared.repeat,sharedLog:shared.log}});
assert.equal(r.remaining,10);assert.equal(r.repeat,'daily');assert.equal(r.end,'2026-11-03');assert.equal(r.sharedRepeat,'daily');assert.deepEqual(r.log,{'daily:2026-11-01':'done','daily:2026-11-02':'skip'});assert.deepEqual(r.sharedLog,r.log);
});
for(const lang of ['eg','ar','en'])for(const width of [320,390])await run('Create calendar dates, pay one daily occurrence, reload, pause '+lang+' '+width,async p=>{
await p.clock.setFixedTime(new Date('2026-11-06T12:00:00+02:00'));
await p.evaluate(()=>testApp.openFixed());await p.locator('[data-k=name]').fill('Daily expense');await p.locator('[data-k=amount]').fill('25');await p.locator('[data-repeat=daily]').click();assert.equal(await p.locator('[data-k=everyMonths]').isVisible(),false);
await p.locator('#fixedPick-startDate').click();await p.locator('#sfCalendarDays [data-day="2026-11-05"]').click();await p.locator('#fixedPick-endDate').click();await p.locator('#sfCalendarDays [data-day="2026-11-08"]').click();await p.locator('#formSave').click();
assert.equal(await p.evaluate(()=>testApp.S.expenses.length),0);assert.equal(await p.evaluate(()=>testApp.S.fixed[0].repeat),'daily');
await p.evaluate(()=>{const a=testApp,f=a.S.fixed[0];a.openSheet(null,{amount:f.amount,cat:f.cat,note:f.name,fx:{id:f.id,mk:'2026-11-05'}})});await p.locator('#saveBtn').click();assert.equal(await p.evaluate(()=>testApp.S.expenses.length),1);
await p.reload();await p.waitForFunction(()=>!!window.testApp);assert.equal(await p.evaluate(()=>Object.values(testApp.S.fixedLog)[0]),'done');assert.equal(await p.evaluate(()=>testApp.fixedPendingIn(new Date(2026,10,5).getTime(),new Date(2026,10,9).getTime())),75);
const reminders=await p.evaluate(()=>{let payload;AndroidBridge.syncReminders=x=>payload=JSON.parse(x);testApp.S.dueRemind=true;testApp.syncNative();return payload.due.filter(x=>x.title.includes('Daily expense')).length});assert(reminders>0);
await p.evaluate(()=>testApp.openFixed(testApp.S.fixed[0].id));await p.locator('#fixedActiveToggle').uncheck();await p.locator('#formSave').click();assert.equal(await p.evaluate(()=>testApp.S.fixed[0].paused),true);assert.equal(await p.evaluate(()=>testApp.fixedPendingIn(new Date(2026,10,5).getTime(),new Date(2026,10,9).getTime())),0);assert.equal(await p.evaluate(()=>testApp.S.expenses.length),1);
await p.evaluate(()=>testApp.openFixed(testApp.S.fixed[0].id));assert.equal(await p.locator('[data-k=startDate]').inputValue(),'2026-11-05');assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
},lang,width);
}finally{await browser.close();fs.writeFileSync(path.join(__dirname,'recurrence-expanded-results.json'),JSON.stringify(results,null,2));}
if(results.some(r=>!r.pass))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
