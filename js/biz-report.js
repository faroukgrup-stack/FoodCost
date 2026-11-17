// ============================================================
// biz-report.js — محرك التقارير الاحترافية: غلاف + رسوم بيانية + جداول
// طباعة A4 / Word / Excel، وطباعة أي صفحة أو نافذة كشف من النظام
// FoodCost 4.0
// ============================================================
const RPT_INNER_CSS =
  '.dhead{display:table;width:100%;border-bottom:2px solid #b48554;padding-bottom:6px;margin-bottom:10px}.dhead>div{display:table-cell;vertical-align:middle}.dhead .l{text-align:left;color:#666;font-size:10.5px}.dhead img{max-height:40px;vertical-align:middle;margin-left:8px}.dhead b{font-size:15px;color:#1f2937}' +
  'h1.dt{font-size:20px;color:#b48554;margin:6px 0 2px;text-align:right}.dsub{color:#666;font-size:11px;margin-bottom:10px}' +
  'h2.st{font-size:14.5px;color:#8a6430;border-right:4px solid #b48554;padding:4px 10px 4px 0;margin:18px 0 8px;page-break-after:avoid;background:#fbf6ef}' +
  'table.kp{width:100%;border-collapse:separate;border-spacing:6px;margin:2px 0 8px}table.kp td{border:1px solid #e8dccb;background:#fdfaf5;padding:8px 6px;text-align:center;width:25%;vertical-align:middle}' +
  'table.kp .v{font-size:15px;font-weight:bold;color:#1f2937;display:block}table.kp .k{font-size:10.5px;color:#7a6a55;display:block}table.kp .s{font-size:9.5px;color:#888;display:block}' +
  'table.t{width:100%;border-collapse:collapse;margin:4px 0 12px;font-size:10.8px}table.t th{background:#b48554;color:#fff;padding:6px 5px;font-weight:bold;text-align:right;border:1px solid #a87a4a}' +
  'table.t td{padding:5px;border:1px solid #e5e7eb;text-align:right;vertical-align:top;color:#1f2937}table.t tr:nth-child(even) td{background:#faf7f2}table.t .n{text-align:left;white-space:nowrap}' +
  'table.t tfoot td{font-weight:bold;background:#f3eadc;border-top:2px solid #b48554}table.t tr{page-break-inside:avoid}' +
  '.chart{text-align:center;margin:8px 0 12px;page-break-inside:avoid}.chart img{max-width:100%;max-height:88mm;border:1px solid #eee}' +
  '.note{color:#666;font-size:10.5px;margin:2px 0 8px}.pb{page-break-before:always}.badge{display:inline-block;padding:1px 7px;border:1px solid #d6c3a5;border-radius:8px;font-size:9.5px;color:#5b4a33}' +
  '.dfoot{margin-top:18px;border-top:1px solid #ddd;padding-top:6px;color:#999;font-size:9.5px;text-align:center}.sign{width:100%;margin-top:30px}.sign td{text-align:center;color:#555;padding-top:24px;border-top:1px dotted #aaa;width:33%}' +
  '.biz-card{border:1px solid #eee;padding:8px;margin:8px 0;page-break-inside:avoid}.biz-card h4{margin:0 0 6px;color:#8a6430;font-size:13px}.empty-state{color:#888;text-align:center;padding:10px}.muted{color:#666}';
const RPT_CSS = '@page{size:A4;margin:12mm}*{box-sizing:border-box}body{font-family:Tahoma,"Segoe UI",Arial,sans-serif;color:#1f2937;margin:0;font-size:11.5px;line-height:1.55;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
  '.cover{page-break-after:always;text-align:center;padding:26mm 12mm 0;height:268mm;border:1.5px solid #b48554;position:relative;background:#fffdf9}' +
  '.cover .logo img{max-height:90px;max-width:220px}.cover .rname{font-size:26px;font-weight:bold;color:#1f2937;margin:16px 0 4px}.cover .rsub{color:#777;font-size:13px}' +
  '.cover .bar{width:70mm;height:3px;background:#b48554;margin:16px auto}.cover .title{font-size:32px;font-weight:bold;color:#b48554;margin:34mm 0 8px}.cover .csub{font-size:14px;color:#555}' +
  '.cover table.meta{margin:28mm auto 0;border-collapse:collapse;font-size:12.5px;min-width:120mm}.cover table.meta td{padding:7px 14px;border-bottom:1px solid #eadfce;text-align:right}.cover table.meta td:first-child{color:#8a6430;font-weight:bold;width:40%}' +
  '.cover .brand{position:absolute;bottom:10mm;left:0;right:0;font-size:10px;color:#999}' + RPT_INNER_CSS;

