#!/usr/bin/env node
/* Builds app/src/main/assets/www/index.html from the pieces in src-web/.
   The app itself still ships ONE index.html (same inline <style> and <script>, same CSP hashes, same tests): src-web/ only
   makes the 10,000-line file easier to read and edit.
     node tools/build-www.cjs           write index.html
     node tools/build-www.cjs --check   fail (exit 1) if index.html is not what the pieces build to (used by CI)
   Pieces:  src-web/index.template.html  the markup; the lines @@CSS@@ and @@JS@@ mark where the pieces go
            src-web/css/*.css            joined in file-name order  (the order is the CSS cascade: keep the numeric prefixes)
            src-web/js/*.js              joined in file-name order  (the body of the one app function; order = load order)
   Files keep Windows line endings (CRLF), exactly like index.html. */
const fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'..'), SRC=path.join(ROOT,'src-web'), OUT=path.join(ROOT,'app/src/main/assets/www/index.html');
const list=d=>fs.readdirSync(path.join(SRC,d)).filter(f=>/\.(css|js)$/.test(f)).sort();
const join=d=>list(d).map(f=>{const s=fs.readFileSync(path.join(SRC,d,f),'utf8'); if(!s.endsWith('\r\n')) throw Error(d+'/'+f+' must end with a CRLF line break'); if(/(^|[^\r])\n/.test(s)) throw Error(d+'/'+f+' has a bare LF line break (use CRLF)'); return s}).join('');
const tpl=fs.readFileSync(path.join(SRC,'index.template.html'),'utf8');
if(!tpl.includes('@@CSS@@\r\n')||!tpl.includes('@@JS@@\r\n')) throw Error('the template needs the lines @@CSS@@ and @@JS@@');
const out=tpl.replace('@@CSS@@\r\n',()=>join('css')).replace('@@JS@@\r\n',()=>join('js'));
if(process.argv.includes('--check')){
  const cur=fs.existsSync(OUT)?fs.readFileSync(OUT,'utf8'):'';
  if(cur===out){console.log('OK: index.html is up to date with src-web/ ('+out.length+' characters)');process.exit(0)}
  const a=cur.split('\r\n'),b=out.split('\r\n');let i=0;while(i<a.length&&a[i]===b[i])i++;
  console.error('index.html is NOT what src-web/ builds to. First difference at line '+(i+1)+':\n  index.html: '+(a[i]||'').slice(0,100)+'\n  src-web   : '+(b[i]||'').slice(0,100)+'\nRun: node tools/build-www.cjs   (edit src-web/, not index.html)');
  process.exit(1)}
fs.writeFileSync(OUT,out); console.log('wrote '+path.relative(ROOT,OUT)+' ('+out.length+' characters) from '+list('css').length+' css + '+list('js').length+' js files');
