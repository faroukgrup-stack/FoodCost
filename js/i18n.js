// ============================================================
// Mataami Pro v5.0 — تعدد اللغات (العربية / English / Türkçe)
// مترجم لحظي للواجهة: يترجم النصوص الظاهرة والتلميحات وحقول الإدخال حسب اللغة المختارة
// اللغة تُحفظ على الجهاز (fcLang) ويمكن تمريرها بالرابط ?lang=en
// ============================================================
(function () {
  var LS = 'fcLang', LANGS = { ar: 'العربية', en: 'English', tr: 'Türkçe' };
  var q = null; try { q = new URLSearchParams(location.search).get('lang'); } catch (e) { /* */ }
  if (q && LANGS[q]) try { localStorage.setItem(LS, q); } catch (e) { /* */ }
  var lang = 'ar'; try { lang = localStorage.getItem(LS) || 'ar'; } catch (e) { /* */ }
  if (!LANGS[lang]) lang = 'ar';
  var base = (function () { var s = document.currentScript && document.currentScript.src; return s ? s.replace(/i18n\.js.*$/, '') : 'js/'; })();
  var ver = (document.currentScript && (document.currentScript.src.split('?')[1] || '')) || '';

  var api = window.fcI18n = {
    lang: function () { return lang; }, langs: LANGS,
    set: function (l) { if (!LANGS[l]) return; try { localStorage.setItem(LS, l); } catch (e) { /* */ } location.reload(); },
    t: function (s) { return s; },
    menu: function (ev) {
      if (ev) { ev.stopPropagation(); ev.preventDefault(); }
      var old = document.getElementById('fcLangPop'); if (old) { old.remove(); return; }
      var d = document.createElement('div'); d.id = 'fcLangPop'; d.setAttribute('data-i18n-skip', '');
      d.style.cssText = 'position:fixed;inset:0;z-index:200000;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center';
      d.innerHTML = '<div style="background:#151b2b;color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:18px;padding:18px;min-width:260px;font-family:inherit;box-shadow:0 20px 50px rgba(0,0,0,.5)"><div style="font-weight:800;margin-bottom:12px;text-align:center">اللغة · Language · Dil</div>' +
        Object.keys(LANGS).map(function (k) { return '<button data-l="' + k + '" style="display:block;width:100%;margin:6px 0;padding:11px;border-radius:12px;border:1px solid ' + (k === lang ? '#b48554' : 'rgba(255,255,255,.12)') + ';background:' + (k === lang ? '#b48554' : 'transparent') + ';color:' + (k === lang ? '#0b0e17' : '#fff') + ';font:inherit;font-weight:700;cursor:pointer">' + LANGS[k] + '</button>'; }).join('') + '</div>';
      d.onclick = function (e) { var b = e.target.closest('[data-l]'); if (b) api.set(b.dataset.l); else if (e.target === d) d.remove(); };
      document.body.appendChild(d);
    }
  };
  function pickers() {
    var els = document.querySelectorAll('[data-lang-picker]:not([data-ok])');
    for (var i = 0; i < els.length; i++) {
      var el = els[i]; el.setAttribute('data-ok', '1'); el.setAttribute('data-i18n-skip', '');
      el.innerHTML = '<div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap">' + Object.keys(LANGS).map(function (k) { return '<button type="button" data-setlang="' + k + '" style="padding:6px 12px;border-radius:999px;border:1px solid ' + (k === lang ? '#b48554' : 'rgba(127,127,127,.35)') + ';background:' + (k === lang ? '#b48554' : 'transparent') + ';color:' + (k === lang ? '#0b0e17' : 'inherit') + ';font:inherit;font-size:.8rem;font-weight:700;cursor:pointer">' + LANGS[k] + '</button>'; }).join('') + '</div>';
    }
  }
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-setlang]'); if (b) { e.preventDefault(); api.set(b.getAttribute('data-setlang')); } }, true);
  document.addEventListener('DOMContentLoaded', pickers);

  if (lang === 'ar') { new MutationObserver(function () { pickers(); }).observe(document.documentElement, { childList: true, subtree: true }); return; }

  // تحميل قاموس اللغة (متزامن أثناء تحليل الصفحة)
  document.write('<script src="' + base + 'i18n-' + lang + '.js' + (ver ? '?' + ver : '') + '"><\/script>');
  document.documentElement.setAttribute('lang', lang);
  document.documentElement.setAttribute('dir', 'ltr');

  var AR = '\u0600-\u065F\u066A-\u06EF\u06FA-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF';
  var SEG = new RegExp('[' + AR + '](?:[' + AR + '\\s«»\\-\\(\\)/ـ،؛؟!:\\.]*[' + AR + '\\)»])?', 'g');
  var HAS = new RegExp('[' + AR + ']'), HASX = /[\u0600-\u06FF]/;
  var cache = {};
  function D() { return window.FC_I18N || {}; }
  function norm(s) { return s.replace(/\s+/g, ' ').trim(); }
  function digits(s) { return s.replace(/[\u0660-\u0669]/g, function (c) { return String(c.charCodeAt(0) - 0x660); }).replace(/[\u06F0-\u06F9]/g, function (c) { return String(c.charCodeAt(0) - 0x6F0); }).replace(/(\d)\s?ص(?![\u0600-\u06FF])/g, '$1 AM').replace(/(\d)\s?م(?![\u0600-\u06FF])/g, '$1 PM').replace(/٫/g, '.').replace(/٬/g, ','); }
  function seg(m) {
    var d = D(), k = norm(m); if (d[k] !== undefined) return d[k];
    // تجزئة إضافية عند علامات الترقيم
    var parts = m.split(/([،؛:.!؟«»\(\)\-–—\/|•·])/);
    if (parts.length > 1) return parts.map(function (x) { var y = norm(x); return y && d[y] !== undefined ? x.replace(y, d[y]) : x; }).join('');
    return m;
  }
  function tr1(s) {
    var d = D(), n = norm(s), out;
    if (d[n] !== undefined) { var lead = s.match(/^\s*/)[0], tail = s.match(/\s*$/)[0]; out = lead + d[n] + tail; }
    else out = s.replace(SEG, seg);
    return out;
  }
  var cacheN = 0;
  function tr(s) {
    if (!s) return s;
    var s0 = s; s = digits(s);
    if (!HAS.test(s)) return s;
    if (cache[s0] !== undefined) return cache[s0];
    var out = s.indexOf('\n') >= 0 ? s.split('\n').map(tr1).join('\n') : tr1(s);
    out = out.replace(/،/g, ',').replace(/؛/g, ';').replace(/؟/g, '?');
    if (++cacheN > 20000) { cache = {}; cacheN = 0; }
    cache[s0] = out; return out;
  }
  api.t = tr;
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, NOSCRIPT: 1, CODE: 1 };
  var ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
  function skip(el) { for (var e = el; e && e.nodeType === 1; e = e.parentNode) { if (SKIP[e.tagName] || e.hasAttribute('data-i18n-skip') || e.isContentEditable) return true; } return false; }
  function doText(n) { var v = n.nodeValue; if (!v || !HASX.test(v)) return; if (n.parentNode && skip(n.parentNode)) return; var t = tr(v); if (t !== v) n.nodeValue = t; }
  function doEl(el) {
    if (el.nodeType !== 1) return;
    // v5.0.2: حقول النص الطويل — نترجم التلميح (placeholder) فقط ولا نلمس ما يكتبه المستخدم
    if (el.tagName === 'TEXTAREA') { if (el.parentNode && skip(el.parentNode)) return; var ph = el.getAttribute('placeholder'); if (ph && HASX.test(ph)) { var tp = tr(ph); if (tp !== ph) el.setAttribute('placeholder', tp); } return; }
    if (skip(el)) return;
    // مهم: لا نعيد الكتابة إلا عند تغيّر القيمة فعلاً (تجنب حلقة لا نهائية مع المراقب)
    for (var i = 0; i < ATTRS.length; i++) { var a = el.getAttribute(ATTRS[i]); if (a && HASX.test(a)) { var t = tr(a); if (t !== a) el.setAttribute(ATTRS[i], t); } }
    if (el.tagName === 'INPUT' && (el.type === 'button' || el.type === 'submit') && HASX.test(el.value)) { var v = tr(el.value); if (v !== el.value) el.value = v; }
  }
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    if (root.nodeType === 1) { if (skip(root)) return; doEl(root); }
    var w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, null), n;
    while ((n = w.nextNode())) { if (n.nodeType === 3) doText(n); else doEl(n); }
  }
  var queue = [], sched = false;
  function flush() { sched = false; var q2 = queue; queue = []; for (var i = 0; i < q2.length; i++) walk(q2[i]); pickers(); }
  function push(n) { queue.push(n); if (!sched) { sched = true; (window.requestAnimationFrame || setTimeout)(flush); } }
  var mo = new MutationObserver(function (list) {
    for (var i = 0; i < list.length; i++) {
      var m = list[i];
      if (m.type === 'characterData') doText(m.target);
      else if (m.type === 'attributes') doEl(m.target);
      else for (var j = 0; j < m.addedNodes.length; j++) push(m.addedNodes[j]);
    }
  });
  function start() {
    var t = document.title; if (HASX.test(t)) { var t2 = tr(t); if (t2 !== t) document.title = t2; }
    walk(document.body); pickers();
    mo.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS.concat(['value']) });
    // العنوان
    var te = document.querySelector('title'); if (te) new MutationObserver(function () { var x = document.title; if (HASX.test(x)) { var y = tr(x); if (y !== x) document.title = y; } }).observe(te, { childList: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  // رسائل المتصفح المنبثقة
  var A = window.alert, C = window.confirm, P = window.prompt;
  window.alert = function (m) { return A.call(window, tr(String(m == null ? '' : m))); };
  window.confirm = function (m) { return C.call(window, tr(String(m == null ? '' : m))); };
  window.prompt = function (m, d) { return P.call(window, tr(String(m == null ? '' : m)), d); };
  // التاريخ والوقت والأرقام بلغة الواجهة بدلاً من العربية
  var LOC = lang === 'tr' ? 'tr-TR' : 'en-GB', NLOC = lang === 'tr' ? 'tr-TR' : 'en-US';
  function fixL(l, num) { if (l == null) return num ? NLOC : LOC; var x = Array.isArray(l) ? l[0] : l; return /^ar/i.test(String(x || '')) ? (num ? NLOC : LOC) : l; }
  ['toLocaleString', 'toLocaleDateString', 'toLocaleTimeString'].forEach(function (k) { var o = Date.prototype[k]; Date.prototype[k] = function (l, opt) { return o.call(this, fixL(l), opt); }; });
  var on = Number.prototype.toLocaleString; Number.prototype.toLocaleString = function (l, opt) { return on.call(this, fixL(l, 1), opt); };
  try {
    var DTF = Intl.DateTimeFormat, NF = Intl.NumberFormat;
    Intl.DateTimeFormat = function (l, o) { return new DTF(fixL(l), o); }; Intl.DateTimeFormat.prototype = DTF.prototype; Intl.DateTimeFormat.supportedLocalesOf = DTF.supportedLocalesOf;
    Intl.NumberFormat = function (l, o) { return new NF(fixL(l, 1), o); }; Intl.NumberFormat.prototype = NF.prototype; Intl.NumberFormat.supportedLocalesOf = NF.supportedLocalesOf;
  } catch (e) { /* */ }
  // تنسيق إضافي للاتجاه من اليسار لليمين
  var st = document.createElement('style');
  st.textContent = 'html[dir=ltr] .restaurant-dropdown{left:auto!important;right:0!important}html[dir=ltr] .biz-page-tools{left:auto;right:0}html[dir=ltr] .toggle-password-btn{left:auto;right:12px}html[dir=ltr] .pro-input-wrap .pro-icon{left:auto;right:14px}html[dir=ltr] .bell-n{left:auto;right:-6px}html[dir=ltr] .ops-go{left:auto;right:12px}html[dir=ltr] .plan-card .pc-tag{left:auto;right:16px}html[dir=ltr] .currency-dropdown{direction:ltr}html[dir=ltr] body{direction:ltr}html[dir=ltr] .sidebar-nav,html[dir=ltr] .modal-box{text-align:left}html[dir=ltr] .card-name,html[dir=ltr] .cart-heading h2{text-align:left}';
  document.head.appendChild(st);
})();
