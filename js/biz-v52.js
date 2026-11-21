// ============================================================
// biz-v52.js — v5.2.0
// المحاسبة العامة المتكاملة وفق IFRS (الباقة المتقدمة):
// دليل الحسابات، دفتر اليومية، الأستاذ العام، ميزان المراجعة، القيود اليدوية والسندات والأرصدة الافتتاحية، إقفال الفترات
// القوائم المالية IFRS (الدخل، المركز المالي، التدفقات النقدية المباشرة وغير المباشرة، التغيرات في حقوق الملكية، السيولة الشاملة)
// الذمم والتسويات: منصات التوصيل (كشف، أعمار، مطابقة كشف المنصة، تسوية بعد العمولات)، الموردون، العملاء
// ============================================================
var V52_TYPES = { A: 'أصول', L: 'التزامات', E: 'حقوق ملكية', R: 'إيرادات', X: 'مصروفات' };
var V52_SUBS = {};
var V52_SRC = {};
var V52_ACCTS = [];
var V52_PAY = [['cash', 'الصندوق (نقداً)'], ['transfer', 'البنك (تحويل)'], ['card', 'البنك (بطاقة)']];
var V52_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
function v52M(n, neg) { n = +n || 0; return '<span style="' + (n < 0 && neg !== false ? 'color:#ef4444' : '') + '">' + money(n) + '</span>'; }
function v52Age(b) { return b === '60+' ? 'أكثر من 60 يوماً' : b + ' يوم'; }
function v52Dr(n) { return n ? nf(n) : ''; }
function v52Ok(ok, t1, t2) { return '<span class="badge ' + (ok ? 'badge-success' : 'badge-danger') + '"><i class="fas fa-' + (ok ? 'check' : 'times') + '"></i> ' + h(ok ? t1 : (t2 || t1)) + '</span>'; }
function v52FyStart() { const d = isoLocal(); return d.slice(0, 5) + '01-01'; }
function v52MonthStart() { return isoLocal().slice(0, 8) + '01'; }
async function v52LoadMeta() {
  if (V52_ACCTS.length) return;
  const r = await bz('glSettingsGet', {}); if (!r.success) return;
  V52_SUBS = r.subs || {}; V52_SRC = r.sources || {}; V52_ACCTS = r.accounts || [];
}
function v52AcctOpts(filter, first) {
  return (first ? [first] : []).concat(V52_ACCTS.filter(filter || function () { return true; }).map(function (a) { return [a.code, a.code + ' — ' + a.name]; }));
}
// v5.3.0: منتقي حسابات قابل للبحث (برقم الحساب أو اسمه) — يغلّف أي <select> ويحافظ على قيمته وأحداثه
function v52Norm(s) { return String(s || '').toLowerCase().replace(/[أإآا]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[\u064B-\u0652\u0640]/g, '').replace(/\s+/g, ' ').trim(); }
// نص الحقل ليس عقدة نصية فلا يترجمه المترجم التلقائي — نترجمه هنا (العرض فقط؛ البحث يقبل العربية والمترجم)
function v52T(x) { try { return window.fcI18n && fcI18n.t ? fcI18n.t(String(x)) : x; } catch (e) { return x; } }
function v52Combo(sel, o) {
  if (!sel || sel._combo) return; sel._combo = true; o = o || {};
  const wrap = document.createElement('div'); wrap.className = 'acct-combo';
  sel.parentNode.insertBefore(wrap, sel); wrap.appendChild(sel); sel.classList.add('acct-combo-sel');
  const inp = document.createElement('input'); inp.type = 'text'; inp.className = 'acct-combo-in'; inp.autocomplete = 'off'; inp.setAttribute('role', 'combobox');
  inp.placeholder = o.ph || sel.getAttribute('data-ph') || 'ابحث برقم الحساب أو اسمه...'; wrap.insertBefore(inp, sel);
  const ic = document.createElement('i'); ic.className = 'fas fa-search acct-combo-ic'; wrap.appendChild(ic);
  const lab = function () { const op = sel.options[sel.selectedIndex]; return op && (op.value || !/^\s*(—|-|اختر)/.test(op.textContent)) ? v52T(op.textContent) : ''; };
  inp.value = lab(); sel._sync = function () { inp.value = lab(); };
  let list = null, hi = -1, items = [];
  const tName = function (v) { const a = V52_ACCTS.find(function (x) { return x.code === String(v).split(':')[0]; }); return a ? (V52_TYPES[a.type] || '') : ''; };
  const close = function () { if (list) { list.remove(); list = null; } document.removeEventListener('mousedown', outside, true); window.removeEventListener('scroll', place, true); window.removeEventListener('resize', place); };
  const outside = function (e) { if (list && !list.contains(e.target) && e.target !== inp) { close(); inp.value = lab(); } };
  const place = function () {
    if (!list) return; const r = inp.getBoundingClientRect();
    list.style.width = Math.max(r.width, 280) + 'px';
    const w = Math.max(r.width, 280), rtl = (document.documentElement.dir || document.dir || 'rtl') !== 'ltr';
    list.style.left = Math.max(6, Math.min(rtl ? r.right - w : r.left, innerWidth - w - 6)) + 'px';
    const below = innerHeight - r.bottom;
    if (below < 230 && r.top > below) { list.style.top = ''; list.style.bottom = (innerHeight - r.top + 2) + 'px'; } else { list.style.bottom = ''; list.style.top = (r.bottom + 2) + 'px'; }
  };
  const pick = function (v) { sel.value = v; inp.value = lab(); close(); sel.dispatchEvent(new Event('change', { bubbles: true })); sel.dispatchEvent(new Event('input', { bubbles: true })); };
  const paint = function () {
    list.innerHTML = items.length ? items.slice(0, 400).map(function (op, i) {
      const t = tName(op.value);
      return '<div class="acct-combo-it' + (op.value === sel.value ? ' on' : '') + (i === hi ? ' hl' : '') + '" data-i="' + i + '"><span>' + h(op.textContent) + '</span>' + (t ? '<small>' + h(t) + '</small>' : '') + '</div>';
    }).join('') : '<div class="acct-combo-empty">لا يوجد حساب مطابق</div>';
    const el = list.querySelector('.hl'); if (el) el.scrollIntoView({ block: 'nearest' });
  };
  const open = function (all) {
    const q = all ? '' : v52Norm(inp.value);
    items = Array.from(sel.options).filter(function (op) { return !q || v52Norm(op.textContent).indexOf(q) >= 0 || v52Norm(v52T(op.textContent)).indexOf(q) >= 0 || String(op.value).indexOf(q) === 0; });
    hi = Math.max(0, items.findIndex(function (op) { return op.value === sel.value; }));
    if (!list) {
      list = document.createElement('div'); list.className = 'acct-combo-list'; document.body.appendChild(list);
      document.addEventListener('mousedown', outside, true); window.addEventListener('scroll', place, true); window.addEventListener('resize', place);
      list.addEventListener('mousedown', function (e) { const it = e.target.closest('[data-i]'); if (it) { e.preventDefault(); pick(items[+it.dataset.i].value); } });
    }
    paint(); place();
  };
  inp.addEventListener('focus', function () { inp.select(); open(true); });
  inp.addEventListener('input', function () { open(false); });
  inp.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!list) open(true); hi = Math.min(items.length - 1, Math.max(0, hi + (e.key === 'ArrowDown' ? 1 : -1))); paint(); }
    else if (e.key === 'Enter') { if (list && items[hi]) { e.preventDefault(); pick(items[hi].value); } }
    else if (e.key === 'Escape') { close(); inp.value = lab(); }
    else if (e.key === 'Tab') { close(); inp.value = lab(); }
  });
  sel.addEventListener('change', function () { if (!list) inp.value = lab(); });
}
function v52Combos(root, q) { (root || document).querySelectorAll(q || 'select[data-acct]').forEach(function (s) { v52Combo(s); }); }
// طبيعة الحساب: الأصول والمصروفات مدينة، والالتزامات وحقوق الملكية والإيرادات دائنة
function v52Nature(t) { return t === 'A' || t === 'X' ? 'مدين' : 'دائن'; }
function v52Side(n) { n = +n || 0; if (Math.abs(n) < 0.005) return '<span class="muted">0.00</span>'; return nf(Math.abs(n)) + ' <small class="gl-side ' + (n > 0 ? 'dr' : 'cr') + '">' + (n > 0 ? 'مدين' : 'دائن') + '</small>'; }
function v52Jv(seq) { return seq ? 'JV-' + String(seq).padStart(6, '0') : ''; }
async function v52OpenEntry(id, done) {
  const r = await bz('glEntryGet', { id: id }); if (!r.success) { showToast(r.error || 'تعذر فتح القيد', true); return; }
  v52EntryView(r.entry, done);
}
function v52CashOpts() { return V52_PAY.concat(V52_ACCTS.filter(function (a) { return a.custom && a.sub === 'cash'; }).map(function (a) { return [a.code, a.name]; })); }

// ============================================================
// المحاسبة العامة
// ============================================================
bizPage('gl', { group: 'fin', title: 'المحاسبة العامة (IFRS)', icon: 'book', feature: 'gl', perms: ['gl', 'finance'], plan: 'premium',
  pitch: 'نظام محاسبي مزدوج القيد متكامل: كل عملية في المنصة (مبيعات، مرتجعات، مشتريات، مصروفات، رواتب، أصول، رأس مال، منصات توصيل) تُرحَّل آلياً لقيد محاسبي، مع دليل حسابات، دفتر يومية، أستاذ عام، ميزان مراجعة، قيود يدوية وسندات قبض وصرف، أرصدة افتتاحية، مطابقة الحسابات الرقابية، وإقفال الفترات.',
  render: async function (body) {
    await v52LoadMeta();
    body.innerHTML = subTabs('glSub', [['dash', 'لوحة المحاسب', 'tachometer-alt'], ['journal', 'دفتر اليومية والقيود', 'book-open'], ['ledger', 'الأستاذ العام', 'list-alt'], ['tb', 'ميزان المراجعة', 'balance-scale'],
      ['coa', 'دليل الحسابات', 'sitemap'], ['settings', 'الإقفال والإعدادات', 'lock']], 'dash') + '<div id="glBody"></div>';
    const el = body.querySelector('#glBody');
    const go = function (k) { ({ journal: v52Journal, ledger: v52Ledger, tb: v52Tb, coa: v52Coa, settings: v52Settings }[k] || v52Dash)(el); };
    bindSubTabs(body, 'glSub', go); go('dash');
  } });

async function v52Dash(el) {
  el.innerHTML = dateRangeBar('gdR', v52MonthStart(), isoLocal()) + '<div id="gdB"></div>';
  const box = el.querySelector('#gdB');
  const load = async function (rg) {
    v51Spin(box);
    const r = await bz('glDash', rg); if (!r.success) return v51Err(box, r);
    const c = r.checks || {};
    box.innerHTML = kpis([['الإيرادات', money(r.income.revenue)], ['مجمل الربح', money(r.income.gross)], ['ربح التشغيل', money(r.income.opProfit), '', r.income.opProfit >= 0 ? '#10b981' : '#ef4444'],
      ['صافي الربح', money(r.income.profit), 'هامش ' + nf(r.income.netMargin, 1) + '%', r.income.profit >= 0 ? '#10b981' : '#ef4444'], ['النقد وما في حكمه', money(r.cash)],
      ['إجمالي الأصول', money(r.position.assets)], ['إجمالي الالتزامات', money(r.position.liabilities)], ['حقوق الملكية', money(r.position.equity)], ['رأس المال العامل', money(r.position.workingCapital), r.position.currentRatio ? 'نسبة التداول ' + nf(r.position.currentRatio, 2) : '']]) +
      '<div class="biz-card"><div class="biz-toolbar" style="margin:0;flex-wrap:wrap;gap:8px">' + v52Ok(c.balanced, 'المركز المالي متوازن (الأصول = الالتزامات + حقوق الملكية)', 'المركز المالي غير متوازن') + ' ' +
      v52Ok(c.cfReconciled, 'التدفق النقدي المباشر = غير المباشر') + ' ' + v52Ok(c.cashMatches, 'رصيد النقدية مطابق للأستاذ') + ' ' + v52Ok(c.equityMatches, 'حقوق الملكية مطابقة') +
      (r.lockDate ? ' <span class="badge badge-warning"><i class="fas fa-lock"></i> الفترة مقفلة حتى ' + h(r.lockDate) + (r.frozen ? ' — القيود مجمّدة (' + nf(r.frozen.n, 0) + ' قيد)' : '') + '</span>' : '') +
      ' ' + (r.rounding ? v52Ok(!r.rounding.alert, 'فروقات التقريب 6990: ' + nf(r.rounding.total) + ' (ضمن الحد ' + nf(r.rounding.threshold) + ')', 'فروقات التقريب 6990: ' + nf(r.rounding.total) + ' — تتجاوز الحد ' + nf(r.rounding.threshold) + '، راجع القيود أدناه') : '') + '</div></div>' +
      (r.rounding && r.rounding.rows && r.rounding.rows.length ? '<div class="biz-sec">قيود رُحّل فيها فرق توازن إلى حساب 6990 (أكبر من 0.05)</div>' +
        bTable([{ label: 'التاريخ', r: function (x) { return h(x.d); } }, { label: 'المصدر', r: function (x) { return h(r.sources[x.src] || x.src); } }, { label: 'البيان', r: function (x) { return h(x.desc); } },
          { label: 'الفرق', num: true, r: function (x) { return v52M(x.diff); } }, { label: '', r: function (x) { return '<button class="btn btn-outline btn-sm" data-ent="' + h(x.id) + '"><i class="fas fa-eye"></i></button>'; } }], r.rounding.rows) : '') +
      '<div class="biz-sec">مطابقة الحسابات الرقابية مع الدفاتر المساعدة (حتى اليوم)</div>' +
      bTable([{ label: 'الحساب', r: function (x) { return '<b>' + h(x.account) + '</b> ' + h(x.name); } }, { label: 'رصيد الأستاذ العام', num: true, r: function (x) { return money(x.gl); } },
        { label: 'الدفتر المساعد', r: function (x) { return '<span class="wrap">' + h(x.subName) + '</span>'; } }, { label: 'رصيد الدفتر المساعد', num: true, r: function (x) { return money(x.sub); } }, { label: 'الفرق', num: true, r: function (x) { return v52M(x.diff); } },
        { label: 'الحالة', r: function (x) { return x.ok ? v52Ok(true, 'مطابق') : (x.info ? '<span class="badge badge-info">رسوم/فروقات تسوية</span>' : v52Ok(false, 'غير مطابق') + (canP('gl') ? '<br><button class="btn btn-outline btn-sm" style="margin-top:4px" data-fix="' + x.key + '"><i class="fas fa-magic"></i> ترحيل الفرق كرصيد افتتاحي</button>' : '')); } }], r.reconcile || []) +
      '<div class="biz-sec">القيود المرحّلة في الفترة حسب المصدر (' + nf(r.entries, 0) + ' قيد)</div>' +
      bTable([{ label: 'المصدر', r: function (x) { return h(r.sources[x[0]] || x[0]); } }, { label: 'عدد القيود', num: true, r: function (x) { return nf(x[1], 0); } }], Object.keys(r.bySrc).map(function (k) { return [k, r.bySrc[k]]; }).sort(function (a, b) { return b[1] - a[1]; })) +
      v51Hint('القيود تُبنى آلياً من المستندات المصدرية: لا يحتاج المحاسب لإعادة إدخال العمليات. المخزون بنظام الجرد الدوري (IAS 2): تكلفة المبيعات الشهرية = مخزون أول المدة + المشتريات − مخزون آخر المدة، والهدر وفروقات الجرد بحسابات مستقلة. بطاقات الهدايا التزام عقد حتى الاستبدال (IFRS 15). الإهلاك قسط ثابت شهري (IAS 16). مبيعات منصات التوصيل ذمة مدينة على المنصة حتى التسوية.');
    box.querySelectorAll('[data-ent]').forEach(function (b) { b.onclick = function () { v52OpenEntry(b.dataset.ent); }; });
    box.querySelectorAll('[data-fix]').forEach(function (b) {
      b.onclick = async function () { if (!(await bConfirm('سيتم إنشاء قيد أرصدة افتتاحية بالفرق مقابل حساب «أرصدة افتتاحية وتسويات». استخدم ذلك عند وجود أرصدة سابقة قبل بدء استخدام النظام.'))) return; await bzOk('glReconcileFix', { key: b.dataset.fix }); showToast('تم ترحيل الفرق'); load(rg); };
    });
  };
  const get = bindRange(el, 'gdR', load); load(get());
}

