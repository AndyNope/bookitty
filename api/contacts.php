<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

set_cors_headers();

$userId = effective_uid();
$pdo    = get_db();
$method = $_SERVER['REQUEST_METHOD'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function row_to_contact(array $row): array {
    return [
        'id'      => $row['id'],
        'type'    => $row['type'],
        'name'    => $row['name'],
        'company' => $row['company'] ?? null,
        'email'   => $row['email']   ?? null,
        'phone'   => $row['phone']   ?? null,
        'street'  => $row['street']  ?? null,
        'zip'     => $row['zip']     ?? null,
        'city'    => $row['city']    ?? null,
        'country' => $row['country'],
        'uid'     => $row['uid']     ?? null,
        'iban'    => $row['iban']    ?? null,
        'notes'   => $row['notes']   ?? null,
    ];
}

// ─── GET – list all contacts ──────────────────────────────────────────────────
if ($method === 'GET') {
    $stmt = $pdo->prepare('SELECT * FROM contacts WHERE user_id = ? ORDER BY name ASC');
    $stmt->execute([$userId]);
    echo json_encode(array_map('row_to_contact', $stmt->fetchAll()));

// ─── POST – create contact ────────────────────────────────────────────────────
} elseif ($method === 'POST') {
    $d  = json_decode(file_get_contents('php://input'), true) ?? [];
    $id = $d['id'] ?? bin2hex(random_bytes(16));

    $name = trim($d['name'] ?? '');
    if ($name === '') {
        http_response_code(400);
        echo json_encode(['error' => 'Name ist erforderlich']);
        exit;
    }

    $pdo->prepare(
        'INSERT INTO contacts
             (id, user_id, type, name, company, email, phone, street, zip, city, country, uid, iban, notes)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
    )->execute([
        $id, $userId,
        $d['type']    ?? 'Lieferant',
        $name,
        $d['company'] ?? null,
        $d['email']   ?? null,
        $d['phone']   ?? null,
        $d['street']  ?? null,
        $d['zip']     ?? null,
        $d['city']    ?? null,
        $d['country'] ?? 'CH',
        $d['uid']     ?? null,
        $d['iban']    ?? null,
        $d['notes']   ?? null,
    ]);
    echo json_encode(['ok' => true, 'id' => $id]);

// ─── PUT – update contact ─────────────────────────────────────────────────────
} elseif ($method === 'PUT') {
    $d  = json_decode(file_get_contents('php://input'), true) ?? [];
    $id = $d['id'] ?? '';

    $name = trim($d['name'] ?? '');
    if ($id === '' || $name === '') {
        http_response_code(400);
        echo json_encode(['error' => 'ID und Name sind erforderlich']);
        exit;
    }

    $pdo->prepare(
        'UPDATE contacts
            SET type=?, name=?, company=?, email=?, phone=?, street=?, zip=?, city=?, country=?, uid=?, iban=?, notes=?
          WHERE id=? AND user_id=?'
    )->execute([
        $d['type']    ?? 'Lieferant',
        $name,
        $d['company'] ?? null,
        $d['email']   ?? null,
        $d['phone']   ?? null,
        $d['street']  ?? null,
        $d['zip']     ?? null,
        $d['city']    ?? null,
        $d['country'] ?? 'CH',
        $d['uid']     ?? null,
        $d['iban']    ?? null,
        $d['notes']   ?? null,
        $id, $userId,
    ]);
    echo json_encode(['ok' => true]);

// ─── DELETE – remove contact ──────────────────────────────────────────────────
} elseif ($method === 'DELETE') {
    $d  = json_decode(file_get_contents('php://input'), true) ?? [];
    $id = $d['id'] ?? '';

    if ($id === '') {
        http_response_code(400);
        echo json_encode(['error' => 'ID ist erforderlich']);
        exit;
    }

    $pdo->prepare('DELETE FROM contacts WHERE id=? AND user_id=?')->execute([$id, $userId]);
    echo json_encode(['ok' => true]);
}
