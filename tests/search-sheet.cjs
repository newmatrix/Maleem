/* npm install --no-save playwright; BROWSER_PATH may point to Chrome/Edge.
   All requests are fulfilled from the local source tree; no production services are contacted. */
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('node:assert/strict');
let playwright;try{playwright=require('playwright')}catch(e){playwright=require(process.env.PLAYWRIGHT_MODULE)}
const root=path.join(__dirname,'../app/src/main/assets/www');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/\r\n?/g,'\n');
for(const x of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new(require('vm').Script)(x[1]);
const i=html.lastIndexOf('})();');
html=html.slice(0,i)+`window.testApp={get S(){return S},save,renderAll,openSearch,sfGet};\n`+html.slice(i);
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

const seed=p=>p.evaluate(()=>{const a=testApp,D=864e5,n=Date.now(),mk=(id,amount,cat,note,days)=>({id,amount,cat,note,ts:n-days*D-36e5,pay:'cash'});
  a.S.expenses=[mk('e0',60,'cafe','قهوة',0),mk('e1',85,'food','غدا',0),mk('e2',240,'fuel','بنزين',5),mk('e3',1200,'bills','فاتورة كهرباء',20),mk('e4',320,'health','دوا',60)];a.save();a.renderAll()});
const count=p=>p.locator('#searchRes .xp').count();
const open=async p=>{await seed(p);await p.click('#homeSearchBtn');await p.waitForFunction(()=>document.querySelector('#searchSheet').classList.contains('open'))};
const find=async(p,q)=>{await p.fill('#searchIn',q);await p.waitForTimeout(330);return count(p)};
await run('The home search icon opens a sheet; note, category, amount (also Arabic digits) and date text all find it',async p=>{
  await open(p);await p.waitForTimeout(450);
  assert.equal(await p.evaluate(()=>document.activeElement&&document.activeElement.id),'searchIn');
  assert.equal(await find(p,'قهوة'),1);assert.equal(await find(p,'كافيهات'),1);assert.equal(await find(p,'240'),1);assert.equal(await find(p,'١٢٠٠'),1);
  const d=await p.evaluate(()=>{const t=new Date(Date.now()-5*864e5-36e5),pd=x=>String(x).padStart(2,'0');return {dm:pd(t.getDate())+'/'+pd(t.getMonth()+1),ar:(pd(t.getDate())+'/'+pd(t.getMonth()+1)).replace(/\d/g,c=>'٠١٢٣٤٥٦٧٨٩'[c]),month:new Date().toLocaleDateString('ar-EG',{month:'long'})}});
  assert.equal(await find(p,d.dm),1);assert.equal(await find(p,d.ar),1);assert((await find(p,d.month))>=2);
  assert.equal(await find(p,'مفيش-حاجة-كده'),0);
},'eg',390);
await run('Quick chips: today, last 7 days, this month and biggest; tap again to undo; clear resets them',async p=>{
  await open(p);const chip=k=>p.locator(`#sqChips [data-sq="${k}"]`),pressed=k=>chip(k).getAttribute('aria-pressed');
  assert.equal(await count(p),5);
  await chip('today').click();assert.equal(await count(p),2);assert.equal(await pressed('today'),'true');
  await chip('today').click();assert.equal(await count(p),5);assert.equal(await pressed('today'),'false');
  await chip('week').click();assert.equal(await count(p),3);assert.equal(await pressed('week'),'true');assert.equal(await pressed('today'),'false');
  await p.click('#sfClear');assert.equal(await count(p),5);assert.equal(await pressed('week'),'false');
  await chip('month').click();const want=await p.evaluate(()=>{const f=new Date(new Date().getFullYear(),new Date().getMonth(),1).getTime();return testApp.S.expenses.filter(x=>x.ts>=f).length});
  assert.equal(await count(p),want);await chip('month').click();
  await chip('big').click();assert.deepEqual(await p.locator('#searchRes .xp').evaluateAll(xs=>xs.map(x=>x.dataset.id)),['e3','e4','e2','e1','e0']);assert.equal(await pressed('big'),'true');
  await chip('big').click();assert.equal(await pressed('big'),'false');assert.equal(await p.evaluate(()=>document.querySelector('#sfSort').value),'time-desc');
},'eg',390);
await run('After editing or cancelling a result the search comes back with the same words; a normal edit does not open it',async p=>{
  await open(p);await find(p,'قهوة');
  await p.locator('#searchRes .xp').first().click();
  await p.waitForFunction(()=>document.querySelector('#sheet').classList.contains('open'));
  assert.equal(await p.evaluate(()=>document.querySelector('#searchSheet').classList.contains('open')),false);
  await p.click('#cancelBtn');
  await p.waitForFunction(()=>document.querySelector('#searchSheet').classList.contains('open'),null,{timeout:4000});
  assert.equal(await p.inputValue('#searchIn'),'قهوة');assert.equal(await count(p),1);
  await p.locator('#searchRes .xp').first().click();await p.waitForFunction(()=>document.querySelector('#sheet').classList.contains('open'));
  await p.evaluate(()=>document.querySelector('#scrim').click());
  await p.waitForFunction(()=>document.querySelector('#searchSheet').classList.contains('open'),null,{timeout:4000});
  await p.evaluate(()=>document.querySelector('#scrim').click());await p.waitForFunction(()=>!document.querySelector('#searchSheet').classList.contains('open'));await p.waitForTimeout(600);
  assert.equal(await p.evaluate(()=>document.querySelector('#searchSheet').classList.contains('open')),false);
  await p.locator('#todayList .xp').first().click();await p.waitForFunction(()=>document.querySelector('#sheet').classList.contains('open'));
  await p.click('#cancelBtn');await p.waitForTimeout(700);
  assert.equal(await p.evaluate(()=>document.querySelector('#searchSheet').classList.contains('open')),false);
},'eg',390);
await run('Search sheet in English at 320px: translated, no sideways scroll',async p=>{
  await open(p);await p.click('#sfBtn');
  const t=await p.evaluate(()=>{const c=document.querySelector('#searchSheet').cloneNode(true);c.querySelector('#searchRes').remove();return c.textContent});assert(/Last 7 days/.test(t)&&/Biggest/.test(t)&&!/[\u0600-\u06ff]/.test(t.replace(/ج\.م/g,'')),t.slice(0,300));
  assert.equal(await p.evaluate(()=>{const s=document.querySelector('#searchSheet');return s.scrollWidth<=s.clientWidth&&document.documentElement.scrollWidth<=document.documentElement.clientWidth+1}),true);
},'en',320);

}finally{await browser.close();fs.writeFileSync(path.join(__dirname,'search-sheet-results.json'),JSON.stringify(results,null,2));}
if(results.some(r=>!r.pass))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
