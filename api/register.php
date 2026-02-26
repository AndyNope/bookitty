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

$data  = json_decode(file_get_contents('php://input'), true) ?? [];
$name  = trim($data['name']     ?? '');
$email = trim($data['email']    ?? '');
$pass  = trim($data['password'] ?? '');

// ─── Validation ───────────────────────────────────────────────────────────────
if (!$name || !$email || !$pass) {
    http_response_code(400);
    echo json_encode(['error' => 'Bitte alle Felder ausfüllen (Name, E-Mail, Passwort)']);
    exit;
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Ungültige E-Mail-Adresse']);
    exit;
}
if (strlen($pass) < 8) {
    http_response_code(400);
    echo json_encode(['error' => 'Passwort muss mindestens 8 Zeichen haben']);
    exit;
}

$pdo = get_db();

// ─── Check duplicate ──────────────────────────────────────────────────────────
$stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
$stmt->execute([$email]);
if ($stmt->fetch()) {
    http_response_code(409);
    echo json_encode(['error' => 'Diese E-Mail-Adresse ist bereits registriert']);
    exit;
}

// ─── Create user ──────────────────────────────────────────────────────────────
$hash  = password_hash($pass, PASSWORD_BCRYPT, ['cost' => 12]);
$token = bin2hex(random_bytes(32)); // 64-char hex token

$stmt = $pdo->prepare(
    'INSERT INTO users (email, name, password_hash, confirmation_token, email_confirmed)
     VALUES (?, ?, ?, ?, 0)'
);
$stmt->execute([$email, $name, $hash, $token]);

send_confirmation_email($email, $name, $token);

echo json_encode([
    'ok'      => true,
    'message' => 'Registrierung erfolgreich. Bitte prüfe dein Postfach und bestätige deine E-Mail-Adresse.',
]);
