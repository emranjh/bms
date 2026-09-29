import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
let sql;
let ready;

const DDL = [
  `CREATE TABLE IF NOT EXISTS invoices (
     id SERIAL PRIMARY KEY,
     customer_name TEXT NOT NULL,
     customer_phone TEXT NOT NULL,
     total_price NUMERIC(14,0) NOT NULL,
     items_json JSONB NOT NULL,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS appointments (
     id SERIAL PRIMARY KEY,
     customer_name TEXT NOT NULL,
     customer_phone TEXT NOT NULL,
     appointment_date DATE NOT NULL,
     appointment_time TEXT NOT NULL,
     notes TEXT,
     status TEXT NOT NULL DEFAULT 'pending',
     created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE INDEX IF NOT EXISTS appointments_slot_idx ON appointments (appointment_date, appointment_time)`,
];

/** اتصال به دیتابیس؛ در اولین فراخوانی جدول‌ها را (در صورت نبود) می‌سازد. */
export async function getDb() {
  if (!url) throw new Error('DATABASE_URL تنظیم نشده است');
  sql ??= neon(url);
  ready ??= (async () => {
    for (const stmt of DDL) await sql.query(stmt);
  })().catch((e) => {
    ready = undefined;
    throw e;
  });
  await ready;
  return sql;
}
