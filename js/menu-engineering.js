// ============================================================
// menu-engineering.js - هندسة المنيو (توصيات رقمية + تنبيهات الهامش)
// ============================================================

function loadMenuDataFromStorage() {
    const stored = localStorage.getItem('menuEngineeringData_' + currentUserEmail);
    if (stored) try { menuData = JSON.parse(stored); } catch (e) { menuData = {}; }
    allRecipes.forEach(r => {
        if (!menuData[r.name]) {
            const defaultPrice = (r.sellingPrice && r.sellingPrice > 0) ? r.sellingPrice : (r.suggestedPrice || 0);
            menuData[r.name] = { price: defaultPrice, units: 0, selected: true };
        } else if ((!menuData[r.name].price || menuData[r.name].price <= 0) && r.sellingPrice > 0) {
            menuData[r.name].price = r.sellingPrice;
        }
    });
    // ترحيل v4.3: فصل سعر التحليل عن سعر الطبق (مرة واحدة)
    if (!localStorage.getItem('fcPriceSrcInit_' + currentUserEmail)) { localStorage.setItem('fcPriceSrcInit_' + currentUserEmail, '1'); applyPriceSrc(); return; }
    saveMenuDataToStorage();
}

function saveMenuDataToStorage() {
    localStorage.setItem('menuEngineeringData_' + currentUserEmail, JSON.stringify(menuData));
}

// ---------- مصدر سعر التحليل (لا يغيّر سعر الطبق في قائمة الأطباق) ----------
function getPriceSrc() { return localStorage.getItem('fcPriceSrc_' + currentUserEmail) === 'sales' ? 'sales' : 'list'; }
function setPriceSrc(v) { localStorage.setItem('fcPriceSrc_' + currentUserEmail, v === 'sales' ? 'sales' : 'list'); }
function listPriceOf(r) { return (r.sellingPrice && r.sellingPrice > 0) ? +r.sellingPrice : (+r.suggestedPrice || 0); }
// تطبيق المصدر المختار على أسعار التحليل
function applyPriceSrc() {
    const src = getPriceSrc();
    allRecipes.forEach(r => {
        const d = menuData[r.name] = menuData[r.name] || { price: 0, units: 0, selected: true };
        d.price = (src === 'sales' && d.salesPrice > 0) ? d.salesPrice : listPriceOf(r);
    });
    (window.ME_EXTRA || []).forEach(x => { x.price = (src === 'sales' && x.salesPrice > 0) ? x.salesPrice : (x.listPrice || x.salesPrice || 0); });
    (window.BE_EXTRA || []).forEach(x => { x.price = (src === 'sales' && x.salesPrice > 0) ? x.salesPrice : (x.listPrice || x.salesPrice || 0); });
    saveMenuDataToStorage();
}
function filterRows(container, q) {
    q = String(q || '').trim().toLowerCase();
    container.querySelectorAll('[data-rowname]').forEach(el => { el.style.display = !q || el.dataset.rowname.toLowerCase().indexOf(q) >= 0 ? '' : 'none'; });
}

