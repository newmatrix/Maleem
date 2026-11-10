/* npm install --no-save playwright; BROWSER_PATH may point to Chrome/Edge.
   All requests are fulfilled from the local source tree; no production services are contacted. */
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('node:assert/strict');
let playwright;try{playwright=require('playwright')}catch(e){playwright=require(process.env.PLAYWRIGHT_MODULE)}
const root=path.join(__dirname,'../app/src/main/assets/www');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/\r\n?/g,'\n');
for(const x of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new(require('vm').Script)(x[1]);
const i=html.lastIndexOf('})();');
html=html.slice(0,i)+`window.testApp={get S(){return S},save,renderAll,dueItems,go,meGo,backupData,applyBackup,syncNative,trashAll,trashRestore,deleteIPlan,curScaleAll,openInSheet};\n`+html.slice(i);
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
const addPlan=async(p,name,amount)=>{await p.evaluate(()=>{testApp.go('me');testApp.meGo('fixed')});await p.waitForTimeout(300);await p.click('#addIPlan');
  await p.fill('#formBody [data-k=name]',name);await p.fill('#formBody [data-k=amount]',amount);await p.click('#formSave');await p.waitForTimeout(200)};
await run('Add an upcoming income: validation, the list, and the saved record',async p=>{
  await p.evaluate(()=>{testApp.go('me');testApp.meGo('fixed')});await p.waitForTimeout(300);
  assert.equal(await p.locator('#ilList').textContent().then(t=>t.includes('مفيش دخل جاي')),true);
  await p.click('#addIPlan');await p.click('#formSave');assert((await p.locator('#formErr').textContent()).includes('اكتب اسم'));
  await p.fill('#formBody [data-k=name]','مرتب');await p.fill('#formBody [data-k=amount]','5,000');
  await p.evaluate(()=>{document.querySelector('#formBody [data-k=due]').value='2020-01-01'});await p.click('#formSave');assert((await p.locator('#formErr').textContent()).includes('من النهارده'));
  await p.evaluate(()=>{const d=new Date(Date.now()+864e5),pd=x=>String(x).padStart(2,'0');document.querySelector('#formBody [data-k=due]').value=d.getFullYear()+'-'+pd(d.getMonth()+1)+'-'+pd(d.getDate())});await p.click('#formSave');await p.waitForTimeout(200);
  const r=await p.evaluate(()=>testApp.S.iplans.map(x=>({n:x.name,a:x.amount})));assert.deepEqual(r,[{n:'مرتب',a:5000}]);
  const t=await p.locator('#ilList').textContent();assert(t.includes('مرتب')&&t.includes('استلمت'),t);assert((await p.locator('#ilTotal').textContent()).includes('5,000'));
},'eg',390);
await run('The home reminder shows it with «استلمت»; it opens the income sheet filled in and leaves the list once saved',async p=>{
  await addPlan(p,'مرتب','5000');await p.evaluate(()=>testApp.go('expenses'));await p.waitForTimeout(300);
  const up=await p.locator('#upcoming').textContent();assert(up.includes('هتستلم مرتب')&&up.includes('استلمت'),up);
  await p.click('#upcoming [data-ipin]');await p.waitForTimeout(300);
  assert.deepEqual(await p.evaluate(()=>({open:document.querySelector('#inSheet').classList.contains('open'),amt:document.querySelector('#inAmt').value,src:document.querySelector('#inSrc').value})),{open:true,amt:'5000',src:'مرتب'});
  await p.evaluate(()=>document.querySelector('#scrim').click());await p.waitForTimeout(300);assert.equal(await p.evaluate(()=>testApp.S.iplans.length),1,'cancel keeps it');
  await p.click('#upcoming [data-ipin]');await p.waitForTimeout(300);await p.click('#inSave');await p.waitForTimeout(300);
  assert.deepEqual(await p.evaluate(()=>({pl:testApp.S.iplans.length,inf:testApp.S.inflows.map(x=>x.amount)})),{pl:0,inf:[5000]});
  await p.evaluate(()=>testApp.openInSheet(null,{amount:7}));await p.click('#inSave');await p.waitForTimeout(200);
  assert.equal(await p.evaluate(()=>testApp.S.inflows.length),2);
},'eg',390);
await run('A reminder is scheduled for the day before and the day itself',async p=>{
  await p.evaluate(()=>{window.AndroidBridge.syncReminders=s=>{window.__rem=JSON.parse(s)};const d=new Date(Date.now()+3*864e5),pd=x=>String(x).padStart(2,'0');
    testApp.S.iplans=[{id:'i1',name:'عيدية',amount:300,due:d.getFullYear()+'-'+pd(d.getMonth()+1)+'-'+pd(d.getDate()),created:Date.now()}];testApp.save();testApp.syncNative()});
  const titles=await p.evaluate(()=>(window.__rem&&window.__rem.due||[]).map(x=>x.title));
  assert(titles.includes('بكرة هتستلم عيدية')&&titles.includes('النهارده هتستلم عيدية'),JSON.stringify(titles));
},'eg',390);
await run('Delete goes to the trash and comes back; backup, restore and currency change keep it',async p=>{
  const due=await p.evaluate(()=>{const d=new Date(Date.now()+2*864e5),pd=x=>String(x).padStart(2,'0');return d.getFullYear()+'-'+pd(d.getMonth()+1)+'-'+pd(d.getDate())});
  await p.evaluate(due=>{testApp.S.iplans=[{id:'i1',name:'مكافأة',amount:100,due,created:Date.now()}];testApp.save();testApp.renderAll()},due);
  await p.evaluate(()=>testApp.deleteIPlan('i1'));assert.equal(await p.evaluate(()=>testApp.S.iplans.length),0);
  const tid=await p.evaluate(()=>{const t=testApp.trashAll().find(x=>x.k==='ipl');return t&&t.id});assert(tid);
  assert.equal(await p.evaluate(id=>testApp.trashRestore(id),tid),true);assert.deepEqual(await p.evaluate(()=>testApp.S.iplans.map(x=>x.name)),['مكافأة']);
  const bk=await p.evaluate(()=>JSON.parse(JSON.stringify(testApp.backupData())));assert.equal(bk.iplans.length,1);
  await p.evaluate(()=>{testApp.S.iplans=[]});
  await p.evaluate(b=>{try{testApp.applyBackup(b,Date.now())}catch(e){}},bk);
  assert.deepEqual(await p.evaluate(()=>testApp.S.iplans.map(x=>({n:x.name,a:x.amount}))),[{n:'مكافأة',a:100}]);
  await p.evaluate(()=>testApp.curScaleAll(2,'EGP',false));assert.equal(await p.evaluate(()=>testApp.S.iplans[0].amount),200);
},'eg',390);
await run('Upcoming income texts are translated (English, 320px)',async p=>{
  await addPlan(p,'Salary','1000');
  const t=await p.evaluate(()=>document.querySelector('#v-me').textContent);assert(/Upcoming income/.test(t)&&/Received/.test(t)||/Upcoming income/.test(t),t.slice(0,200));
  await p.click('#addIPlan');const f=await p.locator('#formSheet').textContent();assert(!/[\u0600-\u06ff]/.test(f.replace(/ج\.م/g,'')),f);
},'en',320);

}finally{await browser.close();fs.writeFileSync(path.join(__dirname,'upcoming-income-results.json'),JSON.stringify(results,null,2));}
if(results.some(r=>!r.pass))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
