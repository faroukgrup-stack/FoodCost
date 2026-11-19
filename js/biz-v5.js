// ============================================================
// Mataami Pro v5.0
// كشوف الحسابات الموحدة (عملاء/موردون/موظفون/كاشير) + قائمة الدخل + المركز المالي + مسير الرواتب
// التقرير الشامل للموظف · ملصقات QR لدفعات الإنتاج والصلاحية · الامتياز التجاري (الفرنشايز)
// ============================================================
const V5_EMP_TX = {
  salary: ['استحقاق راتب', 'credit'], bonus: ['مكافأة / حافز', 'credit'], allowance: ['بدل', 'credit'], overtime: ['عمل إضافي', 'credit'], refund: ['سداد سلفة من الموظف', 'credit'],
  advance: ['سلفة', 'debit'], payment: ['صرف راتب / دفعة', 'debit'], deduction: ['خصم', 'debit'], penalty: ['جزاء', 'debit'], shortage: ['عجز صندوق', 'debit']
};
const V5_METHODS = [['cash', 'نقداً'], ['transfer', 'تحويل بنكي'], ['card', 'بطاقة'], ['', '— قيد فقط (بدون حركة نقدية) —']];
const V5_PARTY = { customer: 'العميل', supplier: 'المورّد', employee: 'الموظف', cashier: 'الكاشير' };
function v5Pct(n) { return nf(n, 1) + '%'; }
function v5Bal(v, sign) {
  // sign dr: الموجب = مدين (عليه) · cr: الموجب = دائن (له)
  v = +v || 0;
  if (Math.abs(v) < 0.005) return '<span class="badge badge-info">مسدد</span>';
  const owes = sign === 'dr' ? v > 0 : v < 0;
  return '<b style="color:' + (owes ? '#ef4444' : '#10b981') + '">' + money(Math.abs(v)) + '</b> <small class="muted">' + (owes ? 'مدين (عليه)' : 'دائن (له)') + '</small>';
}
function v5BalTxt(v, sign) { v = +v || 0; if (Math.abs(v) < 0.005) return 'مسدد'; const owes = sign === 'dr' ? v > 0 : v < 0; return nf(Math.abs(v)) + ' ' + curName() + (owes ? ' مدين (عليه)' : ' دائن (له)'); }
function v5Month(d) { return (d || isoLocal()).slice(0, 7); }

// ============================================================
// صفحة كشوف الحسابات
// ============================================================
bizPage('statements', { group: 'fin', title: 'كشوف الحسابات', icon: 'file-invoice-dollar', feature: 'statements', perms: ['finance'], plan: 'pro',
  pitch: 'كل كشوف الحسابات في مكان واحد: العملاء، الموردون، الموظفون (سلف وخصومات ورواتب)، الكاشير (عجز وزيادة الصندوق) مع قائمة الدخل والمركز المالي ومسير الرواتب — طباعة وWord وExcel.',
  render: async function (body) {
    const tabs = [['customer', 'العملاء', 'users'], ['supplier', 'الموردون', 'truck', !hasF('purchasing')], ['employee', 'الموظفون', 'user-tie'], ['cashier', 'الكاشير والصناديق', 'cash-register', !hasF('shifts')],
      ['payroll', 'مسير الرواتب', 'money-check-alt', !hasF('payroll')], ['pnl', 'قائمة الدخل (الأرباح والخسائر)', 'chart-pie'], ['position', 'المركز المالي', 'balance-scale']];
    body.innerHTML = subTabs('stSub', tabs, 'customer') + '<div id="stBody"></div>';
    const bar = body.querySelector('#stSub'); bar.querySelectorAll('.locked').forEach(function (b) { b.dataset.plan = b.dataset.sub === 'payroll' ? 'pro' : 'premium'; });
    const el = body.querySelector('#stBody');
    const go = function (k) { if (k === 'pnl') v5Pnl(el); else if (k === 'position') v5Position(el); else if (k === 'payroll') v5Payroll(el); else v5Parties(el, k); };
    bindSubTabs(body, 'stSub', go); go('customer');
  } });

async function v5Parties(el, type) {
  el.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-pulse"></i></div>';
  const r = await bz('stmtParties', { type: type }); if (!r.success) { el.innerHTML = '<div class="empty-state">' + h(r.error) + '</div>'; return; }
  const sign = type === 'customer' ? 'dr' : 'cr';
  let rows = r.rows || [];
  const tot = rows.reduce(function (s, x) { const owes = sign === 'dr' ? x.balance > 0 : x.balance < 0; if (owes) s.dr += Math.abs(x.balance); else s.cr += Math.abs(x.balance); return s; }, { dr: 0, cr: 0 });
  const hints = { customer: 'رصيد العميل المدين = مبيعات آجلة لم تُسدد. الرصيد الدائن = دفعات مقدمة للعميل.', supplier: 'رصيد المورد الدائن = مستحق للمورد من فواتير الشراء.', employee: 'حساب جاري لكل موظف: الرواتب والمكافآت (دائن له) — السلف والخصومات والجزاءات والدفعات (مدين عليه). السلفة تُخصم أقساطها تلقائياً في مسير الرواتب.', cashier: 'كل وردية مغلقة تُسجّل الفرق بين النقد الفعلي والمتوقع: العجز مدين على الكاشير والزيادة دائنة له. يمكنك تحميل العجز على حساب الموظف للخصم من الراتب.' };
  el.innerHTML = '<div class="biz-card"><p class="muted" style="line-height:1.9;margin:0">' + h(hints[type]) + '</p></div>' +
    kpis([['عدد الحسابات', nf(rows.length, 0)], ['إجمالي المدين (عليهم)', money(tot.dr), '', '#ef4444'], ['إجمالي الدائن (لهم)', money(tot.cr), '', '#10b981']]) +
    '<div class="biz-toolbar"><input type="search" id="v5Q" placeholder="بحث بالاسم أو الجوال" style="max-width:260px"><label class="biz-check" style="margin:0"><input type="checkbox" id="v5Nz"> <span>الأرصدة غير الصفرية فقط</span></label><span class="grow"></span>' +
    (type === 'employee' ? '<button class="btn btn-primary btn-sm" id="v5Tx"><i class="fas fa-plus"></i> حركة جديدة (سلفة / خصم / مكافأة / صرف)</button>' : '') + rptButtons('v5PR') + '</div><div id="v5List"></div>';
  const draw = function () {
    const q = (el.querySelector('#v5Q').value || '').trim().toLowerCase(), nz = el.querySelector('#v5Nz').checked;
    const list = rows.filter(function (x) { return (!q || (x.name + ' ' + (x.sub || '')).toLowerCase().indexOf(q) >= 0) && (!nz || Math.abs(x.balance) > 0.004); });
    el.querySelector('#v5List').innerHTML = bTable([{ label: V5_PARTY[type], r: function (x) { return '<b>' + h(x.name) + '</b>' + (x.sub ? '<div class="muted" style="font-size:.74rem">' + h(x.sub) + '</div>' : ''); } },
      type === 'customer' ? { label: 'النقاط / المشتريات', r: function (x) { return x.extra ? nf(x.extra.points, 0) + ' نقطة · ' + money(x.extra.spent) : '—'; } } : type === 'employee' ? { label: 'الراتب / السلف القائمة', r: function (x) { return x.extra ? money(x.extra.wage) + (x.extra.advances > 0 ? ' · <span style="color:#f59e0b">سلف ' + money(x.extra.advances) + '</span>' : '') : '—'; } } : { label: '', r: function () { return ''; } },
      { label: 'الرصيد', num: true, r: function (x) { return type === 'cashier' ? (Math.abs(x.balance) < 0.005 ? '<span class="badge badge-success">مطابق</span>' : '<b style="color:' + (x.balance < 0 ? '#ef4444' : '#10b981') + '">' + (x.balance < 0 ? 'عجز ' : 'زيادة ') + money(Math.abs(x.balance)) + '</b>') : v5Bal(x.balance, sign); } },
      { label: '', r: function (x) { return '<div class="ops-row-acts"><button class="btn btn-outline btn-sm" data-st="' + h(x.id) + '"><i class="fas fa-file-invoice"></i> كشف الحساب</button>' + (type === 'employee' ? '<button class="btn btn-outline btn-sm" data-erp="' + h(x.id) + '"><i class="fas fa-id-card"></i> التقرير الشامل</button>' : '') + '</div>'; } }], list, { empty: 'لا توجد حسابات' });
  };
  el.querySelector('#v5Q').oninput = draw; el.querySelector('#v5Nz').onchange = draw; draw();
  rptBind(el, 'v5PR', function () { return { title: 'أرصدة ' + ({ customer: 'العملاء', supplier: 'الموردين', employee: 'الموظفين', cashier: 'الكاشير' })[type], kpis: [['عدد الحسابات', nf(rows.length, 0)], ['إجمالي المدين', money(tot.dr)], ['إجمالي الدائن', money(tot.cr)]],
    sections: [{ table: { headers: [V5_PARTY[type], 'البيان', 'الرصيد', 'الحالة'], money: [2], rows: rows.map(function (x) { return [x.name, x.sub || '', Math.abs(x.balance), type === 'cashier' ? (x.balance < 0 ? 'عجز' : x.balance > 0 ? 'زيادة' : 'مطابق') : v5BalTxt(x.balance, sign).replace(/^[\d.,]+\s\S*\s?/, '')]; }) } }], signature: true }; });
  el.onclick = function (e) {
    const s = e.target.closest('[data-st]'), rp = e.target.closest('[data-erp]');
    if (s) { const x = rows.find(function (y) { return String(y.id) === s.dataset.st; }); v5Statement(type, s.dataset.st, x ? x.name : '', function () { v5Parties(el, type); }); }
    else if (rp) v5EmpReport(rp.dataset.erp);
    if (e.target.closest('#v5Tx')) v5EmpTxnForm(null, function () { v5Parties(el, type); });
  };
}

