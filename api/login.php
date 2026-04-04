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
    'SELECT id, name, email, password_hash, email_confirmed, role, company_id, access_expires_at FROM users WHERE email = ?'
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

$role             = $user['role'] ?? 'admin';
$companyId        = $user['company_id'] ? (int) $user['company_id'] : null;
$accessExpiresAt  = $user['access_expires_at'] ?? null;

// For trustees with time-limited access, clamp JWT expiry
$jwtExp = time() + JWT_EXPIRY;
if ($accessExpiresAt) {
    $accessTs = strtotime($accessExpiresAt);
    if ($accessTs && $accessTs < $jwtExp) $jwtExp = $accessTs;
    if ($accessTs && $accessTs < time()) {
        http_response_code(403);
        echo json_encode(['error' => 'Ihr Treuhänder-Zugang ist abgelaufen. Bitte fordern Sie eine neue Einladung an.']);
        exit;
    }
}

$jwtPayload = [
    'sub'   => $user['id'],
    'email' => $user['email'],
    'role'  => $role,
    'iat'   => time(),
    'exp'   => $jwtExp,
];
if ($companyId !== null)   $jwtPayload['company_id']        = $companyId;
if ($accessExpiresAt)      $jwtPayload['access_expires_at'] = $accessExpiresAt;

$token = jwt_encode($jwtPayload, JWT_SECRET);

echo json_encode([
    'token' => $token,
    'user'  => [
        'id'               => (int) $user['id'],
        'email'            => $user['email'],
        'name'             => $user['name'],
        'role'             => $role,
        'company_id'       => $companyId,
        'access_expires_at'=> $accessExpiresAt,
    ],
]);
