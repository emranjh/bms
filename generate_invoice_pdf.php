<?php
// ۱. تنظیمات اتصال به دیتابیس
$host = 'localhost';
$username = 'root';
$password = '';
$dbname = 'bms_project';

$conn = new mysqli($host, $username, $password, $dbname);
if ($conn->connect_error) {
    die("خطا در اتصال به دیتابیس: " . $conn->connect_error);
}
$conn->set_charset("utf8mb4");

// ۲. دریافت ID پیش‌فاکتور
$invoice_id = isset($_GET['id']) ? intval($_GET['id']) : 0;
if ($invoice_id <= 0) {
    die("شناسه پیش‌فاکتور معتبر نیست.");
}

// ۳. دریافت اطلاعات پیش‌فاکتور
$stmt = $conn->prepare("SELECT * FROM invoices WHERE id = ?");
$stmt->bind_param("i", $invoice_id);
$stmt->execute();
$result = $stmt->get_result();
$invoice = $result->fetch_assoc();
$stmt->close();

if (!$invoice) {
    die("پیش‌فاکتوری با این شناسه یافت نشد.");
}

// ۴. دریافت نام محصولات
$prod_result = $conn->query("SELECT id, product_name AS name FROM products");
$products_map = [];
if ($prod_result && $prod_result->num_rows > 0) {
    while ($p = $prod_result->fetch_assoc()) {
        $products_map[$p['id']] = $p['name'];
    }
}

$items = json_decode($invoice['items_json'], true) ?: [];
?>
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>پیش‌فاکتور شماره <?php echo $invoice['id']; ?></title>
    <link href="https://cdn.jsdelivr.net/gh/rastinfar/vazirmatn-font@v33.003/Vazirmatn-font-face.css" rel="stylesheet">
    <style>
        body {
            font-family: 'Vazirmatn', sans-serif;
            padding: 30px;
            background: #fff;
            color: #1e293b;
            direction: rtl;
        }
        .invoice-box {
            max-width: 800px;
            margin: auto;
            border: 1px solid #cbd5e1;
            padding: 25px;
            border-radius: 10px;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #3b82f6;
            padding-bottom: 15px;
            margin-bottom: 20px;
        }
        .info-table, .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .info-table td {
            padding: 6px;
            font-size: 14px;
        }
        .items-table th, .items-table td {
            border: 1px solid #cbd5e1;
            padding: 10px;
            text-align: center;
            font-size: 13px;
        }
        .items-table th {
            background-color: #f1f5f9;
        }
        .total-price {
            background: #dcfce7;
            color: #15803d;
            font-weight: bold;
            padding: 10px;
            border-radius: 6px;
            text-align: left;
            font-size: 16px;
        }
        @media print {
            body { padding: 0; }
            .invoice-box { border: none; }
        }
    </style>
</head>
<body>

<div class="invoice-box">
    <div class="header">
        <h2>پیش‌فاکتور تجهیزات هوشمندسازی (BMS)</h2>
        <p>شماره فاکتور: <?php echo $invoice['id']; ?></p>
    </div>

    <table class="info-table">
        <tr>
            <td><strong>نام مشتری:</strong> <?php echo htmlspecialchars($invoice['customer_name']); ?></td>
            <td><strong>شماره تماس:</strong> <?php echo htmlspecialchars($invoice['customer_phone']); ?></td>
        </tr>
    </table>

    <table class="items-table">
        <thead>
            <tr>
                <th>فضا / زون</th>
                <th>نام تجهیز</th>
                <th>تعداد</th>
            </tr>
        </thead>
        <tbody>
            <?php 
            if (!empty($items)) {
                foreach ($items as $zone => $prods) {
                    if (!is_array($prods)) continue;
                    foreach ($prods as $p_id => $qty) {
                        $p_name = isset($products_map[$p_id]) ? $products_map[$p_id] : "محصول $p_id";
                        echo "<tr>";
                        echo "<td>" . htmlspecialchars($zone) . "</td>";
                        echo "<td>" . htmlspecialchars($p_name) . "</td>";
                        echo "<td>" . intval($qty) . " عدد</td>";
                        echo "</tr>";
                    }
                }
            } else {
                echo "<tr><td colspan='3'>اقلامی یافت نشد.</td></tr>";
            }
            ?>
        </tbody>
    </table>

    <div class="total-price">
        مبلغ کل: <?php echo number_format((float)$invoice['total_price']); ?> تومان
    </div>
</div>

<script>
    window.onload = function() {
        window.print();
    };
</script>

</body>
</html>