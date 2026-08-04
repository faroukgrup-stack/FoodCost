/**
 * auth-check-food.js — منظومة التحقق الخاصة بمنصة Food Cost (مستقلة تماماً)
 * الإصدار 1.0 — مطابق لمنطق المنصة الشاملة ولكن بمفتاح خاص
 */
(function () {
    "use strict";

    /* ─── الإعدادات الخاصة بـ Food Cost ─── */
    const SECRET_KEY = "F00dC0st_S3cur3_K3y_2026!"; // مفتاح مختلف تماماً عن المنصة الشاملة
    const LOGIN_PAGE = "Food Cost -FG.html"; // صفحة الدخول الخاصة بفود كوست

    /* ─── جلب البيانات ─── */
    const token     = localStorage.getItem("foodUserToken"); // استخدام مفتاح مختلف لتجنب التداخل
    const userName  = localStorage.getItem("foodUserName");
    const userEmail = localStorage.getItem("foodUserEmail");
    const daysLeft  = localStorage.getItem("foodDaysLeft");

    /* ─── دالة الطرد الكاملة ─── */
    function reject(reason) {
        localStorage.removeItem("foodUserToken");
        localStorage.removeItem("foodUserName");
        localStorage.removeItem("foodUserEmail");
        localStorage.removeItem("foodDaysLeft");
        localStorage.removeItem("foodLoginTimestamp");
        console.warn("🚫 FoodCost Access denied:", reason);
        window.location.replace(LOGIN_PAGE);
    }

    /* ─── 1. وجود البيانات الأساسية ─── */
    if (!token || !userName) {
        reject("missing credentials");
        return;
    }

    /* ─── 2. التحقق الصارم من التوكن ─── */
    let isValid = false;
    let tokenEmail = "";
    try {
        const decoded = atob(token);
        const parts   = decoded.split("|");

        if (parts.length === 3) {
            const keyMatch    = parts[0] === SECRET_KEY;
            const validExpiry = parts[2].trim().length > 0;
            tokenEmail        = parts[1];

            const emailMatch = userEmail
                ? parts[1] === userEmail
                : parts[1].includes("@");

            isValid = keyMatch && emailMatch && validExpiry;
        }
    } catch (e) {
        isValid = false;
    }

    if (!isValid) {
        reject("invalid token");
        return;
    }

    /* ─── 3. التحقق من تاريخ انتهاء الاشتراك ─── */
    try {
        const expiryDate = atob(token).split("|")[2];
        const expiry     = new Date(expiryDate);
        const today      = new Date();
        today.setHours(0, 0, 0, 0);
        if (expiry < today) {
            reject("subscription expired on " + expiryDate);
            return;
        }
    } catch (e) {}

    /* ─── 4. التحقق من daysLeft ─── */
    if (daysLeft !== null) {
        const days = parseInt(daysLeft, 10);
        if (!isNaN(days) && days <= 0) {
            reject("subscription expired (daysLeft=0)");
            return;
        }
    }

    /* ─── 5. التحقق من مهلة 24 ساعة ─── */
    const loginTimestamp = localStorage.getItem("foodLoginTimestamp");
    if (loginTimestamp) {
        const elapsed = Date.now() - parseInt(loginTimestamp, 10);
        const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;
        if (elapsed > SESSION_DURATION_MS) {
            reject("session expired (24h)");
            return;
        }
    } else {
        // إذا لم يكن هناك طابع زمني، نعتبر الجلسة منتهية (أمان إضافي)
        reject("missing session timestamp");
        return;
    }

    /* ─── 6. منع الرجوع للخلف بزر المتصفح ─── */
    history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", function () {
        history.pushState(null, "", window.location.href);
    });

    /* ─── 7. عرض بيانات المستخدم في الصفحة ─── */
    window.addEventListener("DOMContentLoaded", function () {
        const nameEl = document.getElementById("displayUserName");
        if (nameEl) nameEl.innerText = userName;

        const daysEl = document.getElementById("displayDaysLeft");
        if (daysEl && daysLeft) daysEl.innerText = daysLeft;
    });

    console.log("✅ FoodCost Access granted |", userName, "| أيام متبقية:", daysLeft ?? "غير محدد");

})();
