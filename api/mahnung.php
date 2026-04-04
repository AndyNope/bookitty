<?php
/**
 * POST /api/mahnung.php
 * Sends a payment reminder (Mahnung) for an overdue invoice.
 *
 * Body (JSON):
 *   invoice_id   string   – UUID of the invoice
 *   level        int      – 1, 2, or 3
 *   message      string?  – Optional custom message override
 *
 * Returns: { ok: true } | { error: string }
 */
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');

// ── Auth ──────────────────────────────────────────────────────────────────────
$userId = effective_uid();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); echo json_encode(['error' => 'Method Not Allowed']); exit;
}

// ── Input ─────────────────────────────────────────────────────────────────────
$body = json_decode(file_get_contents('php://input'), true) ?? [];
$invoiceId = trim($body['invoice_id'] ?? '');
$level     = (int) ($body['level'] ?? 1);
$message   = trim($body['message'] ?? '');

if ($invoiceId === '' || !in_array($level, [1, 2, 3], true)) {
    http_response_code(400);
    echo json_encode(['error' => 'invoice_id und level (1-3) sind erforderlich']);
    exit;
}

// ── Load invoice ──────────────────────────────────────────────────────────────
$pdo  = get_pdo();
$stmt = $pdo->prepare(
    'SELECT * FROM invoices WHERE id = ? AND user_id = ?'
);
$stmt->execute([$invoiceId, $userId]);
$inv = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$inv) { http_response_code(404); echo json_encode(['error' => 'Invoice not found']); exit; }

$toEmail = trim($inv['contact_email'] ?? '');
if ($toEmail === '' || !filter_var($toEmail, FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode(['error' => 'Keine gültige E-Mail-Adresse beim Empfänger hinterlegt.']);
    exit;
}

// ── Mahnung text ──────────────────────────────────────────────────────────────
$levelLabels = ['', 'Erste', 'Zweite', 'Dritte'];
$levelLabel  = $levelLabels[$level];
$dueDate     = $inv['due_date'];
$invoiceNum  = htmlspecialchars($inv['number'], ENT_QUOTES, 'UTF-8');
$contactName = htmlspecialchars($inv['contact_name'], ENT_QUOTES, 'UTF-8');
$appName     = defined('APP_NAME') ? APP_NAME : 'Bookitty';

if ($message === '') {
    $urgency = match($level) {
        1 => 'Bitte überprüfen Sie, ob die Zahlung bereits unterwegs ist.',
        2 => 'Bitte begleichen Sie den ausstehenden Betrag umgehend, um weitere Mahngebühren zu vermeiden.',
        3 => 'Falls keine Zahlung bis zum angegebenen Datum eingeht, behalten wir uns vor, rechtliche Schritte einzuleiten.',
    };
    $message = $urgency;
}

$customMsg = htmlspecialchars($message, ENT_QUOTES, 'UTF-8');

// ── Build email HTML ──────────────────────────────────────────────────────────
$subject = "{$levelLabel} Mahnung – Rechnung {$inv['number']}";

$html = <<<HTML
<!DOCTYPE html>
<html lang="de">
<body style="font-family:system-ui,sans-serif;color:#1e293b;max-width:560px;margin:0 auto;padding:40px 24px;background:#f8fafc">
<div style="background:#fff;border-radius:16px;padding:40px 32px;border:1px solid #e2e8f0">
  <div style="display:flex;align-items:center;margin-bottom:28px">
    <span style="font-size:24px;font-weight:700;color:#0f172a">{$appName}</span>
  </div>
  <h1 style="font-size:20px;margin:0 0 8px;color:#1e293b">{$levelLabel} Mahnung</h1>
  <p style="color:#64748b;margin:0 0 24px">Sehr geehrte Damen und Herren, {$contactName},</p>
  <p style="color:#1e293b;margin:0 0 16px">
    trotz unserer Zahlungserinnerung ist die Rechnung <strong>{$invoiceNum}</strong>,
    fällig am <strong>{$dueDate}</strong>, noch nicht beglichen worden.
  </p>
  <div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:10px;padding:16px 20px;margin:20px 0">
    <p style="margin:0;color:#92400e;font-size:14px">{$customMsg}</p>
  </div>
  <p style="color:#64748b;font-size:13px;margin-top:28px">
    Bei Fragen stehen wir Ihnen gerne zur Verfügung.
  </p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
  <p style="font-size:11px;color:#94a3b8;margin:0">{$appName} – Automatisch generierte Mahnung</p>
</div>
</body>
</html>
HTML;

// ── Send email ────────────────────────────────────────────────────────────────
$fromEmail = defined('MAIL_FROM')      ? MAIL_FROM      : 'noreply@bookitty.app';
$fromName  = defined('MAIL_FROM_NAME') ? MAIL_FROM_NAME : $appName;
$encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
$headers  = 'MIME-Version: 1.0' . "\r\n";
$headers .= 'Content-type: text/html; charset=UTF-8' . "\r\n";
$headers .= "From: {$fromName} <{$fromEmail}>\r\n";
$headers .= "Reply-To: {$fromEmail}\r\n";

$sent = mail($toEmail, $encodedSubject, $html, $headers);

if (!$sent) {
    http_response_code(500);
    echo json_encode(['error' => 'E-Mail konnte nicht versendet werden.']);
    exit;
}

// ── Persist mahnung_level + date on invoice ───────────────────────────────────
$today = date('Y-m-d');
$pdo->prepare(
    'UPDATE invoices SET mahnung_level = ?, mahnung_date = ? WHERE id = ? AND user_id = ?'
)->execute([$level, $today, $invoiceId, $userId]);

echo json_encode(['ok' => true, 'level' => $level, 'sent_to' => $toEmail]);
