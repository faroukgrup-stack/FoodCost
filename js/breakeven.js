// ============================================================
// breakeven.js - نقطة التعادل (مصحّحة)
// ============================================================

function renderBreakevenInputs() {
    const container = document.getElementById('breakevenProductsContainer');
    if (!allRecipes.length) {
        container.innerHTML = '<p style="color:var(--text-muted);">لا توجد أطباق.</p>';
        return;
    }
    let html = '<h4 style="color:var(--accent-soft); margin-top:15px;">المبيعات الشهرية لكل طبق</h4>';
    allRecipes.forEach((r, i) => {
        const price = (menuData[r.name]?.price || r.suggestedPrice || 0).toFixed(2);
        html += `<div style="display:flex; gap:10px; align-items:center; margin:8px 0; flex-wrap:wrap;">
            <span style="min-width:150px; color:var(--text);">${escapeHtml(r.name)}</span>
            <input type="number" id="be_units_${i}" placeholder="الوحدات" value="0" step="1" min="0" style="width:120px;">
            <span style="color:var(--text-muted);">التكلفة: ${(r.costPrice || 0).toFixed(2)} | السعر: ${price}</span>
        </div>`;
    });
    container.innerHTML = html;
}

/**
 * حساب نقطة التعادل الصحيحة:
 * - نستخدم مزيج الوحدات (unit mix)
 * - نحسب متوسط هامش المساهمة النقدي للوحدة المرجّح
 * - وحدات التعادل = التكاليف الثابتة ÷ متوسط هامش المساهمة للوحدة
 * - إيرادات التعادل = وحدات التعادل × متوسط سعر البيع المرجّح
 */
