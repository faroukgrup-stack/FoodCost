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
        let tableHtml = '<table><thead><tr><th>الطبق</th><th>المزيج %</th><th>هامش/قطعة</th><th>وحدات التعادل</th><th>إيرادات التعادل</th></tr></thead><tbody>';
        products.forEach(p => tableHtml += `<tr><td>${escapeHtml(p.name)}</td><td>${(p.mix*100).toFixed(1)}%</td><td>${p.cm.toFixed(2)}</td><td>${Math.ceil(p.beUnits)}</td><td>${p.beRevenue.toFixed(0)}</td></tr>`);
        tableHtml += '</tbody></table>';
        document.getElementById('breakevenTableContainer').innerHTML = tableHtml;

        // توصيات رقمية
        const bestCM = products.slice().sort((a, b) => b.cm - a.cm)[0];
        const worstCM = products.slice().sort((a, b) => a.cm - b.cm)[0];
        const currentRevenue = products.reduce((s, p) => s + p.units * p.price, 0);
        const gap = Math.max(0, beRevenue - currentRevenue);
        let recHtml = `<div class="badge badge-warning" style="padding:10px; margin-bottom:10px; display:block;">إيرادات التعادل: ${beRevenue.toFixed(0)} ${appCurrency} | وحدات التعادل: ${Math.ceil(beTotalUnits)} | الإيراد الحالي: ${currentRevenue.toFixed(0)} ${appCurrency}</div>`;

        if (gap > 0) {
            // كم قطعة إضافية من أفضل طبق لسد الفجوة
            const needUnits = bestCM && bestCM.cm > 0 ? Math.ceil(gap / bestCM.cm) : 0;
            recHtml += `<div style="background:rgba(16,185,129,0.12); border:1px solid #10b981; color:#6ee7b7; border-radius:12px; padding:12px 14px; margin-bottom:8px; font-size:0.9rem;">
                <strong>💡 لتغطية التكاليف الثابتة:</strong> زد مبيعات <strong>${escapeHtml(bestCM.name)}</strong>
                (أعلى هامش: ${bestCM.cm.toFixed(0)} ${appCurrency}/قطعة) بمقدار <strong>${needUnits}</strong> قطعة إضافية
                → ربح إضافي تقريبي ${ (needUnits * bestCM.cm).toFixed(0) } ${appCurrency}.
            </div>`;
        } else {
            recHtml += `<div style="background:rgba(16,185,129,0.12); border:1px solid #10b981; color:#6ee7b7; border-radius:12px; padding:12px 14px; margin-bottom:8px; font-size:0.9rem;">
                ✅ المبيعات الحالية تغطي نقطة التعادل بفائض ${(currentRevenue - beRevenue).toFixed(0)} ${appCurrency}.
            </div>`;
        }
        if (worstCM && bestCM && worstCM.name !== bestCM.name && worstCM.cm > 0) {
            const shift = Math.min(worstCM.units, Math.ceil(worstCM.units * 0.2));
            const gain = shift * (bestCM.cm - worstCM.cm);
            if (gain > 0) {
                recHtml += `<div style="background:rgba(59,130,246,0.12); border:1px solid #3b82f6; color:#93c5fd; border-radius:12px; padding:12px 14px; margin-bottom:8px; font-size:0.9rem;">
                    <strong>🔄 تحسين المزيج:</strong> تحويل ${shift} قطعة من «${escapeHtml(worstCM.name)}» إلى «${escapeHtml(bestCM.name)}»
                    يزيد الربح بنحو <strong>${gain.toFixed(0)} ${appCurrency}</strong>.
                </div>`;
            }
        }
        if (excluded.length) {
            recHtml += `<div style="background:rgba(239,68,68,0.12); border:1px solid #ef4444; color:#fca5a5; border-radius:12px; padding:12px 14px; font-size:0.9rem;">
                <strong>🛑 أطباق مستبعدة من الحساب (خاسرة):</strong> ${excluded.map(p => p.name).join('، ')}
            </div>`;
        }

        document.getElementById('breakevenSummary').innerHTML = recHtml;
        const ctx = document.getElementById('breakevenChart').getContext('2d');
        if (breakevenChartInstance) breakevenChartInstance.destroy();
        breakevenChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: products.map(p => p.name),
                datasets: [{ label: 'وحدات التعادل', data: products.map(p => Math.ceil(p.beUnits)), backgroundColor: '#b48554' }]
            },
            options: { responsive: true, plugins: { legend: { labels: { color: '#aab7d4' } } }, scales: { x: { ticks: { color: '#aab7d4' } }, y: { ticks: { color: '#aab7d4' } } } }
        });
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

