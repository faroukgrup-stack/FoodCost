// ============================================================
// biz-core.js — نواة نظام التشغيل (الباقات، الصلاحيات، الفروع، أدوات الواجهة)
// FoodCost 4.0
// ============================================================
var B = { acc: null, branch: localStorage.getItem('fcBranch') || '', pages: {}, current: null, notifTimer: null };

// ---------- الاتصال بالسيرفر ----------
async function bz(fn, params, opts) {
  params = params || {}; opts = opts || {};
  if (opts.loading) showLoading();
  try {
    const body = Object.assign({ branchId: B.branch || '', tzOffset: -new Date().getTimezoneOffset() }, params, {
      fn: fn, restaurantEmail: currentUserEmail, token: localStorage.getItem('foodUserToken') || ''
    });
    Object.keys(body).forEach(function (k) { if (body[k] && typeof body[k] === 'object') body[k] = JSON.stringify(body[k]); });
    const res = await fetch(COST_API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const r = await res.json();
    if (r && r.authError) { showToast('انتهت الجلسة، يرجى تسجيل الدخول مجدداً', true); setTimeout(function () { logout(); }, 1200); return { success: false, error: r.error }; }
    if (r && r.planError && !opts.silentPlan) bizUpgradeModal(r.requiredPlan, r.error);
    return r || { success: false, error: 'رد غير صالح' };
  } catch (e) { return { success: false, error: 'تعذر الاتصال بالسيرفر: ' + e.message }; }
  finally { if (opts.loading) hideLoading(); }
}
async function bzOk(fn, params, opts) {
  const r = await bz(fn, params, Object.assign({ loading: true }, opts || {}));
  if (r.success === false || r.status === 'error') { if (!r.planError) showToast(r.error || r.message || 'حدث خطأ', true); throw new Error(r.error || 'error'); }
  return r;
}

// ---------- أدوات ----------
const h = function (s) { return escapeHtml(s === null || s === undefined ? '' : String(s)).replace(/"/g, '&quot;').replace(/'/g, '&#39;'); };
function nf(n, d) { n = parseFloat(n) || 0; return n.toLocaleString('en-US', { minimumFractionDigits: d === undefined ? 2 : d, maximumFractionDigits: d === undefined ? 2 : d }); }
function curName() { return (typeof appCurrency !== 'undefined' && appCurrency) || (B.acc && B.acc.currency) || ''; }
function money(n) { return nf(n) + ' ' + h(curName()); }
function dt(v) { if (!v) return '—'; const d = new Date(v); return isNaN(d) ? h(v) : d.toLocaleString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }); }
function dOnly(v) { if (!v) return '—'; const d = new Date(v); return isNaN(d) ? h(v) : d.toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' }); }
function isoLocal(d) { d = d || new Date(); const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 10); }
function isoLocalDT(v) { const d = v ? new Date(v) : new Date(); const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 16); }
function daysAgo(n) { return isoLocal(new Date(Date.now() - n * 864e5)); }
function hasF(f) { return !!(B.acc && B.acc.features && B.acc.features.indexOf(f) >= 0); }
function canP() { if (!B.acc) return false; if (B.acc.isOwner) return true; const p = (B.acc.staff && B.acc.staff.permissions) || []; for (let i = 0; i < arguments.length; i++) if (p.indexOf(arguments[i]) >= 0) return true; return false; }
const PAY_NAMES = { cash: 'نقداً', card: 'بطاقة', transfer: 'تحويل', gift: 'بطاقة هدية', points: 'نقاط الولاء', credit: 'آجل' };
const ORDER_TYPES = { dine_in: 'محلي', takeaway: 'سفري', delivery: 'توصيل' };
const ORDER_STATUS = { open: ['مفتوح', 'badge-warning'], paid: ['مدفوع', 'badge-success'], cancelled: ['ملغى', 'badge-dog'], refunded: ['مسترجع', 'badge-question'] };
function stBadge(map, k) { const x = map[k] || [k, 'badge-info']; return '<span class="badge ' + x[1] + '">' + h(x[0]) + '</span>'; }

// ---------- نوافذ ----------
function bModal(o) {
  const canPr = o.print !== false && typeof rptElExport === 'function' && (o.print || /<table/.test(o.body || '')) && !/fa-print/.test(o.foot || '');
  const ov = document.createElement('div');
  ov.className = 'modal-overlay active biz-modal';
  ov.innerHTML = '<div class="modal-box ' + (o.wide ? 'wide' : '') + (o.xwide ? ' xwide' : '') + '">' +
    '<div class="modal-header-pro"><div class="mh-left"><div class="mh-icon"><i class="fas fa-' + (o.icon || 'pen') + '"></i></div><div><h3>' + h(o.title) + '</h3>' + (o.sub ? '<div class="mh-sub">' + h(o.sub) + '</div>' : '') + '</div></div>' +
    '<button type="button" class="modal-close-btn" data-x aria-label="إغلاق"><i class="fas fa-times"></i></button></div>' +
    '<div class="modal-body-pro">' + (o.body || '') + '</div>' + (o.foot !== false ? '<div class="modal-footer-pro">' + (o.foot || '<button class="btn btn-cancel" data-x>إغلاق</button>') + (canPr ? '<button class="btn btn-outline" data-pr="print"><i class="fas fa-print"></i> طباعة</button><button class="btn btn-outline" data-pr="excel"><i class="fas fa-file-excel"></i> Excel</button>' : '') + '</div>' : '') + '</div>';
  document.body.appendChild(ov);
  const m = { el: ov, $: function (s) { return ov.querySelector(s); }, $$: function (s) { return Array.from(ov.querySelectorAll(s)); },
    close: function () { ov.remove(); if (o.onClose) o.onClose(); } };
  ov.addEventListener('click', function (e) {
    if (e.target === ov || e.target.closest('[data-x]')) { m.close(); return; }
    const pr = e.target.closest('[data-pr]');
    if (pr) { rptElExport(pr.dataset.pr, o.title, ov.querySelector('.modal-body-pro'), o.sub).catch(function (er) { showToast('تعذر التصدير: ' + er.message, true); }); return; }
    const a = e.target.closest('[data-act]');
    if (a && o.actions && o.actions[a.dataset.act]) { e.preventDefault(); o.actions[a.dataset.act](m, a); }
  });
  if (o.onOpen) o.onOpen(m);
  return m;
}
function bConfirm(msg, title) {
  return new Promise(function (res) {
    bModal({ title: title || 'تأكيد', icon: 'question-circle', body: '<p style="line-height:1.9">' + h(msg) + '</p>',
      foot: '<button class="btn btn-cancel" data-x>إلغاء</button><button class="btn btn-primary" data-act="ok">تأكيد</button>',
      actions: { ok: function (m) { res(true); m.close(); } }, onClose: function () { res(false); } });
  });
}
function bPrompt(title, fields, values, onSave, o) {
  o = o || {};
  return bModal({ title: title, icon: o.icon || 'pen', sub: o.sub, wide: o.wide, body: bForm(fields, values || {}) + (o.extra || ''),
    foot: '<button class="btn btn-cancel" data-x>إلغاء</button><button class="btn btn-primary" data-act="save"><i class="fas fa-check"></i> ' + (o.saveText || 'حفظ') + '</button>',
    onOpen: o.onOpen,
    actions: Object.assign({ save: async function (m, btn) {
      const data = readForm(m.el, fields);
      for (const f of fields) if (f.req && (data[f.k] === '' || data[f.k] === null || data[f.k] === undefined)) { showToast('الحقل مطلوب: ' + f.label, true); return; }
      btn.disabled = true;
      try { const r = await onSave(data, m); if (r !== false) m.close(); } catch (e) { /* أُظهرت الرسالة */ } finally { btn.disabled = false; }
    } }, o.actions || {}) });
}

