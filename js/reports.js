// ============================================================
// reports.js - التقارير الشاملة (Excel + Word)
// ============================================================

async function exportToExcel() {
        if (!allRecipes.length && !allMaterials.length) { showToast('لا توجد بيانات', true); return; }
        showLoading();
        try {
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'FoodCost - FAROUK GRUP';
            const ws1 = workbook.addWorksheet('الأطباق', { views: [{ rightToLeft: true }] });
            ws1.columns = [{ header: '#', width: 5 }, { header: 'اسم الطبق', width: 30 }, { header: 'التكلفة الفعلية', width: 18 }, { header: 'سعر البيع المقترح', width: 20 }, { header: 'هامش المساهمة %', width: 18 }];
            ws1.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            ws1.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB48554' } };
            allRecipes.forEach((r, i) => ws1.addRow([i + 1, r.name, r.costPrice, r.suggestedPrice, ((r.suggestedPrice - r.costPrice) / r.suggestedPrice * 100).toFixed(1) + '%']));
            const ws2 = workbook.addWorksheet('المواد', { views: [{ rightToLeft: true }] });
            ws2.columns = [{ header: '#', width: 5 }, { header: 'اسم المادة', width: 25 }, { header: 'الوحدة', width: 12 }, { header: 'السعر الفعلي', width: 15 }, { header: 'الهدر %', width: 12 }, { header: 'وزن الحصة', width: 15 }];
            ws2.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            ws2.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB48554' } };
            allMaterials.forEach((m, i) => ws2.addRow([i + 1, m.name, m.unit, m.price, m.wastePercent || 0, m.portionWeight ? `${m.portionWeight} ${m.unit}` : '—']));
            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `تقرير_FoodCost_${new Date().toISOString().slice(0,10)}.xlsx`);
            showToast('✅ تم التصدير بنجاح');
        } catch (e) { showToast('فشل التصدير', true); } finally { hideLoading(); }
    }

function styleExcelHeader(row, color) {
        row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color || 'FFB48554' } };
        row.alignment = { horizontal: 'center', vertical: 'middle' };
    }

function computeMenuAnalysisForReport() {
        loadMenuDataFromStorage();
        const selected = allRecipes
            .filter(r => menuData[r.name]?.selected !== false)
            .map(r => ({
                name: r.name,
                cost: r.costPrice || 0,
                price: menuData[r.name]?.price || r.suggestedPrice || 0,
                units: menuData[r.name]?.units || 0
            }))
            .filter(d => d.price > 0);
        if (selected.length < 1) return [];
        const totalUnits = selected.reduce((s, d) => s + d.units, 0);
        const avgMargin = selected.reduce((s, d) => s + (d.price - d.cost), 0) / selected.length;
        const avgPop = totalUnits > 0 ? 100 / selected.length : 0;
        return selected.map(d => {
            const margin = d.price - d.cost;
            const popularity = totalUnits > 0 ? (d.units / totalUnits) * 100 : 0;
            let category = 'كلب (Dog)', rec = '🐕 ضعيف';
            if (margin < 0) { category = 'كلب (Dog)'; rec = '🔴 خسارة'; }
            else if (popularity >= avgPop && margin >= avgMargin) { category = 'نجم (Star)'; rec = '✅ ممتاز'; }
            else if (popularity >= avgPop && margin < avgMargin) { category = 'بقرة نقدية (Cash Cow)'; rec = '🐄 مبيعات عالية'; }
            else if (popularity < avgPop && margin >= avgMargin) { category = 'علامة استفهام (؟)'; rec = '❓ يحتاج تسويق'; }
            return { ...d, margin, popularity, category, rec };
        });
    }

