/* ===== Error log card (bottom of «اقتراحات وملاحظات»): how many, see / copy the report, clear ===== */
function errPaint(){
  const n=errLogRead().length;
  $('#errCount').textContent= n===0?'مفيش أخطاء متسجلة':n===1?'خطأ واحد متسجل':n===2?'خطأين متسجلين':n<=10?n+' أخطاء متسجلة':n+' خطأ متسجل';
  $('#errView').disabled=$('#errCopy').disabled=!n; $('#errClear').hidden=!n;
  if(!n){$('#errBox').hidden=true; $('#errView').textContent='شوف التقرير'}
  else if(!$('#errBox').hidden) $('#errBox').textContent=errReport(6000);
}
$('#errView').onclick=()=>{
  const b=$('#errBox'); b.hidden=!b.hidden; if(!b.hidden) b.textContent=errReport(6000);
  $('#errView').textContent=b.hidden?'شوف التقرير':'اخفي التقرير';
};
$('#errCopy').onclick=async()=>{const ok=await copyText(errReport(6000)); toast(ok?'اتنسخ التقرير. الصقه في رسالتك للمطوّر':'معرفتش أنسخ التقرير')};
armBtn($('#errClear'),'امسح السجل','دوس تاني للتأكيد',()=>{errClear();errPaint();toast('اتمسح سجل الأخطاء')});
