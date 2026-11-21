// ============================================================
// biz-mgmt.js (v4.9) — الإدارة: الوصفات القياسية وبطاقات الطباعة · أدلة التشغيل والامتياز التجاري
// التكلفة الفعلية مقابل النظرية (ضمن الجرد) · بنود المصروفات القابلة للتخصيص · تذكير انتهاء الاشتراك
// ============================================================
var MG = { cfg: null, mats: null, recipes: null, menu: null, srRows: null };
const SR_ST = { draft: ['مسودة', '#64748b'], pending: ['بانتظار الاعتماد', '#f59e0b'], approved: ['معتمدة', '#10b981'], rejected: ['مرفوضة', '#ef4444'] };
const SR_ALLERGENS = ['القمح (الجلوتين)', 'الحليب', 'البيض', 'المكسرات', 'الفول السوداني', 'السمسم', 'الأسماك', 'القشريات', 'الصويا', 'الخردل', 'الكرفس', 'الكبريتيت'];
const SR_STATIONS = ['المطبخ الساخن', 'الشواء', 'القلي', 'البارد والسلطات', 'التحضير المسبق', 'المعجنات والمخبوزات', 'الحلويات', 'المشروبات', 'التجميع والتقديم'];
const SR_PAPERS = { b5: ['B5 (176×250 مم)', '176mm 250mm'], a4: ['A4 (210×297 مم)', '210mm 297mm'], a5: ['A5 (148×210 مم)', '148mm 210mm'] };
const SR_CFG_DEF = { logo: '', color: '#b48554', paper: 'b5', showCost: false, footer: '', subtitle: 'بطاقة الوصفة القياسية · Standard Recipe Card', chefLabel: 'الشيف التنفيذي' };

