// ============================================================
// app.js - التهيئة الرئيسية
// ============================================================

// ---- كود الحماية ومنع الوصول لأدوات المطور ----
(function () {
  "use strict";
  document.addEventListener('keydown', function (e) {
    if (e.key === 'F12' || e.keyCode === 123) {
      e.preventDefault();
      return false;
    }
    if (e.ctrlKey && e.shiftKey &&
        (e.key === 'I' || e.key === 'i' ||
         e.key === 'J' || e.key === 'j' ||
         e.key === 'C' || e.key === 'c')) {
      e.preventDefault();
      return false;
    }
    if (e.ctrlKey && (e.key === 'U' || e.key === 'u')) {
      e.preventDefault();
      return false;
    }
  }, true);
  document.addEventListener('contextmenu', function (e) {
    e.preventDefault();
    return false;
  }, true);
})();
// ---- نهاية كود الحماية ----

function switchTab(n) {
    currentTab = n;
    
    // إخفاء كل التبويبات
    const dash = document.getElementById('tabDashboard');
    if (dash) dash.style.display = 'none';
    ['tab0', 'tab1', 'tab2', 'tab3', 'tab4'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    if (n === 'dashboard') {
        if (dash) dash.style.display = 'block';
        document.querySelector('.nav-btn[data-tab="dashboard"]')?.classList.add('active');
        loadDashboard();
    } else {
        const tabId = 'tab' + n;
        const el = document.getElementById(tabId);
        if (el) el.style.display = 'block';
        document.querySelector(`.nav-btn[data-tab="${n}"]`)?.classList.add('active');
        
        const needFetch = !dataLoaded || (Date.now() - dataCacheTimestamp) >= CACHE_DURATION_MS;
        if (needFetch) {
            loadAllData(false).then(function() { renderCurrentTab(n); });
        } else {
            renderCurrentTab(n);
        }
    }
    closeMobileMenu();
}

function renderCurrentTab(n) {
    if (n === 0) renderRecipesTable();
    else if (n === 1) renderMaterialsTable();
    else if (n === 2) { loadMenuDataFromStorage(); renderMenuInputForm(); }
    else if (n === 3) renderBreakevenInputs();
    else if (n === 4) { loadReviews(); generateQRCode(); }
}

function refreshAll() {
    dataLoaded = false;
    loadAllData(true).then(function() {
        renderCurrentTab(currentTab === 'dashboard' ? 0 : currentTab);
        if (currentTab === 'dashboard') loadDashboard();
        setTimeout(function() { generateQRCode(); }, 500);
    });
}

// ===== PWA =====
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installBtn = document.getElementById('pwaInstallBtn');
    if (installBtn) {
        installBtn.classList.remove('hidden');
        installBtn.onclick = async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const result = await deferredPrompt.userChoice;
                if (result.outcome === 'accepted') installBtn.classList.add('hidden');
                deferredPrompt = null;
            }
        };
    }
});
window.addEventListener('appinstalled', () => {
    const btn = document.getElementById('pwaInstallBtn');
    if (btn) btn.classList.add('hidden');
});

// ===== التهيئة عند تحميل الصفحة =====
window.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('foodUserToken');
    const loginScreen = document.getElementById('loginScreen');
    const appMain = document.getElementById('appMain');

    if (token && !isSessionExpired()) {
        if (loginScreen) loginScreen.style.display = 'none';
        if (appMain) appMain.style.display = 'block';
        currentUserEmail = localStorage.getItem('foodUserEmail') || '';
        dataLoaded = false;
        loadAllData(true);
        startSessionTimer();
        setTimeout(() => generateQRCode(), 1500);
        setTimeout(() => checkPendingBackup(), 3000);
        switchTab('dashboard');
    } else {
        if (loginScreen) loginScreen.style.display = 'flex';
        if (appMain) appMain.style.display = 'none';
        logout();
    }
    updateDateTime();
    setInterval(updateDateTime, 1000);
});

console.log('✅ نظام FoodCost 2.0 جاهز - النسخة المعيارية (Modular)');
