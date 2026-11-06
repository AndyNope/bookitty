<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/mailer.php';

set_cors_headers();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['error' => 'Ungültige Anfrage.']);
    exit;
}

if (!empty($data['website'])) {
    echo json_encode(['ok' => true]);
    exit;
}

$email = strtolower(trim((string) ($data['email'] ?? '')));
$marketingOptIn = ($data['marketing_opt_in'] ?? false) === true;
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Bitte gib eine gültige E-Mail-Adresse ein.']);
    exit;
}

session_start();
$now = time();
if (isset($_SESSION['startup_night_reward_sent_at']) && $now - (int) $_SESSION['startup_night_reward_sent_at'] < 30) {
    http_response_code(429);
    echo json_encode(['error' => 'Bitte warte kurz, bevor du den Code erneut anforderst.']);
    exit;
}

if ($marketingOptIn) {
    $pdo = get_db();
    $stmt = $pdo->prepare(
        'INSERT INTO startup_night_marketing_consents (email, consent_version, source)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE consented_at = CURRENT_TIMESTAMP, consent_version = VALUES(consent_version), source = VALUES(source)'
    );
    $stmt->execute([$email, '2026-11-v1', 'startup-night-2026']);
}

if (!send_startup_reward_email($email)) {
    http_response_code(503);
    echo json_encode(['error' => 'Der Versand ist gerade nicht möglich. Bitte versuche es später erneut.']);
    exit;
}

$_SESSION['startup_night_reward_sent_at'] = $now;
echo json_encode(['ok' => true, 'marketing_opt_in_saved' => $marketingOptIn]);