// ============================================================
// biz-crm.js — الطاولات والحجوزات، العملاء والولاء، بطاقات الهدايا، دفتر الآجل، الخصومات والتسويق
// ============================================================
const RES_ST = { pending: ['بانتظار التأكيد', 'badge-warning'], confirmed: ['مؤكد', 'badge-info'], seated: ['حضر', 'badge-success'], done: ['منتهي', 'badge-cash'], cancelled: ['ملغى', 'badge-dog'], no_show: ['لم يحضر', 'badge-question'] };

// ---------- الطاولات والحجوزات ----------
bizPage('tables', { group: 'ops', title: 'الطاولات والحجوزات', icon: 'chair', feature: 'tables', perms: ['tables', 'pos'], plan: 'pro',
  pitch: 'خريطة الطاولات وحالتها المباشرة، فتح الطلب من الطاولة، وإدارة الحجوزات (بما فيها حجوزات العملاء من التطبيق).',
  render: async function (body) {
    body.innerHTML = subTabs('tbSub', [['map', 'حالة الطاولات', 'th'], ['res', 'الحجوزات', 'calendar-check'], ['manage', 'إدارة الطاولات', 'cog']], 'map') + '<div id="tbBody"></div>';
    const el = body.querySelector('#tbBody');
    bindSubTabs(body, 'tbSub', function (k) { ({ map: tablesMap, res: reservationsView, manage: tablesManage })[k](el); });
    tablesMap(el);
  } });
