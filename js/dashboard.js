// ============================================================
// dashboard.js - لوحة التحكم (محدّثة)
// ============================================================

let dashChartFoodCost = null;
let dashChartMargins = null;

function getRealPrice(recipe) {
    // الأولوية: السعر الحقيقي من هندسة المنيو → سعر البيع المحفوظ → السعر المقترح
    const fromMenu = menuData[recipe.name]?.price;
    if (fromMenu && fromMenu > 0) return fromMenu;
    if (recipe.sellingPrice && recipe.sellingPrice > 0) return recipe.sellingPrice;
    if (recipe.actualPrice && recipe.actualPrice > 0) return recipe.actualPrice;
    return recipe.suggestedPrice || 0;
}

function computeClientLossDishes() {
    // حساب الأطباق الخاسرة محلياً باستخدام السعر الحقيقي
    return allRecipes
        .map(r => {
            const cost = r.costPrice || 0;
            const price = getRealPrice(r);
            return { name: r.name, cost, price, margin: price - cost };
        })
        .filter(d => d.cost > 0 && d.price > 0 && d.cost > d.price)
        .sort((a, b) => (a.cost - a.price) - (b.cost - b.price));
}

function computeClientFoodCost() {
    // متوسط Food Cost الفعلي بناءً على السعر الحقيقي
    let totalCost = 0, totalPrice = 0, count = 0;
    allRecipes.forEach(r => {
        const cost = r.costPrice || 0;
        const price = getRealPrice(r);
        if (cost > 0 && price > 0) {
            totalCost += cost;
            totalPrice += price;
            count++;
        }
    });
    if (totalPrice <= 0) return 0;
    return ((totalCost / totalPrice) * 100);
}

