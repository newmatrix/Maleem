/* npm install --no-save playwright; BROWSER_PATH may point to Chrome/Edge.
   All requests are fulfilled from the local source tree; no production services are contacted. */
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('node:assert/strict');
let playwright;try{playwright=require('playwright')}catch(e){playwright=require(process.env.PLAYWRIGHT_MODULE)}
const root=path.join(__dirname,'../app/src/main/assets/www');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/\r\n?/g,'\n');
for(const x of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new(require('vm').Script)(x[1]);
const i=html.lastIndexOf('})();');
html=html.slice(0,i)+`window.testApp={expenseCanManage,spCleanMembership,spCleanRecovery,spRecoverySnapshot,spSeedRecovery,fbInit,get S(){return S},get RT(){return RT},get RC(){return RC},backupData,applyBackup,bkRestore,rcGet,rcPut,rcTx,monthsWithData,yearReportHtml,capView,capPlan,capConfirm,capAmount,capPull,capCurrency,openCapAsk,capMatch,cleanDebt,debtRem,accBal,openPaySheet,langPaint,go,openSheet,closeSheets,renderAll,spBuildLocalRows,spApplyShared,trText,dailyAllowance,periodOf,renderHome,exportXlsx,setSearch,bindDownloads:d=>downloads=d,save,openRefund,openInSheet,openDebtSheet,deleteDebt,editDebtEntry,cleanCat,cleanInflow,cleanExpense,renderCatGrid,renderFeedbackControls,recordedAvailable,entryValue,entryAccountAmount,entryStamp,captureCurrencyCode,applySecure,openGoal,depositGoal,renderLinkedObligations,curApply,curRestore,syncNative,trashRestore,openDebtLog,openInstPay,toggleGamPaid};\n`+html.slice(i);
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
await run('Capture currencies: ISO, Arabic, explicit app override and base fallback',async p=>{
 const out=await p.evaluate(()=>{const a=testApp,s=a.S;s.currency='SAR';s.capCurBy={};const values=['SAR','ريال سعودي','USD','ليرة تركية',''].map(cur=>a.capCurrency({cur,pkg:'bank'}));s.capCurBy.bank='AED';return {values,override:a.capCurrency({cur:'SAR',pkg:'bank'})}});
 assert.deepEqual(out,{values:['SAR','SAR','USD','TRY','SAR'],override:'AED'});
});
await run('InstaPay opt-in manual fee is posted once to the same account',async p=>{
 await p.evaluate(()=>{const a=testApp,s=a.S;s.accounts=[{id:'a',name:'Cash',type:'cash',cur:'EGP',open:2000}];s.ipFee={on:false,pct:0.1,min:0.5,max:20};a.openSheet(null,{amount:1000,cat:'other',pay:'instapay',acc:'a'})});
 assert(await p.locator('#ipFeeRow').isVisible());assert(!await p.locator('#ipFeeChk').isChecked());
 await p.locator('#ipFeeChk').check();await p.locator('#ipFeeAmount').fill('3');await p.locator('#saveBtn').click();
 assert.deepEqual(await p.evaluate(()=>[testApp.S.expenses.map(x=>x.amount),testApp.accBal('a')]),[[1000,3],997]);
 await p.evaluate(()=>testApp.openSheet(testApp.S.expenses[0].id));await p.locator('#saveBtn').click();assert.equal(await p.evaluate(()=>testApp.S.expenses.length),2);
 await p.evaluate(()=>testApp.openSheet(null,{amount:100,cat:'other',pay:'instapay',cap:'cap',noFee:true}));assert(!await p.locator('#ipFeeRow').isVisible());
});
await run('Direct expense and income time, persisted and validated',async p=>{
 await p.clock.setFixedTime(new Date('2026-11-17T18:00:00+02:00'));
 await p.evaluate(()=>testApp.openSheet(null,{amount:20,cat:'other'}));await p.locator('#expenseTime').fill('16:20');await p.locator('#saveBtn').click();
 await p.evaluate(()=>testApp.openInSheet(null,{amount:100,src:'Work'}));await p.locator('#incomeTime').fill('11:32');await p.locator('#inSave').click();
 await p.reload();await p.waitForFunction(()=>!!window.testApp);
 assert.deepEqual(await p.evaluate(()=>{const a=new Date(testApp.S.expenses[0].ts),b=new Date(testApp.S.inflows[0].ts);return [a.getHours(),a.getMinutes(),b.getHours(),b.getMinutes()]}),[16,20,11,32]);
 await p.evaluate(()=>testApp.openInSheet(testApp.S.inflows[0].id));await p.locator('#incomeTime').fill('23:59');await p.locator('#inSave').click();assert(await p.locator('#inErr').innerText());
});
await run('Linked loan: change, detach, delete, undo and trash restore keep balances exact',async p=>{
 await p.evaluate(()=>{const a=testApp,s=a.S;s.accounts=[{id:'a',name:'A',type:'cash',cur:'EGP',open:1000},{id:'b',name:'B',type:'cash',cur:'EGP',open:500}];s.debts=[{id:'d',dir:'in',person:'Test',amount:200,cur:'EGP',acc:'a',accAmt:200,created:Date.now(),adds:[{id:'add',amount:20,acc:'a',accAmt:20,ts:Date.now()}],payments:[{id:'pay',amount:50,acc:'a',accAmt:50,ts:Date.now()}]}];a.openDebtSheet('d')});
 const balances=()=>p.evaluate(()=>[testApp.accBal('a'),testApp.accBal('b')]);assert.deepEqual(await balances(),[830,500]);
 await p.locator('#debtAcc').selectOption('b');await p.locator('#debtSave').click();assert.deepEqual(await balances(),[1030,300]);
 await p.evaluate(()=>testApp.editDebtEntry('d','add','add'));await p.locator('#formBody [data-k=acc]').selectOption('');await p.locator('#formSave').click();assert.deepEqual(await balances(),[1050,300]);
 await p.evaluate(()=>testApp.editDebtEntry('d','pay','pay'));await p.locator('#formBody [data-k=acc]').selectOption('b');await p.locator('#formSave').click();assert.deepEqual(await balances(),[1000,350]);
 await p.evaluate(()=>testApp.deleteDebt('d'));assert(await p.locator('#formSheet').isVisible());await p.locator('#formSave').click();assert.deepEqual(await balances(),[1000,500]);
 await p.locator('#toastAct').click();assert.deepEqual(await balances(),[1000,350]);
 await p.evaluate(()=>{testApp.deleteDebt('d',true);testApp.trashRestore(testApp.S.trash.find(t=>t.k==='debt').id)});assert.deepEqual(await balances(),[1000,350]);
});
await run('Foreign transaction originals survive editing, exchange-rate changes, backups and base conversion',async p=>{
 await p.evaluate(()=>{const a=testApp,s=a.S;s.currency='EGP';s.manRates={EGP:{r:50,ts:Date.now()},SAR:{r:5,ts:Date.now()}};s.accounts=[{id:'a',name:'SAR',type:'bank',cur:'SAR',open:100}];a.openSheet(null,{amount:10,cat:'other',acc:'a'})});
 await p.locator('#expenseCurrency').selectOption('SAR');await p.locator('#saveBtn').click();
 assert.deepEqual(await p.evaluate(()=>{const a=testApp,e=a.S.expenses[0];return [e.amount,e.o,e.accAmt,a.accBal('a')]}),[100,{a:10,c:'SAR'},10,90]);
 await p.evaluate(()=>{testApp.S.manRates.SAR.r=10;testApp.openSheet(testApp.S.expenses[0].id)});assert.equal(await p.locator('#amountInput').inputValue(),'10');await p.locator('#noteInput').fill('same money');await p.locator('#saveBtn').click();
 assert.deepEqual(await p.evaluate(()=>[testApp.S.expenses[0].amount,testApp.S.expenses[0].accAmt]),[100,10]);
 await p.evaluate(()=>testApp.openInSheet(null,{amount:20,src:'Foreign',acc:'a'}));await p.locator('#incomeCurrency').selectOption('SAR');await p.locator('#inSave').click();
 assert.equal(await p.evaluate(()=>testApp.accBal('a')),110);
 await p.evaluate(()=>{const a=testApp,b=a.backupData();a.applyBackup(b,Date.now());a.curApply({from:'EGP',to:'USD',k:0.02})});
 assert.deepEqual(await p.evaluate(()=>[testApp.S.expenses[0].amount,testApp.S.expenses[0].o,testApp.S.inflows[0].o,testApp.accBal('a')]),[2,{a:10,c:'SAR'},{a:20,c:'SAR'},110]);
 await p.reload();await p.waitForFunction(()=>!!window.testApp);assert.equal(await p.evaluate(()=>testApp.S.inflows[0].o.c),'SAR');
});
await run('Missing exchange rate refuses a foreign save without changing records or balance',async p=>{
 await p.evaluate(()=>{testApp.S.manRates={};testApp.openSheet(null,{amount:50,cat:'other'})});await p.locator('#expenseCurrency').selectOption('SAR');await p.locator('#saveBtn').click();
 assert.equal(await p.evaluate(()=>testApp.S.expenses.length),0);assert(await p.locator('#sheetErr').innerText());
});
await run('Categories are collapsible and custom groups survive cleaning and backup',async p=>{
 await p.evaluate(()=>{const a=testApp;a.S.cats[0].g='My group';a.openSheet()});await p.locator('#catGrouping').check();assert((await p.locator('#cats details').count())>1);
 assert.equal(await p.locator('#cats details[open]').count(),0);await p.locator('#cats summary').first().click();assert.equal(await p.locator('#cats details[open]').count(),1);
 await p.evaluate(()=>{const a=testApp;a.applyBackup(a.backupData(),Date.now())});await p.reload();await p.waitForFunction(()=>!!window.testApp);
 assert.deepEqual(await p.evaluate(()=>[testApp.S.catGrouping,testApp.S.cats[0].g]),[true,'My group']);
});
await run('Screenshot blocking defaults on and the choice survives reload and backup',async p=>{
 const r=await p.evaluate(()=>{const a=testApp,s=a.S;window.securityCalls=[];window.AndroidBridge.setSecure=v=>securityCalls.push(v);s.pinH={h:'hash',s:'salt'};a.applySecure();s.blockScreenshots=false;a.applySecure();const b=a.backupData();s.blockScreenshots=true;a.applyBackup(b,Date.now());return {calls:securityCalls.slice(0,2),saved:s.blockScreenshots}});
 assert.deepEqual(r,{calls:[true,false],saved:false});
 await p.evaluate(()=>{delete testApp.S.pinH;testApp.save()});await p.reload();await p.waitForFunction(()=>!!window.testApp);assert.equal(await p.evaluate(()=>testApp.S.blockScreenshots),false);
});
await run('Income adds to real balance but leaves budget unchanged; edit/delete/undo are exact',async p=>{
 await p.evaluate(()=>{const a=testApp,s=a.S;s.budget=500;s.accounts=[{id:'a',name:'Cash',type:'cash',cur:'EGP',open:200}];a.openInSheet(null,{amount:100,src:'Work',acc:'a'})});await p.locator('#inSave').click();
 assert.deepEqual(await p.evaluate(()=>[testApp.accBal('a'),testApp.recordedAvailable(),testApp.S.budget]),[300,300,500]);
 await p.evaluate(()=>testApp.openInSheet(testApp.S.inflows[0].id));await p.locator('#inAmt').fill('150');await p.locator('#inSave').click();assert.equal(await p.evaluate(()=>testApp.recordedAvailable()),350);
 await p.evaluate(()=>testApp.openInSheet(testApp.S.inflows[0].id));await p.locator('#inDel').click();assert.equal(await p.evaluate(()=>testApp.recordedAvailable()),200);await p.locator('#toastAct').click();assert.equal(await p.evaluate(()=>testApp.recordedAvailable()),350);
});
await run('Goals round cents and keep progress and deposits through backup/reload',async p=>{
 await p.evaluate(()=>testApp.openGoal());await p.locator('#formBody [data-k=name]').fill('Goal');await p.locator('#formBody [data-k=target]').fill('1');await p.locator('#formBody [data-k=saved]').fill('0.1');await p.locator('#formSave').click();
 await p.evaluate(()=>testApp.depositGoal(testApp.S.goals[0].id));await p.locator('#formBody [data-k=amount]').fill('0.2');await p.locator('#formSave').click();
 assert.equal(await p.evaluate(()=>testApp.S.goals[0].saved),0.3);await p.reload();await p.waitForFunction(()=>!!window.testApp);assert.equal(await p.evaluate(()=>testApp.S.goals[0].saved),0.3);
});
await run('Linked installments and circles remain payable without a notification and do not duplicate',async p=>{
 await p.evaluate(()=>{const a=testApp,s=a.S;s.insts=[{id:'i',name:'Phone',rec:false,items:[{id:'item',due:'2026-11-01',amount:100}],created:Date.now()}];s.gams=[{id:'g',name:'Circle',inst:50,members:2,start:'2026-11',day:1,turn:2,turns:[2],asExp:true,paid:{},created:Date.now()}];s.fixedLinks=['inst:i','gam:g'];s.capQ=[];a.renderAll();a.go('me');document.querySelector('[data-me-go="fixed"]').click()});
 await p.locator('#fixedLinkedList details').first().locator('summary').click();await p.locator('#fixedLinkedList [data-ipay=item]').click();await p.locator('#ipSave').click();
 assert.equal(await p.evaluate(()=>testApp.S.expenses.filter(e=>e.inst==='item').length),1);assert.equal(await p.locator('#fixedLinkedList [data-ipay=item]').count(),0);
 await p.locator('#fixedLinkedList details').nth(1).locator('summary').click();await p.locator('#fixedLinkedList [data-linked-gpay="g|2026-11"]').click();
 assert.equal(await p.evaluate(()=>testApp.S.expenses.length),2);assert.equal(await p.locator('#fixedLinkedList [data-linked-gpay="g|2026-11"]').count(),0);
 await p.evaluate(()=>testApp.applyBackup(testApp.backupData(),Date.now()));assert.deepEqual(await p.evaluate(()=>testApp.S.fixedLinks),['inst:i','gam:g']);
});

await run('Shared membership: backup, reinstall restore, legacy backup and undo preserve ownership',async p=>{
 const result=await p.evaluate(()=>{const a=testApp,s=a.S;
   s.space={code:'ABCDEFGH',uid:'member1',name:'Owner',auto:false,old:[],sharePrefs:{expenses:true}};
   s.spaceRecovery={v:1,user:{uid:'member1',apiKey:'AIzaSyBCF3hwtmYnsffFb5f-_1UhCbiaD9eo1Y8',isAnonymous:true,stsTokenManager:{refreshToken:'test-refresh',accessToken:'test-token',expirationTime:Date.now()+3600000}}};
   s.expenses=[{id:'sharedOther',amount:10,cat:'other',ts:Date.now(),sp:'ABCDEFGH',by:'member2'}];const backup=a.backupData();s.space=null;s.spaceRecovery=null;a.applyBackup(backup,Date.now());
   const restored={code:s.space.code,uid:s.space.uid,token:!!s.spaceRecovery,canEditOther:a.expenseCanManage(s.expenses[0]),sp:s.expenses[0].sp};
   return {restored,backup:!!backup.spaceRecovery};
 });assert.deepEqual(result,{restored:{code:'ABCDEFGH',uid:'member1',token:true,canEditOther:false,sp:'ABCDEFGH'},backup:true});
 await p.locator('#toastAct').click();assert.equal(await p.evaluate(()=>testApp.S.space),null);
 await p.evaluate(()=>{const s=testApp.S;s.space={code:'ABCDEFGH',uid:'member1',name:'Owner',auto:false,old:[]};testApp.applyBackup({expenses:[]},Date.now())});
 assert.equal(await p.evaluate(()=>testApp.S.space.code),'ABCDEFGH');
});
await run('Recovery rejects mismatched UID, other project and missing credential',async p=>{
 assert.deepEqual(await p.evaluate(()=>{const a=testApp,u={uid:'owner',apiKey:'other',stsTokenManager:{refreshToken:'x',accessToken:'y'}};return [a.spCleanRecovery({v:1,user:u},'owner'),a.spCleanRecovery({v:1,user:u},'intruder'),a.spCleanRecovery({v:1,user:{uid:'owner'}},'owner'),a.spCleanMembership({code:'<bad>',uid:'owner'})]}),[null,null,null,null]);
});
await run('Bundled Firebase SDK recovers the same anonymous UID from a new installation',async p=>{
 let anonymousRequests=0;
 await p.route('https://identitytoolkit.googleapis.com/**',r=>{if(r.request().url().includes('signUp')){anonymousRequests++;return r.abort()}return r.fulfill({json:{users:[{localId:'recoveredMember',emailVerified:false,createdAt:'1',lastLoginAt:'1',providerUserInfo:[]}]}})});
 await p.route('https://securetoken.googleapis.com/**',r=>r.fulfill({json:{access_token:'test-token',expires_in:'3600',refresh_token:'test-refresh',token_type:'Bearer',user_id:'recoveredMember',project_id:'575574288717'}}));
 const uid=await p.evaluate(async()=>{const a=testApp,s=a.S;s.space={code:'ABCDEFGH',uid:'recoveredMember',name:'Owner',auto:false,old:[]};s.spaceRecovery={v:1,user:{uid:'recoveredMember',apiKey:'AIzaSyBCF3hwtmYnsffFb5f-_1UhCbiaD9eo1Y8',stsTokenManager:{refreshToken:'test-refresh',accessToken:'test-token',expirationTime:Date.now()+3600000}}};localStorage.setItem('firebase:authUser:AIzaSyBCF3hwtmYnsffFb5f-_1UhCbiaD9eo1Y8:[DEFAULT]',JSON.stringify({uid:'recoveredMember'}));return (await a.fbInit()).uid});
 assert.equal(uid,'recoveredMember');assert.equal(anonymousRequests,0);
});


await run('Captured foreign expense retains original currency through partial refund and undo',async p=>{
 await p.evaluate(()=>testApp.openSheet(null,{amount:100,cat:'other',cap:'foreignCapture',original:{a:10,c:'SAR',base:100}}));await p.locator('#saveBtn').click();
 assert.deepEqual(await p.evaluate(()=>testApp.S.expenses[0].o),{a:10,c:'SAR'});
 await p.evaluate(()=>testApp.openRefund({exp:testApp.S.expenses[0].id,fixed:true}));await p.locator('#rfAmt').fill('25');await p.locator('#rfSave').click();
 assert.deepEqual(await p.evaluate(()=>[testApp.S.expenses[0].amount,testApp.S.expenses[0].o]),[75,{a:7.5,c:'SAR'}]);
 await p.locator('#toastAct').click();assert.deepEqual(await p.evaluate(()=>[testApp.S.expenses[0].amount,testApp.S.expenses[0].o]),[100,{a:10,c:'SAR'}]);
});
await run('Foreign income allocation uses base amount, not foreign face value',async p=>{
 await p.evaluate(()=>{testApp.S.manRates={EGP:{r:50,ts:Date.now()},SAR:{r:5,ts:Date.now()}};testApp.openInSheet(null,{amount:10,src:'Work'})});
 await p.locator('#incomeCurrency').selectOption('SAR');await p.evaluate(()=>document.querySelector('#inAlSuggest').click());
 assert.equal(await p.evaluate(()=>['inAlBills','inAlSave','inAlSpend'].reduce((sum,id)=>sum+(+document.getElementById(id).value||0),0)),100);
});
await run('Rejected Firebase credentials never silently create a different member',async p=>{
 let anonymousRequests=0;await p.route('https://identitytoolkit.googleapis.com/**',r=>{if(r.request().url().includes('signUp'))anonymousRequests++;return r.fulfill({status:400,json:{error:{code:400,message:'USER_DISABLED'}}})});
 const result=await p.evaluate(async()=>{const a=testApp,s=a.S;s.space={code:'ABCDEFGH',uid:'disabledMember',name:'Owner',auto:false,old:[]};s.spaceRecovery={v:1,user:{uid:'disabledMember',apiKey:'AIzaSyBCF3hwtmYnsffFb5f-_1UhCbiaD9eo1Y8',stsTokenManager:{refreshToken:'test-refresh',accessToken:'test-token',expirationTime:Date.now()+3600000}}};let failed=false;try{await a.fbInit()}catch{failed=true}return {failed,code:s.space.code,uid:s.space.uid}});
 assert.deepEqual(result,{failed:true,code:'ABCDEFGH',uid:'disabledMember'});assert.equal(anonymousRequests,0);
});


await run('Foreign capture does not invent an EGP InstaPay fee after base conversion',async p=>{
 await p.evaluate(()=>{testApp.S.ipFee={on:true,pct:0.1,min:0.5,max:20};testApp.openSheet(null,{amount:1000,cat:'other',pay:'instapay',cap:'foreignFee',original:{a:100,c:'SAR',base:1000}})});
 assert(!await p.locator('#ipFeeChk').isChecked());await p.locator('#ipFeeChk').check();assert.equal(await p.locator('#ipFeeAmount').inputValue(),'0');
 await p.locator('#ipFeeAmount').fill('2');await p.locator('#saveBtn').click();assert.deepEqual(await p.evaluate(()=>testApp.S.expenses.map(e=>e.amount)),[1000,2]);
});

for(const lang of ['eg','ar','en'])for(const width of [320,360,390,768])await run(`Compact entry layout and removed home buttons ${lang} ${width}`,async p=>{
 await p.evaluate(()=>{testApp.renderAll();testApp.openSheet(null,{amount:20,cat:'other'})});
 assert(await p.locator('#expenseTime').isVisible());assert(await p.locator('#expenseCurrency').isVisible());
 const overflow=await p.evaluate(()=>{const s=document.querySelector('#sheet');return {page:document.documentElement.scrollWidth>innerWidth+1,sheet:s.scrollWidth>s.clientWidth+1,inputs:[...s.querySelectorAll('.entry-controls input,.entry-controls select')].some(e=>{const r=e.getBoundingClientRect();return r.left<0||r.right>innerWidth+1})}});
 assert.deepEqual(overflow,{page:false,sheet:false,inputs:false});await p.evaluate(()=>testApp.closeSheets());
 assert.equal(await p.locator('#homeFilterGo,#homeSortGo').count(),0);
},lang,width);
}finally{await browser.close();fs.writeFileSync(path.join(__dirname,'feedback-results.json'),JSON.stringify(results,null,2));}
if(results.some(r=>!r.pass))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
