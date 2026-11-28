/* مطعمي برو V5.4.4 — تفريغ الشعار تلقائياً من الخلفية الموحّدة (سوداء/بيضاء) في شاشات العميل والكشك والمنيو */
(function () {
  var SEL = '#logo,#logo2,#wLogo,#cats .brand img,#restLogo,.v5top img,img[data-fc-logo]';
  var cache = {};
  function near(a, b, t) { return Math.abs(a[0] - b[0]) <= t && Math.abs(a[1] - b[1]) <= t && Math.abs(a[2] - b[2]) <= t; }
  function process(src) {
    if (cache[src]) return cache[src];
    cache[src] = new Promise(function (res) {
      if (!src || /^data:image\/svg|\.svg(\?|$)/i.test(src)) return res(null);
      var im = new Image(); im.crossOrigin = 'anonymous';
      im.onerror = function () { res(null); };
      im.onload = function () {
        try {
          var W = im.naturalWidth, H = im.naturalHeight; if (!W || !H) return res(null);
          var k = Math.min(1, 600 / Math.max(W, H)); W = Math.round(W * k); H = Math.round(H * k);
          var c = document.createElement('canvas'); c.width = W; c.height = H;
          var g = c.getContext('2d'); g.drawImage(im, 0, 0, W, H);
          var d = g.getImageData(0, 0, W, H), p = d.data;
          var px = function (i) { return [p[i * 4], p[i * 4 + 1], p[i * 4 + 2], p[i * 4 + 3]]; };
          var cs = [px(0), px(W - 1), px((H - 1) * W), px(H * W - 1)];
          // إذا كانت الزوايا شفافة أصلاً فلا داعي للمعالجة
          if (cs.every(function (q) { return q[3] < 30; })) return res(null);
          var ref = cs[0];
          if (!cs.every(function (q) { return q[3] > 200 && near(q, ref, 40); })) return res(null);
          var T = 46, seen = new Uint8Array(W * H), st = [], n = 0;
          for (var x = 0; x < W; x++) { st.push(x, (H - 1) * W + x); }
          for (var y = 0; y < H; y++) { st.push(y * W, y * W + W - 1); }
          while (st.length) {
            var q = st.pop(); if (seen[q]) continue; seen[q] = 1;
            var o = q * 4; if (p[o + 3] < 10) continue;
            if (!near([p[o], p[o + 1], p[o + 2]], ref, T)) continue;
            p[o + 3] = 0; n++;
            var xx = q % W, yy = (q - xx) / W;
            if (xx > 0) st.push(q - 1); if (xx < W - 1) st.push(q + 1); if (yy > 0) st.push(q - W); if (yy < H - 1) st.push(q + W);
          }
          if (n < W * H * 0.03) return res(null);
          g.putImageData(d, 0, 0); res(c.toDataURL('image/png'));
        } catch (e) { res(null); }
      };
      im.src = src;
    });
    return cache[src];
  }
  // v5.4.3: لا وميض — الصورة تبقى مخفية حتى تنتهي المعالجة، والنتيجة المحفوظة تُطبَّق فوراً
  var done = {};
  function clean(img) {
    if (!img || !img.src || img.dataset.fcClean === img.src || /^data:image\/png/.test(img.src) && img.dataset.fcClean) return;
    var src = img.src; img.style.background = 'transparent';
    if (src in done) { img.dataset.fcClean = done[src] || src; if (done[src]) img.src = done[src]; return; }
    img.dataset.fcClean = src; img.style.visibility = 'hidden';
    process(src).then(function (u) {
      done[src] = u || '';
      if (img.src === src) { if (u) { img.dataset.fcClean = u; img.src = u; } }
      img.style.visibility = '';
    });
  }
  function scan() { document.querySelectorAll(SEL).forEach(function (i) { if (i.complete || i.src) clean(i); }); }
  window.fcCleanLogo = clean;
  var t; var mo = new MutationObserver(function () { clearTimeout(t); t = setTimeout(scan, 60); });
  function start() { scan(); mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['src'] }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
