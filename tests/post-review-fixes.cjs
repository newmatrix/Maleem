/* npm install --no-save playwright; BROWSER_PATH may point to Chrome/Edge.
   All requests are fulfilled from the local source tree; no production services are contacted. */
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('node:assert/strict');
let playwright;try{playwright=require('playwright')}catch(e){playwright=require(process.env.PLAYWRIGHT_MODULE)}
const root=path.join(__dirname,'../app/src/main/assets/www');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/\r\n?/g,'\n');
for(const x of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new(require('vm').Script)(x[1]);
const i=html.lastIndexOf('})();');
html=html.slice(0,i)+`window.testApp={get S(){return S},openFixed,openDebtSheet,syncNative,cleanFixed,save};
`+html.slice(i);
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

await run('English debt currency picker shows the code, no Arabic symbol',async p=>{await p.evaluate(()=>testApp.openDebtSheet());const t=await p.locator('#debtCurPick').textContent();assert(/EGP/.test(t),t);assert(!/[\u0600-\u06ff]/.test(t),t)},'en',390);
await run('Debt currency picker keeps Arabic name and symbol in Egyptian Arabic',async p=>{await p.evaluate(()=>testApp.openDebtSheet());const t=await p.locator('#debtCurPick').textContent();assert(/ج\.م/.test(t),t)},'eg',390);
await run('Editing a recurring expense older than 24 months keeps its interval',async p=>{
 await p.evaluate(()=>{testApp.S.fixed=[{id:'old',name:'Insurance',cat:'other',amount:900,day:10,everyMonths:36,from:'2026-01'}];testApp.openFixed('old')});
 assert.equal(await p.locator('[data-k=everyMonths]').inputValue(),'36');
 await p.locator('#formSave').click();
 assert.equal(await p.evaluate(()=>testApp.S.fixed[0].everyMonths),36)});
await run('New recurring expense still limited to 24 months',async p=>{
 await p.evaluate(()=>testApp.openFixed());
 const opts=await p.locator('[data-k=everyMonths] option').evaluateAll(o=>o.map(x=>+x.value));
 assert.equal(Math.max(...opts),24);assert.equal(opts.length,24)});
await run('Daily recurrence does not push debt reminders out or double-notify',async p=>{
 const r=await p.evaluate(()=>{const t=testApp,D=864e5,dk=o=>new Date(Date.now()+o*D).toISOString().slice(0,10);
  t.S.dueRemind=true;t.S.fixed=[{id:'c',name:'Coffee',cat:'food',amount:20,day:1,repeat:'daily',startDate:dk(-3),from:dk(-3).slice(0,7)}];t.S.fixedLog={};t.S.plans=[];t.S.gams=[];t.S.insts=[];
  t.S.debts=[{id:'d1',dir:'in',person:'Ali',amount:100,cur:'EGP',due:dk(25),created:Date.now(),payments:[]}];
  let got;window.AndroidBridge.syncReminders=x=>got=JSON.parse(x);t.syncNative();
  return {n:got.due.length,debt:got.due.filter(x=>/سلفة/.test(x.title)).length,tomorrow:got.due.filter(x=>x.title.startsWith('بكرة ميعاد Coffee')).length,today:got.due.filter(x=>x.title==='النهارده ميعاد Coffee').length}});
 assert(r.debt>=1,'debt reminder missing');assert.equal(r.tomorrow,0);assert(r.today>=1&&r.today<=8,String(r.today));assert(r.n<=12,String(r.n))});
await run('Weekly recurrence reminds a day before and on the day for four weeks only',async p=>{
 const r=await p.evaluate(()=>{const t=testApp,D=864e5,dk=o=>new Date(Date.now()+o*D).toISOString().slice(0,10);
  t.S.dueRemind=true;t.S.fixed=[{id:'w',name:'Gym',cat:'other',amount:50,day:1,repeat:'weekly',startDate:dk(-10),from:dk(-10).slice(0,7)}];t.S.fixedLog={};t.S.plans=[];t.S.debts=[];
  let got;window.AndroidBridge.syncReminders=x=>got=JSON.parse(x);t.syncNative();
  const at=got.due.filter(x=>/Gym/.test(x.title));return {n:at.length,span:Math.max(...at.map(x=>x.at))-Date.now(),both:at.some(x=>x.title.startsWith('بكرة'))&&at.some(x=>x.title.startsWith('النهارده'))}});
 assert(r.n>=3&&r.n<=10,String(r.n));assert(r.both);assert(r.span<=30*864e5,String(r.span))});
}finally{await browser.close();fs.writeFileSync(path.join(__dirname,'post-review-fixes-results.json'),JSON.stringify(results,null,2));}
if(results.some(r=>!r.pass))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