// ---------- نافذة كشف الحساب ----------
function v5Statement(type, id, name, onChange, opt) {
  opt = opt || {};
  const fn = opt.franchiseId ? 'franchiseStatement' : 'statementGet';
  const base = opt.franchiseId ? { id: opt.franchiseId, partyId: id } : { id: id };
  const m = bModal({ title: 'كشف حساب ' + V5_PARTY[type] + ': ' + name, icon: 'file-invoice-dollar', xwide: true, print: false,
    body: dateRangeBar('v5SR', daysAgo(89), isoLocal()) + '<div id="v5SB"><div class="empty-state"><i class="fas fa-spinner fa-pulse"></i></div></div>',
    foot: '<button class="btn btn-cancel" data-x>إغلاق</button>' + (type === 'employee' && !opt.franchiseId ? '<button class="btn btn-outline" data-act="tx"><i class="fas fa-plus"></i> حركة جديدة</button><button class="btn btn-outline" data-act="rep"><i class="fas fa-id-card"></i> التقرير الشامل</button>' : '') + rptButtons('v5SP'),
    actions: { tx: function () { v5EmpTxnForm(id, function () { load(get()); if (onChange) onChange(); }); }, rep: function () { v5EmpReport(id); } } });
  let R = null;
  const load = async function (rg) {
    const box = m.$('#v5SB');
    const r = await bz(fn, Object.assign({ type: type, from: rg.from, to: rg.to }, base));
    if (!r.success) { box.innerHTML = '<div class="empty-state">' + h(r.error) + '</div>'; return; }
    R = r; const sg = r.party.sign;
    box.innerHTML = '<div class="biz-card"><div class="biz-form">' + (r.party.info || []).map(function (kv) { return '<div><div class="muted" style="font-size:.74rem">' + h(kv[0]) + '</div><b>' + h(typeof kv[1] === 'number' ? nf(kv[1]) : (kv[1] || '—')) + '</b></div>'; }).join('') + '</div></div>' +
      kpis([['الرصيد الافتتاحي', v5Bal(r.opening, sg)], ['إجمالي المدين', money(r.totals.debit)], ['إجمالي الدائن', money(r.totals.credit)], ['الرصيد الختامي', v5Bal(r.closing, sg)]].concat(r.extra && r.extra.advances ? [['سلف قائمة', money(r.extra.advances), '', '#f59e0b']] : [])) +
      bTable([{ label: 'التاريخ', r: function (x) { return h(x.date); } }, { label: 'المرجع', r: function (x) { return h(x.ref); } }, { label: 'البيان', r: function (x) { return h(x.desc) + (x.by ? ' <small class="muted">· ' + h(x.by) + '</small>' : ''); } },
        { label: 'مدين', num: true, r: function (x) { return x.debit ? money(x.debit) : ''; } }, { label: 'دائن', num: true, r: function (x) { return x.credit ? money(x.credit) : ''; } }, { label: 'الرصيد', num: true, r: function (x) { return v5Bal(x.balance, sg); } },
        { label: '', r: function (x) {
          if (opt.franchiseId) return '';
          if (type === 'employee' && x.id) return '<button class="ico-btn danger" data-del="' + h(x.id) + '" title="حذف الحركة"><i class="fas fa-trash"></i></button>';
          if (type === 'cashier' && x.debit > 0) return '<button class="btn btn-outline btn-sm" data-sh="' + x.debit + '" data-dt="' + h(x.date) + '"><i class="fas fa-user-minus"></i> خصم من راتب الموظف</button>';
          return '';
        } }], r.rows, { empty: 'لا توجد حركات في هذه الفترة' }) +
      (r.extra && r.extra.orders && r.extra.orders.length ? '<div class="biz-sec">طلبات العميل في الفترة (' + r.extra.orders.length + ')</div>' + bTable([{ label: '#', r: function (o) { return o.number; } }, { label: 'التاريخ', r: function (o) { return h(o.date); } }, { label: 'النوع', r: function (o) { return h(ORDER_TYPES[o.type] || o.type || ''); } }, { label: 'الحالة', r: function (o) { return stBadge(ORDER_STATUS, o.status); } }, { label: 'الإجمالي', num: true, r: function (o) { return money(o.total); } }], r.extra.orders) : '');
  };
  const get = bindRange(m.el, 'v5SR', load); load(get());
  m.el.addEventListener('click', async function (e) {
    const d = e.target.closest('[data-del]'), sh = e.target.closest('[data-sh]');
    if (d && await bConfirm('حذف هذه الحركة من حساب الموظف؟')) { await bzOk('empTxnDelete', { id: d.dataset.del }); load(get()); if (onChange) onChange(); }
    if (sh) {
      const dir = await bz('empDirectory', {}); const emp = (dir.employees || []).find(function (x) { return x.staffId === id || x.id === 'staff:' + id || x.id === id; });
      if (!emp) { showToast('لم يُعثر على ملف موظف مرتبط بهذا الكاشير — أضفه من فريق العمل', true); return; }
      v5EmpTxnForm(emp.id, function () { if (onChange) onChange(); }, { type: 'shortage', amount: +sh.dataset.sh, note: 'عجز صندوق وردية ' + sh.dataset.dt });
    }
  });
  rptBind(m.el, 'v5SP', function () {
    if (!R) throw new Error('لا توجد بيانات');
    const sg = R.party.sign;
    return { title: 'كشف حساب ' + V5_PARTY[type] + ': ' + R.party.name, period: R.from + ' — ' + R.to,
      kpis: [['الرصيد الافتتاحي', v5BalTxt(R.opening, sg)], ['إجمالي المدين', money(R.totals.debit)], ['إجمالي الدائن', money(R.totals.credit)], ['الرصيد الختامي', v5BalTxt(R.closing, sg)]],
      sections: [{ title: 'بيانات الحساب', table: { headers: ['البيان', 'القيمة'], rows: (R.party.info || []).map(function (kv) { return [kv[0], typeof kv[1] === 'number' ? nf(kv[1]) : (kv[1] || '—')]; }) } },
        { title: 'الحركات', table: { headers: ['التاريخ', 'المرجع', 'البيان', 'مدين', 'دائن', 'الرصيد'], money: [3, 4], rows: [['', '', 'رصيد افتتاحي', 0, 0, v5BalTxt(R.opening, sg)]].concat(R.rows.map(function (x) { return [x.date, x.ref, x.desc, x.debit, x.credit, v5BalTxt(x.balance, sg)]; })).concat([['', '', 'الإجمالي / الرصيد الختامي', R.totals.debit, R.totals.credit, v5BalTxt(R.closing, sg)]]) } }], signature: true };
  });
  return m;
}

// ---------- حركة على حساب موظف ----------
async function v5EmpTxnForm(empId, after, preset) {
  const dir = await bz('empDirectory', {}); if (!dir.success) { showToast(dir.error, true); return; }
  const emps = (dir.employees || []).filter(function (x) { return x.active || x.id === empId; });
  if (!emps.length) { showToast('لا يوجد موظفون — أضفهم من الموظفين والفروع أو فريق العمل', true); return; }
  preset = preset || {};
  const F = [{ k: 'empId', label: 'الموظف', type: 'select', req: true, full: true, options: emps.map(function (e) { return [e.id, e.name + (e.job ? ' · ' + e.job : '') + ' — الرصيد: ' + v5BalTxt(e.balance, 'cr')]; }), def: empId || emps[0].id },
    { k: 'type', label: 'نوع الحركة', type: 'select', options: Object.keys(V5_EMP_TX).map(function (k) { return [k, V5_EMP_TX[k][0] + (V5_EMP_TX[k][1] === 'credit' ? ' (دائن — للموظف)' : ' (مدين — على الموظف)')]; }), def: preset.type || 'advance' },
    { k: 'amount', label: 'المبلغ', type: 'number', req: true, def: preset.amount || '' }, { k: 'date', label: 'التاريخ', type: 'date', def: isoLocal() },
    { k: 'month', label: 'عن شهر (للرواتب)', type: 'month', def: v5Month() },
    { k: 'method', label: 'طريقة الصرف / القبض', type: 'select', options: V5_METHODS, def: preset.type === 'shortage' || preset.type === 'deduction' ? '' : 'cash', hint: 'السلفة وصرف الراتب النقدي تُسجّل في المصروفات عند اختيار طريقة دفع' },
    { k: 'installments', label: 'عدد أقساط السلفة (شهور)', type: 'number', def: 1, hint: 'يُخصم القسط تلقائياً من مسير الرواتب الشهري' },
    { k: 'note', label: 'البيان / ملاحظات', full: true, def: preset.note || '' }];
  bPrompt('حركة على حساب موظف', F, {}, async function (d) {
    if (!(d.amount > 0)) { showToast('أدخل مبلغاً صحيحاً', true); return false; }
    await bzOk('empTxnSave', { data: d }); showToast('تم تسجيل ' + V5_EMP_TX[d.type][0] + ' بمبلغ ' + money(d.amount)); if (after) after();
  }, { icon: 'hand-holding-usd', wide: true, onOpen: function (m) {
    const sync = function () { const t = m.$('[data-k=type]').value; m.$('[data-k=installments]').closest('div').parentElement.style.display = t === 'advance' ? '' : 'none'; };
    m.$('[data-k=type]').addEventListener('change', sync); sync();
  } });
}