// ---------- النماذج ----------
function bForm(fields, v) {
  v = v || {};
  let out = '<div class="biz-form">';
  fields.forEach(function (f) {
    if (f.type === 'section') { out += '<div class="biz-sec full">' + h(f.label) + '</div>'; return; }
    if (f.type === 'html') { out += '<div class="full">' + f.html + '</div>'; return; }
    const val = v[f.k] !== undefined && v[f.k] !== null ? v[f.k] : (f.def !== undefined ? f.def : '');
    const id = 'bf_' + f.k;
    let input = '';
    if (f.type === 'select') {
      input = '<select data-k="' + f.k + '" id="' + id + '">' + (f.options || []).map(function (o) { const ov = Array.isArray(o) ? o[0] : o, ol = Array.isArray(o) ? o[1] : o; return '<option value="' + h(ov) + '"' + (String(ov) === String(val) ? ' selected' : '') + '>' + h(ol) + '</option>'; }).join('') + '</select>';
    } else if (f.type === 'textarea') {
      input = '<textarea data-k="' + f.k + '" id="' + id + '" rows="' + (f.rows || 3) + '" placeholder="' + h(f.ph || '') + '">' + h(val) + '</textarea>';
    } else if (f.type === 'checkbox') {
      out += '<label class="biz-check ' + (f.full ? 'full' : '') + '"><input type="checkbox" data-k="' + f.k + '" id="' + id + '"' + (val === true || val === 'true' ? ' checked' : '') + '> <span>' + h(f.label) + '</span>' + (f.hint ? '<small>' + h(f.hint) + '</small>' : '') + '</label>';
      return;
    } else {
      const t = f.type === 'datetime' ? 'datetime-local' : (f.type || 'text');
      input = '<input type="' + t + '" data-k="' + f.k + '" id="' + id + '" value="' + h(val) + '"' + (f.step ? ' step="' + f.step + '"' : (t === 'number' ? ' step="any"' : '')) + (f.ph ? ' placeholder="' + h(f.ph) + '"' : '') + (f.ltr ? ' dir="ltr"' : '') + (f.ro ? ' readonly' : '') + '>';
    }
    out += '<div class="' + (f.full ? 'full' : '') + '"><label class="pro-label" for="' + id + '">' + h(f.label) + (f.req ? ' <span style="color:#ef4444">*</span>' : '') + '</label><div class="pro-input-wrap">' + input + '</div>' + (f.hint ? '<div class="biz-hint">' + h(f.hint) + '</div>' : '') + '</div>';
  });
  return out + '</div>';
}
function readForm(root, fields) {
  const o = {};
  fields.forEach(function (f) {
    if (!f.k) return;
    const el = root.querySelector('[data-k="' + f.k + '"]');
    if (!el) return;
    if (f.type === 'checkbox') o[f.k] = el.checked;
    else if (f.type === 'number') o[f.k] = el.value === '' ? '' : parseFloat(el.value);
    else if (f.type === 'datetime') o[f.k] = el.value ? new Date(el.value).toISOString() : '';
    else o[f.k] = el.value.trim();
  });
  return o;
}

// ---------- الجداول ----------
function bTable(cols, rows, o) {
  o = o || {};
  if (!rows || !rows.length) return '<div class="empty-state"><i class="fas fa-' + (o.emptyIcon || 'inbox') + '" style="font-size:2rem;opacity:.5"></i><p style="margin-top:10px">' + h(o.empty || 'لا توجد بيانات بعد') + '</p></div>';
  return '<div class="table-container biz-table"><table><thead><tr>' + cols.map(function (c) { return '<th' + (c.num ? ' class="num"' : '') + '>' + h(c.label) + '</th>'; }).join('') + '</tr></thead><tbody>' +
    rows.map(function (r, i) { return '<tr' + (o.rowAttr ? ' ' + o.rowAttr(r, i) : '') + '>' + cols.map(function (c) { return '<td' + (c.num ? ' class="num"' : '') + '>' + c.r(r, i) + '</td>'; }).join('') + '</tr>'; }).join('') +
    '</tbody>' + (o.foot ? '<tfoot>' + o.foot + '</tfoot>' : '') + '</table></div>';
}
function kpis(list) {
  return '<div class="biz-kpis">' + list.map(function (k) { return '<div class="dash-card"><div class="label">' + h(k[0]) + '</div><div class="value" style="' + (k[3] ? 'color:' + k[3] : '') + '">' + k[1] + '</div>' + (k[2] ? '<div class="sub">' + k[2] + '</div>' : '') + '</div>'; }).join('') + '</div>';
}
function subTabs(id, tabs, active) {
  return '<div class="biz-subtabs" id="' + id + '">' + tabs.map(function (t) { return '<button class="biz-subtab' + (t[0] === active ? ' active' : '') + (t[3] ? ' locked' : '') + '" data-sub="' + t[0] + '"><i class="fas fa-' + t[2] + '"></i> ' + h(t[1]) + (t[3] ? ' <i class="fas fa-lock" style="font-size:.7rem"></i>' : '') + '</button>'; }).join('') + '</div>';
}
function bindSubTabs(root, id, cb) {
  const bar = root.querySelector('#' + id);
  bar.addEventListener('click', function (e) {
    const b = e.target.closest('[data-sub]'); if (!b) return;
    if (b.classList.contains('locked')) { bizUpgradeModal(b.dataset.plan || 'premium'); return; }
    bar.querySelectorAll('.biz-subtab').forEach(function (x) { x.classList.toggle('active', x === b); });
    cb(b.dataset.sub);
  });
}
function dateRangeBar(id, from, to, extra) {
  return '<div class="biz-filter" id="' + id + '"><label>من <input type="date" data-f="from" value="' + (from || daysAgo(29)) + '"></label><label>إلى <input type="date" data-f="to" value="' + (to || isoLocal()) + '"></label>' +
    '<div class="biz-quick"><button class="btn btn-outline btn-sm" data-q="0">اليوم</button><button class="btn btn-outline btn-sm" data-q="6">7 أيام</button><button class="btn btn-outline btn-sm" data-q="29">30 يوم</button></div>' + (extra || '') +
    '<button class="btn btn-primary btn-sm" data-go><i class="fas fa-filter"></i> عرض</button></div>';
}
function bindRange(root, id, cb) {
  const bar = root.querySelector('#' + id);
  const get = function () { const o = {}; bar.querySelectorAll('[data-f]').forEach(function (i) { o[i.dataset.f] = i.value; }); return o; };
  bar.addEventListener('click', function (e) {
    const q = e.target.closest('[data-q]');
    if (q) { bar.querySelector('[data-f=from]').value = daysAgo(+q.dataset.q); bar.querySelector('[data-f=to]').value = isoLocal(); cb(get()); }
    if (e.target.closest('[data-go]')) cb(get());
  });
  return get;
}

