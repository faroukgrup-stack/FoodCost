// ============================================================
// biz-ops.js — المنتجات، المخزون والجرد والهدر، التحويلات، الإنتاج، المشتريات والموردون
// ============================================================
const MOVE_NAMES = { sale: 'بيع', refund: 'مرتجع', purchase: 'شراء', purchase_cancel: 'إلغاء شراء', adjust: 'تسوية', count: 'جرد', waste: 'هدر/تالف', opening: 'رصيد افتتاحي', transfer_in: 'تحويل وارد', transfer_out: 'تحويل صادر', production_in: 'إنتاج (وارد)', production_out: 'إنتاج (صرف مواد)' };
function parseOpts(txt) { return String(txt || '').split('\n').map(function (l) { const m = l.split(/[:=،,]/); const n = (m[0] || '').trim(); return n ? { name: n, price: parseFloat((m[1] || '0').trim()) || 0 } : null; }).filter(Boolean); }
function optsText(a) { return (a || []).map(function (x) { return x.name + ' : ' + x.price; }).join('\n'); }

// ---------- المنتجات ----------
bizPage('products', { group: 'stock', title: 'المنتجات', icon: 'box', feature: 'inventory', perms: ['inventory'], plan: 'pro',
  pitch: 'كتالوج منتجات الكاشير مع الأحجام والإضافات والباركود والضريبة، واستيراد مباشر من المينيو الإلكتروني أو الأطباق.',
  render: async function (body) {
    const lim = B.acc.limits && B.acc.limits.products;
    body.innerHTML = '<div class="biz-toolbar"><input class="biz-search grow" id="prQ" placeholder="بحث بالاسم / الباركود / التصنيف">' +
      '<button class="btn btn-primary btn-sm" id="prAdd"><i class="fas fa-plus"></i> منتج جديد</button>' +
      '<button class="btn btn-outline btn-sm" id="prImpM"><i class="fas fa-qrcode"></i> استيراد من المينيو الإلكتروني</button>' +
      '<button class="btn btn-outline btn-sm" id="prImpR"><i class="fas fa-clipboard-list"></i> استيراد من الأطباق</button></div>' +
      '<div class="muted" id="prLim" style="margin-bottom:8px"></div>' +
      (canP('settings') ? '<div class="sx-bulk" id="prBulk" hidden><span id="prSelN"></span><button class="btn btn-danger btn-sm" id="prBulkDel"><i class="fas fa-trash"></i> حذف المحدد</button><button class="btn btn-outline btn-sm" id="prBulkClr">إلغاء التحديد</button></div>' : '') +
      '<div id="prList"></div>';
    let rows = []; const sel = new Set(); const bulk = canP('settings');
    const selUI = function () {
      const bar = body.querySelector('#prBulk'); if (!bar) return;
      bar.hidden = !sel.size; body.querySelector('#prSelN').textContent = 'تم تحديد ' + sel.size + ' منتج';
      const all = body.querySelector('#prAll'); if (all) { const vis = [...body.querySelectorAll('[data-sel]')]; all.checked = vis.length && vis.every(function (c) { return c.checked; }); }
    };
    const draw = function () {
      const q = body.querySelector('#prQ').value.trim().toLowerCase();
      const list = rows.filter(function (p) { return !q || (p.name + ' ' + p.category + ' ' + p.barcode + ' ' + p.sku).toLowerCase().includes(q); });
      body.querySelector('#prLim').textContent = 'عدد المنتجات: ' + rows.length + (lim >= 0 ? ' من ' + lim + ' (حد باقة الإنطلاقة)' : ' (بلا حد)');
      body.querySelector('#prList').innerHTML = bTable((bulk ? [{ label: '', html: '<input type="checkbox" class="sx-cb" id="prAll" title="تحديد الكل">', r: function (p) { return '<input type="checkbox" class="sx-cb" data-sel="' + p.id + '"' + (sel.has(p.id) ? ' checked' : '') + '>'; } }] : []).concat([
        { label: 'المنتج', r: function (p) { return (p.image_url ? '<img src="' + h(p.image_url) + '" style="width:34px;height:34px;border-radius:8px;object-fit:cover;vertical-align:middle;margin-left:8px">' : '') + '<b>' + h(p.name) + '</b>' + (p.kind === 'service' ? ' <span class="badge badge-info">خدمة</span>' : '') + (p.kind === 'semi' ? ' <span class="badge badge-cash">نصف مصنّع</span>' : '') + (p.active ? '' : ' <span class="badge badge-dog">موقوف</span>'); } },
        { label: 'التصنيف', r: function (p) { return h(p.category || '—'); } },
        { label: 'السعر', num: true, r: function (p) { return money(p.price); } }, { label: 'التكلفة', num: true, r: function (p) { return money(p.cost); } },
        { label: 'الهامش', num: true, r: function (p) { return p.price > 0 ? nf((p.price - p.cost) / p.price * 100, 0) + '%' : '—'; } },
        { label: 'خيارات', r: function (p) { return (p.variants || []).length + ' حجم · ' + (p.extras || []).length + ' إضافة'; } },
        { label: 'مخزون', r: function (p) { return p.track_stock ? '<i class="fas fa-check" style="color:#6ee7b7"></i>' : (p.recipe_name ? '<span class="muted" style="font-size:.78rem">بالوصفة</span>' : '—'); } },
        { label: '', r: function (p) { return '<button class="ico-btn" data-e="' + p.id + '"><i class="fas fa-pen"></i></button><button class="ico-btn danger" data-d="' + p.id + '"><i class="fas fa-trash"></i></button>'; } }
      ]), list, { empty: 'لا توجد منتجات — أضف منتجاً أو استورد من المينيو' });
      selUI();
    };
    if (bulk) {
      body.querySelector('#prList').addEventListener('change', function (e) {
        if (e.target.id === 'prAll') { body.querySelectorAll('[data-sel]').forEach(function (c) { c.checked = e.target.checked; if (c.checked) sel.add(c.dataset.sel); else sel.delete(c.dataset.sel); }); selUI(); return; }
        const c = e.target.closest('[data-sel]'); if (!c) return; if (c.checked) sel.add(c.dataset.sel); else sel.delete(c.dataset.sel); selUI();
      });
      body.querySelector('#prBulkClr').onclick = function () { sel.clear(); draw(); };
      body.querySelector('#prBulkDel').onclick = async function () {
        if (!sel.size) return;
        if (!(await bConfirm('سيتم حذف ' + sel.size + ' منتج نهائياً من الكاشير والمخزون. لا يمكن التراجع. هل تريد المتابعة؟'))) return;
        const r = await bzOk('entityDeleteMany', { kind: 'products', ids: [...sel] });
        showToast('تم حذف ' + r.deleted + ' منتج' + (r.failed ? ' — تعذر حذف ' + r.failed : ''), !!r.failed);
        sel.clear(); load();
      };
    }
    const load = async function () { rows = await entList('products'); draw(); };
    body.querySelector('#prQ').oninput = draw;
    body.querySelector('#prAdd').onclick = function () { productEdit(null, load, rows); };
    body.querySelector('#prImpM').onclick = function () { productsImport('menu', load); };
    body.querySelector('#prImpR').onclick = function () { productsImport('recipes', load); };
    body.querySelector('#prList').onclick = async function (e) {
      const ed = e.target.closest('[data-e]'); if (ed) productEdit(rows.find(function (x) { return x.id === ed.dataset.e; }), load, rows);
      const d = e.target.closest('[data-d]'); if (d && await entDel('products', d.dataset.d, 'المنتج')) load();
    };
    await load();
  } });