// ---------- دفتر اليومية ----------
// v5.3.0: عرضان — «ملخص» (سطر لكل قيد) و«تفصيلي» (كل قيد بأطرافه المدينة والدائنة كما في دفاتر اليومية المحاسبية)
async function v52Journal(el) {
  const srcOpts = [['', 'كل المصادر'], ['manual', 'القيود اليدوية فقط']].concat(Object.keys(V52_SRC).map(function (k) { return [k, V52_SRC[k]]; }));
  const view = localStorage.getItem('v52JView') || 'detail';
  el.innerHTML = dateRangeBar('gjR', v52MonthStart(), isoLocal(), '<label>المصدر ' + v51Sel('gjS', srcOpts) + '</label><label>الحساب <select id="gjA" data-acct>' + v52AcctOpts(null, ['', 'كل الحسابات']).map(function (o) { return '<option value="' + h(o[0]) + '">' + h(o[1]) + '</option>'; }).join('') + '</select></label>') +
    '<div class="biz-toolbar"><input type="search" id="gjQ" placeholder="بحث في البيان أو رقم المستند" style="max-width:240px">' +
    '<div class="gl-seg" id="gjV"><button data-v="detail" class="' + (view === 'detail' ? 'on' : '') + '"><i class="fas fa-list-ol"></i> تفصيلي</button><button data-v="summary" class="' + (view === 'summary' ? 'on' : '') + '"><i class="fas fa-bars"></i> ملخص</button></div>' +
    (canP('gl') ? '<button class="btn btn-primary btn-sm" id="gjNew"><i class="fas fa-plus"></i> قيد يومية</button><button class="btn btn-outline btn-sm" id="gjRc"><i class="fas fa-hand-holding-usd"></i> سند قبض</button><button class="btn btn-outline btn-sm" id="gjPy"><i class="fas fa-money-check-alt"></i> سند صرف</button><button class="btn btn-outline btn-sm" id="gjOp"><i class="fas fa-flag-checkered"></i> أرصدة افتتاحية</button>' : '') +
    '<span class="grow"></span>' + rptButtons('gjRP') + '</div><div id="gjB"></div>';
  v52Combos(el);
  let R = null; const box = el.querySelector('#gjB');
  const get = bindRange(el, 'gjR', function (rg) { load(rg); });
  const cur = function () { return el.querySelector('#gjV .on').dataset.v; };
  const draw = function () {
    const r = R; if (!r) return;
    const head = '<p class="muted" style="margin:6px 2px">' + nf(r.total, 0) + ' قيد في الفترة' + (r.total > r.rows.length ? ' — يُعرض آخر ' + r.rows.length : '') + '</p>';
    if (cur() === 'summary') {
      box.innerHTML = head + bTable([{ label: 'رقم القيد', r: function (e) { return '<b dir="ltr">' + v52Jv(e.seq) + '</b>' + (e.frozen ? ' <i class="fas fa-lock muted" title="مقفل"></i>' : ''); } }, { label: 'التاريخ', r: function (e) { return h(e.d); } }, { label: 'المستند', r: function (e) { return h(e.no || ''); } }, { label: 'المصدر', r: function (e) { return '<span class="badge ' + (e.manual ? 'badge-warning' : 'badge-info') + '">' + h(e.srcName) + '</span>'; } },
        { label: 'البيان', r: function (e) { return h(e.desc); } }, { label: 'المبلغ', num: true, r: function (e) { return money(e.total); } },
        { label: '', r: function (e, i) { return '<button class="btn btn-outline btn-sm" data-v="' + i + '"><i class="fas fa-eye"></i></button>'; } }], r.rows, { empty: 'لا توجد قيود في الفترة' });
    } else {
      if (!r.rows.length) { box.innerHTML = head + bTable([], [], { empty: 'لا توجد قيود في الفترة' }); return; }
      let gd = 0, gc = 0;
      const body = r.rows.map(function (e, i) {
        const td = e.lines.reduce(function (s2, l) { return s2 + l.dr; }, 0), tc = e.lines.reduce(function (s2, l) { return s2 + l.cr; }, 0); gd += td; gc += tc;
        const ls = e.lines.slice().sort(function (a2, b2) { return (b2.dr > 0) - (a2.dr > 0); });
        return '<tbody class="gl-je"><tr class="gl-je-h" data-v="' + i + '"><td colspan="6"><b dir="ltr">' + v52Jv(e.seq) + '</b> · ' + h(e.d) + ' · <span class="badge ' + (e.manual ? 'badge-warning' : 'badge-info') + '">' + h(e.srcName) + '</span>' + (e.no ? ' · مستند #' + h(e.no) : '') + (e.frozen ? ' · <i class="fas fa-lock"></i> مقفل' : '') + ' — ' + h(e.desc) + '</td></tr>' +
          ls.map(function (l) { return '<tr class="gl-je-l"><td dir="ltr" class="gl-code">' + h(l.code) + '</td><td class="' + (l.cr > 0 ? 'gl-cr-name' : '') + '">' + (l.cr > 0 ? 'إلى ح/ ' : 'من ح/ ') + h(l.name) + (l.pn ? ' <small class="muted">— ' + h(l.pn) + '</small>' : '') + '</td><td class="num">' + v52Dr(l.dr) + '</td><td class="num">' + v52Dr(l.cr) + '</td><td colspan="2"></td></tr>'; }).join('') +
          '<tr class="gl-je-t"><td></td><td class="muted">مجموع القيد</td><td class="num"><b>' + nf(td) + '</b></td><td class="num"><b>' + nf(tc) + '</b></td><td colspan="2">' + (Math.abs(td - tc) < 0.005 ? '' : v52Ok(false, 'غير متوازن')) + '</td></tr></tbody>';
      }).join('');
      box.innerHTML = head + '<div class="table-container biz-table gl-jtable"><table><thead><tr><th style="width:90px">رمز الحساب</th><th>الحساب / البيان</th><th class="num" style="width:130px">مدين</th><th class="num" style="width:130px">دائن</th><th colspan="2"></th></tr></thead>' + body +
        '<tfoot><tr><td></td><td><b>إجمالي الفترة المعروضة</b></td><td class="num"><b>' + nf(gd) + '</b></td><td class="num"><b>' + nf(gc) + '</b></td><td colspan="2"></td></tr></tfoot></table></div>';
    }
    box.querySelectorAll('[data-v]').forEach(function (b) { b.onclick = function () { v52EntryView(r.rows[+b.dataset.v], function () { load(); }); }; });
  };
  const load = async function (rg) {
    rg = rg || get(); v51Spin(box);
    const r = await bz('glJournal', Object.assign({ src: el.querySelector('#gjS').value, q: el.querySelector('#gjQ').value, account: el.querySelector('#gjA').value }, rg)); if (!r.success) return v51Err(box, r); R = r; draw();
  };
  el.querySelector('#gjV').onclick = function (e) { const b = e.target.closest('[data-v]'); if (!b) return; el.querySelectorAll('#gjV button').forEach(function (x) { x.classList.toggle('on', x === b); }); localStorage.setItem('v52JView', b.dataset.v); draw(); };
  el.querySelector('#gjS').onchange = function () { load(); };
  el.querySelector('#gjA').onchange = function () { load(); };
  el.querySelector('#gjQ').onkeydown = function (e) { if (e.key === 'Enter') load(); };
  if (canP('gl')) {
    el.querySelector('#gjNew').onclick = function () { v52JournalEdit(null, 'journal', function () { load(); }); };
    el.querySelector('#gjRc').onclick = function () { v52Voucher('receipt', function () { load(); }); };
    el.querySelector('#gjPy').onclick = function () { v52Voucher('payment', function () { load(); }); };
    el.querySelector('#gjOp').onclick = function () { v52JournalEdit(null, 'opening', function () { load(); }); };
  }
  load();
  rptBind(el, 'gjRP', function () {
    if (!R) throw new Error('لا توجد بيانات');
    const rows = []; R.rows.slice().reverse().forEach(function (e) { e.lines.forEach(function (l, i) { rows.push([i ? '' : v52Jv(e.seq), i ? '' : e.d, i ? '' : (e.no || ''), i ? '' : e.desc, l.code + ' ' + l.name + (l.pn ? ' — ' + l.pn : ''), l.dr || '', l.cr || '']); }); });
    return { title: 'دفتر اليومية العامة', period: R.from + ' — ' + R.to, sections: [{ title: 'القيود', table: { headers: ['رقم القيد', 'التاريخ', 'المستند', 'البيان', 'الحساب', 'مدين', 'دائن'], money: [5, 6], foot: 'sum', rows: rows } }], signature: true };
  });
}
// ---------- v5.3.1: الأطراف، إقفال/تسوية الرصيد، القيد العكسي ----------
var V52_PARTIES = null;
async function v52Parties(force) {
  if (V52_PARTIES && !force) return V52_PARTIES;
  const r = await bz('glPartyAll', {}); V52_PARTIES = r && r.success ? r : { rows: [], accts: { ch: '1210', s: '2100', c: '1200', e: '2200' }, kinds: {} };
  return V52_PARTIES;
}
function v52PartyOpts(P, acct) {
  const base = String(acct || '').split(':')[0];
  const rows = P.rows.filter(function (x) { return !base || x.acct === base || !Object.values(P.accts).includes(base); });
  return [['', '— بدون طرف —']].concat(rows.map(function (x) { return [x.pt + '|' + x.pid, x.kind + ': ' + x.name]; }));
}
// نافذة موحّدة: إقفال رصيد حساب أو طرف (منصة/مورد/عميل/موظف) إلى صفر أو تسويته لرصيد محدد، مقابل حساب يختاره المستخدم
async function v52CloseBalance(o, done) {
  o = Object.assign({}, o || {}); await v52LoadMeta(); const P = await v52Parties(true);
  const base = String(o.account || '').split(':')[0];
  o.pid = o.pid || o.partyId || ''; if (o.pid && !o.pt) o.pt = { '1210': 'ch', '2100': 's', '1200': 'c', '2200': 'e' }[base] || 'm';
  if (o.pid && !P.rows.some(function (x) { return x.pt === o.pt && x.pid === o.pid; })) P.rows.push({ pt: o.pt, pid: o.pid, name: o.pn || o.name || o.pid, acct: base, kind: '' });
  const isCh = o.pt === 'ch' || base === '1210';
  const defCounter = base === '1210' ? '6250' : base === '1200' || base === '2100' ? '6990' : base === '2200' ? '6100' : '3900';
  const counters = [['6250', 'فروقات تسوية المنصات (مصروف/إيراد فرق)'], ['1110', 'البنك — المبلغ حُوّل أو دُفع فعلاً'], ['1100', 'الصندوق — المبلغ قُبض أو صُرف نقداً'], ['4950', 'إيرادات أخرى'], ['6400', 'المصروفات التشغيلية'], ['6990', 'فروقات تقريب وتسويات صغيرة'], ['3900', 'أرصدة افتتاحية وتسويات (حقوق ملكية)']];
  const accOpts = v52AcctOpts(null, ['', '— اختر الحساب —']);
  const m = bModal({ title: 'إقفال / تسوية رصيد', icon: 'balance-scale', wide: true, print: false,
    body: '<div class="biz-form">' +
      '<div><label class="pro-label">الحساب</label><div class="pro-input-wrap"><select id="cbA" data-acct>' + accOpts.map(function (x) { return '<option value="' + h(x[0]) + '"' + (x[0] === base ? ' selected' : '') + '>' + h(x[1]) + '</option>'; }).join('') + '</select></div></div>' +
      '<div><label class="pro-label">الطرف (منصة / مورد / عميل / موظف)</label><div class="pro-input-wrap"><select id="cbP" data-acct data-ph="ابحث عن منصة أو مورد أو عميل أو موظف..."></select></div></div>' +
      '<div><label class="pro-label">التاريخ</label><div class="pro-input-wrap"><input type="date" id="cbD" value="' + isoLocal() + '"></div></div>' +
      '<div><label class="pro-label">الرصيد المطلوب بعد القيد</label><div class="pro-input-wrap"><input type="number" step="any" id="cbT" value="0" dir="ltr"></div></div>' +
      '<div class="full"><label class="pro-label">الحساب المقابل (أين يذهب الفرق)</label><div class="pro-input-wrap"><select id="cbC" data-acct>' + counters.concat(accOpts.slice(1).filter(function (x) { return !counters.some(function (c) { return c[0] === x[0]; }); })).map(function (x) { return '<option value="' + h(x[0]) + '"' + (x[0] === (o.counter || defCounter) ? ' selected' : '') + '>' + h(x[0] + ' — ' + x[1].replace(/^\d+\s—\s/, '')) + '</option>'; }).join('') + '</select></div></div>' +
      '<div class="full"><label class="pro-label">السبب (يظهر في بيان القيد وسجل النشاط)</label><div class="pro-input-wrap"><input id="cbR" placeholder="مثال: فرق كشف المنصة لشهر أكتوبر / خطأ إدخال / رصيد قديم لا يُحصّل"></div></div>' +
      '<div class="full" id="cbOW" style="display:none"><label class="biz-check"><input type="checkbox" id="cbO" checked> <span>اعتبار الطلبات غير المسوّاة لهذه المنصة حتى هذا التاريخ مُقفلة (تختفي من «غير مسوّى» والأعمار)</span></label></div>' +
      '</div><div id="cbS" class="gl-close-sum"></div>' +
      v51Hint('القيد يُنشأ كقيد يومية يدوي: يمكنك تعديله أو حذفه أو عكسه لاحقاً من دفتر اليومية إذا كان خاطئاً. لا يُمس أي مستند أصلي (فواتير، مشتريات، تسويات).'),
    foot: '<button class="btn btn-cancel" data-x>إلغاء</button><button class="btn btn-primary" data-act="save"><i class="fas fa-check"></i> ترحيل قيد الإقفال</button>',
    actions: {
      save: async function (mm, btn) {
        const pv = mm.$('#cbP').value.split('|');
        btn.disabled = true;
        try {
          const r = await bzOk('glCloseBalance', { account: mm.$('#cbA').value, pt: pv[0] || '', partyId: pv[1] || '', pn: pv[1] ? (P.rows.find(function (x) { return x.pt === pv[0] && x.pid === pv[1]; }) || {}).name || '' : '',
            target: mm.$('#cbT').value, counter: mm.$('#cbC').value, date: mm.$('#cbD').value, reason: mm.$('#cbR').value, closeOrders: mm.$('#cbOW').style.display !== 'none' && mm.$('#cbO').checked });
          mm.close(); showToast('تم ترحيل قيد الإقفال #' + r.number + ' بمبلغ ' + nf(r.amount) + (r.closedOrders ? ' وإقفال ' + r.closedOrders + ' طلب' : '')); done && done(r);
        } catch (e) { /* أُظهرت الرسالة */ } finally { btn.disabled = false; }
      }
    } });
  const fillP = function () {
    const a = m.$('#cbA').value, sp = m.$('#cbP');
    const ops = v52PartyOpts(P, a); const want = o.pt && o.pid ? o.pt + '|' + o.pid : '';
    sp.innerHTML = ops.map(function (x) { return '<option value="' + h(x[0]) + '"' + (x[0] === want ? ' selected' : '') + '>' + h(x[1]) + '</option>'; }).join('');
    if (sp._sync) sp._sync();
  };
  const sum = async function () {
    const a = m.$('#cbA').value, pv = m.$('#cbP').value.split('|'), box = m.$('#cbS');
    m.$('#cbOW').style.display = pv[0] === 'ch' ? '' : 'none';
    if (!a) { box.innerHTML = ''; return; }
    const r = await bz('glLedger', { account: a, partyId: pv[1] || '', from: m.$('#cbD').value, to: m.$('#cbD').value });
    if (!r.success) { box.innerHTML = ''; return; }
    const cur = r.closing, t = +m.$('#cbT').value || 0, d = cur - t;
    box.innerHTML = '<div class="gl-cs"><span>الرصيد الحالي</span><b>' + v52Side(cur) + '</b></div><div class="gl-cs"><span>الرصيد بعد القيد</span><b>' + v52Side(t) + '</b></div><div class="gl-cs"><span>مبلغ القيد</span><b>' + nf(Math.abs(d)) + '</b></div>' +
      '<div class="gl-cs wide"><span>القيد</span><b>' + (Math.abs(d) < 0.005 ? 'لا حاجة لقيد — الرصيد مطابق' : (d > 0 ? 'من ح/ الحساب المقابل — إلى ح/ ' : 'من ح/ ') + h(r.account.name) + (pv[1] ? ' (' + h((P.rows.find(function (x) { return x.pid === pv[1]; }) || {}).name || '') + ')' : '') + (d > 0 ? '' : ' — إلى ح/ الحساب المقابل')) + '</b></div>';
  };
  fillP(); v52Combos(m.el);
  m.$('#cbA').addEventListener('change', function () { fillP(); sum(); });
  ['#cbP', '#cbD', '#cbT'].forEach(function (q) { m.$(q).addEventListener('change', sum); m.$(q).addEventListener('input', sum); });
  sum();
  return m;
}
// إضافة منصة توصيل جديدة: تُنشأ من «قنوات التوصيل» فيظهر لها حساب مستقل تحت 1210 تلقائياً
function v52GoChannels() {
  if (!B.pages.channels) return showToast('قنوات التوصيل غير متاحة في باقتك', true);
  switchTab('channels'); let n = 0; const t = setInterval(function () { const b = document.getElementById('chNew'); if (b || ++n > 30) { clearInterval(t); if (b) b.click(); } }, 150);
}
// قيد عكسي لأي قيد — يصحّح الخطأ بقيد جديد بتاريخ اليوم دون حذف المستند الأصلي أو المساس بالفترة المقفلة
function v52Reverse(e, done) {
  bPrompt('عكس القيد ' + (e.seq ? v52Jv(e.seq) : ''), [{ k: 'date', label: 'تاريخ القيد العكسي', type: 'date', def: isoLocal() }, { k: 'reason', label: 'سبب العكس', req: true, ph: 'مثال: قيد مكرر / مبلغ خاطئ' },
    { type: 'html', html: v51Hint('يُنشأ قيد يدوي بنفس الحسابات والمبالغ معكوسة (المدين يصبح دائناً) فيصبح أثر القيد الأصلي صفراً. بعدها يمكنك تسجيل القيد الصحيح.') }], {},
    async function (d) { const r = await bzOk('glReverse', { id: e.id, date: d.date, reason: d.reason }); showToast('تم ترحيل القيد العكسي #' + r.number); done && done(); }, { icon: 'undo-alt', saveText: 'ترحيل القيد العكسي' });
}
function v52EntryView(e, done) {
  const tot = e.lines.reduce(function (s, l) { return s + l.dr; }, 0);
  const m = bModal({ title: 'قيد ' + (e.seq ? v52Jv(e.seq) + ' — ' : '') + (e.no ? 'مستند #' + e.no + ' — ' : '') + e.srcName, sub: e.d + ' · ' + e.desc + (e.frozen ? ' · مقفل ومجمّد' : ''), icon: 'book-open', wide: true,
    body: bTable([{ label: 'الحساب', r: function (l) { return '<b>' + h(l.code) + '</b> ' + h(l.name); } }, { label: 'الطرف', r: function (l) { return h(l.pn || ''); } },
      { label: 'مدين', num: true, r: function (l) { return v52Dr(l.dr); } }, { label: 'دائن', num: true, r: function (l) { return v52Dr(l.cr); } }], e.lines, { foot: '<tr><td colspan="2"><b>الإجمالي</b></td><td class="num"><b>' + nf(tot) + '</b></td><td class="num"><b>' + nf(tot) + '</b></td></tr>' }) +
      (e.manual ? v51Hint('قيد يدوي: يمكنك تعديله أو حذفه' + (e.frozen ? ' (الفترة مقفلة — استخدم «عكس القيد» بتاريخ مفتوح)' : '') + '، أو عكسه بقيد جديد.') : v51Hint('قيد آلي مُرحّل من المستند الأصلي — عدّل المستند في قسمه (الكاشير، المشتريات، المصروفات...)، أو صحّح أثره فوراً بزر «عكس القيد» ثم سجّل القيد الصحيح.')),
    foot: '<button class="btn btn-cancel" data-x>إغلاق</button>' + (canP('gl') ? '<button class="btn btn-outline" data-act="rev"><i class="fas fa-undo-alt"></i> عكس القيد</button>' : '') + (e.manual && !e.frozen && canP('gl') ? '<button class="btn btn-danger" data-act="del"><i class="fas fa-trash"></i> حذف</button><button class="btn btn-primary" data-act="edit"><i class="fas fa-pen"></i> تعديل</button>' : ''),
    actions: {
      rev: function (mm) { mm.close(); v52Reverse(e, done); },
      del: async function (mm) { if (!(await bConfirm('حذف القيد اليدوي؟'))) return; await bzOk('glJournalDelete', { id: e.ref }); mm.close(); showToast('تم الحذف'); done && done(); },
      edit: function (mm) { mm.close(); v52JournalEdit(e, e.src, done); }
    } });
  return m;
}
function v52JournalEdit(e, type, done) {
  const lines = e ? e.lines.map(function (l) { return { a: l.a, dr: l.dr, cr: l.cr, pn: l.pn || '', pid: l.pid || '', pt: l.pt || '' }; }) : [{ a: '', dr: '', cr: '' }, { a: '', dr: '', cr: '' }];
  let PP = V52_PARTIES || { rows: [], accts: {} }; if (!V52_PARTIES) v52Parties().then(function (x) { PP = x; read(); draw(); });
  const psel = function (l) {
    const v = l.pid ? (l.pt || 'm') + '|' + l.pid : ''; const ops = v52PartyOpts(PP, l.a);
    if (v && !ops.some(function (o) { return o[0] === v; })) ops.push([v, l.pn || l.pid]);
    return '<select data-l="p" data-acct data-ph="ابحث عن منصة أو مورد أو عميل أو موظف...">' + ops.map(function (o) { return '<option value="' + h(o[0]) + '"' + (o[0] === v ? ' selected' : '') + '>' + h(o[1]) + '</option>'; }).join('') + '</select>';
  };
  const opts = v52AcctOpts(null, ['', '— اختر الحساب —']);
  const sel = function (v) { return '<select data-l="a" data-acct>' + opts.map(function (o) { return '<option value="' + h(o[0]) + '"' + (o[0] === v ? ' selected' : '') + '>' + h(o[1]) + '</option>'; }).join('') + '</select>'; };
  const m = bModal({ title: type === 'opening' ? 'قيد أرصدة افتتاحية' : (e ? 'تعديل ' + (V52_SRC[type] || 'قيد يومية') : 'قيد يومية جديد'), icon: type === 'opening' ? 'flag-checkered' : 'book-open', xwide: true, print: false,
    body: '<div class="biz-form"><div><label class="pro-label">التاريخ</label><div class="pro-input-wrap"><input type="date" id="jeD" value="' + h(e ? e.d : isoLocal()) + '"></div></div>' +
      '<div><label class="pro-label">تصنيف التدفق النقدي</label><div class="pro-input-wrap">' + v51Sel('jeCf', [['', 'تلقائي حسب الحسابات'], ['op', 'تشغيلي'], ['inv', 'استثماري'], ['fin', 'تمويلي']], e ? e.cf : '') + '</div></div>' +
      '<div class="full"><label class="pro-label">البيان</label><div class="pro-input-wrap"><input id="jeT" value="' + h(e ? e.desc : (type === 'opening' ? 'أرصدة افتتاحية عند بدء النظام' : '')) + '"></div></div></div>' +
      '<div class="table-container biz-table"><table><thead><tr><th>الحساب</th><th>الطرف (اختياري)</th><th class="num">مدين</th><th class="num">دائن</th><th></th></tr></thead><tbody id="jeL"></tbody><tfoot><tr><td colspan="2"><b>الإجمالي</b> <span id="jeBal"></span></td><td class="num" id="jeTD"></td><td class="num" id="jeTC"></td><td></td></tr></tfoot></table></div>' +
      '<button class="btn btn-outline btn-sm" data-act="add"><i class="fas fa-plus"></i> سطر</button>' +
      (type === 'opening' ? v51Hint('أدخل أرصدة الحسابات في تاريخ بدء النظام (الصندوق، البنك، المخزون، الأصول، القروض، رأس المال...) — الفرق يُقفل في حساب «3900 أرصدة افتتاحية وتسويات». الأرصدة الافتتاحية لا تظهر كتدفقات نقدية.') : ''),
    foot: '<button class="btn btn-cancel" data-x>إلغاء</button><button class="btn btn-primary" data-act="save"><i class="fas fa-check"></i> ترحيل القيد</button>',
    actions: {
      add: function () { read(); lines.push({ a: '', dr: '', cr: '' }); draw(); },
      rm: function (mm, b) { read(); lines.splice(+b.dataset.i, 1); draw(); },
      save: async function (mm, btn) {
        read();
        const L = lines.filter(function (l) { return l.a && ((+l.dr || 0) > 0 || (+l.cr || 0) > 0); });
        if (type === 'opening') { const d = L.reduce(function (s, l) { return s + (+l.dr || 0) - (+l.cr || 0); }, 0); if (Math.abs(d) > 0.004) L.push({ a: '3900', dr: d < 0 ? -d : 0, cr: d > 0 ? d : 0 }); }
        btn.disabled = true;
        try { await bzOk('glJournalSave', { data: { id: e && e.manual ? e.ref : '', date: mm.$('#jeD').value, desc: mm.$('#jeT').value, cf: mm.$('#jeCf').value, type: type, lines: L.map(function (l) { return { a: l.a, dr: +l.dr || 0, cr: +l.cr || 0, pn: l.pn, pid: l.pid, pt: l.pt }; }) } }); mm.close(); showToast('تم ترحيل القيد'); done && done(); }
        finally { btn.disabled = false; }
      }
    } });
  function read() { m.$$('#jeL tr').forEach(function (tr, i) { const l = lines[i]; l.a = tr.querySelector('[data-l=a]').value; const ps = tr.querySelector('[data-l=p]'); const pv = ps.value ? ps.value.split('|') : ['', '']; const pr = PP.rows.find(function (x) { return x.pt === pv[0] && x.pid === pv[1]; });
    l.pt = pv[0] === 'm' ? '' : pv[0]; l.pid = pv[1] || ''; l.pn = pr ? pr.name : (pv[1] ? (ps.options[ps.selectedIndex] || {}).textContent || '' : ''); l.dr = tr.querySelector('[data-l=dr]').value; l.cr = tr.querySelector('[data-l=cr]').value; }); }
  function tot() {
    read(); const d = lines.reduce(function (s, l) { return s + (+l.dr || 0); }, 0), c = lines.reduce(function (s, l) { return s + (+l.cr || 0); }, 0);
    m.$('#jeTD').textContent = nf(d); m.$('#jeTC').textContent = nf(c);
    m.$('#jeBal').innerHTML = type === 'opening' ? '<span class="muted">الفرق ' + nf(d - c) + ' → 3900</span>' : v52Ok(Math.abs(d - c) < 0.005, 'متوازن', 'غير متوازن: ' + nf(d - c));
  }
  function draw() {
    m.$('#jeL').innerHTML = lines.map(function (l, i) { return '<tr><td>' + sel(l.a) + '</td><td style="min-width:200px">' + psel(l) + '</td><td><input data-l="dr" type="number" step="any" dir="ltr" value="' + h(l.dr || '') + '" style="width:110px"></td><td><input data-l="cr" type="number" step="any" dir="ltr" value="' + h(l.cr || '') + '" style="width:110px"></td><td><button class="btn btn-outline btn-sm" data-act="rm" data-i="' + i + '"><i class="fas fa-times"></i></button></td></tr>'; }).join('');
    m.$$('#jeL input, #jeL select').forEach(function (x) { x.oninput = tot; x.onchange = tot; });
    m.$$('#jeL [data-l=p]').forEach(function (x) { x.onchange = function () { read(); const i = Array.prototype.indexOf.call(m.$$('#jeL [data-l=p]'), x); const l = lines[i]; const ac = l.pt && PP.accts[l.pt]; if (ac && String(l.a || '').split(':')[0] !== ac) { l.a = ac; draw(); } else tot(); }; });
    m.$$('#jeL [data-l=a]').forEach(function (x) { x.onchange = function () { read(); draw(); }; });
    v52Combos(m.el.querySelector('#jeL')); tot();
  }
  draw();
}
// سند قبض / صرف: حساب نقدي مقابل حساب واحد
function v52Voucher(type, done) {
  const rc = type === 'receipt';
  bPrompt(rc ? 'سند قبض' : 'سند صرف', [{ k: 'date', label: 'التاريخ', type: 'date', def: isoLocal() }, { k: 'amount', label: 'المبلغ', type: 'number', req: true },
    { k: 'cash', label: rc ? 'يُقبض في' : 'يُصرف من', type: 'select', options: v52CashOpts() },
    { k: 'acct', label: rc ? 'مقابل (الحساب الدائن)' : 'مقابل (الحساب المدين)', type: 'select', options: v52AcctOpts(function (a) { return a.sub !== 'cash'; }), def: rc ? '4950' : '6400' },
    { k: 'party', label: rc ? 'المستلم منه' : 'المدفوع له' }, { k: 'desc', label: 'البيان', full: true, req: true }], {}, async function (d) {
    const m = { cash: '1100', transfer: '1110', card: '1110' }[d.cash] || d.cash, a = +d.amount || 0;
    if (!(a > 0)) { showToast('المبلغ غير صالح', true); return false; }
    const party = d.party ? { pn: d.party, pid: 'm:' + d.party } : {};
    await bzOk('glJournalSave', { data: { date: d.date, type: type, desc: d.desc + (d.party ? ' — ' + d.party : ''), lines: rc ? [{ a: m, dr: a }, Object.assign({ a: d.acct, cr: a }, party)] : [Object.assign({ a: d.acct, dr: a }, party), { a: m, cr: a }] } });
    showToast('تم ترحيل السند'); done && done();
  }, { icon: rc ? 'hand-holding-usd' : 'money-check-alt', saveText: 'ترحيل', onOpen: function (m) { v52Combo(m.el.querySelector('[data-k=acct]')); } });
}