function calculateBreakeven() {
    const fixedCosts = parseFloat(document.getElementById('beFixedCosts').value) || 0;
    if (fixedCosts <= 0) {
        showToast('أدخل التكاليف الثابتة', true);
        return;
    }

    const allProducts = [];
    allRecipes.forEach((r, i) => {
        const units = parseInt(document.getElementById(`be_units_${i}`)?.value) || 0;
        if (units > 0) {
            const price = menuData[r.name]?.price || r.suggestedPrice || 0;
            const varCost = r.costPrice || 0;
            allProducts.push({
                name: r.name,
                price,
                varCost,
                units,
                cm: price - varCost
            });
        }
    });

    if (!allProducts.length) {
        showToast('أدخل مبيعات لطبق واحد على الأقل', true);
        return;
    }

    const profitable = allProducts.filter(p => p.cm > 0);
    const lossMaking = allProducts.filter(p => p.cm <= 0);

    const alertDiv = document.getElementById('breakevenAlert');
    alertDiv.style.display = 'block';

    let alertHtml = '';
    if (lossMaking.length > 0) {
        alertHtml += `<div class="badge badge-dog" style="margin-bottom:10px; display:block;">
            <i class="fas fa-exclamation-triangle"></i>
            ${lossMaking.length} طبق بهامش مساهمة صفر أو سالب: ${lossMaking.map(p => p.name).join('، ')}.
            هذه الأطباق تُحسب في السيناريو الأساسي وتُستبعد في السيناريو البديل.
        </div>`;
    }

    if (profitable.length === 0) {
        alertDiv.innerHTML = alertHtml +
            `<div class="badge badge-dog"><i class="fas fa-ban"></i> جميع الأطباق خاسرة أو صفرية. لا يمكن حساب نقطة التعادل.</div>`;
        document.getElementById('breakevenResults').style.display = 'none';
        return;
    }

    alertDiv.innerHTML = alertHtml;

    function computeBE(products) {
        const totalUnits = products.reduce((s, p) => s + p.units, 0);
        if (totalUnits <= 0) return null;

        products.forEach(p => {
            p.mix = p.units / totalUnits;
            p.cm = p.price - p.varCost;
        });

        const weightedCM = products.reduce((s, p) => s + p.mix * p.cm, 0);
        const weightedPrice = products.reduce((s, p) => s + p.mix * p.price, 0);

        if (weightedCM <= 0) return null;

        const beTotalUnits = fixedCosts / weightedCM;
        const beRevenue = beTotalUnits * weightedPrice;

        products.forEach(p => {
            p.beUnits = beTotalUnits * p.mix;
            p.beRevenue = p.beUnits * p.price;
        });

        return {
            products: products.map(p => ({ ...p })),
            beTotalUnits,
            beRevenue,
            weightedCM,
            weightedPrice,
            totalUnits
        };
    }

    const baseResult = computeBE([...allProducts]);
    const cleanResult = computeBE([...profitable]);

    if (!baseResult && !cleanResult) {
        alertDiv.innerHTML += `<div class="badge badge-dog"><i class="fas fa-ban"></i> لا يمكن الوصول لنقطة التعادل بالمزيج الحالي.</div>`;
        document.getElementById('breakevenResults').style.display = 'none';
        return;
    }

    const primary = baseResult || cleanResult;
    const products = primary.products;
    const beRevenue = primary.beRevenue;
    const beTotalUnits = primary.beTotalUnits;

    document.getElementById('breakevenResults').style.display = 'block';

    let tableHtml = `<table>
        <thead>
            <tr>
                <th>الطبق</th>
                <th>المزيج %</th>
                <th>هامش/قطعة</th>
                <th>وحدات التعادل</th>
                <th>إيرادات التعادل</th>
            </tr>
        </thead>
        <tbody>`;

    products.forEach(p => {
        const cmColor = p.cm <= 0 ? 'color:#f87171;' : '';
        tableHtml += `<tr>
            <td>${escapeHtml(p.name)}</td>
            <td>${(p.mix * 100).toFixed(1)}%</td>
            <td style="${cmColor}">${p.cm.toFixed(2)}</td>
            <td>${Math.ceil(p.beUnits)}</td>
            <td>${Math.round(p.beRevenue)}</td>
        </tr>`;
    });
    tableHtml += '</tbody></table>';
    document.getElementById('breakevenTableContainer').innerHTML = tableHtml;

    const bestCM = products.filter(p => p.cm > 0).slice().sort((a, b) => b.cm - a.cm)[0];
    const worstCM = products.filter(p => p.cm > 0).slice().sort((a, b) => a.cm - b.cm)[0];

    const currentRevenue = allProducts.reduce((s, p) => s + p.units * p.price, 0);
    const currentCMTotal = allProducts.reduce((s, p) => s + p.units * p.cm, 0);
    const gapRevenue = Math.max(0, beRevenue - currentRevenue);

    let recHtml = `
        <div class="badge badge-warning" style="padding:12px; margin-bottom:12px; display:block; line-height:1.7;">
            <strong>نقطة التعادل (السيناريو الأساسي):</strong><br>
            إيرادات التعادل: <strong>${Math.round(beRevenue)} ${appCurrency}</strong> |
            وحدات التعادل: <strong>${Math.ceil(beTotalUnits)}</strong><br>
            الإيراد الحالي: <strong>${Math.round(currentRevenue)} ${appCurrency}</strong> |
            إجمالي هامش المساهمة الحالي: <strong>${Math.round(currentCMTotal)} ${appCurrency}</strong>
        </div>`;

    if (cleanResult && lossMaking.length > 0) {
        recHtml += `
        <div style="background:rgba(59,130,246,0.12); border:1px solid #3b82f6; color:#93c5fd; border-radius:12px; padding:12px 14px; margin-bottom:8px; font-size:0.9rem;">
            <strong>📊 بعد استبعاد الأطباق الخاسرة:</strong>
            إيرادات التعادل ≈ <strong>${Math.round(cleanResult.beRevenue)} ${appCurrency}</strong> |
            وحدات التعادل ≈ <strong>${Math.ceil(cleanResult.beTotalUnits)}</strong>
            ${cleanResult.beRevenue < beRevenue ? ' (أفضل)' : ''}
        </div>`;
    }

    if (gapRevenue > 0 && bestCM && bestCM.cm > 0) {
        const needUnits = Math.ceil(gapRevenue / bestCM.cm);
        const extraProfit = needUnits * bestCM.cm;
        recHtml += `
        <div style="background:rgba(16,185,129,0.12); border:1px solid #10b981; color:#6ee7b7; border-radius:12px; padding:12px 14px; margin-bottom:8px; font-size:0.9rem;">
            <strong>💡 لتغطية التكاليف الثابتة:</strong>
            زد مبيعات «${escapeHtml(bestCM.name)}»
            (هامش ${bestCM.cm.toFixed(0)} ${appCurrency}/قطعة)
            بمقدار <strong>${needUnits}</strong> قطعة إضافية
            → يضيف تقريبًا <strong>${Math.round(extraProfit)} ${appCurrency}</strong> من هامش المساهمة.
        </div>`;
    } else if (gapRevenue <= 0) {
        recHtml += `
        <div style="background:rgba(16,185,129,0.12); border:1px solid #10b981; color:#6ee7b7; border-radius:12px; padding:12px 14px; margin-bottom:8px; font-size:0.9rem;">
            ✅ المبيعات الحالية تغطي نقطة التعادل بفائض إيرادات ≈ <strong>${Math.round(currentRevenue - beRevenue)} ${appCurrency}</strong>.
        </div>`;
    }

    if (worstCM && bestCM && worstCM.name !== bestCM.name && worstCM.cm > 0) {
        const shift = Math.min(worstCM.units, Math.ceil(worstCM.units * 0.2));
        const gain = shift * (bestCM.cm - worstCM.cm);
        if (gain > 0) {
            recHtml += `
            <div style="background:rgba(59,130,246,0.12); border:1px solid #3b82f6; color:#93c5fd; border-radius:12px; padding:12px 14px; margin-bottom:8px; font-size:0.9rem;">
                <strong>🔄 تحسين المزيج:</strong>
                تحويل ${shift} قطعة من «${escapeHtml(worstCM.name)}» إلى «${escapeHtml(bestCM.name)}»
                يزيد هامش المساهمة بنحو <strong>${Math.round(gain)} ${appCurrency}</strong>.
            </div>`;
        }
    }

    if (lossMaking.length) {
        recHtml += `
        <div style="background:rgba(239,68,68,0.12); border:1px solid #ef4444; color:#fca5a5; border-radius:12px; padding:12px 14px; font-size:0.9rem;">
            <strong>🛑 أطباق ذات هامش صفر أو سالب:</strong>
            ${lossMaking.map(p => `${p.name} (${p.cm.toFixed(1)})`).join('، ')}
            — يُفضّل إعادة تسعيرها أو إيقافها.
        </div>`;
    }

    document.getElementById('breakevenSummary').innerHTML = recHtml;

    const ctx = document.getElementById('breakevenChart').getContext('2d');
    if (breakevenChartInstance) breakevenChartInstance.destroy();
    breakevenChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: products.map(p => p.name),
            datasets: [{
                label: 'وحدات التعادل',
                data: products.map(p => Math.ceil(p.beUnits)),
                backgroundColor: products.map(p => p.cm <= 0 ? '#ef4444' : '#b48554')
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { labels: { color: '#aab7d4' } },
                tooltip: {
                    callbacks: {
                        afterLabel: (ctx) => {
                            const p = products[ctx.dataIndex];
                            return p ? `هامش القطعة: ${p.cm.toFixed(1)}` : '';
                        }
                    }
                }
            },
            scales: {
                x: { ticks: { color: '#aab7d4' } },
                y: { ticks: { color: '#aab7d4' }, beginAtZero: true }
            }
        }
    });

    window.lastBreakeven = {
        products,
        excluded: lossMaking,
        beRevenue,
        beTotalUnits,
        fixedCosts,
        cleanResult: cleanResult || null,
        baseResult: baseResult || null
    };
}

