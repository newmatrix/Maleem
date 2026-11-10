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
/* more categories people use in money apps: not on by default, offered in Settings > الفئات > فئات مقترحة (grouped) */
const CAT_GROUPS = [
  ['أكل وشرب', [
    {id:'delivery', name:'توصيل أكل', e:'🛵', c:'#EA580C'},
    {id:'bakery', name:'مخبوزات وحلويات', e:'🥐', c:'#D97706'},
    {id:'veg', name:'خضار وفاكهة', e:'🥬', c:'#16A34A'},
    {id:'meat', name:'لحوم ودواجن وأسماك', e:'🥩', c:'#B91C1C'},
    {id:'water', name:'مياه ومشروبات', e:'🥤', c:'#0284C7'},
    {id:'snacks', name:'سناكس وعصائر', e:'🍿', c:'#F59E0B'},
    {id:'smoke', name:'سجائر ومعسل', e:'🚬', c:'#57534E'}
  ]],
  ['مواصلات وعربية', [
    {id:'taxi', name:'تاكسي وتطبيقات توصيل', e:'🚕', c:'#CA8A04'},
    {id:'metro', name:'مترو وقطار', e:'🚇', c:'#2563EB'},
    {id:'park', name:'جراج وانتظار', e:'🅿️', c:'#475569'},
    {id:'toll', name:'رسوم طرق', e:'🛣️', c:'#64748B'},
    {id:'carins', name:'ترخيص وتأمين العربية', e:'📄', c:'#1D4ED8'},
    {id:'carwash', name:'غسيل العربية', e:'🧼', c:'#0EA5E9'},
    {id:'battery', name:'بطارية وإطارات', e:'🔋', c:'#3F3F46'},
    {id:'fines', name:'مخالفات وغرامات', e:'🚨', c:'#DC2626'},
    {id:'flight', name:'تذاكر طيران', e:'🎫', c:'#0891B2'},
    {id:'bike', name:'دراجة وسكوتر', e:'🚲', c:'#15803D'}
  ]],
  ['البيت والفواتير', [
    {id:'rent', name:'إيجار', e:'🏘️', c:'#92400E'},
    {id:'elec', name:'كهرباء', e:'⚡', c:'#EAB308'},
    {id:'wbill', name:'مياه المنزل', e:'🚰', c:'#0EA5E9'},
    {id:'gas', name:'غاز', e:'🔥', c:'#EA580C'},
    {id:'net', name:'إنترنت المنزل', e:'🌐', c:'#0D9488'},
    {id:'clean', name:'نظافة ومنظفات', e:'🧹', c:'#14B8A6'},
    {id:'maid', name:'عمالة منزلية', e:'🧺', c:'#A16207'},
    {id:'garden', name:'حديقة ونباتات', e:'🌱', c:'#22C55E'},
    {id:'decor', name:'ديكور وأدوات منزلية', e:'🖼️', c:'#B45309'},
    {id:'furn', name:'أثاث وأجهزة', e:'🛋️', c:'#9A3412'},
    {id:'electr', name:'إلكترونيات وإكسسوارات', e:'💻', c:'#0369A1'},
    {id:'repair', name:'صيانة وإصلاحات', e:'🔧', c:'#57534E'},
    {id:'mort', name:'قسط شقة أو عقار', e:'🏢', c:'#7C2D12'},
    {id:'building', name:'رسوم العمارة والحراسة', e:'🏙️', c:'#78716C'},
    {id:'reno', name:'تشطيب وتجديد', e:'🏗️', c:'#A8A29E'},
    {id:'pets', name:'حيوانات أليفة', e:'🐾', c:'#CA8A04'}
  ]],
  ['اتصالات وتقنية', [
    {id:'software', name:'برامج وتطبيقات', e:'💾', c:'#6D28D9'},
    {id:'cloud', name:'تخزين سحابي ودومين', e:'☁️', c:'#0EA5E9'},
    {id:'ship', name:'شحن وبريد', e:'🚚', c:'#92400E'},
    {id:'ai', name:'اشتراكات الذكاء الاصطناعي', e:'🤖', c:'#7C3AED'}
  ]],
  ['صحة وجمال', [
    {id:'doctor', name:'دكتور وكشف', e:'🩺', c:'#059669'},
    {id:'pharmacy', name:'صيدلية', e:'🩹', c:'#10B981'},
    {id:'dental', name:'أسنان', e:'🦷', c:'#38BDF8'},
    {id:'lab', name:'تحاليل وأشعة', e:'🔬', c:'#6366F1'},
    {id:'glasses', name:'نظارات وعدسات', e:'👓', c:'#0F766E'},
    {id:'salon', name:'صالون وحلاق', e:'✂️', c:'#DB2777'},
    {id:'spa', name:'سبا ومساج', e:'💆', c:'#A78BFA'},
    {id:'perfume', name:'عطور', e:'🧴', c:'#C026D3'},
    {id:'vitamin', name:'فيتامينات ومكملات', e:'🍊', c:'#F97316'},
    {id:'therapy', name:'علاج نفسي وطبيعي', e:'🧠', c:'#7C3AED'}
  ]],
  ['تسوق وملابس', [
    {id:'shoes', name:'أحذية وشنط', e:'👟', c:'#9333EA'},
    {id:'jewel', name:'مجوهرات وساعات', e:'⌚', c:'#CA8A04'},
    {id:'gold', name:'ذهب وفضة', e:'🥇', c:'#B7791F'},
    {id:'stationery', name:'أدوات مكتبية', e:'✏️', c:'#2563EB'},
    {id:'books', name:'كتب', e:'📖', c:'#7C3AED'},
    {id:'online', name:'تسوق أونلاين', e:'📲', c:'#F43F5E'},
    {id:'baby', name:'مستلزمات أطفال', e:'🍼', c:'#FB923C'},
    {id:'toys', name:'ألعاب أطفال', e:'🧩', c:'#F97316'}
  ]],
  ['ترفيه وهوايات', [
    {id:'culture', name:'سينما ومسرح', e:'🎭', c:'#E11D48'},
    {id:'hotel', name:'فنادق وإقامة', e:'🏨', c:'#0E7490'},
    {id:'trip', name:'مصايف ورحلات', e:'🏖️', c:'#0EA5E9'},
    {id:'camp', name:'كامبينج وطبيعة', e:'⛺', c:'#15803D'},
    {id:'music', name:'موسيقى وبودكاست', e:'🎧', c:'#7C3AED'},
    {id:'hobby', name:'هوايات', e:'🎨', c:'#D946EF'},
    {id:'photo', name:'تصوير', e:'📷', c:'#475569'},
    {id:'club', name:'نادي وعضويات', e:'🏊', c:'#16A34A'},
    {id:'party', name:'حفلات وسهرات', e:'🎤', c:'#C026D3'},
    {id:'sport', name:'رياضة وجيم', e:'🏋️', c:'#DC2626'},
    {id:'game', name:'ألعاب', e:'🎮', c:'#7C3AED'}
  ]],
  ['تعليم وتطوير', [
    {id:'school', name:'حضانة ومدارس', e:'🎒', c:'#2563EB'},
    {id:'tutor', name:'دروس خصوصية', e:'📝', c:'#4F46E5'},
    {id:'uni', name:'جامعة ومصاريف دراسية', e:'🎓', c:'#1D4ED8'},
    {id:'courses', name:'كورسات وتدريب', e:'💡', c:'#F59E0B'},
    {id:'suppl', name:'زي ومستلزمات مدرسية', e:'📐', c:'#0284C7'},
    {id:'allow', name:'مصروف الأولاد', e:'💵', c:'#84CC16'}
  ]],
  ['مناسبات ودين', [
    {id:'events', name:'مناسبات وأفراح', e:'🎉', c:'#BE185D'},
    {id:'ramadan', name:'رمضان والعيد', e:'🌙', c:'#0F766E'},
    {id:'hajj', name:'حج وعمرة', e:'🕋', c:'#166534'},
    {id:'zakat', name:'زكاة وكفارات', e:'🕌', c:'#047857'},
    {id:'courtesy', name:'مجاملات وواجبات', e:'🎊', c:'#BE185D'}
  ]],
  ['مصاريف مالية', [
    {id:'insur', name:'تأمين', e:'🛡️', c:'#1D4ED8'},
    {id:'tax', name:'رسوم وضرائب', e:'🏛️', c:'#64748B'},
    {id:'bank', name:'رسوم بنكية', e:'🏦', c:'#0F766E'},
    {id:'loans', name:'أقساط وقروض', e:'📉', c:'#7C2D12'},
    {id:'gov', name:'أوراق ومصاريف حكومية', e:'📑', c:'#475569'},
    {id:'invest', name:'استثمار', e:'📈', c:'#16A34A'},
    {id:'saving', name:'ادخار', e:'🐷', c:'#EC4899'},
    {id:'lawyer', name:'محامي وقضايا', e:'⚖️', c:'#1E293B'},
    {id:'tips', name:'بقشيش', e:'💸', c:'#F59E0B'}
  ]],
  ['شغل ومشروع', [
    {id:'work', name:'شغل وأدوات', e:'💼', c:'#0891B2'},
    {id:'ads', name:'إعلانات وتسويق', e:'📣', c:'#EA580C'},
    {id:'office', name:'مكتب ومستلزمات شغل', e:'🗄️', c:'#0E7490'},
    {id:'staff', name:'مرتبات وعمالة', e:'👷', c:'#0F766E'},
    {id:'stock', name:'خامات وبضاعة', e:'🏭', c:'#78716C'},
    {id:'tools', name:'اشتراكات وأدوات شغل', e:'🧰', c:'#0369A1'}
  ]]
];
const CATS_MORE = CAT_GROUPS.flatMap(g=>g[1]);

let CAT = {};
const mem = {};
function lsGet(k){try{return localStorage.getItem(k)}catch(e){return mem[k]??null}}
function lsSet(k,v){try{localStorage.setItem(k,v);return true}catch(e){mem[k]=v;return false}}
