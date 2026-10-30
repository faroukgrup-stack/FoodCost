// ============================================================
// breakeven.js - نقطة التعادل
// ============================================================

function renderBreakevenInputs() {
        const container = document.getElementById('breakevenProductsContainer');
        if (!allRecipes.length) { container.innerHTML = '<p style="color:var(--text-muted);">لا توجد أطباق.</p>'; return; }
        let html = '<h4 style="color:var(--accent-soft); margin-top:15px;">المبيعات الشهرية لكل طبق</h4>';
        allRecipes.forEach((r, i) => {
            const price = (menuData[r.name]?.price || r.suggestedPrice || 0).toFixed(2);
            html += `<div style="display:flex; gap:10px; align-items:center; margin:8px 0;"><span style="min-width:150px; color:var(--text);">${escapeHtml(r.name)}</span><input type="number" id="be_units_${i}" placeholder="الوحدات" value="0" step="1" style="width:120px;"><span style="color:var(--text-muted);">التكلفة: ${(r.costPrice||0).toFixed(2)} | السعر: ${price}</span></div>`;
        });
        container.innerHTML = html;
    }

function calculateBreakeven() {
        const fixedCosts = parseFloat(document.getElementById('beFixedCosts').value) || 0;
        if (fixedCosts <= 0) { showToast('أدخل التكاليف الثابتة', true); return; }
        const allProducts = [];
        allRecipes.forEach((r, i) => {
            const units = parseInt(document.getElementById(`be_units_${i}`)?.value) || 0;
            if (units > 0) {
                const price = menuData[r.name]?.price || r.suggestedPrice || 0;
                allProducts.push({ name: r.name, price: price, varCost: r.costPrice || 0, units });
            }
        });
        if (!allProducts.length) { showToast('أدخل مبيعات', true); return; }
        const products = [], excluded = [];
        allProducts.forEach(p => { if (p.price > p.varCost) products.push(p); else excluded.push(p); });
        const alertDiv = document.getElementById('breakevenAlert');
        alertDiv.style.display = 'block';
        let alertHtml = '';
        if (excluded.length > 0) alertHtml += `<div class="badge badge-dog" style="margin-bottom:10px;"><i class="fas fa-exclamation-triangle"></i> ${excluded.length} طبق خاسر.</div>`;
        if (products.length === 0) { alertDiv.innerHTML = alertHtml + '<div class="badge badge-dog"><i class="fas fa-ban"></i> جميع الأطباق خاسرة.</div>'; document.getElementById('breakevenResults').style.display = 'none'; return; }
        alertDiv.innerHTML = alertHtml;
        const totalUnits = products.reduce((s, p) => s + p.units, 0);
        products.forEach(p => { p.mix = p.units / totalUnits; p.cm = p.price - p.varCost; p.cmRatio = p.cm / p.price; });
        const weightedCMRatio = products.reduce((s, p) => s + p.mix * p.cmRatio, 0);
        const beRevenue = fixedCosts / weightedCMRatio;
        const weightedPrice = products.reduce((s, p) => s + p.mix * p.price, 0);
        const beTotalUnits = beRevenue / weightedPrice;
        products.forEach(p => { p.beUnits = beTotalUnits * p.mix; p.beRevenue = p.beUnits * p.price; });
        document.getElementById('breakevenResults').style.display = 'block';
        let tableHtml = '<table><thead><tr><th>الطبق</th><th>المزيج %</th><th>وحدات التعادل</th><th>إيرادات التعادل</th></tr></thead><tbody>';
        products.forEach(p => tableHtml += `<tr><td>${p.name}</td><td>${(p.mix*100).toFixed(1)}%</td><td>${Math.ceil(p.beUnits)}</td><td>${p.beRevenue.toFixed(0)}</td></tr>`);
        tableHtml += '</tbody></table>';
        document.getElementById('breakevenTableContainer').innerHTML = tableHtml;
        document.getElementById('breakevenSummary').innerHTML = `<div class="badge badge-warning" style="padding:10px;">إيرادات التعادل: ${beRevenue.toFixed(0)} | وحدات التعادل: ${Math.ceil(beTotalUnits)}</div>`;
        const ctx = document.getElementById('breakevenChart').getContext('2d');
        if (breakevenChartInstance) breakevenChartInstance.destroy();
        breakevenChartInstance = new Chart(ctx, { type: 'bar', data: { labels: products.map(p => p.name), datasets: [{ label: 'وحدات التعادل', data: products.map(p => Math.ceil(p.beUnits)), backgroundColor: '#b48554' }] } });
        window.lastBreakeven = { products, excluded, beRevenue, beTotalUnits, fixedCosts };
    }

async function exportBreakevenExcel() {
        if (!window.lastBreakeven) calculateBreakeven();
        if (!window.lastBreakeven) { showToast('لا توجد نتائج', true); return; }
        showLoading();
        try {
            const workbook = new ExcelJS.Workbook();
            const ws = workbook.addWorksheet('نقطة التعادل', { views: [{ rightToLeft: true }] });
            ws.columns = [{ header: 'الطبق', width: 25 }, { header: 'المزيج %', width: 12 }, { header: 'وحدات التعادل', width: 15 }, { header: 'إيرادات التعادل', width: 18 }];
            ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB48554' } };
            window.lastBreakeven.products.forEach(p => ws.addRow([p.name, (p.mix * 100).toFixed(1) + '%', Math.ceil(p.beUnits), p.beRevenue.toFixed(0)]));
            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `نقطة_التعادل_${new Date().toISOString().slice(0,10)}.xlsx`);
            showToast('✅ تم التصدير');
        } catch (e) { showToast('فشل التصدير', true); } finally { hideLoading(); }
    }

