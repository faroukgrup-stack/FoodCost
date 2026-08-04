/**
 * auth-check-food.js — منظومة التحقق الخاصة بمنصة Food Cost (مستقلة تماماً)
 * الإصدار 1.3 — لا يستخدم إعادة توجيه، بل يتحكم في ظهور العناصر مباشرة
 */
(function () {
    "use strict";

    const SECRET_KEY = "F00dC0st_S3cur3_K3y_2026!";
    const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

    // جلب البيانات
    const token     = localStorage.getItem("foodUserToken");
    const userName  = localStorage.getItem("foodUserName");
    const userEmail = localStorage.getItem("foodUserEmail");
    const daysLeft  = localStorage.getItem("foodDaysLeft");
    const loginTimestamp = localStorage.getItem("foodLoginTimestamp");

    // عناصر الصفحة
    const loginScreen = document.getElementById("loginScreen");
    const appMain     = document.getElementById("appMain");

    // دالة لعرض شاشة الدخول وإخفاء لوحة التحكم
    function showLogin(reason) {
        if (loginScreen) loginScreen.style.display = "flex";
        if (appMain) appMain.style.display = "none";
        // تنظيف البيانات غير الصالحة
        localStorage.removeItem("foodUserToken");
        localStorage.removeItem("foodUserName");
        localStorage.removeItem("foodUserEmail");
        localStorage.removeItem("foodDaysLeft");
        localStorage.removeItem("foodLoginTimestamp");
        console.warn("🚫 FoodCost: " + reason);
    }

    // دالة لعرض لوحة التحكم وإخفاء شاشة الدخول
    function showApp() {
        if (loginScreen) loginScreen.style.display = "none";
        if (appMain) appMain.style.display = "block";
    }

    // ===== 1. التحقق من وجود التوكن =====
    if (!token || !userName) {
        showLogin("missing credentials");
        return;
    }

    // ===== 2. التحقق من صحة التوكن =====
    let isValid = false;
    try {
        const decoded = atob(token);
        const parts = decoded.split("|");
        if (parts.length === 3 && parts[0] === SECRET_KEY) {
            const emailMatch = userEmail ? parts[1] === userEmail : parts[1].includes("@");
            isValid = emailMatch && parts[2].trim().length > 0;
        }
    } catch (e) {
        isValid = false;
    }

    if (!isValid) {
        showLogin("invalid token");
        return;
    }

    // ===== 3. التحقق من تاريخ الانتهاء =====
    try {
        const expiryDate = atob(token).split("|")[2];
        const expiry = new Date(expiryDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (expiry < today) {
            showLogin("subscription expired on " + expiryDate);
            return;
        }
    } catch (e) {
        showLogin("expiry check failed");
        return;
    }

    // ===== 4. التحقق من daysLeft =====
    if (daysLeft !== null && parseInt(daysLeft, 10) <= 0) {
        showLogin("subscription expired (daysLeft=0)");
        return;
    }

    // ===== 5. التحقق من مهلة 24 ساعة =====
    if (loginTimestamp) {
        const elapsed = Date.now() - parseInt(loginTimestamp, 10);
        if (elapsed > SESSION_DURATION_MS) {
            showLogin("session expired (24h)");
            return;
        }
    } else {
        showLogin("missing session timestamp");
        return;
    }

    // ===== 6. كل شيء صحيح، نعرض لوحة التحكم =====
    showApp();

    // ===== 7. منع الرجوع للخلف بزر المتصفح (اختياري) =====
    history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", function () {
        history.pushState(null, "", window.location.href);
    });

    // ===== 8. عرض اسم المستخدم والأيام المتبقية =====
    window.addEventListener("DOMContentLoaded", function () {
        const nameEl = document.getElementById("displayUserName");
        if (nameEl) nameEl.innerText = userName;

        const daysEl = document.getElementById("displayDaysLeft");
        if (daysEl && daysLeft) daysEl.innerText = daysLeft;
    });

    console.log("✅ FoodCost Access granted |", userName, "| أيام متبقية:", daysLeft ?? "غير محدد");
})();
