<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/activity_lib.php';

set_cors_headers();

$userId = effective_uid();
$actorId = (int) get_auth_payload()['sub'];
$pdo    = get_db();
$method = $_SERVER['REQUEST_METHOD'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function row_to_booking(array $row): array {
    return [
        'id'            => $row['id'],
        'date'          => $row['date'],
        'description'   => $row['description'],
        'account'       => $row['account'],
        'contraAccount' => $row['contra_account'],
        'category'      => $row['category'] ?? '',
        'amount'        => (float) $row['amount'],
        'vatAmount'     => $row['vat_amount'] !== null ? (float) $row['vat_amount'] : null,
        'vatRate'       => (float) $row['vat_rate'],
        'currency'      => $row['currency'],
        'paymentStatus' => $row['payment_status'],
        'type'          => $row['type'],
        'pdfUrl'        => $row['pdf_url'] ?? null,
        'dueDate'       => $row['due_date'] ?? null,
    ];
}

// ─── GET – list all bookings ──────────────────────────────────────────────────
if ($method === 'GET') {
    $stmt = $pdo->prepare(
        'SELECT * FROM bookings WHERE user_id = ? ORDER BY date DESC, created_at DESC'
    );
    $stmt->execute([$userId]);
    echo json_encode(array_map('row_to_booking', $stmt->fetchAll()));

// ─── POST – create booking ────────────────────────────────────────────────────
} elseif ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $isBatch = array_key_exists('bookings', $body);
    $entries = $isBatch ? $body['bookings'] : [$body];
    if (!is_array($entries) || !array_is_list($entries) || count($entries) < 1 || count($entries) > 1000 ||
        count(array_filter($entries, fn($entry) => !is_array($entry))) > 0) {
        http_response_code(400); echo json_encode(['error' => 'Es sind 1 bis 1000 Buchungen erforderlich.']); exit;
    }

    $pdo->beginTransaction();
    $insert = $pdo->prepare(
        'INSERT INTO bookings
             (id, user_id, date, description, account, contra_account, category,
              amount, vat_amount, vat_rate, currency, payment_status, type,
              pdf_url, due_date)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
    );
    $ids = [];
    foreach ($entries as $entry) {
        $id = $entry['id'] ?? bin2hex(random_bytes(16));
        $insert->execute([
            $id, $userId,
            $entry['date']          ?? date('Y-m-d'),
            $entry['description']   ?? '',
            $entry['account']       ?? '',
            $entry['contraAccount'] ?? '',
            $entry['category']      ?? '',
            $entry['amount']        ?? 0,
            $entry['vatAmount']     ?? null,
            $entry['vatRate']       ?? 0,
            $entry['currency']      ?? 'CHF',
            $entry['paymentStatus'] ?? 'Offen',
            $entry['type']          ?? 'Ausgabe',
            $entry['pdfUrl']        ?? null,
            $entry['dueDate']       ?? null,
        ]);
        log_company_activity($pdo, $userId, $actorId, 'booking_created', 'booking', (string) $id);
        $ids[] = $id;
    }
    $pdo->commit();
    echo json_encode($isBatch ? ['ok' => true, 'ids' => $ids] : ['ok' => true, 'id' => $ids[0]]);

// ─── PUT – update booking ─────────────────────────────────────────────────────
} elseif ($method === 'PUT') {
    $d  = json_decode(file_get_contents('php://input'), true) ?? [];
    $id = $d['id'] ?? '';
    if (!$id) { http_response_code(400); echo json_encode(['error' => 'id fehlt']); exit; }

    $pdo->beginTransaction();
    $check = $pdo->prepare('SELECT id FROM bookings WHERE id = ? AND user_id = ? FOR UPDATE');
    $check->execute([$id, $userId]);
    if (!$check->fetchColumn()) { $pdo->rollBack(); http_response_code(404); echo json_encode(['error' => 'Buchung nicht gefunden']); exit; }
    $pdo->prepare(
        'UPDATE bookings
         SET date=?, description=?, account=?, contra_account=?, category=?,
             amount=?, vat_amount=?, vat_rate=?, currency=?, payment_status=?, type=?,
             pdf_url=?, due_date=?
         WHERE id=? AND user_id=?'
    )->execute([
        $d['date']          ?? '',
        $d['description']   ?? '',
        $d['account']       ?? '',
        $d['contraAccount'] ?? '',
        $d['category']      ?? '',
        $d['amount']        ?? 0,
        isset($d['vatAmount']) ? $d['vatAmount'] : null,
        $d['vatRate']       ?? 0,
        $d['currency']      ?? 'CHF',
        $d['paymentStatus'] ?? 'Offen',
        $d['type']          ?? 'Ausgabe',
        $d['pdfUrl']        ?? null,
        $d['dueDate']       ?? null,
        $id, $userId,
    ]);
    log_company_activity($pdo, $userId, $actorId, 'booking_changed', 'booking', (string) $id);
    $pdo->commit();
    echo json_encode(['ok' => true]);

// ─── DELETE – remove booking ──────────────────────────────────────────────────
} elseif ($method === 'DELETE') {
    $d  = json_decode(file_get_contents('php://input'), true) ?? [];
    $id = $d['id'] ?? '';
    if (!$id) { http_response_code(400); echo json_encode(['error' => 'id fehlt']); exit; }

    $pdo->beginTransaction();
    $delete = $pdo->prepare('DELETE FROM bookings WHERE id = ? AND user_id = ?');
    $delete->execute([$id, $userId]);
    if (!$delete->rowCount()) { $pdo->rollBack(); http_response_code(404); echo json_encode(['error' => 'Buchung nicht gefunden']); exit; }
    log_company_activity($pdo, $userId, $actorId, 'booking_deleted', 'booking', (string) $id);
    $pdo->commit();
    echo json_encode(['ok' => true]);

} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
}
