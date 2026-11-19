// v5.0.3 — حالة المطعم (فتح/إغلاق يدوي من ترس الإعدادات) + أوقات دوام لكل فرع (من الإدارة › الموظفون والفروع › الفروع)
(function () {
  'use strict';
  const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const e = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]; }); };
  const tr = function (s) { try { return (window.fcI18n && fcI18n.t) ? fcI18n.t(s) : s; } catch (x) { return s; } };
  const toast = function (m, err) { if (typeof showToast === 'function') showToast(m, err); };
  const fmtUntil = function (iso) { try { return new Date(iso).toLocaleString((window.fcI18n && fcI18n.lang && fcI18n.lang() === 'tr') ? 'tr-TR' : (window.fcI18n && fcI18n.lang && fcI18n.lang() === 'en') ? 'en-GB' : 'ar', { weekday: 'short', hour: '2-digit', minute: '2-digit' }); } catch (x) { return iso; } };

  function css() {
    if (document.getElementById('shCss')) return;
    const s = document.createElement('style'); s.id = 'shCss';
    s.textContent = [
      '.sh-box{border:1px solid var(--border);border-radius:14px;padding:14px;margin-bottom:16px;background:rgba(255,255,255,.03)}',
      '.sh-head{display:flex;align-items:center;gap:10px;justify-content:space-between;flex-wrap:wrap;margin-bottom:10px}',
      '.sh-head h4{margin:0;font-size:.92rem;color:var(--accent-soft,#e6c27a)}',
      '.sh-pill{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:999px;font-weight:700;font-size:.8rem}',
      '.sh-pill.on{background:rgba(16,185,129,.15);color:#34d399;border:1px solid rgba(16,185,129,.45)}',
      '.sh-pill.off{background:rgba(239,68,68,.15);color:#fca5a5;border:1px solid rgba(239,68,68,.5)}',
      '.sh-msg{font-size:.8rem;color:var(--text-muted);line-height:1.7;margin-bottom:10px}',
      '.sh-row{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px}',
      '.sh-row input,.sh-row select,.sh-tbl input[type=time],.sh-f input,.sh-f select{width:100%;background:var(--bg-input,#0f1424);color:var(--text-main,#e5e7eb);border:1px solid var(--border);border-radius:10px;padding:8px 10px;font-family:inherit;font-size:.85rem;min-width:0}',
      '.sh-btn{width:100%;justify-content:center;border-radius:12px;padding:12px;font-weight:800;font-size:.95rem}',
      '.sh-btn.close{background:#b91c1c;color:#fff;border:0}.sh-btn.open{background:#059669;color:#fff;border:0}',
      '.sh-tbl{width:100%;border-collapse:separate;border-spacing:0 6px}',
      '.sh-tbl td{padding:4px;vertical-align:middle;color:var(--text-main,#e5e7eb);font-size:.85rem}',
      '.sh-tbl tr.dis td:not(:first-child){opacity:.35}',
      '.sh-tbl .p2{display:none}.sh-tbl.two .p2{display:table-cell}',
      '.sh-f{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:10px 0}',
      '.sh-f label{display:flex;gap:8px;align-items:center;color:var(--text-main,#e5e7eb);font-size:.86rem;cursor:pointer;flex:0 1 auto;width:auto;margin:0}',
      '.sh-f label input[type=checkbox],.sh-tbl input[type=checkbox]{width:18px!important;height:18px;min-width:18px;flex:0 0 18px;margin:0;padding:0;accent-color:#e6c27a}',
      '.sh-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}.sh-tbl input[type=time]{min-width:96px}',
      '.sh-note{font-size:.76rem;color:var(--text-muted);line-height:1.7}',
      '.sh-brst{display:block;font-size:.74rem;margin-top:3px}.sh-brst.on{color:#34d399}.sh-brst.off{color:#fca5a5}',
      '@media(max-width:600px){.sh-row{grid-template-columns:1fr}.sh-tbl td{padding:2px;font-size:.78rem}.sh-tbl input[type=time]{padding:6px 4px;font-size:.78rem}}'
    ].join('');
    document.head.appendChild(s);
  }

  function statusLine(st) {
    if (!st) return '';
    if (st.open !== false) return tr('مفتوح') + (st.hoursEnabled && st.today ? ' · ' + tr('دوام اليوم') + ' ' + (st.today.open ? st.today.from + '–' + st.today.to + (st.today.from2 ? ' / ' + st.today.from2 + '–' + st.today.to2 : '') : tr('عطلة')) : '');
    let t = st.reason === 'hours' ? tr('خارج أوقات الدوام') : st.reason === 'branch' ? tr('الفرع مغلق مؤقتاً') : tr('مغلق يدوياً');
    if (st.note) t += ' · ' + st.note;
    if (st.next) t += ' · ' + tr('يفتح') + ' ' + (st.next.today ? tr('اليوم') : tr(DAYS[st.next.day])) + ' ' + st.next.time;
    if (st.until) t += ' · ' + tr('حتى') + ' ' + fmtUntil(st.until);
    return t;
  }

  // ---------------- ترس الإعدادات: حالة المطعم ----------------
  function canToggle() { return typeof B !== 'undefined' && B.acc && (hasF('online_orders') || hasF('pos')) && canP('orders_manage', 'settings'); }
  async function paintSettings() {
    const modal = document.getElementById('settingsModal'); if (!modal) return;
    let box = document.getElementById('shBox');
    if (!canToggle()) { if (box) box.remove(); return; }
    css();
    if (!box) {
      box = document.createElement('div'); box.id = 'shBox'; box.className = 'sh-box';
      const body = modal.querySelector('.modal-body-pro'); if (!body) return;
      body.insertBefore(box, body.firstChild);
    }
    box.innerHTML = '<div class="sh-msg">' + tr('جاري تحميل حالة المطعم...') + '</div>';
    const r = await bz('storeStatusGet', {});
    if (!r || !r.success) { box.innerHTML = '<div class="sh-msg">' + e(r && r.error || '') + '</div>'; return; }
    const st = r.status || { open: true }, closed = !!r.manualClosed;
    const brs = (r.branches || []).filter(function (b) { return b.active; });
    const brTxt = brs.length > 1 ? brs.map(function (b) { return '<div>• <b>' + e(b.name) + '</b>: ' + e(statusLine(b.status)) + '</div>'; }).join('') : '';
    box.innerHTML = '<div class="sh-head"><h4><i class="fas fa-store"></i> ' + tr('حالة المطعم') + '</h4><span class="sh-pill ' + (st.open === false ? 'off' : 'on') + '"><i class="fas fa-' + (st.open === false ? 'door-closed' : 'door-open') + '"></i> ' + (st.open === false ? tr('مغلق الآن') : tr('مفتوح الآن')) + '</span></div>' +
      '<div class="sh-msg">' + e(statusLine(st)) + (brTxt ? '<div style="margin-top:6px">' + brTxt + '</div>' : '') + '</div>' +
      (closed ? '' : '<div class="sh-row"><input id="shReason" maxlength="200" placeholder="' + e(tr('سبب الإغلاق (اختياري) مثال: انقطاع الكهرباء')) + '"><select id="shMins"><option value="0">' + tr('حتى أفتحه يدوياً') + '</option><option value="30">' + tr('30 دقيقة') + '</option><option value="60">' + tr('ساعة واحدة') + '</option><option value="120">' + tr('ساعتان') + '</option><option value="240">' + tr('4 ساعات') + '</option><option value="tomorrow">' + tr('حتى صباح الغد') + '</option></select></div>') +
      '<button type="button" class="btn sh-btn ' + (closed ? 'open' : 'close') + '" id="shToggle"><i class="fas fa-' + (closed ? 'door-open' : 'power-off') + '"></i> ' + (closed ? tr('فتح المطعم الآن') : tr('إغلاق المطعم الآن')) + '</button>' +
      '<div class="sh-note" style="margin-top:8px">' + tr('الإغلاق فوري لكل الفروع: يظهر للعميل «المطعم مغلق حالياً» في المينيو وتطبيق العميل وتُرفض الطلبات الأونلاين. أوقات الدوام لكل فرع من: الإدارة › الموظفون والفروع › الفروع › زر الساعة.') + '</div>';
    box.querySelector('#shToggle').onclick = async function () {
      const btn = this; let mins = 0;
      if (!closed) {
        const v = box.querySelector('#shMins').value;
        if (v === 'tomorrow') { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(8, 0, 0, 0); mins = Math.ceil((d - Date.now()) / 60000); } else mins = +v || 0;
        if (typeof bConfirm === 'function') { const pr = bConfirm(tr('سيتم إيقاف استقبال الطلبات الأونلاين فوراً. متابعة؟'), tr('إغلاق المطعم')); const ms = document.querySelectorAll('.biz-modal'); if (ms.length) ms[ms.length - 1].style.zIndex = '12500'; if (!(await pr)) return; }
      }
      btn.disabled = true;
      const res = await bz('storeToggle', { closed: !closed, reason: closed ? '' : box.querySelector('#shReason').value, minutes: mins });
      btn.disabled = false;
      if (!res || !res.success) { toast((res && res.error) || 'حدث خطأ', true); return; }
      toast(closed ? tr('تم فتح المطعم') : tr('تم إغلاق المطعم'));
      paintSettings(); paintChip(res.status);
    };
    paintChip(st);
  }
  // شارة صغيرة في الشريط العلوي تُظهر أن المطعم مغلق
  function paintChip(st) {
    let c = document.getElementById('shChip');
    if (!st || st.open !== false || !canToggle()) { if (c) c.remove(); return; }
    if (!c) {
      css(); c = document.createElement('button'); c.id = 'shChip'; c.type = 'button'; c.className = 'sh-pill off';
      c.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:900;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.4)';
      c.onclick = function () { if (typeof showSettingsModal === 'function') showSettingsModal(); };
      document.body.appendChild(c);
    }
    c.innerHTML = '<i class="fas fa-door-closed"></i> ' + tr('المطعم مغلق — الطلبات الأونلاين متوقفة');
  }
  if (typeof window.showSettingsModal === 'function') {
    const orig = window.showSettingsModal;
    window.showSettingsModal = function () { const r = orig.apply(this, arguments); paintSettings(); return r; };
  }
  // فحص الحالة عند الدخول وكل 5 دقائق (لإظهار الشارة)
  async function poll() { try { if (canToggle()) { const r = await bz('storeStatusGet', {}); if (r && r.success) paintChip(r.status); } } catch (x) { /* ignore */ } }
  let tries = 0; const iv = setInterval(function () { if (typeof B !== 'undefined' && B.acc) { clearInterval(iv); poll(); setInterval(poll, 300000); } else if (++tries > 60) clearInterval(iv); }, 1000);

  // ---------------- الفروع: زر أوقات الدوام ----------------
  function hoursModal(b, onSaved) {
    css();
    const H = b.hours || { enabled: false, days: [] }, days = H.days && H.days.length === 7 ? H.days : DAYS.map(function () { return { open: true, from: '09:00', to: '23:00', from2: '', to2: '' }; });
    const two = days.some(function (d) { return d.from2 && d.to2; });
    const rows = DAYS.map(function (n, i) { const d = days[i]; return '<tr data-i="' + i + '" class="' + (d.open ? '' : 'dis') + '"><td><label style="display:flex;gap:6px;align-items:center;white-space:nowrap"><input type="checkbox" data-o ' + (d.open ? 'checked' : '') + '> ' + tr(n) + '</label></td><td><input type="time" data-f value="' + e(d.from) + '"></td><td><input type="time" data-t value="' + e(d.to) + '"></td><td class="p2"><input type="time" data-f2 value="' + e(d.from2) + '"></td><td class="p2"><input type="time" data-t2 value="' + e(d.to2) + '"></td></tr>'; }).join('');
    const tz = -new Date().getTimezoneOffset();
    const m = bModal({ title: tr('أوقات الدوام') + ' — ' + b.name, icon: 'clock', wide: true, print: false,
      body: '<div class="sh-f"><label><input type="checkbox" id="hEn" ' + (H.enabled ? 'checked' : '') + '> <b>' + tr('تفعيل أوقات الدوام (رفض الطلبات الأونلاين خارجها)') + '</b></label></div>' +
        '<div class="sh-wrap"><table class="sh-tbl' + (two ? ' two' : '') + '" id="hTbl"><thead><tr><td></td><td class="sh-note">' + tr('من') + '</td><td class="sh-note">' + tr('إلى') + '</td><td class="p2 sh-note">' + tr('فترة 2 من') + '</td><td class="p2 sh-note">' + tr('إلى') + '</td></tr></thead><tbody>' + rows + '</tbody></table></div>' +
        '<div class="sh-f"><button type="button" class="btn btn-outline btn-sm" id="hCopy"><i class="fas fa-copy"></i> ' + tr('نسخ أوقات الأحد لكل الأيام') + '</button><label><input type="checkbox" id="hTwo" ' + (two ? 'checked' : '') + '> ' + tr('فترتان في اليوم') + '</label></div>' +
        '<div class="sh-note">' + tr('إذا كان وقت الإغلاق أصغر من وقت الفتح يُعتبر بعد منتصف الليل (مثال 18:00 إلى 02:00).') + '</div>' +
        '<div class="sh-box" style="margin-top:12px"><div class="sh-f" style="margin:0 0 8px"><label><input type="checkbox" id="hPause" ' + (H.paused ? 'checked' : '') + '> <b>' + tr('إغلاق هذا الفرع مؤقتاً') + '</b></label></div><div class="sh-f" style="margin:0"><input id="hPR" style="flex:1" maxlength="200" placeholder="' + e(tr('السبب (اختياري)')) + '" value="' + e(H.pausedReason || '') + '"></div></div>' +
        '<div class="sh-note">' + tr('المنطقة الزمنية للجهاز') + ': UTC' + (tz >= 0 ? '+' : '') + (tz / 60) + '</div>',
      foot: '<button class="btn btn-success" id="hSave"><i class="fas fa-save"></i> ' + tr('حفظ') + '</button><button class="btn btn-cancel" data-x>' + tr('إغلاق') + '</button>' });
    const tbl = m.$('#hTbl');
    tbl.onchange = function (ev) { const o = ev.target.closest('[data-o]'); if (o) o.closest('tr').classList.toggle('dis', !o.checked); };
    m.$('#hTwo').onchange = function () { tbl.classList.toggle('two', this.checked); };
    m.$('#hCopy').onclick = function () {
      const src = tbl.querySelector('tr[data-i="0"]');
      m.$$('#hTbl tbody tr').forEach(function (r) { ['f', 't', 'f2', 't2'].forEach(function (k) { r.querySelector('[data-' + k + ']').value = src.querySelector('[data-' + k + ']').value; }); r.querySelector('[data-o]').checked = src.querySelector('[data-o]').checked; r.classList.toggle('dis', !src.querySelector('[data-o]').checked); });
    };
    m.$('#hSave').onclick = async function () {
      const useTwo = m.$('#hTwo').checked;
      const ds = m.$$('#hTbl tbody tr').map(function (r) { const g = function (k) { return r.querySelector('[data-' + k + ']').value; }; return { open: r.querySelector('[data-o]').checked, from: g('f') || '09:00', to: g('t') || '23:00', from2: useTwo ? g('f2') : '', to2: useTwo ? g('t2') : '' }; });
      const hours = { enabled: m.$('#hEn').checked, days: ds, paused: m.$('#hPause').checked, pausedReason: m.$('#hPR').value };
      this.disabled = true;
      const r = await bz('branchHoursSave', { branchId: b.id, hours: hours, tzOffset: tz });
      this.disabled = false;
      if (!r || !r.success) { toast((r && r.error) || 'حدث خطأ', true); return; }
      toast(tr('تم حفظ أوقات الدوام') + ' · ' + statusLine(r.status));
      m.close(); if (onSaved) onSaved();
    };
  }
  if (typeof window.branchesView === 'function') {
    const origB = window.branchesView;
    window.branchesView = async function (el) {
      const ret = await origB.apply(this, arguments);
      try {
        css();
        const r = await bz('storeStatusGet', {});
        if (!r || !r.success) return ret;
        const map = {}; (r.branches || []).forEach(function (b) { map[b.id] = b; });
        el.querySelectorAll('[data-e]').forEach(function (btn) {
          const b = map[btn.dataset.e]; if (!b || btn.parentNode.querySelector('[data-hours]')) return;
          const hb = document.createElement('button'); hb.type = 'button'; hb.className = btn.className; hb.dataset.hours = b.id; hb.title = tr('أوقات الدوام');
          hb.innerHTML = '<i class="fas fa-clock"></i>';
          hb.onclick = function (ev) { ev.stopPropagation(); hoursModal(b, function () { window.branchesView(el); }); };
          btn.parentNode.insertBefore(hb, btn);
          const tr0 = btn.closest('tr'), cell = tr0 && tr0.querySelector('td');
          if (cell && !cell.querySelector('.sh-brst')) { const s = document.createElement('span'); s.className = 'sh-brst ' + (b.status && b.status.open === false ? 'off' : 'on'); s.textContent = statusLine(b.status) + (b.hours && b.hours.enabled ? '' : ' · ' + tr('بدون أوقات دوام')); cell.appendChild(s); }
        });
        if (!el.querySelector('#shBrNote')) { const n = document.createElement('div'); n.id = 'shBrNote'; n.className = 'sh-note'; n.style.margin = '10px 2px'; n.innerHTML = '<i class="fas fa-clock"></i> ' + tr('زر الساعة بجانب كل فرع لضبط أوقات الدوام أو إغلاق الفرع مؤقتاً. للإغلاق الطارئ للمطعم كله استخدم زر الترس › حالة المطعم.'); el.appendChild(n); }
      } catch (x) { /* ignore */ }
      return ret;
    };
  }
})();
