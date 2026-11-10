/* npm install --no-save playwright; BROWSER_PATH may point to Chrome/Edge.
   All requests are fulfilled from the local source tree; no production services are contacted. */
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('node:assert/strict');
let playwright;try{playwright=require('playwright')}catch(e){playwright=require(process.env.PLAYWRIGHT_MODULE)}
const root=path.join(__dirname,'../app/src/main/assets/www');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/\r\n?/g,'\n');
for(const x of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new(require('vm').Script)(x[1]);
const i=html.lastIndexOf('})();');
html=html.slice(0,i)+`window.testApp={get S(){return S},save,openRestore,backupData,applyBackup,bkMake,bkOpen,bkParse,bkeOn,bkeCfg,openBkEnc,closeSheets,sum,toB64};\n`+html.slice(i);
const hashes=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>`'sha256-${crypto.createHash('sha256').update(x[1]).digest('base64')}'`).join(' ');
const csp=`default-src 'self'; script-src 'self' ${hashes}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://*.googleapis.com; frame-src 'self' blob: data:; object-src 'none'; base-uri 'none'; form-action 'none'`;
const results=[];
(async()=>{const browser=await playwright.chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{})});
async function run(name,fn,lang='eg',width=360){const page=await browser.newPage({viewport:{width,height:800},locale:'ar-EG',timezoneId:'Africa/Cairo'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.pathname==='/')return r.fulfill({contentType:'text/html',headers:{'Content-Security-Policy':csp},body:html});try{return r.fulfill({body:fs.readFileSync(path.join(root,u.pathname)),contentType:u.pathname.endsWith('.js')?'application/javascript':u.pathname.endsWith('.css')?'text/css':'application/octet-stream'});}catch{return r.abort();}});
await page.addInitScript(lang=>{window.__queue=[];window.AndroidBridge={takeCaptures:()=>JSON.stringify(window.__queue.splice(0)),captureState:()=>'{"on":false}',updateState:()=>'{"enabled":false}',ratesState:()=>'{}',syncWidget:()=>{},syncReminders:()=>{},captureIncoming:()=>{},setBars:()=>{},setSecure:()=>{},haptic:()=>{}};
if(!localStorage.getItem('maleem.v1'))localStorage.setItem('maleem.v1',JSON.stringify({onboarded:true,lang,profile:{name:'ظ‡ط´ط§ظ…'},currency:'EGP',budget:12000,budgetMode:'fixed',expenses:[]}));sessionStorage.setItem('maleem.splashed','1')},lang);
try{await page.goto('https://maleem.test/');await page.waitForFunction(()=>!!window.testApp);await fn(page);assert.deepEqual(errors,[]);results.push({name,pass:true});console.log('PASS',name)}catch(e){results.push({name,pass:false,error:e.stack});console.error('FAIL',name,e.message)}finally{await page.close()}}
try{

const dec=b64=>Buffer.from(b64,'base64').toString('utf8');
const setup=p=>p.evaluate(()=>{const a=testApp;a.S.expenses=[{id:'x1',amount:123.45,cat:'food',note:'ملاحظة-سرية-فريدة',ts:Date.now()-36e5,pay:'cash'}];a.save()});
const turnOn=async(p,pw)=>{await p.evaluate(()=>testApp.openBkEnc());await p.fill('#bkEncP1',pw);await p.fill('#bkEncP2',pw);await p.click('#bkEncGo');await p.waitForFunction(()=>testApp.bkeOn())};
await run('Off by default: a plain backup, and a plain file still opens',async p=>{
  await setup(p);
  const r=await p.evaluate(async()=>{const a=testApp,f=await a.bkMake(Date.now());const t=atob(f.b64);const o=JSON.parse(decodeURIComponent(escape(t)));const b=await a.bkOpen(JSON.stringify(o));return {on:a.bkeOn(),enc:!!o.enc,hasData:Array.isArray(o.data.expenses),open:!!(b&&b.p&&b.p.expenses.length===1)}});
  assert.deepEqual(r,{on:false,enc:false,hasData:true,open:true});
  assert((await p.locator('#bkEncSub').textContent()).includes('مقفول'));
},'eg',390);
await run('Turning it on: short or different passwords are refused, a good one works and is not stored',async p=>{
  await p.evaluate(()=>testApp.openBkEnc());
  await p.fill('#bkEncP1',' 123');await p.fill('#bkEncP2','123');await p.click('#bkEncGo');
  assert((await p.locator('#bkEncErr').textContent()).includes('6'));assert.equal(await p.evaluate(()=>testApp.bkeOn()),false);
  await p.fill('#bkEncP1','correct-horse');await p.fill('#bkEncP2','correct-horse-x');await p.click('#bkEncGo');
  assert((await p.locator('#bkEncErr').textContent()).includes('مش زي بعض'));assert.equal(await p.evaluate(()=>testApp.bkeOn()),false);
  await p.fill('#bkEncP2','correct-horse');await p.click('#bkEncGo');await p.waitForFunction(()=>testApp.bkeOn());
  const st=await p.evaluate(()=>({cfg:localStorage.getItem('maleem.bkenc'),app:localStorage.getItem('maleem.v1'),chip:document.querySelector('#bkEncChip').textContent}));
  assert(!st.cfg.includes('correct-horse')&&!st.app.includes('correct-horse'),'the password must not be stored');assert.equal(st.chip,'شغّال');
  assert.equal(await p.evaluate(()=>document.querySelector('#bkEncSheet').classList.contains('open')),false);
},'eg',390);
await run('An encrypted backup hides everything and opens again on this phone without asking',async p=>{
  await setup(p);await turnOn(p,'correct-horse');
  const r=await p.evaluate(async()=>{const a=testApp,f=await a.bkMake(Date.now());return {b64:f.b64}});
  const text=dec(r.b64),o=JSON.parse(text);
  assert.equal(o.enc,1);assert(!text.includes('ملاحظة')&&!text.includes('123.45')&&!text.includes('expenses')&&!text.includes('amount'),'plain data leaked');
  assert(o.salt&&o.iv&&o.ct&&o.iter>=100000&&o.at>0);
  const b=await p.evaluate(async t=>{const x=await testApp.bkOpen(t);return x&&x.p?{n:x.p.expenses.length,note:x.p.expenses[0].note,amount:x.p.expenses[0].amount,prompt:document.querySelector('#bkPassSheet').classList.contains('open')}:x},text);
  assert.deepEqual(b,{n:1,note:'ملاحظة-سرية-فريدة',amount:123.45,prompt:false});
  const o2=JSON.parse(dec((await p.evaluate(async()=>(await testApp.bkMake(Date.now())).b64))));assert.notEqual(o2.iv,o.iv,'every backup needs its own IV');
},'eg',390);
await run('On a new phone: it asks for the password, a wrong one is refused, the right one opens and keeps protection on',async p=>{
  await setup(p);await turnOn(p,'correct-horse');
  const text=dec(await p.evaluate(async()=>(await testApp.bkMake(Date.now())).b64));
  await p.evaluate(()=>{localStorage.setItem('maleem.bkenc','')});assert.equal(await p.evaluate(()=>testApp.bkeOn()),false);
  await p.evaluate(t=>{window.__r=testApp.bkOpen(t).then(x=>{window.__res=x})},text);
  await p.waitForFunction(()=>document.querySelector('#bkPassSheet').classList.contains('open'));
  await p.fill('#bkPassIn','wrong-password');await p.click('#bkPassGo');
  await p.waitForFunction(()=>document.querySelector('#bkPassErr').textContent.includes('غلط'));
  assert.equal(await p.evaluate(()=>!window.__res),true);assert.equal(await p.evaluate(()=>document.querySelector('#bkPassSheet').classList.contains('open')),true);
  await p.fill('#bkPassIn','correct-horse');await p.click('#bkPassGo');
  await p.waitForFunction(()=>window.__res&&window.__res.p);
  const r=await p.evaluate(()=>({n:window.__res.p.expenses.length,on:testApp.bkeOn(),open:document.querySelector('#bkPassSheet').classList.contains('open')}));
  assert.deepEqual(r,{n:1,on:true,open:false});
},'eg',390);
await run('Cancelling, a tampered file and a changed time all fail safely',async p=>{
  await setup(p);await turnOn(p,'correct-horse');
  const text=dec(await p.evaluate(async()=>(await testApp.bkMake(Date.now())).b64)),o=JSON.parse(text);
  for(const [name,bad] of [['cancel',text],['tampered ct',JSON.stringify({...o,ct:(o.ct[5]==='A'?'B':'A').padStart(1)+o.ct.slice(1,5)+(o.ct[5]==='A'?'B':'A')+o.ct.slice(6)})],['changed time',JSON.stringify({...o,at:o.at+1})]]){
    await p.evaluate(()=>{localStorage.setItem('maleem.bkenc','')});
    await p.evaluate(t=>{window.__res=undefined;testApp.bkOpen(t).then(x=>{window.__res=x||'null'})},bad);
    await p.waitForFunction(()=>document.querySelector('#bkPassSheet').classList.contains('open'));
    if(name!=='cancel'){await p.fill('#bkPassIn','correct-horse');await p.click('#bkPassGo');await p.waitForFunction(()=>document.querySelector('#bkPassErr').textContent.includes('غلط'),null,{timeout:8000})}
    await p.click('#bkPassCancel');await p.waitForFunction(()=>window.__res!==undefined);
    assert.deepEqual(await p.evaluate(()=>({cancel:!!window.__res.cancel,on:testApp.bkeOn(),open:document.querySelector('#bkPassSheet').classList.contains('open')})),{cancel:true,on:false,open:false},name);
  }
  await p.evaluate(()=>{window.__r2=undefined;testApp.bkOpen('{"nope":1}').then(x=>{window.__r2=x})});await p.waitForFunction(()=>window.__r2!==undefined);
  assert.equal(await p.evaluate(()=>window.__r2),null);
},'eg',390);
await run('Turning it off needs a second tap; plain backups follow; with no WebCrypto it refuses instead of writing plain',async p=>{
  await setup(p);await turnOn(p,'correct-horse');
  await p.evaluate(()=>testApp.openBkEnc());assert.equal(await p.locator('#bkEncOff').isVisible(),true);
  await p.click('#bkEncOff');assert.equal(await p.evaluate(()=>testApp.bkeOn()),true);
  await p.click('#bkEncOff');await p.waitForFunction(()=>!testApp.bkeOn());
  assert.equal(JSON.parse(dec(await p.evaluate(async()=>(await testApp.bkMake(Date.now())).b64))).enc,undefined);
  await turnOn(p,'correct-horse');
  const r=await p.evaluate(async()=>{Object.defineProperty(window.crypto,'subtle',{value:undefined,configurable:true});try{await testApp.bkMake(Date.now());return 'wrote'}catch(e){return e.message}});
  assert.equal(r,'enc');
},'eg',390);
const driveSetup=(p,text)=>p.evaluate(t=>{const a=testApp;a.S.expenses=[{id:'before',amount:20,cat:'other',ts:Date.now()}];
  window.AndroidBridge.driveList=id=>window.__driveRes(id,JSON.stringify({ok:true,email:'t@example.com',files:[{id:'f1',name:'Maleem-A-auto-2026-11-05.json',at:3000}]}));
  window.AndroidBridge.driveFetch=id=>window.__driveRes(id,JSON.stringify({ok:true}));window.AndroidBridge.driveTake=()=>t;
  localStorage.setItem('maleem.bkenc','');a.openRestore();document.querySelector('#rsDrive').click()},text);
await run('Drive restore of an encrypted backup: the password is asked, a wrong one is refused, the right one restores',async p=>{
  await setup(p);await turnOn(p,'correct-horse');
  const text=dec(await p.evaluate(async()=>(await testApp.bkMake(Date.now())).b64));
  await driveSetup(p,text);
  await p.waitForFunction(()=>document.querySelector('#bkPassSheet').classList.contains('open'));
  assert.equal(await p.evaluate(()=>document.querySelector('#rsSheet').classList.contains('open')),true);
  assert.equal(await p.evaluate(()=>testApp.S.expenses[0].id),'before');
  await p.fill('#bkPassIn','nope-nope');await p.click('#bkPassGo');await p.waitForFunction(()=>document.querySelector('#bkPassErr').textContent.includes('غلط'));
  assert.equal(await p.evaluate(()=>testApp.S.expenses[0].id),'before');
  await p.fill('#bkPassIn','correct-horse');await p.click('#bkPassGo');
  await p.waitForFunction(()=>testApp.S.expenses[0].id==='x1',null,{timeout:8000});
  assert.equal(await p.evaluate(()=>testApp.bkeOn()),true);
},'eg',390);
await run('Drive restore of an encrypted backup, cancelled: nothing is replaced and the sheet says why',async p=>{
  await setup(p);await turnOn(p,'correct-horse');
  const text=dec(await p.evaluate(async()=>(await testApp.bkMake(Date.now())).b64));
  await driveSetup(p,text);
  await p.waitForFunction(()=>document.querySelector('#bkPassSheet').classList.contains('open'));
  await p.click('#bkPassCancel');
  await p.waitForFunction(()=>document.querySelector('#rsErr').textContent.includes('مشفّرة'),null,{timeout:5000});
  assert.deepEqual(await p.evaluate(()=>({id:testApp.S.expenses[0].id,pass:document.querySelector('#bkPassSheet').classList.contains('open'),on:testApp.bkeOn()})),{id:'before',pass:false,on:false});
},'eg',390);
await run('Backup encryption texts are translated (English, 320px)',async p=>{
  await p.evaluate(()=>testApp.openBkEnc());
  const t=await p.locator('#bkEncSheet').textContent();assert(/Backup encryption/.test(t)&&!/[\u0600-\u06ff]/.test(t),t);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1),true);
},'en',320);

}finally{await browser.close();fs.writeFileSync(path.join(__dirname,'backup-encrypt-results.json'),JSON.stringify(results,null,2));}
if(results.some(r=>!r.pass))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
