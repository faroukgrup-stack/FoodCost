// ============================================================
// biz-fin.js — المالية والمصروفات، التقارير والربحية، عروض الأسعار، الفريق والفروع، الحضور الرقمي، الإعدادات، الباقات
// ============================================================
const EXP_CATS = ['إيجار', 'رواتب', 'كهرباء ومياه', 'غاز', 'صيانة', 'تسويق', 'نظافة', 'نقل وتوصيل', 'مستلزمات', 'رسوم واشتراكات', 'عام'];
var BZ_CHARTS = [];
function bzChart(canvas, cfg) {
  if (typeof Chart === 'undefined' || !canvas) return;
  BZ_CHARTS = BZ_CHARTS.filter(function (c) { if (!document.body.contains(c.canvas)) { c.destroy(); return false; } return true; });
  Chart.defaults.color = '#aab7d4'; Chart.defaults.font.family = 'inherit';
  BZ_CHARTS.push(new Chart(canvas, cfg));
}
const PALETTE = ['#b48554', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#64748b'];

// ---------- المالية ----------
bizPage('finance', { group: 'fin', title: 'الحسابات والمصروفات', icon: 'wallet', feature: 'finance', perms: ['finance'], plan: 'pro',
  pitch: 'المصروفات اليومية والتشغيلية، الفواتير الإلكترونية، الورديات، وعروض الأسعار في الباقة المتقدمة.',
  render: async function (body) {
    body.innerHTML = subTabs('fnSub', [['exp', 'المصروفات', 'money-bill-wave'], ['inv', 'الفواتير الإلكترونية', 'file-invoice'], ['shifts', 'الورديات', 'user-clock', !hasF('shifts')], ['drawers', 'الصناديق حسب الفرع والكاشير', 'cash-register', !hasF('shifts') || !(B.acc.isOwner || canP('team', 'finance'))], ['quotes', 'عروض الأسعار', 'file-signature', !hasF('quotes')]], 'exp') + '<div id="fnBody"></div>';
    const el = body.querySelector('#fnBody');
    bindSubTabs(body, 'fnSub', function (k) { ({ exp: expensesView, inv: invoicesView, shifts: shiftsView, drawers: drawersView, quotes: quotesView })[k](el); });
    expensesView(el);
  } });
function expensesView(el) {
  el.innerHTML = dateRangeBar('exRange', daysAgo(29), isoLocal(), '<button class="btn btn-success btn-sm" type="button" id="exNew"><i class="fas fa-plus"></i> مصروف</button>') + '<div id="exList"></div>';
  const get = bindRange(el, 'exRange', load);
  const F = [{ k: 'category', label: 'البند', type: 'select', options: EXP_CATS }, { k: 'amount', label: 'المبلغ', type: 'number', req: true }, { k: 'tax', label: 'منها ضريبة', type: 'number', def: 0 }, { k: 'method', label: 'طريقة الدفع', type: 'select', options: [['cash', 'نقداً (من الدرج)'], ['card', 'بطاقة'], ['transfer', 'تحويل']] }, { k: 'spent_at', label: 'التاريخ', type: 'date', def: isoLocal() }, { k: 'note', label: 'الوصف', full: true }];
  el.querySelector('#exNew').onclick = function () { bPrompt('مصروف جديد', F, {}, async function (d) { await entSave('expenses', d); load(); }, { icon: 'money-bill-wave', sub: 'المصروف النقدي يُخصم من نقدية الوردية المفتوحة' }); };
  let rows = [];
  async function load(f) {
    rows = await entList('expenses', f || get());
    const by = {}; rows.forEach(function (x) { by[x.category] = (by[x.category] || 0) + +x.amount; });
    el.querySelector('#exList').innerHTML = kpis([['إجمالي المصروفات', money(rows.reduce(function (s, x) { return s + +x.amount; }, 0)), rows.length + ' عملية']].concat(Object.entries(by).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 4).map(function (x) { return [x[0], money(x[1])]; }))) +
      bTable([{ label: 'التاريخ', r: function (x) { return dOnly(x.spent_at); } }, { label: 'البند', r: function (x) { return h(x.category); } }, { label: 'الوصف', r: function (x) { return h(x.note); } }, { label: 'الطريقة', r: function (x) { return h(PAY_NAMES[x.method] || x.method); } }, { label: 'المبلغ', num: true, r: function (x) { return money(x.amount); } }, { label: 'بواسطة', r: function (x) { return h(x.created_by); } }, { label: '', r: function (x) { return '<button class="ico-btn" data-e="' + x.id + '"><i class="fas fa-pen"></i></button><button class="ico-btn danger" data-d="' + x.id + '"><i class="fas fa-trash"></i></button>'; } }], rows, { empty: 'لا توجد مصروفات في هذه الفترة' });
  }
  el.querySelector('#exList') && (el.onclick = async function (e) {
    const ed = e.target.closest('#exList [data-e]'), d = e.target.closest('#exList [data-d]');
    if (ed) { const x = rows.find(function (y) { return y.id === ed.dataset.e; }); bPrompt('تعديل مصروف', F, x, async function (dd) { dd.id = x.id; await entSave('expenses', dd); load(); }); }
    if (d && await entDel('expenses', d.dataset.d, 'المصروف')) load();
  });
  load();
}
function shiftsView(el) {
  el.innerHTML = dateRangeBar('shRange', daysAgo(13), isoLocal(), '<select data-f="status"><option value="">الكل</option><option value="open">مفتوحة</option><option value="closed">مغلقة</option></select>') + '<div id="shList"></div>';
  const get = bindRange(el, 'shRange', load);
  async function load(f) {
    const rows = await entList('shifts', f || get());
    el.querySelector('#shList').innerHTML = bTable([{ label: 'الموظف', r: function (s) { return '<b>' + h(s.staff_name) + '</b>'; } }, { label: 'الفتح', r: function (s) { return dt(s.opened_at); } }, { label: 'الإغلاق', r: function (s) { return s.closed_at ? dt(s.closed_at) : '<span class="badge badge-success">مفتوحة</span>'; } }, { label: 'الافتتاحي', num: true, r: function (s) { return money(s.opening_cash); } },
      { label: 'المبيعات', num: true, r: function (s) { return s.summary && s.summary.sales !== undefined ? money(s.summary.sales) : '—'; } }, { label: 'المتوقع', num: true, r: function (s) { return s.status === 'closed' ? money(s.expected_cash) : '—'; } }, { label: 'الفعلي', num: true, r: function (s) { return s.status === 'closed' ? money(s.closing_cash) : '—'; } },
      { label: 'الفرق', num: true, r: function (s) { if (s.status !== 'closed') return '—'; const d = s.closing_cash - s.expected_cash; return '<b style="color:' + (Math.abs(d) < 0.01 ? '#6ee7b7' : d < 0 ? '#f87171' : '#fbbf24') + '">' + money(d) + '</b>'; } },
      { label: '', r: function (s) { return '<button class="ico-btn" data-r="' + s.id + '" title="التقرير"><i class="fas fa-file-alt"></i></button>' + (s.status === 'open' && (B.acc.isOwner || canP('team')) ? '<button class="btn btn-danger btn-sm" data-c="' + s.id + '">إغلاق</button>' : ''); } }], rows, { empty: 'لا توجد ورديات' });
    el.querySelector('#shList').onclick = function (e) {
      const r = e.target.closest('[data-r]'), c = e.target.closest('[data-c]');
      if (r) shiftReportModal(r.dataset.r);
      if (c) bPrompt('إغلاق وردية', [{ k: 'closingCash', label: 'النقدية الفعلية', type: 'number', req: true }, { k: 'notes', label: 'ملاحظات', full: true }], {}, async function (d) { await bzOk('shiftClose', Object.assign({ id: c.dataset.c }, d)); showToast('تم الإغلاق'); load(); });
    };
  }
  load();
}
function quotesView(el) {
  el.innerHTML = dateRangeBar('qtRange', daysAgo(59), isoLocal(), '<button class="btn btn-success btn-sm" type="button" id="qtNew"><i class="fas fa-plus"></i> عرض سعر</button>') + '<div id="qtList"></div>';
  const get = bindRange(el, 'qtRange', load);
  el.querySelector('#qtNew').onclick = function () { quoteEdit(null, load); };
  let rows = [];
  async function load(f) {
    rows = await entList('quotes', f || get());
    el.querySelector('#qtList').innerHTML = bTable([{ label: '#', r: function (q) { return q.number; } }, { label: 'التاريخ', r: function (q) { return dOnly(q.created_at); } }, { label: 'العميل', r: function (q) { return h(q.customer_name || '—'); } }, { label: 'صالح حتى', r: function (q) { return q.valid_until ? dOnly(q.valid_until) : '—'; } }, { label: 'الإجمالي', num: true, r: function (q) { return money(q.total); } },
      { label: 'الحالة', r: function (q) { return stBadge({ draft: ['مسودة', 'badge-info'], sent: ['مرسل', 'badge-warning'], accepted: ['مقبول', 'badge-success'], rejected: ['مرفوض', 'badge-dog'], converted: ['تحول لطلب', 'badge-cash'] }, q.status); } },
      { label: '', r: function (q) { return '<button class="ico-btn" data-p="' + q.id + '" title="طباعة"><i class="fas fa-print"></i></button>' + (q.status !== 'converted' ? '<button class="ico-btn" data-e="' + q.id + '"><i class="fas fa-pen"></i></button><button class="btn btn-success btn-sm" data-cv="' + q.id + '">تحويل لطلب</button>' : ''); } }], rows, { empty: 'لا توجد عروض أسعار' });
    el.querySelector('#qtList').onclick = async function (e) {
      const g = function (a) { const b = e.target.closest('[data-' + a + ']'); return b ? rows.find(function (x) { return x.id === b.dataset[a]; }) : null; };
      let q;
      for (const q of [g('p')].filter(Boolean)) quotePrint(q);
      for (const q of [g('e')].filter(Boolean)) quoteEdit(q, load);
      for (const q of [g('cv')].filter(Boolean)) if (await bConfirm('تحويل عرض السعر #' + q.number + ' إلى طلب مفتوح في الكاشير؟')) { const r = await bzOk('quoteConvert', { id: q.id }); showToast('تم إنشاء الطلب #' + r.order.number); POS.o = null; load(); }
    };
  }
  load();
}
async function quoteEdit(q, after) {
  const boot = await bzOk('posBootstrap', {});
  const lines = q ? (q.items || []).map(function (l) { return { productId: l.productId, name: l.name, qty: l.qty, unitPrice: l.unit }; }) : [];
  const m = bModal({ title: q ? 'تعديل عرض سعر #' + q.number : 'عرض سعر جديد', icon: 'file-signature', xwide: true,
    body: bForm([{ k: 'customerName', label: 'اسم العميل / الجهة', req: true }, { k: 'phone', label: 'الجوال', ltr: true }, { k: 'validUntil', label: 'صالح حتى', type: 'date', def: isoLocal(new Date(Date.now() + 14 * 864e5)) }, { k: 'notes', label: 'شروط وملاحظات', full: true, type: 'textarea', rows: 2 }], q ? { customerName: q.customer_name, phone: q.phone, validUntil: q.valid_until, notes: q.notes } : {}) +
      '<div class="biz-toolbar" style="margin-top:12px"><select class="biz-branch-sel grow" id="qtSel"><option value="">— أضف منتجاً —</option>' + boot.products.map(function (p, i) { return '<option value="' + i + '">' + h(p.name) + ' · ' + money(p.price) + '</option>'; }).join('') + '</select></div><div id="qtLines"></div>',
    foot: '<button class="btn btn-cancel" data-x>إلغاء</button><button class="btn btn-primary" data-act="save"><i class="fas fa-save"></i> حفظ</button>',
    actions: { save: async function (mm, btn) {
      const d = readForm(mm.el, [{ k: 'customerName' }, { k: 'phone' }, { k: 'validUntil' }, { k: 'notes' }]);
      if (!d.customerName) { showToast('اسم العميل مطلوب', true); return; }
      btn.disabled = true;
      try { await bzOk('quoteSave', { quote: Object.assign({ id: q ? q.id : undefined, items: lines.map(function (l) { return { productId: l.productId, name: l.name, qty: l.qty, unitPrice: l.unitPrice }; }) }, d) }); mm.close(); showToast('تم الحفظ'); after(); } catch (e) { } finally { btn.disabled = false; }
    } } });
  const draw = function () {
    m.$('#qtLines').innerHTML = bTable([{ label: 'الصنف', r: function (l) { return h(l.name); } }, { label: 'الكمية', r: function (l, i) { return '<input type="number" step="any" class="biz-search" style="min-width:0;width:90px" data-q="' + i + '" value="' + l.qty + '">'; } }, { label: 'السعر', r: function (l, i) { return '<input type="number" step="any" class="biz-search" style="min-width:0;width:100px" data-u="' + i + '" value="' + l.unitPrice + '">'; } }, { label: 'الإجمالي', num: true, r: function (l) { return money(l.qty * l.unitPrice); } }, { label: '', r: function (l, i) { return '<button class="ico-btn danger" data-rm="' + i + '"><i class="fas fa-times"></i></button>'; } }], lines, { empty: 'أضف أصنافاً' }) +
      '<div style="text-align:left;font-weight:800;margin-top:6px">المجموع قبل الضريبة: ' + money(lines.reduce(function (s, l) { return s + l.qty * l.unitPrice; }, 0)) + '</div>';
  };
  m.$('#qtSel').onchange = function (e) { if (e.target.value === '') return; const p = boot.products[+e.target.value]; lines.push({ productId: p.id, name: p.name, qty: 1, unitPrice: +p.price }); e.target.value = ''; draw(); };
  m.$('#qtLines').addEventListener('change', function (e) { if (e.target.dataset.q) lines[+e.target.dataset.q].qty = parseFloat(e.target.value) || 0; if (e.target.dataset.u) lines[+e.target.dataset.u].unitPrice = parseFloat(e.target.value) || 0; draw(); });
  m.$('#qtLines').addEventListener('click', function (e) { const b = e.target.closest('[data-rm]'); if (b) { lines.splice(+b.dataset.rm, 1); draw(); } });
  draw();
}
function quotePrint(q) {
  const biz = B.acc.biz || {}, bs = biz.business || {}, tx = biz.tax || {};
  printHtml('عرض سعر ' + q.number, '<style>body{width:190mm;font-size:13px}td,th{padding:6px}</style>' + (bs.logo ? '<div class="c"><img src="' + h(bs.logo) + '" style="max-height:70px"></div>' : '') + '<h2>' + h(bs.legalName || B.acc.restaurantName) + '</h2>' + (tx.number ? '<div class="c">الرقم الضريبي: ' + h(tx.number) + '</div>' : '') + (bs.address ? '<div class="c">' + h(bs.address) + ' · ' + h(bs.phone || '') + '</div>' : '') +
    '<h2 style="margin-top:12px">عرض سعر رقم ' + q.number + '</h2><table><tr><td>التاريخ: ' + dOnly(q.created_at) + '</td><td class="l">صالح حتى: ' + (q.valid_until ? dOnly(q.valid_until) : '—') + '</td></tr><tr><td colspan="2">السادة: <b>' + h(q.customer_name) + '</b> ' + h(q.phone || '') + '</td></tr></table><br>' +
    '<table><tr><th>#</th><th>الصنف</th><th class="c">الكمية</th><th class="l">السعر</th><th class="l">الإجمالي</th></tr>' + (q.items || []).map(function (l, i) { return '<tr><td>' + (i + 1) + '</td><td>' + h(l.name) + '</td><td class="c">' + nf(l.qty, l.qty % 1 ? 2 : 0) + '</td><td class="l">' + money(l.unit) + '</td><td class="l">' + money(l.gross) + '</td></tr>'; }).join('') + '</table>' +
    '<table style="width:50%;margin-right:auto"><tr class="tot"><td>المجموع</td><td class="l">' + money(q.subtotal) + '</td></tr>' + (+q.discount_total ? '<tr class="tot"><td>الخصم</td><td class="l">' + money(q.discount_total) + '</td></tr>' : '') + (tx.enabled ? '<tr class="tot"><td>الضريبة</td><td class="l">' + money(q.tax_total) + '</td></tr>' : '') + '<tr class="tot" style="font-size:16px"><td>الإجمالي</td><td class="l">' + money(q.total) + ' ' + h(curName()) + '</td></tr></table>' + (q.notes ? '<p>' + h(q.notes) + '</p>' : ''), 'a4');
}