async function loadDashboard() {
    showLoading();
    try {
        // تحميل البيانات الأساسية إن لم تكن محملة
        if (!dataLoaded) await loadAllData(false);
        loadMenuDataFromStorage();

        // محاولة جلب بيانات السيرفر
        let res = { success: false };
        try {
            res = await callServer('getDashboardData', {}, false);
        } catch (e) { /* نكمل بالحساب المحلي */ }

        // ===== الإحصائيات =====
        const clientFoodCost = computeClientFoodCost();
        const targetFC = (res.success && res.summary) ? res.summary.targetFoodCost : (foodCostPercent || 30);
        const recipesCount = allRecipes.length;
        const materialsCount = allMaterials.length;

        // التقييمات من السيرفر إن وجدت
        const avgRating = (res.success && res.summary) ? (res.summary.avgRating || 0) : 0;
        const reviewsCount = (res.success && res.summary) ? (res.summary.reviewsCount || 0) : 0;

        // نفضّل Food Cost المحسوب من الأسعار الحقيقية
        const actualFC = clientFoodCost > 0 ? clientFoodCost : ((res.success && res.summary) ? res.summary.actualFoodCost : 0);
        const foodCostColor = actualFC > targetFC + 3 ? '#ef4444' :
                              actualFC > targetFC ? '#f59e0b' : '#10b981';

        document.getElementById('dashboardCards').innerHTML = `
            <div class="dash-card">
                <div class="label">عدد الأطباق</div>
                <div class="value">${recipesCount}</div>
            </div>
            <div class="dash-card">
                <div class="label">المواد الأولية</div>
                <div class="value">${materialsCount}</div>
            </div>
            <div class="dash-card">
                <div class="label">Food Cost الفعلي</div>
                <div class="value" style="color:${foodCostColor}">${actualFC.toFixed(1)}%</div>
                <div class="sub">المستهدف: ${targetFC}%</div>
            </div>
            <div class="dash-card">
                <div class="label">متوسط التقييمات</div>
                <div class="value">${avgRating > 0 ? avgRating + ' ★' : '—'}</div>
                <div class="sub">${reviewsCount} تقييم</div>
            </div>
        `;

        // ===== التنبيهات =====
        const alertsDiv = document.getElementById('dashboardAlerts');
        const clientLoss = computeClientLossDishes();
        let alertsHtml = '';

        // تنبيه Food Cost
        if (actualFC > targetFC + 3) {
            alertsHtml += `<div style="background:rgba(239,68,68,0.15); border:1px solid #ef4444; color:#fca5a5; border-radius:12px; padding:12px 16px; margin-bottom:10px; display:flex; align-items:center; gap:12px;">
                <i class="fas fa-exclamation-triangle" style="font-size:1.3rem;"></i>
                <div><strong>Food Cost مرتفع</strong><br><span style="font-size:0.9rem;">الفعلي ${actualFC.toFixed(1)}% أعلى من المستهدف ${targetFC}%</span></div>
            </div>`;
        }

        // تنبيه أطباق خاسرة (فقط إذا كانت تكلفة وسعر حقيقيان)
        if (clientLoss.length > 0) {
            alertsHtml += `<div style="background:rgba(239,68,68,0.15); border:1px solid #ef4444; color:#fca5a5; border-radius:12px; padding:12px 16px; margin-bottom:10px; display:flex; align-items:center; justify-content:space-between; gap:12px;">
                <div style="display:flex; align-items:center; gap:12px;">
                    <i class="fas fa-exclamation-circle" style="font-size:1.3rem;"></i>
                    <div><strong>أطباق خاسرة</strong><br><span style="font-size:0.9rem;">يوجد ${clientLoss.length} طبق تكلفته أعلى من سعر البيع الحقيقي</span></div>
                </div>
            </div>`;
        }

        // تنبيهات السيرفر الإضافية (تغيرات أسعار وغيرها)
        if (res.success && res.alerts) {
            res.alerts.forEach(a => {
                // تجاهل تنبيهات الخسارة من السيرفر لأننا نحسبها محلياً بدقة أعلى
                if (a.title && a.title.includes('خاسر')) return;
                const colors = {
                    danger: 'rgba(239,68,68,0.15); border-color:#ef4444; color:#fca5a5',
                    warning: 'rgba(245,158,11,0.15); border-color:#f59e0b; color:#fcd34d',
                    info: 'rgba(59,130,246,0.15); border-color:#3b82f6; color:#93c5fd'
                };
                alertsHtml += `<div style="background:${colors[a.type] || colors.info}; border:1px solid; border-radius:12px; padding:12px 16px; margin-bottom:10px; display:flex; align-items:center; gap:12px;">
                    <i class="fas fa-${a.icon || 'info-circle'}" style="font-size:1.3rem;"></i>
                    <div><strong>${a.title}</strong><br><span style="font-size:0.9rem;">${a.message}</span></div>
                </div>`;
            });
        }

        if (!alertsHtml) {
            alertsHtml = `<div style="background:rgba(16,185,129,0.12); border:1px solid #10b981; color:#6ee7b7; border-radius:12px; padding:12px 16px;">
                <i class="fas fa-check-circle"></i> كل شيء يبدو جيداً حالياً
            </div>`;
        }
        alertsDiv.innerHTML = alertsHtml;

        // ===== الأطباق الخاسرة (محسوبة محلياً) =====
        const lossDiv = document.getElementById('dashboardLossDishes');
        if (clientLoss.length > 0) {
            lossDiv.innerHTML = `<table style="width:100%; font-size:0.9rem;"><thead><tr><th>الطبق</th><th>التكلفة</th><th>سعر البيع</th><th>الخسارة</th></tr></thead>
                <tbody>${clientLoss.map(d => `<tr>
                    <td>${escapeHtml(d.name)}</td>
                    <td style="color:#f87171;">${d.cost.toFixed(2)}</td>
                    <td>${d.price.toFixed(2)}</td>
                    <td style="color:#f87171; font-weight:700;">${(d.cost - d.price).toFixed(2)}</td>
                </tr>`).join('')}</tbody></table>`;
        } else {
            lossDiv.innerHTML = '<p style="color:var(--text-muted); text-align:center;">لا توجد أطباق خاسرة 👍</p>';
        }

        // ===== تغيرات الأسعار =====
        const priceDiv = document.getElementById('dashboardPriceChanges');
        if (res.success && res.recentPriceChanges && res.recentPriceChanges.length) {
            priceDiv.innerHTML = `<table style="width:100%; font-size:0.85rem;"><thead><tr><th>المادة</th><th>التغير</th><th>التاريخ</th></tr></thead>
                <tbody>${res.recentPriceChanges.map(c => {
                    const color = c.changePercent > 0 ? '#f87171' : '#6ee7b7';
                    const sign = c.changePercent > 0 ? '+' : '';
                    return `<tr><td>${escapeHtml(c.materialName)}</td><td style="color:${color}; font-weight:700;">${sign}${c.changePercent}%</td><td>${new Date(c.date).toLocaleDateString('ar-EG')}</td></tr>`;
                }).join('')}</tbody></table>`;
        } else {
            priceDiv.innerHTML = '<p style="color:var(--text-muted); text-align:center;">لا توجد تغيرات أسعار حديثة</p>';
        }

        // ===== الرسوم البيانية =====
        renderDashboardCharts(actualFC, targetFC);

    } catch (e) {
        console.error(e);
        showToast('خطأ في تحميل لوحة التحكم', true);
    } finally {
        hideLoading();
    }
}

