// ============================================================
// biz-kpi.js (v4.2) — مؤشرات الأداء التشغيلي، الصناديق حسب الفرع والكاشير، جلب المبيعات لهندسة المنيو ونقطة التعادل
// ============================================================
function fmin(x) { return x === null || x === undefined ? '—' : nf(x, 1) + ' د'; }
const SRC_NAMES = { pos: 'الكاشير', menu: 'المينيو/التطبيق', quote: 'عرض سعر', app: 'التطبيق' };
function kpiCols(lbl) {
  return [{ label: lbl, r: function (x) { return '<b>' + h(x.label || x.name) + '</b>'; } }, { label: 'الطلبات', num: true, r: function (x) { return x.orders; } }, { label: 'ملغاة', num: true, r: function (x) { return x.cancelled; } },
    { label: 'متوسط القبول', num: true, r: function (x) { return fmin(x.accept || null); } }, { label: 'متوسط التحضير', num: true, r: function (x) { return fmin(x.prep || null); } },
    { label: 'متوسط التسليم', num: true, r: function (x) { return fmin(x.serve || null); } }, { label: 'الإجمالي حتى التسليم', num: true, r: function (x) { return fmin(x.total || null); } }, { label: 'الالتزام بوقت التحضير', num: true, r: function (x) { return x.prep ? nf(x.prepOnTime, 0) + '%' : '—'; } }];
}
function opsView(el) {
  el.innerHTML = dateRangeBar('opRange', daysAgo(6), isoLocal(), branchFilter()) + '<div id="opBody"></div>';
  const get = bindRange(el, 'opRange', load);
  async function load(f) {
    const r = await bzOk('opsKpiReport', f || get());
    const s = r.summary, T = r.targets;
    const named = function (list, map) { return list.map(function (x) { return Object.assign({}, x, { label: map ? (map[x.name] || x.name) : x.name }); }); };
    el.querySelector('#opBody').innerHTML = rptButtons('opX') +
      kpis([['متوسط قبول الطلب', fmin(r.accept.n ? r.accept.avg : null), r.accept.n ? 'الهدف ' + T.acceptMin + ' د · ملتزم ' + nf(r.accept.onTime, 0) + '%' : 'لا توجد طلبات أونلاين', r.accept.avg > T.acceptMin ? '#f87171' : '#6ee7b7'],
        ['متوسط التحضير', fmin(r.prep.n ? r.prep.avg : null), r.prep.n ? 'الهدف ' + T.prepMin + ' د · ملتزم ' + nf(r.prep.onTime, 0) + '%' : '', r.prep.avg > T.prepMin ? '#f87171' : '#6ee7b7'],
        ['متوسط التسليم', fmin(r.serve.n ? r.serve.avg : null), r.serve.n ? 'الهدف ' + T.serveMin + ' د · ملتزم ' + nf(r.serve.onTime, 0) + '%' : '', r.serve.avg > T.serveMin ? '#f87171' : '#6ee7b7'],
        ['الانتظار قبل بدء التحضير', fmin(r.wait.n ? r.wait.avg : null)], ['الإجمالي من الطلب للتسليم', fmin(r.total.n ? r.total.avg : null), r.total.n ? 'P90: ' + fmin(r.total.p90) : ''],
        ['الطلبات', s.orders, s.paid + ' مدفوع'], ['الملغاة', s.cancelled, s.refunded + ' مسترجع', s.cancelled ? '#f87171' : ''], ['قيمة التالف من الإلغاء', money(s.wasteCost), '', s.wasteCost ? '#f87171' : ''],
        ['طلبات المينيو', s.menuOrders, s.menuRejected + ' مرفوض · ' + s.menuPending + ' بانتظار القبول' + (s.menuPending ? ' (أقدمها ' + fmin(s.menuOldestMin) + ')' : '')]]) +
      '<div class="biz-grid-2"><div class="biz-card"><h4>المراحل (متوسط / P90 / الأقصى)</h4>' + bTable([{ label: 'المرحلة', r: function (x) { return '<b>' + h(x[0]) + '</b>'; } }, { label: 'عدد', num: true, r: function (x) { return x[1].n; } }, { label: 'المتوسط', num: true, r: function (x) { return fmin(x[1].n ? x[1].avg : null); } }, { label: 'P90', num: true, r: function (x) { return fmin(x[1].n ? x[1].p90 : null); } }, { label: 'الأقصى', num: true, r: function (x) { return fmin(x[1].n ? x[1].max : null); } }],
        [['قبول الطلب (أونلاين)', r.accept], ['الانتظار حتى بدء التحضير', r.wait], ['التحضير', r.prep], ['التسليم بعد الجاهزية', r.serve], ['الإجمالي', r.total]]) + '</div>' +
      '<div class="biz-card"><h4>متوسط المدد حسب الساعة</h4><div class="chart-box"><canvas id="chOpH"></canvas></div></div></div>' +
      (r.byBranch.length > 1 ? '<div class="biz-card"><h4>مقارنة الفروع</h4>' + bTable(kpiCols('الفرع'), r.byBranch) + '</div>' : '') +
      '<div class="biz-grid-2"><div class="biz-card"><h4>حسب نوع الطلب</h4>' + bTable(kpiCols('النوع'), named(r.byType, ORDER_TYPES)) + '</div><div class="biz-card"><h4>حسب المصدر</h4>' + bTable(kpiCols('المصدر'), named(r.bySource, SRC_NAMES)) + '</div></div>' +
      '<div class="biz-card"><h4>حسب الموظف (القبول/الإدخال)</h4>' + bTable(kpiCols('الموظف'), r.byStaff) + '</div>' +
      '<div class="biz-card"><h4>الإلغاءات والاسترجاع — للمراجعة</h4>' +
        '<div class="biz-grid-2"><div>' + bTable([{ label: 'السبب', r: function (x) { return h(x.name); } }, { label: 'العدد', num: true, r: function (x) { return x.n; } }, { label: 'قيمة التالف', num: true, r: function (x) { return money(x.waste); } }], r.byReason, { empty: 'لا توجد إلغاءات' }) + '</div><div>' +
        bTable([{ label: 'المرحلة', r: function (x) { return h(x.label); } }, { label: 'العدد', num: true, r: function (x) { return x.n; } }, { label: 'قيمة التالف', num: true, r: function (x) { return money(x.waste); } }], r.byStage, { empty: '—' }) + '</div></div>' +
        bTable([{ label: '#', r: function (x) { return '<b>' + x.number + '</b>'; } }, { label: 'الوقت', r: function (x) { return dt(x.at); } }, { label: 'الفرع', r: function (x) { return h(x.branch); } }, { label: 'الحالة', r: function (x) { return x.status === 'refunded' ? '<span class="badge badge-dog">استرجاع</span>' : '<span class="badge badge-warning">إلغاء</span>'; } },
          { label: 'المرحلة', r: function (x) { return h((r.byStage.find(function (y) { return y.name === x.stage; }) || {}).label || x.stage); } }, { label: 'السبب', r: function (x) { return h(x.reason || '—'); } }, { label: 'بواسطة', r: function (x) { return h(x.by || x.staff); } }, { label: 'قيمة الطلب', num: true, r: function (x) { return money(x.total); } }, { label: 'التالف', num: true, r: function (x) { return x.waste ? '<b style="color:#f87171">' + money(x.waste) + '</b>' : '—'; } }], r.cancellations, { empty: 'لا توجد إلغاءات في الفترة' }) + '</div>' +
      '<div class="biz-card"><h4>أبطأ الطلبات</h4>' + bTable([{ label: '#', r: function (x) { return '<b>' + x.number + '</b>'; } }, { label: 'الوقت', r: function (x) { return dt(x.created_at); } }, { label: 'الفرع', r: function (x) { return h(x.branch); } }, { label: 'النوع', r: function (x) { return h(ORDER_TYPES[x.type] || x.type); } }, { label: 'المصدر', r: function (x) { return h(SRC_NAMES[x.source] || x.source); } },
        { label: 'القبول', num: true, r: function (x) { return fmin(x.accept); } }, { label: 'الانتظار', num: true, r: function (x) { return fmin(x.wait); } }, { label: 'التحضير', num: true, r: function (x) { return fmin(x.prep); } }, { label: 'التسليم', num: true, r: function (x) { return fmin(x.serve); } }, { label: 'الإجمالي', num: true, r: function (x) { return '<b>' + fmin(x.total) + '</b>'; } }], r.slow, { empty: 'لا توجد بيانات توقيت — تُسجَّل الأوقات تلقائياً من شاشة المطبخ (بدء التحضير / جاهز / تم التسليم)' }) + '</div>' +
      '<p class="muted" style="font-size:.8rem;line-height:1.8">القبول = من وصول طلب المينيو/التطبيق حتى قبوله في الكاشير. التحضير = من بدء التحضير (أو الإرسال للمطبخ) حتى «جاهز». التسليم = من «جاهز» حتى «تم التسليم» في شاشة المطبخ. P90 = 90% من الطلبات أسرع من هذه المدة.</p>';
    bzChart(el.querySelector('#chOpH'), { type: 'bar', data: { labels: r.byHour.map(function (x) { return x.name; }), datasets: [{ label: 'التحضير', data: r.byHour.map(function (x) { return x.prep; }), backgroundColor: '#f59e0b', borderRadius: 5 }, { label: 'الإجمالي', data: r.byHour.map(function (x) { return x.total; }), backgroundColor: '#3b82f6', borderRadius: 5 }, { label: 'الطلبات', type: 'line', yAxisID: 'y1', data: r.byHour.map(function (x) { return x.orders; }), borderColor: '#10b981' }] }, options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y1: { position: 'left', grid: { display: false } } } } });
    const ff = f || get(); rptBind(el, 'opX', function () { return opsDoc(r, ff); });
  }
  load();
}
async function opsDoc(r, f) {
  const s = r.summary, T = r.targets;
  const rowsOf = function (list, map) { return list.map(function (x) { return [map ? (map[x.name] || x.name) : x.name, x.orders, x.cancelled, x.accept, x.prep, x.serve, x.total, x.prep ? x.prepOnTime : 0]; }); };
  const H = ['البيان', 'الطلبات', 'ملغاة', 'القبول (د)', 'التحضير (د)', 'التسليم (د)', 'الإجمالي (د)', 'الالتزام %'];
  const ch = await rptChart('bar', r.byHour.map(function (x) { return x.name; }), [{ label: 'التحضير (د)', data: r.byHour.map(function (x) { return x.prep; }), backgroundColor: '#f59e0b' }, { label: 'الإجمالي (د)', data: r.byHour.map(function (x) { return x.total; }), backgroundColor: '#3b82f6' }], 'متوسط المدد حسب الساعة');
  const st = function (n, x) { return [n, x.n, x.avg, x.p90, x.max]; };
  return { title: 'تقرير مؤشرات الأداء التشغيلي (KPI)', subtitle: 'مدة القبول · التحضير · التسليم · الإلغاءات والتالف', period: rptPeriod(f), cover: true, signature: true, file: 'تقرير_مؤشرات_الأداء',
    kpis: [['متوسط القبول', fmin(r.accept.avg), 'الهدف ' + T.acceptMin + ' د'], ['متوسط التحضير', fmin(r.prep.avg), 'الهدف ' + T.prepMin + ' د'], ['متوسط التسليم', fmin(r.serve.avg), 'الهدف ' + T.serveMin + ' د'], ['الإجمالي', fmin(r.total.avg)],
      ['الطلبات', s.orders], ['الملغاة', s.cancelled], ['المسترجعة', s.refunded], ['قيمة التالف', money(s.wasteCost)]],
    sections: [
      { title: 'المراحل', sheet: 'المراحل', chart: ch, table: { headers: ['المرحلة', 'عدد', 'المتوسط (د)', 'P90 (د)', 'الأقصى (د)'], qty: [1, 2, 3, 4], rows: [st('قبول الطلب', r.accept), st('الانتظار', r.wait), st('التحضير', r.prep), st('التسليم', r.serve), st('الإجمالي', r.total)] } },
      { title: 'حسب الفرع', sheet: 'الفروع', table: { headers: H, qty: [1, 2, 3, 4, 5, 6], pct: [7], rows: rowsOf(r.byBranch) } },
      { title: 'حسب نوع الطلب', table: { headers: H, qty: [1, 2, 3, 4, 5, 6], pct: [7], rows: rowsOf(r.byType, ORDER_TYPES) } },
      { title: 'حسب المصدر', table: { headers: H, qty: [1, 2, 3, 4, 5, 6], pct: [7], rows: rowsOf(r.bySource, SRC_NAMES) } },
      { title: 'حسب الموظف', sheet: 'الموظفون', table: { headers: H, qty: [1, 2, 3, 4, 5, 6], pct: [7], rows: rowsOf(r.byStaff) } },
      { title: 'أسباب الإلغاء', pb: true, sheet: 'أسباب الإلغاء', table: { headers: ['السبب', 'العدد', 'قيمة التالف'], qty: [1], money: [2], rows: r.byReason.map(function (x) { return [x.name, x.n, x.waste]; }), foot: 'sum', empty: 'لا توجد إلغاءات' } },
      { title: 'سجل الإلغاءات والاسترجاع', sheet: 'الإلغاءات', table: { headers: ['#', 'الوقت', 'الفرع', 'النوع', 'المرحلة', 'السبب', 'بواسطة', 'قيمة الطلب', 'التالف'], money: [7, 8],
        rows: r.cancellations.map(function (x) { return [x.number, dt(x.at), x.branch, x.status === 'refunded' ? 'استرجاع' : 'إلغاء', (r.byStage.find(function (y) { return y.name === x.stage; }) || {}).label || x.stage, x.reason, x.by || x.staff, x.total, x.waste]; }), empty: 'لا توجد إلغاءات' } },
      { title: 'أبطأ الطلبات', sheet: 'أبطأ الطلبات', table: { headers: ['#', 'الوقت', 'الفرع', 'النوع', 'القبول', 'الانتظار', 'التحضير', 'التسليم', 'الإجمالي'], qty: [4, 5, 6, 7, 8],
        rows: r.slow.map(function (x) { return [x.number, dt(x.created_at), x.branch, ORDER_TYPES[x.type] || x.type, x.accept || 0, x.wait || 0, x.prep || 0, x.serve || 0, x.total || 0]; }) } }
    ] };
}

