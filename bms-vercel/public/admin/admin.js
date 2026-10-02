const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
const TZ = 'Asia/Tehran';

// تاریخ شمسی با Intl (ارقام لاتین) — جایگزین gregorian_to_jalali در PHP
function persianDateTime(value, dateOnlyWithTime) {
  if (!value) return 'نامشخص';
  const d = dateOnlyWithTime ? new Date(`${value.date}T00:00:00Z`) : new Date(value);
  if (Number.isNaN(d.getTime())) return 'نامشخص';
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('fa-IR-u-ca-persian-nu-latn', {
      timeZone: dateOnlyWithTime ? 'UTC' : TZ, year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(d).map((p) => [p.type, p.value]),
  );
  const time = dateOnlyWithTime ? value.time : `${parts.hour}:${parts.minute}`;
  return `${parts.day} ${parts.month} ${parts.year} - ساعت ${time}`;
}

function statusBadge(s) {
  if (s === 'confirmed') return '<span class="status-badge status-confirmed"><i class="bi bi-check-circle-fill"></i> تأیید شده</span>';
  if (s === 'cancelled') return '<span class="status-badge status-cancelled"><i class="bi bi-x-circle-fill"></i> لغو شده</span>';
  return '<span class="status-badge status-pending"><i class="bi bi-clock-fill"></i> در انتظار</span>';
}
const empty = (cols, text) => `<tr><td colspan="${cols}"><div class="empty-state"><i class="bi bi-inbox"></i> ${text}</div></td></tr>`;

function render({ appointments, invoices, names }) {
  $('aptBody').innerHTML = appointments.length
    ? appointments.map((a) => `<tr>
        <td>${a.id}</td><td>${esc(a.customer_name)}</td><td dir="ltr">${esc(a.customer_phone)}</td>
        <td style="font-weight:600;color:#1e293b;">${persianDateTime({ date: a.appointment_date, time: a.appointment_time }, true)}</td>
        <td style="text-align:right;font-size:13px;color:#475569;">${esc(a.notes || 'بدون توضیحات')}</td>
        <td>${statusBadge(a.status)}</td></tr>`).join('')
    : empty(6, 'هنوز هیچ درخواست مشاوره‌ای ثبت نشده است.');

  $('invBody').innerHTML = invoices.length
    ? invoices.map((inv) => {
        const zones = inv.items_json && typeof inv.items_json === 'object' ? Object.entries(inv.items_json) : [];
        const items = zones.filter(([, p]) => p && Object.keys(p).length).map(([zone, prods]) =>
          `<div class="zone-group"><div class="zone-title"><i class="bi bi-geo-alt-fill" style="color:#d97706;"></i> ${esc(zone)}</div><ul class="zone-items-list">` +
          Object.entries(prods).map(([pid, q]) => `<li><span>${esc(names[pid] || `محصول نامشخص (شناسه: ${pid})`)}</span> <strong>${Number(q).toLocaleString('en-US')} عدد</strong></li>`).join('') +
          '</ul></div>').join('') || '<span style="color:#ef4444;">داده‌ای ثبت نشده</span>';
        return `<tr>
          <td>${inv.id}</td><td>${esc(inv.customer_name)}</td><td dir="ltr">${esc(inv.customer_phone)}</td>
          <td><span class="price-badge">${Number(inv.total_price).toLocaleString('en-US')}</span></td>
          <td style="text-align:right;">${items}</td>
          <td style="font-size:13px;color:#475569;font-weight:500;">${persianDateTime(inv.created_at)}</td>
          <td><a href="/admin/invoice.html?id=${inv.id}" target="_blank" class="pdf-btn pdf-generate"><i class="bi bi-printer"></i> مشاهده / PDF</a></td></tr>`;
      }).join('')
    : empty(7, 'هنوز هیچ پیش‌فاکتوری ثبت نشده است!');
}

async function load() {
  const r = await fetch('/api/admin/data');
  if (r.status === 401) { $('panel').classList.add('hidden'); $('login').classList.remove('hidden'); return; }
  if (!r.ok) { alert((await r.json().catch(() => ({}))).error || 'خطا در دریافت اطلاعات'); return; }
  $('login').classList.add('hidden'); $('panel').classList.remove('hidden');
  render(await r.json());
}

$('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('loginError').textContent = '';
  const r = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: $('password').value }) });
  if (r.ok) { $('password').value = ''; load(); } else $('loginError').textContent = (await r.json().catch(() => ({}))).error || 'خطا در ورود';
});
$('logoutBtn').addEventListener('click', async () => { await fetch('/api/admin/logout', { method: 'POST' }); location.reload(); });
load();
