// ============================================================
// Mataami Pro v5.3.3 — المظهر: مسائي (داكن — الافتراضي الحالي) / صباحي (فاتح بمعايير SaaS)
// - يُحفظ الاختيار على الجهاز (fcTheme) ويُطبَّق فوراً دون إعادة تحميل
// - الوضع الفاتح يُولَّد تلقائياً من ملفات التنسيق الحالية (نفس القواعد بألوان فاتحة)
//   لذلك أي تعديل مستقبلي في style.css / biz.css يُطبَّق على الوضعين تلقائياً
// - كل القواعد المولَّدة مقيدة بـ html[data-theme="light"] فلا تؤثر على الوضع المسائي إطلاقاً
// ============================================================
(function () {
  var KEY = 'fcTheme', PFX = 'html[data-theme="light"]';
  var root = document.documentElement;
  var theme = 'dark';
  try { theme = localStorage.getItem(KEY) === 'light' ? 'light' : 'dark'; } catch (e) { /* */ }
  root.setAttribute('data-theme', theme);

  // ---------- أدوات الألوان ----------
  var NAMED = { white: [255, 255, 255, 1], black: [0, 0, 0, 1], transparent: [0, 0, 0, 0] };
  function parse(c) {
    c = String(c).trim().toLowerCase();
    if (NAMED[c]) return NAMED[c].slice();
    var m = c.match(/^#([0-9a-f]{3,8})$/);
    if (m) {
      var x = m[1];
      if (x.length === 3 || x.length === 4) x = x.split('').map(function (k) { return k + k; }).join('');
      if (x.length !== 6 && x.length !== 8) return null;
      return [parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16), x.length === 8 ? parseInt(x.slice(6, 8), 16) / 255 : 1];
    }
    m = c.match(/^rgba?\(([^)]*)\)$/);
    if (m) {
      var p = m[1].replace(/\//g, ',').split(/[\s,]+/).filter(Boolean);
      if (p.length < 3) return null;
      var a = p.length > 3 ? (/%$/.test(p[3]) ? parseFloat(p[3]) / 100 : parseFloat(p[3])) : 1;
      return [parseFloat(p[0]), parseFloat(p[1]), parseFloat(p[2]), isNaN(a) ? 1 : a];
    }
    return null;
  }
  function hsl(c) {
    var r = c[0] / 255, g = c[1] / 255, b = c[2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, h = 0, s = 0;
    if (mx !== mn) {
      var d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60;
    }
    return [h, s, l];
  }
  function out(c) { var a = Math.round(c[3] * 1000) / 1000; return a >= 1 ? 'rgb(' + c[0] + ', ' + c[1] + ', ' + c[2] + ')' : 'rgba(' + c[0] + ', ' + c[1] + ', ' + c[2] + ', ' + a + ')'; }
  function fromHsl(h, s, l, a) {
    h = ((h % 360) + 360) % 360;
    var C = (1 - Math.abs(2 * l - 1)) * s, X = C * (1 - Math.abs((h / 60) % 2 - 1)), m = l - C / 2, r = 0, g = 0, b = 0;
    if (h < 60) { r = C; g = X; } else if (h < 120) { r = X; g = C; } else if (h < 180) { g = C; b = X; } else if (h < 240) { g = X; b = C; } else if (h < 300) { r = X; b = C; } else { r = C; b = X; }
    return out([Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255), a]);
  }
  function relLum(c) { var f = function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); }
  var INK = [15, 23, 42];               // نص داكن أساسي (slate-900)
  function ink(a) { return out([INK[0], INK[1], INK[2], a]); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // ctx: bg | text | border | shadow  ·  o: { overlay, coloredBg }
  function mapColor(str, ctx, o) {
    var c = parse(str); if (!c) return str;
    var a = c[3]; if (a === 0) return str;
    var H = hsl(c), s = H[1], l = H[2], neutral = s < 0.22 || (Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2])) < 28;
    o = o || {};
    if (ctx === 'bg') {
      if (neutral) {
        if (l > 0.85) return a < 0.6 ? ink(clamp(a * 0.9, 0.02, 0.08)) : str;      // طبقة بيضاء شفافة فوق الداكن ← ظل رمادي خفيف
        if (l < 0.36) {
          if (o.overlay && a < 0.99) return ink(0.45);                                   // خلفيات النوافذ المنبثقة
          if (a < 0.5) return ink(clamp(a * 0.25, 0.02, 0.08));                         // تعتيم خفيف
          var A = a >= 0.6 ? 1 : a;
          if (l < 0.075) return out([244, 246, 250, A]);                                 // خلفية الصفحة
          if (l < 0.15) return out([255, 255, 255, A]);                                  // البطاقات والأسطح
          return out([241, 245, 249, A]);                                                // الحقول والعناصر المرتفعة
        }
        return str;
      }
      if (l < 0.22) { if (o.overlay && a < 0.99) return ink(0.45); return fromHsl(H[0], clamp(s * 0.6, 0, 0.6), 0.955, a >= 0.6 ? 1 : a); }
      return str;
    }
    if (ctx === 'text') {
      if (o.coloredBg) return str;
      if (neutral || (s < 0.45 && l > 0.6)) return l > 0.55 ? fromHsl(H[0], Math.min(s, 0.22), clamp(1.08 - l, 0.12, 0.42), a) : str;
      if (l <= 0.3) return str;
      // v5.3.3: نص ملوّن بتباين لا يقل عن 4.5:1 على الخلفية البيضاء (WCAG AA)
      var L2 = Math.min(l, 0.46), sat = Math.min(1, s * 1.05), cand;
      for (var k = 0; k < 20; k++) { cand = fromHsl(H[0], sat, L2, 1); if (relLum(parse(cand)) <= 0.17) break; L2 -= 0.02; }
      return fromHsl(H[0], sat, L2, a);
    }
    if (ctx === 'border') {
      if (neutral) {
        if (l > 0.85) return a < 0.6 ? ink(clamp(a * 1.1, 0.07, 0.16)) : 'rgb(226, 232, 240)';
        if (l < 0.36) return a < 0.6 ? ink(0.1) : 'rgb(226, 232, 240)';
        return str;
      }
      if (l < 0.22) return fromHsl(H[0], clamp(s * 0.5, 0, 0.5), 0.86, 1);
      return str;
    }
    if (ctx === 'shadow') {
      if (neutral && l < 0.36) return out([INK[0], INK[1], INK[2], clamp(a * 0.3, 0.03, 0.14)]);
      if (neutral && l > 0.85) return out([255, 255, 255, 0]);
      return str;
    }
    return str;
  }
  var COLOR_SRC = '#[0-9a-fA-F]{3,8}\\b|rgba?\\([^)]*\\)|\\b(?:white|black)\\b';
  function mapValue(v, ctx, o) { return v.replace(new RegExp(COLOR_SRC, 'g'), function (m) { return mapColor(m, ctx, o); }); }
  function colorsIn(v) { return v.match(new RegExp(COLOR_SRC, 'g')) || []; }
  function ctxOf(prop) {
    if (prop === 'color' || prop === 'fill' || prop === 'caret-color' || prop === '-webkit-text-fill-color' || prop === 'text-decoration-color' || prop === 'stroke') return 'text';
    if (/^background/.test(prop)) return 'bg';
    if (/^(border|outline|column-rule)/.test(prop)) return 'border';
    if (prop === 'box-shadow' || prop === 'text-shadow') return 'shadow';
    return null;
  }
  // تقسيم آمن عند الفواصل خارج الأقواس
  function splitTop(s, ch) {
    var outA = [], d = 0, q = '', cur = '';
    for (var i = 0; i < s.length; i++) {
      var k = s[i];
      if (q) { if (k === q && s[i - 1] !== '\\') q = ''; cur += k; continue; }
      if (k === '"' || k === "'") { q = k; cur += k; continue; }
      if (k === '(' || k === '[') d++; else if (k === ')' || k === ']') d--;
      if (k === ch && d === 0) { outA.push(cur); cur = ''; } else cur += k;
    }
    if (cur.trim()) outA.push(cur);
    return outA;
  }
  function prefixSel(sel) {
    return splitTop(sel, ',').map(function (x) {
      x = x.trim(); if (!x) return x;
      if (/^html(?![\w-])/.test(x)) return PFX + x.slice(4);
      if (/^:root(?![\w-])/.test(x)) return ':root[data-theme="light"]' + x.slice(5);
      return PFX + ' ' + x;
    }).join(',');
  }
  var OVERLAY_RE = /overlay|backdrop|scrim|lightbox|#loading\b|-mask\b/i;
  function convRule(r) {
    var st = r.style, txt = st && st.cssText; if (!txt) return '';
    if (!colorsIn(txt).length && !/var\(/.test(txt)) return '';
    var sel = r.selectorText;
    // v5.3.3: «طبقة تعتيم» فقط إذا كان العنصر المستهدف نفسه هو الطبقة (وليس صندوق النافذة داخلها مثل .modal-overlay .modal-box)
    var overlay = splitTop(sel, ',').some(function (x) { var last = x.trim().split(/\s*[\s>+~]\s*/).pop() || ''; return OVERLAY_RE.test(last) && !/login-overlay/.test(last); });
    var decls = splitTop(txt, ';').map(function (d) { var i = d.indexOf(':'); return i < 0 ? null : [d.slice(0, i).trim().toLowerCase(), d.slice(i + 1).trim()]; }).filter(Boolean);
    // هل للقاعدة خلفية ملونة (زر ذهبي، أحمر...)؟ نحافظ على لون نصها
    var colored = decls.some(function (d) {
      if (!/^background(-color|-image)?$/.test(d[0])) return false;
      return colorsIn(d[1]).some(function (c) { var p = parse(c); if (!p || p[3] < 0.5) return false; var H = hsl(p); return H[1] > 0.3 && H[2] > 0.22 && H[2] < 0.8; });
    });
    var res = [];
    decls.forEach(function (d) {
      var p = d[0], v = d[1]; if (p.indexOf('--') === 0) return;
      var ctx = ctxOf(p); if (!ctx) return;
      var imp = /!important\s*$/i.test(v); v = v.replace(/\s*!important\s*$/i, '');
      var nv = mapValue(v, ctx, { overlay: overlay, coloredBg: colored });
      // v5.3.3: ألوان ديناميكية عبر متغير محلي (مثل --c) — نسخة أغمق للنص على الخلفية الفاتحة
      if (ctx === 'text' && !colored && /^var\(--(?!text|accent|primary|bg|border|nyala|f-)[\w-]+\)$/.test(nv.trim())) nv = 'color-mix(in srgb, ' + nv.trim() + ' 62%, #0f172a)';
      res.push(p + ':' + nv + (imp ? ' !important' : ''));
    });
    if (!res.length) return '';
    return prefixSel(sel) + '{' + res.join(';') + '}\n';
  }
  function convRules(list) {
    var o = '';
    for (var i = 0; i < list.length; i++) {
      var r = list[i];
      try {
        if (r.type === 1) o += convRule(r);
        else if (r.type === 4) { var inner = convRules(r.cssRules); if (inner) o += '@media ' + r.conditionText + '{' + inner + '}\n'; }
        else if (r.type === 12) { var in2 = convRules(r.cssRules); if (in2) o += '@supports ' + r.conditionText + '{' + in2 + '}\n'; }
      } catch (e) { /* قاعدة غير قابلة للقراءة */ }
    }
    return o;
  }
  function convSheet(sh) { try { return convRules(sh.cssRules || []); } catch (e) { return ''; } }

  // ---------- التطبيق ----------
  var done = typeof WeakSet === 'function' ? new WeakSet() : null, built = false, gen = null, dyn = null;
  function own(n) { return n && (n.id === 'fcThemeStatic' || n.id === 'fcThemeGen' || n.id === 'fcThemeDyn' || n.id === 'fcThemeFine' || (n.hasAttribute && n.hasAttribute('data-theme-skip'))); }
  var _stOk = null;
  function staticOk() {
    if (_stOk) return true;
    var l = document.getElementById('fcThemeStatic');
    try { _stOk = !!(l && l.sheet && l.sheet.cssRules && l.sheet.cssRules.length > 20); } catch (e) { _stOk = true; /* ملف من نطاق آخر: محمّل ويُطبَّق */ }
    return _stOk;
  }
  function eligible(n) {
    if (!n || own(n)) return false;
    if (n.tagName === 'STYLE') return true;
    // v5.3.3: ملفات التنسيق الأساسية لها نسخة صباحية جاهزة (css/theme-light-gen.css) — لا داعي لتحويلها مرة أخرى
    if (n.tagName === 'LINK' && staticOk() && /css\/(style|biz|mobile46)\.css/.test(n.getAttribute('href') || '')) return false;
    if (n.tagName === 'LINK' && /stylesheet/i.test(n.rel || '')) { try { return new URL(n.href, location.href).origin === location.origin; } catch (e) { return false; } }
    return false;
  }
  function buildAll() {
    var css = '', nodes = document.querySelectorAll('link[rel~="stylesheet"],style');
    for (var i = 0; i < nodes.length; i++) { var n = nodes[i]; if (!eligible(n) || (done && done.has(n)) || !n.sheet) continue; if (done) done.add(n); css += convSheet(n.sheet); }
    return css;
  }
  function ensure() {
    if (theme !== 'light') return;
    if (!built) {
      built = true;
      gen = document.createElement('style'); gen.id = 'fcThemeGen';
      gen.textContent = buildAll();
      var fine = document.getElementById('fcThemeFine');
      if (fine && fine.parentNode) fine.parentNode.insertBefore(gen, fine); else (document.head || root).appendChild(gen);
    } else {
      var more = buildAll();
      if (more) { if (!dyn) { dyn = document.createElement('style'); dyn.id = 'fcThemeDyn'; var fine2 = document.getElementById('fcThemeFine'); if (fine2 && fine2.parentNode) fine2.parentNode.insertBefore(dyn, fine2); else (document.head || root).appendChild(dyn); } dyn.textContent += more; }
    }
  }
  // ---------- v5.3.3: الألوان المكتوبة مباشرة داخل العناصر (style="...") ----------
  // تُحوَّل عند ظهور العنصر في الوضع الصباحي، ويُحفظ الأصل في data-fc-st لاستعادته عند العودة للمسائي
  var ORIG = 'data-fc-st', SKIP_IN = 'svg,canvas,img,video,iframe,[data-theme-skip],.fc-theme-opt';
  function satBg(c) { if (!c || c[3] < 0.5) return false; var H = hsl(c); return H[1] > 0.3 && H[2] > 0.2 && H[2] < 0.8; }
  function effBgColored(el) {
    for (var e = el, i = 0; e && e.nodeType === 1 && i < 12; e = e.parentElement, i++) {
      var cs = getComputedStyle(e), c = parse(cs.backgroundColor);
      if (cs.backgroundImage && cs.backgroundImage !== 'none' && /gradient/.test(cs.backgroundImage)) { var g = colorsIn(cs.backgroundImage)[0]; var gc = g && parse(g); if (gc && gc[3] >= 0.5) return satBg(gc) || hsl(gc)[2] < 0.3; }
      if (c && c[3] >= 0.5) return satBg(c) || hsl(c)[2] < 0.3;
    }
    return false;
  }
  function convInline(st, el) {
    var decls = splitTop(st, ';').map(function (d) { var i = d.indexOf(':'); return i < 0 ? null : [d.slice(0, i).trim().toLowerCase(), d.slice(i + 1).trim()]; }).filter(Boolean);
    var colored = decls.some(function (d) { return /^background(-color|-image)?$/.test(d[0]) && colorsIn(d[1]).some(function (c) { return satBg(parse(c)); }); });
    var fixedLayer = /position\s*:\s*fixed/i.test(st) && /inset\s*:\s*0|top\s*:\s*0/i.test(st);
    var overlay = fixedLayer || OVERLAY_RE.test((typeof el.className === 'string' ? el.className : '') + ' ' + (el.id || ''));
    var changed = false;
    var outS = decls.map(function (d) {
      var p = d[0], v = d[1], ctx = p.indexOf('--') === 0 ? null : ctxOf(p);
      if (!ctx || !colorsIn(v).length) return p + ':' + v;
      var imp = /!important\s*$/i.test(v); v = v.replace(/\s*!important\s*$/i, '');
      var cb = colored;
      if (ctx === 'text' && !cb) { var tc = parse(colorsIn(v)[0] || ''); if (tc && hsl(tc)[2] > 0.8) cb = effBgColored(el); }
      var nv = mapValue(v, ctx, { overlay: overlay, coloredBg: cb });
      if (nv !== v) changed = true;
      return p + ':' + nv + (imp ? ' !important' : '');
    }).join(';');
    return changed ? outS : st;
  }
  function fixEl(el) {
    var st = el.getAttribute('style'); if (!st || el.__fcConv === st) return;
    if (!colorsIn(st).length || (el.closest && el.closest(SKIP_IN))) return;
    var c = convInline(st, el); if (c === st) return;
    el.setAttribute(ORIG, st); el.__fcConv = c; el.setAttribute('style', c);
  }
  function fixTree(n) {
    if (!n || n.nodeType !== 1 || theme !== 'light') return;
    if (n.hasAttribute('style')) fixEl(n);
    var list = n.querySelectorAll ? n.querySelectorAll('[style]') : [];
    for (var i = 0; i < list.length; i++) fixEl(list[i]);
  }
  function restoreInline() {
    var list = document.querySelectorAll('[' + ORIG + ']');
    for (var i = 0; i < list.length; i++) { var el = list[i]; if (el.getAttribute('style') === el.__fcConv) el.setAttribute('style', el.getAttribute(ORIG)); el.removeAttribute(ORIG); el.__fcConv = null; }
  }
  var inlineQ = [], inlineT = 0;
  function queueInline(n) { inlineQ.push(n); if (!inlineT) inlineT = setTimeout(function () { inlineT = 0; var q = inlineQ; inlineQ = []; for (var i = 0; i < q.length; i++) { try { if (q[i].isConnected !== false) fixTree(q[i]); } catch (e) { /* */ } } }, 0); }

  function chartFix() {
    try {
      if (typeof Chart === 'undefined' || !Chart.defaults || Chart.defaults.__fcTheme) return;
      var D = Chart.defaults, cv = D.color, bc = D.borderColor;
      Object.defineProperty(D, 'color', { configurable: true, get: function () { return theme === 'light' && /^#(aab7d4|f|e|d|c)/i.test(String(cv)) ? '#475569' : cv; }, set: function (v) { cv = v; } });
      Object.defineProperty(D, 'borderColor', { configurable: true, get: function () { return theme === 'light' ? 'rgba(15,23,42,0.08)' : bc; }, set: function (v) { bc = v; } });
      D.__fcTheme = true;
    } catch (e) { /* */ }
  }
  function meta() {
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) { if (!m.getAttribute('data-dark')) m.setAttribute('data-dark', m.getAttribute('content') || '#b48554'); m.setAttribute('content', theme === 'light' ? '#ffffff' : m.getAttribute('data-dark')); }
  }
  var api = window.fcTheme = {
    get: function () { return theme; },
    set: function (t) {
      theme = t === 'light' ? 'light' : 'dark';
      try { localStorage.setItem(KEY, theme); } catch (e) { /* */ }
      root.setAttribute('data-theme', theme); ensure(); meta(); chartFix();
      if (theme === 'light') fixTree(document.body); else restoreInline();
      // إعادة رسم الرسوم البيانية المفتوحة بالألوان الجديدة
      try { if (typeof Chart !== 'undefined' && Chart.instances) Object.keys(Chart.instances).forEach(function (k) { var ch = Chart.instances[k]; if (ch && ch.update) ch.update('none'); }); } catch (e) { /* */ }
      try { document.dispatchEvent(new CustomEvent('fc-theme', { detail: theme })); } catch (e) { /* */ }
    },
    toggle: function () { api.set(theme === 'light' ? 'dark' : 'light'); },
    convert: function (sheet) { return convSheet(sheet); }, mapColor: mapColor
  };
  // تحويل فوري للملفات المحمّلة قبل هذا السكربت (يمنع وميض الوضع الداكن)
  ensure();
  function late() {
    ensure(); meta(); chartFix();
    // أنماط تُضاف لاحقاً من السكربتات (المساعد الذكي، أوقات الدوام...)
    try {
      new MutationObserver(function (list) {
        if (theme !== 'light') return;
        var css = false;
        for (var i = 0; i < list.length; i++) {
          var m = list[i];
          if (m.type === 'attributes') { if (m.target.nodeType === 1 && m.target.getAttribute('style') !== m.target.__fcConv) queueInline(m.target); continue; }
          for (var j = 0; j < m.addedNodes.length; j++) {
            var n = m.addedNodes[j]; if (n.nodeType !== 1) continue;
            if (!own(n) && (n.tagName === 'STYLE' || n.tagName === 'LINK' || (n.querySelector && n.querySelector('style')))) css = true;
            queueInline(n);
          }
        }
        if (css) setTimeout(ensure, 0);
      }).observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
      if (theme === 'light' && document.body) fixTree(document.body);
    } catch (e) { /* */ }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', late); else late();
  window.addEventListener('load', function () { ensure(); chartFix(); });
  // مزامنة بين التبويبات
  window.addEventListener('storage', function (e) { if (e.key === KEY && e.newValue && e.newValue !== theme) api.set(e.newValue); });
})();
