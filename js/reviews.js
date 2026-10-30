// ============================================================
// reviews.js - التقييمات و QR
// ============================================================

async function loadReviews() {
        if (!currentUserEmail) return;
        showLoading();
        try {
            const res = await callServer('getReviews', {}, false);
            if (res.success) {
                allReviews = res.reviews || [];
                filteredReviews = [...allReviews];
                renderReviewsTable();
                updateReviewsSummary();
                updateReviewsChart();
                document.getElementById('reviewsSummary').style.display = 'block';
                document.getElementById('reviewsChartContainer').style.display = 'block';
            } else showToast(res.error || 'فشل تحميل التقييمات', true);
        } catch (e) { showToast('خطأ في التحميل', true); } finally { hideLoading(); }
    }

function renderReviewsTable() {
        const tbody = document.getElementById('reviewsBody');
        if (!filteredReviews.length) { tbody.innerHTML = '<tr><td colspan="13"><div class="empty-state">لا توجد تقييمات تطابق الفلترة.</div></td></tr>'; return; }
        tbody.innerHTML = filteredReviews.map((r, i) => {
            const avg = ((r.food || 0) + (r.service || 0) + (r.cleanliness || 0) + (r.price || 0)) / 4;
            const stars = '★'.repeat(Math.round(avg)) + '☆'.repeat(5 - Math.round(avg));
            let statusBadge = 'badge-review-average', statusText = r.status || 'محايد';
            if (r.status && r.status.includes('راضي')) statusBadge = 'badge-review-excellent';
            else if (r.status && r.status.includes('غير راضي')) statusBadge = 'badge-review-poor';
            const phone = r.phone || '-', visitType = r.visitType || '-';
            const notes = r.notes || '';
            const shortNotes = notes.length > 30 ? notes.substring(0, 30) + '...' : notes;
            const hasNotes = notes.length > 0;
            return `<tr><td>${i+1}</td><td>${r.date || ''}</td><td>${escapeHtml(r.name || 'غير مسجل')}</td><td>${escapeHtml(phone)}</td><td>${escapeHtml(visitType)}</td><td><span class="badge badge-info">${r.food || 0}</span></td><td><span class="badge badge-info">${r.service || 0}</span></td><td><span class="badge badge-info">${r.cleanliness || 0}</span></td><td><span class="badge badge-info">${r.price || 0}</span></td><td>${stars} ${avg.toFixed(1)}</td><td><span class="badge ${statusBadge}">${statusText}</span></td><td>${r.recommendation || '-'}</td><td>${hasNotes ? `<span style="cursor:pointer; color:var(--accent-soft);" onclick="showFullNotes('${escapeHtml(r.name || 'غير مسجل')}', '${escapeHtml(r.date || '')}', '${escapeHtml(notes)}')">${shortNotes}</span>` : '-'}</td></tr>`;
        }).join('');
    }

function showFullNotes(name, date, notes) {
        document.getElementById('notesMeta').innerHTML = `<span><i class="fas fa-user"></i> ${escapeHtml(name)}</span><span><i class="fas fa-calendar-alt"></i> ${date || 'غير محدد'}</span>`;
        document.getElementById('notesFullContent').textContent = notes || 'لا توجد ملاحظات.';
        document.getElementById('notesModal').classList.add('active');
    }

