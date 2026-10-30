// ============================================================
// ui.js - واجهة المستخدم (Sidebar, Dropdown, Modals, Payment)
// ============================================================

function openPaymentModal() {
        const modal = document.getElementById('paymentModal');
        const iframe = document.getElementById('paymentIframe');
        iframe.src = PAYMENT_LINK;
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

function closePaymentModal() {
        const modal = document.getElementById('paymentModal');
        const iframe = document.getElementById('paymentIframe');
        modal.classList.remove('open');
        iframe.src = '';
        document.body.style.overflow = '';
    }

function openMobileMenu() {
        document.getElementById('appSidebar').classList.add('open');
        document.getElementById('sidebarOverlay').classList.add('active');
        document.body.classList.add('menu-open');
        document.body.style.overflow = 'hidden';
    }

function closeMobileMenu() {
        document.getElementById('appSidebar').classList.remove('open');
        document.getElementById('sidebarOverlay').classList.remove('active');
        document.body.classList.remove('menu-open');
        document.body.style.overflow = '';
    }

function toggleMobileMenu(e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        const side = document.getElementById('appSidebar');
        if (side.classList.contains('open')) closeMobileMenu();
        else openMobileMenu();
    }

function toggleRestaurantDropdown(e) {
        if (e) e.stopPropagation();
        document.getElementById('restaurantDropdown').classList.toggle('open');
    }

function closeRestaurantDropdown() {
        document.getElementById('restaurantDropdown').classList.remove('open');
    }

function showSettingsModal() {
        document.getElementById('globalWastePercent').value = globalWaste;
        document.getElementById('foodCostPercent').value = foodCostPercent;
        document.getElementById('settingsRestaurantName').value = document.getElementById('restaurantNameText').textContent || '';
        document.getElementById('settingsModal').classList.add('active');
    }

async function saveSettings() {
        const waste = parseFloat(document.getElementById('globalWastePercent').value),
            fcp = parseFloat(document.getElementById('foodCostPercent').value);
        const restName = document.getElementById('settingsRestaurantName').value.trim();
        if (isNaN(waste) || isNaN(fcp) || fcp <= 0 || fcp >= 100) return showToast('قيم غير صحيحة', true);
        closeModals();
        const res = await callServer('updateSettings', { wastePercent: waste, foodCostPercent: fcp }, true);
        if (res.success) {
            globalWaste = waste;
            foodCostPercent = fcp;
            if (restName && restName !== document.getElementById('restaurantNameText').textContent) {
                await callServer('updateRestaurantName', { name: restName }, false);
                document.getElementById('restaurantNameText').textContent = restName;
                generateQRCode();
            }
            showToast('تم حفظ الإعدادات');
            refreshCostsAndPrices(true);
        } else showToast(res.error, true);
    }

function showEditRestaurantName() {
        document.getElementById('restaurantNameInput').value = document.getElementById('restaurantNameText').textContent;
        document.getElementById('restaurantModal').classList.add('active');
    }

async function updateRestaurantName() {
        const name = document.getElementById('restaurantNameInput').value.trim();
        if (!name) return;
        closeModals();
        await callServer('updateRestaurantName', { name });
        document.getElementById('restaurantNameText').textContent = name;
        showToast('تم تحديث الاسم');
        generateQRCode();
    }


// ربط أحداث الواجهة
document.addEventListener('DOMContentLoaded', function() {
    const closePaymentBtn = document.getElementById('closePaymentBtn');
    if (closePaymentBtn) closePaymentBtn.addEventListener('click', closePaymentModal);
    
    const paymentModal = document.getElementById('paymentModal');
    if (paymentModal) {
        paymentModal.addEventListener('click', function(e) {
            if (e.target === this) closePaymentModal();
        });
    }
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && document.getElementById('paymentModal')?.classList.contains('open')) {
            closePaymentModal();
        }
        if (e.key === 'Escape') closeModals();
    });
    
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    if (hamburgerBtn) hamburgerBtn.addEventListener('click', toggleMobileMenu);
    
    const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
    if (sidebarCloseBtn) {
        sidebarCloseBtn.addEventListener('click', function(e) {
            e.preventDefault(); e.stopPropagation(); closeMobileMenu();
        });
    }
    
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.restaurant-dropdown-wrap')) closeRestaurantDropdown();
        if (e.target.classList.contains('modal-overlay')) closeModals();
    });
});