// ---------- الأستاذ العام ----------
// v5.3.0: كشف حساب احترافي — منتقي حساب بالبحث، رصيد افتتاحي، رقم القيد، الرصيد الجاري بطبيعته (مدين/دائن)، مجاميع، وفتح القيد بالنقر
async function v52Ledger(el, pre) {
  pre = pre || {};
  el.innerHTML = dateRangeBar('glR', pre.from || v52FyStart(), pre.to || isoLocal(), '<label class="gl-wide">الحساب <select id="glA" data-acct>' + v52AcctOpts(null).map(function (o) { return '<option value="' + h(o[0]) + '"' + (o[0] === (pre.account || '1100') ? ' selected' : '') + '>' + h(o[1]) + '</option>'; }).join('') + '</select></label><label>الطرف <select id="glP"><option value="">كل الأطراف</option></select></label>') +
    '<div class="biz-toolbar"><input type="search" id="glQ" placeholder="تصفية الحركات المعروضة (بيان، طرف، رقم)" style="max-width:260px">' + (canP('gl') ? '<button class="btn btn-primary btn-sm" id="glCl"><i class="fas fa-balance-scale"></i> إقفال / تسوية الرصيد</button>' : '') + '<span class="grow"></span>' + rptButtons('glRP') + '</div><div id="glB"></div>';
  if (pre.account) { const sa = el.querySelector('#glA'); if (sa.value !== pre.account) { const o = document.createElement('option'); o.value = pre.account; o.textContent = pre.account + (pre.name ? ' — ' + pre.name : ''); sa.appendChild(o); sa.value = pre.account; } }
  v52Combos(el);
  let R = null; const box = el.querySelector('#glB');
  const parties = async function () {
    const rg = get(); const r = await bz('glParties', Object.assign({ account: el.querySelector('#glA').value }, rg));
    const s2 = el.querySelector('#glP'); s2.innerHTML = '<option value="">كل الأطراف</option>' + ((r.success && r.rows) || []).map(function (x) { return '<option value="' + h(x.pid) + '"' + (x.pid === pre.partyId ? ' selected' : '') + '>' + h(x.name) + ' (' + nf(x.balance) + ')</option>'; }).join('');
  };
  const draw = function () {
    const r = R; const q = v52Norm(el.querySelector('#glQ').value);
    const rows = q ? r.rows.filter(function (x) { return v52Norm(x.desc + ' ' + x.party + ' ' + (x.no || '') + ' ' + v52Jv(x.seq) + ' ' + x.srcName).indexOf(q) >= 0; }) : r.rows;
    const a = r.account || {};
    box.innerHTML = '<div class="gl-acct-head"><div><b dir="ltr">' + h(a.code) + '</b> ' + h(a.name) + (r.partyName ? ' — ' + h(r.partyName) : '') + '</div><div class="muted">' + h(V52_TYPES[a.type] || '') + ' · طبيعته ' + v52Nature(a.type) + ' · ' + h(V52_SUBS[a.sub] || '') + '</div></div>' +
      kpis([['الرصيد الافتتاحي', v52Side(r.opening)], ['مجموع المدين', money(r.dr)], ['مجموع الدائن', money(r.cr)], ['الرصيد الختامي', v52Side(r.closing)]]) +
      '<div class="table-container biz-table dense"><table><thead><tr><th>التاريخ</th><th>رقم القيد</th><th>المصدر / المستند</th><th>البيان</th><th>الطرف</th><th class="num">مدين</th><th class="num">دائن</th><th class="num">الرصيد</th></tr></thead><tbody>' +
      '<tr class="gl-open"><td>' + h(r.from) + '</td><td></td><td></td><td><b>رصيد أول المدة</b></td><td></td><td class="num">' + (r.opening > 0 ? nf(r.opening) : '') + '</td><td class="num">' + (r.opening < 0 ? nf(-r.opening) : '') + '</td><td class="num"><b>' + v52Side(r.opening) + '</b></td></tr>' +
      rows.map(function (x) { return '<tr class="gl-row" data-id="' + h(x.id) + '"><td>' + h(x.d) + '</td><td dir="ltr"><b>' + v52Jv(x.seq) + '</b>' + (x.frozen ? ' <i class="fas fa-lock muted"></i>' : '') + '</td><td>' + h(x.srcName) + (x.no ? ' #' + h(x.no) : '') + '</td><td class="wrap">' + h(x.desc) + '</td><td>' + h(x.party) + '</td><td class="num">' + v52Dr(x.dr) + '</td><td class="num">' + v52Dr(x.cr) + '</td><td class="num">' + v52Side(x.balance) + '</td></tr>'; }).join('') +
      (rows.length ? '' : '<tr><td colspan="8" class="muted" style="text-align:center;padding:18px">لا توجد حركات على الحساب في الفترة</td></tr>') +
      '</tbody><tfoot><tr><td colspan="5"><b>مجموع حركة الفترة</b></td><td class="num"><b>' + nf(r.dr) + '</b></td><td class="num"><b>' + nf(r.cr) + '</b></td><td></td></tr>' +
      '<tr><td colspan="5"><b>الرصيد الختامي</b></td><td class="num"><b>' + (r.closing > 0 ? nf(r.closing) : '') + '</b></td><td class="num"><b>' + (r.closing < 0 ? nf(-r.closing) : '') + '</b></td><td class="num"><b>' + v52Side(r.closing) + '</b></td></tr></tfoot></table></div>' +
      v51Hint('انقر أي حركة لعرض القيد المزدوج كاملاً. الرصيد الموجب مدين والسالب دائن؛ الحسابات المقفلة (قفل) مجمّدة ولا تتأثر بأي تعديل لاحق.');
    box.querySelectorAll('.gl-row').forEach(function (tr) { tr.onclick = function () { v52OpenEntry(tr.dataset.id, function () { load(); }); }; });
  };
  const load = async function (rg) {
    rg = rg || get(); v51Spin(box);
    const r = await bz('glLedger', Object.assign({ account: el.querySelector('#glA').value, partyId: el.querySelector('#glP').value }, rg)); if (!r.success) return v51Err(box, r); R = r; draw();
  };
  const get = bindRange(el, 'glR', function (rg) { load(rg); });
  el.querySelector('#glA').onchange = async function () { pre.partyId = ''; await parties(); load(); };
  el.querySelector('#glP').onchange = function () { load(); };
  el.querySelector('#glQ').oninput = function () { if (R) draw(); };
  const clB = el.querySelector('#glCl'); if (clB) clB.onclick = function () { const sp = el.querySelector('#glP'); const op = sp.options[sp.selectedIndex]; v52CloseBalance({ account: el.querySelector('#glA').value, partyId: sp.value, pn: sp.value && op ? op.textContent.replace(/\s*\([^)]*\)\s*$/, '') : '' }, function () { pre.partyId = sp.value; parties().then(function () { load(); }); }); };
  await parties(); load();
  rptBind(el, 'glRP', function () {
    if (!R) throw new Error('لا توجد بيانات');
    const sd = function (n) { return Math.abs(n) < 0.005 ? '0' : nf(Math.abs(n)) + (n > 0 ? ' مدين' : ' دائن'); };
    return { title: 'كشف حساب الأستاذ العام — ' + R.account.code + ' ' + R.account.name + (R.partyName ? ' — ' + R.partyName : ''), period: R.from + ' — ' + R.to,
      kpis: [['الافتتاحي', sd(R.opening)], ['مدين', money(R.dr)], ['دائن', money(R.cr)], ['الختامي', sd(R.closing)]],
      sections: [{ title: 'الحركات', table: { headers: ['التاريخ', 'رقم القيد', 'المصدر', 'البيان', 'الطرف', 'مدين', 'دائن', 'الرصيد'], money: [5, 6],
        rows: [[R.from, '', '', 'رصيد أول المدة', '', R.opening > 0 ? R.opening : '', R.opening < 0 ? -R.opening : '', sd(R.opening)]].concat(R.rows.map(function (x) { return [x.d, v52Jv(x.seq), x.srcName + (x.no ? ' #' + x.no : ''), x.desc, x.party, x.dr || '', x.cr || '', sd(x.balance)]; }))
          .concat([['', '', '', 'مجموع حركة الفترة', '', R.dr, R.cr, ''], ['', '', '', 'الرصيد الختامي', '', '', '', sd(R.closing)]]) } }], signature: true };
  });
}

