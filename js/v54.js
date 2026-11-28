// ============================================================
// Mataami Pro v5.4.0 — أقسام المطبخ (KDS) · رفع الأسعار بنسبة · السعرات ومسببات الحساسية
// · الاستيراد من Excel · شاشة الطلب الذاتي (Kiosk) والدفع الإلكتروني · شاشة العميل
// ============================================================
(function () {
  'use strict';
  if (typeof BIZ_GROUPS === 'undefined' || typeof bizPage !== 'function') return;
  const T = function (s) { return window.fcI18n ? fcI18n.t(s) : s; };
  // v5.4.1: تنظيم القائمة — مجموعة واحدة «الطلب الإلكتروني والشاشات» بعد المبيعات، وإزالة المجموعات المتفرقة
  if (!BIZ_GROUPS.some(function (g) { return g[0] === 'screens'; })) {
    const i = BIZ_GROUPS.findIndex(function (g) { return g[0] === 'ops'; });
    BIZ_GROUPS.splice(i < 0 ? 1 : i + 1, 0, ['screens', 'الطلب الإلكتروني والشاشات']);
  }
  const N = function () { return window.FC_NUTRI; };
  const alChips = function (list) {
    if (!list || !list.length) return '<span class="muted">—</span>';
    return list.map(function (k) { return '<span class="badge badge-warning" style="margin:1px"><i class="fas fa-' + N().alIcon(k) + '"></i> ' + h(T(N().AL_SHORT[k] || k)) + '</span>'; }).join(' ');
  };

  // ============================================================
  // 1) السعرات الحرارية ومسببات الحساسية
  // ============================================================
  bizPage('nutrition', { group: 'menutools', title: 'السعرات ومسببات الحساسية', icon: 'heart-pulse', perms: ['costing', 'digital_menu'],
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
          '<button class="btn btn-outline" id="nuCalc"><i class="fas fa-calculator"></i> ' + T('حاسبة السعرات') + '</button>' +
          '<button class="btn btn-outline" id="nuHow"><i class="fas fa-circle-question"></i> ' + T('طريقة الحساب') + '</button>' +
          '</div>' +
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
          if (e.target.closest('#nuCalc') && window.fcCalorieCalc) return fcCalorieCalc();
          if (e.target.closest('#nuHow') && window.fcCalorieCalc) return fcCalorieCalc('how');
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
  bizPage('pricetools', { group: 'menutools', title: 'تعديل الأسعار بنسبة', icon: 'percent', perms: ['costing', 'settings'],
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
  bizPage('importxl', { group: 'admin', title: 'استيراد البيانات من Excel', icon: 'file-import', perms: ['costing'],
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
  // v5.4.1 — أدوات واجهة مضغوطة ومتناسقة (حقول صغيرة، مفاتيح تشغيل، روابط بأزرار أيقونات)
  // ============================================================
  const PLAN_OF = { kitchen: 'premium', kiosk: 'premium', customer_display: 'pro', online_orders: 'pro', brand_app: 'premium' };
  const lockChip = function (f) { const k = PLAN_OF[f] || 'pro'; return '<span class="plan-chip plan-' + k + ' sx-lock">' + h(fcPlanByKey(k).name) + ' <i class="fas fa-lock"></i></span>'; };
  const sw = function (k, label, on, hint) {
    return '<label class="sx-sw"' + (hint ? ' title="' + h(T(hint)) + '"' : '') + '><input type="checkbox" data-k="' + k + '"' + (on ? ' checked' : '') + '><span class="sx-sw-t"></span><span class="sx-sw-l">' + h(T(label)) + '</span></label>';
  };
  const fld = function (k, label, val, o) {
    o = o || {};
    let c;
    if (o.type === 'select') c = '<select class="sx-in" data-k="' + k + '">' + o.options.map(function (x) { return '<option value="' + h(x[0]) + '"' + (String(x[0]) === String(val == null ? '' : val) ? ' selected' : '') + '>' + h(T(x[1])) + '</option>'; }).join('') + '</select>';
    else c = '<input class="sx-in" data-k="' + k + '" type="' + (o.type || 'text') + '"' + (o.ltr ? ' dir="ltr"' : '') + ' value="' + h(val == null ? '' : val) + '"' + (o.ph ? ' placeholder="' + h(T(o.ph)) + '"' : '') + (o.max ? ' maxlength="' + o.max + '"' : '') + '>';
    return '<label class="sx-f' + (o.cls ? ' ' + o.cls : '') + '"' + (o.prov ? ' data-prov="' + o.prov + '"' : '') + '><span>' + h(T(label)) + '</span>' + c + (o.hint ? '<small>' + h(T(o.hint)) + '</small>' : '') + '</label>';
  };
  const readK = function (root) {
    const o = {};
    root.querySelectorAll('[data-k]').forEach(function (x) { o[x.dataset.k] = x.type === 'checkbox' ? x.checked : (x.type === 'number' ? (x.value === '' ? '' : +x.value) : String(x.value).trim()); });
    return o;
  };
  // v5.4.3: زر «فتح» يفتح نسخة الملفات الحالية (نفس الجهاز/الدومين) — النسخ وQR يبقيان على الرابط العام
  const openUrl = function (url) {
    try { const pb = publicBase(), lb = location.href.split(/[?#]/)[0].replace(/[^/]*$/, '');
      if (pb !== lb && url.indexOf(pb) === 0) return lb + url.slice(pb.length); } catch (e) {}
    return url;
  };
  window.fcOpenUrl = openUrl;
  const linkActs = function (url, title, extra) {
    return '<div class="sx-acts"><a class="btn btn-outline btn-sm" href="' + h(openUrl(url)) + '" target="_blank" rel="noopener" title="' + h(T('فتح')) + '"><i class="fas fa-up-right-from-square"></i></a>' +
      '<button type="button" class="btn btn-outline btn-sm" data-copy="' + h(url) + '" title="' + h(T('نسخ الرابط')) + '"><i class="fas fa-copy"></i></button>' +
      '<button type="button" class="btn btn-outline btn-sm" data-qr="' + h(url) + '" data-qrt="' + h(T(title || '')) + '" title="QR"><i class="fas fa-qrcode"></i></button>' + (extra || '') + '</div>';
  };
  const linkCard = function (title, url, note) {
    return '<div class="sx-card-h"><h4><i class="fas fa-link"></i> ' + h(T(title)) + '</h4></div>' +
      '<div class="sx-link"><img src="' + qrImg(url, 160) + '" alt="QR" loading="lazy"><div class="sx-link-b"><input class="sx-in sx-url" readonly dir="ltr" value="' + h(url) + '">' + linkActs(url, title) +
      (note ? '<p class="sx-note"><i class="fas fa-circle-info"></i> <span>' + h(T(note)) + '</span></p>' : '') + '</div></div>';
  };
  const hubTabs = function (id, tabs, active) {
    return '<div class="sx-tabs" id="' + id + '">' + tabs.map(function (t) {
      const lk = t[3] && !hasF(t[3]);
      return '<button type="button" class="sx-tab' + (t[0] === active ? ' active' : '') + (lk ? ' locked' : '') + '" data-sub="' + t[0] + '"' + (lk ? ' data-plan="' + (PLAN_OF[t[3]] || 'pro') + '"' : '') + '><i class="fas fa-' + t[2] + '"></i><span>' + h(T(t[1])) + '</span>' + (lk ? lockChip(t[3]) : '') + '</button>';
    }).join('') + '</div>';
  };
  const spin = '<div class="empty-state"><i class="fas fa-spinner fa-pulse"></i></div>';
  // أزرار مشتركة: نسخ الرابط، QR، الانتقال لتبويب، الترقية
  function hubClicks(root, go) {
    root.addEventListener('click', function (e) {
      const cp = e.target.closest('[data-copy]');
      if (cp) { e.preventDefault(); const u = cp.dataset.copy; (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(function () { showToast(T('تم نسخ الرابط')); }).catch(function () { prompt('', u); }); return; }
      const q = e.target.closest('[data-qr]');
      if (q) { e.preventDefault(); bModal({ title: q.dataset.qrt || 'QR', icon: 'qrcode', body: '<div class="sx-qrbig"><img src="' + qrImg(q.dataset.qr, 360) + '" alt="QR"><code dir="ltr">' + h(q.dataset.qr) + '</code></div>' }); return; }
      const g = e.target.closest('[data-go]'); if (g && go) { e.preventDefault(); go(g.dataset.go); return; }
      const up = e.target.closest('[data-up]'); if (up) { e.preventDefault(); bizUpgradeModal(up.dataset.up); }
    });
  }
  const here = function (f) { return location.origin + location.pathname.replace(/[^/]*$/, '') + f; };

  // ============================================================
  // 4) إدارة الشاشات — مكان واحد لكل الشاشات: المطبخ وأقسامه، حالة الطلبات، الطلب الذاتي، شاشة العميل، الدفع، التقارير
  // ============================================================
  const ICONS = ['fire-burner', 'drumstick-bite', 'bread-slice', 'pizza-slice', 'burger', 'fish', 'bowl-food', 'leaf', 'utensils', 'ice-cream', 'cake-candles', 'mug-hot', 'martini-glass', 'blender', 'smoking'];
  const SCR = { tab: 'all' };
  window.fcOpenScreens = function (tab) { SCR.tab = tab || 'all'; switchTab('screens'); };
  const SV = {};

  // ---------- كل الشاشات ----------
  SV.all = async function (box) {
    const biz = B.acc.biz || {}, kds = biz.kds || {}, ki = biz.kiosk || {}, cd = biz.cdisplay || {};
    const br = encodeURIComponent(B.branch || ''), pid = encodeURIComponent(B.acc.publicId || currentUserEmail);
    const kLink = function (id) { return publicBase() + 'kitchen.html?st=' + encodeURIComponent(id) + (B.branch ? '&b=' + br : ''); };
    const onOff = function (on) { return on ? ['مفعّلة', 'on'] : ['متوقفة', 'off']; };
    const tile = function (o) {
      const lk = o.feature && !hasF(o.feature);
      return '<div class="sx-tile' + (lk ? ' is-locked' : '') + '" style="--c:' + h(o.color || '#b48554') + '"><div class="sx-tile-h"><span class="sx-ic"><i class="fas fa-' + o.ic + '"></i></span><div class="sx-tt"><b>' + h(T(o.title)) + '</b><small>' + h(T(o.desc)) + '</small></div>' +
        (lk ? lockChip(o.feature) : (o.state ? '<span class="sx-st ' + o.state[1] + '">' + h(T(o.state[0])) + '</span>' : '')) + '</div>' +
        (lk ? '<div class="sx-acts"><button type="button" class="btn btn-primary btn-sm" data-up="' + (PLAN_OF[o.feature] || 'pro') + '"><i class="fas fa-crown"></i> ' + h(T('ترقية الباقة')) + '</button></div>'
          : (o.url ? linkActs(o.url, o.title, o.tab ? '<button type="button" class="btn btn-outline btn-sm" data-go="' + o.tab + '" title="' + h(T('الإعدادات')) + '"><i class="fas fa-gear"></i></button>' : '')
            : '<div class="sx-acts"><button type="button" class="btn btn-outline btn-sm" data-go="' + o.tab + '"><i class="fas fa-gear"></i> ' + h(T('الإعدادات')) + '</button></div>')) + '</div>';
    };
    const sts = (kds.stations || []).filter(function (s) { return s.id; });
    const kitchenTiles = [tile({ ic: 'fire-burner', title: kds.mainName || 'المطبخ الرئيسي', desc: 'الطلب كاملاً مع شريط تجميع الأصناف المتشابهة', url: kLink('main'), feature: 'kitchen', tab: 'stations', state: onOff(true) })]
      .concat(sts.map(function (s) { return tile({ ic: s.icon || 'utensils', color: s.color, title: s.name, desc: s.type === 'independent' ? 'قسم مستقل — يخدم طلباته منفصلة' : 'قسم مرتبط — جزء من الطلب الرئيسي', url: kLink(s.id), feature: 'kitchen', tab: 'stations', state: onOff(kds.enabled !== false) }); }))
      .concat(hasF('kitchen') && !sts.length ? ['<button type="button" class="sx-tile sx-add" data-go="stations"><i class="fas fa-plus"></i><span>' + h(T('إضافة قسم مطبخ (مشويات، معجنات، بار، أراجيل)')) + '</span></button>'] : [])
      .concat([tile({ ic: 'tv', title: 'شاشة حالة الطلبات', desc: 'أرقام «قيد التحضير» و«جاهز للاستلام» لمنطقة الانتظار', url: publicBase() + 'order-status.html?r=' + pid + '&b=' + br, feature: 'kitchen' })]);
    const custTiles = [
      tile({ ic: 'tablet-screen-button', title: 'شاشة الطلب الذاتي', desc: 'يطلب العميل ويدفع بنفسه ويصل الطلب للمطبخ', url: publicBase() + 'kiosk.html?r=' + pid + (B.branch ? '&b=' + br : ''), feature: 'kiosk', tab: 'kiosk', state: onOff(!!ki.enabled) }),
      tile({ ic: 'display', title: 'شاشة العميل — نفس جهاز الكاشير', desc: 'شاشة ثانية موصولة بالكاشير تعرض الطلب لحظياً', url: here('customer-display.html'), feature: 'customer_display', tab: 'cd', state: onOff(cd.enabled !== false) }),
      tile({ ic: 'tablet-alt', title: 'شاشة العميل — جهاز مستقل', desc: 'تابلت أو تلفاز أمام العميل عبر الإنترنت برمز ربط', url: cd.remote && cd.code ? publicBase() + 'customer-display.html?e=' + encodeURIComponent(currentUserEmail) + '&code=' + encodeURIComponent(cd.code) + (B.branch ? '&b=' + br : '') : '', feature: 'customer_display', tab: 'cd', state: onOff(!!(cd.remote && cd.code)) })
    ];
    box.innerHTML = (hasF('kitchen') ? '<div class="sx-bar">' + sw('kitchenAuto', 'إرسال الطلب للمطبخ تلقائياً عند الدفع', ((biz.pos || {}).kitchenAuto)) + '<span class="sx-hint">' + h(T('يُحفظ تلقائياً')) + '</span></div>' : '') +
      '<div class="sx-sec"><h4><i class="fas fa-fire-burner"></i> ' + h(T('شاشات المطبخ')) + '</h4></div><div class="sx-grid">' + kitchenTiles.join('') + '</div>' +
      '<div class="sx-sec"><h4><i class="fas fa-users"></i> ' + h(T('شاشات العملاء')) + '</h4></div><div class="sx-grid">' + custTiles.join('') + '</div>' +
      '<p class="sx-note sx-note-b"><i class="fas fa-circle-info"></i> <span>' + h(T('شاشات المطبخ تفتح بحساب موظف بدور «مطبخ»، وشاشة الطلب الذاتي بحساب بدور «شاشة طلب ذاتي» — أنشئهما من «الموظفون والفروع».')) + '</span></p>';
    const ka = box.querySelector('[data-k="kitchenAuto"]');
    if (ka) ka.onchange = function () { saveBiz('pos', Object.assign({}, (B.acc.biz || {}).pos, { kitchenAuto: ka.checked })); };
  };

  // ---------- أقسام المطبخ ----------
  SV.stations = async function (box) {
    const prods = await entList('products').catch(function () { return []; });
    const cats = Array.from(new Set(prods.map(function (p) { return p.category; }).filter(Boolean)));
    const k0 = JSON.parse(JSON.stringify((B.acc.biz && B.acc.biz.kds) || {}));
    const st = { enabled: k0.enabled !== false, mainName: k0.mainName || 'المطبخ الرئيسي', aggregate: k0.aggregate !== false, stations: (k0.stations || []).map(function (s) { return Object.assign({ categories: [] }, s); }) };
    const prodMap = {}; prods.forEach(function (p) { prodMap[p.id] = p.station || ''; });
    const changed = {};
    const br = encodeURIComponent(B.branch || '');
    const link = function (id) { return publicBase() + 'kitchen.html?st=' + encodeURIComponent(id) + (B.branch ? '&b=' + br : ''); };
    let openDet = false;
    const row = function (s, i, used) {
      const color = s.color || '#b48554', icon = s.icon || 'utensils';
      const chips = cats.length ? cats.map(function (c) {
        const on = s.categories.indexOf(c) >= 0, other = !on && used[c];
        return '<label class="sx-chip' + (on ? ' on' : '') + (other ? ' taken' : '') + '"' + (other ? ' title="' + h(T('مخصص لقسم') + ': ' + other) + '"' : '') + '><input type="checkbox" data-cat="' + h(c) + '"' + (on ? ' checked' : '') + '>' + h(c) + (other ? '<small>' + h(other) + '</small>' : '') + '</label>';
      }).join('') : '<span class="sx-hint">' + h(T('أضف منتجات بتصنيفات للكاشير أولاً')) + '</span>';
      return '<div class="sx-row" data-i="' + i + '" style="--c:' + h(color) + '"><div class="sx-row-main">' +
        '<label class="sx-colr" title="' + h(T('اللون')) + '"><input type="color" data-f="color" value="' + h(color) + '"></label>' +
        '<span class="sx-icwrap"><button type="button" class="sx-icbtn" data-icpick="' + i + '" title="' + h(T('الأيقونة')) + '"><i class="fas fa-' + h(icon) + '"></i></button><input type="hidden" data-f="icon" value="' + h(icon) + '"></span>' +
        '<input class="sx-in sx-name" data-f="name" value="' + h(s.name || '') + '" placeholder="' + h(T('اسم القسم — مثال: المشويات')) + '">' +
        '<select class="sx-in sx-type" data-f="type"><option value="linked"' + (s.type !== 'independent' ? ' selected' : '') + '>' + h(T('مرتبط بالطلب الرئيسي')) + '</option><option value="independent"' + (s.type === 'independent' ? ' selected' : '') + '>' + h(T('مستقل (بار، مشروبات، أراجيل)')) + '</option></select>' +
        (s.id ? linkActs(link(s.id), s.name) : '<span class="sx-hint">' + h(T('احفظ لتفعيل الرابط')) + '</span>') +
        '<button type="button" class="btn btn-outline btn-sm sx-del" data-del="' + i + '" title="' + h(T('حذف')) + '"><i class="fas fa-trash"></i></button></div>' +
        '<div class="sx-chips"><span class="sx-chips-l">' + h(T('التصنيفات')) + '</span>' + chips + '</div></div>';
    };
    const draw = function () {
      const used = {}; st.stations.forEach(function (s) { s.categories.forEach(function (c) { used[c] = s.name; }); });
      box.innerHTML = '<div class="sx-bar">' + fld('mainName', 'اسم الشاشة الرئيسية', st.mainName, { cls: 'sx-f-row' }) + sw('enabled', 'تفعيل تقسيم الأقسام', st.enabled) +
        sw('aggregate', 'شريط تجميع الأصناف المتشابهة', st.aggregate, 'مثال: 5 صحون حمص من 3 فواتير مختلفة') + '<span class="sx-sp"></span>' + linkActs(link('main'), st.mainName) + '</div>' +
        '<div class="sx-sec"><h4><i class="fas fa-layer-group"></i> ' + h(T('الأقسام')) + ' <span class="sx-count">' + st.stations.length + '</span></h4><div class="sx-btns">' +
        '<button type="button" class="btn btn-outline btn-sm" id="ksTpl"><i class="fas fa-wand-magic-sparkles"></i> ' + h(T('أقسام مقترحة')) + '</button>' +
        '<button type="button" class="btn btn-outline btn-sm" id="ksAdd"><i class="fas fa-plus"></i> ' + h(T('إضافة قسم')) + '</button>' +
        '<button type="button" class="btn btn-primary btn-sm" id="ksSave"><i class="fas fa-check"></i> ' + h(T('حفظ التغييرات')) + '</button></div></div>' +
        (st.stations.length ? '<div class="sx-list">' + st.stations.map(function (s, i) { return row(s, i, used); }).join('') + '</div>'
          : '<div class="sx-empty"><i class="fas fa-layer-group"></i><span>' + h(T('لا توجد أقسام — كل الطلبات تظهر على الشاشة الرئيسية')) + '</span></div>') +
        '<p class="sx-note"><i class="fas fa-circle-info"></i> <span>' + h(T('القسم المرتبط يحضّر جزءه ولا يكتمل الطلب إلا بتجهيز كل الأجزاء. القسم المستقل (بار، أراجيل) يخدم طلباته منفصلة حتى لو لم يطلب العميل طعاماً.')) + '</span></p>' +
        '<details class="sx-det"' + (openDet ? ' open' : '') + '><summary><i class="fas fa-tags"></i> ' + h(T('تخصيص منتج لقسم معين')) + ' <small>' + h(T('اختياري — يتقدّم على التصنيف')) + '</small></summary><div class="sx-det-b"><input class="sx-in" id="ksQ" placeholder="' + h(T('بحث عن منتج')) + '"><div id="ksProds"></div></div></details>';
      drawProds(); bind();
    };
    const drawProds = function () {
      const q = (box.querySelector('#ksQ') || {}).value || '';
      const list = prods.filter(function (p) { return !q || (p.name + ' ' + (p.category || '')).indexOf(q) >= 0; }).slice(0, 300);
      box.querySelector('#ksProds').innerHTML = bTable([{ label: 'المنتج', r: function (p) { return h(p.name); } }, { label: 'التصنيف', r: function (p) { return h(p.category || '—'); } },
        { label: 'القسم', r: function (p) { const v = prodMap[p.id] || ''; return '<select class="sx-in sx-in-sm" data-prod="' + p.id + '"><option value="">' + h(T('حسب التصنيف')) + '</option><option value="main"' + (v === 'main' ? ' selected' : '') + '>' + h(st.mainName) + '</option>' + st.stations.filter(function (s) { return s.id; }).map(function (s) { return '<option value="' + h(s.id) + '"' + (v === s.id ? ' selected' : '') + '>' + h(s.name) + '</option>'; }).join('') + '</select>'; } }], list, { empty: 'لا توجد منتجات' });
    };
    const sync = function () {
      const f = readK(box.querySelector('.sx-bar'));
      st.mainName = f.mainName || st.mainName; st.enabled = f.enabled; st.aggregate = f.aggregate;
      box.querySelectorAll('.sx-row[data-i]').forEach(function (card) {
        const s = st.stations[+card.dataset.i]; if (!s) return;
        card.querySelectorAll('[data-f]').forEach(function (inp) { s[inp.dataset.f] = inp.value; });
        s.categories = Array.from(card.querySelectorAll('[data-cat]')).filter(function (x) { return x.checked; }).map(function (x) { return x.dataset.cat; });
      });
      const d = box.querySelector('.sx-det'); openDet = !!(d && d.open);
    };
    const closePop = function () { box.querySelectorAll('.sx-icpop').forEach(function (p) { p.remove(); }); };
    const bind = function () {
      box.querySelector('#ksQ').oninput = drawProds;
      box.querySelector('#ksProds').onchange = function (e) { const s = e.target.closest('[data-prod]'); if (s) { prodMap[s.dataset.prod] = s.value; changed[s.dataset.prod] = s.value; } };
      box.querySelector('#ksAdd').onclick = function () { sync(); st.stations.push({ id: '', name: '', type: 'linked', icon: 'utensils', color: '#b48554', categories: [] }); draw(); const n = box.querySelectorAll('.sx-name'); if (n.length) n[n.length - 1].focus(); };
      box.querySelector('#ksTpl').onclick = function () {
        sync();
        [['المشويات', 'linked', 'fire-burner', '#ef4444'], ['المعجنات والفرن', 'linked', 'bread-slice', '#f59e0b'], ['البار والمشروبات', 'independent', 'mug-hot', '#3b82f6'], ['الأراجيل', 'independent', 'smoking', '#8b5cf6']].forEach(function (t) {
          if (!st.stations.some(function (s) { return s.name === t[0]; })) st.stations.push({ id: '', name: t[0], type: t[1], icon: t[2], color: t[3], categories: [] });
        }); draw();
      };
      box.querySelectorAll('[data-del]').forEach(function (b) { b.onclick = async function () { sync(); const s = st.stations[+b.dataset.del]; if (!(await bConfirm(T('حذف القسم') + ' «' + (s.name || '') + '»؟ ' + T('أصنافه ستعود للشاشة الرئيسية.')))) return; st.stations.splice(+b.dataset.del, 1); draw(); }; });
      box.querySelectorAll('.sx-row [data-cat]').forEach(function (x) { x.onchange = function () { sync(); draw(); }; });
      box.querySelectorAll('.sx-row [data-f="color"]').forEach(function (x) { x.oninput = function () { x.closest('.sx-row').style.setProperty('--c', x.value); }; });
      box.querySelectorAll('[data-icpick]').forEach(function (b) {
        b.onclick = function (e) {
          e.stopPropagation(); const had = b.parentNode.querySelector('.sx-icpop'); closePop(); if (had) return;
          const pop = document.createElement('div'); pop.className = 'sx-icpop';
          pop.innerHTML = ICONS.map(function (ic) { return '<button type="button" data-ic="' + ic + '"><i class="fas fa-' + ic + '"></i></button>'; }).join('');
          pop.onclick = function (ev) { const x = ev.target.closest('[data-ic]'); if (!x) return; ev.stopPropagation(); b.innerHTML = '<i class="fas fa-' + x.dataset.ic + '"></i>'; b.parentNode.querySelector('[data-f="icon"]').value = x.dataset.ic; closePop(); };
          b.parentNode.appendChild(pop);
        };
      });
      box.onclick = function (e) { if (!e.target.closest('.sx-icpop')) closePop(); };
      box.querySelector('#ksSave').onclick = async function () {
        sync();
        if (st.stations.some(function (s) { return !String(s.name || '').trim(); })) { showToast('اكتب اسم كل قسم من أقسام المطبخ', true); return; }
        const r = await bzOk('kdsConfigSave', { config: { enabled: st.enabled, mainName: st.mainName, aggregate: st.aggregate, stations: st.stations, products: changed } });
        B.acc.biz.kds = r.kds; st.stations = r.kds.stations.map(function (s) { return Object.assign({ categories: [] }, s); });
        Object.keys(changed).forEach(function (k) { delete changed[k]; });
        showToast('تم حفظ الأقسام'); draw();
      };
    };
    draw();
  };

  // ---------- الطلب الذاتي ----------
  SV.kiosk = function (box) {
    const k = (B.acc.biz && B.acc.biz.kiosk) || {};
    const br = encodeURIComponent(B.branch || ''), pid = encodeURIComponent(B.acc.publicId || currentUserEmail);
    const url = publicBase() + 'kiosk.html?r=' + pid + (B.branch ? '&b=' + br : '');
    box.innerHTML = '<div class="sx-2"><div class="sx-card" id="kiF"><div class="sx-card-h"><h4><i class="fas fa-sliders"></i> ' + h(T('إعدادات شاشة الطلب الذاتي')) + '</h4>' + sw('enabled', 'تفعيل الشاشة', k.enabled) + '</div>' +
      '<div class="sx-fields">' + fld('welcome', 'رسالة الترحيب', k.welcome, { ph: 'أهلاً بك! اطلب وادفع من هنا', cls: 'sx-wide' }) + fld('idleSec', 'العودة للترحيب بعد خمول (ثانية)', k.idleSec != null ? k.idleSec : 90, { type: 'number' }) + '</div>' +
      '<div class="sx-grp"><div class="sx-grp-t">' + h(T('طرق الدفع')) + '</div><div class="sx-sws">' + sw('payCounter', 'الدفع عند الكاشير', k.payCounter !== false) + sw('payOnline', 'الدفع الإلكتروني (QR / رابط)', k.payOnline) +
      sw('payTerminal', 'البطاقة على جهاز الدفع المربوط', k.payTerminal) + sw('kitchenBeforePay', 'إرسال طلبات «الدفع عند الكاشير» للمطبخ قبل الدفع', k.kitchenBeforePay) + '</div></div>' +
      '<div class="sx-grp"><div class="sx-grp-t">' + h(T('خيارات الطلب')) + '</div><div class="sx-sws">' + sw('dineIn', 'محلي (داخل المطعم)', k.dineIn !== false) + sw('takeaway', 'سفري', k.takeaway !== false) +
      sw('askName', 'طلب اسم العميل لمناداته', k.askName) + sw('showCalories', 'إظهار السعرات ومسببات الحساسية', k.showCalories !== false) + '</div></div>' +
      '<div class="sx-foot"><button type="button" class="btn btn-primary btn-sm" id="kiSave"><i class="fas fa-check"></i> ' + h(T('حفظ')) + '</button></div></div>' +
      '<div class="sx-card">' + linkCard('رابط شاشة الطلب الذاتي', url, 'افتح الرابط على جهاز الكشك (تابلت أو شاشة لمس) وسجّل الدخول بحساب موظف بدور «شاشة طلب ذاتي» من «الموظفون والفروع»، ثم شغّل المتصفح بوضع ملء الشاشة.') +
      (B.acc.isOwner ? '<div class="sx-mini"><span><i class="fas fa-credit-card"></i> ' + h(T('الدفع الإلكتروني والبطاقة يحتاجان إعداد بوابة الدفع')) + '</span><button type="button" class="btn btn-outline btn-sm" data-go="pay">' + h(T('بوابة الدفع')) + '</button></div>' : '') + '</div></div>';
    box.querySelector('#kiSave').onclick = function () { const v = readK(box.querySelector('#kiF')); v.idleSec = Math.max(20, Math.min(600, parseInt(v.idleSec) || 90)); saveBiz('kiosk', Object.assign({}, k, v)); };
  };

  // ---------- بوابة الدفع ----------
  SV.pay = async function (box) {
    if (!B.acc.isOwner) { box.innerHTML = '<div class="sx-empty"><i class="fas fa-lock"></i><span>' + h(T('إعدادات بوابة الدفع متاحة لصاحب الحساب فقط')) + '</span></div>'; return; }
    const r = await bzOk('paySettingsGet', {}, { loading: false }); const s = r.settings;
    const provs = [['', '— بدون —'], ['stripe', 'Stripe (Checkout)'], ['moyasar', 'Moyasar (السعودية — مدى/Apple Pay)'], ['tap', 'Tap Payments (الخليج)'], ['iyzico', 'iyzico (تركيا)']]
      .concat(s.provider === 'simulate' || (r.available && r.available.provider === 'simulate') ? [['simulate', 'محاكاة (للاختبار فقط)']] : []);
    box.innerHTML = '<div class="sx-2"><div class="sx-card" id="pgF"><div class="sx-card-h"><h4><i class="fas fa-credit-card"></i> ' + h(T('بوابة الدفع الإلكتروني')) + '</h4>' +
      (r.available.online ? '<span class="sx-st on">' + h(T('الدفع الإلكتروني جاهز')) + '</span>' : '<span class="sx-st off">' + h(T('الدفع الإلكتروني غير مُعدّ')) + '</span>') + '</div>' +
      '<div class="sx-fields">' + fld('provider', 'البوابة', s.provider, { type: 'select', options: provs }) + fld('currency', 'رمز العملة (ISO)', s.currency, { ph: 'SAR / AED / TRY / USD', ltr: true, hint: 'اتركه فارغاً لاستخدام عملة المطعم' }) +
      fld('stripe_sk', 'Secret key (sk_live_… / sk_test_…)', s.stripe.sk, { ltr: true, cls: 'sx-wide', prov: 'stripe' }) +
      fld('moyasar_sk', 'Secret key', s.moyasar.sk, { ltr: true, cls: 'sx-wide', prov: 'moyasar' }) + fld('tap_sk', 'Secret key', s.tap.sk, { ltr: true, cls: 'sx-wide', prov: 'tap' }) +
      fld('iyzico_apiKey', 'API key', s.iyzico.apiKey, { ltr: true, prov: 'iyzico' }) + fld('iyzico_secret', 'Secret key', s.iyzico.secret, { ltr: true, prov: 'iyzico' }) +
      fld('iyzico_city', 'المدينة', s.iyzico.city || 'Istanbul', { prov: 'iyzico' }) + fld('iyzico_country', 'الدولة', s.iyzico.country || 'Turkey', { prov: 'iyzico' }) + '</div>' +
      '<div data-prov="iyzico" class="sx-sws" style="margin-top:6px">' + sw('iyzico_sandbox', 'وضع تجريبي (Sandbox)', s.iyzico.sandbox) + '</div>' +
      '<div class="sx-grp"><div class="sx-grp-t">' + h(T('جهاز الدفع بالبطاقة (Stripe Terminal)')) + (r.available.terminal ? ' <span class="sx-st on">' + h(T('جهاز البطاقة مربوط')) + '</span>' : '') + '</div><div class="sx-fields">' +
      fld('terminal_readerId', 'Reader ID (tmr_…)', s.terminal.readerId, { ltr: true }) + fld('terminal_sk', 'Secret key (اختياري إذا كان نفس مفتاح Stripe)', s.terminal.sk, { ltr: true }) + '</div></div>' +
      '<div class="sx-foot"><button type="button" class="btn btn-outline btn-sm" id="pgTest"><i class="fas fa-plug"></i> ' + h(T('اختبار الاتصال')) + '</button><button type="button" class="btn btn-primary btn-sm" id="pgSave"><i class="fas fa-lock"></i> ' + h(T('حفظ')) + '</button></div><div id="pgRes"></div></div>' +
      '<div class="sx-card"><div class="sx-card-h"><h4><i class="fas fa-shield-halved"></i> ' + h(T('كيف يعمل الدفع')) + '</h4></div><ul class="sx-ul">' +
      '<li>' + h(T('الدفع الإلكتروني: تظهر للعميل صفحة دفع آمنة من البوابة على الشاشة ورمز QR ليدفع من جواله (مدى، Apple Pay، فيزا...). يُؤكَّد الدفع من البوابة مباشرة ثم يُغلق الطلب ويُرسل للمطبخ تلقائياً.')) + '</li>' +
      '<li>' + h(T('جهاز البطاقة: يدعم أجهزة Stripe Terminal الذكية (مثل BBPOS WisePOS E و Stripe Reader S700) في الدول المتاح فيها Stripe. الأجهزة الأخرى مثل أجهزة البنوك المحلية (مدى/Geidea/Foodics Pay) تتطلب تكامل SDK من مزوّد الجهاز.')) + '</li>' +
      '<li>' + h(T('المفاتيح تُحفظ مشفّرة النقل على السيرفر ولا تظهر كاملة مرة أخرى، ولا تُضمَّن في النسخة الاحتياطية.')) + '</li>' +
      '<li>' + h(T('عنوان العودة بعد الدفع')) + ': <code dir="ltr">' + h(r.returnUrl) + '</code></li></ul></div></div>';
    const f = box.querySelector('#pgF');
    const showProv = function () { const v = f.querySelector('[data-k="provider"]').value; f.querySelectorAll('[data-prov]').forEach(function (x) { x.style.display = x.dataset.prov === v ? '' : 'none'; }); };
    f.querySelector('[data-k="provider"]').onchange = showProv; showProv();
    box.querySelector('#pgSave').onclick = async function () {
      const x = readK(f);
      await bzOk('paySettingsSave', { settings: { provider: x.provider, currency: x.currency, stripe: { sk: x.stripe_sk }, moyasar: { sk: x.moyasar_sk }, tap: { sk: x.tap_sk },
        iyzico: { apiKey: x.iyzico_apiKey, secret: x.iyzico_secret, sandbox: x.iyzico_sandbox, city: x.iyzico_city, country: x.iyzico_country }, terminal: { readerId: x.terminal_readerId, sk: x.terminal_sk } } });
      showToast('تم حفظ إعدادات الدفع'); SV.pay(box);
    };
    box.querySelector('#pgTest').onclick = async function () {
      const t = await bzOk('paySettingsTest', {});
      box.querySelector('#pgRes').innerHTML = (t.results || []).map(function (x) { return '<div class="sx-res ' + (x.ok ? 'ok' : 'bad') + '"><i class="fas fa-' + (x.ok ? 'check' : 'xmark') + '"></i> <b>' + h(x.name) + '</b> — ' + h(x.msg || '') + '</div>'; }).join('');
    };
  };

  // ---------- شاشة العميل ----------
  SV.cd = function (box) {
    const c = Object.assign({}, (B.acc.biz && B.acc.biz.cdisplay) || {});
    if (!c.code) c.code = String(Math.floor(100000 + Math.random() * 900000));
    const br = encodeURIComponent(B.branch || '');
    const same = here('customer-display.html');
    const remote = publicBase() + 'customer-display.html?e=' + encodeURIComponent(currentUserEmail) + '&code=' + encodeURIComponent(c.code) + (B.branch ? '&b=' + br : '');
    box.innerHTML = '<div class="sx-card" id="cdF"><div class="sx-card-h"><h4><i class="fas fa-display"></i> ' + h(T('إعدادات شاشة العميل')) + '</h4>' + sw('enabled', 'تفعيل شاشة العميل في الكاشير', c.enabled !== false) + '</div>' +
      '<div class="sx-fields">' + fld('welcome', 'رسالة الترحيب', c.welcome, { ph: 'أهلاً بك', cls: 'sx-wide' }) + fld('code', 'رمز الربط للجهاز المستقل', c.code, { ltr: true, max: 10 }) + '</div>' +
      '<div class="sx-sws" style="margin-top:8px">' + sw('showLogo', 'إظهار الشعار', c.showLogo !== false) + sw('remote', 'تشغيل على جهاز مستقل عبر الإنترنت', c.remote, 'إذا كانت الشاشة الثانية موصولة بنفس جهاز الكاشير لا تحتاج هذا الخيار') + '</div>' +
      '<div class="sx-foot"><button type="button" class="btn btn-primary btn-sm" id="cdSave"><i class="fas fa-check"></i> ' + h(T('حفظ')) + '</button></div></div>' +
      '<div class="sx-2"><div class="sx-card">' + linkCard('شاشة موصولة بجهاز الكاشير', same, 'اضغط زر «شاشة العميل» في الكاشير أو افتح الرابط على نفس الجهاز، اسحب النافذة إلى الشاشة الثانية واجعلها ملء الشاشة (F11) — تتحدث فوراً أثناء إدخال الطلب.') + '</div>' +
      '<div class="sx-card' + (c.remote ? '' : ' sx-dim') + '">' + linkCard('شاشة على جهاز مستقل (تابلت / تلفاز)', remote, c.remote ? 'افتح الرابط على الجهاز المواجه للعميل — يتحدث كل ثانيتين تقريباً.' : 'فعّل «تشغيل على جهاز مستقل» واحفظ لتفعيل هذا الرابط.') + '</div></div>';
    box.querySelector('#cdSave').onclick = function () {
      const v = readK(box.querySelector('#cdF'));
      if (v.remote && !/^\d{4,10}$/.test(v.code)) { showToast('رمز الربط يجب أن يكون من 4 إلى 10 أرقام', true); return; }
      saveBiz('cdisplay', Object.assign({}, c, v)).then(function () { SV.cd(box); });
    };
  };

  // ---------- التقارير ----------
  SV.rep = function (box) {
    const kOn = hasF('kitchen'), kiOn = hasF('kiosk');
    box.innerHTML = dateRangeBar('scR') + '<div class="sx-2 sx-2-top"><div class="sx-card"><div class="sx-card-h"><h4><i class="fas fa-layer-group"></i> ' + h(T('أداء أقسام المطبخ')) + '</h4>' + (kOn ? '' : lockChip('kitchen')) + '</div><div id="scK"></div></div>' +
      '<div class="sx-card"><div class="sx-card-h"><h4><i class="fas fa-tablet-screen-button"></i> ' + h(T('مبيعات الطلب الذاتي')) + '</h4>' + (kiOn ? '' : lockChip('kiosk')) + '</div><div id="scKi"></div></div></div>';
    const locked = function (f) { return '<div class="sx-empty"><i class="fas fa-lock"></i><span>' + h(T('متاح في باقة')) + ' ' + h(fcPlanByKey(PLAN_OF[f]).name) + '</span><button type="button" class="btn btn-primary btn-sm" data-up="' + PLAN_OF[f] + '"><i class="fas fa-crown"></i> ' + h(T('ترقية الباقة')) + '</button></div>'; };
    const load = async function (rg) {
      const kb = box.querySelector('#scK'), ib = box.querySelector('#scKi');
      if (!kOn) kb.innerHTML = locked('kitchen');
      else {
        kb.innerHTML = spin;
        const r = await bz('kdsReport', rg || {});
        kb.innerHTML = !r.success ? '<div class="sx-empty">' + h(r.error || '') + '</div>' : bTable([{ label: 'القسم', r: function (x) { return '<b>' + h(x.name) + '</b>'; } }, { label: 'الطلبات', num: true, r: function (x) { return nf(x.orders, 0); } }, { label: 'الكمية', num: true, r: function (x) { return nf(x.qty, 0); } },
          { label: 'متوسط الانتظار (د)', num: true, r: function (x) { return x.avgWait != null ? nf(x.avgWait, 1) : '—'; } }, { label: 'متوسط التحضير (د)', num: true, r: function (x) { return x.avgPrep != null ? nf(x.avgPrep, 1) : '—'; } },
          { label: 'متأخر', num: true, r: function (x) { return nf(x.late, 0) + ' (' + nf(x.latePct, 0) + '%)'; } }], r.stations, { empty: 'لا توجد طلبات في هذه الفترة' }) +
          (r.items && r.items.length ? '<h5 class="sx-h5">' + h(T('أكثر الأصناف تحضيراً')) + '</h5>' + bTable([{ label: 'القسم', r: function (x) { return h(x.station); } }, { label: 'الصنف', r: function (x) { return h(x.name); } }, { label: 'الكمية', num: true, r: function (x) { return nf(x.qty, 0); } }], r.items.slice(0, 15)) : '');
      }
      if (!kiOn) ib.innerHTML = locked('kiosk');
      else {
        ib.innerHTML = spin;
        const r = await bzOk('kioskReport', rg, { loading: false });
        const stN = { open: 'مفتوح', paid: 'مدفوع', cancelled: 'ملغى', refunded: 'مسترجع' }, psN = { pending: 'بانتظار الدفع', paid: 'مدفوع', failed: 'فشل', cancelled: 'ملغى', paid_unposted: 'مدفوع (يحتاج مراجعة)' };
        ib.innerHTML = kpis([['طلبات مدفوعة', nf(r.paidOrders, 0)], ['المبيعات', money(r.paidTotal)], ['متوسط الفاتورة', money(r.avgTicket)]]) +
          bTable([{ label: 'الحالة', r: function (x) { return h(T(stN[x.status] || x.status)); } }, { label: 'الطلبات', num: true, r: function (x) { return nf(x.orders, 0); } }, { label: 'الإجمالي', num: true, r: function (x) { return money(x.total); } }], r.byStatus, { empty: 'لا توجد طلبات من شاشة الطلب الذاتي' }) +
          '<h5 class="sx-h5">' + h(T('عمليات الدفع الإلكتروني')) + '</h5>' + bTable([{ label: 'البوابة', r: function (x) { return h(x.provider); } }, { label: 'الحالة', r: function (x) { return h(T(psN[x.status] || x.status)); } }, { label: 'العدد', num: true, r: function (x) { return nf(x.n, 0); } }, { label: 'المبلغ', num: true, r: function (x) { return money(x.amount); } }], r.payments, { empty: 'لا توجد عمليات دفع' });
      }
    };
    const get = bindRange(box, 'scR', load); load(get());
  };

  bizPage('screens', { group: 'screens', title: 'إدارة الشاشات', icon: 'display', perms: ['settings'],
    sub: 'كل شاشات المطعم في مكان واحد: المطبخ وأقسامه، حالة الطلبات، الطلب الذاتي وشاشة العميل — مع الروابط والإعدادات والتقارير.',
    render: async function (body) {
      const tabs = [['all', 'كل الشاشات', 'grip'], ['stations', 'أقسام المطبخ', 'layer-group', 'kitchen'], ['kiosk', 'الطلب الذاتي', 'tablet-screen-button', 'kiosk'], ['cd', 'شاشة العميل', 'display', 'customer_display']];
      if (B.acc.isOwner) tabs.push(['pay', 'بوابة الدفع', 'credit-card', 'kiosk']);
      tabs.push(['rep', 'التقارير', 'chart-column']);
      let cur = SCR.tab; const t0 = tabs.find(function (t) { return t[0] === cur; });
      if (!t0 || (t0[3] && !hasF(t0[3]))) cur = 'all';
      body.innerHTML = hubTabs('scT', tabs, cur) + '<div id="scB" class="sx"></div>';
      const box = body.querySelector('#scB');
      const go = function (k) {
        const t = tabs.find(function (x) { return x[0] === k; }); if (!t) return;
        if (t[3] && !hasF(t[3])) { bizUpgradeModal(PLAN_OF[t[3]] || 'pro'); return; }
        SCR.tab = k;
        body.querySelectorAll('#scT .sx-tab').forEach(function (x) { x.classList.toggle('active', x.dataset.sub === k); });
        box.innerHTML = spin; box.onclick = null;
        Promise.resolve(SV[k](box)).catch(function (e) { box.innerHTML = '<div class="sx-empty">' + h(e.message) + '</div>'; });
      };
      body.querySelector('#scT').onclick = function (e) { const b = e.target.closest('[data-sub]'); if (b) go(b.dataset.sub); };
      hubClicks(body, go);
      go(cur);
    } });

  // الطلب أونلاين والتطبيق — نُقل من «الموارد البشرية» إلى مجموعة «الطلب الإلكتروني والشاشات»
  if (B.pages.presence) {
    Object.assign(B.pages.presence, { group: 'screens', title: 'الطلب أونلاين والتطبيق', icon: 'mobile-screen-button',
      pitch: 'استقبال الطلبات من المينيو الإلكتروني مباشرة في الكاشير، QR لكل طاولة، وتطبيق خاص باسم نشاطك.',
      render: async function (body) {
        body.innerHTML = hubTabs('prSub', [['order', 'الطلب من المينيو', 'qrcode'], ['app', 'تطبيق باسم نشاطك', 'mobile-alt', 'brand_app']], 'order') + '<div id="prBody"></div>' +
          '<div class="sx-mini" style="margin-top:12px"><span><i class="fas fa-display"></i> ' + h(T('شاشات المطبخ وحالة الطلبات والطلب الذاتي وشاشة العميل في «إدارة الشاشات»')) + '</span><button type="button" class="btn btn-outline btn-sm" onclick="fcOpenScreens(\'all\')">' + h(T('إدارة الشاشات')) + '</button></div>';
        const el = body.querySelector('#prBody');
        body.querySelector('#prSub').onclick = function (e) {
          const b = e.target.closest('[data-sub]'); if (!b) return;
          if (b.classList.contains('locked')) { bizUpgradeModal(b.dataset.plan); return; }
          body.querySelectorAll('#prSub .sx-tab').forEach(function (x) { x.classList.toggle('active', x === b); });
          (b.dataset.sub === 'app' ? appView : orderingView)(el);
        };
        orderingView(el);
      } });
  }
  // روابط قديمة محفوظة → الصفحات الجديدة
  bizPage('kdsstations', { group: '_alias', title: 'أقسام المطبخ', icon: 'layer-group', perms: ['settings'], render: async function () { setTimeout(function () { fcOpenScreens('stations'); }, 0); } });
  bizPage('kiosk', { group: '_alias', title: 'الطلب الذاتي', icon: 'tablet-screen-button', perms: ['settings'], render: async function () { setTimeout(function () { fcOpenScreens('kiosk'); }, 0); } });

  // ============================================================
  // 5) أدوات المينيو داخل «المينيو الإلكتروني»: السعرات ومسببات الحساسية + تعديل الأسعار بنسبة
  // ============================================================
  const MT = { cur: 'main' };
  function menuToolsInit() {
    const tab = document.getElementById('tab5'); if (!tab || tab.querySelector('#dmTools')) return;
    const bar = document.createElement('div'); bar.id = 'dmTools'; bar.className = 'sx-tabs sx-tabs-menu';
    bar.innerHTML = [['main', 'الأصناف والإعدادات', 'utensils'], ['nutrition', 'السعرات ومسببات الحساسية', 'heart-pulse'], ['pricetools', 'تعديل الأسعار بنسبة', 'percent']].map(function (t) {
      return '<button type="button" class="sx-tab' + (t[0] === 'main' ? ' active' : '') + '" data-mt="' + t[0] + '"><i class="fas fa-' + t[2] + '"></i><span>' + h(T(t[1])) + '</span></button>';
    }).join('');
    const body = document.createElement('div'); body.id = 'dmToolsBody'; body.className = 'sx'; body.style.display = 'none';
    tab.insertBefore(body, tab.firstChild); tab.insertBefore(bar, body);
    bar.onclick = function (e) { const b = e.target.closest('[data-mt]'); if (b) menuToolShow(b.dataset.mt); };
    menuToolPerms();
  }
  function menuToolPerms() {
    const bar = document.getElementById('dmTools'); if (!bar || !B.acc) return;
    bar.querySelectorAll('[data-mt]').forEach(function (b) { const p = B.pages[b.dataset.mt]; b.style.display = !p || !p.perms || canP.apply(null, p.perms) ? '' : 'none'; });
  }
  async function menuToolShow(k) {
    menuToolsInit();
    const tab = document.getElementById('tab5'), bar = document.getElementById('dmTools'), body = document.getElementById('dmToolsBody'); if (!tab) return;
    MT.cur = k;
    bar.querySelectorAll('[data-mt]').forEach(function (b) { b.classList.toggle('active', b.dataset.mt === k); });
    Array.from(tab.children).forEach(function (c) {
      if (c === bar || c === body) return;
      if (k === 'main') { if (c.dataset.mtHide) { c.style.display = c.dataset.mtDisp || ''; delete c.dataset.mtHide; } }
      else if (!c.dataset.mtHide) { c.dataset.mtDisp = c.style.display; c.dataset.mtHide = '1'; c.style.display = 'none'; }
    });
    if (k === 'main') { body.style.display = 'none'; body.innerHTML = ''; return; }
    const p = B.pages[k]; if (!p) return;
    if (!B.acc) await loadAccount();
    body.style.display = 'block';
    body.innerHTML = '<p class="sx-sub">' + h(T(p.sub || '')) + '</p><div class="mt-body">' + spin + '</div>';
    try { await p.render(body.querySelector('.mt-body')); } catch (e) { body.querySelector('.mt-body').innerHTML = '<div class="sx-empty">' + h(e.message) + '</div>'; }
  }
  window.fcOpenMenuTool = function (k) { switchTab(5); setTimeout(function () { menuToolShow(k || 'main'); }, 30); };
  (function () {
    const sw0 = window.switchTab;
    window.switchTab = function (n) {
      if (n === 'nutrition' || n === 'pricetools') return window.fcOpenMenuTool(n);
      const r = sw0.apply(this, arguments);
      if (String(n) === '5') { try { menuToolsInit(); menuToolPerms(); } catch (e) { } }
      return r;
    };
  })();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', menuToolsInit); else menuToolsInit();

  // ============================================================
  // 6) شاشة العميل من الكاشير: بث محتوى السلة لحظياً
  //    v5.4.1: النافذة تُفتح من نفس عنوان الكاشير + رسائل مباشرة للنافذة (postMessage) + نبض دوري
  //    + طلب الحالة عند فتح الشاشة، ويعمل حتى لو اختلف الدومين (www / دومين خاص)
  // ============================================================
  const CD = { bc: ('BroadcastChannel' in window) ? new BroadcastChannel('fcCustDisplay') : null, last: '', t: null, pushAt: 0, win: null, hb: null };
  function cdOn() { return hasF('customer_display') && !(B.acc && B.acc.biz && B.acc.biz.cdisplay && B.acc.biz.cdisplay.enabled === false); }
  function cdBrand() {
    const biz = (B.acc && B.acc.biz) || {}, c = biz.cdisplay || {}, app = biz.app || {};
    return { name: app.name || (B.acc && B.acc.restaurantName) || '', color: app.color || '#b48554', logo: c.showLogo === false ? '' : (app.icon || (biz.business || {}).logo || ''), welcome: c.welcome || '', showLogo: c.showLogo !== false };
  }
  function cdState() {
    if (typeof POS === 'undefined' || !POS.o || !POS.boot) return { lines: [], status: 'idle', subtotal: 0, total: 0 };
    const o = POS.o, t = posTotals();
    const lines = o.items.filter(function (l) { return !(!l.productId && l.name === 'رسوم التوصيل'); }).map(function (l) {
      const unit = l.base + l.extras.reduce(function (a, e) { return a + e.price * e.qty; }, 0);
      return { name: l.name, variant: l.variant || '', qty: l.qty, total: Math.round(unit * l.qty * 100) / 100, extras: l.extras.map(function (e) { return e.name; }).join('، ') };
    });
    return { lines: lines, subtotal: t.sub, discount: t.disc, tax: t.tax, total: t.total, currency: typeof curName === 'function' ? curName() : '', status: lines.length ? 'ordering' : 'idle', number: o.number || null };
  }
  function cdSend(st, force) {
    if (!st || !cdOn()) return;
    st.brand = cdBrand();
    const key = JSON.stringify(st); if (key === CD.last && !force) return; CD.last = key;
    st.at = Date.now();
    const c = (B.acc.biz && B.acc.biz.cdisplay) || {};
    try { if (CD.bc) CD.bc.postMessage(st); } catch (e) { }
    try { if (CD.win && !CD.win.closed) CD.win.postMessage({ fcCd: 1, st: st }, '*'); } catch (e) { }
    try { localStorage.setItem('fcCustDisplayState', JSON.stringify(st)); localStorage.setItem('fcCustDisplayBrand', JSON.stringify(st.brand)); } catch (e) { }
    if (c.remote && c.code) {
      clearTimeout(CD.t);
      const wait = Math.max(0, 700 - (Date.now() - CD.pushAt));
      CD.t = setTimeout(function () { CD.pushAt = Date.now(); bz('custDisplayPush', { state: st }).catch(function () { }); }, wait);
    }
  }
  window.fcCustDisplaySend = cdSend;
  // الشاشة تطلب الحالة الحالية عند فتحها أو إعادة تحميلها
  const cdHello = function () { try { cdSend(cdState(), true); } catch (e) { } };
  if (CD.bc) CD.bc.addEventListener('message', function (e) { if (e.data && e.data.fcCdHello) cdHello(); });
  window.addEventListener('message', function (e) { if (e.data && e.data.fcCdHello) { if (e.source && !CD.win) CD.win = e.source; cdHello(); } });
  window.fcOpenCustomerDisplay = function () {
    const c = (B.acc.biz && B.acc.biz.cdisplay) || {};
    const url = here('customer-display.html') + (c.remote && c.code ? '?e=' + encodeURIComponent(currentUserEmail) + '&code=' + encodeURIComponent(c.code) + (B.branch ? '&b=' + encodeURIComponent(B.branch) : '') + '&local=1' : '');
    CD.win = window.open(url, 'fcCustDisplay', 'width=1024,height=700');
    if (!CD.win) { showToast(T('اسمح بالنوافذ المنبثقة لفتح شاشة العميل'), true); return; }
    CD.last = '';
    [500, 1200, 2500].forEach(function (ms) { setTimeout(cdHello, ms); });
    clearInterval(CD.hb);
    CD.hb = setInterval(function () { if (!CD.win || CD.win.closed) { clearInterval(CD.hb); CD.win = null; return; } cdHello(); }, 4000);
  };
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
          const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-outline btn-sm'; b.dataset.cd = '1'; b.title = T('افتح هذه الصفحة على الشاشة الثانية المواجهة للعميل');
          b.innerHTML = '<i class="fas fa-display"></i> ' + T('شاشة العميل');
          b.onclick = function (e) { e.stopPropagation(); window.fcOpenCustomerDisplay(); };
          const rl = bar.querySelector('[data-a="reload"]'); bar.insertBefore(b, rl || null);
        }
      } catch (e) { }
      return r;
    };
    posRender.__cd = true;
  }
  if (B.acc && typeof buildBizSidebar === 'function') buildBizSidebar();
})();