// ---------- التقارير ----------
bizPage('reports', { group: 'fin', title: 'التقارير المالية', icon: 'chart-line', feature: 'reports', perms: ['finance', 'reports'], plan: 'pro',
  pitch: 'تقارير المبيعات والضريبة وطرق الدفع والموظفين والأصناف الأكثر مبيعاً، وقائمة الدخل المبسطة، وتقارير الربحية في الباقة المتقدمة.',
  render: async function (body) {
    body.innerHTML = subTabs('rpSub', [['fin', 'التقرير المالي', 'chart-line'], ['profit', 'تقارير الربحية', 'coins', !hasF('profit_reports')], ['ops', 'مؤشرات الأداء التشغيلي', 'stopwatch', !hasF('pos')], ['activity', 'سجل النشاط', 'history', !hasF('activity')]], 'fin') + '<div id="rpBody"></div>';
    const el = body.querySelector('#rpBody');
    bindSubTabs(body, 'rpSub', function (k) { ({ fin: finReportView, profit: profitView, ops: opsView, activity: activityView })[k](el); });
    finReportView(el);
  } });
function branchFilter() { return B.acc.branches && B.acc.branches.length > 1 && (B.acc.isOwner || !B.acc.staff.branchId) ? '<select data-f="branchId"><option value="' + h(B.branch) + '">الفرع الحالي</option><option value="all">كل الفروع</option></select>' : ''; }
function finReportView(el) {
  el.innerHTML = dateRangeBar('frRange', daysAgo(29), isoLocal(), branchFilter()) + '<div id="frBody"></div>';
  const get = bindRange(el, 'frRange', load);
  async function load(f) {
    const r = await bzOk('financeReport', f || get());
    const s = r.summary;
    el.querySelector('#frBody').innerHTML = rptButtons('frX') + kpis([['صافي المبيعات', money(s.netSales), s.invoices + ' فاتورة'], ['متوسط الفاتورة', money(s.avgTicket)], ['الضريبة المحصلة', money(s.tax)], ['الخصومات', money(s.discounts)], ['المرتجعات', money(s.refunds), '', s.refunds ? '#f87171' : ''], ['مجمل الربح', money(s.grossProfit), 'هامش ' + nf(s.grossMargin, 1) + '%', '#6ee7b7'], ['صافي الربح', money(s.netProfit), '', s.netProfit >= 0 ? '#6ee7b7' : '#f87171']]) +
      '<div class="biz-grid-2"><div class="biz-card"><h4>المبيعات اليومية</h4><div class="chart-box"><canvas id="chDay"></canvas></div></div><div class="biz-card"><h4>طرق الدفع</h4><div class="chart-box"><canvas id="chPay"></canvas></div></div></div>' +
      '<div class="biz-grid-2"><div class="biz-card"><h4>قائمة الدخل المبسطة</h4>' + bTable([{ label: 'البند', r: function (x) { return x[2] ? '<b>' + h(x[0]) + '</b>' : h(x[0]); } }, { label: 'المبلغ', num: true, r: function (x) { return x[2] ? '<b>' + money(x[1]) + '</b>' : money(x[1]); } }],
        [['إجمالي المبيعات', s.grossSales], ['(-) المرتجعات', -s.refunds], ['(-) الضريبة', -s.tax], ['صافي المبيعات بدون ضريبة', s.netSalesExTax, 1], ['(-) تكلفة المبيعات', -s.cogs], ['مجمل الربح', s.grossProfit, 1], ['(-) المصروفات', -s.expenses], ['(-) الهدر والتالف', -s.waste], ['صافي الربح', s.netProfit, 1]].concat(s.purchases ? [['المشتريات خلال الفترة (للعلم)', s.purchases]] : [])) + '</div>' +
      '<div class="biz-card"><h4>الأصناف الأكثر مبيعاً</h4>' + bTable([{ label: 'الصنف', r: function (p) { return h(p.name); } }, { label: 'الكمية', num: true, r: function (p) { return nf(p.qty, p.qty % 1 ? 2 : 0); } }, { label: 'الإيراد', num: true, r: function (p) { return money(p.revenue); } }], r.topProducts) + '</div></div>' +
      '<div class="biz-grid-3"><div class="biz-card"><h4>حسب نوع الطلب</h4>' + bTable([{ label: 'النوع', r: function (x) { return h(ORDER_TYPES[x[0]] || x[0]); } }, { label: 'المبيعات', num: true, r: function (x) { return money(x[1]); } }], Object.entries(r.byType || {})) + '</div>' +
      '<div class="biz-card"><h4>حسب الموظف</h4>' + bTable([{ label: 'الموظف', r: function (x) { return h(x.name); } }, { label: 'المبيعات', num: true, r: function (x) { return money(x.total); } }], r.byStaff) + '</div>' +
      '<div class="biz-card"><h4>المصروفات حسب البند</h4>' + bTable([{ label: 'البند', r: function (x) { return h(x.category); } }, { label: 'المبلغ', num: true, r: function (x) { return money(x.total); } }], r.expensesByCategory) + '</div></div>' +
      '';
    bzChart(el.querySelector('#chDay'), { type: 'bar', data: { labels: r.byDay.map(function (d) { return d.day.slice(5); }), datasets: [{ label: 'المبيعات', data: r.byDay.map(function (d) { return d.sales; }), backgroundColor: '#b48554', borderRadius: 6 }, { label: 'المرتجعات', data: r.byDay.map(function (d) { return d.refunds; }), backgroundColor: '#ef4444', borderRadius: 6 }] }, options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } } });
    const pm = Object.entries(r.byMethod || {}).filter(function (x) { return x[1] > 0; });
    bzChart(el.querySelector('#chPay'), { type: 'doughnut', data: { labels: pm.map(function (x) { return PAY_NAMES[x[0]] || x[0]; }), datasets: [{ data: pm.map(function (x) { return x[1]; }), backgroundColor: PALETTE }] }, options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } } });
    const ff = f || get(); rptBind(el, 'frX', function () { return finReportDoc(r, ff); });
  }
  load();
}
function profitView(el) {
  el.innerHTML = dateRangeBar('pfRange', daysAgo(29), isoLocal(), branchFilter()) + '<div id="pfBody"></div>';
  const get = bindRange(el, 'pfRange', load);
  async function load(f) {
    const r = await bzOk('profitReport', f || get());
    const cols = function (lbl) { return [{ label: lbl, r: function (x) { return '<b>' + h(x.name) + '</b>'; } }, { label: 'الكمية', num: true, r: function (x) { return nf(x.qty, x.qty % 1 ? 2 : 0); } }, { label: 'الإيراد', num: true, r: function (x) { return money(x.revenue); } }, { label: 'التكلفة', num: true, r: function (x) { return money(x.cost); } }, { label: 'الربح', num: true, r: function (x) { return '<b style="color:' + (x.profit >= 0 ? '#6ee7b7' : '#f87171') + '">' + money(x.profit) + '</b>'; } }, { label: 'الهامش', num: true, r: function (x) { return nf(x.margin, 1) + '%'; } }]; };
    el.querySelector('#pfBody').innerHTML = rptButtons('pfX') + kpis([['الإيراد (بدون ضريبة)', money(r.total.revenue)], ['التكلفة', money(r.total.cost)], ['الربح', money(r.total.profit), '', '#6ee7b7'], ['هامش الربح', nf(r.total.margin, 1) + '%']]) +
      '<div class="biz-card"><h4>الربح اليومي</h4><div class="chart-box"><canvas id="chPf"></canvas></div></div>' +
      (r.branches.length > 1 ? '<div class="biz-card"><h4>الربحية حسب الفرع</h4>' + bTable(cols('الفرع'), r.branches) + '</div>' : '') +
      '<div class="biz-card"><h4>الربحية حسب التصنيف</h4>' + bTable(cols('التصنيف'), r.categories) + '</div><div class="biz-card"><h4>الربحية حسب المنتج</h4>' + bTable(cols('المنتج'), r.products) + '</div>';
    bzChart(el.querySelector('#chPf'), { type: 'line', data: { labels: r.days.map(function (d) { return d.name.slice(5); }), datasets: [{ label: 'الإيراد', data: r.days.map(function (d) { return d.revenue; }), borderColor: '#b48554', tension: .3 }, { label: 'الربح', data: r.days.map(function (d) { return d.profit; }), borderColor: '#10b981', tension: .3 }] }, options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } } });
    const ff = f || get(); rptBind(el, 'pfX', function () { return profitDoc(r, ff); });
  }
  load();
}
function activityView(el) {
  el.innerHTML = dateRangeBar('acRange', daysAgo(6), isoLocal(), '<input data-f="q" class="biz-search" placeholder="بحث بالموظف أو الإجراء" style="min-width:160px">') + '<div id="acList"></div>';
  const get = bindRange(el, 'acRange', load);
  async function load(f) {
    const r = await bzOk('activityList', f || get(), { loading: false });
    el.querySelector('#acList').innerHTML = bTable([{ label: 'الوقت', r: function (a) { return dt(a.created_at); } }, { label: 'المستخدم', r: function (a) { return '<b>' + h(a.actor) + '</b> <span class="muted" style="font-size:.75rem">' + h(B.acc.roleNames[a.actor_role] || (a.actor_role === 'owner' ? 'المالك' : a.actor_role)) + '</span>'; } }, { label: 'الإجراء', r: function (a) { return h(a.action); } }, { label: 'التفاصيل', r: function (a) { return h(a.details); } }, { label: 'الفرع', r: function (a) { return h(a.branch_name || '—'); } }], r.rows, { empty: 'لا يوجد نشاط في هذه الفترة' });
  }
  load();
}

