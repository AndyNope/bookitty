<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/mailer.php';

set_cors_headers();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$isLocalOrigin = preg_match('#^https?://(?:localhost|127\.0\.0\.1)(?::\d+)?$#D', $origin) === 1;
if ($origin !== '' && !in_array($origin, CORS_ORIGINS, true) && !$isLocalOrigin) {
    http_response_code(403);
    echo json_encode(['error' => 'Anfragequelle nicht erlaubt.']);
    exit;
}

if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 10000) {
    http_response_code(413);
    echo json_encode(['error' => 'Die Nachricht ist zu gross.']);
    exit;
}
$raw = file_get_contents('php://input');
if (!is_string($raw) || strlen($raw) > 10000) {
    http_response_code(413);
    echo json_encode(['error' => 'Die Nachricht ist zu gross.']);
    exit;
}
$data = json_decode($raw, true);
if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['error' => 'Ungültige Anfrage.']);
    exit;
}
if (!empty($data['website'])) {
    echo json_encode(['ok' => true]);
    exit;
}

$kind = $data['kind'] ?? '';
$name = trim((string) ($data['name'] ?? ''));
$email = trim((string) ($data['email'] ?? ''));
$message = trim(str_replace("\r\n", "\n", (string) ($data['message'] ?? '')));
$name = preg_replace('/[\x00-\x1F\x7F]/u', ' ', $name) ?? '';
$email = str_replace(["\r", "\n", "\0"], '', $email);
$message = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $message) ?? '';

if (!in_array($kind, ['support', 'idea'], true) || $name === '' || strlen($name) > 120 || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 254 || $message === '' || strlen($message) > 6000) {
    http_response_code(400);
    echo json_encode(['error' => 'Bitte prüfe Name, E-Mail und Nachricht.']);
    exit;
}

session_start();
$now = time();
if (isset($_SESSION['bookitty_contact_sent_at']) && $now - (int) $_SESSION['bookitty_contact_sent_at'] < 30) {
    http_response_code(429);
    echo json_encode(['error' => 'Bitte warte kurz, bevor du eine weitere Nachricht sendest.']);
    exit;
}

if (!send_contact_form_email($kind, $name, $email, $message)) {
    http_response_code(503);
    echo json_encode(['error' => 'Der Versand ist gerade nicht möglich. Bitte versuche es später erneut.']);
    exit;
}

$_SESSION['bookitty_contact_sent_at'] = $now;
echo json_encode(['ok' => true, 'message' => 'Nachricht wurde übermittelt.']);