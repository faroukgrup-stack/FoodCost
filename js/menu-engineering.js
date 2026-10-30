// ============================================================
// menu-engineering.js - هندسة المنيو
// ============================================================

function loadMenuDataFromStorage() {
    const stored = localStorage.getItem('menuEngineeringData_' + currentUserEmail);
    if (stored) try { menuData = JSON.parse(stored); } catch (e) { menuData = {}; }
    allRecipes.forEach(r => {
        if (!menuData[r.name]) {
            // أولوية: سعر البيع الحقيقي المحفوظ → السعر المقترح
            const defaultPrice = (r.sellingPrice && r.sellingPrice > 0) ? r.sellingPrice : (r.suggestedPrice || 0);
            menuData[r.name] = { price: defaultPrice, units: 0, selected: true };
        } else if ((!menuData[r.name].price || menuData[r.name].price <= 0) && r.sellingPrice > 0) {
            menuData[r.name].price = r.sellingPrice;
        }
    });
    saveMenuDataToStorage();
}

function saveMenuDataToStorage() { localStorage.setItem('menuEngineeringData_' + currentUserEmail, JSON.stringify(menuData)); }

function renderMenuInputForm() {
        const container = document.getElementById('menuInputFields');
        if (!allRecipes.length) { container.innerHTML = '<p style="color:var(--text-muted);">لا توجد أطباق.</p>'; return; }
        let html = '<div style="display:grid; grid-template-columns: 30px 1fr 100px 100px auto; gap:10px; align-items:center; font-weight:bold; color:var(--accent-soft); margin-bottom:10px;"><span></span><span>الطبق</span><span>سعر البيع</span><span>المبيعات</span><span>التكلفة</span></div>';
        allRecipes.forEach((r, i) => {
            const d = menuData[r.name] || { price: r.suggestedPrice || 0, units: 0, selected: true };
            html += `<div style="display:grid; grid-template-columns: 30px 1fr 100px 100px auto; gap:10px; align-items:center; margin-bottom:8px;"><input type="checkbox" id="menu_select_${i}" ${d.selected!==false ? 'checked' : ''} onchange="menuData['${escapeHtml(r.name)}'].selected = this.checked; saveMenuDataToStorage();" style="accent-color:var(--accent);"><span style="color:var(--text);">${escapeHtml(r.name)}</span><input type="number" id="menu_price_${i}" value="${d.price}" step="0.01" style="width:100%;"><input type="number" id="menu_units_${i}" value="${d.units}" step="1" style="width:100%;"><span style="color:var(--text-muted);">${(r.costPrice||0).toFixed(2)}</span></div>`;
        });
        container.innerHTML = html;
    }

function saveMenuInputs() {
    allRecipes.forEach((r, i) => {
        const p = document.getElementById(`menu_price_${i}`), u = document.getElementById(`menu_units_${i}`);
        if (p && u) {
            const price = parseFloat(p.value) || 0;
            menuData[r.name] = { price, units: parseInt(u.value) || 0, selected: menuData[r.name]?.selected !== false };
            // مزامنة مع سعر البيع الحقيقي في الأطباق
            r.sellingPrice = price;
        }
    });
    saveMenuDataToStorage();
    showToast('تم حفظ البيانات');
}

