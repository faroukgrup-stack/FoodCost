// ============================================================
// Mataami Pro v5.4.0 — حاسبة السعرات الحرارية ومسببات الحساسية
// قاعدة مرجعية للقيم الغذائية لكل 100 غرام (متوسطات قواعد بيانات عالمية مثل USDA FoodData Central
// وجداول تركيب الأغذية الأوروبية) + تحويل الوحدات + معاملات Atwater (بروتين 4، كربوهيدرات 4، دهون 9 سعرة/غ)
// الحساب تلقائي من مكونات الوصفة، ويمكن تعديل قيم أي مادة أو أي طبق يدوياً.
// ============================================================
(function () {
  'use strict';
  // مسببات الحساسية الـ 14 المعتمدة دولياً (Codex / EU 1169/2011) — مطلوبة أيضاً في السعودية (SFDA)
  const ALLERGENS = [
    ['gluten', 'الغلوتين (القمح والشعير)', 'wheat-awn'], ['crustaceans', 'القشريات (روبيان، سلطعون)', 'shrimp'], ['eggs', 'البيض', 'egg'],
    ['fish', 'السمك', 'fish'], ['peanuts', 'الفول السوداني', 'circle-dot'], ['soy', 'الصويا', 'seedling'], ['milk', 'الحليب ومشتقاته', 'cow'],
    ['nuts', 'المكسرات', 'tree'], ['celery', 'الكرفس', 'leaf'], ['mustard', 'الخردل', 'jar'], ['sesame', 'السمسم', 'braille'],
    ['sulphites', 'الكبريتيت', 'flask'], ['lupin', 'الترمس', 'spa'], ['molluscs', 'الرخويات (حبار، محار)', 'shell']
  ];
  const AL_SHORT = { gluten: 'غلوتين', crustaceans: 'قشريات', eggs: 'بيض', fish: 'سمك', peanuts: 'فول سوداني', soy: 'صويا', milk: 'حليب', nuts: 'مكسرات', celery: 'كرفس', mustard: 'خردل', sesame: 'سمسم', sulphites: 'كبريتيت', lupin: 'ترمس', molluscs: 'رخويات' };

  // [المفتاح, kcal, بروتين, كربوهيدرات, دهون, مسببات الحساسية, وزن الحبة بالغرام, الكثافة غ/مل, المرادفات (عربي|إنجليزي|تركي)]
  const DB = [
    ['chicken_breast', 120, 22.5, 0, 2.6, '', 0, 0, 'صدر دجاج|صدور دجاج|فيليه دجاج|شيش طاووق|chicken breast|chicken fillet|tavuk göğsü|tavuk fileto'],
    ['chicken_thigh', 177, 18, 0, 11, '', 0, 0, 'فخذ دجاج|أفخاذ دجاج|ورك دجاج|chicken thigh|tavuk but|tavuk pirzola'],
    ['chicken_whole', 215, 18.6, 0, 15, '', 1200, 0, 'دجاج كامل|فروج|دجاجة|دجاج|chicken|whole chicken|bütün tavuk|tavuk'],
    ['chicken_wings', 203, 18, 0, 14, '', 0, 0, 'أجنحة دجاج|جوانح|chicken wings|tavuk kanat'],
    ['turkey', 135, 24, 0, 4, '', 0, 0, 'ديك رومي|حبش|turkey|hindi'],
    ['beef', 250, 26, 0, 15, '', 0, 0, 'لحم بقر|لحم عجل|عجل|بقري|ستيك|beef|veal|steak|dana eti|sığır eti|biftek'],
    ['beef_minced', 254, 17, 0, 20, '', 0, 0, 'لحم مفروم|مفروم|كفتة|minced meat|ground beef|kıyma'],
    ['lamb', 282, 25, 0, 20, '', 0, 0, 'لحم غنم|لحم ضأن|خروف|لحم خاروف|غنم|lamb|mutton|kuzu eti|koyun eti'],
    ['lamb_chops', 294, 25, 0, 21, '', 0, 0, 'ريش|ريش غنم|lamb chops|kuzu pirzola'],
    ['meat', 250, 26, 0, 15, '', 0, 0, 'لحم|لحمة|meat|et'],
    ['liver', 135, 20, 4, 3.6, '', 0, 0, 'كبدة|كبد|liver|ciğer'],
    ['sausage', 301, 12, 2, 27, 'mustard,sulphites', 0, 0, 'سجق|نقانق|sausage|sucuk|sosis'],
    ['pastrami', 250, 22, 3, 16, 'sulphites', 0, 0, 'بسطرمة|مرتديلا|سلامي|salami|pastrami|mortadella|pastırma|salam'],
    ['shawarma_meat', 230, 20, 2, 16, '', 0, 0, 'شاورما لحم|لحم شاورما|doner meat|et döner'],
    ['shawarma_chicken', 190, 20, 2, 11, '', 0, 0, 'شاورما دجاج|دجاج شاورما|chicken shawarma|tavuk döner'],
    ['fish_white', 90, 19, 0, 1.2, 'fish', 0, 0, 'سمك|فيليه سمك|هامور|بلطي|دنيس|levrek|çipura|fish|white fish|hammour|tilapia|sea bream|balık'],
    ['salmon', 208, 20, 0, 13, 'fish', 0, 0, 'سلمون|salmon|somon'],
    ['tuna', 130, 28, 0, 1, 'fish', 0, 0, 'تونة|تونا|tuna|ton balığı'],
    ['sardine', 208, 25, 0, 11, 'fish', 0, 0, 'سردين|sardine|sardalya'],
    ['anchovy', 131, 20, 0, 4.8, 'fish', 0, 0, 'أنشوفة|anchovy|hamsi'],
    ['shrimp', 99, 24, 0.2, 0.3, 'crustaceans', 0, 0, 'روبيان|جمبري|قريدس|shrimp|prawn|karides'],
    ['crab', 97, 19, 0, 1.5, 'crustaceans', 0, 0, 'سلطعون|كابوريا|crab|yengeç'],
    ['lobster', 89, 19, 0, 0.9, 'crustaceans', 0, 0, 'لوبستر|استاكوزا|جراد البحر|lobster|ıstakoz'],
    ['squid', 92, 15.6, 3, 1.4, 'molluscs', 0, 0, 'كاليماري|حبار|سبيدج|squid|calamari|kalamar'],
    ['mussels', 86, 12, 3.7, 2.2, 'molluscs', 0, 0, 'محار|بلح البحر|mussels|oyster|clams|midye|istiridye'],
    ['egg', 143, 12.6, 0.7, 9.5, 'eggs', 55, 0, 'بيض|بيضة|egg|eggs|yumurta'],
    ['egg_yolk', 322, 16, 3.6, 27, 'eggs', 17, 0, 'صفار بيض|صفار|egg yolk|yumurta sarısı'],
    ['egg_white', 52, 11, 0.7, 0.2, 'eggs', 33, 0, 'بياض بيض|egg white|yumurta akı'],
    ['milk', 61, 3.2, 4.8, 3.3, 'milk', 0, 1.03, 'حليب|حليب كامل|milk|whole milk|süt'],
    ['milk_low', 42, 3.4, 5, 1, 'milk', 0, 1.03, 'حليب قليل الدسم|حليب خالي الدسم|skim milk|low fat milk|yağsız süt'],
    ['yogurt', 61, 3.5, 4.7, 3.3, 'milk', 0, 1.03, 'لبن|زبادي|روب|yogurt|yoghurt|yoğurt'],
    ['labneh', 180, 6, 4, 16, 'milk', 0, 0, 'لبنة|labneh|labne|süzme yoğurt'],
    ['ayran', 37, 1.7, 2.4, 1.7, 'milk', 0, 1.02, 'عيران|لبن عيران|ayran|laban drink'],
    ['cream', 340, 2.1, 2.8, 36, 'milk', 0, 1.0, 'كريمة|قشطة|كريمة طبخ|كريمة خفق|cream|heavy cream|whipping cream|krema|kaymak'],
    ['butter', 717, 0.9, 0.1, 81, 'milk', 0, 0.91, 'زبدة|زبده|butter|tereyağı'],
    ['ghee', 876, 0.3, 0, 99.5, 'milk', 0, 0.91, 'سمن|سمنة|سمن بلدي|ghee|sade yağ'],
    ['cheese_white', 264, 14, 4, 21, 'milk', 0, 0, 'جبنة بيضاء|جبن أبيض|فيتا|جبنة عكاوي|جبنة نابلسية|feta|white cheese|beyaz peynir'],
    ['cheese_yellow', 403, 25, 1.3, 33, 'milk', 0, 0, 'جبنة صفراء|شيدر|جودا|جبنة شرائح|جبنة|جبن|cheddar|gouda|cheese|kaşar|peynir'],
    ['mozzarella', 280, 28, 3, 17, 'milk', 0, 0, 'موزاريلا|موتزاريلا|mozzarella|mozarella'],
    ['halloumi', 321, 21, 2, 25, 'milk', 0, 0, 'حلوم|حلومي|halloumi|hellim'],
    ['parmesan', 431, 38, 4, 29, 'milk', 0, 0, 'بارميزان|parmesan|parmesan peyniri'],
    ['cream_cheese', 342, 6, 4, 34, 'milk', 0, 0, 'جبنة كريمية|جبنة مثلثات|كيري|cream cheese|krem peynir'],
    ['condensed_milk', 321, 7.9, 54, 8.7, 'milk', 0, 1.3, 'حليب مكثف|حليب محلى|condensed milk|şekerli yoğun süt'],
    ['evaporated_milk', 134, 6.8, 10, 7.6, 'milk', 0, 1.06, 'حليب مبخر|evaporated milk'],
    ['milk_powder', 496, 26, 38, 27, 'milk', 0, 0, 'حليب بودرة|حليب مجفف|milk powder|süt tozu'],
    ['ice_cream', 207, 3.5, 24, 11, 'milk,eggs', 0, 0, 'آيس كريم|بوظة|ice cream|dondurma'],
    ['flour', 364, 10, 76, 1, 'gluten', 0, 0.55, 'طحين|دقيق|طحين أبيض|flour|wheat flour|un|buğday unu'],
    ['flour_whole', 340, 13, 72, 2.5, 'gluten', 0, 0.55, 'طحين أسمر|دقيق قمح كامل|whole wheat flour|tam buğday unu'],
    ['semolina', 360, 12.7, 73, 1, 'gluten', 0, 0.6, 'سميد|سميدة|semolina|irmik'],
    ['bread', 265, 9, 49, 3.2, 'gluten', 0, 0, 'خبز|عيش|خبز توست|توست|bread|toast|ekmek|tost ekmeği'],
    ['bread_arabic', 275, 9, 56, 1.2, 'gluten', 60, 0, 'خبز عربي|خبز صاج|رغيف|خبز لبناني|pita|arabic bread|pita bread|lavaş|pide'],
    ['burger_bun', 280, 9, 50, 4.5, 'gluten,sesame,milk', 60, 0, 'خبز برغر|خبز همبرغر|bun|burger bun|hamburger ekmeği'],
    ['tortilla', 312, 8, 52, 8, 'gluten', 45, 0, 'تورتيلا|خبز تورتيلا|tortilla|wrap|dürüm'],
    ['baguette', 270, 9, 55, 1.5, 'gluten', 0, 0, 'صمون|باغيت|baguette|somun'],
    ['puff_pastry', 558, 7.4, 46, 38, 'gluten,milk', 0, 0, 'عجينة بف|بف باستري|عجين الكرواسون|puff pastry|milföy'],
    ['phyllo', 299, 7, 53, 6, 'gluten', 0, 0, 'رقائق فيلو|عجينة فيلو|رقائق|يوفكا|phyllo|filo|yufka'],
    ['kunafa_dough', 330, 8, 70, 2, 'gluten', 0, 0, 'عجينة كنافة|شعر الكنافة|كنافة|kataifi|kadayıf'],
    ['dough', 280, 8, 50, 5, 'gluten', 0, 0, 'عجينة|عجين|عجينة بيتزا|dough|pizza dough|hamur|pizza hamuru'],
    ['rice', 360, 6.7, 79, 0.6, '', 0, 0.85, 'رز|أرز|رز بسمتي|رز مصري|rice|basmati|pirinç'],
    ['rice_cooked', 130, 2.7, 28, 0.3, '', 0, 0, 'رز مطبوخ|أرز مطبوخ|cooked rice|pilav'],
    ['bulgur', 342, 12, 76, 1.3, 'gluten', 0, 0.7, 'برغل|بلغور|bulgur'],
    ['freekeh', 352, 13, 72, 2.5, 'gluten', 0, 0.7, 'فريكة|freekeh|firik'],
    ['pasta', 371, 13, 75, 1.5, 'gluten', 0, 0, 'معكرونة|مكرونة|باستا|سباغيتي|بيني|pasta|spaghetti|penne|makarna'],
    ['noodles', 384, 10, 71, 4.4, 'gluten,eggs', 0, 0, 'نودلز|شعيرية|noodles|vermicelli|şehriye|erişte'],
    ['oats', 389, 17, 66, 7, 'gluten', 0, 0.4, 'شوفان|oats|oatmeal|yulaf'],
    ['corn_flour', 365, 7, 79, 4, '', 0, 0.55, 'نشا|نشا ذرة|كورن فلور|corn starch|corn flour|mısır nişastası'],
    ['breadcrumbs', 395, 13, 72, 5, 'gluten', 0, 0.45, 'بقسماط|فتات خبز|breadcrumbs|galeta unu'],
    ['corn_flakes', 357, 7.5, 84, 0.4, 'gluten', 0, 0, 'كورن فليكس|corn flakes|mısır gevreği'],
    ['chickpeas_dry', 364, 19, 61, 6, '', 0, 0.8, 'حمص حب|حمص ناشف|حمص مجفف|chickpeas dry|kuru nohut'],
    ['chickpeas', 164, 8.9, 27, 2.6, '', 0, 0, 'حمص|حمص مسلوق|حمص معلب|chickpeas|garbanzo|nohut'],
    ['lentils_dry', 352, 25, 63, 1, '', 0, 0.85, 'عدس|عدس أحمر|عدس أصفر|عدس بني|lentils|red lentils|mercimek|kırmızı mercimek'],
    ['fava', 110, 7.6, 20, 0.4, '', 0, 0, 'فول|فول مدمس|فول مسلوق|fava beans|ful medames|bakla'],
    ['beans_white', 333, 23, 60, 0.9, '', 0, 0.8, 'فاصوليا بيضاء|فاصولياء ناشفة|white beans|kuru fasulye'],
    ['beans_kidney', 127, 8.7, 23, 0.5, '', 0, 0, 'فاصوليا حمراء|kidney beans|barbunya'],
    ['peas', 81, 5.4, 14, 0.4, '', 0, 0, 'بازلاء|بازيلا|بسلة|peas|bezelye'],
    ['green_beans', 31, 1.8, 7, 0.2, '', 0, 0, 'فاصوليا خضراء|لوبيا|green beans|taze fasulye'],
    ['falafel_mix', 333, 13, 32, 18, 'sesame', 17, 0, 'فلافل|طعمية|falafel'],
    ['tahini', 595, 17, 21, 54, 'sesame', 0, 1.1, 'طحينة|طحينية|tahini|tahin'],
    ['hummus', 166, 7.9, 14, 9.6, 'sesame', 0, 0, 'حمص بطحينة|متبل حمص|hummus|humus'],
    ['soy_sauce', 53, 8, 4.9, 0.6, 'soy,gluten', 0, 1.15, 'صويا صوص|صلصة الصويا|soy sauce|soya sosu'],
    ['tofu', 76, 8, 1.9, 4.8, 'soy', 0, 0, 'توفو|tofu'],
    ['potato', 77, 2, 17, 0.1, '', 170, 0, 'بطاطا|بطاطس|potato|potatoes|patates'],
    ['fries', 312, 3.4, 41, 15, '', 0, 0, 'بطاطا مقلية|بطاطس مقلية|بطاطا فرنسية|فرايز|french fries|fries|patates kızartması'],
    ['fries_frozen', 150, 2.5, 24, 5, '', 0, 0, 'بطاطا مجمدة|فرايز مجمد|frozen fries|dondurulmuş patates'],
    ['sweet_potato', 86, 1.6, 20, 0.1, '', 130, 0, 'بطاطا حلوة|sweet potato|tatlı patates'],
    ['tomato', 18, 0.9, 3.9, 0.2, '', 120, 0, 'طماطم|بندورة|tomato|tomatoes|domates'],
    ['tomato_paste', 82, 4.3, 19, 0.5, '', 0, 1.1, 'معجون طماطم|رب البندورة|صلصة طماطم مركزة|tomato paste|salça|domates salçası'],
    ['tomato_sauce', 29, 1.3, 6, 0.2, '', 0, 1.03, 'صلصة طماطم|صوص طماطم|صلصة بيتزا|tomato sauce|marinara|domates sosu'],
    ['cucumber', 15, 0.7, 3.6, 0.1, '', 200, 0, 'خيار|cucumber|salatalık'],
    ['pickles', 11, 0.3, 2.3, 0.2, 'mustard,sulphites', 0, 0, 'مخلل|كبيس|خيار مخلل|pickles|turşu'],
    ['onion', 40, 1.1, 9.3, 0.1, '', 110, 0, 'بصل|بصلة|onion|soğan'],
    ['green_onion', 32, 1.8, 7.3, 0.2, '', 15, 0, 'بصل أخضر|green onion|spring onion|yeşil soğan'],
    ['garlic', 149, 6.4, 33, 0.5, '', 5, 0, 'ثوم|garlic|sarımsak'],
    ['lettuce', 15, 1.4, 2.9, 0.2, '', 0, 0, 'خس|لتس|lettuce|marul'],
    ['cabbage', 25, 1.3, 5.8, 0.1, '', 0, 0, 'ملفوف|كرنب|cabbage|lahana'],
    ['carrot', 41, 0.9, 9.6, 0.2, '', 60, 0, 'جزر|carrot|havuç'],
    ['pepper_bell', 26, 1, 6, 0.3, '', 120, 0, 'فلفل حلو|فليفلة|فلفل رومي|فلفل ألوان|bell pepper|capsicum|dolmalık biber|biber'],
    ['pepper_hot', 40, 1.9, 8.8, 0.4, '', 10, 0, 'فلفل حار|شطة|هالبينو|chili|jalapeno|hot pepper|acı biber'],
    ['eggplant', 25, 1, 6, 0.2, '', 250, 0, 'باذنجان|بادنجان|eggplant|aubergine|patlıcan'],
    ['zucchini', 17, 1.2, 3.1, 0.3, '', 200, 0, 'كوسا|كوسة|zucchini|courgette|kabak'],
    ['mushroom', 22, 3.1, 3.3, 0.3, '', 15, 0, 'فطر|مشروم|عيش الغراب|mushroom|mantar'],
    ['spinach', 23, 2.9, 3.6, 0.4, '', 0, 0, 'سبانخ|spinach|ıspanak'],
    ['broccoli', 34, 2.8, 7, 0.4, '', 0, 0, 'بروكلي|broccoli|brokoli'],
    ['cauliflower', 25, 1.9, 5, 0.3, '', 0, 0, 'قرنبيط|زهرة|cauliflower|karnabahar'],
    ['corn', 86, 3.3, 19, 1.4, '', 0, 0, 'ذرة|ذرة حلوة|corn|sweet corn|mısır'],
    ['okra', 33, 1.9, 7.5, 0.2, '', 0, 0, 'بامية|okra|bamya'],
    ['olives', 115, 0.8, 6, 11, 'sulphites', 4, 0, 'زيتون|olives|zeytin'],
    ['parsley', 36, 3, 6.3, 0.8, '', 0, 0, 'بقدونس|parsley|maydanoz'],
    ['mint', 44, 3.3, 8.4, 0.7, '', 0, 0, 'نعناع|نعنع|mint|nane'],
    ['coriander', 23, 2.1, 3.7, 0.5, '', 0, 0, 'كزبرة خضراء|كزبرة|cilantro|coriander|kişniş'],
    ['dill', 43, 3.5, 7, 1.1, '', 0, 0, 'شبت|dill|dereotu'],
    ['rocket', 25, 2.6, 3.7, 0.7, '', 0, 0, 'جرجير|rocket|arugula|roka'],
    ['celery', 16, 0.7, 3, 0.2, 'celery', 0, 0, 'كرفس|celery|kereviz'],
    ['beetroot', 43, 1.6, 10, 0.2, '', 0, 0, 'شمندر|بنجر|beetroot|pancar'],
    ['radish', 16, 0.7, 3.4, 0.1, '', 0, 0, 'فجل|radish|turp'],
    ['avocado', 160, 2, 8.5, 14.7, '', 150, 0, 'أفوكادو|avocado|avokado'],
    ['vine_leaves', 93, 5.6, 17, 2.1, '', 0, 0, 'ورق عنب|ورق دوالي|vine leaves|asma yaprağı'],
    ['lemon', 29, 1.1, 9.3, 0.3, '', 100, 0, 'ليمون|حامض|lemon|limon'],
    ['lemon_juice', 22, 0.4, 6.9, 0.2, '', 0, 1.03, 'عصير ليمون|عصير حامض|lemon juice|limon suyu'],
    ['orange', 47, 0.9, 12, 0.1, '', 150, 0, 'برتقال|orange|portakal'],
    ['orange_juice', 45, 0.7, 10.4, 0.2, '', 0, 1.04, 'عصير برتقال|orange juice|portakal suyu'],
    ['apple', 52, 0.3, 14, 0.2, '', 180, 0, 'تفاح|apple|elma'],
    ['banana', 89, 1.1, 23, 0.3, '', 120, 0, 'موز|banana|muz'],
    ['strawberry', 32, 0.7, 7.7, 0.3, '', 12, 0, 'فراولة|فريز|strawberry|çilek'],
    ['mango', 60, 0.8, 15, 0.4, '', 300, 0, 'مانجو|مانجا|mango'],
    ['pineapple', 50, 0.5, 13, 0.1, '', 0, 0, 'أناناس|pineapple|ananas'],
    ['grapes', 69, 0.7, 18, 0.2, '', 0, 0, 'عنب|grapes|üzüm'],
    ['watermelon', 30, 0.6, 7.6, 0.2, '', 0, 0, 'بطيخ|جبس|watermelon|karpuz'],
    ['melon', 34, 0.8, 8.2, 0.2, '', 0, 0, 'شمام|melon|kavun'],
    ['pomegranate', 83, 1.7, 19, 1.2, '', 250, 0, 'رمان|pomegranate|nar'],
    ['pomegranate_molasses', 260, 0.5, 65, 0, '', 0, 1.35, 'دبس رمان|pomegranate molasses|nar ekşisi'],
    ['dates', 282, 2.5, 75, 0.4, '', 8, 0, 'تمر|تمور|dates|hurma'],
    ['raisins', 299, 3.1, 79, 0.5, 'sulphites', 0, 0, 'زبيب|raisins|kuru üzüm'],
    ['coconut', 354, 3.3, 15, 33, '', 0, 0, 'جوز هند|كوكو|coconut|hindistan cevizi'],
    ['kiwi', 61, 1.1, 15, 0.5, '', 75, 0, 'كيوي|kiwi'],
    ['peach', 39, 0.9, 10, 0.3, '', 150, 0, 'خوخ|دراق|peach|şeftali'],
    ['blueberry', 57, 0.7, 14, 0.3, '', 0, 0, 'توت|توت أزرق|blueberry|berries|yaban mersini'],
    ['almond', 579, 21, 22, 50, 'nuts', 0, 0, 'لوز|almond|badem'],
    ['walnut', 654, 15, 14, 65, 'nuts', 0, 0, 'جوز|عين جمل|walnut|ceviz'],
    ['pistachio', 562, 20, 28, 45, 'nuts', 0, 0, 'فستق حلبي|فستق|pistachio|antep fıstığı'],
    ['cashew', 553, 18, 30, 44, 'nuts', 0, 0, 'كاجو|كاشو|cashew|kaju'],
    ['hazelnut', 628, 15, 17, 61, 'nuts', 0, 0, 'بندق|hazelnut|fındık'],
    ['pine_nuts', 673, 14, 13, 68, 'nuts', 0, 0, 'صنوبر|pine nuts|çam fıstığı'],
    ['peanut', 567, 26, 16, 49, 'peanuts', 0, 0, 'فول سوداني|فستق عبيد|peanut|peanuts|yer fıstığı'],
    ['peanut_butter', 588, 25, 20, 50, 'peanuts', 0, 1.1, 'زبدة فول سوداني|زبدة الفول السوداني|peanut butter|fıstık ezmesi'],
    ['sesame', 573, 18, 23, 50, 'sesame', 0, 0.6, 'سمسم|sesame|susam'],
    ['nutella', 539, 6.3, 57, 31, 'nuts,milk,soy', 0, 1.2, 'نوتيلا|شوكولا دهن|nutella|chocolate spread|kakaolu fındık kreması'],
    ['lupin', 371, 36, 40, 10, 'lupin', 0, 0, 'ترمس|lupin|acı bakla'],
    ['olive_oil', 884, 0, 0, 100, '', 0, 0.91, 'زيت زيتون|olive oil|zeytinyağı'],
    ['oil', 884, 0, 0, 100, '', 0, 0.92, 'زيت|زيت نباتي|زيت قلي|زيت دوار الشمس|زيت ذرة|oil|vegetable oil|sunflower oil|ayçiçek yağı|sıvı yağ'],
    ['margarine', 717, 0.2, 0.7, 80, 'milk', 0, 0.91, 'مارجرين|زبدة نباتية|margarine|margarin'],
    ['mayonnaise', 680, 1, 0.6, 75, 'eggs,mustard', 0, 0.95, 'مايونيز|مايونيزة|mayonnaise|mayo|mayonez'],
    ['garlic_sauce', 520, 1, 4, 55, '', 0, 0.95, 'ثومية|صوص ثوم|garlic sauce|toum|sarımsaklı sos'],
    ['ketchup', 112, 1.7, 26, 0.1, '', 0, 1.15, 'كاتشب|كتشب|ketchup|ketçap'],
    ['mustard', 66, 4.4, 5.8, 4, 'mustard', 0, 1.05, 'خردل|مسطردة|mustard|hardal'],
    ['bbq_sauce', 172, 0.8, 41, 0.6, 'mustard', 0, 1.1, 'صوص باربكيو|باربيكيو|bbq sauce|barbekü sos'],
    ['hot_sauce', 11, 0.5, 1.8, 0.4, '', 0, 1.0, 'صوص حار|تاباسكو|hot sauce|tabasco|acı sos'],
    ['harissa', 120, 3, 12, 7, '', 0, 1.0, 'هريسة|دبس فلفل|harissa|biber salçası'],
    ['vinegar', 18, 0, 0.04, 0, 'sulphites', 0, 1.01, 'خل|vinegar|sirke'],
    ['salt', 0, 0, 0, 0, '', 0, 1.2, 'ملح|salt|tuz'],
    ['pepper_black', 251, 10, 64, 3.3, '', 0, 0.5, 'فلفل أسود|بهار|بهارات|بهارات مشكلة|سبع بهارات|black pepper|spices|baharat|karabiber'],
    ['cumin', 375, 18, 44, 22, '', 0, 0.5, 'كمون|cumin|kimyon'],
    ['paprika', 282, 14, 54, 13, '', 0, 0.5, 'بابريكا|فلفل أحمر مطحون|paprika|pul biber|kırmızı toz biber'],
    ['turmeric', 312, 9.7, 67, 3.3, '', 0, 0.5, 'كركم|turmeric|zerdeçal'],
    ['cinnamon', 247, 4, 81, 1.2, '', 0, 0.5, 'قرفة|دارسين|cinnamon|tarçın'],
    ['sumac', 239, 4, 71, 14, '', 0, 0.5, 'سماق|sumac|sumak'],
    ['zaatar', 276, 9, 64, 7.4, 'sesame', 0, 0.45, 'زعتر|zaatar|zahter|kekik'],
    ['curry', 325, 14, 56, 14, 'mustard', 0, 0.5, 'كاري|curry|köri'],
    ['ginger', 80, 1.8, 18, 0.8, '', 0, 0, 'زنجبيل|ginger|zencefil'],
    ['cardamom', 311, 11, 68, 6.7, '', 0, 0.5, 'هيل|حبهان|cardamom|kakule'],
    ['saffron', 310, 11, 65, 6, '', 0, 0.5, 'زعفران|saffron|safran'],
    ['yeast', 325, 40, 41, 7.6, '', 0, 0.6, 'خميرة|yeast|maya'],
    ['baking_powder', 53, 0, 28, 0, '', 0, 0.9, 'بيكنج باودر|بيكربونات|baking powder|baking soda|kabartma tozu'],
    ['stock_cube', 250, 10, 25, 14, 'celery,gluten', 10, 0, 'مكعب مرق|ماجي|مرقة|stock cube|bouillon|bulyon'],
    ['sugar', 387, 0, 100, 0, '', 0, 0.85, 'سكر|سكر أبيض|سكر ناعم|sugar|şeker|toz şeker'],
    ['brown_sugar', 380, 0.1, 98, 0, '', 0, 0.9, 'سكر بني|brown sugar|esmer şeker'],
    ['honey', 304, 0.3, 82, 0, '', 0, 1.42, 'عسل|honey|bal'],
    ['syrup', 290, 0, 75, 0, '', 0, 1.33, 'قطر|شيرة|شراب سكر|سيرب|syrup|simple syrup|şerbet|şurup'],
    ['date_molasses', 290, 1.5, 72, 0, '', 0, 1.4, 'دبس|دبس تمر|date syrup|pekmez'],
    ['chocolate_dark', 546, 4.9, 61, 31, 'milk,soy', 0, 0, 'شوكولاتة|شوكولا|شوكولاتة داكنة|chocolate|dark chocolate|çikolata|bitter çikolata'],
    ['chocolate_milk', 535, 7.6, 59, 30, 'milk,soy', 0, 0, 'شوكولاتة حليب|milk chocolate|sütlü çikolata'],
    ['cocoa', 228, 20, 58, 14, '', 0, 0.45, 'كاكاو|cocoa|kakao'],
    ['jam', 278, 0.4, 69, 0.1, '', 0, 1.3, 'مربى|jam|reçel'],
    ['caramel', 382, 2.3, 77, 8, 'milk', 0, 1.3, 'كراميل|صوص كراميل|caramel|karamel'],
    ['vanilla', 288, 0.1, 13, 0.1, '', 0, 0.9, 'فانيليا|vanilla|vanilya'],
    ['halawa', 469, 12, 60, 22, 'sesame', 0, 0, 'حلاوة طحينية|حلاوة|halva|helva'],
    ['biscuit', 480, 6.5, 70, 20, 'gluten,milk,eggs', 0, 0, 'بسكويت|لوتس|اوريو|biscuit|cookies|lotus|oreo|bisküvi'],
    ['cake', 380, 5, 52, 17, 'gluten,eggs,milk', 0, 0, 'كيك|كعكة|cake|kek'],
    ['whipped_cream', 257, 3.2, 12.5, 22, 'milk', 0, 0.3, 'كريمة مخفوقة|شانتيه|whipped cream|chantilly|krem şanti'],
    ['gelatin', 335, 86, 0, 0.1, '', 0, 0, 'جيلاتين|جيلي|gelatin|jelatin'],
    ['coffee_beans', 2, 0.1, 0, 0, '', 0, 0, 'بن|قهوة|قهوة مطحونة|حبوب قهوة|اسبريسو|coffee|espresso|ground coffee|kahve'],
    ['tea', 1, 0, 0.3, 0, '', 0, 0, 'شاي|tea|çay'],
    ['soft_drink', 42, 0, 10.6, 0, '', 330, 1.04, 'مشروب غازي|بيبسي|كولا|سفن أب|soft drink|cola|pepsi|soda|gazlı içecek|kola'],
    ['water', 0, 0, 0, 0, '', 0, 1, 'ماء|مياه|ماي|water|su'],
    ['juice', 46, 0.5, 11, 0.1, '', 0, 1.04, 'عصير|عصير فواكه|juice|meyve suyu'],
    ['shisha_tobacco', 0, 0, 0, 0, '', 0, 0, 'معسل|تبغ|فحم|أرجيلة|اركيلة|شيشة|tobacco|shisha|hookah|nargile|tütün|kömür'],
    ['ice', 0, 0, 0, 0, '', 0, 1, 'ثلج|ice|buz']
  ];

  const IDX = [];
  const BY = {};
  const norm = function (s) {
    return String(s || '').toLowerCase().replace(/[\u064B-\u065F\u0670]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
      .replace(/ـ/g, '').replace(/[()\[\]\-_,.،/\\]+/g, ' ').replace(/\s+/g, ' ').trim();
  };
  DB.forEach(function (r) {
    const o = { key: r[0], kcal: r[1], p: r[2], c: r[3], f: r[4], al: r[5] ? r[5].split(',') : [], piece: r[6], density: r[7] || 1, names: r[8].split('|') };
    BY[o.key] = o;
    o.names.forEach(function (n) { IDX.push([norm(n), o]); });
  });
  IDX.sort(function (a, b) { return b[0].length - a[0].length; }); // الأطول أولاً (صدر دجاج قبل دجاج)

  function matchRef(name) {
    const n = ' ' + norm(name) + ' ';
    if (!n.trim()) return null;
    for (let i = 0; i < IDX.length; i++) { const k = IDX[i][0]; if (k && n.indexOf(' ' + k + ' ') >= 0) return IDX[i][1]; }
    // مطابقة مع أداة التعريف «ال»
    for (let i = 0; i < IDX.length; i++) { const k = IDX[i][0]; if (k.length >= 3 && n.indexOf(' ال' + k) >= 0) return IDX[i][1]; }
    for (let i = 0; i < IDX.length; i++) { const k = IDX[i][0]; if (k.length >= 5 && n.indexOf(k) >= 0) return IDX[i][1]; }
    return null;
  }

  const UNIT = [
    [/^(كغ|كجم|كيلو|كيلوغرام|كيلوجرام|كغم|kg|kgs|kilo|kilogram)$/i, 1000, 'w'],
    [/^(غ|غرام|جرام|جم|غم|g|gr|gram|grams|gramm)$/i, 1, 'w'],
    [/^(ملغ|mg)$/i, 0.001, 'w'],
    [/^(لتر|ل|لترات|l|lt|ltr|liter|litre|litres)$/i, 1000, 'v'],
    [/^(مل|ملل|مللتر|ميليلتر|ml|mls|milliliter|millilitre|cc)$/i, 1, 'v'],
    [/^(كوب|كاسه|cup|cups|bardak|su bardagi)$/i, 240, 'v'],
    [/^(م ك|ملعقه كبيره|tbsp|tablespoon|yemek kasigi|ملعقه)$/i, 15, 'v'],
    [/^(م ص|ملعقه صغيره|tsp|teaspoon|cay kasigi)$/i, 5, 'v'],
    [/^(اونصه|oz|ounce)$/i, 28.35, 'w'],
    [/^(رطل|باوند|lb|lbs|pound)$/i, 453.6, 'w'],
    [/^(حبه|قطعه|عدد|راس|رغيف|بيضه|علبه|كيس|شريحه|pcs|pc|piece|pieces|unit|each|ea|adet|tane|dilim)$/i, 0, 'p']
  ];
  function toGrams(qty, unit, ref, mat, ov) {
    qty = parseFloat(qty) || 0; if (!qty) return { g: 0, ok: true };
    if (ov && +ov.gPerUnit > 0) return { g: qty * ov.gPerUnit, ok: true };
    const u = norm(unit);
    for (let i = 0; i < UNIT.length; i++) {
      if (UNIT[i][0].test(u)) {
        if (UNIT[i][2] === 'w') return { g: qty * UNIT[i][1], ok: true };
        if (UNIT[i][2] === 'v') return { g: qty * UNIT[i][1] * ((ref && ref.density) || 1), ok: true };
        const pw = (mat && +mat.portionWeight) || (ref && ref.piece) || 0;
        if (pw > 0) return { g: qty * (pw < 5 ? pw * 1000 : pw), ok: true };
        return { g: 0, ok: false, why: 'أدخل وزن الحبة بالغرام' };
      }
    }
    if (!u) return { g: 0, ok: false, why: 'وحدة غير محددة' };
    return { g: 0, ok: false, why: 'وحدة غير معروفة: ' + unit };
  }

  // ings: [{materialId, materialName, quantity}] ، matsById: {id:{name,unit,portionWeight}} ، doc: {mats:{id:{ref,kcal,p,c,f,al,gPerUnit}}}
  function calcRecipe(ings, matsById, doc) {
    doc = doc || {}; const ovs = doc.mats || {};
    const out = { kcal: 0, protein: 0, carbs: 0, fat: 0, weight: 0, allergens: [], unknown: [], lines: [] };
    const al = new Set();
    (ings || []).forEach(function (g) {
      const mat = matsById[g.materialId] || { name: g.materialName, unit: '' };
      const ov = ovs[g.materialId] || null;
      const ref = ov && ov.ref ? BY[ov.ref] : matchRef(mat.name || g.materialName);
      const custom = ov && ov.kcal !== undefined && ov.kcal !== null && ov.kcal !== '';
      const conv = toGrams(g.quantity, mat.unit, ref, mat, ov);
      const per = custom ? { kcal: +ov.kcal || 0, p: +ov.p || 0, c: +ov.c || 0, f: +ov.f || 0 } : ref;
      const line = { id: g.materialId, name: mat.name || g.materialName, qty: g.quantity, unit: mat.unit, grams: Math.round(conv.g * 10) / 10, ref: ref ? ref.key : '', refName: ref ? ref.names[0] : '', kcal: 0, ok: !!per && conv.ok };
      if (per && conv.g > 0) {
        const k = conv.g / 100;
        const p = per.p * k, c = per.c * k, f = per.f * k;
        const kc = per.kcal ? per.kcal * k : (p * 4 + c * 4 + f * 9); // Atwater عند غياب قيمة السعرات
        out.kcal += kc; out.protein += p; out.carbs += c; out.fat += f; out.weight += conv.g; line.kcal = Math.round(kc);
      }
      if (!per || !conv.ok) out.unknown.push({ id: g.materialId, name: line.name, why: !per ? 'لا توجد قيم مرجعية — حدّدها يدوياً' : conv.why });
      const als = ov && Array.isArray(ov.al) ? ov.al : (ref ? ref.al : []);
      als.forEach(function (a) { al.add(a); });
      out.lines.push(line);
    });
    out.allergens = ALLERGENS.map(function (a) { return a[0]; }).filter(function (k) { return al.has(k); });
    out.kcal = Math.round(out.kcal); out.weight = Math.round(out.weight);
    ['protein', 'carbs', 'fat'].forEach(function (k) { out[k] = Math.round(out[k] * 10) / 10; });
    return out;
  }

  function alGridHtml(sel, name) {
    sel = sel || [];
    const t = function (s) { return window.fcI18n ? fcI18n.t(s) : s; };
    return ALLERGENS.map(function (a) {
      return '<label class="fc-al"><input type="checkbox" ' + (name ? 'name="' + name + '" ' : '') + 'data-al="' + a[0] + '"' + (sel.indexOf(a[0]) >= 0 ? ' checked' : '') + '><i class="fas fa-' + a[2] + '"></i><span>' + t(a[1]) + '</span></label>';
    }).join('');
  }
  function readAl(root) { return Array.from(root.querySelectorAll('input[data-al]')).filter(function (x) { return x.checked; }).map(function (x) { return x.dataset.al; }); }
  function nutriLine(n) {
    const t = function (s) { return window.fcI18n ? fcI18n.t(s) : s; };
    return t('بروتين') + ' ' + (n.protein || 0) + t('غ') + ' · ' + t('كربوهيدرات') + ' ' + (n.carbs || 0) + t('غ') + ' · ' + t('دهون') + ' ' + (n.fat || 0) + t('غ');
  }

  function fillModal(it) {
    const box = document.getElementById('dmAllergens'); if (!box) return;
    box.classList.add('fc-al-grid');
    box.innerHTML = alGridHtml((it && it.allergens) || []);
    const c = document.getElementById('dmItemCalories'); if (c) c.value = it && it.calories !== undefined && it.calories !== null ? it.calories : '';
    const n = document.getElementById('dmItemNutrition'); if (n) n.value = it && it.nutrition ? JSON.stringify(it.nutrition) : '';
    const info = document.getElementById('dmNutriInfo'); if (info) info.textContent = it && it.nutrition && it.nutrition.protein != null ? nutriLine(it.nutrition) : '';
  }
  window.fcNutriItemFields = function () {
    const c = document.getElementById('dmItemCalories'); if (!c) return {};
    const box = document.getElementById('dmAllergens');
    let nut = null; try { nut = JSON.parse(document.getElementById('dmItemNutrition').value || 'null'); } catch (e) { nut = null; }
    const cal = c.value === '' ? null : Math.max(0, Math.round(+c.value || 0));
    if (nut && cal !== null && nut.kcal !== cal) nut.manual = true;
    if (nut) nut.kcal = cal;
    return { calories: cal, nutrition: nut, allergens: box ? readAl(box) : [] };
  };
  let DATA = null;
  async function loadData(force) {
    if (DATA && !force) return DATA;
    const r = typeof bz === 'function' ? await bz('nutritionData', {}) : await callServer('nutritionData', {}, false);
    if (!r || r.success === false) throw new Error((r && r.error) || 'تعذر تحميل البيانات');
    const m = {}; (r.materials || []).forEach(function (x) { m[x.id] = x; });
    DATA = { materials: r.materials || [], mats: m, recipes: r.recipes || [], doc: r.doc || {}, menu: r.menu || [], products: r.products || [] };
    return DATA;
  }
  function dishResult(d, rec) {
    const res = calcRecipe(rec.ingredients, d.mats, d.doc);
    const ovd = ((d.doc || {}).dishes || {})[rec.name];
    if (ovd && ovd.kcal !== undefined && ovd.kcal !== '' && ovd.kcal !== null) { res.autoKcal = res.kcal; res.kcal = +ovd.kcal; res.manual = true; }
    if (ovd && Array.isArray(ovd.al)) { res.autoAl = res.allergens; res.allergens = ovd.al; res.manualAl = true; }
    return res;
  }
  window.fcNutriCalcForModal = async function () {
    const rn = (document.getElementById('dmItemRecipe') || {}).value || '', nm = (document.getElementById('dmItemName') || {}).value || '';
    try {
      const d = await loadData(true);
      const rec = d.recipes.find(function (x) { return x.name === rn; }) || d.recipes.find(function (x) { return x.name === nm.trim(); });
      if (!rec) { showToast('اربط الصنف بوصفة تحتوي مكونات أولاً (حقل «ربط بوصفة موجودة»)', true); return; }
      if (!rec.ingredients.length) { showToast('الوصفة لا تحتوي مكونات بعد', true); return; }
      const res = dishResult(d, rec);
      document.getElementById('dmItemCalories').value = res.kcal;
      document.getElementById('dmItemNutrition').value = JSON.stringify({ kcal: res.kcal, protein: res.protein, carbs: res.carbs, fat: res.fat, weight: res.weight, manual: !!res.manual, source: 'auto' });
      const box = document.getElementById('dmAllergens');
      res.allergens.forEach(function (k) { const x = box.querySelector('[data-al="' + k + '"]'); if (x) x.checked = true; });
      const t = function (s) { return window.fcI18n ? fcI18n.t(s) : s; };
      document.getElementById('dmNutriInfo').textContent = nutriLine(res) + (res.unknown.length ? ' · ⚠ ' + res.unknown.length + ' ' + t('مكوّن يحتاج مراجعة') : '');
      showToast(res.unknown.length ? 'تم الحساب — راجع المكونات غير المعروفة من صفحة «السعرات ومسببات الحساسية»' : 'تم حساب السعرات ومسببات الحساسية من الوصفة');
    } catch (e) { showToast(e.message, true); }
  };
  function hookModal() {
    if (typeof openAddMenuItemModal !== 'function' || typeof editMenuItem !== 'function') return false;
    if (window.openAddMenuItemModal && window.openAddMenuItemModal.__nutri) return true;
    const o1 = window.openAddMenuItemModal || openAddMenuItemModal, o2 = window.editMenuItem || editMenuItem;
    const n1 = function () { const r = o1.apply(this, arguments); fillModal(null); if (typeof r4Clean === 'function') r4Clean('dmItemModal'); return r; };
    const n2 = function (id) {
      const r = o2.apply(this, arguments);
      const it = (typeof digitalMenuItems !== 'undefined' ? digitalMenuItems : []).find(function (x) { return x.id === id; });
      fillModal(it || null); if (typeof r4Clean === 'function') r4Clean('dmItemModal'); return r;
    };
    n1.__nutri = true;
    window.openAddMenuItemModal = n1; window.editMenuItem = n2;
    try { openAddMenuItemModal = n1; editMenuItem = n2; } catch (e) { }
    return true;
  }
  if (!hookModal()) document.addEventListener('DOMContentLoaded', hookModal);

  window.FC_NUTRI = {
    ALLERGENS: ALLERGENS, AL_SHORT: AL_SHORT, DB: BY, matchRef: matchRef, toGrams: toGrams, calcRecipe: calcRecipe, dishResult: dishResult,
    alGridHtml: alGridHtml, readAl: readAl, loadData: loadData, nutriLine: nutriLine, norm: norm,
    alName: function (k) { const a = ALLERGENS.find(function (x) { return x[0] === k; }); return a ? a[1] : k; },
    alIcon: function (k) { const a = ALLERGENS.find(function (x) { return x[0] === k; }); return a ? a[2] : 'triangle-exclamation'; },
    // يقبل مفاتيح أو أسماء عربية/إنجليزية/تركية مفصولة بفواصل
    parseAllergens: function (s) {
      const out = new Set();
      String(s || '').split(/[,،;|\n]+/).map(function (x) { return norm(x); }).filter(Boolean).forEach(function (x) {
        ALLERGENS.forEach(function (a) {
          const names = [a[0], AL_SHORT[a[0]], a[1]].map(norm);
          if (names.some(function (n) { return n === x || n.indexOf(x) === 0 || x.indexOf(n) === 0; })) out.add(a[0]);
        });
        const extra = { 'wheat': 'gluten', 'قمح': 'gluten', 'gluten free': '', 'dairy': 'milk', 'لبن': 'milk', 'süt': 'milk', 'yumurta': 'eggs', 'balık': 'fish', 'fıstık': 'peanuts', 'soya': 'soy', 'kuruyemiş': 'nuts', 'susam': 'sesame', 'hardal': 'mustard', 'kereviz': 'celery', 'kabuklu': 'crustaceans', 'yumuşakça': 'molluscs', 'sülfit': 'sulphites', 'shellfish': 'crustaceans', 'tree nuts': 'nuts' };
        Object.keys(extra).forEach(function (k) { if (extra[k] && norm(k) === x) out.add(extra[k]); });
      });
      return Array.from(out);
    }
  };

  const st = document.createElement('style');
  st.textContent = '.fc-al-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:6px}' +
    '.fc-al{display:flex;align-items:center;gap:7px;padding:7px 9px;border:1px solid var(--border,#2a334b);border-radius:10px;cursor:pointer;font-size:.82rem;background:rgba(127,127,127,.04)}' +
    '.fc-al input{width:16px;height:16px;accent-color:#ef4444}.fc-al i{color:#f59e0b;width:16px;text-align:center}.fc-al:has(input:checked){border-color:#ef4444;background:rgba(239,68,68,.08)}';
  document.head.appendChild(st);
})();