function renderMenuInputForm() {
    const container = document.getElementById('menuInputFields');
    if (!allRecipes.length && !(window.ME_EXTRA || []).length) { container.innerHTML = '<p style="color:var(--text-muted);">لا توجد أطباق.</p>'; return; }
    const src = getPriceSrc(), q = container.dataset.q || '';
    const G = 'display:grid; grid-template-columns: 30px minmax(120px,1fr) 90px 100px 90px 80px; gap:10px; align-items:center;';
    let html = '<div class="tbl-search"><input type="search" id="meSearch" class="biz-search" placeholder="ابحث عن طبق..." value="' + escapeHtml(q) + '"><span class="muted" style="font-size:12px">سعر التحليل حالياً: <b>' + (src === 'sales' ? 'من المبيعات الفعلية' : 'من قائمة الأطباق (السعر الحالي)') + '</b> — تعديله هنا لا يغيّر سعر الطبق في قائمة الأطباق</span></div>';
    html += `<div style="${G} font-weight:bold; color:var(--accent-soft); margin-bottom:10px; font-size:13px;"><span></span><span>الطبق</span><span>سعر القائمة</span><span>سعر التحليل</span><span>المبيعات</span><span>التكلفة</span></div>`;
    allRecipes.forEach((r, i) => {
        const d = menuData[r.name] || { price: listPriceOf(r), units: 0, selected: true };
        const sp = d.salesPrice > 0 && Math.abs(d.salesPrice - listPriceOf(r)) > 0.009 ? `<small class="muted" style="display:block;font-size:11px">بيع فعلي: ${(+d.salesPrice).toFixed(2)}</small>` : '';
        html += `<div data-rowname="${escapeHtml(r.name)}" style="${G} margin-bottom:8px;"><input type="checkbox" id="menu_select_${i}" ${d.selected!==false ? 'checked' : ''} onchange="(menuData['${escapeHtml(r.name)}']||{}).selected = this.checked; saveMenuDataToStorage();" style="accent-color:var(--accent);"><span style="color:var(--text);">${escapeHtml(r.name)}</span><span style="color:var(--text-muted);">${listPriceOf(r).toFixed(2)}${sp}</span><input type="number" id="menu_price_${i}" value="${(+d.price || 0)}" step="0.01" style="width:100%;"><input type="number" id="menu_units_${i}" value="${d.units}" step="1" style="width:100%;"><span style="color:var(--text-muted);">${(r.costPrice||0).toFixed(2)}</span></div>`;
    });
    const ex = window.ME_EXTRA || [];
    if (ex.length) {
        html += '<div style="margin:14px 0 8px;font-weight:bold;color:var(--accent-soft)">أصناف مبيعة غير مربوطة بوصفة <small class="muted" style="font-weight:normal">— محسوبة من المبيعات، أدخل تكلفتها لتدخل التحليل بدقة (أو اربطها بطبق من: المنتجات ← الوصفة المرتبطة)</small></div>';
        ex.forEach((x, j) => {
            html += `<div data-rowname="${escapeHtml(x.name)}" style="${G} margin-bottom:8px;"><input type="checkbox" id="mex_sel_${j}" ${x.selected!==false ? 'checked' : ''} style="accent-color:var(--accent);"><span style="color:var(--text);">${escapeHtml(x.name)} <span class="src-tag">غير مربوط</span></span><span style="color:var(--text-muted);">${(x.listPrice||0).toFixed(2)}</span><input type="number" id="mex_price_${j}" value="${+x.price||0}" step="0.01" style="width:100%;"><input type="number" id="mex_units_${j}" value="${x.units||0}" step="1" style="width:100%;"><input type="number" id="mex_cost_${j}" value="${+x.cost||0}" step="0.01" title="التكلفة" style="width:100%;"></div>`;
        });
    }
    container.innerHTML = html;
    const s = container.querySelector('#meSearch');
    s.addEventListener('input', () => { container.dataset.q = s.value; filterRows(container, s.value); });
    if (q) filterRows(container, q);
}

function saveMenuInputs() {
    // يحفظ أسعار وكميات التحليل فقط — سعر الطبق في قائمة الأطباق لا يتغير من هنا
    allRecipes.forEach((r, i) => {
        const p = document.getElementById(`menu_price_${i}`), u = document.getElementById(`menu_units_${i}`), sel = document.getElementById(`menu_select_${i}`);
        if (p && u) {
            const old = menuData[r.name] || {};
            menuData[r.name] = Object.assign({}, old, { price: parseFloat(p.value) || 0, units: parseInt(u.value) || 0, selected: sel ? sel.checked : old.selected !== false });
        }
    });
    (window.ME_EXTRA || []).forEach((x, j) => {
        const p = document.getElementById(`mex_price_${j}`); if (!p) return;
        x.price = parseFloat(p.value) || 0; x.units = parseInt(document.getElementById(`mex_units_${j}`).value) || 0;
        x.cost = parseFloat(document.getElementById(`mex_cost_${j}`).value) || 0; x.selected = document.getElementById(`mex_sel_${j}`).checked;
    });
    saveMenuDataToStorage();
    showToast('تم حفظ بيانات التحليل');
}