// ---------- ميزان المراجعة ----------
// v5.3.0: مجمّع حسب الفئة (أصول، التزامات، حقوق ملكية، إيرادات، مصروفات) بمجاميع فرعية، بحث، ومستوى التفصيل
async function v52Tb(el) {
  el.innerHTML = dateRangeBar('gtR', v52FyStart(), isoLocal(), '<label class="biz-check" style="margin:0"><input type="checkbox" id="gtZ" checked> <span>إخفاء الأرصدة الصفرية</span></label>') +
    '<div class="biz-toolbar"><input type="search" id="gtQ" placeholder="بحث برقم أو اسم الحساب" style="max-width:240px"><div class="gl-seg" id="gtL"><button data-v="sub" class="on">تفصيلي</button><button data-v="acct">الحسابات الرئيسية</button><button data-v="cls">الفئات فقط</button></div><span class="grow"></span>' + rptButtons('gtRP') + '</div><div id="gtB"></div>';
  let R = null; const box = el.querySelector('#gtB');
  const K = ['openDr', 'openCr', 'dr', 'cr', 'closeDr', 'closeCr'];
  const sum = function (rows) { const o = {}; K.forEach(function (k) { o[k] = rows.reduce(function (s2, x) { return s2 + (+x[k] || 0); }, 0); }); return o; };
  const lvl = function () { return el.querySelector('#gtL .on').dataset.v; };
  const rowsOf = function () {
    const q = v52Norm(el.querySelector('#gtQ').value), z = el.querySelector('#gtZ').checked;
    let rows = R.rows.filter(function (x) { return (!z || Math.abs(x.net) > 0.004 || x.dr || x.cr) && (!q || v52Norm((x.parent || x.code) + ' ' + x.key + ' ' + x.name).indexOf(q) >= 0); });
    if (lvl() !== 'sub') { // دمج الحسابات الفرعية في حسابها الرئيسي
      const m = {}; rows.forEach(function (x) { const k = x.parent || x.code; const a = m[k] = m[k] || { key: k, code: k, name: x.parent ? ((V52_ACCTS.find(function (y) { return y.code === k; }) || {}).name || k) : x.name, type: x.type }; K.forEach(function (kk) { a[kk] = (a[kk] || 0) + (+x[kk] || 0); }); });
      rows = Object.values(m).map(function (a) { const n = a.closeDr - a.closeCr; a.closeDr = n > 0 ? n : 0; a.closeCr = n < 0 ? -n : 0; const o = a.openDr - a.openCr; a.openDr = o > 0 ? o : 0; a.openCr = o < 0 ? -o : 0; return a; });
    }
    return rows;
  };
  const draw = function () {
    const rows = rowsOf(), T = R.totals, L = lvl();
    const cell = function (o) { return K.map(function (k) { return '<td class="num">' + v52Dr(o[k]) + '</td>'; }).join(''); };
    let body = '';
    ['A', 'L', 'E', 'R', 'X'].forEach(function (t) {
      const rs = rows.filter(function (x) { return x.type === t; }).sort(function (a, b) { return String(a.key || a.code) < String(b.key || b.code) ? -1 : 1; }); if (!rs.length) return;
      const st = sum(rs);
      if (L !== 'cls') body += '<tr class="gl-cls"><td colspan="8"><i class="fas fa-folder-open"></i> ' + h(V52_TYPES[t]) + ' <small class="muted">(طبيعتها ' + v52Nature(t) + ')</small></td></tr>' +
        rs.map(function (x) { return '<tr data-acct="' + h(x.key || x.code) + '" data-nm="' + h(x.name) + '" class="gl-row' + (x.parent ? ' gl-subacct' : '') + '"><td dir="ltr"><b>' + h(x.parent ? x.parent : x.code) + '</b></td><td>' + (x.parent ? '↳ ' : '') + h(x.name) + '</td>' + cell(x) + '</tr>'; }).join('');
      body += '<tr class="gl-subtot"><td></td><td><b>' + (L === 'cls' ? h(V52_TYPES[t]) : 'إجمالي ' + h(V52_TYPES[t])) + '</b></td>' + K.map(function (k) { return '<td class="num"><b>' + v52Dr(st[k]) + '</b></td>'; }).join('') + '</tr>';
    });
    box.innerHTML = '<div class="biz-toolbar" style="margin:6px 0">' + v52Ok(R.balanced, 'الميزان متوازن', 'الميزان غير متوازن') + ' <span class="muted">بداية السنة المالية: ' + h(R.fyStart) + ' — أرصدة الإيرادات والمصروفات قبلها مُرحّلة للأرباح المبقاة</span></div>' +
      '<div class="table-container biz-table dense gl-tb"><table><thead><tr><th rowspan="2">الرمز</th><th rowspan="2">اسم الحساب</th><th colspan="2" class="c">الرصيد الافتتاحي</th><th colspan="2" class="c">حركة الفترة</th><th colspan="2" class="c">الرصيد الختامي</th></tr><tr><th class="num">مدين</th><th class="num">دائن</th><th class="num">مدين</th><th class="num">دائن</th><th class="num">مدين</th><th class="num">دائن</th></tr></thead><tbody>' +
      (body || '<tr><td colspan="8" class="muted" style="text-align:center;padding:18px">لا توجد أرصدة مطابقة</td></tr>') + '</tbody><tfoot><tr><td></td><td><b>الإجمالي العام</b></td>' + K.map(function (k) { return '<td class="num"><b>' + nf(T[k]) + '</b></td>'; }).join('') + '</tr></tfoot></table></div>' +
      v51Hint('انقر أي حساب لفتح كشفه في الأستاذ العام للفترة نفسها.');
    box.querySelectorAll('[data-acct]').forEach(function (tr) { tr.onclick = function () { const rg = get(); v52Ledger(el, { account: tr.dataset.acct, name: tr.dataset.nm, from: rg.from, to: rg.to }); }; });
  };
  const load = async function (rg) { v51Spin(box); const r = await bz('glTrialBalance', rg); if (!r.success) return v51Err(box, r); R = r; draw(); };
  const get = bindRange(el, 'gtR', load); load(get());
  el.querySelector('#gtZ').onchange = function () { if (R) draw(); };
  el.querySelector('#gtQ').oninput = function () { if (R) draw(); };
  el.querySelector('#gtL').onclick = function (e) { const b = e.target.closest('[data-v]'); if (!b) return; el.querySelectorAll('#gtL button').forEach(function (x) { x.classList.toggle('on', x === b); }); if (R) draw(); };
  rptBind(el, 'gtRP', function () {
    if (!R) throw new Error('لا توجد بيانات');
    const rows = rowsOf(); const out = [];
    ['A', 'L', 'E', 'R', 'X'].forEach(function (t) { const rs = rows.filter(function (x) { return x.type === t; }); if (!rs.length) return; rs.forEach(function (x) { out.push([x.parent || x.code, (x.parent ? '↳ ' : '') + x.name, x.openDr, x.openCr, x.dr, x.cr, x.closeDr, x.closeCr]); }); const st = sum(rs); out.push(['', 'إجمالي ' + V52_TYPES[t], st.openDr, st.openCr, st.dr, st.cr, st.closeDr, st.closeCr]); });
    out.push(['', 'الإجمالي العام', R.totals.openDr, R.totals.openCr, R.totals.dr, R.totals.cr, R.totals.closeDr, R.totals.closeCr]);
    return { title: 'ميزان المراجعة', period: R.from + ' — ' + R.to, kpis: [['إجمالي المدين', money(R.totals.closeDr)], ['إجمالي الدائن', money(R.totals.closeCr)], ['الحالة', R.balanced ? 'متوازن' : 'غير متوازن']],
      sections: [{ title: 'الأرصدة', table: { headers: ['الرمز', 'الحساب', 'افتتاحي مدين', 'افتتاحي دائن', 'حركة مدينة', 'حركة دائنة', 'ختامي مدين', 'ختامي دائن'], money: [2, 3, 4, 5, 6, 7], rows: out } }], signature: true };
  });
}

