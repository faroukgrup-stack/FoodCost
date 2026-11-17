// ============================================================
// progress47.js — v4.7: شريط تقدم حقيقي (0 → 100%) مع الوقت المنقضي والمتبقي
// يُستخدم في النسخة الاحتياطية والاستعادة والتقرير الشامل وكل عمليات التصدير
// ============================================================
(function () {
  'use strict';
  const P = { on: false, pct: 0, t0: 0, key: '', raf: null, creep: null, hideT: null, last: 0 };
  const HKEY = 'fcProgressTimes';
  function hist() { try { return JSON.parse(localStorage.getItem(HKEY) || '{}'); } catch (e) { return {}; } }
  function saveHist(k, ms) { if (!k || !(ms > 300)) return; const h = hist(); const old = h[k]; h[k] = old ? Math.round(old * 0.5 + ms * 0.5) : Math.round(ms); try { localStorage.setItem(HKEY, JSON.stringify(h)); } catch (e) { /* */ } }
  function el(id) { return document.getElementById(id); }
  function ensureUi() {
    const box = document.querySelector('#exportLoadingOverlay .export-loading-box');
    if (!box || el('fcPgWrap')) return;
    const w = document.createElement('div');
    w.id = 'fcPgWrap';
    w.innerHTML = '<div class="fc-pg-bar"><div class="fc-pg-fill" id="fcPgFill"></div></div>' +
      '<div class="fc-pg-row"><b id="fcPgPct">0%</b><span id="fcPgEta"></span></div>';
    box.appendChild(w);
    const st = document.createElement('style');
    st.textContent = '#fcPgWrap{width:100%;min-width:260px;max-width:420px;margin:14px auto 0}' +
      '.fc-pg-bar{height:12px;border-radius:20px;background:rgba(255,255,255,.12);overflow:hidden;box-shadow:inset 0 1px 3px rgba(0,0,0,.35)}' +
      '.fc-pg-fill{height:100%;width:0;border-radius:20px;background:linear-gradient(90deg,#b48554,#e6c08f,#22c55e);background-size:200% 100%;transition:width .35s ease;animation:fcPgMove 1.6s linear infinite}' +
      '@keyframes fcPgMove{to{background-position:-200% 0}}' +
      '.fc-pg-row{display:flex;justify-content:space-between;align-items:center;margin-top:8px;font-size:.85rem;gap:10px}' +
      '.fc-pg-row b{color:#e6c08f;font-size:1.05rem;direction:ltr}.fc-pg-row span{color:#cbd5e1;opacity:.9}';
    document.head.appendChild(st);
  }
  function fmt(ms) {
    const s = Math.max(0, Math.round(ms / 1000));
    if (s < 60) return s + ' ث';
    const m = Math.floor(s / 60), r = s % 60;
    return m + ' د' + (r ? ' ' + r + ' ث' : '');
  }
  function paint() {
    if (!P.on) return;
    const f = el('fcPgFill'), pc = el('fcPgPct'), et = el('fcPgEta');
    if (!f) return;
    const pct = Math.max(0, Math.min(100, P.pct));
    f.style.width = pct.toFixed(1) + '%';
    pc.textContent = Math.floor(pct) + '%';
    const el2 = Date.now() - P.t0;
    let txt = 'المنقضي ' + fmt(el2);
    if (pct >= 100) txt = 'اكتمل خلال ' + fmt(el2);
    else if (pct > 4 && el2 > 1200) txt += ' · المتبقي تقريباً ' + fmt(el2 * (100 - pct) / pct);
    else { const exp = hist()[P.key]; if (exp && exp > el2) txt += ' · المتبقي تقريباً ' + fmt(exp - el2); else txt += ' · جاري الحساب…'; }
    et.textContent = txt;
  }
  function loop() { paint(); P.raf = setTimeout(loop, 500); }
  function stopCreep() { if (P.creep) { clearInterval(P.creep); P.creep = null; } }

  const api = {
    // يبدأ الشريط (يفتح نافذة التحميل إن لم تكن مفتوحة)
    start: function (title, msg, key) {
      clearTimeout(P.hideT); stopCreep();
      ensureUi();
      if (el('exportLoadingTitle')) el('exportLoadingTitle').textContent = title || 'جاري التنفيذ';
      if (el('exportLoadingMsg')) el('exportLoadingMsg').textContent = msg || '';
      if (el('exportLoadingOverlay')) el('exportLoadingOverlay').classList.add('active');
      P.on = true; P.pct = 0; P.t0 = Date.now(); P.key = key || title || ''; P.last = 0;
      const w = el('fcPgWrap'); if (w) w.style.display = '';
      clearTimeout(P.raf); loop();
      return api;
    },
    // تحديد النسبة (لا تتراجع) ورسالة اختيارية
    set: function (pct, msg) {
      if (!P.on) return api;
      stopCreep();
      P.pct = Math.max(P.pct, Math.min(99.5, +pct || 0));
      if (msg && el('exportLoadingMsg')) el('exportLoadingMsg').textContent = msg;
      paint(); return api;
    },
    msg: function (m) { if (el('exportLoadingMsg')) el('exportLoadingMsg').textContent = m; return api; },
    // تقدم تدريجي أثناء انتظار عملية واحدة (مثل طلب للسيرفر) حتى target بحسب المدة المتوقعة
    creep: function (target, expectedMs, msg) {
      if (!P.on) return api;
      stopCreep();
      if (msg && el('exportLoadingMsg')) el('exportLoadingMsg').textContent = msg;
      const from = P.pct, to = Math.min(99, target), t0 = Date.now(), exp = Math.max(800, expectedMs || 4000);
      P.creep = setInterval(function () {
        const k = 1 - Math.exp(-(Date.now() - t0) / exp * 2.2);
        P.pct = Math.max(P.pct, from + (to - from) * k); paint();
      }, 250);
      return api;
    },
    // انتظار وعد مع تقدّم تدريجي
    track: async function (promise, target, expectedKey, fallbackMs, msg) {
      const h = hist(), k = P.key + ':' + (expectedKey || 'step');
      const t0 = Date.now();
      api.creep(target, h[k] || fallbackMs || 4000, msg);
      try { const r = await promise; saveHist(k, Date.now() - t0); api.set(target); return r; }
      finally { stopCreep(); }
    },
    done: function (msg) {
      if (!P.on) return api;
      stopCreep();
      saveHist(P.key, Date.now() - P.t0);
      P.pct = 100; if (msg && el('exportLoadingMsg')) el('exportLoadingMsg').textContent = msg; paint();
      P.on = false; clearTimeout(P.raf);
      return api;
    },
    stop: function () { stopCreep(); P.on = false; clearTimeout(P.raf); const w = el('fcPgWrap'); if (w) w.style.display = 'none'; return api; },
    active: function () { return P.on; },
    hist: hist,
  };
  window.fcProgress = api;

  // دمج تلقائي مع نافذة التحميل القديمة: كل عملية تصدير تحصل على شريط تقدّم ووقت متبقٍ
  const origShow = window.showExportLoading, origHide = window.hideExportLoading;
  if (typeof origShow === 'function') {
    window.showExportLoading = function (title, msg) {
      origShow(title, msg);
      if (!P.on) { api.start(title, msg, 'auto:' + title); const exp = hist()['auto:' + title]; api.creep(95, exp || 9000); }
    };
  }
  if (typeof origHide === 'function') {
    window.hideExportLoading = function () {
      if (P.on) {
        api.done();
        clearTimeout(P.hideT);
        P.hideT = setTimeout(function () { origHide(); api.stop(); }, 450);
      } else if (P.pct >= 100) { clearTimeout(P.hideT); P.hideT = setTimeout(function () { origHide(); api.stop(); }, 450); }
      else { origHide(); api.stop(); }
    };
  }
})();
