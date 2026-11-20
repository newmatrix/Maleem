# نتائج التحقق — 17 نوفمبر 2026

نجحت 35 مجموعة اختبارات ويب، و3 فحوص تطابق التجميع، دون مجموعة فاشلة في الجولة النهائية. أُعيدت regression وquick-wins وفحوص التجميع على المصدر النهائي بعد آخر إصلاح للرسوم؛ نجحت أيضًا.

## مجموعات الجولة الشاملة

| الأمر | النتيجة |
|---|---|
| `node ../tools/build-www.cjs --check` | ناجح |
| `node ../tools/code-map.cjs --check` | ناجح |
| `node ../tools/build-locales.cjs --check` | ناجح |
| `node regression.cjs` | ناجح |
| `node full-audit.cjs` | ناجح |
| `node journeys.cjs` | ناجح |
| `node language-dialogs.cjs` | ناجح |
| `node layout-static.cjs` | ناجح |
| `node floating-actions.cjs` | ناجح |
| `node income-funding.cjs` | ناجح |
| `node funding-capsule.cjs` | ناجح |
| `node restore-recurring.cjs` | ناجح |
| `node review-plan-bug.cjs` | ناجح |
| `node account-menu.cjs` | ناجح |
| `node expense-time.cjs` | ناجح |
| `node expense-filters.cjs` | ناجح |
| `node home-month.cjs` | ناجح |
| `node category-report.cjs` | ناجح |
| `node recurrence-expanded.cjs` | ناجح |
| `node debt-currency.cjs` | ناجح |
| `node income-history.cjs` | ناجح |
| `node post-review-fixes.cjs` | ناجح |
| `node home-chips.cjs` | ناجح |
| `node nudge.cjs` | ناجح |
| `node trash.cjs` | ناجح |
| `node error-log.cjs` | ناجح |
| `node backup-encrypt.cjs` | ناجح |
| `node money-sum.cjs` | ناجح |
| `node search-sheet.cjs` | ناجح |
| `node quick-wins.cjs` | ناجح |
| `node upcoming-income.cjs` | ناجح |
| `node refund-log.cjs` | ناجح |
| `node installment-every.cjs` | ناجح |
| `node capture-currency.cjs` | ناجح |
| `node shortcuts.cjs` | ناجح |
| `node feedback.cjs` | ناجح |
| `node i18n-coverage.cjs` | ناجح |
| `node lint.cjs` | ناجح |

## التغطية الجديدة

نجحت الحالات الثلاثون التالية (اختبارات محلية ببيانات تجريبية):

- Capture currencies: ISO, Arabic, explicit app override and base fallback
- InstaPay opt-in manual fee is posted once to the same account
- Direct expense and income time, persisted and validated
- Linked loan: change, detach, delete, undo and trash restore keep balances exact
- Foreign transaction originals survive editing, exchange-rate changes, backups and base conversion
- Missing exchange rate refuses a foreign save without changing records or balance
- Categories are collapsible and custom groups survive cleaning and backup
- Screenshot blocking defaults on and the choice survives reload and backup
- Income adds to real balance but leaves budget unchanged; edit/delete/undo are exact
- Goals round cents and keep progress and deposits through backup/reload
- Linked installments and circles remain payable without a notification and do not duplicate
- Shared membership: backup, reinstall restore, legacy backup and undo preserve ownership
- Recovery rejects mismatched UID, other project and missing credential
- Bundled Firebase SDK recovers the same anonymous UID from a new installation
- Captured foreign expense retains original currency through partial refund and undo
- Foreign income allocation uses base amount, not foreign face value
- Rejected Firebase credentials never silently create a different member
- Foreign capture does not invent an EGP InstaPay fee after base conversion
- Entry layout and discoverable tools eg 320
- Entry layout and discoverable tools eg 360
- Entry layout and discoverable tools eg 390
- Entry layout and discoverable tools eg 768
- Entry layout and discoverable tools ar 320
- Entry layout and discoverable tools ar 360
- Entry layout and discoverable tools ar 390
- Entry layout and discoverable tools ar 768
- Entry layout and discoverable tools en 320
- Entry layout and discoverable tools en 360
- Entry layout and discoverable tools en 390
- Entry layout and discoverable tools en 768

## Kotlin والمعاينة

- جُمّع PayParser وCaptureIdentity وNativeLanguage مع NativeRegression بمترجم Kotlin 2.1.21؛ نجحت فحوص العملات والاتجاه والهوية واللغة. هذا لا يساوي تجميع تطبيق أندرويد كامل.
- اشتغلت نسخة HTML المستقلة في Edge: التهيئة بالعربية، إضافة ثلاث مصروفات وترتيب الأحدث، وحقل الوقت والعملة ومجموعات الفئات. لا أخطاء JavaScript.
- فُحصت الشاشة بعرض 390، ثم 320 بكسل مع خط جذري 24px؛ لا تمرير أفقي زائد في الصفحة أو نموذج المصروف. جرت مراجعة صور المعاينة بصريًا.
- اختبار استعادة الهوية يستخدم bundle Firebase الحقيقي، لكن ردود الحساب والخادم محاكاة؛ لا اتصال بمساحة إنتاج ولا ادعاء بتجربة إعادة تثبيت فعلية على هاتف.

## حدود النتائج

جرى استخراج المشروع الأصلي في مجلد مستقل وتركيب أرشيف التحديث فوقه. تطابقت جميع ملفات الأصل والملفات المسلّمة بايتًا ببايت مع نسخة العمل. نجحت فحوص التجميع الثلاثة وlint، ثم الحالات الثلاثون الجديدة على النسخة المركّبة أيضًا. الأرشيف يحتوي 45 ملفًا معدلًا أو جديدًا.

يلزم قبل النشر بناء APK موقّع وتجربة التحديث فوق الإصدار السابق، والإشعارات وFLAG_SECURE وDrive، واستعادة عضوية مساحة اختبار على هاتف. لم تُنفذ أو تُختبر البنود المستقبلية 13–15.

## استكمال التحقق — 20 نوفمبر 2026

نجح بناء APK تجريبي كامل عبر Gradle 8.13 وJava 17 وAndroid SDK 36. أُصلح تنبيه القيمة الفارغة في PayCapture وأُعيد البناء بنجاح. نسخة GitHub الحالية عند 1d2b6ca1b1b2f6342a9a3ae1fbb53f3563125cf0 لا تختلف عن نسخة المقارنة السابقة إلا في rates.json؛ لم يُدرج هذا الملف أو update.json في الأرشيف. نجحت أيضًا الحالات الثلاثون وlint وتغطية الترجمة على نسخة GitHub المركّب عليها التحديث. تجربة الهاتف الفعلي والإصدار الموقّع للنشر تظل غير منفذة.
