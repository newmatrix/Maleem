/* npm install --no-save playwright; BROWSER_PATH may point to Chrome/Edge.
   All requests are fulfilled from the local source tree; no production services are contacted. */
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('node:assert/strict');
let playwright;try{playwright=require('playwright')}catch(e){playwright=require(process.env.PLAYWRIGHT_MODULE)}
const root=path.join(__dirname,'../app/src/main/assets/www');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/\r\n?/g,'\n');
for(const x of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new(require('vm').Script)(x[1]);
const i=html.lastIndexOf('})();');
html=html.slice(0,i)+`window.testApp={get S(){return S},save,sum,byCat,debtPaid,debtAdded,debtRem,freeIncomeBalance,incomeTotal,accBal,moneyTotals,renderAll};\n`+html.slice(i);
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

await run('Money sums never drift: thousands of random cent amounts add up exactly',async p=>{
  const r=await p.evaluate(()=>{const a=testApp;let bad=[];let seed=12345;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
    for(let k=0;k<3000;k++){const n=1+Math.floor(rnd()*40);const cents=Array.from({length:n},()=>1+Math.floor(rnd()*500000));
      const rows=cents.map(c=>({amount:c/100,cat:['a','b','c'][c%3]}));const want=cents.reduce((x,y)=>x+y,0)/100;
      if(a.sum(rows)!==want) bad.push(['sum',want,a.sum(rows)]);
      const bc=a.byCat(rows),w={};cents.forEach(c=>{const k2=['a','b','c'][c%3];w[k2]=(w[k2]||0)+c});
      for(const k2 in w) if(bc[k2]!==w[k2]/100) bad.push(['byCat',k2,w[k2]/100,bc[k2]]);
      const d={amount:1,payments:rows.map(x=>({amount:x.amount})),adds:rows.slice(0,3).map(x=>({amount:x.amount}))};
      if(a.debtPaid(d)!==want) bad.push(['debtPaid',want,a.debtPaid(d)]);
    }
    return {bad:bad.slice(0,3),simple:[a.sum([{amount:0.1},{amount:0.2}]),a.sum([{amount:0.1},{amount:0.2},{amount:0.3}]),a.sum([])]}});
  assert.deepEqual(r.bad,[]);assert.deepEqual(r.simple,[0.3,0.6,0]);
},'eg',390);
await run('Balances stay exact to the cent: account, free income and debt remaining',async p=>{
  const r=await p.evaluate(()=>{const a=testApp,S=a.S;S.accounts=[{id:'acc',name:'B',type:'bank',cur:'EGP',open:0.1}];
    S.expenses=[{id:'e1',amount:0.2,cat:'food',ts:Date.now(),acc:'acc',accAmt:0.2},{id:'e2',amount:0.1,cat:'food',ts:Date.now(),acc:'acc',accAmt:0.1}];
    S.inflows=[{id:'i1',amount:0.3,ts:Date.now(),acc:'acc',accAmt:0.3,fund:'free'},{id:'i2',amount:0.6,ts:Date.now(),fund:'free'}];
    S.debts=[{id:'d1',person:'x',dir:'out',amount:0.3,created:Date.now(),payments:[{amount:0.1},{amount:0.2}]}];S.incomes=[{id:'n1',amount:0.1},{id:'n2',amount:0.2}];
    return {bal:a.accBal('acc'),free:a.freeIncomeBalance(),rem:a.debtRem(S.debts[0]),paid:a.debtPaid(S.debts[0]),incomes:a.incomeTotal(),tot:a.moneyTotals().tot}});
  assert.deepEqual(r,{bal:0.1,free:0.9,rem:0,paid:0.3,incomes:0.3,tot:0.1});
},'eg',390);

}finally{await browser.close();fs.writeFileSync(path.join(__dirname,'money-sum-results.json'),JSON.stringify(results,null,2));}
if(results.some(r=>!r.pass))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