// ---------- مسير الرواتب ----------
async function v5Payroll(el) {
  el.innerHTML = '<div class="biz-filter"><label>الشهر <input type="month" id="v5PM" value="' + v5Month() + '"></label><button class="btn btn-primary btn-sm" id="v5PG"><i class="fas fa-sync"></i> إعداد المسير</button><span class="grow"></span>' + rptButtons('v5PP') + '</div><div id="v5PB"></div>';
  let R = null;
  const calc = function (x) { return Math.max(0, Math.round(((+x.wage || 0) + (+x.additions || 0) - (+x.deductions || 0) - (+x.advanceInstallment || 0)) * 100) / 100); };
  const draw = function () {
    const rows = R.rows;
    const tw = rows.reduce(function (s, x) { return s + (+x.wage || 0); }, 0), tn = rows.reduce(function (s, x) { return s + calc(x); }, 0), ti = rows.reduce(function (s, x) { return s + (+x.advanceInstallment || 0); }, 0);
    el.querySelector('#v5PB').innerHTML = kpis([['عدد الموظفين', nf(rows.length, 0)], ['إجمالي الرواتب الأساسية', money(tw)], ['أقساط السلف المخصومة', money(ti), '', '#f59e0b'], ['صافي المستحق', money(tn), '', '#10b981']]) +
      '<div class="biz-card"><p class="muted" style="margin:0;line-height:1.9">الإضافات = المكافآت والبدلات والعمل الإضافي المسجلة في الشهر. الخصومات = الخصومات والجزاءات وعجز الصندوق. يمكنك تعديل الأرقام قبل الاعتماد. الاعتماد يسجّل استحقاق الراتب في حساب كل موظف ويمكنه تسجيل الإجمالي في المصروفات وصرف الصافي.</p></div>' +
      bTable([{ label: 'الموظف', r: function (x) { return '<b>' + h(x.name) + '</b><div class="muted" style="font-size:.72rem">' + h(x.job || '') + '</div>'; } },
        { label: 'الراتب', num: true, r: function (x, i) { return '<input type="number" step="any" data-pi="' + i + '" data-pf="wage" value="' + x.wage + '" style="width:90px">'; } },
        { label: 'إضافات', num: true, r: function (x, i) { return '<input type="number" step="any" data-pi="' + i + '" data-pf="additions" value="' + x.additions + '" style="width:80px">'; } },
        { label: 'خصومات', num: true, r: function (x, i) { return '<input type="number" step="any" data-pi="' + i + '" data-pf="deductions" value="' + x.deductions + '" style="width:80px">'; } },
        { label: 'سلف قائمة', num: true, r: function (x) { return x.advanceOutstanding ? money(x.advanceOutstanding) : '—'; } },
        { label: 'قسط السلفة', num: true, r: function (x, i) { return '<input type="number" step="any" data-pi="' + i + '" data-pf="advanceInstallment" value="' + x.advanceInstallment + '" style="width:80px">'; } },
        { label: 'الصافي', num: true, r: function (x, i) { return '<b data-net="' + i + '">' + money(calc(x)) + '</b>'; } },
        { label: 'الحالة', r: function (x) { return x.salaryPosted ? '<span class="badge badge-success">معتمد' + (x.paid ? ' · مصروف ' + money(x.paid) : '') + '</span>' : '<span class="badge badge-warning">غير معتمد</span>'; } }], rows, { empty: 'لا يوجد موظفون نشطون بأجور — أضف الرواتب من فريق العمل' }) +
      (rows.length ? '<div class="biz-card"><div class="biz-form"><label class="biz-check"><input type="checkbox" id="v5PE" checked> <span>تسجيل إجمالي الرواتب في المصروفات (بند رواتب)</span></label><label class="biz-check"><input type="checkbox" id="v5PY"> <span>صرف الصافي الآن (تسجيل دفعة لكل موظف)</span></label><div><label class="pro-label">طريقة الصرف</label><div class="pro-input-wrap"><select id="v5PMt">' + V5_METHODS.slice(0, 3).map(function (o) { return '<option value="' + o[0] + '">' + o[1] + '</option>'; }).join('') + '</select></div></div></div><div style="margin-top:12px"><button class="btn btn-primary" id="v5PO"><i class="fas fa-check-double"></i> اعتماد مسير شهر ' + h(R.month) + '</button></div></div>' : '');
  };
  const load = async function () { el.querySelector('#v5PB').innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-pulse"></i></div>'; const r = await bz('payrollPreview', { month: el.querySelector('#v5PM').value }); if (!r.success) { el.querySelector('#v5PB').innerHTML = '<div class="empty-state">' + h(r.error) + '</div>'; return; } R = r; draw(); };
  el.querySelector('#v5PG').onclick = load;
  el.oninput = function (e) { const i = e.target.dataset.pi; if (i === undefined || !R) return; R.rows[+i][e.target.dataset.pf] = parseFloat(e.target.value) || 0; const n = el.querySelector('[data-net="' + i + '"]'); if (n) n.innerHTML = money(calc(R.rows[+i])); };
  el.onclick = async function (e) {
    if (!e.target.closest('#v5PO') || !R) return;
    const posted = R.rows.filter(function (x) { return x.salaryPosted; }).length;
    if (!await bConfirm((posted ? 'تنبيه: ' + posted + ' موظف لديهم استحقاق مسجل لهذا الشهر وسيتم تخطيهم. ' : '') + 'اعتماد مسير رواتب شهر ' + R.month + '؟')) return;
    const r = await bzOk('payrollPost', { month: R.month, rows: R.rows.map(function (x) { return Object.assign({}, x, { net: calc(x) }); }), method: el.querySelector('#v5PMt').value, pay: el.querySelector('#v5PY').checked, toExpense: el.querySelector('#v5PE').checked, branchId: B.branch || '' });
    showToast('تم اعتماد ' + r.posted + ' راتب' + (r.paidTotal ? ' وصرف ' + money(r.paidTotal) : '')); load();
  };
  rptBind(el, 'v5PP', function () {
    if (!R) throw new Error('أعدّ المسير أولاً');
    return { title: 'مسير رواتب شهر ' + R.month, sections: [{ table: { headers: ['الموظف', 'المسمى', 'الراتب', 'إضافات', 'خصومات', 'قسط سلفة', 'الصافي', 'توقيع الموظف'], money: [2, 3, 4, 5, 6], foot: 'sum', rows: R.rows.map(function (x) { return [x.name, x.job || '', +x.wage || 0, +x.additions || 0, +x.deductions || 0, +x.advanceInstallment || 0, calc(x), '']; }) } }], signature: true };
  });
  load();
}

// ---------- قائمة الدخل ----------
async function v5Pnl(el) {
  el.innerHTML = dateRangeBar('v5IR', isoLocal().slice(0, 8) + '01', isoLocal(), '<label class="biz-check" style="margin:0"><input type="checkbox" data-f="cmp" value="1" checked> <span>مقارنة بالفترة السابقة</span></label>') + '<div class="biz-toolbar"><span class="grow"></span>' + rptButtons('v5IP') + '</div><div id="v5IB"></div>';
  let L = null;
  const prevRange = function (f, t) { const a = new Date(f + 'T00:00:00'), b = new Date(t + 'T00:00:00'); const days = Math.round((b - a) / 864e5) + 1; return { from: isoLocal(new Date(a.getTime() - days * 864e5)), to: isoLocal(new Date(a.getTime() - 864e5)) }; };
  const lines = function (s, ex) {
    const out = [['المبيعات الإجمالية', s.grossSales, 'h'], ['(-) المرتجعات', -s.refunds], ['= صافي المبيعات', s.netSales, 'b'], ['(-) ضريبة القيمة المضافة', -s.tax], ['= صافي الإيرادات قبل الضريبة', s.netSalesExTax, 'b'],
      ['(-) تكلفة المبيعات (تكلفة الأطباق والمواد)', -s.cogs], ['= مجمل الربح', s.grossProfit, 'b']];
    (ex || []).forEach(function (x) { out.push(['(-) مصروف: ' + x.category, -x.total]); });
    out.push(['(-) إجمالي المصروفات التشغيلية', -s.expenses, 'b'], ['(-) الهدر والتالف', -s.waste], ['= صافي الربح / (الخسارة)', s.netProfit, 'n']);
    return out;
  };
  const load = async function (rg) {
    const box = el.querySelector('#v5IB'); box.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-pulse"></i></div>';
    const br = hasF('multi_branch') ? (B.branch || 'all') : '';
    const cmp = el.querySelector('[data-f=cmp]').checked, pr = prevRange(rg.from, rg.to);
    const res = await Promise.all([bz('financeReport', { from: rg.from, to: rg.to, branchId: br }), cmp ? bz('financeReport', { from: pr.from, to: pr.to, branchId: br }) : Promise.resolve(null)]);
    const r = res[0], p = res[1]; if (!r.success) { box.innerHTML = '<div class="empty-state">' + h(r.error) + '</div>'; return; }
    const s = r.summary, ps = p && p.success ? p.summary : null;
    const cats = {}; (r.expensesByCategory || []).forEach(function (x) { cats[x.category] = 1; }); ((p && p.expensesByCategory) || []).forEach(function (x) { cats[x.category] = 1; });
    const exOf = function (rr) { return Object.keys(cats).map(function (c) { const f = ((rr && rr.expensesByCategory) || []).find(function (x) { return x.category === c; }); return { category: c, total: f ? f.total : 0 }; }); };
    const cur = lines(s, exOf(r)), prv = ps ? lines(ps, exOf(p)) : null;
    const base = s.netSalesExTax || 0;
    L = { rg: rg, pr: pr, s: s, ps: ps, cur: cur, prv: prv, r: r };
    box.innerHTML = kpis([['صافي الإيرادات', money(s.netSalesExTax)], ['مجمل الربح', money(s.grossProfit), 'هامش ' + v5Pct(s.grossMargin)], ['المصروفات', money(s.expenses)], ['صافي الربح', money(s.netProfit), base ? 'هامش ' + v5Pct(s.netProfit / base * 100) : '', s.netProfit >= 0 ? '#10b981' : '#ef4444'], ['نسبة تكلفة الطعام', base ? v5Pct(s.cogs / base * 100) : '—'], ['الفواتير', nf(s.invoices, 0), 'متوسط ' + money(s.avgTicket)]]) +
      '<div class="table-container biz-table"><table><thead><tr><th>البند</th><th class="num">الفترة الحالية</th><th class="num">% من الإيرادات</th>' + (prv ? '<th class="num">الفترة السابقة</th><th class="num">التغير</th>' : '') + '</tr></thead><tbody>' +
      cur.map(function (ln, i) { const pv = prv ? prv[i][1] : null; const ch = pv ? ((ln[1] - pv) / Math.abs(pv) * 100) : null; const st = ln[2] === 'n' ? 'font-weight:800;font-size:1.05rem;background:rgba(180,133,84,.12)' : ln[2] === 'b' ? 'font-weight:700;background:rgba(255,255,255,.03)' : '';
        return '<tr style="' + st + '"><td>' + h(ln[0]) + '</td><td class="num" style="color:' + (ln[1] < 0 ? '#ef4444' : '') + '">' + money(ln[1]) + '</td><td class="num">' + (base ? v5Pct(Math.abs(ln[1]) / base * 100) : '—') + '</td>' + (prv ? '<td class="num">' + money(pv) + '</td><td class="num">' + (ch === null || !isFinite(ch) ? '—' : '<span style="color:' + (ch >= 0 ? '#10b981' : '#ef4444') + '">' + (ch >= 0 ? '+' : '') + nf(ch, 1) + '%</span>') + '</td>' : '') + '</tr>'; }).join('') +
      '</tbody></table></div>' +
      '<div class="biz-sec">معلومات إضافية</div>' + bTable([{ label: 'البند', r: function (x) { return h(x[0]); } }, { label: 'القيمة', num: true, r: function (x) { return x[1]; } }], [['الخصومات الممنوحة', money(s.discounts)], ['المشتريات المسجلة في الفترة', money(s.purchases)], ['عدد الفواتير', nf(s.invoices, 0)], ['متوسط الفاتورة', money(s.avgTicket)]].concat(Object.keys(r.byMethod || {}).map(function (k) { return ['التحصيل: ' + (PAY_NAMES[k] || k), money(r.byMethod[k])]; })));
  };
  const get = bindRange(el, 'v5IR', load); load(get());
  rptBind(el, 'v5IP', function () {
    if (!L) throw new Error('لا توجد بيانات');
    const hd = ['البند', 'الفترة الحالية'].concat(L.prv ? ['الفترة السابقة (' + L.pr.from + ' — ' + L.pr.to + ')'] : []);
    return { title: 'قائمة الدخل (الأرباح والخسائر)', period: L.rg.from + ' — ' + L.rg.to,
      kpis: [['صافي الإيرادات', money(L.s.netSalesExTax)], ['مجمل الربح', money(L.s.grossProfit)], ['المصروفات', money(L.s.expenses)], ['صافي الربح', money(L.s.netProfit)]],
      sections: [{ title: 'قائمة الدخل', table: { headers: hd, money: L.prv ? [1, 2] : [1], rows: L.cur.map(function (ln, i) { return [ln[0], ln[1]].concat(L.prv ? [L.prv[i][1]] : []); }) } },
        { title: 'التحصيل حسب طريقة الدفع', table: { headers: ['الطريقة', 'المبلغ'], money: [1], foot: 'sum', rows: Object.keys(L.r.byMethod || {}).map(function (k) { return [PAY_NAMES[k] || k, L.r.byMethod[k]]; }) } }], signature: true };
  });
}

// ---------- المركز المالي ----------
async function v5Position(el) {
  el.innerHTML = '<div class="biz-toolbar"><span class="grow muted">مؤشر تقديري لحظي للذمم والأرصدة — يساعد المحاسب والإدارة في القراءة المالية السريعة.</span>' + rptButtons('v5XP') + '</div><div id="v5XB"><div class="empty-state"><i class="fas fa-spinner fa-pulse"></i></div></div>';
  const r = await bz('financePosition', {}); const box = el.querySelector('#v5XB');
  if (!r.success) { box.innerHTML = '<div class="empty-state">' + h(r.error) + '</div>'; return; }
  const A = [['ذمم العملاء المدينة (' + r.debtors + ' عميل)', r.receivables], ['سلف وأرصدة مدينة على الموظفين', r.employeesOwe], ['قيمة المخزون الحالي بالتكلفة', r.stockValue], ['عُهد نقدية في الصناديق المفتوحة (' + r.openShifts + ' وردية)', r.openShiftsFloat]];
  const Lb = [['مستحقات الموردين (' + r.creditors + ' مورد)', r.payables], ['مستحقات للموظفين (رواتب غير مصروفة)', r.employeesOwed], ['دفعات مقدمة وأرصدة دائنة للعملاء', r.customerCredit]];
  const sa = A.reduce(function (s, x) { return s + x[1]; }, 0), sl = Lb.reduce(function (s, x) { return s + x[1]; }, 0);
  box.innerHTML = kpis([['إجمالي الأصول المتداولة', money(sa), '', '#10b981'], ['إجمالي الالتزامات', money(sl), '', '#ef4444'], ['صافي المركز', money(sa - sl), '', sa - sl >= 0 ? '#10b981' : '#ef4444'], ['منها سلف موظفين قائمة', money(r.employeeAdvances)]]) +
    '<div class="biz-sec">الأصول المتداولة</div>' + bTable([{ label: 'البند', r: function (x) { return h(x[0]); } }, { label: 'المبلغ', num: true, r: function (x) { return money(x[1]); } }], A, { foot: '<tr><td><b>الإجمالي</b></td><td class="num"><b>' + money(sa) + '</b></td></tr>' }) +
    '<div class="biz-sec">الالتزامات</div>' + bTable([{ label: 'البند', r: function (x) { return h(x[0]); } }, { label: 'المبلغ', num: true, r: function (x) { return money(x[1]); } }], Lb, { foot: '<tr><td><b>الإجمالي</b></td><td class="num"><b>' + money(sl) + '</b></td></tr>' });
  rptBind(el, 'v5XP', function () { return { title: 'المركز المالي المختصر', subtitle: 'كما في ' + dt(new Date()), kpis: [['الأصول المتداولة', money(sa)], ['الالتزامات', money(sl)], ['صافي المركز', money(sa - sl)]],
    sections: [{ title: 'الأصول المتداولة', table: { headers: ['البند', 'المبلغ'], money: [1], foot: 'sum', rows: A } }, { title: 'الالتزامات', table: { headers: ['البند', 'المبلغ'], money: [1], foot: 'sum', rows: Lb } }], signature: true }; });
}

// ============================================================
// التقرير الشامل للموظف
// ============================================================
function v5EmpReport(empId) {
  const m = bModal({ title: 'التقرير الشامل للموظف', icon: 'id-card', xwide: true, print: false,
    body: dateRangeBar('v5ER', daysAgo(29), isoLocal()) + '<div id="v5EB"><div class="empty-state"><i class="fas fa-spinner fa-pulse"></i></div></div>',
    foot: '<button class="btn btn-cancel" data-x>إغلاق</button>' + (canP('finance', 'team') ? '<button class="btn btn-outline" data-act="tx"><i class="fas fa-plus"></i> حركة مالية</button><button class="btn btn-outline" data-act="st"><i class="fas fa-file-invoice"></i> كشف الحساب</button>' : '') + rptButtons('v5EP'),
    actions: { tx: function () { v5EmpTxnForm(R && R.profile.id || empId, function () { load(get()); }); }, st: function () { v5Statement('employee', R && R.profile.id || empId, R ? R.profile.name : ''); } } });
  let R = null;
  const sec = function (t, i) { return '<div class="biz-sec"><i class="fas fa-' + i + '"></i> ' + h(t) + '</div>'; };
  const load = async function (rg) {
    const box = m.$('#v5EB'); box.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-pulse"></i></div>';
    const r = await bz('empReport', { empId: empId, from: rg.from, to: rg.to }); if (!r.success) { box.innerHTML = '<div class="empty-state">' + h(r.error) + '</div>'; return; }
    R = r; const P = r.profile, F = r.financial, J = r.job, Q = r.productivity;
    const avgEval = r.evaluations.length ? r.evaluations.reduce(function (s, x) { return s + x.score; }, 0) / r.evaluations.length : 0;
    const ledgerP = F.ledger.filter(function (x) { return x.date >= r.from && x.date <= r.to; });
    box.innerHTML = '<div class="biz-card" style="display:flex;gap:16px;align-items:center;flex-wrap:wrap"><div class="mh-icon" style="width:56px;height:56px;font-size:1.4rem"><i class="fas fa-user-tie"></i></div><div style="flex:1;min-width:200px"><h3 style="margin:0">' + h(P.name) + ' ' + (P.active ? '<span class="badge badge-success">نشط</span>' : '<span class="badge badge-dog">غير نشط</span>') + '</h3><div class="muted">' + h([P.job, (typeof OPS_DEPTS !== 'undefined' ? OPS_DEPTS[P.dept] : ''), P.phone].filter(Boolean).join(' · ')) + '</div>' +
      '<div class="muted" style="font-size:.78rem">تاريخ التعيين: ' + h(P.startDate || '—') + (P.account ? ' · حساب الدخول: <span dir="ltr">' + h(P.account.username) + '</span> (' + h(P.account.role) + ' · ' + h(P.account.branch) + ') · آخر دخول ' + dt(P.account.lastLogin) : '') + '</div></div></div>' +
      sec('الملخص المالي — ماله وما عليه', 'wallet') +
      kpis([['الراتب الشهري', money(P.wage)], ['الرصيد الحالي', v5Bal(F.balance, 'cr')], ['سلف قائمة', money(F.advances), '', F.advances > 0 ? '#f59e0b' : ''], ['تقييم الأداء', r.evaluations.length ? nf(avgEval, 1) : '—', r.evaluations.length + ' تقييم']]) +
      bTable([{ label: 'النوع', r: function (k) { return h(F.types[k] ? F.types[k].name : k); } }, { label: 'الجهة', r: function (k) { return F.types[k] && F.types[k].side === 'credit' ? '<span style="color:#10b981">له</span>' : '<span style="color:#ef4444">عليه</span>'; } }, { label: 'الإجمالي (كل الفترات)', num: true, r: function (k) { return money(F.byType[k]); } }], Object.keys(F.byType || {}), { empty: 'لا توجد حركات مالية مسجلة' }) +
      (ledgerP.length ? '<div class="muted" style="margin:8px 0">حركات الفترة</div>' + bTable([{ label: 'التاريخ', r: function (x) { return h(x.date); } }, { label: 'النوع', r: function (x) { return h(x.typeName); } }, { label: 'البيان', r: function (x) { return h(x.note || ''); } }, { label: 'له', num: true, r: function (x) { return x.side === 'credit' ? money(x.amount) : ''; } }, { label: 'عليه', num: true, r: function (x) { return x.side === 'debit' ? money(x.amount) : ''; } }, { label: 'الرصيد', num: true, r: function (x) { return v5Bal(x.balance, 'cr'); } }], ledgerP) : '') +
      sec('الجانب الوظيفي — جدول الدوام والورديات', 'calendar-alt') +
      kpis([['أيام العمل المجدولة', nf(J.workDays, 0)], ['ساعات مجدولة', nf(J.plannedHours, 1)], ['ورديات كاشير', nf(J.shifts.length, 0), nf(J.shiftHours, 1) + ' ساعة'], ['فروقات الصندوق', money(J.cashDiff), '', J.cashDiff < 0 ? '#ef4444' : '']]) +
      bTable([{ label: 'اليوم', r: function (x) { return h(x.day) + ' <small class="muted">' + (typeof OPS_DAYS !== 'undefined' ? OPS_DAYS[new Date(x.day + 'T00:00:00').getDay()] || '' : '') + '</small>'; } }, { label: 'الوردية', r: function (x) { return h(x.shift); } }, { label: 'من', r: function (x) { return h(x.start || '—'); } }, { label: 'إلى', r: function (x) { return h(x.end || '—'); } }, { label: 'الساعات', num: true, r: function (x) { return x.hours ? nf(x.hours, 1) : '—'; } }], J.schedule, { empty: 'لا يوجد جدول دوام منشور في هذه الفترة (من الإدارة التشغيلية ← جدول الورديات)' }) +
      (J.shifts.length ? bTable([{ label: 'فتح الوردية', r: function (x) { return dt(x.opened); } }, { label: 'الإغلاق', r: function (x) { return x.closed ? dt(x.closed) : '<span class="badge badge-warning">مفتوحة</span>'; } }, { label: 'الساعات', num: true, r: function (x) { return nf(x.hours, 1); } }, { label: 'المبيعات', num: true, r: function (x) { return money(x.sales); } }, { label: 'المتوقع', num: true, r: function (x) { return money(x.expected); } }, { label: 'الفعلي', num: true, r: function (x) { return money(x.counted); } }, { label: 'الفرق', num: true, r: function (x) { return '<b style="color:' + (x.diff < 0 ? '#ef4444' : x.diff > 0 ? '#10b981' : '') + '">' + money(x.diff) + '</b>'; } }], J.shifts) : '') +
      sec('الإنتاجية', 'chart-line') +
      kpis([['الطلبات', nf(Q.orders, 0)], ['المبيعات', money(Q.sales), 'يومياً ' + money(Q.perDay)], ['متوسط الفاتورة', money(Q.avgTicket)], ['الأصناف المباعة', nf(Q.items, 0)], ['الخصومات', money(Q.discounts)], ['الإلغاءات', nf(Q.cancels.n, 0), money(Q.cancels.value), Q.cancels.n ? '#f59e0b' : ''], ['المرتجعات', nf(Q.refunds.n, 0), money(Q.refunds.value)], ['التوصيلات', nf(Q.deliveries.n, 0), Q.deliveries.n ? 'متوسط ' + nf(Q.deliveries.avgMin, 0) + ' د' : '']]) +
      (Q.byDay.length ? bTable([{ label: 'اليوم', r: function (x) { return h(x.day); } }, { label: 'الطلبات', num: true, r: function (x) { return nf(x.orders, 0); } }, { label: 'المبيعات', num: true, r: function (x) { return money(x.sales); } }], Q.byDay) : '') +
      (Q.sop.length ? '<div class="muted" style="margin:8px 0">الالتزام بإجراءات العمل (SOP)</div>' + bTable([{ label: 'النوع', r: function (x) { return h(x.kind); } }, { label: 'المرات', num: true, r: function (x) { return nf(x.n, 0); } }, { label: 'متوسط النتيجة', num: true, r: function (x) { return nf(x.avg, 1); } }], Q.sop) : '') +
      sec('التقييمات', 'star-half-alt') + bTable([{ label: 'الشهر', r: function (x) { return h(x.month); } }, { label: 'النتيجة', num: true, r: function (x) { return nf(x.score, 1); } }, { label: 'بواسطة', r: function (x) { return h(x.by); } }, { label: 'ملاحظات', r: function (x) { return h(x.notes); } }], r.evaluations, { empty: 'لا توجد تقييمات (من الإدارة التشغيلية ← تقييم الأداء)' }) +
      sec('سجل النشاط', 'history') + bTable([{ label: 'الوقت', r: function (x) { return dt(x.at); } }, { label: 'الإجراء', r: function (x) { return h(x.action); } }, { label: 'التفاصيل', r: function (x) { return h(x.details); } }], r.activity.slice(0, 80), { empty: 'لا يوجد نشاط مسجل' });
  };
  const get = bindRange(m.el, 'v5ER', load); load(get());
  rptBind(m.el, 'v5EP', function () {
    if (!R) throw new Error('لا توجد بيانات');
    const P = R.profile, F = R.financial, J = R.job, Q = R.productivity;
    return { title: 'التقرير الشامل للموظف: ' + P.name, subtitle: [P.job, P.phone].filter(Boolean).join(' · '), period: R.from + ' — ' + R.to,
      kpis: [['الراتب', money(P.wage)], ['الرصيد', v5BalTxt(F.balance, 'cr')], ['سلف قائمة', money(F.advances)], ['المبيعات', money(Q.sales)], ['الطلبات', nf(Q.orders, 0)], ['ساعات مجدولة', nf(J.plannedHours, 1)]],
      sections: [{ title: 'البيانات الوظيفية', table: { headers: ['البيان', 'القيمة'], rows: [['المسمى', P.job || '—'], ['الهاتف', P.phone || '—'], ['تاريخ التعيين', P.startDate || '—'], ['الحالة', P.active ? 'نشط' : 'غير نشط']].concat(P.account ? [['اسم المستخدم', P.account.username], ['الدور', P.account.role], ['الفرع', P.account.branch]] : []) } },
        { title: 'الحساب المالي (ماله وما عليه)', table: { headers: ['التاريخ', 'النوع', 'البيان', 'له', 'عليه', 'الرصيد'], money: [3, 4], rows: F.ledger.map(function (x) { return [x.date, x.typeName, x.note || '', x.side === 'credit' ? x.amount : 0, x.side === 'debit' ? x.amount : 0, v5BalTxt(x.balance, 'cr')]; }) } },
        { title: 'جدول الدوام', table: { headers: ['اليوم', 'الوردية', 'من', 'إلى', 'الساعات'], num: [4], rows: J.schedule.map(function (x) { return [x.day, x.shift, x.start, x.end, x.hours]; }), empty: 'لا يوجد جدول منشور' } },
        { title: 'ورديات الكاشير', table: { headers: ['الفتح', 'الإغلاق', 'الساعات', 'المبيعات', 'الفرق'], money: [3, 4], rows: J.shifts.map(function (x) { return [dt(x.opened), x.closed ? dt(x.closed) : 'مفتوحة', x.hours, x.sales, x.diff]; }) } },
        { title: 'الإنتاجية', table: { headers: ['المؤشر', 'القيمة'], rows: [['الطلبات', nf(Q.orders, 0)], ['المبيعات', money(Q.sales)], ['متوسط الفاتورة', money(Q.avgTicket)], ['الأصناف', nf(Q.items, 0)], ['الخصومات', money(Q.discounts)], ['الإلغاءات', Q.cancels.n + ' · ' + money(Q.cancels.value)], ['المرتجعات', Q.refunds.n + ' · ' + money(Q.refunds.value)], ['التوصيلات', String(Q.deliveries.n)]] } },
        { title: 'التقييمات', table: { headers: ['الشهر', 'النتيجة', 'بواسطة', 'ملاحظات'], rows: R.evaluations.map(function (x) { return [x.month, nf(x.score, 1), x.by, x.notes]; }) } },
        { title: 'سجل النشاط', table: { headers: ['الوقت', 'الإجراء', 'التفاصيل'], rows: R.activity.slice(0, 200).map(function (x) { return [dt(x.at), x.action, x.details]; }) } }], signature: true };
  });
}

// ربط التقرير الشامل بقائمة الموظفين (الموظفون والفروع) وفريق العمل (الإدارة التشغيلية)
document.addEventListener('click', function (e) {
  const b = e.target.closest('[data-v5rep]'); if (!b) return;
  e.preventDefault(); e.stopPropagation();
  if (!hasF('finance')) { bizUpgradeModal('pro'); return; }
  v5EmpReport(b.dataset.v5rep);
}, true);
(function () {
  const addBtns = function () {
    // جدول حسابات الموظفين: أزرار التعديل data-e داخل صفحة الفريق
    const tsub = document.querySelector('#tmSub .biz-subtab.active');
    if (tsub && tsub.dataset.sub === 'staff') document.querySelectorAll('#tmBody .biz-table tbody tr').forEach(function (tr) {
      const ed = tr.querySelector('[data-e]'); if (!ed || tr.querySelector('[data-v5rep]')) return;
      const bt = document.createElement('button'); bt.className = 'ico-btn'; bt.title = 'التقرير الشامل للموظف'; bt.dataset.v5rep = 'staff:' + ed.dataset.e; bt.innerHTML = '<i class="fas fa-id-card"></i>'; ed.before(bt);
    });
    document.querySelectorAll('.ops-row-acts [data-ed]').forEach(function (ed) {
      const box = ed.parentElement; if (box.querySelector('[data-v5rep]') || !(typeof opsEmp === 'function' && opsEmp(ed.dataset.ed))) return;
      const bt = document.createElement('button'); bt.className = 'btn btn-outline btn-sm'; bt.title = 'التقرير الشامل للموظف'; bt.dataset.v5rep = ed.dataset.ed; bt.innerHTML = '<i class="fas fa-id-card"></i>'; box.prepend(bt);
    });
  };
  new MutationObserver(function () { clearTimeout(addBtns._t); addBtns._t = setTimeout(addBtns, 120); }).observe(document.documentElement, { childList: true, subtree: true });
})();

// ============================================================
// دفعات الإنتاج + ملصقات QR (تاريخ الإنتاج والانتهاء)
// ============================================================
function v5Fmt(v) { if (!v) return '—'; const d = new Date(v); if (isNaN(d)) return String(v); const z = function (n) { return (n < 10 ? '0' : '') + n; }; return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) + ' ' + z(d.getHours()) + ':' + z(d.getMinutes()); }
function v5ExpBadge(x) {
  if (x.status === 'cancelled') return '<span class="badge badge-question" title="' + h(x.cancel_reason || '') + '">ملغى</span>';
  if (x.status === 'wasted') return '<span class="badge badge-dog" title="' + h(x.cancel_reason || '') + '">متلف</span>';
  if (!x.expires_at) return '<span class="muted">—</span>';
  const left = (new Date(x.expires_at) - Date.now()) / 36e5;
  if (left < 0) return '<span class="badge badge-dog">منتهي</span>';
  if (left < 12) return '<span class="badge badge-warning">ينتهي خلال ' + nf(left, 0) + ' ساعة</span>';
  return '<span class="badge badge-success">صالح · ' + (left >= 48 ? nf(left / 24, 0) + ' يوم' : nf(left, 0) + ' ساعة') + '</span>';
}
async function productionView(el) {
  const labels = hasF('batch_labels');
  el.innerHTML = '<div class="biz-toolbar"><span class="grow muted">أوامر الإنتاج تصرف مكونات الوصفة من المواد الأولية وتضيف المنتج النهائي للمخزون بتكلفته الفعلية، وتُصدر رقم دفعة مع تاريخ الإنتاج والانتهاء' + (labels ? ' وملصقات QR لكل حصة.' : ' (ملصقات QR متاحة في الباقة المتقدمة).') + '</span><button class="btn btn-primary btn-sm" id="pdNew"><i class="fas fa-plus"></i> أمر إنتاج</button></div><div id="pdList"></div>';
  let rows = [];
  const load = async function () {
    rows = await entList('production');
    el.querySelector('#pdList').innerHTML = bTable([{ label: '#', r: function (x) { return x.number; } }, { label: 'رقم الدفعة', r: function (x) { return x.batch_code ? '<b dir="ltr">' + h(x.batch_code) + '</b>' : '—'; } }, { label: 'المنتج', r: function (x) { return '<b>' + h(x.product_name) + '</b>' + (x.location ? '<div class="muted" style="font-size:.72rem"><i class="fas fa-snowflake"></i> ' + h(x.location) + '</div>' : ''); } },
      { label: 'الكمية', num: true, r: function (x) { return nf(x.qty, 2) + ' <small class="muted">' + h(x.unit || 'قطعة') + '</small>'; } }, { label: 'الإنتاج', r: function (x) { return v5Fmt(x.produced_at || x.created_at); } }, { label: 'الانتهاء', r: function (x) { return x.expires_at ? v5Fmt(x.expires_at) : '—'; } }, { label: 'الصلاحية', r: v5ExpBadge },
      { label: 'المواد المصروفة', r: function (x) { return '<small>' + (x.materials || []).map(function (m) { return h(m.name) + ' ' + nf(m.qty, 3); }).join('، ') + '</small>'; } }, { label: 'التكلفة', num: true, r: function (x) { return money(x.total_cost); } }, { label: 'بواسطة', r: function (x) { return h(x.created_by); } },
      { label: '', r: function (x) { const act = !x.status || x.status === 'done';
        return '<div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center">' + (act ? '<button class="btn btn-outline btn-sm" data-lb="' + h(x.id) + '"' + (labels ? '' : ' disabled title="الباقة المتقدمة"') + '><i class="fas fa-qrcode"></i> ملصقات</button>' +
          '<button class="ico-btn" data-pc="cancel" data-id="' + h(x.id) + '" title="إلغاء الأمر وإرجاع المواد للمخزون"><i class="fas fa-ban"></i></button><button class="ico-btn" data-pc="waste" data-id="' + h(x.id) + '" title="إتلاف المتبقي من الدفعة (تالف / منتهي)"><i class="fas fa-dumpster"></i></button>' :
          '<small class="muted">' + h(x.cancel_reason || '') + (x.cancelled_by ? ' · ' + h(x.cancelled_by) : '') + '</small>') +
          '<button class="ico-btn" data-pc="delete" data-id="' + h(x.id) + '" title="حذف السجل نهائياً"><i class="fas fa-trash"></i></button></div>'; } }], rows, { empty: 'لا توجد أوامر إنتاج', rowClass: function (x) { return x.status && x.status !== 'done' ? 'muted' : ''; } });
  };
  el.querySelector('#pdNew').onclick = async function () {
    const prods = (await entList('products')).filter(function (p) { return p.recipe_name; });
    if (!prods.length) { showToast('اربط منتجاً بوصفة أولاً (من صفحة المنتجات)', true); return; }
    const F = [{ k: 'productId', label: 'المنتج المصنّع', type: 'select', options: prods.map(function (p) { return [p.id, p.name + ' ← ' + p.recipe_name]; }), full: true },
      { k: 'qty', label: 'الكمية المنتجة (عدد الحصص)', type: 'number', req: true, ph: '50' },
      { k: 'shelfHours', label: 'مدة الصلاحية بالساعات', type: 'number', hint: 'تُملأ تلقائياً من بطاقة المنتج — مثلاً 48 = يومان' },
      { k: 'expiresAt', label: 'أو تاريخ ووقت انتهاء محدد', type: 'datetime', hint: 'اختياري — يتقدّم على مدة الصلاحية' },
      { k: 'location', label: 'مكان الحفظ', def: 'البراد المركزي' }, { k: 'storageNote', label: 'طريقة الحفظ', ph: 'مبرد 0-4°م' },
      { k: 'notes', label: 'ملاحظات', full: true }].concat(labels ? [{ k: 'printLabels', label: 'طباعة ملصقات QR بعد التنفيذ', type: 'checkbox', def: true, full: true }] : []);
    bPrompt('أمر إنتاج جديد', F, {}, async function (d) {
      const r = await bzOk('productionCreate', d); const pr = r.production;
      showToast('تم أمر الإنتاج #' + pr.number + ' · الدفعة ' + (pr.batch_code || '') + ' بتكلفة ' + money(pr.total_cost)); await load();
      if (d.printLabels) v5LabelsModal(pr);
    }, { icon: 'industry', saveText: 'تنفيذ', wide: true, onOpen: function (m) {
      const sel = m.$('[data-k=productId]'), sh = m.$('[data-k=shelfHours]'), sn = m.$('[data-k=storageNote]');
      const sync = function () { const p = prods.find(function (x) { return x.id === sel.value; }); if (!p) return; sh.value = p.shelf_life_hours || ''; if (!sn.value) sn.value = p.storage_note || ''; };
      sel.addEventListener('change', sync); sync();
    } });
  };
  el.querySelector('#pdList').addEventListener('click', function (e) {
    const b = e.target.closest('[data-pc]'); if (!b) return;
    const x = rows.find(function (y) { return y.id === b.dataset.id; }); if (!x) return;
    v5ProdCancel(x, b.dataset.pc, load);
  });
  el.querySelector('#pdList').onclick = function (e) { const b = e.target.closest('[data-lb]'); if (!b) return; const x = rows.find(function (y) { return y.id === b.dataset.lb; }); if (x) v5LabelsModal(x); };
  load();
}
function v5LabelPayload(x) {
  return ['FCB:' + (x.batch_code || ('B' + x.number)), x.product_name, 'إنتاج: ' + v5Fmt(x.produced_at || x.created_at), x.expires_at ? 'انتهاء: ' + v5Fmt(x.expires_at) : '', [x.location, x.storage_note].filter(Boolean).join(' · '), (B.acc && B.acc.restaurantName) || ''].filter(Boolean).join('\n');
}
function v5LabelsModal(x) {
  const n = Math.max(1, Math.round(+x.qty || 1));
  bPrompt('ملصقات QR — ' + x.product_name, [{ k: 'count', label: 'عدد الملصقات', type: 'number', def: Math.min(n, 500) }, { k: 'start', label: 'يبدأ الترقيم من', type: 'number', def: 1 },
    { k: 'size', label: 'مقاس الملصق', type: 'select', options: [['50x30', 'ملصق حراري 50×30 مم'], ['60x40', 'ملصق حراري 60×40 مم'], ['a4', 'ورق A4 (24 ملصق في الصفحة)']], def: '60x40' },
    { type: 'html', html: '<div class="biz-card" style="display:flex;gap:14px;align-items:center"><img src="' + qrImg(v5LabelPayload(x), 160) + '" width="110" height="110" style="background:#fff;border-radius:8px;padding:4px"><div style="line-height:1.8;font-size:.84rem"><b>' + h(x.product_name) + '</b><br>الدفعة: <span dir="ltr">' + h(x.batch_code || x.number) + '</span><br>الإنتاج: ' + v5Fmt(x.produced_at || x.created_at) + '<br>الانتهاء: <b>' + v5Fmt(x.expires_at) + '</b><br><small class="muted">مسح الكود في الكاشير يضيف المنتج للفاتورة ويتحقق من الصلاحية تلقائياً</small></div></div>' }], {},
  function (d) { v5PrintLabels(x, Math.max(1, Math.min(1000, +d.count || 1)), +d.start || 1, d.size, n); }, { icon: 'qrcode', saveText: 'طباعة' });
}
function v5PrintLabels(x, count, start, size, total) {
  const w = window.open('', '_blank', 'width=800,height=900'); if (!w) { showToast('اسمح بالنوافذ المنبثقة للطباعة', true); return; }
  const qr = qrImg(v5LabelPayload(x), 300), rest = (B.acc && B.acc.restaurantName) || '';
  const dims = size === '50x30' ? [50, 30] : size === '60x40' ? [60, 40] : [70, 37];
  const one = function (i) {
    return '<div class="lb"><img src="' + qr + '"><div class="tx"><div class="r">' + h(rest) + '</div><div class="p">' + h(x.product_name) + '</div>' +
      '<div>إنتاج: <b dir="ltr">' + v5Fmt(x.produced_at || x.created_at) + '</b></div><div class="e">انتهاء: <b dir="ltr">' + v5Fmt(x.expires_at) + '</b></div>' +
      '<div class="m"><span dir="ltr">' + h(x.batch_code || '') + '</span> · ' + (start + i) + '/' + total + (x.location ? ' · ' + h(x.location) : '') + '</div></div></div>';
  };
  let html = ''; for (let i = 0; i < count; i++) html += one(i);
  const css = '@page{size:' + (size === 'a4' ? 'A4;margin:8mm' : dims[0] + 'mm ' + dims[1] + 'mm;margin:0') + '}*{box-sizing:border-box}body{margin:0;font-family:Tahoma,Arial,sans-serif;direction:rtl;color:#000}' +
    (size === 'a4' ? '.wrap{display:grid;grid-template-columns:repeat(3,' + dims[0] + 'mm);gap:0}' : '') +
    '.lb{width:' + dims[0] + 'mm;height:' + dims[1] + 'mm;display:flex;align-items:center;gap:1.5mm;padding:1.5mm;overflow:hidden;' + (size === 'a4' ? 'border:1px dashed #bbb;' : 'page-break-after:always;') + '}' +
    '.lb img{width:' + (dims[1] - 4) + 'mm;height:' + (dims[1] - 4) + 'mm;flex:none}.tx{flex:1;min-width:0;font-size:' + (dims[1] < 35 ? '6.2' : '7.4') + 'pt;line-height:1.35}.tx .r{font-size:.85em;opacity:.8}.tx .p{font-weight:bold;font-size:1.25em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tx .e b{font-size:1.1em}.tx .m{font-size:.8em;opacity:.85}';
  w.document.write('<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>ملصقات ' + h(x.product_name) + '</title><style>' + css + '</style></head><body><div class="wrap">' + html + '</div><script>window.onload=function(){var im=document.images,n=0,t=im.length;function go(){setTimeout(function(){window.print();},250);}if(!t)return go();for(var i=0;i<t;i++){if(im[i].complete){if(++n===t)go();}else im[i].onload=im[i].onerror=function(){if(++n===t)go();};}};<\/script></body></html>');
  w.document.close();
}
// مسح ملصق الدفعة في الكاشير
function v5ProdCancel(x, mode, done) {
  const T = { cancel: ['إلغاء أمر الإنتاج #' + x.number, 'ban', 'إلغاء الأمر'], waste: ['إتلاف دفعة ' + (x.batch_code || '#' + x.number), 'dumpster', 'تأكيد الإتلاف'], delete: ['حذف أمر الإنتاج #' + x.number, 'trash', 'حذف نهائي'] }[mode];
  const note = mode === 'cancel' ? 'سيتم إرجاع المواد الأولية المصروفة إلى المخزون وخصم ' + nf(x.qty, 2) + ' من «' + x.product_name + '». يتطلب أن تكون كامل الدفعة متوفرة (لم يُبع منها شيء).'
    : mode === 'waste' ? 'لا تعود المواد الأولية. يُخصم المتبقي من الدفعة من المخزون كهدر/تالف (مثلاً: منتهي الصلاحية، تلف في التخزين، خطأ في التحضير).'
    : (!x.status || x.status === 'done' ? 'سيتم إلغاء الأمر وإرجاع المخزون ثم حذف السجل نهائياً. ' : '') + 'لا يمكن التراجع عن الحذف، وتبقى حركات المخزون في السجل.';
  const F = [{ k: 'reason', label: 'السبب', req: mode !== 'delete', full: true, type: 'select', options: mode === 'waste' ? ['انتهاء الصلاحية', 'تلف أثناء التخزين', 'خطأ في التحضير', 'فحص الجودة', 'أخرى'] : ['إدخال خاطئ', 'خطأ في الكمية', 'خطأ في المنتج', 'إلغاء من الإدارة', 'أخرى'] },
    { k: 'other', label: 'تفاصيل إضافية', full: true, ph: 'اختياري' }].concat(mode === 'waste' ? [{ k: 'qty', label: 'الكمية المتلفة', type: 'number', hint: 'اتركها فارغة لإتلاف كل المتبقي من الدفعة' }] : []);
  bPrompt(T[0], F, {}, async function (d) {
    const reason = [d.reason, d.other].filter(Boolean).join(' — ');
    await bzOk('productionCancel', { id: x.id, mode: mode, reason: reason, qty: d.qty });
    showToast(mode === 'cancel' ? 'تم إلغاء أمر الإنتاج وإرجاع المواد' : mode === 'waste' ? 'تم تسجيل الإتلاف' : 'تم حذف أمر الإنتاج');
    done && done();
  }, { icon: T[1], saveText: T[2], sub: note });
}
async function posBatchCode(code) {
  const r = await bz('batchLookup', { code: code });
  if (!r.success) { showToast(r.error || 'دفعة غير معروفة', true); return; }
  const b = r.batch;
  if (b.status && b.status !== 'done') { showToast('الدفعة ' + (b.batch_code || '') + ' ' + (b.status === 'cancelled' ? 'ملغاة' : 'متلفة') + ' ولا يمكن بيعها', true); return; }
  const p = (POS.boot && POS.boot.products || []).find(function (x) { return x.id === b.product_id; });
  if (!p) { showToast('المنتج «' + b.product_name + '» غير متاح في الكاشير', true); return; }
  if (b.expired && !await bConfirm('تنبيه: دفعة «' + b.product_name + '» رقم ' + (b.batch_code || '') + ' منتهية الصلاحية منذ ' + v5Fmt(b.expires_at) + '. هل تريد إضافتها رغم ذلك؟', 'منتج منتهي الصلاحية')) return;
  posAddProduct(p);
  showToast(p.name + (b.expires_at ? ' · صالح حتى ' + v5Fmt(b.expires_at) : ''));
}

