// رابط السيرفر الجديد على Supabase (Edge Function باسم api)
// استبدل YOUR-PROJECT-REF بمعرّف مشروعك من: Supabase > Project Settings > General > Reference ID
const COST_API_URL="https://euboicafuubzpfujxxdn.supabase.co/functions/v1/api";
const SESSION_DURATION_MS=24*60*60*1000;
// رابط الدفع للباقة الأساسية (99$) — الرابط الحالي
const PAYMENT_LINK="https://www.entervia.co/checkout/78";
// روابط الدفع لكل باقة — ضع رابط صفحة الدفع الخاصة بكل باقة (الإنطلاقة 299$ والمتقدمة 499$)
const PAYMENT_LINKS={
  basic:"https://www.entervia.co/checkout/78",
  pro:"https://www.entervia.co/checkout/78",      // ← مؤقت: استبدله برابط الدفع لباقة الإنطلاقة (299$ سنوياً)
  premium:"https://www.entervia.co/checkout/78"   // ← مؤقت: استبدله برابط الدفع لباقة المتقدمة (499$ سنوياً)
};
// رقم واتساب الدعم (يُستخدم عند عدم ضبط رابط دفع لباقة)
const SUPPORT_WHATSAPP="905550196682";
const CACHE_DURATION_MS=5*60*1000;
const PUBLIC_APP_URL="https://rest-tools.farouk-grup.com/";
const APP_VERSION="4.6";const APP_NAME="Mataami Pro";
// نطاقات النظام نفسه (أي نطاق آخر يُعامل كدومين خاص لمطعم ويُحوَّل لمينيو المطعم)
const APP_HOSTS=["rest-tools.farouk-grup.com","localhost","127.0.0.1"];
