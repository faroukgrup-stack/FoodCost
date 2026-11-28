// ============================================================
// biz-pos.js — الكاشير ونقطة البيع، الطلبات، الورديات، طلبات المينيو
// ============================================================
var POS = { boot: null, cat: '', q: '', o: null, root: null, shift: null };
function posNewOrder() {
  const def = (POS.boot && POS.boot.settings.pos.defaultOrderType) || 'takeaway';
  return { id: '', number: '', orderType: def, tableId: '', tableName: '', customerId: '', customerName: '', customerPhone: '', customerPoints: 0, items: [], discount: null, discountLabel: '', notes: '', deliveryAddress: null, deliveryFee: null, channel: '' };
}
function posDeliveryOn() { return !!(POS.boot && POS.boot.settings.delivery && hasF('delivery')); }
function posDeliveryFee() {
  const o = POS.o; if (!o || o.orderType !== 'delivery' || !posDeliveryOn()) return 0;
  return Math.max(0, +(o.deliveryFee !== null && o.deliveryFee !== undefined ? o.deliveryFee : POS.boot.settings.delivery.fee) || 0);
}
function posLid() { return Math.random().toString(36).slice(2, 10); }
function posFromServer(o) {
  return {
    id: o.id, number: o.number, orderType: o.order_type, tableId: o.table_id || '', tableName: o.table_name || '', customerId: o.customer_id || '', customerName: o.customer_name || '', customerPhone: o.customer_phone || '', customerPoints: 0,
    items: (o.items || []).map(function (l) {
      const ex = (l.extras || []).reduce(function (s, e) { return s + e.price * e.qty; }, 0);
      return { lid: l.lid, productId: l.productId, name: l.name, variant: l.variant || '', extras: (l.extras || []).map(function (e) { return { name: e.name, qty: e.qty, price: e.price }; }), qty: l.qty, note: l.note || '', base: Math.round((l.unit - ex) * 100) / 100, sent: !!l.sent };
    }),
    discount: o.discount_info && o.discount_info.discountId ? { discountId: o.discount_info.discountId } : (o.discount_info && o.discount_info.manual ? { kind: o.discount_info.kind, value: o.discount_info.value } : null),
    discountLabel: o.discount_info && (o.discount_info.name || (o.discount_info.manual ? ('خصم ' + o.discount_info.value + (o.discount_info.kind === 'percent' ? '%' : '')) : '')) || '',
    notes: o.notes || '', total: o.total, deliveryAddress: o.delivery_address || null, deliveryFee: o.delivery_fee !== undefined && o.delivery_fee !== null ? +o.delivery_fee : null, deliveryStatus: o.delivery_status || '', channel: o.channel || '', channelName: o.channel_name || '', channelRef: o.channel_ref || ''
  };
}
function posPayload() {
  const o = POS.o;
  return {
    id: o.id || undefined, orderType: o.orderType, tableId: o.orderType === 'dine_in' ? o.tableId : '', customerId: o.customerId, customerName: o.customerName, customerPhone: o.customerPhone,
    items: o.items.map(function (l) { return { lid: l.lid, productId: l.productId || undefined, name: l.name, variant: l.variant, extras: l.extras.map(function (e) { return { name: e.name, qty: e.qty, price: e.price }; }), qty: l.qty, note: l.note, unitPrice: l.base }; }),
    discount: o.discount || {}, notes: o.notes, channel: o.channel || '', channelRef: o.channelRef || '',
    deliveryAddress: o.orderType === 'delivery' && o.deliveryAddress ? o.deliveryAddress : undefined, deliveryFee: o.orderType === 'delivery' && o.deliveryFee !== null && o.deliveryFee !== undefined ? o.deliveryFee : undefined
  };
}
// حساب تقديري مطابق لمنطق السيرفر (الإجمالي النهائي يحسبه السيرفر)
function posTotals() {
  const s = POS.boot.settings, tax = s.tax || {}, o = POS.o;
  const its = o.items.filter(function (l) { return !(!l.productId && l.name === 'رسوم التوصيل'); });
  const dfee = posDeliveryFee();
  if (dfee > 0) its.push({ productId: '', name: 'رسوم التوصيل', base: dfee, extras: [], qty: 1 });
  const lines = its.map(function (l) {
    const p = l.productId ? POS.boot.products.find(function (x) { return x.id === l.productId; }) : null;
    const unit = l.base + l.extras.reduce(function (a, e) { return a + e.price * e.qty; }, 0);
    return { gross: unit * l.qty, rate: tax.enabled ? (p && p.tax_rate !== null && p.tax_rate !== undefined ? +p.tax_rate : +tax.rate || 0) : 0, cat: p ? p.category : '', pid: l.productId, disc: 0 };
  });
  const sub = lines.reduce(function (a, l) { return a + l.gross; }, 0);
  let od = 0;
  if (o.discount) {
    const rule = o.discount.discountId ? POS.boot.discounts.find(function (d) { return d.id === o.discount.discountId; }) : null;
    if (rule && rule.applies_to !== 'order') {
      const tg = lines.filter(function (l) { return rule.applies_to === 'category' ? l.cat === rule.target : l.pid === rule.target; });
      const base = tg.reduce(function (a, l) { return a + l.gross; }, 0);
      let amt = rule.kind === 'percent' ? base * rule.value / 100 : Math.min(rule.value, base);
      tg.forEach(function (l) { const sh = base ? amt * l.gross / base : 0; l.disc = sh; });
    } else {
      const d = rule ? { kind: rule.kind, value: +rule.value } : o.discount;
      if (d && d.value) { const after = sub; od = d.kind === 'percent' ? after * Math.min(100, d.value) / 100 : Math.min(d.value, after); }
    }
  }
  const afterLine = lines.reduce(function (a, l) { return a + l.gross - l.disc; }, 0);
  let taxT = 0, total = 0, discT = lines.reduce(function (a, l) { return a + l.disc; }, 0) + od;
  lines.forEach(function (l) {
    const base = l.gross - l.disc, share = afterLine ? od * base / afterLine : 0, t = base - share;
    if (tax.enabled && l.rate > 0) { if (tax.inclusive) { taxT += t * l.rate / (100 + l.rate); total += t; } else { taxT += t * l.rate / 100; total += t * (1 + l.rate / 100); } }
    else total += t;
  });
  return { sub: sub, disc: discT, tax: taxT, total: Math.round(total * 100) / 100 };
}

bizPage('pos', { group: 'ops', title: 'الكاشير', icon: 'cash-register', feature: 'pos', perms: ['pos'], plan: 'pro',
  pitch: 'نقطة بيع سريعة تعمل على الكمبيوتر والتابلت والجوال: طلبات محلية وسفري وتوصيل، دفع متعدد، فواتير إلكترونية مع QR، وربط مباشر بالمخزون والعملاء والولاء.',
  render: async function (body, root) {
    root.querySelector('.biz-page-head').style.display = 'none';
    POS.root = body;
    await posLoad();
    if (!POS.o) POS.o = posNewOrder();
    posRender();
  } });

