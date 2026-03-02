<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

set_cors_headers();

$userId = require_auth();
$pdo    = get_db();
$method = $_SERVER['REQUEST_METHOD'];

// Auto-create table if missing
$pdo->exec('CREATE TABLE IF NOT EXISTS custom_accounts (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT NOT NULL,
    code       VARCHAR(20) NOT NULL,
    name       VARCHAR(255) NOT NULL,
    category_code VARCHAR(5) NOT NULL DEFAULT \'3\',
    UNIQUE KEY uq_user_code (user_id, code)
)');

if ($method === 'GET') {
    $stmt = $pdo->prepare('SELECT code, name, category_code FROM custom_accounts WHERE user_id = ? ORDER BY code ASC');
    $stmt->execute([$userId]);
    $rows = $stmt->fetchAll();
    echo json_encode(array_map(fn($r) => [
        'code'         => $r['code'],
        'name'         => $r['name'],
        'categoryCode' => $r['category_code'],
    ], $rows));

} elseif ($method === 'PUT') {
    // Upsert a single account
    $d = json_decode(file_get_contents('php://input'), true) ?? [];
    if (empty($d['code']) || empty($d['name'])) {
        http_response_code(400);
        echo json_encode(['error' => 'code and name required']);
        exit;
    }
    $pdo->prepare(
        'INSERT INTO custom_accounts (user_id, code, name, category_code)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), category_code=VALUES(category_code)'
    )->execute([$userId, $d['code'], $d['name'], $d['categoryCode'] ?? '3']);
    echo json_encode(['ok' => true]);

} elseif ($method === 'DELETE') {
    $d = json_decode(file_get_contents('php://input'), true) ?? [];
    if (empty($d['code'])) {
        http_response_code(400);
        echo json_encode(['error' => 'code required']);
        exit;
    }
    $pdo->prepare('DELETE FROM custom_accounts WHERE user_id = ? AND code = ?')
        ->execute([$userId, $d['code']]);
    echo json_encode(['ok' => true]);

} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
}