// ---------- دليل الحسابات ----------
// v5.3.0: شجرة محاسبية: الفئة ← المجموعة (التصنيف في القوائم) ← الحساب ← الحسابات الفرعية، بمجاميع وبحث وطيّ/فتح
async function v52Coa(el) {
  el.innerHTML = '<div class="biz-toolbar">' + (canP('gl') ? '<button class="btn btn-primary btn-sm" id="gcN"><i class="fas fa-plus"></i> حساب جديد</button>' : '') +
    '<input type="search" id="gcQ" placeholder="بحث برقم أو اسم الحساب" style="max-width:240px"><button class="btn btn-outline btn-sm" id="gcX"><i class="fas fa-expand-alt"></i> فتح الكل</button><button class="btn btn-outline btn-sm" id="gcC"><i class="fas fa-compress-alt"></i> طيّ الكل</button>' +
    '<span class="muted">الأرصدة حتى اليوم</span><span class="grow"></span>' + rptButtons('gcRP') + '</div><div id="gcB"></div>';
  let R = null; const box = el.querySelector('#gcB'); const closed = {};
  const draw = function () {
    const r = R, q = v52Norm(el.querySelector('#gcQ').value);
    const match = function (x) { return !q || v52Norm(x.code + ' ' + x.name + ' ' + (r.subs[x.sub] || '')).indexOf(q) >= 0; };
    const bal = function (x) { return +x.balance || 0; };
    const col = function (n) { return '<td class="num">' + (n > 0.004 ? nf(n) : '') + '</td><td class="num">' + (n < -0.004 ? nf(-n) : '') + '</td>'; };
    const act = function (x) {
      let b = '<button class="btn btn-outline btn-sm" data-st="' + h(x.code) + '" title="كشف حساب"><i class="fas fa-file-alt"></i></button>';
      if (canP('gl')) b += ' <button class="btn btn-outline btn-sm" data-cl="' + h(x.code) + '" title="إقفال / تسوية الرصيد"><i class="fas fa-balance-scale"></i></button>';
      if (x.code === '1210' && canP('gl')) b += ' <button class="btn btn-outline btn-sm" data-addch title="إضافة منصة توصيل"><i class="fas fa-plus"></i> منصة</button>';
      if (x.custom && canP('gl')) b += ' <button class="btn btn-outline btn-sm" data-e="' + h(x.id) + '" title="تعديل"><i class="fas fa-pen"></i></button> <button class="btn btn-outline btn-sm" data-d="' + h(x.id) + '" title="حذف"><i class="fas fa-trash"></i></button>';
      return '<td class="gl-act">' + b + '</td>';
    };
    let body = '';
    ['A', 'L', 'E', 'R', 'X'].forEach(function (t) {
      const main = r.rows.filter(function (x) { return x.type === t && !x.parent; });
      const subs = r.rows.filter(function (x) { return x.type === t && x.parent; });
      const vis = main.filter(function (x) { return match(x) || subs.some(function (s2) { return s2.parent === x.code && match(s2); }); });
      if (!vis.length) return;
      const tot = main.reduce(function (s2, x) { return s2 + bal(x); }, 0);
      const kT = 't' + t;
      body += '<tr class="gl-cls gl-tg" data-tg="' + kT + '"><td dir="ltr"><i class="fas fa-' + (closed[kT] && !q ? 'plus' : 'minus') + '-square"></i> ' + t + '</td><td colspan="3"><b>' + h(V52_TYPES[t]) + '</b> <small class="muted">طبيعتها ' + v52Nature(t) + '</small></td>' + col(tot) + '<td></td></tr>';
      if (closed[kT] && !q) return;
      const groups = []; vis.forEach(function (x) { if (groups.indexOf(x.sub) < 0) groups.push(x.sub); });
      groups.forEach(function (g) {
        const gr = vis.filter(function (x) { return x.sub === g; }); const kG = kT + g;
        const gt = gr.reduce(function (s2, x) { return s2 + bal(x); }, 0);
        body += '<tr class="gl-grp gl-tg" data-tg="' + kG + '"><td></td><td colspan="3"><i class="fas fa-' + (closed[kG] && !q ? 'caret-left' : 'caret-down') + '"></i> ' + h(r.subs[g] || g) + ' <small class="muted">(' + gr.length + ')</small></td>' + col(gt) + '<td></td></tr>';
        if (closed[kG] && !q) return;
        gr.forEach(function (x) {
          body += '<tr class="gl-acc"><td dir="ltr"><b>' + h(x.code) + '</b></td><td>' + h(x.name) + (x.custom ? ' <span class="badge">مخصص</span>' : '') + '</td><td>' + v52Nature(x.type) + '</td><td class="muted">' + h(r.subs[x.sub] || x.sub) + '</td>' + col(bal(x)) + act(x) + '</tr>';
          subs.filter(function (s2) { return s2.parent === x.code && (match(s2) || match(x)); }).forEach(function (s2) {
            body += '<tr class="gl-subacct' + (s2.party ? ' gl-party' : '') + '"><td dir="ltr" class="muted">' + h(x.code) + '</td><td>↳ ' + h(s2.name) + (s2.party ? ' <small class="muted">' + h(s2.kind || '') + '</small>' : '') + '</td><td>' + v52Nature(x.type) + '</td><td class="muted">' + (s2.party ? 'حساب طرف' : 'حساب فرعي') + '</td>' + col(bal(s2)) +
              '<td class="gl-act"><button class="btn btn-outline btn-sm" ' + (s2.party ? 'data-sp="' + h(s2.pid) + '" data-pa="' + h(x.code) + '"' : 'data-st="' + h(s2.code) + '"') + ' data-nm="' + h(s2.name) + '" title="كشف حساب"><i class="fas fa-file-alt"></i></button>' +
              (canP('gl') ? ' <button class="btn btn-outline btn-sm" data-cl="' + h(s2.party ? x.code : s2.code) + '"' + (s2.party ? ' data-cp="' + h(s2.pid) + '" data-ct="' + h(s2.pt || '') + '"' : '') + ' data-nm="' + h(s2.name) + '" title="إقفال / تسوية الرصيد"><i class="fas fa-balance-scale"></i></button>' : '') + '</td></tr>';
          });
        });
      });
    });
    box.innerHTML = '<div class="table-container biz-table dense gl-coa"><table><thead><tr><th style="width:110px">رمز الحساب</th><th>اسم الحساب</th><th>الطبيعة</th><th>التصنيف في القوائم المالية</th><th class="num">رصيد مدين</th><th class="num">رصيد دائن</th><th style="width:120px"></th></tr></thead><tbody>' +
      (body || '<tr><td colspan="7" class="muted" style="text-align:center;padding:18px">لا توجد حسابات مطابقة</td></tr>') + '</tbody></table></div>' +
      v51Hint('الحسابات الأساسية ثابتة ومربوطة بالترحيل الآلي. يمكنك إضافة حسابات فرعية (بنوك إضافية، مصروفات مقدمة، قروض طويلة الأجل...) واستخدامها في القيود اليدوية والسندات. الحسابات الفرعية للأطراف والبنود (↳) تُنشأ آلياً: كل منصة توصيل حساب مستقل تحت 1210 (أضف المنصة من «قنوات التوصيل»)، وكل مورد وعميل وموظف حساب مستقل تحت حسابه. زر الميزان ⚖ يُقفل أو يسوّي رصيد أي حساب أو طرف لأي سبب بقيد يمكن تعديله أو عكسه.');
    box.querySelectorAll('[data-tg]').forEach(function (tr) { tr.onclick = function () { closed[tr.dataset.tg] = !closed[tr.dataset.tg]; draw(); }; });
    box.querySelectorAll('[data-st]').forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); v52Ledger(el, { account: b.dataset.st, name: b.dataset.nm || '' }); }; });
    box.querySelectorAll('[data-sp]').forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); v52Ledger(el, { account: b.dataset.pa, partyId: b.dataset.sp }); }; });
    box.querySelectorAll('[data-cl]').forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); v52CloseBalance({ account: b.dataset.cl, partyId: b.dataset.cp || '', pt: b.dataset.ct || '', pn: b.dataset.cp ? b.dataset.nm : '' }, function () { load(); }); }; });
    box.querySelectorAll('[data-addch]').forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); v52GoChannels(); }; });
    box.querySelectorAll('[data-e]').forEach(function (b) { b.onclick = function () { edit(r.rows.find(function (x) { return x.id === b.dataset.e; })); }; });
    box.querySelectorAll('[data-d]').forEach(function (b) { b.onclick = async function () { if (!(await bConfirm('حذف الحساب؟'))) return; await bzOk('glAccountDelete', { id: b.dataset.d }); V52_ACCTS = []; await v52LoadMeta(); load(); }; });
  };
  const load = async function () { v51Spin(box); const r = await bz('glCoa', { from: v52FyStart(), to: isoLocal() }); if (!r.success) return v51Err(box, r); R = r; draw(); };
  const edit = function (a) {
    const subs = Object.keys(V52_SUBS).map(function (k) { return [k, V52_SUBS[k]]; });
    bPrompt(a ? 'تعديل حساب' : 'حساب جديد', [{ k: 'code', label: 'رمز الحساب (4–6 أرقام)', req: true, ltr: true }, { k: 'name', label: 'اسم الحساب', req: true },
      { k: 'type', label: 'النوع', type: 'select', options: Object.keys(V52_TYPES).map(function (k) { return [k, V52_TYPES[k]]; }) }, { k: 'sub', label: 'التصنيف في القوائم المالية', type: 'select', options: subs }],
      a ? { code: a.code, name: a.name, type: a.type, sub: a.sub } : { type: 'A', sub: 'cash' }, async function (d) { await bzOk('glAccountSave', Object.assign({ id: a ? a.id : '' }, d)); V52_ACCTS = []; await v52LoadMeta(); showToast('تم الحفظ'); load(); }, { icon: 'sitemap' });
  };
  if (canP('gl')) el.querySelector('#gcN').onclick = function () { edit(null); };
  el.querySelector('#gcQ').oninput = function () { if (R) draw(); };
  el.querySelector('#gcX').onclick = function () { Object.keys(closed).forEach(function (k) { delete closed[k]; }); if (R) draw(); };
  el.querySelector('#gcC').onclick = function () { ['A', 'L', 'E', 'R', 'X'].forEach(function (t) { closed['t' + t] = true; }); if (R) draw(); };
  load();
  rptBind(el, 'gcRP', function () {
    if (!R) throw new Error('لا توجد بيانات');
    const out = []; ['A', 'L', 'E', 'R', 'X'].forEach(function (t) { R.rows.filter(function (x) { return x.type === t; }).forEach(function (x) { const n = +x.balance || 0; out.push([x.parent ? '↳ ' + x.parent : x.code, x.name, V52_TYPES[x.type] || '', v52Nature(x.type), R.subs[x.sub] || x.sub || '', n > 0 ? n : '', n < 0 ? -n : '']); }); });
    return { title: 'دليل الحسابات', sections: [{ title: 'الحسابات', table: { headers: ['الرمز', 'الحساب', 'الفئة', 'الطبيعة', 'التصنيف', 'رصيد مدين', 'رصيد دائن'], money: [5, 6], rows: out } }] };
  });
}

// ---------- الإقفال والإعدادات ----------
async function v52Settings(el) {
  v51Spin(el);
  const r = await bz('glSettingsGet', {}); if (!r.success) return v51Err(el, r);
  const s = r.settings, cats = r.expenseCategories || [];
  const accOpts = [['', 'تلقائي (المصروفات التشغيلية — حسب البند)']].concat(r.accounts.filter(function (a) { return a.type === 'X'; }).map(function (a) { return [a.code, a.code + ' — ' + a.name]; }));
  el.innerHTML = '<div class="biz-card"><div class="biz-sec" style="margin-top:0">إقفال الفترة المحاسبية وتجميد القيود</div><div class="biz-form">' +
    '<div><label class="pro-label">تاريخ الإقفال (لا تسجيل أو تعديل بتاريخ مساوٍ أو أقدم)</label><div class="pro-input-wrap"><input type="date" id="gsL" value="' + h(s.lockDate || '') + '" max="' + isoLocal() + '"></div></div>' +
    '<div><label class="pro-label">بداية السنة المالية</label><div class="pro-input-wrap">' + v51Sel('gsF', V52_MONTHS.map(function (m, i) { return [String(i + 1), m]; }), String(s.fyStart || 1)) + '</div></div>' +
    '<div><label class="pro-label">الإقفال التلقائي الشهري</label><div class="pro-input-wrap">' + v51Sel('gsAL', [['0', 'معطّل'], ['5', 'بعد 5 أيام من نهاية الشهر'], ['10', 'بعد 10 أيام من نهاية الشهر (موصى به)'], ['15', 'بعد 15 يوماً من نهاية الشهر'], ['30', 'بعد 30 يوماً من نهاية الشهر']], String(s.autoLockDays || 0)) + '</div></div>' +
    '<div><label class="pro-label">حد تنبيه فروقات التقريب (حساب 6990)</label><div class="pro-input-wrap"><input type="number" id="gsRA" step="0.01" min="0.01" value="' + h(s.roundAlert || 1) + '" dir="ltr"></div></div></div>' +
    (s.lockDate ? '<div class="gl-lockst"><i class="fas fa-lock"></i> الفترة مقفلة حتى <b>' + h(s.lockDate) + '</b> — كل القيود حتى هذا التاريخ مجمّدة ولا تتغير بأي تعديل لاحق.</div>' : '<div class="gl-lockst open"><i class="fas fa-lock-open"></i> لا توجد فترة مقفلة — كل القيود تُحسب من المستندات الحالية.</div>') +
        '<div class="biz-toolbar"><button class="btn btn-outline btn-sm" id="gsLM"><i class="fas fa-calendar-check"></i> إقفال حتى نهاية الشهر الماضي</button>' + (B.acc.isOwner ? '<button class="btn btn-outline btn-sm" id="gsU"><i class="fas fa-lock-open"></i> إلغاء الإقفال</button>' : '') + '</div>' +
    v51Hint('بعد الإقفال تُرفض أي عملية بتاريخ داخل الفترة المقفلة: المصروفات، فواتير الشراء، سداد الموردين، حركات الموظفين، رأس المال والأصول، القيود اليدوية وتسويات المنصات. إلغاء الإقفال أو تقديم تاريخه لصاحب الحساب فقط. لا تحتاج قيود إقفال سنوية: الإيرادات والمصروفات قبل بداية السنة المالية تُرحّل تلقائياً للأرباح المبقاة.') +
    v51Hint('تجميد القيود: عند الإقفال تُحفظ نسخة ثابتة من كل قيود الفترة المقفلة (المبيعات، تكلفة المبيعات، المخزون، العمولات، الاشتراكات، الإهلاك...). بعدها لا يغيّر تعديل سعر طبق أو مادة أو نسبة منصة أو ربط بند مصروف أي رقم في الفترة المقفلة، وتبقى التقارير والقوائم المالية لتلك الفترة كما أُقفلت تماماً.') + '</div>' +
    '<div class="biz-card"><div class="biz-sec" style="margin-top:0">ربط بنود المصروفات بالحسابات</div>' +
    (cats.length ? bTable([{ label: 'بند المصروف', r: function (c) { return h(c); } }, { label: 'الحساب في دفتر الأستاذ', r: function (c) { return '<select data-cat="' + h(c) + '" data-acct>' + accOpts.map(function (o) { return '<option value="' + h(o[0]) + '"' + ((s.catMap || {})[c] === o[0] ? ' selected' : '') + '>' + h(o[1]) + '</option>'; }).join('') + '</select>'; } }], cats) : '<p class="muted">لا توجد بنود مصروفات بعد</p>') +
    v51Hint('مثال: اربط بند «فوائد بنكية» بحساب 7100 تكاليف التمويل ليظهر أسفل ربح التشغيل في قائمة الدخل، أو بند «زكاة/ضريبة دخل» بحساب 8100. تغيير الربط يسري على الفترات غير المقفلة فقط.') + '</div>' +
    (canP('gl') ? '<div class="biz-toolbar"><button class="btn btn-primary" id="gsS"><i class="fas fa-check"></i> حفظ الإعدادات</button></div>' : '');
  v52Combos(el);
  const save = async function (lock) {
    const catMap = {}; el.querySelectorAll('[data-cat]').forEach(function (x) { if (x.value) catMap[x.dataset.cat] = x.value; });
    const L = lock !== undefined ? lock : el.querySelector('#gsL').value;
    if (L && L !== (s.lockDate || '') && !(await bConfirm('سيتم إقفال الفترة حتى ' + L + ' وتجميد كل قيودها نهائياً — لن تتأثر بأي تعديل لاحق على الأسعار أو النسب أو الحسابات. متابعة؟'))) return;
    await bzOk('glSettingsSave', { lockDate: L, fyStart: el.querySelector('#gsF').value, catMap: catMap, autoLockDays: el.querySelector('#gsAL').value, roundAlert: el.querySelector('#gsRA').value }); showToast('تم حفظ إعدادات المحاسبة'); v52Settings(el);
  };
  if (canP('gl')) {
    el.querySelector('#gsS').onclick = function () { save(); };
    el.querySelector('#gsLM').onclick = function () { const d = new Date(); d.setDate(0); save(isoLocal(d)); };
    const u = el.querySelector('#gsU'); if (u) u.onclick = async function () { if (!(await bConfirm('إلغاء الإقفال يعيد فتح كل الفترات ويُلغي تجميد القيود (تُعاد حسابها من المستندات الحالية). متابعة؟'))) return; await bzOk('glSettingsSave', { lockDate: '' }); showToast('تم إلغاء الإقفال'); v52Settings(el); };
  }
}

// ============================================================
// القوائم المالية IFRS
// ============================================================
bizPage('ifrs', { group: 'fin', title: 'القوائم المالية (IFRS)', icon: 'file-invoice-dollar', feature: 'gl', perms: ['gl', 'finance'], plan: 'premium',
  pitch: 'قوائم مالية كاملة وفق المعايير الدولية: قائمة الدخل حسب الوظيفة (IAS 1)، قائمة المركز المالي بالمتداول وغير المتداول مع مقارنة، قائمة التدفقات النقدية بالطريقتين المباشرة وغير المباشرة (IAS 7)، قائمة التغيرات في حقوق الملكية، وكشف السيولة الشاملة الذي يجمع الفجوة النقدية والرواتب والتكلفة الفعلية للعمالة والأصول.',
  render: async function (body) {
    await v52LoadMeta();
    body.innerHTML = subTabs('ifSub', [['is', 'قائمة الدخل', 'chart-line'], ['bs', 'المركز المالي', 'balance-scale-right'], ['cf', 'التدفقات النقدية', 'water'], ['eq', 'التغيرات في حقوق الملكية', 'user-tie'], ['liq', 'السيولة الشاملة', 'tint'], ['ccc', 'الفجوة النقدية (CCC)', 'sync-alt']], 'is') +
      '<div id="ifMain">' + dateRangeBar('ifR', v52FyStart(), isoLocal()) + '<div class="biz-toolbar"><span class="grow"></span>' + rptButtons('ifRP') + '</div><div id="ifB"></div></div><div id="ifCcc" hidden></div>';
    const box = body.querySelector('#ifB'); let tab = 'is', S = null, L = null;
    const draw = function () {
      if (tab === 'liq') return v52LiqDraw(box, L);
      if (!S) return;
      ({ is: v52IsDraw, bs: v52BsDraw, cf: v52CfDraw, eq: v52EqDraw }[tab])(box, S);
    };
    const load = async function (rg) {
      v51Spin(box); rg = rg || get();
      if (tab === 'liq') { const r = await bz('glLiquidity', rg); if (!r.success) return v51Err(box, r); L = r; }
      else { const r = await bz('glStatements', rg); if (!r.success) return v51Err(box, r); S = r; }
      draw();
    };
    const get = bindRange(body, 'ifR', load);
    const main = body.querySelector('#ifMain'), ccc = body.querySelector('#ifCcc');
    bindSubTabs(body, 'ifSub', function (k) { main.hidden = k === 'ccc'; ccc.hidden = k !== 'ccc'; if (k === 'ccc') { if (!ccc.dataset.ok) { ccc.dataset.ok = 1; v51Ccc(ccc); } return; } tab = k; if ((k === 'liq' && !L) || (k !== 'liq' && !S)) load(); else draw(); });
    load();
    rptBind(body, 'ifRP', function () {
      if (tab === 'liq') { if (!L) throw new Error('لا توجد بيانات'); return v52LiqReport(L); }
      if (!S) throw new Error('لا توجد بيانات');
      return v52StatementsReport(S, tab);
    });
  } });
