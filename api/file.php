<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/auth.php';

set_cors_headers();
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405); echo json_encode(['error' => 'Method Not Allowed']); exit;
}
$userId = effective_uid();
$name = (string) ($_GET['name'] ?? '');
if (!preg_match('/^[a-f0-9]{32}(?:\.[a-z0-9]{1,10})?$/i', $name)) {
    http_response_code(404); exit;
}
$directory = realpath(UPLOAD_DIR . $userId);
$path = $directory ? realpath($directory . DIRECTORY_SEPARATOR . $name) : false;
if (!$path || dirname($path) !== $directory || !is_file($path)) {
    http_response_code(404); exit;
}
$mime = (new finfo(FILEINFO_MIME_TYPE))->file($path);
if (!in_array($mime, ALLOWED_MIME_TYPES, true)) {
    http_response_code(415); exit;
}
header('Content-Type: ' . $mime);
header('Content-Disposition: inline; filename="' . $name . '"');
header('X-Content-Type-Options: nosniff');
header('Content-Length: ' . filesize($path));
readfile($path);