function rptBrand() {
  const biz = (B.acc && B.acc.biz) || {}, bs = biz.business || {}, tx = biz.tax || {};
  const br = B.acc && (B.acc.branches || []).find(function (b) { return b.id === B.branch; });
  const nm = (document.getElementById('restaurantNameText') || {}).textContent;
  return { name: bs.legalName || (B.acc && B.acc.restaurantName) || nm || 'المطعم', logo: bs.logo || '', branch: br && (B.acc.branches || []).length > 1 ? br.name : '',
    taxNo: tx.enabled && tx.number ? tx.number : '', cr: bs.crNumber || '', phone: (br && br.phone) || bs.phone || '', address: (br && br.address) || bs.address || '' };
}
function rptNow() { return new Date().toLocaleString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
function rptPeriod(f) { if (!f || !f.from) return ''; return 'من ' + dOnly(f.from) + ' إلى ' + dOnly(f.to || f.from); }
function rptActor() { return B.acc ? (B.acc.isOwner ? (B.acc.ownerName || 'صاحب الحساب') : (B.acc.staff && B.acc.staff.name) || '') : ''; }

// ---------- عناصر التقرير ----------
function rptKpis(list) {
  if (!list || !list.length) return '';
  let out = '<table class="kp"><tbody>';
  for (let i = 0; i < list.length; i += 4) {
    out += '<tr>' + list.slice(i, i + 4).map(function (k) { return '<td><span class="k">' + h(k[0]) + '</span><span class="v">' + (k[1] === undefined ? '' : k[1]) + '</span>' + (k[2] ? '<span class="s">' + k[2] + '</span>' : '') + '</td>'; }).join('') +
      (list.slice(i, i + 4).length < 4 && list.length > 4 ? '<td style="border:none;background:none"></td>'.repeat(4 - list.slice(i, i + 4).length) : '') + '</tr>';
  }
  return out + '</tbody></table>';
}
// t = { headers:[], rows:[[...]], money:[idx], qty:[idx], pct:[idx], foot:[...]|'sum' }
function rptFmt(t, i, v) {
  if (v === null || v === undefined || v === '') return '';
  if ((t.money || []).indexOf(i) >= 0) return money(v);
  if ((t.pct || []).indexOf(i) >= 0) return nf(v, 1) + '%';
  if ((t.qty || []).indexOf(i) >= 0) return nf(v, +v % 1 ? 2 : 0);
  if (typeof v === 'number') return nf(v, v % 1 ? 2 : 0);
  return h(v);
}
function rptFoot(t) {
  if (t.foot === 'sum') return t.headers.map(function (x, i) { if (i === 0) return 'الإجمالي'; return (t.money || []).indexOf(i) >= 0 || (t.qty || []).indexOf(i) >= 0 ? t.rows.reduce(function (s, r) { return s + (parseFloat(r[i]) || 0); }, 0) : ''; });
  return t.foot || null;
}
function rptTable(t) {
  if (!t || !t.rows || !t.rows.length) return '<p class="note">' + h((t && t.empty) || 'لا توجد بيانات في هذه الفترة') + '</p>';
  const isN = function (i) { return (t.money || []).concat(t.qty || [], t.pct || [], t.num || []).indexOf(i) >= 0; };
  const foot = rptFoot(t);
  return '<table class="t"><thead><tr>' + t.headers.map(function (x, i) { return '<th' + (isN(i) ? ' class="n"' : '') + '>' + h(x) + '</th>'; }).join('') + '</tr></thead><tbody>' +
    t.rows.map(function (r) { return '<tr>' + r.map(function (v, i) { return '<td' + (isN(i) ? ' class="n"' : '') + '>' + rptFmt(t, i, v) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody>' +
    (foot ? '<tfoot><tr>' + foot.map(function (v, i) { return '<td' + (isN(i) ? ' class="n"' : '') + '>' + (i === 0 ? h(v) : rptFmt(t, i, v)) + '</td>'; }).join('') + '</tr></tfoot>' : '') + '</table>';
}
function rptSection(s) {
  return (s.pb ? '<div class="pb"></div>' : '') + (s.title ? '<h2 class="st">' + h(s.title) + '</h2>' : '') + (s.intro ? '<p class="note">' + h(s.intro) + '</p>' : '') +
    rptKpis(s.kpis) + (s.chartTop && s.chart ? '<div class="chart"><img src="' + s.chart + '"></div>' : '') + (s.table ? rptTable(s.table) : '') + (s.html || '') +
    (!s.chartTop && s.chart ? '<div class="chart"><img src="' + s.chart + '"></div>' : '');
}
function rptCover(o, b) {
  const meta = [['المنشأة', h(b.name)]].concat(b.branch ? [['الفرع', h(b.branch)]] : [], o.period ? [['الفترة', h(o.period)]] : [], [['تاريخ الإصدار', h(rptNow())]], rptActor() ? [['أعدّه', h(rptActor())]] : [], b.taxNo ? [['الرقم الضريبي', h(b.taxNo)]] : [], b.cr ? [['السجل التجاري', h(b.cr)]] : []);
  return '<div class="cover">' + (b.logo ? '<div class="logo"><img src="' + h(b.logo) + '"></div>' : '') + '<div class="rname">' + h(b.name) + '</div>' + (b.address || b.phone ? '<div class="rsub">' + h([b.address, b.phone].filter(Boolean).join(' · ')) + '</div>' : '') +
    '<div class="title">' + h(o.title) + '</div>' + (o.subtitle ? '<div class="csub">' + h(o.subtitle) + '</div>' : '') + '<div class="bar"></div>' +
    '<table class="meta">' + meta.map(function (m) { return '<tr><td>' + m[0] + '</td><td>' + m[1] + '</td></tr>'; }).join('') + '</table>' +
    '<div class="brand">تقرير صادر من منصة Mataami Pro | مطعمي برو · ' + h(b.name) + '</div></div>';
}
function rptHead(b) {
  return '<div class="dhead"><div>' + (b.logo ? '<img src="' + h(b.logo) + '">' : '') + '<b>' + h(b.name) + '</b>' + (b.branch ? ' <span class="muted">· ' + h(b.branch) + '</span>' : '') + '</div><div class="l">' + h(rptNow()) + '</div></div>';
}
// o = { title, subtitle, period, cover, kpis, sections, bodyHtml, signature }
function rptDocHtml(o) {
  const b = rptBrand();
  const body = (o.cover ? rptCover(o, b) : '') + rptHead(b) + '<h1 class="dt">' + h(o.title) + '</h1>' +
    ((o.subtitle && !o.cover) || o.period ? '<div class="dsub">' + h([o.cover ? '' : o.subtitle, o.period ? 'الفترة: ' + o.period : ''].filter(Boolean).join(' · ')) + '</div>' : '') +
    rptKpis(o.kpis) + (o.sections || []).map(rptSection).join('') + (o.bodyHtml || '') +
    (o.signature ? '<table class="sign"><tr><td>المحاسب</td><td>المدير</td><td>الختم</td></tr></table>' : '') +
    '<div class="dfoot">' + h(b.name) + ' · ' + h(o.title) + ' · طُبع في ' + h(rptNow()) + ' · Mataami Pro</div>';
  return '<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>' + h(o.title) + '</title><style>' + RPT_CSS + '</style></head><body>' + body + '</body></html>';
}
function rptFileName(o, ext) { return (o.file || o.title || 'تقرير').replace(/[\\/:*?"<>|]/g, '-') + '_' + isoLocal() + '.' + ext; }

function rptPrint(o) {
  const w = window.open('', '_blank', 'width=900,height=900');
  if (!w) { showToast('اسمح بالنوافذ المنبثقة للطباعة', true); return; }
  w.document.write(rptDocHtml(o).replace('</body>', '<script>window.onload=function(){var im=[].slice.call(document.images),n=0;function go(){setTimeout(function(){window.print();},300);}if(!im.length)return go();im.forEach(function(i){if(i.complete){if(++n===im.length)go();}else{i.onload=i.onerror=function(){if(++n===im.length)go();};}});};<\/script></body>'));
  w.document.close();
}
function rptWord(o) {
  const html = rptDocHtml(o).replace('<html dir="rtl" lang="ar">', '<html dir="rtl" lang="ar" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">');
  const blob = new Blob(['\uFEFF' + html], { type: 'application/msword' });
  if (typeof saveAs === 'function') saveAs(blob, rptFileName(o, 'doc'));
  else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = rptFileName(o, 'doc'); a.click(); }
  showToast('تم تصدير ملف Word');
}

// ---------- Excel ----------
function rptSheetName(wb, name) {
  let base = String(name || 'ورقة').replace(/[\[\]:*?\/\\]/g, ' ').slice(0, 28).trim() || 'ورقة', n = base, i = 2;
  while (wb.getWorksheet(n)) n = base.slice(0, 25) + ' ' + (i++);
  return n;
}
const RPT_X = { gold: 'FFB48554', soft: 'FFFBF6EF', line: 'FFE5D5BD' };
function rptXBorder(c) { c.border = { top: { style: 'thin', color: { argb: RPT_X.line } }, bottom: { style: 'thin', color: { argb: RPT_X.line } }, left: { style: 'thin', color: { argb: RPT_X.line } }, right: { style: 'thin', color: { argb: RPT_X.line } } }; }
function rptXSetup(ws, landscape) {
  ws.pageSetup = { paperSize: 9, orientation: landscape ? 'landscape' : 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 } };
  ws.headerFooter = { oddFooter: '&C&8' + rptBrand().name + ' — صفحة &P من &N' };
}
function rptXTitle(ws, cols, title, sub) {
  ws.mergeCells(1, 1, 1, cols); const c = ws.getCell(1, 1); c.value = title; c.font = { bold: true, size: 15, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: RPT_X.gold } }; c.alignment = { horizontal: 'center', vertical: 'middle' }; ws.getRow(1).height = 28;
  ws.mergeCells(2, 1, 2, cols); const s = ws.getCell(2, 1); s.value = sub || ''; s.font = { size: 10, color: { argb: 'FF666666' } }; s.alignment = { horizontal: 'center' };
}
function rptXKpis(ws, kpis, cols) {
  if (!kpis || !kpis.length) return;
  kpis.forEach(function (k, i) {
    if (i % 2 === 0) ws.addRow([]);
    const r = ws.lastRow, base = (i % 2) * 2 + 1;
    const a = r.getCell(base), b = r.getCell(base + 1);
    a.value = k[0]; b.value = rptPlain(k[1]); a.font = { bold: true, color: { argb: 'FF8A6430' } }; a.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: RPT_X.soft } };
    b.font = { bold: true }; rptXBorder(a); rptXBorder(b); b.alignment = { horizontal: 'center' };
  });
  ws.addRow([]);
}
function rptPlain(v) { const d = document.createElement('div'); d.innerHTML = String(v === undefined || v === null ? '' : v); return d.textContent; }
async function rptXImage(wb, ws, dataUrl, row, w, hgt) {
  if (!dataUrl || dataUrl.indexOf('data:image') !== 0) return 0;
  const id = wb.addImage({ base64: dataUrl.split(',')[1], extension: 'png' });
  ws.addImage(id, { tl: { col: 0, row: row }, ext: { width: w || 640, height: hgt || 320 } });
  return Math.ceil((hgt || 320) / 20) + 1;
}
async function rptXTableSheet(wb, s, period) {
  const t = s.table || { headers: [], rows: [] };
  const cols = Math.max(4, t.headers.length);
  const ws = wb.addWorksheet(rptSheetName(wb, s.sheet || s.title), { views: [{ rightToLeft: true, showGridLines: false }] });
  rptXSetup(ws, t.headers.length > 6);
  rptXTitle(ws, cols, s.title || '', [rptBrand().name, period ? 'الفترة: ' + period : ''].filter(Boolean).join(' · '));
  ws.addRow([]);
  rptXKpis(ws, s.kpis, cols);
  if (t.headers.length) {
    const hr = ws.addRow(t.headers); hr.height = 22;
    hr.eachCell(function (c) { c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: RPT_X.gold } }; c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; rptXBorder(c); });
    const headRow = hr.number;
    const fmt = '#,##0.00 "' + String(curName()).replace(/"/g, '') + '"';
    const put = function (vals, bold, zebra) {
      const row = ws.addRow(vals.map(function (v) { return typeof v === 'string' ? rptPlain(v) : v; }));
      row.eachCell({ includeEmpty: true }, function (c, ci) {
        const i = ci - 1; if (i >= t.headers.length) return; rptXBorder(c);
        if ((t.money || []).indexOf(i) >= 0 && typeof c.value === 'number') c.numFmt = fmt;
        if ((t.pct || []).indexOf(i) >= 0 && typeof c.value === 'number') c.numFmt = '0.0"%"';
        if (bold) { c.font = { bold: true }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3EADC' } }; }
        else if (zebra) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAF7F2' } };
        c.alignment = { vertical: 'middle', horizontal: typeof c.value === 'number' ? 'center' : 'right', wrapText: true };
      });
    };
    (t.rows || []).forEach(function (r, i) { put(r, false, i % 2 === 1); });
    const foot = rptFoot(t); if (foot) put(foot, true);
    ws.views = [{ rightToLeft: true, showGridLines: false, state: 'frozen', ySplit: headRow }];
    ws.pageSetup.printTitlesRow = headRow + ':' + headRow;
    t.headers.forEach(function (x, i) {
      let w = String(x).length + 4; (t.rows || []).slice(0, 200).forEach(function (r) { const v = r[i]; const l = (typeof v === 'number' ? nf(v) + ' ' + curName() : rptPlain(v)).length + 2; if (l > w) w = l; });
      ws.getColumn(i + 1).width = Math.min(48, Math.max(10, w));
    });
  }
  if (s.chart) await rptXImage(wb, ws, s.chart, ws.rowCount + 1, 640, 320);
  return ws;
}
async function rptExcel(o) {
  if (typeof ExcelJS === 'undefined') { showToast('مكتبة Excel غير محملة', true); return; }
  const wb = new ExcelJS.Workbook(); wb.creator = 'Mataami Pro'; wb.created = new Date();
  await rptXCover(wb, o);
  for (const s of (o.sections || [])) if (s.table || s.kpis) await rptXTableSheet(wb, s, o.period);
  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), rptFileName(o, 'xlsx'));
  showToast('تم تصدير ملف Excel');
}
async function rptXCover(wb, o) {
  const b = rptBrand();
  const ws = wb.addWorksheet('الغلاف', { views: [{ rightToLeft: true, showGridLines: false }] });
  rptXSetup(ws, false);
  ws.columns = [{ width: 28 }, { width: 24 }, { width: 28 }, { width: 24 }];
  ws.mergeCells('A1:D1'); ws.getCell('A1').value = b.name; ws.getCell('A1').font = { bold: true, size: 20, color: { argb: 'FF1F2937' } }; ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' }; ws.getRow(1).height = 40;
  ws.mergeCells('A2:D2'); ws.getCell('A2').value = [b.branch, b.address, b.phone].filter(Boolean).join(' · '); ws.getCell('A2').alignment = { horizontal: 'center' }; ws.getCell('A2').font = { color: { argb: 'FF777777' } };
  ws.addRow([]);
  ws.mergeCells('A4:D4'); ws.getCell('A4').value = o.title; ws.getCell('A4').font = { bold: true, size: 22, color: { argb: 'FFFFFFFF' } }; ws.getCell('A4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: RPT_X.gold } }; ws.getCell('A4').alignment = { horizontal: 'center', vertical: 'middle' }; ws.getRow(4).height = 46;
  ws.mergeCells('A5:D5'); ws.getCell('A5').value = o.subtitle || ''; ws.getCell('A5').alignment = { horizontal: 'center' }; ws.getCell('A5').font = { size: 12, color: { argb: 'FF8A6430' } };
  ws.addRow([]);
  [['الفترة', o.period || '—'], ['تاريخ الإصدار', rptNow()], ['أعدّه', rptActor() || '—']].concat(b.taxNo ? [['الرقم الضريبي', b.taxNo]] : []).forEach(function (m) {
    const r = ws.addRow(['', m[0], m[1]]); [2, 3].forEach(function (i) { const c = r.getCell(i); rptXBorder(c); c.alignment = { horizontal: 'center' }; }); r.getCell(2).font = { bold: true, color: { argb: 'FF8A6430' } }; r.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: RPT_X.soft } };
  });
  if (o.kpis && o.kpis.length) {
    ws.addRow([]); const hr = ws.addRow(['المؤشرات الرئيسية']); ws.mergeCells(hr.number, 1, hr.number, 4);
    hr.getCell(1).font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } }; hr.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: RPT_X.gold } }; hr.getCell(1).alignment = { horizontal: 'center' };
    rptXKpis(ws, o.kpis, 4);
  }
  const charts = (o.sections || []).filter(function (s) { return s.chart && s.coverChart; });
  for (const s of charts) await rptXImage(wb, ws, s.chart, ws.rowCount + 1, 620, 300) && ws.addRows(new Array(16).fill([]));
  ws.addRow([]); const f = ws.addRow(['تقرير صادر من منصة Mataami Pro · ' + rptNow()]); ws.mergeCells(f.number, 1, f.number, 4); f.getCell(1).font = { size: 9, color: { argb: 'FF999999' } }; f.getCell(1).alignment = { horizontal: 'center' };
  return ws;
}
// قائمة أزرار التصدير الموحدة
function rptButtons(id) {
  return '<div class="rpt-btns" id="' + id + '"><button class="btn btn-primary btn-sm" data-rp="print"><i class="fas fa-print"></i> طباعة التقرير</button><button class="btn btn-outline btn-sm" data-rp="word"><i class="fas fa-file-word"></i> Word</button><button class="btn btn-outline btn-sm" data-rp="excel"><i class="fas fa-file-excel"></i> Excel</button></div>';
}
function rptBind(root, id, build) {
  const box = root.querySelector('#' + id); if (!box) return;
  box.onclick = async function (e) {
    const b = e.target.closest('[data-rp]'); if (!b) return;
    b.disabled = true; showLoading();
    try { const o = await build(); if (b.dataset.rp === 'print') rptPrint(o); else if (b.dataset.rp === 'word') rptWord(o); else await rptExcel(o); }
    catch (err) { console.error(err); showToast('تعذر إنشاء التقرير: ' + err.message, true); }
    finally { hideLoading(); b.disabled = false; }
  };
}

