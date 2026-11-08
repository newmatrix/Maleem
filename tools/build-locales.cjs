#!/usr/bin/env node
/* Builds app/src/main/assets/www/locales/en.js and ar.js.
     file = i18n-src/<lang>.base.js            (the hand-written part: edit it for a one-off change)
          + a generated block made from i18n-src/tr/<lang>-*.txt   (the easy way to add translations)
   Line format in i18n-src/tr/*.txt:     Egyptian text => translation
     §  any text           №  a number          (each one becomes a capture group, in order)
     in the translation:  § or № take the captures in order, $1 $2 … pick one explicitly
     re:<regex> => translation            a raw regular expression (the app anchors it with ^ $)
     a line with no § or № is an exact-text entry; a line starting with # is a comment
   Rules the generated block follows: an exact entry that already exists in the base file is kept as it is (never overridden);
   rules with 5+ literal characters go before the older rules, shorter ones after, then ALL rules are sorted most-specific-first.
     node tools/build-locales.cjs           write en.js and ar.js
     node tools/build-locales.cjs --check   fail if they are not what the sources build to (used by CI) */
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.resolve(__dirname,'..'), SRC=path.join(ROOT,'i18n-src'), OUT=path.join(ROOT,'app/src/main/assets/www/locales');
const NUM='(\\d[\\d,.٬٫]*)';
const esc=s=>s.replace(/([.*+?^${}()|[\]\\/])/g,'\\$1');
function baseDict(lang,text){const w={I18N:{}};vm.runInNewContext(text,{window:w});const d=w.I18N[lang];return {x:d.x||{}}}
function build(lang){
  const base=fs.readFileSync(path.join(SRC,lang+'.base.js'),'utf8'), ex=baseDict(lang,base).x;
  const files=fs.readdirSync(path.join(SRC,'tr')).filter(f=>f.startsWith(lang+'-')&&f.endsWith('.txt')).sort();
  const xs={}, ps=[], errors=[];
  for(const f of files){ fs.readFileSync(path.join(SRC,'tr',f),'utf8').split(/\r?\n/).forEach((raw,n)=>{
    const line=raw.trim(); if(!line||line.startsWith('#'))return; const at=line.indexOf(' => ');
    if(at<0){errors.push(`${f}:${n+1}: no " => "`);return}
    const a=line.slice(0,at).trim(), e=line.slice(at+4).trim();
    if(a.startsWith('re:')){const rx=a.slice(3).trim();ps.push({lit:rx.replace(/\(.*?\)|\\./g,'').length,rx,en:e});return}
    if(a.includes('§')||a.includes('№')){ let rx='',k=0; for(const part of a.split(/(§|№)/)){ if(part==='§'){rx+='(.+?)';k++} else if(part==='№'){rx+=NUM;k++} else rx+=esc(part) }
      let c=0; const en=e.replace(/§|№/g,()=>'$'+(++c)); const used=[...en.matchAll(/\$(\d)/g)].map(m=>+m[1]);
      if(used.length&&Math.max(...used)>k) errors.push(`${f}:${n+1}: the translation has more placeholders than the Egyptian text`);
      ps.push({lit:a.replace(/§|№/g,'').length,rx,en}); return }
    if(Object.prototype.hasOwnProperty.call(ex,a)) return;               // existing entries win
    if(Object.prototype.hasOwnProperty.call(xs,a)&&xs[a]!==e) errors.push(`${f}:${n+1}: "${a.slice(0,40)}" is defined twice with different translations`);
    xs[a]=e }) }
  const sorted=ps.map((p,i)=>({...p,i})).sort((p,q)=>q.lit-p.lit||p.i-q.i), seen=new Set(), front=[], back=[];
  for(const p of sorted){ if(seen.has(p.rx))continue; seen.add(p.rx); (p.lit>=5?front:back).push([p.rx,p.en]) }
  return {base,xs,front,back,errors}
}
function render(lang,b){
  const sym=lang==='en'?JSON.parse(fs.readFileSync(path.join(SRC,'sym.json'),'utf8')):null, W='window.I18N.'+lang;
  const L=[`/* ===== Generated from i18n-src/tr/${lang}-*.txt by tools/build-locales.cjs: do not edit here ===== */`,
   `Object.assign(${W}.x,${JSON.stringify(b.xs)});`,
   `${W}.p.unshift(...${JSON.stringify(b.front)});`,
   `${W}.p.push(...${JSON.stringify(b.back)});`];
  if(sym) L.push(`${W}.sym=${JSON.stringify(sym)};`);
  L.push(`(function(d){const lit=s=>s.replace(/\\\\.|\\((?:[^()]|\\([^()]*\\))*\\)[+*?]?|\\[[^\\]]*\\][+*?]?/g,'').length;d.p.sort((a,b)=>lit(b[0])-lit(a[0]))})(${W}); /* most specific rule first */`);
  if(lang==='en') L.push(`(function(d){const f=s=>s.replace(/Instalment/g,'Installment').replace(/instalment/g,'installment');for(const k in d.x)d.x[k]=f(d.x[k]);d.p.forEach(r=>{r[1]=f(r[1]).replace(/^Income received /,'Received income ')})})(${W});`);
  return b.base.replace(/\r?\n$/,'')+'\r\n'+L.join('\r\n')+'\r\n'
}
let bad=0;
for(const lang of ['en','ar']){ const b=build(lang); if(b.errors.length){console.error(b.errors.join('\n'));process.exit(1)}
  const out=render(lang,b), file=path.join(OUT,lang+'.js');
  if(process.argv.includes('--check')){ const cur=fs.existsSync(file)?fs.readFileSync(file,'utf8'):''; if(cur!==out){bad++;console.error(`locales/${lang}.js is not what i18n-src builds to. Run: node tools/build-locales.cjs   (edit i18n-src/, not locales/)`)} else console.log(`OK: locales/${lang}.js is up to date`) }
  else {fs.writeFileSync(file,out);console.log(`wrote locales/${lang}.js: ${Object.keys(b.xs).length} exact entries, ${b.front.length+b.back.length} rules`)} }
process.exit(bad?1:0);