// ---------- الفريق والفروع ----------
const PERM_NAMES = { ops: 'إدارة التشغيل والفريق (SOP، الورديات، التقييم)', ops_check: 'تنفيذ تدقيق SOP والاستلام والتسليم', pos: 'الكاشير وأخذ الطلبات', pos_pay: 'استلام الدفع والتحصيل', orders_manage: 'إدارة الطلبات (خصم/إلغاء/استرجاع)', tables: 'الطاولات والحجوزات', kitchen: 'شاشة المطبخ', inventory: 'المخزون والمنتجات', purchasing: 'المشتريات والموردون', customers: 'العملاء والولاء', finance: 'الحسابات والمصروفات', reports: 'التقارير', team: 'الموظفون والورديات', costing: 'حساب التكلفة وهندسة المنيو', digital_menu: 'المينيو الإلكتروني', reviews: 'التقييمات', marketing: 'العروض والتسويق', settings: 'إعدادات النشاط', delivery: 'تطبيق السائق (التوصيل)', dispatch: 'متابعة التوصيل وإسناد السائقين' };
bizPage('team', { group: 'admin', title: 'الموظفون والفروع', icon: 'user-tie', feature: 'team', perms: ['team'], plan: 'pro',
  pitch: 'حسابات موظفين غير محدودة بصلاحيات دقيقة ودخول برمز PIN، الورديات، وإدارة الفروع (فرع واحد في الإنطلاقة، عدة فروع في المتقدمة).',
  render: async function (body) {
    body.innerHTML = subTabs('tmSub', [['staff', 'الموظفون', 'users'], ['branches', 'الفروع', 'store']], 'staff') + '<div id="tmBody"></div>';
    const el = body.querySelector('#tmBody');
    bindSubTabs(body, 'tmSub', function (k) { k === 'staff' ? staffView(el) : branchesView(el); });
    staffView(el);
  } });