// ============================================================
// الامتياز التجاري (الفرنشايز) — الباقة المتقدمة
// ============================================================
const V5_FR_STATUS = { active: ['فعّال', 'badge-success'], frozen: ['مجمّد', 'badge-dog'], ended: ['منتهي', 'badge-question'] };
bizPage('franchise', { group: 'admin', title: 'الامتياز التجاري (الفرنشايز)', icon: 'handshake', feature: 'franchise', ownerOnly: true, plan: 'premium',
  pitch: 'أدر منظومة الامتياز: افتح حساباً مستقلاً لكل ممنوح له (محلي لمدينة أخرى أو خارجي لدولة أخرى) بعقد ورقم وبيانات، مع مينيو وأسعار وQR خاص به أو مرتبط بك، ولوحة مانح لمراقبة المبيعات ودوران المخزون والالتزام بالمعايير وتجميد الحساب عند مخالفة العقد.',
  render: async function (body) {
    body.innerHTML = subTabs('frSub', [['overview', 'لوحة المانح', 'chart-bar'], ['list', 'العقود والحسابات', 'file-contract']], 'overview') + '<div id="frBody"></div>';
    const el = body.querySelector('#frBody');
    bindSubTabs(body, 'frSub', function (k) { k === 'list' ? v5FrList(el) : v5FrOverview(el); });
    v5FrOverview(el);
  } });