// ---------- الكيانات العامة (قائمة/تعديل/حذف) ----------
async function entList(kind, params) { const r = await bzOk('entityList', Object.assign({ kind: kind }, params || {}), { loading: false }); return r.rows || []; }
async function entSave(kind, data) { const r = await bzOk('entitySave', { kind: kind, data: data }); showToast('تم الحفظ'); return r.row; }
async function entDel(kind, id, label) {
  if (!(await bConfirm('هل تريد حذف ' + (label || 'هذا السجل') + '؟ لا يمكن التراجع.'))) return false;
  await bzOk('entityDelete', { kind: kind, id: id }); showToast('تم الحذف'); return true;
}

// ---------- الباقات وشاشة الترقية ----------
function planBadge(k) { const p = fcPlanByKey(k); return '<span class="plan-chip plan-' + p.key + '">' + h(p.name) + '</span>'; }
function bizUpgradeModal(required, msg) {
  if (document.querySelector('.biz-upgrade')) return;
  const p = fcPlanByKey(required || 'pro');
  const m = bModal({ title: 'ميزة ضمن باقة ' + p.name, icon: 'crown', xwide: true,
    body: '<p style="margin-bottom:14px;line-height:1.9">' + h(msg || ('هذه الميزة متاحة في باقة «' + p.name + '» بقيمة ' + p.price + ' دولار سنوياً.')) + ' باقتك الحالية: ' + planBadge(B.acc ? B.acc.plan : 'basic') + '</p>' + fcPlanCompareHtml(B.acc ? B.acc.plan : 'basic'),
    foot: '<button class="btn btn-cancel" data-x>لاحقاً</button>' + (B.acc && B.acc.isOwner ? '<button class="btn btn-primary" data-act="go"><i class="fas fa-arrow-up"></i> الترقية إلى ' + h(p.name) + '</button>' : '<span style="color:var(--text-muted);font-size:.85rem">تواصل مع صاحب الحساب للترقية</span>'),
    actions: { go: function (mm) { mm.close(); bizOpenPayment(p.key); } } });
  m.el.classList.add('biz-upgrade');
}
function bizOpenPayment(planKey) {
  if (B.acc && !B.acc.isOwner) { showToast('الباقات والاشتراكات متاحة لصاحب الحساب فقط', true); return; }
  const links = typeof PAYMENT_LINKS !== 'undefined' ? PAYMENT_LINKS : {};
  const linkOf = function (k) { return links[k] || (typeof PAYMENT_LINK !== 'undefined' ? PAYMENT_LINK : ''); };
  const cur = B.acc && B.acc.plan;
  let sel = planKey || (cur === 'basic' ? 'pro' : 'premium');
  const cards = FC_PLANS.map(function (p) {
    return '<label class="pay-plan' + (p.key === sel ? ' on' : '') + '" data-plan="' + p.key + '"><input type="radio" name="payPlan" value="' + p.key + '"' + (p.key === sel ? ' checked' : '') + '>' +
      (p.popular ? '<span class="pp-pop">الأكثر طلباً</span>' : '') + (p.key === cur ? '<span class="pp-cur">باقتك الحالية</span>' : '') +
      '<b>' + h(p.name) + '</b><div class="pp-price">' + p.price + '<small>$ / سنوياً</small></div><small class="pp-tag">' + h(p.tag) + '</small><small class="pp-br">' + h(p.branches || '') + '</small></label>';
  }).join('');
  const m = bModal({ title: 'اختيار الباقة والدفع', icon: 'crown', xwide: true, print: false, sub: 'اختر الباقة ثم أكمل الدفع — تُفعَّل الباقة تلقائياً بعد تأكيد بوابة الدفع',
    body: '<div class="pay-plans">' + cards + '</div>' +
      '<div class="pay-one"><div class="pay-step"><span>1</span> ادفع قيمة الباقة <b id="ppSelName"></b></div>' +
      '<p class="muted" style="margin:6px 0 12px;font-size:13px">ستُفتح صفحة الدفع الآمنة. استخدم في صفحة الدفع نفس بريد حسابك <b dir="ltr">' + h(currentUserEmail || '') + '</b>. بعد إتمام الدفع سيتم تحويلك تلقائياً إلى صفحة التفعيل لتفعيل الباقة على حسابك (التجديد يضيف سنة، والترقية تحوّل المتبقي من اشتراكك إلى أيام إضافية).</p>' +
      '<button class="btn btn-primary" data-act="pay" style="width:100%;font-size:16px;padding:12px"><i class="fas fa-lock"></i> الدفع الآن</button>' +
      '<div id="ppWait" class="pay-wait" style="display:none"><i class="fas fa-spinner fa-pulse"></i> <span>بانتظار تأكيد الدفع من البوابة... يمكنك ترك هذه النافذة مفتوحة</span></div>' +
      '<details class="pay-help"><summary>دفعت ولم تُفعَّل الباقة؟</summary><p class="muted" style="font-size:12px">أرسل رقم العملية الموجود في بريد تأكيد الدفع وسيتم التحقق منه وتفعيل الباقة تلقائياً بعد تأكيده.</p>' +
      bForm([{ k: 'txId', label: 'رقم العملية', ltr: true, full: true, ph: '12345678' }, { k: 'password', label: 'كلمة مرور حسابك', type: 'password', full: true }], {}) +
      '<button class="btn btn-outline" data-act="claim" style="width:100%;margin-top:8px"><i class="fas fa-paper-plane"></i> إرسال للتحقق</button>' +
      '<a class="btn btn-success" style="width:100%;margin-top:8px" target="_blank" id="ppWa" href="#"><i class="fab fa-whatsapp"></i> مساعدة عبر واتساب</a></details></div>',
    foot: '<button class="btn btn-cancel" data-x>إغلاق</button>',
    onClose: function () { clearInterval(B.payPoll); },
    actions: {
      pay: async function (mm, btn) {
        const r = await bz('paymentStart', { plan: sel });
        if (!r.success) { showToast(r.error || 'تعذر بدء الدفع', true); return; }
        let url = linkOf(sel);
        try { const u = new URL(url); u.searchParams.set('email', currentUserEmail || ''); u.searchParams.set('ref', r.id); url = u.toString(); } catch (e) { /* */ }
        fcPayFrame(url, 'الدفع — باقة ' + fcPlanByKey(sel).name + ' (' + fcPlanByKey(sel).price + '$ سنوياً)');
        mm.$('#ppWait').style.display = '';
        bizWatchPayment(mm);
      },
      claim: async function (mm, btn) {
        const tx = mm.$('[data-k=txId]').value.trim(), pw = mm.$('[data-k=password]').value;
        if (!/^[A-Za-z0-9\-]{6,}$/.test(tx)) { showToast('أدخل رقم العملية كما في بريد التأكيد', true); return; }
        if (!pw) { showToast('أدخل كلمة المرور', true); return; }
        btn.disabled = true;
        try {
          const res = await fetch(COST_API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify({ fn: 'renewSubscription', email: currentUserEmail, password: pw, txId: tx, plan: sel }) });
          const x = await res.json();
          if (x.status === 'success') { showToast('تم تفعيل باقة ' + fcPlanByKey(sel).name); mm.close(); setTimeout(function () { location.reload(); }, 1200); }
          else if (x.pending) { showToast(x.message); mm.$('#ppWait').style.display = ''; bizWatchPayment(mm); }
          else showToast(x.message || x.error || 'تعذر الإرسال', true);
        } catch (e) { showToast('تعذر الاتصال بالخادم', true); }
        btn.disabled = false;
      }
    } });
  const sync = function () {
    const p = fcPlanByKey(sel);
    m.$$('.pay-plan').forEach(function (x) { x.classList.toggle('on', x.dataset.plan === sel); });
    m.$('#ppSelName').textContent = p.name + ' — ' + p.price + '$ سنوياً';
    const wa = (typeof SUPPORT_WHATSAPP !== 'undefined' && SUPPORT_WHATSAPP) || '';
    m.$('#ppWa').href = 'https://wa.me/' + wa + '?text=' + encodeURIComponent('مرحباً، دفعت اشتراك باقة ' + p.name + ' (' + p.price + '$ سنوياً) ولم تتفعل — الحساب: ' + (currentUserEmail || ''));
  };
  m.$$('input[name=payPlan]').forEach(function (r) { r.addEventListener('change', function () { sel = r.value; sync(); }); });
  sync();
}
// v4.4: نافذة دفع منبثقة داخل النظام (مع خيار الفتح في نافذة جديدة)
function fcPayFrame(url, title) {
  let ov = document.getElementById('fcPayFrame');
  if (!ov) {
    ov = document.createElement('div'); ov.id = 'fcPayFrame';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:100000;display:flex;align-items:center;justify-content:center;padding:12px';
    ov.innerHTML = '<div style="background:#fff;border-radius:16px;width:100%;max-width:860px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.45);display:flex;flex-direction:column;max-height:96vh">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:linear-gradient(135deg,#1f2433,#b48554);color:#fff"><b id="fcPayT" style="font-size:15px"></b><button type="button" data-x style="background:none;border:0;color:#fff;font-size:26px;cursor:pointer;line-height:1">&times;</button></div>' +
      '<iframe id="fcPayF" allow="payment *" style="width:100%;height:76vh;border:0;display:block;background:#fff"></iframe>' +
      '<div style="padding:10px 16px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;color:#333;font-size:12.5px"><span>بعد تأكيد الدفع يتم تحويلك تلقائياً لصفحة التفعيل.</span><a id="fcPayO" target="_blank" rel="noopener" style="color:#b48554;font-weight:700">لم تظهر صفحة الدفع؟ افتحها في نافذة جديدة</a></div></div>';
    document.body.appendChild(ov);
    const close = function () { ov.style.display = 'none'; document.getElementById('fcPayF').src = 'about:blank'; };
    ov.addEventListener('click', function (e) { if (e.target === ov || e.target.closest('[data-x]')) close(); });
  }
  document.getElementById('fcPayT').textContent = title || 'الدفع الآمن';
  document.getElementById('fcPayF').src = url;
  document.getElementById('fcPayO').href = url;
  ov.style.display = 'flex';
}
// متابعة حالة الدفع حتى يؤكد الخادم التفعيل
function bizWatchPayment(mm) {
  const startPlan = B.acc && B.acc.plan, startExp = B.acc && B.acc.expiryDate;
  clearInterval(B.payPoll); let n = 0;
  B.payPoll = setInterval(async function () {
    if (++n > 200) { clearInterval(B.payPoll); return; }
    const r = await bz('paymentStatus', {}, { silentPlan: true });
    if (!r.success) return;
    const last = (r.requests || [])[0];
    if ((last && last.status === 'approved' && last.decided_at && Date.now() - new Date(last.decided_at).getTime() < 3 * 36e5) || r.plan !== startPlan || (r.expiry && startExp && r.expiry !== startExp)) {
      clearInterval(B.payPoll);
      showToast('تم تأكيد الدفع وتفعيل الباقة بنجاح');
      if (mm && mm.close) mm.close();
      setTimeout(function () { location.href = location.pathname; }, 1500);
    } else if (last && last.status === 'rejected') { clearInterval(B.payPoll); showToast('لم يتم تأكيد عملية الدفع — تواصل مع الدعم', true); }
  }, 6000);
}
// العودة من بوابة الدفع: ?payment=success
function bizPaymentReturn() {
  const q = new URLSearchParams(location.search);
  if (!q.get('payment') || !B.acc || !B.acc.isOwner) return;
  history.replaceState(null, '', location.pathname);
  if (q.get('payment') === 'success' || q.get('payment') === 'paid') {
    const m = bModal({ title: 'جاري تأكيد الدفع', icon: 'crown', print: false, body: '<div class="pay-wait"><i class="fas fa-spinner fa-pulse"></i> شكراً لك — نتحقق من عملية الدفع وسيتم تفعيل باقتك خلال لحظات.</div>', foot: '<button class="btn btn-cancel" data-x>إغلاق</button>', onClose: function () { clearInterval(B.payPoll); } });
    bizWatchPayment(m);
  } else showToast('لم تكتمل عملية الدفع', true);
}
function lockedView(root, feature, page) {
  const req = page.plan || 'pro', p = fcPlanByKey(req);
  root.innerHTML = '<div class="biz-locked"><div class="lk-icon"><i class="fas fa-' + page.icon + '"></i></div><h2>' + h(page.title) + '</h2>' +
    '<p>' + h(page.pitch || '') + '</p><p class="lk-plan">متاحة في باقة ' + planBadge(req) + ' بقيمة <b>' + p.price + ' دولار</b> سنوياً</p>' +
    (B.acc && B.acc.isOwner ? '<button class="btn btn-primary" onclick="bizOpenPayment(\'' + req + '\')"><i class="fas fa-crown"></i> الترقية الآن</button> ' : '') +
    '<button class="btn btn-outline" onclick="switchTab(\'plans\')"><i class="fas fa-table"></i> مقارنة الباقات</button></div>';
}

