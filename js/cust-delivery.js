// ============================================================
// cust-delivery.js (v4.5) — حساب العميل وعناوين التوصيل بالـ GPS (مشترك بين المينيو وتطبيق المطعم)
// ============================================================
(function () {
  const D = { r: '', email: '', color: '#b48554', me: null, sel: null };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const key = () => 'appCustToken_' + D.r;
  const tok = () => { try { return localStorage.getItem(key()) || ''; } catch (e) { return ''; } };
  async function api(fn, p) {
    const body = Object.assign({ fn, r: D.r }, D.email && !D.r ? { restaurantEmail: D.email } : {}, p || {});
    try { return await (await fetch(COST_API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) })).json(); }
    catch (e) { return { success: false, error: 'تعذر الاتصال بالإنترنت' }; }
  }
  function css() {
    if (document.getElementById('fcdCss')) return;
    const s = document.createElement('style'); s.id = 'fcdCss';
    s.textContent = '.fcd-ov{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:flex-end;justify-content:center;font-family:inherit}' +
      '.fcd-box{background:#111522;color:#e8ecf5;width:100%;max-width:480px;max-height:92vh;overflow:auto;border-radius:18px 18px 0 0;padding:14px 14px calc(14px + env(safe-area-inset-bottom));font-size:14px;direction:rtl;box-shadow:0 -10px 30px rgba(0,0,0,.4)}' +
      '@media(min-width:640px){.fcd-ov{align-items:center}.fcd-box{border-radius:18px}}' +
      '.fcd-h{display:flex;align-items:center;gap:8px;margin-bottom:10px}.fcd-h b{flex:1;font-size:15px}.fcd-x{background:#1d2335;border:0;color:#cbd5e1;width:30px;height:30px;border-radius:9px;font-size:18px;cursor:pointer}' +
      '.fcd-box label{display:block;font-size:12px;color:#9aa6c2;margin:8px 0 4px}' +
      '.fcd-box input,.fcd-box textarea{width:100%;padding:10px;border-radius:10px;border:1px solid #2a3350;background:#0b0e17;color:#fff;font-family:inherit;font-size:14px;box-sizing:border-box}' +
      '.fcd-g2{display:grid;grid-template-columns:1fr 1fr;gap:0 8px}' +
      '.fcd-btn{display:flex;width:100%;align-items:center;justify-content:center;gap:6px;padding:11px;border-radius:11px;border:0;font-family:inherit;font-weight:800;font-size:14px;cursor:pointer;margin-top:10px;background:var(--fcd-c);color:#0b0e17}' +
      '.fcd-btn.o{background:transparent;border:1px solid #2f3a58;color:#e2e8f0}.fcd-btn:disabled{opacity:.6}' +
      '.fcd-ad{display:flex;gap:10px;align-items:flex-start;padding:10px;border:1px solid #263049;border-radius:12px;margin-bottom:8px;cursor:pointer;background:#0f1424}' +
      '.fcd-ad.on{border-color:var(--fcd-c);box-shadow:0 0 0 2px color-mix(in srgb,var(--fcd-c) 30%,transparent)}.fcd-ad .t{flex:1;line-height:1.55;font-size:13px}.fcd-ad .t b{font-size:13.5px}' +
      '.fcd-ad .del{background:none;border:0;color:#f87171;font-size:12px;cursor:pointer;padding:4px}' +
      '.fcd-map{width:100%;height:170px;border:0;border-radius:12px;margin-top:8px;background:#0b0e17}' +
      '.fcd-gps{font-size:12px;margin-top:6px;color:#9aa6c2;line-height:1.6}.fcd-gps.ok{color:#86efac}.fcd-gps.err{color:#fca5a5}' +
      '.fcd-err{color:#fca5a5;font-size:12.5px;min-height:1em;margin-top:8px;text-align:center}' +
      '.fcd-note{font-size:12px;color:#9aa6c2;line-height:1.7}';
    document.head.appendChild(s);
  }
  function sheet(title, html) {
    css();
    const ov = document.createElement('div'); ov.className = 'fcd-ov'; ov.style.setProperty('--fcd-c', D.color);
    ov.innerHTML = '<div class="fcd-box"><div class="fcd-h"><b>' + esc(title) + '</b><button class="fcd-x" data-x>&times;</button></div><div class="fcd-c">' + html + '</div></div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('[data-x]')) close(); });
    let onClose = null;
    function close() { ov.remove(); if (onClose) onClose(); }
    return { el: ov, $: s => ov.querySelector(s), close, set onClose(f) { onClose = f; }, body: h => { ov.querySelector('.fcd-c').innerHTML = h; } };
  }
  function line(a) { return a ? [a.city, a.district, a.street, a.complex ? 'مجمع ' + a.complex : '', a.building ? 'مبنى ' + a.building : '', a.floor ? 'طابق ' + a.floor : '', a.apartment ? 'شقة ' + a.apartment : '', a.text].filter(Boolean).join('، ') : ''; }
  function osm(lat, lng) { const d = 0.004; return 'https://www.openstreetmap.org/export/embed.html?bbox=' + (lng - d) + ',' + (lat - d) + ',' + (lng + d) + ',' + (lat + d) + '&layer=mapnik&marker=' + lat + ',' + lng; }

  // تسجيل الدخول برقم الجوال + رمز سري
  function login() {
    return new Promise(res => {
      let done = false;
      const m = sheet('تسجيل الدخول للتوصيل', '<p class="fcd-note">لطلب التوصيل يجب أن يكون لديك حساب برقم جوالك. إن لم يكن لديك حساب سيُنشأ تلقائياً.</p>' +
        '<label>رقم الجوال</label><input id="fcdP" dir="ltr" inputmode="tel" placeholder="05xxxxxxxx" value="' + esc(localStorage.getItem('appPhone_' + D.r) || '') + '">' +
        '<label>الرمز السري (4-6 أرقام)</label><input id="fcdPin" dir="ltr" type="password" inputmode="numeric" maxlength="6">' +
        '<div id="fcdNameW" style="display:none"><label>اسمك</label><input id="fcdN" placeholder="الاسم"></div>' +
        '<button class="fcd-btn" id="fcdGo">دخول</button><div class="fcd-err" id="fcdE"></div>');
      m.onClose = () => { if (!done) res(false); };
      m.$('#fcdGo').onclick = async () => {
        const b = m.$('#fcdGo'); b.disabled = true; m.$('#fcdE').textContent = '';
        const r = await api('custLogin', { phone: m.$('#fcdP').value, pin: m.$('#fcdPin').value, name: m.$('#fcdN').value });
        b.disabled = false;
        if (r.needName) { m.$('#fcdNameW').style.display = 'block'; m.$('#fcdE').textContent = r.error; m.$('#fcdN').focus(); return; }
        if (!r.success) { m.$('#fcdE').textContent = r.error || 'تعذر الدخول'; return; }
        try { localStorage.setItem(key(), r.token); localStorage.setItem('appPhone_' + D.r, m.$('#fcdP').value.trim()); if (r.name) localStorage.setItem('appName_' + D.r, r.name); } catch (e) { /* */ }
        D.me = null; done = true; m.close(); res(true);
      };
    });
  }
  async function me(force) {
    if (!tok()) return null;
    if (D.me && !force) return D.me;
    const r = await api('custMe', { ct: tok() });
    if (!r.success) { if (/الجلسة|جلسة/.test(r.error || '')) try { localStorage.removeItem(key()); } catch (e) { /* */ } return null; }
    D.me = r; return r;
  }
  async function ensureLogin() { if (await me()) return true; return (await login()) && !!(await me(true)); }

  // نموذج عنوان جديد: GPS + تفاصيل المبنى
  function addForm(m, onSaved) {
    let ll = null;
    m.body('<button class="fcd-btn" id="fcdLoc">&#9678; تحديد موقعي الحالي (GPS)</button><div class="fcd-gps" id="fcdGS">اضغط الزر واسمح بالوصول للموقع — كن داخل المبنى أو بجانبه لدقة أعلى.</div><div id="fcdMapW"></div>' +
      '<label>اسم العنوان</label><input id="fa_label" placeholder="المنزل / العمل">' +
      '<label>الحي والشارع</label><input id="fa_street" placeholder="الحي، الشارع">' +
      '<div class="fcd-g2"><div><label>المجمع</label><input id="fa_complex" placeholder="اسم المجمع"></div><div><label>المبنى / البلوك</label><input id="fa_building" placeholder="رقم المبنى"></div>' +
      '<div><label>الطابق</label><input id="fa_floor" inputmode="numeric"></div><div><label>الشقة</label><input id="fa_apartment"></div></div>' +
      '<label>علامة مميزة</label><input id="fa_landmark" placeholder="بجانب...">' +
      '<label>تفاصيل أخرى للسائق</label><textarea id="fa_notes" rows="2" placeholder="رمز البوابة، لون الباب..."></textarea>' +
      '<button class="fcd-btn" id="fcdSave">&#10003; حفظ العنوان</button><div class="fcd-err" id="fcdE"></div>');
    m.$('#fcdLoc').onclick = () => {
      const gs = m.$('#fcdGS');
      if (!navigator.geolocation) { gs.className = 'fcd-gps err'; gs.textContent = 'جهازك لا يدعم تحديد الموقع'; return; }
      gs.className = 'fcd-gps'; gs.textContent = 'جاري تحديد موقعك عبر الأقمار الصناعية...';
      navigator.geolocation.getCurrentPosition(p => {
        ll = { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: Math.round(p.coords.accuracy || 0) };
        gs.className = 'fcd-gps ok'; gs.textContent = 'تم تحديد موقعك' + (ll.accuracy ? ' بدقة ±' + ll.accuracy + ' متر' : '') + ' — تأكد من الدبوس على الخريطة.';
        m.$('#fcdMapW').innerHTML = '<iframe class="fcd-map" loading="lazy" src="' + osm(ll.lat, ll.lng) + '"></iframe>';
      }, er => { gs.className = 'fcd-gps err'; gs.textContent = er && er.code === 1 ? 'تم رفض إذن الموقع — فعّله من إعدادات المتصفح ثم أعد المحاولة' : 'تعذر تحديد الموقع — تأكد من تفعيل GPS وأعد المحاولة'; },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
    };
    m.$('#fcdSave').onclick = async () => {
      const v = k => (m.$('#fa_' + k).value || '').trim();
      if (!ll) { m.$('#fcdE').textContent = 'حدد موقعك أولاً بالضغط على «تحديد موقعي الحالي»'; return; }
      if (!v('building') && !v('complex') && !v('street')) { m.$('#fcdE').textContent = 'أدخل المبنى أو المجمع أو الشارع'; return; }
      const a = Object.assign({}, ll, { label: v('label'), street: v('street'), complex: v('complex'), building: v('building'), floor: v('floor'), apartment: v('apartment'), landmark: v('landmark'), notes: v('notes') });
      const b = m.$('#fcdSave'); b.disabled = true;
      const r = await api('custSaveAddress', { ct: tok(), address: a });
      b.disabled = false;
      if (!r.success) { m.$('#fcdE').textContent = r.error || 'تعذر الحفظ'; return; }
      if (D.me) D.me.addresses = r.addresses;
      onSaved(r.address);
    };
  }
  function listView(m, onPick, pickMode) {
    const list = (D.me && D.me.addresses) || [];
    m.body((list.length ? list.map(a => '<div class="fcd-ad' + (D.sel && D.sel.id === a.id ? ' on' : '') + '" data-id="' + esc(a.id) + '"><span style="color:var(--fcd-c);font-size:16px;line-height:1">&#9673;</span><div class="t"><b>' + esc(a.label || 'عنوان') + '</b><br>' + esc(line(a)) + (a.notes ? '<br><span style="color:#9aa6c2">' + esc(a.notes) + '</span>' : '') + '</div><button class="del" data-del="' + esc(a.id) + '">حذف</button></div>').join('')
      : '<p class="fcd-note" style="text-align:center;padding:14px 0">لا توجد عناوين محفوظة بعد</p>') +
      '<button class="fcd-btn' + (list.length ? ' o' : '') + '" id="fcdAdd">+ إضافة عنوان جديد</button>');
    m.$('#fcdAdd').onclick = () => addForm(m, a => { if (pickMode) { D.sel = a; onPick(a); m.close(); } else listView(m, onPick, pickMode); });
    m.el.querySelectorAll('[data-del]').forEach(b => b.onclick = async e => {
      e.stopPropagation(); if (!confirm('حذف هذا العنوان؟')) return;
      const r = await api('custDeleteAddress', { ct: tok(), id: b.dataset.del });
      if (r.success && D.me) { D.me.addresses = r.addresses; if (D.sel && D.sel.id === b.dataset.del) D.sel = null; }
      listView(m, onPick, pickMode);
    });
    m.el.querySelectorAll('.fcd-ad').forEach(x => x.onclick = () => { if (!pickMode) return; D.sel = list.find(a => a.id === x.dataset.id); onPick(D.sel); m.close(); });
  }
  // اختيار عنوان التوصيل (مع تسجيل الدخول عند الحاجة)
  async function pick() {
    if (!(await ensureLogin())) return null;
    return new Promise(res => {
      let picked = null;
      const m = sheet('عنوان التوصيل', '');
      m.onClose = () => res(picked);
      listView(m, a => { picked = a; try { localStorage.setItem('fcdAddr_' + D.r, a.id); } catch (e) { /* */ } }, true);
    });
  }
  async function manage() { if (!(await ensureLogin())) return; const m = sheet('عناويني', ''); listView(m, () => {}, false); }
  async function selected() {
    if (D.sel) return D.sel;
    const r = await me(); if (!r) return null;
    const id = localStorage.getItem('fcdAddr_' + D.r);
    D.sel = (r.addresses || []).find(a => a.id === id) || (r.addresses || [])[0] || null;
    return D.sel;
  }
  window.FCDel = {
    setup: o => { Object.assign(D, o || {}); D.r = String(D.r || '').toLowerCase(); },
    token: tok, me, login, ensureLogin, pick, manage, selected, line,
    clear: () => { D.sel = null; D.me = null; },
    get current() { return D.sel; },
  };
})();
