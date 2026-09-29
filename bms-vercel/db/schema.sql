-- جداول به‌صورت خودکار توسط API ساخته می‌شوند؛ این فایل فقط برای مرجع/اجرای دستی است.
CREATE TABLE IF NOT EXISTS invoices (
  id             SERIAL PRIMARY KEY,
  customer_name  TEXT           NOT NULL,
  customer_phone TEXT           NOT NULL,
  total_price    NUMERIC(14, 0) NOT NULL,
  items_json     JSONB          NOT NULL,
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS appointments (
  id               SERIAL PRIMARY KEY,
  customer_name    TEXT        NOT NULL,
  customer_phone   TEXT        NOT NULL,
  appointment_date DATE        NOT NULL,
  appointment_time TEXT        NOT NULL,
  notes            TEXT,
  status           TEXT        NOT NULL DEFAULT 'pending',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS appointments_slot_idx ON appointments (appointment_date, appointment_time);
