/* npm install --no-save playwright; BROWSER_PATH may point to Chrome/Edge.
   All requests are fulfilled from the local source tree; no production services are contacted. */
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('node:assert/strict');
let playwright;try{playwright=require('playwright')}catch(e){playwright=require(process.env.PLAYWRIGHT_MODULE)}
const root=path.join(__dirname,'../app/src/main/assets/www');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/\r\n?/g,'\n');
for(const x of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new(require('vm').Script)(x[1]);
const i=html.lastIndexOf('})();');
html=html.slice(0,i)+`window.testApp={get S(){return S},get RC(){return RC},save,go,setGo,closeSheets,errLog,errLogRead,errReport,errClear,errPaint,fbBody,fbPaint,backupData,resetBurst:()=>{errBurst={t:0,n:0}}};
`+html.slice(i);
const hashes=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>`'sha256-${crypto.createHash('sha256').update(x[1]).digest('base64')}'`).join(' ');
const csp=`default-src 'self'; script-src 'self' ${hashes}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://*.googleapis.com; frame-src 'self' blob: data:; object-src 'none'; base-uri 'none'; form-action 'none'`;
const results=[];
(async()=>{const browser=await playwright.chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{})});
async function run(name,fn,lang='eg',width=360){const page=await browser.newPage({viewport:{width,height:800},locale:'ar-EG',timezoneId:'Africa/Cairo'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.pathname==='/')return r.fulfill({contentType:'text/html',headers:{'Content-Security-Policy':csp},body:html});try{return r.fulfill({body:fs.readFileSync(path.join(root,u.pathname)),contentType:u.pathname.endsWith('.js')?'application/javascript':u.pathname.endsWith('.css')?'text/css':'application/octet-stream'});}catch{return r.abort();}});
await page.addInitScript(lang=>{window.AndroidBridge={takeCaptures:()=>'[]',captureState:()=>'{"on":false}',updateState:()=>'{"enabled":false}',ratesState:()=>'{}',syncWidget:()=>{},syncReminders:()=>{},captureIncoming:()=>{},setBars:()=>{},setSecure:()=>{},haptic:()=>{},feedbackSend:(n,e,k,t)=>{window.__fb=[n,e,k,t]}};
if(!localStorage.getItem('maleem.v1'))localStorage.setItem('maleem.v1',JSON.stringify({onboarded:true,lang,profile:{name:'Hesham'},currency:'EGP',budget:12000,budgetMode:'fixed',expenses:[]}));sessionStorage.setItem('maleem.splashed','1')},lang);
try{await page.goto('http://maleem.test/');await page.waitForFunction(()=>!!window.testApp);await fn(page,errors);assert.deepEqual(errors.filter(e=>!/\bboom\b|rej 99999/.test(e)),[]);results.push({name,pass:true});console.log('PASS',name)}catch(e){results.push({name,pass:false,error:e.stack});console.error('FAIL',name,e.message)}finally{await page.close()}}
try{

const log=p=>p.evaluate(()=>testApp.errLogRead());

await run('An uncaught error is logged, cleaned: no long numbers, no long quoted text',async p=>{
 await p.evaluate(()=>{setTimeout(()=>{throw new TypeError('boom 123456 "a very long quoted secret text here" and 77')},0)});
 await p.waitForTimeout(300);
 const l=await log(p); assert.equal(l.length,1);
 const e=l[0]; assert.equal(e.c,'js'); assert.equal(e.n,1);
 assert(/TypeError: boom/.test(e.m),e.m); assert(!/123456|secret/.test(JSON.stringify(e)),'private text left: '+JSON.stringify(e));
 assert(/#/.test(e.m)&&/…/.test(e.m)); assert(/:\d+:\d+$/.test(e.w),e.w)});

await run('The same error twice is one entry with a count; newest first',async p=>{
 await p.evaluate(()=>{testApp.errLog('js','first','x:1:1');testApp.errLog('js','second','x:2:2');testApp.errLog('js','first','x:1:1')});
 const l=await log(p); assert.deepEqual(l.map(e=>[e.m,e.n]),[['first',2],['second',1]])});

await run('An unhandled promise rejection is logged',async p=>{
 await p.evaluate(()=>{Promise.reject(new Error('rej 99999'))}); await p.waitForTimeout(300);
 const l=await log(p); assert.equal(l.length,1); assert.equal(l[0].c,'promise'); assert(/rej #/.test(l[0].m),l[0].m)});

await run('console.error(Error) is logged (the app swallows render errors that way); plain text is not',async p=>{
 await p.evaluate(()=>{console.error('just text');console.error(new RangeError('bad range'))});
 const l=await log(p); assert.equal(l.length,1); assert.equal(l[0].c,'app'); assert(/bad range/.test(l[0].m))});

await run('At most 40 entries are kept, and a flood is cut after 20 a minute',async p=>{
 const r=await p.evaluate(()=>{for(let i=0;i<30;i++) testApp.errLog('js','flood '+i,'f:'+i); const a=testApp.errLogRead().length;
   testApp.resetBurst(); for(let i=0;i<25;i++) testApp.errLog('js','more '+i,'g:'+i); testApp.resetBurst(); for(let i=0;i<25;i++) testApp.errLog('js','again '+i,'h:'+i);
   const l=testApp.errLogRead(); return [a,l.length,l[0].m]});
 assert.equal(r[0],20); assert.equal(r[1],40); assert.equal(r[2],'again 19')});

await run('The log is outside the app data and the backups',async p=>{
 await p.evaluate(()=>{testApp.S.expenses=[{id:'e1',amount:5,cat:'other',note:'MYSECRETNOTE',ts:Date.now()}];testApp.save();testApp.errLog('js','x','y:1:1')});
 const r=await p.evaluate(()=>({data:Object.keys(JSON.parse(localStorage.getItem('maleem.v1'))).join(),bk:Object.keys(testApp.backupData()).join(),rep:testApp.errReport(4000),raw:localStorage.getItem('maleem.errlog')}));
 assert(!/err/i.test(r.data)); assert(!/err/i.test(r.bk)); assert(!/MYSECRETNOTE/.test(r.rep+r.raw)); assert(/^Maleem/.test(r.rep)&&/1 errors/.test(r.rep))});

await run('The report is cut at the limit, keeps the newest first and has no web addresses',async p=>{
 const r=await p.evaluate(()=>{for(let i=0;i<15;i++) testApp.errLog('js','err number '+i,'z:'+i,'at fn (http://h/p/index.html:'+i+':1)\nat other (http://h/p/index.html:9:9)'); return [testApp.errReport(400).length,testApp.errReport(400).includes('err number 14'),testApp.errReport(6000).includes('index.html:9:9'),/http:/.test(testApp.errReport(6000))]});
 assert(r[0]<=400); assert.equal(r[1],true); assert.equal(r[2],true); assert.equal(r[3],false)});

for(const lang of ['eg','ar','en'])for(const width of [320,390]) await run('Error log card '+lang+' '+width+': count, view, copy, clear twice',async p=>{
 await p.evaluate(()=>testApp.go('settings')); await p.evaluate(()=>testApp.setGo('feedback'));
 let s=await p.evaluate(()=>({view:document.querySelector('#errView').disabled,clr:document.querySelector('#errClear').hidden}));
 assert.equal(s.view,true); assert.equal(s.clr,true);
 await p.evaluate(()=>{testApp.errLog('js','card test','c:1:1');testApp.errLog('app','second','c:2:2');testApp.errPaint()});
 s=await p.evaluate(()=>({count:document.querySelector('#errCount').textContent,view:document.querySelector('#errView').disabled,over:document.documentElement.scrollWidth>innerWidth+1}));
 assert.equal(s.view,false); assert.equal(s.over,false);
 if(lang==='en') assert.equal(s.count,'2 errors logged');
 await p.evaluate(()=>document.querySelector('#errView').click());
 s=await p.evaluate(()=>({hidden:document.querySelector('#errBox').hidden,txt:document.querySelector('#errBox').textContent}));
 assert.equal(s.hidden,false); assert(/card test/.test(s.txt));
 const full=await p.evaluate(()=>document.querySelector('#errCard').innerText);
 if(lang==='en') assert(!/[\u0600-\u06FF]/.test(full),'Arabic left on the English card: '+full.match(/[\u0600-\u06FF][^\n]*/));
 if(lang==='ar') assert(!/اتمسح|معرفتش|بيسجّل|مفيش|امسح السجل|شوف|انسخ/.test(full),'colloquial text on the Modern Arabic card');
 await p.evaluate(()=>document.querySelector('#errCopy').click()); await p.waitForTimeout(200);
 assert(await p.evaluate(()=>document.querySelector('#toast').classList.contains('show')),'a message tells whether it was copied');
 await p.evaluate(()=>document.querySelector('#errClear').click()); assert.equal((await log(p)).length,2,'the first tap only asks');
 await p.evaluate(()=>document.querySelector('#errClear').click()); await p.waitForTimeout(100);
 s=await p.evaluate(()=>({n:testApp.errLogRead().length,view:document.querySelector('#errView').disabled,box:document.querySelector('#errBox').hidden}));
 assert.deepEqual(s,{n:0,view:true,box:true})},lang,width);

await run('The attach tick shows only for a problem report with errors, and adds the report to what is sent',async p=>{
 await p.evaluate(()=>testApp.go('settings')); await p.evaluate(()=>testApp.setGo('feedback'));
 const vis=()=>p.evaluate(()=>!document.querySelector('#fbAttachRow').hidden);
 assert.equal(await vis(),false,'no errors yet');
 await p.evaluate(()=>{testApp.errLog('js','attach test','a:1:1');testApp.fbPaint()});
 assert.equal(await vis(),false,'a suggestion does not offer it');
 await p.evaluate(()=>document.querySelector('[data-fk="bug"]').click());
 assert.equal(await vis(),true);
 await p.fill('#fbText','The screen froze when I opened reports');
 assert.equal(await p.evaluate(()=>testApp.fbBody(false)),'The screen froze when I opened reports');
 await p.evaluate(()=>document.querySelector('#fbAttach').click());
 const b=await p.evaluate(()=>testApp.fbBody(false)); assert(/^The screen froze/.test(b)&&/attach test/.test(b)&&b.length<=2000);
 const w=await p.evaluate(()=>testApp.fbBody(true)); assert(w.length<=1200);
 await p.fill('#fbName','Hesham');
 await p.evaluate(()=>document.querySelector('#fbSend').click()); await p.waitForTimeout(200);
 const sent=await p.evaluate(()=>window.__fb); assert.equal(sent[2],'bug'); assert(/attach test/.test(sent[3]),'the report goes with the message')});

await run('Without the tick, only the typed text is sent',async p=>{
 await p.evaluate(()=>{testApp.go('settings'); testApp.setGo('feedback'); testApp.errLog('js','not sent','n:1:1'); testApp.fbPaint()});
 await p.evaluate(()=>document.querySelector('[data-fk="bug"]').click());
 await p.fill('#fbText','Only my words here, please'); await p.fill('#fbName','Hesham');
 await p.evaluate(()=>document.querySelector('#fbSend').click()); await p.waitForTimeout(200);
 const sent=await p.evaluate(()=>window.__fb); assert.equal(sent[3],'Only my words here, please')});

await run('Settings search finds the error log',async p=>{
 await p.evaluate(()=>testApp.go('settings')); await p.evaluate(()=>testApp.setGo(null));
 await p.fill('#setQ','سجل الاخطاء'); await p.waitForTimeout(150);
 assert.equal(await p.evaluate(()=>[...document.querySelectorAll('#setResList .set-item b')].some(b=>/سجل الأخطاء/.test(b.textContent))),true)});

}finally{await browser.close();fs.writeFileSync(path.join(__dirname,'error-log-results.json'),JSON.stringify(results,null,2));}
if(results.some(r=>!r.pass))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
