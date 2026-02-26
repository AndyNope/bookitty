<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

set_cors_headers();

$userId = require_auth();
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
    $d  = json_decode(file_get_contents('php://input'), true) ?? [];
    $id = $d['id'] ?? bin2hex(random_bytes(16));

    $pdo->prepare(
        'INSERT INTO bookings
             (id, user_id, date, description, account, contra_account, category,
              amount, vat_amount, vat_rate, currency, payment_status, type)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)'
    )->execute([
        $id, $userId,
        $d['date']          ?? date('Y-m-d'),
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
    ]);

    echo json_encode(['ok' => true, 'id' => $id]);

// ─── PUT – update booking ─────────────────────────────────────────────────────
} elseif ($method === 'PUT') {
    $d  = json_decode(file_get_contents('php://input'), true) ?? [];
    $id = $d['id'] ?? '';
    if (!$id) { http_response_code(400); echo json_encode(['error' => 'id fehlt']); exit; }

    $pdo->prepare(
        'UPDATE bookings
         SET date=?, description=?, account=?, contra_account=?, category=?,
             amount=?, vat_amount=?, vat_rate=?, currency=?, payment_status=?, type=?
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
        $id, $userId,
    ]);
    echo json_encode(['ok' => true]);

// ─── DELETE – remove booking ──────────────────────────────────────────────────
} elseif ($method === 'DELETE') {
    $d  = json_decode(file_get_contents('php://input'), true) ?? [];
    $id = $d['id'] ?? '';
    if (!$id) { http_response_code(400); echo json_encode(['error' => 'id fehlt']); exit; }

    $pdo->prepare('DELETE FROM bookings WHERE id = ? AND user_id = ?')->execute([$id, $userId]);
    echo json_encode(['ok' => true]);

} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
}
