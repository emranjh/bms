import products from '../data/products.json' with { type: 'json' };
import catalog from '../data/catalog.json' with { type: 'json' };

/** id -> { name, price } برای همهٔ محصولات (تاچ‌پنل‌ها + سایر دسته‌ها) */
export const items = new Map();
for (const p of products) items.set(Number(p.id), { name: p.product_name, price: Number(p.price) });
for (const c of Object.values(catalog.showcase))
  for (const p of c.products) items.set(Number(p.id), { name: p.name, price: Number(p.price) });

export const INSTALLATION_PERCENT = 0.1;