async function exportBreakevenExcel() {
    if (!window.lastBreakeven) calculateBreakeven();
    if (!window.lastBreakeven) {
        showToast('لا توجد نتائج', true);
        return;
    }
    showLoading();
    try {
        const workbook = new ExcelJS.Workbook();
        const ws = workbook.addWorksheet('نقطة التعادل', { views: [{ rightToLeft: true }] });

        ws.columns = [
            { header: 'الطبق', width: 25 },
            { header: 'المزيج %', width: 12 },
            { header: 'هامش/قطعة', width: 14 },
            { header: 'وحدات التعادل', width: 15 },
            { header: 'إيرادات التعادل', width: 18 }
        ];
        ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB48554' } };

        window.lastBreakeven.products.forEach(p => {
            ws.addRow([
                p.name,
                (p.mix * 100).toFixed(1) + '%',
                +p.cm.toFixed(2),
                Math.ceil(p.beUnits),
                Math.round(p.beRevenue)
            ]);
        });

        ws.addRow([]);
        ws.addRow(['التكاليف الثابتة', window.lastBreakeven.fixedCosts]);
        ws.addRow(['إجمالي وحدات التعادل', Math.ceil(window.lastBreakeven.beTotalUnits)]);
        ws.addRow(['إجمالي إيرادات التعادل', Math.round(window.lastBreakeven.beRevenue)]);

        if (window.lastBreakeven.excluded && window.lastBreakeven.excluded.length) {
            ws.addRow([]);
            ws.addRow(['أطباق مستبعدة / خاسرة']);
            window.lastBreakeven.excluded.forEach(p => {
                ws.addRow([p.name, '', p.cm.toFixed(2)]);
            });
        }

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `نقطة_التعادل_${new Date().toISOString().slice(0, 10)}.xlsx`);
        showToast('✅ تم التصدير');
    } catch (e) {
        showToast('فشل التصدير', true);
    } finally {
        hideLoading();
    }
}
