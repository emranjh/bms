<?php
// اطلاعات اتصال به دیتابیس
$host = 'localhost';
$username = 'root';
$password = '';
$dbname = 'bms_project';
$conn = new mysqli($host, $username, $password, $dbname);
if ($conn->connect_error) {
    die("خطا در اتصال به دیتابیس: " . $conn->connect_error);
}
$conn->set_charset("utf8mb4");

// ==========================================
// ۱. خواندن لیست پیش‌فاکتورها
// ==========================================
$sql = "SELECT * FROM invoices ORDER BY id DESC";
$result = $conn->query($sql);
$invoices = [];
if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $invoices[] = $row;
    }
}

// خواندن محصولات برای تبدیل آی‌دی محصولات به نام آن‌ها
$prod_sql = "SELECT id, product_name AS name, price FROM products";
$prod_result = $conn->query($prod_sql);
$products_map = [];
if ($prod_result && $prod_result->num_rows > 0) {
    while ($p = $prod_result->fetch_assoc()) {
        $products_map[$p['id']] = $p['name'];
    }
}

// ==========================================
// ۲. خواندن لیست رزروهای مشاوره
// ==========================================
$apt_sql = "SELECT * FROM appointments ORDER BY id DESC";
$apt_result = $conn->query($apt_sql);
$appointments = [];
if ($apt_result && $apt_result->num_rows > 0) {
    while ($row = $apt_result->fetch_assoc()) {
        $appointments[] = $row;
    }
}

// ==========================================
// . تابع تبدیل تاریخ میلادی به شمسی (فارسی)
// ==========================================
function gregorian_to_jalali($gy, $gm, $gd) {
    $g_d_m = array(0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334);
    $gy2 = ($gm > 2) ? ($gy + 1) : $gy;
    $days = 355666 + (365 * $gy) + floor(($gy2 + 3) / 4) - floor(($gy2 + 99) / 100) + floor(($gy2 + 399) / 400) + $gd + $g_d_m[$gm - 1];
    $jy = -1595 + (33 * floor($days / 12053));
    $days %= 12053;
    $jy += 4 * floor($days / 1461);
    $days %= 1461;
    if ($days > 365) {
        $jy += floor(($days - 1) / 365);
        $days = ($days - 1) % 365;
    }
    $jm = ($days < 186) ? 1 + floor($days / 31) : 7 + floor(($days - 186) / 30);
    $jd = 1 + (($days < 186) ? ($days % 31) : (($days - 186) % 30));
    return array($jy, $jm, $jd);
}

