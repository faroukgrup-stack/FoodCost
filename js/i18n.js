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
  // v5.3.3: زر اللغة المختصر (أيقونة الكرة الأرضية + رمز اللغة الحالية) لتطبيق العميل والمينيو وحالة الطلب
  var SHORT = { ar: 'ع', en: 'EN', tr: 'TR' };
  function langBtns() {
    var els = document.querySelectorAll('[data-lang-btn]:not([data-ok])');
    for (var i = 0; i < els.length; i++) {
      var el = els[i]; el.setAttribute('data-ok', '1'); el.setAttribute('data-i18n-skip', ''); el.setAttribute('type', 'button');
      el.setAttribute('aria-label', 'اللغة · Language · Dil'); el.setAttribute('title', LANGS[lang]);
      el.innerHTML = '<i class="fas fa-globe" aria-hidden="true"></i><span style="font-weight:800;font-size:.78rem;margin-inline-start:5px">' + SHORT[lang] + '</span>';
      el.addEventListener('click', function (ev) { api.menu(ev); });
    }
  }
  var pk0 = pickers; pickers = function () { pk0(); langBtns(); };
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
    if (parts.length > 1) return parts.map(function (x) { var y = norm(x); return y && d[y] !== undefined ? x.replace(y, d[y]) : wordsFb(x); }).join('');
    return wordsFb(m);
  }
  // v5.3.2: عنوان ثابت + اسم متغير (مثل «تسوية ترينديول» أو «كشف حساب مورد») — نترجم الجزء الثابت ونترك الاسم كما هو
  var LBL = { 'تسوية': 1, 'أرصدة': 1, 'بطاقة': 1, 'تقييم': 1, 'تسليم': 1, 'قيد': 1, 'فاتورة': 1, 'طلب': 1, 'كشف': 1, 'فرع': 1, 'الفرع': 1, 'منصة': 1, 'عميل': 1, 'العميل': 1, 'مورد': 1, 'المورد': 1, 'موظف': 1, 'الموظف': 1, 'تقرير': 1, 'ملصقات': 1, 'تحويل': 1, 'إغلاق': 1, 'فتح': 1, 'دليل': 1, 'مسير': 1, 'حساب': 1, 'إقفال': 1, 'عكس': 1, 'سند': 1, 'أمر': 1, 'مطابقة': 1, 'سداد': 1, 'تحصيل': 1, 'وصفة': 1, 'دفعة': 1, 'جرد': 1, 'طاولة': 1, 'وردية': 1, 'صندوق': 1, 'سائق': 1, 'السائق': 1, 'قناة': 1, 'القناة': 1, 'عهدة': 1, 'باقة': 1 };
  function wordsFb(x) {
    var d = D(), y = norm(x); if (!y || y.indexOf(' ') < 0) return x;
    var w = y.split(' '), i, k;
    for (i = w.length - 1; i >= 1; i--) { k = w.slice(0, i).join(' '); if (d[k] !== undefined && (i >= 2 || LBL[k])) { var rest = w.slice(i).join(' '); var r2 = wordsFb(rest); return x.replace(y, d[k] + ' ' + r2); } }
    for (i = 1; i < w.length - 0; i++) { k = w.slice(i).join(' '); if (d[k] !== undefined && (w.length - i >= 2 || LBL[k])) return x.replace(y, w.slice(0, i).join(' ') + ' ' + d[k]); }
    return x;
  }
  // v5.3.5: جمل فيها أرقام متغيرة — مفتاح القاموس يكتب الرقم {n} (مثل «{n} أصناف ارتفع سعرها أكثر من {n}% خلال {n} يوم»)
  var NUM = /\d+(?:[.,]\d+)*/g;
  function trNum(n) {
    if (!/\d/.test(n)) return null;
    var d = D(), vals = [], key = n.replace(NUM, function (m) { vals.push(m); return '{n}'; });
    var t = d[key]; if (t === undefined) return null;
    var i = 0; return t.replace(/\{n\}|\{(\d)\}/g, function (m, k) { return k !== undefined ? (vals[+k] !== undefined ? vals[+k] : '') : (vals[i++] !== undefined ? vals[i - 1] : ''); });
  }
  function tr1(s) {
    var d = D(), n = norm(s), out, x;
    var lead = s.match(/^\s*/)[0], tail = s.match(/\s*$/)[0];
    if (d[n] !== undefined) out = lead + d[n] + tail;
    else if ((x = trNum(n)) !== null) out = lead + x + tail;
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
    out = out.replace(/،/g, ',').replace(/؛/g, ';').replace(/؟/g, '?').replace(/←/g, '→');
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
  function flush() { sched = false; var q2 = queue; queue = []; for (var i = 0; i < q2.length; i++) walk(q2[i]); pickers(); if (window.Chart && !window.Chart.__fcI18n) patchChart(); }
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
  // ============================================================
  // v5.3.2: كل المخرجات بلغة الواجهة — نوافذ الطباعة (الفواتير، التقارير، الملصقات، الأدلة)،
  // ملفات Word/HTML/CSV، ملفات Excel، أسماء الملفات، ورسائل واتساب
  // ============================================================
  function mirrorCss(s) {
    return s.replace(/(text-align|float|clear)\s*:\s*(right|left)/gi, function (m, p, v) { return p + ':' + (v.toLowerCase() === 'right' ? 'left' : 'right'); })
      .replace(/(margin|padding|border)-(right|left)(?=[\s:-])/gi, function (m, p, v) { return p + '-' + (v.toLowerCase() === 'right' ? 'left' : 'right'); });
  }
  function trHtml(html) {
    if (!html || !HASX.test(html)) return html;
    try {
      var full = /<html[\s>]/i.test(html), bom = html.charCodeAt(0) === 0xFEFF ? '\uFEFF' : '';
      if (bom) html = html.slice(1);
      var doc = new DOMParser().parseFromString(full ? html : '<!DOCTYPE html><html><head></head><body>' + html + '</body></html>', 'text/html');
      var w = doc.createTreeWalker(doc.documentElement, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, null), n;
      while ((n = w.nextNode())) {
        if (n.nodeType === 3) { if (HASX.test(n.nodeValue) && !(n.parentNode && SKIP[n.parentNode.tagName])) n.nodeValue = tr(n.nodeValue); continue; }
        if (n.tagName === 'STYLE') { n.textContent = mirrorCss(n.textContent); continue; }
        var st = n.getAttribute('style'); if (st) n.setAttribute('style', mirrorCss(st));
        if (n.getAttribute('dir') === 'rtl') n.setAttribute('dir', 'ltr');
        for (var i = 0; i < ATTRS.length; i++) { var a = n.getAttribute(ATTRS[i]); if (a && HASX.test(a)) n.setAttribute(ATTRS[i], tr(a)); }
        if (n.tagName === 'TEXTAREA' && HASX.test(n.textContent)) n.textContent = tr(n.textContent);
      }
      if (doc.title && HASX.test(doc.title)) doc.title = tr(doc.title);
      doc.documentElement.setAttribute('dir', 'ltr'); doc.documentElement.setAttribute('lang', lang);
      if (!full) return doc.body.innerHTML;
      var dt = doc.doctype ? '<!DOCTYPE ' + doc.doctype.name + '>' : '';
      return bom + dt + doc.documentElement.outerHTML;
    } catch (e) { return html; }
  }
  function trPlain(s) { return s && HASX.test(s) ? s.split('\n').map(function (l) { return HASX.test(l) ? tr(l) : l; }).join('\n') : s; }
  function trFileName(n) {
    if (!n || !HASX.test(n)) return n;
    var m = String(n).match(/^(.*?)(\.[A-Za-z0-9]{2,5})?$/), base = m[1], ext = m[2] || '';
    base = base.replace(/[\u0600-\u06FF][\u0600-\u06FF_\- ]*[\u0600-\u06FF]|[\u0600-\u06FF]/g, function (run) { return tr(run.replace(/[_-]/g, ' ')).trim().replace(/\s+/g, '_'); });
    return base.replace(/[\\/:*?"<>|]/g, '-') + ext;
  }
  api.html = trHtml; api.plain = trPlain; api.file = trFileName;
  // 1) نوافذ الطباعة: نجمع ما يُكتب في النافذة ثم نترجمه دفعة واحدة
  var WO = window.open;
  window.open = function (url, name, feat) {
    if (url && /wa\.me|api\.whatsapp|whatsapp:\/\//i.test(url)) {
      try { url = String(url).replace(/([?&]text=)([^&]*)/, function (m, p, v) { return p + encodeURIComponent(trPlain(decodeURIComponent(v))); }); } catch (e) { /* */ }
    }
    var w = WO.call(window, url, name, feat);
    if (w && (!url || url === 'about:blank')) {
      try {
        var d = w.document, ow = d.write, oc = d.close, buf = '', tm = null;
        var flush = function () { tm = null; if (!buf) return; var x = buf; buf = ''; ow.call(d, trHtml(x)); };
        d.write = function () { buf += Array.prototype.join.call(arguments, ''); if (!tm) tm = setTimeout(function () { flush(); try { oc.call(d); } catch (e) { /* */ } }, 0); };
        d.writeln = function () { d.write(Array.prototype.join.call(arguments, '') + '\n'); };
        d.close = function () { if (tm) { clearTimeout(tm); tm = null; } flush(); return oc.call(d); };
      } catch (e) { /* */ }
    }
    return w;
  };
  // 2) ملفات Word / HTML / CSV / نص
  try {
    var OB = window.Blob;
    var NB = function (parts, opt) {
      try {
        var ty = (opt && opt.type) || '';
        if (parts && parts.length && /html|msword|csv|text\/plain/i.test(ty) && parts.every(function (p) { return typeof p === 'string'; })) {
          var s = parts.join('');
          if (HASX.test(s)) parts = [/html|msword/i.test(ty) ? trHtml(s) : trPlain(s)];
        }
      } catch (e) { /* */ }
      return new OB(parts, opt);
    };
    NB.prototype = OB.prototype; window.Blob = NB;
  } catch (e) { /* */ }
  // 3) ملفات Excel (ExcelJS): أسماء الأوراق والخلايا والاتجاه
  function trBook(wb) {
    try {
      var used = {};
      (wb.worksheets || []).forEach(function (ws) {
        if (HASX.test(ws.name || '')) { var nm = tr(ws.name).replace(/[\[\]:*?\/\\]/g, ' ').slice(0, 31).trim() || 'Sheet'; var b = nm, c = 2; while (used[nm]) nm = b.slice(0, 28) + ' ' + (c++); try { ws.name = nm; } catch (e) { /* */ } }
        used[ws.name] = 1;
        try { (ws.views || []).forEach(function (v) { if (v) v.rightToLeft = false; }); } catch (e) { /* */ }
        ws.eachRow({ includeEmpty: false }, function (row) {
          row.eachCell({ includeEmpty: false }, function (cell) {
            var v = cell.value;
            if (typeof v === 'string') { if (HASX.test(v)) cell.value = trPlain(v); }
            else if (v && v.richText) { v.richText.forEach(function (t) { if (t && typeof t.text === 'string' && HASX.test(t.text)) t.text = trPlain(t.text); }); cell.value = v; }
            else if (v && typeof v.text === 'string' && v.hyperlink) { if (HASX.test(v.text)) cell.value = { text: trPlain(v.text), hyperlink: v.hyperlink }; }
            try { if (cell.alignment && /right|left/.test(cell.alignment.horizontal || '')) { var al = Object.assign({}, cell.alignment); al.horizontal = al.horizontal === 'right' ? 'left' : 'right'; if (al.readingOrder) al.readingOrder = 'ltr'; cell.alignment = al; } } catch (e) { /* */ }
          });
        });
      });
      if (wb.title && HASX.test(wb.title)) wb.title = tr(wb.title);
    } catch (e) { /* */ }
  }
  // v5.3.5: الرسوم البيانية (Chart.js) تُرسم على canvas — نترجم التسميات والعناوين والتلميحات قبل الرسم
  function trAny(v) { if (typeof v === 'string') return HASX.test(v) ? tr(v) : v; if (Array.isArray(v)) return v.map(trAny); return v; }
  function trChart(ch) {
    try {
      var dt = ch.data || {};
      if (dt.labels) dt.labels = dt.labels.map(trAny);
      (dt.datasets || []).forEach(function (ds) { if (ds && typeof ds.label === 'string' && HASX.test(ds.label)) ds.label = tr(ds.label); });
      var o = ch.options || {}, pl = o.plugins || {};
      if (pl.title && pl.title.text) pl.title.text = trAny(pl.title.text);
      if (pl.subtitle && pl.subtitle.text) pl.subtitle.text = trAny(pl.subtitle.text);
      Object.keys(o.scales || {}).forEach(function (k) { var sc = o.scales[k]; if (sc && sc.title && sc.title.text) sc.title.text = trAny(sc.title.text); });
    } catch (e) { /* */ }
  }
  function patchChart() {
    try {
      var CH = window.Chart;
      if (CH && CH.register && !CH.__fcI18n) {
        CH.__fcI18n = 1;
        CH.register({ id: 'fcI18n',
          beforeInit: trChart, beforeUpdate: trChart,
          beforeTooltipDraw: function (ch, args) {
            try { var t = args.tooltip; if (t.title) t.title = t.title.map(trAny); (t.body || []).forEach(function (b) { b.lines = (b.lines || []).map(trAny); b.before = trAny(b.before || []); b.after = trAny(b.after || []); }); if (t.footer) t.footer = t.footer.map(trAny); if (t.beforeBody) t.beforeBody = t.beforeBody.map(trAny); if (t.afterBody) t.afterBody = t.afterBody.map(trAny); } catch (e) { /* */ }
          } });
        // تسميات المحاور التي تُولَّد عبر callback
        var tk = CH.Ticks && CH.Ticks.formatters; if (tk && tk.values && !tk.__fc) { var ov = tk.values; tk.values = function (v) { return trAny(ov.apply(this, arguments)); }; tk.__fc = 1; }
      }
    } catch (e) { /* */ }
  }
  function patchLibs() {
    patchChart();
    try {
      if (window.ExcelJS && window.ExcelJS.Workbook && !window.ExcelJS.__fcI18n) {
        var X = new window.ExcelJS.Workbook().xlsx, XP = Object.getPrototypeOf(X);
        if (XP && XP.writeBuffer) {
          var owb = XP.writeBuffer; XP.writeBuffer = function () { trBook(this.workbook || this._workbook); return owb.apply(this, arguments); };
          if (XP.write) { var owr = XP.write; XP.write = function () { trBook(this.workbook || this._workbook); return owr.apply(this, arguments); }; }
          window.ExcelJS.__fcI18n = 1;
        }
      }
    } catch (e) { /* */ }
    try {
      if (typeof window.saveAs === 'function' && !window.saveAs.__fcI18n) { var osa = window.saveAs; window.saveAs = function (b, n, o) { return osa.call(this, b, trFileName(n), o); }; window.saveAs.__fcI18n = 1; }
    } catch (e) { /* */ }
  }
  document.addEventListener('DOMContentLoaded', patchLibs); window.addEventListener('load', patchLibs);
  document.addEventListener('click', patchLibs, true);
  // روابط التنزيل المباشر <a download="...">
  document.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('a[download]'); if (a) { var dn = a.getAttribute('download'); if (dn && HASX.test(dn)) a.setAttribute('download', trFileName(dn)); } }, true);
  try { var oac = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { var dn = this.getAttribute && this.getAttribute('download'); if (dn && HASX.test(dn)) this.setAttribute('download', trFileName(dn)); return oac.apply(this, arguments); }; } catch (e) { /* */ }

  // تنسيق إضافي للاتجاه من اليسار لليمين
  var st = document.createElement('style');
  st.textContent = 'html[dir=ltr] .restaurant-dropdown{left:auto!important;right:0!important}html[dir=ltr] .biz-page-tools{left:auto;right:0}html[dir=ltr] .toggle-password-btn{left:auto;right:12px}html[dir=ltr] .pro-input-wrap .pro-icon{left:auto;right:14px}html[dir=ltr] .bell-n{left:auto;right:-6px}html[dir=ltr] .ops-go{left:auto;right:12px}html[dir=ltr] .plan-card .pc-tag{left:auto;right:16px}html[dir=ltr] .currency-dropdown{direction:ltr}html[dir=ltr] body{direction:ltr}html[dir=ltr] .sidebar-nav,html[dir=ltr] .modal-box{text-align:left}html[dir=ltr] .card-name,html[dir=ltr] .cart-heading h2{text-align:left}';
  document.head.appendChild(st);
})();
