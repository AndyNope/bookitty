<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/auth.php';

set_cors_headers();
$companyId = effective_uid();
$pdo = get_db();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $pdo->prepare('SELECT extra_currencies_enabled FROM company_profiles WHERE user_id = ?');
    $stmt->execute([$companyId]);
    echo json_encode(['enabled' => (bool) $stmt->fetchColumn()]);
} elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!is_array($body) || !isset($body['enabled']) || !is_bool($body['enabled'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Ungültige Währungseinstellung.']);
        exit;
    }
    $stmt = $pdo->prepare('INSERT INTO company_profiles (user_id, extra_currencies_enabled) VALUES (?, ?) ON DUPLICATE KEY UPDATE extra_currencies_enabled = VALUES(extra_currencies_enabled)');
    $stmt->execute([$companyId, $body['enabled'] ? 1 : 0]);
    echo json_encode(['ok' => true]);
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
}