function format_persian_datetime($datetime_str) {
    if (!$datetime_str || $datetime_str == '0000-00-00 00:00:00') return 'نامشخص';
    $time = strtotime($datetime_str);
    $gy = date('Y', $time);
    $gm = date('m', $time);
    $gd = date('d', $time);
    $gh = date('H', $time);
    $gmin = date('i', $time);
    list($jy, $jm, $jd) = gregorian_to_jalali($gy, $gm, $gd);
    $j_months = ['', 'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
    return sprintf('%d %s %d - ساعت %02d:%02d', $jd, $j_months[$jm], $jy, $gh, $gmin);
}

function get_status_badge($status) {
    if ($status == 'confirmed') return '<span class="status-badge status-confirmed"><i class="bi bi-check-circle-fill"></i> تأیید شده</span>';
    if ($status == 'cancelled') return '<span class="status-badge status-cancelled"><i class="bi bi-x-circle-fill"></i> لغو شده</span>';
    return '<span class="status-badge status-pending"><i class="bi bi-clock-fill"></i> در انتظار</span>';
}
?>
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>پنل مدیریت - سامانه BMS</title>
    <link href="https://cdn.jsdelivr.net/gh/rastinfar/vazirmatn-font@v33.003/Vazirmatn-font-face.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <style>
        body {
            font-family: 'Vazirmatn', sans-serif;
            background-color: #f1f5f9;
            margin: 0;
            padding: 30px 20px;
            direction: rtl;
        }
        .container {
            max-width: 1300px;
            margin: 0 auto;
        }
        .back-link {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 25px;
            text-decoration: none;
            background: #475569;
            color: white;
            padding: 10px 18px;
            border-radius: 8px;
            font-size: 14px;
            transition: background 0.2s;
        }
        .back-link:hover { background: #334155; }
        
        .section-card {
            background: #fff;
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.05);
            margin-bottom: 30px;
        }
        .section-title {
            color: #1e293b;
            font-size: 20px;
            font-weight: 700;
            margin: 0 0 20px 0;
            display: flex;
            align-items: center;
            gap: 10px;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 12px;
        }
        .section-title i { color: #3b82f6; }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
        }
        th, td {
            border: 1px solid #e2e8f0;
            padding: 12px 15px;
            text-align: center;
            vertical-align: middle;
        }
        th {
            background-color: #f8fafc;
            color: #475569;
            font-weight: 700;
        }
        tr:nth-child(even) { background-color: #fcfcfc; }
        tr:hover { background-color: #f1f5f9; }
        .zone-group {
            margin-bottom: 8px;
            background: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            overflow: hidden;
            text-align: right;
        }
        .zone-title {
            background: #f8fafc;
            padding: 6px 10px;
            font-weight: bold;
            color: #0f172a;
            font-size: 13px;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .zone-items-list {
            list-style: none;
            margin: 0;
            padding: 6px 12px;
            font-size: 13px;
        }
        .zone-items-list li {
            padding: 4px 0;
            display: flex;
            justify-content: space-between;
            color: #334155;
            border-bottom: 1px dashed #f1f5f9;
        }
        .zone-items-list li:last-child { border-bottom: none; }
        
        .price-badge {
            font-weight: bold;
            color: #16a34a;
            background: #dcfce7;
            padding: 5px 10px;
            border-radius: 6px;
            display: inline-block;
        }
        /* استایل‌های وضعیت رزرو */
        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }
        .status-pending { background: #fef3c7; color: #92400e; }
        .status-confirmed { background: #dcfce7; color: #166534; }
        .status-cancelled { background: #fee2e2; color: #991b1b; }
        .empty-state {
            text-align: center;
            padding: 30px;
            color: #64748b;
            font-size: 15px;
        }
        .empty-state i {
            font-size: 32px;
            display: block;
            margin-bottom: 10px;
            color: #cbd5e1;
        }
        /* استایل دکمه‌های PDF */
        .pdf-btn {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 6px 12px;
            border-radius: 6px;
            text-decoration: none;
            font-size: 12px;
            font-weight: 600;
            transition: all 0.2s;
        }
        .pdf-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .pdf-download {
            background: #3b82f6;
            color: #fff;
        }
        .pdf-download:hover {
            background: #2563eb;
        }
        .pdf-generate {
            background: #10b981;
            color: #fff;
        }
        .pdf-generate:hover {
            background: #059669;
        }
    </style>
</head>
<body>
    <div class="container">
        <a href="../index.php" class="back-link"><i class="bi bi-arrow-right"></i> بازگشت به سایت اصلی (ماشین‌حساب)</a>
        
        <!-- ========================================== -->
        <!-- بخش ۱: درخواست‌های مشاوره رایگان -->
        <!-- ========================================== -->
        <div class="section-card">
            <h2 class="section-title"><i class="bi bi-calendar2-check"></i> درخواست‌های رزرو مشاوره رایگان</h2>
            <table>
                <thead>
                    <tr>
                        <th style="width: 5%;">شناسه</th>
                        <th style="width: 20%;">نام مشتری</th>
                        <th style="width: 15%;">شماره تماس</th>
                        <th style="width: 25%;">تاریخ و ساعت رزرو (شمسی)</th>
                        <th style="width: 20%;">توضیحات</th>
                        <th style="width: 15%;">وضعیت</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (count($appointments) > 0): ?>
                        <?php foreach ($appointments as $apt): ?>
                            <tr>
                                <td><?php echo $apt['id']; ?></td>
                                <td><?php echo htmlspecialchars($apt['customer_name'], ENT_QUOTES, 'UTF-8'); ?></td>
                                <td dir="ltr"><?php echo htmlspecialchars($apt['customer_phone'], ENT_QUOTES, 'UTF-8'); ?></td>
                                <td style="font-weight: 600; color: #1e293b;">
                                    <?php 
                                        $apt_datetime = $apt['appointment_date'] . ' ' . $apt['appointment_time'];
                                        echo format_persian_datetime($apt_datetime); 
                                    ?>
                                </td>
                                <td style="text-align: right; font-size: 13px; color: #475569;">
                                    <?php echo htmlspecialchars($apt['notes'] ?: 'بدون توضیحات', ENT_QUOTES, 'UTF-8'); ?>
                                </td>
                                <td>
                                    <?php echo get_status_badge($apt['status']); ?>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <tr>
                            <td colspan="6">
                                <div class="empty-state">
                                    <i class="bi bi-inbox"></i>
                                    هنوز هیچ درخواست مشاوره‌ای ثبت نشده است.
                                </div>
                            </td>
                        </tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>

        <!-- ========================================== -->
        <!-- بخش ۲: پیش‌فاکتورهای ثبت شده -->
        <!-- ========================================== -->
        <div class="section-card">
            <h2 class="section-title"><i class="bi bi-receipt"></i> پیش‌فاکتورهای ثبت شده</h2>
            <table>
                <thead>
                    <tr>
                        <th style="width: 5%;">شناسه</th>
                        <th style="width: 15%;">نام مشتری</th>
                        <th style="width: 15%;">شماره تماس</th>
                        <th style="width: 15%;">قیمت کل (تومان)</th>
                        <th style="width: 30%;">تجهیزات انتخابی به تفکیک فضا</th>
                        <th style="width: 10%;">تاریخ ثبت (شمسی)</th>
                        <th style="width: 10%;">عملیات</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (count($invoices) > 0): ?>
                        <?php foreach ($invoices as $inv): ?>
                            <tr>
                                <td><?php echo $inv['id']; ?></td>
                                <td><?php echo htmlspecialchars($inv['customer_name'], ENT_QUOTES, 'UTF-8'); ?></td>
                                <td dir="ltr"><?php echo htmlspecialchars($inv['customer_phone'], ENT_QUOTES, 'UTF-8'); ?></td>
                                <td>
                                    <span class="price-badge">
                                        <?php echo number_format((float)$inv['total_price']); ?>
                                    </span>
                                </td>
                                <td style="text-align: right;">
                                    <?php 
                                        $zones_data = json_decode($inv['items_json'], true);
                                        if (!empty($zones_data) && is_array($zones_data)) {
                                            foreach ($zones_data as $zone_name => $products) {
                                                if (!is_array($products) || empty($products)) continue;
                                                echo '<div class="zone-group">';
                                                echo '<div class="zone-title"><i class="bi bi-geo-alt-fill" style="color:#d97706;"></i> ' . htmlspecialchars($zone_name, ENT_QUOTES, 'UTF-8') . '</div>';
                                                echo '<ul class="zone-items-list">';
                                                foreach ($products as $p_id => $qty) {
                                                    $p_name = isset($products_map[$p_id]) ? $products_map[$p_id] : "محصول نامشخص (شناسه: $p_id)";
                                                    echo '<li><span>' . htmlspecialchars($p_name, ENT_QUOTES, 'UTF-8') . '</span> <strong>' . number_format(intval($qty)) . ' عدد</strong></li>';
                                                }
                                                echo '</ul></div>';
                                            }
                                        } else {
                                            echo '<span style="color: #ef4444;">داده‌ای ثبت نشده</span>';
                                        }
                                    ?>
                                </td>
                                <td style="font-size: 13px; color: #475569; font-weight: 500;">
                                    <?php echo format_persian_datetime($inv['created_at']); ?>
                                </td>
                                <td>
                                    <?php 
                                    $pdf_path = $inv['pdf_path'] ?? '';
                                    $full_pdf_path = __DIR__ . '/../' . $pdf_path;
                                    if (!empty($pdf_path) && file_exists($full_pdf_path)): 
                                    ?>
                                        <a href="../<?php echo htmlspecialchars($pdf_path); ?>" 
                                           target="_blank"
                                           class="pdf-btn pdf-download">
                                            <i class="bi bi-file-earmark-pdf-fill"></i> دانلود PDF
                                        </a>
                                    <?php else: ?>
                                        <a href="../generate_invoice_pdf.php?id=<?php echo $inv['id']; ?>&save=1" 
                                           target="_blank"
                                           class="pdf-btn pdf-generate">
                                            <i class="bi bi-file-earmark-pdf"></i> ساخت PDF
                                        </a>
                                    <?php endif; ?>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <tr>
                            <td colspan="7">
                                <div class="empty-state">
                                    <i class="bi bi-inbox"></i>
                                    هنوز هیچ پیش‌فاکتوری ثبت نشده است!
                                </div>
                            </td>
                        </tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</body>
</html>