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
async function requireValidToken(token: string): Promise<{ valid: boolean; email?: string; reason?: string }> {
  if (!token) return { valid: false, reason: "التوكن مطلوب" };
  const rows = await sql`select email, expires_at from fc_sessions where token = ${token}`;
  if (rows.length) {
    if (new Date(rows[0].expires_at) < new Date()) {
      await sql`delete from fc_sessions where token = ${token}`;
      return { valid: false, reason: "انتهت صلاحية الجلسة" };
    }
    return { valid: true, email: rows[0].email };
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
  await ensureRestaurant(row.email);
  return { status: "success", name: row.full_name || row.email, daysLeft, email: row.email, token: session.token, sessionExpiry: session.expiry };
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
    await sql`insert into fc_users (email, password_hash, expiry_date, full_name) values (${email}, ${hash}, ${expiry.toISOString()}::timestamptz, ${fullName || email.split("@")[0]})`;
    await ensureRestaurant(email);
    return { status: "success", message: "تم إنشاء الحساب بنجاح! ", loginUrl: "index.html" };
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
      return d;
    });
    if (!result) return { status: "error", message: "معرّف العملية مستخدم مسبقًا" };
    const f = fmtGmt3(result);
    return { status: "success", newExpiry: f, message: "تم تجديد الاشتراك حتى " + f };
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
    return {
      status: "success",
      data: rows.map((r: any) => {
        const exp = new Date(r.expiry_date);
        return { username: r.email, fullName: r.full_name || r.email, expiryDate: fmtGmt3(exp), daysLeft: Math.ceil((exp.getTime() - today) / 864e5), platformKey: "menuEngineering", platform: "هندسة المينيو", frozen: !!r.frozen };
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
    await sql`insert into fc_users (email, password_hash, expiry_date, full_name) values (${email}, ${await hashPassword(password)}, ${expiry.toISOString()}::timestamptz, ${str(p.fullName) || email})`;
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
    const email = lower(p.restaurantEmail);
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
  return { success: true, materials, recipes: rd.recipes, restaurantName: rd.restaurantName, wastePercent: st.wastePercent, foodCostPercent: st.foodCostPercent, currency: st.currency, minMarginPercent: st.minMarginPercent, menuData: mr.success ? mr.menuData || {} : {} };
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
      menuSchema: 3, restaurantName: name, bannerProtocol: 5, bannerRevision: b.revision,
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
      restaurantEmail: email, bannerProtocol: 5,
    };
  } catch (e) { return { success: false, error: errMsg(e) }; }
}
async function savePublicOrder(email: string, p: P) {
  try {
    if (!(await getRestaurant(email))) return { success: false, error: "المطعم غير موجود" };
    let items = parseJSON<any>(p.items, []);
    if (!Array.isArray(items) || !items.length) return { success: false, error: "الطلب فارغ" };
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
  if (fn === "getPublicMenu") { const e = lower(p.restaurantEmail || p.email); return e ? await getPublicMenu(e) : { success: false, error: "البريد مطلوب" }; }
  if (fn === "savePublicOrder") { const e = lower(p.restaurantEmail || p.email); return e ? await savePublicOrder(e, p) : { success: false, error: "البريد مطلوب" }; }

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
