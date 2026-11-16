// ============================================================
// biz-opsmgmt.js (v4.6) — إدارة التشغيل والفريق
// SOP والتدقيق · الاستلام والتسليم · جدول الورديات · تقييم الموظفين · تحليل العمالة · لوحة القرارات
// متاحة في باقتي «الإنطلاقة» و«المتقدمة»
// ============================================================
// بيانات نموذج تدقيق سلامة الغذاء الافتراضي (10 أقسام، 65 بنداً): [القسم، [[البند، الخطورة h/m/l، الإجراء الفوري، التوصية]]]
const OPS_FOOD_SOP = [["استلام المواد الخام", [["فحص درجة حرارة الشاحنات المبردة (≤ 4°C) والمجمدة (≤ -18°C)", "h", "يجب رفض المواد إذا كانت درجة حرارتها أعلى من 4°C للمبردة أو -18°C للمجمدة.", "استخدم مقياس حرارة معاير وسجل درجة الحرارة. إذا كانت مرتفعة، أعِد الشحنة فوراً."], ["التحقق من سلامة العبوات وعدم وجود تلف أو تسرب", "m", "العبوات التالفة قد تسبب تلوثاً.", "افحص العبوات عند الاستلام. إذا وجدت تالفة، أعدها أو استخدمها فوراً."], ["مراجعة تواريخ الصلاحية والتأكد من صلاحيتها", "h", "المواد منتهية الصلاحية يجب عدم استخدامها.", "تحقق من التواريخ قبل الاستلام. أي مادة منتهية يجب رفضها."], ["وجود الشهادات الصحية للمنتجات الحيوانية", "m", "المواد عالية الخطورة تحتاج شهادة صحية.", "اطلب الشهادة من المورد واحتفظ بها في الملف."], ["فصل المواد النيئة عن الجاهزة أثناء النقل", "m", "المواد النيئة قد تلوث الجاهزة.", "خصص منطقة منفصلة للمواد النيئة والجاهزة."], ["تسجيل بيانات الاستلام في السجل المخصص", "l", "عدم تسجيل بيانات الاستلام قد يفقد المعلومات.", "التأكد من تعبئة سجل الاستلام يومياً."]]], ["التخزين", [["درجة حرارة المخازن الجافة بين 10-21°C مع تهوية مناسبة", "m", "درجة حرارة المخازن الجافة غير مناسبة.", "ركب مقياس حرارة وسجل القراءات يومياً."], ["الرفوف مرتفعة عن الأرض (15-20 سم) لتسهيل التنظيف", "l", "الرفوف المنخفضة تصعب التنظيف.", "ارفع الرفوف إلى 15-20 سم عن الأرض."], ["تسجيل درجة حرارة الثلاجات (≤ 4°C) مرتين يومياً", "h", "عدم تسجيل حرارة الثلاجات قد يؤدي لفساد الأغذية.", "سجل درجة الحرارة مرتين يومياً."], ["تسجيل درجة حرارة المجمدات (≤ -18°C) مرتين يومياً", "h", "ارتفاع حرارة المجمدات يفسد الأغذية.", "راقب وسجل درجة الحرارة يومياً."], ["تخزين المواد النيئة في الرفوف السفلية", "m", "تخزين المواد النيئة فوق المطبوخة يسبب تلوثاً.", "احرص على وضع النيء في الرفوف السفلية."], ["فصل المواد الكيميائية عن المواد الغذائية", "h", "المواد الكيميائية بجوار الغذاء خطر.", "خصص مكاناً منفصلاً للمواد الكيميائية."], ["تطبيق نظام FIFO (الأول وارداً أول صادراً)", "l", "عدم تطبيق FIFO قد يسبب انتهاء صلاحية.", "درب العاملين على FIFO."], ["عدم تكديس المواد لمنع انسداد التبريد", "m", "التكديس يمنع دوران الهواء.", "اترك مسافات بين المواد."]]], ["التحضير والتجهيز", [["غسل اليدين بالماء والصابون لمدة 20 ثانية قبل البدء", "h", "عدم غسل اليدين ينقل الملوثات.", "تأكد من غسل اليدين لمدة 20 ثانية."], ["استخدام ألواح تقطيع منفصلة للحوم، دواجن، خضار، وأسماك", "h", "استخدام لوح واحد يسبب تلوثاً متقاطعاً.", "خصص ألواح تقطيع مختلفة."], ["تعقيم الأدوات والأسطح بعد تحضير المواد النيئة", "h", "عدم تعقيم الأدوات يلوث الأغذية.", "عقم الأدوات فور الانتهاء."], ["عدم ترك المواد القابلة للتلف خارج التبريد لأكثر من ساعتين", "h", "ترك المواد خارج التبريد ينمو البكتيريا.", "أعد المواد إلى الثلاجة فوراً."], ["إذابة الأغذية المجمدة في الثلاجة أو الميكروويف فقط", "m", "إذابة الأغذية في الغرفة ينمو البكتيريا.", "أذب الأغذية في الثلاجة أو الميكروويف."], ["تغطية الأغذية أثناء التحضير لحمايتها من التلوث", "m", "الأغذية غير المغطاة قد تتلوث.", "غطِّ الأغذية أثناء التحضير."], ["غسل الخضروات والفواكه جيداً بالماء الجاري", "m", "الخضروات غير المغسولة تنقل ملوثات.", "اغسل الخضروات جيداً."]]], ["الطهي وإعادة التسخين", [["وصول درجة حرارة قلب الدواجن إلى 74°C", "h", "الدواجن غير المطهية تحمل السالمونيلا.", "اطه الدواجن حتى 74°C."], ["وصول درجة حرارة اللحوم المفرومة إلى 71°C", "h", "اللحوم المفرومة تحتاج 71°C.", "استخدم مقياس حرارة."], ["وصول درجة حرارة الأسماك واللحوم الكاملة إلى 63°C", "h", "الأسماك غير المطهية قد تحمل طفيليات.", "اطه الأسماك حتى 63°C."], ["إعادة تسخين الأطعمة المحفوظة إلى 74°C خلال ساعتين", "h", "إعادة التسخين غير الكافية لا تقتل البكتيريا.", "أعد التسخين إلى 74°C."], ["تسجيل درجات حرارة الطهي في السجل اليومي", "m", "عدم تسجيل درجات الحرارة يصعب التتبع.", "سجل درجات حرارة الطهي."], ["عدم إعادة تسخين الطعام أكثر من مرة واحدة", "m", "إعادة التسخين المتكرر يفسد الطعام.", "لا تعِد تسخين الطعام أكثر من مرة."]]], ["التقديم والخدمة", [["غسل اليدين قبل تجهيز أطباق التقديم", "h", "تجهيز الأطباق بأيدٍ غير نظيفة يلوثها.", "اغسل يديك جيداً قبل التقديم."], ["استخدام أواني نظيفة ومعقمة لكل طبق", "h", "أوانٍ غير نظيفة تنقل التلوث.", "تأكد من نظافة الأواني."], ["الحفاظ على درجة حرارة الأطعمة الساخنة (≥ 60°C) أثناء التقديم", "h", "الطعام البارد ينمو البكتيريا.", "استخدم طاولات تسخين."], ["الحفاظ على درجة حرارة الأطعمة الباردة (≤ 4°C) أثناء التقديم", "h", "الطعام البارد يجب أن يبقى تحت 4°C.", "استخدم طاولات مبردة."], ["عدم لمس الأجزاء الصالحة للأكل باليد مباشرة", "m", "لمس الطعام باليد ينقل الملوثات.", "استخدم قفازات أو أدوات."], ["تغطية الأطعمة المعروضة في البوفيه المفتوح", "m", "الطعام المكشوف يتعرض للتلوث.", "استخدم أغطية شفافة."]]], ["التبريد وحفظ الأغذية", [["تبريد الأطعمة الساخنة من 60°C إلى 20°C خلال ساعتين", "h", "التبريد البطيء يسمح بنمو البكتيريا.", "برد الطعام من 60°C إلى 20°C خلال ساعتين."], ["ثم من 20°C إلى 4°C خلال 4 ساعات إضافية", "h", "المرحلة الثانية من التبريد مهمة.", "أكمل التبريد إلى 4°C."], ["استخدام أوعية ضحلة للتبريد السريع (لا يزيد عمقها عن 10 سم)", "m", "الأوعية العميقة تبطئ التبريد.", "استخدم أوعية ضحلة."], ["تغطية الأطعمة بعد التبريد الكامل مع وضع تاريخ التصنيع", "m", "الطعام غير المغطى يتلوث.", "غطِّ الطعام وضع تاريخ التصنيع."], ["عدم تخزين الأطعمة الساخنة مباشرة في الثلاجة", "h", "وضع الطعام الساخن في الثلاجة يرفع حرارتها.", "برد الطعام أولاً."], ["مراقبة درجات حرارة الثلاجات والمجمدات وتسجيلها", "h", "عدم المراقبة يفقد السيطرة.", "سجل درجات الحرارة يومياً."]]], ["النظافة الشخصية", [["ارتداء الزي الرسمي النظيف (شيفون، مئزر، قبعة)", "h", "الزي غير النظيف ينقل الأوساخ.", "وفر زياً نظيفاً يومياً."], ["تغطية الشعر بالكامل (شبكة أو قبعة)", "h", "الشعر قد يسقط في الطعام.", "الزم بارتداء أغطية الشعر."], ["عدم ارتداء المجوهرات أو الساعات أثناء العمل", "m", "المجوهرات تحمل البكتيريا.", "امنع ارتداء المجوهرات."], ["تقليم الأظافر وعدم وضع طلاء أظافر", "m", "الأظافر الطويلة تخفي البكتيريا.", "شدد على تقليم الأظافر."], ["الإبلاغ عن الأمراض المعدية (إسهال، قيء، التهابات جلدية)", "h", "العامل المريض ينقل الأمراض.", "اطلب الإبلاغ عن أي أعراض."], ["غسل اليدين بعد استخدام الحمام، التدخين، الأكل، لمس النفايات", "h", "عدم غسل اليدين ينقل الجراثيم.", "وفر أحواض غسيل وتعليمات."], ["وجود معقم كحولي في متناول اليدين", "m", "نقص المعقم يقلل من النظافة.", "وفر معقمات كحولية."]]], ["التنظيف والتعقيم", [["تنظيف وتعقيم أسطح العمل بعد كل استخدام", "h", "الأسطح غير النظيفة تلوث الطعام.", "نظف وعقم أسطح العمل."], ["غسل وتعقيم الأحواض وأماكن غسل اليدين", "h", "الأحواض القذرة تنشر البكتيريا.", "نظف الأحواض يومياً."], ["تنظيف الأرضيات والجدران من بقايا الطعام فوراً", "m", "بقايا الطعام تجذب الآفات.", "نظف الأرضيات فوراً."], ["استخدام مواد معقمة معتمدة وبالتركيز الصحيح", "h", "مواد غير معتمدة لا تعقم.", "استخدم مواد معتمدة."], ["جدول تنظيف معلّق ويتم التوقيع عليه يومياً", "m", "عدم وجود جدول تنظيف يؤدي للتراكم.", "أعد جدول تنظيف ووقع عليه."], ["تنظيف مراوح الشفط والمكيفات بشكل دوري", "m", "مراوح الشفط المتسخة تلوث الهواء.", "نظف مراوح الشفط دورياً."], ["غسل الأواني والمعدات في غسالة أطباق بدرجة حرارة لا تقل عن 60°C", "h", "غسل الأواني بماء بارد لا يعقم.", "تأكد من 60°C."]]], ["مكافحة الآفات", [["عدم وجود حشرات أو قوارض في المنشأة", "h", "وجود آفات يشير لخلل في النظافة.", "افحص المنشأة يومياً."], ["سد جميع الفتحات والشقوق في الجدران والأبواب والنوافذ", "m", "الفتحات تسمح بدخول الحشرات.", "سد جميع الفتحات."], ["تركيب مصائد ضوئية أو لاصقة في الأماكن المناسبة", "m", "عدم وجود مصائد يسمح بتكاثر الآفات.", "ركب مصائد ضوئية."], ["وجود عقد مع شركة مكافحة آفات معتمدة", "m", "مكافحة الآفات المهنية ضرورية.", "احتفظ بعقد مع شركة مكافحة."], ["التخلص الفوري من النفايات وتنظيف الحاويات يومياً", "h", "النفايات المتراكمة تجذب الآفات.", "تخلص من النفايات فوراً."]]], ["التوثيق والتدريب", [["تسجيل درجات حرارة الثلاجات والمجمدات يومياً", "h", "عدم التسجيل يجعل التتبع مستحيلاً.", "سجل درجات الحرارة يومياً."], ["تسجيل درجات حرارة الطهي والتبريد في السجلات", "h", "درجات الطهي أساسية للسلامة.", "سجلها في سجل خاص."], ["الاحتفاظ بسجلات الاستلام لمدة لا تقل عن 6 أشهر", "m", "فقدان سجلات الاستلام يعيق التتبع.", "احتفظ بالسجلات 6 أشهر."], ["توقيع المسؤول على جميع السجلات يومياً", "l", "التوقيع يضمن المسؤولية.", "اطلب توقيع المسؤول."], ["جميع العاملين حاصلون على تدريب في سلامة الغذاء", "h", "العاملون غير المدربين يجهلون السلامة.", "قدم دورات تدريبية."], ["وجود تعليمات واضحة معلقة (غسل اليدين، درجات الحرارة)", "m", "غياب التعليمات يؤدي للنسيان.", "علق تعليمات واضحة."], ["عقد اجتماعات دورية للتذكير بإجراءات السلامة", "l", "الاجتماعات تذكر العاملين.", "عقد اجتماعات أسبوعية."]]]];

// ---------- الثوابت ----------
var OPS = { owner: '', emps: null, types: null, cfgRow: null, tpls: null, week: null, evMonth: null };
const OPS_DEPTS = { kitchen: 'المطبخ', service: 'الصالة والخدمة', cashier: 'الكاشير', delivery: 'التوصيل', cleaning: 'النظافة والإشراف', management: 'الإدارة' };
const OPS_RISK = { h: ['مرتفع', '#ef4444', 3], m: ['متوسط', '#f59e0b', 2], l: ['منخفض', '#10b981', 1] };
const OPS_TPL_CATS = { audit: 'تدقيق سلامة الغذاء', opening: 'افتتاح الوردية', closing: 'إغلاق الوردية', handover: 'الاستلام والتسليم', custom: 'نموذج مخصص' };
const OPS_DAY_CODES = { off: ['راحة', '#475569'], leave: ['إجازة', '#8b5cf6'], sick: ['مرضية', '#ec4899'] };
const OPS_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const OPS_CRIT_DEF = [
  { k: 'punct', n: 'الالتزام بالمواعيد والحضور', w: 15 }, { k: 'hyg', n: 'النظافة الشخصية والمظهر', w: 15 },
  { k: 'sop', n: 'الالتزام بإجراءات SOP', w: 15 }, { k: 'speed', n: 'سرعة وجودة الإنجاز', w: 15 },
  { k: 'cust', n: 'التعامل مع العملاء', w: 15 }, { k: 'team', n: 'العمل الجماعي والتعاون', w: 10 },
  { k: 'upsell', n: 'المبادرة والبيع الإضافي', w: 10 }, { k: 'learn', n: 'التعلم وتطوير المهارات', w: 5 }];
const OPS_CFG_DEF = { weekStart: 6, targetLabor: 25, monthHours: 208, workDays: 6, maxWeekHours: 48, ordersPerStaffHour: 8, criteria: OPS_CRIT_DEF };

function opsUid() { return 'i' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3); }
function opsCfg() { const d = (OPS.cfgRow && OPS.cfgRow.data) || {}; const o = Object.assign({}, OPS_CFG_DEF, d); if (!Array.isArray(o.criteria) || !o.criteria.length) o.criteria = OPS_CRIT_DEF; return o; }
function opsRate(s) { s = +s || 0; return s >= 90 ? ['ممتاز', '#10b981'] : s >= 75 ? ['جيد', '#60a5fa'] : s >= 60 ? ['يحتاج تحسين', '#f59e0b'] : ['حرج', '#ef4444']; }
function opsScoreBadge(s) { if (s === null || s === undefined) return '—'; const r = opsRate(s); return '<span class="ops-score" style="--c:' + r[1] + '">' + nf(s, 0) + '% · ' + r[0] + '</span>'; }
function opsRiskBadge(r) { const x = OPS_RISK[r] || OPS_RISK.m; return '<span class="ops-risk" style="--c:' + x[1] + '">' + x[0] + '</span>'; }
function opsEmp(id) { return (OPS.emps || []).find(function (e) { return e.id === id; }); }
function opsActiveEmps() { return (OPS.emps || []).filter(function (e) { return e.data.active !== false; }); }
function opsType(id) { return (OPS.types || []).find(function (t) { return t.id === id; }); }
function opsMin(t) { const m = String(t || '').match(/(\d{1,2}):(\d{2})/); return m ? (+m[1]) * 60 + (+m[2]) : 0; }
function opsTypeHours(t) { if (!t) return 0; let d = opsMin(t.data.end) - opsMin(t.data.start); if (d <= 0) d += 1440; return Math.max(0, (d - (+t.data.breakMin || 0)) / 60); }
function opsHourly(e) { const c = opsCfg(); return (+e.data.wage || 0) / (+c.monthHours || 208); }
function opsWeekStart(d) { const c = opsCfg(); d = d ? new Date(d + 'T12:00:00') : new Date(); const diff = (d.getDay() - (+c.weekStart) + 7) % 7; d.setDate(d.getDate() - diff); return isoLocal(d); }
function opsAddDays(iso, n) { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return isoLocal(d); }
function opsDayName(iso) { return OPS_DAYS[new Date(iso + 'T12:00:00').getDay()]; }
function opsShortDate(iso) { const p = iso.split('-'); return p[2] + '/' + p[1]; }
function opsMonthStart(m) { return (m || isoLocal().slice(0, 7)) + '-01'; }
function opsDeptSel(v) { return Object.keys(OPS_DEPTS).map(function (k) { return [k, OPS_DEPTS[k]]; }); }

