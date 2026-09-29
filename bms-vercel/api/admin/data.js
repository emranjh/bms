import { getDb } from '../../lib/db.js';
import { requireAdmin } from '../../lib/auth.js';
import { items } from '../../lib/catalog.js';

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  try {
    const sql = await getDb();
    const id = Number(req.query?.invoice);
    const names = Object.fromEntries([...items].map(([k, v]) => [k, v.name]));

    if (id > 0) {
      const rows = await sql.query('SELECT * FROM invoices WHERE id = $1', [id]);
      if (!rows.length) return res.status(404).json({ error: 'پیش‌فاکتوری با این شناسه یافت نشد.' });
      return res.status(200).json({ invoice: rows[0], names });
    }

    const [appointments, invoices] = await Promise.all([
      sql.query(`SELECT id, customer_name, customer_phone, appointment_date::text AS appointment_date,
                        appointment_time, notes, status, created_at FROM appointments ORDER BY id DESC`),
      sql.query('SELECT * FROM invoices ORDER BY id DESC'),
    ]);
    res.status(200).json({ appointments, invoices, names });
  } catch (e) {
    console.error('admin data failed', e);
    res.status(500).json({ error: 'خطا در خواندن اطلاعات از دیتابیس.' });
  }
}
