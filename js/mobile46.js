/* Mataami Pro v4.6 — تحويل جداول التكلفة إلى بطاقات على الجوال + إصلاح القائمة الجانبية */
(function () {
  var TARGETS = { recipesBody: 1, materialsBody: 1 };
  function label(tbody) {
    var table = tbody.closest('table'); if (!table) return;
    table.classList.add('m-cards');
    var heads = [].map.call(table.querySelectorAll('thead th'), function (th) { return th.textContent.trim(); });
    [].forEach.call(tbody.rows, function (tr) {
      [].forEach.call(tr.cells, function (td, i) {
        if (td.colSpan > 1) return;
        var hd = heads[i] || '';
        td.setAttribute('data-label', hd);
        if (hd === '#') td.classList.add('m-idx');
        else if (i === 1) td.classList.add('m-title');
        else if (/الإجراءات|إجراءات/.test(hd) || (i === tr.cells.length - 1 && td.querySelector('button'))) td.classList.add('m-actions');
      });
    });
  }
  function watch() {
    Object.keys(TARGETS).forEach(function (id) {
      var tb = document.getElementById(id); if (!tb || tb._m46) return; tb._m46 = 1;
      label(tb);
      new MutationObserver(function () { label(tb); }).observe(tb, { childList: true });
    });
  }
  function syncMenu() {
    var sb = document.getElementById('appSidebar');
    document.body.classList.toggle('menu-open', !!(sb && sb.classList.contains('open')));
  }
  document.addEventListener('DOMContentLoaded', function () {
    watch();
    var sb = document.getElementById('appSidebar');
    if (sb) new MutationObserver(syncMenu).observe(sb, { attributes: true, attributeFilter: ['class'] });
  });
  if (document.readyState !== 'loading') watch();
})();
