# سياسة الخصوصية - تطبيق مليم

آخر تحديث: أكتوبر 2026

تطبيق **مليم** بيساعدك تسجل مصاريفك وتتابع ميزانيتك والسلف والجمعيات.

**البيانات اللي بتدخلها** (المصاريف، الميزانية، الفئات، السلف، الجمعيات، الإعدادات) **بتتخزن على موبايلك بس**. التطبيق مش بيبعت أي بيانات لأي سيرفر **إلا لو فعّلت "المساحة المشتركة" أو "النسخ الاحتياطي على Google Drive" بنفسك، أو استخدمت "التسجيل بالصوت"** (تفاصيلهم تحت)، ومش بيجمع أي معلومات عنك، ومفيهوش إعلانات ولا أدوات تتبع أو تحليلات.

**النسخ الاحتياطي (نسخة الويب):** لما تختار "نسخ احتياطي"، النسخة بتتحفظ في حسابك على الخدمة اللي فاتح منها التطبيق، وبيتعامل معاها حسب سياسة الخدمة دي.

**النسخ الاحتياطي (أندرويد):** التطبيق بيعمل ملف نسخة احتياطية (فيه بياناتك وصور الإيصالات، ما عدا الصور الكبيرة جدًا) كل عدد أيام تختاره (أو تقفله)، أو لما تدوس «نسخة دلوقتي». لو ربطت Google Drive، الملف بيترفع عليه (والاختيار ليك: Drive بس، أو Drive والموبايل). ولو مربطتش، الملف بيتحفظ على جهازك نفسه في مجلد Download/Maleem ومن غير ما يتبعت لأي سيرفر. الملف بيحتوي بياناتك المالية، فخلي بالك منه ومتشاركوش مع حد مش عايزه يشوفها.

**النسخ الاحتياطي على Google Drive (اختياري، أندرويد):** لو ربطت حساب جوجل من صفحة النسخ الاحتياطي، التطبيق بيرفع ملف النسخة التلقائية على Google Drive بتاعك انت في فولدر اسمه «Maleem»، كل عدد الأيام اللي اخترته، ولما تفتح التطبيق. التطبيق بياخد صلاحية «الملفات اللي مليم عملها بس» (drive.file)، فمش بيقدر يشوف أو يعدّل أي ملف تاني في الـ Drive بتاعك، وبيقرا إيميل الحساب بس عشان يعرضهولك. الملف بيتبعت من موبايلك لجوجل مباشرة ومش بيعدّي على أي سيرفر لينا، وبنحتفظ بآخر 7 نسخ لكل عضو. تقدر تفك الربط من نفس الصفحة في أي وقت، والنسخ اللي اترفعت بتفضل في الـ Drive بتاعك لحد ما تمسحها، وتقدر تشيل صلاحية مليم من حساب جوجل (الأمان ← التطبيقات المتصلة).

**التحديثات:** نسخة أندرويد بتدخل على GitHub (raw.githubusercontent.com و github.com) كل كام ساعة وهي مفتوحة، عشان تعرف لو فيه نسخة جديدة أو رسالة من المطوّر. الطلب ده مفيهوش أي بيانات منك غير اللي أي اتصال بالنت بيبعته (زي عنوان الـ IP)، وGitHub بيتعامل معاه حسب سياسته. لو وافقت على التحديث، التطبيق بينزّل النسخة الجديدة من GitHub ويتأكد إنها سليمة وموقّعة بنفس مفتاح مليم، وبعدين أندرويد بيسألك قبل ما يثبّتها.

**النسخ الاحتياطي التلقائي بتاع جوجل:** التطبيق مقفول فيه النسخ الاحتياطي السحابي بتاع أندرويد، يعني بياناتك المالية مش بتترفع على حساب جوجل بتاعك من غير ما تختار. النقل المباشر من موبايل لموبايل (لما تجهز موبايل جديد بنفسك) لسه متاح.

**القفل بالرقم السري أو كلمة السر:** الرقم السري أو كلمة السر نفسها مش بتتخزن، اللي بيتخزن بصمة مشفرة منه (PBKDF2) مع حد لعدد المحاولات الغلط. ولما القفل يكون مفعّل، التطبيق بيمنع لقطات الشاشة وبيخفي محتواه من شاشة التطبيقات المفتوحة.

**تعدد الأعضاء:** لو أكتر من شخص بيستخدم مليم على نفس الموبايل، كل عضو بياناته متخزنة لوحدها على الموبايل، وليه كلمة سر خاصة بيه، ومحدش يقدر يفتح بيانات عضو تاني من جوه التطبيق من غير كلمة السر بتاعته. البيانات مش متشفرة على الموبايل نفسه، فكلمة السر بتحمي الخصوصية بين مستخدمي التطبيق، مش من حد يقدر يوصل لملفات الموبايل بأدوات تقنية. ولو عضو اتمسح، بياناته بتتمسح من الموبايل ومفيش طريقة ترجعها.

