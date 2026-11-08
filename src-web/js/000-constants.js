const CATS = [
  {id:'food',  name:'أكل وشرب', e:'🍽️', c:'#E07A2E'},
  {id:'groc',  name:'سوبر ماركت وبقالة', e:'🛒', c:'#F59E0B'},
  {id:'cafe',  name:'كافيهات ومطاعم', e:'☕', c:'#B45309'},
  {id:'trans', name:'مواصلات',  e:'🚌', c:'#2D7FD3'},
  {id:'fuel',  name:'بنزين',    e:'⛽', c:'#0369A1'},
  {id:'car',   name:'العربية وصيانتها', e:'🚗', c:'#475569'},
  {id:'bills', name:'فواتير',   e:'🧾', c:'#8B5CF6'},
  {id:'phone', name:'موبايل ونت', e:'📱', c:'#0EA5A4'},
  {id:'home',  name:'البيت',    e:'🏠', c:'#7C6A55'},
  {id:'shop',  name:'تسوق',     e:'🛍️', c:'#C79A2B'},
  {id:'cloth', name:'ملابس',    e:'👕', c:'#A855F7'},
  {id:'beauty',name:'عناية وتجميل', e:'💄', c:'#EC4899'},
  {id:'health',name:'صحة',      e:'💊', c:'#16A34A'},
  {id:'kids',  name:'الأولاد',  e:'🧸', c:'#F97316'},
  {id:'edu',   name:'تعليم',    e:'📚', c:'#4F46E5'},
  {id:'fun',   name:'خروج وترفيه', e:'🎬', c:'#E11D48'},
  {id:'subs',  name:'اشتراكات', e:'📺', c:'#6366F1'},
  {id:'travel',name:'سفر',      e:'✈️', c:'#D9466F'},
  {id:'charity',name:'صدقات وتبرعات', e:'🤲', c:'#059669'},
  {id:'family',name:'مساعدة الأهل', e:'👨‍👩‍👧', c:'#0D9488'},
  {id:'gift',  name:'هدايا',    e:'🎁', c:'#DB2777'},
  {id:'other', name:'أخرى',     e:'📦', c:'#64748B'}
];
/* more categories people use in money apps: not on by default, offered in Settings > الفئات > فئات مقترحة */
const CATS_MORE = [
  {id:'rent',   name:'إيجار',            e:'🏘️', c:'#92400E'},
  {id:'school', name:'حضانة ومدارس',     e:'🎒', c:'#2563EB'},
  {id:'sport',  name:'رياضة وجيم',       e:'🏋️', c:'#DC2626'},
  {id:'pets',   name:'حيوانات أليفة',    e:'🐾', c:'#CA8A04'},
  {id:'repair', name:'صيانة وإصلاحات',   e:'🔧', c:'#57534E'},
  {id:'furn',   name:'أثاث وأجهزة',      e:'🛋️', c:'#9A3412'},
  {id:'insur',  name:'تأمين',            e:'🛡️', c:'#1D4ED8'},
  {id:'tax',    name:'رسوم وضرائب',      e:'🏛️', c:'#64748B'},
  {id:'bank',   name:'رسوم بنكية',       e:'🏦', c:'#0F766E'},
  {id:'game',   name:'ألعاب',            e:'🎮', c:'#7C3AED'},
  {id:'work',   name:'شغل وأدوات',       e:'💼', c:'#0891B2'},
  {id:'events', name:'مناسبات وأفراح',   e:'🎉', c:'#BE185D'}
];

let CAT = {};
const mem = {};
function lsGet(k){try{return localStorage.getItem(k)}catch(e){return mem[k]??null}}
function lsSet(k,v){try{localStorage.setItem(k,v);return true}catch(e){mem[k]=v;return false}}