function computeBreakevenForReport() {
        if (window.lastBreakeven) return window.lastBreakeven;
        const fixedCosts = parseFloat(document.getElementById('beFixedCosts')?.value) || 0;
        if (fixedCosts <= 0) return null;
        const products = [];
        allRecipes.forEach((r, i) => {
            const units = parseInt(document.getElementById(`be_units_${i}`)?.value) || 0;
            if (units > 0) {
                const price = menuData[r.name]?.price || r.suggestedPrice || 0;
                const varCost = r.costPrice || 0;
                if (price > varCost) products.push({ name: r.name, price, varCost, units });
            }
        });
        if (!products.length) return null;
        const totalUnits = products.reduce((s, p) => s + p.units, 0);
        products.forEach(p => { p.mix = p.units / totalUnits; p.cm = p.price - p.varCost; p.cmRatio = p.cm / p.price; });
        const weightedCMRatio = products.reduce((s, p) => s + p.mix * p.cmRatio, 0);
        const beRevenue = fixedCosts / weightedCMRatio;
        const weightedPrice = products.reduce((s, p) => s + p.mix * p.price, 0);
        const beTotalUnits = beRevenue / weightedPrice;
        products.forEach(p => { p.beUnits = beTotalUnits * p.mix; p.beRevenue = p.beUnits * p.price; });
        return { products, beRevenue, beTotalUnits, fixedCosts };
    }

async function gatherFullReportData() {
        if (!dataLoaded) await loadAllData(true);
        if (!allReviews.length && currentUserEmail) {
            try {
                const res = await callServer('getReviews', {}, false);
                if (res.success) allReviews = res.reviews || [];
            } catch (_) {}
        }
        const menuResults = (window.lastMenuAnalysis && window.lastMenuAnalysis.length)
            ? window.lastMenuAnalysis
            : computeMenuAnalysisForReport();
        const be = computeBreakevenForReport();
        return {
            restaurantName: document.getElementById('restaurantNameText').textContent || 'المطعم',
            dateStr: new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
            recipes: allRecipes,
            materials: allMaterials,
            menuResults,
            breakeven: be,
            reviews: allReviews,
            settings: { wastePercent: globalWaste, foodCostPercent }
        };
    }

function renderChartToBase64(config, width, height) {
        return new Promise((resolve) => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = width || 640;
                canvas.height = height || 360;
                canvas.style.position = 'fixed';
                canvas.style.left = '-9999px';
                document.body.appendChild(canvas);
                const chart = new Chart(canvas.getContext('2d'), {
                    ...config,
                    options: {
                        ...(config.options || {}),
                        animation: false,
                        responsive: false,
                        maintainAspectRatio: false
                    }
                });
                setTimeout(() => {
                    try {
                        const url = canvas.toDataURL('image/png');
                        chart.destroy();
                        document.body.removeChild(canvas);
                        resolve(url);
                    } catch (e) {
                        try { chart.destroy(); } catch (_) {}
                        try { document.body.removeChild(canvas); } catch (_) {}
                        resolve('');
                    }
                }, 120);
            } catch (e) {
                resolve('');
            }
        });
    }

