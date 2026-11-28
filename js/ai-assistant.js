// ============================================================
// Mataami Pro v5.0.2 — المساعد الذكي (AI) لصاحب الحساب الرئيسي
// يظهر للحساب الرئيسي فقط · متاح في باقتي الإنطلاقة والمتقدمة
// يتابع الصفحة الحالية ويرسل سياقها فقط (استهلاك منخفض)، والإجابة على قدر السؤال
// ============================================================
(function () {
  'use strict';
  var L = function () { try { return (window.fcI18n && fcI18n.lang()) || 'ar'; } catch (e) { return 'ar'; } };
  var T = function (ar, en, tr) { var l = L(); return l === 'en' ? en : l === 'tr' ? tr : ar; };
  var KEY = 'fcAiChat', state = { open: false, busy: false, msgs: [] };
  try { state.msgs = JSON.parse(sessionStorage.getItem(KEY) || '[]').slice(-12); } catch (e) { state.msgs = []; }
  var save = function () { try { sessionStorage.setItem(KEY, JSON.stringify(state.msgs.slice(-12))); } catch (e) { /* */ } };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var md = function (s) {
    return esc(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>')
      .split(/\n/).map(function (ln) { return /^\s*([-•*]|\d+[.)])\s+/.test(ln) ? '<div class="ai-li">' + ln.replace(/^\s*[-•*]\s+/, '• ') + '</div>' : (ln.trim() ? '<div>' + ln + '</div>' : '<div class="ai-sp"></div>'); }).join('');
  };

  var TAB_PAGES = { dashboard: 'dashboard', 0: 'recipes', 1: 'materials', 2: 'menueng', 3: 'breakeven', 4: 'reviews', 5: 'menu' };
  function currentPage() {
    var biz = document.getElementById('tabBiz');
    var settingsOpen = (function () { var m = document.getElementById('settingsModal'); return m && getComputedStyle(m).display !== 'none' && m.offsetParent !== null; })();
    if (settingsOpen) return { key: 'settings', title: T('الإعدادات العامة', 'General settings', 'Genel ayarlar') };
    if (biz && biz.style.display !== 'none' && window.B && B.current) {
      var p = B.pages && B.pages[B.current]; var h = biz.querySelector('.biz-page-head h2');
      var sub = biz.querySelector('.biz-sub .active, [data-sub].active, .biz-tabs .active');
      return { key: B.current, title: ((h && h.textContent.trim()) || (p && p.title) || B.current) + (sub && sub.textContent.trim() ? ' › ' + sub.textContent.trim() : '') };
    }
    var t = typeof currentTab !== 'undefined' ? currentTab : 'dashboard';
    var btn = document.querySelector('.nav-btn[data-tab="' + t + '"]');
    return { key: TAB_PAGES[t] || 'dashboard', title: btn ? btn.textContent.trim() : '' };
  }
  var CHIPS = {
    screens: [['كيف أشغّل شاشة المطبخ حسب المحطة؟', 'How do I run a kitchen screen per station?', 'İstasyon bazlı mutfak ekranını nasıl çalıştırırım?'], ['كيف أربط شاشة العميل والكشك؟', 'How do I link the customer display and kiosk?', 'Müşteri ekranını ve kiosku nasıl bağlarım?']],
    products: [['كيف أحذف عدة منتجات دفعة واحدة؟', 'How do I delete several products at once?', 'Birden fazla ürünü aynı anda nasıl silerim?'], ['ماذا يعود للمخزون عند الإلغاء؟', 'What returns to stock on cancellation?', 'İptalde stoğa ne geri döner?']],
    importxl: [['كيف أستورد بياناتي من Excel؟', 'How do I import my data from Excel?', 'Verilerimi Excel\'den nasıl içe aktarırım?']],
    _: [['كيف أبدأ بإعداد مطعمي؟', 'How do I set up my restaurant?', 'Restoranımı nasıl kurarım?'], ['ما الفرق بين الباقات؟', 'What is the difference between plans?', 'Paketler arasındaki fark nedir?']],
    pos: [['كيف أفتح وردية وأبيع؟', 'How do I open a shift and sell?', 'Vardiya açıp nasıl satış yaparım?'], ['كيف ألغي طلباً؟', 'How do I cancel an order?', 'Siparişi nasıl iptal ederim?']],
    statements: [['كيف أعتمد مسير الرواتب مع خصم؟', 'How do I post payroll with a deduction?', 'Kesintili bordroyu nasıl onaylarım?'], ['كيف أسجل سلفة لموظف؟', 'How do I record an employee advance?', 'Çalışana avans nasıl kaydedilir?']],
    inventory: [['كيف أنشئ أمر إنتاج وأطبع الملصقات؟', 'How do I create a production order and print labels?', 'Üretim emri oluşturup etiketleri nasıl yazdırırım?'], ['كيف أعمل جرد؟', 'How do I do a stock count?', 'Stok sayımı nasıl yapılır?']],
    recipes: [['كيف أحسب تكلفة طبق؟', 'How do I calculate a dish cost?', 'Yemek maliyetini nasıl hesaplarım?'], ['كيف أربط الطبق بالمخزون؟', 'How do I link a dish to inventory?', 'Yemeği stoğa nasıl bağlarım?']],
    materials: [['كيف أحدّث سعر مادة؟', 'How do I update a material price?', 'Malzeme fiyatını nasıl güncellerim?']],
    finance: [['كيف أسجل مصروفاً؟', 'How do I record an expense?', 'Gider nasıl kaydedilir?'], ['كيف أغلق الوردية؟', 'How do I close a shift?', 'Vardiyayı nasıl kapatırım?']],
    team: [['كيف أضيف موظفاً بصلاحيات؟', 'How do I add an employee with permissions?', 'Yetkili çalışan nasıl eklenir?']],
    reviews: [['كيف أشارك رابط التقييم؟', 'How do I share the review link?', 'Değerlendirme bağlantısını nasıl paylaşırım?']],
    franchise: [['كيف أضيف صاحب امتياز؟', 'How do I add a franchisee?', 'Franchise alan nasıl eklenir?']],
    settings: [['كيف أغير اسم صاحب الحساب؟', 'How do I change the owner name?', 'Hesap sahibi adını nasıl değiştiririm?'], ['كيف أضبط النسخ الاحتياطي التلقائي؟', 'How do I set automatic backup?', 'Otomatik yedeklemeyi nasıl ayarlarım?']]
  };
  // فهرس القوائم بأسمائها الظاهرة للمستخدم (بلغته) — نص قصير
  function navIndex() {
    var D = window.FC_I18N || {}, tr = function (x) { return D[x] || x; }, out = [];
    var main = [].map.call(document.querySelectorAll('.sidebar-nav .nav-btn'), function (b) { return b.textContent.trim(); }).filter(Boolean);
    if (main.length) out.push(main.join(', '));
    try {
      (typeof BIZ_GROUPS !== 'undefined' ? BIZ_GROUPS : []).forEach(function (g) {
        var ps = Object.keys(B.pages || {}).filter(function (k) { return B.pages[k].group === g[0]; }).map(function (k) { return tr(B.pages[k].title); });
        if (ps.length) out.push(tr(g[1]) + ': ' + ps.join(', '));
      });
    } catch (e) { /* */ }
    return out.join(' | ').slice(0, 1600);
  }
  function chips() {
    var k = currentPage().key, l = L(), i = l === 'en' ? 1 : l === 'tr' ? 2 : 0;
    return (CHIPS[k] || []).concat(CHIPS._).slice(0, 3).map(function (c) { return c[i]; });
  }

  function css() {
    if (document.getElementById('aiCss')) return;
    var s = document.createElement('style'); s.id = 'aiCss';
    s.textContent = '#aiFab{position:fixed;bottom:20px;right:20px;z-index:9500;width:54px;height:54px;border-radius:50%;border:none;cursor:pointer;background:linear-gradient(145deg,#b48554,#8a5f35);color:#fff;font-size:1.35rem;box-shadow:0 10px 25px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center}' +
      '#aiFab.lock{filter:grayscale(.6);opacity:.85}#aiFab .dot{position:absolute;top:6px;right:6px;width:10px;height:10px;border-radius:50%;background:#2ecc71;border:2px solid #1b2333}' +
      '#aiPanel{position:fixed;bottom:84px;right:20px;z-index:9501;width:min(380px,calc(100vw - 24px));height:min(560px,calc(100vh - 120px));background:#141b2b;color:#e8ecf3;border:1px solid rgba(180,133,84,.45);border-radius:18px;box-shadow:0 25px 60px rgba(0,0,0,.55);display:none;flex-direction:column;overflow:hidden;font-family:inherit}' +
      '#aiPanel.open{display:flex}#aiPanel .ai-h{display:flex;align-items:center;gap:10px;padding:12px 14px;background:rgba(180,133,84,.14);border-bottom:1px solid rgba(255,255,255,.08)}' +
      '#aiPanel .ai-h b{flex:1;font-size:.95rem}#aiPanel .ai-h small{display:block;font-weight:400;opacity:.7;font-size:.72rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:230px}#aiPanel .ai-h button{background:none;border:none;color:#cfd6e2;cursor:pointer;font-size:1rem;padding:4px 6px}' +
      '#aiPanel .ai-b{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px}#aiPanel .ai-m{max-width:88%;padding:9px 12px;border-radius:14px;font-size:.88rem;line-height:1.65;word-wrap:break-word}' +
      '#aiPanel .ai-m.u{align-self:flex-end;background:#b48554;color:#fff;border-end-end-radius:4px}#aiPanel .ai-m.a{align-self:flex-start;background:#1f2940;border:1px solid rgba(255,255,255,.07);border-end-start-radius:4px}#aiPanel .ai-m.e{align-self:center;background:rgba(231,76,60,.15);color:#ffb4ab;font-size:.8rem}' +
      '#aiPanel .ai-li{padding-inline-start:4px;margin:2px 0}#aiPanel .ai-sp{height:6px}#aiPanel code{background:rgba(255,255,255,.08);padding:0 4px;border-radius:4px}' +
      '#aiPanel .ai-c{display:flex;flex-wrap:wrap;gap:6px;padding:0 12px 8px}#aiPanel .ai-c button{background:rgba(180,133,84,.12);border:1px solid rgba(180,133,84,.4);color:#e8d6c2;border-radius:999px;padding:5px 10px;font:inherit;font-size:.76rem;cursor:pointer}' +
      '#aiPanel .ai-f{display:flex;gap:8px;padding:10px;border-top:1px solid rgba(255,255,255,.08);background:#10172a}#aiPanel textarea{flex:1;resize:none;height:42px;max-height:110px;background:#0b1120;color:#fff;border:1px solid #2b3550;border-radius:12px;padding:10px;font:inherit;font-size:.88rem}' +
      '#aiPanel .ai-f button{width:44px;border:none;border-radius:12px;background:#b48554;color:#fff;cursor:pointer;font-size:1rem}#aiPanel .ai-f button:disabled{opacity:.5}#aiPanel .ai-q{font-size:.68rem;opacity:.6;text-align:center;padding:0 0 6px}' +
      '@media(max-width:640px){#aiFab{bottom:14px;right:12px;width:48px;height:48px;font-size:1.15rem}#aiPanel{right:8px;left:8px;width:auto;bottom:70px;height:calc(100vh - 100px);height:calc(100dvh - 100px)}}' +
      'body.pos-mode #aiFab,body.kiosk #aiFab{display:none}';
    document.head.appendChild(s);
  }
  function eligible() { return !!(window.B && B.acc && B.acc.isOwner); }
  function allowed() { return eligible() && typeof hasF === 'function' && hasF('ai_assistant'); }

  function mount() {
    if (document.getElementById('aiFab') || !eligible()) return;
    css();
    var fab = document.createElement('button'); fab.id = 'aiFab'; fab.type = 'button'; fab.setAttribute('data-i18n-skip', '');
    fab.title = T('المساعد الذكي', 'AI assistant', 'Yapay zekâ asistanı');
    fab.innerHTML = '<i class="fas fa-robot"></i>' + (allowed() ? '<span class="dot"></span>' : '');
    if (!allowed()) fab.classList.add('lock');
    fab.onclick = toggle;
    var pn = document.createElement('div'); pn.id = 'aiPanel'; pn.setAttribute('data-i18n-skip', ''); pn.setAttribute('dir', L() === 'ar' ? 'rtl' : 'ltr');
    pn.innerHTML = '<div class="ai-h"><i class="fas fa-robot" style="color:#b48554"></i><b>' + esc(T('مساعد مطعمي برو', 'Mataami Pro Assistant', 'Mataami Pro Asistanı')) + '<small id="aiCtx"></small></b>' +
      '<button type="button" id="aiClr" title="' + esc(T('محادثة جديدة', 'New chat', 'Yeni sohbet')) + '"><i class="fas fa-eraser"></i></button><button type="button" id="aiX"><i class="fas fa-times"></i></button></div>' +
      '<div class="ai-b" id="aiBody"></div><div class="ai-c" id="aiChips"></div><div class="ai-q" id="aiQuota"></div>' +
      '<div class="ai-f"><textarea id="aiIn" maxlength="600" placeholder="' + esc(T('اسأل عن أي شيء في المنصة…', 'Ask anything about the platform…', 'Platform hakkında her şeyi sorun…')) + '"></textarea><button type="button" id="aiGo"><i class="fas fa-paper-plane"></i></button></div>';
    document.body.appendChild(fab); document.body.appendChild(pn);
    pn.querySelector('#aiX').onclick = toggle;
    pn.querySelector('#aiClr').onclick = function () { state.msgs = []; save(); draw(); };
    pn.querySelector('#aiGo').onclick = function () { send(); };
    var inp = pn.querySelector('#aiIn');
    inp.onkeydown = function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };
    inp.oninput = function () { inp.style.height = '42px'; inp.style.height = Math.min(110, inp.scrollHeight) + 'px'; };
    pn.querySelector('#aiChips').onclick = function (e) { var b = e.target.closest('button'); if (b) send(b.textContent); };
  }
  function toggle() {
    if (!allowed()) {
      var msg = T('المساعد الذكي متاح في باقة الإنطلاقة والمتقدمة', 'The AI assistant is available in the Starter and Advanced plans', 'Yapay zekâ asistanı Başlangıç ve Gelişmiş paketlerde mevcuttur');
      if (typeof showToast === 'function') showToast(msg, true); else alert(msg);
      return;
    }
    state.open = !state.open; document.getElementById('aiPanel').classList.toggle('open', state.open);
    if (state.open) { draw(); setTimeout(function () { var i = document.getElementById('aiIn'); if (i && window.innerWidth > 640) i.focus(); }, 50); }
  }
  function draw() {
    var b = document.getElementById('aiBody'); if (!b) return;
    var pg = currentPage(); var cx = document.getElementById('aiCtx'); if (cx) cx.textContent = pg.title ? T('أنت في: ', 'You are in: ', 'Şu an: ') + pg.title : '';
    var nm = (window.B && B.acc && (B.acc.ownerName || B.acc.fullName)) || '';
    var hello = '<div class="ai-m a">' + esc(T('أهلاً' + (nm ? ' ' + nm : '') + '، أنا مساعدك في مطعمي برو. اسألني عن أي قسم أو خطوة وسأجيبك باختصار.', 'Hi' + (nm ? ' ' + nm : '') + ', I am your Mataami Pro assistant. Ask me about any section or step and I will answer briefly.', 'Merhaba' + (nm ? ' ' + nm : '') + ', ben Mataami Pro asistanınızım. Herhangi bir bölüm veya adım hakkında sorun, kısaca yanıtlayayım.')) + '</div>';
    b.innerHTML = hello + state.msgs.map(function (m) { return '<div class="ai-m ' + (m.role === 'user' ? 'u' : m.role === 'error' ? 'e' : 'a') + '">' + (m.role === 'assistant' ? md(m.content) : esc(m.content)) + '</div>'; }).join('') +
      (state.busy ? '<div class="ai-m a"><i class="fas fa-ellipsis-h fa-beat-fade"></i></div>' : '');
    b.scrollTop = b.scrollHeight;
    document.getElementById('aiChips').innerHTML = state.msgs.length ? '' : chips().map(function (c) { return '<button type="button">' + esc(c) + '</button>'; }).join('');
    document.getElementById('aiGo').disabled = state.busy;
  }
  async function send(text) {
    var inp = document.getElementById('aiIn'); var q = String(text || inp.value || '').trim();
    if (!q || state.busy) return;
    inp.value = ''; inp.style.height = '42px';
    var hist = state.msgs.filter(function (m) { return m.role === 'user' || m.role === 'assistant'; }).slice(-4);
    state.msgs.push({ role: 'user', content: q }); state.busy = true; draw();
    var pg = currentPage();
    var r;
    try { r = await bz('aiAssist', { question: q, lang: L(), page: pg.key, pageTitle: pg.title, history: hist, nav: navIndex(), userName: (B.acc && (B.acc.ownerName || B.acc.fullName)) || '' }); }
    catch (e) { r = { success: false, error: e.message }; }
    state.busy = false;
    if (r && r.success) {
      state.msgs.push({ role: 'assistant', content: r.answer });
      var qd = document.getElementById('aiQuota'); if (qd && r.limit) qd.textContent = T('الاستخدام اليوم: ', 'Used today: ', 'Bugün kullanılan: ') + r.used + ' / ' + r.limit;
    } else state.msgs.push({ role: 'error', content: (r && r.error) || T('تعذر الاتصال', 'Connection failed', 'Bağlantı kurulamadı') });
    save(); draw();
  }
  // متابعة التنقل: تحديث سياق الصفحة عند تغيّرها
  var lastKey = '';
  setInterval(function () {
    if (!document.getElementById('aiFab')) { mount(); return; }
    if (!eligible()) { document.getElementById('aiFab').remove(); var p = document.getElementById('aiPanel'); if (p) p.remove(); return; }
    var k = currentPage(); if (state.open && k.key + k.title !== lastKey) { lastKey = k.key + k.title; draw(); }
  }, 1500);
  window.fcAi = { open: function () { if (!state.open) toggle(); }, ask: function (q) { if (!state.open) toggle(); send(q); } };
})();
