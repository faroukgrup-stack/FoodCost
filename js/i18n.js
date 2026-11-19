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

  var AR = '\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF';
  var SEG = new RegExp('[' + AR + '](?:[' + AR + '\\s«»\\-\\(\\)/ـ،؛؟!:\\.]*[' + AR + '\\)»])?', 'g');
  var HAS = new RegExp('[' + AR + ']');
  var cache = {};
  function D() { return window.FC_I18N || {}; }
  function norm(s) { return s.replace(/\s+/g, ' ').trim(); }
  function tr(s) {
    if (!s || !HAS.test(s)) return s;
    if (cache[s] !== undefined) return cache[s];
    var d = D(), n = norm(s), out;
    if (d[n] !== undefined) { var lead = s.match(/^\s*/)[0], tail = s.match(/\s*$/)[0]; out = lead + d[n] + tail; }
    else out = s.replace(SEG, function (m) { var k = norm(m); return d[k] !== undefined ? d[k] : m; });
    out = out.replace(/،/g, ',').replace(/؛/g, ';').replace(/؟/g, '?');
    cache[s] = out; return out;
  }
  api.t = tr;
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, NOSCRIPT: 1, CODE: 1 };
  var ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
  function skip(el) { for (var e = el; e && e.nodeType === 1; e = e.parentNode) { if (SKIP[e.tagName] || e.hasAttribute('data-i18n-skip') || e.isContentEditable) return true; } return false; }
  function doText(n) { var v = n.nodeValue; if (!v || !HAS.test(v)) return; if (n.parentNode && skip(n.parentNode)) return; var t = tr(v); if (t !== v) n.nodeValue = t; }
  function doEl(el) {
    if (el.nodeType !== 1 || skip(el)) return;
    for (var i = 0; i < ATTRS.length; i++) { var a = el.getAttribute(ATTRS[i]); if (a && HAS.test(a)) el.setAttribute(ATTRS[i], tr(a)); }
    if (el.tagName === 'INPUT' && (el.type === 'button' || el.type === 'submit') && HAS.test(el.value)) el.value = tr(el.value);
    if (el.tagName === 'OPTION' && HAS.test(el.textContent)) el.textContent = tr(el.textContent);
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
    var t = document.title; if (HAS.test(t)) document.title = tr(t);
    walk(document.body); pickers();
    mo.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS.concat(['value']) });
    // العنوان
    var te = document.querySelector('title'); if (te) new MutationObserver(function () { var x = document.title; if (HAS.test(x)) document.title = tr(x); }).observe(te, { childList: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  // رسائل المتصفح المنبثقة
  var A = window.alert, C = window.confirm, P = window.prompt;
  window.alert = function (m) { return A.call(window, tr(String(m == null ? '' : m))); };
  window.confirm = function (m) { return C.call(window, tr(String(m == null ? '' : m))); };
  window.prompt = function (m, d) { return P.call(window, tr(String(m == null ? '' : m)), d); };
  // تنسيق إضافي للاتجاه من اليسار لليمين
  var st = document.createElement('style');
  st.textContent = 'html[dir=ltr] body{direction:ltr}html[dir=ltr] .sidebar-nav,html[dir=ltr] .modal-box{text-align:left}html[dir=ltr] .card-name,html[dir=ltr] .cart-heading h2{text-align:left}';
  document.head.appendChild(st);
})();