**المساحة المشتركة (اختيارية):** لو أنشأت مساحة أو أرسلت طلب انضمام بكود، التطبيق بيستخدم Google Firebase (دخول مجهول + Cloud Firestore) من غير إيميل أو رقم تليفون. صاحب المساحة لازم يوافق على طلب الانضمام، وبيشوف اسمك واختيارات المشاركة اللي حددتها. **انت اللي بتختار** أنواع البيانات اللي تتشارك مع الأعضاء: المصاريف الجديدة (المبلغ والفئة والملاحظة والتاريخ وطريقة الدفع)، وملخص التقارير الشهرية (الإجمالي وعدد العمليات وتوزيع الفئات بدون تفاصيل كل عملية)، والسلف والديون، والجمعيات، وأهداف الادخار، والدخل الشهري، والمصاريف الثابتة، مع الاسم اللي كتبته. الأنواع غير التقارير بتتزامن في الاتجاهين: أي عضو مفعّل نفس النوع يقدر يضيف السجلات ويعدّلها ويحذفها. أي نوع تقفله بيوقف مزامنة التغييرات الجديدة، لكن النسخ اللي اترفعت قبل كده بتفضل ظاهرة للأعضاء. مصاريفك القديمة بتفضل على موبايلك إلا لو اخترت مشاركتها. لما تخرج من المساحة بتفضل بياناتك على موبايلك. ولما آخر عضو يخرج، المساحة بتتقفل ومحدش يقدر ينضم ليها تاني، والبيانات المشتركة اللي فيها بتتمسح من Firebase (لو النت قطع وقت الخروج ممكن يفضل جزء منها، بس محدش يقدر يوصله). لو عايز مسح بياناتك من مساحة لسه فيها أعضاء اتواصل معانا.

**التسجيل بالصوت (اختياري):** لما تدوس على علامة المايك، التطبيق بيطلب إذن الميكروفون. الكلام بيتحوّل لنص عن طريق خدمة التعرف على الكلام الموجودة في أندرويد (Google)، وممكن الصوت يتبعت لسيرفرات Google حسب إعدادات جهازك، فمحتاج إنترنت وبيتعامل معاه حسب سياسة Google. التطبيق نفسه **مش بيسجل ولا بيخزن الصوت**، وبياخد النص بس ويحلله على الموبايل عشان يطلّع المبلغ والفئة. المصروف مش بيتحفظ إلا لما تراجعه وتدوس "حفظ".

**البصمة:** التطبيق بيستخدم نظام البصمة بتاع الموبايل عشان يفتح القفل. التطبيق مش بيوصل لبصمتك ولا بيخزنها.

**الإشعارات:** بتستخدم عشان تفكرك بتسجيل المصاريف ومواعيد السلف والجمعيات، وكلها بتتعمل على الموبايل نفسه.

**التسجيل التلقائي من الإشعارات (اختياري، مقفول افتراضيًا):** لو فعّلته من الإعدادات وسمحت بإذن «الوصول للإشعارات»، التطبيق بيقرا نص الإشعارات اللي بتوصل على الموبايل عشان يلاقي رسايل الخصم والدفع من البنوك والمحافظ. الإشعارات اللي مش عمليات دفع بتتجاهل فورًا ومش بتتخزن، وبيتجاهل تطبيقات الشات وأكواد التحقق (OTP) والفلوس الداخلة. عمليات الدفع اللي بيلاقيها (المبلغ، اسم المحل، اسم التطبيق اللي بعت الإشعار، ونص الإشعار لحد 300 حرف) بتتحفظ على موبايلك بس، ومش بتتبعت لأي سيرفر، ومفيش منها حاجة بتبقى مصروف غير لما توافق عليها. تقدر تقفل الميزة في أي وقت من الإعدادات، وساعتها التطبيق بيبطّل يستقبل الإشعارات خالص.

**صور الإيصالات (اختيارية):** لو صوّرت إيصال أو اخترت صورة من المعرض، التطبيق بيصغّرها ويحفظها على موبايلك بس. الصور مش بتتشارك في المساحة المشتركة. النسخة الاحتياطية بتشمل الصور، فخلي بالك من الملف ده.

**قراءة الإيصالات:** على أندرويد، لما تصوّر إيصال، التطبيق بيقرا الكلام والأرقام اللي فيه عشان يملا المبلغ والتاريخ واسم المحل. القراءة بتحصل على موبايلك بالكامل بأداة Google ML Kit اللي بتيجي مع خدمات Google Play، والصورة مش بتتبعت لأي سيرفر، لا لينا ولا لجوجل.

**الملخص الشهري:** بيتحسب على موبايلك من مصاريفك، والإشعار بتاعه بيتجدول على الموبايل نفسه.

**الويدجت (اختيارية):** لو ضفت ويدجت لشاشتك الرئيسية، التطبيق بيحفظ على جهازك ملخص صغير (مصروف النهارده، إجمالي الفترة، الميزانية، أكتر فئة) عشان يعرضه. الملخص ده بيفضل على الموبايل ومش بيتبعت لأي سيرفر، وبيبان على الشاشة الرئيسية لأي حد ماسك الموبايل، فتقدر تخفي المبالغ من الإعدادات.

