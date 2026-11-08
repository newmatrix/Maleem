/* npm install --no-save playwright; BROWSER_PATH may point to Chrome/Edge.
   All requests are fulfilled from the local source tree; no production services are contacted. */
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('node:assert/strict');
let playwright;try{playwright=require('playwright')}catch(e){playwright=require(process.env.PLAYWRIGHT_MODULE)}
const root=path.join(__dirname,'../app/src/main/assets/www');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/\r\n?/g,'\n');
for(const x of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new(require('vm').Script)(x[1]);
const i=html.lastIndexOf('})();');
html=html.slice(0,i)+`window.testApp={get S(){return S},openFixed,openDebtSheet,syncNative,cleanFixed,save,renderAll,openMv};
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


const seed=(p,{free,acc})=>p.evaluate(({free,acc})=>{const t=testApp;t.closeSheets&&0;t.S.accounts=acc?[{id:'bank',name:'Bank',type:'bank',cur:'EGP',open:5000},{id:'cash',name:'Cash',type:'cash',cur:'EGP',open:500}]:[];t.S.inflows=free?[{id:'tip',amount:300,ts:Date.now(),fund:'free'}]:[];t.renderAll()},{free,acc});
for(const lang of ['eg','ar','en'])for(const width of [320,390])await run('Home chips and pop-ups '+lang+' '+width,async p=>{
 await seed(p,{free:true,acc:true});
 const chips=await p.evaluate(()=>[...document.querySelectorAll('#homeChips .hchip')].map(c=>({vis:c.getClientRects().length>0,w:c.getBoundingClientRect().width,t:c.textContent})));
 assert.equal(chips.length,2);assert(chips.every(c=>c.vis&&c.w>0&&c.w<=width),JSON.stringify(chips));
 assert(/300/.test(chips[0].t)&&/5,500/.test(chips[1].t),JSON.stringify(chips));
 assert.equal(await p.evaluate(()=>!!document.querySelector('#v-expenses > #freeWallet, #v-expenses > #moneyBox, #v-expenses .mny')),false);
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1),true);
 await p.locator('#chipFree').click();
 assert.equal(await p.evaluate(()=>document.querySelector('#freeSheet').classList.contains('open')),true);
 assert(/300/.test(await p.locator('#freeWallet').textContent()));
 await p.evaluate(()=>document.querySelector('#scrim').click());
 assert.equal(await p.evaluate(()=>document.querySelector('#freeSheet').classList.contains('open')),false);
 await p.locator('#chipMoney').click();
 assert.equal(await p.evaluate(()=>document.querySelector('#moneySheet').classList.contains('open')),true);
 assert(/5,500/.test(await p.locator('#moneyBox').textContent()));
 await p.evaluate(()=>{testApp.S.budget=10000;testApp.S.budgetMode='fixed';testApp.renderAll()});
 await p.locator('#mvOpen').click();
 assert.deepEqual(await p.evaluate(()=>({mv:document.querySelector('#mvSheet').classList.contains('open'),money:document.querySelector('#moneySheet').classList.contains('open')})),{mv:true,money:false})
},lang,width);
await run('Chips hide when there is nothing to show',async p=>{
 await seed(p,{free:false,acc:true});
 assert.deepEqual(await p.evaluate(()=>({f:document.querySelector('#chipFree').hidden,m:document.querySelector('#chipMoney').hidden,row:document.querySelector('#homeChips').hidden})),{f:true,m:false,row:false});
 await seed(p,{free:true,acc:false});
 assert.deepEqual(await p.evaluate(()=>({f:document.querySelector('#chipFree').hidden,m:document.querySelector('#chipMoney').hidden,row:document.querySelector('#homeChips').hidden})),{f:false,m:true,row:false});
 await seed(p,{free:false,acc:false});
 assert.deepEqual(await p.evaluate(()=>({f:document.querySelector('#chipFree').hidden,m:document.querySelector('#chipMoney').hidden,row:document.querySelector('#homeChips').hidden})),{f:true,m:true,row:true})});
await run('English chip labels are translated',async p=>{await seed(p,{free:true,acc:true});const t=await p.locator('#homeChips').textContent();assert(/Free income/.test(t)&&/My money/.test(t)&&!/[\u0600-\u06ff]/.test(t.replace(/ج\.م/g,'')),t)},'en',390);
}finally{await browser.close();fs.writeFileSync(path.join(__dirname,'home-chips-results.json'),JSON.stringify(results,null,2));}
if(results.some(r=>!r.pass))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
