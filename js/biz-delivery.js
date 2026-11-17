// ============================================================
// biz-delivery.js (v4.5) — التوصيل والخدمات اللوجستية: اللوحة الحية، السائقون، الأداء، الإعدادات
// ============================================================
var DLV = { timer: null, data: null, skew: 0 };
const DLV_ST = { waiting: ['بانتظار التجهيز', 'badge-warning'], ready: ['بانتظار سائق', 'badge-info'], on_way: ['في الطريق', 'badge-success'], delivered: ['تم التسليم', 'badge-success'], cancelled: ['ملغى', 'badge-dog'] };
function dlAddrLine(a) {
  if (!a) return '';
  return [a.city, a.district, a.street, a.complex ? 'مجمع ' + a.complex : '', a.building ? 'مبنى ' + a.building : '', a.floor ? 'طابق ' + a.floor : '', a.apartment ? 'شقة ' + a.apartment : '', a.text].filter(Boolean).join('، ');
}
function dlParseLatLng(s) {
  s = String(s || '').trim(); if (!s) return null;
  const m = s.match(/@?(-?\d{1,2}\.\d{3,})\s*,\s*(-?\d{1,3}\.\d{3,})/) || s.match(/[?&](?:q|query|destination|ll)=(-?\d{1,2}\.\d+)%2C(-?\d{1,3}\.\d+)/i);
  return m ? [+m[1], +m[2]] : null;
}
function dlMapUrl(a) { return a && a.lat ? 'https://www.google.com/maps/dir/?api=1&destination=' + a.lat + ',' + a.lng : (a ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(dlAddrLine(a)) : ''); }
function dlMins(from, to) { if (!from) return null; const t = to ? new Date(to).getTime() : Date.now() + DLV.skew; return Math.max(0, Math.round((t - new Date(from).getTime()) / 60000)); }
function dlDriverUrl() { return publicBase() + 'driver.html?r=' + encodeURIComponent(B.acc.publicId || currentUserEmail); }

bizPage('delivery', { group: 'ops', title: 'التوصيل والسائقون', icon: 'motorcycle', feature: 'delivery', perms: ['dispatch', 'orders_manage', 'settings'], plan: 'premium',
  sub: 'متابعة حية لطلبات التوصيل من المطبخ حتى باب العميل، مع أداء كل سائق',
  pitch: 'حلقة توصيل متكاملة: يطلب العميل من المينيو أو التطبيق بعنوانه المحدد بالأقمار الصناعية، وعند ضغط «جاهز» في المطبخ يرن جوال السائقين المتصلين، يقبل أحدهم فيظهر للعميل أن طلبه في الطريق، ثم يؤكد التسليم — مع زمن أقصى للتوصيل وتقارير أداء لكل سائق.',
  render: async function (body) {
    const canSet = canP('settings');
    body.innerHTML = subTabs('dlSub', [['board', 'اللوحة الحية', 'route'], ['report', 'أداء السائقين', 'chart-line'], ['drivers', 'السائقون وتطبيق السائق', 'id-badge']].concat(canSet ? [['settings', 'إعدادات التوصيل', 'cog']] : []), 'board') + '<div id="dlBody"></div>';
    const el = body.querySelector('#dlBody');
    bindSubTabs(body, 'dlSub', function (k) { clearInterval(DLV.timer); ({ board: dlBoard, report: dlReport, drivers: dlDrivers, settings: dlSettings })[k](el); });
    if (!(B.acc.biz && B.acc.biz.delivery && B.acc.biz.delivery.enabled)) {
      el.innerHTML = '<div class="biz-upsell"><div><b><i class="fas fa-motorcycle"></i> خدمة التوصيل غير مفعّلة</b><p>فعّل التوصيل وحدد رسومه والزمن الأقصى، ثم أضف موظفين بدور «سائق توصيل» من صفحة الموظفين.</p></div>' + (canSet ? '<button class="btn btn-primary" id="dlGo"><i class="fas fa-cog"></i> إعدادات التوصيل</button>' : '') + '</div>';
      const g = el.querySelector('#dlGo'); if (g) g.onclick = function () { body.querySelector('[data-sub=settings]').click(); };
      return;
    }
    dlBoard(el);
  } });