async function tablesMap(el) {
  el.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-pulse"></i></div>';
  const [boot, resv] = await Promise.all([bzOk('posBootstrap', {}, { loading: false }), entList('reservations', { from: isoLocal(), to: isoLocal() })]);
  const busy = {}; boot.openOrders.forEach(function (o) { if (o.table_id) busy[o.table_id] = o; });
  const rmap = {}; resv.filter(function (r) { return r.table_id && (r.status === 'confirmed' || r.status === 'pending'); }).forEach(function (r) { rmap[r.table_id] = r; });
  if (!boot.tables.length) { el.innerHTML = '<div class="empty-state"><p>لا توجد طاولات في هذا الفرع.</p><button class="btn btn-primary" style="margin-top:10px" onclick="document.querySelector(\'[data-sub=manage]\').click()">إضافة طاولات</button></div>'; return; }
  const areas = [...new Set(boot.tables.map(function (t) { return t.area || 'الصالة'; }))];
  el.innerHTML = kpis([['الطاولات', boot.tables.length], ['مشغولة', Object.keys(busy).length, '', '#f59e0b'], ['محجوزة اليوم', Object.keys(rmap).length, '', '#93c5fd']]) +
    areas.map(function (a) { return '<h4 style="color:var(--accent-soft);margin:12px 0 8px">' + h(a) + '</h4><div class="tables-grid">' + boot.tables.filter(function (t) { return (t.area || 'الصالة') === a; }).map(function (t) {
      const o = busy[t.id], r = rmap[t.id];
      return '<div class="tbl' + (o ? ' busy' : r ? ' reserved' : '') + '" data-t="' + t.id + '"><div class="tn">' + h(t.name) + '</div><div class="ts">' + (o ? 'طلب #' + o.number + ' · ' + money(o.total) : r ? 'حجز ' + new Date(r.reserved_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) + ' · ' + h(r.customer_name) : 'متاحة · ' + (t.seats || 0) + ' مقاعد') + '</div></div>';
    }).join('') + '</div>'; }).join('');
  el.onclick = function (e) {
    const tb = e.target.closest('[data-t]'); if (!tb || !canP('pos') || !hasF('pos')) return;
    const t = boot.tables.find(function (x) { return x.id === tb.dataset.t; }), o = busy[t.id];
    POS.o = o ? posFromServer(o) : Object.assign(posNewOrder(), { orderType: 'dine_in', tableId: t.id, tableName: t.name });
    POS.boot = null; switchTab('pos');
  };
}
async function reservationsView(el) {
  el.innerHTML = dateRangeBar('rsRange', isoLocal(), isoLocal(new Date(Date.now() + 7 * 864e5)), '<select data-f="status"><option value="">كل الحالات</option>' + Object.keys(RES_ST).map(function (k) { return '<option value="' + k + '">' + RES_ST[k][0] + '</option>'; }).join('') + '</select><button class="btn btn-success btn-sm" type="button" id="rsNew"><i class="fas fa-plus"></i> حجز جديد</button>') + '<div id="rsList"></div>';
  const get = bindRange(el, 'rsRange', load);
  const tables = await entList('tables', { activeOnly: true });
  el.querySelector('#rsNew').onclick = function () { resEdit(null); };
  function resEdit(r) {
    bPrompt(r ? 'تعديل حجز' : 'حجز جديد', [{ k: 'customer_name', label: 'الاسم', req: true }, { k: 'phone', label: 'الجوال', ltr: true }, { k: 'reserved_at', label: 'الموعد', type: 'datetime', req: true }, { k: 'party_size', label: 'عدد الأشخاص', type: 'number', def: 2 },
      { k: 'table_id', label: 'الطاولة', type: 'select', options: [['', '— لاحقاً —']].concat(tables.map(function (t) { return [t.id, t.name + (t.area ? ' · ' + t.area : '')]; })) }, { k: 'duration_min', label: 'المدة (دقيقة)', type: 'number', def: 90 },
      { k: 'status', label: 'الحالة', type: 'select', options: Object.keys(RES_ST).map(function (k) { return [k, RES_ST[k][0]]; }), def: 'confirmed' }, { k: 'notes', label: 'ملاحظات', full: true }],
      r ? Object.assign({}, r, { reserved_at: isoLocalDT(r.reserved_at) }) : { reserved_at: isoLocalDT(new Date(Date.now() + 3600e3)) }, async function (d) { if (r) d.id = r.id; if (!d.table_id) d.table_id = null; await entSave('reservations', d); load(); }, { icon: 'calendar-check' });
  }
  async function load(f) {
    const rows = await entList('reservations', f || get());
    el.querySelector('#rsList').innerHTML = bTable([{ label: 'الموعد', r: function (r) { return dt(r.reserved_at); } }, { label: 'الاسم', r: function (r) { return '<b>' + h(r.customer_name) + '</b>'; } }, { label: 'الجوال', r: function (r) { return r.phone ? '<a dir="ltr" href="https://wa.me/' + h(String(r.phone).replace(/\D/g, '')) + '" target="_blank">' + h(r.phone) + '</a>' : ''; } }, { label: 'الأشخاص', num: true, r: function (r) { return r.party_size; } },
      { label: 'الطاولة', r: function (r) { const t = tables.find(function (x) { return x.id === r.table_id; }); return t ? h(t.name) : '—'; } }, { label: 'الحالة', r: function (r) { return stBadge(RES_ST, r.status); } }, { label: 'ملاحظات', r: function (r) { return h(r.notes); } },
      { label: '', r: function (r) { return (r.status === 'pending' ? '<button class="btn btn-success btn-sm" data-s="confirmed" data-id="' + r.id + '">تأكيد</button> ' : '') + (r.status === 'confirmed' ? '<button class="btn btn-outline btn-sm" data-s="seated" data-id="' + r.id + '">حضر</button> ' : '') + '<button class="ico-btn" data-e="' + r.id + '"><i class="fas fa-pen"></i></button><button class="ico-btn danger" data-d="' + r.id + '"><i class="fas fa-trash"></i></button>'; } }], rows, { empty: 'لا توجد حجوزات في هذه الفترة' });
    el.querySelector('#rsList').onclick = async function (e) {
      const s = e.target.closest('[data-s]'), ed = e.target.closest('[data-e]'), d = e.target.closest('[data-d]');
      if (s) { const r = rows.find(function (x) { return x.id === s.dataset.id; }); await entSave('reservations', Object.assign({}, r, { status: s.dataset.s })); load(); }
      if (ed) resEdit(rows.find(function (x) { return x.id === ed.dataset.e; }));
      if (d && await entDel('reservations', d.dataset.d, 'الحجز')) load();
    };
  }
  load();
}
async function tablesManage(el) {
  const F = [{ k: 'name', label: 'اسم/رقم الطاولة', req: true }, { k: 'area', label: 'المنطقة', ph: 'الصالة / التراس' }, { k: 'seats', label: 'عدد المقاعد', type: 'number', def: 4 }, { k: 'sort', label: 'الترتيب', type: 'number', def: 0 }, { k: 'active', label: 'فعّالة', type: 'checkbox', def: true }];
  el.innerHTML = '<div class="biz-toolbar"><span class="grow muted">رمز QR لكل طاولة يفتح المينيو برقم الطاولة ليصل الطلب مباشرة للكاشير.</span><button class="btn btn-outline btn-sm" id="tbBulk"><i class="fas fa-layer-group"></i> إضافة مجموعة</button><button class="btn btn-primary btn-sm" id="tbNew"><i class="fas fa-plus"></i> طاولة</button><button class="btn btn-outline btn-sm" id="tbQr"><i class="fas fa-qrcode"></i> طباعة QR الطاولات</button></div><div id="tbList"></div>';
  let rows = [];
  const load = async function () {
    rows = await entList('tables');
    el.querySelector('#tbList').innerHTML = bTable([{ label: 'الطاولة', r: function (t) { return '<b>' + h(t.name) + '</b>'; } }, { label: 'المنطقة', r: function (t) { return h(t.area || '—'); } }, { label: 'المقاعد', num: true, r: function (t) { return t.seats; } }, { label: 'الحالة', r: function (t) { return t.active ? '<span class="badge badge-success">فعّالة</span>' : '<span class="badge badge-dog">موقوفة</span>'; } }, { label: '', r: function (t) { return '<button class="ico-btn" data-e="' + t.id + '"><i class="fas fa-pen"></i></button><button class="ico-btn danger" data-d="' + t.id + '"><i class="fas fa-trash"></i></button>'; } }], rows, { empty: 'لا توجد طاولات' });
  };
  el.querySelector('#tbNew').onclick = function () { bPrompt('طاولة جديدة', F, {}, async function (d) { await entSave('tables', d); load(); }, { icon: 'chair' }); };
  el.querySelector('#tbBulk').onclick = function () {
    bPrompt('إضافة مجموعة طاولات', [{ k: 'prefix', label: 'البادئة', def: 'T' }, { k: 'from', label: 'من رقم', type: 'number', def: 1 }, { k: 'to', label: 'إلى رقم', type: 'number', def: 10 }, { k: 'area', label: 'المنطقة' }, { k: 'seats', label: 'المقاعد', type: 'number', def: 4 }], {}, async function (d) {
      if (d.to - d.from > 60) { showToast('الحد 60 طاولة في المرة', true); return false; }
      showLoading(); try { for (let i = d.from; i <= d.to; i++) await bz('entitySave', { kind: 'tables', data: { name: (d.prefix || '') + i, area: d.area, seats: d.seats, sort: i, active: true } }); } finally { hideLoading(); }
      showToast('تمت الإضافة'); load();
    }, { icon: 'layer-group' });
  };
  el.querySelector('#tbQr').onclick = function () { tablesQrPrint(rows.filter(function (t) { return t.active; })); };
  el.querySelector('#tbList').onclick = async function (e) {
    const ed = e.target.closest('[data-e]'), d = e.target.closest('[data-d]');
    if (ed) { const t = rows.find(function (x) { return x.id === ed.dataset.e; }); bPrompt('تعديل طاولة', F, t, async function (dd) { dd.id = t.id; await entSave('tables', dd); load(); }); }
    if (d && await entDel('tables', d.dataset.d, 'الطاولة')) load();
  };
  load();
}
function menuPublicUrl(extra) { return publicBase() + 'menu.html?r=' + encodeURIComponent(B.acc.publicId || currentUserEmail) + (extra || ''); }
function tablesQrPrint(tables) {
  if (!tables.length) { showToast('لا توجد طاولات', true); return; }
  printHtml('QR الطاولات', '<style>body{width:190mm}.g{display:grid;grid-template-columns:repeat(3,1fr);gap:8mm}.t{border:1px solid #000;border-radius:4mm;padding:4mm;text-align:center;page-break-inside:avoid}.t img{width:45mm;height:45mm}</style><h2>' + h(B.acc.restaurantName) + '</h2><div class="g">' +
    tables.map(function (t) { return '<div class="t"><b style="font-size:18px">طاولة ' + h(t.name) + '</b><br><img src="' + qrImg(menuPublicUrl('&t=' + encodeURIComponent(t.name)), 300) + '"><div>امسح لعرض المنيو والطلب</div></div>'; }).join('') + '</div>', 'a4');
}

// ---------- العملاء ----------
const CUST_F = [{ k: 'name', label: 'الاسم', req: true }, { k: 'phone', label: 'الجوال', ltr: true }, { k: 'email', label: 'البريد', ltr: true }, { k: 'birthday', label: 'تاريخ الميلاد', type: 'date' }, { k: 'tax_no', label: 'الرقم الضريبي (للشركات)', ltr: true }, { k: 'credit_limit', label: 'حد الآجل (0 = بلا حد)', type: 'number', def: 0 }, { k: 'address', label: 'العنوان', full: true }, { k: 'notes', label: 'ملاحظات', full: true }];
function custEdit(c, after) {
  bPrompt(c ? 'تعديل عميل' : 'عميل جديد', CUST_F, c || {}, async function (d) { if (c) d.id = c.id; d.birthday = d.birthday || null; const row = await entSave('customers', d); if (after) after(row || d); }, { icon: 'user', wide: true });
}
bizPage('customers', { group: 'crm', title: 'العملاء والولاء', icon: 'users', feature: 'customers', perms: ['customers'], plan: 'pro',
  pitch: 'قاعدة بيانات العملاء مع سجل الزيارات والمشتريات، برنامج نقاط الولاء، بطاقات الهدايا، ودفتر الآجل في الباقة المتقدمة.',
  render: async function (body) {
    body.innerHTML = subTabs('cuSub', [['list', 'العملاء', 'users'], ['app', 'حسابات التطبيق والعروض', 'bell', !hasF('brand_app')], ['gift', 'بطاقات الهدايا', 'gift', !hasF('gift_cards')], ['ledger', 'دفتر الآجل', 'book', !hasF('ledger')]], 'list') + '<div id="cuBody"></div>';
    const el = body.querySelector('#cuBody');
    bindSubTabs(body, 'cuSub', function (k) { ({ list: customersView, app: custAppView, gift: giftView, ledger: ledgerView })[k](el); });
    customersView(el);
  } });