// ---------- تسجيل الصفحات والقائمة الجانبية ----------
// group, title, icon, feature, perms[], plan (المطلوبة)، render(root)
function bizPage(key, def) { B.pages[key] = def; }
const BIZ_GROUPS = [['ops', 'التشغيل'], ['stock', 'المخزون والمشتريات'], ['crm', 'العملاء والتسويق'], ['fin', 'المالية والتقارير'], ['admin', 'الإدارة'], ['acct', 'الحساب']];
function buildBizSidebar() {
  const nav = document.querySelector('.sidebar-nav'); if (!nav) return;
  nav.querySelectorAll('.biz-nav, .biz-group-title').forEach(function (x) { x.remove(); });
  // إخفاء أقسام التكلفة لمن لا يملك صلاحيتها
  const legacy = { '0': 'costing', '1': 'costing', '2': 'costing', '3': 'costing', '5': 'digital_menu', '4': 'reviews', 'dashboard': null };
  nav.querySelectorAll('.nav-btn[data-tab]').forEach(function (b) { const p = legacy[b.dataset.tab]; if (p !== undefined) b.style.display = (!p || canP(p)) ? '' : 'none'; });
  if (!nav.querySelector('.biz-costing-title')) { const t = document.createElement('div'); t.className = 'biz-group-title biz-costing-title'; t.textContent = 'التكلفة والمينيو'; const d = nav.querySelector('.nav-btn[data-tab="0"]'); if (d) nav.insertBefore(t, d); }
  const ct = nav.querySelector('.biz-costing-title');
  if (ct) ct.style.display = ['0', '1', '2', '3', '4', '5'].some(function (k) { const b = nav.querySelector('.nav-btn[data-tab="' + k + '"]'); return b && b.style.display !== 'none'; }) ? '' : 'none';
  BIZ_GROUPS.forEach(function (g) {
    const items = Object.keys(B.pages).filter(function (k) { const p = B.pages[k]; return p.group === g[0] && (!p.perms || canP.apply(null, p.perms)) && (!p.ownerOnly || B.acc.isOwner); });
    if (!items.length) return;
    const t = document.createElement('div'); t.className = 'biz-group-title'; t.textContent = g[1]; nav.appendChild(t);
    items.forEach(function (k) {
      const p = B.pages[k], locked = p.feature && !hasF(p.feature);
      const b = document.createElement('button'); b.type = 'button'; b.className = 'nav-btn biz-nav' + (locked ? ' locked' : ''); b.dataset.tab = k;
      b.innerHTML = '<i class="fas fa-' + p.icon + '"></i> <span>' + h(p.title) + '</span>' + (locked ? '<span class="nav-lock">' + h(fcPlanByKey(p.plan || 'pro').name) + ' <i class="fas fa-lock"></i></span>' : '');
      b.onclick = function () { switchTab(k); };
      nav.appendChild(b);
    });
  });
}
function ensureBizContainer() {
  let el = document.getElementById('tabBiz');
  if (!el) { el = document.createElement('div'); el.id = 'tabBiz'; el.style.display = 'none'; document.querySelector('.app-main-content').appendChild(el); }
  return el;
}
async function renderBizPage(key) {
  const root = ensureBizContainer(), p = B.pages[key];
  root.style.display = 'block';
  B.current = key;
  if (!B.acc) await loadAccount();
  if (p.feature && !hasF(p.feature)) { lockedView(root, p.feature, p); return; }
  if ((p.ownerOnly && !B.acc.isOwner) || (p.perms && !canP.apply(null, p.perms))) { root.innerHTML = '<div class="empty-state" style="padding:40px"><i class="fas fa-lock" style="font-size:2rem;opacity:.5"></i><p style="margin-top:10px">هذا القسم متاح للحساب الرئيسي فقط</p></div>'; return; }
  root.innerHTML = '<div class="biz-page-head">' + (p.noPrint || typeof bizPageTools !== 'function' ? '' : bizPageTools()) + '<h2><i class="fas fa-' + p.icon + '"></i> ' + h(p.title) + '</h2>' + (p.sub ? '<p>' + h(p.sub) + '</p>' : '') + '</div><div class="biz-page-body"><div class="empty-state"><i class="fas fa-spinner fa-pulse"></i></div></div>';
  try { await p.render(root.querySelector('.biz-page-body'), root); }
  catch (e) { console.error(e); if (B.current === key) root.querySelector('.biz-page-body').innerHTML = '<div class="empty-state">تعذر تحميل الصفحة: ' + h(e.message) + '</div>'; }
}

