FoodCost v3.0 — نظام إدارة التكلفة وهندسة المنيو (نسخة Supabase)
================================================================
الإصدار: 3.0
السيرفر انتقل من Google Apps Script + Google Sheets + Drive إلى Supabase:
- قاعدة البيانات: Supabase Postgres
- السيرفر: Supabase Edge Function باسم api
- الصور: Supabase Storage (حاوية عامة باسم menu-images)

الواجهة والشكل العام والمزايا كما هي تماماً: نفس الصفحات ونفس الأزرار ونفس عقد الاتصال
(نفس أسماء الدوال fn ونفس شكل الردود)، لذلك لم تتغير ملفات الواجهة إلا في رابط السيرفر
وبعض النصوص التي كانت تذكر Apps Script / Drive.

الاشتراك: سنوي دائماً — كل تسجيل جديد = سنة، وكل تجديد (رقم عملية 8 أرقام أو أكثر، لا يتكرر) = سنة
تُضاف إلى تاريخ الانتهاء الحالي (أو من اليوم إذا كان منتهياً).


محتويات المجلد
--------------
- index.html          لوحة الإدارة
- menu.html           قائمة الزبائن (QR)
- review.html         تقييم الزبائن (أصبح يقرأ الرابط من js/config.js)
- f@14-G-17.html      صفحة الاشتراك / التجديد (أصبحت تقرأ الرابط من js/config.js)
- js/ , css/style.css , sw.js , manifest.json
- supabase/migrations/20261107000000_foodcost_schema.sql   ← جداول قاعدة البيانات + حاوية الصور
- supabase/functions/api/index.ts                           ← السيرفر الجديد (بديل google-apps-script.js)
- supabase/config.toml                                      ← إعداد verify_jwt = false للدالة
- migration/migrate-to-supabase.gs                          ← سكربت نقل البيانات القديمة (يُشغَّل مرة واحدة)

مهم: مجلد assets (icon-192.png و icon-512.png) لم يكن ضمن الملفات المرسلة،
انسخه من موقعك الحالي كما هو إلى جانب index.html.


خطوات التشغيل
-------------
1) أنشئ مشروعاً على https://supabase.com (New project) واحفظ كلمة مرور قاعدة البيانات.

2) قاعدة البيانات:
   SQL Editor → New query → الصق محتوى الملف
   supabase/migrations/20261107000000_foodcost_schema.sql كاملاً → Run
   (ينشئ كل الجداول + دالة إعادة حساب التكلفة + حاوية الصور menu-images)

3) المفاتيح السرية:
   Edge Functions → Secrets (أو Project Settings → Edge Functions) وأضف:
   - PASSWORD_PEPPER   ← يجب أن تكون نفس القيمة الموجودة في Script Properties القديمة
                          وإلا لن تعمل كلمات المرور الحالية للمستخدمين
   - ADMIN_SECRET_KEY  ← نفس قيمة Apps Script (لوحة المدير وسكربت الترحيل يستخدمانها)
   - FOOD_SECRET_KEY   ← اختياري (نفس القيمة القديمة إن وُجدت)
   القيم SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY و SUPABASE_DB_URL يوفّرها Supabase تلقائياً.

4) نشر السيرفر (الدالة api) — إحدى طريقتين:
   أ) من لوحة Supabase: Edge Functions → Deploy a new function → Via Editor
      الاسم: api   ← الصق محتوى supabase/functions/api/index.ts → Deploy
      ثم من إعدادات الدالة أوقف خيار "Verify JWT" (Enforce JWT verification = Off)
   ب) أو بسطر الأوامر من داخل هذا المجلد:
      npx supabase login
      npx supabase link --project-ref YOUR-PROJECT-REF
      npx supabase functions deploy api --no-verify-jwt

   الرابط الناتج: https://YOUR-PROJECT-REF.supabase.co/functions/v1/api

5) عدّل js/config.js:
   COST_API_URL = "https://YOUR-PROJECT-REF.supabase.co/functions/v1/api"
   (هذا الملف وحده يغذي index.html و menu.html و review.html و f@14-G-17.html)

6) نقل البيانات الحالية (المستخدمون + كل بيانات كل مطعم + الصور + أرقام العمليات):
   - افتح مشروع Apps Script القديم، أضف ملفاً جديداً والصق migration/migrate-to-supabase.gs
   - عدّل SUPABASE_API_URL في أعلى الملف إلى رابط الخطوة 4
   - شغّل migrateAllToSupabase (إذا توقف بسبب الوقت شغّله مجدداً، يكمل تلقائياً)
   - ثم شغّل migrateTransactionsToSupabase
   - يُنقل لكل مطعم: المواد الخام، الأطباق ومكوناتها، الإعدادات، تاريخ الأسعار، المبيعات،
     طلبات المينيو، المينيو الإلكتروني وتصنيفاته، البنرات، هندسة المينيو، التقييمات،
     وتُنسخ الصور من Drive إلى Supabase Storage وتُستبدل روابطها تلقائياً.
   - لا يُحذف شيء من Google Sheets / Drive. أبقِ السكربت القديم منشوراً حتى تتأكد من كل شيء.

7) ارفع مجلد الموقع كاملاً على الاستضافة نفسها (rest-tools.farouk-grup.com).

8) أعد التحميل القسري (Ctrl+F5). تم رفع إصدار الكاش إلى foodcost-v3.0 فيُحدّث Service Worker تلقائياً؛
   وإن ظهرت نسخة قديمة: DevTools → Application → Service Workers → Unregister.


ما الذي تغيّر في السلوك (بدون تغيير في الواجهة)
------------------------------------------------
- بدل "ملف Google Sheets لكل مطعم" أصبحت بيانات كل مطعم صفوفاً في جداول Postgres مربوطة ببريده.
- النسخ الاحتياطي الشامل (R5 و R4) يعمل كما هو وبنفس الصيغة full-r5 / full-r4،
  والنسخ الاحتياطية القديمة المأخوذة من نسخة Google Sheets يمكن استعادتها في النسخة الجديدة.
- عند الاستعادة يُحفظ تلقائياً "لقطة" من البيانات السابقة (آخر 10 لقطات) بدلاً من الاحتفاظ بملف Sheets القديم،
  ويظهر معرّف اللقطة في رسالة الاستعادة.
- الصور الجديدة تُرفع إلى Supabase Storage (حتى 12 ميغابايت: jpeg/png/webp/gif).
  روابط Drive القديمة غير المنقولة تبقى تعمل في المينيو كما كانت.
- عند استعادة نسخة تحتوي صوراً مضمّنة، تُعاد رفع الصور التي لم تعد روابطها متاحة.
- الحسابات الجديدة تبدأ فارغة (لم يعد هناك نسخ من ملف القالب TEMPLATE_SPREADSHEET_ID).
  إن كان القالب يحتوي بيانات بداية تريدها، أضفها من الواجهة أو استعد نسخة احتياطية.
- لوحة المدير (getUsers / addUser / deleteUser / updateUser / audit) تعمل بنفس adminKey.
- الجداول محمية (RLS مفعّل ولا صلاحيات لمفتاح anon)، والوصول فقط عبر الدالة api.
- شعار صفحة الاشتراك ما زال من رابط Google العام؛ يمكنك استبداله بصورة محلية إن أردت.

© 2026 FAROUK GRUP
