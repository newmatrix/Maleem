/* Source-level regression for compact expense source capsule; browser interaction
   scenarios additionally verified on the isolated Chrome/Playwright preview. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const src=fs.readFileSync(path.join(__dirname,'../app/src/main/assets/www/index.html'),'utf8');
const tests=[];
function check(name,fn){try{fn();tests.push({name,pass:true});console.log('PASS',name)}catch(e){tests.push({name,pass:false,error:String(e.stack||e)});console.error('FAIL',name,e.message)}}
check('compact source capsule appears in header after date and cash',()=>{
 const head=src.slice(src.indexOf('<div class="head-pills">'),src.indexOf('</div></div>',src.indexOf('<div class="head-pills">')));
 assert.match(head,/id="datePill"[\s\S]*id="payPill"[\s\S]*id="poolPill"/);
 assert.match(head,/id="poolPill"[^>]+hidden/);
});
check('large expense source selector is completely removed',()=>{assert(!src.includes('id="expPoolRow"'));assert(!src.includes('id="expPoolHint"'));assert(!src.includes('pool-buttons'))});
check('source selection remains two mutually exclusive options',()=>{
 assert(src.includes('id="poolMenu" role="menu"'));assert(src.includes('data-pool="budget"'));assert(src.includes('data-pool="free"'));
 assert(src.includes('aria-checked="${selPool'));
});
check('source capsule disappears with no free income, preserving historic free edits',()=>{
 assert.match(src,/if\(!hasFree&&!editId&&selPool==='free'\) selPool='budget'/);
 assert.match(src,/pill\.hidden=!show/);assert.match(src,/show=hasFree\|\|\(!!editId&&selPool==='free'\)/);
});
check('pool selection remains part of saved expense record',()=>{
 assert(src.includes("if(selPool==='free')e.pool='free'"));
 assert(src.includes("if(x.pool==='free') e.pool='free'"));
});
check('date/payment/kind/account menus close source dropdown',()=>{
 assert(src.includes("closeDateMenu(); closeExpensePoolMenu();"));
 assert(src.includes("closePayMenu(); closeDateMenu(); closeExpensePoolMenu();"));
 assert(src.includes("closePayMenu(); closeDateMenu(); closeKindMenu(); closeExpensePoolMenu();"));
});
check('responsive header keeps capsule beside date and cash',()=>{
 assert(src.includes('.head-pills.has-pool,.head-pills.has-pool.three'));
 assert(src.includes('flex-wrap:wrap;gap:5px;max-width:none'));
 assert(src.includes('#poolPill[hidden]{display:none!important}'));
});
check('source selector supports accessibility and dismissal',()=>{
 assert(src.includes('id="poolPill" data-pool="budget" aria-haspopup="menu" aria-expanded="false"'));
 assert(src.includes("e.key==='Escape'"));
 assert(src.includes("$('#poolPill').focus()"));
});
fs.writeFileSync(path.join(__dirname,'income-pool-capsule-results.json'),JSON.stringify(tests,null,2)+'\n');
if(tests.some(x=>!x.pass))process.exitCode=1;
