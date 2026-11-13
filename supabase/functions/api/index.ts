// ============================================================
// FoodCost v3.0 — Supabase Edge Function  (FAROUK GRUP)
// بديل كامل لـ google-apps-script.js مع الحفاظ على نفس واجهة الاستدعاء:
//   ?fn=...&restaurantEmail=...&token=...&params={...}   (GET)
//   أو  POST  body = JSON  /  x-www-form-urlencoded
// كل الاستجابات JSON بنفس الشكل القديم (success / status / authError ...)
// الاشتراك سنوي دائماً (سنة واحدة عند التسجيل وعند كل تجديد)
// ============================================================
import postgres from "npm:postgres@3.4.5";
import { decodeBase64, encodeBase64 } from "jsr:@std/encoding@1/base64";

// ---------------- الإعدادات والمفاتيح السرية ----------------
// تُضبط من: Dashboard → Edge Functions → Secrets  (أو supabase secrets set)
//   PASSWORD_PEPPER  (نفس قيمة Apps Script حتى تعمل كلمات المرور القديمة)
//   ADMIN_SECRET_KEY (مفتاح دوال الإدارة)
//   FOOD_SECRET_KEY  (اختياري: توافق مع التوكن القديم)
const PASSWORD_PEPPER = Deno.env.get("PASSWORD_PEPPER") || "";
const ADMIN_SECRET_KEY = Deno.env.get("ADMIN_SECRET_KEY") || "";
const FOOD_SECRET_KEY = Deno.env.get("FOOD_SECRET_KEY") || "";
const SUPABASE_URL = (Deno.env.get("SUPABASE_URL") || "").replace(/\/+$/, "");
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const DB_URL = Deno.env.get("SUPABASE_DB_URL") || "";

const SUBSCRIPTION_YEARS = 1; // الاشتراك سنوي دائماً
const SESSION_HOURS = 24;
const BUCKET = "menu-images";
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

const SHEET_MATERIALS = "رو ماتيريال";
const SHEET_MAIN = "مين ريسيبي";
const SHEET_SETTINGS = "اعدادات";
const SHEET_PRICE_HISTORY = "تاريخ_الأسعار";
const SHEET_SALES = "مبيعات";
const SHEET_MENU_ORDERS = "طلبات_المينيو";
const FC_R5_BANNER_SHEET = "_FC_MenuBanners_R5";
const RESERVED_NAMES = [SHEET_MATERIALS, SHEET_MAIN, SHEET_SETTINGS, SHEET_PRICE_HISTORY, SHEET_SALES, SHEET_MENU_ORDERS, FC_R5_BANNER_SHEET];
const ALLOWED_DOMAINS = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "live.com", "icloud.com", "proton.me", "protonmail.com", "zoho.com", "mail.com", "aol.com", "yandex.com", "msn.com", "me.com", "mac.com"];
const REVIEW_HEADERS = ["التاريخ", "الاسم", "رقم_الهاتف", "تاريخ_الزيارة", "عدد_الأشخاص", "نوع_الزيارة", "تقييم_الطعام", "تقييم_الخدمة", "تقييم_النظافة", "تقييم_الاسعار", "التقييم_العام", "تصنيف_العميل", "الأطباق_المفضلة", "توصية", "الملاحظات_والاقتراحات", "restaurantEmail", "restaurantName"];
const REVIEW_COLS = ["date", "name", "phone", "visit_date", "people_count", "visit_type", "food", "service", "cleanliness", "price", "overall", "status", "favorite_dishes", "recommendation", "notes", "restaurant_email", "restaurant_name"];
const REVIEW_KEYS = ["date", "name", "phone", "visitDate", "peopleCount", "visitType", "food", "service", "cleanliness", "price", "overall", "status", "favoriteDishes", "recommendation", "notes", "restaurantEmail", "restaurantName"];

const sql = postgres(DB_URL, { prepare: false, max: 4, idle_timeout: 20, connect_timeout: 15, onnotice: () => {} });

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
  "Access-Control-Max-Age": "86400",
};

// ---------------- أدوات مساعدة ----------------
type P = Record<string, any>;
class UserError extends Error {}
const fail = (m: string): never => { throw new UserError(m); };
const num = (v: any, def = 0) => { const n = parseFloat(v); return Number.isFinite(n) ? n : def; };
const str = (v: any) => (v === undefined || v === null ? "" : String(v));
const lower = (v: any) => str(v).trim().toLowerCase();
const r2 = (n: number) => Math.round(n * 100) / 100;
const uuid = () => crypto.randomUUID();
function parseJSON<T>(v: any, def: T): T { if (typeof v !== "string") return (v ?? def) as T; try { return JSON.parse(v); } catch { return def; } }
function safeDate(input: any, fallback: Date | null = new Date()): Date | null {
  if (input === undefined || input === null || input === "") return fallback;
  const d = new Date(input);
  return isNaN(d.getTime()) ? fallback : d;
}
function fmtGmt3(d: Date) { return new Date(d.getTime() + 3 * 3600e3).toISOString().slice(0, 10); }
function isValidSheetName(name: string) {
  if (!name) return false;
  if (/[\[\]\*\/\\\?\:]/.test(name)) return false;
  if (name.length > 100) return false;
  return name.trim() !== "";
}
async function sha256Hex(data: string | Uint8Array) {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const d = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function ordJSON(list: any[]) { return JSON.stringify(list.map((x, i) => ({ ...x, ord: i }))); }
function chunk<T>(arr: T[], n = 1000): T[][] { const out: T[][] = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out; }

// ---------------- كلمات المرور (نفس خوارزمية Apps Script) ----------------
async function hashPassword(plain: string) {
  if (!PASSWORD_PEPPER) fail("PASSWORD_PEPPER غير مضبوط في Secrets الخاصة بـ Edge Functions");
  const salt = uuid().replace(/-/g, "").substring(0, 16);
  return "sha256$" + salt + "$" + (await sha256Hex(PASSWORD_PEPPER + salt + String(plain)));
}
async function verifyPassword(plain: string, stored: string) {
  if (!plain || !stored) return false;
  stored = String(stored);
  if (stored.indexOf("sha256$") === 0) {
    if (!PASSWORD_PEPPER) return false;
    const parts = stored.split("$");
    if (parts.length !== 3) return false;
    return (await sha256Hex(PASSWORD_PEPPER + parts[1] + String(plain))) === parts[2];
  }
  return stored === String(plain).trim(); // مسار قديم: نص صريح
}
const isHashed = (s: string) => !!s && String(s).indexOf("sha256$") === 0;

// ---------------- الجلسات ----------------
async function createSession(email: string, hours = SESSION_HOURS) {
  const token = uuid() + uuid().replace(/-/g, "");
  const expiry = new Date(Date.now() + hours * 3600e3);
  await sql`insert into fc_sessions (token, email, expires_at) values (${token}, ${email.toLowerCase()}, ${expiry.toISOString()}::timestamptz)`;
  return { token, expiry: expiry.toISOString() };
}
async function requireValidToken(token: string): Promise<{ valid: boolean; email?: string; reason?: string; staffId?: string | null }> {
  if (!token) return { valid: false, reason: "التوكن مطلوب" };
  const rows = await sql`select email, expires_at, staff_id from fc_sessions where token = ${token}`;
  if (rows.length) {
    if (new Date(rows[0].expires_at) < new Date()) {
      await sql`delete from fc_sessions where token = ${token}`;
      return { valid: false, reason: "انتهت صلاحية الجلسة" };
    }
    return { valid: true, email: rows[0].email, staffId: rows[0].staff_id || null };
  }
  if (FOOD_SECRET_KEY) { // توافق خلفي مع التوكن القديم (Base64)
    try {
      const legacy = new TextDecoder().decode(decodeBase64(token)).split("|");
      if (legacy.length === 3 && legacy[0] === FOOD_SECRET_KEY) {
        if (new Date(legacy[2]) < new Date()) return { valid: false, reason: "انتهت صلاحية الجلسة" };
        return { valid: true, email: legacy[1] };
      }
    } catch { /* ignore */ }
  }
  return { valid: false, reason: "التوكن غير صالح" };
}
async function revokeSession(token: string) {
  if (!token) return { success: false };
  await sql`delete from fc_sessions where token = ${token}`;
  return { success: true };
}

// ---------------- المستخدمون والاشتراك ----------------
async function getUserRow(email: string) {
  const r = await sql`select * from fc_users where email = ${lower(email)}`;
  return r[0] || null;
}
async function ensureRestaurant(email: string) {
  await sql`insert into fc_restaurants (email) values (${lower(email)}) on conflict (email) do nothing`;
}

async function login(username: any, password: any) {
  const user = str(username).trim(), pass = str(password).trim();
  if (!user || !pass) return { status: "invalid", message: "بيانات الدخول غير صحيحة" };
  const row = await getUserRow(user);
  if (!row) return { status: "invalid", message: "بيانات الدخول غير صحيحة" };
  if (!(await verifyPassword(pass, row.password_hash))) return { status: "invalid", message: "بيانات الدخول غير صحيحة" };
  if (!isHashed(row.password_hash) && PASSWORD_PEPPER) {
    try { await sql`update fc_users set password_hash = ${await hashPassword(pass)} where email = ${row.email}`; } catch { /* ignore */ }
  }
  if (row.frozen) return { status: "frozen", message: "❌ تم تجميد حسابك. الرجاء مراجعة الإدارة." };
  const expiry = new Date(row.expiry_date), today = new Date();
  if (today > expiry) return { status: "expired", message: "انتهى اشتراكك" };
  const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / 864e5);
  sql`delete from fc_sessions where expires_at < now()`.catch(() => {});
  const session = await createSession(row.email, SESSION_HOURS);
  // تسجيل آخر دخول (عمود last_login في fc_users — نفّذ SQL الإضافة مرة واحدة إن لم يكن موجوداً)
  sql`update fc_users set last_login = now() where email = ${row.email}`.catch(() => {});
  await ensureRestaurant(row.email);
  const plan = planOf(row.plan);
  return { status: "success", name: row.full_name || row.email, daysLeft, email: row.email, token: session.token, sessionExpiry: session.expiry, plan: plan.key, planName: plan.name };
}

async function validateToken(token: string) {
  const c = await requireValidToken(token);
  return c.valid ? { status: "success", message: "توكن صالح", email: c.email } : { status: "invalid", message: c.reason || "توكن غير صالح" };
}

async function registerUser(p: P) {
  try {
    const email = lower(p.email), password = str(p.password).trim(), fullName = str(p.fullName).trim();
    if (!email || !password) return { status: "error", message: "البريد الإلكتروني وكلمة المرور مطلوبان" };
    if (password.length < 6) return { status: "error", message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { status: "error", message: "صيغة البريد الإلكتروني غير صحيحة" };
    const domain = email.split("@")[1];
    if (!domain || ALLOWED_DOMAINS.indexOf(domain) === -1) return { status: "error", message: "نطاق البريد غير مسموح" };
    if (await getUserRow(email)) return { status: "exists", message: "هذا البريد الإلكتروني مسجل مسبقاً. يمكنك تجديد الاشتراك.", renewLink: "f@14-G-17.html" };
    const expiry = new Date(); expiry.setFullYear(expiry.getFullYear() + SUBSCRIPTION_YEARS);
    const hash = await hashPassword(password);
    const plan = planOf(p.plan).key;
    const txId = str(p.txId || p.transactionId).trim();
    if (plan !== "basic" && (!txId || txId.length < 8 || !/^\d+$/.test(txId))) return { status: "error", message: "باقة " + PLANS[plan].name + " تتطلب إدخال معرّف عملية الدفع (8 أرقام على الأقل)" };
    const okReg = await sql.begin(async (tx: any) => {
      if (txId) {
        const ins = await tx`insert into fc_used_transactions (tx_id, email) values (${txId}, ${email}) on conflict (tx_id) do nothing returning tx_id`;
        if (!ins.length) return false;
      }
      await tx`insert into fc_users (email, password_hash, expiry_date, full_name, plan) values (${email}, ${hash}, ${expiry.toISOString()}::timestamptz, ${fullName || email.split("@")[0]}, ${plan})`;
      return true;
    });
    if (!okReg) return { status: "error", message: "معرّف العملية مستخدم مسبقًا" };
    await ensureRestaurant(email);
    return { status: "success", message: "تم إنشاء الحساب بنجاح! الباقة: " + PLANS[plan].name, loginUrl: "index.html", plan };
  } catch (e) {
    return { status: "error", message: "حدث خطأ في السيرفر: " + errMsg(e) };
  }
}

function addOneYear(current: any) {
  const today = new Date();
  let d = new Date(current);
  if (isNaN(d.getTime()) || d < today) d = today;
  d = new Date(d.getTime());
  d.setFullYear(d.getFullYear() + SUBSCRIPTION_YEARS); // سنوي دائماً
  return d;
}

async function createOrRenewUser(email: string, password: string) {
  try {
    const pw = str(password).trim();
    if (!pw || pw.length < 6) return { status: "error", message: "كلمة المرور مطلوبة (6 أحرف على الأقل)" };
    const row = await getUserRow(email);
    if (!row) return { status: "error", message: "الحساب غير موجود. يرجى التسجيل أولاً من صفحة الاشتراك." };
    if (!(await verifyPassword(pw, row.password_hash))) return { status: "error", message: "كلمة المرور غير صحيحة" };
    const d = addOneYear(row.expiry_date);
    await sql`update fc_users set expiry_date = ${d.toISOString()}::timestamptz, frozen = false where email = ${row.email}`;
    const f = fmtGmt3(d);
    return { status: "exists", newExpiry: f, message: "تم تجديد الاشتراك حتى " + f };
  } catch (e) { return { status: "error", message: errMsg(e) }; }
}

async function renewSubscription(p: P) {
  try {
    const email = lower(p.email || p.username), password = str(p.password).trim();
    const txId = str(p.txId || p.transactionId).trim();
    if (!email || !password) return { status: "error", message: "البريد الإلكتروني وكلمة المرور مطلوبان" };
    if (!txId || txId.length < 8 || !/^\d+$/.test(txId)) return { status: "error", message: "معرّف عملية الدفع مطلوب (8 أرقام على الأقل)" };
    const row = await getUserRow(email);
    if (!row) return { status: "error", message: "الحساب غير موجود. يرجى التسجيل أولاً." };
    if (!(await verifyPassword(password, row.password_hash))) return { status: "error", message: "كلمة المرور غير صحيحة" };
    if (row.frozen) return { status: "error", message: "الحساب مجمّد. راجع الإدارة." };
    const result = await sql.begin(async (tx: any) => {
      const ins = await tx`insert into fc_used_transactions (tx_id, email) values (${txId}, ${email}) on conflict (tx_id) do nothing returning tx_id`;
      if (!ins.length) return null;
      const [u] = await tx`select expiry_date from fc_users where email = ${email} for update`;
      const d = addOneYear(u.expiry_date);
      await tx`update fc_users set expiry_date = ${d.toISOString()}::timestamptz, frozen = false where email = ${email}`;
      if (p.plan && PLANS[str(p.plan)]) await tx`update fc_users set plan = ${str(p.plan)} where email = ${email}`;
      return d;
    });
    if (!result) return { status: "error", message: "معرّف العملية مستخدم مسبقًا" };
    const f = fmtGmt3(result);
    const pl = planOf((await getUserRow(email))?.plan);
    return { status: "success", newExpiry: f, plan: pl.key, planName: pl.name, message: "تم تجديد الاشتراك (باقة " + pl.name + ") حتى " + f };
  } catch (e) { return { status: "error", message: errMsg(e) }; }
}

async function auditUsers(paidEmails: string[]) {
  try {
    const paid = (paidEmails || []).map(lower).filter(Boolean);
    const total = (await sql`select count(*)::int as n from fc_users`)[0].n;
    const up = await sql`update fc_users set frozen = false where email = any(${paid}::text[]) returning email`;
    const fr = await sql`update fc_users set frozen = true where not (email = any(${paid}::text[])) and frozen = false returning email`;
    return { status: "success", message: "تم التدقيق بنجاح", updated: up.length, frozen: fr.length, totalUsers: total };
  } catch (e) { return { status: "error", message: errMsg(e) }; }
}

async function getUsers() {
  try {
    const rows = await sql`select * from fc_users order by created_at, email`;
    const today = Date.now();
    // احتياطي: آخر جلسة من fc_sessions لمن ليس لهم last_login بعد
    const sessionLast: Record<string, string> = {};
    try {
      const sess = await sql`
        select email, max(expires_at) as last_exp
        from fc_sessions
        group by email`;
      sess.forEach((s: any) => {
        if (s.email && s.last_exp) sessionLast[String(s.email).toLowerCase()] = s.last_exp;
      });
    } catch { /* عمود أو جدول غير موجود — نتجاهل */ }

    return {
      status: "success",
      data: rows.map((r: any) => {
        const exp = new Date(r.expiry_date);
        const emailKey = String(r.email || "").toLowerCase();
        const lastLogin = r.last_login || sessionLast[emailKey] || null;
        return {
          username: r.email,
          fullName: r.full_name || r.email,
          expiryDate: fmtGmt3(exp),
          daysLeft: Math.ceil((exp.getTime() - today) / 864e5),
          platformKey: "menuEngineering",
          platform: "هندسة المينيو",
          plan: planOf(r.plan).key,
          planName: planOf(r.plan).name,
          frozen: !!r.frozen,
          lastLogin: lastLogin ? new Date(lastLogin).toISOString() : null,
        };
      }),
    };
  } catch (e) { return { status: "error", message: errMsg(e) }; }
}

async function addUser(p: P) {
  try {
    const email = lower(p.username || p.email);
    const password = str(p.password) || "123456";
    if (!email) return { success: false, error: "البريد الإلكتروني مطلوب" };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { success: false, error: "صيغة البريد غير صحيحة" };
    if (await getUserRow(email)) return { success: false, error: "البريد مسجل مسبقاً" };
    let expiry = safeDate(p.expiryDate, null);
    if (!expiry) { expiry = new Date(); expiry.setFullYear(expiry.getFullYear() + SUBSCRIPTION_YEARS); }
    await sql`insert into fc_users (email, password_hash, expiry_date, full_name, plan) values (${email}, ${await hashPassword(password)}, ${expiry.toISOString()}::timestamptz, ${str(p.fullName) || email}, ${planOf(p.plan).key})`;
    await ensureRestaurant(email);
    return { success: true, message: "تمت الإضافة بنجاح" };
  } catch (e) { return { success: false, error: errMsg(e) }; }
}

async function deleteUser(p: P) {
  try {
    const email = lower(p.username || p.email);
    if (!email) return { success: false, error: "البريد الإلكتروني مطلوب" };
    const r = await sql`delete from fc_users where email = ${email} returning email`;
    if (!r.length) return { success: false, error: "المستخدم غير موجود" };
    return { success: true, message: "تم الحذف بنجاح" };
  } catch (e) { return { success: false, error: errMsg(e) }; }
}

async function updateUser(p: P, isAdmin: boolean) {
  try {
    const email = lower(p.username || p.id || p.email);
    if (!email) return { success: false, error: "البريد الإلكتروني مطلوب" };
    const row = await getUserRow(email);
    if (!row) return { success: false, error: "المستخدم غير موجود" };
    if (p.password !== undefined && p.password !== "") {
      if (!isAdmin && !(await verifyPassword(str(p.oldPassword), row.password_hash))) return { success: false, error: "كلمة المرور الحالية غير صحيحة" };
      if (str(p.password).trim().length < 6) return { success: false, error: "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل" };
      await sql`update fc_users set password_hash = ${await hashPassword(str(p.password).trim())} where email = ${email}`;
      await sql`delete from fc_sessions where email = ${email}`;
    } else if (!isAdmin && !(await verifyPassword(str(p.oldPassword), row.password_hash))) {
      return { success: false, error: "كلمة المرور الحالية غير صحيحة" };
    }
    if (p.fullName !== undefined && p.fullName !== "") await sql`update fc_users set full_name = ${str(p.fullName).trim()} where email = ${email}`;
    if (isAdmin) {
      if (p.expiryDate !== undefined && p.expiryDate !== "") {
        const d = safeDate(p.expiryDate, null);
        if (d) await sql`update fc_users set expiry_date = ${d.toISOString()}::timestamptz where email = ${email}`;
      }
      if (p.frozen !== undefined) {
        const fz = p.frozen === true || p.frozen === "true" || p.frozen === "TRUE";
        await sql`update fc_users set frozen = ${fz} where email = ${email}`;
      }
      if (p.plan !== undefined && PLANS[str(p.plan)]) await sql`update fc_users set plan = ${str(p.plan)} where email = ${email}`;
    }
    return { success: true, message: "تم التحديث بنجاح" };
  } catch (e) { return { success: false, error: errMsg(e) }; }
}

// ---------------- الإعدادات ----------------
async function getRestaurant(email: string, db: any = sql) {
  const r = await db`select * from fc_restaurants where email = ${email}`;
  return r[0] || null;
}
function settingsOf(r: any) {
  return {
    wastePercent: num(r?.waste_percent, 0) || 0,
    foodCostPercent: num(r?.food_cost_percent, 30) || 30,
    currency: r?.currency ? String(r.currency) : "ر.س",
    minMarginPercent: r && r.min_margin_percent !== null && r.min_margin_percent !== undefined ? (num(r.min_margin_percent, 30) || 30) : 30,
  };
}
async function getSettings(email: string) { return settingsOf(await getRestaurant(email)); }
async function recalc(email: string, db: any = sql) { await db`select fc_recalc(${email})`; }

async function updateSettings(email: string, p: P) {
  const waste = num(p.wastePercent, 0), fcp = num(p.foodCostPercent, 30);
  await sql`update fc_restaurants set waste_percent = ${waste}, food_cost_percent = ${fcp}, updated_at = now() where email = ${email}`;
  if (p.currency !== undefined && p.currency !== null && p.currency !== "") await sql`update fc_restaurants set currency = ${str(p.currency)} where email = ${email}`;
  if (p.minMarginPercent !== undefined && p.minMarginPercent !== null && p.minMarginPercent !== "") await sql`update fc_restaurants set min_margin_percent = ${num(p.minMarginPercent, 30) || 30} where email = ${email}`;
  await recalc(email);
  return { success: true };
}
async function updateRestaurantName(email: string, name: any) {
  await sql`update fc_restaurants set name = ${str(name)}, updated_at = now() where email = ${email}`;
  return { success: true };
}
async function getMenuData(email: string) {
  try {
    const r = await getRestaurant(email);
    const m = r?.menu_engineering;
    return { success: true, menuData: m && typeof m === "object" ? m : {} };
  } catch (e) { return { success: false, error: errMsg(e), menuData: {} }; }
}
async function saveMenuData(email: string, p: P) {
  try {
    let m = parseJSON<any>(p.menuData, {});
    if (!m || typeof m !== "object") m = {};
    await sql`update fc_restaurants set menu_engineering = ${JSON.stringify(m)}::text::jsonb, updated_at = now() where email = ${email}`;
    return { success: true };
  } catch (e) { return { success: false, error: errMsg(e) }; }
}

// ---------------- المواد ----------------
const mapMaterial = (m: any) => ({ id: m.id, name: m.name || "", unit: m.unit || "", price: num(m.price), purchasePrice: num(m.purchase_price), purchaseQty: num(m.purchase_qty, 1) || 1, wastePercent: num(m.waste_percent), portionWeight: num(m.portion_weight) });
async function getAllMaterials(email: string) {
  const rows = await sql`select * from fc_materials where restaurant_email = ${email} order by pos`;
  return { success: true, materials: rows.map(mapMaterial) };
}
function computeEffectivePrice(pp: any, pq: any, w: any) {
  const usable = Number(pq) * (1 - Number(w) / 100);
  const v = usable > 0 ? Number(pp) / usable : 0;
  return Number.isFinite(v) ? v : 0;
}
async function addMaterial(email: string, d: P) {
  const id = uuid();
  const eff = computeEffectivePrice(d.purchasePrice, d.purchaseQty, d.wastePercent);
  await sql`insert into fc_materials (restaurant_email, id, name, unit, price, purchase_price, purchase_qty, waste_percent, portion_weight)
            values (${email}, ${id}, ${str(d.name)}, ${str(d.unit)}, ${eff}, ${num(d.purchasePrice, 0)}, ${num(d.purchaseQty, 1) || 1}, ${num(d.wastePercent, 0)}, ${num(d.portionWeight, 0)})`;
  await recalc(email);
  return { success: true, id };
}
async function deleteMaterial(email: string, id: any) {
  const cnt = (await sql`select count(*)::int as n from fc_materials where restaurant_email = ${email}`)[0].n;
  if (!cnt) return { success: false, error: "لا توجد مواد" };
  const r = await sql`delete from fc_materials where restaurant_email = ${email} and id = ${str(id)} returning id`;
  if (!r.length) return { success: false, error: "المادة غير موجودة" };
  await recalc(email);
  return { success: true };
}
async function updateMaterial(email: string, d: P) {
  const cnt = (await sql`select count(*)::int as n from fc_materials where restaurant_email = ${email}`)[0].n;
  if (!cnt) return { success: false, error: "لا توجد مواد" };
  const rows = await sql`select price from fc_materials where restaurant_email = ${email} and id = ${str(d.id)}`;
  if (!rows.length) return { success: false, error: "المادة غير موجودة" };
  const oldPrice = num(rows[0].price), eff = computeEffectivePrice(d.purchasePrice, d.purchaseQty, d.wastePercent);
  if (Math.abs(oldPrice - eff) > 0.001) await logPriceChange(email, str(d.id), str(d.name), oldPrice, eff);
  await sql`update fc_materials set name = ${str(d.name)}, unit = ${str(d.unit)}, price = ${eff}, purchase_price = ${num(d.purchasePrice, 0)},
            purchase_qty = ${num(d.purchaseQty, 1) || 1}, waste_percent = ${num(d.wastePercent, 0)}, portion_weight = ${num(d.portionWeight, 0)}
            where restaurant_email = ${email} and id = ${str(d.id)}`;
  await recalc(email);
  return { success: true };
}
async function logPriceChange(email: string, id: string, name: string, oldP: number, newP: number) {
  const ch = oldP > 0 ? ((newP - oldP) / oldP) * 100 : 0;
  await sql`insert into fc_price_history (restaurant_email, material_id, material_name, old_price, new_price, change_percent) values (${email}, ${id}, ${name}, ${oldP}, ${newP}, ${r2(ch)})`;
}
const mapPH = (r: any) => ({ date: r.date, materialId: r.material_id, materialName: r.material_name, oldPrice: num(r.old_price), newPrice: num(r.new_price), changePercent: num(r.change_percent) });
async function getPriceHistory(email: string, materialId: any) {
  const rows = materialId
    ? await sql`select * from fc_price_history where restaurant_email = ${email} and material_id = ${str(materialId)} order by date desc, id desc`
    : await sql`select * from fc_price_history where restaurant_email = ${email} order by date desc, id desc`;
  return { success: true, history: rows.map(mapPH) };
}
async function getMaterialPriceChanges(email: string) {
  const rows = await sql`select * from fc_price_history where restaurant_email = ${email} and date >= now() - interval '30 days' order by date desc, id desc`;
  return { success: true, changes: rows.map(mapPH) };
}

// ---------------- الأطباق ----------------
async function getAllRecipes(email: string) {
  const r = await getRestaurant(email);
  const rows = await sql`select * from fc_recipes where restaurant_email = ${email} order by pos`;
  return {
    success: true,
    recipes: rows.map((x: any) => ({ name: x.name, costPrice: num(x.cost_price), laborPercent: num(x.labor_percent), suggestedPrice: num(x.suggested_price), sellingPrice: num(x.selling_price) })),
    restaurantName: (r && r.name) || "المطعم",
  };
}
function checkRecipeName(name: string, msg: string) {
  if (!isValidSheetName(name)) fail(msg);
  if (RESERVED_NAMES.includes(name)) fail("هذا الاسم محجوز للنظام، اختر اسماً آخر");
}
async function addRecipe(email: string, recipeName: any) {
  if (!recipeName || str(recipeName).trim() === "") fail("اسم الطبق مطلوب");
  const name = str(recipeName).trim();
  checkRecipeName(name, "اسم الطبق يحتوي رموزاً غير مسموحة ([ ] * / \\ ? :)");
  const r = await sql`insert into fc_recipes (restaurant_email, name, selling_price) values (${email}, ${name}, 0) on conflict (restaurant_email, name) do nothing returning id`;
  if (!r.length) fail("الطبق موجود مسبقاً");
  return { success: true };
}
async function deleteRecipe(email: string, name: any) {
  await sql`delete from fc_recipes where restaurant_email = ${email} and name = ${str(name)}`;
  return { success: true };
}
async function updateRecipeSellingPrice(email: string, p: P) {
  try {
    const name = str(p.recipeName || p.name), price = num(p.sellingPrice || p.price || 0, 0);
    if (!name) return { success: false, error: "اسم الطبق مطلوب" };
    const cnt = (await sql`select count(*)::int as n from fc_recipes where restaurant_email = ${email}`)[0].n;
    if (!cnt) return { success: false, error: "لا توجد أطباق" };
    const r = await sql`update fc_recipes set selling_price = ${price} where restaurant_email = ${email} and name = ${name} returning id`;
    if (!r.length) return { success: false, error: "الطبق غير موجود: " + name };
    return { success: true, message: "تم حفظ سعر البيع", recipeName: name, sellingPrice: price };
  } catch (e) { return { success: false, error: errMsg(e) }; }
}
async function getRecipeIngredients(email: string, name: any) {
  const r = await sql`select id from fc_recipes where restaurant_email = ${email} and name = ${str(name)}`;
  if (!r.length) fail("الطبق غير موجود");
  const rows = await sql`select * from fc_recipe_ingredients where recipe_id = ${r[0].id} order by pos, id`;
  return { success: true, ingredients: rows.filter((i: any) => i.material_id && i.quantity).map((i: any) => ({ materialId: String(i.material_id), materialName: i.material_name || "", quantity: num(i.quantity) })) };
}
function cleanIngredients(list: any) {
  list = parseJSON<any[]>(list, []);
  if (!Array.isArray(list)) return [];
  return list.map((g: any, i: number) => ({ material_id: str(g?.materialId), material_name: str(g?.materialName), quantity: num(g?.quantity, 0), pos: i }))
    .filter((g) => g.material_id && g.quantity);
}
async function saveRecipeIngredients(email: string, name: any, ingredients: any) {
  const r = await sql`select id from fc_recipes where restaurant_email = ${email} and name = ${str(name)}`;
  if (!r.length) fail("الطبق غير موجود");
  const list = cleanIngredients(ingredients);
  await sql.begin(async (tx: any) => {
    await tx`delete from fc_recipe_ingredients where recipe_id = ${r[0].id}`;
    if (list.length) {
      await tx`insert into fc_recipe_ingredients (recipe_id, material_id, material_name, quantity, pos)
               select ${r[0].id}, x.material_id, x.material_name, x.quantity, x.pos
               from jsonb_to_recordset(${JSON.stringify(list)}::text::jsonb) as x(material_id text, material_name text, quantity float8, pos int)`;
    }
    await recalc(email, tx);
  });
  return { success: true };
}
async function renameRecipe(email: string, p: P) {
  const oldName = str(p.oldName), newName = str(p.newName);
  if (!oldName || !newName) fail("يجب توفير الاسم القديم والجديد");
  checkRecipeName(newName, "الاسم الجديد يحتوي رموزاً غير مسموحة ([ ] * / \\ ? :)");
  const ex = await sql`select id from fc_recipes where restaurant_email = ${email} and name = ${oldName}`;
  if (!ex.length) fail("الطبق غير موجود");
  const dup = await sql`select id from fc_recipes where restaurant_email = ${email} and name = ${newName}`;
  if (dup.length) fail("يوجد طبق بنفس الاسم الجديد");
  await sql`update fc_recipes set name = ${newName} where id = ${ex[0].id}`;
  return { success: true };
}

// ---------------- المبيعات ----------------
async function addSale(email: string, p: P) {
  try {
    const name = str(p.recipeName || p.name);
    const qty = num(p.quantity || p.qty || 0, 0);
    let unit = num(p.unitPrice || p.price || 0, 0);
    const date = safeDate(p.date, new Date())!;
    if (!name) return { success: false, error: "اسم الطبق مطلوب" };
    if (qty <= 0) return { success: false, error: "الكمية يجب أن تكون أكبر من صفر" };
    if (unit <= 0) {
      const r = await sql`select selling_price, suggested_price from fc_recipes where restaurant_email = ${email} and name = ${name}`;
      if (r.length) unit = num(r[0].selling_price) > 0 ? num(r[0].selling_price) : num(r[0].suggested_price);
    }
    const total = qty * unit, id = uuid();
    await sql`insert into fc_sales (restaurant_email, id, date, recipe_name, quantity, unit_price, total) values (${email}, ${id}, ${date.toISOString()}::timestamptz, ${name}, ${qty}, ${unit}, ${total})`;
    return { success: true, id, recipeName: name, quantity: qty, unitPrice: unit, total };
  } catch (e) { return { success: false, error: errMsg(e) }; }
}
async function getSales(email: string, p: P = {}) {
  try {
    const from = p.fromDate ? safeDate(p.fromDate, null) : null;
    const to = p.toDate ? safeDate(p.toDate, null) : null;
    const toEnd = to ? new Date(to.getTime() + 86399999) : null;
    const recipe = p.recipeName || null;
    const rows = await sql`select * from fc_sales where restaurant_email = ${email}
      ${from ? sql`and date >= ${from.toISOString()}::timestamptz` : sql``}
      ${toEnd ? sql`and date <= ${toEnd.toISOString()}::timestamptz` : sql``}
      ${recipe ? sql`and recipe_name = ${str(recipe)}` : sql``}
      order by date desc, pos desc`;
    return { success: true, sales: rows.map((r: any) => ({ id: r.id, date: r.date, recipeName: r.recipe_name, quantity: num(r.quantity), unitPrice: num(r.unit_price), total: num(r.total) })) };
  } catch (e) { return { success: false, error: errMsg(e) }; }
}
async function getSalesSummary(email: string, p: P = {}) {
  try {
    const s: any = await getSales(email, p);
    if (!s.success) return s;
    const by: Record<string, any> = {};
    let rev = 0, qty = 0;
    s.sales.forEach((x: any) => {
      if (!by[x.recipeName]) by[x.recipeName] = { recipeName: x.recipeName, quantity: 0, revenue: 0 };
      by[x.recipeName].quantity += x.quantity; by[x.recipeName].revenue += x.total;
      rev += x.total; qty += x.quantity;
    });
    const recipes = (await getAllRecipes(email)).recipes;
    const summary = Object.keys(by).map((n) => {
      const it = by[n], rc = recipes.find((r: any) => r.name === n);
      const cost = rc ? (rc.costPrice || 0) * it.quantity : 0;
      return { recipeName: n, quantity: it.quantity, revenue: r2(it.revenue), cost: r2(cost), profit: r2(it.revenue - cost) };
    }).sort((a, b) => b.revenue - a.revenue);
    return { success: true, totalRevenue: r2(rev), totalQuantity: qty, totalCost: summary.reduce((a, r) => a + r.cost, 0), totalProfit: summary.reduce((a, r) => a + r.profit, 0), byRecipe: summary, salesCount: s.sales.length };
  } catch (e) { return { success: false, error: errMsg(e) }; }
}
async function deleteSale(email: string, p: P) {
  try {
    const id = p.id || p.saleId;
    if (!id) return { success: false, error: "معرف العملية مطلوب" };
    const cnt = (await sql`select count(*)::int as n from fc_sales where restaurant_email = ${email}`)[0].n;
    if (!cnt) return { success: false, error: "لا توجد مبيعات" };
    const r = await sql`delete from fc_sales where restaurant_email = ${email} and id = ${str(id)} returning id`;
    return r.length ? { success: true } : { success: false, error: "العملية غير موجودة" };
  } catch (e) { return { success: false, error: errMsg(e) }; }
}

// ---------------- التقييمات ----------------
async function submitReview(p: P) {
  try {
    const email = await emailFromPublic(p);
    if (!email) return { status: "error", message: "البريد الإلكتروني للمطعم مطلوب" };
    await sql`insert into fc_reviews (restaurant_email, name, phone, visit_date, people_count, visit_type, food, service, cleanliness, price, overall, status, favorite_dishes, recommendation, notes, restaurant_name)
      values (${email}, ${str(p["الاسم"]) || "غير مسجل"}, ${str(p["رقم_الهاتف"]) || "-"}, ${str(p["تاريخ_الزيارة"])}, ${str(p["عدد_الأشخاص"])}, ${str(p["نوع_الزيارة"])},
              ${str(p["تقييم_الطعام"])}, ${str(p["تقييم_الخدمة"])}, ${str(p["تقييم_النظافة"])}, ${str(p["تقييم_الاسعار"])}, ${str(p["التقييم_العام"])},
              ${str(p["تصنيف_العميل"])}, ${str(p["الأطباق_المفضلة"])}, ${str(p["توصية"])}, ${str(p["الملاحظات_والاقتراحات"])}, ${str(p.restaurantName)})`;
    return { status: "success", message: "تم حفظ التقييم" };
  } catch (e) { return { status: "error", message: errMsg(e) }; }
}
const NUMERIC_REVIEW = new Set(["food", "service", "cleanliness", "price", "overall", "peopleCount"]);
function reviewOut(r: any) {
  const o: P = {};
  REVIEW_COLS.forEach((c, i) => {
    const k = REVIEW_KEYS[i];
    let v = r[c];
    if (v === null || v === undefined) v = "";
    if (NUMERIC_REVIEW.has(k) && typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v.trim())) v = Number(v);
    o[k] = v;
  });
  return o;
}
async function getReviews(email: string) {
  try {
    const rows = await sql`select * from fc_reviews where restaurant_email = ${lower(email)} order by id`;
    return { success: true, reviews: rows.map(reviewOut) };
  } catch (e) { return { success: false, error: errMsg(e) }; }
}

