/** Regression tests for salary budget vs free-income pools. No browser/network required. */
const fs=require('node:fs'), path=require('node:path'), assert=require('node:assert/strict'), vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'../app/src/main/assets/www/index.html'),'utf8');
const tests=[];
function check(name,cb){try{cb();tests.push({name,pass:true})}catch(e){tests.push({name,pass:false,error:String(e.stack||e)})}}
function section(start,end){const i=src.indexOf(start);if(i<0)throw new Error('Not found: '+start);const j=src.indexOf(end,i+start.length);if(j<0)throw new Error('End not found: '+end);return src.slice(i,j)}
const model=section('function budOf(P){','/* Installments:');
const helpers=section('const ofPeriod=P=>','function daysLeft(P)');
check('income allocation uses a 2-step prompt',()=>{for(const id of ['incomeBudgetYes','incomeBudgetNo','incomeBudgetOnce','incomeBudgetRecurring','incomeBudgetStepTwo'])assert(src.includes(`id="${id}"`))});
check('free income capsule is next to the home date',()=>assert.match(section('<div class="home-date-line">','</div></div>'),/id="todayLabel"[\s\S]+id="freeIncomePill"/));
check('expense pool selector has exactly two sources',()=>{assert(src.includes('data-pool="budget"'));assert(src.includes('data-pool="free"'));assert(src.includes("if(selPool==='free')e.pool='free'"))});
check('sanitizers retain source and expense pool fields',()=>{assert(src.includes("if(x.pool==='free') e.pool='free'"));assert(src.includes("o.budgetUse=x.budgetUse"))});
check('backup and currency conversion preserve the income/expense amounts',()=>{assert(src.includes('expenses:S.expenses'));assert(src.includes('inflows:S.inflows'));assert(src.includes('S.inflows.forEach(x=>{x.amount=sc(x.amount)'))});
check('one-time bonus leaves the next period budget unchanged',()=>{
 const S={budget:10000,bMoves:[],inflows:[{amount:300,budgetUse:'once',budgetKey:'2026-11-01'}]};
 const sandbox={S,r2:n=>Math.round(n*100)/100,periodOf:()=>({key:'2026-11-01'})};vm.runInNewContext(model+';this.run=budOf',sandbox);
 assert.equal(sandbox.run({key:'2026-11-01'}),10300);assert.equal(sandbox.run({key:'2026-12-01'}),10000)
});
check('recurring bonus extends budget without fabricating income',()=>{
 const S={budget:10000,bMoves:[],inflows:[{amount:300,budgetUse:'recurring',budgetKey:'2026-11-01'}]};
 const sandbox={S,r2:n=>Math.round(n*100)/100,periodOf:()=>({key:'2026-11-01'})};vm.runInNewContext(model+';this.run=budOf',sandbox);
 assert.equal(sandbox.run({key:'2026-10-01'}),10000);assert.equal(sandbox.run({key:'2026-11-01'}),10300);assert.equal(sandbox.run({key:'2026-12-01'}),10300);assert.equal(S.inflows.length,1)
});
check('free expenses decrease only the free pool',()=>{
 const S={expenses:[{amount:100,ts:200,pool:'free'},{amount:200,ts:200}],inflows:[{amount:300,ts:200,budgetUse:'free'}]};
 const sandbox={S,r2:n=>Math.round(n*100)/100,sum:a=>a.reduce((n,x)=>n+x.amount,0)};
 vm.runInNewContext(helpers+';this.calc={budgetSpent,freeIncomeTotal,freeExpenseTotal,freeBalance}',sandbox);
 const P={start:100,next:300};assert.equal(sandbox.calc.budgetSpent(P),200);assert.equal(sandbox.calc.freeBalance(P),200)
});
fs.writeFileSync(path.join(__dirname,'income-pools-static-results.json'),JSON.stringify(tests,null,2));
console.log(tests.map(x=>`${x.pass?'PASS':'FAIL'} ${x.name}${x.error?'\n'+x.error:''}`).join('\n'));
if(tests.some(x=>!x.pass))process.exitCode=1;
