/* Mataami Pro — Landing page content in 3 languages (ar / en / tr) — v5.4.3
   اختيار اللغة يُحفظ في localStorage.fcLang (نفس مفتاح البرنامج) ويُمرَّر ?lang= لروابط الاشتراك والدخول */
(function () {
  'use strict';
  var T = function (ar, en, tr) { return { ar: ar, en: en, tr: tr }; };

  /* ---------- نصوص ثابتة ---------- */
  var S = {
    doc_title: T('Mataami Pro – مطعمي برو | منظومة ERP متكاملة لإدارة المطاعم', 'Mataami Pro | All-in-one Restaurant ERP & POS Platform', 'Mataami Pro | Restoranlar için Hepsi Bir Arada ERP ve POS Platformu'),
    doc_desc: T('منظومة متكاملة لإدارة المطاعم: تكاليف وهندسة مينيو، كاشير، مخزون ومشتريات، قنوات توصيل، موارد بشرية ورواتب، محاسبة IFRS، شاشة مطبخ، تطبيقات للعملاء والسائقين، وامتياز تجاري — بثلاث لغات.',
      'All-in-one restaurant management: food cost & menu engineering, POS, inventory & purchasing, delivery channels, HR & payroll, IFRS accounting, kitchen display, customer & driver apps and franchising — in 3 languages.',
      'Restoranlar için entegre yönetim: maliyet ve menü mühendisliği, POS, stok ve satın alma, teslimat kanalları, İK ve bordro, UFRS muhasebe, mutfak ekranı, müşteri ve kurye uygulamaları, franchise — 3 dilde.'),
    nav_modules: T('الوحدات', 'Modules', 'Modüller'),
    nav_apps: T('التطبيقات', 'Apps', 'Uygulamalar'),
    nav_acc: T('المحاسبة', 'Accounting', 'Muhasebe'),
    nav_shots: T('لقطات الشاشة', 'Screenshots', 'Ekran Görüntüleri'),
    nav_plans: T('الباقات', 'Plans', 'Paketler'),
    nav_compare: T('المقارنة', 'Compare', 'Karşılaştırma'),
    nav_faq: T('الأسئلة الشائعة', 'FAQ', 'SSS'),
    nav_sub: T('اشترك الآن', 'Subscribe', 'Abone Ol'),
    nav_login: T('دخول المشتركين', 'Subscriber Login', 'Abone Girişi'),
    hero_badge: T('ERP متكامل للمطاعم والمقاهي', 'Complete ERP for restaurants & cafés', 'Restoran ve kafeler için tam ERP'),
    hero_title: T('أدر مطعمك من <span>التكلفة إلى القوائم المالية</span> في منصة واحدة', 'Run your restaurant from <span>food cost to financial statements</span> on one platform', 'Restoranınızı <span>maliyetten finansal tablolara</span> tek platformda yönetin'),
    hero_text: T('Mataami Pro يجمع لك: حساب التكاليف وهندسة المينيو، الكاشير ونقطة البيع، المخزون والمشتريات والإنتاج، قنوات التوصيل وتسوياتها، الموارد البشرية والرواتب، المحاسبة العامة وفق IFRS، شاشة المطبخ، تطبيقات العميل والسائق، المساعد الذكي، وإدارة الامتياز التجاري.',
      'Mataami Pro brings together food costing and menu engineering, POS, inventory, purchasing and production, delivery channels and their settlements, HR and payroll, IFRS general accounting, a kitchen display, customer and driver apps, an AI assistant and franchise management.',
      'Mataami Pro; maliyet hesaplama ve menü mühendisliği, POS, stok, satın alma ve üretim, teslimat kanalları ve mutabakatları, İK ve bordro, UFRS genel muhasebe, mutfak ekranı, müşteri ve kurye uygulamaları, yapay zekâ asistanı ve franchise yönetimini bir araya getirir.'),
    from: T('من', 'From', 'Sadece'),
    per_year: T('/ سنوياً', '/ year', '/ yıl'),
    compare_plans: T('قارن الباقات', 'Compare plans', 'Paketleri karşılaştır'),
    choose_plan: T('اختر باقتك', 'Choose your plan', 'Paketinizi seçin'),
    see_app: T('شاهد البرنامج', 'See the app', 'Uygulamayı görün'),
    tb1: T('لا يتجدد تلقائياً', 'No auto-renewal', 'Otomatik yenileme yok'),
    tb2: T('دفع آمن', 'Secure payment', 'Güvenli ödeme'),
    tb3: T('وصول فوري', 'Instant access', 'Anında erişim'),
    tb4: T('3 لغات: عربي · English · Türkçe', '3 languages: عربي · English · Türkçe', '3 dil: عربي · English · Türkçe'),
    hero_alt: T('منصة Mataami Pro', 'Mataami Pro platform', 'Mataami Pro platformu'),
    zoom: T('تكبير الصورة', 'Zoom image', 'Görseli büyüt'),
    prob_title: T('لماذا تخسر المطاعم أرباحها؟', 'Why do restaurants lose their profits?', 'Restoranlar kârlarını neden kaybeder?'),
    prob_sub: T('أغلب الخسائر لا تظهر في الصندوق، بل في التفاصيل التي لا يقيسها أحد.', 'Most losses do not show up in the cash drawer — they hide in details nobody measures.', 'Kayıpların çoğu kasada değil, kimsenin ölçmediği ayrıntılarda gizlidir.'),
    mod_title: T('كل وحدات البرنامج في مكان واحد', 'Every module of the system in one place', 'Sistemin tüm modülleri tek yerde'),
    mod_sub: T('مقسّمة على نمط أنظمة ERP العالمية — نفس تقسيم القائمة الجانبية داخل البرنامج.', 'Organized like global ERP systems — the same structure as the in-app sidebar.', 'Küresel ERP sistemleri gibi düzenlendi — uygulama içi kenar menüsüyle aynı yapı.'),
    apps_title: T('منظومة تطبيقات وشاشات متكاملة', 'A connected ecosystem of apps and screens', 'Birbirine bağlı uygulama ve ekran ekosistemi'),
    apps_sub: T('كل تطبيق يعمل كتطبيق ويب تقدمي (PWA) قابل للتثبيت على الجوال والتابلت والكمبيوتر بدون متجر تطبيقات.', 'Every app is an installable Progressive Web App (PWA) for phones, tablets and computers — no app store needed.', 'Her uygulama telefon, tablet ve bilgisayara kurulabilen bir PWA\'dır — uygulama mağazası gerekmez.'),
    acc_badge: T('الباقة المتقدمة · FI/CO', 'Advanced plan · FI/CO', 'Gelişmiş paket · FI/CO'),
    acc_title: T('محاسبة عامة وفق IFRS تُبنى تلقائياً من عملياتك', 'IFRS general accounting built automatically from your operations', 'Operasyonlarınızdan otomatik oluşan UFRS genel muhasebe'),
    acc_text: T('كل بيع وشراء ومصروف وراتب وتسوية منصة يتحول إلى قيد يومية متوازن. لا تحتاج محاسباً لإدخال القيود يدوياً، وتحصل على قوائم مالية جاهزة للمراجعة.', 'Every sale, purchase, expense, salary and platform settlement becomes a balanced journal entry. No manual bookkeeping — and you get audit-ready financial statements.', 'Her satış, alış, gider, maaş ve platform mutabakatı dengeli bir yevmiye kaydına dönüşür. Elle kayıt gerekmez; denetime hazır finansal tablolar elde edersiniz.'),
    lm_title: T('ميزان المراجعة — مثال', 'Trial balance — sample', 'Mizan — örnek'),
    lm_acc: T('الحساب', 'Account', 'Hesap'),
    lm_dr: T('مدين', 'Debit', 'Borç'),
    lm_cr: T('دائن', 'Credit', 'Alacak'),
    lm_a1: T('الصندوق', 'Cash', 'Kasa'),
    lm_a2: T('ذمم منصة توصيل', 'Delivery platform receivable', 'Teslimat platformu alacağı'),
    lm_a3: T('إيرادات المبيعات', 'Sales revenue', 'Satış gelirleri'),
    lm_a4: T('ضريبة القيمة المضافة', 'VAT payable', 'Ödenecek KDV'),
    lm_tot: T('الإجمالي (متوازن)', 'Total (balanced)', 'Toplam (dengeli)'),
    lm_foot: T('الفترات المقفلة مجمّدة — لا أثر رجعي', 'Closed periods are frozen — no retroactive changes', 'Kapanan dönemler dondurulur — geriye dönük değişiklik yok'),
    shots_title: T('شاهد البرنامج من الداخل', 'See the system from the inside', 'Sistemi içeriden görün'),
    shots_sub: T('واجهات حقيقية من Mataami Pro', 'Real screens from Mataami Pro', 'Mataami Pro\'dan gerçek ekranlar'),
    shot1: T('الكاشير ونقطة البيع', 'Cashier & POS', 'Kasa ve POS'),
    shot2: T('الطلبات والفواتير', 'Orders & invoices', 'Siparişler ve faturalar'),
    shot3: T('التقارير المالية', 'Financial reports', 'Mali raporlar'),
    shot4: T('هندسة المنيو (BCG)', 'Menu engineering (BCG)', 'Menü mühendisliği (BCG)'),
    shot5: T('المحاسبة العامة (IFRS)', 'General accounting (IFRS)', 'Genel muhasebe (IFRS)'),
    shot6: T('العملاء والولاء', 'Customers & loyalty', 'Müşteriler ve sadakat'),
    plans_title: T('اختر الباقة المناسبة لنشاطك', 'Choose the right plan for your business', 'İşletmenize uygun paketi seçin'),
    plans_sub: T('اشتراك سنوي بسعر واضح — ابدأ صغيراً وترقَّ في أي وقت.', 'Clear annual pricing — start small and upgrade any time.', 'Net yıllık fiyat — küçük başlayın, istediğiniz zaman yükseltin.'),
    popular: T('الأكثر طلباً', 'Most popular', 'En çok tercih edilen'),
    inherit_basic: T('كل ما في الأساسية، بالإضافة إلى:', 'Everything in Basic, plus:', 'Temel paketteki her şey, ayrıca:'),
    inherit_pro: T('كل ما في الإنطلاقة، بالإضافة إلى:', 'Everything in Starter, plus:', 'Başlangıç paketindeki her şey, ayrıca:'),
    subscribe_plan: T('اشترك في', 'Subscribe to', 'Abone ol:'),
    pn1: T('جميع الأسعار بالدولار الأمريكي سنوياً', 'All prices are in USD per year', 'Tüm fiyatlar yıllık ABD Doları\'dır'),
    pn2: T('يمكنك الترقية في أي وقت', 'You can upgrade any time', 'İstediğiniz zaman yükseltebilirsiniz'),
    pn3: T('دفع آمن وتفعيل فوري بعد التأكيد', 'Secure payment and instant activation after confirmation', 'Güvenli ödeme ve onay sonrası anında aktivasyon'),
    pn4: T('تجديد اشتراك قائم', 'Renew an existing subscription', 'Mevcut aboneliği yenile'),
    cmp_title: T('مقارنة تفصيلية بين الباقات', 'Detailed plan comparison', 'Ayrıntılı paket karşılaştırması'),
    cmp_sub: T('مطابقة حرفياً لما يفتحه النظام لكل باقة.', 'Exactly matches what the system unlocks for each plan.', 'Sistemin her paket için açtığı özelliklerle birebir aynıdır.'),
    cmp_feature: T('الميزة', 'Feature', 'Özellik'),
    qr_badge: T('المينيو الإلكتروني · كل الباقات', 'Digital menu · all plans', 'Dijital menü · tüm paketler'),
    qr_title: T('مينيو إلكتروني احترافي بـ QR ودومين خاص', 'A professional QR digital menu on your own domain', 'Kendi alan adınızda profesyonel QR dijital menü'),
    qr_text: T('حدّث أسعارك وصورك في ثوانٍ، واجعل العميل يطلب ويقيّم من هاتفه دون تحميل أي تطبيق.', 'Update prices and photos in seconds and let guests order and review from their phones without installing anything.', 'Fiyat ve fotoğrafları saniyeler içinde güncelleyin; misafirler hiçbir şey yüklemeden telefonlarından sipariş verip değerlendirsin.'),
    ca_badge: T('تطبيق العميل · PWA', 'Customer app · PWA', 'Müşteri uygulaması · PWA'),
    ca_title: T('تطبيق خاص لعملائك باسم مطعمك', 'Your own customer app under your brand', 'Markanızla size özel müşteri uygulaması'),
    ca_text: T('العميل يطلب، يحجز، يتابع حالة طلبه ويجمع نقاطه — وكل ذلك مرتبط مباشرة بالكاشير والمطبخ.', 'Guests order, book, track their orders and collect points — all connected directly to the cashier and kitchen.', 'Misafirler sipariş verir, rezervasyon yapar, siparişini izler ve puan toplar — hepsi doğrudan kasa ve mutfağa bağlı.'),
    ps_name: T('مطعمي برو', 'Mataami Pro', 'Mataami Pro'),
    ps_hi: T('أهلاً أحمد', 'Hi Ahmed', 'Merhaba Ahmet'),
    ps_pts: T('نقطة', 'pts', 'puan'),
    ps_menu: T('المينيو واطلب الآن', 'Menu & order now', 'Menü ve hemen sipariş'),
    ps_t1: T('احجز طاولة', 'Book a table', 'Masa ayırt'),
    ps_t2: T('نقاطي', 'My points', 'Puanlarım'),
    ps_t3: T('حالة طلبي', 'Order status', 'Sipariş durumu'),
    ps_t4: T('حسابي QR', 'My QR account', 'QR hesabım'),
    kds_h: T('شاشة المطبخ', 'Kitchen display', 'Mutfak ekranı'),
    kds_prep: T('قيد التحضير', 'Preparing', 'Hazırlanıyor'),
    kds_ready: T('جاهز للاستلام', 'Ready for pickup', 'Teslime hazır'),
    kds_badge: T('الباقة المتقدمة', 'Advanced plan', 'Gelişmiş paket'),
    kds_title: T('شاشة مطبخ وشاشة حالة الطلبات', 'Kitchen display & order status screen', 'Mutfak ekranı ve sipariş durum ekranı'),
    kds_text: T('الطلبات تصل للمطبخ لحظياً من الكاشير والمينيو وتطبيق العميل ومنصات التوصيل، وتظهر للعملاء على شاشة الانتظار.', 'Orders reach the kitchen in real time from the cashier, digital menu, customer app and delivery platforms, and appear to guests on the waiting screen.', 'Siparişler kasadan, dijital menüden, müşteri uygulamasından ve teslimat platformlarından mutfağa anında ulaşır ve bekleme ekranında misafirlere görünür.'),
    ks_badge: T('الطلب الذاتي وشاشة العميل', 'Kiosk & customer display', 'Kiosk ve müşteri ekranı'),
    ks_title: T('اطلب وادفع بنفسك — وشاهد طلبك لحظياً', 'Order and pay yourself — and see your order live', 'Kendin sipariş ver, öde — siparişini anlık gör'),
    ks_text: T('كشك طلب ذاتي بالدفع الإلكتروني يخفف الضغط عن الكاشير، وشاشة مواجهة للعميل تعرض الأصناف والإجمالي أثناء إدخال الطلب.', 'A self-order kiosk with online payment takes pressure off the cashier, and a customer-facing display shows items and totals while the order is entered.', 'Online ödemeli self servis kiosk kasanın yükünü hafifletir; müşteriye dönük ekran sipariş girilirken ürünleri ve toplamı gösterir.'),
    ks_cd: T('شاشة العميل', 'Customer display', 'Müşteri ekranı'),
    ks_h: T('الطلب الذاتي', 'Self-order', 'Self servis'),
    ks_i1: T('برجر لحم', 'Beef burger', 'Dana burger'),
    ks_i2: T('بطاطا مقلية', 'French fries', 'Patates kızartması'),
    ks_i3: T('عصير برتقال', 'Orange juice', 'Portakal suyu'),
    ks_total: T('الإجمالي', 'Total', 'Toplam'),
    ks_pay: T('ادفع الآن', 'Pay now', 'Şimdi öde'),
    ks_cal: T('السعرات', 'Calories', 'Kalori'),
    new_title: T('أحدث المزايا', 'Latest features', 'En yeni özellikler'),
    new_sub: T('تحديثات مستمرة مبنية على احتياجات المطاعم الفعلية.', 'Continuous updates built on real restaurant needs.', 'Gerçek restoran ihtiyaçlarına dayalı sürekli güncellemeler.'),
    faq_title: T('الأسئلة الشائعة', 'Frequently asked questions', 'Sıkça sorulan sorular'),
    cta_title: T('ابدأ إدارة مطعمك باحترافية اليوم', 'Start running your restaurant professionally today', 'Restoranınızı bugün profesyonelce yönetmeye başlayın'),
    cta_text: T('اشترك الآن واحصل على وصول فوري لكل وحدات باقتك.', 'Subscribe now and get instant access to every module in your plan.', 'Hemen abone olun ve paketinizdeki tüm modüllere anında erişin.'),
    cta_sub: T('اشترك الآن', 'Subscribe now', 'Hemen abone ol'),
    cta_renew: T('تجديد الاشتراك', 'Renew subscription', 'Aboneliği yenile'),
    cta_secure: T('دفع آمن · لا يتجدد تلقائياً · تفعيل فوري', 'Secure payment · No auto-renewal · Instant activation', 'Güvenli ödeme · Otomatik yenileme yok · Anında aktivasyon'),
    rights: T('جميع الحقوق محفوظة.', 'All rights reserved.', 'Tüm hakları saklıdır.'),
    foot_text: T('منظومة ERP متكاملة لإدارة المطاعم والمقاهي وسلاسل الامتياز', 'An all-in-one ERP for restaurants, cafés and franchise chains', 'Restoranlar, kafeler ve franchise zincirleri için hepsi bir arada ERP')
  };

  var HERO_HL = [
    T('7 أقسام ERP', '7 ERP areas', '7 ERP alanı'),
    T('محاسبة IFRS', 'IFRS accounting', 'UFRS muhasebe'),
    T('3 تطبيقات PWA', '3 PWA apps', '3 PWA uygulaması'),
    T('شاشات مطبخ حسب الأقسام', 'Kitchen screens by station', 'İstasyon bazlı mutfak ekranları'),
    T('طلب ذاتي (كشك) ودفع إلكتروني', 'Self-order kiosk & e-payment', 'Self servis kiosk ve e-ödeme'),
    T('مساعد ذكي AI', 'AI assistant', 'Yapay zekâ asistanı'),
    T('تقارير Excel و Word وطباعة', 'Excel, Word & print reports', 'Excel, Word ve baskı raporları')
  ];

  var STATS = [
    ['fa-layer-group', '7', T('أقسام ERP', 'ERP areas', 'ERP alanı')],
    ['fa-puzzle-piece', '50+', T('ميزة ووحدة', 'features & modules', 'özellik ve modül')],
    ['fa-mobile-alt', '9', T('تطبيقات وشاشات', 'apps & screens', 'uygulama ve ekran')],
    ['fa-language', '3', T('لغات لكل المخرجات', 'languages for every output', 'tüm çıktılar için dil')],
    ['fa-book', '7', T('أدلة امتياز جاهزة', 'ready franchise manuals', 'hazır franchise kılavuzu')]
  ];

  var PROBLEMS = [
    ['fa-calculator', T('تكلفة غير دقيقة', 'Inaccurate costing', 'Hatalı maliyet'),
      T('جداول Excel لا تحسب الهدر ولا تحدّث الأسعار تلقائياً، فتصبح قرارات التسعير مبنية على أرقام قديمة.', 'Spreadsheets ignore waste and never update prices automatically, so pricing decisions rely on outdated numbers.', 'Excel tabloları fireyi hesaba katmaz ve fiyatları otomatik güncellemez; fiyat kararları eski rakamlara dayanır.')],
    ['fa-motorcycle', T('عمولات منصات خفية', 'Hidden platform commissions', 'Gizli platform komisyonları'),
      T('عمولات التوصيل والخصومات والضرائب تأكل الهامش دون أن تظهر في تقرير واضح لكل منصة.', 'Delivery commissions, discounts and taxes eat into margins without a clear per-platform report.', 'Teslimat komisyonları, indirimler ve vergiler, platform bazında net bir rapor olmadan marjı eritir.')],
    ['fa-boxes', T('مخزون بلا رقابة', 'Uncontrolled inventory', 'Kontrolsüz stok'),
      T('الهدر والفاقد والفرق بين التكلفة الفعلية والنظرية لا يُكتشف إلا بعد فوات الأوان.', 'Waste, shrinkage and the gap between actual and theoretical cost are discovered too late.', 'Fire, kayıp ve gerçek ile teorik maliyet arasındaki fark çok geç fark edilir.')],
    ['fa-file-invoice-dollar', T('حسابات متفرقة', 'Scattered accounts', 'Dağınık hesaplar'),
      T('المبيعات والرواتب والمصروفات والذمم في أنظمة مختلفة، فلا تعرف ربحك الحقيقي ولا سيولتك.', 'Sales, payroll, expenses and receivables live in separate tools, so you never know your real profit or cash position.', 'Satışlar, maaşlar, giderler ve alacaklar ayrı araçlardadır; gerçek kârınızı ve nakit durumunuzu bilemezsiniz.')]
  ];

  /* ---------- الوحدات (مطابقة لتقسيم ERP داخل البرنامج) ---------- */
  var MODULES = [
    { ic: 'fa-chart-pie', t: T('هندسة التكلفة والمينيو', 'Cost & menu engineering', 'Maliyet ve menü mühendisliği'), plan: 'basic', li: [
      T('حساب التكلفة الحقيقية لكل طبق مع الهدر ونسب الحصص', 'True cost per dish including waste and portion yields', 'Fire ve porsiyon verimi dahil yemek başı gerçek maliyet'),
      T('هندسة المينيو BCG: النجوم، الأحصنة، الألغاز، الكلاب', 'BCG menu engineering: stars, plowhorses, puzzles, dogs', 'BCG menü mühendisliği: yıldızlar, iş atları, bilmeceler, köpekler'),
      T('تحليل نقطة التعادل وهامش المساهمة', 'Break-even and contribution margin analysis', 'Başabaş ve katkı marjı analizi'),
      T('المينيو الإلكتروني و QR مع الدومين الخاص', 'Digital menu & QR with your own domain', 'Kendi alan adınızla dijital menü ve QR'),
      T('تقييمات العملاء بثلاث لغات وتقارير الرضا', 'Customer reviews in 3 languages with satisfaction reports', '3 dilde müşteri değerlendirmeleri ve memnuniyet raporları'),
      T('حاسبة السعرات والقيم الغذائية ومسببات الحساسية الـ 14 تظهر في المينيو', 'Calorie & nutrition calculator plus the 14 allergens shown on the menu', 'Kalori ve besin değeri hesaplayıcı, menüde gösterilen 14 alerjen'),
      T('رفع أو خفض كل الأسعار بنسبة مع تقريب تلقائي ومعاينة وسجل', 'Raise or lower all prices by a percentage with auto-rounding, preview and history', 'Tüm fiyatları yüzdeyle artırma/azaltma, otomatik yuvarlama, önizleme ve geçmiş'),
      T('استيراد المواد والأطباق والمنتجات من Excel بقالب جاهز', 'Import ingredients, dishes and products from Excel with a ready template', 'Hazır şablonla Excel\'den malzeme, yemek ve ürün içe aktarma')
    ]},
    { ic: 'fa-display', t: T('الشاشات والطلب الذاتي', 'Screens & self-ordering', 'Ekranlar ve self servis'), plan: 'premium', li: [
      T('شاشات مطبخ منفصلة لكل قسم: مشويات، معجنات، بار، أراجيل', 'Separate kitchen screens per station: grill, bakery, bar, shisha', 'Her istasyon için ayrı mutfak ekranı: ızgara, hamur işi, bar, nargile'),
      T('شريط تجميع الأصناف المتشابهة من كل الفواتير المفتوحة', 'Aggregation bar for similar items across all open orders', 'Tüm açık siparişlerdeki benzer ürünler için toplama çubuğu'),
      T('شاشة طلب ذاتي (كشك) بالدفع الإلكتروني أو البطاقة أو عند الكاشير', 'Self-order kiosk with online, card or pay-at-counter payment', 'Online, kart veya kasada ödemeli self servis kiosk'),
      T('شاشة العميل المواجهة للكاشير — على نفس الجهاز أو جهاز مستقل (من الإنطلاقة)', 'Customer-facing display — on the same POS or a separate device (from Starter)', 'Müşteriye dönük ekran — aynı kasada veya ayrı cihazda (Başlangıç\'tan itibaren)'),
      T('كل الشاشات وروابطها وإعداداتها وتقاريرها في مكان واحد', 'All screens, links, settings and reports in one place', 'Tüm ekranlar, bağlantılar, ayarlar ve raporlar tek yerde')
    ]},
    { ic: 'fa-cash-register', t: T('المبيعات ونقاط البيع (SD)', 'Sales & POS (SD)', 'Satış ve POS (SD)'), plan: 'pro', li: [
      T('كاشير سريع مع قارئ QR بالكاميرا والطباعة الحرارية', 'Fast POS with camera QR scanner and thermal printing', 'Kamera QR okuyucu ve termal baskılı hızlı POS'),
      T('الطلبات والفواتير الإلكترونية والمرتجعات', 'Orders, e-invoices and returns', 'Siparişler, e-faturalar ve iadeler'),
      T('الفاتورة تحفظ السعر والتكلفة وقت البيع — لا أثر رجعي لتعديل الأسعار', 'Invoices keep the price and cost at the time of sale — no retroactive changes', 'Fatura satış anındaki fiyat ve maliyeti saklar — geriye dönük değişiklik yok'),
      T('الطاولات والحجوزات ودوام الفروع وفتح/إغلاق المطعم يدوياً', 'Tables, reservations, branch hours and manual open/close', 'Masalar, rezervasyonlar, şube saatleri ve manuel açma/kapama'),
      T('قنوات التوصيل: عقود وعمولات لكل منصة وسجل شروط بتاريخ سريان', 'Delivery channels: per-platform contracts, commissions and dated terms history', 'Teslimat kanalları: platform bazında sözleşme, komisyon ve tarihli şart geçmişi'),
      T('التوصيل وتطبيق السائق وعهدة السائقين وعروض الأسعار ودفتر الآجل', 'Delivery, driver app, driver custody, quotations and credit ledger', 'Teslimat, kurye uygulaması, kurye zimmeti, teklifler ve veresiye defteri')
    ]},
    { ic: 'fa-warehouse', t: T('سلسلة الإمداد: المخزون والمشتريات (MM)', 'Supply chain: inventory & purchasing (MM)', 'Tedarik zinciri: stok ve satın alma (MM)'), plan: 'pro', li: [
      T('المخزون والجرد والهدر بحركات تفصيلية', 'Inventory, stock counts and waste with detailed movements', 'Ayrıntılı hareketlerle stok, sayım ve fire'),
      T('فواتير الشراء والموردون وأعمار الذمم', 'Purchase invoices, suppliers and payables aging', 'Alış faturaları, tedarikçiler ve borç yaşlandırma'),
      T('دوران المخزون وأوامر شراء تلقائية من حد إعادة الطلب', 'Inventory turnover and automatic POs from reorder levels', 'Stok devir hızı ve yeniden sipariş seviyesinden otomatik satın alma'),
      T('الوصفات وأوامر الإنتاج ودفعات الإنتاج بملصقات QR', 'Recipes, production orders and batches with QR labels', 'Reçeteler, üretim emirleri ve QR etiketli partiler'),
      T('تحويلات المخزون بين الفروع', 'Stock transfers between branches', 'Şubeler arası stok transferleri'),
      T('التكلفة الفعلية مقابل النظرية', 'Actual vs theoretical cost', 'Gerçek ve teorik maliyet karşılaştırması')
    ]},
    { ic: 'fa-users', t: T('إدارة علاقات العملاء (CRM)', 'Customer relationship management (CRM)', 'Müşteri ilişkileri yönetimi (CRM)'), plan: 'pro', li: [
      T('ملفات العملاء وبرنامج الولاء بالنقاط', 'Customer profiles and points loyalty program', 'Müşteri profilleri ve puanlı sadakat programı'),
      T('بطاقات الهدايا والخصومات والعروض والتسويق', 'Gift cards, discounts, promotions and marketing', 'Hediye kartları, indirimler, kampanyalar ve pazarlama'),
      T('تحليلات CAC و CLV لكل عميل وقناة', 'CAC and CLV analytics per customer and channel', 'Müşteri ve kanal bazında CAC ve CLV analizleri'),
      T('بطاقة تقييمات Google والإشعارات الذكية', 'Google reviews card and smart notifications', 'Google yorum kartı ve akıllı bildirimler'),
      T('تطبيق خاص باسم نشاطك (White-label)', 'White-label app under your brand name', 'Markanıza özel uygulama (white-label)')
    ]},
    { ic: 'fa-balance-scale', t: T('المالية والمحاسبة (FI/CO)', 'Finance & accounting (FI/CO)', 'Finans ve muhasebe (FI/CO)'), plan: 'pro', li: [
      T('الصناديق والورديات والمصروفات بميزانيات قابلة للتخصيص', 'Cash registers, shifts and expenses with custom budgets', 'Özel bütçeli kasalar, vardiyalar ve giderler'),
      T('كشوف حسابات موحدة: العملاء، الموردون، الموظفون، الكاشير', 'Unified statements: customers, suppliers, employees, cashiers', 'Birleşik ekstreler: müşteriler, tedarikçiler, çalışanlar, kasiyerler'),
      T('محاسبة عامة IFRS: دليل حسابات شجري، يومية، أستاذ عام، ميزان مراجعة', 'IFRS general ledger: tree chart of accounts, journal, ledger, trial balance', 'UFRS genel muhasebe: ağaç hesap planı, yevmiye, defteri kebir, mizan'),
      T('القوائم المالية الأربع وإقفال الفترات وتجميد القيود', 'The four financial statements, period closing and entry freezing', 'Dört finansal tablo, dönem kapanışı ve kayıt dondurma'),
      T('الفجوة النقدية CCC والسيولة وتوقع 30/60/90 يوماً', 'Cash conversion cycle, liquidity and 30/60/90-day forecast', 'Nakit dönüşüm süresi, likidite ve 30/60/90 günlük tahmin'),
      T('الأصول الثابتة والإهلاك ورأس المال والقروض', 'Fixed assets, depreciation, capital and loans', 'Duran varlıklar, amortisman, sermaye ve krediler')
    ]},
    { ic: 'fa-user-tie', t: T('الموارد البشرية (HCM)', 'Human capital management (HCM)', 'İnsan kaynakları (HCM)'), plan: 'pro', li: [
      T('حسابات موظفين غير محدودة بأدوار وصلاحيات تفصيلية', 'Unlimited staff accounts with detailed roles and permissions', 'Ayrıntılı rol ve yetkilerle sınırsız personel hesabı'),
      T('بطاقة موظف كاملة والتكلفة الفعلية TCC ومعدل الدوران', 'Full employee card, total cost (TCC) and turnover rate', 'Tam personel kartı, toplam maliyet (TCC) ve devir oranı'),
      T('السلف والخصومات والمكافآت ومسير الرواتب', 'Advances, deductions, bonuses and payroll', 'Avanslar, kesintiler, primler ve bordro'),
      T('إدارة التشغيل: SOP والتدقيق والاستلام والتسليم', 'Operations: SOPs, audits and shift handover', 'Operasyon: SOP, denetim ve vardiya devri'),
      T('جدول الورديات وتقييم الموظفين وتحليل العمالة', 'Shift schedules, staff evaluation and labor analysis', 'Vardiya çizelgesi, personel değerlendirme ve işgücü analizi')
    ]},
    { ic: 'fa-sitemap', t: T('الإدارة والامتياز التجاري', 'Management & franchise', 'Yönetim ve franchise'), plan: 'pro', li: [
      T('إدارة فروع متعددة بتقارير موحدة', 'Multi-branch management with consolidated reports', 'Birleşik raporlarla çok şubeli yönetim'),
      T('المساعد الذكي AI مدرّب على كل أقسام المنصة بثلاث لغات', 'AI assistant trained on every area of the platform in 3 languages', 'Platformun tüm alanlarında eğitilmiş 3 dilli yapay zekâ asistanı'),
      T('سجل نشاط كامل لكل مستخدم', 'Full activity log for every user', 'Her kullanıcı için tam etkinlik kaydı'),
      T('الوصفات القياسية وبطاقات طباعة B5 / A4', 'Standard recipes and B5 / A4 print cards', 'Standart reçeteler ve B5 / A4 baskı kartları'),
      T('7 أدلة تشغيل وتأهيل للامتياز قابلة للتعديل والطباعة', '7 editable, printable franchise operations and training manuals', 'Düzenlenebilir ve yazdırılabilir 7 franchise operasyon ve eğitim kılavuzu'),
      T('إدارة الفرنشايز ولوحة المانح', 'Franchise management and franchisor dashboard', 'Franchise yönetimi ve franchise veren paneli')
    ]},
    { ic: 'fa-file-export', t: T('التقارير والمخرجات', 'Reports & outputs', 'Raporlar ve çıktılar'), plan: 'basic', li: [
      T('كل الفواتير والإيصالات والتقارير بلغة الواجهة المختارة', 'All invoices, receipts and reports in the selected interface language', 'Tüm faturalar, fişler ve raporlar seçilen arayüz dilinde'),
      T('تصدير Excel و Word وطباعة A4 وإيصالات حرارية', 'Excel and Word export, A4 printing and thermal receipts', 'Excel ve Word dışa aktarma, A4 baskı ve termal fişler'),
      T('مشاركة الفاتورة والكشوف عبر واتساب', 'Share invoices and statements via WhatsApp', 'Fatura ve ekstreleri WhatsApp ile paylaşma'),
      T('لوحة مؤشرات لحظية للمبيعات والتكلفة والربح', 'Live KPI dashboard for sales, cost and profit', 'Satış, maliyet ve kâr için canlı gösterge paneli'),
      T('تقارير الربحية حسب الصنف والتصنيف والفرع والقناة', 'Profitability by item, category, branch and channel', 'Ürün, kategori, şube ve kanala göre kârlılık')
    ]},
    { ic: 'fa-shield-halved', t: T('الأمان واللغات والنسخ الاحتياطي', 'Security, languages & backup', 'Güvenlik, diller ve yedekleme'), plan: 'basic', li: [
      T('واجهة كاملة بالعربية والإنجليزية والتركية مع اتجاه RTL/LTR تلقائي', 'Full Arabic, English and Turkish interface with automatic RTL/LTR', 'Otomatik RTL/LTR ile tam Arapça, İngilizce ve Türkçe arayüz'),
      T('تشفير كلمات المرور PBKDF2-SHA256 وحد لمحاولات الدخول', 'PBKDF2-SHA256 password hashing and login attempt limits', 'PBKDF2-SHA256 parola şifreleme ve giriş deneme sınırı'),
      T('أدوار وصلاحيات تفصيلية لكل موظف', 'Detailed roles and permissions for each employee', 'Her çalışan için ayrıntılı roller ve yetkiler'),
      T('نسخ احتياطي يدوي وأسبوعي ويومي وعند الإغلاق مع الاستعادة', 'Manual, weekly, daily and on-exit backups with restore', 'Geri yüklemeli manuel, haftalık, günlük ve çıkışta yedekleme'),
      T('بياناتك محفوظة سحابياً ومتزامنة بين الأجهزة والفروع', 'Your data is stored in the cloud and synced across devices and branches', 'Verileriniz bulutta saklanır, cihazlar ve şubeler arasında senkronize edilir')
    ]}
  ];
  var PLAN_LBL = { basic: T('كل الباقات', 'All plans', 'Tüm paketler'), pro: T('من الإنطلاقة', 'From Starter', 'Başlangıç\'tan itibaren'), premium: T('المتقدمة', 'Advanced', 'Gelişmiş') };

  var APPS = [
    ['fa-desktop', T('تطبيق الفريق والإدارة', 'Team & management app', 'Ekip ve yönetim uygulaması'), T('لوحة التحكم، الكاشير، المخزون، المحاسبة والتقارير بصلاحيات لكل دور.', 'Dashboard, POS, inventory, accounting and reports with role-based permissions.', 'Rol bazlı yetkilerle kontrol paneli, POS, stok, muhasebe ve raporlar.')],
    ['fa-mobile-alt', T('تطبيق العميل', 'Customer app', 'Müşteri uygulaması'), T('طلب وحجز ونقاط ولاء وحالة الطلب، باسم مطعمك وألوانه.', 'Ordering, booking, loyalty points and order tracking — in your brand and colors.', 'Markanız ve renklerinizle sipariş, rezervasyon, sadakat puanı ve sipariş takibi.')],
    ['fa-motorcycle', T('تطبيق السائق', 'Driver app', 'Kurye uygulaması'), T('استلام الطلبات والتوصيل وتحصيل المبالغ وعهدة كل سائق.', 'Pick up and deliver orders, collect payments and track each driver\'s custody.', 'Siparişleri al ve teslim et, tahsilat yap ve her kuryenin zimmetini izle.')],
    ['fa-fire-burner', T('شاشة المطبخ KDS', 'Kitchen display (KDS)', 'Mutfak ekranı (KDS)'), T('ترتيب الطلبات حسب الوقت والقناة مع تنبيهات التأخير.', 'Orders sorted by time and channel with delay alerts.', 'Gecikme uyarılarıyla zamana ve kanala göre sıralanmış siparişler.')],
    ['fa-layer-group', T('شاشات أقسام المطبخ', 'Kitchen station screens', 'Mutfak istasyon ekranları'), T('شاشة لكل قسم مع تجميع الأصناف المتشابهة وأقسام مرتبطة أو مستقلة.', 'A screen per station with similar-item aggregation and linked or independent stations.', 'Benzer ürün toplama ve bağlı/bağımsız istasyonlarla her istasyon için bir ekran.')],
    ['fa-tablet-screen-button', T('شاشة الطلب الذاتي (كشك)', 'Self-order kiosk', 'Self servis kiosk'), T('يطلب العميل ويدفع إلكترونياً أو بالبطاقة ويصل الطلب للمطبخ مباشرة.', 'Guests order and pay online or by card, and the order goes straight to the kitchen.', 'Misafir sipariş verip online veya kartla öder, sipariş doğrudan mutfağa gider.')],
    ['fa-display', T('شاشة العميل', 'Customer display', 'Müşteri ekranı'), T('شاشة مواجهة للعميل تعرض الطلب والإجمالي لحظياً أثناء الكاشير.', 'A customer-facing screen showing the order and total live at the POS.', 'Kasada siparişi ve toplamı anlık gösteren müşteriye dönük ekran.')],
    ['fa-tv', T('شاشة حالة الطلبات', 'Order status screen', 'Sipariş durum ekranı'), T('أرقام قيد التحضير وجاهز للاستلام لعملاء الصالة.', 'Preparing and ready numbers for dine-in guests.', 'Salon misafirleri için hazırlanıyor ve hazır numaraları.')],
    ['fa-qrcode', T('المينيو الإلكتروني وصفحة التقييم', 'Digital menu & review page', 'Dijital menü ve değerlendirme sayfası'), T('مينيو QR بدومين خاص وصفحة تقييم سريعة بثلاث لغات.', 'QR menu on a custom domain and a quick review page in 3 languages.', 'Özel alan adlı QR menü ve 3 dilde hızlı değerlendirme sayfası.')]
  ];

  var ACC_LIST = [
    T('دليل حسابات شجري بطبيعة كل حساب وأرصدته، ومنتقي حسابات بالبحث', 'Tree chart of accounts with account nature and balances, plus a searchable account picker', 'Hesap niteliği ve bakiyeleriyle ağaç hesap planı ve aranabilir hesap seçici'),
    T('اليومية التفصيلية بأرقام القيود والأستاذ العام وميزان المراجعة', 'Detailed journal with entry numbers, general ledger and trial balance', 'Kayıt numaralı ayrıntılı yevmiye, defteri kebir ve mizan'),
    T('قائمة الدخل، المركز المالي، التدفقات النقدية، التغيرات في حقوق الملكية', 'Income statement, financial position, cash flows and changes in equity', 'Gelir tablosu, finansal durum, nakit akışları ve özkaynak değişimleri'),
    T('حساب فرعي لكل منصة توصيل تحت 1210 وقيود إقفال الرصيد وعكسها', 'A sub-account per delivery platform under 1210, with balance-closing and reversal entries', '1210 altında her teslimat platformu için alt hesap, bakiye kapama ve ters kayıtlar'),
    T('الإغلاق الآجل على المنصات ومطابقة كشوفها وأعمار الذمم والسداد', 'Credit closing on platforms, statement reconciliation, aging and payments', 'Platformlarda vadeli kapanış, ekstre mutabakatı, yaşlandırma ve ödemeler'),
    T('إقفال شهري تلقائي وتجميد القيود — لا أثر رجعي لتعديل الأسعار أو العمولات', 'Automatic monthly close and entry freezing — price or commission changes never rewrite history', 'Otomatik aylık kapanış ve kayıt dondurma — fiyat veya komisyon değişiklikleri geçmişi değiştirmez')
  ];

  var QR_LIST = [
    T('تحديث فوري للأسعار والصور والتوفر', 'Instant updates to prices, photos and availability', 'Fiyat, fotoğraf ve stok durumunda anında güncelleme'),
    T('دومين خاص باسم مطعمك', 'A custom domain with your restaurant name', 'Restoranınızın adıyla özel alan adı'),
    T('الطلب من المينيو مباشرة إلى الكاشير', 'Orders go from the menu straight to the cashier', 'Menüden doğrudan kasaya sipariş'),
    T('المينيو والتقييمات بالعربية والإنجليزية والتركية', 'Menu and reviews in Arabic, English and Turkish', 'Arapça, İngilizce ve Türkçe menü ve değerlendirmeler'),
    T('بطاقة تقييمات Google لرفع تقييمك على الخرائط', 'Google reviews card to boost your Maps rating', 'Haritalardaki puanınızı yükseltmek için Google yorum kartı')
  ];
  var CA_LIST = [
    T('طلب من المينيو مع متابعة الحالة لحظياً', 'Order from the menu with live status tracking', 'Canlı durum takibiyle menüden sipariş'),
    T('حجز الطاولات من الجوال', 'Table booking from the phone', 'Telefondan masa rezervasyonu'),
    T('نقاط الولاء وبطاقات الهدايا', 'Loyalty points and gift cards', 'Sadakat puanları ve hediye kartları'),
    T('بطاقة عميل QR يمسحها الكاشير', 'Customer QR card scanned by the cashier', 'Kasiyerin okuttuğu müşteri QR kartı'),
    T('تثبيت على الشاشة الرئيسية بدون متجر تطبيقات', 'Install to the home screen — no app store', 'Uygulama mağazası olmadan ana ekrana kurulum')
  ];
  var KDS_LIST = [
    T('استقبال لحظي من كل القنوات', 'Real-time intake from every channel', 'Tüm kanallardan anlık sipariş alımı'),
    T('ترتيب حسب الوقت وتنبيهات التأخير', 'Time-based ordering and delay alerts', 'Zamana göre sıralama ve gecikme uyarıları'),
    T('شاشة مستقلة لكل قسم: مشويات، معجنات، بار، أراجيل', 'A separate screen per station: grill, bakery, bar, shisha', 'Her istasyona ayrı ekran: ızgara, hamur işi, bar, nargile'),
    T('تجميع الأصناف المتشابهة من كل الطلبات المفتوحة', 'Aggregation of similar items across open orders', 'Açık siparişlerdeki benzer ürünlerin toplanması'),
    T('شاشة انتظار للعملاء: قيد التحضير / جاهز', 'Guest waiting screen: preparing / ready', 'Misafir bekleme ekranı: hazırlanıyor / hazır'),
    T('ربط مع تطبيق السائق للطلبات الخارجية', 'Linked to the driver app for delivery orders', 'Paket siparişler için kurye uygulamasıyla bağlantı')
  ];

  var KS_LIST = [
    T('دفع إلكتروني بـ QR أو بالبطاقة أو عند الكاشير', 'Pay by QR, card or at the counter', 'QR, kart veya kasada ödeme'),
    T('السعرات ومسببات الحساسية بجانب كل صنف', 'Calories and allergens next to every item', 'Her ürünün yanında kalori ve alerjenler'),
    T('الطلب يصل لقسمه في المطبخ تلقائياً', 'The order reaches its kitchen station automatically', 'Sipariş mutfaktaki istasyonuna otomatik ulaşır'),
    T('شاشة العميل على نفس جهاز الكاشير أو جهاز مستقل', 'Customer display on the same POS or a separate device', 'Müşteri ekranı aynı kasada veya ayrı cihazda')
  ];

  var NEWS = [
    ['fa-language', T('أسماء الأصناف بثلاث لغات', 'Item names in 3 languages', '3 dilde ürün adları'), T('سجّل اسم كل صنف وقسم بالعربية والإنجليزية والتركية؛ المينيو والكشك والتطبيق تعرض لكل عميل لغته، ولا يترجم البرنامج أسماءك آلياً.', 'Enter each item and category name in Arabic, English and Turkish; the menu, kiosk and app show every customer their own language, and your names are never machine-translated.', 'Her ürün ve kategori adını Arapça, İngilizce ve Türkçe girin; menü, kiosk ve uygulama her müşteriye kendi dilini gösterir ve adlarınız asla otomatik çevrilmez.')],
    ['fa-rotate-left', T('إرجاع ذكي للمخزون عند الإلغاء', 'Smart return to stock on cancel', 'İptalde akıllı stok iadesi'), T('المنتج المستقل المغلق مثل المشروبات الغازية يعود للمخزون، والطبق المحضّر يُسجّل تالفاً، مع مفتاح لكل سطر.', 'Sealed standalone products such as soft drinks return to stock, prepared dishes are recorded as waste, with a switch on every line.', 'Gazlı içecek gibi açılmamış bağımsız ürünler stoğa döner, hazırlanan yemekler fire olarak kaydedilir; her satırda bir anahtar bulunur.')],
    ['fa-calculator', T('حاسبة السعرات بالمعايير الدولية', 'Calorie calculator to international standards', 'Uluslararası standartlarda kalori hesaplayıcı'), T('معاملات Atwater وقاعدة USDA لسعرات الأطباق، ومعادلة Mifflin-St Jeor للاحتياج اليومي ومؤشر كتلة الجسم.', 'Atwater factors and the USDA database for dish calories, plus the Mifflin-St Jeor equation for daily needs and BMI.', 'Yemek kalorileri için Atwater katsayıları ve USDA veritabanı; günlük ihtiyaç için Mifflin-St Jeor denklemi ve VKİ.')],
    ['fa-eraser', T('تهيئة البيانات بأمان', 'Safe data reset', 'Güvenli veri sıfırlama'), T('زر «تهيئة البيانات» في النسخ الاحتياطي يلزمك بتنزيل نسخة احتياطية أولاً مع تحذير وتأكيد كتابي، وحذف عدة منتجات دفعة واحدة.', 'The data reset button in backups requires downloading a backup first, with a warning and typed confirmation; plus bulk deletion of products.', 'Yedeklemedeki veri sıfırlama düğmesi önce yedek indirmeyi, uyarı ve yazılı onayı zorunlu kılar; ayrıca toplu ürün silme.')],
    ['fa-clone', T('منع تكرار الأسماء', 'Duplicate-name prevention', 'Yinelenen ad engelleme'), T('لا يقبل البرنامج نفس الاسم مرتين في الأقسام أو المنتجات أو الأطباق، حتى مع اختلاف الهمزات والتاء المربوطة.', 'The same name is never accepted twice in categories, products or dishes, even with different hamza or taa marbuta spellings.', 'Aynı ad kategorilerde, ürünlerde veya yemeklerde iki kez kabul edilmez; yazım farklarında bile.')],
    ['fa-layer-group', T('شاشات المطبخ حسب الأقسام', 'Kitchen screens by station', 'İstasyon bazlı mutfak ekranları'), T('قسّم المطبخ إلى مشويات ومعجنات وبار وأراجيل، لكل قسم شاشته مع شريط تجميع الأصناف المتشابهة.', 'Split the kitchen into grill, bakery, bar and shisha — each station gets its own screen with a similar-items aggregation bar.', 'Mutfağı ızgara, hamur işi, bar ve nargileye ayırın; her istasyonun benzer ürün toplama çubuklu kendi ekranı olsun.')],
    ['fa-tablet-screen-button', T('الطلب الذاتي وشاشة العميل', 'Self-order kiosk & customer display', 'Self servis kiosk ve müşteri ekranı'), T('كشك يطلب ويدفع فيه العميل بنفسه، وشاشة مواجهة للعميل تعرض طلبه لحظياً — وكل الشاشات في مكان واحد.', 'A kiosk where guests order and pay themselves, plus a customer-facing display showing the order live — all screens managed in one place.', 'Misafirin kendisi sipariş verip ödediği kiosk ve siparişi anlık gösteren müşteri ekranı — tüm ekranlar tek yerden yönetilir.')],
    ['fa-heart-pulse', T('السعرات ومسببات الحساسية', 'Calories & allergens', 'Kalori ve alerjenler'), T('حساب تلقائي للسعرات والقيم الغذائية من مكونات كل طبق، ومسببات الحساسية تظهر في المينيو والكشك.', 'Automatic calories and nutrition from each dish\'s ingredients, with allergens shown on the menu and kiosk.', 'Her yemeğin malzemelerinden otomatik kalori ve besin değerleri; alerjenler menüde ve kioskta görünür.')],
    ['fa-percent', T('تعديل الأسعار بنسبة واستيراد Excel', 'Bulk price % & Excel import', 'Toplu fiyat % ve Excel içe aktarma'), T('ارفع كل الأسعار بنسبة واحدة مع التقريب، واستورد بياناتك من أي برنامج آخر بقالب Excel جاهز.', 'Raise all prices by one percentage with rounding, and import your data from any other system with a ready Excel template.', 'Tüm fiyatları yuvarlamayla tek yüzdeyle artırın, verilerinizi hazır Excel şablonuyla başka sistemlerden aktarın.')],
    ['fa-language', T('كل المخرجات بلغة الواجهة', 'Every output in the interface language', 'Tüm çıktılar arayüz dilinde'), T('الفواتير والإيصالات والتقارير وملفات Excel و Word والطباعة ورسائل واتساب تصدر بالعربية أو الإنجليزية أو التركية حسب اللغة المختارة، مع اتجاه الصفحة الصحيح.', 'Invoices, receipts, reports, Excel and Word files, printouts and WhatsApp messages follow the selected language (Arabic, English or Turkish) with the correct page direction.', 'Faturalar, fişler, raporlar, Excel ve Word dosyaları, baskılar ve WhatsApp mesajları seçilen dilde (Arapça, İngilizce veya Türkçe) ve doğru sayfa yönüyle çıkar.'), '5.3.2'],
    ['fa-book', T('أدلة الامتياز و SOP بثلاث لغات', 'Franchise manuals & SOPs in 3 languages', '3 dilde franchise kılavuzları ve SOP\'ler'), T('قوالب الأدلة السبعة وإجراءات التشغيل القياسية متاحة بالكامل بكل لغة.', 'All seven manual templates and standard operating procedures are fully available in each language.', 'Yedi kılavuz şablonu ve standart operasyon prosedürleri her dilde eksiksiz mevcuttur.'), '5.3.2'],
    ['fa-handshake', T('إقفال رصيد المنصات وقيود العكس', 'Platform balance closing & reversals', 'Platform bakiye kapama ve ters kayıtlar'), T('حساب فرعي لكل منصة تحت 1210، مع قيود إقفال الرصيد وعكسها عند الحاجة.', 'A sub-account per platform under 1210, with balance-closing entries and reversals when needed.', '1210 altında her platform için alt hesap; bakiye kapama kayıtları ve gerektiğinde ters kayıtlar.'), '5.3.1'],
    ['fa-file-contract', T('سجل شروط عقود المنصات', 'Platform contract terms history', 'Platform sözleşme şartları geçmişi'), T('كل طلب يحتفظ بنسبة العمولة وقت تنفيذه، وتعديل الشروط له تاريخ سريان.', 'Each order keeps the commission rate at the time it was placed; term changes have effective dates.', 'Her sipariş verildiği andaki komisyon oranını saklar; şart değişikliklerinin yürürlük tarihi vardır.'), '5.3'],
    ['fa-lock', T('تجميد القيود والإقفال التلقائي', 'Entry freezing & auto close', 'Kayıt dondurma ve otomatik kapanış'), T('الفترات المقفلة لا تتغير، والإقفال الشهري يتم تلقائياً.', 'Closed periods never change and the monthly close runs automatically.', 'Kapanan dönemler değişmez ve aylık kapanış otomatik yapılır.'), '5.2'],
    ['fa-robot', T('المساعد الذكي AI', 'AI assistant', 'Yapay zekâ asistanı'), T('اسأل عن أي رقم أو إجراء في المنصة بلغتك واحصل على إجابة فورية.', 'Ask about any figure or procedure in the platform in your language and get an instant answer.', 'Platformdaki herhangi bir rakam veya işlem hakkında kendi dilinizde sorun, anında yanıt alın.'), '5.1'],
    ['fa-shield-alt', T('أمان ونسخ احتياطي', 'Security & backups', 'Güvenlik ve yedekleme'), T('تشفير كلمات المرور PBKDF2-SHA256، حماية من محاولات الدخول المتكررة، ونسخ احتياطي يدوي وأسبوعي ويومي وعند الإغلاق.', 'PBKDF2-SHA256 password hashing, login rate limiting, and manual, weekly, daily and on-exit backups.', 'PBKDF2-SHA256 parola şifreleme, giriş deneme sınırı ve manuel, haftalık, günlük ve çıkışta yedekleme.'), ''],
    ['fa-industry', T('دفعات الإنتاج وملصقات QR', 'Production batches & QR labels', 'Üretim partileri ve QR etiketler'), T('ملصقات بتاريخ الإنتاج والانتهاء لكل دفعة، مع تتبع الاستهلاك.', 'Labels with production and expiry dates for each batch, with consumption tracking.', 'Her parti için üretim ve son kullanma tarihli etiketler ve tüketim takibi.'), '']
  ];

  /* ---------- الباقات ---------- */
  var PLANS = [
    { key: 'basic', price: 99, name: T('الأساسية', 'Basic', 'Temel'), tag: T('هندسة المنيو والمينيو الإلكتروني', 'Menu engineering & digital menu', 'Menü mühendisliği ve dijital menü'),
      br: T('فرع واحد', 'One branch', 'Tek şube'), inh: null, li: [
        T('حساب تكلفة الأطباق والمواد الأولية', 'Dish and raw material costing', 'Yemek ve hammadde maliyeti'),
        T('هندسة المنيو ونقطة التعادل', 'Menu engineering and break-even', 'Menü mühendisliği ve başabaş'),
        T('المينيو الإلكتروني و QR مع الدومين الخاص', 'Digital menu & QR with your own domain', 'Kendi alan adınızla dijital menü ve QR'),
        T('تقييمات العملاء بثلاث لغات', 'Customer reviews in 3 languages', '3 dilde müşteri değerlendirmeleri'),
        T('الواجهة والمخرجات بثلاث لغات', 'Interface and outputs in 3 languages', 'Arayüz ve çıktılar 3 dilde'),
        T('نسخ احتياطي شامل (يدوي / تلقائي / عند الإغلاق)', 'Full backup (manual / automatic / on exit)', 'Tam yedekleme (manuel / otomatik / çıkışta)'),
        T('الفاتورة تحفظ السعر والتكلفة وقت البيع', 'Invoices keep price and cost at time of sale', 'Fatura satış anındaki fiyat ve maliyeti saklar'),
        T('السعرات الحرارية ومسببات الحساسية في المينيو', 'Calories and allergens on the menu', 'Menüde kalori ve alerjenler'),
        T('تعديل الأسعار بنسبة واستيراد البيانات من Excel', 'Price % adjustment and Excel data import', 'Yüzdeyle fiyat ayarı ve Excel\'den veri aktarımı')
      ]},
    { key: 'pro', price: 299, popular: true, name: T('الإنطلاقة', 'Starter', 'Başlangıç'), tag: T('كل ما تحتاجه لإدارة وتشغيل نشاطك بكفاءة', 'Everything you need to run your business efficiently', 'İşletmenizi verimli yönetmek için ihtiyacınız olan her şey'),
      br: T('فرع واحد · حتى 1,000 منتج', 'One branch · up to 1,000 products', 'Tek şube · 1.000 ürüne kadar'), inh: 'inherit_basic', li: [
        T('الكاشير ونقطة البيع مع قارئ QR', 'Cashier & POS with QR scanner', 'QR okuyuculu kasa ve POS'),
        T('الطلب من المينيو وتطبيق العميل إلى الكاشير', 'Orders from the menu and customer app to the cashier', 'Menü ve müşteri uygulamasından kasaya sipariş'),
        T('شاشة العميل المواجهة للكاشير', 'Customer-facing display at the POS', 'Kasada müşteriye dönük ekran'),
        T('الطاولات والحجوزات ودوام الفرع', 'Tables, reservations and branch hours', 'Masalar, rezervasyonlar ve şube saatleri'),
        T('قنوات التوصيل وعمولاتها وربحيتها', 'Delivery channels, commissions and profitability', 'Teslimat kanalları, komisyonlar ve kârlılık'),
        T('المخزون والجرد والهدر', 'Inventory, stock counts and waste', 'Stok, sayım ve fire'),
        T('العملاء والولاء وبطاقات الهدايا و CAC/CLV', 'Customers, loyalty, gift cards and CAC/CLV', 'Müşteriler, sadakat, hediye kartları ve CAC/CLV'),
        T('الحسابات والمصروفات والتقارير المالية', 'Accounts, expenses and financial reports', 'Hesaplar, giderler ve finansal raporlar'),
        T('كشوف حسابات موحدة', 'Unified account statements', 'Birleşik hesap ekstreleri'),
        T('موظفون غير محدودين ومسير الرواتب', 'Unlimited staff and payroll', 'Sınırsız personel ve bordro'),
        T('إدارة التشغيل: SOP، التسليم، الورديات، التقييم', 'Operations: SOP, handover, schedules, evaluation', 'Operasyon: SOP, devir, vardiyalar, değerlendirme'),
        T('المساعد الذكي AI بثلاث لغات', 'AI assistant in 3 languages', '3 dilde yapay zekâ asistanı')
      ]},
    { key: 'premium', price: 499, name: T('المتقدمة', 'Advanced', 'Gelişmiş'), tag: T('نظام ERP متكامل مع محاسبة عامة وفق IFRS', 'A complete ERP with IFRS general accounting', 'UFRS genel muhasebeli eksiksiz ERP'),
      br: T('فروع متعددة · منتجات بلا حد', 'Multiple branches · unlimited products', 'Çoklu şube · sınırsız ürün'), inh: 'inherit_pro', li: [
        T('المحاسبة العامة والقوائم المالية IFRS', 'IFRS general ledger and financial statements', 'UFRS genel muhasebe ve finansal tablolar'),
        T('تسويات المنصات والذمم والإغلاق الآجل', 'Platform settlements, receivables and credit closing', 'Platform mutabakatları, alacaklar ve vadeli kapanış'),
        T('الأصول والقروض والسيولة والفجوة النقدية', 'Assets, loans, liquidity and cash conversion cycle', 'Varlıklar, krediler, likidite ve nakit döngüsü'),
        T('المشتريات والموردون وأوامر الشراء التلقائية', 'Purchasing, suppliers and automatic POs', 'Satın alma, tedarikçiler ve otomatik siparişler'),
        T('الوصفات والإنتاج وملصقات QR', 'Recipes, production and QR labels', 'Reçeteler, üretim ve QR etiketler'),
        T('التكلفة الفعلية مقابل النظرية', 'Actual vs theoretical cost', 'Gerçek ve teorik maliyet'),
        T('شاشة المطبخ وشاشة حالة الطلبات', 'Kitchen display and order status screen', 'Mutfak ekranı ve sipariş durum ekranı'),
        T('شاشات المطبخ حسب الأقسام مع تجميع الأصناف', 'Kitchen screens by station with item aggregation', 'Ürün toplamalı istasyon bazlı mutfak ekranları'),
        T('شاشة الطلب الذاتي (كشك) مع الدفع الإلكتروني', 'Self-order kiosk with online payment', 'Online ödemeli self servis kiosk'),
        T('التوصيل وتطبيق السائق والعهدة', 'Delivery, driver app and custody', 'Teslimat, kurye uygulaması ve zimmet'),
        T('فروع متعددة وتحويلات المخزون', 'Multiple branches and stock transfers', 'Çoklu şube ve stok transferleri'),
        T('تطبيق خاص باسم نشاطك وسجل النشاط', 'White-label app and activity log', 'Markalı uygulama ve etkinlik kaydı'),
        T('الوصفات القياسية و7 أدلة امتياز والفرنشايز', 'Standard recipes, 7 franchise manuals and franchising', 'Standart reçeteler, 7 franchise kılavuzu ve franchise')
      ]}
  ];

  /* جدول المقارنة — مطابق لـ FC_PLAN_ROWS في js/plans-data.js */
  var H = function (a, e, t) { return ['#', T(a, e, t)]; };
  var R = function (a, e, t, b, p, v) { return [T(a, e, t), b, p, v]; };
  var ROWS = [
    H('هندسة التكلفة والمينيو', 'Cost & menu engineering', 'Maliyet ve menü mühendisliği'),
    R('حساب التكلفة الحقيقية لكل طبق والمواد الأولية', 'True cost of every dish and raw materials', 'Her yemeğin ve hammaddelerin gerçek maliyeti', 1, 1, 1),
    R('هندسة المنيو (تحليل النجوم والأحصنة) ونقطة التعادل', 'Menu engineering (stars & plowhorses analysis) and break-even', 'Menü mühendisliği (yıldız ve iş atı analizi) ve başabaş', 1, 1, 1),
    R('المينيو الإلكتروني و QR مع الدومين الخاص', 'Digital menu & QR with your own domain', 'Kendi alan adınızla dijital menü ve QR', 1, 1, 1),
    R('تقييمات العملاء بثلاث لغات وصفحة تقييم مناسبة للجوال', 'Customer reviews in 3 languages with a mobile-friendly review page', '3 dilde müşteri değerlendirmeleri ve mobil uyumlu değerlendirme sayfası', 1, 1, 1),
    R('الواجهة بالعربية والإنجليزية والتركية والنسخ الاحتياطي الشامل (يدوي/أسبوعي تلقائي/عند الإغلاق)', 'Arabic, English and Turkish interface with full backup (manual / automatic weekly / on exit)', 'Arapça, İngilizce ve Türkçe arayüz ve tam yedekleme (manuel / otomatik haftalık / çıkışta)', 1, 1, 1),
    H('المبيعات ونقاط البيع (SD)', 'Sales & POS (SD)', 'Satış ve POS (SD)'),
    R('الفاتورة تحتفظ بسعر الطبق وتكلفته وقت البيع — تعديل الأسعار لا يغيّر أي فاتورة سابقة', 'Invoices keep the dish price and cost at the time of sale — price changes never alter past invoices', 'Fatura, satış anındaki yemek fiyatını ve maliyetini saklar — fiyat değişiklikleri geçmiş faturaları değiştirmez', 1, 1, 1),
    R('الكاشير ونقطة البيع مع قارئ QR بالكاميرا', 'Cashier & POS with camera QR scanner', 'Kamera QR okuyuculu kasa ve POS', 0, 1, 1),
    R('الطلبات والفواتير الإلكترونية والمرتجعات', 'Orders, e-invoices and returns', 'Siparişler, e-faturalar ve iadeler', 0, 1, 1),
    R('الطلب من المينيو الإلكتروني إلى الكاشير وتطبيق العميل (PWA)', 'Ordering from the digital menu to the cashier and the customer app (PWA)', 'Dijital menüden kasaya sipariş ve müşteri uygulaması (PWA)', 0, 1, 1),
    R('دوام الفروع وفتح/إغلاق المطعم يدوياً', 'Branch hours and manual restaurant open/close', 'Şube çalışma saatleri ve restoranı manuel açma/kapama', 0, 1, 1),
    R('الطاولات والحجوزات', 'Tables & reservations', 'Masalar ve rezervasyonlar', 0, 1, 1),
    R('قنوات التوصيل: عقود وعمولات لكل منصة وتقرير ربحية القنوات', 'Delivery channels: contracts and commissions per platform, with a channel profitability report', 'Teslimat kanalları: platform bazında sözleşme ve komisyonlar, kanal kârlılık raporu', 0, 1, 1),
    R('سجل شروط عقد كل منصة بتاريخ سريان — كل طلب يحتفظ بنسبة العمولة وقت تنفيذه', 'Contract terms history per platform with effective dates — each order keeps its commission rate at the time it was placed', 'Platform bazında yürürlük tarihli sözleşme şartları geçmişi — her sipariş verildiği andaki komisyon oranını saklar', 0, 1, 1),
    R('التوصيل وتطبيق السائق وعهدة السائقين', 'Delivery, driver app and driver custody', 'Teslimat, kurye uygulaması ve kurye zimmeti', 0, 0, 1),
    R('شاشة المطبخ وشاشة حالة الطلبات للعملاء', 'Kitchen display and customer order status screen', 'Mutfak ekranı ve müşteri sipariş durum ekranı', 0, 0, 1),
    R('شاشات مطبخ متعددة حسب الأقسام (مشويات، معجنات، بار، أراجيل) مع تجميع الأصناف المتشابهة', 'Multiple kitchen screens by station (grill, bakery, bar, shisha) with similar-item aggregation', 'Benzer ürün toplamalı, istasyona göre çoklu mutfak ekranı (ızgara, hamur işi, bar, nargile)', 0, 0, 1),
    R('شاشة الطلب الذاتي (كشك) مع الدفع الإلكتروني', 'Self-order kiosk with online payment', 'Online ödemeli self servis kiosk', 0, 0, 1),
    R('شاشة العميل المواجهة للكاشير', 'Customer-facing display at the POS', 'Kasada müşteriye dönük ekran', 0, 1, 1),
    R('حاسبة السعرات الحرارية ومسببات الحساسية في المينيو', 'Calorie calculator and allergens on the menu', 'Menüde kalori hesaplayıcı ve alerjenler', 1, 1, 1),
    R('رفع الأسعار بنسبة مئوية واستيراد الأطباق والمواد من Excel', 'Percentage price increases and importing dishes and ingredients from Excel', 'Yüzdesel fiyat artışı ve Excel\'den yemek ve malzeme aktarımı', 1, 1, 1),
    R('أسماء الأصناف والأقسام بثلاث لغات في المينيو والكشك والتطبيق', 'Item and category names in 3 languages on the menu, kiosk and app', 'Menü, kiosk ve uygulamada 3 dilde ürün ve kategori adları', 1, 1, 1),
    R('حذف عدة منتجات دفعة واحدة ومنع تكرار الأسماء وتهيئة البيانات بعد نسخة احتياطية إلزامية', 'Bulk product deletion, duplicate-name prevention and data reset after a mandatory backup', 'Toplu ürün silme, yinelenen ad engelleme ve zorunlu yedekten sonra veri sıfırlama', 1, 1, 1),
    R('الإرجاع الذكي للمخزون عند الإلغاء والاسترجاع (المنتج المستقل مقابل الطبق المحضّر)', 'Smart return to stock on cancel and refund (standalone product vs prepared dish)', 'İptal ve iadede akıllı stok iadesi (bağımsız ürün ve hazırlanan yemek)', 0, 1, 1),
    R('عروض الأسعار ودفتر الآجل', 'Quotations and credit ledger', 'Fiyat teklifleri ve veresiye defteri', 0, 0, 1),
    H('سلسلة الإمداد: المخزون والمشتريات (MM)', 'Supply chain: inventory & purchasing (MM)', 'Tedarik zinciri: stok ve satın alma (MM)'),
    R('المخزون والجرد والهدر', 'Inventory, stock counts and waste', 'Stok, sayım ve fire', 0, 1, 1),
    R('عدد المنتجات', 'Number of products', 'Ürün sayısı', 0, T('حتى 1,000', 'Up to 1,000', '1.000\'e kadar'), T('بلا حد', 'Unlimited', 'Sınırsız')),
    R('فواتير الشراء والموردون', 'Purchase invoices and suppliers', 'Alış faturaları ve tedarikçiler', 0, 0, 1),
    R('دوران المخزون وأوامر الشراء التلقائية من حد إعادة الطلب', 'Inventory turnover and automatic purchase orders from reorder levels', 'Stok devir hızı ve yeniden sipariş seviyesinden otomatik satın alma siparişleri', 0, 0, 1),
    R('الوصفات والتركيبات وأوامر الإنتاج (مع الحذف والإلغاء)', 'Recipes, compositions and production orders (with delete and cancel)', 'Reçeteler, karışımlar ve üretim emirleri (silme ve iptal ile)', 0, 0, 1),
    R('دفعات الإنتاج وملصقات QR بتاريخ الإنتاج والانتهاء', 'Production batches and QR labels with production and expiry dates', 'Üretim partileri ve üretim/son kullanma tarihli QR etiketler', 0, 0, 1),
    R('تحويلات المخزون بين الفروع', 'Stock transfers between branches', 'Şubeler arası stok transferleri', 0, 0, 1),
    R('التكلفة الفعلية مقابل النظرية (الوصفة والمخزون)', 'Actual vs theoretical cost (recipe and inventory)', 'Gerçek ve teorik maliyet (reçete ve stok)', 0, 0, 1),
    H('إدارة علاقات العملاء (CRM)', 'Customer relationship management (CRM)', 'Müşteri ilişkileri yönetimi (CRM)'),
    R('العملاء وبرنامج الولاء (النقاط) وبطاقات الهدايا', 'Customers, loyalty program (points) and gift cards', 'Müşteriler, sadakat programı (puan) ve hediye kartları', 0, 1, 1),
    R('الخصومات والعروض والتسويق', 'Discounts, offers and marketing', 'İndirimler, kampanyalar ve pazarlama', 0, 1, 1),
    R('تحليلات العملاء: تكلفة الاستحواذ (CAC) والقيمة الدائمة (CLV)', 'Customer analytics: acquisition cost (CAC) and lifetime value (CLV)', 'Müşteri analizleri: edinme maliyeti (CAC) ve yaşam boyu değer (CLV)', 0, 1, 1),
    R('بطاقة تقييمات Google والإشعارات الذكية', 'Google reviews card and smart notifications', 'Google yorum kartı ve akıllı bildirimler', 0, 1, 1),
    R('تطبيق خاص باسم نشاطك', 'Your own branded app', 'İşletmenize özel markalı uygulama', 0, 0, 1),
    H('المالية والمحاسبة (FI/CO)', 'Finance & accounting (FI/CO)', 'Finans ve muhasebe (FI/CO)'),
    R('الحسابات والمصروفات والورديات والصناديق', 'Accounts, expenses, shifts and cash registers', 'Hesaplar, giderler, vardiyalar ve kasalar', 0, 1, 1),
    R('التقارير المالية وقائمة الدخل الموحدة', 'Financial reports and consolidated income statement', 'Finansal raporlar ve birleşik gelir tablosu', 0, 1, 1),
    R('كشوف الحسابات الموحدة: العملاء، الموردون، الموظفون، الكاشير', 'Unified statements: customers, suppliers, employees, cashier', 'Birleşik ekstreler: müşteriler, tedarikçiler, çalışanlar, kasiyer', 0, 1, 1),
    R('بنود مصروفات قابلة للتخصيص مع الميزانية', 'Customizable expense items with budgets', 'Bütçeli özelleştirilebilir gider kalemleri', 0, 0, 1),
    R('تقارير الربحية حسب الصنف والتصنيف والفرع', 'Profitability reports by item, category and branch', 'Ürün, kategori ve şubeye göre kârlılık raporları', 0, 0, 1),
    R('رأس المال والقروض والأصول الثابتة والإهلاك وبيع الأصول كإيراد مستقل', 'Capital, loans, fixed assets, depreciation and asset sales as separate income', 'Sermaye, krediler, duran varlıklar, amortisman ve ayrı gelir olarak varlık satışı', 0, 0, 1),
    R('المحاسبة العامة وفق IFRS: دليل الحسابات، اليومية، الأستاذ العام، ميزان المراجعة، إقفال الفترات', 'IFRS general accounting: chart of accounts, journal, general ledger, trial balance, period closing', 'UFRS genel muhasebe: hesap planı, yevmiye, defteri kebir, mizan, dönem kapanışı', 0, 0, 1),
    R('القوائم المالية IFRS: الدخل، المركز المالي، التدفقات النقدية، التغيرات في حقوق الملكية', 'IFRS financial statements: income, financial position, cash flows, changes in equity', 'UFRS finansal tablolar: gelir, finansal durum, nakit akışları, özkaynak değişimleri', 0, 0, 1),
    R('تجميد القيود عند الإقفال والإقفال التلقائي الشهري — لا أثر رجعي لتعديل الأسعار أو نسب المنصات', 'Entry freezing on close and automatic monthly closing — no retroactive effect from price or platform rate changes', 'Kapanışta kayıt dondurma ve otomatik aylık kapanış — fiyat veya platform oranı değişikliklerinin geriye dönük etkisi yok', 0, 0, 1),
    R('منتقي حسابات بالبحث، يومية تفصيلية بأرقام القيود، دليل حسابات شجري بطبيعة الحساب وأرصدته', 'Searchable account picker, detailed journal with entry numbers, tree chart of accounts with nature and balances', 'Aranabilir hesap seçici, kayıt numaralı ayrıntılı yevmiye, nitelik ve bakiyeli ağaç hesap planı', 0, 0, 1),
    R('الفجوة النقدية (CCC) والسيولة الشاملة مع أثر الرواتب والعمالة والأصول وتوقع 30/60/90 يوماً', 'Cash conversion cycle (CCC) and full liquidity including payroll, labor and assets, with a 30/60/90-day forecast', 'Maaş, işgücü ve varlık etkisiyle nakit dönüşüm süresi (CCC), kapsamlı likidite ve 30/60/90 günlük tahmin', 0, 0, 1),
    R('الذمم والتسويات: الإغلاق الآجل على منصات التوصيل، مطابقة كشوفها، أعمار ذمم الموردين والعملاء والسداد', 'Receivables & settlements: credit closing on delivery platforms, statement reconciliation, supplier/customer aging and payments', 'Alacaklar ve mutabakatlar: teslimat platformlarında vadeli kapanış, ekstre mutabakatı, tedarikçi/müşteri yaşlandırma ve ödemeler', 0, 0, 1),
    H('الموارد البشرية (HCM)', 'Human capital management (HCM)', 'İnsan kaynakları (HCM)'),
    R('حسابات الموظفين والأدوار والصلاحيات التفصيلية (غير محدودة)', 'Staff accounts, roles and detailed permissions (unlimited)', 'Personel hesapları, roller ve ayrıntılı yetkiler (sınırsız)', 0, 1, 1),
    R('بطاقة موظف كاملة والتكلفة الفعلية (TCC) ومعدل دوران الموظفين', 'Full employee card, total cost of employment (TCC) and staff turnover rate', 'Tam personel kartı, toplam istihdam maliyeti (TCC) ve personel devir oranı', 0, 1, 1),
    R('السلف والخصومات والمكافآت ومسير الرواتب', 'Advances, deductions, bonuses and payroll', 'Avanslar, kesintiler, primler ve bordro', 0, 1, 1),
    R('التقرير الشامل للموظف (مالي، وظيفي، إنتاجي، تقييم)', 'Comprehensive employee report (financial, job, productivity, evaluation)', 'Kapsamlı personel raporu (finansal, görev, verimlilik, değerlendirme)', 0, 1, 1),
    R('إدارة التشغيل: SOP والتدقيق، الاستلام والتسليم، جدول الورديات وتقييم الموظفين', 'Operations management: SOPs & audits, handover, shift schedules and staff evaluation', 'Operasyon yönetimi: SOP ve denetim, devir teslim, vardiya çizelgesi ve personel değerlendirme', 0, 1, 1),
    H('الإدارة والامتياز', 'Management & franchise', 'Yönetim ve franchise'),
    R('الفروع', 'Branches', 'Şubeler', 0, T('فرع واحد', 'One branch', 'Tek şube'), T('عدة فروع', 'Multiple branches', 'Çoklu şube')),
    R('المساعد الذكي (AI) لصاحب الحساب — مدرّب على كل أقسام المنصة بثلاث لغات', 'AI assistant for the account owner — trained on every area of the platform in 3 languages', 'Hesap sahibi için yapay zekâ asistanı — platformun tüm alanlarında 3 dilde eğitilmiş', 0, 1, 1),
    R('سجل النشاط', 'Activity log', 'Etkinlik kaydı', 0, 0, 1),
    R('الوصفات القياسية وبطاقات الطباعة (B5 / A4) مع اعتماد صاحب الحساب', 'Standard recipes and print cards (B5 / A4) with account-owner approval', 'Hesap sahibi onaylı standart reçeteler ve baskı kartları (B5 / A4)', 0, 0, 1),
    R('أدلة التشغيل والتأهيل للامتياز التجاري (7 أدلة)', 'Franchise operations and training manuals (7 manuals)', 'Franchise operasyon ve eğitim kılavuzları (7 kılavuz)', 0, 0, 1),
    R('إدارة الامتياز التجاري (الفرنشايز) ولوحة المانح', 'Franchise management and franchisor dashboard', 'Franchise yönetimi ve franchise veren paneli', 0, 0, 1)
  ];

  var FAQ = [
    [T('ما الفرق بين الباقات الثلاث؟', 'What is the difference between the three plans?', 'Üç paket arasındaki fark nedir?'),
     T('الأساسية للتكاليف وهندسة المينيو والمينيو الإلكتروني والتقييمات، مع السعرات ومسببات الحساسية وتعديل الأسعار بنسبة والاستيراد من Excel. الإنطلاقة تضيف التشغيل الكامل لفرع واحد: الكاشير، التوصيل، المخزون، العملاء والولاء، الموظفون والرواتب، التقارير المالية والمساعد الذكي وشاشة العميل. المتقدمة تفتح المحاسبة العامة IFRS، تسويات المنصات، المشتريات والإنتاج، شاشات المطبخ حسب الأقسام والطلب الذاتي (كشك) بالدفع الإلكتروني، السائقين، الفروع المتعددة والامتياز التجاري.',
       'Basic covers costing, menu engineering, the digital menu and reviews, plus calories and allergens, price % adjustment and Excel import. Starter adds full single-branch operations: POS, delivery, inventory, customers and loyalty, staff and payroll, financial reports, the AI assistant and the customer display. Advanced unlocks IFRS general accounting, platform settlements, purchasing and production, kitchen screens by station, the self-order kiosk with online payment, drivers, multiple branches and franchising.',
       'Temel paket maliyet, menü mühendisliği, dijital menü ve değerlendirmeleri; ayrıca kalori ve alerjenleri, yüzdeyle fiyat ayarını ve Excel içe aktarmayı kapsar. Başlangıç tek şube için tam operasyonu ekler: POS, teslimat, stok, müşteriler ve sadakat, personel ve bordro, finansal raporlar, yapay zekâ asistanı ve müşteri ekranı. Gelişmiş paket UFRS genel muhasebe, platform mutabakatları, satın alma ve üretim, istasyon bazlı mutfak ekranları, online ödemeli self servis kiosk, kuryeler, çoklu şube ve franchise özelliklerini açar.')],
    [T('هل البرنامج متاح بلغات أخرى غير العربية؟', 'Is the system available in languages other than Arabic?', 'Sistem Arapça dışında başka dillerde mevcut mu?'),
     T('نعم، الواجهة كاملة بالعربية والإنجليزية والتركية، وكل المخرجات (الفواتير، الإيصالات، التقارير، ملفات Excel و Word، الطباعة، الأدلة) تصدر بنفس اللغة التي يختارها المستخدم وباتجاه الصفحة الصحيح.',
       'Yes. The full interface is available in Arabic, English and Turkish, and every output (invoices, receipts, reports, Excel and Word files, printouts, manuals) is produced in the language each user selects, with the correct page direction.',
       'Evet. Arayüzün tamamı Arapça, İngilizce ve Türkçe olarak mevcuttur; tüm çıktılar (faturalar, fişler, raporlar, Excel ve Word dosyaları, baskılar, kılavuzlar) kullanıcının seçtiği dilde ve doğru sayfa yönüyle üretilir.')],
    [T('هل يمكنني الترقية من باقة لأخرى؟', 'Can I upgrade from one plan to another?', 'Bir paketten diğerine yükseltebilir miyim?'),
     T('نعم، في أي وقت عبر صفحة تجديد الاشتراك واختيار الباقة الأعلى، وتُفعَّل الباقة الجديدة فوراً مع الاحتفاظ بكل بياناتك.',
       'Yes, at any time from the renewal page by choosing a higher plan. The new plan is activated instantly and all your data is kept.',
       'Evet, istediğiniz zaman yenileme sayfasından daha üst bir paket seçerek. Yeni paket anında etkinleşir ve tüm verileriniz korunur.')],
    [T('هل المنصة مناسبة للمطاعم الصغيرة والمقاهي؟', 'Is it suitable for small restaurants and cafés?', 'Küçük restoranlar ve kafeler için uygun mu?'),
     T('بالتأكيد مناسبة، ويمكنك اختيار الباقة التي تخدم عملك.',
       'Absolutely, it is suitable — and you can choose the plan that best serves your business.',
       'Kesinlikle uygun; işletmenize en iyi hizmet eden paketi seçebilirsiniz.')],
    [T('هل الاشتراك يتجدد تلقائياً؟', 'Does the subscription renew automatically?', 'Abonelik otomatik yenilenir mi?'),
     T('لا. الاشتراك سنوي ولا يتجدد تلقائياً ولا يُخصم أي مبلغ دون موافقتك، وتصلك تذكيرات قبل انتهائه.',
       'No. The subscription is annual, never renews automatically and nothing is charged without your approval. You receive reminders before it expires.',
       'Hayır. Abonelik yıllıktır, otomatik yenilenmez ve onayınız olmadan ücret alınmaz. Süresi dolmadan önce hatırlatmalar alırsınız.')],
    [T('هل بياناتي آمنة؟ وماذا عن النسخ الاحتياطي؟', 'Is my data secure? What about backups?', 'Verilerim güvende mi? Yedekleme nasıl?'),
     T('كلمات المرور مشفرة بـ PBKDF2-SHA256 مع حماية من محاولات الدخول المتكررة وصلاحيات تفصيلية لكل موظف. ويمكنك أخذ نسخة احتياطية يدوياً أو تلقائياً (أسبوعياً/يومياً/عند الإغلاق) واستعادتها في أي وقت.',
       'Passwords are hashed with PBKDF2-SHA256, logins are rate-limited and each employee has detailed permissions. You can back up manually or automatically (weekly / daily / on exit) and restore at any time.',
       'Parolalar PBKDF2-SHA256 ile şifrelenir, giriş denemeleri sınırlandırılır ve her çalışanın ayrıntılı yetkileri vardır. Manuel veya otomatik (haftalık / günlük / çıkışta) yedek alabilir ve istediğiniz zaman geri yükleyebilirsiniz.')],
    [T('هل يدعم منصات التوصيل مثل Trendyol و Yemeksepeti و Getir وطلبات؟', 'Does it support delivery platforms such as Trendyol, Yemeksepeti, Getir and Talabat?', 'Trendyol, Yemeksepeti, Getir ve Talabat gibi teslimat platformlarını destekliyor mu?'),
     T('نعم، تضيف أي منصة بعقدها ونسب عمولتها وضرائبها، ويحسب البرنامج صافي كل طلب وربحية كل قناة. وفي المتقدمة: الإغلاق الآجل على المنصة، مطابقة كشفها، وحساب فرعي لكل منصة في دليل الحسابات.',
       'Yes. Add any platform with its contract, commission rates and taxes, and the system calculates the net of each order and the profitability of each channel. In Advanced: credit closing on the platform, statement reconciliation and a dedicated sub-account per platform in the chart of accounts.',
       'Evet. Herhangi bir platformu sözleşmesi, komisyon oranları ve vergileriyle ekleyin; sistem her siparişin netini ve her kanalın kârlılığını hesaplar. Gelişmiş pakette: platformda vadeli kapanış, ekstre mutabakatı ve hesap planında her platform için ayrı alt hesap.')],
    [T('هل المحاسبة متوافقة مع المعايير الدولية؟', 'Is the accounting compliant with international standards?', 'Muhasebe uluslararası standartlara uygun mu?'),
     T('نعم، الباقة المتقدمة تبني محاسبة عامة وفق IFRS تلقائياً من العمليات: دليل حسابات، يومية، أستاذ عام، ميزان مراجعة، القوائم المالية الأربع، وإقفال الفترات مع تجميد القيود.',
       'Yes. The Advanced plan builds IFRS-based general accounting automatically from your operations: chart of accounts, journal, general ledger, trial balance, the four financial statements and period closing with entry freezing.',
       'Evet. Gelişmiş paket, operasyonlarınızdan otomatik olarak UFRS tabanlı genel muhasebe oluşturur: hesap planı, yevmiye, defteri kebir, mizan, dört finansal tablo ve kayıt dondurmalı dönem kapanışı.')],
    [T('هل يناسب سلاسل الامتياز التجاري (الفرنشايز)؟', 'Is it suitable for franchise chains?', 'Franchise zincirleri için uygun mu?'),
     T('نعم، المتقدمة تتضمن إدارة الفرنشايز ولوحة المانح، الوصفات القياسية وبطاقات الطباعة، و7 أدلة تشغيل وتأهيل جاهزة بثلاث لغات قابلة للتعديل والطباعة.',
       'Yes. Advanced includes franchise management and a franchisor dashboard, standard recipes and print cards, and 7 ready operations and training manuals in 3 languages that you can edit and print.',
       'Evet. Gelişmiş paket franchise yönetimi ve franchise veren panelini, standart reçeteleri ve baskı kartlarını, ayrıca düzenlenip yazdırılabilen 3 dilde 7 hazır operasyon ve eğitim kılavuzunu içerir.')],
    [T('هل أحتاج تثبيت برنامج أو أجهزة خاصة؟', 'Do I need to install software or special hardware?', 'Yazılım veya özel donanım kurmam gerekir mi?'),
     T('لا. يعمل من المتصفح على أي جهاز ويمكن تثبيته كتطبيق PWA، ويدعم الطابعات الحرارية وكاميرا الجهاز لقراءة QR.',
       'No. It runs in the browser on any device and can be installed as a PWA. Thermal printers and the device camera (for QR scanning) are supported.',
       'Hayır. Her cihazda tarayıcıdan çalışır ve PWA olarak kurulabilir. Termal yazıcılar ve QR okuma için cihaz kamerası desteklenir.')],
    [T('هل يمكن نقل بياناتي من برنامج آخر؟', 'Can I move my data from another system?', 'Verilerimi başka bir sistemden taşıyabilir miyim?'),
     T('نعم، في كل الباقات: نزّل قالب Excel الجاهز من «الإدارة والإعدادات ← استيراد البيانات من Excel»، الصق فيه المواد والأطباق والمنتجات من برنامجك السابق، وراجع المعاينة ثم استورد.',
       'Yes, on every plan: download the ready Excel template from “Management & settings → Import data from Excel”, paste your ingredients, dishes and products from your previous system, review the preview and import.',
       'Evet, tüm paketlerde: «Yönetim ve ayarlar → Excel\'den veri içe aktar» bölümünden hazır şablonu indirin, önceki sisteminizden malzeme, yemek ve ürünleri yapıştırın, önizlemeyi kontrol edip aktarın.')],
    [T('كيف يعمل الطلب الذاتي (الكشك) والدفع فيه؟', 'How does the self-order kiosk and its payment work?', 'Self servis kiosk ve ödemesi nasıl çalışır?'),
     T('في الباقة المتقدمة: افتح رابط الكشك على تابلت أو شاشة لمس، يختار العميل أصنافه ويدفع إلكترونياً عبر بوابة الدفع (QR من جواله) أو بالبطاقة على جهاز الدفع المربوط أو عند الكاشير، ويصل الطلب للمطبخ تلقائياً.',
       'On the Advanced plan: open the kiosk link on a tablet or touch screen. Guests choose their items and pay online through the payment gateway (QR on their phone), by card on the connected terminal or at the counter, and the order goes to the kitchen automatically.',
       'Gelişmiş pakette: kiosk bağlantısını tablet veya dokunmatik ekranda açın. Misafir ürünlerini seçer; ödeme altyapısı üzerinden online (telefonla QR), bağlı terminalde kartla veya kasada öder ve sipariş otomatik olarak mutfağa gider.')],
    [T('هل يعرض المينيو السعرات ومسببات الحساسية؟', 'Does the menu show calories and allergens?', 'Menü kalori ve alerjenleri gösterir mi?'),
     T('نعم، في كل الباقات تُحسب السعرات والبروتين والكربوهيدرات والدهون تلقائياً من مكونات كل طبق، وتحدد مسببات الحساسية الـ 14، وتظهر في المينيو الإلكتروني والكشك وشاشة العميل.',
       'Yes. On every plan calories, protein, carbs and fat are calculated automatically from each dish\'s ingredients, you set the 14 allergens, and they appear on the digital menu, the kiosk and the customer display.',
       'Evet. Tüm paketlerde kalori, protein, karbonhidrat ve yağ her yemeğin malzemelerinden otomatik hesaplanır, 14 alerjeni belirlersiniz ve bunlar dijital menüde, kioskta ve müşteri ekranında görünür.')],
    [T('كيف أبدأ بعد الدفع؟', 'How do I get started after payment?', 'Ödemeden sonra nasıl başlarım?'),
     T('بعد تأكيد الدفع يتم تفعيل حسابك فوراً، وتدخل من صفحة دخول المشتركين وتبدأ بإضافة المواد والأطباق أو استيرادها.',
       'Once payment is confirmed your account is activated instantly. Sign in from the subscriber login page and start adding or importing your ingredients and dishes.',
       'Ödeme onaylandığında hesabınız anında etkinleşir. Abone giriş sayfasından oturum açın ve malzeme ve yemeklerinizi eklemeye veya içe aktarmaya başlayın.')],
    [T('كيف تُحسب السعرات الحرارية؟', 'How are calories calculated?', 'Kaloriler nasıl hesaplanır?'),
     T('بالطريقة الدولية المعتمدة: معاملات Atwater (بروتين 4، كربوهيدرات 4، دهون 9 سعرات لكل غرام) مع قيم USDA الغذائية لكل 100 غرام من كل مكوّن. وتتوفر حاسبة سعرات للمستخدم في أي وقت تشمل الاحتياج اليومي بمعادلة Mifflin-St Jeor ومؤشر كتلة الجسم.', 'Using the internationally accepted method: Atwater factors (protein 4, carbohydrate 4, fat 9 kcal per gram) with USDA nutrient values per 100 g of each ingredient. A calorie calculator is also available at any time, including daily needs with the Mifflin-St Jeor equation and BMI.', 'Uluslararası kabul gören yöntemle: her malzemenin 100 gramı için USDA besin değerleriyle Atwater katsayıları (protein 4, karbonhidrat 4, yağ 9 kcal/g). Ayrıca Mifflin-St Jeor denklemiyle günlük ihtiyaç ve VKİ içeren bir kalori hesaplayıcı her zaman kullanılabilir.')],
    [T('هل يترجم البرنامج أسماء أصنافي تلقائياً؟', 'Does the system translate my item names automatically?', 'Sistem ürün adlarımı otomatik çevirir mi?'),
     T('لا. تكتب اسم الصنف والقسم بلغة واحدة على الأقل، ويمكنك إضافة الإنجليزية والتركية، ويُعرض لكل عميل الاسم بلغته إن وُجد وإلا الاسم الأصلي كما كتبته.', 'No. You enter each item and category name in at least one language and can add English and Turkish; each customer sees the name in their language if provided, otherwise the original name exactly as you wrote it.', 'Hayır. Her ürün ve kategori adını en az bir dilde girersiniz, İngilizce ve Türkçe ekleyebilirsiniz; her müşteri varsa kendi dilindeki adı, yoksa yazdığınız orijinal adı görür.')],
  ];

  /* ---------- المحرّك ---------- */
  var LANGS = ['ar', 'en', 'tr'];
  var cur = 'ar';
  var g = function (o) { return o ? (o[cur] || o.ar) : ''; };
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  var li = function (arr, icon) { return arr.map(function (x) { return '<li><i class="fas ' + (icon || 'fa-check-circle') + '"></i> <span>' + esc(g(x)) + '</span></li>'; }).join(''); };
  function withLang(href) {
    if (!href) return href;
    var parts = href.split('#'), base = parts[0];
    base += (base.indexOf('?') >= 0 ? '&' : '?') + 'lang=' + cur;
    return base + (parts[1] ? '#' + parts[1] : '');
  }
  function cell(v) {
    if (v === 1) return '<i class="fas fa-check cmp-yes" aria-label="✓"></i>';
    if (v === 0) return '<i class="fas fa-minus cmp-no" aria-label="—"></i>';
    return '<span class="cmp-val">' + esc(g(v)) + '</span>';
  }

  function render() {
    document.querySelectorAll('[data-t]').forEach(function (el) { var k = el.getAttribute('data-t'); if (S[k]) el.innerHTML = g(S[k]); });
    document.querySelectorAll('img[data-img]').forEach(function (el) { var u = 'assets/shots/' + el.getAttribute('data-img') + '-' + cur + '.jpg'; el.src = u; var box = el.closest('.screenshot-item'); if (box) box.onclick = function () { openLightbox(u); }; });
    document.querySelectorAll('[data-alt]').forEach(function (el) { var k = el.getAttribute('data-alt'); if (S[k]) el.alt = g(S[k]); });
    document.querySelectorAll('[data-href]').forEach(function (el) { el.href = withLang(el.getAttribute('data-href')); });

    $('heroHl').innerHTML = HERO_HL.map(function (x) { return '<span><i class="fas fa-check-circle"></i> ' + esc(g(x)) + '</span>'; }).join('');
    $('statsGrid').innerHTML = STATS.map(function (s) { return '<div class="stat"><i class="fas ' + s[0] + '"></i><b>' + s[1] + '</b><span>' + esc(g(s[2])) + '</span></div>'; }).join('');
    $('probGrid').innerHTML = PROBLEMS.map(function (p) { return '<div class="problem-card"><i class="fas ' + p[0] + '"></i><h4>' + esc(g(p[1])) + '</h4><p>' + esc(g(p[2])) + '</p></div>'; }).join('');
    $('modGrid').innerHTML = MODULES.map(function (m) {
      return '<div class="mod-card"><div class="mod-head"><div class="feature-icon"><i class="fas ' + m.ic + '"></i></div><div><h4>' + esc(g(m.t)) + '</h4><span class="mod-plan ' + m.plan + '">' + esc(g(PLAN_LBL[m.plan])) + '</span></div></div><ul>' + li(m.li, 'fa-check') + '</ul></div>';
    }).join('');
    $('appsGrid').innerHTML = APPS.map(function (a) { return '<div class="app-card"><i class="fas ' + a[0] + '"></i><h4>' + esc(g(a[1])) + '</h4><p>' + esc(g(a[2])) + '</p></div>'; }).join('');
    $('accList').innerHTML = li(ACC_LIST);
    $('qrList').innerHTML = li(QR_LIST);
    $('caList').innerHTML = li(CA_LIST);
    $('kdsList').innerHTML = li(KDS_LIST);
    if ($('ksList')) $('ksList').innerHTML = li(KS_LIST);
    $('newGrid').innerHTML = NEWS.map(function (n) { return '<div class="new-card">' + '<i class="fas ' + n[0] + '"></i><h4>' + esc(g(n[1])) + '</h4><p>' + esc(g(n[2])) + '</p></div>'; }).join('');

    $('plansGrid').innerHTML = PLANS.map(function (p) {
      return '<div class="plan-card' + (p.popular ? ' popular' : '') + '">' +
        (p.popular ? '<span class="popular-badge"><i class="fas fa-star"></i> ' + esc(g(S.popular)) + '</span>' : '') +
        '<h4>' + esc(g(p.name)) + '</h4><p class="plan-tag">' + esc(g(p.tag)) + '</p>' +
        '<div class="plan-price">' + p.price + '$ <small>' + esc(g(S.per_year)) + '</small></div>' +
        '<div class="plan-branch">' + esc(g(p.br)) + '</div><ul class="plan-features">' +
        (p.inh ? '<li class="inherit"><i class="fas fa-plus"></i> ' + esc(g(S[p.inh])) + '</li>' : '') + li(p.li, 'fa-check') + '</ul>' +
        '<a href="' + withLang('f-14-G-17.html?plan=' + p.key) + '" class="btn-plan' + (p.popular ? ' primary' : '') + '" target="_blank"><i class="fas fa-arrow-' + (cur === 'ar' ? 'left' : 'right') + '"></i> ' + esc(g(S.subscribe_plan)) + ' ' + esc(g(p.name)) + '</a></div>';
    }).join('');

    var head = '<thead><tr><th class="cmp-f">' + esc(g(S.cmp_feature)) + '</th>' + PLANS.map(function (p) {
      return '<th class="' + (p.popular ? 'cmp-pop' : '') + '">' + esc(g(p.name)) + '<small>' + p.price + '$ ' + esc(g(S.per_year)) + '</small></th>';
    }).join('') + '</tr></thead>';
    var body = ROWS.map(function (r) {
      if (r[0] === '#') return '<tr class="cmp-sec"><td colspan="4">' + esc(g(r[1])) + '</td></tr>';
      return '<tr><td class="cmp-f">' + esc(g(r[0])) + '</td><td>' + cell(r[1]) + '</td><td class="cmp-pop">' + cell(r[2]) + '</td><td>' + cell(r[3]) + '</td></tr>';
    }).join('');
    $('cmpTable').innerHTML = head + '<tbody>' + body + '</tbody>';

    $('faqGrid').innerHTML = FAQ.map(function (f, i) {
      return '<div class="faq-item' + (i === 0 ? ' active' : '') + '"><div class="faq-question" role="button" tabindex="0"><span>' + esc(g(f[0])) + '</span> <i class="fas fa-chevron-down"></i></div><div class="faq-answer">' + esc(g(f[1])) + '</div></div>';
    }).join('');
    document.querySelectorAll('.faq-question').forEach(function (q) {
      var tog = function () { q.parentElement.classList.toggle('active'); };
      q.addEventListener('click', tog);
      q.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tog(); } });
    });
  }

  function setLang(l) {
    if (LANGS.indexOf(l) < 0) l = 'ar';
    cur = l;
    var html = document.documentElement;
    html.lang = l; html.dir = l === 'ar' ? 'rtl' : 'ltr';
    document.title = g(S.doc_title);
    var md = document.querySelector('meta[name="description"]'); if (md) md.setAttribute('content', g(S.doc_desc));
    try { localStorage.setItem('fcLang', l); } catch (e) {}
    document.querySelectorAll('[data-setlang]').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-setlang') === l); b.setAttribute('aria-pressed', b.getAttribute('data-setlang') === l); });
    try { var u = new URL(location.href); if (u.searchParams.get('lang') !== l) { u.searchParams.set('lang', l); history.replaceState(null, '', u.toString()); } } catch (e) {}
    render();
  }

  function initial() {
    var q = null; try { q = new URL(location.href).searchParams.get('lang'); } catch (e) {}
    if (LANGS.indexOf(q) >= 0) return q;
    var s = null; try { s = localStorage.getItem('fcLang'); } catch (e) {}
    if (LANGS.indexOf(s) >= 0) return s;
    var n = (navigator.language || 'ar').slice(0, 2).toLowerCase();
    return n === 'tr' ? 'tr' : n === 'en' ? 'en' : (n === 'ar' ? 'ar' : 'en');
  }

  window.MP_LANDING = { ROWS: ROWS, PLANS: PLANS, setLang: setLang };
  document.addEventListener('click', function (e) { var b = e.target.closest('[data-setlang]'); if (b) setLang(b.getAttribute('data-setlang')); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setLang(initial()); });
  else setLang(initial());
})();
