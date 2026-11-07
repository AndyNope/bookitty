<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/activity_lib.php';

set_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$payload = get_auth_payload();
$userId = (int) $payload['sub'];
$companyId = effective_uid();
$pdo    = get_db();

$d         = json_decode(file_get_contents('php://input'), true) ?? [];
$invoiceId = trim($d['invoice_id'] ?? '');
$oldStatus = trim($d['old_status'] ?? '');
$newStatus = trim($d['new_status'] ?? '');
$reason    = trim($d['reason']     ?? '');

// Validate presence
if ($invoiceId === '' || $oldStatus === '' || $newStatus === '' || $reason === '') {
    http_response_code(400);
    echo json_encode(['error' => 'invoice_id, old_status, new_status und reason sind Pflichtfelder']);
    exit;
}

// Validate new status is a known value
$VALID = ['Entwurf', 'Versendet', 'Überfällig', 'Bezahlt', 'Storniert'];
if (!in_array($newStatus, $VALID, true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Ungültiger Status']);
    exit;
}

// Verify user has admin role (only admins may unlock)
if (($payload['role'] ?? '') !== 'admin' || $userId !== $companyId) {
    http_response_code(403);
    echo json_encode(['error' => 'Nur Administratoren dürfen gesperrte Status ändern']);
    exit;
}

// Verify invoice exists and belongs to this user
$pdo->beginTransaction();
$invStmt = $pdo->prepare('SELECT id, status FROM invoices WHERE id = ? AND user_id = ? FOR UPDATE');
$invStmt->execute([$invoiceId, $companyId]);
$inv = $invStmt->fetch();
if (!$inv) {
    $pdo->rollBack();
    http_response_code(404);
    echo json_encode(['error' => 'Rechnung nicht gefunden']);
    exit;
}
if ($inv['status'] !== $oldStatus) {
    $pdo->rollBack();
    http_response_code(409); echo json_encode(['error' => 'Der Rechnungsstatus wurde inzwischen geändert.']); exit;
}

// Insert audit log entry
$pdo->prepare(
    'INSERT INTO invoice_audit (invoice_id, user_id, old_status, new_status, reason)
     VALUES (?, ?, ?, ?, ?)'
)->execute([$invoiceId, $userId, $oldStatus, $newStatus, $reason]);

// Update invoice status
$pdo->prepare('UPDATE invoices SET status = ? WHERE id = ? AND user_id = ?')
    ->execute([$newStatus, $invoiceId, $companyId]);
log_company_activity($pdo, $companyId, $userId, 'invoice_status_unlocked', 'invoice', $invoiceId);
$pdo->commit();

echo json_encode(['ok' => true]);
