/* Mataami Pro — استبيان تقييم المنصة (v5.3.6)
 * تعريف الأسئلة والخيارات بثلاث لغات. يُستخدم في survey.html و admin-survey.html
 * القيم المخزّنة في قاعدة البيانات هي الرموز (code) وليس النصوص، حتى تبقى النتائج موحّدة بين اللغات. */
(function (w) {
  'use strict';
  function T(ar, en, tr) { return { ar: ar, en: en, tr: tr }; }
  function O(code, ar, en, tr) { return { v: code, t: T(ar, en, tr) }; }

  var MODULES = [
    O('costing', 'التكاليف والوصفات', 'Costing & recipes', 'Maliyet ve reçeteler'),
    O('menu_eng', 'هندسة المنيو BCG', 'BCG menu engineering', 'BCG menü mühendisliği'),
    O('qr_menu', 'المنيو الإلكتروني و QR', 'Digital menu & QR', 'Dijital menü ve QR'),
    O('pos', 'الكاشير ونقاط البيع', 'POS & cashier', 'POS ve kasa'),
    O('kds', 'شاشة المطبخ KDS', 'Kitchen display (KDS)', 'Mutfak ekranı (KDS)'),
    O('delivery', 'التوصيل وتطبيق السائق', 'Delivery & driver app', 'Teslimat ve kurye uygulaması'),
    O('inventory', 'المخزون والمشتريات', 'Inventory & purchasing', 'Stok ve satın alma'),
    O('production', 'أوامر الإنتاج', 'Production orders', 'Üretim emirleri'),
    O('crm', 'العملاء والولاء وتطبيق العميل', 'CRM, loyalty & customer app', 'CRM, sadakat ve müşteri uygulaması'),
    O('reviews', 'تقييمات الزبائن', 'Customer reviews', 'Müşteri değerlendirmeleri'),
    O('accounting', 'المالية والمحاسبة IFRS', 'Finance & IFRS accounting', 'Finans ve UFRS muhasebe'),
    O('hr', 'الموارد البشرية والرواتب', 'HR & payroll', 'İK ve bordro'),
    O('reports', 'التقارير و Excel و Word', 'Reports, Excel & Word', 'Raporlar, Excel ve Word'),
    O('ai', 'المساعد الذكي AI', 'AI assistant', 'Yapay zekâ asistanı'),
    O('franchise', 'الفروع والامتياز التجاري', 'Branches & franchise', 'Şubeler ve franchise')
  ];

  var QUALITY = [
    O('ease', 'سهولة الاستخدام اليومي', 'Day-to-day ease of use', 'Günlük kullanım kolaylığı'),
    O('design', 'وضوح التصميم والشاشات', 'Clarity of design and screens', 'Tasarım ve ekran netliği'),
    O('speed', 'سرعة التحميل والاستجابة', 'Loading and response speed', 'Yükleme ve yanıt hızı'),
    O('stability', 'الاستقرار وقلة الأخطاء', 'Stability and few errors', 'Kararlılık ve az hata'),
    O('mobile', 'التجربة على الجوال والتابلت', 'Phone and tablet experience', 'Telefon ve tablet deneyimi'),
    O('accuracy', 'دقة الحسابات والتقارير', 'Accuracy of calculations and reports', 'Hesap ve rapor doğruluğu'),
    O('language', 'جودة اللغة والترجمة', 'Language and translation quality', 'Dil ve çeviri kalitesi'),
    O('support', 'سرعة وجودة الدعم الفني', 'Speed and quality of support', 'Destek hızı ve kalitesi'),
    O('value', 'القيمة مقابل السعر', 'Value for money', 'Fiyat/performans')
  ];

  var S = {
    role: [
      O('owner', 'مالك المطعم', 'Restaurant owner', 'Restoran sahibi'),
      O('manager', 'مدير أو مشرف', 'Manager or supervisor', 'Müdür veya şef'),
      O('accountant', 'محاسب أو مسؤول مالي', 'Accountant or finance', 'Muhasebeci veya finans'),
      O('chef', 'شيف أو مسؤول مطبخ', 'Chef or kitchen lead', 'Şef veya mutfak sorumlusu'),
      O('cashier', 'كاشير أو موظف صالة', 'Cashier or floor staff', 'Kasiyer veya salon personeli'),
      O('consultant', 'مستشار أو مدرّب', 'Consultant or trainer', 'Danışman veya eğitmen')
    ],
    rtype: [
      O('restaurant', 'مطعم', 'Restaurant', 'Restoran'),
      O('cafe', 'مقهى', 'Café', 'Kafe'),
      O('fastfood', 'وجبات سريعة', 'Fast food', 'Fast food'),
      O('bakery', 'مخبز أو حلويات', 'Bakery or sweets', 'Fırın veya tatlıcı'),
      O('cloud', 'مطبخ سحابي / توصيل فقط', 'Cloud kitchen / delivery only', 'Bulut mutfak / sadece paket'),
      O('catering', 'تموين وضيافة', 'Catering', 'Catering'),
      O('franchise', 'سلسلة أو امتياز تجاري', 'Chain or franchise', 'Zincir veya franchise')
    ],
    branches: [O('1', 'فرع واحد', '1 branch', '1 şube'), O('2-3', '2 - 3 فروع', '2 - 3 branches', '2 - 3 şube'), O('4-10', '4 - 10 فروع', '4 - 10 branches', '4 - 10 şube'), O('10+', 'أكثر من 10', 'More than 10', '10\'dan fazla')],
    plan: [
      O('basic', 'الأساسية', 'Basic', 'Temel'),
      O('pro', 'الإنطلاقة', 'Starter', 'Başlangıç'),
      O('premium', 'المتقدمة', 'Advanced', 'Gelişmiş'),
      O('unknown', 'لا أعرف', 'Not sure', 'Bilmiyorum')
    ],
    tenure: [
      O('lt1m', 'أقل من شهر', 'Less than a month', '1 aydan az'),
      O('1-3m', '1 - 3 أشهر', '1 - 3 months', '1 - 3 ay'),
      O('3-6m', '3 - 6 أشهر', '3 - 6 months', '3 - 6 ay'),
      O('6-12m', '6 - 12 شهراً', '6 - 12 months', '6 - 12 ay'),
      O('gt1y', 'أكثر من سنة', 'More than a year', '1 yıldan fazla')
    ],
    devices: [
      O('desktop', 'كمبيوتر', 'Computer', 'Bilgisayar'),
      O('tablet', 'تابلت', 'Tablet', 'Tablet'),
      O('phone', 'جوال', 'Phone', 'Telefon'),
      O('pos_device', 'جهاز كاشير', 'POS terminal', 'POS cihazı')
    ],
    before: [
      O('paper', 'ورق ودفاتر', 'Paper and notebooks', 'Kâğıt ve defter'),
      O('excel', 'جداول Excel', 'Excel spreadsheets', 'Excel tabloları'),
      O('other_pos', 'نظام كاشير آخر', 'Another POS system', 'Başka bir POS sistemi'),
      O('other_erp', 'برنامج محاسبة أو ERP آخر', 'Another accounting/ERP tool', 'Başka bir muhasebe/ERP aracı'),
      O('nothing', 'لم أكن أستخدم شيئاً', 'Nothing', 'Hiçbir şey')
    ],
    foodcost: [
      O('none', 'لا تغيير', 'No change', 'Değişiklik yok'),
      O('lt2', 'انخفضت أقل من 2%', 'Down less than 2%', '%2\'den az düştü'),
      O('2-5', 'انخفضت 2% - 5%', 'Down 2% - 5%', '%2 - %5 düştü'),
      O('gt5', 'انخفضت أكثر من 5%', 'Down more than 5%', '%5\'ten fazla düştü'),
      O('dk', 'لا أعرف بعد', 'Don\'t know yet', 'Henüz bilmiyorum')
    ],
    time: [
      O('0', 'لم يوفّر وقتاً', 'No time saved', 'Zaman kazandırmadı'),
      O('1-3', '1 - 3 ساعات', '1 - 3 hours', '1 - 3 saat'),
      O('3-6', '3 - 6 ساعات', '3 - 6 hours', '3 - 6 saat'),
      O('6+', 'أكثر من 6 ساعات', 'More than 6 hours', '6 saatten fazla')
    ],
    gains: [
      O('pricing', 'تسعير الأطباق', 'Dish pricing', 'Yemek fiyatlandırma'),
      O('waste', 'تقليل الهدر', 'Reducing waste', 'Fireyi azaltma'),
      O('menu', 'تحسين المنيو', 'Improving the menu', 'Menüyü iyileştirme'),
      O('stock', 'ضبط المخزون والمشتريات', 'Stock and purchasing control', 'Stok ve satın alma kontrolü'),
      O('cash', 'متابعة النقد والصندوق', 'Cash and register control', 'Nakit ve kasa takibi'),
      O('staff', 'إدارة الموظفين', 'Managing staff', 'Personel yönetimi'),
      O('delivery', 'ربحية التوصيل والمنصات', 'Delivery and platform profitability', 'Teslimat ve platform kârlılığı'),
      O('finance', 'فهم الأرباح والقوائم المالية', 'Understanding profit and statements', 'Kâr ve tabloları anlama')
    ],
    priorities: [
      O('tutorials', 'دروس فيديو وشروحات', 'Video tutorials and guides', 'Video eğitimler ve rehberler'),
      O('offline', 'العمل بدون إنترنت', 'Working offline', 'Çevrimdışı çalışma'),
      O('integrations', 'ربط مع منصات التوصيل', 'Delivery platform integrations', 'Teslimat platformu entegrasyonları'),
      O('payments', 'الدفع الإلكتروني داخل النظام', 'Built-in online payments', 'Dahili online ödeme'),
      O('einvoice', 'الفوترة الإلكترونية الرسمية', 'Official e-invoicing', 'Resmî e-fatura'),
      O('whatsapp', 'إشعارات واتساب تلقائية', 'Automatic WhatsApp notifications', 'Otomatik WhatsApp bildirimleri'),
      O('analytics', 'تحليلات وتوقعات أعمق', 'Deeper analytics and forecasts', 'Daha derin analiz ve tahmin'),
      O('ai', 'مساعد ذكي أقوى', 'A smarter AI assistant', 'Daha akıllı yapay zekâ asistanı'),
      O('hardware', 'دعم طابعات وأجهزة أكثر', 'More printers and devices', 'Daha fazla yazıcı ve cihaz desteği'),
      O('native', 'تطبيق جوال من المتجر', 'App store mobile app', 'Mağaza mobil uygulaması'),
      O('speed', 'سرعة أعلى', 'Faster performance', 'Daha yüksek hız'),
      O('price', 'سعر أو باقات أنسب', 'Better pricing or plans', 'Daha uygun fiyat veya paket')
    ],
    renew: [
      O('definitely', 'بالتأكيد سأجدد', 'Definitely', 'Kesinlikle'),
      O('probably', 'غالباً نعم', 'Probably', 'Muhtemelen'),
      O('unsure', 'لم أقرر بعد', 'Not decided', 'Karar vermedim'),
      O('probably_not', 'غالباً لا', 'Probably not', 'Muhtemelen hayır'),
      O('no', 'لن أجدد', 'No', 'Hayır')
    ]
  };

  w.MP_SURVEY = { T: T, MODULES: MODULES, QUALITY: QUALITY, OPTS: S };
})(window);
