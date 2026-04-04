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

set_cors_headers();
header('Content-Type: application/json; charset=utf-8');

$payload    = get_auth_payload();
$ownId      = (int) $payload['sub'];
$role       = $payload['role'] ?? 'admin';
$companyId  = isset($payload['company_id']) ? (int) $payload['company_id'] : $ownId;
// The "admin" of the company is the one whose id === companyId
$isAdmin    = ($role === 'admin');
$pdo        = get_pdo();

// ─── GET – list team members ──────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Members are users whose company_id = $companyId, PLUS the owner (company_id IS NULL, id = $companyId)
    $stmt = $pdo->prepare(
        'SELECT id, name, email, role, company_id, created_at, access_expires_at
         FROM users
         WHERE id = :owner OR company_id = :co
         ORDER BY id ASC'
    );
    $stmt->execute([':owner' => $companyId, ':co' => $companyId]);
    $members = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(array_map(fn($m) => [
        'id'                => (int) $m['id'],
        'name'              => $m['name'],
        'email'             => $m['email'],
        'role'              => $m['company_id'] ? ($m['role'] ?? 'buchhalter') : 'admin',
        'joined_at'         => $m['created_at'],
        'is_owner'          => $m['company_id'] === null,
        'access_expires_at' => $m['access_expires_at'],
    ], $members));
    exit;
}

// All write operations require admin role
if (!$isAdmin) {
    http_response_code(403);
    echo json_encode(['error' => 'Nur Admins können das Team verwalten']);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true) ?? [];

// ─── POST – invite ────────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email      = strtolower(trim($body['email'] ?? ''));
    $inviteRole = trim($body['role'] ?? 'buchhalter');
    $accessDays = (int) ($body['access_days'] ?? 0); // 0 = unlimited

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400); echo json_encode(['error' => 'Ungültige E-Mail-Adresse']); exit;
    }
    if (!in_array($inviteRole, ['buchhalter', 'readonly'], true)) {
        http_response_code(400); echo json_encode(['error' => 'Ungültige Rolle']); exit;
    }

    // Check not already in team
    $check = $pdo->prepare('SELECT id FROM users WHERE email = ? AND (id = ? OR company_id = ?)');
    $check->execute([$email, $companyId, $companyId]);
    if ($check->fetch()) {
        http_response_code(409); echo json_encode(['error' => 'Benutzer ist bereits im Team']); exit;
    }

    $pdo->prepare('DELETE FROM invitations WHERE email = ? AND company_id = ? AND used = 0')
        ->execute([$email, $companyId]);

    $token             = bin2hex(random_bytes(32));
    $expires           = date('Y-m-d H:i:s', strtotime('+7 days'));
    $accessExpiresAt   = $accessDays > 0 ? date('Y-m-d H:i:s', strtotime("+{$accessDays} days")) : null;

    $pdo->prepare(
        'INSERT INTO invitations (token, email, role, invited_by, company_id, access_expires_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    )->execute([$token, $email, $inviteRole, $ownId, $companyId, $accessExpiresAt, $expires]);

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
    if (!in_array($newRole, ['buchhalter', 'readonly'], true) || $memberId <= 0) {
        http_response_code(400); echo json_encode(['error' => 'Ungültige Daten']); exit;
    }
    if ($memberId === $companyId) {
        http_response_code(400); echo json_encode(['error' => 'Eigene Admin-Rolle kann nicht geändert werden']); exit;
    }
    $r = $pdo->prepare('UPDATE users SET role = ? WHERE id = ? AND company_id = ?');
    $r->execute([$newRole, $memberId, $companyId]);
    if ($r->rowCount() === 0) {
        http_response_code(404); echo json_encode(['error' => 'Mitglied nicht gefunden']); exit;
    }
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
    $pdo->prepare('UPDATE users SET company_id = NULL, role = ? WHERE id = ? AND company_id = ?')
        ->execute(['admin', $memberId, $companyId]);
    echo json_encode(['ok' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method Not Allowed']);