fcScannerListen(function (c) { posHandleCode(c); }, function () { return B.current === 'pos' && !!POS.boot && !!POS.root && document.body.contains(POS.root); });
async function posLoad() {
  const r = await bzOk('posBootstrap', {}, { loading: false });
  POS.boot = r;
  if (window.fcI18n && fcI18n.names) fcI18n.names(r.names || {});
  POS.shift = r.shift;
  if (!POS.cat || r.categories.indexOf(POS.cat) < 0) POS.cat = '';
  if (POS.o && POS.o.id && !r.openOrders.some(function (x) { return x.id === POS.o.id; })) POS.o = null;
}
function posRender() {
  const b = POS.boot, body = POS.root;
  const shiftOn = hasF('shifts');
  body.innerHTML =
    '<div class="pos-topbar">' +
      '<input class="biz-search grow" id="posSearch" placeholder="ابحث بالاسم أو امسح الباركود / QR (منتج، بطاقة هدية، كود خصم، جوال عميل)..." value="' + h(POS.q) + '">' + scanBtnHtml('posSearch', 'مسح QR / باركود بالكاميرا') +
      (shiftOn ? (POS.shift ? '<span class="shift-pill"><i class="fas fa-clock"></i> وردية مفتوحة منذ ' + new Date(POS.shift.opened_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) + '</span><button class="btn btn-outline btn-sm" data-a="shift"><i class="fas fa-cash-register"></i> الوردية</button>' : '<span class="shift-pill off">لا توجد وردية</span><button class="btn btn-success btn-sm" data-a="openShift"><i class="fas fa-play"></i> فتح وردية</button>') : '') +
      '<button class="btn btn-outline btn-sm" data-a="open"><i class="fas fa-receipt"></i> المعلّقة (' + b.openOrders.length + ')</button>' +
      (hasF('delivery') && shiftOn && B.acc.biz && B.acc.biz.delivery && B.acc.biz.delivery.enabled ? '<button class="btn btn-outline btn-sm" data-a="driverCash"><i class="fas fa-hand-holding-usd"></i> عهدة السائقين</button>' : '') +
      (hasF('online_orders') ? '<button class="btn btn-outline btn-sm" data-a="menuOrders"><i class="fas fa-qrcode"></i> طلبات المينيو' + (b.menuOrdersNew ? ' <span class="badge badge-warning">' + b.menuOrdersNew + '</span>' : '') + '</button>' : '') +
      (b.canManage ? '<button class="btn btn-outline btn-sm" data-a="custom"><i class="fas fa-plus"></i> صنف يدوي</button>' : '') +
      '<button class="ico-btn" data-a="reload" title="تحديث"><i class="fas fa-sync-alt"></i></button>' +
    '</div>' +
    '<div class="pos-wrap"><div class="pos-left"><div class="pos-cats" id="posCats"></div><div class="pos-grid" id="posGrid"></div></div>' +
    '<div class="pos-cart" id="posCart"></div></div>';
  posRenderCats(); posRenderGrid(); posRenderCart();
  const s = body.querySelector('#posSearch');
  s.addEventListener('input', function () { POS.q = s.value; posRenderGrid(); });
  s.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    const v = s.value.trim(); if (!v) return;
    s.value = ''; POS.q = ''; posRenderGrid();
    posHandleCode(v);
  });
  body.querySelector('.pos-topbar').addEventListener('click', function (e) {
    const a = e.target.closest('[data-a]'); if (!a) return;
    ({ shift: posShiftModal, openShift: posOpenShift, open: posOpenOrdersModal, menuOrders: posMenuOrders, custom: posCustomItem, driverCash: function () { dlCashModal(async function () { if (POS.boot) { try { await posLoad(); } catch (e) { /* */ } } }); }, reload: async function () { await posLoad(); if (!POS.o) POS.o = posNewOrder(); posRender(); } })[a.dataset.a]();
  });
  if (!b.products.length) {
    body.querySelector('#posGrid').innerHTML = '<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-box-open" style="font-size:2rem;opacity:.5"></i><p style="margin:10px 0">لا توجد منتجات بعد. أضف منتجاتك أو استوردها من المينيو الإلكتروني أو الأطباق.</p>' + (canP('inventory') ? '<button class="btn btn-primary" onclick="switchTab(\'products\')"><i class="fas fa-box"></i> إدارة المنتجات</button>' : '') + '</div>';
  }
}
function posRenderCats() {
  const el = POS.root.querySelector('#posCats');
  el.innerHTML = ['<button class="pos-cat' + (!POS.cat ? ' active' : '') + '" data-c="">الكل</button>'].concat(POS.boot.categories.map(function (c) { return '<button class="pos-cat' + (POS.cat === c ? ' active' : '') + '" data-c="' + h(c) + '">' + h(c) + '</button>'; })).join('');
  el.onclick = function (e) { const b = e.target.closest('[data-c]'); if (!b) return; POS.cat = b.dataset.c; posRenderCats(); posRenderGrid(); };
}
function posRenderGrid() {
  const q = POS.q.trim().toLowerCase();
  const list = POS.boot.products.filter(function (p) {
    if (POS.cat && (p.category || 'عام') !== POS.cat) return false;
    if (q && !((p.name || '').toLowerCase().includes(q) || (p.barcode || '').includes(q) || (p.sku || '').toLowerCase().includes(q))) return false;
    return true;
  });
  const el = POS.root.querySelector('#posGrid');
  if (!POS.boot.products.length) return;
  el.innerHTML = list.map(function (p) {
    const out = p.stock !== null && p.stock <= 0 && !POS.boot.settings.pos.allowNegativeStock;
    const so = posSoldOut(p);
    return '<button class="pos-item' + (out ? ' out' : '') + (so ? ' soldout' : '') + '" data-p="' + p.id + '"' + (so ? ' title="نفدت إحدى المواد — المنتج متوقف تلقائياً"' : '') + ' style="' + (p.color ? 'border-top:3px solid ' + h(p.color) : '') + '">' +
      (p.image_url ? '<img src="' + h(p.image_url) + '" alt="" loading="lazy">' : '') +
      '<span class="nm">' + h(p.name) + '</span><span class="pr">' + money(p.price) + '</span>' +
      (p.avail !== null && p.avail !== undefined && POS.boot.settings.pos.autoSoldOut ? '<span class="stk">المتاح: ' + nf(Math.max(0, posAvailLeft(p)), 0) + '</span>' : p.stock !== null ? '<span class="stk">المتوفر: ' + nf(p.stock, p.stock % 1 ? 2 : 0) + '</span>' : '') + '</button>';
  }).join('') || '<div class="empty-state" style="grid-column:1/-1">لا توجد نتائج</div>';
  el.onclick = function (e) { const b = e.target.closest('[data-p]'); if (!b) return; posAddProduct(POS.boot.products.find(function (x) { return x.id === b.dataset.p; })); };
}
// المتاح بعد احتساب ما في السلة غير المحفوظ (المحفوظ محجوز مسبقاً من السيرفر)
function posAvailLeft(p) {
  if (p.avail === null || p.avail === undefined) return Infinity;
  const inCart = (POS.o ? POS.o.items : []).filter(function (l) { return l.productId === p.id; }).reduce(function (s, l) { return s + (+l.qty || 0); }, 0);
  const saved = POS.o && POS.o.id ? ((POS.boot.openOrders.find(function (x) { return x.id === POS.o.id; }) || {}).items || []).filter(function (l) { return l.productId === p.id; }).reduce(function (s, l) { return s + (+l.qty || 0); }, 0) : 0;
  return p.avail - Math.max(0, inCart - saved);
}
// v5.4.2: «السماح بالبيع عند نفاد المخزون» يتقدم على الإيقاف التلقائي — المنتج يبقى متاحاً مع تنبيه فقط
function posSoldOut(p) { return !!(POS.boot && POS.boot.settings.pos.autoSoldOut && !POS.boot.settings.pos.allowNegativeStock && posAvailLeft(p) < 1); }
// معالج موحّد لكل رمز يُقرأ بالكاميرا أو القارئ: منتج ← كود خصم ← بطاقة هدية ← جوال عميل
async function posHandleCode(code) {
  code = String(code || '').trim(); if (!code) return;
  const b = POS.boot;
  { const mc = code.match(/FCC-[A-Z0-9]+/i); if (mc) { posCustomerQr(mc[0].toUpperCase()); return; } }
  if (/^FCB:/i.test(code) && typeof posBatchCode === 'function') { posBatchCode(code); return; }
  const p = b.products.find(function (x) { return (x.barcode && x.barcode === code) || (x.sku && x.sku.toLowerCase() === code.toLowerCase()); });
  if (p) { posAddProduct(p); return; }
  const d = (b.discounts || []).find(function (x) { return x.code && x.code.toUpperCase() === code.toUpperCase(); });
  if (d) {
    if (d.min_total > 0 && posTotals().sub < d.min_total) { showToast('العرض يتطلب حداً أدنى ' + money(d.min_total), true); return; }
    POS.o.discount = { discountId: d.id }; POS.o.discountLabel = d.name; posRenderCart(); showToast('تم تطبيق العرض: ' + d.name); return;
  }
  if (hasF('gift_cards')) {
    const r = await bz('giftCardCheck', { code: code }, { loading: false });
    if (r && r.success && r.card) {
      if (!POS.o.items.length) { POS.pendingGift = r; showToast('بطاقة هدية ' + r.card.code + ' · الرصيد ' + money(r.card.balance) + ' — ستُستخدم تلقائياً عند الدفع'); return; }
      posPay(r); return;
    }
  }
  const dg = code.replace(/\D/g, '');
  if (hasF('customers') && dg.length >= 7) {
    const rows = await entList('customers', { q: dg.slice(-9) });
    const c = rows[0];
    if (c) { Object.assign(POS.o, { customerId: c.id, customerName: c.name, customerPhone: c.phone, customerPoints: c.points || 0 }); posRenderCart(); showToast('تم اختيار العميل: ' + c.name); return; }
  }
  showToast('لم يتم التعرف على الرمز: ' + code, true);
}
// قراءة QR حساب العميل: عرض الرصيد واقتراح الخصم من الفاتورة بالنقاط ودفع الفرق فقط
async function posCustomerQr(code) {
  const r = await bz('customerByQr', { code: code });
  if (!r.success) { showToast(r.error || 'رمز العميل غير معروف', true); return; }
  const c = r.customer, b = POS.boot;
  Object.assign(POS.o, { customerId: c.id, customerName: c.name, customerPhone: c.phone, customerPoints: c.points || 0 }); posRenderCart();
  const t = posTotals(), canRedeem = r.loyalty && c.points >= (r.minRedeem || 0) && r.pointsValue > 0;
  const gifts = (r.giftCards || []);
  bModal({ title: 'حساب العميل: ' + c.name, icon: 'user-check', print: false,
    body: '<div class="biz-kpis" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr))">' +
      '<div class="biz-kpi"><small>رصيد النقاط</small><b>' + nf(c.points, 0) + '</b></div>' +
      '<div class="biz-kpi"><small>قيمة النقاط</small><b>' + money(r.pointsValue) + '</b></div>' +
      '<div class="biz-kpi"><small>الزيارات</small><b>' + nf(c.visits || 0, 0) + '</b></div>' +
      (c.balance > 0 ? '<div class="biz-kpi"><small>رصيد آجل مستحق</small><b>' + money(c.balance) + '</b></div>' : '') + '</div>' +
      (gifts.length ? '<p class="muted">بطاقات هدية فعّالة: ' + gifts.map(function (g) { return '<span dir="ltr">' + h(g.code) + '</span> (' + money(g.balance) + ')'; }).join('، ') + '</p>' : '') +
      (canRedeem ? '<div class="pay-wait" style="background:rgba(180,133,84,.12);border-color:rgba(180,133,84,.4)">أخبر العميل: لديه رصيد ' + money(r.pointsValue) + ' يمكن خصمه من الفاتورة' + (t.total > 0 ? ' — الإجمالي الحالي ' + money(t.total) + '، يدفع الفرق فقط ' + money(Math.max(0, t.total - r.pointsValue)) : '') + '</div>'
        : (r.loyalty ? '<p class="muted">الحد الأدنى للاستبدال ' + nf(r.minRedeem, 0) + ' نقطة</p>' : '')),
    foot: '<button class="btn btn-cancel" data-x>متابعة الطلب</button>' + (canRedeem && b.canPay !== false ? '<button class="btn btn-primary" data-act="redeem"' + (POS.o.items.length ? '' : ' disabled') + '><i class="fas fa-star"></i> خصم بالنقاط ودفع الفرق</button>' : ''),
    actions: { redeem: function (m) { m.close(); POS.pendingPoints = Math.floor(c.points * (+b.settings.loyalty.pointValue || 0.05) * 100) / 100; posPay(); } } });
  showToast('تم اختيار العميل: ' + c.name);
}
function posAddProduct(p) {
  if (posSoldOut(p)) { showToast('«' + p.name + '» متوقف — نفدت إحدى المواد الأولية', true); return; }
  const vs = p.variants || [], ex = p.extras || [];
  if (vs.length || ex.length) { posOptionsModal(p, null); return; }
  const same = POS.o.items.find(function (l) { return l.productId === p.id && !l.variant && !l.extras.length && !l.note && !l.sent; });
  if (same) same.qty++;
  else POS.o.items.push({ lid: posLid(), productId: p.id, name: p.name, variant: '', extras: [], qty: 1, note: '', base: +p.price, sent: false });
  posRenderCart();
}
function posOptionsModal(p, line) {
  const vs = p ? (p.variants || []) : [], ex = p ? (p.extras || []) : [];
  let variant = line ? line.variant : (vs[0] ? vs[0].name : '');
  const chosen = {}; (line ? line.extras : []).forEach(function (e) { chosen[e.name] = e.qty; });
  const body = (vs.length ? '<div class="opt-group"><h5>الحجم / النوع</h5><div class="opt-chips" id="optV">' + vs.map(function (v) { return '<button class="opt-chip' + (v.name === variant ? ' on' : '') + '" data-v="' + h(v.name) + '">' + h(v.name) + ' · ' + money(v.price) + '</button>'; }).join('') + '</div></div>' : '') +
    (ex.length ? '<div class="opt-group"><h5>الإضافات</h5><div class="opt-chips" id="optE">' + ex.map(function (e) { return '<button class="opt-chip' + (chosen[e.name] ? ' on' : '') + '" data-e="' + h(e.name) + '">' + h(e.name) + ' +' + money(e.price) + '</button>'; }).join('') + '</div></div>' : '') +
    bForm([{ k: 'qty', label: 'الكمية', type: 'number', def: 1 }, { k: 'note', label: 'ملاحظة للمطبخ', ph: 'بدون بصل...' }].concat(line && POS.boot.canManage ? [{ k: 'base', label: 'السعر الأساسي للوحدة', type: 'number' }] : []), line ? { qty: line.qty, note: line.note, base: line.base } : {});
  bModal({ title: p ? p.name : line.name, icon: 'sliders-h', body: body,
    foot: (line ? '<button class="btn btn-danger" data-act="del"><i class="fas fa-trash"></i> حذف</button>' : '') + '<button class="btn btn-cancel" data-x>إلغاء</button><button class="btn btn-primary" data-act="ok"><i class="fas fa-check"></i> ' + (line ? 'تحديث' : 'إضافة') + '</button>',
    onOpen: function (m) {
      const v = m.$('#optV'); if (v) v.onclick = function (e) { const b = e.target.closest('[data-v]'); if (!b) return; variant = b.dataset.v; v.querySelectorAll('.opt-chip').forEach(function (x) { x.classList.toggle('on', x === b); }); };
      const ee = m.$('#optE'); if (ee) ee.onclick = function (e) { const b = e.target.closest('[data-e]'); if (!b) return; b.classList.toggle('on'); if (b.classList.contains('on')) chosen[b.dataset.e] = 1; else delete chosen[b.dataset.e]; };
    },
    actions: {
      del: function (m) { if (line && line.sent && !POS.boot.canManage) { showToast('الصنف أُرسل للمطبخ', true); return; } POS.o.items = POS.o.items.filter(function (x) { return x !== line; }); m.close(); posRenderCart(); },
      ok: function (m) {
        const qty = parseFloat(m.$('[data-k=qty]').value) || 1, note = m.$('[data-k=note]').value.trim();
        const vv = vs.find(function (x) { return x.name === variant; });
        const extras = ex.filter(function (e) { return chosen[e.name]; }).map(function (e) { return { name: e.name, qty: chosen[e.name], price: +e.price }; });
        let base = p ? (vv ? +vv.price : +p.price) : line.base;
        const bi = m.$('[data-k=base]'); if (bi && bi.value !== '' && line) { const nb = parseFloat(bi.value); if (line.variant === variant || !p) base = nb; else if (nb !== line.base) base = nb; }
        if (line) { if (line.sent && !POS.boot.canManage && qty < line.qty) { showToast('لا يمكن تقليل صنف أُرسل للمطبخ', true); return; } Object.assign(line, { variant: vv ? variant : '', extras: extras, qty: qty, note: note, base: base }); }
        else POS.o.items.push({ lid: posLid(), productId: p.id, name: p.name, variant: vv ? variant : '', extras: extras, qty: qty, note: note, base: base, sent: false });
        m.close(); posRenderCart();
      }
    } });
}
function posCustomItem() {
  bPrompt('صنف يدوي', [{ k: 'name', label: 'اسم الصنف', req: true, full: true }, { k: 'price', label: 'السعر', type: 'number', req: true }, { k: 'qty', label: 'الكمية', type: 'number', def: 1 }], {}, function (d) {
    POS.o.items.push({ lid: posLid(), productId: null, name: d.name, variant: '', extras: [], qty: d.qty || 1, note: '', base: d.price || 0, sent: false });
    posRenderCart();
  }, { icon: 'plus', saveText: 'إضافة' });
}
function posRenderCart() {
  const o = POS.o, b = POS.boot, el = POS.root.querySelector('#posCart');
  const t = posTotals();
  const types = [['takeaway', 'سفري', 'shopping-bag'], ['dine_in', 'محلي', 'utensils'], ['delivery', 'توصيل', 'motorcycle']];
  el.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><b style="color:var(--accent-soft)">' + (o.id ? 'طلب #' + o.number : 'طلب جديد') + '</b>' + (o.items.length || o.id ? '<button class="ico-btn" data-a="new" title="طلب جديد"><i class="fas fa-plus"></i></button>' : '') + '</div>' +
    '<div class="pos-types">' + types.map(function (x) { return '<button class="' + (o.orderType === x[0] ? 'active' : '') + '" data-t="' + x[0] + '"><i class="fas fa-' + x[2] + '"></i> ' + x[1] + '</button>'; }).join('') + '</div>' +
    '<div class="pos-meta">' +
      (o.orderType === 'dine_in' && hasF('tables') ? '<button data-a="table"><i class="fas fa-chair"></i> ' + (o.tableName ? h(o.tableName) : 'اختر طاولة') + '</button>' : '') +
      (o.orderType === 'delivery' && posDeliveryOn() ? '<button data-a="addr" class="' + (o.deliveryAddress ? '' : 'warn') + '"><i class="fas fa-map-marker-alt"></i> ' + (o.deliveryAddress ? h(dlAddrLine(o.deliveryAddress).slice(0, 26) || 'العنوان') : 'عنوان التوصيل') + '</button>' : '') +
      ((b.channels || []).length || o.channel ? '<button data-a="chan" class="' + (o.channel ? 'active' : '') + '"><i class="fas fa-store-alt"></i> ' + (o.channel ? h(posChanName(o)) : 'القناة: مباشر') + '</button>' : '') +
      (hasF('customers') ? '<button data-a="cust"><i class="fas fa-user"></i> ' + (o.customerName ? h(o.customerName) + (o.customerPoints ? ' · ' + o.customerPoints + ' نقطة' : '') : 'العميل') + '</button>' : '') +
      (hasF('discounts') || b.canManage ? '<button data-a="disc"><i class="fas fa-tag"></i> ' + (o.discountLabel ? h(o.discountLabel) : 'خصم / عرض') + '</button>' : '') +
      '<button data-a="note"><i class="fas fa-sticky-note"></i> ' + (o.notes ? h(o.notes.slice(0, 18)) : 'ملاحظة') + '</button>' +
    '</div>' +
    '<div class="pos-lines">' + (o.items.length ? o.items.map(function (l, i) {
      const unit = l.base + l.extras.reduce(function (a, e) { return a + e.price * e.qty; }, 0);
      if (!l.productId && l.name === 'رسوم التوصيل') return '';
      return '<div class="pos-line' + (l.sent ? ' sent' : '') + '"><div class="ln" data-edit="' + i + '">' + h(l.name) + (l.variant ? ' (' + h(l.variant) + ')' : '') +
        (l.extras.length || l.note ? '<small>' + l.extras.map(function (e) { return '+ ' + h(e.name); }).join(' ') + (l.note ? ' · ' + h(l.note) : '') + '</small>' : '') + '</div>' +
        '<div class="qty"><button data-m="' + i + '">−</button><span>' + nf(l.qty, l.qty % 1 ? 2 : 0) + '</span><button data-p="' + i + '">+</button></div><div class="lt">' + money(unit * l.qty) + '</div></div>';
    }).join('') : '<div class="empty-state" style="padding:30px 0">اختر الأصناف من القائمة</div>') + '</div>' +
    '<div class="pos-tot"><div><span>المجموع</span><span>' + money(t.sub) + '</span></div>' + (posDeliveryFee() > 0 ? '<div class="muted"><span><i class="fas fa-motorcycle"></i> رسوم التوصيل</span><span>' + money(posDeliveryFee()) + '</span></div>' : '') + (t.disc > 0.001 ? '<div style="color:#6ee7b7"><span>الخصم</span><span>-' + money(t.disc) + '</span></div>' : '') +
    (b.settings.tax.enabled ? '<div class="muted"><span>' + h(b.settings.tax.name || 'الضريبة') + ' ' + (b.settings.tax.inclusive ? '(مشمولة)' : '') + '</span><span>' + money(t.tax) + '</span></div>' : '') +
    '<div class="big"><span>الإجمالي</span><span>' + money(t.total) + '</span></div></div>' +
    '<div class="pos-actions">' +
      '<button class="btn btn-outline" data-a="hold" ' + (o.items.length ? '' : 'disabled') + '><i class="fas fa-pause"></i> تعليق</button>' +
      (hasF('kitchen') ? '<button class="btn btn-outline" data-a="kitchen" ' + (o.items.some(function (l) { return !l.sent; }) ? '' : 'disabled') + '><i class="fas fa-fire-burner"></i> للمطبخ</button>' : '<button class="btn btn-outline" data-a="clear" ' + (o.items.length && !o.id ? '' : 'disabled') + '><i class="fas fa-eraser"></i> تفريغ</button>') +
      (o.id ? '<button class="btn btn-danger" data-a="cancel"><i class="fas fa-ban"></i> إلغاء الطلب</button><button class="btn btn-outline" data-a="kot"><i class="fas fa-print"></i> طباعة للمطبخ</button>' : '') +
      (b.canPay === false ? '<div class="muted" style="grid-column:1/-1;text-align:center;font-size:12px;padding:6px"><i class="fas fa-lock"></i> الإجمالي ' + money(t.total) + ' — التحصيل يتم من الكاشير (لا تملك صلاحية استلام الدفع)</div>'
        : '<button class="btn btn-primary pay" data-a="pay" ' + (o.items.length ? '' : 'disabled') + '><i class="fas fa-money-bill-wave"></i> دفع ' + money(t.total) + '</button>') +
    '</div>';
  el.onclick = function (e) {
    const tt = e.target.closest('[data-t]'); if (tt) { o.orderType = tt.dataset.t; if (o.orderType !== 'dine_in') { o.tableId = ''; o.tableName = ''; } posRenderCart(); return; }
    const ed = e.target.closest('[data-edit]'); if (ed) { const l = o.items[+ed.dataset.edit]; posOptionsModal(l.productId ? b.products.find(function (x) { return x.id === l.productId; }) : null, l); return; }
    const pl = e.target.closest('[data-p]'); if (pl) { o.items[+pl.dataset.p].qty++; posRenderCart(); return; }
    const mi = e.target.closest('[data-m]'); if (mi) { const l = o.items[+mi.dataset.m]; if (l.sent && !b.canManage) { showToast('الصنف أُرسل للمطبخ — يتطلب صلاحية إدارة الطلبات', true); return; } l.qty--; if (l.qty <= 0) o.items.splice(+mi.dataset.m, 1); posRenderCart(); return; }
    const a = e.target.closest('[data-a]'); if (!a || a.disabled) return;
    const fn = { new: function () { POS.o = posNewOrder(); posRenderCart(); }, clear: function () { POS.o = posNewOrder(); posRenderCart(); }, table: posPickTable, chan: posPickChannel, cust: posPickCustomer, addr: posPickAddress, disc: posPickDiscount,
      note: function () { bPrompt('ملاحظة الطلب', [{ k: 'notes', label: 'ملاحظة', type: 'textarea', full: true }], { notes: o.notes }, function (d) { o.notes = d.notes; posRenderCart(); }); },
      hold: function () { posSave(false); }, kitchen: function () { posSave(true); }, cancel: posCancel, pay: posPay, kot: function () { posPrintKot(o); } }[a.dataset.a];
    if (fn) fn();
  };
}
async function posSave(toKitchen) {
  if (hasF('shifts') && POS.boot.settings.pos.requireShift && !POS.shift) { showToast('افتح وردية أولاً — لا يمكن إدخال الطلبات بدون وردية مفتوحة', true); posOpenShift(); return; }
  const r = await bzOk('posSaveOrder', { order: posPayload(), sendToKitchen: !!toKitchen });
  showToast(toKitchen ? 'تم إرسال الطلب #' + r.order.number + ' للمطبخ' : 'تم حفظ الطلب #' + r.order.number);
  if (toKitchen && POS.boot.settings.receipt && POS.boot.settings.receipt.kitchenPrint) posPrintKot(posFromServer(r.order));
  POS.o = posNewOrder();
  await posLoad(); posRender();
}
function posPrintKot(o) {
  printHtml('طلب للمطبخ', '<h2>طلب #' + h(o.number || '') + '</h2><div class="c">' + h(ORDER_TYPES[o.orderType] || '') + (o.tableName ? ' · ' + h(o.tableName) : '') + ' · ' + new Date().toLocaleTimeString('ar-EG') + '</div><hr><table>' +
    o.items.map(function (l) { return '<tr><td style="font-size:15px"><b>' + nf(l.qty, l.qty % 1 ? 2 : 0) + ' × ' + h(l.name) + (l.variant ? ' (' + h(l.variant) + ')' : '') + '</b>' + (l.extras.length ? '<div>+ ' + l.extras.map(function (e) { return h(e.name); }).join('، ') + '</div>' : '') + (l.note ? '<div>** ' + h(l.note) + '</div>' : '') + '</td></tr>'; }).join('') + '</table>' + (o.notes ? '<hr><div>' + h(o.notes) + '</div>' : ''), '80');
}
async function posCancel() {
  const so = POS.boot.openOrders.find(function (x) { return x.id === POS.o.id; }) || {};
  const started0 = ['preparing', 'ready', 'served'].indexOf(so.kitchen_status) >= 0;
  const r = await cancelReasonModal({ title: 'إلغاء الطلب #' + POS.o.number, kitchen: so.kitchen_status || 'none', sent: (so.items || []).some(function (l) { return l.sent; }), items: started0 ? (so.items || []).filter(function (l) { return l.sent; }).length ? so.items.filter(function (l) { return l.sent; }) : so.items : null });
  if (!r) return;
  const x = await bzOk('posCancelOrder', { id: POS.o.id, reason: r.reason, prepared: r.prepared, returnLines: r.returnLines });
  showToast('تم إلغاء الطلب' + (x.waste ? ' وتسجيل تالف بقيمة ' + money(x.waste) : '')); POS.o = posNewOrder(); await posLoad(); posRender();
}
var CANCEL_REASONS = ['طلب العميل', 'تأخر التحضير', 'خطأ في إدخال الطلب', 'نفاد مكوّن', 'شكوى جودة / طعم', 'لم يستلم العميل الطلب', 'طلب مكرر', 'أخرى'];
// نافذة سبب الإلغاء/الاسترجاع (إلزامي) مع خيار التالف
// v5.4.2: قائمة أسطر الطلب مع مفتاح «يعود للمخزون» لكل سطر — المنتج المستقل (سلعة جاهزة) مفعّل تلقائياً، والطبق المحضّر يُسجّل تالفاً
async function crLinesHtml(items) {
  if (!items || !items.length) return '';
  let pm = {};
  try { const list = (POS.boot && POS.boot.products) || await entList('products'); list.forEach(function (x) { pm[x.id] = x; }); } catch (e) { /* */ }
  return '<div class="sx-card" style="margin-top:10px"><div class="sx-card-h"><h4><i class="fas fa-boxes-stacked"></i> ماذا يعود للمخزون؟</h4><span class="sx-hint">المنتج المستقل (مثل المشروبات المغلقة) يعود للمخزون، والطبق المحضّر من مواد أولية يُسجّل تالفاً</span></div>' +
    items.map(function (l, i) {
      const pr = pm[l.productId] || {}; const stand = !!pr.track_stock;
      return '<div class="sx-lrow"><span class="sx-lrow-t">' + nf(l.qty, l.qty % 1 ? 2 : 0) + ' × ' + h(l.name) + (l.variant ? ' (' + h(l.variant) + ')' : '') + ' <span class="sx-chip">' + (stand ? 'منتج مستقل' : pr.recipe_name ? 'طبق محضّر' : 'منتج') + '</span></span>' +
        '<label class="sx-sw"><input type="checkbox" data-ret="' + i + '"' + (stand ? ' checked' : '') + '><span class="sx-sw-t"></span> يعود للمخزون</label></div>';
    }).join('') + '</div>';
}
async function cancelReasonModal(o) {
  const linesHtml = o.items ? await crLinesHtml(o.items) : '';
  return new Promise(function (res) {
    let done = false;
    const started = ['preparing', 'ready', 'served'].indexOf(o.kitchen) >= 0;
    const stageTxt = { none: 'لم يُرسل للمطبخ', new: 'أُرسل للمطبخ ولم يبدأ التحضير', preparing: 'قيد التحضير', ready: 'جاهز', served: 'تم التسليم' }[o.kitchen] || '';
    const refund = !!o.refund;
    const m = bModal({ title: o.title, icon: refund ? 'undo' : 'ban', print: false,
      sub: refund ? 'الاسترجاع يصدر إشعاراً دائناً — السبب إلزامي للمراجعة' : 'سبب الإلغاء إلزامي ويظهر في تقرير مؤشرات الأداء للإدارة',
      body: (stageTxt && !refund ? '<div class="muted" style="margin-bottom:8px">حالة المطبخ: <b>' + h(stageTxt) + '</b></div>' : '') +
        '<div class="opt-chips" id="crChips" style="margin-bottom:10px">' + CANCEL_REASONS.map(function (x) { return '<button type="button" class="opt-chip" data-r="' + h(x) + '">' + h(x) + '</button>'; }).join('') + '</div>' +
        '<label class="muted">تفاصيل السبب</label><textarea id="crNote" rows="2" placeholder="اكتب السبب بوضوح..." style="width:100%"></textarea>' +
        (refund && linesHtml ? linesHtml : refund ? '<label class="biz-check" style="margin-top:10px"><input type="checkbox" id="crRestock"> <span>إرجاع الكميات للمخزون (الأصناف لم تُحضّر/لم تُستهلك). بدون تحديد تُسجّل الكميات تالفاً.</span></label>'
          : started && linesHtml ? '<div class="muted" style="margin-top:10px"><i class="fas fa-exclamation-triangle" style="color:#f59e0b"></i> تم بدء التحضير — الأطباق المحضّرة تُسجّل تالفاً.</div>' + linesHtml
          : started ? '<div class="biz-card" style="margin-top:10px;border-color:#f59e0b"><i class="fas fa-exclamation-triangle" style="color:#f59e0b"></i> تم بدء التحضير — لن تعود الكميات للمخزون وستُسجَّل <b>تالفاً</b>.</div>'
          : o.sent ? '<label class="biz-check" style="margin-top:10px"><input type="checkbox" id="crPrep"> <span>بدأ المطبخ بالتحضير فعلاً (تسجيل الكميات تالفاً)</span></label>' : ''),
      foot: '<button class="btn btn-cancel" data-x>رجوع</button><button class="btn btn-danger" data-act="ok"><i class="fas fa-check"></i> ' + (refund ? 'تأكيد الاسترجاع' : 'تأكيد الإلغاء') + '</button>',
      onClose: function () { if (!done) res(null); },
      actions: { ok: function (mm) {
        const chip = mm.$('#crChips .opt-chip.on'), note = mm.$('#crNote').value.trim();
        const reason = [chip ? chip.dataset.r : '', note].filter(Boolean).join(' — ');
        if (reason.length < 3 || (chip && chip.dataset.r === 'أخرى' && !note)) { showToast('اختر سبباً أو اكتب التفاصيل', true); return; }
        done = true; const rs = mm.$('#crRestock'), pp = mm.$('#crPrep');
        const rl = mm.$$('[data-ret]'); const ret = rl.length ? rl.filter(function (x) { return x.checked; }).map(function (x) { return +x.dataset.ret; }) : undefined;
        res({ reason: reason, restock: rs ? rs.checked : false, prepared: pp ? pp.checked : started, returnLines: ret }); mm.close();
      } } });
    m.$('#crChips').onclick = function (e) { const b = e.target.closest('[data-r]'); if (!b) return; m.$$('#crChips .opt-chip').forEach(function (x) { x.classList.toggle('on', x === b); }); };
  });
}
function posPickTable() {
  const busy = {}; POS.boot.openOrders.forEach(function (x) { if (x.table_id && x.id !== POS.o.id) busy[x.table_id] = x.number; });
  if (!POS.boot.tables.length) { showToast('لا توجد طاولات — أضفها من صفحة الطاولات', true); return; }
  bModal({ title: 'اختيار الطاولة', icon: 'chair', wide: true, body: '<div class="tables-grid">' + POS.boot.tables.map(function (t) {
    return '<div class="tbl' + (busy[t.id] ? ' busy' : '') + '" data-act="pick" data-id="' + t.id + '"><div class="tn">' + h(t.name) + '</div><div class="ts">' + (busy[t.id] ? 'مشغولة · طلب #' + busy[t.id] : (t.area ? h(t.area) + ' · ' : '') + (t.seats || '') + ' مقاعد') + '</div></div>';
  }).join('') + '</div>',
    actions: { pick: function (m, el) {
      const t = POS.boot.tables.find(function (x) { return x.id === el.dataset.id; });
      if (busy[t.id]) { const ord = POS.boot.openOrders.find(function (x) { return x.table_id === t.id; }); m.close(); POS.o = posFromServer(ord); posRenderCart(); return; }
      POS.o.tableId = t.id; POS.o.tableName = t.name; m.close(); posRenderCart();
    } } });
}
function posPickCustomer() {
  const o = POS.o;
  const m = bModal({ title: 'العميل', icon: 'user', wide: true,
    body: '<div class="biz-toolbar"><input class="biz-search grow" id="pcQ" placeholder="ابحث بالاسم أو الجوال">' + scanBtnHtml('pcQ', 'قراءة بطاقة/QR العميل') + '<button class="btn btn-outline btn-sm" data-act="add"><i class="fas fa-user-plus"></i> عميل جديد</button>' + (o.customerId || o.customerName ? '<button class="btn btn-cancel btn-sm" data-act="none">بدون عميل</button>' : '') + '</div><div id="pcList"></div>' +
      '<div class="biz-sec" style="margin-top:12px">أو اسم وجوال فقط' + (hasF('loyalty') && POS.boot.settings.loyalty.enabled ? ' — يُسجَّل العميل تلقائياً برقم الجوال لاحتساب نقاط الولاء بعد الدفع' : ' (بدون حفظ)') + '</div>' + bForm([{ k: 'name', label: 'الاسم' }, { k: 'phone', label: 'الجوال', ltr: true }], { name: o.customerId ? '' : o.customerName, phone: o.customerId ? '' : o.customerPhone }),
    foot: '<button class="btn btn-cancel" data-x>إغلاق</button><button class="btn btn-primary" data-act="free">اعتماد الاسم</button>',
    actions: {
      none: function (mm) { Object.assign(o, { customerId: '', customerName: '', customerPhone: '', customerPoints: 0 }); mm.close(); posRenderCart(); },
      free: function (mm) { Object.assign(o, { customerId: '', customerName: mm.$('[data-k=name]').value.trim(), customerPhone: mm.$('[data-k=phone]').value.trim(), customerPoints: 0 }); mm.close(); posRenderCart(); },
      add: function (mm) { mm.close(); custEdit(null, function (c) { if (c && c.id) Object.assign(o, { customerId: c.id, customerName: c.name, customerPhone: c.phone, customerPoints: c.points || 0 }); posRenderCart(); }); },
      pick: function (mm, el) { const c = JSON.parse(el.dataset.c); Object.assign(o, { customerId: c.id, customerName: c.name, customerPhone: c.phone, customerPoints: c.points || 0 }); mm.close(); posRenderCart(); showToast('تم اختيار العميل: ' + c.name); }
    } });
  let tm;
  const load = async function () {
    const rows = await entList('customers', { q: m.$('#pcQ').value.trim() });
    m.$('#pcList').innerHTML = bTable([{ label: 'الاسم', r: function (c) { return h(c.name); } }, { label: 'الجوال', r: function (c) { return '<span dir="ltr">' + h(c.phone) + '</span>'; } }, { label: 'النقاط', num: true, r: function (c) { return c.points; } }, { label: 'الرصيد الآجل', num: true, r: function (c) { return money(c.balance); } }, { label: 'حد الآجل', num: true, r: function (c) { return +c.credit_limit ? money(c.credit_limit) : 'بلا حد'; } },
      { label: '', r: function (c) { const sel = o.customerId === c.id; return '<button class="btn btn-sm ' + (sel ? 'btn-success' : 'btn-primary') + '" data-act="pick" data-c="' + h(JSON.stringify({ id: c.id, name: c.name, phone: c.phone, points: c.points })) + '"><i class="fas fa-' + (sel ? 'check-circle' : 'check') + '"></i> ' + (sel ? 'محدد' : 'اختيار') + '</button>'; } }],
      rows.slice(0, 30), { rowAttr: function (c) { return 'class="pick-row" data-act="pick" data-c="' + h(JSON.stringify({ id: c.id, name: c.name, phone: c.phone, points: c.points })) + '"'; }, empty: 'لا يوجد عملاء مطابقون — أضف عميلاً جديداً' });
  };
  // v5.0: قراءة QR العميل من زر الكاميرا داخل نافذة العميل تربطه مباشرة بالطلب (بدل وضع الرمز في البحث فقط)
  let qrDone = false;
  const qrCheck = function () {
    if (qrDone) return true;
    const v = m.$('#pcQ').value.trim(), mm = v.match(/FCC-[A-Z0-9]+/i);
    if (!mm) return false;
    qrDone = true; clearTimeout(tm); m.close(); posCustomerQr(mm[0].toUpperCase()); return true;
  };
  m.$('#pcQ').addEventListener('input', function () { if (qrCheck()) return; clearTimeout(tm); tm = setTimeout(load, 300); });
  m.$('#pcQ').addEventListener('change', qrCheck);
  m.$('#pcQ').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); if (!qrCheck()) { clearTimeout(tm); load(); } } });
  load();
}
// v4.5: عنوان التوصيل لطلب الكاشير (من عناوين العميل المحفوظة أو يدوياً + رابط الموقع)
async function posPickAddress() {
  const o = POS.o, a = o.deliveryAddress || {};
  let saved = [];
  if (o.customerId) { try { const r = await bzOk('customerProfile', { id: o.customerId }); saved = (r.customer && r.customer.addresses) || []; if (!a.text && !saved.length && r.customer && r.customer.address) a.text = r.customer.address; } catch (e) { /* */ } }
  const F = [{ k: 'text', label: 'العنوان (الحي / الشارع)', full: true }, { k: 'complex', label: 'المجمع' }, { k: 'building', label: 'المبنى' }, { k: 'floor', label: 'الطابق' }, { k: 'apartment', label: 'الشقة' },
    { k: 'notes', label: 'تفاصيل إضافية / علامة مميزة', full: true }, { k: 'map', label: 'رابط الموقع (Google Maps) أو الإحداثيات', ltr: true, full: true, ph: '41.0082, 28.9784' },
    { k: 'fee', label: 'رسوم التوصيل', type: 'number', def: POS.boot.settings.delivery.fee }];
  const v = Object.assign({}, a, { map: a.lat ? a.lat + ', ' + a.lng : '', fee: o.deliveryFee !== null && o.deliveryFee !== undefined ? o.deliveryFee : POS.boot.settings.delivery.fee });
  const chips = saved.length ? '<div class="biz-sec">عناوين العميل المحفوظة</div><div class="opt-chips" style="margin-bottom:10px">' + saved.map(function (x, i) { return '<button class="opt-chip" data-act="useAddr" data-i="' + i + '"><i class="fas fa-map-marker-alt"></i> ' + h(x.label || dlAddrLine(x).slice(0, 30)) + '</button>'; }).join('') + '</div>' : '';
  bPrompt('عنوان التوصيل', [{ type: 'html', html: chips }].concat(F), v, function (d) {
    const ll = dlParseLatLng(d.map);
    o.deliveryAddress = { text: d.text, complex: d.complex, building: d.building, floor: d.floor, apartment: d.apartment, notes: d.notes, lat: ll ? ll[0] : (a.lat || null), lng: ll ? ll[1] : (a.lng || null), label: a.label || '' };
    if (!d.map) { o.deliveryAddress.lat = null; o.deliveryAddress.lng = null; }
    o.deliveryFee = d.fee === '' ? null : +d.fee;
    posRenderCart();
  }, { icon: 'map-marker-alt', wide: true, actions: { useAddr: function (m, el) { const x = saved[+el.dataset.i]; ['text', 'complex', 'building', 'floor', 'apartment', 'notes'].forEach(function (k) { const i = m.$('[data-k=' + k + ']'); if (i) i.value = x[k] || (k === 'text' ? [x.district, x.street].filter(Boolean).join('، ') : ''); }); m.$('[data-k=map]').value = x.lat ? x.lat + ', ' + x.lng : ''; } } });
}
function posPickDiscount() {
  const o = POS.o, ds = POS.boot.discounts || [];
  bModal({ title: 'الخصومات والعروض', icon: 'tag', wide: true,
    body: (ds.length ? '<div class="opt-chips" style="margin-bottom:14px">' + ds.map(function (d) { return '<button class="opt-chip" data-act="rule" data-id="' + d.id + '">' + h(d.name) + ' · ' + nf(d.value, 0) + (d.kind === 'percent' ? '%' : '') + (d.code ? ' <small>(' + h(d.code) + ')</small>' : '') + '</button>'; }).join('') + '</div>' : '<p class="muted" style="margin-bottom:12px">لا توجد عروض فعالة حالياً.</p>') +
      (hasF('discounts') ? '<div class="biz-toolbar"><input class="biz-search grow" id="dcCode" placeholder="كود الخصم (اكتب أو امسح)" dir="ltr">' + scanBtnHtml('dcCode', 'قراءة كود الخصم') + '<button class="btn btn-outline btn-sm" data-act="code">تطبيق الكود</button></div>' : '') +
      (POS.boot.canManage ? '<div class="biz-sec">خصم يدوي</div>' + bForm([{ k: 'kind', label: 'النوع', type: 'select', options: [['percent', 'نسبة %'], ['amount', 'مبلغ ثابت']] }, { k: 'value', label: 'القيمة', type: 'number' }]) : ''),
    foot: '<button class="btn btn-cancel" data-act="clear">إزالة الخصم</button>' + (POS.boot.canManage ? '<button class="btn btn-primary" data-act="manual">تطبيق الخصم اليدوي</button>' : ''),
    actions: {
      rule: function (m, el) { const d = ds.find(function (x) { return x.id === el.dataset.id; }); if (d.min_total > 0 && posTotals().sub < d.min_total) { showToast('العرض يتطلب حداً أدنى ' + money(d.min_total), true); return; } o.discount = { discountId: d.id }; o.discountLabel = d.name; m.close(); posRenderCart(); },
      code: function (m) { const c = m.$('#dcCode').value.trim().toUpperCase(); const d = ds.find(function (x) { return x.code && x.code.toUpperCase() === c; }); if (!d) { showToast('الكود غير صالح أو منتهي', true); return; } o.discount = { discountId: d.id }; o.discountLabel = d.name; m.close(); posRenderCart(); },
      manual: function (m) { const v = parseFloat(m.$('[data-k=value]').value) || 0, k = m.$('[data-k=kind]').value; if (!v) return; o.discount = { kind: k, value: v }; o.discountLabel = 'خصم ' + v + (k === 'percent' ? '%' : ''); m.close(); posRenderCart(); },
      clear: function (m) { o.discount = null; o.discountLabel = ''; m.close(); posRenderCart(); }
    },
    onOpen: function (m) { const c = m.$('#dcCode'); if (c) { setTimeout(function () { c.focus(); }, 60); c.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); m.$('[data-act=code]').click(); } }); } } });
}
async function posPay(preGift) {
  const b = POS.boot;
  if (!preGift && POS.pendingGift) { preGift = POS.pendingGift; }
  POS.pendingGift = null;
  if (preGift && !preGift.card) preGift = null;
  if (hasF('shifts') && b.settings.pos.requireShift && !POS.shift) { showToast('افتح وردية أولاً', true); posOpenShift(); return; }
  if (b.canPay === false) { showToast('لا تملك صلاحية استلام الدفع', true); return; }
  const prePoints = POS.pendingPoints || 0; POS.pendingPoints = 0;
  // حفظ الطلب أولاً للحصول على الإجمالي النهائي من السيرفر
  const keepPts = POS.o.customerPoints || 0, keepCid = POS.o.customerId;
  const saved = await bzOk('posSaveOrder', { order: posPayload(), sendToKitchen: false });
  POS.o = posFromServer(saved.order); if (POS.o.customerId && POS.o.customerId === keepCid) POS.o.customerPoints = keepPts; posRenderCart();
  // رصيد النقاط الفعلي من الخادم (لتجنب «الرصيد غير كافٍ» بسبب قيمة قديمة)
  let wallet = null;
  async function loadWallet(q) {
    const r = await bz('customerByQr', q);
    if (!r.success) { showToast(r.error || 'العميل غير موجود', true); return null; }
    wallet = r; const c = r.customer;
    Object.assign(POS.o, { customerId: c.id, customerName: c.name, customerPhone: c.phone, customerPoints: c.points || 0 });
    return r;
  }
  if (hasF('customers') && POS.o.customerId) await loadWallet({ id: POS.o.customerId }).catch(function () {});
  const due = +saved.order.total;
  // v5.2.0: الطلب من منصة توصيل ← إغلاق آجل على المنصة حتى مطابقة كشفها وتسويتها بعد العمولات
  if (b.channelCredit && POS.o.channel && POS.o.channel !== 'online') { posChannelClose(saved.order, due); return; }
  const pays = [];
  const methods = [['cash', 'نقداً', 'money-bill'], ['card', 'بطاقة', 'credit-card'], ['transfer', 'تحويل', 'university']];
  if (hasF('gift_cards')) methods.push(['gift', 'بطاقة هدية', 'gift']);
  if (hasF('loyalty') && b.settings.loyalty.enabled && hasF('customers')) methods.push(['points', 'نقاط الولاء', 'star']);
  if (hasF('ledger') && POS.o.customerId) methods.push(['credit', 'آجل', 'book']);
  const m = bModal({ title: 'الدفع — طلب #' + saved.order.number, icon: 'money-bill-wave', wide: true,
    body: '<div class="pay-grid"><div class="pay-l"><div class="pay-due" id="pyDue"></div><div class="pay-methods">' + methods.map(function (x) { return '<button data-act="m" data-m="' + x[0] + '"><i class="fas fa-' + x[2] + '"></i><br>' + x[1] + '</button>'; }).join('') + '</div>' +
      (hasF('customers') ? '<div class="pay-cust" id="pyCust"></div>' : '') +
      '<div class="pay-list" id="pyList"></div></div><div class="pay-r"><div class="biz-toolbar" style="margin-top:0"><label class="muted">المبلغ:</label><input class="biz-search grow" id="pyAmt" type="number" step="any" dir="ltr"></div>' +
      '<div class="numpad" id="pyPad">' + [7, 8, 9, 4, 5, 6, 1, 2, 3, '.', 0, '⌫'].map(function (k) { return '<button data-k="' + k + '">' + k + '</button>'; }).join('') + '</div>' +
      '<label class="biz-check" style="margin-top:10px"><input type="checkbox" id="pyPrint" ' + (localStorage.getItem('fcAutoPrint') === '0' ? '' : 'checked') + '> <span>طباعة الفاتورة بعد الدفع</span></label></div></div>',
    foot: '<button class="btn btn-cancel" data-x>رجوع</button><button class="btn btn-success" data-act="done" id="pyDone"><i class="fas fa-check"></i> إتمام الدفع</button>',
    actions: {
      m: function (mm, el) {
        const k = el.dataset.m, paid = pays.reduce(function (s, x) { return s + x.amount; }, 0), rem = Math.max(0, Math.round((due - paid) * 100) / 100);
        let amt = parseFloat(mm.$('#pyAmt').value); if (!(amt > 0)) amt = rem;
        if (!(amt > 0)) { showToast('تم تغطية المبلغ بالكامل'); return; }
        if (k !== 'cash' && amt > rem + 0.009) amt = rem;
        if (k === 'points') { pointsAsk(parseFloat(mm.$('#pyAmt').value) || 0); return; }
        if (k === 'gift') { giftAsk(parseFloat(mm.$('#pyAmt').value) || 0); return; }
        const p = { method: k, amount: Math.round(amt * 100) / 100, ref: '' };
        if (k === 'card' || k === 'transfer') p.ref = '';
        pays.push(p); mm.$('#pyAmt').value = ''; draw();
      },
      rm: function (mm, el) { pays.splice(+el.dataset.i, 1); draw(); },
      cqr: async function () { const code = await bScan({ title: 'حساب العميل', sub: 'امسح QR العميل من تطبيقه أو اكتب رقم جواله', placeholder: 'FCC-... أو رقم الجوال' }); if (!code) return; if (await loadWallet({ code: code })) { draw(); showToast('تم اختيار العميل: ' + wallet.customer.name); } },
      pts: function () { pointsAsk(0); },
      done: async function (mm, btn) {
        const paid = pays.reduce(function (s, x) { return s + x.amount; }, 0);
        if (!pays.length && due > 0) { pays.push({ method: 'cash', amount: due, ref: '' }); }
        else if (paid < due - 0.009) { showToast('المبلغ المدفوع أقل من الإجمالي', true); return; }
        btn.disabled = true;
        try {
          localStorage.setItem('fcAutoPrint', mm.$('#pyPrint').checked ? '1' : '0');
          const r = await bzOk('posCheckout', { order: posPayload(), payments: pays });
          mm.close();
          const doPrint = mm.$('#pyPrint').checked;
          bModal({ title: 'تم الدفع', icon: 'check-circle', body: '<div class="pay-due">فاتورة رقم ' + r.invoice.number + '</div>' + (r.change > 0 ? '<p style="text-align:center;font-size:1.3rem;margin-top:10px">الباقي للعميل: <b style="color:#6ee7b7">' + money(r.change) + '</b></p>' : ''),
            foot: '<button class="btn btn-outline" data-act="pr"><i class="fas fa-print"></i> طباعة</button><button class="btn btn-primary" data-x>طلب جديد</button>',
            actions: { pr: function () { printInvoice(r.invoice.id); } } });
          if (doPrint) printInvoice(r.invoice.id);
          POS.o = posNewOrder(); await posLoad(); posRender();
        } catch (e) { pays.length = 0; draw(); } finally { btn.disabled = false; }
      }
    } });
  // نقاط الولاء: قراءة QR العميل ← عرض الرصيد ← العميل يختار: خصم كل المتاح، أو مبلغ محدد، أو الاحتفاظ بنقاطه
  function ptsUsed() { return pays.filter(function (x) { return x.method === 'points'; }).reduce(function (s, x) { return s + x.amount; }, 0); }
  async function pointsAsk(wanted) {
    if (!POS.o.customerId || !wallet) {
      const code = await bScan({ title: 'نقاط العميل', sub: 'امسح QR العميل من تطبيقه أو اكتب رقم جواله لعرض رصيد نقاطه', placeholder: 'FCC-... أو رقم الجوال' });
      if (!code) return;
      if (!(await loadWallet({ code: code }))) return;
      draw();
    }
    const w = wallet, pv = +w.pointValue || 0.05, pts = +w.customer.points || 0, minR = +w.minRedeem || 0;
    if (!w.loyalty) { showToast('برنامج الولاء غير مفعّل', true); return; }
    const avail = Math.max(0, Math.floor(pts * pv * 100) / 100 - ptsUsed());
    const paid = pays.reduce(function (s2, x) { return s2 + x.amount; }, 0), rem = Math.max(0, Math.round((due - paid) * 100) / 100);
    if (!(rem > 0)) { showToast('تم تغطية المبلغ بالكامل'); return; }
    if (pts < minR) { showToast('رصيد العميل ' + nf(pts, 0) + ' نقطة — الحد الأدنى للاستبدال ' + nf(minR, 0) + ' نقطة', true); return; }
    if (!(avail > 0)) { showToast('رصيد نقاط العميل صفر', true); return; }
    const full = Math.round(Math.min(avail, rem) * 100) / 100;
    const pm = bModal({ title: 'الدفع بالنقاط — ' + w.customer.name, icon: 'star', print: false,
      body: '<div class="biz-kpis" style="grid-template-columns:repeat(3,1fr)"><div class="biz-kpi"><small>رصيد النقاط</small><b>' + nf(pts, 0) + '</b></div><div class="biz-kpi"><small>قيمتها</small><b>' + money(avail) + '</b></div><div class="biz-kpi"><small>المتبقي من الفاتورة</small><b>' + money(rem) + '</b></div></div>' +
        '<p class="muted" style="margin:8px 0">قيمة النقطة ' + money(pv) + (minR ? ' · الحد الأدنى للاستبدال ' + nf(minR, 0) + ' نقطة' : '') + '. اسأل العميل: هل يرغب بخصم رصيده أم الاحتفاظ بنقاطه؟</p>' +
        '<label class="muted">مبلغ الخصم بالنقاط (اتركه لخصم كل المتاح)</label><input class="biz-search" id="ptAmt" type="number" step="any" min="0" max="' + full + '" dir="ltr" value="' + (wanted > 0 ? Math.min(wanted, full) : full) + '" style="width:100%;margin-top:6px">' +
        '<div class="muted" id="ptInfo" style="margin-top:6px;font-size:.85rem"></div>',
      foot: '<button class="btn btn-cancel" data-x>الاحتفاظ بالنقاط</button><button class="btn btn-outline" data-act="all">خصم كل المتاح (' + money(full) + ')</button><button class="btn btn-primary" data-act="use"><i class="fas fa-check"></i> خصم المبلغ ودفع الفرق</button>',
      actions: {
        all: function (x) { add(full); x.close(); },
        use: function (x) { const v = parseFloat(x.$('#ptAmt').value); if (!(v > 0)) { showToast('أدخل مبلغاً صحيحاً', true); return; } add(Math.min(v, full)); x.close(); }
      } });
    const inf = function () { const v = Math.min(parseFloat(pm.$('#ptAmt').value) || 0, full); const n = Math.ceil(v / pv - 1e-9); pm.$('#ptInfo').textContent = 'سيُخصم ' + nf(n, 0) + ' نقطة · يتبقى للعميل ' + nf(Math.max(0, pts - Math.ceil((ptsUsed() + v) / pv - 1e-9)), 0) + ' نقطة · الفرق المطلوب ' + money(Math.max(0, rem - v)); };
    pm.$('#ptAmt').addEventListener('input', inf); inf();
    function add(v) {
      v = Math.round(v * 100) / 100; if (!(v > 0)) return;
      if (minR && Math.ceil(v / pv - 1e-9) < minR) { showToast('الحد الأدنى للاستبدال ' + nf(minR, 0) + ' نقطة (' + money(minR * pv) + ')', true); return; }
      pays.push({ method: 'points', amount: v, ref: '' }); m.$('#pyAmt').value = ''; draw();
      showToast(v < rem - 0.009 ? 'تم خصم ' + money(v) + ' بالنقاط — أكمل الفرق ' + money(rem - v) + ' بوسيلة أخرى' : 'تمت التغطية بالنقاط');
    }
  }
  // بطاقة الهدية: قراءة QR بالكاميرا/القارئ ← التحقق من الرصيد ← خصم المتاح فقط والباقي بوسيلة أخرى
  async function giftAsk(wanted) {
    const code = await bScan({ title: 'بطاقة الهدية', sub: 'امسح QR البطاقة بالكاميرا أو القارئ، أو اكتب الكود', placeholder: 'كود البطاقة' });
    if (!code) return;
    const r = await bzOk('giftCardCheck', { code: code });
    useGift(r, wanted);
  }
  function useGift(r, wanted) {
    const g = r.card;
    if (!g.active) { showToast('البطاقة موقوفة', true); return; }
    if (r.expired) { showToast('البطاقة منتهية الصلاحية', true); return; }
    const usedBefore = pays.filter(function (x) { return x.method === 'gift' && x.ref.toUpperCase() === g.code.toUpperCase(); }).reduce(function (s, x) { return s + x.amount; }, 0);
    const bal = Math.round((+g.balance - usedBefore) * 100) / 100;
    if (!(bal > 0)) { showToast('رصيد البطاقة صفر', true); return; }
    const paid = pays.reduce(function (s, x) { return s + x.amount; }, 0), rem = Math.max(0, Math.round((due - paid) * 100) / 100);
    if (!(rem > 0)) { showToast('تم تغطية المبلغ بالكامل'); return; }
    const amt = Math.round(Math.min(bal, rem, wanted > 0 ? wanted : rem) * 100) / 100;
    pays.push({ method: 'gift', amount: amt, ref: g.code, balance: bal, left: Math.round((bal - amt) * 100) / 100 });
    m.$('#pyAmt').value = ''; draw();
    if (amt < rem - 0.009) showToast('رصيد البطاقة ' + money(bal) + ' غير كافٍ — تم خصم ' + money(amt) + '، أكمل المتبقي ' + money(rem - amt) + ' بوسيلة أخرى');
    else showToast('تم الدفع من البطاقة ' + money(amt) + ' · يتبقى بالبطاقة ' + money(bal - amt));
  }
  m.$('#pyPad').onclick = function (e) { const b2 = e.target.closest('[data-k]'); if (!b2) return; const i = m.$('#pyAmt'); if (b2.dataset.k === '⌫') i.value = i.value.slice(0, -1); else i.value += b2.dataset.k; };
  function draw() {
    const paid = pays.reduce(function (s, x) { return s + x.amount; }, 0), rem = due - paid;
    m.$('#pyDue').innerHTML = 'المطلوب: ' + money(due) + (pays.length ? '<div style="font-size:1rem;margin-top:4px;color:' + (rem > 0.009 ? '#fbbf24' : '#6ee7b7') + '">' + (rem > 0.009 ? 'المتبقي ' + money(rem) : (rem < -0.009 ? 'الباقي للعميل ' + money(-rem) : 'تمت التغطية')) + '</div>' : '');
    const pc = m.$('#pyCust');
    if (pc) {
      const loy = hasF('loyalty') && b.settings.loyalty.enabled;
      pc.innerHTML = POS.o.customerId
        ? '<i class="fas fa-user-check"></i> <b>' + h(POS.o.customerName || '') + '</b>' + (loy && wallet ? ' · رصيد النقاط ' + nf(wallet.customer.points, 0) + ' (' + money(Math.max(0, Math.floor(wallet.customer.points * (+wallet.pointValue || 0.05) * 100) / 100 - ptsUsed())) + ' متاح)' : '') +
          ' <button class="btn btn-sm btn-outline" data-act="cqr"><i class="fas fa-qrcode"></i> تغيير</button>' + (loy && wallet && wallet.customer.points > 0 ? ' <button class="btn btn-sm btn-primary" data-act="pts"><i class="fas fa-star"></i> الدفع بالنقاط</button>' : '')
        : '<button class="btn btn-sm btn-outline" data-act="cqr"><i class="fas fa-qrcode"></i> قراءة QR العميل / رقم الجوال</button> <span class="muted">لإضافة النقاط أو الدفع برصيد النقاط</span>';
    }
    m.$('#pyList').innerHTML = pays.map(function (p, i) { return '<div class="pl"><span>' + h(PAY_NAMES[p.method]) + (p.ref ? ' · <span dir="ltr">' + h(p.ref) + '</span>' : '') + (p.method === 'gift' && p.balance !== undefined ? '<span class="pay-gift-info">رصيد البطاقة ' + money(p.balance) + ' · المتبقي بالبطاقة بعد الدفع ' + money(p.left) + '</span>' : '') + '</span><span>' + money(p.amount) + ' <button class="ico-btn danger" data-act="rm" data-i="' + i + '"><i class="fas fa-times"></i></button></span></div>'; }).join('');
  }
  m.el.classList.add('pay-fit');
  draw();
  if (preGift) useGift(preGift, 0);
  if (prePoints > 0) pointsAsk(prePoints);
}
function posOpenOrdersModal() {
  const list = POS.boot.openOrders;
  bModal({ title: 'الطلبات المعلّقة والمفتوحة', icon: 'receipt', xwide: true,
    body: bTable([{ label: '#', r: function (o) { return '<b>' + o.number + '</b>'; } }, { label: 'النوع', r: function (o) { return h(ORDER_TYPES[o.order_type]) + (o.table_name ? ' · ' + h(o.table_name) : ''); } },
      { label: 'العميل', r: function (o) { return h(o.customer_name || '—'); } }, { label: 'المطبخ', r: function (o) { return o.kitchen_status === 'none' ? '—' : kBadge(o.kitchen_status); } }, { label: 'الموظف', r: function (o) { return h(o.staff_name); } },
      { label: 'الوقت', r: function (o) { return dt(o.created_at); } }, { label: 'الإجمالي', num: true, r: function (o) { return money(o.total); } }], list,
      { rowAttr: function (o) { return 'data-act="pick" data-click="1" data-id="' + o.id + '"'; }, empty: 'لا توجد طلبات مفتوحة' }),
    actions: { pick: function (m, el) { POS.o = posFromServer(list.find(function (x) { return x.id === el.dataset.id; })); m.close(); posRenderCart(); } } });
}
function kBadge(s) { return stBadge({ new: ['جديد', 'badge-info'], preparing: ['قيد التحضير', 'badge-warning'], ready: ['جاهز', 'badge-success'], served: ['تم التسليم', 'badge-cash'] }, s); }
async function posMenuOrders() {
  const r = await bzOk('getMenuOrders', { status: 'new' });
  const list = r.orders || [];
  bModal({ title: 'طلبات المينيو الإلكتروني', icon: 'qrcode', xwide: true, sub: 'طلبات العملاء من المينيو (QR) بانتظار القبول',
    body: list.length ? list.map(function (o) {
      return '<div class="biz-card"><div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px"><b>' + (o.orderType === 'delivery' ? '<span class="badge badge-info"><i class="fas fa-motorcycle"></i> توصيل</span>' : o.tableNumber ? 'طاولة ' + h(o.tableNumber) : 'سفري') + ' · ' + h(o.customerName || '') + ' <span dir="ltr">' + h(o.customerPhone || '') + '</span></b><span class="muted">' + h(o.date) + '</span></div>' +
        '<div style="margin:8px 0;line-height:1.9">' + o.items.map(function (i) { return nf(i.qty, 0) + ' × ' + h(i.name) + (i.size ? ' (' + h(i.size) + ')' : '') + (i.extras && i.extras.length ? ' + ' + i.extras.map(function (e) { return h(e.name); }).join('، ') : ''); }).join('<br>') + '</div>' +
        (o.orderType === 'delivery' && o.address ? '<div class="muted" style="line-height:1.8"><i class="fas fa-map-marker-alt"></i> ' + h(o.addressLine || '') + (o.address.notes ? ' — ' + h(o.address.notes) : '') + ' <a target="_blank" rel="noopener" href="' + h(dlMapUrl(o.address)) + '">الخريطة</a>' + (o.deliveryFee ? ' · رسوم التوصيل ' + money(o.deliveryFee) : '') + '</div>' : '') +
        (o.notes ? '<div class="muted">' + h(o.notes) + '</div>' : '') + '<div style="display:flex;gap:6px;justify-content:space-between;align-items:center;margin-top:8px"><b>' + money(o.total) + '</b><span><button class="btn btn-danger btn-sm" data-act="rej" data-id="' + h(o.id) + '">رفض</button> <button class="btn btn-success btn-sm" data-act="acc" data-id="' + h(o.id) + '"><i class="fas fa-check"></i> قبول وتحويل للكاشير</button></span></div></div>';
    }).join('') : '<div class="empty-state">لا توجد طلبات جديدة</div>',
    actions: {
      acc: async function (m, el) { const x = await bzOk('importMenuOrder', { menuOrderId: el.dataset.id }); m.close(); showToast('تم قبول الطلب #' + x.order.number); await posLoad(); POS.o = posFromServer(x.order); posRender(); },
      rej: async function (m, el) { if (!(await bConfirm('رفض هذا الطلب؟'))) return; await bzOk('updateMenuOrderStatus', { id: el.dataset.id, status: 'rejected' }); m.close(); await posLoad(); posRender(); }
    } });
}
function posOpenShift() {
  bPrompt('فتح وردية جديدة', [{ k: 'openingCash', label: 'الرصيد الافتتاحي في الدرج', type: 'number', def: 0, req: true }, { k: 'notes', label: 'ملاحظات', full: true }], {}, async function (d) {
    await bzOk('shiftOpen', d); showToast('تم فتح الوردية'); await posLoad(); posRender();
  }, { icon: 'play', saveText: 'فتح الوردية' });
}
async function posShiftModal() {
  const r = await bzOk('shiftCurrent', {});
  if (!r.shift) { posOpenShift(); return; }
  const s = r.shift, l = r.live;
  bModal({ title: 'الوردية الحالية', icon: 'cash-register', wide: true, sub: h(s.staff_name) + ' · منذ ' + dt(s.opened_at),
    body: kpis([['المبيعات', money(l.sales), l.salesCount + ' فاتورة'], ['المرتجعات', money(l.refunds)], ['نقدية متوقعة بالدرج', money(l.expectedCash), '', '#6ee7b7']]) +
      bTable([{ label: 'طريقة الدفع', r: function (x) { return h(PAY_NAMES[x[0]] || x[0]); } }, { label: 'المبلغ', num: true, r: function (x) { return money(x[1]); } }], Object.entries(l.byMethod), { empty: 'لا توجد مبيعات بعد' }) +
      '<div class="muted" style="margin-top:8px;line-height:1.9">الافتتاحي: ' + money(s.opening_cash) + ' · إيداعات: ' + money(s.cash_in) + ' · سحوبات: ' + money(s.cash_out) + ' · مصروفات نقدية: ' + money(l.cashExpenses) + ' · تحصيل آجل: ' + money(l.creditCollections) + '</div>',
    foot: '<button class="btn btn-outline" data-act="in"><i class="fas fa-arrow-down"></i> إيداع</button><button class="btn btn-outline" data-act="out"><i class="fas fa-arrow-up"></i> سحب</button><button class="btn btn-danger" data-act="close"><i class="fas fa-stop"></i> إغلاق الوردية</button>',
    actions: {
      in: function (m) { m.close(); cashMove('in'); }, out: function (m) { m.close(); cashMove('out'); },
      close: function (m) {
        m.close();
        bPrompt('إغلاق الوردية', [{ k: 'closingCash', label: 'النقدية الفعلية في الدرج', type: 'number', req: true, hint: 'المتوقع: ' + money(l.expectedCash) }, { k: 'notes', label: 'ملاحظات', full: true }], {}, async function (d) {
          const x = await bzOk('shiftClose', d);
          await posLoad(); posRender();
          shiftReportModal(x.shift.id);
        }, { icon: 'stop', saveText: 'إغلاق وطباعة التقرير' });
      }
    } });
  function cashMove(kind) {
    // v5.4.3: السبب إلزامي وكل حركة تذهب للمحاسب للاعتماد وتثبيت القيد
    const R = kind === 'in' ? [['change', 'فكة / تغذية الصندوق'], ['owner', 'إيداع من المالك'], ['advance', 'سداد سلفة موظف'], ['other', 'أخرى']]
      : [['supplier', 'دفع لمورد'], ['expense', 'مصروف'], ['bank', 'إيداع في البنك'], ['owner', 'سحب للمالك'], ['advance', 'سلفة موظف'], ['other', 'أخرى']];
    bPrompt(kind === 'in' ? 'إيداع نقدية في الدرج' : 'سحب نقدية من الدرج', [{ k: 'amount', label: 'المبلغ', type: 'number', req: true }, { k: 'reason', label: 'نوع الحركة', type: 'select', req: true, options: [['', '—']].concat(R) },
      { k: 'note', label: 'التفاصيل (اسم المورد، رقم الفاتورة، المستلم...)', full: true, req: true }], {}, async function (d) {
      await bzOk('shiftCashMove', Object.assign({ kind: kind }, d)); showToast('تم التسجيل — بانتظار اعتماد المحاسب');
    }, { icon: kind === 'in' ? 'arrow-down' : 'arrow-up', sub: 'تظهر الحركة فوراً في «الحسابات والمصروفات › حركات الصندوق» ليعتمدها المحاسب ويثبت القيد.' });
  }
}
async function shiftReportModal(id) {
  const r = await bzOk('shiftReport', { id: id });
  const s = r.shift, sm = s.summary || r.summary || {};
  const html = '<h2>تقرير وردية</h2><div class="c">' + h(s.staff_name) + '</div><div class="c muted">' + dt(s.opened_at) + ' — ' + dt(s.closed_at) + '</div><hr><table>' +
    [['عدد الفواتير', sm.salesCount], ['المبيعات', money(sm.sales)], ['المرتجعات', money(sm.refunds)]].concat(Object.entries(sm.byMethod || {}).map(function (x) { return [PAY_NAMES[x[0]] || x[0], money(x[1])]; }))
      .concat([['الرصيد الافتتاحي', money(s.opening_cash)], ['إيداعات', money(s.cash_in)], ['سحوبات', money(s.cash_out)], ['مصروفات نقدية', money(sm.cashExpenses)], ['تحصيل آجل', money(sm.creditCollections)], ['النقدية المتوقعة', money(s.expected_cash)], ['النقدية الفعلية', money(s.closing_cash)], ['الفرق', money(sm.difference)]])
      .map(function (x) { return '<tr><td>' + h(x[0]) + '</td><td class="l">' + h(x[1]) + '</td></tr>'; }).join('') + '</table>';
  bModal({ title: 'تقرير الوردية', icon: 'file-invoice', body: '<div style="background:#fff;color:#000;padding:14px;border-radius:12px">' + html + '</div>',
    foot: '<button class="btn btn-cancel" data-x>إغلاق</button><button class="btn btn-primary" data-act="p"><i class="fas fa-print"></i> طباعة</button>', actions: { p: function () { printHtml('تقرير وردية', html, '80'); } } });
}