function v52Line(name, v, o) { o = o || {}; return [name, v, o.b ? 1 : 0, o.ind || 0]; }
function v52Rows(rows) {
  return '<div class="table-container biz-table"><table><tbody>' + rows.map(function (x) {
    if (x[1] === null) return '<tr><td colspan="2" style="font-weight:800;padding-top:14px">' + h(x[0]) + '</td></tr>';
    return '<tr' + (x[2] ? ' style="font-weight:800;border-top:2px solid var(--border-color, #444)"' : '') + '><td style="padding-inline-start:' + (8 + (x[3] || 0) * 18) + 'px">' + h(x[0]) + '</td><td class="num">' + (x[4] === 'pct' ? nf(x[1], 1) + '%' : v52M(x[1])) + '</td></tr>';
  }).join('') + '</tbody></table></div>';
}
function v52IsRows(i) {
  const d = i.detail, sub = function (arr) { return (arr || []).map(function (x) { return v52Line(x.name, x.amount, { ind: 1 }); }); };
  return [v52Line('الإيرادات', i.revenue, { b: 1 })].concat(sub(d.rev), [v52Line('تكلفة المبيعات', -i.cos)], sub(d.cos).map(function (x) { x[1] = -x[1]; return x; }), [v52Line('مجمل الربح', i.gross, { b: 1 }),
    v52Line('إيرادات أخرى', i.oi)], sub(d.oi), [v52Line('مصروفات البيع والتوزيع (منصات التوصيل)', -i.sell)], sub(d.sell).map(function (x) { x[1] = -x[1]; return x; }),
    [v52Line('المصروفات الإدارية والتشغيلية', -i.admin)], sub(d.admin).map(function (x) { x[1] = -x[1]; return x; }), [v52Line('مصروفات أخرى', -i.oe)], sub(d.oe).map(function (x) { x[1] = -x[1]; return x; }),
    [v52Line('ربح التشغيل', i.opProfit, { b: 1 }), v52Line('تكاليف التمويل', -i.fin), v52Line('الربح قبل الضريبة', i.pbt, { b: 1 }), v52Line('ضريبة الدخل / الزكاة', -i.tax), v52Line('صافي ربح الفترة', i.profit, { b: 1 })]);
}
function v52IsDraw(box, S) {
  const i = S.income;
  box.innerHTML = kpis([['الإيرادات', money(i.revenue)], ['مجمل الربح', money(i.gross), 'هامش ' + nf(i.grossMargin, 1) + '%'], ['ربح التشغيل', money(i.opProfit)], ['صافي الربح', money(i.profit), 'هامش ' + nf(i.netMargin, 1) + '%', i.profit >= 0 ? '#10b981' : '#ef4444']]) +
    '<div class="biz-sec">قائمة الربح أو الخسارة (حسب الوظيفة — IAS 1) للفترة ' + h(S.from) + ' — ' + h(S.to) + '</div>' + v52Rows(v52IsRows(i)) +
    '<div class="biz-sec">إيضاح: المصروفات حسب الطبيعة</div>' + bTable([{ label: 'الحساب', r: function (x) { return '<b>' + h(x.code.split(':')[0]) + '</b> ' + h(x.name); } }, { label: 'المبلغ', num: true, r: function (x) { return money(x.amount); } }], S.nature);
}
function v52PosRows(P, P0) {
  const sec = function (t, k) { const out = [[t, null]]; (P[k] || []).forEach(function (x) { const o = (P0[k] || []).find(function (y) { return y.name === x.name; }); out.push([x.name, x.amount, 0, 1, o ? o.amount : 0]); }); (P0[k] || []).forEach(function (y) { if (!(P[k] || []).some(function (x) { return x.name === y.name; })) out.push([y.name, 0, 0, 1, y.amount]); }); return out; };
  const T = P.totals, T0 = P0.totals;
  return [].concat(sec('الأصول غير المتداولة', 'nca'), [['إجمالي الأصول غير المتداولة', T.nca, 1, 0, T0.nca]], sec('الأصول المتداولة', 'ca'), [['إجمالي الأصول المتداولة', T.ca, 1, 0, T0.ca], ['إجمالي الأصول', T.assets, 1, 0, T0.assets]],
    sec('حقوق الملكية', 'eq'), [['إجمالي حقوق الملكية', T.eq, 1, 0, T0.eq]], sec('الالتزامات غير المتداولة', 'ncl'), [['إجمالي الالتزامات غير المتداولة', T.ncl, 1, 0, T0.ncl]],
    sec('الالتزامات المتداولة', 'cl'), [['إجمالي الالتزامات المتداولة', T.cl, 1, 0, T0.cl], ['إجمالي الالتزامات', T.liabilities, 1, 0, T0.liabilities], ['إجمالي حقوق الملكية والالتزامات', T.le, 1, 0, T0.le]]);
}
function v52BsDraw(box, S) {
  const P = S.position, P0 = S.positionPrev, T = P.totals, rows = v52PosRows(P, P0);
  box.innerHTML = kpis([['إجمالي الأصول', money(T.assets)], ['إجمالي الالتزامات', money(T.liabilities)], ['حقوق الملكية', money(T.equity)], ['رأس المال العامل', money(T.workingCapital), T.currentRatio ? 'نسبة التداول ' + nf(T.currentRatio, 2) : ''], ['التوازن', T.balanced ? 'متوازن' : 'فرق ' + nf(T.diff), '', T.balanced ? '#10b981' : '#ef4444']]) +
    '<div class="biz-sec">قائمة المركز المالي كما في ' + h(S.to) + ' (مقارنة بـ ' + h(S.prevDate) + ')</div>' +
    '<div class="table-container biz-table"><table><thead><tr><th>البند</th><th class="num">' + h(S.to) + '</th><th class="num">' + h(S.prevDate) + '</th></tr></thead><tbody>' + rows.map(function (x) {
      if (x[1] === null) return '<tr><td colspan="3" style="font-weight:800;padding-top:14px">' + h(x[0]) + '</td></tr>';
      return '<tr' + (x[2] ? ' style="font-weight:800"' : '') + '><td style="padding-inline-start:' + (8 + (x[3] || 0) * 18) + 'px">' + h(x[0]) + '</td><td class="num">' + v52M(x[1]) + '</td><td class="num">' + v52M(x[4]) + '</td></tr>';
    }).join('') + '</tbody></table></div>' + v51Hint('أرصدة الأطراف تُصنّف حسب طبيعتها: الرصيد المدين لموظف (سلفة) أصل متداول، والدائن (راتب مستحق) التزام؛ ورصيد المنصة الدائن (رسوم أكثر من المستحق) يظهر كالتزام. ضريبة القيمة المضافة تظهر بالصافي.');
}
function v52CfDraw(box, S) {
  const C = S.cashFlow, sec = function (t, rows, tot) { return [[t, null]].concat(rows.map(function (x) { return [x.name, x.amount, 0, 1]; }), [['صافي التدفق من ' + t, tot, 1]]); };
  box.innerHTML = kpis([['النقدية أول المدة', money(C.opening)], ['التشغيلي', money(C.operating), '', C.operating >= 0 ? '#10b981' : '#ef4444'], ['الاستثماري', money(C.investing)], ['التمويلي', money(C.financing)], ['صافي التغير', money(C.net)], ['النقدية آخر المدة', money(C.closing), v52Ok(C.reconciled, 'مطابقة')]]) +
    '<div class="biz-sec">الطريقة المباشرة (IAS 7)</div>' + v52Rows([].concat(sec('الأنشطة التشغيلية', C.direct.op, C.operating), sec('الأنشطة الاستثمارية', C.direct.inv, C.investing), sec('الأنشطة التمويلية', C.direct.fin, C.financing),
      [['صافي التغير في النقد وما في حكمه', C.net, 1], ['النقد وما في حكمه أول المدة', C.opening], ['النقد وما في حكمه آخر المدة', C.closing, 1]])) +
    '<div class="biz-sec">الطريقة غير المباشرة — مطابقة صافي الربح مع التدفق التشغيلي</div>' + v52Rows([['صافي ربح الفترة', C.indirect.profit, 1]].concat(C.indirect.adjustments.map(function (x) { return [x.name, x.amount, 0, 1]; }), [['صافي التدفق من الأنشطة التشغيلية', C.indirect.operating, 1]])) +
    v51Hint('النقد وما في حكمه = الصندوق + البنك + الحسابات النقدية المخصصة. مبيعات المنصات تظهر كتدفق عند تسوية المنصة وتحويل المستحقات، والمبيعات الآجلة عند التحصيل. الإهلاك وتغير المخزون والذمم بنود غير نقدية في الطريقة غير المباشرة.');
}
function v52EqDraw(box, S) {
  const E = S.equity, o = E.opening, c = E.closing, m = E.movements;
  const cols = ['رأس المال', 'المسحوبات', 'أرصدة افتتاحية', 'الأرباح المبقاة', 'الإجمالي'];
  const row = function (n, a, b2, c2, d, bold) { return '<tr' + (bold ? ' style="font-weight:800"' : '') + '><td>' + h(n) + '</td>' + [a, b2, c2, d, a + b2 + c2 + d].map(function (v) { return '<td class="num">' + v52M(v) + '</td>'; }).join('') + '</tr>'; };
  box.innerHTML = '<div class="biz-sec">قائمة التغيرات في حقوق الملكية للفترة ' + h(S.from) + ' — ' + h(S.to) + '</div><div class="table-container biz-table"><table><thead><tr><th></th>' + cols.map(function (x) { return '<th class="num">' + h(x) + '</th>'; }).join('') + '</tr></thead><tbody>' +
    row('الرصيد أول المدة', o.capital, o.drawings, o.opening, o.retained, 1) + row('إيداعات رأس المال', m.capitalIn, 0, 0, 0) + row('المسحوبات / التوزيعات', 0, m.drawings, 0, 0) + row('أرصدة افتتاحية وتسويات', 0, 0, m.openingAdj, 0) +
    row('صافي ربح الفترة', 0, 0, 0, m.profit) + (Math.abs(m.otherRetained) > 0.004 ? row('تسويات أخرى على الأرباح المبقاة', 0, 0, 0, m.otherRetained) : '') + row('الرصيد آخر المدة', c.capital, c.drawings, c.opening, c.retained, 1) + '</tbody></table></div>' +
    '<div class="biz-toolbar">' + v52Ok(S.checks.equityMatches, 'إجمالي حقوق الملكية مطابق لقائمة المركز المالي') + '</div>';
}
function v52LiqDraw(box, L) {
  if (!L) return;
  const fc = L.forecast;
  box.innerHTML = kpis([['النقد وما في حكمه', money(L.cash), 'الصندوق ' + money(L.box) + ' · البنك ' + money(L.bank)], ['صافي السيولة بعد الالتزامات والفجوة', money(L.netLiquidity), '', L.netLiquidity >= 0 ? '#10b981' : '#ef4444'],
    ['نسبة السيولة السريعة', L.quickRatio === null ? '—' : nf(L.quickRatio, 2)], ['دورة التحويل النقدي CCC', v51Days(L.cycle.ccc), 'رأس مال عامل مطلوب ' + money(L.cycle.workingCapitalNeed)],
    ['الحرق الشهري الصافي', money(L.burnMonthly), L.runwayMonths === null ? 'التدفقات تغطي المصروفات' : 'تكفي النقدية ' + nf(L.runwayMonths, 1) + ' شهر', L.burnMonthly > 0 ? '#f59e0b' : '#10b981'], ['EBITDA للفترة', money(L.ebitda)]]) +
    '<div class="biz-sec">المقبوضات المتوقعة والذمم</div>' + v52Rows([['ذمم منصات التوصيل (غير مسوّاة)', L.receivables.platforms], ['منها مستحق خلال 7 أيام', L.receivables.platformsDue.d7, 0, 1], ['منها مستحق خلال 30 يوماً', L.receivables.platformsDue.d30, 0, 1], ['ذمم العملاء الآجلة', L.receivables.customers], ['متوسط مقبوضات المبيعات اليومية', L.dailyCashSales]]) +
    '<div class="biz-sec">الالتزامات قصيرة الأجل</div>' + v52Rows([['ذمم الموردين', L.payables.suppliers], ['مصروفات مستحقة ودائنو أصول', L.payables.accrued], ['ضريبة القيمة المضافة المستحقة (صافي)', L.payables.vat], ['رواتب ومستحقات الموظفين', L.payables.salaries], ['التزامات بطاقات الهدايا', L.payables.giftCards], ['إجمالي الالتزامات قصيرة الأجل', L.shortLiabilities, 1], ['القروض القائمة', L.payables.loans]]) +
    '<div class="biz-sec">العمالة والتشغيل والأصول</div>' + v52Rows([['التكلفة الفعلية الشهرية للموظفين (TCC)', L.labor.monthlyTcc], ['تكلفة العمالة المسجّلة في الفترة', L.labor.periodGl], ['نسبة العمالة من الإيرادات', L.labor.pctOfSales, 0, 0, 'pct'], ['متوسط المصروفات التشغيلية النقدية شهرياً', L.opexMonthly],
      ['متوسط تكلفة المبيعات اليومية (احتياج الشراء)', L.cycle.dailyCogs], ['أقساط القروض الشهرية', L.loanRepayMonthly], ['المصروف الرأسمالي (شراء أصول) في الفترة', L.assets.capex], ['الإهلاك في الفترة (غير نقدي)', L.assets.depreciation], ['صافي القيمة الدفترية للأصول', L.assets.nbv]]) +
    '<div class="biz-sec">الفجوة النقدية (من دفتر الأستاذ — متوسط أول وآخر المدة)</div>' + bTable([{ label: 'المؤشر', r: function (x) { return x[2] ? '<b>' + h(x[0]) + '</b>' : h(x[0]); } }, { label: 'القيمة', num: true, r: function (x) { return '<b>' + (x[3] ? money(x[1]) : v51Days(x[1])) + '</b>'; } }], [['أيام بقاء المخزون DIO', L.cycle.dio], ['أيام التحصيل DSO (عملاء + منصات)', L.cycle.dso], ['أيام السداد للموردين DPO', L.cycle.dpo], ['دورة التحويل النقدي CCC = DIO + DSO − DPO', L.cycle.ccc, 1], ['رأس المال العامل المطلوب لتغطية الفجوة = متوسط تكلفة المبيعات اليومية × CCC', L.cycle.workingCapitalNeed, 1, 1]]) +
    '<div class="biz-sec">توقع السيولة</div>' + bTable([{ label: 'الأفق', r: function (x) { return x.days + ' يوم'; } }, { label: 'مقبوضات متوقعة', num: true, r: function (x) { return money(x.inflow); } }, { label: 'مدفوعات متوقعة', num: true, r: function (x) { return money(x.outflow); } },
      { label: 'الصافي', num: true, r: function (x) { return v52M(x.net); } }, { label: 'النقدية المتوقعة', num: true, r: function (x) { return '<b>' + v52M(x.cash) + '</b>'; } }], fc) +
    v51Hint('افتراضات التوقع: ' + L.assumptions.map(h).join(' · '));
}
function v52LiqReport(L) {
  return { title: 'كشف السيولة الشاملة', period: L.from + ' — ' + L.to, kpis: [['النقدية', money(L.cash)], ['صافي السيولة', money(L.netLiquidity)], ['CCC', v51Days(L.cycle.ccc)], ['الحرق الشهري', money(L.burnMonthly)]],
    sections: [{ title: 'المقبوضات والذمم', table: { headers: ['البند', 'المبلغ'], money: [1], rows: [['النقد وما في حكمه', L.cash], ['ذمم المنصات', L.receivables.platforms], ['مستحق من المنصات خلال 30 يوماً', L.receivables.platformsDue.d30], ['ذمم العملاء', L.receivables.customers]] } },
      { title: 'الالتزامات', table: { headers: ['البند', 'المبلغ'], money: [1], rows: [['الموردون', L.payables.suppliers], ['مستحقات', L.payables.accrued], ['ضريبة القيمة المضافة', L.payables.vat], ['رواتب مستحقة', L.payables.salaries], ['بطاقات الهدايا', L.payables.giftCards], ['القروض', L.payables.loans]] } },
      { title: 'العمالة والأصول والفجوة النقدية', table: { headers: ['البند', 'القيمة'], rows: [['TCC الشهرية', L.labor.monthlyTcc], ['المصروفات التشغيلية الشهرية', L.opexMonthly], ['DIO', L.cycle.dio], ['DSO', L.cycle.dso], ['DPO', L.cycle.dpo], ['CCC', L.cycle.ccc], ['رأس المال العامل المطلوب', L.cycle.workingCapitalNeed], ['المصروف الرأسمالي', L.assets.capex], ['الإهلاك', L.assets.depreciation]] } },
      { title: 'توقع السيولة', table: { headers: ['الأفق (يوم)', 'مقبوضات', 'مدفوعات', 'الصافي', 'النقدية المتوقعة'], money: [1, 2, 3, 4], rows: L.forecast.map(function (x) { return [x.days, x.inflow, x.outflow, x.net, x.cash]; }) } }], signature: true };
}
function v52StatementsReport(S, tab) {
  const t = function (rows) { return rows.filter(function (x) { return x[1] !== null; }).map(function (x) { return [x[0], x[1]]; }); };
  const P = S.position, C = S.cashFlow, E = S.equity;
  const secs = {
    is: { title: 'قائمة الربح أو الخسارة', table: { headers: ['البند', 'المبلغ'], money: [1], rows: t(v52IsRows(S.income)) } },
    bs: { title: 'قائمة المركز المالي كما في ' + S.to, table: { headers: ['البند', S.to, S.prevDate], money: [1, 2], rows: v52PosRows(P, S.positionPrev).map(function (x) { return x[1] === null ? [x[0], '', ''] : [x[0], x[1], x[4]]; }) } },
    cf: { title: 'قائمة التدفقات النقدية', table: { headers: ['البند', 'المبلغ'], money: [1], rows: [['أول المدة', C.opening]].concat(C.direct.op.map(function (x) { return [x.name, x.amount]; }), [['صافي التشغيلي', C.operating]], C.direct.inv.map(function (x) { return [x.name, x.amount]; }), [['صافي الاستثماري', C.investing]], C.direct.fin.map(function (x) { return [x.name, x.amount]; }), [['صافي التمويلي', C.financing], ['آخر المدة', C.closing]]) } },
    cfi: { title: 'التدفق التشغيلي — الطريقة غير المباشرة', table: { headers: ['البند', 'المبلغ'], money: [1], rows: [['صافي الربح', C.indirect.profit]].concat(C.indirect.adjustments.map(function (x) { return [x.name, x.amount]; }), [['صافي التشغيلي', C.indirect.operating]]) } },
    eq: { title: 'قائمة التغيرات في حقوق الملكية', table: { headers: ['البند', 'رأس المال', 'المسحوبات', 'افتتاحية', 'الأرباح المبقاة'], money: [1, 2, 3, 4], rows: [['أول المدة', E.opening.capital, E.opening.drawings, E.opening.opening, E.opening.retained], ['الحركة', E.movements.capitalIn, E.movements.drawings, E.movements.openingAdj, E.movements.profit + E.movements.otherRetained], ['آخر المدة', E.closing.capital, E.closing.drawings, E.closing.opening, E.closing.retained]] } }
  };
  const all = [secs.is, Object.assign({ pb: true }, secs.bs), Object.assign({ pb: true }, secs.cf), secs.cfi, Object.assign({ pb: true }, secs.eq)];
  const one = { is: [secs.is], bs: [secs.bs], cf: [secs.cf, secs.cfi], eq: [secs.eq] }[tab];
  return { title: 'القوائم المالية وفق المعايير الدولية (IFRS)', period: S.from + ' — ' + S.to, kpis: [['الإيرادات', money(S.income.revenue)], ['صافي الربح', money(S.income.profit)], ['إجمالي الأصول', money(P.totals.assets)], ['حقوق الملكية', money(P.totals.equity)]],
    sections: one || all, signature: true };
}