async function buildReportCharts(data) {
        const charts = { menu: '', breakeven: '', reviews: '', margins: '' };
        // هامش الأطباق
        if (data.recipes.length) {
            const top = data.recipes.slice(0, 12);
            charts.margins = await renderChartToBase64({
                type: 'bar',
                data: {
                    labels: top.map(r => r.name),
                    datasets: [{
                        label: 'هامش المساهمة',
                        data: top.map(r => (r.suggestedPrice || 0) - (r.costPrice || 0)),
                        backgroundColor: '#b48554'
                    }]
                },
                options: {
                    plugins: { title: { display: true, text: 'هامش المساهمة للأطباق', color: '#333' }, legend: { display: false } },
                    scales: { x: { ticks: { color: '#333', maxRotation: 45 } }, y: { ticks: { color: '#333' } } }
                }
            }, 700, 380);
        }
        // هندسة المنيو - توزيع التصنيفات
        if (data.menuResults.length) {
            const cats = { 'نجم': 0, 'علامة استفهام': 0, 'بقرة نقدية': 0, 'كلب': 0 };
            data.menuResults.forEach(r => {
                if (r.category.includes('نجم')) cats['نجم']++;
                else if (r.category.includes('علامة')) cats['علامة استفهام']++;
                else if (r.category.includes('بقرة')) cats['بقرة نقدية']++;
                else cats['كلب']++;
            });
            charts.menu = await renderChartToBase64({
                type: 'doughnut',
                data: {
                    labels: Object.keys(cats),
                    datasets: [{
                        data: Object.values(cats),
                        backgroundColor: ['#28a745', '#ffc107', '#17a2b8', '#dc3545']
                    }]
                },
                options: {
                    plugins: { title: { display: true, text: 'توزيع تصنيفات هندسة المنيو (BCG)', color: '#333' }, legend: { position: 'bottom', labels: { color: '#333' } } }
                }
            }, 520, 400);
        }
        // نقطة التعادل
        if (data.breakeven && data.breakeven.products.length) {
            charts.breakeven = await renderChartToBase64({
                type: 'bar',
                data: {
                    labels: data.breakeven.products.map(p => p.name),
                    datasets: [{
                        label: 'وحدات التعادل',
                        data: data.breakeven.products.map(p => Math.ceil(p.beUnits)),
                        backgroundColor: '#b48554'
                    }]
                },
                options: {
                    plugins: { title: { display: true, text: 'وحدات نقطة التعادل لكل طبق', color: '#333' }, legend: { display: false } },
                    scales: { x: { ticks: { color: '#333', maxRotation: 45 } }, y: { ticks: { color: '#333' } } }
                }
            }, 700, 380);
        }
        // التقييمات
        if (data.reviews.length) {
            const ratings = [1, 2, 3, 4, 5];
            const counts = ratings.map(r => data.reviews.filter(rev => {
                const avg = ((rev.food || 0) + (rev.service || 0) + (rev.cleanliness || 0) + (rev.price || 0)) / 4;
                return Math.round(avg) === r;
            }).length);
            charts.reviews = await renderChartToBase64({
                type: 'bar',
                data: {
                    labels: ['★ 1', '★ 2', '★ 3', '★ 4', '★ 5'],
                    datasets: [{
                        label: 'عدد التقييمات',
                        data: counts,
                        backgroundColor: ['#ef4444', '#f59e0b', '#fcd34d', '#34d399', '#10b981']
                    }]
                },
                options: {
                    plugins: { title: { display: true, text: 'توزيع تقييمات العملاء', color: '#333' }, legend: { display: false } },
                    scales: { y: { beginAtZero: true, ticks: { stepSize: 1, color: '#333' } }, x: { ticks: { color: '#333' } } }
                }
            }, 560, 360);
        }
        return charts;
    }

async function base64ToExcelImage(workbook, dataUrl) {
        if (!dataUrl || !dataUrl.startsWith('data:image')) return null;
        const base64 = dataUrl.split(',')[1];
        return workbook.addImage({ base64, extension: 'png' });
    }

