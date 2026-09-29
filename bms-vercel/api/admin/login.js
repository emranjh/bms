import { checkPassword, sessionCookie } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.ADMIN_PASSWORD) return res.status(500).json({ error: 'ADMIN_PASSWORD روی سرور تنظیم نشده است.' });
  if (!checkPassword(req.body?.password)) {
    await new Promise((r) => setTimeout(r, 500)); // کند کردن حدس رمز
    return res.status(401).json({ error: 'رمز عبور نادرست است.' });
  }
  res.setHeader('Set-Cookie', sessionCookie());
  res.status(200).json({ ok: true });
}