async function staffView(el) {
  const rows = await entList('staff');
  const acc = B.acc;
  el.innerHTML = '<div class="biz-card"><p class="muted" style="line-height:1.9">يدخل الموظف من شاشة الدخول ← «موظف» باستخدام: <b dir="ltr">' + h(acc.publicId || currentUserEmail) + '</b> (رمز المطعم) + اسم المستخدم + رمز PIN.</p></div>' +
    '<div class="biz-toolbar"><span class="grow"></span><button class="btn btn-primary btn-sm" id="sfNew"><i class="fas fa-user-plus"></i> موظف جديد</button></div>' +
    bTable([{ label: 'الموظف', r: function (s) { return '<b>' + h(s.name) + '</b>'; } }, { label: 'اسم المستخدم', r: function (s) { return '<span dir="ltr">' + h(s.username) + '</span>'; } }, { label: 'الدور', r: function (s) { return h(acc.roleNames[s.role] || s.role); } }, { label: 'الفرع', r: function (s) { const b = (acc.branches || []).find(function (x) { return x.id === s.branch_id; }); return b ? h(b.name) : 'كل الفروع'; } },
      { label: 'الصلاحيات', r: function (s) { return '<span class="muted" style="font-size:.76rem">' + (s.permissions || []).map(function (p) { return PERM_NAMES[p] || p; }).join('، ') + '</span>'; } }, { label: 'آخر دخول', r: function (s) { return s.last_login ? dt(s.last_login) : '—'; } }, { label: 'الحالة', r: function (s) { return s.active ? '<span class="badge badge-success">فعّال</span>' : '<span class="badge badge-dog">موقوف</span>'; } },
      { label: '', r: function (s) { return '<button class="ico-btn" data-e="' + s.id + '"><i class="fas fa-pen"></i></button><button class="ico-btn danger" data-d="' + s.id + '"><i class="fas fa-trash"></i></button>'; } }], rows, { empty: 'لا يوجد موظفون — أضف الكاشير والنادل والمطبخ' });
  const edit = function (s) {
    const roleOpts = Object.keys(acc.rolePresets).concat(['custom']).filter(function (v, i, a) { return a.indexOf(v) === i; }).map(function (k) { return [k, acc.roleNames[k] || k]; });
    const permHtml = '<div class="biz-sec">الصلاحيات</div><div class="biz-form" id="permBox">' + acc.perms.filter(function (p) { return acc.isOwner || p !== 'settings'; }).map(function (p) { return '<label class="biz-check"><input type="checkbox" data-perm="' + p + '"> <span>' + h(PERM_NAMES[p] || p) + '</span></label>'; }).join('') + '</div>';
    const F = [{ k: 'name', label: 'الاسم', req: true }, { k: 'username', label: 'اسم المستخدم (إنجليزي)', req: true, ltr: true }, { k: 'pin', label: s ? 'رمز PIN جديد (اتركه فارغاً لعدم التغيير)' : 'رمز PIN (4 أرقام أو أكثر)', ltr: true, req: !s }, { k: 'phone', label: 'الجوال', ltr: true },
      { k: 'role', label: 'الدور', type: 'select', options: roleOpts, def: 'cashier' }, { k: 'branch_id', label: 'الفرع', type: 'select', options: [['', 'كل الفروع']].concat((acc.branches || []).map(function (b) { return [b.id, b.name]; })) }, { k: 'active', label: 'فعّال', type: 'checkbox', def: true }, { type: 'html', html: permHtml }];
    bPrompt(s ? 'تعديل موظف' : 'موظف جديد', F, s || {}, async function (d, m) {
      d.permissions = m.$$('[data-perm]').filter(function (x) { return x.checked; }).map(function (x) { return x.dataset.perm; });
      if (s) d.id = s.id; if (!d.pin) delete d.pin; if (!d.branch_id) d.branch_id = null;
      await entSave('staff', d); staffView(el);
    }, { wide: true, icon: 'user-tie', onOpen: function (m) {
      const set = function (list) { m.$$('[data-perm]').forEach(function (x) { x.checked = list.indexOf(x.dataset.perm) >= 0; }); };
      set(s ? (s.permissions || []) : (acc.rolePresets.cashier || []));
      m.$('[data-k=role]').onchange = function (e) { if (acc.rolePresets[e.target.value]) set(acc.rolePresets[e.target.value]); };
      m.$('#permBox').onchange = function () { m.$('[data-k=role]').value = 'custom'; };
    } });
  };
  el.querySelector('#sfNew').onclick = function () { edit(null); };
  el.onclick = async function (e) { const ed = e.target.closest('[data-e]'), d = e.target.closest('[data-d]'); if (ed) edit(rows.find(function (x) { return x.id === ed.dataset.e; })); if (d && await entDel('staff', d.dataset.d, 'الموظف')) staffView(el); };
}
async function branchesView(el) {
  const rows = await entList('branches');
  const multi = hasF('multi_branch');
  el.innerHTML = (multi ? '' : '<div class="biz-upsell"><div><b><i class="fas fa-store"></i> فرع واحد في باقة الإنطلاقة</b><p>لإضافة فروع متعددة مع تحويلات المخزون وتقارير الربحية لكل فرع، قم بالترقية إلى الباقة المتقدمة.' + (B.acc && B.acc.hiddenBranches ? '<br><b style="color:#fbbf24">لديك ' + B.acc.hiddenBranches + ' فرع مخفي من اشتراكك السابق — بياناته وطلباته ومخزونه محفوظة بالكامل وتعود فور الترقية للمتقدمة.</b>' : '') + '</p></div><button class="btn btn-primary btn-sm" onclick="bizUpgradeModal(\'premium\')">الترقية</button></div>') +
    '<div class="biz-toolbar"><span class="grow"></span>' + (multi ? '<button class="btn btn-primary btn-sm" id="brNew"><i class="fas fa-plus"></i> فرع جديد</button>' : '') + '</div>' +
    bTable([{ label: 'الفرع', r: function (b) { return '<b>' + h(b.name) + '</b>' + (b.is_main ? ' <span class="badge badge-info">الرئيسي</span>' : ''); } }, { label: 'العنوان', r: function (b) { return h(b.address); } }, { label: 'الهاتف', r: function (b) { return '<span dir="ltr">' + h(b.phone) + '</span>'; } }, { label: 'الحالة', r: function (b) { return b.active ? '<span class="badge badge-success">فعّال</span>' : '<span class="badge badge-dog">موقوف</span>'; } }, { label: '', r: function (b) { return '<button class="ico-btn" data-e="' + b.id + '"><i class="fas fa-pen"></i></button>' + (b.is_main ? '' : '<button class="ico-btn danger" data-d="' + b.id + '"><i class="fas fa-trash"></i></button>'); } }], rows);
  const F = [{ k: 'name', label: 'اسم الفرع', req: true }, { k: 'phone', label: 'الهاتف', ltr: true }, { k: 'address', label: 'العنوان', full: true }, { k: 'active', label: 'فعّال', type: 'checkbox', def: true }];
  const after = async function () { await loadAccount(); branchesView(el); };
  const nb = el.querySelector('#brNew'); if (nb) nb.onclick = function () { bPrompt('فرع جديد', F, {}, async function (d) { await entSave('branches', d); after(); }, { icon: 'store' }); };
  el.onclick = async function (e) { const ed = e.target.closest('[data-e]'), d = e.target.closest('[data-d]'); if (ed) { const b = rows.find(function (x) { return x.id === ed.dataset.e; }); bPrompt('تعديل فرع', F, b, async function (dd) { dd.id = b.id; await entSave('branches', dd); after(); }); } if (d && await entDel('branches', d.dataset.d, 'الفرع')) after(); };
}

