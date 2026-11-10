/* npm install --no-save playwright; BROWSER_PATH may point to Chrome/Edge.
   All requests are fulfilled from the local source tree; no production services are contacted. */
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('node:assert/strict');
let playwright;try{playwright=require('playwright')}catch(e){playwright=require(process.env.PLAYWRIGHT_MODULE)}
const root=path.join(__dirname,'../app/src/main/assets/www');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/\r\n?/g,'\n');
for(const x of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new(require('vm').Script)(x[1]);
const i=html.lastIndexOf('})();');
html=html.slice(0,i)+`window.testApp={get S(){return S},save,renderAll,openInstSheet,addMonthDK,todayKey};\n`+html.slice(i);
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

const make=async(p,{total,months,every,first,name='عقار'})=>{
  await p.evaluate(()=>{testApp.S.insts=[];testApp.openInstSheet()});await p.waitForTimeout(250);
  await p.fill('#instName',name);await p.fill('#instTotal',String(total));await p.selectOption('#instMonths',String(months));if(every)await p.selectOption('#instEvery',String(every));
  await p.evaluate(f=>{document.querySelector('#instFirst').value=f},first);await p.waitForTimeout(100)};
await run('Installments paid every month, every 3, 6 or 12 months: count, amounts and dates',async p=>{
  const first='2027-01-31';
  await make(p,{total:1200,months:12,first});assert.equal(await p.inputValue('#instMonthly'),'100');assert((await p.locator('#instMonthlyLab').textContent()).includes('الشهري'));
  await p.click('#instSave');await p.waitForTimeout(200);
  let it=await p.evaluate(()=>testApp.S.insts[0].items.map(x=>[x.amount,x.due]));assert.equal(it.length,12);assert.deepEqual(it[0],[100,'2027-01-31']);assert.equal(it[1][1],'2027-02-28');
  await make(p,{total:1200,months:12,every:3,first});assert.equal(await p.inputValue('#instMonthly'),'300');assert((await p.locator('#instMonthlyLab').textContent()).includes('قيمة القسط'));
  await p.click('#instSave');await p.waitForTimeout(200);
  it=await p.evaluate(()=>testApp.S.insts.slice(-1)[0].items.map(x=>[x.amount,x.due]));assert.deepEqual(it,[[300,'2027-01-31'],[300,'2027-04-30'],[300,'2027-07-31'],[300,'2027-10-31']]);
  await make(p,{total:900,months:36,every:12,first:'2027-03-15'});assert.equal(await p.inputValue('#instMonthly'),'300');
  await p.click('#instSave');await p.waitForTimeout(200);
  it=await p.evaluate(()=>testApp.S.insts.slice(-1)[0].items.map(x=>[x.amount,x.due]));assert.deepEqual(it,[[300,'2027-03-15'],[300,'2028-03-15'],[300,'2029-03-15']]);
  await make(p,{total:1000,months:6,every:6,first:'2027-05-01'});await p.click('#instSave');await p.waitForTimeout(200);
  assert.deepEqual(await p.evaluate(()=>testApp.S.insts.slice(-1)[0].items.map(x=>x.amount)),[1000]);
  await make(p,{total:700,months:18,every:6,first:'2027-05-01'});assert.equal(await p.inputValue('#instMonthly'),'233.33');
  await p.click('#instSave');await p.waitForTimeout(200);
  assert.deepEqual(await p.evaluate(()=>testApp.S.insts.slice(-1)[0].items.map(x=>x.amount)),[233.33,233.33,233.34]);
},'eg',390);
await run('A payment too big for the plan is refused, with the right wording',async p=>{
  await make(p,{total:1000,months:12,every:3,first:'2027-01-01'});await p.fill('#instMonthly','600');await p.click('#instSave');
  assert((await p.locator('#instErr').textContent()).includes('عدد الأقساط'));
  await p.selectOption('#instEvery','1');await p.fill('#instMonthly','600');await p.click('#instSave');assert((await p.locator('#instErr').textContent()).includes('عدد الشهور'));
},'eg',390);
await run('Installment frequency texts are translated and fit (English, 320px)',async p=>{
  await p.evaluate(()=>testApp.openInstSheet());await p.waitForTimeout(300);await p.selectOption('#instEvery','3');
  const t=await p.locator('#instSheet').evaluate(e=>[...e.querySelectorAll('option:checked,.txt,h2')].map(x=>x.textContent).join(' | '));
  assert(/Payment frequency/.test(t)&&/Every 3 months \(quarterly\)/.test(t)&&/Installment amount/.test(t)||/Every 3 months/.test(t),t);
  assert.equal(await p.evaluate(()=>{const s=document.querySelector('#instSheet');return s.scrollWidth<=s.clientWidth}),true);
},'en',320);

}finally{await browser.close();fs.writeFileSync(path.join(__dirname,'installment-every-results.json'),JSON.stringify(results,null,2));}
if(results.some(r=>!r.pass))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