// ---------- صفحة الطلبات ----------
bizPage('orders', { group: 'ops', title: 'الطلبات والفواتير', icon: 'receipt', feature: 'pos', perms: ['pos', 'orders_manage', 'finance', 'reports'], plan: 'pro',
  pitch: 'سجل كامل للطلبات والفواتير الإلكترونية مع البحث والاسترجاع وإعادة الطباعة.',
  render: async function (body) {
    body.innerHTML = subTabs('ordSub', [['orders', 'الطلبات', 'receipt'], ['invoices', 'الفواتير الإلكترونية', 'file-invoice']], 'orders') + '<div id="ordBody"></div>';
    bindSubTabs(body, 'ordSub', function (k) { k === 'orders' ? ordersView(body.querySelector('#ordBody')) : invoicesView(body.querySelector('#ordBody')); });
    ordersView(body.querySelector('#ordBody'));
  } });
function ordersView(el) {
  el.innerHTML = dateRangeBar('ordRange', daysAgo(6), isoLocal(), '<select data-f="status"><option value="">كل الحالات</option><option value="open">مفتوح</option><option value="paid">مدفوع</option><option value="cancelled">ملغى</option><option value="refunded">مسترجع</option></select><input data-f="q" class="biz-search" placeholder="رقم الطلب / العميل / الطاولة" style="min-width:160px">') + '<div id="ordList"></div>';
  const get = bindRange(el, 'ordRange', load);
  async function load(f) {
    const r = await bzOk('getOrders', f || get(), { loading: false });
    const rows = r.orders;
    const tot = rows.filter(function (o) { return o.status === 'paid'; }).reduce(function (s, o) { return s + +o.total; }, 0);
    el.querySelector('#ordList').innerHTML = '<div class="muted" style="margin-bottom:8px">' + rows.length + ' طلب · المدفوع: ' + money(tot) + ' </div>' +
      bTable([{ label: '#', r: function (o) { return '<b>' + o.number + '</b>'; } }, { label: 'التاريخ', r: function (o) { return dt(o.created_at); } }, { label: 'النوع', r: function (o) { return h(ORDER_TYPES[o.order_type]) + (o.table_name ? ' · ' + h(o.table_name) : '') + (o.source === 'menu' ? ' <span class="badge badge-info">مينيو</span>' : ''); } },
        { label: 'العميل', r: function (o) { return h(o.customer_name || '—'); } }, { label: 'الموظف', r: function (o) { return h(o.staff_name); } }, { label: 'الحالة', r: function (o) { return stBadge(ORDER_STATUS, o.status); } }, { label: 'الإجمالي', num: true, r: function (o) { return money(o.total); } }],
        rows, { rowAttr: function (o) { return 'data-click="1" data-id="' + o.id + '"'; } });
    el.querySelector('#ordList').onclick = function (e) { const tr = e.target.closest('tr[data-id]'); if (tr) orderDetails(tr.dataset.id, function () { load(); }); };
    const x = el.querySelector('#ordX'); if (x) x.onclick = function () { exportRowsExcel('الطلبات', ['الرقم', 'التاريخ', 'النوع', 'الطاولة', 'العميل', 'الموظف', 'الحالة', 'المجموع', 'الخصم', 'الضريبة', 'الإجمالي'], rows.map(function (o) { return [o.number, dt(o.created_at), ORDER_TYPES[o.order_type], o.table_name, o.customer_name, o.staff_name, (ORDER_STATUS[o.status] || [o.status])[0], +o.subtotal, +o.discount_total, +o.tax_total, +o.total]; })); };
  }
  load();
}
async function orderDetails(id, after) {
  const r = await bzOk('getOrder', { id: id });
  const o = r.order;
  const canM = B.acc.isOwner || canP('orders_manage');
  bModal({ title: 'طلب #' + o.number, icon: 'receipt', wide: true, sub: dt(o.created_at) + ' · ' + (ORDER_TYPES[o.order_type] || ''),
    body: '<div style="margin-bottom:10px">' + stBadge(ORDER_STATUS, o.status) + ' ' + (o.table_name ? '<span class="badge badge-info">' + h(o.table_name) + '</span>' : '') + ' ' + (o.customer_name ? '<span class="badge badge-cash">' + h(o.customer_name) + '</span>' : '') + '</div>' +
      bTable([{ label: 'الصنف', r: function (l) { return h(l.name) + (l.variant ? ' (' + h(l.variant) + ')' : '') + (l.extras && l.extras.length ? '<div class="muted" style="font-size:.78rem">+ ' + l.extras.map(function (e) { return h(e.name); }).join('، ') + '</div>' : ''); } }, { label: 'الكمية', num: true, r: function (l) { return nf(l.qty, l.qty % 1 ? 2 : 0); } }, { label: 'السعر', num: true, r: function (l) { return money(l.unit); } }, { label: 'الإجمالي', num: true, r: function (l) { return money(l.total); } }], o.items) +
      '<div class="pos-tot"><div><span>المجموع</span><span>' + money(o.subtotal) + '</span></div><div><span>الخصم</span><span>' + money(o.discount_total) + '</span></div><div><span>الضريبة</span><span>' + money(o.tax_total) + '</span></div><div class="big"><span>الإجمالي</span><span>' + money(o.total) + '</span></div></div>' +
      ((o.payments || []).length ? '<div class="muted">الدفع: ' + o.payments.map(function (p) { return h(PAY_NAMES[p.method] || p.method) + ' ' + money(p.amount); }).join(' · ') + '</div>' : '') +
      (r.invoices.length ? '<div class="biz-sec" style="margin-top:10px">الفواتير</div>' + r.invoices.map(function (i) { return '<div class="pl" style="display:flex;justify-content:space-between;padding:6px 0"><span>' + (i.kind === 'refund' ? 'إشعار دائن' : 'فاتورة') + ' #' + i.number + ' · ' + dt(i.issued_at) + '</span><button class="btn btn-outline btn-sm" data-act="pi" data-id="' + i.id + '"><i class="fas fa-print"></i></button></div>'; }).join('') : '') +
      (o.notes ? '<p class="muted" style="margin-top:8px">' + h(o.notes) + '</p>' : ''),
    foot: '<button class="btn btn-cancel" data-x>إغلاق</button>' + (o.status === 'open' && canP('pos') ? '<button class="btn btn-primary" data-act="edit"><i class="fas fa-cash-register"></i> فتح في الكاشير</button>' : '') + (o.status === 'paid' && canM ? '<button class="btn btn-danger" data-act="refund"><i class="fas fa-undo"></i> استرجاع</button>' : ''),
    actions: {
      pi: function (m, el) { printInvoice(el.dataset.id); },
      edit: function (m) { m.close(); POS.o = posFromServer(o); switchTab('pos'); },
      refund: async function (m) {
        const rr = await cancelReasonModal({ title: 'استرجاع الطلب #' + o.number, refund: true, items: o.items || [] }); if (!rr) return;
        const x = await bzOk('posRefund', { id: o.id, reason: rr.reason, restock: rr.restock, returnLines: rr.returnLines }); m.close(); showToast('تم الاسترجاع وإصدار إشعار دائن #' + x.invoice.number); if (after) after();
      }
    } });
}
function invoicesView(el) {
  el.innerHTML = dateRangeBar('invRange', daysAgo(29), isoLocal(), '<select data-f="kind"><option value="">الكل</option><option value="sale">فواتير بيع</option><option value="refund">إشعارات دائنة</option></select><input data-f="q" class="biz-search" placeholder="رقم الفاتورة / العميل" style="min-width:150px">') + '<div id="invList"></div>';
  const get = bindRange(el, 'invRange', load);
  async function load(f) {
    const r = await bzOk('invoicesList', f || get(), { loading: false });
    const rows = r.invoices || r.rows || [];
    el.querySelector('#invList').innerHTML = bTable([{ label: 'رقم', r: function (i) { return '<b>' + i.number + '</b>'; } }, { label: 'النوع', r: function (i) { return i.kind === 'refund' ? '<span class="badge badge-dog">إشعار دائن</span>' : '<span class="badge badge-success">بيع</span>'; } }, { label: 'التاريخ', r: function (i) { return dt(i.issued_at); } }, { label: 'طلب', r: function (i) { return i.order_number ? '#' + i.order_number : '—'; } }, { label: 'العميل', r: function (i) { return h(i.customer_name || '—'); } }, { label: 'الضريبة', num: true, r: function (i) { return money(i.tax_total); } }, { label: 'الإجمالي', num: true, r: function (i) { return money(i.total); } }, { label: '', r: function (i) { return '<button class="ico-btn" data-pi="' + i.id + '" title="طباعة"><i class="fas fa-print"></i></button>'; } }], rows) +
      (rows.length ? '' : '');
    el.querySelector('#invList').onclick = function (e) { const b = e.target.closest('[data-pi]'); if (b) printInvoice(b.dataset.pi); if (e.target.closest('#invX')) exportRowsExcel('الفواتير', ['الرقم', 'النوع', 'التاريخ', 'الطلب', 'العميل', 'المجموع', 'الخصم', 'الضريبة', 'الإجمالي', 'الموظف'], rows.map(function (i) { return [i.number, i.kind === 'refund' ? 'إشعار دائن' : 'بيع', dt(i.issued_at), i.order_number, i.customer_name, +i.subtotal, +i.discount_total, +i.tax_total, +i.total, i.staff_name]; })); };
  }
  load();
}

