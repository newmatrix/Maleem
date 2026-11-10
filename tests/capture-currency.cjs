/* npm install --no-save playwright; BROWSER_PATH may point to Chrome/Edge.
   All requests are fulfilled from the local source tree; no production services are contacted. */
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('node:assert/strict');
let playwright;try{playwright=require('playwright')}catch(e){playwright=require(process.env.PLAYWRIGHT_MODULE)}
const root=path.join(__dirname,'../app/src/main/assets/www');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/\r\n?/g,'\n');
for(const x of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new(require('vm').Script)(x[1]);
const i=html.lastIndexOf('})();');
html=html.slice(0,i)+`window.testApp={get S(){return S},save,renderAll,capCurrency,capIpFee,cleanCapCur,backupData,applyBackup};\n`+html.slice(i);
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

const seed=p=>p.evaluate(()=>{const a=testApp,S=a.S;S.accounts=[{id:'b',name:'البنك',type:'bank',cur:'EGP',open:100}];S.ipFee={on:true,pct:0.1,min:0.5,max:20};S.capCurBy={};
  S.capQ=[{id:'c1',at:Date.now()-6e4,amount:100,cur:'',merchant:'متجر',method:'instapay',dir:'out',source:'بنك س',pkg:'com.bank.x',text:'تم خصم 100 من حسابك'},
          {id:'c2',at:Date.now()-5e4,amount:50,cur:'',merchant:'كافيه',method:'card',dir:'out',source:'بنك ص',pkg:'com.bank.y',text:'تم خصم 50'}];a.save();a.renderAll()});
const vis=(p,sel)=>p.evaluate(s=>{const e=document.querySelector(s);return !!e&&getComputedStyle(e).display!=='none'&&e.getClientRects().length>0},sel);
await run('Choosing a currency for one app: its operations change, the other app is untouched, undo with «as in the message»',async p=>{
  await seed(p);
  assert.deepEqual(await p.evaluate(()=>testApp.S.capQ.map(c=>testApp.capCurrency(c))),['EGP','EGP']);
  await p.click('[data-capid="c1"] [data-capdet]');await p.waitForTimeout(200);
  assert.equal(await vis(p,'[data-capcur]'),true);
  await p.selectOption('[data-capcur="com.bank.x"]','SAR');await p.waitForTimeout(250);
  assert.equal(await vis(p,'[data-capcur]'),true,'the details stay open');
  assert.deepEqual(await p.evaluate(()=>({by:testApp.S.capCurBy,cur:testApp.S.capQ.map(c=>testApp.capCurrency(c)),fee:testApp.capIpFee(testApp.S.capQ[0])})),{by:{'com.bank.x':'SAR'},cur:['SAR','EGP'],fee:0});
  const txt=await p.locator('[data-capid="c1"] .ut b').textContent();assert(!txt.includes('ج.م'),txt);assert((await p.locator('[data-capid="c2"] .ut b').textContent()).includes('ج.م'));
  await p.selectOption('[data-capcur="com.bank.x"]','');await p.waitForTimeout(250);
  assert.deepEqual(await p.evaluate(()=>({by:testApp.S.capCurBy,fee:testApp.capIpFee(testApp.S.capQ[0])})),{by:{},fee:await p.evaluate(()=>testApp.capIpFee(testApp.S.capQ[0]))});
},'eg',390);

await run('The mapping is cleaned, kept in a backup and restored',async p=>{
  const r=await p.evaluate(()=>{const a=testApp;return {c:a.cleanCapCur({'com.ok':'SAR','bad key!':'SAR','com.two':'XXX','com.arr':['SAR'],'com.num':5})}});
  assert.deepEqual(r.c,{'com.ok':'SAR'});
  await p.evaluate(()=>{testApp.S.capCurBy={'com.bank.x':'USD'};testApp.save()});
  const bk=await p.evaluate(()=>JSON.parse(JSON.stringify(testApp.backupData())));assert.deepEqual(bk.capCurBy,{'com.bank.x':'USD'});
  await p.evaluate(()=>{testApp.S.capCurBy={}});await p.evaluate(b=>{try{testApp.applyBackup(b,Date.now())}catch(e){}},bk);
  assert.deepEqual(await p.evaluate(()=>testApp.S.capCurBy),{'com.bank.x':'USD'});
},'eg',390);
await run('The currency picker is translated and fits (English, 320px)',async p=>{
  await seed(p);await p.click('[data-capid="c1"] [data-capdet]');await p.waitForTimeout(250);
  const t=await p.locator('[data-capid="c1"] .cap-cur').textContent();assert(/Currency of this app/.test(t)&&/As in the message/.test(t),t);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1),true);
},'en',320);

}finally{await browser.close();fs.writeFileSync(path.join(__dirname,'capture-currency-results.json'),JSON.stringify(results,null,2));}
if(results.some(r=>!r.pass))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
