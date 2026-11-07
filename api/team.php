<?php
/**
 * GET    /api/team.php          – List team members of my company
 * POST   /api/team.php          – Invite a new member (send invite email)
 * PUT    /api/team.php          – Change a member's role
 * DELETE /api/team.php          – Remove a member from the team
 *
 * Only 'admin' role can manage the team.
 */
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/activity_lib.php';

set_cors_headers();
header('Content-Type: application/json; charset=utf-8');

$payload    = get_auth_payload();
$ownId      = (int) $payload['sub'];
$role       = $payload['role'] ?? 'admin';
$companyId  = isset($payload['company_id']) ? (int) $payload['company_id'] : $ownId;
// The "admin" of the company is the one whose id === companyId
$isAdmin    = ($role === 'admin' && $ownId === $companyId);
$pdo        = get_db();

if (!$isAdmin) {
    http_response_code(403);
    echo json_encode(['error' => 'Nur der Firmeninhaber kann das Team verwalten']);
    exit;
}

// ─── GET – list team members ──────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $pdo->prepare(
        'SELECT u.id, u.name, u.email, m.role, m.custom_role_id, m.created_at, m.access_expires_at
            FROM company_memberships m JOIN users u ON u.id = m.user_id
            WHERE m.company_id = ? ORDER BY u.id ASC'
    );
        $stmt->execute([$companyId]);
    $members = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(array_map(fn($m) => [
        'id'                => (int) $m['id'],
        'name'              => $m['name'],
        'email'             => $m['email'],
        'role'              => $m['role'],
        'joined_at'         => $m['created_at'],
        'is_owner'          => (int) $m['id'] === $companyId,
        'access_expires_at' => $m['access_expires_at'],
        'custom_role_id'    => $m['custom_role_id'] !== null ? (int) $m['custom_role_id'] : null,
    ], $members));
    exit;
}

$body = json_decode(file_get_contents('php://input'), true) ?? [];

// ─── POST – invite ────────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email      = strtolower(trim($body['email'] ?? ''));
    $inviteRole = trim($body['role'] ?? 'buchhalter');
    $customRoleId = isset($body['custom_role_id']) ? (int) $body['custom_role_id'] : null;
    $accessDays = (int) ($body['access_days'] ?? 0); // 0 = unlimited

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400); echo json_encode(['error' => 'Ungültige E-Mail-Adresse']); exit;
    }
    if (!in_array($inviteRole, ['buchhalter', 'readonly'], true)) {
        http_response_code(400); echo json_encode(['error' => 'Ungültige Rolle']); exit;
    }
    if ($customRoleId !== null) {
        $roleStmt = $pdo->prepare('SELECT base_role FROM company_roles WHERE id = ? AND company_id = ?');
        $roleStmt->execute([$customRoleId, $companyId]);
        $inviteRole = $roleStmt->fetchColumn();
        if (!$inviteRole) { http_response_code(400); echo json_encode(['error' => 'Firmenrolle nicht gefunden']); exit; }
    }

    // Check not already in team
    $check = $pdo->prepare('SELECT u.id FROM users u JOIN company_memberships m ON m.user_id = u.id WHERE u.email = ? AND m.company_id = ?');
    $check->execute([$email, $companyId]);
    if ($check->fetch()) {
        http_response_code(409); echo json_encode(['error' => 'Benutzer ist bereits im Team']); exit;
    }

    $pdo->beginTransaction();
    $pdo->prepare('DELETE FROM invitations WHERE email = ? AND company_id = ? AND used = 0')
        ->execute([$email, $companyId]);

    $token             = bin2hex(random_bytes(32));
    $expires           = date('Y-m-d H:i:s', strtotime('+7 days'));
    $accessExpiresAt   = $accessDays > 0 ? date('Y-m-d H:i:s', strtotime("+{$accessDays} days")) : null;

    $pdo->prepare(
           'INSERT INTO invitations (token, email, role, invited_by, company_id, custom_role_id, access_expires_at, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([$token, $email, $inviteRole, $ownId, $companyId, $customRoleId, $accessExpiresAt, $expires]);
    log_company_activity($pdo, $companyId, $ownId, 'invitation_created', 'invitation', (string) $pdo->lastInsertId());
    $pdo->commit();

    // Send invite email
    $appName   = defined('APP_NAME') ? APP_NAME : 'Bookitty';
    $appUrl    = defined('APP_URL')  ? APP_URL  : 'https://bookitty.app';
    $inviteUrl = $appUrl . '/invite?token=' . urlencode($token);
    $roleLabel = $inviteRole === 'readonly' ? 'Nur-Lesen (Treuhänder)' : 'Buchhalter';
    $expLine   = $accessExpiresAt ? "<p style=\"color:#b45309;font-size:13px;margin-top:8px\">⏰ Zugang gültig bis: <strong>{$accessExpiresAt}</strong></p>" : '';

    $subject = "Einladung zu {$appName}";
    $html = <<<HTML
<!DOCTYPE html><html lang="de"><body style="font-family:system-ui,sans-serif;color:#1e293b;max-width:540px;margin:0 auto;padding:40px 24px;background:#f8fafc">
<div style="background:#fff;border-radius:16px;padding:40px 32px;border:1px solid #e2e8f0">
  <h1 style="font-size:22px;margin:0 0 16px">{$appName} – Teameinladung</h1>
  <p style="color:#64748b;margin:0 0 20px">Du wurdest eingeladen, als <strong>{$roleLabel}</strong> dem Team beizutreten.</p>
  {$expLine}
  <a href="{$inviteUrl}" style="display:inline-block;padding:14px 28px;background:#0f172a;color:#fff;border-radius:10px;text-decoration:none;font-weight:600">
    Einladung annehmen
  </a>
  <p style="font-size:12px;color:#94a3b8;margin-top:28px">Die Einladung ist 7 Tage gültig.</p>
</div></body></html>
HTML;

    $fromEmail = defined('MAIL_FROM')      ? MAIL_FROM      : 'noreply@bookitty.app';
    $fromName  = defined('MAIL_FROM_NAME') ? MAIL_FROM_NAME : $appName;
    $headers   = "MIME-Version: 1.0\r\nContent-type: text/html; charset=UTF-8\r\nFrom: {$fromName} <{$fromEmail}>\r\n";
    mail($email, '=?UTF-8?B?' . base64_encode($subject) . '?=', $html, $headers);

    echo json_encode(['ok' => true, 'token' => $token]);
    exit;
}