function mgUid() { return 'x' + Math.random().toString(36).slice(2, 9); }
function mgClone(o) { return JSON.parse(JSON.stringify(o || {})); }
async function mgList(kind) { const r = await bzOk('mgmtList', { kind: kind }, { loading: false }); return r.rows || []; }
function mgStBadge(s) { const x = SR_ST[s] || SR_ST.draft; return '<span class="sr-st" style="--c:' + x[1] + '">' + x[0] + '</span>'; }
function mgRest() { return (B.acc && B.acc.restaurantName) || 'المطعم'; }
function mgImg(u) { if (!u) return ''; if (/^data:image\//.test(u)) return u; return typeof menuImageUrl === 'function' ? (menuImageUrl(u) || u) : u; }
function mgLogo() { const c = srCfg(); return c.logo || (B.acc && B.acc.biz && B.acc.biz.business && B.acc.biz.business.logo) || ''; }
function srCfg() { return Object.assign({}, SR_CFG_DEF, (MG.cfg && MG.cfg.data) || {}); }

// قراءة صورة وتصغيرها ثم رفعها (تعود برابط، أو بصيغة data إن تعذر الرفع وكانت صغيرة)
function mgReadImg(file, max, png) {
  return new Promise(function (res, rej) {
    const fr = new FileReader();
    fr.onload = function () {
      const im = new Image();
      im.onload = function () {
        const s = Math.min(1, max / Math.max(im.width, im.height)), cv = document.createElement('canvas');
        cv.width = Math.round(im.width * s); cv.height = Math.round(im.height * s);
        cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
        res(cv.toDataURL(png ? 'image/png' : 'image/jpeg', 0.85));
      };
      im.onerror = function () { rej(new Error('ملف الصورة غير صالح')); };
      im.src = fr.result;
    };
    fr.onerror = function () { rej(new Error('تعذر قراءة الملف')); };
    fr.readAsDataURL(file);
  });
}
async function mgUploadImg(file, max, png) {
  if (!file || !/^image\//.test(file.type)) { showToast('اختر ملف صورة', true); return ''; }
  const data = await mgReadImg(file, max || 1100, png);
  showLoading();
  try {
    if (typeof uploadMenuImagePost === 'function') {
      const r = await uploadMenuImagePost(data, 'std-recipe').catch(function () { return null; });
      if (r && r.success && r.url) return r.url;
    }
    if (data.length < 260000) return data;
    showToast('تعذر رفع الصورة — جرّب صورة أصغر', true); return '';
  } finally { hideLoading(); }
}
function mgPickFile(cb, accept) {
  const i = document.createElement('input'); i.type = 'file'; i.accept = accept || 'image/*';
  i.onchange = function () { if (i.files && i.files[0]) cb(i.files[0]); };
  i.click();
}
async function mgLoadMats() {
  if (!MG.mats) { const r = await bz('getAllMaterials', {}, { loading: false }); MG.mats = (r && r.success && r.materials) || []; }
  if (!MG.recipes) { const r = await bz('getAllRecipes', {}, { loading: false }); MG.recipes = (r && r.success && r.recipes) || []; }
}
async function mgLoadMenu() {
  if (!MG.menu) { const r = await bz('getDigitalMenu', {}, { loading: false, silentPlan: true }); MG.menu = (r && r.success && r.items) || []; }
  return MG.menu;
}
function mgMatByName(n) { n = String(n || '').trim(); return (MG.mats || []).find(function (m) { return m.name === n; }); }

// نافذة طباعة مستقلة بمقاس الورق
function mgPrintWin(title, inner, css, size) {
  const w = window.open('', '_blank', 'width=900,height=900');
  if (!w) { showToast('اسمح بالنوافذ المنبثقة للطباعة', true); return; }
  w.document.write('<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>' + h(title) + '</title><style>@page{size:' + size + ';margin:8mm}' +
    'html,body{margin:0;padding:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}@media screen{body{background:#e5e7eb;padding:14px}.src,.mn-page{box-shadow:0 2px 14px rgba(0,0,0,.15);margin:0 auto 14px}}' + css +
    '</style></head><body>' + inner + '<script>window.onload=function(){var im=[].slice.call(document.images),n=im.length,go=function(){setTimeout(function(){window.print();},300)};if(!n)return go();var c=0;im.forEach(function(i){if(i.complete){if(++c===n)go();}else{i.onload=i.onerror=function(){if(++c===n)go();};}});setTimeout(go,4000);}<\/script></body></html>');
  w.document.close();
}

// ============================================================
// بطاقة الوصفة القياسية (عرض + طباعة)
// ============================================================
const SR_CARD_CSS = '.src{--ac:#b48554;position:relative;font-family:Tahoma,"Segoe UI",Arial,sans-serif;color:#1f2433;background:#fff;direction:rtl;font-size:10.5px;line-height:1.55;box-sizing:border-box;overflow:hidden}' +
  '.src *{box-sizing:border-box}.src+.src{page-break-before:always;break-before:page}' +
  '.src-head{display:flex;align-items:center;gap:10px;border-bottom:3px solid var(--ac);padding-bottom:6px;margin-bottom:6px}.src-logo{width:56px;height:56px;object-fit:contain}' +
  '.src-org{flex:1}.src-org b{font-size:15px;display:block;color:#1f2433}.src-org span{color:#6b7280;font-size:9.5px}' +
  '.src-no{font-size:9px;border:1.5px solid var(--ac);border-radius:6px;padding:3px 8px;min-width:104px;text-align:center;color:#4b5563}.src-no b{display:block;font-size:13px;color:var(--ac);direction:ltr;letter-spacing:.5px}' +
  '.src-title{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:2px 0 8px}.src-title h1{margin:0;font-size:19px;color:#1f2433}.src-cat{background:var(--ac);color:#fff;padding:2px 10px;border-radius:20px;font-size:9.5px;white-space:nowrap}' +
  '.src-top{display:grid;grid-template-columns:43% 1fr;gap:9px;margin-bottom:6px}.src-img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:8px;border:1px solid #e5e7eb;display:block}' +
  '.src-noimg{width:100%;aspect-ratio:4/3;border-radius:8px;border:1px dashed #cbd5e1;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:10px}' +
  '.src-facts{display:grid;grid-template-columns:1fr 1fr;gap:4px;align-content:start}.src-facts div{border:1px solid #e5e7eb;border-radius:6px;padding:2px 6px;background:#fafafa}.src-facts small{display:block;color:#6b7280;font-size:8px}.src-facts b{font-size:10px}' +
  '.src h3{font-size:11.5px;margin:7px 0 4px;color:var(--ac);border-bottom:1px solid #e5e7eb;padding-bottom:2px}' +
  '.src table{width:100%;border-collapse:collapse;font-size:9.8px}.src th{background:#f3ece2;color:#1f2433;font-weight:bold}.src td,.src th{border:1px solid #e2e8f0;padding:2.5px 5px;text-align:right;vertical-align:top}.src .n{text-align:center;direction:ltr;white-space:nowrap}' +
  '.src tfoot td{font-weight:bold;background:#fafafa}.src ol{margin:0;padding-inline-start:18px}.src ol li{margin-bottom:2px}' +
  '.src-box{border:1px dashed var(--ac);border-radius:8px;padding:5px 8px;background:#fffaf3}.src-two{display:grid;grid-template-columns:1fr 1fr;gap:8px}' +
  '.src-chip{display:inline-block;border:1px solid #ef4444;color:#b91c1c;border-radius:12px;padding:0 7px;margin:1px;font-size:9px}.src-p{white-space:pre-line;margin:0}' +
  '.src-sign{break-inside:avoid;page-break-inside:avoid;break-after:avoid;page-break-after:avoid;display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:14px}.src-sign div{border-top:1px solid #9ca3af;padding-top:3px;text-align:center;font-size:9px;color:#4b5563;min-height:34px}.src-sign b{display:block;color:#1f2433;font-size:9.5px}' +
  '.src-foot{break-inside:avoid;margin-top:7px;border-top:2px solid var(--ac);padding-top:3px;display:flex;justify-content:space-between;gap:8px;font-size:8px;color:#6b7280}.src-ctrl{color:#b91c1c;font-weight:bold}' +
  '.src-wm{position:absolute;top:42%;left:0;right:0;text-align:center;font-size:54px;font-weight:bold;color:rgba(239,68,68,.12);transform:rotate(-24deg);pointer-events:none}';
function srEnsureCss() { if (!document.getElementById('srCardCss')) { const s = document.createElement('style'); s.id = 'srCardCss'; s.textContent = SR_CARD_CSS + MN_CSS; document.head.appendChild(s); } }
function srCost(d) {
  const line = function (g) { return (+g.qty || 0) * (+g.price || 0); };
  const ing = (d.ings || []).reduce(function (s, g) { return s + line(g); }, 0), mar = ((d.marinade && d.marinade.ings) || []).reduce(function (s, g) { return s + line(g); }, 0);
  const total = ing + mar, y = +d.yield || 1;
  return { ing: ing, mar: mar, total: total, portion: total / y, pct: +d.sellPrice > 0 ? total / y / +d.sellPrice * 100 : null };
}
function srQ(v) { v = +v || 0; return nf(v, v % 1 ? (Math.abs(v) < 1 ? 3 : 2) : 0); }
function srCardHtml(row, o) {
  o = o || {}; const c = srCfg(), d = row.data || {}, cost = srCost(d), showCost = o.showCost !== undefined ? o.showCost : c.showCost;
  const logo = mgLogo(), cur = h(curName());
  const fact = function (l, v) { return v ? '<div><small>' + l + '</small><b>' + h(v) + '</b></div>' : ''; };
  const ingRows = function (list, withCost) {
    return (list || []).filter(function (g) { return g.name; }).map(function (g, i) {
      return '<tr><td class="n">' + (i + 1) + '</td><td>' + h(g.name) + '</td><td class="n">' + srQ(g.qty) + '</td><td>' + h(g.unit || '') + '</td><td>' + h(g.note || '') + '</td>' + (withCost ? '<td class="n">' + nf((+g.qty || 0) * (+g.price || 0)) + '</td>' : '') + '</tr>';
    }).join('');
  };
  const th = '<tr><th class="n" style="width:22px">#</th><th>المادة</th><th class="n">الكمية</th><th>الوحدة</th><th>ملاحظات التجهيز</th>' + (showCost ? '<th class="n">التكلفة</th>' : '') + '</tr>';
  const mar = d.marinade || {}, hasMar = (mar.ings || []).some(function (g) { return g.name; }) || mar.method || mar.time;
  const steps = (d.steps || []).filter(function (s) { return String(s || '').trim(); });
  const appr = d.status === 'approved';
  return '<div class="src" style="--ac:' + h(c.color || '#b48554') + '">' + (appr ? '' : '<div class="src-wm">' + (d.status === 'pending' ? 'بانتظار الاعتماد' : 'غير معتمدة') + '</div>') +
    '<div class="src-head">' + (logo ? '<img class="src-logo" src="' + h(mgImg(logo)) + '" alt="">' : '') + '<div class="src-org"><b>' + h(mgRest()) + '</b><span>' + h(c.subtitle || SR_CFG_DEF.subtitle) + '</span></div>' +
    '<div class="src-no">رقم الوصفة<b>' + h(d.no || '—') + '</b>الإصدار ' + (+d.version || 0) + (d.approvedAt ? ' · ' + dOnly(d.approvedAt) : '') + '</div></div>' +
    '<div class="src-title"><h1>' + h(row.title) + '</h1>' + (d.category ? '<span class="src-cat">' + h(d.category) + '</span>' : '') + '</div>' +
    '<div class="src-top">' + (d.image ? '<img class="src-img" src="' + h(mgImg(d.image)) + '" alt="">' : '<div class="src-noimg">لا توجد صورة</div>') +
    '<div class="src-facts">' + fact('عدد الحصص', d.yield ? srQ(d.yield) + ' حصة' : '') + fact('وزن / حجم الحصة', d.portion ? srQ(d.portion) + ' ' + (d.portionUnit || '') : '') +
    fact('وقت التحضير', d.prepTime ? d.prepTime + ' دقيقة' : '') + fact('وقت الطهي', d.cookTime ? d.cookTime + ' دقيقة' : '') + fact('المحطة', d.station) + fact('درجة حرارة التقديم', d.servingTemp) +
    fact('مدة الصلاحية', d.shelfLife) + fact('طريقة الحفظ', d.storage) + fact('إعداد', d.preparedBy) + fact('الاعتماد', appr ? (d.approvedBy || '') : '') +
    (showCost ? fact('تكلفة الحصة', nf(cost.portion) + ' ' + curName()) + fact('سعر البيع / النسبة', d.sellPrice ? nf(d.sellPrice) + ' ' + curName() + (cost.pct !== null ? ' · ' + nf(cost.pct, 1) + '%' : '') : '') : '') + '</div></div>' +
    '<h3>المقادير (لكامل الوصفة)</h3><table><thead>' + th + '</thead><tbody>' + (ingRows(d.ings, showCost) || '<tr><td colspan="6">—</td></tr>') + '</tbody>' +
    (showCost ? '<tfoot><tr><td colspan="5">إجمالي تكلفة المقادير</td><td class="n">' + nf(cost.ing) + ' ' + cur + '</td></tr></tfoot>' : '') + '</table>' +
    (hasMar ? '<h3>التتبيلة' + (mar.time ? ' · مدة التتبيل: ' + h(mar.time) : '') + '</h3><div class="src-box">' +
      ((mar.ings || []).some(function (g) { return g.name; }) ? '<table><thead>' + th + '</thead><tbody>' + ingRows(mar.ings, showCost) + '</tbody></table>' : '') +
      (mar.method ? '<p class="src-p" style="margin-top:4px"><b>طريقة التتبيل: </b>' + h(mar.method) + '</p>' : '') + '</div>' : '') +
    (steps.length ? '<h3>طريقة التحضير</h3><ol>' + steps.map(function (s) { return '<li>' + h(s) + '</li>'; }).join('') + '</ol>' : '') +
    ((d.plating || d.equipment) ? '<div class="src-two">' + (d.plating ? '<div><h3>طريقة التقديم والتزيين</h3><p class="src-p">' + h(d.plating) + '</p></div>' : '') + (d.equipment ? '<div><h3>الأدوات والمعدات</h3><p class="src-p">' + h(d.equipment) + '</p></div>' : '') + '</div>' : '') +
    ((d.ccp || (d.allergens || []).length) ? '<div class="src-two">' + (d.ccp ? '<div><h3>نقاط التحكم الحرجة وسلامة الغذاء</h3><p class="src-p">' + h(d.ccp) + '</p></div>' : '') +
      ((d.allergens || []).length ? '<div><h3>مسببات الحساسية</h3>' + d.allergens.map(function (a) { return '<span class="src-chip">' + h(a) + '</span>'; }).join('') + '</div>' : '') + '</div>' : '') +
    (d.notes ? '<h3>ملاحظات</h3><p class="src-p">' + h(d.notes) + '</p>' : '') +
    '<div class="src-sign"><div><b>أعدّها</b>' + h(d.preparedBy || d.createdBy || '') + '</div><div><b>راجعها</b>' + h(c.chefLabel || 'الشيف التنفيذي') + '</div><div><b>اعتمدها (صاحب الحساب)</b>' + (appr ? h(d.approvedBy || '') + '<br>' + dOnly(d.approvedAt) : '') + '</div></div>' +
    '<div class="src-foot"><span class="src-ctrl">وثيقة مضبوطة — يُمنع التعديل أو النسخ دون اعتماد صاحب الحساب</span><span>' + h(c.footer || '') + '</span><span>' + h(d.no || '') + ' · v' + (+d.version || 0) + ' · طُبعت ' + dOnly(new Date()) + '</span></div></div>';
}
function srPrint(rows, paper) {
  const c = srCfg(), p = SR_PAPERS[paper || c.paper] || SR_PAPERS.b5;
  mgPrintWin(rows.length === 1 ? 'وصفة قياسية ' + (rows[0].data.no || '') + ' - ' + rows[0].title : 'الوصفات القياسية - ' + mgRest(), rows.map(function (r) { return srCardHtml(r); }).join(''), SR_CARD_CSS + '.src{width:100%;font-size:10px;line-height:1.45}.src-sign div{min-height:28px}', p[1]);
}

// ============================================================
// صفحة الوصفات القياسية
// ============================================================
bizPage('stdrecipes', { group: 'admin', title: 'الوصفات القياسية', icon: 'book-open', feature: 'std_recipes', perms: ['costing', 'ops', 'ops_check', 'kitchen'], plan: 'premium',
  sub: 'بطاقات وصفات قياسية مرقّمة وجاهزة للطباعة بشعار المطعم (B5 / A4 / A5) — أي تعديل بعد الإنشاء يحتاج موافقة صاحب الحساب.',
  pitch: 'إنشاء الوصفات القياسية بالمقادير من المواد الأولية، التتبيل وطريقة التحضير، الصور من المنيو، واعتماد صاحب الحساب وطباعة البطاقة.',
  render: async function (body) {
    srEnsureCss();
    const rs = await Promise.all([mgList('std_recipe'), mgList('sr_cfg').catch(function () { return []; })]);
    MG.srRows = rs[0]; MG.cfg = rs[1][0] || null;
    srRenderList(body);
  } });
function srCanWrite() { return canP('costing', 'ops'); }
function srRenderList(body) {
  const rows = MG.srRows || [], own = B.acc.isOwner;
  const cnt = function (f) { return rows.filter(f).length; };
  const pend = cnt(function (r) { return r.data.status === 'pending' || r.data.change; });
  const cats = Array.from(new Set(rows.map(function (r) { return r.data.category; }).filter(Boolean)));
  body.innerHTML = kpis([['إجمالي الوصفات', rows.length], ['معتمدة', cnt(function (r) { return r.data.status === 'approved'; }), '', '#10b981'], ['بانتظار الموافقة', pend, own && pend ? 'تحتاج قرارك' : '', pend ? '#f59e0b' : ''], ['مسودات', cnt(function (r) { return r.data.status === 'draft' || r.data.status === 'rejected'; })]]) +
    '<div class="biz-toolbar"><input class="biz-search grow" id="srQ" placeholder="بحث بالاسم أو الرقم">' +
    '<select class="biz-search" id="srF" style="min-width:140px"><option value="">كل الحالات</option>' + Object.keys(SR_ST).map(function (k) { return '<option value="' + k + '">' + SR_ST[k][0] + '</option>'; }).join('') + '<option value="change">طلبات تعديل</option></select>' +
    (cats.length ? '<select class="biz-search" id="srC" style="min-width:130px"><option value="">كل التصنيفات</option>' + cats.map(function (c) { return '<option>' + h(c) + '</option>'; }).join('') + '</select>' : '') +
    (srCanWrite() ? '<button class="btn btn-success btn-sm" id="srNew"><i class="fas fa-plus"></i> وصفة قياسية جديدة</button>' : '') +
    '<button class="btn btn-outline btn-sm" id="srPrAll"><i class="fas fa-print"></i> طباعة المعتمدة</button>' +
    (own ? '<button class="btn btn-outline btn-sm" id="srCfg"><i class="fas fa-sliders-h"></i> إعدادات البطاقة</button>' : '') + '</div>' +
    (own && pend ? '<div class="sr-alert"><i class="fas fa-user-shield"></i> لديك ' + pend + ' وصفة/تعديل بانتظار موافقتك. لا يُطبَّق أي تعديل على الوصفة المعتمدة إلا بعد موافقتك.</div>' : '') +
    (!own ? '<div class="sr-note"><i class="fas fa-lock"></i> الوصفات المعتمدة مقفلة: أي تعديل تقترحه يُرسل لصاحب الحساب ولا يُطبّق إلا بعد موافقته.</div>' : '') +
    '<div class="sr-grid" id="srGrid"></div>';
  const grid = body.querySelector('#srGrid');
  const draw = function () {
    const q = body.querySelector('#srQ').value.trim().toLowerCase(), f = body.querySelector('#srF').value, cs = body.querySelector('#srC') ? body.querySelector('#srC').value : '';
    const list = rows.filter(function (r) {
      if (q && (r.title + ' ' + (r.data.no || '')).toLowerCase().indexOf(q) < 0) return false;
      if (f === 'change') return !!r.data.change;
      if (f && r.data.status !== f) return false;
      if (cs && r.data.category !== cs) return false;
      return true;
    }).sort(function (a, b) { return String(a.data.no || '').localeCompare(String(b.data.no || '')); });
    grid.innerHTML = list.length ? list.map(function (r) {
      const d = r.data, cost = srCost(d);
      return '<div class="sr-card" data-v="' + r.id + '">' + (d.image ? '<div class="sr-thumb" style="background-image:url(\'' + h(mgImg(d.image)) + '\')"></div>' : '<div class="sr-thumb sr-thumb-empty"><i class="fas fa-utensils"></i></div>') +
        '<div class="sr-meta"><div class="sr-no">' + h(d.no || '') + ' · v' + (+d.version || 0) + '</div><b>' + h(r.title) + '</b><div class="sr-chips">' + mgStBadge(d.status) + (d.change ? '<span class="sr-st" style="--c:#8b5cf6">طلب تعديل</span>' : '') + (d.category ? '<span class="sr-cat">' + h(d.category) + '</span>' : '') + '</div>' +
        '<div class="sr-sub">' + ((d.ings || []).length) + ' مادة · ' + ((d.steps || []).length) + ' خطوة' + (canP('costing') && cost.total ? ' · تكلفة الحصة ' + money(cost.portion) : '') + '</div></div></div>';
    }).join('') : '<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-book-open" style="font-size:2rem;opacity:.5"></i><p style="margin-top:10px">' + (rows.length ? 'لا توجد نتائج' : 'لم تُنشأ وصفات قياسية بعد — ابدأ بإنشاء أول وصفة واستورد مقاديرها من وصفات التكلفة') + '</p></div>';
  };
  ['#srQ', '#srF', '#srC'].forEach(function (s) { const e = body.querySelector(s); if (e) e.addEventListener('input', draw); });
  draw();
  const reload = async function () { MG.srRows = await mgList('std_recipe'); srRenderList(body); };
  body.onclick = function (e) {
    const v = e.target.closest('[data-v]');
    if (v) srView(rows.find(function (r) { return r.id === v.dataset.v; }), reload);
    if (e.target.closest('#srNew')) srEdit(null, reload);
    if (e.target.closest('#srCfg')) srSettings(function () { srRenderList(body); });
    if (e.target.closest('#srPrAll')) {
      const ap = rows.filter(function (r) { return r.data.status === 'approved'; });
      if (!ap.length) { showToast('لا توجد وصفات معتمدة للطباعة', true); return; }
      srPrintPicker(ap);
    }
  };
}
function srPrintPicker(rows) {
  const c = srCfg();
  bModal({ title: 'طباعة بطاقات الوصفات', icon: 'print', sub: rows.length + ' وصفة',
    body: '<div class="biz-form"><div><label class="pro-label">مقاس الورق</label><div class="pro-input-wrap"><select id="ppP">' + Object.keys(SR_PAPERS).map(function (k) { return '<option value="' + k + '"' + (k === c.paper ? ' selected' : '') + '>' + SR_PAPERS[k][0] + '</option>'; }).join('') + '</select></div></div></div>' +
      '<div class="sr-pick">' + rows.map(function (r) { return '<label class="biz-check"><input type="checkbox" data-pp="' + r.id + '" checked> <span>' + h(r.data.no + ' — ' + r.title) + '</span></label>'; }).join('') + '</div>',
    foot: '<button class="btn btn-cancel" data-x>إلغاء</button><button class="btn btn-primary" data-act="go"><i class="fas fa-print"></i> طباعة</button>',
    actions: { go: function (m) { const ids = m.$$('[data-pp]').filter(function (x) { return x.checked; }).map(function (x) { return x.dataset.pp; }); if (!ids.length) return; srPrint(rows.filter(function (r) { return ids.indexOf(r.id) >= 0; }), m.$('#ppP').value); m.close(); } } });
}
function srView(row, reload) {
  if (!row) return;
  const d = row.data, own = B.acc.isOwner, canW = srCanWrite();
  const decidable = own && (d.change || d.status === 'pending');
  const c = srCfg();
  bModal({ title: row.title, icon: 'book-open', sub: (d.no || '') + ' · الإصدار ' + (+d.version || 0) + ' · ' + (SR_ST[d.status] || SR_ST.draft)[0], xwide: true, print: false,
    body: (d.change ? '<div class="sr-alert"><i class="fas fa-code-compare"></i> يوجد طلب تعديل مقدَّم من <b>' + h(d.change.by) + '</b> بتاريخ ' + dt(d.change.at) + (d.change.note ? ' — ' + h(d.change.note) : '') + (own ? '' : '. سيُطبق بعد موافقة صاحب الحساب.') + '</div>' : '') +
      (d.status === 'rejected' && d.rejectNote ? '<div class="sr-alert" style="--c:#ef4444"><i class="fas fa-times-circle"></i> سبب الرفض: ' + h(d.rejectNote) + '</div>' : '') +
      '<div class="sr-paper-bar"><label>المقاس <select id="svP">' + Object.keys(SR_PAPERS).map(function (k) { return '<option value="' + k + '"' + (k === c.paper ? ' selected' : '') + '>' + SR_PAPERS[k][0] + '</option>'; }).join('') + '</select></label></div>' +
      '<div class="sr-preview" id="svPrev">' + srCardHtml(row) + '</div>',
    foot: '<button class="btn btn-cancel" data-x>إغلاق</button>' +
      (own ? '<button class="btn btn-outline" data-act="del" style="color:#f87171"><i class="fas fa-trash"></i> حذف</button>' : '') +
      '<button class="btn btn-outline" data-act="hist"><i class="fas fa-history"></i> السجل</button>' +
      (canW ? '<button class="btn btn-outline" data-act="dup"><i class="fas fa-copy"></i> نسخ كوصفة جديدة</button>' : '') +
      (decidable ? '<button class="btn btn-warning" data-act="decide"><i class="fas fa-user-shield"></i> مراجعة واعتماد</button>' : '') +
      (canW ? '<button class="btn btn-outline" data-act="edit"><i class="fas fa-' + (own ? 'pen' : 'paper-plane') + '"></i> ' + (own ? 'تعديل' : (d.status === 'approved' || d.version > 0 ? 'طلب تعديل' : 'تعديل')) + '</button>' : '') +
      '<button class="btn btn-primary" data-act="print"><i class="fas fa-print"></i> طباعة البطاقة</button>',
    onOpen: function (m) { m.$('#svP').onchange = function () { const p = SR_PAPERS[m.$('#svP').value]; m.$('#svPrev').style.maxWidth = p[1].split(' ')[0]; }; m.$('#svPrev').style.maxWidth = SR_PAPERS[c.paper] ? SR_PAPERS[c.paper][1].split(' ')[0] : '176mm'; },
    actions: {
      print: function (m) { srPrint([row], m.$('#svP').value); },
      edit: function (m) { m.close(); srEdit(row, reload); },
      dup: function (m) { m.close(); const cp = mgClone(row); delete cp.id; cp.title = row.title + ' (نسخة)'; srEdit(cp, reload, true); },
      hist: function () { srHistory(row); },
      decide: function (m) { m.close(); srDecide(row, reload); },
      del: async function (m) { if (!(await bConfirm('حذف الوصفة القياسية «' + row.title + '» نهائياً؟'))) return; await bzOk('mgmtDelete', { id: row.id }); showToast('تم الحذف'); m.close(); reload(); },
    } });
}
function srHistory(row) {
  const hs = (row.data.history || []).slice().reverse();
  bModal({ title: 'سجل الإصدارات', icon: 'history', sub: row.title, body: bTable([{ label: 'الإصدار', r: function (x) { return '<b>v' + (x.v || 0) + '</b>'; } }, { label: 'التاريخ', r: function (x) { return dt(x.at); } }, { label: 'بواسطة', r: function (x) { return h(x.by || ''); } }, { label: 'البيان', r: function (x) { return h(x.note || ''); } }], hs, { empty: 'لا يوجد سجل بعد' }) +
    '<p class="muted" style="margin-top:8px">أُنشئت بواسطة ' + h(row.data.createdBy || row.createdBy || '') + ' في ' + dt(row.createdAt) + '</p>' });
}
// مقارنة التعديل المقترح مع النسخة المعتمدة
const SR_FIELDS = [['title', 'الاسم'], ['category', 'التصنيف'], ['recipeName', 'وصفة التكلفة المرتبطة'], ['yield', 'عدد الحصص'], ['portion', 'وزن الحصة'], ['portionUnit', 'وحدة الحصة'], ['prepTime', 'وقت التحضير'], ['cookTime', 'وقت الطهي'], ['station', 'المحطة'], ['servingTemp', 'حرارة التقديم'], ['shelfLife', 'الصلاحية'], ['storage', 'الحفظ'], ['preparedBy', 'المسؤول عن الإعداد'], ['image', 'الصورة'], ['sellPrice', 'سعر البيع'], ['plating', 'التقديم'], ['equipment', 'المعدات'], ['ccp', 'نقاط التحكم الحرجة'], ['notes', 'ملاحظات']];
function srIngTxt(list) { return (list || []).filter(function (g) { return g.name; }).map(function (g) { return g.name + ' ' + srQ(g.qty) + ' ' + (g.unit || '') + (g.note ? ' (' + g.note + ')' : ''); }).join('\n'); }
function srDiff(oldRow, nw, ntitle) {
  const o = oldRow.data || {}, rows = [];
  const add = function (l, a, b) { a = a === undefined || a === null ? '' : String(a); b = b === undefined || b === null ? '' : String(b); if (a !== b) rows.push([l, a, b]); };
  SR_FIELDS.forEach(function (f) { if (f[0] === 'title') add(f[1], oldRow.title, ntitle); else add(f[1], o[f[0]], nw[f[0]]); });
  add('المقادير', srIngTxt(o.ings), srIngTxt(nw.ings));
  add('مقادير التتبيلة', srIngTxt((o.marinade || {}).ings), srIngTxt((nw.marinade || {}).ings));
  add('مدة التتبيل', (o.marinade || {}).time, (nw.marinade || {}).time); add('طريقة التتبيل', (o.marinade || {}).method, (nw.marinade || {}).method);
  add('طريقة التحضير', (o.steps || []).map(function (s, i) { return (i + 1) + '. ' + s; }).join('\n'), (nw.steps || []).map(function (s, i) { return (i + 1) + '. ' + s; }).join('\n'));
  add('مسببات الحساسية', (o.allergens || []).join('، '), (nw.allergens || []).join('، '));
  return rows;
}
function srDecide(row, reload) {
  const d = row.data, isChange = !!d.change;
  const diff = isChange ? srDiff(row, d.change.data || {}, d.change.title) : [];
  const preview = isChange ? { id: row.id, title: d.change.title, data: Object.assign({}, d.change.data, { no: d.no, version: d.version, status: 'pending' }) } : row;
  bModal({ title: isChange ? 'مراجعة طلب تعديل' : 'اعتماد وصفة قياسية', icon: 'user-shield', xwide: true, print: false, sub: (d.no || '') + ' · ' + row.title,
    body: (isChange ? '<div class="sr-alert"><i class="fas fa-user"></i> مقدَّم من <b>' + h(d.change.by) + '</b> · ' + dt(d.change.at) + (d.change.note ? '<br>سبب التعديل: ' + h(d.change.note) : '') + '</div>' +
      (diff.length ? '<div class="table-container biz-table"><table><thead><tr><th>البند</th><th>النسخة المعتمدة الحالية</th><th>التعديل المقترح</th></tr></thead><tbody>' + diff.map(function (x) { return '<tr><td><b>' + h(x[0]) + '</b></td><td class="sr-old">' + (x[0] === 'الصورة' ? (x[1] ? '<img src="' + h(mgImg(x[1])) + '" style="max-height:70px">' : '—') : h(x[1] || '—')) + '</td><td class="sr-new">' + (x[0] === 'الصورة' ? (x[2] ? '<img src="' + h(mgImg(x[2])) + '" style="max-height:70px">' : '—') : h(x[2] || '—')) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<p class="muted">لا توجد فروقات في المحتوى.</p>') : '') +
      '<h4 style="margin:12px 0 6px">معاينة البطاقة بعد الاعتماد</h4><div class="sr-preview">' + srCardHtml(preview) + '</div>' +
      '<div class="biz-form" style="margin-top:10px"><div class="full"><label class="pro-label">ملاحظة القرار (اختياري)</label><div class="pro-input-wrap"><input id="dcNote" placeholder="مثال: معتمد — يُطبّق من الغد"></div></div></div>',
    foot: '<button class="btn btn-cancel" data-x>إغلاق</button><button class="btn btn-danger" data-act="rej"><i class="fas fa-times"></i> رفض</button><button class="btn btn-success" data-act="ok"><i class="fas fa-check"></i> موافقة واعتماد</button>',
    actions: {
      ok: async function (m) { await bzOk('stdRecipeDecide', { id: row.id, action: 'approve', note: m.$('#dcNote').value }); showToast('تم الاعتماد وإصدار نسخة جديدة'); m.close(); reload(); },
      rej: async function (m) { await bzOk('stdRecipeDecide', { id: row.id, action: 'reject', note: m.$('#dcNote').value }); showToast('تم الرفض'); m.close(); reload(); },
    } });
}
function srSettings(done) {
  const c = srCfg();
  let logo = c.logo || '';
  const F = [{ k: 'subtitle', label: 'العنوان الفرعي للبطاقة', full: true }, { k: 'color', label: 'لون البطاقة', type: 'color' }, { k: 'paper', label: 'مقاس الطباعة الافتراضي', type: 'select', options: Object.keys(SR_PAPERS).map(function (k) { return [k, SR_PAPERS[k][0]]; }) },
    { k: 'chefLabel', label: 'مسمى المراجِع (التوقيع الثاني)' }, { k: 'footer', label: 'نص التذييل (عنوان / سجل تجاري / هاتف)', full: true }, { k: 'showCost', label: 'إظهار التكلفة وسعر البيع في البطاقة المطبوعة', type: 'checkbox', full: true, hint: 'يُنصح بإخفائها في بطاقات المطبخ' }];
  const logoBox = function () { const l = logo || mgLogo(); return '<div class="sr-logo-box">' + (l ? '<img src="' + h(mgImg(l)) + '" alt="">' : '<span class="muted">لا يوجد شعار</span>') + '</div>'; };
  bPrompt('إعدادات بطاقة الوصفة', F, c, async function (d) {
    d.logo = logo;
    const r = await bzOk('mgmtSave', { kind: 'sr_cfg', data: { title: 'sr_cfg', data: d } });
    MG.cfg = r.row; showToast('تم الحفظ'); done && done();
  }, { icon: 'sliders-h', wide: true, extra: '<div class="biz-sec" style="margin-top:12px">شعار المطعم في البطاقة</div><div class="sr-logo-row"><div id="lgBox">' + logoBox() + '</div><button type="button" class="btn btn-outline btn-sm" data-act="lgUp"><i class="fas fa-upload"></i> رفع شعار</button><button type="button" class="btn btn-outline btn-sm" data-act="lgClr"><i class="fas fa-times"></i> استخدام شعار الحساب</button></div><p class="biz-hint">إن لم تحدد شعاراً هنا يُستخدم الشعار المحفوظ في الإعدادات ← بيانات المنشأة.</p>',
    actions: {
      lgUp: function (m) { mgPickFile(async function (f) { const u = await mgUploadImg(f, 500, /png|svg/.test(f.type)); if (u) { logo = u; m.$('#lgBox').innerHTML = logoBox(); } }); },
      lgClr: function (m) { logo = ''; m.$('#lgBox').innerHTML = logoBox(); },
    } });
}

// ---------- محرر الوصفة القياسية ----------
async function srEdit(row, reload, isCopy) {
  await mgLoadMats();
  mgLoadMenu().catch(function () { });
  const own = B.acc.isOwner, isNew = !row || !row.id;
  const locked = !isNew && !own && (row.data.status === 'approved' || +row.data.version > 0 || row.createdBy !== (B.acc.staff ? B.acc.staff.name : ''));
  const base = row ? (row.data.change && !own ? row.data.change.data : row.data) : {};
  const d = Object.assign({ ings: [], marinade: { ings: [], time: '', method: '' }, steps: [''], allergens: [], yield: 1, portionUnit: 'غرام' }, mgClone(base));
  if (!d.marinade) d.marinade = { ings: [], time: '', method: '' };
  if (!Array.isArray(d.marinade.ings)) d.marinade.ings = [];
  if (!d.steps || !d.steps.length) d.steps = [''];
  if (!d.preparedBy && isNew) d.preparedBy = B.acc.staff ? B.acc.staff.name : '';
  const title0 = row ? (row.data.change && !own ? row.data.change.title : row.title) : '';
  const recOpts = '<option value="">— بدون ربط —</option>' + (MG.recipes || []).map(function (r) { return '<option' + (r.name === d.recipeName ? ' selected' : '') + '>' + h(r.name) + '</option>'; }).join('');
  const inp = function (k, l, o) { o = o || {}; return '<div class="' + (o.full ? 'full' : '') + '"><label class="pro-label">' + l + (o.req ? ' <span style="color:#ef4444">*</span>' : '') + '</label><div class="pro-input-wrap">' + (o.ta ? '<textarea data-sk="' + k + '" rows="' + (o.rows || 3) + '" placeholder="' + h(o.ph || '') + '">' + h(d[k] || '') + '</textarea>' : '<input data-sk="' + k + '" type="' + (o.type || 'text') + '"' + (o.type === 'number' ? ' step="any" dir="ltr"' : '') + (o.list ? ' list="' + o.list + '"' : '') + ' value="' + h(k === 'title' ? title0 : (d[k] === undefined || d[k] === null ? '' : d[k])) + '" placeholder="' + h(o.ph || '') + '">') + '</div></div>'; };
  const cats = Array.from(new Set((MG.srRows || []).map(function (r) { return r.data.category; }).concat((MG.menu || []).map(function (x) { return x.category; })).filter(function (x) { return x && x !== 'الكل'; })));
  const body = (locked ? '<div class="sr-alert"><i class="fas fa-lock"></i> هذه الوصفة معتمدة/مقفلة — سيُرسل تعديلك كطلب إلى صاحب الحساب ولن يُطبّق إلا بعد موافقته.</div>' : '') +
    '<datalist id="srMatList">' + (MG.mats || []).map(function (m) { return '<option value="' + h(m.name) + '">' + h(m.unit || '') + '</option>'; }).join('') + '</datalist>' +
    '<datalist id="srCatList">' + cats.map(function (c) { return '<option value="' + h(c) + '">'; }).join('') + '</datalist>' +
    '<datalist id="srStList">' + SR_STATIONS.map(function (c) { return '<option value="' + h(c) + '">'; }).join('') + '</datalist>' +
    '<div class="sr-ed-top"><div class="sr-ed-img"><div id="srImg"></div><div class="sr-img-btns"><button type="button" class="btn btn-outline btn-sm" data-act="imgMenu"><i class="fas fa-book-open"></i> من المنيو</button><button type="button" class="btn btn-outline btn-sm" data-act="imgUp"><i class="fas fa-upload"></i> رفع صورة</button><button type="button" class="btn btn-outline btn-sm" data-act="imgUrl"><i class="fas fa-link"></i> رابط</button><button type="button" class="ico-btn" data-act="imgClr" title="إزالة"><i class="fas fa-times"></i></button></div></div>' +
    '<div class="biz-form" style="flex:1">' + inp('title', 'اسم الوصفة', { req: true, full: true }) +
    (row && row.data.no && !isCopy ? '<div><label class="pro-label">رقم الوصفة</label><div class="pro-input-wrap"><input value="' + h(row.data.no) + '" readonly dir="ltr"></div></div>' : '<div><label class="pro-label">رقم الوصفة</label><div class="pro-input-wrap"><input value="يُولَّد تلقائياً (SR-0001)" readonly></div></div>') +
    inp('category', 'التصنيف', { list: 'srCatList' }) +
    '<div class="full"><label class="pro-label">ربط بوصفة التكلفة</label><div class="pro-input-wrap sr-inline"><select data-sk="recipeName">' + recOpts + '</select><button type="button" class="btn btn-outline btn-sm" data-act="imp"><i class="fas fa-file-import"></i> استيراد المقادير</button></div></div>' +
    inp('yield', 'عدد الحصص (الناتج)', { type: 'number' }) + '<div><label class="pro-label">وزن / حجم الحصة</label><div class="pro-input-wrap sr-inline"><input data-sk="portion" type="number" step="any" dir="ltr" value="' + h(d.portion || '') + '"><select data-sk="portionUnit">' + ['غرام', 'كغ', 'مل', 'لتر', 'حبة', 'شريحة', 'كوب'].map(function (u) { return '<option' + (u === d.portionUnit ? ' selected' : '') + '>' + u + '</option>'; }).join('') + '</select></div></div>' +
    inp('prepTime', 'وقت التحضير (دقيقة)', { type: 'number' }) + inp('cookTime', 'وقت الطهي (دقيقة)', { type: 'number' }) +
    '</div></div>' +
    '<div class="biz-form" style="margin-top:6px">' + inp('station', 'المحطة / القسم', { list: 'srStList' }) + inp('preparedBy', 'المسؤول عن إعداد الوصفة', { ph: 'اسم الشيف أو المسؤول' }) +
    inp('servingTemp', 'درجة حرارة التقديم', { ph: 'مثال: 65°C فأعلى' }) + inp('shelfLife', 'مدة الصلاحية', { ph: 'مثال: 24 ساعة مبرد' }) + inp('storage', 'طريقة الحفظ', { ph: 'مثال: حاوية محكمة ≤ 4°C', full: true }) + '</div>' +
    '<div class="biz-sec">المقادير (من المواد الأولية)</div><div id="srIngs"></div>' +
    '<div class="biz-sec">التتبيلة</div><div class="biz-form">' + '<div><label class="pro-label">مدة التتبيل</label><div class="pro-input-wrap"><input data-mk="time" value="' + h(d.marinade.time || '') + '" placeholder="مثال: 4 - 12 ساعة في الثلاجة"></div></div><div></div>' +
    '<div class="full"><label class="pro-label">طريقة التتبيل</label><div class="pro-input-wrap"><textarea data-mk="method" rows="3" placeholder="اكتب طريقة التتبيل خطوة بخطوة">' + h(d.marinade.method || '') + '</textarea></div></div></div><div id="srMar"></div>' +
    '<div class="biz-sec">طريقة التحضير (خطوات)</div><div id="srSteps"></div>' +
    '<div class="biz-form">' + inp('plating', 'طريقة التقديم والتزيين', { ta: true, full: true }) + inp('equipment', 'الأدوات والمعدات', { ta: true, rows: 2 }) + inp('ccp', 'نقاط التحكم الحرجة (HACCP)', { ta: true, rows: 2, ph: 'مثال: حرارة قلب الدجاج 74°C' }) +
    '<div class="full"><label class="pro-label">مسببات الحساسية</label><div class="sr-allg">' + SR_ALLERGENS.map(function (a) { return '<label class="sr-allg-i"><input type="checkbox" data-al="' + h(a) + '"' + (d.allergens.indexOf(a) >= 0 ? ' checked' : '') + '> ' + h(a) + '</label>'; }).join('') + '</div></div>' +
    (canP('costing') ? inp('sellPrice', 'سعر البيع (لحساب نسبة التكلفة)', { type: 'number' }) : '') + inp('notes', 'ملاحظات', { ta: true, rows: 2, full: true }) + '</div>' +
    (locked || (!isNew && own) ? '<div class="biz-form"><div class="full"><label class="pro-label">سبب التعديل ' + (locked ? '<span style="color:#ef4444">*</span>' : '') + '</label><div class="pro-input-wrap"><input id="srNote" placeholder="يظهر لصاحب الحساب وفي سجل الإصدارات"></div></div></div>' : '');
  const ingTable = function (list, key) {
    const showC = canP('costing');
    return '<div class="table-container biz-table"><table class="sr-ing"><thead><tr><th>#</th><th>المادة</th><th class="num">الكمية</th><th>الوحدة</th>' + (showC ? '<th class="num">سعر الوحدة</th><th class="num">التكلفة</th>' : '') + '<th>ملاحظات التجهيز</th><th></th></tr></thead><tbody>' +
      list.map(function (g, i) {
        return '<tr><td>' + (i + 1) + '</td><td><input data-tb="' + key + '" data-i="' + i + '" data-f="name" list="srMatList" value="' + h(g.name || '') + '" placeholder="اختر من المواد الأولية أو اكتب" class="' + (g.materialId ? 'sr-linked' : '') + '"></td>' +
          '<td><input data-tb="' + key + '" data-i="' + i + '" data-f="qty" type="number" step="any" dir="ltr" value="' + h(g.qty === undefined ? '' : g.qty) + '" style="width:80px"></td><td><input data-tb="' + key + '" data-i="' + i + '" data-f="unit" value="' + h(g.unit || '') + '" style="width:70px"></td>' +
          (showC ? '<td class="num"><input data-tb="' + key + '" data-i="' + i + '" data-f="price" type="number" step="any" dir="ltr" value="' + h(g.price === undefined ? '' : g.price) + '" style="width:80px"></td><td class="num" data-cost="' + key + i + '">' + nf((+g.qty || 0) * (+g.price || 0)) + '</td>' : '') +
          '<td><input data-tb="' + key + '" data-i="' + i + '" data-f="note" value="' + h(g.note || '') + '" placeholder="مثال: مفروم ناعم"></td><td><button type="button" class="ico-btn" data-rm="' + key + '" data-i="' + i + '"><i class="fas fa-trash"></i></button></td></tr>';
      }).join('') + '</tbody></table></div><div class="sr-row-btns"><button type="button" class="btn btn-outline btn-sm" data-add="' + key + '"><i class="fas fa-plus"></i> إضافة مادة</button><button type="button" class="btn btn-outline btn-sm" data-pick="' + key + '"><i class="fas fa-list-check"></i> اختيار من المواد الأولية</button>' +
      (showC ? '<span class="sr-tot" data-tot="' + key + '"></span>' : '') + '</div>';
  };
  const m = bModal({ title: isNew ? 'وصفة قياسية جديدة' : (locked ? 'طلب تعديل وصفة' : 'تعديل وصفة قياسية'), icon: 'book-open', xwide: true, print: false, sub: row && row.data.no && !isCopy ? row.data.no + ' · الإصدار ' + (+row.data.version || 0) : 'تُرقّم تلقائياً عند الحفظ',
    body: body,
    foot: '<button class="btn btn-cancel" data-x>إلغاء</button><button class="btn btn-outline" data-act="prev"><i class="fas fa-eye"></i> معاينة</button>' +
      (own ? '<button class="btn btn-outline" data-act="draft"><i class="fas fa-save"></i> حفظ كمسودة</button><button class="btn btn-primary" data-act="approve"><i class="fas fa-check-double"></i> حفظ واعتماد</button>'
        : '<button class="btn btn-primary" data-act="send"><i class="fas fa-paper-plane"></i> ' + (locked ? 'إرسال طلب التعديل' : 'حفظ وإرسال للاعتماد') + '</button>'),
    actions: {
      imgMenu: function () { srMenuPicker(function (u) { d.image = u; drawImg(); }, title0 || (m.$('[data-sk=title]') || {}).value); },
      imgUp: function () { mgPickFile(async function (f) { const u = await mgUploadImg(f, 1100); if (u) { d.image = u; drawImg(); } }); },
      imgUrl: function () { bPrompt('رابط الصورة', [{ k: 'u', label: 'الرابط', ltr: true, full: true }], { u: d.image && !/^data:/.test(d.image) ? d.image : '' }, function (x) { d.image = x.u; drawImg(); }); },
      imgClr: function () { d.image = ''; drawImg(); },
      imp: async function () {
        const rn = m.$('[data-sk=recipeName]').value; if (!rn) { showToast('اختر وصفة التكلفة أولاً', true); return; }
        const r = await bzOk('getRecipeIngredients', { recipeName: rn });
        const list = (r.ingredients || []).map(function (g) { const mm = (MG.mats || []).find(function (x) { return String(x.id) === String(g.materialId); }) || mgMatByName(g.materialName) || {}; return { materialId: mm.id || g.materialId, name: mm.name || g.materialName, qty: g.quantity, unit: mm.unit || '', price: mm.price || 0, note: '' }; });
        if (!list.length) { showToast('لا توجد مقادير في وصفة التكلفة', true); return; }
        if (d.ings.some(function (g) { return g.name; }) && !(await bConfirm('استبدال المقادير الحالية بمقادير «' + rn + '» (' + list.length + ' مادة)؟'))) return;
        d.ings = list;
        const rec = (MG.recipes || []).find(function (x) { return x.name === rn; });
        if (rec && rec.sellingPrice && !d.sellPrice) { d.sellPrice = rec.sellingPrice; const sp = m.$('[data-sk=sellPrice]'); if (sp) sp.value = rec.sellingPrice; }
        const ti = m.$('[data-sk=title]'); if (ti && !ti.value) ti.value = rn;
        if (!d.image) { const mi = (MG.menu || []).find(function (x) { return (x.recipeName === rn || x.name === rn) && x.imageUrl; }); if (mi) { d.image = mi.imageUrl; drawImg(); } }
        drawIngs(); showToast('تم استيراد ' + list.length + ' مادة');
      },
      prev: function () { collect(); srEnsureCss(); bModal({ title: 'معاينة البطاقة', icon: 'eye', wide: true, print: false, body: '<div class="sr-preview">' + srCardHtml({ title: m.$('[data-sk=title]').value, data: Object.assign({}, d, { no: (row && row.data.no) || 'SR-????', version: row ? row.data.version : 0, status: 'draft' }) }) + '</div>' }); },
      draft: function (mm, b) { save('draft', b); }, approve: function (mm, b) { save('approved', b); }, send: function (mm, b) { save('pending', b); },
    } });
  const drawImg = function () { m.$('#srImg').innerHTML = d.image ? '<img src="' + h(mgImg(d.image)) + '" alt="">' : '<div class="sr-img-empty"><i class="fas fa-image"></i><span>صورة الوصفة</span></div>'; };
  const tot = function () {
    const c = srCost(d), t1 = m.$('[data-tot=ings]'), t2 = m.$('[data-tot=mar]');
    if (t1) t1.innerHTML = 'إجمالي المقادير: <b>' + money(c.ing) + '</b> · تكلفة الحصة: <b>' + money(c.portion) + '</b>' + (c.pct !== null ? ' · نسبة التكلفة: <b>' + nf(c.pct, 1) + '%</b>' : '');
    if (t2) t2.innerHTML = 'تكلفة التتبيلة: <b>' + money(c.mar) + '</b>';
  };
  const drawIngs = function () { m.$('#srIngs').innerHTML = ingTable(d.ings, 'ings'); m.$('#srMar').innerHTML = ingTable(d.marinade.ings, 'mar'); tot(); };
  const drawSteps = function () {
    m.$('#srSteps').innerHTML = d.steps.map(function (s, i) { return '<div class="sr-step"><span class="sr-step-n">' + (i + 1) + '</span><textarea data-st="' + i + '" rows="2" placeholder="اكتب الخطوة ' + (i + 1) + '">' + h(s) + '</textarea><div class="sr-step-b"><button type="button" class="ico-btn" data-mv="-1" data-i="' + i + '" title="أعلى"><i class="fas fa-arrow-up"></i></button><button type="button" class="ico-btn" data-mv="1" data-i="' + i + '" title="أسفل"><i class="fas fa-arrow-down"></i></button><button type="button" class="ico-btn" data-sd="' + i + '" title="حذف"><i class="fas fa-trash"></i></button></div></div>'; }).join('') +
      '<button type="button" class="btn btn-outline btn-sm" data-sadd><i class="fas fa-plus"></i> إضافة خطوة</button>';
  };
  const listOf = function (k) { return k === 'mar' ? d.marinade.ings : d.ings; };
  const collect = function () {
    m.$$('[data-sk]').forEach(function (e) { const k = e.dataset.sk; if (k === 'title') return; d[k] = e.type === 'number' ? (e.value === '' ? '' : parseFloat(e.value)) : e.value.trim(); });
    m.$$('[data-mk]').forEach(function (e) { d.marinade[e.dataset.mk] = e.value.trim(); });
    d.allergens = m.$$('[data-al]').filter(function (x) { return x.checked; }).map(function (x) { return x.dataset.al; });
  };
  m.el.addEventListener('input', function (e) {
    const t = e.target;
    if (t.dataset.tb) {
      const g = listOf(t.dataset.tb)[+t.dataset.i], f = t.dataset.f; if (!g) return;
      g[f] = (f === 'qty' || f === 'price') ? (t.value === '' ? '' : parseFloat(t.value)) : t.value;
      if (f === 'name') { const mm = mgMatByName(t.value); if (mm) { g.materialId = mm.id; g.unit = mm.unit || g.unit; g.price = mm.price; const tr = t.closest('tr'); const u = tr.querySelector('[data-f=unit]'), p = tr.querySelector('[data-f=price]'); if (u) u.value = g.unit; if (p) p.value = g.price; t.classList.add('sr-linked'); } else { delete g.materialId; t.classList.remove('sr-linked'); } }
      const ce = m.$('[data-cost="' + t.dataset.tb + t.dataset.i + '"]'); if (ce) ce.textContent = nf((+g.qty || 0) * (+g.price || 0));
      if (f === 'qty' || f === 'price' || f === 'name') tot();
    }
    if (t.dataset.st !== undefined) d.steps[+t.dataset.st] = t.value;
    if (t.dataset.sk === 'yield' || t.dataset.sk === 'sellPrice') { d[t.dataset.sk] = parseFloat(t.value) || 0; tot(); }
  });
  m.el.addEventListener('click', function (e) {
    const t = e.target;
    const add = t.closest('[data-add]'); if (add) { listOf(add.dataset.add).push({ name: '', qty: '', unit: '', price: '', note: '' }); drawIngs(); return; }
    const rm = t.closest('[data-rm]'); if (rm) { listOf(rm.dataset.rm).splice(+rm.dataset.i, 1); drawIngs(); return; }
    const pk = t.closest('[data-pick]'); if (pk) { srMatPicker(function (sel) { const L = listOf(pk.dataset.pick); sel.forEach(function (mm) { L.push({ materialId: mm.id, name: mm.name, qty: '', unit: mm.unit || '', price: mm.price || 0, note: '' }); }); drawIngs(); }); return; }
    if (t.closest('[data-sadd]')) { d.steps.push(''); drawSteps(); const ta = m.$$('[data-st]'); if (ta.length) ta[ta.length - 1].focus(); return; }
    const sd = t.closest('[data-sd]'); if (sd) { d.steps.splice(+sd.dataset.sd, 1); if (!d.steps.length) d.steps = ['']; drawSteps(); return; }
    const mv = t.closest('[data-mv]'); if (mv) { const i = +mv.dataset.i, j = i + (+mv.dataset.mv); if (j < 0 || j >= d.steps.length) return; const x = d.steps[i]; d.steps[i] = d.steps[j]; d.steps[j] = x; drawSteps(); }
  });
  const save = async function (status, btn) {
    collect();
    const title = m.$('[data-sk=title]').value.trim();
    if (!title) { showToast('اسم الوصفة مطلوب', true); return; }
    const out = mgClone(d);
    out.ings = out.ings.filter(function (g) { return String(g.name || '').trim(); });
    out.marinade.ings = out.marinade.ings.filter(function (g) { return String(g.name || '').trim(); });
    out.steps = out.steps.map(function (s) { return String(s || '').trim(); }).filter(Boolean);
    if (!out.ings.length) { showToast('أضف مادة واحدة على الأقل', true); return; }
    if (!out.steps.length) { showToast('اكتب خطوة تحضير واحدة على الأقل', true); return; }
    const noteEl = m.$('#srNote'), note = noteEl ? noteEl.value.trim() : '';
    if (locked && !note) { showToast('اكتب سبب التعديل ليطلع عليه صاحب الحساب', true); noteEl && noteEl.focus(); return; }
    ['no', 'version', 'history', 'change', 'approvedAt', 'approvedBy', 'createdBy', 'submittedAt', 'rejectNote'].forEach(function (k) { delete out[k]; });
    out.status = status;
    btn.disabled = true;
    try {
      const r = await bzOk('mgmtSave', { kind: 'std_recipe', data: { id: isCopy ? '' : (row && row.id) || '', title: title, data: out, note: note } });
      showToast(r.applied === false ? 'تم إرسال طلب التعديل لصاحب الحساب — لن يُطبَّق قبل موافقته' : (r.row.data.status === 'approved' ? 'تم الحفظ والاعتماد — ' + r.row.data.no + ' الإصدار ' + r.row.data.version : r.row.data.status === 'pending' ? 'تم الحفظ وإرسالها للاعتماد' : 'تم الحفظ كمسودة'));
      m.close(); reload && reload();
    } catch (e) { /* أُظهرت الرسالة */ } finally { btn.disabled = false; }
  };
  drawImg(); drawIngs(); drawSteps();
}
function srMatPicker(cb) {
  const mats = MG.mats || [];
  bModal({ title: 'اختيار من المواد الأولية', icon: 'list-check', wide: true, print: false,
    body: '<input class="biz-search" id="mpQ" placeholder="بحث" style="width:100%;margin-bottom:8px"><div class="sr-pick" id="mpL">' + mats.map(function (x, i) { return '<label class="biz-check" data-n="' + h(x.name.toLowerCase()) + '"><input type="checkbox" data-mp="' + i + '"> <span>' + h(x.name) + ' <small class="muted">' + h(x.unit || '') + (canP('costing') ? ' · ' + nf(x.price) : '') + '</small></span></label>'; }).join('') + '</div>' + (mats.length ? '' : '<p class="muted">لا توجد مواد أولية — أضفها من قسم المواد الأولية.</p>'),
    foot: '<button class="btn btn-cancel" data-x>إلغاء</button><button class="btn btn-primary" data-act="ok"><i class="fas fa-check"></i> إضافة المحدد</button>',
    onOpen: function (m) { m.$('#mpQ').oninput = function () { const q = this.value.trim().toLowerCase(); m.$$('[data-n]').forEach(function (l) { l.style.display = !q || l.dataset.n.indexOf(q) >= 0 ? '' : 'none'; }); }; },
    actions: { ok: function (m) { cb(m.$$('[data-mp]').filter(function (x) { return x.checked; }).map(function (x) { return mats[+x.dataset.mp]; })); m.close(); } } });
}
async function srMenuPicker(cb, hint) {
  const items = (await mgLoadMenu()).filter(function (x) { return x.imageUrl; });
  if (!items.length) { showToast('لا توجد صور في المنيو الإلكتروني — يمكنك رفع صورة مباشرة', true); return; }
  hint = String(hint || '').trim();
  items.sort(function (a, b) { return (b.name === hint || b.recipeName === hint) - (a.name === hint || a.recipeName === hint); });
  bModal({ title: 'اختيار صورة من المنيو', icon: 'book-open', wide: true, print: false,
    body: '<input class="biz-search" id="mnQ" placeholder="بحث" style="width:100%;margin-bottom:8px"><div class="sr-menu-grid">' + items.map(function (x, i) { return '<button type="button" class="sr-menu-it" data-mi="' + i + '" data-n="' + h(String(x.name || '').toLowerCase()) + '"><img src="' + h(mgImg(x.imageUrl)) + '" alt="" loading="lazy"><span>' + h(x.name) + '</span></button>'; }).join('') + '</div>',
    onOpen: function (m) {
      m.$('#mnQ').oninput = function () { const q = this.value.trim().toLowerCase(); m.$$('[data-mi]').forEach(function (b) { b.style.display = !q || b.dataset.n.indexOf(q) >= 0 ? '' : 'none'; }); };
      m.el.addEventListener('click', function (e) { const b = e.target.closest('[data-mi]'); if (b) { cb(items[+b.dataset.mi].imageUrl); m.close(); } });
    } });
}

// ============================================================
// أدلة التشغيل والتأهيل للامتياز التجاري (لصاحب الحساب فقط)
// ============================================================
const MN_CSS = '.mn{font-family:Tahoma,"Segoe UI",Arial,sans-serif;color:#1f2433;direction:rtl;font-size:11.5px;line-height:1.85;background:#fff}.mn *{box-sizing:border-box}' +
  '.mn-page{page-break-after:always;break-after:page;background:#fff;padding:4mm 2mm}.mn-page:last-child{page-break-after:auto;break-after:auto}' +
  '.mn-cover{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;min-height:250mm;border:3px double var(--ac);padding:14mm}' +
  '.mn-cover img{max-width:120px;max-height:120px;object-fit:contain;margin-bottom:16px}.mn-cover .org{font-size:20px;font-weight:bold;color:var(--ac)}.mn-cover h1{font-size:28px;margin:22px 0 8px;color:#1f2433}.mn-cover .sub{color:#6b7280;font-size:13px}' +
  '.mn-cover table{margin-top:28px;width:80%;border-collapse:collapse;font-size:11px}.mn-cover td{border:1px solid #d1d5db;padding:5px 8px;text-align:right}.mn-cover td:first-child{background:#f7f1e8;width:38%;font-weight:bold}' +
  '.mn-conf{margin-top:24px;color:#b91c1c;font-weight:bold;font-size:11px;border:1px solid #fecaca;background:#fef2f2;padding:6px 12px;border-radius:6px}' +
  '.mn h2{font-size:17px;color:var(--ac);border-bottom:2px solid var(--ac);padding-bottom:4px;margin:0 0 10px}.mn h3{font-size:13.5px;margin:16px 0 6px;color:#1f2433;border-right:4px solid var(--ac);padding-right:8px;page-break-after:avoid;break-after:avoid}' +
  '.mn h4{font-size:12px;margin:10px 0 4px;color:var(--ac)}.mn p{margin:4px 0}.mn ul,.mn ol{margin:4px 0;padding-inline-start:22px}.mn li{margin:2px 0}' +
  '.mn table.t{width:100%;border-collapse:collapse;margin:6px 0;font-size:10.5px;page-break-inside:avoid;break-inside:avoid}.mn table.t td,.mn table.t th{border:1px solid #d1d5db;padding:4px 6px;text-align:right;vertical-align:top}.mn table.t th{background:#f3ece2}' +
  '.mn .note{border-right:4px solid #ef4444;background:#fef2f2;padding:5px 9px;margin:6px 0;border-radius:4px}.mn .purpose{background:#f7f1e8;border-radius:8px;padding:8px 12px;margin-bottom:10px}' +
  '.mn .toc{list-style:none;padding:0}.mn .toc li{display:flex;gap:6px;border-bottom:1px dotted #9ca3af;padding:4px 0}.mn .toc li b{color:var(--ac);min-width:28px}' +
  '.mn-head{display:flex;justify-content:space-between;align-items:center;font-size:9.5px;color:#6b7280;border-bottom:1px solid #e5e7eb;padding-bottom:4px;margin-bottom:10px}.mn-head img{max-height:28px}' +
  '.mn-sign{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:26px;page-break-inside:avoid}.mn-sign div{border-top:1px solid #9ca3af;padding-top:4px;text-align:center;font-size:10px;color:#4b5563;min-height:40px}';
function mnVars() {
  const v = { restaurant: mgRest(), foodCost: String((typeof foodCostPercent !== 'undefined' && foodCostPercent) || 30), currency: curName(), owner: (B.acc && (B.acc.fullName || B.acc.ownerName)) || mgRest(), year: String(new Date().getFullYear()),
    stdRecipes: String((MG.srRows || []).filter(function (r) { return r.data.status === 'approved'; }).length), date: dOnly(new Date()) };
  return v;
}
function mnFill(s, v) { return (window.fcI18n && window.fcI18n.lang() !== 'ar' ? mnTrText(s) : String(s || '')).replace(/\{\{(\w+)\}\}/g, function (a, k) { return v[k] !== undefined ? v[k] : a; }); }
// تحويل النص المبسط إلى HTML
function mnMd(text, v) {
  const lines = mnFill(text, v).split(/\r?\n/);
  let out = '', list = '', tbl = [];
  const flushL = function () { if (list) { out += '</' + list + '>'; list = ''; } };
  const flushT = function () { if (tbl.length) { out += '<table class="t">' + tbl.map(function (r, i) { const tg = i === 0 ? 'th' : 'td'; return '<tr>' + r.map(function (c) { return '<' + tg + '>' + h(c) + '</' + tg + '>'; }).join('') + '</tr>'; }).join('') + '</table>'; tbl = []; } };
  lines.forEach(function (ln) {
    const t = ln.trim();
    if (/^\|.*\|$/.test(t)) { flushL(); tbl.push(t.slice(1, -1).split('|').map(function (c) { return c.trim(); })); return; }
    flushT();
    let mm;
    if (!t) { flushL(); return; }
    if ((mm = t.match(/^#\s+(.*)/))) { flushL(); out += '<h4>' + h(mm[1]) + '</h4>'; return; }
    if ((mm = t.match(/^[-•]\s+(.*)/))) { if (list !== 'ul') { flushL(); out += '<ul>'; list = 'ul'; } out += '<li>' + h(mm[1]) + '</li>'; return; }
    if ((mm = t.match(/^\d+[.)]\s+(.*)/))) { if (list !== 'ol') { flushL(); out += '<ol>'; list = 'ol'; } out += '<li>' + h(mm[1]) + '</li>'; return; }
    if ((mm = t.match(/^>\s*(.*)/))) { flushL(); out += '<div class="note">' + h(mm[1]) + '</div>'; return; }
    flushL(); out += '<p>' + h(t) + '</p>';
  });
  flushL(); flushT();
  return out;
}
function mnTpl(key) { const t = (typeof MANUAL_TEMPLATES !== 'undefined' ? MANUAL_TEMPLATES : []).find(function (t) { return t.key === key; }); return t ? mnTplLang(t) : t; }
// v5.3.2: قوالب الأدلة بلغة الواجهة المختارة (العربية / English / Türkçe)
function mnTrLine(line) {
  const I = window.fcI18n, D = window.FC_I18N || {};
  if (!I || I.lang() === 'ar' || !/[\u0600-\u06FF]/.test(line)) return line;
  const one = function (x) { const n = String(x).replace(/\s+/g, ' ').trim(); if (!n) return x; if (D[n] !== undefined) return x.replace(n, D[n]); return I.t(x); };
  if (/^\s*\|/.test(line)) return line.split('|').map(function (c) { return /[\u0600-\u06FF]/.test(c) ? ' ' + one(c).trim() + ' ' : c; }).join('|');
  const m = line.match(/^(\s*(?:#|-|>|\d+\.)\s+)(.*)$/);
  return (m ? m[1] + one(m[2]) : one(line)).replace(/←/g, '→');
}
function mnTrText(s) { return String(s || '').split('\n').map(mnTrLine).join('\n'); }
function mnTplLang(t) {
  if (!window.fcI18n || window.fcI18n.lang() === 'ar') return t;
  if (!t.__l) t.__l = Object.assign({}, t, { title: mnTrLine(t.title), purpose: mnTrText(t.purpose), sections: (t.sections || []).map(function (x) { return [mnTrLine(x[0]), mnTrText(x[1])]; }) });
  return t.__l;
}
function mnFromTpl(t) { return { key: t.key, code: t.code, purpose: t.purpose, status: 'draft', preparedBy: '', sections: t.sections.map(function (s) { return { id: mgUid(), title: s[0], body: s[1], reviewed: false }; }) }; }
function mnProgress(row) { const s = (row && row.data.sections) || []; return s.length ? Math.round(s.filter(function (x) { return x.reviewed; }).length / s.length * 100) : 0; }

bizPage('manuals', { group: 'admin', title: 'أدلة التشغيل والامتياز', icon: 'book', feature: 'manuals', ownerOnly: true, plan: 'premium',
  sub: 'أدلة تشغيل كاملة جاهزة للتحرير والاعتماد والطباعة لتأهيل المطعم للامتياز التجاري (Franchise) — متاحة لصاحب الحساب فقط.',
  pitch: 'سبعة أدلة تشغيل احترافية: المخزون والمشتريات والتكاليف، التدريب، الرقابة والتدقيق، الخدمة والصالة، المطبخ والإنتاج، الهوية البصرية والتغليف، سلامة الأغذية — مع لوحة جاهزية الامتياز.',
  render: async function (body) {
    srEnsureCss();
    if (!MG.recipes) { const rr = await bz('getAllRecipes', {}, { loading: false }); MG.recipes = (rr && rr.success && rr.recipes) || []; }
    const rs = await Promise.all([mgList('manual'), hasF('std_recipes') ? mgList('std_recipe').catch(function () { return []; }) : [], mgList('sr_cfg').catch(function () { return []; })]);
    MG.srRows = rs[1]; MG.cfg = rs[2][0] || MG.cfg;
    mnRender(body, rs[0]);
  } });
function mnRender(body, rows) {
  const byKey = {}; let cfgRow = null;
  rows.forEach(function (r) { if (r.data.key === '_cfg') cfgRow = r; else if (r.data.key && !byKey[r.data.key]) byKey[r.data.key] = r; });
  const custom = rows.filter(function (r) { return r.data.key && r.data.key.indexOf('custom_') === 0; });
  const checks = (cfgRow && cfgRow.data.checks) || {};
  const sr = MG.srRows || [], srAp = sr.filter(function (r) { return r.data.status === 'approved'; }).length, recN = (MG.recipes || []).length;
  const auto = {};
  MANUAL_TEMPLATES.forEach(function (t) { const r = byKey[t.key]; auto[t.key] = r ? (r.data.status === 'approved' ? 1 : mnProgress(r) / 200) : 0; });
  auto.recipes = srAp ? (recN ? Math.min(1, srAp / recN) : 1) : 0;
  auto.foodcost = checks.foodcost ? 1 : 0; auto.sop = checks.sop ? 1 : 0;
  const score = Math.round(FRANCHISE_CHECKS.reduce(function (s, c) { return s + (auto[c[0]] || 0); }, 0) / FRANCHISE_CHECKS.length * 100);
  const col = score >= 85 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
  body.innerHTML = '<div class="mn-ready"><div class="mn-ring" style="--p:' + score + ';--c:' + col + '"><b>' + score + '%</b><span>جاهزية الامتياز</span></div><div class="mn-checks">' +
    FRANCHISE_CHECKS.map(function (c) { const v = auto[c[0]] || 0, manual = c[0] === 'foodcost' || c[0] === 'sop';
      return '<label class="mn-chk ' + (v >= 1 ? 'ok' : v > 0 ? 'part' : '') + '">' + (manual ? '<input type="checkbox" data-ck="' + c[0] + '"' + (v >= 1 ? ' checked' : '') + '>' : '<i class="fas fa-' + (v >= 1 ? 'check-circle' : v > 0 ? 'adjust' : 'circle') + '"></i>') + ' <span>' + h(c[1]) + (c[0] === 'recipes' ? ' <small>(' + srAp + (recN ? ' / ' + recN : '') + ')</small>' : '') + '</span></label>'; }).join('') + '</div></div>' +
    '<div class="biz-toolbar"><span class="muted grow">أنشئ كل دليل من القالب الجاهز، عدّل بنوده بما يناسب مطعمك، علّم الأقسام التي راجعتها، ثم اعتمده واطبعه.</span>' +
    '<button class="btn btn-outline btn-sm" data-act="custom"><i class="fas fa-plus"></i> دليل مخصص</button><button class="btn btn-primary btn-sm" data-act="bundle"><i class="fas fa-print"></i> طباعة الحزمة الكاملة</button></div>' +
    '<div class="mn-grid">' + MANUAL_TEMPLATES.map(function (t) { return mnCard(mnTplLang(t), byKey[t.key]); }).join('') + custom.map(function (r) { return mnCard({ key: r.data.key, code: r.data.code, icon: 'file-lines', color: '#64748b', title: r.title }, r); }).join('') + '</div>';
  const reload = async function () { mnRender(body, await mgList('manual')); };
  body.onclick = async function (e) {
    const c = e.target.closest('[data-mn]'), cr = e.target.closest('[data-mnc]'), a = e.target.closest('[data-act]');
    if (cr) {
      const t = mnTpl(cr.dataset.mnc); if (!t) return;
      const r = await bzOk('mgmtSave', { kind: 'manual', data: { title: t.title, data: mnFromTpl(t) } });
      showToast('تم إنشاء الدليل من القالب'); await reload(); mnEdit(r.row, reload); return;
    }
    if (c) { const r = rows.find(function (x) { return x.id === c.dataset.mn; }); if (r) mnEdit(r, reload); return; }
    if (a && a.dataset.act === 'bundle') { const list = MANUAL_TEMPLATES.map(function (t) { return byKey[t.key]; }).concat(custom).filter(Boolean); if (!list.length) { showToast('أنشئ دليلاً واحداً على الأقل', true); return; } mnPrintDlg(list, true); }
    if (a && a.dataset.act === 'custom') bPrompt('دليل مخصص', [{ k: 'title', label: 'اسم الدليل', req: true, full: true }, { k: 'purpose', label: 'الغرض', type: 'textarea', full: true }], {}, async function (x) {
      const r = await bzOk('mgmtSave', { kind: 'manual', data: { title: x.title, data: { key: 'custom_' + mgUid(), purpose: x.purpose, status: 'draft', sections: [{ id: mgUid(), title: 'الغرض والنطاق', body: '', reviewed: false }] } } });
      await reload(); mnEdit(r.row, reload);
    }, { icon: 'file-lines' });
  };
  body.querySelectorAll('[data-ck]').forEach(function (ck) {
    ck.onchange = async function () {
      const nc = Object.assign({}, checks); nc[ck.dataset.ck] = ck.checked;
      await bzOk('mgmtSave', { kind: 'manual', data: { id: cfgRow ? cfgRow.id : '', title: '_cfg', data: { key: '_cfg', status: 'draft', checks: nc } } });
      reload();
    };
  });
}
function mnCard(t, r) {
  if (!r) return '<div class="mn-card empty" style="--c:' + t.color + '"><div class="mn-ic"><i class="fas fa-' + t.icon + '"></i></div><b>' + h(t.title) + '</b><span class="muted">' + h(t.code) + ' · لم يُنشأ بعد</span><button class="btn btn-primary btn-sm" data-mnc="' + t.key + '"><i class="fas fa-magic"></i> إنشاء من القالب الجاهز</button></div>';
  const d = r.data, p = mnProgress(r), ap = d.status === 'approved';
  return '<div class="mn-card" data-mn="' + r.id + '" style="--c:' + t.color + '"><div class="mn-ic"><i class="fas fa-' + t.icon + '"></i></div><b>' + h(r.title) + '</b><span class="muted">' + h(d.code || t.code) + ' · ' + (d.sections || []).length + ' قسم · ' + (ap ? 'الإصدار ' + d.version : 'مسودة') + '</span>' +
    '<div class="mn-bar"><i style="width:' + p + '%"></i></div><div class="mn-foot">' + (ap ? '<span class="sr-st" style="--c:#10b981">معتمد · ' + dOnly(d.approvedAt) + '</span>' : '<span class="sr-st" style="--c:#64748b">مسودة</span>') + '<span class="muted">مراجعة ' + p + '%</span></div></div>';
}
function mnEdit(row, reload) {
  const d = mgClone(row.data); if (!Array.isArray(d.sections)) d.sections = [];
  let title = row.title;
  const m = bModal({ title: row.title, icon: 'book', xwide: true, print: false, sub: (d.code || '') + ' · ' + (d.status === 'approved' ? 'الإصدار ' + d.version + ' معتمد ' + dOnly(d.approvedAt) : 'مسودة'),
    body: '<div class="biz-form"><div class="full"><label class="pro-label">اسم الدليل</label><div class="pro-input-wrap"><input id="mnT" value="' + h(title) + '"></div></div>' +
      '<div><label class="pro-label">رمز الوثيقة</label><div class="pro-input-wrap"><input value="' + h(d.code || '') + '" readonly dir="ltr"></div></div><div><label class="pro-label">أعدّه</label><div class="pro-input-wrap"><input id="mnBy" value="' + h(d.preparedBy || '') + '" placeholder="الاسم والمسمى الوظيفي"></div></div>' +
      '<div class="full"><label class="pro-label">الغرض من الدليل</label><div class="pro-input-wrap"><textarea id="mnP" rows="2">' + h(d.purpose || '') + '</textarea></div></div></div>' +
      '<div class="sr-note"><i class="fas fa-info-circle"></i> صيغة الكتابة: <b>#</b> عنوان فرعي · <b>-</b> نقطة · <b>1.</b> بند مرقّم · <b>| عمود | عمود |</b> صف جدول (الأول رأس الجدول) · <b>&gt;</b> ملاحظة مهمة. المتغيرات: {{restaurant}} {{foodCost}} {{currency}} {{year}} {{stdRecipes}}</div>' +
      '<div id="mnS"></div><button type="button" class="btn btn-outline btn-sm" data-act="addS"><i class="fas fa-plus"></i> إضافة قسم</button>' +
      ((d.history || []).length ? '<div class="biz-sec">سجل الإصدارات</div>' + bTable([{ label: 'الإصدار', r: function (x) { return 'v' + x.v; } }, { label: 'التاريخ', r: function (x) { return dt(x.at); } }, { label: 'البيان', r: function (x) { return h(x.note || ''); } }], d.history.slice().reverse()) : ''),
    foot: '<button class="btn btn-cancel" data-x>إغلاق</button><button class="btn btn-outline" data-act="del" style="color:#f87171"><i class="fas fa-trash"></i></button>' + (mnTpl(d.key) ? '<button class="btn btn-outline" data-act="reset"><i class="fas fa-rotate-left"></i> استعادة القالب</button>' : '') +
      '<button class="btn btn-outline" data-act="print"><i class="fas fa-print"></i> طباعة</button><button class="btn btn-outline" data-act="save"><i class="fas fa-save"></i> حفظ كمسودة</button><button class="btn btn-primary" data-act="approve"><i class="fas fa-check-double"></i> اعتماد وإصدار</button>',
    actions: {
      addS: function () { collect(); d.sections.push({ id: mgUid(), title: 'قسم جديد', body: '', reviewed: false }); draw(); },
      reset: async function () { if (!(await bConfirm('استبدال محتوى الدليل بالقالب الافتراضي؟ ستفقد تعديلاتك غير المحفوظة في الإصدار الحالي.'))) return; const t = mnTpl(d.key); const f = mnFromTpl(t); d.sections = f.sections; d.purpose = f.purpose; m.$('#mnP').value = d.purpose; draw(); },
      print: function () { collect(); mnPrintDlg([{ id: row.id, title: m.$('#mnT').value || title, data: d }], false); },
      save: function (mm, b) { save(false, b); }, approve: function (mm, b) { save(true, b); },
      del: async function () { if (!(await bConfirm('حذف الدليل «' + title + '» نهائياً؟'))) return; await bzOk('mgmtDelete', { id: row.id }); m.close(); reload(); },
    } });
  const draw = function () {
    m.$('#mnS').innerHTML = d.sections.map(function (s, i) {
      return '<div class="mn-sec' + (s.reviewed ? ' rv' : '') + '"><div class="mn-sec-h"><span class="mn-n">' + (i + 1) + '</span><input data-stt="' + i + '" value="' + h(s.title) + '"><label class="biz-check"><input type="checkbox" data-rv="' + i + '"' + (s.reviewed ? ' checked' : '') + '> <span>تمت المراجعة</span></label>' +
        '<button type="button" class="ico-btn" data-smv="-1" data-i="' + i + '"><i class="fas fa-arrow-up"></i></button><button type="button" class="ico-btn" data-smv="1" data-i="' + i + '"><i class="fas fa-arrow-down"></i></button><button type="button" class="ico-btn" data-sdel="' + i + '"><i class="fas fa-trash"></i></button></div>' +
        '<textarea data-sb="' + i + '" rows="' + Math.min(16, Math.max(4, String(s.body || '').split('\n').length + 1)) + '">' + h(s.body || '') + '</textarea></div>';
    }).join('');
  };
  const collect = function () {
    m.$$('[data-stt]').forEach(function (e) { d.sections[+e.dataset.stt].title = e.value; });
    m.$$('[data-sb]').forEach(function (e) { d.sections[+e.dataset.sb].body = e.value; });
    m.$$('[data-rv]').forEach(function (e) { d.sections[+e.dataset.rv].reviewed = e.checked; });
    d.purpose = m.$('#mnP').value; d.preparedBy = m.$('#mnBy').value.trim();
  };
  m.el.addEventListener('change', function (e) { if (e.target.dataset.rv !== undefined) e.target.closest('.mn-sec').classList.toggle('rv', e.target.checked); });
  m.el.addEventListener('click', function (e) {
    const mv = e.target.closest('[data-smv]'), dl = e.target.closest('[data-sdel]');
    if (mv) { collect(); const i = +mv.dataset.i, j = i + (+mv.dataset.smv); if (j < 0 || j >= d.sections.length) return; const x = d.sections[i]; d.sections[i] = d.sections[j]; d.sections[j] = x; draw(); }
    if (dl) { collect(); d.sections.splice(+dl.dataset.sdel, 1); draw(); }
  });
  const save = async function (approve, btn) {
    collect(); title = m.$('#mnT').value.trim();
    if (!title) { showToast('اسم الدليل مطلوب', true); return; }
    let note = '';
    if (approve) {
      const nr = d.sections.filter(function (s) { return !s.reviewed; }).length;
      if (nr && !(await bConfirm('يوجد ' + nr + ' قسم لم يُعلَّم كمراجَع. اعتماد الدليل وإصدار نسخة جديدة على أي حال؟'))) return;
      note = d.status === 'approved' ? 'تحديث الدليل' : 'اعتماد الدليل';
    }
    const out = mgClone(d); delete out.history; out.status = approve ? 'approved' : 'draft';
    btn.disabled = true;
    try {
      const r = await bzOk('mgmtSave', { kind: 'manual', data: { id: row.id, title: title, data: out, note: note } });
      showToast(approve ? 'تم الاعتماد — الإصدار ' + r.row.data.version : 'تم الحفظ'); m.close(); reload();
    } catch (e) { } finally { btn.disabled = false; }
  };
  draw();
}
function mnPrintDlg(list, bundle) {
  bModal({ title: bundle ? 'طباعة حزمة أدلة الامتياز' : 'طباعة الدليل', icon: 'print', print: false,
    body: '<div class="biz-form"><div><label class="pro-label">مقاس الورق</label><div class="pro-input-wrap"><select id="mpP"><option value="a4">A4</option><option value="b5">B5</option><option value="a5">A5</option></select></div></div>' +
      '<label class="biz-check full"><input type="checkbox" id="mpC" checked> <span>صفحة غلاف ومعلومات الوثيقة</span></label><label class="biz-check full"><input type="checkbox" id="mpT" checked> <span>فهرس المحتويات</span></label></div>' +
      (bundle ? '<div class="sr-pick">' + list.map(function (r, i) { return '<label class="biz-check"><input type="checkbox" data-mpi="' + i + '" checked> <span>' + h(r.title) + (r.data.status === 'approved' ? '' : ' <small class="muted">(مسودة)</small>') + '</span></label>'; }).join('') + '</div>' : ''),
    foot: '<button class="btn btn-cancel" data-x>إلغاء</button><button class="btn btn-primary" data-act="go"><i class="fas fa-print"></i> طباعة</button>',
    actions: { go: function (m) {
      const sel = bundle ? list.filter(function (r, i) { const c = m.$('[data-mpi="' + i + '"]'); return c && c.checked; }) : list;
      if (!sel.length) return;
      mnPrint(sel, bundle, m.$('#mpP').value, m.$('#mpC').checked, m.$('#mpT').checked); m.close();
    } } });
}
function mnPrint(list, bundle, paper, cover, toc) {
  const v = mnVars(), c = srCfg(), logo = mgLogo(), ac = c.color || '#b48554';
  const head = function (t, code) { return '<div class="mn-head">' + (logo ? '<img src="' + h(mgImg(logo)) + '">' : '<b>' + h(v.restaurant) + '</b>') + '<span>' + h(t) + '</span><span dir="ltr">' + h(code || '') + '</span></div>'; };
  const docTable = function (r) { const d = r.data; return '<table><tr><td>رمز الوثيقة</td><td dir="ltr" style="text-align:right">' + h(d.code || '') + '</td></tr><tr><td>رقم الإصدار</td><td>' + (d.status === 'approved' ? d.version : 'مسودة غير معتمدة') + '</td></tr><tr><td>تاريخ الاعتماد</td><td>' + (d.approvedAt ? dOnly(d.approvedAt) : '—') + '</td></tr><tr><td>اعتمده</td><td>' + h(d.approvedBy || '—') + '</td></tr><tr><td>أعدّه</td><td>' + h(d.preparedBy || '—') + '</td></tr><tr><td>تاريخ الطباعة</td><td>' + v.date + '</td></tr></table>'; };
  let html = '';
  if (bundle && cover) html += '<div class="mn-page"><div class="mn-cover">' + (logo ? '<img src="' + h(mgImg(logo)) + '">' : '') + '<div class="org">' + h(v.restaurant) + '</div><h1>دليل التشغيل الموحد للامتياز التجاري</h1><div class="sub">Franchise Operations Manual · ' + v.year + '</div>' +
    '<table>' + list.map(function (r, i) { return '<tr><td>' + (i + 1) + '. ' + h(r.data.code || '') + '</td><td>' + h(r.title) + ' — ' + (r.data.status === 'approved' ? 'الإصدار ' + r.data.version : 'مسودة') + '</td></tr>'; }).join('') + '</table><div class="mn-conf">وثيقة سرية مضبوطة — ملكية ' + h(v.restaurant) + ' · يُمنع النسخ أو التداول دون إذن صاحب العلامة</div></div></div>';
  list.forEach(function (r) {
    const d = r.data, secs = (d.sections || []).filter(function (s) { return String(s.title || s.body || '').trim(); });
    if (cover && !bundle) html += '<div class="mn-page"><div class="mn-cover">' + (logo ? '<img src="' + h(mgImg(logo)) + '">' : '') + '<div class="org">' + h(v.restaurant) + '</div><h1>' + h(r.title) + '</h1><div class="sub">' + h(mnFill(d.purpose, v)) + '</div>' + docTable(r) + '<div class="mn-conf">وثيقة سرية مضبوطة — ملكية ' + h(v.restaurant) + ' · يُمنع النسخ أو التداول دون إذن صاحب العلامة</div></div></div>';
    html += '<div class="mn-page">' + head(r.title, d.code) + '<h2>' + h(r.title) + '</h2>' + (bundle && cover ? '<div style="font-size:10px;color:#6b7280;margin-bottom:6px">' + h(d.code || '') + ' · ' + (d.status === 'approved' ? 'الإصدار ' + d.version + ' · معتمد ' + dOnly(d.approvedAt) : 'مسودة') + '</div>' : '') +
      (d.purpose ? '<div class="purpose"><b>الغرض: </b>' + h(mnFill(d.purpose, v)) + '</div>' : '') +
      (toc && secs.length ? '<h4>المحتويات</h4><ul class="toc">' + secs.map(function (s, i) { return '<li><b>' + (i + 1) + '.</b> ' + h(mnFill(s.title, v)) + '</li>'; }).join('') + '</ul>' : '') +
      secs.map(function (s, i) { return '<h3>' + (i + 1) + '. ' + h(mnFill(s.title, v)) + '</h3>' + mnMd(s.body, v); }).join('') +
      ((d.history || []).length ? '<h3>سجل الإصدارات</h3><table class="t"><tr><th>الإصدار</th><th>التاريخ</th><th>بواسطة</th><th>البيان</th></tr>' + d.history.map(function (x) { return '<tr><td>v' + x.v + '</td><td>' + dOnly(x.at) + '</td><td>' + h(x.by || '') + '</td><td>' + h(x.note || '') + '</td></tr>'; }).join('') + '</table>' : '') +
      '<div class="mn-sign"><div>أعدّه<br><b>' + h(d.preparedBy || '') + '</b></div><div>راجعه</div><div>اعتمده (صاحب العلامة)<br><b>' + h(d.approvedBy || '') + '</b></div></div></div>';
  });
  mgPrintWin(bundle ? 'دليل الامتياز التجاري - ' + v.restaurant : list[0].title, '<div class="mn" style="--ac:' + h(ac) + '">' + html + '</div>', MN_CSS, (SR_PAPERS[paper] || SR_PAPERS.a4)[1]);
}

// ============================================================
// التكلفة الفعلية مقابل النظرية (تبويب داخل المخزون والجرد)
// ============================================================
function fcvColor(pct) { if (pct === null || pct === undefined) return ''; const a = Math.abs(pct); return a < 1 ? '#10b981' : a <= 2 ? '#f59e0b' : '#ef4444'; }
function fcvPct(v) { return v === null || v === undefined ? '—' : nf(v, 1) + '%'; }
function varianceView(el) {
  el.innerHTML = dateRangeBar('fvRange', daysAgo(29), isoLocal()) + '<div id="fvBody"><div class="empty-state"><i class="fas fa-spinner fa-pulse"></i></div></div>';
  const get = bindRange(el, 'fvRange', load);
  async function load(f) {
    const box = el.querySelector('#fvBody');
    box.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-pulse"></i></div>';
    const r = await bz('foodCostVariance', f || get(), { loading: false });
    if (!r.success) { box.innerHTML = '<div class="empty-state">' + h(r.error || 'تعذر الحساب') + '</div>'; return; }
    const s = r.summary, items = r.items || [], cur = curName();
    const range = f || get();
    const warn = [];
    if (!s.lastCountAt) warn.push('لا يوجد جرد معتمد في هذه الفترة أو قبلها — مخزون آخر المدة مأخوذ من أرصدة النظام، لذا ستتطابق التكلفة الفعلية تقريباً مع المسجلة. اعتمد جرداً فعلياً في نهاية الفترة لحساب دقيق.');
    else if (new Date(s.lastCountAt) < new Date(new Date(range.to + 'T00:00:00').getTime() - 2 * 864e5)) warn.push('آخر جرد معتمد بتاريخ ' + dOnly(s.lastCountAt) + ' — يُفضَّل اعتماد جرد في نهاية الفترة المختارة.');
    if (!s.openingCountAt) warn.push('لا يوجد جرد قبل بداية الفترة — مخزون أول المدة محسوب من الأرصدة والحركات المسجلة.');
    if ((r.unmatched || []).length) warn.push((r.unmatched || []).length + ' صنف مباع بدون وصفة/مقادير مرتبطة — لا يدخل في التكلفة النظرية (القائمة بالأسفل).');
    const vc = fcvColor(s.variancePct);
    box.innerHTML = kpis([['صافي المبيعات', money(s.netSales), s.orders + ' طلب'], ['التكلفة الفعلية', money(s.actual), fcvPct(s.actualPct) + ' من المبيعات', s.actualPct !== null && s.actualPct > s.targetPct ? '#f87171' : ''],
      ['التكلفة النظرية', money(s.theo), fcvPct(s.theoPct) + ' من المبيعات'], ['الفرق (الفعلية − النظرية)', money(s.variance), fcvPct(s.variancePct) + ' من المبيعات', vc], ['المستهدف', nf(s.targetPct, 1) + '%', 'نسبة تكلفة الغذاء']]) +
      warn.map(function (w) { return '<div class="sr-alert"><i class="fas fa-exclamation-triangle"></i> ' + h(w) + '</div>'; }).join('') +
      '<div class="fcv-formula"><div class="fcv-f"><h4><i class="fas fa-calculator"></i> التكلفة الفعلية</h4><div class="fcv-eq"><span>مخزون أول المدة<b>' + nf(s.opening) + '</b></span><i>+</i><span>المشتريات<b>' + nf(s.purchases) + '</b></span><i>±</i><span>التحويلات والإنتاج<b>' + nf(s.transfers) + '</b></span><i>−</i><span>مخزون آخر المدة<b>' + nf(s.closing) + '</b></span><i>=</i><span class="res">الفعلية<b>' + nf(s.actual) + ' ' + h(cur) + '</b></span></div></div>' +
      '<div class="fcv-f"><h4><i class="fas fa-book-open"></i> التكلفة النظرية</h4><div class="fcv-eq"><span>Σ الكمية المباعة<b>' + nf(s.soldQty, 0) + '</b></span><i>×</i><span>تكلفة الوصفة القياسية</span><i>=</i><span class="res">النظرية<b>' + nf(s.theo) + ' ' + h(cur) + '</b></span></div></div>' +
      '<div class="fcv-f"><h4><i class="fas fa-balance-scale-left"></i> تحليل الفرق</h4><div class="fcv-eq"><span>هدر مسجل<b>' + nf(s.waste) + '</b></span><span>فروقات جرد<b>' + nf(-s.countAdj) + '</b></span><span>تسويات أخرى<b>' + nf(-s.adjust) + '</b></span><span class="res" style="--c:' + (vc || '#64748b') + '">الفرق<b>' + nf(s.variance) + '</b></span></div>' +
      '<p class="muted" style="margin:6px 0 0">أقل من 1% ممتاز · 1% - 2% مقبول · أكثر من 2% يحتاج تحقيق (هدر غير مسجل، حصص زائدة، أخطاء استلام أو جرد، تسريب).</p></div></div>' +
      '<div class="biz-toolbar"><input class="biz-search grow" id="fvQ" placeholder="بحث عن صنف"><label class="biz-check" style="margin:0"><input type="checkbox" id="fvOnly"> <span>الأصناف ذات الفرق فقط</span></label><button class="btn btn-outline btn-sm" id="fvXl"><i class="fas fa-file-excel"></i> Excel</button><button class="btn btn-outline btn-sm" id="fvPr"><i class="fas fa-print"></i> طباعة</button></div><div id="fvTbl"></div>' +
      ((r.unmatched || []).length ? '<div class="biz-sec">أصناف مباعة بدون مقادير مرتبطة</div><div class="fcv-un">' + r.unmatched.map(function (u) { return '<span>' + h(u.name) + ' <b>' + nf(u.qty, 0) + '</b></span>'; }).join('') + '</div>' : '');
    const cols = [{ label: 'الصنف', r: function (i) { return '<b>' + h(i.name) + '</b> <small class="muted">' + h(i.unit || '') + '</small>'; } }, { label: 'أول المدة', num: true, r: function (i) { return srQ(i.opening); } }, { label: 'المشتريات', num: true, r: function (i) { return srQ(i.purchases); } },
      { label: 'تحويلات/إنتاج', num: true, r: function (i) { return srQ(i.transfers); } }, { label: 'آخر المدة', num: true, r: function (i) { return srQ(i.closing); } }, { label: 'الاستهلاك الفعلي', num: true, r: function (i) { return '<b>' + srQ(i.actual) + '</b>'; } },
      { label: 'الاستهلاك النظري', num: true, r: function (i) { return srQ(i.theo); } }, { label: 'فرق الكمية', num: true, r: function (i) { return '<span style="color:' + fcvColor(i.varPct === null ? (Math.abs(i.varQty) > 1e-6 ? 99 : 0) : i.varPct / 2) + '">' + srQ(i.varQty) + (i.varPct !== null ? ' <small>(' + nf(i.varPct, 1) + '%)</small>' : '') + '</span>'; } },
      { label: 'قيمة الفرق', num: true, r: function (i) { return '<b style="color:' + (i.varValue > 0.005 ? '#f87171' : i.varValue < -0.005 ? '#60a5fa' : '') + '">' + nf(i.varValue) + '</b>'; } }, { label: 'هدر مسجل', num: true, r: function (i) { return i.waste ? srQ(i.waste) : '—'; } }];
    const drawT = function () {
      const q = el.querySelector('#fvQ').value.trim().toLowerCase(), only = el.querySelector('#fvOnly').checked;
      const L = items.filter(function (i) { return (!q || String(i.name).toLowerCase().indexOf(q) >= 0) && (!only || Math.abs(i.varValue) >= 0.01); });
      el.querySelector('#fvTbl').innerHTML = bTable(cols, L, { empty: 'لا توجد حركة مخزون في هذه الفترة', foot: '<tr><td><b>الإجمالي</b></td><td colspan="4"></td><td class="num"><b>' + nf(s.actual) + '</b></td><td class="num"><b>' + nf(s.theo) + '</b></td><td></td><td class="num"><b>' + nf(s.variance) + '</b></td><td></td></tr>' });
    };
    el.querySelector('#fvQ').oninput = drawT; el.querySelector('#fvOnly').onchange = drawT; drawT();
    el.querySelector('#fvXl').onclick = function () {
      exportRowsExcel('التكلفة الفعلية والنظرية', ['الصنف', 'الوحدة', 'سعر الوحدة', 'أول المدة', 'المشتريات', 'تحويلات/إنتاج', 'آخر المدة', 'الفعلي', 'النظري', 'فرق الكمية', 'فرق %', 'قيمة الفعلي', 'قيمة النظري', 'قيمة الفرق', 'الهدر'],
        items.map(function (i) { return [i.name, i.unit, i.price, i.opening, i.purchases, i.transfers, i.closing, i.actual, i.theo, i.varQty, i.varPct, i.actualValue, i.theoValue, i.varValue, i.waste]; }).concat([[], ['صافي المبيعات', s.netSales], ['التكلفة الفعلية', s.actual, s.actualPct], ['التكلفة النظرية', s.theo, s.theoPct], ['الفرق', s.variance, s.variancePct]]));
    };
    el.querySelector('#fvPr').onclick = function () {
      const t = '<table class="t"><tr><th>الصنف</th><th>أول المدة</th><th>المشتريات</th><th>تحويلات</th><th>آخر المدة</th><th>الفعلي</th><th>النظري</th><th>فرق الكمية</th><th>قيمة الفرق</th></tr>' + items.map(function (i) { return '<tr><td>' + h(i.name) + ' (' + h(i.unit || '') + ')</td><td>' + srQ(i.opening) + '</td><td>' + srQ(i.purchases) + '</td><td>' + srQ(i.transfers) + '</td><td>' + srQ(i.closing) + '</td><td>' + srQ(i.actual) + '</td><td>' + srQ(i.theo) + '</td><td>' + srQ(i.varQty) + '</td><td>' + nf(i.varValue) + '</td></tr>'; }).join('') + '</table>';
      const sum = '<table class="t"><tr><th>صافي المبيعات</th><th>التكلفة الفعلية</th><th>التكلفة النظرية</th><th>الفرق</th><th>المستهدف</th></tr><tr><td>' + money(s.netSales) + '</td><td>' + money(s.actual) + ' (' + fcvPct(s.actualPct) + ')</td><td>' + money(s.theo) + ' (' + fcvPct(s.theoPct) + ')</td><td>' + money(s.variance) + ' (' + fcvPct(s.variancePct) + ')</td><td>' + nf(s.targetPct, 1) + '%</td></tr></table>';
      mgPrintWin('التكلفة الفعلية والنظرية', '<div class="mn" style="--ac:#b48554"><div class="mn-head"><b>' + h(mgRest()) + '</b><span>التكلفة الفعلية مقابل النظرية</span><span>' + h(range.from) + ' ← ' + h(range.to) + '</span></div>' + sum +
        '<p style="font-size:10px">الفعلية = أول المدة ' + nf(s.opening) + ' + المشتريات ' + nf(s.purchases) + ' ± التحويلات ' + nf(s.transfers) + ' − آخر المدة ' + nf(s.closing) + ' = ' + nf(s.actual) + ' · النظرية = Σ المبيعات × مقادير الوصفة = ' + nf(s.theo) + '</p>' + t + '</div>', MN_CSS + '.mn table.t{font-size:9px}', '297mm 210mm');
    };
  }
  load();
}

// ============================================================
// بنود المصروفات القابلة للإضافة والتنسيق والتعديل
// ============================================================
var EXP_CFG = null;
const EXP_GROUPS = [['op', 'تشغيلية'], ['adm', 'إدارية'], ['mkt', 'تسويقية'], ['cap', 'رأسمالية'], ['oth', 'أخرى']];
function expDefCats() { return (typeof EXP_CATS !== 'undefined' ? EXP_CATS : ['عام']).map(function (n, i) { return { name: n, color: (typeof PALETTE !== 'undefined' ? PALETTE : ['#b48554'])[i % 10], budget: 0, group: n === 'تسويق' ? 'mkt' : n === 'إيجار' || n === 'رواتب' || n === 'رسوم واشتراكات' ? 'adm' : 'op', active: true }; }); }
async function expLoadCfg(force) {
  if (EXP_CFG && !force) return EXP_CFG;
  if (typeof hasF === 'function' && !hasF('exp_custom')) { EXP_CFG = { id: '', cats: expDefCats(), locked: true }; return EXP_CFG; }
  const r = await bz('mgmtList', { kind: 'exp_cfg' }, { loading: false, silentPlan: true });
  const row = r && r.success && r.rows && r.rows[0];
  EXP_CFG = { id: row ? row.id : '', cats: row && Array.isArray(row.data.cats) && row.data.cats.length ? row.data.cats : expDefCats() };
  return EXP_CFG;
}
function expCats(all) { return ((EXP_CFG && EXP_CFG.cats) || expDefCats()).filter(function (c) { return all || c.active !== false; }); }
function expCat(name) { return ((EXP_CFG && EXP_CFG.cats) || []).find(function (c) { return c.name === name; }); }
function expChip(name) { const c = expCat(name); return '<span class="exp-chip" style="--c:' + h((c && c.color) || '#64748b') + '">' + h(name || '—') + '</span>'; }
function expCatOptions(cur) { const L = expCats().map(function (c) { return c.name; }); if (cur && L.indexOf(cur) < 0) L.push(cur); return L; }
// جدول المصروفات حسب البند مقابل الميزانية الشهرية
function expBudgetTable(rows, from, to) {
  const days = Math.max(1, Math.round((new Date(to + 'T12:00:00') - new Date(from + 'T12:00:00')) / 864e5) + 1), k = days / 30;
  const by = {}; rows.forEach(function (x) { const b = by[x.category] = by[x.category] || { n: 0, t: 0 }; b.n++; b.t += +x.amount || 0; });
  const total = Object.values(by).reduce(function (s, b) { return s + b.t; }, 0);
  const names = expCats(true).map(function (c) { return c.name; }).filter(function (n) { return by[n] || (expCat(n) && +expCat(n).budget > 0 && expCat(n).active !== false); });
  Object.keys(by).forEach(function (n) { if (names.indexOf(n) < 0) names.push(n); });
  if (!names.length) return '';
  const gName = function (g) { const x = EXP_GROUPS.find(function (y) { return y[0] === g; }); return x ? x[1] : ''; };
  return '<details class="exp-bud" open><summary><i class="fas fa-chart-pie"></i> المصروفات حسب البند والميزانية (' + days + ' يوم)</summary>' + bTable([
    { label: 'البند', r: function (n) { return expChip(n); } }, { label: 'المجموعة', r: function (n) { const c = expCat(n); return h(c ? gName(c.group) : ''); } },
    { label: 'العمليات', num: true, r: function (n) { return by[n] ? by[n].n : 0; } }, { label: 'المبلغ', num: true, r: function (n) { return money(by[n] ? by[n].t : 0); } },
    { label: 'النسبة', num: true, r: function (n) { const v = by[n] ? by[n].t : 0; return total ? '<div class="exp-pbar"><i style="width:' + (v / total * 100) + '%;background:' + h((expCat(n) || {}).color || '#64748b') + '"></i></div>' + nf(v / total * 100, 1) + '%' : '—'; } },
    { label: 'الميزانية للفترة', num: true, r: function (n) { const c = expCat(n); return c && +c.budget > 0 ? money(+c.budget * k) : '—'; } },
    { label: 'الاستهلاك', num: true, r: function (n) { const c = expCat(n); if (!c || !(+c.budget > 0)) return '—'; const p = (by[n] ? by[n].t : 0) / (+c.budget * k) * 100; return '<b style="color:' + (p > 100 ? '#f87171' : p > 85 ? '#fbbf24' : '#6ee7b7') + '">' + nf(p, 0) + '%</b>'; } }], names) + '</details>';
}
async function expManage(done) {
  await expLoadCfg(true);
  const cats = mgClone(expCats(true)).map(function (c) { c._orig = c.name; return c; });
  const use = await bz('expCatUsage', {}, { loading: false }).catch(function () { return {}; });
  const usage = {}; ((use && use.rows) || []).forEach(function (u) { usage[u.category] = u; });
  Object.keys(usage).forEach(function (n) { if (!cats.some(function (c) { return c.name === n; })) cats.push({ name: n, _orig: n, color: '#64748b', budget: 0, group: 'oth', active: true }); });
  const m = bModal({ title: 'إدارة بنود المصروفات', icon: 'tags', xwide: true, print: false, sub: 'أضف بنوداً جديدة، غيّر الأسماء والألوان والترتيب، حدد ميزانية شهرية، أو أخفِ البنود غير المستخدمة',
    body: '<div class="sr-note"><i class="fas fa-info-circle"></i> إعادة تسمية بند تُحدّث كل المصروفات السابقة المسجلة به تلقائياً. البند المستخدم لا يُحذف بل يمكن إخفاؤه من قائمة الإدخال.</div><div id="ecL"></div>' +
      '<div class="sr-row-btns"><button type="button" class="btn btn-outline btn-sm" data-act="add"><i class="fas fa-plus"></i> بند جديد</button><button type="button" class="btn btn-outline btn-sm" data-act="sort"><i class="fas fa-sort-alpha-down"></i> ترتيب أبجدي</button><button type="button" class="btn btn-outline btn-sm" data-act="def"><i class="fas fa-rotate-left"></i> إضافة البنود الافتراضية الناقصة</button></div>',
    foot: '<button class="btn btn-cancel" data-x>إلغاء</button><button class="btn btn-primary" data-act="save"><i class="fas fa-check"></i> حفظ البنود</button>',
    actions: {
      add: function () { collect(); cats.push({ name: '', color: PALETTE[cats.length % 10], budget: 0, group: 'op', active: true }); draw(); const ins = m.$$('[data-ef=name]'); ins[ins.length - 1].focus(); },
      sort: function () { collect(); cats.sort(function (a, b) { return String(a.name).localeCompare(String(b.name), 'ar'); }); draw(); },
      def: function () { collect(); expDefCats().forEach(function (d) { if (!cats.some(function (c) { return c.name === d.name; })) cats.push(d); }); draw(); },
      save: async function (mm, btn) {
        collect();
        const L = cats.filter(function (c) { return String(c.name || '').trim(); });
        const names = L.map(function (c) { return c.name.trim(); });
        if (names.some(function (n, i) { return names.indexOf(n) !== i; })) { showToast('يوجد اسم بند مكرر', true); return; }
        if (!L.some(function (c) { return c.active !== false; })) { showToast('يجب أن يبقى بند واحد ظاهر على الأقل', true); return; }
        btn.disabled = true;
        try {
          for (const c of L) if (c._orig && c._orig !== c.name.trim() && usage[c._orig]) await bzOk('expCatRename', { from: c._orig, to: c.name.trim() });
          const out = L.map(function (c) { return { name: c.name.trim(), color: c.color, budget: +c.budget || 0, group: c.group, active: c.active !== false }; });
          const r = await bzOk('mgmtSave', { kind: 'exp_cfg', data: { title: 'exp_cfg', data: { cats: out } } });
          EXP_CFG = { id: r.row.id, cats: out }; showToast('تم حفظ البنود'); m.close(); done && done();
        } catch (e) { } finally { btn.disabled = false; }
      },
    } });
  const draw = function () {
    m.$('#ecL').innerHTML = '<div class="table-container biz-table"><table><thead><tr><th></th><th>اللون</th><th>اسم البند</th><th>المجموعة</th><th class="num">الميزانية الشهرية</th><th class="num">الاستخدام</th><th>ظاهر</th><th></th></tr></thead><tbody>' +
      cats.map(function (c, i) { const u = usage[c._orig || c.name];
        return '<tr' + (c.active === false ? ' style="opacity:.55"' : '') + '><td style="white-space:nowrap"><button type="button" class="ico-btn" data-emv="-1" data-i="' + i + '"><i class="fas fa-arrow-up"></i></button><button type="button" class="ico-btn" data-emv="1" data-i="' + i + '"><i class="fas fa-arrow-down"></i></button></td>' +
          '<td><input type="color" data-ef="color" data-i="' + i + '" value="' + h(c.color || '#64748b') + '" class="exp-color"></td><td><input data-ef="name" data-i="' + i + '" value="' + h(c.name) + '" placeholder="اسم البند" style="min-width:150px">' + (c._orig && c._orig !== c.name && u ? '<small class="muted"> (كان: ' + h(c._orig) + ')</small>' : '') + '</td>' +
          '<td><select data-ef="group" data-i="' + i + '">' + EXP_GROUPS.map(function (g) { return '<option value="' + g[0] + '"' + (g[0] === c.group ? ' selected' : '') + '>' + g[1] + '</option>'; }).join('') + '</select></td>' +
          '<td class="num"><input type="number" step="any" dir="ltr" data-ef="budget" data-i="' + i + '" value="' + h(c.budget || '') + '" style="width:110px" placeholder="0"></td>' +
          '<td class="num">' + (u ? u.n + ' · ' + money(u.total) : '<span class="muted">غير مستخدم</span>') + '</td>' +
          '<td><input type="checkbox" data-ef="active" data-i="' + i + '"' + (c.active !== false ? ' checked' : '') + '></td>' +
          '<td>' + (u ? '' : '<button type="button" class="ico-btn" data-edel="' + i + '"><i class="fas fa-trash"></i></button>') + '</td></tr>'; }).join('') + '</tbody></table></div>';
  };
  const collect = function () {
    m.$$('[data-ef]').forEach(function (e) { const c = cats[+e.dataset.i], f = e.dataset.ef; if (!c) return; c[f] = f === 'active' ? e.checked : f === 'budget' ? parseFloat(e.value) || 0 : e.value; });
  };
  m.el.addEventListener('click', function (e) {
    const mv = e.target.closest('[data-emv]'), dl = e.target.closest('[data-edel]');
    if (mv) { collect(); const i = +mv.dataset.i, j = i + (+mv.dataset.emv); if (j < 0 || j >= cats.length) return; const x = cats[i]; cats[i] = cats[j]; cats[j] = x; draw(); }
    if (dl) { collect(); cats.splice(+dl.dataset.edel, 1); draw(); }
  });
  m.el.addEventListener('change', function (e) { if (e.target.dataset.ef === 'active') { collect(); draw(); } });
  draw();
}

// ============================================================
// تذكير انتهاء الاشتراك (شريط + نافذة قبل 7 أيام على الأقل)
// ============================================================
function subRemind(r) {
  if (!r) return;
  const days = parseInt(r.daysLeft), rd = Math.max(7, parseInt(r.remindDays) || 7);
  const old = document.getElementById('subRemBar'); if (old) old.remove();
  if (!Number.isFinite(days) || days > Math.max(14, rd)) return;
  const own = r.isOwner;
  if (!own && days > rd) return;
  if (sessionStorage.getItem('fcSubBarX') === String(days)) return;
  const col = days <= 3 ? '#ef4444' : days <= rd ? '#f59e0b' : '#3b82f6';
  const txt = days <= 0 ? 'انتهى اشتراكك اليوم' : 'يتبقى ' + days + ' ' + (days === 1 ? 'يوم' : days === 2 ? 'يومان' : days <= 10 ? 'أيام' : 'يوماً') + ' على انتهاء اشتراك المطعم';
  const bar = document.createElement('div'); bar.id = 'subRemBar'; bar.className = 'sub-rem-bar'; bar.style.setProperty('--c', col);
  bar.innerHTML = '<i class="fas fa-bell"></i><span><b>' + txt + '</b> في باقة ' + h(r.planName || '') + (r.expiryDate ? ' · تاريخ الانتهاء ' + h(r.expiryDate) : '') + (own ? '' : ' — يرجى إبلاغ صاحب الحساب للتجديد') + '</span>' +
    (own ? '<button class="btn btn-sm" data-sr="renew"><i class="fas fa-rotate"></i> جدّد الآن</button>' : '') + '<button class="ico-btn" data-sr="x" aria-label="إخفاء"><i class="fas fa-times"></i></button>';
  const host = document.querySelector('.app-main-content') || document.body; host.insertBefore(bar, host.firstChild);
  bar.onclick = function (e) { const b = e.target.closest('[data-sr]'); if (!b) return; if (b.dataset.sr === 'renew') bizOpenPayment(r.plan); else { sessionStorage.setItem('fcSubBarX', String(days)); bar.remove(); } };
  const key = 'fcSubRem:' + (typeof currentUserEmail !== 'undefined' ? currentUserEmail : '') + ':' + isoLocal();
  if (own && days <= rd && !localStorage.getItem(key)) {
    localStorage.setItem(key, '1');
    setTimeout(function () {
      bModal({ title: 'تذكير بتجديد الاشتراك', icon: 'bell', body: '<div class="sub-rem-modal" style="--c:' + col + '"><div class="big">' + Math.max(0, days) + '<small>' + (days === 1 ? 'يوم' : 'أيام') + '</small></div><p>' + txt + ' في باقة <b>' + h(r.planName || '') + '</b>' + (r.expiryDate ? ' بتاريخ <b>' + h(r.expiryDate) + '</b>' : '') + '.</p><p class="muted">التجديد يضيف سنة كاملة على تاريخ الانتهاء الحالي دون فقدان الأيام المتبقية، ويضمن استمرار الكاشير والتقارير والمينيو الإلكتروني دون توقف.</p></div>',
        foot: '<button class="btn btn-cancel" data-x>لاحقاً</button><button class="btn btn-primary" data-act="renew"><i class="fas fa-crown"></i> تجديد الاشتراك الآن</button>',
        actions: { renew: function (m) { m.close(); bizOpenPayment(r.plan); } } });
    }, 1200);
  }
}
(function () {
  if (typeof loadAccount !== 'function' || loadAccount.__subHook) return;
  const orig = loadAccount;
  loadAccount = async function () { const r = await orig.apply(this, arguments); try { subRemind(r); } catch (e) { console.warn(e); } return r; };
  loadAccount.__subHook = true;
})();
