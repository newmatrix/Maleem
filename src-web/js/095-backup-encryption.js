/* ===== Encrypted backups (optional) =====
   AES-GCM with a key made from a password (PBKDF2-SHA256, 210000 rounds). The password itself is never kept: only the
   derived key and its salt, on this phone, outside the app data and outside every backup. A backup made with it is
   {app,enc:1,at,iter,salt,iv,ct} (the time stays readable so the newest can be found; it is also bound into the seal).
   Restoring asks for the password (or opens by itself on the phone that made it), and then keeps encryption on. */
const BKE_KEY='maleem.bkenc', BKE_ITER=210000, BKE_MIN=6;
const bkeOk=()=>!!(window.crypto&&crypto.subtle&&crypto.getRandomValues);
const bkeB64=u8=>{let s='';for(let i=0;i<u8.length;i+=0x8000) s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));return btoa(s)};
function bkeCfg(){try{const c=JSON.parse(lsGet(BKE_KEY)||'null'); if(c&&typeof c.salt==='string'&&typeof c.key==='string'&&c.iter>=1e5&&c.iter<=1e6) return c}catch(e){} return null}
const bkeOn=()=>!!bkeCfg();
const bkeAad=at=>new TextEncoder().encode('maleem-enc1|'+(+at||0));
async function bkeDerive(pass,salt,iter){
  const km=await crypto.subtle.importKey('raw',new TextEncoder().encode(String(pass).normalize('NFKC')),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:iter,hash:'SHA-256'},km,{name:'AES-GCM',length:256},true,['encrypt','decrypt']);
}
async function bkeSave(key,salt,iter){
  const raw=new Uint8Array(await crypto.subtle.exportKey('raw',key));
  lsSet(BKE_KEY,JSON.stringify({salt:bkeB64(salt),iter,key:bkeB64(raw)}));
}
/* the backup text -> the encrypted text (throws when encryption is on but the phone can't do it: never a silent plain backup) */
async function bkeSeal(text,at){
  const c=bkeCfg(); if(!c||!bkeOk()) throw new Error('enc');
  const key=await crypto.subtle.importKey('raw',b64d(c.key),'AES-GCM',false,['encrypt']), iv=crypto.getRandomValues(new Uint8Array(12));
  const ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:bkeAad(at)},key,new TextEncoder().encode(text)));
  return JSON.stringify({app:'maleem',enc:1,at,iter:c.iter,salt:c.salt,iv:bkeB64(iv),ct:bkeB64(ct)});
}
/* a quick look at the start of the text: is it an encrypted backup (so a password may be needed)? */
const bkSniffEnc=txt=>/"enc"\s*:\s*1\b/.test(String(txt).slice(0,400));
const bkeIsEnv=o=>!!(o&&o.app==='maleem'&&o.enc===1&&typeof o.salt==='string'&&typeof o.iv==='string'&&typeof o.ct==='string'&&o.iter>=1e5&&o.iter<=1e6);
async function bkeDecrypt(o,key){
  try{return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:b64d(o.iv),additionalData:bkeAad(o.at)},key,b64d(o.ct)))}catch(e){return null}
}
/* a backup file's text -> {o,p} like bkParse, null (not a Maleem backup) or {cancel:true} (encrypted, and the password was not given) */
async function bkOpen(txt){
  let o=null; try{o=JSON.parse(txt)}catch(e){return null}
  if(!bkeIsEnv(o)) return bkParse(txt);
  if(!bkeOk()) return {cancel:true};
  const c=bkeCfg();
  try{ if(c&&c.salt===o.salt&&c.iter===o.iter){
    const t=await bkeDecrypt(o,await crypto.subtle.importKey('raw',b64d(c.key),'AES-GCM',false,['decrypt']));
    if(t!==null) return bkParse(t);
  } }catch(e){}
  for(;;){
    const pass=await bkePrompt(); if(pass===null) return {cancel:true};
    let key=null; try{key=await bkeDerive(pass,b64d(o.salt),o.iter)}catch(e){}
    const t=key?await bkeDecrypt(o,key):null;
    if(t!==null){
      const b=bkParse(t); bkePassClose();
      if(b){ try{await bkeSave(key,b64d(o.salt),o.iter)}catch(e){} } // restoring keeps the protection on
      return b;
    }
    $('#bkPassErr').textContent='كلمة السر غلط أو الملف اتعدّل';
  }
}
/* ---- password prompt while restoring ---- */
let bkePassRes=null;
function bkePrompt(){return new Promise(res=>{
  bkePassRes=res; const go=$('#bkPassGo'); go.disabled=false; go.textContent='فك التشفير'; $('#bkPassIn').value='';
  if(!$('#bkPassSheet').classList.contains('open')){$('#bkPassErr').textContent=''; openSheetEl('bkPassSheet'); setTimeout(()=>$('#bkPassIn').focus({preventScroll:true}),320)}
  else $('#bkPassIn').focus({preventScroll:true});
})}
function bkePassDone(v){const r=bkePassRes; bkePassRes=null; if(r) r(v)}
function bkePassClose(){$('#bkPassSheet').classList.remove('open'); if(!document.querySelector('.sheet.open')) $('#scrim').classList.remove('open')}
$('#bkPassGo').onclick=()=>{
  const v=$('#bkPassIn').value; if(!v){$('#bkPassErr').textContent='اكتب كلمة السر'; return}
  $('#bkPassErr').textContent=''; const go=$('#bkPassGo'); go.disabled=true; go.textContent='لحظة...'; bkePassDone(v);
};
$('#bkPassIn').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('#bkPassGo').click()}});
$('#bkPassCancel').onclick=()=>{bkePassDone(null); bkePassClose()};
/* ---- the settings row and its sheet ---- */
function bkePaint(){
  const chip=$('#bkEncChip'); if(!chip) return; const on=bkeOn(), ok=bkeOk();
  chip.textContent=on?'شغّال':'شغّله'; chip.disabled=!ok&&!on;
  $('#bkEncSub').textContent=!ok&&!on?'مش متاح هنا (محتاج تطبيق الموبايل)':on?'شغّال: النسخ الجاية متشفّرة بكلمة سر':'مقفول: النسخة ملف عادي يقراه أي حد معاه الملف';
}
function openBkEnc(){
  const on=bkeOn(); $('#bkEncP1').value=$('#bkEncP2').value=''; $('#bkEncErr').textContent='';
  $('#bkEncHint').textContent=on?'التشفير شغّال. لو كتبت كلمة سر جديدة هتتطبق على النسخ الجاية بس، والنسخ القديمة بتفضل بكلمة سرها القديمة.':'النسخة هتتشفّر بكلمة سر قبل ما تتحفظ على الموبايل أو Drive، فمحدش يقدر يفتحها من غيرها. لو نسيت كلمة السر مفيش أي طريقة تفتح بيها النسخ، فاحفظها في مكان أمان.';
  $('#bkEncGo').textContent=on?'تغيير كلمة السر':'تشغيل التشفير'; $('#bkEncGo').disabled=false; $('#bkEncOff').hidden=!on;
  closeSheets(); openSheetEl('bkEncSheet');
}
$('#bkEncChip').onclick=openBkEnc; $('#bkEncCancel').onclick=closeSheets;
$('#bkEncGo').onclick=async()=>{
  const p1=$('#bkEncP1').value, p2=$('#bkEncP2').value, err=$('#bkEncErr');
  if(!bkeOk()){err.textContent='التشفير مش متاح هنا'; return}
  if(p1.length<BKE_MIN){err.textContent='كلمة السر لازم تكون 6 حروف أو أرقام على الأقل'; $('#bkEncP1').focus(); return}
  if(p1!==p2){err.textContent='الكلمتين مش زي بعض'; $('#bkEncP2').focus(); return}
  const go=$('#bkEncGo'), was=bkeOn(), t0=go.textContent; go.disabled=true; go.textContent='لحظة...';
  try{ const salt=crypto.getRandomValues(new Uint8Array(16)); await bkeSave(await bkeDerive(p1,salt,BKE_ITER),salt,BKE_ITER) }
  catch(e){go.disabled=false; go.textContent=t0; err.textContent='التشفير مش متاح هنا'; return}
  closeSheets(); bkePaint(); toast(was?'اتغيّرت كلمة السر':'اتشغّل تشفير النسخ');
};
armBtn($('#bkEncOff'),'إيقاف التشفير','دوس تاني للتأكيد',()=>{lsSet(BKE_KEY,''); closeSheets(); bkePaint(); toast('اتقفل تشفير النسخ. النسخ الجاية من غير تشفير')});
bkePaint();