// ---------- الحساب والفرع ----------
// إعدادات المطعم والنسخ الاحتياطي والباقات للحساب الرئيسي فقط
function bizOwnerGuards() {
  ['showSettingsModal', 'backupData', 'openPaymentModal', 'exportFullReportExcel', 'exportFullReportWord', 'bizOpenPayment'].forEach(function (n) {
    const f = window[n]; if (typeof f !== 'function' || f.__guarded) return;
    const g = function () { if (B.acc && !B.acc.isOwner) { showToast('هذا الإجراء متاح للحساب الرئيسي فقط', true); return; } return f.apply(this, arguments); };
    g.__guarded = true; window[n] = g;
  });
}
async function loadAccount() {
  const r = await bz('getAccountInfo', {}, { silentPlan: true, loading: false }).catch(function () { return {}; });
  if (!r || !r.success) {
    if (r && /دالة غير معروفة|غير معروفة/.test(r.error || '')) showToast('السيرفر على Supabase ما زال بالإصدار القديم — أعد نشر الدالة api بملف index.ts الجديد', true);
    return null;
  }
  B.acc = r;
  if (r.branches && r.branches.length) {
    if (!r.branches.some(function (b) { return b.id === B.branch; })) B.branch = r.branches[0].id;
  } else B.branch = '';
  localStorage.setItem('fcBranch', B.branch);
  if (r.currency) appCurrency = r.currency;
  document.body.classList.toggle('is-staff', !r.isOwner);
  bizOwnerGuards();
  buildBizSidebar();
  renderHeaderExtras();
  if (hasF('notifications')) { refreshNotifications(); clearInterval(B.notifTimer); B.notifTimer = setInterval(refreshNotifications, 30000); }
  if (typeof bizLiveStart === 'function') bizLiveStart();
  setTimeout(bizPaymentReturn, 300);
  const vb = document.querySelector('.version-badge'); if (vb) vb.innerHTML = '<i class="fas fa-code-branch"></i> الإصدار 4.5 · ' + planBadge(r.plan);
  return r;
}
function renderHeaderExtras() {
  const hdr = document.querySelector('.app-header'); if (!hdr || !B.acc) return;
  let box = document.getElementById('bizHeaderExtras');
  if (!box) { box = document.createElement('div'); box.id = 'bizHeaderExtras'; box.className = 'biz-header-extras'; const dd = hdr.querySelector('.restaurant-dropdown-wrap'); hdr.insertBefore(box, dd); }
  let html = B.acc.isOwner ? '<span class="plan-chip plan-' + B.acc.plan + '" title="باقتك الحالية" onclick="switchTab(\'plans\')" style="cursor:pointer">' + h(B.acc.planName) + '</span>' : '';
  if (B.acc.staff) html += '<span class="staff-chip"><i class="fas fa-user-tie"></i> ' + h(B.acc.staff.name) + ' · ' + h(B.acc.staff.roleName) + '</span>';
  const curBr = (B.acc.branches || []).find(function (b) { return b.id === ((B.acc.staff && B.acc.staff.branchId) || B.branch); }) || (B.acc.branches || [])[0];
  if (curBr && (B.acc.staff || !(hasF('pos') && B.acc.branches.length > 1))) html += '<span class="staff-chip branch-chip" title="الفرع الحالي"><i class="fas fa-store"></i> ' + h(curBr.name) + '</span>';
  if (hasF('pos') && B.acc.branches && B.acc.branches.length > 1 && (B.acc.isOwner || !B.acc.staff.branchId)) {
    html += '<select id="bizBranchSel" class="biz-branch-sel" title="الفرع">' + B.acc.branches.map(function (b) { return '<option value="' + b.id + '"' + (b.id === B.branch ? ' selected' : '') + '>' + h(b.name) + '</option>'; }).join('') + '</select>';
  }
  if (hasF('notifications')) html += '<button class="biz-bell" id="bizBell" title="الإشعارات"><i class="fas fa-bell"></i><span class="bell-n" id="bizBellN" style="display:none">0</span></button>';
  box.innerHTML = html;
  const sel = document.getElementById('bizBranchSel');
  if (sel) sel.onchange = function () { B.branch = sel.value; localStorage.setItem('fcBranch', B.branch); showToast('تم التبديل إلى ' + sel.options[sel.selectedIndex].text); if (B.current && B.pages[B.current]) renderBizPage(B.current); refreshNotifications(); };
  const bell = document.getElementById('bizBell');
  if (bell) bell.onclick = showNotifications;
}
B.notifs = [];
async function refreshNotifications() {
  if (!hasF('notifications')) return;
  const r = await bz('getNotifications', {}, { silentPlan: true });
  if (!r.success) return;
  B.notifs = r.notifications || [];
  const n = document.getElementById('bizBellN');
  if (n) { n.textContent = B.notifs.length; n.style.display = B.notifs.length ? '' : 'none'; }
}
function showNotifications() {
  const list = B.notifs.length ? B.notifs.map(function (x, i) {
    return '<div class="notif notif-' + x.level + '" data-act="go" data-i="' + i + '"><i class="fas fa-' + x.icon + '"></i><div><b>' + h(x.title) + '</b><div>' + h(x.message) + '</div></div></div>';
  }).join('') : '<div class="empty-state">لا توجد إشعارات حالياً</div>';
  bModal({ title: 'الإشعارات الذكية', icon: 'bell', body: list,
    actions: { go: function (m, el) { const x = B.notifs[+el.dataset.i]; m.close(); if (x && x.tab && B.pages[x.tab]) switchTab(x.tab); } } });
}