// ============================================================
// الذمم والتسويات (منصات التوصيل، الموردون، العملاء)
// ============================================================
bizPage('payables', { group: 'fin', title: 'الذمم والتسويات', icon: 'handshake', feature: 'gl', perms: ['gl', 'finance'], plan: 'premium',
  pitch: 'كشف حساب مستقل لكل منصة توصيل ولكل مورد ولكل عميل: الطلبات غير المسوّاة وأعمار الذمم، مطابقة كشف المنصة مع طلبات المطعم، تسوية الفواتير الآجلة بعد خصم العمولات والرسوم وتسجيل الفروقات، وإدخال السداد والتحصيل بتاريخ وطريقة دفع.',
  render: async function (body) {
    await v52LoadMeta();
    body.innerHTML = subTabs('pySub', [['ch', 'منصات التوصيل', 'motorcycle'], ['sup', 'الموردون', 'truck'], ['cus', 'العملاء (الآجل)', 'users']], 'ch') + '<div id="pyB"></div>';
    const el = body.querySelector('#pyB');
    const go = function (k) { if (k === 'sup') v52Party(el, 'supplier'); else if (k === 'cus') v52Party(el, 'customer'); else v52Platforms(el); };
    bindSubTabs(body, 'pySub', go); go('ch');
  } });
async function v52Platforms(el) {
  el.innerHTML = dateRangeBar('pcR', v52MonthStart(), isoLocal()) + '<div class="biz-toolbar"><span class="grow"></span>' + rptButtons('pcRP') + '</div><div id="pcB"></div>';
  let R = null; const box = el.querySelector('#pcB');
  const load = async function (rg) {
    v51Spin(box); const r = await bz('chOverview', rg || get()); if (!r.success) return v51Err(box, r); R = r;
    const T = r.totals;
    box.innerHTML = kpis([['رصيد ذمم المنصات', v52M(T.balance)], ['طلبات غير مسوّاة (صافي العمولة)', money(T.unsettled)], ['مبيعات المنصات في الفترة', money(T.gross)], ['العمولات المتوقعة', money(T.commission)], ['المحوّل من المنصات', money(T.received)]]) +
      bTable([{ label: 'المنصة', r: function (x) { return '<div style="min-width:330px"><b>' + h(x.name) + '</b><div class="muted" style="font-size:.75rem">' + nf(x.pct, 1) + '%' + (x.fixed ? ' + ' + nf(x.fixed) : '') + (x.monthlyFee ? ' · اشتراك ' + nf(x.monthlyFee) : '') + ' · تحويل ' + (x.payDays || 7) + ' يوم</div>' +
          '<div style="display:flex;gap:6px;flex-wrap:nowrap;margin-top:8px"><button class="btn btn-outline btn-sm" data-st="' + x.id + '"><i class="fas fa-file-invoice"></i> كشف الحساب</button>' + (canP('gl') ? '<button class="btn btn-primary btn-sm" data-se="' + x.id + '"><i class="fas fa-check-double"></i> تسوية</button><button class="btn btn-outline btn-sm" data-rc="' + x.id + '"><i class="fas fa-not-equal"></i> مطابقة كشف المنصة</button><button class="btn btn-outline btn-sm" data-cl="' + x.id + '"><i class="fas fa-balance-scale"></i> إقفال الرصيد</button>' : '') + '</div></div>'; } },
        { label: 'الرصيد', num: true, r: function (x) { return '<b>' + v52M(x.balance) + '</b>'; } }, { label: 'غير مسوّى', num: true, r: function (x) { return nf(x.unsettled.count, 0) + ' طلب<br>' + money(x.unsettled.net); } }]
        .concat(r.buckets.map(function (b) { return { label: v52Age(b), num: true, r: function (x) { const v = (x.unsettled.aging || {})[b] || 0; return v ? '<span style="' + (b === '31-60' || b === '60+' ? 'color:#ef4444;font-weight:700' : '') + '">' + nf(v) + '</span>' : ''; } }; }),
        [{ label: 'مبيعات الفترة', num: true, r: function (x) { return money(x.sales.gross) + '<div class="muted" style="font-size:.75rem">عمولة ' + nf(x.sales.pct, 1) + '%</div>'; } }]), r.rows, { empty: 'أضف منصات التوصيل من «قنوات التوصيل» أولاً' }) +
      v51Hint('عند اختيار منصة توصيل في الكاشير تُغلق الفاتورة آجلاً على المنصة (لا تدخل نقدية الوردية). عند وصول كشف المنصة وتحويلها: طابق الكشف، ثم سجّل التسوية بالمبلغ المستلم فعلياً بعد العمولة والرسوم — النظام يرحّل فرق العمولة والرسوم وفروقات التسوية لحسابات مستقلة ويغلق الطلبات.');
    box.querySelectorAll('[data-st]').forEach(function (b) { b.onclick = function () { v52ChStatement(b.dataset.st, get(), function () { load(); }); }; });
    box.querySelectorAll('[data-se]').forEach(function (b) { b.onclick = function () { v52ChSettle(b.dataset.se, null, function () { load(); }); }; });
    box.querySelectorAll('[data-rc]').forEach(function (b) { b.onclick = function () { v52ChRecon(b.dataset.rc, get(), function () { load(); }); }; });
    box.querySelectorAll('[data-cl]').forEach(function (b) { b.onclick = function () { const x = r.rows.find(function (y) { return y.id === b.dataset.cl; }) || {}; v52CloseBalance({ account: '1210', partyId: x.id, pt: 'ch', pn: x.name }, function () { load(); }); }; });
  };
  const get = bindRange(el, 'pcR', load); load(get());
  rptBind(el, 'pcRP', function () {
    if (!R) throw new Error('لا توجد بيانات');
    return { title: 'ذمم منصات التوصيل وأعمارها', period: R.from + ' — ' + R.to, kpis: [['الرصيد', money(R.totals.balance)], ['غير مسوّى', money(R.totals.unsettled)], ['المبيعات', money(R.totals.gross)]],
      sections: [{ title: 'المنصات', table: { headers: ['المنصة', 'الرصيد', 'عدد غير المسوّى', 'صافي غير المسوّى'].concat(R.buckets.map(function (b) { return v52Age(b); }), ['مبيعات الفترة', 'العمولة']), money: [1, 3, 4, 5, 6, 7, 8, 9, 10], foot: 'sum',
        rows: R.rows.map(function (x) { return [x.name, x.balance, x.unsettled.count, x.unsettled.net].concat(R.buckets.map(function (b) { return (x.unsettled.aging || {})[b] || 0; }), [x.sales.gross, x.sales.commission]); }) } }], signature: true };
  });
}
async function v52ChStatement(id, rg, done) {
  showLoading(); let r; try { r = await bzOk('chStatement', Object.assign({ channelId: id }, rg)); } finally { hideLoading(); }
  const L = r.ledger, ch = r.channel;
  const m = bModal({ title: 'كشف حساب ' + ch.name, sub: L.from + ' — ' + L.to, icon: 'file-invoice', xwide: true, print: true,
    body: kpis([['الرصيد الافتتاحي', v52M(L.opening)], ['مبيعات (مدين)', money(L.dr)], ['عمولات وتسويات (دائن)', money(L.cr)], ['الرصيد الختامي', v52M(L.closing)], ['اشتراكات مستحقة لم تُخصم', money(r.pendingSubscription)]]) +
      '<div class="biz-sec">أعمار الطلبات غير المسوّاة</div>' + kpis(Object.keys(r.aging).map(function (k) { return [v52Age(k), money(r.aging[k]), '', (k === '31-60' || k === '60+') && r.aging[k] ? '#ef4444' : '']; })) +
      '<div class="biz-sec">الطلبات غير المسوّاة (' + r.unsettled.length + ')</div>' + bTable([{ label: 'الطلب', r: function (o) { return '#' + o.number; } }, { label: 'رقم المنصة', r: function (o) { return canP('gl') ? '<input data-ref="' + o.id + '" value="' + h(o.ref) + '" style="width:120px" dir="ltr">' : h(o.ref); } },
        { label: 'التاريخ', r: function (o) { return dt(o.paidAt); } }, { label: 'العمر', num: true, r: function (o) { return o.age + ' يوم'; } }, { label: 'الإجمالي', num: true, r: function (o) { return money(o.total); } }, { label: 'العمولة المتوقعة', num: true, r: function (o) { return money(o.commission); } }, { label: 'الصافي المتوقع', num: true, r: function (o) { return money(o.net); } }], r.unsettled, { empty: 'لا توجد طلبات معلقة' }) +
      '<div class="biz-sec">التسويات</div>' + bTable([{ label: 'رقم', r: function (s) { return '#' + s.number; } }, { label: 'التاريخ', r: function (s) { return h(s.date); } }, { label: 'الطلبات', num: true, r: function (s) { return nf(s.count, 0); } }, { label: 'الإجمالي', num: true, r: function (s) { return money(s.gross); } },
        { label: 'عمولة المنصة', num: true, r: function (s) { return money(s.platformCommission); } }, { label: 'رسوم', num: true, r: function (s) { return money((+s.subscription || 0) + (+s.otherFees || 0)); } }, { label: 'المستلم', num: true, r: function (s) { return '<b>' + money(s.netReceived) + '</b>'; } },
        { label: 'الفرق', num: true, r: function (s) { return v52M(s.diff); } }, { label: 'مرجع', r: function (s) { return h(s.ref || ''); } }, { label: '', r: function (s) { return canP('gl') ? '<button class="btn btn-outline btn-sm" data-act="unset" data-id="' + s.id + '"><i class="fas fa-undo"></i></button>' : ''; } }], r.settlements, { empty: 'لا توجد تسويات' }) +
      '<div class="biz-sec">حركة الحساب</div>' + bTable([{ label: 'التاريخ', r: function (x) { return h(x.d); } }, { label: 'البيان', r: function (x) { return h(x.desc); } }, { label: 'مدين', num: true, r: function (x) { return v52Dr(x.dr); } }, { label: 'دائن', num: true, r: function (x) { return v52Dr(x.cr); } }, { label: 'الرصيد', num: true, r: function (x) { return v52M(x.balance); } }], L.rows),
    foot: '<button class="btn btn-cancel" data-x>إغلاق</button>' + (canP('gl') && r.unsettled.length ? '<button class="btn btn-primary" data-act="settle"><i class="fas fa-check-double"></i> تسوية</button>' : ''),
    actions: {
      settle: function (mm) { mm.close(); v52ChSettle(id, null, done); },
      unset: async function (mm, b) { if (!(await bConfirm('إلغاء التسوية وإعادة طلباتها كغير مسوّاة؟'))) return; await bzOk('chSettleDelete', { id: b.dataset.id }); mm.close(); showToast('تم إلغاء التسوية'); done && done(); }
    } });
  m.$$('[data-ref]').forEach(function (i) { i.onchange = async function () { await bzOk('chOrderRef', { orderId: i.dataset.ref, ref: i.value }); showToast('تم حفظ رقم طلب المنصة'); }; });
}
async function v52ChSettle(id, preIds, done) {
  showLoading(); let r; try { r = await bzOk('chStatement', { channelId: id }); } finally { hideLoading(); }
  if (!r.unsettled.length) { showToast('لا توجد طلبات غير مسوّاة لهذه المنصة', true); return; }
  const sel = {}; r.unsettled.forEach(function (o) { sel[o.id] = preIds ? preIds.indexOf(o.id) >= 0 : true; });
  const m = bModal({ title: 'تسوية ' + r.channel.name, sub: 'اختر الطلبات المشمولة في كشف/تحويل المنصة', icon: 'check-double', xwide: true, print: false,
    body: '<div class="biz-toolbar"><label class="biz-check" style="margin:0"><input type="checkbox" id="csAll"> <span>تحديد الكل</span></label><span class="grow"></span><span id="csSum" class="muted"></span></div>' +
      '<div style="max-height:260px;overflow:auto">' + bTable([{ label: '', r: function (o) { return '<input type="checkbox" data-o="' + o.id + '"' + (sel[o.id] ? ' checked' : '') + '>'; } }, { label: 'الطلب', r: function (o) { return '#' + o.number + (o.ref ? ' · ' + h(o.ref) : ''); } }, { label: 'التاريخ', r: function (o) { return dt(o.paidAt); } },
        { label: 'الإجمالي', num: true, r: function (o) { return money(o.total); } }, { label: 'العمولة المتوقعة', num: true, r: function (o) { return money(o.commission); } }, { label: 'الصافي', num: true, r: function (o) { return money(o.net); } }], r.unsettled) + '</div>' +
      '<div class="biz-form" style="margin-top:10px"><div><label class="pro-label">تاريخ التسوية / التحويل</label><div class="pro-input-wrap"><input type="date" id="csD" value="' + isoLocal() + '"></div></div>' +
      '<div><label class="pro-label">عمولة المنصة الفعلية حسب الكشف</label><div class="pro-input-wrap"><input type="number" step="any" id="csC" dir="ltr"></div></div>' +
      '<div><label class="pro-label">اشتراك شهري مخصوم (مستحق ' + nf(r.pendingSubscription) + ')</label><div class="pro-input-wrap"><input type="number" step="any" id="csS" dir="ltr" value="0"></div></div>' +
      '<div><label class="pro-label">رسوم أخرى (إعلانات، غرامات، خدمات)</label><div class="pro-input-wrap"><input type="number" step="any" id="csF" dir="ltr" value="0"></div></div>' +
      '<div><label class="pro-label">المبلغ المستلم فعلياً</label><div class="pro-input-wrap"><input type="number" step="any" id="csN" dir="ltr"></div></div>' +
      '<div><label class="pro-label">استُلم في</label><div class="pro-input-wrap">' + v51Sel('csM', v52CashOpts(), 'transfer') + '</div></div>' +
      '<div><label class="pro-label">مرجع الكشف / الحوالة</label><div class="pro-input-wrap"><input id="csR"></div></div><div><label class="pro-label">ملاحظة</label><div class="pro-input-wrap"><input id="csNo"></div></div></div>' +
      '<div class="biz-card" id="csCalc" style="margin-top:8px"></div>',
    foot: '<button class="btn btn-cancel" data-x>إلغاء</button><button class="btn btn-primary" data-act="save"><i class="fas fa-check"></i> ترحيل التسوية وإغلاق الطلبات</button>',
    actions: {
      save: async function (mm, btn) {
        const ids = Object.keys(sel).filter(function (k) { return sel[k]; }); if (!ids.length) { showToast('اختر طلباً واحداً على الأقل', true); return; }
        btn.disabled = true;
        try {
          const res = await bzOk('chSettle', { channelId: id, orderIds: ids, date: mm.$('#csD').value, platformCommission: mm.$('#csC').value, subscription: +mm.$('#csS').value || 0, otherFees: +mm.$('#csF').value || 0, netReceived: +mm.$('#csN').value || 0, method: mm.$('#csM').value, ref: mm.$('#csR').value, note: mm.$('#csNo').value });
          mm.close(); showToast('تمت التسوية #' + res.settlement.number + (Math.abs(res.settlement.diff) > 0.009 ? ' — فرق ' + nf(res.settlement.diff) + ' مُرحّل لفروقات التسوية' : '')); done && done();
        } finally { btn.disabled = false; }
      }
    } });
  let touchedC = false, touchedN = false;
  const calc = function () {
    const os = r.unsettled.filter(function (o) { return sel[o.id]; });
    const g = os.reduce(function (s, o) { return s + o.total; }, 0), ec = os.reduce(function (s, o) { return s + o.commission; }, 0);
    if (!touchedC) m.$('#csC').value = Math.round(ec * 100) / 100;
    const sc = +m.$('#csC').value || 0, sb = +m.$('#csS').value || 0, fe = +m.$('#csF').value || 0;
    if (!touchedN) m.$('#csN').value = Math.round((g - sc - sb - fe) * 100) / 100;
    const n = +m.$('#csN').value || 0, diff = Math.round((g - sb - n - sc - fe) * 100) / 100;
    m.$('#csSum').textContent = os.length + ' طلب · ' + nf(g);
    m.$('#csCalc').innerHTML = v52Rows([['إجمالي الطلبات المختارة', g], ['العمولة المتوقعة حسب العقد', -ec, 0, 1], ['فرق العمولة (الفعلية − المتوقعة)', -(sc - ec), 0, 1], ['الاشتراك والرسوم', -(sb + fe), 0, 1], ['الصافي المتوقع استلامه', g - sc - sb - fe, 1], ['المستلم فعلياً', n], ['فرق التسوية (يُرحّل لحساب 6250)', -diff, 1]]);
  };
  m.$('#csAll').checked = r.unsettled.every(function (o) { return sel[o.id]; });
  m.$('#csAll').onchange = function () { const v = m.$('#csAll').checked; r.unsettled.forEach(function (o) { sel[o.id] = v; }); m.$$('[data-o]').forEach(function (c) { c.checked = v; }); calc(); };
  m.$$('[data-o]').forEach(function (c) { c.onchange = function () { sel[c.dataset.o] = c.checked; calc(); }; });
  m.$('#csC').oninput = function () { touchedC = true; calc(); }; m.$('#csN').oninput = function () { touchedN = true; calc(); };
  m.$('#csS').oninput = calc; m.$('#csF').oninput = calc;
  calc();
}
function v52ChRecon(id, rg, done) {
  const m = bModal({ title: 'مطابقة كشف المنصة', sub: 'الصق أسطر كشف المنصة: رقم الطلب في المنصة (أو رقم طلب المطعم) ثم المبلغ، وعمولة المنصة اختيارياً — مفصولة بفاصلة أو Tab', icon: 'not-equal', xwide: true, print: false,
    body: '<textarea id="rcT" rows="8" dir="ltr" style="width:100%" placeholder="HS-1000, 57.50, 11.50&#10;HS-1001, 115.00"></textarea><div class="biz-toolbar"><input type="file" id="rcF" accept=".csv,.txt"><span class="grow"></span><button class="btn btn-primary btn-sm" data-act="run"><i class="fas fa-search"></i> مطابقة</button></div><div id="rcB"></div>',
    foot: '<button class="btn btn-cancel" data-x>إغلاق</button>',
    actions: {
      run: async function (mm) {
        const lines = mm.$('#rcT').value.split(/\r?\n/).map(function (s) { return s.split(/[,;\t]/).map(function (x) { return x.trim(); }); }).filter(function (a) { return a[0] && !isNaN(parseFloat(a[1])); }).map(function (a) { return { ref: a[0], amount: parseFloat(a[1]), commission: parseFloat(a[2]) || 0 }; });
        if (!lines.length) { showToast('لا توجد أسطر صالحة', true); return; }
        const r = await bzOk('chReconcile', Object.assign({ channelId: id, lines: lines }, rg));
        const T = r.totals, col = [{ label: 'المرجع', r: function (x) { return h(x.ref || ''); } }, { label: 'الطلب', r: function (x) { return x.number ? '#' + x.number : '—'; } }, { label: 'في النظام', num: true, r: function (x) { return x.system !== undefined ? money(x.system) : '—'; } }, { label: 'في الكشف', num: true, r: function (x) { return x.platform !== undefined ? money(x.platform) : (x.amount !== undefined ? money(x.amount) : '—'); } }, { label: 'الفرق', num: true, r: function (x) { return x.diff !== undefined ? v52M(x.diff) : ''; } }];
        mm.$('#rcB').innerHTML = kpis([['أسطر الكشف', nf(T.lines, 0), money(T.statement)], ['مطابق', nf(r.matched.length, 0), money(T.matched), '#10b981'], ['بفروقات', nf(r.diff.length, 0), money(T.diff), r.diff.length ? '#f59e0b' : ''], ['غير موجود في النظام', nf(r.missing.length, 0), money(T.missing), r.missing.length ? '#ef4444' : ''], ['في النظام وليس في الكشف', nf(r.notInStatement.length, 0), money(T.notInStatement)], ['مسوّى سابقاً', nf(r.settled.length, 0)]]) +
          (r.diff.length ? '<div class="biz-sec">فروقات المبالغ</div>' + bTable(col, r.diff) : '') + (r.missing.length ? '<div class="biz-sec">أسطر في الكشف غير موجودة في النظام</div>' + bTable(col, r.missing) : '') +
          (r.notInStatement.length ? '<div class="biz-sec">طلبات منصة في النظام غير واردة في الكشف</div>' + bTable([{ label: 'الطلب', r: function (x) { return '#' + x.number; } }, { label: 'مرجع', r: function (x) { return h(x.ref); } }, { label: 'التاريخ', r: function (x) { return dt(x.date); } }, { label: 'المبلغ', num: true, r: function (x) { return money(x.system); } }], r.notInStatement) : '') +
          (r.settled.length ? '<div class="biz-sec">مسوّاة سابقاً</div>' + bTable(col, r.settled) : '') +
          (canP('gl') && (r.matched.length + r.diff.length) ? '<div class="biz-toolbar"><button class="btn btn-primary" id="rcS"><i class="fas fa-check-double"></i> تسوية الطلبات المطابقة (' + (r.matched.length + r.diff.length) + ')</button></div>' : '');
        const sb = mm.$('#rcS'); if (sb) sb.onclick = function () { const ids = r.matched.concat(r.diff).map(function (x) { return x.orderId; }); mm.close(); v52ChSettle(id, ids, done); };
      }
    } });
  m.$('#rcF').onchange = function () { const f = m.$('#rcF').files[0]; if (!f) return; const rd = new FileReader(); rd.onload = function () { m.$('#rcT').value = String(rd.result || ''); }; rd.readAsText(f); };
}
async function v52Party(el, type) {
  const sup = type === 'supplier';
  el.innerHTML = '<div class="biz-toolbar"><label>حتى تاريخ <input type="date" id="paT" value="' + isoLocal() + '"></label><input type="search" id="paQ" placeholder="بحث بالاسم" style="max-width:220px"><span class="grow"></span>' + rptButtons('paRP') + '</div><div id="paB"></div>';
  let R = null; const box = el.querySelector('#paB');
  const draw = function () {
    const q = (el.querySelector('#paQ').value || '').trim().toLowerCase();
    const rows = R.rows.filter(function (x) { return !q || String(x.name).toLowerCase().indexOf(q) >= 0; });
    box.innerHTML = kpis([[sup ? 'إجمالي ذمم الموردين' : 'إجمالي ذمم العملاء', money(R.totals.balance)]].concat(R.buckets.map(function (b) { return [v52Age(b), money(R.totals[b]), '', (b === '31-60' || b === '60+') && R.totals[b] > 0 ? '#ef4444' : '']; }))) +
      bTable([{ label: sup ? 'المورد' : 'العميل', r: function (x) { return '<b>' + h(x.name) + '</b>'; } }, { label: 'الرصيد', num: true, r: function (x) { return '<b>' + v52M(x.balance) + '</b>'; } }]
        .concat(R.buckets.map(function (b) { return { label: v52Age(b), num: true, r: function (x) { return x.aging[b] ? nf(x.aging[b]) : ''; } }; }),
          [{ label: '', r: function (x) { const real = !/^(cash:|opening|m:|asset:)/.test(x.pid); return '<div style="display:flex;gap:6px;white-space:nowrap"><button class="btn btn-outline btn-sm" data-st="' + h(x.pid) + '"><i class="fas fa-file-invoice"></i> كشف</button>' + (real && x.balance > 0 && (sup ? canP('purchasing', 'finance') : canP('finance', 'pos')) ? ' <button class="btn btn-primary btn-sm" data-pay="' + h(x.pid) + '"><i class="fas fa-money-bill-wave"></i> ' + (sup ? 'سداد' : 'تحصيل') + '</button>' : '') + '</div>'; } }]), rows, { empty: 'لا توجد أرصدة' }) +
      v51Hint(sup ? 'أعمار ذمم الموردين بطريقة FIFO: السداد يُخصم من أقدم الفواتير أولاً، والرصيد المتبقي يُوزّع على أحدث الفواتير حسب تاريخها.' : 'أعمار ذمم العملاء الآجلة بطريقة FIFO من فواتير البيع الآجل والتحصيلات.');
    box.querySelectorAll('[data-st]').forEach(function (b) { b.onclick = function () { v52PartyStatement(sup ? '2100' : '1200', b.dataset.st, rows.find(function (x) { return x.pid === b.dataset.st; }).name); }; });
    box.querySelectorAll('[data-pay]').forEach(function (b) {
      b.onclick = function () {
        const x = rows.find(function (y) { return y.pid === b.dataset.pay; });
        bPrompt((sup ? 'سداد للمورد: ' : 'تحصيل من العميل: ') + x.name, [{ k: 'amount', label: 'المبلغ', type: 'number', req: true, def: x.balance }, { k: 'method', label: 'طريقة الدفع', type: 'select', options: [['cash', 'نقداً'], ['transfer', 'تحويل بنكي'], ['card', 'بطاقة']] }]
          .concat(sup ? [{ k: 'date', label: 'تاريخ السداد', type: 'date', def: isoLocal() }] : []).concat([{ k: 'note', label: 'ملاحظة / مرجع', full: true }]), {}, async function (d) {
          if (sup) await bzOk('supplierPay', { supplierId: x.pid, amount: d.amount, method: d.method, date: d.date, note: d.note });
          else await bzOk('ledgerPayment', { customerId: x.pid, amount: d.amount, method: d.method, kind: 'credit', note: d.note });
          showToast('تم التسجيل'); load();
        }, { icon: 'money-bill-wave', saveText: 'تسجيل' });
      };
    });
  };
  const load = async function () { v51Spin(box); const r = await bz('glAging', { type: type, from: el.querySelector('#paT').value, to: el.querySelector('#paT').value }); if (!r.success) return v51Err(box, r); R = r; draw(); };
  el.querySelector('#paT').onchange = load; el.querySelector('#paQ').oninput = function () { if (R) draw(); };
  load();
  rptBind(el, 'paRP', function () {
    if (!R) throw new Error('لا توجد بيانات');
    return { title: sup ? 'أعمار ذمم الموردين' : 'أعمار ذمم العملاء', period: 'حتى ' + R.to, kpis: [['الإجمالي', money(R.totals.balance)]],
      sections: [{ title: 'الأرصدة', table: { headers: [sup ? 'المورد' : 'العميل', 'الرصيد'].concat(R.buckets.map(function (b) { return v52Age(b); })), money: [1, 2, 3, 4, 5, 6], foot: 'sum', rows: R.rows.map(function (x) { return [x.name, x.balance].concat(R.buckets.map(function (b) { return x.aging[b] || 0; })); }) } }], signature: true };
  });
}
async function v52PartyStatement(acct, pid, name) {
  const from = v52FyStart(), to = isoLocal();
  const box = bModal({ title: 'كشف حساب: ' + name, sub: from + ' — ' + to, icon: 'file-invoice', xwide: true, print: true, body: '<div id="psR">' + dateRangeBar('psD', from, to) + '</div><div id="psB"></div>' });
  const b = box.$('#psB');
  const load = async function (rg) {
    v51Spin(b); const r = await bz('glLedger', Object.assign({ account: acct, partyId: pid }, rg)); if (!r.success) return v51Err(b, r);
    const sign = acct === '2100' ? -1 : 1;
    b.innerHTML = kpis([['الرصيد الافتتاحي', money(r.opening * sign)], [acct === '2100' ? 'فواتير (دائن)' : 'فواتير (مدين)', money(acct === '2100' ? r.cr : r.dr)], [acct === '2100' ? 'سداد (مدين)' : 'تحصيل (دائن)', money(acct === '2100' ? r.dr : r.cr)], ['الرصيد المستحق', money(r.closing * sign)]]) +
      bTable([{ label: 'التاريخ', r: function (x) { return h(x.d); } }, { label: 'المستند', r: function (x) { return h(x.srcName) + (x.no ? ' #' + h(x.no) : ''); } }, { label: 'البيان', r: function (x) { return h(x.desc); } }, { label: 'مدين', num: true, r: function (x) { return v52Dr(x.dr); } }, { label: 'دائن', num: true, r: function (x) { return v52Dr(x.cr); } }, { label: 'الرصيد', num: true, r: function (x) { return money(x.balance * sign); } }], r.rows, { empty: 'لا توجد حركات' });
  };
  const get = bindRange(box.el, 'psD', load); load(get());
}