function analyzeMenuEngineering() {
    saveMenuInputs();
    const selected = allRecipes
        .filter(r => menuData[r.name]?.selected !== false)
        .map(r => ({
            name: r.name,
            cost: r.costPrice || 0,
            price: menuData[r.name]?.price || 0,
            units: menuData[r.name]?.units || 0
        }))
        .filter(d => d.price > 0 && d.units >= 0)
        .concat((window.ME_EXTRA || []).filter(x => x.selected !== false && x.price > 0).map(x => ({ name: x.name + ' (غير مربوط)', cost: +x.cost || 0, price: +x.price, units: +x.units || 0 })));

    if (selected.length < 2) { showToast('اختر طبقين على الأقل', true); return; }

    const totalUnits = selected.reduce((s, d) => s + d.units, 0);
    const avgMargin = selected.reduce((s, d) => s + (d.price - d.cost), 0) / selected.length;
    const avgPop = totalUnits > 0 ? 100 / selected.length : 0;
    const minMarginAmount = avgMargin; // مقارنة بالنسبة للمتوسط
    const marginThresholdPct = minMarginPercent || 30; // من الإعدادات

    // أعلى هامش مطلق للمقارنة في التوصيات
    const maxMarginDish = selected.reduce((best, d) => {
        const m = d.price - d.cost;
        return (!best || m > best.margin) ? { name: d.name, margin: m, units: d.units, price: d.price, cost: d.cost } : best;
    }, null);

    const results = selected.map(d => {
        const margin = d.price - d.cost;
        const marginPct = d.price > 0 ? (margin / d.price * 100) : 0;
        const popularity = totalUnits > 0 ? (d.units / totalUnits) * 100 : 0;
        let category, badge, rec;

        if (margin < 0) {
            category = 'كلب (Dog)';
            badge = 'badge-dog';
            // توصية رقمية: رفع السعر لتغطية التكلفة + هامش الحد الأدنى
            const targetPrice = d.cost / (1 - marginThresholdPct / 100);
            rec = `🔴 خسارة! ارفع السعر إلى ${targetPrice.toFixed(0)} ${appCurrency} على الأقل (هامش ${marginThresholdPct}%)`;
        } else if (popularity >= avgPop && margin >= avgMargin) {
            category = 'نجم (Star)';
            badge = 'badge-star';
            rec = `✅ حافظ على الجودة. هامش ${margin.toFixed(0)} ${appCurrency} | ${marginPct.toFixed(0)}%`;
        } else if (popularity >= avgPop && margin < avgMargin) {
            category = 'بقرة نقدية (Cash Cow)';
            badge = 'badge-cash';
            // تنبيه إذا الهامش % أقل من الحد المسجل
            if (marginPct < marginThresholdPct) {
                const targetPrice = d.cost / (1 - marginThresholdPct / 100);
                const lift = Math.max(0, Math.ceil(targetPrice - d.price));
                rec = `مبيعات عالية لكن الهامش ${marginPct.toFixed(0)}% < الحد ${marginThresholdPct}% — ارفع السعر بـ ${lift} ${appCurrency} أو خفّض التكلفة`;
            } else {
                rec = `🐄 مبيعات عالية. هامش ${marginPct.toFixed(0)}% مقبول — راقب التكلفة`;
            }
        } else if (popularity < avgPop && margin >= avgMargin) {
            category = 'علامة استفهام (؟)';
            badge = 'badge-question';
            // كم قطعة للوصول لمتوسط الشعبية
            const targetUnits = Math.ceil(avgPop / 100 * totalUnits);
            const need = Math.max(0, targetUnits - d.units);
            rec = `❓ هامش ممتاز (${margin.toFixed(0)} ${appCurrency}). زد المبيعات بـ ${need} قطعة للوصول لمتوسط الشعبية`;
        } else {
            category = 'كلب (Dog)';
            badge = 'badge-dog';
            if (marginPct < marginThresholdPct) {
                const targetPrice = d.cost / (1 - marginThresholdPct / 100);
                rec = `🐕 ضعيف. ارفع السعر إلى ${targetPrice.toFixed(0)} ${appCurrency} أو قلل المكونات`;
            } else {
                rec = `🐕 شعبية منخفضة. ركّز التسويق أو أعد تقييم الطبق`;
            }
        }

        return { ...d, margin, marginPct, popularity, category, badge, rec };
    });

    // توصيات استراتيجية عامة مبنية على الأرقام
    const stars = results.filter(r => r.category.includes('نجم'));
    const questions = results.filter(r => r.category.includes('علامة'));
    const cashCowsLowMargin = results.filter(r => r.category.includes('بقرة') && r.marginPct < marginThresholdPct);
    const dogs = results.filter(r => r.category.includes('كلب'));

    let strategyHtml = '<div style="margin-top:14px; display:flex; flex-direction:column; gap:8px;">';
    if (maxMarginDish && maxMarginDish.margin > 0) {
        const targetBoost = Math.max(maxMarginDish.units, Math.ceil(avgPop / 100 * totalUnits));
        strategyHtml += `<div style="background:rgba(16,185,129,0.12); border:1px solid #10b981; color:#6ee7b7; border-radius:12px; padding:10px 14px; font-size:0.9rem;">
            <strong>🎯 أعلى هامش مساهمة:</strong> ${escapeHtml(maxMarginDish.name)} (${maxMarginDish.margin.toFixed(0)} ${appCurrency}/<span>قطعة</span>).
            <span>زيادة مبيعاته إلى</span> <strong>${targetBoost}</strong> <span>قطعة تضيف تقريباً</span> <strong>${((targetBoost - maxMarginDish.units) * maxMarginDish.margin).toFixed(0)} ${appCurrency}</strong> <span>ربحاً إضافياً.</span>
        </div>`;
    }
    if (cashCowsLowMargin.length) {
        strategyHtml += `<div style="background:rgba(245,158,11,0.12); border:1px solid #f59e0b; color:#fcd34d; border-radius:12px; padding:10px 14px; font-size:0.9rem;">
            <strong>أطباق مبيعات عالية بهامش ضعيف:</strong> ${cashCowsLowMargin.map(r => r.name + ' (' + r.marginPct.toFixed(0) + '%)').join('، ')} — راجع التسعير فوراً.
        </div>`;
    }
    if (questions.length) {
        strategyHtml += `<div style="background:rgba(59,130,246,0.12); border:1px solid #3b82f6; color:#93c5fd; border-radius:12px; padding:10px 14px; font-size:0.9rem;">
            <strong>📈 فرص نمو:</strong> ${questions.map(r => r.name).join('، ')} — هامش جيد وشعبية منخفضة، يستحقون تسويقاً مركزاً.
        </div>`;
    }
    if (dogs.filter(d => d.margin < 0).length) {
        strategyHtml += `<div style="background:rgba(239,68,68,0.12); border:1px solid #ef4444; color:#fca5a5; border-radius:12px; padding:10px 14px; font-size:0.9rem;">
            <strong>🛑 أطباق خاسرة:</strong> ${dogs.filter(d => d.margin < 0).map(r => r.name).join('، ')} — أوقفها أو أعد تسعيرها.
        </div>`;
    }
    strategyHtml += '</div>';

    document.getElementById('menuEngineeringTableContainer').style.display = 'block';
    document.getElementById('menuChartContainer').style.display = 'block';
    document.getElementById('menuSummary').style.display = 'block';

    document.getElementById('menuEngineeringBody').innerHTML = results.map((r, i) => {
        const warnStyle = (r.category.includes('بقرة') && r.marginPct < marginThresholdPct) ? 'background:rgba(245,158,11,0.08);' : '';
        return `<tr style="${warnStyle}"><td>${i+1}</td><td>${escapeHtml(r.name)}</td><td>${r.cost.toFixed(2)}</td><td>${r.price.toFixed(2)}</td><td>${r.units}</td><td>${r.margin.toFixed(2)} <small style="color:var(--text-muted)">(${r.marginPct.toFixed(0)}%)</small></td><td>${r.popularity.toFixed(1)}%</td><td><span class="badge ${r.badge}">${r.category}</span></td><td style="font-size:0.85rem; max-width:280px;">${r.rec}</td></tr>`;
    }).join('');

    if (menuChartInstance) menuChartInstance.destroy();
    const ctx = document.getElementById('menuChart').getContext('2d');
    menuChartInstance = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: ((window.FC_I18N && window.FC_I18N['الأطباق']) || 'الأطباق'),
                data: results.map(r => ({ x: r.popularity, y: r.margin, label: r.name })),
                backgroundColor: results.map(r => r.badge.includes('star') ? '#28a745' : r.badge.includes('question') ? '#ffc107' : r.badge.includes('cash') ? '#17a2b8' : '#dc3545'),
                pointRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { title: { display: true, text: ((window.FC_I18N && window.FC_I18N['الشعبية (%)']) || 'الشعبية (%)'), color: '#aab7d4' }, ticks: { color: '#aab7d4' } },
                y: { title: { display: true, text: ((window.FC_I18N && window.FC_I18N['هامش المساهمة (']) || 'هامش المساهمة (') + appCurrency + ')', color: '#aab7d4' }, ticks: { color: '#aab7d4' } }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const r = results[ctx.dataIndex];
                            return r ? `${r.name}: هامش ${r.margin.toFixed(1)} | شعبية ${r.popularity.toFixed(1)}%` : '';
                        }
                    }
                }
            }
        }
    });

    const cats = { 'نجم': 0, 'علامة استفهام': 0, 'بقرة نقدية': 0, 'كلب': 0 };
    results.forEach(r => {
        if (r.category.includes('نجم')) cats['نجم']++;
        else if (r.category.includes('علامة')) cats['علامة استفهام']++;
        else if (r.category.includes('بقرة')) cats['بقرة نقدية']++;
        else cats['كلب']++;
    });
    document.getElementById('menuSummary').innerHTML =
        `<div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:8px;">${Object.entries(cats).map(([k,v]) =>
            `<span class="badge ${k==='نجم'?'badge-star':k==='علامة استفهام'?'badge-question':k==='بقرة نقدية'?'badge-cash':'badge-dog'}" style="padding:10px;">${k}: ${v}</span>`
        ).join('')}</div>
        <p style="color:var(--text-muted); font-size:0.85rem; margin:6px 0;">حد هامش المساهمة الأدنى من الإعدادات: <strong style="color:var(--accent-soft)">${marginThresholdPct}%</strong> | متوسط الهامش: <strong>${avgMargin.toFixed(1)} ${appCurrency}</strong></p>
        ${strategyHtml}`;

    window.lastMenuAnalysis = results;
}

