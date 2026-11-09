/* npm install --no-save playwright; BROWSER_PATH may point to Chrome/Edge.
   All requests are fulfilled from the local source tree; no production services are contacted. */
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('node:assert/strict');
let playwright;try{playwright=require('playwright')}catch(e){playwright=require(process.env.PLAYWRIGHT_MODULE)}
const root=path.join(__dirname,'../app/src/main/assets/www');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/\r\n?/g,'\n');
for(const x of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new(require('vm').Script)(x[1]);
const i=html.lastIndexOf('})();');
html=html.slice(0,i)+`window.testApp={get S(){return S},get RC(){return RC},save,go,setGo,closeSheets,renderSetHome,backupData,applyBackup,trashRestore,trashForever,trashEmpty,trashSweep,trashPut,rcPut,rcGet,rcPrune,delExpense,deleteDebt,deleteGam,deleteIncome,deleteGoal,deleteFixed,deletePlan,deleteInst};
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

const DAY=864e5;
/* one valid record of every kind the trash holds; Latin text so the English screens can be checked for stray Arabic */
const seed=p=>p.evaluate(()=>{const t=testApp,now=Date.now();
  t.S.expenses=[{id:'ex1',amount:50,cat:'other',note:'Coffee',ts:now-1000},{id:'ex2',amount:70,cat:'other',note:'Taxi',ts:now-2000},{id:'ex3',amount:30,cat:'other',note:'Lunch',ts:now-3000,inst:'it1'}];
  t.S.debts=[{id:'db1',dir:'out',person:'Ali',amount:200,cur:'EGP',payments:[],adds:[],created:now},{id:'db2',dir:'in',person:'Omar',amount:90,cur:'EGP',payments:[],adds:[],created:now}];
  t.S.gams=[{id:'gm1',name:'Circle',inst:500,members:10,start:'2026-11',day:1,turn:3,turns:[3],created:now}];
  t.S.incomes=[{id:'in1',name:'Salary',amount:5000},{id:'in2',name:'Rent',amount:2000},{id:'in3',name:'Gig',amount:800}];
  t.S.goals=[{id:'gl1',name:'Car',target:10000,saved:0,e:'🎯',created:now}];
  t.S.fixed=[{id:'fx1',name:'Internet',cat:'other',amount:300,day:5,created:now}];
  t.S.plans=[{id:'pl1',name:'Party',cat:'other',amount:400,due:'2030-12-01',created:now}];
  t.S.insts=[{id:'is1',name:'Phone',party:'',rec:false,items:[{id:'it1',amount:100,due:'2030-12-01'},{id:'it2',amount:100,due:'2031-01-01'}],created:now}];
  t.S.trash=[]; t.S.instPays=[]; t.save(); t.closeSheets()});
const DELETE={xp:['delExpense','ex1'],debt:['deleteDebt','db1'],gam:['deleteGam','gm1'],inc:['deleteIncome','in2'],goal:['deleteGoal','gl1'],fix:['deleteFixed','fx1'],plan:['deletePlan','pl1'],inst:['deleteInst','is1']};
const ARR={xp:'expenses',debt:'debts',gam:'gams',inc:'incomes',goal:'goals',fix:'fixed',plan:'plans',inst:'insts'};
const ID={xp:'ex1',debt:'db1',gam:'gm1',inc:'in2',goal:'gl1',fix:'fx1',plan:'pl1',inst:'is1'};
const delAll=async p=>{for(const k of Object.keys(DELETE)){await p.evaluate(([f,id])=>testApp[f](id),DELETE[k]);await p.waitForTimeout(350)}};
const kinds=p=>p.evaluate(()=>testApp.S.trash.map(t=>t.k).sort());

for(const k of Object.keys(DELETE)) await run('Delete '+k+': the record goes to the trash, "undo" takes it out again',async p=>{
 await seed(p);
 await p.evaluate(([f,id])=>testApp[f](id),DELETE[k]); await p.waitForTimeout(350);
 let r=await p.evaluate(({a,id,k})=>({live:testApp.S[a].some(x=>x.id===id),tr:testApp.S.trash.filter(t=>t.k===k&&t.d.id===id).length}),{a:ARR[k],id:ID[k],k});
 assert.deepEqual(r,{live:false,tr:1});
 await p.evaluate(()=>document.querySelector('#toastAct').click()); await p.waitForTimeout(100);
 r=await p.evaluate(({a,id})=>({live:testApp.S[a].some(x=>x.id===id),tr:testApp.S.trash.length}),{a:ARR[k],id:ID[k]});
 assert.deepEqual(r,{live:true,tr:0})});

await run('Restore brings every kind back in its place and empties the trash',async p=>{
 await seed(p); await delAll(p);
 assert.deepEqual(await kinds(p),['debt','fix','gam','goal','inc','inst','plan','xp']);
 const ids=await p.evaluate(()=>testApp.S.trash.map(t=>t.id));
 for(const id of ids){assert.equal(await p.evaluate(id=>testApp.trashRestore(id),id),true)}
 const r=await p.evaluate(()=>({tr:testApp.S.trash.length,inc:testApp.S.incomes.map(x=>x.id).join(),exp:testApp.S.expenses.map(x=>x.id).sort().join(),debts:testApp.S.debts.map(x=>x.id).join(),insts:testApp.S.insts.length,gam:testApp.S.gams.length,goal:testApp.S.goals.length,fix:testApp.S.fixed.length,plan:testApp.S.plans.length,link:testApp.S.expenses.find(e=>e.id==='ex3').inst}));
 assert.deepEqual(r,{tr:0,inc:'in1,in2,in3',exp:'ex1,ex2,ex3',debts:'db1,db2',insts:1,gam:1,goal:1,fix:1,plan:1,link:'it1'})});

await run('A deleted installment keeps its link to the expenses it paid, and gets it back on restore',async p=>{
 await seed(p); await p.evaluate(()=>testApp.deleteInst('is1')); await p.waitForTimeout(100);
 assert.equal(await p.evaluate(()=>testApp.S.expenses.find(e=>e.id==='ex3').inst),undefined);
 assert.deepEqual(await p.evaluate(()=>testApp.S.trash[0].m),[['ex3','it1']]);
 await p.evaluate(()=>testApp.trashRestore(testApp.S.trash[0].id));
 assert.equal(await p.evaluate(()=>testApp.S.expenses.find(e=>e.id==='ex3').inst),'it1')});

await run('An expense whose account was deleted meanwhile is restored without the account link',async p=>{
 await seed(p);
 await p.evaluate(()=>{const t=testApp,x=t.S.expenses[0]; x.acc='gone1'; x.accAmt=50; t.delExpense('ex1')}); await p.waitForTimeout(350);
 await p.evaluate(()=>testApp.trashRestore(testApp.S.trash[0].id));
 const e=await p.evaluate(()=>testApp.S.expenses.find(x=>x.id==='ex1'));
 assert.equal(e.acc,undefined); assert.equal(e.accAmt,undefined); assert.equal(e.amount,50)});

await run('Delete forever and empty remove the entries',async p=>{
 await seed(p); await delAll(p);
 await p.evaluate(()=>testApp.trashForever(testApp.S.trash[0].id));
 assert.equal(await p.evaluate(()=>testApp.S.trash.length),7);
 await p.evaluate(()=>testApp.trashEmpty());
 assert.equal(await p.evaluate(()=>testApp.S.trash.length),0)});

await run('The receipt photo stays while the expense is in the trash and goes when it is deleted for good',async p=>{
 await seed(p);
 await p.evaluate(async()=>{await testApp.rcPut('ex1',new Blob(['img'],{type:'image/jpeg'})); testApp.RC.ids.add('ex1')});
 await p.evaluate(()=>testApp.delExpense('ex1')); await p.waitForTimeout(350);
 await p.evaluate(()=>testApp.rcPrune()); await p.waitForTimeout(400);
 assert.equal(await p.evaluate(()=>testApp.rcGet('ex1').then(b=>!!b)),true,'receipt kept in the trash');
 await p.evaluate(()=>testApp.trashRestore(testApp.S.trash[0].id));
 await p.evaluate(()=>testApp.delExpense('ex1')); await p.waitForTimeout(350);
 await p.evaluate(()=>testApp.trashForever(testApp.S.trash[0].id)); await p.waitForTimeout(400);
 assert.equal(await p.evaluate(()=>testApp.rcGet('ex1').then(b=>!!b)),false,'receipt removed with the entry')});

await run('Older than 30 days is dropped; the 150 limit drops the oldest',async p=>{
 await seed(p); await delAll(p);
 await p.evaluate(({DAY})=>{testApp.S.trash[0].ts=Date.now()-31*DAY;testApp.S.trash[1].ts=Date.now()-29*DAY},{DAY});
 assert.equal(await p.evaluate(()=>testApp.trashSweep()),true);
 assert.equal(await p.evaluate(()=>testApp.S.trash.length),7);
 const r=await p.evaluate(()=>{testApp.S.trash=[]; for(let i=0;i<155;i++){testApp.S.expenses.push({id:'z'+i,amount:1,cat:'other',note:'',ts:Date.now()});testApp.trashPut('xp',testApp.S.expenses.pop(),0)} return [testApp.S.trash.length,testApp.S.trash[0].d.id,testApp.S.trash[149].d.id]});
 assert.deepEqual(r,[150,'z154','z5'])});

await run('The trash survives a reload; broken or expired entries are cleaned on load',async p=>{
 await seed(p); await delAll(p);
 await p.evaluate(({DAY})=>{const t=testApp; t.S.trash.push({id:'bad1',k:'zzz',ts:Date.now(),d:{}},{id:'bad2',k:'xp',ts:Date.now(),d:{amount:-5}},{id:'bad3',k:'xp',ts:0,d:{id:'q',amount:5,ts:1}}); t.save()},{DAY});
 await p.reload(); await p.waitForFunction(()=>!!window.testApp);
 assert.deepEqual(await kinds(p),['debt','fix','gam','goal','inc','inst','plan','xp'])});

await run('The trash is not in the backup, and restoring a backup empties it',async p=>{
 await seed(p); await delAll(p);
 const keys=await p.evaluate(()=>Object.keys(testApp.backupData()).join());
 assert(!/trash/.test(keys));
 await p.evaluate(()=>{testApp.applyBackup(testApp.backupData(),Date.now())});
 assert.equal(await p.evaluate(()=>testApp.S.trash.length),0)});

await run('Wiping expenses and obligations also clears their trash; undo brings it back',async p=>{
 await seed(p); await delAll(p);
 await p.evaluate(()=>testApp.setGo('data'));
 await p.evaluate(()=>document.querySelector('#wipeConfirm').click()); await p.waitForTimeout(200);
 const k1=await kinds(p); assert.deepEqual(k1,['fix','goal','inc'],'only the kinds that were not wiped stay');
 await p.evaluate(()=>document.querySelector('#toastAct').click()); await p.waitForTimeout(200);
 assert.deepEqual(await kinds(p),['debt','fix','gam','goal','inc','inst','plan','xp'],'undo brings the trash back')});

for(const lang of ['eg','ar','en'])for(const width of [320,390]) await run('Trash sheet '+lang+' '+width+': row, list, restore, delete twice, empty',async p=>{
 await seed(p); await delAll(p);
 await p.evaluate(()=>testApp.go('settings')); await p.evaluate(()=>testApp.setGo(null));
 const sub=await p.evaluate(()=>{testApp.renderSetHome();return document.querySelector('#ss-trash').textContent});
 assert(sub.length>0&&!/undefined/.test(sub));
 await p.evaluate(()=>document.querySelector('#si-trash').click()); await p.waitForTimeout(250);
 let s=await p.evaluate(()=>({open:document.querySelector('#trashSheet').classList.contains('open'),rows:document.querySelectorAll('#trashList .tr-row').length,text:document.querySelector('#trashSheet').innerText,over:document.documentElement.scrollWidth>innerWidth+1||document.querySelector('#trashSheet').scrollWidth>document.querySelector('#trashSheet').clientWidth+1,emptyVisible:!document.querySelector('#trashEmpty').hidden}));
 assert.equal(s.open,true); assert.equal(s.rows,8); assert.equal(s.over,false); assert.equal(s.emptyVisible,true);
 if(lang==='en') assert(!/[\u0600-\u06FF]/.test(s.text),'Arabic text left on the English screen: '+s.text.match(/[\u0600-\u06FF][^\n]*/));
 if(lang==='ar') assert(!/اتحذف|رجّع|امسح|دوس تاني|اتفضّت|فاضل/.test(s.text),'colloquial text on the Modern Arabic screen: '+s.text);
 await p.evaluate(()=>document.querySelector('#trashList [data-tr="res"]').click()); await p.waitForTimeout(150);
 assert.equal(await p.evaluate(()=>[document.querySelectorAll('#trashList .tr-row').length,testApp.S.trash.length].join()),'7,7');
 const b='#trashList [data-tr="del"]';
 await p.evaluate(b=>document.querySelector(b).click(),b); assert.equal(await p.evaluate(()=>testApp.S.trash.length),7,'first tap only asks');
 await p.evaluate(b=>document.querySelector(b).click(),b); assert.equal(await p.evaluate(()=>testApp.S.trash.length),6);
 await p.evaluate(()=>document.querySelector('#trashEmpty').click()); assert.equal(await p.evaluate(()=>testApp.S.trash.length),6,'empty asks first');
 await p.evaluate(()=>document.querySelector('#trashEmpty').click()); await p.waitForTimeout(100);
 s=await p.evaluate(()=>({n:testApp.S.trash.length,none:!!document.querySelector('#trashList .tr-none'),btn:document.querySelector('#trashEmpty').hidden}));
 assert.deepEqual(s,{n:0,none:true,btn:true});
 await p.evaluate(()=>document.querySelector('#trashClose').click()); await p.waitForTimeout(200);
 assert.equal(await p.evaluate(()=>document.querySelector('#trashSheet').classList.contains('open')),false)},lang,width);

await run('Settings search finds the trash row',async p=>{
 await p.evaluate(()=>testApp.go('settings')); await p.evaluate(()=>testApp.setGo(null));
 await p.fill('#setQ','سلة'); await p.waitForTimeout(150);
 assert.equal(await p.evaluate(()=>[...document.querySelectorAll('#setResList .set-item b')].some(b=>/سلة المحذوفات/.test(b.textContent))),true)});

}finally{await browser.close();fs.writeFileSync(path.join(__dirname,'trash-results.json'),JSON.stringify(results,null,2));}
if(results.some(r=>!r.pass))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
