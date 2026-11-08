/* Translation coverage: every Arabic message in index.html must have an English translation, and every Egyptian-dialect message
   must have a Modern Standard Arabic one. Messages that are still untranslated are listed in i18n-baseline.json (voice and search
   keywords, fragments of longer sentences); a NEW untranslated message fails this test.
   node tests/i18n-coverage.cjs            check
   node tests/i18n-coverage.cjs --update   rewrite the baseline after you added translations or genuinely non-UI strings */
const fs=require('fs'),path=require('path');
const acorn=require('acorn'),walk=require('acorn-walk'),parse5=require('parse5');
const W=path.resolve(__dirname,'../app/src/main/assets/www/');
const AR=/[\u0600-\u06FF]/, PH='\u0001', BASE=path.join(__dirname,'i18n-baseline.json');
const html=fs.readFileSync(path.join(W,'index.html'),'utf8').replace(/\r\n/g,'\n');
/* 1) every Arabic message: static markup, attributes, string literals, concatenations and template literals (a placeholder replaces each variable part) */
const msgs=new Set();
const add=s=>{s=s.replace(/\u200E/g,'').replace(/\s+/g,' ').trim();if(s&&AR.test(s))msgs.add(s)};
const addSegs=s=>s.replace(/<[^>]*>/g,'\u0002').split('\u0002').forEach(add);
const scripts=[];
(function rec(n){if(n.nodeName==='script'){scripts.push((n.childNodes||[]).map(c=>c.value||'').join(''));return}
 if(n.nodeName==='style')return; if(n.nodeName==='#text')add(n.value);
 (n.attrs||[]).forEach(a=>{if(['placeholder','aria-label','title','alt','aria-description'].includes(a.name))add(a.value)});
 (n.childNodes||[]).forEach(rec); if(n.content)rec(n.content)})(parse5.parse(html));
for(const code of scripts){ if(!AR.test(code))continue; const ast=acorn.parse(code,{ecmaVersion:2023,sourceType:'script'});
 const flat=(n,o)=>{if(n.type==='BinaryExpression'&&n.operator==='+'){flat(n.left,o);flat(n.right,o)}else o.push(n)};
 const text=n=>{if(n.type==='Literal'&&typeof n.value==='string')return n.value;
  if(n.type==='TemplateLiteral'){let s='';n.quasis.forEach((q,i)=>{s+=q.value.cooked;if(i<n.expressions.length)s+=PH});return s}
  if(n.type==='BinaryExpression'&&n.operator==='+'){const o=[];flat(n,o);return o.map(text).join('')} return PH};
 walk.fullAncestor(ast,(node,_s,anc)=>{const p=anc.length>1?anc[anc.length-2]:null;
  if(p&&p.type==='BinaryExpression'&&p.operator==='+'&&(p.left===node||p.right===node))return;
  let s=null; if(node.type==='Literal'&&typeof node.value==='string')s=node.value;
  else if(node.type==='TemplateLiteral'||(node.type==='BinaryExpression'&&node.operator==='+'))s=text(node);
  if(s!=null&&AR.test(s))addSegs(s)})}
/* 2) the app's own translation rules, copied from index.html (exact text, then " · " parts, then patterns, then currency symbols) */
function load(l){global.window={};const p=path.join(W,'locales',l+'.js');delete require.cache[require.resolve(p)];require(p);const d=window.I18N[l];
 return {sym:d.sym||null,x:new Map(Object.entries(d.x||{})),p:(d.p||[]).map(([s,r])=>[new RegExp('^'+s+'$'),r])}}
function mk(D){const symRe=D.sym?new RegExp('(?<![\\u0600-\\u06FF])('+Object.keys(D.sym).map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')(?![\\u0600-\\u06FF])','g'):null;
 function trKey(k,depth){let v=D.x.get(k);if(v!=null)return v;if(depth>4||!AR.test(k))return null;
  if(k.includes(' · ')){const ps=k.split(' · '),out=ps.map(p=>{const t=trKey(p,depth+1);return t===p?null:t});if(out.some(x=>x!=null))return ps.map((p,i)=>out[i]!=null?out[i]:p).join(' · ')}
  for(const [re,r] of D.p){const m=k.match(re);if(m){const v=r.replace(/\$(\d)/g,(_,i)=>{const g=m[+i]||'';const t=g&&g!==k?trKey(g,depth+1):null;return t!=null?t:g});if(v!==k)return v}}
  return null}
 return s=>{if(!s||!AR.test(s))return null;const k=s.replace(/\u200E/g,'').replace(/\s+/g,' ').trim();if(/^فاضل (\d+) يوم$/.test(k))return 'days';
  let v=trKey(k,0);if(v!=null&&symRe)v=v.replace(symRe,m=>D.sym[m]||m);return (v==null||v===k)?null:v}}