function updateReviewsSummary() {
        const container = document.getElementById('reviewsSummary');
        if (!allReviews.length) { container.innerHTML = '<div class="empty-state">لا توجد تقييمات.</div>'; container.style.display = 'block'; return; }
        const total = allReviews.length;
        const avgFood = allReviews.reduce((s, r) => s + (r.food || 0), 0) / total;
        const avgService = allReviews.reduce((s, r) => s + (r.service || 0), 0) / total;
        const avgClean = allReviews.reduce((s, r) => s + (r.cleanliness || 0), 0) / total;
        const avgPrice = allReviews.reduce((s, r) => s + (r.price || 0), 0) / total;
        const overall = (avgFood + avgService + avgClean + avgPrice) / 4;
        const statusCounts = {};
        allReviews.forEach(r => { const s = r.status || 'محايد'; statusCounts[s] = (statusCounts[s] || 0) + 1; });
        let statusHtml = '';
        for (const [k, v] of Object.entries(statusCounts)) {
            let cls = 'badge-review-average';
            if (k.includes('راضي')) cls = 'badge-review-excellent';
            else if (k.includes('غير راضي')) cls = 'badge-review-poor';
            statusHtml += `<span class="badge ${cls}" style="margin:3px;">${k}: ${v}</span>`;
        }
        const visitTypeCounts = {};
        allReviews.forEach(r => { const vt = r.visitType || 'غير محدد'; visitTypeCounts[vt] = (visitTypeCounts[vt] || 0) + 1; });
        let visitTypeHtml = '';
        const visitTypeLabels = { 'فطور': '🍳 فطور', 'غداء': '☀️ غداء', 'عشاء': '🌙 عشاء', 'طلبات_خارجية': '🛍️ طلبات خارجية', 'غير محدد': '❓ غير محدد' };
        for (const [k, v] of Object.entries(visitTypeCounts)) {
            const label = visitTypeLabels[k] || k;
            visitTypeHtml += `<span class="badge badge-info" style="margin:3px;">${label}: ${v}</span>`;
        }
        container.innerHTML = `<div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(140px,1fr)); gap:15px; background:var(--bg-card); border-radius:var(--radius); padding:20px; border:1px solid var(--border);"><div><strong style="color:var(--accent-soft);">📊 إجمالي</strong><br><span style="font-size:1.5rem;">${total}</span></div><div><strong style="color:var(--accent-soft);">⭐ المتوسط</strong><br><span style="font-size:1.5rem;">${overall.toFixed(1)}</span></div><div><strong style="color:var(--accent-soft);">🍽️ الطعام</strong><br><span style="font-size:1.2rem;">${avgFood.toFixed(1)}</span></div><div><strong style="color:var(--accent-soft);">👨‍🍳 الخدمة</strong><br><span style="font-size:1.2rem;">${avgService.toFixed(1)}</span></div><div><strong style="color:var(--accent-soft);">🧹 النظافة</strong><br><span style="font-size:1.2rem;">${avgClean.toFixed(1)}</span></div><div><strong style="color:var(--accent-soft);">💰 الأسعار</strong><br><span style="font-size:1.2rem;">${avgPrice.toFixed(1)}</span></div><div style="grid-column: 1 / -1;"><strong style="color:var(--accent-soft);">🏷️ التصنيفات</strong><br>${statusHtml}</div><div style="grid-column: 1 / -1;"><strong style="color:var(--accent-soft);">🕒 أنواع الزيارات</strong><br>${visitTypeHtml}</div></div>`;
        container.style.display = 'block';
    }

function updateReviewsChart() {
        if (!allReviews.length) { document.getElementById('reviewsChartContainer').style.display = 'none'; return; }
        document.getElementById('reviewsChartContainer').style.display = 'block';
        const ctx = document.getElementById('reviewsChart').getContext('2d');
        if (reviewsChartInstance) reviewsChartInstance.destroy();
        const ratings = [1, 2, 3, 4, 5];
        const counts = ratings.map(r => allReviews.filter(rev => { const avg = ((rev.food || 0) + (rev.service || 0) + (rev.cleanliness || 0) + (rev.price || 0)) / 4; return Math.round(avg) === r; }).length);
        reviewsChartInstance = new Chart(ctx, { type: 'bar', data: { labels: ['★ 1', '★ 2', '★ 3', '★ 4', '★ 5'], datasets: [{ label: 'عدد التقييمات', data: counts, backgroundColor: ['#ef4444', '#f59e0b', '#fcd34d', '#34d399', '#10b981'], borderRadius: 6 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1, color: '#aab7d4' } }, x: { ticks: { color: '#aab7d4' } } }, plugins: { legend: { labels: { color: '#aab7d4' } } } } });
    }