function renderDashboardCharts(actualFC, targetFC) {
    // تأكد من وجود حاوية الرسوم
    let chartsContainer = document.getElementById('dashboardCharts');
    if (!chartsContainer) {
        const grid = document.getElementById('dashboardGrid');
        if (!grid) return;
        chartsContainer = document.createElement('div');
        chartsContainer.id = 'dashboardCharts';
        chartsContainer.style.cssText = 'display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:24px;';
        chartsContainer.innerHTML = `
            <div class="table-container" style="padding:20px;">
                <h4 style="color:var(--accent-soft); margin-bottom:15px;"><i class="fas fa-chart-pie"></i> Food Cost vs المستهدف</h4>
                <div style="position:relative; height:220px;"><canvas id="dashChartFoodCost"></canvas></div>
            </div>
            <div class="table-container" style="padding:20px;">
                <h4 style="color:var(--accent-soft); margin-bottom:15px;"><i class="fas fa-chart-bar"></i> هامش المساهمة للأطباق</h4>
                <div style="position:relative; height:220px;"><canvas id="dashChartMargins"></canvas></div>
            </div>
        `;
        grid.parentNode.insertBefore(chartsContainer, grid);
    }

    // رسم Food Cost (Doughnut)
    const fcCtx = document.getElementById('dashChartFoodCost');
    if (fcCtx && typeof Chart !== 'undefined') {
        if (dashChartFoodCost) dashChartFoodCost.destroy();
        const remaining = Math.max(0, 100 - actualFC);
        dashChartFoodCost = new Chart(fcCtx, {
            type: 'doughnut',
            data: {
                labels: ['Food Cost', 'الهامش'],
                datasets: [{
                    data: [actualFC.toFixed(1), remaining.toFixed(1)],
                    backgroundColor: [
                        actualFC > targetFC + 3 ? '#ef4444' : actualFC > targetFC ? '#f59e0b' : '#10b981',
                        'rgba(180,133,84,0.2)'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#aab7d4', font: { family: 'Tajawal' } } },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => ctx.label + ': ' + ctx.raw + '%'
                        }
                    }
                },
                cutout: '65%'
            }
        });
    }

    // رسم هامش المساهمة (Bar)
    const marginCtx = document.getElementById('dashChartMargins');
    if (marginCtx && typeof Chart !== 'undefined') {
        if (dashChartMargins) dashChartMargins.destroy();

        const dishes = allRecipes
            .map(r => {
                const cost = r.costPrice || 0;
                const price = getRealPrice(r);
                const margin = price > 0 ? ((price - cost) / price * 100) : 0;
                return { name: r.name, margin, cost, price };
            })
            .filter(d => d.price > 0)
            .sort((a, b) => b.margin - a.margin)
            .slice(0, 8);

        if (dishes.length === 0) {
            marginCtx.parentNode.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:40px 0;">أدخل أسعار البيع الحقيقية في هندسة المنيو لعرض الرسم</p>';
            return;
        }

        dashChartMargins = new Chart(marginCtx, {
            type: 'bar',
            data: {
                labels: dishes.map(d => d.name.length > 12 ? d.name.slice(0, 12) + '…' : d.name),
                datasets: [{
                    label: 'هامش المساهمة %',
                    data: dishes.map(d => d.margin.toFixed(1)),
                    backgroundColor: dishes.map(d => d.margin < 0 ? '#ef4444' : d.margin < 30 ? '#f59e0b' : '#10b981'),
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => 'الهامش: ' + ctx.raw + '%'
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#aab7d4', callback: v => v + '%' },
                        grid: { color: 'rgba(180,133,84,0.1)' }
                    },
                    y: {
                        ticks: { color: '#aab7d4', font: { family: 'Tajawal', size: 11 } },
                        grid: { display: false }
                    }
                }
            }
        });
    }
}
