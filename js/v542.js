// ============================================================
// Mataami Pro v5.4.2
// - أسماء المنتجات والأقسام بثلاث لغات (العربية / الإنجليزية / التركية) — لغة واحدة على الأقل
// - تهيئة البيانات (فورمات) بعد نسخة احتياطية إلزامية
// - بحث داخل القوائم المنسدلة الطويلة (اختر الطبق، المواد، ...)
// - نتائج بحث المواد في «مكونات الطبق» تظهر بجانب الحقل مباشرة بدون تمرير
// - ترتيب أصناف وأقسام المينيو بأزرار أعلى/أسفل (بالإضافة للسحب)
// - منع تكرار الأسماء في المينيو
// - حاسبة السعرات الحرارية (Atwater + Mifflin-St Jeor)
// ============================================================
(function () {
  'use strict';
  const esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  const nk = function (s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); };
  // توحيد الحروف العربية عند مقارنة الأسماء (أ/إ/آ، ى/ي، ة/ه، التشكيل)
  const arN = window.fcArN = function (s) { return nk(s).toLowerCase().replace(/[\u064B-\u0652\u0640]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه'); };
  const toast = function (m, bad) { if (typeof showToast === 'function') showToast(m, bad); };

  // ---------------- أسماء المستخدم بثلاث لغات ----------------
  async function loadNames() {
    if (typeof bz !== 'function' || !window.currentUserEmail && typeof currentUserEmail === 'undefined') return;
    try { const r = await bz('namesGet', {}, { silentPlan: true }); if (r && r.success && window.fcI18n) fcI18n.names(r.names || {}); } catch (e) { /* */ }
  }
  window.fcLoadNames = loadNames;
  window.fcSaveNames = async function (name, tr, oldName) {
    name = nk(name); if (!name) return;
    tr = tr || {}; const ar = nk(tr.ar), en = nk(tr.en), t = nk(tr.tr), src = tr.src === 'en' || tr.src === 'tr' ? tr.src : '';
    const prev = (window.FC_UN || {})[name] || {};
    const renamed = oldName && nk(oldName) !== name;
    const same = function (a, b) { return (a || '') === (b || '') || (a || '') === name && !b; };
    if (!renamed && same(prev.ar, ar) && same(prev.en, en) && same(prev.tr, t) && (prev.src || '') === src) return;
    const set = {}; set[name] = { ar: ar, en: en, tr: t, src: src };
    try {
      const r = await bz('namesSave', { set: set, rename: renamed ? { from: oldName, to: name } : undefined }, { silentPlan: true });
      if (r && r.success && window.fcI18n) fcI18n.names(r.names || {});
    } catch (e) { /* */ }
  };
  // v5.4.3: الاسم بثلاث خانات متساوية (عربي / English / Türkçe) — واحدة على الأقل، ولا توجد لغة إلزامية
  // الاسم الأساسي المخزّن = أول خانة غير فارغة (عربي ثم إنجليزي ثم تركي) ويُحفظ مصدره في src
  const NM_L = [['ar', 'العربية', 'rtl', 'الاسم بالعربية'], ['en', 'English', 'ltr', 'English name'], ['tr', 'Türkçe', 'ltr', 'Türkçe ad']];
  const fcNm = window.fcNm = {
    split: function (name) {
      name = nk(name); const e = (window.FC_UN || {})[name] || {}, o = { ar: e.ar || '', en: e.en || '', tr: e.tr || '' };
      const src = e.src || (/[\u0600-\u06FF]/.test(name) || !name ? 'ar' : (!e.en ? 'en' : 'tr'));
      if (name) o[src] = name; return o;
    },
    pick: function (v) {
      const o = { ar: nk(v.ar), en: nk(v.en), tr: nk(v.tr) };
      const src = o.ar ? 'ar' : o.en ? 'en' : o.tr ? 'tr' : '';
      return { name: src ? o[src] : '', src: src, tr: { ar: src === 'ar' ? '' : o.ar, en: src === 'en' ? '' : o.en, tr: src === 'tr' ? '' : o.tr, src: src === 'ar' ? '' : src } };
    },
    html: function (prefix, vals, opt) {
      vals = vals || {}; opt = opt || {};
      return '<div class="sx-nm' + (opt.inline ? ' sx-nm-in' : '') + '">' + (opt.label === false ? '' : '<div class="sx-nm-h"><i class="fas fa-language"></i> ' + esc(opt.label || 'الاسم') + ' <span class="req">*</span> <small>' + 'لغة واحدة على الأقل — بقية اللغات اختيارية' + '</small></div>') +
        '<div class="sx-nm-g">' + NM_L.map(function (l) { return '<label class="sx-f"><span>' + l[1] + '</span><input class="sx-in" data-i18n-skip dir="' + l[2] + '" id="' + prefix + l[0].toUpperCase() + '" value="' + esc(vals[l[0]] || '') + '" placeholder="' + l[3] + '"' + (opt.lock === l[0] ? ' readonly title="' + esc('الاسم الأساسي — يُعدّل من زر إعادة التسمية') + '"' : '') + '></label>'; }).join('') + '</div></div>';
    },
    read: function (prefix, root) { root = root || document; const g = function (l) { const e = root.querySelector('#' + prefix + l); return e ? e.value : ''; }; return { ar: g('AR'), en: g('EN'), tr: g('TR') }; }
  };
  // حقول اللغات (تُضاف لنوافذ تعديل الصنف/القسم)
  function langFields(prefix, cur) {
    cur = cur || {};
    return '<div class="sx-langs"><div class="sx-langs-h"><i class="fas fa-language"></i> ' + 'الاسم بلغات أخرى' + ' <small>' + 'يظهر للعميل حسب لغته في المينيو والتطبيق والطلب الذاتي — اتركه فارغاً لعرض الاسم الأساسي' + '</small></div>' +
      '<div class="sx-langs-g"><label class="sx-f"><span>English</span><input class="sx-in" dir="ltr" id="' + prefix + 'En" value="' + esc(cur.en || '') + '" placeholder="English name"></label>' +
      '<label class="sx-f"><span>Türkçe</span><input class="sx-in" dir="ltr" id="' + prefix + 'Tr" value="' + esc(cur.tr || '') + '" placeholder="Türkçe ad"></label></div></div>';
  }
  window.fcLangFields = langFields;
  window.fcCatLangs = function (name) {
    const v = fcNm.split(name), e0 = (window.FC_UN || {})[nk(name)] || {}, src = e0.src || (/[\u0600-\u06FF]/.test(name) ? 'ar' : (!e0.en ? 'en' : 'tr'));
    const m = bModal({ title: 'لغات القسم: ' + name, icon: 'language', print: false, body: fcNm.html('fcCl', v, { label: 'اسم القسم', lock: src }),
      foot: '<button class="btn btn-cancel" data-x>إلغاء</button><button class="btn btn-primary" data-act="ok"><i class="fas fa-check"></i> حفظ</button>',
      actions: { ok: async function (mm) { const r = fcNm.read('fcCl', mm.el); const tr = { ar: r.ar, en: r.en, tr: r.tr, src: src === 'ar' ? '' : src }; tr[src] = ''; await fcSaveNames(name, tr); toast('تم حفظ أسماء القسم'); mm.close(); if (typeof renderCategoryChips === 'function') renderCategoryChips(); } } });
    return m;
  };

  // ---------------- المينيو الإلكتروني: لغات + منع التكرار + ترتيب بالأزرار ----------------
  function dmHook() {
    if (typeof saveMenuItemFromModal !== 'function' || window.__fc542dm) return;
    window.__fc542dm = 1;
    const ensureFields = function () {
      const nameEl = document.getElementById('dmItemName'); if (!nameEl) return;
      if (document.getElementById('dmLangBox')) return;
      const grid = nameEl.closest('.pro-grid-2'); if (!grid) return;
      const cell = nameEl.closest('.pro-grid-2 > div'); if (cell) { cell.style.display = 'none'; }
      const box = document.createElement('div'); box.id = 'dmLangBox'; box.style.marginBottom = '12px';
      box.innerHTML = fcNm.html('dmNm', {}, { label: 'اسم الصنف' });
      grid.before(box);
    };
    const fill = function () {
      ensureFields();
      const n = nk((document.getElementById('dmItemName') || {}).value || '');
      const v = fcNm.split(n);
      ['AR', 'EN', 'TR'].forEach(function (L) { const e = document.getElementById('dmNm' + L); if (e) e.value = v[L.toLowerCase()] || ''; });
      window.__dmOldName = n;
    };
    const oAdd = window.openAddMenuItemModal, oEdit = window.editMenuItem, oSave = window.saveMenuItemFromModal, oRec = window.onRecipeSelectChange;
    if (oAdd) window.openAddMenuItemModal = openAddMenuItemModal = function () { const r = oAdd.apply(this, arguments); fill(); return r; };
    if (oEdit) window.editMenuItem = editMenuItem = function () { const r = oEdit.apply(this, arguments); fill(); return r; };
    if (oRec) window.onRecipeSelectChange = onRecipeSelectChange = function () {
      const pk = fcNm.pick(fcNm.read('dmNm')), ne = document.getElementById('dmItemName'); if (ne) ne.value = pk.name;
      const r = oRec.apply(this, arguments); if (ne && !pk.name && ne.value) { const v = fcNm.split(ne.value); ['AR', 'EN', 'TR'].forEach(function (L) { const e = document.getElementById('dmNm' + L); if (e) e.value = v[L.toLowerCase()] || ''; }); } return r;
    };
    window.saveMenuItemFromModal = saveMenuItemFromModal = async function () {
      const nameEl = document.getElementById('dmItemName');
      const pk = fcNm.pick(fcNm.read('dmNm'));
      if (document.getElementById('dmNmAR') && !pk.name) { toast('اكتب اسم الصنف بلغة واحدة على الأقل (عربي أو English أو Türkçe)', true); const a = document.getElementById('dmNmAR'); if (a) a.focus(); return; }
      const name = document.getElementById('dmNmAR') ? pk.name : nk(nameEl ? nameEl.value : ''); if (nameEl) nameEl.value = name;
      const eid = typeof editingMenuItemId !== 'undefined' ? editingMenuItemId : null;
      if (name && Array.isArray(window.digitalMenuItems || digitalMenuItems) && digitalMenuItems.some(function (x) { return x && x.id !== eid && arN(x.name) === arN(name); })) {
        toast('الاسم «' + name + '» مستخدم مسبقاً لصنف آخر في المينيو — لا يمكن تكرار نفس الاسم', true); return;
      }
      const old = window.__dmOldName;
      await oSave.apply(this, arguments);
      if (digitalMenuItems.some(function (x) { return x && nk(x.name) === name; })) await fcSaveNames(name, pk.tr, old);
    };
    // منع تكرار القسم بدون اعتبار حالة الأحرف والمسافات
    const oAddCat = window.addDigitalCategory;
    // v5.4.3: إضافة قسم بثلاث خانات (عربي / English / Türkçe) — واحدة على الأقل
    const catBox = function () {
      const input = document.getElementById('dmNewCategory'); if (!input || document.getElementById('dmCatNm')) return;
      const row = input.parentNode; input.type = 'hidden';
      const box = document.createElement('div'); box.id = 'dmCatNm'; box.className = 'sx-nm-row';
      box.innerHTML = fcNm.html('dmCn', {}, { label: false, inline: true });
      row.insertBefore(box, input); row.classList.add('dm-cat-add');
      box.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); addDigitalCategory(); } });
    };
    catBox();
    if (oAddCat) window.addDigitalCategory = addDigitalCategory = async function () {
      catBox();
      const input = document.getElementById('dmNewCategory');
      const hasBox = !!document.getElementById('dmCnAR'), pk = fcNm.pick(fcNm.read('dmCn'));
      if (hasBox && !pk.name) { toast('اكتب اسم القسم بلغة واحدة على الأقل (عربي أو English أو Türkçe)', true); document.getElementById('dmCnAR').focus(); return; }
      const name = hasBox ? pk.name : nk(input && input.value);
      if (name && digitalMenuCategories.some(function (c) { return arN(c) === arN(name); })) { toast('القسم «' + name + '» موجود مسبقاً — لا يمكن تكرار نفس الاسم', true); return; }
      if (input) input.value = name;
      const r = await oAddCat.apply(this, arguments);
      if (hasBox && digitalMenuCategories.indexOf(name) >= 0) { ['AR', 'EN', 'TR'].forEach(function (L) { const e = document.getElementById('dmCn' + L); if (e) e.value = ''; }); await fcSaveNames(name, pk.tr); if (typeof renderCategoryChips === 'function') renderCategoryChips(); }
      return r;
    };
    // ترتيب الصنف داخل قسمه بالأزرار
    window.moveMenuItem = moveMenuItem = async function (id, dir) {
      if (typeof dmLayoutChange !== 'function') return;
      const it = digitalMenuItems.find(function (x) { return x.id === id; }); if (!it) return;
      const cat = it.category || 'أخرى';
      const same = digitalMenuItems.filter(function (x) { return (x.category || 'أخرى') === cat; });
      const i = same.indexOf(it), j = i + dir; if (j < 0 || j >= same.length) return;
      const other = same[j];
      await dmLayoutChange(function () {
        const a = digitalMenuItems.indexOf(it), b = digitalMenuItems.indexOf(other);
        digitalMenuItems[a] = other; digitalMenuItems[b] = it;
      });
    };
    window.fcMoveCat = async function (name, dir) {
      if (typeof dmLayoutChange !== 'function') return;
      const list = digitalMenuCategories.filter(function (c) { return c && c !== 'الكل'; });
      const i = list.indexOf(name), j = i + dir; if (i < 0 || j < 0 || j >= list.length) return;
      await dmLayoutChange(function () {
        const a = digitalMenuCategories.indexOf(list[i]), b = digitalMenuCategories.indexOf(list[j]);
        const t = digitalMenuCategories[a]; digitalMenuCategories[a] = digitalMenuCategories[b]; digitalMenuCategories[b] = t;
      });
    };
    // إضافة أزرار أعلى/أسفل + اللغات لصفوف الأقسام، وإظهار أزرار ترتيب الأصناف دائماً
    const oChips = window.renderCategoryChips;
    if (oChips) window.renderCategoryChips = renderCategoryChips = function () {
      oChips.apply(this, arguments); catBox();
      const box = document.getElementById('dmCatChips'); if (!box) return;
      const rows = Array.from(box.querySelectorAll('.dm-cat-row'));
      rows.forEach(function (row, idx) {
        const name = row.dataset.cat; if (!name || row.querySelector('.dm-ord')) return;
        const tr = (window.FC_UN || {})[nk(name)] || {};
        const ord = document.createElement('span'); ord.className = 'dm-ord';
        ord.innerHTML = '<button type="button" class="btn btn-sm btn-outline" title="أعلى"' + (idx === 0 ? ' disabled' : '') + '><i class="fas fa-chevron-up"></i></button>' +
          '<button type="button" class="btn btn-sm btn-outline" title="أسفل"' + (idx === rows.length - 1 ? ' disabled' : '') + '><i class="fas fa-chevron-down"></i></button>';
        ord.children[0].onclick = function () { fcMoveCat(name, -1); }; ord.children[1].onclick = function () { fcMoveCat(name, 1); };
        const grip = row.querySelector('.dm-grip'); if (grip) grip.after(ord); else row.prepend(ord);
        const lb = document.createElement('button'); lb.type = 'button'; lb.className = 'btn btn-sm btn-outline'; lb.innerHTML = '<i class="fas fa-language"></i>'; lb.title = 'الاسم بلغات أخرى';
        lb.onclick = function () { fcCatLangs(name); };
        const nm = row.querySelector('.dm-cat-name'); if (nm) { nm.setAttribute('data-i18n-skip', ''); if (tr.en || tr.tr) { const s = document.createElement('small'); s.className = 'dm-cat-tr'; s.setAttribute('data-i18n-skip', ''); s.textContent = [tr.en, tr.tr].filter(Boolean).join(' · '); nm.append(s); } }
        const del = row.querySelector('.btn:last-child'); if (del) del.before(lb); else row.append(lb);
      });
    };
  }

  // ---------------- تهيئة البيانات (فورمات) ----------------
  window.fcFactoryReset = function () {
    if (typeof bModal !== 'function') return;
    const step = { backup: false };
    const m = bModal({ title: 'تهيئة جميع البيانات (فورمات)', icon: 'triangle-exclamation', print: false,
      sub: 'إجراء خطير لا يمكن التراجع عنه من داخل البرنامج',
      body: '<div class="sx-warn"><i class="fas fa-triangle-exclamation"></i><div><b>تحذير: سيتم حذف جميع البيانات المدخلة نهائياً</b>' +
        '<span>المواد الأولية، الأطباق والوصفات، المنتجات، المبيعات والطلبات والفواتير، المخزون والمشتريات، العملاء والولاء، المصروفات والقيود المحاسبية، التقييمات، والمينيو الإلكتروني.</span></div></div>' +
        '<div class="sx-steps">' +
        '<div class="sx-step" id="frS1"><span class="sx-step-n">1</span><div class="sx-step-b"><b>نسخة احتياطية إلزامية</b><small>يجب تنزيل نسخة احتياطية كاملة على جهازك قبل التهيئة</small></div><button type="button" class="btn btn-primary btn-sm" data-act="bk"><i class="fas fa-download"></i> تنزيل النسخة</button></div>' +
        '<div class="sx-step" id="frS2"><span class="sx-step-n">2</span><div class="sx-step-b"><b>ما الذي يبقى؟</b><div class="sx-sws" style="margin-top:6px">' +
        '<label class="sx-sw"><input type="checkbox" id="frStaff" checked><span class="sx-sw-t"></span> الإبقاء على الموظفين وصلاحياتهم</label>' +
        '<label class="sx-sw"><input type="checkbox" id="frSet" checked><span class="sx-sw-t"></span> الإبقاء على إعدادات النشاط والفوترة</label></div></div></div>' +
        '<div class="sx-step" id="frS3"><span class="sx-step-n">3</span><div class="sx-step-b"><b>تأكيد نهائي</b><small>اكتب كلمة FORMAT بالأحرف الإنجليزية الكبيرة للتأكيد</small><input class="sx-in" id="frTxt" dir="ltr" autocomplete="off" placeholder="FORMAT" style="margin-top:6px;max-width:220px"></div></div>' +
        '</div><p class="sx-note"><i class="fas fa-shield-halved"></i> يحتفظ النظام أيضاً بلقطة استعادة تلقائية على السيرفر قبل التهيئة، ويمكنك استعادة النسخة التي نزّلتها في أي وقت من زر «استعادة».</p>',
      foot: '<button class="btn btn-cancel" data-x>إلغاء</button><button class="btn btn-danger" data-act="go" id="frGo" disabled><i class="fas fa-eraser"></i> تهيئة البيانات الآن</button>',
      actions: {
        bk: async function (mm) {
          const ok = typeof backupData === 'function' ? await backupData() : false;
          if (ok === false) { toast('لم تكتمل النسخة الاحتياطية — لا يمكن المتابعة بدونها', true); return; }
          step.backup = true; mm.$('#frS1').classList.add('done'); mm.$('#frS1 .btn').innerHTML = '<i class="fas fa-check"></i> تم التنزيل'; upd(mm);
        },
        go: async function (mm) {
          if (!step.backup) { toast('نزّل النسخة الاحتياطية أولاً', true); return; }
          if (mm.$('#frTxt').value.trim() !== 'FORMAT') { toast('اكتب FORMAT للتأكيد', true); return; }
          if (!window.confirm('آخر تأكيد: سيتم حذف جميع البيانات المدخلة. هل أنت متأكد؟')) return;
          try {
            if (typeof showLoading === 'function') showLoading();
            const r = await FOODCOST_R5.rpc('r5FactoryReset', { confirm: 'FORMAT', backupTaken: 1, keepStaff: mm.$('#frStaff').checked ? 1 : 0, keepSettings: mm.$('#frSet').checked ? 1 : 0 });
            if (r && r.success === false) throw new Error(r.error || 'فشلت التهيئة');
            toast('تمت تهيئة البيانات بنجاح — سيتم إعادة تحميل البرنامج');
            try { localStorage.removeItem('fcDirty'); } catch (e) { /* */ }
            setTimeout(function () { location.reload(); }, 1400);
          } catch (e) { toast(e.message || 'فشلت التهيئة', true); }
          finally { if (typeof hideLoading === 'function') hideLoading(); }
        }
      } });
    const upd = function (mm) { mm.$('#frGo').disabled = !(step.backup && mm.$('#frTxt').value.trim() === 'FORMAT'); };
    m.$('#frTxt').addEventListener('input', function () { upd(m); });
  };

  // ---------------- بحث داخل القوائم المنسدلة ----------------
  // يحوّل أي قائمة فيها 8 خيارات أو أكثر (داخل النوافذ والصفحات) إلى قائمة قابلة للبحث، مع إبقاء العنصر الأصلي متزامناً
  const MIN = 8;
  function eligible(sel) {
    if (!sel || sel.tagName !== 'SELECT' || sel.multiple || sel.__fcSS || sel.hasAttribute('data-nosearch')) return false;
    if (sel.closest('td, .pos-wrap, .rpt-btns, .lang-pick, #fcSS, .biz-filter label, .dm-cat-row')) return false;
    if (sel.id === 'settingsBackupMode' || sel.id === 'bizBranchSel') return false;
    return sel.options.length >= MIN || sel.hasAttribute('data-search');
  }
  let pop = null, popFor = null;
  function closePop() { if (pop) { pop.remove(); pop = null; } if (popFor) { popFor.__fcBtn.classList.remove('open'); popFor = null; } }
  function labelOf(sel) { const o = sel.options[sel.selectedIndex]; return o ? o.text : ''; }
  function sync(sel) { if (sel.__fcBtn) { sel.__fcBtn.querySelector('span').textContent = labelOf(sel) || '—'; sel.__fcBtn.disabled = sel.disabled; } }
  function place(btn, p) {
    const r = btn.getBoundingClientRect(), vh = window.innerHeight, vw = window.innerWidth;
    const below = vh - r.bottom - 8, above = r.top - 8;
    const h = Math.min(320, Math.max(below, above));
    p.style.width = Math.max(r.width, 240) + 'px';
    p.style.left = Math.max(6, Math.min(r.left, vw - Math.max(r.width, 240) - 6)) + 'px';
    p.querySelector('.fc-ss-list').style.maxHeight = (h - 52) + 'px';
    if (below >= 220 || below >= above) { p.style.top = (r.bottom + 4) + 'px'; p.style.bottom = ''; }
    else { p.style.top = ''; p.style.bottom = (vh - r.top + 4) + 'px'; }
  }
  function openPop(sel) {
    closePop();
    const btn = sel.__fcBtn; popFor = sel; btn.classList.add('open');
    pop = document.createElement('div'); pop.className = 'fc-ss-pop'; pop.id = 'fcSS';
    pop.innerHTML = '<div class="fc-ss-q"><i class="fas fa-search"></i><input type="search" autocomplete="off" placeholder="بحث..."></div><div class="fc-ss-list"></div>';
    document.body.appendChild(pop);
    const q = pop.querySelector('input'), list = pop.querySelector('.fc-ss-list');
    let act = -1, vis = [];
    const draw = function () {
      const t = q.value.trim().toLowerCase();
      vis = Array.from(sel.options).map(function (o, i) { return { o: o, i: i }; }).filter(function (x) { return !x.o.hidden && (!t || x.o.text.toLowerCase().indexOf(t) >= 0); });
      list.innerHTML = vis.length ? vis.map(function (x, k) { return '<div class="fc-ss-o' + (x.i === sel.selectedIndex ? ' sel' : '') + (x.o.disabled ? ' dis' : '') + '" data-k="' + k + '">' + esc(x.o.text) + '</div>'; }).join('') : '<div class="fc-ss-none">لا توجد نتائج</div>';
      act = -1;
    };
    const pick = function (k) {
      const x = vis[k]; if (!x || x.o.disabled) return;
      sel.selectedIndex = x.i; sync(sel); closePop();
      sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true }));
      btn.focus();
    };
    const hi = function () { list.querySelectorAll('.fc-ss-o').forEach(function (el, k) { el.classList.toggle('act', k === act); if (k === act) el.scrollIntoView({ block: 'nearest' }); }); };
    q.addEventListener('input', draw);
    q.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); act = Math.min(vis.length - 1, act + 1); hi(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); act = Math.max(0, act - 1); hi(); }
      else if (e.key === 'Enter') { e.preventDefault(); pick(act >= 0 ? act : (vis.length === 1 ? 0 : -1)); }
      else if (e.key === 'Escape') { e.preventDefault(); closePop(); btn.focus(); }
    });
    list.addEventListener('mousedown', function (e) { e.preventDefault(); });
    list.addEventListener('click', function (e) { const o = e.target.closest('[data-k]'); if (o) pick(+o.dataset.k); });
    draw(); place(btn, pop);
    const s = list.querySelector('.sel'); if (s) s.scrollIntoView({ block: 'center' });
    setTimeout(function () { q.focus(); }, 0);
  }
  function enhance(sel) {
    if (!eligible(sel)) return;
    sel.__fcSS = true;
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'fc-ss-btn';
    btn.innerHTML = '<span></span><i class="fas fa-magnifying-glass"></i>';
    sel.__fcBtn = btn; sel.classList.add('fc-ss-src'); sel.after(btn); sync(sel);
    btn.addEventListener('click', function (e) { e.preventDefault(); if (popFor === sel) closePop(); else openPop(sel); });
    btn.addEventListener('keydown', function (e) { if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPop(sel); } });
    sel.addEventListener('change', function () { sync(sel); });
    new MutationObserver(function () { sync(sel); }).observe(sel, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled'] });
    // مزامنة عند تعيين القيمة برمجياً
    const d = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
    const di = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'selectedIndex');
    try {
      Object.defineProperty(sel, 'value', { configurable: true, get: function () { return d.get.call(this); }, set: function (v) { d.set.call(this, v); sync(this); } });
      Object.defineProperty(sel, 'selectedIndex', { configurable: true, get: function () { return di.get.call(this); }, set: function (v) { di.set.call(this, v); sync(this); } });
    } catch (e) { /* */ }
  }
  window.fcSearchSelect = enhance;
  function scan(root) { (root.querySelectorAll ? root.querySelectorAll('select') : []).forEach(enhance); if (root.tagName === 'SELECT') enhance(root); }
  let qd = false; const pending = new Set();
  new MutationObserver(function (ls) {
    ls.forEach(function (l) { l.addedNodes.forEach(function (n) { if (n.nodeType === 1) pending.add(n); }); if (l.target && l.target.tagName === 'SELECT') pending.add(l.target); });
    if (!qd) { qd = true; requestAnimationFrame(function () { qd = false; if (popFor && !popFor.isConnected) closePop(); pending.forEach(function (n) { if (n.isConnected) scan(n); }); pending.clear(); }); }
  }).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('mousedown', function (e) { if (pop && !pop.contains(e.target) && !(popFor && popFor.__fcBtn.contains(e.target))) closePop(); }, true);
  window.addEventListener('resize', closePop);
  document.addEventListener('scroll', function (e) { if (pop && !pop.contains(e.target)) closePop(); }, true);

  // ---------------- مكونات الطبق: نتائج البحث بجانب الحقل ----------------
  function ingHook() {
    if (typeof filterIngredients !== 'function' || window.__fc542ing) return;
    window.__fc542ing = 1;
    const o = window.filterIngredients;
    window.filterIngredients = filterIngredients = function () {
      const r = o.apply(this, arguments);
      const inp = document.getElementById('ingredientSearch'), opts = document.getElementById('ingredientOptions');
      if (opts && opts.parentNode !== document.body) { document.body.appendChild(opts); opts.classList.add('fc-ing-pop'); }
      if (inp && opts && opts.style.display !== 'none') {
        const rc = inp.getBoundingClientRect(), vh = window.innerHeight;
        const below = vh - rc.bottom - 10, above = rc.top - 10, up = below < 200 && above > below;
        opts.classList.add('fc-ing-pop');
        opts.style.position = 'fixed'; opts.style.left = rc.left + 'px'; opts.style.width = rc.width + 'px';
        opts.style.maxHeight = Math.min(280, up ? above : below) + 'px';
        if (up) { opts.style.top = ''; opts.style.bottom = (vh - rc.top + 4) + 'px'; } else { opts.style.bottom = ''; opts.style.top = (rc.bottom + 4) + 'px'; }
      }
      return r;
    };
    const mb = document.querySelector('#ingredientsModal .modal-body-pro');
    if (mb) mb.addEventListener('scroll', function () { const opts = document.getElementById('ingredientOptions'); if (opts && opts.style.display !== 'none') filterIngredients(); });
  }

  // ---------------- حاسبة السعرات الحرارية ----------------
  const ACT = [[1.2, 'خامل (عمل مكتبي بدون رياضة)'], [1.375, 'نشاط خفيف (رياضة 1-3 أيام أسبوعياً)'], [1.55, 'نشاط متوسط (رياضة 3-5 أيام)'], [1.725, 'نشاط عالٍ (رياضة 6-7 أيام)'], [1.9, 'نشاط عالٍ جداً (عمل بدني أو تمرين مرتين يومياً)']];
  window.fcCalorieCalc = function (tab) {
    if (typeof bModal !== 'function') return;
    const N = window.FC_NUTRI;
    const refs = N && N.DB ? Object.values(N.DB).map(function (r) { return r; }).sort(function (a, b) { return String(a.names[0]).localeCompare(String(b.names[0]), 'ar'); }) : [];
    const refOpts = '<option value="">— اختر مادة من القاعدة المرجعية —</option>' + refs.map(function (r) { return '<option value="' + esc(r.key) + '">' + esc(r.names[0]) + (r.names[1] ? ' · ' + esc(r.names[1]) : '') + ' — ' + r.kcal + ' kcal/100g</option>'; }).join('');
    const nf0 = function (v, d) { return (Math.round((+v || 0) * Math.pow(10, d || 0)) / Math.pow(10, d || 0)).toLocaleString('en-US'); };
    const m = bModal({ title: 'حاسبة السعرات الحرارية', icon: 'calculator', wide: true, print: false,
      sub: 'وفق المعايير العالمية المعتمدة: معاملات Atwater للطاقة ومعادلة Mifflin-St Jeor للاحتياج اليومي',
      body: '<div class="sx-tabs" id="ccTabs"><button type="button" class="sx-tab active" data-t="food"><i class="fas fa-utensils"></i> سعرات وجبة أو طبق</button><button type="button" class="sx-tab" data-t="need"><i class="fas fa-person-running"></i> الاحتياج اليومي</button><button type="button" class="sx-tab" data-t="how"><i class="fas fa-circle-question"></i> طريقة الحساب المعتمدة</button></div>' +
        // 1) الوجبة
        '<div data-p="food"><div class="sx-card"><div class="sx-card-h"><h4><i class="fas fa-scale-balanced"></i> من المغذيات الكبرى (غرام)</h4><span class="sx-hint">أدخل الكميات بالغرام كما في ملصق القيمة الغذائية</span></div>' +
        '<div class="sx-fields"><label class="sx-f"><span>بروتين (4 kcal/g)</span><input class="sx-in cc-m" type="number" min="0" step="0.1" id="ccP" placeholder="0"></label>' +
        '<label class="sx-f"><span>كربوهيدرات (4 kcal/g)</span><input class="sx-in cc-m" type="number" min="0" step="0.1" id="ccC" placeholder="0"></label>' +
        '<label class="sx-f"><span>دهون (9 kcal/g)</span><input class="sx-in cc-m" type="number" min="0" step="0.1" id="ccF" placeholder="0"></label>' +
        '<label class="sx-f"><span>ألياف (2 kcal/g) — اختياري</span><input class="sx-in cc-m" type="number" min="0" step="0.1" id="ccFi" placeholder="0"></label>' +
        '<label class="sx-f"><span>كحول السكر/البوليول (2.4 kcal/g) — اختياري</span><input class="sx-in cc-m" type="number" min="0" step="0.1" id="ccPo" placeholder="0"></label></div>' +
        '<div class="cc-res" id="ccRes1"></div></div>' +
        '<div class="sx-card"><div class="sx-card-h"><h4><i class="fas fa-list"></i> من المكونات (القاعدة المرجعية USDA)</h4><span class="sx-hint">أضف المكونات بالغرام لحساب سعرات الطبق كاملاً ولكل حصة</span></div>' +
        '<div class="cc-add"><select class="sx-in" id="ccRef" data-search>' + refOpts + '</select><input class="sx-in" type="number" min="0" step="1" id="ccG" placeholder="الوزن بالغرام" style="max-width:140px"><button type="button" class="btn btn-primary btn-sm" data-act="add"><i class="fas fa-plus"></i> إضافة</button></div>' +
        '<div id="ccLines"></div><div class="sx-f sx-f-row" style="margin-top:8px"><span>عدد الحصص</span><input class="sx-in sx-in-sm" type="number" min="1" step="1" id="ccServ" value="1" style="max-width:90px"></div><div class="cc-res" id="ccRes2"></div></div></div>' +
        // 2) الاحتياج
        '<div data-p="need" hidden><div class="sx-card"><div class="sx-fields">' +
        '<label class="sx-f"><span>الجنس</span><select class="sx-in" id="ccSex"><option value="m">ذكر</option><option value="f">أنثى</option></select></label>' +
        '<label class="sx-f"><span>العمر (سنة)</span><input class="sx-in cc-n" type="number" min="10" max="100" id="ccAge" value="30"></label>' +
        '<label class="sx-f"><span>الوزن (كغ)</span><input class="sx-in cc-n" type="number" min="20" max="300" step="0.1" id="ccW" value="75"></label>' +
        '<label class="sx-f"><span>الطول (سم)</span><input class="sx-in cc-n" type="number" min="100" max="250" id="ccH" value="175"></label>' +
        '<label class="sx-f sx-wide"><span>مستوى النشاط</span><select class="sx-in" id="ccAct">' + ACT.map(function (a, i) { return '<option value="' + a[0] + '"' + (i === 1 ? ' selected' : '') + '>' + a[1] + ' — × ' + a[0] + '</option>'; }).join('') + '</select></label>' +
        '<label class="sx-f sx-wide"><span>الهدف</span><select class="sx-in" id="ccGoal"><option value="0">المحافظة على الوزن</option><option value="-500">إنقاص الوزن (عجز 500 سعرة ≈ 0.5 كغ أسبوعياً)</option><option value="-250">إنقاص تدريجي (عجز 250 سعرة)</option><option value="300">زيادة الوزن / بناء العضل (+300 سعرة)</option></select></label>' +
        '</div><div class="cc-res" id="ccRes3"></div></div></div>' +
        // 3) الطريقة
        '<div data-p="how" hidden><div class="sx-card cc-how">' +
        '<h4><i class="fas fa-flask"></i> كيف يحسب البرنامج سعرات الأطباق؟</h4>' +
        '<ol><li><b>تحويل الكمية إلى غرام:</b> كل مكوّن في وصفة الطبق يُحوّل إلى غرام حسب وحدته (كغ، لتر مع كثافة المادة، قطعة بوزنها المتوسط).</li>' +
        '<li><b>القيم المرجعية لكل 100 غرام:</b> تُطابق المادة مع قاعدة مرجعية مبنية على متوسطات <b>USDA FoodData Central</b> (وزارة الزراعة الأمريكية) وجداول تركيب الأغذية الأوروبية، ويمكنك تعديل قيم أي مادة يدوياً.</li>' +
        '<li><b>معاملات Atwater العامة (المعيار الدولي المعتمد من FAO/WHO والمستخدم في ملصقات الغذاء):</b> البروتين 4 سعرات/غ، الكربوهيدرات 4 سعرات/غ، الدهون 9 سعرات/غ، الألياف 2 سعرة/غ، الكحول 7 سعرات/غ.</li>' +
        '<li><b>المعادلة:</b> سعرات المكوّن = (الوزن بالغرام ÷ 100) × سعرات 100 غرام، وإن لم تتوفر قيمة السعرات تُحسب = بروتين×4 + كربوهيدرات×4 + دهون×9.</li>' +
        '<li><b>سعرات الطبق</b> = مجموع سعرات مكوناته للحصة الواحدة، وتظهر في المينيو الإلكتروني وشاشة الطلب الذاتي والكاشير. 1 سعرة حرارية (kcal) = 4.184 كيلوجول (kJ).</li></ol>' +
        '<h4><i class="fas fa-person"></i> الاحتياج اليومي — معادلة Mifflin-St Jeor (الأدق حسب الجمعية الأمريكية للتغذية)</h4>' +
        '<ul class="sx-ul"><li>الرجال: BMR = 10 × الوزن (كغ) + 6.25 × الطول (سم) − 5 × العمر + 5</li><li>النساء: BMR = 10 × الوزن (كغ) + 6.25 × الطول (سم) − 5 × العمر − 161</li>' +
        '<li>الاحتياج اليومي TDEE = BMR × معامل النشاط (1.2 إلى 1.9)</li><li>المرجع العام لملصقات الغذاء: 2000 سعرة حرارية يومياً للبالغ.</li></ul>' +
        '<p class="sx-note"><i class="fas fa-circle-info"></i> القيم تقديرية للاسترشاد ولا تغني عن تحليل مخبري أو استشارة أخصائي تغذية.</p></div></div>',
      actions: {
        add: function (mm) {
          const k = mm.$('#ccRef').value, g = +mm.$('#ccG').value;
          if (!k || !(g > 0)) { toast('اختر مادة وأدخل الوزن بالغرام', true); return; }
          lines.push({ k: k, g: g }); mm.$('#ccG').value = ''; drawLines();
        }
      } });
    const lines = [];
    const atw = function (p, c, f, fi, po) { return p * 4 + c * 4 + f * 9 + (fi || 0) * 2 + (po || 0) * 2.4; };
    const pct = function (part, tot) { return tot > 0 ? Math.round(part / tot * 100) : 0; };
    const resBox = function (kcal, p, c, f, extra) {
      return '<div class="cc-kpis"><div><small>السعرات</small><b>' + nf0(kcal) + ' <i>kcal</i></b></div><div><small>بالكيلوجول</small><b>' + nf0(kcal * 4.184) + ' <i>kJ</i></b></div>' +
        '<div><small>من البروتين</small><b>' + pct(p * 4, kcal) + '%</b></div><div><small>من الكربوهيدرات</small><b>' + pct(c * 4, kcal) + '%</b></div><div><small>من الدهون</small><b>' + pct(f * 9, kcal) + '%</b></div>' +
        '<div><small>من الاحتياج اليومي (2000)</small><b>' + pct(kcal, 2000) + '%</b></div></div>' + (extra || '');
    };
    const calc1 = function () {
      const v = function (id) { return Math.max(0, +m.$(id).value || 0); };
      const p = v('#ccP'), c = v('#ccC'), f = v('#ccF'), fi = v('#ccFi'), po = v('#ccPo');
      m.$('#ccRes1').innerHTML = resBox(atw(p, c, f, fi, po), p, c, f, '<div class="sx-hint" style="margin-top:6px">= ' + nf0(p, 1) + '×4 + ' + nf0(c, 1) + '×4 + ' + nf0(f, 1) + '×9' + (fi ? ' + ' + nf0(fi, 1) + '×2' : '') + (po ? ' + ' + nf0(po, 1) + '×2.4' : '') + '</div>');
    };
    const drawLines = function () {
      let K = 0, P = 0, C = 0, F = 0, G = 0;
      m.$('#ccLines').innerHTML = lines.length ? '<div class="cc-lines">' + lines.map(function (l, i) {
        const r = N.DB[l.k]; const f = l.g / 100; const kc = r.kcal ? r.kcal * f : atw(r.p * f, r.c * f, r.f * f);
        K += kc; P += r.p * f; C += r.c * f; F += r.f * f; G += l.g;
        return '<div class="cc-line"><span>' + esc(r.names[0]) + '</span><span class="num">' + nf0(l.g) + ' g</span><span class="num">' + nf0(kc) + ' kcal</span><button type="button" class="ico-btn danger" data-rm="' + i + '"><i class="fas fa-times"></i></button></div>';
      }).join('') + '</div>' : '<div class="sx-empty"><i class="fas fa-list"></i>لم تتم إضافة مكونات بعد</div>';
      const sv = Math.max(1, Math.round(+m.$('#ccServ').value || 1));
      m.$('#ccRes2').innerHTML = lines.length ? resBox(K / sv, P / sv, C / sv, F / sv, '<div class="sx-hint" style="margin-top:6px">الإجمالي: ' + nf0(K) + ' kcal · الوزن: ' + nf0(G) + ' g · لكل حصة (' + sv + '): ' + nf0(K / sv) + ' kcal · لكل 100 g: ' + nf0(G ? K / G * 100 : 0) + ' kcal</div>') : '';
    };
    const calc3 = function () {
      const sex = m.$('#ccSex').value, a = +m.$('#ccAge').value || 0, w = +m.$('#ccW').value || 0, hh = +m.$('#ccH').value || 0, f = +m.$('#ccAct').value || 1.2, goal = +m.$('#ccGoal').value || 0;
      const bmr = 10 * w + 6.25 * hh - 5 * a + (sex === 'f' ? -161 : 5);
      const tdee = bmr * f, target = Math.max(sex === 'f' ? 1200 : 1500, tdee + goal);
      const bmi = hh ? w / Math.pow(hh / 100, 2) : 0;
      const bmiT = bmi < 18.5 ? 'نقص وزن' : bmi < 25 ? 'وزن طبيعي' : bmi < 30 ? 'زيادة وزن' : 'سمنة';
      m.$('#ccRes3').innerHTML = '<div class="cc-kpis"><div><small>معدل الأيض الأساسي BMR</small><b>' + nf0(bmr) + ' <i>kcal</i></b></div><div><small>الاحتياج اليومي TDEE</small><b>' + nf0(tdee) + ' <i>kcal</i></b></div>' +
        '<div><small>السعرات المستهدفة</small><b>' + nf0(target) + ' <i>kcal</i></b></div><div><small>مؤشر كتلة الجسم BMI</small><b>' + nf0(bmi, 1) + ' <i>' + bmiT + '</i></b></div></div>' +
        '<div class="sx-hint" style="margin-top:8px">توزيع مقترح (30% بروتين · 40% كربوهيدرات · 30% دهون): بروتين ' + nf0(target * .3 / 4) + ' g · كربوهيدرات ' + nf0(target * .4 / 4) + ' g · دهون ' + nf0(target * .3 / 9) + ' g</div>';
    };
    m.$$('.cc-m').forEach(function (x) { x.addEventListener('input', calc1); });
    m.$$('.cc-n, #ccSex, #ccAct, #ccGoal').forEach(function (x) { x.addEventListener('input', calc3); x.addEventListener('change', calc3); });
    m.$('#ccServ').addEventListener('input', drawLines);
    m.$('#ccLines').addEventListener('click', function (e) { const b = e.target.closest('[data-rm]'); if (b) { lines.splice(+b.dataset.rm, 1); drawLines(); } });
    m.$('#ccTabs').addEventListener('click', function (e) {
      const b = e.target.closest('[data-t]'); if (!b) return;
      m.$$('#ccTabs .sx-tab').forEach(function (x) { x.classList.toggle('active', x === b); });
      m.$$('[data-p]').forEach(function (p) { p.hidden = p.dataset.p !== b.dataset.t; });
    });
    if (!refs.length) { const c = m.$('.cc-add'); if (c) c.closest('.sx-card').hidden = true; }
    calc1(); drawLines(); calc3();
    if (tab) { const b = m.$('#ccTabs [data-t="' + tab + '"]'); if (b) b.click(); }
  };

  // ---------------- التشغيل ----------------
  function boot() {
    dmHook(); ingHook();
    let tries = 0;
    const t = setInterval(function () {
      tries++;
      const ok = typeof currentUserEmail !== 'undefined' && currentUserEmail && localStorage.getItem('foodUserToken');
      if (ok) { clearInterval(t); loadNames(); }
      else if (tries > 120) clearInterval(t);
    }, 1000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();

/* v5.4.3: أي رابط شاشة يُفتح في نافذة جديدة يفتح نسخة الملفات الحالية (تجربة محلية قبل الرفع على الاستضافة) */
(function () {
  document.addEventListener('click', function (e) {
    const a = e.target.closest && e.target.closest('a[target="_blank"][href]');
    if (!a || typeof publicBase !== 'function') return;
    const u = a.getAttribute('href'); const lb = location.href.split(/[?#]/)[0].replace(/[^/]*$/, ''), pb = publicBase();
    if (pb !== lb && u.indexOf(pb) === 0 && /\.html/.test(u)) a.setAttribute('href', lb + u.slice(pb.length));
  }, true);
})();
