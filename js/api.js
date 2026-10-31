// ============================================================
// api.js - الاتصال بالسيرفر + الأدوات المشتركة
// النسخة المتوافقة مع Google Script v2.3 (توكن + authError)
// ============================================================

let currentUserEmail = "";
let allMaterials = [], allRecipes = [], currentTab = 'dashboard',
    currentRecipeIngredients = [], currentEditingRecipe = null, pendingDelete = null;
let globalWaste = 5, foodCostPercent = 30, menuData = {},
    appCurrency = 'ر.س', minMarginPercent = 30,
    menuChartInstance = null, breakevenChartInstance = null, reviewsChartInstance = null;

function formatMoney(amount) {
    const n = parseFloat(amount) || 0;
    return n.toFixed(2) + ' ' + (appCurrency || '');
}
let selectedMaterialId = null, selectedMaterialUnit = '';
let dataLoaded = false, dataCacheTimestamp = 0;
let allReviews = [], filteredReviews = [];

function showLoading() { document.getElementById('loading').classList.add('active'); }
function hideLoading() { document.getElementById('loading').classList.remove('active'); }
function showExportLoading(title, msg) {
    document.getElementById('exportLoadingTitle').textContent = title;
    document.getElementById('exportLoadingMsg').textContent = msg;
    document.getElementById('exportLoadingOverlay').classList.add('active');
}
function hideExportLoading() { document.getElementById('exportLoadingOverlay').classList.remove('active'); }
function showToast(msg, isErr = false) {
    const t = document.getElementById('toast');
    document.getElementById('toastMsg').textContent = msg;
    t.style.background = isErr ? 'rgba(239,68,68,0.9)' : 'rgba(15,43,75,0.9)';
    t.style.borderColor = isErr ? '#ef4444' : 'var(--accent-glow)';
    t.classList.add('show');
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove('show'), 4000);
}
function closeModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    pendingDelete = null;
}
function escapeHtml(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

// ============================================================
// callServer — يرسل التوكن + يتعامل مع authError
// ============================================================
async function callServer(fn, params = {}, showLoad = true) {
    if (showLoad) showLoading();
    try {
        const url = new URL(COST_API_URL);
        url.searchParams.set('fn', fn);
        url.searchParams.set('restaurantEmail', currentUserEmail);

        // ✅ إرسال التوكن مع كل طلب
        const token = localStorage.getItem('foodUserToken');
        if (token) url.searchParams.set('token', token);

        if (Object.keys(params).length) url.searchParams.set('params', JSON.stringify(params));

        const res = await fetch(url.toString(), { headers: { 'Accept': 'application/json' } });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const result = await res.json();

        // ✅ التعامل مع انتهاء الجلسة أو التوكن غير الصالح
        if (result && result.authError) {
            if (typeof hideLoading === 'function') hideLoading();
            showToast('انتهت الجلسة، يرجى تسجيل الدخول مجدداً', true);
            setTimeout(function() {
                if (typeof logout === 'function') logout();
            }, 1500);
            return { success: false, error: result.error || 'انتهت الجلسة' };
        }

        // تسجيل تغييرات البيانات لتذكير النسخ الاحتياطي
        const mutations = [
            'addRecipe', 'addMaterial', 'updateMaterial', 'deleteRecipe',
            'deleteMaterial', 'saveRecipeIngredients', 'renameRecipe',
            'updateSettings', 'updateRestaurantName', 'updateRecipeSellingPrice',
            'addSale', 'deleteSale'
        ];
        if (result && result.success && mutations.includes(fn)) markDataChanged();

        return result;
    } catch (e) {
        return { success: false, error: e.message };
    } finally {
        if (showLoad) hideLoading();
    }
}

function updateDateTime() {
    const now = new Date();
    const dateEl = document.getElementById('currentDate');
    const timeEl = document.getElementById('currentTime');
    if (dateEl) dateEl.textContent = now.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    if (timeEl) timeEl.textContent = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

async function loadAllData(forceRefresh = false) {
    const now = Date.now();
    // استخدام الكاش: لا نعيد الطلب للسيرفر عند التنقل بين التبويبات
    if (!forceRefresh && dataLoaded && (now - dataCacheTimestamp) < CACHE_DURATION_MS) {
        return; // البيانات جاهزة في الذاكرة — كل تبويب يعرض ما يحتاجه فقط
    }
    showLoading();
    const data = await callServer('getAllData', {}, false);
    hideLoading();
    if (data.success) {
        allMaterials = data.materials || [];
        allRecipes = data.recipes || [];
        globalWaste = data.wastePercent || 0;
        foodCostPercent = data.foodCostPercent || 30;
        if (data.currency) appCurrency = data.currency;
        if (data.minMarginPercent != null) minMarginPercent = data.minMarginPercent;
        const nameEl = document.getElementById('restaurantNameText');
        if (nameEl) nameEl.textContent = data.restaurantName || 'المطعم';
        dataLoaded = true;
        dataCacheTimestamp = now;
        loadMenuDataFromStorage();
        // لا نعيد رسم كل الجداول هنا — كل تبويب يرسم عند فتحه
        if (typeof generateQRCode === 'function') generateQRCode();
    } else {
        // لا نعرض toast مزدوجاً لو كان authError (callServer عرضه بالفعل)
        if (!data.authError) {
            showToast(data.error || 'فشل تحميل البيانات', true);
        }
    }
}

function markDataChanged() {
    localStorage.setItem('foodLastDataChange', Date.now().toString());
}
