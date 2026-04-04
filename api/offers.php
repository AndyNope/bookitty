<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

set_cors_headers();

$userId = require_auth();
$pdo    = get_db();
$method = $_SERVER['REQUEST_METHOD'];

function row_to_offer(array $row): array {
    return [
        'id'             => $row['id'],
        'number'         => $row['number'],
        'date'           => $row['date'],
        'validUntil'     => $row['valid_until'],
        'status'         => $row['status'],
        'contactId'      => $row['contact_id']      ?? null,
        'contactName'    => $row['contact_name'],
        'contactCompany' => $row['contact_company']  ?? null,
        'contactStreet'  => $row['contact_street']   ?? null,
        'contactZip'     => $row['contact_zip']      ?? null,
        'contactCity'    => $row['contact_city']     ?? null,
        'contactCountry' => $row['contact_country'],
        'contactEmail'   => $row['contact_email']    ?? null,
        'items'          => json_decode($row['items_json'] ?? '[]', true),
        'currency'       => $row['currency'],
        'notes'          => $row['notes']            ?? null,
        'convertedToInvoiceId' => $row['converted_to_invoice_id'] ?? null,
    ];
}

if ($method === 'GET') {
    $stmt = $pdo->prepare('SELECT * FROM offers WHERE user_id = ? ORDER BY date DESC, created_at DESC');
    $stmt->execute([$userId]);
    echo json_encode(array_map('row_to_offer', $stmt->fetchAll()));

} elseif ($method === 'POST') {
    $d  = json_decode(file_get_contents('php://input'), true) ?? [];
    $id = $d['id'] ?? bin2hex(random_bytes(16));

    if (empty(trim($d['contactName'] ?? ''))) {
        http_response_code(400);
        echo json_encode(['error' => 'Empfängername ist erforderlich']);
        exit;
    }

    $stmt = $pdo->prepare('
        INSERT INTO offers
            (id, user_id, number, date, valid_until, status,
             contact_id, contact_name, contact_company, contact_street,
             contact_zip, contact_city, contact_country, contact_email,
             items_json, currency, notes, converted_to_invoice_id)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ');
    $stmt->execute([
        $id, $userId,
        $d['number']         ?? '',
        $d['date']           ?? date('Y-m-d'),
        $d['validUntil']     ?? date('Y-m-d', strtotime('+30 days')),
        $d['status']         ?? 'Entwurf',
        $d['contactId']      ?? null,
        $d['contactName'],
        $d['contactCompany'] ?? null,
        $d['contactStreet']  ?? null,
        $d['contactZip']     ?? null,
        $d['contactCity']    ?? null,
        $d['contactCountry'] ?? 'CH',
        $d['contactEmail']   ?? null,
        json_encode($d['items'] ?? []),
        $d['currency']       ?? 'CHF',
        $d['notes']          ?? null,
        $d['convertedToInvoiceId'] ?? null,
    ]);
    echo json_encode(['ok' => true, 'id' => $id]);

} elseif ($method === 'PUT') {
    $d = json_decode(file_get_contents('php://input'), true) ?? [];
    $stmt = $pdo->prepare('
        UPDATE offers SET
            number = ?, date = ?, valid_until = ?, status = ?,
            contact_id = ?, contact_name = ?, contact_company = ?,
            contact_street = ?, contact_zip = ?, contact_city = ?,
            contact_country = ?, contact_email = ?,
            items_json = ?, currency = ?, notes = ?,
            converted_to_invoice_id = ?
        WHERE id = ? AND user_id = ?
    ');
    $stmt->execute([
        $d['number']         ?? '',
        $d['date']           ?? date('Y-m-d'),
        $d['validUntil']     ?? date('Y-m-d', strtotime('+30 days')),
        $d['status']         ?? 'Entwurf',
        $d['contactId']      ?? null,
        $d['contactName']    ?? '',
        $d['contactCompany'] ?? null,
        $d['contactStreet']  ?? null,
        $d['contactZip']     ?? null,
        $d['contactCity']    ?? null,
        $d['contactCountry'] ?? 'CH',
        $d['contactEmail']   ?? null,
        json_encode($d['items'] ?? []),
        $d['currency']       ?? 'CHF',
        $d['notes']          ?? null,
        $d['convertedToInvoiceId'] ?? null,
        $d['id'], $userId,
    ]);
    echo json_encode(['ok' => true]);

} elseif ($method === 'DELETE') {
    $d = json_decode(file_get_contents('php://input'), true) ?? [];
    $stmt = $pdo->prepare('DELETE FROM offers WHERE id = ? AND user_id = ?');
    $stmt->execute([$d['id'], $userId]);
    echo json_encode(['ok' => true]);

} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}
