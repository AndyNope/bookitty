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

set_cors_headers();
header('Content-Type: application/json; charset=utf-8');

$pdo = get_pdo();

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

    echo json_encode([
        'email'        => $inv['email'],
        'role'         => $inv['role'],
        'inviter_name' => $inv['inviter_name'],
        'user_exists'  => (bool) $existing,
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

    // Check if user already exists with this email
    $existing = $pdo->prepare('SELECT id, email, name FROM users WHERE email = ?');
    $existing->execute([$inv['email']]);
    $existingUser = $existing->fetch(PDO::FETCH_ASSOC);

    if ($existingUser) {
        // Existing user: just link to company
        $pdo->prepare('UPDATE users SET company_id = ?, role = ? WHERE id = ?')
            ->execute([$inv['company_id'], $inv['role'], $existingUser['id']]);
        $userId = (int) $existingUser['id'];
        $userName = $existingUser['name'];
        $userEmail = $existingUser['email'];
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
            'INSERT INTO users (email, name, password_hash, email_confirmed, role, company_id)
             VALUES (?, ?, ?, 1, ?, ?)'
        )->execute([$inv['email'], $name, $hash, $inv['role'], $inv['company_id']]);
        $userId    = (int) $pdo->lastInsertId();
        $userName  = $name;
        $userEmail = $inv['email'];
    }

    // Mark invitation as used
    $pdo->prepare('UPDATE invitations SET used = 1 WHERE token = ?')->execute([$token]);
    $pdo->commit();

    // Issue JWT
    $jwtPayload = [
        'sub'        => $userId,
        'email'      => $userEmail,
        'role'       => $inv['role'],
        'company_id' => (int) $inv['company_id'],
        'iat'        => time(),
        'exp'        => time() + JWT_EXPIRY,
    ];
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
