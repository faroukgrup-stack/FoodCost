// ============================================================
// Mataami Pro v5.4.0 — أقسام المطبخ (KDS) · رفع الأسعار بنسبة · السعرات ومسببات الحساسية
// · الاستيراد من Excel · شاشة الطلب الذاتي (Kiosk) والدفع الإلكتروني · شاشة العميل
// ============================================================
(function () {
  'use strict';
  if (typeof BIZ_GROUPS === 'undefined' || typeof bizPage !== 'function') return;
  const T = function (s) { return window.fcI18n ? fcI18n.t(s) : s; };
  // مجموعة جديدة في القائمة الجانبية قبل «الإدارة والإعدادات»
  if (!BIZ_GROUPS.some(function (g) { return g[0] === 'menu54'; })) {
    const i = BIZ_GROUPS.findIndex(function (g) { return g[0] === 'admin'; });
    BIZ_GROUPS.splice(i < 0 ? BIZ_GROUPS.length - 1 : i, 0, ['menu54', 'المينيو: الأسعار والسعرات والاستيراد'], ['screens54', 'شاشات المطبخ والطلب الذاتي']);
  }
  const N = function () { return window.FC_NUTRI; };
  const alChips = function (list) {
    if (!list || !list.length) return '<span class="muted">—</span>';
    return list.map(function (k) { return '<span class="badge badge-warning" style="margin:1px"><i class="fas fa-' + N().alIcon(k) + '"></i> ' + h(T(N().AL_SHORT[k] || k)) + '</span>'; }).join(' ');
  };

  // ============================================================
  // 1) السعرات الحرارية ومسببات الحساسية
  // ============================================================
  bizPage('nutrition', { group: 'menu54', title: 'السعرات ومسببات الحساسية', icon: 'heart-pulse', perms: ['costing', 'digital_menu'],
    sub: 'حساب تلقائي للسعرات والبروتين والكربوهيدرات والدهون من مكونات كل طبق وفق قيم مرجعية عالمية (USDA) ومعاملات Atwater، مع تحديد مسببات الحساسية الـ 14 — يمكنك تعديل أي نتيجة يدوياً.',
    render: async function (body) {
      let d = await N().loadData(true);
      const saveDoc = async function () { await bzOk('mgmtSave', { kind: 'nutri', data: { data: d.doc } }); };
      d.doc.mats = d.doc.mats || {}; d.doc.dishes = d.doc.dishes || {};
      const calcAll = function () { return d.recipes.map(function (rec) { return { rec: rec, res: N().dishResult(d, rec) }; }); };
      const draw = function () {
        const all = calcAll();
        const unk = {}; all.forEach(function (x) { x.res.unknown.forEach(function (u) { unk[u.id || u.name] = u; }); });
        const unkList = Object.values(unk);
        const menuBy = {}; d.menu.forEach(function (m) { menuBy[m.recipeName || m.name] = m; });
        body.innerHTML = kpis([['عدد الأطباق', nf(all.length, 0)], ['أطباق محسوبة بالكامل', nf(all.filter(function (x) { return !x.res.unknown.length && x.rec.ingredients.length; }).length, 0), '', '#10b981'],
          ['مواد تحتاج مراجعة', nf(unkList.length, 0), '', unkList.length ? '#f59e0b' : ''], ['مواد في القاعدة المرجعية', nf(Object.keys(N().DB).length, 0)]]) +
          '<div class="biz-card"><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">' +
          '<button class="btn btn-primary" id="nuApply"><i class="fas fa-check-double"></i> ' + T('تطبيق على المينيو والكاشير') + '</button>' +
          '<label class="biz-check" style="margin:0"><input type="checkbox" id="nuOnlyEmpty"> <span>' + T('الأصناف التي ليس لها سعرات فقط') + '</span></label>' +
          '<button class="btn btn-outline" id="nuMats"><i class="fas fa-flask"></i> ' + T('القيم الغذائية للمواد الأولية') + '</button>' +
          '<button class="btn btn-outline" id="nuXl"><i class="fas fa-file-excel"></i> Excel</button></div>' +
          '<p class="muted" style="margin-top:8px;font-size:.82rem;line-height:1.8"><i class="fas fa-circle-info"></i> ' + T('يحتاج البالغ في المتوسط إلى 2000 سعرة حرارية يومياً') + ' — ' +
          T('تُعرض السعرات ومسببات الحساسية في المينيو الإلكتروني وشاشة الطلب الذاتي، وتلزم بها بعض الدول مثل السعودية (هيئة الغذاء والدواء).') + '</p></div>' +
          (unkList.length ? '<div class="biz-card" style="border-color:#f59e0b"><h4><i class="fas fa-triangle-exclamation" style="color:#f59e0b"></i> ' + T('مواد تحتاج مراجعة') + '</h4><div style="display:flex;gap:6px;flex-wrap:wrap">' +
            unkList.map(function (u) { return '<button class="btn btn-outline btn-sm" data-mat="' + h(u.id || '') + '" title="' + h(T(u.why)) + '">' + h(u.name) + ' <small class="muted">· ' + h(T(u.why)) + '</small></button>'; }).join('') + '</div></div>' : '') +
          bTable([{ label: 'الطبق', r: function (x) { return '<b>' + h(x.rec.name) + '</b>' + (x.res.manual ? ' <span class="badge badge-info">' + T('معدّل يدوياً') + '</span>' : ''); } },
            { label: 'الوزن (غ)', num: true, r: function (x) { return nf(x.res.weight, 0); } },
            { label: 'السعرات', num: true, r: function (x) { return '<b>' + nf(x.res.kcal, 0) + '</b>' + (x.res.manual ? '<div class="muted" style="font-size:.72rem">' + T('تلقائي') + ': ' + nf(x.res.autoKcal, 0) + '</div>' : ''); } },
            { label: 'بروتين', num: true, r: function (x) { return nf(x.res.protein, 1); } }, { label: 'كربوهيدرات', num: true, r: function (x) { return nf(x.res.carbs, 1); } }, { label: 'دهون', num: true, r: function (x) { return nf(x.res.fat, 1); } },
            { label: 'مسببات الحساسية', wrap: true, r: function (x) { return alChips(x.res.allergens); } },
            { label: 'في المينيو', num: true, r: function (x) { const m = menuBy[x.rec.name]; return m ? (m.calories != null ? nf(m.calories, 0) : '<span class="muted">' + T('غير محدد') + '</span>') : '—'; } },
            { label: 'ملاحظات', wrap: true, r: function (x) { return x.rec.ingredients.length ? (x.res.unknown.length ? '<span style="color:#f59e0b">' + x.res.unknown.map(function (u) { return h(u.name); }).join('، ') + '</span>' : '<i class="fas fa-check" style="color:#10b981"></i>') : '<span class="muted">' + T('بدون مكونات') + '</span>'; } },
            { label: '', r: function (x, i) { return '<button class="ico-btn" data-dish="' + i + '" title="' + T('تعديل') + '"><i class="fas fa-pen"></i></button>'; } }
          ], all, { empty: 'لا توجد أطباق بعد — أضف وصفات من قسم «حساب التكلفة» أو استوردها من Excel' });
        body.onclick = async function (e) {
          const m = e.target.closest('[data-mat]'); if (m && m.dataset.mat) return matEdit(m.dataset.mat);
          const ds = e.target.closest('[data-dish]'); if (ds) return dishEdit(all[+ds.dataset.dish]);
          if (e.target.closest('#nuMats')) return matsList();
          if (e.target.closest('#nuXl')) return exportRowsExcel(T('السعرات ومسببات الحساسية'), [T('الطبق'), T('الوزن (غ)'), T('السعرات'), T('بروتين'), T('كربوهيدرات'), T('دهون'), T('مسببات الحساسية')],
            all.map(function (x) { return [x.rec.name, x.res.weight, x.res.kcal, x.res.protein, x.res.carbs, x.res.fat, x.res.allergens.map(function (k) { return T(N().alName(k)); }).join('، ')]; }));
          if (e.target.closest('#nuApply')) {
            const items = all.filter(function (x) { return x.rec.ingredients.length || x.res.manual; }).map(function (x) {
              return { recipeName: x.rec.name, calories: x.res.kcal, allergens: x.res.allergens, nutrition: { kcal: x.res.kcal, protein: x.res.protein, carbs: x.res.carbs, fat: x.res.fat, weight: x.res.weight, manual: !!x.res.manual, source: 'auto' } };
            });
            if (!items.length) { showToast('لا توجد أطباق بمكونات لتطبيقها', true); return; }
            if (!(await bConfirm(T('سيتم تحديث السعرات ومسببات الحساسية لـ') + ' ' + items.length + ' ' + T('طبق في المينيو الإلكتروني ومنتجات الكاشير المرتبطة بها. متابعة؟')))) return;
            const r = await bzOk('nutritionApply', { items: items, onlyEmpty: body.querySelector('#nuOnlyEmpty').checked });
            showToast(T('تم التحديث') + ': ' + T('المينيو') + ' ' + r.menu + ' · ' + T('الكاشير') + ' ' + r.products);
            d = await N().loadData(true); d.doc.mats = d.doc.mats || {}; d.doc.dishes = d.doc.dishes || {}; draw();
          }
        };
      };
      const refOptions = function (sel) {
        const keys = Object.keys(N().DB);
        return '<option value="">' + T('— تلقائي حسب الاسم —') + '</option>' + keys.map(function (k) { const x = N().DB[k]; return '<option value="' + k + '"' + (k === sel ? ' selected' : '') + '>' + h(x.names[0]) + ' · ' + h(x.names.find(function (n) { return /[a-z]/i.test(n); }) || '') + ' (' + x.kcal + ' kcal)</option>'; }).join('');
      };
      const matEdit = function (id) {
        const mat = d.mats[id]; if (!mat) return;
        const ov = d.doc.mats[id] || {};
        const auto = N().matchRef(mat.name);
        bModal({ title: T('القيم الغذائية') + ': ' + mat.name, icon: 'flask', wide: true,
          body: '<p class="muted" style="margin-bottom:8px">' + T('الوحدة') + ': <b>' + h(mat.unit || '—') + '</b> · ' + T('المطابقة التلقائية') + ': <b>' + h(auto ? auto.names[0] + ' (' + auto.kcal + ' kcal/100g)' : T('غير موجودة')) + '</b></p>' +
            '<div class="biz-form"><div class="full"><label class="pro-label">' + T('المادة المرجعية') + '</label><select id="nmRef">' + refOptions(ov.ref || '') + '</select></div>' +
            '<div><label class="pro-label">' + T('سعرات لكل 100 غ (يدوي)') + '</label><input type="number" step="any" id="nmK" value="' + h(ov.kcal ?? '') + '" placeholder="' + T('اتركه فارغاً للقيمة المرجعية') + '"></div>' +
            '<div><label class="pro-label">' + T('وزن الوحدة بالغرام') + '</label><input type="number" step="any" id="nmG" value="' + h(ov.gPerUnit ?? '') + '" placeholder="' + T('مثال: الحبة = 55 غ') + '"></div>' +
            '<div><label class="pro-label">' + T('بروتين / 100 غ') + '</label><input type="number" step="any" id="nmP" value="' + h(ov.p ?? '') + '"></div>' +
            '<div><label class="pro-label">' + T('كربوهيدرات / 100 غ') + '</label><input type="number" step="any" id="nmC" value="' + h(ov.c ?? '') + '"></div>' +
            '<div><label class="pro-label">' + T('دهون / 100 غ') + '</label><input type="number" step="any" id="nmF" value="' + h(ov.f ?? '') + '"></div>' +
            '<div class="full"><label class="pro-label">' + T('مسببات الحساسية في هذه المادة') + ' <label style="font-weight:400;font-size:.8rem"><input type="checkbox" id="nmAlAuto"' + (Array.isArray(ov.al) ? '' : ' checked') + '> ' + T('تلقائي من القاعدة المرجعية') + '</label></label><div class="fc-al-grid" id="nmAl">' + N().alGridHtml(Array.isArray(ov.al) ? ov.al : ((ov.ref ? N().DB[ov.ref] : auto) || { al: [] }).al) + '</div></div></div>' +
            '<p class="muted" style="font-size:.78rem;margin-top:8px">' + T('إذا كانت وحدة المادة «حبة/قطعة/علبة» حدّد وزن الوحدة بالغرام. الوحدات المعروفة تلقائياً: كغ، غ، لتر، مل، كوب، ملعقة.') + '</p>',
          foot: '<button class="btn btn-cancel" data-x>' + T('إلغاء') + '</button><button class="btn btn-outline" data-act="reset">' + T('إعادة للتلقائي') + '</button><button class="btn btn-primary" data-act="save"><i class="fas fa-check"></i> ' + T('حفظ') + '</button>',
          actions: {
            reset: async function (m) { delete d.doc.mats[id]; await saveDoc(); m.close(); draw(); },
            save: async function (m) {
              const v = function (s) { const x = m.$(s).value; return x === '' ? undefined : +x; };
              const o = { ref: m.$('#nmRef').value || undefined, kcal: v('#nmK'), p: v('#nmP'), c: v('#nmC'), f: v('#nmF'), gPerUnit: v('#nmG') };
              if (!m.$('#nmAlAuto').checked) o.al = N().readAl(m.$('#nmAl'));
              Object.keys(o).forEach(function (k) { if (o[k] === undefined) delete o[k]; });
              if (Object.keys(o).length) d.doc.mats[id] = o; else delete d.doc.mats[id];
              await saveDoc(); m.close(); draw(); showToast('تم الحفظ');
            }
          } });
      };
      const matsList = function () {
        const list = d.materials.map(function (m) {
          const ov = d.doc.mats[m.id] || {}, ref = ov.ref ? N().DB[ov.ref] : N().matchRef(m.name);
          return { m: m, ov: ov, ref: ref, conv: N().toGrams(1, m.unit, ref, m, ov) };
        });
        bModal({ title: T('القيم الغذائية للمواد الأولية'), icon: 'flask', xwide: true,
          body: bTable([{ label: 'المادة', r: function (x) { return h(x.m.name); } }, { label: 'الوحدة', r: function (x) { return h(x.m.unit || '—'); } },
            { label: 'المرجع', r: function (x) { return x.ref ? h(x.ref.names[0]) : '<span style="color:#f59e0b">' + T('غير معروف') + '</span>'; } },
            { label: 'سعرات/100غ', num: true, r: function (x) { return x.ov.kcal != null ? '<b>' + nf(x.ov.kcal, 0) + '</b>' : (x.ref ? nf(x.ref.kcal, 0) : '—'); } },
            { label: 'غ لكل وحدة', num: true, r: function (x) { return x.conv.ok ? nf(x.conv.g, 1) : '<span style="color:#f59e0b">' + h(T(x.conv.why || '')) + '</span>'; } },
            { label: 'مسببات الحساسية', wrap: true, r: function (x) { return alChips(Array.isArray(x.ov.al) ? x.ov.al : (x.ref ? x.ref.al : [])); } },
            { label: '', r: function (x) { return '<button class="ico-btn" data-act="ed" data-id="' + h(x.m.id) + '"><i class="fas fa-pen"></i></button>'; } }], list, { empty: 'لا توجد مواد أولية' }),
          actions: { ed: function (m, b) { m.close(); matEdit(b.dataset.id); } } });
      };
      const dishEdit = function (x) {
        const ov = d.doc.dishes[x.rec.name] || {};
        bModal({ title: x.rec.name, icon: 'utensils', wide: true,
          body: bTable([{ label: 'المكوّن', r: function (l) { return h(l.name); } }, { label: 'الكمية', num: true, r: function (l) { return nf(l.qty, 3) + ' ' + h(l.unit || ''); } },
            { label: 'غرام', num: true, r: function (l) { return nf(l.grams, 1); } }, { label: 'المرجع', r: function (l) { return h(l.refName || '—'); } }, { label: 'سعرات', num: true, r: function (l) { return l.ok ? nf(l.kcal, 0) : '<span style="color:#f59e0b">?</span>'; } }], x.res.lines) +
            '<div class="biz-form" style="margin-top:10px"><div><label class="pro-label">' + T('السعرات (تلقائي)') + '</label><input readonly value="' + (x.res.autoKcal ?? x.res.kcal) + '"></div>' +
            '<div><label class="pro-label">' + T('السعرات المعتمدة (تعديل يدوي)') + '</label><input type="number" id="ndK" value="' + h(ov.kcal ?? '') + '" placeholder="' + T('اتركه فارغاً للحساب التلقائي') + '"></div>' +
            '<div class="full"><label class="pro-label">' + T('مسببات الحساسية') + ' <label style="font-weight:400;font-size:.8rem"><input type="checkbox" id="ndAlAuto"' + (Array.isArray(ov.al) ? '' : ' checked') + '> ' + T('تلقائي من المكونات') + '</label></label><div class="fc-al-grid" id="ndAl">' + N().alGridHtml(x.res.allergens) + '</div></div></div>',
          foot: '<button class="btn btn-cancel" data-x>' + T('إلغاء') + '</button><button class="btn btn-primary" data-act="save"><i class="fas fa-check"></i> ' + T('حفظ') + '</button>',
          actions: { save: async function (m) {
            const o = {}; const k = m.$('#ndK').value; if (k !== '') o.kcal = Math.max(0, Math.round(+k));
            if (!m.$('#ndAlAuto').checked) o.al = N().readAl(m.$('#ndAl'));
            if (Object.keys(o).length) d.doc.dishes[x.rec.name] = o; else delete d.doc.dishes[x.rec.name];
            await saveDoc(); m.close(); draw(); showToast('تم الحفظ — اضغط «تطبيق على المينيو والكاشير» لنشر القيم');
          } } });
      };
      draw();
    } });

  // ============================================================
  // 2) رفع/خفض جميع الأسعار بنسبة مئوية
  // ============================================================
  bizPage('pricetools', { group: 'menu54', title: 'تعديل الأسعار بنسبة', icon: 'percent', perms: ['costing', 'settings'],
    sub: 'ارفع أو اخفض أسعار جميع الأصناف بنسبة واحدة بضغطة زر، مع تقريب تلقائي للكسور العشرية — معاينة قبل التنفيذ وسجل كامل للتعديلات.',
    render: async function (body) {
      const cats = new Set();
      try { (await entList('products')).forEach(function (p) { if (p.category) cats.add(p.category); }); } catch (e) { }
      try { const r = await bz('getDigitalMenu', { restaurantEmail: currentUserEmail }, { silentPlan: true }); (r.categories || []).forEach(function (c) { if (c && c !== 'الكل') cats.add(c); }); } catch (e) { }
      const F = [{ k: 'percent', label: 'النسبة المئوية (%)', type: 'number', req: true, ph: '10 = رفع 10% · -5 = خفض 5%', hint: 'رقم موجب للرفع وسالب للخفض' },
        { k: 'step', label: 'التقريب إلى', type: 'select', def: '0.5', options: [['0', 'بدون تقريب (خانتان عشريتان)'], ['0.05', '0.05'], ['0.1', '0.10'], ['0.25', '0.25'], ['0.5', '0.50'], ['1', 'أقرب رقم صحيح (1)'], ['5', '5'], ['10', '10']] },
        { k: 'mode', label: 'طريقة التقريب', type: 'select', options: [['nearest', 'لأقرب قيمة'], ['up', 'للأعلى دائماً'], ['down', 'للأسفل دائماً']] },
        { k: 'category', label: 'التصنيف', type: 'select', options: [['', 'كل التصنيفات']].concat(Array.from(cats).map(function (c) { return [c, c]; })) },
        { type: 'section', label: 'الأسعار المشمولة' },
        { k: 'products', label: 'أسعار منتجات الكاشير', type: 'checkbox', def: true }, { k: 'variants', label: 'أسعار الأحجام', type: 'checkbox', def: true },
        { k: 'extras', label: 'أسعار الإضافات', type: 'checkbox', def: false }, { k: 'menu', label: 'أسعار المينيو الإلكتروني', type: 'checkbox', def: true },
        { k: 'recipes', label: 'سعر البيع في حساب التكلفة (الأطباق)', type: 'checkbox', def: true, hint: 'لا يُطبّق عند اختيار تصنيف محدد' }];
      body.innerHTML = '<div class="biz-grid-2"><div class="biz-card"><h4><i class="fas fa-sliders"></i> ' + T('إعدادات التعديل') + '</h4>' + bForm(F, {}) +
        '<div style="display:flex;gap:8px;margin-top:12px"><button class="btn btn-outline" id="ptPrev"><i class="fas fa-eye"></i> ' + T('معاينة') + '</button><button class="btn btn-primary" id="ptApply" disabled><i class="fas fa-bolt"></i> ' + T('تطبيق على جميع الأسعار') + '</button></div></div>' +
        '<div class="biz-card"><h4><i class="fas fa-clock-rotate-left"></i> ' + T('سجل تعديلات الأسعار') + '</h4><div id="ptLog"><div class="empty-state"><i class="fas fa-spinner fa-pulse"></i></div></div></div></div><div id="ptRes"></div>';
      const params = function () {
        const v = readForm(body, F);
        if (v.percent === '' || isNaN(v.percent) || v.percent === 0) { showToast('أدخل نسبة صحيحة', true); return null; }
        return { percent: v.percent, step: v.step, mode: v.mode, category: v.category, targets: { products: v.products, variants: v.variants, extras: v.extras, menu: v.menu, recipes: v.recipes } };
      };
      const tbl = function (r) {
        const typ = { product: 'الكاشير', menu: 'المينيو', recipe: 'الأطباق' };
        return kpis([['منتجات الكاشير', nf(r.products, 0)], ['أصناف المينيو', nf(r.menu, 0)], ['الأطباق', nf(r.recipes, 0)], ['النسبة', (r.percent > 0 ? '+' : '') + r.percent + '%', '', r.percent > 0 ? '#10b981' : '#ef4444']]) +
          (r.recipesSkipped ? '<p class="muted">' + T('لم تُعدّل أسعار الأطباق لأنك اخترت تصنيفاً محدداً.') + '</p>' : '') +
          bTable([{ label: 'النوع', r: function (x) { return h(T(typ[x.type] || x.type)); } }, { label: 'الصنف', r: function (x) { return h(x.name); } }, { label: 'التصنيف', r: function (x) { return h(x.category || '—'); } },
            { label: 'السعر الحالي', num: true, r: function (x) { return nf(x.old); } }, { label: 'السعر الجديد', num: true, r: function (x) { return '<b>' + nf(x.new) + '</b>'; } },
            { label: 'الأحجام', wrap: true, r: function (x) { return h(x.variants || ''); } }], r.rows, { empty: 'لا توجد أسعار ستتغير' });
      };
      let last = null;
      const loadLog = async function () {
        const r = await bz('v54Logs', { kind: 'price_log' });
        body.querySelector('#ptLog').innerHTML = bTable([{ label: 'التاريخ', r: function (x) { return dt(x.created_at || x.createdAt); } }, { label: 'النسبة', r: function (x) { return '<b>' + h(x.title) + '</b>'; } },
          { label: 'التفاصيل', r: function (x) { const d = x.data || {}; return T('الكاشير') + ' ' + (d.products || 0) + ' · ' + T('المينيو') + ' ' + (d.menu || 0) + ' · ' + T('الأطباق') + ' ' + (d.recipes || 0) + (d.category ? ' · ' + h(d.category) : '') + ' · ' + T('تقريب') + ' ' + d.step; } },
          { label: 'بواسطة', r: function (x) { return h(x.created_by || x.createdBy || ''); } }], (r.rows || []).slice(0, 30), { empty: 'لا توجد تعديلات سابقة' });
      };
      body.querySelector('#ptPrev').onclick = async function () {
        const p = params(); if (!p) return;
        const r = await bzOk('bulkPriceUpdate', Object.assign({ apply: false }, p));
        last = p; body.querySelector('#ptRes').innerHTML = '<div class="biz-card"><h4>' + T('معاينة التعديل (لم يُحفظ بعد)') + '</h4>' + tbl(r) + '</div>';
        body.querySelector('#ptApply').disabled = !r.rows.length;
      };
      body.querySelector('#ptApply').onclick = async function () {
        const p = params(); if (!p) return;
        if (JSON.stringify(p) !== JSON.stringify(last)) { showToast('غيّرت الإعدادات — اضغط «معاينة» أولاً', true); return; }
        if (!(await bConfirm(T('سيتم تعديل جميع الأسعار المحددة بنسبة') + ' ' + p.percent + '% ' + T('مع التقريب. يُنصح بأخذ نسخة احتياطية أولاً. متابعة؟')))) return;
        const r = await bzOk('bulkPriceUpdate', Object.assign({ apply: true }, p));
        showToast(T('تم تعديل الأسعار') + ': ' + (r.products + r.menu + r.recipes));
        body.querySelector('#ptRes').innerHTML = '<div class="biz-card"><h4><i class="fas fa-check-circle" style="color:#10b981"></i> ' + T('تم التطبيق') + '</h4>' + tbl(r) + '</div>';
        body.querySelector('#ptApply').disabled = true; last = null; loadLog();
        if (typeof loadAllData === 'function') try { loadAllData(); } catch (e) { }
      };
      loadLog();
    } });

  // ============================================================
  // 3) استيراد الأطباق والمواد من ملف Excel
  // ============================================================
  const XL = {
    mats: { sheet: ['المواد الأولية', 'Materials', 'Hammaddeler'], cols: [['name', 'اسم المادة', 'Material name', 'Malzeme adı', true], ['unit', 'الوحدة', 'Unit', 'Birim'], ['purchasePrice', 'سعر الشراء', 'Purchase price', 'Alış fiyatı'], ['purchaseQty', 'كمية الشراء', 'Purchase qty', 'Alış miktarı'], ['wastePercent', 'نسبة الهدر %', 'Waste %', 'Fire %'], ['portionWeight', 'وزن الحبة (غ)', 'Piece weight (g)', 'Adet ağırlığı (g)']] },
    dishes: { sheet: ['الأطباق', 'Dishes', 'Yemekler'], cols: [['name', 'اسم الطبق', 'Dish name', 'Yemek adı', true], ['category', 'التصنيف', 'Category', 'Kategori'], ['price', 'سعر البيع', 'Selling price', 'Satış fiyatı'], ['laborPercent', 'نسبة العمالة %', 'Labor %', 'İşçilik %'], ['description', 'الوصف', 'Description', 'Açıklama'], ['calories', 'السعرات', 'Calories', 'Kalori'], ['allergens', 'مسببات الحساسية', 'Allergens', 'Alerjenler'], ['sku', 'SKU', 'SKU', 'SKU'], ['barcode', 'الباركود', 'Barcode', 'Barkod'], ['imageUrl', 'رابط الصورة', 'Image URL', 'Görsel URL']] },
    ings: { sheet: ['مكونات الأطباق', 'Ingredients', 'İçerikler'], cols: [['dish', 'اسم الطبق', 'Dish name', 'Yemek adı', true], ['material', 'اسم المادة', 'Material name', 'Malzeme adı', true], ['quantity', 'الكمية', 'Quantity', 'Miktar', true]] }
  };
  async function xlTemplate() {
    if (typeof ExcelJS === 'undefined') { showToast('مكتبة Excel غير محملة', true); return; }
    const wb = new ExcelJS.Workbook(); const rtl = (window.fcI18n ? fcI18n.lang() : 'ar') === 'ar';
    const hdr = function (ws) { const r = ws.getRow(1); r.font = { bold: true, color: { argb: 'FFFFFFFF' } }; r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB48554' } }; r.height = 34; r.alignment = { wrapText: true, vertical: 'middle' }; ws.views = [{ rightToLeft: rtl, state: 'frozen', ySplit: 1 }]; };
    const ins = wb.addWorksheet('تعليمات'); ins.views = [{ rightToLeft: rtl }]; ins.getColumn(1).width = 120;
    ['قالب استيراد مطعمي برو — Mataami Pro import template — Mataami Pro içe aktarma şablonu', '',
      '1) الصق بياناتك المصدّرة من برنامجك السابق في الأوراق التالية بنفس ترتيب الأعمدة (لا تغيّر صف العناوين).',
      '   Paste the data exported from your previous system into the following sheets, keeping the column order (do not change the header row).',
      '   Önceki programınızdan dışa aktardığınız verileri sütun sırasını koruyarak aşağıdaki sayfalara yapıştırın.', '',
      '2) «المواد الأولية»: الاسم، الوحدة (كغ، غ، لتر، مل، حبة)، سعر الشراء، كمية الشراء، نسبة الهدر، وزن الحبة بالغرام (للوحدات بالحبة).',
      '3) «الأطباق»: الاسم، التصنيف، سعر البيع، نسبة العمالة، الوصف، السعرات، مسببات الحساسية (مفصولة بفواصل مثل: حليب، غلوتين، سمسم)، SKU، الباركود، رابط الصورة.',
      '4) «مكونات الأطباق»: سطر لكل مكوّن: اسم الطبق، اسم المادة (مطابق لورقة المواد أو للمواد الموجودة)، الكمية بنفس وحدة المادة.',
      '5) احفظ الملف ثم ارفعه من صفحة «استيراد من Excel» — ستظهر معاينة وأخطاء التحقق قبل الحفظ.', '',
      'مسببات الحساسية المعتمدة: ' + N().ALLERGENS.map(function (a) { return N().AL_SHORT[a[0]] + ' (' + a[0] + ')'; }).join('، ')].forEach(function (l) { ins.addRow([l]); });
    ins.getRow(1).font = { bold: true, size: 14 };
    const add = function (def, sample) {
      const ws = wb.addWorksheet(def.sheet[0]);
      ws.addRow(def.cols.map(function (c) { return c[1] + ' / ' + c[2] + ' / ' + c[3] + (c[4] ? ' *' : ''); })); hdr(ws);
      ws.columns.forEach(function (c) { c.width = 24; });
      sample.forEach(function (r) { ws.addRow(r).font = { color: { argb: 'FF888888' }, italic: true }; });
    };
    add(XL.mats, [['حمص حب (مثال)', 'كغ', 12, 1, 5, ''], ['طحينة (مثال)', 'كغ', 30, 1, 0, ''], ['بيض (مثال)', 'حبة', 18, 30, 0, 55]]);
    add(XL.dishes, [['حمص بطحينة (مثال)', 'مقبلات', 18, 10, 'حمص مع طحينة وزيت زيتون', '', 'سمسم', 'HUM-01', '', '']]);
    add(XL.ings, [['حمص بطحينة (مثال)', 'حمص حب (مثال)', 0.15], ['حمص بطحينة (مثال)', 'طحينة (مثال)', 0.05]]);
    const lst = wb.addWorksheet('قوائم'); lst.addRow(['الوحدات / Units', 'مسببات الحساسية / Allergens']); hdr(lst); lst.columns.forEach(function (c) { c.width = 30; });
    const units = ['كغ', 'غ', 'لتر', 'مل', 'حبة', 'كوب', 'ملعقة كبيرة', 'ملعقة صغيرة', 'kg', 'g', 'l', 'ml', 'piece'];
    for (let i = 0; i < Math.max(units.length, 14); i++) lst.addRow([units[i] || '', N().ALLERGENS[i] ? N().AL_SHORT[N().ALLERGENS[i][0]] + ' / ' + N().ALLERGENS[i][0] : '']);
    const buf = await wb.xlsx.writeBuffer(); saveAs(new Blob([buf]), 'MataamiPro_Import_Template.xlsx');
  }
  function cellVal(c) {
    let v = c && c.value; if (v === null || v === undefined) return '';
    if (typeof v === 'object') { if (v.richText) v = v.richText.map(function (x) { return x.text; }).join(''); else if (v.result !== undefined) v = v.result; else if (v.text !== undefined) v = v.text; else if (v instanceof Date) v = v.toISOString().slice(0, 10); else if (v.hyperlink) v = v.hyperlink; }
    return typeof v === 'string' ? v.trim() : v;
  }
  async function xlParse(file) {
    const wb = new ExcelJS.Workbook(); await wb.xlsx.load(await file.arrayBuffer());
    const sheets = wb.worksheets;
    const nrm = function (s) { return N().norm(String(s || '')); };
    const find = function (def, idx) {
      const names = def.sheet.map(nrm);
      return sheets.find(function (w) { return names.indexOf(nrm(w.name)) >= 0; }) || null;
    };
    const out = { materials: [], dishes: [], ingredients: [], errors: [], warnings: [] };
    const read = function (def, ws, key) {
      if (!ws) return;
      const head = []; ws.getRow(1).eachCell({ includeEmpty: true }, function (c, i) { head[i] = nrm(String(cellVal(c)).replace(/\*/g, '')); });
      // ربط الأعمدة حسب العنوان (أي لغة) أو حسب الترتيب
      const map = def.cols.map(function (c, ci) {
        const al = [c[0], c[1], c[2], c[3]].map(nrm);
        let at = head.findIndex(function (hh) { return hh && al.some(function (a) { return hh === a || hh.split(' / ').map(function (x) { return x.trim(); }).indexOf(a) >= 0 || hh.indexOf(a) === 0; }); });
        return at > 0 ? at : ci + 1;
      });
      ws.eachRow({ includeEmpty: false }, function (row, rn) {
        if (rn === 1) return;
        const o = {}; let any = false;
        def.cols.forEach(function (c, ci) { const v = cellVal(row.getCell(map[ci])); o[c[0]] = v; if (v !== '' && v !== null) any = true; });
        if (!any) return;
        if (/\((مثال|example|örnek)\)/i.test(String(o.name || o.dish || ''))) return;
        o.__row = rn; out[key].push(o);
      });
    };
    let mws = find(XL.mats), dws = find(XL.dishes), iws = find(XL.ings);
    // ملف بورقة واحدة غير مسمّاة: نعتبرها أطباقاً
    if (!mws && !dws && !iws) { const ws = sheets.find(function (w) { return w.rowCount > 1; }); dws = ws; out.warnings.push('لم يُعثر على أسماء الأوراق القياسية — تم اعتبار الورقة «' + (ws ? ws.name : '') + '» ورقة الأطباق'); }
    read(XL.mats, mws, 'materials'); read(XL.dishes, dws, 'dishes'); read(XL.ings, iws, 'ingredients');
    const num = function (v) { if (v === '' || v === null || v === undefined) return ''; const x = parseFloat(String(v).replace(/[^\d.\-٫٠-٩]/g, '').replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); }).replace('٫', '.')); return isNaN(x) ? NaN : x; };
    const mNames = new Set();
    out.materials = out.materials.map(function (m) {
      const o = { name: String(m.name || '').trim(), unit: String(m.unit || '').trim(), purchasePrice: num(m.purchasePrice), purchaseQty: num(m.purchaseQty), wastePercent: num(m.wastePercent), portionWeight: num(m.portionWeight), __row: m.__row };
      if (!o.name) out.errors.push(T('المواد الأولية') + ' — ' + T('صف') + ' ' + m.__row + ': ' + T('الاسم مطلوب'));
      ['purchasePrice', 'purchaseQty', 'wastePercent', 'portionWeight'].forEach(function (k) { if (Number.isNaN(o[k])) out.errors.push(T('المواد الأولية') + ' — ' + T('صف') + ' ' + m.__row + ': ' + T('قيمة رقمية غير صحيحة')); if (o[k] === '' || Number.isNaN(o[k])) o[k] = k === 'purchaseQty' ? 1 : 0; });
      if (mNames.has(o.name.toLowerCase())) out.warnings.push(T('مادة مكررة') + ': ' + o.name); mNames.add(o.name.toLowerCase());
      return o;
    }).filter(function (o) { return o.name; });
    const dNames = new Set();
    out.dishes = out.dishes.map(function (x) {
      const o = { name: String(x.name || '').trim(), category: String(x.category || '').trim(), price: num(x.price), laborPercent: num(x.laborPercent), description: String(x.description || ''), calories: num(x.calories),
        allergens: N().parseAllergens(x.allergens), sku: String(x.sku || ''), barcode: String(x.barcode || ''), imageUrl: String(x.imageUrl || ''), __row: x.__row };
      if (!o.name) out.errors.push(T('الأطباق') + ' — ' + T('صف') + ' ' + x.__row + ': ' + T('الاسم مطلوب'));
      if (Number.isNaN(o.price)) out.errors.push(T('الأطباق') + ' — ' + T('صف') + ' ' + x.__row + ': ' + T('سعر غير صحيح'));
      ['price', 'laborPercent'].forEach(function (k) { if (o[k] === '' || Number.isNaN(o[k])) o[k] = 0; });
      if (o.calories === '' || Number.isNaN(o.calories)) delete o.calories;
      if (String(x.allergens || '').trim() && !o.allergens.length) out.warnings.push(T('لم تُفهم مسببات الحساسية في') + ' ' + o.name + ': ' + x.allergens);
      if (dNames.has(o.name.toLowerCase())) out.warnings.push(T('طبق مكرر') + ': ' + o.name); dNames.add(o.name.toLowerCase());
      return o;
    }).filter(function (o) { return o.name; });
    const exMat = new Set(((window.allMaterials || [])).map(function (m) { return String(m.name).trim().toLowerCase(); }));
    out.ingredients = out.ingredients.map(function (x) {
      const o = { dish: String(x.dish || '').trim(), material: String(x.material || '').trim(), quantity: num(x.quantity), __row: x.__row };
      if (!o.dish || !o.material) out.errors.push(T('مكونات الأطباق') + ' — ' + T('صف') + ' ' + x.__row + ': ' + T('اسم الطبق واسم المادة مطلوبان'));
      else if (!mNames.has(o.material.toLowerCase()) && !exMat.has(o.material.toLowerCase())) out.warnings.push(T('مادة غير موجودة في الملف ولا في حسابك (سيتم تخطيها)') + ': ' + o.material);
      if (Number.isNaN(o.quantity) || o.quantity === '' || o.quantity <= 0) out.errors.push(T('مكونات الأطباق') + ' — ' + T('صف') + ' ' + x.__row + ': ' + T('كمية غير صحيحة'));
      if (o.dish && !dNames.has(o.dish.toLowerCase())) { out.dishes.push({ name: o.dish, category: '', price: 0, laborPercent: 0, description: '', allergens: [], sku: '', barcode: '', imageUrl: '' }); dNames.add(o.dish.toLowerCase()); out.warnings.push(T('طبق غير موجود في ورقة الأطباق — سيُنشأ بسعر 0') + ': ' + o.dish); }
      return o;
    }).filter(function (o) { return o.dish && o.material && o.quantity > 0; });
    return out;
  }
  bizPage('importxl', { group: 'menu54', title: 'استيراد من Excel', icon: 'file-import', perms: ['costing'],
    sub: 'انقل أطباقك وموادك الأولية وأسعارك ومكونات الوصفات من برنامجك السابق دفعة واحدة: حمّل القالب، الصق البيانات، ثم ارفعه — دون إعادة كتابة أي طبق.',
    render: async function (body) {
      body.innerHTML = '<div class="biz-grid-2"><div class="biz-card"><h4><i class="fas fa-download"></i> 1. ' + T('تحميل القالب') + '</h4><p class="muted" style="line-height:1.9">' +
        T('ملف Excel يحتوي أوراق: تعليمات، المواد الأولية، الأطباق، مكونات الأطباق، قوائم — العناوين بالعربية والإنجليزية والتركية.') + '</p><button class="btn btn-primary" id="ixTpl"><i class="fas fa-file-excel"></i> ' + T('تحميل قالب الاستيراد') + '</button></div>' +
        '<div class="biz-card"><h4><i class="fas fa-upload"></i> 2. ' + T('رفع الملف') + '</h4><label class="btn btn-outline"><i class="fas fa-folder-open"></i> ' + T('اختر ملف Excel (.xlsx)') + '<input type="file" id="ixFile" accept=".xlsx" hidden></label>' +
        '<div style="margin-top:10px">' + bForm([{ k: 'update', label: 'تحديث العناصر الموجودة بنفس الاسم', type: 'checkbox', def: true }, { k: 'menu', label: 'إضافة الأطباق إلى المينيو الإلكتروني', type: 'checkbox', def: true },
          { k: 'products', label: 'إنشاء منتجات للكاشير من الأطباق', type: 'checkbox', def: hasF('pos') }]) + '</div></div></div><div id="ixPrev"></div>' +
        '<div class="biz-card"><h4><i class="fas fa-clock-rotate-left"></i> ' + T('سجل الاستيراد') + '</h4><div id="ixLog"></div></div>';
      const loadLog = async function () {
        const r = await bz('v54Logs', { kind: 'import_log' });
        body.querySelector('#ixLog').innerHTML = bTable([{ label: 'التاريخ', r: function (x) { return dt(x.created_at || x.createdAt); } }, { label: 'الملف', r: function (x) { return h(x.title); } },
          { label: 'التفاصيل', wrap: true, r: function (x) { const d = x.data || {}; return T('مواد') + ' +' + (d.matNew || 0) + '/' + (d.matUpd || 0) + ' · ' + T('أطباق') + ' +' + (d.dishNew || 0) + '/' + (d.dishUpd || 0) + ' · ' + T('مكونات') + ' ' + (d.ingRows || 0) + ' · ' + T('منتجات') + ' +' + (d.prodNew || 0) + '/' + (d.prodUpd || 0) + ' · ' + T('المينيو') + ' +' + (d.menuNew || 0) + '/' + (d.menuUpd || 0); } }],
          (r.rows || []).slice(0, 30), { empty: 'لا توجد عمليات استيراد سابقة' });
      };
      body.querySelector('#ixTpl').onclick = function () { xlTemplate().catch(function (e) { showToast(e.message, true); }); };
      body.querySelector('#ixFile').onchange = async function (e) {
        const f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return;
        if (typeof ExcelJS === 'undefined') { showToast('مكتبة Excel غير محملة', true); return; }
        let res; showLoading();
        try { res = await xlParse(f); } catch (er) { showToast(T('تعذرت قراءة الملف') + ': ' + er.message, true); return; } finally { hideLoading(); }
        const pv = body.querySelector('#ixPrev');
        pv.innerHTML = '<div class="biz-card"><h4><i class="fas fa-eye"></i> 3. ' + T('معاينة') + ': ' + h(f.name) + '</h4>' +
          kpis([['المواد الأولية', nf(res.materials.length, 0)], ['الأطباق', nf(res.dishes.length, 0)], ['مكونات الأطباق', nf(res.ingredients.length, 0)], ['أخطاء', nf(res.errors.length, 0), '', res.errors.length ? '#ef4444' : '#10b981']]) +
          (res.errors.length ? '<div class="notif notif-danger"><i class="fas fa-circle-xmark"></i><div><b>' + T('يجب تصحيح الأخطاء التالية في الملف') + '</b><div>' + res.errors.slice(0, 50).map(h).join('<br>') + '</div></div></div>' : '') +
          (res.warnings.length ? '<div class="notif notif-warning"><i class="fas fa-triangle-exclamation"></i><div><b>' + T('تنبيهات') + '</b><div>' + res.warnings.slice(0, 50).map(h).join('<br>') + '</div></div></div>' : '') +
          '<h5 style="margin:10px 0 4px">' + T('الأطباق') + '</h5>' + bTable([{ label: 'الطبق', r: function (x) { return h(x.name); } }, { label: 'التصنيف', r: function (x) { return h(x.category || '—'); } }, { label: 'السعر', num: true, r: function (x) { return nf(x.price); } },
            { label: 'السعرات', num: true, r: function (x) { return x.calories != null ? nf(x.calories, 0) : '—'; } }, { label: 'مسببات الحساسية', wrap: true, r: function (x) { return alChips(x.allergens); } },
            { label: 'المكونات', num: true, r: function (x) { return res.ingredients.filter(function (g) { return g.dish.toLowerCase() === x.name.toLowerCase(); }).length; } }], res.dishes.slice(0, 200), { empty: 'لا توجد أطباق' }) +
          '<h5 style="margin:10px 0 4px">' + T('المواد الأولية') + '</h5>' + bTable([{ label: 'المادة', r: function (x) { return h(x.name); } }, { label: 'الوحدة', r: function (x) { return h(x.unit || '—'); } }, { label: 'سعر الشراء', num: true, r: function (x) { return nf(x.purchasePrice); } },
            { label: 'كمية الشراء', num: true, r: function (x) { return nf(x.purchaseQty, 3); } }, { label: 'الهدر %', num: true, r: function (x) { return nf(x.wastePercent, 1); } }], res.materials.slice(0, 200), { empty: 'لا توجد مواد' }) +
          '<div style="margin-top:12px"><button class="btn btn-primary" id="ixGo"' + (res.errors.length || (!res.materials.length && !res.dishes.length) ? ' disabled' : '') + '><i class="fas fa-cloud-arrow-up"></i> ' + T('استيراد الآن') + '</button></div></div>';
        const go = pv.querySelector('#ixGo');
        go.onclick = async function () {
          const o = readForm(body, [{ k: 'update', type: 'checkbox' }, { k: 'menu', type: 'checkbox' }, { k: 'products', type: 'checkbox' }]);
          if (!(await bConfirm(T('سيتم استيراد') + ' ' + res.materials.length + ' ' + T('مادة و') + ' ' + res.dishes.length + ' ' + T('طبق. متابعة؟')))) return;
          go.disabled = true;
          try {
            const strip = function (a) { return a.map(function (x) { const c = Object.assign({}, x); delete c.__row; return c; }); };
            const r = await bzOk('bulkImport', { data: { materials: strip(res.materials), dishes: strip(res.dishes), ingredients: strip(res.ingredients) }, options: o, fileName: f.name });
            pv.innerHTML = '<div class="biz-card"><h4><i class="fas fa-check-circle" style="color:#10b981"></i> ' + T('تم الاستيراد بنجاح') + '</h4>' +
              kpis([['مواد جديدة / محدّثة', r.matNew + ' / ' + r.matUpd], ['أطباق جديدة / محدّثة', r.dishNew + ' / ' + r.dishUpd], ['مكونات', nf(r.ingRows, 0)], ['منتجات الكاشير', r.prodNew + ' / ' + r.prodUpd], ['المينيو', r.menuNew + ' / ' + r.menuUpd]]) +
              ((r.warnings || []).length ? '<div class="notif notif-warning"><i class="fas fa-triangle-exclamation"></i><div>' + r.warnings.map(h).join('<br>') + '</div></div>' : '') +
              '<p class="muted">' + T('يمكنك الآن حساب السعرات تلقائياً من صفحة «السعرات ومسببات الحساسية».') + '</p></div>';
            loadLog(); if (typeof loadAllData === 'function') try { loadAllData(); } catch (e) { }
          } catch (er) { go.disabled = false; }
        };
      };
      loadLog();
    } });

  // ============================================================
  // 4) أقسام شاشات المطبخ (KDS Stations)
  // ============================================================
  const ICONS = ['fire-burner', 'drumstick-bite', 'bread-slice', 'mug-hot', 'martini-glass', 'smoking', 'ice-cream', 'fish', 'pizza-slice', 'bowl-food', 'leaf', 'utensils', 'burger', 'cake-candles', 'blender'];
  bizPage('kdsstations', { group: 'screens54', title: 'أقسام المطبخ والشاشات', icon: 'layer-group', feature: 'kitchen', perms: ['settings'], plan: 'premium',
    pitch: 'قسّم الطلبات على شاشات المطبخ: شاشة رئيسية تجمع كل الطلب، وشاشات فرعية لكل قسم (مشويات، معجنات...) وشاشات مستقلة للبار والأراجيل.',
    sub: 'الشاشة الرئيسية تعرض الطلب كاملاً مع شريط تجميع للأصناف المتشابهة. الأقسام «المرتبطة» تحضّر جزءها ولا يكتمل الطلب إلا بتجهيز كل الأجزاء، والأقسام «المستقلة» (بار، أراجيل) تخدم طلباتها منفصلة.',
    render: async function (body) {
      const prods = await entList('products').catch(function () { return []; });
      const cats = Array.from(new Set(prods.map(function (p) { return p.category; }).filter(Boolean)));
      const k0 = JSON.parse(JSON.stringify((B.acc.biz && B.acc.biz.kds) || {}));
      const st = { enabled: k0.enabled !== false, mainName: k0.mainName || 'المطبخ الرئيسي', aggregate: k0.aggregate !== false, stations: (k0.stations || []).map(function (s) { return Object.assign({ categories: [] }, s); }) };
      const prodMap = {}; prods.forEach(function (p) { prodMap[p.id] = p.station || ''; });
      const changed = {};
      const pid = encodeURIComponent(B.acc.publicId || currentUserEmail), br = encodeURIComponent(B.branch || '');
      const link = function (id) { return publicBase() + 'kitchen.html?st=' + encodeURIComponent(id) + (B.branch ? '&b=' + br : ''); };
      const draw = function () {
        const used = {}; st.stations.forEach(function (s) { s.categories.forEach(function (c) { used[c] = s.name; }); });
        body.innerHTML = '<div class="biz-card"><div>' + bForm([{ k: 'mainName', label: 'اسم الشاشة الرئيسية' }, { k: 'aggregate', label: 'إظهار شريط تجميع الأصناف المتشابهة', type: 'checkbox', hint: 'مثال: 5 صحون حمص من 3 فواتير مختلفة' }, { k: 'enabled', label: 'تفعيل تقسيم الأقسام', type: 'checkbox' }], st) + '</div></div>' +
          '<div class="biz-card"><h4 style="display:flex;justify-content:space-between;align-items:center"><span><i class="fas fa-layer-group"></i> ' + T('الأقسام') + ' (' + st.stations.length + ')</span><span style="display:flex;gap:6px"><button class="btn btn-outline btn-sm" data-tpl="1"><i class="fas fa-wand-magic-sparkles"></i> ' + T('أقسام مقترحة') + '</button><button class="btn btn-primary btn-sm" id="ksAdd"><i class="fas fa-plus"></i> ' + T('إضافة قسم') + '</button></span></h4>' +
          (st.stations.length ? st.stations.map(function (s, i) {
            return '<div class="biz-card" style="border-inline-start:4px solid ' + h(s.color || '#b48554') + ';margin:8px 0" data-i="' + i + '"><div class="biz-form">' +
              '<div><label class="pro-label">' + T('اسم القسم') + '</label><input data-f="name" value="' + h(s.name || '') + '" placeholder="' + T('مثال: المشويات') + '"></div>' +
              '<div><label class="pro-label">' + T('النوع') + '</label><select data-f="type"><option value="linked"' + (s.type !== 'independent' ? ' selected' : '') + '>' + T('مرتبط بالشاشة الرئيسية (جزء من الطلب)') + '</option><option value="independent"' + (s.type === 'independent' ? ' selected' : '') + '>' + T('مستقل (بار، مشروبات، أراجيل)') + '</option></select></div>' +
              '<div><label class="pro-label">' + T('الأيقونة') + '</label><select data-f="icon">' + ICONS.map(function (ic) { return '<option value="' + ic + '"' + (ic === s.icon ? ' selected' : '') + '>' + ic + '</option>'; }).join('') + '</select></div>' +
              '<div><label class="pro-label">' + T('اللون') + '</label><input type="color" data-f="color" value="' + h(s.color || '#b48554') + '"></div>' +
              '<div class="full"><label class="pro-label">' + T('التصنيفات التي تذهب لهذا القسم') + '</label><div style="display:flex;flex-wrap:wrap;gap:6px">' +
              (cats.length ? cats.map(function (c) { const on = s.categories.indexOf(c) >= 0, other = !on && used[c]; return '<label class="biz-check" style="margin:0;padding:4px 8px;' + (other ? 'opacity:.5' : '') + '"><input type="checkbox" data-cat="' + h(c) + '"' + (on ? ' checked' : '') + '> <span>' + h(c) + (other ? ' <small>(' + h(other) + ')</small>' : '') + '</span></label>'; }).join('') : '<span class="muted">' + T('أضف منتجات بتصنيفات للكاشير أولاً') + '</span>') + '</div></div>' +
              '<div class="full">' + linkBox(link(s.id || 'new')) + '</div></div>' +
              '<div style="display:flex;gap:6px;margin-top:6px"><button class="btn btn-outline btn-sm danger" data-del="' + i + '"><i class="fas fa-trash"></i> ' + T('حذف') + '</button>' + (s.id ? '<a class="btn btn-outline btn-sm" target="_blank" href="' + h(qrImg(link(s.id), 300)) + '"><i class="fas fa-qrcode"></i> QR</a>' : '<small class="muted">' + T('احفظ أولاً لتفعيل الرابط') + '</small>') + '</div></div>';
          }).join('') : '<div class="empty-state">' + T('لا توجد أقسام — كل الطلبات تظهر على الشاشة الرئيسية') + '</div>') + '</div>' +
          '<div class="biz-card"><h4><i class="fas fa-link"></i> ' + T('رابط الشاشة الرئيسية') + '</h4>' + linkBox(link('main')) + '</div>' +
          '<div class="biz-card"><h4><i class="fas fa-tags"></i> ' + T('تخصيص منتج لقسم (اختياري — يتقدّم على التصنيف)') + '</h4><input id="ksQ" placeholder="' + T('بحث عن منتج') + '" style="margin-bottom:8px"><div id="ksProds"></div></div>' +
          '<div style="position:sticky;bottom:0;padding:10px 0;background:var(--bg,#0b0e17)"><button class="btn btn-primary" id="ksSave"><i class="fas fa-check"></i> ' + T('حفظ الأقسام') + '</button></div>' +
          '<div class="biz-card"><h4><i class="fas fa-chart-column"></i> ' + T('أداء الأقسام') + '</h4>' + dateRangeBar('ksR') + '<div id="ksRep"></div></div>';
        drawProds(); bind();
      };
      const drawProds = function () {
        const q = (body.querySelector('#ksQ') || {}).value || '';
        const list = prods.filter(function (p) { return !q || (p.name + ' ' + (p.category || '')).indexOf(q) >= 0; }).slice(0, 300);
        body.querySelector('#ksProds').innerHTML = bTable([{ label: 'المنتج', r: function (p) { return h(p.name); } }, { label: 'التصنيف', r: function (p) { return h(p.category || '—'); } },
          { label: 'القسم', r: function (p) { const v = prodMap[p.id] || ''; return '<select data-prod="' + p.id + '"><option value="">' + T('حسب التصنيف') + '</option><option value="main"' + (v === 'main' ? ' selected' : '') + '>' + h(st.mainName) + '</option>' + st.stations.filter(function (s) { return s.id; }).map(function (s) { return '<option value="' + h(s.id) + '"' + (v === s.id ? ' selected' : '') + '>' + h(s.name) + '</option>'; }).join('') + '</select>'; } }], list, { empty: 'لا توجد منتجات' });
      };
      const sync = function () {
        const f = readForm(body, [{ k: 'mainName' }, { k: 'aggregate', type: 'checkbox' }, { k: 'enabled', type: 'checkbox' }]);
        Object.assign(st, f);
        body.querySelectorAll('[data-i]').forEach(function (card) {
          const s = st.stations[+card.dataset.i]; if (!s) return;
          card.querySelectorAll('[data-f]').forEach(function (inp) { s[inp.dataset.f] = inp.value; });
          s.categories = Array.from(card.querySelectorAll('[data-cat]')).filter(function (x) { return x.checked; }).map(function (x) { return x.dataset.cat; });
        });
      };
      const loadRep = async function (rg) {
        const r = await bz('kdsReport', rg || {});
        if (!r.success) { body.querySelector('#ksRep').innerHTML = '<div class="empty-state">' + h(r.error || '') + '</div>'; return; }
        body.querySelector('#ksRep').innerHTML = bTable([{ label: 'القسم', r: function (x) { return '<b>' + h(x.name) + '</b>'; } }, { label: 'الطلبات', num: true, r: function (x) { return nf(x.orders, 0); } }, { label: 'الكمية', num: true, r: function (x) { return nf(x.qty, 0); } },
          { label: 'متوسط الانتظار (د)', num: true, r: function (x) { return x.avgWait != null ? nf(x.avgWait, 1) : '—'; } }, { label: 'متوسط التحضير (د)', num: true, r: function (x) { return x.avgPrep != null ? nf(x.avgPrep, 1) : '—'; } },
          { label: 'متوسط الإجمالي (د)', num: true, r: function (x) { return x.avgTotal != null ? nf(x.avgTotal, 1) : '—'; } }, { label: 'متأخر', num: true, r: function (x) { return nf(x.late, 0) + ' (' + nf(x.latePct, 0) + '%)'; } }], r.stations, { empty: 'لا توجد طلبات في هذه الفترة' }) +
          (r.items && r.items.length ? '<h5 style="margin:10px 0 4px">' + T('أكثر الأصناف تحضيراً') + '</h5>' + bTable([{ label: 'القسم', r: function (x) { return h(x.station); } }, { label: 'الصنف', r: function (x) { return h(x.name); } }, { label: 'الكمية', num: true, r: function (x) { return nf(x.qty, 0); } }], r.items.slice(0, 30)) : '');
      };
      const bind = function () {
        body.querySelector('#ksQ').oninput = drawProds;
        body.querySelector('#ksProds').onchange = function (e) { const s = e.target.closest('[data-prod]'); if (s) { prodMap[s.dataset.prod] = s.value; changed[s.dataset.prod] = s.value; } };
        body.querySelector('#ksAdd').onclick = function () { sync(); st.stations.push({ id: '', name: '', type: 'linked', icon: 'utensils', color: '#b48554', categories: [] }); draw(); };
        body.querySelector('[data-tpl]').onclick = function () {
          sync();
          [['المشويات', 'linked', 'fire-burner', '#ef4444'], ['المعجنات والفرن', 'linked', 'bread-slice', '#f59e0b'], ['البار والمشروبات', 'independent', 'mug-hot', '#3b82f6'], ['الأراجيل', 'independent', 'smoking', '#8b5cf6']].forEach(function (t) {
            if (!st.stations.some(function (s) { return s.name === t[0]; })) st.stations.push({ id: '', name: t[0], type: t[1], icon: t[2], color: t[3], categories: [] });
          }); draw();
        };
        body.querySelectorAll('[data-del]').forEach(function (b) { b.onclick = async function () { sync(); const s = st.stations[+b.dataset.del]; if (!(await bConfirm(T('حذف القسم') + ' «' + (s.name || '') + '»؟ ' + T('أصنافه ستعود للشاشة الرئيسية.')))) return; st.stations.splice(+b.dataset.del, 1); draw(); }; });
        body.querySelectorAll('[data-i] [data-cat]').forEach(function (x) { x.onchange = function () { sync(); draw(); }; });
        body.querySelector('#ksSave').onclick = async function () {
          sync();
          if (st.stations.some(function (s) { return !String(s.name || '').trim(); })) { showToast('اكتب اسم كل قسم من أقسام المطبخ', true); return; }
          const r = await bzOk('kdsConfigSave', { config: { enabled: st.enabled, mainName: st.mainName, aggregate: st.aggregate, stations: st.stations, products: changed } });
          B.acc.biz.kds = r.kds; st.stations = r.kds.stations.map(function (s) { return Object.assign({ categories: [] }, s); });
          Object.keys(changed).forEach(function (k) { delete changed[k]; });
          showToast('تم حفظ الأقسام'); draw();
        };
        const get = bindRange(body, 'ksR', loadRep); loadRep(get());
      };
      draw();
    } });

  // ============================================================
  // 5) شاشة الطلب الذاتي (Kiosk) + بوابة الدفع + شاشة العميل
  // ============================================================
  bizPage('kiosk', { group: 'screens54', title: 'الطلب الذاتي وشاشة العميل', icon: 'tablet-screen-button', feature: 'kiosk', perms: ['settings'], plan: 'premium',
    pitch: 'شاشة طلب ذاتي للمطاعم السريعة: يختار العميل ويدفع إلكترونياً أو بالبطاقة أو عند الكاشير، ويصل الطلب للمطبخ مباشرة — مع شاشة عميل تعرض طلبه أثناء إدخاله.',
    sub: 'شاشة لمس يطلب منها العميل بنفسه ويدفع (QR / بطاقة على جهاز الدفع / عند الكاشير) — وشاشة عميل خارجية تعرض الطلب أثناء إدخاله على الكاشير.',
    render: async function (body) {
      body.innerHTML = subTabs('kiT', [['set', 'إعدادات الشاشة', 'sliders'], ['pay', 'بوابة الدفع', 'credit-card'], ['cd', 'شاشة العميل', 'display'], ['rep', 'التقرير', 'chart-line']], 'set') + '<div id="kiB"></div>';
      const box = body.querySelector('#kiB');
      const pid = encodeURIComponent(B.acc.publicId || currentUserEmail), br = encodeURIComponent(B.branch || '');
      const views = {
        set: function () {
          const k = (B.acc.biz && B.acc.biz.kiosk) || {};
          const F = [{ k: 'enabled', label: 'تفعيل شاشة الطلب الذاتي', type: 'checkbox' }, { k: 'welcome', label: 'رسالة الترحيب', ph: 'أهلاً بك! اطلب وادفع من هنا', full: true },
            { type: 'section', label: 'طرق الدفع' }, { k: 'payCounter', label: 'الدفع عند الكاشير', type: 'checkbox', def: true }, { k: 'payOnline', label: 'الدفع الإلكتروني (QR / رابط على الشاشة)', type: 'checkbox' },
            { k: 'payTerminal', label: 'الدفع بالبطاقة على جهاز الدفع المربوط', type: 'checkbox' }, { k: 'kitchenBeforePay', label: 'إرسال طلبات «الدفع عند الكاشير» للمطبخ قبل الدفع', type: 'checkbox' },
            { type: 'section', label: 'الطلب' }, { k: 'dineIn', label: 'محلي (داخل المطعم)', type: 'checkbox', def: true }, { k: 'takeaway', label: 'سفري', type: 'checkbox', def: true },
            { k: 'askName', label: 'طلب اسم العميل لمناداته', type: 'checkbox' }, { k: 'showCalories', label: 'إظهار السعرات ومسببات الحساسية', type: 'checkbox', def: true },
            { k: 'idleSec', label: 'العودة لشاشة الترحيب بعد خمول (ثانية)', type: 'number', def: 90 }];
          const url = publicBase() + 'kiosk.html?r=' + pid + (B.branch ? '&b=' + br : '');
          box.innerHTML = '<div class="biz-grid-2"><div class="biz-card">' + bForm(F, k) + '<button class="btn btn-primary" id="kiSave" style="margin-top:10px"><i class="fas fa-check"></i> ' + T('حفظ') + '</button></div>' +
            '<div class="biz-card"><h4><i class="fas fa-link"></i> ' + T('رابط شاشة الطلب الذاتي') + '</h4>' + linkBox(url) + '<div class="qr-tiles" style="margin-top:10px"><div class="qr-tile"><img src="' + qrImg(url, 200) + '"><div>Kiosk</div></div></div>' +
            '<div class="notif notif-info" style="margin-top:10px"><i class="fas fa-circle-info"></i><div>' + T('افتح الرابط على جهاز الكشك (تابلت أو شاشة لمس) وسجّل الدخول بحساب موظف بدور «شاشة طلب ذاتي» — أنشئه من «الموظفين والصلاحيات». شغّل المتصفح بوضع ملء الشاشة (Kiosk mode).') + '</div></div></div></div>';
          box.querySelector('#kiSave').onclick = function () { const v = readForm(box, F); v.idleSec = Math.max(20, Math.min(600, parseInt(v.idleSec) || 90)); saveBiz('kiosk', Object.assign({}, k, v)); };
        },
        pay: async function () {
          if (!B.acc.isOwner) { box.innerHTML = '<div class="empty-state">' + T('إعدادات بوابة الدفع متاحة لصاحب الحساب فقط') + '</div>'; return; }
          const r = await bzOk('paySettingsGet', {}, { loading: false }); const s = r.settings;
          const F = [{ k: 'provider', label: 'بوابة الدفع الإلكتروني', type: 'select', options: [['', '— بدون —'], ['stripe', 'Stripe (Checkout)'], ['moyasar', 'Moyasar (السعودية — مدى/Apple Pay)'], ['tap', 'Tap Payments (الخليج)'], ['iyzico', 'iyzico (تركيا)']].concat(s.provider === 'simulate' || (r.available && r.available.provider === 'simulate') ? [['simulate', 'محاكاة (للاختبار فقط)']] : []) },
            { k: 'currency', label: 'رمز العملة (ISO)', ph: 'SAR / AED / TRY / USD', ltr: true, hint: 'اتركه فارغاً لاستخدام عملة المطعم' },
            { type: 'section', label: 'Stripe' }, { k: 'stripe_sk', label: 'Secret key (sk_live_… / sk_test_…)', ltr: true, full: true },
            { type: 'section', label: 'Moyasar' }, { k: 'moyasar_sk', label: 'Secret key', ltr: true, full: true },
            { type: 'section', label: 'Tap' }, { k: 'tap_sk', label: 'Secret key', ltr: true, full: true },
            { type: 'section', label: 'iyzico' }, { k: 'iyzico_apiKey', label: 'API key', ltr: true }, { k: 'iyzico_secret', label: 'Secret key', ltr: true }, { k: 'iyzico_city', label: 'المدينة', def: 'Istanbul' }, { k: 'iyzico_country', label: 'الدولة', def: 'Turkey' }, { k: 'iyzico_sandbox', label: 'وضع تجريبي (Sandbox)', type: 'checkbox' },
            { type: 'section', label: 'جهاز الدفع بالبطاقة (Stripe Terminal)' }, { k: 'terminal_readerId', label: 'Reader ID (tmr_…)', ltr: true }, { k: 'terminal_sk', label: 'Secret key (اختياري إذا كان نفس مفتاح Stripe)', ltr: true }];
          const v = { provider: s.provider, currency: s.currency, stripe_sk: s.stripe.sk, moyasar_sk: s.moyasar.sk, tap_sk: s.tap.sk, iyzico_apiKey: s.iyzico.apiKey, iyzico_secret: s.iyzico.secret, iyzico_city: s.iyzico.city, iyzico_country: s.iyzico.country, iyzico_sandbox: s.iyzico.sandbox, terminal_readerId: s.terminal.readerId, terminal_sk: s.terminal.sk };
          box.innerHTML = '<div class="biz-grid-2"><div class="biz-card">' + bForm(F, v) + '<div style="display:flex;gap:8px;margin-top:10px"><button class="btn btn-primary" id="pgSave"><i class="fas fa-lock"></i> ' + T('حفظ') + '</button><button class="btn btn-outline" id="pgTest"><i class="fas fa-plug"></i> ' + T('اختبار الاتصال') + '</button></div><div id="pgRes" style="margin-top:8px"></div></div>' +
            '<div class="biz-card"><h4><i class="fas fa-shield-halved"></i> ' + T('كيف يعمل الدفع') + '</h4><ul style="line-height:2;padding-inline-start:18px">' +
            '<li>' + T('الحالة') + ': ' + (r.available.online ? '<span class="badge badge-success">' + T('الدفع الإلكتروني جاهز') + ' (' + h(r.available.provider) + ')</span>' : '<span class="badge badge-dog">' + T('الدفع الإلكتروني غير مُعدّ') + '</span>') + ' ' + (r.available.terminal ? '<span class="badge badge-success">' + T('جهاز البطاقة مربوط') + '</span>' : '') + '</li>' +
            '<li>' + T('الدفع الإلكتروني: تظهر للعميل صفحة دفع آمنة من البوابة على الشاشة ورمز QR ليدفع من جواله (مدى، Apple Pay، فيزا...). يُؤكَّد الدفع من البوابة مباشرة ثم يُغلق الطلب ويُرسل للمطبخ تلقائياً.') + '</li>' +
            '<li>' + T('جهاز البطاقة: يدعم أجهزة Stripe Terminal الذكية (مثل BBPOS WisePOS E و Stripe Reader S700) في الدول المتاح فيها Stripe. الأجهزة الأخرى مثل أجهزة البنوك المحلية (مدى/Geidea/Foodics Pay) تتطلب تكامل SDK من مزوّد الجهاز.') + '</li>' +
            '<li>' + T('المفاتيح تُحفظ مشفّرة النقل على السيرفر ولا تظهر كاملة مرة أخرى، ولا تُضمَّن في النسخة الاحتياطية.') + '</li>' +
            '<li>' + T('عنوان العودة بعد الدفع') + ': <code dir="ltr" style="font-size:.75rem;word-break:break-all">' + h(r.returnUrl) + '</code></li></ul></div></div>';
          box.querySelector('#pgSave').onclick = async function () {
            const x = readForm(box, F);
            await bzOk('paySettingsSave', { settings: { provider: x.provider, currency: x.currency, stripe: { sk: x.stripe_sk }, moyasar: { sk: x.moyasar_sk }, tap: { sk: x.tap_sk },
              iyzico: { apiKey: x.iyzico_apiKey, secret: x.iyzico_secret, sandbox: x.iyzico_sandbox, city: x.iyzico_city, country: x.iyzico_country }, terminal: { readerId: x.terminal_readerId, sk: x.terminal_sk } } });
            showToast('تم حفظ إعدادات الدفع'); views.pay();
          };
          box.querySelector('#pgTest').onclick = async function () {
            const t = await bzOk('paySettingsTest', {});
            box.querySelector('#pgRes').innerHTML = (t.results || []).map(function (x) { return '<div class="notif ' + (x.ok ? 'notif-success' : 'notif-danger') + '"><i class="fas fa-' + (x.ok ? 'check' : 'xmark') + '"></i><div><b>' + h(x.name) + '</b> — ' + h(x.msg || '') + '</div></div>'; }).join('');
          };
        },
        cd: function () {
          const c = (B.acc.biz && B.acc.biz.cdisplay) || {};
          if (!c.code) c.code = String(Math.floor(100000 + Math.random() * 900000));
          const F = [{ k: 'enabled', label: 'تفعيل شاشة العميل في الكاشير', type: 'checkbox', def: true }, { k: 'welcome', label: 'رسالة الترحيب', ph: 'أهلاً بك', full: true }, { k: 'showLogo', label: 'إظهار الشعار', type: 'checkbox', def: true },
            { k: 'remote', label: 'شاشة على جهاز آخر (تابلت/تلفاز) عبر الإنترنت', type: 'checkbox', hint: 'إذا كانت الشاشة الثانية موصولة بنفس جهاز الكاشير لا تحتاج هذا الخيار' }, { k: 'code', label: 'رمز الربط (6 أرقام)', ltr: true }];
          const same = publicBase() + 'customer-display.html';
          const remote = same + '?e=' + encodeURIComponent(currentUserEmail) + '&code=' + encodeURIComponent(c.code) + (B.branch ? '&b=' + br : '');
          box.innerHTML = '<div class="biz-grid-2"><div class="biz-card">' + bForm(F, c) + '<button class="btn btn-primary" id="cdSave" style="margin-top:10px"><i class="fas fa-check"></i> ' + T('حفظ') + '</button></div>' +
            '<div class="biz-card"><h4><i class="fas fa-display"></i> ' + T('تشغيل شاشة العميل') + '</h4><p class="muted" style="line-height:1.9">' + T('شاشة موصولة بجهاز الكاشير نفسه: افتح الرابط التالي واسحب النافذة إلى الشاشة الثانية واجعلها ملء الشاشة (F11) — تتحدث فوراً أثناء إدخال الطلب.') + '</p>' + linkBox(same) +
            '<p class="muted" style="line-height:1.9;margin-top:10px">' + T('شاشة على جهاز مستقل (تابلت أمام العميل): فعّل الخيار ثم افتح هذا الرابط على الجهاز — يتحدث كل ثانيتين تقريباً.') + '</p>' + linkBox(remote) + '<div class="qr-tiles" style="margin-top:8px"><div class="qr-tile"><img src="' + qrImg(remote, 180) + '"><div>' + T('شاشة العميل') + '</div></div></div></div></div>';
          box.querySelector('#cdSave').onclick = function () { const v = readForm(box, F); if (v.remote && !/^\d{4,10}$/.test(v.code)) { showToast('رمز الربط يجب أن يكون من 4 إلى 10 أرقام', true); return; } saveBiz('cdisplay', Object.assign({}, c, v)).then(function () { views.cd(); }); };
        },
        rep: function () {
          box.innerHTML = dateRangeBar('kiR') + '<div id="kiRep"></div>';
          const load = async function (rg) {
            const r = await bzOk('kioskReport', rg, { loading: false });
            const stN = { open: 'مفتوح', paid: 'مدفوع', cancelled: 'ملغى', refunded: 'مسترجع' }, psN = { pending: 'بانتظار الدفع', paid: 'مدفوع', failed: 'فشل', cancelled: 'ملغى', paid_unposted: 'مدفوع (يحتاج مراجعة)' };
            box.querySelector('#kiRep').innerHTML = kpis([['طلبات مدفوعة', nf(r.paidOrders, 0)], ['المبيعات', money(r.paidTotal)], ['متوسط الفاتورة', money(r.avgTicket)]]) +
              bTable([{ label: 'الحالة', r: function (x) { return h(T(stN[x.status] || x.status)); } }, { label: 'الطلبات', num: true, r: function (x) { return nf(x.orders, 0); } }, { label: 'الإجمالي', num: true, r: function (x) { return money(x.total); } }], r.byStatus, { empty: 'لا توجد طلبات من شاشة الطلب الذاتي' }) +
              '<h5 style="margin:10px 0 4px">' + T('عمليات الدفع الإلكتروني') + '</h5>' + bTable([{ label: 'البوابة', r: function (x) { return h(x.provider); } }, { label: 'الحالة', r: function (x) { return h(T(psN[x.status] || x.status)); } }, { label: 'العدد', num: true, r: function (x) { return nf(x.n, 0); } }, { label: 'المبلغ', num: true, r: function (x) { return money(x.amount); } }], r.payments, { empty: 'لا توجد عمليات دفع' });
          };
          const get = bindRange(box, 'kiR', load); load(get());
        }
      };
      bindSubTabs(body, 'kiT', function (k) { box.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-pulse"></i></div>'; Promise.resolve(views[k]()).catch(function (e) { box.innerHTML = '<div class="empty-state">' + h(e.message) + '</div>'; }); });
      views.set();
    } });


  // ============================================================
  // 6) شاشة العميل من الكاشير: بث محتوى السلة لحظياً (نفس الجهاز) أو عبر السيرفر (جهاز آخر)
  // ============================================================
  const CD = { bc: ('BroadcastChannel' in window) ? new BroadcastChannel('fcCustDisplay') : null, last: '', t: null, pushAt: 0 };
  function cdOn() { return hasF('customer_display') && !(B.acc && B.acc.biz && B.acc.biz.cdisplay && B.acc.biz.cdisplay.enabled === false); }
  function cdState() {
    if (typeof POS === 'undefined' || !POS.o || !POS.boot) return null;
    const o = POS.o, t = posTotals();
    const lines = o.items.filter(function (l) { return !(!l.productId && l.name === 'رسوم التوصيل'); }).map(function (l) {
      const unit = l.base + l.extras.reduce(function (a, e) { return a + e.price * e.qty; }, 0);
      return { name: l.name, variant: l.variant || '', qty: l.qty, total: Math.round(unit * l.qty * 100) / 100, extras: l.extras.map(function (e) { return e.name; }).join('، ') };
    });
    return { lines: lines, subtotal: t.sub, discount: t.disc, tax: t.tax, total: t.total, currency: typeof curName === 'function' ? curName() : '', status: lines.length ? 'ordering' : 'idle', number: o.number || null };
  }
  function cdSend(st) {
    if (!st || !cdOn()) return;
    const key = JSON.stringify(st); if (key === CD.last) return; CD.last = key;
    st.at = Date.now();
    const c = B.acc.biz.cdisplay || {}, app = B.acc.biz.app || {};
    try {
      if (CD.bc) CD.bc.postMessage(st);
      localStorage.setItem('fcCustDisplayState', JSON.stringify(st));
      localStorage.setItem('fcCustDisplayBrand', JSON.stringify({ name: app.name || B.acc.restaurantName || '', color: app.color || '#b48554', logo: c.showLogo === false ? '' : (app.icon || (B.acc.biz.business || {}).logo || ''), welcome: c.welcome || '', showLogo: c.showLogo !== false }));
    } catch (e) { }
    if (c.remote && c.code) {
      clearTimeout(CD.t);
      const wait = Math.max(0, 700 - (Date.now() - CD.pushAt));
      CD.t = setTimeout(function () { CD.pushAt = Date.now(); bz('custDisplayPush', { state: st }).catch(function () { }); }, wait);
    }
  }
  window.fcCustDisplaySend = cdSend;
  if (typeof posRenderCart === 'function' && !posRenderCart.__cd) {
    const oc = posRenderCart;
    window.posRenderCart = posRenderCart = function () { const r = oc.apply(this, arguments); try { cdSend(cdState()); } catch (e) { } return r; };
    posRenderCart.__cd = true;
  }
  if (typeof posRender === 'function' && !posRender.__cd) {
    const orr = posRender;
    window.posRender = posRender = function () {
      const r = orr.apply(this, arguments);
      try {
        const bar = POS.root && POS.root.querySelector('.pos-topbar');
        if (bar && cdOn() && !bar.querySelector('[data-cd]')) {
          const b = document.createElement('button'); b.className = 'btn btn-outline btn-sm'; b.dataset.cd = '1'; b.title = T('افتح هذه الصفحة على الشاشة الثانية المواجهة للعميل');
          b.innerHTML = '<i class="fas fa-display"></i> ' + T('شاشة العميل');
          b.onclick = function (e) { e.stopPropagation(); window.open(publicBase() + 'customer-display.html', 'fcCustDisplay', 'width=1024,height=700'); CD.last = ''; setTimeout(function () { cdSend(cdState()); }, 1200); };
          const rl = bar.querySelector('[data-a="reload"]'); bar.insertBefore(b, rl || null);
        }
      } catch (e) { }
      return r;
    };
    posRender.__cd = true;
  }

  // روابط سريعة من صفحة «الشاشات» الحالية
  if (typeof screensView === 'function' && !screensView.__v54) {
    const old = screensView;
    window.screensView = screensView = function (el) {
      old(el);
      const d = document.createElement('div'); d.className = 'biz-card'; d.style.marginTop = '12px';
      d.innerHTML = '<h4><i class="fas fa-layer-group"></i> ' + T('شاشات إضافية (v5.4)') + '</h4><div style="display:flex;gap:8px;flex-wrap:wrap">' +
        '<button class="btn btn-outline" onclick="switchTab(\'kdsstations\')"><i class="fas fa-layer-group"></i> ' + T('أقسام المطبخ والشاشات') + '</button>' +
        '<button class="btn btn-outline" onclick="switchTab(\'kiosk\')"><i class="fas fa-tablet-screen-button"></i> ' + T('الطلب الذاتي وشاشة العميل') + '</button></div>';
      el.appendChild(d);
    };
    screensView.__v54 = true;
  }
  if (B.acc && typeof buildBizSidebar === 'function') buildBizSidebar();
})();