async function dlBoard(el) {
  clearInterval(DLV.timer);
  const load = async function () {
    if (B.current !== 'delivery' || !document.body.contains(el)) { clearInterval(DLV.timer); return; }
    const r = await bz('deliveryBoard', { branchId: B.branch }, { loading: false });
    if (!r.success) { el.innerHTML = '<div class="empty-state">' + h(r.error || 'تعذر التحميل') + '</div>'; return; }
    DLV.data = r; DLV.skew = new Date(r.serverTime).getTime() - Date.now();
    if (!document.querySelector('.modal-overlay.active')) dlBoardRender(el, r);
  };
  el.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i></div>';
  await load();
  DLV.timer = setInterval(load, 8000);
}
function dlCard(o, r) {
  const mx = +(r.settings.maxMinutes || 30), am = +(r.settings.acceptMinutes || 3);
  let timer = '';
  if (o.deliveryStatus === 'ready') { const w = dlMins(o.dispatchAt); timer = '<span class="dl-tm ' + (w >= am ? 'late' : '') + '"><i class="fas fa-hourglass-half"></i> ' + w + ' د بانتظار سائق</span>'; }
  else if (o.deliveryStatus === 'on_way') { const t = dlMins(o.acceptedAt), late = o.dueAt && Date.now() + DLV.skew > new Date(o.dueAt).getTime(); timer = '<span class="dl-tm ' + (late ? 'late' : '') + '"><i class="fas fa-stopwatch"></i> ' + t + ' / ' + mx + ' د' + (late ? ' — متأخر' : '') + '</span>'; }
  else if (o.deliveryStatus === 'waiting') timer = '<span class="dl-tm"><i class="fas fa-fire-burner"></i> ' + (o.kitchenStatus === 'none' ? 'لم يُرسل للمطبخ' : 'في المطبخ') + ' · ' + dlMins(o.placedAt) + ' د</span>';
  const drv = (r.drivers || []).map(function (d) { return '<option value="' + h(d.id) + '"' + (d.id === o.driverId ? ' selected' : '') + '>' + h(d.name) + '</option>'; }).join('');
  return '<div class="dl-card ' + o.deliveryStatus + '"><div class="dl-h"><b>#' + o.number + '</b>' + stBadge(DLV_ST, o.deliveryStatus) + (o.paid ? '<span class="badge badge-success">مدفوع</span>' : '<span class="badge badge-warning">عند الاستلام ' + money(o.total) + '</span>') + '</div>' +
    '<div class="dl-l"><i class="fas fa-user"></i> ' + h(o.customerName || '—') + (o.customerPhone ? ' · <a href="tel:' + h(o.customerPhone) + '" dir="ltr">' + h(o.customerPhone) + '</a>' : '') + '</div>' +
    '<div class="dl-l"><i class="fas fa-map-marker-alt"></i> ' + (o.addressLine ? h(o.addressLine) : '<span class="muted">بدون عنوان</span>') + (o.address ? ' <a target="_blank" rel="noopener" href="' + h(dlMapUrl(o.address)) + '"><i class="fas fa-external-link-alt"></i></a>' : '') + '</div>' +
    (o.driverName ? '<div class="dl-l"><i class="fas fa-motorcycle"></i> ' + h(o.driverName) + '</div>' : '') +
    '<div class="dl-f">' + timer + '<span class="grow"></span>' +
    (o.deliveryStatus === 'waiting' ? '<button class="btn btn-primary btn-sm" data-dl="dispatch" data-id="' + o.id + '"><i class="fas fa-bell"></i> إرسال للسائقين</button>' : '') +
    (drv ? '<select class="dl-asg" data-id="' + o.id + '"><option value="">' + (o.driverId ? 'تغيير السائق' : 'إسناد يدوي') + '</option>' + drv + '</select>' : '') + '</div></div>';
}
function dlBoardRender(el, r) {
  const A = r.active, by = function (s) { return A.filter(function (o) { return o.deliveryStatus === s; }); };
  const late = by('on_way').filter(function (o) { return o.dueAt && Date.now() + DLV.skew > new Date(o.dueAt).getTime(); }).length;
  const cash = (r.codPending || []).reduce(function (s, x) { return s + x.cash; }, 0);
  const col = function (t, ic, list) { return '<div class="dl-col"><div class="dl-ct"><i class="fas fa-' + ic + '"></i> ' + t + ' <span class="badge badge-info">' + list.length + '</span></div>' + (list.length ? list.map(function (o) { return dlCard(o, r); }).join('') : '<div class="muted dl-empty">لا يوجد</div>') + '</div>'; };
  el.innerHTML = kpis([['في المطبخ', nf(by('waiting').length, 0)], ['بانتظار سائق', nf(by('ready').length, 0), '', by('ready').length ? '#60a5fa' : ''], ['في الطريق', nf(by('on_way').length, 0), late ? late + ' متأخر' : '', late ? '#f87171' : ''],
    ['سائقون متصلون', nf(r.online.filter(function (x) { return x.online; }).length, 0) + ' / ' + r.online.length], ['تم التسليم (اليوم)', nf(r.delivered.length, 0)], ['نقد لدى السائقين', money(cash), 'طلبات لم تُغلق في الكاشير']]) +
    '<div class="dl-board">' + col('في المطبخ', 'fire-burner', by('waiting')) + col('بانتظار سائق', 'bell', by('ready')) + col('في الطريق', 'motorcycle', by('on_way')) + '</div>' +
    '<div class="biz-grid-2"><div class="biz-card"><h4><i class="fas fa-id-badge"></i> السائقون في الوردية</h4>' +
    bTable([{ label: 'السائق', r: function (d) { return '<span class="dl-dot ' + (d.online ? 'on' : '') + '"></span> <b>' + h(d.name) + '</b>'; } }, { label: 'طلبات معه', num: true, r: function (d) { return d.active; } },
      { label: 'العهدة', num: true, r: function (d) { return money(d.float || 0) + (d.floatCashier ? '<br><small class="muted">' + h(d.floatCashier) + '</small>' : ''); } },
      { label: 'الحالة', r: function (d) { return d.status === 'closing' ? '<span class="badge badge-warning">بانتظار تسليم النقد</span>' : '<span class="badge badge-success">يعمل</span>'; } },
      { label: 'بدأ', r: function (d) { return new Date(d.startedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }); } }, { label: 'آخر ظهور', r: function (d) { return dlMins(d.lastSeen) + ' د'; } },
      { label: 'الموقع', r: function (d) { return d.lat ? '<a target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=' + d.lat + ',' + d.lng + '"><i class="fas fa-map-marked-alt"></i> الخريطة</a>' : '—'; } }], r.online, { empty: 'لا يوجد سائق في الوردية الآن', emptyIcon: 'motorcycle' }) + '</div>' +
    '<div class="biz-card"><h4><i class="fas fa-money-bill-wave"></i> النقد المحصّل لدى السائقين</h4>' +
    bTable([{ label: 'السائق', r: function (x) { return h(x.driverName); } }, { label: 'طلبات', num: true, r: function (x) { return x.orders; } }, { label: 'المبلغ', num: true, r: function (x) { return money(x.cash); } }], r.codPending, { empty: 'لا يوجد نقد معلّق' }) +
    '<p class="muted" style="font-size:.78rem;margin-top:8px">عند إغلاق وردية السائق يسلّم النقد (العهدة + التحصيلات) للكاشير الموجود بالوردية، فتُغلق طلبات الدفع عند الاستلام تلقائياً في وردية الكاشير.</p>' +
    (canP('pos') ? '<button class="btn btn-primary btn-sm" id="dlCashBtn" style="margin-top:6px"><i class="fas fa-hand-holding-usd"></i> عهدة السائقين وتسليم النقد</button>' : '') + '</div></div>' +
    '<div class="biz-card"><h4><i class="fas fa-check-double"></i> آخر الطلبات المسلّمة</h4>' +
    bTable([{ label: '#', r: function (o) { return '<b>' + o.number + '</b>'; } }, { label: 'العميل', r: function (o) { return h(o.customerName); } }, { label: 'السائق', r: function (o) { return h(o.driverName); } },
      { label: 'الانتظار', num: true, r: function (o) { return dlMins(o.dispatchAt, o.acceptedAt) + ' د'; } }, { label: 'زمن التوصيل', num: true, r: function (o) { const m = dlMins(o.acceptedAt, o.deliveredAt), lt = o.dueAt && new Date(o.deliveredAt) > new Date(o.dueAt); return '<span style="color:' + (lt ? '#f87171' : '#6ee7b7') + '">' + m + ' د</span>'; } },
      { label: 'الإجمالي من الطلب', num: true, r: function (o) { return dlMins(o.placedAt, o.deliveredAt) + ' د'; } }, { label: 'المبلغ', num: true, r: function (o) { return money(o.total); } }], r.delivered, { empty: 'لا توجد طلبات مسلّمة اليوم' }) + '</div>';
  el.onclick = async function (e) {
    if (e.target.closest('#dlCashBtn')) { dlCashModal(function () { dlBoard(el); }); return; }
    const b = e.target.closest('[data-dl]'); if (!b) return;
    if (b.dataset.dl === 'dispatch') { await bzOk('deliveryDispatch', { id: b.dataset.id }); showToast('تم إرسال الطلب لجوالات السائقين'); dlBoard(el); }
  };
  el.querySelectorAll('.dl-asg').forEach(function (s) {
    s.onchange = async function () { if (!s.value) return; try { await bzOk('deliveryAssign', { id: s.dataset.id, driverId: s.value }); showToast('تم إسناد الطلب للسائق'); } catch (er) { /* */ } dlBoard(el); };
  });
}