function customersView(el) {
  el.innerHTML = '<div class="biz-toolbar"><input class="biz-search grow" id="cuQ" placeholder="بحث بالاسم أو الجوال أو البريد"><button class="btn btn-primary btn-sm" id="cuNew"><i class="fas fa-user-plus"></i> عميل جديد</button></div><div id="cuList"></div>';
  let rows = [];
  const load = async function () {
    rows = await entList('customers', { q: el.querySelector('#cuQ').value.trim() });
    el.querySelector('#cuList').innerHTML = kpis([['عدد العملاء', rows.length], ['إجمالي المشتريات', money(rows.reduce(function (s, c) { return s + +c.total_spent; }, 0))], ['النقاط القائمة', nf(rows.reduce(function (s, c) { return s + +c.points; }, 0), 0)]]) +
      bTable([{ label: 'العميل', r: function (c) { return '<b>' + h(c.name) + '</b>'; } }, { label: 'الجوال', r: function (c) { return '<span dir="ltr">' + h(c.phone) + '</span>'; } }, { label: 'الزيارات', num: true, r: function (c) { return c.visits; } }, { label: 'المشتريات', num: true, r: function (c) { return money(c.total_spent); } }, { label: 'النقاط', num: true, r: function (c) { return nf(c.points, 0); } }]
        .concat(hasF('ledger') ? [{ label: 'الآجل', num: true, r: function (c) { return +c.balance ? '<span style="color:#fbbf24">' + money(c.balance) + '</span>' : '—'; } }] : [])
        .concat([{ label: 'حد الآجل', num: true, r: function (c) { return +c.credit_limit ? money(c.credit_limit) : '<span class="muted">بلا حد</span>'; } }])
        .concat([{ label: 'آخر زيارة', r: function (c) { return c.last_visit ? dOnly(c.last_visit) : '—'; } }, { label: '', r: function (c) { return '<button class="ico-btn" data-v="' + c.id + '" title="الملف"><i class="fas fa-id-card"></i></button><button class="ico-btn" data-e="' + c.id + '"><i class="fas fa-pen"></i></button><button class="ico-btn danger" data-d="' + c.id + '"><i class="fas fa-trash"></i></button>'; } }]), rows, { empty: 'لا يوجد عملاء بعد — يُضاف العملاء من هنا أو من الكاشير' });
  };
  let tm; el.querySelector('#cuQ').oninput = function () { clearTimeout(tm); tm = setTimeout(load, 300); };
  el.querySelector('#cuNew').onclick = function () { custEdit(null, load); };
  (el.querySelector('#cuX') || {}).onclick = function () { exportRowsExcel('العملاء', ['الاسم', 'الجوال', 'البريد', 'الميلاد', 'الزيارات', 'المشتريات', 'النقاط', 'الآجل', 'حد الآجل'], rows.map(function (c) { return [c.name, c.phone, c.email, c.birthday || '', c.visits, +c.total_spent, +c.points, +c.balance, +c.credit_limit || 'بلا حد']; })); };
  el.querySelector('#cuList').onclick = async function (e) {
    const v = e.target.closest('[data-v]'), ed = e.target.closest('[data-e]'), d = e.target.closest('[data-d]');
    if (v) customerProfile(v.dataset.v, load);
    if (ed) custEdit(rows.find(function (x) { return x.id === ed.dataset.e; }), load);
    if (d && await entDel('customers', d.dataset.d, 'العميل')) load();
  };
  load();
}
// إرسال العروض والتنبيهات مباشرة لحسابات العملاء على جوالاتهم
const CA_F = [{ k: 'title', label: 'العنوان', req: true, full: true, ph: 'خصم 20% على المشويات هذا الأسبوع' }, { k: 'body', label: 'التفاصيل', type: 'textarea', full: true }, { k: 'code', label: 'كود الخصم (اختياري — من صفحة العروض)', ltr: true },
  { k: 'to', label: 'إلى', type: 'select', options: [['app', 'العملاء المسجلين في التطبيق'], ['all', 'كل العملاء']], def: 'app' }];
