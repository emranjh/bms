/* جایگزین بخش‌های PHP: تقویم رزرو، پیام موفقیت، و ارسال فرم‌ها به API */
(function () {
  var TZ = 'Asia/Tehran';
  var DAY_NAMES = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه']; // ایندکس = getUTCDay

  // ---- تقویم ۱۴ روز آینده (جمعه‌ها تعطیل) بر اساس ساعت تهران
  var box = document.getElementById('calendarDays');
  if (box) {
    for (var i = 1; i <= 14; i++) {
      var ds = new Date(Date.now() + i * 864e5).toLocaleDateString('sv-SE', { timeZone: TZ });
      var dow = new Date(ds + 'T00:00:00Z').getUTCDay();
      var holiday = dow === 5;
      var el = document.createElement('div');
      el.className = 'calendar-day' + (holiday ? ' disabled holiday' : '');
      el.dataset.date = ds;
      if (!holiday) el.addEventListener('click', function () { selectDate(this); });
      el.innerHTML = '<div class="day-name">' + DAY_NAMES[dow] + '</div><div class="day-num">' + ds.slice(8) + '</div>';
      box.appendChild(el);
    }
  }

  // ---- پیام موفقیتِ یک‌بارمصرف بعد از ثبت پیش‌فاکتور
  try {
    var msg = sessionStorage.getItem('bms_flash');
    var alertEl = document.getElementById('successAlert');
    if (msg && alertEl) {
      sessionStorage.removeItem('bms_flash');
      alertEl.textContent = msg;
      alertEl.style.display = '';
    }
  } catch (e) {}

  function postJSON(url, body) {
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, data: d }; }); });
  }

  // ---- ثبت پیش‌فاکتور
  var invForm = document.getElementById('invoice-form');
  if (invForm) {
    invForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = invForm.querySelector('.submit-btn');
      var items = {};
      invForm.querySelectorAll('#hidden-items-container input').forEach(function (inp) {
        var m = inp.name.match(/^selected_items\[(.*)\]\[(\d+)\]$/);
        if (!m) return;
        (items[m[1]] = items[m[1]] || {})[m[2]] = Number(inp.value);
      });
      var payload = {
        customer_name: document.getElementById('customer_name').value.trim(),
        customer_phone: document.getElementById('customer_phone').value.trim(),
        total_price: Number(document.getElementById('hidden_total_price').value),
        items: items
      };
      if (btn) btn.disabled = true;
      postJSON('/api/invoices', payload).then(function (res) {
        if (!res.ok) throw new Error(res.data.error || 'خطا در ثبت پیش‌فاکتور');
        try { sessionStorage.setItem('bms_flash', res.data.message); } catch (e) {}
        location.reload();
      }).catch(function (err) {
        if (btn) btn.disabled = false;
        if (typeof showErrorModal === 'function')
          showErrorModal([{ fieldId: null, icon: 'bi-exclamation-circle-fill', label: 'ثبت پیش‌فاکتور', message: err.message }]);
        else alert(err.message);
      });
    });
  }

  // ---- رزرو مشاوره (از داخل هندلر فرم رزرو فراخوانی می‌شود)
  window.submitAppointment = function (name, phone, notes) {
    var date = selectedDate, time = selectedTime;
    postJSON('/api/appointments', { apt_name: name, apt_phone: phone, apt_date: date, apt_time: time, apt_notes: notes })
      .then(function (res) {
        if (!res.ok) {
          var list = res.data.errors || [res.data.error || 'خطا در ثبت رزرو'];
          showAppointmentErrorModal(list.map(function (m) {
            return { fieldId: 'apt_name', icon: 'bi-exclamation-circle-fill', label: 'رزرو مشاوره', message: m };
          }));
          return;
        }
        document.querySelectorAll('.step-content').forEach(function (s) { s.classList.remove('active'); });
        document.getElementById('successStep').classList.add('active');
        document.getElementById('successDate').textContent = date;
        document.getElementById('successTime').textContent = time;
        createConfetti();
      })
      .catch(function () {
        showAppointmentErrorModal([{ fieldId: 'apt_name', icon: 'bi-exclamation-circle-fill', label: 'رزرو مشاوره', message: 'ارتباط با سرور برقرار نشد. دوباره تلاش کنید.' }]);
      });
  };
})();