// ---------- الصناديق: رصيد كل صندوق حسب الفرع والكاشير ----------
function drawersView(el) {
  const brSel = B.acc.branches && B.acc.branches.length > 1 && (B.acc.isOwner || !B.acc.staff.branchId) ? '<select data-f="branchId"><option value="all">كل الفروع</option>' + B.acc.branches.map(function (b) { return '<option value="' + h(b.id) + '">' + h(b.name) + '</option>'; }).join('') + '</select>' : '';
  el.innerHTML = dateRangeBar('drRange', daysAgo(6), isoLocal(), brSel + '<button class="btn btn-outline btn-sm" type="button" id="drRef"><i class="fas fa-sync-alt"></i> تحديث مباشر</button>') + '<div id="drBody"></div>';
  const get = bindRange(el, 'drRange', load);
  el.querySelector('#drRef').onclick = function () { load(); };
  async function load(f) {
    const r = await bzOk('drawersReport', f || get(), { loading: false });
    const s = r.summary, open = r.shifts.filter(function (x) { return x.status === 'open'; });
    const dcol = function (v) { return v === null || v === undefined ? '—' : '<b style="color:' + (Math.abs(v) < 0.01 ? '#6ee7b7' : v < 0 ? '#f87171' : '#fbbf24') + '">' + money(v) + '</b>'; };
    const aggCols = function (lbl) { return [{ label: lbl, r: function (x) { return '<b>' + h(x.name) + '</b>'; } }, { label: 'الورديات', num: true, r: function (x) { return x.shifts + (x.open ? ' (' + x.open + ' مفتوحة)' : ''); } }, { label: 'الفواتير', num: true, r: function (x) { return x.count; } }, { label: 'المبيعات', num: true, r: function (x) { return money(x.sales); } }, { label: 'متوسط الفاتورة', num: true, r: function (x) { return money(x.avgTicket); } },
      { label: 'نقداً', num: true, r: function (x) { return money(x.cashSales); } }, { label: 'بطاقة', num: true, r: function (x) { return money(x.card); } }, { label: 'نقدية بالدرج الآن', num: true, r: function (x) { return x.open ? '<b style="color:#6ee7b7">' + money(x.cashNow) + '</b>' : '—'; } }, { label: 'المتوقع (المغلقة)', num: true, r: function (x) { return money(x.expected); } }, { label: 'الفعلي', num: true, r: function (x) { return money(x.counted); } }, { label: 'الفرق', num: true, r: function (x) { return dcol(x.diff); } }, { label: 'عجز', num: true, r: function (x) { return x.shortages || '—'; } }]; };
    el.querySelector('#drBody').innerHTML = rptButtons('drX') +
      kpis([['صناديق مفتوحة الآن', s.open], ['النقدية في الصناديق الآن', money(s.cashNow), 'الافتتاحي + المبيعات النقدية + الإيداع − السحب − المصروفات', '#6ee7b7'], ['مبيعات الفترة', money(s.sales)], ['ورديات مغلقة', s.closed], ['صافي الفروقات', money(s.diff), s.shortages + ' وردية بعجز', s.diff < 0 ? '#f87171' : '']]) +
      (open.length ? '<div class="biz-sec">الصناديق المفتوحة الآن</div><div class="drawer-cards">' + open.map(function (x) {
        return '<div class="drawer-card"><div style="display:flex;justify-content:space-between"><b><i class="fas fa-user"></i> ' + h(x.staff) + '</b><span class="badge badge-success">مفتوح</span></div><div class="muted" style="font-size:.8rem;margin:4px 0"><i class="fas fa-store"></i> ' + h(x.branch) + ' · منذ ' + dt(x.opened_at) + '</div>' +
          '<div class="big">' + money(x.expected) + '</div><div class="muted" style="font-size:.75rem;margin-bottom:6px">النقدية المتوقعة بالدرج الآن</div>' +
          [['الرصيد الافتتاحي', x.opening], ['مبيعات نقدية', x.cashSales], ['بطاقة', x.card], ['إيداعات', x.cashIn], ['سحوبات', -x.cashOut], ['مصروفات نقدية', -x.cashExpenses], ['تحصيل آجل', x.collections], ['إجمالي المبيعات', x.sales]].map(function (y) { return '<div class="row"><span>' + y[0] + '</span><span>' + money(y[1]) + '</span></div>'; }).join('') +
          (B.acc.isOwner || canP('team') ? '<button class="btn btn-danger btn-sm" style="margin-top:8px;width:100%" data-close="' + x.id + '" data-exp="' + x.expected + '">إغلاق الصندوق</button>' : '') + '</div>';
      }).join('') + '</div>' : '<div class="biz-card muted">لا توجد صناديق مفتوحة حالياً.</div>') +
      '<div class="biz-grid-2"><div class="biz-card"><h4>مقارنة الفروع</h4><div class="chart-box"><canvas id="chDrB"></canvas></div></div><div class="biz-card"><h4>مقارنة الكاشيرية</h4><div class="chart-box"><canvas id="chDrS"></canvas></div></div></div>' +
      '<div class="biz-card"><h4>حسب الفرع</h4>' + bTable(aggCols('الفرع'), r.byBranch, { empty: 'لا توجد ورديات' }) + '</div>' +
      '<div class="biz-card"><h4>حسب الكاشير</h4>' + bTable(aggCols('الكاشير'), r.byStaff, { empty: 'لا توجد ورديات' }) + '</div>' +
      '<div class="biz-card"><h4>كل الورديات</h4>' + bTable([{ label: 'الكاشير', r: function (x) { return '<b>' + h(x.staff) + '</b>'; } }, { label: 'الفرع', r: function (x) { return h(x.branch); } }, { label: 'الفتح', r: function (x) { return dt(x.opened_at); } }, { label: 'الإغلاق', r: function (x) { return x.closed_at ? dt(x.closed_at) : '<span class="badge badge-success">مفتوحة</span>'; } }, { label: 'الافتتاحي', num: true, r: function (x) { return money(x.opening); } },
        { label: 'المبيعات', num: true, r: function (x) { return money(x.sales); } }, { label: 'نقداً', num: true, r: function (x) { return money(x.cashSales); } }, { label: 'المتوقع', num: true, r: function (x) { return money(x.expected); } }, { label: 'الفعلي', num: true, r: function (x) { return x.counted === null ? '—' : money(x.counted); } }, { label: 'الفرق', num: true, r: function (x) { return dcol(x.diff); } }, { label: '', r: function (x) { return '<button class="ico-btn" data-r="' + x.id + '" title="التقرير"><i class="fas fa-file-alt"></i></button>'; } }], r.shifts, { empty: 'لا توجد ورديات' }) + '</div>';
    const bars = function (cv, list) { bzChart(el.querySelector(cv), { type: 'bar', data: { labels: list.map(function (x) { return x.name; }), datasets: [{ label: 'المبيعات', data: list.map(function (x) { return x.sales; }), backgroundColor: '#b48554', borderRadius: 6 }, { label: 'نقداً', data: list.map(function (x) { return x.cashSales; }), backgroundColor: '#10b981', borderRadius: 6 }, { label: 'الفرق', data: list.map(function (x) { return x.diff; }), backgroundColor: '#ef4444', borderRadius: 6 }] }, options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } } }); };
    bars('#chDrB', r.byBranch); bars('#chDrS', r.byStaff);
    el.querySelector('#drBody').onclick = function (e) {
      const rp = e.target.closest('[data-r]'), c = e.target.closest('[data-close]');
      if (rp) shiftReportModal(rp.dataset.r);
      if (c) bPrompt('إغلاق الصندوق', [{ k: 'closingCash', label: 'النقدية الفعلية', type: 'number', req: true, hint: 'المتوقع: ' + money(+c.dataset.exp) }, { k: 'notes', label: 'ملاحظات', full: true }], {}, async function (d) { await bzOk('shiftClose', Object.assign({ id: c.dataset.close }, d)); showToast('تم الإغلاق'); load(); });
    };
    const ff = f || get();
    rptBind(el, 'drX', async function () {
      const ag = function (list) { return list.map(function (x) { return [x.name, x.shifts, x.count, x.sales, x.cashSales, x.card, x.cashNow, x.expected, x.counted, x.diff]; }); };
      const AH = ['البيان', 'الورديات', 'الفواتير', 'المبيعات', 'نقداً', 'بطاقة', 'بالدرج الآن', 'المتوقع', 'الفعلي', 'الفرق'];
      const ch = await rptChart('bar', r.byBranch.map(function (x) { return x.name; }), [{ label: 'المبيعات', data: r.byBranch.map(function (x) { return x.sales; }), backgroundColor: '#b48554' }, { label: 'نقداً', data: r.byBranch.map(function (x) { return x.cashSales; }), backgroundColor: '#10b981' }], 'مقارنة الفروع');
      return { title: 'تقرير الصناديق حسب الفرع والكاشير', subtitle: 'أرصدة الصناديق المفتوحة · مقارنة المبيعات · الفروقات', period: rptPeriod(ff), cover: true, signature: true, file: 'تقرير_الصناديق',
        kpis: [['صناديق مفتوحة', s.open], ['النقدية بالصناديق الآن', money(s.cashNow)], ['مبيعات الفترة', money(s.sales)], ['صافي الفروقات', money(s.diff)]],
        sections: [
          { title: 'الصناديق المفتوحة الآن', sheet: 'المفتوحة', table: { headers: ['الكاشير', 'الفرع', 'منذ', 'الافتتاحي', 'مبيعات نقدية', 'بطاقة', 'إيداع', 'سحب', 'مصروفات', 'النقدية الآن'], money: [3, 4, 5, 6, 7, 8, 9], rows: open.map(function (x) { return [x.staff, x.branch, dt(x.opened_at), x.opening, x.cashSales, x.card, x.cashIn, x.cashOut, x.cashExpenses, x.expected]; }), foot: 'sum', empty: 'لا توجد صناديق مفتوحة' } },
          { title: 'حسب الفرع', sheet: 'الفروع', chart: ch, table: { headers: AH, qty: [1, 2], money: [3, 4, 5, 6, 7, 8, 9], rows: ag(r.byBranch), foot: 'sum' } },
          { title: 'حسب الكاشير', sheet: 'الكاشيرية', table: { headers: AH, qty: [1, 2], money: [3, 4, 5, 6, 7, 8, 9], rows: ag(r.byStaff), foot: 'sum' } },
          { title: 'كل الورديات', pb: true, sheet: 'الورديات', table: { headers: ['الكاشير', 'الفرع', 'الفتح', 'الإغلاق', 'الافتتاحي', 'المبيعات', 'نقداً', 'المتوقع', 'الفعلي', 'الفرق'], money: [4, 5, 6, 7, 8, 9], rows: r.shifts.map(function (x) { return [x.staff, x.branch, dt(x.opened_at), x.closed_at ? dt(x.closed_at) : 'مفتوحة', x.opening, x.sales, x.cashSales, x.expected, x.counted === null ? 0 : x.counted, x.diff === null ? 0 : x.diff]; }) } }
        ] };
    });
  }
  load();
}

