<?php
/**
 * GET  /api/invite.php?token=xxx  – Check invite validity (returns role + email)
 * POST /api/invite.php             – Accept invite (body: token, name, password)
 *
 * Creates an account linked to the inviting company.
 */
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/jwt.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/auth_rate_limit.php';
require_once __DIR__ . '/two_factor_lib.php';
require_once __DIR__ . '/activity_lib.php';

set_cors_headers();
header('Content-Type: application/json; charset=utf-8');

$pdo = get_db();

// ─── GET – validate token ─────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $token = trim($_GET['token'] ?? '');
    if ($token === '') { http_response_code(400); echo json_encode(['error' => 'Token fehlt']); exit; }

    $stmt = $pdo->prepare(
        'SELECT i.*, u.email AS inviter_email, u.name AS inviter_name
         FROM invitations i
         JOIN users u ON u.id = i.invited_by
         WHERE i.token = ? AND i.used = 0 AND i.expires_at > NOW()'
    );
    $stmt->execute([$token]);
    $inv = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$inv) { http_response_code(404); echo json_encode(['error' => 'Einladung ungültig oder abgelaufen']); exit; }

    // Check if user with this email already exists (can just log in)
    $exists = $pdo->prepare('SELECT id FROM users WHERE email = ?');
    $exists->execute([$inv['email']]);
    $existing = $exists->fetch();
    $requiresTwoFactor = false;
    if ($existing) {
        $twoFactor = $pdo->prepare('SELECT enabled FROM user_two_factor WHERE user_id = ?');
        $twoFactor->execute([$existing['id']]);
        $requiresTwoFactor = (bool) $twoFactor->fetchColumn();
    }

    echo json_encode([
        'email'        => $inv['email'],
        'role'         => $inv['role'],
        'inviter_name' => $inv['inviter_name'],
        'user_exists'  => (bool) $existing,
        'requires_two_factor' => $requiresTwoFactor,
    ]);
    exit;
}