// ---------- الرسوم البيانية للتقارير (ألوان مناسبة للطباعة) ----------
async function rptChart(type, labels, datasets, title, w, hh) {
  if (typeof Chart === 'undefined' || typeof renderChartToBase64 !== 'function' || !labels || !labels.length) return '';
  const prev = Chart.defaults.color; Chart.defaults.color = '#333';
  const axes = type === 'bar' || type === 'line';
  try {
    return await renderChartToBase64({ type: type, data: { labels: labels, datasets: datasets },
      options: { plugins: { title: { display: !!title, text: title, color: '#1f2937', font: { size: 15, weight: 'bold' } }, legend: { display: datasets.length > 1 || !axes, position: 'bottom', labels: { color: '#333' } } },
        scales: axes ? { x: { ticks: { color: '#333', maxRotation: 50, autoSkip: true }, grid: { color: '#eee' } }, y: { beginAtZero: true, ticks: { color: '#333' }, grid: { color: '#eee' } } } : undefined } }, w || 820, hh || 380);
  } finally { Chart.defaults.color = prev; }
}
const RPT_PAL = ['#b48554', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#64748b'];

// ---------- طباعة/تصدير أي محتوى من الصفحة ----------
function rptClean(src) {
  const c = src.cloneNode(true);
  const oc = src.querySelectorAll('canvas'), cc = c.querySelectorAll('canvas');
  cc.forEach(function (cv, i) {
    let url = '';
    try {
      const ch = typeof Chart !== 'undefined' && Chart.getChart ? Chart.getChart(oc[i]) : null;
      if (ch) { const prev = Chart.defaults.color; Chart.defaults.color = '#333'; ch.update('none'); url = oc[i].toDataURL('image/png'); Chart.defaults.color = prev; ch.update('none'); }
      else url = oc[i].toDataURL('image/png');
    } catch (e) { }
    const d = document.createElement('div'); d.className = 'chart'; d.innerHTML = url ? '<img src="' + url + '">' : '';
    (cv.closest('.chart-box') || cv).replaceWith(d);
  });
  c.querySelectorAll('.biz-toolbar,.biz-subtabs,.biz-filter,.rpt-btns,.no-print,button,.ico-btn,script,.biz-page-tools,.modal-footer-pro').forEach(function (x) { x.remove(); });
  c.querySelectorAll('input,select,textarea').forEach(function (x) {
    const o = src.querySelector('[data-k="' + (x.dataset.k || '') + '"]');
    const s = document.createElement('span'); s.textContent = x.tagName === 'SELECT' ? (x.options[x.selectedIndex] || {}).text || '' : (x.type === 'checkbox' ? (x.checked ? 'نعم' : 'لا') : x.value); x.replaceWith(s);
  });
  c.querySelectorAll('.biz-kpis').forEach(function (k) {
    const list = Array.from(k.querySelectorAll('.dash-card')).map(function (d) { return [(d.querySelector('.label') || {}).textContent || '', h((d.querySelector('.value') || {}).textContent || ''), h((d.querySelector('.sub') || {}).textContent || '')]; });
    const w = document.createElement('div'); w.innerHTML = rptKpis(list); k.replaceWith(w.firstChild || w);
  });
  c.querySelectorAll('table').forEach(function (t) {
    if (t.classList.contains('kp')) return;
    t.className = 't'; t.removeAttribute('style');
    const ths = Array.from(t.querySelectorAll('thead th'));
    const empty = ths.map(function (th, i) { return th.textContent.trim() ? -1 : i; }).filter(function (i) { return i >= 0; }).reverse();
    empty.forEach(function (i) { t.querySelectorAll('tr').forEach(function (tr) { if (tr.children[i] && tr.children.length === ths.length) tr.children[i].remove(); }); });
    t.querySelectorAll('th.num,td.num').forEach(function (x) { x.classList.add('n'); });
  });
  c.querySelectorAll('[style]').forEach(function (x) { if (/color\s*:\s*#(6ee7b7|f87171|fbbf24|cfa776|aab7d4)/i.test(x.getAttribute('style'))) x.setAttribute('style', x.getAttribute('style').replace(/#6ee7b7/ig, '#047857').replace(/#f87171/ig, '#b91c1c').replace(/#fbbf24/ig, '#b45309').replace(/#cfa776|#aab7d4/ig, '#8a6430')); });
  c.querySelectorAll('h4').forEach(function (x) { x.removeAttribute('style'); });
  return c.innerHTML;
}
function rptTablesFromEl(el) {
  return Array.from(el.querySelectorAll('table')).filter(function (t) { return !t.classList.contains('kp'); }).map(function (t) {
    const card = t.closest('.biz-card'); const ttl = card && card.querySelector('h4') ? card.querySelector('h4').textContent.trim() : '';
    const ths = Array.from(t.querySelectorAll('thead th')).map(function (x) { return x.textContent.trim(); });
    const keep = ths.map(function (x, i) { return x ? i : -1; }).filter(function (i) { return i >= 0; });
    const money = [];
    const rows = Array.from(t.querySelectorAll('tbody tr')).map(function (tr) {
      return keep.map(function (i, j) { const td = tr.children[i]; const s = td ? td.textContent.trim() : ''; const cur = curName(); const raw = s.replace(cur, '').replace(/,/g, '').replace('%', '').trim();
        if (raw !== '' && /^-?\d+(\.\d+)?$/.test(raw)) { if (cur && s.indexOf(cur) >= 0 && money.indexOf(j) < 0) money.push(j); return parseFloat(raw); } return s; });
    });
    return { title: ttl, table: { headers: keep.map(function (i) { return ths[i]; }), rows: rows, money: money } };
  }).filter(function (x) { return x.table.headers.length; });
}
function rptFromEl(title, el, sub) {
  const kp = Array.from(el.querySelectorAll('.biz-kpis .dash-card')).slice(0, 8).map(function (d) { return [(d.querySelector('.label') || {}).textContent || '', h((d.querySelector('.value') || {}).textContent || '')]; });
  const rng = el.querySelector('.biz-filter'); let period = '';
  if (rng) { const ins = rng.querySelectorAll('input[type=date]'); if (ins.length >= 2) period = rptPeriod({ from: ins[0].value, to: ins[1].value }); }
  return { title: title, subtitle: sub || '', period: period, bodyHtml: rptClean(el), xKpis: kp, el: el };
}
async function rptElExport(kind, title, el, sub) {
  const o = rptFromEl(title, el, sub);
  if (kind === 'print') return rptPrint(o);
  if (kind === 'word') return rptWord(o);
  const tbs = rptTablesFromEl(el);
  if (!tbs.length && !o.xKpis.length) { showToast('لا توجد جداول للتصدير في هذه الصفحة', true); return; }
  await rptExcel({ title: title, subtitle: sub, period: o.period, kpis: o.xKpis, sections: tbs.map(function (t, i) { return { title: t.title || (title + (tbs.length > 1 ? ' ' + (i + 1) : '')), table: t.table }; }) });
}
// أزرار الطباعة في رأس كل صفحة
function bizPageTools() {
  return '<div class="biz-page-tools no-print"><button class="ico-btn" data-pt="print" title="طباعة الصفحة"><i class="fas fa-print"></i></button><button class="ico-btn" data-pt="word" title="تصدير Word"><i class="fas fa-file-word"></i></button><button class="ico-btn" data-pt="excel" title="تصدير Excel"><i class="fas fa-file-excel"></i></button></div>';
}
document.addEventListener('click', function (e) {
  const b = e.target.closest('.biz-page-tools [data-pt]'); if (!b) return;
  const root = document.getElementById('tabBiz'); if (!root) return;
  const ttl = (root.querySelector('.biz-page-head h2') || {}).textContent || 'تقرير';
  const act = root.querySelector('.biz-subtab.active');
  rptElExport(b.dataset.pt, ttl.trim() + (act ? ' — ' + act.textContent.trim() : ''), root.querySelector('.biz-page-body')).catch(function (err) { showToast('تعذر التصدير: ' + err.message, true); });
});

// ---------- أقسام نظام التشغيل داخل التقرير الشامل (Word / Excel من الإعدادات) ----------
async function bizFullSections() {
  if (!B.acc) { try { await loadAccount(); } catch (e) { } }
  if (!B.acc || !hasF('pos')) return null;
  const f = { from: daysAgo(29), to: isoLocal() }, period = rptPeriod(f);
  const get0 = async function (fn, p) { try { const r = await bz(fn, p || {}, { silentPlan: true }); return r && r.success !== false ? r : null; } catch (e) { return null; } };
  // v4.7: تحميل كل البيانات بالتوازي (أسرع بكثير) مع تحديث شريط التقدم
  const rg = window.__fcBizRange || [60, 92], pg = window.fcProgress && window.fcProgress.active() ? window.fcProgress : null;
  const jobs = {}; let total = 0, doneN = 0;
  const need = function (key, fn, p, cond) { if (cond === false) return; total++; jobs[key] = get0(fn, p).then(function (r) { doneN++; if (pg) pg.set(rg[0] + (rg[1] - rg[0]) * doneN / total, 'تحميل بيانات نظام التشغيل (' + doneN + ' من ' + total + ')…'); return r; }); };
  const ent = function (kind, p) { return Object.assign({ kind: kind }, p || {}); };
  const fin = canP('finance', 'reports');
  need('bizSummary', 'bizSummary', {});
  need('financeReport', 'financeReport', f, hasF('reports') && fin);
  need('profitReport', 'profitReport', f, hasF('profit_reports') && fin);
  need('stockList', 'stockList', {}, hasF('inventory') && canP('inventory', 'purchasing'));
  need('e:products', 'entityList', ent('products'), hasF('inventory') && canP('inventory', 'purchasing'));
  need('e:purchases', 'entityList', ent('purchases', f), hasF('purchasing') && canP('purchasing', 'finance'));
  need('e:suppliers', 'entityList', ent('suppliers'), hasF('purchasing') && canP('purchasing', 'finance'));
  need('e:expenses', 'entityList', ent('expenses', f), hasF('finance') && canP('finance'));
  need('e:shifts', 'entityList', ent('shifts', f), hasF('shifts') && canP('team', 'finance', 'pos'));
  need('e:customers', 'entityList', ent('customers'), hasF('customers') && canP('customers', 'pos', 'finance'));
  need('ledgerList', 'ledgerList', {}, hasF('ledger') && canP('customers', 'finance'));
  need('e:gift_cards', 'entityList', ent('gift_cards'), hasF('gift_cards') && canP('customers'));
  need('e:branches', 'entityList', ent('branches', { branchId: 'all' }), hasF('branches') && canP('team', 'reports', 'finance'));
  need('e:staff', 'entityList', ent('staff'), hasF('team') && canP('team'));
  need('e:tables', 'entityList', ent('tables', { branchId: 'all' }), hasF('tables') && canP('tables', 'pos'));
  need('e:reservations', 'entityList', ent('reservations', Object.assign({ branchId: 'all' }, f)), hasF('tables') && canP('tables', 'pos'));
  need('e:discounts', 'entityList', ent('discounts'), hasF('discounts') && canP('marketing', 'pos'));
  need('e:production', 'entityList', ent('production', Object.assign({ branchId: 'all' }, f)), hasF('production') && canP('inventory'));
  need('e:transfers', 'entityList', ent('transfers', f), hasF('transfers') && canP('inventory'));
  need('e:quotes', 'entityList', ent('quotes', Object.assign({ branchId: 'all' }, f)), hasF('quotes') && canP('finance', 'pos'));
  need('invoicesList', 'invoicesList', Object.assign({ branchId: 'all' }, f), hasF('finance') && canP('finance', 'reports', 'orders_manage'));
  need('opsKpiReport', 'opsKpiReport', Object.assign({ branchId: 'all' }, f), canP('reports', 'finance', 'orders_manage', 'team'));
  need('drawersReport', 'drawersReport', Object.assign({ branchId: 'all' }, f), hasF('shifts') && canP('reports', 'finance', 'team'));
  need('deliveryReport', 'deliveryReport', Object.assign({ branchId: 'all' }, f), hasF('delivery') && canP('reports', 'dispatch', 'orders_manage'));
  need('driverCashReport', 'driverCashReport', Object.assign({ branchId: 'all' }, f), hasF('delivery') && canP('reports', 'finance', 'dispatch', 'team'));
  need('activityList', 'activityList', f, hasF('activity') && canP('team', 'reports'));
  const keys = Object.keys(jobs), vals = await Promise.all(keys.map(function (k) { return jobs[k]; }));
  const R = {}; keys.forEach(function (k, i) { R[k] = vals[i]; });
  const get = async function (fn) { return R[fn] || null; };
  const list = async function (kind) { const r = R['e:' + kind]; return r ? r.rows || [] : []; };
  const out = { period: period, kpis: [], sections: [] };
  const sm = await get('bizSummary', {});
  if (sm) {
    out.kpis = [['مبيعات اليوم', money(sm.today.sales), sm.today.count + ' فاتورة'], ['متوسط الفاتورة اليوم', money(sm.today.avg)], ['مبيعات 7 أيام', money(sm.week.sales), sm.week.count + ' فاتورة'], ['طلبات مفتوحة', sm.openOrders.count, money(sm.openOrders.total)], ['العملاء', sm.customers], ['أصناف منخفضة المخزون', sm.lowStock], ['حجوزات اليوم', sm.reservationsToday], ['الباقة', h((B.acc.planName || B.acc.plan) + ' · حتى ' + B.acc.expiryDate)]];
    out.sections.push({ title: 'لوحة التحكم — التشغيل اليوم', pb: true, kpis: out.kpis, sheet: 'لوحة التحكم' });
  }
  if (hasF('reports') && canP('finance', 'reports')) {
    const fr = await get('financeReport', f);
    if (fr) { const d = await finReportDoc(fr, f); d.sections[0].kpis = d.kpis; d.sections[0].pb = true; d.sections[0].title = 'المبيعات والأرباح — آخر 30 يوماً'; out.sections = out.sections.concat(d.sections); }
  }
  if (hasF('profit_reports') && canP('finance', 'reports')) {
    const pr = await get('profitReport', f);
    if (pr) { const d = await profitDoc(pr, f); d.sections[0].kpis = d.kpis; d.sections[0].pb = true; d.sections[0].title = 'الربحية — آخر 30 يوماً'; out.sections = out.sections.concat(d.sections.slice(0, 3)); }
  }
  if (hasF('inventory') && canP('inventory', 'purchasing')) {
    const st = await get('stockList', {});
    if (st && st.items) {
      const low = st.items.filter(function (i) { return i.low; });
      out.sections.push({ title: 'المخزون الحالي', pb: true, kpis: [['عدد الأصناف', st.items.length], ['قيمة المخزون', money(st.items.reduce(function (a, i) { return a + (+i.value || 0); }, 0))], ['أصناف منخفضة', low.length]],
        table: { headers: ['الصنف', 'النوع', 'الوحدة', 'الرصيد', 'الحد الأدنى', 'تكلفة الوحدة', 'القيمة'], rows: st.items.map(function (i) { return [i.name + (i.low ? ' (منخفض)' : ''), i.itemType === 'material' ? 'مادة أولية' : 'منتج', i.unit || '', i.qty, i.minQty || '', i.cost, i.value]; }), qty: [3, 4], money: [5, 6], foot: ['الإجمالي', '', '', '', '', '', st.items.reduce(function (a, i) { return a + (+i.value || 0); }, 0)] } });
    }
    const prods = await list('products');
    if (prods.length) out.sections.push({ title: 'المنتجات (كتالوج الكاشير)', table: { headers: ['المنتج', 'التصنيف', 'السعر', 'التكلفة', 'الهامش'], rows: prods.map(function (p) { return [p.name, p.category || '', +p.price, +p.cost, p.price > 0 ? (p.price - p.cost) / p.price * 100 : 0]; }), money: [2, 3], pct: [4] } });
  }
  if (hasF('purchasing') && canP('purchasing', 'finance')) {
    const pu = (await list('purchases', f)).filter(function (x) { return x.status !== 'cancelled'; });
    const sp = await list('suppliers');
    out.sections.push({ title: 'المشتريات — آخر 30 يوماً', pb: true, kpis: [['إجمالي المشتريات', money(pu.reduce(function (a, x) { return a + +x.total; }, 0))], ['المدفوع', money(pu.reduce(function (a, x) { return a + +x.paid; }, 0))], ['المستحق للموردين', money(sp.reduce(function (a, x) { return a + +x.balance; }, 0))]],
      table: { headers: ['#', 'التاريخ', 'المورد', 'الإجمالي', 'المدفوع', 'المتبقي'], rows: pu.map(function (x) { return [x.number, (x.purchased_at || '').slice(0, 10), x.supplier_name || 'نقدي', +x.total, +x.paid, x.total - x.paid]; }), money: [3, 4, 5], foot: 'sum' } });
    if (sp.length) out.sections.push({ title: 'أرصدة الموردين', table: { headers: ['المورد', 'الجوال', 'الرصيد المستحق'], rows: sp.map(function (x) { return [x.name, x.phone || '', +x.balance]; }), money: [2], foot: 'sum' } });
  }
  if (hasF('finance') && canP('finance')) {
    const ex = await list('expenses', f);
    out.sections.push({ title: 'المصروفات — آخر 30 يوماً', pb: true, table: { headers: ['التاريخ', 'البند', 'الوصف', 'الطريقة', 'المبلغ'], rows: ex.map(function (x) { return [(x.spent_at || '').slice(0, 10), x.category, x.note || '', PAY_NAMES[x.method] || x.method, +x.amount]; }), money: [4], foot: 'sum', empty: 'لا توجد مصروفات' } });
  }
  if (hasF('shifts') && canP('team', 'finance', 'pos')) {
    const sh = await list('shifts', f);
    if (sh.length) out.sections.push({ title: 'الورديات — آخر 30 يوماً', table: { headers: ['الموظف', 'الفتح', 'الإغلاق', 'الافتتاحي', 'المبيعات', 'المتوقع', 'الفعلي', 'الفرق'], rows: sh.map(function (s) { return [s.staff_name, (s.opened_at || '').slice(0, 16).replace('T', ' '), s.closed_at ? s.closed_at.slice(0, 16).replace('T', ' ') : 'مفتوحة', +s.opening_cash, s.summary && s.summary.sales !== undefined ? +s.summary.sales : '', s.status === 'closed' ? +s.expected_cash : '', s.status === 'closed' ? +s.closing_cash : '', s.status === 'closed' ? s.closing_cash - s.expected_cash : '']; }), money: [3, 4, 5, 6, 7] } });
  }
  if (hasF('customers') && canP('customers', 'pos', 'finance')) {
    const cu = await list('customers');
    const topC = cu.slice().sort(function (a, b) { return b.total_spent - a.total_spent; });
    out.sections.push({ title: 'العملاء', pb: true, kpis: [['عدد العملاء', cu.length], ['إجمالي مشترياتهم', money(cu.reduce(function (a, c) { return a + +c.total_spent; }, 0))], ['النقاط القائمة', nf(cu.reduce(function (a, c) { return a + +c.points; }, 0), 0)]],
      table: { headers: ['العميل', 'الجوال', 'الزيارات', 'المشتريات', 'النقاط', 'رصيد الآجل', 'حد الآجل'], rows: topC.map(function (c) { return [c.name, c.phone || '', c.visits, +c.total_spent, +c.points, +c.balance, +c.credit_limit ? +c.credit_limit : 'بلا حد']; }), qty: [2, 4], money: [3, 5, 6] } });
  }
  if (hasF('ledger') && canP('customers', 'finance')) {
    const lg = await get('ledgerList', {});
    if (lg && lg.debtors.length) out.sections.push({ title: 'دفتر الآجل — الديون على العملاء', table: { headers: ['العميل', 'الجوال', 'الرصيد', 'الحد'], rows: lg.debtors.map(function (c) { return [c.name, c.phone || '', +c.balance, +c.credit_limit || 'بلا حد']; }), money: [2, 3], foot: ['الإجمالي', '', lg.total, ''] } });
  }
  if (hasF('gift_cards') && canP('customers')) {
    const gc = await list('gift_cards');
    if (gc.length) out.sections.push({ title: 'بطاقات الهدايا', table: { headers: ['الكود', 'المستفيد', 'القيمة الأصلية', 'الرصيد', 'الحالة'], rows: gc.map(function (g) { return [g.code, g.customer_name || '', +g.initial_amount, +g.balance, g.active ? 'فعّالة' : 'موقوفة']; }), money: [2, 3], foot: 'sum' } });
  }
  // ---------- v4.7: أقسام إضافية ليكون التقرير شاملاً لكل البيانات ----------
  const tm = function (v) { return v ? String(v).slice(0, 16).replace('T', ' ') : ''; };
  const iv = R.invoicesList;
  if (iv && iv.invoices && iv.invoices.length) {
    const sales = iv.invoices.filter(function (x) { return x.kind !== 'refund'; }), refs = iv.invoices.filter(function (x) { return x.kind === 'refund'; });
    out.sections.push({ title: 'الفواتير — آخر 30 يوماً', pb: true, kpis: [['فواتير البيع', sales.length], ['قيمة المبيعات', money(sales.reduce(function (a, x) { return a + +x.total; }, 0))], ['المرتجعات', money(refs.reduce(function (a, x) { return a + +x.total; }, 0))]],
      table: { headers: ['رقم الفاتورة', 'النوع', 'التاريخ', 'رقم الطلب', 'العميل', 'الموظف', 'طرق الدفع', 'الضريبة', 'الإجمالي'], rows: iv.invoices.map(function (x) { return [x.number, x.kind === 'refund' ? 'مرتجع' : 'بيع', tm(x.issued_at), x.order_number || '', x.customer_name || '', x.staff_name || '', (x.payments || []).map(function (p) { return (PAY_NAMES[p.method] || p.method) + ' ' + nf(p.amount); }).join(' + '), +x.tax_total, +x.total]; }), money: [7, 8], foot: 'sum' } });
  }
  const ok = R.opsKpiReport;
  if (ok && ok.summary) {
    const S = ok.summary;
    out.sections.push({ title: 'مؤشرات الأداء التشغيلي — آخر 30 يوماً', pb: true, kpis: [['الطلبات', S.orders], ['المدفوعة', S.paid], ['الملغاة', S.cancelled], ['المسترجعة', S.refunded], ['هدر الإلغاء', money(S.wasteCost)], ['متوسط القبول (د)', nf(ok.accept.avg)], ['متوسط التحضير (د)', nf(ok.prep.avg)], ['متوسط التسليم (د)', nf(ok.serve.avg)]],
      table: { headers: ['الموظف', 'الطلبات', 'الملغاة', 'القبول (د)', 'التحضير (د)', 'التسليم (د)', 'الإجمالي (د)', 'تحضير في الوقت %'], rows: (ok.byStaff || []).map(function (x) { return [x.name || '—', x.orders, x.cancelled, x.accept, x.prep, x.serve, x.total, x.prepOnTime]; }) } });
    if ((ok.cancellations || []).length) out.sections.push({ title: 'الإلغاءات والمرتجعات', table: { headers: ['#', 'الفرع', 'الحالة', 'المرحلة', 'السبب', 'بواسطة', 'الوقت', 'القيمة', 'الهدر'], rows: ok.cancellations.map(function (c) { return [c.number, c.branch || '', c.status, c.stage, c.reason, c.by, tm(c.at), +c.total, +c.waste]; }), money: [7, 8], foot: 'sum' } });
  }
  const dw = R.drawersReport;
  if (dw && (dw.shifts || []).length) {
    out.sections.push({ title: 'الصناديق والورديات حسب الفرع والكاشير', kpis: [['صناديق مفتوحة', dw.summary.open], ['النقد الحالي', money(dw.summary.cashNow)], ['المبيعات', money(dw.summary.sales)], ['إجمالي الفروقات', money(dw.summary.diff)], ['حالات عجز', dw.summary.shortages]],
      table: { headers: ['الكاشير', 'الفرع', 'الحالة', 'الفتح', 'الإغلاق', 'افتتاحي', 'نقد', 'بطاقة', 'تحويل', 'المبيعات', 'المتوقع', 'المعدود', 'الفرق'], rows: dw.shifts.map(function (x) { return [x.staff || '', x.branch || '', x.status === 'open' ? 'مفتوح' : 'مغلق', tm(x.opened_at), tm(x.closed_at), x.opening, x.cashSales, x.card, x.transfer, x.sales, x.expected, x.counted === null ? '' : x.counted, x.diff === null ? '' : x.diff]; }), money: [5, 6, 7, 8, 9, 10, 11, 12] } });
  }
  const dr = R.deliveryReport;
  if (dr && dr.summary) {
    const S = dr.summary;
    out.sections.push({ title: 'التوصيل وأداء السائقين — آخر 30 يوماً', pb: true, kpis: [['طلبات مسلّمة', S.n], ['في الوقت', nf(S.onTime) + '%'], ['متأخرة', S.late], ['ملغاة', S.cancelled], ['متوسط زمن التوصيل (د)', nf(S.trip.avg)], ['قيمة الطلبات', money(S.value)]],
      table: { headers: ['السائق', 'الطلبات', 'في الوقت %', 'متأخرة', 'متوسط القبول (د)', 'متوسط التوصيل (د)', 'القيمة', 'نقد محصّل'], rows: (dr.drivers || []).map(function (d) { return [d.name, d.n, d.onTime, d.late, d.wait.avg, d.trip.avg, d.value, d.cash]; }), money: [6, 7], foot: 'sum' } });
  }
  const dc = R.driverCashReport;
  if (dc && dc.rows && dc.rows.length) {
    const S = dc.summary, KN = { float: 'عهدة للسائق', settle: 'استلام نقد' }, SN = { pending: 'معلّق', done: 'تم', cancelled: 'ملغى' };
    out.sections.push({ title: 'عهدة السائقين وتسليم النقد للكاشير', kpis: [['العهد المسلّمة', money(S.floats)], ['عمليات الاستلام', S.settles], ['النقد المستلم', money(S.collected)], ['تحصيلات الطلبات', money(S.cod)], ['إجمالي الفروقات', money(S.difference)]],
      table: { headers: ['النوع', 'الحالة', 'السائق', 'الكاشير', 'الوقت', 'العهدة', 'التحصيلات', 'المطلوب', 'المستلم', 'الفرق'], rows: dc.rows.map(function (x) { return [KN[x.kind] || x.kind, SN[x.status] || x.status, x.driverName, x.cashierName, tm(x.doneAt || x.createdAt), x.floatAmount, x.codTotal, x.amount, x.counted === null ? '' : x.counted, x.difference === null ? '' : x.difference]; }), money: [5, 6, 7, 8, 9] } });
  }
  const br = await list('branches');
  if (br.length) out.sections.push({ title: 'الفروع', pb: true, table: { headers: ['الفرع', 'العنوان', 'الجوال', 'الحالة'], rows: br.map(function (x) { return [x.name + (x.is_main ? ' (الرئيسي)' : ''), x.address || '', x.phone || '', x.active === false ? 'موقوف' : 'فعّال']; }) } });
  const st2 = await list('staff');
  if (st2.length) { const bn = {}; br.forEach(function (x) { bn[x.id] = x.name; }); out.sections.push({ title: 'الموظفون والصلاحيات', table: { headers: ['الموظف', 'اسم المستخدم', 'الدور', 'الفرع', 'الجوال', 'الحالة'], rows: st2.map(function (x) { return [x.name, x.username || '', (B.acc.roleNames || {})[x.role] || x.role, x.branch_id ? (bn[x.branch_id] || '') : 'كل الفروع', x.phone || '', x.active ? 'فعّال' : 'موقوف']; }) } }); }
  const tb = await list('tables');
  if (tb.length) out.sections.push({ title: 'الطاولات', table: { headers: ['الطاولة', 'المنطقة', 'المقاعد', 'الحالة'], rows: tb.map(function (x) { return [x.name, x.area || '', x.seats || '', x.active === false ? 'موقوفة' : 'فعّالة']; }) } });
  const rs = await list('reservations');
  if (rs.length) out.sections.push({ title: 'الحجوزات — آخر 30 يوماً', table: { headers: ['العميل', 'الجوال', 'الموعد', 'الأشخاص', 'الحالة', 'ملاحظات'], rows: rs.map(function (x) { return [x.customer_name || '', x.phone || '', tm(x.reserved_at), x.party_size, (typeof RES_ST !== 'undefined' && RES_ST[x.status] ? RES_ST[x.status][0] : x.status), x.notes || '']; }) } });
  const ds = await list('discounts');
  if (ds.length) out.sections.push({ title: 'العروض والخصومات', table: { headers: ['العرض', 'النوع', 'القيمة', 'الكود', 'الحد الأدنى', 'من', 'إلى', 'الحالة'], rows: ds.map(function (x) { return [x.name, x.kind === 'percent' ? 'نسبة' : x.kind, +x.value, x.code || '', +x.min_total || '', (x.starts_at || '').slice(0, 10), (x.ends_at || '').slice(0, 10), x.active ? 'فعّال' : 'موقوف']; }) } });
  const pd = await list('production');
  if (pd.length) out.sections.push({ title: 'أوامر الإنتاج — آخر 30 يوماً', table: { headers: ['#', 'التاريخ', 'المنتج', 'الكمية', 'التكلفة', 'بواسطة'], rows: pd.map(function (x) { return [x.number, tm(x.created_at), x.product_name, +x.qty, +x.total_cost, x.created_by || '']; }), money: [4], foot: 'sum' } });
  const tr = await list('transfers');
  if (tr.length) { const bn = {}; br.forEach(function (x) { bn[x.id] = x.name; }); out.sections.push({ title: 'التحويلات بين الفروع — آخر 30 يوماً', table: { headers: ['#', 'التاريخ', 'من', 'إلى', 'الأصناف', 'الحالة'], rows: tr.map(function (x) { return [x.number, tm(x.created_at), bn[x.from_branch] || '', bn[x.to_branch] || '', (x.items || []).map(function (i) { return i.name + ' × ' + i.qty; }).join('، '), x.status === 'received' ? 'مستلم' : x.status === 'cancelled' ? 'ملغى' : 'مرسل']; }) } }); }
  const qt = await list('quotes');
  if (qt.length) out.sections.push({ title: 'عروض الأسعار — آخر 30 يوماً', table: { headers: ['#', 'التاريخ', 'العميل', 'الجوال', 'صالح حتى', 'الحالة', 'الإجمالي'], rows: qt.map(function (x) { return [x.number, tm(x.created_at), x.customer_name || '', x.phone || '', (x.valid_until || '').slice(0, 10), x.status, +x.total]; }), money: [6], foot: 'sum' } });
  const ac = R.activityList;
  if (ac && ac.rows && ac.rows.length) out.sections.push({ title: 'سجل النشاط — آخر 30 يوماً', pb: true, table: { headers: ['الوقت', 'المستخدم', 'الدور', 'الإجراء', 'التفاصيل', 'الفرع'], rows: ac.rows.map(function (x) { return [tm(x.created_at), x.actor, x.actor_role || '', x.action, x.details || '', x.branch_name || '']; }) } });
  if (pg) pg.set(rg[1], 'تنسيق أقسام نظام التشغيل…');
  return out;
}
async function bizFullWordHtml() {
  const d = await bizFullSections(); if (!d || !d.sections.length) return '';
  return '<style>' + RPT_INNER_CSS + '</style><div class="page-break"></div><h2>نظام التشغيل — الكاشير والمخزون والمالية والعملاء</h2><p class="meta">الفترة: ' + h(d.period) + '</p>' + d.sections.map(rptSection).join('');
}
async function bizFullExcelAppend(wb) {
  const d = await bizFullSections(); if (!d) return;
  for (const s of d.sections) await rptXTableSheet(wb, s, d.period);
}