async function custAppView(el) {
  const r = await bzOk('customerAppStats', {}, { loading: false });
  const appUrl = (typeof PUBLIC_APP_URL !== 'undefined' ? PUBLIC_APP_URL : location.href.replace(/[^/]*(\?.*)?$/, '')) + 'app.html?r=' + encodeURIComponent(B.acc.publicId || '');
  el.innerHTML = kpis([['عملاء لديهم حساب في التطبيق', r.app], ['إجمالي العملاء', r.total]]) +
    '<div class="biz-card"><h4><i class="fas fa-mobile-screen-button"></i> كيف يعمل</h4><p class="muted" style="line-height:1.9">يسجّل العميل دخوله في تطبيق المطعم برقم جواله ورمز سري، فيظهر له رمز QR خاص به. عند الدفع يقرأ الكاشير الرمز بالكاميرا أو قارئ QR فيظهر رصيد نقاطه ويمكن خصمها من الفاتورة ودفع الفرق فقط. تصل النقاط والعروض وتنبيهات جاهزية الطلب إلى حسابه مباشرة.</p>' +
    '<div class="biz-toolbar"><input class="biz-search grow" readonly dir="ltr" value="' + h(appUrl) + '"><a class="btn btn-outline btn-sm" target="_blank" href="' + h(appUrl) + '"><i class="fas fa-external-link-alt"></i> فتح التطبيق</a></div></div>' +
    '<div class="biz-card"><h4><i class="fas fa-bullhorn"></i> إرسال عرض أو تنبيه للعملاء</h4>' +
    '<div id="caForm">' + bForm(CA_F, {}) + '</div>' +
    '<button class="btn btn-primary" id="caSend" style="margin-top:10px"><i class="fas fa-paper-plane"></i> إرسال الآن</button></div>' +
    '<div class="biz-card"><h4>آخر ما تم إرساله</h4>' + bTable([{ label: 'التاريخ', r: function (x) { return dt(x.created_at); } }, { label: 'العنوان', r: function (x) { return '<b>' + h(x.title) + '</b>' + (x.body ? '<div class="muted">' + h(x.body) + '</div>' : ''); } }, { label: 'الكود', r: function (x) { return x.code ? '<span dir="ltr">' + h(x.code) + '</span>' : '—'; } }, { label: 'عدد المستلمين', num: true, r: function (x) { return x.n; } }], r.history || [], { empty: 'لم يتم إرسال أي عروض بعد' }) + '</div>';
  el.querySelector('#caSend').onclick = async function () {
    const d = readForm(el.querySelector('#caForm'), CA_F);
    if (!d.title || d.title.length < 2) { showToast('اكتب عنوان الرسالة', true); return; }
    if (!(await bConfirm('إرسال «' + d.title + '» إلى ' + (d.to === 'all' ? 'كل العملاء' : 'العملاء المسجلين في التطبيق') + '؟'))) return;
    const x = await bzOk('customerNotify', { title: d.title, body: d.body, code: d.code, onlyApp: d.to !== 'all' });
    showToast('تم الإرسال إلى ' + x.sent + ' عميل'); custAppView(el);
  };
}
async function customerProfile(id, after) {
  const r = await bzOk('customerProfile', { id: id });
  const c = r.customer;
  bModal({ title: c.name, icon: 'id-card', xwide: true, sub: (c.phone || '') + (c.email ? ' · ' + c.email : ''),
    body: kpis([['الزيارات', c.visits], ['إجمالي المشتريات', money(c.total_spent)], ['متوسط الفاتورة', money(c.visits ? c.total_spent / c.visits : 0)], ['نقاط الولاء', nf(c.points, 0), '', '#cfa776']].concat(hasF('ledger') ? [['رصيد الآجل', money(c.balance), '', +c.balance ? '#fbbf24' : '']] : []).concat([['حد الآجل', +c.credit_limit ? money(c.credit_limit) : 'بلا حد', +c.credit_limit && hasF('ledger') ? 'المتاح ' + money(Math.max(0, c.credit_limit - c.balance)) : '']])) +
      '<div class="biz-grid-2"><div><h4 style="color:var(--accent-soft);margin-bottom:8px">آخر الطلبات</h4>' + bTable([{ label: '#', r: function (o) { return o.number; } }, { label: 'التاريخ', r: function (o) { return dOnly(o.created_at); } }, { label: 'الحالة', r: function (o) { return stBadge(ORDER_STATUS, o.status); } }, { label: 'الإجمالي', num: true, r: function (o) { return money(o.total); } }], r.orders.slice(0, 15)) + '</div>' +
      '<div><h4 style="color:var(--accent-soft);margin-bottom:8px">حركة النقاط</h4>' + bTable([{ label: 'التاريخ', r: function (p) { return dOnly(p.created_at); } }, { label: 'السبب', r: function (p) { return h({ earn: 'اكتساب', redeem: 'استبدال', manual: 'يدوي', refund: 'استرجاع' }[p.reason] || p.reason); } }, { label: 'النقاط', num: true, r: function (p) { return '<span style="color:' + (p.points < 0 ? '#f87171' : '#6ee7b7') + '">' + nf(p.points, 0) + '</span>'; } }], r.points.slice(0, 15)) + '</div></div>' +
      (r.giftCards && r.giftCards.length ? '<h4 style="color:var(--accent-soft);margin:10px 0 8px">بطاقات الهدايا</h4>' + r.giftCards.map(function (g) { return '<span class="badge badge-info" style="margin:2px">' + h(g.code) + ' · ' + money(g.balance) + '</span>'; }).join('') : ''),
    foot: '<button class="btn btn-cancel" data-x>إغلاق</button><button class="btn btn-outline" data-act="edit"><i class="fas fa-pen"></i> تعديل البيانات والحد</button>' + (hasF('brand_app') ? '<button class="btn btn-outline" data-act="rpin" title="إن نسي العميل رمز دخول التطبيق"><i class="fas fa-key"></i> إعادة تعيين رمز التطبيق</button>' : '') + (hasF('loyalty') ? '<button class="btn btn-outline" data-act="pts"><i class="fas fa-star"></i> تعديل النقاط</button>' : '') + (hasF('ledger') ? '<button class="btn btn-outline" data-act="led"><i class="fas fa-book"></i> كشف الآجل</button>' : '') + (c.phone ? '<a class="btn btn-success" target="_blank" href="https://wa.me/' + h(String(c.phone).replace(/\D/g, '')) + '"><i class="fab fa-whatsapp"></i> واتساب</a>' : ''),
    actions: {
      pts: function (m) { bPrompt('تعديل نقاط ' + c.name, [{ k: 'points', label: 'النقاط (+ إضافة / - خصم)', type: 'number', req: true }, { k: 'note', label: 'السبب', full: true }], {}, async function (d) { await bzOk('customerPoints', Object.assign({ id: c.id }, d)); showToast('تم التعديل'); m.close(); customerProfile(id, after); if (after) after(); }); },
      led: function (m) { m.close(); ledgerCustomer(c.id); },
      rpin: async function () { if (!(await bConfirm('إعادة تعيين الرمز السري لحساب ' + c.name + ' في التطبيق؟ سيختار العميل رمزاً جديداً عند الدخول التالي.'))) return; const x = await bzOk('customerResetPin', { id: c.id }); showToast(x.message); },
      edit: function (m) { m.close(); custEdit(c, function () { customerProfile(id, after); if (after) after(); }); }
    } });
}
async function giftView(el) {
  el.innerHTML = '<div class="biz-toolbar"><input class="biz-search grow" id="gcQ" placeholder="بحث بالكود أو اسم العميل"><button class="btn btn-outline btn-sm" id="gcChk"><i class="fas fa-search-dollar"></i> فحص رصيد</button><button class="btn btn-primary btn-sm" id="gcNew"><i class="fas fa-plus"></i> إصدار بطاقة</button></div><div id="gcList"></div>';
  let rows = [];
  const load = async function () {
    rows = await entList('gift_cards', { q: el.querySelector('#gcQ').value.trim() });
    el.querySelector('#gcList').innerHTML = kpis([['البطاقات', rows.length], ['الأرصدة القائمة', money(rows.filter(function (g) { return g.active; }).reduce(function (s, g) { return s + +g.balance; }, 0))]]) +
      bTable([{ label: 'الكود', r: function (g) { return '<b dir="ltr" style="font-family:monospace">' + h(g.code) + '</b>'; } }, { label: 'العميل', r: function (g) { return h(g.customer_name || '—'); } }, { label: 'القيمة الأصلية', num: true, r: function (g) { return money(g.initial_amount); } }, { label: 'الرصيد', num: true, r: function (g) { return '<b>' + money(g.balance) + '</b>'; } }, { label: 'الانتهاء', r: function (g) { return g.expires_at ? dOnly(g.expires_at) : '—'; } }, { label: 'الحالة', r: function (g) { return g.active ? '<span class="badge badge-success">فعّالة</span>' : '<span class="badge badge-dog">موقوفة</span>'; } },
        { label: '', r: function (g) { return '<button class="btn btn-outline btn-sm" data-t="' + g.id + '">شحن</button> <button class="ico-btn" data-p="' + g.id + '" title="البطاقة: QR وطباعة وواتساب"><i class="fas fa-qrcode"></i></button><button class="ico-btn" data-a="' + g.id + '" title="' + (g.active ? 'إيقاف' : 'تفعيل') + '"><i class="fas fa-' + (g.active ? 'pause' : 'play') + '"></i></button>'; } }], rows, { empty: 'لا توجد بطاقات هدايا' });
  };
  let tm; el.querySelector('#gcQ').oninput = function () { clearTimeout(tm); tm = setTimeout(load, 300); };
  el.querySelector('#gcNew').onclick = async function () {
    let cs = []; try { cs = await entList('customers', {}); } catch (e) { }
    bPrompt('إصدار بطاقة هدية', [{ k: 'amount', label: 'القيمة', type: 'number', req: true }, { k: 'code', label: 'الكود (اختياري — يُولّد تلقائياً)', ltr: true },
      { k: 'customerId', label: 'عميل مسجل (اختياري)', type: 'select', options: [['', '— بدون —']].concat(cs.map(function (c) { return [c.id, c.name + (c.phone ? ' · ' + c.phone : '')]; })) },
      { k: 'customerName', label: 'اسم المستفيد' }, { k: 'phone', label: 'جوال المستفيد (لإرسال البطاقة واتساب)', ltr: true, ph: '9665xxxxxxxx' },
      { k: 'expiresAt', label: 'تاريخ الانتهاء', type: 'date' }, { k: 'note', label: 'ملاحظة', full: true }], {}, async function (d) {
      const cu = cs.find(function (c) { return c.id === d.customerId; });
      if (cu) { if (!d.customerName) d.customerName = cu.name; if (!d.phone) d.phone = cu.phone || ''; }
      const phone = d.phone; delete d.phone;
      const r = await bzOk('giftCardIssue', d); showToast('تم إصدار البطاقة ' + r.card.code); load(); giftCardModal(r.card, phone);
    }, { icon: 'gift', saveText: 'إصدار', wide: true, onOpen: function (m) {
      const sel = m.$('[data-k=customerId]'); if (sel) sel.addEventListener('change', function () { const cu = cs.find(function (c) { return c.id === sel.value; }); if (cu) { m.$('[data-k=customerName]').value = cu.name; m.$('[data-k=phone]').value = cu.phone || ''; } });
    } });
  };
  el.querySelector('#gcChk').onclick = async function () {
    const code = await bScan({ title: 'فحص بطاقة هدية', sub: 'امسح QR البطاقة بالكاميرا أو القارئ، أو اكتب الكود', placeholder: 'كود البطاقة' });
    if (!code) return;
    await (async function (d) {
      const r = await bzOk('giftCardCheck', d);
      bModal({ title: 'بطاقة ' + r.card.code, icon: 'gift', body: kpis([['الرصيد', money(r.card.balance), '', r.usable ? '#6ee7b7' : '#f87171'], ['الحالة', r.expired ? 'منتهية' : r.card.active ? 'فعّالة' : 'موقوفة']]) + bTable([{ label: 'التاريخ', r: function (m) { return dt(m.created_at); } }, { label: 'الحركة', r: function (m) { return h({ issue: 'إصدار', redeem: 'استخدام', topup: 'شحن', refund: 'استرجاع' }[m.reason] || m.reason); } }, { label: 'المبلغ', num: true, r: function (m) { return money(m.amount); } }], r.moves) });
    })({ code: code }).catch(function () {});
  };
  el.querySelector('#gcList').onclick = async function (e) {
    const g = function (a) { const b = e.target.closest('[data-' + a + ']'); return b ? rows.find(function (x) { return x.id === b.dataset[a]; }) : null; };
    for (const c of [g('t')].filter(Boolean)) bPrompt('شحن بطاقة ' + c.code, [{ k: 'amount', label: 'المبلغ', type: 'number', req: true }], {}, async function (d) { await bzOk('giftCardTopup', { id: c.id, amount: d.amount }); showToast('تم الشحن'); load(); });
    for (const c of [g('p')].filter(Boolean)) { let ph = ''; if (c.customer_id) { try { const cs = await entList('customers', {}); const cu = cs.find(function (x) { return x.id === c.customer_id; }); ph = cu ? cu.phone || '' : ''; } catch (er) { } } giftCardModal(c, ph); }
    for (const c of [g('a')].filter(Boolean)) { await entSave('gift_cards', { id: c.id, active: !c.active, expires_at: c.expires_at || null, note: c.note, customer_name: c.customer_name }); load(); }
  };
  load();
}
function giftCardHtml(g, forPrint) {
  const name = (B.acc && (B.acc.restaurantName || '')) || '', bal = money(g.balance !== undefined && g.balance !== null ? g.balance : g.initial_amount);
  return '<div class="gc-card"' + (forPrint ? ' style="margin:0 auto"' : '') + '>' +
    '<div class="gc-top"><div><div class="gc-rest">' + h(name) + '</div><div class="gc-ttl">بطاقة هدية · GIFT CARD</div></div><div class="gc-ico"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#f3d9b1" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/></svg></div></div>' +
    '<div class="gc-mid"><div><div class="gc-lbl">الرصيد</div><div class="gc-amt">' + h(bal) + '</div>' + (g.customer_name ? '<div class="gc-to">إلى: ' + h(g.customer_name) + '</div>' : '') + '</div>' +
    '<div class="gc-qr"><img crossorigin="anonymous" src="' + qrImg(g.code, 220) + '" alt="QR"></div></div>' +
    '<div class="gc-bot"><div class="gc-code" dir="ltr">' + h(g.code) + '</div><div class="gc-exp">' + (g.expires_at ? 'صالحة حتى ' + dOnly(g.expires_at) : 'بدون تاريخ انتهاء') + '</div></div></div>';
}
const GC_CSS = '.gc-card{width:340px;height:214px;border-radius:16px;padding:16px 18px;box-sizing:border-box;color:#fff;font-family:Tajawal,Cairo,Arial,sans-serif;direction:rtl;display:flex;flex-direction:column;justify-content:space-between;background:linear-gradient(135deg,#1f2433 0%,#3a2d1f 55%,#b48554 100%);box-shadow:0 10px 28px rgba(0,0,0,.28);position:relative;overflow:hidden}' +
  '.gc-card:before{content:"";position:absolute;width:220px;height:220px;border-radius:50%;background:rgba(255,255,255,.06);top:-90px;left:-70px}' +
  '.gc-top{display:flex;justify-content:space-between;align-items:flex-start}.gc-rest{font-weight:800;font-size:17px}.gc-ttl{font-size:11px;opacity:.8;letter-spacing:.5px;margin-top:2px}.gc-ico{font-size:24px}' +
  '.gc-mid{display:flex;justify-content:space-between;align-items:center}.gc-lbl{font-size:11px;opacity:.75}.gc-amt{font-size:26px;font-weight:800;color:#f3d9b1}.gc-to{font-size:12px;margin-top:2px}' +
  '.gc-qr{background:#fff;border-radius:10px;padding:5px;width:86px;height:86px;box-sizing:border-box}.gc-qr img{width:100%;height:100%;display:block}' +
  '.gc-bot{display:flex;justify-content:space-between;align-items:flex-end}.gc-code{font-family:monospace;font-size:17px;letter-spacing:2px;font-weight:700}.gc-exp{font-size:10px;opacity:.75}';
