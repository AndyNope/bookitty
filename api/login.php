<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/jwt.php';
require_once __DIR__ . '/two_factor_lib.php';
require_once __DIR__ . '/auth_rate_limit.php';

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
auth_rate_check($pdo, $email);
$stmt = $pdo->prepare(
    'SELECT id, name, email, password_hash, email_confirmed, role, company_id, access_expires_at, session_version FROM users WHERE email = ?'
);
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user || !password_verify($pass, $user['password_hash'])) {
    auth_rate_failure($pdo, $email);
    http_response_code(401);
    echo json_encode(['error' => 'E-Mail oder Passwort falsch']);
    exit;
}
auth_rate_success($pdo, $email);

if (!$user['email_confirmed']) {
    http_response_code(403);
    echo json_encode(['error' => 'Bitte bestätige zuerst deine E-Mail-Adresse. Schau in dein Postfach.']);
    exit;
}

$twoFactor = $pdo->prepare('SELECT enabled FROM user_two_factor WHERE user_id = ?');
$twoFactor->execute([$user['id']]);
if ($twoFactor->fetchColumn()) {
    $code = trim((string) ($data['code'] ?? ''));
    if ($code === '') {
        echo json_encode(['requiresTwoFactor' => true]);
        exit;
    }
    if (!two_factor_verify($pdo, (int) $user['id'], $code, true)) {
        http_response_code(401);
        echo json_encode(['error' => 'Code ungültig oder vorübergehend gesperrt']);
        exit;
    }
}

// Rehash if cost factor changed
if (password_needs_rehash($user['password_hash'], PASSWORD_BCRYPT, ['cost' => 12])) {
    $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?')
        ->execute([password_hash($pass, PASSWORD_BCRYPT, ['cost' => 12]), $user['id']]);
}

$preferredCompany = $user['company_id'] ? (int) $user['company_id'] : (int) $user['id'];
$membershipStmt = $pdo->prepare('SELECT company_id, role, access_expires_at FROM company_memberships
    WHERE user_id = ? AND (access_expires_at IS NULL OR access_expires_at > NOW())
    ORDER BY (company_id = ?) DESC, company_id ASC LIMIT 1');
$membershipStmt->execute([$user['id'], $preferredCompany]);
$membership = $membershipStmt->fetch();
if (!$membership) {
    http_response_code(403);
    echo json_encode(['error' => 'Kein aktiver Firmenzugang vorhanden.']);
    exit;
}
$role             = $membership['role'];
$activeCompany    = (int) $membership['company_id'];
$companyId        = $activeCompany === (int) $user['id'] ? null : $activeCompany;
$accessExpiresAt  = $membership['access_expires_at'];

// For trustees with time-limited access, clamp JWT expiry
$jwtExp = time() + min(JWT_EXPIRY, JWT_MAX_SESSION_SECONDS);
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
    'session_version' => (int) $user['session_version'],
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