function v5FrName(f) { return f.branchName || f.company || f.clientName; }
async function v5FrOverview(el) {
  el.innerHTML = dateRangeBar('frR', daysAgo(29), isoLocal()) + '<div class="biz-toolbar"><span class="grow"></span><button class="btn btn-primary btn-sm" data-fa="new"><i class="fas fa-plus"></i> امتياز جديد</button>' + rptButtons('frRP') + '</div><div id="frOB"></div>';
  let R = null;
  const load = async function (rg) {
    const box = el.querySelector('#frOB'); box.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-pulse"></i></div>';
    const r = await bz('franchiseOverview', rg); if (!r.success) { box.innerHTML = '<div class="empty-state">' + h(r.error) + '</div>'; return; }
    R = r; R.rg = rg;
    const act = r.rows.filter(function (x) { return x.status === 'active'; }).length;
    box.innerHTML = kpis([['الفروع الممنوحة', nf(r.rows.length, 0), act + ' فعّال'], ['مبيعات المنظومة', money(r.total.sales)], ['الطلبات', nf(r.total.orders, 0)], ['الإتاوات المستحقة (تقديري)', money(r.total.royalty), '', '#10b981']]) +
      bTable([{ label: 'الفرع / الممنوح له', r: function (x) { return '<b>' + h(v5FrName(x)) + '</b><div class="muted" style="font-size:.72rem">' + h([x.clientName, x.city, x.country].filter(Boolean).join(' · ')) + ' · ' + (x.type === 'international' ? 'خارجي' : 'محلي') + '</div>'; } },
        { label: 'الحالة', r: function (x) { return stBadge(V5_FR_STATUS, x.status); } }, { label: 'المبيعات', num: true, r: function (x) { return money(x.kpi.sales); } }, { label: 'الطلبات', num: true, r: function (x) { return nf(x.kpi.orders, 0) + (x.kpi.cancelled ? ' <small style="color:#f59e0b">(' + x.kpi.cancelled + ' ملغى)</small>' : ''); } },
        { label: 'متوسط الفاتورة', num: true, r: function (x) { return money(x.kpi.avgTicket); } }, { label: 'تكلفة الطعام', num: true, r: function (x) { return '<span style="color:' + (x.kpi.foodCostPct > 38 ? '#ef4444' : '') + '">' + v5Pct(x.kpi.foodCostPct) + '</span>'; } },
        { label: 'مجمل الربح', num: true, r: function (x) { return money(x.kpi.grossProfit); } }, { label: 'المخزون / الدوران', num: true, r: function (x) { return money(x.kpi.stockValue) + '<div class="muted" style="font-size:.72rem">دوران ' + nf(x.kpi.turnover, 2) + ' · ' + nf(x.kpi.stockDays, 0) + ' يوم</div>'; } },
        { label: 'الالتزام بالمعايير', num: true, r: function (x) { return x.kpi.sopRuns ? '<b style="color:' + (x.kpi.sopScore < 70 ? '#ef4444' : '#10b981') + '">' + nf(x.kpi.sopScore, 0) + '%</b><div class="muted" style="font-size:.72rem">' + x.kpi.sopRuns + ' تدقيق</div>' : '<span class="muted">لا تدقيق</span>'; } },
        { label: 'الإتاوة', num: true, r: function (x) { return money(x.kpi.sales * x.royaltyPct / 100) + ' <small class="muted">' + nf(x.royaltyPct, 1) + '%</small>'; } },
        { label: '', r: function (x) { return '<div class="ops-row-acts"><button class="btn btn-outline btn-sm" data-fv="' + x.id + '"><i class="fas fa-eye"></i> لوحة الفرع</button></div>'; } }], r.rows, { empty: 'لا توجد امتيازات بعد — أضف أول ممنوح له', emptyIcon: 'handshake' });
  };
  const get = bindRange(el, 'frR', load); load(get());
  el.onclick = function (e) { if (e.target.closest('[data-fa=new]')) v5FrForm(null, function () { load(get()); }); const v = e.target.closest('[data-fv]'); if (v) v5FrView(v.dataset.fv, get(), function () { load(get()); }); };
  rptBind(el, 'frRP', function () { if (!R) throw new Error('لا توجد بيانات'); return { title: 'تقرير منظومة الامتياز التجاري', period: R.rg.from + ' — ' + R.rg.to, kpis: [['الفروع', nf(R.rows.length, 0)], ['المبيعات', money(R.total.sales)], ['الإتاوات', money(R.total.royalty)]],
    sections: [{ table: { headers: ['الفرع', 'المدينة', 'الدولة', 'الحالة', 'المبيعات', 'الطلبات', 'تكلفة الطعام %', 'مجمل الربح', 'المخزون', 'الدوران', 'الالتزام %', 'الإتاوة'], money: [4, 7, 8, 11], foot: 'sum',
      rows: R.rows.map(function (x) { return [v5FrName(x), x.city, x.country, (V5_FR_STATUS[x.status] || [x.status])[0], x.kpi.sales, x.kpi.orders, nf(x.kpi.foodCostPct, 1), x.kpi.grossProfit, x.kpi.stockValue, nf(x.kpi.turnover, 2), x.kpi.sopRuns ? nf(x.kpi.sopScore, 0) : '—', x.kpi.sales * x.royaltyPct / 100]; }) } }], signature: true }; });
}
async function v5FrList(el) {
  el.innerHTML = '<div class="biz-toolbar"><span class="grow muted">كل ممنوح له يحصل على حساب منفصل تماماً (بريد ورمز دخول خاص، مينيو وأسعار وQR خاص) — أنت تراقب فقط دون تعديل، ويمكنك تجميد الحساب عند مخالفة العقد.</span><button class="btn btn-primary btn-sm" data-fa="new"><i class="fas fa-plus"></i> امتياز جديد</button></div><div id="frLB"><div class="empty-state"><i class="fas fa-spinner fa-pulse"></i></div></div>';
  const r = await bz('franchiseList', {}); const box = el.querySelector('#frLB');
  if (!r.success) { box.innerHTML = '<div class="empty-state">' + h(r.error) + '</div>'; return; }
  const rows = r.rows;
  const soon = function (d) { if (!d) return ''; const left = (new Date(d) - Date.now()) / 864e5; return left < 0 ? ' <span class="badge badge-dog">منتهي</span>' : left < 45 ? ' <span class="badge badge-warning">' + nf(left, 0) + ' يوم</span>' : ''; };
  box.innerHTML = bTable([{ label: 'العقد', r: function (x) { return '<b dir="ltr">' + h(x.contractNo || '—') + '</b><div class="muted" style="font-size:.72rem">' + h(x.contractStart || '') + ' ← ' + h(x.contractEnd || '') + soon(x.contractEnd) + '</div>'; } },
    { label: 'الممنوح له', r: function (x) { return '<b>' + h(x.clientName) + '</b>' + (x.company ? ' · ' + h(x.company) : '') + '<div class="muted" style="font-size:.72rem" dir="ltr">' + h([x.clientPhone, x.clientEmail].filter(Boolean).join(' · ')) + '</div>'; } },
    { label: 'الموقع', r: function (x) { return h(v5FrName(x)) + '<div class="muted" style="font-size:.72rem">' + h([x.city, x.country].filter(Boolean).join('، ')) + ' · ' + (x.type === 'international' ? 'خارجي' : 'محلي') + '</div>'; } },
    { label: 'الحساب', r: function (x) { return '<span dir="ltr">' + h(x.email) + '</span><div class="muted" style="font-size:.72rem">' + h(x.account ? x.account.planName : '') + ' · ' + (x.menuMode === 'linked' ? 'مينيو مرتبط بالمانح' : 'مينيو وQR مستقل') + (x.account && x.account.lastLogin ? ' · آخر دخول ' + dt(x.account.lastLogin) : '') + '</div>'; } },
    { label: 'الرسوم', num: true, r: function (x) { return money(x.fee) + '<div class="muted" style="font-size:.72rem">إتاوة ' + nf(x.royaltyPct, 1) + '%</div>'; } },
    { label: 'الحالة', r: function (x) { return stBadge(V5_FR_STATUS, x.status) + (x.frozenReason && x.status === 'frozen' ? '<div class="muted" style="font-size:.72rem">' + h(x.frozenReason) + '</div>' : ''); } },
    { label: '', r: function (x) { return '<div class="ops-row-acts"><button class="btn btn-outline btn-sm" data-fv="' + x.id + '" title="لوحة الفرع"><i class="fas fa-eye"></i></button><button class="btn btn-outline btn-sm" data-fe="' + x.id + '" title="تعديل العقد"><i class="fas fa-pen"></i></button>' +
      (x.status === 'frozen' ? '<button class="btn btn-outline btn-sm" data-ff="' + x.id + '" data-on="0" style="color:#10b981"><i class="fas fa-unlock"></i> فك التجميد</button>' : '<button class="btn btn-outline btn-sm" data-ff="' + x.id + '" data-on="1" style="color:#ef4444"><i class="fas fa-snowflake"></i> تجميد</button>') + '</div>'; } }], rows, { empty: 'لا توجد عقود امتياز', emptyIcon: 'file-contract' });
  el.onclick = async function (e) {
    const reload = function () { v5FrList(el); };
    if (e.target.closest('[data-fa=new]')) v5FrForm(null, reload);
    const ed = e.target.closest('[data-fe]'), fv = e.target.closest('[data-fv]'), ff = e.target.closest('[data-ff]');
    if (ed) v5FrForm(rows.find(function (x) { return x.id === ed.dataset.fe; }), reload);
    if (fv) v5FrView(fv.dataset.fv, { from: daysAgo(29), to: isoLocal() }, reload);
    if (ff) v5FrFreeze(rows.find(function (x) { return x.id === ff.dataset.ff; }), ff.dataset.on === '1', reload);
  };
}
function v5FrFreeze(f, freeze, after) {
  if (!f) return;
  if (!freeze) { bConfirm('فك تجميد حساب «' + v5FrName(f) + '» وإعادة تفعيل الدخول له ولموظفيه؟').then(async function (ok) { if (!ok) return; await bzOk('franchiseFreeze', { id: f.id, freeze: false }); showToast('تم فك التجميد'); if (after) after(); }); return; }
  bPrompt('تجميد حساب الممنوح له', [{ type: 'html', html: '<p style="line-height:1.9">سيتم إيقاف دخول «' + h(v5FrName(f)) + '» وجميع موظفيه فوراً وإنهاء الجلسات المفتوحة. تبقى البيانات محفوظة ويمكن فك التجميد لاحقاً.</p>' }, { k: 'reason', label: 'سبب التجميد (بند العقد المخالف)', req: true, full: true, type: 'textarea' }], {}, async function (d) {
    await bzOk('franchiseFreeze', { id: f.id, freeze: true, reason: d.reason }); showToast('تم تجميد الحساب'); if (after) after();
  }, { icon: 'snowflake', saveText: 'تجميد الحساب' });
}
function v5FrForm(f, after) {
  const isNew = !f;
  const F = [{ type: 'section', label: 'نوع الامتياز وبيانات العقد' },
    { k: 'type', label: 'نوع الامتياز', type: 'select', options: [['local', 'محلي — لمدينة أخرى'], ['international', 'خارجي — لدولة أخرى']], def: 'local' },
    { k: 'contractNo', label: 'رقم العقد', req: true, ltr: true }, { k: 'contractStart', label: 'بداية العقد', type: 'date', def: isoLocal() }, { k: 'contractEnd', label: 'نهاية العقد', type: 'date', hint: 'اشتراك الممنوح له ينتهي بانتهاء العقد أو اشتراكك (أيهما أقرب)' },
    { k: 'fee', label: 'رسوم الامتياز', type: 'number', def: 0 }, { k: 'royaltyPct', label: 'نسبة الإتاوة من المبيعات %', type: 'number', def: 0 },
    { type: 'section', label: 'بيانات الممنوح له (العميل)' },
    { k: 'clientName', label: 'اسم الممنوح له', req: true }, { k: 'company', label: 'الشركة / الكيان القانوني' }, { k: 'clientPhone', label: 'الجوال', ltr: true }, { k: 'clientEmail', label: 'البريد للتواصل', ltr: true },
    { k: 'country', label: 'الدولة', req: true }, { k: 'city', label: 'المدينة', req: true }, { k: 'branchName', label: 'اسم الفرع الظاهر للعملاء', ph: ((B.acc && B.acc.restaurantName) || '') + ' — ' }, { k: 'currency', label: 'عملة الفرع', ph: 'ر.س / $ / ₺ / د.إ' },
    { type: 'section', label: 'الحساب المنفصل والصلاحيات' },
    { k: 'menuMode', label: 'المينيو والـ QR', type: 'select', full: true, options: [['own', 'مستقل — الممنوح له يعدّل المينيو والأسعار والصور ويحصل على QR خاص به'], ['linked', 'مرتبط — يعرض مينيو المانح وصوره (الأسعار والطلبات في حسابه)']], def: 'own' }];
  if (isNew) F.push({ k: 'plan', label: 'باقة حساب الممنوح له', type: 'select', options: [['premium', 'المتقدمة'], ['pro', 'الإنطلاقة']], def: 'premium' },
    { k: 'email', label: 'بريد دخول الممنوح له', req: true, ltr: true, hint: 'حساب مستقل تماماً عن حسابك' }, { k: 'password', label: 'كلمة المرور', req: true, ltr: true, def: Math.random().toString(36).slice(2, 10) },
    { type: 'html', html: '<div class="biz-sec">نسخ البيانات من حسابك كبداية</div><div class="biz-form"><label class="biz-check"><input type="checkbox" data-cp="menu" checked> <span>المينيو الإلكتروني والصور</span></label><label class="biz-check"><input type="checkbox" data-cp="costing" checked> <span>المواد والوصفات والتكاليف</span></label><label class="biz-check"><input type="checkbox" data-cp="products" checked> <span>منتجات الكاشير</span></label><label class="biz-check"><input type="checkbox" data-cp="manuals" checked> <span>أدلة التشغيل وإجراءات العمل SOP</span></label></div>' });
  F.push({ k: 'notes', label: 'شروط خاصة / ملاحظات', type: 'textarea', full: true });
  bPrompt(isNew ? 'امتياز تجاري جديد' : 'تعديل عقد الامتياز', F, f || {}, async function (d, m) {
    if (f) d.id = f.id;
    if (isNew) { d.copy = {}; m.$$('[data-cp]').forEach(function (x) { d.copy[x.dataset.cp] = x.checked; }); }
    const r = await bzOk('franchiseSave', { data: d });
    if (isNew) {
      const link = (typeof PUBLIC_APP_URL === 'string' ? PUBLIC_APP_URL : location.origin + '/');
      bModal({ title: 'تم إنشاء حساب الامتياز', icon: 'check-circle', print: false, body: '<p style="line-height:2">تم إنشاء حساب مستقل للممنوح له' + (r.copied ? ' ونسخ البيانات المحددة' : '') + '. أرسل له بيانات الدخول:</p><div class="biz-card" style="line-height:2" dir="ltr">' + h(link) + '<br>Email: <b>' + h(d.email) + '</b><br>Password: <b>' + h(d.password) + '</b></div><p class="muted">يدخل الممنوح له من شاشة الدخول ← «صاحب الحساب»، ويضيف موظفيه وسائقيه من حسابه الخاص.</p>',
        foot: '<button class="btn btn-cancel" data-x>إغلاق</button><button class="btn btn-primary" data-act="cp"><i class="fas fa-copy"></i> نسخ البيانات</button>', actions: { cp: function () { navigator.clipboard.writeText(link + '\nEmail: ' + d.email + '\nPassword: ' + d.password); showToast('تم النسخ'); } } });
    } else showToast('تم حفظ العقد');
    if (after) after();
  }, { icon: 'handshake', wide: true, saveText: isNew ? 'إنشاء الحساب' : 'حفظ' });
}
function v5FrView(id, rg, after) {
  const m = bModal({ title: 'لوحة الفرع الممنوح (عرض فقط)', icon: 'store-alt', xwide: true, print: false,
    body: dateRangeBar('frVR', rg.from, rg.to) + '<div id="frVB"><div class="empty-state"><i class="fas fa-spinner fa-pulse"></i></div></div>',
    foot: '<button class="btn btn-cancel" data-x>إغلاق</button><button class="btn btn-outline" data-act="fz" id="frVF"></button>' + rptButtons('frVP'),
    actions: { fz: function () { if (R) v5FrFreeze(R.franchise, R.franchise.status !== 'frozen', function () { m.close(); if (after) after(); }); } } });
  let R = null;
  const load = async function (q) {
    const box = m.$('#frVB'); box.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-pulse"></i></div>';
    const r = await bz('franchiseView', { id: id, from: q.from, to: q.to }); if (!r.success) { box.innerHTML = '<div class="empty-state">' + h(r.error) + '</div>'; return; }
    R = r; R.q = q; const f = r.franchise, k = r.kpi, s = r.finance && r.finance.summary, P = r.position;
    m.$('#frVF').innerHTML = f.status === 'frozen' ? '<i class="fas fa-unlock"></i> فك التجميد' : '<i class="fas fa-snowflake"></i> تجميد الحساب';
    box.innerHTML = '<div class="biz-card"><b style="font-size:1.05rem">' + h(v5FrName(f)) + '</b> ' + stBadge(V5_FR_STATUS, f.status) + '<div class="muted" style="line-height:1.9">' + h([f.clientName, f.company, f.city, f.country].filter(Boolean).join(' · ')) + ' · عقد <span dir="ltr">' + h(f.contractNo) + '</span> (' + h(f.contractStart || '') + ' ← ' + h(f.contractEnd || '') + ') · ' + (f.menuMode === 'linked' ? 'مينيو مرتبط' : 'مينيو مستقل') + '</div>' + (f.status === 'frozen' && f.frozenReason ? '<div style="color:#ef4444">سبب التجميد: ' + h(f.frozenReason) + '</div>' : '') + '</div>' +
      '<div class="biz-sec"><i class="fas fa-chart-line"></i> المبيعات والأداء</div>' +
      kpis([['المبيعات', money(k.sales), k.invoices + ' فاتورة'], ['متوسط الفاتورة', money(k.avgTicket)], ['الطلبات', nf(k.orders, 0), k.cancelled ? k.cancelled + ' ملغى' : ''], ['تكلفة الطعام', v5Pct(k.foodCostPct), money(k.cogs)], ['مجمل الربح', money(k.grossProfit)], ['المصروفات', money(k.expenses)], ['العملاء', nf(k.customers, 0)], ['الإتاوة المستحقة', money(k.sales * f.royaltyPct / 100), nf(f.royaltyPct, 1) + '%', '#10b981']]) +
      (s ? '<div class="biz-sec"><i class="fas fa-file-invoice-dollar"></i> قائمة الدخل المختصرة</div>' + bTable([{ label: 'البند', r: function (x) { return h(x[0]); } }, { label: 'المبلغ', num: true, r: function (x) { return money(x[1]); } }], [['صافي المبيعات', s.netSales], ['الضريبة', s.tax], ['تكلفة المبيعات', s.cogs], ['مجمل الربح', s.grossProfit], ['المصروفات', s.expenses], ['الهدر', s.waste], ['صافي الربح', s.netProfit]]) : '') +
      (P && P.success ? '<div class="biz-sec"><i class="fas fa-balance-scale"></i> الذمم والأرصدة</div>' + kpis([['ذمم العملاء', money(P.receivables)], ['مستحقات الموردين', money(P.payables)], ['مستحقات الموظفين', money(P.employeesOwed)], ['سلف الموظفين', money(P.employeeAdvances)]]) : '') +
      '<div class="biz-sec"><i class="fas fa-boxes"></i> المخزون ودورانه</div>' + kpis([['قيمة المخزون', money(k.stockValue)], ['معدل الدوران', nf(k.turnover, 2)], ['أيام التغطية', nf(k.stockDays, 0) + ' يوم'], ['أصناف تحت الحد', nf(r.stock.filter(function (x) { return x.low; }).length, 0)]]) +
      bTable([{ label: 'الصنف', r: function (x) { return h(x.name) + (x.low ? ' <span class="badge badge-warning">منخفض</span>' : ''); } }, { label: 'النوع', r: function (x) { return x.type === 'product' ? 'منتج' : 'مادة'; } }, { label: 'الكمية', num: true, r: function (x) { return nf(x.qty, 2); } }, { label: 'الحد الأدنى', num: true, r: function (x) { return x.min ? nf(x.min, 2) : '—'; } }, { label: 'القيمة', num: true, r: function (x) { return money(x.value); } }], r.stock.slice(0, 30), { empty: 'لا يوجد مخزون مسجل' }) +
      '<div class="biz-sec"><i class="fas fa-clipboard-check"></i> الالتزام بمعايير العمل (تدقيقات SOP)</div>' + kpis([['عدد التدقيقات', nf(k.sopRuns, 0)], ['متوسط النتيجة', k.sopRuns ? nf(k.sopScore, 0) + '%' : '—', '', k.sopRuns && k.sopScore < 70 ? '#ef4444' : '']]) +
      bTable([{ label: 'التاريخ', r: function (x) { return h(x.date); } }, { label: 'الإجراء', r: function (x) { return h(x.title); } }, { label: 'النتيجة', num: true, r: function (x) { return nf(x.score, 0) + '%'; } }, { label: 'بواسطة', r: function (x) { return h(x.by); } }], r.sops, { empty: 'لم يُسجّل الفرع أي تدقيق' }) +
      '<div class="biz-sec"><i class="fas fa-book-open"></i> مينيو الفرع (' + r.menu.count + ' صنف)</div>' + bTable([{ label: '', r: function (x) { return x.image ? '<img src="' + h(x.image) + '" style="width:38px;height:38px;object-fit:cover;border-radius:8px">' : ''; } }, { label: 'الصنف', r: function (x) { return h(x.name); } }, { label: 'التصنيف', r: function (x) { return h(x.category || ''); } }, { label: 'السعر', num: true, r: function (x) { return nf(x.price) + ' ' + h(f.currency || ''); } }], r.menu.items.slice(0, 60), { empty: 'المينيو فارغ' });
  };
  const get = bindRange(m.el, 'frVR', load); load(get());
  rptBind(m.el, 'frVP', function () {
    if (!R) throw new Error('لا توجد بيانات'); const f = R.franchise, k = R.kpi, s = R.finance && R.finance.summary;
    return { title: 'تقرير الفرع الممنوح: ' + v5FrName(f), subtitle: [f.city, f.country, 'عقد ' + f.contractNo].filter(Boolean).join(' · '), period: R.q.from + ' — ' + R.q.to,
      kpis: [['المبيعات', money(k.sales)], ['الطلبات', nf(k.orders, 0)], ['تكلفة الطعام', v5Pct(k.foodCostPct)], ['مجمل الربح', money(k.grossProfit)], ['الإتاوة', money(k.sales * f.royaltyPct / 100)], ['الالتزام', k.sopRuns ? nf(k.sopScore, 0) + '%' : '—']],
      sections: [].concat(s ? [{ title: 'قائمة الدخل المختصرة', table: { headers: ['البند', 'المبلغ'], money: [1], rows: [['صافي المبيعات', s.netSales], ['الضريبة', s.tax], ['تكلفة المبيعات', s.cogs], ['مجمل الربح', s.grossProfit], ['المصروفات', s.expenses], ['الهدر', s.waste], ['صافي الربح', s.netProfit]] } }] : [],
        [{ title: 'المخزون', table: { headers: ['الصنف', 'الكمية', 'القيمة'], money: [2], foot: 'sum', rows: R.stock.map(function (x) { return [x.name, nf(x.qty, 2), x.value]; }) } },
          { title: 'تدقيقات المعايير', table: { headers: ['التاريخ', 'الإجراء', 'النتيجة', 'بواسطة'], rows: R.sops.map(function (x) { return [x.date, x.title, nf(x.score, 0) + '%', x.by]; }) } }]), signature: true };
  });
}