function giftPrint(g) {
  printHtml('بطاقة هدية', '<style>' + GC_CSS + '@media print{.gc-card{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style><div style="padding:4mm 0">' + giftCardHtml(g, true) + '</div><p style="text-align:center;font-size:11px">استخدم الكود أو امسح رمز QR عند الدفع في الكاشير</p>', 'a4');
}
function giftWaText(g) {
  const name = (B.acc && B.acc.restaurantName) || '';
  return 'مرحباً' + (g.customer_name ? ' ' + g.customer_name : '') + '،\nيسعدنا إهداؤك بطاقة هدية من ' + name + '.\n\nكود البطاقة: ' + g.code + '\nالرصيد: ' + money(g.balance !== undefined && g.balance !== null ? g.balance : g.initial_amount) + (g.expires_at ? '\nصالحة حتى: ' + dOnly(g.expires_at) : '') + '\n\nاعرض الكود أو صورة البطاقة عند الدفع.';
}
async function giftCardImage(m) {
  const node = m.$('.gc-card');
  await Promise.all(Array.from(node.querySelectorAll('img')).map(function (i) { return i.complete ? 0 : new Promise(function (r) { i.onload = i.onerror = r; }); }));
  const cv = await html2canvas(node, { scale: 3, useCORS: true, backgroundColor: null });
  return cv;
}
function giftCardModal(g, phone) {
  bModal({ title: 'بطاقة هدية ' + g.code, icon: 'gift', wide: true, print: false,
    body: '<style>' + GC_CSS + '</style><div style="display:flex;justify-content:center;padding:10px 0 18px">' + giftCardHtml(g) + '</div>' +
      bForm([{ k: 'phone', label: 'جوال المستفيد (بالصيغة الدولية بدون +)', ltr: true, ph: '9665xxxxxxxx' }], { phone: phone || '' }) +
      '<p class="muted" style="font-size:12px;margin-top:6px">يحتوي رمز QR على كود البطاقة، ويمكن مسحه بقارئ الباركود في الكاشير. للإرسال بالصورة: حمّل الصورة ثم أرفقها في محادثة واتساب.</p>',
    foot: '<button class="btn btn-cancel" data-x>إغلاق</button><button class="btn btn-outline" data-act="print"><i class="fas fa-print"></i> طباعة</button><button class="btn btn-outline" data-act="img"><i class="fas fa-image"></i> تحميل صورة</button>' + (navigator.share ? '<button class="btn btn-outline" data-act="share"><i class="fas fa-share-alt"></i> مشاركة الصورة</button>' : '') + '<button class="btn btn-success" data-act="wa"><i class="fab fa-whatsapp"></i> إرسال واتساب</button>',
    actions: {
      print: function () { giftPrint(g); },
      img: async function (m) { try { const cv = await giftCardImage(m); const a = document.createElement('a'); a.download = 'gift-' + g.code + '.png'; a.href = cv.toDataURL('image/png'); a.click(); } catch (e) { showToast('تعذر إنشاء الصورة: ' + e.message, true); } },
      share: async function (m) { try { const cv = await giftCardImage(m); const blob = await new Promise(function (r) { cv.toBlob(r, 'image/png'); }); const f = new File([blob], 'gift-' + g.code + '.png', { type: 'image/png' }); if (navigator.canShare && navigator.canShare({ files: [f] })) await navigator.share({ files: [f], text: giftWaText(g) }); else await navigator.share({ text: giftWaText(g) }); } catch (e) { if (e.name !== 'AbortError') showToast('تعذرت المشاركة', true); } },
      wa: function (m) { const ph = String(m.$('[data-k=phone]').value || '').replace(/\D/g, '').replace(/^00/, ''); window.open('https://wa.me/' + ph + '?text=' + encodeURIComponent(giftWaText(g)), '_blank'); }
    } });
}
async function ledgerView(el) {
  const r = await bzOk('ledgerList', {}, { loading: false });
  el.innerHTML = kpis([['إجمالي الديون على العملاء', money(r.total), '', '#fbbf24'], ['عدد العملاء المدينين', r.debtors.length]]) +
    '<div class="biz-toolbar"><span class="grow muted">البيع الآجل يتم من الكاشير بطريقة الدفع «آجل» بعد اختيار العميل. سجّل التحصيلات من هنا.</span></div>' +
    bTable([{ label: 'العميل', r: function (c) { return '<b>' + h(c.name) + '</b>'; } }, { label: 'الجوال', r: function (c) { return '<span dir="ltr">' + h(c.phone) + '</span>'; } }, { label: 'الرصيد', num: true, r: function (c) { return '<b style="color:#fbbf24">' + money(c.balance) + '</b>'; } }, { label: 'الحد', num: true, r: function (c) { return +c.credit_limit ? money(c.credit_limit) : 'بلا حد'; } }, { label: 'آخر زيارة', r: function (c) { return c.last_visit ? dOnly(c.last_visit) : '—'; } },
      { label: '', r: function (c) { return '<button class="btn btn-success btn-sm" data-pay="' + c.id + '">تحصيل</button> <button class="btn btn-outline btn-sm" data-st="' + c.id + '">كشف حساب</button>'; } }], r.debtors, { empty: 'لا توجد ديون قائمة' });
  el.onclick = function (e) {
    const p = e.target.closest('[data-pay]'), s = e.target.closest('[data-st]');
    if (p) ledgerPay(r.debtors.find(function (x) { return x.id === p.dataset.pay; }), function () { ledgerView(el); });
    if (s) ledgerCustomer(s.dataset.st);
  };
}
function ledgerPay(c, after) {
  bPrompt('تحصيل من ' + c.name, [{ k: 'amount', label: 'المبلغ', type: 'number', req: true, hint: 'الرصيد: ' + money(c.balance) }, { k: 'method', label: 'الطريقة', type: 'select', options: [['cash', 'نقداً'], ['card', 'بطاقة'], ['transfer', 'تحويل']] }, { k: 'kind', label: 'النوع', type: 'select', options: [['credit', 'تحصيل (يخفض الدين)'], ['debit', 'قيد مدين (يزيد الدين)']] }, { k: 'note', label: 'ملاحظة', full: true }], {}, async function (d) {
    const r = await bzOk('ledgerPayment', Object.assign({ customerId: c.id }, d)); showToast('تم التسجيل — الرصيد الآن ' + money(r.balance)); if (after) after();
  }, { icon: 'hand-holding-usd' });
}
async function ledgerCustomer(id) {
  const r = await bzOk('ledgerList', { customerId: id });
  let run = 0;
  const lines = r.entries.slice().reverse().map(function (x) { run += x.kind === 'debit' ? +x.amount : -x.amount; return [dt(x.created_at), x.note || x.ref_type || '', x.kind === 'debit' ? +x.amount : '', x.kind === 'credit' ? +x.amount : '', run]; });
  const tD = r.entries.reduce(function (a, x) { return a + (x.kind === 'debit' ? +x.amount : 0); }, 0), tC = r.entries.reduce(function (a, x) { return a + (x.kind === 'credit' ? +x.amount : 0); }, 0);
  const doc = function () { return { title: 'كشف حساب آجل', subtitle: r.customer.name + (r.customer.phone ? ' · ' + r.customer.phone : ''), file: 'كشف_حساب_' + r.customer.name, signature: true,
    kpis: [['العميل', h(r.customer.name)], ['إجمالي المدين', money(tD)], ['إجمالي التحصيل', money(tC)], ['الرصيد المستحق', money(r.customer.balance)], ['حد الآجل', +r.customer.credit_limit ? money(r.customer.credit_limit) : 'بلا حد']],
    sections: [{ title: 'الحركات', sheet: 'كشف الحساب', table: { headers: ['التاريخ', 'البيان', 'مدين', 'دائن (تحصيل)', 'الرصيد'], rows: lines, money: [2, 3, 4], foot: ['الإجمالي', '', tD, tC, +r.customer.balance], empty: 'لا توجد حركات' } }] }; };
  bModal({ title: 'كشف آجل: ' + r.customer.name, icon: 'book', xwide: true, sub: 'الرصيد الحالي: ' + money(r.customer.balance),
    body: bTable([{ label: 'التاريخ', r: function (x) { return dt(x.created_at); } }, { label: 'البيان', r: function (x) { return h(x.note || x.ref_type); } }, { label: 'مدين', num: true, r: function (x) { return x.kind === 'debit' ? money(x.amount) : ''; } }, { label: 'دائن (تحصيل)', num: true, r: function (x) { return x.kind === 'credit' ? money(x.amount) : ''; } }, { label: 'بواسطة', r: function (x) { return h(x.actor); } }], r.entries),
    foot: '<button class="btn btn-cancel" data-x>إغلاق</button><button class="btn btn-outline" data-act="p"><i class="fas fa-print"></i> طباعة الكشف</button><button class="btn btn-outline" data-act="w"><i class="fas fa-file-word"></i> Word</button><button class="btn btn-outline" data-act="x"><i class="fas fa-file-excel"></i> Excel</button>' + (r.customer.phone ? '<a class="btn btn-outline" target="_blank" href="https://wa.me/' + h(String(r.customer.phone).replace(/\D/g, '')) + '?text=' + encodeURIComponent('مرحباً ' + r.customer.name + '، رصيد حسابك الآجل لدى ' + (B.acc.restaurantName || '') + ': ' + money(r.customer.balance)) + '"><i class="fab fa-whatsapp"></i> تذكير</a>' : '') + '<button class="btn btn-success" data-act="pay">تحصيل</button>',
    actions: { p: function () { rptPrint(doc()); }, w: function () { rptWord(doc()); }, x: function () { rptExcel(doc()).catch(function (e) { showToast(e.message, true); }); }, pay: function (m) { m.close(); ledgerPay(r.customer, function () { ledgerCustomer(id); }); } } });
}

