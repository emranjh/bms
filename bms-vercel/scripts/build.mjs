// جایگزین بخش رندر سمت سرور index.php: قالب HTML + data/*.json  ->  public/index.html
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const catalog = JSON.parse(read('data/catalog.json'));
const products = JSON.parse(read('data/products.json'));

const esc = (v) =>
  String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
const num = (n) => Math.round(Number(n) || 0).toLocaleString('en-US');
const hasFile = (p) => !!p && existsSync(join(root, 'public', p));
const jsonAttr = (v) => esc(JSON.stringify(v));
// داخل <script> نباید </script> یا <!-- ظاهر شود
const jsonScript = (v) => JSON.stringify(v).replace(/</g, '\\u003c');

const showcase = { ...catalog.showcase };
showcase.panels = {
  ...catalog.panels,
  products: products.map((p) => ({ id: p.id, name: p.product_name, price: Number(p.price), image: p.image || '' })),
};

// ---- نقشه/لیست فضاها
const zoneButtons = catalog.zones
  .map((z) =>
    z.group && z.sub
      ? `<button type="button" class="zone-btn-compact zone-btn-group" data-zone-group="${esc(z.key)}" data-subzones="${esc(z.sub.map((s) => s.key).join(','))}" onclick="openBedroomDrawer()">
<i class="bi ${z.icon}"></i>
<span>${esc(z.title)}</span>
<span class="zone-count" data-count-for="${esc(z.key)}">0</span>
<i class="bi bi-chevron-left zone-btn-group-arrow"></i>
</button>`
      : `<button type="button" class="zone-btn-compact" data-zone="${esc(z.key)}" onclick="setActiveZone(this.dataset.zone)">
<i class="bi ${z.icon}"></i>
<span>${esc(z.title)}</span>
<span class="zone-count" data-count-for="${esc(z.key)}">0</span>
</button>`,
  )
  .join('\n');

const bedroom = catalog.zones.find((z) => z.group);
const bedroomOptions = bedroom.sub
  .map(
    (s) => `<button type="button" class="room-drawer-option" data-zone="${esc(s.key)}" onclick="selectBedroomOption(this.dataset.zone)">
<span class="room-drawer-option-icon"><i class="bi ${s.icon}"></i></span>
<span class="room-drawer-option-info">
<strong>${esc(s.title)}</strong>
<span>${esc(s.desc)}</span>
</span>
<span class="room-drawer-option-count" data-count-for="${esc(s.key)}">خالی</span>
<i class="bi bi-chevron-left"></i>
</button>`,
  )
  .join('\n');

// ---- محصولات دسته‌بندی «سایر محصولات»
const showcaseButtons = Object.entries(showcase)
  .map(
    ([key, c]) => `<button type="button" class="showcase-cat-btn" style="--cat-color:${esc(c.color)};" data-zone="${esc(c.title)}" onclick="scOpenAndLoad('${key}', ${jsonAttr(c.title)})">
<span class="showcase-cat-icon"><i class="bi ${c.icon}"></i></span>
<span class="showcase-cat-info">
<strong>${esc(c.title)}</strong>
<span>${esc(c.subtitle)} · ${c.products.length} محصول</span>
</span>
<span class="showcase-cat-badge" data-count-for="${esc(c.title)}"></span>
<span class="showcase-cat-arrow"><i class="bi bi-chevron-left"></i></span>
</button>`,
  )
  .join('\n');

