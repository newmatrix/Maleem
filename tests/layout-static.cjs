/* Static layout guard (no browser needed): section titles on the Me > Accounts and Budget pages
   must sit at the reading-direction start, so the card header may not use justify-content:flex-end. */
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../app/src/main/assets/www/index.html'),'utf8').replace(/\r\n?/g,'\n');
const css=[...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('\n').replace(/\/\*[\s\S]*?\*\//g,'');
const rules=[...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(m=>({sel:m[1].trim(),body:m[2]}));
const results=[];
function check(name,fn){try{fn();results.push({name,pass:true});console.log('PASS',name)}catch(e){results.push({name,pass:false,error:e.message});console.error('FAIL',name,e.message)}}
for(const page of ['accounts','budget']){
  check(`Me ${page} page: card title is shown and not pushed to the end side`,()=>{
    const sel=`.me-page[data-mepage="${page}"]>.card>.card-h`;
    const shown=rules.some(r=>r.sel.includes(`${sel}>h3`)&&/display:\s*block/.test(r.body));
    assert.ok(shown,'title rule missing');
    const last=rules.filter(r=>r.sel.split(',').map(s=>s.trim()).includes(sel)).pop();
    assert.ok(last,'header alignment rule missing');
    assert.match(last.body,/justify-content:\s*space-between/);
    assert.doesNotMatch(last.body,/flex-end/);
  });
}
fs.writeFileSync(path.join(__dirname,'layout-static-results.json'),JSON.stringify(results,null,2));
if(results.some(r=>!r.pass))process.exitCode=1;