async function productsImport(src, after) {
  if (!(await bConfirm(src === 'menu' ? 'استيراد أصناف المينيو الإلكتروني (الأسعار والأحجام والإضافات والصور) كمنتجات للكاشير؟ المنتجات الموجودة بنفس الاسم لن تتكرر.' : 'استيراد الأطباق من حاسبة التكلفة كمنتجات (السعر والتكلفة مرتبطة بالوصفة)؟'))) return;
  const r = await bzOk('productsImport', { source: src });
  showToast('تم استيراد ' + r.imported + ' منتج' + (r.skipped ? ' (تم تخطي ' + r.skipped + ')' : ''));
  after();
}
async function productEdit(p, after, all) {
  let recipes = [], menu = [];
  try { const r = await bz('recipesBrief', {}, { silentPlan: true }); recipes = r.recipes || []; } catch (e) { }
  try { const r = await bz('getDigitalMenu', { restaurantEmail: currentUserEmail }, { silentPlan: true }); menu = (r.items || []).filter(function (x) { return x && x.name; }); } catch (e) { }
  const taken = new Set((all || []).filter(function (x) { return !p || x.id !== p.id; }).map(function (x) { return window.fcArN ? fcArN(x.name) : String(x.name).trim().toLowerCase(); }));
  const cats = [...new Set((all || []).map(function (x) { return x.category; }).filter(Boolean))];
  const src0 = p ? (p.recipe_name ? 'dish' : 'custom') : (recipes.length ? 'dish' : (menu.length ? 'menu' : 'custom'));
  const opt = function (list, lab) { return '<option value="">— اختر —</option>' + list.map(function (x, i) { const used = taken.has(window.fcArN ? fcArN(x.name) : String(x.name).trim().toLowerCase()); return '<option value="' + i + '">' + h(lab(x)) + (used ? ' (مضاف مسبقاً)' : '') + '</option>'; }).join(''); };
  const srcHtml = '<div class="prod-src">' +
    '<div class="prod-src-tabs">' + [['dish', 'utensils', 'من الأطباق', 'طبق محسوب التكلفة'], ['menu', 'book-open', 'من المينيو الإلكتروني', 'بالأحجام والإضافات والصورة'], ['custom', 'box', 'منتج مستقل', 'مشروب جاهز أو سلعة']].map(function (t) {
      return '<label class="prod-src-card"><input type="radio" name="prodSrc" value="' + t[0] + '"' + (t[0] === src0 ? ' checked' : '') + '><i class="fas fa-' + t[1] + '"></i><b>' + t[2] + '</b><small>' + t[3] + '</small></label>'; }).join('') + '</div>' +
    '<div class="prod-src-pick" data-src="dish"><label>اختر الطبق</label><select id="prodDish" data-search>' + (recipes.length ? opt(recipes, function (r) { return r.name + ' · سعر ' + money(r.price || 0) + ' · تكلفة ' + money(r.cost || 0); }) : '<option value="">لا توجد أطباق — أضفها من حاسبة التكلفة</option>') + '</select></div>' +
    '<div class="prod-src-pick" data-src="menu"><label>اختر صنف المينيو</label><select id="prodMenu" data-search>' + (menu.length ? opt(menu, function (m) { return m.name + (m.category && m.category !== 'الكل' ? ' · ' + m.category : ''); }) : '<option value="">المينيو الإلكتروني فارغ</option>') + '</select></div>' +
    '<p class="prod-src-note">المنتج هو ما يظهر في الكاشير. اختيار طبق أو صنف يعبّئ الاسم والسعر والتكلفة تلقائياً ويمكنك تعديلها.</p></div>';
  const fields = [
    { type: 'html', html: srcHtml },
    { type: 'section', label: 'بيانات المنتج في الكاشير' },
    { type: 'html', full: true, html: '<div class="sx-nm-note"><i class="fas fa-language"></i> ' + h(fcT('اسم المنتج')) + ' <span class="req">*</span> <small>' + h(fcT('لغة واحدة على الأقل — بقية اللغات اختيارية')) + '</small></div>' },
    { k: 'name_ar', label: 'العربية' }, { k: 'name_en', label: 'English', ltr: true }, { k: 'name_tr', label: 'Türkçe', ltr: true }, { k: 'category', label: 'التصنيف', ph: cats.slice(0, 3).join('، ') || 'مشروبات' },
    { k: 'price', label: 'سعر البيع', type: 'number', req: true }, { k: 'cost', label: 'التكلفة', type: 'number', hint: 'تُحدّث تلقائياً من الطبق أو فواتير الشراء' },
    { k: 'recipe_name', label: 'الطبق المرتبط', type: 'select', options: [['', '— بدون —']].concat(recipes.map(function (r) { return [r.name, r.name + ' · تكلفة ' + money(r.cost)]; })), hint: hasF('production') ? 'عند البيع تُخصم مكونات الطبق من المواد الأولية' : 'خصم مكونات الطبق من المخزون متاح في الباقة المتقدمة' },
    { k: 'active', label: 'متاح للبيع في الكاشير', type: 'checkbox', def: true },
    { k: 'variants', label: 'الأحجام (سطر لكل حجم: الاسم : السعر)', type: 'textarea', full: true, ph: 'صغير : 10\nوسط : 14\nكبير : 18' },
    { k: 'extras', label: 'الإضافات (سطر لكل إضافة: الاسم : السعر)', type: 'textarea', full: true, ph: 'جبنة إضافية : 3' },
    { type: 'section', label: 'إعدادات متقدمة' },
    { k: 'kind', label: 'النوع', type: 'select', options: [['product', 'منتج'], ['service', 'خدمة (بدون مخزون)'], ['semi', 'نصف مصنّع (يُنتج بأوامر الإنتاج)']] },
    { k: 'unit', label: 'الوحدة', def: 'قطعة' },
    { k: 'barcode', label: 'الباركود', ltr: true }, { k: 'sku', label: 'رمز المنتج SKU', ltr: true },
    { k: 'shelf_life_hours', label: 'مدة الصلاحية بالساعات (للمنتجات المصنّعة)', type: 'number', hint: 'مثال: 48 = يومان — تُحسب منها تواريخ الانتهاء على ملصقات QR لأوامر الإنتاج' }, { k: 'storage_note', label: 'طريقة الحفظ', ph: 'مبرد 0-4°م' },
    { k: 'tax_rate', label: 'نسبة ضريبة خاصة %', type: 'number', hint: 'اتركها فارغة لاستخدام النسبة العامة' },
    { k: 'color', label: 'لون الزر', type: 'color', def: '#b48554' }, { k: 'sort', label: 'الترتيب', type: 'number', def: 0 },
    { k: 'image_url', label: 'رابط الصورة', ltr: true, full: true },
    { k: 'track_stock', label: 'تتبع مخزون هذا المنتج كسلعة جاهزة', type: 'checkbox', def: false }, { k: 'show_in_kitchen', label: 'يظهر في شاشة المطبخ', type: 'checkbox', def: true },
    { k: 'station', label: 'شاشة / قسم التحضير', type: 'select', options: [['', 'حسب التصنيف (تلقائي)'], ['main', 'المطبخ الرئيسي']].concat(((B.acc && B.acc.biz && B.acc.biz.kds && B.acc.biz.kds.stations) || []).map(function (x) { return [x.id, x.name]; })), hint: 'يحدد أي شاشة مطبخ يظهر عليها هذا المنتج' },
    { type: 'section', label: 'السعرات الحرارية ومسببات الحساسية' },
    { k: 'calories', label: 'السعرات الحرارية (kcal) للحصة', type: 'number', hint: 'تُحسب تلقائياً من مكونات الطبق في صفحة «السعرات والحساسية» ويمكن تعديلها' },
    { type: 'html', full: true, html: '<label style="display:block;margin-bottom:6px">مسببات الحساسية</label><div id="prodAl">' + (window.FC_NUTRI ? FC_NUTRI.alGridHtml((p && p.allergens) || []) : '') + '</div>' }
  ];
  const un0 = (p && window.FC_UN && window.FC_UN[String(p.name || '').replace(/\s+/g, ' ').trim()]) || {};
  const nm0 = window.fcNm ? fcNm.split(p ? p.name : '') : { ar: p ? p.name : '', en: un0.en || '', tr: un0.tr || '' };
  const v = p ? Object.assign({}, p, { name_ar: nm0.ar, name_en: nm0.en, name_tr: nm0.tr, variants: optsText(p.variants), extras: optsText(p.extras), tax_rate: p.tax_rate === null ? '' : p.tax_rate, calories: p.calories === null || p.calories === undefined ? '' : p.calories, station: p.station || '' }) : {};
  bPrompt(p ? 'تعديل منتج' : 'منتج جديد', fields, v, async function (d) {
    d.variants = parseOpts(d.variants); d.extras = parseOpts(d.extras);
    if (d.tax_rate === '') d.tax_rate = null;
    if (p) d.id = p.id;
    d.calories = d.calories === '' || d.calories === null || d.calories === undefined ? null : +d.calories;
    const alEl = document.getElementById('prodAl'); if (alEl && window.FC_NUTRI) d.allergens = FC_NUTRI.readAl(alEl);
    const pk = window.fcNm ? fcNm.pick({ ar: d.name_ar, en: d.name_en, tr: d.name_tr }) : { name: d.name_ar, tr: { en: d.name_en, tr: d.name_tr } };
    if (!pk.name) { showToast('اكتب اسم المنتج بلغة واحدة على الأقل (عربي أو English أو Türkçe)', true); return false; }
    d.name = pk.name; delete d.name_ar;
    if (taken.has(window.fcArN ? fcArN(d.name) : d.name.toLowerCase())) { showToast('الاسم «' + d.name + '» مستخدم مسبقاً لمنتج آخر — لا يمكن تكرار نفس الاسم', true); return false; }
    delete d.name_en; delete d.name_tr;
    await entSave('products', d);
    if (window.fcSaveNames) await fcSaveNames(d.name, pk.tr, p && p.name);
    after();
  }, { wide: true, icon: 'box', onOpen: function (m) {
    const el = m.el || m, q = function (k) { return el.querySelector('[data-k="' + k + '"]'); };
    const set = function (k, val) { const x = q(k); if (x && val !== undefined && val !== null) x.value = val; };
    const setName = function (n) { const sp = window.fcNm ? fcNm.split(n) : { ar: n }; set('name_ar', sp.ar || ''); set('name_en', sp.en || ''); set('name_tr', sp.tr || ''); };
    const show = function () {
      const cur = (el.querySelector('input[name="prodSrc"]:checked') || {}).value || 'custom';
      el.querySelectorAll('.prod-src-pick').forEach(function (x) { x.style.display = x.dataset.src === cur ? '' : 'none'; });
      el.querySelectorAll('.prod-src-card').forEach(function (x) { x.classList.toggle('on', x.querySelector('input').checked); });
    };
    el.querySelectorAll('input[name="prodSrc"]').forEach(function (r) { r.addEventListener('change', show); });
    const dsel = el.querySelector('#prodDish'), msel = el.querySelector('#prodMenu');
    if (dsel) dsel.addEventListener('change', function () {
      const r = recipes[+dsel.value]; if (dsel.value === '' || !r) return;
      setName(r.name); set('price', +(r.price || 0).toFixed(2)); set('cost', +(r.cost || 0).toFixed(2)); set('recipe_name', r.name);
      if (!q('category').value) set('category', 'الأطباق');
    });
    if (msel) msel.addEventListener('change', function () {
      const it = menu[+msel.value]; if (msel.value === '' || !it) return;
      const sizes = Array.isArray(it.sizes) ? it.sizes.filter(function (z) { return z && z.name; }) : [];
      const rec = it.recipeName && recipes.find(function (r) { return r.name === it.recipeName; });
      setName(it.name); set('category', it.category && it.category !== 'الكل' ? it.category : 'عام');
      set('price', sizes.length ? +sizes[0].price || 0 : +it.price || 0);
      set('variants', sizes.length > 1 ? optsText(sizes.map(function (z) { return { name: z.name, price: +z.price || 0 }; })) : '');
      set('extras', optsText((Array.isArray(it.extras) ? it.extras : []).map(function (e) { return { name: e.name, price: +e.price || 0 }; })));
      set('image_url', it.imageUrl || it.image || '');
      if (rec) { set('cost', +(rec.cost || 0).toFixed(2)); set('recipe_name', rec.name); }
    });
    const rsel = q('recipe_name');
    if (rsel) rsel.addEventListener('change', function () { const r = recipes.find(function (x) { return x.name === rsel.value; }); if (r && !(+q('cost').value)) set('cost', +(r.cost || 0).toFixed(2)); });
    show();
  } });
}

