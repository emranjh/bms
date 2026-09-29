import crypto from 'node:crypto';

const COOKIE = 'bms_admin';
const MAX_AGE = 60 * 60 * 24 * 7; // ۷ روز

const secret = () => process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || '';
const hmac = (v) => crypto.createHmac('sha256', secret()).update(v).digest('hex');
const sha = (v) => crypto.createHash('sha256').update(String(v)).digest();

export function checkPassword(input) {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return false;
  return crypto.timingSafeEqual(sha(input ?? ''), sha(pw));
}

export function sessionCookie() {
  const exp = String(Math.floor(Date.now() / 1000) + MAX_AGE);
  return `${COOKIE}=${exp}.${hmac(exp)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${MAX_AGE}`;
}
export const clearCookie = () => `${COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;

export function isAdmin(req) {
  if (!secret()) return false;
  const m = (req.headers.cookie || '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (!m) return false;
  const [exp, sig] = m[1].split('.');
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false;
  const good = Buffer.from(hmac(exp));
  const got = Buffer.from(sig);
  return good.length === got.length && crypto.timingSafeEqual(good, got);
}

/** برای APIهای ادمین: اگر وارد نشده باشد ۴۰۱ برمی‌گرداند و false می‌دهد. */
export function requireAdmin(req, res) {
  if (isAdmin(req)) return true;
  res.status(401).json({ error: 'unauthorized' });
  return false;
}