// ---------------- لوحة التحكم ----------------
async function getDashboardData(email: string) {
  try {
    const materials = (await getAllMaterials(email)).materials;
    const rd = await getAllRecipes(email);
    const st = await getSettings(email);
    const rv: any = await getReviews(email);
    const reviews = rv.success ? rv.reviews : [];
    const changes = (await getMaterialPriceChanges(email)).changes || [];
    let tc = 0, tp = 0;
    rd.recipes.forEach((r: any) => {
      const c = r.costPrice || 0, pr = r.sellingPrice > 0 ? r.sellingPrice : (r.suggestedPrice || 0);
      if (c > 0 && pr > 0) { tc += c; tp += pr; }
    });
    const afc = tp > 0 ? (tc / tp) * 100 : 0;
    let avg = 0;
    if (reviews.length) {
      let sum = 0;
      reviews.forEach((r: any) => { sum += ((num(r.food) || 0) + (num(r.service) || 0) + (num(r.cleanliness) || 0) + (num(r.price) || 0)) / 4; });
      avg = sum / reviews.length;
    }
    const loss = rd.recipes.filter((r: any) => { const c = r.costPrice || 0, pr = r.sellingPrice > 0 ? r.sellingPrice : 0; return c > 0 && pr > 0 && c > pr; });
    const rising = changes.filter((c: any) => c.changePercent >= 10);
    const alerts: any[] = [];
    if (afc > st.foodCostPercent + 3) alerts.push({ type: "danger", icon: "exclamation-triangle", title: "Food Cost مرتفع", message: "التكلفة الفعلية " + afc.toFixed(1) + "% أعلى من المستهدف " + st.foodCostPercent + "%" });
    if (loss.length) alerts.push({ type: "warning", icon: "times-circle", title: "أطباق خاسرة", message: "يوجد " + loss.length + " طبق تكلفة أعلى من سعر البيع الحقيقي" });
    if (rising.length) alerts.push({ type: "info", icon: "chart-line", title: "ارتفاع أسعار مواد", message: rising.length + " مادة ارتفع سعرها أكثر من 10% خلال 30 يوم" });
    if (avg > 0 && avg < 3.5) alerts.push({ type: "warning", icon: "star", title: "تقييمات منخفضة", message: "متوسط التقييمات " + avg.toFixed(1) + " من 5" });
    const week = new Date(Date.now() - 7 * 864e5);
    const ss: any = await getSalesSummary(email, { fromDate: week.toISOString() });
    return {
      success: true,
      summary: {
        recipesCount: rd.recipes.length, materialsCount: materials.length, reviewsCount: reviews.length,
        actualFoodCost: Math.round(afc * 10) / 10, targetFoodCost: st.foodCostPercent, avgRating: Math.round(avg * 10) / 10,
        wastePercent: st.wastePercent, currency: st.currency, minMarginPercent: st.minMarginPercent,
        weekRevenue: ss.success ? ss.totalRevenue : 0, weekQuantity: ss.success ? ss.totalQuantity : 0,
      },
      lossDishes: loss.map((r: any) => ({ name: r.name, cost: r.costPrice || 0, price: r.sellingPrice || 0 })),
      recentPriceChanges: changes.slice(0, 8),
      alerts,
    };
  } catch (e) { return { success: false, error: errMsg(e) }; }
}

async function getAllData(email: string) {
  const materials = (await getAllMaterials(email)).materials;
  const rd = await getAllRecipes(email);
  const st = await getSettings(email);
  const mr = await getMenuData(email);
  return { success: true, materials, recipes: rd.recipes, restaurantName: rd.restaurantName, wastePercent: st.wastePercent, foodCostPercent: st.foodCostPercent, currency: st.currency, minMarginPercent: st.minMarginPercent, menuData: mr.success ? mr.menuData || {} : {}, share: await shareInfo(email) };
}