// ---------- شريط الممنوح له + اسم صاحب الحساب ----------
function v5AfterAccount() {
  const a = B.acc; if (!a) return;
  const on = document.getElementById('ddOwner'), nn = document.getElementById('ddOwnerName');
  if (on && nn && a.ownerName) { nn.textContent = a.ownerName; on.style.display = ''; }
  let bar = document.getElementById('v5FrBar');
  const fr = a.franchise;
  if (fr && fr.role === 'franchisee') {
    if (!bar) { bar = document.createElement('div'); bar.id = 'v5FrBar'; bar.style.cssText = 'margin:0 0 12px;padding:8px 14px;border-radius:12px;background:rgba(180,133,84,.14);border:1px solid rgba(180,133,84,.35);font-size:.82rem;display:flex;gap:10px;flex-wrap:wrap;align-items:center'; const mc = document.querySelector('.app-main-content'); if (mc) mc.prepend(bar); }
    if (bar) bar.innerHTML = '<i class="fas fa-handshake"></i> <b>فرع امتياز تجاري</b> من «' + h(fr.franchisor) + '» · عقد <span dir="ltr">' + h(fr.contractNo || '') + '</span>' + (fr.contractEnd ? ' · ينتهي ' + h(fr.contractEnd) : '') + ' · ' + (fr.menuMode === 'linked' ? 'المينيو مرتبط بالمانح' : 'المينيو والأسعار خاصة بفرعك') + ' · <span class="muted">المانح يطّلع على المبيعات والكشوف دون صلاحية تعديل</span>';
  } else if (bar) bar.remove();
}
(function () {
  if (typeof loadAccount !== 'function') return;
  const orig = loadAccount;
  window.loadAccount = loadAccount = async function () { const r = await orig.apply(this, arguments); try { v5AfterAccount(); } catch (e) { /* */ } return r; };
})();