/* 3) Egyptian-dialect markers (whole words, diacritics ignored) */
const strip=s=>s.replace(/[\u064B-\u0652\u0640]/g,'');
const DIALECT=new Set('مش ده دي دول دلوقتي دلوقت النهارده النهاردة امبارح بكرة بكره عشان علشان اللي إزاي ازاي فين كده كدا بقى بقت بقي لسه لسة برضه برضو قوي أوي اوي حاجة حاجات شوية كام إيه ايه دوس دوسة اختار جرّب جرب سيبه سيبها خلي خلّي مفيش مفيهوش مفيهاش متتلخبطش يتلخبط اتحفظ اتحفظت اتحذف اتحذفت اتسجل اتسجّل اتعدل اتعدّل اتعدلت اتضاف اتضافت اتمسح اتمسحت اتقفل اتقفلت اتفعل اتلغى اتنقل اتنقلت اتغير اتغيرت اتباع اتدفع اتخصمت اتسحبت اتجاهلت اتشال اتشالت اتحوّلت اتحدّث اتظبط اتعملت اتعمل اتنسخت اتفصلوا اتربط اتفك اترجعت اترفعت اتملت اتبعت اتصرف بيتحسب بتتحفظ بيتسجل بتتسجل بيشتغل بيخمّن بنحسب بنقفل بنفتحلك بنرفع بننزّل بجيب بسمعك بقرا بدوّر هيتسجل هتحفظ هنعمل هنبهك هنطلب هنسجّل هنلقط هفكرك هيفضل هتفضل هيبقى هتبقى هيزيد هيقل هتزيد هتقدر هيتحسب هتتحسب هتصرف هتدفع هتقبض هيظهر هتظهر هيوصلك هيشارك هيتكرر هيتمسح هيفضلوا هتتحول هتتنقل هيرجعلك يرجعلك ترجعلك وصلك وصلني عايز عاوز عندك ليك تقدر مينفعش ميعاد ميعادين مبيشوف موبايل الموبايل موبايلك النت الإنترنت أونلاين مستني مستنية بتاعتك بتاعك بتاعة بتاعت بتتجهز بيتجهز بيتزامن بتبدأ بتتكرر بتتنقل بتنقل بتتغير بيحمّل بنحفظ سمعتش ماسمحش معرفناش مقدرتش مكانش محدش مكنتش مصرفتش مسجلتهاش فاتوا فات قبلهم دول جوه تاني التاني التانيين بتاع بتوع الجاي الجاية الجايي الجايه قوي ازاي اللى دا دى'.split(' ').map(strip));
const dialectal=s=>strip(s).split(/[\s·،,.:;؟?!()«»"“”\-–—+×=/\\\u0001<>]+/).filter(w=>w&&DIALECT.has(w));
function check(){
 const en=mk(load('en')),ar=mk(load('ar')),needEn=[],needAr=[];
 for(const s of msgs){ if(!AR.test(s.replace(/\u0001/g,'')))continue; if(s.replace(/\u0001/g,'').length<3)continue;
  const a=s.replace(/\u0001/g,'5'),b=s.replace(/\u0001/g,'Ali'),ea=en(a),eb=en(b);
  if(!((ea&&!AR.test(ea))||(eb&&!AR.test(eb)))) needEn.push(s);
  if(dialectal(s).length&&!ar(a)&&!ar(b)) needAr.push(s)}
 return {en:needEn.sort(),ar:needAr.sort()}}
const now=check();
if(process.argv.includes('--update')){fs.writeFileSync(BASE,JSON.stringify(now,null,1)+'\n');console.log('baseline written: en',now.en.length,'ar',now.ar.length);process.exit(0)}
const base=JSON.parse(fs.readFileSync(BASE,'utf8'));let bad=0;
for(const l of ['en','ar']){const known=new Set(base[l]),fresh=now[l].filter(s=>!known.has(s));
 if(fresh.length){bad++;console.log('FAIL new '+(l==='en'?'English':'Modern Standard Arabic')+' gaps: '+fresh.length);fresh.slice(0,25).forEach(s=>console.log('   '+s.replace(/\u0001/g,'§').slice(0,140)))}
 else console.log('PASS '+(l==='en'?'English':'Modern Standard Arabic')+' coverage: no new untranslated message ('+now[l].length+' known non-UI or fragment entries)')}
const gone=['en','ar'].reduce((n,l)=>n+base[l].filter(s=>!now[l].includes(s)).length,0);
if(gone)console.log('note: '+gone+' baseline entries are now translated or gone; run with --update to shrink the baseline');
if(bad){console.log('\nAdd the translations in i18n-src/tr/*.txt and run node tools/build-locales.cjs, or (for a non-UI string) run: node tests/i18n-coverage.cjs --update');process.exit(1)}