// ============================================================
// التقرير الشامل: أقسام المحاسبة العامة v5.2
// ============================================================
(function () {
  if (typeof bizFullSections !== 'function') return;
  const orig = bizFullSections;
  window.bizFullSections = bizFullSections = async function () {
    const out = await orig.apply(this, arguments); if (!out) return out;
    if (!hasF('gl') || !canP('gl', 'finance')) return out;
    const g = async function (fn, p) { try { const r = await bz(fn, p || {}, { silentPlan: true }); return r && r.success ? r : null; } catch (e) { return null; } };
    const y = { from: v52FyStart(), to: isoLocal() };
    const [S, TB, CH, AP, AR, LQ, DS] = await Promise.all([g('glStatements', y), g('glTrialBalance', y), g('chOverview', { from: daysAgo(29), to: isoLocal() }), g('glAging', { type: 'supplier' }), g('glAging', { type: 'customer' }), g('glLiquidity', { from: daysAgo(89), to: isoLocal() }), g('glDash', y)]);
    // v5.3.0: ضوابط المحاسبة — حالة الإقفال والتجميد، فروقات التقريب (6990)، توازن الدفاتر
    if (DS) { const rd = DS.rounding || {}; out.sections.push({ title: 'ضوابط المحاسبة والإقفال (من بداية السنة)', pb: true, table: { headers: ['البند', 'القيمة'], rows: [
      ['تاريخ الإقفال', DS.lockDate || 'لا توجد فترة مقفلة'], ['القيود المجمّدة', DS.frozen ? (DS.frozen.n + ' قيد حتى ' + DS.frozen.lock) : '—'], ['الإقفال التلقائي الشهري', DS.autoLockDays ? 'بعد ' + DS.autoLockDays + ' يوماً من نهاية الشهر' : 'معطّل'],
      ['عدد القيود في الفترة', DS.entries], ['فروقات التقريب المُرحّلة لحساب 6990', nf(rd.period || 0) + ' (' + (rd.count || 0) + ' قيد)'], ['حد التنبيه', nf(rd.threshold || 0) + (rd.alert ? ' — تجاوز الحد' : ' — ضمن الحد')],
      ['توازن ميزان المراجعة', TB ? (TB.balanced ? 'متوازن' : 'غير متوازن') : '—']] } }); }
    if (S) v52StatementsReport(S).sections.forEach(function (s, i) { out.sections.push(Object.assign({}, s, { title: 'IFRS — ' + s.title + ' (من بداية السنة)', pb: i === 0 || s.pb })); });
    if (TB) out.sections.push({ title: 'ميزان المراجعة (من بداية السنة)', pb: true, table: { headers: ['الرمز', 'الحساب', 'مدين', 'دائن'], money: [2, 3], foot: 'sum', rows: TB.rows.map(function (x) { return [x.parent || x.code, x.name, x.closeDr, x.closeCr]; }) } });
    if (CH && CH.rows.length) out.sections.push({ title: 'ذمم منصات التوصيل وأعمارها', table: { headers: ['المنصة', 'الرصيد', 'غير مسوّى'].concat(CH.buckets), money: [1, 2, 3, 4, 5, 6, 7], foot: 'sum', rows: CH.rows.map(function (x) { return [x.name, x.balance, x.unsettled.net].concat(CH.buckets.map(function (b) { return (x.unsettled.aging || {})[b] || 0; })); }) } });
    if (AP && AP.rows.length) out.sections.push({ title: 'أعمار ذمم الموردين', table: { headers: ['المورد', 'الرصيد'].concat(AP.buckets), money: [1, 2, 3, 4, 5, 6], foot: 'sum', rows: AP.rows.map(function (x) { return [x.name, x.balance].concat(AP.buckets.map(function (b) { return x.aging[b] || 0; })); }) } });
    if (AR && AR.rows.length) out.sections.push({ title: 'أعمار ذمم العملاء', table: { headers: ['العميل', 'الرصيد'].concat(AR.buckets), money: [1, 2, 3, 4, 5, 6], foot: 'sum', rows: AR.rows.map(function (x) { return [x.name, x.balance].concat(AR.buckets.map(function (b) { return x.aging[b] || 0; })); }) } });
    if (LQ) v52LiqReport(LQ).sections.forEach(function (s, i) { out.sections.push(Object.assign({}, s, { title: 'السيولة الشاملة — ' + s.title, pb: i === 0 })); });
    return out;
  };
})();