// ---------- التسويق: الخصومات، الولاء، بطاقة Google ----------
bizPage('marketing', { group: 'crm', title: 'العروض والتسويق', icon: 'bullhorn', feature: 'discounts', perms: ['marketing'], plan: 'pro',
  pitch: 'خصومات وعروض بأكواد وفترات زمنية، إعداد برنامج الولاء، بطاقة تقييمات Google قابلة للطباعة.',
  render: async function (body) {
    body.innerHTML = subTabs('mkSub', [['disc', 'الخصومات والعروض', 'tags'], ['loyalty', 'برنامج الولاء', 'star', !hasF('loyalty')], ['google', 'بطاقة تقييمات Google', 'google', !hasF('google_card')]], 'disc') + '<div id="mkBody"></div>';
    const el = body.querySelector('#mkBody');
    bindSubTabs(body, 'mkSub', function (k) { ({ disc: discountsView, loyalty: loyaltyView, google: googleView })[k](el); });
    discountsView(el);
  } });
async function discountsView(el) {
  el.innerHTML = '<div class="biz-toolbar"><span class="grow"></span><button class="btn btn-primary btn-sm" id="dsNew"><i class="fas fa-plus"></i> عرض جديد</button></div><div id="dsList"></div>';
  const [rows, prods] = await Promise.all([entList('discounts'), hasF('inventory') ? entList('products', { activeOnly: true }) : Promise.resolve([])]);
  const cats = [...new Set(prods.map(function (p) { return p.category; }).filter(Boolean))];
  const F = function () { return [{ k: 'name', label: 'اسم العرض', req: true }, { k: 'code', label: 'كود الخصم (اختياري)', ltr: true, hint: 'اتركه فارغاً ليظهر العرض مباشرة في الكاشير' },
    { k: 'kind', label: 'النوع', type: 'select', options: [['percent', 'نسبة %'], ['amount', 'مبلغ ثابت']] }, { k: 'value', label: 'القيمة', type: 'number', req: true },
    { k: 'applies_to', label: 'يطبق على', type: 'select', options: [['order', 'الطلب كاملاً'], ['category', 'تصنيف'], ['product', 'منتج']] },
    { k: 'target', label: 'التصنيف / المنتج', type: 'select', options: [['', '—']].concat(cats.map(function (c) { return [c, 'تصنيف: ' + c]; })).concat(prods.map(function (p) { return [p.id, 'منتج: ' + p.name]; })) },
    { k: 'min_total', label: 'حد أدنى للطلب', type: 'number', def: 0 }, { k: 'starts_at', label: 'يبدأ', type: 'date' }, { k: 'ends_at', label: 'ينتهي', type: 'date' }, { k: 'active', label: 'فعّال', type: 'checkbox', def: true }]; };
  const draw = function () {
    el.querySelector('#dsList').innerHTML = bTable([{ label: 'العرض', r: function (d) { return '<b>' + h(d.name) + '</b>'; } }, { label: 'الكود', r: function (d) { return d.code ? '<span dir="ltr" style="font-family:monospace">' + h(d.code) + '</span>' : '—'; } }, { label: 'القيمة', r: function (d) { return nf(d.value, d.value % 1 ? 2 : 0) + (d.kind === 'percent' ? '%' : ' ' + h(curName())); } },
      { label: 'على', r: function (d) { return d.applies_to === 'order' ? 'الطلب' : d.applies_to === 'category' ? 'تصنيف ' + h(d.target) : 'منتج ' + h((prods.find(function (p) { return p.id === d.target; }) || {}).name || ''); } }, { label: 'الفترة', r: function (d) { return (d.starts_at ? dOnly(d.starts_at) : '…') + ' ← ' + (d.ends_at ? dOnly(d.ends_at) : '…'); } },
      { label: 'الحالة', r: function (d) { return d.active ? '<span class="badge badge-success">فعّال</span>' : '<span class="badge badge-dog">موقوف</span>'; } }, { label: '', r: function (d) { return '<button class="ico-btn" data-e="' + d.id + '"><i class="fas fa-pen"></i></button><button class="ico-btn danger" data-d="' + d.id + '"><i class="fas fa-trash"></i></button>'; } }], rows, { empty: 'لا توجد عروض بعد' });
  };
  const save = function (d0) { bPrompt(d0 ? 'تعديل عرض' : 'عرض جديد', F(), d0 || {}, async function (d) { if (d0) d.id = d0.id; d.starts_at = d.starts_at || null; d.ends_at = d.ends_at || null; await entSave('discounts', d); discountsView(el); }, { icon: 'tags', wide: true }); };
  el.querySelector('#dsNew').onclick = function () { save(null); };
  el.querySelector('#dsList').onclick = async function (e) { const ed = e.target.closest('[data-e]'), d = e.target.closest('[data-d]'); if (ed) save(rows.find(function (x) { return x.id === ed.dataset.e; })); if (d && await entDel('discounts', d.dataset.d, 'العرض')) discountsView(el); };
  draw();
}
async function saveBiz(section, data) { const s = {}; s[section] = data; const r = await bzOk('saveBizSettings', { settings: s }); if (B.acc) B.acc.biz = r.settings || Object.assign({}, B.acc.biz, s); showToast('تم حفظ الإعدادات'); return r; }
function settingsForm(el, section, fields, intro, extra) {
  const v = (B.acc.biz && B.acc.biz[section]) || {};
  el.innerHTML = (intro ? '<div class="biz-card"><p class="muted" style="line-height:1.9">' + intro + '</p></div>' : '') + '<div class="biz-card">' + bForm(fields, v) + '<div style="margin-top:14px;text-align:left"><button class="btn btn-primary" id="sfSave"><i class="fas fa-save"></i> حفظ</button></div></div>' + (extra || '');
  el.querySelector('#sfSave').onclick = async function () { await saveBiz(section, Object.assign({}, (B.acc.biz && B.acc.biz[section]) || v, readForm(el, fields))); };
}
function loyaltyView(el) {
  settingsForm(el, 'loyalty', [{ k: 'enabled', label: 'تفعيل برنامج الولاء', type: 'checkbox', full: true }, { k: 'pointsPerUnit', label: 'نقاط لكل 1 ' + (B.acc.currency || '') + ' مدفوع', type: 'number', hint: 'مثال: 1 = نقطة لكل وحدة عملة' }, { k: 'pointValue', label: 'قيمة النقطة عند الاستبدال', type: 'number', hint: 'مثال: 0.05 = كل 20 نقطة تساوي 1' }, { k: 'minRedeem', label: 'أقل عدد نقاط للاستبدال', type: 'number' }],
    'يكسب العميل نقاطاً تلقائياً مع كل فاتورة مرتبطة باسمه في الكاشير، ويستطيع استبدالها كطريقة دفع «نقاط». يمكن للعميل معرفة رصيده من تطبيق المطعم برقم جواله.');
}
function googleView(el) {
  const v = (B.acc.biz && B.acc.biz.google) || {};
  settingsForm(el, 'google', [{ k: 'reviewUrl', label: 'رابط التقييم في Google', ltr: true, full: true, hint: 'من Google Business Profile ← «اطلب تقييمات» ← انسخ الرابط' }, { k: 'placeName', label: 'اسم النشاط على Google' }, { k: 'headline', label: 'عنوان البطاقة', def: 'قيّم تجربتك معنا على Google' }],
    'بطاقة بها رمز QR تقود العميل مباشرة لصفحة تقييمك على Google. تظهر أيضاً في المينيو الإلكتروني وتطبيق المطعم بعد الحفظ.',
    '<div class="biz-card"><h4>معاينة البطاقة</h4><div id="gcPrev"></div><button class="btn btn-outline" id="gcPrint" style="margin-top:10px"><i class="fas fa-print"></i> طباعة البطاقة</button></div>');
  const card = function () {
    const g = Object.assign({}, v, readForm(el, [{ k: 'reviewUrl' }, { k: 'placeName' }, { k: 'headline' }]));
    return '<div style="background:#fff;color:#202124;border-radius:16px;padding:20px;text-align:center;max-width:320px;margin:auto;font-family:Tahoma,Arial"><div style="font-size:28px;font-weight:bold"><span style="color:#4285F4">G</span><span style="color:#EA4335">o</span><span style="color:#FBBC05">o</span><span style="color:#4285F4">g</span><span style="color:#34A853">l</span><span style="color:#EA4335">e</span></div><div style="color:#FBBC05;font-size:22px">★★★★★</div><h3 style="margin:6px 0">' + h(g.headline || 'قيّم تجربتك معنا على Google') + '</h3>' + (g.reviewUrl ? '<img src="' + qrImg(g.reviewUrl, 300) + '" style="width:180px;height:180px">' : '<p style="color:#999">أضف رابط التقييم</p>') + '<div style="font-weight:bold;margin-top:6px">' + h(g.placeName || B.acc.restaurantName) + '</div><div style="font-size:12px;color:#5f6368">امسح الرمز بكاميرا الجوال</div></div>';
  };
  const draw = function () { el.querySelector('#gcPrev').innerHTML = card(); };
  el.addEventListener('change', draw); draw();
  el.querySelector('#gcPrint').onclick = function () { printHtml('بطاقة Google', card(), 'a4'); };
}
function notifyView(el) {
  settingsForm(el, 'notify', [{ k: 'lowStock', label: 'تنبيه انخفاض المخزون', type: 'checkbox' }, { k: 'reservations', label: 'تنبيه الحجوزات القريبة والجديدة', type: 'checkbox' }, { k: 'birthdays', label: 'أعياد ميلاد العملاء (اليوم)', type: 'checkbox' }, { k: 'credit', label: 'ديون الآجل المتأخرة', type: 'checkbox' }, { k: 'giftExpiry', label: 'بطاقات هدايا تنتهي قريباً', type: 'checkbox' }, { k: 'cashMoves', label: 'حركات صندوق الكاشير بانتظار اعتماد المحاسب', type: 'checkbox' }],
    'تظهر الإشعارات في جرس أعلى الشاشة وتُحدّث تلقائياً كل دقيقة ونصف: طلبات المينيو الجديدة، المخزون المنخفض، الحجوزات، الطلبات الجاهزة في المطبخ، وتجديد الاشتراك.');
}
