<?php
// ─────────────────────────────────────────────────────────────────────────────
// Bookitty – API Config  (Template)
//
// Copy this file to api/config.php (gitignored) and fill in your credentials.
//
//   Local Docker:  just copy as-is – the default values match docker-compose.yml
//   Production:    replace <<PROD_DB_PASS_HIER>> and the JWT_SECRET
// ─────────────────────────────────────────────────────────────────────────────

// ─── Environment Detection ────────────────────────────────────────────────────
$host    = $_SERVER['HTTP_HOST'] ?? 'localhost';
$isProd  = ($host === 'bookitty.bidebliss.com');
$isLocal = !$isProd;   // everything non-prod = local Docker

// ─── Database ─────────────────────────────────────────────────────────────────
// Local:  DB_HOST = 'db'  (Docker Compose service name, see docker-compose.yml)
// Prod:   DB_HOST = '127.0.0.1'  (PHP + DB run on the same server)
define('DB_HOST', $isLocal ? 'db'          : '127.0.0.1');
define('DB_PORT', 3306);
define('DB_NAME', $isProd  ? 'bookitty'    : 'bookitty_local');
define('DB_USER', $isProd  ? 'bookitty'    : 'bookitty');
define('DB_PASS', $isProd  ? '<<PROD_DB_PASS_HIER>>' : 'local_secret');
define('DB_USER', $isProd  ? 'bookitty'    : 'bookitty');
define('DB_PASS', $isProd  ? '<<PROD_DB_PASS_HIER>>' : 'local_secret');

// ─── JWT ──────────────────────────────────────────────────────────────────────
// IMPORTANT: Replace with a strong random 64-char string before going live!
define('JWT_SECRET', 'bkty_CHANGE_ME_to_a_long_random_string_64chars_XXXXXXXXXXXXXXXXXXXX');
define('JWT_EXPIRY', 60 * 60 * 24 * 30);

// ─── App ──────────────────────────────────────────────────────────────────────
define('APP_URL',       $isProd ? 'https://bookitty.bidebliss.com' : 'http://localhost:8080');
define('APP_NAME',      'Bookitty');
define('MAIL_FROM',     'noreply@bidebliss.com');
define('MAIL_FROM_NAME','Bookitty');

// ─── CORS allowed origins ─────────────────────────────────────────────────────
define('CORS_ORIGINS', [
    'http://localhost:5173',
    'http://localhost:4173',
    'https://bookitty.bidebliss.com',
]);

// ─── Gemini (Kitty Chatbot) ───────────────────────────────────────────────────
// Get a free key at: https://aistudio.google.com/app/apikey
define('GEMINI_API_KEY', '<<GEMINI_API_KEY_HIER>>');

// ─── File uploads ─────────────────────────────────────────────────────────────
define('UPLOAD_DIR',  __DIR__ . '/uploads/');
define('UPLOAD_URL',  APP_URL . '/api/uploads/');
define('ALLOWED_MIME_TYPES', [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/tiff',
]);