async function dlReport(el) {
  el.innerHTML = dateRangeBar('dlR', daysAgo(6), isoLocal()) + '<div id="dlRB"></div>';
  const go = async function (f) {
    const r = await bzOk('deliveryReport', Object.assign({ branchId: B.branch }, f));
    const S = r.summary, out = el.querySelector('#dlRB');
    const st = function (x) { return x && x.n ? nf(x.avg, 1) + ' د' : '—'; };
    out.innerHTML = kpis([['طلبات مسلّمة', nf(S.n, 0)], ['متوسط انتظار السائق', st(S.wait), 'الهدف ' + r.acceptMinutes + ' د'], ['متوسط زمن التوصيل', st(S.trip), 'الحد الأقصى ' + r.maxMinutes + ' د'],
      ['متوسط الطلب حتى الباب', st(S.total)], ['الالتزام بالوقت', nf(S.onTime, 0) + '%', S.late + ' متأخر', S.onTime >= 90 ? '#6ee7b7' : S.onTime >= 70 ? '#fbbf24' : '#f87171'], ['ملغاة', nf(S.cancelled, 0)]]) +
      '<div class="biz-card"><h4><i class="fas fa-ranking-star"></i> أداء كل سائق</h4>' +
      bTable([{ label: 'السائق', r: function (d) { return '<b>' + h(d.name) + '</b>'; } }, { label: 'الطلبات', num: true, r: function (d) { return d.n; } },
        { label: 'انتظار القبول', num: true, r: function (d) { return st(d.wait); } }, { label: 'زمن التوصيل (متوسط)', num: true, r: function (d) { return st(d.trip); } }, { label: 'أسرع / أبطأ', num: true, r: function (d) { return d.trip.n ? nf(d.trip.min, 0) + ' / ' + nf(d.trip.max, 0) + ' د' : '—'; } },
        { label: 'متأخرة', num: true, r: function (d) { return d.late; } }, { label: 'الالتزام', num: true, r: function (d) { return '<b style="color:' + (d.onTime >= 90 ? '#6ee7b7' : d.onTime >= 70 ? '#fbbf24' : '#f87171') + '">' + nf(d.onTime, 0) + '%</b>'; } },
        { label: 'قيمة الطلبات', num: true, r: function (d) { return money(d.value); } }, { label: 'نقد محصّل', num: true, r: function (d) { return money(d.cash); } }], r.drivers, { empty: 'لا توجد طلبات توصيل مسلّمة في هذه الفترة' }) + '</div>' +
      '<div class="biz-card"><h4><i class="fas fa-list"></i> سجل طلبات التوصيل</h4>' +
      bTable([{ label: '#', r: function (o) { return o.number; } }, { label: 'التاريخ', r: function (o) { return dt(o.placedAt); } }, { label: 'العميل', r: function (o) { return h(o.customerName); } }, { label: 'الحالة', r: function (o) { return stBadge(DLV_ST, o.deliveryStatus); } },
        { label: 'السائق', r: function (o) { return h(o.driverName || '—'); } }, { label: 'زمن التوصيل', num: true, r: function (o) { return o.deliveredAt ? dlMins(o.acceptedAt, o.deliveredAt) + ' د' : '—'; } }, { label: 'المبلغ', num: true, r: function (o) { return money(o.total); } }], r.orders, { empty: 'لا توجد طلبات' }) + '</div>';
  };
  bindRange(el, 'dlR', go);
  go({ from: daysAgo(6), to: isoLocal() });
}

