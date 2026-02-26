<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/auth.php';

set_cors_headers();

$userId = require_auth();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

if (empty($_FILES['file'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Keine Datei übertragen (Feld: file)']);
    exit;
}

$file = $_FILES['file'];
if ($file['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['error' => 'Upload-Fehler (Code ' . $file['error'] . ')']);
    exit;
}

// ─── MIME validation (not just extension) ─────────────────────────────────────
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime  = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if (!in_array($mime, ALLOWED_MIME_TYPES, true)) {
    http_response_code(415);
    echo json_encode(['error' => 'Dateityp nicht erlaubt: ' . $mime]);
    exit;
}

// ─── Size limit: 20 MB ────────────────────────────────────────────────────────
if ($file['size'] > 20 * 1024 * 1024) {
    http_response_code(413);
    echo json_encode(['error' => 'Datei zu gross (max. 20 MB)']);
    exit;
}

// ─── Ensure user directory exists ─────────────────────────────────────────────
$userDir = UPLOAD_DIR . $userId . '/';
if (!is_dir($userDir) && !mkdir($userDir, 0755, true)) {
    http_response_code(500);
    echo json_encode(['error' => 'Upload-Verzeichnis konnte nicht erstellt werden']);
    exit;
}

// ─── Save with a UUID-based name (preserving extension) ───────────────────────
$ext      = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
$safeName = bin2hex(random_bytes(16)) . ($ext ? ".$ext" : '');
$destPath = $userDir . $safeName;

if (!move_uploaded_file($file['tmp_name'], $destPath)) {
    http_response_code(500);
    echo json_encode(['error' => 'Datei konnte nicht gespeichert werden']);
    exit;
}

echo json_encode([
    'ok'  => true,
    'url' => UPLOAD_URL . $userId . '/' . $safeName,
]);
