/* npm install --no-save playwright; BROWSER_PATH may point to Chrome/Edge.
   All requests are fulfilled from the local source tree; no production services are contacted. */
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('node:assert/strict');
let playwright;try{playwright=require('playwright')}catch(e){playwright=require(process.env.PLAYWRIGHT_MODULE)}
const root=path.join(__dirname,'../app/src/main/assets/www');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/\r\n?/g,'\n');
for(const x of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new(require('vm').Script)(x[1]);
const i=html.lastIndexOf('})();');
html=html.slice(0,i)+`window.testApp={get S(){return S},get UPD(){return UPD},get NUDGES(){return NUDGES},nudgeState,nudgeSave,nudgeDue,nudgeOffer,nudgeBoot,closeSheets,go,setGo,openSheet,updLocalSet};
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



const DAY=864e5;
/* make the app "ready": 12 days of use, 20 expenses */
const ready=(p,extra)=>p.evaluate(({extra,DAY})=>{const t=testApp,now=Date.now();t.S.expenses=Array.from({length:20},(_,i)=>({id:'e'+i,amount:10+i,cat:'other',note:'',ts:now-i*3600e3}));t.nudgeSave(Object.assign({first:now-12*DAY},extra||{}));t.closeSheets()},{extra,DAY});
const sheet=p=>p.evaluate(()=>({open:document.querySelector('#updSheet').classList.contains('open'),mode:document.querySelector('#updSheet').dataset.mode,title:document.querySelector('#updTitle').textContent,notes:document.querySelector('#updNotes').textContent,go:document.querySelector('#updGo').textContent,goVis:!document.querySelector('#updGo').hidden,later:document.querySelector('#updLater').textContent,never:!document.querySelector('#updNever').hidden}));

await run('Rules: 10 days, 15 expenses, 3 times, off, next date',async p=>{
 const r=await p.evaluate(({DAY})=>{const t=testApp,n=Date.now(),d=(f,e)=>t.nudgeDue(n,f,e);return [
  d({first:n-9*DAY},20),d({first:n-11*DAY},14),d({first:n-11*DAY},15),d({first:n-11*DAY,off:true},20),d({first:n-11*DAY,shown:3},20),d({first:n-11*DAY,shown:2},20),d({first:n-11*DAY,next:n+DAY},20),d({first:n-11*DAY,next:n-1},20),d({},50)]},{DAY});
 assert.deepEqual(r,[false,false,true,false,false,true,false,true,false])});

for(const lang of ['eg','ar','en'])for(const width of [320,390])await run('Reminder sheet content and state '+lang+' '+width,async p=>{
 await ready(p);
 await p.evaluate(()=>{Math.random=()=>0;testApp.nudgeOffer(0)});
 const s=await sheet(p);
 assert(s.open&&s.mode==='nudge'&&s.goVis&&s.never,JSON.stringify(s));
 if(lang==='en'){assert(!/[\u0600-\u06ff]/.test(s.title+s.notes+s.go+s.later),JSON.stringify(s));assert(/Support/i.test(s.go),s.go)}
 assert(await p.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1));
 await p.waitForTimeout(500);
 const box=await p.locator('#updSheet').boundingBox();assert(box.x>=-1&&box.x+box.width<=width+1,JSON.stringify(box));
 const st=await p.evaluate(()=>testApp.nudgeState());
 assert.equal(st.shown,1);assert.equal(st.lastIdx,0);
 const gap=(st.next-st.last)/DAY;assert(gap>=14-0.01&&gap<=14.01,String(gap))},lang,width);

await run('Next gap stays between 14 and 30 days',async p=>{
 for(const r of [0,0.5,0.9999]){await ready(p);await p.evaluate(r=>{Math.random=()=>r;testApp.nudgeOffer(0)},r);
  const g=await p.evaluate(()=>{const s=testApp.nudgeState();return (s.next-s.last)/864e5});assert(g>=14-0.01&&g<=30.01,String(g))}});

await run('Different message than last time',async p=>{
 await ready(p,{lastIdx:0,shown:1,next:0});await p.evaluate(()=>{Math.random=()=>0;testApp.nudgeOffer(0)});
 assert.equal((await p.evaluate(()=>testApp.nudgeState())).lastIdx,1)});

await run('Not shown while another sheet is open, or an update or developer message is waiting',async p=>{
 await ready(p);
 await p.evaluate(()=>{testApp.openSheet();testApp.nudgeOffer(0)});
 assert.equal((await sheet(p)).mode==='nudge',false);assert.equal((await p.evaluate(()=>testApp.nudgeState())).shown,undefined);
 await ready(p);
 await p.evaluate(()=>{testApp.UPD.st={enabled:true,cur:1,info:{latest:{code:99,apk:'https://github.com/x/y.apk',name:'9'}}};testApp.nudgeOffer(0)});
 assert.equal((await p.evaluate(()=>testApp.nudgeState())).shown,undefined);
 await ready(p);
 await p.evaluate(()=>{testApp.UPD.st={enabled:true,cur:99,info:{message:{id:'m1',text:'hello'}}};testApp.nudgeOffer(0)});
 assert.equal((await p.evaluate(()=>testApp.nudgeState())).shown,undefined);
 await p.evaluate(()=>{testApp.updLocalSet('seen','m1');testApp.nudgeOffer(0)});
 assert.equal((await sheet(p)).mode,'nudge')});

await run('Not shown with fewer than 15 expenses or before 10 days',async p=>{
 await ready(p);await p.evaluate(()=>{testApp.S.expenses=testApp.S.expenses.slice(0,14);testApp.nudgeOffer(0)});assert.equal((await sheet(p)).mode==='nudge',false);
 await ready(p,{first:Date.now()-5*DAY});await p.evaluate(()=>testApp.nudgeOffer(0));assert.equal((await sheet(p)).mode==='nudge',false)});

await run('Stops after three times',async p=>{
 await ready(p,{shown:3});await p.evaluate(()=>testApp.nudgeOffer(0));assert.equal((await sheet(p)).mode==='nudge',false)});

await run('Do not show again turns it off for good and hides the link',async p=>{
 await ready(p);await p.evaluate(()=>testApp.nudgeOffer(0));
 await p.locator('#updNever').click();
 assert.equal((await p.evaluate(()=>testApp.nudgeState())).off,true);assert.equal((await sheet(p)).open,false);
 assert.equal(await p.evaluate(()=>document.querySelector('#updNever').hidden),true);
 await p.evaluate(()=>{testApp.nudgeSave(Object.assign(testApp.nudgeState(),{next:0}));testApp.nudgeOffer(0)});assert.equal((await sheet(p)).open,false)});

await run('Not now closes it and keeps counting',async p=>{
 await ready(p);await p.evaluate(()=>testApp.nudgeOffer(0));await p.locator('#updLater').click();
 assert.equal((await sheet(p)).open,false);const st=await p.evaluate(()=>testApp.nudgeState());assert.equal(st.shown,1);assert(!st.off)});

await run('Support button opens the support card in settings',async p=>{
 await ready(p);await p.evaluate(()=>{Math.random=()=>0;testApp.nudgeOffer(0)});await p.locator('#updGo').click();await p.waitForTimeout(1000);
 const r=await p.evaluate(()=>{const c=document.querySelector('#supportCard'),b=c.getBoundingClientRect();return {sheet:document.querySelector('#updSheet').classList.contains('open'),hidden:c.hidden,vis:b.top>=0&&b.bottom<=innerHeight,top:b.top,bottom:b.bottom,h:innerHeight}});
 assert.equal(r.sheet,false);assert(!r.hidden&&r.vis,JSON.stringify(r))});

await run('Feedback button opens the feedback page',async p=>{
 await ready(p);await p.evaluate(()=>{Math.random=()=>0.99;testApp.nudgeOffer(0)});await p.locator('#updGo').click();await p.waitForTimeout(500);
 assert.equal(await p.evaluate(()=>document.querySelector('[data-page="feedback"]').hidden),false)});

await run('First launch stamp is kept',async p=>{
 await p.evaluate(()=>{localStorage.removeItem('maleem.nudge');testApp.nudgeBoot()});
 const a=await p.evaluate(()=>testApp.nudgeState().first);assert(a>0);
 await p.waitForTimeout(30);await p.evaluate(()=>testApp.nudgeBoot());
 assert.equal(await p.evaluate(()=>testApp.nudgeState().first),a)});

await run('The reminder state is not inside the app data',async p=>{
 await ready(p);const keys=await p.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('maleem.v1'))).join(','));assert(!/nudge/i.test(keys))});

}finally{await browser.close();fs.writeFileSync(path.join(__dirname,'nudge-results.json'),JSON.stringify(results,null,2));}
if(results.some(r=>!r.pass))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
