<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/two_factor_lib.php';
require_once __DIR__ . '/auth_rate_limit.php';
require_once __DIR__ . '/activity_lib.php';

set_cors_headers();
header('Cache-Control: no-store');
$payload = get_auth_payload();
$userId = (int) $payload['sub'];
$companyId = isset($payload['company_id']) ? (int) $payload['company_id'] : $userId;
$pdo = get_db();
$stmt = $pdo->prepare('SELECT enabled FROM user_two_factor WHERE user_id = ?');
$stmt->execute([$userId]);
$enabled = (bool) ($stmt->fetchColumn() ?: false);

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try { two_factor_key(); $available = true; } catch (RuntimeException $error) { $available = false; }
    echo json_encode(['enabled' => $enabled, 'available' => $available]);
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); echo json_encode(['error' => 'Method Not Allowed']); exit;
}

$body = json_decode(file_get_contents('php://input'), true) ?? [];
$action = $body['action'] ?? '';
if ($action === 'setup' || $action === 'disable') {
    $userStmt = $pdo->prepare('SELECT email, password_hash FROM users WHERE id = ?');
    $userStmt->execute([$userId]);
    $user = $userStmt->fetch();
    if (!$user) {
        http_response_code(401); echo json_encode(['error' => 'Benutzer nicht gefunden']); exit;
    }
    auth_rate_check($pdo, $user['email']);
    if (!password_verify((string) ($body['password'] ?? ''), $user['password_hash'])) {
        auth_rate_failure($pdo, $user['email']);
        http_response_code(401); echo json_encode(['error' => 'Passwort falsch']); exit;
    }
    auth_rate_success($pdo, $user['email']);
}

if ($action === 'setup' && !$enabled) {
    $totp = OTPHP\TOTP::generate();
    $totp->setLabel($user['email']);
    $totp->setIssuer('Bookitty');
    $encrypted = two_factor_encrypt($totp->getSecret());
    $pdo->prepare('INSERT INTO user_two_factor (user_id, encrypted_secret, pending_since) VALUES (?, ?, NOW())
        ON DUPLICATE KEY UPDATE encrypted_secret = IF(enabled = 0, VALUES(encrypted_secret), encrypted_secret), pending_since = IF(enabled = 0, NOW(), pending_since), failed_attempts = IF(enabled = 0, 0, failed_attempts), locked_until = IF(enabled = 0, NULL, locked_until), last_step = IF(enabled = 0, -1, last_step)')
        ->execute([$userId, $encrypted]);
    echo json_encode(['secret' => $totp->getSecret(), 'uri' => $totp->getProvisioningUri()]);
    exit;
}

if ($action === 'confirm' && !$enabled) {
    if (!two_factor_verify($pdo, $userId, trim((string) ($body['code'] ?? '')), false)) {
        http_response_code(403); echo json_encode(['error' => 'Code ungültig, abgelaufen oder vorübergehend gesperrt.']); exit;
    }
    $codes = [];
    for ($index = 0; $index < 10; $index++) $codes[] = bin2hex(random_bytes(16));
    $pdo->beginTransaction();
    $update = $pdo->prepare('UPDATE user_two_factor SET enabled = 1, pending_since = NULL, recovery_hashes = ? WHERE user_id = ? AND enabled = 0');
    $update->execute([json_encode(array_map(fn($code) => hash('sha256', $code), $codes)), $userId]);
    if (!$update->rowCount()) { $pdo->rollBack(); http_response_code(409); echo json_encode(['error' => '2FA-Status hat sich geändert.']); exit; }
    $pdo->prepare('UPDATE users SET session_version = session_version + 1 WHERE id = ?')->execute([$userId]);
    $version = $pdo->prepare('SELECT session_version FROM users WHERE id = ?');
    $version->execute([$userId]);
    $payload['session_version'] = (int) $version->fetchColumn();
    unset($payload['permissions']);
    log_company_activity($pdo, $companyId, $userId, 'two_factor_enabled', 'user', (string) $userId);
    $pdo->commit();
    echo json_encode(['ok' => true, 'recoveryCodes' => $codes, 'token' => jwt_encode($payload, JWT_SECRET)]);
    exit;
}

if ($action === 'disable' && $enabled) {
    if (!two_factor_verify($pdo, $userId, trim((string) ($body['code'] ?? '')), true)) {
        http_response_code(403); echo json_encode(['error' => 'Code ungültig oder vorübergehend gesperrt.']); exit;
    }
    $pdo->beginTransaction();
    $pdo->prepare('DELETE FROM user_two_factor WHERE user_id = ?')->execute([$userId]);
    $pdo->prepare('UPDATE users SET session_version = session_version + 1 WHERE id = ?')->execute([$userId]);
    $version = $pdo->prepare('SELECT session_version FROM users WHERE id = ?');
    $version->execute([$userId]);
    $payload['session_version'] = (int) $version->fetchColumn();
    unset($payload['permissions']);
    log_company_activity($pdo, $companyId, $userId, 'two_factor_disabled', 'user', (string) $userId);
    $pdo->commit();
    echo json_encode(['ok' => true, 'token' => jwt_encode($payload, JWT_SECRET)]);
    exit;
}

http_response_code(400);
echo json_encode(['error' => 'Ungültige Aktion oder 2FA-Status.']);