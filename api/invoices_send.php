<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/mailer.php';

set_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$userId = effective_uid();
$pdo    = get_db();

$data = json_decode(file_get_contents('php://input'), true) ?? [];
$id   = trim($data['id'] ?? '');

if ($id === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Invoice ID is required']);
    exit;
}

// Fetch the invoice (ownership check via user_id)
$stmt = $pdo->prepare('SELECT * FROM invoices WHERE id = ? AND user_id = ?');
$stmt->execute([$id, $userId]);
$row = $stmt->fetch();

if (!$row) {
    http_response_code(404);
    echo json_encode(['error' => 'Rechnung nicht gefunden']);
    exit;
}

$email = trim($row['contact_email'] ?? '');
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode(['error' => 'Keine gültige E-Mail-Adresse beim Empfänger hinterlegt']);
    exit;
}

// Fetch issuer company name
$companyStmt = $pdo->prepare('SELECT company_name FROM companies WHERE user_id = ? LIMIT 1');
$companyStmt->execute([$userId]);
$company = $companyStmt->fetchColumn();
$issuerName = $company ?: APP_NAME;

$invoice = [
    'number'   => $row['number'],
    'date'     => $row['date'],
    'dueDate'  => $row['due_date'],
    'notes'    => $row['notes'] ?? '',
    'iban'     => $row['iban']  ?? '',
    'currency' => $row['currency'],
    'items'    => json_decode($row['items_json'] ?? '[]', true),
];

$sent = send_invoice_email($email, $row['contact_name'], $invoice, $issuerName);

if (!$sent) {
    http_response_code(500);
    echo json_encode(['error' => 'E-Mail konnte nicht versendet werden']);
    exit;
}

// Update status to Versendet if currently Entwurf
if ($row['status'] === 'Entwurf') {
    $pdo->prepare('UPDATE invoices SET status = ? WHERE id = ? AND user_id = ?')
        ->execute(['Versendet', $id, $userId]);
}

echo json_encode(['ok' => true]);
