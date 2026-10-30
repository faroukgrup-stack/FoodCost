// ============================================================
// ui.js - واجهة المستخدم (Sidebar, Dropdown, Modals, Payment, Settings)
// ============================================================


// ===== قائمة عملات العالم (رمز + اسم عربي + كود + كلمات بحث) =====
const WORLD_CURRENCIES = [
  { s: '$', n: 'دولار أمريكي', c: 'USD', q: 'دولار امريكي dollar usd america' },
  { s: '€', n: 'يورو', c: 'EUR', q: 'يورو euro eur' },
  { s: '£', n: 'جنيه إسترليني', c: 'GBP', q: 'جنيه استرليني pound gbp sterling' },
  { s: 'ر.س', n: 'ريال سعودي', c: 'SAR', q: 'ريال سعودي saudi riyal sar' },
  { s: 'د.إ', n: 'درهم إماراتي', c: 'AED', q: 'درهم اماراتي uae dirham aed' },
  { s: 'د.ك', n: 'دينار كويتي', c: 'KWD', q: 'دينار كويتي kuwait kwd' },
  { s: 'ر.ق', n: 'ريال قطري', c: 'QAR', q: 'ريال قطري qatar qar' },
  { s: 'د.ب', n: 'دينار بحريني', c: 'BHD', q: 'دينار بحريني bahrain bhd' },
  { s: 'ر.ع', n: 'ريال عماني', c: 'OMR', q: 'ريال عماني oman omr' },
  { s: 'ج.م', n: 'جنيه مصري', c: 'EGP', q: 'جنيه مصري egypt egp' },
  { s: 'د.أ', n: 'دينار أردني', c: 'JOD', q: 'دينار اردني jordan jod' },
  { s: 'ل.ل', n: 'ليرة لبنانية', c: 'LBP', q: 'ليرة لبنانية lebanon lbp' },
  { s: 'د.ع', n: 'دينار عراقي', c: 'IQD', q: 'دينار عراقي iraq iqd' },
  { s: 'ل.س', n: 'ليرة سورية', c: 'SYP', q: 'ليرة سورية syria syp' },
  { s: '₪', n: 'شيكل إسرائيلي', c: 'ILS', q: 'شيكل اسرائيلي shekel ils' },
  { s: 'د.ت', n: 'دينار تونسي', c: 'TND', q: 'دينار تونسي tunisia tnd' },
  { s: 'د.م', n: 'درهم مغربي', c: 'MAD', q: 'درهم مغربي morocco mad' },
  { s: 'د.ج', n: 'دينار جزائري', c: 'DZD', q: 'دينار جزائري algeria dzd' },
  { s: 'د.ل', n: 'دينار ليبي', c: 'LYD', q: 'دينار ليبي libya lyd' },
  { s: 'ج.س', n: 'جنيه سوداني', c: 'SDG', q: 'جنيه سوداني sudan sdg' },
  { s: '₺', n: 'ليرة تركية', c: 'TRY', q: 'ليرة تركية turkey try lira' },
  { s: '¥', n: 'ين ياباني', c: 'JPY', q: 'ين ياباني yen japan jpy' },
  { s: '¥', n: 'يوان صيني', c: 'CNY', q: 'يوان صيني yuan china cny rmb' },
  { s: '₹', n: 'روبية هندية', c: 'INR', q: 'روبية هندية india inr rupee' },
  { s: '₽', n: 'روبل روسي', c: 'RUB', q: 'روبل روسي russia rub' },
  { s: '₩', n: 'وون كوري جنوبي', c: 'KRW', q: 'وون كوري korea krw won' },
  { s: 'CHF', n: 'فرنك سويسري', c: 'CHF', q: 'فرنك سويسري swiss franc chf' },
  { s: 'C$', n: 'دولار كندي', c: 'CAD', q: 'دولار كندي canada cad' },
  { s: 'A$', n: 'دولار أسترالي', c: 'AUD', q: 'دولار استرالي australia aud' },
  { s: 'NZ$', n: 'دولار نيوزيلندي', c: 'NZD', q: 'دولار نيوزيلندي new zealand nzd' },
  { s: 'R$', n: 'ريال برازيلي', c: 'BRL', q: 'ريال برازيلي brazil brl real' },
  { s: 'R', n: 'راند جنوب أفريقيا', c: 'ZAR', q: 'راند جنوب افريقيا south africa zar' },
  { s: 'Rp', n: 'روبية إندونيسية', c: 'IDR', q: 'روبية اندونيسية indonesia idr' },
  { s: 'RM', n: 'رينغيت ماليزي', c: 'MYR', q: 'رينغيت ماليزي malaysia myr' },
  { s: 'S$', n: 'دولار سنغافوري', c: 'SGD', q: 'دولار سنغافوري singapore sgd' },
  { s: '฿', n: 'باهت تايلندي', c: 'THB', q: 'باهت تايلندي thailand thb baht' },
  { s: '₱', n: 'بيزو فلبيني', c: 'PHP', q: 'بيزو فلبيني philippines php' },
  { s: '₫', n: 'دونغ فيتنامي', c: 'VND', q: 'دونغ فيتنامي vietnam vnd' },
  { s: '₨', n: 'روبية باكستانية', c: 'PKR', q: 'روبية باكستانية pakistan pkr' },
  { s: '৳', n: 'تاكا بنغلاديشي', c: 'BDT', q: 'تاكا بنغلاديش bangladesh bdt' },
  { s: '₦', n: 'نيرة نيجيرية', c: 'NGN', q: 'نيرة نيجيريا nigeria ngn' },
  { s: 'KSh', n: 'شلن كيني', c: 'KES', q: 'شلن كيني kenya kes' },
  { s: 'zł', n: 'زلوتي بولندي', c: 'PLN', q: 'زلوتي بولندا poland pln' },
  { s: 'Kč', n: 'كرونة تشيكية', c: 'CZK', q: 'كرونة تشيكية czech czk' },
  { s: 'kr', n: 'كرونة سويدية', c: 'SEK', q: 'كرونة سويدية sweden sek' },
  { s: 'kr', n: 'كرونة نرويجية', c: 'NOK', q: 'كرونة نرويجية norway nok' },
  { s: 'kr', n: 'كرونة دنماركية', c: 'DKK', q: 'كرونة دنماركية denmark dkk' },
  { s: 'Ft', n: 'فورنت مجري', c: 'HUF', q: 'فورنت مجري hungary huf' },
  { s: 'lei', n: 'ليو روماني', c: 'RON', q: 'ليو روماني romania ron' },
  { s: '₴', n: 'هريفنيا أوكرانية', c: 'UAH', q: 'هريفنيا اوكرانيا ukraine uah' },
  { s: 'Mex$', n: 'بيزو مكسيكي', c: 'MXN', q: 'بيزو مكسيكي mexico mxn' },
  { s: 'CLP$', n: 'بيزو تشيلي', c: 'CLP', q: 'بيزو تشيلي chile clp' },
  { s: 'ARS$', n: 'بيزو أرجنتيني', c: 'ARS', q: 'بيزو ارجنتيني argentina ars' },
  { s: 'Col$', n: 'بيزو كولومبي', c: 'COP', q: 'بيزو كولومبي colombia cop' },
  { s: 'S/', n: 'سول بيروفي', c: 'PEN', q: 'سول بيرو peru pen' },
  { s: 'HK$', n: 'دولار هونغ كونغ', c: 'HKD', q: 'دولار هونغ كونغ hong kong hkd' },
  { s: 'NT$', n: 'دولار تايواني', c: 'TWD', q: 'دولار تايوان taiwan twd' },
  { s: '₼', n: 'مانات أذربيجاني', c: 'AZN', q: 'مانات اذربيجان azerbaijan azn' },
  { s: '₾', n: 'لاري جورجي', c: 'GEL', q: 'لاري جورجيا georgia gel' },
  { s: '₸', n: 'تينغ كازاخستاني', c: 'KZT', q: 'تينغ كازاخستان kazakhstan kzt' },
];

