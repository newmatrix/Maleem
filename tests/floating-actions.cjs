const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
let pw;try{pw=require('playwright')}catch{pw=require(process.env.PLAYWRIGHT_MODULE)}
const root=path.join(__dirname,'../app/src/main/assets/www');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const at=html.lastIndexOf('})();');
html=html.slice(0,at)+'window.peekTest={go,closeSheets,runQuickAdd,get S(){return S}};\n'+html.slice(at);
const results=[];
(async()=>{
 const browser=await pw.chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{})});
 try{for(const [lang,width] of [['eg',320],['ar',390],['en',360],['en',800]]){
  const p=await browser.newPage({viewport:{width,height:800},reducedMotion:'reduce'}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/*',r=>{const u=new URL(r.request().url());if(u.pathname==='/')return r.fulfill({contentType:'text/html',body:html});try{return r.fulfill({body:fs.readFileSync(path.join(root,u.pathname)),contentType:u.pathname.endsWith('.js')?'application/javascript':u.pathname.endsWith('.css')?'text/css':'application/octet-stream'})}catch{return r.abort()}});
  await p.addInitScript(lang=>{localStorage.setItem('maleem.v1',JSON.stringify({onboarded:true,lang,theme:'light',profile:{name:'تجربة'},currency:'EGP',budget:12000,expenses:[]}));sessionStorage.setItem('maleem.splashed','1');window.voiceCalls=0;window.AndroidBridge={startVoice:()=>window.voiceCalls++,cancelVoice:()=>{},takeCaptures:()=>'[]',captureState:()=>'{"on":false}',updateState:()=>'{"enabled":false}',ratesState:()=>'{}',syncWidget:()=>{},syncReminders:()=>{},captureIncoming:()=>{},setBars:()=>{},setSecure:()=>{},haptic:()=>{}}},lang);
  try{
   await p.goto('http://maleem.test/');await p.waitForFunction(()=>!!window.peekTest);
   const edge=Math.max(0,(width-520)/2);
   async function tap(id){const r=await p.locator(id).boundingBox();await p.mouse.click(Math.max(edge+10,r.x+10),r.y+r.height/2)}
   async function folded(){assert.equal(await p.locator('html').evaluate(e=>e.classList.contains('fab-awake')),false);for(const id of ['#fab','#micFab']){const r=await p.locator(id).boundingBox();assert(Math.abs(r.x+r.width/2-edge)<1);assert.equal(await p.locator(id).evaluate(e=>getComputedStyle(e).opacity),'0.38')}}
   await folded();
   for(const [section,sheet] of [['expenses','#sheet'],['debts','#debtSheet'],['gams','#gamSheet'],['insts','#instSheet']]){
    await p.evaluate(t=>peekTest.go(t==='expenses'?'expenses':'debts'),section);
    if(section!=='expenses')await p.locator('#obSeg [data-ob="'+section+'"]').click();
    // Let the previous action's inactivity timer expire when only the subtab changes.
    await p.waitForFunction(()=>!document.documentElement.classList.contains('fab-awake'));
    await tap('#fab');assert.equal(await p.locator(sheet).evaluate(e=>e.classList.contains('open')),false);
    assert.equal(await p.locator('html').evaluate(e=>e.classList.contains('fab-awake')),true);
    await p.locator('#fab').click();assert.equal(await p.locator(sheet).evaluate(e=>e.classList.contains('open')),true);
    await p.evaluate(()=>peekTest.closeSheets());
   }
   await p.waitForTimeout(3100);await folded();
   await tap('#micFab');assert.equal(await p.evaluate(()=>voiceCalls),0);
   await p.locator('#micFab').click();assert.equal(await p.evaluate(()=>voiceCalls),1);
   await p.evaluate(()=>peekTest.closeSheets());
   await p.evaluate(()=>peekTest.go('settings'));assert.equal(await p.locator('#fab').isVisible(),false);
   await p.evaluate(()=>peekTest.go('expenses'));await folded();
   // Native shortcuts must still start voice on their single programmatic click.
   await p.evaluate(()=>window.__quickVoice());await p.waitForTimeout(500);
   assert.equal(await p.evaluate(()=>voiceCalls),2);
   assert.deepEqual(errors,[]);results.push({name:`Floating actions ${lang} ${width}px: reveal, routes, timeout, voice and shortcut`,pass:true});
  }catch(e){results.push({name:`Floating actions ${lang} ${width}px`,pass:false,error:e.stack})}finally{await p.close()}
 }}finally{await browser.close();fs.writeFileSync(path.join(__dirname,'floating-actions-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));if(results.some(r=>!r.pass))process.exitCode=1}
})().catch(e=>{console.error(e);process.exitCode=1});