async function dlDrivers(el) {
  const url = dlDriverUrl();
  const rows = canP('team') ? (await entList('staff')).filter(function (s) { return s.role === 'driver' || (s.permissions || []).indexOf('delivery') >= 0; }) : [];
  el.innerHTML = '<div class="biz-grid-2"><div class="biz-card"><h4><i class="fas fa-mobile-alt"></i> تطبيق السائق</h4><p class="muted" style="line-height:1.9">يفتح السائق هذا الرابط على جواله ويضيفه للشاشة الرئيسية، ثم يدخل باسم المستخدم ورمز PIN الخاصين به. عند «بدء الوردية» يرن جواله مع كل طلب جاهز، ويقبل الطلب ويفتح الخريطة ويؤكد التسليم.</p>' + linkBox(url) +
    '<div class="qr-tiles" style="margin-top:12px"><div class="qr-tile"><img src="' + qrImg(url, 220) + '"><div>تطبيق السائق</div></div></div></div>' +
    '<div class="biz-card"><h4><i class="fas fa-list-check"></i> خطوات التشغيل</h4><ol class="dl-steps"><li>فعّل التوصيل من «إعدادات التوصيل» وحدد الرسوم والزمن الأقصى.</li><li>أضف السائقين من «الموظفون والفروع» بدور <b>سائق توصيل</b>.</li><li>يختار العميل «توصيل» في المينيو أو التطبيق ويحدد موقعه بالـ GPS وتفاصيل المبنى والشقة.</li><li>تقبل الطلب من الكاشير فيصل للمطبخ، وعند «جاهز» يرن جوال كل سائق في الوردية.</li><li>أول سائق يقبل يستلم الطلب ويظهر للعميل «في الطريق»، ثم «تم التسليم».</li></ol></div></div>' +
    (canP('team') ? '<div class="biz-card"><div class="biz-toolbar"><h4 class="grow" style="margin:0"><i class="fas fa-id-badge"></i> السائقون المسجلون</h4><button class="btn btn-primary btn-sm" id="dlAddDrv"><i class="fas fa-user-plus"></i> إضافة سائق</button></div>' +
      bTable([{ label: 'السائق', r: function (s) { return '<b>' + h(s.name) + '</b>'; } }, { label: 'اسم المستخدم', r: function (s) { return '<span dir="ltr">' + h(s.username) + '</span>'; } }, { label: 'الجوال', r: function (s) { return '<span dir="ltr">' + h(s.phone || '') + '</span>'; } },
        { label: 'الحالة', r: function (s) { return s.active ? '<span class="badge badge-success">فعّال</span>' : '<span class="badge badge-dog">موقوف</span>'; } }], rows, { empty: 'لا يوجد سائقون بعد' }) + '</div>' : '');
  const ad = el.querySelector('#dlAddDrv');
  if (ad) ad.onclick = function () {
    bPrompt('سائق جديد', [{ k: 'name', label: 'الاسم', req: true }, { k: 'username', label: 'اسم المستخدم (إنجليزي)', req: true, ltr: true }, { k: 'pin', label: 'رمز PIN (4 أرقام أو أكثر)', req: true, ltr: true }, { k: 'phone', label: 'الجوال', ltr: true },
      { k: 'branch_id', label: 'الفرع', type: 'select', options: [['', 'كل الفروع']].concat((B.acc.branches || []).map(function (b) { return [b.id, b.name]; })) }], {}, async function (d) {
      if (!d.branch_id) d.branch_id = null;
      await entSave('staff', Object.assign(d, { role: 'driver', permissions: ['delivery'], active: true })); dlDrivers(el);
    }, { icon: 'motorcycle' });
  };
}