function getCurrencyLabel(symbol) {
  const found = WORLD_CURRENCIES.find(x => x.s === symbol);
  return found ? `${found.n} (${found.s})` : symbol;
}

function filterCurrencies(query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return WORLD_CURRENCIES.slice();
  return WORLD_CURRENCIES.filter(x =>
    x.n.toLowerCase().includes(q) ||
    x.s.toLowerCase().includes(q) ||
    x.c.toLowerCase().includes(q) ||
    x.q.toLowerCase().includes(q)
  );
}

function renderCurrencyDropdown(items) {
  const dd = document.getElementById('currencyDropdown');
  if (!dd) return;
  if (!items.length) {
    dd.innerHTML = '<div class="currency-dropdown-empty">لا توجد نتائج</div>';
    dd.style.display = 'block';
    return;
  }
  const current = document.getElementById('settingsCurrency')?.value || appCurrency;
  dd.innerHTML = items.map(x => `
    <div class="currency-dropdown-item ${x.s === current ? 'active' : ''}" data-symbol="${x.s}" data-name="${x.n}">
      <span>${x.n} <small style="opacity:0.6">(${x.c})</small></span>
      <span class="sym">${x.s}</span>
    </div>
  `).join('');
  dd.style.display = 'block';
  dd.querySelectorAll('.currency-dropdown-item').forEach(el => {
    el.addEventListener('click', function() {
      selectCurrency(this.dataset.symbol, this.dataset.name);
    });
  });
}

function selectCurrency(symbol, name) {
  const hidden = document.getElementById('settingsCurrency');
  const input = document.getElementById('currencySearchInput');
  const text = document.getElementById('currencySelectedText');
  const dd = document.getElementById('currencyDropdown');
  if (hidden) hidden.value = symbol;
  if (input) input.value = '';
  if (text) text.textContent = (name || getCurrencyLabel(symbol)) + ' (' + symbol + ')';
  if (dd) dd.style.display = 'none';
}