// v5.1.0: قناة / تطبيق التوصيل للطلب (العمولة تُحسب على السيرفر حسب عقد القناة)
function posChanName(o) {
  if (o.channel === 'online') return 'الطلب الإلكتروني';
  const c = ((POS.boot && POS.boot.channels) || []).find(function (x) { return x.id === o.channel; });
  return c ? c.name : (o.channelName || 'قناة');
}
function posChannelClose(order, due) {
  const name = posChanName(POS.o);
  bModal({ title: 'إغلاق آجل على منصة ' + name, icon: 'store-alt', sub: 'طلب #' + order.number,
    body: '<div class="pay-due">' + money(due) + '</div><div class="biz-form" style="margin-top:10px"><div class="full"><label class="pro-label">رقم طلب المنصة</label><div class="pro-input-wrap"><input id="chRef" dir="ltr" value="' + h(POS.o.channelRef || '') + '" placeholder="مثال: HS-123456"></div><div class="biz-hint">يُستخدم لمطابقة كشف المنصة لاحقاً</div></div></div>' +
      '<p class="muted" style="line-height:1.8;font-size:.85rem">لن يدخل المبلغ نقدية الوردية — يُسجّل ذمة على المنصة ويُغلق عند تسوية كشفها في «الذمم والتسويات» بعد خصم العمولة.</p>' +
      '<label class="biz-check"><input type="checkbox" id="chPr" ' + (localStorage.getItem('fcAutoPrint') === '0' ? '' : 'checked') + '> <span>طباعة الفاتورة</span></label>',
    foot: '<button class="btn btn-cancel" data-x>رجوع</button><button class="btn btn-success" data-act="ok"><i class="fas fa-check"></i> إغلاق الفاتورة آجلاً</button>',
    actions: { ok: async function (mm, btn) {
      btn.disabled = true;
      try {
        POS.o.channelRef = mm.$('#chRef').value.trim();
        const doPrint = mm.$('#chPr').checked; localStorage.setItem('fcAutoPrint', doPrint ? '1' : '0');
        const r = await bzOk('posCheckout', { order: posPayload(), payments: [{ method: 'channel', amount: due, ref: POS.o.channel }] });
        mm.close(); showToast('أُغلقت الفاتورة #' + r.invoice.number + ' آجلاً على ' + name);
        if (doPrint) printInvoice(r.invoice.id);
        POS.o = posNewOrder(); await posLoad(); posRender();
      } catch (e) { /* أُظهرت الرسالة */ } finally { btn.disabled = false; }
    } } });
}
function posPickChannel() {
  const o = POS.o, list = (POS.boot && POS.boot.channels) || [];
  const opts = [['', 'مباشر (كاشير المطعم)']].concat(o.channel === 'online' ? [['online', 'الطلب الإلكتروني (المينيو/التطبيق)']] : []).concat(list.map(function (c) { return [c.id, c.name + (c.pct ? ' — عمولة ' + c.pct + '%' : '') + (c.fixed ? ' + ' + c.fixed : '')]; }));
  bPrompt('قناة / تطبيق التوصيل', [{ k: 'channel', label: 'القناة', type: 'select', options: opts }, { k: 'channelRef', label: 'رقم طلب المنصة (اختياري)', ltr: true }], { channel: o.channel || '', channelRef: o.channelRef || '' }, function (d) { o.channel = d.channel; o.channelRef = d.channel && d.channel !== 'online' ? d.channelRef : ''; posRenderCart(); }, { icon: 'store-alt', saveText: 'اختيار' });
}
