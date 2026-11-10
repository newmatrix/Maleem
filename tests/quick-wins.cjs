/* npm install --no-save playwright; BROWSER_PATH may point to Chrome/Edge.
   All requests are fulfilled from the local source tree; no production services are contacted. */
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('node:assert/strict');
let playwright;try{playwright=require('playwright')}catch(e){playwright=require(process.env.PLAYWRIGHT_MODULE)}
const root=path.join(__dirname,'../app/src/main/assets/www');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/\r\n?/g,'\n');
for(const x of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new(require('vm').Script)(x[1]);
const i=html.lastIndexOf('})();');
html=html.slice(0,i)+`window.testApp={get S(){return S},save,renderAll,openSheet,toast,go,showDetail};\n`+html.slice(i);
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

const vis=(p,sel)=>p.evaluate(s=>{const e=document.querySelector(s);return !!e&&!e.hidden&&e.getClientRects().length>0},sel);
await run('Messages can be pushed away: tap, swipe, and the undo button still works',async p=>{
  const shown=()=>p.evaluate(()=>document.querySelector('#toast').classList.contains('show'));
  await p.evaluate(()=>testApp.toast('رسالة تجربة'));await p.waitForTimeout(300);assert.equal(await shown(),true);
  let b=await p.locator('#toast').boundingBox();await p.mouse.click(b.x+20,b.y+b.height/2);await p.waitForTimeout(200);assert.equal(await shown(),false);
  await p.evaluate(()=>testApp.toast('رسالة تانية'));await p.waitForTimeout(300);b=await p.locator('#toast').boundingBox();
  await p.mouse.move(b.x+20,b.y+10);await p.mouse.down();await p.mouse.move(b.x+120,b.y+12,{steps:5});await p.mouse.up();await p.waitForTimeout(200);assert.equal(await shown(),false);
  await p.evaluate(()=>{window.__undo=0;testApp.toast('اتحذف','تراجع',()=>{window.__undo++})});await p.waitForTimeout(300);
  await p.click('#toastAct');await p.waitForTimeout(150);assert.equal(await p.evaluate(()=>window.__undo),1);assert.equal(await shown(),false);
},'eg',390);
await run('InstaPay fee shows for a typed InstaPay expense (setting on), not otherwise, and saves the fee',async p=>{
  const open=async on=>{await p.evaluate(on=>{const a=testApp;a.S.ipFee={on,pct:0.1,min:0.5,max:20};a.S.expenses=[];a.save();a.openSheet()},on);await p.waitForTimeout(300)};
  const pickPay=async name=>{await p.click('#payPill');await p.locator(`#payMenu [data-pay="${name}"]`).click()};
  await open(true);assert.equal(await vis(p,'#ipFeeRow'),false);
  await pickPay('instapay');assert.equal(await vis(p,'#ipFeeRow'),true);
  await p.fill('#amountInput','1000');await p.waitForTimeout(100);assert((await p.locator('#ipFeeTxt').textContent()).includes('1'),await p.locator('#ipFeeTxt').textContent());
  await pickPay('cash');assert.equal(await vis(p,'#ipFeeRow'),false);await pickPay('instapay');assert.equal(await vis(p,'#ipFeeRow'),true);
  await p.locator('#cats .cat').first().click();await p.click('#saveBtn');await p.waitForTimeout(300);
  const r=await p.evaluate(()=>testApp.S.expenses.map(x=>({a:x.amount,n:x.note,pay:x.pay})));
  assert.equal(r.length,2);assert(r.some(x=>x.a===1000)&&r.some(x=>x.n==='رسوم إنستاباي'&&x.a>0),JSON.stringify(r));
  await open(false);await pickPay('instapay');assert.equal(await vis(p,'#ipFeeRow'),false);
  await p.evaluate(()=>{const a=testApp;a.S.ipFee={on:true,pct:0.1,min:0.5,max:20};a.S.expenses=[{id:'old',amount:50,cat:'food',ts:Date.now()-36e5,pay:'instapay'}];a.save();a.openSheet('old')});await p.waitForTimeout(300);
  assert.equal(await vis(p,'#ipFeeRow'),false);
},'eg',390);
await run('The time is shown on the date pill and can be changed from its menu',async p=>{
  await p.evaluate(()=>{testApp.S.expenses=[];testApp.openSheet()});await p.waitForTimeout(300);
  assert(/\d{1,2}:\d{2}/.test(await p.locator('#datePill').textContent()),await p.locator('#datePill').textContent());
  await p.click('#datePill');assert.equal(await vis(p,'#dateTimeOpen'),true);await p.click('#dateTimeOpen');
  assert.equal(await p.evaluate(()=>document.querySelector('#expenseDatePopup').open),true);
  await p.evaluate(()=>{document.querySelector('#expenseTimeDraft').value='00:07'});await p.click('#expenseDateApply');
  const t=await p.locator('#datePill').textContent();assert(/(12|0):07/.test(t.replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d))),t);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1),true);
},'eg',390);
await run('The pills row still fits at 320px (Arabic and English)',async p=>{
  await p.evaluate(()=>{testApp.S.expenses=[];testApp.openSheet()});await p.waitForTimeout(300);
  assert.equal(await p.evaluate(()=>{const s=document.querySelector('#sheet');return s.scrollWidth<=s.clientWidth}),true);
  const r=await p.evaluate(()=>[...document.querySelectorAll('#kindPill,#datePill,#payPill')].map(e=>{const b=e.getBoundingClientRect();return [Math.round(b.left),Math.round(b.right)]}));
  assert(r.every(([l,rr])=>l>=0&&rr<=320),JSON.stringify(r));
},'en',320);
await run('The home card has «see details» that opens the details page',async p=>{
  await p.evaluate(()=>{const a=testApp;a.S.expenses=[{id:'a',amount:60,cat:'food',ts:Date.now()-36e5,pay:'cash'}];a.save();a.renderAll()});await p.waitForTimeout(300);
  assert.equal(await vis(p,'#heroGo'),true);await p.click('#heroGo');await p.waitForTimeout(500);
  assert.deepEqual(await p.evaluate(()=>({tab:document.querySelector('[data-tab=reports]').getAttribute('aria-current')==='page'||document.querySelector('#v-reports').classList.contains('active'),detail:!document.querySelector('#reportsDetail').hidden})),{tab:true,detail:true});
},'eg',390);
await run('«See details» sits on the same row as the forecast line, so the card is not taller',async p=>{
  await p.evaluate(()=>{const a=testApp,D=864e5,n=Date.now();a.S.budget=14000;a.S.budgetMode='fixed';a.S.expenses=[[85,1],[240,2],[1200,3],[60,4],[450,5],[150,6],[320,7]].map((x,i)=>({id:'h'+i,amount:x[0],cat:'food',ts:n-x[1]*D,pay:'cash'}));a.save();a.renderAll()});await p.waitForTimeout(400);
  const m=await p.evaluate(()=>{const g=document.querySelector('#heroGo').getBoundingClientRect(),f=document.querySelector('#hero .hero-foot .fc'),fr=f&&f.getBoundingClientRect(),h=document.querySelector('#hero').getBoundingClientRect().height;
    const st=document.createElement('style');st.textContent='.hero .hero-foot{display:block!important}.hero .hero-foot .fc{margin:8px 0 0!important}.hero .hero-foot .hero-go{margin-top:10px!important}';document.head.appendChild(st);const old=document.querySelector('#hero').getBoundingClientRect().height;st.remove();
    return {has:!!f,same:!!f&&Math.abs((g.top+g.height/2)-(fr.top+fr.height/2))<20,shorter:h<old-5,inside:g.left>=0&&g.right<=innerWidth}});
  assert.deepEqual(m,{has:true,same:true,shorter:true,inside:true});
},'eg',390);
}finally{await browser.close();fs.writeFileSync(path.join(__dirname,'quick-wins-results.json'),JSON.stringify(results,null,2));}
if(results.some(r=>!r.pass))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
