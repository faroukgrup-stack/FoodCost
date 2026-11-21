// ============================================================
// biz-v51.js — v5.1.0
// شؤون الموظفين والتكلفة الفعلية (TCC) ودوران الموظفين · المحاسبة والأصول (رأس المال، الإهلاك، التدفق النقدي، الفجوة النقدية)
// دوران المخزون وأوامر الشراء · قنوات/تطبيقات التوصيل وعمولاتها · تحليلات العملاء CAC و CLV
// ============================================================
var V51_DEPTS = { kitchen: 'المطبخ', service: 'الصالة والخدمة', cashier: 'الكاشير', delivery: 'التوصيل', cleaning: 'النظافة والإشراف', management: 'الإدارة', warehouse: 'المستودع', purchasing: 'المشتريات', accounting: 'المحاسبة' };
var V51_EXIT = { resign: 'استقالة', better_offer: 'عرض عمل أفضل', relocation: 'سفر / انتقال', absconded: 'انقطاع عن العمل', terminate_perf: 'فصل لضعف الأداء', terminate_disc: 'فصل تأديبي', contract_end: 'انتهاء العقد', other: 'أخرى' };
var V51_CAP = { capital_in: 'إيداع رأس مال', drawing: 'مسحوبات شخصية / توزيع أرباح', loan_in: 'قرض / تمويل مستلم', loan_repay: 'سداد قسط قرض' };
var V51_METHODS = [['cash', 'نقداً'], ['transfer', 'تحويل بنكي'], ['card', 'بطاقة']];
function v51Spin(el) { el.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-pulse"></i></div>'; }
function v51Err(el, r) { el.innerHTML = '<div class="empty-state">' + h((r && r.error) || 'حدث خطأ') + '</div>'; }
function v51Branches() { return (B.acc && B.acc.branches) || []; }
function v51BrName(id) { const b = v51Branches().find(function (x) { return x.id === id; }); return b ? b.name : '—'; }
function v51BrOpts(all) { return [['', all || 'كل الفروع']].concat(v51Branches().map(function (b) { return [b.id, b.name]; })); }
function v51Sel(id, opts, val) { return '<select id="' + id + '">' + opts.map(function (o) { return '<option value="' + h(o[0]) + '"' + (String(o[0]) === String(val || '') ? ' selected' : '') + '>' + h(o[1]) + '</option>'; }).join('') + '</select>'; }
function v51DeptOpts(all) { return [['', all || 'كل الأقسام']].concat(Object.keys(V51_DEPTS).map(function (k) { return [k, V51_DEPTS[k]]; })); }
function v51Hint(t) { return '<div class="biz-card"><p class="muted" style="margin:0;line-height:1.9;font-size:.84rem">' + t + '</p></div>'; }
function v51Days(n) { return n === null || n === undefined ? '—' : nf(n, 1) + ' يوم'; }
function v51Row2(rows) { return bTable([{ label: 'البند', r: function (x) { return x[2] ? '<b>' + h(x[0]) + '</b>' : h(x[0]); } }, { label: 'المبلغ', num: true, r: function (x) { return '<span style="' + (x[2] ? 'font-weight:800;' : '') + (x[1] < 0 ? 'color:#ef4444' : '') + '">' + money(x[1]) + '</span>'; } }], rows); }

// ============================================================
// شؤون الموظفين
// ============================================================
bizPage('hr', { group: 'hcm', title: 'شؤون الموظفين', icon: 'id-badge', feature: 'hr', perms: ['hr', 'finance'], plan: 'pro',
  pitch: 'بطاقة موظف كاملة (الراتب الأساسي، البدلات الثابتة والمتغيرة، التأمين الصحي، التأمينات الاجتماعية، الرسوم الحكومية، العمل الإضافي) مع احتساب التكلفة الفعلية للموظف تلقائياً، تكلفة العمالة ونسبتها من المبيعات، ومعدل دوران الموظفين حسب الفرع والقسم مع أسباب المغادرة.',
  render: async function (body) {
    body.innerHTML = subTabs('hrSub', [['cards', 'بطاقات الموظفين والتكلفة الفعلية', 'id-card'], ['labor', 'تكلفة العمالة', 'coins'], ['turnover', 'معدل دوران الموظفين', 'people-arrows']], 'cards') + '<div id="hrBody"></div>';
    const el = body.querySelector('#hrBody');
    const go = function (k) { if (k === 'labor') v51Labor(el); else if (k === 'turnover') v51Turnover(el); else v51HrCards(el); };
    bindSubTabs(body, 'hrSub', go); go('cards');
  } });

const V51_HR_F = function () {
  return [{ type: 'section', label: 'البيانات الوظيفية' }, { k: 'name', label: 'اسم الموظف', req: true }, { k: 'job', label: 'المسمى الوظيفي' },
    { k: 'dept', label: 'القسم', type: 'select', options: v51DeptOpts('بدون قسم') }, { k: 'branchId', label: 'الفرع', type: 'select', options: v51BrOpts('غير محدد') },
    { k: 'phone', label: 'الجوال', ltr: true }, { k: 'startDate', label: 'تاريخ التعيين', type: 'date' },
    { k: 'contract', label: 'نوع العقد', type: 'select', options: [['', '—'], ['full', 'دوام كامل'], ['part', 'دوام جزئي'], ['temp', 'مؤقت / موسمي'], ['trial', 'فترة تجربة']] },
    { k: 'nationality', label: 'الجنسية' }, { k: 'idNo', label: 'رقم الهوية / الإقامة', ltr: true }, { k: 'iban', label: 'الآيبان (IBAN)', ltr: true },
    { type: 'section', label: 'الراتب والبدلات الشهرية' }, { k: 'basic', label: 'الراتب الأساسي', type: 'number' }, { k: 'housing', label: 'بدل سكن', type: 'number' },
    { k: 'transport', label: 'بدل نقل', type: 'number' }, { k: 'food', label: 'بدل طعام', type: 'number' }, { k: 'otherFixed', label: 'بدلات ثابتة أخرى', type: 'number' },
    { k: 'variable', label: 'بدلات / حوافز متغيرة متوقعة شهرياً', type: 'number', hint: 'للتخطيط فقط — الفعلي يُحسب من حركات المكافآت والعمل الإضافي' },
    { k: 'otRate', label: 'أجر ساعة العمل الإضافي', type: 'number' },
    { type: 'section', label: 'تكاليف صاحب العمل (لا تُصرف للموظف)' }, { k: 'health', label: 'التأمين الصحي (شهرياً)', type: 'number' },
    { k: 'socialPct', label: 'التأمينات الاجتماعية — نسبة صاحب العمل %', type: 'number', hint: 'تُحسب على الأساسي + السكن' }, { k: 'socialFixed', label: 'تأمينات / رسوم ثابتة شهرية', type: 'number' },
    { k: 'govFees', label: 'رسوم حكومية شهرية (مكتب العمل وغيرها)', type: 'number' }, { k: 'govFeesYear', label: 'رسوم سنوية (إقامة / تصريح عمل / تأشيرة)', type: 'number', hint: 'تُوزع على 12 شهراً' },
    { k: 'eosPct', label: 'مخصص نهاية الخدمة % من الأساسي + السكن', type: 'number', hint: 'مثال: 4.17% = نصف راتب عن كل سنة' }, { k: 'otherCost', label: 'تكاليف أخرى شهرية (سكن عمال، زي، تدريب)', type: 'number' },
    { k: 'notes', label: 'ملاحظات', type: 'textarea', full: true }, { type: 'html', html: '<div id="hrTcc" class="biz-card" style="margin:0"></div>' }];
};
function v51TccCalc(d) {
  const n = function (k) { return Math.max(0, +d[k] || 0); };
  const fixed = n('housing') + n('transport') + n('food') + n('otherFixed');
  const social = (n('basic') + n('housing')) * Math.min(100, n('socialPct')) / 100 + n('socialFixed');
  const employer = n('health') + social + n('govFees') + n('govFeesYear') / 12 + (n('basic') + n('housing')) * Math.min(100, n('eosPct')) / 100 + n('otherCost');
  const gross = n('basic') + fixed + n('variable');
  return { fixed: fixed, social: social, employer: employer, gross: gross, tcc: gross + employer };
}
function v51HrEdit(e, done) {
  const hh = (e && e.hr) || {};
  const vals = e ? { name: e.name, job: e.job, dept: e.dept, branchId: e.branchId, phone: e.phone, startDate: e.startDate, contract: hh.contract, nationality: hh.nationality, idNo: hh.idNo, iban: hh.iban,
    basic: hh.base, housing: hh.housing, transport: hh.transport, food: hh.food, otherFixed: hh.otherFixed, variable: hh.varAllow, otRate: hh.otRate, health: hh.health, socialPct: hh.socialPct,
    socialFixed: hh.socialFixed, govFees: hh.govFees, govFeesYear: hh.govFeesYear, eosPct: hh.eosPct, otherCost: hh.other, notes: hh.notes } : { startDate: isoLocal() };
  const F = V51_HR_F();
  bPrompt(e ? 'بطاقة الموظف — ' + e.name : 'موظف جديد في شؤون الموظفين', F, vals, async function (d) {
    const hrKeys = ['basic', 'housing', 'transport', 'food', 'otherFixed', 'variable', 'otRate', 'health', 'socialPct', 'socialFixed', 'govFees', 'govFeesYear', 'eosPct', 'otherCost', 'contract', 'nationality', 'idNo', 'iban', 'notes'];
    const hr = {}; hrKeys.forEach(function (k) { hr[k] = d[k] === '' ? 0 : d[k]; });
    await bzOk('hrSave', { empId: e ? e.id : '', data: { name: d.name, job: d.job, dept: d.dept, branchId: d.branchId, phone: d.phone, startDate: d.startDate, hr: hr } });
    showToast('تم حفظ بطاقة الموظف'); if (done) done();
  }, { wide: true, icon: 'id-card', onOpen: function (m) {
    const upd = function () {
      const d = readForm(m.el, F), t = v51TccCalc(d);
      m.$('#hrTcc').innerHTML = '<div class="biz-kpis" style="margin:0">' + [['إجمالي الراتب والبدلات', t.gross], ['تكاليف صاحب العمل', t.employer], ['التكلفة الفعلية الشهرية (TCC)', t.tcc], ['التكلفة السنوية', t.tcc * 12]].map(function (x, i) {
        return '<div class="dash-card"><div class="label">' + h(x[0]) + '</div><div class="value" style="' + (i === 2 ? 'color:#f59e0b' : '') + '">' + money(x[1]) + '</div></div>'; }).join('') + '</div>';
    };
    m.el.addEventListener('input', upd); upd();
  } });
}
async function v51HrCards(el) {
  el.innerHTML = '<div class="biz-filter"><label>الشهر <input type="month" id="hrM" value="' + isoLocal().slice(0, 7) + '"></label><label>القسم ' + v51Sel('hrD', v51DeptOpts()) + '</label>' +
    '<label class="biz-check" style="margin:0"><input type="checkbox" id="hrLeft"> <span>إظهار المغادرين</span></label><input type="search" id="hrQ" placeholder="بحث بالاسم" style="max-width:200px">' +
    '<span class="grow"></span>' + (canP('hr') ? '<button class="btn btn-primary btn-sm" id="hrNew"><i class="fas fa-user-plus"></i> موظف جديد</button>' : '') + rptButtons('hrRP') + '</div><div id="hrB"></div>';
  let R = null;
  const box = el.querySelector('#hrB');
  const list = function () {
    const q = (el.querySelector('#hrQ').value || '').trim().toLowerCase(), dp = el.querySelector('#hrD').value, left = el.querySelector('#hrLeft').checked;
    return R.rows.filter(function (x) { return (left || x.active) && (!dp || x.dept === dp) && (!q || (x.name + ' ' + x.job).toLowerCase().indexOf(q) >= 0); });
  };
  const draw = function () {
    const rows = list(), T = R.totals;
    box.innerHTML = (R.deptScope ? v51Hint('<i class="fas fa-lock"></i> صلاحيتك محددة بقسم: <b>' + h(V51_DEPTS[R.deptScope] || R.deptScope) + '</b>') : '') +
      kpis([['الموظفون النشطون', nf(T.headcount, 0)], ['الرواتب والبدلات الشهرية', money(T.gross)], ['تكاليف صاحب العمل', money(T.employer), 'تأمينات ورسوم ونهاية خدمة', '#f59e0b'],
        ['التكلفة الفعلية الشهرية (TCC)', money(T.tcc), 'سنوياً ' + money(T.tcc * 12), '#ef4444'], ['التكلفة الفعلية لهذا الشهر', money(T.tccActual), 'شاملة الإضافي والمكافآت المسجلة', '#10b981']]) +
      bTable([{ label: 'الموظف', r: function (x) { return '<b>' + h(x.name) + '</b><div class="muted" style="font-size:.72rem">' + h(x.job || '') + (x.dept ? ' · ' + h(V51_DEPTS[x.dept] || x.dept) : '') + (x.branchId ? ' · ' + h(v51BrName(x.branchId)) : '') + '</div>'; } },
        { label: 'الأساسي', num: true, r: function (x) { return money(x.hr.base); } },
        { label: 'البدلات', num: true, r: function (x) { return money(x.hr.fixedAllow + x.hr.varAllow); } },
        { label: 'تكاليف صاحب العمل', num: true, r: function (x) { return money(x.hr.employer); } },
        { label: 'التكلفة الفعلية الشهرية', num: true, r: function (x) { return '<b style="color:#f59e0b">' + money(x.hr.tcc) + '</b>'; } },
        { label: 'إضافي / مكافآت الشهر', num: true, r: function (x) { return x.month.actualVar ? money(x.month.actualVar) : '—'; } },
        { label: 'سلف قائمة', num: true, r: function (x) { return x.advanceOutstanding ? money(x.advanceOutstanding) : '—'; } },
        { label: 'الحالة', r: function (x) { return x.active ? (x.hr.base ? '<span class="badge badge-success">على رأس العمل</span>' : '<span class="badge badge-warning">أكمل البطاقة</span>') : '<span class="badge badge-danger">غادر ' + h(x.endDate) + '</span><div class="muted" style="font-size:.7rem">' + h(V51_EXIT[x.exitReason] || '') + '</div>'; } },
        { label: '', r: function (x) { return canP('hr') ? '<div class="ops-row-acts"><button class="ico-btn" data-he="' + h(x.id) + '" title="بطاقة الموظف"><i class="fas fa-pen"></i></button>' +
          (x.active ? '<button class="ico-btn" data-ho="' + h(x.id) + '" title="عمل إضافي"><i class="fas fa-clock"></i></button><button class="ico-btn danger" data-hx="' + h(x.id) + '" title="مغادرة"><i class="fas fa-door-open"></i></button>' : '<button class="ico-btn" data-hr="' + h(x.id) + '" title="إعادة تعيين"><i class="fas fa-undo"></i></button>') +
          (typeof v5EmpReport === 'function' ? '<button class="ico-btn" data-hp="' + h(x.id) + '" title="التقرير الشامل"><i class="fas fa-file-alt"></i></button>' : '') + '</div>' : ''; } }],
        rows, { empty: 'لا يوجد موظفون — أضف الموظفين من «الموظفون والفروع» أو زر «موظف جديد»' });
  };
  const load = async function () { v51Spin(box); const r = await bz('hrList', { month: el.querySelector('#hrM').value }); if (!r.success) return v51Err(box, r); R = r; draw(); };
  el.querySelector('#hrM').onchange = load; el.querySelector('#hrD').onchange = draw; el.querySelector('#hrLeft').onchange = draw; el.querySelector('#hrQ').oninput = draw;
  const nb = el.querySelector('#hrNew'); if (nb) nb.onclick = function () { v51HrEdit(null, load); };
  box.onclick = function (e) {
    const g = function (a) { const b = e.target.closest('[' + a + ']'); return b ? R.rows.find(function (x) { return x.id === b.getAttribute(a); }) : null; };
    let x;
    if ((x = g('data-he'))) v51HrEdit(x, load);
    else if ((x = g('data-ho'))) bPrompt('عمل إضافي — ' + x.name, [{ k: 'hours', label: 'عدد الساعات', type: 'number', req: true }, { k: 'rate', label: 'أجر الساعة', type: 'number', def: x.hr.otRate || '' }, { k: 'date', label: 'التاريخ', type: 'date', def: isoLocal() }, { k: 'note', label: 'ملاحظة', full: true }], {},
      async function (d) { const r = await bzOk('hrOvertime', { empId: x.id, hours: d.hours, rate: d.rate, date: d.date, note: d.note }); showToast('تم تسجيل عمل إضافي بقيمة ' + money(r.amount) + ' في كشف الموظف'); load(); }, { icon: 'clock' });
    else if ((x = g('data-hx'))) bPrompt('تسجيل مغادرة موظف — ' + x.name, [{ k: 'date', label: 'تاريخ آخر يوم عمل', type: 'date', def: isoLocal(), req: true }, { k: 'reason', label: 'سبب المغادرة', type: 'select', options: Object.keys(V51_EXIT).map(function (k) { return [k, V51_EXIT[k]]; }) },
      { k: 'note', label: 'تفاصيل', type: 'textarea', full: true }, { k: 'disableLogin', label: 'إيقاف حساب دخول الموظف للنظام', type: 'checkbox', def: true, full: true }], {},
      async function (d) { await bzOk('hrExit', { empId: x.id, date: d.date, reason: d.reason, note: d.note, disableLogin: d.disableLogin }); showToast('تم تسجيل المغادرة'); load(); }, { icon: 'door-open' });
    else if ((x = g('data-hr'))) bPrompt('إعادة تعيين — ' + x.name, [{ k: 'date', label: 'تاريخ التعيين الجديد', type: 'date', def: isoLocal() }], {}, async function (d) { await bzOk('hrExit', { empId: x.id, rehire: true, date: d.date }); showToast('تمت إعادة التعيين'); load(); });
    else if ((x = g('data-hp'))) v5EmpReport(x.id);
  };
  rptBind(el, 'hrRP', function () {
    if (!R) throw new Error('لا توجد بيانات');
    const rows = list();
    return { title: 'بطاقات الموظفين والتكلفة الفعلية (TCC)', period: R.month, kpis: [['الموظفون', nf(R.totals.headcount, 0)], ['الرواتب والبدلات', money(R.totals.gross)], ['تكاليف صاحب العمل', money(R.totals.employer)], ['التكلفة الفعلية الشهرية', money(R.totals.tcc)]],
      sections: [{ title: 'التكلفة الفعلية لكل موظف', table: { headers: ['الموظف', 'المسمى', 'القسم', 'الأساسي', 'بدل سكن', 'بدلات أخرى', 'التأمين الصحي', 'التأمينات الاجتماعية', 'الرسوم الحكومية', 'نهاية الخدمة وأخرى', 'التكلفة الفعلية'], money: [3, 4, 5, 6, 7, 8, 9, 10], foot: 'sum',
        rows: rows.map(function (x) { const q = x.hr; return [x.name, x.job || '', V51_DEPTS[x.dept] || '', q.base, q.housing, q.transport + q.food + q.otherFixed + q.varAllow, q.health, q.social, q.gov, q.eos + q.other, q.tcc]; }) } }], signature: true };
  });
  load();
}
async function v51Labor(el) {
  el.innerHTML = dateRangeBar('lcR', isoLocal().slice(0, 8) + '01', isoLocal(), hasF('multi_branch') ? '<label>الفرع ' + v51Sel('lcB', v51BrOpts()) + '</label>' : '') + '<div class="biz-toolbar"><span class="grow"></span>' + rptButtons('lcRP') + '</div><div id="lcB0"></div>';
  let R = null; const box = el.querySelector('#lcB0');
  const load = async function (rg) {
    v51Spin(box); const bs = el.querySelector('#lcB');
    const r = await bz('laborCost', { from: rg.from, to: rg.to, branch: bs ? bs.value : '' }); if (!r.success) return v51Err(box, r); R = r;
    const T = r.totals, by = function (m, names) { return Object.keys(m).map(function (k) { return [names(k), m[k], T.total ? m[k] / T.total * 100 : 0]; }).sort(function (a, b) { return b[1] - a[1]; }); };
    R.dept = by(r.byDept, function (k) { return V51_DEPTS[k] || k || 'بدون قسم'; }); R.br = by(r.byBranch, function (k) { return k ? v51BrName(k) : 'غير محدد'; });
    const col = r.laborPct > 35 ? '#ef4444' : r.laborPct > 28 ? '#f59e0b' : '#10b981';
    box.innerHTML = kpis([['إجمالي تكلفة العمالة الفعلية', money(T.total), nf(T.headcount, 0) + ' موظف'], ['نسبة العمالة من المبيعات', r.sales ? v5Pct(r.laborPct) : '—', 'المبيعات بدون ضريبة ' + money(r.sales), col],
      ['الرواتب والبدلات', money(T.salary)], ['الإضافي والمكافآت', money(T.variable)], ['تكاليف صاحب العمل', money(T.employer), '', '#f59e0b'], ['المعدل الشهري', money(r.monthly), 'يُستخدم في نقطة التعادل']]) +
      v51Hint('المعيار الشائع لتكلفة العمالة في المطاعم 25% – 35% من المبيعات. التكلفة الفعلية = الرواتب والبدلات (موزعة على أيام العمل في الفترة) + الإضافي والمكافآت المسجلة − الخصومات + تكاليف صاحب العمل (التأمين الصحي، التأمينات الاجتماعية، الرسوم الحكومية، نهاية الخدمة).') +
      '<div class="biz-grid-2"><div><div class="biz-sec">حسب القسم</div>' + bTable([{ label: 'القسم', r: function (x) { return h(x[0]); } }, { label: 'التكلفة', num: true, r: function (x) { return money(x[1]); } }, { label: '%', num: true, r: function (x) { return v5Pct(x[2]); } }], R.dept) + '</div>' +
      '<div><div class="biz-sec">حسب الفرع</div>' + bTable([{ label: 'الفرع', r: function (x) { return h(x[0]); } }, { label: 'التكلفة', num: true, r: function (x) { return money(x[1]); } }, { label: '%', num: true, r: function (x) { return v5Pct(x[2]); } }], R.br) + '</div></div>' +
      '<div class="biz-sec">تفاصيل الموظفين</div>' + bTable([{ label: 'الموظف', r: function (x) { return '<b>' + h(x.name) + '</b><div class="muted" style="font-size:.72rem">' + h(x.job || '') + '</div>'; } }, { label: 'أشهر العمل', num: true, r: function (x) { return nf(x.months, 2); } },
        { label: 'الرواتب والبدلات', num: true, r: function (x) { return money(x.salary); } }, { label: 'الإضافي والمكافآت', num: true, r: function (x) { return money(x.variable); } }, { label: 'الخصومات', num: true, r: function (x) { return x.deductions ? money(-x.deductions) : '—'; } },
        { label: 'تكاليف صاحب العمل', num: true, r: function (x) { return money(x.employer); } }, { label: 'التكلفة الفعلية', num: true, r: function (x) { return '<b>' + money(x.total) + '</b>'; } }], r.rows, { empty: 'لا توجد بيانات — أكمل بطاقات الموظفين أولاً' });
  };
  const get = bindRange(el, 'lcR', load); load(get());
  rptBind(el, 'lcRP', function () {
    if (!R) throw new Error('لا توجد بيانات');
    return { title: 'تقرير تكلفة العمالة الفعلية', period: R.from + ' — ' + R.to, kpis: [['تكلفة العمالة', money(R.totals.total)], ['نسبة من المبيعات', v5Pct(R.laborPct)], ['تكاليف صاحب العمل', money(R.totals.employer)], ['المعدل الشهري', money(R.monthly)]],
      sections: [{ title: 'حسب القسم', table: { headers: ['القسم', 'التكلفة', '%'], money: [1], foot: 'sum', rows: R.dept.map(function (x) { return [x[0], x[1], nf(x[2], 1) + '%']; }) } },
        { title: 'حسب الفرع', table: { headers: ['الفرع', 'التكلفة', '%'], money: [1], foot: 'sum', rows: R.br.map(function (x) { return [x[0], x[1], nf(x[2], 1) + '%']; }) } },
        { title: 'تفاصيل الموظفين', table: { headers: ['الموظف', 'المسمى', 'الرواتب والبدلات', 'الإضافي والمكافآت', 'الخصومات', 'تكاليف صاحب العمل', 'التكلفة الفعلية'], money: [2, 3, 4, 5, 6], foot: 'sum', rows: R.rows.map(function (x) { return [x.name, x.job || '', x.salary, x.variable, -x.deductions, x.employer, x.total]; }) } }], signature: true };
  });
}
async function v51Turnover(el) {
  el.innerHTML = dateRangeBar('toR', daysAgo(364), isoLocal(), (hasF('multi_branch') ? '<label>الفرع ' + v51Sel('toB', v51BrOpts()) + '</label>' : '') + '<label>القسم ' + v51Sel('toD', v51DeptOpts()) + '</label>') + '<div class="biz-toolbar"><span class="grow"></span>' + rptButtons('toRP') + '</div><div id="toB0"></div>';
  let R = null; const box = el.querySelector('#toB0');
  const load = async function (rg) {
    v51Spin(box); const bs = el.querySelector('#toB');
    const r = await bz('hrTurnover', { from: rg.from, to: rg.to, branch: bs ? bs.value : '', dept: el.querySelector('#toD').value }); if (!r.success) return v51Err(box, r); R = r;
    const col = r.annualized > 60 ? '#ef4444' : r.annualized > 30 ? '#f59e0b' : '#10b981';
    const tb = function (rows, lbl) { return bTable([{ label: lbl, r: function (x) { return h(x.name); } }, { label: 'العدد الحالي', num: true, r: function (x) { return nf(x.headcount, 0); } }, { label: 'المغادرون', num: true, r: function (x) { return nf(x.exits, 0); } }, { label: 'معدل الدوران', num: true, r: function (x) { return v5Pct(x.rate); } }], rows); };
    box.innerHTML = kpis([['معدل دوران الموظفين', v5Pct(r.rate), 'للفترة (' + r.days + ' يوم)', col], ['المعدل السنوي', v5Pct(r.annualized), '', col], ['المغادرون', nf(r.exits, 0), 'طوعي ' + r.voluntary + ' · غير طوعي ' + r.involuntary],
      ['المعيّنون الجدد', nf(r.hires, 0)], ['متوسط عدد الموظفين', nf(r.avgHeadcount, 1), 'بداية ' + r.headcountStart + ' · نهاية ' + r.headcountEnd], ['معدل الاستبقاء', v5Pct(r.retention)]]) +
      v51Hint('معدل الدوران = عدد المغادرين خلال الفترة ÷ متوسط عدد الموظفين (بداية الفترة + نهايتها ÷ 2) × 100. سجّل المغادرة من «بطاقات الموظفين» بزر المغادرة مع السبب ليظهر هنا التحليل حسب السبب والقسم والفرع.') +
      '<div class="biz-sec">أسباب المغادرة</div>' + bTable([{ label: 'السبب', r: function (x) { return h(x.name) + ' <span class="badge ' + (x.voluntary ? 'badge-warning">طوعي' : 'badge-info">غير طوعي') + '</span>'; } }, { label: 'العدد', num: true, r: function (x) { return nf(x.n, 0); } }, { label: '%', num: true, r: function (x) { return v5Pct(r.exits ? x.n / r.exits * 100 : 0); } }], r.byReason, { empty: 'لا توجد مغادرات في الفترة' }) +
      '<div class="biz-grid-2"><div><div class="biz-sec">حسب القسم</div>' + tb(r.byDept, 'القسم') + '</div><div><div class="biz-sec">حسب الفرع</div>' + tb(r.byBranch, 'الفرع') + '</div></div>' +
      '<div class="biz-sec">الموظفون المغادرون</div>' + bTable([{ label: 'الموظف', r: function (x) { return '<b>' + h(x.name) + '</b><div class="muted" style="font-size:.72rem">' + h(x.job || '') + ' · ' + h(x.dept || '') + '</div>'; } }, { label: 'التعيين', r: function (x) { return h(x.startDate || '—'); } }, { label: 'المغادرة', r: function (x) { return h(x.endDate); } },
        { label: 'مدة الخدمة', num: true, r: function (x) { return nf(x.tenureMonths, 1) + ' شهر'; } }, { label: 'السبب', r: function (x) { return h(x.reason) + (x.note ? '<div class="muted" style="font-size:.72rem">' + h(x.note) + '</div>' : ''); } }], r.leavers, { empty: 'لا توجد مغادرات في الفترة' });
  };
  const get = bindRange(el, 'toR', load); load(get());
  rptBind(el, 'toRP', function () {
    if (!R) throw new Error('لا توجد بيانات');
    return { title: 'تقرير معدل دوران الموظفين', period: R.from + ' — ' + R.to, kpis: [['معدل الدوران', v5Pct(R.rate)], ['المعدل السنوي', v5Pct(R.annualized)], ['المغادرون', nf(R.exits, 0)], ['متوسط الموظفين', nf(R.avgHeadcount, 1)]],
      sections: [{ title: 'أسباب المغادرة', table: { headers: ['السبب', 'النوع', 'العدد'], rows: R.byReason.map(function (x) { return [x.name, x.voluntary ? 'طوعي' : 'غير طوعي', x.n]; }) } },
        { title: 'حسب القسم', table: { headers: ['القسم', 'العدد الحالي', 'المغادرون', 'معدل الدوران %'], rows: R.byDept.map(function (x) { return [x.name, x.headcount, x.exits, x.rate]; }) } },
        { title: 'حسب الفرع', table: { headers: ['الفرع', 'العدد الحالي', 'المغادرون', 'معدل الدوران %'], rows: R.byBranch.map(function (x) { return [x.name, x.headcount, x.exits, x.rate]; }) } },
        { title: 'المغادرون', table: { headers: ['الموظف', 'القسم', 'التعيين', 'المغادرة', 'مدة الخدمة (شهر)', 'السبب'], rows: R.leavers.map(function (x) { return [x.name, x.dept, x.startDate, x.endDate, x.tenureMonths, x.reason]; }) } }], signature: true };
  });
}

// ============================================================
// المحاسبة والأصول
// ============================================================
bizPage('accounting', { group: 'fin', title: 'المحاسبة والأصول', icon: 'landmark', feature: 'accounting', perms: ['finance', 'assets'], plan: 'premium',
  pitch: 'رأس المال والقروض، سجل الأصول الثابتة مع الإهلاك التلقائي وصافي القيمة الدفترية، معالجة بيع الأصول كإيراد مستقل، قائمة التدفق النقدي، والفجوة النقدية (دورة التحويل النقدي).',
  render: async function (body) {
    const fin = canP('finance');
    body.innerHTML = subTabs('acSub', [['capital', 'رأس المال والتمويل', 'piggy-bank'], ['assets', 'الأصول الثابتة والإهلاك', 'building']], 'capital') + '<div id="acBody"></div>';
    const el = body.querySelector('#acBody');
    const go = function (k) { if (k === 'assets') v51Assets(el); else if (k === 'cash') v51Cash(el); else if (k === 'ccc') v51Ccc(el); else v51Capital(el); };
    bindSubTabs(body, 'acSub', go); go('capital');
  } });
async function v51Capital(el) {
  el.innerHTML = '<div class="biz-toolbar"><span class="grow"></span><button class="btn btn-primary btn-sm" id="cpNew"><i class="fas fa-plus"></i> حركة رأس مال / تمويل</button>' + rptButtons('cpRP') + '</div><div id="cpB"></div>';
  const box = el.querySelector('#cpB'); v51Spin(box);
  const res = await Promise.all([bz('capitalReport', {}), bz('v51List', { kind: 'capital' })]);
  const S = res[0], L = res[1]; if (!S.success) return v51Err(box, S); if (!L.success) return v51Err(box, L);
  const rows = L.rows;
  box.innerHTML = kpis([['رأس المال المودع', money(S.capitalIn), '', '#10b981'], ['المسحوبات وتوزيعات الأرباح', money(S.drawings), '', '#ef4444'], ['صافي رأس المال', money(S.equity)],
    ['القروض المستلمة', money(S.loansIn)], ['رصيد القروض القائم', money(S.loanBalance), 'المسدد ' + money(S.loanRepaid), '#f59e0b'], ['الأصول الثابتة (صافي)', money(S.fixedAssetsNbv), 'التكلفة ' + money(S.fixedAssetsCost)]]) +
    v51Hint('سجّل هنا رأس المال الذي أودعه الشركاء، والمسحوبات الشخصية وتوزيعات الأرباح، والقروض والتمويل وأقساط سدادها. هذه الحركات تظهر في قائمة التدفق النقدي (الأنشطة التمويلية) وفي حقوق الملكية بالمركز المالي، ولا تؤثر على قائمة الدخل.') +
    bTable([{ label: 'التاريخ', r: function (x) { return h(x.period || ''); } }, { label: 'النوع', r: function (x) { const t = x.data.type; return '<span class="badge ' + (t === 'capital_in' || t === 'loan_in' ? 'badge-success' : 'badge-warning') + '">' + h(V51_CAP[t] || t) + '</span>' + (x.data.inKind ? ' <span class="badge badge-info">عيني</span>' : ''); } },
      { label: 'البيان', r: function (x) { return '<b>' + h(x.title) + '</b>' + (x.data.party ? '<div class="muted" style="font-size:.72rem">' + h(x.data.party) + '</div>' : '') + (x.data.note ? '<div class="muted" style="font-size:.72rem">' + h(x.data.note) + '</div>' : ''); } },
      { label: 'المبلغ', num: true, r: function (x) { return '<b>' + money(x.data.amount) + '</b>'; } }, { label: 'الطريقة', r: function (x) { return h((V51_METHODS.find(function (m) { return m[0] === x.data.method; }) || ['', x.data.method])[1]); } },
      { label: '', r: function (x) { return '<button class="ico-btn" data-ce="' + x.id + '"><i class="fas fa-pen"></i></button><button class="ico-btn danger" data-cd="' + x.id + '"><i class="fas fa-trash"></i></button>'; } }], rows, { empty: 'لا توجد حركات رأس مال بعد' });
  const edit = function (x) {
    const F = [{ k: 'type', label: 'نوع الحركة', type: 'select', options: Object.keys(V51_CAP).map(function (k) { return [k, V51_CAP[k]]; }) }, { k: 'period', label: 'التاريخ', type: 'date', req: true }, { k: 'amount', label: 'المبلغ', type: 'number', req: true },
      { k: 'method', label: 'الطريقة', type: 'select', options: V51_METHODS }, { k: 'title', label: 'البيان', full: true, ph: 'مثال: رأس مال تأسيس المطعم' }, { k: 'party', label: 'الشريك / الجهة الممولة' },
      { k: 'inKind', label: 'مساهمة عينية (أصل وليس نقداً — لا تدخل في التدفق النقدي)', type: 'checkbox', full: true }, { k: 'note', label: 'ملاحظات', type: 'textarea', full: true }];
    bPrompt(x ? 'تعديل حركة رأس مال' : 'حركة رأس مال / تمويل', F, x ? Object.assign({ title: x.title, period: x.period }, x.data) : { period: isoLocal(), type: 'capital_in', method: 'cash' }, async function (d) {
      await bzOk('v51Save', { kind: 'capital', data: { id: x ? x.id : '', title: d.title || V51_CAP[d.type], period: d.period, data: d } }); showToast('تم الحفظ'); v51Capital(el);
    }, { icon: 'piggy-bank' });
  };
  el.querySelector('#cpNew').onclick = function () { edit(null); };
  box.onclick = async function (e) { const a = e.target.closest('[data-ce]'), d = e.target.closest('[data-cd]');
    if (a) edit(rows.find(function (x) { return x.id === a.dataset.ce; }));
    if (d && await bConfirm('حذف هذه الحركة؟')) { await bzOk('v51Delete', { id: d.dataset.cd }); v51Capital(el); } };
  rptBind(el, 'cpRP', function () { return { title: 'رأس المال والتمويل', kpis: [['صافي رأس المال', money(S.equity)], ['رصيد القروض', money(S.loanBalance)], ['الأصول الثابتة (صافي)', money(S.fixedAssetsNbv)]],
    sections: [{ title: 'حركات رأس المال والتمويل', table: { headers: ['التاريخ', 'النوع', 'البيان', 'الجهة', 'المبلغ'], money: [4], rows: rows.map(function (x) { return [x.period || '', V51_CAP[x.data.type] || x.data.type, x.title, x.data.party || '', x.data.amount]; }) } }], signature: true }; });
}
const V51_ASSET_CATS = ['معدات المطبخ', 'أثاث وديكور', 'أجهزة وحواسيب', 'سيارات ودراجات توصيل', 'تجهيزات وتحسينات المحل', 'أخرى'];
async function v51Assets(el) {
  el.innerHTML = dateRangeBar('asR', isoLocal().slice(0, 5) + '01-01', isoLocal(), hasF('multi_branch') ? '<label>الفرع ' + v51Sel('asB', v51BrOpts()) + '</label>' : '') +
    '<div class="biz-toolbar"><span class="grow"></span><button class="btn btn-primary btn-sm" id="asNew"><i class="fas fa-plus"></i> أصل ثابت جديد</button>' + rptButtons('asRP') + '</div><div id="asB0"></div>';
  let R = null, rg0 = null; const box = el.querySelector('#asB0');
  const load = async function (rg) {
    rg0 = rg; v51Spin(box); const bs = el.querySelector('#asB');
    const r = await bz('assetsReport', { from: rg.from, to: rg.to, branchId: bs ? (bs.value || 'all') : 'all' }); if (!r.success) return v51Err(box, r); R = r; const T = r.totals;
    box.innerHTML = kpis([['تكلفة الأصول القائمة', money(T.cost), nf(T.count, 0) + ' أصل'], ['مجمع الإهلاك', money(T.accumulated), '', '#f59e0b'], ['صافي القيمة الدفترية', money(T.nbv), '', '#10b981'],
      ['إهلاك الفترة', money(T.periodDep), 'يظهر في قائمة الدخل', '#ef4444'], ['الإهلاك الشهري الحالي', money(T.monthly)], ['أرباح/خسائر بيع الأصول', money(T.soldGain), 'إيراد آخر مستقل · المتحصلات ' + money(T.soldProceeds), T.soldGain >= 0 ? '#10b981' : '#ef4444']]) +
      v51Hint('الإهلاك بطريقة القسط الثابت: (التكلفة − القيمة التخريدية) ÷ العمر الإنتاجي، ويُحتسب يومياً حتى تاريخ نهاية الفترة. عند البيع: الربح أو الخسارة = سعر البيع − صافي القيمة الدفترية في تاريخ البيع، ويُسجَّل كإيراد آخر منفصل عن مبيعات الطعام والشراب.') +
      bTable([{ label: 'الأصل', r: function (x) { return '<b>' + h(x.name) + '</b><div class="muted" style="font-size:.72rem">' + h(x.category) + (x.serial ? ' · ' + h(x.serial) : '') + (x.branchId ? ' · ' + h(v51BrName(x.branchId)) : '') + '</div>'; } },
        { label: 'تاريخ الشراء', r: function (x) { return h(x.purchaseDate || ''); } }, { label: 'التكلفة', num: true, r: function (x) { return money(x.cost); } }, { label: 'العمر', num: true, r: function (x) { return nf(x.lifeYears, 1) + ' سنة'; } },
        { label: 'الإهلاك الشهري', num: true, r: function (x) { return money(x.monthly); } }, { label: 'مجمع الإهلاك', num: true, r: function (x) { return money(x.accumulated); } }, { label: 'إهلاك الفترة', num: true, r: function (x) { return money(x.periodDep); } },
        { label: 'صافي القيمة الدفترية', num: true, r: function (x) { return '<b>' + money(x.nbv) + '</b>'; } },
        { label: 'الحالة', r: function (x) { return x.status === 'active' ? (x.fully ? '<span class="badge badge-info">مُهلك بالكامل</span>' : '<span class="badge badge-success">قيد الاستخدام</span>') : '<span class="badge badge-warning">' + (x.status === 'sold' ? 'مباع' : 'مستبعد') + '</span><div class="muted" style="font-size:.7rem;line-height:1.6">' + (x.status === 'sold' ? 'بسعر ' + money(x.salePrice) + '<br>' : '') + h(x.saleDate) + ' · ' + (x.gain >= 0 ? 'ربح ' : 'خسارة ') + money(Math.abs(x.gain)) + '</div>'; } },
        { label: '', r: function (x) { return x.status === 'active' ? '<div class="ops-row-acts"><button class="ico-btn" data-ae="' + x.id + '" title="تعديل"><i class="fas fa-pen"></i></button><button class="ico-btn" data-as="' + x.id + '" title="بيع / استبعاد"><i class="fas fa-hand-holding-usd"></i></button><button class="ico-btn danger" data-ad="' + x.id + '"><i class="fas fa-trash"></i></button></div>' : '<button class="ico-btn danger" data-ad="' + x.id + '"><i class="fas fa-trash"></i></button>'; } }],
        r.rows, { empty: 'لا توجد أصول ثابتة — أضف المعدات والأثاث والسيارات' });
  };
  const edit = function (x) {
    const F = [{ k: 'title', label: 'اسم الأصل', req: true }, { k: 'category', label: 'الفئة', type: 'select', options: V51_ASSET_CATS }, { k: 'purchaseDate', label: 'تاريخ الشراء', type: 'date', req: true },
      { k: 'cost', label: 'تكلفة الشراء', type: 'number', req: true }, { k: 'lifeYears', label: 'العمر الإنتاجي (سنوات)', type: 'number', def: 5 }, { k: 'salvage', label: 'القيمة التخريدية (المتبقية)', type: 'number', def: 0 },
      { k: 'branchId', label: 'الفرع', type: 'select', options: v51BrOpts('عام / كل الفروع') }, { k: 'supplier', label: 'المورد' }, { k: 'serial', label: 'الرقم التسلسلي', ltr: true }, { k: 'location', label: 'الموقع' },
      { k: 'paid', label: 'دُفع نقداً / تحويل (يظهر في التدفق النقدي الاستثماري)', type: 'checkbox', def: true, full: true }, { k: 'method', label: 'طريقة الدفع', type: 'select', options: V51_METHODS }, { k: 'note', label: 'ملاحظات', type: 'textarea', full: true }];
    const v = x ? { title: x.name, category: x.category, purchaseDate: x.purchaseDate, cost: x.cost, lifeYears: x.lifeYears, salvage: x.salvage, branchId: x.branchId || '', supplier: x.supplier, serial: x.serial, location: x.location, paid: x.paid, method: x.method, note: x.note } : { purchaseDate: isoLocal() };
    bPrompt(x ? 'تعديل أصل ثابت' : 'أصل ثابت جديد', F, v, async function (d) { await bzOk('v51Save', { kind: 'asset', data: { id: x ? x.id : '', title: d.title, branchId: d.branchId, data: d } }); showToast('تم حفظ الأصل'); load(rg0); }, { wide: true, icon: 'building' });
  };
  el.querySelector('#asNew').onclick = function () { edit(null); };
  box.onclick = async function (e) {
    const f = function (a) { const b = e.target.closest('[' + a + ']'); return b ? R.rows.find(function (x) { return x.id === b.getAttribute(a); }) : null; };
    let x;
    if ((x = f('data-ae'))) edit(x);
    else if ((x = f('data-as'))) bPrompt('بيع أو استبعاد أصل — ' + x.name, [{ k: 'dispose', label: 'استبعاد / تخريد بدون بيع', type: 'checkbox', full: true }, { k: 'date', label: 'التاريخ', type: 'date', def: isoLocal(), req: true }, { k: 'price', label: 'سعر البيع', type: 'number', def: 0 },
      { k: 'method', label: 'طريقة الاستلام', type: 'select', options: V51_METHODS }, { k: 'buyer', label: 'المشتري' }, { k: 'note', label: 'ملاحظات', full: true }, { type: 'html', html: '<div class="muted">صافي القيمة الدفترية الحالية: <b>' + money(x.nbv) + '</b></div>' }], {},
      async function (d) { const r = await bzOk('assetSell', { id: x.id, date: d.date, price: d.price, dispose: d.dispose, method: d.method, buyer: d.buyer, note: d.note }); showToast((r.gain >= 0 ? 'ربح بيع أصل ' : 'خسارة بيع أصل ') + money(Math.abs(r.gain))); load(rg0); }, { icon: 'hand-holding-usd' });
    else if ((x = f('data-ad')) && await bConfirm('حذف الأصل «' + x.name + '» نهائياً؟ (للبيع استخدم زر البيع)')) { await bzOk('v51Delete', { id: x.id }); load(rg0); }
  };
  const get = bindRange(el, 'asR', load); load(get());
  rptBind(el, 'asRP', function () {
    if (!R) throw new Error('لا توجد بيانات');
    return { title: 'سجل الأصول الثابتة والإهلاك', period: R.from + ' — ' + R.to, kpis: [['التكلفة', money(R.totals.cost)], ['مجمع الإهلاك', money(R.totals.accumulated)], ['صافي القيمة الدفترية', money(R.totals.nbv)], ['إهلاك الفترة', money(R.totals.periodDep)]],
      sections: [{ title: 'الأصول', table: { headers: ['الأصل', 'الفئة', 'تاريخ الشراء', 'التكلفة', 'العمر (سنة)', 'التخريدية', 'مجمع الإهلاك', 'إهلاك الفترة', 'صافي القيمة الدفترية', 'الحالة'], money: [3, 5, 6, 7, 8], foot: 'sum',
        rows: R.rows.map(function (x) { return [x.name, x.category, x.purchaseDate, x.cost, x.lifeYears, x.salvage, x.accumulated, x.periodDep, x.nbv, x.status === 'active' ? 'قيد الاستخدام' : (x.status === 'sold' ? 'مباع ' + x.saleDate : 'مستبعد ' + x.saleDate)]; }) } }], signature: true };
  });
}
async function v51Cash(el) {
  const oc = localStorage.getItem('fcOpeningCash_' + ((B.acc && B.acc.email) || '')) || '';
  el.innerHTML = dateRangeBar('cfR', isoLocal().slice(0, 8) + '01', isoLocal(), '<label>رصيد نقدي افتتاحي قبل بدء النظام <input type="number" step="any" id="cfOC" value="' + h(oc) + '" style="width:110px"></label>') + '<div class="biz-toolbar"><span class="grow"></span>' + rptButtons('cfRP') + '</div><div id="cfB0"></div>';
  let R = null; const box = el.querySelector('#cfB0');
  const L = { sales: 'المقبوضات من المبيعات (نقد، بطاقة، تحويل) بعد المرتجعات', collections: 'تحصيلات من العملاء (الآجل)', giftCards: 'بيع وشحن بطاقات الهدايا', suppliers: 'المدفوع للموردين (فواتير الشراء والسداد)', expenses: 'المصروفات التشغيلية المدفوعة', employees: 'المدفوع للموظفين (رواتب وسلف بعد المسترد)', commissions: 'عمولات تطبيقات التوصيل',
    assetPurchases: 'شراء أصول ثابتة', assetSales: 'متحصلات بيع أصول ثابتة', capitalIn: 'إيداعات رأس المال', drawings: 'المسحوبات وتوزيعات الأرباح', loansIn: 'قروض وتمويل مستلم', loanRepay: 'سداد أقساط القروض' };
  const load = async function (rg) {
    v51Spin(box); const ocv = el.querySelector('#cfOC').value; localStorage.setItem('fcOpeningCash_' + ((B.acc && B.acc.email) || ''), ocv);
    const r = await bz('cashFlow', { from: rg.from, to: rg.to, openingCash: ocv }); if (!r.success) return v51Err(box, r); R = r;
    const sec = function (o) { return Object.keys(o).map(function (k) { return [L[k] || k, o[k]]; }); };
    R.ops = sec(r.operatingLines); R.inv = sec(r.investingLines); R.fin = sec(r.financingLines);
    box.innerHTML = kpis([['رصيد النقدية أول المدة', money(r.opening)], ['صافي التدفق التشغيلي', money(r.operating), '', r.operating >= 0 ? '#10b981' : '#ef4444'], ['صافي التدفق الاستثماري', money(r.investing)], ['صافي التدفق التمويلي', money(r.financing)],
      ['صافي التغير في النقدية', money(r.net), '', r.net >= 0 ? '#10b981' : '#ef4444'], ['رصيد النقدية آخر المدة', money(r.closing), 'صافي الربح المحاسبي ' + money(r.netProfit), '#f59e0b']]) +
      v51Hint(h(r.note) + '. الفرق بين صافي الربح والتدفق التشغيلي يعود إلى المبيعات والمشتريات الآجلة وتغير المخزون والإهلاك (مصروف غير نقدي).') +
      '<div class="biz-sec">التدفقات النقدية من الأنشطة التشغيلية</div>' + v51Row2(R.ops.concat([['صافي التدفق من الأنشطة التشغيلية', r.operating, 1]])) +
      '<div class="biz-sec">التدفقات النقدية من الأنشطة الاستثمارية</div>' + v51Row2(R.inv.concat([['صافي التدفق من الأنشطة الاستثمارية', r.investing, 1]])) +
      '<div class="biz-sec">التدفقات النقدية من الأنشطة التمويلية</div>' + v51Row2(R.fin.concat([['صافي التدفق من الأنشطة التمويلية', r.financing, 1]])) +
      '<div class="biz-sec">الملخص</div>' + v51Row2([['رصيد النقدية أول المدة', r.opening], ['صافي التغير في النقدية', r.net], ['رصيد النقدية آخر المدة', r.closing, 1]]) +
      (r.indirect ? '<div class="biz-sec">الطريقة غير المباشرة: من صافي الربح إلى التدفق التشغيلي ' + (r.reconciled ? '<span class="badge badge-success">مطابقة</span>' : '') + '</div>' + v51Row2([['صافي الربح', r.indirect.profit, 1]].concat(r.indirect.adjustments.map(function (x) { return [x.name, x.amount]; }), [['صافي التدفق التشغيلي', r.indirect.operating, 1]])) : '') +
      (r.liquidity ? v51LiqBlock(r.liquidity) : '');
  };
  const get = bindRange(el, 'cfR', load); load(get());
  rptBind(el, 'cfRP', function () {
    if (!R) throw new Error('لا توجد بيانات');
    const t = function (rows, tot, lbl) { return { title: lbl, table: { headers: ['البند', 'المبلغ'], money: [1], rows: rows.concat([['الصافي', tot]]) } }; };
    return { title: 'قائمة التدفق النقدي', period: R.from + ' — ' + R.to, kpis: [['أول المدة', money(R.opening)], ['التشغيلي', money(R.operating)], ['الاستثماري', money(R.investing)], ['التمويلي', money(R.financing)], ['آخر المدة', money(R.closing)]],
      sections: [t(R.ops, R.operating, 'الأنشطة التشغيلية'), t(R.inv, R.investing, 'الأنشطة الاستثمارية'), t(R.fin, R.financing, 'الأنشطة التمويلية'), { title: 'الملخص', table: { headers: ['البند', 'المبلغ'], money: [1], rows: [['رصيد أول المدة', R.opening], ['صافي التغير', R.net], ['رصيد آخر المدة', R.closing]] } }], signature: true };
  });
}
// v5.2.0: الصورة الكاملة للسيولة — أثر الفجوة النقدية + الرواتب والتكلفة الفعلية للعمالة + الأصول + الالتزامات
function v51LiqBlock(q) {
  const c = q.cycle || {}, lb = q.labor || {}, a = q.assets || {}, py = q.payables || {}, rc = q.receivables || {};
  return '<div class="biz-sec">الصورة الكاملة للسيولة</div>' + kpis([['صافي السيولة بعد الالتزامات والفجوة', money(q.netLiquidity), '', q.netLiquidity >= 0 ? '#10b981' : '#ef4444'], ['دورة التحويل النقدي', v51Days(c.ccc), 'رأس مال عامل مطلوب ' + money(c.workingCapitalNeed)],
      ['التكلفة الفعلية الشهرية للعمالة (TCC)', money(lb.monthlyTcc), nf(lb.pctOfSales, 1) + '% من الإيرادات'], ['الحرق الشهري الصافي', money(q.burnMonthly), q.runwayMonths === null || q.runwayMonths === undefined ? 'التدفقات تغطي المصروفات' : 'تكفي النقدية ' + nf(q.runwayMonths, 1) + ' شهر'], ['EBITDA', money(q.ebitda)]]) +
    '<div class="biz-sec">مطابقة صافي السيولة</div>' + v51Row2([['النقد وما في حكمه (الصندوق والبنك)', q.cash], ['+ ذمم منصات التوصيل غير المسوّاة', Math.max(0, rc.platforms || 0)], ['+ ذمم العملاء الآجلة', rc.customers], ['= السيولة السريعة', q.quickLiquidity, 1],
      ['− ذمم الموردين', -py.suppliers], ['− رواتب ومستحقات الموظفين', -py.salaries], ['− ضريبة القيمة المضافة المستحقة', -Math.max(0, py.vat || 0)], ['− مصروفات مستحقة ودائنو أصول', -py.accrued], ['− التزامات بطاقات الهدايا', -py.giftCards], ['= إجمالي الالتزامات قصيرة الأجل', -q.shortLiabilities, 1],
      ['− رأس المال العامل المطلوب لتغطية الفجوة النقدية (CCC × تكلفة المبيعات اليومية)', -c.workingCapitalNeed], ['= صافي السيولة', q.netLiquidity, 1]]) +
    '<div class="biz-sec">أثر الأصول والعمالة (للعلم)</div>' + v51Row2([['المصروف الرأسمالي على الأصول في الفترة', -a.capex], ['الإهلاك (غير نقدي — يُضاف في التدفق التشغيلي)', a.depreciation], ['صافي القيمة الدفترية للأصول', a.nbv], ['التكلفة الفعلية الشهرية للعمالة (TCC)', lb.monthlyTcc], ['الحرق الشهري الصافي', q.burnMonthly]]) +
    (q.forecast && q.forecast.length ? '<div class="biz-sec">توقع النقدية</div>' + bTable([{ label: 'الأفق', r: function (x) { return x.days + ' يوم'; } }, { label: 'مقبوضات', num: true, r: function (x) { return money(x.inflow); } }, { label: 'مدفوعات (رواتب، موردون، مصروفات، أقساط)', num: true, r: function (x) { return money(x.outflow); } }, { label: 'النقدية المتوقعة', num: true, r: function (x) { return '<b style="' + (x.cash < 0 ? 'color:#ef4444' : '') + '">' + money(x.cash) + '</b>'; } }], q.forecast) : '');
}
async function v51Ccc(el) {
  el.innerHTML = '<div class="biz-filter"><label>فترة القياس ' + v51Sel('ccD', [['30', '30 يوم'], ['90', '90 يوم'], ['180', '180 يوم'], ['365', 'سنة']], '90') + '</label><span class="grow"></span>' + rptButtons('ccRP') + '</div><div id="ccB0"></div>';
  let R = null; const box = el.querySelector('#ccB0');
  const load = async function () {
    v51Spin(box); const d = +el.querySelector('#ccD').value;
    const r = await bz('cashCycle', { from: daysAgo(d - 1), to: isoLocal() }); if (!r.success) return v51Err(box, r); R = r;
    box.innerHTML = kpis([['أيام بقاء المخزون (DIO)', v51Days(r.dio), 'المخزون ' + money(r.inventory)], ['أيام التحصيل (DSO)', v51Days(r.dso), 'الذمم ' + money(r.receivables + r.channelReceivables)], ['أيام السداد للموردين (DPO)', v51Days(r.dpo), 'المستحق ' + money(r.payables)],
      ['دورة التحويل النقدي (CCC)', v51Days(r.ccc), r.ccc <= 0 ? 'ممتاز: الموردون يمولون التشغيل' : 'فجوة تحتاج تمويلاً', r.ccc <= 0 ? '#10b981' : r.ccc > 20 ? '#ef4444' : '#f59e0b'], ['رأس المال العامل المطلوب لتغطية الفجوة', money(r.workingCapitalNeed)]]) +
      v51Hint('الفجوة النقدية = أيام بقاء المخزون + أيام التحصيل − أيام السداد للموردين. كلما قلّت (أو كانت سالبة) كان المطعم يحصّل من العملاء قبل أن يدفع للموردين. ' + (r.formulas ? 'DIO = ' + h(r.formulas.dio) + ' · DSO = ' + h(r.formulas.dso) + ' · DPO = ' + h(r.formulas.dpo) + '. الأرصدة من دفتر الأستاذ العام (متوسط أول وآخر المدة).' : 'DIO = المخزون ÷ تكلفة المبيعات × أيام الفترة · DSO = (ذمم العملاء + مستحقات تطبيقات التوصيل) ÷ المبيعات × الأيام · DPO = مستحقات الموردين ÷ المشتريات × الأيام. الأرصدة لحظية والقيم تقديرية.')) +
      bTable([{ label: 'المؤشر', r: function (x) { return h(x[0]); } }, { label: 'القيمة', num: true, r: function (x) { return x[1]; } }], [['تكلفة المبيعات والهدر في الفترة', money(r.cogs)], ['صافي المبيعات في الفترة', money(r.sales)], ['المشتريات في الفترة', money(r.purchases)],
        ['قيمة المخزون الحالية', money(r.inventory)], [r.gl ? 'متوسط الذمم المدينة (عملاء + منصات)' : 'ذمم العملاء', money(r.receivables)]].concat(r.gl ? [] : [['مستحقات تطبيقات التوصيل (تقديرية)', money(r.channelReceivables)]], [[r.gl ? 'متوسط ذمم الموردين' : 'مستحقات الموردين', money(r.payables)],
        ['معدل دوران المخزون السنوي', nf(r.turnover.inventory, 1) + ' مرة'], ['معدل دوران الذمم السنوي', nf(r.turnover.receivables, 1) + ' مرة'], ['معدل دوران الدائنين السنوي', nf(r.turnover.payables, 1) + ' مرة']]));
  };
  el.querySelector('#ccD').onchange = load; load();
  rptBind(el, 'ccRP', function () { if (!R) throw new Error('لا توجد بيانات'); return { title: 'الفجوة النقدية — دورة التحويل النقدي', period: R.from + ' — ' + R.to, kpis: [['DIO', v51Days(R.dio)], ['DSO', v51Days(R.dso)], ['DPO', v51Days(R.dpo)], ['CCC', v51Days(R.ccc)]],
    sections: [{ title: 'المؤشرات', table: { headers: ['البند', 'القيمة'], rows: [['أيام بقاء المخزون DIO', R.dio], ['أيام التحصيل DSO', R.dso], ['أيام السداد DPO', R.dpo], ['دورة التحويل النقدي CCC', R.ccc], ['رأس المال العامل المطلوب', R.workingCapitalNeed], ['قيمة المخزون', R.inventory], ['ذمم العملاء', R.receivables], ['مستحقات التطبيقات', R.channelReceivables], ['مستحقات الموردين', R.payables]] } }], signature: true }; });
}

// ============================================================
// دوران المخزون وأوامر الشراء
// ============================================================
bizPage('invanalytics', { group: 'stock', title: 'دوران المخزون وأوامر الشراء', icon: 'boxes', feature: 'inv_analytics', perms: ['inventory', 'purchasing', 'reports'], plan: 'premium',
  pitch: 'معدل دوران المخزون ومتوسط أيام بقاء كل مادة ومجموعة، كشف الأصناف الراكدة والبطيئة، وأوامر شراء تلقائية من رصيد المستودع وحد إعادة الطلب تتحول لفاتورة شراء عند الاستلام.',
  render: async function (body) {
    body.innerHTML = subTabs('ivSub', [['turn', 'دوران المخزون', 'sync'], ['po', 'أوامر الشراء', 'file-signature', !canP('purchasing', 'inventory')]], 'turn') + '<div id="ivBody"></div>';
    const el = body.querySelector('#ivBody');
    const go = function (k) { if (k === 'po') v51Po(el); else v51InvTurn(el); };
    bindSubTabs(body, 'ivSub', go); go('turn');
  } });
const V51_CLS = { fast: ['سريع الحركة', 'badge-success'], normal: ['عادي', 'badge-info'], slow: ['بطيء', 'badge-warning'], dead: ['راكد', 'badge-danger'], idle: ['بدون حركة', ''] };
async function v51InvTurn(el) {
  el.innerHTML = dateRangeBar('itR', daysAgo(29), isoLocal(), (hasF('multi_branch') ? '<label>الفرع ' + v51Sel('itB', v51BrOpts()) + '</label>' : '') + '<label>التصنيف ' + v51Sel('itC', [['', 'الكل'], ['fast', 'سريع'], ['normal', 'عادي'], ['slow', 'بطيء'], ['dead', 'راكد']]) + '</label>') +
    '<div class="biz-toolbar"><input type="search" id="itQ" placeholder="بحث عن مادة" style="max-width:220px"><span class="grow"></span>' + rptButtons('itRP') + '</div><div id="itB0"></div>';
  let R = null; const box = el.querySelector('#itB0');
  const filt = function () { const q = (el.querySelector('#itQ').value || '').trim().toLowerCase(), c = el.querySelector('#itC').value; return R.rows.filter(function (x) { return (!c || x.cls === c) && (!q || x.name.toLowerCase().indexOf(q) >= 0); }); };
  const draw = function () {
    const T = R.totals;
    box.innerHTML = kpis([['معدل دوران المخزون', nf(T.turnover, 2) + ' مرة', 'خلال ' + R.days + ' يوم'], ['متوسط أيام بقاء المخزون', v51Days(T.days), '', '#f59e0b'], ['تكلفة المستهلك', money(T.usedValue)], ['متوسط قيمة المخزون', money(T.avgValue)],
      ['أصناف راكدة', nf(T.dead, 0), 'قيمتها ' + money(T.deadValue), '#ef4444'], ['وصلت حد إعادة الطلب', nf(T.reorder, 0), 'أنشئ أمر شراء', '#3b82f6']]) +
      v51Hint('معدل الدوران = تكلفة المستهلك في الفترة (مبيعات + إنتاج) ÷ متوسط قيمة المخزون (أول + آخر الفترة ÷ 2). متوسط أيام البقاء = أيام الفترة ÷ معدل الدوران. أيام التغطية = الرصيد الحالي ÷ متوسط الاستهلاك اليومي.') +
      '<div class="biz-sec">حسب المجموعة</div>' + bTable([{ label: 'المجموعة', r: function (x) { return '<b>' + h(x.category) + '</b>'; } }, { label: 'الأصناف', num: true, r: function (x) { return nf(x.items, 0); } }, { label: 'تكلفة المستهلك', num: true, r: function (x) { return money(x.usedValue); } },
        { label: 'متوسط المخزون', num: true, r: function (x) { return money(x.avgValue); } }, { label: 'معدل الدوران', num: true, r: function (x) { return nf(x.turnover, 2); } }, { label: 'متوسط أيام البقاء', num: true, r: function (x) { return v51Days(x.days); } }, { label: 'القيمة الحالية', num: true, r: function (x) { return money(x.value); } }], R.categories) +
      '<div class="biz-sec">حسب المادة</div>' + bTable([{ label: 'المادة', r: function (x) { return '<b>' + h(x.name) + '</b><div class="muted" style="font-size:.72rem">' + h(x.category) + '</div>'; } }, { label: 'الرصيد', num: true, r: function (x) { return nf(x.qty, 2) + ' ' + h(x.unit || ''); } },
        { label: 'المستهلك', num: true, r: function (x) { return nf(x.used, 2); } }, { label: 'تكلفة المستهلك', num: true, r: function (x) { return money(x.usedValue); } }, { label: 'معدل الدوران', num: true, r: function (x) { return x.turnover >= 99 ? '—' : nf(x.turnover, 2); } },
        { label: 'أيام البقاء', num: true, r: function (x) { return v51Days(x.days); } }, { label: 'أيام التغطية', num: true, r: function (x) { return v51Days(x.cover); } }, { label: 'القيمة', num: true, r: function (x) { return money(x.value); } },
        { label: 'التصنيف', r: function (x) { const c = V51_CLS[x.cls]; return '<span class="badge ' + c[1] + '">' + c[0] + '</span>' + (x.minQty > 0 && x.qty <= x.minQty ? ' <span class="badge badge-danger">إعادة طلب</span>' : ''); } }], filt(), { empty: 'لا توجد أرصدة مخزون' });
  };
  const load = async function (rg) { v51Spin(box); const bs = el.querySelector('#itB'); const r = await bz('invTurnover', { from: rg.from, to: rg.to, branchId: bs ? (bs.value || 'all') : '' }); if (!r.success) return v51Err(box, r); R = r; draw(); };
  el.querySelector('#itQ').oninput = function () { if (R) draw(); }; el.querySelector('#itC').onchange = function () { if (R) draw(); };
  const get = bindRange(el, 'itR', load); load(get());
  rptBind(el, 'itRP', function () {
    if (!R) throw new Error('لا توجد بيانات');
    return { title: 'تقرير دوران المخزون', period: R.from + ' — ' + R.to, kpis: [['معدل الدوران', nf(R.totals.turnover, 2)], ['أيام البقاء', v51Days(R.totals.days)], ['تكلفة المستهلك', money(R.totals.usedValue)], ['الراكد', money(R.totals.deadValue)]],
      sections: [{ title: 'حسب المجموعة', table: { headers: ['المجموعة', 'الأصناف', 'تكلفة المستهلك', 'متوسط المخزون', 'معدل الدوران', 'أيام البقاء'], money: [2, 3], rows: R.categories.map(function (x) { return [x.category, x.items, x.usedValue, x.avgValue, x.turnover, x.days === null ? '—' : x.days]; }) } },
        { title: 'حسب المادة', table: { headers: ['المادة', 'المجموعة', 'الرصيد', 'المستهلك', 'تكلفة المستهلك', 'معدل الدوران', 'أيام البقاء', 'أيام التغطية', 'القيمة', 'التصنيف'], money: [4, 8], rows: filt().map(function (x) { return [x.name, x.category, x.qty, x.used, x.usedValue, x.turnover >= 99 ? '—' : x.turnover, x.days === null ? '—' : x.days, x.cover === null ? '—' : x.cover, x.value, V51_CLS[x.cls][0]]; }) } }], signature: true };
  });
}
const V51_PO_ST = { draft: ['مسودة', ''], sent: ['أُرسل للمورد', 'badge-info'], approved: ['معتمد', 'badge-info'], received: ['مستلم ومرحّل', 'badge-success'], cancelled: ['ملغي', 'badge-danger'] };
async function v51Po(el) {
  el.innerHTML = '<div class="biz-toolbar"><span class="grow"></span>' + (canP('purchasing') ? '<button class="btn btn-primary btn-sm" id="poSug"><i class="fas fa-magic"></i> اقتراح من حد إعادة الطلب</button><button class="btn btn-outline btn-sm" id="poNew"><i class="fas fa-plus"></i> أمر شراء جديد</button>' : '') + rptButtons('poRP') + '</div><div id="poB0"></div>';
  const box = el.querySelector('#poB0'); v51Spin(box);
  const r = await bz('v51List', { kind: 'po' }); if (!r.success) return v51Err(box, r);
  const rows = r.rows;
  const open = rows.filter(function (x) { return ['draft', 'sent', 'approved'].indexOf(x.data.status) >= 0; });
  box.innerHTML = kpis([['أوامر مفتوحة', nf(open.length, 0)], ['قيمة الأوامر المفتوحة', money(open.reduce(function (s, x) { return s + (+x.data.total || 0); }, 0))], ['مستلمة', nf(rows.filter(function (x) { return x.data.status === 'received'; }).length, 0), '', '#10b981']]) +
    v51Hint('اضبط «الحد الأدنى / حد إعادة الطلب» لكل مادة من «المخزون والجرد». زر «اقتراح من حد إعادة الطلب» يجمع كل الأصناف التي وصل رصيدها للحد ويقترح كمية (ضعف الحد − الرصيد) بآخر سعر شراء ومورد. عند الاستلام يتحول الأمر لفاتورة شراء تضيف الكميات للمخزون.') +
    bTable([{ label: 'رقم', r: function (x) { return '<b>#' + h(x.data.number || '') + '</b>'; } }, { label: 'التاريخ', r: function (x) { return h(x.period || ''); } }, { label: 'المورد', r: function (x) { return h(x.data.supplierName || '—'); } },
      { label: 'الأصناف', num: true, r: function (x) { return nf((x.data.items || []).length, 0); } }, { label: 'القيمة', num: true, r: function (x) { return money(x.data.total); } }, { label: 'موعد التوريد', r: function (x) { return h(x.data.expected || '—'); } },
      { label: 'الحالة', r: function (x) { const s = V51_PO_ST[x.data.status] || [x.data.status, '']; return '<span class="badge ' + s[1] + '">' + s[0] + '</span>' + (x.data.purchaseNo ? '<div class="muted" style="font-size:.7rem">فاتورة شراء #' + h(x.data.purchaseNo) + '</div>' : ''); } },
      { label: '', r: function (x) { const st = x.data.status, op = ['draft', 'sent', 'approved'].indexOf(st) >= 0; return '<div class="ops-row-acts"><button class="ico-btn" data-pp="' + x.id + '" title="طباعة"><i class="fas fa-print"></i></button>' +
        (op && canP('purchasing') ? '<button class="ico-btn" data-pe="' + x.id + '" title="تعديل"><i class="fas fa-pen"></i></button>' : '') + (st === 'draft' && canP('purchasing') ? '<button class="ico-btn" data-ps="' + x.id + '" title="إرسال للمورد"><i class="fas fa-paper-plane"></i></button>' : '') +
        (op ? '<button class="btn btn-primary btn-sm" data-pr="' + x.id + '"><i class="fas fa-truck-loading"></i> استلام</button>' : '') + (op && canP('purchasing') ? '<button class="ico-btn danger" data-pc="' + x.id + '" title="إلغاء"><i class="fas fa-ban"></i></button>' : '') +
        (st !== 'received' && canP('purchasing') ? '<button class="ico-btn danger" data-pd="' + x.id + '" title="حذف"><i class="fas fa-trash"></i></button>' : '') + '</div>'; } }], rows, { empty: 'لا توجد أوامر شراء بعد' });
  const reload = function () { v51Po(el); };
  const sg = el.querySelector('#poSug'); if (sg) sg.onclick = async function () { const s = await bzOk('poSuggest', {}); if (!s.items.length) { showToast('لا توجد أصناف وصلت لحد إعادة الطلب — اضبط الحد الأدنى من المخزون والجرد'); return; }
    const bySup = {}; s.items.forEach(function (it) { const k = it.supplierId || ''; (bySup[k] = bySup[k] || { id: it.supplierId, name: it.supplierName, items: [] }).items.push(it); });
    const groups = Object.values(bySup);
    if (groups.length > 1 && await bConfirm('الأصناف المقترحة من ' + groups.length + ' موردين — إنشاء أمر شراء منفصل لكل مورد؟')) { for (const g of groups) await bzOk('v51Save', { kind: 'po', data: { data: { supplierId: g.id, supplierName: g.name, items: g.items } } }); showToast('تم إنشاء ' + groups.length + ' أوامر شراء'); reload(); return; }
    v51PoEdit(null, { supplierId: groups[0].id, supplierName: groups[0].name, items: s.items }, reload); };
  const nb = el.querySelector('#poNew'); if (nb) nb.onclick = function () { v51PoEdit(null, { items: [] }, reload); };
  box.onclick = async function (e) {
    const f = function (a) { const b = e.target.closest('[' + a + ']'); return b ? rows.find(function (x) { return x.id === b.getAttribute(a); }) : null; };
    let x;
    if ((x = f('data-pe'))) v51PoEdit(x, x.data, reload);
    else if ((x = f('data-pp'))) v51PoPrint(x);
    else if ((x = f('data-ps'))) { await bzOk('poStatus', { id: x.id, status: 'sent' }); showToast('تم تعليم الأمر كمرسل للمورد'); reload(); }
    else if ((x = f('data-pc')) && await bConfirm('إلغاء أمر الشراء #' + x.data.number + '؟')) { await bzOk('poStatus', { id: x.id, status: 'cancelled' }); reload(); }
    else if ((x = f('data-pd')) && await bConfirm('حذف أمر الشراء #' + x.data.number + '؟')) { await bzOk('v51Delete', { id: x.id }); reload(); }
    else if ((x = f('data-pr'))) v51PoReceive(x, reload);
  };
  rptBind(el, 'poRP', function () { return { title: 'أوامر الشراء', sections: [{ table: { headers: ['رقم', 'التاريخ', 'المورد', 'الأصناف', 'القيمة', 'الحالة'], money: [4], foot: 'sum', rows: rows.map(function (x) { return ['#' + x.data.number, x.period || '', x.data.supplierName || '', (x.data.items || []).length, x.data.total, (V51_PO_ST[x.data.status] || [x.data.status])[0]]; }) } }] }; });
}
async function v51PoEdit(po, d, done) {
  const sups = hasF('purchasing') ? await entList('suppliers').catch(function () { return []; }) : [];
  const st = await bz('stockList', {}); const all = (st.items || []);
  let items = (d.items || []).map(function (x) { return Object.assign({}, x); });
  const m = bModal({ title: po ? 'تعديل أمر الشراء #' + po.data.number : 'أمر شراء جديد', icon: 'file-signature', xwide: true,
    body: '<div class="biz-form"><div><label class="pro-label">المورد</label><div class="pro-input-wrap"><select id="poS"><option value="">— بدون مورد محدد —</option>' + sups.map(function (s) { return '<option value="' + h(s.id) + '"' + (s.id === d.supplierId ? ' selected' : '') + '>' + h(s.name) + '</option>'; }).join('') + '</select></div></div>' +
      '<div><label class="pro-label">موعد التوريد المتوقع</label><div class="pro-input-wrap"><input type="date" id="poE" value="' + h(d.expected || '') + '"></div></div><div class="full"><label class="pro-label">ملاحظات</label><div class="pro-input-wrap"><input id="poN" value="' + h(d.notes || '') + '"></div></div></div>' +
      '<div class="biz-toolbar"><select id="poAdd" style="max-width:340px"><option value="">+ إضافة صنف…</option>' + all.map(function (it, i) { return '<option value="' + i + '">' + h(it.name) + ' (' + h(it.category || '') + ') — رصيد ' + nf(it.qty, 2) + '</option>'; }).join('') + '</select></div><div id="poL"></div>',
    foot: '<button class="btn btn-cancel" data-x>إلغاء</button><button class="btn btn-primary" data-act="save"><i class="fas fa-check"></i> حفظ أمر الشراء</button>',
    actions: { save: async function (mm) {
      const sid = mm.$('#poS').value, sn = sid ? (sups.find(function (s) { return s.id === sid; }) || {}).name : '';
      if (!items.length) { showToast('أضف أصنافاً', true); return; }
      await bzOk('v51Save', { kind: 'po', data: { id: po ? po.id : '', data: { supplierId: sid, supplierName: sn || '', expected: mm.$('#poE').value, notes: mm.$('#poN').value, items: items } } });
      showToast('تم حفظ أمر الشراء'); mm.close(); if (done) done();
    } } });
  const draw = function () {
    const tot = items.reduce(function (s, x) { return s + (+x.qty || 0) * (+x.unitCost || 0); }, 0);
    m.$('#poL').innerHTML = bTable([{ label: 'الصنف', r: function (x) { return '<b>' + h(x.name) + '</b>' + (x.minQty ? '<div class="muted" style="font-size:.7rem">الرصيد ' + nf(x.onHand, 2) + ' · الحد ' + nf(x.minQty, 2) + '</div>' : ''); } },
      { label: 'الكمية', num: true, r: function (x, i) { return '<input type="number" step="any" data-pi="' + i + '" data-pf="qty" value="' + (+x.qty || 0) + '" style="width:90px"> ' + h(x.unit || ''); } },
      { label: 'سعر الوحدة', num: true, r: function (x, i) { return '<input type="number" step="any" data-pi="' + i + '" data-pf="unitCost" value="' + (+x.unitCost || 0) + '" style="width:90px">'; } },
      { label: 'الإجمالي', num: true, r: function (x) { return money((+x.qty || 0) * (+x.unitCost || 0)); } }, { label: '', r: function (x, i) { return '<button class="ico-btn danger" data-rm="' + i + '"><i class="fas fa-times"></i></button>'; } }], items,
      { empty: 'لا توجد أصناف', foot: '<tr><td colspan="3"><b>الإجمالي</b></td><td class="num"><b>' + money(tot) + '</b></td><td></td></tr>' });
  };
  m.$('#poAdd').onchange = function (e) { const it = all[+e.target.value]; e.target.value = ''; if (!it) return; if (items.some(function (x) { return x.itemType === it.itemType && x.itemId === it.itemId; })) return;
    items.push({ itemType: it.itemType, itemId: it.itemId, name: it.name, unit: it.unit, qty: Math.max(1, (it.minQty || 0) * 2 - Math.max(0, it.qty || 0)), unitCost: it.cost || 0, onHand: it.qty, minQty: it.minQty }); draw(); };
  m.$('#poL').oninput = function (e) { const i = e.target.dataset.pi; if (i === undefined) return; items[+i][e.target.dataset.pf] = parseFloat(e.target.value) || 0; };
  m.$('#poL').onchange = function () { draw(); };
  m.$('#poL').onclick = function (e) { const b = e.target.closest('[data-rm]'); if (b) { items.splice(+b.dataset.rm, 1); draw(); } };
  draw();
}
function v51PoReceive(po, done) {
  const items = (po.data.items || []).map(function (x) { return Object.assign({}, x); });
  const tot = function () { return items.reduce(function (s, x) { return s + (+x.qty || 0) * (+x.unitCost || 0); }, 0); };
  const m = bModal({ title: 'استلام أمر الشراء #' + po.data.number, icon: 'truck-loading', wide: true,
    body: v51Hint('عدّل الكميات المستلمة فعلياً وسعر الوحدة إن اختلف. سيتم إنشاء فاتورة شراء مرحّلة للمخزون ومرتبطة بالمورد.') + '<div id="prL"></div>' +
      '<div class="biz-form"><div><label class="pro-label">الضريبة</label><div class="pro-input-wrap"><input type="number" step="any" id="prT" value="0"></div></div><div><label class="pro-label">المدفوع الآن (الباقي آجل على المورد)</label><div class="pro-input-wrap"><input type="number" step="any" id="prP" value="0"></div></div><div class="full"><label class="pro-label">ملاحظة</label><div class="pro-input-wrap"><input id="prN"></div></div></div>',
    foot: '<button class="btn btn-cancel" data-x>إلغاء</button><button class="btn btn-primary" data-act="ok"><i class="fas fa-check"></i> تأكيد الاستلام والترحيل</button>',
    actions: { ok: async function (mm) { await bzOk('poStatus', { id: po.id, status: 'received', items: items, tax: mm.$('#prT').value, paid: mm.$('#prP').value, note: mm.$('#prN').value }); showToast('تم الاستلام وإنشاء فاتورة الشراء'); mm.close(); if (done) done(); } } });
  const draw = function () { m.$('#prL').innerHTML = bTable([{ label: 'الصنف', r: function (x) { return h(x.name); } }, { label: 'المطلوب', num: true, r: function (x, i) { return nf(po.data.items[i].qty, 2); } },
    { label: 'المستلم', num: true, r: function (x, i) { return '<input type="number" step="any" data-ri="' + i + '" data-rf="qty" value="' + x.qty + '" style="width:90px">'; } }, { label: 'سعر الوحدة', num: true, r: function (x, i) { return '<input type="number" step="any" data-ri="' + i + '" data-rf="unitCost" value="' + x.unitCost + '" style="width:90px">'; } }], items,
    { foot: '<tr><td colspan="3"><b>الإجمالي قبل الضريبة</b></td><td class="num"><b>' + money(tot()) + '</b></td></tr>' }); };
  m.$('#prL').onchange = function (e) { const i = e.target.dataset.ri; if (i === undefined) return; items[+i][e.target.dataset.rf] = parseFloat(e.target.value) || 0; draw(); };
  draw();
}
function v51PoPrint(po) {
  const d = po.data;
  rptPrint({ title: 'أمر شراء رقم ' + d.number, subtitle: (d.supplierName ? 'المورد: ' + d.supplierName + ' · ' : '') + 'التاريخ: ' + (po.period || '') + (d.expected ? ' · موعد التوريد: ' + d.expected : ''),
    sections: [{ table: { headers: ['الصنف', 'الوحدة', 'الكمية', 'سعر الوحدة', 'الإجمالي'], money: [3, 4], foot: 'sum', rows: (d.items || []).map(function (x) { return [x.name, x.unit || '', x.qty, x.unitCost, Math.round(x.qty * x.unitCost * 100) / 100]; }) } }].concat(d.notes ? [{ title: 'ملاحظات', html: '<p>' + h(d.notes) + '</p>' }] : []), signature: true });
}

// ============================================================
// قنوات وتطبيقات التوصيل
// ============================================================
bizPage('channels', { group: 'ops', title: 'قنوات التوصيل', icon: 'store-alt', feature: 'channels', perms: ['settings', 'finance', 'reports'], plan: 'pro',
  pitch: 'أضف تطبيقات التوصيل (هنقرستيشن، جاهز، طلبات، Getir، Yemeksepeti…) مع عمولة كل عقد، واختر القناة عند تسجيل الطلب لتتبع المبيعات والعمولات وصافي ربح كل قناة.',
  render: async function (body) {
    body.innerHTML = subTabs('chSub', [['list', 'القنوات والعقود', 'handshake'], ['report', 'مبيعات وعمولات القنوات', 'chart-bar', !canP('reports', 'finance')]], 'list') + '<div id="chBody"></div>';
    const el = body.querySelector('#chBody');
    const go = function (k) { if (k === 'report') v51ChReport(el); else v51ChList(el); };
    bindSubTabs(body, 'chSub', go); go('list');
  } });
async function v51ChList(el) {
  const w = canP('settings', 'finance');
  el.innerHTML = '<div class="biz-toolbar"><span class="grow"></span>' + (w ? '<button class="btn btn-primary btn-sm" id="chNew"><i class="fas fa-plus"></i> قناة توصيل جديدة</button>' : '') + '</div><div id="chB0"></div>';
  const box = el.querySelector('#chB0'); v51Spin(box);
  const r = await bz('v51List', { kind: 'channel' }); if (!r.success) return v51Err(box, r);
  const rows = r.rows;
  box.innerHTML = v51Hint('كل قناة لها عقد مستقل: نسبة العمولة من قيمة الطلب، ورسم ثابت لكل طلب، واشتراك شهري إن وجد، ومدة تحويل المستحقات. في الكاشير يظهر زر «القناة» لاختيار التطبيق الذي جاء منه الطلب، وتُحسب العمولة تلقائياً وتظهر في قائمة الدخل وتقرير القنوات.') +
    bTable([{ label: 'القناة', r: function (x) { return '<b>' + h(x.title) + '</b>' + (x.data.contact ? '<div class="muted" style="font-size:.72rem">' + h(x.data.contact) + '</div>' : ''); } }, { label: 'العمولة %', num: true, r: function (x) { return v5Pct(x.data.pct || 0); } },
      { label: 'رسم لكل طلب', num: true, r: function (x) { return money(x.data.fixed || 0); } }, { label: 'اشتراك شهري', num: true, r: function (x) { return money(x.data.monthlyFee || 0); } }, { label: 'تحويل المستحقات', num: true, r: function (x) { return x.data.payDays ? x.data.payDays + ' يوم' : '—'; } },
      { label: 'العقد', r: function (x) { return h((x.data.contractStart || '—') + ' → ' + (x.data.contractEnd || '—')) + (x.data.contractEnd && x.data.contractEnd < isoLocal() ? ' <span class="badge badge-danger">منتهي</span>' : ''); } },
      { label: 'الحالة', r: function (x) { return x.data.active !== false ? '<span class="badge badge-success">مفعّلة</span>' : '<span class="badge">موقوفة</span>'; } },
      { label: '', r: function (x) { return w ? '<button class="ico-btn" data-ke="' + x.id + '"><i class="fas fa-pen"></i></button><button class="ico-btn danger" data-kd="' + x.id + '"><i class="fas fa-trash"></i></button>' : ''; } }], rows, { empty: 'لا توجد قنوات — أضف تطبيقات التوصيل التي تتعامل معها' });
  const edit = function (x) {
    const F = [{ k: 'title', label: 'اسم التطبيق / القناة', req: true, ph: 'مثال: هنقرستيشن' }, { k: 'pct', label: 'نسبة العمولة حسب العقد %', type: 'number' }, { k: 'fixed', label: 'رسم ثابت لكل طلب', type: 'number' },
      { k: 'monthlyFee', label: 'اشتراك / رسم شهري', type: 'number' }, { k: 'payDays', label: 'مدة تحويل المستحقات (أيام)', type: 'number' }, { k: 'contractStart', label: 'بداية العقد', type: 'date' }, { k: 'contractEnd', label: 'نهاية العقد', type: 'date' },
      { k: 'contact', label: 'مسؤول الحساب / التواصل' }, { k: 'active', label: 'مفعّلة', type: 'checkbox', def: true }, { k: 'notes', label: 'شروط العقد وملاحظات', type: 'textarea', full: true }];
    // v5.3.0: تعديل النسبة أو الرسوم يسري من تاريخ محدد فقط — الطلبات والقيود السابقة تبقى بنسبتها وقت تنفيذها
    if (x) {
      F.splice(3, 0, { k: 'termsFrom', label: 'تاريخ سريان الشروط الجديدة (عند تغيير النسبة أو الرسوم)', type: 'date' });
      const hs = (x.data.hist || []).slice().reverse();
      F.push({ type: 'html', html: v51Hint('كل طلب يحتفظ بنسبة العمولة والرسم الثابت السارية لحظة تسجيله، ولا يغيّر تعديل العقد أي طلب أو قيد سابق. الاشتراك الشهري يُحتسب لكل شهر حسب الشروط السارية فيه.') +
        (hs.length ? '<div class="biz-sec">سجل شروط العقد</div>' + bTable([{ label: 'ساري من', r: function (t) { return t.from === '0000-01-01' ? 'بداية التعامل' : h(t.from); } }, { label: 'العمولة %', num: true, r: function (t) { return v5Pct(t.pct || 0); } }, { label: 'رسم الطلب', num: true, r: function (t) { return money(t.fixed || 0); } }, { label: 'الاشتراك الشهري', num: true, r: function (t) { return money(t.monthlyFee || 0); } }], hs) : '') });
    }
    bPrompt(x ? 'تعديل قناة' : 'قناة توصيل جديدة', F, x ? Object.assign({ title: x.title }, x.data, { termsFrom: isoLocal() }) : { active: true }, async function (d) { await bzOk('v51Save', { kind: 'channel', data: { id: x ? x.id : '', title: d.title, data: d } }); showToast('تم حفظ القناة'); v51ChList(el); }, { wide: true, icon: 'store-alt' });
  };
  const nb = el.querySelector('#chNew'); if (nb) nb.onclick = function () { edit(null); };
  box.onclick = async function (e) { const a = e.target.closest('[data-ke]'), d = e.target.closest('[data-kd]');
    if (a) edit(rows.find(function (x) { return x.id === a.dataset.ke; }));
    if (d && await bConfirm('حذف القناة؟')) { await bzOk('v51Delete', { id: d.dataset.kd }); v51ChList(el); } };
}
async function v51ChReport(el) {
  el.innerHTML = dateRangeBar('crR', daysAgo(29), isoLocal()) + '<div class="biz-toolbar"><span class="grow"></span>' + rptButtons('crRP') + '</div><div id="crB0"></div>';
  let R = null; const box = el.querySelector('#crB0');
  const load = async function (rg) {
    v51Spin(box); const r = await bz('channelReport', { from: rg.from, to: rg.to, branchId: hasF('multi_branch') ? (B.branch || 'all') : '' }); if (!r.success) return v51Err(box, r); R = r; const T = r.totals;
    box.innerHTML = kpis([['إجمالي الطلبات', nf(T.orders, 0)], ['إجمالي المبيعات', money(T.sales)], ['عمولات القنوات', money(T.commission), T.sales ? v5Pct(T.commission / T.sales * 100) + ' من المبيعات' : '', '#ef4444'], ['اشتراكات القنوات', money(T.fees)]]) +
      bTable([{ label: 'القناة', r: function (x) { return '<b>' + h(x.name) + '</b>' + (x.pct || x.fixed ? '<div class="muted" style="font-size:.7rem">' + v5Pct(x.pct) + (x.fixed ? ' + ' + money(x.fixed) : '') + '</div>' : ''); } }, { label: 'الطلبات', num: true, r: function (x) { return nf(x.orders, 0); } },
        { label: 'المبيعات', num: true, r: function (x) { return money(x.sales); } }, { label: 'الحصة', num: true, r: function (x) { return v5Pct(T.sales ? x.sales / T.sales * 100 : 0); } }, { label: 'متوسط الطلب', num: true, r: function (x) { return money(x.avg); } },
        { label: 'العمولة', num: true, r: function (x) { return money(x.commission); } }, { label: 'الاشتراك', num: true, r: function (x) { return money(x.monthlyFee); } }, { label: 'نسبة التكلفة الفعلية', num: true, r: function (x) { return v5Pct(x.effPct); } },
        { label: 'صافي الربح بعد التكلفة والعمولة', num: true, r: function (x) { return '<b style="color:' + (x.netProfit < 0 ? '#ef4444' : '#10b981') + '">' + money(x.netProfit) + '</b>'; } }], r.rows, { empty: 'لا توجد مبيعات في الفترة' });
  };
  const get = bindRange(el, 'crR', load); load(get());
  rptBind(el, 'crRP', function () { if (!R) throw new Error('لا توجد بيانات'); return { title: 'تقرير مبيعات وعمولات قنوات التوصيل', period: R.from + ' — ' + R.to, kpis: [['الطلبات', nf(R.totals.orders, 0)], ['المبيعات', money(R.totals.sales)], ['العمولات', money(R.totals.commission)]],
    sections: [{ table: { headers: ['القناة', 'الطلبات', 'المبيعات', 'متوسط الطلب', 'العمولة', 'الاشتراك', 'نسبة التكلفة %', 'صافي الربح'], money: [2, 3, 4, 5, 7], foot: 'sum', rows: R.rows.map(function (x) { return [x.name, x.orders, x.sales, x.avg, x.commission, x.monthlyFee, x.effPct, x.netProfit]; }) } }], signature: true }; });
}

// ============================================================
// تحليلات العملاء — CAC و CLV
// ============================================================
bizPage('custintel', { group: 'crm', title: 'تحليلات العملاء (CAC و CLV)', icon: 'user-tag', feature: 'cust_analytics', perms: ['customers', 'marketing', 'reports'], plan: 'pro',
  pitch: 'اربط مصاريف التسويق بعدد العملاء الجدد لحساب تكلفة الاستحواذ على العميل (CAC)، وقِس متوسط الفاتورة وتكرار الزيارات وهامش الربح لحساب القيمة الدائمة للعميل (CLV) ونسبة CLV:CAC.',
  render: async function (body) { v51Cust(body); } });
async function v51Cust(el) {
  const kc = 'fcCacCats_' + ((B.acc && B.acc.email) || '');
  let cats = []; try { cats = JSON.parse(localStorage.getItem(kc) || '[]'); } catch (e) { cats = []; }
  el.innerHTML = dateRangeBar('caR', daysAgo(89), isoLocal(), '<label>عمر العميل (سنوات) <input type="number" step="any" data-f="lifespan" placeholder="تلقائي" style="width:80px"></label>') +
    '<div class="biz-toolbar"><button class="btn btn-outline btn-sm" id="caCats"><i class="fas fa-tags"></i> بنود مصاريف التسويق</button><span class="muted" id="caCatsL" style="font-size:.8rem"></span><span class="grow"></span>' + rptButtons('caRP') + '</div><div id="caB0"></div>';
  let R = null, rg0 = null; const box = el.querySelector('#caB0');
  const lbl = function () { el.querySelector('#caCatsL').textContent = cats.length ? cats.join('، ') : 'تلقائي: البنود التي تحتوي تسويق / إعلان / دعاية'; };
  const load = async function (rg) {
    rg0 = rg; lbl(); v51Spin(box);
    const r = await bz('custAnalytics', { from: rg.from, to: rg.to, lifespan: rg.lifespan, categories: cats }); if (!r.success) return v51Err(box, r); R = r;
    const ratioCol = r.ratio === null ? '' : r.ratio >= 3 ? '#10b981' : r.ratio >= 1 ? '#f59e0b' : '#ef4444';
    box.innerHTML = kpis([['تكلفة الاستحواذ على العميل (CAC)', r.newCustomers ? money(r.cac) : '—', 'تسويق ' + money(r.marketingSpend) + ' ÷ ' + r.newCustomers + ' عميل جديد'], ['القيمة الدائمة للعميل (CLV)', money(r.clv), 'إيراد متوقع ' + money(r.clvRevenue), '#10b981'],
      ['نسبة CLV : CAC', r.ratio === null ? '—' : nf(r.ratio, 1) + ' : 1', 'الصحي 3:1 أو أكثر', ratioCol], ['استرداد تكلفة الاستحواذ', r.payback === null ? '—' : nf(r.payback, 1) + ' زيارة'],
      ['متوسط الفاتورة', money(r.aov)], ['الزيارات السنوية للعميل', nf(r.frequency, 1)], ['هامش الربح الإجمالي', v5Pct(r.grossMarginPct)], ['عمر العميل المقدّر', nf(r.lifespanYears, 1) + ' سنة'],
      ['العملاء الجدد في الفترة', nf(r.newCustomers, 0)], ['إجمالي العملاء', nf(r.customers, 0), 'متوسط الإنفاق التاريخي ' + money(r.avgSpend)], ['معدل العملاء المتكررين', v5Pct(r.repeatRate)]]) +
      v51Hint('CAC = مصاريف التسويق في الفترة ÷ عدد العملاء الجدد المسجلين في نفس الفترة. CLV = متوسط الفاتورة × عدد الزيارات السنوية × هامش الربح الإجمالي × عمر العميل بالسنوات (يُقدَّر تلقائياً من سجل الزيارات أو تحدده يدوياً). التحليل يعتمد على الطلبات المرتبطة بعميل (رقم الجوال أو تطبيق العميل).') +
      '<div class="biz-grid-2"><div><div class="biz-sec">أعلى العملاء قيمة</div>' + bTable([{ label: 'العميل', r: function (x) { return '<b>' + h(x.name) + '</b><div class="muted" style="font-size:.72rem" dir="ltr">' + h(x.phone || '') + '</div>'; } }, { label: 'الإنفاق', num: true, r: function (x) { return money(x.spent); } },
        { label: 'الزيارات', num: true, r: function (x) { return nf(x.visits, 0); } }, { label: 'متوسط الفاتورة', num: true, r: function (x) { return money(x.avg); } }], r.top) + '</div>' +
      '<div><div class="biz-sec">العملاء الجدد شهرياً</div>' + bTable([{ label: 'الشهر', r: function (x) { return h(x.month); } }, { label: 'عملاء جدد', num: true, r: function (x) { return nf(x.n, 0); } }], r.newByMonth) + '</div></div>';
  };
  el.querySelector('#caCats').onclick = function () {
    const ex = (R && R.expenseCategories) || [];
    if (!ex.length) { showToast('لا توجد بنود مصروفات بعد', true); return; }
    const m = bModal({ title: 'بنود مصاريف التسويق', icon: 'tags', body: '<p class="muted">اختر بنود المصروفات التي تمثل التسويق والإعلانات. بدون اختيار يُستخدم الكشف التلقائي.</p><div class="biz-form">' + ex.map(function (x) { return '<label class="biz-check"><input type="checkbox" data-c="' + h(x.name) + '"' + (cats.indexOf(x.name) >= 0 ? ' checked' : '') + '> <span>' + h(x.name) + ' <small class="muted">' + money(x.total) + '</small></span></label>'; }).join('') + '</div>',
      foot: '<button class="btn btn-cancel" data-x>إلغاء</button><button class="btn btn-primary" data-act="ok">تطبيق</button>',
      actions: { ok: function (mm) { cats = mm.$$('[data-c]').filter(function (x) { return x.checked; }).map(function (x) { return x.dataset.c; }); localStorage.setItem(kc, JSON.stringify(cats)); mm.close(); load(rg0); } } });
  };
  const get = bindRange(el, 'caR', load); load(get());
  rptBind(el, 'caRP', function () { if (!R) throw new Error('لا توجد بيانات'); return { title: 'تحليلات العملاء — CAC و CLV', period: R.from + ' — ' + R.to, kpis: [['CAC', money(R.cac)], ['CLV', money(R.clv)], ['CLV:CAC', R.ratio === null ? '—' : nf(R.ratio, 1)], ['عملاء جدد', nf(R.newCustomers, 0)]],
    sections: [{ title: 'المؤشرات', table: { headers: ['المؤشر', 'القيمة'], rows: [['مصاريف التسويق', money(R.marketingSpend)], ['العملاء الجدد', R.newCustomers], ['CAC', money(R.cac)], ['متوسط الفاتورة', money(R.aov)], ['الزيارات السنوية', R.frequency], ['هامش الربح %', R.grossMarginPct], ['عمر العميل (سنة)', R.lifespanYears], ['CLV', money(R.clv)], ['معدل التكرار %', R.repeatRate]] } },
      { title: 'أعلى العملاء قيمة', table: { headers: ['العميل', 'الجوال', 'الإنفاق', 'الزيارات', 'متوسط الفاتورة'], money: [2, 4], rows: R.top.map(function (x) { return [x.name, x.phone || '', x.spent, x.visits, x.avg]; }) } }], signature: true }; });
}

// ============================================================
// نقطة التعادل: استيراد تكلفة العمالة الفعلية + المصروفات الثابتة غير الرواتب + الإهلاك
// ============================================================
async function v51BreakevenImport() {
  if (!B.acc) { try { await loadAccount(); } catch (e) { /* */ } }
  if (!B.acc || !hasF('hr') || !canP('hr', 'finance')) { if (typeof bizUpgradeModal === 'function' && B.acc && !hasF('hr')) bizUpgradeModal('pro'); else showToast('تتطلب صلاحية شؤون الموظفين', true); return; }
  showLoading();
  try {
    const f = { from: daysAgo(29), to: isoLocal() };
    const res = await Promise.all([bz('laborCost', f), canP('finance', 'reports') && hasF('reports') ? bz('financeReport', Object.assign({ branchId: 'all' }, f)) : Promise.resolve(null)]);
    const lc = res[0], fr = res[1]; if (!lc.success) { showToast(lc.error, true); return; }
    const days = lc.days || 30, k = 30 / days;
    const salaryCats = ['رواتب', 'تكاليف موظفين (تأمينات ورسوم)'];
    const other = fr && fr.success ? (fr.expensesByCategory || []).filter(function (x) { return salaryCats.indexOf(x.category) < 0; }).reduce(function (s, x) { return s + x.total; }, 0) * k : 0;
    const dep = fr && fr.success ? ((fr.summary.depreciation || 0) + (fr.summary.channelFees || 0)) * k : 0;
    const labor = lc.totals.monthlyTcc || lc.monthly;
    const total = Math.round((labor + other + dep) * 100) / 100;
    const fx = document.getElementById('beFixedCosts'); if (fx) fx.value = total;
    bModal({ title: 'التكاليف الثابتة الشهرية (مستوردة)', icon: 'coins', body: v51Row2([['تكلفة العمالة الفعلية الشهرية (TCC)', labor], ['المصروفات الثابتة الأخرى (بدون الرواتب) — آخر 30 يوماً', other], ['الإهلاك واشتراكات قنوات التوصيل', dep], ['الإجمالي المستخدم في نقطة التعادل', total, 1]]) + '<p class="muted">تم استبعاد بنود الرواتب المسجلة في المصروفات لتجنب الاحتساب المزدوج. يمكنك تعديل الرقم يدوياً.</p>',
      foot: '<button class="btn btn-primary" data-x>تم</button>' });
    if (typeof renderBreakevenInputs === 'function') renderBreakevenInputs();
  } finally { hideLoading(); }
}
document.addEventListener('DOMContentLoaded', function () {
  const fx = document.getElementById('beFixedCosts'); if (!fx || document.getElementById('beLaborImp')) return;
  fx.insertAdjacentHTML('afterend', '<button type="button" class="btn btn-outline btn-sm" id="beLaborImp" style="margin:0 0 10px"><i class="fas fa-user-tie"></i> استيراد تكلفة العمالة الفعلية والمصروفات الثابتة</button>');
  document.getElementById('beLaborImp').onclick = v51BreakevenImport;
});

// ============================================================
// التقرير الشامل (Word / Excel): أقسام v5.1
// ============================================================
(function () {
  if (typeof bizFullSections !== 'function') return;
  const orig = bizFullSections;
  window.bizFullSections = bizFullSections = async function () {
    const out = await orig.apply(this, arguments); if (!out) return out;
    const g = async function (fn, p) { try { const r = await bz(fn, p || {}, { silentPlan: true }); return r && r.success ? r : null; } catch (e) { return null; } };
    const f = { from: daysAgo(29), to: isoLocal() }, y = { from: isoLocal().slice(0, 5) + '01-01', to: isoLocal() };
    const hr = hasF('hr') && canP('hr', 'finance'), ac = hasF('accounting') && canP('finance', 'assets'), fin = canP('finance');
    const R = await Promise.all([hr ? g('hrList', {}) : null, hr ? g('laborCost', f) : null, hr ? g('hrTurnover', { from: daysAgo(364), to: isoLocal() }) : null,
      ac ? g('capitalReport') : null, ac ? g('assetsReport', Object.assign({ branchId: 'all' }, y)) : null, ac && fin ? g('cashFlow', f) : null, ac && fin ? g('cashCycle', { from: daysAgo(89), to: isoLocal() }) : null,
      hasF('inv_analytics') && canP('inventory', 'reports', 'purchasing') ? g('invTurnover', Object.assign({ branchId: 'all' }, f)) : null, hasF('inv_analytics') && canP('purchasing', 'inventory') ? g('v51List', { kind: 'po' }) : null,
      hasF('channels') && canP('reports', 'finance') ? g('channelReport', Object.assign({ branchId: 'all' }, f)) : null, hasF('cust_analytics') && canP('customers', 'marketing', 'reports') ? g('custAnalytics', { from: daysAgo(89), to: isoLocal() }) : null,
      ac ? g('v51List', { kind: 'capital' }) : null, hasF('channels') && canP('pos', 'finance', 'reports', 'settings') ? g('v51List', { kind: 'channel' }) : null]);
    const [hl, lc, to, cp, as, cf, cc, it, po, ch, ca, cpl, chl] = R;
    if (hl && hl.rows.length) out.sections.push({ title: 'شؤون الموظفين — التكلفة الفعلية للموظف (TCC)', pb: true, table: { headers: ['الموظف', 'المسمى', 'القسم', 'الحالة', 'الأساسي', 'البدلات', 'تكاليف صاحب العمل', 'التكلفة الفعلية الشهرية'], money: [4, 5, 6, 7], foot: 'sum',
      rows: hl.rows.map(function (x) { return [x.name, x.job || '', V51_DEPTS[x.dept] || '', x.active ? 'على رأس العمل' : 'غادر ' + x.endDate + ' (' + (V51_EXIT[x.exitReason] || '') + ')', x.hr.base, x.hr.fixedAllow + x.hr.varAllow, x.hr.employer, x.hr.tcc]; }) } });
    if (lc) out.sections.push({ title: 'تكلفة العمالة الفعلية — آخر 30 يوماً', table: { headers: ['البند', 'القيمة'], rows: [['الرواتب والبدلات', lc.totals.salary], ['الإضافي والمكافآت', lc.totals.variable], ['الخصومات', -lc.totals.deductions], ['تكاليف صاحب العمل', lc.totals.employer], ['إجمالي تكلفة العمالة', lc.totals.total], ['نسبة العمالة من المبيعات %', lc.laborPct]] } });
    if (to) out.sections.push({ title: 'معدل دوران الموظفين — آخر 12 شهراً', table: { headers: ['المؤشر', 'القيمة'], rows: [['معدل الدوران %', to.rate], ['المغادرون', to.exits], ['طوعي', to.voluntary], ['غير طوعي', to.involuntary], ['المعيّنون الجدد', to.hires], ['متوسط عدد الموظفين', to.avgHeadcount]].concat(to.byReason.map(function (x) { return ['سبب: ' + x.name, x.n]; })) } });
    if (cp) out.sections.push({ title: 'رأس المال والتمويل وحقوق الملكية', pb: true, table: { headers: ['البند', 'المبلغ'], money: [1], rows: [['رأس المال المودع', cp.capitalIn], ['المسحوبات وتوزيعات الأرباح', -cp.drawings], ['صافي رأس المال', cp.equity], ['القروض المستلمة', cp.loansIn], ['المسدد من القروض', -cp.loanRepaid], ['رصيد القروض', cp.loanBalance], ['تكلفة الأصول الثابتة', cp.fixedAssetsCost], ['مجمع الإهلاك', -cp.accumulatedDep], ['صافي القيمة الدفترية للأصول', cp.fixedAssetsNbv]] } });
    if (cpl && cpl.rows.length) out.sections.push({ title: 'حركات رأس المال والتمويل', table: { headers: ['التاريخ', 'النوع', 'البيان', 'المبلغ'], money: [3], rows: cpl.rows.map(function (x) { return [x.period || '', V51_CAP[x.data.type] || x.data.type, x.title, x.data.amount]; }) } });
    if (as && as.rows.length) out.sections.push({ title: 'سجل الأصول الثابتة والإهلاك (من بداية السنة)', table: { headers: ['الأصل', 'الفئة', 'تاريخ الشراء', 'التكلفة', 'العمر', 'مجمع الإهلاك', 'إهلاك الفترة', 'صافي القيمة الدفترية', 'الحالة', 'ربح/خسارة البيع'], money: [3, 5, 6, 7, 9], foot: 'sum',
      rows: as.rows.map(function (x) { return [x.name, x.category, x.purchaseDate, x.cost, x.lifeYears, x.accumulated, x.periodDep, x.nbv, x.status === 'active' ? 'قيد الاستخدام' : (x.status === 'sold' ? 'مباع ' + x.saleDate : 'مستبعد ' + x.saleDate), x.gain]; }) } });
    if (cf) { const lab = { sales: 'مقبوضات المبيعات', collections: 'تحصيلات الآجل', giftCards: 'بطاقات الهدايا', suppliers: 'الموردون', expenses: 'المصروفات', employees: 'الموظفون', commissions: 'عمولات التوصيل', assetPurchases: 'شراء أصول', assetSales: 'بيع أصول', capitalIn: 'رأس مال', drawings: 'مسحوبات', loansIn: 'قروض', loanRepay: 'سداد قروض' };
      const rw = function (o) { return Object.keys(o).map(function (k) { return [lab[k] || k, o[k]]; }); };
      out.sections.push({ title: 'قائمة التدفق النقدي — آخر 30 يوماً', pb: true, table: { headers: ['البند', 'المبلغ'], money: [1], rows: [['رصيد أول المدة', cf.opening]].concat(rw(cf.operatingLines), [['= صافي التشغيلي', cf.operating]], rw(cf.investingLines), [['= صافي الاستثماري', cf.investing]], rw(cf.financingLines), [['= صافي التمويلي', cf.financing], ['رصيد آخر المدة', cf.closing]]) } }); }
    if (cc) out.sections.push({ title: 'الفجوة النقدية — دورة التحويل النقدي (90 يوماً)', table: { headers: ['المؤشر', 'الأيام / القيمة'], rows: [['أيام بقاء المخزون DIO', cc.dio], ['أيام التحصيل DSO', cc.dso], ['أيام السداد DPO', cc.dpo], ['دورة التحويل النقدي CCC', cc.ccc], ['رأس المال العامل المطلوب', cc.workingCapitalNeed]] } });
    if (it && it.rows.length) out.sections.push({ title: 'دوران المخزون — آخر 30 يوماً', pb: true, table: { headers: ['المادة', 'المجموعة', 'الرصيد', 'تكلفة المستهلك', 'معدل الدوران', 'أيام البقاء', 'القيمة', 'التصنيف'], money: [3, 6],
      rows: it.rows.map(function (x) { return [x.name, x.category, x.qty, x.usedValue, x.turnover >= 99 ? '—' : x.turnover, x.days === null ? '—' : x.days, x.value, V51_CLS[x.cls][0]]; }) } });
    if (po && po.rows.length) out.sections.push({ title: 'أوامر الشراء', table: { headers: ['رقم', 'التاريخ', 'المورد', 'القيمة', 'الحالة'], money: [3], rows: po.rows.map(function (x) { return ['#' + x.data.number, x.period || '', x.data.supplierName || '', x.data.total, (V51_PO_ST[x.data.status] || [x.data.status])[0]]; }) } });
    if (chl && chl.rows.length) out.sections.push({ title: 'قنوات التوصيل والعقود', table: { headers: ['القناة', 'العمولة %', 'رسم الطلب', 'الاشتراك الشهري', 'بداية العقد', 'نهاية العقد', 'الحالة'], rows: chl.rows.map(function (x) { return [x.title, x.data.pct || 0, x.data.fixed || 0, x.data.monthlyFee || 0, x.data.contractStart || '', x.data.contractEnd || '', x.data.active !== false ? 'مفعّلة' : 'موقوفة']; }) } });
    // v5.3.0: سجل شروط العقود (النسبة السارية لكل فترة)
    const chh = []; if (chl) chl.rows.forEach(function (x) { (x.data.hist || []).forEach(function (t) { chh.push([x.title, t.from === '0000-01-01' ? 'بداية التعامل' : t.from, t.pct || 0, t.fixed || 0, t.monthlyFee || 0]); }); });
    if (chh.length) out.sections.push({ title: 'سجل شروط عقود قنوات التوصيل', table: { headers: ['القناة', 'ساري من', 'العمولة %', 'رسم الطلب', 'الاشتراك الشهري'], rows: chh } });
    if (ch && ch.rows.length) out.sections.push({ title: 'مبيعات وعمولات قنوات التوصيل — آخر 30 يوماً', table: { headers: ['القناة', 'الطلبات', 'المبيعات', 'العمولة', 'الاشتراك', 'صافي الربح'], money: [2, 3, 4, 5], foot: 'sum', rows: ch.rows.map(function (x) { return [x.name, x.orders, x.sales, x.commission, x.monthlyFee, x.netProfit]; }) } });
    if (ca) out.sections.push({ title: 'تحليلات العملاء — CAC و CLV (90 يوماً)', table: { headers: ['المؤشر', 'القيمة'], rows: [['مصاريف التسويق', ca.marketingSpend], ['العملاء الجدد', ca.newCustomers], ['تكلفة الاستحواذ CAC', ca.cac], ['متوسط الفاتورة', ca.aov], ['الزيارات السنوية', ca.frequency], ['هامش الربح %', ca.grossMarginPct], ['عمر العميل (سنة)', ca.lifespanYears], ['القيمة الدائمة CLV', ca.clv], ['CLV:CAC', ca.ratio === null ? '—' : ca.ratio]] } });
    return out;
  };
})();
