/* npm install --no-save playwright; BROWSER_PATH may point to Chrome/Edge.
   All requests are fulfilled from the local source tree; no production services are contacted. */
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('node:assert/strict');
let playwright;try{playwright=require('playwright')}catch(e){playwright=require(process.env.PLAYWRIGHT_MODULE)}
const root=path.join(__dirname,'../app/src/main/assets/www');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/\r\n?/g,'\n');
for(const x of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new(require('vm').Script)(x[1]);
const i=html.lastIndexOf('})();');
html=html.slice(0,i)+`window.testApp={get S(){return S},save,renderAll,go,backupData,applyBackup,fabRest};\n`+html.slice(i);
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

const awake=p=>p.evaluate(()=>document.documentElement.classList.contains('fab-awake'));
const sheetOpen=p=>p.evaluate(()=>document.querySelector('#sheet').classList.contains('open'));
await run('Pinned + and mic: they stay out and one tap works; unpinned keeps the two-tap behaviour; it survives a backup',async p=>{
  await p.evaluate(()=>{testApp.fabRest()});assert.equal(await awake(p),false);
  await p.click('#fab',{force:true});await p.waitForTimeout(250);assert.equal(await sheetOpen(p),false,'first tap only reveals');assert.equal(await awake(p),true);
  await p.evaluate(()=>{const t=document.querySelector('#fabPinToggle');t.checked=true;t.dispatchEvent(new Event('change',{bubbles:true}))});await p.waitForTimeout(200);
  assert.equal(await p.evaluate(()=>testApp.S.fabPin),true);assert.equal(await awake(p),true);
  await p.evaluate(()=>{testApp.fabRest()});assert.equal(await awake(p),true,'resting does not hide a pinned button');
  await p.click('#fab',{force:true});await p.waitForTimeout(250);assert.equal(await sheetOpen(p),true,'one tap opens it');
  await p.evaluate(()=>document.querySelector('#scrim').click());await p.waitForTimeout(250);
  const bk=await p.evaluate(()=>JSON.parse(JSON.stringify(testApp.backupData())));assert.equal(bk.prefs.fabPin,true);
  await p.evaluate(()=>{const t=document.querySelector('#fabPinToggle');t.checked=false;t.dispatchEvent(new Event('change',{bubbles:true}))});await p.waitForTimeout(200);
  assert.equal(await awake(p),false);assert.equal(await p.evaluate(()=>testApp.S.fabPin),false);
  await p.evaluate(b=>{try{testApp.applyBackup(b,Date.now())}catch(e){}},bk);assert.equal(await p.evaluate(()=>testApp.S.fabPin),true);
},'eg',390);
await run('A way into the fixed expenses from the التزاماتي tab',async p=>{
  await p.evaluate(()=>{testApp.S.fixed=[{id:'f1',name:'نت',cat:'bills',amount:300,day:5,from:'2026-01',created:Date.now()}];testApp.save();testApp.go('debts')});await p.waitForTimeout(300);
  assert((await p.locator('#obFixedGo').textContent()).includes('المصاريف الثابتة')&&(await p.locator('#obFixedSub').textContent()).includes('1 ثابتة'));
  await p.click('#obFixedGo');await p.waitForTimeout(400);
  assert.deepEqual(await p.evaluate(()=>({me:document.querySelector('#v-me').classList.contains('active'),page:!document.querySelector('[data-mepage=fixed]').hidden})),{me:true,page:true});
},'eg',390);
await run('Both are translated and fit (English, 320px)',async p=>{
  await p.evaluate(()=>testApp.go('debts'));await p.waitForTimeout(300);
  const t=await p.locator('#obFixedGo').textContent();assert(/Fixed expenses, subscriptions and upcoming/.test(t)&&!/[\u0600-\u06ff]/.test(t),t);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1),true);
  const r=await p.evaluate(()=>document.querySelector('#fabPinRow .txt').textContent);assert(/Keep the \+ and mic buttons out/.test(r),r);
},'en',320);

}finally{await browser.close();fs.writeFileSync(path.join(__dirname,'shortcuts-results.json'),JSON.stringify(results,null,2));}
if(results.some(r=>!r.pass))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