async function exportMenuAnalysisExcel() {
    if (!window.lastMenuAnalysis || !window.lastMenuAnalysis.length) analyzeMenuEngineering();
    if (!window.lastMenuAnalysis || !window.lastMenuAnalysis.length) { showToast('لا توجد نتائج', true); return; }
    showLoading();
    try {
        const workbook = new ExcelJS.Workbook();
        const ws = workbook.addWorksheet('هندسة المنيو', { views: [{ rightToLeft: true }] });
        ws.columns = [
            { header: 'الطبق', width: 25 }, { header: 'التكلفة', width: 12 },
            { header: 'سعر البيع', width: 12 }, { header: 'المبيعات', width: 10 },
            { header: 'هامش المساهمة', width: 14 }, { header: 'هامش %', width: 10 },
            { header: 'نسبة المبيعات', width: 12 }, { header: 'التصنيف', width: 18 },
            { header: 'التوصية', width: 50 }
        ];
        window.lastMenuAnalysis.forEach(r => ws.addRow([
            r.name, r.cost, r.price, r.units, r.margin,
            (r.marginPct || 0).toFixed(1) + '%',
            r.popularity.toFixed(1) + '%', r.category, r.rec
        ]));
        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `هندسة_المنيور_${new Date().toISOString().slice(0,10)}.xlsx`);
        showToast('✅ تم التصدير');
    } catch (e) { showToast('فشل التصدير', true); }
    finally { hideLoading(); }
}