async function opsL(kind, prm) { const r = await bzOk('opsList', Object.assign({ kind: kind }, prm || {}), { loading: false }); return r.rows || []; }
async function opsS(kind, data, quiet) { const r = await bzOk('opsSave', { kind: kind, data: data }); if (!quiet) showToast('تم الحفظ'); return r.row; }
async function opsD(id, label) { if (!(await bConfirm('هل تريد حذف ' + (label || 'هذا السجل') + '؟ لا يمكن التراجع.'))) return false; await bzOk('opsDelete', { id: id }); showToast('تم الحذف'); return true; }

// ---------- النماذج الافتراضية ----------
function opsSecs(list) { return list.map(function (s) { return { id: opsUid(), title: s[0], items: s[1].map(function (i) { return { id: opsUid(), t: i[0], r: i[1] || 'm', a: i[2] || '', c: i[3] || '' }; }) }; }); }
function opsDefaultTpls() {
  return [
    { title: 'تدقيق سلامة الغذاء اليومي (HACCP)', data: { cat: 'audit', icon: 'shield-virus', desc: 'تدقيق شامل من الاستلام حتى التوثيق — 10 أقسام وفق معايير سلامة الغذاء', sections: opsSecs(OPS_FOOD_SOP) } },
    { title: 'قائمة افتتاح الوردية', data: { cat: 'opening', icon: 'door-open', desc: 'تجهيز المطعم قبل استقبال العملاء', sections: opsSecs([
      ['المطبخ', [['تشغيل معدات الطهي والتأكد من سلامة الغاز والكهرباء', 'h', 'إيقاف المعدة المعطلة وإبلاغ الصيانة فوراً', 'جدول صيانة وقائية أسبوعي للمعدات'], ['قياس وتسجيل حرارة الثلاجات والفريزرات', 'h', 'نقل المواد لثلاجة سليمة إذا تجاوزت الحرارة 5°C', 'سجل حرارة يومي معلّق على كل ثلاجة'], ['فحص تواريخ الصلاحية وتطبيق FIFO', 'h', 'استبعاد المواد المنتهية وتسجيلها كهدر', 'ملصقات تاريخ واضحة على كل الحاويات'], ['تجهيز المقادير المحضّرة (Mise en place) حسب التوقع', 'm', 'استكمال التحضير قبل وقت الذروة', 'ربط كميات التحضير بمبيعات نفس اليوم من الأسبوع الماضي'], ['نظافة الأسطح ولوحات التقطيع حسب الألوان', 'm', 'إعادة التنظيف والتعقيم', 'تدريب الفريق على نظام الألوان']]],
      ['الصالة والكاشير', [['نظافة الطاولات والكراسي والأرضيات', 'm', 'إعادة التنظيف قبل الافتتاح', 'توزيع مناطق التنظيف على الفريق'], ['تجهيز صندوق الكاشير ورصيد الافتتاح', 'h', 'عدّ النقد بحضور المشرف وتوثيقه', 'رصيد افتتاح ثابت لكل وردية'], ['تشغيل نظام الكاشير والطابعات وشاشة المطبخ', 'm', 'التواصل مع الدعم الفني', 'فحص الاتصال قبل الافتتاح بـ 15 دقيقة'], ['توفر قوائم الطعام ورموز QR على الطاولات', 'l', 'استبدال التالف منها', 'مراجعة أسبوعية للمواد المطبوعة']]],
      ['الفريق', [['حضور الفريق في الموعد وبالزي الرسمي', 'm', 'تسجيل التأخير ومعالجته مع المشرف', 'ربط الالتزام بتقييم الموظف الشهري'], ['اجتماع ما قبل الوردية (Briefing) وتوزيع المهام', 'l', 'عقد اجتماع سريع 5 دقائق', 'مشاركة أهداف المبيعات والأصناف المقترحة للبيع']]]]) } },
    { title: 'قائمة إغلاق الوردية', data: { cat: 'closing', icon: 'door-closed', desc: 'إغلاق آمن ومنظم في نهاية اليوم', sections: opsSecs([
      ['المطبخ', [['تبريد وتغليف وتسجيل تاريخ المواد المتبقية', 'h', 'التخلص من المواد غير المغطاة أو مجهولة التاريخ', 'تبريد سريع خلال ساعتين لأقل من 5°C'], ['إطفاء معدات الطهي والغاز', 'h', 'إطفاء فوري وفحص الصمامات', 'قائمة فحص معلقة عند باب المطبخ'], ['تنظيف وتعقيم المعدات والأسطح والأرضيات', 'm', 'إعادة التنظيف قبل المغادرة', 'جدول تنظيف عميق أسبوعي'], ['تسجيل الهدر اليومي في النظام', 'm', 'إدخال الكميات قبل الإغلاق', 'مراجعة أسباب الهدر أسبوعياً']]],
      ['الكاشير والإدارة', [['إغلاق وردية الكاشير ومطابقة النقد', 'h', 'توثيق أي فرق وإبلاغ الإدارة', 'إيداع النقد الزائد في الخزنة خلال الوردية'], ['مراجعة الطلبات المفتوحة والمعلّقة', 'm', 'إغلاق أو إلغاء الطلبات مع ذكر السبب', 'لا تغلق الوردية بوجود طلبات مفتوحة'], ['إغلاق الأبواب والنوافذ وتشغيل الإنذار', 'h', 'فحص كل المداخل', 'تسجيل اسم آخر موظف غادر'], ['إخراج النفايات وتنظيف الحاويات', 'm', 'إخراجها فوراً', 'حاويات محكمة الإغلاق بعيدة عن المخزن']]]]) } },
    { title: 'نموذج الاستلام والتسليم بين الورديات', data: { cat: 'handover', icon: 'people-arrows', desc: 'بنود يتحقق منها المستلم قبل التوقيع', sections: opsSecs([
      ['النقد والمبيعات', [['مطابقة نقد الصندوق مع تقرير الوردية', 'h', 'توثيق الفرق وتوقيع الطرفين', 'عدّ النقد بحضور المسلّم والمستلم'], ['تسليم الطلبات المفتوحة والمعلّقة', 'm', 'تحديد المسؤول عن كل طلب', 'مراجعة شاشة الطلبات أثناء التسليم']]],
      ['المطبخ والمخزون', [['المواد المحضّرة كافية للوردية التالية', 'm', 'تحضير الكميات الناقصة فوراً', 'قائمة كميات تحضير قياسية لكل وردية'], ['حرارة الثلاجات ضمن الحد المسموح', 'h', 'نقل المواد وإبلاغ الصيانة', 'تسجيل الحرارة عند كل تسليم'], ['النواقص والطلبات من المورد مسجلة', 'm', 'تسجيل النواقص في النظام', 'تفعيل تنبيهات الحد الأدنى للمخزون']]],
      ['المكان والمعدات', [['نظافة المطبخ والصالة عند التسليم', 'm', 'لا يُستلم المكان قبل تنظيفه', 'تحديد مسؤولية النظافة على الوردية المسلّمة'], ['المعدات تعمل ولا أعطال غير مُبلغ عنها', 'm', 'تسجيل العطل وإبلاغ الصيانة', 'سجل أعطال موحد'], ['شكاوى العملاء والملاحظات المهمة منقولة', 'l', 'تدوين الشكوى وطريقة معالجتها', 'متابعة الشكوى حتى إغلاقها']]]]) } }];
}
async function opsSeed() {
  for (const t of opsDefaultTpls()) await opsS('sop_tpl', t, true);
  OPS.tpls = await opsL('sop_tpl');
}
async function opsSeedTypes() {
  const def = [['الصباحية', '09:00', '17:00', '#f59e0b', { kitchen: 2, service: 2, cashier: 1 }], ['المسائية', '17:00', '01:00', '#6366f1', { kitchen: 3, service: 3, cashier: 1, delivery: 1 }]];
  for (const d of def) await opsS('shift_type', { title: d[0], data: { start: d[1], end: d[2], color: d[3], breakMin: 30, req: d[4] } }, true);
  OPS.types = (await opsL('shift_type')).sort(function (a, b) { return opsMin(a.data.start) - opsMin(b.data.start); });
}
async function opsBase(force) {
  if (OPS.owner !== currentUserEmail) { OPS = { owner: currentUserEmail, emps: null, types: null, cfgRow: null, tpls: null, week: null, evMonth: null }; }
  if (OPS.emps && !force) return;
  const r = await Promise.all([opsL('employee'), opsL('shift_type'), opsL('ops_cfg'), opsL('sop_tpl')]);
  OPS.emps = r[0].sort(function (a, b) { return String(a.data.dept).localeCompare(String(b.data.dept)) || a.title.localeCompare(b.title, 'ar'); });
  OPS.types = r[1].sort(function (a, b) { return opsMin(a.data.start) - opsMin(b.data.start); }); OPS.cfgRow = r[2][0] || null; OPS.tpls = r[3];
  if (canP('ops')) {
    if (!OPS.tpls.length && !(OPS.cfgRow && OPS.cfgRow.data.seeded)) { await opsSeed(); await opsSaveCfg({ seeded: true }, true); }
    if (!OPS.types.length && !(OPS.cfgRow && OPS.cfgRow.data.typesSeeded)) { await opsSeedTypes(); await opsSaveCfg({ typesSeeded: true }, true); }
  }
}
async function opsSaveCfg(patch, quiet) {
  const data = Object.assign({}, (OPS.cfgRow && OPS.cfgRow.data) || {}, patch);
  OPS.cfgRow = await opsS('ops_cfg', { title: 'إعدادات التشغيل', data: data }, quiet);
}