// ─── PUT – change role ────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $memberId  = (int) ($body['id'] ?? 0);
    $newRole   = trim($body['role'] ?? '');
    $customRoleId = isset($body['custom_role_id']) ? (int) $body['custom_role_id'] : null;
    if (!in_array($newRole, ['buchhalter', 'readonly'], true) || $memberId <= 0) {
        http_response_code(400); echo json_encode(['error' => 'Ungültige Daten']); exit;
    }
    if ($memberId === $companyId) {
        http_response_code(400); echo json_encode(['error' => 'Eigene Admin-Rolle kann nicht geändert werden']); exit;
    }
    if ($customRoleId !== null) {
        $roleStmt = $pdo->prepare('SELECT base_role FROM company_roles WHERE id = ? AND company_id = ?');
        $roleStmt->execute([$customRoleId, $companyId]);
        $newRole = $roleStmt->fetchColumn();
        if (!$newRole) { http_response_code(400); echo json_encode(['error' => 'Firmenrolle nicht gefunden']); exit; }
    }
    $pdo->beginTransaction();
    $member = $pdo->prepare('SELECT role FROM company_memberships WHERE user_id = ? AND company_id = ? FOR UPDATE');
    $member->execute([$memberId, $companyId]);
    if (!$member->fetch()) {
        $pdo->rollBack();
        http_response_code(404); echo json_encode(['error' => 'Mitglied nicht gefunden']); exit;
    }
    $pdo->prepare('UPDATE company_memberships SET role = ?, custom_role_id = ? WHERE user_id = ? AND company_id = ?')
        ->execute([$newRole, $customRoleId, $memberId, $companyId]);
    $pdo->prepare('UPDATE users SET role = ? WHERE id = ? AND company_id = ?')
        ->execute([$newRole, $memberId, $companyId]);
    log_company_activity($pdo, $companyId, $ownId, 'member_role_changed', 'user', (string) $memberId);
    $pdo->commit();
    echo json_encode(['ok' => true]);
    exit;
}

// ─── DELETE – remove member ───────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $memberId = (int) ($body['id'] ?? 0);
    if ($memberId <= 0 || $memberId === $companyId) {
        http_response_code(400); echo json_encode(['error' => 'Ungültige ID oder eigenes Konto']); exit;
    }
    // Set company_id = NULL, reset role to admin so they become standalone
    $pdo->beginTransaction();
    $remove = $pdo->prepare('DELETE FROM company_memberships WHERE user_id = ? AND company_id = ?');
    $remove->execute([$memberId, $companyId]);
    if ($remove->rowCount() === 0) {
        $pdo->rollBack();
        http_response_code(404); echo json_encode(['error' => 'Mitglied nicht gefunden']); exit;
    }
    $pdo->prepare('UPDATE users SET company_id = NULL, role = ?, access_expires_at = NULL WHERE id = ? AND company_id = ?')
        ->execute(['admin', $memberId, $companyId]);
    log_company_activity($pdo, $companyId, $ownId, 'member_removed', 'user', (string) $memberId);
    $pdo->commit();
    echo json_encode(['ok' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method Not Allowed']);