// ---------- ربط switchTab والتهيئة ----------
(function () {
  const orig = window.switchTab;
  window.switchTab = function (n) {
    if (typeof n === 'string' && B.pages[n]) {
      currentTab = n;
      const dash = document.getElementById('tabDashboard'); if (dash) dash.style.display = 'none';
      ['tab0', 'tab1', 'tab2', 'tab3', 'tab4', 'tab5'].forEach(function (id) { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
      document.querySelectorAll('.nav-btn').forEach(function (b) { b.classList.toggle('active', b.dataset.tab === n); });
      closeMobileMenu();
      window.scrollTo(0, 0);
      renderBizPage(n);
      return;
    }
    B.current = null;
    const el = document.getElementById('tabBiz'); if (el) { el.style.display = 'none'; el.innerHTML = ''; }
    if (B.acc && !B.acc.isOwner) {
      const need = { 0: 'costing', 1: 'costing', 2: 'costing', 3: 'costing', 5: 'digital_menu', 4: 'reviews' }[n];
      if (need && !canP(need)) { showToast('لا تملك صلاحية لهذا القسم', true); return; }
    }
    return orig(n);
  };
  const origDash = window.loadDashboard;
  window.loadDashboard = async function () {
    if (!B.acc) await loadAccount();
    renderBizDashboard();
    if (B.acc && !B.acc.isOwner && !canP('costing', 'reports')) {
      ['dashboardAlerts', 'dashboardCards', 'dashboardGrid'].forEach(function (id) { const e = document.getElementById(id); if (e) e.classList.add('biz-hide'); });
      return;
    }
    ['dashboardAlerts', 'dashboardCards', 'dashboardGrid'].forEach(function (id) { const e = document.getElementById(id); if (e) e.classList.remove('biz-hide'); });
    return origDash();
  };
  const origLogout = window.logout;
  window.logout = function () { B.acc = null; clearInterval(B.notifTimer); if (window.bizLiveStop) bizLiveStop(); localStorage.removeItem('foodStaff'); const x = document.getElementById('bizHeaderExtras'); if (x) x.remove(); document.querySelectorAll('.biz-nav,.biz-group-title').forEach(function (e) { e.remove(); }); return origLogout(); };
  const origLoad = window.loadAllData;
  window.loadAllData = async function (f) { const r = await origLoad(f); if (!B.acc) await loadAccount(); return r; };
})();

async function renderBizDashboard() {
  const dash = document.getElementById('tabDashboard'); if (!dash || !B.acc) return;
  let box = document.getElementById('bizDashboard');
  if (!box) { box = document.createElement('div'); box.id = 'bizDashboard'; dash.insertBefore(box, dash.firstChild); }
  if (!hasF('pos')) {
    box.innerHTML = B.acc.isOwner ? '<div class="biz-upsell"><div><b><i class="fas fa-rocket"></i> طوّر مطعمك إلى نظام تشغيل متكامل</b><p>الكاشير، المخزون، العملاء والولاء، الطاولات والحجوزات، الفوترة الإلكترونية والتقارير — في باقة الإنطلاقة (300$ سنوياً) أو المتقدمة (500$ سنوياً).</p></div><button class="btn btn-primary" onclick="switchTab(\'plans\')"><i class="fas fa-crown"></i> عرض الباقات</button></div>' : '';
    return;
  }
  if (!canP('pos', 'finance', 'reports')) { box.innerHTML = ''; return; }
  const r = await bz('bizSummary', {}, { silentPlan: true });
  if (!r.success) { box.innerHTML = ''; return; }
  box.innerHTML = '<div class="biz-dash-title"><i class="fas fa-cash-register"></i> التشغيل اليوم</div>' + kpis([
    ['مبيعات اليوم', money(r.today.sales), r.today.count + ' فاتورة'],
    ['متوسط الفاتورة', money(r.today.avg)],
    ['مبيعات 7 أيام', money(r.week.sales), r.week.count + ' فاتورة'],
    ['طلبات مفتوحة', r.openOrders.count, money(r.openOrders.total)],
    ['العملاء', r.customers],
    ['أصناف منخفضة', r.lowStock, '', r.lowStock ? '#f59e0b' : ''],
    ['حجوزات اليوم', r.reservationsToday],
  ]) + '<div class="biz-quick-actions">' +
    (canP('pos') ? '<button class="btn btn-primary" onclick="switchTab(\'pos\')"><i class="fas fa-cash-register"></i> فتح الكاشير</button>' : '') +
    (hasF('kitchen') && canP('kitchen', 'pos') ? '<a class="btn btn-outline" href="kitchen.html" target="_blank"><i class="fas fa-fire-burner"></i> شاشة المطبخ</a>' : '') +
    (canP('finance', 'reports') ? '<button class="btn btn-outline" onclick="switchTab(\'reports\')"><i class="fas fa-chart-line"></i> التقارير</button>' : '') + '</div>';
}

// ---------- دخول الموظفين ----------
function injectStaffLogin() {
  const card = document.querySelector('#loginScreen .login-card'); if (!card || document.getElementById('staffLoginBox')) return;
  const sw = document.createElement('div'); sw.className = 'login-switch';
  sw.innerHTML = '<button type="button" class="active" data-m="owner"><i class="fas fa-user-shield"></i> صاحب الحساب</button><button type="button" data-m="staff"><i class="fas fa-user-tie"></i> موظف</button>';
  const p = card.querySelector('p'); p.after(sw);
  const box = document.createElement('div'); box.id = 'staffLoginBox'; box.style.display = 'none';
  box.innerHTML = '<input type="text" id="staffRestInput" class="login-input" placeholder="بريد المطعم أو رمزه" dir="ltr" value="' + h(localStorage.getItem('fcStaffRest') || '') + '">' +
    '<input type="text" id="staffUserInput" class="login-input" placeholder="اسم المستخدم" dir="ltr" autocomplete="username">' +
    '<input type="password" id="staffPinInput" class="login-input" placeholder="رمز الدخول (PIN)" inputmode="numeric" autocomplete="current-password">' +
    '<button class="login-btn" id="staffLoginBtn"><i class="fas fa-sign-in-alt"></i> دخول الموظف</button>';
  sw.after(box);
  const ownerEls = ['usernameInput', 'loginBtn'].map(function (id) { return document.getElementById(id); }).concat([card.querySelector('.password-field-wrapper')]);
  sw.addEventListener('click', function (e) {
    const b = e.target.closest('[data-m]'); if (!b) return;
    sw.querySelectorAll('button').forEach(function (x) { x.classList.toggle('active', x === b); });
    const staff = b.dataset.m === 'staff';
    ownerEls.forEach(function (el) { if (el) el.style.display = staff ? 'none' : ''; });
    box.style.display = staff ? '' : 'none';
  });
  document.getElementById('staffPinInput').addEventListener('keypress', function (e) { if (e.key === 'Enter') staffLoginAttempt(); });
  document.getElementById('staffLoginBtn').onclick = staffLoginAttempt;
}
async function staffLoginAttempt() {
  const rest = document.getElementById('staffRestInput').value.trim(), u = document.getElementById('staffUserInput').value.trim(), pin = document.getElementById('staffPinInput').value.trim();
  const err = document.getElementById('errorMsg');
  if (!rest || !u || !pin) { err.textContent = 'أدخل بريد المطعم واسم المستخدم والرمز'; return; }
  const btn = document.getElementById('staffLoginBtn'); btn.disabled = true; err.textContent = '';
  try {
    const res = await fetch(COST_API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify({ fn: 'staffLogin', restaurant: rest, username: u, pin: pin }) });
    const r = await res.json();
    if (r.status !== 'success') { err.textContent = r.message || r.error || 'بيانات خاطئة'; return; }
    localStorage.setItem('fcStaffRest', rest);
    localStorage.setItem('foodUserToken', r.token);
    localStorage.setItem('foodUserName', r.name);
    localStorage.setItem('foodUserEmail', r.email);
    localStorage.setItem('foodDaysLeft', r.daysLeft || '365');
    localStorage.setItem('foodLoginTimestamp', Date.now().toString());
    localStorage.setItem('foodStaff', JSON.stringify(r.staff));
    currentUserEmail = r.email;
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appMain').style.display = 'block';
    dataLoaded = false; B.acc = null;
    await loadAllData(true);
    startSessionTimer();
    const perms = (B.acc && B.acc.staff && B.acc.staff.permissions) || [];
    if (perms.indexOf('kitchen') >= 0 && perms.length === 1 && hasF('kitchen')) { location.href = 'kitchen.html'; return; }
    switchTab(perms.indexOf('pos') >= 0 && hasF('pos') ? 'pos' : 'dashboard');
  } catch (e) { err.textContent = 'تعذر الاتصال: ' + e.message; }
  finally { btn.disabled = false; }
}
document.addEventListener('DOMContentLoaded', injectStaffLogin);

// ---------- الطباعة ----------
function printHtml(title, inner, paper) {
  const w = window.open('', '_blank', 'width=420,height=700');
  if (!w) { showToast('اسمح بالنوافذ المنبثقة للطباعة', true); return; }
  const width = paper === 'a4' ? '190mm' : (paper === '58' ? '54mm' : '76mm');
  w.document.write('<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>' + h(title) + '</title><style>' +
    '@page{margin:4mm}body{font-family:Tahoma,Arial,sans-serif;width:' + width + ';margin:0 auto;color:#000;font-size:12px}h1,h2,h3{margin:4px 0;text-align:center}table{width:100%;border-collapse:collapse}td,th{padding:3px 2px;border-bottom:1px dashed #999;text-align:right;vertical-align:top}.c{text-align:center}.l{text-align:left}.tot td{border:none;font-weight:bold}.muted{color:#444;font-size:11px}img{max-width:100%}hr{border:none;border-top:1px dashed #000}' +
    '</style></head><body>' + inner + '<script>window.onload=function(){setTimeout(function(){window.print();},350)}<\/script></body></html>');
  w.document.close();
}
async function printInvoice(id) {
  const r = await bzOk('getInvoice', { id: id });
  const inv = r.invoice, biz = r.biz || {}, cur = r.currency || '';
  const rc = biz.receipt || {}, bs = biz.business || {}, tx = biz.tax || {};
  const lines = (inv.items || []).map(function (l) {
    return '<tr><td>' + h(l.name) + (l.variant ? ' (' + h(l.variant) + ')' : '') + (l.extras && l.extras.length ? '<div class="muted">+ ' + l.extras.map(function (e) { return h(e.name) + (e.qty > 1 ? '×' + e.qty : ''); }).join('، ') + '</div>' : '') + '</td><td class="c">' + nf(l.qty, l.qty % 1 ? 2 : 0) + '</td><td class="l">' + nf(l.gross) + '</td></tr>';
  }).join('');
  const pays = (inv.payments || []).map(function (p) { return '<tr class="tot"><td>' + h(PAY_NAMES[p.method] || p.method) + '</td><td class="l">' + nf(p.tendered || p.amount) + '</td></tr>'; }).join('');
  const qr = rc.showQr !== false && inv.qr ? '<div class="c"><img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' + encodeURIComponent(inv.qr) + '" width="140" height="140" alt="QR"></div>' : '';
  const html = (bs.logo ? '<div class="c"><img src="' + h(bs.logo) + '" style="max-height:60px"></div>' : '') +
    '<h2>' + h(bs.legalName || r.restaurantName) + '</h2>' + (r.branch ? '<div class="c muted">' + h(r.branch.name) + (r.branch.address ? ' · ' + h(r.branch.address) : '') + (r.branch.phone ? ' · ' + h(r.branch.phone) : '') + '</div>' : '') +
    (bs.crNumber ? '<div class="c muted">س.ت: ' + h(bs.crNumber) + '</div>' : '') + (tx.enabled && tx.number ? '<div class="c muted">الرقم الضريبي: ' + h(tx.number) + '</div>' : '') +
    (rc.header ? '<div class="c">' + h(rc.header) + '</div>' : '') +
    '<h3>' + (inv.kind === 'refund' ? 'إشعار دائن (استرجاع)' : (tx.enabled ? 'فاتورة ضريبية مبسطة' : 'فاتورة')) + '</h3>' +
    '<table><tr><td>رقم الفاتورة: <b>' + inv.number + '</b></td><td class="l">طلب #' + (inv.order_number || '') + '</td></tr><tr><td colspan="2">' + dt(inv.issued_at) + ' · ' + h(inv.staff_name || '') + '</td></tr>' +
    (inv.customer_name ? '<tr><td colspan="2">العميل: ' + h(inv.customer_name) + (inv.customer_tax_no ? ' · ض: ' + h(inv.customer_tax_no) : '') + '</td></tr>' : '') + '</table><hr>' +
    '<table><tr><th>الصنف</th><th class="c">الكمية</th><th class="l">المبلغ</th></tr>' + lines + '</table><table>' +
    '<tr class="tot"><td>المجموع</td><td class="l">' + nf(inv.subtotal) + '</td></tr>' +
    (inv.discount_total > 0 ? '<tr class="tot"><td>الخصم</td><td class="l">-' + nf(inv.discount_total) + '</td></tr>' : '') +
    (tx.enabled ? '<tr class="tot"><td>' + h(tx.name || 'الضريبة') + (tx.inclusive ? ' (مشمولة)' : '') + '</td><td class="l">' + nf(inv.tax_total) + '</td></tr>' : '') +
    '<tr class="tot" style="font-size:15px"><td>الإجمالي</td><td class="l">' + nf(inv.total) + ' ' + h(cur) + '</td></tr>' + pays + '</table><hr>' + qr +
    '<div class="c">' + h(rc.footer || '') + '</div><div class="c muted" style="font-size:9px;margin-top:6px">' + h((inv.hash || '').slice(0, 24)) + '</div>';
  printHtml('فاتورة ' + inv.number, html, rc.paper);
}
function exportRowsExcel(name, headers, rows) {
  if (typeof ExcelJS === 'undefined') { showToast('مكتبة Excel غير محملة', true); return; }
  const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet(name.slice(0, 30)); ws.views = [{ rightToLeft: true }];
  ws.addRow(headers).font = { bold: true };
  rows.forEach(function (r) { ws.addRow(r); });
  ws.columns.forEach(function (c) { c.width = 18; });
  wb.xlsx.writeBuffer().then(function (buf) { saveAs(new Blob([buf]), name + '_' + isoLocal() + '.xlsx'); });
}
function publicBase() {
  if (typeof PUBLIC_APP_URL === 'string' && PUBLIC_APP_URL) return PUBLIC_APP_URL.replace(/\/?$/, '/');
  return location.origin + location.pathname.replace(/[^/]*$/, '');
}
function qrImg(url, size) { return 'https://api.qrserver.com/v1/create-qr-code/?size=' + (size || 240) + 'x' + (size || 240) + '&data=' + encodeURIComponent(url) + '&format=png&color=0b0e17'; }

// ============================================================
// v4.2 — قراءة QR / الباركود: كاميرا (BarcodeDetector أو html5-qrcode) + قارئ USB/Bluetooth (يعمل كلوحة مفاتيح)
// ============================================================
var FC_SCAN_LIB = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
function fcLoadScript(src) {
  return new Promise(function (res, rej) {
    if (document.querySelector('script[data-src="' + src + '"]')) { const t = setInterval(function () { if (window.Html5Qrcode) { clearInterval(t); res(); } }, 100); setTimeout(function () { clearInterval(t); window.Html5Qrcode ? res() : rej(new Error('تعذر تحميل قارئ QR')); }, 15000); return; }
    const s = document.createElement('script'); s.src = src; s.dataset.src = src; s.onload = function () { res(); }; s.onerror = function () { rej(new Error('تعذر تحميل قارئ QR')); }; document.head.appendChild(s);
  });
}
// يفتح نافذة قراءة: كاميرا + حقل لقارئ الباركود/الإدخال اليدوي. يعيد النص المقروء أو null
function bScan(opts) {
  opts = opts || {};
  return new Promise(function (resolve) {
    let done = false, stream = null, raf = 0, h5 = null;
    const finish = function (v, m) { if (done) return; done = true; stop(); if (m) m.close(); resolve(v ? String(v).trim() : null); };
    function stop() {
      cancelAnimationFrame(raf);
      if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
      if (h5) { try { h5.stop().catch(function () {}); } catch (e) {} h5 = null; }
    }
    const m = bModal({ title: opts.title || 'قراءة QR / باركود', icon: 'qrcode', print: false,
      sub: opts.sub || 'وجّه الكاميرا نحو الرمز، أو استخدم قارئ الباركود، أو اكتب الرمز يدوياً',
      body: '<div class="fc-scan-wrap" id="fcScanWrap"><video class="fc-scan-video" id="fcScanVideo" playsinline muted></video><div id="fcScanH5" style="display:none"></div></div>' +
        '<div class="muted" id="fcScanMsg" style="margin:8px 0;font-size:.82rem">جارِ تشغيل الكاميرا...</div>' +
        '<div style="display:flex;gap:8px"><input id="fcScanInput" class="grow" placeholder="' + h(opts.placeholder || 'امسح بالقارئ أو اكتب الرمز ثم Enter') + '" autocomplete="off" style="flex:1;margin:0" dir="ltr"><button class="btn btn-primary" data-act="ok"><i class="fas fa-check"></i> تأكيد</button></div>',
      foot: '<button class="btn btn-cancel" data-x>إغلاق</button>',
      onClose: function () { finish(null); },
      actions: { ok: function (mm) { const v = mm.$('#fcScanInput').value.trim(); if (v) finish(v, mm); } } });
    const inp = m.$('#fcScanInput'), msg = m.$('#fcScanMsg'), video = m.$('#fcScanVideo');
    setTimeout(function () { inp.focus(); }, 50);
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); const v = inp.value.trim(); if (v) finish(v, m); } });
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.isSecureContext) { video.style.display = 'none'; msg.textContent = 'الكاميرا غير متاحة على هذا الجهاز/المتصفح — استخدم قارئ الباركود أو الإدخال اليدوي.'; return; }
    if ('BarcodeDetector' in window) {
      let det; try { det = new window.BarcodeDetector(); } catch (e) { det = null; }
      if (det) {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then(function (st) {
          if (done) { st.getTracks().forEach(function (t) { t.stop(); }); return; }
          stream = st; video.srcObject = st; video.play(); msg.textContent = 'وجّه الكاميرا نحو رمز QR أو الباركود';
          const tick = function () {
            if (done) return;
            if (video.readyState >= 2) det.detect(video).then(function (c) { if (c && c.length && c[0].rawValue) finish(c[0].rawValue, m); else raf = requestAnimationFrame(tick); }).catch(function () { raf = requestAnimationFrame(tick); });
            else raf = requestAnimationFrame(tick);
          };
          tick();
        }).catch(function () { video.style.display = 'none'; msg.textContent = 'لم يتم السماح باستخدام الكاميرا — استخدم القارئ أو الإدخال اليدوي.'; });
        return;
      }
    }
    // بديل: مكتبة html5-qrcode (iOS / Firefox)
    video.style.display = 'none';
    fcLoadScript(FC_SCAN_LIB).then(function () {
      if (done) return;
      const box = m.$('#fcScanH5'); box.style.display = ''; box.id = 'fcScanH5_' + Date.now();
      h5 = new window.Html5Qrcode(box.id);
      h5.start({ facingMode: 'environment' }, { fps: 10, qrbox: 230 }, function (txt) { finish(txt, m); }, function () {})
        .then(function () { msg.textContent = 'وجّه الكاميرا نحو رمز QR أو الباركود'; })
        .catch(function () { msg.textContent = 'لم يتم السماح باستخدام الكاميرا — استخدم القارئ أو الإدخال اليدوي.'; });
    }).catch(function (e) { msg.textContent = e.message + ' — استخدم القارئ أو الإدخال اليدوي.'; });
  });
}
// زر كاميرا بجانب حقل إدخال: يملأ الحقل ويطلق Enter/onScan
function scanBtnHtml(id, title) { return '<button type="button" class="btn btn-outline btn-sm scan-btn" data-scan="' + h(id) + '" title="' + h(title || 'قراءة QR / باركود') + '"><i class="fas fa-camera"></i></button>'; }
document.addEventListener('click', async function (e) {
  const b = e.target.closest && e.target.closest('[data-scan]'); if (!b) return;
  e.preventDefault(); e.stopPropagation();
  const root = b.closest('.modal-box') || document;
  const inp = root.querySelector('#' + b.dataset.scan) || document.getElementById(b.dataset.scan);
  const v = await bScan({ title: b.title });
  if (v && inp) { inp.value = v; inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true })); }
}, true);
// قارئ USB: يلتقط الإدخال السريع متبوعاً بـ Enter خارج الحقول
function fcScannerListen(onCode, isActive) {
  let buf = '', last = 0;
  document.addEventListener('keydown', function (e) {
    if (!isActive()) return;
    const t = e.target, tag = (t && t.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
    if (document.querySelector('.biz-modal')) return;
    const now = Date.now();
    if (now - last > 80) buf = '';
    last = now;
    if (e.key === 'Enter') { if (buf.length >= 3) { e.preventDefault(); const c = buf; buf = ''; onCode(c); } buf = ''; return; }
    if (e.key && e.key.length === 1) buf += e.key;
  });
}