function applyReviewFilters() {
        const fromDate = document.getElementById('reviewFilterFrom').value;
        const toDate = document.getElementById('reviewFilterTo').value;
        const ratingFilter = document.getElementById('reviewFilterRating').value;
        const statusFilter = document.getElementById('reviewFilterStatus').value;
        const visitTypeFilter = document.getElementById('reviewFilterVisitType').value;
        filteredReviews = allReviews.filter(r => {
            if (fromDate && r.date && r.date < fromDate) return false;
            if (toDate && r.date && r.date > toDate) return false;
            if (ratingFilter) { const avg = ((r.food || 0) + (r.service || 0) + (r.cleanliness || 0) + (r.price || 0)) / 4; if (Math.round(avg) !== parseInt(ratingFilter)) return false; }
            if (statusFilter && (!r.status || !r.status.includes(statusFilter.replace(/[✅❌⚠️]/g, '').trim()))) return false;
            if (visitTypeFilter && r.visitType !== visitTypeFilter) return false;
            return true;
        });
        renderReviewsTable();
        showToast(`تم فلترة التقييمات: ${filteredReviews.length} من ${allReviews.length}`);
    }

function clearReviewFilters() {
        document.getElementById('reviewFilterFrom').value = '';
        document.getElementById('reviewFilterTo').value = '';
        document.getElementById('reviewFilterRating').value = '';
        document.getElementById('reviewFilterStatus').value = '';
        document.getElementById('reviewFilterVisitType').value = '';
        filteredReviews = [...allReviews];
        renderReviewsTable();
        showToast('تم إلغاء الفلترة');
    }

async function exportReviewsExcel() {
        if (!allReviews.length) { showToast('لا توجد تقييمات', true); return; }
        showExportLoading('جاري تصدير التقييمات...', 'إنشاء ملف Excel');
        try {
            const workbook = new ExcelJS.Workbook();
            const ws = workbook.addWorksheet('التقييمات', { views: [{ rightToLeft: true }] });
            ws.columns = [{ header: '#', width: 5 }, { header: 'التاريخ', width: 18 }, { header: 'الاسم', width: 20 }, { header: 'الهاتف', width: 18 }, { header: 'نوع الزيارة', width: 16 }, { header: 'الطعام', width: 10 }, { header: 'الخدمة', width: 10 }, { header: 'النظافة', width: 10 }, { header: 'الأسعار', width: 10 }, { header: 'المتوسط', width: 10 }, { header: 'التصنيف', width: 16 }, { header: 'التوصية', width: 16 }, { header: 'الملاحظات', width: 35 }];
            ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB48554' } };
            allReviews.forEach((r, i) => {
                const avg = ((r.food || 0) + (r.service || 0) + (r.cleanliness || 0) + (r.price || 0)) / 4;
                ws.addRow([i + 1, r.date || '', r.name || '', r.phone || '', r.visitType || '', r.food || 0, r.service || 0, r.cleanliness || 0, r.price || 0, avg.toFixed(1), r.status || '', r.recommendation || '', r.notes || '']);
            });
            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `تقييمات_المطعم_${new Date().toISOString().slice(0,10)}.xlsx`);
            showToast('✅ تم التصدير');
        } catch (e) { showToast('فشل التصدير', true); } finally { hideExportLoading(); }
    }

