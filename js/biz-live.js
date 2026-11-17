// v4.3 — التحديث المباشر: طلبات المينيو، الحجوزات، الطلبات الجاهزة — مع تنبيه صوتي مستمر حتى القبول أو الرفض
(function () {
  const L = { timer: null, alarm: null, ctx: null, unlocked: false, seenReady: {}, seenDc: {}, dcStarted: false, dismissed: {}, data: null, sig: '', busy: false };
  window.BIZ_LIVE = L;

  function audio() {
    if (!L.ctx) { try { L.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (L.ctx.state === 'suspended') L.ctx.resume().catch(function () {});
    return L.ctx;
  }
  function tone(freq, start, dur, vol) {
    const c = audio(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'square'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, c.currentTime + start);
    g.gain.exponentialRampToValueAtTime(vol || 0.35, c.currentTime + start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
    o.connect(g); g.connect(c.destination); o.start(c.currentTime + start); o.stop(c.currentTime + start + dur + 0.05);
  }
  function alarmBeep() { tone(880, 0, 0.18); tone(1175, 0.22, 0.18); tone(880, 0.44, 0.18); tone(1175, 0.66, 0.25); }
  function chime() { tone(660, 0, 0.25, 0.25); tone(990, 0.28, 0.4, 0.25); }
  window.bizLiveBeep = alarmBeep;

  function unlock() {
    const c = audio(); if (!c) return;
    L.unlocked = c.state === 'running' || L.unlocked;
    if (c.state !== 'running') c.resume().then(function () { L.unlocked = true; render(); }).catch(function () {}); else render();
  }
  ['click', 'touchstart', 'keydown'].forEach(function (ev) { document.addEventListener(ev, unlock, { passive: true }); });

  function setAlarm(on) {
    if (on && !L.alarm) { alarmBeep(); L.alarm = setInterval(alarmBeep, 2500); }
    if (!on && L.alarm) { clearInterval(L.alarm); L.alarm = null; }
  }
  function bar() {
    let b = document.getElementById('bizLiveBar');
    if (!b) { b = document.createElement('div'); b.id = 'bizLiveBar'; b.className = 'live-bar no-print'; document.body.appendChild(b); b.addEventListener('click', onClick); }
    return b;
  }
  function fmtT(d) { try { return new Date(d).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
  function render() {
    const d = L.data; const b = bar();
    if (!d) { b.innerHTML = ''; return; }
    const pending = (d.menuNew || []).length + (d.resvPending || []).length;
    let html = '';
    if (pending && !L.unlocked) html += '<button class="live-sound" data-l="sound"><i class="fas fa-volume-up"></i> اضغط لتفعيل صوت التنبيه</button>';
    (d.menuNew || []).slice(0, 4).forEach(function (o) {
      html += '<div class="live-card"><b>' + (o.delivery ? '<i class="fas fa-motorcycle"></i> طلب توصيل جديد' : '<i class="fas fa-qrcode"></i> طلب جديد من المينيو') + (o.table ? ' · طاولة ' + h(o.table) : '') + '</b><div class="muted">' + h(o.customer || 'عميل') + ' · ' + money(o.total) + ' · ' + fmtT(o.date) + '</div>' +
        '<div class="acts"><button class="btn btn-success" data-l="mAcc" data-id="' + h(o.id) + '"><i class="fas fa-check"></i> قبول</button><button class="btn btn-danger" data-l="mRej" data-id="' + h(o.id) + '"><i class="fas fa-times"></i> رفض</button><button class="btn btn-outline" data-l="mView"><i class="fas fa-eye"></i> التفاصيل</button></div></div>';
    });
    if ((d.menuNew || []).length > 4) html += '<div class="live-card"><b>+' + (d.menuNew.length - 4) + ' طلبات أخرى بانتظار القبول</b><div class="acts"><button class="btn btn-outline" data-l="mView">عرض الكل</button></div></div>';
    (d.resvPending || []).slice(0, 3).forEach(function (r) {
      html += '<div class="live-card resv"><b><i class="fas fa-calendar-check"></i> حجز طاولة جديد</b><div class="muted">' + h(r.customer_name || '') + ' <span dir="ltr">' + h(r.phone || '') + '</span> · ' + (r.party_size || '') + ' أشخاص · ' + (r.reserved_at ? new Date(r.reserved_at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : '') + '</div>' +
        '<div class="acts"><button class="btn btn-success" data-l="rOk" data-id="' + h(r.id) + '"><i class="fas fa-check"></i> تأكيد</button><button class="btn btn-danger" data-l="rNo" data-id="' + h(r.id) + '"><i class="fas fa-times"></i> رفض</button></div></div>';
    });
    (d.ready || []).filter(function (o) { return !L.dismissed[o.id]; }).slice(0, 4).forEach(function (o) {
      html += '<div class="live-card ready"><b><i class="fas fa-bell"></i> الطلب #' + o.number + ' جاهز</b><div class="muted">' + h(o.table_name ? 'طاولة ' + o.table_name : (o.customer_name || '')) + ' · ' + fmtT(o.ready_at) + '</div>' +
        '<div class="acts">' + (o.order_type === 'delivery' ? '<button class="btn btn-primary" data-l="dBoard"><i class="fas fa-motorcycle"></i> بانتظار السائق</button>' : '<button class="btn btn-success" data-l="served" data-id="' + h(o.id) + '"><i class="fas fa-check-double"></i> تم التسليم</button>') + '<button class="btn btn-outline" data-l="hide" data-id="' + h(o.id) + '">إخفاء</button></div></div>';
    });
    const dl = d.delivery || {};
    (dl.unassigned || []).slice(0, 3).forEach(function (o) {
      html += '<div class="live-card"><b><i class="fas fa-motorcycle"></i> طلب التوصيل #' + o.number + ' بانتظار سائق</b><div class="muted">لم يقبله أي سائق منذ ' + fmtT(o.since) + '</div><div class="acts"><button class="btn btn-primary" data-l="dBoard"><i class="fas fa-route"></i> إسناد سائق</button></div></div>';
    });
    (dl.late || []).filter(function (o) { return !L.dismissed['late' + o.id]; }).slice(0, 3).forEach(function (o) {
      html += '<div class="live-card resv"><b><i class="fas fa-clock"></i> تأخر توصيل الطلب #' + o.number + '</b><div class="muted">السائق ' + h(o.driver || '') + ' · تجاوز الوقت الأقصى ' + fmtT(o.due) + '</div><div class="acts"><button class="btn btn-outline" data-l="dBoard">متابعة</button><button class="btn btn-outline" data-l="hide" data-id="late' + h(o.id) + '">إخفاء</button></div></div>';
    });
    // v4.7: سائق يطلب تسليم النقد وإغلاق ورديته
    (d.driverCash || []).slice(0, 3).forEach(function (x) {
      html += '<div class="live-card ready"><b><i class="fas fa-hand-holding-usd"></i> السائق ' + h(x.driver) + ' يسلّم النقد</b><div class="muted">' + money(x.amount) + ' · إلى ' + (x.mine ? 'أنت' : h(x.cashier)) + ' · ' + fmtT(x.since) + '</div>' +
        '<div class="acts"><button class="btn btn-success" data-l="dCash"><i class="fas fa-cash-register"></i> استلام النقد</button></div></div>';
    });
    b.innerHTML = html;
    const cb = document.querySelector('[data-a=driverCash]');
    if (cb) cb.innerHTML = '<i class="fas fa-hand-holding-usd"></i> عهدة السائقين' + ((d.driverCash || []).length ? ' <span class="badge badge-warning">' + d.driverCash.length + '</span>' : '');
  }
  async function onClick(e) {
    const t = e.target.closest('[data-l]'); if (!t || L.busy) return;
    const a = t.dataset.l, id = t.dataset.id;
    if (a === 'sound') { unlock(); return; }
    if (a === 'hide') { L.dismissed[id] = 1; render(); return; }
    L.busy = true; t.disabled = true;
    try {
      if (a === 'mAcc') {
        const x = await bz('importMenuOrder', { menuOrderId: id });
        if (x.success) {
          showToast('تم قبول الطلب وتحويله للكاشير #' + x.order.number);
          if (B.current === 'pos' && typeof posLoad === 'function') { await posLoad(); POS.o = posFromServer(x.order); posRender(); }
        } else showToast(x.error || 'تعذر القبول', true);
      } else if (a === 'mRej') {
        if (await bConfirm('رفض هذا الطلب؟')) await bz('updateMenuOrderStatus', { id: id, status: 'rejected' });
      } else if (a === 'mView') {
        if (typeof posMenuOrders === 'function') posMenuOrders(); else switchTab('pos');
      } else if (a === 'rOk' || a === 'rNo') {
        const x = await bz('reservationSetStatus', { id: id, status: a === 'rOk' ? 'confirmed' : 'cancelled' });
        showToast(x.success ? (a === 'rOk' ? 'تم تأكيد الحجز' : 'تم رفض الحجز') : (x.error || 'تعذر التحديث'), !x.success);
      } else if (a === 'dCash') {
        if (typeof dlCashModal === 'function') dlCashModal();
      } else if (a === 'dBoard') {
        switchTab('delivery');
      } else if (a === 'served') {
        await bz('kitchenBump', { id: id, status: 'served' }); L.dismissed[id] = 1;
      }
    } finally { L.busy = false; }
    tick();
  }
  async function tick() {
    if (!B.acc) return;
    const r = await bz('liveFeed', { branchId: B.branch }, { silentPlan: true, loading: false }).catch(function () { return null; });
    if (!r || !r.success) return;
    const prevMenu = L.data ? (L.data.menuNew || []).length : 0;
    L.data = r;
    (r.ready || []).forEach(function (o) { if (!L.seenReady[o.id]) { L.seenReady[o.id] = 1; if (L.started) chime(); } });
    L.started = true;
    setAlarm((r.menuNew || []).length + (r.resvPending || []).length + ((r.delivery && r.delivery.unassigned) || []).length > 0);
    render();
    // تحديث شارات الكاشير والطلبات المعلّقة دون الضغط على زر التحديث
    const sig = (r.menuNew || []).map(function (x) { return x.id; }).join(',') + '|' + (r.ready || []).map(function (x) { return x.id; }).join(',') + '|' + (r.driverCash || []).map(function (x) { return x.id; }).join(',');
    const dcNew = (r.driverCash || []).filter(function (x) { return !L.seenDc[x.id]; });
    (r.driverCash || []).forEach(function (x) { L.seenDc[x.id] = 1; });
    if (dcNew.length && L.dcStarted) chime();
    L.dcStarted = true;
    if (sig !== L.sig) {
      L.sig = sig;
      if (B.current === 'pos' && typeof posLoad === 'function' && POS.boot && !document.querySelector('.modal-overlay')) {
        try {
          await posLoad();
          const mb = document.querySelector('[data-a=menuOrders]');
          if (mb) mb.innerHTML = '<i class="fas fa-qrcode"></i> طلبات المينيو' + (POS.boot.menuOrdersNew ? ' <span class="badge badge-warning">' + POS.boot.menuOrdersNew + '</span>' : '');
          const ob = document.querySelector('[data-a=open]'); if (ob) ob.innerHTML = '<i class="fas fa-receipt"></i> المعلّقة (' + POS.boot.openOrders.length + ')';
        } catch (e) { /* */ }
      }
      if (typeof refreshNotifications === 'function') refreshNotifications();
    }
    if ((r.menuNew || []).length > prevMenu && 'Notification' in window && Notification.permission === 'granted' && document.hidden) {
      try { new Notification('طلب جديد من المينيو', { body: 'لديك ' + r.menuNew.length + ' طلب بانتظار القبول', tag: 'fc-menu' }); } catch (e) { /* */ }
    }
  }
  window.bizLiveStart = function () {
    clearInterval(L.timer);
    if (!B.acc) return;
    if ('Notification' in window && Notification.permission === 'default') document.addEventListener('click', function ask() { document.removeEventListener('click', ask); try { Notification.requestPermission(); } catch (e) { /* */ } });
    tick(); L.timer = setInterval(tick, 7000);
  };
  window.bizLiveStop = function () { clearInterval(L.timer); setAlarm(false); L.data = null; render(); };
  window.bizLiveTick = tick;
})();
