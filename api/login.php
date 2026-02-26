<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/jwt.php';

set_cors_headers();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

$data  = json_decode(file_get_contents('php://input'), true) ?? [];
$email = trim($data['email']    ?? '');
$pass  = trim($data['password'] ?? '');

if (!$email || !$pass) {
    http_response_code(400);
    echo json_encode(['error' => 'E-Mail und Passwort erforderlich']);
    exit;
}

$pdo  = get_db();
$stmt = $pdo->prepare(
    'SELECT id, name, email, password_hash, email_confirmed FROM users WHERE email = ?'
);
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user || !password_verify($pass, $user['password_hash'])) {
    http_response_code(401);
    echo json_encode(['error' => 'E-Mail oder Passwort falsch']);
    exit;
}

if (!$user['email_confirmed']) {
    http_response_code(403);
    echo json_encode(['error' => 'Bitte bestätige zuerst deine E-Mail-Adresse. Schau in dein Postfach.']);
    exit;
}

// Rehash if cost factor changed
if (password_needs_rehash($user['password_hash'], PASSWORD_BCRYPT, ['cost' => 12])) {
    $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?')
        ->execute([password_hash($pass, PASSWORD_BCRYPT, ['cost' => 12]), $user['id']]);
}

$token = jwt_encode([
    'sub'   => $user['id'],
    'email' => $user['email'],
    'iat'   => time(),
    'exp'   => time() + JWT_EXPIRY,
], JWT_SECRET);

echo json_encode([
    'token' => $token,
    'user'  => [
        'id'    => (int) $user['id'],
        'email' => $user['email'],
        'name'  => $user['name'],
    ],
]);