function dlSettings(el) {
  settingsForm(el, 'delivery', [{ k: 'enabled', label: 'تفعيل خدمة التوصيل', type: 'checkbox', full: true, hint: 'يظهر خيار «توصيل» للعميل في المينيو والتطبيق (يتطلب تفعيل الطلب أونلاين)، ويظهر في الكاشير.' },
    { k: 'maxMinutes', label: 'الزمن الأقصى للتوصيل (دقيقة)', type: 'number', hint: 'من قبول السائق حتى التسليم — يُحتسب الطلب متأخراً بعده' },
    { k: 'acceptMinutes', label: 'مهلة قبول السائق (دقيقة)', type: 'number', hint: 'بعدها يظهر تنبيه للإدارة لإسناد الطلب يدوياً' },
    { k: 'fee', label: 'رسوم التوصيل', type: 'number', hint: 'تُضاف تلقائياً للفاتورة (0 = مجاني)' }, { k: 'minOrder', label: 'الحد الأدنى لطلب التوصيل', type: 'number' },
    { k: 'requireFloat', label: 'إلزام السائق باستلام عهدة من الكاشير قبل بدء ورديته', type: 'checkbox', full: true, hint: 'يسلّم الكاشير السائقَ رصيداً افتتاحياً (فكة) من درجه، ويؤكّد السائق الاستلام من تطبيقه لتبدأ ورديته. عند الإغلاق يسلّم العهدة + التحصيلات للكاشير الموجود بالوردية.' },
    { k: 'floatAmount', label: 'مبلغ العهدة المقترح', type: 'number', hint: 'يظهر افتراضياً للكاشير عند تسليم العهدة (يمكن تعديله)' }],
    'العميل يجب أن يكون مسجّلاً في تطبيق المطعم برقم جواله، ويحدد موقعه عبر الأقمار الصناعية (GPS) مع تفاصيل المجمع والمبنى والطابق والشقة. يمكن للكاشير أيضاً إنشاء طلب توصيل يدوي بعنوان.');
}

