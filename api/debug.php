<?php
// TEMPORARY debug script – DELETE after diagnosis!
require_once __DIR__ . '/config.php';
header('Content-Type: application/json; charset=utf-8');

$result = [];

// 1. PHP version
$result['php_version'] = PHP_VERSION;

// 2. Required extensions
foreach (['pdo', 'pdo_mysql', 'json', 'mbstring', 'openssl'] as $ext) {
    $result['ext_' . $ext] = extension_loaded($ext);
}

// 3. Config constants
$result['db_host'] = DB_HOST;
$result['db_name'] = DB_NAME;
$result['db_user'] = DB_USER;

// 4. DB connection
try {
    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', DB_HOST, DB_PORT, DB_NAME);
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $result['db_connected'] = true;

    // 5. Check tables
    $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    $result['tables'] = $tables;

    $expected = ['users', 'bookings', 'documents', 'templates', 'company_profiles'];
    foreach ($expected as $t) {
        $result['table_' . $t] = in_array($t, $tables);
    }
} catch (Exception $e) {
    $result['db_connected'] = false;
    $result['db_error']     = $e->getMessage();
}

// 6. Upload dir writable
$result['upload_dir_exists']   = is_dir(UPLOAD_DIR);
$result['upload_dir_writable'] = is_writable(UPLOAD_DIR);

echo json_encode($result, JSON_PRETTY_PRINT);