// ---------- جلب المبيعات من الكاشير لهندسة المنيو ونقطة التعادل ----------
function salesFetchBar(id) {
  if (typeof B === 'undefined' || !B.acc || !hasF('pos')) return '';
  const brs = B.acc.branches || [];
  const sel = brs.length > 1 && (B.acc.isOwner || !B.acc.staff.branchId) ? '<select data-sb="branch"><option value="all">كل الفروع</option>' + brs.map(function (b) { return '<option value="' + h(b.id) + '"' + (b.id === B.branch ? ' selected' : '') + '>' + h(b.name) + '</option>'; }).join('') + '</select>' : '';
  return '<div class="me-sales-bar" id="' + id + '"><b><i class="fas fa-cash-register"></i> جلب المبيعات من الكاشير</b>' + sel +
    '<label class="muted">من</label><input type="date" data-sb="from" value="' + daysAgo(29) + '"><label class="muted">إلى</label><input type="date" data-sb="to" value="' + isoLocal() + '">' +
    '<label class="muted">سعر البيع</label><select data-sb="src"><option value="list"' + (getPriceSrc() === 'list' ? ' selected' : '') + '>من قائمة الأطباق (السعر الحالي)</option><option value="sales"' + (getPriceSrc() === 'sales' ? ' selected' : '') + '>من المبيعات الفعلية</option></select>' +
    '<button type="button" class="btn btn-primary btn-sm" data-sb="go"><i class="fas fa-download"></i> جلب</button><span class="muted" data-sb="msg">تُجلب الكميات المباعة من الكاشير، والسعر حسب اختيارك — سعر الطبق في قائمة الأطباق لا يتغير أبداً</span></div>';
}
function bindSalesFetch(root, id, apply) {
  const bar = root.querySelector('#' + id); if (!bar) return;
  const srcSel = bar.querySelector('[data-sb=src]');
  if (srcSel) srcSel.onchange = function () {
    setPriceSrc(srcSel.value);
    document.querySelectorAll('[data-sb=src]').forEach(function (x) { x.value = srcSel.value; });
    applyPriceSrc();
    if (typeof renderMenuInputForm === 'function' && document.getElementById('menuInputFields')) renderMenuInputForm();
    if (typeof renderBreakevenInputs === 'function' && document.getElementById('breakevenProductsContainer')) renderBreakevenInputs();
    showToast(srcSel.value === 'sales' ? 'التحليل بأسعار البيع الفعلية من الفروع' : 'التحليل بأسعار قائمة الأطباق الحالية (مناسب لخطة الشهر القادم)');
  };
  bar.querySelector('[data-sb=go]').onclick = async function () {
    const q = function (k) { const e = bar.querySelector('[data-sb=' + k + ']'); return e ? e.value : ''; };
    const br = q('branch') || B.branch;
    const r = await bzOk('salesByRecipe', { branchId: br, from: q('from'), to: q('to') });
    const brName = br === 'all' ? 'كل الفروع' : ((B.acc.branches || []).find(function (b) { return b.id === br; }) || {}).name || '';
    const n = apply(r, brName);
    bar.querySelector('[data-sb=msg]').innerHTML = 'تم جلب مبيعات ' + h(brName) + ' (' + r.orders + ' طلب، ' + r.days + ' يوم) · ' + n + ' طبق مربوط بوصفة' + (r.unmatched.length ? ' · ' + r.unmatched.length + ' صنف غير مربوط بوصفة أُضيف في قسم منفصل أسفل القائمة (' + r.unmatched.slice(0, 5).map(function (x) { return h(x.name); }).join('، ') + ') — أدخل تكلفته ليدخل التحليل' : '') + ' · السعر: ' + (getPriceSrc() === 'sales' ? 'من المبيعات' : 'من قائمة الأطباق');
    showToast('تم جلب المبيعات: ' + brName);
  };
}
function injectSalesBars() {
  if (typeof B === 'undefined' || !B.acc || !hasF('pos') || !(B.acc.isOwner || canP('costing', 'reports', 'finance'))) return;
  const me = document.getElementById('menuInputForm');
  if (me && !document.getElementById('meSalesBar')) {
    me.insertAdjacentHTML('afterbegin', salesFetchBar('meSalesBar'));
    bindSalesFetch(me, 'meSalesBar', function (r) {
      let n = 0;
      r.items.forEach(function (it) {
        if (typeof menuData === 'undefined') return;
        menuData[it.recipe] = menuData[it.recipe] || { price: 0, units: 0, selected: true };
        menuData[it.recipe].units = Math.round(it.qty); menuData[it.recipe].salesPrice = it.avgPrice || 0; n++;
      });
      // تصفير كميات الأطباق التي لم تُبع في الفترة
      allRecipes.forEach(function (rc) { if (!r.items.some(function (it) { return it.recipe === rc.name; }) && menuData[rc.name]) { menuData[rc.name].units = 0; menuData[rc.name].salesPrice = 0; } });
      window.ME_EXTRA = (r.unmatched || []).map(function (x) { return { name: x.name, units: Math.round(x.qty), salesPrice: x.avgPrice || 0, listPrice: x.listPrice || x.avgPrice || 0, cost: x.cost || 0, selected: true }; });
      applyPriceSrc();
      if (typeof saveMenuDataToStorage === 'function') saveMenuDataToStorage();
      if (typeof renderMenuInputForm === 'function') renderMenuInputForm();
      return n;
    });
  }
  const be = document.getElementById('breakevenProductsContainer');
  if (be && !document.getElementById('beSalesBar')) {
    be.parentElement.insertAdjacentHTML('afterbegin', salesFetchBar('beSalesBar'));
    bindSalesFetch(be.parentElement, 'beSalesBar', function (r, brName) {
      let n = 0;
      window.BE_SALES = {};
      r.items.forEach(function (it) { window.BE_SALES[it.recipe] = { units: Math.round(it.qty), price: it.avgPrice }; n++; });
      window.BE_EXTRA = (r.unmatched || []).map(function (x) { return { name: x.name, units: Math.round(x.qty), salesPrice: x.avgPrice || 0, listPrice: x.listPrice || x.avgPrice || 0, cost: x.cost || 0 }; });
      applyPriceSrc();
      window.BE_SALES_LABEL = brName;
      const fx = document.getElementById('beFixedCosts');
      if (fx && r.expenses > 0) { const monthly = Math.round(r.expenses / r.days * 30 * 100) / 100; fx.value = monthly; showToast('التكاليف الثابتة الشهرية (من مصروفات ' + brName + '): ' + money(monthly) + ' — يمكنك تعديلها'); }
      if (typeof renderBreakevenInputs === 'function') renderBreakevenInputs();
      return n;
    });
  }
}