// ---------------- المينيو الإلكتروني ----------------
function menuPayload(r: any) {
  let p = r?.digital_menu;
  if (typeof p === "string") p = parseJSON(p, {});
  if (!p || typeof p !== "object") p = {};
  if (!Array.isArray(p.items)) p.items = [];
  if (!Array.isArray(p.categories)) p.categories = ["الكل"];
  if (!p.settings || typeof p.settings !== "object") p.settings = {};
  return p;
}
const publicPrefix = () => SUPABASE_URL + "/storage/v1/object/public/" + BUCKET + "/";
function storagePathOf(url: string) {
  const u = String(url || "");
  const pre = publicPrefix();
  if (SUPABASE_URL && u.indexOf(pre) === 0) return decodeURIComponent(u.slice(pre.length).split("?")[0]);
  return "";
}
function driveIdOf(url: string) {
  const u = String(url || "");
  if (!/^https:\/\/(drive\.google\.com|lh3\.googleusercontent\.com)\//.test(u)) return "";
  return (u.match(/[?&]id=([\w-]+)/) || [])[1] || (u.match(/\/d\/([\w-]+)/) || [])[1] || "";
}
function fcR5Assets(urls: any) {
  if (!Array.isArray(urls) || urls.length > 3) fail("الحد ثلاث صور للشريط");
  const seen: Record<string, boolean> = {};
  return (urls as any[]).map((v) => {
    const url = str(v && v.url || v).trim();
    if (!/^https:\/\/[^\s<>"']+$/.test(url)) fail("رابط صورة غير صالح");
    const did = driveIdOf(url), sp = storagePathOf(url), key = did || url;
    if (seen[key]) fail("صورة مكررة في الشريط");
    seen[key] = true;
    return { fileId: did || sp, url: did ? "https://drive.google.com/thumbnail?id=" + did + "&sz=w1600" : url };
  });
}
function bannerState(r: any) {
  if (!r || r.banner_assets === null || r.banner_assets === undefined) {
    let assets: any[] = [];
    try { assets = fcR5Assets(menuPayload(r).settings.banners || []); } catch { assets = []; }
    return { revision: 0, assets, source: "legacy" };
  }
  const list = Array.isArray(r.banner_assets) ? r.banner_assets : [];
  return { revision: Number(r.banner_revision) || 0, assets: fcR5Assets(list.map((a: any) => a.url || a)), source: "r5" };
}
function r5ReadRow(r: any, email: string) {
  const s = bannerState(r);
  return { success: true, protocol: 5, revision: s.revision, assets: s.assets, banners: s.assets.map((a: any) => a.url), source: s.source, spreadsheetId: "supabase:" + email };
}
async function r5Read(email: string) { return r5ReadRow(await getRestaurant(email), email); }

async function getDigitalMenu(email: string) {
  try {
    const r = await getRestaurant(email);
    const p = menuPayload(r), st = settingsOf(r), name = r?.name || "", b = r5ReadRow(r, email);
    return {
      success: true, items: p.items || [], categories: p.categories || ["الكل"],
      menuSettings: { displayName: p.settings.displayName || name, subtitle: p.settings.subtitle || "قائمة الطعام", whatsapp: p.settings.whatsapp || "", currency: p.settings.currency || st.currency || "ر.س", banners: b.banners },
      menuSchema: 3, restaurantName: name, bannerProtocol: 5, bannerRevision: b.revision, share: await shareInfo(email),
      ordering: await (async () => { const u = await getUserRow(email); const pl = planOf(u?.plan); const bz = mergeBiz(r?.biz_settings || {}); return { available: pl.features.includes("online_orders"), enabled: !!bz.ordering.enabled }; })(),
    };
  } catch (e) { return { success: false, error: errMsg(e) }; }
}
async function saveDigitalMenu(email: string, p: P) {
  try {
    await sql.begin(async (tx: any) => {
      const r = await getRestaurantLocked(tx, email);
      const payload = menuPayload(r);
      if (p.items !== undefined) { let it = parseJSON<any>(p.items, []); if (!Array.isArray(it)) it = []; payload.items = it; }
      if (p.categories !== undefined) {
        let c: any = p.categories;
        if (typeof c === "string") { try { c = JSON.parse(c); } catch { c = String(c).split(",").map((s) => s.trim()).filter(Boolean); } }
        if (!Array.isArray(c)) c = ["الكل"];
        if (c.indexOf("الكل") === -1) c.unshift("الكل");
        payload.categories = c;
      }
      if (p.menuSettings !== undefined) payload.settings = Object.assign(payload.settings || {}, parseJSON<any>(p.menuSettings, {}) || {});
      await tx`update fc_restaurants set digital_menu = ${JSON.stringify(payload)}::text::jsonb, updated_at = now() where email = ${email}`;
    });
    return { success: true };
  } catch (e) { return { success: false, error: errMsg(e) }; }
}
async function getRestaurantLocked(tx: any, email: string) {
  const r = await tx`select * from fc_restaurants where email = ${email} for update`;
  if (!r.length) fail("المطعم غير موجود");
  return r[0];
}

async function storageUpload(path: string, bytes: Uint8Array, contentType: string) {
  const res = await fetch(SUPABASE_URL + "/storage/v1/object/" + BUCKET + "/" + path.split("/").map(encodeURIComponent).join("/"), {
    method: "POST",
    headers: { Authorization: "Bearer " + SERVICE_KEY, apikey: SERVICE_KEY, "Content-Type": contentType, "x-upsert": "true", "cache-control": "max-age=31536000" },
    body: bytes as BodyInit,
  });
  if (!res.ok) fail("فشل رفع الصورة إلى التخزين: HTTP " + res.status + " " + (await res.text()).slice(0, 200));
  return publicPrefix() + path.split("/").map(encodeURIComponent).join("/");
}
const folderOf = (email: string) => "restaurants/" + lower(email).replace(/[^a-z0-9._-]/g, "_");
async function uploadImageBytes(email: string, base64: string) {
  let contentType = "image/jpeg", pure = base64;
  if (base64.indexOf("data:") === 0) {
    const m = base64.match(/^data:([^;]+);base64,(.+)$/s);
    if (m) { contentType = m[1] || contentType; pure = m[2]; } else pure = base64.split(",").pop() || "";
  }
  if (!/^image\/(jpeg|png|webp|gif)$/.test(contentType)) fail("صيغة صورة غير مدعومة");
  const bytes = decodeBase64(pure.replace(/\s/g, ""));
  if (bytes.length > MAX_IMAGE_BYTES) fail("الصورة أكبر من 12 ميغابايت");
  const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : contentType === "image/gif" ? "gif" : "jpg";
  const path = folderOf(email) + "/" + Date.now() + "_" + uuid().slice(0, 8) + "." + ext;
  const url = await storageUpload(path, bytes, contentType);
  return { url, fileId: path };
}
async function uploadMenuImage(email: string, p: P) {
  try {
    const b64 = str(p.base64 || p.image);
    if (!b64) return { success: false, error: "لا توجد صورة" };
    const up = await uploadImageBytes(email, b64);
    return { success: true, url: up.url, fileId: up.fileId };
  } catch (e) { return { success: false, error: errMsg(e) }; }
}

async function getPublicMenu(email: string) {
  try {
    const r = await getRestaurant(email);
    const p = menuPayload(r), st = settingsOf(r), name = r?.name || "";
    const items = (p.items || []).filter((it: any) => it && it.visible !== false).sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));
    return {
      success: true, items, categories: p.categories || ["الكل"],
      settings: { name: p.settings.displayName || name || "المطعم", subtitle: p.settings.subtitle || "قائمة الطعام", whatsapp: p.settings.whatsapp || "", currency: p.settings.currency || st.currency || "ر.س", banners: r5ReadRow(r, email).banners },
      restaurantEmail: r?.public_id ? undefined : email, publicId: r?.public_id || "", bannerProtocol: 5,
      ordering: await (async () => {
        const u = await getUserRow(email); const pl = planOf(u?.plan); const bz = mergeBiz(r?.biz_settings || {});
        const ok = pl.features.includes("online_orders") && !!bz.ordering.enabled && !!u && !u.frozen && new Date(u.expiry_date) > new Date();
        return { enabled: ok, tableOrdering: ok && !!bz.ordering.tableOrdering, requirePhone: !!bz.ordering.requirePhone };
      })(),
      googleReviewUrl: (() => { const bz = mergeBiz(r?.biz_settings || {}); return bz.google.reviewUrl || ""; })(),
    };
  } catch (e) { return { success: false, error: errMsg(e) }; }
}
async function savePublicOrder(email: string, p: P) {
  try {
    if (!(await getRestaurant(email))) return { success: false, error: "المطعم غير موجود" };
    let items = parseJSON<any>(p.items, []);
    if (!Array.isArray(items) || !items.length) return { success: false, error: "الطلب فارغ" };
    if (items.length > 100) return { success: false, error: "الطلب كبير جداً" };
    const recent = (await sql`select count(*)::int as n from fc_menu_orders where restaurant_email = ${email} and date > now() - interval '2 minutes' and customer_phone = ${str(p.customerPhone)} and table_number = ${str(p.tableNumber || p.table)}`)[0].n;
    if (recent >= 3) return { success: false, error: "تم استلام طلباتك — يرجى الانتظار قليلاً" };
    let total = num(p.total, 0);
    if (!total) total = items.reduce((s: number, it: any) => s + (num(it.price) || 0) * (parseInt(it.qty) || 1), 0);
    const id = uuid(), now = new Date().toISOString();
    await sql`insert into fc_menu_orders (restaurant_email, id, date, table_number, items, total, notes, customer_name, customer_phone, status, created_at)
      values (${email}, ${id}, ${now}::timestamptz, ${str(p.tableNumber || p.table)}, ${JSON.stringify(items)}::text::jsonb, ${total}, ${str(p.notes)}, ${str(p.customerName)}, ${str(p.customerPhone)}, 'new', ${now})`;
    return { success: true, id, status: "success", message: "تم حفظ الطلب" };
  } catch (e) { return { success: false, error: errMsg(e) }; }
}
async function getMenuOrders(email: string, p: P) {
  try {
    const st = p.status || null;
    const rows = await sql`select * from fc_menu_orders where restaurant_email = ${email} ${st ? sql`and status = ${str(st)}` : sql``} order by date desc, pos desc`;
    return { success: true, orders: rows.map((r: any) => ({ id: r.id, date: r.date, tableNumber: r.table_number || "", items: Array.isArray(r.items) ? r.items : parseJSON(r.items, []), total: num(r.total), notes: r.notes || "", customerName: r.customer_name || "", customerPhone: r.customer_phone || "", status: r.status || "new", createdAt: r.created_at || "" })) };
  } catch (e) { return { success: false, error: errMsg(e) }; }
}
async function updateMenuOrderStatus(email: string, p: P) {
  try {
    const id = p.id || p.orderId, s = p.status || "done";
    if (!id) return { success: false, error: "معرف الطلب مطلوب" };
    const r = await sql`update fc_menu_orders set status = ${str(s)} where restaurant_email = ${email} and id = ${str(id)} returning id`;
    return r.length ? { success: true } : { success: false, error: "الطلب غير موجود" };
  } catch (e) { return { success: false, error: errMsg(e) }; }
}
async function deleteMenuOrder(email: string, p: P) {
  try {
    const id = p.id || p.orderId;
    if (!id) return { success: false, error: "معرف الطلب مطلوب" };
    const r = await sql`delete from fc_menu_orders where restaurant_email = ${email} and id = ${str(id)} returning id`;
    return r.length ? { success: true } : { success: false, error: "الطلب غير موجود" };
  } catch (e) { return { success: false, error: errMsg(e) }; }
}
async function saveMenuBanners(email: string, p: P) {
  try {
    const banners = parseJSON<any>(p.banners, null);
    if (!Array.isArray(banners) || banners.length > 3) fail("الحد ثلاث صور");
    banners.forEach((u: any) => { if (typeof u !== "string" || u.indexOf("https://") !== 0) fail("رابط صورة غير صالح"); });
    const assets = fcR5Assets(banners);
    await sql.begin(async (tx: any) => {
      const r = await getRestaurantLocked(tx, email);
      const payload = menuPayload(r); payload.settings.banners = banners;
      await tx`update fc_restaurants set digital_menu = ${JSON.stringify(payload)}::text::jsonb, banner_assets = ${JSON.stringify(assets)}::text::jsonb, banner_revision = ${(Number(r.banner_revision) || 0) + 1}, updated_at = now() where email = ${email}`;
    });
    return { success: true, banners: assets.map((a: any) => a.url) };
  } catch (e) { return { success: false, error: errMsg(e) }; }
}
async function r5BannerWrite(email: string, p: P) {
  const out = await sql.begin(async (tx: any) => {
    const r = await getRestaurantLocked(tx, email);
    const old = bannerState(r), expected = Number(p.expectedRevision);
    if (!Number.isInteger(expected) || expected !== old.revision) return { success: false, code: "BANNER_CONFLICT", error: "تغير الشريط من جلسة أخرى. أعد قراءة الشريط قبل الحفظ.", revision: old.revision };
    const assets = fcR5Assets(parseJSON<any>(p.banners, []));
    await tx`update fc_restaurants set banner_assets = ${JSON.stringify(assets)}::text::jsonb, banner_revision = ${old.revision + 1}, updated_at = now() where email = ${email}`;
    return null;
  });
  if (out) return out;
  return await r5Read(email);
}

// ============================================================
// النسخ الاحتياطي الشامل (R4 / R5) — بنفس صيغة الملف القديم (أوراق افتراضية)
// يمكن استعادة نسخ Google Sheets القديمة مباشرة في Supabase
// ============================================================
const encDate = (d: any) => { const x = d instanceof Date ? d : new Date(d); return isNaN(x.getTime()) ? "" : { __fcDate: x.toISOString() }; };
function decVal(v: any): any {
  if (v && typeof v === "object") {
    const s = typeof v.__fcDate === "string" ? v.__fcDate : typeof v.__r4Date === "string" ? v.__r4Date : null;
    if (s !== null) { const d = new Date(s); if (isNaN(d.getTime())) fail("تاريخ غير صالح"); return d; }
    fail("قيمة خلية غير مدعومة");
  }
  return v === null || v === undefined ? "" : v;
}
const sheetOf = (name: string, values: any[][]) => ({ name, values, frozenRows: 0, frozenColumns: 0, hidden: false });

async function buildSheets(email: string) {
  const r = await getRestaurant(email);
  const st = settingsOf(r);
  const mats = await sql`select * from fc_materials where restaurant_email = ${email} order by pos`;
  const recs = await sql`select * from fc_recipes where restaurant_email = ${email} order by pos`;
  const ings = await sql`select i.* from fc_recipe_ingredients i join fc_recipes r on r.id = i.recipe_id where r.restaurant_email = ${email} order by i.pos, i.id`;
  const ph = await sql`select * from fc_price_history where restaurant_email = ${email} order by id`;
  const sales = await sql`select * from fc_sales where restaurant_email = ${email} order by pos`;
  const orders = await sql`select * from fc_menu_orders where restaurant_email = ${email} order by pos`;
  const reviews = await sql`select * from fc_reviews where restaurant_email = ${email} order by id`;
  const main: any[][] = [["", "", r?.name || "المطعم", "", "", "", ""], ["رقم", "اسم الطبق", "التكلفة الفعلية", "نسبة العمالة %", "سعر البيع المقترح", "الوصفة", "سعر البيع"]];
  recs.forEach((x: any, i: number) => main.push([i + 1, x.name, num(x.cost_price), num(x.labor_percent), num(x.suggested_price), "", num(x.selling_price)]));
  const sheets: any[] = [
    sheetOf(SHEET_MATERIALS, [["ID", "Name", "Unit", "Price", "PurchasePrice", "PurchaseQty", "WastePercent", "PortionWeight"], ...mats.map((m: any) => [m.id, m.name, m.unit, num(m.price), num(m.purchase_price), num(m.purchase_qty, 1), num(m.waste_percent), num(m.portion_weight)])]),
    sheetOf(SHEET_MAIN, main),
    sheetOf(SHEET_SETTINGS, [["WastePercent", st.wastePercent], ["FoodCostPercent", st.foodCostPercent], ["Currency", st.currency], ["MinMarginPercent", st.minMarginPercent],
      ["MenuEngineeringData", JSON.stringify(r?.menu_engineering || {})], ["DigitalMenuData", JSON.stringify(menuPayload(r))]]),
    sheetOf(SHEET_PRICE_HISTORY, [["Date", "MaterialId", "MaterialName", "OldPrice", "NewPrice", "ChangePercent"], ...ph.map((x: any) => [encDate(x.date), x.material_id || "", x.material_name || "", num(x.old_price), num(x.new_price), num(x.change_percent)])]),
    sheetOf(SHEET_SALES, [["ID", "Date", "RecipeName", "Quantity", "UnitPrice", "Total"], ...sales.map((x: any) => [x.id, encDate(x.date), x.recipe_name, num(x.quantity), num(x.unit_price), num(x.total)])]),
    sheetOf(SHEET_MENU_ORDERS, [["ID", "Date", "TableNumber", "ItemsJSON", "Total", "Notes", "CustomerName", "CustomerPhone", "Status", "CreatedAt"], ...orders.map((x: any) => [x.id, encDate(x.date), x.table_number, JSON.stringify(x.items || []), num(x.total), x.notes, x.customer_name, x.customer_phone, x.status, x.created_at])]),
  ];
  const byRecipe: Record<string, any[]> = {};
  ings.forEach((g: any) => { (byRecipe[g.recipe_id] = byRecipe[g.recipe_id] || []).push([g.material_id, g.material_name, num(g.quantity)]); });
  recs.forEach((x: any) => sheets.push(sheetOf(x.name, [["المادة ID", "اسم المادة", "الكمية"], ...(byRecipe[x.id] || [])])));
  const bs = bannerState(r);
  const bRows: any[][] = [["foodcost-banner-r5", Math.max(1, bs.revision), new Date().toISOString(), ""]];
  for (let i = 0; i < 3; i++) bRows.push([i + 1, bs.assets[i] ? bs.assets[i].url : "", bs.assets[i] ? bs.assets[i].fileId : "", ""]);
  if (bs.source === "r5") sheets.push(sheetOf(FC_R5_BANNER_SHEET, bRows));
  const reviewSheet = reviews.length ? sheetOf("Reviews_" + email.replace(/[^a-zA-Z0-9]/g, "_"), [REVIEW_HEADERS, ...reviews.map((x: any) => REVIEW_COLS.map((c) => (c === "date" ? encDate(x.date) : x[c] ?? "")))]) : null;
  return { r, sheets, reviewSheet };
}

function imageRefs(r: any, sheets: any[]) {
  const drive: Record<string, string[]> = {}, external: Record<string, boolean> = {};
  const add = (u: string, explicit: boolean) => {
    u = String(u || "").trim();
    if (!/^https:\/\//.test(u) || /[\s<>"']/.test(u)) return;
    const id = driveIdOf(u) || storagePathOf(u);
    if (id) { (drive[id] = drive[id] || []); if (drive[id].indexOf(u) < 0) drive[id].push(u); }
    else if (explicit || /\.(png|jpe?g|webp|gif)(\?|$)/i.test(u)) external[u] = true;
  };
  const inspect = (v: any, depth: number) => {
    if (depth > 30) return;
    if (Array.isArray(v)) return v.forEach((x) => inspect(x, depth + 1));
    if (v && typeof v === "object") return Object.keys(v).forEach((k) => inspect(v[k], depth + 1));
    if (typeof v !== "string") return;
    const s = v.trim();
    if (/^https:\/\//.test(s)) add(s, false);
    else if (s[0] === "{" || s[0] === "[") { try { inspect(JSON.parse(s), depth + 1); } catch { /* ignore */ } }
  };
  sheets.forEach((s) => inspect(s.values, 0));
  const p = menuPayload(r);
  (p.items || []).forEach((it: any) => { if (it && it.imageUrl) add(it.imageUrl, true); });
  bannerState(r).assets.forEach((a: any) => add(a.url, true));
  return { drive: Object.keys(drive).map((id) => ({ id, urls: drive[id] })), external: Object.keys(external) };
}

async function exportBackup(email: string, format: "full-r5" | "full-r4") {
  const { r, sheets, reviewSheet } = await buildSheets(email);
  const refs = imageRefs(r, sheets);
  const base: P = { app: "FoodCost", format, version: format === "full-r5" ? 5 : 4, restaurantEmail: email, timestamp: new Date().toISOString(), sheets, reviews: reviewSheet, imageRefs: refs, assets: [], complete: true, warnings: [] };
  if (format === "full-r5") {
    base.sourceSpreadsheetId = "supabase:" + email;
    base.bannerState = r5ReadRow(r, email);
    base.coverage = { restaurantSheets: sheets.length, reviews: true, menu: true, banners: true, driveImageFiles: "pending", siteSourceCode: false, accountSecrets: false };
  }
  return { success: true, backup: base };
}

async function backupImage(email: string, p: P) {
  try {
    const id = str(p.fileId);
    const { r, sheets } = await buildSheets(email);
    if (!imageRefs(r, sheets).drive.some((x) => x.id === id)) fail("الملف غير مرتبط ببيانات المطعم الحالية");
    let urls: string[], name: string;
    if (id.indexOf("restaurants/") === 0) {
      if (id.indexOf(folderOf(email) + "/") !== 0) fail("الصورة خارج مجلد صور المطعم؛ حُفظ رابطها فقط لحماية ملفات الحساب الأخرى");
      urls = [SUPABASE_URL + "/storage/v1/object/" + BUCKET + "/" + id.split("/").map(encodeURIComponent).join("/")];
      name = id.split("/").pop() || "image.jpg";
    } else {
      urls = ["https://drive.google.com/uc?export=download&id=" + encodeURIComponent(id), "https://lh3.googleusercontent.com/d/" + encodeURIComponent(id) + "=w2000"];
      name = "drive_" + id + ".jpg";
    }
    let last = "";
    for (const u of urls) {
      try {
        const res = await fetch(u, { headers: u.indexOf(SUPABASE_URL) === 0 ? { Authorization: "Bearer " + SERVICE_KEY, apikey: SERVICE_KEY } : {}, redirect: "follow" });
        if (!res.ok) { last = "HTTP " + res.status; continue; }
        const mime = (res.headers.get("content-type") || "").split(";")[0].trim();
        if (!/^image\/(jpeg|png|webp|gif)$/.test(mime)) { last = "صيغة صورة غير مدعومة"; continue; }
        const bytes = new Uint8Array(await res.arrayBuffer());
        if (bytes.length > MAX_IMAGE_BYTES) fail("الصورة أكبر من 12 ميغابايت");
        return { success: true, asset: { id, name, mime, size: bytes.length, sha256: await sha256Hex(bytes), base64: encodeBase64(bytes) } };
      } catch (e) { if (e instanceof UserError) throw e; last = errMsg(e); }
    }
    fail("تعذر تنزيل الصورة: " + last);
  } catch (e) { return { success: false, error: errMsg(e) }; }
  return { success: false, error: "تعذر تنزيل الصورة" };
}

function checkSheet(s: any) {
  if (!s || typeof s.name !== "string" || !s.name || s.name.length > 100 || /[\\\/\?\*\[\]:]/.test(s.name) || !Array.isArray(s.values) || !s.values.length || !Array.isArray(s.values[0]) || !s.values[0].length) fail("بنية ورقة غير صالحة");
  const cols = s.values[0].length;
  if (s.values.length * cols > 500000) fail("الورقة أكبر من حد الاستعادة");
  s.values.forEach((row: any) => { if (!Array.isArray(row) || row.length !== cols) fail("صفوف غير متناسقة"); row.forEach(decVal); });
  return s.values.length * cols;
}
function validateBackup(data: any, email: string, format: string) {
  if (!data || data.app !== "FoodCost" || data.format !== format || lower(data.restaurantEmail) !== email || !Array.isArray(data.sheets) || !data.sheets.length || data.sheets.length > 5000) fail("نسخة غير صالحة أو تخص مطعماً آخر");
  const names: Record<string, boolean> = {};
  let cells = 0;
  data.sheets.forEach((s: any) => { cells += checkSheet(s); if (names[s.name]) fail("اسم ورقة مكرر"); names[s.name] = true; });
  if (cells > 1000000 || !names[SHEET_MAIN] || !names[SHEET_MATERIALS] || !names[SHEET_SETTINGS]) fail("نسخة ناقصة أو كبيرة جداً");
  if (data.reviews) checkSheet(data.reviews);
}

// تحويل الأوراق (القديمة من Google Sheets أو المصدّرة من Supabase) إلى بيانات منظمة
function parseBackup(data: any) {
  const sheets: Record<string, any> = {};
  data.sheets.forEach((s: any) => { sheets[s.name] = s; });
  const findSheet = (n: string) => sheets[n] || data.sheets.find((s: any) => s.name.toLowerCase() === n.toLowerCase()) || null;
  const V = (s: any) => (s ? s.values.map((row: any[]) => row.map(decVal)) : []);
  const iso = (d: any) => { const x = d instanceof Date ? d : safeDate(d, null); return x ? x.toISOString() : null; };

  // الإعدادات
  const setRows = V(sheets[SHEET_SETTINGS]);
  const byKey = (k: string) => { const row = setRows.find((r: any[]) => String(r[0]).trim() === k); return row ? row[1] : undefined; };
  const pos = (i: number) => (setRows[i] ? setRows[i][1] : undefined);
  const settings = {
    waste: num(pos(0) ?? byKey("WastePercent"), 0),
    fc: num(pos(1) ?? byKey("FoodCostPercent"), 30) || 30,
    currency: str(pos(2) ?? byKey("Currency")) || "ر.س",
    minMargin: num(pos(3) ?? byKey("MinMarginPercent"), 30) || 30,
  };
  const menuEngineering = parseJSON<any>(str(byKey("MenuEngineeringData") || "{}"), {}) || {};
  const digitalMenu = menuPayload({ digital_menu: parseJSON<any>(str(byKey("DigitalMenuData") || "{}"), {}) });

  // المواد
  const seenM: Record<string, boolean> = {};
  const materials = V(sheets[SHEET_MATERIALS]).slice(1).filter((r: any[]) => r.some((c) => c !== "")).map((r: any[]) => {
    let id = str(r[0]).trim(); if (!id || seenM[id]) id = id ? id + "_" + uuid().slice(0, 6) : uuid(); seenM[id] = true;
    return { id, name: str(r[1]), unit: str(r[2]), price: num(r[3]), purchase_price: num(r[4]), purchase_qty: num(r[5], 1) || 1, waste_percent: num(r[6]), portion_weight: num(r[7]) };
  });

  // الأطباق
  const mainS = sheets[SHEET_MAIN], mainV = V(mainS);
  const name = str(mainV[0] && mainV[0][2]) || "المطعم";
  const seenR: Record<string, boolean> = {};
  const recipes: any[] = [];
  mainV.forEach((row: any[], i: number) => {
    if (i < 2) return;
    let n = "";
    const f = mainS.formulas && mainS.formulas[i] && mainS.formulas[i][1];
    if (typeof f === "string" && f) { const m = f.match(/='([^']+)'!/) || f.match(/=([^!]+)!/); if (m) n = m[1]; }
    if (!n && row[1] !== "" && row[1] !== null) { n = String(row[1]); const m = n.match(/='([^']+)'/); if (m) n = m[1]; }
    n = n.trim();
    if (!n || seenR[n]) return;
    seenR[n] = true;
    const rs = findSheet(n);
    const ingredients = rs && !RESERVED_NAMES.includes(rs.name) ? V(rs).slice(1).filter((g: any[]) => g[0] && g[2]).map((g: any[], k: number) => ({ material_id: str(g[0]), material_name: str(g[1]), quantity: num(g[2]), pos: k })) : [];
    recipes.push({ name: n, cost_price: num(row[2]), labor_percent: num(row[3]), suggested_price: num(row[4]), selling_price: num(row[6]), ingredients });
  });

  const priceHistory = V(findSheet(SHEET_PRICE_HISTORY)).slice(1).filter((r: any[]) => r[0] !== "" || r[1] !== "").map((r: any[]) => ({ date: iso(r[0]) || new Date().toISOString(), material_id: str(r[1]), material_name: str(r[2]), old_price: num(r[3]), new_price: num(r[4]), change_percent: num(r[5]) }));
  const seenS: Record<string, boolean> = {};
  const sales = V(findSheet(SHEET_SALES)).slice(1).filter((r: any[]) => r[0] && iso(r[1])).filter((r: any[]) => { const k = str(r[0]); if (seenS[k]) return false; seenS[k] = true; return true; })
    .map((r: any[]) => ({ id: str(r[0]), date: iso(r[1]), recipe_name: str(r[2]), quantity: num(r[3]), unit_price: num(r[4]), total: num(r[5]) }));
  const seenO: Record<string, boolean> = {};
  const orders = V(findSheet(SHEET_MENU_ORDERS)).slice(1).filter((r: any[]) => r[0]).filter((r: any[]) => { const k = str(r[0]); if (seenO[k]) return false; seenO[k] = true; return true; })
    .map((r: any[]) => ({ id: str(r[0]), date: iso(r[1]) || new Date().toISOString(), table_number: str(r[2]), items: parseJSON<any>(str(r[3]) || "[]", []), total: num(r[4]), notes: str(r[5]), customer_name: str(r[6]), customer_phone: str(r[7]), status: str(r[8]) || "new", created_at: r[9] instanceof Date ? r[9].toISOString() : str(r[9]) }));

  // البنرات
  let banners: string[] | null = null;
  if (data.bannerState && Array.isArray(data.bannerState.banners)) banners = data.bannerState.banners;
  else {
    const bs = findSheet(FC_R5_BANNER_SHEET);
    if (bs) { const bv = V(bs); if (bv[0] && bv[0][0] === "foodcost-banner-r5") banners = bv.slice(1, 4).filter((r: any[]) => r[1]).map((r: any[]) => str(r[1])); }
  }

  // التقييمات
  let reviews: any[] = [];
  if (data.reviews) {
    const rv = V(data.reviews), head = (rv[0] || []).map((h: any) => str(h).trim());
    reviews = rv.slice(1).filter((r: any[]) => r.some((c) => c !== "")).map((r: any[]) => {
      const o: P = {};
      REVIEW_HEADERS.forEach((h, i) => { const idx = head.indexOf(h); const v = idx >= 0 ? r[idx] : ""; o[REVIEW_COLS[i]] = REVIEW_COLS[i] === "date" ? (iso(v) || new Date().toISOString()) : (v instanceof Date ? v.toISOString().slice(0, 10) : str(v)); });
      return o;
    });
  }
  return { name, settings, menuEngineering, digitalMenu, banners, materials, recipes, priceHistory, sales, orders, reviews };
}

async function replaceRestaurantData(email: string, m: ReturnType<typeof parseBackup>) {
  const assets = m.banners ? fcR5Assets(m.banners) : null;
  await sql.begin(async (tx: any) => {
    await tx`insert into fc_restaurants (email) values (${email}) on conflict (email) do nothing`;
    const r = await getRestaurantLocked(tx, email);
    await tx`delete from fc_materials where restaurant_email = ${email}`;
    await tx`delete from fc_recipes where restaurant_email = ${email}`;
    await tx`delete from fc_price_history where restaurant_email = ${email}`;
    await tx`delete from fc_sales where restaurant_email = ${email}`;
    await tx`delete from fc_menu_orders where restaurant_email = ${email}`;
    await tx`delete from fc_reviews where restaurant_email = ${email}`;
    await tx`update fc_restaurants set name = ${m.name}, waste_percent = ${m.settings.waste}, food_cost_percent = ${m.settings.fc}, currency = ${m.settings.currency},
             min_margin_percent = ${m.settings.minMargin}, menu_engineering = ${JSON.stringify(m.menuEngineering)}::text::jsonb, digital_menu = ${JSON.stringify(m.digitalMenu)}::text::jsonb,
             banner_assets = ${assets ? JSON.stringify(assets) : null}::text::jsonb, banner_revision = ${(Number(r.banner_revision) || 0) + 1}, updated_at = now() where email = ${email}`;
    for (const part of chunk(m.materials)) {
      await tx`insert into fc_materials (restaurant_email, id, name, unit, price, purchase_price, purchase_qty, waste_percent, portion_weight)
        select ${email}, x.id, x.name, x.unit, x.price, x.purchase_price, x.purchase_qty, x.waste_percent, x.portion_weight
        from jsonb_to_recordset(${ordJSON(part)}::text::jsonb) as x(id text, name text, unit text, price float8, purchase_price float8, purchase_qty float8, waste_percent float8, portion_weight float8, ord bigint) order by ord`;
    }
    for (const rc of m.recipes) {
      const [row] = await tx`insert into fc_recipes (restaurant_email, name, cost_price, labor_percent, suggested_price, selling_price)
        values (${email}, ${rc.name}, ${rc.cost_price}, ${rc.labor_percent}, ${rc.suggested_price}, ${rc.selling_price}) returning id`;
      if (rc.ingredients.length) {
        await tx`insert into fc_recipe_ingredients (recipe_id, material_id, material_name, quantity, pos)
          select ${row.id}, x.material_id, x.material_name, x.quantity, x.pos from jsonb_to_recordset(${JSON.stringify(rc.ingredients)}::text::jsonb) as x(material_id text, material_name text, quantity float8, pos int)`;
      }
    }
    for (const part of chunk(m.priceHistory)) {
      await tx`insert into fc_price_history (restaurant_email, date, material_id, material_name, old_price, new_price, change_percent)
        select ${email}, x.date, x.material_id, x.material_name, x.old_price, x.new_price, x.change_percent
        from jsonb_to_recordset(${ordJSON(part)}::text::jsonb) as x(date timestamptz, material_id text, material_name text, old_price float8, new_price float8, change_percent float8, ord bigint) order by ord`;
    }
    for (const part of chunk(m.sales)) {
      await tx`insert into fc_sales (restaurant_email, id, date, recipe_name, quantity, unit_price, total)
        select ${email}, x.id, x.date, x.recipe_name, x.quantity, x.unit_price, x.total
        from jsonb_to_recordset(${ordJSON(part)}::text::jsonb) as x(id text, date timestamptz, recipe_name text, quantity float8, unit_price float8, total float8, ord bigint) order by ord`;
    }
    for (const part of chunk(m.orders)) {
      await tx`insert into fc_menu_orders (restaurant_email, id, date, table_number, items, total, notes, customer_name, customer_phone, status, created_at)
        select ${email}, x.id, x.date, x.table_number, x.items, x.total, x.notes, x.customer_name, x.customer_phone, x.status, x.created_at
        from jsonb_to_recordset(${ordJSON(part)}::text::jsonb) as x(id text, date timestamptz, table_number text, items jsonb, total float8, notes text, customer_name text, customer_phone text, status text, created_at text, ord bigint) order by ord`;
    }
    for (const part of chunk(m.reviews)) {
      await tx`insert into fc_reviews (restaurant_email, date, name, phone, visit_date, people_count, visit_type, food, service, cleanliness, price, overall, status, favorite_dishes, recommendation, notes, restaurant_name)
        select ${email}, x.date, x.name, x.phone, x.visit_date, x.people_count, x.visit_type, x.food, x.service, x.cleanliness, x.price, x.overall, x.status, x.favorite_dishes, x.recommendation, x.notes, x.restaurant_name
        from jsonb_to_recordset(${ordJSON(part)}::text::jsonb) as x(date timestamptz, name text, phone text, visit_date text, people_count text, visit_type text, food text, service text, cleanliness text, price text, overall text, status text, favorite_dishes text, recommendation text, notes text, restaurant_name text, ord bigint) order by ord`;
    }
    await recalc(email, tx);
  });
}

async function takeSnapshot(email: string) {
  const exp = await exportBackup(email, "full-r5");
  const id = "snapshot-" + Date.now() + "-" + uuid().slice(0, 6);
  await sql`insert into fc_restore_snapshots (id, restaurant_email, snapshot) values (${id}, ${email}, ${JSON.stringify(exp.backup)}::text::jsonb)`;
  await sql`delete from fc_restore_snapshots where restaurant_email = ${email} and id not in (select id from fc_restore_snapshots where restaurant_email = ${email} order by created_at desc limit 10)`;
  return id;
}
// يعيد رفع الصور المضمّنة في النسخة (base64) إذا لم تعد روابطها الأصلية متاحة، أو دائماً عند force
async function rehostAssets(email: string, backup: any, force: boolean) {
  const warnings: string[] = [];
  let copied = 0;
  const assets: any[] = Array.isArray(backup?.assets) ? backup.assets : [];
  if (!assets.length) return { backup, warnings, copied };
  const pairs: [string, string][] = [];
  for (const a of assets) {
    if (!a || !a.base64) continue;
    const ref = (backup.imageRefs?.drive || []).find((x: any) => x.id === a.id);
    const urls: string[] = (ref?.urls || []).filter((u: any) => typeof u === "string" && u);
    if (!urls.length) continue;
    if (!force) {
      let alive = false;
      try { const h = await fetch(urls[0], { method: "GET", headers: { Range: "bytes=0-0" } }); alive = h.ok || h.status === 206; await h.body?.cancel(); } catch { alive = false; }
      if (alive) continue;
    }
    try {
      if (a.sha256 && (await sha256Hex(decodeBase64(String(a.base64).replace(/\s/g, "")))) !== a.sha256) fail("فشل تحقق SHA-256");
      const up = await uploadImageBytes(email, "data:" + (a.mime || "image/jpeg") + ";base64," + a.base64);
      urls.forEach((u) => pairs.push([u, up.url]));
      copied++;
    } catch (e) { warnings.push("صورة " + a.id + ": " + errMsg(e)); }
  }
  if (!pairs.length) return { backup, warnings, copied };
  pairs.sort((x, y) => y[0].length - x[0].length);
  let encoded = JSON.stringify({ ...backup, assets: [] });
  for (const [o, n] of pairs) encoded = encoded.split(o).join(n);
  return { backup: JSON.parse(encoded), warnings, copied };
}

async function restoreBackup(email: string, p: P, format: "full-r5" | "full-r4") {
  try {
    let data = parseJSON<any>(p.backup, null);
    validateBackup(data, email, format);
    if (Array.isArray(data.assets) && data.assets.length) data = (await rehostAssets(email, data, false)).backup;
    if (format === "full-r5" && (!data.bannerState || !Array.isArray(data.bannerState.banners))) fail("بيانات البنرات غير صالحة");
    const model = parseBackup(data);
    if (model.banners) fcR5Assets(model.banners);
    const prev = await takeSnapshot(email);
    await replaceRestaurantData(email, model);
    return { success: true, previousSpreadsheetId: prev, restoredSpreadsheetId: "supabase:" + email, sheetCount: data.sheets.length };
  } catch (e) { return { success: false, error: errMsg(e), stagedSpreadsheetId: null }; }
}
async function restoreSnapshot(email: string, p: P) {
  try {
    const r = await sql`select snapshot from fc_restore_snapshots where id = ${str(p.snapshotId || p.id)} and restaurant_email = ${email}`;
    if (!r.length) fail("اللقطة غير موجودة");
    return await restoreBackup(email, { backup: r[0].snapshot }, "full-r5");
  } catch (e) { return { success: false, error: errMsg(e) }; }
}
async function listSnapshots(email: string) {
  const r = await sql`select id, created_at from fc_restore_snapshots where restaurant_email = ${email} order by created_at desc`;
  return { success: true, snapshots: r.map((x: any) => ({ id: x.id, createdAt: x.created_at })) };
}

// ---------------- استيراد البيانات من Google Sheets (للإدارة فقط) ----------------
async function adminImportRestaurant(p: P) {
  try {
    const u = parseJSON<any>(p.user, null);
    if (!u || !u.email) fail("بيانات المستخدم مطلوبة");
    const email = lower(u.email);
    let hash = str(u.passwordHash || u.password);
    if (!hash) fail("كلمة المرور مفقودة للمستخدم " + email);
    const exp = safeDate(u.expiryDate, null) || new Date(Date.now() + 365 * 864e5);
    const created = safeDate(u.createdAt, new Date())!;
    const frozen = u.frozen === true || u.frozen === "true" || u.frozen === "TRUE";
    await sql`insert into fc_users (email, password_hash, expiry_date, full_name, created_at, frozen)
      values (${email}, ${hash}, ${exp.toISOString()}::timestamptz, ${str(u.fullName) || email}, ${created.toISOString()}::timestamptz, ${frozen})
      on conflict (email) do update set password_hash = excluded.password_hash, expiry_date = excluded.expiry_date, full_name = excluded.full_name, created_at = excluded.created_at, frozen = excluded.frozen`;
    await ensureRestaurant(email);
    const out: P = { success: true, email, warnings: [] as string[] };
    let backup = parseJSON<any>(p.backup, null);
    if (backup) {
      const assets = parseJSON<any[]>(p.assets, []) || [];
      if (assets.length) backup.assets = assets;
      const re = await rehostAssets(email, backup, true);
      backup = re.backup; out.warnings.push(...re.warnings);
      const copied = re.copied;
      backup.restaurantEmail = email;
      if (backup.format === "full-r4") backup.format = "full-r4"; else backup.format = "full-r5";
      validateBackup(backup, email, backup.format);
      const model = parseBackup(backup);
      await replaceRestaurantData(email, model);
      Object.assign(out, { materials: model.materials.length, recipes: model.recipes.length, sales: model.sales.length, orders: model.orders.length, reviews: model.reviews.length, imagesCopied: copied });
    }
    return out;
  } catch (e) { return { success: false, error: errMsg(e) }; }
}
// رفع صورة واحدة أثناء الترحيل (يُرجع الرابط الجديد في Supabase Storage)
async function adminUploadAsset(p: P) {
  try {
    const email = lower(p.email), a = parseJSON<any>(p.asset, null);
    if (!email || !a || !a.base64) fail("البريد والصورة مطلوبان");
    if (a.sha256 && (await sha256Hex(decodeBase64(String(a.base64).replace(/\s/g, "")))) !== a.sha256) fail("فشل تحقق SHA-256");
    const up = await uploadImageBytes(email, "data:" + (a.mime || "image/jpeg") + ";base64," + a.base64);
    return { success: true, id: a.id, url: up.url, fileId: up.fileId };
  } catch (e) { return { success: false, error: errMsg(e) }; }
}
async function adminImportTx(p: P) {
  try {
    const list = parseJSON<any[]>(p.transactions, []) || [];
    let n = 0;
    for (const part of chunk(list.filter((t) => t && t.txId))) {
      const r = await sql`insert into fc_used_transactions (tx_id, email, used_at)
        select x."txId", lower(coalesce(x.email, '')), coalesce(x."usedAt", now()) from jsonb_to_recordset(${JSON.stringify(part)}::text::jsonb) as x("txId" text, email text, "usedAt" timestamptz)
        on conflict (tx_id) do nothing returning tx_id`;
      n += r.length;
    }
    return { success: true, imported: n };
  } catch (e) { return { success: false, error: errMsg(e) }; }
}

// ============================================================
// FoodCost v4.0 — الباقات والصلاحيات ونظام التشغيل الكامل
// ============================================================

// ---------------- الباقات ----------------
const F_BASIC = ["costing", "digital_menu", "reviews"];
const F_PRO = [...F_BASIC, "pos", "tables", "discounts", "inventory", "customers", "loyalty", "gift_cards", "notifications",
  "google_card", "finance", "expenses", "reports", "team", "shifts", "branches", "online_orders"];
const F_PREMIUM = [...F_PRO, "kitchen", "order_board", "production", "purchasing", "transfers", "profit_reports", "activity",
  "quotes", "ledger", "brand_app", "multi_branch"];
const PLANS: Record<string, { key: string; name: string; price: number; features: string[]; limits: { products: number; branches: number } }> = {
  basic: { key: "basic", name: "الأساسية", price: 99, features: F_BASIC, limits: { products: 0, branches: 1 } },
  pro: { key: "pro", name: "الإنطلاقة", price: 300, features: F_PRO, limits: { products: 1000, branches: 1 } },
  premium: { key: "premium", name: "المتقدمة", price: 500, features: F_PREMIUM, limits: { products: -1, branches: -1 } },
};
const planOf = (k: any) => PLANS[str(k)] || PLANS.basic;
function requiredPlanFor(feature: string) {
  if (F_BASIC.includes(feature)) return "basic";
  if (F_PRO.includes(feature)) return "pro";
  return "premium";
}

// ---------------- صلاحيات الموظفين ----------------
const PERMS = ["pos", "orders_manage", "tables", "kitchen", "inventory", "purchasing", "customers", "finance", "reports",
  "team", "costing", "digital_menu", "reviews", "marketing", "settings"];
const ROLE_PRESETS: Record<string, string[]> = {
  manager: PERMS.filter((p) => p !== "settings"),
  cashier: ["pos", "tables", "customers"],
  waiter: ["pos", "tables"],
  kitchen: ["kitchen"],
  accountant: ["finance", "reports", "purchasing", "inventory"],
  storekeeper: ["inventory", "purchasing"],
  custom: [],
};
const ROLE_NAMES: Record<string, string> = { manager: "مدير", cashier: "كاشير", waiter: "نادل", kitchen: "مطبخ", accountant: "محاسب", storekeeper: "أمين مخزن", custom: "مخصص" };

type Ctx = {
  email: string; plan: string; features: Set<string>;
  staff: null | { id: string; name: string; role: string; perms: Set<string>; branchId: string | null };
  actor: string; actorId: string; isOwner: boolean; token: string;
};

async function buildCtx(email: string, staffId: string | null, token: string): Promise<Ctx> {
  const u = await getUserRow(email);
  const plan = planOf(u?.plan);
  const ctx: Ctx = { email, plan: plan.key, features: new Set(plan.features), staff: null, actor: (u?.full_name || "المالك"), actorId: "owner", isOwner: true, token };
  if (staffId) {
    const s = (await sql`select * from fc_staff where id = ${staffId} and restaurant_email = ${email}`)[0];
    if (!s || !s.active) throw new AuthErr("حساب الموظف موقوف أو محذوف");
    const perms = new Set<string>(Array.isArray(s.permissions) && s.permissions.length ? s.permissions : (ROLE_PRESETS[s.role] || []));
    ctx.staff = { id: s.id, name: s.name, role: s.role, perms, branchId: s.branch_id || null };
    ctx.actor = s.name; ctx.actorId = s.id; ctx.isOwner = false;
  }
  return ctx;
}
class AuthErr extends Error {}
class PlanErr extends Error { constructor(public feature: string) { super("plan"); } }
const can = (ctx: Ctx, perm: string | null) => !perm || ctx.isOwner || !!ctx.staff?.perms.has(perm);
const has = (ctx: Ctx, feature: string) => ctx.features.has(feature);
function needFeature(ctx: Ctx, feature: string) { if (!has(ctx, feature)) throw new PlanErr(feature); }
function needPerm(ctx: Ctx, ...perms: string[]) {
  if (ctx.isOwner) return;
  if (!perms.some((p) => ctx.staff!.perms.has(p))) fail("لا تملك صلاحية لهذا الإجراء");
}
function planErrorResponse(feature: string) {
  const req = requiredPlanFor(feature), p = PLANS[req];
  return { success: false, planError: true, feature, requiredPlan: req, error: "هذه الميزة متاحة في باقة «" + p.name + "» (" + p.price + " دولار سنوياً)" };
}

// ---------------- أدوات عامة ----------------
const isoDate = (v: any) => { const d = safeDate(v, null); return d ? d.toISOString().slice(0, 10) : null; };
const jsonArr = (v: any) => { const x = parseJSON<any>(v, []); return Array.isArray(x) ? x : []; };
const jsonObj = (v: any) => { const x = parseJSON<any>(v, {}); return x && typeof x === "object" && !Array.isArray(x) ? x : {}; };
const digits = (v: any) => str(v).replace(/\D/g, "");
async function nextNo(db: any, email: string, key: string): Promise<number> {
  const r = await db`insert into fc_counters (restaurant_email, key, value) values (${email}, ${key}, 1)
    on conflict (restaurant_email, key) do update set value = fc_counters.value + 1 returning value`;
  return Number(r[0].value);
}
async function logAct(ctx: Ctx, action: string, details = "", branchId: string | null = null) {
  try {
    await sql`insert into fc_activity (restaurant_email, actor, actor_role, action, details, branch_id)
      values (${ctx.email}, ${ctx.actor}, ${ctx.isOwner ? "المالك" : (ROLE_NAMES[ctx.staff!.role] || ctx.staff!.role)}, ${action}, ${str(details).slice(0, 500)}, ${branchId})`;
  } catch { /* لا نوقف العملية بسبب السجل */ }
}

// ---------------- إعدادات النشاط ----------------
const BIZ_DEFAULTS: any = {
  business: { legalName: "", address: "", phone: "", crNumber: "", logo: "" },
  tax: { enabled: false, rate: 15, inclusive: true, number: "", name: "ضريبة القيمة المضافة" },
  receipt: { header: "", footer: "شكراً لزيارتكم", showQr: true, paper: "80" },
  loyalty: { enabled: false, pointsPerUnit: 1, pointValue: 0.05, minRedeem: 100 },
  pos: { requireShift: false, allowNegativeStock: true, kitchenAuto: true, defaultOrderType: "takeaway", allowPriceEdit: false },
  ordering: { enabled: false, tableOrdering: true, requirePhone: false },
  google: { reviewUrl: "", placeName: "", headline: "قيّم تجربتك معنا على Google" },
  app: { name: "", shortName: "", color: "#b48554", bg: "#0b0e17", icon: "", welcome: "", phone: "", instagram: "", maps: "", enableReservations: true, enableLoyalty: true, enableOrderStatus: true },
  notify: { lowStock: true, reservations: true, birthdays: true, credit: true, giftExpiry: true },
};
function mergeBiz(saved: any) {
  const out: any = {};
  for (const k of Object.keys(BIZ_DEFAULTS)) out[k] = Object.assign({}, BIZ_DEFAULTS[k], (saved && typeof saved[k] === "object") ? saved[k] : {});
  return out;
}
async function loadBiz(email: string, db: any = sql) {
  const r = (await db`select biz_settings from fc_restaurants where email = ${email}`)[0];
  return mergeBiz(r?.biz_settings || {});
}
const BIZ_SECTION_FEATURE: Record<string, string> = { business: "pos", tax: "finance", receipt: "pos", loyalty: "loyalty", pos: "pos", ordering: "online_orders", google: "google_card", app: "brand_app", notify: "notifications" };
async function saveBizSettings(ctx: Ctx, p: P) {
  needPerm(ctx, "settings");
  const patch = jsonObj(p.settings);
  const cur = await loadBiz(ctx.email);
  for (const k of Object.keys(patch)) {
    if (!BIZ_DEFAULTS[k]) continue;
    needFeature(ctx, BIZ_SECTION_FEATURE[k]);
    const clean: any = {};
    for (const f of Object.keys(BIZ_DEFAULTS[k])) {
      if (patch[k][f] === undefined) continue;
      const d = BIZ_DEFAULTS[k][f];
      clean[f] = typeof d === "boolean" ? !!patch[k][f] && patch[k][f] !== "false" : typeof d === "number" ? num(patch[k][f], d) : str(patch[k][f]).slice(0, 2000);
    }
    cur[k] = Object.assign(cur[k], clean);
  }
  await sql`update fc_restaurants set biz_settings = ${JSON.stringify(cur)}::text::jsonb, updated_at = now() where email = ${ctx.email}`;
  await logAct(ctx, "تعديل إعدادات النشاط", Object.keys(patch).join("، "));
  return { success: true, settings: cur };
}

// ---------------- الفروع ----------------
async function ensureMainBranch(email: string) {
  let b = await sql`select * from fc_branches where restaurant_email = ${email} order by is_main desc, created_at limit 1`;
  if (!b.length) {
    const r = await getRestaurant(email);
    b = await sql`insert into fc_branches (restaurant_email, name, is_main) values (${email}, ${"الفرع الرئيسي" + (r?.name && r.name !== "المطعم" ? " — " + r.name : "")}, true) returning *`;
  }
  return b[0];
}
async function resolveBranch(ctx: Ctx, wanted: any): Promise<string> {
  if (ctx.staff?.branchId) return ctx.staff.branchId;
  const main = await ensureMainBranch(ctx.email);
  const w = str(wanted);
  if (!w || w === main.id || !has(ctx, "multi_branch")) return main.id;
  const ok = await sql`select id from fc_branches where id = ${w} and restaurant_email = ${ctx.email}`;
  return ok.length ? w : main.id;
}
// للتقارير: "all" لكل الفروع (المتقدمة فقط ولغير المقيدين بفرع)
async function resolveBranchOrAll(ctx: Ctx, wanted: any): Promise<string | null> {
  if (str(wanted) === "all" && has(ctx, "multi_branch") && !ctx.staff?.branchId) return null;
  return await resolveBranch(ctx, wanted);
}

// ---------------- الحساب والباقة ----------------
async function getAccountInfo(ctx: Ctx) {
  const u = await getUserRow(ctx.email);
  const r = await getRestaurant(ctx.email);
  const plan = planOf(u?.plan);
  const exp = u ? new Date(u.expiry_date) : new Date();
  let branches: any[] = [], productsCount = 0;
  if (has(ctx, "pos")) {
    await ensureMainBranch(ctx.email);
    branches = await sql`select id, name, address, phone, is_main, active from fc_branches where restaurant_email = ${ctx.email} order by is_main desc, created_at`;
    if (ctx.staff?.branchId) branches = branches.filter((b: any) => b.id === ctx.staff!.branchId);
    productsCount = (await sql`select count(*)::int as n from fc_products where restaurant_email = ${ctx.email}`)[0].n;
  }
  return {
    success: true,
    plan: plan.key, planName: plan.name, planPrice: plan.price, features: plan.features, limits: plan.limits,
    plans: Object.values(PLANS).map((x) => ({ key: x.key, name: x.name, price: x.price })),
    expiryDate: fmtGmt3(exp), daysLeft: Math.ceil((exp.getTime() - Date.now()) / 864e5),
    restaurantName: r?.name || "المطعم", currency: r?.currency || "ر.س", publicId: r?.public_id || "",
    branches, productsCount,
    staff: ctx.staff ? { id: ctx.staff.id, name: ctx.staff.name, role: ctx.staff.role, roleName: ROLE_NAMES[ctx.staff.role] || ctx.staff.role, permissions: [...ctx.staff.perms], branchId: ctx.staff.branchId } : null,
    isOwner: ctx.isOwner, ownerName: u?.full_name || "",
    biz: has(ctx, "pos") ? mergeBiz(r?.biz_settings || {}) : null,
    perms: PERMS, rolePresets: ROLE_PRESETS, roleNames: ROLE_NAMES,
  };
}

// ---------------- دخول الموظفين ----------------
async function staffLogin(p: P) {
  const ident = lower(p.restaurant || p.restaurantEmail);
  const username = lower(p.username), pin = str(p.pin || p.password).trim();
  if (!ident || !username || !pin) return { status: "invalid", message: "أدخل بريد المطعم واسم المستخدم والرمز" };
  const rr = await sql`select email from fc_restaurants where email = ${ident} or public_id = ${ident} limit 1`;
  if (!rr.length) return { status: "invalid", message: "بيانات الدخول غير صحيحة" };
  const email = rr[0].email;
  const s = (await sql`select * from fc_staff where restaurant_email = ${email} and lower(username) = ${username}`)[0];
  if (!s || !(await verifyPassword(pin, s.pin_hash))) return { status: "invalid", message: "بيانات الدخول غير صحيحة" };
  if (!s.active) return { status: "frozen", message: "حساب الموظف موقوف. راجع الإدارة." };
  const u = await getUserRow(email);
  if (!u) return { status: "invalid", message: "بيانات الدخول غير صحيحة" };
  if (u.frozen) return { status: "frozen", message: "حساب المطعم مجمّد. راجع الإدارة." };
  const exp = new Date(u.expiry_date);
  if (new Date() > exp) return { status: "expired", message: "انتهى اشتراك المطعم" };
  if (!planOf(u.plan).features.includes("team")) return { status: "invalid", message: "حسابات الموظفين متاحة في باقة الإنطلاقة أو المتقدمة" };
  const session = await createSession(email, SESSION_HOURS);
  await sql`update fc_sessions set staff_id = ${s.id} where token = ${session.token}`;
  sql`update fc_staff set last_login = now() where id = ${s.id}`.catch(() => {});
  return { status: "success", token: session.token, sessionExpiry: session.expiry, email, name: s.name, daysLeft: Math.ceil((exp.getTime() - Date.now()) / 864e5), staff: { id: s.id, name: s.name, role: s.role } };
}

// ============================================================
// الكيانات العامة (قائمة / حفظ / حذف) — مع التحقق من الباقة والصلاحية
// ============================================================
type ColT = "text" | "num" | "numnull" | "int" | "bool" | "json" | "date" | "ts" | "textnull";
type Entity = {
  table: string; feature: string; read: string[]; write: string[]; cols: Record<string, ColT>;
  order: string; branchScoped?: boolean; search?: string[]; dateCol?: string; readOnly?: boolean; label: string;
  hide?: string[]; noDelete?: boolean;
  before?: (ctx: Ctx, row: P, isNew: boolean, old: any) => Promise<void>;
  beforeDelete?: (ctx: Ctx, old: any) => Promise<void>;
};
const ENTITIES: Record<string, Entity> = {
  branches: {
    table: "fc_branches", feature: "branches", read: ["team", "pos", "inventory", "reports", "finance"], write: ["team"], label: "فرع",
    cols: { name: "text", address: "text", phone: "text", active: "bool" }, order: "is_main desc, created_at", search: ["name"],
    before: async (ctx, row, isNew) => {
      if (!str(row.name).trim()) fail("اسم الفرع مطلوب");
      if (isNew) {
        const lim = planOf(ctx.plan).limits.branches;
        const n = (await sql`select count(*)::int as n from fc_branches where restaurant_email = ${ctx.email}`)[0].n;
        if (lim >= 0 && n >= lim) throw new PlanErr("multi_branch");
      }
    },
    beforeDelete: async (ctx, old) => {
      if (old.is_main) fail("لا يمكن حذف الفرع الرئيسي");
      const used = await sql`select 1 from fc_orders where branch_id = ${old.id} limit 1`;
      if (used.length) fail("الفرع يحتوي على طلبات — يمكنك إيقافه بدلاً من حذفه");
    },
  },
  staff: {
    table: "fc_staff", feature: "team", read: ["team"], write: ["team"], label: "موظف", hide: ["pin_hash"],
    cols: { name: "text", username: "text", role: "text", permissions: "json", phone: "text", active: "bool", branch_id: "textnull" },
    order: "created_at", search: ["name", "username", "phone"],
    before: async (ctx, row, isNew) => {
      if (!str(row.name).trim()) fail("اسم الموظف مطلوب");
      const un = lower(row.username);
      if (!/^[a-z0-9._-]{3,30}$/.test(un)) fail("اسم المستخدم: 3-30 حرفاً إنجليزياً أو أرقاماً");
      row.username = un;
      if (!ROLE_PRESETS[row.role]) row.role = "cashier";
      const perms = (Array.isArray(row.permissions) ? row.permissions : []).filter((x: any) => PERMS.includes(x));
      row.permissions = JSON.stringify(row.role === "custom" ? perms : (perms.length ? perms : ROLE_PRESETS[row.role]));
      if (!ctx.isOwner && JSON.parse(row.permissions).includes("settings")) fail("لا يمكن منح صلاحية الإعدادات إلا من المالك");
      if (row.branch_id) {
        const b = await sql`select 1 from fc_branches where id = ${row.branch_id} and restaurant_email = ${ctx.email}`;
        if (!b.length) row.branch_id = null;
      }
      const dup = await sql`select id from fc_staff where restaurant_email = ${ctx.email} and lower(username) = ${un} and id <> ${str(row.id)}`;
      if (dup.length) fail("اسم المستخدم مستخدم لموظف آخر");
      const pin = str(row.pin).trim();
      if (isNew && !pin) fail("رمز الدخول مطلوب");
      if (pin) { if (pin.length < 4) fail("رمز الدخول 4 خانات على الأقل"); row.pin_hash = await hashPassword(pin); }
      delete row.pin;
    },
    beforeDelete: async (_ctx, old) => { await sql`delete from fc_sessions where staff_id = ${old.id}`; },
  },
  products: {
    table: "fc_products", feature: "inventory", read: ["pos", "inventory", "purchasing", "reports", "finance"], write: ["inventory"], label: "منتج",
    cols: { name: "text", category: "text", kind: "text", sku: "text", barcode: "text", unit: "text", price: "num", cost: "num", tax_rate: "numnull",
      variants: "json", extras: "json", recipe_name: "text", track_stock: "bool", image_url: "text", color: "text", active: "bool", show_in_kitchen: "bool", sort: "int" },
    order: "sort, name", search: ["name", "sku", "barcode", "category"],
    before: async (ctx, row, isNew) => {
      if (!str(row.name).trim()) fail("اسم المنتج مطلوب");
      if (!["product", "service", "semi"].includes(row.kind)) row.kind = "product";
      if (row.recipe_name && !has(ctx, "production")) row.recipe_name = "";
      if (row.kind === "service") row.track_stock = false;
      row.updated_at = new Date().toISOString();
      if (isNew) {
        const lim = planOf(ctx.plan).limits.products;
        const n = (await sql`select count(*)::int as n from fc_products where restaurant_email = ${ctx.email}`)[0].n;
        if (lim >= 0 && n >= lim) fail("وصلت إلى الحد الأقصى للمنتجات في باقتك (" + lim + " منتج). رقِّ إلى «المتقدمة» لمنتجات بلا حد.");
      }
    },
  },
  customers: {
    table: "fc_customers", feature: "customers", read: ["customers", "pos", "finance"], write: ["customers", "pos"], label: "عميل",
    cols: { name: "text", phone: "text", email: "text", birthday: "date", tax_no: "text", address: "text", notes: "text", credit_limit: "num" },
    order: "created_at desc", search: ["name", "phone", "email"],
    before: async (ctx, row) => {
      if (!str(row.name).trim()) fail("اسم العميل مطلوب");
      if (row.phone) {
        const dup = await sql`select id from fc_customers where restaurant_email = ${ctx.email} and phone <> '' and regexp_replace(phone, '\\D', '', 'g') = ${digits(row.phone)} and id <> ${str(row.id)}`;
        if (dup.length && digits(row.phone)) fail("رقم الهاتف مسجل لعميل آخر");
      }
    },
    beforeDelete: async (_ctx, old) => { if (Math.abs(num(old.balance)) > 0.009) fail("لا يمكن حذف عميل لديه رصيد آجل"); },
  },
  discounts: {
    table: "fc_discounts", feature: "discounts", read: ["marketing", "pos"], write: ["marketing"], label: "خصم",
    cols: { name: "text", kind: "text", value: "num", applies_to: "text", target: "text", code: "text", min_total: "num", starts_at: "date", ends_at: "date", active: "bool" },
    order: "created_at desc", search: ["name", "code"],
    before: async (_ctx, row) => {
      if (!str(row.name).trim()) fail("اسم العرض مطلوب");
      if (!["percent", "amount"].includes(row.kind)) row.kind = "percent";
      if (!["order", "category", "product"].includes(row.applies_to)) row.applies_to = "order";
      if (row.kind === "percent" && (row.value <= 0 || row.value > 100)) fail("نسبة الخصم بين 1 و 100");
      if (row.kind === "amount" && row.value <= 0) fail("قيمة الخصم يجب أن تكون أكبر من صفر");
      row.code = str(row.code).trim().toUpperCase();
    },
  },
  gift_cards: {
    table: "fc_gift_cards", feature: "gift_cards", read: ["customers", "pos"], write: ["customers"], label: "بطاقة هدية",
    cols: { active: "bool", expires_at: "date", note: "text", customer_name: "text" }, order: "created_at desc", search: ["code", "customer_name"], noDelete: true,
    before: async (_ctx, _row, isNew) => { if (isNew) fail("استخدم إصدار بطاقة هدية"); },
  },
  tables: {
    table: "fc_tables", feature: "tables", read: ["tables", "pos"], write: ["tables"], label: "طاولة", branchScoped: true,
    cols: { name: "text", area: "text", seats: "int", sort: "int", active: "bool" }, order: "area, sort, name", search: ["name", "area"],
    before: async (_ctx, row) => { if (!str(row.name).trim()) fail("اسم/رقم الطاولة مطلوب"); },
  },
  reservations: {
    table: "fc_reservations", feature: "tables", read: ["tables", "pos"], write: ["tables", "pos"], label: "حجز", branchScoped: true,
    cols: { table_id: "textnull", customer_id: "textnull", customer_name: "text", phone: "text", party_size: "int", reserved_at: "ts", duration_min: "int", status: "text", notes: "text" },
    order: "reserved_at", search: ["customer_name", "phone"], dateCol: "reserved_at",
    before: async (_ctx, row) => {
      if (!str(row.customer_name).trim()) fail("اسم صاحب الحجز مطلوب");
      if (!row.reserved_at) fail("موعد الحجز مطلوب");
      if (!["pending", "confirmed", "seated", "done", "cancelled", "no_show"].includes(row.status)) row.status = "confirmed";
      if (!row.duration_min) row.duration_min = 90;
    },
  },
  expenses: {
    table: "fc_expenses", feature: "expenses", read: ["finance"], write: ["finance"], label: "مصروف", branchScoped: true,
    cols: { category: "text", amount: "num", tax: "num", method: "text", supplier_id: "textnull", note: "text", spent_at: "date" },
    order: "spent_at desc, created_at desc", search: ["category", "note"], dateCol: "spent_at",
    before: async (ctx, row, isNew) => {
      if (!(row.amount > 0)) fail("المبلغ يجب أن يكون أكبر من صفر");
      if (!row.spent_at) row.spent_at = new Date().toISOString().slice(0, 10);
      if (isNew) {
        row.created_by = ctx.actor;
        if (row.method === "cash") {
          const sh = (await sql`select id from fc_shifts where restaurant_email = ${ctx.email} and branch_id = ${row.branch_id} and staff_id = ${ctx.actorId} and status = 'open' limit 1`)[0];
          if (sh) row.shift_id = sh.id;
        }
      }
    },
  },
  suppliers: {
    table: "fc_suppliers", feature: "purchasing", read: ["purchasing", "inventory", "finance"], write: ["purchasing"], label: "مورّد",
    cols: { name: "text", phone: "text", email: "text", tax_no: "text", address: "text", notes: "text" }, order: "name", search: ["name", "phone"],
    before: async (_ctx, row) => { if (!str(row.name).trim()) fail("اسم المورّد مطلوب"); },
    beforeDelete: async (_ctx, old) => { if (Math.abs(num(old.balance)) > 0.009) fail("لا يمكن حذف مورّد لديه رصيد مستحق"); },
  },
  shifts: { table: "fc_shifts", feature: "shifts", read: ["team", "finance", "pos"], write: [], readOnly: true, label: "وردية", branchScoped: true, cols: {}, order: "opened_at desc", dateCol: "opened_at", search: ["staff_name"] },
  purchases: { table: "fc_purchases", feature: "purchasing", read: ["purchasing", "finance"], write: [], readOnly: true, label: "فاتورة شراء", branchScoped: true, cols: {}, order: "purchased_at desc, number desc", dateCol: "purchased_at", search: ["supplier_name", "ref_no"] },
  transfers: { table: "fc_transfers", feature: "transfers", read: ["inventory"], write: [], readOnly: true, label: "تحويل", cols: {}, order: "created_at desc", dateCol: "created_at" },
  production: { table: "fc_production", feature: "production", read: ["inventory"], write: [], readOnly: true, label: "أمر إنتاج", branchScoped: true, cols: {}, order: "created_at desc", dateCol: "created_at", search: ["product_name"] },
  quotes: {
    table: "fc_quotes", feature: "quotes", read: ["finance", "pos"], write: ["finance", "pos"], label: "عرض سعر", branchScoped: true,
    cols: { status: "text", notes: "text", valid_until: "date" }, order: "created_at desc", dateCol: "created_at", search: ["customer_name", "phone"],
    before: async (_ctx, _row, isNew) => { if (isNew) fail("استخدم إنشاء عرض سعر"); },
  },
};

function coerce(t: ColT, v: any) {
  if (t === "num") { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; }
  if (t === "numnull") { const n = parseFloat(v); return Number.isFinite(n) ? n : null; }
  if (t === "int") return parseInt(v) || 0;
  if (t === "bool") return v === true || v === "true" || v === 1 || v === "1" || v === "on";
  if (t === "json") return Array.isArray(v) || (v && typeof v === "object") ? v : parseJSON<any>(v, []);
  if (t === "date") return isoDate(v);
  if (t === "ts") { const d = safeDate(v, null); return d ? d.toISOString() : null; }
  if (t === "textnull") return v === null || v === undefined || v === "" ? null : str(v);
  return str(v).slice(0, 5000);
}
function entityOf(ctx: Ctx, kind: any, write: boolean) {
  const e = ENTITIES[str(kind)];
  if (!e) fail("نوع بيانات غير معروف");
  needFeature(ctx, e.feature);
  if (write) { if (e.readOnly) fail("هذه البيانات للقراءة فقط"); needPerm(ctx, ...e.write); }
  else needPerm(ctx, ...e.read, ...e.write);
  return e;
}
function cleanRow(e: Entity, r: any) { const o = { ...r }; (e.hide || []).forEach((h) => delete o[h]); delete o.restaurant_email; return o; }

async function entityList(ctx: Ctx, p: P) {
  const e = entityOf(ctx, p.kind, false);
  const params: any[] = [ctx.email];
  let q = `select * from ${e.table} where restaurant_email = $1`;
  if (e.branchScoped) {
    const b = await resolveBranchOrAll(ctx, p.branchId);
    if (b) { params.push(b); q += ` and branch_id = $${params.length}`; }
  }
  if (p.q && e.search?.length) {
    params.push("%" + str(p.q).trim() + "%");
    q += " and (" + e.search.map((c) => `${c}::text ilike $${params.length}`).join(" or ") + ")";
  }
  if (e.dateCol && p.from) { params.push(isoDate(p.from)); q += ` and ${e.dateCol} >= $${params.length}::date`; }
  if (e.dateCol && p.to) { params.push(isoDate(p.to)); q += ` and ${e.dateCol} < ($${params.length}::date + 1)`; }
  if (p.status) { params.push(str(p.status)); q += ` and status = $${params.length}`; }
  if (p.activeOnly && (e.cols.active || ["branches"].includes(str(p.kind)))) q += " and active = true";
  q += ` order by ${e.order} limit ${Math.min(Math.max(parseInt(p.limit) || 3000, 1), 5000)}`;
  const rows = await sql.unsafe(q, params);
  return { success: true, kind: p.kind, rows: rows.map((r: any) => cleanRow(e, r)) };
}

async function entitySave(ctx: Ctx, p: P) {
  const e = entityOf(ctx, p.kind, true);
  const data = jsonObj(p.data);
  const id = str(data.id);
  let old: any = null;
  if (id) {
    old = (await sql.unsafe(`select * from ${e.table} where id = $1 and restaurant_email = $2`, [id, ctx.email]))[0];
    if (!old) fail("السجل غير موجود");
    if (e.branchScoped && ctx.staff?.branchId && old.branch_id !== ctx.staff.branchId) fail("لا تملك صلاحية على فرع آخر");
  }
  const row: P = {};
  for (const [c, t] of Object.entries(e.cols)) if (data[c] !== undefined) row[c] = coerce(t, data[c]);
  if (data.pin !== undefined) row.pin = data.pin;
  if (!old) {
    for (const [c, t] of Object.entries(e.cols)) if (row[c] === undefined && (t === "bool") && c === "active") row[c] = true;
    if (e.branchScoped) row.branch_id = await resolveBranch(ctx, data.branch_id || p.branchId);
  }
  row.id = id;
  await e.before?.(ctx, row, !old, old);
  for (const k of Object.keys(row)) if (Array.isArray(row[k]) || (row[k] && typeof row[k] === "object")) row[k] = JSON.stringify(row[k]);
  delete row.id;
  const keys = Object.keys(row);
  let saved: any;
  if (old) {
    if (!keys.length) return { success: true, row: cleanRow(e, old) };
    const cast = (k: string) => (e.cols[k] === "json" ? "::text::jsonb" : "");
    const sets = keys.map((k, i) => `${k} = $${i + 3}${cast(k)}`).join(", ");
    saved = (await sql.unsafe(`update ${e.table} set ${sets} where id = $1 and restaurant_email = $2 returning *`, [id, ctx.email, ...keys.map((k) => row[k])]))[0];
  } else {
    const newId = uuid();
    const cols = ["id", "restaurant_email", ...keys];
    const vals = [newId, ctx.email, ...keys.map((k) => row[k])];
    const castI = (k: string) => (e.cols[k] === "json" ? "::text::jsonb" : "");
    saved = (await sql.unsafe(`insert into ${e.table} (${cols.join(", ")}) values (${cols.map((k, i) => "$" + (i + 1) + castI(k)).join(", ")}) returning *`, vals))[0];
  }
  await logAct(ctx, (old ? "تعديل " : "إضافة ") + e.label, str(saved.name || saved.customer_name || saved.category || saved.code || ""), saved.branch_id || null);
  return { success: true, row: cleanRow(e, saved) };
}

async function entityDelete(ctx: Ctx, p: P) {
  const e = entityOf(ctx, p.kind, true);
  if (e.noDelete) fail("لا يمكن حذف هذا النوع — يمكنك إيقافه");
  const old = (await sql.unsafe(`select * from ${e.table} where id = $1 and restaurant_email = $2`, [str(p.id), ctx.email]))[0];
  if (!old) fail("السجل غير موجود");
  if (e.branchScoped && ctx.staff?.branchId && old.branch_id !== ctx.staff.branchId) fail("لا تملك صلاحية على فرع آخر");
  await e.beforeDelete?.(ctx, old);
  await sql.unsafe(`delete from ${e.table} where id = $1 and restaurant_email = $2`, [old.id, ctx.email]);
  await logAct(ctx, "حذف " + e.label, str(old.name || old.customer_name || old.category || ""), old.branch_id || null);
  return { success: true };
}

// ============================================================
// العمليات: نقطة البيع، المخزون، الفوترة، الورديات، المشتريات، التحويلات، الإنتاج،
// العملاء والولاء، الآجل، عروض الأسعار، التقارير، الإشعارات، التطبيق الخاص
// ============================================================

// ---------- نطاق التاريخ حسب توقيت المستخدم ----------
function rangeOf(p: P, defDays = 30) {
  const off = Number.isFinite(parseInt(p.tzOffset)) ? parseInt(p.tzOffset) : 180; // دقائق قبل/بعد UTC (افتراضي +3)
  const parse = (v: any, end: boolean) => {
    const s = str(v);
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + (end ? 1 : 0)) - off * 60000);
    const d = safeDate(s, null);
    return d;
  };
  let to = p.to ? parse(p.to, true) : null;
  let from = p.from ? parse(p.from, false) : null;
  if (!to) to = new Date(Date.now() + 60000);
  if (!from) from = new Date(to.getTime() - defDays * 864e5);
  return { from, to, off };
}

// ---------- حركات المخزون ----------
async function applyMove(db: any, email: string, branch: string, type: string, id: string, name: string, delta: number, reason: string, refType = "", refId = "", unitCost = 0, note = "", actor = "") {
  if (!delta) return;
  await db`insert into fc_stock (restaurant_email, branch_id, item_type, item_id, qty) values (${email}, ${branch}, ${type}, ${id}, ${delta})
    on conflict (restaurant_email, branch_id, item_type, item_id) do update set qty = fc_stock.qty + ${delta}, updated_at = now()`;
  await db`insert into fc_stock_moves (restaurant_email, branch_id, item_type, item_id, item_name, qty, unit_cost, reason, ref_type, ref_id, note, actor)
    values (${email}, ${branch}, ${type}, ${id}, ${name}, ${delta}, ${unitCost}, ${reason}, ${refType}, ${refId}, ${note}, ${actor})`;
}
async function stockQty(db: any, email: string, branch: string, type: string, id: string) {
  const r = await db`select qty from fc_stock where restaurant_email = ${email} and branch_id = ${branch} and item_type = ${type} and item_id = ${id}`;
  return r.length ? num(r[0].qty) : 0;
}
async function itemInfo(db: any, email: string, type: string, id: string) {
  if (type === "material") {
    const m = (await db`select id, name, unit, price from fc_materials where restaurant_email = ${email} and id = ${id}`)[0];
    if (!m) fail("المادة غير موجودة");
    return { id: m.id, name: m.name, unit: m.unit, cost: num(m.price) };
  }
  const pr = (await db`select id, name, unit, cost, track_stock from fc_products where restaurant_email = ${email} and id = ${id}`)[0];
  if (!pr) fail("المنتج غير موجود");
  return { id: pr.id, name: pr.name, unit: pr.unit, cost: num(pr.cost), track: pr.track_stock };
}
// مكونات الوصفات: الاسم → [{materialId, name, qty, price}]
async function recipeMap(db: any, email: string, names: string[]) {
  const out: Record<string, { cost: number; ings: any[] }> = {};
  if (!names.length) return out;
  const recs = await db`select id, name, cost_price from fc_recipes where restaurant_email = ${email} and name = any(${names}::text[])`;
  recs.forEach((r: any) => out[r.name] = { cost: num(r.cost_price), ings: [] });
  if (!recs.length) return out;
  const ings = await db`select r.name as rname, i.material_id, i.quantity, coalesce(m.name, i.material_name) as mname, coalesce(m.price, 0) as price
    from fc_recipe_ingredients i join fc_recipes r on r.id = i.recipe_id
    left join fc_materials m on m.restaurant_email = r.restaurant_email and m.id = i.material_id
    where r.restaurant_email = ${email} and r.name = any(${names}::text[])`;
  ings.forEach((g: any) => out[g.rname]?.ings.push({ materialId: g.material_id, name: g.mname, qty: num(g.quantity), price: num(g.price) }));
  return out;
}

// ---------- تسعير الأسطر وحساب الإجماليات ----------
async function priceOrder(db: any, ctx: Ctx, rawItems: any[], discountIn: any, biz: any, trusted = false) {
  const ids = [...new Set(rawItems.map((x) => str(x.productId)).filter(Boolean))];
  const prods = ids.length ? await db`select * from fc_products where restaurant_email = ${ctx.email} and id = any(${ids}::text[])` : [];
  const pmap: Record<string, any> = {}; prods.forEach((x: any) => pmap[x.id] = x);
  const rnames = [...new Set(prods.map((x: any) => x.recipe_name).filter(Boolean))] as string[];
  const rmap = await recipeMap(db, ctx.email, rnames);
  const canEditPrice = trusted || ctx.isOwner || can(ctx, "orders_manage") || biz.pos.allowPriceEdit;
  const taxOn = !!biz.tax.enabled;
  const lines: any[] = [];
  for (const raw of rawItems) {
    const qty = num(raw.qty, 0);
    if (!(qty > 0)) continue;
    const pr = raw.productId ? pmap[str(raw.productId)] : null;
    if (raw.productId && !pr) fail("منتج غير موجود في الطلب: " + str(raw.name));
    let unitBase = 0, name = str(raw.name).trim(), variant = str(raw.variant), category = "", cost = 0, rate = taxOn ? num(biz.tax.rate, 0) : 0, kitchen = true;
    const extras: any[] = [];
    if (pr) {
      name = pr.name; category = pr.category; kitchen = pr.show_in_kitchen !== false;
      const vs = Array.isArray(pr.variants) ? pr.variants : [];
      const v = variant ? vs.find((x: any) => str(x.name) === variant) : null;
      if (variant && !v) variant = "";
      unitBase = v ? num(v.price) : num(pr.price);
      const exs = Array.isArray(pr.extras) ? pr.extras : [];
      for (const e of (Array.isArray(raw.extras) ? raw.extras : [])) {
        const def = exs.find((x: any) => str(x.name) === str(e.name));
        if (def) extras.push({ name: def.name, price: num(def.price), qty: Math.max(1, parseInt(e.qty) || 1) });
      }
      cost = pr.recipe_name && rmap[pr.recipe_name] && has(ctx, "production") ? rmap[pr.recipe_name].cost : num(pr.cost);
      if (pr.recipe_name && rmap[pr.recipe_name] && !num(pr.cost)) cost = rmap[pr.recipe_name].cost;
      if (taxOn && pr.tax_rate !== null && pr.tax_rate !== undefined) rate = num(pr.tax_rate);
      if (raw.unitPrice !== undefined && raw.unitPrice !== null && raw.unitPrice !== "" && canEditPrice && num(raw.unitPrice) !== unitBase) unitBase = Math.max(0, num(raw.unitPrice));
    } else {
      if (!name) fail("اسم الصنف مطلوب");
      if (!canEditPrice) fail("إضافة صنف بسعر يدوي تتطلب صلاحية إدارة الطلبات");
      unitBase = Math.max(0, num(raw.unitPrice));
      for (const e of (Array.isArray(raw.extras) ? raw.extras : [])) extras.push({ name: str(e.name), price: num(e.price), qty: Math.max(1, parseInt(e.qty) || 1) });
      cost = num(raw.cost, 0);
    }
    const extrasUnit = extras.reduce((s, e) => s + e.price * e.qty, 0);
    const unit = r2(unitBase + extrasUnit);
    lines.push({ lid: str(raw.lid) || uuid().slice(0, 8), productId: pr ? pr.id : null, name, variant, extras, qty, unit, gross: r2(unit * qty), discount: 0,
      category, cost: r2(cost), rate, note: str(raw.note).slice(0, 300), kitchen, sent: !!raw.sent });
  }
  // الخصم: قاعدة محفوظة (id أو كود) أو خصم يدوي
  let rule: any = null, manual: any = null;
  const d = discountIn && typeof discountIn === "object" ? discountIn : {};
  if (d.discountId || d.code) {
    needFeature(ctx, "discounts");
    const today = new Date().toISOString().slice(0, 10);
    const rows = d.discountId
      ? await db`select * from fc_discounts where restaurant_email = ${ctx.email} and id = ${str(d.discountId)}`
      : await db`select * from fc_discounts where restaurant_email = ${ctx.email} and code <> '' and code = ${str(d.code).trim().toUpperCase()}`;
    rule = rows[0];
    if (!rule || !rule.active) fail("العرض غير متاح");
    if (rule.starts_at && isoDate(rule.starts_at)! > today) fail("العرض لم يبدأ بعد");
    if (rule.ends_at && isoDate(rule.ends_at)! < today) fail("انتهت صلاحية العرض");
  } else if (num(d.value) > 0) {
    if (!(ctx.isOwner || can(ctx, "orders_manage") || trusted)) fail("الخصم اليدوي يتطلب صلاحية إدارة الطلبات");
    manual = { kind: d.kind === "amount" ? "amount" : "percent", value: num(d.value) };
  }
  const subtotal = r2(lines.reduce((s, l) => s + l.gross, 0));
  if (rule && rule.min_total > 0 && subtotal < rule.min_total) fail("العرض يتطلب حداً أدنى " + rule.min_total);
  if (rule && rule.applies_to !== "order") {
    const hit = (l: any) => rule.applies_to === "category" ? l.category === rule.target : l.productId === rule.target;
    const tgt = lines.filter(hit), base = tgt.reduce((s, l) => s + l.gross, 0);
    let amt = rule.kind === "percent" ? base * num(rule.value) / 100 : Math.min(num(rule.value), base);
    tgt.forEach((l, i) => { const share = i === tgt.length - 1 ? amt : r2(amt * l.gross / (base || 1)); l.discount = r2(Math.min(share, l.gross)); amt = r2(amt - l.discount); });
  }
  const afterLine = lines.reduce((s, l) => s + (l.gross - l.discount), 0);
  const od = rule && rule.applies_to === "order" ? { kind: rule.kind, value: num(rule.value) } : manual;
  let orderDisc = od ? (od.kind === "percent" ? afterLine * Math.min(100, od.value) / 100 : Math.min(od.value, afterLine)) : 0;
  orderDisc = r2(orderDisc);
  let left = orderDisc;
  lines.forEach((l, i) => {
    const base = l.gross - l.discount;
    const share = i === lines.length - 1 ? left : r2(orderDisc * base / (afterLine || 1));
    left = r2(left - share);
    const taxable = r2(base - share);
    l.orderDiscount = share;
    if (taxOn && l.rate > 0) {
      if (biz.tax.inclusive) { l.tax = r2(taxable * l.rate / (100 + l.rate)); l.net = r2(taxable - l.tax); l.total = taxable; }
      else { l.tax = r2(taxable * l.rate / 100); l.net = taxable; l.total = r2(taxable + l.tax); }
    } else { l.tax = 0; l.net = taxable; l.total = taxable; }
  });
  const totals = {
    subtotal, discount_total: r2(lines.reduce((s, l) => s + l.discount + l.orderDiscount, 0)),
    tax_total: r2(lines.reduce((s, l) => s + l.tax, 0)), total: r2(lines.reduce((s, l) => s + l.total, 0)),
    cost_total: r2(lines.reduce((s, l) => s + l.cost * l.qty, 0)),
  };
  const discountInfo = rule ? { discountId: rule.id, name: rule.name, kind: rule.kind, value: num(rule.value), code: rule.code } : manual ? { manual: true, ...manual } : {};
  return { lines, totals, discountInfo, pmap, rmap };
}

const mapOrder = (o: any) => o && ({ ...o, number: Number(o.number), restaurant_email: undefined });
const mapInv = (i: any) => i && ({ ...i, number: Number(i.number), order_number: i.order_number ? Number(i.order_number) : null, restaurant_email: undefined });

async function currentShift(db: any, ctx: Ctx, branch: string) {
  const r = await db`select * from fc_shifts where restaurant_email = ${ctx.email} and branch_id = ${branch} and staff_id = ${ctx.actorId} and status = 'open' order by opened_at desc limit 1`;
  return r[0] || null;
}

// ---------- حفظ الطلب (تعليق / طاولة / إرسال للمطبخ) ----------
async function writeOrder(tx: any, ctx: Ctx, branch: string, o: P, biz: any, opts: { sendToKitchen?: boolean; trusted?: boolean; source?: string }) {
  let existing: any = null;
  if (o.id) {
    existing = (await tx`select * from fc_orders where id = ${str(o.id)} and restaurant_email = ${ctx.email} for update`)[0];
    if (!existing) fail("الطلب غير موجود");
    if (existing.status !== "open") fail("الطلب مغلق ولا يمكن تعديله");
    if (existing.branch_id !== branch) fail("الطلب يخص فرعاً آخر");
  }
  const items = jsonArr(o.items);
  if (!items.length) fail("الطلب فارغ");
  const prevSent: Record<string, boolean> = {};
  (existing?.items || []).forEach((l: any) => { if (l.sent) prevSent[l.lid] = true; });
  items.forEach((x: any) => { x.sent = !!prevSent[str(x.lid)]; });
  const priced = await priceOrder(tx, ctx, items, o.discount, biz, !!opts.trusted);
  if (!priced.lines.length) fail("الطلب فارغ");
  const orderType = ["dine_in", "takeaway", "delivery"].includes(o.orderType) ? o.orderType : (existing?.order_type || biz.pos.defaultOrderType || "takeaway");
  let tableId: string | null = null, tableName = "";
  if (o.tableId && orderType === "dine_in") {
    needFeature(ctx, "tables");
    const t = (await tx`select * from fc_tables where id = ${str(o.tableId)} and restaurant_email = ${ctx.email} and branch_id = ${branch}`)[0];
    if (!t) fail("الطاولة غير موجودة");
    const busy = await tx`select id, number from fc_orders where restaurant_email = ${ctx.email} and table_id = ${t.id} and status = 'open' and id <> ${existing?.id || ""}`;
    if (busy.length) fail("الطاولة مشغولة بطلب رقم " + busy[0].number);
    tableId = t.id; tableName = t.name;
  }
  let customerId: string | null = null, customerName = str(o.customerName), customerPhone = str(o.customerPhone);
  if (o.customerId) {
    const c = (await tx`select id, name, phone from fc_customers where id = ${str(o.customerId)} and restaurant_email = ${ctx.email}`)[0];
    if (c) { customerId = c.id; customerName = c.name; customerPhone = c.phone; }
  }
  let kitchenStatus = existing?.kitchen_status || "none", kitchenAt = existing?.kitchen_at || null;
  if (opts.sendToKitchen && has(ctx, "kitchen")) {
    const fresh = priced.lines.filter((l) => l.kitchen && !l.sent);
    if (fresh.length) { fresh.forEach((l) => { l.sent = true; l.sentAt = new Date().toISOString(); }); kitchenStatus = "new"; kitchenAt = new Date().toISOString(); }
  }
  const rec: P = {
    order_type: orderType, table_id: tableId, table_name: tableName, customer_id: customerId, customer_name: customerName, customer_phone: customerPhone,
    items: tx.json(priced.lines), subtotal: priced.totals.subtotal, discount_total: priced.totals.discount_total, tax_total: priced.totals.tax_total,
    total: priced.totals.total, cost_total: priced.totals.cost_total, discount_info: tx.json(priced.discountInfo), notes: str(o.notes).slice(0, 1000),
    kitchen_status: kitchenStatus, kitchen_at: kitchenAt, updated_at: new Date().toISOString(),
  };
  let row: any;
  if (existing) {
    row = (await tx`update fc_orders set ${tx(rec)} where id = ${existing.id} returning *`)[0];
  } else {
    const number = await nextNo(tx, ctx.email, "order");
    const sh = await currentShift(tx, ctx, branch);
    Object.assign(rec, { id: uuid(), restaurant_email: ctx.email, branch_id: branch, number, status: "open", source: opts.source || "pos", staff_id: ctx.actorId, staff_name: ctx.actor, shift_id: sh?.id || null });
    row = (await tx`insert into fc_orders ${tx(rec)} returning *`)[0];
  }
  return { row, priced };
}

async function posSaveOrder(ctx: Ctx, p: P) {
  needFeature(ctx, "pos"); needPerm(ctx, "pos");
  const branch = await resolveBranch(ctx, p.branchId);
  const biz = await loadBiz(ctx.email);
  const o = jsonObj(p.order);
  const out = await sql.begin((tx: any) => writeOrder(tx, ctx, branch, o, biz, { sendToKitchen: p.sendToKitchen === true || p.sendToKitchen === "true" }));
  await logAct(ctx, o.id ? "تعديل طلب مفتوح" : "فتح طلب", "رقم " + out.row.number + " · " + out.row.total, branch);
  return { success: true, order: mapOrder(out.row) };
}

// ---------- الفاتورة الإلكترونية ----------
function tlv(tag: number, value: string) {
  const v = new TextEncoder().encode(value);
  const out = new Uint8Array(2 + v.length); out[0] = tag; out[1] = v.length; out.set(v, 2); return out;
}
function zatcaQr(seller: string, vat: string, iso: string, total: number, tax: number) {
  const parts = [tlv(1, seller.slice(0, 120)), tlv(2, vat || "-"), tlv(3, iso), tlv(4, total.toFixed(2)), tlv(5, tax.toFixed(2))];
  const all = new Uint8Array(parts.reduce((s, x) => s + x.length, 0));
  let o = 0; parts.forEach((x) => { all.set(x, o); o += x.length; });
  return encodeBase64(all);
}
async function issueInvoice(tx: any, ctx: Ctx, branch: string, kind: "sale" | "refund", order: any, payments: any[], biz: any, shiftId: string | null) {
  const r = (await tx`select name from fc_restaurants where email = ${ctx.email}`)[0];
  const number = await nextNo(tx, ctx.email, "invoice");
  const prev = (await tx`select hash from fc_invoices where restaurant_email = ${ctx.email} order by number desc limit 1`)[0];
  const issued = new Date();
  const seller = biz.business.legalName || r?.name || "المطعم";
  const qr = zatcaQr(seller, biz.tax.number, issued.toISOString(), num(order.total), num(order.tax_total));
  const prevHash = prev?.hash || "0";
  const hash = await sha256Hex(prevHash + "|" + number + "|" + kind + "|" + issued.toISOString() + "|" + num(order.total).toFixed(2) + "|" + num(order.tax_total).toFixed(2) + "|" + order.id);
  const c = order.customer_id ? (await tx`select tax_no from fc_customers where id = ${order.customer_id}`)[0] : null;
  const rec = {
    id: uuid(), restaurant_email: ctx.email, branch_id: branch, number, kind, order_id: order.id, order_number: order.number,
    customer_id: order.customer_id, customer_name: order.customer_name || "", customer_tax_no: c?.tax_no || "",
    items: tx.json(order.items), subtotal: num(order.subtotal), discount_total: num(order.discount_total), tax_total: num(order.tax_total),
    total: num(order.total), payments: tx.json(payments), qr, hash, prev_hash: prevHash, staff_name: ctx.actor, shift_id: shiftId, issued_at: issued.toISOString(),
  };
  return (await tx`insert into fc_invoices ${tx(rec)} returning *`)[0];
}

// ---------- خصم المخزون للمبيعات ----------
async function stockForLines(tx: any, ctx: Ctx, branch: string, lines: any[], sign: number, refType: string, refId: string, biz: any, reason: string) {
  const ids = [...new Set(lines.map((l) => l.productId).filter(Boolean))];
  if (!ids.length) return;
  const prods = await tx`select id, name, track_stock, recipe_name, cost from fc_products where restaurant_email = ${ctx.email} and id = any(${ids}::text[])`;
  const pmap: Record<string, any> = {}; prods.forEach((x: any) => pmap[x.id] = x);
  const useRecipes = has(ctx, "production");
  const rmap = useRecipes ? await recipeMap(tx, ctx.email, [...new Set(prods.filter((x: any) => !x.track_stock && x.recipe_name).map((x: any) => x.recipe_name))] as string[]) : {};
  const need: Record<string, { type: string; id: string; name: string; qty: number; cost: number }> = {};
  for (const l of lines) {
    const pr = l.productId && pmap[l.productId];
    if (!pr) continue;
    if (pr.track_stock) {
      const k = "product:" + pr.id; need[k] = need[k] || { type: "product", id: pr.id, name: pr.name, qty: 0, cost: num(pr.cost) }; need[k].qty += num(l.qty);
    } else if (useRecipes && pr.recipe_name && rmap[pr.recipe_name]) {
      for (const g of rmap[pr.recipe_name].ings) {
        if (!g.materialId || !g.qty) continue;
        const k = "material:" + g.materialId; need[k] = need[k] || { type: "material", id: g.materialId, name: g.name, qty: 0, cost: g.price }; need[k].qty += g.qty * num(l.qty);
      }
    }
  }
  if (sign < 0 && !biz.pos.allowNegativeStock) {
    const short: string[] = [];
    for (const n of Object.values(need)) { const q = await stockQty(tx, ctx.email, branch, n.type, n.id); if (q < n.qty - 1e-9) short.push(n.name + " (المتوفر " + r2(q) + ")"); }
    if (short.length) fail("المخزون غير كافٍ: " + short.join("، "));
  }
  for (const n of Object.values(need)) await applyMove(tx, ctx.email, branch, n.type, n.id, n.name, sign * r2(n.qty * 1000) / 1000, reason, refType, refId, n.cost, "", ctx.actor);
}

// ---------- الدفع وإغلاق الطلب ----------
const PAY_METHODS: Record<string, string> = { cash: "نقداً", card: "بطاقة", transfer: "تحويل", gift: "بطاقة هدية", points: "نقاط الولاء", credit: "آجل" };
async function posCheckout(ctx: Ctx, p: P) {
  needFeature(ctx, "pos"); needPerm(ctx, "pos");
  const branch = await resolveBranch(ctx, p.branchId);
  const biz = await loadBiz(ctx.email);
  const o = jsonObj(p.order);
  if (p.customerId) o.customerId = p.customerId;
  const result = await sql.begin(async (tx: any) => {
    const sh = await currentShift(tx, ctx, branch);
    if (biz.pos.requireShift && !sh) fail("افتح وردية أولاً قبل تحصيل المبالغ");
    const sendK = has(ctx, "kitchen") && (p.sendToKitchen === undefined ? !!biz.pos.kitchenAuto : (p.sendToKitchen === true || p.sendToKitchen === "true"));
    const { row } = await writeOrder(tx, ctx, branch, o, biz, { sendToKitchen: sendK });
    const total = num(row.total);
    const pays = jsonArr(p.payments).map((x: any) => ({ method: str(x.method), amount: r2(num(x.amount)), ref: str(x.ref || x.code).trim() }))
      .filter((x: any) => x.amount > 0 && PAY_METHODS[x.method]);
    if (!pays.length && total > 0) fail("أدخل طريقة الدفع");
    const nonCash = r2(pays.filter((x) => x.method !== "cash").reduce((s, x) => s + x.amount, 0));
    const cash = r2(pays.filter((x) => x.method === "cash").reduce((s, x) => s + x.amount, 0));
    if (nonCash > total + 0.009) fail("المبالغ غير النقدية أكبر من إجمالي الطلب");
    if (nonCash + cash < total - 0.009) fail("المبلغ المدفوع أقل من الإجمالي (" + total.toFixed(2) + ")");
    const change = r2(nonCash + cash - total);
    const customer = row.customer_id ? (await tx`select * from fc_customers where id = ${row.customer_id} for update`)[0] : null;
    const recorded: any[] = [];
    let pointsUsed = 0;
    for (const x of pays) {
      if (x.method === "gift") {
        needFeature(ctx, "gift_cards");
        const g = (await tx`select * from fc_gift_cards where restaurant_email = ${ctx.email} and upper(code) = ${x.ref.toUpperCase()} for update`)[0];
        if (!g || !g.active) fail("بطاقة الهدية غير صالحة");
        if (g.expires_at && isoDate(g.expires_at)! < new Date().toISOString().slice(0, 10)) fail("بطاقة الهدية منتهية الصلاحية");
        if (num(g.balance) < x.amount - 0.009) fail("رصيد بطاقة الهدية غير كافٍ (" + num(g.balance).toFixed(2) + ")");
        await tx`update fc_gift_cards set balance = balance - ${x.amount} where id = ${g.id}`;
        await tx`insert into fc_gift_moves (restaurant_email, card_id, amount, reason, ref_id) values (${ctx.email}, ${g.id}, ${-x.amount}, 'redeem', ${row.id})`;
        recorded.push({ method: "gift", amount: x.amount, ref: g.code, cardId: g.id });
      } else if (x.method === "points") {
        needFeature(ctx, "loyalty");
        if (!biz.loyalty.enabled) fail("نظام الولاء غير مفعّل");
        if (!customer) fail("اختر العميل لاستبدال النقاط");
        const pv = num(biz.loyalty.pointValue, 0.05) || 0.05;
        const pts = Math.ceil(x.amount / pv - 1e-9);
        if (pts < num(biz.loyalty.minRedeem)) fail("الحد الأدنى للاستبدال " + biz.loyalty.minRedeem + " نقطة");
        if (num(customer.points) < pts) fail("نقاط العميل غير كافية (" + num(customer.points) + ")");
        pointsUsed += pts;
        recorded.push({ method: "points", amount: x.amount, points: pts });
      } else if (x.method === "credit") {
        needFeature(ctx, "ledger");
        if (!customer) fail("اختر العميل للبيع الآجل");
        if (num(customer.credit_limit) > 0 && num(customer.balance) + x.amount > num(customer.credit_limit) + 0.009) fail("تجاوز حد الآجل للعميل (" + num(customer.credit_limit) + ")");
        recorded.push({ method: "credit", amount: x.amount });
      } else if (x.method === "cash") {
        recorded.push({ method: "cash", amount: r2(x.amount - change), tendered: x.amount });
      } else recorded.push({ method: x.method, amount: x.amount, ref: x.ref });
    }
    await stockForLines(tx, ctx, branch, row.items, -1, "order", row.id, biz, "sale");
    const inv = await issueInvoice(tx, ctx, branch, "sale", row, recorded, biz, sh?.id || null);
    const upd = (await tx`update fc_orders set status = 'paid', paid_total = ${r2(nonCash + cash)}, change_due = ${change}, payments = ${JSON.stringify(recorded)}::text::jsonb,
      paid_at = now(), invoice_id = ${inv.id}, shift_id = coalesce(shift_id, ${sh?.id || null}) where id = ${row.id} returning *`)[0];
    if (customer) {
      let earned = 0;
      if (has(ctx, "loyalty") && biz.loyalty.enabled) {
        const base = total - recorded.filter((x) => x.method === "points" || x.method === "gift").reduce((s, x) => s + x.amount, 0);
        earned = Math.max(0, Math.floor(base * num(biz.loyalty.pointsPerUnit, 0)));
      }
      await tx`update fc_customers set total_spent = total_spent + ${total}, visits = visits + 1, last_visit = now(), points = points + ${earned - pointsUsed} where id = ${customer.id}`;
      if (pointsUsed) await tx`insert into fc_points_moves (restaurant_email, customer_id, points, reason, ref_id) values (${ctx.email}, ${customer.id}, ${-pointsUsed}, 'redeem', ${row.id})`;
      if (earned) await tx`insert into fc_points_moves (restaurant_email, customer_id, points, reason, ref_id) values (${ctx.email}, ${customer.id}, ${earned}, 'earn', ${row.id})`;
      const cr = recorded.filter((x) => x.method === "credit").reduce((s, x) => s + x.amount, 0);
      if (cr > 0) {
        await tx`update fc_customers set balance = balance + ${cr} where id = ${customer.id}`;
        await tx`insert into fc_ledger (restaurant_email, customer_id, kind, amount, ref_type, ref_id, note, actor, shift_id) values (${ctx.email}, ${customer.id}, 'debit', ${cr}, 'order', ${row.id}, ${"طلب رقم " + row.number}, ${ctx.actor}, ${sh?.id || null})`;
      }
    }
    return { order: upd, invoice: inv, change };
  });
  await logAct(ctx, "تحصيل طلب", "رقم " + result.order.number + " · " + num(result.order.total).toFixed(2), branch);
  return { success: true, order: mapOrder(result.order), invoice: mapInv(result.invoice), change: result.change };
}

async function posCancelOrder(ctx: Ctx, p: P) {
  needFeature(ctx, "pos"); needPerm(ctx, "pos");
  const o = (await sql`select * from fc_orders where id = ${str(p.id)} and restaurant_email = ${ctx.email}`)[0];
  if (!o) fail("الطلب غير موجود");
  if (o.status !== "open") fail("لا يمكن إلغاء طلب مغلق — استخدم الاسترجاع");
  if ((o.items || []).some((l: any) => l.sent) && !(ctx.isOwner || can(ctx, "orders_manage"))) fail("الطلب أُرسل للمطبخ — الإلغاء يتطلب صلاحية إدارة الطلبات");
  if (ctx.staff?.branchId && o.branch_id !== ctx.staff.branchId) fail("الطلب يخص فرعاً آخر");
  await sql`update fc_orders set status = 'cancelled', kitchen_status = case when kitchen_status in ('new','preparing') then 'served' else kitchen_status end, notes = ${(o.notes ? o.notes + " | " : "") + "إلغاء: " + str(p.reason)}, updated_at = now() where id = ${o.id}`;
  await logAct(ctx, "إلغاء طلب", "رقم " + o.number + (p.reason ? " — " + str(p.reason) : ""), o.branch_id);
  return { success: true };
}

async function posRefund(ctx: Ctx, p: P) {
  needFeature(ctx, "pos"); needPerm(ctx, "orders_manage");
  const biz = await loadBiz(ctx.email);
  const res = await sql.begin(async (tx: any) => {
    const o = (await tx`select * from fc_orders where id = ${str(p.id)} and restaurant_email = ${ctx.email} for update`)[0];
    if (!o) fail("الطلب غير موجود");
    if (o.status !== "paid") fail("يمكن استرجاع الطلبات المدفوعة فقط");
    if (ctx.staff?.branchId && o.branch_id !== ctx.staff.branchId) fail("الطلب يخص فرعاً آخر");
    const sh = await currentShift(tx, ctx, o.branch_id);
    await stockForLines(tx, ctx, o.branch_id, o.items, +1, "refund", o.id, { ...biz, pos: { ...biz.pos, allowNegativeStock: true } }, "refund");
    const pays = Array.isArray(o.payments) ? o.payments : [];
    for (const x of pays) {
      if (x.method === "gift" && x.cardId) {
        await tx`update fc_gift_cards set balance = balance + ${num(x.amount)} where id = ${x.cardId}`;
        await tx`insert into fc_gift_moves (restaurant_email, card_id, amount, reason, ref_id) values (${ctx.email}, ${x.cardId}, ${num(x.amount)}, 'refund', ${o.id})`;
      }
    }
    if (o.customer_id) {
      const pm = await tx`select coalesce(sum(points),0)::float8 as pts from fc_points_moves where restaurant_email = ${ctx.email} and customer_id = ${o.customer_id} and ref_id = ${o.id}`;
      const net = num(pm[0].pts);
      if (net) await tx`insert into fc_points_moves (restaurant_email, customer_id, points, reason, ref_id) values (${ctx.email}, ${o.customer_id}, ${-net}, 'refund', ${o.id})`;
      const cr = pays.filter((x: any) => x.method === "credit").reduce((s: number, x: any) => s + num(x.amount), 0);
      await tx`update fc_customers set total_spent = greatest(0, total_spent - ${num(o.total)}), points = greatest(0, points - ${net}), balance = balance - ${cr} where id = ${o.customer_id}`;
      if (cr > 0) await tx`insert into fc_ledger (restaurant_email, customer_id, kind, amount, ref_type, ref_id, note, actor, shift_id) values (${ctx.email}, ${o.customer_id}, 'credit', ${cr}, 'refund', ${o.id}, ${"استرجاع طلب رقم " + o.number}, ${ctx.actor}, ${sh?.id || null})`;
    }
    const inv = await issueInvoice(tx, ctx, o.branch_id, "refund", o, pays.filter((x: any) => x.method !== "credit" || true), biz, sh?.id || null);
    const upd = (await tx`update fc_orders set status = 'refunded', notes = ${(o.notes ? o.notes + " | " : "") + "استرجاع: " + str(p.reason)}, updated_at = now() where id = ${o.id} returning *`)[0];
    return { order: upd, invoice: inv };
  });
  await logAct(ctx, "استرجاع طلب", "رقم " + res.order.number + " · " + num(res.order.total).toFixed(2) + (p.reason ? " — " + str(p.reason) : ""), res.order.branch_id);
  return { success: true, order: mapOrder(res.order), invoice: mapInv(res.invoice) };
}

async function getOrders(ctx: Ctx, p: P) {
  needFeature(ctx, "pos"); needPerm(ctx, "pos", "orders_manage", "finance", "reports");
  const b = await resolveBranchOrAll(ctx, p.branchId);
  const { from, to } = rangeOf(p, 7);
  const st = str(p.status), q = str(p.q).trim();
  const rows = await sql`select * from fc_orders where restaurant_email = ${ctx.email}
    ${b ? sql`and branch_id = ${b}` : sql``}
    ${st === "open" ? sql`` : sql`and created_at >= ${from.toISOString()}::timestamptz and created_at < ${to.toISOString()}::timestamptz`}
    ${st ? sql`and status = ${st}` : sql``}
    ${q ? (/^\d+$/.test(q) ? sql`and number = ${parseInt(q)}` : sql`and (customer_name ilike ${"%" + q + "%"} or customer_phone ilike ${"%" + q + "%"} or table_name ilike ${"%" + q + "%"})`) : sql``}
    order by created_at desc limit 1000`;
  return { success: true, orders: rows.map(mapOrder) };
}
async function getOrder(ctx: Ctx, p: P) {
  needFeature(ctx, "pos"); needPerm(ctx, "pos", "orders_manage", "finance", "reports", "kitchen");
  const o = (await sql`select * from fc_orders where id = ${str(p.id)} and restaurant_email = ${ctx.email}`)[0];
  if (!o) fail("الطلب غير موجود");
  const invs = await sql`select * from fc_invoices where restaurant_email = ${ctx.email} and order_id = ${o.id} order by number`;
  return { success: true, order: mapOrder(o), invoices: invs.map(mapInv) };
}

// تحويل طلب المينيو الإلكتروني (QR) إلى طلب في نقطة البيع
async function importMenuOrder(ctx: Ctx, p: P) {
  needFeature(ctx, "online_orders"); needPerm(ctx, "pos");
  const branch = await resolveBranch(ctx, p.branchId);
  const biz = await loadBiz(ctx.email);
  const mo = (await sql`select * from fc_menu_orders where restaurant_email = ${ctx.email} and id = ${str(p.menuOrderId)}`)[0];
  if (!mo) fail("طلب المينيو غير موجود");
  if (mo.status !== "new") fail("تم التعامل مع هذا الطلب مسبقاً");
  const prods = await sql`select id, name, variants, extras from fc_products where restaurant_email = ${ctx.email} and active = true`;
  const byName: Record<string, any> = {}; prods.forEach((x: any) => byName[str(x.name).trim()] = x);
  const items = (Array.isArray(mo.items) ? mo.items : []).map((it: any) => {
    const pr = byName[str(it.name).trim()];
    const ex = (Array.isArray(it.extras) ? it.extras : []).map((e: any) => ({ name: e.name, qty: e.qty || 1, price: num(e.price) }));
    if (pr) return { productId: pr.id, variant: str(it.size), extras: ex, qty: num(it.qty, 1) || 1, note: str(it.note) };
    return { name: str(it.name) + (it.size ? " (" + it.size + ")" : ""), unitPrice: num(it.price), extras: [], qty: num(it.qty, 1) || 1 };
  });
  let tableId: string | null = null;
  if (mo.table_number) {
    const t = (await sql`select id from fc_tables where restaurant_email = ${ctx.email} and branch_id = ${branch} and active = true and name = ${str(mo.table_number)} limit 1`)[0];
    if (t) {
      const busy = await sql`select 1 from fc_orders where table_id = ${t.id} and status = 'open'`;
      if (!busy.length) tableId = t.id;
    }
  }
  const o = { orderType: tableId ? "dine_in" : "takeaway", tableId, items, customerName: mo.customer_name, customerPhone: mo.customer_phone, notes: [mo.table_number ? "طاولة " + mo.table_number : "", mo.notes].filter(Boolean).join(" — ") };
  const out = await sql.begin(async (tx: any) => {
    const r = await writeOrder(tx, ctx, branch, o, biz, { trusted: true, source: "menu", sendToKitchen: has(ctx, "kitchen") && !!biz.pos.kitchenAuto });
    await tx`update fc_menu_orders set status = 'accepted' where restaurant_email = ${ctx.email} and id = ${mo.id}`;
    return r;
  });
  await logAct(ctx, "قبول طلب من المينيو", "طلب رقم " + out.row.number, branch);
  return { success: true, order: mapOrder(out.row) };
}

// ---------- نقطة البيع: تحميل أولي ----------
async function posBootstrap(ctx: Ctx, p: P) {
  needFeature(ctx, "pos"); needPerm(ctx, "pos", "tables");
  const branch = await resolveBranch(ctx, p.branchId);
  const biz = await loadBiz(ctx.email);
  const r = await getRestaurant(ctx.email);
  const products = await sql`select id, name, category, kind, sku, barcode, unit, price, tax_rate, variants, extras, track_stock, image_url, color, sort, show_in_kitchen
    from fc_products where restaurant_email = ${ctx.email} and active = true order by sort, name`;
  const stock = await sql`select item_id, qty from fc_stock where restaurant_email = ${ctx.email} and branch_id = ${branch} and item_type = 'product'`;
  const smap: Record<string, number> = {}; stock.forEach((s: any) => smap[s.item_id] = num(s.qty));
  const tables = has(ctx, "tables") ? await sql`select id, name, area, seats from fc_tables where restaurant_email = ${ctx.email} and branch_id = ${branch} and active = true order by area, sort, name` : [];
  const today = new Date().toISOString().slice(0, 10);
  const discounts = has(ctx, "discounts") ? await sql`select id, name, kind, value, applies_to, target, code, min_total from fc_discounts where restaurant_email = ${ctx.email} and active = true
    and (starts_at is null or starts_at <= ${today}::date) and (ends_at is null or ends_at >= ${today}::date) order by name` : [];
  const open = await sql`select * from fc_orders where restaurant_email = ${ctx.email} and branch_id = ${branch} and status = 'open' order by created_at`;
  const menuNew = has(ctx, "online_orders") ? (await sql`select count(*)::int as n from fc_menu_orders where restaurant_email = ${ctx.email} and status = 'new'`)[0].n : 0;
  const sh = await currentShift(sql, ctx, branch);
  const br = (await sql`select id, name, address, phone from fc_branches where id = ${branch}`)[0];
  return {
    success: true, branch: br, restaurantName: r?.name || "المطعم", currency: r?.currency || "ر.س",
    products: products.map((x: any) => ({ ...x, stock: x.track_stock ? (smap[x.id] || 0) : null })),
    categories: [...new Set(products.map((x: any) => x.category || "عام"))],
    tables, discounts, openOrders: open.map(mapOrder), menuOrdersNew: menuNew, shift: sh,
    settings: { tax: biz.tax, receipt: biz.receipt, loyalty: biz.loyalty, pos: biz.pos, business: biz.business },
    canManage: ctx.isOwner || can(ctx, "orders_manage"),
  };
}

// ---------- شاشة المطبخ ----------
async function kitchenList(ctx: Ctx, p: P) {
  needFeature(ctx, "kitchen"); needPerm(ctx, "kitchen", "pos");
  const branch = await resolveBranch(ctx, p.branchId);
  const rows = await sql`select id, number, order_type, table_name, customer_name, kitchen_status, kitchen_at, ready_at, notes, items, status, source, created_at
    from fc_orders where restaurant_email = ${ctx.email} and branch_id = ${branch} and kitchen_status in ('new','preparing','ready')
    and status in ('open','paid') and created_at > now() - interval '36 hours' order by kitchen_at nulls last, created_at`;
  const br = (await sql`select name from fc_branches where id = ${branch}`)[0];
  return { success: true, branchName: br?.name || "", serverTime: new Date().toISOString(), orders: rows.map((o: any) => ({ ...mapOrder(o), items: (o.items || []).filter((l: any) => l.kitchen !== false && l.sent) })) };
}
async function kitchenBump(ctx: Ctx, p: P) {
  needFeature(ctx, "kitchen"); needPerm(ctx, "kitchen", "pos");
  const st = str(p.status);
  if (!["new", "preparing", "ready", "served"].includes(st)) fail("حالة غير صالحة");
  const r = await sql`update fc_orders set kitchen_status = ${st}, ready_at = ${st === "ready" ? new Date().toISOString() : null}, updated_at = now()
    where id = ${str(p.id)} and restaurant_email = ${ctx.email} ${ctx.staff?.branchId ? sql`and branch_id = ${ctx.staff.branchId}` : sql``} returning number`;
  if (!r.length) fail("الطلب غير موجود");
  return { success: true };
}
async function resolvePublic(p: P) {
  const id = lower(p.r || p.publicId), em = lower(p.restaurantEmail || p.email);
  const r = id ? await sql`select * from fc_restaurants where public_id = ${id}` : em ? await sql`select * from fc_restaurants where email = ${em}` : [];
  if (!r.length) fail("المطعم غير موجود");
  const u = await getUserRow(r[0].email);
  const plan = planOf(u?.plan);
  const active = !!u && !u.frozen && new Date(u.expiry_date) > new Date();
  return { r: r[0], email: r[0].email as string, plan, active, features: new Set(plan.features) };
}
async function getOrderBoard(p: P) {
  const pub = await resolvePublic(p);
  if (!pub.active || !pub.features.has("order_board")) return { success: false, error: "شاشة حالة الطلبات متاحة في الباقة المتقدمة" };
  let branch = str(p.b || p.branchId);
  if (!branch) branch = (await ensureMainBranch(pub.email)).id;
  const rows = await sql`select number, kitchen_status, ready_at, customer_name from fc_orders where restaurant_email = ${pub.email} and branch_id = ${branch}
    and created_at > now() - interval '12 hours' and status in ('open','paid')
    and (kitchen_status in ('new','preparing') or (kitchen_status = 'ready' and ready_at > now() - interval '20 minutes')) order by number`;
  const biz = mergeBiz(pub.r.biz_settings || {});
  return {
    success: true, name: biz.app.name || pub.r.name, color: biz.app.color, logo: biz.app.icon || biz.business.logo,
    preparing: rows.filter((x: any) => x.kitchen_status !== "ready").map((x: any) => Number(x.number)),
    ready: rows.filter((x: any) => x.kitchen_status === "ready").map((x: any) => Number(x.number)),
  };
}
async function publicOrderStatus(p: P) {
  const pub = await resolvePublic(p);
  if (!pub.active || !pub.features.has("order_board")) return { success: false, error: "غير متاح" };
  const n = parseInt(p.number);
  if (!n) return { success: false, error: "أدخل رقم الطلب" };
  const o = (await sql`select number, kitchen_status, status, created_at, order_type from fc_orders where restaurant_email = ${pub.email} and number = ${n} and created_at > now() - interval '24 hours'`)[0];
  if (!o) return { success: false, error: "لم يتم العثور على الطلب" };
  return { success: true, number: Number(o.number), kitchenStatus: o.kitchen_status, status: o.status, createdAt: o.created_at };
}

// ---------- الورديات ----------
async function shiftCurrent(ctx: Ctx, p: P) {
  needFeature(ctx, "shifts"); needPerm(ctx, "pos", "team", "finance");
  const branch = await resolveBranch(ctx, p.branchId);
  const sh = await currentShift(sql, ctx, branch);
  return { success: true, shift: sh, live: sh ? await shiftSummary(sh) : null };
}
async function shiftSummary(sh: any) {
  const inv = await sql`select kind, payments, total from fc_invoices where shift_id = ${sh.id}`;
  const by: Record<string, number> = {};
  let sales = 0, refunds = 0, count = 0;
  inv.forEach((i: any) => {
    const sg = i.kind === "refund" ? -1 : 1;
    if (sg > 0) { sales += num(i.total); count++; } else refunds += num(i.total);
    (i.payments || []).forEach((x: any) => { by[x.method] = r2((by[x.method] || 0) + sg * num(x.amount)); });
  });
  const exp = (await sql`select coalesce(sum(amount),0)::float8 as s from fc_expenses where shift_id = ${sh.id} and method = 'cash'`)[0].s;
  const led = (await sql`select coalesce(sum(amount),0)::float8 as s from fc_ledger where shift_id = ${sh.id} and kind = 'credit' and method = 'cash'`)[0].s;
  const expected = r2(num(sh.opening_cash) + (by.cash || 0) + num(sh.cash_in) - num(sh.cash_out) - num(exp) + num(led));
  return { salesCount: count, sales: r2(sales), refunds: r2(refunds), byMethod: by, cashExpenses: r2(num(exp)), creditCollections: r2(num(led)), expectedCash: expected };
}
async function shiftOpen(ctx: Ctx, p: P) {
  needFeature(ctx, "shifts"); needPerm(ctx, "pos");
  const branch = await resolveBranch(ctx, p.branchId);
  if (await currentShift(sql, ctx, branch)) fail("لديك وردية مفتوحة بالفعل");
  const sh = (await sql`insert into fc_shifts (restaurant_email, branch_id, staff_id, staff_name, opening_cash, notes) values (${ctx.email}, ${branch}, ${ctx.actorId}, ${ctx.actor}, ${num(p.openingCash)}, ${str(p.notes)}) returning *`)[0];
  await logAct(ctx, "فتح وردية", "رصيد افتتاحي " + num(p.openingCash), branch);
  return { success: true, shift: sh };
}
async function shiftCashMove(ctx: Ctx, p: P) {
  needFeature(ctx, "shifts"); needPerm(ctx, "pos");
  const branch = await resolveBranch(ctx, p.branchId);
  const sh = await currentShift(sql, ctx, branch);
  if (!sh) fail("لا توجد وردية مفتوحة");
  const a = num(p.amount); if (!(a > 0)) fail("المبلغ غير صالح");
  const out = p.kind === "out";
  await sql`update fc_shifts set cash_in = cash_in + ${out ? 0 : a}, cash_out = cash_out + ${out ? a : 0}, notes = ${(sh.notes ? sh.notes + "\n" : "") + (out ? "سحب " : "إيداع ") + a + (p.note ? " — " + str(p.note) : "")} where id = ${sh.id}`;
  await logAct(ctx, out ? "سحب نقدية من الدرج" : "إيداع نقدية في الدرج", a + (p.note ? " — " + str(p.note) : ""), branch);
  return { success: true };
}
async function shiftClose(ctx: Ctx, p: P) {
  needFeature(ctx, "shifts"); needPerm(ctx, "pos", "team");
  let sh: any;
  if (p.id && (ctx.isOwner || can(ctx, "team"))) sh = (await sql`select * from fc_shifts where id = ${str(p.id)} and restaurant_email = ${ctx.email} and status = 'open'`)[0];
  else sh = await currentShift(sql, ctx, await resolveBranch(ctx, p.branchId));
  if (!sh) fail("لا توجد وردية مفتوحة");
  const s = await shiftSummary(sh);
  const closing = num(p.closingCash);
  const summary = { ...s, closingCash: closing, difference: r2(closing - s.expectedCash) };
  const row = (await sql`update fc_shifts set status = 'closed', closed_at = now(), closing_cash = ${closing}, expected_cash = ${s.expectedCash}, summary = ${JSON.stringify(summary)}::text::jsonb,
    notes = ${(sh.notes ? sh.notes + "\n" : "") + str(p.notes)} where id = ${sh.id} returning *`)[0];
  await logAct(ctx, "إغلاق وردية", sh.staff_name + " · المتوقع " + s.expectedCash + " · الفعلي " + closing + " · الفرق " + summary.difference, sh.branch_id);
  return { success: true, shift: row, summary };
}

// ---------- المخزون ----------
async function stockList(ctx: Ctx, p: P) {
  needFeature(ctx, "inventory"); needPerm(ctx, "inventory", "purchasing");
  const branch = await resolveBranch(ctx, p.branchId);
  const st = await sql`select item_type, item_id, qty, min_qty from fc_stock where restaurant_email = ${ctx.email} and branch_id = ${branch}`;
  const smap: Record<string, any> = {}; st.forEach((s: any) => smap[s.item_type + ":" + s.item_id] = s);
  const prods = await sql`select id, name, category, unit, cost, track_stock, kind, recipe_name from fc_products where restaurant_email = ${ctx.email} and (track_stock = true or kind = 'semi') order by name`;
  const mats = await sql`select id, name, unit, price from fc_materials where restaurant_email = ${ctx.email} order by pos`;
  const items = [
    ...mats.map((m: any) => { const s = smap["material:" + m.id]; return { itemType: "material", itemId: m.id, name: m.name, category: "مواد أولية", unit: m.unit, cost: num(m.price), qty: s ? num(s.qty) : 0, minQty: s ? num(s.min_qty) : 0 }; }),
    ...prods.map((x: any) => { const s = smap["product:" + x.id]; return { itemType: "product", itemId: x.id, name: x.name, category: x.category, unit: x.unit, cost: num(x.cost), qty: s ? num(s.qty) : 0, minQty: s ? num(s.min_qty) : 0, recipe: x.recipe_name }; }),
  ].map((i) => ({ ...i, value: r2(i.qty * i.cost), low: i.minQty > 0 && i.qty <= i.minQty }));
  return { success: true, branchId: branch, items, totalValue: r2(items.reduce((s, i) => s + Math.max(0, i.value), 0)), lowCount: items.filter((i) => i.low).length };
}
async function stockAdjust(ctx: Ctx, p: P) {
  needFeature(ctx, "inventory"); needPerm(ctx, "inventory");
  const branch = await resolveBranch(ctx, p.branchId);
  const type = p.itemType === "material" ? "material" : "product";
  const reason = ["adjust", "waste", "opening"].includes(p.reason) ? p.reason : "adjust";
  const info = await itemInfo(sql, ctx.email, type, str(p.itemId));
  const q = num(p.qty);
  await sql.begin(async (tx: any) => {
    let delta = q;
    if (p.mode === "set") delta = q - await stockQty(tx, ctx.email, branch, type, info.id);
    else if (p.mode === "remove" || reason === "waste") delta = -Math.abs(q);
    if (type === "product" && !info.track) await tx`update fc_products set track_stock = true where id = ${info.id}`;
    await applyMove(tx, ctx.email, branch, type, info.id, info.name, delta, reason, "manual", "", info.cost, str(p.note), ctx.actor);
  });
  await logAct(ctx, reason === "waste" ? "تسجيل هدر" : reason === "opening" ? "رصيد افتتاحي" : "تسوية مخزون", info.name + " · " + q + " " + info.unit + (p.note ? " — " + str(p.note) : ""), branch);
  return { success: true };
}
async function stockCount(ctx: Ctx, p: P) {
  needFeature(ctx, "inventory"); needPerm(ctx, "inventory");
  const branch = await resolveBranch(ctx, p.branchId);
  const counts = jsonArr(p.counts);
  if (!counts.length) fail("لا توجد كميات للجرد");
  const ref = "count-" + Date.now();
  let changed = 0, diffValue = 0;
  await sql.begin(async (tx: any) => {
    for (const c of counts) {
      if (c.counted === "" || c.counted === null || c.counted === undefined) continue;
      const type = c.itemType === "material" ? "material" : "product";
      const info = await itemInfo(tx, ctx.email, type, str(c.itemId));
      const cur = await stockQty(tx, ctx.email, branch, type, info.id);
      const delta = r2((num(c.counted) - cur) * 1000) / 1000;
      if (Math.abs(delta) < 1e-9) continue;
      await applyMove(tx, ctx.email, branch, type, info.id, info.name, delta, "count", "count", ref, info.cost, str(p.note), ctx.actor);
      changed++; diffValue += delta * info.cost;
    }
  });
  await logAct(ctx, "جرد مخزون", changed + " صنف معدّل · فرق القيمة " + r2(diffValue), branch);
  return { success: true, changed, diffValue: r2(diffValue) };
}
async function stockSetMin(ctx: Ctx, p: P) {
  needFeature(ctx, "inventory"); needPerm(ctx, "inventory");
  const branch = await resolveBranch(ctx, p.branchId);
  const type = p.itemType === "material" ? "material" : "product";
  await sql`insert into fc_stock (restaurant_email, branch_id, item_type, item_id, qty, min_qty) values (${ctx.email}, ${branch}, ${type}, ${str(p.itemId)}, 0, ${num(p.minQty)})
    on conflict (restaurant_email, branch_id, item_type, item_id) do update set min_qty = ${num(p.minQty)}`;
  return { success: true };
}
async function stockMoves(ctx: Ctx, p: P) {
  needFeature(ctx, "inventory"); needPerm(ctx, "inventory", "purchasing", "reports");
  const branch = await resolveBranchOrAll(ctx, p.branchId);
  const { from, to } = rangeOf(p, 30);
  const rows = await sql`select * from fc_stock_moves where restaurant_email = ${ctx.email} ${branch ? sql`and branch_id = ${branch}` : sql``}
    and created_at >= ${from.toISOString()}::timestamptz and created_at < ${to.toISOString()}::timestamptz
    ${p.reason ? sql`and reason = ${str(p.reason)}` : sql``} ${p.itemId ? sql`and item_id = ${str(p.itemId)}` : sql``}
    order by created_at desc, id desc limit 2000`;
  return { success: true, moves: rows.map((m: any) => ({ ...m, id: Number(m.id), value: r2(num(m.qty) * num(m.unit_cost)) })) };
}

// ---------- المشتريات والمورّدون ----------
async function purchasePost(ctx: Ctx, p: P) {
  needFeature(ctx, "purchasing"); needPerm(ctx, "purchasing");
  const branch = await resolveBranch(ctx, p.branchId);
  const d = jsonObj(p.purchase);
  const items = jsonArr(d.items).filter((x: any) => num(x.qty) > 0);
  if (!items.length) fail("أضف أصنافاً لفاتورة الشراء");
  const updateCosts = d.updateCosts !== false && d.updateCosts !== "false";
  const res = await sql.begin(async (tx: any) => {
    let sup: any = null;
    if (d.supplierId) { sup = (await tx`select * from fc_suppliers where id = ${str(d.supplierId)} and restaurant_email = ${ctx.email} for update`)[0]; if (!sup) fail("المورّد غير موجود"); }
    const lines: any[] = [];
    for (const x of items) {
      const type = x.itemType === "material" ? "material" : "product";
      const info = await itemInfo(tx, ctx.email, type, str(x.itemId));
      const qty = num(x.qty), uc = Math.max(0, num(x.unitCost));
      lines.push({ itemType: type, itemId: info.id, name: info.name, unit: info.unit, qty, unitCost: uc, total: r2(qty * uc) });
    }
    const subtotal = r2(lines.reduce((s, l) => s + l.total, 0));
    const tax = r2(Math.max(0, num(d.tax)));
    const total = r2(subtotal + tax);
    const paid = r2(Math.min(total, Math.max(0, num(d.paid))));
    const number = await nextNo(tx, ctx.email, "purchase");
    const row = (await tx`insert into fc_purchases (id, restaurant_email, branch_id, number, supplier_id, supplier_name, ref_no, items, subtotal, tax, total, paid, update_costs, purchased_at, notes, created_by)
      values (${uuid()}, ${ctx.email}, ${branch}, ${number}, ${sup?.id || null}, ${sup?.name || str(d.supplierName)}, ${str(d.refNo)}, ${JSON.stringify(lines)}::text::jsonb, ${subtotal}, ${tax}, ${total}, ${paid}, ${updateCosts},
      ${isoDate(d.date) || new Date().toISOString().slice(0, 10)}::date, ${str(d.notes)}, ${ctx.actor}) returning *`)[0];
    for (const l of lines) {
      await applyMove(tx, ctx.email, branch, l.itemType, l.itemId, l.name, l.qty, "purchase", "purchase", row.id, l.unitCost, "فاتورة شراء " + number, ctx.actor);
      if (updateCosts && l.unitCost > 0) {
        if (l.itemType === "material") {
          const m = (await tx`select * from fc_materials where restaurant_email = ${ctx.email} and id = ${l.itemId}`)[0];
          const pq = num(m.purchase_qty, 1) || 1, newPP = r2(l.unitCost * pq * 10000) / 10000;
          const eff = computeEffectivePrice(newPP, pq, m.waste_percent);
          if (Math.abs(num(m.price) - eff) > 0.001) {
            await tx`insert into fc_price_history (restaurant_email, material_id, material_name, old_price, new_price, change_percent) values (${ctx.email}, ${m.id}, ${m.name}, ${num(m.price)}, ${eff}, ${num(m.price) > 0 ? r2((eff - num(m.price)) / num(m.price) * 100) : 0})`;
            await tx`update fc_materials set purchase_price = ${newPP}, price = ${eff} where restaurant_email = ${ctx.email} and id = ${m.id}`;
          }
        } else await tx`update fc_products set cost = ${l.unitCost}, updated_at = now() where id = ${l.itemId} and (recipe_name = '' or recipe_name is null)`;
      }
    }
    if (updateCosts && lines.some((l) => l.itemType === "material")) await recalc(ctx.email, tx);
    if (sup) await tx`update fc_suppliers set balance = balance + ${r2(total - paid)} where id = ${sup.id}`;
    return row;
  });
  await logAct(ctx, "فاتورة شراء", "رقم " + res.number + " · " + (res.supplier_name || "") + " · " + num(res.total).toFixed(2), branch);
  return { success: true, purchase: { ...res, number: Number(res.number) } };
}
async function purchaseCancel(ctx: Ctx, p: P) {
  needFeature(ctx, "purchasing"); needPerm(ctx, "purchasing");
  await sql.begin(async (tx: any) => {
    const pu = (await tx`select * from fc_purchases where id = ${str(p.id)} and restaurant_email = ${ctx.email} for update`)[0];
    if (!pu) fail("الفاتورة غير موجودة");
    if (pu.status !== "posted") fail("الفاتورة ملغاة مسبقاً");
    for (const l of pu.items || []) await applyMove(tx, ctx.email, pu.branch_id, l.itemType, l.itemId, l.name, -num(l.qty), "purchase", "purchase_cancel", pu.id, num(l.unitCost), "إلغاء فاتورة شراء " + pu.number, ctx.actor);
    if (pu.supplier_id) await tx`update fc_suppliers set balance = balance - ${r2(num(pu.total) - num(pu.paid))} where id = ${pu.supplier_id}`;
    await tx`update fc_purchases set status = 'cancelled' where id = ${pu.id}`;
  });
  await logAct(ctx, "إلغاء فاتورة شراء", str(p.id));
  return { success: true };
}
async function supplierPay(ctx: Ctx, p: P) {
  needFeature(ctx, "purchasing"); needPerm(ctx, "purchasing", "finance");
  const a = num(p.amount); if (!(a > 0)) fail("المبلغ غير صالح");
  const s = (await sql`update fc_suppliers set balance = balance - ${a} where id = ${str(p.supplierId)} and restaurant_email = ${ctx.email} returning *`)[0];
  if (!s) fail("المورّد غير موجود");
  await sql`insert into fc_supplier_payments (restaurant_email, supplier_id, amount, method, note) values (${ctx.email}, ${s.id}, ${a}, ${str(p.method) || "cash"}, ${str(p.note)})`;
  await logAct(ctx, "سداد لمورّد", s.name + " · " + a);
  return { success: true, balance: num(s.balance) };
}
async function supplierStatement(ctx: Ctx, p: P) {
  needFeature(ctx, "purchasing"); needPerm(ctx, "purchasing", "finance");
  const s = (await sql`select * from fc_suppliers where id = ${str(p.supplierId)} and restaurant_email = ${ctx.email}`)[0];
  if (!s) fail("المورّد غير موجود");
  const pur = await sql`select id, number, purchased_at, total, paid, status, ref_no from fc_purchases where supplier_id = ${s.id} order by purchased_at desc, number desc limit 300`;
  const pay = await sql`select * from fc_supplier_payments where supplier_id = ${s.id} order by created_at desc limit 300`;
  return { success: true, supplier: s, purchases: pur.map((x: any) => ({ ...x, number: Number(x.number) })), payments: pay.map((x: any) => ({ ...x, id: Number(x.id) })) };
}

// ---------- تحويلات المخزون بين الفروع ----------
async function transferCreate(ctx: Ctx, p: P) {
  needFeature(ctx, "transfers"); needPerm(ctx, "inventory");
  const from = await resolveBranch(ctx, p.fromBranch);
  const to = str(p.toBranch);
  const ok = (await sql`select id, name from fc_branches where id = ${to} and restaurant_email = ${ctx.email} and active = true`)[0];
  if (!ok) fail("فرع الاستلام غير صالح");
  if (to === from) fail("اختر فرعاً مختلفاً للاستلام");
  const items = jsonArr(p.items).filter((x: any) => num(x.qty) > 0);
  if (!items.length) fail("أضف أصنافاً للتحويل");
  const row = await sql.begin(async (tx: any) => {
    const lines: any[] = [];
    for (const x of items) {
      const type = x.itemType === "material" ? "material" : "product";
      const info = await itemInfo(tx, ctx.email, type, str(x.itemId));
      lines.push({ itemType: type, itemId: info.id, name: info.name, unit: info.unit, qty: num(x.qty), unitCost: info.cost });
    }
    const number = await nextNo(tx, ctx.email, "transfer");
    const t = (await tx`insert into fc_transfers (id, restaurant_email, number, from_branch, to_branch, items, notes, created_by) values (${uuid()}, ${ctx.email}, ${number}, ${from}, ${to}, ${JSON.stringify(lines)}::text::jsonb, ${str(p.notes)}, ${ctx.actor}) returning *`)[0];
    for (const l of lines) await applyMove(tx, ctx.email, from, l.itemType, l.itemId, l.name, -l.qty, "transfer_out", "transfer", t.id, l.unitCost, "تحويل " + number + " إلى " + ok.name, ctx.actor);
    return t;
  });
  await logAct(ctx, "تحويل مخزون", "رقم " + row.number + " إلى " + ok.name, from);
  return { success: true, transfer: { ...row, number: Number(row.number) } };
}
async function transferReceive(ctx: Ctx, p: P) {
  needFeature(ctx, "transfers"); needPerm(ctx, "inventory");
  const cancel = p.cancel === true || p.cancel === "true";
  const row = await sql.begin(async (tx: any) => {
    const t = (await tx`select * from fc_transfers where id = ${str(p.id)} and restaurant_email = ${ctx.email} for update`)[0];
    if (!t) fail("التحويل غير موجود");
    if (t.status !== "sent") fail("تمت معالجة التحويل مسبقاً");
    if (ctx.staff?.branchId && ctx.staff.branchId !== (cancel ? t.from_branch : t.to_branch)) fail("لا تملك صلاحية على هذا الفرع");
    const target = cancel ? t.from_branch : t.to_branch;
    for (const l of t.items || []) await applyMove(tx, ctx.email, target, l.itemType, l.itemId, l.name, num(l.qty), cancel ? "transfer_out" : "transfer_in", "transfer", t.id, num(l.unitCost), (cancel ? "إلغاء تحويل " : "استلام تحويل ") + t.number, ctx.actor);
    return (await tx`update fc_transfers set status = ${cancel ? "cancelled" : "received"}, received_at = now() where id = ${t.id} returning *`)[0];
  });
  await logAct(ctx, cancel ? "إلغاء تحويل" : "استلام تحويل", "رقم " + row.number);
  return { success: true };
}

// ---------- أوامر الإنتاج ----------
async function productionCreate(ctx: Ctx, p: P) {
  needFeature(ctx, "production"); needPerm(ctx, "inventory");
  const branch = await resolveBranch(ctx, p.branchId);
  const biz = await loadBiz(ctx.email);
  const qty = num(p.qty); if (!(qty > 0)) fail("الكمية غير صالحة");
  const pr = (await sql`select * from fc_products where id = ${str(p.productId)} and restaurant_email = ${ctx.email}`)[0];
  if (!pr) fail("المنتج غير موجود");
  if (!pr.recipe_name) fail("اربط المنتج بوصفة (من شاشة الأطباق) قبل الإنتاج");
  const res = await sql.begin(async (tx: any) => {
    const rm = (await recipeMap(tx, ctx.email, [pr.recipe_name]))[pr.recipe_name];
    if (!rm || !rm.ings.length) fail("الوصفة لا تحتوي مكونات");
    const mats = rm.ings.filter((g: any) => g.materialId && g.qty).map((g: any) => ({ materialId: g.materialId, name: g.name, qty: r2(g.qty * qty * 1000) / 1000, unitCost: g.price, total: r2(g.qty * qty * g.price) }));
    if (!biz.pos.allowNegativeStock) {
      const short: string[] = [];
      for (const m of mats) { const q = await stockQty(tx, ctx.email, branch, "material", m.materialId); if (q < m.qty - 1e-9) short.push(m.name); }
      if (short.length) fail("المواد غير كافية: " + short.join("، "));
    }
    const totalCost = r2(mats.reduce((s: number, m: any) => s + m.total, 0));
    const number = await nextNo(tx, ctx.email, "production");
    const row = (await tx`insert into fc_production (id, restaurant_email, branch_id, number, product_id, product_name, qty, materials, total_cost, notes, created_by)
      values (${uuid()}, ${ctx.email}, ${branch}, ${number}, ${pr.id}, ${pr.name}, ${qty}, ${JSON.stringify(mats)}::text::jsonb, ${totalCost}, ${str(p.notes)}, ${ctx.actor}) returning *`)[0];
    for (const m of mats) await applyMove(tx, ctx.email, branch, "material", m.materialId, m.name, -m.qty, "production_out", "production", row.id, m.unitCost, "أمر إنتاج " + number, ctx.actor);
    await applyMove(tx, ctx.email, branch, "product", pr.id, pr.name, qty, "production_in", "production", row.id, r2(totalCost / qty), "أمر إنتاج " + number, ctx.actor);
    await tx`update fc_products set track_stock = true, cost = ${r2(totalCost / qty)}, updated_at = now() where id = ${pr.id}`;
    return row;
  });
  await logAct(ctx, "أمر إنتاج", "رقم " + res.number + " · " + pr.name + " × " + qty, branch);
  return { success: true, production: { ...res, number: Number(res.number) } };
}
async function recipesBrief(ctx: Ctx) {
  needPerm(ctx, "inventory", "costing", "purchasing");
  const rows = await sql`select r.name, r.cost_price, r.selling_price, count(i.id)::int as n from fc_recipes r left join fc_recipe_ingredients i on i.recipe_id = r.id
    where r.restaurant_email = ${ctx.email} group by r.id order by r.pos`;
  return { success: true, recipes: rows.map((r: any) => ({ name: r.name, cost: num(r.cost_price), price: num(r.selling_price), ingredients: r.n })) };
}

// ---------- استيراد المنتجات ----------
async function productsImport(ctx: Ctx, p: P) {
  needFeature(ctx, "inventory"); needPerm(ctx, "inventory");
  const src = str(p.source);
  const r = await getRestaurant(ctx.email);
  const existing = await sql`select lower(name) as n from fc_products where restaurant_email = ${ctx.email}`;
  const seen = new Set(existing.map((x: any) => x.n));
  const lim = planOf(ctx.plan).limits.products;
  let room = lim < 0 ? Infinity : lim - existing.length;
  const rows: any[] = [];
  const recipes = await sql`select name, cost_price, selling_price, suggested_price from fc_recipes where restaurant_email = ${ctx.email}`;
  const rc: Record<string, any> = {}; recipes.forEach((x: any) => rc[x.name] = x);
  const link = has(ctx, "production");
  if (src === "menu") {
    const m = menuPayload(r);
    (m.items || []).forEach((it: any, i: number) => {
      const name = str(it.name).trim(); if (!name || seen.has(name.toLowerCase())) return;
      const sizes = Array.isArray(it.sizes) ? it.sizes.filter((s: any) => s && s.name) : [];
      const base = sizes.length ? num(sizes[0].price) : num(it.price);
      const rec = it.recipeName && rc[it.recipeName];
      rows.push({ name, category: (it.category && it.category !== "الكل") ? it.category : "عام", price: base, cost: rec ? num(rec.cost_price) : 0,
        variants: sizes.length > 1 ? sizes.map((s: any) => ({ name: s.name, price: num(s.price) })) : [],
        extras: (Array.isArray(it.extras) ? it.extras : []).map((e: any) => ({ name: e.name, price: num(e.price) })),
        recipe_name: link && rec ? it.recipeName : "", image_url: str(it.imageUrl || it.image || ""), sort: i });
      seen.add(name.toLowerCase());
    });
  } else {
    recipes.forEach((x: any, i: number) => {
      const name = str(x.name).trim(); if (!name || seen.has(name.toLowerCase())) return;
      rows.push({ name, category: "عام", price: num(x.selling_price) || num(x.suggested_price), cost: num(x.cost_price), variants: [], extras: [], recipe_name: link ? x.name : "", image_url: "", sort: i });
      seen.add(name.toLowerCase());
    });
  }
  const take = rows.slice(0, Math.max(0, room === Infinity ? rows.length : room));
  for (const x of take) {
    await sql`insert into fc_products (id, restaurant_email, name, category, price, cost, variants, extras, recipe_name, image_url, sort)
      values (${uuid()}, ${ctx.email}, ${x.name}, ${x.category}, ${x.price}, ${x.cost}, ${JSON.stringify(x.variants)}::text::jsonb, ${JSON.stringify(x.extras)}::text::jsonb, ${x.recipe_name}, ${x.image_url}, ${x.sort})`;
  }
  await logAct(ctx, "استيراد منتجات", (src === "menu" ? "من المينيو" : "من الأطباق") + " · " + take.length);
  return { success: true, imported: take.length, skipped: rows.length - take.length };
}

// ---------- العملاء والولاء وبطاقات الهدايا والآجل ----------
async function customerProfile(ctx: Ctx, p: P) {
  needFeature(ctx, "customers"); needPerm(ctx, "customers", "pos", "finance");
  const c = (await sql`select * from fc_customers where id = ${str(p.id)} and restaurant_email = ${ctx.email}`)[0];
  if (!c) fail("العميل غير موجود");
  const orders = await sql`select id, number, created_at, total, status, order_type from fc_orders where restaurant_email = ${ctx.email} and customer_id = ${c.id} order by created_at desc limit 50`;
  const points = has(ctx, "loyalty") ? await sql`select * from fc_points_moves where customer_id = ${c.id} order by created_at desc limit 50` : [];
  const ledger = has(ctx, "ledger") ? await sql`select * from fc_ledger where customer_id = ${c.id} order by created_at desc limit 100` : [];
  const gifts = has(ctx, "gift_cards") ? await sql`select * from fc_gift_cards where restaurant_email = ${ctx.email} and customer_id = ${c.id} order by created_at desc` : [];
  return { success: true, customer: c, orders: orders.map(mapOrder), points: points.map((x: any) => ({ ...x, id: Number(x.id) })), ledger: ledger.map((x: any) => ({ ...x, id: Number(x.id) })), giftCards: gifts };
}
async function customerPoints(ctx: Ctx, p: P) {
  needFeature(ctx, "loyalty"); needPerm(ctx, "customers");
  const d = num(p.points); if (!d) fail("عدد النقاط غير صالح");
  const c = (await sql`update fc_customers set points = greatest(0, points + ${d}) where id = ${str(p.id)} and restaurant_email = ${ctx.email} returning *`)[0];
  if (!c) fail("العميل غير موجود");
  await sql`insert into fc_points_moves (restaurant_email, customer_id, points, reason) values (${ctx.email}, ${c.id}, ${d}, ${"manual: " + str(p.note)})`;
  await logAct(ctx, "تعديل نقاط عميل", c.name + " · " + d);
  return { success: true, points: num(c.points) };
}
function giftCode() { const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let s = ""; const b = crypto.getRandomValues(new Uint8Array(10)); b.forEach((x) => s += a[x % a.length]); return s.slice(0, 4) + "-" + s.slice(4, 8) + "-" + s.slice(8, 10); }
async function giftCardIssue(ctx: Ctx, p: P) {
  needFeature(ctx, "gift_cards"); needPerm(ctx, "customers", "pos");
  const amount = num(p.amount); if (!(amount > 0)) fail("قيمة البطاقة غير صالحة");
  let code = str(p.code).trim().toUpperCase() || giftCode();
  if (!/^[A-Z0-9-]{4,30}$/.test(code)) fail("كود البطاقة: حروف إنجليزية وأرقام فقط");
  const dup = await sql`select 1 from fc_gift_cards where restaurant_email = ${ctx.email} and upper(code) = ${code}`;
  if (dup.length) fail("الكود مستخدم مسبقاً");
  let cname = str(p.customerName);
  if (p.customerId) { const c = (await sql`select name from fc_customers where id = ${str(p.customerId)} and restaurant_email = ${ctx.email}`)[0]; if (c) cname = c.name; }
  const g = (await sql`insert into fc_gift_cards (id, restaurant_email, code, initial_amount, balance, customer_id, customer_name, expires_at, note)
    values (${uuid()}, ${ctx.email}, ${code}, ${amount}, ${amount}, ${p.customerId ? str(p.customerId) : null}, ${cname}, ${isoDate(p.expiresAt)}, ${str(p.note)}) returning *`)[0];
  await sql`insert into fc_gift_moves (restaurant_email, card_id, amount, reason) values (${ctx.email}, ${g.id}, ${amount}, 'issue')`;
  await logAct(ctx, "إصدار بطاقة هدية", code + " · " + amount);
  return { success: true, card: g };
}
async function giftCardCheck(ctx: Ctx, p: P) {
  needFeature(ctx, "gift_cards"); needPerm(ctx, "customers", "pos");
  const g = (await sql`select * from fc_gift_cards where restaurant_email = ${ctx.email} and upper(code) = ${str(p.code).trim().toUpperCase()}`)[0];
  if (!g) fail("البطاقة غير موجودة");
  const moves = await sql`select * from fc_gift_moves where card_id = ${g.id} order by created_at desc limit 50`;
  const expired = !!g.expires_at && isoDate(g.expires_at)! < new Date().toISOString().slice(0, 10);
  return { success: true, card: g, expired, usable: g.active && !expired && num(g.balance) > 0, moves: moves.map((m: any) => ({ ...m, id: Number(m.id) })) };
}
async function giftCardTopup(ctx: Ctx, p: P) {
  needFeature(ctx, "gift_cards"); needPerm(ctx, "customers");
  const a = num(p.amount); if (!(a > 0)) fail("المبلغ غير صالح");
  const g = (await sql`update fc_gift_cards set balance = balance + ${a}, initial_amount = initial_amount + ${a} where id = ${str(p.id)} and restaurant_email = ${ctx.email} returning *`)[0];
  if (!g) fail("البطاقة غير موجودة");
  await sql`insert into fc_gift_moves (restaurant_email, card_id, amount, reason) values (${ctx.email}, ${g.id}, ${a}, 'topup')`;
  await logAct(ctx, "شحن بطاقة هدية", g.code + " · " + a);
  return { success: true, card: g };
}
async function ledgerList(ctx: Ctx, p: P) {
  needFeature(ctx, "ledger"); needPerm(ctx, "finance", "customers");
  if (p.customerId) {
    const c = (await sql`select * from fc_customers where id = ${str(p.customerId)} and restaurant_email = ${ctx.email}`)[0];
    if (!c) fail("العميل غير موجود");
    const rows = await sql`select * from fc_ledger where customer_id = ${c.id} order by created_at desc, id desc limit 500`;
    return { success: true, customer: c, entries: rows.map((x: any) => ({ ...x, id: Number(x.id) })) };
  }
  const rows = await sql`select id, name, phone, balance, credit_limit, last_visit from fc_customers where restaurant_email = ${ctx.email} and abs(balance) > 0.009 order by balance desc`;
  return { success: true, debtors: rows, total: r2(rows.reduce((s: number, x: any) => s + num(x.balance), 0)) };
}
async function ledgerPayment(ctx: Ctx, p: P) {
  needFeature(ctx, "ledger"); needPerm(ctx, "finance", "pos");
  const a = num(p.amount); if (!(a > 0)) fail("المبلغ غير صالح");
  const branch = await resolveBranch(ctx, p.branchId);
  const sh = await currentShift(sql, ctx, branch);
  const kind = p.kind === "debit" ? "debit" : "credit";
  if (kind === "debit" && !(ctx.isOwner || can(ctx, "finance"))) fail("لا تملك صلاحية إضافة دين يدوي");
  const c = (await sql`update fc_customers set balance = balance ${kind === "debit" ? sql`+` : sql`-`} ${a} where id = ${str(p.customerId)} and restaurant_email = ${ctx.email} returning *`)[0];
  if (!c) fail("العميل غير موجود");
  await sql`insert into fc_ledger (restaurant_email, customer_id, kind, amount, method, ref_type, note, actor, shift_id) values (${ctx.email}, ${c.id}, ${kind}, ${a}, ${str(p.method) || "cash"}, 'manual', ${str(p.note)}, ${ctx.actor}, ${sh?.id || null})`;
  await logAct(ctx, kind === "debit" ? "إضافة دين على عميل" : "تحصيل دفعة آجل", c.name + " · " + a);
  return { success: true, balance: num(c.balance) };
}

// ---------- عروض الأسعار ----------
async function quoteSave(ctx: Ctx, p: P) {
  needFeature(ctx, "quotes"); needPerm(ctx, "finance", "pos");
  const branch = await resolveBranch(ctx, p.branchId);
  const biz = await loadBiz(ctx.email);
  const q = jsonObj(p.quote);
  const pr = await priceOrder(sql, ctx, jsonArr(q.items), q.discount, biz, ctx.isOwner || can(ctx, "finance"));
  if (!pr.lines.length) fail("أضف أصنافاً لعرض السعر");
  let cname = str(q.customerName), phone = str(q.phone), cid: string | null = null;
  if (q.customerId) { const c = (await sql`select id, name, phone from fc_customers where id = ${str(q.customerId)} and restaurant_email = ${ctx.email}`)[0]; if (c) { cid = c.id; cname = c.name; phone = phone || c.phone; } }
  const rec = { customer_id: cid, customer_name: cname, phone, items: sql.json(pr.lines), subtotal: pr.totals.subtotal, discount_total: pr.totals.discount_total,
    tax_total: pr.totals.tax_total, total: pr.totals.total, valid_until: isoDate(q.validUntil), notes: str(q.notes) };
  let row: any;
  if (q.id) {
    row = (await sql`update fc_quotes set ${sql(rec)} where id = ${str(q.id)} and restaurant_email = ${ctx.email} and status <> 'converted' returning *`)[0];
    if (!row) fail("عرض السعر غير موجود أو تم تحويله");
  } else {
    const number = await nextNo(sql, ctx.email, "quote");
    row = (await sql`insert into fc_quotes ${sql({ ...rec, id: uuid(), restaurant_email: ctx.email, branch_id: branch, number, status: "draft", created_by: ctx.actor })} returning *`)[0];
  }
  await logAct(ctx, q.id ? "تعديل عرض سعر" : "إنشاء عرض سعر", "رقم " + row.number + " · " + cname + " · " + num(row.total).toFixed(2), branch);
  return { success: true, quote: { ...row, number: Number(row.number) } };
}
async function quoteConvert(ctx: Ctx, p: P) {
  needFeature(ctx, "quotes"); needPerm(ctx, "pos");
  const biz = await loadBiz(ctx.email);
  const q = (await sql`select * from fc_quotes where id = ${str(p.id)} and restaurant_email = ${ctx.email}`)[0];
  if (!q) fail("عرض السعر غير موجود");
  if (q.status === "converted") fail("تم تحويل العرض مسبقاً");
  const branch = await resolveBranch(ctx, q.branch_id);
  const items = (q.items || []).map((l: any) => l.productId ? { productId: l.productId, variant: l.variant, extras: l.extras, qty: l.qty, unitPrice: l.unit - (l.extras || []).reduce((s: number, e: any) => s + num(e.price) * num(e.qty), 0), note: l.note }
    : { name: l.name, unitPrice: l.unit, qty: l.qty, note: l.note });
  const out = await sql.begin(async (tx: any) => {
    const r = await writeOrder(tx, ctx, branch, { orderType: "takeaway", customerId: q.customer_id, customerName: q.customer_name, customerPhone: q.phone, items, notes: "من عرض السعر رقم " + q.number,
      discount: q.discount_total > 0 ? { kind: "amount", value: 0 } : {} }, biz, { trusted: true, source: "quote" });
    await tx`update fc_quotes set status = 'converted', order_id = ${r.row.id} where id = ${q.id}`;
    return r;
  });
  await logAct(ctx, "تحويل عرض سعر إلى طلب", "عرض " + q.number + " → طلب " + out.row.number, branch);
  return { success: true, order: mapOrder(out.row) };
}

// ---------- الفواتير والتقارير ----------
async function invoicesList(ctx: Ctx, p: P) {
  needFeature(ctx, "finance"); needPerm(ctx, "finance", "reports", "orders_manage");
  const b = await resolveBranchOrAll(ctx, p.branchId);
  const { from, to } = rangeOf(p, 30);
  const q = str(p.q).trim();
  const rows = await sql`select * from fc_invoices where restaurant_email = ${ctx.email} ${b ? sql`and branch_id = ${b}` : sql``}
    and issued_at >= ${from.toISOString()}::timestamptz and issued_at < ${to.toISOString()}::timestamptz
    ${p.kind ? sql`and kind = ${str(p.kind)}` : sql``}
    ${q ? (/^\d+$/.test(q) ? sql`and (number = ${parseInt(q)} or order_number = ${parseInt(q)})` : sql`and customer_name ilike ${"%" + q + "%"}`) : sql``}
    order by number desc limit 2000`;
  return { success: true, invoices: rows.map(mapInv) };
}
async function getInvoice(ctx: Ctx, p: P) {
  needFeature(ctx, "pos"); needPerm(ctx, "pos", "finance", "reports", "orders_manage");
  const i = (await sql`select * from fc_invoices where id = ${str(p.id)} and restaurant_email = ${ctx.email}`)[0];
  if (!i) fail("الفاتورة غير موجودة");
  const br = (await sql`select name, address, phone from fc_branches where id = ${i.branch_id}`)[0];
  const r = await getRestaurant(ctx.email);
  return { success: true, invoice: mapInv(i), branch: br, restaurantName: r?.name, currency: r?.currency, biz: mergeBiz(r?.biz_settings || {}) };
}

async function financeReport(ctx: Ctx, p: P) {
  needFeature(ctx, "reports"); needPerm(ctx, "finance", "reports");
  const b = await resolveBranchOrAll(ctx, p.branchId);
  const { from, to, off } = rangeOf(p, 30);
  const F = from.toISOString(), T = to.toISOString();
  const inv = await sql`select kind, total, tax_total, discount_total, subtotal, payments, issued_at, staff_name,
      to_char(issued_at + make_interval(mins => ${off}), 'YYYY-MM-DD') as day
    from fc_invoices where restaurant_email = ${ctx.email} ${b ? sql`and branch_id = ${b}` : sql``} and issued_at >= ${F}::timestamptz and issued_at < ${T}::timestamptz`;
  let gross = 0, refunds = 0, tax = 0, disc = 0, count = 0, refundTax = 0;
  const byMethod: Record<string, number> = {}, byDay: Record<string, { sales: number; refunds: number; count: number }> = {}, byStaff: Record<string, number> = {};
  inv.forEach((i: any) => {
    const t = num(i.total), sg = i.kind === "refund" ? -1 : 1;
    byDay[i.day] = byDay[i.day] || { sales: 0, refunds: 0, count: 0 };
    if (sg > 0) { gross += t; tax += num(i.tax_total); disc += num(i.discount_total); count++; byDay[i.day].sales += t; byDay[i.day].count++; byStaff[i.staff_name || "—"] = (byStaff[i.staff_name || "—"] || 0) + t; }
    else { refunds += t; refundTax += num(i.tax_total); byDay[i.day].refunds += t; }
    (i.payments || []).forEach((x: any) => { byMethod[x.method] = r2((byMethod[x.method] || 0) + sg * num(x.amount)); });
  });
  const orders = await sql`select items, cost_total, order_type, status from fc_orders where restaurant_email = ${ctx.email} ${b ? sql`and branch_id = ${b}` : sql``}
    and status = 'paid' and paid_at >= ${F}::timestamptz and paid_at < ${T}::timestamptz`;
  let cogs = 0; const byType: Record<string, number> = {}; const prodAgg: Record<string, { name: string; qty: number; revenue: number }> = {};
  orders.forEach((o: any) => {
    cogs += num(o.cost_total);
    byType[o.order_type] = r2((byType[o.order_type] || 0) + (o.items || []).reduce((s: number, l: any) => s + num(l.total), 0));
    (o.items || []).forEach((l: any) => { const k = l.productId || l.name; prodAgg[k] = prodAgg[k] || { name: l.name, qty: 0, revenue: 0 }; prodAgg[k].qty += num(l.qty); prodAgg[k].revenue += num(l.net); });
  });
  const expRows = await sql`select category, sum(amount)::float8 as total from fc_expenses where restaurant_email = ${ctx.email} ${b ? sql`and branch_id = ${b}` : sql``}
    and spent_at >= ${isoDate(new Date(from.getTime() + off * 60000))}::date and spent_at < ${isoDate(new Date(to.getTime() + off * 60000 - 1))}::date + 1 group by category order by 2 desc`;
  const expenses = r2(expRows.reduce((s: number, x: any) => s + num(x.total), 0));
  const waste = (await sql`select coalesce(sum(-qty * unit_cost),0)::float8 as v from fc_stock_moves where restaurant_email = ${ctx.email} ${b ? sql`and branch_id = ${b}` : sql``}
    and reason = 'waste' and created_at >= ${F}::timestamptz and created_at < ${T}::timestamptz`)[0].v;
  const purchases = has(ctx, "purchasing") ? (await sql`select coalesce(sum(total),0)::float8 as v from fc_purchases where restaurant_email = ${ctx.email} ${b ? sql`and branch_id = ${b}` : sql``}
    and status = 'posted' and purchased_at >= ${isoDate(new Date(from.getTime() + off * 60000))}::date and purchased_at < ${isoDate(new Date(to.getTime() + off * 60000 - 1))}::date + 1`)[0].v : 0;
  const netSales = r2(gross - refunds);
  const netSalesExTax = r2(netSales - (tax - refundTax));
  const grossProfit = r2(netSalesExTax - cogs);
  return {
    success: true, from: F, to: T,
    summary: { grossSales: r2(gross), refunds: r2(refunds), netSales, tax: r2(tax - refundTax), discounts: r2(disc), invoices: count, avgTicket: count ? r2(gross / count) : 0,
      netSalesExTax, cogs: r2(cogs), grossProfit, expenses, waste: r2(num(waste)), netProfit: r2(grossProfit - expenses - num(waste)), purchases: r2(num(purchases)),
      grossMargin: netSalesExTax > 0 ? r2(grossProfit / netSalesExTax * 100) : 0 },
    byMethod, byType, byStaff: Object.entries(byStaff).map(([name, total]) => ({ name, total: r2(total) })).sort((a, b) => b.total - a.total),
    byDay: Object.entries(byDay).sort().map(([day, v]) => ({ day, sales: r2(v.sales), refunds: r2(v.refunds), count: v.count })),
    expensesByCategory: expRows.map((x: any) => ({ category: x.category, total: r2(num(x.total)) })),
    topProducts: Object.values(prodAgg).sort((a, b) => b.revenue - a.revenue).slice(0, 15).map((x) => ({ ...x, revenue: r2(x.revenue) })),
  };
}
async function profitReport(ctx: Ctx, p: P) {
  needFeature(ctx, "profit_reports"); needPerm(ctx, "reports", "finance");
  const b = await resolveBranchOrAll(ctx, p.branchId);
  const { from, to, off } = rangeOf(p, 30);
  const orders = await sql`select o.items, o.branch_id, br.name as branch_name, to_char(o.paid_at + make_interval(mins => ${off}), 'YYYY-MM-DD') as day
    from fc_orders o left join fc_branches br on br.id = o.branch_id
    where o.restaurant_email = ${ctx.email} ${b ? sql`and o.branch_id = ${b}` : sql``} and o.status = 'paid'
    and o.paid_at >= ${from.toISOString()}::timestamptz and o.paid_at < ${to.toISOString()}::timestamptz`;
  const prod: Record<string, any> = {}, cat: Record<string, any> = {}, br: Record<string, any> = {}, day: Record<string, any> = {};
  const add = (m: Record<string, any>, k: string, name: string, l: any) => {
    m[k] = m[k] || { name, qty: 0, revenue: 0, cost: 0 };
    m[k].qty += num(l.qty); m[k].revenue += num(l.net); m[k].cost += num(l.cost) * num(l.qty);
  };
  orders.forEach((o: any) => (o.items || []).forEach((l: any) => {
    add(prod, l.productId || ("x:" + l.name), l.name, l); add(cat, l.category || "بدون تصنيف", l.category || "بدون تصنيف", l);
    add(br, o.branch_id, o.branch_name || "—", l); add(day, o.day, o.day, l);
  }));
  const fin = (m: Record<string, any>) => Object.values(m).map((x: any) => ({ ...x, qty: r2(x.qty), revenue: r2(x.revenue), cost: r2(x.cost), profit: r2(x.revenue - x.cost), margin: x.revenue > 0 ? r2((x.revenue - x.cost) / x.revenue * 100) : 0 }));
  const products = fin(prod).sort((a, b) => b.profit - a.profit);
  const tot = products.reduce((s, x) => ({ revenue: s.revenue + x.revenue, cost: s.cost + x.cost }), { revenue: 0, cost: 0 });
  return { success: true, products, categories: fin(cat).sort((a, b) => b.profit - a.profit), branches: fin(br).sort((a, b) => b.profit - a.profit),
    days: fin(day).sort((a, b) => a.name < b.name ? -1 : 1), total: { revenue: r2(tot.revenue), cost: r2(tot.cost), profit: r2(tot.revenue - tot.cost), margin: tot.revenue > 0 ? r2((tot.revenue - tot.cost) / tot.revenue * 100) : 0 } };
}
async function activityList(ctx: Ctx, p: P) {
  needFeature(ctx, "activity"); needPerm(ctx, "team", "reports");
  const { from, to } = rangeOf(p, 7);
  const q = str(p.q).trim();
  const rows = await sql`select a.*, b.name as branch_name from fc_activity a left join fc_branches b on b.id = a.branch_id where a.restaurant_email = ${ctx.email}
    and a.created_at >= ${from.toISOString()}::timestamptz and a.created_at < ${to.toISOString()}::timestamptz
    ${q ? sql`and (a.actor ilike ${"%" + q + "%"} or a.action ilike ${"%" + q + "%"} or a.details ilike ${"%" + q + "%"})` : sql``}
    order by a.created_at desc limit 2000`;
  return { success: true, rows: rows.map((x: any) => ({ ...x, id: Number(x.id) })) };
}

// ---------- ملخص لوحة التحكم + الإشعارات الذكية ----------
async function bizSummary(ctx: Ctx, p: P) {
  needFeature(ctx, "pos");
  const b = await resolveBranchOrAll(ctx, p.branchId);
  const { off } = rangeOf(p);
  const now = new Date(), localNow = new Date(now.getTime() + off * 60000);
  const dayStart = new Date(Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate()) - off * 60000);
  const weekStart = new Date(dayStart.getTime() - 6 * 864e5);
  const agg = async (f: Date) => (await sql`select coalesce(sum(case when kind='sale' then total else -total end),0)::float8 as s, count(*) filter (where kind='sale')::int as n
    from fc_invoices where restaurant_email = ${ctx.email} ${b ? sql`and branch_id = ${b}` : sql``} and issued_at >= ${f.toISOString()}::timestamptz`)[0];
  const t = await agg(dayStart), w = await agg(weekStart);
  const open = (await sql`select count(*)::int as n, coalesce(sum(total),0)::float8 as s from fc_orders where restaurant_email = ${ctx.email} ${b ? sql`and branch_id = ${b}` : sql``} and status = 'open'`)[0];
  const cust = (await sql`select count(*)::int as n from fc_customers where restaurant_email = ${ctx.email}`)[0].n;
  const low = (await sql`select count(*)::int as n from fc_stock where restaurant_email = ${ctx.email} ${b ? sql`and branch_id = ${b}` : sql``} and min_qty > 0 and qty <= min_qty`)[0].n;
  const resv = has(ctx, "tables") ? (await sql`select count(*)::int as n from fc_reservations where restaurant_email = ${ctx.email} ${b ? sql`and branch_id = ${b}` : sql``}
    and reserved_at >= ${dayStart.toISOString()}::timestamptz and reserved_at < ${new Date(dayStart.getTime() + 864e5).toISOString()}::timestamptz and status in ('pending','confirmed')`)[0].n : 0;
  return { success: true, today: { sales: r2(num(t.s)), count: t.n, avg: t.n ? r2(num(t.s) / t.n) : 0 }, week: { sales: r2(num(w.s)), count: w.n }, openOrders: { count: open.n, total: r2(num(open.s)) }, customers: cust, lowStock: low, reservationsToday: resv };
}
async function getNotifications(ctx: Ctx, p: P) {
  needFeature(ctx, "notifications");
  const biz = await loadBiz(ctx.email);
  const b = await resolveBranchOrAll(ctx, p.branchId);
  const out: any[] = [];
  const u = await getUserRow(ctx.email);
  const days = Math.ceil((new Date(u.expiry_date).getTime() - Date.now()) / 864e5);
  if (ctx.isOwner && days <= 14) out.push({ level: "danger", icon: "calendar-times", title: "تجديد الاشتراك", message: "يتبقى " + days + " يوم على انتهاء الاشتراك", tab: "plans" });
  if (has(ctx, "online_orders") && can(ctx, "pos")) {
    const n = (await sql`select count(*)::int as n from fc_menu_orders where restaurant_email = ${ctx.email} and status = 'new'`)[0].n;
    if (n) out.push({ level: "info", icon: "qrcode", title: "طلبات جديدة من المينيو", message: n + " طلب بانتظار القبول", tab: "pos" });
  }
  if (biz.notify.lowStock && can(ctx, "inventory")) {
    const rows = await sql`select s.item_type, s.item_id, s.qty, s.min_qty, coalesce(p.name, m.name) as name from fc_stock s
      left join fc_products p on s.item_type = 'product' and p.id = s.item_id left join fc_materials m on s.item_type = 'material' and m.restaurant_email = s.restaurant_email and m.id = s.item_id
      where s.restaurant_email = ${ctx.email} ${b ? sql`and s.branch_id = ${b}` : sql``} and s.min_qty > 0 and s.qty <= s.min_qty order by s.qty / nullif(s.min_qty,0) limit 20`;
    if (rows.length) out.push({ level: "warning", icon: "box-open", title: "مخزون منخفض", message: rows.length + " صنف وصل للحد الأدنى: " + rows.slice(0, 4).map((x: any) => x.name).join("، "), tab: "inventory" });
  }
  if (biz.notify.reservations && has(ctx, "tables") && can(ctx, "tables")) {
    const rows = await sql`select customer_name, reserved_at, party_size, status from fc_reservations where restaurant_email = ${ctx.email} ${b ? sql`and branch_id = ${b}` : sql``}
      and reserved_at between now() - interval '15 minutes' and now() + interval '3 hours' and status in ('pending','confirmed') order by reserved_at`;
    if (rows.length) out.push({ level: "info", icon: "calendar-check", title: "حجوزات قريبة", message: rows.length + " حجز خلال 3 ساعات — أقربها: " + rows[0].customer_name, tab: "tables" });
    const pend = (await sql`select count(*)::int as n from fc_reservations where restaurant_email = ${ctx.email} and status = 'pending' and reserved_at > now()`)[0].n;
    if (pend) out.push({ level: "warning", icon: "hourglass-half", title: "طلبات حجز بانتظار التأكيد", message: pend + " طلب حجز", tab: "tables" });
  }
  if (has(ctx, "kitchen") && can(ctx, "pos")) {
    const n = (await sql`select count(*)::int as n from fc_orders where restaurant_email = ${ctx.email} ${b ? sql`and branch_id = ${b}` : sql``} and kitchen_status = 'ready' and status in ('open','paid') and created_at > now() - interval '12 hours'`)[0].n;
    if (n) out.push({ level: "success", icon: "bell-concierge", title: "طلبات جاهزة للتسليم", message: n + " طلب جاهز في المطبخ", tab: "orders" });
  }
  if (has(ctx, "shifts") && (ctx.isOwner || can(ctx, "team"))) {
    const n = (await sql`select count(*)::int as n from fc_shifts where restaurant_email = ${ctx.email} and status = 'open' and opened_at < now() - interval '14 hours'`)[0].n;
    if (n) out.push({ level: "warning", icon: "user-clock", title: "ورديات مفتوحة منذ وقت طويل", message: n + " وردية مفتوحة أكثر من 14 ساعة", tab: "team" });
  }
  if (biz.notify.giftExpiry && has(ctx, "gift_cards") && can(ctx, "customers")) {
    const n = (await sql`select count(*)::int as n from fc_gift_cards where restaurant_email = ${ctx.email} and active and balance > 0 and expires_at between current_date and current_date + 7`)[0].n;
    if (n) out.push({ level: "info", icon: "gift", title: "بطاقات هدايا قاربت على الانتهاء", message: n + " بطاقة تنتهي خلال 7 أيام", tab: "customers" });
  }
  if (biz.notify.birthdays && has(ctx, "customers") && can(ctx, "customers")) {
    const rows = await sql`select name from fc_customers where restaurant_email = ${ctx.email} and birthday is not null
      and extract(month from birthday) = extract(month from now() + interval '3 hours') and extract(day from birthday) = extract(day from now() + interval '3 hours') limit 10`;
    if (rows.length) out.push({ level: "success", icon: "birthday-cake", title: "أعياد ميلاد اليوم", message: rows.map((x: any) => x.name).join("، "), tab: "customers" });
  }
  if (biz.notify.credit && has(ctx, "ledger") && can(ctx, "finance")) {
    const r = (await sql`select count(*)::int as n, coalesce(sum(balance),0)::float8 as s from fc_customers where restaurant_email = ${ctx.email} and balance > 0.009`)[0];
    if (r.n) out.push({ level: "info", icon: "book", title: "ديون الآجل", message: r.n + " عميل · الإجمالي " + r2(num(r.s)), tab: "customers" });
  }
  return { success: true, notifications: out };
}