// ---------- الصفحة ----------
bizPage('opsmgmt', { group: 'admin', title: 'إدارة التشغيل والفريق', icon: 'clipboard-check', feature: 'ops_mgmt', perms: ['ops', 'ops_check'], plan: 'pro',
  sub: 'إجراءات التشغيل القياسية SOP، الاستلام والتسليم، جدول الورديات، تقييم الموظفين وتحليل العمالة — مع توصيات تساعدك على القرار',
  pitch: 'حوّل إدارة مطعمك إلى نظام: نماذج SOP قابلة للتعديل والطباعة، تدقيق يومي بنتيجة موزونة حسب الخطورة وإجراءات تصحيحية تلقائية، استلام وتسليم موثّق بين الورديات، جدول ورديات يكشف نقص التغطية وتكلفة العمالة، وتقييم شهري للموظفين.',
  render: async function (body) {
    await opsBase();
    const full = canP('ops');
    const tabs = full ? [['dash', 'لوحة القرارات', 'lightbulb'], ['sop', 'SOP والتدقيق', 'clipboard-check'], ['hand', 'الاستلام والتسليم', 'people-arrows'], ['sched', 'جدول الورديات', 'calendar-week'],
      ['eval', 'تقييم الموظفين', 'star-half-alt'], ['labor', 'تحليل العمالة', 'calculator'], ['emps', 'فريق العمل', 'users']] : [['sop', 'SOP والتدقيق', 'clipboard-check'], ['hand', 'الاستلام والتسليم', 'people-arrows']];
    body.innerHTML = subTabs('opsSub', tabs, tabs[0][0]) + '<div id="opsBody"></div>';
    const el = body.querySelector('#opsBody');
    const views = { dash: opsDash, sop: opsSop, hand: opsHand, sched: opsSched, eval: opsEval, labor: opsLabor, emps: opsEmps };
    const go = function (k) { el.onclick = null; el.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i></div>'; Promise.resolve(views[k](el)).catch(function (e) { console.error(e); el.innerHTML = '<div class="empty-state">' + h(e.message) + '</div>'; }); };
    bindSubTabs(body, 'opsSub', go);
    OPS.go = function (k) { const b = body.querySelector('[data-sub="' + k + '"]'); if (b) b.click(); };
    go(tabs[0][0]);
  } });

// ============================================================
// لوحة القرارات
// ============================================================
async function opsDash(el) {
  const c = opsCfg(), ws = opsWeekStart(), today = isoLocal();
  const r = await Promise.all([opsL('sop_run', { from: daysAgo(29) }), opsL('handover', { from: daysAgo(13) }), opsL('schedule', { from: ws, to: ws }), opsL('eval', { from: opsMonthStart(), to: opsMonthStart() }),
    bz('opsInsights', { days: 30 }, { loading: false })]);
  const runs = r[0], hands = r[1], sched = r[2][0], evals = r[3], ins = r[4].success ? r[4] : null;
  const emps = opsActiveEmps(), dec = [];
  // SOP
  const sopAvg = runs.length ? runs.reduce(function (s, x) { return s + (+x.score || 0); }, 0) / runs.length : null;
  const fails = {}; runs.forEach(function (x) { (x.data.sections || []).forEach(function (s) { s.items.forEach(function (i) { const res = (x.data.results || {})[i.id]; if (res && res.s === 'fail') { const k = i.t; fails[k] = fails[k] || { t: i.t, r: i.r, a: i.a, c: i.c, n: 0 }; fails[k].n++; } }); }); });
  const topFails = Object.values(fails).sort(function (a, b) { return (b.n * OPS_RISK[b.r][2]) - (a.n * OPS_RISK[a.r][2]); }).slice(0, 5);
  const lastRun = runs[0], daysSinceAudit = lastRun ? Math.round((new Date(today) - new Date(lastRun.period)) / 864e5) : null;
  if (!runs.length) dec.push(['warn', 'clipboard-check', 'لا يوجد تدقيق SOP خلال آخر 30 يوماً', 'ابدأ تدقيقاً يومياً لسلامة الغذاء — التدقيق المنتظم يقلل المخالفات والهدر ويحمي سمعة المطعم.', 'sop']);
  else if (daysSinceAudit > 2) dec.push(['warn', 'calendar-times', 'آخر تدقيق كان قبل ' + daysSinceAudit + ' أيام', 'حدد مسؤولاً يومياً للتدقيق وأضفه في جدول الورديات.', 'sop']);
  if (sopAvg !== null && sopAvg < 85) dec.push([sopAvg < 70 ? 'danger' : 'warn', 'shield-virus', 'متوسط الالتزام بالإجراءات ' + nf(sopAvg, 0) + '% (المستهدف 85% فأكثر)', topFails.length ? 'ركّز على: ' + topFails.slice(0, 3).map(function (f) { return f.t; }).join(' · ') : 'راجع البنود غير المطابقة مع الفريق.', 'sop']);
  topFails.filter(function (f) { return f.r === 'h' && f.n >= 2; }).slice(0, 2).forEach(function (f) { dec.push(['danger', 'exclamation-triangle', 'بند عالي الخطورة يتكرر: ' + f.t + ' (' + f.n + ' مرات)', (f.a ? 'إجراء فوري: ' + f.a + ' ' : '') + (f.c ? 'التوصية: ' + f.c : ''), 'sop']); });
  // الاستلام والتسليم
  const cashDiff = hands.reduce(function (s, x) { return s + Math.abs(+((x.data.cash || {}).diff) || 0); }, 0);
  const diffCount = hands.filter(function (x) { return Math.abs(+((x.data.cash || {}).diff) || 0) > 0.009; }).length;
  if (diffCount) dec.push([diffCount > 2 ? 'danger' : 'warn', 'money-bill-wave', 'فروقات نقدية في ' + diffCount + ' عملية تسليم (إجمالي ' + money(cashDiff) + ')', 'افرض العدّ المزدوج عند التسليم واربط الفروقات بالكاشير المسؤول وراجع الخصومات والإلغاءات.', 'hand']);
  const openIssues = hands.filter(function (x) { return (x.data.issues || '').trim() && x.data.status !== 'closed'; });
  if (openIssues.length) dec.push(['info', 'tools', openIssues.length + ' ملاحظات تسليم مفتوحة', 'آخرها: ' + openIssues[0].data.issues.slice(0, 120), 'hand']);
  // الورديات
  let gaps = [], over = [], schedHours = 0, schedCost = 0, todayStaff = 0, todayReq = 0;
  if (sched) {
    const cov = opsCoverage(sched.data.assign || {}, ws);
    gaps = cov.gaps;
    const tIdx = Math.round((new Date(today + 'T12:00:00') - new Date(ws + 'T12:00:00')) / 864e5);
    cov.rows.forEach(function (row) { todayStaff += row.days[tIdx] ? row.days[tIdx].has : 0; todayReq += row.days[tIdx] ? row.days[tIdx].req : 0; });
    emps.forEach(function (e) { const hrs = opsEmpWeekHours(sched.data.assign[e.id]); schedHours += hrs; schedCost += hrs * opsHourly(e); if (hrs > c.maxWeekHours) over.push([e, hrs]); });
    if (gaps.length) dec.push(['danger', 'user-clock', 'نقص تغطية في ' + gaps.length + ' وردية هذا الأسبوع', gaps.slice(0, 3).map(function (g) { return g.day + ' · ' + g.shift + ' · ' + g.dept + ' (ينقص ' + g.miss + ')'; }).join(' — '), 'sched']);
    if (over.length) dec.push(['warn', 'business-time', over.length + ' موظف تتجاوز ساعاته ' + c.maxWeekHours + ' ساعة أسبوعياً', over.slice(0, 3).map(function (o) { return o[0].title + ' (' + nf(o[1], 0) + ' س)'; }).join('، ') + ' — وزّع الساعات لتجنب الإرهاق والعمل الإضافي.', 'sched']);
  } else if (emps.length) dec.push(['warn', 'calendar-week', 'لم يُعدّ جدول ورديات لهذا الأسبوع', 'استخدم «توزيع تلقائي» ثم عدّل ما يلزم — الجدول يكشف النقص والتكلفة فوراً.', 'sched']);
  // العمالة
  const wages = emps.reduce(function (s, e) { return s + (+e.data.wage || 0); }, 0);
  let laborPct = null;
  if (ins && ins.totals.sales > 0 && wages > 0) {
    laborPct = wages / (ins.totals.sales / 30 * 30) * 100;
    if (laborPct > c.targetLabor + 5) dec.push(['danger', 'percentage', 'تكلفة العمالة ' + nf(laborPct, 1) + '% من المبيعات (المستهدف ' + c.targetLabor + '%)', 'خفّض ساعات الأوقات الهادئة أو زد المبيعات في الذروة. عدد الموظفين الأمثل تقريباً: ' + Math.max(1, Math.round(ins.totals.sales * c.targetLabor / 100 / (wages / emps.length))) + '.', 'labor']);
    else if (laborPct < c.targetLabor - 5) dec.push(['info', 'percentage', 'تكلفة العمالة ' + nf(laborPct, 1) + '% أقل من المستهدف', 'تأكد من أن الضغط على الفريق لا يؤثر على الخدمة وزمن التحضير — يمكنك تدعيم أوقات الذروة.', 'labor']);
    const peak = opsPeaks(ins, 3);
    if (peak.length) dec.push(['info', 'chart-line', 'أوقات الذروة: ' + peak.map(function (p) { return p.day + ' ' + p.hr + ':00'; }).join('، '), 'جدول أكبر عدد من الموظفين في هذه الأوقات وقلل في أهدأ الساعات.', 'labor']);
  } else if (!wages && emps.length) dec.push(['info', 'coins', 'أدخل رواتب الموظفين لتحليل تكلفة العمالة', 'من تبويب «فريق العمل» أضف الراتب الشهري لكل موظف.', 'emps']);
  if (!emps.length) dec.push(['warn', 'users', 'أضف فريق العمل', 'أضف الموظفين أو استوردهم من حسابات الموظفين لتفعيل الورديات والتقييم وتحليل العمالة.', 'emps']);
  // التقييم
  const evAvg = evals.length ? evals.reduce(function (s, x) { return s + (+x.score || 0); }, 0) / evals.length : null;
  const low = evals.filter(function (x) { return +x.score < 60; }), top = evals.slice().sort(function (a, b) { return b.score - a.score; })[0];
  if (emps.length && evals.length < emps.length) dec.push(['info', 'star-half-alt', 'تقييم هذا الشهر: ' + evals.length + ' من ' + emps.length + ' موظف', 'أكمل التقييم الشهري لربط الأداء بالحوافز وخطط التدريب.', 'eval']);
  if (low.length) dec.push(['warn', 'user-graduate', low.length + ' موظف بأداء أقل من 60%', low.map(function (x) { const e = opsEmp(x.staffId); return e ? e.title : x.title; }).join('، ') + ' — ضع خطة تدريب ومتابعة أسبوعية.', 'eval']);
  if (top && +top.score >= 85) { const e = opsEmp(top.staffId); dec.push(['ok', 'award', 'الموظف المتميز هذا الشهر: ' + (e ? e.title : top.title) + ' (' + nf(top.score, 0) + '%)', 'كافئ الأداء المتميز لرفع الحافز وثبات الفريق.', 'eval']); }
  if (!dec.length) dec.push(['ok', 'check-circle', 'التشغيل مستقر', 'لا توجد مؤشرات تتطلب تدخلاً حالياً.', '']);
  OPS.lastDec = dec;
  el.innerHTML = kpis([
    ['الالتزام بـ SOP (30 يوم)', sopAvg === null ? '—' : nf(sopAvg, 0) + '%', runs.length + ' تدقيق', sopAvg === null ? '' : opsRate(sopAvg)[1]],
    ['عمليات التسليم (14 يوم)', nf(hands.length, 0), diffCount ? diffCount + ' بفروقات' : 'بدون فروقات', diffCount ? '#f59e0b' : ''],
    ['التغطية اليوم', sched ? '<span dir="ltr">' + todayStaff + ' / ' + todayReq + '</span>' : '—', gaps.length ? gaps.length + ' نقص هذا الأسبوع' : 'الأسبوع مغطّى', gaps.length ? '#ef4444' : ''],
    ['تكلفة العمالة', laborPct === null ? '—' : nf(laborPct, 1) + '%', 'المستهدف ' + c.targetLabor + '%', laborPct === null ? '' : (laborPct > c.targetLabor + 5 ? '#ef4444' : laborPct < c.targetLabor - 5 ? '#60a5fa' : '#10b981')],
    ['ساعات الأسبوع', nf(schedHours, 0), money(schedCost)],
    ['متوسط التقييم', evAvg === null ? '—' : nf(evAvg, 0) + '%', evals.length + ' تقييم هذا الشهر', evAvg === null ? '' : opsRate(evAvg)[1]]]) +
    '<div class="ops-head-row"><h4><i class="fas fa-lightbulb"></i> قرارات وتوصيات مقترحة</h4>' + rptButtons('opsDashRpt') + '</div>' +
    '<div class="ops-decs">' + dec.map(function (d) { return '<div class="ops-dec ' + d[0] + '"' + (d[4] ? ' data-go="' + d[4] + '"' : '') + '><i class="fas fa-' + d[1] + '"></i><div><b>' + h(d[2]) + '</b><p>' + h(d[3]) + '</p></div>' + (d[4] ? '<span class="ops-go"><i class="fas fa-chevron-left"></i></span>' : '') + '</div>'; }).join('') + '</div>' +
    '<div class="biz-grid-2"><div class="biz-card"><h4><i class="fas fa-exclamation-circle"></i> أكثر البنود مخالفة (30 يوم)</h4>' +
    bTable([{ label: 'البند', r: function (f) { return h(f.t); } }, { label: 'الخطورة', r: function (f) { return opsRiskBadge(f.r); } }, { label: 'التكرار', num: true, r: function (f) { return f.n; } }], topFails, { empty: 'لا توجد مخالفات مسجلة' }) +
    '</div><div class="biz-card"><h4><i class="fas fa-history"></i> آخر عمليات التدقيق</h4>' +
    bTable([{ label: 'التاريخ', r: function (x) { return dOnly(x.period); } }, { label: 'النموذج', r: function (x) { return h(x.title); } }, { label: 'النتيجة', r: function (x) { return opsScoreBadge(x.score); } }], runs.slice(0, 6), { empty: 'لا يوجد تدقيق بعد' }) + '</div></div>';
  el.querySelectorAll('[data-go]').forEach(function (x) { x.onclick = function () { OPS.go(x.dataset.go); }; });
  rptBind(el, 'opsDashRpt', function () {
    return { title: 'تقرير قرارات التشغيل والفريق', subtitle: 'ملخص الالتزام بالإجراءات والورديات والعمالة والأداء', period: 'آخر 30 يوماً', kpis: [
      ['الالتزام بـ SOP', sopAvg === null ? '—' : nf(sopAvg, 0) + '%', runs.length + ' تدقيق'], ['عمليات التسليم', nf(hands.length, 0), diffCount + ' بفروقات'], ['نقص التغطية', nf(gaps.length, 0), 'هذا الأسبوع'],
      ['تكلفة العمالة', laborPct === null ? '—' : nf(laborPct, 1) + '%', 'المستهدف ' + c.targetLabor + '%'], ['ساعات الأسبوع', nf(schedHours, 0), money(schedCost)], ['متوسط التقييم', evAvg === null ? '—' : nf(evAvg, 0) + '%', '']],
      sections: [{ title: 'القرارات والتوصيات', table: { headers: ['الأولوية', 'المؤشر', 'التوصية'], rows: dec.map(function (d) { return [{ danger: 'عاجل', warn: 'مهم', info: 'للمتابعة', ok: 'إيجابي' }[d[0]], d[2], d[3]]; }) } },
        { title: 'أكثر البنود مخالفة', table: { headers: ['البند', 'الخطورة', 'التكرار', 'الإجراء الفوري', 'التوصية'], rows: topFails.map(function (f) { return [f.t, OPS_RISK[f.r][0], f.n, f.a, f.c]; }) } },
        { title: 'نقص التغطية في جدول الأسبوع', table: { headers: ['اليوم', 'الوردية', 'القسم', 'المطلوب', 'المجدول', 'النقص'], rows: gaps.map(function (g) { return [g.day, g.shift, g.dept, g.req, g.has, g.miss]; }), empty: 'لا يوجد نقص' } }], signature: true };
  });
}
function opsPeaks(ins, n) {
  const cnt = {}; (ins.grid || []).forEach(function (g) { cnt[g.dow + '_' + g.hr] = g.n; });
  return Object.keys(cnt).map(function (k) { const p = k.split('_'); return { day: OPS_DAYS[+p[0]], hr: +p[1], n: cnt[k] }; }).sort(function (a, b) { return b.n - a.n; }).slice(0, n);
}

// ============================================================
// SOP والتدقيق
// ============================================================
function opsTplIcon(t) { return t.data.icon || { audit: 'shield-virus', opening: 'door-open', closing: 'door-closed', handover: 'people-arrows' }[t.data.cat] || 'clipboard-list'; }
function opsTplCount(t) { return (t.data.sections || []).reduce(function (s, x) { return s + (x.items || []).length; }, 0); }
async function opsSop(el) {
  const full = canP('ops');
  el.innerHTML = '<div class="ops-head-row"><h4><i class="fas fa-folder-open"></i> نماذج الإجراءات القياسية</h4><div class="ops-acts">' + (full ? '<button class="btn btn-primary btn-sm" data-a="new"><i class="fas fa-plus"></i> نموذج جديد</button><button class="btn btn-outline btn-sm" data-a="restore"><i class="fas fa-undo"></i> استعادة النماذج الافتراضية</button>' : '') + '</div></div>' +
    '<div class="ops-tpls">' + (OPS.tpls.length ? OPS.tpls.map(function (t) {
      return '<div class="ops-tpl"><div class="ops-tpl-h"><i class="fas fa-' + opsTplIcon(t) + '"></i><div><b>' + h(t.title) + '</b><small>' + h(OPS_TPL_CATS[t.data.cat] || '') + ' · ' + (t.data.sections || []).length + ' أقسام · ' + opsTplCount(t) + ' بنداً</small></div></div>' +
        (t.data.desc ? '<p>' + h(t.data.desc) + '</p>' : '') + '<div class="ops-tpl-f"><button class="btn btn-primary btn-sm" data-run="' + t.id + '"><i class="fas fa-play"></i> بدء التدقيق</button>' +
        '<button class="btn btn-outline btn-sm" data-blank="' + t.id + '" title="طباعة نموذج ورقي فارغ"><i class="fas fa-print"></i> نموذج ورقي</button>' +
        (full ? '<button class="btn btn-outline btn-sm" data-edit="' + t.id + '" title="تعديل"><i class="fas fa-pen"></i></button><button class="btn btn-outline btn-sm" data-del="' + t.id + '" title="حذف"><i class="fas fa-trash-alt"></i></button>' : '') + '</div></div>';
    }).join('') : '<div class="empty-state">لا توجد نماذج بعد</div>') + '</div>' +
    '<div class="ops-head-row"><h4><i class="fas fa-history"></i> سجل التدقيق</h4></div>' + dateRangeBar('opsSopR', daysAgo(29), isoLocal()) + '<div id="opsSopList"></div>';
  const list = el.querySelector('#opsSopList');
  const load = async function (f) {
    list.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i></div>';
    const runs = await opsL('sop_run', f);
    const avg = runs.length ? runs.reduce(function (s, x) { return s + (+x.score || 0); }, 0) / runs.length : 0;
    const hf = runs.reduce(function (s, x) { return s + ((x.data.stats || {}).highFail || 0); }, 0);
    list.innerHTML = kpis([['عدد عمليات التدقيق', nf(runs.length, 0)], ['متوسط الالتزام', runs.length ? nf(avg, 0) + '%' : '—', '', runs.length ? opsRate(avg)[1] : ''], ['مخالفات عالية الخطورة', nf(hf, 0), '', hf ? '#ef4444' : ''],
      ['أفضل نتيجة', runs.length ? nf(Math.max.apply(null, runs.map(function (x) { return +x.score || 0; })), 0) + '%' : '—']]) + rptButtons('opsSopRpt') +
      bTable([{ label: 'التاريخ', r: function (x) { return dOnly(x.period) + (x.data.shift ? '<div class="muted" style="font-size:.72rem">' + h(x.data.shift) + '</div>' : ''); } }, { label: 'النموذج', r: function (x) { return h(x.title); } },
        { label: 'المسؤول', r: function (x) { return h(x.data.responsible || x.createdBy); } }, { label: 'النتيجة', r: function (x) { return opsScoreBadge(x.score); } },
        { label: 'غير مطابق', num: true, r: function (x) { const s = x.data.stats || {}; return (s.fail || 0) + (s.highFail ? ' <span style="color:#ef4444">(' + s.highFail + ' مرتفع)</span>' : ''); } },
        { label: '', r: function (x) { return '<div class="ops-row-acts"><button class="btn btn-outline btn-sm" data-view="' + x.id + '" title="عرض وتعديل"><i class="fas fa-eye"></i></button><button class="btn btn-outline btn-sm" data-pr="' + x.id + '" title="طباعة"><i class="fas fa-print"></i></button>' + (full ? '<button class="btn btn-outline btn-sm" data-rm="' + x.id + '" title="حذف"><i class="fas fa-trash-alt"></i></button>' : '') + '</div>'; } }], runs, { empty: 'لا يوجد تدقيق في هذه الفترة', emptyIcon: 'clipboard-check' });
    list.onclick = async function (e) {
      const v = e.target.closest('[data-view]'), p = e.target.closest('[data-pr]'), rm = e.target.closest('[data-rm]');
      if (v) opsRunModal(null, runs.find(function (x) { return x.id === v.dataset.view; }), function () { load(f); });
      if (p) opsPrintRun(runs.find(function (x) { return x.id === p.dataset.pr; }));
      if (rm && await opsD(rm.dataset.rm, 'سجل التدقيق')) load(f);
    };
    rptBind(list, 'opsSopRpt', function () {
      return { title: 'تقرير الالتزام بإجراءات التشغيل SOP', period: rptPeriod(f), kpis: [['عمليات التدقيق', nf(runs.length, 0)], ['متوسط الالتزام', nf(avg, 0) + '%'], ['مخالفات عالية الخطورة', nf(hf, 0)]],
        sections: [{ title: 'سجل التدقيق', table: { headers: ['التاريخ', 'النموذج', 'الوردية', 'المسؤول', 'النتيجة %', 'غير مطابق', 'عالي الخطورة'], pct: [4], rows: runs.map(function (x) { const s = x.data.stats || {}; return [dOnly(x.period), x.title, x.data.shift || '', x.data.responsible || x.createdBy, +x.score || 0, s.fail || 0, s.highFail || 0]; }) } }], signature: true };
    });
  };
  bindRange(el, 'opsSopR', load);
  load({ from: daysAgo(29), to: isoLocal() });
  el.querySelector('.ops-tpls').onclick = async function (e) {
    const g = function (a) { const b = e.target.closest('[data-' + a + ']'); return b ? OPS.tpls.find(function (t) { return t.id === b.dataset[a]; }) : null; };
    let t;
    if ((t = g('run'))) opsRunModal(t, null, function () { opsSop(el); });
    else if ((t = g('blank'))) opsPrintBlank(t);
    else if ((t = g('edit'))) opsTplEdit(t, function () { opsSop(el); });
    else if ((t = g('del')) && await opsD(t.id, 'النموذج «' + t.title + '»')) { OPS.tpls = await opsL('sop_tpl'); opsSop(el); }
  };
  const top = el.querySelector('.ops-acts');
  if (top) top.onclick = async function (e) {
    const a = e.target.closest('[data-a]'); if (!a) return;
    if (a.dataset.a === 'new') opsTplEdit({ title: '', data: { cat: 'custom', desc: '', sections: [{ id: opsUid(), title: 'القسم الأول', items: [{ id: opsUid(), t: '', r: 'm', a: '', c: '' }] }] } }, function () { opsSop(el); });
    if (a.dataset.a === 'restore' && await bConfirm('ستُضاف النماذج الافتراضية (سلامة الغذاء، الافتتاح، الإغلاق، الاستلام والتسليم) كنسخ جديدة دون حذف نماذجك الحالية.')) { showLoading(); try { await opsSeed(); } finally { hideLoading(); } opsSop(el); }
  };
}

// محرر النموذج
function opsTplEdit(tpl, done) {
  const M = JSON.parse(JSON.stringify(tpl));
  M.data.sections = M.data.sections || [];
  const draw = function (m) {
    const box = m.$('#opsTplSecs');
    box.innerHTML = M.data.sections.map(function (s, si) {
      return '<div class="ops-ed-sec" data-si="' + si + '"><div class="ops-ed-sh"><span class="ops-ed-n">' + (si + 1) + '</span><input data-f="stitle" value="' + h(s.title) + '" placeholder="اسم القسم">' +
        '<button class="btn btn-outline btn-sm" data-ed="sup" title="أعلى"><i class="fas fa-arrow-up"></i></button><button class="btn btn-outline btn-sm" data-ed="sdel" title="حذف القسم"><i class="fas fa-trash-alt"></i></button></div>' +
        s.items.map(function (i, ii) {
          return '<div class="ops-ed-item" data-ii="' + ii + '"><div class="ops-ed-ir"><textarea data-f="t" rows="2" placeholder="نص البند">' + h(i.t) + '</textarea><select data-f="r">' + Object.keys(OPS_RISK).map(function (k) { return '<option value="' + k + '"' + (i.r === k ? ' selected' : '') + '>' + OPS_RISK[k][0] + '</option>'; }).join('') + '</select>' +
            '<button class="btn btn-outline btn-sm" data-ed="idel" title="حذف البند"><i class="fas fa-times"></i></button></div>' +
            '<div class="ops-ed-ir2"><input data-f="a" value="' + h(i.a) + '" placeholder="الإجراء الفوري عند عدم المطابقة"><input data-f="c" value="' + h(i.c) + '" placeholder="التوصية والتحسين"></div></div>';
        }).join('') + '<button class="btn btn-outline btn-sm" data-ed="iadd"><i class="fas fa-plus"></i> إضافة بند</button></div>';
    }).join('');
  };
  const sync = function (m) {
    M.title = m.$('[data-k=title]').value.trim(); M.data.cat = m.$('[data-k=cat]').value; M.data.desc = m.$('[data-k=desc]').value.trim();
    m.$$('.ops-ed-sec').forEach(function (se) {
      const s = M.data.sections[+se.dataset.si]; s.title = se.querySelector('[data-f=stitle]').value.trim();
      se.querySelectorAll('.ops-ed-item').forEach(function (ie) { const i = s.items[+ie.dataset.ii]; ['t', 'r', 'a', 'c'].forEach(function (f) { i[f] = ie.querySelector('[data-f=' + f + ']').value.trim(); }); });
    });
  };
  bModal({ title: tpl.id ? 'تعديل النموذج' : 'نموذج SOP جديد', icon: 'clipboard-list', xwide: true, print: false,
    body: bForm([{ k: 'title', label: 'اسم النموذج', req: true }, { k: 'cat', label: 'النوع', type: 'select', options: Object.keys(OPS_TPL_CATS).map(function (k) { return [k, OPS_TPL_CATS[k]]; }) },
      { k: 'desc', label: 'وصف مختصر', full: true }], { title: M.title, cat: M.data.cat, desc: M.data.desc }) +
      '<div class="biz-sec">الأقسام والبنود <small class="muted">— حدد الخطورة لكل بند؛ النتيجة تُحسب بوزن (مرتفع 3 · متوسط 2 · منخفض 1)</small></div><div id="opsTplSecs"></div>' +
      '<button class="btn btn-outline btn-sm" data-act="sadd" style="margin-top:8px"><i class="fas fa-layer-group"></i> إضافة قسم</button>',
    foot: '<button class="btn btn-cancel" data-x>إلغاء</button><button class="btn btn-primary" data-act="save"><i class="fas fa-check"></i> حفظ النموذج</button>',
    onOpen: function (m) {
      draw(m);
      m.$('#opsTplSecs').addEventListener('click', function (e) {
        const b = e.target.closest('[data-ed]'); if (!b) return; e.preventDefault(); sync(m);
        const si = +b.closest('.ops-ed-sec').dataset.si, s = M.data.sections[si];
        if (b.dataset.ed === 'iadd') s.items.push({ id: opsUid(), t: '', r: 'm', a: '', c: '' });
        if (b.dataset.ed === 'idel') s.items.splice(+b.closest('.ops-ed-item').dataset.ii, 1);
        if (b.dataset.ed === 'sdel') M.data.sections.splice(si, 1);
        if (b.dataset.ed === 'sup' && si > 0) { M.data.sections.splice(si, 1); M.data.sections.splice(si - 1, 0, s); }
        draw(m);
      });
    },
    actions: {
      sadd: function (m) { sync(m); M.data.sections.push({ id: opsUid(), title: '', items: [{ id: opsUid(), t: '', r: 'm', a: '', c: '' }] }); draw(m); },
      save: async function (m, btn) {
        sync(m);
        if (!M.title) { showToast('اسم النموذج مطلوب', true); return; }
        M.data.sections = M.data.sections.map(function (s) { s.items = s.items.filter(function (i) { return i.t; }); return s; }).filter(function (s) { return s.items.length; });
        if (!M.data.sections.length) { showToast('أضف بنداً واحداً على الأقل', true); return; }
        btn.disabled = true;
        try { await opsS('sop_tpl', { id: M.id, title: M.title, data: M.data }); OPS.tpls = await opsL('sop_tpl'); m.close(); if (done) done(); } catch (e) { /* */ } finally { btn.disabled = false; }
      } } });
}

// حساب نتيجة التدقيق
function opsCalc(sections, results) {
  let tw = 0, okw = 0, ok = 0, fail = 0, na = 0, todo = 0, highFail = 0;
  sections.forEach(function (s) { s.items.forEach(function (i) {
    const r = results[i.id], w = OPS_RISK[i.r] ? OPS_RISK[i.r][2] : 2;
    if (!r || !r.s) { todo++; return; }
    if (r.s === 'na') { na++; return; }
    tw += w; if (r.s === 'ok') { okw += w; ok++; } else { fail++; if (i.r === 'h') highFail++; }
  }); });
  return { score: tw ? Math.round(okw / tw * 1000) / 10 : 0, ok: ok, fail: fail, na: na, todo: todo, highFail: highFail };
}
function opsRunModal(tpl, run, done) {
  const sections = run ? run.data.sections : JSON.parse(JSON.stringify(tpl.data.sections || []));
  const results = run ? JSON.parse(JSON.stringify(run.data.results || {})) : {};
  const title = run ? run.title : tpl.title, cat = run ? run.data.cat : tpl.data.cat;
  const canEdit = !run || canP('ops') || run.createdBy === rptActor();
  const shifts = (OPS.types || []).map(function (t) { return [t.title, t.title]; });
  const head = [{ k: 'period', label: 'التاريخ', type: 'date', def: isoLocal() }, { k: 'shift', label: 'الوردية', type: shifts.length ? 'select' : 'text', options: [['', '—']].concat(shifts) },
    { k: 'responsible', label: 'المسؤول عن التدقيق', def: rptActor() }, { k: 'manager', label: 'المدير المعتمد' }];
  const body = bForm(head, run ? { period: run.period, shift: run.data.shift, responsible: run.data.responsible, manager: run.data.manager } : {}) +
    '<div class="ops-run-bar" id="opsRunBar"></div>' +
    sections.map(function (s, si) {
      return '<div class="ops-run-sec"><div class="ops-run-st"><span>' + (si + 1) + '</span> ' + h(s.title) + '<button class="btn btn-outline btn-sm" data-allok="' + si + '" title="تحديد كل البنود مطابقة"><i class="fas fa-check-double"></i> الكل مطابق</button></div>' +
        s.items.map(function (i) {
          const r = results[i.id] || {};
          return '<div class="ops-run-item ' + (r.s || '') + '" data-id="' + i.id + '"><div class="ops-run-t"><span>' + h(i.t) + '</span>' + opsRiskBadge(i.r) + '</div>' +
            '<div class="ops-run-ctl"><div class="ops-tri">' + [['ok', 'check', 'مطابق'], ['fail', 'times', 'غير مطابق'], ['na', 'minus', 'لا ينطبق']].map(function (b) { return '<button type="button" class="' + b[0] + (r.s === b[0] ? ' on' : '') + '" data-s="' + b[0] + '"><i class="fas fa-' + b[1] + '"></i> ' + b[2] + '</button>'; }).join('') + '</div>' +
            '<input class="ops-note" placeholder="ملاحظة" value="' + h(r.n || '') + '"></div>' +
            '<div class="ops-rec">' + (i.a ? '<div><b>الإجراء الفوري:</b> ' + h(i.a) + '</div>' : '') + (i.c ? '<div><b>التوصية:</b> ' + h(i.c) + '</div>' : '') + '</div></div>';
        }).join('') + '</div>';
    }).join('') + bForm([{ k: 'notes', label: 'ملاحظات عامة وخطة المتابعة', type: 'textarea', full: true }], { notes: run ? run.data.notes : '' });
  bModal({ title: title, sub: run ? 'تدقيق بتاريخ ' + dOnly(run.period) : (OPS_TPL_CATS[cat] || 'تدقيق'), icon: 'clipboard-check', xwide: true, print: false, body: body,
    foot: '<button class="btn btn-cancel" data-x>إغلاق</button>' + (run ? '<button class="btn btn-outline" data-act="print"><i class="fas fa-print"></i> طباعة</button>' : '') + (canEdit ? '<button class="btn btn-primary" data-act="save"><i class="fas fa-check"></i> حفظ التدقيق</button>' : ''),
    onOpen: function (m) {
      const bar = function () {
        const st = opsCalc(sections, results), rt = opsRate(st.score);
        m.$('#opsRunBar').innerHTML = '<div class="ops-run-score" style="--c:' + rt[1] + '"><b>' + nf(st.score, 0) + '%</b><span>' + rt[0] + '</span></div><div class="ops-run-meta"><span class="ok"><i class="fas fa-check"></i> ' + st.ok + ' مطابق</span><span class="fail"><i class="fas fa-times"></i> ' + st.fail + ' غير مطابق' + (st.highFail ? ' (' + st.highFail + ' مرتفع)' : '') + '</span><span><i class="fas fa-minus"></i> ' + st.na + ' لا ينطبق</span><span class="todo"><i class="fas fa-hourglass-half"></i> ' + st.todo + ' متبقٍ</span></div><div class="ops-run-prog"><i style="width:' + Math.round((1 - st.todo / Math.max(1, st.ok + st.fail + st.na + st.todo)) * 100) + '%"></i></div>';
      };
      bar();
      m.el.addEventListener('click', function (e) {
        const b = e.target.closest('[data-s]'), all = e.target.closest('[data-allok]');
        if (b) { const it = b.closest('.ops-run-item'), id = it.dataset.id; results[id] = results[id] || {}; results[id].s = results[id].s === b.dataset.s ? '' : b.dataset.s;
          it.className = 'ops-run-item ' + (results[id].s || ''); it.querySelectorAll('[data-s]').forEach(function (x) { x.classList.toggle('on', x.dataset.s === results[id].s); }); bar(); }
        if (all) { sections[+all.dataset.allok].items.forEach(function (i) { results[i.id] = results[i.id] || {}; if (!results[i.id].s) results[i.id].s = 'ok'; const it = m.el.querySelector('.ops-run-item[data-id="' + i.id + '"]'); it.className = 'ops-run-item ' + results[i.id].s; it.querySelectorAll('[data-s]').forEach(function (x) { x.classList.toggle('on', x.dataset.s === results[i.id].s); }); }); bar(); }
      });
      m.el.addEventListener('input', function (e) { if (e.target.classList.contains('ops-note')) { const id = e.target.closest('.ops-run-item').dataset.id; results[id] = results[id] || {}; results[id].n = e.target.value; } });
    },
    actions: {
      print: function () { opsPrintRun(run); },
      save: async function (m, btn) {
        const f = readForm(m.el, head.concat([{ k: 'notes', type: 'textarea' }]));
        if (!f.period) { showToast('التاريخ مطلوب', true); return; }
        const st = opsCalc(sections, results);
        if (st.ok + st.fail === 0) { showToast('قيّم بنداً واحداً على الأقل', true); return; }
        if (st.todo && !(await bConfirm('يوجد ' + st.todo + ' بنداً دون تقييم ولن تُحسب في النتيجة. هل تريد الحفظ؟'))) return;
        btn.disabled = true;
        try {
          const row = await opsS('sop_run', { id: run && run.id, period: f.period, title: title, score: st.score, data: { tplId: run ? run.data.tplId : tpl.id, cat: cat, shift: f.shift, responsible: f.responsible, manager: f.manager, notes: f.notes, sections: sections, results: results, stats: st } });
          m.close(); if (done) done();
          if (st.fail && await bConfirm('تم حفظ التدقيق بنتيجة ' + nf(st.score, 0) + '% مع ' + st.fail + ' بنود غير مطابقة. هل تريد طباعة التقرير مع الإجراءات التصحيحية؟', 'طباعة التقرير')) opsPrintRun(row);
        } catch (e) { /* */ } finally { btn.disabled = false; }
      } } });
}
function opsSignHtml(labels) { return '<table class="sign"><tr>' + labels.map(function (l) { return '<td>' + h(l) + '</td>'; }).join('') + '</tr></table>'; }
function opsPrintRun(run) {
  if (!run) return;
  const res = run.data.results || {}, st = run.data.stats || opsCalc(run.data.sections || [], res), lbl = { ok: 'مطابق', fail: 'غير مطابق', na: 'لا ينطبق' };
  const failRows = [];
  const secs = (run.data.sections || []).map(function (s) {
    return { title: s.title, table: { headers: ['#', 'البند', 'الخطورة', 'النتيجة', 'ملاحظات'], rows: s.items.map(function (i, n) { const r = res[i.id] || {}; if (r.s === 'fail') failRows.push([s.title, i.t, OPS_RISK[i.r][0], i.a, i.c, r.n || '']); return [n + 1, i.t, OPS_RISK[i.r][0], lbl[r.s] || 'لم يُقيّم', r.n || '']; }) } };
  });
  const rt = opsRate(run.score);
  rptPrint({ title: 'تقرير تدقيق: ' + run.title, subtitle: OPS_TPL_CATS[run.data.cat] || '', period: dOnly(run.period) + (run.data.shift ? ' · ' + run.data.shift : ''),
    kpis: [['نتيجة الالتزام', nf(run.score, 0) + '%', rt[0]], ['مطابق', nf(st.ok, 0)], ['غير مطابق', nf(st.fail, 0), st.highFail ? st.highFail + ' عالي الخطورة' : ''], ['المسؤول', h(run.data.responsible || run.createdBy)]],
    sections: [{ title: 'الإجراءات التصحيحية المطلوبة', intro: failRows.length ? 'البنود غير المطابقة مرتبة حسب الأقسام مع الإجراء الفوري والتوصية' : 'لا توجد بنود غير مطابقة — أداء ممتاز', table: failRows.length ? { headers: ['القسم', 'البند', 'الخطورة', 'الإجراء الفوري', 'التوصية', 'الملاحظة'], rows: failRows } : null }].concat(secs).concat(run.data.notes ? [{ title: 'ملاحظات عامة وخطة المتابعة', html: '<p>' + h(run.data.notes).replace(/\n/g, '<br>') + '</p>' }] : []),
    bodyHtml: opsSignHtml(['المدقق: ' + (run.data.responsible || ''), 'المدير المعتمد: ' + (run.data.manager || ''), 'الختم']) });
}
function opsPrintBlank(t) {
  rptPrint({ title: t.title, subtitle: 'نموذج ورقي للتعبئة — ' + (OPS_TPL_CATS[t.data.cat] || ''),
    bodyHtml: '<table class="t"><tr><td style="width:25%">التاريخ: ..................</td><td style="width:25%">الوردية: ..................</td><td style="width:25%">الفرع: ..................</td><td>المسؤول: ..................</td></tr></table>' +
      (t.data.sections || []).map(function (s, si) {
        return '<h2 class="st">' + (si + 1) + '. ' + h(s.title) + '</h2><table class="t"><thead><tr><th style="width:4%">#</th><th>البند</th><th style="width:9%">الخطورة</th><th style="width:8%">مطابق</th><th style="width:9%">غير مطابق</th><th style="width:8%">لا ينطبق</th><th style="width:20%">ملاحظات</th></tr></thead><tbody>' +
          s.items.map(function (i, n) { return '<tr><td>' + (n + 1) + '</td><td>' + h(i.t) + '</td><td>' + OPS_RISK[i.r][0] + '</td><td style="text-align:center">☐</td><td style="text-align:center">☐</td><td style="text-align:center">☐</td><td></td></tr>'; }).join('') + '</tbody></table>';
      }).join('') + '<h2 class="st">الإجراءات التصحيحية وخطة المتابعة</h2><table class="t"><tbody>' + '<tr><td style="height:26px"></td></tr>'.repeat(4) + '</tbody></table>' + opsSignHtml(['توقيع المدقق', 'توقيع المدير', 'الختم']) });
}

// ============================================================
// الاستلام والتسليم
// ============================================================
function opsHandTpl() { return (OPS.tpls || []).find(function (t) { return t.data.cat === 'handover'; }); }
async function opsHand(el) {
  const full = canP('ops');
  el.innerHTML = '<div class="ops-head-row"><h4><i class="fas fa-people-arrows"></i> الاستلام والتسليم بين الورديات</h4><div class="ops-acts"><button class="btn btn-primary btn-sm" data-a="new"><i class="fas fa-plus"></i> تسليم وردية جديد</button><button class="btn btn-outline btn-sm" data-a="blank"><i class="fas fa-print"></i> نموذج ورقي</button></div></div>' +
    dateRangeBar('opsHandR', daysAgo(13), isoLocal()) + '<div id="opsHandList"></div>';
  const list = el.querySelector('#opsHandList');
  el.querySelector('.ops-acts').onclick = function (e) { const a = e.target.closest('[data-a]'); if (!a) return; if (a.dataset.a === 'new') opsHandModal(null, function () { load(cur); }); else opsPrintHand(null); };
  let cur = { from: daysAgo(13), to: isoLocal() };
  const load = async function (f) {
    cur = f; list.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i></div>';
    const rows = await opsL('handover', f);
    const diff = rows.reduce(function (s, x) { return s + (+((x.data.cash || {}).diff) || 0); }, 0);
    list.innerHTML = kpis([['عمليات التسليم', nf(rows.length, 0)], ['متوسط اكتمال البنود', rows.length ? nf(rows.reduce(function (s, x) { return s + (+x.score || 0); }, 0) / rows.length, 0) + '%' : '—'],
      ['صافي فروقات النقد', money(diff), '', Math.abs(diff) > 0.009 ? '#f59e0b' : ''], ['ملاحظات مفتوحة', nf(rows.filter(function (x) { return (x.data.issues || '').trim() && x.data.status !== 'closed'; }).length, 0)]]) + rptButtons('opsHandRpt') +
      bTable([{ label: 'التاريخ', r: function (x) { return dOnly(x.period) + (x.data.time ? ' <span class="muted">' + h(x.data.time) + '</span>' : ''); } }, { label: 'الوردية', r: function (x) { return h(x.data.shift || '—'); } },
        { label: 'المسلّم ← المستلم', r: function (x) { return h(x.data.from || '—') + ' <i class="fas fa-arrow-left" style="opacity:.5"></i> ' + h(x.data.to || '—'); } },
        { label: 'فرق النقد', num: true, r: function (x) { const d = +((x.data.cash || {}).diff) || 0; return '<span style="color:' + (Math.abs(d) > 0.009 ? '#f59e0b' : '#10b981') + '">' + money(d) + '</span>'; } },
        { label: 'البنود', r: function (x) { return opsScoreBadge(x.score); } }, { label: 'الحالة', r: function (x) { return x.data.status === 'closed' ? '<span class="badge badge-success">مغلق</span>' : (x.data.issues || '').trim() ? '<span class="badge badge-warning">ملاحظات مفتوحة</span>' : '<span class="badge badge-info">مستلم</span>'; } },
        { label: '', r: function (x) { return '<div class="ops-row-acts"><button class="btn btn-outline btn-sm" data-view="' + x.id + '"><i class="fas fa-eye"></i></button><button class="btn btn-outline btn-sm" data-pr="' + x.id + '"><i class="fas fa-print"></i></button>' + (full ? '<button class="btn btn-outline btn-sm" data-rm="' + x.id + '"><i class="fas fa-trash-alt"></i></button>' : '') + '</div>'; } }], rows, { empty: 'لا توجد عمليات تسليم في هذه الفترة', emptyIcon: 'people-arrows' });
    list.onclick = async function (e) {
      const v = e.target.closest('[data-view]'), p = e.target.closest('[data-pr]'), rm = e.target.closest('[data-rm]'), find = function (b) { return rows.find(function (x) { return x.id === b.dataset[Object.keys(b.dataset)[0]]; }); };
      if (v) opsHandModal(find(v), function () { load(cur); });
      if (p) opsPrintHand(find(p));
      if (rm && await opsD(rm.dataset.rm, 'سجل التسليم')) load(cur);
    };
    rptBind(list, 'opsHandRpt', function () {
      return { title: 'سجل الاستلام والتسليم بين الورديات', period: rptPeriod(f), kpis: [['عمليات التسليم', nf(rows.length, 0)], ['صافي فروقات النقد', money(diff)]],
        sections: [{ title: 'السجل', table: { headers: ['التاريخ', 'الوقت', 'الوردية', 'المسلّم', 'المستلم', 'النقد المتوقع', 'النقد الفعلي', 'الفرق', 'البنود %', 'الملاحظات'], money: [5, 6, 7], pct: [8],
          rows: rows.map(function (x) { const c = x.data.cash || {}; return [dOnly(x.period), x.data.time || '', x.data.shift || '', x.data.from || '', x.data.to || '', +c.expected || 0, +c.counted || 0, +c.diff || 0, +x.score || 0, x.data.issues || '']; }) } }], signature: true };
    });
  };
  bindRange(el, 'opsHandR', load); load(cur);
}
function opsHandModal(row, done) {
  const tpl = opsHandTpl(), sections = row ? (row.data.sections || []) : JSON.parse(JSON.stringify((tpl && tpl.data.sections) || []));
  const results = row ? JSON.parse(JSON.stringify(row.data.results || {})) : {};
  const empOpts = [['', '—']].concat(opsActiveEmps().map(function (e) { return [e.title, e.title + ' — ' + (OPS_DEPTS[e.data.dept] || '')]; }));
  const shifts = (OPS.types || []).map(function (t) { return [t.title, t.title + ' (' + t.data.start + ' - ' + t.data.end + ')']; });
  const now = new Date();
  const fields = [{ type: 'section', label: 'بيانات التسليم' }, { k: 'period', label: 'التاريخ', type: 'date', def: isoLocal() }, { k: 'time', label: 'الوقت', type: 'time', def: String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0') },
    { k: 'shift', label: 'الوردية المسلِّمة', type: shifts.length ? 'select' : 'text', options: [['', '—']].concat(shifts) }, { k: 'status', label: 'الحالة', type: 'select', options: [['received', 'تم الاستلام'], ['closed', 'مغلق (عولجت الملاحظات)']] },
    { k: 'from', label: 'المسلِّم (الوردية المنتهية)', type: empOpts.length > 1 ? 'select' : 'text', options: empOpts, req: true }, { k: 'to', label: 'المستلِم (الوردية القادمة)', type: empOpts.length > 1 ? 'select' : 'text', options: empOpts, req: true },
    { type: 'section', label: 'مطابقة النقد' }, { k: 'expected', label: 'النقد المتوقع حسب النظام', type: 'number' }, { k: 'counted', label: 'النقد الفعلي بعد العدّ', type: 'number' },
    { k: 'diff', label: 'الفرق (يُحسب تلقائياً)', type: 'number', ro: true }, { k: 'openOrders', label: 'طلبات مفتوحة/معلقة', type: 'number' }];
  const tail = [{ type: 'section', label: 'الملاحظات' }, { k: 'issues', label: 'ملاحظات وأعطال مفتوحة تحتاج متابعة', type: 'textarea', full: true }, { k: 'shortages', label: 'نواقص المخزون والمواد', type: 'textarea', rows: 2 },
    { k: 'complaints', label: 'شكاوى العملاء وطريقة معالجتها', type: 'textarea', rows: 2 }];
  const v = row ? Object.assign({ period: row.period }, row.data, row.data.cash || {}) : {};
  const items = sections.map(function (s) { return '<div class="ops-run-sec"><div class="ops-run-st">' + h(s.title) + '</div>' + s.items.map(function (i) { const r = results[i.id] || {}; return '<div class="ops-run-item compact ' + (r.s || '') + '" data-id="' + i.id + '"><div class="ops-run-t"><span>' + h(i.t) + '</span></div><div class="ops-tri">' + [['ok', 'check', 'تم'], ['fail', 'times', 'لا']].map(function (b) { return '<button type="button" class="' + b[0] + (r.s === b[0] ? ' on' : '') + '" data-s="' + b[0] + '"><i class="fas fa-' + b[1] + '"></i> ' + b[2] + '</button>'; }).join('') + '</div></div>'; }).join('') + '</div>'; }).join('');
  bModal({ title: row ? 'تسليم وردية — ' + dOnly(row.period) : 'استلام وتسليم وردية', icon: 'people-arrows', xwide: true, print: false,
    body: bForm(fields, v) + (items ? '<div class="biz-sec">بنود التحقق عند الاستلام</div>' + items : '') + bForm(tail, v) + '<p class="muted" style="font-size:.78rem;margin-top:6px"><i class="fas fa-signature"></i> بالحفظ يُعتبر الاستلام موقّعاً إلكترونياً باسم المستخدم الحالي، ويمكن طباعة النموذج للتوقيع اليدوي.</p>',
    foot: '<button class="btn btn-cancel" data-x>إغلاق</button>' + (row ? '<button class="btn btn-outline" data-act="print"><i class="fas fa-print"></i> طباعة</button>' : '') + '<button class="btn btn-primary" data-act="save"><i class="fas fa-check"></i> حفظ وتوقيع الاستلام</button>',
    onOpen: function (m) {
      const calc = function () { const e = parseFloat(m.$('[data-k=expected]').value) || 0, c = parseFloat(m.$('[data-k=counted]').value) || 0; m.$('[data-k=diff]').value = (m.$('[data-k=counted]').value === '' ? 0 : Math.round((c - e) * 100) / 100); };
      m.$('[data-k=expected]').oninput = calc; m.$('[data-k=counted]').oninput = calc; calc();
      m.el.addEventListener('click', function (e) { const b = e.target.closest('[data-s]'); if (!b) return; const it = b.closest('.ops-run-item'), id = it.dataset.id; results[id] = results[id] || {}; results[id].s = results[id].s === b.dataset.s ? '' : b.dataset.s; it.className = 'ops-run-item compact ' + (results[id].s || ''); it.querySelectorAll('[data-s]').forEach(function (x) { x.classList.toggle('on', x.dataset.s === results[id].s); }); });
    },
    actions: {
      print: function () { opsPrintHand(row); },
      save: async function (m, btn) {
        const f = readForm(m.el, fields.concat(tail));
        if (!f.period || !f.from || !f.to) { showToast('حدد التاريخ والمسلِّم والمستلِم', true); return; }
        if (f.from === f.to) { showToast('المسلِّم والمستلِم يجب أن يكونا شخصين مختلفين', true); return; }
        const st = opsCalc(sections, results);
        btn.disabled = true;
        try {
          await opsS('handover', { id: row && row.id, period: f.period, title: 'تسليم ' + (f.shift || 'وردية') + ': ' + f.from + ' ← ' + f.to, score: sections.length ? st.score : null,
            data: { time: f.time, shift: f.shift, status: f.status, from: f.from, to: f.to, cash: { expected: +f.expected || 0, counted: +f.counted || 0, diff: f.counted === '' ? 0 : Math.round(((+f.counted || 0) - (+f.expected || 0)) * 100) / 100 }, openOrders: +f.openOrders || 0,
              issues: f.issues, shortages: f.shortages, complaints: f.complaints, sections: sections, results: results, stats: st, signedBy: rptActor(), signedAt: new Date().toISOString() } });
          m.close(); if (done) done();
        } catch (e) { /* */ } finally { btn.disabled = false; }
      } } });
}
function opsPrintHand(row) {
  const d = row ? row.data : {}, c = d.cash || {}, res = d.results || {};
  const secs = row ? (d.sections || []) : (((opsHandTpl() || {}).data || {}).sections || []);
  const val = function (x) { return row ? h(x === undefined || x === null || x === '' ? '—' : x) : '....................'; };
  rptPrint({ title: 'نموذج الاستلام والتسليم بين الورديات', subtitle: row ? dOnly(row.period) + ' ' + (d.time || '') : 'نموذج ورقي للتعبئة',
    bodyHtml: '<table class="t"><tbody><tr><td style="width:20%"><b>التاريخ</b></td><td>' + (row ? dOnly(row.period) : '....................') + '</td><td style="width:20%"><b>الوقت</b></td><td>' + val(d.time) + '</td></tr>' +
      '<tr><td><b>الوردية</b></td><td>' + val(d.shift) + '</td><td><b>طلبات مفتوحة</b></td><td>' + val(d.openOrders) + '</td></tr>' +
      '<tr><td><b>المسلِّم</b></td><td>' + val(d.from) + '</td><td><b>المستلِم</b></td><td>' + val(d.to) + '</td></tr></tbody></table>' +
      '<h2 class="st">مطابقة النقد</h2><table class="t"><tbody><tr><td><b>النقد المتوقع</b></td><td>' + (row ? money(c.expected || 0) : '') + '</td><td><b>النقد الفعلي</b></td><td>' + (row ? money(c.counted || 0) : '') + '</td><td><b>الفرق</b></td><td>' + (row ? money(c.diff || 0) : '') + '</td></tr></tbody></table>' +
      (secs.length ? '<h2 class="st">بنود التحقق</h2><table class="t"><thead><tr><th>القسم</th><th>البند</th><th style="width:12%">النتيجة</th></tr></thead><tbody>' + secs.map(function (s) { return s.items.map(function (i) { const r = res[i.id] || {}; return '<tr><td>' + h(s.title) + '</td><td>' + h(i.t) + '</td><td style="text-align:center">' + (row ? (r.s === 'ok' ? 'تم' : r.s === 'fail' ? 'لا' : '—') : '☐ تم ☐ لا') + '</td></tr>'; }).join(''); }).join('') + '</tbody></table>' : '') +
      '<h2 class="st">ملاحظات وأعطال مفتوحة</h2><table class="t"><tbody><tr><td style="height:' + (row ? 'auto' : '60px') + '">' + (row ? h(d.issues || '—').replace(/\n/g, '<br>') : '') + '</td></tr></tbody></table>' +
      '<h2 class="st">نواقص المخزون</h2><table class="t"><tbody><tr><td style="height:' + (row ? 'auto' : '40px') + '">' + (row ? h(d.shortages || '—') : '') + '</td></tr></tbody></table>' +
      '<h2 class="st">شكاوى العملاء</h2><table class="t"><tbody><tr><td style="height:' + (row ? 'auto' : '40px') + '">' + (row ? h(d.complaints || '—') : '') + '</td></tr></tbody></table>' +
      opsSignHtml(['توقيع المسلِّم' + (row ? ': ' + (d.from || '') : ''), 'توقيع المستلِم' + (row ? ': ' + (d.to || '') : ''), 'المشرف']) });
}

// ============================================================
// جدول الورديات
// ============================================================
function opsEmpWeekHours(arr) { return (arr || []).reduce(function (s, code) { return s + opsTypeHours(opsType(code)); }, 0); }
function opsCoverage(assign, ws) {
  const rows = [], gaps = [];
  (OPS.types || []).forEach(function (t) {
    const req = t.data.req || {};
    Object.keys(OPS_DEPTS).forEach(function (dk) {
      const need = +req[dk] || 0;
      const days = [];
      for (let d = 0; d < 7; d++) {
        const has = opsActiveEmps().filter(function (e) { return e.data.dept === dk && (assign[e.id] || [])[d] === t.id; }).length;
        days.push({ has: has, req: need });
        if (need && has < need) gaps.push({ day: opsDayName(opsAddDays(ws, d)) + ' ' + opsShortDate(opsAddDays(ws, d)), shift: t.title, dept: OPS_DEPTS[dk], req: need, has: has, miss: need - has });
      }
      if (need || days.some(function (x) { return x.has; })) rows.push({ type: t, dept: dk, days: days });
    });
  });
  return { rows: rows, gaps: gaps };
}
async function opsSched(el) {
  const ws = OPS.week || opsWeekStart(); OPS.week = ws;
  const emps = opsActiveEmps();
  if (!emps.length) { el.innerHTML = '<div class="biz-upsell"><div><b><i class="fas fa-users"></i> أضف فريق العمل أولاً</b><p>جدول الورديات يعتمد على قائمة الموظفين وأقسامهم ورواتبهم لحساب التغطية والتكلفة.</p></div><button class="btn btn-primary" id="opsGoEmps">فريق العمل</button></div>'; el.querySelector('#opsGoEmps').onclick = function () { OPS.go('emps'); }; return; }
  const rec = (await opsL('schedule', { from: ws, to: ws }))[0];
  const assign = JSON.parse(JSON.stringify((rec && rec.data.assign) || {}));
  emps.forEach(function (e) { if (!Array.isArray(assign[e.id])) assign[e.id] = ['', '', '', '', '', '', '']; });
  let dirty = false;
  const c = opsCfg();
  const opt = function (cur) { return '<option value="">—</option>' + (OPS.types || []).map(function (t) { return '<option value="' + t.id + '"' + (cur === t.id ? ' selected' : '') + '>' + h(t.title) + '</option>'; }).join('') + Object.keys(OPS_DAY_CODES).map(function (k) { return '<option value="' + k + '"' + (cur === k ? ' selected' : '') + '>' + OPS_DAY_CODES[k][0] + '</option>'; }).join(''); };
  const color = function (code) { const t = opsType(code); return t ? t.data.color || '#b48554' : OPS_DAY_CODES[code] ? OPS_DAY_CODES[code][1] : ''; };
  const days = [0, 1, 2, 3, 4, 5, 6].map(function (d) { return opsAddDays(ws, d); });
  const draw = function () {
    const cov = opsCoverage(assign, ws);
    let tH = 0, tC = 0, over = 0;
    const depts = Object.keys(OPS_DEPTS).filter(function (dk) { return emps.some(function (e) { return e.data.dept === dk; }); }).concat(emps.some(function (e) { return !OPS_DEPTS[e.data.dept]; }) ? ['_'] : []);
    const body = depts.map(function (dk) {
      const list = emps.filter(function (e) { return dk === '_' ? !OPS_DEPTS[e.data.dept] : e.data.dept === dk; });
      return '<tr class="ops-sg"><td colspan="10">' + h(OPS_DEPTS[dk] || 'أخرى') + ' <span class="muted">(' + list.length + ')</span></td></tr>' + list.map(function (e) {
        const hrs = opsEmpWeekHours(assign[e.id]), cost = hrs * opsHourly(e); tH += hrs; tC += cost; if (hrs > c.maxWeekHours) over++;
        return '<tr><td class="ops-sn"><b>' + h(e.title) + '</b><small>' + h(e.data.job || '') + '</small></td>' + assign[e.id].map(function (code, d) {
          return '<td class="ops-sc" style="--c:' + (color(code) || 'transparent') + '"><select data-e="' + e.id + '" data-d="' + d + '">' + opt(code) + '</select></td>'; }).join('') +
          '<td class="num' + (hrs > c.maxWeekHours ? ' ops-over' : '') + '">' + nf(hrs, 0) + '</td><td class="num">' + nf(cost, 0) + '</td></tr>';
      }).join('');
    }).join('');
    const covHtml = cov.rows.length ? '<div class="table-container biz-table"><table class="ops-cov"><thead><tr><th>الوردية / القسم</th>' + days.map(function (d) { return '<th>' + opsDayName(d) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      cov.rows.map(function (r) { return '<tr><td><span class="ops-dot" style="background:' + (r.type.data.color || '#b48554') + '"></span>' + h(r.type.title) + ' · ' + h(OPS_DEPTS[r.dept]) + '</td>' + r.days.map(function (x) { const cls = !x.req ? '' : x.has < x.req ? 'bad' : x.has > x.req ? 'more' : 'good'; return '<td class="ops-cv ' + cls + '">' + x.has + (x.req ? '/' + x.req : '') + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>' : '<div class="empty-state">حدد عدد الموظفين المطلوب لكل وردية من «أنواع الورديات» لتظهر مراجعة التغطية</div>';
    el.querySelector('#opsSchedK').innerHTML = kpis([['ساعات الأسبوع', nf(tH, 0)], ['تكلفة العمالة للأسبوع', money(tC)], ['نقص التغطية', nf(cov.gaps.length, 0), cov.gaps.length ? 'وردية تحتاج موظفين' : 'مغطّى بالكامل', cov.gaps.length ? '#ef4444' : '#10b981'], ['تجاوز ' + c.maxWeekHours + ' ساعة', nf(over, 0), 'موظف', over ? '#f59e0b' : '']]);
    el.querySelector('#opsSchedT').innerHTML = '<div class="table-container biz-table ops-grid-wrap"><table class="ops-grid"><thead><tr><th>الموظف</th>' + days.map(function (d) { return '<th>' + opsDayName(d) + '<small>' + opsShortDate(d) + '</small></th>'; }).join('') + '<th>ساعات</th><th>تكلفة</th></tr></thead><tbody>' + body + '</tbody></table></div>';
    el.querySelector('#opsSchedC').innerHTML = covHtml;
    el.querySelector('#opsSaveBtn').classList.toggle('pulse', dirty);
    OPS.schedState = { cov: cov, tH: tH, tC: tC };
  };
  el.innerHTML = '<div class="ops-week"><button class="btn btn-outline btn-sm" data-w="-7"><i class="fas fa-chevron-right"></i></button><b>أسبوع ' + dOnly(ws) + ' — ' + dOnly(opsAddDays(ws, 6)) + '</b><button class="btn btn-outline btn-sm" data-w="7"><i class="fas fa-chevron-left"></i></button><button class="btn btn-outline btn-sm" data-w="0">الأسبوع الحالي</button></div>' +
    '<div class="ops-acts ops-sched-acts"><button class="btn btn-primary btn-sm" id="opsSaveBtn" data-a="save"><i class="fas fa-save"></i> حفظ الجدول</button><button class="btn btn-outline btn-sm" data-a="auto"><i class="fas fa-magic"></i> توزيع تلقائي</button><button class="btn btn-outline btn-sm" data-a="copy"><i class="fas fa-copy"></i> نسخ الأسبوع السابق</button>' +
    '<button class="btn btn-outline btn-sm" data-a="types"><i class="fas fa-clock"></i> أنواع الورديات</button><button class="btn btn-outline btn-sm" data-a="print"><i class="fas fa-print"></i> طباعة</button></div>' +
    '<div id="opsSchedK"></div><div id="opsSchedT"></div><div class="ops-legend">' + (OPS.types || []).map(function (t) { return '<span><i style="background:' + (t.data.color || '#b48554') + '"></i>' + h(t.title) + ' ' + h(t.data.start) + '-' + h(t.data.end) + ' (' + nf(opsTypeHours(t), 1) + ' س)</span>'; }).join('') + Object.keys(OPS_DAY_CODES).map(function (k) { return '<span><i style="background:' + OPS_DAY_CODES[k][1] + '"></i>' + OPS_DAY_CODES[k][0] + '</span>'; }).join('') + '</div>' +
    '<h4 class="ops-h4"><i class="fas fa-user-check"></i> مراجعة التغطية (المجدول / المطلوب)</h4><div id="opsSchedC"></div>';
  draw();
  el.querySelector('#opsSchedT').addEventListener('change', function (e) { const s = e.target.closest('select[data-e]'); if (!s) return; assign[s.dataset.e][+s.dataset.d] = s.value; dirty = true; draw(); });
  el.querySelector('.ops-week').onclick = async function (e) { const b = e.target.closest('[data-w]'); if (!b) return; if (dirty && !(await bConfirm('يوجد تعديلات غير محفوظة. هل تريد المتابعة دون حفظ؟'))) return; OPS.week = +b.dataset.w ? opsAddDays(ws, +b.dataset.w) : opsWeekStart(); opsSched(el); };
  el.querySelector('.ops-sched-acts').onclick = async function (e) {
    const a = e.target.closest('[data-a]'); if (!a) return;
    if (a.dataset.a === 'save') { await opsS('schedule', { period: ws, title: 'جدول أسبوع ' + ws, data: { assign: assign } }); dirty = false; draw(); }
    if (a.dataset.a === 'copy') {
      const prev = (await opsL('schedule', { from: opsAddDays(ws, -7), to: opsAddDays(ws, -7) }))[0];
      if (!prev) { showToast('لا يوجد جدول محفوظ للأسبوع السابق', true); return; }
      emps.forEach(function (e) { if (prev.data.assign[e.id]) assign[e.id] = prev.data.assign[e.id].slice(); }); dirty = true; draw(); showToast('تم نسخ الأسبوع السابق — اضغط حفظ');
    }
    if (a.dataset.a === 'auto') opsAutoModal(assign, function () { dirty = true; draw(); });
    if (a.dataset.a === 'types') opsTypesModal(function () { opsSched(el); });
    if (a.dataset.a === 'print') opsPrintSched(ws, assign);
  };
}
function opsAutoModal(assign, done) {
  if (!(OPS.types || []).length) { showToast('أضف نوع وردية واحداً على الأقل', true); return; }
  const c = opsCfg();
  bPrompt('توزيع تلقائي للورديات', [{ k: 'mode', label: 'الموظفون المشمولون', type: 'select', options: [['empty', 'الموظفون بدون جدول فقط'], ['all', 'كل الموظفين (استبدال الجدول)']] },
    { k: 'days', label: 'أيام العمل في الأسبوع', type: 'number', def: c.workDays }, { k: 'off', label: 'توزيع أيام الراحة', type: 'select', options: [['stagger', 'متدرج (لا يغيب الجميع في نفس اليوم)'], ['same', 'نفس اليوم للجميع']] },
    { k: 'balance', label: 'توزيع الموظفين على الورديات', type: 'select', options: [['req', 'حسب العدد المطلوب لكل وردية'], ['default', 'الوردية الافتراضية لكل موظف']] }], {}, function (f) {
    const wd = Math.min(7, Math.max(1, +f.days || 6)), offN = 7 - wd, types = OPS.types;
    const emps = opsActiveEmps().filter(function (e) { return f.mode === 'all' || !(assign[e.id] || []).some(Boolean); });
    const load = {}; // عدد المسندين لكل وردية/قسم
    emps.forEach(function (e, idx) {
      let tid = e.data.defShift && opsType(e.data.defShift) ? e.data.defShift : '';
      if (!tid || f.balance === 'req') {
        // اختر الوردية الأكثر احتياجاً لهذا القسم
        let best = types[0], bestNeed = -1e9;
        types.forEach(function (t) { const need = (+((t.data.req || {})[e.data.dept]) || 0) - (load[t.id + e.data.dept] || 0); if (need > bestNeed) { bestNeed = need; best = t; } });
        if (!tid || bestNeed > 0) tid = best.id;
      }
      load[tid + e.data.dept] = (load[tid + e.data.dept] || 0) + 1;
      const restStart = e.data.offDay !== undefined && e.data.offDay !== '' ? ((+e.data.offDay - (+c.weekStart) + 7) % 7) : (f.off === 'same' ? 6 : (idx * Math.max(1, offN)) % 7);
      const arr = []; for (let d = 0; d < 7; d++) { const isOff = offN > 0 && ((d - restStart + 7) % 7) < offN; arr.push(isOff ? 'off' : tid); }
      assign[e.id] = arr;
    });
    done(); showToast('تم التوزيع لـ ' + emps.length + ' موظف — راجع الجدول ثم اضغط حفظ');
  }, { icon: 'magic', saveText: 'توزيع' });
}
function opsTypesModal(done) {
  const draw = function (m) {
    m.$('#opsTypesL').innerHTML = (OPS.types || []).length ? bTable([{ label: 'الوردية', r: function (t) { return '<span class="ops-dot" style="background:' + (t.data.color || '#b48554') + '"></span><b>' + h(t.title) + '</b>'; } }, { label: 'الوقت', r: function (t) { return h(t.data.start) + ' - ' + h(t.data.end); } },
      { label: 'الساعات', num: true, r: function (t) { return nf(opsTypeHours(t), 1); } }, { label: 'المطلوب', r: function (t) { const q = t.data.req || {}; return Object.keys(q).filter(function (k) { return +q[k]; }).map(function (k) { return h(OPS_DEPTS[k]) + ': ' + q[k]; }).join(' · ') || '—'; } },
      { label: '', r: function (t) { return '<button class="btn btn-outline btn-sm" data-act="edit" data-id="' + t.id + '"><i class="fas fa-pen"></i></button><button class="btn btn-outline btn-sm" data-act="del" data-id="' + t.id + '"><i class="fas fa-trash-alt"></i></button>'; } }], OPS.types) : '<div class="empty-state">لا توجد ورديات</div>';
  };
  const edit = function (t, m) {
    const f = [{ k: 'title', label: 'اسم الوردية', req: true }, { k: 'color', label: 'اللون', type: 'color', def: '#b48554' }, { k: 'start', label: 'البداية', type: 'time', def: '09:00', req: true }, { k: 'end', label: 'النهاية', type: 'time', def: '17:00', req: true },
      { k: 'breakMin', label: 'الاستراحة (دقيقة)', type: 'number', def: 30 }, { type: 'section', label: 'عدد الموظفين المطلوب في هذه الوردية لكل قسم' }].concat(Object.keys(OPS_DEPTS).map(function (k) { return { k: 'req_' + k, label: OPS_DEPTS[k], type: 'number', def: 0 }; }));
    const v = t ? Object.assign({ title: t.title }, t.data) : {}; if (t) Object.keys(t.data.req || {}).forEach(function (k) { v['req_' + k] = t.data.req[k]; });
    bPrompt(t ? 'تعديل الوردية' : 'وردية جديدة', f, v, async function (d) {
      const req = {}; Object.keys(OPS_DEPTS).forEach(function (k) { req[k] = +d['req_' + k] || 0; });
      await opsS('shift_type', { id: t && t.id, title: d.title, data: { start: d.start, end: d.end, color: d.color, breakMin: +d.breakMin || 0, req: req } });
      OPS.types = (await opsL('shift_type')).sort(function (a, b) { return opsMin(a.data.start) - opsMin(b.data.start); }); draw(m);
    }, { icon: 'clock' });
  };
  bModal({ title: 'أنواع الورديات', icon: 'clock', wide: true, print: false, body: '<div id="opsTypesL"></div>', foot: '<button class="btn btn-cancel" data-x>إغلاق</button><button class="btn btn-primary" data-act="add"><i class="fas fa-plus"></i> وردية جديدة</button>',
    onOpen: draw, onClose: done,
    actions: { add: function (m) { edit(null, m); }, edit: function (m, b) { edit(opsType(b.dataset.id), m); },
      del: async function (m, b) { if (await opsD(b.dataset.id, 'الوردية')) { OPS.types = (await opsL('shift_type')).sort(function (a, b) { return opsMin(a.data.start) - opsMin(b.data.start); }); draw(m); } } } });
}
function opsPrintSched(ws, assign) {
  const days = [0, 1, 2, 3, 4, 5, 6].map(function (d) { return opsAddDays(ws, d); }), st = OPS.schedState || {};
  const lbl = function (code) { const t = opsType(code); return t ? t.title + ' ' + t.data.start + '-' + t.data.end : OPS_DAY_CODES[code] ? OPS_DAY_CODES[code][0] : '—'; };
  const rows = opsActiveEmps().map(function (e) { const hrs = opsEmpWeekHours(assign[e.id]); return [e.title, OPS_DEPTS[e.data.dept] || ''].concat((assign[e.id] || []).map(lbl)).concat([hrs]); });
  rptPrint({ title: 'جدول الورديات الأسبوعي', period: dOnly(ws) + ' — ' + dOnly(opsAddDays(ws, 6)),
    kpis: [['ساعات الأسبوع', nf(st.tH || 0, 0)], ['تكلفة العمالة', money(st.tC || 0)], ['نقص التغطية', nf(((st.cov || {}).gaps || []).length, 0)], ['عدد الموظفين', nf(rows.length, 0)]],
    sections: [{ title: 'الجدول', table: { headers: ['الموظف', 'القسم'].concat(days.map(function (d) { return opsDayName(d) + ' ' + opsShortDate(d); })).concat(['ساعات']), qty: [9], rows: rows } },
      { title: 'نقص التغطية', table: { headers: ['اليوم', 'الوردية', 'القسم', 'المطلوب', 'المجدول', 'النقص'], rows: ((st.cov || {}).gaps || []).map(function (g) { return [g.day, g.shift, g.dept, g.req, g.has, g.miss]; }), empty: 'التغطية مكتملة' } }],
    bodyHtml: opsSignHtml(['أعدّه', 'مدير الفرع', 'اطّلع الموظفون']) });
}

// ============================================================
// تقييم الموظفين
// ============================================================
function opsEvalScore(scores, crit) { let tw = 0, s = 0; crit.forEach(function (c) { const v = +scores[c.k]; if (v) { tw += +c.w || 0; s += (+c.w || 0) * v / 5; } }); return tw ? Math.round(s / tw * 1000) / 10 : 0; }
async function opsEval(el) {
  const month = OPS.evMonth || isoLocal().slice(0, 7); OPS.evMonth = month;
  const c = opsCfg(), crit = c.criteria, emps = opsActiveEmps();
  const r = await Promise.all([opsL('eval', { from: opsMonthStart(month), to: opsMonthStart(month) }), bz('opsInsights', { days: 30 }, { loading: false })]);
  const evals = r[0], ins = r[1].success ? r[1] : null;
  const byEmp = {}; evals.forEach(function (x) { byEmp[x.staffId] = x; });
  const salesOf = function (e) { if (!ins) return null; const s = ins.staff.find(function (x) { return (e.data.staffId && x.staffId === e.data.staffId) || x.name === e.title; }); return s || null; };
  const ranked = emps.map(function (e) { return { e: e, ev: byEmp[e.id], s: salesOf(e) }; }).sort(function (a, b) { return ((b.ev && b.ev.score) || -1) - ((a.ev && a.ev.score) || -1); });
  const avg = evals.length ? evals.reduce(function (s, x) { return s + (+x.score || 0); }, 0) / evals.length : null;
  const critAvg = crit.map(function (cr) { const v = evals.map(function (x) { return +(x.data.scores || {})[cr.k] || 0; }).filter(Boolean); return { c: cr, v: v.length ? v.reduce(function (a, b) { return a + b; }, 0) / v.length : 0 }; });
  const weakest = critAvg.filter(function (x) { return x.v; }).sort(function (a, b) { return a.v - b.v; })[0];
  el.innerHTML = '<div class="ops-week"><label>الشهر <input type="month" id="opsEvM" value="' + month + '"></label><button class="btn btn-outline btn-sm" id="opsCrit"><i class="fas fa-sliders-h"></i> معايير التقييم</button>' + rptButtons('opsEvRpt') + '</div>' +
    kpis([['تم تقييمهم', evals.length + ' / ' + emps.length], ['متوسط الأداء', avg === null ? '—' : nf(avg, 0) + '%', avg === null ? '' : opsRate(avg)[0], avg === null ? '' : opsRate(avg)[1]],
      ['الأفضل', ranked[0] && ranked[0].ev ? h(ranked[0].e.title) : '—', ranked[0] && ranked[0].ev ? nf(ranked[0].ev.score, 0) + '%' : ''], ['المعيار الأضعف', weakest ? h(weakest.c.n) : '—', weakest ? nf(weakest.v, 1) + ' / 5 — أولوية التدريب' : '', weakest ? '#f59e0b' : '']]) +
    (emps.length ? bTable([{ label: '#', r: function (x, i) { return x.ev ? '<b>' + (i + 1) + '</b>' : '—'; } }, { label: 'الموظف', r: function (x) { return '<b>' + h(x.e.title) + '</b><div class="muted" style="font-size:.72rem">' + h(OPS_DEPTS[x.e.data.dept] || '') + (x.e.data.job ? ' · ' + h(x.e.data.job) : '') + '</div>'; } },
      { label: 'النتيجة', r: function (x) { return x.ev ? opsScoreBadge(x.ev.score) : '<span class="muted">لم يُقيّم</span>'; } },
      { label: 'نقاط القوة / التطوير', r: function (x) { if (!x.ev) return '—'; const sc = x.ev.data.scores || {}, l = crit.filter(function (cr) { return sc[cr.k]; }).sort(function (a, b) { return sc[b.k] - sc[a.k]; }); return l.length ? '<span style="color:#10b981">' + h(l[0].n) + '</span><br><span style="color:#f59e0b">' + h(l[l.length - 1].n) + '</span>' : '—'; } },
      { label: 'مبيعات 30 يوم', num: true, r: function (x) { return x.s ? money(x.s.sales) + '<div class="muted" style="font-size:.7rem">' + x.s.orders + ' طلب · متوسط ' + nf(x.s.avg, 0) + '</div>' : '—'; } },
      { label: '', r: function (x) { return '<div class="ops-row-acts"><button class="btn btn-' + (x.ev ? 'outline' : 'primary') + ' btn-sm" data-ev="' + x.e.id + '"><i class="fas fa-' + (x.ev ? 'pen' : 'star') + '"></i> ' + (x.ev ? 'تعديل' : 'تقييم') + '</button>' + (x.ev ? '<button class="btn btn-outline btn-sm" data-pr="' + x.e.id + '" title="طباعة بطاقة التقييم"><i class="fas fa-print"></i></button>' : '') + '</div>'; } }], ranked) : '<div class="empty-state">أضف فريق العمل أولاً</div>') +
    (evals.length ? '<div class="biz-card"><h4><i class="fas fa-chart-bar"></i> متوسط الفريق لكل معيار</h4><div class="ops-bars">' + critAvg.map(function (x) { return '<div><span>' + h(x.c.n) + '</span><i><b style="width:' + (x.v / 5 * 100) + '%;background:' + opsRate(x.v / 5 * 100)[1] + '"></b></i><em>' + nf(x.v, 1) + '</em></div>'; }).join('') + '</div></div>' : '');
  el.querySelector('#opsEvM').onchange = function (e) { OPS.evMonth = e.target.value || isoLocal().slice(0, 7); opsEval(el); };
  el.querySelector('#opsCrit').onclick = function () { opsCritModal(function () { opsEval(el); }); };
  el.onclick = function (e) {
    const b = e.target.closest('[data-ev]'), p = e.target.closest('[data-pr]');
    if (b) { const x = ranked.find(function (y) { return y.e.id === b.dataset.ev; }); opsEvalModal(x.e, x.ev, month, x.s, function () { opsEval(el); }); }
    if (p) { const x = ranked.find(function (y) { return y.e.id === p.dataset.pr; }); opsPrintEval(x.e, x.ev, month, x.s); }
  };
  rptBind(el, 'opsEvRpt', function () {
    return { title: 'تقرير تقييم أداء الموظفين', period: month, kpis: [['تم تقييمهم', evals.length + ' / ' + emps.length], ['متوسط الأداء', avg === null ? '—' : nf(avg, 0) + '%']],
      sections: [{ title: 'ترتيب الموظفين', table: { headers: ['#', 'الموظف', 'القسم', 'النتيجة %', 'التقدير', 'المقيّم'], pct: [3], rows: ranked.filter(function (x) { return x.ev; }).map(function (x, i) { return [i + 1, x.e.title, OPS_DEPTS[x.e.data.dept] || '', +x.ev.score, opsRate(x.ev.score)[0], x.ev.data.evaluator || x.ev.createdBy]; }) } },
        { title: 'متوسط الفريق لكل معيار', table: { headers: ['المعيار', 'الوزن %', 'المتوسط من 5'], rows: critAvg.map(function (x) { return [x.c.n, +x.c.w, Math.round(x.v * 10) / 10]; }) } }], signature: true };
  });
}
function opsEvalModal(emp, ev, month, sales, done) {
  const crit = opsCfg().criteria, sc = JSON.parse(JSON.stringify((ev && ev.data.scores) || {}));
  const lbl = ['', 'ضعيف', 'مقبول', 'جيد', 'جيد جداً', 'ممتاز'];
  const tail = [{ k: 'strengths', label: 'نقاط القوة', type: 'textarea', rows: 2 }, { k: 'improve', label: 'مجالات التطوير', type: 'textarea', rows: 2 }, { k: 'plan', label: 'خطة العمل / التدريب للشهر القادم', type: 'textarea', rows: 2, full: true }, { k: 'evaluator', label: 'المقيّم', def: rptActor() }];
  bModal({ title: 'تقييم ' + emp.title, sub: 'شهر ' + month + ' · ' + (OPS_DEPTS[emp.data.dept] || ''), icon: 'star-half-alt', wide: true, print: false,
    body: '<div class="ops-run-bar" id="opsEvBar"></div>' + (sales ? '<div class="ops-ev-sales"><i class="fas fa-cash-register"></i> مبيعاته في آخر 30 يوماً: <b>' + money(sales.sales) + '</b> من ' + sales.orders + ' طلب (متوسط الفاتورة ' + money(sales.avg) + ')</div>' : '') +
      '<div class="ops-crit">' + crit.map(function (c) { return '<div class="ops-crit-r" data-k="' + h(c.k) + '"><span>' + h(c.n) + ' <small class="muted">(' + c.w + '%)</small></span><div class="ops-stars">' + [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" data-v="' + n + '" class="' + (+sc[c.k] >= n ? 'on' : '') + '" title="' + lbl[n] + '">' + n + '</button>'; }).join('') + '</div><em>' + (lbl[+sc[c.k]] || '—') + '</em></div>'; }).join('') + '</div>' + bForm(tail, ev ? ev.data : {}),
    foot: '<button class="btn btn-cancel" data-x>إلغاء</button><button class="btn btn-primary" data-act="save"><i class="fas fa-check"></i> حفظ التقييم</button>',
    onOpen: function (m) {
      const bar = function () { const s = opsEvalScore(sc, crit), r = opsRate(s), n = crit.filter(function (c) { return sc[c.k]; }).length; m.$('#opsEvBar').innerHTML = '<div class="ops-run-score" style="--c:' + r[1] + '"><b>' + nf(s, 0) + '%</b><span>' + r[0] + '</span></div><div class="ops-run-meta"><span>' + n + ' / ' + crit.length + ' معيار</span><span class="muted">1 ضعيف · 2 مقبول · 3 جيد · 4 جيد جداً · 5 ممتاز</span></div>'; };
      bar();
      m.$('.ops-crit').onclick = function (e) { const b = e.target.closest('[data-v]'); if (!b) return; const row = b.closest('.ops-crit-r'), k = row.dataset.k; sc[k] = +b.dataset.v; row.querySelectorAll('[data-v]').forEach(function (x) { x.classList.toggle('on', +x.dataset.v <= sc[k]); }); row.querySelector('em').textContent = lbl[sc[k]]; bar(); };
    },
    actions: { save: async function (m, btn) {
      if (crit.some(function (c) { return !sc[c.k]; })) { showToast('قيّم كل المعايير', true); return; }
      const f = readForm(m.el, tail); btn.disabled = true;
      try { await opsS('eval', { id: ev && ev.id, period: opsMonthStart(month), staffId: emp.id, title: emp.title, score: opsEvalScore(sc, crit), data: Object.assign({ scores: sc, criteria: crit, sales: sales || null }, f) }); m.close(); if (done) done(); } catch (e) { /* */ } finally { btn.disabled = false; }
    } } });
}
function opsPrintEval(emp, ev, month, sales) {
  if (!ev) return;
  const crit = ev.data.criteria || opsCfg().criteria, sc = ev.data.scores || {}, lbl = ['', 'ضعيف', 'مقبول', 'جيد', 'جيد جداً', 'ممتاز'], r = opsRate(ev.score);
  rptPrint({ title: 'بطاقة تقييم أداء موظف', subtitle: emp.title, period: month,
    kpis: [['النتيجة', nf(ev.score, 0) + '%', r[0]], ['القسم', h(OPS_DEPTS[emp.data.dept] || '—')], ['المسمى', h(emp.data.job || '—')], ['مبيعات 30 يوم', sales ? money(sales.sales) : '—']],
    sections: [{ title: 'المعايير', table: { headers: ['المعيار', 'الوزن %', 'الدرجة (من 5)', 'التقدير'], rows: crit.map(function (c) { return [c.n, +c.w, +sc[c.k] || 0, lbl[+sc[c.k]] || '']; }) } },
      { title: 'الملاحظات', table: { headers: ['البند', 'التفاصيل'], rows: [['نقاط القوة', ev.data.strengths || '—'], ['مجالات التطوير', ev.data.improve || '—'], ['خطة العمل / التدريب', ev.data.plan || '—']] } }],
    bodyHtml: opsSignHtml(['الموظف: ' + emp.title, 'المقيّم: ' + (ev.data.evaluator || ''), 'الإدارة']) });
}
function opsCritModal(done) {
  const crit = JSON.parse(JSON.stringify(opsCfg().criteria));
  const draw = function (m) { m.$('#opsCritL').innerHTML = crit.map(function (c, i) { return '<div class="ops-ed-ir" data-i="' + i + '"><input data-f="n" value="' + h(c.n) + '" placeholder="اسم المعيار"><input data-f="w" type="number" value="' + c.w + '" style="max-width:90px" placeholder="الوزن"><button class="btn btn-outline btn-sm" data-act="rm" data-i="' + i + '"><i class="fas fa-times"></i></button></div>'; }).join('') + '<div class="biz-hint">مجموع الأوزان: <b id="opsWSum"></b>% — تُحسب النتيجة نسبةً للمجموع</div>'; sum(m); };
  const sync = function (m) { m.$$('#opsCritL [data-i]').forEach(function (r) { if (!r.querySelector('[data-f=n]')) return; const c = crit[+r.dataset.i]; c.n = r.querySelector('[data-f=n]').value.trim(); c.w = +r.querySelector('[data-f=w]').value || 0; }); };
  const sum = function (m) { sync(m); const s = m.$('#opsWSum'); if (s) s.textContent = crit.reduce(function (a, c) { return a + c.w; }, 0); };
  bModal({ title: 'معايير تقييم الموظفين', icon: 'sliders-h', wide: true, print: false, body: '<div id="opsCritL"></div><button class="btn btn-outline btn-sm" data-act="add" style="margin-top:8px"><i class="fas fa-plus"></i> معيار جديد</button>',
    foot: '<button class="btn btn-cancel" data-x>إلغاء</button><button class="btn btn-outline" data-act="reset">الافتراضي</button><button class="btn btn-primary" data-act="save"><i class="fas fa-check"></i> حفظ</button>',
    onOpen: function (m) { draw(m); m.el.addEventListener('input', function () { sum(m); }); },
    actions: { add: function (m) { sync(m); crit.push({ k: opsUid(), n: '', w: 10 }); draw(m); }, rm: function (m, b) { sync(m); crit.splice(+b.dataset.i, 1); draw(m); },
      reset: function (m) { crit.length = 0; OPS_CRIT_DEF.forEach(function (c) { crit.push(Object.assign({}, c)); }); draw(m); },
      save: async function (m) { sync(m); const l = crit.filter(function (c) { return c.n && c.w > 0; }); if (!l.length) { showToast('أضف معياراً واحداً على الأقل', true); return; } await opsSaveCfg({ criteria: l }); m.close(); if (done) done(); } } });
}

// ============================================================
// تحليل العمالة (حاسبة التكلفة المثالية + بيانات النظام)
// ============================================================
async function opsLabor(el) {
  const c = opsCfg(), days = OPS.laborDays || 30;
  const r = await bz('opsInsights', { days: days }, { loading: false });
  const ins = r.success ? r : { totals: { sales: 0, orders: 0, avgTicket: 0, daysActive: 0 }, grid: [], staff: [], daily: [] };
  const emps = opsActiveEmps(), wages = emps.map(function (e) { return +e.data.wage || 0; }).filter(Boolean);
  const ws = opsWeekStart(), sched = (await opsL('schedule', { from: ws, to: ws }))[0];
  let schedH = 0; if (sched) emps.forEach(function (e) { schedH += opsEmpWeekHours(sched.data.assign[e.id]); });
  const auto = { sales: Math.round(ins.totals.sales / days * 30), bill: ins.totals.avgTicket || 0, wage: wages.length ? Math.round(wages.reduce(function (a, b) { return a + b; }, 0) / wages.length) : 0,
    emps: emps.length, workDays: c.workDays, target: c.targetLabor, shifts: Math.max(1, (OPS.types || []).length), hours: (OPS.types || []).length ? Math.round(opsTypeHours(OPS.types[0]) * 10) / 10 : 8, perStaff: c.ordersPerStaffHour };
  const st = OPS.laborIn || auto;
  const fields = [{ k: 'sales', label: 'المبيعات الشهرية', type: 'number', hint: 'من النظام: ' + money(auto.sales) + ' (متوقعة لـ 30 يوماً)' }, { k: 'bill', label: 'متوسط الفاتورة', type: 'number' },
    { k: 'emps', label: 'عدد الموظفين', type: 'number' }, { k: 'wage', label: 'متوسط الراتب الشهري (شامل التكاليف)', type: 'number' },
    { k: 'workDays', label: 'أيام العمل في الأسبوع', type: 'number' }, { k: 'target', label: 'نسبة العمالة المستهدفة %', type: 'number' },
    { k: 'shifts', label: 'عدد الورديات يومياً', type: 'number' }, { k: 'hours', label: 'ساعات الوردية', type: 'number' },
    { k: 'perStaff', label: 'طلبات يخدمها الموظف في الساعة', type: 'number', hint: 'لحساب العدد المقترح لكل ساعة' }];
  el.innerHTML = '<div class="ops-week"><label>تحليل آخر <select id="opsLD">' + [7, 30, 60, 90].map(function (d) { return '<option value="' + d + '"' + (d === days ? ' selected' : '') + '>' + d + ' يوماً</option>'; }).join('') + '</select></label>' + rptButtons('opsLbRpt') + '</div>' +
    '<div class="biz-grid-2 ops-lab"><div class="biz-card"><h4><i class="fas fa-calculator"></i> حاسبة تكلفة العمالة المثالية</h4>' + bForm(fields, st) +
    '<div class="ops-acts" style="margin-top:10px"><button class="btn btn-primary btn-sm" id="opsLCalc"><i class="fas fa-equals"></i> احسب</button><button class="btn btn-outline btn-sm" id="opsLAuto"><i class="fas fa-database"></i> تعبئة من بيانات النظام</button><button class="btn btn-outline btn-sm" id="opsLTgt"><i class="fas fa-bullseye"></i> حفظ المستهدف</button></div></div>' +
    '<div class="biz-card"><h4><i class="fas fa-chart-pie"></i> النتائج والقرار</h4><div id="opsLOut"></div></div></div>' +
    '<div class="biz-card"><h4><i class="fas fa-fire"></i> خريطة ضغط الطلبات (متوسط الطلبات في الساعة) والعدد المقترح من الموظفين</h4><div id="opsHeat"></div></div>' +
    '<div class="biz-card"><h4><i class="fas fa-user-tag"></i> أداء البيع لكل موظف (آخر ' + days + ' يوماً)</h4>' +
    bTable([{ label: 'الموظف', r: function (x) { return h(x.name); } }, { label: 'الطلبات', num: true, r: function (x) { return nf(x.orders, 0); } }, { label: 'المبيعات', num: true, r: function (x) { return money(x.sales); } }, { label: 'متوسط الفاتورة', num: true, r: function (x) { return money(x.avg); } },
      { label: 'الحصة', num: true, r: function (x) { return ins.totals.sales ? nf(x.sales / ins.totals.sales * 100, 1) + '%' : '—'; } }], ins.staff, { empty: 'لا توجد مبيعات في هذه الفترة' }) + '</div>';
  let res = null;
  const calc = function () {
    const f = readForm(el, fields); OPS.laborIn = f;
    const sales = +f.sales || 0, wage = +f.wage || 0, n = +f.emps || 0, wd = +f.workDays || 6, target = +f.target || 25, bill = +f.bill || 0, sh = +f.shifts || 1, hrs = +f.hours || 8;
    const cost = n * wage, pct = sales ? cost / sales * 100 : 0, perEmp = n ? sales / n : 0, dailyCost = cost / (wd * 4.33), cust = bill ? sales / bill : 0, custPerEmp = n ? cust / n : 0;
    const monthH = n * sh ? n * hrs * wd * 4.33 : 0, splh = monthH ? sales / monthH : 0;
    const optimal = wage ? Math.floor(sales * target / 100 / wage) : 0;
    const eff = pct < 20 ? ['ممتاز', '#10b981'] : pct <= 30 ? ['جيد', '#60a5fa'] : pct <= 35 ? ['مرتفع', '#f59e0b'] : ['خطر', '#ef4444'];
    const sug = [];
    if (!sales || !wage || !n) sug.push(['info', 'أدخل المبيعات والرواتب وعدد الموظفين لعرض التحليل.']);
    else {
      if (pct > target + 5) { sug.push(['danger', 'تكلفة العمالة أعلى من المستهدف بـ ' + nf(pct - target, 1) + ' نقطة. العدد الأمثل عند المستهدف ' + target + '%: ' + optimal + ' موظف (الحالي ' + n + ').']); sug.push(['warn', 'خفّض الساعات في أهدأ الأوقات (انظر الخريطة) ووزّع أيام الراحة بشكل متدرج بدلاً من تقليص العدد مباشرة.']); sug.push(['info', 'زد المبيعات لكل موظف: التدريب على البيع الإضافي ورفع متوسط الفاتورة بـ 10% يخفض النسبة إلى ' + nf(cost / (sales * 1.1) * 100, 1) + '%.']); }
      else if (pct < target - 5) { sug.push(['info', 'تكلفة العمالة أقل من المستهدف — يمكنك إضافة ' + Math.max(0, optimal - n) + ' موظف لتحسين الخدمة في الذروة دون تجاوز المستهدف.']); sug.push(['warn', 'راقب زمن التحضير وتقييمات العملاء؛ الضغط الزائد يرفع الأخطاء والهدر.']); }
      else sug.push(['ok', 'تكلفة العمالة ضمن النطاق المستهدف (±5). حافظ على توزيع الورديات وراقبها أسبوعياً.']);
      if (custPerEmp && custPerEmp < 150) sug.push(['warn', 'عدد العملاء لكل موظف منخفض (' + nf(custPerEmp, 0) + ' شهرياً) — راجع توزيع الموظفين على الساعات.']);
      if (schedH && n) { const avgH = schedH / n; if (avgH > c.maxWeekHours) sug.push(['warn', 'متوسط ساعات الموظف في جدول هذا الأسبوع ' + nf(avgH, 0) + ' ساعة — أعلى من الحد ' + c.maxWeekHours + '.']); }
    }
    res = { sales: sales, cost: cost, pct: pct, perEmp: perEmp, dailyCost: dailyCost, cust: cust, custPerEmp: custPerEmp, splh: splh, optimal: optimal, eff: eff, sug: sug, target: target, n: n };
    const band = pct > target + 5 ? 'danger' : pct < target - 5 ? 'info' : 'ok';
    el.querySelector('#opsLOut').innerHTML = '<div class="ops-run-score big" style="--c:' + eff[1] + '"><b>' + nf(pct, 1) + '%</b><span>نسبة العمالة · ' + eff[0] + '</span></div>' +
      '<div class="ops-band ' + band + '">المستهدف ' + target + '% (المدى المقبول ' + (target - 5) + '% – ' + (target + 5) + '%)</div>' +
      kpis([['تكلفة العمالة الشهرية', money(cost)], ['التكلفة اليومية', money(dailyCost)], ['المبيعات لكل موظف', money(perEmp)], ['مبيعات ساعة العمل', money(splh)],
        ['العملاء المتوقعون', nf(cust, 0)], ['عملاء لكل موظف', nf(custPerEmp, 0)], ['العدد الأمثل', nf(optimal, 0), 'عند ' + target + '%'], ['ساعات الجدول هذا الأسبوع', nf(schedH, 0)]]) +
      '<div class="ops-decs">' + sug.map(function (s) { return '<div class="ops-dec ' + s[0] + '"><i class="fas fa-' + ({ danger: 'exclamation-triangle', warn: 'exclamation-circle', info: 'info-circle', ok: 'check-circle' })[s[0]] + '"></i><div><p>' + h(s[1]) + '</p></div></div>'; }).join('') + '</div>';
  };
  // الخريطة الحرارية
  const heat = function () {
    const per = +((OPS.laborIn || st).perStaff) || c.ordersPerStaffHour || 8;
    const cnt = {}; [0, 1, 2, 3, 4, 5, 6].forEach(function (d) { cnt[d] = 0; });
    // عدد مرات تكرار كل يوم أسبوع في الفترة
    for (let i = 0; i < days; i++) cnt[new Date(Date.now() - i * 864e5).getDay()]++;
    const map = {}; let max = 0; const hrs = {};
    ins.grid.forEach(function (g) { const v = g.n / Math.max(1, cnt[g.dow]); map[g.dow + '_' + g.hr] = v; hrs[g.hr] = 1; if (v > max) max = v; });
    const H = Object.keys(hrs).map(Number).sort(function (a, b) { return a - b; });
    if (!H.length) { el.querySelector('#opsHeat').innerHTML = '<div class="empty-state">لا توجد طلبات مدفوعة في هذه الفترة لعرض أوقات الذروة</div>'; return; }
    const order = [0, 1, 2, 3, 4, 5, 6].map(function (i) { return (i + (+c.weekStart)) % 7; });
    el.querySelector('#opsHeat').innerHTML = '<div class="table-container biz-table"><table class="ops-heat"><thead><tr><th>اليوم</th>' + H.map(function (x) { return '<th>' + x + '</th>'; }).join('') + '</tr></thead><tbody>' +
      order.map(function (d) { return '<tr><td>' + OPS_DAYS[d] + '</td>' + H.map(function (x) { const v = map[d + '_' + x] || 0, a = max ? v / max : 0; return '<td style="background:rgba(180,133,84,' + (0.08 + a * 0.8).toFixed(2) + ')" title="' + nf(v, 1) + ' طلب/ساعة — موظفون مقترحون: ' + Math.ceil(v / per) + '">' + (v ? '<b>' + nf(v, v < 10 ? 1 : 0) + '</b><small>' + Math.max(1, Math.ceil(v / per)) + ' م</small>' : '') + '</td>'; }).join('') + '</tr>'; }).join('') +
      '</tbody></table></div><p class="muted" style="font-size:.76rem;margin-top:6px">الرقم الكبير = متوسط الطلبات في الساعة، «م» = عدد موظفي الخدمة المقترح (على أساس ' + per + ' طلبات لكل موظف في الساعة). مرّر على الخلية للتفاصيل.</p>';
  };
  calc(); heat();
  el.querySelector('#opsLCalc').onclick = function () { calc(); heat(); };
  el.querySelector('#opsLAuto').onclick = function () { OPS.laborIn = null; opsLabor(el); };
  el.querySelector('#opsLTgt').onclick = async function () { const f = readForm(el, fields); await opsSaveCfg({ targetLabor: +f.target || 25, workDays: +f.workDays || 6, ordersPerStaffHour: +f.perStaff || 8 }); };
  el.querySelector('#opsLD').onchange = function (e) { OPS.laborDays = +e.target.value; opsLabor(el); };
  el.querySelector('.ops-lab').addEventListener('input', function () { calc(); });
  rptBind(el, 'opsLbRpt', async function () {
    calc();
    const lab = ins.daily.map(function (x) { return x.d.slice(5); });
    const ch = await rptChart('bar', lab, [{ label: 'المبيعات', data: ins.daily.map(function (x) { return x.sales; }) }], 'المبيعات اليومية');
    return { title: 'تحليل تكلفة العمالة والقرارات', subtitle: 'حاسبة التكلفة المثالية مع بيانات المبيعات الفعلية', period: 'آخر ' + days + ' يوماً',
      kpis: [['نسبة العمالة', nf(res.pct, 1) + '%', res.eff[0]], ['المستهدف', res.target + '%'], ['تكلفة العمالة', money(res.cost)], ['المبيعات الشهرية', money(res.sales)], ['المبيعات لكل موظف', money(res.perEmp)], ['مبيعات ساعة العمل', money(res.splh)], ['العدد الحالي', nf(res.n, 0)], ['العدد الأمثل', nf(res.optimal, 0)]],
      sections: [{ title: 'التوصيات', table: { headers: ['الأولوية', 'التوصية'], rows: res.sug.map(function (s) { return [{ danger: 'عاجل', warn: 'مهم', info: 'للمتابعة', ok: 'إيجابي' }[s[0]], s[1]]; }) } },
        { title: 'المبيعات اليومية', chart: ch }, { title: 'أداء البيع لكل موظف', table: { headers: ['الموظف', 'الطلبات', 'المبيعات', 'متوسط الفاتورة'], money: [2, 3], qty: [1], rows: ins.staff.map(function (x) { return [x.name, x.orders, x.sales, x.avg]; }) } },
        { title: 'أوقات الذروة', table: { headers: ['اليوم', 'الساعة', 'عدد الطلبات'], rows: opsPeaks(ins, 10).map(function (p) { return [p.day, p.hr + ':00', p.n]; }) } }], signature: true };
  });
}

// ============================================================
// فريق العمل
// ============================================================
async function opsEmps(el) {
  const all = OPS.emps || [];
  el.innerHTML = '<div class="ops-head-row"><h4><i class="fas fa-users"></i> فريق العمل</h4><div class="ops-acts"><button class="btn btn-primary btn-sm" data-a="add"><i class="fas fa-user-plus"></i> موظف جديد</button>' + (canP('team') ? '<button class="btn btn-outline btn-sm" data-a="import"><i class="fas fa-file-import"></i> استيراد من حسابات الموظفين</button>' : '') + '<button class="btn btn-outline btn-sm" data-a="print"><i class="fas fa-print"></i> طباعة</button></div></div>' +
    kpis([['الموظفون النشطون', nf(opsActiveEmps().length, 0)], ['إجمالي الرواتب الشهرية', money(opsActiveEmps().reduce(function (s, e) { return s + (+e.data.wage || 0); }, 0))]].concat(Object.keys(OPS_DEPTS).map(function (k) { const n = opsActiveEmps().filter(function (e) { return e.data.dept === k; }).length; return n ? [OPS_DEPTS[k], nf(n, 0)] : null; }).filter(Boolean))) +
    bTable([{ label: 'الموظف', r: function (e) { return '<b>' + h(e.title) + '</b>' + (e.data.phone ? '<div class="muted" style="font-size:.72rem" dir="ltr">' + h(e.data.phone) + '</div>' : ''); } }, { label: 'المسمى', r: function (e) { return h(e.data.job || '—'); } },
      { label: 'القسم', r: function (e) { return h(OPS_DEPTS[e.data.dept] || '—'); } }, { label: 'الراتب', num: true, r: function (e) { return e.data.wage ? money(e.data.wage) : '—'; } },
      { label: 'الوردية / الراحة', r: function (e) { const t = opsType(e.data.defShift); return (t ? h(t.title) : '—') + (e.data.offDay !== undefined && e.data.offDay !== '' ? ' · ' + OPS_DAYS[+e.data.offDay] : ''); } },
      { label: 'الحالة', r: function (e) { return e.data.active === false ? '<span class="badge badge-dog">غير نشط</span>' : '<span class="badge badge-success">نشط</span>'; } },
      { label: '', r: function (e) { return '<div class="ops-row-acts"><button class="btn btn-outline btn-sm" data-ed="' + e.id + '"><i class="fas fa-pen"></i></button><button class="btn btn-outline btn-sm" data-rm="' + e.id + '"><i class="fas fa-trash-alt"></i></button></div>'; } }], all, { empty: 'لا يوجد موظفون بعد — أضفهم أو استوردهم من حسابات الموظفين', emptyIcon: 'users' });
  const reload = async function () { await opsBase(true); opsEmps(el); };
  el.onclick = async function (e) {
    const a = e.target.closest('[data-a]'), ed = e.target.closest('[data-ed]'), rm = e.target.closest('[data-rm]');
    if (ed) opsEmpModal(opsEmp(ed.dataset.ed), reload);
    if (rm && await opsD(rm.dataset.rm, 'الموظف')) reload();
    if (!a) return;
    if (a.dataset.a === 'add') opsEmpModal(null, reload);
    if (a.dataset.a === 'print') rptPrint({ title: 'قائمة فريق العمل', kpis: [['عدد الموظفين', nf(opsActiveEmps().length, 0)]], sections: [{ table: { headers: ['الموظف', 'المسمى', 'القسم', 'الهاتف', 'الراتب', 'الحالة'], money: [4], rows: all.map(function (e) { return [e.title, e.data.job || '', OPS_DEPTS[e.data.dept] || '', e.data.phone || '', +e.data.wage || 0, e.data.active === false ? 'غير نشط' : 'نشط']; }) } }] });
    if (a.dataset.a === 'import') {
      let staff; try { staff = await entList('staff'); } catch (er) { return; }
      const linked = {}; all.forEach(function (x) { if (x.data.staffId) linked[x.data.staffId] = 1; });
      const map = { kitchen: 'kitchen', cashier: 'cashier', waiter: 'service', driver: 'delivery', manager: 'management', accountant: 'management', storekeeper: 'management' };
      const add = staff.filter(function (s) { return s.active !== false && !linked[s.id] && !all.some(function (x) { return x.title === s.name; }); });
      if (!add.length) { showToast('كل حسابات الموظفين مستوردة مسبقاً'); return; }
      showLoading();
      try { for (const s of add) await opsS('employee', { title: s.name, data: { job: (B.acc.roleNames || {})[s.role] || s.role, dept: map[s.role] || 'service', phone: s.phone || '', staffId: s.id, active: true } }, true); } finally { hideLoading(); }
      showToast('تم استيراد ' + add.length + ' موظف — أضف الرواتب لتحليل التكلفة'); reload();
    }
  };
}
async function opsEmpModal(e, done) {
  let staff = []; if (canP('team')) { try { staff = await entList('staff'); } catch (er) { staff = []; } }
  const f = [{ k: 'title', label: 'اسم الموظف', req: true }, { k: 'job', label: 'المسمى الوظيفي', ph: 'شيف، كاشير، نادل...' }, { k: 'dept', label: 'القسم', type: 'select', options: opsDeptSel() },
    { k: 'wage', label: 'الراتب الشهري (شامل البدلات)', type: 'number' }, { k: 'phone', label: 'الهاتف', ltr: true }, { k: 'startDate', label: 'تاريخ التعيين', type: 'date' },
    { k: 'defShift', label: 'الوردية الافتراضية', type: 'select', options: [['', '—']].concat((OPS.types || []).map(function (t) { return [t.id, t.title]; })) },
    { k: 'offDay', label: 'يوم الراحة الثابت', type: 'select', options: [['', 'متغير (توزيع تلقائي)']].concat(OPS_DAYS.map(function (d, i) { return [String(i), d]; })) },
    { k: 'staffId', label: 'ربط بحساب موظف في النظام', type: 'select', options: [['', 'بدون ربط']].concat(staff.map(function (s) { return [s.id, s.name]; })), hint: 'الربط يجلب مبيعاته من الكاشير تلقائياً في التقييم' },
    { k: 'active', label: 'موظف نشط', type: 'checkbox', def: true }, { k: 'notes', label: 'ملاحظات', type: 'textarea', full: true, rows: 2 }];
  bPrompt(e ? 'تعديل الموظف' : 'موظف جديد', f, e ? Object.assign({ title: e.title }, e.data, { offDay: e.data.offDay === undefined ? '' : String(e.data.offDay) }) : { dept: 'service', active: true }, async function (d) {
    const t = d.title; delete d.title;
    await opsS('employee', { id: e && e.id, title: t, data: d }); if (done) done();
  }, { icon: 'user', wide: true });
}
