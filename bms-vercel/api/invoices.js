import { getDb } from '../lib/db.js';
import { items as catalog, INSTALLATION_PERCENT } from '../lib/catalog.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const b = req.body && typeof req.body === 'object' ? req.body : {};
  const name = String(b.customer_name ?? '').trim().slice(0, 200);
  const phone = String(b.customer_phone ?? '').trim();

  if (!name || !phone) return res.status(400).json({ error: 'لطفاً حداقل یک تجهیز انتخاب کرده و اطلاعات مشتری را کامل کنید.' });
  if (!/^09\d{9}$/.test(phone)) return res.status(400).json({ error: 'شماره تماس معتبر نیست.' });

  // فقط محصولاتی که واقعاً در کاتالوگ هستند و تعداد صحیح مثبت
  const selected = {};
  let base = 0;
  const zones = Object.entries(b.items && typeof b.items === 'object' ? b.items : {}).slice(0, 50);
  for (const [zoneRaw, prods] of zones) {
    const zone = String(zoneRaw).trim().slice(0, 100);
    if (!zone || !prods || typeof prods !== 'object') continue;
    for (const [pidRaw, qtyRaw] of Object.entries(prods)) {
      const pid = parseInt(pidRaw, 10);
      const qty = Math.min(Math.trunc(Number(qtyRaw)), 9999);
      const product = catalog.get(pid);
      if (!product || !(qty > 0)) continue;
      (selected[zone] ??= {})[pid] = qty;
      base += qty * product.price;
    }
  }
  if (!Object.keys(selected).length) return res.status(400).json({ error: 'لطفاً حداقل یک تجهیز انتخاب کنید.' });
  if (!(base > 0)) return res.status(400).json({ error: 'قیمت کل معتبر نیست.' });

  // قیمت را سرور حساب می‌کند؛ فقط «با هزینه نصب» یا «بدون نصب» پذیرفته می‌شود.
  const withInstall = Math.round(base * (1 + INSTALLATION_PERCENT));
  const claimed = Math.round(Number(b.total_price));
  const total = claimed === withInstall ? withInstall : base;

  try {
    const sql = await getDb();
    await sql.query(
      'INSERT INTO invoices (customer_name, customer_phone, total_price, items_json) VALUES ($1, $2, $3, $4::jsonb)',
      [name, phone, total, JSON.stringify(selected)],
    );
    return res.status(201).json({ ok: true, message: ' پیش‌فاکتور  شما با موفقیت  ثبت شد و به واحد فروش ارسال گردید  !' });
  } catch (e) {
    console.error('invoice insert failed', e);
    return res.status(500).json({ error: 'خطا در ثبت پیش‌فاکتور. لطفاً دوباره تلاش کنید.' });
  }
}
