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
for(const lang of ['eg','ar','en'])for(const width of [320,390])await run('Scrollable accounts '+lang+' '+width,async p=>{
await p.setViewportSize({width,height:640});
await p.evaluate(()=>{testApp.S.accounts=Array.from({length:25},(_,i)=>({id:'demo'+i,name:'حساب تجريبي '+(i+1),type:'bank',bank:'',cur:'EGP',open:1000+i*100,last4:'',ts:Date.now()}));testApp.openSheet()});
await p.waitForTimeout(350);await p.locator('#accPill').click();await p.waitForTimeout(250);
const m=p.locator('#accMenu');const box=await m.boundingBox();assert(box.y>=0);assert(box.y+box.height<=641);
assert(await m.evaluate(el=>el.scrollHeight>el.clientHeight));
if(lang==='eg'&&width===390)await p.screenshot({path:path.join(__dirname,'../../../account-menu-preview-top.png')});
await m.hover();await p.mouse.wheel(0,2000);await p.waitForTimeout(250);assert(await m.evaluate(el=>el.scrollTop>0));
await p.locator('[data-accpick="demo24"]').scrollIntoViewIfNeeded();
if(lang==='eg'&&width===390)await p.screenshot({path:path.join(__dirname,'../../../account-menu-preview-bottom.png')});
await p.locator('[data-accpick="demo24"]').click();assert((await p.locator('#accPill').textContent()).includes('25'));
assert.equal(await p.evaluate(()=>testApp.S.expenses.length),0);
},lang,width);
}finally{await browser.close();fs.writeFileSync(path.join(__dirname,'account-menu-results.json'),JSON.stringify(results,null,2));}
if(results.some(r=>!r.pass))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
