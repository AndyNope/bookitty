<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/activity_lib.php';

set_cors_headers();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); echo json_encode(['error' => 'Method Not Allowed']); exit;
}
$companyId = effective_uid();
$actorId = (int) get_auth_payload()['sub'];
$body = json_decode(file_get_contents('php://input'), true) ?? [];
$documentId = (string) ($body['documentId'] ?? '');
$bookingId = (string) ($body['bookingId'] ?? '');
$draft = $body['draft'] ?? null;
if ($documentId === '' || strlen($documentId) > 36 || !preg_match('/^[a-zA-Z0-9-]{1,36}$/', $bookingId) || !is_array($draft)) {
    http_response_code(400); echo json_encode(['error' => 'Ungültige Buchungsdaten.']); exit;
}
$pdo = get_db();
$pdo->beginTransaction();
$stmt = $pdo->prepare('SELECT status, preview_url FROM documents WHERE id = ? AND user_id = ? FOR UPDATE');
$stmt->execute([$documentId, $companyId]);
$document = $stmt->fetch();
if (!$document) {
    $pdo->rollBack(); http_response_code(404); echo json_encode(['error' => 'Beleg nicht gefunden.']); exit;
}
if ($document['status'] === 'Gebucht') {
    $pdo->rollBack(); http_response_code(409); echo json_encode(['error' => 'Dieser Beleg wurde bereits gebucht.']); exit;
}
$pdo->prepare('INSERT INTO bookings (id, user_id, date, description, account, contra_account, category,
    amount, vat_amount, vat_rate, currency, payment_status, type, pdf_url, due_date)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')->execute([
    $bookingId, $companyId, $draft['date'] ?? date('Y-m-d'), $draft['description'] ?? '',
    $draft['account'] ?? '', $draft['contraAccount'] ?? '', $draft['category'] ?? '',
    $draft['amount'] ?? 0, $draft['vatAmount'] ?? null, $draft['vatRate'] ?? 0,
    $draft['currency'] ?? 'CHF', $draft['paymentStatus'] ?? 'Offen', $draft['type'] ?? 'Ausgabe',
    $document['preview_url'], $draft['dueDate'] ?? null,
]);
$pdo->prepare('UPDATE documents SET status = ?, draft_json = ? WHERE id = ? AND user_id = ?')
    ->execute(['Gebucht', json_encode($draft), $documentId, $companyId]);
log_company_activity($pdo, $companyId, $actorId, 'booking_created', 'booking', $bookingId);
log_company_activity($pdo, $companyId, $actorId, 'document_booked', 'document', $documentId);
$pdo->commit();
echo json_encode(['ok' => true]);