function initCurrencySearch() {
  const input = document.getElementById('currencySearchInput');
  const dd = document.getElementById('currencyDropdown');
  if (!input || input._currencyBound) return;
  input._currencyBound = true;

  input.addEventListener('focus', function() {
    renderCurrencyDropdown(filterCurrencies(this.value));
  });
  input.addEventListener('input', function() {
    renderCurrencyDropdown(filterCurrencies(this.value));
  });
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.currency-search-wrap')) {
      if (dd) dd.style.display = 'none';
    }
  });
}


function openPaymentModal() {
    const modal = document.getElementById('paymentModal');
    if (modal) modal.classList.add('open');
}
function closePaymentModal() {
    const modal = document.getElementById('paymentModal');
    if (modal) modal.classList.remove('open');
}

function openMobileMenu() {
    document.getElementById('appSidebar')?.classList.add('open');
    document.getElementById('sidebarOverlay')?.classList.add('active');
}
function closeMobileMenu() {
    document.getElementById('appSidebar')?.classList.remove('open');
    document.getElementById('sidebarOverlay')?.classList.remove('active');
}
function toggleMobileMenu(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const sidebar = document.getElementById('appSidebar');
    if (sidebar?.classList.contains('open')) closeMobileMenu();
    else openMobileMenu();
}

function toggleRestaurantDropdown() {
    document.getElementById('restaurantDropdown')?.classList.toggle('open');
}
function closeRestaurantDropdown() {
    document.getElementById('restaurantDropdown')?.classList.remove('open');
}

function showSettingsModal() {
    document.getElementById('globalWastePercent').value = globalWaste;
    document.getElementById('foodCostPercent').value = foodCostPercent;
    document.getElementById('settingsRestaurantName').value = document.getElementById('restaurantNameText')?.textContent || '';
    const cur = document.getElementById('settingsCurrency');
    if (cur) cur.value = appCurrency || 'ر.س';
    const mm = document.getElementById('minMarginPercent');
    if (mm) mm.value = minMarginPercent || 30;
    // عرض العملة المحددة + تفعيل البحث
    const found = WORLD_CURRENCIES.find(x => x.s === (appCurrency || 'ر.س'));
    selectCurrency(appCurrency || 'ر.س', found ? found.n : appCurrency);
    initCurrencySearch();
    document.getElementById('settingsModal').classList.add('active');
}

async function saveSettings() {
    const waste = parseFloat(document.getElementById('globalWastePercent').value);
    const fcp = parseFloat(document.getElementById('foodCostPercent').value);
    const restName = document.getElementById('settingsRestaurantName').value.trim();
    const currency = document.getElementById('settingsCurrency')?.value || 'ر.س';
    const minMargin = parseFloat(document.getElementById('minMarginPercent')?.value) || 30;

    if (isNaN(waste) || isNaN(fcp) || fcp <= 0 || fcp >= 100) return showToast('قيم غير صحيحة', true);
    closeModals();

    const res = await callServer('updateSettings', {
        wastePercent: waste,
        foodCostPercent: fcp,
        currency: currency,
        minMarginPercent: minMargin
    }, true);

    if (res.success) {
        globalWaste = waste;
        foodCostPercent = fcp;
        appCurrency = currency;
        minMarginPercent = minMargin;
        // حفظ محلي كنسخة احتياطية
        try {
            localStorage.setItem('foodCurrency_' + currentUserEmail, currency);
            localStorage.setItem('foodMinMargin_' + currentUserEmail, String(minMargin));
        } catch (e) {}

        if (restName && restName !== document.getElementById('restaurantNameText')?.textContent) {
            await callServer('updateRestaurantName', { name: restName }, false);
            document.getElementById('restaurantNameText').textContent = restName;
            if (typeof generateQRCode === 'function') generateQRCode();
        }
        showToast('تم حفظ الإعدادات');
        if (typeof refreshCostsAndPrices === 'function') refreshCostsAndPrices(true);
    } else showToast(res.error, true);
}

function showEditRestaurantName() {
    document.getElementById('restaurantNameInput').value = document.getElementById('restaurantNameText')?.textContent || '';
    document.getElementById('restaurantModal')?.classList.add('active');
}

async function updateRestaurantName() {
    const name = document.getElementById('restaurantNameInput').value.trim();
    if (!name) return showToast('أدخل اسماً', true);
    closeModals();
    const res = await callServer('updateRestaurantName', { name }, true);
    if (res.success) {
        document.getElementById('restaurantNameText').textContent = name;
        if (typeof generateQRCode === 'function') generateQRCode();
        showToast('تم تحديث الاسم');
    } else showToast(res.error, true);
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

    // استعادة العملة والحد الأدنى محلياً
    try {
        const email = localStorage.getItem('foodUserEmail');
        if (email) {
            const c = localStorage.getItem('foodCurrency_' + email);
            const m = localStorage.getItem('foodMinMargin_' + email);
            if (c) appCurrency = c;
            if (m) minMarginPercent = parseFloat(m) || 30;
        }
    } catch (e) {}
});
