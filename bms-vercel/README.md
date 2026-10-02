# BMS — Vercel version (no PHP)

Static front-end (`public/`) + Vercel Functions (`api/`, Node.js) + Postgres (Neon).

| Old (PHP)                      | New                                                   |
| ------------------------------ | ----------------------------------------------------- |
| `index.php` (server rendering) | `src/index.template.html` + `scripts/build.mjs` → `public/index.html` |
| products table (MySQL)         | `data/products.json`                                  |
| zones / showcase arrays        | `data/catalog.json`                                   |
| POST invoice / appointment     | `api/invoices.js`, `api/appointments.js`              |
| `admin/admin.php`              | `public/admin/` + `api/admin/*` (now password-protected) |
| `generate_invoice_pdf.php`     | `public/admin/invoice.html` (print → Save as PDF)     |

## Before first deploy
1. Put your real product names/prices in `data/products.json` (currently `price: 0` placeholders).
   Export from phpMyAdmin: `SELECT id, product_name, price FROM products;`
2. On Vercel: **Storage → Create → Neon (Postgres)** and connect it to the project (sets `DATABASE_URL`).
3. Vercel → Settings → Environment Variables: add `ADMIN_PASSWORD` (and optionally `SESSION_SECRET`).
4. Deploy. Tables are created automatically on first API call (`db/schema.sql` is just a reference).

## Deploy (Arch)
```sh
sudo pacman -S nodejs npm git
npm install
npx vercel          # first time: link/create project
npx vercel --prod
```
Or just push to GitHub and import the repo in Vercel (build command / output dir come from `vercel.json`).

Local dev: `cp .env.example .env`, fill values, `npx vercel dev`.

Admin panel: `/admin/`
