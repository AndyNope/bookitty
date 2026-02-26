<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

set_cors_headers();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

$userId = require_auth();

$pdo  = get_db();
$stmt = $pdo->prepare('SELECT id, email, name FROM users WHERE id = ?');
$stmt->execute([$userId]);
$user = $stmt->fetch();

if (!$user) {
    http_response_code(404);
    echo json_encode(['error' => 'Benutzer nicht gefunden']);
    exit;
}

echo json_encode([
    'id'    => (int) $user['id'],
    'email' => $user['email'],
    'name'  => $user['name'],
]);