// ---------- الحضور الرقمي: الطلب أونلاين، الشاشات، التطبيق الخاص ----------
function linkBox(url) { return '<div class="link-box"><input readonly value="' + h(url) + '"><button class="btn btn-outline btn-sm" onclick="navigator.clipboard.writeText(this.previousElementSibling.value);showToast(\'تم النسخ\')"><i class="fas fa-copy"></i></button><a class="btn btn-outline btn-sm" href="' + h(url) + '" target="_blank"><i class="fas fa-external-link-alt"></i></a></div>'; }
bizPage('presence', { group: 'admin', title: 'الطلب أونلاين والشاشات', icon: 'mobile-alt', feature: 'online_orders', perms: ['settings'], plan: 'pro',
  pitch: 'استقبال الطلبات من المينيو الإلكتروني مباشرة في الكاشير، QR لكل طاولة، شاشة المطبخ، شاشة حالة الطلبات، وتطبيق خاص باسم نشاطك.',
  render: async function (body) {
    body.innerHTML = subTabs('prSub', [['order', 'الطلب من المينيو', 'qrcode'], ['screens', 'شاشات المطبخ والطلبات', 'tv', !hasF('kitchen')], ['app', 'تطبيق باسم نشاطك', 'mobile-alt', !hasF('brand_app')]], 'order') + '<div id="prBody"></div>';
    const el = body.querySelector('#prBody');
    bindSubTabs(body, 'prSub', function (k) { ({ order: orderingView, screens: screensView, app: appView })[k](el); });
    orderingView(el);
  } });
