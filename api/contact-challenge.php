<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/contact-security.php';

set_cors_headers();
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}
if (!contact_origin_allowed()) {
    http_response_code(403);
    echo json_encode(['error' => 'Anfragequelle nicht erlaubt.']);
    exit;
}

session_start();
$first = random_int(2, 9);
$second = random_int(2, 9);
$_SESSION['bookitty_contact_captcha'] = [
    'answer' => (string) ($first + $second),
    'issuedAt' => time(),
];
echo json_encode(['question' => "Menschlichkeitsprüfung: $first + $second = ?"]);