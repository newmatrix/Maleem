/* Static check of the app code (the inline <script> blocks of www/index.html): undefined names, duplicate keys,
   unreachable code, const reassignment, unused variables ... Errors fail the run.   node tests/lint.cjs */
const fs=require('fs'),path=require('path');
const {ESLint}=require('eslint'); const globals=require('globals');
const file=path.resolve(__dirname,'../app/src/main/assets/www/index.html');
const html=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
const blocks=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>({code:m[1],line:html.slice(0,m.index).split('\n').length}));
const rules={'no-undef':'error','no-dupe-keys':'error','no-dupe-args':'error','no-unreachable':'error','no-redeclare':'error','no-func-assign':'error','no-const-assign':'error',
 'no-self-assign':'error','no-unsafe-finally':'error','use-isnan':'error','valid-typeof':'error','no-dupe-else-if':'error','no-duplicate-case':'error','no-sparse-arrays':'error',
 'no-loss-of-precision':'error','no-unsafe-negation':'error','getter-return':'error','no-setter-return':'error','no-import-assign':'error','no-cond-assign':'error',
 'no-unused-vars':['error',{args:'none',caughtErrors:'none'}]};
const eslint=new ESLint({overrideConfigFile:true,overrideConfig:[{files:['**/*.js'],languageOptions:{ecmaVersion:2023,sourceType:'script',
 globals:{...globals.browser,AndroidBridge:'readonly',I18N:'readonly',firebase:'readonly',jspdf:'readonly',html2canvas:'readonly',fflate:'readonly',pdfjsLib:'readonly'}},rules}]});
(async()=>{let errors=0;
 for(const [i,b] of blocks.entries()){ const [r]=await eslint.lintText(b.code,{filePath:`inline-script-${i+1}.js`});
  for(const m of r.messages){errors++;console.log(`index.html:${b.line+m.line-1}:${m.column}  ${m.message}  (${m.ruleId})`)} }
 if(errors){console.log(`FAIL lint: ${errors} problem(s)`);process.exit(1)}
 console.log(`PASS lint: ${blocks.length} inline scripts, no problems`)})().catch(e=>{console.error(e);process.exit(1)});