function orderingView(el) {
  settingsForm(el, 'ordering', [{ k: 'enabled', label: 'تفعيل استقبال الطلبات من المينيو الإلكتروني', type: 'checkbox', full: true, hint: 'يظهر زر «إرسال الطلب للمطعم» في المينيو ويصل الطلب إلى الكاشير (طلبات المينيو) مع إشعار' }, { k: 'tableOrdering', label: 'السماح بالطلب من الطاولة (QR الطاولات)', type: 'checkbox' }, { k: 'requirePhone', label: 'إلزام العميل بإدخال رقم الجوال', type: 'checkbox' }],
    'رابط المينيو العام لمطعمك. استخدم QR الطاولات من صفحة الطاولات ← إدارة الطاولات لطباعة رمز خاص لكل طاولة.',
    '<div class="biz-card"><h4>رابط المينيو</h4>' + linkBox(menuPublicUrl()) + '<div class="qr-tiles" style="margin-top:12px"><div class="qr-tile"><img src="' + qrImg(menuPublicUrl(), 240) + '"><div>المينيو</div></div></div></div>');
}
function screensView(el) {
  const pid = encodeURIComponent(B.acc.publicId || currentUserEmail), br = encodeURIComponent(B.branch || '');
  const k = publicBase() + 'kitchen.html', board = publicBase() + 'order-status.html?r=' + pid + '&b=' + br;
  el.innerHTML = '<div class="biz-grid-2"><div class="biz-card"><h4><i class="fas fa-fire-burner"></i> شاشة المطبخ والتجهيز (KDS)</h4><p class="muted" style="line-height:1.9;margin-bottom:10px">افتحها على شاشة أو تابلت في المطبخ وسجّل الدخول بحساب موظف بدور «مطبخ». تصل الطلبات فوراً عند الضغط على «للمطبخ» في الكاشير، مع مؤقت لكل طلب وتنبيه صوتي.</p>' + linkBox(k) + '</div>' +
    '<div class="biz-card"><h4><i class="fas fa-tv"></i> شاشة حالة الطلبات للعملاء</h4><p class="muted" style="line-height:1.9;margin-bottom:10px">شاشة عامة تعرض أرقام الطلبات «قيد التحضير» و«جاهز للاستلام» لهذا الفرع. ضعها على تلفاز في منطقة الانتظار.</p>' + linkBox(board) + '</div></div>' +
    '<div class="biz-card"><h4>إعدادات الكاشير والمطبخ</h4>' + bForm([{ k: 'kitchenAuto', label: 'إرسال الطلب للمطبخ تلقائياً عند الدفع', type: 'checkbox' }], (B.acc.biz || {}).pos) + '<button class="btn btn-primary btn-sm" id="kSave" style="margin-top:10px">حفظ</button></div>';
  el.querySelector('#kSave').onclick = function () { saveBiz('pos', Object.assign({}, B.acc.biz.pos, readForm(el, [{ k: 'kitchenAuto', type: 'checkbox' }]))); };
}
function appView(el) {
  const url = publicBase() + 'app.html?r=' + encodeURIComponent(B.acc.publicId || currentUserEmail);
  settingsForm(el, 'app', [{ k: 'name', label: 'اسم التطبيق', ph: B.acc.restaurantName }, { k: 'shortName', label: 'الاسم المختصر (تحت الأيقونة)' }, { k: 'color', label: 'اللون الرئيسي', type: 'color', def: '#b48554' }, { k: 'bg', label: 'لون الخلفية', type: 'color', def: '#0b0e17' }, { k: 'icon', label: 'رابط الأيقونة / الشعار (مربع)', ltr: true, full: true }, { k: 'welcome', label: 'رسالة الترحيب', full: true },
    { k: 'phone', label: 'الهاتف / واتساب', ltr: true }, { k: 'instagram', label: 'رابط إنستغرام', ltr: true }, { k: 'maps', label: 'رابط الموقع على الخريطة', ltr: true, full: true }, { k: 'enableReservations', label: 'حجز طاولة من التطبيق', type: 'checkbox' }, { k: 'enableLoyalty', label: 'استعلام نقاط الولاء', type: 'checkbox' }, { k: 'enableOrderStatus', label: 'تتبع حالة الطلب', type: 'checkbox' }],
    'تطبيق ويب (PWA) باسم وشعار وألوان مطعمك، يثبّته العميل على شاشة جواله من المتصفح مباشرة (إضافة إلى الشاشة الرئيسية) دون الحاجة لمتجر التطبيقات. يضم المينيو والطلب، حجز الطاولات، نقاط الولاء، حالة الطلب وتقييم Google.',
    '<div class="biz-card"><h4>رابط التطبيق</h4>' + linkBox(url) + '<div class="qr-tiles" style="margin-top:12px"><div class="qr-tile"><img src="' + qrImg(url, 240) + '"><div>حمّل تطبيقنا</div></div></div></div>');
  bizLogoUploader(el, 'icon', 'يظهر الشعار كأيقونة التطبيق عند التثبيت على الجوال وفي صفحة التطبيق. إن لم ترفع شعاراً يظهر الشعار الأساسي للمنصة.');
}
// رفع الشعار: يُحوَّل تلقائياً إلى صورة مربعة 512×512 PNG (مطلوبة لأيقونة التثبيت)
// إزالة الخلفية: تعبئة من الحواف للون الخلفية المتجانس (أبيض أو أي لون موحّد) وجعلها شفافة
function bizRemoveBg(c, tol) {
  const g = c.getContext('2d'), W = c.width, H = c.height, im = g.getImageData(0, 0, W, H), d = im.data;
  const px = function (x, y) { const i = (y * W + x) * 4; return [d[i], d[i + 1], d[i + 2], d[i + 3]]; };
  const corners = [px(1, 1), px(W - 2, 1), px(1, H - 2), px(W - 2, H - 2)].filter(function (q) { return q[3] > 200; });
  if (!corners.length) return false;
  const ref = corners[0]; tol = tol || 38;
  const near = function (i) { return d[i + 3] > 0 && Math.abs(d[i] - ref[0]) + Math.abs(d[i + 1] - ref[1]) + Math.abs(d[i + 2] - ref[2]) <= tol * 3; };
  const seen = new Uint8Array(W * H), st = [];
  for (let x = 0; x < W; x++) { st.push(x, (H - 1) * W + x); }
  for (let y = 0; y < H; y++) { st.push(y * W, y * W + W - 1); }
  let n = 0;
  while (st.length) {
    const p = st.pop(); if (seen[p]) continue; seen[p] = 1;
    const i = p * 4; if (!near(i)) continue;
    d[i + 3] = 0; n++;
    const x = p % W, y = (p - x) / W;
    if (x > 0) st.push(p - 1); if (x < W - 1) st.push(p + 1); if (y > 0) st.push(p - W); if (y < H - 1) st.push(p + W);
  }
  g.putImageData(im, 0, 0); return n > 0;
}
function bizLogoUploader(el, key, hint) {
  const inp = el.querySelector('#bf_' + key); if (!inp) return;
  const box = document.createElement('div'); box.className = 'logo-up';
  box.innerHTML = '<img class="logo-prev" alt="">' +
    '<div class="logo-acts"><label class="btn btn-outline btn-sm"><i class="fas fa-upload"></i> رفع الشعار (PNG شفاف)<input type="file" accept="image/png,image/webp,image/svg+xml,image/*" hidden></label>' +
    '<label class="logo-rb"><input type="checkbox" class="rmbg"> إزالة الخلفية تلقائياً (للشعار ذي الخلفية البيضاء/الموحّدة)</label></div>' +
    '<span class="muted" style="font-size:.8rem">' + h(hint || '') + ' يُحفظ الشعار بخلفية شفافة تماماً كما هو (PNG).</span>';
  inp.insertAdjacentElement('afterend', box);
  const prev = box.querySelector('img'); const sync = function () { prev.src = inp.value || 'assets/icon-192.png'; }; inp.addEventListener('input', sync); sync();
  box.querySelector('input[type=file]').onchange = async function (e) {
    const f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return;
    try {
      const url = await new Promise(function (res, rej) { const r = new FileReader(); r.onerror = function () { rej(new Error('تعذرت قراءة الصورة')); }; r.onload = function () { res(r.result); }; r.readAsDataURL(f); });
      const img = await new Promise(function (res, rej) { const i = new Image(); i.onload = function () { res(i); }; i.onerror = function () { rej(new Error('صورة غير صالحة')); }; i.src = url; });
      const iw = img.naturalWidth || img.width || 512, ih = img.naturalHeight || img.height || 512;
      // لوحة شفافة بالكامل — بدون أي تعبئة للخلفية
      const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
      g.clearRect(0, 0, 512, 512);
      const sc = Math.min(512 * 0.92 / iw, 512 * 0.92 / ih), w = iw * sc, hh = ih * sc;
      g.imageSmoothingQuality = 'high';
      g.drawImage(img, (512 - w) / 2, (512 - hh) / 2, w, hh);
      if (box.querySelector('.rmbg').checked) {
        const t = document.createElement('canvas'); t.width = Math.round(w); t.height = Math.round(hh);
        t.getContext('2d').drawImage(img, 0, 0, t.width, t.height);
        if (bizRemoveBg(t)) { g.clearRect(0, 0, 512, 512); g.drawImage(t, (512 - w) / 2, (512 - hh) / 2); }
      }
      showToast('جاري رفع الشعار...');
      const up = await uploadMenuImagePost(c.toDataURL('image/png'), 'logo');
      if (!up || !up.success || !up.url) throw new Error((up && up.error) || 'فشل الرفع');
      inp.value = up.url; sync(); showToast('تم رفع الشعار بخلفية شفافة — اضغط حفظ');
    } catch (er) { showToast(er.message, true); }
  };
}