// ============================================================
// v4.7: عهدة السائقين — الكاشير يسلّم الرصيد الافتتاحي ويستلم النقد عند إغلاق وردية السائق
// ============================================================
var DLC = { m: null, timer: null };
async function dlCashModal(onChange) {
  if (DLC.m) { try { DLC.m.close(); } catch (e) { /* */ } }
  const r = await bzOk('driverCashBoard', {});
  const canMove = canP('pos') && (B.acc.isOwner || canP('pos_pay'));
  const pend = r.pending.filter(function (x) { return x.kind === 'settle'; }), pf = r.pending.filter(function (x) { return x.kind === 'float'; });
  const me = (B.acc.staff && B.acc.staff.id) || 'owner';
  const warn = !r.shift ? '<div class="biz-card" style="border-color:#f59e0b"><b style="color:#fbbf24"><i class="fas fa-exclamation-triangle"></i> لا توجد وردية كاشير مفتوحة لك</b><p class="muted" style="margin-top:6px">تسليم العهدة واستلام النقد من السائقين يتم من درج وردية مفتوحة. افتح ورديتك من الكاشير أولاً.</p></div>' : '';
  const settleCards = pend.length ? pend.map(function (x) {
    const mine = x.cashierShiftId && r.shift && x.cashierShiftId === r.shift.id;
    return '<div class="biz-card" style="border-color:' + (mine ? '#22c55e' : '#3b82f6') + '"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><b style="font-size:1.05rem"><i class="fas fa-motorcycle"></i> ' + h(x.driverName) + '</b>' +
      '<span class="badge ' + (mine ? 'badge-success' : 'badge-info') + '">' + (mine ? 'موجّه إليك' : 'موجّه إلى ' + h(x.cashierName)) + '</span><span class="muted" style="font-size:.8rem">' + dt(x.createdAt) + '</span></div>' +
      kpis([['العهدة', money(x.floatAmount)], ['تحصيلات (' + x.orders.length + ' طلب)', money(x.codTotal)], ['المطلوب استلامه', money(x.amount), '', '#6ee7b7']]) +
      (x.orders.length ? '<div class="muted" style="font-size:.8rem;line-height:1.8">' + x.orders.map(function (o) { return '#' + o.number + ' (' + nf(o.total) + ')'; }).join(' · ') + '</div>' : '') +
      (x.notes ? '<div class="muted" style="font-size:.8rem">ملاحظة السائق: ' + h(x.notes) + '</div>' : '') +
      (canMove && r.shift ? '<div style="margin-top:10px"><button class="btn btn-success" data-act="settleReq" data-id="' + h(x.id) + '" data-amt="' + x.amount + '" data-name="' + h(x.driverName) + '"><i class="fas fa-check-double"></i> استلام النقد وإغلاق وردية السائق</button></div>' : '') + '</div>';
  }).join('') : '';
  const drvTable = bTable([
    { label: 'السائق', r: function (d) { return '<span class="dl-dot ' + (d.online ? 'on' : '') + '"></span> <b>' + h(d.name) + '</b>'; } },
    { label: 'الحالة', r: function (d) { return !d.onShift ? '<span class="badge badge-dog">خارج الوردية</span>' : d.shiftStatus === 'closing' ? '<span class="badge badge-warning">يسلّم النقد</span>' : '<span class="badge badge-success">في الوردية</span>'; } },
    { label: 'العهدة', num: true, r: function (d) { return money(d.float); } },
    { label: 'تحصيلات معلّقة', num: true, r: function (d) { return money(d.cod) + (d.codOrders ? ' <small class="muted">(' + d.codOrders + ')</small>' : ''); } },
    { label: 'المطلوب تسليمه', num: true, r: function (d) { return '<b>' + money(d.due) + '</b>'; } },
    { label: '', r: function (d) {
      if (!canMove || !r.shift) return '';
      const hasPf = pf.some(function (x) { return x.driverId === d.id; });
      return (hasPf ? '<span class="muted" style="font-size:.78rem">عهدة بانتظار تأكيده</span> ' : '<button class="btn btn-outline btn-sm" data-act="give" data-id="' + h(d.id) + '" data-name="' + h(d.name) + '"><i class="fas fa-hand-holding-usd"></i> ' + (d.onShift ? 'عهدة إضافية' : 'تسليم عهدة') + '</button> ') +
        (d.onShift || d.cod > 0 ? '<button class="btn btn-success btn-sm" data-act="settle" data-id="' + h(d.id) + '" data-amt="' + d.due + '" data-name="' + h(d.name) + '"><i class="fas fa-cash-register"></i> استلام النقد</button>' : '');
    } }], r.drivers, { empty: 'لا يوجد سائقون — أضف موظفاً بدور «سائق توصيل»', emptyIcon: 'motorcycle' });
  const pfTable = pf.length ? '<div class="biz-card"><h4><i class="fas fa-hourglass-half"></i> عهد بانتظار تأكيد السائق</h4>' + bTable([
    { label: 'السائق', r: function (x) { return h(x.driverName); } }, { label: 'المبلغ', num: true, r: function (x) { return money(x.amount); } },
    { label: 'سلّمها', r: function (x) { return h(x.cashierName); } }, { label: 'الوقت', r: function (x) { return dt(x.createdAt); } },
    { label: '', r: function (x) { return canMove ? '<button class="btn btn-danger btn-sm" data-act="cancelF" data-id="' + h(x.id) + '"><i class="fas fa-times"></i> إلغاء وإرجاع للدرج</button>' : ''; } }], pf) + '</div>' : '';
  const recent = '<div class="biz-card"><h4><i class="fas fa-history"></i> آخر 24 ساعة</h4>' + bTable([
    { label: 'النوع', r: function (x) { return x.kind === 'float' ? '<span class="badge badge-info">عهدة للسائق</span>' : '<span class="badge badge-success">استلام نقد</span>'; } },
    { label: 'السائق', r: function (x) { return h(x.driverName); } }, { label: 'الكاشير', r: function (x) { return h(x.cashierName); } },
    { label: 'المطلوب', num: true, r: function (x) { return money(x.amount); } },
    { label: 'المستلم', num: true, r: function (x) { return x.kind === 'settle' ? money(x.counted) : '—'; } },
    { label: 'الفرق', num: true, r: function (x) { return x.kind === 'settle' ? '<span style="color:' + (Math.abs(x.difference || 0) < 0.01 ? '#6ee7b7' : '#f87171') + '">' + nf(x.difference || 0) + '</span>' : '—'; } },
    { label: 'الوقت', r: function (x) { return dt(x.doneAt); } },
    { label: '', r: function (x) { return x.kind === 'settle' ? '<button class="ico-btn" data-act="print" data-id="' + h(x.id) + '" title="طباعة إيصال"><i class="fas fa-print"></i></button>' : ''; } }], r.recent, { empty: 'لا توجد عمليات بعد' }) + '</div>';
  const all = r.pending.concat(r.recent);
  const done = function () { if (onChange) try { onChange(); } catch (e) { /* */ } dlCashModal(onChange); };
  const settle = function (m, payload, due, name) {
    bPrompt('استلام النقد من ' + name, [
      { type: 'html', html: '<div class="muted" style="line-height:1.9">المطلوب استلامه (العهدة + تحصيلات الدفع عند الاستلام): <b style="color:#6ee7b7">' + money(due) + '</b><br>عُدّ المبلغ وأدخل المستلم فعلياً. تُغلق طلبات السائق في ورديتك كمبيعات نقدية، ويُسجّل أي فرق.</div>' },
      { k: 'counted', label: 'المبلغ المستلم فعلياً', type: 'number', req: true, def: due },
      { k: 'notes', label: 'ملاحظات', type: 'textarea', rows: 2 }], {}, async function (v) {
      const x = await bzOk('driverSettle', Object.assign({ counted: v.counted, notes: v.notes }, payload));
      const df = x.item.difference || 0;
      showToast('تم الاستلام وإغلاق وردية ' + name + (Math.abs(df) >= 0.01 ? ' · الفرق ' + nf(df) : ''), Math.abs(df) >= 0.01);
      m.close(); done();
    }, { icon: 'cash-register', saveText: 'تأكيد الاستلام' });
  };
  DLC.m = bModal({ title: 'عهدة السائقين وتسليم النقد', icon: 'hand-holding-usd', xwide: true, print: false,
    sub: r.shift ? 'ورديتك: ' + h(r.shift.staffName) + ' · منذ ' + dt(r.shift.openedAt) : 'لا توجد وردية مفتوحة',
    body: warn + (pend.length ? '<h4 style="margin:4px 2px 8px"><i class="fas fa-bell"></i> سائقون يطلبون تسليم النقد (' + pend.length + ')</h4>' + settleCards : '') +
      '<div class="biz-card"><h4><i class="fas fa-id-badge"></i> السائقون</h4>' + drvTable +
      '<p class="muted" style="font-size:.78rem;margin-top:8px;line-height:1.8">' + (r.requireFloat ? 'السائق لا يستطيع بدء ورديته قبل استلام العهدة وتأكيدها من تطبيقه. ' : '') + 'تُخصم العهدة من درجك عند التسليم، وتعود إليه مع التحصيلات عند استلام النقد وإغلاق وردية السائق.</p></div>' + pfTable + recent,
    onClose: function () { DLC.m = null; },
    actions: {
      give: function (m, b) {
        bPrompt('تسليم عهدة للسائق ' + b.dataset.name, [{ type: 'html', html: '<div class="muted" style="line-height:1.9">يُخصم المبلغ من درج ورديتك، ويظهر للسائق في تطبيقه ليؤكد الاستلام' + (r.requireFloat ? ' ويبدأ ورديته' : '') + '.</div>' },
          { k: 'amount', label: 'مبلغ العهدة', type: 'number', req: true, def: r.defaultFloat || '' }, { k: 'notes', label: 'ملاحظات', type: 'textarea', rows: 2 }], {}, async function (v) {
          await bzOk('driverFloatIssue', { driverId: b.dataset.id, amount: v.amount, notes: v.notes });
          showToast('تم تسليم العهدة — بانتظار تأكيد السائق من تطبيقه'); m.close(); done();
        }, { icon: 'hand-holding-usd', saveText: 'تسليم' });
      },
      cancelF: async function (m, b) { if (!(await bConfirm('إلغاء العهدة وإرجاع المبلغ للدرج؟'))) return; await bzOk('driverFloatCancel', { id: b.dataset.id }); showToast('تم إلغاء العهدة'); m.close(); done(); },
      settleReq: function (m, b) { settle(m, { id: b.dataset.id }, +b.dataset.amt || 0, b.dataset.name); },
      settle: function (m, b) { settle(m, { driverId: b.dataset.id }, +b.dataset.amt || 0, b.dataset.name); },
      print: function (m, b) {
        const x = all.find(function (y) { return y.id === b.dataset.id; }); if (!x) return;
        printHtml('إيصال استلام نقد سائق', '<h2>' + h((B.acc && B.acc.restaurantName) || 'المطعم') + '</h2><h3>إيصال استلام نقد سائق</h3><table>' +
          [['السائق', h(x.driverName)], ['الكاشير', h(x.cashierName)], ['الوقت', dt(x.doneAt)], ['العهدة', nf(x.floatAmount)], ['تحصيلات الطلبات', nf(x.codTotal)], ['المطلوب', nf(x.amount)], ['المستلم', nf(x.counted)], ['الفرق', nf(x.difference)]]
            .map(function (rw) { return '<tr><td>' + rw[0] + '</td><td style="text-align:left">' + rw[1] + '</td></tr>'; }).join('') + '</table>' +
          (x.orders.length ? '<p style="margin-top:6px">الطلبات: ' + x.orders.map(function (o) { return '#' + o.number + ' (' + nf(o.total) + ')'; }).join('، ') + '</p>' : '') +
          '<p style="margin-top:18px">توقيع السائق: ____________</p><p>توقيع الكاشير: ____________</p>', (B.acc.biz && B.acc.biz.receipt && B.acc.biz.receipt.paper) || '80');
      },
    } });
}
