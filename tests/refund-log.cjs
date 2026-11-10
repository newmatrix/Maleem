/* npm install --no-save playwright; BROWSER_PATH may point to Chrome/Edge.
   All requests are fulfilled from the local source tree; no production services are contacted. */
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('node:assert/strict');
let playwright;try{playwright=require('playwright')}catch(e){playwright=require(process.env.PLAYWRIGHT_MODULE)}
const root=path.join(__dirname,'../app/src/main/assets/www');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/\r\n?/g,'\n');
for(const x of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new(require('vm').Script)(x[1]);
const i=html.lastIndexOf('})();');
html=html.slice(0,i)+`window.testApp={get S(){return S},save,renderAll,go,meGo,backupData,applyBackup,curScaleAll,openRefund,trashAll};\n`+html.slice(i);
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

const seed=p=>p.evaluate(()=>{const a=testApp,S=a.S,n=Date.now();S.accounts=[{id:'bank',name:'البنك',type:'bank',cur:'EGP',open:1000},{id:'cash',name:'كاش',type:'cash',cur:'EGP',open:0}];
  S.expenses=[{id:'e1',amount:500,cat:'shop',note:'جزمة',ts:n-36e5,pay:'card',acc:'bank',accAmt:500},{id:'e2',amount:80,cat:'food',note:'غدا',ts:n-36e5,pay:'cash'}];S.refunds=[];a.save();a.renderAll()});
const refund=async(p,id,amt,acc)=>{await p.evaluate(id=>testApp.openRefund({exp:id,fixed:true}),id);await p.waitForTimeout(250);await p.fill('#rfAmt',String(amt));if(acc!==undefined)await p.selectOption('#rfAcc',acc);await p.click('#rfSave');await p.waitForTimeout(250)};
await run('Every refund is logged: partial and full, with date, amount and account; the page lists them',async p=>{
  await seed(p);
  await refund(p,'e1',200,'bank');
  let r=await p.evaluate(()=>({exp:testApp.S.expenses.find(x=>x.id==='e1').amount,log:testApp.S.refunds.map(x=>({a:x.amount,full:x.full,note:x.note,acc:x.acc,accName:x.accName}))}));
  assert.equal(r.exp,300);assert.equal(r.log.length,1);assert.deepEqual(r.log[0],{a:200,full:false,note:'جزمة',acc:'bank',accName:r.log[0].accName});assert(r.log[0].accName.includes('البنك'));
  await refund(p,'e2',80);
  r=await p.evaluate(()=>({gone:!testApp.S.expenses.some(x=>x.id==='e2'),log:testApp.S.refunds.map(x=>({a:x.amount,full:x.full}))}));
  assert.equal(r.gone,true);assert.deepEqual(r.log,[{a:80,full:true},{a:200,full:false}]);
  await p.evaluate(()=>{testApp.go('me');testApp.meGo('refunds')});await p.waitForTimeout(300);
  const t=await p.locator('#rfLog').textContent();assert(t.includes('جزمة')&&t.includes('غدا')&&t.includes('جزء منه')&&t.includes('كله'),t);assert((await p.locator('#rfTotal').textContent()).includes('280'));
},'eg',390);
await run('Undo removes the log entry; backup, restore and currency change keep the log',async p=>{
  await seed(p);await refund(p,'e1',100,'bank');
  assert.equal(await p.evaluate(()=>testApp.S.refunds.length),1);
  await p.click('#toastAct');await p.waitForTimeout(250);
  assert.deepEqual(await p.evaluate(()=>({n:testApp.S.refunds.length,amt:testApp.S.expenses.find(x=>x.id==='e1').amount})),{n:0,amt:500});
  await refund(p,'e1',100,'bank');
  const bk=await p.evaluate(()=>JSON.parse(JSON.stringify(testApp.backupData())));assert.equal(bk.refunds.length,1);
  await p.evaluate(()=>{testApp.S.refunds=[]});await p.evaluate(b=>{try{testApp.applyBackup(b,Date.now())}catch(e){}},bk);
  assert.deepEqual(await p.evaluate(()=>testApp.S.refunds.map(x=>x.amount)),[100]);
  await p.evaluate(()=>testApp.curScaleAll(3,'EGP',false));assert.deepEqual(await p.evaluate(()=>testApp.S.refunds.map(x=>x.amount)),[300]);
},'eg',390);
await run('The refund log page is translated and fits (English, 320px)',async p=>{
  await seed(p);await refund(p,'e1',100,'bank');await p.evaluate(()=>{testApp.go('me');testApp.meGo('refunds')});await p.waitForTimeout(300);
  const t=await p.locator('[data-mepage=refunds]').evaluate(e=>e.textContent);assert(/Refund log/.test(t)&&/Part of it/.test(t),t);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1),true);
},'en',320);

}finally{await browser.close();fs.writeFileSync(path.join(__dirname,'refund-log-results.json'),JSON.stringify(results,null,2));}
if(results.some(r=>!r.pass))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