// ---------- التطبيق الخاص باسم النشاط (عام) ----------
async function getAppConfig(p: P) {
  const pub = await resolvePublic(p);
  if (!pub.active || !pub.features.has("brand_app")) return { success: false, error: "التطبيق الخاص متاح في الباقة المتقدمة" };
  const biz = mergeBiz(pub.r.biz_settings || {});
  const m = menuPayload(pub.r);
  const branches = await sql`select id, name, address, phone from fc_branches where restaurant_email = ${pub.email} and active = true order by is_main desc, created_at`;
  return {
    success: true, publicId: pub.r.public_id, name: biz.app.name || m.settings.displayName || pub.r.name, shortName: biz.app.shortName || biz.app.name || pub.r.name,
    color: biz.app.color, bg: biz.app.bg, icon: biz.app.icon || biz.business.logo, welcome: biz.app.welcome, phone: biz.app.phone || biz.business.phone,
    whatsapp: m.settings.whatsapp || "", instagram: biz.app.instagram, maps: biz.app.maps, googleReview: biz.google.reviewUrl, currency: m.settings.currency || pub.r.currency,
    banners: (pub.r.banner_assets || []).map((a: any) => a.url).filter(Boolean),
    features: { reservations: !!biz.app.enableReservations && pub.features.has("tables"), loyalty: !!biz.app.enableLoyalty && biz.loyalty.enabled, orderStatus: !!biz.app.enableOrderStatus, ordering: !!biz.ordering.enabled },
    branches,
  };
}
async function publicLoyalty(p: P) {
  const pub = await resolvePublic(p);
  const biz = mergeBiz(pub.r.biz_settings || {});
  if (!pub.active || !pub.features.has("loyalty") || !biz.loyalty.enabled) return { success: false, error: "برنامج الولاء غير مفعّل" };
  const ph = digits(p.phone);
  if (ph.length < 7) return { success: false, error: "أدخل رقم هاتف صحيح" };
  const c = (await sql`select name, points, visits from fc_customers where restaurant_email = ${pub.email} and right(regexp_replace(phone, '\\D', '', 'g'), 9) = right(${ph}, 9) limit 1`)[0];
  if (!c) return { success: false, error: "لا يوجد حساب ولاء بهذا الرقم — اطلب التسجيل عند الكاشير" };
  return { success: true, name: str(c.name).split(" ")[0], points: num(c.points), value: r2(num(c.points) * num(biz.loyalty.pointValue)), visits: c.visits, minRedeem: biz.loyalty.minRedeem };
}
async function publicReservation(p: P) {
  const pub = await resolvePublic(p);
  const biz = mergeBiz(pub.r.biz_settings || {});
  if (!pub.active || !pub.features.has("brand_app") || !biz.app.enableReservations) return { success: false, error: "الحجز الإلكتروني غير متاح" };
  const name = str(p.name).trim().slice(0, 80), phone = str(p.phone).trim().slice(0, 30);
  if (!name || digits(phone).length < 7) return { success: false, error: "الاسم ورقم الهاتف مطلوبان" };
  const at = safeDate(p.at, null);
  if (!at || at.getTime() < Date.now() - 5 * 60000) return { success: false, error: "اختر موعداً قادماً" };
  if (at.getTime() > Date.now() + 90 * 864e5) return { success: false, error: "الحجز متاح حتى 90 يوماً قادمة" };
  const recent = (await sql`select count(*)::int as n from fc_reservations where restaurant_email = ${pub.email} and source = 'app' and phone = ${phone} and created_at > now() - interval '1 hour'`)[0].n;
  if (recent >= 3) return { success: false, error: "تم استلام طلباتك — سنتواصل معك قريباً" };
  let branch = str(p.branchId);
  const ok = branch ? await sql`select id from fc_branches where id = ${branch} and restaurant_email = ${pub.email}` : [];
  if (!ok.length) branch = (await ensureMainBranch(pub.email)).id;
  await sql`insert into fc_reservations (id, restaurant_email, branch_id, customer_name, phone, party_size, reserved_at, status, source, notes)
    values (${uuid()}, ${pub.email}, ${branch}, ${name}, ${phone}, ${Math.min(50, Math.max(1, parseInt(p.partySize) || 2))}, ${at.toISOString()}::timestamptz, 'pending', 'app', ${str(p.notes).slice(0, 300)})`;
  return { success: true, message: "تم استلام طلب الحجز — سيتم التأكيد معك قريباً" };
}

