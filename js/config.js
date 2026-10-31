// ============================================================
// config.js - إعدادات نظام FoodCost
// ============================================================

const COST_API_URL = "https://script.google.com/macros/s/AKfycbwRMTtEKS9xma_EgT7OWKD-chXdXdfNU0L_-7IUEIfBEl-rGlil2_4T61vjsRgk02ba/exec";
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 ساعة
const PAYMENT_LINK = "https://www.entervia.co/checkout/78";
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 دقائق (تسريع التنقل بين الصفحات)

// رابط التطبيق العلني على السيرفر — مهم لكود QR التقييم
// مثال: "https://yoursite.com/foodcost/"
// اتركه فارغاً ليُحسب تلقائياً من عنوان الصفحة (يعمل فقط على https/http وليس file://)
const PUBLIC_APP_URL = "https://rest-tools.farouk-grup.com/";

const APP_VERSION = "2.1";
const APP_NAME = "FoodCost";
