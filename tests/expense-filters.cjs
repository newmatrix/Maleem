/* npm install --no-save playwright; BROWSER_PATH may point to Chrome/Edge.
   All requests are fulfilled from the local source tree; no production services are contacted. */
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('node:assert/strict');
let playwright;try{playwright=require('playwright')}catch(e){playwright=require(process.env.PLAYWRIGHT_MODULE)}
const root=path.join(__dirname,'../app/src/main/assets/www');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/\r\n?/g,'\n');
for(const x of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new(require('vm').Script)(x[1]);
const i=html.lastIndexOf('})();');
html=html.slice(0,i)+`window.testApp={get S(){return S},sfFill,sfGet,sfPass,sfCompare,renderSearch,openSearch,showSub,fixedScheduled,fixedOcc,fixedDueItems,fixedPendingIn,cleanFixed,openFixed,openRestore,rsGroups,save,get RT(){return RT},get RC(){return RC},backupData,applyBackup,bkRestore,rcGet,rcPut,rcTx,monthsWithData,yearReportHtml,capView,capPlan,capConfirm,capAmount,capPull,capCurrency,openCapAsk,capMatch,cleanDebt,debtRem,accBal,openPaySheet,langPaint,go,openSheet,closeSheets,renderAll,spBuildLocalRows,spApplyShared,trText,dailyAllowance,periodOf,renderHome,exportXlsx,setSearch,bindDownloads:d=>downloads=d};\n`+html.slice(i);
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
for(const lang of ['eg','ar','en'])for(const width of [320,390])await run('Multiple categories, global sort, totals and unchanged balances '+lang+' '+width,async p=>{
await p.setViewportSize({width,height:800});
const initial=await p.evaluate(()=>{const a=testApp,c=a.S.cats.slice(0,3);a.S.expenses=[{id:'a',cat:c[0].id,amount:300,ts:new Date(2026,10,1,10).getTime(),pay:'cash'},{id:'b',cat:c[1].id,amount:50,ts:new Date(2026,10,2,9).getTime(),pay:'cash'},{id:'c',cat:c[0].id,amount:100,ts:new Date(2026,10,3,8).getTime(),pay:'cash'},{id:'d',cat:c[2].id,amount:800,ts:new Date(2026,10,4,7).getTime(),pay:'cash'}];a.go('reports');a.sfFill();a.openSearch();document.querySelector('#sfPanel').hidden=false;document.querySelector('.sf-categories').open=true;return {state:JSON.stringify([a.S.expenses,a.S.accounts,a.S.transfers,a.S.inflows,a.S.budget]),ids:c.map(x=>x.id)}});
await p.locator('#sfCat input').nth(0).check();await p.locator('#sfCat input').nth(1).check();
assert.deepEqual(await p.locator('#searchRes .xp').evaluateAll(xs=>xs.map(x=>x.dataset.id)),['c','b','a']);assert((await p.locator('#searchSum').textContent()).includes('450'));
for(const [mode,ids] of [['amount-asc',['b','c','a']],['amount-desc',['a','c','b']],['time-asc',['a','b','c']],['time-desc',['c','b','a']]]){await p.locator('#sfSortPick').click();await p.locator('#sfChoiceMenu [data-value="'+mode+'"]').click();assert.deepEqual(await p.locator('#searchRes .xp').evaluateAll(xs=>xs.map(x=>x.dataset.id)),ids)}
for(const mode of ['cat-asc','cat-desc']){await p.locator('#sfSortPick').click();await p.locator('#sfChoiceMenu [data-value="'+mode+'"]').click();const ids=await p.evaluate(()=>testApp.S.expenses.filter(x=>testApp.sfPass(x,testApp.sfGet())).sort(testApp.sfCompare).map(x=>x.id));assert.deepEqual(await p.locator('#searchRes .xp').evaluateAll(xs=>xs.map(x=>x.dataset.id)),ids)}
await p.locator('#sfMin').fill('150');await p.waitForTimeout(300);assert.equal(await p.locator('#searchRes .xp').count(),1);assert((await p.locator('#searchSum').textContent()).includes('300'));
await p.locator('#sfClear').click();assert.equal(await p.locator('#searchRes .xp').count(),4);assert.equal(await p.locator('#sfCat input:checked').count(),0);
await p.locator('#sfPayPick').click();await p.locator('#sfChoiceMenu [data-value="cash"]').click();assert.equal(await p.locator('#sfPay').inputValue(),'cash');
await p.locator('#sfFromPick').click();await p.locator('#sfCalendarDays [data-day="2026-11-02"]').click();assert.equal(await p.locator('#searchRes .xp').count(),3);
await p.locator('#sfToPick').click();await p.locator('#sfCalendarDays [data-day="2026-11-03"]').click();assert.equal(await p.locator('#searchRes .xp').count(),2);assert((await p.locator('#searchSum').textContent()).includes('150'));
await p.locator('#sfFromPick').click();await p.locator('#sfMonthPrev').click();assert.equal(await p.locator('#sfCalendarDays [data-day="2026-10-01"]').count(),1);await p.locator('#sfCalendarCancel').click();assert.equal(await p.locator('#sfFrom').inputValue(),'2026-11-02');
assert.equal(await p.evaluate(()=>JSON.stringify([testApp.S.expenses,testApp.S.accounts,testApp.S.transfers,testApp.S.inflows,testApp.S.budget])),initial.state);
assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
},lang,width);
await run('All results contribute to total beyond display limit',async p=>{
await p.evaluate(()=>{const a=testApp;a.S.expenses=Array.from({length:305},(_,i)=>({id:'e'+i,cat:'other',amount:1,ts:new Date(2026,10,1,10,i).getTime(),pay:'cash'}));a.sfFill();a.renderSearch()});
assert.equal(await p.locator('#searchRes .xp').count(),300);assert((await p.locator('#searchSum').textContent()).includes('305'));
});
}finally{await browser.close();fs.writeFileSync(path.join(__dirname,'expense-filters-results.json'),JSON.stringify(results,null,2));}
if(results.some(r=>!r.pass))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