// ---------- المعرّف العام وصفحة المشاركة ----------
async function ensurePublicId(email: string) {
  const r = (await sql`select public_id from fc_restaurants where email = ${email}`)[0];
  if (r?.public_id) return r.public_id as string;
  for (let i = 0; i < 6; i++) {
    const a = "abcdefghjkmnpqrstuvwxyz23456789"; let id = "";
    crypto.getRandomValues(new Uint8Array(8)).forEach((x) => id += a[x % a.length]);
    try {
      const u = await sql`update fc_restaurants set public_id = ${id} where email = ${email} and public_id is null returning public_id`;
      if (u.length) return id;
      const again = (await sql`select public_id from fc_restaurants where email = ${email}`)[0];
      if (again?.public_id) return again.public_id;
    } catch { /* تعارض نادر — نعيد المحاولة */ }
  }
  fail("تعذر إنشاء المعرّف العام");
}
async function shareInfo(email: string) {
  return { publicId: await ensurePublicId(email), published: false, autoPublish: false };
}
const escHtml = (s: any) => str(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as any)[c]);
async function publishSharePage(email: string) {
  const share = await shareInfo(email);
  const r = await getRestaurant(email);
  const m = menuPayload(r);
  const name = m.settings.displayName || r?.name || "المطعم";
  const sub = m.settings.subtitle || "قائمة الطعام";
  const img = (bannerState(r).assets[0] || {}).url || "";
  const target = "../../menu.html?r=" + encodeURIComponent(share.publicId);
  const html = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escHtml(name)} | ${escHtml(sub)}</title><meta property="og:title" content="${escHtml(name)}"><meta property="og:description" content="${escHtml(sub)}">
