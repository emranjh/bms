const $ = (id) => document.getElementById(id);
(async () => {
  const id = new URLSearchParams(location.search).get('id');
  const r = await fetch('/api/admin/data?invoice=' + encodeURIComponent(id || ''));
  if (r.status === 401) { location.href = '/admin/'; return; }
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { $('err').style.display = 'block'; $('err').textContent = d.error || 'خطا'; return; }
  const { invoice: inv, names } = d;
  $('invId').textContent = inv.id;
  $('cName').textContent = inv.customer_name;
  $('cPhone').textContent = inv.customer_phone;
  $('total').textContent = Number(inv.total_price).toLocaleString('en-US');
  const rows = [];
  for (const [zone, prods] of Object.entries(inv.items_json || {})) {
    if (!prods || typeof prods !== 'object') continue;
    for (const [pid, qty] of Object.entries(prods)) {
      const tr = document.createElement('tr');
      [zone, names[pid] || `محصول ${pid}`, `${parseInt(qty, 10) || 0} عدد`].forEach((t) => { const td = document.createElement('td'); td.textContent = t; tr.appendChild(td); });
      rows.push(tr);
    }
  }
  if (!rows.length) { const tr = document.createElement('tr'); tr.innerHTML = '<td colspan="3">اقلامی یافت نشد.</td>'; rows.push(tr); }
  $('rows').replaceChildren(...rows);
  $('box').style.display = '';
  document.title = 'پیش‌فاکتور شماره ' + inv.id;
  window.onload = null; setTimeout(() => window.print(), 300);
})();