// ---------- المخزون ----------
bizPage('inventory', { group: 'stock', title: 'المخزون والجرد', icon: 'warehouse', feature: 'inventory', perms: ['inventory'], plan: 'pro',
  pitch: 'أرصدة المواد الأولية والمنتجات لكل فرع، الجرد الفعلي، تسجيل الهدر والتالف، حد أدنى وتنبيهات، وسجل حركة كامل.',
  render: async function (body) {
    const tabs = [['stock', 'الأرصدة', 'boxes'], ['count', 'الجرد', 'clipboard-check'], ['moves', 'حركة المخزون', 'exchange-alt'], ['transfers', 'التحويلات بين الفروع', 'truck', !hasF('transfers')], ['production', 'أوامر الإنتاج', 'industry', !hasF('production')], ['variance', 'التكلفة الفعلية والنظرية', 'balance-scale-left', !hasF('food_variance')]];
    body.innerHTML = subTabs('invSub', tabs, 'stock') + '<div id="invBody"></div>';
    const el = body.querySelector('#invBody');
    bindSubTabs(body, 'invSub', function (k) { ({ stock: stockView, count: countView, moves: movesView, transfers: transfersView, production: productionView, variance: varianceView })[k](el); });
    stockView(el);
  } });
async function stockItems() { const r = await bzOk('stockList', {}, { loading: false }); return r; }
async function stockView(el) {
  el.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-pulse"></i></div>';
  const r = await stockItems();
  let filter = 'all', q = '';
  el.innerHTML = kpis([['قيمة المخزون', money(r.totalValue)], ['عدد الأصناف', r.items.length], ['أصناف منخفضة', r.lowCount, '', r.lowCount ? '#f59e0b' : '']]) +
    '<div class="biz-toolbar"><input class="biz-search grow" id="stQ" placeholder="بحث"><select class="biz-branch-sel" id="stF"><option value="all">الكل</option><option value="material">المواد الأولية</option><option value="product">المنتجات</option><option value="low">المنخفضة فقط</option></select>' +
    '</div><div id="stList"></div>';
  const draw = function () {
    const list = r.items.filter(function (i) { return (filter === 'all' || (filter === 'low' ? i.low : i.itemType === filter)) && (!q || i.name.toLowerCase().includes(q)); });
    el.querySelector('#stList').innerHTML = bTable([
      { label: 'الصنف', r: function (i) { return '<b>' + h(i.name) + '</b> <span class="muted" style="font-size:.76rem">' + (i.itemType === 'material' ? 'مادة' : 'منتج') + '</span>'; } },
      { label: 'الوحدة', r: function (i) { return h(i.unit || ''); } }, { label: 'الرصيد', num: true, r: function (i) { return '<b style="color:' + (i.low ? '#fbbf24' : i.qty < 0 ? '#f87171' : 'inherit') + '">' + nf(i.qty, 3).replace(/\.?0+$/, '') + '</b>'; } },
      { label: 'الحد الأدنى', num: true, r: function (i) { return i.minQty ? nf(i.minQty, 2) : '—'; } }, { label: 'التكلفة', num: true, r: function (i) { return nf(i.cost, 3); } }, { label: 'القيمة', num: true, r: function (i) { return money(i.value); } },
      { label: '', r: function (i, n) { return '<button class="btn btn-outline btn-sm" data-a="adj" data-i="' + n + '">تسوية</button> <button class="btn btn-outline btn-sm" data-a="waste" data-i="' + n + '">هدر</button> <button class="ico-btn" data-a="min" data-i="' + n + '" title="الحد الأدنى"><i class="fas fa-bell"></i></button> <button class="ico-btn" data-a="mv" data-i="' + n + '" title="الحركة"><i class="fas fa-history"></i></button>'; } }
    ], list, { empty: 'لا توجد أصناف — أضف مواد أولية من صفحة المواد أو فعّل تتبع المخزون للمنتجات' });
    el.querySelector('#stList').onclick = function (e) {
      const b = e.target.closest('[data-a]'); if (!b) return; const it = list[+b.dataset.i];
      if (b.dataset.a === 'adj') stockAdjustModal(it, 'adjust', function () { stockView(el); });
      if (b.dataset.a === 'waste') stockAdjustModal(it, 'waste', function () { stockView(el); });
      if (b.dataset.a === 'min') bPrompt('الحد الأدنى — ' + it.name, [{ k: 'minQty', label: 'تنبيه عند وصول الرصيد إلى', type: 'number', req: true }], { minQty: it.minQty }, async function (d) { await bzOk('stockSetMin', { itemType: it.itemType, itemId: it.itemId, minQty: d.minQty }); showToast('تم الحفظ'); stockView(el); });
      if (b.dataset.a === 'mv') itemMovesModal(it);
    };
  };
  el.querySelector('#stQ').oninput = function (e) { q = e.target.value.trim().toLowerCase(); draw(); };
  el.querySelector('#stF').onchange = function (e) { filter = e.target.value; draw(); };
  (el.querySelector('#stX') || {}).onclick = function () { exportRowsExcel('المخزون', ['الصنف', 'النوع', 'الوحدة', 'الرصيد', 'الحد الأدنى', 'التكلفة', 'القيمة'], r.items.map(function (i) { return [i.name, i.itemType === 'material' ? 'مادة' : 'منتج', i.unit, i.qty, i.minQty, i.cost, i.value]; })); };
  draw();
}
function stockAdjustModal(it, reason, after) {
  const waste = reason === 'waste';
  bPrompt((waste ? 'تسجيل هدر / تالف — ' : 'تسوية مخزون — ') + it.name, [
    { k: 'mode', label: 'العملية', type: 'select', options: waste ? [['remove', 'خصم كمية تالفة']] : [['add', 'إضافة كمية'], ['remove', 'خصم كمية'], ['set', 'تعيين الرصيد إلى']] },
    { k: 'qty', label: 'الكمية (' + (it.unit || '') + ')', type: 'number', req: true },
    { k: 'reason', label: 'السبب', type: 'select', options: waste ? [['waste', 'هدر / تالف']] : [['adjust', 'تسوية'], ['opening', 'رصيد افتتاحي']] },
    { k: 'note', label: 'ملاحظة', full: true }
  ], {}, async function (d) {
    await bzOk('stockAdjust', Object.assign({ itemType: it.itemType, itemId: it.itemId }, d)); showToast('تم التسجيل'); after();
  }, { icon: waste ? 'trash-alt' : 'balance-scale', sub: 'الرصيد الحالي: ' + nf(it.qty, 3) });
}
async function itemMovesModal(it) {
  const r = await bzOk('stockMoves', { itemId: it.itemId, from: daysAgo(89), to: isoLocal() });
  bModal({ title: 'حركة: ' + it.name, icon: 'history', xwide: true, sub: 'آخر 90 يوماً',
    body: bTable([{ label: 'التاريخ', r: function (m) { return dt(m.created_at); } }, { label: 'الحركة', r: function (m) { return h(MOVE_NAMES[m.reason] || m.reason); } }, { label: 'الكمية', num: true, r: function (m) { return '<span style="color:' + (m.qty < 0 ? '#f87171' : '#6ee7b7') + '">' + nf(m.qty, 3) + '</span>'; } }, { label: 'الوحدة', r: function (m) { return h(m.unit || '—'); } }, { label: 'التكلفة', num: true, r: function (m) { return nf(m.unit_cost, 3); } }, { label: 'ملاحظة', r: function (m) { return h(m.note); } }, { label: 'بواسطة', r: function (m) { return h(m.actor); } }], r.moves) });
}
async function countView(el) {
  el.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-pulse"></i></div>';
  const r = await stockItems();
  el.innerHTML = '<div class="biz-card"><p class="muted" style="line-height:1.9">أدخل الكمية الفعلية لكل صنف بعد العدّ. الأصناف التي تتركها فارغة لن تتغير. الفروقات تُسجّل كحركة «جرد» في سجل المخزون.</p></div>' +
    '<div class="biz-toolbar"><input class="biz-search grow" id="ctQ" placeholder="بحث"><button class="btn btn-primary btn-sm" id="ctSave"><i class="fas fa-check"></i> اعتماد الجرد</button></div>' +
    bTable([{ label: 'الصنف', r: function (i) { return h(i.name); } }, { label: 'الوحدة', r: function (i) { return h(i.unit || ''); } }, { label: 'الرصيد بالنظام', num: true, r: function (i) { return nf(i.qty, 3); } },
      { label: 'الكمية الفعلية', r: function (i, n) { return '<input type="number" step="any" class="biz-search" style="min-width:0;width:120px" data-ci="' + n + '" dir="ltr">'; } }, { label: 'الفرق', num: true, r: function (i, n) { return '<span data-cd="' + n + '">—</span>'; } }], r.items, { rowAttr: function (i) { return 'data-name="' + h(i.name.toLowerCase()) + '"'; } });
  el.querySelector('#ctQ').oninput = function (e) { const q = e.target.value.trim().toLowerCase(); el.querySelectorAll('tr[data-name]').forEach(function (tr) { tr.style.display = !q || tr.dataset.name.includes(q) ? '' : 'none'; }); };
  el.addEventListener('input', function (e) { if (!e.target.dataset.ci) return; const i = r.items[+e.target.dataset.ci], v = e.target.value; const d = el.querySelector('[data-cd="' + e.target.dataset.ci + '"]'); if (v === '') { d.textContent = '—'; return; } const diff = parseFloat(v) - i.qty; d.innerHTML = '<span style="color:' + (diff < 0 ? '#f87171' : diff > 0 ? '#6ee7b7' : 'inherit') + '">' + nf(diff, 3) + '</span>'; });
  el.querySelector('#ctSave').onclick = async function () {
    const counts = []; el.querySelectorAll('[data-ci]').forEach(function (inp) { if (inp.value !== '') { const i = r.items[+inp.dataset.ci]; counts.push({ itemType: i.itemType, itemId: i.itemId, counted: parseFloat(inp.value) }); } });
    if (!counts.length) { showToast('أدخل كمية صنف واحد على الأقل', true); return; }
    if (!(await bConfirm('اعتماد الجرد لـ ' + counts.length + ' صنف؟'))) return;
    const x = await bzOk('stockCount', { counts: counts }); showToast('تم اعتماد الجرد' + (x.changed !== undefined ? ' — ' + x.changed + ' صنف تغيّر' : ''));
    if (typeof varianceView === 'function' && hasF('food_variance') && await bConfirm('تم اعتماد الجرد. هل تريد عرض مقارنة التكلفة الفعلية بالتكلفة النظرية (الوصفات) الآن؟', 'التكلفة الفعلية والنظرية')) { const tb = document.querySelector('#invSub [data-sub="variance"]'); if (tb) { tb.click(); return; } }
    countView(el);
  };
}
function movesView(el) {
  el.innerHTML = dateRangeBar('mvRange', daysAgo(29), isoLocal(), '<select data-f="reason"><option value="">كل الحركات</option>' + Object.keys(MOVE_NAMES).map(function (k) { return '<option value="' + k + '">' + MOVE_NAMES[k] + '</option>'; }).join('') + '</select>') + '<div id="mvList"></div>';
  const get = bindRange(el, 'mvRange', load);
  async function load(f) {
    const r = await bzOk('stockMoves', f || get(), { loading: false });
    const waste = r.moves.filter(function (m) { return m.reason === 'waste'; }).reduce(function (s, m) { return s + Math.abs(m.value); }, 0);
    el.querySelector('#mvList').innerHTML = kpis([['عدد الحركات', r.moves.length], ['قيمة الهدر', money(waste), '', waste ? '#f87171' : '']]) +
      bTable([{ label: 'التاريخ', r: function (m) { return dt(m.created_at); } }, { label: 'الصنف', r: function (m) { return h(m.item_name); } }, { label: 'الحركة', r: function (m) { return h(MOVE_NAMES[m.reason] || m.reason); } }, { label: 'الكمية', num: true, r: function (m) { return '<span style="color:' + (m.qty < 0 ? '#f87171' : '#6ee7b7') + '">' + nf(m.qty, 3) + '</span>'; } }, { label: 'الوحدة', r: function (m) { return h(m.unit || '—'); } }, { label: 'القيمة', num: true, r: function (m) { return money(m.value); } }, { label: 'ملاحظة', r: function (m) { return h(m.note); } }, { label: 'بواسطة', r: function (m) { return h(m.actor); } }], r.moves);
  }
  load();
}
// محرر أسطر الأصناف (للمشتريات والتحويلات)
function linesEditor(m, items, withCost) {
  const lines = [];
  const box = m.$('#lnBox');
  const opts = items.map(function (i, n) { return '<option value="' + n + '">' + h(i.name) + ' (' + (i.itemType === 'material' ? 'مادة' : 'منتج') + ')</option>'; }).join('');
  function draw() {
    box.innerHTML = '<div class="biz-toolbar"><select class="biz-branch-sel grow" id="lnSel"><option value="">— اختر صنفاً لإضافته —</option>' + opts + '</select></div>' +
      bTable([{ label: 'الصنف', r: function (l) { return h(l.name); } }, { label: 'الكمية', r: function (l, n) { return '<input type="number" step="any" class="biz-search" style="min-width:0;width:90px" data-q="' + n + '" value="' + l.qty + '" dir="ltr"> ' + h(l.unit || ''); } }]
        .concat(withCost ? [{ label: 'سعر الوحدة', r: function (l, n) { return '<input type="number" step="any" class="biz-search" style="min-width:0;width:100px" data-c="' + n + '" value="' + l.unitCost + '" dir="ltr">'; } }, { label: 'الإجمالي', num: true, r: function (l) { return money(l.qty * l.unitCost); } }] : [])
        .concat([{ label: '', r: function (l, n) { return '<button class="ico-btn danger" data-rm="' + n + '"><i class="fas fa-times"></i></button>'; } }]), lines, { empty: 'لم تُضف أصناف بعد' }) +
      (withCost ? '<div style="text-align:left;font-weight:800;margin-top:6px">المجموع: ' + money(lines.reduce(function (s, l) { return s + l.qty * l.unitCost; }, 0)) + '</div>' : '');
    box.querySelector('#lnSel').onchange = function (e) { if (e.target.value === '') return; const it = items[+e.target.value]; lines.push({ itemType: it.itemType, itemId: it.itemId, name: it.name, unit: it.unit, qty: 1, unitCost: it.cost || 0 }); draw(); };
  }
  box.addEventListener('change', function (e) { if (e.target.dataset.q !== undefined) { lines[+e.target.dataset.q].qty = parseFloat(e.target.value) || 0; draw(); } if (e.target.dataset.c !== undefined) { lines[+e.target.dataset.c].unitCost = parseFloat(e.target.value) || 0; draw(); } });
  box.addEventListener('click', function (e) { const b = e.target.closest('[data-rm]'); if (b) { lines.splice(+b.dataset.rm, 1); draw(); } });
  draw();
  return lines;
}
async function transfersView(el) {
  el.innerHTML = '<div class="biz-toolbar"><span class="grow muted">نقل المواد والمنتجات بين الفروع — يُخصم من فرع الإرسال ويُضاف عند الاستلام.</span><button class="btn btn-primary btn-sm" id="trNew"><i class="fas fa-plus"></i> تحويل جديد</button></div><div id="trList"></div>';
  const brName = function (id) { const b = (B.acc.branches || []).find(function (x) { return x.id === id; }); return b ? b.name : '—'; };
  const load = async function () {
    const rows = await entList('transfers', { branchId: 'all' });
    el.querySelector('#trList').innerHTML = bTable([{ label: '#', r: function (t) { return t.number; } }, { label: 'التاريخ', r: function (t) { return dt(t.created_at); } }, { label: 'من', r: function (t) { return h(brName(t.from_branch)); } }, { label: 'إلى', r: function (t) { return h(brName(t.to_branch)); } },
      { label: 'الأصناف', r: function (t) { return (t.items || []).map(function (i) { return h(i.name) + ' × ' + nf(i.qty, 2); }).join('<br>'); } },
      { label: 'الحالة', r: function (t) { return stBadge({ sent: ['قيد الإرسال', 'badge-warning'], received: ['تم الاستلام', 'badge-success'], cancelled: ['ملغى', 'badge-dog'] }, t.status); } },
      { label: '', r: function (t) { return t.status === 'sent' ? '<button class="btn btn-success btn-sm" data-rc="' + t.id + '">استلام</button> <button class="btn btn-cancel btn-sm" data-cn="' + t.id + '">إلغاء</button>' : ''; } }], rows, { empty: 'لا توجد تحويلات' });
  };
  el.querySelector('#trList').onclick = async function (e) {
    const rc = e.target.closest('[data-rc]'), cn = e.target.closest('[data-cn]');
    if (rc) { await bzOk('transferReceive', { id: rc.dataset.rc }); showToast('تم الاستلام وإضافة الكميات'); load(); }
    if (cn && await bConfirm('إلغاء التحويل وإرجاع الكميات لفرع الإرسال؟')) { await bzOk('transferReceive', { id: cn.dataset.cn, cancel: true }); showToast('تم الإلغاء'); load(); }
  };
  el.querySelector('#trNew').onclick = async function () {
    const brs = (B.acc.branches || []).filter(function (b) { return b.id !== B.branch && b.active !== false; });
    if (!brs.length) { showToast('أضف فرعاً آخر أولاً من صفحة الفروع', true); return; }
    const st = await stockItems();
    let lines;
    bModal({ title: 'تحويل مخزون من ' + brName(B.branch), icon: 'truck', xwide: true,
      body: bForm([{ k: 'toBranch', label: 'إلى فرع', type: 'select', options: brs.map(function (b) { return [b.id, b.name]; }) }, { k: 'notes', label: 'ملاحظات' }]) + '<div id="lnBox" style="margin-top:12px"></div>',
      foot: '<button class="btn btn-cancel" data-x>إلغاء</button><button class="btn btn-primary" data-act="ok"><i class="fas fa-paper-plane"></i> إرسال التحويل</button>',
      onOpen: function (m) { lines = linesEditor(m, st.items, false); },
      actions: { ok: async function (m) { await bzOk('transferCreate', { fromBranch: B.branch, toBranch: m.$('[data-k=toBranch]').value, notes: m.$('[data-k=notes]').value, items: lines }); m.close(); showToast('تم إرسال التحويل'); load(); } } });
  };
  load();
}
async function productionView(el) {
  el.innerHTML = '<div class="biz-toolbar"><span class="grow muted">أوامر الإنتاج تصرف مكونات الوصفة من المواد الأولية وتضيف المنتج النهائي للمخزون بتكلفته الفعلية.</span><button class="btn btn-primary btn-sm" id="pdNew"><i class="fas fa-plus"></i> أمر إنتاج</button></div><div id="pdList"></div>';
  const load = async function () {
    const rows = await entList('production');
    el.querySelector('#pdList').innerHTML = bTable([{ label: '#', r: function (x) { return x.number; } }, { label: 'التاريخ', r: function (x) { return dt(x.created_at); } }, { label: 'المنتج', r: function (x) { return h(x.product_name); } }, { label: 'الكمية', num: true, r: function (x) { return nf(x.qty, 2) + ' <small class="muted">' + h(x.unit || 'قطعة') + '</small>'; } },
      { label: 'المواد المصروفة', r: function (x) { return (x.materials || []).map(function (m) { return h(m.name) + ' ' + nf(m.qty, 3); }).join('، '); } }, { label: 'التكلفة', num: true, r: function (x) { return money(x.total_cost); } }, { label: 'بواسطة', r: function (x) { return h(x.created_by); } }], rows, { empty: 'لا توجد أوامر إنتاج' });
  };
  el.querySelector('#pdNew').onclick = async function () {
    const prods = (await entList('products')).filter(function (p) { return p.recipe_name; });
    if (!prods.length) { showToast('اربط منتجاً بوصفة أولاً (من صفحة المنتجات)', true); return; }
    bPrompt('أمر إنتاج جديد', [{ k: 'productId', label: 'المنتج', type: 'select', options: prods.map(function (p) { return [p.id, p.name + ' ← ' + p.recipe_name]; }), full: true }, { k: 'qty', label: 'الكمية المنتجة', type: 'number', req: true }, { k: 'notes', label: 'ملاحظات' }], {}, async function (d) {
      const r = await bzOk('productionCreate', d); showToast('تم أمر الإنتاج #' + r.production.number + ' بتكلفة ' + money(r.production.total_cost)); load();
    }, { icon: 'industry', saveText: 'تنفيذ' });
  };
  load();
}

