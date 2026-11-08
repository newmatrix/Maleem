/* npm install --no-save playwright; BROWSER_PATH may point to Chrome/Edge.
   All requests are fulfilled from the local source tree; no production services are contacted. */
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('node:assert/strict');
let playwright;try{playwright=require('playwright')}catch(e){playwright=require(process.env.PLAYWRIGHT_MODULE)}
const root=path.join(__dirname,'../app/src/main/assets/www');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/\r\n?/g,'\n');
for(const x of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new(require('vm').Script)(x[1]);
const i=html.lastIndexOf('})();');
html=html.slice(0,i)+`window.testApp={get S(){return S},cleanExpense,fixedScheduled,fixedOcc,fixedDueItems,fixedPendingIn,cleanFixed,openFixed,openRestore,rsGroups,save,get RT(){return RT},get RC(){return RC},backupData,applyBackup,bkRestore,rcGet,rcPut,rcTx,monthsWithData,yearReportHtml,capView,capPlan,capConfirm,capAmount,capPull,capCurrency,openCapAsk,capMatch,cleanDebt,debtRem,accBal,openPaySheet,langPaint,go,openSheet,closeSheets,renderAll,spBuildLocalRows,spApplyShared,trText,dailyAllowance,periodOf,renderHome,exportXlsx,setSearch,bindDownloads:d=>downloads=d};\n`+html.slice(i);
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
for(const lang of ['eg','ar','en'])for(const width of [320,390])await run('Expense time add/edit/reload/backup '+lang+' '+width,async p=>{
await p.setViewportSize({width,height:740});
const now=await p.evaluate(()=>{testApp.openSheet();const d=new Date();return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')});
assert.equal(await p.locator('#expenseTime').inputValue(),now);
await p.evaluate(()=>{testApp.closeSheets();testApp.S.accounts=[{id:'bank',name:'Bank',type:'bank',cur:'EGP',open:1000}];testApp.openSheet(null,{amount:125,cat:'other',day:'2026-10-20',acc:'bank'})});
await p.waitForTimeout(350);await p.locator('#datePill').click();await p.locator('#dateOtherOpen').click();await p.locator('#expenseHourWheel').evaluate(e=>e.scrollTop=9*44);await p.locator('#expenseMinuteWheel').evaluate(e=>e.scrollTop=35*44);await p.waitForTimeout(200);assert.equal(await p.locator('#expenseTimeDraft').inputValue(),'09:35');await p.waitForTimeout(300);
if(lang==='eg'&&width===390)await p.screenshot({path:path.join(__dirname,'../../../expense-time-preview.png')});
const box=await p.locator('#expenseDatePopup').boundingBox();assert(box.x>=0&&box.x+box.width<=width+1);assert(box.y>=0&&box.y+box.height<=741);
await p.locator('#expenseDateApply').click();await p.locator('#saveBtn').click();
const created=await p.evaluate(()=>{const a=testApp,e=a.S.expenses[0],d=new Date(e.ts);return {h:d.getHours(),m:d.getMinutes(),day:d.getDate(),balance:a.accBal('bank'),amount:e.amount,clean:a.cleanExpense(e).ts===e.ts,backup:a.backupData().expenses[0].ts===e.ts,shared:a.cleanExpense({...e,sp:"TEST",by:"member"},true).ts===e.ts}});
assert.deepEqual(created,{h:9,m:35,day:20,balance:875,amount:125,clean:true,backup:true,shared:true});
await p.evaluate(()=>testApp.openSheet(testApp.S.expenses[0].id));await p.locator('#datePill').click();await p.locator('#dateOtherOpen').click();await p.locator('#expenseHourWheel').evaluate(e=>e.scrollTop=17*44);await p.locator('#expenseMinuteWheel').evaluate(e=>e.scrollTop=42*44);await p.waitForTimeout(200);assert.equal(await p.locator('#expenseTimeDraft').inputValue(),'17:42');await p.locator('#expenseDateApply').click();await p.locator('#saveBtn').click();
await p.reload();await p.waitForFunction(()=>!!window.testApp);
assert.deepEqual(await p.evaluate(()=>{const e=testApp.S.expenses[0],d=new Date(e.ts);return [d.getHours(),d.getMinutes(),testApp.accBal('bank'),testApp.S.expenses.length]}),[17,42,875,1]);
await p.evaluate(()=>{const a=testApp,b=a.backupData();a.S.expenses=[];a.applyBackup(b,Date.now())});
assert.equal(await p.evaluate(()=>new Date(testApp.S.expenses[0].ts).getMinutes()),42);
},lang,width);
await run('Unchanged legacy and captured times preserved exactly; invalid and future times refused',async p=>{
const stamp=await p.evaluate(()=>{const ts=new Date(2026,9,20,8,25,31,456).getTime();testApp.S.expenses=[{id:'old',amount:10,cat:'other',pay:'cash',ts}];testApp.openSheet('old');return ts});
await p.locator('#saveBtn').click();assert.equal(await p.evaluate(()=>testApp.S.expenses[0].ts),stamp);
await p.evaluate(ts=>testApp.openSheet(null,{amount:20,cat:'other',cap:'notification',ts,day:'2026-10-20'}),stamp);await p.locator('#saveBtn').click();assert.equal(await p.evaluate(()=>testApp.S.expenses[1].ts),stamp);
await p.evaluate(()=>{testApp.openSheet(null,{amount:10,cat:'other'});document.querySelector('#expenseTime').value=''});await p.locator('#saveBtn').click();assert.equal(await p.evaluate(()=>testApp.S.expenses.length),2);
await p.evaluate(()=>document.querySelector('#expenseTime').value='23:59');await p.locator('#saveBtn').click();assert.equal(await p.evaluate(()=>testApp.S.expenses.length),2);
});
}finally{await browser.close();fs.writeFileSync(path.join(__dirname,'expense-time-results.json'),JSON.stringify(results,null,2));}
if(results.some(r=>!r.pass))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
