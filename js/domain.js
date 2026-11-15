// v4.3 — الدومين الخاص: عند فتح النظام من دومين مطعم يُوجَّه تلقائياً لمينيو/تطبيق ذلك المطعم
(function () {
  try {
    var host = location.hostname.toLowerCase().replace(/^www\./, '');
    var known = (typeof APP_HOSTS !== 'undefined' ? APP_HOSTS : []).map(function (x) { return String(x).toLowerCase().replace(/^www\./, ''); });
    if (!host || known.indexOf(host) >= 0 || /^(\d+\.){3}\d+$/.test(host)) return;
    var q = new URLSearchParams(location.search);
    if (q.get('r') || q.get('restaurant') || q.get('nodomain')) return;
    var page = location.pathname.split('/').pop() || '';
    if (page && !/^(index|menu|app)\.html$/.test(page)) return;
    var cacheKey = 'fcDomain_' + host, cached = null;
    try { cached = JSON.parse(sessionStorage.getItem(cacheKey) || 'null'); } catch (e) { cached = null; }
    var go = function (r) {
      var tgt = page === 'menu.html' ? 'menu.html' : page === 'app.html' ? 'app.html' : (r.target === 'app' ? 'app.html' : 'menu.html');
      location.replace(tgt + '?r=' + encodeURIComponent(r.r) + (location.hash || ''));
    };
    if (cached && cached.r) { go(cached); return; }
    document.documentElement.style.visibility = 'hidden';
    var show = function () { document.documentElement.style.visibility = ''; };
    setTimeout(show, 4000);
    fetch(COST_API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify({ fn: 'resolveDomain', host: host }) })
      .then(function (x) { return x.json(); })
      .then(function (r) { if (r && r.success && r.r) { try { sessionStorage.setItem(cacheKey, JSON.stringify(r)); } catch (e) { /* */ } go(r); } else show(); })
      .catch(show);
  } catch (e) { /* */ }
})();