// ---------- المشتريات والموردون ----------
bizPage('purchases', { group: 'stock', title: 'المشتريات والموردون', icon: 'truck-loading', feature: 'purchasing', perms: ['purchasing'], plan: 'premium',
  pitch: 'فواتير الشراء تضيف الكميات للمخزون وتحدّث تكلفة المواد والأطباق تلقائياً، مع حسابات الموردين والمدفوعات وكشف الحساب.',
  render: async function (body) {
    body.innerHTML = subTabs('puSub', [['inv', 'فواتير الشراء', 'file-invoice-dollar'], ['sup', 'الموردون', 'people-carry']], 'inv') + '<div id="puBody"></div>';
    const el = body.querySelector('#puBody');
    bindSubTabs(body, 'puSub', function (k) { k === 'inv' ? purchasesView(el) : suppliersView(el); });
    purchasesView(el);
  } });
function purchasesView(el) {
  el.innerHTML = dateRangeBar('puRange', daysAgo(29), isoLocal(), '<button class="btn btn-success btn-sm" id="puNew" type="button"><i class="fas fa-plus"></i> فاتورة شراء</button>') + '<div id="puList"></div>';
  const get = bindRange(el, 'puRange', load);
  el.querySelector('#puNew').onclick = function () { purchaseNew(function () { load(); }); };
  async function load(f) {
    const rows = await entList('purchases', f || get());
    const live = rows.filter(function (x) { return x.status !== 'cancelled'; });
    el.querySelector('#puList').innerHTML = kpis([['إجمالي المشتريات', money(live.reduce(function (s, x) { return s + +x.total; }, 0))], ['المدفوع', money(live.reduce(function (s, x) { return s + +x.paid; }, 0))], ['المتبقي', money(live.reduce(function (s, x) { return s + (x.total - x.paid); }, 0)), '', '#fbbf24']]) +
      bTable([{ label: '#', r: function (x) { return x.number; } }, { label: 'التاريخ', r: function (x) { return dOnly(x.purchased_at); } }, { label: 'المورّد', r: function (x) { return h(x.supplier_name || '—'); } }, { label: 'رقم فاتورة المورد', r: function (x) { return h(x.ref_no || '—'); } },
        { label: 'الأصناف', r: function (x) { return (x.items || []).length; } }, { label: 'الإجمالي', num: true, r: function (x) { return money(x.total); } }, { label: 'المدفوع', num: true, r: function (x) { return money(x.paid); } },
        { label: 'الحالة', r: function (x) { return x.status === 'cancelled' ? '<span class="badge badge-dog">ملغاة</span>' : '<span class="badge badge-success">مرحّلة</span>'; } },
        { label: '', r: function (x) { return '<button class="ico-btn" data-v="' + x.id + '"><i class="fas fa-eye"></i></button>' + (x.status !== 'cancelled' ? '<button class="ico-btn danger" data-c="' + x.id + '"><i class="fas fa-ban"></i></button>' : ''); } }], rows, { empty: 'لا توجد فواتير شراء' });
    el.querySelector('#puList').onclick = async function (e) {
      const v = e.target.closest('[data-v]'), c = e.target.closest('[data-c]');
      if (v) { const x = rows.find(function (y) { return y.id === v.dataset.v; }); bModal({ title: 'فاتورة شراء #' + x.number, icon: 'file-invoice-dollar', wide: true, sub: (x.supplier_name || '') + ' · ' + dOnly(x.purchased_at), body: bTable([{ label: 'الصنف', r: function (l) { return h(l.name); } }, { label: 'الكمية', num: true, r: function (l) { return nf(l.qty, 3) + ' <small class="muted">' + h(l.unit || '') + '</small>'; } }, { label: 'سعر الوحدة', num: true, r: function (l) { return nf(l.unitCost, 3); } }, { label: 'الإجمالي', num: true, r: function (l) { return money(l.total); } }], x.items) + '<div class="pos-tot"><div><span>المجموع</span><span>' + money(x.subtotal) + '</span></div><div><span>الضريبة</span><span>' + money(x.tax) + '</span></div><div class="big"><span>الإجمالي</span><span>' + money(x.total) + '</span></div><div><span>المدفوع</span><span>' + money(x.paid) + '</span></div></div>' + (x.notes ? '<p class="muted">' + h(x.notes) + '</p>' : '') }); }
      if (c && await bConfirm('إلغاء فاتورة الشراء؟ سيتم عكس الكميات من المخزون ورصيد المورد.')) { await bzOk('purchaseCancel', { id: c.dataset.c }); showToast('تم الإلغاء'); load(); }
    };
  }
  load();
}
// ---------- حاسبة تحويل وحدات القياس (v4.5) ----------
const UC_UNITS = {
  mass: { name: 'الوزن', u: [['kg', 'كيلوغرام', 1000], ['g', 'غرام', 1], ['mg', 'مليغرام', 0.001], ['t', 'طن', 1e6], ['lb', 'رطل (باوند)', 453.59237], ['oz', 'أونصة', 28.349523]] },
  vol: { name: 'الحجم', u: [['l', 'لتر', 1000], ['ml', 'مليلتر', 1], ['gal', 'غالون', 3785.41], ['cup', 'كوب', 240], ['tbsp', 'ملعقة كبيرة', 15], ['tsp', 'ملعقة صغيرة', 5], ['floz', 'أونصة سائلة', 29.5735]] },
  cnt: { name: 'العدد', u: [['pcs', 'حبة / قطعة', 1], ['dz', 'دزينة (12)', 12], ['hdz', 'نصف دزينة (6)', 6], ['tray', 'طبق بيض (30)', 30]] }
};
function ucGuess(unit) {
  const u = String(unit || '').trim().toLowerCase();
  const map = [[/^(كغ|كجم|كيلو|كيلوغرام|كيلوجرام|kg|kilo)/, 'mass', 'kg'], [/^(غ|غم|جم|جرام|غرام|g|gr|gram)$/, 'mass', 'g'], [/^(ملغ|mg)/, 'mass', 'mg'], [/^(طن|ton|t)$/, 'mass', 't'], [/^(رطل|باوند|lb)/, 'mass', 'lb'], [/^(أونصة|اونصة|oz)$/, 'mass', 'oz'],
    [/^(لتر|ل|l|lt|liter|litre)$/, 'vol', 'l'], [/^(مل|ملل|مليلتر|ml)$/, 'vol', 'ml'], [/^(غالون|gal)/, 'vol', 'gal'], [/^(كوب|cup)/, 'vol', 'cup'],
    [/^(حبة|حبه|قطعة|قطعه|عدد|pcs|pc|piece|unit)/, 'cnt', 'pcs'], [/^(دزينة|درزن|dozen)/, 'cnt', 'dz']];
  for (const x of map) if (x[0].test(u)) return { cat: x[1], unit: x[2] };
  return null;
}
function unitConverter(box, lnBox, getLines) {
  let cat = 'mass';
  function opts(sel) { return UC_UNITS[cat].u.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === sel ? ' selected' : '') + '>' + x[1] + '</option>'; }).join(''); }
  function draw(from, to) {
    const us = UC_UNITS[cat].u;
    box.innerHTML = '<div class="uc"><div class="uc-h"><i class="fas fa-calculator"></i> حاسبة تحويل الوحدات</div>' +
      '<div class="uc-cats">' + Object.keys(UC_UNITS).map(function (k) { return '<button type="button" data-uc="' + k + '" class="' + (k === cat ? 'on' : '') + '">' + UC_UNITS[k].name + '</button>'; }).join('') + '</div>' +
      '<div class="uc-row"><input type="number" step="any" id="ucV" value="1" dir="ltr"><select id="ucF">' + opts(from || us[0][0]) + '</select></div>' +
      '<button type="button" class="uc-sw" id="ucSw" title="عكس"><i class="fas fa-arrow-right-arrow-left"></i></button>' +
      '<div class="uc-row"><output id="ucR" dir="ltr">0</output><select id="ucT">' + opts(to || us[1][0]) + '</select></div>' +
      '<div class="uc-ins"><select id="ucL"></select><button type="button" class="btn btn-primary btn-sm" id="ucIns"><i class="fas fa-arrow-down"></i> إدراج في الكمية</button></div>' +
      '<div class="muted uc-tip">مثال: اشتريت 2.5 كغ والمادة بوحدة الغرام ← تصبح 2500</div></div>';
    calc(); fillLines();
  }
  function f(id) { return box.querySelector(id); }
  function factor(k) { const x = UC_UNITS[cat].u.find(function (y) { return y[0] === k; }); return x ? x[2] : 1; }
  function calc() { const v = parseFloat(f('#ucV').value) || 0, r = v * factor(f('#ucF').value) / factor(f('#ucT').value); f('#ucR').value = String(Math.round(r * 10000) / 10000); return r; }
  function fillLines() {
    const ls = getLines(), sel = f('#ucL'), prev = sel.value;
    sel.innerHTML = ls.length ? ls.map(function (l, i) { return '<option value="' + i + '">' + h(l.name) + (l.unit ? ' (' + h(l.unit) + ')' : '') + '</option>'; }).join('') : '<option value="">— أضف صنفاً أولاً —</option>';
    if (prev !== '' && +prev < ls.length) sel.value = prev; else if (ls.length) sel.value = String(ls.length - 1);
  }
  function guessTo() {
    const ls = getLines(), l = ls[+f('#ucL').value]; if (!l) return;
    const g = ucGuess(l.unit); if (!g) return;
    if (g.cat !== cat) { cat = g.cat; const fr = UC_UNITS[cat].u.find(function (x) { return x[0] !== g.unit; })[0]; draw(fr, g.unit); f('#ucL').value = String(ls.indexOf(l)); return; }
    f('#ucT').value = g.unit; calc();
  }
  box.addEventListener('input', function (e) { if (e.target.id === 'ucV') calc(); });
  box.addEventListener('change', function (e) { if (e.target.id === 'ucF' || e.target.id === 'ucT') calc(); if (e.target.id === 'ucL') guessTo(); });
  box.addEventListener('click', function (e) {
    const c = e.target.closest('[data-uc]'); if (c) { cat = c.dataset.uc; draw(); return; }
    if (e.target.closest('#ucSw')) { const a = f('#ucF').value, b = f('#ucT').value; f('#ucF').value = b; f('#ucT').value = a; calc(); return; }
    if (e.target.closest('#ucIns')) {
      const i = f('#ucL').value; if (i === '') { showToast('أضف صنفاً للفاتورة أولاً', true); return; }
      const inp = lnBox.querySelector('input[data-q="' + i + '"]'); if (!inp) return;
      inp.value = String(Math.round(calc() * 10000) / 10000); inp.dispatchEvent(new Event('change', { bubbles: true }));
      showToast('تم إدراج الكمية');
    }
  });
  new MutationObserver(function () { if (box.isConnected) { const before = f('#ucL').options.length; fillLines(); if (f('#ucL').options.length !== before) guessTo(); } }).observe(lnBox, { childList: true });
  draw();
}
async function purchaseNew(after) {
  const [st, sups] = await Promise.all([stockItems(), entList('suppliers')]);
  let lines;
  bModal({ title: 'فاتورة شراء جديدة', icon: 'file-invoice-dollar', xwide: true,
    body: bForm([{ k: 'supplierId', label: 'المورّد', type: 'select', options: [['', '— بدون مورد / نقدي —']].concat(sups.map(function (s) { return [s.id, s.name]; })) }, { k: 'refNo', label: 'رقم فاتورة المورد', ltr: true },
      { k: 'date', label: 'التاريخ', type: 'date', def: isoLocal() }, { k: 'tax', label: 'الضريبة (مبلغ)', type: 'number', def: 0 }, { k: 'paid', label: 'المدفوع الآن', type: 'number', def: 0, hint: 'الباقي يُسجّل ديناً للمورد' },
      { k: 'updateCosts', label: 'تحديث تكلفة المواد/المنتجات بأسعار هذه الفاتورة', type: 'checkbox', def: true }, { k: 'notes', label: 'ملاحظات', full: true }]) + '<div class="pi-wrap"><div id="lnBox"></div><div id="ucBox"></div></div>',
    foot: '<button class="btn btn-cancel" data-x>إلغاء</button><button class="btn btn-primary" data-act="ok"><i class="fas fa-check"></i> ترحيل الفاتورة</button>',
    onOpen: function (m) { lines = linesEditor(m, st.items, true); unitConverter(m.$('#ucBox'), m.$('#lnBox'), function () { return lines; }); },
    actions: { ok: async function (m, btn) {
      const d = readForm(m.el, [{ k: 'supplierId' }, { k: 'refNo' }, { k: 'date' }, { k: 'tax', type: 'number' }, { k: 'paid', type: 'number' }, { k: 'updateCosts', type: 'checkbox' }, { k: 'notes' }]);
      d.items = lines; btn.disabled = true;
      try { const r = await bzOk('purchasePost', { purchase: d }); m.close(); showToast('تم ترحيل فاتورة الشراء #' + r.purchase.number); after(); } catch (e) { } finally { btn.disabled = false; }
    } } });
}
async function suppliersView(el) {
  el.innerHTML = '<div class="biz-toolbar"><input class="biz-search grow" id="spQ" placeholder="بحث"><button class="btn btn-primary btn-sm" id="spNew"><i class="fas fa-plus"></i> مورد جديد</button></div><div id="spList"></div>';
  const F = [{ k: 'name', label: 'اسم المورد', req: true }, { k: 'phone', label: 'الجوال', ltr: true }, { k: 'email', label: 'البريد', ltr: true }, { k: 'tax_no', label: 'الرقم الضريبي', ltr: true }, { k: 'address', label: 'العنوان', full: true }, { k: 'notes', label: 'ملاحظات', full: true }];
  let rows = [];
  const load = async function () {
    rows = await entList('suppliers', { q: el.querySelector('#spQ').value.trim() });
    el.querySelector('#spList').innerHTML = kpis([['المستحق للموردين', money(rows.reduce(function (s, x) { return s + +x.balance; }, 0)), '', '#fbbf24']]) +
      bTable([{ label: 'المورد', r: function (s) { return '<b>' + h(s.name) + '</b>'; } }, { label: 'الجوال', r: function (s) { return '<span dir="ltr">' + h(s.phone) + '</span>'; } }, { label: 'الرصيد المستحق', num: true, r: function (s) { return money(s.balance); } },
        { label: '', r: function (s) { return '<button class="btn btn-outline btn-sm" data-pay="' + s.id + '">سداد</button> <button class="btn btn-outline btn-sm" data-st="' + s.id + '">كشف حساب</button> <button class="ico-btn" data-e="' + s.id + '"><i class="fas fa-pen"></i></button><button class="ico-btn danger" data-d="' + s.id + '"><i class="fas fa-trash"></i></button>'; } }], rows, { empty: 'لا يوجد موردون' });
  };
  let tm; el.querySelector('#spQ').oninput = function () { clearTimeout(tm); tm = setTimeout(load, 300); };
  el.querySelector('#spNew').onclick = function () { bPrompt('مورد جديد', F, {}, async function (d) { await entSave('suppliers', d); load(); }, { icon: 'people-carry' }); };
  el.querySelector('#spList').onclick = async function (e) {
    const g = function (a) { const b = e.target.closest('[data-' + a + ']'); return b ? rows.find(function (x) { return x.id === b.dataset[a]; }) : null; };
    let s;
    for (const s of [g('e')].filter(Boolean)) bPrompt('تعديل مورد', F, s, async function (d) { d.id = s.id; await entSave('suppliers', d); load(); });
    for (const s of [g('d')].filter(Boolean)) if (await entDel('suppliers', s.id, 'المورد ' + s.name)) load();
    for (const s of [g('pay')].filter(Boolean)) bPrompt('سداد للمورد ' + s.name, [{ k: 'amount', label: 'المبلغ', type: 'number', req: true, hint: 'المستحق: ' + money(s.balance) }, { k: 'method', label: 'الطريقة', type: 'select', options: [['cash', 'نقداً'], ['transfer', 'تحويل'], ['card', 'بطاقة']] }, { k: 'note', label: 'ملاحظة', full: true }], {}, async function (d) { await bzOk('supplierPay', Object.assign({ supplierId: s.id }, d)); showToast('تم تسجيل السداد'); load(); });
    for (const s of [g('st')].filter(Boolean)) {
      const r = await bzOk('supplierStatement', { supplierId: s.id });
      const ev = r.purchases.filter(function (p) { return p.status !== 'cancelled'; }).map(function (p) { return { d: p.purchased_at || p.created_at, t: 'فاتورة شراء #' + p.number, dr: +p.total, cr: +p.paid }; })
        .concat(r.payments.map(function (p) { return { d: p.created_at, t: 'سداد ' + (PAY_NAMES[p.method] || '') + (p.note ? ' — ' + p.note : ''), dr: 0, cr: +p.amount }; })).sort(function (a, b) { return new Date(a.d) - new Date(b.d); });
      let bal = 0; ev.forEach(function (x) { bal += x.dr - x.cr; x.bal = bal; });
      bModal({ title: 'كشف حساب: ' + s.name, icon: 'file-alt', xwide: true, body: bTable([{ label: 'التاريخ', r: function (x) { return dOnly(x.d); } }, { label: 'البيان', r: function (x) { return h(x.t); } }, { label: 'مدين (علينا)', num: true, r: function (x) { return x.dr ? money(x.dr) : ''; } }, { label: 'دائن (مدفوع)', num: true, r: function (x) { return x.cr ? money(x.cr) : ''; } }, { label: 'الرصيد', num: true, r: function (x) { return money(x.bal); } }], ev) });
    }
  };
  load();
}