**مسح البيانات:** تقدر تمسح المصاريف من الإعدادات، أو تمسح كل بيانات التطبيق من إعدادات الموبايل أو بإلغاء تثبيته.

للتواصل: https://www.facebook.com/HeshamTahaOfficial

---

# Privacy Policy - Maleem

Last updated: October 2026

**Maleem** helps you record your expenses and track your budget, loans and savings circles.

All data you enter (expenses, budget, categories, loans, savings circles, settings) is **stored only on your device**. The app does not send any data to any server **unless you turn on the optional Shared Space or Google Drive backup, or use Voice Entry** (see below), does not collect any information about you, and contains no ads, trackers or analytics.

**Backup (web version):** When you choose "Backup", the copy is saved in your account on the service you opened the app from, under that service's policy.

**Backup (Android):** The app makes a backup file (your data and receipt photos, except very large photos) every number of days you choose (or you can turn it off), or when you tap "Back up now". If you linked Google Drive, the file is uploaded there (you choose: Drive only, or Drive and the phone). If you did not, the file is saved on your device itself, in the Download/Maleem folder, and is not sent to any server. The file contains your financial data, so keep it private.

**Google Drive backup (optional, Android):** If you link a Google account on the Backup page, the app uploads its automatic backup file to *your own* Google Drive, in a folder named "Maleem", every number of days you choose, when you open the app. The app asks only for access to "files created by Maleem" (drive.file), so it cannot see or change any other file in your Drive; it reads the account's e-mail only to show it to you. The file goes from your phone straight to Google and never passes through any server of ours; the newest 7 backups of each member are kept. You can unlink at any time on the same page; files already uploaded stay in your Drive until you delete them, and you can remove Maleem's access from your Google Account (Security → Third-party connections).

**Updates:** The Android app checks GitHub (raw.githubusercontent.com and github.com) every few hours while it is open, to learn whether a new version or a message from the developer is available. The request carries no data about you beyond what any internet connection sends (such as your IP address), and GitHub handles it under its own policy. If you accept an update, the app downloads the new version from GitHub, checks that it is intact and signed with Maleem's own key, and Android asks you before installing it.

**Google's automatic backup:** Android cloud backup is turned off for this app, so your financial data is not uploaded to your Google account without your choice. A direct phone-to-phone transfer that you start yourself is still possible.

**PIN lock:** The PIN itself is never stored, only a salted PBKDF2 hash of it, and wrong attempts are rate-limited. While the lock is on, the app blocks screenshots and hides its content in the recent-apps screen.

**Shared Space (optional):** If you create a space or send a join request with an invite code, the app uses Google Firebase (anonymous sign-in and Cloud Firestore), with no email or phone number. The space owner must approve your request and sees your name and the sharing choices you selected. **You choose** which data types are shared with members: new expenses (amount, category, note, date, payment method), monthly report summaries (totals, transaction counts and category breakdown, without individual transactions), loans and debts, savings circles, savings goals, monthly income, and fixed expenses, together with the display name you typed. All types except reports sync both ways: any member who enabled the same type can add, edit and delete its records. Turning a type off stops syncing new changes, but copies already uploaded remain visible to members. Your older expenses stay on your device unless you choose to share them. When you leave a space you keep your data on your device. To have your data removed from a space, contact us.

**Voice entry (optional):** When you tap the microphone button, the app asks for microphone permission. Speech is converted to text by Android's built-in speech recognition service (Google), which may send the audio to Google servers depending on your device settings, so it needs internet and is handled under Google's policy. The app itself **does not record or store audio**; it only takes the resulting text and analyses it on your device to extract the amount and category. Nothing is saved until you review it and tap Save.

**Biometric lock:** The app uses your phone's built-in biometric system to unlock. The app never accesses or stores your fingerprint.

**Notifications:** Used for reminders to log expenses and for loan and savings-circle due dates. They are scheduled on the device only.

**Automatic capture from notifications (optional, off by default):** If you turn it on in Settings and grant Android's "Notification access", the app reads the text of incoming notifications to find payment and debit messages from banks and wallets. Notifications that are not payments are ignored immediately and never stored; chat apps, verification codes (OTP) and incoming money are ignored. The payments it finds (amount, merchant name, the name of the app that posted the notification, and up to 300 characters of the notification text) are kept only on your device, are never sent to any server, and none of them becomes an expense until you confirm it. You can turn the feature off at any time in Settings, after which the app stops receiving notifications entirely.

**Receipt photos (optional):** If you take a photo of a receipt or pick one from your gallery, the app shrinks it and keeps it on your device only. Photos are never shared to the Shared Space. Backups include the photos, so keep that file private.

**Monthly summary:** Calculated on your device from your expenses; its notification is scheduled on the device only.

**Widgets (optional):** If you add a widget to your home screen, the app stores a small summary on your device (today's spending, period total, budget, top category) to display it. This summary stays on the device, is never sent to any server, and is visible on the home screen to anyone holding your phone, so you can hide the amounts from Settings.

**Deleting data:** You can delete expenses from Settings, or delete all app data from your phone settings or by uninstalling the app.

Contact: https://www.facebook.com/HeshamTahaOfficial