const showcaseModals = Object.entries(showcase)
  .map(([key, c]) => {
    const cards = c.products
      .map((sp) => {
        const img = hasFile(sp.image) ? sp.image : '';
        return `<div class="sc-product-card">
<div class="sc-image-wrap">
${img ? `<img src="${esc(img)}" alt="${esc(sp.name)}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : ''}
<i class="bi ${c.fallback_icon}" style="${img ? 'display:none;' : 'display:flex;'}"></i>
</div>
<div class="sc-product-name">${esc(sp.name)}</div>
<div class="sc-product-price"><i class="bi bi-tag-fill"></i> <span>${num(sp.price)} تومان</span></div>
<div class="sc-qty-control">
<button type="button" class="sc-qty-btn" onclick="scChangeQty('${key}', ${sp.id}, -1)"><i class="bi bi-dash"></i></button>
<span class="sc-qty-val" data-pid="${sp.id}" data-qty="0">۰</span>
<button type="button" class="sc-qty-btn" onclick="scChangeQty('${key}', ${sp.id}, 1)"><i class="bi bi-plus"></i></button>
</div>
</div>`;
      })
      .join('\n');
    return `<div class="pd-modal-overlay" id="sc-overlay-${key}" onclick="if(event.target===this) closeShowcaseModal('${key}')">
<div class="pd-modal-box showcase-modal-box" onclick="event.stopPropagation()" style="--cat-color:${esc(c.color)};">
<button type="button" class="pd-modal-close" onclick="closeShowcaseModal('${key}')" aria-label="بستن"><i class="bi bi-x-lg"></i></button>
<div class="showcase-modal-header">
<span class="sc-modal-icon"><i class="bi ${c.icon}"></i></span>
<div>
<h4>${esc(c.title)}</h4>
<p>${esc(c.subtitle)}</p>
</div>
</div>
<div class="sc-products-grid" id="sc-modal-${key}">
${cards}
</div>
<div class="showcase-modal-footer">
<div class="sc-footer-total">جمع این دسته: <b id="sc-total-${key}">۰ تومان</b></div>
<button type="button" class="sc-confirm-btn" onclick="scConfirmCategory('${key}', ${jsonAttr(c.title)})"><i class="bi bi-bookmark-check"></i> افزودن به لیست نهایی</button>
</div>
</div>
</div>`;
  })
  .join('\n');

// ---- تاچ‌پنل‌ها (محصولات اصلی)
const productsSection = products.length
  ? `<div class="product-buttons-grid">
${products
  .map((p) => {
    const has = hasFile(p.image);
    return `<button type="button" class="product-select-btn" data-product-id="${p.id}" onclick="openProductModal(${p.id})" title="${esc(p.product_name)}">
<span class="product-select-qty-badge" data-select-qty-for="${p.id}">۰</span>
<span class="product-select-icon">
${has ? `<img src="${esc(p.image)}" alt="" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">\n<i class="bi bi-cpu-fill" style="display:none;"></i>` : '<i class="bi bi-cpu-fill"></i>'}
</span>
<span class="product-select-name">${esc(p.product_name)}</span>
</button>`;
  })
  .join('\n')}
</div>
${products
  .map((p) => {
    const has = hasFile(p.image);
    return `<div class="pd-modal-overlay" id="product-modal-${p.id}" onclick="if(event.target===this) closeProductModal(${p.id})">
<div class="pd-modal-box" onclick="event.stopPropagation()">
<button type="button" class="pd-modal-close" onclick="closeProductModal(${p.id})" aria-label="بستن"><i class="bi bi-x-lg"></i></button>
<div class="product-card" data-product-id="${p.id}">
<div class="product-badge"> انتخاب شده </div>
<div class="product-image-wrapper">
${has ? `<img src="${esc(p.image)}" alt="${esc(p.product_name)}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : ''}
<div class="product-image-placeholder" style="${has ? 'display:none;' : 'display:flex;'}">
<i class="bi bi-cpu-fill"></i>
<span>BMS</span>
</div>
<div class="product-image-badge">
<i class="bi bi-check-lg"></i> انتخاب شده
</div>
<div class="product-qty-badge" data-qty-for="${p.id}">۰</div>
</div>
<div class="product-info">
<strong class="product-name">${esc(p.product_name)}</strong>
<div class="product-price">
<i class="bi bi-tag-fill"></i>
<span>قیمت:</span>
<span class="product-price-amount">${num(p.price)} تومان</span>
</div>
</div>
<div class="quantity-control">
<button type="button" class="qty-btn" onclick="changeQty(this, -1)">
<i class="bi bi-dash"></i>
</button>
<input type="number" class="qty-input"
data-product-id="${p.id}"
data-price="${Number(p.price)}"
value="0" min="0" step="1"
oninput="updateCurrentZonePreview(); updateProductCard(this);">
<button type="button" class="qty-btn" onclick="changeQty(this, 1)">
<i class="bi bi-plus"></i>
</button>
</div>
</div>
</div>
</div>`;
  })
  .join('\n')}`
  : '<p class="no-products">هیچ محصولی یافت نشد!</p>';

// ---- داده‌های JSON برای جاوااسکریپت صفحه
const productMeta = {};
for (const p of products) productMeta[String(p.id)] = { name: p.product_name, price: Number(p.price), image: p.image || '' };
const showcaseMeta = {};
for (const c of Object.values(showcase))
  for (const sp of c.products) showcaseMeta[String(sp.id)] = { name: sp.name, price: Number(sp.price), image: hasFile(sp.image) ? sp.image : '' };
const zoneTitles = {};
for (const z of catalog.zones) {
  if (z.group && z.sub) for (const s of z.sub) zoneTitles[s.key] = s.title;
  else zoneTitles[z.key] = z.title;
}
const timeSlots = Array.from({ length: 9 }, (_, i) => String(9 + i).padStart(2, '0') + ':00');

const map = {
  ZONE_BUTTONS: zoneButtons,
  BEDROOM_OPTIONS: bedroomOptions,
  SHOWCASE_BUTTONS: showcaseButtons,
  SHOWCASE_MODALS: showcaseModals,
  PRODUCTS_SECTION: productsSection,
  PRODUCT_META_JSON: jsonScript(productMeta),
  SHOWCASE_META_JSON: jsonScript(showcaseMeta),
  ZONE_TITLES_JSON: jsonScript(zoneTitles),
  TIME_SLOTS_JSON: jsonScript(timeSlots),
  YEAR: String(new Date().getFullYear()),
};

let html = read('src/index.template.html');
html = html.replace(/\{\{([A-Z_]+)\}\}/g, (m, k) => (k in map ? map[k] : m));
const left = html.match(/\{\{[A-Z_]+\}\}/g);
if (left) throw new Error('Unreplaced placeholders: ' + [...new Set(left)].join(', '));

writeFileSync(join(root, 'public/index.html'), html);
console.log(`built public/index.html (${(html.length / 1024).toFixed(0)} KB)`);
if (products.some((p) => !(Number(p.price) > 0)))
  console.warn('⚠️  بعضی محصولات در data/products.json قیمت ندارند (price = 0). قیمت واقعی را وارد کنید.');
