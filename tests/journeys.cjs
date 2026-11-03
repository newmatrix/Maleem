/* npm install --no-save playwright; BROWSER_PATH may point to Chrome/Edge.
   All requests are fulfilled from the local source tree; no production services are contacted. */
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('node:assert/strict');
let playwright;try{playwright=require('playwright')}catch(e){playwright=require(process.env.PLAYWRIGHT_MODULE)}
const root=path.join(__dirname,'../app/src/main/assets/www');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/\r\n?/g,'\n');
for(const x of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new(require('vm').Script)(x[1]);
const i=html.lastIndexOf('})();');
html=html.slice(0,i)+`window.testApp={get S(){return S},get RT(){return RT},get RC(){return RC},openRefund,openRecon,openInSheet,delExpense,syncNative,parseVoiceIn,parseVoice,impCsv,cleanPlan,deleteDebt,deleteGam,deleteInst,openGoal,openFixed,openPlan,openIncome,openAccSheet,openTrSheet,openGold,openGamSheet,openInstSheet,openDebtSheet,deleteGoal,deleteFixed,deletePlan,deleteIncome,cleanMoney,isDK,isMK,evalExpr,meGo,setGo,save,backupData,applyBackup,bkRestore,rcGet,rcPut,rcTx,monthsWithData,yearReportHtml,capView,capPlan,capConfirm,capAmount,capPull,capCurrency,openCapAsk,capMatch,cleanDebt,debtRem,accBal,openPaySheet,langPaint,go,openSheet,closeSheets,renderAll,spBuildLocalRows,spApplyShared,trText,dailyAllowance,periodOf,renderHome,exportXlsx,setSearch,bindDownloads:d=>downloads=d};\n`+html.slice(i);
const hashes=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>`'sha256-${crypto.createHash('sha256').update(x[1]).digest('base64')}'`).join(' ');
const csp=`default-src 'self'; script-src 'self' ${hashes}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://*.googleapis.com; frame-src 'self' blob: data:; object-src 'none'; base-uri 'none'; form-action 'none'`;
const results=[];
(async()=>{const browser=await playwright.chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{})});
async function run(name,fn,lang='eg',width=360){const page=await browser.newPage({viewport:{width,height:800},locale:'ar-EG',timezoneId:'Africa/Cairo'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.pathname==='/')return r.fulfill({contentType:'text/html',headers:{'Content-Security-Policy':csp},body:html});try{return r.fulfill({body:fs.readFileSync(path.join(root,u.pathname)),contentType:u.pathname.endsWith('.js')?'application/javascript':u.pathname.endsWith('.css')?'text/css':'application/octet-stream'});}catch{return r.abort();}});
await page.addInitScript(lang=>{window.__queue=[];window.AndroidBridge={takeCaptures:()=>JSON.stringify(window.__queue.splice(0)),captureState:()=>'{"on":false}',updateState:()=>'{"enabled":false}',ratesState:()=>'{}',syncWidget:()=>{},syncReminders:()=>{},captureIncoming:()=>{},setBars:()=>{},setSecure:()=>{},haptic:()=>{}};
if(!localStorage.getItem('maleem.v1'))localStorage.setItem('maleem.v1',JSON.stringify({onboarded:true,lang,profile:{name:'هشام'},currency:'EGP',budget:12000,budgetMode:'fixed',expenses:[]}));sessionStorage.setItem('maleem.splashed','1')},lang);
try{await page.goto('http://maleem.test/');await page.waitForFunction(()=>!!window.testApp);await fn(page);assert.deepEqual(errors,[]);results.push({name,pass:true});console.log('PASS',name)}catch(e){results.push({name,pass:false,error:e.stack});console.error('FAIL',name,e.message)}finally{await page.close()}}
try{


const fill=async(p,id,v)=>p.locator(id).fill(String(v));
const click=async(p,id)=>p.locator(id).click();
async function addAccount(p,name,amount){await p.evaluate(()=>{testApp.go('me');testApp.meGo('accounts')});await click(p,'#addAcc');await fill(p,'#accName',name);await fill(p,'#accBal',amount);await click(p,'#accSave');return p.evaluate(name=>testApp.S.accounts.find(x=>x.name===name)?.id,name)}
await run('Human journey: account, transfer with fee, edit, delete, undo, restart',async p=>{
 const a=await addAccount(p,'Primary',1000),b=await addAccount(p,'Secondary',100);assert(a&&b);
 await p.evaluate(()=>testApp.openTrSheet());await p.locator('#trFrom').selectOption(a);await p.locator('#trTo').selectOption(b);await fill(p,'#trOut',200);await fill(p,'#trFee',5);await click(p,'#trSave');
 const balances=()=>p.evaluate(([a,b])=>[testApp.accBal(a),testApp.accBal(b),testApp.S.expenses.length,testApp.S.inflows.length],[a,b]);assert.deepEqual(await balances(),[795,300,0,0]);
 const id=await p.evaluate(()=>testApp.S.transfers[0].id);await p.evaluate(id=>testApp.openTrSheet(id),id);await fill(p,'#trOut',150);await click(p,'#trSave');assert.deepEqual(await balances(),[845,250,0,0]);
 await p.evaluate(id=>testApp.openTrSheet(id),id);await click(p,'#trDel');assert.deepEqual(await balances(),[1000,100,0,0]);await click(p,'#toastAct');await p.reload();assert.deepEqual(await balances(),[845,250,0,0]);
});
await run('Human journey: partial refund to a different account, undo and full refund',async p=>{
 const a=await addAccount(p,'Payer',1000),b=await addAccount(p,'Refund account',0);
 await p.evaluate(a=>{testApp.S.expenses=[{id:'purchase',amount:200,cat:'other',acc:a,accAmt:200,note:'Shop purchase',ts:Date.now()}];testApp.save();testApp.renderAll();testApp.openRefund({exp:'purchase',fixed:true})},a);
 await fill(p,'#rfAmt',50);await p.locator('#rfAcc').selectOption(b);await click(p,'#rfSave');
 const balances=()=>p.evaluate(([a,b])=>[testApp.accBal(a),testApp.accBal(b),testApp.S.expenses.reduce((n,e)=>n+e.amount,0),testApp.S.inflows.length],[a,b]);assert.deepEqual(await balances(),[800,50,150,0]);
 await click(p,'#toastAct');assert.deepEqual(await balances(),[800,0,200,0]);
 await p.evaluate(()=>testApp.openRefund({exp:'purchase',fixed:true}));await fill(p,'#rfAmt',200);await p.locator('#rfAcc').selectOption(a);await click(p,'#rfSave');await p.reload();assert.deepEqual(await balances(),[1000,0,0,0]);
});
await run('Reconciliation records only the difference and can be undone',async p=>{const a=await addAccount(p,'Reconcile',1000);await p.evaluate(id=>testApp.openRecon(id),a);await fill(p,'#rcnAmt',950);await click(p,'#rcnRec');assert.deepEqual(await p.evaluate(id=>[testApp.accBal(id),testApp.S.expenses[0].amount],a),[950,50]);await click(p,'#toastAct');assert.equal(await p.evaluate(id=>testApp.accBal(id),a),1000)});
await run('Negative opening balance is supported without changing its sign',async p=>{const a=await addAccount(p,'Overdrawn',-100);assert(a,'Negative account balance should be accepted');assert.equal(await p.evaluate(id=>testApp.accBal(id),a),-100)});
await run('Invalid arithmetic characters are not silently ignored',async p=>{assert(await p.evaluate(()=>Number.isNaN(testApp.evalExpr('100abc'))));});
await run('Expense leading minus is rejected rather than recorded positive',async p=>{await p.evaluate(()=>testApp.openSheet(null,{cat:'other'}));await fill(p,'#amountInput','-100');await click(p,'#saveBtn');assert.equal(await p.evaluate(()=>testApp.S.expenses.length),0)});

await run('Expense add, edit, delete, undo and account reconciliation',async p=>{const a=await addAccount(p,'Spending',1000);await p.evaluate(a=>testApp.openSheet(null,{cat:'food',acc:a}),a);await fill(p,'#amountInput','25+25×2');await fill(p,'#noteInput','Lunch');await click(p,'#saveBtn');assert.equal(await p.evaluate(id=>testApp.accBal(id),a),925);const id=await p.evaluate(()=>testApp.S.expenses[0].id);await p.evaluate(id=>testApp.openSheet(id),id);await fill(p,'#amountInput','100');await click(p,'#saveBtn');assert.equal(await p.evaluate(id=>testApp.accBal(id),a),900);await p.evaluate(id=>testApp.openSheet(id),id);await click(p,'#delInSheet');await p.waitForFunction(()=>testApp.S.expenses.length===0);assert.equal(await p.evaluate(id=>testApp.accBal(id),a),1000);await click(p,'#toastAct');await p.reload();assert.equal(await p.evaluate(id=>testApp.accBal(id),a),900)});
await run('User note markup is displayed as text without executing',async p=>{await p.evaluate(()=>testApp.openSheet(null,{cat:'other'}));await fill(p,'#amountInput','20');const payload='<img src=x onerror="window.auditXss=1">';await fill(p,'#noteInput',payload);await click(p,'#saveBtn');await p.waitForTimeout(100);assert.equal(await p.evaluate(()=>window.auditXss),undefined);assert.equal(await p.locator('.xnote').first().textContent(),payload)});
await run('Calculator signed balance, precedence and invalid input boundaries',async p=>{const r=await p.evaluate(()=>['-100','100-25×2','-100+25','100÷0','100abc','2..5','100+','50×-2'].map(testApp.evalExpr));assert.deepEqual(r.slice(0,3),[-100,50,-75]);for(const x of r.slice(3,7))assert(Number.isNaN(x));assert.equal(r[7],-100)});
}finally{await browser.close();fs.writeFileSync(path.join(__dirname,'journey-results.json'),JSON.stringify(results,null,2));}
if(results.some(r=>!r.pass))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});

