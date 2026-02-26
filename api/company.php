<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

set_cors_headers();

$userId = require_auth();
$pdo    = get_db();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->prepare('SELECT * FROM company_profiles WHERE user_id = ?');
    $stmt->execute([$userId]);
    $row = $stmt->fetch();

    echo json_encode($row ? [
        'name'   => $row['name'],
        'street' => $row['street'],
        'city'   => $row['city'],
        'vatId'  => $row['vat_id'],
        'email'  => $row['email'],
        'phone'  => $row['phone'],
        'iban'   => $row['iban'],
    ] : (object)[]);

} elseif ($method === 'PUT') {
    $d = json_decode(file_get_contents('php://input'), true) ?? [];

    $pdo->prepare(
        'INSERT INTO company_profiles (user_id, name, street, city, vat_id, email, phone, iban)
         VALUES (?,?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE
             name=VALUES(name), street=VALUES(street), city=VALUES(city),
             vat_id=VALUES(vat_id), email=VALUES(email),
             phone=VALUES(phone), iban=VALUES(iban)'
    )->execute([
        $userId,
        $d['name']   ?? '',
        $d['street'] ?? '',
        $d['city']   ?? '',
        $d['vatId']  ?? '',
        $d['email']  ?? '',
        $d['phone']  ?? '',
        $d['iban']   ?? '',
    ]);
    echo json_encode(['ok' => true]);

} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
}