// ---------- التقرير الشامل (Word / Excel): أقسام v5.0 ----------
(function () {
  if (typeof bizFullSections !== 'function') return;
  const orig = bizFullSections;
  window.bizFullSections = bizFullSections = async function () {
    const out = await orig.apply(this, arguments); if (!out) return out;
    const g = async function (fn, p) { try { const r = await bz(fn, p || {}, { silentPlan: true }); return r && r.success ? r : null; } catch (e) { return null; } };
    const fin = canP('finance');
    const [pos, emp, cus, sup, fr, prod] = await Promise.all([fin && hasF('finance') ? g('financePosition') : null, hasF('finance') && canP('finance', 'team') ? g('empDirectory') : null,
      fin && hasF('statements') ? g('stmtParties', { type: 'customer' }) : null, fin && hasF('statements') && hasF('purchasing') ? g('stmtParties', { type: 'supplier' }) : null,
      hasF('franchise') && B.acc.isOwner ? g('franchiseOverview', { from: daysAgo(29), to: isoLocal() }) : null, hasF('production') ? g('entityList', { kind: 'production', limit: 300 }) : null]);
    if (pos) out.sections.push({ title: 'المركز المالي المختصر (v5.0)', pb: true, table: { headers: ['البند', 'المبلغ'], money: [1], rows: [['ذمم العملاء المدينة', pos.receivables], ['سلف وأرصدة مدينة على الموظفين', pos.employeesOwe], ['قيمة المخزون', pos.stockValue], ['عُهد الصناديق المفتوحة', pos.openShiftsFloat], ['مستحقات الموردين', pos.payables], ['مستحقات للموظفين', pos.employeesOwed], ['أرصدة دائنة للعملاء', pos.customerCredit]] } });
    if (cus && cus.rows.length) { const L = cus.rows.filter(function (x) { return Math.abs(x.balance) > 0.004; }); if (L.length) out.sections.push({ title: 'أرصدة العملاء (كشوف الحسابات)', table: { headers: ['العميل', 'الجوال', 'الرصيد', 'الحالة'], money: [2], rows: L.map(function (x) { return [x.name, x.sub || '', Math.abs(x.balance), x.balance > 0 ? 'مدين (عليه)' : 'دائن (له)']; }) } }); }
    if (sup && sup.rows.length) { const L = sup.rows.filter(function (x) { return Math.abs(x.balance) > 0.004; }); if (L.length) out.sections.push({ title: 'أرصدة الموردين', table: { headers: ['المورد', 'الجوال', 'المستحق'], money: [2], foot: 'sum', rows: L.map(function (x) { return [x.name, x.sub || '', x.balance]; }) } }); }
    if (emp && emp.employees.length) out.sections.push({ title: 'حسابات الموظفين (السلف والأرصدة)', table: { headers: ['الموظف', 'المسمى', 'الراتب', 'سلف قائمة', 'الرصيد', 'الحالة'], money: [2, 3, 4], rows: emp.employees.map(function (x) { return [x.name, x.job || '', x.wage, x.advances, Math.abs(x.balance), Math.abs(x.balance) < 0.005 ? 'مسدد' : x.balance > 0 ? 'دائن (له)' : 'مدين (عليه)']; }) } });
    const pr = prod && (prod.rows || prod.items || prod.list);
    if (pr && pr.length && pr.some(function (x) { return x.batch_code; })) out.sections.push({ title: 'دفعات الإنتاج والصلاحية', table: { headers: ['الدفعة', 'المنتج', 'الكمية', 'الإنتاج', 'الانتهاء', 'المكان', 'الحالة'], rows: pr.filter(function (x) { return x.batch_code; }).map(function (x) { return [x.batch_code, x.product_name, +x.qty, v5Fmt(x.produced_at || x.created_at), x.expires_at ? v5Fmt(x.expires_at) : '—', x.location || '', x.status === 'cancelled' ? 'ملغى' : x.status === 'wasted' ? 'متلف' : !x.expires_at ? '—' : new Date(x.expires_at) < new Date() ? 'منتهي' : 'صالح']; }) } });
    if (fr && fr.rows.length) out.sections.push({ title: 'منظومة الامتياز التجاري — آخر 30 يوماً', pb: true, table: { headers: ['الفرع', 'المدينة', 'الدولة', 'العقد', 'الحالة', 'المبيعات', 'تكلفة الطعام %', 'الالتزام %', 'الإتاوة'], money: [5, 8], rows: fr.rows.map(function (x) { return [v5FrName(x), x.city, x.country, x.contractNo, (V5_FR_STATUS[x.status] || [x.status])[0], x.kpi.sales, nf(x.kpi.foodCostPct, 1), x.kpi.sopRuns ? nf(x.kpi.sopScore, 0) : '—', x.kpi.sales * x.royaltyPct / 100]; }) } });
    return out;
  };
})();