// ---------- إعدادات النشاط ----------
bizPage('bizsettings', { group: 'admin', title: 'إعدادات النشاط والفوترة', icon: 'sliders-h', feature: 'pos', perms: ['settings'], plan: 'pro',
  pitch: 'بيانات المنشأة، الضريبة والفاتورة الإلكترونية، شكل الإيصال، وسلوك الكاشير.',
  render: async function (body) {
    body.innerHTML = subTabs('bsSub', [['business', 'بيانات المنشأة', 'building'], ['tax', 'الضريبة والفوترة', 'percent'], ['receipt', 'الإيصال', 'receipt'], ['pos', 'الكاشير', 'cash-register'], ['kpi', 'أهداف الأداء', 'stopwatch']], 'business') + '<div id="bsBody"></div>';
    const el = body.querySelector('#bsBody');
    const views = {
      business: function () { settingsForm(el, 'business', [{ k: 'legalName', label: 'الاسم التجاري / القانوني', full: true }, { k: 'crNumber', label: 'رقم السجل التجاري', ltr: true }, { k: 'phone', label: 'الهاتف', ltr: true }, { k: 'address', label: 'العنوان', full: true }, { k: 'logo', label: 'رابط الشعار للفواتير', ltr: true, full: true }]); bizLogoUploader(el, 'logo', 'يظهر في الفواتير، وكأيقونة تطبيق المطعم إن لم تحدد أيقونة خاصة.'); },
      tax: function () { settingsForm(el, 'tax', [{ k: 'enabled', label: 'تفعيل الضريبة على المبيعات', type: 'checkbox', full: true }, { k: 'name', label: 'اسم الضريبة', def: 'ضريبة القيمة المضافة' }, { k: 'rate', label: 'النسبة %', type: 'number' }, { k: 'inclusive', label: 'الأسعار شاملة الضريبة', type: 'checkbox' }, { k: 'number', label: 'الرقم الضريبي للمنشأة', ltr: true }],
        'كل فاتورة تصدر برقم تسلسلي غير قابل للتعديل، وبصمة رقمية مرتبطة بالفاتورة السابقة، ورمز QR بصيغة TLV (اسم البائع، الرقم الضريبي، الوقت، الإجمالي، الضريبة) المتوافقة مع متطلبات الفوترة المبسطة. الإلغاء يتم بإشعار دائن.'); },
      receipt: function () { settingsForm(el, 'receipt', [{ k: 'header', label: 'نص أعلى الإيصال', full: true }, { k: 'footer', label: 'نص أسفل الإيصال', full: true, def: 'شكراً لزيارتكم' }, { k: 'paper', label: 'مقاس الورق', type: 'select', options: [['80', 'حراري 80 مم'], ['58', 'حراري 58 مم'], ['a4', 'A4']] }, { k: 'showQr', label: 'إظهار رمز QR', type: 'checkbox' }]); },
      pos: function () { settingsForm(el, 'pos', [{ k: 'defaultOrderType', label: 'نوع الطلب الافتراضي', type: 'select', options: [['takeaway', 'سفري'], ['dine_in', 'محلي'], ['delivery', 'توصيل']] }, { k: 'requireShift', label: 'إلزام فتح وردية قبل البيع', type: 'checkbox' }, { k: 'allowNegativeStock', label: 'السماح بالبيع عند نفاد المخزون', type: 'checkbox' }, { k: 'kitchenAuto', label: 'إرسال الطلب للمطبخ تلقائياً عند الدفع', type: 'checkbox' }, { k: 'allowPriceEdit', label: 'السماح للكاشير بتعديل الأسعار', type: 'checkbox' },
        { k: 'autoSoldOut', label: 'إيقاف المنتج نهائياً عند نفاد أي مادة أولية (الكاشير + المينيو + التطبيق)', type: 'checkbox', full: true },
        { k: 'wasteOnCancel', label: 'تسجيل الكميات تالفاً عند إلغاء طلب بعد بدء التحضير (بدل إرجاعها للمخزون)', type: 'checkbox', full: true }],
        'عند تفعيل الإيقاف التلقائي: يتم التحقق من توفر جميع المواد الأولية (مع احتساب الطلبات المفتوحة المحجوزة) عند إضافة الصنف وقبول طلب المينيو وإرسال الطلب للمطبخ وليس عند الدفع فقط، ويظهر الصنف «نفد» للعملاء أونلاين. يتطلب ربط المنتج بالوصفة أو تفعيل تتبع مخزون المنتج.'); },
      kpi: function () { settingsForm(el, 'kpi', [{ k: 'acceptMin', label: 'المدة المستهدفة لقبول طلب أونلاين (دقيقة)', type: 'number' }, { k: 'prepMin', label: 'المدة المستهدفة للتحضير (دقيقة)', type: 'number' }, { k: 'serveMin', label: 'المدة المستهدفة للتسليم بعد الجاهزية (دقيقة)', type: 'number' }],
        'تُستخدم هذه الأهداف في تقرير مؤشرات الأداء التشغيلي لحساب نسبة الالتزام بالوقت.'); }
    };
    bindSubTabs(body, 'bsSub', function (k) { views[k](); });
    views.business();
  } });

// ---------- الدومين الخاص للمينيو الإلكتروني ----------
bizPage('domain', { group: 'admin', title: 'الدومين الخاص', icon: 'globe', feature: 'digital_menu', perms: ['settings'], plan: 'basic',
  pitch: 'اربط المينيو الإلكتروني أو تطبيق المطعم بدومين باسم مطعمك مثل menu.myrestaurant.com.',
  render: function (body) {
    const v = (B.acc.biz && B.acc.biz.domain) || {};
    const appHost = (typeof PUBLIC_APP_URL !== 'undefined' ? PUBLIC_APP_URL : location.origin + '/').replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    settingsForm(body, 'domain', [{ k: 'host', label: 'الدومين الخاص بمطعمك', ltr: true, full: true, ph: 'menu.myrestaurant.com', hint: 'بدون https:// — يمكن استخدام دومين رئيسي أو فرعي' },
      { k: 'target', label: 'يفتح عند زيارة الدومين', type: 'select', options: [['menu', 'المينيو الإلكتروني'], ['app', 'تطبيق المطعم (المينيو + الحجز + الحساب والنقاط)']], def: 'menu' }],
      'نعم، يمكنك ربط صفحة المينيو الخاصة بك بدومين باسم مطعمك. الخطوات:<br>' +
      '1) احفظ الدومين هنا.<br>' +
      '2) من لوحة شركة الدومين أضف سجل DNS من نوع <b>CNAME</b>: الاسم <b dir="ltr">menu</b> (أو <b dir="ltr">www</b>) والقيمة <b dir="ltr">' + h(appHost) + '</b>. للدومين الرئيسي بدون بادئة استخدم سجل <b>ALIAS/ANAME</b> أو التحويل (Forwarding) إلى الدومين الفرعي.<br>' +
      '3) يُضاف الدومين من طرفنا في لوحة الاستضافة لإصدار شهادة SSL (https) — تواصل مع الدعم بعد إضافة السجل.<br>' +
      '4) خلال دقائق إلى 24 ساعة يفتح الدومين المينيو مباشرة، وتعمل أكواد QR القديمة كما هي.');
    const box = document.createElement('div'); box.className = 'biz-card';
    box.innerHTML = '<h4>اختبار الربط</h4><p class="muted">بعد الحفظ وإضافة سجل DNS، افتح الدومين في المتصفح. يمكنك أيضاً التحقق من أن الدومين محفوظ ومربوط بمطعمك:</p><button class="btn btn-outline btn-sm" id="dmTest"><i class="fas fa-vial"></i> تحقق من الربط</button> <span id="dmRes" class="muted"></span>' +
      (v.host ? '<div style="margin-top:10px">' + linkBox('https://' + v.host + '/') + '</div>' : '');
    body.appendChild(box);
    box.querySelector('#dmTest').onclick = async function () {
      const host = ((B.acc.biz && B.acc.biz.domain) || {}).host || '';
      if (!host) { showToast('احفظ الدومين أولاً', true); return; }
      const r = await fetch(COST_API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify({ fn: 'resolveDomain', host: host }) }).then(function (x) { return x.json(); }).catch(function () { return {}; });
      box.querySelector('#dmRes').innerHTML = r.success && r.r === B.acc.publicId ? '<span style="color:#6ee7b7">الدومين ' + h(host) + ' مربوط بمطعمك ويفتح ' + (r.target === 'app' ? 'تطبيق المطعم' : 'المينيو') + '</span>' : '<span style="color:#f87171">' + h(r.error || 'غير مربوط') + '</span>';
    };
  } });

// ---------- الباقات ----------
bizPage('plans', { group: 'acct', title: 'الباقات والاشتراك', icon: 'crown', ownerOnly: true,
  render: async function (body) {
    const a = B.acc;
    body.innerHTML = '<div class="biz-card" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px"><div>باقتك الحالية: ' + planBadge(a.plan) + ' · تنتهي في <b>' + h(a.expiryDate) + '</b> (' + a.daysLeft + ' يوم)</div>' + (a.isOwner ? '<button class="btn btn-outline btn-sm" onclick="bizOpenPayment(\'' + a.plan + '\')"><i class="fas fa-sync-alt"></i> تجديد الباقة الحالية</button>' : '') + '</div>' +
      '<div class="plans-cards">' + FC_PLANS.map(function (p) {
        const cur = p.key === a.plan, idx = FC_PLANS.indexOf(p), curIdx = FC_PLANS.findIndex(function (x) { return x.key === a.plan; });
        return '<div class="plan-card' + (cur ? ' current' : '') + '">' + (p.popular ? '<span class="pc-tag">الأكثر طلباً</span>' : '') + '<h3>' + h(p.name) + '</h3><div class="muted" style="font-size:.84rem">' + h(p.tag) + '</div><div class="pc-price">' + p.price + '$ <small>/ سنوياً</small></div><div class="muted" style="font-size:.8rem">' + h(p.branches) + '</div><p>' + h(p.desc) + '</p>' +
          (cur ? '<button class="btn btn-outline" disabled>باقتك الحالية</button>' : (a.isOwner ? '<button class="btn ' + (idx > curIdx ? 'btn-primary' : 'btn-outline') + '" onclick="bizOpenPayment(\'' + p.key + '\')">' + (idx > curIdx ? 'الترقية' : 'التحويل') + ' إلى ' + h(p.name) + '</button>' : '')) + '</div>';
      }).join('') + '</div>' + fcPlanCompareHtml(a.plan) +
      '<p class="muted" style="margin-top:12px;line-height:1.9">عند الضغط على زر الترقية أو التجديد تظهر نافذة الدفع، وبعد إتمام الدفع أدخل رقم العملية في نفس النافذة لتفعيل الباقة فوراً.</p>';
  } });

