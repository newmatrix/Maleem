/* ===== Local error log: the technical errors this phone hit, kept ON the phone only, outside the app data and the backups.
   Every entry is cleaned first (no long numbers, no long quoted text, no web addresses), so it never carries money or names. ===== */
const ERRLOG_KEY='maleem.errlog', ERRLOG_MAX=40;
const errAddr=s=>String(s==null?'':s).replace(/\b(?:https?|file|blob):\/\/[^\s)'"]*\/([^\/\s)'"?#]*)(?:[?#][^\s)'"]*)?/g,'$1'); // https://host/dir/index.html?x -> index.html
const errText=(s,n)=>errAddr(s).replace(/(["'`])[^"'`\r\n]{13,}\1/g,'$1…$1').replace(/\d{3,}/g,'#').replace(/\s+/g,' ').trim().slice(0,n);
const errStack=s=>String(s||'').split(/\r?\n/).filter(l=>/^\s*at\s|@/.test(l)).slice(0,5).map(l=>errAddr(l).trim().slice(0,120)).join('\n');
function errLogRead(){
  try{const a=JSON.parse(lsGet(ERRLOG_KEY)||'[]'); return (Array.isArray(a)?a:[]).filter(e=>e&&typeof e==='object'&&typeof e.m==='string').slice(0,ERRLOG_MAX)}catch(e){return []}
}
let errBurst={t:0,n:0};
function errLog(kind,msg,where,stack){
  try{
    const now=Date.now(); if(now-errBurst.t>60000) errBurst={t:now,n:0};
    if(++errBurst.n>20) return; // a loop of errors must not fill the phone
    const c=kind==='promise'||kind==='app'?kind:'js', m=errText(msg||'unknown error',200), w=errAddr(where).slice(0,80), s=errStack(stack);
    const list=errLogRead(), hit=list.find(e=>e.c===c&&e.m===m&&e.w===w);
    if(hit){hit.n=Math.min(9999,(+hit.n||1)+1); hit.t=now; if(!hit.s&&s) hit.s=s; list.splice(list.indexOf(hit),1); list.unshift(hit)} // the one that just happened goes first
    else list.unshift({c,m,w,s,n:1,t:now,f:now});
    lsSet(ERRLOG_KEY,JSON.stringify(list.slice(0,ERRLOG_MAX)));
  }catch(e){}
}
const logErr=(tag,e)=>errLog('app',tag+': '+(e&&e.message?e.message:String(e==null?'':e)),'',e&&e.stack); // for errors the app catches itself but wants to remember
function errClear(){try{lsSet(ERRLOG_KEY,'[]')}catch(e){}}
const errWhen=t=>{const d=new Date(t),z=n=>String(n).padStart(2,'0'); return d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate())+' '+z(d.getHours())+':'+z(d.getMinutes())};
function errReport(max){ // plain text for the developer; the newest errors first, cut at max characters
  let head; try{head=['Maleem '+((UPD&&UPD.st&&UPD.st.curName)||'?'),window.AndroidBridge?'Android':'web',LANG,screen.width+'x'+screen.height,errWhen(Date.now())].join(' · ')}catch(e){head='Maleem'}
  const list=errLogRead(); let out=head+'\n'+list.length+' errors';
  for(const e of list){
    const b='\n\n['+errWhen(e.t)+']'+(e.n>1?' x'+e.n:'')+' '+e.c+': '+e.m+(e.w?' @ '+e.w:'')+(e.s?'\n'+e.s:'');
    if(out.length+b.length>(max||4000)) break; out+=b }
  return out;
}
window.addEventListener('error',ev=>{try{ if(!ev) return; const e=ev.error;
  errLog('js',ev.message||(e&&e.message),(errAddr(ev.filename||'').slice(0,60)||'index.html')+(ev.lineno?':'+ev.lineno+':'+(ev.colno||0):''),e&&e.stack)}catch(x){}});
window.addEventListener('unhandledrejection',ev=>{try{ const r=ev&&ev.reason; errLog('promise',r&&r.message?r.message:String(r),'',r&&r.stack)}catch(x){}});
/* the app swallows many render errors with try/catch + console.error: remember those too (only real Error objects, so library chatter does not fill the log) */
{const ce=console.error; console.error=function(){try{const a=arguments[0]; if(a instanceof Error) errLog('app',a.message,'',a.stack)}catch(x){} return ce.apply(console,arguments)}}
