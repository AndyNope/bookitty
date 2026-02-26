<?php
// ─── Environment Detection ────────────────────────────────────────────────────
$host    = $_SERVER['HTTP_HOST'] ?? 'localhost';
$isProd  = ($host === 'bookitty.bidebliss.com');

// ─── Database ─────────────────────────────────────────────────────────────────
// PHP runs ON the server in both cases – DB is always localhost there.
// During development the frontend calls the remote server directly (CORS allowed).
define('DB_HOST', '127.0.0.1');
define('DB_PORT', 3306);
define('DB_NAME', $isProd ? 'bookitty'     : 'dev_bookitty');
define('DB_USER', $isProd ? 'bookitty'     : 'dev_bookitty');
define('DB_PASS', $isProd ? 'ad1a%kGfK18P*izq' : 'xLp71JRpyv?1%llf');

// ─── JWT ──────────────────────────────────────────────────────────────────────
// IMPORTANT: Replace with a strong random 64-char string before going live!
define('JWT_SECRET', 'bkty_CHANGE_ME_to_a_long_random_string_64chars_XXXXXXXXXXXXXXXXXXXX');
define('JWT_EXPIRY', 60 * 60 * 24 * 30); // 30 days

// ─── App ──────────────────────────────────────────────────────────────────────
define('APP_URL',       'https://bookitty.bidebliss.com');
define('APP_NAME',      'Bookitty');
define('MAIL_FROM',     'noreply@bidebliss.com');
define('MAIL_FROM_NAME','Bookitty');

// ─── CORS allowed origins ─────────────────────────────────────────────────────
define('CORS_ORIGINS', [
    'http://localhost:5173',
    'http://localhost:4173',
    'https://bookitty.bidebliss.com',
]);

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