async function exportReviewsWord() {
        if (!allReviews.length) { showToast('لا توجد تقييمات', true); return; }
        showExportLoading('جاري تصدير التقييمات...', 'إنشاء ملف Word');
        try {
            const restaurantName = document.getElementById('restaurantNameText').textContent || 'المطعم';
            const now = new Date();
            let rows = '';
            allReviews.forEach((r, i) => {
                const avg = ((r.food || 0) + (r.service || 0) + (r.cleanliness || 0) + (r.price || 0)) / 4;
                rows += `<tr><td>${i+1}</td><td>${r.date||''}</td><td>${r.name||''}</td><td>${r.phone||''}</td><td>${r.visitType||''}</td><td>${r.food||0}</td><td>${r.service||0}</td><td>${r.cleanliness||0}</td><td>${r.price||0}</td><td>${avg.toFixed(1)}</td><td>${r.status||''}</td><td>${r.recommendation||''}</td></tr>`;
            });
            const total = allReviews.reduce((s, r) => s + (r.food + r.service + r.cleanliness + r.price) / 4, 0);
            const avgOverall = total / allReviews.length;
            const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>تقرير التقييمات</title><style>body{font-family:Tajawal,sans-serif;margin:2rem;}h1{color:#b8860b;text-align:center;}table{width:100%;border-collapse:collapse;margin:15px 0;font-size:0.85rem;}th,td{border:1px solid #ddd;padding:6px;text-align:center;}th{background:#fefcf6;color:#b8860b;}</style></head><body><h1>📊 تقرير تقييمات العملاء - ${restaurantName}</h1><p style="text-align:center;">التاريخ: ${now.toLocaleDateString('ar-EG')} | عدد التقييمات: ${allReviews.length} | المتوسط: ${avgOverall.toFixed(1)}/5</p><table><thead><tr><th>#</th><th>التاريخ</th><th>الاسم</th><th>الهاتف</th><th>الزيارة</th><th>الطعام</th><th>الخدمة</th><th>النظافة</th><th>الأسعار</th><th>المتوسط</th><th>التصنيف</th><th>التوصية</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
            const blob = new Blob(['\uFEFF' + html], { type: 'application/msword' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `تقرير_التقييمات_${restaurantName}_${now.toISOString().slice(0,10)}.doc`;
            link.click();
            URL.revokeObjectURL(link.href);
            showToast('✅ تم التصدير');
        } catch (e) { showToast('فشل التصدير', true); } finally { hideExportLoading(); }
    }

function generateQRCode() {
    const restaurantName = document.getElementById('restaurantNameText').textContent || 'المطعم';
    const email = currentUserEmail;
    if (!email) return;

    let baseUrl = '';
    // 1) رابط يدوي من الإعدادات (الأفضل للإنتاج)
    if (typeof PUBLIC_APP_URL === 'string' && PUBLIC_APP_URL.trim()) {
        baseUrl = PUBLIC_APP_URL.trim();
        if (!baseUrl.endsWith('/')) baseUrl += '/';
    } else if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
        // 2) من عنوان الصفحة الحالي (عند الرفع على سيرفر)
        baseUrl = window.location.origin + window.location.pathname.replace(/[^/]*$/, '');
    } else {
        // 3) فتح محلي file:// — QR لن يعمل على الهاتف
        baseUrl = '';
        window._reviewLink = '';
        const qrImg = document.getElementById('qrCodeImg');
        if (qrImg) {
            qrImg.removeAttribute('src');
            qrImg.alt = 'ارفع التطبيق على سيرفر أولاً';
        }
        const hint = document.getElementById('qrHint');
        if (hint) {
            hint.textContent = '⚠️ كود QR يعمل فقط بعد رفع الملفات على سيرفر (رابط https). افتح من localhost أو السيرفر.';
            hint.style.display = 'block';
        }
        return;
    }

    const reviewUrl = `${baseUrl}review.html?restaurant=${encodeURIComponent(email)}&name=${encodeURIComponent(restaurantName)}`;
    window._reviewLink = reviewUrl;
    const qrImg = document.getElementById('qrCodeImg');
    if (qrImg) {
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(reviewUrl)}&format=png&bgcolor=ffffff&color=b48554`;
    }
    const hint = document.getElementById('qrHint');
    if (hint) {
        hint.textContent = reviewUrl;
        hint.style.display = 'block';
    }
}

function copyReviewLink() {
        const link = window._reviewLink || '';
        if (!link) { showToast('لا يوجد رابط', true); return; }
        if (navigator.clipboard) {
            navigator.clipboard.writeText(link).then(() => showToast('✅ تم النسخ')).catch(() => fallbackCopy(link));
        } else fallbackCopy(link);
    }

function fallbackCopy(text) {
        const input = document.createElement('input');
        input.value = text; document.body.appendChild(input);
        input.select(); document.execCommand('copy');
        document.body.removeChild(input); showToast('✅ تم النسخ');
    }

function printQR() {
        const qrImg = document.getElementById('qrCodeImg');
        if (!qrImg.src) { showToast('لا توجد صورة', true); return; }
        const win = window.open('', '_blank');
        win.document.write(`<html dir="rtl"><head><title>طباعة QR</title><style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;font-family:Tajawal,sans-serif;}h3{color:#b48554;}img{max-width:300px;border:1px solid #ddd;padding:10px;border-radius:8px;}</style></head><body><h3>${escapeHtml(document.getElementById('restaurantNameText').textContent || 'المطعم')}</h3><img src="${qrImg.src}" /><p>امسح الكود لتقييم تجربتك</p><button onclick="window.print()" style="margin-top:20px;padding:10px 20px;background:#b48554;color:#fff;border:none;border-radius:8px;cursor:pointer;">🖨️ طباعة</button></body></html>`);
        win.document.close();
    }