async function exportFullReportExcel() {
        showExportLoading('جاري إنشاء تقرير Excel الشامل...', 'تجميع كل الأقسام والرسوم...');
        try {
            const data = await gatherFullReportData();
            document.getElementById('exportLoadingMsg').textContent = 'إنشاء الرسوم البيانية...';
            const charts = await buildReportCharts(data);
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'FoodCost - FAROUK GRUP';
            workbook.created = new Date();
            const G = 'FFB48554';

            // --- صفحة الغلاف / الملخص (جاهزة للطباعة A4) ---
            const wsSum = workbook.addWorksheet('الغلاف', { views: [{ rightToLeft: true }] });
            wsSum.pageSetup = {
                paperSize: 9, // A4
                orientation: 'portrait',
                fitToPage: true,
                fitToWidth: 1,
                fitToHeight: 1,
                margins: { left: 0.6, right: 0.6, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 }
            };
            wsSum.columns = [{ width: 32 }, { width: 22 }, { width: 22 }, { width: 22 }];

            // عنوان رئيسي
            wsSum.mergeCells('A1:D1');
            wsSum.getCell('A1').value = 'التقرير الشامل — نظام إدارة التكلفة وهندسة المنيو';
            wsSum.getCell('A1').font = { bold: true, size: 18, color: { argb: G } };
            wsSum.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
            wsSum.getRow(1).height = 32;

            wsSum.mergeCells('A2:D2');
            wsSum.getCell('A2').value = 'FoodCost | FAROUK GRUP';
            wsSum.getCell('A2').font = { size: 12, color: { argb: 'FF8B7355' } };
            wsSum.getCell('A2').alignment = { horizontal: 'center' };

            // خط فاصل
            wsSum.addRow([]);
            wsSum.mergeCells('A4:D4');
            wsSum.getCell('A4').value = 'بيانات المطعم';
            wsSum.getCell('A4').font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
            wsSum.getCell('A4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: G } };
            wsSum.getCell('A4').alignment = { horizontal: 'center' };

            wsSum.addRow(['اسم المطعم', data.restaurantName, 'التاريخ', data.dateStr]);
            wsSum.addRow(['نسبة الهدر العامة %', data.settings.wastePercent, 'Food Cost المستهدف %', data.settings.foodCostPercent]);
            wsSum.addRow(['عدد الأطباق', data.recipes.length, 'عدد المواد الأولية', data.materials.length]);
            wsSum.addRow(['عدد التقييمات', data.reviews.length, 'أطباق هندسة المنيو', data.menuResults.length || 0]);

            // تمييز الصفوف
            for (let r = 5; r <= 8; r++) {
                wsSum.getRow(r).eachCell(c => {
                    c.border = { top: { style: 'thin', color: { argb: 'FFD4B896' } }, bottom: { style: 'thin', color: { argb: 'FFD4B896' } }, left: { style: 'thin', color: { argb: 'FFD4B896' } }, right: { style: 'thin', color: { argb: 'FFD4B896' } } };
                    c.alignment = { horizontal: 'center', vertical: 'middle' };
                });
                wsSum.getRow(r).height = 22;
            }

            // مؤشرات سريعة
            wsSum.addRow([]);
            wsSum.mergeCells('A10:D10');
            wsSum.getCell('A10').value = 'المؤشرات الرئيسية';
            wsSum.getCell('A10').font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
            wsSum.getCell('A10').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: G } };
            wsSum.getCell('A10').alignment = { horizontal: 'center' };

            // حساب متوسط Food Cost من الأسعار الحقيقية
            let totalCost = 0, totalPrice = 0;
            data.recipes.forEach(r => {
                const c = r.costPrice || 0;
                const p = (typeof getRealPrice === 'function' ? getRealPrice(r) : null) || r.sellingPrice || (menuData[r.name]?.price) || r.suggestedPrice || 0;
                if (c > 0 && p > 0) { totalCost += c; totalPrice += p; }
            });
            const avgFC = totalPrice > 0 ? ((totalCost / totalPrice) * 100).toFixed(1) : '—';

            wsSum.addRow(['متوسط Food Cost الفعلي', avgFC + (avgFC !== '—' ? '%' : ''), 'المستهدف', data.settings.foodCostPercent + '%']);
            if (data.breakeven) {
                wsSum.addRow(['التكاليف الثابتة', data.breakeven.fixedCosts, 'إيراد نقطة التعادل', Math.round(data.breakeven.beRevenue)]);
                wsSum.addRow(['وحدات نقطة التعادل', Math.ceil(data.breakeven.beTotalUnits), '', '']);
            }

            for (let r = 11; r <= 13; r++) {
                if (!wsSum.getRow(r).getCell(1).value) continue;
                wsSum.getRow(r).eachCell(c => {
                    c.border = { top: { style: 'thin', color: { argb: 'FFD4B896' } }, bottom: { style: 'thin', color: { argb: 'FFD4B896' } }, left: { style: 'thin', color: { argb: 'FFD4B896' } }, right: { style: 'thin', color: { argb: 'FFD4B896' } } };
                    c.alignment = { horizontal: 'center', vertical: 'middle' };
                });
            }

            // تذييل
            wsSum.addRow([]);
            wsSum.addRow([]);
            wsSum.mergeCells('A16:D16');
            wsSum.getCell('A16').value = 'هذا التقرير سري — للاستخدام الداخلي فقط | تم إنشاؤه بواسطة نظام FoodCost';
            wsSum.getCell('A16').font = { size: 9, italic: true, color: { argb: 'FF888888' } };
            wsSum.getCell('A16').alignment = { horizontal: 'center' };

            // تطبيق إعدادات طباعة A4 على باقي الأوراق
            const applyA4 = (ws) => {
                ws.pageSetup = {
                    paperSize: 9,
                    orientation: 'landscape',
                    fitToPage: true,
                    fitToWidth: 1,
                    fitToHeight: 0,
                    margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 }
                };
            };

            // --- الأطباق ---
            const wsRecipes = workbook.addWorksheet('الأطباق', { views: [{ rightToLeft: true }] });
            wsRecipes.columns = [
                { header: '#', width: 5 }, { header: 'اسم الطبق', width: 26 },
                { header: 'التكلفة', width: 12 }, { header: 'سعر مقترح', width: 12 },
                { header: 'سعر البيع الحقيقي', width: 16 },
                { header: 'هامش المساهمة', width: 14 }, { header: 'هامش %', width: 10 }
            ];
            styleExcelHeader(wsRecipes.getRow(1), G);
            applyA4(wsRecipes);
            data.recipes.forEach((r, i) => {
                const c = r.costPrice || 0;
                const suggested = r.suggestedPrice || 0;
                const real = (typeof getRealPrice === 'function' ? getRealPrice(r) : null) || r.sellingPrice || (menuData[r.name] && menuData[r.name].price) || suggested || 0;
                const margin = real - c;
                const pct = real > 0 ? ((margin / real) * 100).toFixed(1) + '%' : '—';
                wsRecipes.addRow([i + 1, r.name, +c.toFixed(2), +suggested.toFixed(2), +real.toFixed(2), +margin.toFixed(2), pct]);
            });
            if (charts.margins) {
                const imgId = await base64ToExcelImage(workbook, charts.margins);
                if (imgId != null) {
                    wsRecipes.addRow([]);
                    wsRecipes.addImage(imgId, {
                        tl: { col: 0, row: data.recipes.length + 3 },
                        ext: { width: 560, height: 300 }
                    });
                }
            }

            // --- المواد ---
            const wsMat = workbook.addWorksheet('المواد الأولية', { views: [{ rightToLeft: true }] });
            wsMat.columns = [
                { header: '#', width: 5 }, { header: 'اسم المادة', width: 26 },
                { header: 'الوحدة', width: 12 }, { header: 'السعر الفعلي', width: 14 },
                { header: 'سعر الشراء', width: 14 }, { header: 'الكمية', width: 12 },
                { header: 'الهدر %', width: 10 }, { header: 'وزن الحصة', width: 12 }
            ];
            styleExcelHeader(wsMat.getRow(1), G);
            applyA4(wsMat);
            data.materials.forEach((m, i) => {
                wsMat.addRow([
                    i + 1, m.name, m.unit, +(m.price || 0).toFixed(2),
                    +(m.purchasePrice || m.price || 0).toFixed(2),
                    m.purchaseQty || 1, m.wastePercent || 0,
                    m.portionWeight ? `${m.portionWeight} ${m.unit}` : '—'
                ]);
            });

            // --- هندسة المنيو ---
            if (data.menuResults.length) {
                const wsMenu = workbook.addWorksheet('هندسة المنيو', { views: [{ rightToLeft: true }] });
                wsMenu.columns = [
                    { header: '#', width: 5 }, { header: 'الطبق', width: 24 },
                    { header: 'التكلفة', width: 12 }, { header: 'سعر البيع', width: 12 },
                    { header: 'المبيعات', width: 10 }, { header: 'هامش الربح', width: 12 },
                    { header: 'نسبة المبيعات %', width: 14 }, { header: 'التصنيف BCG', width: 20 },
                    { header: 'التوصية', width: 28 }
                ];
                styleExcelHeader(wsMenu.getRow(1), G);
                applyA4(wsMenu);
                data.menuResults.forEach((r, i) => {
                    wsMenu.addRow([
                        i + 1, r.name, +r.cost.toFixed(2), +r.price.toFixed(2), r.units,
                        +r.margin.toFixed(2), r.popularity.toFixed(1) + '%', r.category, r.rec
                    ]);
                });
                if (charts.menu) {
                    const imgId = await base64ToExcelImage(workbook, charts.menu);
                    if (imgId != null) {
                        wsMenu.addImage(imgId, {
                            tl: { col: 0, row: data.menuResults.length + 3 },
                            ext: { width: 420, height: 320 }
                        });
                    }
                }
            }

            // --- نقطة التعادل ---
            if (data.breakeven) {
                const wsBe = workbook.addWorksheet('نقطة التعادل', { views: [{ rightToLeft: true }] });
                wsBe.columns = [
                    { header: 'الطبق', width: 24 }, { header: 'المزيج %', width: 12 },
                    { header: 'وحدات التعادل', width: 16 }, { header: 'إيرادات التعادل', width: 16 }
                ];
                styleExcelHeader(wsBe.getRow(1), G);
                applyA4(wsBe);
                data.breakeven.products.forEach(p => {
                    wsBe.addRow([p.name, (p.mix * 100).toFixed(1) + '%', Math.ceil(p.beUnits), Math.round(p.beRevenue)]);
                });
                wsBe.addRow([]);
                wsBe.addRow(['التكاليف الثابتة', data.breakeven.fixedCosts]);
                wsBe.addRow(['إجمالي إيرادات التعادل', Math.round(data.breakeven.beRevenue)]);
                wsBe.addRow(['إجمالي وحدات التعادل', Math.ceil(data.breakeven.beTotalUnits)]);
                if (charts.breakeven) {
                    const imgId = await base64ToExcelImage(workbook, charts.breakeven);
                    if (imgId != null) {
                        wsBe.addImage(imgId, {
                            tl: { col: 0, row: data.breakeven.products.length + 6 },
                            ext: { width: 560, height: 300 }
                        });
                    }
                }
            }

            // --- التقييمات ---
            if (data.reviews.length) {
                const wsRev = workbook.addWorksheet('التقييمات', { views: [{ rightToLeft: true }] });
                wsRev.columns = [
                    { header: '#', width: 5 }, { header: 'التاريخ', width: 16 },
                    { header: 'الاسم', width: 18 }, { header: 'الهاتف', width: 14 },
                    { header: 'نوع الزيارة', width: 14 }, { header: 'الطعام', width: 9 },
                    { header: 'الخدمة', width: 9 }, { header: 'النظافة', width: 9 },
                    { header: 'الأسعار', width: 9 }, { header: 'المتوسط', width: 10 },
                    { header: 'التصنيف', width: 14 }, { header: 'التوصية', width: 14 },
                    { header: 'الملاحظات', width: 30 }
                ];
                styleExcelHeader(wsRev.getRow(1), G);
                applyA4(wsRev);
                data.reviews.forEach((r, i) => {
                    const avg = ((r.food || 0) + (r.service || 0) + (r.cleanliness || 0) + (r.price || 0)) / 4;
                    wsRev.addRow([
                        i + 1, r.date || '', r.name || '', r.phone || '', r.visitType || '',
                        r.food || 0, r.service || 0, r.cleanliness || 0, r.price || 0,
                        +avg.toFixed(1), r.status || '', r.recommendation || '', r.notes || ''
                    ]);
                });
                if (charts.reviews) {
                    const imgId = await base64ToExcelImage(workbook, charts.reviews);
                    if (imgId != null) {
                        wsRev.addImage(imgId, {
                            tl: { col: 0, row: data.reviews.length + 3 },
                            ext: { width: 480, height: 300 }
                        });
                    }
                }
            }

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `التقرير_الشامل_${data.restaurantName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
            showToast('✅ تم تصدير التقرير الشامل Excel');
        } catch (e) {
            console.error(e);
            showToast('فشل التصدير: ' + (e.message || ''), true);
        } finally {
            hideExportLoading();
        }
    }

async function exportFullReportWord() {
        showExportLoading('جاري إنشاء تقرير Word الشامل...', 'تجميع وتنسيق كل الأقسام...');
        try {
            const data = await gatherFullReportData();
            document.getElementById('exportLoadingMsg').textContent = 'إنشاء الرسوم البيانية...';
            const charts = await buildReportCharts(data);
            const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const chartImg = (src, alt) => src
                ? `<div class="chart-wrap"><img src="${src}" alt="${esc(alt)}" /></div>`
                : '';

            let recipesRows = '';
            data.recipes.forEach((r, i) => {
                const c = r.costPrice || 0, p = r.suggestedPrice || 0;
                const m = p > 0 ? ((p - c) / p * 100).toFixed(1) : '0';
                recipesRows += `<tr><td>${i + 1}</td><td>${esc(r.name)}</td><td>${c.toFixed(2)}</td><td>${p.toFixed(2)}</td><td>${(p - c).toFixed(2)}</td><td>${m}%</td></tr>`;
            });

            let materialsRows = '';
            data.materials.forEach((m, i) => {
                materialsRows += `<tr><td>${i + 1}</td><td>${esc(m.name)}</td><td>${esc(m.unit)}</td><td>${(m.price || 0).toFixed(2)}</td><td>${m.wastePercent || 0}%</td><td>${m.portionWeight ? m.portionWeight + ' ' + esc(m.unit) : '—'}</td></tr>`;
            });

            let menuRows = '', menuSection = '';
            if (data.menuResults.length) {
                data.menuResults.forEach((r, i) => {
                    menuRows += `<tr><td>${i + 1}</td><td>${esc(r.name)}</td><td>${r.cost.toFixed(2)}</td><td>${r.price.toFixed(2)}</td><td>${r.units}</td><td>${r.margin.toFixed(2)}</td><td>${r.popularity.toFixed(1)}%</td><td>${esc(r.category)}</td><td>${esc(r.rec)}</td></tr>`;
                });
                menuSection = `
                <div class="page-break"></div>
                <h2>📊 هندسة المنيو (BCG)</h2>
                <table>
                    <thead><tr><th>#</th><th>الطبق</th><th>التكلفة</th><th>سعر البيع</th><th>المبيعات</th><th>هامش الربح</th><th>نسبة %</th><th>التصنيف</th><th>التوصية</th></tr></thead>
                    <tbody>${menuRows}</tbody>
                </table>
                ${chartImg(charts.menu, 'رسم هندسة المنيو')}`;
            }

            let beSection = '';
            if (data.breakeven) {
                let beRows = '';
                data.breakeven.products.forEach(p => {
                    beRows += `<tr><td>${esc(p.name)}</td><td>${(p.mix * 100).toFixed(1)}%</td><td>${Math.ceil(p.beUnits)}</td><td>${Math.round(p.beRevenue)}</td></tr>`;
                });
                beSection = `
                <div class="page-break"></div>
                <h2>⚖️ نقطة التعادل</h2>
                <p class="meta">التكاليف الثابتة: <strong>${data.breakeven.fixedCosts}</strong> |
                إيرادات التعادل: <strong>${Math.round(data.breakeven.beRevenue)}</strong> |
                وحدات التعادل: <strong>${Math.ceil(data.breakeven.beTotalUnits)}</strong></p>
                <table>
                    <thead><tr><th>الطبق</th><th>المزيج %</th><th>وحدات التعادل</th><th>إيرادات التعادل</th></tr></thead>
                    <tbody>${beRows}</tbody>
                </table>
                ${chartImg(charts.breakeven, 'رسم نقطة التعادل')}`;
            }

            let reviewsSection = '';
            if (data.reviews.length) {
                let revRows = '';
                let sumAvg = 0;
                data.reviews.forEach((r, i) => {
                    const avg = ((r.food || 0) + (r.service || 0) + (r.cleanliness || 0) + (r.price || 0)) / 4;
                    sumAvg += avg;
                    revRows += `<tr><td>${i + 1}</td><td>${esc(r.date || '')}</td><td>${esc(r.name || '')}</td><td>${esc(r.phone || '')}</td><td>${esc(r.visitType || '')}</td><td>${r.food || 0}</td><td>${r.service || 0}</td><td>${r.cleanliness || 0}</td><td>${r.price || 0}</td><td>${avg.toFixed(1)}</td><td>${esc(r.status || '')}</td><td>${esc(r.recommendation || '')}</td></tr>`;
                });
                const overall = (sumAvg / data.reviews.length).toFixed(1);
                reviewsSection = `
                <div class="page-break"></div>
                <h2>⭐ تقييمات العملاء</h2>
                <p class="meta">عدد التقييمات: <strong>${data.reviews.length}</strong> | المتوسط العام: <strong>${overall}/5</strong></p>
                <table class="compact">
                    <thead><tr><th>#</th><th>التاريخ</th><th>الاسم</th><th>الهاتف</th><th>الزيارة</th><th>طعام</th><th>خدمة</th><th>نظافة</th><th>أسعار</th><th>متوسط</th><th>تصنيف</th><th>توصية</th></tr></thead>
                    <tbody>${revRows}</tbody>
                </table>
                ${chartImg(charts.reviews, 'رسم التقييمات')}`;
            }

            const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8">
<title>التقرير الشامل - ${esc(data.restaurantName)}</title>
<style>
  @page { size: A4; margin: 1.5cm; }
  body { font-family: 'Tajawal', 'Segoe UI', Tahoma, sans-serif; margin: 0; padding: 24px; color: #1a1a2e; background: #fff; line-height: 1.5; }
  .cover { text-align: center; padding: 40px 20px 30px; border-bottom: 3px solid #b48554; margin-bottom: 28px; }
  .cover h1 { color: #b48554; font-size: 26px; margin: 0 0 8px; }
  .cover .sub { color: #555; font-size: 14px; margin: 4px 0; }
  .cover .badge { display: inline-block; background: #fef8f0; border: 1px solid #b48554; color: #b48554; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; margin-top: 10px; }
  h2 { color: #b48554; border-right: 4px solid #b48554; padding-right: 12px; margin: 28px 0 12px; font-size: 18px; page-break-after: avoid; }
  .meta { color: #555; font-size: 13px; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0 20px; font-size: 12px; page-break-inside: auto; }
  table.compact { font-size: 10px; }
  th, td { border: 1px solid #ddd; padding: 7px 6px; text-align: center; }
  th { background: #fef8f0; color: #8a6430; font-weight: 700; }
  tr:nth-child(even) { background: #fafafa; }
  .page-break { page-break-before: always; }
  .summary-grid { display: table; width: 100%; margin: 16px 0; }
  .summary-grid .cell { display: table-cell; width: 25%; text-align: center; padding: 12px; border: 1px solid #eee; background: #fefcf6; }
  .summary-grid .cell strong { display: block; font-size: 20px; color: #b48554; }
  .summary-grid .cell span { font-size: 11px; color: #666; }
  .footer { text-align: center; margin-top: 40px; padding-top: 16px; border-top: 1px solid #eee; color: #999; font-size: 11px; }
  .chart-wrap { text-align: center; margin: 18px 0; page-break-inside: avoid; }
  .chart-wrap img { max-width: 100%; height: auto; border: 1px solid #eee; border-radius: 8px; }
</style>
</head>
<body>
  <div class="cover">
    <h1>نظام FoodCost — التقرير الشامل</h1>
    <div class="sub">مجموعة فاروق | FAROUK GRUP</div>
    <div class="sub">المطعم: <strong>${esc(data.restaurantName)}</strong></div>
    <div class="sub">${esc(data.dateStr)}</div>
    <div class="badge">الإصدار 1.8</div>
  </div>

  <div class="summary-grid">
    <div class="cell"><strong>${data.recipes.length}</strong><span>الأطباق</span></div>
    <div class="cell"><strong>${data.materials.length}</strong><span>المواد الأولية</span></div>
    <div class="cell"><strong>${data.reviews.length}</strong><span>التقييمات</span></div>
    <div class="cell"><strong>${data.settings.foodCostPercent}%</strong><span>Food Cost المستهدف</span></div>
  </div>
  <p class="meta">نسبة الهدر العامة: <strong>${data.settings.wastePercent}%</strong></p>

  <h2>📋 الأطباق والتكلفة</h2>
  <table>
    <thead><tr><th>#</th><th>اسم الطبق</th><th>التكلفة الفعلية</th><th>سعر البيع المقترح</th><th>هامش المساهمة</th><th>هامش %</th></tr></thead>
    <tbody>${recipesRows || '<tr><td colspan="6">لا توجد أطباق</td></tr>'}</tbody>
  </table>
  ${chartImg(charts.margins, 'رسم هوامش الأطباق')}

  <div class="page-break"></div>
  <h2>📦 المواد الأولية</h2>
  <table>
    <thead><tr><th>#</th><th>اسم المادة</th><th>الوحدة</th><th>السعر الفعلي</th><th>الهدر %</th><th>وزن الحصة</th></tr></thead>
    <tbody>${materialsRows || '<tr><td colspan="6">لا توجد مواد</td></tr>'}</tbody>
  </table>

  ${menuSection}
  ${beSection}
  ${reviewsSection}

  <div class="footer">
    © ${new Date().getFullYear()} FAROUK GRUP — جميع الحقوق محفوظة<br>
    تم إنشاء هذا التقرير تلقائياً من نظام FoodCost
  </div>
</body>
</html>`;

            const blob = new Blob(['\uFEFF' + html], { type: 'application/msword' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `التقرير_الشامل_${data.restaurantName}_${new Date().toISOString().slice(0, 10)}.doc`;
            link.click();
            URL.revokeObjectURL(link.href);
            showToast('✅ تم تصدير التقرير الشامل Word');
        } catch (e) {
            console.error(e);
            showToast('فشل التصدير: ' + (e.message || ''), true);
        } finally {
            hideExportLoading();
        }
    }

