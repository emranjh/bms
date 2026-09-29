import { getDb } from '../lib/db.js';

const TZ = 'Asia/Tehran';
const SLOTS = new Set(Array.from({ length: 9 }, (_, i) => String(9 + i).padStart(2, '0') + ':00'));
const CAPACITY = 3; // حداکثر رزرو در هر ساعت

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const b = req.body && typeof req.body === 'object' ? req.body : {};
  const name = String(b.apt_name ?? '').trim().slice(0, 200);
  const phone = String(b.apt_phone ?? '').trim();
  const date = String(b.apt_date ?? '').trim();
  const time = String(b.apt_time ?? '').trim();
  const notes = String(b.apt_notes ?? '').trim().slice(0, 2000);

  const errors = [];
  if (name.length < 3) errors.push('نام معتبر وارد کنید.');
  if (!/^09\d{9}$/.test(phone)) errors.push('شماره تماس معتبر نیست.');
  const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date + 'T00:00:00Z'));
  if (!dateOk) errors.push('تاریخ معتبر نیست.');
  if (!/^\d{2}:\d{2}$/.test(time) || !SLOTS.has(time)) errors.push('ساعت معتبر نیست.');

  if (!errors.length) {
    const nowTehran = new Date().toLocaleString('sv-SE', { timeZone: TZ }).slice(0, 16); // YYYY-MM-DD HH:MM
    if (`${date} ${time}` < nowTehran) errors.push('نمی‌توانید زمان گذشته را رزرو کنید.');
    if (new Date(date + 'T00:00:00Z').getUTCDay() === 5) errors.push('جمعه‌ها روز تعطیل است.');
  }
  if (errors.length) return res.status(400).json({ errors });

  try {
    const sql = await getDb();
    // بررسی ظرفیت و درج در یک دستور (جلوگیری از رزرو بیش از ظرفیت در درخواست‌های همزمان)
    const rows = await sql.query(
      `INSERT INTO appointments (customer_name, customer_phone, appointment_date, appointment_time, notes)
       SELECT $1::text, $2::text, $3::date, $4::text, $5::text
       WHERE (SELECT count(*) FROM appointments
              WHERE appointment_date = $3::date AND appointment_time = $4::text AND status <> 'cancelled') < ${CAPACITY}
       RETURNING id`,
      [name, phone, date, time, notes],
    );
    if (!rows.length) return res.status(409).json({ errors: ['ظرفیت این ساعت تکمیل شده است.'] });
    return res.status(201).json({ ok: true, message: 'رزرو شما با موفقیت ثبت شد! همکاران ما به‌زودی با شما تماس خواهند گرفت.' });
  } catch (e) {
    console.error('appointment insert failed', e);
    return res.status(500).json({ errors: ['خطا در ثبت رزرو. لطفاً دوباره تلاش کنید.'] });
  }
}