// ---------- التقارير الاحترافية (غلاف + رسوم + جداول) ----------
async function finReportDoc(r, f) {
  const s = r.summary, days = r.byDay || [], top = r.topProducts || [], exp = r.expensesByCategory || [];
  const pm = Object.entries(r.byMethod || {}).filter(function (x) { return x[1] > 0; });
  const pmTot = pm.reduce(function (a, x) { return a + x[1]; }, 0);
  const chDay = await rptChart('bar', days.map(function (d) { return d.day; }), [{ label: 'المبيعات', data: days.map(function (d) { return d.sales; }), backgroundColor: '#b48554' }, { label: 'المرتجعات', data: days.map(function (d) { return d.refunds; }), backgroundColor: '#ef4444' }], 'المبيعات اليومية (' + curName() + ')');
  const chPay = await rptChart('doughnut', pm.map(function (x) { return PAY_NAMES[x[0]] || x[0]; }), [{ data: pm.map(function (x) { return x[1]; }), backgroundColor: RPT_PAL }], 'توزيع طرق الدفع', 620, 380);
  const chTop = await rptChart('bar', top.slice(0, 12).map(function (p) { return p.name; }), [{ label: 'الإيراد', data: top.slice(0, 12).map(function (p) { return p.revenue; }), backgroundColor: '#3b82f6' }], 'الأصناف الأكثر مبيعاً (الإيراد)');
  const chExp = await rptChart('doughnut', exp.map(function (x) { return x.category; }), [{ data: exp.map(function (x) { return x.total; }), backgroundColor: RPT_PAL }], 'المصروفات حسب البند', 620, 380);
  const sum = function (k) { return days.reduce(function (a, d) { return a + (+d[k] || 0); }, 0); };
  return { title: 'تقرير المبيعات اليومية', subtitle: 'المبيعات · الأرباح · طرق الدفع · الأصناف · المصروفات', period: rptPeriod(f), cover: true, signature: true, file: 'تقرير_المبيعات_اليومية',
    kpis: [['صافي المبيعات', money(s.netSales), s.invoices + ' فاتورة'], ['متوسط الفاتورة', money(s.avgTicket)], ['مجمل الربح', money(s.grossProfit), 'هامش ' + nf(s.grossMargin, 1) + '%'], ['صافي الربح', money(s.netProfit)],
      ['الضريبة المحصلة', money(s.tax)], ['الخصومات', money(s.discounts)], ['المرتجعات', money(s.refunds)], ['المصروفات', money(s.expenses)]],
    sections: [
      { title: 'المبيعات اليومية', sheet: 'المبيعات اليومية', chart: chDay, chartTop: true, table: { headers: ['اليوم', 'المبيعات', 'المرتجعات', 'الصافي', 'عدد الفواتير', 'متوسط الفاتورة'],
        rows: days.map(function (d) { return [d.day, d.sales, d.refunds, d.sales - d.refunds, d.count, d.count ? d.sales / d.count : 0]; }), money: [1, 2, 3, 5], qty: [4],
        foot: ['الإجمالي', sum('sales'), sum('refunds'), sum('sales') - sum('refunds'), sum('count'), sum('count') ? sum('sales') / sum('count') : 0] } },
      { title: 'قائمة الدخل المبسطة', pb: true, table: { headers: ['البند', 'المبلغ'], money: [1], rows: [['إجمالي المبيعات', s.grossSales], ['(-) المرتجعات', -s.refunds], ['(-) الضريبة', -s.tax], ['صافي المبيعات بدون ضريبة', s.netSalesExTax], ['(-) تكلفة المبيعات', -s.cogs], ['مجمل الربح', s.grossProfit], ['(-) المصروفات', -s.expenses], ['(-) الهدر والتالف', -s.waste]].concat(s.purchases ? [['المشتريات خلال الفترة (للعلم)', s.purchases]] : []), foot: ['صافي الربح', s.netProfit] } },
      { title: 'طرق الدفع', chart: chPay, table: { headers: ['طريقة الدفع', 'المبلغ', 'النسبة'], rows: pm.map(function (x) { return [PAY_NAMES[x[0]] || x[0], x[1], pmTot ? x[1] / pmTot * 100 : 0]; }), money: [1], pct: [2], foot: ['الإجمالي', pmTot, 100] } },
      { title: 'الأصناف الأكثر مبيعاً', pb: true, chart: chTop, chartTop: true, table: { headers: ['#', 'الصنف', 'الكمية', 'الإيراد'], rows: top.map(function (p, i) { return [i + 1, p.name, p.qty, p.revenue]; }), qty: [2], money: [3] } },
      { title: 'المبيعات حسب نوع الطلب', table: { headers: ['النوع', 'المبيعات'], rows: Object.entries(r.byType || {}).map(function (x) { return [ORDER_TYPES[x[0]] || x[0], x[1]]; }), money: [1], foot: 'sum' } },
      { title: 'المبيعات حسب الموظف', table: { headers: ['الموظف', 'المبيعات'], rows: (r.byStaff || []).map(function (x) { return [x.name, x.total]; }), money: [1], foot: 'sum' } },
      { title: 'المصروفات حسب البند', pb: exp.length > 0, chart: chExp, table: { headers: ['البند', 'المبلغ'], rows: exp.map(function (x) { return [x.category, x.total]; }), money: [1], foot: 'sum', empty: 'لا توجد مصروفات في الفترة' } }
    ] };
}
async function profitDoc(r, f) {
  const days = r.days || [], pr = r.products || [];
  const chDay = await rptChart('line', days.map(function (d) { return d.name; }), [{ label: 'الإيراد', data: days.map(function (d) { return d.revenue; }), borderColor: '#b48554', backgroundColor: '#b48554', tension: .3 }, { label: 'الربح', data: days.map(function (d) { return d.profit; }), borderColor: '#10b981', backgroundColor: '#10b981', tension: .3 }], 'الإيراد والربح اليومي');
  const chPr = await rptChart('bar', pr.slice(0, 12).map(function (p) { return p.name; }), [{ label: 'الربح', data: pr.slice(0, 12).map(function (p) { return p.profit; }), backgroundColor: '#10b981' }], 'أعلى المنتجات ربحية');
  const cols = function (l) { return { headers: [l, 'الكمية', 'الإيراد', 'التكلفة', 'الربح', 'الهامش'], qty: [1], money: [2, 3, 4], pct: [5] }; };
  const rows = function (a) { return a.map(function (x) { return [x.name, x.qty, x.revenue, x.cost, x.profit, x.margin]; }); };
  return { title: 'تقرير الربحية', subtitle: 'ربحية المنتجات والتصنيفات والفروع', period: rptPeriod(f), cover: true, signature: true, file: 'تقرير_الربحية',
    kpis: [['الإيراد (بدون ضريبة)', money(r.total.revenue)], ['التكلفة', money(r.total.cost)], ['الربح', money(r.total.profit)], ['هامش الربح', nf(r.total.margin, 1) + '%']],
    sections: [
      { title: 'الربح اليومي', chart: chDay, chartTop: true, table: { headers: ['اليوم', 'الإيراد', 'التكلفة', 'الربح', 'الهامش'], rows: days.map(function (d) { return [d.name, d.revenue, d.cost, d.profit, d.margin]; }), money: [1, 2, 3], pct: [4] } },
      { title: 'الربحية حسب المنتج', pb: true, chart: chPr, chartTop: true, table: Object.assign(cols('المنتج'), { rows: rows(pr) }) },
      { title: 'الربحية حسب التصنيف', table: Object.assign(cols('التصنيف'), { rows: rows(r.categories || []) }) }
    ].concat((r.branches || []).length > 1 ? [{ title: 'الربحية حسب الفرع', table: Object.assign(cols('الفرع'), { rows: rows(r.branches) }) }] : []) };
}