${img ? `<meta property="og:image" content="${escHtml(img)}">` : ""}<meta http-equiv="refresh" content="0;url=${target}"></head>
<body style="font-family:system-ui;background:#0b0e17;color:#eee;text-align:center;padding:40px"><a style="color:#cfa776" href="${target}">${escHtml(name)} — افتح القائمة</a>
<script>location.replace(${JSON.stringify(target)});</script></body></html>`;
  return { success: true, published: false, reason: "not-configured", html, path: "m/" + share.publicId + "/index.html", share };
}
async function emailFromPublic(p: P) {
  const id = lower(p.r || p.publicId);
  if (id) { const r = await sql`select email from fc_restaurants where public_id = ${id}`; return r.length ? r[0].email as string : ""; }
  return lower(p.restaurantEmail || p.email || p.restaurant);
}

// ---------- سجل الدوال الجديدة ----------
type Fn = (ctx: Ctx, p: P) => Promise<any>;
const NEW_FNS: Record<string, Fn> = {
  getAccountInfo: (c) => getAccountInfo(c),
  saveBizSettings, entityList, entitySave, entityDelete,
  posBootstrap, posSaveOrder, posCheckout, posCancelOrder, posRefund, getOrders, getOrder, importMenuOrder,
  kitchenList, kitchenBump,
  shiftCurrent, shiftOpen, shiftClose, shiftCashMove,
  shiftReport: async (c, p) => {
    needFeature(c, "shifts"); needPerm(c, "team", "finance", "pos");
    const sh = (await sql`select * from fc_shifts where id = ${str(p.id)} and restaurant_email = ${c.email}`)[0];
    if (!sh) fail("الوردية غير موجودة");
    if (!c.isOwner && !can(c, "team") && !can(c, "finance") && sh.staff_id !== c.actorId) fail("لا تملك صلاحية لهذا الإجراء");
    return { success: true, shift: sh, summary: sh.status === "open" ? await shiftSummary(sh) : sh.summary };
  },
  stockList, stockAdjust, stockCount, stockSetMin, stockMoves,
  purchasePost, purchaseCancel, supplierPay, supplierStatement,
  transferCreate, transferReceive, productionCreate, recipesBrief: (c) => recipesBrief(c), productsImport,
  customerProfile, customerPoints, giftCardIssue, giftCardCheck, giftCardTopup, ledgerList, ledgerPayment,
  quoteSave, quoteConvert, invoicesList, getInvoice, financeReport, profitReport, activityList, bizSummary, getNotifications,
};
const PUBLIC_NEW: Record<string, (p: P) => Promise<any>> = {
  staffLogin, getOrderBoard, publicOrderStatus, getAppConfig, publicLoyalty, publicReservation,
};

// صلاحيات الموظفين على الدوال الأصلية
const LEGACY_PERM: Record<string, string[]> = {
  getAllMaterials: ["costing", "inventory", "purchasing"], addMaterial: ["costing"], deleteMaterial: ["costing"], updateMaterial: ["costing"],
  getAllRecipes: ["costing", "inventory"], addRecipe: ["costing"], deleteRecipe: ["costing"], getRecipeIngredients: ["costing", "inventory"],
  saveRecipeIngredients: ["costing"], renameRecipe: ["costing"], getPriceHistory: ["costing"], getMaterialPriceChanges: ["costing"],
  updateRecipeSellingPrice: ["costing"], addSale: ["costing"], getSales: ["costing", "reports"], getSalesSummary: ["costing", "reports"], deleteSale: ["costing"],
  getMenuData: ["costing"], saveMenuData: ["costing"], getDashboardData: ["costing", "reports"],
  getDigitalMenu: ["digital_menu"], saveDigitalMenu: ["digital_menu"], saveMenuBanners: ["digital_menu"], uploadMenuImage: ["digital_menu", "inventory"],
  getMenuOrders: ["digital_menu", "pos"], updateMenuOrderStatus: ["digital_menu", "pos"], deleteMenuOrder: ["digital_menu"],
  getReviews: ["reviews"], publishSharePage: ["digital_menu", "reviews"],
  updateRestaurantName: ["settings"], updateSettings: ["settings"],
  exportFullBackup: ["__owner"], getFullBackupImage: ["__owner"], restoreFullBackup: ["__owner"], restoreSnapshot: ["__owner"], listSnapshots: ["__owner"],
};
const LEGACY_LOG: Record<string, string> = {
  addMaterial: "إضافة مادة خام", deleteMaterial: "حذف مادة خام", updateMaterial: "تعديل مادة خام", addRecipe: "إضافة طبق", deleteRecipe: "حذف طبق",
  saveRecipeIngredients: "تعديل مكونات طبق", renameRecipe: "إعادة تسمية طبق", updateRecipeSellingPrice: "تعديل سعر بيع طبق", addSale: "تسجيل مبيعات (التكلفة)",
  deleteSale: "حذف مبيعات (التكلفة)", saveDigitalMenu: "تعديل المينيو الإلكتروني", saveMenuBanners: "تعديل بنرات المينيو", updateSettings: "تعديل إعدادات التكلفة",
  updateRestaurantName: "تغيير اسم المطعم", restoreFullBackup: "استعادة نسخة احتياطية", restoreSnapshot: "استعادة لقطة", updateMenuOrderStatus: "تحديث حالة طلب مينيو",
  deleteMenuOrder: "حذف طلب مينيو",
};

// ============================================================
// الموزّع المركزي (نفس منطق handleRequest)
// ============================================================
function errMsg(e: unknown) { return e instanceof Error ? e.message : String(e); }

async function parseParams(req: Request): Promise<P> {
  const url = new URL(req.url);
  const p: P = {};
  url.searchParams.forEach((v, k) => { p[k] = v; });
  if (p.params) { try { Object.assign(p, JSON.parse(p.params)); } catch { /* ignore */ } }
  if (req.method === "POST") {
    const text = await req.text();
    if (text) {
      const ct = (req.headers.get("content-type") || "").toLowerCase();
      let body: P | null = null;
      if (ct.includes("application/x-www-form-urlencoded")) body = Object.fromEntries(new URLSearchParams(text));
      else { try { body = JSON.parse(text); } catch { if (text.includes("=")) body = Object.fromEntries(new URLSearchParams(text)); } }
      if (body && typeof body === "object") {
        if (typeof body.params === "string") { try { Object.assign(body, JSON.parse(body.params)); } catch { /* ignore */ } }
        Object.assign(p, body);
      }
    }
  }
  return p;
}

const ADMIN_FNS = ["getUsers", "audit", "addUser", "deleteUser", "adminImportRestaurant", "adminImportTx", "adminUploadAsset"];
const R5_FNS = ["r5BannerRead", "r5BannerWrite", "r5Export", "r5BackupImage", "r5Restore", "r5Info"];

async function handle(p: P): Promise<any> {
  const fn = str(p.fn);
  const token = str(p.token);
  const isAdminKey = !!ADMIN_SECRET_KEY && str(p.adminKey) === ADMIN_SECRET_KEY;

  // ===== R5 (بنرات + نسخ شامل) =====
  if (R5_FNS.includes(fn)) {
    try {
      const auth = await requireValidToken(token), email = lower(p.restaurantEmail);
      if (!auth.valid || lower(auth.email) !== email) return { success: false, authError: true, error: auth.reason || "الجلسة لا تخص المطعم" };
      if (auth.staffId && fn !== "r5BannerRead" && fn !== "r5Info") return { success: false, error: "النسخ الاحتياطي والاستعادة متاحة لصاحب الحساب فقط" };
      await ensureRestaurant(email);
      if (fn === "r5BannerRead") return await r5Read(email);
      if (fn === "r5BannerWrite") return await r5BannerWrite(email, p);
      if (fn === "r5Export") return await exportBackup(email, "full-r5");
      if (fn === "r5BackupImage") return await backupImage(email, p);
      if (fn === "r5Restore") return await restoreBackup(email, p, "full-r5");
      return { success: true, build: "foodcost-r5-supabase", protocol: 5, spreadsheetId: "supabase:" + email, banners: await r5Read(email), backupFormat: "full-r5" };
    } catch (e) { return { success: false, error: errMsg(e), build: "foodcost-r5-supabase" }; }
  }

  // ===== 1) حماية دوال الإدارة =====
  if (ADMIN_FNS.includes(fn) && !isAdminKey) return { success: false, error: "غير مصرح لك بالوصول لهذه الدالة" };

  // ===== 2) دوال عامة =====
  if (fn === "login") return await login(p.username, p.password);
  if (fn === "register") return await registerUser(p);
  if (fn === "validateToken") return await validateToken(token);
  if (fn === "logout" || fn === "revokeSession") return await revokeSession(token);
  if (fn === "submitReview") return await submitReview(p);
  if (fn === "renewSubscription") return await renewSubscription(p);
  if (fn === "getPublicMenu") { const e = await emailFromPublic(p); return e ? await getPublicMenu(e) : { success: false, error: "المطعم غير موجود" }; }
  if (fn === "savePublicOrder") { const e = await emailFromPublic(p); return e ? await savePublicOrder(e, p) : { success: false, error: "المطعم غير موجود" }; }
  if (PUBLIC_NEW[fn]) { try { return await PUBLIC_NEW[fn](p); } catch (e) { return { success: false, error: errMsg(e) }; } }

  // ===== 3) دوال الإدارة =====
  if (fn === "getUsers") return await getUsers();
  if (fn === "audit") return await auditUsers(parseJSON<string[]>(p.emails, []));
  if (fn === "addUser") return await addUser(p);
  if (fn === "deleteUser") return await deleteUser(p);
  if (fn === "adminImportRestaurant") return await adminImportRestaurant(p);
  if (fn === "adminImportTx") return await adminImportTx(p);
  if (fn === "adminUploadAsset") return await adminUploadAsset(p);

  // ===== 4) updateUser =====
  if (fn === "updateUser") {
    if (!isAdminKey && !p.oldPassword) return { success: false, error: "غير مصرح — يلزم كلمة المرور الحالية أو مفتاح الإدارة" };
    if (!isAdminKey) {
      if (p.expiryDate !== undefined && p.expiryDate !== "") return { success: false, error: "غير مصرح بتعديل تاريخ الاشتراك" };
      if (p.frozen !== undefined) return { success: false, error: "غير مصرح بتعديل حالة التجميد" };
    }
    return await updateUser(p, isAdminKey);
  }

  // ===== 5) مسار التجديد القديم (بدون fn) =====
  if (!fn && p.email && p.password) {
    const email = str(p.email).trim(), password = str(p.password).trim(), txId = str(p.txId || p.transactionId).trim();
    if (isAdminKey) return await createOrRenewUser(email, password);
    if (txId && txId.length >= 8 && /^\d+$/.test(txId)) return await renewSubscription({ email, password, txId });
    return { status: "error", message: "التجديد يتطلب معرّف عملية دفع صالح (8 أرقام على الأقل)" };
  }

  const restaurantEmail = lower(p.restaurantEmail);
  if (!restaurantEmail) return { success: false, error: "البريد الإلكتروني للمطعم مطلوب" };

  // ===== 6) التحقق من التوكن =====
  const tc = await requireValidToken(token);
  if (!tc.valid) return { success: false, authError: true, error: tc.reason + " — يرجى تسجيل الدخول مجدداً" };
  if (tc.email && lower(tc.email) !== restaurantEmail) return { success: false, authError: true, error: "التوكن لا يطابق المستخدم" };

  const e = restaurantEmail;
  await ensureRestaurant(e);
  let ctx: Ctx;
  try { ctx = await buildCtx(e, tc.staffId || null, token); }
  catch (err) { if (err instanceof AuthErr) return { success: false, authError: true, error: err.message }; throw err; }

  // ===== 7) نظام التشغيل (الباقات) =====
  if (NEW_FNS[fn]) {
    try { return await NEW_FNS[fn](ctx, p); }
    catch (err) {
      if (err instanceof PlanErr) return planErrorResponse(err.feature);
      if (err instanceof AuthErr) return { success: false, authError: true, error: err.message };
      if (err instanceof UserError) return { success: false, error: err.message };
      throw err;
    }
  }
  // ===== 8) الدوال الأصلية: صلاحيات الموظفين + السجل =====
  const lp = LEGACY_PERM[fn];
  if (lp && !ctx.isOwner) {
    if (lp[0] === "__owner" || !lp.some((x) => can(ctx, x))) return { success: false, error: "لا تملك صلاحية لهذا الإجراء" };
  }
  if (fn === "getAllData" && !ctx.isOwner && !can(ctx, "costing")) {
    const st = await getSettings(e); const r = await getRestaurant(e);
    return { success: true, materials: [], recipes: [], restaurantName: r?.name || "", wastePercent: st.wastePercent, foodCostPercent: st.foodCostPercent, currency: st.currency, minMarginPercent: st.minMarginPercent, menuData: {}, share: await shareInfo(e), limited: true };
  }
  if (fn === "publishSharePage") return await publishSharePage(e);
  const out = await legacy(fn, e, p);
  if (LEGACY_LOG[fn] && out && out.success !== false && out.status !== "error" && (has(ctx, "activity"))) {
    await logAct(ctx, LEGACY_LOG[fn], str(p.name || p.recipeName || p.newName || p.materialName || p.id || ""));
  }
  return out;
}

async function legacy(fn: string, e: string, p: P): Promise<any> {
  switch (fn) {
    case "exportFullBackup": return await exportBackup(e, "full-r4");
    case "getFullBackupImage": return await backupImage(e, p);
    case "restoreFullBackup": return await restoreBackup(e, p, "full-r4");
    case "restoreSnapshot": return await restoreSnapshot(e, p);
    case "listSnapshots": return await listSnapshots(e);
    case "getAllData": return await getAllData(e);
    case "getAllMaterials": return await getAllMaterials(e);
    case "addMaterial": return await addMaterial(e, p);
    case "deleteMaterial": return await deleteMaterial(e, p.materialId);
    case "updateMaterial": return await updateMaterial(e, p);
    case "getAllRecipes": return await getAllRecipes(e);
    case "addRecipe": return await addRecipe(e, p.recipeName);
    case "deleteRecipe": return await deleteRecipe(e, p.recipeName);
    case "getRecipeIngredients": return await getRecipeIngredients(e, p.recipeName);
    case "saveRecipeIngredients": return await saveRecipeIngredients(e, p.recipeName, p.ingredients);
    case "updateRestaurantName": return await updateRestaurantName(e, p.name);
    case "getSettings": return await getSettings(e);
    case "updateSettings": return await updateSettings(e, p);
    case "renameRecipe": return await renameRecipe(e, p);
    case "getReviews": return await getReviews(e);
    case "getDashboardData": return await getDashboardData(e);
    case "getPriceHistory": return await getPriceHistory(e, p.materialId);
    case "getMaterialPriceChanges": return await getMaterialPriceChanges(e);
    case "updateRecipeSellingPrice": return await updateRecipeSellingPrice(e, p);
    case "addSale": return await addSale(e, p);
    case "getSales": return await getSales(e, p);
    case "getSalesSummary": return await getSalesSummary(e, p);
    case "deleteSale": return await deleteSale(e, p);
    case "getMenuData": return await getMenuData(e);
    case "saveMenuData": return await saveMenuData(e, p);
    case "getDigitalMenu": return await getDigitalMenu(e);
    case "saveDigitalMenu": return await saveDigitalMenu(e, p);
    case "saveMenuBanners": return await saveMenuBanners(e, p);
    case "uploadMenuImage": return await uploadMenuImage(e, p);
    case "getMenuOrders": return await getMenuOrders(e, p);
    case "updateMenuOrderStatus": return await updateMenuOrderStatus(e, p);
    case "deleteMenuOrder": return await deleteMenuOrder(e, p);
    default: return { success: false, error: "دالة غير معروفة: " + fn };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  let result: any;
  try {
    if (!DB_URL) throw new Error("SUPABASE_DB_URL غير متوفر في بيئة الدالة");
    result = await handle(await parseParams(req));
  } catch (e) {
    console.error(e);
    result = { success: false, status: "error", error: errMsg(e), message: errMsg(e) };
  }
  return new Response(JSON.stringify(result), { status: 200, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
});