// ─── POST – accept invite ─────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body  = json_decode(file_get_contents('php://input'), true) ?? [];
    $token = trim($body['token'] ?? '');
    $name  = trim($body['name']  ?? '');
    $pass  = $body['password']   ?? '';

    if ($token === '') { http_response_code(400); echo json_encode(['error' => 'Token fehlt']); exit; }

    // Lock & fetch invitation
    $stmt = $pdo->prepare(
        'SELECT * FROM invitations WHERE token = ? AND used = 0 AND expires_at > NOW() FOR UPDATE'
    );
    $pdo->beginTransaction();
    $stmt->execute([$token]);
    $inv = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$inv) {
        $pdo->rollBack();
        http_response_code(404); echo json_encode(['error' => 'Einladung ungültig oder abgelaufen']); exit;
    }
    if (!empty($inv['access_expires_at']) && strtotime($inv['access_expires_at']) <= time()) {
        $pdo->rollBack();
        http_response_code(403); echo json_encode(['error' => 'Der Zugang aus dieser Einladung ist bereits abgelaufen.']); exit;
    }

    // Check if user already exists with this email
    $existing = $pdo->prepare('SELECT id, email, name, password_hash, email_confirmed, session_version FROM users WHERE email = ?');
    $existing->execute([$inv['email']]);
    $existingUser = $existing->fetch(PDO::FETCH_ASSOC);

    if ($existingUser) {
        auth_rate_check($pdo, $existingUser['email']);
        if (!password_verify($pass, $existingUser['password_hash'])) {
            $pdo->rollBack();
            auth_rate_failure($pdo, $existingUser['email']);
            http_response_code(401); echo json_encode(['error' => 'Passwort falsch']); exit;
        }
        if (!$existingUser['email_confirmed']) {
            $pdo->rollBack();
            http_response_code(403); echo json_encode(['error' => 'Bitte bestätige zuerst dein bestehendes Konto.']); exit;
        }
        $twoFactor = $pdo->prepare('SELECT enabled FROM user_two_factor WHERE user_id = ?');
        $twoFactor->execute([$existingUser['id']]);
        if ($twoFactor->fetchColumn() && !two_factor_verify($pdo, (int) $existingUser['id'], trim((string) ($body['code'] ?? '')), true)) {
            $pdo->commit();
            http_response_code(401); echo json_encode(['error' => '2FA-Code ungültig oder vorübergehend gesperrt']); exit;
        }
        $check = $pdo->prepare('SELECT 1 FROM company_memberships WHERE company_id = ? AND user_id = ?');
        $check->execute([$inv['company_id'], $existingUser['id']]);
        if ($check->fetchColumn()) {
            $pdo->rollBack();
            http_response_code(409); echo json_encode(['error' => 'Dieses Konto gehört bereits zur Firma.']); exit;
        }
        $pdo->prepare('INSERT INTO company_memberships (company_id, user_id, role, custom_role_id, access_expires_at) VALUES (?, ?, ?, ?, ?)')
            ->execute([$inv['company_id'], $existingUser['id'], $inv['role'], $inv['custom_role_id'], $inv['access_expires_at']]);
        $userId = (int) $existingUser['id'];
        $userName = $existingUser['name'];
        $userEmail = $existingUser['email'];
        $sessionVersion = (int) $existingUser['session_version'];
        auth_rate_success($pdo, $userEmail);
    } else {
        // New user: create account
        if ($name === '' || strlen($pass) < 8) {
            $pdo->rollBack();
            http_response_code(400);
            echo json_encode(['error' => 'Name und Passwort (mind. 8 Zeichen) sind erforderlich']);
            exit;
        }
        $hash = password_hash($pass, PASSWORD_BCRYPT, ['cost' => 12]);
        $pdo->prepare(
              'INSERT INTO users (email, name, password_hash, email_confirmed, role, company_id, access_expires_at)
               VALUES (?, ?, ?, 1, ?, ?, ?)'
           )->execute([$inv['email'], $name, $hash, $inv['role'], $inv['company_id'], $inv['access_expires_at']]);
        $userId    = (int) $pdo->lastInsertId();
        $userName  = $name;
        $userEmail = $inv['email'];
        $sessionVersion = 0;
        $pdo->prepare('INSERT INTO company_memberships (company_id, user_id, role, custom_role_id, access_expires_at) VALUES (?, ?, ?, ?, ?)')
            ->execute([$inv['company_id'], $userId, $inv['role'], $inv['custom_role_id'], $inv['access_expires_at']]);
    }

    // Mark invitation as used
    $pdo->prepare('UPDATE invitations SET used = 1 WHERE token = ?')->execute([$token]);
    log_company_activity($pdo, (int) $inv['company_id'], $userId, 'invitation_accepted', 'user', (string) $userId);
    $pdo->commit();

    // Issue JWT
    $jwtPayload = [
        'sub'        => $userId,
        'email'      => $userEmail,
        'role'       => $inv['role'],
        'session_version' => $sessionVersion,
        'company_id' => (int) $inv['company_id'],
        'iat'        => time(),
        'exp'        => time() + min(JWT_EXPIRY, JWT_MAX_SESSION_SECONDS),
    ];
    if ($inv['access_expires_at']) {
        $jwtPayload['access_expires_at'] = $inv['access_expires_at'];
        $jwtPayload['exp'] = min($jwtPayload['exp'], strtotime($inv['access_expires_at']));
    }
    $jwtToken = jwt_encode($jwtPayload, JWT_SECRET);

    echo json_encode([
        'token' => $jwtToken,
        'user'  => [
            'id'         => $userId,
            'name'       => $userName,
            'email'      => $userEmail,
            'role'       => $inv['role'],
            'company_id' => (int) $inv['company_id'],
        ],
    ]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method Not Allowed']);