function analyzeMenuEngineering() {
        saveMenuInputs();
        const selected = allRecipes.filter(r => menuData[r.name]?.selected !== false).map(r => ({ name: r.name, cost: r.costPrice || 0, price: menuData[r.name]?.price || 0, units: menuData[r.name]?.units || 0 })).filter(d => d.price > 0 && d.units >= 0);
        if (selected.length < 2) { showToast('اختر طبقين على الأقل', true); return; }
        const totalUnits = selected.reduce((s, d) => s + d.units, 0);
        const avgMargin = selected.reduce((s, d) => s + (d.price - d.cost), 0) / selected.length;
        const avgPop = totalUnits > 0 ? 100 / selected.length : 0;
        const results = selected.map(d => {
            const margin = d.price - d.cost, popularity = totalUnits > 0 ? (d.units / totalUnits) * 100 : 0;
            let category, badge, rec;
            if (margin < 0) { category = 'كلب (Dog)'; badge = 'badge-dog'; rec = '🔴 خسارة!'; }
            else {
                if (popularity >= avgPop && margin >= avgMargin) { category = 'نجم (Star)'; badge = 'badge-star'; rec = '✅ ممتاز!'; }
                else if (popularity >= avgPop && margin < avgMargin) { category = 'بقرة نقدية (Cash Cow)'; badge = 'badge-cash'; rec = '🐄 مبيعات عالية.'; }
                else if (popularity < avgPop && margin >= avgMargin) { category = 'علامة استفهام (؟)'; badge = 'badge-question'; rec = '❓ يحتاج تسويق.'; }
                else { category = 'كلب (Dog)'; badge = 'badge-dog'; rec = '🐕 ضعيف.'; }
            }
            return { ...d, margin, popularity, category, badge, rec };
        });
        document.getElementById('menuEngineeringTableContainer').style.display = 'block';
        document.getElementById('menuChartContainer').style.display = 'block';
        document.getElementById('menuSummary').style.display = 'block';
        document.getElementById('menuEngineeringBody').innerHTML = results.map((r, i) => `<tr><td>${i+1}</td><td>${r.name}</td><td>${r.cost.toFixed(2)}</td><td>${r.price.toFixed(2)}</td><td>${r.units}</td><td>${r.margin.toFixed(2)}</td><td>${r.popularity.toFixed(1)}%</td><td><span class="badge ${r.badge}">${r.category}</span></td><td>${r.rec}</td></tr>`).join('');
        if (menuChartInstance) menuChartInstance.destroy();
        const ctx = document.getElementById('menuChart').getContext('2d');
        menuChartInstance = new Chart(ctx, { type: 'scatter', data: { datasets: [{ label: 'الأطباق', data: results.map(r => ({ x: r.popularity, y: r.margin })), backgroundColor: results.map(r => r.badge.includes('star') ? '#28a745' : r.badge.includes('question') ? '#ffc107' : r.badge.includes('cash') ? '#17a2b8' : '#dc3545'), pointRadius: 8 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { x: { title: { display: true, text: 'الشعبية (%)' } }, y: { title: { display: true, text: 'هامش الربح' } } } } });
        const cats = { 'نجم': 0, 'علامة استفهام': 0, 'بقرة نقدية': 0, 'كلب': 0 };
        results.forEach(r => { if (r.category.includes('نجم')) cats['نجم']++; else if (r.category.includes('علامة')) cats['علامة استفهام']++; else if (r.category.includes('بقرة')) cats['بقرة نقدية']++; else cats['كلب']++; });
        document.getElementById('menuSummary').innerHTML = `<div style="display:flex; gap:10px; flex-wrap:wrap;">${Object.entries(cats).map(([k,v])=>`<span class="badge ${k==='نجم'?'badge-star':k==='علامة استفهام'?'badge-question':k==='بقرة نقدية'?'badge-cash':'badge-dog'}" style="padding:10px;">${k}: ${v}</span>`).join('')}</div>`;
        window.lastMenuAnalysis = results;
    }

async function exportMenuAnalysisExcel() {
        if (!window.lastMenuAnalysis || !window.lastMenuAnalysis.length) analyzeMenuEngineering();
        if (!window.lastMenuAnalysis || !window.lastMenuAnalysis.length) { showToast('لا توجد نتائج', true); return; }
        showLoading();
        try {
            const workbook = new ExcelJS.Workbook();
            const ws = workbook.addWorksheet('هندسة المنيو', { views: [{ rightToLeft: true }] });
            ws.columns = [{ header: 'الطبق', width: 25 }, { header: 'التكلفة', width: 12 }, { header: 'سعر البيع', width: 12 }, { header: 'المبيعات', width: 10 }, { header: 'هامش الربح', width: 12 }, { header: 'نسبة المبيعات', width: 12 }, { header: 'التصنيف', width: 18 }, { header: 'التوصية', width: 40 }];
            ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB48554' } };
            window.lastMenuAnalysis.forEach(r => ws.addRow([r.name, r.cost, r.price, r.units, r.margin, r.popularity.toFixed(1) + '%', r.category, r.rec]));
            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `هندسة_المنيو_${new Date().toISOString().slice(0,10)}.xlsx`);
            showToast('✅ تم التصدير');
        } catch (e) { showToast('فشل التصدير', true); } finally { hideLoading(); }
    }

